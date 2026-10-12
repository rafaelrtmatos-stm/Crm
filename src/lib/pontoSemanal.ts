// Leitura isolada do ponto por ciclo semanal (sábado a sexta).
// Funções puras: NÃO acessam Supabase/React e NÃO são usadas por nenhuma tela ainda.
// Só devolvem minutos (normais, extras, faltas, pendências); valores em R$ e pagamento ficam para etapas seguintes.
// Só deve ser aplicada a funcionários vinculados ao ponto (ponto_funcionarios.colaborador_id preenchido).
// Datas "YYYY-MM-DD" (data local). Reaproveita pontoCalc.ts sem alterá-lo.

import {
  PontoJornada,
  PontoRegistro,
  StatusDia,
  analisarDia,
  hojeStr,
  jornadaDoDia,
  somarDias,
} from './pontoCalc';

/** Dias entre o fim do ciclo (sexta) e o pagamento das horas normais: 03/10–09/10 -> pago em 17/10. */
export const DIAS_ATE_PAGAMENTO = 8;

/** Sábado que inicia o ciclo (sábado a sexta) que contém `dateStr`. */
export function inicioCicloSabSex(dateStr: string): string {
  const dow = new Date(`${dateStr}T12:00:00`).getDay(); // 0 = domingo ... 6 = sábado
  return somarDias(dateStr, -((dow + 1) % 7));
}

/** Limites do ciclo sábado a sexta que contém `dateStr`. */
export function limitesCiclo(dateStr: string): { inicio: string; fim: string } {
  const inicio = inicioCicloSabSex(dateStr);
  return { inicio, fim: somarDias(inicio, 6) };
}

/** Data prevista de pagamento das horas normais do ciclo que termina em `fim` (sexta). */
export function dataPagamentoHorasNormais(fim: string): string {
  return somarDias(fim, DIAS_ATE_PAGAMENTO);
}

export interface DiaCicloPonto {
  data: string;
  status: StatusDia;
  trabalhados: number; // min
  previstos: number; // min
  normais: number; // min a considerar como horas normais do dia
  extra: number; // min de hora extra (além da tolerância)
  falta: boolean; // dia de jornada sem nenhuma batida (já passou)
  devidos: number; // min devidos (previstos) quando falta = true
}

export interface ResumoCicloPonto {
  inicio: string;
  fim: string;
  pagamentoPrevisto: string;
  dias: DiaCicloPonto[];
  minutosNormais: number;
  minutosExtra: number;
  faltas: number;
  minutosDevidos: number;
  /** Dias passados com batida faltando: ficam fora do cálculo até serem corrigidos. */
  pendencias: string[];
  /** true quando o ciclo ainda tem dias futuros ou pendências (resultado ainda pode mudar). */
  provisorio: boolean;
}

export interface EntradaCicloPonto {
  registros: PontoRegistro[];
  jornadas: PontoJornada[];
  /** Qualquer data dentro do ciclo desejado. */
  dataNoCiclo: string;
  tolerancia?: number;
  hoje?: string;
}

/**
 * Resume um ciclo sábado–sexta de um funcionário vinculado ao ponto.
 * - Horas normais: min(trabalhado, previsto) em dias de jornada com batidas completas.
 * - Horas extras: o `extra` de analisarDia (inclui dia fora da jornada), respeitando a tolerância.
 * - Falta: dia de jornada passado sem batida; devidos = minutos previstos.
 * - Dia incompleto (esqueceu batida): não entra em normais nem em faltas; vira pendência.
 */
export function resumirCicloPonto(e: EntradaCicloPonto): ResumoCicloPonto {
  const tolerancia = e.tolerancia ?? 10;
  const hoje = e.hoje ?? hojeStr();
  const { inicio, fim } = limitesCiclo(e.dataNoCiclo);
  const porData = new Map(e.registros.map((r) => [r.data, r]));

  const dias: DiaCicloPonto[] = [];
  const pendencias: string[] = [];
  let provisorio = false;

  for (let i = 0; i < 7; i++) {
    const data = somarDias(inicio, i);
    const jornada = jornadaDoDia(e.jornadas, data);
    const a = analisarDia(porData.get(data), jornada, data, hoje, tolerancia);

    const diaDeJornada = !!jornada && jornada.trabalha;
    const falta = a.status === 'ausente' && diaDeJornada;
    const contaNormal = (a.status === 'presente' || a.status === 'atrasado') && diaDeJornada;
    if (a.status === 'incompleto') pendencias.push(data);
    if (a.status === 'aguardando') provisorio = true;

    dias.push({
      data,
      status: a.status,
      trabalhados: a.trabalhados,
      previstos: a.previstos,
      normais: contaNormal ? Math.min(a.trabalhados, a.previstos) : 0,
      extra: a.status === 'incompleto' ? 0 : a.extra,
      falta,
      devidos: falta ? a.previstos : 0,
    });
  }

  if (pendencias.length > 0) provisorio = true;

  return {
    inicio,
    fim,
    pagamentoPrevisto: dataPagamentoHorasNormais(fim),
    dias,
    minutosNormais: dias.reduce((s, d) => s + d.normais, 0),
    minutosExtra: dias.reduce((s, d) => s + d.extra, 0),
    faltas: dias.filter((d) => d.falta).length,
    minutosDevidos: dias.reduce((s, d) => s + d.devidos, 0),
    pendencias,
    provisorio,
  };
}
