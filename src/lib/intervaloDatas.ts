// Validação do intervalo de datas personalizado (<input type="date"> entrega valores parciais enquanto o usuário digita
// o ano — 0002-10-24, 0020-... — e vazio ao limpar). Sem validar, o Dashboard montava gráficos com milhares de pontos
// (ou lançava RangeError em toISOString) e travava. Fonte única para o Dashboard, a Análise e o Dashboard de Comissões.

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_DIAS_INTERVALO = 1830; // ~5 anos: o gráfico agrupa por mês acima de 60 dias

export function parseDiaISO(valor: string): Date | null {
  if (!ISO_RE.test(valor || '')) return null;
  const [a, m, d] = valor.split('-').map(Number);
  const dt = new Date(a, m - 1, d);
  if (dt.getFullYear() !== a || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  const anoMax = new Date().getFullYear() + 1;
  if (a < 2000 || a > anoMax) return null;
  return dt;
}

export interface IntervaloValidado { ok: boolean; inicio: string; fim: string; dias: number; erro: string }

const invalido = (erro: string): IntervaloValidado => ({ ok: false, inicio: '', fim: '', dias: 0, erro });

export function validarIntervaloISO(inicio: string, fim: string, maxDias = MAX_DIAS_INTERVALO): IntervaloValidado {
  if (!inicio || !fim) return invalido('Escolha a data inicial e a final.');
  const a = parseDiaISO(inicio);
  const b = parseDiaISO(fim);
  if (!a || !b) return invalido('Data inválida (use anos a partir de 2000).');
  if (a.getTime() > b.getTime()) return invalido('A data inicial não pode ser maior que a final.');
  const dias = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  if (dias > maxDias) return invalido(`Período máximo de ${Math.floor(maxDias / 365)} anos.`);
  return { ok: true, inicio, fim, dias, erro: '' };
}
