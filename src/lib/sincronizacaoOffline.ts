import { supabase } from '../supabase';
import { showAlert } from './notify';
import { deductMateriasPrimasStock } from './materiasPrimasStorage';
import {
  flushOfflineQueue,
  getQueue,
  isDuplicateError,
  jaExisteNoServidor,
  patchOp,
} from './offlineSync';
import type { FlushResult, QueuedOp, VendaOfflinePayload, VendaProgresso } from './offlineSync';

const ehVenda = (op: QueuedOp) => op.type === 'sale';

/**
 * Aplica UMA venda feita offline no servidor, em etapas:
 *   1) linha em `vendas`  2) credito do cliente  3) estoque dos produtos  4) matérias-primas
 * O progresso e gravado na propria operacao a cada etapa concluida. Se a conexao cair no meio (ou o
 * servidor recusar uma etapa), o proximo envio CONTINUA de onde parou: nunca repete a venda, nem
 * baixa estoque/credito duas vezes. Lanca erro quando algo falha (quem chama decide: rede = tenta
 * depois; dado = registra o erro e mostra).
 *
 * As baixas sao relativas ao que o servidor tem NA HORA (le, subtrai, grava) -- nunca o valor do
 * cache do aparelho, que pode estar velho.
 */
export async function aplicarVendaOffline(client: any, op: QueuedOp): Promise<void> {
  const dados = op.payload as VendaOfflinePayload;
  const progresso: VendaProgresso = { venda: false, credito: false, ...(dados.progresso || {}) };
  progresso.estoque = [...(progresso.estoque || [])];
  progresso.materiasPrimas = [...(progresso.materiasPrimas || [])];
  const salvar = () => patchOp(op.id, { payload: { ...dados, progresso: { ...progresso } } });

  // 1) A venda. Vai com a data/hora em que foi FEITA (a do servidor seria a de agora, horas depois).
  if (!progresso.venda) {
    const linha: Record<string, any> = { created_at: op.createdAt, ...dados.venda };
    let { error } = await client.from('vendas').insert(linha);
    if (error && String(error.message || '').includes('consumo_materias_primas')) {
      const { consumo_materias_primas, ...semConsumo } = linha;
      ({ error } = await client.from('vendas').insert(semConsumo));
    }
    if (error && !(isDuplicateError(error) && await jaExisteNoServidor(client, 'vendas', dados.venda.id))) throw error;
    progresso.venda = true;
    salvar();
  }

  // 2) Credito usado pelo cliente.
  if (dados.creditoCliente && !progresso.credito) {
    const { clienteId, valorAplicado } = dados.creditoCliente;
    const { data, error } = await client.from('clientes').select('saldo_credito').eq('id', clienteId).maybeSingle();
    if (error) throw error;
    if (data) {
      const novo = Math.max(0, (Number(data.saldo_credito) || 0) - valorAplicado);
      const { error: erroUpdate } = await client.from('clientes').update({ saldo_credito: novo }).eq('id', clienteId);
      if (erroUpdate) throw erroUpdate;
    }
    progresso.credito = true;
    salvar();
  }

  // 3) Estoque dos produtos (coluna `current_stock`; produto que nao controla estoque nao e mexido).
  for (const baixa of dados.baixasEstoque || []) {
    if (progresso.estoque!.includes(baixa.productId)) continue;
    const { data, error } = await client.from('produtos').select('current_stock, controla_estoque').eq('id', baixa.productId).maybeSingle();
    if (error) throw error;
    if (data && data.controla_estoque !== false) {
      const novo = Math.max(0, (Number(data.current_stock) || 0) - baixa.quantidade);
      const { error: erroUpdate } = await client.from('produtos').update({ current_stock: novo }).eq('id', baixa.productId);
      if (erroUpdate) throw erroUpdate;
    }
    progresso.estoque!.push(baixa.productId);
    salvar();
  }

  // 4) Matérias-primas, um item por vez (para o progresso ser por item).
  const materias = dados.baixasMateriasPrimas || [];
  for (let i = 0; i < materias.length; i++) {
    if (progresso.materiasPrimas!.includes(i)) continue;
    const gravou = await deductMateriasPrimasStock([materias[i]], dados.venda.company_id);
    if (!gravou) throw new Error(`Não foi possível baixar a matéria-prima "${materias[i].name || materias[i].materiaPrimaId || 'sem nome'}" no servidor.`);
    progresso.materiasPrimas!.push(i);
    salvar();
  }
}

function avisar(r: FlushResult) {
  try {
    if (r.sentSales) {
      showAlert(r.sentSales === 1
        ? '1 venda feita offline foi enviada ao sistema.'
        : `${r.sentSales} vendas feitas offline foram enviadas ao sistema.`);
    }
    for (const e of r.novosErros || []) {
      showAlert(`Não foi possível enviar "${e.description}": ${e.message}. O sistema tenta de novo automaticamente.`);
    }
  } catch { /* aviso e cosmetico: nunca derruba o envio */ }
}

let emAndamento: Promise<FlushResult | null> | null = null;

/**
 * Envia ao servidor as vendas feitas offline que estao na fila do aparelho (so as do tipo 'sale':
 * operacoes antigas de outros modulos ficam como estao). Seguro para chamar a qualquer hora:
 *  - sem internet, ou sem venda na fila: nao faz nada;
 *  - ja tem um envio rodando nesta aba, ou em OUTRA aba do CRM (Web Locks): nao roda em paralelo;
 *  - ao terminar com vendas enviadas, avisa o usuario e dispara o evento 'pos-offline-sync-done'
 *    (o PDV recarrega produtos/clientes/historico do servidor).
 * `forcar` reenvia tambem as operacoes que estavam em espera por erro de dado. `cliente` existe so
 * para teste.
 */
export function sincronizarFilaOffline(opts: { forcar?: boolean; cliente?: any } = {}): Promise<FlushResult | null> {
  if (emAndamento) return emAndamento;
  const cliente = opts.cliente ?? supabase;

  const executar = async (): Promise<FlushResult> => {
    const r = await flushOfflineQueue(cliente, undefined, {
      filtro: ehVenda,
      aplicarVenda: op => aplicarVendaOffline(cliente, op),
      forcar: opts.forcar,
    });
    avisar(r);
    if (r.processed > 0 && typeof window !== 'undefined') {
      try { window.dispatchEvent(new CustomEvent('pos-offline-sync-done', { detail: r })); } catch { /* sem CustomEvent */ }
    }
    return r;
  };

  const rodar = async (): Promise<FlushResult | null> => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
    if (!getQueue().some(ehVenda)) return null;
    const locks = typeof navigator !== 'undefined' ? (navigator as any).locks : undefined;
    if (locks?.request) {
      return locks.request('crm-offline-sync', { ifAvailable: true }, (lock: any) => (lock ? executar() : null));
    }
    return executar();
  };

  emAndamento = rodar().finally(() => { emAndamento = null; });
  return emAndamento;
}
