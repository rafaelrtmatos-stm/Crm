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
  type: 'insert' | 'update';
  table: string;
  payload: Record<string, any>;
  match?: { column: string; value: any };
  description: string;
  createdAt: string;
}

const QUEUE_KEY = 'pos_offline_queue';

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
