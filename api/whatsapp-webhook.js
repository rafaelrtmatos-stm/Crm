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

import { EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_WEBHOOK_SECRET, INSTANCE_NAME, SUPABASE_URL, SUPABASE_ANON_KEY, COMPANY_ID, APP_BASE_URL, SEM_CRM_MESSAGES } from './_lib/whatsapp-config.js';
import { normalizarTelefoneBR } from './_lib/phone.js';
import { timestampParaIso } from './_lib/timestamp.js';
import { waitUntil } from '@vercel/functions';
import { processarTranscricao, enfileirarTranscricao } from './_lib/transcricao-fila.js';
import { encontrarNodeMidia, extrairTextoMensagem, extrairInfoMidia as extrairInfoMidiaCompartilhado, extrairContextoCitacao } from './_lib/wa-parse.js';
import { sinalizarMensagemNova } from './_lib/realtime-signal.js';
import { espelharFotoNoStorage } from './_lib/foto-perfil-storage.js';
import { normalizarStatusEntrega, statusesSubstituiveis } from './_lib/wa-status.js';
import { analisarMensagemParaAprendizado } from './_lib/aprendizado.js';

// A transcrição de áudio roda em segundo plano (waitUntil) depois da resposta ao webhook;
// dá tempo pra ela terminar (download + Gemini + 1 retry) sem cortar a função.
export const config = { maxDuration: 60 };

// Segredo compartilhado com a Evolution API — configura o MESMO valor nos dois lados
// (aqui via variavel de ambiente da Vercel, e na Evolution API como header customizado
// no webhook). Protege pra ninguem conseguir inserir mensagem falsa mandando um POST
// direto pra essa URL sem saber o segredo.
const WEBHOOK_SECRET = EVOLUTION_WEBHOOK_SECRET;


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

// FASE 2 (redução de egress do Supabase): não baixa mais a mídia aqui nem sobe pro Storage.
// Ver api/_lib/wa-parse.js (extrairInfoMidia) — mesma função usada pelo endpoint de histórico
// ao vivo da Fase 3 (api/whatsapp-messages.js), pra não duplicar essa lógica em dois lugares.
function extrairInfoMidia(msg) {
  const info = extrairInfoMidiaCompartilhado(msg, APP_BASE_URL);
  if (!info && encontrarNodeMidia(msg?.message) && !APP_BASE_URL) {
    console.error('Midia recebida mas APP_BASE_URL/VERCEL_URL indisponivel -- mediaUrl nao vai ser gravada.');
  }
  return info;
}

async function inserirMensagem({ phone, text, senderName, direction = 'incoming', channel = 'WhatsApp', whatsappMessageId, createdAt, mediaUrl, fileName, contentType, groupJid, audio, quotedMessageId, quotedText, quotedSender, quotedMediaType }) {
  if (!phone || !text) return;
  // `audio` = campos extras do áudio (media_mime_type, media_duration, transcription_status).
  const quoteVersions = (quotedMessageId || quotedText) ? [{
    quotedMessageId: quotedMessageId || null,
    quotedText: quotedText || null,
    quotedSender: quotedSender || null,
    quotedMediaType: quotedMediaType || null,
  }] : null;

  const enviar = (comGrupo, comAudio = true, comCitacao = true) => fetch(`${SUPABASE_URL}/rest/v1/crm_messages`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
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
      ...(quoteVersions ? { versions: quoteVersions } : {}),
      ...(comCitacao && (quotedMessageId || quotedText) ? {
        quoted_message_id: quotedMessageId || null,
        quoted_text: quotedText || null,
        quoted_sender: quotedSender || null,
      } : {}),
      ...(comAudio && audio ? audio : {}),
      // Identificador REAL do grupo (remoteJid ...@g.us). `phone` continua sendo so os digitos dele.
      ...(comGrupo && groupJid ? { group_jid: groupJid } : {}),
      ...(createdAt ? { created_at: createdAt } : {}),
    }),
  });

  let resp = await enviar(true, true, true);
  // Se a tabela ainda não tiver as colunas de citação, áudio ou grupo, tenta com fallback
  if (!resp.ok && (quotedMessageId || quotedText)) resp = await enviar(true, true, false);
  if (!resp.ok && audio) resp = await enviar(true, false, false);
  if (!resp.ok && groupJid) resp = await enviar(false, false, false);

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

    // Guarda a foto no Storage (a URL do WhatsApp expira); se nao der, grava a URL original como antes.
    const fotoFinal = (await espelharFotoNoStorage(phone, fotoUrl)) || fotoUrl;

    await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${leads[0].id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo_url: fotoFinal }),
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

// MESSAGES_UPDATE: a Evolution avisa quando uma mensagem ENVIADA por nos foi entregue / lida (os "tiques").
// Formatos aceitos: { keyId|messageId, remoteJid, fromMe, status } (Evolution v2), ou
// [{ key: { id, remoteJid, fromMe }, update: { status } }] (Baileys cru). Devolve so o que interessa:
// [{ id (whatsapp_message_id), remoteJid, status: 'sent'|'delivered'|'read', timestamp }] -- so mensagens MINHAS.
function extrairAtualizacoesStatus(data) {
  const lista = Array.isArray(data) ? data : [data].filter(Boolean);
  const saida = [];
  for (const u of lista) {
    const fromMe = u?.fromMe ?? u?.key?.fromMe;
    if (fromMe === false) continue; // recibo de mensagem RECEBIDA (eu que li) nao interessa
    const id = u?.keyId || u?.key?.id || u?.messageId || null;
    const status = normalizarStatusEntrega(u?.status ?? u?.update?.status);
    if (!id || !status) continue;
    const rawTs = u?.messageTimestamp || u?.timestamp || u?.dateTime || u?.update?.statusTimestamp;
    const timestamp = rawTs ? timestampParaIso(rawTs) : null;
    saida.push({ id, remoteJid: u?.remoteJid || u?.key?.remoteJid || '', status, timestamp });
  }
  return saida;
}

// Grava o status na mensagem (crm_messages.delivery_status) e os horários (delivered_at, read_at).
// So SOBE (sent -> delivered -> read): um evento atrasado/reenviado nunca faz um "lido" voltar pra "entregue".
// Os horários são gravados na primeira vez que cada status é alcançado. Devolve o phone da conversa (ou null).
async function atualizarStatusEntrega(atualizacao) {
  try {
    const permitidos = statusesSubstituiveis(atualizacao.status);
    const condicoes = ['delivery_status.is.null', ...permitidos.map((p) => `delivery_status.eq.${p}`)].join(',');
    const agoraIso = atualizacao.timestamp || new Date().toISOString();
    const patchBody = { delivery_status: atualizacao.status };
    if (atualizacao.status === 'delivered') {
      patchBody.delivered_at = agoraIso;
    } else if (atualizacao.status === 'read') {
      patchBody.read_at = agoraIso;
    }

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_messages?company_id=eq.${COMPANY_ID}&whatsapp_message_id=eq.${encodeURIComponent(atualizacao.id)}&or=${encodeURIComponent(`(${condicoes})`)}&select=phone`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(patchBody),
      }
    );
    if (!r.ok) {
      // Se falhou (ex: migracao add_delivery_timestamps_crm_messages.sql ainda nao foi rodada no Supabase),
      // faz fallback gravando apenas delivery_status para nao quebrar os tiques.
      if (patchBody.delivered_at || patchBody.read_at) {
        const retryR = await fetch(
          `${SUPABASE_URL}/rest/v1/crm_messages?company_id=eq.${COMPANY_ID}&whatsapp_message_id=eq.${encodeURIComponent(atualizacao.id)}&or=${encodeURIComponent(`(${condicoes})`)}&select=phone`,
          {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify({ delivery_status: atualizacao.status }),
          }
        );
        if (retryR.ok) {
          const linhasFallback = await retryR.json().catch(() => []);
          return Array.isArray(linhasFallback) && linhasFallback[0]?.phone ? linhasFallback[0].phone : null;
        }
      }
      const corpo = await r.text().catch(() => '');
      console.error('[CRM WEBHOOK] falha ao gravar status de entrega (rodou add_delivery_status_crm_messages.sql / add_delivery_timestamps_crm_messages.sql?):', r.status, corpo);
      return null;
    }
    const linhas = await r.json().catch(() => []);
    // Grava OS HORÁRIOS de cada tique (delivered_at/read_at) -- sempre só na primeira vez que cada um e'
    // alcançado (filtro "is.null" abaixo), pra depois dar pra mostrar "Entregue às 14:32, lida às 14:35"
    // quando o atendente toca nos tiques. Roda em paralelo, sem bloquear/derrubar o resto se falhar (coluna
    // pode nao existir ainda -- ver add_delivery_timestamps_crm_messages.sql).
    await gravarHorarioDoTique(atualizacao.id, atualizacao.status);
    return Array.isArray(linhas) && linhas[0]?.phone ? linhas[0].phone : null;
  } catch (err) {
    console.error('[CRM WEBHOOK] falha ao gravar status de entrega (nao impede o resto):', err);
    return null;
  }
}

async function gravarHorarioDoTique(whatsappMessageId, status) {
  const agora = new Date().toISOString();
  // "lida" implica que tambem foi "entregue" -- se por algum motivo o evento de delivered nunca
  // chegou, preenche os dois horarios juntos agora (cada um só se ainda estiver vazio).
  const campos = status === 'read' ? ['delivered_at', 'read_at'] : status === 'delivered' ? ['delivered_at'] : [];
  for (const campo of campos) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/crm_messages?company_id=eq.${COMPANY_ID}&whatsapp_message_id=eq.${encodeURIComponent(whatsappMessageId)}&${campo}=is.null`,
        {
          method: 'PATCH',
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ [campo]: agora }),
        }
      );
      if (!r.ok) {
        const corpo = await r.text().catch(() => '');
        console.error(`[CRM WEBHOOK] falha ao gravar ${campo} (rodou add_delivery_timestamps_crm_messages.sql?):`, r.status, corpo);
      }
    } catch (err) {
      console.error(`[CRM WEBHOOK] falha ao gravar ${campo} (nao impede o resto):`, err);
    }
  }
}

// Mensagem apagada (pelo cliente no WhatsApp dele, ou por mim direto no celular, fora do CRM):
// NUNCA apaga a linha de crm_messages -- so marca deleted_at/deleted_by. O chat passa a mostrar
// um placeholder ("Mensagem apagada" / "Você apagou essa mensagem para todos") no lugar do
// texto/mídia original, que fica preservado no banco (deleted_at.is.null evita marcar de novo
// uma mensagem que eu mesmo já apaguei pelo botão do CRM, com um deleted_by mais preciso).
async function marcarMensagemApagada(whatsappMessageId, apagadaPor) {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_messages?company_id=eq.${COMPANY_ID}&whatsapp_message_id=eq.${encodeURIComponent(whatsappMessageId)}&deleted_at=is.null`,
      {
        method: 'PATCH',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ deleted_at: new Date().toISOString(), deleted_by: apagadaPor }),
      }
    );
    if (!r.ok) console.error('[CRM WEBHOOK] falha ao marcar mensagem apagada (rodou add_apagar_editar_mensagem_whatsapp.sql?):', r.status, await r.text().catch(() => ''));
  } catch (err) {
    console.error('[CRM WEBHOOK] falha ao marcar mensagem apagada (nao impede o resto):', err);
  }
}

// Mensagem editada pelo cliente no WhatsApp dele (ou por mim direto no celular, fora do CRM):
// guarda o texto ANTIGO em crm_messages.versions (historico, mesmo mecanismo ja usado pras
// notas internas) antes de trocar o texto atual -- o chat mostra "editada" com o historico
// disponivel, nunca perde o que foi escrito antes.
async function registrarEdicaoMensagem(whatsappMessageId, textoNovo, editadoPor) {
  try {
    const buscaResp = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_messages?company_id=eq.${COMPANY_ID}&whatsapp_message_id=eq.${encodeURIComponent(whatsappMessageId)}&select=id,text,versions`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const linhas = await buscaResp.json().catch(() => []);
    const msg = Array.isArray(linhas) ? linhas[0] : null;
    if (!msg || textoNovo === (msg.text || '')) return; // não achou a mensagem original, ou o "novo" texto é igual ao que já tínhamos
    const versoesAtuais = Array.isArray(msg.versions) ? msg.versions : (msg.text ? [{ text: msg.text, editedAt: null, editedBy: null }] : []);
    const novasVersoes = [...versoesAtuais, { text: textoNovo, editedAt: new Date().toISOString(), editedBy: editadoPor }];
    const patchResp = await fetch(`${SUPABASE_URL}/rest/v1/crm_messages?id=eq.${encodeURIComponent(msg.id)}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ text: textoNovo, versions: novasVersoes, current_version_index: novasVersoes.length - 1, last_edited_at: new Date().toISOString(), last_edited_by: editadoPor }),
    });
    if (!patchResp.ok) console.error('[CRM WEBHOOK] falha ao gravar edição de mensagem:', patchResp.status, await patchResp.text().catch(() => ''));
  } catch (err) {
    console.error('[CRM WEBHOOK] falha ao gravar edição de mensagem (nao impede o resto):', err);
  }
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

        // Mensagem apagada (REVOKE): chega como um MESSAGES_UPSERT proprio, sem texto novo --
        // so um protocolMessage apontando (via key.id) pra mensagem original que sumiu do
        // WhatsApp. fromMe aqui e' de QUEM APAGOU (cliente apagando a propria mensagem = false;
        // eu apagando pelo celular, fora do CRM = true -- apagar pelo BOTAO do CRM usa
        // api/whatsapp-delete-message.js direto, sem passar por aqui).
        const tipoProtocolo = msg?.message?.protocolMessage?.type;
        if (tipoProtocolo === 'REVOKE' || tipoProtocolo === 0) {
          const idApagada = msg?.message?.protocolMessage?.key?.id;
          if (idApagada) waitUntil(marcarMensagemApagada(idApagada, msg?.key?.fromMe ? 'Celular' : 'cliente'));
          continue;
        }

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
          const jaExiste = SEM_CRM_MESSAGES ? false : await mensagemJaExiste(whatsappMessageId);
          let gravada = jaExiste;
          let transcreverAudioAgora = false;
          if (!jaExiste) {
            const midiaSalva = extrairInfoMidia(msg);
            // Audio: guarda mime/duracao (so metadado, fica em crm_messages mesmo). O status/texto da
            // transcricao em si mora na fila propria (wa_transcricao_fila, FASE 4) -- nao mais aqui.
            const infoAudio = isAudioMessage(msg);
            let camposAudio;
            let precisaTranscrever = false;
            if (infoAudio) {
              camposAudio = { media_mime_type: infoAudio.mimetype, media_duration: infoAudio.seconds };
              precisaTranscrever = !ehMinhaMensagem && midiaSalva?.contentType === 'audio' && !!midiaSalva?.mediaUrl
                && await transcricaoAutomaticaLigada(phone);
            }
            const citacao = extrairContextoCitacao(msg?.message);
            gravada = SEM_CRM_MESSAGES ? true : await inserirMensagem({
              phone, text, senderName, direction: ehMinhaMensagem ? 'outgoing' : 'incoming', whatsappMessageId, createdAt,
              groupJid: ehGrupoMsg ? phoneRaw : undefined,
              mediaUrl: midiaSalva?.mediaUrl, fileName: midiaSalva?.fileName, contentType: midiaSalva?.contentType,
              audio: camposAudio,
              quotedMessageId: citacao?.quotedMessageId,
              quotedText: citacao?.quotedText,
              quotedSender: citacao?.quotedSender,
              quotedMediaType: citacao?.quotedMediaType,
            });
            if (gravada && precisaTranscrever) {
              transcreverAudioAgora = await enfileirarTranscricao({
                phone, whatsappMessageId, mediaUrl: midiaSalva.mediaUrl, contentType: midiaSalva.contentType,
              });
            }
          }
          // So considera sincronizada quando ESTA registrada em crm_messages. Falhou: nao mexe na conversa
          // e devolve erro no fim pra Evolution tentar de novo (o indice unico evita duplicar).
          if (!gravada) { falhasGravacao++; console.error(`[CRM WEBHOOK] crm_messages INSERT FALHOU message_id=${whatsappMessageId || '(sem id)'} -- devolvendo 500 para a Evolution reenviar`); continue; }
          console.log(SEM_CRM_MESSAGES
            ? '[CRM WEBHOOK] mensagem processada (WA_SEM_CRM_MESSAGES ligada: nao grava em crm_messages, sem checagem de duplicada)'
            : `[CRM WEBHOOK] crm_messages INSERT OK${jaExiste ? ' (ja existia, sem duplicar)' : ''}`);
          // FASE 3 passo 3: avisa quem estiver com essa conversa aberta pra rebuscar na Evolution API
          // (sinal leve, sem conteudo) -- roda em segundo plano, nunca atrasa nem derruba o webhook.
          if (!jaExiste) waitUntil(sinalizarMensagemNova(phone));
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
          // Aprendizado automático do Robozinho Rafa (FASE 1): so mensagem NOVA, recebida de
          // cliente INDIVIDUAL (nunca de grupo, nunca eco de mensagem minha). Roda em segundo
          // plano -- nunca atrasa nem derruba a resposta do webhook, e nunca envia nada sozinho.
          if (!jaExiste && !ehMinhaMensagem && !ehGrupoMsg) {
            waitUntil(analisarMensagemParaAprendizado({ phone, text, leadId: null }));
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

    // MESSAGES_UPDATE de status de entrega/leitura e' tratado acima (tiques). Apagar (REVOKE, dentro de
    // messages.upsert) e editar (messages.edited) sao tratados nos blocos correspondentes -- o resto do
    // evento (MESSAGES_SET, carga de historico), CHATS_*, CONTACTS_*, GROUP_PARTICIPANTS_UPDATE:
    // reconhecidos com 200 e sem efeito no CRM de proposito. MESSAGES_SET nao entra aqui pra nao inundar
    // a lista de notificacoes com mensagens antigas -- historico antigo entra por
    // api/whatsapp-import-history.js.

    // Tiques de entrega/leitura das mensagens que EU enviei (1 tique = enviada, 2 = entregue, 2 azuis = lida).
    // Grava em crm_messages.delivery_status (o chat ja recarrega sozinho quando a linha muda). Com a leitura
    // ao vivo na Evolution (WA_SEM_CRM_MESSAGES=1) nao ha linha pra atualizar, entao avisa o chat aberto
    // pra rebuscar (o status vem junto do historico da Evolution).
    if (evento === 'messages.update') {
      const atualizacoes = extrairAtualizacoesStatus(body.data);
      for (const a of atualizacoes) {
        const remoto = String(a.remoteJid || '');
        if (remoto && !remoto.endsWith('@g.us') && !remoto.endsWith('@s.whatsapp.net') && !remoto.endsWith('@lid')) continue;
        const ehGrupoUpd = remoto.endsWith('@g.us');
        const digitos = remoto.replace('@s.whatsapp.net', '').replace('@g.us', '').replace('@lid', '').replace(/\D/g, '');
        const phoneDerivado = digitos ? (ehGrupoUpd ? digitos : normalizarTelefoneBR(digitos)) : null;
        if (SEM_CRM_MESSAGES) {
          if (phoneDerivado) waitUntil(sinalizarMensagemNova(phoneDerivado));
          continue;
        }
        const phoneGravado = await atualizarStatusEntrega(a);
        console.log(`[CRM WEBHOOK] status de entrega ${a.status} message_id=${a.id} ${phoneGravado ? 'atualizado' : '(sem mudanca)'}`);
      }
    }

    // Mensagem editada pelo cliente no WhatsApp dele (ou por mim direto no celular, fora do CRM
    // -- editar pelo BOTAO do CRM usa api/whatsapp-edit-message.js direto, sem passar por aqui).
    // A Evolution manda um evento proprio "messages.edited" (normalizado a partir de
    // MESSAGES_EDITED), formato { key: {id, remoteJid, fromMe}, editedMessage: {conversation} }.
    if (evento === 'messages.edited') {
      const edicoes = Array.isArray(body.data) ? body.data : [body.data].filter(Boolean);
      for (const e of edicoes) {
        const idOriginal = e?.key?.id;
        const textoNovo = extrairTextoMensagem(e?.editedMessage);
        if (!idOriginal || !textoNovo) continue;
        await registrarEdicaoMensagem(idOriginal, textoNovo, e?.key?.fromMe ? 'Celular' : 'cliente');
      }
    }

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
