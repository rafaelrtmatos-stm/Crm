// Faz a tela recalcular em tempo real: escuta mudanças nas tabelas (Supabase Realtime) e incrementa um contador
// (com debounce) que as telas usam como dependência do carregamento. Também recarrega ao voltar para a aba.
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export function useRealtimeReload(tabelas: string[], ativo = true): number {
  const [tick, setTick] = useState(0);
  const chave = tabelas.join('|');
  useEffect(() => {
    if (!ativo) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const disparar = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setTick((t) => t + 1), 500);
    };
    let ch = supabase.channel(`rt-${chave}-${Math.random().toString(36).slice(2)}`);
    for (const table of chave.split('|')) {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, disparar);
    }
    ch.subscribe();
    const aoVoltar = () => { if (document.visibilityState === 'visible') disparar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
      supabase.removeChannel(ch);
    };
  }, [chave, ativo]);
  return tick;
}
