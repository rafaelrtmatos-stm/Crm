// Atualiza a foto de perfil de UM contato quando a conversa dele é aberta no CRM.
// A URL da foto que o WhatsApp devolve expira depois de algumas semanas (parâmetro `oe=`), e o
// webhook só busca a foto quando o lead ainda não tem nenhuma — então aqui renova só o contato
// que está sendo aberto (nenhuma atualização em massa). Se a Evolution não devolver foto
// (contato sem foto / privacidade), a foto que já estava salva é mantida.
//
// POST /api/whatsapp-foto-perfil
// headers: x-user-id: <id do usuário logado>
// body: { phone: "5592999999999" }
// resposta: { ok: true, photoUrl?: string, atualizada: boolean }
import { EVOLUTION_API_URL, EVOLUTION_API_KEY, INSTANCE_NAME, SUPABASE_URL, SUPABASE_ANON_KEY, COMPANY_ID } from './_lib/whatsapp-config.js';
import { exigirUsuarioAutorizado } from './_lib/auth.js';

const supaHeaders = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    res.status(200).json({ ok: false, ignorado: 'Evolution API não configurada.' });
    return;
  }
  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const numero = String(req.body?.phone || '').replace(/\D/g, '');
  if (!numero) {
    res.status(400).json({ error: 'Faltou o telefone.' });
    return;
  }

  try {
    // Conversa de grupo: o "telefone" são os dígitos do group_jid — não é contato, não busca foto.
    const g = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_groups?company_id=eq.${COMPANY_ID}&group_jid=eq.${numero}@g.us&select=id&limit=1`, { headers: supaHeaders });
    if (g.ok) {
      const grupos = await g.json();
      if (Array.isArray(grupos) && grupos.length > 0) {
        res.status(200).json({ ok: true, ignorado: 'grupo', atualizada: false });
        return;
      }
    }

    const picRes = await fetch(`${EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: numero }),
    });
    if (!picRes.ok) {
      res.status(200).json({ ok: false, atualizada: false });
      return;
    }
    const pic = await picRes.json().catch(() => null);
    const fotoUrl = pic?.profilePictureUrl || pic?.url || null;
    if (!fotoUrl || typeof fotoUrl !== 'string' || !/^https?:\/\//.test(fotoUrl)) {
      res.status(200).json({ ok: true, atualizada: false }); // sem foto nova: mantém a atual
      return;
    }

    const atual = await fetch(`${SUPABASE_URL}/rest/v1/leads?company_id=eq.${COMPANY_ID}&phone=eq.${numero}&select=id,photo_url`, { headers: supaHeaders });
    const leads = atual.ok ? await atual.json() : [];
    const alvos = Array.isArray(leads) ? leads.filter((l) => l.photo_url !== fotoUrl) : [];
    for (const l of alvos) {
      await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${l.id}`, {
        method: 'PATCH',
        headers: { ...supaHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ photo_url: fotoUrl }),
      });
    }
    res.status(200).json({ ok: true, photoUrl: fotoUrl, atualizada: alvos.length > 0 });
  } catch (err) {
    console.error('Falha ao atualizar foto do contato (não impede a conversa):', err);
    res.status(200).json({ ok: false, atualizada: false });
  }
}
