// Cálculo do ponto: compara as batidas do dia com a jornada prevista do funcionário.
// Funções puras (sem Supabase/React) pra facilitar teste. Datas sempre "YYYY-MM-DD" (data local), horas "HH:MM[:SS]".
// Tabelas em supabase/create_ponto.sql.

export interface PontoJornada {
  id?: string;
  funcionario_id?: string;
  dia_semana: number; // 0 = domingo ... 6 = sábado
  trabalha: boolean;
  entrada: string | null;
  inicio_intervalo: string | null;
  fim_intervalo: string | null;
  saida: string | null;
  vigente_desde: string;
}

export interface PontoRegistro {
  id?: string;
  funcionario_id: string;
  data: string;
  entrada: string | null;
  inicio_intervalo: string | null;
  fim_intervalo: string | null;
  saida: string | null;
  origem?: string;
  editado_manual?: boolean;
  observacao?: string | null;
}

export type StatusDia = 'presente' | 'atrasado' | 'ausente' | 'incompleto' | 'folga' | 'aguardando';

export interface AnaliseDia {
  status: StatusDia;
  trabalhados: number; // minutos
  previstos: number; // minutos
  atraso: number; // minutos (0 se dentro da tolerância)
  extra: number; // minutos de hora extra (0 se dentro da tolerância)
}

/** "08:05[:00]" -> 485. Vazio/inválido -> null. */
export function toMin(t?: string | null): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

/** 492 -> "8h 12min"; 0 -> "0h 00min". */
export function fmtHM(min: number): string {
  const neg = min < 0;
  const a = Math.abs(Math.round(min));
  return `${neg ? '-' : ''}${Math.floor(a / 60)}h ${String(a % 60).padStart(2, '0')}min`;
}

export const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '--:--');

/** Data local de hoje em YYYY-MM-DD. */
export function hojeStr(d: Date = new Date()): string {
  return d.toLocaleDateString('sv-SE');
}

/** Segunda-feira da semana de `dateStr` (YYYY-MM-DD). */
export function inicioDaSemana(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const dow = d.getDay(); // 0 = dom
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return hojeStr(d);
}

export function somarDias(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + n);
  return hojeStr(d);
}

/** Jornada em vigor na data: a de maior vigente_desde <= data para aquele dia da semana. */
export function jornadaDoDia(jornadas: PontoJornada[], dateStr: string): PontoJornada | null {
  const dow = new Date(`${dateStr}T12:00:00`).getDay();
  const cand = jornadas
    .filter((j) => j.dia_semana === dow && j.vigente_desde <= dateStr)
    .sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde));
  return cand[0] || null;
}

type Horarios = Pick<PontoRegistro, 'entrada' | 'inicio_intervalo' | 'fim_intervalo' | 'saida'>;

/** Minutos dos trechos COMPLETOS (entrada→início do intervalo e fim do intervalo→saída; ou entrada→saída sem intervalo). */
export function minutosTrabalhados(h: Horarios): number {
  const e = toMin(h.entrada), i = toMin(h.inicio_intervalo), f = toMin(h.fim_intervalo), s = toMin(h.saida);
  if (e !== null && i !== null && f !== null && s !== null) return Math.max(0, i - e) + Math.max(0, s - f);
  if (e !== null && s !== null && i === null && f === null) return Math.max(0, s - e);
  let total = 0;
  if (e !== null && i !== null) total += Math.max(0, i - e);
  if (f !== null && s !== null) total += Math.max(0, s - f);
  return total;
}

export function minutosPrevistos(j: PontoJornada | null): number {
  return j && j.trabalha ? minutosTrabalhados(j) : 0;
}

const temBatida = (r?: Horarios | null) => !!r && !!(r.entrada || r.inicio_intervalo || r.fim_intervalo || r.saida);

/**
 * Analisa um dia. `agoraMin` (minutos desde 00:00) só importa quando o dia é hoje: sem batida e já passou
 * da entrada + tolerância = ausente; antes disso = aguardando.
 */
export function analisarDia(
  reg: PontoRegistro | null | undefined,
  jornada: PontoJornada | null,
  data: string,
  hoje: string,
  tolerancia: number,
  agoraMin: number = 24 * 60,
): AnaliseDia {
  const previstos = minutosPrevistos(jornada);
  const trabalhados = reg ? minutosTrabalhados(reg) : 0;
  const base = { trabalhados, previstos, atraso: 0, extra: 0 };
  if (data > hoje) return { ...base, status: 'aguardando' };

  // Dia fora da jornada: sem batida = folga; com batida, tudo que trabalhou é hora extra.
  if (!jornada || !jornada.trabalha) {
    if (temBatida(reg)) return { ...base, status: 'presente', extra: trabalhados > tolerancia ? trabalhados : 0 };
    return { ...base, status: 'folga' };
  }

  if (!temBatida(reg)) {
    const entradaPrevista = toMin(jornada.entrada);
    if (data === hoje && (entradaPrevista === null || agoraMin <= entradaPrevista + tolerancia)) return { ...base, status: 'aguardando' };
    return { ...base, status: 'ausente' };
  }

  // Dia que já passou com batida faltando (ex.: esqueceu a saída) = incompleto, pra você corrigir.
  const completo = !!(reg!.entrada && reg!.saida && (!!reg!.inicio_intervalo === !!reg!.fim_intervalo));
  if (!completo && data < hoje) return { ...base, status: 'incompleto' };

  let atraso = 0;
  const e = toMin(reg!.entrada), pe = toMin(jornada.entrada);
  if (e !== null && pe !== null && e - pe > tolerancia) atraso += e - pe;
  const f = toMin(reg!.fim_intervalo), pf = toMin(jornada.fim_intervalo);
  if (f !== null && pf !== null && f - pf > tolerancia) atraso += f - pf;

  const saldo = completo ? trabalhados - previstos : 0;
  const extra = saldo > tolerancia ? saldo : 0;
  return { ...base, atraso, extra, status: atraso > 0 ? 'atrasado' : 'presente' };
}

/** Jornada padrão para funcionário novo: segunda a sábado 08:00–17:00 com intervalo 12:00–13:00; domingo folga. */
export function jornadaPadrao(): Omit<PontoJornada, 'vigente_desde'>[] {
  return [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    dia_semana: d,
    trabalha: d !== 0,
    entrada: d !== 0 ? '08:00' : null,
    inicio_intervalo: d !== 0 ? '12:00' : null,
    fim_intervalo: d !== 0 ? '13:00' : null,
    saida: d !== 0 ? '17:00' : null,
  }));
}
