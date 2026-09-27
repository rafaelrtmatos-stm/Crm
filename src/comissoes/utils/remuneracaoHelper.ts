import { ModalidadeRemuneracao } from './supabaseStorage';

export interface ParametrosRemuneracao {
  modalidade: ModalidadeRemuneracao;
  salarioBase: number;
  comissaoPadraoPercentual: number;
  metaPercentual: number;
}

export interface ResultadoRemuneracao {
  modalidade: ModalidadeRemuneracao;
  salarioBaseEfetivo: number;
  comissaoEfetiva: number;
  totalBruto: number;
}

/**
 * Calcula a remuneração bruta semanal de um funcionário de acordo com a sua modalidade:
 * 
 * 1. FIXO:
 *    remuneracao = salario_base
 *    (produção não altera a remuneração)
 * 
 * 2. FIXO + COMISSÃO:
 *    remuneracao = salario_base + comissao_existente
 * 
 * 3. META:
 *    remuneracao = producao_individual * (percentual_meta / 100)
 *    (sem salário base, sem piso nem teto em R$, apenas percentual sobre a produção individual)
 */
export function calcularRemuneracaoSemanal(
  params: ParametrosRemuneracao,
  producaoIndividual: number,
  comissaoExistente: number
): ResultadoRemuneracao {
  const modalidade = params.modalidade || 'fixo_comissao';
  const salarioBase = Number(params.salarioBase) || 0;
  const producao = Number(producaoIndividual) || 0;
  const comissao = Number(comissaoExistente) || 0;
  const metaPerc = Number(params.metaPercentual) || 0;

  if (modalidade === 'fixo') {
    return {
      modalidade: 'fixo',
      salarioBaseEfetivo: salarioBase,
      comissaoEfetiva: 0,
      totalBruto: salarioBase,
    };
  }

  if (modalidade === 'meta') {
    const valorMeta = (producao * metaPerc) / 100;
    return {
      modalidade: 'meta',
      salarioBaseEfetivo: 0,
      comissaoEfetiva: valorMeta,
      totalBruto: valorMeta,
    };
  }

  // Padrão: fixo_comissao
  return {
    modalidade: 'fixo_comissao',
    salarioBaseEfetivo: salarioBase,
    comissaoEfetiva: comissao,
    totalBruto: salarioBase + comissao,
  };
}
