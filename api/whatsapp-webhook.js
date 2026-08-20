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

const SUPABASE_URL = 'https://areqouezrbdubfutjzki.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YbzFXDHWQy-k0F9uNtVJ2g_urcsgmVt';
const COMPANY_ID = 'rafa-arts';
const INSTANCE_NAME = 'rafa-arts';
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

// Segredo compartilhado com a Evolution API — configura o MESMO valor nos dois lados
// (aqui via variavel de ambiente da Vercel, e na Evolution API como header customizado
// no webhook). Protege pra ninguem conseguir inserir mensagem falsa mandando um POST
// direto pra essa URL sem saber o segredo.
const WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;

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

async function inserirMensagem({ phone, text, senderName, direction = 'incoming', channel = 'WhatsApp', whatsappMessageId, createdAt }) {
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
        // Ignora mensagens que o proprio numero conectado enviou (fromMe) — essas ja
        // sao gravadas direto pelo CRM quando o atendente manda (ver handleSendMessage
        // em ChatPanel), gravar de novo aqui duplicaria
        if (msg?.key?.fromMe) continue;

        // Reacoes (👍, ❤️ etc.) chegam como um MESSAGES_UPSERT proprio, sem conteudo de
        // texto real — nao sao mensagem nova, entao nao devem virar linha no chat.
        if (msg?.message?.reactionMessage) continue;

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
        const phone = phoneRaw.replace('@s.whatsapp.net', '').replace('@g.us', '').replace('@lid', '').replace(/\D/g, '');
        const text = extrairTextoMensagem(msg?.message);
        const whatsappMessageId = msg?.key?.id || null;
        const createdAt = msg?.messageTimestamp ? new Date(Number(msg.messageTimestamp) * 1000).toISOString() : undefined;

        // Nome real do contato e OBRIGATORIO: pushName do proprio evento primeiro
        // (mais rapido e cobre 99% dos casos); se vier vazio, busca na agenda/contatos
        // da Evolution API antes de gravar a mensagem — nunca grava com nome generico.
        let senderName = (msg?.pushName || '').trim();
        if (!senderName && phone && evoHeaders && !phoneRaw.endsWith('@g.us')) {
          senderName = await buscarNomeContato(phone, evoHeaders);
        }

        if (phone && text) {
          await inserirMensagem({ phone, text, senderName, direction: 'incoming', whatsappMessageId, createdAt });
          if (evoHeaders) {
            garantirFotoLead(phone, evoHeaders); // nao usa await de proposito — nao atrasa a resposta do webhook
          }
        }
      }
    }

    if (event === 'connection.update' || event === 'CONNECTION_UPDATE') {
      const status = body?.data?.state || body?.data?.status;
      if (status) await atualizarStatusConexao(status);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro no webhook do WhatsApp:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}
