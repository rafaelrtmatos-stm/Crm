// Configuracao centralizada da integracao WhatsApp (Evolution API + Supabase).
// Antes esses valores estavam duplicados (copiados e colados) em cada arquivo de
// api/whatsapp-*.js — o que fazia o nome da instancia ('rafa-arts') ficar espalhado
// pelo codigo. Agora todo mundo importa daqui, um lugar so pra mudar no futuro.
//
// EVOLUTION_INSTANCE_NAME e COMPANY_ID continuam com o valor 'rafa-arts' como
// fallback (mesmo comportamento de antes, pra nao quebrar quem ja tem o projeto
// rodando sem configurar a variavel nova) — mas agora podem ser sobrescritos via
// variavel de ambiente, sem precisar mexer em codigo.

export const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
export const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
export const EVOLUTION_WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;
export const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'rafa-arts';
// Por enquanto o CRM roda so pra uma empresa (single-tenant) e o company_id
// usado em todas as tabelas do WhatsApp e o mesmo nome da instancia. Se um dia
// virar multiempresa de verdade, isso precisa vir de outro lugar (ex: do usuario
// autenticado), e nao de uma env var fixa.
export const COMPANY_ID = process.env.EVOLUTION_INSTANCE_NAME || 'rafa-arts';

export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://areqouezrbdubfutjzki.supabase.co';
// Chave publicavel (anon/publishable) do Supabase — segura pra ficar em texto no
// codigo (e a mesma usada no navegador, em src/supabase.ts), mas ainda assim
// preferimos ler da env var quando ela existir, caindo pro valor atual como
// fallback pra nao quebrar quem ja tem o projeto rodando.
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_YbzFXDHWQy-k0F9uNtVJ2g_urcsgmVt';

export function evolutionHeaders() {
  return { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' };
}

export function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}
