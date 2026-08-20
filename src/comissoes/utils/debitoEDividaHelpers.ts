/**
 * Helpers para cálculo de débito/crédito automático e dívidas parceladas
 * 
 * FUNCIONALIDADES:
 * ✅ Débito automático: saldo negativo da semana anterior é subtraído da nova comissão
 * ✅ Dívida parcelada: permite dividir dívida em N parcelas (semana/mês)
 * ✅ Permissões: colaborador pode criar desconto, mas só admin pode deletar
 */

import { Desconto, DescontoFormInput } from './supabaseStorage';

/** Calcula débito automático do saldo anterior */
export function calcularDebitoAutomatico(
  saldoAnterior: number,
  baseSalary: number
): DescontoFormInput | null {
  // Se não há débito, retorna null
  if (saldoAnterior >= 0) return null;

  // Saldo negativo vira desconto tipo "debito_saldo_anterior"
  const debitoValor = Math.abs(saldoAnterior);

  return {
    tipo: 'debito_saldo_anterior',
    descricao: `Débito do saldo anterior: -R$ ${debitoValor.toFixed(2)}`,
    valor: debitoValor,
    recorrencia: 'unica',
    data: new Date().toISOString().split('T')[0], // Hoje
  };
}

/**
 * Cria parcelas de uma dívida
 * 
 * @param valorDivida Valor total (ex: 100.00)
 * @param numParcelas Número de parcelas (ex: 4)
 * @param tipo Tipo de recorrência ('semanal' ou 'mensal')
 * @param dataInicio Data inicial (YYYY-MM-DD)
 * @returns Array com cada parcela
 */
export function gerarParcelasDivida(
  valorDivida: number,
  numParcelas: number,
  tipo: 'semanal' | 'mensal',
  dataInicio: string
): DescontoFormInput[] {
  if (numParcelas < 1) return [];

  const parcelas: DescontoFormInput[] = [];
  const valorParcela = Math.round((valorDivida / numParcelas) * 100) / 100;

  const dataObj = new Date(dataInicio);

  for (let i = 0; i < numParcelas; i++) {
    // Calcula data de cada parcela
    const dataParc = new Date(dataObj);
    if (tipo === 'semanal') {
      dataParc.setDate(dataParc.getDate() + i * 7);
    } else {
      dataParc.setMonth(dataParc.getMonth() + i);
    }

    const dateStr = dataParc.toISOString().split('T')[0];

    parcelas.push({
      tipo: 'divida',
      descricao: `Dívida (${i + 1}/${numParcelas}) - R$ ${valorDivida.toFixed(2)} ÷ ${numParcelas}`,
      valor: valorParcela,
      recorrencia: tipo === 'semanal' ? 'semanal' : 'mensal',
      data: dateStr,
    });
  }

  return parcelas;
}

/**
 * Calcula o resumo total de descontos/débitos
 * Usado pra mostrar:
 * - Comissão Bruta: 400,00
 * - Débito Saldo Anterior: -85,45
 * - Desconto Colaborador: -10,00
 * - Dívida Parcelada: -25,00
 * ─────────────────────────
 * = Total Líquido: 279,55
 */
export interface ResumoDescontos {
  bruto: number;
  debitoSaldoAnterior: number;
  descontoFaltas: number;
  descontoOutros: number;
  dividaParcelada: number;
  totalDescontos: number;
  liquido: number;
  detalhes: string[]; // Descrições pra exibir
}

export function resumirDescontos(
  comissaoBruta: number,
  descontos: Desconto[],
  filtrarApenasAtivos = true
): ResumoDescontos {
  const desc = filtrarApenasAtivos ? descontos.filter((d) => d.ativo) : descontos;

  let debitoSaldo = 0;
  let descontoFaltas = 0;
  let descontoOutros = 0;
  let dividaParcela = 0;

  const detalhes: string[] = [];

  desc.forEach((d) => {
    switch (d.tipo) {
      case 'debito_saldo_anterior':
        debitoSaldo += d.valor;
        detalhes.push(`📉 Débito Saldo Anterior: -R$ ${d.valor.toFixed(2)}`);
        break;
      case 'falta_meio_periodo':
      case 'falta_periodo':
        descontoFaltas += d.valor;
        detalhes.push(`⏰ ${d.descricao || d.tipo}: -R$ ${d.valor.toFixed(2)}`);
        break;
      case 'divida':
        dividaParcela += d.valor;
        const parcInfo =
          d.parcela_atual && d.parcelas_total
            ? ` (${d.parcela_atual}/${d.parcelas_total})`
            : '';
        detalhes.push(`💳 Dívida${parcInfo}: -R$ ${d.valor.toFixed(2)}`);
        break;
      case 'outro':
        descontoOutros += d.valor;
        detalhes.push(`${d.descricao || 'Outro desconto'}: -R$ ${d.valor.toFixed(2)}`);
        break;
    }
  });

  const totalDescontos = debitoSaldo + descontoFaltas + descontoOutros + dividaParcela;
  const liquido = Math.max(0, comissaoBruta - totalDescontos);

  return {
    bruto: comissaoBruta,
    debitoSaldoAnterior: debitoSaldo,
    descontoFaltas,
    descontoOutros,
    dividaParcelada: dividaParcela,
    totalDescontos,
    liquido,
    detalhes,
  };
}

/**
 * Valida se colaborador pode deletar um desconto
 * @param desconto Desconto a deletar
 * @param isAdmin Se o usuário atual é admin
 * @returns true se pode deletar, false se não
 */
export function podeDeleteDesconto(desconto: Desconto, isAdmin: boolean): boolean {
  // Admin sempre pode deletar
  if (isAdmin) return true;

  // Colaborador só pode deletar se pode_deletar_colaborador = true
  // (Exceto para débitos automáticos e dívidas — esses sempre precisa de admin)
  if (desconto.tipo === 'debito_saldo_anterior' || desconto.tipo === 'divida') {
    return false; // Só admin pode deletar débito/dívida
  }

  return desconto.pode_deletar_colaborador !== false;
}

/**
 * Formata mensagem de erro pra quando colaborador tenta deletar desconto que não tem permissão
 */
export function mensagemProibidoDeleteDesconto(desconto: Desconto): string {
  if (desconto.tipo === 'debito_saldo_anterior') {
    return '❌ Não é possível deletar débito de saldo anterior. Apenas administrador pode fazer isso.';
  }
  if (desconto.tipo === 'divida') {
    return '❌ Não é possível deletar dívida parcelada. Apenas administrador pode fazer isso.';
  }
  if (!desconto.pode_deletar_colaborador) {
    return '❌ Este desconto foi marcado como não-deletável pelo administrador.';
  }
  return '❌ Você não tem permissão para deletar este desconto.';
}
