/**
 * Helpers para cálculo de comissão prevista semanal
 * 
 * LÓGICA:
 * Total Estimado = Saldo do Caixa da Semana + Salário Base da Semana
 * 
 * Exemplos:
 * ✅ Saldo +500 + Salário 400 = Recebe 900
 * ✅ Saldo -100 + Salário 400 = Recebe 300
 * ✅ Saldo 0 + Salário 400 = Recebe 400
 */

import { toLocalISO } from './dateHelpers';

export interface ComissaoSemanal {
  semanaInicio: string; // YYYY-MM-DD
  semanaFim: string;    // YYYY-MM-DD
  saldoCaixa: number;   // Saldo do caixa da semana
  salarioBase: number;  // Salário base semanal
  totalEstimado: number; // saldoCaixa + salarioBase
  detalhes: string;     // Descrição pra exibir
}

/**
 * Calcula a comissão estimada para uma semana
 */
export function calcularComissaoSemanal(
  saldoCaixa: number,
  salarioBase: number,
  semanaInicio: string,
  semanaFim: string
): ComissaoSemanal {
  const totalEstimado = saldoCaixa + salarioBase;

  let detalhes = '';
  if (saldoCaixa > 0) {
    detalhes = `Saldo positivo: +R$ ${saldoCaixa.toFixed(2)} | Salário: R$ ${salarioBase.toFixed(2)} = Total: R$ ${totalEstimado.toFixed(2)} ✅`;
  } else if (saldoCaixa < 0) {
    detalhes = `Saldo negativo: -R$ ${Math.abs(saldoCaixa).toFixed(2)} | Salário: R$ ${salarioBase.toFixed(2)} = Total: R$ ${totalEstimado.toFixed(2)}`;
  } else {
    detalhes = `Saldo zerado | Salário: R$ ${salarioBase.toFixed(2)} = Total: R$ ${totalEstimado.toFixed(2)}`;
  }

  return {
    semanaInicio,
    semanaFim,
    saldoCaixa,
    salarioBase,
    totalEstimado: Math.max(0, totalEstimado), // Nunca negativo pra exibir
    detalhes,
  };
}

/**
 * Retorna semana atual e próximas N semanas
 */
export function getSemanasProximas(quantidade: number = 4): Array<{
  semanaInicio: string;
  semanaFim: string;
  label: string;
  isThisWeek: boolean;
}> {
  const hoje = new Date();
  const semanas = [];

  for (let i = 0; i < quantidade; i++) {
    const dataInicio = new Date(hoje);
    dataInicio.setDate(hoje.getDate() + (i * 7));
    
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataInicio.getDate() + 6);

    const inicio = toLocalISO(dataInicio);
    const fim = toLocalISO(dataFim);

    const isThisWeek = i === 0;
    const label = isThisWeek 
      ? `Esta Semana (${dataInicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`
      : `Semana ${i} (${dataInicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`;

    semanas.push({ semanaInicio: inicio, semanaFim: fim, label, isThisWeek });
  }

  return semanas;
}

/**
 * Formata valor pra exibição
 */
export function formatarValorComissao(valor: number): string {
  if (valor >= 0) {
    return `+R$ ${valor.toFixed(2)}`.replace('.', ',');
  } else {
    return `-R$ ${Math.abs(valor).toFixed(2)}`.replace('.', ',');
  }
}
