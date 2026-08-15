import React from 'react';
import { X, CalendarClock, ClipboardCopy, StickyNote, Layers } from 'lucide-react';
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

interface NotaDetalheModalProps {
  nota: NotaDetalhe | null;
  onClose: () => void;
  onCopyItem: (item: NotaDetalheItem, nota: NotaDetalhe) => void;
}

// Mostra os dados da nota (itens, valores, observação) pra quem recebeu o serviço decidir
// o que realmente fez. Cada item tem seu próprio botão "copiar" — o que não foi feito por
// esse colaborador simplesmente não é copiado. Ao copiar, abre o formulário de lançamento já
// preenchido (nome do cliente, serviço, preço), e o preço/descrição continuam editáveis antes
// de salvar na tabela dele.
export const NotaDetalheModal: React.FC<NotaDetalheModalProps> = ({ nota, onClose, onCopyItem }) => {
  if (!nota) return null;

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

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[var(--accent-red)] flex items-center gap-1.5 mb-2">
              <Layers className="w-3.5 h-3.5" /> Itens da Nota
            </p>
            {(nota.items || []).length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Sem itens registrados nesta nota.</p>
            ) : (
              <div className="space-y-2">
                {nota.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--text-main)] truncate">{item.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {item.quantity ?? 1}x {typeof item.price === 'number' ? formatCurrency(item.price) : '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => onCopyItem(item, nota)}
                      title="Copiar para minha tabela"
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-red text-white text-[11px] font-black uppercase tracking-wide hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    >
                      <ClipboardCopy className="w-3.5 h-3.5" /> Copiar
                    </button>
                  </div>
                ))}
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
            Copie apenas os itens que você realmente fez. Depois de copiar, você ainda pode ajustar o preço,
            a descrição ou qualquer outro dado antes de salvar na sua tabela.
          </p>
        </div>
      </div>
    </div>
  );
};
