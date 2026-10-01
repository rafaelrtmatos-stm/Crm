import { supabase } from '../supabase';

export interface DespesaFixaItem {
  id: string;
  companyId?: string;
  nome: string;
  categoria: 'instalacoes' | 'utilidades' | 'servicos' | 'software' | 'outros';
  valor: number;
  diaVencimento: number; // 1 a 31
  pagoEsteMes?: boolean;
  observacao?: string;
  dataAtualizacao?: string;
  createdAt?: string;
}

export const STORAGE_KEY_DESPESAS_FIXAS = 'rpro_despesas_fixas_list';

export const DEFAULT_DESPESAS_FIXAS: DespesaFixaItem[] = [
  { id: '1', nome: 'Aluguel & IPTU Comercial', categoria: 'instalacoes', valor: 2000.00, diaVencimento: 10, observacao: 'Ponto comercial principal' },
  { id: '2', nome: 'Energia Elétrica', categoria: 'utilidades', valor: 650.00, diaVencimento: 15, observacao: 'Consumo maquinários e iluminação' },
  { id: '3', nome: 'Água & Saneamento', categoria: 'utilidades', valor: 120.00, diaVencimento: 18, observacao: 'Taxa fixa e consumo' },
  { id: '4', nome: 'Internet Fibra Óptica & Telefonia', categoria: 'utilidades', valor: 180.00, diaVencimento: 5, observacao: 'Plano dedicado' },
  { id: '5', nome: 'Assessoria Contábil', categoria: 'servicos', valor: 450.00, diaVencimento: 20, observacao: 'Fechamento fiscal e folha' },
  { id: '6', nome: 'Sistemas & Licenças em Nuvem', categoria: 'software', valor: 150.00, diaVencimento: 1, observacao: 'Softwares e hospedagem' },
  { id: '7', nome: 'Limpeza, Manutenção & Insumos Gerais', categoria: 'instalacoes', valor: 250.00, diaVencimento: 25, observacao: 'Manutenção predial preventiva' },
];

export function mapDespesaRow(row: any): DespesaFixaItem {
  return {
    id: String(row.id),
    companyId: row.company_id || 'rafa-arts',
    nome: row.nome || 'Despesa',
    categoria: row.categoria || 'instalacoes',
    valor: Number(row.valor) || 0,
    diaVencimento: Number(row.dia_vencimento) || 10,
    pagoEsteMes: Boolean(row.pago_este_mes),
    observacao: row.observacao || '',
    dataAtualizacao: row.updated_at || row.created_at,
    createdAt: row.created_at,
  };
}

export function getCachedDespesasFixas(): DespesaFixaItem[] {
  if (typeof window === 'undefined') return DEFAULT_DESPESAS_FIXAS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DESPESAS_FIXAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_DESPESAS_FIXAS;
}

export function updateDespesasFixasCache(items: DespesaFixaItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_DESPESAS_FIXAS, JSON.stringify(items));
    const total = items.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
    window.dispatchEvent(new CustomEvent('rpro-despesas-fixas-updated', {
      detail: { totalMensal: total, items }
    }));
  } catch (e) {
    // ignore
  }
}

export function getDespesasFixasTotalMensal(): number {
  const items = getCachedDespesasFixas();
  return items.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
}

export async function fetchDespesasFixas(companyId: string = 'rafa-arts'): Promise<DespesaFixaItem[]> {
  try {
    const { data, error } = await supabase
      .from('despesas_fixas')
      .select('*')
      .eq('company_id', companyId)
      .order('dia_vencimento', { ascending: true });

    if (error) {
      console.warn('Erro ao carregar despesas_fixas do Supabase, usando cache local:', error.message);
      return getCachedDespesasFixas();
    }

    if (data && data.length > 0) {
      const mapped = data.map(mapDespesaRow);
      updateDespesasFixasCache(mapped);
      return mapped;
    }

    // Se a tabela do Supabase estiver vazia, sincroniza os dados do cache ou defaults para o Supabase
    const initialList = getCachedDespesasFixas();
    if (initialList.length > 0) {
      await seedDespesasFixasToSupabase(initialList, companyId);
      return initialList;
    }

    return DEFAULT_DESPESAS_FIXAS;
  } catch (err) {
    console.error('Falha de conexão com despesas_fixas:', err);
    return getCachedDespesasFixas();
  }
}

export async function seedDespesasFixasToSupabase(items: DespesaFixaItem[], companyId: string = 'rafa-arts'): Promise<void> {
  try {
    const rows = items.map(item => ({
      company_id: companyId,
      nome: item.nome,
      categoria: item.categoria,
      valor: item.valor,
      dia_vencimento: item.diaVencimento,
      pago_este_mes: Boolean(item.pagoEsteMes),
      observacao: item.observacao || null,
      updated_at: new Date().toISOString(),
    }));

    await supabase.from('despesas_fixas').insert(rows);
  } catch (err) {
    console.warn('Não foi possível fazer seed inicial de despesas fixas no Supabase:', err);
  }
}

export async function saveDespesaFixa(
  item: Partial<DespesaFixaItem> & { nome: string; valor: number },
  companyId: string = 'rafa-arts'
): Promise<DespesaFixaItem | null> {
  const isExistingUUID = item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);

  const payload: any = {
    company_id: companyId,
    nome: item.nome.trim(),
    categoria: item.categoria || 'instalacoes',
    valor: Number(item.valor) || 0,
    dia_vencimento: Number(item.diaVencimento) || 10,
    pago_este_mes: Boolean(item.pagoEsteMes),
    observacao: item.observacao?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  try {
    if (isExistingUUID) {
      const { data, error } = await supabase
        .from('despesas_fixas')
        .update(payload)
        .eq('id', item.id)
        .select()
        .single();

      if (error) throw error;
      return mapDespesaRow(data);
    } else {
      const { data, error } = await supabase
        .from('despesas_fixas')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return mapDespesaRow(data);
    }
  } catch (err) {
    console.error('Erro ao salvar despesa fixa no Supabase:', err);
    // Fallback offline: cria item local com id gerado
    const fallbackItem: DespesaFixaItem = {
      id: item.id || `local-${Date.now()}`,
      companyId,
      nome: item.nome,
      categoria: item.categoria || 'instalacoes',
      valor: item.valor,
      diaVencimento: item.diaVencimento || 10,
      pagoEsteMes: item.pagoEsteMes,
      observacao: item.observacao,
      dataAtualizacao: new Date().toISOString(),
    };
    return fallbackItem;
  }
}

export async function deleteDespesaFixa(id: string): Promise<boolean> {
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      const { error } = await supabase.from('despesas_fixas').delete().eq('id', id);
      if (error) throw error;
    }
    return true;
  } catch (err) {
    console.error('Erro ao excluir despesa fixa no Supabase:', err);
    return false;
  }
}

export async function togglePagoDespesaFixa(id: string, pago: boolean): Promise<boolean> {
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      const { error } = await supabase
        .from('despesas_fixas')
        .update({ pago_este_mes: pago, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    }
    return true;
  } catch (err) {
    console.error('Erro ao alterar status de pagamento no Supabase:', err);
    return false;
  }
}

export function subscribeToDespesasFixas(
  companyId: string = 'rafa-arts',
  onUpdate: (items: DespesaFixaItem[]) => void
): () => void {
  const channel = supabase
    .channel(`realtime-despesas-fixas-${companyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'despesas_fixas',
        filter: `company_id=eq.${companyId}`,
      },
      () => {
        fetchDespesasFixas(companyId).then(onUpdate);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
