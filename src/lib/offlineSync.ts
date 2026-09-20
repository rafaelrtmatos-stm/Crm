import { useEffect, useState } from 'react';

// -----------------------------------------------------------------------
// Cache local (leitura offline instantânea)
// -----------------------------------------------------------------------

export function getCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage cheio/bloqueado — ignora, dado ainda fica em memória
  }
}

// -----------------------------------------------------------------------
// Detecção de conexão
// -----------------------------------------------------------------------

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}

// -----------------------------------------------------------------------
// Fila de operações pendentes (escrita offline)
// -----------------------------------------------------------------------

export interface QueuedOp {
  id: string;
  // 'sale' = venda feita offline (a linha de `vendas` + todas as baixas que ela causa, numa operacao so).
  type: 'insert' | 'update' | 'sale';
  table: string;
  payload: Record<string, any>;
  match?: { column: string; value: any };
  description: string;
  createdAt: string;
  // Preenchidos pelo envio quando o servidor RECUSA a operacao por erro de dado (nao de rede):
  erro?: string;               // ultima mensagem de erro (fica visivel, nao some sozinha)
  tentativas?: number;         // quantas vezes ja foi recusada
  proximaTentativaEm?: string; // ISO: antes disso o envio automatico nao tenta de novo (espera crescente)
}

/**
 * Conteudo (`payload`) de uma operacao do tipo 'sale'. As baixas sao RELATIVAS (quanto sai), nunca o
 * valor final calculado do cache local: quem aplicar no servidor subtrai do que existir la na hora,
 * sem sobrescrever vendas feitas em outro aparelho. `venda.id` ja nasce no aparelho (`venda_<ts>`),
 * entao serve de chave para nao duplicar a venda se a mesma operacao for enviada mais de uma vez.
 */
export interface VendaOfflinePayload {
  venda: Record<string, any>; // linha completa de `vendas`, como seria inserida online
  creditoCliente?: { clienteId: string; valorAplicado: number };
  baixasEstoque: { productId: string; quantidade: number }[];
  baixasMateriasPrimas: {
    materiaPrimaId?: string;
    name?: string;
    quantity: number;
    orderId?: string;
    customerName?: string;
    productName?: string;
    observacao?: string;
  }[];
  // Etapas JA aplicadas no servidor, gravadas a cada etapa concluida: se a conexao cair no meio, o
  // proximo envio continua de onde parou em vez de repetir baixa de estoque, credito etc.
  progresso?: VendaProgresso;
}

export interface VendaProgresso {
  venda?: boolean;
  credito?: boolean;
  estoque?: string[];        // productId ja baixados
  materiasPrimas?: number[]; // indices de baixasMateriasPrimas ja aplicados
}

const QUEUE_KEY = 'pos_offline_queue';

/**
 * true quando a falha e de REDE (sem conexao / requisicao nao chegou ao servidor). Erro de dado,
 * permissao ou regra do banco NAO conta: esses continuam sendo mostrados ao usuario, nao guardados.
 */
export function isNetworkError(err: any): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = String(err?.message ?? err ?? '');
  // `timeouterror`/`aborterror`/"tempo esgotado": a requisicao ficou pendurada (Wi-Fi sem internet) e foi
  // cortada por `criarFetchComTempoLimite` em supabase.ts. Nao usa so "timeout" de proposito: o
  // "statement timeout" do Postgres e erro do SERVIDOR (dado/consulta), nao de rede.
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet_disconnected|err_network|timeouterror|aborterror|tempo esgotado ao falar com o servidor/i.test(msg);
}

export function getQueue(): QueuedOp[] {
  return getCache<QueuedOp[]>(QUEUE_KEY, []);
}

function saveQueue(queue: QueuedOp[]): void {
  setCache(QUEUE_KEY, queue);
  try {
    window.dispatchEvent(new CustomEvent('pos-offline-queue-changed', { detail: { size: queue.length } }));
  } catch {
    // ambiente sem CustomEvent (ex: SSR) — ignora
  }
}

export function enqueueOp(op: Omit<QueuedOp, 'id' | 'createdAt'>): QueuedOp {
  const fullOp: QueuedOp = {
    ...op,
    id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const queue = getQueue();
  queue.push(fullOp);
  saveQueue(queue);
  return fullOp;
}

export interface FlushResult {
  processed: number;  // operacoes concluidas (saem da fila)
  failed: number;     // recusadas pelo servidor por erro de DADO nesta rodada (ficam na fila, com o erro)
  remaining: number;
  offline?: boolean;  // parou porque a conexao caiu: o resto segue na fila, na ordem
  sentSales?: number; // quantas das concluidas eram vendas
  novosErros?: { description: string; message: string }[]; // erros novos/alterados nesta rodada (para avisar UMA vez)
}

export interface FlushOptions {
  /** Envia so as operacoes que passam no filtro (as demais ficam intocadas na fila). */
  filtro?: (op: QueuedOp) => boolean;
  /** Como aplicar uma operacao 'sale' no servidor. Lanca erro se falhar. Sem isso, 'sale' fica intacta. */
  aplicarVenda?: (op: QueuedOp) => Promise<void>;
  /** Ignora a espera das operacoes com erro de dado (reenvio manual). */
  forcar?: boolean;
}

/** Erro de "chave duplicada" do Postgres/PostgREST (o registro com esse id ja existe). */
export function isDuplicateError(err: any): boolean {
  return err?.code === '23505' || /duplicate key/i.test(String(err?.message ?? ''));
}

/** Confere no servidor se o registro com esse id ja esta la (para tratar "duplicado" como sucesso de verdade). */
export async function jaExisteNoServidor(supabase: any, table: string, id: any): Promise<boolean> {
  if (!id) return false;
  const { data, error } = await supabase.from(table).select('id').eq('id', id).maybeSingle();
  if (error) throw error;
  return !!data;
}

/**
 * Envia as operacoes pendentes ao Supabase, NA ORDEM em que foram criadas.
 *  - Sem conexao (erro de rede): PARA e mantem esta e as seguintes na fila, na ordem.
 *  - Erro de dado (o servidor recusou): a operacao fica na fila com o erro registrado e uma espera
 *    crescente antes da proxima tentativa automatica; as seguintes continuam sendo enviadas.
 *  - "Ja existe" (chave duplicada) so vale como sucesso se o registro com aquele id realmente estiver la.
 *  - A fila e RELIDA a cada operacao e alterada so pelo id: uma venda enfileirada enquanto o envio
 *    roda (ou por outra aba) nunca e apagada por este loop.
 */
export async function flushOfflineQueue(
  supabase: any,
  onProgress?: (done: number, total: number) => void,
  opts: FlushOptions = {}
): Promise<FlushResult> {
  const ids = getQueue().filter(op => !opts.filtro || opts.filtro(op)).map(op => op.id);
  const result: FlushResult = { processed: 0, failed: 0, remaining: getQueue().length, sentSales: 0, novosErros: [] };
  if (ids.length === 0) return result;

  let feitas = 0;
  for (const id of ids) {
    const op = getQueue().find(o => o.id === id);
    if (!op) continue; // ja saiu da fila (outra aba, por exemplo)
    if (op.type === 'sale' && !opts.aplicarVenda) continue; // ninguem sabe aplicar: fica intacta
    if (!opts.forcar && op.proximaTentativaEm && Date.parse(op.proximaTentativaEm) > Date.now()) continue; // em espera

    try {
      if (op.type === 'sale') {
        await opts.aplicarVenda!(op);
      } else if (op.type === 'insert') {
        const { error } = await supabase.from(op.table).insert(op.payload);
        if (error && !(isDuplicateError(error) && await jaExisteNoServidor(supabase, op.table, op.payload?.id))) throw error;
      } else {
        if (!op.match) throw new Error('Operação de update sem filtro (match).');
        const { error } = await supabase.from(op.table).update(op.payload).eq(op.match.column, op.match.value);
        if (error) throw error;
      }
      removeFromQueue(id);
      result.processed++;
      if (op.type === 'sale') result.sentSales!++;
    } catch (err: any) {
      if (isNetworkError(err)) { result.offline = true; break; }
      const message = String(err?.message ?? err ?? 'erro desconhecido');
      const tentativas = (op.tentativas || 0) + 1;
      const esperaMin = Math.min(60, 2 ** Math.min(tentativas, 6));
      console.warn('[offlineSync] Servidor recusou a operação pendente:', op.description, err);
      patchOp(id, { erro: message, tentativas, proximaTentativaEm: new Date(Date.now() + esperaMin * 60000).toISOString() });
      result.failed++;
      if (message !== op.erro) result.novosErros!.push({ description: op.description, message });
    }
    feitas++;
    onProgress?.(feitas, ids.length);
  }
  result.remaining = getQueue().length;
  return result;
}

/** Atualiza campos de UMA operacao pelo id, relendo a fila na hora (nao sobrescreve o que entrou nela enquanto isso). */
export function patchOp(opId: string, patch: Partial<QueuedOp>): void {
  const queue = getQueue();
  const i = queue.findIndex(op => op.id === opId);
  if (i === -1) return;
  queue[i] = { ...queue[i], ...patch };
  saveQueue(queue);
}

export function removeFromQueue(opId: string): void {
  saveQueue(getQueue().filter(op => op.id !== opId));
}

export function clearQueue(): void {
  saveQueue([]);
}
