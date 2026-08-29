import React from 'react';
import { Wallet, ChevronRight, Calculator, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../utils/storage';

interface ReceiptForecastCardProps {
  baseSalary: number;
  totalCommission: number;
  weeklyGoal?: number;
  totalProduction?: number;
  totalDiscounts?: number;
  // Quanto o colaborador já recebeu no período selecionado (dinheiro/pix/etc).
  totalPaid?: number;
  // Saldo do caixa acumulado fora do período (dívida ou crédito).
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
  const hasAdjustments = totalDiscounts > 0 || totalPaid > 0 || previousBalance !== 0;

  return (
    <div
      id="card-previsao-recebimento"
      className="relative overflow-hidden rounded-3xl bg-gradient-red p-5 sm:p-6 text-white shadow-red-lg-glow transition-all duration-300 hover:shadow-2xl h-full flex flex-col justify-between"
    >
      {/* Background ambient lighting effects */}
      <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-52 h-52 rounded-full bg-black/25 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        {/* ========================================================= */}
        {/* 1. CABEÇALHO & VALOR PRINCIPAL (EM LINHA ÚNICA) */}
        {/* ========================================================= */}
        <div className="space-y-3">
          {/* Header Tag */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-black tracking-wider uppercase border border-white/15 shadow-sm whitespace-nowrap">
              <Wallet className="w-4 h-4 text-white shrink-0" />
              <span>Previsão de Recebimento</span>
            </div>
            <span className="text-[11px] font-bold text-white/80 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 shrink-0 whitespace-nowrap">
              Semanal
            </span>
          </div>

          {/* Main Forecast Hero Display - Organizado em linha única sem quebras */}
          <div className="bg-black/25 backdrop-blur-md rounded-2xl p-4 border border-white/15 shadow-inner flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs uppercase tracking-wider text-white/90 font-black block whitespace-nowrap truncate">
                Total Estimado
              </span>
              <span className="text-[11px] text-white/70 font-medium block whitespace-nowrap truncate mt-0.5">
                Previsão líquida da semana
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm font-mono whitespace-nowrap text-right shrink-0">
              {formatCurrency(forecastTotal)}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. COMPOSIÇÃO DOS VALORES (SEM CORTES OU TRUNCATE) */}
        {/* ========================================================= */}
        <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-3 shadow-inner">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/90 pb-2 border-b border-white/15">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Calculator className="w-4 h-4 text-white/90 shrink-0" />
              Composição do Valor
            </span>
            <span className="text-[10px] text-white/70 font-mono font-normal whitespace-nowrap">
              Ciclo Atual
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* 1. Salário Base */}
            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-black/20 border border-white/10 gap-2">
              <span className="text-white/85 font-semibold text-xs whitespace-nowrap">Salário Base</span>
              <span className="font-bold text-white font-mono text-sm whitespace-nowrap">{formatCurrency(baseSalary)}</span>
            </div>

            {/* 2. Comissões Acumuladas */}
            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 gap-2">
              <span className="text-emerald-200 font-semibold text-xs whitespace-nowrap">+ Comissões da Semana</span>
              <span className="font-bold text-emerald-300 font-mono text-sm whitespace-nowrap">+{formatCurrency(totalCommission)}</span>
            </div>

            {/* 3. Descontos (faltas, atrasos, etc.) */}
            {totalDiscounts > 0 && (
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-rose-950/40 border border-rose-500/30 gap-2">
                <span className="text-rose-200 font-semibold text-xs whitespace-nowrap">- Descontos / Faltas</span>
                <span className="font-bold text-rose-300 font-mono text-sm whitespace-nowrap">-{formatCurrency(totalDiscounts)}</span>
              </div>
            )}

            {/* 4. Já Recebido na Semana (Vales/Adiantamentos) */}
            {totalPaid > 0 && (
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-amber-950/40 border border-amber-500/30 gap-2">
                <span className="text-amber-200 font-semibold text-xs whitespace-nowrap">- Já Recebido (Vales)</span>
                <span className="font-bold text-amber-300 font-mono text-sm whitespace-nowrap">-{formatCurrency(totalPaid)}</span>
              </div>
            )}

            {/* 5. Saldo Anterior do Caixa (Crédito ou Dívida fora do ciclo) */}
            {previousBalance !== 0 && (
              <div
                className={`flex items-center justify-between py-1.5 px-3 rounded-xl gap-2 ${
                  previousBalance > 0
                    ? 'bg-emerald-950/40 border border-emerald-500/30'
                    : 'bg-rose-950/40 border border-rose-500/30'
                }`}
              >
                <span className={`font-semibold text-xs whitespace-nowrap ${previousBalance > 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                  {previousBalance > 0 ? '+ Crédito Caixa' : '- Dívida Caixa'}
                </span>
                <span
                  className={`font-bold font-mono text-sm whitespace-nowrap ${
                    previousBalance > 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {previousBalance > 0 ? '+' : '-'}
                  {formatCurrency(Math.abs(previousBalance))}
                </span>
              </div>
            )}

            {/* 6. Linha de Fechamento Líquido */}
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/20 border border-white/30 shadow-sm mt-1 gap-2">
              <span className="text-white font-black uppercase text-xs tracking-wider whitespace-nowrap">= Saldo a Receber</span>
              <span className="font-black text-white font-mono text-base whitespace-nowrap">{formatCurrency(forecastTotal)}</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. BOTÃO DE AÇÃO / DETALHES DE DESCONTOS E VALES */}
        {/* ========================================================= */}
        {onOpenDescontos && (
          <button
            type="button"
            onClick={onOpenDescontos}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-black/25 hover:bg-black/40 active:scale-[0.98] border border-white/20 text-xs font-bold text-white transition-all cursor-pointer shadow-md"
          >
            <span>Ver Descontos, Vales & Histórico</span>
            <ChevronRight className="w-4 h-4 text-white/80" />
          </button>
        )}
      </div>
    </div>
  );
};
