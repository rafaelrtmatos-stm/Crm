import { supabase } from '../supabase';
import { MateriaPrima } from '../types';

const LOCAL_STORAGE_KEY = 'rpro_materias_primas_cache';

// Mock/Initial raw materials for graphics shop if table is empty
const DEFAULT_MATERIAS_PRIMAS: Omit<MateriaPrima, 'id'>[] = [
  { name: 'Adesivo Vinil Branco Brilho', unit: 'm²', costPrice: 14.50, notes: 'Bobina 1.52m / impressão solvente', isActive: true },
  { name: 'Adesivo Vinil Fosco', unit: 'm²', costPrice: 15.20, notes: 'Bobina 1.52m / alta aderência', isActive: true },
  { name: 'Película Transparente / Laminação', unit: 'm²', costPrice: 8.90, notes: 'Proteção UV e abrasão', isActive: true },
  { name: 'Adesivo Transparente', unit: 'm²', costPrice: 16.00, notes: 'Para vitrines e vidros', isActive: true },
  { name: 'Lona Frontlight 440g', unit: 'm²', costPrice: 18.00, notes: 'Lona reforçada para banners e fachadas', isActive: true },
  { name: 'Lona Backlight 440g', unit: 'm²', costPrice: 24.00, notes: 'Translúcida para painéis iluminados', isActive: true },
  { name: 'Chapa ACM 3mm', unit: 'm²', costPrice: 110.00, notes: 'Painel de alumínio composto', isActive: true },
  { name: 'Chapa PS 2mm Branco', unit: 'm²', costPrice: 38.00, notes: 'Poliestireno para placas', isActive: true },
  { name: 'Tinta Solvente / Litro', unit: 'l', costPrice: 120.00, notes: 'Consumo médio 12ml por m²', isActive: true },
  { name: 'Ilhós Metálico N° 5', unit: 'un', costPrice: 0.15, notes: 'Acabamento de borda em lonas', isActive: true },
  { name: 'Bastão de Madeira c/ Ponteira', unit: 'm', costPrice: 4.50, notes: 'Montagem de banner', isActive: true },
  { name: 'Fita Dupla Face Alta Fixação', unit: 'm', costPrice: 2.80, notes: 'Fixação de placas e totens', isActive: true }
];

export async function fetchMateriasPrimas(companyId?: string): Promise<MateriaPrima[]> {
  try {
    let query = supabase.from('materias_primas').select('*').order('name', { ascending: true });
    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Fallback materias_primas do supabase:', error.message);
      // Try local storage or default
      return getCachedMateriasPrimas(companyId);
    }

    if (!data || data.length === 0) {
      // Check if we have cached or if we should seed default
      const cached = getCachedMateriasPrimas(companyId);
      if (cached.length > 0) return cached;

      // Try seeding defaults in background
      const seeded = await seedDefaultMateriasPrimas(companyId);
      return seeded;
    }

    const mapped: MateriaPrima[] = data.map((item: any) => ({
      id: item.id,
      companyId: item.company_id,
      name: item.name || item.nome || 'Matéria-Prima',
      unit: item.unit || item.unidade || 'un',
      costPrice: Number(item.cost_price ?? item.preco_custo ?? item.custo ?? 0),
      notes: item.notes || item.observacao || '',
      isActive: item.is_active !== undefined ? Boolean(item.is_active) : true,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));

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
  const payload: any = {
    name: data.name.trim(),
    unit: data.unit.trim(),
    cost_price: Number(data.costPrice) || 0,
    notes: data.notes?.trim() || null,
    is_active: data.isActive !== undefined ? Boolean(data.isActive) : true,
    company_id: companyId || 'rafa-arts',
    updated_at: new Date().toISOString()
  };

  try {
    if (data.id) {
      const { data: updated, error } = await supabase
        .from('materias_primas')
        .update(payload)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      const result: MateriaPrima = {
        id: updated.id,
        companyId: updated.company_id,
        name: updated.name,
        unit: updated.unit,
        costPrice: Number(updated.cost_price),
        notes: updated.notes || '',
        isActive: updated.is_active,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      };
      updateLocalItem(result);
      return result;
    } else {
      payload.created_at = new Date().toISOString();
      const { data: created, error } = await supabase
        .from('materias_primas')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      const result: MateriaPrima = {
        id: created.id,
        companyId: created.company_id,
        name: created.name,
        unit: created.unit,
        costPrice: Number(created.cost_price),
        notes: created.notes || '',
        isActive: created.is_active,
        createdAt: created.created_at,
        updatedAt: created.updated_at
      };
      addLocalItem(result);
      return result;
    }
  } catch (err: any) {
    console.warn('Erro ao salvar no Supabase, salvando localmente:', err.message);
    const mockId = data.id || `mp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const fallbackItem: MateriaPrima = {
      id: mockId,
      companyId: companyId || 'rafa-arts',
      name: data.name.trim(),
      unit: data.unit.trim(),
      costPrice: Number(data.costPrice) || 0,
      notes: data.notes || '',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      updatedAt: new Date().toISOString(),
      createdAt: data.createdAt || new Date().toISOString()
    };
    if (data.id) {
      updateLocalItem(fallbackItem);
    } else {
      addLocalItem(fallbackItem);
    }
    return fallbackItem;
  }
}

export async function deleteMateriaPrima(id: string): Promise<boolean> {
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
  removeLocalItem(id);
  return true;
}

export async function toggleMateriaPrimaStatus(id: string, currentStatus: boolean): Promise<boolean> {
  const newStatus = !currentStatus;
  try {
    await supabase
      .from('materias_primas')
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
  } catch (e) {
    console.warn('Erro ao alterar status no Supabase:', e);
  }

  const cached = getCachedMateriasPrimas();
  const updated = cached.map(item => item.id === id ? { ...item, isActive: newStatus } : item);
  saveLocalCache(updated);
  return newStatus;
}

// Local cache utilities
function getCachedMateriasPrimas(companyId?: string): MateriaPrima[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const seeded = DEFAULT_MATERIAS_PRIMAS.map((item, idx) => ({
        ...item,
        id: `default-mp-${idx + 1}`,
        companyId: companyId || 'rafa-arts',
        createdAt: new Date().toISOString()
      }));
      saveLocalCache(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
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
