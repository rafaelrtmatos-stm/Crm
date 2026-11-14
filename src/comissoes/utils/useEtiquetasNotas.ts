import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabase';

/**
 * Etiqueta do serviço de cada nota (vendas.servico_etiqueta) — a mesma que aparece na conversa/lead
 * e na aba Serviços. Lida direto da nota (fonte única) e atualizada em tempo real, então Agenda Semanal,
 * Planilha, aba Serviços e conversa ficam sempre sincronizadas.
 */
export function useEtiquetasNotas(notaIds: (string | undefined | null)[]): Record<string, string> {
  const [mapa, setMapa] = useState<Record<string, string>>({});

  const chave = useMemo(
    () => Array.from(new Set(notaIds.filter((id): id is string => !!id && !id.startsWith('orc_')))).sort().join(','),
    [notaIds]
  );

  useEffect(() => {
    if (!chave) {
      setMapa({});
      return;
    }
    const ids = chave.split(',');
    let ativo = true;

    const carregar = async () => {
      const resultado: Record<string, string> = {};
      // Em lotes, pra não estourar o tamanho da URL.
      for (let i = 0; i < ids.length; i += 100) {
        const { data, error } = await supabase
          .from('vendas')
          .select('id, servico_etiqueta')
          .in('id', ids.slice(i, i + 100));
        if (error) return; // coluna ainda não existe (migração) ou falha: segue sem etiqueta
        (data || []).forEach((r: { id: string; servico_etiqueta: string | null }) => {
          if (r.servico_etiqueta && String(r.servico_etiqueta).trim()) {
            resultado[r.id] = String(r.servico_etiqueta).trim();
          }
        });
      }
      if (ativo) setMapa(resultado);
    };

    carregar();
    const canal = supabase
      .channel(`etiquetas-notas-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vendas' }, carregar)
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, [chave]);

  return mapa;
}
