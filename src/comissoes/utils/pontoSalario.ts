// Salário-base semanal e débito de ponto por colaborador, a partir do ponto eletrônico.
// Carregador ÚNICO (Supabase) sobre as regras puras de `salarioPonto.ts`. Usado por Funcionários/Admin, Modules,
// Dashboard, Meu Salário e Caixa (via caixaPonto), para o salário bater em todas as telas.
//
// REGRA DO PERÍODO: o salário de um ciclo semanal (Caixa, sáb a sex) é pago em atraso e vem do ponto do ciclo
// ANTERIOR (ciclo − 7 dias). Ex.: Caixa 10/10 a 16/10 = ponto de 03/10 a 09/10. `pontoBoundsDoCiclo` é a única
// definição dessa regra. `pontoWeekOffset` de getWorkWeekBounds = offset do ciclo exibido − 1 (mesma coisa).
import { supabase } from '../../supabase';
import { getWorkWeekBounds, addDaysISO } from './caixaSemanalStorage';
import { hojeStr, limitarInicioPonto, PONTO_DATA_INICIO } from '../../lib/pontoCalc';
import { buscarDecisaoDsr } from '../../lib/pontoDsr';
import {
  analisarSemanaPonto,
  calcularSalarioPonto,
  getDestinacaoExtras,
  DiaPontoAnalisado,
  ResultadoSalarioPonto,
} from './salarioPonto';

export interface PontoSalarioSemana extends ResultadoSalarioPonto {
  tolerancia: number;
  /** Minutos positivos lançados no banco de horas na semana do ponto (só informativo). */
  bancoCreditoMin: number;
  dias: DiaPontoAnalisado[];
}

/** Semana do ponto que paga o ciclo [cicloInicio, cicloFim]: sempre o ciclo anterior (−7 dias). */
export function pontoBoundsDoCiclo(cicloInicio: string, cicloFim: string): { start: string; end: string } {
  return { start: addDaysISO(cicloInicio, -7), end: addDaysISO(cicloFim, -7) };
}

/** Salário-base do ponto de UM colaborador numa semana do ponto (datas da própria semana do ponto). */
export async function calcularPontoSalarioColab(
  c: any,
  pointBounds: { start: string; end: string }
): Promise<PontoSalarioSemana | null> {
    let { data: f } = await supabase.from('ponto_funcionarios').select('id, tolerancia_minutos').eq('colaborador_id', c.id).maybeSingle();
    if (!f) {
      const { data: f2 } = await supabase.from('ponto_funcionarios').select('id, tolerancia_minutos').eq('id', c.id).maybeSingle();
      f = f2;
    }
    if (!f) return null;
    const pFuncId = f.id;
    const tol = f.tolerancia_minutos ?? 10;
    // Decisão do admin sobre o DSR desta semana (chave: funcionário + sábado que abre o ciclo). Sem decisão = automático.
    const [bRes, rRes, jRes, dsrDecisao] = await Promise.all([
      supabase.from('ponto_banco_horas').select('minutos, tipo').eq('funcionario_id', pFuncId).gte('data', pointBounds.start).lte('data', pointBounds.end),
      supabase.from('ponto_registros').select('*').eq('funcionario_id', pFuncId).gte('data', limitarInicioPonto(pointBounds.start)).lte('data', pointBounds.end),
      supabase.from('ponto_jornadas').select('*').eq('funcionario_id', pFuncId),
      buscarDecisaoDsr(pFuncId, pointBounds.start)
    ]);

    let debMin = 0;
    let bancoCreditoMin = 0;
    (bRes.data || []).forEach((bh: any) => {
      const m = Number(bh.minutos) || 0;
      if (m < 0) debMin += Math.abs(m);
      else if (m > 0) bancoCreditoMin += m;
    });

    const dias = analisarSemanaPonto(pointBounds.start, rRes.data || [], jRes.data || [], tol, hojeStr());
    const r = calcularSalarioPonto({
      salarioMensal: Number(c.salario_base) || 0,
      tolerancia: tol,
      dias: dias.map((d) => d.dia),
      destinacao: getDestinacaoExtras(c.id),
      modalidade: c.modalidade_remuneracao,
      debitoMin: debMin,
      descontarDSR: dsrDecisao,
    });
    return { ...r, tolerancia: tol, bancoCreditoMin, dias };
}

/**
 * Salário do ponto que paga um CICLO semanal (sáb a sex) de um colaborador, já com a regra do período aplicada.
 * Devolve null quando não se aplica (sem id, sem ponto, modalidade meta, sem cadastro no ponto ou ponto anterior ao
 * início do sistema): aí a tela segue com o salário fixo. Usada pelo Caixa, Dashboard e Meu Salário.
 */
export async function calcularPontoSalarioDoCiclo(
  colaboradorId: string,
  cicloInicio: string,
  cicloFim: string
): Promise<PontoSalarioSemana | null> {
  try {
    const pontoBounds = pontoBoundsDoCiclo(cicloInicio, cicloFim);
    // Ponto da semana anterior à do ciclo. Se ela termina antes do início do ponto (03/10), segue o salário fixo.
    if (!colaboradorId || pontoBounds.end < PONTO_DATA_INICIO) return null;
    const { data: c } = await supabase.from('colaboradores').select('*').eq('id', colaboradorId).maybeSingle();
    if (!c) return null;
    let localExtra: any = null;
    try {
      const raw = localStorage.getItem(`rpro_colab_remun_${c.id}`);
      if (raw) localExtra = JSON.parse(raw);
    } catch {}
    const usaPonto = c.utiliza_ponto_eletronico === true || localExtra?.utilizaPontoEletronico === true;
    if (!usaPonto || c.modalidade_remuneracao === 'meta') return null;
    return await calcularPontoSalarioColab(c, pontoBounds);
  } catch (e) {
    console.error('Erro ao calcular salário pelo ponto:', e);
    return null;
  }
}

export async function calcularPontoSalarioPorColaborador(
  colabs: any[],
  pontoWeekOffset: number
): Promise<Record<string, { base: number; debitoVal: number }>> {
  const pontoSalarioMap: Record<string, { base: number; debitoVal: number }> = {};
  const colabsPonto = colabs.filter(c => {
    let localExtra: any = null;
    if (typeof window !== 'undefined' && c.id) {
      try {
        const raw = localStorage.getItem(`rpro_colab_remun_${c.id}`);
        if (raw) localExtra = JSON.parse(raw);
      } catch {}
    }
    return c.utiliza_ponto_eletronico === true || localExtra?.utilizaPontoEletronico === true;
  });
  if (colabsPonto.length > 0) {
    await Promise.all(colabsPonto.map(async (c) => {
      const r = await calcularPontoSalarioColab(c, getWorkWeekBounds(pontoWeekOffset));
      if (r) pontoSalarioMap[c.id] = r;
    }));
  }
  return pontoSalarioMap;
}
