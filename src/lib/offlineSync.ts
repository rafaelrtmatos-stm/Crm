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
}

const QUEUE_KEY = 'pos_offline_queue';

/**
 * true quando a falha e de REDE (sem conexao / requisicao nao chegou ao servidor). Erro de dado,
 * permissao ou regra do banco NAO conta: esses continuam sendo mostrados ao usuario, nao guardados.
 */
export function isNetworkError(err: any): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = String(err?.message ?? err ?? '');
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet_disconnected|err_network/i.test(msg);
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
  processed: number;
  failed: number;
  remaining: number;
}

/**
 * Tenta enviar todas as operações pendentes ao Supabase, na ordem em que
 * foram criadas. Operações que falham (ex: ainda sem internet, ou erro
 * real de dados) permanecem na fila para a próxima tentativa; as que
 * seguem depois na fila continuam sendo tentadas normalmente.
 */
export async function flushOfflineQueue(
  supabase: any,
  onProgress?: (done: number, total: number) => void
): Promise<FlushResult> {
  const queue = getQueue();
  if (queue.length === 0) return { processed: 0, failed: 0, remaining: 0 };

  const stillPending: QueuedOp[] = [];
  let processed = 0;
  let failed = 0;

  for (const op of queue) {
    // Venda offline: aplicar no servidor (venda + baixas) e um passo proprio, ainda nao implementado.
    // Fica na fila intacta -- nunca cai no ramo de update abaixo (que exige `match` e a descartaria).
    if (op.type === 'sale') {
      stillPending.push(op);
      continue;
    }
    try {
      if (op.type === 'insert') {
        const { error } = await supabase.from(op.table).insert(op.payload);
        if (error) throw error;
      } else {
        if (!op.match) throw new Error('Operação de update sem filtro (match).');
        const { error } = await supabase.from(op.table).update(op.payload).eq(op.match.column, op.match.value);
        if (error) throw error;
      }
      processed++;
    } catch (err) {
      console.warn('[offlineSync] Falha ao sincronizar operação pendente:', op.description, err);
      failed++;
      stillPending.push(op);
    }
    onProgress?.(processed + failed, queue.length);
  }

  saveQueue(stillPending);
  return { processed, failed, remaining: stillPending.length };
}

export function removeFromQueue(opId: string): void {
  saveQueue(getQueue().filter(op => op.id !== opId));
}

export function clearQueue(): void {
  saveQueue([]);
}
