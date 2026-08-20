// Importa o historico de mensagens do WhatsApp (via Evolution API) pro Supabase, em LOTES —
// um chat por vez — pra nunca estourar o tempo limite de uma funcao serverless, mesmo com
// milhares de mensagens no total.
//
// Fluxo (chamado repetidamente pelo front-end, em loop, ate "concluido: true"):
//   POST /api/whatsapp-import-history  { cursor: 0 }
//   -> processa o chat de indice 0, devolve { processado: {...}, proximoCursor: 1, total: 902, concluido: false }
//   POST /api/whatsapp-import-history  { cursor: 1 }
//   -> processa o chat de indice 1, e assim por diante, ate cursor >= total

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = 'rafa-arts';
const SUPABASE_URL = 'https://areqouezrbdubfutjzki.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YbzFXDHWQy-k0F9uNtVJ2g_urcsgmVt';
const COMPANY_ID = 'rafa-arts';

const supaHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function buscarListaDeChats(headers) {
  const r = await fetch(`${EVOLUTION_API_URL}/chat/findChats/${INSTANCE_NAME}`, { method: 'POST', headers, body: JSON.stringify({}) });
  if (!r.ok) throw new Error('Falha ao buscar lista de conversas na Evolution API.');
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

// `chat/findChats` quase nunca vem com o nome do perfil preenchido (o campo pushName/name
// do chat em si costuma vir vazio) — o nome real do contato no WhatsApp so e confiavel
// vindo de `chat/findContacts`. Por isso a importacao caia sempre no nome generico: ela
// olhava so pro campo do chat, que normalmente esta vazio.
async function buscarMapaDeContatos(headers) {
  try {
    const r = await fetch(`${EVOLUTION_API_URL}/chat/findContacts/${INSTANCE_NAME}`, { method: 'POST', headers, body: JSON.stringify({}) });
    if (!r.ok) return {};
    const data = await r.json();
    const lista = Array.isArray(data) ? data : (data?.contacts || []);
    const mapa = {};
    for (const c of lista) {
      const jid = c?.remoteJid || c?.id;
      const nome = (c?.pushName || c?.name || c?.notify || '').trim();
      if (jid && nome) mapa[jid] = nome;
    }
    return mapa;
  } catch (err) {
    console.error('Falha ao buscar lista de contatos da Evolution API (segue so com o nome do chat):', err);
    return {};
  }
}

async function buscarMensagensDoChat(headers, remoteJid) {
  const r = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${INSTANCE_NAME}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ where: { key: { remoteJid } }, limit: 1000 }),
  });
  if (!r.ok) return [];
  const data = await r.json();
  // A Evolution API costuma devolver { messages: { records: [...] } } ou uma lista direta,
  // dependendo da versao — trata os dois formatos
  return data?.messages?.records || (Array.isArray(data) ? data : []);
}

async function garantirLead(phone, nome, evoHeaders) {
  // So cria o lead se ainda nao existir — nunca sobrescreve nome/etapa de um lead que ja
  // existe (podia ter sido corrigido manualmente ou ja estar em outra etapa do funil)
  const buscaR = await fetch(`${SUPABASE_URL}/rest/v1/leads?company_id=eq.${COMPANY_ID}&phone=eq.${phone}&select=id`, { headers: supaHeaders });
  const existentes = await buscaR.json();
  if (Array.isArray(existentes) && existentes.length > 0) return;

  // Busca a foto de perfil do contato — ja aproveita e traz junto com a criacao do lead
  let fotoUrl = null;
  try {
    const picRes = await fetch(`${EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: evoHeaders,
      body: JSON.stringify({ number: phone }),
    });
    if (picRes.ok) {
      const picData = await picRes.json();
      fotoUrl = picData?.profilePictureUrl || picData?.url || null;
    }
  } catch (err) {
    console.error('Falha ao buscar foto do contato durante importação (nao impede o resto):', err);
  }

  // Acha o funil padrao e a etapa inicial, igual a automacao de mensagem nova ja faz
  let funnelId = null, stageId = null;
  const fR = await fetch(`${SUPABASE_URL}/rest/v1/funnels?company_id=eq.${COMPANY_ID}&is_default=eq.true&select=id&limit=1`, { headers: supaHeaders });
  let funnels = await fR.json();
  if (!Array.isArray(funnels) || funnels.length === 0) {
    const fR2 = await fetch(`${SUPABASE_URL}/rest/v1/funnels?company_id=eq.${COMPANY_ID}&select=id&limit=1`, { headers: supaHeaders });
    funnels = await fR2.json();
  }
  if (Array.isArray(funnels) && funnels.length > 0) {
    funnelId = funnels[0].id;
    const sR = await fetch(`${SUPABASE_URL}/rest/v1/funnel_stages?funnel_id=eq.${funnelId}&is_initial=eq.true&select=id&limit=1`, { headers: supaHeaders });
    let stages = await sR.json();
    if (!Array.isArray(stages) || stages.length === 0) {
      const sR2 = await fetch(`${SUPABASE_URL}/rest/v1/funnel_stages?funnel_id=eq.${funnelId}&select=id&order=order.asc&limit=1`, { headers: supaHeaders });
      stages = await sR2.json();
    }
    if (Array.isArray(stages) && stages.length > 0) stageId = stages[0].id;
  }

  await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: supaHeaders,
    body: JSON.stringify({
      company_id: COMPANY_ID,
      funnel_id: funnelId,
      funnel_stage_id: stageId,
      // So cai no nome generico se REALMENTE nao achou nada (nem no findContacts, nem
      // no findChats) — usa o telefone formatado em vez de um texto igual pra todo mundo,
      // assim da pra pelo menos identificar qual contato eh qual na lista de leads.
      full_name: nome || `+${phone}`,
      whatsapp_name: nome || '',
      phone,
      photo_url: fotoUrl,
      source_type: 'WhatsApp',
      status: 'ENTRADA',
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    res.status(500).json({ error: 'Evolution API não configurada.' });
    return;
  }

  const evoHeaders = { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' };
  const cursor = Number(req.body?.cursor) || 0;

  try {
    // A lista de chats e o mapa de contatos sao buscados sempre (rapido, um retorno cada) —
    // so as MENSAGENS de cada chat que sao processadas aos poucos, um chat por chamada
    const [chats, mapaContatos] = await Promise.all([
      buscarListaDeChats(evoHeaders),
      buscarMapaDeContatos(evoHeaders),
    ]);
    const total = chats.length;

    if (cursor >= total) {
      res.status(200).json({ concluido: true, total, proximoCursor: total });
      return;
    }

    const chat = chats[cursor];
    const remoteJid = chat?.remoteJid || chat?.id || '';
    // Prioridade: nome real vindo de findContacts (mais confiavel) > pushName/name/notify
    // que o proprio chat trouxer > vazio (so ai vira fallback de telefone la no garantirLead)
    const nomeContato = mapaContatos[remoteJid] || chat?.pushName || chat?.name || chat?.notify || '';

    let mensagensImportadas = 0;

    // So processa conversa individual (ignora grupo por enquanto — grupo ja tem o
    // sistema de liberacao a parte, feito so pra mensagem NOVA chegando pelo webhook)
    if (remoteJid && remoteJid.endsWith('@s.whatsapp.net')) {
      const phone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
      if (phone) {
        await garantirLead(phone, nomeContato, evoHeaders);

        const mensagens = await buscarMensagensDoChat(evoHeaders, remoteJid);
        for (const msg of mensagens) {
          const texto =
            msg?.message?.conversation ||
            msg?.message?.extendedTextMessage?.text ||
            msg?.message?.imageMessage?.caption ||
            '';
          if (!texto) continue;

          const whatsappMessageId = msg?.key?.id || null;
          const direction = msg?.key?.fromMe ? 'outgoing' : 'incoming';
          const timestampMsg = msg?.messageTimestamp ? new Date(Number(msg.messageTimestamp) * 1000).toISOString() : new Date().toISOString();

          const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/crm_messages`, {
            method: 'POST',
            headers: { ...supaHeaders, Prefer: 'resolution=ignore-duplicates' },
            body: JSON.stringify({
              company_id: COMPANY_ID,
              phone,
              text: texto,
              direction,
              sender_name: direction === 'outgoing' ? null : nomeContato,
              channel: 'WhatsApp',
              whatsapp_message_id: whatsappMessageId,
              created_at: timestampMsg,
            }),
          });
          if (insertRes.ok) mensagensImportadas++;
        }
      }
    }

    res.status(200).json({
      concluido: false,
      total,
      proximoCursor: cursor + 1,
      processado: { chat: nomeContato || remoteJid, mensagens: mensagensImportadas },
    });
  } catch (err) {
    console.error('Erro ao importar histórico do WhatsApp:', err);
    res.status(500).json({ error: err.message || 'Erro interno ao importar histórico.' });
  }
}
