import React, { useMemo } from 'react';
import { Wallet, ChevronRight, Calculator, Target, Award } from 'lucide-react';
import { formatCurrency } from '../utils/storage';
import { MetaValorItem } from '../types';
import { calcularPrevisaoRecebimento, calcularAReceber } from '../utils/previsaoRecebimento';

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
  cycleDates?: string;
  modalidadeRemuneracao?: 'fixo' | 'fixo_comissao' | 'meta' | 'faturamento_geral';
  metaPercentual?: number;
  metasValores?: MetaValorItem[];
  metaValorMinimo?: number;
  onOpenAddModal?: () => void;
  onOpenDescontos?: () => void;
}

export const ReceiptForecastCard: React.FC<ReceiptForecastCardProps> = ({
  baseSalary,
  totalCommission,
  totalProduction = 0,
  totalDiscounts = 0,
  totalPaid = 0,
  previousBalance = 0,
  cycleDates,
  modalidadeRemuneracao = 'fixo_comissao',
  metaPercentual,
  metasValores,
  metaValorMinimo = 600,
  onOpenDescontos,
}) => {
  const forecastBruto = calcularPrevisaoRecebimento({ salarioBase: baseSalary, comissao: totalCommission, descontos: totalDiscounts, saldoAnterior: previousBalance });
  const forecastTotal = calcularAReceber(forecastBruto, totalPaid);
  const isHojeSabado = new Date().getDay() === 6;

  const infoMeta = useMemo(() => {
    if (modalidadeRemuneracao !== 'meta') return null;

    const valorMinimo = Number(metaValorMinimo) > 0 ? Number(metaValorMinimo) : 600;
    const metasValidas = (metasValores || []).filter(
      (m) => Number(m.valorProducao) > 0 && Number(m.valorReceber) > 0
    );

    const ordenadas = [...metasValidas].sort((a, b) => Number(a.valorProducao) - Number(b.valorProducao));
    const atingidas = ordenadas.filter((m) => totalProduction >= Number(m.valorProducao));
    const naoAtingidas = ordenadas.filter((m) => totalProduction < Number(m.valorProducao));

    let atualNome = 'Piso Mínimo Garantido';
    let atualValorReceber = valorMinimo;
    let bateuAlgumaFaixa = false;

    if (atingidas.length > 0) {
      bateuAlgumaFaixa = true;
      const maior = atingidas[atingidas.length - 1];
      atualNome = maior.nome || `Faixa ${formatCurrency(maior.valorProducao)}`;
      atualValorReceber = Number(maior.valorReceber);
    }

    let proximaFaixa: MetaValorItem | null = null;
    let quantoFalta = 0;
    let progressoPercentual = 100;

    if (naoAtingidas.length > 0) {
      proximaFaixa = naoAtingidas[0];
      quantoFalta = Math.max(0, Number(proximaFaixa.valorProducao) - totalProduction);
      progressoPercentual = Math.min(
        100,
        Math.max(0, Math.round((totalProduction / Number(proximaFaixa.valorProducao)) * 100))
      );
    }

    return {
      valorMinimo,
      ordenadas,
      atingidas,
      bateuAlgumaFaixa,
      atualNome,
      atualValorReceber,
      proximaFaixa,
      quantoFalta,
      progressoPercentual,
    };
  }, [modalidadeRemuneracao, metasValores, metaValorMinimo, totalProduction]);

  return (
    <div
      id="card-previsao-recebimento"
      className="relative overflow-hidden rounded-3xl bg-gradient-red p-5 sm:p-6 text-white shadow-red-lg-glow transition-all duration-300 hover:shadow-2xl h-full flex flex-col justify-between"
    >
      <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-52 h-52 rounded-full bg-black/25 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
        {/* Cabeçalho */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-black tracking-wider uppercase border border-white/15 shadow-sm">
              <Wallet className="w-4 h-4 text-white shrink-0" />
              <span>Previsão de Recebimento</span>
            </div>
            <span className="text-[11px] font-bold text-white/90 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap">
              {modalidadeRemuneracao === 'fixo' ? 'Salário Fixo' : 'Salário + Comissão'}
            </span>
          </div>

          {/* Valor Principal (Topo) */}
          <div className="bg-black/25 backdrop-blur-md rounded-2xl p-4 border border-white/15 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-xs uppercase tracking-wider text-white/90 font-black block">
                Total a Receber
              </span>
              <span className="text-[11px] text-white/70 font-medium block mt-0.5 whitespace-nowrap">
                {modalidadeRemuneracao === 'fixo' ? 'Salário − Descontos' : 'Salário + Comissões − Descontos'}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm font-mono text-right shrink-0">
              {formatCurrency(forecastTotal)}
            </div>
          </div>
        </div>

        {/* Termômetro Meta se aplicável */}
        {infoMeta && (
          <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-3 shadow-inner">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-white/15">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-white/90">
                <Target className="w-4 h-4 text-amber-300 shrink-0" />
                Status da Meta
              </span>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                  infoMeta.bateuAlgumaFaixa
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/40'
                    : 'bg-blue-500/25 text-blue-200 border-blue-400/40'
                }`}
              >
                {infoMeta.bateuAlgumaFaixa ? `🏆 ${infoMeta.atualNome}` : `🛡️ ${infoMeta.atualNome}`}
              </span>
            </div>

            {infoMeta.proximaFaixa ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/80">
                    Produção: <strong className="font-mono text-white">{formatCurrency(totalProduction)}</strong>
                  </span>
                  <span className="text-amber-300 font-bold">
                    Faltam: <strong className="font-mono text-amber-200">{formatCurrency(infoMeta.quantoFalta)}</strong>
                  </span>
                </div>

                <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/15">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${infoMeta.progressoPercentual}%` }}
                  />
                </div>

                <div className="text-[11px] text-white/85 flex items-center justify-between pt-0.5 leading-tight">
                  <span>
                    Próximo Degrau: <strong>{infoMeta.proximaFaixa.nome || 'Faixa Seguinte'}</strong> ({formatCurrency(infoMeta.proximaFaixa.valorProducao)})
                  </span>
                  <span className="text-emerald-300 font-black">
                    Recebe: {formatCurrency(infoMeta.proximaFaixa.valorReceber)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-2">
                <Award className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Parabéns! Você alcançou a maior faixa de remuneração!</span>
              </div>
            )}
          </div>
        )}

        {/* Composição do Valor */}
        <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-3 shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold uppercase tracking-wider text-white/90 pb-2 border-b border-white/15 gap-1 sm:gap-2">
            <span className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
              <Calculator className="w-4 h-4 text-white/90 shrink-0" />
              Composição do Valor
            </span>
            <span className="text-[10px] text-white/70 font-mono text-left sm:text-right leading-tight">
              {cycleDates || (modalidadeRemuneracao === 'fixo' ? 'Salário • Descontos' : 'Salário • Comissões • Descontos')}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Salário Base (Sempre visível) */}
            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-black/20 border border-white/10 gap-2">
              <span className="text-white/85 font-semibold text-xs whitespace-nowrap">
                {modalidadeRemuneracao === 'fixo' ? 'Salário Fixo' : 'Salário'}
              </span>
              <span className="font-bold text-white font-mono text-sm whitespace-nowrap">{formatCurrency(baseSalary)}</span>
            </div>

            {/* Comissões (Apenas para quem recebe comissão) */}
            {modalidadeRemuneracao !== 'fixo' && (
              modalidadeRemuneracao === 'meta' ? (
                <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 gap-2">
                  <span className="text-emerald-200 font-semibold text-xs whitespace-nowrap">
                    {infoMeta?.bateuAlgumaFaixa ? `+ Meta (${infoMeta.atualNome})` : `+ Piso Mínimo Garantido`}
                  </span>
                  <span className="font-bold text-emerald-300 font-mono text-sm whitespace-nowrap">+{formatCurrency(totalCommission)}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 gap-2">
                  <span className="text-emerald-200 font-semibold text-xs whitespace-nowrap">
                    {modalidadeRemuneracao === 'faturamento_geral' ? `+ Comissão (${metaPercentual || 0}% Faturamento)` : '+ Comissões'}
                  </span>
                  <span className="font-bold text-emerald-300 font-mono text-sm whitespace-nowrap">+{formatCurrency(totalCommission)}</span>
                </div>
              )
            )}

            {/* Descontos (Ponto / Dinheiro) */}
            {totalDiscounts > 0 && (
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-rose-950/40 border border-rose-500/30 gap-2">
                <span className="text-rose-200 font-semibold text-xs">- Descontos</span>
                <span className="font-bold text-rose-300 font-mono text-sm">-{formatCurrency(totalDiscounts)}</span>
              </div>
            )}

            {/* Saldo anterior */}
            {previousBalance !== 0 && (
              <div className={`flex items-center justify-between py-1.5 px-3 rounded-xl gap-2 ${previousBalance < 0 ? 'bg-rose-950/40 border border-rose-500/30' : 'bg-emerald-950/40 border border-emerald-500/30'}`}>
                <span className={`${previousBalance < 0 ? 'text-rose-200' : 'text-emerald-200'} font-semibold text-xs`}>
                  {previousBalance < 0 ? '- Dívida anterior' : '+ Saldo anterior'}
                </span>
                <span className={`font-bold ${previousBalance < 0 ? 'text-rose-300' : 'text-emerald-300'} font-mono text-sm`}>
                  {previousBalance < 0 ? '-' : '+'}{formatCurrency(Math.abs(previousBalance))}
                </span>
              </div>
            )}

            {/* Já pago */}
            {totalPaid > 0 && (
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-rose-950/40 border border-rose-500/30 gap-2">
                <span className="text-rose-200 font-semibold text-xs">- Já recebido</span>
                <span className="font-bold text-rose-300 font-mono text-sm">-{formatCurrency(totalPaid)}</span>
              </div>
            )}

            {/* Saldo a Receber (Igual ao Total Principal) */}
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/20 border border-white/30 shadow-sm mt-1 gap-2">
              <span className="text-white font-black uppercase text-xs tracking-wider">= Saldo a Receber</span>
              <span className="font-black text-white font-mono text-base">{formatCurrency(forecastTotal)}</span>
            </div>
          </div>
        </div>

        {/* Botão de Histórico */}
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
