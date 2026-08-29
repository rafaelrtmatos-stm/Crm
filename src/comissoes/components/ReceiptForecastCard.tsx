import React from 'react';
import { Wallet, MinusCircle, ChevronRight, Calculator, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../utils/storage';

interface ReceiptForecastCardProps {
  baseSalary: number;
  totalCommission: number;
  weeklyGoal?: number;
  totalProduction?: number;
  totalDiscounts?: number;
  // Quanto o colaborador já recebeu no período selecionado (dinheiro/pix/etc).
  // Se ele recebeu A MAIS do que era esperado, isso vira déficit e precisa abater
  // do total estimado -- senão o card mostra um valor inflado, ignorando a dívida.
  totalPaid?: number;
  // Saldo do caixa que veio de fora do período selecionado (dívida ou crédito acumulado).
  // Negativo = dívida do colaborador (precisa abater do total estimado);
  // positivo = crédito a favor (soma no total estimado). Mesmo saldo mostrado no card
  // "Caixa" da aba Descontos.
  previousBalance?: number;
  onOpenAddModal?: () => void;
  onOpenDescontos?: () => void;
}

export const ReceiptForecastCard: React.FC<ReceiptForecastCardProps> = ({
  baseSalary,
  totalCommission,
  totalDiscounts = 0,
  totalPaid = 0,
  previousBalance = 0,
  onOpenDescontos,
}) => {
  const forecastTotal = baseSalary + totalCommission - totalDiscounts - totalPaid + previousBalance;

  return (
    <div
      id="card-previsao-recebimento"
      className="relative overflow-hidden rounded-2xl bg-gradient-red p-6 text-white shadow-red-lg-glow transition-all duration-300 hover:scale-[1.01] h-full flex flex-col justify-between"
    >
      {/* Subtle background graphic design */}
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-black/20 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        <div>
          {/* Header Tag */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border border-white/15">
              <Wallet className="w-3.5 h-3.5 text-white" />
              <span>PREVISÃO DE RECEBIMENTO</span>
            </div>
          </div>

          {/* Main Forecast Display */}
          <div className="my-2">
            <span className="text-xs uppercase tracking-wider text-white/75 font-medium">
              Total Estimado para Receber
            </span>
            <div className="text-4xl sm:text-5xl font-black tracking-tight mt-1 text-white drop-shadow-sm">
              {formatCurrency(forecastTotal)}
            </div>
          </div>
        </div>

        {/* Breakdown Items */}
        <div className="pt-3 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
          <div className="flex items-center justify-between bg-black/25 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-white/10">
            <span className="text-white/80 font-medium text-xs">Salário Base:</span>
            <span className="font-bold text-white text-base">{formatCurrency(baseSalary)}</span>
          </div>

          <div className="flex items-center justify-between bg-black/25 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-white/10">
            <span className="text-white/80 font-medium text-xs">Comissão Acumulada:</span>
            <span className="font-bold text-white text-base">{formatCurrency(totalCommission)}</span>
          </div>
        </div>

        {/* Aba / Memória de Cálculo: Salário Base + Comissão - Descontos */}
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 border border-white/15 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/80">
            <span className="flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-white" />
              Cálculo de Previsão
            </span>
            <span className="text-[10px] text-white/60 font-medium">
              Base + Comissão - Descontos
            </span>
          </div>
          
          <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
            <div className="bg-black/25 p-1.5 rounded-lg border border-white/10">
              <div className="text-[9px] text-white/70 font-sans uppercase font-semibold truncate">Base</div>
              <div className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate">{formatCurrency(baseSalary)}</div>
            </div>
            
            <div className="bg-black/25 p-1.5 rounded-lg border border-white/10">
              <div className="text-[9px] text-emerald-300 font-sans uppercase font-semibold truncate">+ Comissão</div>
              <div className="text-xs sm:text-sm font-bold text-emerald-200 mt-0.5 truncate">+{formatCurrency(totalCommission)}</div>
            </div>

            <div className="bg-black/25 p-1.5 rounded-lg border border-white/10">
              <div className="text-[9px] text-rose-300 font-sans uppercase font-semibold truncate">- Descontos</div>
              <div className="text-xs sm:text-sm font-bold text-rose-200 mt-0.5 truncate">-{formatCurrency(totalDiscounts)}</div>
            </div>

            <div className="bg-white/15 p-1.5 rounded-lg border border-white/30 shadow-inner">
              <div className="text-[9px] text-white font-sans uppercase font-black truncate">= Total</div>
              <div className="text-xs sm:text-sm font-black text-white mt-0.5 truncate">{formatCurrency(forecastTotal)}</div>
            </div>
          </div>
        </div>

        {/* Prévia dos Descontos (faltas, etc.) do período -- clica e vai pra área de Descontos */}
        {totalDiscounts > 0 && (
          <button
            type="button"
            onClick={onOpenDescontos}
            disabled={!onOpenDescontos}
            className="w-full flex items-center justify-between gap-2 bg-black/25 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-white/10 text-left transition-colors hover:bg-black/35 disabled:cursor-default disabled:hover:bg-black/25"
          >
            <span className="flex items-center gap-1.5 text-white/80 font-medium text-xs">
              <MinusCircle className="w-3.5 h-3.5" />
              Descontos da semana:
            </span>
            <span className="flex items-center gap-1 font-bold text-rose-200 text-base">
              -{formatCurrency(totalDiscounts)}
              {onOpenDescontos && <ChevronRight className="w-4 h-4 text-white/60" />}
            </span>
          </button>
        )}

        {/* Saldo do caixa vindo de fora do período (dívida acumulada de antes, ou crédito a favor) */}
        {previousBalance !== 0 && (
          <button
            type="button"
            onClick={onOpenDescontos}
            disabled={!onOpenDescontos}
            className="w-full flex items-center justify-between gap-2 bg-black/25 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-white/10 text-left transition-colors hover:bg-black/35 disabled:cursor-default disabled:hover:bg-black/25"
          >
            <span className="flex items-center gap-1.5 text-white/80 font-medium text-xs">
              <MinusCircle className="w-3.5 h-3.5" />
              {previousBalance < 0 ? 'Dívida acumulada do caixa:' : 'Crédito acumulado do caixa:'}
            </span>
            <span className={`flex items-center gap-1 font-bold text-base ${previousBalance < 0 ? 'text-rose-200' : 'text-emerald-200'}`}>
              {previousBalance < 0 ? '-' : '+'}{formatCurrency(Math.abs(previousBalance))}
              {onOpenDescontos && <ChevronRight className="w-4 h-4 text-white/60" />}
            </span>
          </button>
        )}

        {/* Já recebido no período (dinheiro/pix/etc) */}
        {totalPaid !== 0 && (
          <button
            type="button"
            onClick={onOpenDescontos}
            disabled={!onOpenDescontos}
            className="w-full flex items-center justify-between gap-2 bg-black/25 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-white/10 text-left transition-colors hover:bg-black/35 disabled:cursor-default disabled:hover:bg-black/25"
          >
            <span className="flex items-center gap-1.5 text-white/80 font-medium text-xs">
              <MinusCircle className="w-3.5 h-3.5" />
              Já recebido na semana:
            </span>
            <span className="flex items-center gap-1 font-bold text-rose-200 text-base">
              -{formatCurrency(totalPaid)}
              {onOpenDescontos && <ChevronRight className="w-4 h-4 text-white/60" />}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
