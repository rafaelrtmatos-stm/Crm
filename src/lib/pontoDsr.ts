// Decisão do DSR semanal por funcionário + semana do ponto (tabela ponto_dsr_semanal, ver supabase/create_ponto_dsr_semanal.sql).
// Só acessa o Supabase; as regras de cálculo ficam em salarioPonto.ts (módulo puro).
import { supabase } from '../supabase';

/** semana_inicio (sábado do ciclo) -> decisão. Semana ausente do mapa = automático. */
export type DecisoesDsr = Record<string, boolean>;

export interface HistoricoDsr {
  semana_inicio: string;
  desconta_anterior: boolean | null;
  desconta_novo: boolean;
  alterado_por: string | null;
  alterado_em: string;
}

/** Decisão salva da semana (true/false) ou null quando não há (regra automática). */
export async function buscarDecisaoDsr(funcionarioId: string, semanaInicio: string): Promise<boolean | null> {
  const { data, error } = await supabase
    .from('ponto_dsr_semanal')
    .select('desconta')
    .eq('funcionario_id', funcionarioId)
    .eq('semana_inicio', semanaInicio)
    .maybeSingle();
  if (error) {
    console.error('Erro ao ler decisão do DSR:', error);
    return null;
  }
  return data ? !!data.desconta : null;
}

/** Última alteração registrada da semana (quem e quando), se houver. */
export async function buscarUltimaAlteracaoDsr(
  funcionarioId: string,
  semanaInicio: string
): Promise<{ alterado_por: string | null; alterado_em: string } | null> {
  const { data } = await supabase
    .from('ponto_dsr_semanal')
    .select('alterado_por, alterado_em')
    .eq('funcionario_id', funcionarioId)
    .eq('semana_inicio', semanaInicio)
    .maybeSingle();
  return data ? { alterado_por: data.alterado_por ?? null, alterado_em: data.alterado_em } : null;
}

/**
 * Grava a decisão SÓ da semana informada (upsert por funcionário+semana) e registra o histórico.
 * Nunca toca em outras semanas.
 */
export async function salvarDecisaoDsr(
  funcionarioId: string,
  semanaInicio: string,
  desconta: boolean,
  alteradoPor: string | null
): Promise<{ error: { message: string } | null }> {
  const anterior = await buscarDecisaoDsr(funcionarioId, semanaInicio);
  const agora = new Date().toISOString();
  const { error } = await supabase.from('ponto_dsr_semanal').upsert(
    { funcionario_id: funcionarioId, semana_inicio: semanaInicio, desconta, alterado_por: alteradoPor, alterado_em: agora },
    { onConflict: 'funcionario_id,semana_inicio' }
  );
  if (error) return { error };
  // Histórico é complementar: se falhar (ex.: tabela ainda não criada) a decisão já foi salva.
  const { error: hErr } = await supabase.from('ponto_dsr_historico').insert({
    funcionario_id: funcionarioId,
    semana_inicio: semanaInicio,
    desconta_anterior: anterior,
    desconta_novo: desconta,
    alterado_por: alteradoPor,
    alterado_em: agora,
  });
  if (hErr) console.error('Erro ao registrar histórico do DSR:', hErr);
  return { error: null };
}
