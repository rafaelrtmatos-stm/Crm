// "Caixa da semana" de cada colaborador -- ver contexto completo em
// supabase/create_comissoes_caixa_semanal.sql.
//
// Regra central: sempre existe (no máximo) UM caixa com status='aberto' por colaborador.
// Ele é criado sob demanda (getOrCreateCaixaAberto) na primeira vez que alguém abre a aba
// Descontos. Quando o admin clica em "Fechar Caixa da Semana", congelamos os totais daquela
// semana nessa linha (status='fechado') e já criamos a linha da semana seguinte, com
// status='aberto' e saldo_anterior = o saldo que sobrou (positivo = empresa ainda deve ao
// colaborador; negativo = colaborador ficou devendo) -- é assim que o saldo/dívida "anda"
// automaticamente pra próxima semana.

import { supabase } from '../../supabase';
import { ServiceItem } from '../types';
import { Desconto, calculateDescontosNoPeriodo } from './supabaseStorage';

export type CaixaStatus = 'aberto' | 'fechado';
export type FormaPagamento = 'pix' | 'dinheiro' | 'permuta';

export const FORMA_PAGAMENTO_LABELS: Record<FormaPagamento, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  permuta: 'Permuta',
};

export interface WeeklyCaixa {
  id: string;
  colaboradorId: string;
  semanaInicio: string; // YYYY-MM-DD, sempre uma segunda-feira
  semanaFim: string;    // YYYY-MM-DD, sempre o sábado seguinte
  status: CaixaStatus;
  saldoAnterior: number;
  salarioBase?: number;
  totalComissao?: number;
  totalDescontos?: number;
  totalPago?: number;
  saldoFinal?: number;
  fechadoEm?: string;
  createdAt: string;
}

export interface Pagamento {
  id: string;
  colaboradorId: string;
  caixaId: string;
  valor: number;
  data: string; // YYYY-MM-DD
  descricao?: string;
  formaPagamento: FormaPagamento;
  createdAt: number;
}

// --- Datas (segunda a sábado -- mesmo padrão de "semana de trabalho" já usado em
// DescontosView.DIAS_UTEIS_SEMANA pro cálculo do valor/dia de falta) ---

const formatISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const addDaysISO = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return formatISO(d);
};

/** Segunda a sábado da semana atual (offsetWeeks negativo/positivo desloca por semanas inteiras). */
export const getWorkWeekBounds = (offsetWeeks = 0): { start: string; end: string } => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = domingo ... 6 = sábado
  const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mon = new Date(now);
  mon.setDate(now.getDate() + distanceToMon + offsetWeeks * 7);
  return { start: formatISO(mon), end: addDaysISO(formatISO(mon), 5) };
};

// --- Mapeamento ---

const mapCaixaRow = (row: any): WeeklyCaixa => ({
  id: row.id,
  colaboradorId: row.colaborador_id,
  semanaInicio: row.semana_inicio,
  semanaFim: row.semana_fim,
  status: (row.status as CaixaStatus) || 'aberto',
  saldoAnterior: Number(row.saldo_anterior) || 0,
  salarioBase: row.salario_base !== null ? Number(row.salario_base) : undefined,
  totalComissao: row.total_comissao !== null ? Number(row.total_comissao) : undefined,
  totalDescontos: row.total_descontos !== null ? Number(row.total_descontos) : undefined,
  totalPago: row.total_pago !== null ? Number(row.total_pago) : undefined,
  saldoFinal: row.saldo_final !== null ? Number(row.saldo_final) : undefined,
  fechadoEm: row.fechado_em || undefined,
  createdAt: row.created_at,
});

const mapPagamentoRow = (row: any): Pagamento => ({
  id: row.id,
  colaboradorId: row.colaborador_id,
  caixaId: row.caixa_id,
  valor: Number(row.valor) || 0,
  data: row.data,
  descricao: row.descricao || undefined,
  formaPagamento: (row.forma_pagamento as FormaPagamento) || 'pix',
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
});

// --- Caixa aberto ---

/**
 * Busca o caixa 'aberto' mais recente do colaborador. Se ele nunca teve nenhum caixa ainda
 * (primeiro uso), cria o primeiro já aberto, pra semana de trabalho atual, com saldo_anterior=0.
 */
export async function getOrCreateCaixaAberto(colaboradorId: string): Promise<WeeklyCaixa | null> {
  const { data: aberto, error: fetchError } = await supabase
    .from('comissoes_caixas_semanais')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .eq('status', 'aberto')
    .order('semana_inicio', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) { console.error('Erro ao buscar caixa aberto:', fetchError); return null; }
  if (aberto) return mapCaixaRow(aberto);

  const { start, end } = getWorkWeekBounds();
  const { data: created, error: insertError } = await supabase
    .from('comissoes_caixas_semanais')
    .insert({ colaborador_id: colaboradorId, semana_inicio: start, semana_fim: end, status: 'aberto', saldo_anterior: 0 })
    .select()
    .single();

  if (insertError || !created) { console.error('Erro ao abrir o primeiro caixa do colaborador:', insertError); return null; }
  return mapCaixaRow(created);
}

/** Histórico de caixas já fechados do colaborador, mais recente primeiro. */
export async function getHistoricoCaixasFechados(colaboradorId: string, limit = 12): Promise<WeeklyCaixa[]> {
  const { data, error } = await supabase
    .from('comissoes_caixas_semanais')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .eq('status', 'fechado')
    .order('semana_inicio', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map(mapCaixaRow);
}

// --- Pagamentos parciais (dentro da semana em aberto) ---

export async function getPagamentosDoCaixa(caixaId: string): Promise<Pagamento[]> {
  const { data, error } = await supabase
    .from('comissoes_pagamentos')
    .select('*')
    .eq('caixa_id', caixaId)
    .order('data', { ascending: false });
  if (error || !data) return [];
  return data.map(mapPagamentoRow);
}

export interface PagamentoFormInput {
  valor: number;
  data: string;
  descricao?: string;
  formaPagamento: FormaPagamento;
}

export async function registrarPagamento(colaboradorId: string, caixaId: string, input: PagamentoFormInput): Promise<Pagamento | null> {
  const { data, error } = await supabase
    .from('comissoes_pagamentos')
    .insert({
      colaborador_id: colaboradorId,
      caixa_id: caixaId,
      valor: input.valor,
      data: input.data,
      descricao: input.descricao || null,
      forma_pagamento: input.formaPagamento,
    })
    .select()
    .single();
  if (error || !data) { console.error('Erro ao registrar pagamento:', error); return null; }
  return mapPagamentoRow(data);
}

export async function deletePagamento(id: string): Promise<boolean> {
  const { error } = await supabase.from('comissoes_pagamentos').delete().eq('id', id);
  return !error;
}

/**
 * Edita um pagamento já lançado (valor/data/descrição). Só faz sentido enquanto o caixa em
 * que ele está ainda está 'aberto' -- depois de fechado o resumo já foi congelado em
 * saldo_final, então editar o pagamento não recalcularia mais nada (ver fecharCaixa acima).
 */
export async function editarPagamento(id: string, input: PagamentoFormInput): Promise<Pagamento | null> {
  const { data, error } = await supabase
    .from('comissoes_pagamentos')
    .update({
      valor: input.valor,
      data: input.data,
      descricao: input.descricao || null,
      forma_pagamento: input.formaPagamento,
    })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) { console.error('Erro ao editar pagamento:', error); return null; }
  return mapPagamentoRow(data);
}

// --- Cálculo do resumo (usado tanto pra exibir ao vivo quanto pro snapshot do fechamento) ---

export interface ResumoCaixa {
  salarioBase: number;
  totalComissao: number;
  totalDescontos: number;
  totalPago: number;
  saldoSemana: number; // salarioBase + totalComissao - totalDescontos - totalPago (sem contar o saldo anterior)
  saldoFinal: number;  // saldoAnterior + saldoSemana
}

export function calcularResumoCaixa(
  caixa: WeeklyCaixa,
  salarioBase: number,
  services: ServiceItem[],
  descontos: Desconto[],
  pagamentos: Pagamento[]
): ResumoCaixa {
  const totalComissao = services
    .filter((s) => s.date >= caixa.semanaInicio && s.date <= caixa.semanaFim && s.status !== 'CANCELADO')
    .reduce((acc, s) => acc + (s.commissionValue || 0), 0);
  const totalDescontos = calculateDescontosNoPeriodo(descontos, caixa.semanaInicio, caixa.semanaFim);
  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const saldoSemana = salarioBase + totalComissao - totalDescontos - totalPago;
  const saldoFinal = caixa.saldoAnterior + saldoSemana;
  return { salarioBase, totalComissao, totalDescontos, totalPago, saldoSemana, saldoFinal };
}

// --- Fechamento ---

/**
 * Fecha o caixa em aberto (congela o resumo calculado nele) e já cria/abre o caixa da semana
 * seguinte, com saldo_anterior = saldo_final que acabou de ser calculado. Retorna o novo caixa
 * já aberto, pra tela trocar de estado sem precisar recarregar tudo.
 */
export async function fecharCaixa(caixa: WeeklyCaixa, resumo: ResumoCaixa): Promise<WeeklyCaixa | null> {
  const fechadoEm = new Date().toISOString();

  const { error: closeError } = await supabase
    .from('comissoes_caixas_semanais')
    .update({
      status: 'fechado',
      salario_base: resumo.salarioBase,
      total_comissao: resumo.totalComissao,
      total_descontos: resumo.totalDescontos,
      total_pago: resumo.totalPago,
      saldo_final: resumo.saldoFinal,
      fechado_em: fechadoEm,
      updated_at: fechadoEm,
    })
    .eq('id', caixa.id);

  if (closeError) { console.error('Erro ao fechar caixa:', closeError); return null; }

  const proximaSemanaInicio = addDaysISO(caixa.semanaFim, 2); // sábado + 2 dias = próxima segunda
  const proximaSemanaFim = addDaysISO(proximaSemanaInicio, 5);

  const { data: proximo, error: openError } = await supabase
    .from('comissoes_caixas_semanais')
    .insert({
      colaborador_id: caixa.colaboradorId,
      semana_inicio: proximaSemanaInicio,
      semana_fim: proximaSemanaFim,
      status: 'aberto',
      saldo_anterior: resumo.saldoFinal,
    })
    .select()
    .single();

  if (openError || !proximo) {
    // Semana seguinte já existia (ex: reabrir a tela e clicar em fechar de novo por engano) --
    // busca ela em vez de falhar, pra tela sempre ter um caixa aberto pra mostrar.
    const { data: existente } = await supabase
      .from('comissoes_caixas_semanais')
      .select('*')
      .eq('colaborador_id', caixa.colaboradorId)
      .eq('semana_inicio', proximaSemanaInicio)
      .maybeSingle();
    if (existente) return mapCaixaRow(existente);
    console.error('Erro ao abrir a próxima semana:', openError);
    return null;
  }

  return mapCaixaRow(proximo);
}
