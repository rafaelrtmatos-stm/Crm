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

async function atualizarStatusConexao(status) {
  // Guarda o status da conexao (connecting | open | close) pro IntegracoesModule.tsx
  // conseguir ler e mostrar "Conectado"/"Desconectado" sem precisar perguntar direto
  // pra Evolution API toda hora
  await fetch(`${SUPABASE_URL}/rest/v1/robozinho_config?company_id=eq.rafa-arts`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ whatsapp_connection_status: status, updated_at: new Date().toISOString() }),
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
        const phone = phoneRaw.replace('@s.whatsapp.net', '').replace(/\D/g, '');
        const text =
          msg?.message?.conversation ||
          msg?.message?.extendedTextMessage?.text ||
          msg?.message?.imageMessage?.caption ||
          '';
        const senderName = msg?.pushName || '';

        if (phone && text) {
          await inserirMensagem({ phone, text, senderName, direction: 'incoming' });
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
