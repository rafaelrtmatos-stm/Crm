// Desconto na cobrança Pix (QR + copia e cola e link de pagamento).
// Tudo em CENTAVOS (inteiros) para o valor cobrado no Pix ser exatamente o valor final calculado.
// O desconto é definido manualmente (percentual ou fixo) e só vale quando "aplicar" está ligado.

export type TipoDescontoPix = 'percentual' | 'fixo';

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
 * (o Pix precisa ter valor > 0) e a opção nunca passa do saldo devido.
 */
export function calcularDescontoPix(p: {
  valorCentavos: number;
  restanteCentavos: number;
  aplicar: boolean;
  tipo: TipoDescontoPix;
  /** Percentual (0-100) ou valor em reais, conforme o tipo — texto digitado aceita vírgula. */
  valor: string | number;
}): ResultadoDescontoPix {
  const original = Math.round(Number(p.valorCentavos) || 0);
  const restante = Math.round(Number(p.restanteCentavos) || 0);
  const falha = (erro: string): ResultadoDescontoPix => ({ ok: false, originalCentavos: original, descontoCentavos: 0, finalCentavos: original, erro });

  if (!(original > 0)) return falha('Valor inválido.');
  if (original > restante) return falha('O valor não pode passar do saldo devido.');
  if (!p.aplicar) return { ok: true, originalCentavos: original, descontoCentavos: 0, finalCentavos: original };

  const bruto = typeof p.valor === 'number' ? p.valor : Number(String(p.valor).trim().replace(',', '.'));
  if (!Number.isFinite(bruto) || bruto <= 0) return falha('Informe um desconto maior que zero.');

  let desconto: number;
  if (p.tipo === 'percentual') {
    if (bruto >= 100) return falha('O desconto percentual precisa ser menor que 100%.');
    desconto = Math.round((original * bruto) / 100);
  } else {
    desconto = Math.round(bruto * 100);
  }
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

export const rotuloDescontoPix = (tipo: TipoDescontoPix, valor: number): string =>
  tipo === 'percentual' ? `${String(valor).replace('.', ',')}%` : `R$ ${valor.toFixed(2).replace('.', ',')}`;
