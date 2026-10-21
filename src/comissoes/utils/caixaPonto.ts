// Salário do Caixa para quem usa ponto eletrônico: o MESMO valor do Meu Ponto da SEMANA ANTERIOR
// (o salário é pago em atraso: Caixa 10/10 a 16/10 = ponto de 03/10 a 09/10),
// ou seja, horas trabalhadas proporcionais - DSR da falta + feriado/extras. Devolve null quando não se aplica
// (sem ponto, modalidade meta ou semana anterior ao início do ponto): aí o Caixa segue com o salário fixo.
import { supabase } from '../../supabase';
import { calcularPontoSalarioColab } from './pontoSalario';
import { PONTO_DATA_INICIO } from '../../lib/pontoCalc';
import { addDaysISO } from './caixaSemanalStorage';

export async function getBasePontoDaSemana(
  colaboradorId: string,
  semanaInicio: string,
  semanaFim: string
): Promise<number | null> {
  try {
    // Ponto da semana anterior à do Caixa. Se ela termina antes do início do ponto (03/10), o Caixa segue com o salário fixo.
    const pontoInicio = addDaysISO(semanaInicio, -7);
    const pontoFim = addDaysISO(semanaFim, -7);
    if (!colaboradorId || pontoFim < PONTO_DATA_INICIO) return null;
    const { data: c } = await supabase.from('colaboradores').select('*').eq('id', colaboradorId).maybeSingle();
    if (!c) return null;
    let localExtra: any = null;
    try {
      const raw = localStorage.getItem(`rpro_colab_remun_${c.id}`);
      if (raw) localExtra = JSON.parse(raw);
    } catch {}
    const usaPonto = c.utiliza_ponto_eletronico === true || localExtra?.utilizaPontoEletronico === true;
    if (!usaPonto || c.modalidade_remuneracao === 'meta') return null;
    const r = await calcularPontoSalarioColab(c, { start: pontoInicio, end: pontoFim });
    return r ? Number(r.base.toFixed(2)) : null;
  } catch (e) {
    console.error('Erro ao calcular salário pelo ponto:', e);
    return null;
  }
}
