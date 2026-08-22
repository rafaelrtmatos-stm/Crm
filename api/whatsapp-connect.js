// Ponte entre o front-end (IntegracoesModule.tsx) e a Evolution API — o front nunca fala
// direto com a Evolution API (evita expor a API Key dela no navegador). Esse endpoint:
//
//  GET    /api/whatsapp-connect          -> cria a instancia (se nao existir) e devolve o QR Code
//  GET    /api/whatsapp-connect?status=1 -> so consulta o status atual da conexao (usado no poll)
//  DELETE /api/whatsapp-connect          -> desconecta o numero (logout), mantendo a instancia pra reconectar depois
//
// Variaveis de ambiente necessarias (configurar em Vercel > Settings > Environment Variables):
//   EVOLUTION_API_URL  -> ex: https://sua-instancia.up.railway.app
//   EVOLUTION_API_KEY  -> chave de admin da sua Evolution API
//   EVOLUTION_WEBHOOK_SECRET -> mesmo segredo usado em api/whatsapp-webhook.js

import { EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_WEBHOOK_SECRET, INSTANCE_NAME, SUPABASE_URL, SUPABASE_ANON_KEY, evolutionHeaders } from './_lib/whatsapp-config.js';
import { exigirUsuarioAutorizado } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    res.status(500).json({ error: 'Evolution API não configurada — falta EVOLUTION_API_URL/EVOLUTION_API_KEY nas variáveis de ambiente da Vercel.' });
    return;
  }

  // So um usuario logado do CRM pode conectar/desconectar o WhatsApp ou ver a
  // configuracao do webhook — sem isso, qualquer pessoa que descobrisse essa URL
  // conseguia desconectar o numero ou espiar a config da instancia.
  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const headers = evolutionHeaders();

  try {
    // --- Desconectar o numero (logout) — a instancia continua existindo na Evolution API,
    // so "desloga" o WhatsApp dela, entao da pra conectar outro numero depois escaneando
    // um QR Code novo, sem precisar recriar nada ---
    if (req.method === 'DELETE') {
      const r = await fetch(`${EVOLUTION_API_URL}/instance/logout/${INSTANCE_NAME}`, { method: 'DELETE', headers });
      if (!r.ok) {
        const errBody = await r.text().catch(() => '');
        console.error('Evolution API recusou o logout:', errBody);
        res.status(502).json({ error: 'A Evolution API recusou desconectar o número.' });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    // --- Consultar status (usado pelo poll do modal) — TAMBEM salva no Supabase, servindo
    // como sincronizacao manual: se por algum motivo o webhook de CONNECTION_UPDATE nunca
    // chegou a salvar certo (ex: linha nao existia antes da correcao do upsert), consultar
    // o status aqui corrige sozinho, sem precisar desconectar/reconectar de novo ---
    if (req.query.status) {
      const r = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`, { headers });
      const data = await r.json();
      const estadoAtual = data?.instance?.state || data?.state || 'unknown';
      if (estadoAtual !== 'unknown') {
        await fetch(`${SUPABASE_URL}/rest/v1/robozinho_config?on_conflict=company_id`, {
          method: 'POST',
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({ company_id: 'rafa-arts', whatsapp_connection_status: estadoAtual, updated_at: new Date().toISOString() }),
        }).catch((err) => console.error('Falha ao sincronizar status no Supabase:', err));
      }
      res.status(200).json({ status: estadoAtual });
      return;
    }

    // --- Diagnostico: mostra a configuracao ATUAL do webhook salva na Evolution API, pra
    // conferir se esta apontando pro lugar certo (usar em /api/whatsapp-connect?webhookInfo=1) ---
    if (req.query.webhookInfo) {
      const r = await fetch(`${EVOLUTION_API_URL}/webhook/find/${INSTANCE_NAME}`, { headers });
      const data = await r.json();
      res.status(200).json({ webhookConfig: data });
      return;
    }

    // --- Fluxo normal: garante que a instancia existe, com o webhook configurado, e devolve o QR ---
    // 1) Tenta criar a instancia (se ja existir, a Evolution API devolve erro — ignora e segue)
    const siteUrl = `https://${req.headers.host}`;
    const webhookConfig = {
      url: `${siteUrl}/api/whatsapp-webhook`,
      headers: { 'x-webhook-secret': EVOLUTION_WEBHOOK_SECRET || '' },
      events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
    };
    await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        instanceName: INSTANCE_NAME,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: webhookConfig,
      }),
    }).catch(() => {}); // se ja existir, tudo bem, so segue pro passo 1.5

    // 1.5) Garante o webhook configurado MESMO se a instancia ja existia de antes (o passo 1
    // acima so configura o webhook na CRIACAO — se a instancia foi criada antes dessa
    // configuracao existir, ou criada manualmente sem webhook, ela ficava "muda" pro CRM,
    // recebendo mensagem normal mas nunca avisando a gente). Roda sempre, sem depender do
    // resultado do passo 1.
    await fetch(`${EVOLUTION_API_URL}/webhook/set/${INSTANCE_NAME}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ webhook: { ...webhookConfig, enabled: true } }),
    }).catch((err) => console.error('Falha ao configurar webhook (instancia pode ja ter, ou API antiga):', err));

    // 2) Busca o QR Code atual da instancia
    const qrRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${INSTANCE_NAME}`, { headers });
    const qrData = await qrRes.json();

    // A Evolution API costuma devolver o QR em base64 (as vezes ja com o prefixo data:image, as
    // vezes so o base64 puro, dependendo da versao) — normaliza os dois formatos aqui
    const qrRaw = qrData?.base64 || qrData?.qrcode?.base64 || null;
    const qrBase64 = qrRaw && !qrRaw.startsWith('data:') ? `data:image/png;base64,${qrRaw}` : qrRaw;

    res.status(200).json({ qrCode: qrBase64, status: qrData?.instance?.state || 'connecting' });
  } catch (err) {
    console.error('Erro ao conectar com a Evolution API:', err);
    res.status(500).json({ error: 'Não foi possível conectar com a Evolution API. Confira se ela está no ar.' });
  }
}
