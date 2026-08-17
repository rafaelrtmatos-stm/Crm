// "Caixa" do colaborador -- ver contexto completo em supabase/create_comissoes_caixa_semanal.sql.
//
// Regra central: existe UMA única linha de caixa por colaborador (sem conceito de "fechar" ou
// "reabrir" -- não há abertura/fechamento semanal). O saldo/dívida acumulada é sempre calculado
// ao vivo, somando tudo (salário, comissão, descontos, pagamentos) desde que o colaborador
// começou a trabalhar até hoje. Pra mostrar por Semana/Mês/Ano, filtramos esses mesmos dados
// pela data de cada lançamento -- não existe mais um "snapshot congelado" de semana fechada.

import { supabase } from '../../supabase';
import { ServiceItem } from '../types';
import { Desconto, calculateDescontosNoPeriodo } from './supabaseStorage';

export type FormaPagamento = 'pix' | 'dinheiro' | 'permuta';

export const FORMA_PAGAMENTO_LABELS: Record<FormaPagamento, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  permuta: 'Permuta',
};

export interface WeeklyCaixa {
  id: string;
  colaboradorId: string;
  semanaInicio: string; // YYYY-MM-DD -- data em que o caixa do colaborador começou a contar
  saldoAnterior: number; // sempre 0 agora (não há mais "semana anterior" congelada)
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

// --- Datas (domingo a sábado -- semana começa no domingo) ---

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

/** Domingo a sábado da semana atual (offsetWeeks negativo/positivo desloca por semanas inteiras). */
export const getWorkWeekBounds = (offsetWeeks = 0): { start: string; end: string } => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = domingo ... 6 = sábado
  const distanceToSun = -dayOfWeek;
  const sun = new Date(now);
  sun.setDate(now.getDate() + distanceToSun + offsetWeeks * 7);
  return { start: formatISO(sun), end: addDaysISO(formatISO(sun), 6) };
};

/** Primeiro e último dia do mês (offsetMonths desloca por meses inteiros). */
export const getMonthBounds = (offsetMonths = 0): { start: string; end: string } => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offsetMonths;
  return { start: formatISO(new Date(y, m, 1)), end: formatISO(new Date(y, m + 1, 0)) };
};

/** Primeiro e último dia do ano (offsetYears desloca por anos inteiros). */
export const getYearBounds = (offsetYears = 0): { start: string; end: string } => {
  const y = new Date().getFullYear() + offsetYears;
  return { start: `${y}-01-01`, end: `${y}-12-31` };
};

// --- Mapeamento ---

const mapCaixaRow = (row: any): WeeklyCaixa => ({
  id: row.id,
  colaboradorId: row.colaborador_id,
  semanaInicio: row.semana_inicio,
  saldoAnterior: Number(row.saldo_anterior) || 0,
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

// --- Caixa único do colaborador ---

/**
 * Busca a linha de caixa do colaborador. Se ele nunca teve nenhuma ainda (primeiro uso),
 * cria a única linha dele, com a data de início = hoje. Essa linha nunca é fechada nem trocada
 * -- é o "caixa" único e contínuo do colaborador, do início ao fim.
 */
export async function getOrCreateCaixaAberto(colaboradorId: string): Promise<WeeklyCaixa | null> {
  const { data: existente, error: fetchError } = await supabase
    .from('comissoes_caixas_semanais')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .order('semana_inicio', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError) { console.error('Erro ao buscar caixa do colaborador:', fetchError); return null; }
  if (existente) return mapCaixaRow(existente);

  const { start } = getWorkWeekBounds();
  const { data: created, error: insertError } = await supabase
    .from('comissoes_caixas_semanais')
    .insert({ colaborador_id: colaboradorId, semana_inicio: start, status: 'aberto', saldo_anterior: 0 })
    .select()
    .single();

  if (insertError || !created) { console.error('Erro ao criar o caixa do colaborador:', insertError); return null; }
  return mapCaixaRow(created);
}

// --- Pagamentos ---

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

// --- Cálculo do resumo ---

export interface ResumoCaixa {
  salarioBase: number;
  totalComissao: number;
  totalDescontos: number;
  totalPago: number;
  saldoSemana: number; // salarioBase + totalComissao - totalDescontos - totalPago (do intervalo calculado)
  saldoFinal: number;  // saldoAnterior + saldoSemana
}

/**
 * Resumo completo do colaborador desde o início do caixa (createdAt/semanaInicio) até hoje.
 * É o que alimenta o saldoFinal/dívida acumulada -- não depende de "fechar" nada, soma tudo
 * o que já aconteceu.
 */
export function calcularResumoCaixa(
  caixa: WeeklyCaixa,
  salarioBase: number,
  services: ServiceItem[],
  descontos: Desconto[],
  pagamentos: Pagamento[]
): ResumoCaixa {
  const fimEfetivo = '9999-12-31';
  const totalComissao = services
    .filter((s) => s.date >= caixa.semanaInicio && s.date <= fimEfetivo && s.status !== 'CANCELADO')
    .reduce((acc, s) => acc + (s.commissionValue || 0), 0);
  const totalDescontos = calculateDescontosNoPeriodo(descontos, caixa.semanaInicio, fimEfetivo);
  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const saldoSemana = salarioBase + totalComissao - totalDescontos - totalPago;
  const saldoFinal = caixa.saldoAnterior + saldoSemana;
  return { salarioBase, totalComissao, totalDescontos, totalPago, saldoSemana, saldoFinal };
}

/**
 * Mesmo cálculo, mas isolado num intervalo de datas específico (semana calendário, mês ou
 * ano) -- usado pelos filtros de visualização. O saldoFinal aqui NÃO é o acumulado; quem
 * precisa do acumulado real usa calcularResumoCaixa() acima.
 */
export function calcularResumoNoIntervalo(
  caixa: WeeklyCaixa,
  salarioBase: number,
  services: ServiceItem[],
  descontos: Desconto[],
  pagamentos: Pagamento[],
  inicio: string,
  fim: string
): ResumoCaixa {
  const totalComissao = services
    .filter((s) => s.date >= inicio && s.date <= fim && s.status !== 'CANCELADO')
    .reduce((acc, s) => acc + (s.commissionValue || 0), 0);
  const totalDescontos = calculateDescontosNoPeriodo(descontos, inicio, fim);
  const totalPago = pagamentos
    .filter((p) => p.data >= inicio && p.data <= fim)
    .reduce((acc, p) => acc + p.valor, 0);
  const saldoSemana = salarioBase + totalComissao - totalDescontos - totalPago;
  return { salarioBase, totalComissao, totalDescontos, totalPago, saldoSemana, saldoFinal: saldoSemana };
}

// --- Agregação por Período (Semana / Mês / Ano) ---

export type PeriodoVisualizacao = 'semana' | 'mes' | 'ano';

export interface ResumoPorPeriodo {
  periodo: PeriodoVisualizacao;
  label: string;         // "Esta Semana", "Agosto/2026", "2026"
  inicio: string;        // YYYY-MM-DD do início do período mostrado
  fim: string;           // YYYY-MM-DD do fim do período mostrado
  salarioBase: number;
  totalComissao: number;
  totalDescontos: number;
  totalPago: number;
  saldoPeriodo: number;  // salarioBase + comissao - descontos - pago, isolado no período
  saldoFinal: number;    // saldo acumulado real (dívida/crédito que carrega) -- não filtrado por período
  qtdSemanas: number;
}

function nomeMesPt(mes: number): string {
  const nomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return nomes[mes] || '';
}

/**
 * Resumo agregado pra Semana / Mês / Ano, sempre a partir dos mesmos dados vivos (services,
 * descontos, pagamentos) filtrados pela data de cada lançamento -- não depende de nenhum
 * histórico de "caixas fechados".
 *
 * offset permite navegar pra período anterior/seguinte (ex: offset=-1 = semana passada,
 * offset=1 = semana que vem), sem sair do período selecionado (semana/mês/ano).
 *
 * O saldoFinal (dívida/crédito acumulada) é sempre o resumo COMPLETO (calcularResumoCaixa),
 * independente do período/offset navegado -- a dívida antiga continua aparecendo até ser
 * quitada, mesmo olhando uma semana específica no passado.
 */
export function calcularResumoPorPeriodo(
  periodo: PeriodoVisualizacao,
  caixa: WeeklyCaixa | null,
  resumoCompleto: ResumoCaixa | null,
  salarioBase: number,
  services: ServiceItem[],
  descontos: Desconto[],
  pagamentos: Pagamento[],
  offset: number = 0
): ResumoPorPeriodo {
  if (!caixa) {
    return { periodo, label: '', inicio: '', fim: '', salarioBase: 0, totalComissao: 0, totalDescontos: 0, totalPago: 0, saldoPeriodo: 0, saldoFinal: 0, qtdSemanas: 0 };
  }

  const { start, end } =
    periodo === 'semana' ? getWorkWeekBounds(offset) :
    periodo === 'mes' ? getMonthBounds(offset) :
    getYearBounds(offset);

  const r = calcularResumoNoIntervalo(caixa, salarioBase, services, descontos, pagamentos, start, end);

  const dInicio = new Date(`${start}T00:00:00`);
  const dFim = new Date(`${end}T00:00:00`);
  const label =
    periodo === 'semana' ? `${formatISO(dInicio).split('-').reverse().join('/')} a ${formatISO(dFim).split('-').reverse().join('/')}` :
    periodo === 'mes' ? `${nomeMesPt(dInicio.getMonth())}/${dInicio.getFullYear()}` :
    `${dInicio.getFullYear()}`;

  return {
    periodo,
    label,
    inicio: start,
    fim: end,
    salarioBase: r.salarioBase,
    totalComissao: r.totalComissao,
    totalDescontos: r.totalDescontos,
    totalPago: r.totalPago,
    saldoPeriodo: r.saldoSemana,
    // saldo acumulado real continua sempre o completo, independente do período/offset navegado
    saldoFinal: resumoCompleto?.saldoFinal ?? caixa.saldoAnterior,
    qtdSemanas: periodo === 'semana' ? 1 : 0,
  };
}
