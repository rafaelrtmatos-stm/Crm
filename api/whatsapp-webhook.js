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

// Segredo compartilhado com a Evolution API — configura o MESMO valor nos dois lados.
// IMPORTANTE: nem toda versao/fork da Evolution API repassa "headers" customizados
// configurados no webhook (o campo existe em algumas builds, mas nao e garantido em
// todas). Por isso api/whatsapp-connect.js agora manda o segredo tambem via querystring
// na propria URL do webhook (?secret=...), que funciona em QUALQUER versao. Aqui a gente
// aceita os dois formatos: header (se a versao da Evolution API suportar) OU querystring
// (sempre funciona) — validando qualquer um dos dois que vier.
const WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;

async function inserirMensagem({ phone, text, senderName, direction = 'incoming', channel = 'WhatsApp', senderPhone = null }) {
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
      sender_phone: senderPhone || null,
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

  // Validacao do segredo — aceita tanto o header customizado (x-webhook-secret) quanto o
  // querystring (?secret=...) da propria URL do webhook. A Evolution API sempre respeita a
  // URL exata que foi configurada (isso nao depende de nenhuma feature opcional dela),
  // entao o querystring e o metodo garantido; o header fica como bonus se a versao suportar.
  if (WEBHOOK_SECRET) {
    const recebidoHeader = req.headers['x-webhook-secret'];
    const recebidoQuery = req.query?.secret;
    if (recebidoHeader !== WEBHOOK_SECRET && recebidoQuery !== WEBHOOK_SECRET) {
      console.warn('Webhook rejeitado: segredo ausente ou invalido (nem header nem querystring bateram).');
      res.status(401).json({ error: 'Assinatura invalida' });
      return;
    }
  }

  try {
    // Analisa o corpo com seguranca — normalmente a Vercel ja parseia JSON sozinha, mas se
    // a Evolution API mandar sem "Content-Type: application/json" (varia por versao), o
    // corpo chega como string ou Buffer cru em vez de objeto ja parseado.
    let body = req.body;
    if (Buffer.isBuffer(body)) body = body.toString('utf-8');
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const event = body.event;
    // Log leve de toda chamada recebida — essencial pra depurar direto nos logs da Vercel
    // se o webhook esta sendo chamado (e com qual evento) ou nem esta chegando.
    console.log('[whatsapp-webhook] evento recebido:', event, '| instance:', body.instance || '?');

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
        // Texto da mensagem — cobre os tipos mais comuns de conteudo. Mensagens de midia
        // SEM legenda (audio, figurinha, imagem/video/documento sem texto junto) antes
        // caiam fora silenciosamente aqui (texto vazio => "if (phone && text)" mais embaixo
        // descartava a mensagem inteira) — agora usa um rotulo generico pra pelo menos
        // avisar que chegou algo, em vez de sumir sem deixar rastro no CRM.
        const text =
          msg?.message?.conversation ||
          msg?.message?.extendedTextMessage?.text ||
          msg?.message?.imageMessage?.caption ||
          msg?.message?.videoMessage?.caption ||
          msg?.message?.documentMessage?.caption ||
          msg?.message?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
          (msg?.message?.audioMessage ? '[áudio]' : '') ||
          (msg?.message?.stickerMessage ? '[figurinha]' : '') ||
          (msg?.message?.imageMessage ? '[imagem]' : '') ||
          (msg?.message?.videoMessage ? '[vídeo]' : '') ||
          (msg?.message?.documentMessage ? '[documento]' : '') ||
          (msg?.message?.locationMessage ? '[localização]' : '') ||
          (msg?.message?.contactMessage ? '[contato]' : '') ||
          '';
        const senderName = msg?.pushName || '';

        // Em mensagem de GRUPO, msg.key.participant traz o JID de quem realmente mandou
        // (msg.key.remoteJid é o grupo, não a pessoa) — guarda o telefone dela separado,
        // pra dar pra abrir a conversa individual desse participante depois (ver
        // WhatsAppGroupsModule/GroupChatModal, "conversar direto com ele")
        const senderPhone = phoneRaw.endsWith('@g.us') && msg?.key?.participant
          ? msg.key.participant.replace('@s.whatsapp.net', '').replace(/\D/g, '')
          : null;

        if (phone && text) {
          await inserirMensagem({ phone, text, senderName, direction: 'incoming', senderPhone });
        }
      }
    }

    if (event === 'connection.update' || event === 'CONNECTION_UPDATE') {
      const status = body?.data?.state || body?.data?.status;
      if (status) await atualizarStatusConexao(status);
    }

    if (!event) {
      // Corpo chegou sem campo "event" — normalmente sinal de que o payload nao e da
      // Evolution API (ex: alguem testando a URL na mao) ou de uma mudanca de formato numa
      // atualizacao de versao dela. Loga o corpo bruto pra facilitar o diagnostico.
      console.warn('[whatsapp-webhook] corpo sem campo "event":', JSON.stringify(body).slice(0, 500));
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro no webhook do WhatsApp:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
}
