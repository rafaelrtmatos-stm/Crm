// Ponte entre o front-end (IntegracoesModule.tsx) e a Evolution API — o front nunca fala
// direto com a Evolution API (evita expor a API Key dela no navegador). Esse endpoint:
//
//  GET  /api/whatsapp-connect          -> cria a instancia (se nao existir) e devolve o QR Code
//  GET  /api/whatsapp-connect?status=1 -> so consulta o status atual da conexao (usado no poll)
//
// Variaveis de ambiente necessarias (configurar em Vercel > Settings > Environment Variables):
//   EVOLUTION_API_URL  -> ex: https://sua-instancia.up.railway.app
//   EVOLUTION_API_KEY  -> chave de admin da sua Evolution API
//   EVOLUTION_WEBHOOK_SECRET -> mesmo segredo usado em api/whatsapp-webhook.js

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;
const INSTANCE_NAME = 'rafa-arts'; // nome fixo da instancia dentro da Evolution API

export default async function handler(req, res) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    res.status(500).json({ error: 'Evolution API não configurada — falta EVOLUTION_API_URL/EVOLUTION_API_KEY nas variáveis de ambiente da Vercel.' });
    return;
  }

  const headers = { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' };

  try {
    // --- Só consultar status (usado pelo poll do modal, depois de já ter mostrado o QR) ---
    if (req.query.status) {
      const r = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`, { headers });
      const data = await r.json();
      res.status(200).json({ status: data?.instance?.state || data?.state || 'unknown' });
      return;
    }

    // --- Fluxo normal: garante que a instancia existe, com o webhook configurado, e devolve o QR ---
    // 1) Tenta criar a instancia (se ja existir, a Evolution API devolve erro — ignora e segue)
    const siteUrl = `https://${req.headers.host}`;
    await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        instanceName: INSTANCE_NAME,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          url: `${siteUrl}/api/whatsapp-webhook`,
          headers: { 'x-webhook-secret': EVOLUTION_WEBHOOK_SECRET || '' },
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
        },
      }),
    }).catch(() => {}); // se ja existir, tudo bem, so segue pro passo 2

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
