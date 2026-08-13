import React from 'react';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '../utils/storage';

interface ReceiptForecastCardProps {
  baseSalary: number;
  totalCommission: number;
  weeklyGoal?: number;
  totalProduction: number;
  onOpenAddModal?: () => void;
}

export const ReceiptForecastCard: React.FC<ReceiptForecastCardProps> = ({
  baseSalary,
  totalCommission,
}) => {
  const forecastTotal = baseSalary + totalCommission;

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
        <div className="pt-4 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between bg-black/25 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-white/10">
            <span className="text-white/80 font-medium text-xs">Salário Base:</span>
            <span className="font-bold text-white text-base">{formatCurrency(baseSalary)}</span>
          </div>

          <div className="flex items-center justify-between bg-black/25 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-white/10">
            <span className="text-white/80 font-medium text-xs">Comissão Acumulada:</span>
            <span className="font-bold text-white text-base">{formatCurrency(totalCommission)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
