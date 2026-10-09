// "Caixa" do colaborador -- ver contexto completo em supabase/create_comissoes_caixa_semanal.sql.
//
// Regra central: cada colaborador tem, a qualquer momento, UM caixa com status='aberto',
// referente à semana de trabalho atual (domingo a sábado -- fecha no sábado). Enquanto está
// aberto, o saldo dessa semana é calculado ao vivo (salário + comissão - descontos -
// pagamentos JÁ FEITOS NESSA SEMANA). Quando a semana vira (sábado -> domingo seguinte), o
// caixa é fechado automaticamente na próxima vez que a tela carrega: o saldo daquela semana é
// CONGELADO na linha (snapshot) e uma linha nova nasce aberta pra semana seguinte, trazendo
// esse saldo em saldo_anterior -- é assim que sobra/dívida "anda" de sábado pra sábado, sem
// nunca re-somar o histórico inteiro do colaborador (ver fecharCaixa/avancarCaixaSeNecessario).

import { supabase } from '../../supabase';
import { ServiceItem, MetaValorItem } from '../types';
import { Desconto, calculateDescontosNoPeriodo, ModalidadeRemuneracao } from './supabaseStorage';
import { calcularRemuneracaoSemanal } from './remuneracaoHelper';

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
  semanaInicio: string; // YYYY-MM-DD, sempre um domingo
  semanaFim: string;    // YYYY-MM-DD, sempre o sábado seguinte
  status: CaixaStatus;
  saldoAnterior: number; // saldo_final trazido da semana anterior (0 na primeira semana do colaborador)
  // Os 5 campos abaixo só são preenchidos no FECHAMENTO (snapshot do que foi calculado
  // naquele momento) -- enquanto status='aberto' eles ficam undefined e a tela calcula ao
  // vivo em cima de comissoes_servicos/comissoes_descontos/comissoes_pagamentos.
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

// --- Datas (domingo a sábado -- semana começa no domingo, fecha no sábado) ---

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

const getTodayISO = (): string => formatISO(new Date());

/**
 * Ciclo de Comissão Semanal: Sábado a Sexta-feira.
 * Regra oficial de fechamento:
 * - O ciclo de produção/comissão apurado vai de Sábado até Sexta-feira.
 * - No Sábado (dia 6), quando o usuário visualiza o modal/painel de previsão de recebimento,
 *   a semana de acerto exibida é a semana que encerrou ontem (sexta-feira), para pagar o que foi
 *   produzido até sexta. Os serviços realizados no próprio sábado não entram neste acerto,
 *   entrando para o próximo ciclo semanal.
 * - De Domingo a Sexta-feira: a semana apurada avança e acumula em tempo real do sábado anterior
 *   até o respectivo dia.
 * - Exceção inaugural (semana de 07/09 a 11/09): como a regra começou na segunda-feira 07/09,
 *   não soma o sábado 05/09 (que pertenceu ao fechamento anterior).
 */
export const getWorkWeekBounds = (offsetWeeks = 0): { start: string; end: string } => {
  const now = new Date();
  const day = now.getDay(); // 0 = domingo ... 6 = sábado

  // Ciclo oficial de produção semanal: SÁBADO até SEXTA-FEIRA.
  // No sábado (6), (6 + 1) % 7 = 0 -> diffToSaturday = 0 (início do ciclo da semana).
  // No domingo (0), (0 + 1) % 7 = 1 -> diffToSaturday = -1 (sábado de ontem).
  // Na segunda (1), diffToSaturday = -2.
  // ...
  // Na sexta (5), diffToSaturday = -6 (sábado de 6 dias atrás).
  const diffToSaturday = -((day + 1) % 7);

  const sat = new Date(now);
  sat.setDate(now.getDate() + diffToSaturday + offsetWeeks * 7);
  let start = formatISO(sat);
  const end = addDaysISO(start, 6); // Sexta-feira (7 dias: sábado a sexta)

  // Exceção inaugural da regra em 07/09/2026:
  // Apenas nesta primeira semana (05/09 a 11/09), não conta o sábado 05/09,
  // iniciando na segunda-feira 07/09 até sexta 11/09.
  if (start === '2026-09-05' && end === '2026-09-11') {
    start = '2026-09-07';
  }

  return { start, end };
};

/**
 * Retorna os limites de apuração de Descontos e Vales para o acerto vigente.
 * Regra independente do ciclo de comissão:
 * - Descontos e vales pertencentes ao acerto são considerados de SEGUNDA a SÁBADO.
 * - Para um ciclo de comissão Sábado a Sexta, a janela de descontos correspondente
 *   começa na segunda-feira seguinte ao sábado de início e termina no sábado seguinte
 *   à sexta-feira de encerramento.
 * - Exemplo: comissão 26/09 a 02/10 -> descontos 28/09 a 03/10.
 * - Isso impede que descontos do ciclo anterior sejam carregados para o acerto atual.
 */
export const getDescontosValesBounds = (weekStart: string, weekEnd: string): { start: string; end: string } => {
  const startDay = new Date(weekStart + 'T00:00:00').getDay();

  // Ciclo normal Sábado -> Sexta: descontos começam na segunda e terminam no sábado.
  // Na semana inaugural iniciada numa segunda, mantém a própria segunda como início.
  const start = startDay === 1 ? weekStart : addDaysISO(weekStart, 2);
  const end = addDaysISO(weekEnd, 1);

  return { start, end };
};

/** Sábado da semana seguinte à semana que termina em semanaFim (sexta-feira). */
const getProximaSemanaInicio = (semanaFim: string): string => addDaysISO(semanaFim, 1);

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
  semanaFim: row.semana_fim,
  status: (row.status as CaixaStatus) || 'aberto',
  saldoAnterior: Number(row.saldo_anterior) || 0,
  salarioBase: row.salario_base !== null && row.salario_base !== undefined ? Number(row.salario_base) : undefined,
  totalComissao: row.total_comissao !== null && row.total_comissao !== undefined ? Number(row.total_comissao) : undefined,
  totalDescontos: row.total_descontos !== null && row.total_descontos !== undefined ? Number(row.total_descontos) : undefined,
  totalPago: row.total_pago !== null && row.total_pago !== undefined ? Number(row.total_pago) : undefined,
  saldoFinal: row.saldo_final !== null && row.saldo_final !== undefined ? Number(row.saldo_final) : undefined,
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
 * Isso sozinho NÃO fecha semanas antigas -- ver avancarCaixaSeNecessario() logo abaixo, que
 * deve ser chamado em seguida sempre que já tivermos salário/serviços/descontos disponíveis.
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
  if (aberto) {
    const caixaMapped = mapCaixaRow(aberto);
    const fimDate = new Date(`${caixaMapped.semanaFim}T12:00:00`);
    // Se o caixa aberto atual ainda estiver no padrão antigo (terminando em sábado),
    // ajusta para terminar na sexta-feira (ciclo sábado a sexta).
    if (fimDate.getDay() === 6) {
      const novaSexta = addDaysISO(caixaMapped.semanaFim, -1);
      const novoInicio = addDaysISO(novaSexta, -6);
      supabase
        .from('comissoes_caixas_semanais')
        .update({ semana_inicio: novoInicio, semana_fim: novaSexta })
        .eq('id', caixaMapped.id)
        .then(() => {});
      caixaMapped.semanaInicio = novoInicio;
      caixaMapped.semanaFim = novaSexta;
    }

    // Regra de início em 07/09/2026: se o caixa aberto ainda estiver marcado com início 05/09/2026
    if (caixaMapped.semanaInicio === '2026-09-05' && caixaMapped.semanaFim === '2026-09-11') {
      supabase
        .from('comissoes_caixas_semanais')
        .update({ semana_inicio: '2026-09-07' })
        .eq('id', caixaMapped.id)
        .then(() => {});
      caixaMapped.semanaInicio = '2026-09-07';
    }
    return caixaMapped;
  }

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
export async function getHistoricoCaixasFechados(colaboradorId: string, limit = 60): Promise<WeeklyCaixa[]> {
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

/**
 * Data (domingo) em que o caixa do colaborador começou a existir -- usada só pra saber quantas
 * semanas de salário-base já se passaram em filtros de Mês/Ano no Dashboard. Diferente de
 * `caixa.semanaInicio` do caixa ABERTO, que agora é sempre a semana atual (não o começo).
 */
export async function getDataInicioColaborador(colaboradorId: string): Promise<string> {
  const { data, error } = await supabase
    .from('comissoes_caixas_semanais')
    .select('semana_inicio')
    .eq('colaborador_id', colaboradorId)
    .order('semana_inicio', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) return getWorkWeekBounds().start;
  return data.semana_inicio as string;
}

// --- Pagamentos (sempre ligados a UMA semana/caixa específico) ---

export async function getPagamentosDoCaixa(caixaId: string): Promise<Pagamento[]> {
  const { data, error } = await supabase
    .from('comissoes_pagamentos')
    .select('*')
    .eq('caixa_id', caixaId)
    .order('data', { ascending: false });
  if (error || !data) return [];
  return data.map(mapPagamentoRow);
}

export async function getPagamentosDoColaborador(colaboradorId: string): Promise<Pagamento[]> {
  const { data, error } = await supabase
    .from('comissoes_pagamentos')
    .select('*')
    .eq('colaborador_id', colaboradorId)
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

// Quantas cargas de salário-base semanal caem dentro do intervalo [start, end], contando a
// partir de `dataInicio` (nunca conta semana anterior a ela). Usado só pelos filtros
// Mês/Ano/Personalizado do Dashboard pra saber quantas semanas de salário mostrar.
function contarSemanasSalario(dataInicio: string, start: string, end: string): number {
  const inicioEfetivo = dataInicio > start ? dataInicio : start;
  if (inicioEfetivo > end) return 0;

  const inicioDate = new Date(`${inicioEfetivo}T00:00:00`);
  const fimDate = new Date(`${end}T00:00:00`);
  const diffDays = Math.round((fimDate.getTime() - inicioDate.getTime()) / 86400000) + 1;

  // Se o período filtrado tem até 8 dias (ex.: "Hoje", "Ontem" ou "Esta Semana" de Sábado a Sexta/Sábado),
  // o salário base semanal corresponde a EXATAMENTE 1 semana de trabalho (nunca dobra).
  if (diffDays <= 8) {
    return 1;
  }

  // Ciclo oficial de produção semanal: SÁBADO até SEXTA-FEIRA.
  // diffToSaturday = -((day + 1) % 7) acha o sábado de início do ciclo corrente.
  const day = inicioDate.getDay(); // 0 = Dom ... 6 = Sáb
  const diffToSaturday = -((day + 1) % 7);
  const sabado = new Date(inicioDate);
  sabado.setDate(inicioDate.getDate() + diffToSaturday);

  let count = 0;
  const cursor = new Date(sabado);
  while (cursor <= fimDate) {
    count++;
    cursor.setDate(cursor.getDate() + 7);
  }
  return Math.max(1, count);
}

// --- Cálculo do resumo ---

export interface ResumoCaixa {
  salarioBase: number;
  totalComissao: number;
  totalDescontos: number;
  totalPago: number;
  saldoSemana: number; // salarioBase + totalComissao - totalDescontos - totalPago (só da semana desse caixa)
  saldoFinal: number;  // saldoAnterior + saldoSemana
}

/**
 * Resumo da semana desse caixa especificamente (sempre limitado a
 * [caixa.semanaInicio, caixa.semanaFim] -- nunca soma semanas de fora, é isso que faz o saldo
 * não inflar mais com o histórico inteiro do colaborador).
 */
export function calcularResumoCaixa(
  caixa: WeeklyCaixa,
  salarioBase: number,
  services: ServiceItem[],
  descontos: Desconto[],
  pagamentos: Pagamento[],
  extra?: { modalidadeRemuneracao?: ModalidadeRemuneracao; metaPercentual?: number; comissaoPadraoPercentual?: number; metasValores?: MetaValorItem[]; metaValorMinimo?: number; metaValorMaximo?: number }
): ResumoCaixa {
  const validServices = services
    .filter((s) => s.date >= caixa.semanaInicio && s.date <= caixa.semanaFim && s.status !== 'CANCELADO');

  const totalProducao = validServices.reduce((acc, s) => acc + (s.productionValue || 0), 0);
  const totalComissaoServicos = validServices.reduce((acc, s) => acc + (s.commissionValue || 0), 0);

  const remuneracao = calcularRemuneracaoSemanal(
    {
      modalidade: extra?.modalidadeRemuneracao || 'fixo_comissao',
      salarioBase,
      comissaoPadraoPercentual: Number(extra?.comissaoPadraoPercentual) || 0,
      metaPercentual: Number(extra?.metaPercentual) || 0,
      metasValores: extra?.metasValores,
      metaValorMinimo: extra?.metaValorMinimo,
      metaValorMaximo: extra?.metaValorMaximo,
    },
    totalProducao,
    totalComissaoServicos
  );

  const descBounds = getDescontosValesBounds(caixa.semanaInicio, caixa.semanaFim);
  const totalDescontos = calculateDescontosNoPeriodo(descontos, descBounds.start, descBounds.end);
  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const saldoSemana = remuneracao.totalBruto - totalDescontos - totalPago;
  const saldoFinal = caixa.saldoAnterior + saldoSemana;

  return {
    salarioBase: remuneracao.salarioBaseEfetivo,
    totalComissao: remuneracao.comissaoEfetiva,
    totalDescontos,
    totalPago,
    saldoSemana,
    saldoFinal,
  };
}

/**
 * Mesmo cálculo, mas isolado num intervalo de datas arbitrário (usado pelos filtros
 * Hoje/Ontem/Semana/Mês/Personalizado do Dashboard). `dataInicioReal` é a data em que o
 * colaborador começou (ver getDataInicioColaborador) -- só usada pra não contar semana de
 * salário anterior ao início dele.
 */
export function calcularResumoNoIntervalo(
  dataInicioReal: string,
  salarioBase: number,
  services: ServiceItem[],
  descontos: Desconto[],
  pagamentos: Pagamento[],
  inicio: string,
  fim: string,
  extra?: { modalidadeRemuneracao?: ModalidadeRemuneracao; metaPercentual?: number; comissaoPadraoPercentual?: number; metasValores?: MetaValorItem[]; metaValorMinimo?: number; metaValorMaximo?: number; faturamentoGeral?: number }
): ResumoCaixa {
  const validServices = services
    .filter((s) => s.date >= inicio && s.date <= fim && s.status !== 'CANCELADO');

  const totalProducao = validServices.reduce((acc, s) => acc + (s.productionValue || 0), 0);
  const totalComissaoServicos = validServices.reduce((acc, s) => acc + (s.commissionValue || 0), 0);

  const diffDiasIntervalo = Math.abs(Math.round((new Date(`${fim}T00:00:00`).getTime() - new Date(`${inicio}T00:00:00`).getTime()) / 86400000)) + 1;
  const qtdSemanas = diffDiasIntervalo <= 8 ? 1 : contarSemanasSalario(dataInicioReal, inicio, fim);
  const salarioBaseTotal = salarioBase * qtdSemanas;

  const remuneracao = calcularRemuneracaoSemanal(
    {
      modalidade: extra?.modalidadeRemuneracao || 'fixo_comissao',
      salarioBase: salarioBaseTotal,
      comissaoPadraoPercentual: Number(extra?.comissaoPadraoPercentual) || 0,
      metaPercentual: Number(extra?.metaPercentual) || 0,
      metasValores: extra?.metasValores,
      metaValorMinimo: extra?.metaValorMinimo,
      metaValorMaximo: extra?.metaValorMaximo,
      // Modalidade META: a faixa é escolhida pela receita da loja (notas quitadas Sáb–Sex).
      // Sem isso o helper cai na produção individual e o valor sai menor que o degrau atingido.
      faturamentoGeral: extra?.faturamentoGeral,
    },
    totalProducao,
    totalComissaoServicos
  );

  // Se o fim do período é uma Sexta-feira (semana de trabalho padrão), os descontos e vales
  // estendem até o Sábado de fechamento ("o desconto vem para o dia, agora só a comissão que é contada para o outro dia")
  const isWeekEndingFriday = new Date(`${fim}T00:00:00`).getDay() === 5;
  const descBounds = isWeekEndingFriday
    ? getDescontosValesBounds(inicio, fim)
    : { start: inicio, end: fim };

  const totalDescontos = calculateDescontosNoPeriodo(descontos, descBounds.start, descBounds.end);
  const totalPago = pagamentos
    .filter((p) => p.data >= descBounds.start && p.data <= descBounds.end)
    .reduce((acc, p) => acc + p.valor, 0);

  const saldoSemana = remuneracao.totalBruto - totalDescontos - totalPago;
  return {
    salarioBase: remuneracao.salarioBaseEfetivo,
    totalComissao: remuneracao.comissaoEfetiva,
    totalDescontos,
    totalPago,
    saldoSemana,
    saldoFinal: saldoSemana,
  };
}

// --- Cadeia de saldos entre semanas ---

export interface CadeiaItem {
  caixaId: string;
  semanaInicio: string;
  semanaFim: string;
  status: CaixaStatus;
  saldoAnteriorAntes: number;
  saldoAnteriorDepois: number;
  totalPagoAntes: number | null;
  totalPagoDepois: number | null;
  saldoFinalAntes: number | null;
  saldoFinalDepois: number | null;
}

const round2 = (n: number) => Number(n.toFixed(2));

/**
 * Recalcula, a partir de uma semana fechada, o total pago, o saldo final e o saldo anterior
 * de todas as semanas seguintes (até a aberta). Usa os valores congelados de salário, comissão
 * e descontos de cada semana fechada. `override` simula a edição/exclusão de um pagamento antes
 * dela ser salva (valor null = pagamento excluído), para mostrar o antes/depois na confirmação.
 */
export async function calcularCadeiaAPartirDe(
  colaboradorId: string,
  caixaEditadoId: string,
  override?: { pagamentoId: string; novoValor: number | null },
  adicional?: { caixaId: string; valor: number }
): Promise<CadeiaItem[]> {
  const [{ data: caixas }, { data: pags }] = await Promise.all([
    supabase.from('comissoes_caixas_semanais').select('*').eq('colaborador_id', colaboradorId).order('semana_inicio', { ascending: true }),
    supabase.from('comissoes_pagamentos').select('id, caixa_id, valor').eq('colaborador_id', colaboradorId),
  ]);
  if (!caixas || !pags) return [];

  const idx = caixas.findIndex((c: any) => c.id === caixaEditadoId);
  if (idx < 0) return [];

  const somaPagamentos = (caixaId: string) =>
    pags.reduce((acc: number, p: any) => {
      if (p.caixa_id !== caixaId) return acc;
      if (override && p.id === override.pagamentoId) return acc + (override.novoValor ?? 0);
      return acc + (Number(p.valor) || 0);
    }, adicional && adicional.caixaId === caixaId ? adicional.valor : 0);

  const itens: CadeiaItem[] = [];
  let saldoAnteriorAtual = Number(caixas[idx].saldo_anterior) || 0;

  for (let i = idx; i < caixas.length; i++) {
    const c: any = caixas[i];
    const antesAnterior = Number(c.saldo_anterior) || 0;
    const antesPago = c.total_pago != null ? Number(c.total_pago) : null;
    const antesFinal = c.saldo_final != null ? Number(c.saldo_final) : null;

    if (c.status === 'fechado') {
      const totalPago = round2(somaPagamentos(c.id));
      const saldoSemana = (Number(c.salario_base) || 0) + (Number(c.total_comissao) || 0) - (Number(c.total_descontos) || 0) - totalPago;
      const saldoFinal = round2(saldoAnteriorAtual + saldoSemana);
      itens.push({
        caixaId: c.id, semanaInicio: c.semana_inicio, semanaFim: c.semana_fim, status: 'fechado',
        saldoAnteriorAntes: antesAnterior, saldoAnteriorDepois: round2(saldoAnteriorAtual),
        totalPagoAntes: antesPago, totalPagoDepois: totalPago,
        saldoFinalAntes: antesFinal, saldoFinalDepois: saldoFinal,
      });
      saldoAnteriorAtual = saldoFinal;
    } else {
      itens.push({
        caixaId: c.id, semanaInicio: c.semana_inicio, semanaFim: c.semana_fim, status: 'aberto',
        saldoAnteriorAntes: antesAnterior, saldoAnteriorDepois: round2(saldoAnteriorAtual),
        totalPagoAntes: null, totalPagoDepois: null, saldoFinalAntes: null, saldoFinalDepois: null,
      });
    }
  }
  return itens;
}

/**
 * Grava a cadeia calculada por calcularCadeiaAPartirDe. A semana editada (primeiro item) sempre
 * é atualizada; as seguintes só quando `propagar` for true.
 */
export async function aplicarCadeia(itens: CadeiaItem[], propagar: boolean): Promise<boolean> {
  const alvo = propagar ? itens : itens.slice(0, 1);
  const agora = new Date().toISOString();
  let ok = true;
  for (let i = 0; i < alvo.length; i++) {
    const it = alvo[i];
    const patch: Record<string, any> = { updated_at: agora };
    if (i > 0) patch.saldo_anterior = it.saldoAnteriorDepois;
    if (it.status === 'fechado') {
      patch.total_pago = it.totalPagoDepois;
      patch.saldo_final = it.saldoFinalDepois;
    }
    const { error } = await supabase.from('comissoes_caixas_semanais').update(patch).eq('id', it.caixaId);
    if (error) { console.error('Erro ao atualizar cadeia de saldos:', error); ok = false; }
  }
  return ok;
}

/** Texto do aviso de confirmação com o antes/depois de cada semana afetada. */
export function descreverCadeia(itens: CadeiaItem[]): string {
  const fmt = (n: number | null) => n == null ? '—' : `R$ ${n.toFixed(2).replace('.', ',')}`;
  const br = (d: string) => d.split('-').reverse().join('/');
  return itens
    .slice(1)
    .filter((it) => it.saldoAnteriorAntes !== it.saldoAnteriorDepois || it.saldoFinalAntes !== it.saldoFinalDepois)
    .map((it) => it.status === 'aberto'
      ? `Semana atual (${br(it.semanaInicio)}): saldo anterior ${fmt(it.saldoAnteriorAntes)} → ${fmt(it.saldoAnteriorDepois)}`
      : `Semana ${br(it.semanaInicio)}: saldo final ${fmt(it.saldoFinalAntes)} → ${fmt(it.saldoFinalDepois)}`)
    .join('\n');
}

// --- Fechamento automático da(s) semana(s) vencida(s) ---

/**
 * Fecha o caixa em aberto (congela o resumo calculado nele) e já cria/abre o caixa da semana
 * seguinte, com saldo_anterior = saldo_final que acabou de ser calculado. Retorna o novo caixa
 * já aberto.
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

  const proximaSemanaInicio = getProximaSemanaInicio(caixa.semanaFim);
  const proximaSemanaFim = addDaysISO(proximaSemanaInicio, 6);

  // O saldo final da semana (já inclui o saldo anterior) é repassado inteiro para a seguinte:
  // negativo = dívida do colaborador, positivo = valor que ainda tem a receber.
  const saldoAnteriorProximaSemana = Number(resumo.saldoFinal.toFixed(2));

  const { data: proximo, error: openError } = await supabase
    .from('comissoes_caixas_semanais')
    .insert({
      colaborador_id: caixa.colaboradorId,
      semana_inicio: proximaSemanaInicio,
      semana_fim: proximaSemanaFim,
      status: 'aberto',
      saldo_anterior: saldoAnteriorProximaSemana,
    })
    .select()
    .single();

  if (openError || !proximo) {
    // Semana seguinte já existia (ex: duas abas abertas fechando ao mesmo tempo) -- busca ela
    // em vez de falhar, pra tela sempre ter um caixa aberto pra mostrar.
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

/**
 * Chamada toda vez que a tela carrega, logo depois de já termos o caixa aberto + serviços +
 * descontos + salário do colaborador em mãos. Se a semana desse caixa já virou (semana_fim já
 * passou -- ex: ninguém abriu o app no sábado, ou o colaborador ficou uma semana de férias),
 * fecha essa semana (e quantas mais precisar, uma de cada vez) até chegar na semana atual,
 * carregando a sobra/dívida de sábado em sábado. Se a semana ainda está em curso, não faz nada
 * e devolve o mesmo caixa recebido.
 */
export async function avancarCaixaSeNecessario(
  caixaInicial: WeeklyCaixa,
  salarioBase: number,
  services: ServiceItem[],
  descontos: Desconto[],
  extra?: { modalidadeRemuneracao?: ModalidadeRemuneracao; metaPercentual?: number; comissaoPadraoPercentual?: number; metasValores?: MetaValorItem[]; metaValorMinimo?: number; metaValorMaximo?: number }
): Promise<WeeklyCaixa> {
  let caixa = caixaInicial;
  const hoje = getTodayISO();
  let guard = 0;

  // Fecha semanas passadas quando já passou o sábado de pagamento (ou seja, a partir de domingo).
  // Se semanaFim é Sexta-feira, addDaysISO(caixa.semanaFim, 1) é o Sábado de pagamento.
  // O caixa só deve fechar automaticamente quando hoje for estritamente maior que esse sábado de pagamento.
  while (caixa.status === 'aberto' && addDaysISO(caixa.semanaFim, 1) < hoje && guard < 260) {
    guard++;
    const pagamentosDaSemana = await getPagamentosDoCaixa(caixa.id);
    const resumo = calcularResumoCaixa(caixa, salarioBase, services, descontos, pagamentosDaSemana, extra);
    const proximo = await fecharCaixa(caixa, resumo);
    if (!proximo) break; // não trava a tela numa semana antiga se o fechamento falhar
    caixa = proximo;
  }

  return caixa;
}

// --- Agregação por Período (Semana / Mês / Ano) ---

export type PeriodoVisualizacao = 'semana' | 'mes' | 'ano';

export interface ResumoPorPeriodo {
  periodo: PeriodoVisualizacao;
  label: string;         // "01/08 a 07/08", "Agosto/2026", "2026"
  inicio: string;        // YYYY-MM-DD do início do período mostrado
  fim: string;           // YYYY-MM-DD do fim do período mostrado
  salarioBase: number;
  totalComissao: number;
  totalDescontos: number;
  totalPago: number;
  saldoAnterior: number; // saldo trazido de antes desse período especificamente
  saldoPeriodo: number;  // salarioBase + comissao - descontos - pago, isolado no período
  saldoFinal: number;    // saldo acumulado real HOJE (dívida/crédito atual do caixa aberto) -- não filtrado por período
  qtdSemanas: number;
}

function nomeMesPt(mes: number): string {
  const nomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return nomes[mes] || '';
}

const formatBR = (iso: string) => iso.split('-').reverse().join('/');

const zeroResumoPorPeriodo = (periodo: PeriodoVisualizacao, inicio = '', fim = ''): ResumoPorPeriodo => ({
  periodo, label: '', inicio, fim, salarioBase: 0, totalComissao: 0, totalDescontos: 0,
  totalPago: 0, saldoAnterior: 0, saldoPeriodo: 0, saldoFinal: 0, qtdSemanas: 0,
});

/**
 * Resumo agregado pra Semana / Mês / Ano.
 *
 * - Semana atual (a do caixa aberto): usa `resumoCaixaAberto` (cálculo ao vivo).
 * - Semana passada: busca o snapshot já CONGELADO no fechamento (não recalcula nada).
 * - Mês/Ano: soma os snapshots das semanas fechadas que caem no intervalo + a semana aberta,
 *   se ela também cair no intervalo -- cada semana entra com exatamente 1x salário-base (o que
 *   já foi congelado ou o que está sendo calculado ao vivo agora), sem inflar nada.
 *
 * offset permite navegar pra período anterior (offset negativo); só permite passado/atual.
 * `saldoFinal` é sempre o saldo acumulado REAL agora (o do caixa aberto), independente do
 * período/offset navegado -- uma dívida antiga não desaparece só porque você olhou pro mês passado.
 */
export function calcularResumoPorPeriodo(
  periodo: PeriodoVisualizacao,
  caixaAberto: WeeklyCaixa | null,
  historico: WeeklyCaixa[],
  resumoCaixaAberto: ResumoCaixa | null,
  offset: number = 0
): ResumoPorPeriodo {
  if (!caixaAberto || !resumoCaixaAberto) return zeroResumoPorPeriodo(periodo);

  const { start, end } =
    periodo === 'semana' ? getWorkWeekBounds(offset) :
    periodo === 'mes' ? getMonthBounds(offset) :
    getYearBounds(offset);

  // Na visualização semanal, os descontos e vales apurados estendem até o sábado de acerto
  const descBounds = periodo === 'semana' ? getDescontosValesBounds(start, end) : { start, end };
  const fimEfetivo = descBounds.end;

  const label =
    periodo === 'semana' ? `${formatBR(start)} a ${formatBR(end)}` :
    periodo === 'mes' ? `${nomeMesPt(new Date(`${start}T00:00:00`).getMonth())}/${new Date(`${start}T00:00:00`).getFullYear()}` :
    `${new Date(`${start}T00:00:00`).getFullYear()}`;

  // Semana atual: já temos tudo calculado ao vivo.
  if (periodo === 'semana' && start === caixaAberto.semanaInicio) {
    return {
      periodo, label, inicio: start, fim: fimEfetivo,
      salarioBase: resumoCaixaAberto.salarioBase,
      totalComissao: resumoCaixaAberto.totalComissao,
      totalDescontos: resumoCaixaAberto.totalDescontos,
      totalPago: resumoCaixaAberto.totalPago,
      saldoAnterior: caixaAberto.saldoAnterior,
      // Inclui o saldo anterior: mostra o resultado acumulado da semana (dívida ou crédito).
      saldoPeriodo: resumoCaixaAberto.saldoFinal,
      saldoFinal: resumoCaixaAberto.saldoFinal,
      qtdSemanas: 1,
    };
  }

  // Semana específica no passado: usa o snapshot congelado no fechamento dela.
  if (periodo === 'semana') {
    const fechado = historico.find((c) => c.semanaInicio === start);
    if (!fechado || fechado.saldoFinal === undefined) return zeroResumoPorPeriodo(periodo, start, fimEfetivo);
    return {
      periodo, label, inicio: start, fim: fimEfetivo,
      salarioBase: fechado.salarioBase || 0,
      totalComissao: fechado.totalComissao || 0,
      totalDescontos: fechado.totalDescontos || 0,
      totalPago: fechado.totalPago || 0,
      saldoAnterior: fechado.saldoAnterior,
      saldoPeriodo: fechado.saldoFinal,
      saldoFinal: resumoCaixaAberto.saldoFinal, // saldo acumulado real é sempre o de agora
      qtdSemanas: 1,
    };
  }

  // Mês / Ano: soma as semanas (fechadas + a aberta, se cair no intervalo).
  const fechadasNoIntervalo = historico.filter((c) => c.semanaInicio >= start && c.semanaInicio <= end && c.saldoFinal !== undefined);
  const abertaEntra = caixaAberto.semanaInicio >= start && caixaAberto.semanaInicio <= end;

  let salarioBase = 0, totalComissao = 0, totalDescontos = 0, totalPago = 0, saldoAnteriorMaisAntigo = 0;
  let qtdSemanas = 0;

  // Semana mais antiga do intervalo dá o "saldo anterior" do período inteiro.
  const todasNoIntervalo = [...fechadasNoIntervalo].sort((a, b) => a.semanaInicio.localeCompare(b.semanaInicio));
  if (abertaEntra) todasNoIntervalo.push(caixaAberto);
  if (todasNoIntervalo.length > 0) saldoAnteriorMaisAntigo = todasNoIntervalo[0].saldoAnterior;

  fechadasNoIntervalo.forEach((c) => {
    salarioBase += c.salarioBase || 0;
    totalComissao += c.totalComissao || 0;
    totalDescontos += c.totalDescontos || 0;
    totalPago += c.totalPago || 0;
    qtdSemanas++;
  });

  if (abertaEntra) {
    salarioBase += resumoCaixaAberto.salarioBase;
    totalComissao += resumoCaixaAberto.totalComissao;
    totalDescontos += resumoCaixaAberto.totalDescontos;
    totalPago += resumoCaixaAberto.totalPago;
    qtdSemanas++;
  }

  const saldoPeriodo = salarioBase + totalComissao - totalDescontos - totalPago;

  return {
    periodo, label, inicio: start, fim: end,
    salarioBase, totalComissao, totalDescontos, totalPago,
    saldoAnterior: saldoAnteriorMaisAntigo,
    saldoPeriodo,
    saldoFinal: resumoCaixaAberto.saldoFinal,
    qtdSemanas,
  };
}
