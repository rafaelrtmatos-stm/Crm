// Recebe telefone + texto do front-end (ChatPanel) e manda a Evolution API disparar a
// mensagem de verdade pro WhatsApp do cliente. O front nunca fala direto com a Evolution
// API (evita expor a API Key no navegador) — sempre passa por aqui.
//
// POST /api/whatsapp-send
// body: { phone: "5593999999999", text: "Mensagem..." }

import { EVOLUTION_API_URL, EVOLUTION_API_KEY, INSTANCE_NAME, SUPABASE_URL, SUPABASE_ANON_KEY, COMPANY_ID } from './_lib/whatsapp-config.js';
import { exigirUsuarioAutorizado } from './_lib/auth.js';
import { normalizarTelefoneBR } from './_lib/phone.js';
import { timestampParaIso } from './_lib/timestamp.js';

// Depois que o WhatsApp CONFIRMA o envio: a conversa passa a ter essa mensagem como ultima
// (leads.last_message_at/direction/text), sobe pro topo da aba Mensagens e sai do estado de
// "aguardando resposta". NAO cria notificacao (notificacao e so de mensagem do cliente).
// Se o envio falhar, esta funcao nem e chamada -- last_message_at nao muda. Falha aqui nunca
// derruba a resposta: a mensagem ja foi enviada de verdade.
//  - `quando` = horario REAL da mensagem (messageTimestamp devolvido pela Evolution API; se nao vier,
//    o instante da confirmacao do envio) -- nunca o de processamento posterior.
//  - So avanca: se o lead ja tem uma ultima mensagem mais nova, nao volta no tempo.
async function atualizarLeadMensagemEnviada(telefones, text, quando) {
  const filtroMaisNova = encodeURIComponent(`(last_message_at.is.null,last_message_at.lt.${quando})`);
  for (const tel of telefones) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/leads?company_id=eq.${COMPANY_ID}&phone=eq.${encodeURIComponent(tel)}&or=${filtroMaisNova}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          last_message_at: quando,
          last_message_direction: 'outgoing',
          last_message_text: text,
          waiting_since: null,
        }),
      });
      if (!r.ok) {
        const corpo = await r.text().catch(() => '');
        console.error('Falha ao atualizar a ultima mensagem do lead apos o envio (rodou add_last_message_at_to_leads.sql?):', r.status, corpo);
      }
    } catch (err) {
      console.error('Falha ao atualizar a ultima mensagem do lead apos o envio (nao impede o resto):', err);
    }
  }
}

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
    let horarioMensagem;
    try {
      const corpo = await r.json();
      idMensagem = corpo?.key?.id || corpo?.message?.key?.id || null;
      horarioMensagem = timestampParaIso(corpo?.messageTimestamp ?? corpo?.message?.messageTimestamp);
    } catch (err) {
      // Corpo nao veio em JSON valido -- segue sem o id (webhook so nao vai conseguir
      // deduplicar essa mensagem em particular, sem prejuizo pro envio em si)
    }

    // Envio confirmado pela Evolution API. O lead pode estar salvo com o telefone como o front
    // mandou (`phone`) ou normalizado (`numero`) -- atualiza os dois, sem repetir se forem iguais.
    // Com await: no serverless, o que ficar pendente depois da resposta pode ser cortado.
    await atualizarLeadMensagemEnviada(Array.from(new Set([phone, numero])), text, horarioMensagem || new Date().toISOString());

    res.status(200).json({ ok: true, whatsappMessageId: idMensagem });
  } catch (err) {
    console.error('Erro ao enviar mensagem via Evolution API:', err);
    res.status(500).json({ error: 'Não foi possível enviar a mensagem. Confira se a Evolution API está no ar e o número está conectado.' });
  }
}
