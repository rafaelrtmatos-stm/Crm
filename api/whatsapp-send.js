// Recebe telefone + texto do front-end (ChatPanel) e manda a Evolution API disparar a
// mensagem de verdade pro WhatsApp do cliente. O front nunca fala direto com a Evolution
// API (evita expor a API Key no navegador) — sempre passa por aqui.
//
// POST /api/whatsapp-send
// body (texto):   { phone: "5593999999999", text: "Mensagem...", senderName?, leadId? }
// body (arquivo): { phone, senderName?, leadId?, media: { url, type: 'image'|'video'|'document'|'audio', mimeType?, fileName?, caption?, seconds? } }
//   `media.url` e o link publico do arquivo que o front JA subiu no bucket whatsapp-media do Supabase Storage (o
//   navegador sobe direto, sem passar pelo limite de tamanho da Vercel); aqui so mandamos a Evolution buscar e enviar.
// Resposta: { ok, whatsappMessageId, createdAt, saved } -- `saved` = a mensagem ja foi registrada em
// crm_messages AQUI, depois da confirmacao da Evolution (o front nao precisa gravar de novo).

import { EVOLUTION_API_URL, EVOLUTION_API_KEY, INSTANCE_NAME, SUPABASE_URL, SUPABASE_ANON_KEY, COMPANY_ID } from './_lib/whatsapp-config.js';
import { exigirUsuarioAutorizado } from './_lib/auth.js';
import { normalizarTelefoneBR } from './_lib/phone.js';
import { timestampParaIso } from './_lib/timestamp.js';

// Enviar arquivo pela Evolution pode demorar (ela baixa o arquivo e sobe pro WhatsApp).
export const config = { maxDuration: 60 };

const TIPOS_MIDIA = ['image', 'video', 'document', 'audio'];
// Mesmos rotulos que o webhook usa quando a midia vem sem legenda (a mensagem nao pode ficar sem texto no chat).
function rotuloDaMidia(tipo, fileName) {
  if (tipo === 'image') return '📷 Imagem';
  if (tipo === 'video') return '🎥 Vídeo';
  if (tipo === 'audio') return '🎤 Áudio';
  return fileName ? `📄 ${fileName}` : '📄 Documento';
}

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
  for (const tel of telefones) {
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
  }
}

// Registra a mensagem enviada em crm_messages SO depois que a Evolution confirmou (envio falhou = nada e
// gravado e a conversa nao muda). Usa o horario real da mensagem e o id do WhatsApp; o "eco" que a
// Evolution manda no webhook (fromMe) e ignorado como duplicata pelo indice unico. Se o eco chegou ANTES
// deste insert (webhook grava como "Celular"), corrige remetente/lead na linha que ja existe.
// Devolve true quando a mensagem esta registrada em crm_messages.
async function registrarMensagemEnviada({ phone, text, senderName, leadId, whatsappMessageId, createdAt, midia }) {
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };
  try {
    // `midia` = { url, fileName, contentType, audio? }. `audio` (mime/duracao) so entra se as colunas existirem:
    // se o banco recusar, grava de novo sem elas -- a mensagem nunca pode se perder por causa de um campo extra.
    const inserir = (comAudio) => fetch(`${SUPABASE_URL}/rest/v1/crm_messages`, {
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
        ...(midia ? { media_url: midia.url, file_name: midia.fileName || null, content_type: midia.contentType } : {}),
        ...(midia && comAudio && midia.audio ? midia.audio : {}),
        created_at: createdAt,
      }),
    });
    let r = await inserir(true);
    if (!r.ok && midia?.audio) r = await inserir(false);
    if (!r.ok) {
      console.error('Falha ao registrar mensagem enviada em crm_messages:', r.status, await r.text().catch(() => ''));
      return false;
    }
    if (whatsappMessageId && (senderName || leadId)) {
      await fetch(`${SUPABASE_URL}/rest/v1/crm_messages?company_id=eq.${COMPANY_ID}&whatsapp_message_id=eq.${encodeURIComponent(whatsappMessageId)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ ...(senderName ? { sender_name: senderName } : {}), ...(leadId ? { lead_id: leadId } : {}) }),
      }).catch(() => {});
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

  const { phone, text, senderName, leadId, media } = req.body || {};
  if (!phone || (!text && !media)) {
    res.status(400).json({ error: 'Faltou telefone ou texto da mensagem.' });
    return;
  }

  // ARQUIVO: so aceita link do NOSSO bucket (a Evolution vai buscar essa URL -- nao pode ser um link qualquer).
  let midia = null;
  if (media) {
    const url = String(media.url || '');
    if (!TIPOS_MIDIA.includes(media.type) || !url.startsWith(`${SUPABASE_URL}/storage/v1/object/public/whatsapp-media/`)) {
      res.status(400).json({ error: 'Arquivo inválido para envio.' });
      return;
    }
    const fileName = String(media.fileName || '').slice(0, 200) || null;
    const legenda = media.type === 'audio' ? '' : String(media.caption || text || '').trim();
    midia = { url, type: media.type, mimeType: media.mimeType ? String(media.mimeType) : undefined, fileName, legenda, seconds: Number(media.seconds) || undefined };
  }
  // O que aparece no chat e na previa da conversa: legenda, ou o rotulo do tipo (igual ao que o webhook faz).
  const textoVisivel = midia ? (midia.legenda || rotuloDaMidia(midia.type, midia.fileName)) : text;

  // So numeros, sem formatacao (espaco, parenteses, traco) — a Evolution API exige o
  // numero "cru", com codigo do pais na frente (ex: 55 93 99999-9999 -> 5593999999999).
  // Normaliza igual o webhook ja faz pro numero recebido: adiciona o "55" e o nono
  // digito quando estiverem faltando -- sem isso a Evolution recusa o envio dizendo
  // que o numero "nao existe" quando na verdade so falta o codigo do pais.
  const numero = normalizarTelefoneBR(phone.replace(/\D/g, ''));

  try {
    // Texto: /message/sendText. Arquivo: /message/sendMedia (foto, video, documento) ou /message/sendWhatsAppAudio
    // (audio de voz; `encoding` pede pra Evolution converter pro formato de voz do WhatsApp, ogg/opus).
    let rota = 'sendText';
    let corpoEnvio = { number: numero, text };
    if (midia && midia.type === 'audio') {
      rota = 'sendWhatsAppAudio';
      corpoEnvio = { number: numero, audio: midia.url, encoding: true };
    } else if (midia) {
      rota = 'sendMedia';
      corpoEnvio = {
        number: numero,
        mediatype: midia.type,
        ...(midia.mimeType ? { mimetype: midia.mimeType } : {}),
        caption: midia.legenda,
        media: midia.url,
        fileName: midia.fileName || (midia.type === 'document' ? 'documento' : midia.type),
      };
    }
    const r = await fetch(`${EVOLUTION_API_URL}/message/${rota}/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpoEnvio),
    });

    if (!r.ok) {
      const errBody = await r.text();
      console.error('Evolution API recusou o envio:', rota, errBody);
      res.status(502).json({ error: midia ? 'A Evolution API recusou o envio desse arquivo.' : 'A Evolution API recusou o envio dessa mensagem.' });
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
    const salva = await registrarMensagemEnviada({
      phone, text: textoVisivel, senderName, leadId, whatsappMessageId: idMensagem, createdAt: quandoEnviada,
      midia: midia ? {
        url: midia.url, fileName: midia.fileName, contentType: midia.type,
        audio: midia.type === 'audio' ? { ...(midia.mimeType ? { media_mime_type: midia.mimeType } : {}), ...(midia.seconds ? { media_duration: midia.seconds } : {}) } : undefined,
      } : undefined,
    });
    await atualizarLeadMensagemEnviada(Array.from(new Set([phone, numero])), textoVisivel, quandoEnviada);

    res.status(200).json({ ok: true, whatsappMessageId: idMensagem, createdAt: quandoEnviada, saved: salva });
  } catch (err) {
    console.error('Erro ao enviar mensagem via Evolution API:', err);
    res.status(500).json({ error: 'Não foi possível enviar a mensagem. Confira se a Evolution API está no ar e o número está conectado.' });
  }
}
