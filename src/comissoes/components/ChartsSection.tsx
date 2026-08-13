import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ServiceItem } from '../types';
import { formatCurrency, formatDateBR } from '../utils/storage';
import { BarChart2 } from 'lucide-react';

interface ChartsSectionProps {
  services: ServiceItem[];
  weeklyGoal?: number;
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ services }) => {
  // Aggregate daily production & commission
  const dailyDataMap: { [key: string]: { date: string; displayDate: string; producao: number; comissao: number } } = {};

  // Sort services by date
  const sortedServices = [...services].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedServices.forEach((s) => {
    if (s.status === 'CANCELADO') return;
    if (!dailyDataMap[s.date]) {
      dailyDataMap[s.date] = {
        date: s.date,
        displayDate: formatDateBR(s.date).substring(0, 5), // DD/MM
        producao: 0,
        comissao: 0,
      };
    }
    dailyDataMap[s.date].producao += s.productionValue;
    dailyDataMap[s.date].comissao += s.commissionValue;
  });

  const dailyChartData = Object.values(dailyDataMap).slice(-7); // Last 7 days with activity

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 rounded-xl bg-[#151515] border border-[#303030] text-white shadow-xl text-xs space-y-1">
          <p className="font-bold text-[var(--accent-red)] border-b border-[#303030] pb-1">
            Data: {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-4">
              <span style={{ color: entry.color }} className="font-semibold">
                {entry.name}:
              </span>
              <span className="font-mono font-bold">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {/* Daily Production & Commission Bar Chart */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[var(--accent-red)]" />
            <h3 className="font-black text-sm uppercase tracking-wider text-[var(--text-main)]">
              Evolução Diária de Produção & Comissão
            </h3>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-[var(--text-main)]">
              <span className="w-3 h-3 rounded bg-[#FF0000] inline-block" /> Produção
            </span>
            <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <span className="w-3 h-3 rounded bg-[#8B0000] inline-block" /> Comissão
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#303030" opacity={0.5} vertical={false} />
              <XAxis dataKey="displayDate" stroke="#AFAFAF" fontSize={11} tickLine={false} />
              <YAxis stroke="#AFAFAF" fontSize={11} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="producao" name="Produção" fill="#FF0000" radius={[4, 4, 0, 0]} />
              <Bar dataKey="comissao" name="Comissão" fill="#8B0000" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
