import React, { useState } from 'react';
import {
  Users,
  Clock,
  UserX,
  Zap,
  ArrowRight,
  MoreVertical,
  Calendar,
} from 'lucide-react';
import { AvatarPhoto } from '../SharedUI';
import { fmtHM, hhmm, StatusDia } from '../../lib/pontoCalc';

export interface DashboardFunc {
  id: string;
  numero_relogio: string;
  nome: string;
  setor: string;
  foto_url: string | null;
}

export interface DashboardRegItem {
  funcionarioId: string;
  nome: string;
  setor: string;
  fotoUrl: string | null;
  data: string;
  entrada: string | null;
  saida: string | null;
  minutosTrabalhados: number;
  status: StatusDia;
}

interface PontoDashboardProps {
  presentes: number;
  atrasados: number;
  ausentes: number;
  horasExtrasMinutos: number;
  semanaGrafico: { dia: string; horas: number; dow: number }[];
  totalFuncionarios: number;
  ultimosRegistros: DashboardRegItem[];
  onVerTodosRegistros: () => void;
  onAbrirFuncionario: (funcId: string) => void;
}

export function PontoDashboard({
  presentes,
  atrasados,
  ausentes,
  horasExtrasMinutos,
  semanaGrafico,
  totalFuncionarios,
  ultimosRegistros,
  onVerTodosRegistros,
  onAbrirFuncionario,
}: PontoDashboardProps) {
  const [hoverBar, setHoverBar] = useState<{ dia: string; horas: number; x: number; y: number } | null>(null);

  const statusPill = (status: StatusDia) => {
    switch (status) {
      case 'presente':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Presente
          </span>
        );
      case 'atrasado':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Atrasado
          </span>
        );
      case 'ausente':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Ausente
          </span>
        );
      case 'incompleto':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
            Batida faltando
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Aguardando
          </span>
        );
    }
  };

  // Porcentagens para o status da equipe
  const totalEquipe = Math.max(totalFuncionarios, 1);
  const pctPresentes = Math.round((presentes / totalEquipe) * 100);
  const pctAtrasados = Math.round((atrasados / totalEquipe) * 100);
  const pctAusentes = Math.round((ausentes / totalEquipe) * 100);

  // Donut SVG Math
  const r = 54;
  const c = 2 * Math.PI * r; // ~339.292
  const sumValues = presentes + atrasados + ausentes;
  const safeTotal = sumValues > 0 ? sumValues : 1;

  const lenPresentes = (presentes / safeTotal) * c;
  const lenAtrasados = (atrasados / safeTotal) * c;
  const lenAusentes = (ausentes / safeTotal) * c;

  const offsetPresentes = 0;
  const offsetAtrasados = -lenPresentes;
  const offsetAusentes = -(lenPresentes + lenAtrasados);

  // Escala para o gráfico de barras da semana (máximo 80h ou o maior valor + 10%)
  const maxHorasDado = Math.max(...semanaGrafico.map((d) => d.horas), 0);
  const maxGrafico = Math.max(80, Math.ceil(maxHorasDado / 20) * 20);

  const chartHeight = 160;
  const chartBaseline = 170;

  return (
    <div className="space-y-6">
      {/* Top Header do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-xs text-slate-500 font-medium">
            Visão geral do ponto eletrônico da empresa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white shadow-2xs text-xs font-semibold text-slate-700">
            <span className="text-slate-400 font-normal">Período</span>
            <span className="flex items-center gap-1.5 text-slate-800">
              <Calendar size={13} className="text-emerald-600" /> Esta semana
            </span>
          </div>
        </div>
      </div>

      {/* 4 Cards de Indicadores (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Presentes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20">
              <Users size={22} />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 leading-none">{presentes}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Presentes</p>
            </div>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ↑ +2
          </span>
        </div>

        {/* Atrasados */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/20">
              <Clock size={22} />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 leading-none">{atrasados}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Atrasados</p>
            </div>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            ↑ +1
          </span>
        </div>

        {/* Ausentes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-sm shadow-rose-500/20">
              <UserX size={22} />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 leading-none">{ausentes}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Ausentes</p>
            </div>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            ↓ -1
          </span>
        </div>

        {/* Horas Extras */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-sm shadow-sky-500/20">
              <Zap size={22} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 leading-none">
                {fmtHM(horasExtrasMinutos)}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Horas Extras</p>
            </div>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            ↑ +1h
          </span>
        </div>
      </div>

      {/* Linha dos Gráficos: Horas na Semana + Status da Equipe */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Gráfico de Barras: Horas trabalhadas na semana (SVG Puro) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs relative">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-black text-slate-900">Horas trabalhadas na semana</h3>
          </div>

          <div className="relative w-full h-56 pt-2">
            <svg
              viewBox="0 0 500 200"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="barGreen" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
              </defs>

              {/* Linhas de Grade e Eixo Y */}
              {[
                { label: `${maxGrafico}h`, y: 20 },
                { label: `${Math.round(maxGrafico * 0.75)}h`, y: 60 },
                { label: `${Math.round(maxGrafico * 0.5)}h`, y: 100 },
                { label: `${Math.round(maxGrafico * 0.25)}h`, y: 140 },
                { label: '0h', y: chartBaseline },
              ].map((grid, idx) => (
                <g key={idx}>
                  <text
                    x="28"
                    y={grid.y + 4}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-medium"
                  >
                    {grid.label}
                  </text>
                  <line
                    x1="36"
                    y1={grid.y}
                    x2="490"
                    y2={grid.y}
                    stroke="#F1F5F9"
                    strokeWidth="1.5"
                    strokeDasharray={idx === 4 ? 'none' : '3 3'}
                  />
                </g>
              ))}

              {/* Barras dos 7 Dias da Semana */}
              {semanaGrafico.map((d, index) => {
                const barWidth = 34;
                const spacing = (490 - 36) / 7;
                const x = 36 + index * spacing + (spacing - barWidth) / 2;
                const ratio = Math.min(1, Math.max(0, d.horas / maxGrafico));
                const barH = ratio * (chartBaseline - 20);
                const y = chartBaseline - barH;

                return (
                  <g
                    key={d.dia + index}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoverBar({ dia: d.dia, horas: d.horas, x, y })}
                    onMouseLeave={() => setHoverBar(null)}
                  >
                    {/* Barra de Fundo Transparente para capturar hover com facilidade */}
                    <rect
                      x={x - 4}
                      y={20}
                      width={barWidth + 8}
                      height={chartBaseline - 20}
                      fill="transparent"
                    />

                    {/* Barra Principal */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barH}
                      rx={6}
                      ry={6}
                      fill="url(#barGreen)"
                      className="transition-all duration-300 group-hover:brightness-110"
                    />

                    {/* Rótulo do Dia */}
                    <text
                      x={x + barWidth / 2}
                      y={chartBaseline + 18}
                      textAnchor="middle"
                      className="text-[11px] font-semibold fill-slate-500 group-hover:fill-emerald-700 transition-colors"
                    >
                      {d.dia}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Tooltip de Hover */}
            {hoverBar && (
              <div
                className="absolute pointer-events-none -translate-x-1/2 -translate-y-full bg-slate-900 text-white text-xs px-3 py-1.5 rounded-xl shadow-lg font-medium"
                style={{
                  left: `${(hoverBar.x / 500) * 100 + 3.5}%`,
                  top: `${(hoverBar.y / 200) * 100 - 8}%`,
                }}
              >
                <p className="font-bold text-slate-300">{hoverBar.dia}</p>
                <p className="text-emerald-400 font-extrabold">{hoverBar.horas}h trabalhadas</p>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico Donut: Status da equipe (SVG Puro) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <h3 className="text-sm font-black text-slate-900 mb-2">Status da equipe</h3>

          <div className="flex items-center justify-around gap-4 my-auto">
            {/* SVG Donut */}
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                {/* Círculo de fundo cinza */}
                <circle
                  cx="70"
                  cy="70"
                  r={r}
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth="16"
                />

                {/* Presentes (Verde) */}
                {presentes > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={r}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="16"
                    strokeDasharray={`${lenPresentes} ${c - lenPresentes}`}
                    strokeDashoffset={offsetPresentes}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                )}

                {/* Atrasados (Amarelo) */}
                {atrasados > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={r}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="16"
                    strokeDasharray={`${lenAtrasados} ${c - lenAtrasados}`}
                    strokeDashoffset={offsetAtrasados}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                )}

                {/* Ausentes (Vermelho) */}
                {ausentes > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={r}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="16"
                    strokeDasharray={`${lenAusentes} ${c - lenAusentes}`}
                    strokeDashoffset={offsetAusentes}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                )}
              </svg>

              {/* Centro com contagem */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 leading-tight">
                  {totalFuncionarios}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">Funcionários</span>
              </div>
            </div>

            {/* Legenda Lateral */}
            <div className="space-y-3 text-xs min-w-[130px]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-600 font-medium">Presentes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{presentes}</span>
                  <span className="text-slate-400 text-[11px] w-8 text-right">{pctPresentes}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-slate-600 font-medium">Atrasados</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{atrasados}</span>
                  <span className="text-slate-400 text-[11px] w-8 text-right">{pctAtrasados}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-slate-600 font-medium">Ausentes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{ausentes}</span>
                  <span className="text-slate-400 text-[11px] w-8 text-right">{pctAusentes}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela: Últimos registros de ponto */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-slate-900">Últimos registros de ponto</h3>
          <button
            onClick={onVerTodosRegistros}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
          >
            Ver todos <ArrowRight size={14} />
          </button>
        </div>

        {ultimosRegistros.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            Nenhum registro de ponto registrado hoje ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 font-semibold border-b border-slate-100 text-left">
                  <th className="pb-3 pr-4">Funcionário</th>
                  <th className="pb-3 pr-4">Entrada</th>
                  <th className="pb-3 pr-4">Saída</th>
                  <th className="pb-3 pr-4">Horas</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ultimosRegistros.map((item) => (
                  <tr
                    key={item.funcionarioId + item.data}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => onAbrirFuncionario(item.funcionarioId)}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <AvatarPhoto
                          photoUrl={item.fotoUrl}
                          name={item.nome}
                          className="w-9 h-9 border-slate-200"
                          textClassName="text-xs font-bold text-slate-700"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{item.nome}</p>
                          <p className="text-[11px] text-slate-400">{item.setor}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-700">
                      {hhmm(item.entrada)}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-700">
                      {hhmm(item.saida)}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-700">
                      {fmtHM(item.minutosTrabalhados)}
                    </td>
                    <td className="py-3 pr-4">{statusPill(item.status)}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAbrirFuncionario(item.funcionarioId);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
