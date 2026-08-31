import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Printer,
  Download,
  Calculator,
  Award,
  DollarSign,
  TrendingUp,
  Sliders,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { ServiceItem, UserSettings, SummaryStats } from '../types';
import { formatCurrency, formatDateBR, calculateSummaryStats } from '../utils/storage';
import { getWorkWeekBounds } from '../utils/caixaSemanalStorage';

interface ReportsViewProps {
  services: ServiceItem[];
  userSettings: UserSettings;
  stats: SummaryStats;
  onGoToServiceInTable?: (serviceId: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ services, userSettings, stats, onGoToServiceInTable }) => {
  const [simulatedProduction, setSimulatedProduction] = useState<number>(3000);
  const [periodFilter, setPeriodFilter] = useState<'semana' | 'mes' | 'todos'>('semana');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const handlePrintReport = () => {
    window.print();
  };

  const weekBounds = useMemo(() => getWorkWeekBounds(weekOffset), [weekOffset]);

  const filteredServices = useMemo(() => {
    if (periodFilter === 'todos') {
      return services;
    }
    if (periodFilter === 'semana') {
      return services.filter((s) => s.date >= weekBounds.start && s.date <= weekBounds.end);
    }
    if (periodFilter === 'mes') {
      const now = new Date();
      const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const last = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
      return services.filter((s) => s.date >= first && s.date <= last);
    }
    return services;
  }, [services, periodFilter, weekBounds]);

  const currentStats = useMemo(() => {
    return calculateSummaryStats(filteredServices, userSettings.baseSalary);
  }, [filteredServices, userSettings.baseSalary]);

  const simulatedCommission = (simulatedProduction * userSettings.defaultCommissionRate) / 100;
  const simulatedTotalPayout = userSettings.baseSalary + simulatedCommission;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--accent-red)] mb-1">
            <BarChart3 className="w-4 h-4" /> Relatórios Consolidados de Comissões
          </div>
          <h2 className="text-2xl font-black uppercase text-[var(--text-main)]">
            FECHAMENTO DE RENDIMENTOS
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
            Resumo analítico de produção, cálculo de comissões e projeção de fechamento por período ou semana retroagida.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Controles de Período e Navegação Semanal */}
          <div className="flex items-center gap-1 bg-[var(--bg-card-sec)] p-1 rounded-xl border border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => {
                setPeriodFilter('semana');
                setWeekOffset((v) => v - 1);
              }}
              title="Semana Anterior"
              className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--accent-red)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setPeriodFilter('semana')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                periodFilter === 'semana'
                  ? 'bg-[var(--accent-red)] text-white'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              {weekOffset === 0
                ? 'Esta Semana'
                : `Semana (${weekOffset < 0 ? `${Math.abs(weekOffset)} sem. atrás` : `+${weekOffset} sem.`})`}
            </button>

            <button
              type="button"
              onClick={() => {
                setPeriodFilter('semana');
                setWeekOffset((v) => v + 1);
              }}
              title="Próxima Semana"
              className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--accent-red)]"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setPeriodFilter('mes')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                periodFilter === 'mes'
                  ? 'bg-[var(--accent-red)] text-white'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              Mês
            </button>

            <button
              type="button"
              onClick={() => setPeriodFilter('todos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                periodFilter === 'todos'
                  ? 'bg-[var(--accent-red)] text-white'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              Todos
            </button>
          </div>

          <button
            onClick={handlePrintReport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] hover:border-[var(--accent-red)] transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[var(--accent-red)]" />
            <span>IMPRIMIR / GERAR PDF</span>
          </button>
        </div>
      </div>

      {/* Main Executive Statement Box */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-6 shadow-md print:p-0 print:border-none">
        <div className="border-b border-[var(--border-color)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-red)]">
              EXTRATO DE PRODUÇÃO & COMISSÃO
            </span>
            <h3 className="text-xl font-bold text-[var(--text-main)]">
              Profissional: {userSettings.userName}
            </h3>
            <p className="text-xs text-[var(--text-muted)] font-mono">{userSettings.userRole}</p>
          </div>

          <div className="text-left sm:text-right font-mono text-xs text-[var(--text-muted)]">
            <p>Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
            <p className="text-[var(--accent-red)] font-bold">
              Período:{' '}
              {periodFilter === 'semana'
                ? `Semana (${formatDateBR(weekBounds.start)} a ${formatDateBR(weekBounds.end)})`
                : periodFilter === 'mes'
                ? 'Mês Atual'
                : 'Histórico Completo'}
            </p>
          </div>
        </div>

        {/* 4 Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
              Salário Base Fixado
            </span>
            <div className="text-2xl font-black font-mono text-[var(--text-main)] mt-1">
              {formatCurrency(userSettings.baseSalary)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
              Produção do Período
            </span>
            <div className="text-2xl font-black font-mono text-[var(--text-main)] mt-1">
              {formatCurrency(currentStats.totalProduction)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
            <span className="text-[10px] font-bold uppercase text-[var(--accent-red)]">
              Comissão Gerada
            </span>
            <div className="text-2xl font-black font-mono text-[var(--accent-red)] mt-1">
              {formatCurrency(currentStats.totalCommission)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-red text-white shadow-red-glow">
            <span className="text-[10px] font-bold uppercase text-white/80">
              Recebimento Total Estimado
            </span>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {formatCurrency(currentStats.forecastTotal)}
            </div>
          </div>
        </div>

        {/* Services List Breakdown Table */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Detalhamento dos Serviços Registrados ({filteredServices.length} serviços)
          </h4>
          <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-card-sec)] text-[var(--text-muted)] font-bold uppercase">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Serviço</th>
                  <th className="p-3 text-right">Produção (R$)</th>
                  <th className="p-3 text-center">% Com.</th>
                  <th className="p-3 text-right text-[var(--accent-red)]">Comissão (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] font-medium">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-[var(--text-muted)] font-mono">
                      Nenhum serviço registrado neste período.
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => onGoToServiceInTable?.(item.id)}
                      className={`hover:bg-[var(--bg-card-hover)] transition-colors ${onGoToServiceInTable ? 'cursor-pointer' : ''}`}
                    >
                      <td className="p-3 font-mono">{formatDateBR(item.date)}</td>
                      <td className="p-3 font-bold">{item.serviceType}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(item.productionValue)}</td>
                      <td className="p-3 text-center font-mono">{item.commissionPercent}%</td>
                      <td className="p-3 text-right font-mono font-bold text-[var(--accent-red)]">
                        {formatCurrency(item.commissionValue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Commission Simulator Tool */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-4 print:hidden">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-[var(--accent-red)]" />
          <h3 className="font-black text-base uppercase text-[var(--text-main)]">
            Simulador de Metas e Rendimentos
          </h3>
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          Simule quanto você receberá ao atingir diferentes níveis de produção com a taxa atual de{' '}
          <strong>{userSettings.defaultCommissionRate}%</strong>.
        </p>

        <div className="p-4 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)] space-y-4">
          <div>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span>Meta de Produção Simulada:</span>
              <span className="text-[var(--accent-red)] font-mono text-sm">{formatCurrency(simulatedProduction)}</span>
            </div>
            <input
              type="range"
              min="500"
              max="10000"
              step="250"
              value={simulatedProduction}
              onChange={(e) => setSimulatedProduction(parseFloat(e.target.value))}
              className="w-full accent-[var(--accent-red)] cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-center text-xs">
            <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] block mb-1">Salário Base</span>
              <span className="font-bold text-sm font-mono">{formatCurrency(userSettings.baseSalary)}</span>
            </div>

            <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] block mb-1">Comissão Simulada ({userSettings.defaultCommissionRate}%)</span>
              <span className="font-bold text-sm font-mono text-[var(--accent-red)]">{formatCurrency(simulatedCommission)}</span>
            </div>

            <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30">
              <span className="text-[var(--accent-red)] font-bold block mb-1">Total a Receber</span>
              <span className="font-black text-base font-mono text-[var(--accent-red)]">{formatCurrency(simulatedTotalPayout)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
