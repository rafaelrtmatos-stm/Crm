import React, { useState, useEffect, useMemo } from 'react';
import {
  History, Clock, Plus, ArrowDownRight, ArrowUpRight, AlertTriangle,
  FileText, Calendar, Filter, X, Check, Search, Layers, RefreshCw
} from 'lucide-react';
import { MateriaPrima } from '../types';
import {
  MateriaPrimaConsumptionRecord,
  fetchConsumptionHistory,
  recordMateriaPrimaConsumption,
  quickAdjustStock
} from '../lib/materiasPrimasStorage';
import { Button, Modal } from './SharedUI';
import { showAlert } from '../lib/notify';

interface MateriaPrimaHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMateriaPrima?: MateriaPrima | null;
  materiasPrimas: MateriaPrima[];
  onStockUpdated: () => void;
  companyId?: string;
}

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
  
  // Novo lançamento manual
  const [showAddForm, setShowAddForm] = useState(false);
  const [targetMpId, setTargetMpId] = useState<string>(selectedMateriaPrima?.id || materiasPrimas[0]?.id || '');
  const [tipoOperacao, setTipoOperacao] = useState<'entrada' | 'ajuste_manual' | 'perda'>('entrada');
  const [quantidade, setQuantidade] = useState<number | ''>('');
  const [unidadeModo, setUnidadeModo] = useState<'metros' | 'bobinas'>('metros');
  const [observacao, setObservacao] = useState('');
  const [savingManual, setSavingManual] = useState(false);

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

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        item.materiaPrimaName.toLowerCase().includes(term) ||
        (item.observacao && item.observacao.toLowerCase().includes(term)) ||
        (item.customerName && item.customerName.toLowerCase().includes(term)) ||
        (item.orderId && item.orderId.toLowerCase().includes(term))
      );
    });
  }, [history, searchTerm]);

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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <ArrowDownRight size={12} className="text-cyan-400" />
            Consumo Produção
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Histórico de Consumo & Movimentações de Estoque"
      size="xl"
    >
      <div className="space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
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

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Filtrar notas/pedidos..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 outline-none"
              />
            </div>

            <Button
              variant="secondary"
              onClick={loadHistory}
              title="Recarregar"
              className="p-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>

            <Button
              variant="primary"
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs py-1.5 px-3 bg-primary-500 hover:bg-primary-400 text-slate-950 font-black rounded-xl"
            >
              <Plus size={14} />
              <span>{showAddForm ? 'Fechar Lançamento' : '+ Lançamento Manual'}</span>
            </Button>
          </div>
        </div>

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
                          {item.orderId && (
                            <span className="text-[10px] text-white/40 font-mono">
                              Pedido: {item.orderId.slice(0, 8)}
                            </span>
                          )}
                          {item.customerName && (
                            <span className="text-[10px] text-primary-300">
                              Cliente: {item.customerName}
                            </span>
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
  );
};
