// Endpoint combinado das duas ações disparadas ao abrir uma conversa no WhatsApp — agrupa em
// UMA Serverless Function os dois endpoints que antes eram arquivos separados
// (whatsapp-foto-perfil.js e whatsapp-presence-subscribe.js), só pra respeitar o limite de 12
// Serverless Functions do plano Hobby da Vercel.
//
// As URLs públicas continuam EXATAMENTE as mesmas de antes — o roteamento é feito no
// vercel.json, que reescreve cada URL original pra cá com um parâmetro `rota` interno
// (o front-end não muda nada). Autenticação, variáveis de ambiente, comportamento e
// respostas de cada rota são idênticos aos arquivos originais — só o arquivo físico mudou.
//
// POST /api/whatsapp-foto-perfil        (chega aqui como ?rota=foto-perfil)
//   body: { phone: "5592999999999" }
//   resposta: { ok: true, photoUrl?: string, atualizada: boolean }
//
// POST /api/whatsapp-presence-subscribe (chega aqui como ?rota=presence-subscribe)
//   body: { phone: "5593999999999" }
//   resposta: { ok: boolean }

import { EVOLUTION_API_URL, EVOLUTION_API_KEY, INSTANCE_NAME, SUPABASE_URL, SUPABASE_ANON_KEY, COMPANY_ID } from './_lib/whatsapp-config.js';
import { exigirUsuarioAutorizado } from './_lib/auth.js';
import { espelharFotoNoStorage } from './_lib/foto-perfil-storage.js';

const supaHeaders = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };

// --- rota=foto-perfil (ex api/whatsapp-foto-perfil.js) ---
async function handleFotoPerfil(req, res) {
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
    // Conversa de grupo: o "telefone" são os dígitos do group_jid. A foto é a do PRÓPRIO grupo (busca pelo JID
    // completo, @g.us) — nunca a de um participante.
    let numeroEvolution = numero;
    const g = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_groups?company_id=eq.${COMPANY_ID}&group_jid=eq.${numero}@g.us&select=id&limit=1`, { headers: supaHeaders });
    if (g.ok) {
      const grupos = await g.json();
      if (Array.isArray(grupos) && grupos.length > 0) numeroEvolution = `${numero}@g.us`;
    }

    const picRes = await fetch(`${EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: numeroEvolution }),
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
    const leadsLista = Array.isArray(leads) ? leads : [];

    // Guarda a foto no nosso Storage (a URL do WhatsApp expira). Se nao der, segue com a URL original.
    // Se o lead ja tem a mesma versao espelhada, nada e regravado e a URL volta igual.
    const fotoFinal = (await espelharFotoNoStorage(numero, fotoUrl, leadsLista[0]?.photo_url ?? null)) || fotoUrl;

    const alvos = leadsLista.filter((l) => l.photo_url !== fotoFinal);
    for (const l of alvos) {
      await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${l.id}`, {
        method: 'PATCH',
        headers: { ...supaHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ photo_url: fotoFinal }),
      });
    }
    res.status(200).json({ ok: true, photoUrl: fotoFinal, atualizada: alvos.length > 0 });
  } catch (err) {
    console.error('Falha ao atualizar foto do contato (não impede a conversa):', err);
    res.status(200).json({ ok: false, atualizada: false });
  }
}

// --- rota=presence-subscribe (ex api/whatsapp-presence-subscribe.js) ---
async function handlePresenceSubscribe(req, res) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    res.status(200).json({ ok: false, ignorado: 'Evolution API não configurada.' });
    return;
  }

  if (!(await exigirUsuarioAutorizado(req, res))) return;

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

// --- rota=group-participants (consulta participantes do grupo na Evolution API) ---
async function handleGroupParticipants(req, res) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    res.status(200).json({ ok: false, error: 'Evolution API não configurada.' });
    return;
  }
  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const rawJid = String(req.body?.groupJid || req.body?.phone || req.query?.groupJid || req.query?.phone || '').trim();
  const jid = rawJid.endsWith('@g.us') ? rawJid : `${rawJid.replace(/\D/g, '')}@g.us`;
  if (!jid || jid === '@g.us') {
    res.status(400).json({ error: 'Faltou o JID do grupo.' });
    return;
  }

  try {
    const evoHeaders = { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' };
    let r = await fetch(`${EVOLUTION_API_URL}/group/findGroupInfos/${INSTANCE_NAME}?groupJid=${encodeURIComponent(jid)}`, {
      method: 'GET',
      headers: evoHeaders,
    });
    // Algumas versões da Evolution API esperam POST com body { groupJid }
    if (!r.ok && (r.status === 404 || r.status === 405 || r.status === 400)) {
      try {
        const rPost = await fetch(`${EVOLUTION_API_URL}/group/findGroupInfos/${INSTANCE_NAME}`, {
          method: 'POST',
          headers: evoHeaders,
          body: JSON.stringify({ groupJid: jid }),
        });
        if (rPost.ok) r = rPost;
      } catch (errPost) {
        console.warn('Tentativa POST findGroupInfos falhou:', errPost);
      }
    }

    if (!r.ok) {
      res.status(200).json({ ok: false, status: r.status });
      return;
    }
    const data = await r.json().catch(() => null);
    if (!data) {
      res.status(200).json({ ok: false });
      return;
    }

    const rawParticipants = Array.isArray(data.participants) ? data.participants : (Array.isArray(data) ? data : []);
    const participants = rawParticipants.map((p) => {
      const pId = typeof p === 'string' ? p : (p.id || p.jid || '');
      const num = pId.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
      const pName = typeof p === 'object' ? (p.name || p.pushName || p.notify || null) : null;
      return {
        id: pId || num,
        phoneNumber: num || null,
        name: pName,
        admin: (p.admin === 'admin' || p.admin === 'superadmin' || p.isAdmin) ? 'admin' : null,
      };
    });

    // Enriquece com nomes salvos no CRM (tabela leads)
    if (participants.length > 0) {
      try {
        const nums = participants.map((p) => p.phoneNumber).filter(Boolean);
        if (nums.length > 0) {
          const sRes = await fetch(`${SUPABASE_URL}/rest/v1/leads?company_id=eq.${COMPANY_ID}&select=phone,contact_name,whatsapp_name,full_name&limit=300`, {
            headers: supaHeaders,
          });
          if (sRes.ok) {
            const leadsList = await sRes.json().catch(() => []);
            const mapLead = new Map();
            leadsList.forEach((l) => {
              const ld = (l.phone || '').replace(/\D/g, '');
              if (ld) mapLead.set(ld, l.contact_name || l.whatsapp_name || l.full_name);
            });
            participants.forEach((p) => {
              if (p.phoneNumber) {
                const foundName = mapLead.get(p.phoneNumber) || mapLead.get(p.phoneNumber.slice(-8));
                if (foundName) p.name = foundName;
              }
            });
          }
        }
      } catch (errLead) {
        console.warn('Erro ao enriquecer participantes do grupo com nomes do CRM:', errLead);
      }
    }

    res.status(200).json({
      ok: true,
      subject: data.subject || data.name || null,
      description: data.desc || data.description || null,
      size: data.size || participants.length,
      owner: data.owner || null,
      participants,
    });
  } catch (err) {
    console.error('Erro ao buscar participantes do grupo:', err);
    res.status(200).json({ ok: false, error: err?.message || String(err) });
  }
}

export default async function handler(req, res) {
  const rota = String(req.query?.rota || '');
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (rota === 'presence-subscribe') {
    await handlePresenceSubscribe(req, res);
    return;
  }
  if (rota === 'group-participants' || rota === 'group-info') {
    await handleGroupParticipants(req, res);
    return;
  }
  // default / rota === 'foto-perfil'
  await handleFotoPerfil(req, res);
}
