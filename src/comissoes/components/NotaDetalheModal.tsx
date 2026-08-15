import React, { useEffect, useMemo, useState } from 'react';
import { X, CalendarClock, ClipboardCheck, StickyNote, Layers, Check } from 'lucide-react';
import { formatCurrency } from '../utils/storage';

export interface NotaDetalheItem {
  name: string;
  quantity?: number;
  price?: number;
}

export interface NotaDetalhe {
  id: string;
  customer_name: string;
  total: number;
  scheduled_for: string;
  items: NotaDetalheItem[];
  observacoes?: string | null;
}

// Item selecionado pra virar lançamento em Comissões — já com o valor final
// (produção) que o colaborador confirmou/editou antes de adicionar.
export interface NotaSelecionadoItem {
  name: string;
  quantity: number;
  value: number;
}

interface NotaDetalheModalProps {
  nota: NotaDetalhe | null;
  onClose: () => void;
  // Chamado uma única vez, com todos os itens marcados (1 ou mais), já com o
  // valor revisado/editado pelo colaborador.
  onAddItems: (items: NotaSelecionadoItem[], nota: NotaDetalhe) => void;
}

// Mostra os dados da nota (itens, valores, observação) pra quem recebeu o serviço decidir
// o que realmente fez. Quando a nota tem mais de um item, o colaborador vai marcando quais
// são dele; o valor de cada item já sai editável antes de confirmar — não precisa ser
// exatamente o preço da nota (ex: só uma parte do serviço foi feita por ele). Um único botão
// "Adicionar" no rodapé finaliza tudo de uma vez.
export const NotaDetalheModal: React.FC<NotaDetalheModalProps> = ({ nota, onClose, onAddItems }) => {
  const items = nota?.items || [];
  const singleItem = items.length === 1;

  // Se só tem 1 item na nota, já vem marcado (não faz sentido pedir pra selecionar).
  // Com mais de 1, o colaborador escolhe.
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [values, setValues] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!nota) return;
    const initialSelected: Record<number, boolean> = {};
    const initialValues: Record<number, string> = {};
    (nota.items || []).forEach((item, idx) => {
      initialSelected[idx] = (nota.items || []).length === 1;
      const total = (item.price ?? 0) * (item.quantity ?? 1);
      initialValues[idx] = total ? total.toFixed(2).replace('.', ',') : '';
    });
    setSelected(initialSelected);
    setValues(initialValues);
  }, [nota?.id]);

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  if (!nota) return null;

  const parseValor = (raw: string): number => {
    const n = Number((raw || '0').replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const toggleSelected = (idx: number) => {
    if (singleItem) return; // item único sempre fica marcado
    setSelected((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleAdicionar = () => {
    const escolhidos: NotaSelecionadoItem[] = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ idx }) => selected[idx])
      .map(({ item, idx }) => ({
        name: item.name,
        quantity: item.quantity ?? 1,
        value: parseValor(values[idx] ?? ''),
      }));
    if (escolhidos.length === 0) return;
    onAddItems(escolhidos, nota);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div
        className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-gradient-to-r from-red-950/40 to-transparent shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-[var(--text-main)] truncate">
              {(nota.customer_name || 'Cliente de Balcão').toUpperCase()}
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-1.5 mt-0.5">
              <CalendarClock className="w-3.5 h-3.5" />
              Entrega: {new Date(nota.scheduled_for).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card-sec)] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black uppercase tracking-wider text-[var(--accent-red)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Itens da Nota
              </p>
              {!singleItem && items.length > 0 && (
                <span className="text-[10px] font-bold text-[var(--text-muted)]">{selectedCount} de {items.length} selecionado{items.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Sem itens registrados nesta nota.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const isSelected = !!selected[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelected(idx)}
                      className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 transition-colors ${
                        singleItem ? '' : 'cursor-pointer'
                      } ${isSelected ? 'bg-[var(--accent-red)]/10 border-[var(--accent-red)]/50' : 'bg-[var(--bg-card-sec)] border-[var(--border-color)]'}`}
                    >
                      {!singleItem && (
                        <div
                          className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-[var(--accent-red)] border-[var(--accent-red)]' : 'border-[var(--border-color)]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[var(--text-main)] truncate">{item.name}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{item.quantity ?? 1}x na nota</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[11px] text-[var(--text-muted)] font-bold">R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={values[idx] ?? ''}
                          onChange={(e) => setValues((prev) => ({ ...prev, [idx]: e.target.value }))}
                          onFocus={(e) => e.target.select()}
                          placeholder="0,00"
                          className="w-20 h-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2 text-xs text-right font-bold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {nota.observacoes && (
            <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2.5">
              <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text-muted)]">{nota.observacoes}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
            <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Total da Nota</span>
            <span className="text-base font-black text-[var(--text-main)]">{formatCurrency(nota.total)}</span>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
            {singleItem
              ? 'O valor já vem preenchido com o preço da nota — ajuste se fez só uma parte do serviço.'
              : 'Marque só os itens que você realmente fez e confira o valor de cada um antes de adicionar.'}
          </p>
        </div>

        <div className="p-4 sm:p-5 pt-3 border-t border-[var(--border-color)] bg-[var(--bg-card-sec)]/50 shrink-0">
          <button
            onClick={handleAdicionar}
            disabled={selectedCount === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-red text-white text-sm font-black uppercase tracking-wide hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <ClipboardCheck className="w-4 h-4" />
            {selectedCount > 1 ? `Adicionar ${selectedCount} Serviços` : 'Adicionar Serviço'}
          </button>
        </div>
      </div>
    </div>
  );
};
