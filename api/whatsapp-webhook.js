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

async function inserirMensagem({ phone, text, senderName, direction = 'incoming', channel = 'WhatsApp' }) {
  if (!phone || !text) return;
  await fetch(`${SUPABASE_URL}/rest/v1/crm_messages`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      company_id: 'rafa-arts',
      phone,
      text,
      direction,
      sender_name: senderName || null,
      channel,
    }),
  });
}

async function garantirGrupoExiste(groupJid, nomeGrupo) {
  // Verifica se o grupo ja esta cadastrado. Se nao estiver, cria com visivel=false
  // (fica represado ate o admin liberar na tela de gestao de grupos)
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/whatsapp_groups?company_id=eq.rafa-arts&group_jid=eq.${encodeURIComponent(groupJid)}&select=id,visivel`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  const existentes = await r.json();

  if (Array.isArray(existentes) && existentes.length > 0) {
    return existentes[0]; // { id, visivel }
  }

  // Grupo novo — cria represado (visivel=false), nao mostra pra ninguem ate o admin liberar
  const createRes = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_groups`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ company_id: 'rafa-arts', group_jid: groupJid, nome: nomeGrupo || null, visivel: false }),
  });
  const criado = await createRes.json();
  return Array.isArray(criado) ? criado[0] : { visivel: false };
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

    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      // Formato padrao da Evolution API: body.data pode ser um objeto unico ou uma lista,
      // dependendo da versao — trata os dois casos
      const mensagens = Array.isArray(body.data) ? body.data : [body.data].filter(Boolean);

      for (const msg of mensagens) {
        // Ignora mensagens que o proprio numero conectado enviou (fromMe) — essas ja
        // sao gravadas direto pelo CRM quando o atendente manda (ver handleSendMessage
        // em ChatPanel), gravar de novo aqui duplicaria
        if (msg?.key?.fromMe) continue;

        const phoneRaw = msg?.key?.remoteJid || '';

        // Mensagem de grupo (remoteJid termina em @g.us): verifica se o grupo esta
        // liberado pelo admin antes de gravar. Grupo novo entra represado (visivel=false)
        // e a mensagem eh descartada ate alguem liberar.
        if (phoneRaw.endsWith('@g.us')) {
          const grupo = await garantirGrupoExiste(phoneRaw, null);
          if (!grupo?.visivel) continue; // grupo ainda nao liberado pelo admin, ignora a mensagem
        }

        const phone = phoneRaw.replace('@s.whatsapp.net', '').replace('@g.us', '').replace(/\D/g, '');
        const text =
          msg?.message?.conversation ||
          msg?.message?.extendedTextMessage?.text ||
          msg?.message?.imageMessage?.caption ||
          '';
        const senderName = msg?.pushName || '';

        if (phone && text) {
          await inserirMensagem({ phone, text, senderName, direction: 'incoming' });
          if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
            const evoHeaders = { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' };
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
