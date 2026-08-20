// Assina a presenca de um contato do WhatsApp (online / digitando / gravando / visto por
// ultimo). Sem essa assinatura a Evolution/Baileys NAO manda o evento PRESENCE_UPDATE no
// webhook pra esse chat — por isso e' chamado toda vez que o ChatPanel abre uma conversa
// (ver src/components/Modules.tsx, useEffect que carrega as mensagens).
//
// POST /api/whatsapp-presence-subscribe
// body: { phone: "5593999999999" }

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = 'rafa-arts';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    res.status(200).json({ ok: false, ignorado: 'Evolution API não configurada.' });
    return;
  }

  const { phone } = req.body || {};
  const numero = (phone || '').replace(/\D/g, '');
  if (!numero) {
    res.status(400).json({ error: 'Faltou o telefone.' });
    return;
  }

  const evoHeaders = { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' };

  // A rota exata varia entre versoes da Evolution API — tenta a mais comum
  // primeiro (chat/subscribePresence) e cai pra uma alternativa (chat/presence)
  // se a primeira nao existir. Falha aqui NUNCA deve travar a conversa: so
  // significa que os indicadores de presenca ficam indisponiveis pra esse chat.
  const tentativas = [
    { url: `${EVOLUTION_API_URL}/chat/subscribePresence/${INSTANCE_NAME}`, body: { number: numero } },
    { url: `${EVOLUTION_API_URL}/chat/presence/${INSTANCE_NAME}`, body: { number: numero, presence: 'subscribe' } },
  ];

  for (const tentativa of tentativas) {
    try {
      const r = await fetch(tentativa.url, { method: 'POST', headers: evoHeaders, body: JSON.stringify(tentativa.body) });
      if (r.ok) {
        res.status(200).json({ ok: true });
        return;
      }
    } catch (err) {
      console.error('Falha ao assinar presença (tentando próxima rota):', err);
    }
  }

  // Nenhuma rota funcionou — nao trava o resto do chat, so avisa no log
  console.error('Não foi possível assinar presença para', numero, '— nenhuma rota da Evolution API respondeu OK.');
  res.status(200).json({ ok: false });
}
