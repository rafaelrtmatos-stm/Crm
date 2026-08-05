import { initializeApp } from "firebase-admin/app";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

import { findChannelAccountByPhoneNumberId, findChannelAccountByPageId, getChannelAccount, getGlobalVerifyToken } from "./channelAccounts";
import { saveIncomingMessage } from "./saveMessage";
import { sendWhatsAppText, sendMessengerText } from "./sendMessage";

initializeApp();

/**
 * ══════════════════════════════════════════════════════════════════════
 *  WEBHOOK - recebe mensagens do WhatsApp, Instagram e Facebook Messenger
 * ══════════════════════════════════════════════════════════════════════
 * UMA ÚNICA URL cobre os 3 canais, porque a Meta unificou a plataforma de
 * webhooks (WhatsApp Business Account e Messenger/Instagram usam o mesmo
 * formato de "Webhooks" no App da Meta, só em abas de assinatura diferentes).
 *
 * Configure esta MESMA URL nos 3 lugares dentro do seu App da Meta:
 *   Painel do App → WhatsApp → Configuration → Webhook
 *   Painel do App → Messenger → Settings → Webhooks
 *   Painel do App → Instagram → Configuration → Webhook (herda do Messenger)
 *
 * URL após o deploy (substitua SEU-PROJETO):
 *   https://us-central1-SEU-PROJETO.cloudfunctions.net/metaWebhook
 */
export const metaWebhook = onRequest(
  { region: "us-central1", cors: false },
  async (req, res) => {
    // ---- 1) Handshake de verificação (GET) ----
    // A Meta chama isso UMA vez, quando você cola a URL + Verify Token no
    // painel dela, só pra confirmar que o dono da URL é você.
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe" && token === getGlobalVerifyToken()) {
        logger.info("Webhook verificado com sucesso pela Meta.");
        res.status(200).send(challenge);
        return;
      }
      logger.warn("Falha na verificacao do webhook (token nao confere).");
      res.sendStatus(403);
      return;
    }

    // ---- 2) Evento recebido de verdade (POST) ----
    if (req.method === "POST") {
      try {
        const body = req.body;

        if (body.object === "whatsapp_business_account") {
          await handleWhatsAppEvent(body);
        } else if (body.object === "page" || body.object === "instagram") {
          await handleMessengerOrInstagramEvent(body);
        } else {
          logger.info("Evento recebido de tipo desconhecido:", body.object);
        }

        // A Meta exige resposta 200 rápida, senão ela re-envia o evento
        // (e tenta de novo por até ~24h, o que gera mensagens duplicadas).
        res.sendStatus(200);
      } catch (err) {
        logger.error("Erro processando webhook:", err);
        // Mesmo com erro, respondemos 200 pra Meta nao ficar reenviando
        // o mesmo evento indefinidamente — o erro fica só no log.
        res.sendStatus(200);
      }
      return;
    }

    res.sendStatus(405);
  }
);

async function handleWhatsAppEvent(body: any) {
  const entries = body.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const account = await findChannelAccountByPhoneNumberId(phoneNumberId);
      if (!account) {
        logger.warn("Nenhuma ChannelAccount cadastrada para phone_number_id:", phoneNumberId);
        continue;
      }

      for (const msg of value.messages || []) {
        if (msg.type !== "text") continue; // outros tipos (imagem, audio...) podem ser tratados depois
        const fromPhone = msg.from; // ja vem so numeros, formato internacional
        const contactName = value.contacts?.[0]?.profile?.name;

        await saveIncomingMessage({
          companyId: account.companyId,
          phone: fromPhone,
          text: msg.text?.body || "",
          senderName: contactName,
          channel: "WhatsApp",
        });
      }
    }
  }
}

async function handleMessengerOrInstagramEvent(body: any) {
  const entries = body.entry || [];
  for (const entry of entries) {
    const pageId = entry.id;
    const account = await findChannelAccountByPageId(pageId);
    if (!account) {
      logger.warn("Nenhuma ChannelAccount cadastrada para page/IG id:", pageId);
      continue;
    }

    for (const messaging of entry.messaging || []) {
      const senderId = messaging.sender?.id;
      const text = messaging.message?.text;
      if (!senderId || !text) continue;
      // Mensagens que o PRÓPRIO sistema enviou também passam pelo webhook
      // (echo) — ignoramos pra não duplicar.
      if (messaging.message?.is_echo) continue;

      const isInstagram = body.object === "instagram";

      await saveIncomingMessage({
        companyId: account.companyId,
        phone: senderId, // PSID/IGSID (não é telefone de verdade nesses 2 canais)
        text,
        channel: isInstagram ? "Instagram" : "Facebook",
      });
    }
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════
 *  ENVIO - chamada pelo front-end (CRM) quando o atendente responde
 * ══════════════════════════════════════════════════════════════════════
 * O front-end continua gravando a mensagem em `messages` normalmente (pra
 * aparecer na tela na hora); esta função só cuida de EFETIVAMENTE mandar
 * pra Meta. Chame ela ANTES ou logo depois do addDoc no Firestore.
 */
export const sendChannelMessage = onCall(
  { region: "us-central1" },
  async (request) => {
    const { companyId, channel, to, text } = request.data as {
      companyId: string;
      channel: "whatsapp" | "facebook" | "instagram";
      to: string; // telefone (whatsapp) ou PSID/IGSID (messenger/instagram)
      text: string;
    };

    if (!companyId || !channel || !to || !text) {
      throw new HttpsError("invalid-argument", "Parametros obrigatorios: companyId, channel, to, text.");
    }

    const account = await getChannelAccount(companyId, channel);
    if (!account || !account.isActive) {
      throw new HttpsError("failed-precondition", `Canal ${channel} nao esta configurado/ativo para esta empresa.`);
    }

    if (channel === "whatsapp") {
      if (!account.whatsappPhoneNumberId || !account.whatsappAccessToken) {
        throw new HttpsError("failed-precondition", "Credenciais do WhatsApp incompletas.");
      }
      const result = await sendWhatsAppText({
        phoneNumberId: account.whatsappPhoneNumberId,
        accessToken: account.whatsappAccessToken,
        toPhoneE164: to,
        text,
      });
      if (!result.ok) throw new HttpsError("internal", result.error || "Falha ao enviar WhatsApp.");
      return { ok: true };
    }

    // facebook e instagram usam o mesmo Send API (Page Access Token)
    if (!account.facebookPageAccessToken) {
      throw new HttpsError("failed-precondition", "Credenciais do Facebook/Instagram incompletas.");
    }
    const result = await sendMessengerText({
      pageAccessToken: account.facebookPageAccessToken,
      recipientId: to,
      text,
    });
    if (!result.ok) throw new HttpsError("internal", result.error || "Falha ao enviar mensagem.");
    return { ok: true };
  }
);

/**
 * ══════════════════════════════════════════════════════════════════════
 *  CONFIGURAÇÃO - salvar e consultar credenciais dos canais
 * ══════════════════════════════════════════════════════════════════════
 * O front-end (tela de Integrações) chama estas funções em vez de escrever
 * direto no Firestore, porque a coleção channelAccounts guarda tokens de
 * acesso e fica bloqueada para leitura/escrita direta do navegador
 * (veja firestore.rules).
 */
export const saveChannelAccount = onCall(
  { region: "us-central1" },
  async (request) => {
    const data = request.data as {
      companyId: string;
      channelType: "whatsapp" | "facebook" | "instagram";
      accountName?: string;
      whatsappPhoneNumberId?: string;
      whatsappBusinessAccountId?: string;
      whatsappAccessToken?: string;
      facebookPageId?: string;
      facebookPageAccessToken?: string;
      instagramBusinessAccountId?: string;
      isActive?: boolean;
    };

    if (!data.companyId || !data.channelType) {
      throw new HttpsError("invalid-argument", "companyId e channelType sao obrigatorios.");
    }

    const { getFirestore, Timestamp } = await import("firebase-admin/firestore");
    const db = getFirestore();

    const existing = await getChannelAccount(data.companyId, data.channelType);
    const docRef = existing
      ? db.collection("channelAccounts").doc(existing.id)
      : db.collection("channelAccounts").doc();

    // So sobrescreve um token se um novo valor foi enviado — assim a tela
    // pode salvar outros campos sem apagar um token ja configurado antes.
    const payload: Record<string, unknown> = {
      companyId: data.companyId,
      channelType: data.channelType,
      accountName: data.accountName ?? existing?.accountName ?? "",
      isActive: data.isActive ?? existing?.isActive ?? true,
      status: "connected",
      updatedAt: Timestamp.now(),
    };
    if (data.whatsappPhoneNumberId !== undefined) payload.whatsappPhoneNumberId = data.whatsappPhoneNumberId;
    if (data.whatsappBusinessAccountId !== undefined) payload.whatsappBusinessAccountId = data.whatsappBusinessAccountId;
    if (data.whatsappAccessToken) payload.whatsappAccessToken = data.whatsappAccessToken;
    if (data.facebookPageId !== undefined) payload.facebookPageId = data.facebookPageId;
    if (data.facebookPageAccessToken) payload.facebookPageAccessToken = data.facebookPageAccessToken;
    if (data.instagramBusinessAccountId !== undefined) payload.instagramBusinessAccountId = data.instagramBusinessAccountId;

    await docRef.set(payload, { merge: true });
    return { ok: true };
  }
);

export const getChannelAccountsStatus = onCall(
  { region: "us-central1" },
  async (request) => {
    const { companyId } = request.data as { companyId: string };
    if (!companyId) throw new HttpsError("invalid-argument", "companyId e obrigatorio.");

    const channels: Array<"whatsapp" | "facebook" | "instagram"> = ["whatsapp", "facebook", "instagram"];
    const results: Record<string, any> = {};

    for (const ch of channels) {
      const acc = await getChannelAccount(companyId, ch);
      results[ch] = acc
        ? {
            connected: true,
            isActive: acc.isActive,
            status: acc.status,
            accountName: acc.accountName || "",
            // Mascarado — nunca devolve o token de verdade pro navegador
            hasToken: !!(acc.whatsappAccessToken || acc.facebookPageAccessToken),
          }
        : { connected: false };
    }
    return results;
  }
);
