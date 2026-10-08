/**
 * Fórmula ÚNICA da previsão de recebimento da semana. Usada tanto no card "Previsão de
 * Recebimento" do perfil do funcionário quanto no "Total Estimado" da aba Funcionários, para
 * os dois números nunca divergirem.
 *
 * previsão = salário + comissão − descontos ± saldo anterior (dívida < 0, crédito > 0),
 * nunca abaixo de zero.
 */
export interface EntradaPrevisaoRecebimento {
  salarioBase: number;
  comissao: number;
  descontos: number;
  saldoAnterior: number;
}

export function calcularPrevisaoRecebimento({ salarioBase, comissao, descontos, saldoAnterior }: EntradaPrevisaoRecebimento): number {
  const total = salarioBase + comissao - descontos + saldoAnterior;
  return Math.max(0, Number(total.toFixed(2)));
}
