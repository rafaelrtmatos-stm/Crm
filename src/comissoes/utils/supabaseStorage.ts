import { supabase } from '../../supabase';
import { ServiceItem, UserSettings, SummaryStats, ThemeMode } from '../types';

// 'livre' = colaborador pode usar lançamento manual E puxar de nota;
// 'somente_nota' = só pode puxar de nota (lançamento manual fica oculto).
export type ModoLancamentoComissao = 'livre' | 'somente_nota';

export interface Colaborador {
  id: string;
  nome: string;
  cargo?: string;
  salarioBase: number;
  comissaoPadraoPercentual: number;
  metaSemanal: number;
  tema: ThemeMode;
  ativo: boolean;
  modoLancamentoComissao: ModoLancamentoComissao;
}

export const mapColaboradorRow = (row: any): Colaborador => ({
  id: row.id,
  nome: row.nome,
  cargo: row.cargo || undefined,
  salarioBase: Number(row.salario_base) || 0,
  comissaoPadraoPercentual: Number(row.comissao_padrao_percentual) || 10,
  metaSemanal: Number(row.meta_semanal) || 0,
  tema: (row.tema as ThemeMode) || 'dark',
  ativo: row.ativo !== false,
  modoLancamentoComissao: row.modo_lancamento_comissao === 'somente_nota' ? 'somente_nota' : 'livre',
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
  deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : undefined,
  origemNotaId: row.origem_nota_id || undefined,
  origemItemIndex: row.origem_item_index !== null && row.origem_item_index !== undefined ? Number(row.origem_item_index) : undefined,
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

// Lista todos os colaboradores (usado pela visão do admin, sem senha) — inclui inativos,
// pra o admin poder ver quem já foi desativado também.
export async function getAllColaboradores(): Promise<Colaborador[]> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .order('nome', { ascending: true });
  if (error || !data) return [];
  return data.map(mapColaboradorRow);
}

// --- SERVICOS (escopados por colaborador) ---
export async function getServicesFromSupabase(colaboradorId: string): Promise<ServiceItem[]> {
  const { data, error } = await supabase
    .from('comissoes_servicos')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .is('deleted_at', null)
    .order('data', { ascending: false });
  if (error || !data) return [];
  return data.map(mapServiceRow);
}

// Serviços excluídos (na Lixeira) do colaborador, mais recentes primeiro.
export async function getDeletedServicesFromSupabase(colaboradorId: string): Promise<ServiceItem[]> {
  const { data, error } = await supabase
    .from('comissoes_servicos')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapServiceRow);
}

// Restaura um serviço da Lixeira de volta pra planilha.
export async function restoreServiceFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('comissoes_servicos')
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

// Apaga em definitivo o que já está há mais de 30 dias na Lixeira (mesma regra usada
// em Clientes/Vendas/Contratos no CRM principal — ver Modules.tsx).
export async function purgeOldDeletedServices(colaboradorId: string): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  await supabase
    .from('comissoes_servicos')
    .delete()
    .eq('colaborador_id', colaboradorId)
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff.toISOString());
}

// Busca, pra um conjunto de notas (vendas), quais itens (por índice) já viraram serviço de
// Comissões — GLOBAL, sem filtrar por colaborador, porque a trava de duplicação é da nota/item
// em si (não pode ser puxado duas vezes nem por colaboradores diferentes). Usado pela aba
// "Serviços" pra marcar com o check verde os itens já adicionados e travar eles no modal.
export async function getItensJaAdicionadosDeNotas(notaIds: string[]): Promise<Record<string, Set<number>>> {
  const mapa: Record<string, Set<number>> = {};
  if (notaIds.length === 0) return mapa;
  const { data, error } = await supabase
    .from('comissoes_servicos')
    .select('origem_nota_id, origem_item_index')
    .in('origem_nota_id', notaIds)
    .is('deleted_at', null)
    .not('origem_item_index', 'is', null);
  if (error || !data) return mapa;
  data.forEach((row: { origem_nota_id: string; origem_item_index: number }) => {
    if (!mapa[row.origem_nota_id]) mapa[row.origem_nota_id] = new Set();
    mapa[row.origem_nota_id].add(Number(row.origem_item_index));
  });
  return mapa;
}

// Remove (soft-delete) o serviço já lançado a partir de um item específico de uma nota —
// usado quando o colaborador se engana e quer "tirar" um serviço que puxou da nota. O item
// volta a aparecer como disponível pra ser adicionado de novo (getItensJaAdicionadosDeNotas
// só conta os que ainda não têm deleted_at).
export async function excluirServicoPorOrigem(notaId: string, itemIndex: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('comissoes_servicos')
    .select('id')
    .eq('origem_nota_id', notaId)
    .eq('origem_item_index', itemIndex)
    .is('deleted_at', null)
    .maybeSingle();
  if (error || !data) return false;
  return deleteServiceFromSupabase(data.id);
}

// Adiciona vários serviços de uma vez a partir de itens de uma nota (usado pelo botão
// "Adicionar Toda a Nota"). Um único INSERT em lote em vez de N requisições paralelas —
// mais confiável (evita falhas parciais por concorrência) e, se der erro, devolve o motivo
// real do Supabase em vez de só "não foi possível".
export interface NovoServicoDeNotaInput {
  date: string;
  clientName: string;
  serviceType: string;
  quantity: number;
  unitPrice: number;
  productionValue: number;
  commissionPercent: number;
  commissionValue: number;
  notes: string;
  origemNotaId: string;
  origemItemIndex: number;
}

export async function inserirServicosDeNota(
  colaboradorId: string,
  itens: NovoServicoDeNotaInput[]
): Promise<{ salvos: ServiceItem[]; erro?: string }> {
  if (!colaboradorId || itens.length === 0) return { salvos: [] };

  const safeNumber = (n: number, fallback = 0) => (Number.isFinite(n) ? n : fallback);

  const payload = itens.map((item) => ({
    colaborador_id: colaboradorId,
    data: item.date,
    cliente_nome: item.clientName || null,
    tipo_servico: item.serviceType,
    unidade: 'unidade',
    quantidade: safeNumber(item.quantity, 1),
    valor_unitario: safeNumber(item.unitPrice),
    valor_producao: safeNumber(item.productionValue),
    comissao_percentual: safeNumber(item.commissionPercent),
    comissao_valor: safeNumber(item.commissionValue),
    status: 'CONCLUÍDO',
    observacoes: item.notes || null,
    origem_nota_id: item.origemNotaId,
    origem_item_index: item.origemItemIndex,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase.from('comissoes_servicos').insert(payload).select();
  if (error || !data) {
    console.error('Erro ao adicionar serviços da nota:', error);
    return { salvos: [], erro: error?.message };
  }
  return { salvos: data.map(mapServiceRow) };
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
    origem_nota_id: item.origemNotaId || null,
    origem_item_index: item.origemItemIndex ?? null,
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

// "Excluir" um serviço não apaga de vez — só marca deleted_at (soft-delete), pra ele
// sumir da planilha mas continuar disponível na Lixeira (ver getDeletedServicesFromSupabase
// / restoreServiceFromSupabase acima) por 30 dias antes da limpeza definitiva.
export async function deleteServiceFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('comissoes_servicos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

// Quando um colaborador "puxa" um serviço da aba Serviços pra sua planilha de comissão,
// a comissão dele sobre aquele item (ex.: 10% de R$100 = R$10) é lançada automaticamente
// como um Custo Extra da nota de origem (coluna vendas.custos_extras, mesmo painel "Custos
// da Nota" do PDV -- ver src/lib/lucro.ts). Isso já abate no Lucro Líquido da nota sem o
// Admin precisar lançar a mão de obra na mão. Uma vez lançado, o item fica igual a qualquer
// outro custo extra: editável/removível manualmente em Custos da Nota -- não sincroniza
// de volta se o serviço for depois editado, cancelado ou trocado de colaborador.
export interface ComissaoParaCustoDaNota {
  descricao: string;
  valor: number;
}

export async function lancarComissoesComoCustoDaNota(
  vendaId: string,
  comissoes: ComissaoParaCustoDaNota[]
): Promise<boolean> {
  if (!vendaId || comissoes.length === 0) return false;

  const { data: venda, error: fetchError } = await supabase
    .from('vendas')
    .select('custos_extras')
    .eq('id', vendaId)
    .maybeSingle();
  if (fetchError) { console.error('Erro ao buscar custos da nota:', fetchError); return false; }

  const custosAtuais: Array<{ id: string; description: string; amount: number }> =
    Array.isArray(venda?.custos_extras) ? venda.custos_extras : [];

  const novosCustos = comissoes.map((c, i) => ({
    id: `comissao-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    description: c.descricao,
    amount: Number(c.valor.toFixed(2)),
  }));

  const { error: updateError } = await supabase
    .from('vendas')
    .update({ custos_extras: [...custosAtuais, ...novosCustos] })
    .eq('id', vendaId);
  if (updateError) { console.error('Erro ao lançar comissão como custo da nota:', updateError); return false; }
  return true;
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

// --- DESCONTOS (faltas, etc.) escopados por colaborador ---
// Quem cria/edita/exclui é sempre o admin (painel de Comissões do CRM) -- a tela do
// colaborador (ComissoesApp / ComissoesEmbedded sem presetColaborador) só usa as
// funções de leitura abaixo, nunca as de escrita (isso é controlado no componente,
// via a prop isAdmin da DescontosView -- ver comissoes_descontos no create_comissoes_descontos.sql).
export type DescontoTipo = 'falta_meio_periodo' | 'falta_periodo' | 'outro' | 'debito_saldo_anterior' | 'divida';
export type DescontoRecorrencia = 'unica' | 'semanal' | 'mensal';

export interface Desconto {
  id: string;
  colaboradorId: string;
  tipo: DescontoTipo;
  descricao?: string;
  valor: number;
  recorrencia: DescontoRecorrencia;
  data: string; // YYYY-MM-DD -- data do desconto (unica) ou data de inicio (semanal/mensal)
  ativo: boolean;
  createdAt: number;
  
  // ✅ NOVO: Controle de permissões
  criador_id?: string; // Quem criou (admin ID ou colaborador ID)
  pode_deletar_colaborador?: boolean; // Se colaborador pode deletar (false = só admin deleta)
  
  // ✅ NOVO: Info de dívida parcelada
  parcelas_total?: number; // Total de parcelas (ex: 4 semanas)
  parcela_atual?: number; // Qual parcela estamos (1, 2, 3...)
  valor_total_divida?: number; // Valor total original da dívida
}

export const DESCONTO_TIPO_LABELS: Record<DescontoTipo, string> = {
  falta_meio_periodo: 'Falta — meio período',
  falta_periodo: 'Falta — período completo',
  outro: 'Outro desconto',
  debito_saldo_anterior: 'Débito do saldo anterior',
  divida: 'Dívida (parcelada)',
};

export const DESCONTO_RECORRENCIA_LABELS: Record<DescontoRecorrencia, string> = {
  unica: 'Uma vez',
  semanal: 'Toda semana',
  mensal: 'Todo mês',
};

const mapDescontoRow = (row: any): Desconto => ({
  id: row.id,
  colaboradorId: row.colaborador_id,
  tipo: (row.tipo as DescontoTipo) || 'outro',
  descricao: row.descricao || undefined,
  valor: Number(row.valor) || 0,
  recorrencia: (row.recorrencia as DescontoRecorrencia) || 'unica',
  data: row.data,
  ativo: row.ativo !== false,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  criador_id: row.criador_id || undefined,
  pode_deletar_colaborador: row.pode_deletar_colaborador !== false,
  parcelas_total: row.parcelas_total || undefined,
  parcela_atual: row.parcela_atual || undefined,
  valor_total_divida: row.valor_total_divida || undefined,
});

export async function getDescontosFromSupabase(colaboradorId: string): Promise<Desconto[]> {
  const { data, error } = await supabase
    .from('comissoes_descontos')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .order('data', { ascending: false });
  if (error || !data) return [];
  return data.map(mapDescontoRow);
}

export interface DescontoFormInput {
  id?: string;
  tipo: DescontoTipo;
  descricao?: string;
  valor: number;
  recorrencia: DescontoRecorrencia;
  data: string;
  ativo?: boolean;
}

export async function saveDescontoToSupabase(colaboradorId: string, input: DescontoFormInput, isNew: boolean): Promise<Desconto | null> {
  const payload = {
    colaborador_id: colaboradorId,
    tipo: input.tipo,
    descricao: input.descricao || null,
    valor: input.valor || 0,
    recorrencia: input.recorrencia,
    data: input.data,
    ativo: input.ativo !== false,
    updated_at: new Date().toISOString(),
  };
  if (isNew) {
    const { data, error } = await supabase.from('comissoes_descontos').insert(payload).select().single();
    if (error || !data) { console.error('Erro ao criar desconto:', error); return null; }
    return mapDescontoRow(data);
  }
  const { data, error } = await supabase.from('comissoes_descontos').update(payload).eq('id', input.id).select().single();
  if (error || !data) { console.error('Erro ao atualizar desconto:', error); return null; }
  return mapDescontoRow(data);
}

export async function deleteDescontoFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase.from('comissoes_descontos').delete().eq('id', id);
  return !error;
}

export async function setDescontoAtivo(id: string, ativo: boolean): Promise<boolean> {
  const { error } = await supabase.from('comissoes_descontos').update({ ativo, updated_at: new Date().toISOString() }).eq('id', id);
  return !error;
}

// Quantas vezes um desconto "cai" dentro do periodo [start, end] (datas YYYY-MM-DD, ambas
// inclusive). unica: 1 vez, se a data cair no periodo. semanal: 1 vez a cada 7 dias a partir
// da data de inicio. mensal: 1 vez por mes, no mesmo dia (ou no ultimo dia do mes, se o mes
// for mais curto que o dia de inicio -- ex: inicio dia 31 cai no dia 28/29 de fevereiro).
// ignorarAtivo=true: usado quando o objetivo é só EXIBIR o desconto no período (ex: lista da
// aba Descontos, que também mostra os inativos acinzentados) -- nesse caso a data ainda manda,
// só não descarta por causa do campo `ativo`. Nos totais financeiros (calculateDescontosNoPeriodo)
// isso continua false, porque desconto inativo não pode entrar na soma.
export function contarOcorrenciasNoPeriodo(desconto: Desconto, start: string, end: string, ignorarAtivo = false): number {
  if ((!ignorarAtivo && !desconto.ativo) || desconto.data > end) return 0;

  if (desconto.recorrencia === 'unica') {
    return desconto.data >= start ? 1 : 0;
  }

  const inicio = new Date(`${desconto.data}T00:00:00`);
  const periodoInicioStr = desconto.data > start ? desconto.data : start;
  const periodoInicio = new Date(`${periodoInicioStr}T00:00:00`);
  const periodoFim = new Date(`${end}T00:00:00`);
  if (periodoInicio > periodoFim) return 0;

  let count = 0;

  if (desconto.recorrencia === 'semanal') {
    const cursor = new Date(inicio);
    while (cursor < periodoInicio) cursor.setDate(cursor.getDate() + 7);
    while (cursor <= periodoFim) {
      count++;
      cursor.setDate(cursor.getDate() + 7);
    }
    return count;
  }

  // mensal
  const diaAlvo = inicio.getDate();
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  while (cursor <= periodoFim) {
    const ultimoDiaDoMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const dataOcorrencia = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(diaAlvo, ultimoDiaDoMes));
    if (dataOcorrencia >= inicio && dataOcorrencia >= periodoInicio && dataOcorrencia <= periodoFim) count++;
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return count;
}

// Soma total de descontos ativos que caem dentro do periodo informado (start/end no
// formato YYYY-MM-DD, inclusive) -- usado na aba "Descontos" pra mostrar o total do mês atual.
export function calculateDescontosNoPeriodo(descontos: Desconto[], start: string, end: string): number {
  return descontos.reduce((total, d) => total + contarOcorrenciasNoPeriodo(d, start, end) * d.valor, 0);
}

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

// Hora (HH:mm) de um timestamp (ex: createdAt/deletedAt de um serviço), pra exibir
// junto da data na planilha e na Lixeira.
export const formatTimeBR = (timestamp?: number): string => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// Data + hora completas (ex: "20/08/2026 14:32"), a partir de um timestamp.
export const formatDateTimeBR = (timestamp?: number): string => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
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
