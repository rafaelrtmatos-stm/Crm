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

/** Domingo a sábado da semana atual (offsetWeeks negativo/positivo desloca por semanas inteiras). */
export const getWorkWeekBounds = (offsetWeeks = 0): { start: string; end: string } => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = domingo ... 6 = sábado
  const distanceToSun = -dayOfWeek;
  const sun = new Date(now);
  sun.setDate(now.getDate() + distanceToSun + offsetWeeks * 7);
  return { start: formatISO(sun), end: addDaysISO(formatISO(sun), 6) };
};

/** Domingo da semana seguinte à semana que termina em semanaFim (sábado). */
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

  const d = new Date(`${inicioEfetivo}T00:00:00`);
  const domingo = new Date(d);
  domingo.setDate(d.getDate() - d.getDay());

  const fim = new Date(`${end}T00:00:00`);
  let count = 0;
  const cursor = new Date(domingo);
  while (cursor <= fim) {
    count++;
    cursor.setDate(cursor.getDate() + 7);
  }
  return count;
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
  fim: string
): ResumoCaixa {
  const totalComissao = services
    .filter((s) => s.date >= inicio && s.date <= fim && s.status !== 'CANCELADO')
    .reduce((acc, s) => acc + (s.commissionValue || 0), 0);
  const totalDescontos = calculateDescontosNoPeriodo(descontos, inicio, fim);
  const totalPago = pagamentos
    .filter((p) => p.data >= inicio && p.data <= fim)
    .reduce((acc, p) => acc + p.valor, 0);
  const qtdSemanas = contarSemanasSalario(dataInicioReal, inicio, fim);
  const salarioBaseNoIntervalo = salarioBase * qtdSemanas;
  const saldoSemana = salarioBaseNoIntervalo + totalComissao - totalDescontos - totalPago;
  return { salarioBase: salarioBaseNoIntervalo, totalComissao, totalDescontos, totalPago, saldoSemana, saldoFinal: saldoSemana };
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
  descontos: Desconto[]
): Promise<WeeklyCaixa> {
  let caixa = caixaInicial;
  const hoje = getTodayISO();
  let guard = 0;

  while (caixa.status === 'aberto' && caixa.semanaFim < hoje && guard < 260) {
    guard++;
    const pagamentosDaSemana = await getPagamentosDoCaixa(caixa.id);
    const resumo = calcularResumoCaixa(caixa, salarioBase, services, descontos, pagamentosDaSemana);
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

  const label =
    periodo === 'semana' ? `${formatBR(start)} a ${formatBR(end)}` :
    periodo === 'mes' ? `${nomeMesPt(new Date(`${start}T00:00:00`).getMonth())}/${new Date(`${start}T00:00:00`).getFullYear()}` :
    `${new Date(`${start}T00:00:00`).getFullYear()}`;

  // Semana atual: já temos tudo calculado ao vivo.
  if (periodo === 'semana' && start === caixaAberto.semanaInicio) {
    return {
      periodo, label, inicio: start, fim: end,
      salarioBase: resumoCaixaAberto.salarioBase,
      totalComissao: resumoCaixaAberto.totalComissao,
      totalDescontos: resumoCaixaAberto.totalDescontos,
      totalPago: resumoCaixaAberto.totalPago,
      saldoAnterior: caixaAberto.saldoAnterior,
      saldoPeriodo: resumoCaixaAberto.saldoSemana,
      saldoFinal: resumoCaixaAberto.saldoFinal,
      qtdSemanas: 1,
    };
  }

  // Semana específica no passado: usa o snapshot congelado no fechamento dela.
  if (periodo === 'semana') {
    const fechado = historico.find((c) => c.semanaInicio === start);
    if (!fechado || fechado.saldoFinal === undefined) return zeroResumoPorPeriodo(periodo, start, end);
    return {
      periodo, label, inicio: start, fim: end,
      salarioBase: fechado.salarioBase || 0,
      totalComissao: fechado.totalComissao || 0,
      totalDescontos: fechado.totalDescontos || 0,
      totalPago: fechado.totalPago || 0,
      saldoAnterior: fechado.saldoAnterior,
      saldoPeriodo: fechado.saldoFinal - fechado.saldoAnterior,
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
