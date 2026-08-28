import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock, Bell, ChevronRight, ChevronDown, Trash2, ArrowLeft,
  RotateCcw, CheckSquare, Square, X, CheckCircle2, Search, Copy, Check
} from 'lucide-react';
import { supabase } from '../../supabase';
import { showConfirm } from '../../lib/notify';
import { formatCurrency, formatDateBR, formatTimeBR } from '../utils/storage';
import {
  getItensJaAdicionadosDeNotas,
  excluirServicoPorOrigem,
  getDeletedServicesFromSupabase,
  restoreServiceFromSupabase,
} from '../utils/supabaseStorage';
import { NotaDetalhe, NotaDetalheItem, NotaSelecionadoItem } from './NotaDetalheModal';
import { getTodayISO, toLocalISO } from '../utils/dateHelpers';
import { getWorkWeekBounds, addDaysISO } from '../utils/caixaSemanalStorage';
import { ServiceItem } from '../types';

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

// Rótulo curto pro dia dentro da subpasta da semana (ex: "SEG 18").
const dayShortLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  const dow = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
  return `${dow} ${String(d.getDate()).padStart(2, '0')}`;
};

// Rótulo da "pasta" da semana (ex: "18 a 24 de Ago").
const weekLabel = (start: string, end: string) => {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const mesFmt = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  if (s.getMonth() === e.getMonth()) {
    return `${String(s.getDate()).padStart(2, '0')} a ${String(e.getDate()).padStart(2, '0')} de ${mesFmt(e)}`;
  }
  return `${String(s.getDate()).padStart(2, '0')} ${mesFmt(s)} a ${String(e.getDate()).padStart(2, '0')} ${mesFmt(e)}`;
};

// Mesma lógica de rateio de desconto do antigo modal: se a nota teve desconto, cada item
// perde a mesma fração proporcional ao seu peso no total bruto, pra comissão sair sobre o líquido.
const calcFatorDesconto = (nota: NotaAgendada): number => {
  const desconto = nota.discount_value ?? 0;
  if (!desconto || desconto <= 0) return 1;
  const brutoTotal = (nota.items || []).reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0);
  if (brutoTotal <= 0) return 1;
  const fator = (brutoTotal - desconto) / brutoTotal;
  return fator > 0 ? fator : 0;
};

export const ServicosAgendados: React.FC<ServicosAgendadosProps> = ({
  onAddItemsToTable,
  colaboradorId
}) => {
  const [notas, setNotas] = useState<NotaAgendada[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispensadas, setDispensadas] = useState<Set<string>>(new Set());
  // Itens marcados pelo colaborador dentro da lista expandida de cada nota — antes de
  // confirmar o lançamento (um por um ou via "Selecionar Todos"). Some daqui assim que a
  // nota é atualizada ou os itens são efetivamente adicionados.
  const [itemSelecionados, setItemSelecionados] = useState<Record<string, Set<number>>>({});
  const [itensAdicionadosPorNota, setItensAdicionadosPorNota] =
    useState<Record<string, Set<number>>>({});
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  // Lixeira única da aba Serviços: reúne os serviços de comissão excluídos da Planilha
  // (com restauração em até 30 dias) e as notas dispensadas dessa lista — antes eram duas
  // lixeiras separadas, uma aqui e outra na Planilha.
  const [lixeiraAberta, setLixeiraAberta] = useState(false);
  const [servicosExcluidos, setServicosExcluidos] = useState<ServiceItem[]>([]);
  const [carregandoExcluidos, setCarregandoExcluidos] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  // Navegação em duas camadas: semana (pasta) -> dia da semana (subpasta).
  // Sempre começa na semana atual, com o dia de HOJE selecionado por padrão.
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string>(getTodayISO());
  // Busca por texto — filtra pelo nome do cliente ou nome de qualquer item dentro da nota.
  // Quando ativa (texto digitado), ignora a navegacao por semana/dia e busca em TODAS as
  // notas visiveis, nao so na semana selecionada — senao a pessoa precisaria adivinhar em
  // qual semana o servico que ela procura esta
  const [termoBuscaServico, setTermoBuscaServico] = useState('');
  // Busca dentro da Lixeira (separada da busca da lista normal de notas) — filtra tanto
  // os serviços excluídos quanto as notas dispensadas ao mesmo tempo.
  const [termoBuscaLixeira, setTermoBuscaLixeira] = useState('');
  // Modal de confirmação de data ao adicionar serviço(s) na planilha: pergunta se lança
  // hoje, na data da nota, ou em outra data escolhida pelo colaborador (ex: fez o serviço
  // num dia diferente do agendamento).
  const [confirmarDataModal, setConfirmarDataModal] =
    useState<{ nota: NotaAgendada; idxs: number[]; dataHoje: string; dataNota: string; dataEscolhida: string; alterando: boolean } | null>(null);

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

  // Carrega os serviços de comissão excluídos (Lixeira, seção "Serviços excluídos").
  const carregarServicosExcluidos = async () => {
    if (!colaboradorId) {
      setServicosExcluidos([]);
      return;
    }
    setCarregandoExcluidos(true);
    const lista = await getDeletedServicesFromSupabase(colaboradorId);
    setServicosExcluidos(lista);
    setCarregandoExcluidos(false);
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

  // Ref pra ler o lixeiraAberta atual de dentro do listener de tempo real sem precisar
  // re-inscrever o canal toda vez que a Lixeira abre/fecha.
  const lixeiraAbertaRef = useRef(false);
  useEffect(() => { lixeiraAbertaRef.current = lixeiraAberta; }, [lixeiraAberta]);

  useEffect(() => {
    carregar();
    carregarDispensadas();
    carregarServicosExcluidos();

    const channel = supabase
      .channel('comissoes-servicos-agendados')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comissoes_servicos' }, () => {
        carregar();
        // Se a Lixeira estiver aberta nesse momento (ex: um serviço acabou de ser excluído
        // ou restaurado na Planilha), reflete a seção "Serviços excluídos" na hora também.
        if (lixeiraAbertaRef.current) carregarServicosExcluidos();
      })
      .subscribe();

    const interval = setInterval(carregar, 60000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    carregarDispensadas();
    carregarServicosExcluidos();
  }, [colaboradorId]);

  const notasVisiveis = notas.filter(n => !dispensadas.has(n.id));
  const notasNaLixeira = useMemo(
    () => notas.filter(n => dispensadas.has(n.id)),
    [notas, dispensadas]
  );

  // Filtra as duas seções da Lixeira pelo mesmo termo de busca — por cliente, veículo
  // ou nome do serviço/item.
  const servicosExcluidosFiltrados = useMemo(() => {
    const termo = termoBuscaLixeira.trim().toLowerCase();
    if (!termo) return servicosExcluidos;
    return servicosExcluidos.filter(item =>
      (item.serviceType || '').toLowerCase().includes(termo) ||
      (item.vehicle || '').toLowerCase().includes(termo) ||
      (item.clientName || '').toLowerCase().includes(termo)
    );
  }, [servicosExcluidos, termoBuscaLixeira]);

  const notasNaLixeiraFiltradas = useMemo(() => {
    const termo = termoBuscaLixeira.trim().toLowerCase();
    if (!termo) return notasNaLixeira;
    return notasNaLixeira.filter(n => {
      const nomeCliente = (n.customer_name || '').toLowerCase();
      if (nomeCliente.includes(termo)) return true;
      return (n.items || []).some(item => (item.name || '').toLowerCase().includes(termo));
    });
  }, [notasNaLixeira, termoBuscaLixeira]);

  // Limites (domingo a sábado) da semana selecionada — pasta de nível 1.
  const weekBounds = useMemo(() => getWorkWeekBounds(weekOffset), [weekOffset]);

  // Sempre que a semana muda, o dia selecionado se reajusta: se a semana atual contém
  // hoje, seleciona hoje; senão volta pra "Todos" da semana (não há um "hoje" nela).
  useEffect(() => {
    const hoje = getTodayISO();
    if (hoje >= weekBounds.start && hoje <= weekBounds.end) {
      setSelectedDay(hoje);
    } else {
      setSelectedDay('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekBounds.start, weekBounds.end]);

  // Notas dentro da semana selecionada (pasta).
  const notasDaSemana = useMemo(
    () => notasVisiveis.filter(n => {
      const key = dateKey(n.scheduled_for || n.created_at);
      return key >= weekBounds.start && key <= weekBounds.end;
    }),
    [notasVisiveis, weekBounds]
  );

  // Os 7 dias (domingo a sábado) da semana selecionada — subpastas — com a contagem de
  // notas de cada um, pra montar os chips mesmo em dias sem nenhum serviço.
  const diasDaSemana = useMemo(() => {
    const dias: { iso: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const iso = addDaysISO(weekBounds.start, i);
      const count = notasDaSemana.filter(n => dateKey(n.scheduled_for || n.created_at) === iso).length;
      dias.push({ iso, count });
    }
    return dias;
  }, [weekBounds, notasDaSemana]);

  const notasFiltradas = useMemo(() => {
    const termo = termoBuscaServico.trim().toLowerCase();
    if (termo) {
      // Busca ativa: ignora semana/dia, procura em TODAS as notas visiveis
      return notasVisiveis.filter(n => {
        const nomeCliente = (n.customer_name || '').toLowerCase();
        if (nomeCliente.includes(termo)) return true;
        return (n.items || []).some(item => (item.name || '').toLowerCase().includes(termo));
      });
    }
    if (selectedDay === 'all') return notasDaSemana;
    return notasDaSemana.filter(n => dateKey(n.scheduled_for || n.created_at) === selectedDay);
  }, [notasDaSemana, notasVisiveis, selectedDay, termoBuscaServico]);

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

  // Copia o número completo da nota (não só os 6 últimos dígitos mostrados) pra área de
  // transferência — feedback visual rápido (ícone vira check por 1.5s).
  const [notaCopiada, setNotaCopiada] = useState<string | null>(null);
  const handleCopiarNota = (e: React.MouseEvent, notaId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(notaId);
    setNotaCopiada(notaId);
    setTimeout(() => setNotaCopiada(prev => (prev === notaId ? null : prev)), 1500);
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

  // Marca/desmarca um item da lista expandida da nota (seleção "um por um").
  const toggleItemSelecionado = (notaId: string, idx: number) => {
    setItemSelecionados(prev => {
      const atual = new Set(prev[notaId] || []);
      if (atual.has(idx)) atual.delete(idx); else atual.add(idx);
      return { ...prev, [notaId]: atual };
    });
  };

  // Botão "Selecionar Todos" (lado esquerdo) — marca de uma vez todos os itens ainda
  // não adicionados dessa nota; um segundo clique desmarca tudo.
  const toggleSelecionarTodos = (notaId: string, idxsRestantes: number[]) => {
    setItemSelecionados(prev => {
      const atual = prev[notaId] || new Set<number>();
      const todosMarcados = idxsRestantes.length > 0 && idxsRestantes.every(idx => atual.has(idx));
      return { ...prev, [notaId]: todosMarcados ? new Set() : new Set(idxsRestantes) };
    });
  };

  // Confirma o lançamento dos itens marcados numa data específica (o dia da nota ou outro,
  // escolhido no modal de confirmação abaixo).
  const handleAdicionarSelecionados = async (nota: NotaAgendada, idxs: number[], data: string) => {
    if (!idxs.length) return;
    const fator = calcFatorDesconto(nota);
    const escolhidos: NotaSelecionadoItem[] = idxs.map(idx => {
      const item = nota.items[idx];
      const bruto = (item.price ?? 0) * (item.quantity ?? 1);
      return {
        idx,
        name: item.name,
        quantity: item.quantity ?? 1,
        value: Number((bruto * fator).toFixed(2)),
      };
    });
    await handleAddItems(escolhidos, nota, data);
    setItemSelecionados(prev => {
      const next = { ...prev };
      delete next[nota.id];
      return next;
    });
  };

  // Abre o modal perguntando em que dia lançar os itens marcados — chamado pelo botão
  // "ADICIONAR SERVIÇO(S)" em vez de lançar direto.
  const abrirConfirmarData = (nota: NotaAgendada, idxs: number[]) => {
    if (!idxs.length) return;
    const dataHoje = getTodayISO();
    const dataNota = dateKey(nota.scheduled_for || nota.created_at);
    // Só HOJE é lançamento de 1 toque (é a ação mais comum e "segura" — sempre a data de
    // agora). Qualquer outra data (nota ou personalizada) passa pela tela de conferência
    // com o dia da semana em destaque, pra nunca gravar um dia errado sem o colaborador
    // ver claramente o que vai ser salvo antes de confirmar (bug relatado: toque errado
    // entre "HOJE" e "DATA DA NOTA", os dois com destaque visual igual).
    setConfirmarDataModal({ nota, idxs, dataHoje, dataNota, dataEscolhida: dataNota, alterando: false });
  };

  const confirmarAdicaoComData = async (data: string) => {
    if (!confirmarDataModal) return;
    const { nota, idxs } = confirmarDataModal;
    setConfirmarDataModal(null);
    await handleAdicionarSelecionados(nota, idxs, data);
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

  // Restaura um serviço excluído da Planilha de volta pra tabela do colaborador.
  const handleRestaurarServico = async (id: string) => {
    const ok = await restoreServiceFromSupabase(id);
    if (!ok) return;
    setServicosExcluidos(prev => prev.filter(s => s.id !== id));
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
              <span
                onClick={(e) => handleCopiarNota(e, nota.id)}
                title="Copiar número da nota"
                className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer shrink-0"
              >
                NOTA #{nota.id.slice(-6).toUpperCase()}
                {notaCopiada === nota.id
                  ? <Check className="w-3 h-3 text-emerald-400" />
                  : <Copy className="w-3 h-3" />}
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

        {expanded && (() => {
          const idxsRestantes = (nota.items || [])
            .map((_, idx) => idx)
            .filter(idx => !itensAdicionadosPorNota[nota.id]?.has(idx));
          const selecionadosNota = itemSelecionados[nota.id] || new Set<number>();
          const todosMarcados = idxsRestantes.length > 0 && idxsRestantes.every(idx => selecionadosNota.has(idx));
          // Mesmo fator de desconto usado no lançamento — pra mostrar aqui o valor real
          // que vai virar produção/comissão, já líquido, e não o preço bruto da nota.
          const fator = calcFatorDesconto(nota);

          return (
            <div className="border-t border-[var(--border-color)] bg-[var(--bg-card-sec)]/40 p-3 space-y-2">
              {(nota.items || []).map((item, idx) => {
                const added = itensAdicionadosPorNota[nota.id]?.has(idx);
                const isSelected = selecionadosNota.has(idx);
                const valorItem = (item.price ?? 0) * (item.quantity ?? 1) * fator;
                return (
                  <div
                    key={`${nota.id}-${idx}`}
                    onClick={() => !added && toggleItemSelecionado(nota.id, idx)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      added
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : isSelected
                          ? 'bg-[var(--accent-red)]/10 border-[var(--accent-red)]/50 cursor-pointer'
                          : 'bg-[var(--bg-card)] border-[var(--border-color)] cursor-pointer'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      added ? 'bg-emerald-500' : isSelected ? 'bg-[var(--accent-red)]' : 'border-2 border-[var(--border-color)]'
                    }`}>
                      {(added || isSelected) && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[var(--text-main)] truncate">{item.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {item.quantity ?? 1}x na nota · <span className="font-mono font-bold text-[var(--text-main)]">{formatCurrency(valorItem)}</span>
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold ${
                      added ? 'text-emerald-400' : isSelected ? 'text-[var(--accent-red)]' : 'text-[var(--text-muted)]'
                    }`}>
                      {added ? 'Já adicionado' : isSelected ? 'Selecionado' : 'Disponível'}
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

              <div className="pt-2 flex items-center justify-between gap-2">
                {completa ? (
                  <span className="text-[10px] text-emerald-400 font-bold">Todos os itens desta nota já foram lançados.</span>
                ) : (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelecionarTodos(nota.id, idxsRestantes); }}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[11px] font-bold text-[var(--text-muted)] hover:bg-[var(--bg-card)] cursor-pointer"
                    >
                      {todosMarcados ? 'DESMARCAR TODOS' : 'SELECIONAR TODOS'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); abrirConfirmarData(nota, Array.from(selecionadosNota)); }}
                      disabled={selecionadosNota.size === 0}
                      className="px-3 py-1.5 rounded-lg bg-gradient-red text-white text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {selecionadosNota.size > 1 ? `ADICIONAR ${selecionadosNota.size} SERVIÇOS` : 'ADICIONAR SERVIÇO'}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Bell className="w-5 h-5 text-[var(--accent-red)]" />
        <h2 className="text-lg font-black uppercase tracking-tight">Serviços</h2>
        <span className="text-xs text-[var(--text-muted)] font-bold">
          ({lixeiraAberta ? notasNaLixeira.length + servicosExcluidos.length : notasVisiveis.length})
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
                setTermoBuscaLixeira('');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-xs font-bold"
            >
              {lixeiraAberta ? <ArrowLeft className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{lixeiraAberta ? 'VOLTAR' : 'LIXEIRA'}</span>
              {!lixeiraAberta && (notasNaLixeira.length + servicosExcluidos.length) > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-[var(--accent-red)] text-white text-[10px]">
                  {notasNaLixeira.length + servicosExcluidos.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {colaboradorId && !lixeiraAberta && (
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={termoBuscaServico}
            onChange={(e) => setTermoBuscaServico(e.target.value)}
            placeholder="Buscar por cliente ou serviço..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
          />
        </div>
      )}

      {lixeiraAberta && (
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={termoBuscaLixeira}
            onChange={(e) => setTermoBuscaLixeira(e.target.value)}
            placeholder="Buscar na lixeira por cliente, veículo ou serviço..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
          />
        </div>
      )}

      {!lixeiraAberta && !termoBuscaServico.trim() && (
        <div className="space-y-2">
          {/* Pasta: navegação por semana */}
          <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-2 py-1.5">
            <button
              onClick={() => setWeekOffset(v => v - 1)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card-sec)] cursor-pointer"
              title="Semana anterior"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
              <CalendarClock className="w-3.5 h-3.5 text-[var(--accent-red)] shrink-0" />
              <span className="text-xs font-black uppercase tracking-wide truncate">
                {weekOffset === 0 ? 'Esta Semana' : weekLabel(weekBounds.start, weekBounds.end)}
              </span>
            </div>
            <button
              onClick={() => setWeekOffset(v => v + 1)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card-sec)] cursor-pointer"
              title="Próxima semana"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-gradient-red text-white text-[10px] font-black uppercase cursor-pointer"
              >
                Hoje
              </button>
            )}
          </div>

          {/* Subpastas: dias da semana selecionada */}
          <div className="flex gap-2 overflow-x-auto pb-1 pl-1">
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
            {diasDaSemana.map(({ iso, count }) => {
              const isToday = iso === getTodayISO();
              const selected = selectedDay === iso;
              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDay(iso)}
                  className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                    selected
                      ? 'bg-gradient-red text-white border-transparent'
                      : isToday
                        ? 'bg-[var(--bg-card)] border-[var(--accent-red)]/50 text-[var(--text-main)]'
                        : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)]'
                  }`}
                >
                  {dayShortLabel(iso)}
                  {isToday && !selected && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)]" />}
                  {count > 0 && (
                    <span className={`text-[10px] ${selected ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="animate-skeleton h-24 rounded-2xl" />
      ) : lixeiraAberta ? (
        notasNaLixeira.length === 0 && servicosExcluidos.length === 0 && !carregandoExcluidos ? (
          <div className="p-8 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-[var(--text-muted)]">
            <Trash2 className="w-8 h-8 mx-auto mb-2 text-[var(--accent-red)] opacity-50" />
            <p className="font-bold text-sm">Lixeira vazia</p>
          </div>
        ) : termoBuscaLixeira.trim() &&
          servicosExcluidosFiltrados.length === 0 &&
          notasNaLixeiraFiltradas.length === 0 &&
          !carregandoExcluidos ? (
          <div className="p-8 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-[var(--text-muted)]">
            <Search className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)] opacity-50" />
            <p className="font-bold text-sm">Nenhum resultado para "{termoBuscaLixeira.trim()}"</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Seção 1: Serviços excluídos da Planilha (restauráveis por 30 dias) */}
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                  Serviços excluídos
                </h3>
                <span className="text-[10px] font-bold text-[var(--text-muted)]">
                  Ficam disponíveis por 30 dias antes de serem apagados de vez
                </span>
              </div>
              {carregandoExcluidos ? (
                <div className="p-6 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-[var(--text-muted)] text-sm">
                  Carregando...
                </div>
              ) : servicosExcluidosFiltrados.length === 0 ? (
                <div className="p-6 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-[var(--text-muted)] text-sm">
                  {termoBuscaLixeira.trim() ? 'Nenhum serviço excluído para essa busca.' : 'Nenhum serviço excluído.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {servicosExcluidosFiltrados.map(item => (
                    <div key={item.id} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3 opacity-80">
                      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2.5">
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                            {formatDateBR(item.date)}{item.createdAt ? ` · ${formatTimeBR(item.createdAt)}` : ''}
                          </span>
                          <h3 className="font-bold text-sm text-[var(--text-main)] leading-tight truncate">{item.serviceType}</h3>
                          {item.vehicle && <p className="text-xs font-mono text-[var(--text-muted)]">{item.vehicle}</p>}
                        </div>
                        <Trash2 className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)] text-xs">
                        <div>
                          <span className="text-[10px] uppercase text-[var(--text-muted)] block">Produção</span>
                          <span className="font-bold font-mono text-[var(--text-main)] text-sm">{formatCurrency(item.productionValue)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-[var(--accent-red)] block font-bold">Comissão</span>
                          <span className="font-black font-mono text-[var(--accent-red)] text-sm">{formatCurrency(item.commissionValue)}</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-[var(--text-muted)]">
                        Excluído em {item.deletedAt ? `${formatDateBR(new Date(item.deletedAt).toISOString().split('T')[0])} ${formatTimeBR(item.deletedAt)}` : '—'}
                      </p>

                      <div className="flex items-center justify-end pt-1">
                        <button
                          onClick={() => handleRestaurarServico(item.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-400"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Seção 2: Notas dispensadas da lista de "puxar itens" */}
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                  Notas dispensadas
                </h3>
              </div>
              {notasNaLixeiraFiltradas.length === 0 ? (
                <div className="p-6 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-[var(--text-muted)] text-sm">
                  {termoBuscaLixeira.trim() ? 'Nenhuma nota dispensada para essa busca.' : 'Nenhuma nota dispensada.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {notasNaLixeiraFiltradas.map(nota => (
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
              )}
            </section>
          </div>
        )
      ) : gruposPorDia.length === 0 ? (
        <div className="p-8 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-[var(--text-muted)]">
          Nenhum serviço {selectedDay === 'all' ? 'nesta semana' : 'neste dia'}.
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

      {confirmarDataModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setConfirmarDataModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wide">Em que dia lançar?</h3>
              <button
                onClick={() => setConfirmarDataModal(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-card-sec)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              {confirmarDataModal.idxs.length > 1
                ? `${confirmarDataModal.idxs.length} serviços vão ser adicionados na sua planilha.`
                : 'Esse serviço vai ser adicionado na sua planilha.'}
            </p>

            {!confirmarDataModal.alterando ? (
              <div className="space-y-2">
                {confirmarDataModal.dataHoje === confirmarDataModal.dataNota ? (
                  <button
                    onClick={() => confirmarAdicaoComData(confirmarDataModal.dataHoje)}
                    className="w-full px-3 py-2.5 rounded-xl bg-gradient-red text-white text-xs font-bold"
                  >
                    HOJE (MESMA DATA DA NOTA) — {dateLabel(confirmarDataModal.dataHoje)}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => confirmarAdicaoComData(confirmarDataModal.dataHoje)}
                      className="w-full px-3 py-2.5 rounded-xl bg-gradient-red text-white text-xs font-bold"
                    >
                      HOJE — {dateLabel(confirmarDataModal.dataHoje)}
                    </button>
                    {/* "Data da nota" agora passa pela mesma tela de conferência da data
                        personalizada — antes era 1 toque só, com destaque visual quase
                        igual ao botão "HOJE" logo acima, e dava pra confirmar a data errada
                        sem perceber. Pré-preenche a data e deixa o dia da semana bem visível
                        antes de gravar de verdade. */}
                    <button
                      onClick={() => setConfirmarDataModal(prev => prev ? { ...prev, dataEscolhida: prev.dataNota, alterando: true } : prev)}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-[11px] font-bold text-[var(--text-muted)] hover:bg-[var(--bg-card)]"
                    >
                      Data da nota ({dateLabel(confirmarDataModal.dataNota)}) ou outra data
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="date"
                  value={confirmarDataModal.dataEscolhida}
                  onChange={(e) => setConfirmarDataModal(prev => prev ? { ...prev, dataEscolhida: e.target.value } : prev)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)] text-sm text-[var(--text-main)]"
                />
                {/* Conferência bem visível do dia da semana que vai ser gravado — pra nunca
                    confirmar um dia errado sem perceber (a causa do bug relatado). */}
                {confirmarDataModal.dataEscolhida && (
                  <p className="text-center text-xs font-black uppercase tracking-wide text-[var(--accent-red)] bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-xl px-3 py-2">
                    Vai lançar em: {dateLabel(confirmarDataModal.dataEscolhida)}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmarDataModal(prev => prev ? { ...prev, alterando: false } : prev)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-card-sec)]"
                  >
                    VOLTAR
                  </button>
                  <button
                    onClick={() => confirmarAdicaoComData(confirmarDataModal.dataEscolhida)}
                    disabled={!confirmarDataModal.dataEscolhida}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-gradient-red text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    CONFIRMAR
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
