import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BadgeDollarSign } from 'lucide-react';
import { cn } from './SharedUI';
import { formatarHoraNotificacao } from './NotificacaoPendenteBanner';
import { numeroDoPedido, tituloDoPagamento, type PagamentoRecebido } from '../lib/pagamentoRecebido';

// Sino de PAGAMENTOS RECEBIDOS POR LINK. Separado do sino de mensagens (NotificacoesPendentesBell) de propósito: aquele
// agrupa por conversa e alimenta o lembrete de 5 em 5 minutos; este mostra uma linha por pagamento confirmado, é um
// aviso único (nunca re-alarma) e fica no histórico mesmo depois de visualizado -- só sai do contador.
// Clicar num item abre a nota do pedido (cliente, total, entrada recebida, pagamentos e saldo) e marca como vista.

const LARGURA_PAINEL = 360;
const MARGEM_TELA = 12;

export const PagamentosRecebidosBell = ({
  itens,
  onAbrir,
  onMarcarTodasVistas,
}: {
  itens: PagamentoRecebido[];
  onAbrir: (p: PagamentoRecebido) => void;
  onMarcarTodasVistas: () => void;
}) => {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const naoVistas = itens.filter(i => !i.visualizadaEm).length;

  const calcularPosicao = useCallback(() => {
    const btn = botaoRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const largura = Math.min(LARGURA_PAINEL, window.innerWidth - MARGEM_TELA * 2);
    const left = Math.max(MARGEM_TELA, Math.min(r.right - largura, window.innerWidth - largura - MARGEM_TELA));
    const top = r.bottom + 8;
    setPos({ top, left, width: largura, maxHeight: Math.max(160, window.innerHeight - top - MARGEM_TELA) });
  }, []);

  useLayoutEffect(() => { if (aberto) calcularPosicao(); }, [aberto, calcularPosicao]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('resize', calcularPosicao);
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('resize', calcularPosicao);
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto, calcularPosicao]);

  if (itens.length === 0) return null;

  return (
    <div className="relative">
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        title={naoVistas > 0 ? `${naoVistas} pagamento${naoVistas > 1 ? 's' : ''} recebido${naoVistas > 1 ? 's' : ''} por link` : 'Pagamentos recebidos por link'}
        className="relative p-3 text-white/70 hover:bg-white/10 rounded-xl transition-colors cursor-pointer border-0 bg-transparent"
      >
        <BadgeDollarSign size={20} className={naoVistas > 0 ? 'text-emerald-300' : undefined} />
        {naoVistas > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-slate-900 text-[10px] font-black flex items-center justify-center">
            {naoVistas > 99 ? '99+' : naoVistas}
          </span>
        )}
      </button>

      {aberto && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[310]" onClick={() => setAberto(false)} />
          <div
            role="dialog"
            aria-label="Pagamentos recebidos"
            style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
            className="fixed z-[311] flex flex-col overflow-hidden bg-[#1a2333]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md"
          >
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-white">Pagamentos recebidos</p>
                <p className="text-[10px] text-white/40">Clique para abrir a nota do pedido.</p>
              </div>
              {naoVistas > 0 && (
                <button
                  type="button"
                  onClick={onMarcarTodasVistas}
                  className="shrink-0 text-[10px] font-bold text-emerald-300/90 hover:text-emerald-200 hover:underline px-1.5 py-0.5 rounded cursor-pointer bg-transparent border-0"
                  title="Tira todos do contador (continuam no histórico)"
                >
                  Marcar todas como vistas
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar divide-y divide-white/5">
              {itens.map(p => {
                const vista = !!p.visualizadaEm;
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setAberto(false); onAbrir(p); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setAberto(false); onAbrir(p); } }}
                    className="w-full flex items-start gap-2.5 px-3.5 py-3 hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center shrink-0 border',
                      vista ? 'bg-white/5 text-white/40 border-white/10' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    )}>
                      <BadgeDollarSign size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('min-w-0 text-xs font-black break-words group-hover:text-primary-300 transition-colors', vista ? 'text-white/60' : 'text-white')}>
                          {tituloDoPagamento(p)}
                        </p>
                        <span className="text-[10px] text-white/40 shrink-0 tabular-nums">{formatarHoraNotificacao(p.criadoEm)}</span>
                      </div>
                      <p className="text-[11px] text-white/60 truncate mt-0.5">Cliente: {p.clienteNome}</p>
                      <p className="text-[11px] text-white/60 mt-0.5">Pedido: {numeroDoPedido(p.saleId)}</p>
                    </div>
                    {!vista && <span className="mt-1 w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-label="Não visualizada" />}
                  </div>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
