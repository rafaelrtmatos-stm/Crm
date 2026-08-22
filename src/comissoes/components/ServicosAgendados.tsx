import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock, Bell, ChevronRight, ChevronDown, Trash2, ArrowLeft,
  RotateCcw, CheckSquare, Square, X, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../supabase';
import { showConfirm } from '../../lib/notify';
import { formatCurrency } from '../utils/storage';
import { getItensJaAdicionadosDeNotas, excluirServicoPorOrigem } from '../utils/supabaseStorage';
import { NotaDetalheModal, NotaDetalhe, NotaDetalheItem, NotaSelecionadoItem } from './NotaDetalheModal';
import { getTodayISO, toLocalISO } from '../utils/dateHelpers';

interface NotaAgendada {
  id: string;
  customer_name: string;
  total: number;
  discount_value?: number | null;
  scheduled_for: string | null;
  items: (NotaDetalheItem & { productId?: string | null })[];
  observacoes: string | null;
  created_at?: string;
}

interface ServicosAgendadosProps {
  onAddItemsToTable?: (items: NotaSelecionadoItem[], nota: NotaDetalhe, data: string) => Promise<boolean>;
  colaboradorId?: string;
}

const dateKey = (raw: string | null | undefined) => {
  if (!raw) return getTodayISO();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return getTodayISO();
  return toLocalISO(d);
};

const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit'
  });

export const ServicosAgendados: React.FC<ServicosAgendadosProps> = ({
  onAddItemsToTable,
  colaboradorId
}) => {
  const [notas, setNotas] = useState<NotaAgendada[]>([]);
  const [loading, setLoading] = useState(true);
  const [notaSelecionada, setNotaSelecionada] = useState<NotaAgendada | null>(null);
  const [dispensadas, setDispensadas] = useState<Set<string>>(new Set());
  const [itensAdicionadosPorNota, setItensAdicionadosPorNota] =
    useState<Record<string, Set<number>>>({});
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [lixeiraAberta, setLixeiraAberta] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<string>('all');

  const carregarDispensadas = async () => {
    if (!colaboradorId) {
      setDispensadas(new Set());
      return;
    }
    const { data } = await supabase
      .from('servicos_agendados_dispensados')
      .select('venda_id')
      .eq('colaborador_id', colaboradorId);
    setDispensadas(new Set((data || []).map((d: { venda_id: string }) => d.venda_id)));
  };

  const carregar = async () => {
    const { data: servicos } = await supabase
      .from('produtos')
      .select('id')
      .eq('is_service', true);

    const servicoIds = new Set((servicos || []).map((p: { id: string }) => p.id));

    const { data } = await supabase
      .from('vendas')
      .select('id, customer_name, total, discount_value, scheduled_for, items, observacoes, service_status, created_at')
      .neq('status', 'canceled')
      .is('deleted_at', null)
      .or('service_status.is.null,service_status.neq.produto_entregue')
      .order('scheduled_for', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    const todas = (data || []) as NotaAgendada[];
    const comServico = servicoIds.size === 0
      ? todas
      : todas.filter(n =>
          (n.items || []).some(i => i.productId && servicoIds.has(i.productId))
        );

    setNotas(comServico);
    setLoading(false);

    const ids = comServico.map(n => n.id);
    if (ids.length) {
      const mapa = await getItensJaAdicionadosDeNotas(ids);
      setItensAdicionadosPorNota(mapa);
    } else {
      setItensAdicionadosPorNota({});
    }
  };

  useEffect(() => {
    carregar();
    carregarDispensadas();

    const channel = supabase
      .channel('comissoes-servicos-agendados')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comissoes_servicos' }, carregar)
      .subscribe();

    const interval = setInterval(carregar, 60000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    carregarDispensadas();
  }, [colaboradorId]);

  const notasVisiveis = notas.filter(n => !dispensadas.has(n.id));
  const notasNaLixeira = useMemo(
    () => notas.filter(n => dispensadas.has(n.id)),
    [notas, dispensadas]
  );

  const diasDisponiveis = useMemo(() => {
    const keys = new Set<string>();
    notasVisiveis.forEach(n => keys.add(dateKey(n.scheduled_for || n.created_at)));
    return Array.from(keys).sort();
  }, [notasVisiveis]);

  const notasFiltradas = useMemo(() => {
    if (selectedDay === 'all') return notasVisiveis;
    return notasVisiveis.filter(n => dateKey(n.scheduled_for || n.created_at) === selectedDay);
  }, [notasVisiveis, selectedDay]);

  const gruposPorDia = useMemo(() => {
    const map = new Map<string, NotaAgendada[]>();
    notasFiltradas.forEach(n => {
      const key = dateKey(n.scheduled_for || n.created_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [notasFiltradas]);

  const toggleExpanded = (id: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddItems = async (
    items: NotaSelecionadoItem[],
    nota: NotaDetalhe,
    data: string
  ) => {
    const ok = await onAddItemsToTable?.(items, nota, data);
    if (!ok) return;

    setItensAdicionadosPorNota(prev => {
      const atual = new Set(prev[nota.id] || []);
      items.forEach(item => atual.add(item.idx));
      return { ...prev, [nota.id]: atual };
    });
  };

  // Tira um serviço já lançado a partir de um item da nota (o colaborador se enganou ao
  // adicionar). O item volta a ficar "Disponível" pra ser lançado de novo, se for o caso.
  const handleRemoverItem = async (notaId: string, idx: number) => {
    if (!(await showConfirm(
      'Tirar esse serviço da nota? Ele some da sua planilha de comissões e o item volta a ficar disponível.'
    ))) return;

    const ok = await excluirServicoPorOrigem(notaId, idx);
    if (!ok) return;

    setItensAdicionadosPorNota(prev => {
      const atual = new Set(prev[notaId] || []);
      atual.delete(idx);
      return { ...prev, [notaId]: atual };
    });
  };

  const handleExcluirNota = async (e: React.MouseEvent, vendaId: string) => {
    e.stopPropagation();
    if (!colaboradorId) return;
    if (!(await showConfirm(
      'Excluir essa nota da sua lista de Serviços? Ela some só pra você — continua normal no PDV/Financeiro.'
    ))) return;

    setDispensadas(prev => new Set(prev).add(vendaId));
    const { error } = await supabase
      .from('servicos_agendados_dispensados')
      .insert({ colaborador_id: colaboradorId, venda_id: vendaId });

    if (error) {
      setDispensadas(prev => {
        const next = new Set(prev);
        next.delete(vendaId);
        return next;
      });
    }
  };

  const toggleSelecionada = (id: string) => {
    setSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExcluirSelecionadas = async () => {
    if (!colaboradorId || !selecionadas.size) return;
    const ids = Array.from(selecionadas);

    if (!(await showConfirm(
      `Excluir ${ids.length} nota(s) da sua lista de Serviços?`
    ))) return;

    setDispensadas(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
    setSelecionadas(new Set());
    setModoSelecao(false);

    const { error } = await supabase
      .from('servicos_agendados_dispensados')
      .insert(ids.map(venda_id => ({ colaborador_id: colaboradorId, venda_id })));

    if (error) await carregarDispensadas();
  };

  const handleRestaurarNota = async (vendaId: string) => {
    if (!colaboradorId) return;

    setDispensadas(prev => {
      const next = new Set(prev);
      next.delete(vendaId);
      return next;
    });

    const { error } = await supabase
      .from('servicos_agendados_dispensados')
      .delete()
      .eq('colaborador_id', colaboradorId)
      .eq('venda_id', vendaId);

    if (error) setDispensadas(prev => new Set(prev).add(vendaId));
  };

  const renderNotaCard = (nota: NotaAgendada) => {
    const totalItens = nota.items?.length || 0;
    const adicionados = itensAdicionadosPorNota[nota.id]?.size || 0;
    const completa = totalItens > 0 && adicionados >= totalItens;
    const parcial = adicionados > 0 && !completa;
    const expanded = expandedNotes.has(nota.id);
    const data = dateKey(nota.scheduled_for || nota.created_at);
    const atrasado =
      !!nota.scheduled_for && new Date(nota.scheduled_for).getTime() <= Date.now();

    return (
      <div
        key={nota.id}
        className={`rounded-2xl border overflow-hidden transition-all ${
          completa
            ? 'bg-emerald-500/5 border-emerald-500/25 opacity-60'
            : parcial
              ? 'bg-[var(--bg-card)] border-[var(--border-color)]'
              : 'bg-[var(--bg-card)] border-[var(--border-color)]'
        }`}
      >
        <div
          className="p-4 flex items-center gap-3 cursor-pointer hover:border-[var(--accent-red)]/50"
          onClick={() => modoSelecao ? toggleSelecionada(nota.id) : toggleExpanded(nota.id)}
        >
          {modoSelecao && (
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
              selecionadas.has(nota.id)
                ? 'bg-[var(--accent-red)] border-[var(--accent-red)]'
                : 'border-[var(--border-color)]'
            }`}>
              {selecionadas.has(nota.id) && <CheckSquare className="w-3.5 h-3.5 text-white" />}
            </div>
          )}

          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            completa ? 'bg-emerald-500/15' : atrasado ? 'bg-gradient-red' : 'bg-[var(--bg-card-sec)]'
          }`}>
            {completa
              ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              : <CalendarClock className={`w-5 h-5 ${atrasado ? 'text-white' : 'text-[var(--text-muted)]'}`} />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-black text-sm truncate">
                {(nota.customer_name || 'Cliente de Balcão').toUpperCase()}
              </p>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                NOTA #{nota.id.slice(-6).toUpperCase()}
              </span>
            </div>

            <p className="text-[11px] text-[var(--text-muted)]">
              {adicionados}/{totalItens} serviços adicionados
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[11px] font-black text-[var(--text-main)]">
                {formatCurrency(nota.total)}
              </span>
              <span className={`text-[10px] font-bold ${
                completa ? 'text-emerald-400' : atrasado ? 'text-[var(--accent-red)]' : 'text-[var(--text-muted)]'
              }`}>
                {completa
                  ? 'CONCLUÍDA'
                  : nota.scheduled_for
                    ? new Date(nota.scheduled_for).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                      })
                    : 'Sem agendamento'}
              </span>
            </div>
          </div>

          {colaboradorId && !modoSelecao && (
            <button
              onClick={e => handleExcluirNota(e, nota.id)}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 shrink-0"
              title="Excluir desta lista"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {!modoSelecao && (
            expanded
              ? <ChevronDown className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
              : <ChevronRight className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
          )}
        </div>

        {expanded && (
          <div className="border-t border-[var(--border-color)] bg-[var(--bg-card-sec)]/40 p-3 space-y-2">
            {(nota.items || []).map((item, idx) => {
              const added = itensAdicionadosPorNota[nota.id]?.has(idx);
              return (
                <div
                  key={`${nota.id}-${idx}`}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    added
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    added ? 'bg-emerald-500' : 'border-2 border-[var(--border-color)]'
                  }`}>
                    {added && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[var(--text-main)] truncate">{item.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{item.quantity ?? 1}x na nota</p>
                  </div>
                  <span className={`text-[10px] font-bold ${added ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                    {added ? 'Já adicionado' : 'Disponível'}
                  </span>
                  {added && colaboradorId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoverItem(nota.id, idx); }}
                      title="Tirar este serviço da nota"
                      className="shrink-0 p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            <div className="pt-2 flex items-center justify-between gap-2 text-[10px]">
              <span className="text-[var(--text-muted)]">
                {completa ? 'Todos os itens desta nota já foram lançados.' : 'Você pode adicionar 1, 2 ou todos os itens.'}
              </span>
              <button
                onClick={() => setNotaSelecionada(nota)}
                className="px-3 py-1.5 rounded-lg bg-gradient-red text-white font-bold"
              >
                {completa ? 'VER NOTA' : 'ADICIONAR SERVIÇOS'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Bell className="w-5 h-5 text-[var(--accent-red)]" />
        <h2 className="text-lg font-black uppercase tracking-tight">Serviços</h2>
        <span className="text-xs text-[var(--text-muted)] font-bold">
          ({lixeiraAberta ? notasNaLixeira.length : notasVisiveis.length})
        </span>

        {colaboradorId && (
          <div className="ml-auto flex items-center gap-2">
            {!lixeiraAberta && (
              <button
                onClick={() => {
                  setModoSelecao(v => !v);
                  setSelecionadas(new Set());
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-xs font-bold"
              >
                {modoSelecao ? <X className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{modoSelecao ? 'CANCELAR' : 'SELECIONAR'}</span>
              </button>
            )}

            {modoSelecao && !lixeiraAberta && (
              <button
                onClick={handleExcluirSelecionadas}
                disabled={!selecionadas.size}
                className="px-3 py-1.5 rounded-xl bg-gradient-red text-white text-xs font-bold disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                Excluir
              </button>
            )}

            <button
              onClick={() => {
                setLixeiraAberta(v => !v);
                setModoSelecao(false);
                setSelecionadas(new Set());
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-xs font-bold"
            >
              {lixeiraAberta ? <ArrowLeft className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{lixeiraAberta ? 'VOLTAR' : 'LIXEIRA'}</span>
            </button>
          </div>
        )}
      </div>

      {!lixeiraAberta && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedDay('all')}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border ${
              selectedDay === 'all'
                ? 'bg-gradient-red text-white border-transparent'
                : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)]'
            }`}
          >
            Todos
          </button>
          {diasDisponiveis.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border ${
                selectedDay === day
                  ? 'bg-gradient-red text-white border-transparent'
                  : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)]'
              }`}
            >
              {dateLabel(day)}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="animate-skeleton h-24 rounded-2xl" />
      ) : lixeiraAberta ? (
        notasNaLixeira.length === 0 ? (
          <div className="p-8 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-[var(--text-muted)]">
            Lixeira vazia
          </div>
        ) : (
          <div className="space-y-3">
            {notasNaLixeira.map(nota => (
              <div key={nota.id} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center gap-3 opacity-70">
                <Trash2 className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm truncate">{(nota.customer_name || 'Cliente de Balcão').toUpperCase()}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {dateLabel(dateKey(nota.scheduled_for || nota.created_at))}
                  </p>
                </div>
                <button
                  onClick={() => handleRestaurarNota(nota.id)}
                  className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1" />Restaurar
                </button>
              </div>
            ))}
          </div>
        )
      ) : gruposPorDia.length === 0 ? (
        <div className="p-8 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-[var(--text-muted)]">
          Nenhum serviço no momento.
        </div>
      ) : (
        <div className="space-y-5">
          {gruposPorDia.map(([day, dayNotas]) => (
            <section key={day} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                  {dateLabel(day)}
                </h3>
                <span className="text-[10px] font-bold text-[var(--text-muted)]">
                  {dayNotas.length} {dayNotas.length === 1 ? 'nota' : 'notas'}
                </span>
              </div>
              {dayNotas.map(renderNotaCard)}
            </section>
          ))}
        </div>
      )}

      <NotaDetalheModal
        nota={notaSelecionada}
        onClose={() => setNotaSelecionada(null)}
        onAddItems={handleAddItems}
        itensJaAdicionados={
          notaSelecionada
            ? (itensAdicionadosPorNota[notaSelecionada.id] || new Set())
            : undefined
        }
        onRemoveItem={
          notaSelecionada
            ? (idx) => handleRemoverItem(notaSelecionada.id, idx)
            : undefined
        }
      />
    </div>
  );
};
