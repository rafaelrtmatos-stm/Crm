import React, { useEffect, useMemo, useState } from 'react';
import {
  MinusCircle, Plus, Pencil, Trash2, X, Ban, CheckCircle2,
  Wallet, Banknote, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  Desconto,
  DescontoFormInput,
  DescontoTipo,
  DescontoRecorrencia,
  DESCONTO_TIPO_LABELS,
  DESCONTO_RECORRENCIA_LABELS,
  saveDescontoToSupabase,
  deleteDescontoFromSupabase,
  setDescontoAtivo,
  calculateDescontosNoPeriodo,
  contarOcorrenciasNoPeriodo,
  formatCurrency,
} from '../utils/supabaseStorage';
import {
  WeeklyCaixa,
  Pagamento,
  PagamentoFormInput,
  FormaPagamento,
  FORMA_PAGAMENTO_LABELS,
  getOrCreateCaixaAberto,
  getPagamentosDoCaixa,
  getPagamentosDoColaborador,
  getHistoricoCaixasFechados,
  avancarCaixaSeNecessario,
  registrarPagamento,
  editarPagamento,
  deletePagamento,
  calcularResumoCaixa,
  calcularResumoPorPeriodo,
  PeriodoVisualizacao,
  getWorkWeekBounds,
  getDescontosValesBounds,
  addDaysISO,
} from '../utils/caixaSemanalStorage';
import { supabase } from '../../supabase';
import { formatDateBR } from '../utils/storage';
import { showAlert, showConfirm } from '../../lib/notify';
import { ServiceItem } from '../types';
import { getTodayISO as getTodayISOLocal, toLocalISO } from '../utils/dateHelpers';

interface DescontosViewProps {
  colaboradorId: string;
  descontos: Desconto[];
  // Só true quando é o admin vendo pelo painel de Comissões do CRM ("Ver Painel") --
  // a tela do colaborador (login dele, seja em /comissoes ou no menu embutido) sempre
  // vem com isAdmin false, então só lista os descontos, sem nenhum botão de escrita.
  isAdmin: boolean;
  onChange: (updated: Desconto[]) => void;
  // Salário semanal do colaborador -- usado pra sugerir
  // automaticamente o valor do desconto de falta: valor do dia = salário semanal / 6, e
  // como "salário base" do Caixa da Semana abaixo.
  baseSalary?: number;
  // Serviços do colaborador -- usado só pra somar a comissão da semana do caixa aberto.
  services?: ServiceItem[];
}

const DIAS_UTEIS_SEMANA = 6; // dias úteis da semana

// Sugestão automática de valor pra descontos de falta, com base no salário semanal
// (6 dias úteis). Falta de período completo desconta o valor de 1 dia
// (salário / 6); falta de meio período desconta metade disso (salário / 12).
const sugerirValorFalta = (tipo: DescontoTipo, baseSalary: number): number => {
  const valorDia = baseSalary / DIAS_UTEIS_SEMANA;
  if (tipo === 'falta_periodo') return Math.round(valorDia * 100) / 100;
  if (tipo === 'falta_meio_periodo') return Math.round((valorDia / 2) * 100) / 100;
  return 0;
};

const getTodayISO = () => getTodayISOLocal();

// Tipo de período pro card "Descontos" (Semana / Mês / Ano), com offset pra navegar
// entre períodos anteriores/seguintes -- mesma ideia do seletor do Caixa da Semana.
type DescontosPeriodo = 'semana' | 'mes' | 'ano' | 'todos';

const DESCONTOS_PERIODO_LABELS: Record<DescontosPeriodo, string> = {
  semana: 'Semana',
  mes: 'Mês',
  ano: 'Ano',
  todos: 'Todos',
};

const format = (d: Date) => toLocalISO(d);

// Calcula início/fim do período selecionado, aplicando o offset (0 = atual,
// -1 = anterior, 1 = seguinte...). Semana de sábado a sexta.
const getDescontosPeriodoBounds = (periodo: DescontosPeriodo, offset: number) => {
  if (periodo === 'todos') {
    return { start: '1970-01-01', end: '2099-12-31' };
  }

  if (periodo === 'semana') {
    const weekBounds = getWorkWeekBounds(offset);
    return getDescontosValesBounds(weekBounds.start, weekBounds.end);
  }

  const now = new Date();
  if (periodo === 'mes') {
    const y = now.getFullYear();
    const m = now.getMonth() + offset;
    return { start: format(new Date(y, m, 1)), end: format(new Date(y, m + 1, 0)) };
  }

  // ano
  const y = now.getFullYear() + offset;
  return { start: format(new Date(y, 0, 1)), end: format(new Date(y, 11, 31)) };
};

// Texto exibido junto ao total (ex: "01/08 - 07/08", "Agosto/2026", "2026", "Todos os lançamentos")
const getDescontosPeriodoLabel = (periodo: DescontosPeriodo, offset: number, bounds: { start: string; end: string }): string => {
  if (periodo === 'todos') {
    return 'Todos os períodos';
  }

  const now = new Date();

  if (periodo === 'semana') {
    return `${formatDateBR(bounds.start)} - ${formatDateBR(bounds.end)}`;
  }

  if (periodo === 'mes') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  return String(now.getFullYear() + offset);
};

const emptyForm: DescontoFormInput = {
  tipo: 'outro',
  descricao: '',
  valor: 0,
  recorrencia: 'unica',
  data: getTodayISO(),
  ativo: true,
};

const emptyPagamentoForm: PagamentoFormInput = {
  valor: 0,
  data: getTodayISO(),
  descricao: '',
  formaPagamento: 'pix',
};

export const DescontosView: React.FC<DescontosViewProps> = ({ colaboradorId, descontos, isAdmin, onChange, baseSalary = 0, services = [] }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DescontoFormInput>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // ✅ Card "Descontos": seletor Semana / Mês / Ano, com Semana selecionada por padrão,
  // e navegação entre períodos anteriores/seguintes (mesmo padrão do Caixa da Semana).
  const [descontosPeriodo, setDescontosPeriodo] = useState<DescontosPeriodo>('semana');
  const [descontosPeriodoOffset, setDescontosPeriodoOffset] = useState(0);

  const descontosPeriodoBounds = useMemo(
    () => getDescontosPeriodoBounds(descontosPeriodo, descontosPeriodoOffset),
    [descontosPeriodo, descontosPeriodoOffset]
  );
  const totalDescontosPeriodo = useMemo(() => {
    if (descontosPeriodo === 'todos') {
      return descontos.filter((d) => d.ativo).reduce((sum, d) => sum + d.valor, 0);
    }
    return calculateDescontosNoPeriodo(descontos, descontosPeriodoBounds.start, descontosPeriodoBounds.end);
  }, [descontos, descontosPeriodo, descontosPeriodoBounds]);

  const descontosPeriodoLabel = useMemo(
    () => getDescontosPeriodoLabel(descontosPeriodo, descontosPeriodoOffset, descontosPeriodoBounds),
    [descontosPeriodo, descontosPeriodoOffset, descontosPeriodoBounds]
  );

  // ✅ Lista de descontos exibida abaixo acompanha o seletor Semana/Mês/Ano/Todos
  const descontosDoPeriodo = useMemo(() => {
    if (descontosPeriodo === 'todos') {
      return descontos;
    }
    return descontos.filter((d) => contarOcorrenciasNoPeriodo(d, descontosPeriodoBounds.start, descontosPeriodoBounds.end, true) > 0);
  }, [descontos, descontosPeriodo, descontosPeriodoBounds]);

  // --- Caixa da Semana ---
  const [caixa, setCaixa] = useState<WeeklyCaixa | null>(null);
  const [loadingCaixa, setLoadingCaixa] = useState(true);
  // Se getOrCreateCaixaAberto falhar (ex: tabela ainda não criada no Supabase, RLS bloqueando,
  // sem internet etc.) guardamos o motivo aqui -- antes disso a tela ficava presa em
  // "Carregando..." pra sempre e sem nenhum aviso, escondendo até o botão de registrar
  // pagamento (que só aparece quando `caixa` existe).
  const [caixaError, setCaixaError] = useState(false);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  // ✅ Semanas já fechadas (congeladas) do colaborador -- alimenta o card ao navegar pra
  // semanas/meses/anos passados sem precisar recalcular tudo de novo.
  const [historicoCaixas, setHistoricoCaixas] = useState<WeeklyCaixa[]>([]);
  const [showPagamentoForm, setShowPagamentoForm] = useState(false);
  // null = form em modo "novo pagamento"; id = form em modo "editando esse pagamento"
  const [editingPagamentoId, setEditingPagamentoId] = useState<string | null>(null);
  const [pagamentoForm, setPagamentoForm] = useState<PagamentoFormInput>({ ...emptyPagamentoForm });
  const [savingPagamento, setSavingPagamento] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  // ✅ Seletor de visualização do Caixa: Semana / Mês / Ano
  const [periodoVisualizacao, setPeriodoVisualizacao] = useState<PeriodoVisualizacao>('semana');
  // ✅ Navegação entre semanas/meses/anos: 0 = atual, -1 = anterior, 1 = seguinte...
  const [periodoOffset, setPeriodoOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingCaixa(true);
    setCaixaError(false);
    getOrCreateCaixaAberto(colaboradorId).then(async (c) => {
      if (cancelled) return;
      if (!c) {
        setCaixa(null);
        setCaixaError(true);
        setLoadingCaixa(false);
        return;
      }
      // ✅ Fecha automaticamente qualquer semana já vencida (o caixa fecha todo sábado) antes
      // de exibir qualquer coisa -- carrega só a sobra/dívida da semana anterior pra próxima,
      // em vez de acumular o histórico inteiro do colaborador.
      const atualizado = await avancarCaixaSeNecessario(c, baseSalary, services, descontos);
      if (cancelled) return;
      setCaixa(atualizado);
      setLoadingCaixa(false);
      getPagamentosDoColaborador(colaboradorId).then((list) => { if (!cancelled) setPagamentos(list); });
      getHistoricoCaixasFechados(colaboradorId).then((list) => { if (!cancelled) setHistoricoCaixas(list); });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colaboradorId, reloadToken]);

  // ✅ Atualização em tempo real dos pagamentos e vales na aba de descontos
  useEffect(() => {
    if (!colaboradorId) return;
    const channel = supabase
      .channel(`descontos-pagamentos-${colaboradorId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comissoes_pagamentos', filter: `colaborador_id=eq.${colaboradorId}` },
        () => {
          getPagamentosDoColaborador(colaboradorId).then((list) => setPagamentos(list));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [colaboradorId]);

  // ✅ Pagamentos vinculados à semana atual aberta
  const pagamentosCaixaAberto = useMemo(
    () => (caixa ? pagamentos.filter((p) => p.caixaId === caixa.id) : []),
    [caixa, pagamentos]
  );

  // ✅ Resumo da semana atual (a do caixa aberto) -- alimenta o saldo acumulado
  // (dívida/crédito), que continua aparecendo sempre, independente do período visualizado.
  const resumoCaixa = useMemo(
    () => (caixa ? calcularResumoCaixa(caixa, baseSalary, services, descontos, pagamentosCaixaAberto) : null),
    [caixa, baseSalary, services, descontos, pagamentosCaixaAberto]
  );

  // ✅ Resumo agregado conforme o período escolhido (Semana / Mês / Ano): semana atual calcula
  // ao vivo, semanas passadas usam o snapshot já congelado no fechamento (não recalcula nada).
  const resumoPorPeriodo = useMemo(
    () => calcularResumoPorPeriodo(periodoVisualizacao, caixa, historicoCaixas, resumoCaixa, periodoOffset),
    [periodoVisualizacao, caixa, historicoCaixas, resumoCaixa, periodoOffset]
  );

  // ✅ Lista de pagamentos exibida no card do Caixa
  const pagamentosDoPeriodo = useMemo(
    () => pagamentos.filter((p) => p.data >= resumoPorPeriodo.inicio && p.data <= resumoPorPeriodo.fim),
    [pagamentos, resumoPorPeriodo.inicio, resumoPorPeriodo.fim]
  );

  // ✅ Pagamentos para a aba/card de Histórico de Lançamentos
  const pagamentosDoHistorico = useMemo(() => {
    if (descontosPeriodo === 'todos') {
      return pagamentos;
    }
    return pagamentos.filter((p) => p.data >= descontosPeriodoBounds.start && p.data <= descontosPeriodoBounds.end);
  }, [pagamentos, descontosPeriodo, descontosPeriodoBounds]);

  const totalPagamentosPeriodo = useMemo(() => {
    return pagamentosDoHistorico.reduce((acc, p) => acc + p.valor, 0);
  }, [pagamentosDoHistorico]);

  const totalGeralAbatido = useMemo(() => {
    return totalDescontosPeriodo + totalPagamentosPeriodo;
  }, [totalDescontosPeriodo, totalPagamentosPeriodo]);

  type TipoFiltroHistorico = 'todos' | 'descontos' | 'pagamentos';
  const [filtroHistorico, setFiltroHistorico] = useState<TipoFiltroHistorico>('todos');

  interface ItemHistorico {
    id: string;
    tipo: 'desconto' | 'pagamento';
    data: string;
    valor: number;
    titulo: string;
    subtitulo?: string;
    badgeLabel: string;
    badgeColor: 'rose' | 'emerald';
    ativo?: boolean;
    desconto?: Desconto;
    pagamento?: Pagamento;
  }

  const itensHistorico = useMemo<ItemHistorico[]>(() => {
    const lista: ItemHistorico[] = [];

    if (filtroHistorico === 'todos' || filtroHistorico === 'descontos') {
      for (const d of descontosDoPeriodo) {
        lista.push({
          id: `desconto-${d.id}`,
          tipo: 'desconto',
          data: d.data,
          valor: d.valor,
          titulo: d.tipo === 'outro' && d.descricao ? d.descricao : (DESCONTO_TIPO_LABELS[d.tipo] || d.tipo),
          subtitulo: d.recorrencia === 'unica' ? formatDateBR(d.data) : `A partir de ${formatDateBR(d.data)}`,
          badgeLabel: d.tipo === 'outro' ? 'Outro Desconto' : (DESCONTO_TIPO_LABELS[d.tipo] || 'Desconto'),
          badgeColor: 'rose',
          ativo: d.ativo,
          desconto: d,
        });
      }
    }

    if (filtroHistorico === 'todos' || filtroHistorico === 'pagamentos') {
      for (const p of pagamentosDoHistorico) {
        lista.push({
          id: `pagamento-${p.id}`,
          tipo: 'pagamento',
          data: p.data,
          valor: p.valor,
          titulo: p.descricao || `Pagamento / Vale (${FORMA_PAGAMENTO_LABELS[p.formaPagamento] || p.formaPagamento})`,
          subtitulo: `${formatDateBR(p.data)} · ${FORMA_PAGAMENTO_LABELS[p.formaPagamento] || p.formaPagamento}`,
          badgeLabel: `Vale / Pagamento · ${FORMA_PAGAMENTO_LABELS[p.formaPagamento] || p.formaPagamento}`,
          badgeColor: 'emerald',
          ativo: true,
          pagamento: p,
        });
      }
    }

    return lista.sort((a, b) => b.data.localeCompare(a.data));
  }, [filtroHistorico, descontosDoPeriodo, pagamentosDoHistorico]);

  const handleAddPagamento = async () => {
    if (!caixa) return;
    if (!pagamentoForm.valor || pagamentoForm.valor <= 0) { showAlert('Informe um valor de pagamento maior que zero.'); return; }
    if (!pagamentoForm.data) { showAlert('Informe a data do pagamento.'); return; }
    setSavingPagamento(true);

    if (editingPagamentoId) {
      const updated = await editarPagamento(editingPagamentoId, pagamentoForm);
      setSavingPagamento(false);
      if (!updated) { showAlert('Não foi possível salvar a edição do pagamento.'); return; }
      setPagamentos((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } else {
      const saved = await registrarPagamento(colaboradorId, caixa.id, pagamentoForm);
      setSavingPagamento(false);
      if (!saved) { showAlert('Não foi possível registrar o pagamento.'); return; }
      setPagamentos((prev) => [saved, ...prev]);
    }

    setShowPagamentoForm(false);
    setEditingPagamentoId(null);
    setPagamentoForm({ ...emptyPagamentoForm });
  };

  const handleStartEditPagamento = (p: Pagamento) => {
    setEditingPagamentoId(p.id);
    setPagamentoForm({ valor: p.valor, data: p.data, descricao: p.descricao || '', formaPagamento: p.formaPagamento });
    setShowPagamentoForm(true);
  };

  const handleCancelPagamentoForm = () => {
    setShowPagamentoForm(false);
    setEditingPagamentoId(null);
    setPagamentoForm({ ...emptyPagamentoForm });
  };

  const handleDeletePagamento = async (p: Pagamento) => {
    if (!(await showConfirm('Excluir este pagamento? Essa ação não pode ser desfeita.'))) return;
    const ok = await deletePagamento(p.id);
    if (!ok) { showAlert('Não foi possível excluir.'); return; }
    setPagamentos((prev) => prev.filter((x) => x.id !== p.id));
    if (editingPagamentoId === p.id) handleCancelPagamentoForm();
  };

  const openNewForm = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      tipo: 'outro',
      descricao: '',
      valor: 0,
    });
    setShowForm(true);
  };

  const openEditForm = (d: Desconto) => {
    setEditingId(d.id);
    setForm({ tipo: d.tipo, descricao: d.descricao || '', valor: d.valor, recorrencia: d.recorrencia, data: d.data, ativo: d.ativo });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleSave = async () => {
    if (!form.valor || form.valor <= 0) { showAlert('Informe um valor de desconto maior que zero.'); return; }
    if (!form.data) { showAlert('Informe a data do desconto.'); return; }
    if (form.tipo === 'outro' && !form.descricao?.trim()) {
      showAlert('Por favor, informe o motivo do desconto.');
      return;
    }
    setSaving(true);
    const saved = await saveDescontoToSupabase(colaboradorId, { ...form, id: editingId || undefined }, !editingId);
    setSaving(false);
    if (!saved) { showAlert('Não foi possível salvar o desconto.'); return; }
    const updated = editingId ? descontos.map((d) => (d.id === saved.id ? saved : d)) : [saved, ...descontos];
    onChange(updated);
    closeForm();

    // Se o desconto lançado estiver fora do período atualmente filtrado, muda automaticamente para 'todos'
    // para que o usuário veja imediatamente o desconto recém adicionado
    if (descontosPeriodo !== 'todos' && contarOcorrenciasNoPeriodo(saved, descontosPeriodoBounds.start, descontosPeriodoBounds.end, true) === 0) {
      setDescontosPeriodo('todos');
    }
  };

  const handleDelete = async (d: Desconto) => {
    if (!(await showConfirm('Excluir este desconto? Essa ação não pode ser desfeita.'))) return;
    const ok = await deleteDescontoFromSupabase(d.id);
    if (!ok) { showAlert('Não foi possível excluir.'); return; }
    onChange(descontos.filter((x) => x.id !== d.id));
  };

  const handleToggleAtivo = async (d: Desconto) => {
    const ok = await setDescontoAtivo(d.id, !d.ativo);
    if (!ok) { showAlert('Não foi possível atualizar.'); return; }
    onChange(descontos.map((x) => (x.id === d.id ? { ...x, ativo: !x.ativo } : x)));
  };

  return (
    <div className="space-y-4">
      {/* Caixa -- nasce aberto e, enquanto não for fechado, acumula salário + comissão -
          descontos - pagamentos já feitos sem nenhum limite de data (não precisa fechar toda
          semana pra ficar em dia). Fechar aqui congela o saldo acumulado até agora e já abre
          o próximo caixa trazendo esse saldo (a favor ou dívida). */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary-500/10 text-primary-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Caixa {caixa ? `· semana de ${formatDateBR(caixa.semanaInicio)} a ${formatDateBR(caixa.semanaFim)}` : ''}
              </span>
              {loadingCaixa ? (
                <div className="text-sm text-[var(--text-muted)] mt-1">Carregando...</div>
              ) : caixaError ? (
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-rose-400">Não foi possível carregar o caixa da semana.</span>
                  <button
                    onClick={() => setReloadToken((t) => t + 1)}
                    className="text-[10px] font-black uppercase text-primary-400 hover:text-primary-300 underline underline-offset-2"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : !resumoCaixa ? (
                <div className="text-sm text-[var(--text-muted)] mt-1">Carregando...</div>
              ) : (
                <div className={`text-2xl font-black font-mono ${resumoPorPeriodo.saldoFinal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(resumoPorPeriodo.saldoFinal)}
                  <span className="text-[10px] font-bold uppercase tracking-wider ml-2 align-middle text-[var(--text-muted)]">
                    {resumoPorPeriodo.saldoFinal >= 0 ? 'a favor do colaborador' : 'dívida do colaborador'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Seletor de visualização: Semana / Mês / Ano */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
            {(['semana', 'mes', 'ano'] as const).map((p) => (
              <button
                key={p}
                onClick={() => { setPeriodoVisualizacao(p); setPeriodoOffset(0); }}
                className={`px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider transition-all ${
                  periodoVisualizacao === p
                    ? 'bg-primary-500 text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : 'Ano'}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ Navegação entre semanas/meses/anos anteriores e seguintes */}
        {resumoCaixa && (
          <div className="flex items-center justify-center gap-3 py-1">
            <button
              onClick={() => setPeriodoOffset((o) => o - 1)}
              className="p-1.5 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 transition-all"
              title={`${periodoVisualizacao === 'semana' ? 'Semana' : periodoVisualizacao === 'mes' ? 'Mês' : 'Ano'} anterior`}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black uppercase tracking-wider text-[var(--text-main)] min-w-[140px] text-center">
              {resumoPorPeriodo.label}
              {periodoOffset === 0 && <span className="text-primary-400"> · atual</span>}
            </span>
            <button
              onClick={() => setPeriodoOffset((o) => Math.min(0, o + 1))}
              disabled={periodoOffset >= 0}
              className="p-1.5 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
              title={`${periodoVisualizacao === 'semana' ? 'Semana' : periodoVisualizacao === 'mes' ? 'Mês' : 'Ano'} seguinte`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {resumoCaixa && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 text-center text-[11px]">
            <div className="p-2.5 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] block mb-1">
                {periodoVisualizacao === 'semana' ? 'Saldo Anterior' : 'Saldo Anterior ao Período'}
              </span>
              <span className={`font-bold font-mono ${resumoPorPeriodo.saldoAnterior >= 0 ? 'text-[var(--text-main)]' : 'text-rose-400'}`}>
                {periodoVisualizacao === 'semana'
                  ? formatCurrency(resumoPorPeriodo.saldoAnterior)
                  : formatCurrency(resumoPorPeriodo.saldoFinal - resumoPorPeriodo.saldoPeriodo)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] block mb-1">Salário Base</span>
              <span className="font-bold font-mono text-[var(--text-main)]">{formatCurrency(resumoPorPeriodo.salarioBase)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] block mb-1">Comissão</span>
              <span className="font-bold font-mono text-[var(--text-main)]">{formatCurrency(resumoPorPeriodo.totalComissao)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] block mb-1">Descontos</span>
              <span className="font-bold font-mono text-rose-400">-{formatCurrency(resumoPorPeriodo.totalDescontos)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] block mb-1">Salário + Comissão</span>
              <span className="font-bold font-mono text-[var(--text-main)]">{formatCurrency(resumoPorPeriodo.salarioBase + resumoPorPeriodo.totalComissao)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] block mb-1">Já Pago</span>
              <span className="font-bold font-mono text-rose-400">-{formatCurrency(resumoPorPeriodo.totalPago)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] block mb-1">
                {periodoVisualizacao === 'semana' ? 'Saldo da Semana' : `Saldo do Período (${resumoPorPeriodo.qtdSemanas} sem.)`}
              </span>
              <span className="font-bold font-mono text-[var(--text-main)]">{formatCurrency(resumoPorPeriodo.saldoPeriodo)}</span>
            </div>
          </div>
        )}

        {/* Pagamentos parciais feitos dentro do período navegado acima (adiantamento, vale, PIX avulso...) */}
        <div className="pt-2 border-t border-[var(--border-color)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Banknote size={13} /> Pagamentos feitos n{periodoVisualizacao === 'semana' ? 'essa semana' : periodoVisualizacao === 'mes' ? 'esse mês' : 'esse ano'}
            </span>
            {isAdmin && !showPagamentoForm && caixa && (
              <button
                onClick={() => setShowPagamentoForm(true)}
                className="flex items-center gap-1 text-[10px] font-black uppercase text-primary-400 hover:text-primary-300"
              >
                <Plus size={12} /> Registrar Pagamento
              </button>
            )}
          </div>

          {isAdmin && showPagamentoForm && (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end p-3 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
              {editingPagamentoId && (
                <span className="sm:col-span-5 text-[10px] font-black uppercase tracking-wider text-primary-400">
                  Editando pagamento
                </span>
              )}
              <label className="space-y-1 block">
                <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Valor (R$)</span>
                <input
                  type="number" step="0.01" value={pagamentoForm.valor}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, valor: Number(e.target.value) || 0 })}
                  className="w-full h-9 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Data</span>
                <input
                  type="date" value={pagamentoForm.data}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, data: e.target.value })}
                  className="w-full h-9 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Forma</span>
                <select
                  value={pagamentoForm.formaPagamento || 'pix'}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, formaPagamento: e.target.value as FormaPagamento })}
                  className="w-full h-9 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
                >
                  {(Object.keys(FORMA_PAGAMENTO_LABELS) as FormaPagamento[]).map((fp) => (
                    <option key={fp} value={fp}>{FORMA_PAGAMENTO_LABELS[fp]}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 block sm:col-span-2">
                <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Observação (opcional)</span>
                <input
                  value={pagamentoForm.descricao}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, descricao: e.target.value })}
                  placeholder="Ex: adiantamento via PIX"
                  className="w-full h-9 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
                />
              </label>
              <div className="sm:col-span-5 flex justify-end gap-2">
                <button
                  onClick={handleCancelPagamentoForm}
                  className="h-8 px-3 rounded-lg text-[10px] font-black uppercase text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  Cancelar
                </button>
                <button
                  disabled={savingPagamento}
                  onClick={handleAddPagamento}
                  className="h-8 px-3 rounded-lg bg-gradient-red text-white text-[10px] font-black uppercase tracking-wide shadow-red-glow hover:opacity-90 disabled:opacity-50"
                >
                  {savingPagamento ? 'Salvando...' : editingPagamentoId ? 'Salvar Edição' : 'Salvar'}
                </button>
              </div>
            </div>
          )}

          {pagamentosDoPeriodo.length === 0 ? (
            <p className="text-[11px] text-[var(--text-muted)]">
              Nenhum pagamento registrado n{periodoVisualizacao === 'semana' ? 'essa semana' : periodoVisualizacao === 'mes' ? 'esse mês' : 'esse ano'} ainda.
            </p>
          ) : (
            <div className="space-y-1.5">
              {pagamentosDoPeriodo.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-[var(--text-main)]">{formatDateBR(p.data)}</span>
                    <span className="text-[11px] text-[var(--text-muted)]"> · {FORMA_PAGAMENTO_LABELS[p.formaPagamento]}</span>
                    {p.descricao && <span className="text-[11px] text-[var(--text-muted)]"> · {p.descricao}</span>}
                  </div>
                  <span className="font-mono font-black text-rose-400 text-xs shrink-0">-{formatCurrency(p.valor)}</span>
                  {isAdmin && (
                    <>
                      <button onClick={() => handleStartEditPagamento(p)} className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 shrink-0 transition-all" title="Editar Pagamento">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => handleDeletePagamento(p)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 shrink-0 transition-all" title="Excluir Pagamento">
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card Principal: Histórico Unificado de Lançamentos (Descontos e Vales/Pagamentos) */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary-500/10 text-primary-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Lançamentos e Histórico
              </span>
              <div className="flex items-baseline gap-3 flex-wrap mt-0.5">
                <span className="text-2xl font-black text-[var(--text-main)] font-mono">
                  {formatCurrency(totalGeralAbatido)}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  (Descontos: <strong className="text-rose-400 font-mono">-{formatCurrency(totalDescontosPeriodo)}</strong> · Vales/Pagos: <strong className="text-emerald-400 font-mono">-{formatCurrency(totalPagamentosPeriodo)}</strong>)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de período: Semana / Mês / Ano / Todos */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
              {(['semana', 'mes', 'ano', 'todos'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => { setDescontosPeriodo(p); setDescontosPeriodoOffset(0); }}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    descontosPeriodo === p
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {DESCONTOS_PERIODO_LABELS[p]}
                </button>
              ))}
            </div>

            {isAdmin && !showPagamentoForm && caixa && (
              <button
                onClick={() => {
                  setShowPagamentoForm(true);
                  setShowForm(false);
                }}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wide transition-all shadow-sm cursor-pointer"
              >
                <Banknote className="w-4 h-4" />
                Registrar Pagamento
              </button>
            )}

            {isAdmin && !showForm && (
              <button
                onClick={() => {
                  openNewForm();
                  setShowPagamentoForm(false);
                }}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-red text-white text-xs font-black uppercase tracking-wide shadow-red-glow hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Novo Desconto
              </button>
            )}
          </div>
        </div>

        {/* Filtro por tipo de lançamento (Todos / Descontos / Vales) e Navegação de Período */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
            <button
              onClick={() => setFiltroHistorico('todos')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                filtroHistorico === 'todos'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Todos ({descontosDoPeriodo.length + pagamentosDoHistorico.length})
            </button>
            <button
              onClick={() => setFiltroHistorico('descontos')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                filtroHistorico === 'descontos'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Descontos ({descontosDoPeriodo.length})
            </button>
            <button
              onClick={() => setFiltroHistorico('pagamentos')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                filtroHistorico === 'pagamentos'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Vales e Pagamentos ({pagamentosDoHistorico.length})
            </button>
          </div>

          {descontosPeriodo !== 'todos' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDescontosPeriodoOffset((o) => o - 1)}
                className="p-1.5 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 transition-all cursor-pointer"
                title={`${DESCONTOS_PERIODO_LABELS[descontosPeriodo]} anterior`}
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs font-black uppercase tracking-wider text-[var(--text-main)] min-w-[130px] text-center">
                {descontosPeriodoLabel}
                {descontosPeriodoOffset === 0 && <span className="text-primary-400"> · atual</span>}
              </span>
              <button
                onClick={() => setDescontosPeriodoOffset((o) => Math.min(1, o + 1))}
                disabled={descontosPeriodoOffset >= 1}
                className="p-1.5 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title={`${DESCONTOS_PERIODO_LABELS[descontosPeriodo]} seguinte`}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          ) : (
            <span className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
              Exibindo histórico completo
            </span>
          )}
        </div>

        {!isAdmin && (
          <p className="text-[11px] text-[var(--text-muted)]">
            Aqui você consulta todos os descontos, vales e pagamentos registrados no seu caixa.
          </p>
        )}
      </div>

      {/* Formulário de Novo Pagamento / Vale */}
      {isAdmin && showPagamentoForm && (
        <div className="rounded-2xl border border-emerald-500/30 bg-[var(--bg-card)] p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
              <Banknote className="w-4 h-4" />
              {editingPagamentoId ? 'Editando pagamento / vale' : 'Registrar pagamento ou vale'}
            </h4>
            <button onClick={handleCancelPagamentoForm} className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="space-y-1 block">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Valor (R$)</span>
              <input
                type="number"
                step="0.01"
                value={pagamentoForm.valor || ''}
                onChange={(e) => setPagamentoForm({ ...pagamentoForm, valor: Number(e.target.value) || 0 })}
                placeholder="0,00"
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-400 font-mono font-bold"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Data</span>
              <input
                type="date"
                value={pagamentoForm.data}
                onChange={(e) => setPagamentoForm({ ...pagamentoForm, data: e.target.value })}
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-400"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Forma de Pagamento</span>
              <select
                value={pagamentoForm.formaPagamento || 'pix'}
                onChange={(e) => setPagamentoForm({ ...pagamentoForm, formaPagamento: e.target.value as FormaPagamento })}
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-400 font-medium"
              >
                {(Object.keys(FORMA_PAGAMENTO_LABELS) as FormaPagamento[]).map((fp) => (
                  <option key={fp} value={fp}>{FORMA_PAGAMENTO_LABELS[fp]}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Observação (opcional)</span>
              <input
                value={pagamentoForm.descricao || ''}
                onChange={(e) => setPagamentoForm({ ...pagamentoForm, descricao: e.target.value })}
                placeholder="Ex: Adiantamento, Vale PIX, etc."
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-400"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancelPagamentoForm}
              className="h-9 px-4 rounded-xl text-xs font-black uppercase text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              disabled={savingPagamento}
              onClick={handleAddPagamento}
              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wide transition-all disabled:opacity-50 cursor-pointer"
            >
              {savingPagamento ? 'Salvando...' : editingPagamentoId ? 'Salvar Edição' : 'Salvar Pagamento'}
            </button>
          </div>
        </div>
      )}

      {/* Formulário de Novo Desconto */}
      {isAdmin && showForm && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-[var(--accent-red)]">{editingId ? 'Editando desconto' : 'Novo desconto'}</h4>
            <button onClick={closeForm} className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Motivo do Desconto</span>
              <select
                value={form.tipo || 'outro'}
                onChange={(e) => {
                  const novoTipo = e.target.value as DescontoTipo;
                  const sugestao =
                    !editingId && baseSalary > 0 ? sugerirValorFalta(novoTipo, baseSalary) : undefined;
                  setForm({ ...form, tipo: novoTipo, ...(sugestao ? { valor: sugestao } : {}) });
                }}
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)] font-medium"
              >
                {(Object.keys(DESCONTO_TIPO_LABELS) as DescontoTipo[]).map((key) => (
                  <option key={key} value={key}>{DESCONTO_TIPO_LABELS[key]}</option>
                ))}
              </select>
            </label>

            {form.tipo === 'outro' ? (
              <label className="space-y-1 block">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                  Qual o motivo ou descrição? <span className="text-rose-400">*</span>
                </span>
                <input
                  value={form.descricao || ''}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Ex: Adiantamento, Vale transporte, Compra na loja..."
                  className="w-full h-10 bg-[var(--bg-card-sec)] border border-amber-500/50 rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-400 font-medium"
                  required
                />
              </label>
            ) : (
              <label className="space-y-1 block">
                <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Observação (opcional)</span>
                <input
                  value={form.descricao || ''}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Ex: justificativa ou detalhe do desconto"
                  className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
                />
              </label>
            )}

            <label className="space-y-1 block">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Valor (R$)</span>
              <input
                type="number" step="0.01" value={form.valor ?? ''}
                onChange={(e) => setForm({ ...form, valor: Number(e.target.value) || 0 })}
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)] font-mono font-bold"
              />
              {baseSalary > 0 && (form.tipo === 'falta_periodo' || form.tipo === 'falta_meio_periodo') && (
                <span className="block text-[10px] text-[var(--text-muted)]">
                  Sugestão: salário semanal ({formatCurrency(baseSalary)}) ÷ {DIAS_UTEIS_SEMANA} dias
                  {form.tipo === 'falta_meio_periodo' ? ' ÷ 2' : ''} = {formatCurrency(sugerirValorFalta(form.tipo, baseSalary))}
                </span>
              )}
            </label>
            <label className="space-y-1 block">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Recorrência</span>
              <select
                value={form.recorrencia || 'unica'}
                onChange={(e) => setForm({ ...form, recorrencia: e.target.value as DescontoRecorrencia })}
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
              >
                {(Object.keys(DESCONTO_RECORRENCIA_LABELS) as DescontoRecorrencia[]).map((key) => (
                  <option key={key} value={key}>{DESCONTO_RECORRENCIA_LABELS[key]}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block sm:col-span-2">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                {form.recorrencia === 'unica' ? 'Data do desconto' : 'Data de início'}
              </span>
              <input
                type="date" value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={closeForm} className="h-9 px-4 rounded-xl text-xs font-black uppercase text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">Cancelar</button>
            <button
              disabled={saving}
              onClick={handleSave}
              className="h-9 px-4 rounded-xl bg-gradient-red text-white text-xs font-black uppercase tracking-wide shadow-red-glow hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Adicionar Desconto')}
            </button>
          </div>
        </div>
      )}

      {/* Lista Unificada de Itens do Histórico */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
        {itensHistorico.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">
            <p className="font-bold text-sm">Nenhum lançamento encontrado em {descontosPeriodoLabel}.</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Alterne o período acima (Semana, Mês, Ano ou Todos) para consultar lançamentos anteriores.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {itensHistorico.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 flex-wrap transition-colors hover:bg-white/[0.02] ${
                  !item.ativo ? 'opacity-50' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[var(--text-main)] text-sm">
                      {item.titulo}
                    </p>
                    {item.tipo === 'desconto' ? (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/20">
                        {item.badgeLabel}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                        <Banknote size={10} />
                        {item.badgeLabel}
                      </span>
                    )}
                    {item.desconto?.recorrencia && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[var(--bg-card-sec)] text-[var(--text-muted)] border border-[var(--border-color)]">
                        {DESCONTO_RECORRENCIA_LABELS[item.desconto.recorrencia]}
                      </span>
                    )}
                    {!item.ativo && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400">
                        Inativo
                      </span>
                    )}
                  </div>
                  {item.subtitulo && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {item.subtitulo}
                    </p>
                  )}
                </div>

                <div className={`font-mono font-black text-sm shrink-0 ${
                  item.tipo === 'desconto' ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  -{formatCurrency(item.valor)}
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.tipo === 'desconto' && item.desconto ? (
                      <>
                        <button
                          onClick={() => openEditForm(item.desconto!)}
                          className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-all cursor-pointer"
                          title="Editar Desconto"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleToggleAtivo(item.desconto!)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            item.desconto.ativo
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                          title={item.desconto.ativo ? 'Desativar' : 'Ativar'}
                        >
                          {item.desconto.ativo ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                        </button>
                        <button
                          onClick={() => handleDelete(item.desconto!)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
                          title="Excluir Desconto"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : item.tipo === 'pagamento' && item.pagamento ? (
                      <>
                        <button
                          onClick={() => handleStartEditPagamento(item.pagamento!)}
                          className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-all cursor-pointer"
                          title="Editar Pagamento / Vale"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDeletePagamento(item.pagamento!)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
                          title="Excluir Pagamento / Vale"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
