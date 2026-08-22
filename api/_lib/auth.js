// Autorizacao dos endpoints de WhatsApp (api/whatsapp-connect.js, whatsapp-send.js,
// whatsapp-import-history.js, whatsapp-presence-subscribe.js).
//
// O CRM NAO tem um sistema de sessao com token verificavel no servidor (o login em
// src/App.tsx e feito direto contra a tabela `usuarios` do Supabase e o id do usuario
// fica guardado no sessionStorage/localStorage do navegador, sem JWT nem cookie
// assinado). Pra nao criar um segundo sistema de login do zero (o que a auditoria
// pede explicitamente pra evitar), reaproveitamos esse mesmo mecanismo: o front-end
// manda o id do usuario logado (header `x-user-id`) e aqui a gente confere que esse
// id corresponde a um usuario ativo de verdade antes de deixar a acao passar.
//
// Isso bloqueia quem simplesmente descobre a URL do endpoint (bots, scanners, um
// link compartilhado sem querer) e nao tem um id de usuario valido. Ainda depende
// da tabela `usuarios` no Supabase estar com uma policy de RLS que nao deixe
// qualquer pessoa listar todos os ids/usuarios pela API publica do Supabase — se
// essa policy estiver como "allow all" (permitir tudo), esse endpoint continua
// exposto por outra via, e isso precisa ser corrigido separadamente na tabela
// `usuarios`, fora do escopo desta auditoria (que e so da integracao WhatsApp).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './whatsapp-config.js';

// Mesmo id fixo usado em src/App.tsx pro admin master (esse usuario vive no
// Firebase, nao na tabela `usuarios` do Supabase, entao precisa ser aceito à parte).
const MASTER_ADMIN_ID = 'admin-rafael';

export async function usuarioAutorizado(req) {
  const userId = (req.headers['x-user-id'] || req.body?.userId || '').toString().trim();
  if (!userId) return false;
  if (userId === MASTER_ADMIN_ID) return true;

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${encodeURIComponent(userId)}&is_active=eq.true&select=id`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!r.ok) return false;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch (err) {
    console.error('Falha ao validar usuário para chamada WhatsApp:', err);
    return false;
  }
}

// Aplica a checagem e ja responde 401 se falhar — devolve true/false pro handler
// saber se deve continuar ou já retornou a resposta.
export async function exigirUsuarioAutorizado(req, res) {
  const ok = await usuarioAutorizado(req);
  if (!ok) {
    res.status(401).json({ error: 'Usuário não autorizado.' });
    return false;
  }
  return true;
}
