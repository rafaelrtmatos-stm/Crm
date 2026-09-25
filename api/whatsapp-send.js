// Recebe telefone + texto do front-end (ChatPanel) e manda a Evolution API disparar a
// mensagem de verdade pro WhatsApp do cliente. O front nunca fala direto com a Evolution
// API (evita expor a API Key no navegador) — sempre passa por aqui.
//
// POST /api/whatsapp-send
// body: { phone: "5593999999999", text: "Mensagem...", senderName?, leadId? }
// Foto/documento (o navegador sobe o arquivo direto pro Storage -- bucket whatsapp-media -- e manda so a URL
// pra ca; o arquivo NUNCA passa por esta funcao, porque a Vercel limita o corpo da requisicao a ~4,5 MB):
//   body: { phone, mediaUrl, mediaType: "image" | "document", fileName?, mimeType?, text? (legenda), senderName?, leadId? }
// Resposta: { ok, whatsappMessageId, createdAt, saved } -- `saved` = a mensagem ja foi registrada em
// crm_messages AQUI, depois da confirmacao da Evolution (o front nao precisa gravar de novo).

import { EVOLUTION_API_URL, EVOLUTION_API_KEY, INSTANCE_NAME, SUPABASE_URL, SUPABASE_ANON_KEY, COMPANY_ID, SEM_CRM_MESSAGES } from './_lib/whatsapp-config.js';
import { exigirUsuarioAutorizado } from './_lib/auth.js';
import { normalizarTelefoneBR } from './_lib/phone.js';
import { timestampParaIso } from './_lib/timestamp.js';
import { sinalizarMensagemNova } from './_lib/realtime-signal.js';
import { waitUntil } from '@vercel/functions';

// Depois que o WhatsApp CONFIRMA o envio: a conversa passa a ter essa mensagem como ultima
// (leads.last_message_at/direction/text), sobe pro topo da aba Mensagens e sai do estado de
// "aguardando resposta". NAO cria notificacao (notificacao e so de mensagem do cliente).
// Se o envio falhar, esta funcao nem e chamada -- last_message_at nao muda. Falha aqui nunca
// derruba a resposta: a mensagem ja foi enviada de verdade.
//  - `quando` = horario REAL da mensagem (messageTimestamp devolvido pela Evolution API; se nao vier,
//    o instante da confirmacao do envio) -- nunca o de processamento posterior.
//  - So avanca: se o lead ja tem uma ultima mensagem mais nova, nao volta no tempo.
async function atualizarLeadMensagemEnviada(telefones, text, quando) {
  const filtroMaisNova = encodeURIComponent(`(last_message_at.is.null,last_message_at.lt.${quando})`);
  await Promise.all(telefones.map(async (tel) => {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/leads?company_id=eq.${COMPANY_ID}&phone=eq.${encodeURIComponent(tel)}&or=${filtroMaisNova}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          last_message_at: quando,
          last_message_direction: 'outgoing',
          last_message_text: text,
          waiting_since: null,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!r.ok) {
        const corpo = await r.text().catch(() => '');
        console.error('Falha ao atualizar a ultima mensagem do lead apos o envio (rodou add_last_message_at_to_leads.sql?):', r.status, corpo);
      }
    } catch (err) {
      console.error('Falha ao atualizar a ultima mensagem do lead apos o envio (nao impede o resto):', err);
    }
  }));
}

// Registra a mensagem enviada em crm_messages SO depois que a Evolution confirmou (envio falhou = nada e
// gravado e a conversa nao muda). Usa o horario real da mensagem e o id do WhatsApp; o "eco" que a
// Evolution manda no webhook (fromMe) e ignorado como duplicata pelo indice unico. Se o eco chegou ANTES
// deste insert (webhook grava como "Celular"), corrige remetente/lead na linha que ja existe.
// Devolve true quando a mensagem esta registrada em crm_messages.
async function registrarMensagemEnviada({ phone, text, senderName, leadId, whatsappMessageId, createdAt, media, quotedMessageId, quotedText, quotedSender, quotedMediaUrl, quotedMediaType }) {
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };
  try {
    const quoteVersions = (quotedMessageId || quotedText || quotedMediaUrl) ? [{
      quotedMessageId: quotedMessageId || null,
      quotedText: quotedText || null,
      quotedSender: quotedSender || null,
      quotedMediaUrl: quotedMediaUrl || null,
      quotedMediaType: quotedMediaType || null,
    }] : null;

    const postMsg = (comColunasDedicadas = true) => fetch(`${SUPABASE_URL}/rest/v1/crm_messages`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({
        company_id: COMPANY_ID,
        lead_id: leadId || null,
        phone,
        text,
        direction: 'outgoing',
        sender_name: senderName || null,
        channel: 'WhatsApp',
        whatsapp_message_id: whatsappMessageId || null,
        created_at: createdAt,
        ...(quoteVersions ? { versions: quoteVersions } : {}),
        ...(comColunasDedicadas && (quotedMessageId || quotedText) ? {
          quoted_message_id: quotedMessageId || null,
          quoted_text: quotedText || null,
          quoted_sender: quotedSender || null,
        } : {}),
        ...(media ? { content_type: media.tipo, media_url: media.url, file_name: media.fileName || null, media_mime_type: media.mimeType || null } : {}),
      }),
    });

    let r = await postMsg(true);
    if (!r.ok && (quotedMessageId || quotedText)) {
      r = await postMsg(false);
    }
    if (!r.ok) {
      console.error('Falha ao registrar mensagem enviada em crm_messages:', r.status, await r.text().catch(() => ''));
      return false;
    }
    if (whatsappMessageId && (senderName || leadId)) {
      // Correcao de remetente/lead: nao precisa segurar a resposta ao atendente (waitUntil mantem a
      // funcao viva ate terminar, sem atrasar o "enviado").
      waitUntil(fetch(`${SUPABASE_URL}/rest/v1/crm_messages?company_id=eq.${COMPANY_ID}&whatsapp_message_id=eq.${encodeURIComponent(whatsappMessageId)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ ...(senderName ? { sender_name: senderName } : {}), ...(leadId ? { lead_id: leadId } : {}) }),
      }).catch(() => {}));
    }
    return true;
  } catch (err) {
    console.error('Falha ao registrar mensagem enviada em crm_messages:', err);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    res.status(500).json({ error: 'Evolution API não configurada — falta EVOLUTION_API_URL/EVOLUTION_API_KEY nas variáveis de ambiente da Vercel.' });
    return;
  }

  // So um usuario logado do CRM pode disparar mensagem usando a conta conectada —
  // sem essa checagem, qualquer pessoa que descobrisse essa URL conseguia mandar
  // mensagem em nome do numero conectado.
  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const { phone, text, senderName, leadId, mediaUrl, mediaType, fileName, mimeType, quotedMessageId, quotedText, quotedSender, quotedMediaUrl, quotedMediaType } = req.body || {};
  const ehMidia = !!mediaUrl;
  if (!phone || (!ehMidia && !text)) {
    res.status(400).json({ error: 'Faltou telefone ou texto da mensagem.' });
    return;
  }
  if (ehMidia) {
    // Aceita arquivos do bucket whatsapp-media (enviados/ ou stickers/), storage do Supabase, URLs absolutas ou sticker válido
    const prefixoPermitido = `${SUPABASE_URL}/storage/v1/object/public/`;
    const ehStickerUrlValida = mediaType === 'sticker' && typeof mediaUrl === 'string' && (mediaUrl.startsWith(prefixoPermitido) || mediaUrl.startsWith('http') || mediaUrl.startsWith('data:image'));
    const ehMidiaPermitida = typeof mediaUrl === 'string' && (
      mediaUrl.startsWith(prefixoPermitido) ||
      mediaUrl.startsWith('http://') ||
      mediaUrl.startsWith('https://') ||
      mediaUrl.startsWith('data:image') ||
      mediaUrl.startsWith('/api/whatsapp-media')
    );
    if (!ehStickerUrlValida && !ehMidiaPermitida) {
      res.status(400).json({ error: 'Arquivo inválido: só é possível enviar arquivos enviados pelo próprio CRM.' });
      return;
    }
    if (mediaType !== 'image' && mediaType !== 'document' && mediaType !== 'sticker') {
      res.status(400).json({ error: 'Tipo de arquivo não suportado: só foto (image), documento (document) ou figurinha (sticker).' });
      return;
    }
  }

  // So numeros, sem formatacao (espaco, parenteses, traco) — a Evolution API exige o
  // numero "cru", com codigo do pais na frente (ex: 55 93 99999-9999 -> 5593999999999).
  // Normaliza igual o webhook ja faz pro numero recebido: adiciona o "55" e o nono
  // digito quando estiverem faltando -- sem isso a Evolution recusa o envio dizendo
  // que o numero "nao existe" quando na verdade so falta o codigo do pais.
  const numero = normalizarTelefoneBR(phone.replace(/\D/g, ''));

  try {
    // Texto: sendText. Figurinha: sendSticker. Foto/documento: sendMedia (Evolution v2)
    const nomeArquivo = (typeof fileName === 'string' && fileName.trim()) ? fileName.trim().slice(0, 200) : undefined;
    const isQuotingImage = quotedMediaType === 'image' || !!quotedMediaUrl;
    const quotedPayload = quotedMessageId ? {
      key: {
        id: quotedMessageId,
        remoteJid: `${numero}@s.whatsapp.net`,
        fromMe: quotedSender === 'Você',
      },
      message: isQuotingImage ? {
        imageMessage: {
          caption: quotedText || '📷 Foto',
          mimetype: 'image/jpeg',
          ...(typeof quotedMediaUrl === 'string' && quotedMediaUrl.startsWith('http') ? { url: quotedMediaUrl } : {}),
        },
      } : {
        conversation: quotedText || text || '',
      },
    } : undefined;

    let r;
    if (mediaType === 'sticker') {
      r = await fetch(`${EVOLUTION_API_URL}/message/sendSticker/${INSTANCE_NAME}`, {
        method: 'POST',
        headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: numero,
          sticker: mediaUrl,
        }),
      });
    } else if (ehMidia) {
      r = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${INSTANCE_NAME}`, {
        method: 'POST',
        headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: numero,
          mediatype: mediaType,
          mimetype: (typeof mimeType === 'string' && mimeType) ? mimeType : (mediaType === 'image' ? 'image/jpeg' : 'application/octet-stream'),
          caption: text || '',
          media: mediaUrl,
          fileName: nomeArquivo || (mediaType === 'image' ? 'foto.jpg' : 'documento'),
          ...(quotedPayload ? { quoted: quotedPayload } : {}),
        }),
      });
    } else {
      r = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
        method: 'POST',
        headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: numero,
          text,
          ...(quotedPayload ? { quoted: quotedPayload } : {}),
        }),
      });
    }

    if (!r.ok) {
      const errBody = await r.text();
      console.error('Evolution API recusou o envio:', errBody);
      res.status(502).json({ error: 'A Evolution API recusou o envio dessa mensagem.' });
      return;
    }

    // Pega o id da mensagem que a propria Evolution API devolveu no envio -- o front-end
    // salva esse id junto com a mensagem no crm_messages. Isso e o que permite ao webhook
    // (que recebe o "eco" de toda mensagem enviada, inclusive essa) reconhecer que essa
    // mensagem especifica ja foi gravada por aqui e nao duplicar quando o evento
    // messages.upsert com fromMe:true chegar (ver whatsapp-webhook.js).
    let idMensagem = null;
    let horarioMensagem;
    try {
      const corpo = await r.json();
      idMensagem = corpo?.key?.id || corpo?.message?.key?.id || null;
      horarioMensagem = timestampParaIso(corpo?.messageTimestamp ?? corpo?.message?.messageTimestamp);
    } catch (err) {
      // Corpo nao veio em JSON valido -- segue sem o id (webhook so nao vai conseguir
      // deduplicar essa mensagem em particular, sem prejuizo pro envio em si)
    }

    // Envio confirmado pela Evolution API. O lead pode estar salvo com o telefone como o front
    // mandou (`phone`) ou normalizado (`numero`) -- atualiza os dois, sem repetir se forem iguais.
    // Com await: no serverless, o que ficar pendente depois da resposta pode ser cortado.
    const quandoEnviada = horarioMensagem || new Date().toISOString();
    // Sem legenda, a mensagem de midia mostra um rotulo no lugar do texto (mesma ideia do "🎵 Áudio").
    const textoDaMensagem = text || (ehMidia ? (mediaType === 'image' ? '📷 Foto' : mediaType === 'sticker' ? '🌟 Figurinha' : (nomeArquivo || 'Documento')) : text);
    const midia = ehMidia ? { tipo: mediaType, url: mediaUrl, fileName: nomeArquivo, mimeType } : null;
    // Os dois gravam em tabelas diferentes e nao dependem um do outro: rodam juntos (antes, em fila).
    const [salva] = await Promise.all([
      SEM_CRM_MESSAGES ? Promise.resolve(true) : registrarMensagemEnviada({
        phone, text: textoDaMensagem, senderName, leadId, whatsappMessageId: idMensagem, createdAt: quandoEnviada, media: midia,
        quotedMessageId, quotedText, quotedSender, quotedMediaUrl, quotedMediaType,
      }),
      atualizarLeadMensagemEnviada(Array.from(new Set([phone, numero])), textoDaMensagem, quandoEnviada),
    ]);

    res.status(200).json({ ok: true, whatsappMessageId: idMensagem, createdAt: quandoEnviada, saved: salva });
    // FASE 3 passo 3: avisa quem estiver com essa conversa aberta pra rebuscar na Evolution API
    // (sinal leve, sem conteudo) -- so depois da resposta, nunca atrasa o envio em si.
    if (salva) waitUntil(sinalizarMensagemNova(phone));
  } catch (err) {
    console.error('Erro ao enviar mensagem via Evolution API:', err);
    res.status(500).json({ error: 'Não foi possível enviar a mensagem. Confira se a Evolution API está no ar e o número está conectado.' });
  }
}
