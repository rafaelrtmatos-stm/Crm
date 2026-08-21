import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Bell, ChevronRight, Trash2, ArrowLeft, RotateCcw, CheckSquare, Square, X } from 'lucide-react';
import { supabase } from '../../supabase';
import { showConfirm } from '../../lib/notify';
import { formatCurrency } from '../utils/storage';
import { NotaDetalheModal, NotaDetalhe, NotaDetalheItem, NotaSelecionadoItem } from './NotaDetalheModal';

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
  // Chamado quando o colaborador confirma "Adicionar" no modal da nota — vem com todos
  // os itens marcados (1 ou mais), já com o valor revisado, e a data escolhida pra lançar
  // o serviço. Quem usa esse componente decide o que fazer (normalmente: salvar direto na
  // tabela dele, usando a data recebida em vez de calcular uma).
  onAddItemsToTable?: (items: NotaSelecionadoItem[], nota: NotaDetalhe, data: string) => void;
  // Id do colaborador logado — usado só pra dispensar (esconder) notas dessa lista pra ele.
  // Sem isso, o botão de Excluir some (não tem como saber de quem é a dispensa).
  colaboradorId?: string;
}

// Mostra todas as vendas do PDV que tem pelo menos um item de serviço (produto marcado
// como "is_service" no cadastro) — agendadas ou não. Os dois sistemas compartilham o mesmo
// banco de dados, entao o que e criado no CRM aparece aqui automaticamente, sem o colaborador
// precisar lancar nada. Notas ja marcadas como "Produto Entregue" somem da lista (entrega
// concluida nao e mais uma pendencia). O telefone do cliente nao e mostrado nem buscado aqui —
// essa aba e so pra dar visibilidade do serviço, nao pra contato direto com o cliente.
export const ServicosAgendados: React.FC<ServicosAgendadosProps> = ({ onAddItemsToTable, colaboradorId }) => {
  const [notas, setNotas] = useState<NotaAgendada[]>([]);
  const [loading, setLoading] = useState(true);
  const [notaSelecionada, setNotaSelecionada] = useState<NotaAgendada | null>(null);
  // Ids de venda que ESSE colaborador já dispensou (excluiu da própria lista) — não apaga a
  // venda de verdade, só esconde pra ele. Carregado uma vez e atualizado na hora ao excluir.
  const [dispensadas, setDispensadas] = useState<Set<string>>(new Set());
  // Modo de seleção em massa: liga checkboxes nos cards pra excluir várias notas de uma vez.
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  // Lixeira: mostra as notas que esse colaborador já dispensou, com opção de restaurar.
  const [lixeiraAberta, setLixeiraAberta] = useState(false);

  const carregarDispensadas = async () => {
    if (!colaboradorId) { setDispensadas(new Set()); return; }
    const { data } = await supabase
      .from('servicos_agendados_dispensados')
      .select('venda_id')
      .eq('colaborador_id', colaboradorId);
    setDispensadas(new Set((data || []).map((d: { venda_id: string }) => d.venda_id)));
  };

  const carregar = async () => {
    // Produtos marcados como serviço no cadastro — usado pra filtrar quais vendas têm
    // pelo menos um item de serviço (o item salvo na venda não guarda esse flag, só o
    // productId, então cruzamos com o cadastro de produtos).
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
      // "produto_entregue" = entrega ja concluida, nao deve mais aparecer como pendencia aqui.
      .or('service_status.is.null,service_status.neq.produto_entregue')
      .order('scheduled_for', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    const todas = (data || []) as NotaAgendada[];
    const comServico = servicoIds.size === 0
      ? todas
      : todas.filter((nota) => (nota.items || []).some((item) => item.productId && servicoIds.has(item.productId)));

    setNotas(comServico);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
    carregarDispensadas();
    // Realtime: mesmo padrao usado no Dashboard/PDV/Producao — reage na hora quando "vendas"
    // ou "produtos" mudam (precisa que ambas estejam na publication supabase_realtime).
    const channel = supabase
      .channel('comissoes-servicos-agendados')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, carregar)
      .subscribe();
    // Fallback de seguranca: se o realtime nao estiver habilitado no projeto (publication sem
    // "vendas"/"produtos"), essa aba nao fica travada — continua atualizando, so que a cada 1 minuto.
    const interval = setInterval(carregar, 60000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  useEffect(() => { carregarDispensadas(); }, [colaboradorId]);

  const agora = Date.now();
  const notasVisiveis = notas.filter((n) => !dispensadas.has(n.id));
  // Lixeira: as notas que esse colaborador já dispensou, mais recentes primeiro.
  const notasNaLixeira = useMemo(
    () => notas.filter((n) => dispensadas.has(n.id)),
    [notas, dispensadas]
  );

  const handleAddItems = (items: NotaSelecionadoItem[], nota: NotaDetalhe, data: string) => {
    onAddItemsToTable?.(items, nota, data);
    setNotaSelecionada(null);
  };

  const handleExcluirNota = async (e: React.MouseEvent, vendaId: string) => {
    e.stopPropagation();
    if (!colaboradorId) return;
    if (!(await showConfirm('Excluir essa nota da sua lista de Serviços? Ela some só pra você — continua normal no PDV/Financeiro.'))) return;
    // Otimista: some da tela na hora, e desfaz se der erro ao salvar
    setDispensadas((prev) => new Set(prev).add(vendaId));
    const { error } = await supabase
      .from('servicos_agendados_dispensados')
      .insert({ colaborador_id: colaboradorId, venda_id: vendaId });
    if (error) {
      setDispensadas((prev) => { const next = new Set(prev); next.delete(vendaId); return next; });
    }
  };

  // --- Seleção em massa ---
  const toggleModoSelecao = () => {
    setModoSelecao((prev) => !prev);
    setSelecionadas(new Set());
  };

  const toggleSelecionada = (vendaId: string) => {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(vendaId)) next.delete(vendaId); else next.add(vendaId);
      return next;
    });
  };

  const toggleSelecionarTodas = () => {
    setSelecionadas((prev) =>
      prev.size === notasVisiveis.length ? new Set() : new Set(notasVisiveis.map((n) => n.id))
    );
  };

  const handleExcluirSelecionadas = async () => {
    if (!colaboradorId || selecionadas.size === 0) return;
    const ids = Array.from(selecionadas);
    if (!(await showConfirm(
      `Excluir ${ids.length} nota(s) da sua lista de Serviços? Elas somem só pra você — continuam normais no PDV/Financeiro.`
    ))) return;
    // Otimista: some da tela na hora, e desfaz o que der erro ao salvar
    setDispensadas((prev) => { const next = new Set(prev); ids.forEach((id) => next.add(id)); return next; });
    setModoSelecao(false);
    setSelecionadas(new Set());
    const { error } = await supabase
      .from('servicos_agendados_dispensados')
      .insert(ids.map((venda_id) => ({ colaborador_id: colaboradorId, venda_id })));
    if (error) {
      await carregarDispensadas();
    }
  };

  // --- Lixeira: restaurar ---
  const handleRestaurarNota = async (vendaId: string) => {
    if (!colaboradorId) return;
    setDispensadas((prev) => { const next = new Set(prev); next.delete(vendaId); return next; });
    const { error } = await supabase
      .from('servicos_agendados_dispensados')
      .delete()
      .eq('colaborador_id', colaboradorId)
      .eq('venda_id', vendaId);
    if (error) {
      setDispensadas((prev) => new Set(prev).add(vendaId));
    }
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
                onClick={toggleModoSelecao}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  modoSelecao
                    ? 'bg-red-950/40 border-[var(--accent-red)] text-[var(--accent-red)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-card-sec)] text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-red)]'
                }`}
              >
                {modoSelecao ? <X className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{modoSelecao ? 'CANCELAR' : 'SELECIONAR'}</span>
              </button>
            )}

            <button
              onClick={() => { setLixeiraAberta((prev) => !prev); setModoSelecao(false); setSelecionadas(new Set()); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                lixeiraAberta
                  ? 'bg-red-950/40 border-[var(--accent-red)] text-[var(--accent-red)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-card-sec)] text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-red)]'
              }`}
              title={lixeiraAberta ? 'Voltar para a lista' : 'Ver notas excluídas'}
            >
              {lixeiraAberta ? <ArrowLeft className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{lixeiraAberta ? 'VOLTAR' : 'LIXEIRA'}</span>
              {!lixeiraAberta && notasNaLixeira.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-[var(--accent-red)] text-white text-[10px]">
                  {notasNaLixeira.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)] -mt-2">
        {lixeiraAberta
          ? 'Notas que você excluiu da sua lista. Restaurar faz elas voltarem a aparecer só pra você — a nota nunca deixou de existir no PDV/Financeiro.'
          : 'Todas as vendas com item de serviço no sistema principal, agendadas ou não — atualiza em tempo real. Toque numa nota para ver os detalhes.'}
      </p>

      {/* Barra de ação em massa */}
      {modoSelecao && !lixeiraAberta && (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-4 py-2.5">
          <button
            onClick={toggleSelecionarTodas}
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
          >
            {selecionadas.size === notasVisiveis.length && notasVisiveis.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-[var(--accent-red)]" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Selecionar todas
          </button>
          <span className="text-xs font-bold text-[var(--text-muted)]">{selecionadas.size} selecionada(s)</span>
          <button
            onClick={handleExcluirSelecionadas}
            disabled={selecionadas.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-red text-white text-xs font-bold uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir selecionadas
          </button>
        </div>
      )}

      {loading ? (
        <div className="animate-skeleton h-24 rounded-2xl" />
      ) : lixeiraAberta ? (
        notasNaLixeira.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 text-center text-[var(--text-muted)] text-sm">
            <Trash2 className="w-8 h-8 mx-auto mb-2 text-[var(--accent-red)] opacity-50" />
            <p className="font-bold text-sm">Lixeira vazia</p>
            <p className="text-xs mt-1">Notas que você excluir aparecem aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notasNaLixeira.map((nota) => (
              <div
                key={nota.id}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center gap-4 opacity-80"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[var(--bg-card-sec)]">
                  <Trash2 className="w-5 h-5 text-[var(--text-muted)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm truncate">{(nota.customer_name || 'Cliente de Balcão').toUpperCase()}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {(nota.items || []).map(i => i.name).join(', ') || 'Sem itens'}
                  </p>
                  <span className="text-[11px] font-black text-[var(--text-main)] block mt-1">{formatCurrency(nota.total)}</span>
                </div>
                <button
                  onClick={() => handleRestaurarNota(nota.id)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors cursor-pointer"
                  title="Restaurar pra sua lista"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">RESTAURAR</span>
                </button>
              </div>
            ))}
          </div>
        )
      ) : notasVisiveis.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 text-center text-[var(--text-muted)] text-sm">
          Nenhum serviço no momento.
        </div>
      ) : (
        <div className="space-y-3">
          {notasVisiveis.map((nota) => {
            const atrasado = !!nota.scheduled_for && new Date(nota.scheduled_for).getTime() <= agora;
            const selecionada = selecionadas.has(nota.id);
            return (
              <div
                key={nota.id}
                onClick={() => (modoSelecao ? toggleSelecionada(nota.id) : setNotaSelecionada(nota))}
                className={`bg-[var(--bg-card)] border rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-colors ${
                  selecionada
                    ? 'border-[var(--accent-red)] bg-[var(--accent-red)]/5'
                    : `hover:border-[var(--accent-red)]/60 ${atrasado ? 'border-[var(--accent-red)]' : 'border-[var(--border-color)]'}`
                }`}
              >
                {modoSelecao && (
                  <div
                    className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      selecionada ? 'bg-[var(--accent-red)] border-[var(--accent-red)]' : 'border-[var(--border-color)]'
                    }`}
                  >
                    {selecionada && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                  </div>
                )}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${atrasado ? 'bg-gradient-red' : 'bg-[var(--bg-card-sec)]'}`}>
                  <CalendarClock className={`w-5 h-5 ${atrasado ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm truncate">{(nota.customer_name || 'Cliente de Balcão').toUpperCase()}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {(nota.items || []).map(i => i.name).join(', ') || 'Sem itens'}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] font-black text-[var(--text-main)]">{formatCurrency(nota.total)}</span>
                    <span className={`text-[11px] font-bold ${atrasado ? 'text-[var(--accent-red)]' : 'text-[var(--text-muted)]'}`}>
                      {nota.scheduled_for
                        ? `${atrasado ? 'ATRASADO — ' : ''}${new Date(nota.scheduled_for).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                        : nota.created_at
                          ? new Date(nota.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : 'Sem agendamento'}
                    </span>
                  </div>
                </div>
                {colaboradorId && !modoSelecao && (
                  <button
                    onClick={(e) => handleExcluirNota(e, nota.id)}
                    title="Excluir dessa lista (só pra você)"
                    className="shrink-0 p-2 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {!modoSelecao && <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />}
              </div>
            );
          })}
        </div>
      )}

      <NotaDetalheModal nota={notaSelecionada} onClose={() => setNotaSelecionada(null)} onAddItems={handleAddItems} />
    </div>
  );
};
