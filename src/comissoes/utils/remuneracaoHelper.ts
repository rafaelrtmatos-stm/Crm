import { ModalidadeRemuneracao, calcularSalarioSemanal } from './supabaseStorage';
import { MetaValorItem } from '../types';

export interface ParametrosRemuneracao {
  modalidade: ModalidadeRemuneracao;
  salarioBase: number;
  comissaoPadraoPercentual: number;
  metaPercentual: number;
  metasValores?: MetaValorItem[];
  metaValorMinimo?: number;
  metaValorMaximo?: number;
  faturamentoGeral?: number;
}

export interface ResultadoRemuneracao {
  modalidade: ModalidadeRemuneracao;
  salarioBaseEfetivo: number;
  comissaoEfetiva: number;
  totalBruto: number;
  metaAtingidaNome?: string;
  metaProximaNome?: string;
  metaProximaValor?: number;
  metaProximaReceber?: number;
}

/**
 * Calcula a remuneração bruta semanal de um funcionário de acordo com a sua modalidade:
 * 
 * 1. FIXO:
 *    remuneracao = (salario_mensal / 220) * 44
 *    (produção não altera a remuneração)
 * 
 * 2. FIXO + COMISSÃO:
 *    remuneracao = ((salario_mensal / 220) * 44) + comissao_existente
 * 
 * 3. FATURAMENTO GERAL:
 *    O colaborador recebe um percentual sobre o faturamento geral da empresa/período.
 *    remuneracao = salario_base + (faturamento_geral * meta_percentual / 100)
 * 
 * 4. META:
 *    Valores preenchidos para cada meta (ex: Meta 1: R$ 2.000 -> R$ 500, Meta 2: R$ 3.500 -> R$ 850, etc.).
 *    O colaborador recebe o valor estipulado da meta atingida conforme sua produção individual.
 */
export function calcularRemuneracaoSemanal(
  params: ParametrosRemuneracao,
  producaoIndividual: number,
  comissaoExistente: number
): ResultadoRemuneracao {
  const modalidade = params.modalidade || 'fixo_comissao';
  // salarioBase é o valor mensal cadastrado no perfil do colaborador.
  // A remuneração semanal usa a mesma conversão da tela "Meu Salário":
  // (salário mensal / 220h) × 44h. Ex.: R$ 2.000,00 -> R$ 400,00/semana.
  const salarioSemanal = calcularSalarioSemanal(Number(params.salarioBase) || 0);
  const salarioBase = modalidade === 'meta' || modalidade === 'faturamento_geral' ? 0 : salarioSemanal;
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

  if (modalidade === 'faturamento_geral') {
    const baseCalculo = Number(params.faturamentoGeral) > 0 ? Number(params.faturamentoGeral) : producao;
    const comissaoFat = metaPerc > 0 ? (baseCalculo * metaPerc) / 100 : 0;
    return {
      modalidade: 'faturamento_geral',
      salarioBaseEfetivo: salarioBase,
      comissaoEfetiva: comissaoFat,
      totalBruto: salarioBase + comissaoFat,
    };
  }

  if (modalidade === 'meta') {
    let valorMeta = 0;
    let metaAtingidaNome: string | undefined = undefined;
    let metaProximaNome: string | undefined = undefined;
    let metaProximaValor: number | undefined = undefined;
    let metaProximaReceber: number | undefined = undefined;

    const valorMinimo = Number(params.metaValorMinimo) > 0 ? Number(params.metaValorMinimo) : 600;
    // Base da meta escalável: Receita de notas 100% quitadas e recebidas da loja na semana (Sábado a Sexta).
    // Se não houver faturamento da loja fornecido, usa produção individual como fallback.
    const baseCalculoMeta = Number(params.faturamentoGeral) > 0 ? Number(params.faturamentoGeral) : producao;

    const metasValidas = (params.metasValores || []).filter(
      (m) => Number(m.valorProducao) > 0 && Number(m.valorReceber) > 0
    );

    if (metasValidas.length > 0) {
      // Ordena as metas por valor de produção/receita crescente
      const ordenadas = [...metasValidas].sort((a, b) => Number(a.valorProducao) - Number(b.valorProducao));
      const atingidas = ordenadas.filter((m) => baseCalculoMeta >= Number(m.valorProducao));
      const naoAtingidas = ordenadas.filter((m) => baseCalculoMeta < Number(m.valorProducao));

      if (atingidas.length > 0) {
        // Se atingir uma faixa -> recebe o valor daquela faixa.
        // Se ultrapassar várias faixas -> recebe o valor da maior faixa atingida.
        // Ex: R$ 3.999,99 fica na faixa anterior; R$ 4.000,00 salta para a nova faixa!
        const maiorAtingida = atingidas[atingidas.length - 1];
        metaAtingidaNome = maiorAtingida.nome || `Faixa (${maiorAtingida.valorProducao})`;
        valorMeta = Number(maiorAtingida.valorReceber);
        if (naoAtingidas.length > 0) {
          metaProximaNome = naoAtingidas[0].nome || `Faixa (${naoAtingidas[0].valorProducao})`;
          metaProximaValor = Number(naoAtingidas[0].valorProducao);
          metaProximaReceber = Number(naoAtingidas[0].valorReceber);
        }
      } else {
        // Se não atingir nenhuma faixa -> recebe o mínimo configurado (ex: R$ 600)
        metaAtingidaNome = 'Piso Mínimo Garantido';
        valorMeta = valorMinimo;
        metaProximaNome = ordenadas[0].nome || `Faixa 1 (${ordenadas[0].valorProducao})`;
        metaProximaValor = Number(ordenadas[0].valorProducao);
        metaProximaReceber = Number(ordenadas[0].valorReceber);
      }
    } else if (metaPerc > 0) {
      valorMeta = Math.max(valorMinimo, (baseCalculoMeta * metaPerc) / 100);
      metaAtingidaNome = 'Piso Mínimo Garantido';
    } else {
      valorMeta = valorMinimo;
      metaAtingidaNome = 'Piso Mínimo Garantido';
    }

    if (valorMinimo > 0 && valorMeta < valorMinimo) {
      valorMeta = valorMinimo;
    }
    if (params.metaValorMaximo && params.metaValorMaximo > 0) {
      valorMeta = Math.min(valorMeta, params.metaValorMaximo);
    }

    return {
      modalidade: 'meta',
      salarioBaseEfetivo: 0,
      comissaoEfetiva: valorMeta,
      totalBruto: valorMeta,
      metaAtingidaNome,
      metaProximaNome,
      metaProximaValor,
      metaProximaReceber,
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
