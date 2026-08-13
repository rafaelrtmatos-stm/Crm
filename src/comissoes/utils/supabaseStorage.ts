import { supabase } from '../../supabase';
import { ServiceItem, UserSettings, SummaryStats, ThemeMode } from '../types';

export interface Colaborador {
  id: string;
  nome: string;
  cargo?: string;
  salarioBase: number;
  comissaoPadraoPercentual: number;
  metaSemanal: number;
  tema: ThemeMode;
  ativo: boolean;
}

const mapColaboradorRow = (row: any): Colaborador => ({
  id: row.id,
  nome: row.nome,
  cargo: row.cargo || undefined,
  salarioBase: Number(row.salario_base) || 0,
  comissaoPadraoPercentual: Number(row.comissao_padrao_percentual) || 10,
  metaSemanal: Number(row.meta_semanal) || 0,
  tema: (row.tema as ThemeMode) || 'dark',
  ativo: row.ativo !== false,
});

const mapServiceRow = (row: any): ServiceItem => ({
  id: row.id,
  date: row.data,
  clientName: row.cliente_nome || undefined,
  vehicle: row.veiculo || undefined,
  serviceType: row.tipo_servico,
  unit: row.unidade || undefined,
  quantity: row.quantidade !== null ? Number(row.quantidade) : undefined,
  unitPrice: row.valor_unitario !== null ? Number(row.valor_unitario) : undefined,
  productionValue: Number(row.valor_producao) || 0,
  commissionPercent: Number(row.comissao_percentual) || 0,
  commissionValue: Number(row.comissao_valor) || 0,
  status: row.status,
  notes: row.observacoes || undefined,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
});

// --- LOGIN ---
export async function loginColaborador(nome: string, senha: string): Promise<Colaborador | null> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .ilike('nome', nome.trim())
    .eq('senha', senha)
    .eq('ativo', true)
    .maybeSingle();
  if (error || !data) return null;
  return mapColaboradorRow(data);
}

// --- SERVICOS (escopados por colaborador) ---
export async function getServicesFromSupabase(colaboradorId: string): Promise<ServiceItem[]> {
  const { data, error } = await supabase
    .from('comissoes_servicos')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .order('data', { ascending: false });
  if (error || !data) return [];
  return data.map(mapServiceRow);
}

export async function saveServiceToSupabase(colaboradorId: string, item: ServiceItem, isNew: boolean): Promise<ServiceItem | null> {
  const payload = {
    colaborador_id: colaboradorId,
    data: item.date,
    cliente_nome: item.clientName || null,
    veiculo: item.vehicle || null,
    tipo_servico: item.serviceType,
    unidade: item.unit || null,
    quantidade: item.quantity ?? null,
    valor_unitario: item.unitPrice ?? null,
    valor_producao: item.productionValue,
    comissao_percentual: item.commissionPercent,
    comissao_valor: item.commissionValue,
    status: item.status,
    observacoes: item.notes || null,
    updated_at: new Date().toISOString(),
  };
  if (isNew) {
    const { data, error } = await supabase.from('comissoes_servicos').insert(payload).select().single();
    if (error || !data) { console.error('Erro ao criar serviço:', error); return null; }
    return mapServiceRow(data);
  }
  const { data, error } = await supabase.from('comissoes_servicos').update(payload).eq('id', item.id).select().single();
  if (error || !data) { console.error('Erro ao atualizar serviço:', error); return null; }
  return mapServiceRow(data);
}

export async function deleteServiceFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase.from('comissoes_servicos').delete().eq('id', id);
  return !error;
}

// --- CONFIGURACOES do colaborador (salario, meta, comissao padrao, tema) ---
export async function saveColaboradorSettings(colaboradorId: string, settings: UserSettings): Promise<boolean> {
  const { error } = await supabase.from('colaboradores').update({
    salario_base: settings.baseSalary,
    comissao_padrao_percentual: settings.defaultCommissionRate,
    meta_semanal: settings.weeklyGoal,
    tema: settings.themePreference,
    updated_at: new Date().toISOString(),
  }).eq('id', colaboradorId);
  return !error;
}

export function colaboradorToUserSettings(c: Colaborador): UserSettings {
  return {
    userName: c.nome,
    userRole: c.cargo || 'Colaborador',
    baseSalary: c.salarioBase,
    defaultCommissionRate: c.comissaoPadraoPercentual,
    weeklyGoal: c.metaSemanal,
    themePreference: c.tema,
  };
}

export const calculateSummaryStats = (services: ServiceItem[], baseSalary: number): SummaryStats => {
  const validServices = services.filter((s) => s.status !== 'CANCELADO');
  const totalProduction = validServices.reduce((acc, s) => acc + (s.productionValue || 0), 0);
  const totalCommission = validServices.reduce((acc, s) => acc + (s.commissionValue || 0), 0);
  const forecastTotal = baseSalary + totalCommission;
  const completedCount = services.filter((s) => s.status === 'CONCLUÍDO').length;
  const inProductionCount = services.filter((s) => s.status === 'EM PRODUÇÃO').length;
  const pendingCount = services.filter((s) => s.status === 'PENDENTE').length;
  const canceledCount = services.filter((s) => s.status === 'CANCELADO').length;
  const averageCommissionRate = totalProduction > 0 ? (totalCommission / totalProduction) * 100 : 0;
  return {
    totalProduction, totalCommission, totalBaseSalary: baseSalary, forecastTotal,
    completedCount, inProductionCount, pendingCount, canceledCount,
    totalCount: services.length, averageCommissionRate,
  };
};

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

// Aplica o tema DENTRO do wrapper .comissoes-app, sem mexer no <html> do sistema inteiro
// (o CRM principal tem o proprio tema, nao pode vazar um pro outro)
export const applyComissoesTheme = (theme: ThemeMode, wrapperEl: HTMLElement | null) => {
  if (!wrapperEl) return;
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    wrapperEl.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    wrapperEl.setAttribute('data-theme', theme);
  }
};
