import { supabase } from '../supabase';
import { Maquina } from '../types';

const LOCAL_STORAGE_KEY = 'rpro_maquinas_cache';

export const DEFAULT_MAQUINAS_LIST: Omit<Maquina, 'id'>[] = [
  {
    nome: 'Plotter de Impressão Solvente / Eco (1.60m)',
    ativa: true,
    tipo: 'impressao',
    valorMaquina: 65000,
    vidaUtilAnos: 5,
    horasUsoMes: 120,
    manutencaoAnual: 6000,
    potenciaKw: 2.2,
    velocidadeProducaoM2H: 12,
    tintaQuantidadeMl: 1000,
    tintaValor: 180,
    tintaConsumoMlM2: 15,
    cabecaValor: 8500,
    cabecaVidaUtilHoras: 2500,
    tarifaKwh: 0.98,
    observacoes: 'Ideal para lonas, adesivos brilho/fosco e banners'
  },
  {
    nome: 'Impressora Digital UV Flatbed / Híbrida',
    ativa: true,
    tipo: 'impressao',
    valorMaquina: 140000,
    vidaUtilAnos: 5,
    horasUsoMes: 100,
    manutencaoAnual: 9600,
    potenciaKw: 3.5,
    velocidadeProducaoM2H: 15,
    tintaQuantidadeMl: 1000,
    tintaValor: 380,
    tintaConsumoMlM2: 12,
    cabecaValor: 12000,
    cabecaVidaUtilHoras: 3000,
    tarifaKwh: 0.98,
    observacoes: 'Impressão direta em rígidos: PS, ACM, Acrílico, MDF e Vidro'
  },
  {
    nome: 'Router CNC 3D (Corte e Usinagem)',
    ativa: true,
    tipo: 'router',
    valorMaquina: 85000,
    vidaUtilAnos: 6,
    horasUsoMes: 140,
    manutencaoAnual: 8000,
    potenciaKw: 4.5,
    velocidadeProducaoM2H: 10,
    tintaQuantidadeMl: 0,
    tintaValor: 0,
    tintaConsumoMlM2: 0,
    cabecaValor: 450,
    cabecaVidaUtilHoras: 150,
    tarifaKwh: 0.98,
    observacoes: 'Usinagem pesada de chapas e letras-caixa'
  },
  {
    nome: 'Máquina de Corte & Gravação Laser CO2 (100W)',
    ativa: true,
    tipo: 'laser',
    valorMaquina: 42000,
    vidaUtilAnos: 4,
    horasUsoMes: 100,
    manutencaoAnual: 4800,
    potenciaKw: 2.0,
    velocidadeProducaoM2H: 8,
    tintaQuantidadeMl: 0,
    tintaValor: 0,
    tintaConsumoMlM2: 0,
    cabecaValor: 4500,
    cabecaVidaUtilHoras: 1500,
    tarifaKwh: 0.98,
    observacoes: 'Corte preciso em acrílico, MDF e brindes'
  },
  {
    nome: 'Plotter de Recorte Vinil',
    ativa: true,
    tipo: 'corte',
    valorMaquina: 12000,
    vidaUtilAnos: 5,
    horasUsoMes: 80,
    manutencaoAnual: 1200,
    potenciaKw: 0.3,
    velocidadeProducaoM2H: 25,
    tintaQuantidadeMl: 0,
    tintaValor: 0,
    tintaConsumoMlM2: 0,
    cabecaValor: 150,
    cabecaVidaUtilHoras: 300,
    tarifaKwh: 0.98,
    observacoes: 'Recorte de adesivos e decalques'
  },
  {
    nome: 'Prensa Térmica / Transfer Sublimático',
    ativa: true,
    tipo: 'prensa',
    valorMaquina: 8500,
    vidaUtilAnos: 5,
    horasUsoMes: 60,
    manutencaoAnual: 800,
    potenciaKw: 2.2,
    velocidadeProducaoM2H: 10,
    tintaQuantidadeMl: 0,
    tintaValor: 0,
    tintaConsumoMlM2: 0,
    cabecaValor: 0,
    cabecaVidaUtilHoras: 0,
    tarifaKwh: 0.98,
    observacoes: 'Transfer para tecidos, camisetas e brindes'
  }
];

export async function fetchMaquinas(companyId?: string): Promise<Maquina[]> {
  try {
    let query = supabase.from('maquinas').select('*').order('nome', { ascending: true });
    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Fallback maquinas do supabase:', error.message);
      return getCachedMaquinas(companyId);
    }

    if (!data || data.length === 0) {
      const cached = getCachedMaquinas(companyId);
      if (cached.length > 0) return cached;
      return seedDefaultMaquinas(companyId);
    }

    const mapped: Maquina[] = data.map((item: any) => ({
      id: item.id,
      companyId: item.company_id,
      nome: item.nome || item.name || 'Máquina',
      ativa: item.ativa !== undefined ? Boolean(item.ativa) : item.is_active !== undefined ? Boolean(item.is_active) : true,
      tipo: item.tipo || 'impressao',
      valorMaquina: Number(item.valor_maquina ?? item.valorMaquina ?? 0),
      vidaUtilAnos: Number(item.vida_util_anos ?? item.vidaUtilAnos ?? 5),
      horasUsoMes: Number(item.horas_uso_mes ?? item.horasUsoMes ?? 100),
      manutencaoAnual: Number(item.manutencao_anual ?? item.manutencaoAnual ?? 0),
      potenciaKw: Number(item.potencia_kw ?? item.potenciaKw ?? 0),
      velocidadeProducaoM2H: Number(item.velocidade_producao_m2h ?? item.velocidadeProducaoM2H ?? 10),
      tintaQuantidadeMl: Number(item.tinta_quantidade_ml ?? item.tintaQuantidadeMl ?? 0),
      tintaValor: Number(item.tinta_valor ?? item.tintaValor ?? 0),
      tintaConsumoMlM2: Number(item.tinta_consumo_ml_m2 ?? item.tintaConsumoMlM2 ?? 0),
      cabecaValor: Number(item.cabeca_valor ?? item.cabecaValor ?? 0),
      cabecaVidaUtilHoras: Number(item.cabeca_vida_util_horas ?? item.cabecaVidaUtilHoras ?? 0),
      tarifaKwh: Number(item.tarifa_kwh ?? item.tarifaKwh ?? 0.98),
      observacoes: item.observacoes || item.notes || '',
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));

    saveLocalCache(mapped);
    return mapped;
  } catch (err) {
    console.error('Erro ao buscar máquinas:', err);
    return getCachedMaquinas(companyId);
  }
}

export async function saveMaquina(
  data: Partial<Maquina> & { nome: string },
  companyId?: string
): Promise<Maquina> {
  const payload: any = {
    nome: data.nome.trim(),
    ativa: data.ativa !== undefined ? Boolean(data.ativa) : true,
    tipo: data.tipo || 'impressao',
    valor_maquina: Number(data.valorMaquina) || 0,
    vida_util_anos: Number(data.vidaUtilAnos) || 0,
    horas_uso_mes: Number(data.horasUsoMes) || 0,
    manutencao_anual: Number(data.manutencaoAnual) || 0,
    potencia_kw: Number(data.potenciaKw) || 0,
    velocidade_producao_m2h: Number(data.velocidadeProducaoM2H) || 0,
    tinta_quantidade_ml: Number(data.tintaQuantidadeMl) || 0,
    tinta_valor: Number(data.tintaValor) || 0,
    tinta_consumo_ml_m2: Number(data.tintaConsumoMlM2) || 0,
    cabeca_valor: Number(data.cabecaValor) || 0,
    cabeca_vida_util_horas: Number(data.cabecaVidaUtilHoras) || 0,
    tarifa_kwh: Number(data.tarifaKwh) || 0.98,
    observacoes: data.observacoes?.trim() || null,
    company_id: companyId || 'rafa-arts',
    updated_at: new Date().toISOString()
  };

  try {
    if (data.id && !data.id.startsWith('default-') && !data.id.startsWith('seed-') && !data.id.startsWith('maq-')) {
      const { data: updated, error } = await supabase
        .from('maquinas')
        .update(payload)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      const result: Maquina = {
        id: updated.id,
        companyId: updated.company_id,
        nome: updated.nome,
        ativa: updated.ativa,
        tipo: updated.tipo,
        valorMaquina: Number(updated.valor_maquina),
        vidaUtilAnos: Number(updated.vida_util_anos),
        horasUsoMes: Number(updated.horas_uso_mes),
        manutencaoAnual: Number(updated.manutencao_anual),
        potenciaKw: Number(updated.potencia_kw),
        velocidadeProducaoM2H: Number(updated.velocidade_producao_m2h),
        tintaQuantidadeMl: Number(updated.tinta_quantidade_ml),
        tintaValor: Number(updated.tinta_valor),
        tintaConsumoMlM2: Number(updated.tinta_consumo_ml_m2),
        cabecaValor: Number(updated.cabeca_valor),
        cabecaVidaUtilHoras: Number(updated.cabeca_vida_util_horas),
        tarifaKwh: Number(updated.tarifa_kwh),
        observacoes: updated.observacoes || '',
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      };
      updateLocalItem(result);
      return result;
    } else {
      payload.created_at = new Date().toISOString();
      const { data: created, error } = await supabase
        .from('maquinas')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      const result: Maquina = {
        id: created.id,
        companyId: created.company_id,
        nome: created.nome,
        ativa: created.ativa,
        tipo: created.tipo,
        valorMaquina: Number(created.valor_maquina),
        vidaUtilAnos: Number(created.vida_util_anos),
        horasUsoMes: Number(created.horas_uso_mes),
        manutencaoAnual: Number(created.manutencao_anual),
        potenciaKw: Number(created.potencia_kw),
        velocidadeProducaoM2H: Number(created.velocidade_producao_m2h),
        tintaQuantidadeMl: Number(created.tinta_quantidade_ml),
        tintaValor: Number(created.tinta_valor),
        tintaConsumoMlM2: Number(created.tinta_consumo_ml_m2),
        cabecaValor: Number(created.cabeca_valor),
        cabecaVidaUtilHoras: Number(created.cabeca_vida_util_horas),
        tarifaKwh: Number(created.tarifa_kwh),
        observacoes: created.observacoes || '',
        createdAt: created.created_at,
        updatedAt: created.updated_at
      };
      addLocalItem(result);
      return result;
    }
  } catch (err: any) {
    console.warn('Erro ao salvar no Supabase, salvando localmente:', err.message);
    const mockId = data.id || `maq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const fallbackItem: Maquina = {
      id: mockId,
      companyId: companyId || 'rafa-arts',
      nome: data.nome.trim(),
      ativa: data.ativa !== undefined ? Boolean(data.ativa) : true,
      tipo: data.tipo || 'impressao',
      valorMaquina: Number(data.valorMaquina) || 0,
      vidaUtilAnos: Number(data.vidaUtilAnos) || 0,
      horasUsoMes: Number(data.horasUsoMes) || 0,
      manutencaoAnual: Number(data.manutencaoAnual) || 0,
      potenciaKw: Number(data.potenciaKw) || 0,
      velocidadeProducaoM2H: Number(data.velocidadeProducaoM2H) || 0,
      tintaQuantidadeMl: Number(data.tintaQuantidadeMl) || 0,
      tintaValor: Number(data.tintaValor) || 0,
      tintaConsumoMlM2: Number(data.tintaConsumoMlM2) || 0,
      cabecaValor: Number(data.cabecaValor) || 0,
      cabecaVidaUtilHoras: Number(data.cabecaVidaUtilHoras) || 0,
      tarifaKwh: Number(data.tarifaKwh) || 0.98,
      observacoes: data.observacoes || '',
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

export async function deleteMaquina(id: string): Promise<boolean> {
  try {
    await supabase
      .from('maquinas')
      .delete()
      .eq('id', id);
  } catch (e) {
    console.error('Erro na deleção de máquina:', e);
  }
  removeLocalItem(id);
  return true;
}

export async function toggleMaquinaStatus(id: string, currentStatus: boolean): Promise<boolean> {
  const newStatus = !currentStatus;
  try {
    await supabase
      .from('maquinas')
      .update({ ativa: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
  } catch (e) {
    console.warn('Erro ao alterar status da máquina:', e);
  }

  const cached = getCachedMaquinas();
  const updated = cached.map(item => item.id === id ? { ...item, ativa: newStatus } : item);
  saveLocalCache(updated);
  return newStatus;
}

function getCachedMaquinas(companyId?: string): Maquina[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const seeded = DEFAULT_MAQUINAS_LIST.map((item, idx) => ({
        ...item,
        id: `default-maq-${idx + 1}`,
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
    console.error('Erro ao ler cache local de máquinas:', e);
  }
  return [];
}

function saveLocalCache(items: Maquina[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {}
}

function updateLocalItem(item: Maquina) {
  const items = getCachedMaquinas();
  const index = items.findIndex(i => i.id === item.id);
  if (index >= 0) {
    items[index] = item;
  } else {
    items.push(item);
  }
  saveLocalCache(items);
}

function addLocalItem(item: Maquina) {
  const items = getCachedMaquinas();
  items.unshift(item);
  saveLocalCache(items);
}

function removeLocalItem(id: string) {
  const items = getCachedMaquinas();
  const filtered = items.filter(i => i.id !== id);
  saveLocalCache(filtered);
}

async function seedDefaultMaquinas(companyId?: string): Promise<Maquina[]> {
  const list: Maquina[] = DEFAULT_MAQUINAS_LIST.map((item, idx) => ({
    ...item,
    id: `seed-maq-${idx + 1}`,
    companyId: companyId || 'rafa-arts',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  try {
    const toInsert = list.map(item => ({
      company_id: companyId || 'rafa-arts',
      nome: item.nome,
      ativa: item.ativa,
      tipo: item.tipo,
      valor_maquina: item.valorMaquina,
      vida_util_anos: item.vidaUtilAnos,
      horas_uso_mes: item.horasUsoMes,
      manutencao_anual: item.manutencaoAnual,
      potencia_kw: item.potenciaKw,
      velocidade_producao_m2h: item.velocidadeProducaoM2H,
      tinta_quantidade_ml: item.tintaQuantidadeMl,
      tinta_valor: item.tintaValor,
      tinta_consumo_ml_m2: item.tintaConsumoMlM2,
      cabeca_valor: item.cabecaValor,
      cabeca_vida_util_horas: item.cabecaVidaUtilHoras,
      tarifa_kwh: item.tarifaKwh,
      observacoes: item.observacoes,
      created_at: item.createdAt,
      updated_at: item.updatedAt
    }));

    await supabase.from('maquinas').insert(toInsert);
  } catch (e) {}

  saveLocalCache(list);
  return list;
}
