// Receita da loja usada como base da remuneração por META (e faturamento geral): soma só das notas 100% quitadas
// e recebidas no ciclo Sábado a Sexta (nota só com entrada NÃO conta). Fonte ÚNICA: painel de Funcionários, Dashboard,
// Caixa da Semana e Descontos e Pagamentos usam esta mesma regra para nunca divergirem.

import { supabase } from '../../supabase';

export interface VendaReceita {
  total?: number | string | null;
  status?: string | null;
  down_payment?: number | string | null;
}

export function somarReceitaQuitada(vendas: VendaReceita[] | null | undefined): number {
  return (vendas || [])
    .filter((v) => {
      if (v.status === 'canceled') return false;
      const total = Number(v.total) || 0;
      const down = Number(v.down_payment) || 0;
      return total > 0 && (v.status === 'completed' || down >= total);
    })
    .reduce((acc, v) => acc + (Number(v.total) || 0), 0);
}

export async function buscarReceitaLojaQuitada(inicio: string, fim: string): Promise<number> {
  const { data, error } = await supabase
    .from('vendas')
    .select('total, status, down_payment, created_at')
    .gte('created_at', inicio)
    .lte('created_at', fim + 'T23:59:59.999Z')
    .is('deleted_at', null);
  if (error) return 0;
  return somarReceitaQuitada(data as VendaReceita[]);
}

/** Modalidades cuja remuneração depende da receita da loja. */
export const usaReceitaDaLoja = (modalidade?: string | null): boolean => modalidade === 'meta' || modalidade === 'faturamento_geral';
