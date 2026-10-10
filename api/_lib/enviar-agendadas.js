// Envio SERVIDOR das mensagens agendadas do CRM (tabela crm_scheduled_messages).
// Chamado a cada minuto por um pg_cron do Supabase:
//   POST /api/ai?rota=enviar-agendadas   (header x-cron-secret: <segredo>)
//
// Antes o envio era feito pelo navegador (worker em ChatPanel), o que nao enviava nada com o
// navegador fechado e podia duplicar a mensagem com varios PCs abertos. Agora:
//  1. O RPC `reservar_agendadas` (Postgres) valida o segredo, marca como 'failed' as presas em
//     'sending' ha mais de 10 min e reserva ATOMICAMENTE (for update skip locked) as vencidas,
//     mudando 'scheduled' -> 'sending'. Duas chamadas simultaneas nunca pegam a mesma linha.
//  2. Cada reservada e enviada, em sequencia, via /api/whatsapp-send (que grava em crm_messages,
//     atualiza o lead e resolve grupos). A autorizacao dessa chamada interna e o mesmo
//     x-cron-secret (ver api/_lib/auth.js).
//  3. Resultado: 'sent' (com sent_at) ou 'failed' (com error_message). Se o tempo total (~8 s)
//     acabar antes de processar alguma, ela volta para 'scheduled' e sai no proximo minuto.
//
// Resposta: 200 { ok: true, enviadas, falhas, devolvidas }
//
// O segredo NUNCA e registrado em log.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './whatsapp-config.js';

const LIMITE_POR_EXECUCAO = 5;
const TEMPO_TOTAL_MS = 8000;

function headersSupabase(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

// Atualiza UMA linha. So mexe se ela ainda estiver em 'sending' (nao sobrescreve cancelamento/edicao
// que tenha acontecido nesse meio tempo). Tenta de novo uma vez se a gravacao falhar.
async function atualizarLinha(id, campos) {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/crm_scheduled_messages?id=eq.${encodeURIComponent(id)}&status=eq.sending`,
        {
          method: 'PATCH',
          headers: headersSupabase({ Prefer: 'return=minimal' }),
          body: JSON.stringify(campos),
          signal: AbortSignal.timeout(5000),
        }
      );
      if (r.ok) return true;
      console.error(`Agendadas: falha ao gravar status da mensagem ${id} (HTTP ${r.status}).`);
    } catch (err) {
      console.error(`Agendadas: erro ao gravar status da mensagem ${id}:`, err?.message || err);
    }
  }
  return false;
}

export async function handleEnviarAgendadas(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const segredo = String(req.headers['x-cron-secret'] || '').trim();
  if (!segredo) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  const inicio = Date.now();
  const restante = () => TEMPO_TOTAL_MS - (Date.now() - inicio);

  // 1) Reserva atomicamente as mensagens vencidas
  let reservadas = [];
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/reservar_agendadas`, {
      method: 'POST',
      headers: headersSupabase(),
      body: JSON.stringify({ p_segredo: segredo, p_limite: LIMITE_POR_EXECUCAO }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) {
      const corpo = await r.text().catch(() => '');
      if (corpo.includes('nao autorizado')) {
        res.status(401).json({ error: 'Não autorizado.' });
        return;
      }
      console.error(`Agendadas: erro ao reservar mensagens (HTTP ${r.status}):`, corpo.slice(0, 300));
      res.status(500).json({ error: 'Erro ao reservar mensagens agendadas.' });
      return;
    }
    const dados = await r.json();
    reservadas = Array.isArray(dados) ? dados : [];
  } catch (err) {
    console.error('Agendadas: exceção ao reservar mensagens:', err?.message || err);
    res.status(500).json({ error: 'Erro ao reservar mensagens agendadas.' });
    return;
  }

  // 2) Envia sequencialmente, respeitando o tempo total
  const base = String(process.env.APP_BASE_URL || `https://${req.headers.host}`).replace(/\/+$/, '');
  let enviadas = 0;
  let falhas = 0;
  let devolvidas = 0;

  for (const msg of reservadas) {
    const tempo = restante();
    if (tempo <= 0) {
      // Sem tempo: devolve pra fila, sem enviar
      if (await atualizarLinha(msg.id, { status: 'scheduled', updated_at: new Date().toISOString() })) devolvidas++;
      continue;
    }

    try {
      const resp = await fetch(`${base}/api/whatsapp-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': segredo },
        body: JSON.stringify({
          phone: msg.phone,
          text: msg.text,
          senderName: msg.created_by || 'Sistema',
          leadId: msg.lead_id || null,
        }),
        signal: AbortSignal.timeout(tempo),
      });

      if (resp.ok) {
        const agora = new Date().toISOString();
        await atualizarLinha(msg.id, { status: 'sent', sent_at: agora, updated_at: agora });
        enviadas++;
      } else {
        const erro = await resp.json().catch(() => ({}));
        await atualizarLinha(msg.id, {
          status: 'failed',
          error_message: erro?.error || 'Falha no envio',
          updated_at: new Date().toISOString(),
        });
        falhas++;
      }
    } catch (err) {
      // Inclui o estouro do tempo durante o envio: nao devolvemos pra fila porque o envio pode ter
      // chegado a sair -- melhor marcar como falha do que arriscar enviar duas vezes.
      const estouro = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      await atualizarLinha(msg.id, {
        status: 'failed',
        error_message: estouro
          ? 'Tempo esgotado aguardando o envio (confira se a mensagem chegou antes de reenviar)'
          : (err?.message || 'Falha no envio'),
        updated_at: new Date().toISOString(),
      });
      falhas++;
    }
  }

  res.status(200).json({ ok: true, enviadas, falhas, devolvidas });
}
