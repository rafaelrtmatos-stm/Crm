import React, { useMemo } from 'react';
import { Wallet, ChevronRight, Calculator, Target, TrendingUp, Award, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../utils/storage';
import { MetaValorItem } from '../types';

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
  // Saldo anterior (dívida < 0, crédito > 0) entra na previsão, igual ao painel da equipe.
  const forecastTotal = Math.max(0, baseSalary + totalCommission - totalDiscounts + previousBalance);
  const isHojeSabado = new Date().getDay() === 6;

  // Cálculo detalhado da modalidade META
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
              'Salário + comissão'
            </span>
          </div>

          {/* Main Forecast Hero Display - Organizado em linha única sem quebras */}
          <div className="bg-black/25 backdrop-blur-md rounded-2xl p-4 border border-white/15 shadow-inner flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs uppercase tracking-wider text-white/90 font-black block whitespace-nowrap truncate">
                Total a Receber
              </span>
              <span className="text-[11px] text-white/70 font-medium block whitespace-nowrap truncate mt-0.5">
                'Salário + comissões - descontos'
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm font-mono whitespace-nowrap text-right shrink-0">
              {formatCurrency(forecastTotal)}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 1.1 TERMÔMETRO E PROGRESSO DA META (QUANDO MODALIDADE META) */}
        {/* ========================================================= */}
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

            {/* Informações de Faturamento e Próxima Meta */}
            {infoMeta.proximaFaixa ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/80">
                    {modalidadeRemuneracao === 'meta' ? 'Receita da Loja (Quitadas):' : 'Sua Produção:'}{' '}
                    <strong className="font-mono text-white">{formatCurrency(totalProduction)}</strong>
                  </span>
                  <span className="text-amber-300 font-bold">
                    Faltam: <strong className="font-mono text-amber-200">{formatCurrency(infoMeta.quantoFalta)}</strong>
                  </span>
                </div>

                {/* Barra de Progresso Visual */}
                <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/15">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${infoMeta.progressoPercentual}%` }}
                  />
                </div>

                <div className="text-[11px] text-white/85 flex items-center justify-between pt-0.5 leading-tight">
                  <span>
                    Próximo Degrau Loja: <strong>{infoMeta.proximaFaixa.nome || 'Faixa Seguinte'}</strong> ({formatCurrency(infoMeta.proximaFaixa.valorProducao)})
                  </span>
                  <span className="text-emerald-300 font-black">
                    Recebe: {formatCurrency(infoMeta.proximaFaixa.valorReceber)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-2">
                <Award className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Parabéns! Você alcançou a maior faixa de remuneração da semana!</span>
              </div>
            )}
          </div>
        )}

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
              {cycleDates || 'Salário • Comissões • Descontos'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* 1. Salário Base (quando modalidade não é 'meta' nem 'faturamento_geral' puro) */}
            {modalidadeRemuneracao !== 'meta' && (baseSalary > 0 || modalidadeRemuneracao === 'fixo') && (
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-black/20 border border-white/10 gap-2">
                <span className="text-white/85 font-semibold text-xs whitespace-nowrap">
                  'Salário'
                </span>
                <span className="font-bold text-white font-mono text-sm whitespace-nowrap">{formatCurrency(baseSalary)}</span>
              </div>
            )}

            {/* 2. Modalidade META: Mostra se é faixa atingida ou piso mínimo garantido */}
            {modalidadeRemuneracao === 'meta' && (
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 gap-2">
                <span className="text-emerald-200 font-semibold text-xs whitespace-nowrap">
                  {infoMeta?.bateuAlgumaFaixa
                    ? `+ Meta (${infoMeta.atualNome})`
                    : `+ Piso Mínimo Garantido (${formatCurrency(infoMeta?.valorMinimo || 600)})`}
                </span>
                <span className="font-bold text-emerald-300 font-mono text-sm whitespace-nowrap">
                  +{formatCurrency(totalCommission)}
                </span>
              </div>
            )}

            {/* 3. Outras modalidades: Comissões sobre Produção ou Faturamento */}
            {modalidadeRemuneracao !== 'fixo' && modalidadeRemuneracao !== 'meta' && (
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 gap-2">
                <span className="text-emerald-200 font-semibold text-xs whitespace-nowrap">
                  {modalidadeRemuneracao === 'faturamento_geral'
                    ? `+ Comissão (${metaPercentual || 0}% do Faturamento Geral)`
                    : '+ Comissões'}
                </span>
                <span className="font-bold text-emerald-300 font-mono text-sm whitespace-nowrap">+{formatCurrency(totalCommission)}</span>
              </div>
            )}

            {/* 4. Descontos (faltas, atrasos, etc.) */}
            {totalDiscounts > 0 && (
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-rose-950/40 border border-rose-500/30 gap-2">
                <span className="text-rose-200 font-semibold text-xs whitespace-nowrap">- Descontos</span>
                <span className="font-bold text-rose-300 font-mono text-sm whitespace-nowrap">-{formatCurrency(totalDiscounts)}</span>
              </div>
            )}

            {/* 4.1 Saldo anterior (dívida ou crédito de semanas passadas) */}
            {previousBalance !== 0 && (
              <div className={`flex items-center justify-between py-1.5 px-3 rounded-xl gap-2 ${previousBalance < 0 ? 'bg-rose-950/40 border border-rose-500/30' : 'bg-emerald-950/40 border border-emerald-500/30'}`}>
                <span className={`${previousBalance < 0 ? 'text-rose-200' : 'text-emerald-200'} font-semibold text-xs whitespace-nowrap`}>
                  {previousBalance < 0 ? '- Dívida anterior' : '+ Saldo anterior'}
                </span>
                <span className={`font-bold ${previousBalance < 0 ? 'text-rose-300' : 'text-emerald-300'} font-mono text-sm whitespace-nowrap`}>
                  {previousBalance < 0 ? '-' : '+'}{formatCurrency(Math.abs(previousBalance))}
                </span>
              </div>
            )}

            {/* 5. Linha de Fechamento Líquido */}
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/20 border border-white/30 shadow-sm mt-1 gap-2">
              <span className="text-white font-black uppercase text-xs tracking-wider whitespace-nowrap">= Saldo a Receber</span>
              <span className="font-black text-white font-mono text-base whitespace-nowrap">{formatCurrency(forecastTotal)}</span>
            </div>

            {isHojeSabado && (
              <div className="text-[10px] text-white/80 bg-black/25 px-2.5 py-1.5 rounded-lg border border-white/10 text-center leading-tight">
                ℹ️ O total é calculado por salário + comissões − descontos ± saldo anterior.
              </div>
            )}
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

