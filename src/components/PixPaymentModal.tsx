import React, { useEffect, useState } from 'react';
import { Clipboard, Copy, DollarSign, KeyRound, Landmark, User, X } from 'lucide-react';
import { PixQrImage } from './PixQrImage';
import { showAlert } from '../lib/notify';

// Card "Pagamento via PIX": QR Code à esquerda, dados (valor, beneficiário, banco, chave) à direita,
// botões "Copiar chave" / "Copia e cola" e "Fechar". Usado no PDV e na tela de Vendas.

/** Logo do PIX: quatro losangos arredondados em cruz. */
const PixLogo = ({ size = 44 }: { size?: number }) => (
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
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  isOpen, onClose, payload, pixKey, amount, beneficiaryName, bank, confirmLabel, onConfirm, confirmDisabled,
}) => {
  const [copiado, setCopiado] = useState<'key' | 'payload' | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

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
    { icon: <DollarSign size={20} strokeWidth={2.6} />, label: 'Valor', value: `R$ ${amount.toFixed(2).replace('.', ',')}`, destaque: true, verde: true },
    { icon: <User size={19} />, label: 'Beneficiário', value: beneficiaryName },
    ...(bank ? [{ icon: <Landmark size={19} />, label: 'Banco', value: bank } as Row] : []),
    { icon: <KeyRound size={19} />, label: 'Chave', value: pixKey, mono: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md" onClick={onClose} />

      <div
        role="dialog"
        aria-label="Pagamento via PIX"
        className="relative w-full max-w-[860px] my-auto rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e1a2d] to-[#0a1424] shadow-2xl p-4 sm:p-7 animate-in zoom-in-95 fade-in duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 sm:top-4 sm:right-5 p-1 text-white/50 hover:text-white transition-colors cursor-pointer bg-transparent border-0"
        >
          <X size={26} strokeWidth={1.6} />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-[auto_1px_1fr] gap-5 sm:gap-7">
          {/* Esquerda: título + QR Code */}
          <div className="flex flex-col items-center sm:items-start gap-4">
            <div className="flex items-center gap-3">
              <PixLogo />
              <div className="leading-tight">
                <h2 className="text-[22px] sm:text-[26px] font-black uppercase tracking-tight text-white">
                  Pagamento via <span className="text-[#2de3a0]">PIX</span>
                </h2>
                <p className="text-[13px] sm:text-sm font-medium text-slate-400">Escaneie o QR Code para pagar</p>
              </div>
            </div>
            <div className="rounded-3xl bg-white/[0.04] p-4 sm:p-5 shadow-[0_0_40px_rgba(45,227,160,0.06)]">
              <div className="rounded-2xl bg-white p-2.5 w-[220px] h-[220px] sm:w-[250px] sm:h-[250px]">
                <PixQrImage payload={payload} className="block h-full w-full object-contain" />
              </div>
            </div>
          </div>

          <div className="hidden sm:block bg-white/10" />

          {/* Direita: dados + botões */}
          <div className="flex flex-col gap-2.5 sm:pt-12 min-w-0">
            {linhas.map((l) => (
              <div
                key={l.label}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0c1829] px-3.5 py-2.5"
              >
                <div
                  className={
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0 ' +
                    (l.verde ? 'bg-emerald-500/20 text-[#2de3a0]' : 'bg-[#1d2b4a] text-slate-300')
                  }
                >
                  {l.icon}
                </div>
                <span className="text-[13px] font-extrabold uppercase tracking-wide text-slate-400 shrink-0">{l.label}</span>
                <span
                  className={
                    'ml-auto text-right font-extrabold min-w-0 break-words ' +
                    (l.destaque ? 'text-[26px] text-[#2de3a0]' : 'text-[17px] text-white') +
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
              className="mt-1 h-12 w-full rounded-xl border border-red-500/70 bg-gradient-to-b from-[#a1243a] to-[#7f1d33] text-white text-[15px] font-black uppercase tracking-wider flex items-center justify-center gap-3 shadow-[0_0_18px_rgba(239,68,68,0.18)] hover:brightness-110 active:scale-[.99] transition-all cursor-pointer"
            >
              <Clipboard size={22} strokeWidth={1.8} />
              {copiado === 'key' ? 'Chave copiada!' : 'Copiar chave'}
            </button>
            <button
              type="button"
              onClick={() => copiar(payload, 'payload')}
              className="h-12 w-full rounded-xl border border-red-500/80 bg-[#3a1424]/70 text-red-400 text-[15px] font-black uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-[#4a1a2d]/80 active:scale-[.99] transition-all cursor-pointer"
            >
              <Copy size={22} strokeWidth={1.8} />
              {copiado === 'payload' ? 'PIX copiado!' : 'Copia e cola'}
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-5 sm:mt-6 border-t border-white/10 pt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 h-10 text-[14px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors cursor-pointer bg-transparent border-0"
          >
            Fechar
          </button>
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className="px-6 h-10 rounded-xl bg-primary-500 hover:bg-primary-400 text-slate-900 text-[13px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmLabel || 'Confirmar pagamento'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
