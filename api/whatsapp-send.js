// Recebe telefone + texto do front-end (ChatPanel) e manda a Evolution API disparar a
// mensagem de verdade pro WhatsApp do cliente. O front nunca fala direto com a Evolution
// API (evita expor a API Key no navegador) — sempre passa por aqui.
//
// POST /api/whatsapp-send
// body: { phone: "5593999999999", text: "Mensagem..." }

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = 'rafa-arts';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    res.status(500).json({ error: 'Evolution API não configurada — falta EVOLUTION_API_URL/EVOLUTION_API_KEY nas variáveis de ambiente da Vercel.' });
    return;
  }

  const { phone, text } = req.body || {};
  if (!phone || !text) {
    res.status(400).json({ error: 'Faltou telefone ou texto da mensagem.' });
    return;
  }

  // So numeros, sem formatacao (espaco, parenteses, traco) — a Evolution API exige o
  // numero "cru", com codigo do pais na frente (ex: 55 93 99999-9999 -> 5593999999999)
  const numero = phone.replace(/\D/g, '');

  try {
    const r = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: numero,
        text,
      }),
    });

    if (!r.ok) {
      const errBody = await r.text();
      console.error('Evolution API recusou o envio:', errBody);
      res.status(502).json({ error: 'A Evolution API recusou o envio dessa mensagem.' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro ao enviar mensagem via Evolution API:', err);
    res.status(500).json({ error: 'Não foi possível enviar a mensagem. Confira se a Evolution API está no ar e o número está conectado.' });
  }
}
