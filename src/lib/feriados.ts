// Feriados e pontos facultativos para o ponto do funcionário. Funções puras, sem Supabase/React.
// Datas sempre "YYYY-MM-DD" (data local). Nacionais fixos + móveis (Páscoa) + regionais (lista abaixo).
// Regras de pagamento: feriado trabalhado = 2× a diária; hora extra = valor da hora × 1,5.
// Ponto facultativo só avisa: não dobra o dia.
import { somarDias } from './pontoCalc';

export type TipoDiaEspecial = 'feriado' | 'facultativo';

export interface DiaEspecial {
  data: string;
  nome: string;
  tipo: TipoDiaEspecial;
}

// Datas locais (Pará / Santarém) -- CONFERIR/AJUSTAR conforme a cidade da empresa. Formato "MM-DD".
const REGIONAIS: { mmdd: string; nome: string; tipo: TipoDiaEspecial }[] = [
  { mmdd: '06-22', nome: 'Aniversário de Santarém', tipo: 'feriado' },
  { mmdd: '08-15', nome: 'Adesão do Pará à Independência', tipo: 'feriado' },
];

const NACIONAIS_FIXOS: { mmdd: string; nome: string }[] = [
  { mmdd: '01-01', nome: 'Confraternização Universal' },
  { mmdd: '04-21', nome: 'Tiradentes' },
  { mmdd: '05-01', nome: 'Dia do Trabalho' },
  { mmdd: '09-07', nome: 'Independência do Brasil' },
  { mmdd: '10-12', nome: 'Nossa Senhora Aparecida' },
  { mmdd: '11-02', nome: 'Finados' },
  { mmdd: '11-15', nome: 'Proclamação da República' },
  { mmdd: '11-20', nome: 'Consciência Negra' },
  { mmdd: '12-25', nome: 'Natal' },
];

/** Domingo de Páscoa (algoritmo gregoriano) em YYYY-MM-DD. */
export function pascoa(ano: number): string {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Todos os feriados e pontos facultativos do ano, ordenados por data. */
export function diasEspeciaisDoAno(ano: number): DiaEspecial[] {
  const p = pascoa(ano);
  const lista: DiaEspecial[] = [
    ...NACIONAIS_FIXOS.map((x) => ({ data: `${ano}-${x.mmdd}`, nome: x.nome, tipo: 'feriado' as const })),
    ...REGIONAIS.map((x) => ({ data: `${ano}-${x.mmdd}`, nome: x.nome, tipo: x.tipo })),
    { data: somarDias(p, -48), nome: 'Carnaval (segunda)', tipo: 'facultativo' },
    { data: somarDias(p, -47), nome: 'Carnaval (terça)', tipo: 'facultativo' },
    { data: somarDias(p, -46), nome: 'Quarta-feira de Cinzas', tipo: 'facultativo' },
    { data: somarDias(p, -2), nome: 'Sexta-feira Santa', tipo: 'feriado' },
    { data: somarDias(p, 60), nome: 'Corpus Christi', tipo: 'facultativo' },
  ];
  return lista.sort((x, y) => x.data.localeCompare(y.data));
}

/** Feriado/ponto facultativo da data, ou null. */
export function diaEspecial(dateStr: string): DiaEspecial | null {
  const ano = parseInt(dateStr.slice(0, 4), 10);
  return diasEspeciaisDoAno(ano).find((d) => d.data === dateStr) || null;
}

/** Próximos `qtd` feriados/facultativos DEPOIS de `desde` (atravessa a virada do ano). */
export function proximosDiasEspeciais(desde: string, qtd = 5): DiaEspecial[] {
  const ano = parseInt(desde.slice(0, 4), 10);
  return [...diasEspeciaisDoAno(ano), ...diasEspeciaisDoAno(ano + 1)].filter((d) => d.data > desde).slice(0, qtd);
}

/** Dias entre duas datas YYYY-MM-DD (b - a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);
}

// ---- Valores (base: 220h/mês, mesma do cálculo do salário semanal) ----
const HORAS_MENSAIS = 220;
const DIAS_MES = 30;
const CARGA_DIA_PADRAO_MIN = 440; // 44h / 6 dias, usada quando o dia não tem jornada

export const valorHora = (salarioMensal: number) => (salarioMensal > 0 ? salarioMensal / HORAS_MENSAIS : 0);
export const valorDiaria = (salarioMensal: number) => (salarioMensal > 0 ? salarioMensal / DIAS_MES : 0);
/** Feriado trabalhado = dobro da diária. */
export const valorFeriadoTrabalhado = (salarioMensal: number) => 2 * valorDiaria(salarioMensal);
/** Hora extra = valor da hora × 1,5. */
export const valorHoraExtra = (salarioMensal: number) => 1.5 * valorHora(salarioMensal);

export interface DiaParaExtras {
  data: string;
  trabalhados: number; // minutos
  previstos: number; // minutos
  extra: number; // minutos de extra já apurados pelo ponto (fora da tolerância)
}

/**
 * Resumo dos adicionais de uma lista de dias: feriados trabalhados (2× diária) e minutos de hora extra (×1,5).
 * Em feriado trabalhado o dia já é pago em dobro; só entra como hora extra o que passa da carga do dia.
 */
export function resumoExtras(dias: DiaParaExtras[], salarioMensal: number, tolerancia = 10) {
  let feriadosTrabalhados = 0;
  let minutosExtra = 0;
  for (const d of dias) {
    const esp = diaEspecial(d.data);
    if (esp?.tipo === 'feriado' && d.trabalhados > 0) {
      feriadosTrabalhados += 1;
      const carga = d.previstos > 0 ? d.previstos : CARGA_DIA_PADRAO_MIN;
      const alem = d.trabalhados - carga;
      if (alem > tolerancia) minutosExtra += alem;
    } else {
      minutosExtra += d.extra;
    }
  }
  return {
    feriadosTrabalhados,
    minutosExtra,
    valorFeriados: feriadosTrabalhados * valorFeriadoTrabalhado(salarioMensal),
    valorExtras: (minutosExtra / 60) * valorHoraExtra(salarioMensal),
  };
}
