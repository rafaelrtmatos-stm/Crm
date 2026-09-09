import React, { useState, useEffect, useMemo } from 'react';
import {
  History, Clock, Plus, ArrowDownRight, ArrowUpRight, AlertTriangle,
  FileText, Calendar, Filter, X, Check, Search, Layers, RefreshCw,
  ExternalLink, Copy, Phone, ShoppingBag, DollarSign, CheckCircle2, User,
  Sparkles
} from 'lucide-react';
import { MateriaPrima } from '../types';
import { supabase } from '../supabase';
import {
  MateriaPrimaConsumptionRecord,
  fetchConsumptionHistory,
  recordMateriaPrimaConsumption,
  quickAdjustStock,
  syncMateriaPrimaStockFromHistory,
  CONSUMPTION_START_DATE
} from '../lib/materiasPrimasStorage';
import { Button, Modal } from './SharedUI';
import { showAlert } from '../lib/notify';
import { ReabastecerMateriaPrimaModal } from './ReabastecerMateriaPrimaModal';

interface MateriaPrimaHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMateriaPrima?: MateriaPrima | null;
  materiasPrimas: MateriaPrima[];
  onStockUpdated: () => void;
  companyId?: string;
}

type PeriodoClassificacao = 'hoje' | 'semana' | 'mes' | 'todos' | 'personalizado';

export const MateriaPrimaHistoryModal: React.FC<MateriaPrimaHistoryModalProps> = ({
  isOpen,
  onClose,
  selectedMateriaPrima,
  materiasPrimas,
  onStockUpdated,
  companyId
}) => {
  const [history, setHistory] = useState<MateriaPrimaConsumptionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMpId, setFilterMpId] = useState<string>(selectedMateriaPrima?.id || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Classificação Padrão: Hoje, Semana, Mês, Todos e Personalizado
  const [periodo, setPeriodo] = useState<PeriodoClassificacao>('mes');
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: '2026-08-31',
    end: '2026-09-07'
  });
  
  // Modal de Detalhes da Nota Clicada
  const [selectedSaleOrder, setSelectedSaleOrder] = useState<any | null>(null);
  const [loadingSaleDetails, setLoadingSaleDetails] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Novo lançamento manual
  const [showAddForm, setShowAddForm] = useState(false);
  const [isReabastecerModalOpen, setIsReabastecerModalOpen] = useState(false);
  const [targetMpId, setTargetMpId] = useState<string>(selectedMateriaPrima?.id || materiasPrimas[0]?.id || '');
  const [tipoOperacao, setTipoOperacao] = useState<'entrada' | 'ajuste_manual' | 'perda'>('entrada');
  const [quantidade, setQuantidade] = useState<number | ''>('');
  const [unidadeModo, setUnidadeModo] = useState<'metros' | 'bobinas'>('metros');
  const [observacao, setObservacao] = useState('');
  const [savingManual, setSavingManual] = useState(false);
  const [syncingStock, setSyncingStock] = useState(false);

  // Determina a data de referência dinâmica (hoje real ou data da movimentação mais recente no banco)
  const referenceDate = useMemo(() => {
    const now = new Date();
    if (history.length === 0) return now;
    const timestamps = history
      .map(h => new Date(h.timestamp).getTime())
      .filter(t => !isNaN(t));
    if (timestamps.length === 0) return now;
    const maxTime = Math.max(...timestamps);
    const maxDate = new Date(maxTime);
    // Se a data mais recente no banco for maior que now (ex: banco em 2026 e máquina do usuário em 2025), usa maxDate como âncora
    return maxDate > now ? maxDate : now;
  }, [history]);

  // Atualiza datas do customRange quando os dados forem carregados
  useEffect(() => {
    if (history.length > 0) {
      const y = referenceDate.getFullYear();
      const m = String(referenceDate.getMonth() + 1).padStart(2, '0');
      const d = String(referenceDate.getDate()).padStart(2, '0');
      setCustomRange(prev => ({
        start: prev.start || '2026-08-31',
        end: prev.end || `${y}-${m}-${d}`
      }));
    }
  }, [referenceDate, history.length]);

  // Contagens para os botões do período
  const periodCounts = useMemo(() => {
    const endOfDay = new Date(referenceDate);
    endOfDay.setHours(23, 59, 59, 999);

    const startOfDay = new Date(referenceDate);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(referenceDate);
    startOfWeek.setDate(referenceDate.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const aug31 = new Date(2026, 7, 31, 0, 0, 0);
    const startPeriodMonth = (startOfMonth > aug31) ? aug31 : startOfMonth;
    startPeriodMonth.setHours(0, 0, 0, 0);

    let countHoje = 0;
    let countSemana = 0;
    let countMes = 0;
    let countTodos = history.length;

    history.forEach(item => {
      const d = new Date(item.timestamp);
      if (isNaN(d.getTime())) return;
      if (d >= startOfDay && d <= endOfDay) countHoje++;
      if (d >= startOfWeek && d <= endOfDay) countSemana++;
      if (d >= startPeriodMonth && d <= endOfDay) countMes++;
    });

    return { countHoje, countSemana, countMes, countTodos };
  }, [history, referenceDate]);

  // Filtro por período e busca
  const { filteredHistory, labelPeriodo } = useMemo(() => {
    const endOfDay = new Date(referenceDate);
    endOfDay.setHours(23, 59, 59, 999);

    let label = 'Mês';
    let records = history;

    if (periodo === 'hoje') {
      label = 'Hoje';
      const startOfDay = new Date(referenceDate);
      startOfDay.setHours(0, 0, 0, 0);
      records = history.filter(item => {
        const d = new Date(item.timestamp);
        return d >= startOfDay && d <= endOfDay;
      });
    } else if (periodo === 'semana') {
      label = 'Semana';
      const startOfWeek = new Date(referenceDate);
      startOfWeek.setDate(referenceDate.getDate() - 7);
      startOfWeek.setHours(0, 0, 0, 0);
      records = history.filter(item => {
        const d = new Date(item.timestamp);
        return d >= startOfWeek && d <= endOfDay;
      });
    } else if (periodo === 'mes') {
      label = 'Mês';
      const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      const aug31 = new Date(2026, 7, 31, 0, 0, 0);
      const startPeriodMonth = (startOfMonth > aug31) ? aug31 : startOfMonth;
      startPeriodMonth.setHours(0, 0, 0, 0);
      records = history.filter(item => {
        const d = new Date(item.timestamp);
        return d >= startPeriodMonth && d <= endOfDay;
      });
    } else if (periodo === 'todos') {
      label = 'Todas';
      records = history;
    } else if (periodo === 'personalizado') {
      label = 'Personalizado';
      const s = customRange.start ? new Date(`${customRange.start}T00:00:00`) : new Date(0);
      const e = customRange.end ? new Date(`${customRange.end}T23:59:59.999`) : new Date(8640000000000000);
      records = history.filter(item => {
        const d = new Date(item.timestamp);
        return d >= s && d <= e;
      });
    }

    // Filtro por texto digitado
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      records = records.filter(item =>
        item.materiaPrimaName.toLowerCase().includes(term) ||
        (item.observacao && item.observacao.toLowerCase().includes(term)) ||
        (item.customerName && item.customerName.toLowerCase().includes(term)) ||
        (item.orderId && item.orderId.toLowerCase().includes(term))
      );
    }

    return { filteredHistory: records, labelPeriodo: label };
  }, [history, periodo, customRange, searchTerm, referenceDate]);

  useEffect(() => {
    if (selectedMateriaPrima) {
      setFilterMpId(selectedMateriaPrima.id);
      setTargetMpId(selectedMateriaPrima.id);
    } else {
      setFilterMpId('all');
      if (materiasPrimas.length > 0) {
        setTargetMpId(materiasPrimas[0].id);
      }
    }
  }, [selectedMateriaPrima, materiasPrimas]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, filterMpId, companyId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await fetchConsumptionHistory(
        filterMpId === 'all' ? undefined : filterMpId,
        companyId
      );
      setHistory(data);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSaleDetails = async (orderId: string, customerFallback?: string) => {
    try {
      setLoadingSaleDetails(true);
      const { data, error } = await supabase
        .from('vendas')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (error || !data) {
        showAlert(`Não foi possível carregar os detalhes da nota #${orderId.slice(-8).toUpperCase()}`);
        return;
      }
      setSelectedSaleOrder(data);
    } catch (e) {
      console.error('Erro ao carregar venda:', e);
      showAlert('Erro ao abrir detalhes da nota.');
    } finally {
      setLoadingSaleDetails(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleSaveManualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMpId) {
      showAlert('Selecione a matéria-prima.');
      return;
    }
    const mp = materiasPrimas.find(m => m.id === targetMpId);
    if (!mp) return;

    const qtdNum = typeof quantidade === 'number' ? quantidade : parseFloat(String(quantidade));
    if (isNaN(qtdNum) || qtdNum <= 0) {
      showAlert('Informe uma quantidade válida maior que zero.');
      return;
    }

    try {
      setSavingManual(true);
      const compBobina = mp.comprimentoBobina || 50;
      const isBobinaMp = mp.tipoCalculoCusto === 'bobina' || (mp.unit === 'm' && mp.comprimentoBobina);

      // Converte a quantidade conforme o modo informado
      let qtdMetros = qtdNum;
      if (isBobinaMp && unidadeModo === 'bobinas') {
        qtdMetros = qtdNum * compBobina;
      }

      const saldoAtualMetros = isBobinaMp 
        ? (mp.quantidadeEstoque ?? 0) * compBobina 
        : (mp.quantidadeEstoque ?? 0);

      let novoSaldoMetros = saldoAtualMetros;
      if (tipoOperacao === 'entrada') {
        novoSaldoMetros = saldoAtualMetros + qtdMetros;
      } else {
        novoSaldoMetros = Math.max(0, saldoAtualMetros - qtdMetros);
      }

      // Converte de volta para a unidade armazenada (bobinas se for tipo bobina)
      const novoSaldoArmazenado = isBobinaMp ? Number((novoSaldoMetros / compBobina).toFixed(4)) : novoSaldoMetros;

      await quickAdjustStock(
        mp.id,
        novoSaldoArmazenado,
        observacao || (tipoOperacao === 'entrada' ? `Entrada manual de +${qtdNum} ${unidadeModo}` : `Baixa/Perda manual de ${qtdNum} ${unidadeModo}`),
        companyId
      );

      // Reseta formulário
      setQuantidade('');
      setObservacao('');
      setShowAddForm(false);

      // Recarrega histórico e notifica parent
      await loadHistory();
      onStockUpdated();
      showAlert('Movimentação registrada com sucesso!');
    } catch (err) {
      console.error('Erro ao registrar movimentação:', err);
      showAlert('Erro ao registrar movimentação.');
    } finally {
      setSavingManual(false);
    }
  };

  const getBadgeForTipo = (tipo: MateriaPrimaConsumptionRecord['tipoOperacao']) => {
    switch (tipo) {
      case 'venda':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <ArrowDownRight size={12} className="text-cyan-400" />
            Saída / Venda
          </span>
        );
      case 'entrada':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowUpRight size={12} className="text-emerald-400" />
            Entrada de Estoque
          </span>
        );
      case 'perda':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle size={12} className="text-rose-400" />
            Perda / Teste
          </span>
        );
      case 'ajuste_manual':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <History size={12} className="text-amber-400" />
            Ajuste Manual
          </span>
        );
    }
  };

  const totalConsumo = useMemo(() => {
    return filteredHistory
      .filter(item => item.tipoOperacao === 'venda' || item.tipoOperacao === 'perda')
      .reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  }, [filteredHistory]);

  const totalEntrada = useMemo(() => {
    return filteredHistory
      .filter(item => item.tipoOperacao === 'entrada')
      .reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  }, [filteredHistory]);

  const currentMp = useMemo(() => {
    if (filterMpId && filterMpId !== 'all') {
      return materiasPrimas.find(m => m.id === filterMpId) || selectedMateriaPrima;
    }
    return selectedMateriaPrima || null;
  }, [filterMpId, materiasPrimas, selectedMateriaPrima]);

  const compBobina = currentMp?.comprimentoBobina || 50;
  const isBobina = currentMp?.tipoCalculoCusto === 'bobina' || (currentMp?.unit === 'm' && currentMp?.comprimentoBobina);
  const rawEstoque = currentMp?.quantidadeEstoque ?? 0;
  const currentSaldoMetros = isBobina
    ? (rawEstoque <= 15 ? Number((rawEstoque * compBobina).toFixed(1)) : rawEstoque)
    : rawEstoque;

  // Saídas reais acumuladas em notas de todo o histórico para a matéria-prima selecionada
  const totalSaidasGeral = useMemo(() => {
    if (!currentMp) return 0;
    return history
      .filter(item => (item.materiaPrimaId === currentMp.id || item.materiaPrimaName.toLowerCase().includes(currentMp.name.toLowerCase())) && (item.tipoOperacao === 'venda' || item.tipoOperacao === 'perda'))
      .reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  }, [history, currentMp]);

  const saldoTeoricoMetros = Math.max(0, Number((compBobina - totalSaidasGeral).toFixed(2)));
  const hasDivergencia = Boolean(currentMp && Math.abs(currentSaldoMetros - saldoTeoricoMetros) > 0.3);

  const handleSyncStock = async () => {
    if (!currentMp) return;
    try {
      setSyncingStock(true);
      const res = await syncMateriaPrimaStockFromHistory(currentMp.id, compBobina, companyId);
      if (res.success) {
        showAlert(res.message);
        onStockUpdated();
        await loadHistory();
      } else {
        showAlert(res.message || 'Erro ao sincronizar estoque.');
      }
    } catch (e: any) {
      showAlert('Erro ao sincronizar estoque: ' + (e?.message || 'Tente novamente'));
    } finally {
      setSyncingStock(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
      onClose={onClose}
      title="Histórico de Consumo & Movimentações de Estoque"
      size="xl"
    >
      <div className="space-y-4">
        {/* Top Control Bar com Classificação Padrão */}
        <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filtro por Matéria-Prima */}
            <div className="flex items-center gap-2 flex-1">
              <Filter size={15} className="text-primary-400 shrink-0" />
              <select
                value={filterMpId}
                onChange={e => setFilterMpId(e.target.value)}
                className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none flex-1"
              >
                <option value="all">Todas as Matérias-Primas</option>
                {materiasPrimas.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.comprimentoBobina ? `(Bobina ${m.comprimentoBobina}m)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Classificação Padrão: Hoje, Semana, Mês, Todos, Personalizado */}
            <div className="flex bg-black/60 p-1 rounded-xl border border-white/10 shrink-0 self-start sm:self-auto flex-wrap gap-1">
              {(['hoje', 'semana', 'mes', 'todos', 'personalizado'] as const).map(p => {
                const labels: Record<string, string> = {
                  hoje: `Hoje (${periodCounts.countHoje})`,
                  semana: `Semana (${periodCounts.countSemana})`,
                  mes: `Mês (${periodCounts.countMes})`,
                  todos: `Todas (${periodCounts.countTodos})`,
                  personalizado: 'Personalizado'
                };
                const isActive = periodo === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriodo(p)}
                    className={`px-2.5 sm:px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary-500 text-slate-950 shadow-md font-black'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {labels[p]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Linha secundária: Intervalo Personalizado (se ativo), Campo de Busca, Recarregar e Novo Lançamento */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {periodo === 'personalizado' && (
                <div className="flex items-center gap-1.5 bg-black/60 border border-primary-500/30 rounded-xl px-2.5 py-1 text-xs">
                  <Calendar size={13} className="text-primary-400 shrink-0" />
                  <span className="text-[10px] text-white/50 font-bold uppercase">De:</span>
                  <input
                    type="date"
                    value={customRange.start}
                    onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                    className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
                  />
                  <span className="text-[10px] text-white/40 font-bold uppercase">Até:</span>
                  <input
                    type="date"
                    value={customRange.end}
                    onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                    className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
                  />
                </div>
              )}

              <div className="relative flex-1 min-w-[150px] sm:max-w-xs">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder="Filtrar notas ou clientes..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 outline-none"
                />
              </div>

              <Button
                variant="secondary"
                onClick={loadHistory}
                title="Recarregar histórico"
                className="p-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={() => setIsReabastecerModalOpen(true)}
                className="text-xs py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                title="Registrar nova compra de bobina ou metros deste insumo"
              >
                <ShoppingBag size={14} />
                <span>+ Comprar / Reabastecer</span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-xs py-1.5 px-3 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 rounded-xl"
              >
                <Plus size={14} />
                <span>{showAddForm ? 'Fechar Lançamento' : '+ Ajuste Manual'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Resumo Rápido do Período Selecionado */}
        <div className="flex items-center justify-between px-2 text-[11px] text-white/50 bg-black/30 py-1.5 px-3 rounded-xl border border-white/5">
          <div className="flex items-center gap-2">
            <span className="font-black text-primary-400 uppercase tracking-wider">{labelPeriodo}:</span>
            <span className="text-white/80 font-semibold">{filteredHistory.length} movimentação(ões)</span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              Consumo: <strong className="text-cyan-400 font-mono font-bold">{totalConsumo.toFixed(2)}m</strong>
            </span>
            {totalEntrada > 0 && (
              <span>
                Entradas: <strong className="text-emerald-400 font-mono font-bold">+{totalEntrada.toFixed(2)}m</strong>
              </span>
            )}
          </div>
        </div>

        {/* Card de Auditoria & Sincronização de Estoque Físico vs Vendas Reais */}
        {currentMp && (
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-primary-950/20 to-slate-900 border border-primary-500/20 rounded-2xl space-y-2.5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20">
                  <Layers size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>Auditoria de Saldo & Consumo: {currentMp.name}</span>
                    {hasDivergencia ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                        <AlertTriangle size={11} />
                        Divergência Detectada
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                        <Check size={11} />
                        Estoque 100% Sincronizado
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-white/50">
                    Bobina padrão: <strong className="text-white/80">{compBobina}m</strong> • Saídas acumuladas em notas: <strong className="text-cyan-400 font-mono">{totalSaidasGeral.toFixed(2)}m</strong>
                  </p>
                </div>
              </div>

              {hasDivergencia && (
                <Button
                  variant="primary"
                  onClick={handleSyncStock}
                  disabled={syncingStock}
                  className="text-xs py-1.5 px-3 bg-primary-500 hover:bg-primary-400 text-slate-950 font-black rounded-xl shadow-lg shadow-primary-500/20 whitespace-nowrap self-stretch sm:self-auto flex items-center gap-1.5"
                >
                  <Sparkles size={13} className={syncingStock ? 'animate-spin' : ''} />
                  <span>{syncingStock ? 'Sincronizando...' : `Sincronizar Saldo Real (${saldoTeoricoMetros.toFixed(2)}m)`}</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-center">
              <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-white/40 block">Bobina Inicial</span>
                <strong className="text-xs font-black text-white font-mono">{compBobina}m</strong>
              </div>
              <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-cyan-400 block">Total Saídas Notas</span>
                <strong className="text-xs font-black text-cyan-400 font-mono">-{totalSaidasGeral.toFixed(2)}m</strong>
              </div>
              <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-emerald-400 block">Saldo Real Auditado</span>
                <strong className="text-xs font-black text-emerald-400 font-mono">
                  {saldoTeoricoMetros.toFixed(2)}m
                  <span className="text-[9px] text-white/40 font-normal ml-1">(~{(saldoTeoricoMetros / compBobina).toFixed(2)} bob.)</span>
                </strong>
              </div>
              <div className={`p-2 rounded-xl border ${hasDivergencia ? 'bg-amber-500/10 border-amber-500/30' : 'bg-black/40 border-white/5'}`}>
                <span className={`text-[9px] uppercase font-bold block ${hasDivergencia ? 'text-amber-400' : 'text-white/40'}`}>
                  Saldo Apontado no Card
                </span>
                <strong className={`text-xs font-black font-mono ${hasDivergencia ? 'text-amber-300' : 'text-white'}`}>
                  {currentSaldoMetros.toFixed(1)}m
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Formulário Retrátil de Lançamento Manual */}
        {showAddForm && (
          <form
            onSubmit={handleSaveManualRecord}
            className="p-4 bg-gradient-to-br from-primary-950/30 to-slate-900/80 border-2 border-primary-500/30 rounded-2xl space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-primary-300 flex items-center gap-1.5">
                <Plus size={14} className="text-primary-400" />
                <span>Registrar Entrada ou Baixa Manual</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-white/70">Matéria-Prima *</label>
                <select
                  value={targetMpId}
                  onChange={e => setTargetMpId(e.target.value)}
                  required
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-primary-400"
                >
                  {materiasPrimas.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.comprimentoBobina ? `${m.comprimentoBobina}m` : m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-white/70">Tipo de Operação *</label>
                <select
                  value={tipoOperacao}
                  onChange={e => setTipoOperacao(e.target.value as any)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-primary-400"
                >
                  <option value="entrada">➕ Entrada de Estoque (Compra / Reposição)</option>
                  <option value="ajuste_manual">➖ Baixa por Ajuste Manual</option>
                  <option value="perda">⚠️ Baixa por Perda / Reteste</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-white/70">Quantidade *</label>
                  <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded border border-white/10 text-[9px]">
                    <button
                      type="button"
                      onClick={() => setUnidadeModo('metros')}
                      className={`px-1.5 py-0.5 rounded ${unidadeModo === 'metros' ? 'bg-primary-500 text-slate-950 font-black' : 'text-white/50'}`}
                    >
                      Metros
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnidadeModo('bobinas')}
                      className={`px-1.5 py-0.5 rounded ${unidadeModo === 'bobinas' ? 'bg-primary-500 text-slate-950 font-black' : 'text-white/50'}`}
                    >
                      Bobinas
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={quantidade}
                    onChange={e => setQuantidade(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder={unidadeModo === 'metros' ? 'Ex: 10' : 'Ex: 1'}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold outline-none focus:border-primary-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-primary-400 font-mono font-bold">
                    {unidadeModo}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Observação (ex: Bobina recebida com nota fiscal, teste de perfil de cor...)"
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-primary-400"
              />
              <Button
                type="submit"
                disabled={savingManual}
                className="text-xs py-2 px-4 bg-primary-500 hover:bg-primary-400 text-slate-950 font-black shrink-0"
              >
                {savingManual ? 'Salvando...' : 'Confirmar Lançamento'}
              </Button>
            </div>
          </form>
        )}

        {/* Lista de Registros */}
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/30 max-h-96 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-white/40 flex items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-primary-400" size={18} />
              <span className="text-xs font-semibold">Carregando histórico...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-12 px-4 text-center text-white/40">
              <History size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-bold text-white/60">Nenhum registro de consumo encontrado.</p>
              <p className="text-[11px] text-white/40 mt-1">
                Conforme as vendas e impressões forem finalizadas no PDV ou baixas manuais forem feitas, o histórico aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredHistory.map(item => {
                const dateObj = new Date(item.timestamp);
                const dateFmt = dateObj.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });
                const timeFmt = dateObj.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                const isEntrada = item.tipoOperacao === 'entrada';

                return (
                  <div key={item.id} className="p-3 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-xl border mt-0.5 shrink-0 ${
                        isEntrada 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                      }`}>
                        {isEntrada ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-white text-xs">{item.materiaPrimaName}</strong>
                          {getBadgeForTipo(item.tipoOperacao)}
                          {item.orderId ? (
                            <button
                              type="button"
                              onClick={() => handleOpenSaleDetails(item.orderId!, item.customerName)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-primary-500/15 hover:bg-primary-500/25 text-primary-300 hover:text-primary-200 border border-primary-500/30 hover:border-primary-400 transition-all cursor-pointer group shadow-sm text-left"
                              title="Clique para ver os detalhes completos desta nota"
                            >
                              <FileText size={12} className="text-primary-400 shrink-0 group-hover:scale-110 transition-transform" />
                              <span className="text-white/60 font-semibold text-[10px]">Cliente:</span>
                              <span className="text-white font-black underline decoration-primary-400/40 underline-offset-2 truncate max-w-[150px] sm:max-w-[220px]">
                                {item.customerName || 'Cliente de Balcão'}
                              </span>
                              <span className="text-[10px] font-mono text-primary-300/90 bg-black/50 px-1.5 py-0.5 rounded shrink-0">
                                #{item.orderId.slice(-8).toUpperCase()}
                              </span>
                              <ExternalLink size={11} className="text-primary-400/60 group-hover:text-primary-300 shrink-0" />
                            </button>
                          ) : (
                            item.customerName && (
                              <span className="text-[11px] font-bold text-primary-300">
                                Cliente: {item.customerName}
                              </span>
                            )
                          )}
                        </div>

                        {item.observacao && (
                          <p className="text-[11px] text-white/60 mt-0.5 line-clamp-2">
                            {item.observacao}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {dateFmt} às {timeFmt}
                          </span>
                          {item.saldoApos !== undefined && (
                            <span>• Saldo após: <strong className="text-white">{item.saldoApos.toFixed(1)} {item.unit}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <strong className={`text-sm sm:text-base font-black font-mono block ${
                        isEntrada ? 'text-emerald-400' : 'text-amber-300'
                      }`}>
                        {isEntrada ? `+${item.quantity}` : `-${item.quantity}`} {item.unit}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-white/10">
          <Button variant="secondary" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </div>
      </div>
    </Modal>

    {/* Modal Detalhes da Nota / Pedido */}
    {selectedSaleOrder && (() => {
      const order = selectedSaleOrder;
      const total = Number(order.total || 0);
      const downPayment = Number(order.down_payment ?? order.received_value ?? (order.status === 'completed' ? total : 0));
      const balance = Math.max(0, total - downPayment);
      const isPaid = balance === 0 || order.status === 'completed';
      const items = Array.isArray(order.items) ? order.items : [];

      // Coleta todos os insumos consumidos nessa nota
      const notaInsumos: { mpName: string; quantity: number; unit: string }[] = [];
      items.forEach((it: any) => {
        if (Array.isArray(it.materiasPrimasConsumidas)) {
          it.materiasPrimasConsumidas.forEach((mp: any) => {
            const existing = notaInsumos.find(x => x.mpName === mp.name);
            if (existing) {
              existing.quantity += Number(mp.quantity || 0);
            } else {
              notaInsumos.push({
                mpName: mp.name,
                quantity: Number(mp.quantity || 0),
                unit: mp.unit || 'm'
              });
            }
          });
        }
      });

      return (
        <Modal
          isOpen={!!selectedSaleOrder}
          onClose={() => setSelectedSaleOrder(null)}
          title={`Nota #${order.id.slice(-8).toUpperCase()} — Detalhes da Venda`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Top Banner da Nota */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-black text-white">
                    {(order.customer_name || 'Cliente de Balcão').toUpperCase()}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                    isPaid 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {isPaid ? '✓ PAGO' : `FALTA R$ ${balance.toFixed(2).replace('.', ',')}`}
                  </span>
                  {order.service_status && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {order.service_status}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-white/50 text-[11px] font-mono flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-primary-400" />
                    {new Date(order.created_at).toLocaleString('pt-BR')}
                  </span>
                  {order.customer_phone && (
                    <a
                      href={`https://wa.me/55${order.customer_phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline"
                    >
                      <Phone size={12} />
                      {order.customer_phone}
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleCopy(order.id, 'nota')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-white/70 hover:text-white transition-all font-mono text-[11px] cursor-pointer"
                >
                  <Copy size={12} />
                  <span>#{order.id.slice(-8).toUpperCase()}</span>
                  {copiedField === 'nota' && <span className="text-emerald-400 font-bold ml-1">Copiado!</span>}
                </button>
              </div>
            </div>

            {/* Itens do Pedido */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-white/80 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <ShoppingBag size={13} className="text-primary-400" />
                  <span>Itens desta Nota ({items.length})</span>
                </h4>
              </div>

              <div className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5 bg-black/40">
                {items.map((it: any, idx: number) => {
                  const itPrice = Number(it.price || 0);
                  const itQty = Number(it.quantity || 1);
                  const itTotal = itPrice * itQty;

                  return (
                    <div key={idx} className="p-3 hover:bg-white/[0.02] space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-white text-xs block">{it.name}</span>
                          {it.dimensions && (
                            <span className="text-[10px] text-white/50 block font-mono">
                              Medidas: {it.dimensions}
                            </span>
                          )}
                          {it.observacao && (
                            <span className="text-[10px] text-amber-300/80 italic block">
                              Obs: {it.observacao}
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-white text-xs block">
                            R$ {itTotal.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-[10px] text-white/40 font-mono block">
                            {itQty} un x R$ {itPrice.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>

                      {/* Insumos consumidos por este item */}
                      {Array.isArray(it.materiasPrimasConsumidas) && it.materiasPrimasConsumidas.length > 0 && (
                        <div className="bg-primary-950/20 border border-primary-500/20 rounded-lg p-2 mt-1 space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-primary-300 block">
                            Insumos Descontados da Matéria-Prima:
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {it.materiasPrimasConsumidas.map((mpc: any, mpcIdx: number) => (
                              <span
                                key={mpcIdx}
                                className="inline-flex items-center gap-1 bg-black/40 border border-primary-500/30 px-2 py-0.5 rounded text-[10px] text-primary-200 font-mono"
                              >
                                <strong>{mpc.name}:</strong> {mpc.quantity} {mpc.unit || 'm'}
                                {mpc.totalCost ? ` (R$ ${Number(mpc.totalCost).toFixed(2)})` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Insumos Totais da Nota */}
            {notaInsumos.length > 0 && (
              <div className="bg-gradient-to-r from-primary-950/30 to-slate-900/60 border border-primary-500/30 rounded-2xl p-3 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary-300 flex items-center gap-1.5">
                  <Layers size={13} className="text-primary-400" />
                  <span>Total de Matéria-Prima Consumida nesta Nota</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {notaInsumos.map((ins, insIdx) => (
                    <div key={insIdx} className="bg-black/50 border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{ins.mpName}</span>
                      <span className="font-black font-mono text-cyan-300 text-xs">
                        {ins.quantity.toFixed(2)} {ins.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumo Financeiro */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[9px] text-white/40 uppercase font-black block">Total Geral</span>
                <strong className="text-sm font-mono text-white">R$ {total.toFixed(2).replace('.', ',')}</strong>
              </div>
              <div>
                <span className="text-[9px] text-white/40 uppercase font-black block">Valor Pago / Entrada</span>
                <strong className="text-sm font-mono text-emerald-400">R$ {downPayment.toFixed(2).replace('.', ',')}</strong>
              </div>
              <div>
                <span className="text-[9px] text-white/40 uppercase font-black block">Saldo Restante</span>
                <strong className={`text-sm font-mono ${balance > 0 ? 'text-amber-300' : 'text-white/40'}`}>
                  R$ {balance.toFixed(2).replace('.', ',')}
                </strong>
              </div>
              <div>
                <span className="text-[9px] text-white/40 uppercase font-black block">Forma de Pagamento</span>
                <strong className="text-xs uppercase font-bold text-white/80">
                  {order.payment_method || 'Não informado'}
                </strong>
              </div>
            </div>

            {order.observacoes && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-amber-200/90 text-[11px]">
                <strong>Observação:</strong> {order.observacoes}
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-white/10">
              <span className="text-[10px] text-white/40 font-mono">
                Registrada em {new Date(order.created_at).toLocaleDateString('pt-BR')}
              </span>
              <Button
                variant="secondary"
                onClick={() => setSelectedSaleOrder(null)}
                className="text-xs py-1.5 px-4"
              >
                Fechar Detalhes
              </Button>
            </div>
          </div>
        </Modal>
      );
    })()}

    {/* Modal de Reabastecimento / Compra de Bobina */}
    <ReabastecerMateriaPrimaModal
      isOpen={isReabastecerModalOpen}
      onClose={() => setIsReabastecerModalOpen(false)}
      materiaPrima={currentMp}
      materiasPrimas={materiasPrimas}
      onSuccess={async () => {
        await loadHistory();
        onStockUpdated();
      }}
      companyId={companyId}
    />
  </>
  );
};
