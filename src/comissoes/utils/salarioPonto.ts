// FONTE ÚNICA das regras financeiras do ponto eletrônico (módulo puro: sem Supabase, sem React).
// Todas as telas (Meu Ponto, Meu Salário, Dashboard, Caixa, Funcionários/Admin e Previsão de Recebimento)
// obtêm o salário-base semanal e o débito do ponto daqui — direta ou indiretamente via `pontoSalario.ts`.
//
// Regras:
// - Salário proporcional = horas trabalhadas × (salário ÷ 220).
// - Feriado sem batida é abonado (jornada prevista paga, nunca é falta).
// - Feriado trabalhado: adicional de 100% (as horas normais já estão no proporcional).
// - Horas extras = minutos × 1,5 × valor da hora.
// - DSR: uma diária (salário ÷ 30) quando há ao menos uma falta na semana.
// - Destinação das extras/adicional de feriado: 'pagar' (entra no salário) OU 'folga' (vai para o banco de horas).
//   Nunca os dois: `minutosParaBanco` só é > 0 quando a destinação é 'folga'.
import { analisarDia, AnaliseDia, PontoJornada, PontoRegistro } from '../../lib/pontoCalc';
import { resumoExtras, detalheFeriado, ehFeriado, valorHora, valorDiaria, valorMinuto } from '../../lib/feriados';

export type DestinacaoExtras = 'pagar' | 'folga';

// A destinação continua guardada no navegador (sem migração de banco nesta etapa).
// Todo acesso passa por estas duas funções.
const chaveDestinacao = (colaboradorId: string) => `rpro_ponto_dest_${colaboradorId}`;

export function getDestinacaoExtras(colaboradorId: string): DestinacaoExtras {
  let v: string | null = null;
  try { v = localStorage.getItem(chaveDestinacao(colaboradorId)); } catch { /* sem storage: usa o padrão */ }
  return (v || 'pagar') === 'pagar' ? 'pagar' : 'folga';
}

export function setDestinacaoExtras(colaboradorId: string, destinacao: DestinacaoExtras): void {
  try { localStorage.setItem(chaveDestinacao(colaboradorId), destinacao); } catch { /* sem storage */ }
}

/** Dia já reduzido ao que o cálculo financeiro precisa. */
export interface DiaPonto {
  data: string;
  trabalhados: number; // minutos
  previstos: number; // minutos
  extra: number; // minutos de extra apurados pelo ponto (fora da tolerância)
  /** Falta = ausente num dia de trabalho que não é feriado. Regra ÚNICA (antes havia 2 versões). */
  falta: boolean;
  /** A jornada do dia é de trabalho (usado só na apuração do banco de horas). */
  jornadaTrabalha: boolean;
}

export interface DiaPontoAnalisado {
  data: string;
  r: PontoRegistro | undefined;
  j: PontoJornada | undefined;
  a: AnaliseDia;
  dia: DiaPonto;
}

/** Os 7 dias da semana do ponto a partir de `inicio`, já analisados (única implementação do laço). */
export function analisarSemanaPonto(
  inicio: string,
  registros: PontoRegistro[],
  jornadas: PontoJornada[],
  tolerancia: number,
  hoje: string
): DiaPontoAnalisado[] {
  const rMap = new Map(registros.map((rx) => [rx.data, rx]));
  const startD = new Date(inicio + 'T12:00:00');
  const lista: DiaPontoAnalisado[] = [];
  for (let i = 0; i < 7; i++) {
    const data = new Date(startD.getTime() + i * 86400000).toISOString().split('T')[0];
    const dow = new Date(data + 'T12:00:00').getDay();
    const r = rMap.get(data);
    const j = jornadas.find((jj) => jj.dia_semana === dow) || jornadas[0];
    const a = analisarDia(r, j ?? null, data, hoje, tolerancia);
    const diaDeTrabalho = j ? !!j.trabalha : dow !== 0;
    lista.push({
      data,
      r,
      j,
      a,
      dia: {
        data,
        trabalhados: a.trabalhados,
        previstos: a.previstos,
        extra: a.extra,
        falta: a.status === 'ausente' && diaDeTrabalho && !ehFeriado(data),
        jornadaTrabalha: !!(j && j.trabalha),
      },
    });
  }
  return lista;
}

export interface EntradaSalarioPonto {
  salarioMensal: number;
  tolerancia: number;
  dias: DiaPonto[];
  destinacao: DestinacaoExtras;
  /** 'meta' não tem salário-base. */
  modalidade?: string | null;
  /** Minutos negativos lançados no banco de horas na semana do ponto. */
  debitoMin?: number;
}

export interface ResultadoSalarioPonto {
  minutosTrabalhados: number;
  faltas: number;
  extras: ReturnType<typeof resumoExtras>;
  pagaExtras: boolean;
  salarioHorasTrabalhadas: number;
  descontoDSR: number;
  valorAbonos: number;
  valorFeriadosPago: number;
  valorExtrasPago: number;
  /** Minutos (adicional de feriado + extras) que vão para o banco de horas. 0 quando a destinação é 'pagar'. */
  minutosParaBanco: number;
  /** Salário-base semanal do ponto (sem débito do banco). */
  base: number;
  debitoMin: number;
  debitoVal: number;
}

export function calcularSalarioPonto(e: EntradaSalarioPonto): ResultadoSalarioPonto {
  const salarioMensal = Number(e.salarioMensal) || 0;
  const pagaExtras = e.destinacao === 'pagar';
  const minutosTrabalhados = e.dias.reduce((s, d) => s + d.trabalhados, 0);
  const faltas = e.dias.filter((d) => d.falta).length;
  const extras = resumoExtras(
    e.dias.map((d) => ({ data: d.data, trabalhados: d.trabalhados, previstos: d.previstos, extra: d.extra })),
    salarioMensal,
    e.tolerancia
  );
  // Feriado sem batida é abonado (sempre pago); o adicional do dobro e as extras vão para o salário OU para o banco.
  const valorFeriadosPago = pagaExtras ? extras.valorFeriados : 0;
  const valorExtrasPago = pagaExtras ? extras.valorExtras : 0;
  const valFer = extras.valorAbonos + valorFeriadosPago;

  const salarioHorasTrabalhadas = valorHora(salarioMensal) * (minutosTrabalhados / 60);
  const descontoDSR = faltas > 0 ? valorDiaria(salarioMensal) : 0;
  const base = e.modalidade === 'meta' ? 0 : Math.max(0, salarioHorasTrabalhadas + valFer + valorExtrasPago - descontoDSR);

  const debitoMin = Math.max(0, Number(e.debitoMin) || 0);
  const debitoVal = debitoMin > 0 ? debitoMin * valorMinuto(salarioMensal) : 0;

  return {
    minutosTrabalhados,
    faltas,
    extras,
    pagaExtras,
    salarioHorasTrabalhadas,
    descontoDSR,
    valorAbonos: extras.valorAbonos,
    valorFeriadosPago,
    valorExtrasPago,
    minutosParaBanco: pagaExtras ? 0 : extras.minutosFeriadoAdicional + extras.minutosExtra,
    base,
    debitoMin,
    debitoVal,
  };
}

/**
 * Diferença de minutos da semana que entra no saldo do banco de horas (cálculo em tela, sem gravar nada).
 * Sem duplicidade: com destinação 'pagar' as horas extras já foram pagas no salário, então NÃO entram no banco;
 * com 'folga' entram no banco (e não no salário).
 */
export function minutosDiferencaSemanaBanco(
  dias: DiaPonto[],
  destinacao: DestinacaoExtras,
  tolerancia: number,
  hoje: string
): number {
  const paga = destinacao === 'pagar';
  return dias.reduce((s, d) => {
    if (d.data > hoje) return s;
    // Feriado: nunca gera débito (faltou = abonado). Se o adicional for para o banco, entra como crédito.
    const fer = detalheFeriado({ data: d.data, trabalhados: d.trabalhados, previstos: d.previstos, extra: d.extra }, tolerancia);
    if (fer) return s + (paga ? 0 : fer.adicionalMin + fer.extraAlemMin);
    if (d.jornadaTrabalha) return s + (d.trabalhados - d.previstos - (paga ? d.extra : 0));
    return s;
  }, 0);
}
