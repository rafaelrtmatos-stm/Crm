import { createClient } from '@supabase/supabase-js';

// Projeto Supabase dedicado deste CRM (Rafa Arts Graphics).
// Separado do Supabase usado pelo Rumo ao Milhão (RA1M).
const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || 'https://areqouezrbdubfutjzki.supabase.co';
const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_YbzFXDHWQy-k0F9uNtVJ2g_urcsgmVt';

/**
 * Tempo maximo de espera por uma resposta do servidor.
 *
 * Por que existe: com o Wi-Fi conectado mas SEM internet (o caso mais comum numa loja), o navegador
 * continua dizendo `navigator.onLine === true` e a requisicao pode ficar pendurada por minutos, sem
 * dar erro. Nesse caso o PDV nunca chegava a cair no modo offline: o botao de finalizar venda ficava
 * "salvando" ate o cliente desistir. Com o limite, a requisicao falha como erro de REDE
 * (ver `isNetworkError` em lib/offlineSync.ts) e a venda vai para a fila do aparelho.
 *
 * Escritas (venda etc.) tem limite curto; leituras (`select`) podem trazer tabelas grandes e ganham
 * mais folga. Upload/download de arquivos (storage) e funcoes ficam sem limite: podem demorar de
 * verdade e nao fazem parte do fluxo de venda.
 */
export const LIMITE_ESCRITA_MS = 10_000;
export const LIMITE_LEITURA_MS = 30_000;

export function criarFetchComTempoLimite(
  limiteEscritaMs: number = LIMITE_ESCRITA_MS,
  limiteLeituraMs: number = LIMITE_LEITURA_MS,
): typeof fetch {
  return (input, init) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : (input as Request).url;
    if (url.includes('/storage/v1/') || url.includes('/functions/v1/')) return fetch(input, init);

    const metodo = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const limiteMs = metodo === 'GET' || metodo === 'HEAD' ? limiteLeituraMs : limiteEscritaMs;

    const controller = new AbortController();
    // Respeita um cancelamento que quem chamou ja tenha pedido (ex: `signal` do supabase-js).
    const externo = init?.signal;
    if (externo) {
      if (externo.aborted) controller.abort(externo.reason);
      else externo.addEventListener('abort', () => controller.abort(externo.reason), { once: true });
    }
    const timer = setTimeout(() => {
      controller.abort(new DOMException('Tempo esgotado ao falar com o servidor', 'TimeoutError'));
    }, limiteMs);

    // O limite vale ate o servidor RESPONDER (cabecalhos); depois disso o corpo pode baixar sem pressa.
    return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: criarFetchComTempoLimite() },
});
