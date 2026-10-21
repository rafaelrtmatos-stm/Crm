// Salário-base semanal e débito de ponto por colaborador, a partir do ponto eletrônico (mesma lógica do Meu Salário).
// Fonte ÚNICA usada pela aba Funcionários e pelo Dashboard, para o custo de equipe bater nas duas telas.
// `pontoWeekOffset` é o offset de getWorkWeekBounds da semana do ponto (a semana ANTERIOR ao ciclo exibido).
import { supabase } from '../../supabase';
import { getWorkWeekBounds } from './caixaSemanalStorage';
import { analisarDia, hojeStr, limitarInicioPonto } from '../../lib/pontoCalc';
import { resumoExtras, ehFeriado } from '../../lib/feriados';

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
      let { data: f } = await supabase.from('ponto_funcionarios').select('id, tolerancia_minutos').eq('colaborador_id', c.id).maybeSingle();
      if (!f) {
        const { data: f2 } = await supabase.from('ponto_funcionarios').select('id, tolerancia_minutos').eq('id', c.id).maybeSingle();
        f = f2;
      }
      if (!f) return;
      const pFuncId = f.id;
      const tol = f.tolerancia_minutos ?? 10;
      const pointBounds = getWorkWeekBounds(pontoWeekOffset);
      const [bRes, rRes, jRes] = await Promise.all([
        supabase.from('ponto_banco_horas').select('minutos, tipo').eq('funcionario_id', pFuncId).gte('data', pointBounds.start).lte('data', pointBounds.end),
        supabase.from('ponto_registros').select('*').eq('funcionario_id', pFuncId).gte('data', limitarInicioPonto(pointBounds.start)).lte('data', pointBounds.end),
        supabase.from('ponto_jornadas').select('*').eq('funcionario_id', pFuncId)
      ]);

      let debMin = 0;
      let totalTrab = 0;
      (bRes.data || []).forEach((bh: any) => {
        const m = Number(bh.minutos) || 0;
        if (m < 0) debMin += Math.abs(m);
      });

      const rMap = new Map((rRes.data || []).map((rx: any) => [rx.data, rx]));
      const startD = new Date(pointBounds.start + 'T12:00:00');
      const diasParaExtras = [];
      for (let i = 0; i < 7; i++) {
        const dStr = new Date(startD.getTime() + i * 86400000).toISOString().split('T')[0];
        const rx = rMap.get(dStr);
        const jx = (jRes.data || []).find((jj: any) => jj.dia_semana === new Date(dStr + 'T12:00:00').getDay()) || (jRes.data || [])[0];
        const ax = analisarDia(rx, jx, dStr, hojeStr(), tol);
        totalTrab += ax.trabalhados;
        diasParaExtras.push({
          data: dStr,
          trabalhados: ax.trabalhados,
          previstos: ax.previstos,
          extra: ax.extra
        });
      }
      const extRes = resumoExtras(diasParaExtras, Number(c.salario_base) || 0, tol);
      const destinacaoSal = localStorage.getItem(`rpro_ponto_dest_${c.id}`) || 'pagar';
      // Feriado sem batida é abonado (sempre pago); o adicional do dobro vai para o salário ou para o banco de horas.
      const valFer = extRes.valorAbonos + (destinacaoSal === 'pagar' ? extRes.valorFeriados : 0);
      const valExt = destinacaoSal === 'pagar' ? extRes.valorExtras : 0;

      const salarioMensal = Number(c.salario_base) || 0;
      const valorHora = salarioMensal > 0 ? salarioMensal / 220 : 0;
      const salarioHorasTrabalhadas = valorHora * (totalTrab / 60);
      const valorDiariaVal = salarioMensal > 0 ? salarioMensal / 30 : 0;
      const faltasCount = diasParaExtras.filter(d => d.trabalhados === 0 && !ehFeriado(d.data)).length;
      const descontoDSR = faltasCount > 0 ? valorDiariaVal : 0;
      const baseCalculada = c.modalidade_remuneracao === 'meta' ? 0 : Math.max(0, salarioHorasTrabalhadas + valFer + valExt - descontoDSR);

      const valorMinuto = salarioMensal > 0 ? salarioMensal / (220 * 60) : 0;
      const descontoPontoValor = debMin > 0 ? debMin * valorMinuto : 0;

      pontoSalarioMap[c.id] = { base: baseCalculada, debitoVal: descontoPontoValor };
    }));
  }
  return pontoSalarioMap;
}
