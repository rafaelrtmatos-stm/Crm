// Webhook que a Evolution API chama automaticamente sempre que:
//  - chega uma mensagem nova no WhatsApp conectado (evento MESSAGES_UPSERT)
//  - o status da conexao muda (evento CONNECTION_UPDATE) — usado pelo IntegracoesModule.tsx
//    pra saber quando o QR Code foi escaneado com sucesso
//
// So grava a mensagem em crm_messages. NAO precisa criar/atualizar o lead aqui — isso
// ja acontece sozinho no front-end (src/App.tsx, useEffect que escuta INSERT em
// crm_messages com direction='incoming'), pra nao duplicar essa logica em dois lugares.
//
// Configura essa URL (https://seu-dominio.vercel.app/api/whatsapp-webhook) como "Webhook URL"
// dentro da propria Evolution API (na criacao/config da instancia).

import { EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_WEBHOOK_SECRET, INSTANCE_NAME, SUPABASE_URL, SUPABASE_ANON_KEY, COMPANY_ID } from './_lib/whatsapp-config.js';
import { normalizarTelefoneBR } from './_lib/phone.js';

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
// sobe pro bucket publico "whatsapp-media" no Supabase Storage e devolve a URL publica +
// nome do arquivo + content_type -- os 3 dados que a tela de chat (Modules.tsx) precisa
// pra mostrar miniatura/botao de download em vez do rotulo de texto antigo ("📷 Imagem").
// Nunca lanca erro pra fora: se a midia falhar em baixar/subir, a mensagem ainda e gravada
// (so sem media_url), pra nao perder a mensagem inteira por causa de um anexo.
async function baixarEGuardarMidia(msg, evoHeaders) {
  const midia = encontrarNodeMidia(msg?.message);
  if (!midia || midia.tipo === 'sticker') return null; // figurinha continua so como rotulo por enquanto

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

async function inserirMensagem({ phone, text, senderName, direction = 'incoming', channel = 'WhatsApp', whatsappMessageId, createdAt, mediaUrl, fileName, contentType }) {
  if (!phone || !text) return;
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/crm_messages`, {
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
      ...(createdAt ? { created_at: createdAt } : {}),
    }),
  });

  if (!resp.ok) {
    const corpo = await resp.text().catch(() => '');
    console.error('Falha ao inserir mensagem no Supabase:', resp.status, corpo);
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
async function atualizarPreviaLeadOutgoing(phone, text) {
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

async function garantirFotoLead(phone, evoHeaders) {
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
      body: JSON.stringify({ number: phone }),
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
    const recebido = req.headers['x-webhook-secret'];
    if (recebido !== WEBHOOK_SECRET) {
      res.status(401).json({ error: 'Assinatura invalida' });
      return;
    }
  }

  try {
    const body = req.body || {};
    const event = body.event;

    // Se a Evolution mandar o nome da instancia no payload, confere que e a nossa —
    // protege contra o dia em que essa mesma URL for reaproveitada por outra instancia.
    if (body.instance && body.instance !== INSTANCE_NAME) {
      res.status(200).json({ ok: true, ignorado: 'instancia diferente' });
      return;
    }

    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
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
        const ehMinhaMensagem = !!msg?.key?.fromMe;

        const phoneRaw = msg?.key?.remoteJid || '';
        const evoHeaders = (EVOLUTION_API_URL && EVOLUTION_API_KEY)
          ? { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' }
          : null;

        // Mensagem de grupo (remoteJid termina em @g.us): verifica se o grupo esta
        // liberado pelo admin antes de gravar. Grupo novo entra represado (visivel=false)
        // e a mensagem eh descartada ate alguem liberar. Busca o nome real do grupo
        // (subject) na Evolution API pra nunca ficar exibindo o JID cru na tela de Grupos.
        if (phoneRaw.endsWith('@g.us')) {
          const grupo = await garantirGrupoExiste(phoneRaw, null, evoHeaders);
          if (!grupo?.visivel) continue; // grupo ainda nao liberado pelo admin, ignora a mensagem
        }

        // @lid e o formato "linked id" que o WhatsApp/Baileys mais recente usa em alguns
        // casos no lugar do numero puro — remove os dois sufixos possiveis pra sempre
        // sobrar so os digitos do telefone.
        const phone = normalizarTelefoneBR(phoneRaw.replace('@s.whatsapp.net', '').replace('@g.us', '').replace('@lid', '').replace(/\D/g, ''));
        const text = extrairTextoMensagem(msg?.message);
        const whatsappMessageId = msg?.key?.id || null;
        const createdAt = msg?.messageTimestamp ? new Date(Number(msg.messageTimestamp) * 1000).toISOString() : undefined;

        // Nome real do contato e OBRIGATORIO pra mensagem RECEBIDA: pushName do proprio
        // evento primeiro (mais rapido e cobre 99% dos casos); se vier vazio, busca na
        // agenda/contatos da Evolution API antes de gravar — nunca grava com nome generico.
        // Pra mensagem enviada por mim (ehMinhaMensagem), nao faz sentido, sender_name fica
        // nulo (igual o CRM ja faz quando o atendente manda pelo botao de enviar).
        let senderName = '';
        if (!ehMinhaMensagem) {
          senderName = (msg?.pushName || '').trim();
          if (!senderName && phone && evoHeaders && !phoneRaw.endsWith('@g.us')) {
            senderName = await buscarNomeContato(phone, evoHeaders);
          }
        }

        if (phone && text) {
          const midiaSalva = await baixarEGuardarMidia(msg, evoHeaders);
          await inserirMensagem({
            phone, text, senderName, direction: ehMinhaMensagem ? 'outgoing' : 'incoming', whatsappMessageId, createdAt,
            mediaUrl: midiaSalva?.mediaUrl, fileName: midiaSalva?.fileName, contentType: midiaSalva?.contentType,
          });
          // Busca de foto de perfil e so faz sentido pro CONTATO (nao pro meu proprio numero)
          if (!ehMinhaMensagem && evoHeaders) {
            garantirFotoLead(phone, evoHeaders); // nao usa await de proposito — nao atrasa a resposta do webhook
          }
          // Mensagem minha mandada fora do CRM (direto no celular) -- atualiza a previa da
          // conversa na lista, que senao so e atualizada quando o envio parte do proprio CRM.
          if (ehMinhaMensagem) {
            atualizarPreviaLeadOutgoing(phone, text); // sem await de proposito, mesmo motivo acima
          }
        }
      }
    }

    if (event === 'connection.update' || event === 'CONNECTION_UPDATE') {
      const status = body?.data?.state || body?.data?.status;
      if (status) await atualizarStatusConexao(status);
    }

    // Presenca (online / digitando / gravando audio / offline com "visto por ultimo").
    // Formato Baileys/Evolution: body.data = { id: remoteJid, presences: { [jid]: { lastKnownPresence, lastSeen } } }
    // — mas algumas versoes mandam { id, presence: { lastKnownPresence } } direto, sem o
    // objeto "presences" por participante. Trata os dois formatos.
    if (event === 'presence.update' || event === 'PRESENCE_UPDATE') {
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
        const lastSeenAt = ultima?.lastSeen ? new Date(Number(ultima.lastSeen) * 1000).toISOString() : (status === 'unavailable' ? new Date().toISOString() : undefined);
        if (phone) await atualizarPresenca(phone, status, lastSeenAt);
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro no webhook do WhatsApp:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}
