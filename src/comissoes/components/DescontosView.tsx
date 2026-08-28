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
  registrarPagamento,
  editarPagamento,
  deletePagamento,
  calcularResumoCaixa,
  calcularResumoPorPeriodo,
  PeriodoVisualizacao,
} from '../utils/caixaSemanalStorage';
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
type DescontosPeriodo = 'semana' | 'mes' | 'ano';

const DESCONTOS_PERIODO_LABELS: Record<DescontosPeriodo, string> = {
  semana: 'Semana',
  mes: 'Mês',
  ano: 'Ano',
};

const format = (d: Date) => toLocalISO(d);

// Calcula início/fim do período selecionado, aplicando o offset (0 = atual,
// -1 = anterior, 1 = seguinte...). Semana sempre domingo a sábado.
const getDescontosPeriodoBounds = (periodo: DescontosPeriodo, offset: number) => {
  const now = new Date();

  if (periodo === 'semana') {
    const day = now.getDay(); // 0 = domingo ... 6 = sábado
    const start = new Date(now);
    start.setDate(now.getDate() - day + offset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: format(start), end: format(end) };
  }

  if (periodo === 'mes') {
    const y = now.getFullYear();
    const m = now.getMonth() + offset;
    return { start: format(new Date(y, m, 1)), end: format(new Date(y, m + 1, 0)) };
  }

  // ano
  const y = now.getFullYear() + offset;
  return { start: format(new Date(y, 0, 1)), end: format(new Date(y, 11, 31)) };
};

// Texto exibido junto ao total (ex: "01/08 - 07/08", "Agosto/2026", "2026")
const getDescontosPeriodoLabel = (periodo: DescontosPeriodo, offset: number, bounds: { start: string; end: string }): string => {
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
  tipo: 'falta_meio_periodo',
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
  const totalDescontosPeriodo = useMemo(
    () => calculateDescontosNoPeriodo(descontos, descontosPeriodoBounds.start, descontosPeriodoBounds.end),
    [descontos, descontosPeriodoBounds]
  );
  const descontosPeriodoLabel = useMemo(
    () => getDescontosPeriodoLabel(descontosPeriodo, descontosPeriodoOffset, descontosPeriodoBounds),
    [descontosPeriodo, descontosPeriodoOffset, descontosPeriodoBounds]
  );

  // ✅ Lista de descontos exibida abaixo também acompanha o seletor Semana/Mês/Ano de cima
  // (antes mostrava sempre TODOS os descontos já lançados, de qualquer data, ignorando o
  // período navegado -- uma falta de outra semana continuava aparecendo aqui mesmo quando
  // não fazia parte da semana selecionada). Considera ocorrência dentro do período (inclusive
  // recorrentes), não só a data de cadastro. ignorarAtivo=true pra continuar mostrando também
  // os inativos (acinzentados, com botão "Ativar") -- igual já era antes dessa mudança.
  const descontosDoPeriodo = useMemo(
    () => descontos.filter((d) => contarOcorrenciasNoPeriodo(d, descontosPeriodoBounds.start, descontosPeriodoBounds.end, true) > 0),
    [descontos, descontosPeriodoBounds]
  );

  // --- Caixa da Semana ---
  const [caixa, setCaixa] = useState<WeeklyCaixa | null>(null);
  const [loadingCaixa, setLoadingCaixa] = useState(true);
  // Se getOrCreateCaixaAberto falhar (ex: tabela ainda não criada no Supabase, RLS bloqueando,
  // sem internet etc.) guardamos o motivo aqui -- antes disso a tela ficava presa em
  // "Carregando..." pra sempre e sem nenhum aviso, escondendo até o botão de registrar
  // pagamento (que só aparece quando `caixa` existe).
  const [caixaError, setCaixaError] = useState(false);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
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
    getOrCreateCaixaAberto(colaboradorId).then((c) => {
      if (cancelled) return;
      if (!c) {
        setCaixa(null);
        setCaixaError(true);
        setLoadingCaixa(false);
        return;
      }
      setCaixa(c);
      setLoadingCaixa(false);
      getPagamentosDoCaixa(c.id).then((list) => { if (!cancelled) setPagamentos(list); });
    });
    return () => { cancelled = true; };
  }, [colaboradorId, reloadToken]);

  // ✅ Resumo completo (desde que o colaborador começou) -- alimenta o saldo acumulado
  // (dívida/crédito), que continua aparecendo sempre, independente do período visualizado.
  const resumoCaixa = useMemo(
    () => (caixa ? calcularResumoCaixa(caixa, baseSalary, services, descontos, pagamentos) : null),
    [caixa, baseSalary, services, descontos, pagamentos]
  );

  // ✅ Resumo agregado conforme o período escolhido (Semana / Mês / Ano) -- sempre calculado
  // ao vivo a partir dos mesmos dados (sem depender de "caixas fechados").
  const resumoPorPeriodo = useMemo(
    () => calcularResumoPorPeriodo(periodoVisualizacao, caixa, resumoCaixa, baseSalary, services, descontos, pagamentos, periodoOffset),
    [periodoVisualizacao, caixa, resumoCaixa, baseSalary, services, descontos, pagamentos, periodoOffset]
  );

  // ✅ Lista de pagamentos exibida abaixo também acompanha a navegação Semana/Mês/Ano
  // e o offset selecionados ali em cima (antes ficava sempre fixa em "todos os pagamentos
  // do caixa aberto", sem filtrar pelo período navegado).
  const pagamentosDoPeriodo = useMemo(
    () => pagamentos.filter((p) => p.data >= resumoPorPeriodo.inicio && p.data <= resumoPorPeriodo.fim),
    [pagamentos, resumoPorPeriodo.inicio, resumoPorPeriodo.fim]
  );

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
      valor: baseSalary > 0 ? sugerirValorFalta(emptyForm.tipo, baseSalary) : 0,
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
    setSaving(true);
    const saved = await saveDescontoToSupabase(colaboradorId, { ...form, id: editingId || undefined }, !editingId);
    setSaving(false);
    if (!saved) { showAlert('Não foi possível salvar o desconto.'); return; }
    const updated = editingId ? descontos.map((d) => (d.id === saved.id ? saved : d)) : [saved, ...descontos];
    onChange(updated);
    closeForm();
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
                Caixa {caixa ? `· desde ${formatDateBR(caixa.semanaInicio)}` : ''}
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
              <span className={`font-bold font-mono ${caixa!.saldoAnterior >= 0 ? 'text-[var(--text-main)]' : 'text-rose-400'}`}>
                {periodoVisualizacao === 'semana'
                  ? formatCurrency(caixa!.saldoAnterior)
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
                  value={pagamentoForm.formaPagamento}
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
                      <button onClick={() => handleStartEditPagamento(p)} className="p-1 rounded text-[var(--text-muted)] hover:text-primary-400 shrink-0" title="Editar">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => handleDeletePagamento(p)} className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400 shrink-0" title="Excluir">
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

      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
              <MinusCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Descontos na {DESCONTOS_PERIODO_LABELS[descontosPeriodo]}
              </span>
              <div className="text-2xl font-black text-rose-400 font-mono">{formatCurrency(totalDescontosPeriodo)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* ✅ Seletor de visualização: Semana / Mês / Ano (Semana é o padrão) */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
              {(['semana', 'mes', 'ano'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => { setDescontosPeriodo(p); setDescontosPeriodoOffset(0); }}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider transition-all ${
                    descontosPeriodo === p
                      ? 'bg-primary-500 text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {DESCONTOS_PERIODO_LABELS[p]}
                </button>
              ))}
            </div>

            {isAdmin && !showForm && (
              <button
                onClick={openNewForm}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-red text-white text-xs font-black uppercase tracking-wide shadow-red-glow hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Novo Desconto
              </button>
            )}
          </div>
        </div>

        {/* ✅ Navegação entre semanas/meses/anos anteriores e seguintes */}
        <div className="flex items-center justify-center gap-3 py-1 mt-4">
          <button
            onClick={() => setDescontosPeriodoOffset((o) => o - 1)}
            className="p-1.5 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 transition-all"
            title={`${DESCONTOS_PERIODO_LABELS[descontosPeriodo]} anterior`}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-black uppercase tracking-wider text-[var(--text-main)] min-w-[140px] text-center">
            {descontosPeriodoLabel}
            {descontosPeriodoOffset === 0 && <span className="text-primary-400"> · atual</span>}
          </span>
          <button
            onClick={() => setDescontosPeriodoOffset((o) => Math.min(0, o + 1))}
            disabled={descontosPeriodoOffset >= 0}
            className="p-1.5 rounded-lg bg-[var(--bg-card-sec)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
            title={`${DESCONTOS_PERIODO_LABELS[descontosPeriodo]} seguinte`}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {!isAdmin && (
          <p className="text-[11px] text-[var(--text-muted)] mt-3">
            Aqui você só consulta os descontos lançados. Qualquer dúvida, fale com o administrador.
          </p>
        )}
      </div>

      {isAdmin && showForm && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-[var(--accent-red)]">{editingId ? 'Editando desconto' : 'Novo desconto'}</h4>
            <button onClick={closeForm} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Motivo</span>
              <select
                value={form.tipo}
                onChange={(e) => {
                  const novoTipo = e.target.value as DescontoTipo;
                  // Ao escolher um tipo de falta (num desconto novo), sugere automaticamente
                  // o valor com base no salário semanal (segunda a sábado / 6 dias).
                  const sugestao =
                    !editingId && baseSalary > 0 ? sugerirValorFalta(novoTipo, baseSalary) : undefined;
                  setForm({ ...form, tipo: novoTipo, ...(sugestao ? { valor: sugestao } : {}) });
                }}
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
              >
                {(Object.keys(DESCONTO_TIPO_LABELS) as DescontoTipo[]).map((key) => (
                  <option key={key} value={key}>{DESCONTO_TIPO_LABELS[key]}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Valor (R$)</span>
              <input
                type="number" step="0.01" value={form.valor}
                onChange={(e) => setForm({ ...form, valor: Number(e.target.value) || 0 })}
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
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
                value={form.recorrencia}
                onChange={(e) => setForm({ ...form, recorrencia: e.target.value as DescontoRecorrencia })}
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
              >
                {(Object.keys(DESCONTO_RECORRENCIA_LABELS) as DescontoRecorrencia[]).map((key) => (
                  <option key={key} value={key}>{DESCONTO_RECORRENCIA_LABELS[key]}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                {form.recorrencia === 'unica' ? 'Data do desconto' : 'Data de início'}
              </span>
              <input
                type="date" value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
              />
            </label>
            <label className="space-y-1 block sm:col-span-2">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Observação (opcional)</span>
              <input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: faltou dia 10/08 sem avisar"
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={closeForm} className="h-9 px-4 rounded-xl text-xs font-black uppercase text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">Cancelar</button>
            <button
              disabled={saving}
              onClick={handleSave}
              className="h-9 px-4 rounded-xl bg-gradient-red text-white text-xs font-black uppercase tracking-wide shadow-red-glow hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Adicionar Desconto')}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
        {descontosDoPeriodo.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">
            <p className="font-bold text-sm">Nenhum desconto lançado em {descontosPeriodoLabel}.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {descontosDoPeriodo.map((d) => (
              <div key={d.id} className={`flex items-center gap-3 px-4 py-3 flex-wrap ${!d.ativo ? 'opacity-50' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[var(--text-main)] text-sm">{DESCONTO_TIPO_LABELS[d.tipo]}</p>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[var(--bg-card-sec)] text-[var(--text-muted)] border border-[var(--border-color)]">
                      {DESCONTO_RECORRENCIA_LABELS[d.recorrencia]}
                    </span>
                    {!d.ativo && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400">Inativo</span>}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {d.recorrencia === 'unica' ? formatDateBR(d.data) : `A partir de ${formatDateBR(d.data)}`}
                    {d.descricao ? ` · ${d.descricao}` : ''}
                  </p>
                </div>
                <div className="font-mono font-black text-rose-400 text-sm shrink-0">-{formatCurrency(d.valor)}</div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => openEditForm(d)} className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20" title="Editar">
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleToggleAtivo(d)}
                      className={`p-1.5 rounded-lg ${d.ativo ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                      title={d.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {d.ativo ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                    </button>
                    <button onClick={() => handleDelete(d)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400" title="Excluir">
                      <Trash2 size={13} />
                    </button>
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
