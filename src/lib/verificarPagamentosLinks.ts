// Pede ao servidor para conferir os links de pagamento PIX ainda abertos (rota /api/ai?rota=verificar-notas).
// O servidor só vai ao Gmail se existir pendência aberta e respeita um intervalo mínimo por nota; a baixa na nota
// acontece lá (api/_lib/pagar-link.js) e a lista de vendas atualiza sozinha pelo realtime da tabela `vendas`.
// Qualquer falha aqui é silenciosa: o link e o botão manual continuam funcionando.

const idUsuarioLogado = (): string => {
  try {
    const raw = localStorage.getItem('rpro_cached_user');
    return raw ? String(JSON.parse(raw)?.id || '') : '';
  } catch {
    return '';
  }
};

const INTERVALO_MINIMO_LOCAL_MS = 15000;
const ultimaChamada = new Map<string, number>();

export interface ResultadoVerificacao {
  ok: boolean;
  /** Quantas notas receberam baixa nesta conferência. */
  pagos: number;
  /** Ids das notas que receberam baixa. */
  baixadas: string[];
  /** true quando a chamada foi ignorada por ter sido feita há pouco tempo. */
  recente?: boolean;
}

/**
 * Confere os pagamentos dos links ativos de uma nota (`saleId`) ou de todas as notas abertas (sem `saleId`).
 * `forcar` ignora a trava local de 15 s (usado pelo botão "Verificar pagamentos"; o servidor ainda limita a 10 s).
 */
export async function verificarPagamentosLinks(saleId?: string, forcar = false): Promise<ResultadoVerificacao> {
  const chave = saleId || '*';
  if (!forcar && Date.now() - (ultimaChamada.get(chave) || 0) < INTERVALO_MINIMO_LOCAL_MS) {
    return { ok: true, pagos: 0, baixadas: [], recente: true };
  }
  ultimaChamada.set(chave, Date.now());
  const controle = new AbortController();
  const corte = setTimeout(() => controle.abort(), 15000);
  try {
    const r = await fetch('/api/ai?rota=verificar-notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': idUsuarioLogado() },
      body: JSON.stringify(saleId ? { saleId } : {}),
      signal: controle.signal,
    });
    if (!r.ok) return { ok: false, pagos: 0, baixadas: [] };
    const j = await r.json();
    return {
      ok: j?.ok === true,
      pagos: Number(j?.pagos) || 0,
      baixadas: Array.isArray(j?.baixadas) ? j.baixadas.map(String) : [],
      recente: j?.recente === true,
    };
  } catch {
    return { ok: false, pagos: 0, baixadas: [] };
  } finally {
    clearTimeout(corte);
  }
}
