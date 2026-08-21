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
  // Valor de desconto dado na nota (vendas.discount_value) — quando presente, o preço
  // "bruto" de cada item (price * quantity) é abatido proporcionalmente antes de pré-preencher
  // o valor sugerido pro colaborador, pra comissão já sair calculada sobre o valor líquido.
  discount_value?: number | null;
  scheduled_for: string | null;
  items: NotaDetalheItem[];
  observacoes?: string | null;
}

// Item selecionado pra virar lançamento em Comissões — já com o valor final
// (produção) que o colaborador confirmou/editou antes de adicionar.
export interface NotaSelecionadoItem {
  idx: number; // índice do item dentro de nota.items — usado pra travar duplicação
  name: string;
  quantity: number;
  value: number;
}

interface NotaDetalheModalProps {
  nota: NotaDetalhe | null;
  onClose: () => void;
  // Chamado uma única vez, com todos os itens marcados (1 ou mais), já com o
  // valor revisado/editado pelo colaborador, e a data escolhida pra lançar o serviço.
  onAddItems: (items: NotaSelecionadoItem[], nota: NotaDetalhe, data: string) => void;
  // Índices (dentro de nota.items) que já viraram serviço de Comissões antes — travados
  // (não podem ser marcados/adicionados de novo) e mostrados com o check verde.
  itensJaAdicionados?: Set<number>;
}

// Formata uma data (ISO completo ou já YYYY-MM-DD) pro formato aceito pelo <input type="date">.
const toDateInputValue = (raw: string | null | undefined): string => {
  if (!raw) return new Date().toISOString().split('T')[0];
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
};

// Mostra os dados da nota (itens, valores, observação) pra quem recebeu o serviço decidir
// o que realmente fez. Quando a nota tem mais de um item, o colaborador vai marcando quais
// são dele; o valor de cada item já sai editável antes de confirmar — não precisa ser
// exatamente o preço da nota (ex: só uma parte do serviço foi feita por ele). A data do
// lançamento também é editável (vem pré-preenchida com a entrega, se houver, ou hoje).
// Um único botão "Adicionar" no rodapé finaliza tudo de uma vez.
export const NotaDetalheModal: React.FC<NotaDetalheModalProps> = ({ nota, onClose, onAddItems, itensJaAdicionados }) => {
  const items = nota?.items || [];
  const jaAdicionados = itensJaAdicionados || new Set<number>();
  // "Item único" só conta pra auto-marcar/travar seleção se esse item ainda não foi adicionado
  // — senão o único item da nota fica marcado sozinho mesmo já estando travado (verde).
  const itensRestantes = items.filter((_, idx) => !jaAdicionados.has(idx));
  const singleItem = itensRestantes.length === 1 && items.length === 1;

  // Se só tem 1 item na nota (e ele ainda não foi adicionado), já vem marcado (não faz
  // sentido pedir pra selecionar). Com mais de 1, o colaborador escolhe (pode marcar quantos
  // quiser, inclusive todos) — itens já adicionados nunca entram na seleção.
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [values, setValues] = useState<Record<number, string>>({});
  const [dataServico, setDataServico] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Fator de desconto da nota: se teve desconto, cada item perde a mesma fração
  // proporcional ao seu peso no total bruto (soma de price*quantity de todos os itens).
  // Ex.: nota de R$200 com R$20 de desconto (10%) -> cada item some 10% do seu valor bruto
  // antes de virar o valor sugerido pro colaborador — assim a comissão já sai sobre o líquido.
  const fatorDesconto = useMemo(() => {
    const desconto = nota?.discount_value ?? 0;
    if (!desconto || desconto <= 0) return 1;
    const brutoTotal = items.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0);
    if (brutoTotal <= 0) return 1;
    const fator = (brutoTotal - desconto) / brutoTotal;
    return fator > 0 ? fator : 0;
  }, [nota?.id, nota?.discount_value, items]);

  useEffect(() => {
    if (!nota) return;
    const initialSelected: Record<number, boolean> = {};
    const initialValues: Record<number, string> = {};
    (nota.items || []).forEach((item, idx) => {
      initialSelected[idx] = singleItem && idx === 0;
      const bruto = (item.price ?? 0) * (item.quantity ?? 1);
      const liquido = bruto * fatorDesconto;
      initialValues[idx] = liquido ? liquido.toFixed(2).replace('.', ',') : '';
    });
    setSelected(initialSelected);
    setValues(initialValues);
    setDataServico(toDateInputValue(nota.scheduled_for));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nota?.id, fatorDesconto]);

  const selectedCount = useMemo(
    () => Object.entries(selected).filter(([idx, v]) => v && !jaAdicionados.has(Number(idx))).length,
    [selected, jaAdicionados]
  );

  if (!nota) return null;

  const parseValor = (raw: string): number => {
    const n = Number((raw || '0').replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const toggleSelected = (idx: number) => {
    if (jaAdicionados.has(idx)) return; // já adicionado — travado
    if (singleItem) return; // item único sempre fica marcado
    setSelected((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleAdicionar = () => {
    const escolhidos: NotaSelecionadoItem[] = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ idx }) => selected[idx] && !jaAdicionados.has(idx))
      .map(({ item, idx }) => ({
        idx,
        name: item.name,
        quantity: item.quantity ?? 1,
        value: parseValor(values[idx] ?? ''),
      }));
    if (escolhidos.length === 0) return;
    onAddItems(escolhidos, nota, dataServico);
  };

  // Adiciona de uma vez TODOS os itens que ainda não foram puxados dessa nota — sem precisar
  // marcar um por um. Itens já adicionados antes (verde) são ignorados automaticamente.
  const handleAdicionarTudo = () => {
    const escolhidos: NotaSelecionadoItem[] = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ idx }) => !jaAdicionados.has(idx))
      .map(({ item, idx }) => ({
        idx,
        name: item.name,
        quantity: item.quantity ?? 1,
        value: parseValor(values[idx] ?? ''),
      }));
    if (escolhidos.length === 0) return;
    onAddItems(escolhidos, nota, dataServico);
  };

  const notaTotalmenteAdicionada = items.length > 0 && jaAdicionados.size === items.length;

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
              {nota.scheduled_for
                ? `Entrega: ${new Date(nota.scheduled_for).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                : 'Sem agendamento'}
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
                <span className="text-[10px] font-bold text-[var(--text-muted)]">{selectedCount} de {itensRestantes.length} selecionado{itensRestantes.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Sem itens registrados nesta nota.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const isSelected = !!selected[idx];
                  const isAdicionado = jaAdicionados.has(idx);
                  if (isAdicionado) {
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 border rounded-xl px-3 py-2.5 bg-emerald-500/10 border-emerald-500/40"
                      >
                        <div className="shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[var(--text-main)] truncate">{item.name}</p>
                          <p className="text-[11px] text-emerald-400 font-bold">Já adicionado</p>
                        </div>
                      </div>
                    );
                  }
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

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[var(--accent-red)] flex items-center gap-1.5 mb-2">
              <CalendarClock className="w-3.5 h-3.5" /> Data do Serviço
            </p>
            <input
              type="date"
              value={dataServico}
              onChange={(e) => setDataServico(e.target.value)}
              className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm font-bold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
            <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Total da Nota</span>
            <span className="text-base font-black text-[var(--text-main)]">{formatCurrency(nota.total)}</span>
          </div>

          {!!nota.discount_value && nota.discount_value > 0 && (
            <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3 py-2.5">
              <span className="text-[11px] text-emerald-400 font-bold shrink-0">DESCONTO</span>
              <p className="text-xs text-[var(--text-muted)]">
                Essa nota teve {formatCurrency(nota.discount_value)} de desconto — os valores acima já saem ajustados proporcionalmente, então a comissão é calculada sobre o valor líquido, não sobre o preço cheio.
              </p>
            </div>
          )}

          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
            {singleItem
              ? 'O valor já vem preenchido com o preço da nota — ajuste se fez só uma parte do serviço.'
              : 'Marque só os itens que você realmente fez e confira o valor de cada um antes de adicionar.'}
          </p>
        </div>

        <div className="p-4 sm:p-5 pt-3 border-t border-[var(--border-color)] bg-[var(--bg-card-sec)]/50 shrink-0 space-y-2">
          {notaTotalmenteAdicionada ? (
            <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-sm font-black uppercase tracking-wide">
              <Check className="w-4 h-4 stroke-[3]" />
              Nota Adicionada
            </div>
          ) : (
            <>
              <button
                onClick={handleAdicionar}
                disabled={selectedCount === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-red text-white text-sm font-black uppercase tracking-wide hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <ClipboardCheck className="w-4 h-4" />
                {selectedCount > 1 ? `Adicionar ${selectedCount} Serviços` : 'Adicionar Serviço'}
              </button>
              {!singleItem && itensRestantes.length > 1 && (
                <button
                  onClick={handleAdicionarTudo}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-transparent border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase tracking-wide hover:bg-emerald-500/10 active:scale-95 transition-all cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Adicionar Toda a Nota ({itensRestantes.length})
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
