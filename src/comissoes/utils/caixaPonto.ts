// Salário do Caixa para quem usa ponto eletrônico: o MESMO valor do Meu Ponto
// (horas trabalhadas proporcionais - DSR da falta + feriado/extras). Devolve null quando não se aplica
// (sem ponto, modalidade meta ou semana anterior ao início do ponto): aí o Caixa segue com o salário fixo.
import { supabase } from '../../supabase';
import { calcularPontoSalarioColab } from './pontoSalario';
import { PONTO_DATA_INICIO } from '../../lib/pontoCalc';

export async function getBasePontoDaSemana(
  colaboradorId: string,
  semanaInicio: string,
  semanaFim: string
): Promise<number | null> {
  try {
    if (!colaboradorId || semanaFim < PONTO_DATA_INICIO) return null;
    const { data: c } = await supabase.from('colaboradores').select('*').eq('id', colaboradorId).maybeSingle();
    if (!c) return null;
    let localExtra: any = null;
    try {
      const raw = localStorage.getItem(`rpro_colab_remun_${c.id}`);
      if (raw) localExtra = JSON.parse(raw);
    } catch {}
    const usaPonto = c.utiliza_ponto_eletronico === true || localExtra?.utilizaPontoEletronico === true;
    if (!usaPonto || c.modalidade_remuneracao === 'meta') return null;
    const r = await calcularPontoSalarioColab(c, { start: semanaInicio, end: semanaFim });
    return r ? Number(r.base.toFixed(2)) : null;
  } catch (e) {
    console.error('Erro ao calcular salário pelo ponto:', e);
    return null;
  }
}
