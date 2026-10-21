// Horário padrão da empresa (ponto_setores com padrao = true). Quando não existe (ou a tabela ainda não foi
// criada no Supabase), devolve null e quem chama usa jornadaPadrao() de pontoCalc.
import { supabase } from '../supabase';
import type { PontoJornada } from './pontoCalc';

export async function getJornadaPadraoEmpresa(): Promise<Omit<PontoJornada, 'vigente_desde'>[] | null> {
  try {
    const { data: setor, error } = await supabase.from('ponto_setores').select('id').eq('padrao', true).limit(1).maybeSingle();
    if (error || !setor) return null;
    const { data: rows, error: e2 } = await supabase.from('ponto_setor_jornadas').select('*').eq('setor_id', setor.id);
    if (e2 || !rows || rows.length === 0) return null;
    return [0, 1, 2, 3, 4, 5, 6].map((d) => {
      const r: any = rows.find((x: any) => x.dia_semana === d);
      return {
        dia_semana: d,
        trabalha: r ? !!r.trabalha : d !== 0,
        entrada: r?.trabalha ? r.entrada : null,
        inicio_intervalo: r?.trabalha ? r.inicio_intervalo : null,
        fim_intervalo: r?.trabalha ? r.fim_intervalo : null,
        saida: r?.trabalha ? r.saida : null,
      };
    });
  } catch {
    return null;
  }
}
