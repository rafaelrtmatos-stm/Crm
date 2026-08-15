import React, { useEffect, useState } from 'react';
import { CalendarClock, Bell, Phone, ChevronRight } from 'lucide-react';
import { supabase } from '../../supabase';

interface NotaAgendada {
  id: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  scheduled_for: string;
  items: { name: string; quantity: number }[];
}

// Mostra as notas do PDV que tem entrega agendada — os dois sistemas compartilham o mesmo
// banco de dados, entao o que e criado no CRM aparece aqui automaticamente, sem o colaborador
// precisar lancar nada.
export const ServicosAgendados = () => {
  const [notas, setNotas] = useState<NotaAgendada[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    const { data } = await supabase
      .from('vendas')
      .select('id, customer_name, customer_phone, total, scheduled_for, items')
      .not('scheduled_for', 'is', null)
      .neq('status', 'canceled')
      .is('deleted_at', null)
      .order('scheduled_for', { ascending: true });
    setNotas((data || []) as NotaAgendada[]);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
    // Realtime: mesmo padrao usado no Dashboard/PDV/Producao — reage na hora quando a tabela
    // "vendas" muda (precisa que "vendas" esteja na publication supabase_realtime).
    const channel = supabase
      .channel('comissoes-servicos-agendados')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, carregar)
      .subscribe();
    // Fallback de seguranca: se o realtime nao estiver habilitado no projeto (publication sem
    // "vendas"), essa aba nao fica travada — continua atualizando, so que a cada 1 minuto.
    const interval = setInterval(carregar, 60000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  const agora = Date.now();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-[var(--accent-red)]" />
        <h2 className="text-lg font-black uppercase tracking-tight">Serviços Agendados</h2>
        <span className="text-xs text-[var(--text-muted)] font-bold">({notas.length})</span>
      </div>
      <p className="text-xs text-[var(--text-muted)] -mt-2">Entregas agendadas no sistema principal — atualiza em tempo real.</p>

      {loading ? (
        <div className="animate-skeleton h-24 rounded-2xl" />
      ) : notas.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 text-center text-[var(--text-muted)] text-sm">
          Nenhuma entrega agendada no momento.
        </div>
      ) : (
        <div className="space-y-3">
          {notas.map((nota) => {
            const atrasado = new Date(nota.scheduled_for).getTime() <= agora;
            return (
              <div
                key={nota.id}
                className={`bg-[var(--bg-card)] border rounded-2xl p-4 flex items-center gap-4 ${atrasado ? 'border-[var(--accent-red)]' : 'border-[var(--border-color)]'}`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${atrasado ? 'bg-gradient-red' : 'bg-[var(--bg-card-sec)]'}`}>
                  <CalendarClock className={`w-5 h-5 ${atrasado ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm truncate">{(nota.customer_name || 'Cliente de Balcão').toUpperCase()}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {(nota.items || []).map(i => i.name).join(', ') || 'Sem itens'}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[11px] font-bold ${atrasado ? 'text-[var(--accent-red)]' : 'text-[var(--text-muted)]'}`}>
                      {atrasado ? 'ATRASADO — ' : ''}
                      {new Date(nota.scheduled_for).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {nota.customer_phone && (
                      <a
                        href={`https://wa.me/55${nota.customer_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-red)]"
                      >
                        <Phone className="w-3 h-3" /> {nota.customer_phone}
                      </a>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
