// Recebe telefone + texto do front-end (ChatPanel) e manda a Evolution API disparar a
// mensagem de verdade pro WhatsApp do cliente. O front nunca fala direto com a Evolution
// API (evita expor a API Key no navegador) — sempre passa por aqui.
//
// POST /api/whatsapp-send
// body: { phone: "5593999999999", text: "Mensagem..." }

import { EVOLUTION_API_URL, EVOLUTION_API_KEY, INSTANCE_NAME } from './_lib/whatsapp-config.js';
import { exigirUsuarioAutorizado } from './_lib/auth.js';
import { normalizarTelefoneBR } from './_lib/phone.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    res.status(500).json({ error: 'Evolution API não configurada — falta EVOLUTION_API_URL/EVOLUTION_API_KEY nas variáveis de ambiente da Vercel.' });
    return;
  }

  // So um usuario logado do CRM pode disparar mensagem usando a conta conectada —
  // sem essa checagem, qualquer pessoa que descobrisse essa URL conseguia mandar
  // mensagem em nome do numero conectado.
  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const { phone, text } = req.body || {};
  if (!phone || !text) {
    res.status(400).json({ error: 'Faltou telefone ou texto da mensagem.' });
    return;
  }

  // So numeros, sem formatacao (espaco, parenteses, traco) — a Evolution API exige o
  // numero "cru", com codigo do pais na frente (ex: 55 93 99999-9999 -> 5593999999999).
  // Normaliza igual o webhook ja faz pro numero recebido: adiciona o "55" e o nono
  // digito quando estiverem faltando -- sem isso a Evolution recusa o envio dizendo
  // que o numero "nao existe" quando na verdade so falta o codigo do pais.
  const numero = normalizarTelefoneBR(phone.replace(/\D/g, ''));

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

    // Pega o id da mensagem que a propria Evolution API devolveu no envio -- o front-end
    // salva esse id junto com a mensagem no crm_messages. Isso e o que permite ao webhook
    // (que recebe o "eco" de toda mensagem enviada, inclusive essa) reconhecer que essa
    // mensagem especifica ja foi gravada por aqui e nao duplicar quando o evento
    // messages.upsert com fromMe:true chegar (ver whatsapp-webhook.js).
    let idMensagem = null;
    try {
      const corpo = await r.json();
      idMensagem = corpo?.key?.id || corpo?.message?.key?.id || null;
    } catch (err) {
      // Corpo nao veio em JSON valido -- segue sem o id (webhook so nao vai conseguir
      // deduplicar essa mensagem em particular, sem prejuizo pro envio em si)
    }

    res.status(200).json({ ok: true, whatsappMessageId: idMensagem });
  } catch (err) {
    console.error('Erro ao enviar mensagem via Evolution API:', err);
    res.status(500).json({ error: 'Não foi possível enviar a mensagem. Confira se a Evolution API está no ar e o número está conectado.' });
  }
}
