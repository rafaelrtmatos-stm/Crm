import { supabase } from '../supabase';
import { MateriaPrima } from '../types';
import { enqueueOp } from './offlineSync';

const LOCAL_STORAGE_KEY = 'rpro_materias_primas_cache';

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
