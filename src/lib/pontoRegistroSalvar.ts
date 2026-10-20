// Grava (upsert) o registro de ponto de um dia em ponto_registros.
// Usado pelo Controle de Ponto (PontoApp) e pelo Meu Ponto (admin editando o painel do colaborador),
// para o resultado ser idêntico nos dois lugares.
import { supabase } from '../supabase';
import { PontoRegistro } from './pontoCalc';

export async function salvarRegistroPonto(
  fid: string,
  data: string,
  h: Partial<PontoRegistro>
): Promise<{ error: { message: string } | null }> {
  const n = (v?: string | null) => (v ? v : null);
  // Dia que veio do relógio e foi corrigido continua "importacao" + editado_manual (o corte da importação
  // depende disso); dia que não existia é criado à mão ("manual").
  const { data: atual } = await supabase
    .from('ponto_registros')
    .select('origem')
    .eq('funcionario_id', fid)
    .eq('data', data)
    .maybeSingle();
  const origem = atual?.origem === 'importacao' ? 'importacao' : 'manual';
  const { error } = await supabase.from('ponto_registros').upsert(
    {
      funcionario_id: fid,
      data,
      entrada: n(h.entrada),
      inicio_intervalo: n(h.inicio_intervalo),
      fim_intervalo: n(h.fim_intervalo),
      saida: n(h.saida),
      observacao: n(h.observacao),
      origem,
      editado_manual: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'funcionario_id,data' }
  );
  return { error };
}
