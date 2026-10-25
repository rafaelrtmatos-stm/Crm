// Desconto na cobrança Pix (QR + copia e cola e link de pagamento).
// Tudo em CENTAVOS (inteiros) para o valor cobrado no Pix ser exatamente o valor final calculado.
// O desconto é definido manualmente (percentual ou fixo), só vale quando "aplicar" está ligado e SÓ para o pagamento
// integral do saldo devido, em uma única vez (à vista).

export type TipoDescontoPix = 'percentual' | 'fixo';
/**
 * Como o desconto é DIGITADO (mesmos 3 modos do Terminal de pagamento do CRM):
 *  - 'percentual': % de desconto;  - 'fixo': R$ de desconto;  - 'final': R$ do valor FINAL que o cliente vai pagar.
 * Só 'percentual' e 'fixo' são gravados (tipo = como o desconto foi dado); 'final' vira um desconto fixo equivalente.
 */
export type ModoDescontoPix = TipoDescontoPix | 'final';

/**
 * Regra ÚNICA do desconto por modo, em centavos (usada pelo Terminal de pagamento e pela cobrança/link Pix).
 * Devolve o desconto bruto (>= 0, no máximo o valor base); a validação de "Pix não pode zerar" fica em calcularDescontoPix.
 */
export function descontoCentavosPorModo(baseCentavos: number, modo: ModoDescontoPix, bruto: number): number {
  const base = Math.max(0, Math.round(Number(baseCentavos) || 0));
  const v = Number.isFinite(Number(bruto)) ? Number(bruto) : 0;
  let desconto: number;
  if (modo === 'percentual') desconto = Math.round((base * v) / 100);
  else if (modo === 'final') desconto = base - Math.round(v * 100); // valor final desejado: desconto = original - final
  else desconto = Math.round(v * 100);
  return Math.max(0, Math.min(base, desconto));
}

export interface ResultadoDescontoPix {
  ok: boolean;
  /** Valor da opção antes do desconto (entrada, parcial, saldo...). */
  originalCentavos: number;
  /** Desconto concedido (0 quando não há desconto). */
  descontoCentavos: number;
  /** Valor que será cobrado no Pix = original - desconto. */
  finalCentavos: number;
  erro?: string;
}

/**
 * Calcula o desconto de UMA opção de cobrança.
 * Regras: sem desconto -> final = original; desconto nunca negativo, nunca maior ou igual ao valor da opção
 * (o Pix precisa ter valor > 0) e a opção nunca passa do saldo devido. Com desconto, a opção precisa ser o saldo integral.
 */
export function calcularDescontoPix(p: {
  valorCentavos: number;
  restanteCentavos: number;
  aplicar: boolean;
  tipo: ModoDescontoPix;
  /** Percentual (0-100), R$ de desconto ou R$ do valor final, conforme o modo — texto digitado aceita vírgula. */
  valor: string | number;
}): ResultadoDescontoPix {
  const original = Math.round(Number(p.valorCentavos) || 0);
  const restante = Math.round(Number(p.restanteCentavos) || 0);
  const falha = (erro: string): ResultadoDescontoPix => ({ ok: false, originalCentavos: original, descontoCentavos: 0, finalCentavos: original, erro });

  if (!(original > 0)) return falha('Valor inválido.');
  if (original > restante) return falha('O valor não pode passar do saldo devido.');
  if (!p.aplicar) return { ok: true, originalCentavos: original, descontoCentavos: 0, finalCentavos: original };

  if (original !== restante) return falha('O desconto à vista só vale para o pagamento integral do saldo, em uma única vez.');

  const bruto = typeof p.valor === 'number' ? p.valor : Number(String(p.valor).trim().replace(',', '.'));
  if (!Number.isFinite(bruto) || bruto <= 0) return falha('Informe um desconto maior que zero.');

  if (p.tipo === 'percentual' && bruto >= 100) return falha('O desconto percentual precisa ser menor que 100%.');
  if (p.tipo === 'final' && Math.round(bruto * 100) >= original) return falha('O valor final precisa ser menor que o valor original para haver desconto.');
  const desconto = descontoCentavosPorModo(original, p.tipo, bruto);
  if (desconto <= 0) return falha('O desconto é menor que 1 centavo.');
  if (desconto >= original) return falha('O desconto precisa ser menor que o valor cobrado (o Pix não pode ficar zerado ou negativo).');
  return { ok: true, originalCentavos: original, descontoCentavos: desconto, finalCentavos: original - desconto };
}

/** Reajusta um desconto já salvo ao saldo que a nota tem AGORA (usado na baixa no servidor — espelhado em api/_lib/pagar-link.js). */
export function limitarDescontoAoSaldo(valorPagoCentavos: number, descontoCentavos: number, restanteCentavos: number): number {
  const desc = Math.max(0, Math.round(descontoCentavos) || 0);
  const maxPermitido = Math.max(0, Math.round(restanteCentavos) - Math.round(valorPagoCentavos));
  return Math.min(desc, maxPermitido);
}

export const rotuloDescontoPix = (tipo: ModoDescontoPix, valor: number): string =>
  tipo === 'percentual' ? `${String(valor).replace('.', ',')}%` : tipo === 'final' ? `valor final R$ ${valor.toFixed(2).replace('.', ',')}` : `R$ ${valor.toFixed(2).replace('.', ',')}`;
