// Apaga uma mensagem MINHA (enviada pelo CRM) para todos, igual ao "Apagar para todos" do
// WhatsApp. Chama a Evolution API (que manda o REVOKE de verdade pro WhatsApp) e, se der certo,
// marca a linha em crm_messages como apagada -- NUNCA apaga a linha (o texto original fica
// preservado no banco, so o chat passa a mostrar "Você apagou essa mensagem para todos").
//
// POST /api/whatsapp-delete-message
// body: { messageId: "<uuid da linha em crm_messages>" }

import { EVOLUTION_API_URL, INSTANCE_NAME, SUPABASE_URL, COMPANY_ID, evolutionHeaders, supabaseHeaders } from './_lib/whatsapp-config.js';
import { exigirUsuarioAutorizado } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!EVOLUTION_API_URL) {
    res.status(500).json({ error: 'Evolution API não configurada.' });
    return;
  }

  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const { messageId, senderName } = req.body || {};
  if (!messageId) {
    res.status(400).json({ error: 'Faltou o id da mensagem.' });
    return;
  }

  try {
    // Busca a linha pra pegar o whatsapp_message_id (necessario pra Evolution) e confirmar
    // que e uma mensagem MINHA (outgoing) — nao dá pra apagar mensagem do cliente pra ele.
    const buscaResp = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_messages?id=eq.${encodeURIComponent(messageId)}&company_id=eq.${COMPANY_ID}&select=id,phone,direction,whatsapp_message_id,deleted_at`,
      { headers: supabaseHeaders() }
    );
    const linhas = await buscaResp.json().catch(() => []);
    const msg = Array.isArray(linhas) ? linhas[0] : null;
    if (!msg) {
      res.status(404).json({ error: 'Mensagem não encontrada.' });
      return;
    }
    if (msg.direction !== 'outgoing') {
      res.status(403).json({ error: 'Só é possível apagar mensagens enviadas por você.' });
      return;
    }
    if (msg.deleted_at) {
      res.status(200).json({ ok: true, jaApagada: true });
      return;
    }
    if (!msg.whatsapp_message_id) {
      res.status(400).json({ error: 'Essa mensagem não tem id do WhatsApp (mensagem antiga demais) e não pode ser apagada para todos.' });
      return;
    }

    const remoteJid = `${msg.phone.replace(/\D/g, '')}@s.whatsapp.net`;
    const evoResp = await fetch(`${EVOLUTION_API_URL}/chat/deleteMessageForEveryone/${INSTANCE_NAME}`, {
      method: 'DELETE',
      headers: evolutionHeaders(),
      body: JSON.stringify({ id: msg.whatsapp_message_id, remoteJid, fromMe: true }),
    });
    if (!evoResp.ok) {
      const corpo = await evoResp.text().catch(() => '');
      console.error('Evolution API recusou apagar a mensagem:', evoResp.status, corpo);
      res.status(502).json({ error: 'A Evolution API recusou apagar essa mensagem.' });
      return;
    }

    const quemApagou = (typeof senderName === 'string' && senderName.trim()) ? senderName.trim() : 'Atendente';
    const patchResp = await fetch(`${SUPABASE_URL}/rest/v1/crm_messages?id=eq.${encodeURIComponent(messageId)}`, {
      method: 'PATCH',
      headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify({ deleted_at: new Date().toISOString(), deleted_by: quemApagou }),
    });
    if (!patchResp.ok) {
      console.error('Apagou no WhatsApp mas falhou ao marcar em crm_messages:', patchResp.status, await patchResp.text().catch(() => ''));
      res.status(502).json({ error: 'A mensagem foi apagada no WhatsApp, mas não deu pra atualizar aqui no CRM. Atualize a página.' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro ao apagar mensagem para todos:', err);
    res.status(500).json({ error: 'Não foi possível apagar a mensagem. Tente de novo.' });
  }
}
