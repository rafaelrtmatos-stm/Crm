// Espelha a foto de perfil do WhatsApp no Supabase Storage (bucket "profile-photos").
// A URL que a Evolution/WhatsApp devolve expira depois de algumas semanas (parametro `oe=`), então
// guardar ela em leads.photo_url faz a foto sumir sozinha. Aqui a imagem é baixada uma vez e a URL
// gravada passa a ser a do nosso Storage, que não expira.
//
// Só foto de PERFIL passa por aqui (arquivos pequenos). A mídia das mensagens continua sendo buscada
// ao vivo na Evolution (api/whatsapp-media.js) — decisão da Fase 2, pra não pesar no egress.
//
// Caminho fixo por contato (`<company>/<telefone>.jpg`, com upsert): não acumula arquivo velho. O `?v=`
// da URL é um hash curto do conteúdo — foto trocada = URL nova (cache do navegador/CDN renova), foto
// igual = mesma URL (nada é regravado). Qualquer falha devolve null: quem chamou mantém a URL original.
import { createHash } from 'node:crypto';
import { SUPABASE_URL, SUPABASE_ANON_KEY, COMPANY_ID } from './whatsapp-config.js';

export const BUCKET_FOTOS = 'profile-photos';
const TAMANHO_MAXIMO = 2 * 1024 * 1024; // 2 MB: foto de perfil real tem dezenas de KB
const PREFIXO_PUBLICO = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_FOTOS}/`;

/** true se a URL já é do nosso Storage (foto já espelhada). */
export function fotoJaEspelhada(url) {
  return typeof url === 'string' && url.startsWith(PREFIXO_PUBLICO);
}

function versaoDaUrl(url) {
  try { return new URL(url).searchParams.get('v'); } catch { return null; }
}

/**
 * Baixa a foto de `urlOriginal` e guarda no Storage.
 * @param {string} phone  digitos do telefone (ou do JID do grupo)
 * @param {string} urlOriginal  URL http(s) devolvida pela Evolution
 * @param {string|null} [urlAtual]  photo_url que o lead tem hoje; se ja for a mesma versao, nao regrava
 * @returns {Promise<string|null>} URL publica do Storage, ou null se nao deu (mantenha a original)
 */
export async function espelharFotoNoStorage(phone, urlOriginal, urlAtual = null) {
  try {
    const digitos = String(phone || '').replace(/\D/g, '');
    if (!digitos || typeof urlOriginal !== 'string' || !/^https?:\/\//.test(urlOriginal)) return null;

    const baixar = await fetch(urlOriginal);
    if (!baixar.ok) return null;
    const tipo = (baixar.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    if (!tipo.startsWith('image/')) return null;
    const bytes = Buffer.from(await baixar.arrayBuffer());
    if (bytes.length === 0 || bytes.length > TAMANHO_MAXIMO) return null;

    const versao = createHash('sha1').update(bytes).digest('hex').slice(0, 10);
    const caminho = `${COMPANY_ID}/${digitos}.jpg`;
    const urlPublica = `${PREFIXO_PUBLICO}${caminho}?v=${versao}`;

    // Mesma foto que ja esta salva: nada a fazer.
    if (fotoJaEspelhada(urlAtual) && versaoDaUrl(urlAtual) === versao) return urlAtual;

    const subir = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_FOTOS}/${caminho}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': tipo,
        'x-upsert': 'true',
        'Cache-Control': 'max-age=604800', // seguro: foto nova muda o ?v=, entao a URL muda junto
      },
      body: bytes,
    });
    if (!subir.ok) {
      console.error('Falha ao guardar foto de perfil no Storage (mantem a URL original):', subir.status, await subir.text().catch(() => ''));
      return null;
    }
    return urlPublica;
  } catch (err) {
    console.error('Falha ao espelhar foto de perfil (mantem a URL original):', err);
    return null;
  }
}
