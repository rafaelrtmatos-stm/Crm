// Edita uma mensagem MINHA (enviada pelo CRM), igual ao "Editar" do WhatsApp. Chama a Evolution
// API (que manda a edição de verdade pro WhatsApp do cliente) e, se der certo, guarda o texto
// antigo em crm_messages.versions (historico) e atualiza o texto atual + last_edited_at/
// last_edited_by -- o mesmo mecanismo ja usado pras notas internas, agora tambem pra mensagens
// reais.
//
// POST /api/whatsapp-edit-message
// body: { messageId: "<uuid da linha em crm_messages>", novoTexto: "...", senderName? }

import { EVOLUTION_API_URL, INSTANCE_NAME, SUPABASE_URL, COMPANY_ID, evolutionHeaders, supabaseHeaders } from './_lib/whatsapp-config.js';
import { exigirUsuarioAutorizado } from './_lib/auth.js';
import { normalizarTelefoneBR } from './_lib/phone.js';

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

  const { messageId, novoTexto, senderName } = req.body || {};
  const textoNovo = (typeof novoTexto === 'string' ? novoTexto : '').trim();
  if (!messageId || !textoNovo) {
    res.status(400).json({ error: 'Faltou o id da mensagem ou o novo texto.' });
    return;
  }

  try {
    const buscaResp = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_messages?id=eq.${encodeURIComponent(messageId)}&company_id=eq.${COMPANY_ID}&select=id,phone,text,direction,whatsapp_message_id,deleted_at,versions,current_version_index`,
      { headers: supabaseHeaders() }
    );
    const linhas = await buscaResp.json().catch(() => []);
    const msg = Array.isArray(linhas) ? linhas[0] : null;
    if (!msg) {
      res.status(404).json({ error: 'Mensagem não encontrada.' });
      return;
    }
    if (msg.direction !== 'outgoing') {
      res.status(403).json({ error: 'Só é possível editar mensagens enviadas por você.' });
      return;
    }
    if (msg.deleted_at) {
      res.status(400).json({ error: 'Essa mensagem foi apagada e não pode ser editada.' });
      return;
    }
    if (!msg.whatsapp_message_id) {
      res.status(400).json({ error: 'Essa mensagem não tem id do WhatsApp (mensagem antiga demais) e não pode ser editada.' });
      return;
    }
    if (textoNovo === (msg.text || '')) {
      res.status(200).json({ ok: true, semMudanca: true });
      return;
    }

    const remoteJid = `${msg.phone.replace(/\D/g, '')}@s.whatsapp.net`;
    const numero = normalizarTelefoneBR(msg.phone.replace(/\D/g, ''));
    const evoResp = await fetch(`${EVOLUTION_API_URL}/chat/updateMessage/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: evolutionHeaders(),
      body: JSON.stringify({
        number: numero,
        text: textoNovo,
        key: { remoteJid, fromMe: true, id: msg.whatsapp_message_id },
      }),
    });
    if (!evoResp.ok) {
      const corpo = await evoResp.text().catch(() => '');
      console.error('Evolution API recusou editar a mensagem:', evoResp.status, corpo);
      res.status(502).json({ error: 'A Evolution API recusou editar essa mensagem (confira se a edição está liberada nas configurações da instância).' });
      return;
    }

    const quemEditou = (typeof senderName === 'string' && senderName.trim()) ? senderName.trim() : 'Atendente';
    const versoesAtuais = Array.isArray(msg.versions) ? msg.versions : (msg.text ? [{ text: msg.text, editedAt: null, editedBy: null }] : []);
    const novasVersoes = [...versoesAtuais, { text: textoNovo, editedAt: new Date().toISOString(), editedBy: quemEditou }];

    const patchResp = await fetch(`${SUPABASE_URL}/rest/v1/crm_messages?id=eq.${encodeURIComponent(messageId)}`, {
      method: 'PATCH',
      headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify({
        text: textoNovo,
        versions: novasVersoes,
        current_version_index: novasVersoes.length - 1,
        last_edited_at: new Date().toISOString(),
        last_edited_by: quemEditou,
      }),
    });
    if (!patchResp.ok) {
      console.error('Editou no WhatsApp mas falhou ao atualizar em crm_messages:', patchResp.status, await patchResp.text().catch(() => ''));
      res.status(502).json({ error: 'A mensagem foi editada no WhatsApp, mas não deu pra atualizar aqui no CRM. Atualize a página.' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro ao editar mensagem:', err);
    res.status(500).json({ error: 'Não foi possível editar a mensagem. Tente de novo.' });
  }
}
