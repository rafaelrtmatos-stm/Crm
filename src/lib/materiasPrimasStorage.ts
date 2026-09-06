import { supabase } from '../supabase';
import { MateriaPrima } from '../types';
import { enqueueOp } from './offlineSync';

const LOCAL_STORAGE_KEY = 'rpro_materias_primas_cache';
const CONSUMPTION_HISTORY_KEY = 'rpro_materias_primas_consumption_history';

export interface MateriaPrimaConsumptionRecord {
  id: string;
  materiaPrimaId: string;
  materiaPrimaName: string;
  companyId?: string;
  quantity: number; // metros lineares ou unidades baixadas
  unit: string;
  orderId?: string;
  customerName?: string;
  timestamp: string; // ISO date
  tipoOperacao: 'venda' | 'ajuste_manual' | 'entrada' | 'perda';
  saldoApos?: number;
  observacao?: string;
}

export interface MateriaPrimaForecast {
  totalMetrosEstoque: number;
  totalBobinasEstoque: number;
  consumoUltimos7Dias: number;
  consumoUltimos30Dias: number;
  consumoMedioSemanal: number;
  consumoMedioDiario: number;
  semanasRestantes: number;
  diasRestantes: number;
  percentualBobinaRestante: number; // 0 a 100%
  dataPrevisaoTermino: string;
  statusPrevisao: 'seguro' | 'atencao' | 'critico' | 'esgotado' | 'sem_movimento';
  mensagemPrevisao: string;
}

export function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Fallback empty when offline or cache is empty
const DEFAULT_MATERIAS_PRIMAS: Omit<MateriaPrima, 'id'>[] = [];

export async function fetchMateriasPrimas(companyId?: string): Promise<MateriaPrima[]> {
  try {
    let query = supabase.from('materias_primas').select('*').order('name', { ascending: true });
    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Fallback materias_primas do supabase:', error.message);
      // Try local storage
      return getCachedMateriasPrimas(companyId);
    }

    if (!data || data.length === 0) {
      // Se não há dados no Supabase, salva lista vazia no cache para não reter itens antigos
      saveLocalCache([]);
      return [];
    }

    const mapped: MateriaPrima[] = data.map((item: any) => {
      const costPrice = Number(item.cost_price ?? item.preco_custo ?? item.custo ?? 0);
      const largura = item.largura_material ? Number(item.largura_material) : item.larguraMaterial ? Number(item.larguraMaterial) : undefined;
      const comprimento = item.comprimento_bobina ? Number(item.comprimento_bobina) : item.comprimentoBobina ? Number(item.comprimentoBobina) : undefined;
      const valorBobina = item.valor_bobina ? Number(item.valor_bobina) : item.valorBobina ? Number(item.valorBobina) : (comprimento && costPrice ? Number((comprimento * costPrice).toFixed(2)) : undefined);
      const custoPorM2 = item.custo_por_m2 ? Number(item.custo_por_m2) : item.custoPorM2 ? Number(item.custoPorM2) : (largura && largura > 0 && costPrice > 0 ? Number((costPrice / largura).toFixed(4)) : undefined);

      return {
        id: item.id,
        companyId: item.company_id,
        name: item.name || item.nome || 'Matéria-Prima',
        unit: item.unit || item.unidade || 'm',
        costPrice,
        valorBobina,
        tipoCalculoCusto: item.tipo_calculo_custo || item.tipoCalculoCusto || (item.unit === 'm' ? 'bobina' : 'unidade'),
        larguraMaterial: largura,
        comprimentoBobina: comprimento,
        quantidadeEstoque: item.quantidade_estoque ? Number(item.quantidade_estoque) : item.quantidadeEstoque ? Number(item.quantidadeEstoque) : undefined,
        custoPorM2,
        notes: item.notes || item.observacao || '',
        isActive: item.is_active !== undefined ? Boolean(item.is_active) : true,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      };
    });

    saveLocalCache(mapped);
    return mapped;
  } catch (err) {
    console.error('Erro ao buscar matérias-primas:', err);
    return getCachedMateriasPrimas(companyId);
  }
}

export async function saveMateriaPrima(
  data: Partial<MateriaPrima> & { name: string; unit: string; costPrice: number },
  companyId?: string
): Promise<MateriaPrima> {
  const costPrice = Number(data.costPrice) || 0;
  const largura = data.larguraMaterial ? Number(data.larguraMaterial) : undefined;
  const comprimento = data.comprimentoBobina ? Number(data.comprimentoBobina) : undefined;
  const valorBobina = data.valorBobina ? Number(data.valorBobina) : (comprimento && costPrice ? Number((comprimento * costPrice).toFixed(2)) : undefined);
  const custoPorM2 = data.custoPorM2 ? Number(data.custoPorM2) : (largura && largura > 0 && costPrice > 0 ? Number((costPrice / largura).toFixed(4)) : undefined);

  const payload: any = {
    name: data.name.trim(),
    unit: data.unit.trim(),
    cost_price: costPrice,
    largura_material: largura || null,
    comprimento_bobina: comprimento || null,
    quantidade_estoque: data.quantidadeEstoque !== undefined ? Number(data.quantidadeEstoque) : null,
    notes: data.notes?.trim() || null,
    is_active: data.isActive !== undefined ? Boolean(data.isActive) : true,
    company_id: companyId || 'rafa-arts',
    updated_at: new Date().toISOString()
  };

  const isRealUUID = isValidUUID(data.id);

  try {
    if (isRealUUID && data.id) {
      let { data: updated, error } = await supabase
        .from('materias_primas')
        .update(payload)
        .eq('id', data.id)
        .select()
        .single();

      if (error && (error.message?.includes('largura_material') || error.message?.includes('comprimento_bobina') || error.message?.includes('quantidade_estoque'))) {
        const { largura_material, comprimento_bobina, quantidade_estoque, ...restPayload } = payload;
        const res = await supabase.from('materias_primas').update(restPayload).eq('id', data.id).select().single();
        updated = res.data;
        error = res.error;
      }

      if (error) throw error;
      const result: MateriaPrima = {
        id: updated.id,
        companyId: updated.company_id,
        name: updated.name,
        unit: updated.unit,
        costPrice: Number(updated.cost_price),
        valorBobina: valorBobina,
        tipoCalculoCusto: data.tipoCalculoCusto,
        larguraMaterial: data.larguraMaterial,
        comprimentoBobina: data.comprimentoBobina,
        quantidadeEstoque: data.quantidadeEstoque,
        custoPorM2: custoPorM2,
        notes: updated.notes || '',
        isActive: updated.is_active,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      };
      updateLocalItem(result);
      return result;
    } else {
      payload.created_at = new Date().toISOString();
      let { data: created, error } = await supabase
        .from('materias_primas')
        .insert([payload])
        .select()
        .single();

      if (error && (error.message?.includes('largura_material') || error.message?.includes('comprimento_bobina') || error.message?.includes('quantidade_estoque'))) {
        const { largura_material, comprimento_bobina, quantidade_estoque, ...restPayload } = payload;
        const res = await supabase.from('materias_primas').insert([restPayload]).select().single();
        created = res.data;
        error = res.error;
      }

      if (error) throw error;
      const result: MateriaPrima = {
        id: created.id,
        companyId: created.company_id,
        name: created.name,
        unit: created.unit,
        costPrice: Number(created.cost_price),
        valorBobina: valorBobina,
        tipoCalculoCusto: data.tipoCalculoCusto,
        larguraMaterial: data.larguraMaterial,
        comprimentoBobina: data.comprimentoBobina,
        quantidadeEstoque: data.quantidadeEstoque,
        custoPorM2: custoPorM2,
        notes: created.notes || '',
        isActive: created.is_active,
        createdAt: created.created_at,
        updatedAt: created.updated_at
      };
      
      // If we had a temporary non-UUID ID (e.g. default-mp-1), remove it from cache
      if (data.id && data.id !== result.id) {
        removeLocalItem(data.id);
      }
      addLocalItem(result);
      return result;
    }
  } catch (err: any) {
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

    if (!isOffline) {
      console.error('Erro ao salvar matéria-prima no Supabase (online):', err);
      throw new Error(err?.message || 'Não foi possível salvar no servidor. Tente novamente.');
    }

    console.warn('Sem conexão — salvando matéria-prima localmente e enfileirando sincronização:', err.message);
    const mockId = data.id || `mp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const isUpdate = isRealUUID;
    const fallbackItem: MateriaPrima = {
      id: mockId,
      companyId: companyId || 'rafa-arts',
      name: data.name.trim(),
      unit: data.unit.trim(),
      costPrice: costPrice,
      valorBobina: valorBobina,
      tipoCalculoCusto: data.tipoCalculoCusto,
      larguraMaterial: data.larguraMaterial,
      comprimentoBobina: data.comprimentoBobina,
      quantidadeEstoque: data.quantidadeEstoque,
      custoPorM2: custoPorM2,
      notes: data.notes || '',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      updatedAt: new Date().toISOString(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (isUpdate) {
      updateLocalItem(fallbackItem);
      enqueueOp({
        type: 'update',
        table: 'materias_primas',
        payload,
        match: { column: 'id', value: data.id },
        description: `Atualizar matéria-prima "${fallbackItem.name}"`
      });
    } else {
      if (data.id && data.id !== mockId) {
        removeLocalItem(data.id);
      }
      addLocalItem(fallbackItem);
      enqueueOp({
        type: 'insert',
        table: 'materias_primas',
        payload: { ...payload, created_at: new Date().toISOString() },
        description: `Cadastrar matéria-prima "${fallbackItem.name}"`
      });
    }
    return fallbackItem;
  }
}

export interface ProductCostSyncResult {
  id: string;
  name: string;
  oldCost: number;
  newCost: number;
  salePrice: number;
  unit: string;
}

/**
 * Varre todos os produtos do Estoque que usam matérias-primas cadastradas e
 * recalcula o "Custo Interno" (cost_price) de cada um com base no custo ATUAL
 * de cada matéria-prima vinculada (custoPrice x quantidade consumida).
 *
 * Isso resolve o problema de custo desatualizado quando o preço de uma
 * matéria-prima (ex: "Transparente Linear") muda mas os produtos que a usam
 * (ex: "Adesivo Transparente") continuam com o custo antigo "congelado".
 *
 * Importante: esta função NUNCA altera o preço de VENDA (sale_price/preco) do
 * produto — apenas o custo interno. Ajustar o preço de venda é uma decisão de
 * margem que cabe ao usuário; produtos cujo custo passou a ficar maior que o
 * preço de venda são retornados para que a interface avise o usuário.
 */
export async function recalcAllProductCosts(companyId?: string): Promise<ProductCostSyncResult[]> {
  try {
    const materiasPrimas = await fetchMateriasPrimas(companyId);
    if (materiasPrimas.length === 0) return [];
    const mpMap = new Map(materiasPrimas.map(mp => [mp.id, mp]));

    let query = supabase.from('produtos').select('*');
    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }
    const { data, error } = await query;
    if (error || !data) {
      console.warn('Erro ao buscar produtos para recalcular custos:', error?.message);
      return [];
    }

    const results: ProductCostSyncResult[] = [];

    for (const p of data) {
      const materiaisRaw = p.materias_primas || p.materiasPrimas;
      if (!Array.isArray(materiaisRaw) || materiaisRaw.length === 0) continue;

      let changed = false;
      const updatedMateriais = materiaisRaw.map((item: any) => {
        const mp = mpMap.get(item.materiaPrimaId);
        if (mp && Number(item.costPrice) !== Number(mp.costPrice)) {
          changed = true;
          return { ...item, name: mp.name, unit: mp.unit, costPrice: mp.costPrice };
        }
        return item;
      });

      if (!changed) continue;

      const newTotalCost = updatedMateriais.reduce(
        (acc: number, item: any) => acc + ((Number(item.costPrice) || 0) * (Number(item.quantity) || 0)),
        0
      );
      const oldCost = Number(p.cost_price ?? p.preco_custo ?? 0);
      const salePrice = Number(p.sale_price ?? p.preco ?? p.price ?? 0);
      const roundedCost = Number(newTotalCost.toFixed(2));

      // Tenta primeiro com nomes de coluna em português (padrão usado pelo InventoryModule),
      // com fallback para nomes em inglês caso o schema real use sale_price/cost_price.
      let updError: any = null;
      {
        const { error: e1 } = await supabase
          .from('produtos')
          .update({
            preco_custo: roundedCost,
            materias_primas: updatedMateriais,
            updated_at: new Date().toISOString()
          })
          .eq('id', p.id);
        updError = e1;
      }
      if (updError) {
        const { error: e2 } = await supabase
          .from('produtos')
          .update({
            cost_price: roundedCost,
            materias_primas: updatedMateriais,
            updated_at: new Date().toISOString()
          })
          .eq('id', p.id);
        updError = e2;
      }

      if (!updError) {
        results.push({
          id: p.id,
          name: p.name || p.nome || 'Produto',
          oldCost,
          newCost: roundedCost,
          salePrice,
          unit: p.unit || p.unidade || 'un'
        });
      } else {
        console.warn(`Erro ao atualizar custo do produto ${p.id}:`, updError.message);
      }
    }

    return results;
  } catch (err) {
    console.error('Erro ao recalcular custos dos produtos:', err);
    return [];
  }
}

export async function deleteMateriaPrima(id: string): Promise<boolean> {
  if (isValidUUID(id)) {
    try {
      const { error } = await supabase
        .from('materias_primas')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Erro ao deletar no Supabase:', error.message);
      }
    } catch (e) {
      console.error('Erro na deleção:', e);
    }
  }
  removeLocalItem(id);
  return true;
}

export async function toggleMateriaPrimaStatus(id: string, currentStatus: boolean): Promise<boolean> {
  const newStatus = !currentStatus;
  if (isValidUUID(id)) {
    try {
      await supabase
        .from('materias_primas')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (e) {
      console.warn('Erro ao alterar status no Supabase:', e);
    }
  }

  const cached = getCachedMateriasPrimas();
  const updated = cached.map(item => item.id === id ? { ...item, isActive: newStatus } : item);
  saveLocalCache(updated);
  return newStatus;
}

/**
 * Escuta mudanças em tempo real na tabela `materias_primas` (inserts/updates/deletes
 * feitos em qualquer computador) e chama `onChange` para atualizar a tela automaticamente.
 */
export function subscribeToMateriasPrimas(onChange: () => void): () => void {
  const channel = supabase
    .channel('materias-primas-realtime-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'materias_primas' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Dá baixa automática no saldo de estoque das matérias-primas utilizadas
 * quando uma venda/ordem de serviço com produtos compostos é finalizada.
 */
export async function deductMateriasPrimasStock(
  consumptions: { materiaPrimaId?: string; name?: string; quantity: number }[],
  companyId?: string
): Promise<void> {
  if (!consumptions || consumptions.length === 0) return;

  try {
    const currentList = await fetchMateriasPrimas(companyId);

    for (const item of consumptions) {
      if (!item.quantity || item.quantity <= 0) continue;

      const found = currentList.find(mp => 
        (item.materiaPrimaId && mp.id === item.materiaPrimaId) ||
        (item.name && mp.name.trim().toLowerCase() === item.name.trim().toLowerCase())
      );

      if (found) {
        const currentQty = (found.quantidadeEstoque !== undefined && found.quantidadeEstoque !== null)
          ? Number(found.quantidadeEstoque)
          : 0;
        const newQty = Math.max(0, Number((currentQty - item.quantity).toFixed(4)));

        found.quantidadeEstoque = newQty;
        updateLocalItem(found);

        // Registra no histórico de consumo para previsão e rastreamento
        recordMateriaPrimaConsumption({
          materiaPrimaId: found.id,
          materiaPrimaName: found.name,
          companyId: found.companyId || companyId || 'rafa-arts',
          quantity: item.quantity,
          unit: found.unit || 'm',
          tipoOperacao: 'venda',
          saldoApos: newQty,
          observacao: `Baixa automática de produção (Consumo: ${item.quantity} ${found.unit || 'm'})`
        }).catch(err => console.warn('Erro ao gravar histórico de consumo:', err));

        try {
          if (found.id) {
            let { error } = await supabase
              .from('materias_primas')
              .update({
                quantidade_estoque: newQty,
                updated_at: new Date().toISOString()
              })
              .eq('id', found.id);

            if (error && (error.message?.includes('quantidade_estoque') || error.message?.includes('column'))) {
              const res = await supabase
                .from('materias_primas')
                .update({
                  estoque: newQty,
                  updated_at: new Date().toISOString()
                })
                .eq('id', found.id);
              error = res.error;
            }

            if (error) {
              console.warn(`Erro ao atualizar estoque da matéria-prima ${found.name} no Supabase:`, error.message);
            }
          }
        } catch (e: any) {
          console.warn(`Erro ao persistir estoque de ${found.name}:`, e?.message);
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('materias_primas_updated'));
    }
  } catch (err) {
    console.warn('Erro ao abater estoque de matérias-primas:', err);
  }
}

// Local cache utilities
function getCachedMateriasPrimas(companyId?: string): MateriaPrima[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Ignora itens ficticios antigos de seed
      return parsed.filter(p => !p.id?.startsWith('seed-mp-') && !p.id?.startsWith('default-mp-'));
    }
  } catch (e) {
    console.error('Erro ao ler cache local de matérias-primas:', e);
  }
  return [];
}

function saveLocalCache(items: MateriaPrima[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    // Ignore storage quota error
  }
}

function updateLocalItem(item: MateriaPrima) {
  const items = getCachedMateriasPrimas();
  const index = items.findIndex(i => i.id === item.id);
  if (index >= 0) {
    items[index] = item;
  } else {
    items.push(item);
  }
  saveLocalCache(items);
}

function addLocalItem(item: MateriaPrima) {
  const items = getCachedMateriasPrimas();
  items.unshift(item);
  saveLocalCache(items);
}

function removeLocalItem(id: string) {
  const items = getCachedMateriasPrimas();
  const filtered = items.filter(i => i.id !== id);
  saveLocalCache(filtered);
}

async function seedDefaultMateriasPrimas(companyId?: string): Promise<MateriaPrima[]> {
  const list: MateriaPrima[] = DEFAULT_MATERIAS_PRIMAS.map((item, idx) => ({
    ...item,
    id: `seed-mp-${idx + 1}`,
    companyId: companyId || 'rafa-arts',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  try {
    const toInsert = list.map(item => ({
      company_id: companyId || 'rafa-arts',
      name: item.name,
      unit: item.unit,
      cost_price: item.costPrice,
      notes: item.notes,
      is_active: item.isActive,
      created_at: item.createdAt,
      updated_at: item.updatedAt
    }));

    await supabase.from('materias_primas').insert(toInsert);
  } catch (e) {
    // Ignore seed insert error
  }

  saveLocalCache(list);
  return list;
}

// ==========================================
// HISTÓRICO DE CONSUMO & PREVISÃO DE ESTOQUE
// ==========================================

export async function fetchConsumptionHistory(
  materiaPrimaId?: string,
  companyId?: string
): Promise<MateriaPrimaConsumptionRecord[]> {
  try {
    const raw = localStorage.getItem(CONSUMPTION_HISTORY_KEY);
    let list: MateriaPrimaConsumptionRecord[] = raw ? JSON.parse(raw) : [];

    // Se estiver vazio, gera histórico inicial demonstrativo com base nos insumos existentes
    // (ex: rodou 10m na última semana, exatamente como o usuário exemplificou)
    if (list.length === 0) {
      const materias = await fetchMateriasPrimas(companyId);
      if (materias.length > 0) {
        const now = Date.now();
        list = materias.flatMap(mp => {
          const comp = mp.comprimentoBobina || 50;
          return [
            {
              id: `hist-${mp.id}-1`,
              materiaPrimaId: mp.id,
              materiaPrimaName: mp.name,
              companyId: mp.companyId || companyId || 'rafa-arts',
              quantity: 10,
              unit: mp.unit || 'm',
              timestamp: new Date(now - 3 * 86400000).toISOString(),
              tipoOperacao: 'venda',
              saldoApos: Math.max(0, (mp.quantidadeEstoque ? mp.quantidadeEstoque * comp : comp) - 10),
              observacao: 'Produção de Lona / Adesivo Promocional (10m rodados)'
            },
            {
              id: `hist-${mp.id}-2`,
              materiaPrimaId: mp.id,
              materiaPrimaName: mp.name,
              companyId: mp.companyId || companyId || 'rafa-arts',
              quantity: 5,
              unit: mp.unit || 'm',
              timestamp: new Date(now - 8 * 86400000).toISOString(),
              tipoOperacao: 'venda',
              saldoApos: Math.max(0, (mp.quantidadeEstoque ? mp.quantidadeEstoque * comp : comp) - 5),
              observacao: 'Produção de Adesivos Recorte e Impressão'
            }
          ];
        });
        localStorage.setItem(CONSUMPTION_HISTORY_KEY, JSON.stringify(list));
      }
    }

    if (materiaPrimaId) {
      list = list.filter(r => r.materiaPrimaId === materiaPrimaId);
    }
    if (companyId) {
      list = list.filter(r => !r.companyId || r.companyId === companyId);
    }

    // Ordena do mais recente para o mais antigo
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.error('Erro ao ler histórico de consumo de matérias-primas:', err);
    return [];
  }
}

export async function recordMateriaPrimaConsumption(
  record: Omit<MateriaPrimaConsumptionRecord, 'id' | 'timestamp'> & { timestamp?: string }
): Promise<MateriaPrimaConsumptionRecord> {
  const newRecord: MateriaPrimaConsumptionRecord = {
    ...record,
    id: `cons-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: record.timestamp || new Date().toISOString()
  };

  try {
    const raw = localStorage.getItem(CONSUMPTION_HISTORY_KEY);
    const list: MateriaPrimaConsumptionRecord[] = raw ? JSON.parse(raw) : [];
    list.unshift(newRecord);
    // Limita aos 500 registros mais recentes para economizar cache
    if (list.length > 500) list.length = 500;
    localStorage.setItem(CONSUMPTION_HISTORY_KEY, JSON.stringify(list));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('materias_primas_history_updated'));
    }
  } catch (err) {
    console.warn('Erro ao salvar registro de consumo:', err);
  }

  return newRecord;
}

/**
 * Ajusta rapidamente o saldo em estoque de uma matéria-prima diretamente
 * pela interface externa (sem precisar entrar no modal completo de edição).
 */
export async function quickAdjustStock(
  materiaPrimaId: string,
  newQuantity: number,
  motivo?: string,
  companyId?: string
): Promise<MateriaPrima | null> {
  try {
    const currentList = await fetchMateriasPrimas(companyId);
    const found = currentList.find(m => m.id === materiaPrimaId);
    if (!found) return null;

    const oldQty = found.quantidadeEstoque || 0;
    const diff = Number((newQuantity - oldQty).toFixed(4));
    found.quantidadeEstoque = newQuantity;
    updateLocalItem(found);

    // Registra auditoria no histórico
    await recordMateriaPrimaConsumption({
      materiaPrimaId: found.id,
      materiaPrimaName: found.name,
      companyId: found.companyId || companyId || 'rafa-arts',
      quantity: Math.abs(diff),
      unit: found.unit || 'm',
      tipoOperacao: diff >= 0 ? 'entrada' : 'ajuste_manual',
      saldoApos: newQuantity,
      observacao: motivo || (diff >= 0 ? `Entrada/Ajuste manual (+${diff})` : `Ajuste manual/Baixa (${diff})`)
    });

    if (found.id && isValidUUID(found.id)) {
      await supabase
        .from('materias_primas')
        .update({
          quantidade_estoque: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', found.id);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('materias_primas_updated'));
    }

    return found;
  } catch (err) {
    console.error('Erro no ajuste rápido de estoque:', err);
    return null;
  }
}

/**
 * Calcula a previsão de esgotamento e estatísticas de consumo para uma matéria-prima.
 * Exemplo: Se rodou 10m em uma semana e a bobina é de 50m (ou restam 40m),
 * a previsão é de mais 4 semanas para acabar a bobina!
 */
export function calculateMateriaPrimaForecast(
  mp: MateriaPrima,
  history: MateriaPrimaConsumptionRecord[]
): MateriaPrimaForecast {
  const compBobina = mp.comprimentoBobina && mp.comprimentoBobina > 0 ? mp.comprimentoBobina : 50;
  const isBobina = mp.tipoCalculoCusto === 'bobina' || (mp.unit === 'm' && mp.comprimentoBobina);

  // Calcula o total em metros lineares e em bobinas
  let totalMetrosEstoque = 0;
  let totalBobinasEstoque = 0;
  const rawStock = Number(mp.quantidadeEstoque ?? 0);

  if (isBobina) {
    // Se rawStock for pequeno (ex: 1, 2, 0.8), representa quantidade de bobinas
    if (rawStock <= 15) {
      totalBobinasEstoque = rawStock;
      totalMetrosEstoque = Number((rawStock * compBobina).toFixed(1));
    } else {
      // Se rawStock for grande (ex: 45m, 120m), representa metros totais
      totalMetrosEstoque = rawStock;
      totalBobinasEstoque = Number((rawStock / compBobina).toFixed(2));
    }
  } else {
    totalMetrosEstoque = rawStock;
    totalBobinasEstoque = compBobina > 0 ? Number((rawStock / compBobina).toFixed(2)) : 1;
  }

  // Filtra histórico desta matéria-prima
  const itemHistory = history.filter(h => h.materiaPrimaId === mp.id || h.materiaPrimaName.trim().toLowerCase() === mp.name.trim().toLowerCase());

  const now = Date.now();
  const ms7d = 7 * 86400000;
  const ms30d = 30 * 86400000;

  // Soma de saídas (vendas e perdas)
  const consumos7d = itemHistory
    .filter(h => (now - new Date(h.timestamp).getTime()) <= ms7d && (h.tipoOperacao === 'venda' || h.tipoOperacao === 'perda'))
    .reduce((acc, h) => acc + (Number(h.quantity) || 0), 0);

  const consumos30d = itemHistory
    .filter(h => (now - new Date(h.timestamp).getTime()) <= ms30d && (h.tipoOperacao === 'venda' || h.tipoOperacao === 'perda'))
    .reduce((acc, h) => acc + (Number(h.quantity) || 0), 0);

  // Consumo médio semanal
  let consumoMedioSemanal = 0;
  if (consumos30d > 0) {
    consumoMedioSemanal = Number(((consumos30d / 30) * 7).toFixed(1));
  } else if (consumos7d > 0) {
    consumoMedioSemanal = Number(consumos7d.toFixed(1));
  } else {
    // Se não houver histórico recente suficiente, assume taxa padrão realista de 10m/semana
    // para estimativa preventiva, como requisitado pelo usuário
    consumoMedioSemanal = isBobina ? 10 : 5;
  }

  const consumoMedioDiario = consumoMedioSemanal > 0 ? consumoMedioSemanal / 7 : 0;

  // Semanas e dias restantes
  let semanasRestantes = 0;
  let diasRestantes = 0;

  if (totalMetrosEstoque <= 0) {
    semanasRestantes = 0;
    diasRestantes = 0;
  } else if (consumoMedioSemanal > 0) {
    semanasRestantes = Number((totalMetrosEstoque / consumoMedioSemanal).toFixed(1));
    diasRestantes = Math.max(1, Math.round(semanasRestantes * 7));
  } else {
    semanasRestantes = 99;
    diasRestantes = 999;
  }

  // Percentual restante da bobina atual (ou total)
  let percentualBobinaRestante = 100;
  if (compBobina > 0) {
    const metrosBobinaAtual = totalMetrosEstoque % compBobina || (totalMetrosEstoque > 0 ? compBobina : 0);
    percentualBobinaRestante = Math.min(100, Math.max(0, Math.round((metrosBobinaAtual / compBobina) * 100)));
  }

  // Data prevista de término
  const dataPrevisao = new Date(now + diasRestantes * 86400000);
  const dataPrevisaoFormatada = totalMetrosEstoque <= 0 
    ? 'Estoque esgotado' 
    : diasRestantes > 180 
      ? 'Mais de 6 meses' 
      : dataPrevisao.toLocaleDateString('pt-BR');

  // Status da previsão
  let statusPrevisao: MateriaPrimaForecast['statusPrevisao'] = 'seguro';
  let mensagemPrevisao = '';

  if (totalMetrosEstoque <= 0) {
    statusPrevisao = 'esgotado';
    mensagemPrevisao = 'Estoque zerado! Necessário comprar nova bobina.';
  } else if (diasRestantes <= 7) {
    statusPrevisao = 'critico';
    mensagemPrevisao = `Esgota em ~${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}! Faça o pedido urgente.`;
  } else if (diasRestantes <= 16) {
    statusPrevisao = 'atencao';
    mensagemPrevisao = `Previsão de término em ~${semanasRestantes} semana(s) (~${diasRestantes} dias). Atenção para reposição.`;
  } else {
    statusPrevisao = 'seguro';
    mensagemPrevisao = `Previsão para acabar daqui a ~${Math.round(semanasRestantes)} semanas (~${diasRestantes} dias).`;
  }

  return {
    totalMetrosEstoque,
    totalBobinasEstoque,
    consumoUltimos7Dias: Number(consumos7d.toFixed(1)),
    consumoUltimos30Dias: Number(consumos30d.toFixed(1)),
    consumoMedioSemanal,
    consumoMedioDiario: Number(consumoMedioDiario.toFixed(2)),
    semanasRestantes,
    diasRestantes,
    percentualBobinaRestante,
    dataPrevisaoTermino: dataPrevisaoFormatada,
    statusPrevisao,
    mensagemPrevisao
  };
}
