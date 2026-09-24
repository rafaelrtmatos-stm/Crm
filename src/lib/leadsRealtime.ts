import { supabase } from '../supabase';

// Consumo do Supabase (egress): cada mensagem do WhatsApp atualiza um lead, e o Realtime avisa TODA aba
// aberta. Antes, cada aviso fazia a aba baixar a tabela `leads` inteira (select *). Aqui a aba busca
// so o(s) lead(s) que mudaram (uma consulta por id, agrupando rajadas) e aplica na lista que ja tem.
// Exclusao vem no proprio aviso (old.id). Carga inicial da tela continua sendo feita pela propria tela.
type PayloadLead = { eventType?: string; new?: any; old?: any };

export function criarAtualizadorDeLeads<T extends { id: string; updatedAt?: any }>(opts: {
  mapear: (row: any) => T;
  aplicar: (fn: (prev: T[]) => T[]) => void;
  atrasoMs?: number;
}) {
  const pendentes = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let vivo = true;

  // Mesma ordem da carga inicial (updated_at decrescente).
  const ordenar = (lista: T[]) => [...lista].sort(
    (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  );

  const buscar = async () => {
    timer = null;
    const ids = Array.from(pendentes);
    pendentes.clear();
    if (!ids.length || !vivo) return;
    const { data, error } = await supabase.from('leads').select('*').in('id', ids);
    if (error) { console.warn('[CRM] Falha ao atualizar leads alterados:', error); return; }
    if (!vivo) return;
    const novos = new Map<string, T>((data || []).map((r: any) => { const m = opts.mapear(r); return [m.id, m] as [string, T]; }));
    if (novos.size === 0) return;
    opts.aplicar(prev => {
      const existentes = new Set(prev.map(l => l.id));
      const atualizados = prev.map(l => novos.get(l.id) ?? l);
      const inseridos = Array.from(novos.values()).filter(l => !existentes.has(l.id));
      return ordenar([...inseridos, ...atualizados]);
    });
  };

  return {
    onEvento: (payload: PayloadLead) => {
      if (!vivo) return;
      if (payload?.eventType === 'DELETE') {
        const id = payload.old?.id;
        if (id) opts.aplicar(prev => prev.filter(l => l.id !== id));
        return;
      }
      const id = payload?.new?.id;
      if (!id) return;
      pendentes.add(id);
      if (!timer) timer = setTimeout(buscar, opts.atrasoMs ?? 300);
    },
    cancelar: () => {
      vivo = false;
      if (timer) clearTimeout(timer);
      timer = null;
      pendentes.clear();
    },
  };
}
