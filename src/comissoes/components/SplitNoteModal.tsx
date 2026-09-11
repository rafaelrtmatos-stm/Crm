import React, { useState, useEffect, useMemo } from 'react';
import { X, Percent, Check, AlertCircle, Sparkles, Layers2, ArrowRight } from 'lucide-react';
import { ServiceItem } from '../types';
import { formatCurrency } from '../utils/storage';
import { splitAllServicesInNote, getServiceBaseProductionValue } from '../utils/splitServiceHelper';

export interface NoteGroupData {
  key: string;
  items: ServiceItem[];
  noteId?: string;
  client: string;
  total: number;
  commission: number;
}

interface SplitNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteGroup: NoteGroupData | null;
  onConfirmSplit: (updatedServices: ServiceItem[]) => Promise<void> | void;
}

export const SplitNoteModal: React.FC<SplitNoteModalProps> = ({
  isOpen,
  onClose,
  noteGroup,
  onConfirmSplit,
}) => {
  const [splitOption, setSplitOption] = useState<100 | 50 | 33 | 25 | 'custom'>(50);
  const [customPercent, setCustomPercent] = useState<number>(50);
  const [saving, setSaving] = useState(false);

  // Inicializa o splitOption baseado no que já está aplicado nos serviços da nota
  useEffect(() => {
    if (!noteGroup || !noteGroup.items.length) return;
    const firstItem = noteGroup.items[0];
    const text = `${firstItem.serviceType} ${firstItem.notes || ''}`.toLowerCase();
    
    if (text.includes('50%')) {
      setSplitOption(50);
      setCustomPercent(50);
    } else if (text.includes('33%')) {
      setSplitOption(33);
      setCustomPercent(33.33);
    } else if (text.includes('25%')) {
      setSplitOption(25);
      setCustomPercent(25);
    } else {
      const base = getServiceBaseProductionValue(firstItem);
      if (base > firstItem.productionValue) {
        const ratio = Math.round((firstItem.productionValue / base) * 100);
        if (ratio === 50) setSplitOption(50);
        else if (ratio >= 32 && ratio <= 34) setSplitOption(33);
        else if (ratio === 25) setSplitOption(25);
        else {
          setSplitOption('custom');
          setCustomPercent(ratio);
        }
      } else {
        setSplitOption(50); // sugestão padrão inicial é 50%
        setCustomPercent(50);
      }
    }
  }, [noteGroup, isOpen]);

  // Itens recalculados com a opção selecionada
  const updatedItems = useMemo(() => {
    if (!noteGroup || !noteGroup.items.length) return [];
    const effectivePct = splitOption === 'custom' ? customPercent : splitOption;
    return splitAllServicesInNote(noteGroup.items, effectivePct);
  }, [noteGroup, splitOption, customPercent]);

  // Totais antes e depois
  const originalTotalProd = useMemo(() => {
    if (!noteGroup) return 0;
    return noteGroup.items.reduce((acc, item) => acc + getServiceBaseProductionValue(item), 0);
  }, [noteGroup]);

  const newTotalProd = useMemo(() => {
    return updatedItems.reduce((acc, item) => acc + item.productionValue, 0);
  }, [updatedItems]);

  const newTotalComm = useMemo(() => {
    return updatedItems.reduce((acc, item) => acc + item.commissionValue, 0);
  }, [updatedItems]);

  if (!isOpen || !noteGroup) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onConfirmSplit(updatedItems);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar divisão da nota:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-gradient-to-r from-amber-950/40 via-[var(--bg-card)] to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Layers2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider text-[var(--text-main)] flex items-center gap-2">
                Dividir Nota Inteira
                {noteGroup.noteId && (
                  <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                    #{noteGroup.noteId.slice(-6).toUpperCase()}
                  </span>
                )}
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-medium">
                Cliente: <strong className="text-[var(--text-main)]">{noteGroup.client}</strong> · {noteGroup.items.length} {noteGroup.items.length === 1 ? 'serviço' : 'serviços'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card-sec)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Seletor de Divisão */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider block">
              Selecione a Porcentagem da Sua Parte:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSplitOption(50)}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  splitOption === 50
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg ring-2 ring-amber-400/50'
                    : 'bg-[var(--bg-card-sec)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-amber-500/40'
                }`}
              >
                <span className="text-base font-black">50%</span>
                <span className="text-[10px] font-bold uppercase opacity-90">Meio a Meio (2 pessoas)</span>
              </button>

              <button
                type="button"
                onClick={() => setSplitOption(33)}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  splitOption === 33
                    ? 'bg-blue-500 text-white border-blue-400 font-black shadow-lg ring-2 ring-blue-400/50'
                    : 'bg-[var(--bg-card-sec)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-blue-500/40'
                }`}
              >
                <span className="text-base font-black">33,3%</span>
                <span className="text-[10px] font-bold uppercase opacity-90">1/3 (3 pessoas)</span>
              </button>

              <button
                type="button"
                onClick={() => setSplitOption(25)}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  splitOption === 25
                    ? 'bg-purple-500 text-white border-purple-400 font-black shadow-lg ring-2 ring-purple-400/50'
                    : 'bg-[var(--bg-card-sec)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-purple-500/40'
                }`}
              >
                <span className="text-base font-black">25%</span>
                <span className="text-[10px] font-bold uppercase opacity-90">1/4 (4 pessoas)</span>
              </button>

              <button
                type="button"
                onClick={() => setSplitOption(100)}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  splitOption === 100
                    ? 'bg-emerald-600 text-white border-emerald-400 font-black shadow-lg ring-2 ring-emerald-400/50'
                    : 'bg-[var(--bg-card-sec)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-emerald-500/40'
                }`}
              >
                <span className="text-base font-black">100%</span>
                <span className="text-[10px] font-bold uppercase opacity-90">Integral (1 pessoa)</span>
              </button>
            </div>

            {/* Opção personalizada se desejar */}
            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSplitOption('custom')}
                className={`text-xs font-bold underline transition-colors cursor-pointer ${
                  splitOption === 'custom' ? 'text-amber-400' : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Outra porcentagem personalizada...
              </button>

              {splitOption === 'custom' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--text-muted)]">Sua %:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={customPercent}
                    onChange={(e) => setCustomPercent(Math.max(1, Math.min(100, Number(e.target.value) || 0)))}
                    className="w-20 px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-center text-xs font-black text-[var(--text-main)]"
                  />
                  <span className="text-xs font-bold text-amber-400">%</span>
                </div>
              )}
            </div>
          </div>

          {/* Resumo comparativo de Produção e Comissão */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                Produção da Nota (Total Original vs Nova Parte)
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono line-through text-[var(--text-muted)]">
                  {formatCurrency(originalTotalProd)}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-base font-mono font-black text-amber-400">
                  {formatCurrency(newTotalProd)}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                Comissão a Receber
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-base font-mono font-black text-[var(--accent-red)]">
                  {formatCurrency(newTotalComm)}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  (calculada sobre {splitOption === 100 ? '100%' : splitOption === 50 ? '50%' : splitOption === 33 ? '33,3%' : splitOption === 25 ? '25%' : `${customPercent}%`})
                </span>
              </div>
            </div>
          </div>

          {/* Tabela detalhada de serviços que serão atualizados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider">
                Serviços da Nota ({updatedItems.length}):
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-medium">
                Todos serão atualizados juntos
              </span>
            </div>

            <div className="overflow-x-auto border border-[var(--border-color)] rounded-xl">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="bg-[var(--bg-card-sec)] text-[var(--text-muted)] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-2.5 whitespace-nowrap">Serviço</th>
                    <th className="p-2.5 text-right whitespace-nowrap">Original (100%)</th>
                    <th className="p-2.5 text-right whitespace-nowrap text-amber-400">Sua Parte</th>
                    <th className="p-2.5 text-center whitespace-nowrap">% Com.</th>
                    <th className="p-2.5 text-right whitespace-nowrap text-[var(--accent-red)]">Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)] font-medium">
                  {updatedItems.map((item) => {
                    const originalVal = getServiceBaseProductionValue(item);
                    return (
                      <tr key={item.id} className="hover:bg-[var(--bg-card-sec)]/50">
                        <td className="p-2.5 font-bold text-[var(--text-main)]">
                          <span className="block truncate max-w-[200px]" title={item.serviceType}>
                            {item.serviceType}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono text-[var(--text-muted)] whitespace-nowrap">
                          {formatCurrency(originalVal)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                          {formatCurrency(item.productionValue)}
                        </td>
                        <td className="p-2.5 text-center font-mono text-[11px] whitespace-nowrap">
                          {item.commissionPercent}%
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-[var(--accent-red)] whitespace-nowrap">
                          {formatCurrency(item.commissionValue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card-sec)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Salvando divisão...
              </span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirmar Divisão da Nota Inteira
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
