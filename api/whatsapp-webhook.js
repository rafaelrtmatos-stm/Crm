// Webhook que a Evolution API chama automaticamente sempre que:
//  - chega uma mensagem nova no WhatsApp conectado (evento MESSAGES_UPSERT)
//  - o status da conexao muda (evento CONNECTION_UPDATE) — usado pelo IntegracoesModule.tsx
//    pra saber quando o QR Code foi escaneado com sucesso
//
// Grava a mensagem em crm_messages. NAO cria o lead aqui — isso ja acontece sozinho no
// front-end (src/App.tsx, useEffect que escuta INSERT em crm_messages com direction='incoming'),
// pra nao duplicar essa logica em dois lugares. O que este arquivo faz com o lead que JA EXISTE
// e manter a ULTIMA MENSAGEM em dia (last_message_at/direction/text, com o horario original da
// mensagem) -- e' isso que ordena a lista de conversas da aba Mensagens.
//
// Configura essa URL (https://seu-dominio.vercel.app/api/whatsapp-webhook) como "Webhook URL"
// dentro da propria Evolution API (na criacao/config da instancia).

import { EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_WEBHOOK_SECRET, INSTANCE_NAME, SUPABASE_URL, SUPABASE_ANON_KEY, COMPANY_ID } from './_lib/whatsapp-config.js';
import { normalizarTelefoneBR } from './_lib/phone.js';
import { timestampParaIso } from './_lib/timestamp.js';
import { waitUntil } from '@vercel/functions';
import { processarTranscricao } from './_lib/transcricao-fila.js';

// A transcrição de áudio roda em segundo plano (waitUntil) depois da resposta ao webhook;
// dá tempo pra ela terminar (download + Gemini + 1 retry) sem cortar a função.
export const config = { maxDuration: 60 };

// Segredo compartilhado com a Evolution API — configura o MESMO valor nos dois lados
// (aqui via variavel de ambiente da Vercel, e na Evolution API como header customizado
// no webhook). Protege pra ninguem conseguir inserir mensagem falsa mandando um POST
// direto pra essa URL sem saber o segredo.
const WEBHOOK_SECRET = EVOLUTION_WEBHOOK_SECRET;


// Percorre o objeto `message` da Evolution/Baileys e devolve o "node" de midia bruto
// (imageMessage/videoMessage/documentMessage/audioMessage/stickerMessage), sem desembrulhar
// texto -- usado pra extrairInfoMidia conseguir o mimetype/fileName/caption reais.
// Mesma logica de desembrulho de efemera/"ver uma vez" que extrairTextoMensagem usa.
function encontrarNodeMidia(message, profundidade = 0) {
  if (!message || profundidade > 4) return null;
  if (message.imageMessage) return { tipo: 'image', node: message.imageMessage };
  if (message.videoMessage) return { tipo: 'video', node: message.videoMessage };
  if (message.documentMessage) return { tipo: 'document', node: message.documentMessage };
  if (message.documentWithCaptionMessage?.message?.documentMessage) {
    return { tipo: 'document', node: message.documentWithCaptionMessage.message.documentMessage };
  }
  if (message.audioMessage) return { tipo: 'audio', node: message.audioMessage };
  if (message.stickerMessage) return { tipo: 'sticker', node: message.stickerMessage };

  const embrulho =
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message;
  if (embrulho) return encontrarNodeMidia(embrulho, profundidade + 1);

  return null;
}

// Extensao a partir do mimetype -- usada quando a midia nao tem fileName proprio
// (imagem/video/audio/figurinha, que so o documentMessage costuma trazer).
function extensaoPorMimetype(mimetype) {
  if (!mimetype) return '';
  const base = mimetype.split(';')[0].trim();
  const mapa = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/3gpp': '3gp', 'video/quicktime': 'mov',
    'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav',
    'application/pdf': 'pdf',
  };
  return mapa[base] || (base.includes('/') ? base.split('/')[1] : '');
}

// Baixa a midia (base64) direto da Evolution API a partir da propria mensagem recebida,
// Função centralizada: identifica áudio (voz/PTT ou arquivo de áudio) no payload REAL da Evolution/Baileys.
// Aceita o envelope da mensagem (msg = item de body.data). Devolve null se não for áudio, ou
// { ptt, mimetype, seconds, temMediaKey, temUrl } com o que a Evolution mandou.
//   - message.audioMessage { ptt, mimetype: 'audio/ogg; codecs=opus', seconds, mediaKey, url }
//   - também dentro de ephemeralMessage/viewOnce* (encontrarNodeMidia desembrulha)
//   - msg.messageType === 'audioMessage' (campo do envelope da Evolution) como segunda pista
function isAudioMessage(msg) {
  const midia = encontrarNodeMidia(msg?.message);
  const node = midia?.tipo === 'audio' ? midia.node : null;
  const tipoEnvelope = String(msg?.messageType || '').toLowerCase();
  if (!node && tipoEnvelope !== 'audiomessage') return null;
  return {
    ptt: !!node?.ptt,
    mimetype: node?.mimetype ? String(node.mimetype).split(';')[0].trim() : null,
    seconds: Number.isFinite(Number(node?.seconds)) && Number(node?.seconds) > 0 ? Math.round(Number(node.seconds)) : null,
    temMediaKey: !!node?.mediaKey,
    temUrl: !!node?.url || !!msg?.message?.base64,
  };
}

// Transcrição automática é por conversa (leads.auto_transcribe, padrão ligado). Falha na consulta => liga.
async function transcricaoAutomaticaLigada(phone) {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?company_id=eq.${COMPANY_ID}&phone=eq.${encodeURIComponent(phone)}&select=auto_transcribe&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!r.ok) return true;
    const linhas = await r.json();
    return !(Array.isArray(linhas) && linhas[0] && linhas[0].auto_transcribe === false);
  } catch {
    return true;
  }
}

// sobe pro bucket publico "whatsapp-media" no Supabase Storage e devolve a URL publica +
// nome do arquivo + content_type -- os 3 dados que a tela de chat (Modules.tsx) precisa
// pra mostrar miniatura/botao de download em vez do rotulo de texto antigo ("📷 Imagem").
// Nunca lanca erro pra fora: se a midia falhar em baixar/subir, a mensagem ainda e gravada
// (so sem media_url), pra nao perder a mensagem inteira por causa de um anexo.
async function baixarEGuardarMidia(msg, evoHeaders) {
  const midia = encontrarNodeMidia(msg?.message);
  if (!midia) return null;

  const messageId = msg?.key?.id;
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !evoHeaders || !messageId) {
    // Log explicito pra dar pra diagnosticar pelos logs da Vercel -- sem isso, midia
    // "nao baixa" silenciosamente e nao da pra saber se e' falta de env var ou outra coisa.
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error('Midia recebida mas EVOLUTION_API_URL/EVOLUTION_API_KEY nao configuradas -- configure essas env vars na Vercel pra baixar midia de verdade.');
    }
    return null;
  }

  // A Evolution API busca a mensagem pelo ID no PROPRIO banco dela (nao pelo conteudo que
  // a gente manda) -- o payload documentado e' so { message: { key: { id } }, convertToMp4 }.
  // Mandar o objeto `message` (conteudo) ou `key` completo (com remoteJid/fromMe) faz a busca
  // falhar com 400 "Message not found" em algumas versoes da Evolution.
  const buscarBase64 = async () => {
    const r = await fetch(`${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: evoHeaders,
      body: JSON.stringify({ message: { key: { id: messageId } }, convertToMp4: false }),
    });
    return r;
  };

  try {
    let r = await buscarBase64();
    if (!r.ok) {
      const corpoErro = await r.text().catch(() => '');
      // A mensagem pode ainda nao estar salva no banco interno da Evolution no exato
      // instante em que o webhook dispara (race condition) -- espera 1.5s e tenta mais
      // uma vez antes de desistir.
      console.error('Falha ao baixar midia da Evolution API (tentando de novo em 1.5s):', r.status, corpoErro);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      r = await buscarBase64();
    }
    if (!r.ok) {
      console.error('Falha ao baixar midia da Evolution API (2ª tentativa):', r.status, await r.text().catch(() => ''));
      return null;
    }
    const data = await r.json();
    const base64 = data?.base64 || data?.data;
    if (!base64) {
      console.error('Evolution API respondeu sem base64 pra midia:', messageId, JSON.stringify(data).slice(0, 300));
      return null;
    }

    const mimetype = data?.mimetype || midia.node?.mimetype || 'application/octet-stream';
    const extensao = extensaoPorMimetype(mimetype) || 'bin';
    const nomeOriginal = midia.node?.fileName || null;
    const fileName = nomeOriginal || `${midia.tipo}-${Date.now()}.${extensao}`;
    // So o nome do arquivo e' escapado -- se codificasse o path inteiro, a barra "/" vira
    // "%2F" e o Storage deixa de tratar isso como pasta (COMPANY_ID vira parte do nome
    // do arquivo em vez de uma pasta de verdade dentro do bucket).
    const path = `${COMPANY_ID}/${messageId}-${encodeURIComponent(fileName)}`;

    const bytes = Buffer.from(base64, 'base64');

    const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/whatsapp-media/${path}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': mimetype,
        'x-upsert': 'true',
      },
      body: bytes,
    });
    if (!upload.ok) {
      console.error('Falha ao subir midia pro Storage:', upload.status, await upload.text().catch(() => ''));
      return null;
    }

    const mediaUrl = `${SUPABASE_URL}/storage/v1/object/public/whatsapp-media/${path}`;
    return { mediaUrl, fileName, contentType: midia.tipo };
  } catch (err) {
    console.error('Falha ao baixar/guardar midia (nao impede o resto):', err);
    return null;
  }
}

// Percorre o objeto `message` da Evolution/Baileys e devolve um texto exibivel pro chat.
// Mensagens efemeras ("apagar apos ler") e "ver uma vez" vem embrulhadas em mais um nivel
// (ephemeralMessage.message / viewOnceMessage(V2).message) — sem desembrulhar isso, o
// texto real nunca e encontrado e a mensagem eh descartada em silencio.
function extrairTextoMensagem(message, profundidade = 0) {
  if (!message || profundidade > 4) return '';

  if (typeof message.conversation === 'string') return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;

  // Midia com legenda — se nao tiver legenda, mostra um rotulo pra mensagem nao sumir do chat
  if (message.imageMessage) return message.imageMessage.caption || '📷 Imagem';
  if (message.videoMessage) return message.videoMessage.caption || '🎥 Vídeo';
  if (message.documentMessage || message.documentWithCaptionMessage) {
    const doc = message.documentMessage || message.documentWithCaptionMessage?.message?.documentMessage;
    return doc?.caption || (doc?.fileName ? `📄 ${doc.fileName}` : '📄 Documento');
  }
  if (message.audioMessage) return message.audioMessage.ptt ? '🎤 Áudio' : '🎵 Áudio';
  if (message.stickerMessage) return '🌟 Figurinha';
  if (message.locationMessage || message.liveLocationMessage) return '📍 Localização';
  if (message.contactMessage) return `📇 Contato: ${message.contactMessage.displayName || ''}`.trim();
  if (message.contactsArrayMessage) return '📇 Contatos';
  if (message.buttonsResponseMessage) return message.buttonsResponseMessage.selectedDisplayText || '';
  if (message.listResponseMessage) return message.listResponseMessage.title || message.listResponseMessage.singleSelectReply?.selectedRowId || '';
  if (message.templateButtonReplyMessage) return message.templateButtonReplyMessage.selectedDisplayText || '';

  // Mensagem efemera / "ver uma vez" — o conteudo real esta um nivel mais fundo
  const embrulho =
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message.documentWithCaptionMessage?.message;
  if (embrulho) return extrairTextoMensagem(embrulho, profundidade + 1);

  return '';
}

async function inserirMensagem({ phone, text, senderName, direction = 'incoming', channel = 'WhatsApp', whatsappMessageId, createdAt, mediaUrl, fileName, contentType, groupJid, audio }) {
  if (!phone || !text) return;
  // `audio` = campos extras do áudio (media_mime_type, media_duration, transcription_status).
  const enviar = (comGrupo, comAudio = true) => fetch(`${SUPABASE_URL}/rest/v1/crm_messages`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      // A Evolution API pode reenviar o mesmo webhook (retry por timeout/instabilidade).
      // Com o indice unico em (company_id, whatsapp_message_id), isso evita duplicar a
      // mensagem no chat em tempo real quando o mesmo evento chega mais de uma vez.
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify({
      company_id: COMPANY_ID,
      phone,
      text,
      direction,
      sender_name: senderName || null,
      channel,
      whatsapp_message_id: whatsappMessageId || null,
      media_url: mediaUrl || null,
      file_name: fileName || null,
      content_type: contentType || null,
      ...(comAudio && audio ? audio : {}),
      // Identificador REAL do grupo (remoteJid ...@g.us). `phone` continua sendo so os digitos dele.
      ...(comGrupo && groupJid ? { group_jid: groupJid } : {}),
      ...(createdAt ? { created_at: createdAt } : {}),
    }),
  });

  let resp = await enviar(true);
  // Coluna group_jid ainda nao existe (supabase/add_last_message_at_to_leads.sql nao rodou): grava sem ela
  // -- a mensagem nunca pode ser perdida por causa desse campo extra.
  // Idem para as colunas de transcricao (supabase/add_transcricao_audio_crm_messages.sql).
  if (!resp.ok && audio) resp = await enviar(true, false);
  if (!resp.ok && groupJid) resp = await enviar(false, false);

  if (!resp.ok) {
    const corpo = await resp.text().catch(() => '');
    console.error('Falha ao inserir mensagem no Supabase:', resp.status, corpo);
    return false;
  }
  return true;
}

// Ja existe em crm_messages? (mesmo whatsapp_message_id -- a Evolution reenvia o mesmo evento em retry,
// e o "eco" de mensagem enviada pelo CRM chega aqui tambem). Falha na consulta => false: o indice unico
// (company_id, whatsapp_message_id) + ignore-duplicates continua protegendo contra duplicar.
async function mensagemJaExiste(whatsappMessageId) {
  if (!whatsappMessageId) return false;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_messages?company_id=eq.${COMPANY_ID}&whatsapp_message_id=eq.${encodeURIComponent(whatsappMessageId)}&select=id&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!r.ok) return false;
    const linhas = await r.json();
    return Array.isArray(linhas) && linhas.length > 0;
  } catch {
    return false;
  }
}

// Busca o nome/assunto real do grupo direto na Evolution API (metadata do grupo).
// Sem isso o grupo ficava cadastrado com nome=null e a tela de Grupos (WhatsAppGroupsModule.tsx)
// caia sempre no fallback `g.nome || g.group_jid`, mostrando o JID cru pro admin.
// Atualiza a previa da conversa (barra lateral) quando uma mensagem MINHA (fromMe) chega
// pelo webhook -- ou seja, foi mandada direto no WhatsApp do celular/computador, fora do
// CRM. Quando o envio e feito pelo proprio botao do CRM (ver handleSendMessage em
// Modules.tsx), essa mesma atualizacao ja acontece na hora, direto do front-end -- essa
// funcao aqui so cobre o caminho que faltava. So atualiza lead que JA EXISTE (nunca cria
// lead a partir de mensagem enviada por mim, só de mensagem recebida do cliente).
async function atualizarPreviaLeadOutgoing(phone, text, createdAt) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/leads?company_id=eq.${COMPANY_ID}&phone=eq.${phone}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        last_message_text: text,
        last_message_direction: 'outgoing',
        waiting_since: null,
        updated_at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error('Falha ao atualizar previa do lead pra mensagem enviada fora do CRM (nao impede o resto):', err);
  }
  // Horario da ultima mensagem (ordem da lista) -- sempre o ORIGINAL, e so se for mais nova.
  await atualizarLeadUltimaMensagem(phone, createdAt || new Date().toISOString(), {
    last_message_direction: 'outgoing',
    last_message_text: text,
    waiting_since: null,
  });
}

// ORDEM DA LISTA DE CONVERSAS (aba Mensagens): a posicao da conversa depende so da ULTIMA MENSAGEM
// REAL, gravada em leads.last_message_at (ver supabase/add_last_message_at_to_leads.sql) -- nunca do
// updated_at do cadastro. Sempre com o horario ORIGINAL da mensagem (messageTimestamp), nao o de
// quando o webhook processou (senao um historico reimportado/reenviado subia a conversa pro topo).
// O PATCH so acontece se a mensagem e MAIS NOVA que a ultima ja registrada (ou se o lead ainda nao
// tem last_message_at): reenvio do mesmo webhook ou mensagem antiga nunca faz a conversa voltar
// no tempo. So atualiza lead que JA EXISTE -- quem cria o lead continua sendo o front (App.tsx).
// Falha aqui nunca derruba o webhook: a mensagem ja esta salva em crm_messages.
async function atualizarLeadUltimaMensagem(phone, quando, campos) {
  try {
    const filtroMaisNova = encodeURIComponent(`(last_message_at.is.null,last_message_at.lt.${quando})`);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/leads?company_id=eq.${COMPANY_ID}&phone=eq.${phone}&or=${filtroMaisNova}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ last_message_at: quando, ...campos }),
    });
    if (!r.ok) {
      const corpo = await r.text().catch(() => '');
      console.error('Falha ao atualizar a ultima mensagem do lead (rodou add_last_message_at_to_leads.sql?):', r.status, corpo);
    } else {
      const linhas = await r.json().catch(() => []);
      console.log(`[CRM WEBHOOK] lead atualizado: ${Array.isArray(linhas) ? linhas.length : 0} (0 = lead ainda nao existe ou ja tem mensagem mais nova; o CRM/sincronizador cria/corrige)`);
    }
  } catch (err) {
    console.error('Falha ao atualizar a ultima mensagem do lead (nao impede o resto):', err);
  }
}

// Mensagem RECEBIDA do cliente: a conversa sobe pro topo com a previa dela. Nao cria notificacao
// aqui -- isso ja e' feito pelo gatilho do banco (crm_notify_incoming_message) no INSERT em
// crm_messages. `waiting_since` volta a marcar o cliente como aguardando resposta.
async function atualizarLeadMensagemRecebida(phone, previa, createdAt, textoPuro) {
  const quando = createdAt || new Date().toISOString();
  await atualizarLeadUltimaMensagem(phone, quando, {
    last_message_direction: 'incoming',
    last_message_text: previa,
    last_client_message_at: quando,
    last_client_message_text: textoPuro ?? previa,
    waiting_since: quando,
  });
  // Ultima mensagem DO CLIENTE: independente da ultima da conversa. Se o atendente ja respondeu depois
  // (last_message_at mais novo) o PATCH acima nao entra, mas last_client_message_* ainda precisa avancar.
  // So avanca (mensagem antiga/reenviada nunca faz voltar no tempo).
  try {
    const filtro = encodeURIComponent(`(last_client_message_at.is.null,last_client_message_at.lt.${quando})`);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/leads?company_id=eq.${COMPANY_ID}&phone=eq.${phone}&or=${filtro}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ last_client_message_at: quando, last_client_message_text: textoPuro ?? previa }),
    });
    if (!r.ok) console.error('Falha ao atualizar a ultima mensagem do cliente no lead:', r.status, await r.text().catch(() => ''));
  } catch (err) {
    console.error('Falha ao atualizar a ultima mensagem do cliente no lead (nao impede o resto):', err);
  }
}

async function buscarNomeGrupo(groupJid, evoHeaders) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !evoHeaders) return null;
  try {
    const r = await fetch(
      `${EVOLUTION_API_URL}/group/findGroupInfos/${INSTANCE_NAME}?groupJid=${encodeURIComponent(groupJid)}`,
      { method: 'GET', headers: evoHeaders }
    );
    if (!r.ok) return null;
    const data = await r.json();
    const nome = (data?.subject || data?.name || data?.groupName || '').trim();
    return nome || null;
  } catch (err) {
    console.error('Falha ao buscar nome do grupo (nao impede o resto):', err);
    return null;
  }
}

async function garantirGrupoExiste(groupJid, nomeGrupo, evoHeaders) {
  // Verifica se o grupo ja esta cadastrado. Se nao estiver, cria com visivel=false
  // (fica represado ate o admin liberar na tela de gestao de grupos)
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/whatsapp_groups?company_id=eq.rafa-arts&group_jid=eq.${encodeURIComponent(groupJid)}&select=id,visivel,nome`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  const existentes = await r.json();

  if (Array.isArray(existentes) && existentes.length > 0) {
    const grupo = existentes[0]; // { id, visivel, nome }
    // Grupo ja cadastrado mas ainda sem nome (cadastrado antes dessa correcao, ou o
    // metadata nao veio na primeira tentativa) — tenta buscar e preencher agora.
    if (!grupo.nome) {
      const nomeAtual = nomeGrupo || (await buscarNomeGrupo(groupJid, evoHeaders));
      if (nomeAtual) {
        await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_groups?id=eq.${grupo.id}`, {
          method: 'PATCH',
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: nomeAtual }),
        });
        grupo.nome = nomeAtual;
      }
    }
    return grupo;
  }

  // Grupo novo — busca o nome real antes de criar, cria represado (visivel=false),
  // nao mostra pra ninguem ate o admin liberar
  const nomeResolvido = nomeGrupo || (await buscarNomeGrupo(groupJid, evoHeaders));
  const createRes = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_groups`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ company_id: 'rafa-arts', group_jid: groupJid, nome: nomeResolvido || null, visivel: false }),
  });
  const criado = await createRes.json();
  return Array.isArray(criado) ? criado[0] : { visivel: false, nome: nomeResolvido || null };
}

// Nome real do contato/agenda como fallback quando a Evolution nao manda pushName no
// evento (acontece em alguns eventos de sistema/retry). Busca na lista de contatos —
// mesma fonte confiavel que a importacao de historico ja usa (findContacts).
async function buscarNomeContato(phone, evoHeaders) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !evoHeaders || !phone) return '';
  try {
    const r = await fetch(`${EVOLUTION_API_URL}/chat/findContacts/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: evoHeaders,
      body: JSON.stringify({ where: { id: `${phone}@s.whatsapp.net` } }),
    });
    if (!r.ok) return '';
    const data = await r.json();
    const lista = Array.isArray(data) ? data : (data?.contacts || []);
    const contato = lista.find((c) => (c?.remoteJid || c?.id || '').startsWith(phone)) || lista[0];
    return (contato?.pushName || contato?.name || contato?.notify || '').trim();
  } catch (err) {
    console.error('Falha ao buscar nome do contato na agenda (nao impede o resto):', err);
    return '';
  }
}

// `jidGrupo`: em conversa de GRUPO o `phone` sao so os digitos do group_jid (nao e um numero de celular), entao a
// foto do grupo e buscada pelo JID completo (...@g.us). Sem ele, busca a foto do contato pelo telefone, como sempre.
async function garantirFotoLead(phone, evoHeaders, jidGrupo) {
  try {
    // So busca a foto se o lead ainda NAO tem uma salva — evita ficar chamando a
    // Evolution API toda mensagem, so na primeira vez (ou se a foto ainda estiver vazia)
    const buscaR = await fetch(`${SUPABASE_URL}/rest/v1/leads?company_id=eq.${COMPANY_ID}&phone=eq.${phone}&select=id,photo_url`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    const leads = await buscaR.json();
    if (!Array.isArray(leads) || leads.length === 0 || leads[0].photo_url) return;

    const picRes = await fetch(`${EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: evoHeaders,
      body: JSON.stringify({ number: jidGrupo || phone }),
    });
    if (!picRes.ok) return;
    const picData = await picRes.json();
    const fotoUrl = picData?.profilePictureUrl || picData?.url || null;
    if (!fotoUrl) return;

    await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${leads[0].id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo_url: fotoUrl }),
    });
  } catch (err) {
    console.error('Falha ao buscar foto do contato (nao impede o resto):', err);
  }
}

// Grava o status de presenca (online/digitando/gravando/offline) de um contato —
// alimenta os indicadores no header do ChatPanel (ver src/components/Modules.tsx).
// So funciona pra chats que foram assinados antes via
// api/whatsapp-presence-subscribe.js (a Evolution/Baileys so manda PRESENCE_UPDATE
// pra quem foi assinado).
async function atualizarPresenca(phone, status, lastSeenAt) {
  if (!phone) return;
  await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_presence?on_conflict=company_id,phone`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      company_id: COMPANY_ID,
      phone,
      status,
      ...(lastSeenAt ? { last_seen_at: lastSeenAt } : {}),
      updated_at: new Date().toISOString(),
    }),
  }).catch((err) => console.error('Falha ao gravar presença (nao impede o resto):', err));
}

async function atualizarStatusConexao(status) {
  // Guarda o status da conexao (connecting | open | close) pro IntegracoesModule.tsx
  // conseguir ler e mostrar "Conectado"/"Desconectado" sem precisar perguntar direto
  // pra Evolution API toda hora.
  // Usa UPSERT (nao PATCH) porque a linha de robozinho_config pra essa empresa pode ainda
  // nao existir (so e criada quando alguem salva uma config manualmente na tela do
  // Robozinho) — um PATCH nela falharia em silencio, sem criar nada e sem erro visivel.
  await fetch(`${SUPABASE_URL}/rest/v1/robozinho_config?on_conflict=company_id`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      company_id: 'rafa-arts',
      whatsapp_connection_status: status,
      updated_at: new Date().toISOString(),
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Validacao do segredo — a Evolution API precisa mandar esse mesmo valor no header
  // (configuravel na propria Evolution API na hora de criar o webhook)
  if (WEBHOOK_SECRET) {
    // Aceita o segredo no header x-webhook-secret (padrao) OU na query (?secret=...) -- a tela de webhook
    // da Evolution nem sempre permite header customizado, e sem isso TODO evento voltava 401.
    const recebido = req.headers['x-webhook-secret'] || req.query?.secret;
    if (recebido !== WEBHOOK_SECRET) {
      // Log claro: 401 aqui = a Evolution nao esta mandando o MESMO valor de EVOLUTION_WEBHOOK_SECRET
      // (header x-webhook-secret ou ?secret=). Enquanto isso, NENHUMA mensagem chega em crm_messages.
      console.error(`[CRM WEBHOOK] 401 segredo invalido: ${recebido ? 'valor enviado diferente do configurado (EVOLUTION_WEBHOOK_SECRET)' : 'x-webhook-secret/?secret ausente na chamada da Evolution'} -- mensagens NAO estao sendo gravadas`);
      res.status(401).json({ error: 'Assinatura invalida' });
      return;
    }
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    // A Evolution manda o evento como "MESSAGES_UPSERT" ou "messages.upsert" (e, com "Webhook por evento"
    // ligado, tambem no fim da URL). Normaliza tudo pra minusculo com ponto: messages.upsert, send.message...
    const eventoBruto = body.event || req.query?.evento || '';
    const evento = String(eventoBruto).trim().toLowerCase().replace(/[_\-\s]+/g, '.');
    const event = evento; // compatibilidade com os blocos abaixo
    let falhasGravacao = 0;

    // Se a Evolution mandar o nome da instancia no payload, confere que e a nossa —
    // protege contra o dia em que essa mesma URL for reaproveitada por outra instancia.
    if (body.instance && body.instance !== INSTANCE_NAME) {
      res.status(200).json({ ok: true, ignorado: 'instancia diferente' });
      return;
    }

    if (evento === 'messages.upsert' || evento === 'send.message') {
      // Formato padrao da Evolution API: body.data pode ser um objeto unico ou uma lista,
      // dependendo da versao — trata os dois casos
      const mensagens = Array.isArray(body.data) ? body.data : [body.data].filter(Boolean);

      for (const msg of mensagens) {
        // Reacoes (👍, ❤️ etc.) chegam como um MESSAGES_UPSERT proprio, sem conteudo de
        // texto real — nao sao mensagem nova, entao nao devem virar linha no chat.
        if (msg?.message?.reactionMessage) continue;

        // fromMe:true = mensagem enviada PELO PROPRIO numero conectado -- pode ter sido
        // mandada pelo botao de enviar do CRM OU direto no WhatsApp do celular/computador,
        // fora do sistema. Antes essas eram todas descartadas aqui (assumindo que so vinham
        // do CRM), o que fazia mensagem mandada direto no celular nunca aparecer no CRM.
        // Agora processa como 'outgoing' -- se ja tiver sido gravada pelo CRM no momento do
        // envio (com o mesmo whatsapp_message_id, ver whatsapp-send.js), o indice unico em
        // (company_id, whatsapp_message_id) + ignore-duplicates faz esse insert virar um
        // no-op, sem duplicar. So se for realmente nova (mandada fora do CRM) que ela entra.
        // SEND_MESSAGE = mensagem enviada pela API (sempre nossa), mesmo se o payload nao trouxer fromMe.
        const ehMinhaMensagem = !!msg?.key?.fromMe || evento === 'send.message';

        // Contato em formato @lid: versoes novas da Evolution mandam o numero real em remoteJidAlt/senderPn.
        // Sem isso o telefone gravado era o "lid" e a mensagem nunca casava com o lead do contato.
        let phoneRaw = msg?.key?.remoteJid || '';
        if (phoneRaw.endsWith('@lid')) {
          const alt = msg?.key?.remoteJidAlt || msg?.key?.senderPn || '';
          if (alt && alt.endsWith('@s.whatsapp.net')) phoneRaw = alt;
        }
        const evoHeaders = (EVOLUTION_API_URL && EVOLUTION_API_KEY)
          ? { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' }
          : null;

        // Mensagem de grupo (remoteJid termina em @g.us): garante o grupo cadastrado (grupo novo entra
        // represado, visivel=false) mas NUNCA descarta a mensagem. A permissao/liberacao controla so a
        // VISUALIZACAO (aba Mensagens, notificacoes e tela de Grupos filtram por whatsapp_groups.visivel);
        // crm_messages continua sendo a fonte de verdade e guarda tudo, inclusive de grupo ainda nao liberado.
        if (phoneRaw.endsWith('@g.us')) {
          try {
            await garantirGrupoExiste(phoneRaw, null, evoHeaders);
          } catch (err) {
            console.error('[CRM WEBHOOK] falha ao cadastrar/consultar grupo (a mensagem e gravada mesmo assim):', err);
          }
        }

        // @lid e o formato "linked id" que o WhatsApp/Baileys mais recente usa em alguns
        // casos no lugar do numero puro — remove os dois sufixos possiveis pra sempre
        // sobrar so os digitos do telefone.
        // Grupo: `phone` = digitos do group_jid, SEM normalizacao de telefone (nao e um numero de celular).
        const ehGrupoMsg = phoneRaw.endsWith('@g.us');
        const digitosRemoto = phoneRaw.replace('@s.whatsapp.net', '').replace('@g.us', '').replace('@lid', '').replace(/\D/g, '');
        const phone = ehGrupoMsg ? digitosRemoto : normalizarTelefoneBR(digitosRemoto);
        const text = extrairTextoMensagem(msg?.message);
        const whatsappMessageId = msg?.key?.id || null;
        const createdAt = timestampParaIso(msg?.messageTimestamp);

        // Nome real do contato e OBRIGATORIO pra mensagem RECEBIDA: pushName do proprio
        // evento primeiro (mais rapido e cobre 99% dos casos); se vier vazio, busca na
        // agenda/contatos da Evolution API antes de gravar — nunca grava com nome generico.
        // Para mensagem enviada por mim (ehMinhaMensagem), se veio do webhook (fora do CRM),
        // foi enviada pelo WhatsApp no celular/aparelho móvel, então marca senderName = 'Celular'.
        let senderName = '';
        if (!ehMinhaMensagem) {
          senderName = (msg?.pushName || '').trim();
          if (!senderName && phone && evoHeaders && !phoneRaw.endsWith('@g.us')) {
            senderName = await buscarNomeContato(phone, evoHeaders);
          }
        } else {
          senderName = 'Celular';
        }

        if (phone && text) {
          console.log(`[CRM WEBHOOK] ${evento === 'send.message' ? 'SEND_MESSAGE' : 'MESSAGES_UPSERT'} recebido`);
          console.log(`[CRM WEBHOOK] phone=***${String(phone).slice(-4)}${ehGrupoMsg ? ' (grupo)' : ''} direction=${ehMinhaMensagem ? 'outgoing' : 'incoming'}`);
          console.log(`[CRM WEBHOOK] message_id=${whatsappMessageId || '(sem id)'}`);
          console.log(`[CRM WEBHOOK] created_at=${createdAt || '(sem timestamp: usa horario do banco)'}`);
          // Duplicado (retry da Evolution / eco de mensagem enviada pelo CRM): nao grava de novo nem baixa
          // a midia de novo, mas ainda garante o indice da conversa (PATCH so avanca, entao e inofensivo).
          const jaExiste = await mensagemJaExiste(whatsappMessageId);
          let gravada = jaExiste;
          let transcreverAudioAgora = false;
          if (!jaExiste) {
            const midiaSalva = await baixarEGuardarMidia(msg, evoHeaders);
            // Audio: guarda mime/duracao; se for RECEBIDO, o arquivo foi salvo e a conversa nao desligou a
            // transcricao automatica, ja entra como "pending" (transcrito em segundo plano abaixo).
            const infoAudio = isAudioMessage(msg);
            let camposAudio;
            if (infoAudio) {
              camposAudio = { media_mime_type: infoAudio.mimetype, media_duration: infoAudio.seconds };
              if (!ehMinhaMensagem && midiaSalva?.contentType === 'audio' && midiaSalva?.mediaUrl && await transcricaoAutomaticaLigada(phone)) {
                camposAudio.transcription_status = 'pending';
                transcreverAudioAgora = true;
              }
            }
            gravada = await inserirMensagem({
              phone, text, senderName, direction: ehMinhaMensagem ? 'outgoing' : 'incoming', whatsappMessageId, createdAt,
              groupJid: ehGrupoMsg ? phoneRaw : undefined,
              mediaUrl: midiaSalva?.mediaUrl, fileName: midiaSalva?.fileName, contentType: midiaSalva?.contentType,
              audio: camposAudio,
            });
          }
          // So considera sincronizada quando ESTA registrada em crm_messages. Falhou: nao mexe na conversa
          // e devolve erro no fim pra Evolution tentar de novo (o indice unico evita duplicar).
          if (!gravada) { falhasGravacao++; console.error(`[CRM WEBHOOK] crm_messages INSERT FALHOU message_id=${whatsappMessageId || '(sem id)'} -- devolvendo 500 para a Evolution reenviar`); continue; }
          console.log(`[CRM WEBHOOK] crm_messages INSERT OK${jaExiste ? ' (ja existia, sem duplicar)' : ''}`);
          // Transcricao em segundo plano: o webhook responde sem esperar (waitUntil mantem a funcao viva
          // ate terminar). Nunca lanca erro; falha so muda transcription_status da propria mensagem.
          if (transcreverAudioAgora && whatsappMessageId) {
            waitUntil(processarTranscricao({ whatsappMessageId }));
          }
          // Busca de foto de perfil e so faz sentido pro CONTATO (nao pro meu proprio numero)
          if (!jaExiste && !ehMinhaMensagem && evoHeaders) {
            garantirFotoLead(phone, evoHeaders, ehGrupoMsg ? phoneRaw : undefined); // nao usa await de proposito — nao atrasa a resposta do webhook
          }
          // Mensagem RECEBIDA: atualiza last_message_at/previa do lead (com o horario original)
          if (!ehMinhaMensagem) {
            // Em grupo a previa mostra quem falou ("Maria: texto")
            await atualizarLeadMensagemRecebida(phone, ehGrupoMsg && senderName ? `${senderName}: ${text}` : text, createdAt, text);
          }
          // Mensagem minha mandada fora do CRM (direto no celular) -- atualiza a previa da
          // conversa na lista, que senao so e atualizada quando o envio parte do proprio CRM.
          if (ehMinhaMensagem) {
            await atualizarPreviaLeadOutgoing(phone, text, createdAt); // com await: no serverless, o que fica pendente apos a resposta pode ser cortado
          }
        }
      }
    }

    // Grupos: a Evolution avisa quando um grupo e criado/renomeado. Mantem whatsapp_groups.nome em dia
    // (grupo novo continua entrando represado, visivel=false, ate o admin liberar).
    if (evento === 'groups.upsert' || evento === 'group.update' || evento === 'groups.update') {
      const grupos = Array.isArray(body.data) ? body.data : [body.data].filter(Boolean);
      const evoHeaders = (EVOLUTION_API_URL && EVOLUTION_API_KEY) ? { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' } : null;
      for (const g of grupos) {
        const jid = g?.id || g?.groupJid || g?.jid || '';
        const nome = String(g?.subject || g?.name || '').trim();
        if (!jid.endsWith('@g.us')) continue;
        const existente = await garantirGrupoExiste(jid, nome || null, evoHeaders);
        if (nome && existente?.id && existente.nome !== nome) {
          await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_groups?id=eq.${existente.id}`, {
            method: 'PATCH',
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, updated_at: new Date().toISOString() }),
          }).catch((err) => console.error('Falha ao atualizar nome do grupo (nao impede o resto):', err));
        }
      }
    }

    // MESSAGES_UPDATE (status de entrega/leitura, edicao), MESSAGES_DELETE, MESSAGES_SET (carga de
    // historico), CHATS_*, CONTACTS_*, GROUP_PARTICIPANTS_UPDATE: reconhecidos com 200 e sem efeito no
    // CRM de proposito. O historico fica preservado em crm_messages (nada e apagado por evento de
    // exclusao) e MESSAGES_SET nao entra aqui pra nao inundar a lista de notificacoes com mensagens
    // antigas -- historico antigo entra por api/whatsapp-import-history.js.

    if (event === 'connection.update') {
      const status = body?.data?.state || body?.data?.status;
      if (status) await atualizarStatusConexao(status);
    }

    // Presenca (online / digitando / gravando audio / offline com "visto por ultimo").
    // Formato Baileys/Evolution: body.data = { id: remoteJid, presences: { [jid]: { lastKnownPresence, lastSeen } } }
    // — mas algumas versoes mandam { id, presence: { lastKnownPresence } } direto, sem o
    // objeto "presences" por participante. Trata os dois formatos.
    if (event === 'presence.update') {
      const dados = body?.data;
      const remoteJid = dados?.id || dados?.remoteJid || '';
      if (remoteJid && !remoteJid.endsWith('@g.us')) {
        const phone = normalizarTelefoneBR(remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '').replace(/\D/g, ''));
        const presencas = dados?.presences
          ? Object.values(dados.presences)
          : (dados?.presence ? [dados.presence] : []);
        const ultima = presencas[presencas.length - 1];
        // available/composing/recording ficam "ao vivo"; qualquer outra coisa
        // (unavailable, paused, ou vazio) vira offline com o "visto por ultimo".
        const statusBruto = (ultima?.lastKnownPresence || '').toLowerCase();
        const status = ['available', 'composing', 'recording'].includes(statusBruto) ? statusBruto : 'unavailable';
        const lastSeenAt = timestampParaIso(ultima?.lastSeen) || (status === 'unavailable' ? new Date().toISOString() : undefined);
        if (phone) await atualizarPresenca(phone, status, lastSeenAt);
      }
    }

    if (falhasGravacao > 0) {
      // Nao gravou em crm_messages: 500 faz a Evolution reenviar o evento (duplicata e ignorada pelo indice).
      res.status(500).json({ error: 'Falha ao gravar mensagem em crm_messages', falhas: falhasGravacao });
      return;
    }
    res.status(200).json({ ok: true, evento });
  } catch (err) {
    console.error('Erro no webhook do WhatsApp:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}
