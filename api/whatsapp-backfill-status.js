// Preenche os tiques (crm_messages.delivery_status) das mensagens ANTIGAS de UMA conversa: o webhook
// MESSAGES_UPDATE so cobre o que acontece depois de ligado, entao o que foi enviado antes ficava sem tique.
// Aqui a gente pergunta a Evolution API (chat/findMessages) o status atual de cada mensagem enviada por nos
// e grava so o que ainda nao tem status (ou subiu de nivel: sent -> delivered -> read).
//
// POST /api/whatsapp-backfill-status
// headers: x-user-id: <id do usuario logado>
// body: { phone: "5592999999999" }
// resposta: { ok: true, atualizadas: <n> }
import { EVOLUTION_API_URL, EVOLUTION_API_KEY, INSTANCE_NAME, SUPABASE_URL, SUPABASE_ANON_KEY, COMPANY_ID } from './_lib/whatsapp-config.js';
import { exigirUsuarioAutorizado } from './_lib/auth.js';
import { normalizarStatusEntrega, statusMaisAvancado, statusesSubstituiveis } from './_lib/wa-status.js';
import { resolverRemoteJid, jidsAlternativos, buscarMensagensDoChat } from './whatsapp-messages.js';

const supaHeaders = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };

async function gravarStatus(ids, status) {
  if (ids.length === 0) return 0;
  const permitidos = statusesSubstituiveis(status);
  const condicoes = ['delivery_status.is.null', ...permitidos.map((p) => `delivery_status.eq.${p}`)].join(',');
  const lista = ids.map((id) => `"${String(id).replace(/"/g, '')}"`).join(',');
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/crm_messages?company_id=eq.${COMPANY_ID}&whatsapp_message_id=in.(${encodeURIComponent(lista)})&or=${encodeURIComponent(`(${condicoes})`)}&select=id`,
    { method: 'PATCH', headers: { ...supaHeaders, Prefer: 'return=representation' }, body: JSON.stringify({ delivery_status: status }) }
  );
  if (!r.ok) {
    console.error('[CRM] backfill de tiques: falha ao gravar', status, r.status, await r.text().catch(() => ''));
    return 0;
  }
  const linhas = await r.json().catch(() => []);
  return Array.isArray(linhas) ? linhas.length : 0;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) { res.status(500).json({ error: 'Evolution API não configurada.' }); return; }
  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const numero = String(req.body?.phone || '').replace(/\D/g, '');
  if (!numero) { res.status(400).json({ error: 'Faltou o telefone.' }); return; }

  try {
    const { remoteJid, ehGrupo } = await resolverRemoteJid(numero);
    const evoHeaders = { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' };
    let registros = await buscarMensagensDoChat(evoHeaders, remoteJid);
    if (registros.length === 0) {
      for (const jidAlt of jidsAlternativos(numero, ehGrupo)) {
        registros = await buscarMensagensDoChat(evoHeaders, jidAlt).catch(() => []);
        if (registros.length > 0) break;
      }
    }

    const porStatus = { sent: [], delivered: [], read: [] };
    for (const msg of registros) {
      if (!msg?.key?.fromMe || !msg?.key?.id) continue;
      const status = statusMaisAvancado([msg?.status, msg?.update?.status, ...(Array.isArray(msg?.MessageUpdate) ? msg.MessageUpdate.map((u) => u?.status) : [])]);
      if (status && normalizarStatusEntrega(status)) porStatus[status].push(msg.key.id);
    }

    // Do mais alto pro mais baixo: uma mensagem nunca e gravada duas vezes (cada id so entra num nivel).
    let atualizadas = 0;
    for (const nivel of ['read', 'delivered', 'sent']) atualizadas += await gravarStatus(porStatus[nivel], nivel);
    res.status(200).json({ ok: true, atualizadas });
  } catch (err) {
    console.error('Falha no backfill de tiques:', err);
    res.status(500).json({ error: 'Erro ao buscar o status das mensagens.' });
  }
}
