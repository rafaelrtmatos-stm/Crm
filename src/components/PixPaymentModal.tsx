import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clipboard, Copy, DollarSign, KeyRound, Landmark, User, X } from 'lucide-react';
import { PixQrImage } from './PixQrImage';
import { showAlert } from '../lib/notify';
import { cancelarPixPendente, consultarPixPago, INTERVALO_CONSULTA_PIX_MS, registrarPixPendente } from '../lib/pixPendentes';

// Card "Pagamento via PIX": QR Code à esquerda, dados (valor, beneficiário, banco, chave) à direita,
// botões "Copiar chave" / "Copia e cola" e "Fechar". Usado no PDV e na tela de Vendas.

/** Logo do PIX: quatro losangos arredondados em cruz. */
const PixLogo = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" className="shrink-0">
    {[[24, 12], [36, 24], [24, 36], [12, 24]].map(([cx, cy], i) => (
      <rect
        key={i}
        x={cx - 7.75}
        y={cy - 7.75}
        width="15.5"
        height="15.5"
        rx="3.6"
        transform={`rotate(45 ${cx} ${cy})`}
        fill="#2de3a0"
      />
    ))}
  </svg>
);

type Row = { icon: React.ReactNode; label: string; value: React.ReactNode; destaque?: boolean; mono?: boolean; verde?: boolean };

export interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Código "copia e cola" (payload BR Code) — também é o conteúdo do QR Code */
  payload: string;
  /** Chave PIX cadastrada */
  pixKey: string;
  amount: number;
  beneficiaryName: string;
  bank?: string;
  /** Ação extra no rodapé (ex: "Confirmar Pagamento" no PDV). Sem isso, só o "Fechar" centralizado. */
  confirmLabel?: React.ReactNode;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  /**
   * Ação executada SÓ quando o PIX é detectado automaticamente (depois do aviso "PIX confirmado ✓").
   * Se ausente, usa o onConfirm. O pai deve fazer o mesmo que o clique manual de quitar/finalizar
   * (som, tela de venda finalizada) — o card fecha logo depois.
   */
  onAutoPaid?: (valorPago: number) => void;
  /**
   * Confirmação automática por e-mail do Nubank. Enquanto o card estiver aberto, registra uma pendência
   * e consulta o servidor a cada ~8 s; ao detectar o pagamento, aciona o onConfirm e fecha o card.
   * Sem isso, o card funciona só com a baixa manual. `saleId` é nulo quando a venda ainda não existe (PDV).
   */
  autoConfirm?: { companyId: string; saleId?: string | null };
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  isOpen, onClose, payload, pixKey, amount, beneficiaryName, bank, confirmLabel, onConfirm, confirmDisabled, onAutoPaid, autoConfirm,
}) => {
  const [copiado, setCopiado] = useState<'key' | 'payload' | null>(null);
  const [autoStatus, setAutoStatus] = useState<'off' | 'aguardando' | 'expirado'>('off');

  // Sempre a versão mais recente dos callbacks, sem reiniciar a consulta a cada render do pai.
  const onConfirmRef = useRef(onConfirm);
  const onCloseRef = useRef(onClose);
  const confirmDisabledRef = useRef(confirmDisabled);
  const onAutoPaidRef = useRef(onAutoPaid);
  const amountRef = useRef(amount);
  amountRef.current = amount;
  onConfirmRef.current = onConfirm;
  onCloseRef.current = onClose;
  confirmDisabledRef.current = confirmDisabled;
  onAutoPaidRef.current = onAutoPaid;

  // PIX detectado: mostra "PIX confirmado ✓" por um instante e só então finaliza (uma única vez).
  const [pagoAuto, setPagoAuto] = useState(false);
  const pagoAutoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const concluidoRef = useRef(false);
  const TEMPO_CONFIRMADO_MS = 1800;

  const limparTimerPago = () => {
    if (pagoAutoTimerRef.current) { clearTimeout(pagoAutoTimerRef.current); pagoAutoTimerRef.current = null; }
  };

  const concluirPagamentoAuto = () => {
    if (concluidoRef.current) return; // já finalizado (timer, Fechar ou botão manual): nunca duplica
    concluidoRef.current = true;
    limparTimerPago();
    const auto = onAutoPaidRef.current;
    const manual = onConfirmRef.current;
    if (auto || manual) {
      if (!confirmDisabledRef.current) { if (auto) auto(amountRef.current); else manual?.(); } // mesma ação do botão manual (ex.: handleFinalizeSale)
    } else {
      showAlert('PIX recebido: pagamento confirmado automaticamente.');
    }
    onCloseRef.current();
  };
  const concluirPagamentoAutoRef = useRef(concluirPagamentoAuto);
  concluirPagamentoAutoRef.current = concluirPagamentoAuto;

  // Botão manual "Confirmar pagamento": se o aviso automático estiver em andamento, cancela o timer
  // e marca como concluído pra não finalizar a venda duas vezes.
  const confirmarManual = () => {
    if (pagoAuto) {
      if (concluidoRef.current) return;
      concluidoRef.current = true;
      limparTimerPago();
    }
    onConfirm?.();
  };

  // Fechar durante o aviso de PIX confirmado não perde o pagamento: finaliza e fecha.
  const fechar = () => {
    if (pagoAuto && !concluidoRef.current) concluirPagamentoAuto();
    else onClose();
  };
  const fecharRef = useRef(fechar);
  fecharRef.current = fechar;

  useEffect(() => {
    if (!isOpen) { limparTimerPago(); setPagoAuto(false); concluidoRef.current = false; }
  }, [isOpen]);
  useEffect(() => () => limparTimerPago(), []);

  const autoCompanyId = autoConfirm?.companyId;
  const autoSaleId = autoConfirm?.saleId ?? null;
  const valorCentavos = Math.round(amount * 100);

  useEffect(() => {
    if (!isOpen || !autoCompanyId || !(valorCentavos > 0)) return;
    let ativo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pendenciaId: string | null = null;
    setAutoStatus('aguardando');

    const aoPagar = () => {
      setPagoAuto(true);
      limparTimerPago();
      pagoAutoTimerRef.current = setTimeout(() => concluirPagamentoAutoRef.current(), TEMPO_CONFIRMADO_MS);
    };

    (async () => {
      const pend = await registrarPixPendente({ companyId: autoCompanyId, saleId: autoSaleId, valorCentavos });
      if (!pend) { if (ativo) setAutoStatus('off'); return; } // sem pendência -> só o fluxo manual
      if (!ativo) { cancelarPixPendente(pend.id); return; }
      pendenciaId = pend.id;
      const expiraEm = new Date(pend.expiraEm).getTime();

      const consultar = async () => {
        if (!ativo) return;
        if (Date.now() >= expiraEm) { setAutoStatus('expirado'); return; } // para de consultar
        const pago = await consultarPixPago(pend.id);
        if (!ativo) return;
        if (pago) { ativo = false; pendenciaId = null; aoPagar(); return; }
        timer = setTimeout(consultar, INTERVALO_CONSULTA_PIX_MS);
      };
      timer = setTimeout(consultar, INTERVALO_CONSULTA_PIX_MS);
    })();

    return () => {
      ativo = false;
      if (timer) clearTimeout(timer);
      if (pendenciaId) cancelarPixPendente(pendenciaId); // fechou sem pagar: libera a pendência
      setAutoStatus('off');
    };
  }, [isOpen, autoCompanyId, autoSaleId, valorCentavos]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const copiar = async (valor: string, tipo: 'key' | 'payload') => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(tipo);
      setTimeout(() => setCopiado(null), 1600);
    } catch {
      showAlert('Não foi possível copiar. Copie manualmente.');
    }
  };

  const linhas: Row[] = [
    { icon: <DollarSign size={18} strokeWidth={2.6} />, label: 'Valor', value: `R$ ${amount.toFixed(2).replace('.', ',')}`, destaque: true, verde: true },
    { icon: <User size={17} />, label: 'Beneficiário', value: beneficiaryName },
    ...(bank ? [{ icon: <Landmark size={17} />, label: 'Banco', value: bank } as Row] : []),
    { icon: <KeyRound size={17} />, label: 'Chave', value: pixKey, mono: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md" onClick={fechar} />

      <div
        role="dialog"
        aria-label="Pagamento via PIX"
        className="relative w-fit max-w-full my-auto rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e1a2d] to-[#0a1424] shadow-2xl p-4 sm:p-5 animate-in zoom-in-95 fade-in duration-200"
      >
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar"
          className="absolute top-2.5 right-3 p-1 text-white/50 hover:text-white transition-colors cursor-pointer bg-transparent border-0"
        >
          <X size={22} strokeWidth={1.6} />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-[auto_1px_auto] gap-4 sm:gap-5">
          {/* Esquerda: título + QR Code */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2.5">
              <PixLogo />
              <div className="leading-tight">
                <h2 className="whitespace-nowrap text-[17px] sm:text-[19px] font-black uppercase tracking-tight text-white">
                  Pagamento via <span className="text-[#2de3a0]">PIX</span>
                </h2>
                <p className={'text-xs font-medium ' + (pagoAuto ? 'text-[#2de3a0]' : 'text-slate-400')}>
                  {pagoAuto ? 'Pagamento recebido!' : 'Escaneie o QR Code para pagar'}
                </p>
              </div>
            </div>
            <div className="rounded-3xl bg-white/[0.04] p-4 sm:p-5 shadow-[0_0_40px_rgba(45,227,160,0.06)]">
              {pagoAuto ? (
                <div className="rounded-2xl border border-emerald-400/60 bg-emerald-500/15 w-[220px] h-[220px] sm:w-[250px] sm:h-[250px] flex flex-col items-center justify-center gap-2 animate-in zoom-in-95 fade-in duration-200">
                  <CheckCircle2 size={104} strokeWidth={1.8} className="text-[#2de3a0]" />
                  <span className="text-[18px] font-black uppercase tracking-wide text-[#2de3a0]">PIX confirmado</span>
                  <span className="text-[22px] font-black text-white">R$ {amount.toFixed(2).replace('.', ',')}</span>
                </div>
              ) : (
                <div className="rounded-2xl bg-white p-2.5 w-[220px] h-[220px] sm:w-[250px] sm:h-[250px]">
                  <PixQrImage payload={payload} className="block h-full w-full object-contain" />
                </div>
              )}
            </div>
          </div>

          <div className="hidden sm:block bg-white/10" />

          {/* Direita: dados + botões */}
          <div className={'flex flex-col gap-2 sm:pt-8 transition-opacity ' + (pagoAuto ? 'opacity-40 pointer-events-none' : '')}>
            {linhas.map((l) => (
              <div
                key={l.label}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#0c1829] px-3 py-2"
              >
                <div
                  className={
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 ' +
                    (l.verde ? 'bg-emerald-500/20 text-[#2de3a0]' : 'bg-[#1d2b4a] text-slate-300')
                  }
                >
                  {l.icon}
                </div>
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 shrink-0">{l.label}</span>
                <span
                  className={
                    'ml-auto pl-4 text-right font-extrabold whitespace-nowrap ' +
                    (l.destaque ? 'text-[22px] text-[#2de3a0]' : 'text-[15px] text-white') +
                    (l.mono ? ' tabular-nums tracking-wide' : '')
                  }
                >
                  {l.value}
                </span>
              </div>
            ))}

            <button
              type="button"
              onClick={() => copiar(pixKey, 'key')}
              className="mt-0.5 h-10 w-full rounded-xl border border-red-500/70 bg-gradient-to-b from-[#a1243a] to-[#7f1d33] text-white text-[13px] font-black uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_18px_rgba(239,68,68,0.18)] hover:brightness-110 active:scale-[.99] transition-all cursor-pointer"
            >
              <Clipboard size={18} strokeWidth={1.8} />
              {copiado === 'key' ? 'Chave copiada!' : 'Copiar chave'}
            </button>
            <button
              type="button"
              onClick={() => copiar(payload, 'payload')}
              className="h-10 w-full rounded-xl border border-red-500/80 bg-[#3a1424]/70 text-red-400 text-[13px] font-black uppercase tracking-wider flex items-center justify-center gap-2.5 hover:bg-[#4a1a2d]/80 active:scale-[.99] transition-all cursor-pointer"
            >
              <Copy size={18} strokeWidth={1.8} />
              {copiado === 'payload' ? 'PIX copiado!' : 'Copia e cola'}
            </button>
          </div>
        </div>

        {pagoAuto && (
          <div
            role="status"
            className="mt-3 flex items-center justify-center gap-2.5 rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-4 py-2.5 text-[#2de3a0] animate-in zoom-in-95 fade-in duration-200"
          >
            <CheckCircle2 size={24} strokeWidth={2.4} />
            <span className="text-[14px] font-black uppercase tracking-wide">
              PIX confirmado ✓ · R$ {amount.toFixed(2).replace('.', ',')}
            </span>
          </div>
        )}

        {!pagoAuto && autoStatus !== 'off' && (
          <p className="mt-3 text-center text-[11px] font-semibold text-slate-400">
            {autoStatus === 'aguardando'
              ? 'Aguardando o PIX — a confirmação é automática assim que o pagamento chegar.'
              : 'Confirmação automática encerrada (30 min). Se já pagou, confirme manualmente.'}
          </p>
        )}

        {/* Rodapé */}
        <div className="mt-4 border-t border-white/10 pt-2.5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={fechar}
            className="px-5 h-8 text-[12px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors cursor-pointer bg-transparent border-0"
          >
            Fechar
          </button>
          {onConfirm && (
            <button
              type="button"
              onClick={confirmarManual}
              disabled={confirmDisabled}
              className="px-5 h-8 rounded-xl bg-primary-500 hover:bg-primary-400 text-slate-900 text-[12px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmLabel || 'Confirmar pagamento'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
