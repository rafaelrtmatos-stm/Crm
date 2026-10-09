/**
 * Fórmula ÚNICA da previsão de recebimento da semana. Usada tanto no card "Previsão de
 * Recebimento" do perfil do funcionário quanto no "Total Estimado" da aba Funcionários, para
 * os dois números nunca divergirem.
 *
 * previsão = salário + comissão − descontos − já recebido ± saldo anterior (dívida < 0, crédito > 0),
 * nunca abaixo de zero. ("já recebido" só é informado na modalidade META.)
 */
export interface EntradaPrevisaoRecebimento {
  salarioBase: number;
  comissao: number;
  descontos: number;
  saldoAnterior: number;
  // Já recebido (pix/dinheiro) na semana. Opcional: só a previsão de quem está em META informa;
  // sem informar, vale 0 e a fórmula fica igual à de antes.
  jaRecebido?: number;
}

export function calcularPrevisaoRecebimento({ salarioBase, comissao, descontos, saldoAnterior, jaRecebido = 0 }: EntradaPrevisaoRecebimento): number {
  const total = salarioBase + comissao - descontos - jaRecebido + saldoAnterior;
  return Math.max(0, Number(total.toFixed(2)));
}
