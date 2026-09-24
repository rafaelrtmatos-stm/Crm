// Foto de perfil PERMANENTE. A URL que a Evolution/WhatsApp devolve (pps.whatsapp.net/...?oe=...) expira
// depois de algumas semanas (o `oe=` e a data de validade em hex) e, depois disso, responde 403. A notificacao
// nativa do navegador nao tem como "tratar erro de imagem" -- quando a foto nao carrega ela mostra o icone do
// site (favicon). Por isso, assim que temos uma URL valida, baixamos a imagem AGORA e guardamos uma copia no
// bucket publico `whatsapp-media` (pasta perfil/); o CRM passa a gravar em leads.photo_url a URL da copia,
// que nao expira.
//
// Obs.: o bucket so tem politica de INSERT pra chave anon (sem UPDATE), entao nunca sobrescreve: cada copia
// tem nome novo (perfil/<numero>-<timestamp>.<ext>) e so renovamos de tempos em tempos (VALIDADE_MS).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './whatsapp-config.js';

const BUCKET = 'whatsapp-media';
const PREFIXO = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/perfil/`;
const MAX_BYTES = 2 * 1024 * 1024;
export const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000; // renova a copia no maximo 1x por mes

// A URL e uma copia nossa (permanente)?
export function ehFotoPermanente(url) {
  return typeof url === 'string' && url.startsWith(PREFIXO);
}

// Copia nossa E ainda recente (nao precisa renovar agora).
export function fotoPermanenteRecente(url) {
  if (!ehFotoPermanente(url)) return false;
  const m = url.match(/-(\d{10,})\.(?:jpg|png|webp)$/);
  return !!m && Date.now() - Number(m[1]) < VALIDADE_MS;
}

// Baixa a foto da URL do WhatsApp e sobe pro Storage. Devolve a URL publica permanente ou null (quem chamou
// cai na URL original, como sempre foi). Nunca lanca erro.
export async function salvarFotoPermanente(fotoUrl, numero) {
  try {
    const digitos = String(numero || '').replace(/\D/g, '');
    if (!digitos || typeof fotoUrl !== 'string' || !/^https:\/\//i.test(fotoUrl)) return null;

    const resp = await fetch(fotoUrl);
    if (!resp.ok) return null;
    const tipo = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!tipo.startsWith('image/')) return null;
    const buffer = Buffer.from(await resp.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_BYTES) return null;

    const ext = tipo === 'image/png' ? 'png' : tipo === 'image/webp' ? 'webp' : 'jpg';
    const caminho = `perfil/${digitos}-${Date.now()}.${ext}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${caminho}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': tipo },
      body: buffer,
    });
    if (!up.ok) {
      console.warn('[foto-perfil] upload pro Storage falhou:', up.status);
      return null;
    }
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${caminho}`;
  } catch (err) {
    console.warn('[foto-perfil] nao foi possivel guardar a copia da foto:', err);
    return null;
  }
}
