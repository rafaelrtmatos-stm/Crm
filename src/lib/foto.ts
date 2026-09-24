// Utilitarios para foto de perfil (avatar) de contato/grupo.
//
// As URLs de foto que o WhatsApp devolve (pps.whatsapp.net) sao assinadas e EXPIRAM: o parametro `oe=` e um
// timestamp Unix em hexadecimal. Depois dele a CDN responde 403/404. Sem cuidado, cada avatar (e cada
// remontagem dele ao rolar a lista) pede de novo a mesma URL morta, enchendo o console de erros e
// segurando a rede. Aqui:
//   1) URL ja vencida (pelo `oe=`) nem e requisitada -- vai direto pro placeholder.
//   2) URL que falhou uma vez nesta sessao (403/404/rede) e lembrada e nao e pedida de novo.
// Fotos espelhadas no nosso Storage (api/_lib/foto-perfil-storage.js) nao expiram e passam direto.

/** Placeholder local (public/avatar-padrao.png): nunca depende de rede externa. */
export const AVATAR_PADRAO = '/avatar-padrao.png';

const urlsQuebradas = new Set<string>();

/** true se a URL assinada do WhatsApp ja venceu (`oe=<hex>` < agora). URL sem `oe=` nunca conta como vencida. */
export function fotoExpirada(url: string, agora: number = Date.now()): boolean {
  const m = /[?&]oe=([0-9a-f]{6,8})(?:&|$)/i.exec(url);
  if (!m) return false;
  const expiraEm = parseInt(m[1], 16) * 1000;
  return Number.isFinite(expiraEm) && expiraEm <= agora;
}

/** Registra que esta URL falhou ao carregar (403/404/rede): nao sera pedida de novo nesta sessao. */
export function marcarFotoQuebrada(url?: string | null): void {
  if (url) urlsQuebradas.add(url);
}

/**
 * URL que vale a pena pedir ao navegador, ou null (-> use o placeholder). Descarta: vazio/"null"/"undefined",
 * esquema que nao seja http(s)/data:image/blob:, URL ja vencida e URL que ja falhou nesta sessao.
 */
export function fotoUsavel(url?: string | null): string | null {
  if (typeof url !== 'string') return null;
  const u = url.trim();
  if (!u || u === 'null' || u === 'undefined') return null;
  if (!/^(https?:\/\/|data:image\/|blob:)/i.test(u)) return null;
  if (urlsQuebradas.has(u)) return null;
  if (/^https?:\/\//i.test(u) && fotoExpirada(u)) return null;
  return u;
}
