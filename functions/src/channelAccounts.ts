import { getFirestore } from "firebase-admin/firestore";

/**
 * Uma "Conta de Canal" guarda as credenciais de um canal de mensageria
 * (WhatsApp Cloud API, Facebook Messenger ou Instagram Direct) para uma
 * empresa específica do sistema (multi-empresa).
 *
 * Coleção: channelAccounts
 * Documento: um por (companyId + channelType)
 */
export interface ChannelAccount {
  companyId: string;
  channelType: "whatsapp" | "facebook" | "instagram";
  accountName?: string;
  isActive: boolean;
  status: "connected" | "disconnected" | "error";

  // WhatsApp Cloud API
  whatsappPhoneNumberId?: string;
  whatsappBusinessAccountId?: string;
  whatsappAccessToken?: string; // token permanente do System User

  // Facebook Messenger / Instagram (ambos usam a Page + Graph API)
  facebookPageId?: string;
  facebookPageAccessToken?: string;
  instagramBusinessAccountId?: string;

  // Comum aos dois: token usado para validar o webhook (Verify Token)
  webhookVerifyToken?: string;

  updatedAt?: FirebaseFirestore.Timestamp;
}

/**
 * Busca a ChannelAccount de um determinado tipo de canal, procurando em
 * TODAS as empresas cadastradas (o webhook da Meta não informa a empresa,
 * então usamos o Verify Token / IDs recebidos no payload pra descobrir
 * a qual empresa a mensagem pertence).
 */
export async function findChannelAccountByPhoneNumberId(
  phoneNumberId: string
): Promise<(ChannelAccount & { id: string }) | null> {
  const db = getFirestore();
  const snap = await db
    .collection("channelAccounts")
    .where("channelType", "==", "whatsapp")
    .where("whatsappPhoneNumberId", "==", phoneNumberId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as ChannelAccount) };
}

export async function findChannelAccountByPageId(
  pageId: string
): Promise<(ChannelAccount & { id: string }) | null> {
  const db = getFirestore();
  const snap = await db
    .collection("channelAccounts")
    .where("facebookPageId", "==", pageId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as ChannelAccount) };
}

export async function getChannelAccount(
  companyId: string,
  channelType: ChannelAccount["channelType"]
): Promise<(ChannelAccount & { id: string }) | null> {
  const db = getFirestore();
  const snap = await db
    .collection("channelAccounts")
    .where("companyId", "==", companyId)
    .where("channelType", "==", channelType)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as ChannelAccount) };
}

/**
 * O Verify Token é o mesmo para todas as contas (definido nas variáveis de
 * ambiente da função), pois a Meta só permite configurar 1 webhook por App
 * — a validação de qual empresa recebeu a mensagem acontece depois, pelos
 * IDs (phone_number_id / page_id) que vêm dentro do payload.
 */
export function getGlobalVerifyToken(): string {
  return process.env.META_WEBHOOK_VERIFY_TOKEN || "";
}
