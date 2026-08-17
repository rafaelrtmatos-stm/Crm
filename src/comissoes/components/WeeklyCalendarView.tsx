import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Edit2,
  Trash2,
  LayoutGrid,
  Table as TableIcon,
  Columns,
  DollarSign,
  Percent,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowUpRight,
  Filter,
  X,
} from 'lucide-react';
import { ServiceItem } from '../types';
import { formatCurrency, formatDateBR } from '../utils/storage';

interface WeeklyCalendarViewProps {
  services: ServiceItem[];
  onEditService: (service: ServiceItem) => void;
  onDeleteService: (id: string) => void;
  onOpenAddModalWithDate: (dateISO: string) => void;
  weeklyGoal?: number;
}

const WEEKDAYS = [
  { full: 'Domingo', short: 'DOM', key: 'sun' },
  { full: 'Segunda-feira', short: 'SEG', key: 'mon' },
  { full: 'Terça-feira', short: 'TER', key: 'tue' },
  { full: 'Quarta-feira', short: 'QUA', key: 'wed' },
  { full: 'Quinta-feira', short: 'QUI', key: 'thu' },
  { full: 'Sexta-feira', short: 'SEX', key: 'fri' },
  { full: 'Sábado', short: 'SÁB', key: 'sat' },
];

export const WeeklyCalendarView: React.FC<WeeklyCalendarViewProps> = ({
  services,
  onEditService,
  onDeleteService,
  onOpenAddModalWithDate,
  weeklyGoal = 2500,
}) => {
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'grid' | 'columns' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null);

  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Calculate days of the selected week, putting TODAY's weekday first
  const weekDaysData = useMemo(() => {
    const now = new Date();
    // Set to current local midnight
    const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Find current Sunday (semana começa no domingo: 0 = Dom, 1 = Seg, ..., 6 = Sáb)
    const currentDay = baseDate.getDay();
    const distanceToSunday = -currentDay;

    const sunday = new Date(baseDate);
    sunday.setDate(baseDate.getDate() + distanceToSunday + weekOffset * 7);

    const standardDays = WEEKDAYS.map((dayInfo, index) => {
      const dayDate = new Date(sunday);
      dayDate.setDate(sunday.getDate() + index);

      const year = dayDate.getFullYear();
      const month = String(dayDate.getMonth() + 1).padStart(2, '0');
      const day = String(dayDate.getDate()).padStart(2, '0');
      const isoString = `${year}-${month}-${day}`;

      const formattedShort = `${day}/${month}`;
      const isToday = isoString === todayISO;

      return {
        ...dayInfo,
        dateISO: isoString,
        dateFormatted: formattedShort,
        dateObject: dayDate,
        isToday,
      };
    });

    // Reorder so that TODAY's weekday (e.g. Terça) comes FIRST,
    // followed by the remaining days in standard Mon-Sun order.
    const todayIndex = currentDay === 0 ? 6 : currentDay - 1;
    const firstDay = standardDays[todayIndex];
    const remainingDays = standardDays.filter((_, idx) => idx !== todayIndex);

    return [firstDay, ...remainingDays];
  }, [weekOffset, todayISO]);

  // Week range labels sorted by date for accurate header range string
  const sortedByDateDays = useMemo(() => {
    return [...weekDaysData].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  }, [weekDaysData]);

  const weekStartDateFormatted = sortedByDateDays[0]?.dateFormatted || '';
  const weekEndDateFormatted = sortedByDateDays[6]?.dateFormatted || '';
  const weekYear = sortedByDateDays[0]?.dateObject.getFullYear() || new Date().getFullYear();

  // Filter services belonging to these 7 days
  const weekServicesByDay = useMemo(() => {
    const map: { [dateISO: string]: ServiceItem[] } = {};

    weekDaysData.forEach((day) => {
      map[day.dateISO] = [];
    });

    services.forEach((service) => {
      if (map[service.date]) {
        if (!searchQuery || 
            service.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (service.vehicle && service.vehicle.toLowerCase().includes(searchQuery.toLowerCase()))
        ) {
          map[service.date].push(service);
        }
      }
    });

    return map;
  }, [services, weekDaysData, searchQuery]);

  // Weekly Stats Aggregation
  const weeklyStats = useMemo(() => {
    let totalProd = 0;
    let totalComm = 0;
    let totalCount = 0;
    let busiestDayName = '—';
    let maxDayProd = -1;

    weekDaysData.forEach((day) => {
      const dayList = weekServicesByDay[day.dateISO] || [];
      const dayProd = dayList.reduce((acc, s) => acc + s.productionValue, 0);
      const dayComm = dayList.reduce((acc, s) => acc + s.commissionValue, 0);

      totalProd += dayProd;
      totalComm += dayComm;
      totalCount += dayList.length;

      if (dayProd > maxDayProd && dayList.length > 0) {
        maxDayProd = dayProd;
        busiestDayName = `${day.full} (${formatCurrency(dayProd)})`;
      }
    });

    const goalProgress = weeklyGoal > 0 ? Math.min(100, (totalProd / weeklyGoal) * 100) : 0;

    return {
      totalProd,
      totalComm,
      totalCount,
      busiestDayName,
      goalProgress,
    };
  }, [weekDaysData, weekServicesByDay, weeklyGoal]);

  return (
    <div className="space-y-6">
      {/* Header Title & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm">
        
        {/* Left: Title */}
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-red text-white shadow-red-glow">
              <CalendarIcon className="w-5 h-5 stroke-[2.5]" />
            </span>
            <h2 className="text-xl font-black uppercase tracking-tight text-[var(--text-main)]">
              CALENDÁRIO & TABELA SEMANAL
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] font-medium mt-1">
            Acompanhe a produção e comissões organizadas dia a dia da semana
          </p>
        </div>

        {/* Center: Week Navigation Controls */}
        <div className="flex items-center gap-2 bg-[var(--bg-card-sec)] p-1.5 rounded-xl border border-[var(--border-color)]">
          <button
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
            title="Semana Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="px-3 text-center min-w-[200px]">
            <span className="text-xs font-black font-mono text-[var(--text-main)] block">
              {weekStartDateFormatted} — {weekEndDateFormatted} / {weekYear}
            </span>
            <span className="text-[10px] font-bold text-[var(--accent-red)] uppercase tracking-wider block">
              {weekOffset === 0 ? 'SEMANA ATUAL' : weekOffset < 0 ? `${Math.abs(weekOffset)} SEMANA(S) ATRÁS` : `DAQUI A ${weekOffset} SEMANA(S)`}
            </span>
          </div>

          <button
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
            title="Próxima Semana"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="ml-1 px-2.5 py-1.5 rounded-lg bg-[var(--accent-red)] text-white text-[11px] font-bold hover:brightness-110 transition-all cursor-pointer shadow-red-glow"
            >
              Esta Semana
            </button>
          )}
        </div>

        {/* Right: View Mode & Search */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-[var(--bg-card-sec)] rounded-xl border border-[var(--border-color)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-gradient-red text-white shadow-red-glow'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
              title="Grade (7 Dias)"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grade</span>
            </button>

            <button
              onClick={() => setViewMode('columns')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'columns'
                  ? 'bg-gradient-red text-white shadow-red-glow'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
              title="Colunas Laterais (Carrossel)"
            >
              <Columns className="w-4 h-4" />
              <span className="hidden sm:inline">Colunas Laterais</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-gradient-red text-white shadow-red-glow'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
              title="Tabela por Dia"
            >
              <TableIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Tabela</span>
            </button>
          </div>
        </div>

      </div>

      {/* Weekly Totals Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Produção na Semana */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                PRODUÇÃO DA SEMANA
              </span>
              <span className="text-2xl font-black text-[var(--text-main)] font-mono mt-0.5 block">
                {formatCurrency(weeklyStats.totalProd)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-red-500/10 text-[var(--accent-red)]">
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] font-medium pt-2 border-t border-[var(--border-color)] flex justify-between items-center">
            <span>Meta Semanal ({formatCurrency(weeklyGoal)}):</span>
            <span className="font-bold text-[var(--accent-red)] font-mono">{weeklyStats.goalProgress.toFixed(0)}%</span>
          </div>
        </div>

        {/* Card 2: Comissão na Semana */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                COMISSÃO DA SEMANA
              </span>
              <span className="text-2xl font-black text-[var(--accent-red)] font-mono mt-0.5 block">
                {formatCurrency(weeklyStats.totalComm)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-gradient-red text-white shadow-red-glow">
              <Percent className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] font-medium pt-2 border-t border-[var(--border-color)] flex justify-between items-center">
            <span>Rendimento Direto</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 100% Acumulado
            </span>
          </div>
        </div>

        {/* Card 3: Total de Serviços */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                TOTAL DE ATENDIMENTOS
              </span>
              <span className="text-2xl font-black text-[var(--text-main)] font-mono mt-0.5 block">
                {weeklyStats.totalCount} <span className="text-xs font-semibold text-[var(--text-muted)]">serviços</span>
              </span>
            </div>
            <div className="p-2 rounded-xl bg-[var(--bg-card-sec)] text-[var(--text-main)] border border-[var(--border-color)]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] font-medium pt-2 border-t border-[var(--border-color)]">
            Média por dia ativo: <strong className="text-[var(--text-main)]">{(weeklyStats.totalProd / Math.max(1, weeklyStats.totalCount)).toFixed(0)} R$/serv</strong>
          </div>
        </div>

        {/* Card 4: Dia de Maior Destaque */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                PICO DE PRODUÇÃO
              </span>
              <span className="text-sm font-bold text-[var(--text-main)] mt-1 block truncate max-w-[180px]">
                {weeklyStats.busiestDayName}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] font-medium pt-2 border-t border-[var(--border-color)]">
            Dia mais rentável da semana
          </div>
        </div>
      </div>

      {/* MODE A: 7-DAY CALENDAR GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
          {weekDaysData.map((day) => {
            const dayServices = weekServicesByDay[day.dateISO] || [];
            const dayProdTotal = dayServices.reduce((acc, s) => acc + s.productionValue, 0);
            const dayCommTotal = dayServices.reduce((acc, s) => acc + s.commissionValue, 0);

            return (
              <div
                key={day.dateISO}
                className={`flex flex-col rounded-2xl border transition-all bg-[var(--bg-card)] ${
                  day.isToday
                    ? 'border-[var(--accent-red)] shadow-red-glow'
                    : 'border-[var(--border-color)]'
                }`}
              >
                {/* Day Header */}
                <div
                  className={`p-3 rounded-t-2xl border-b ${
                    day.isToday
                      ? 'bg-red-500/10 border-red-500/30 text-[var(--text-main)]'
                      : 'bg-[var(--bg-card-sec)] border-[var(--border-color)] text-[var(--text-main)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
                      {day.short}
                      {day.isToday && (
                        <span className="ml-1 px-1.5 py-0.2 text-[9px] font-black uppercase bg-[var(--accent-red)] text-white rounded">
                          HOJE
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-mono font-bold text-[var(--text-muted)]">
                      {day.dateFormatted}
                    </span>
                  </div>

                  {/* Day Subtotal */}
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Total Dia:</span>
                    <span className="font-mono font-black text-[var(--text-main)]">
                      {formatCurrency(dayProdTotal)}
                    </span>
                  </div>
                </div>

                {/* Services List for Day */}
                <div className="p-2 space-y-2 flex-1 min-h-[160px] max-h-[500px] overflow-y-auto custom-scrollbar">
                  {dayServices.length === 0 ? (
                    <div className="h-full min-h-[120px] flex flex-col items-center justify-center p-3 text-center border-2 border-dashed border-[var(--border-color)]/50 rounded-xl my-1">
                      <Clock className="w-5 h-5 text-[var(--text-muted)] opacity-30 mb-1" />
                      <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                        Sem serviços
                      </span>
                    </div>
                  ) : (
                    dayServices.map((service) => (
                      <div
                        key={service.id}
                        className="p-2.5 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)] hover:border-[var(--accent-red)]/50 transition-all group relative flex flex-col justify-between gap-1.5"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold text-[var(--text-main)] leading-snug line-clamp-2">
                            {service.serviceType}
                          </h4>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                            <button
                              onClick={() => onEditService(service)}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-white hover:bg-[var(--accent-red)] transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDeleteService(service.id)}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-950/40 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono pt-1.5 border-t border-[var(--border-color)]/60">
                          <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Valor:</span>
                          <span className="font-extrabold text-[var(--text-main)]">
                            {formatCurrency(service.productionValue)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Day Total Sum Footer */}
                <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[var(--bg-card-sec)] flex items-center justify-between font-mono">
                  <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                    SOMA DO DIA:
                  </span>
                  <span className="text-xs font-black text-[var(--text-main)]">
                    {formatCurrency(dayProdTotal)}
                  </span>
                </div>

                {/* Footer: Quick Add for Day */}
                <div className="p-2 border-t border-[var(--border-color)] bg-[var(--bg-card-sec)]/50 rounded-b-2xl">
                  <button
                    onClick={() => onOpenAddModalWithDate(day.dateISO)}
                    className="w-full py-1.5 px-2 rounded-xl border border-dashed border-[var(--border-color)] hover:border-[var(--accent-red)] text-[var(--text-muted)] hover:text-[var(--accent-red)] text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer hover:bg-[var(--bg-card)]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lançar no Dia</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODE C: SLIM 7-COLUMNS SIDE-BY-SIDE VIEW */}
      {viewMode === 'columns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-bold px-1">
            <span className="flex items-center gap-1.5 text-[var(--accent-red)]">
              <Sparkles className="w-3.5 h-3.5" />
              Visão de 7 Colunas Resumidas — toque em um dia para ver o detalhamento completo
            </span>
            <span className="text-[11px] font-mono hidden sm:inline">Selecione para expandir</span>
          </div>

          {/* 7 Columns Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 w-full">
            {weekDaysData.map((day) => {
              const dayServices = weekServicesByDay[day.dateISO] || [];
              const dayProdTotal = dayServices.reduce((acc, s) => acc + s.productionValue, 0);
              const isSelected = selectedDayISO === day.dateISO;

              return (
                <div
                  key={day.dateISO}
                  onClick={() => setSelectedDayISO(isSelected ? null : day.dateISO)}
                  className={`flex flex-col justify-between rounded-lg sm:rounded-xl border transition-all cursor-pointer min-w-0 p-1.5 sm:p-2.5 min-h-[130px] sm:min-h-[150px] text-center select-none ${
                    isSelected
                      ? 'border-2 border-[var(--accent-red)] shadow-red-lg-glow bg-red-500/15 scale-[1.02]'
                      : day.isToday
                      ? 'border-[var(--accent-red)] bg-red-500/5 hover:bg-red-500/10'
                      : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-red)]/50 hover:bg-[var(--bg-card-sec)]'
                  }`}
                >
                  {/* Day Header */}
                  <div>
                    <div className="font-black text-[10px] sm:text-xs uppercase tracking-tight truncate text-[var(--text-main)]">
                      {day.short}
                    </div>
                    <div className="text-[9px] sm:text-[11px] font-mono font-bold text-[var(--text-muted)]">
                      {day.dateFormatted}
                    </div>
                    {day.isToday && (
                      <span className="inline-block mt-0.5 px-1 py-0.2 text-[8px] font-black uppercase bg-[var(--accent-red)] text-white rounded-sm">
                        HOJE
                      </span>
                    )}
                  </div>

                  {/* Summary Indicator Body */}
                  <div className="my-2 flex flex-col items-center justify-center gap-1">
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold font-mono ${
                        dayServices.length > 0
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-[var(--bg-card-sec)] text-[var(--text-muted)] border border-[var(--border-color)]'
                      }`}
                    >
                      {dayServices.length} {dayServices.length === 1 ? 'serv' : 'servs'}
                    </span>
                    <span className="text-[8px] text-[var(--text-muted)] font-semibold hidden sm:inline">
                      {isSelected ? 'Aberto ▲' : 'Toque ▼'}
                    </span>
                  </div>

                  {/* Day Total Footer */}
                  <div className="pt-1.5 border-t border-[var(--border-color)]/60">
                    <span className="text-[8px] sm:text-[9px] font-black uppercase text-[var(--text-muted)] block tracking-tight">
                      SOMA DO DIA
                    </span>
                    <span
                      className={`font-mono font-black text-[9px] sm:text-xs truncate block ${
                        dayProdTotal > 0 ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {formatCurrency(dayProdTotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expanded Day Details Panel */}
          {selectedDayISO && (() => {
            const activeDay = weekDaysData.find((d) => d.dateISO === selectedDayISO);
            if (!activeDay) return null;

            const activeServices = weekServicesByDay[activeDay.dateISO] || [];
            const activeProdTotal = activeServices.reduce((acc, s) => acc + s.productionValue, 0);
            const activeCommTotal = activeServices.reduce((acc, s) => acc + s.commissionValue, 0);

            return (
              <div className="mt-4 p-4 sm:p-5 rounded-2xl border-2 border-[var(--accent-red)] bg-[var(--bg-card)] shadow-red-lg-glow animate-fadeIn space-y-4">
                {/* Header of Detail Panel */}
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-[var(--accent-red)]" />
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-[var(--text-main)] flex items-center gap-2">
                        {activeDay.full}, {activeDay.dateFormatted}
                        {activeDay.isToday && (
                          <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-[var(--accent-red)] text-white rounded-full">
                            HOJE
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        Detalhamento completo dos serviços do dia
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedDayISO(null)}
                    className="p-1.5 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-red)] transition-all cursor-pointer"
                    title="Fechar Detalhes"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Day Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Soma Produção</span>
                    <span className="text-sm sm:text-base font-black font-mono text-[var(--text-main)]">
                      {formatCurrency(activeProdTotal)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Comissão do Dia</span>
                    <span className="text-sm sm:text-base font-black font-mono text-[var(--accent-red)]">
                      {formatCurrency(activeCommTotal)}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)]">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">Atendimentos</span>
                    <span className="text-sm sm:text-base font-black text-[var(--text-main)]">
                      {activeServices.length} {activeServices.length === 1 ? 'serviço' : 'serviços'}
                    </span>
                  </div>
                </div>

                {/* Services List Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Serviços Realizados:
                  </h4>
                  {activeServices.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-card-sec)]/30">
                      <Clock className="w-8 h-8 text-[var(--text-muted)] opacity-30 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-[var(--text-muted)]">
                        Nenhum serviço registrado nesta data.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                      {activeServices.map((service) => (
                        <div
                          key={service.id}
                          className="p-3.5 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)] hover:border-[var(--accent-red)]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs sm:text-sm text-[var(--text-main)]">
                                {service.serviceType}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  service.status === 'CONCLUÍDO'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : service.status === 'EM PRODUÇÃO'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : service.status === 'PENDENTE'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}
                              >
                                {service.status || 'CONCLUÍDO'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-mono">
                              <span>Qtd/Un: {service.quantity} {service.unit}</span>
                              <span>•</span>
                              <span>Preço Un: {formatCurrency(service.unitPrice)}</span>
                            </div>

                            {service.notes && (
                              <p className="text-[11px] text-[var(--text-muted)] italic">
                                "{service.notes}"
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-color)]">
                            <div className="text-right font-mono">
                              <div className="text-xs sm:text-sm font-black text-[var(--text-main)]">
                                {formatCurrency(service.productionValue)}
                              </div>
                              <div className="text-[10px] text-[var(--accent-red)] font-bold">
                                Comissão: {formatCurrency(service.commissionValue)} ({service.commissionPercent}%)
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => onEditService(service)}
                                className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-red)] text-[var(--text-muted)] hover:text-white transition-all cursor-pointer"
                                title="Editar Serviço"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteService(service.id)}
                                className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-red-500 text-[var(--text-muted)] hover:text-red-400 transition-all cursor-pointer"
                                title="Excluir Serviço"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Add Button */}
                <div className="pt-2 border-t border-[var(--border-color)]">
                  <button
                    onClick={() => onOpenAddModalWithDate(activeDay.dateISO)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-red text-white text-xs font-bold flex items-center justify-center gap-2 shadow-red-glow hover:brightness-110 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Lançar Novo Serviço em {activeDay.full} ({activeDay.dateFormatted})</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* MODE B: GROUPED TABLE VIEW BY DAY */}
      {viewMode === 'table' && (
        <div className="space-y-4">
          {weekDaysData.map((day) => {
            const dayServices = weekServicesByDay[day.dateISO] || [];
            const dayProdTotal = dayServices.reduce((acc, s) => acc + s.productionValue, 0);
            const dayCommTotal = dayServices.reduce((acc, s) => acc + s.commissionValue, 0);

            return (
              <div
                key={day.dateISO}
                className={`rounded-2xl border overflow-hidden bg-[var(--bg-card)] ${
                  day.isToday ? 'border-[var(--accent-red)] shadow-red-glow' : 'border-[var(--border-color)]'
                }`}
              >
                {/* Day Header Row */}
                <div
                  className={`px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b ${
                    day.isToday
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-[var(--bg-card-sec)] border-[var(--border-color)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black uppercase tracking-wider text-[var(--text-main)]">
                      {day.full}
                    </span>
                    <span className="text-xs font-mono font-bold text-[var(--text-muted)]">
                      — {day.dateFormatted}
                    </span>
                    {day.isToday && (
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-[var(--accent-red)] text-white rounded-md">
                        HOJE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-[var(--text-muted)]">Produção: </span>
                      <strong className="text-[var(--text-main)] font-black">
                        {formatCurrency(dayProdTotal)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Comissão: </span>
                      <strong className="text-[var(--accent-red)] font-black">
                        {formatCurrency(dayCommTotal)}
                      </strong>
                    </div>
                    <button
                      onClick={() => onOpenAddModalWithDate(day.dateISO)}
                      className="px-3 py-1 rounded-lg bg-gradient-red text-white text-[11px] font-bold flex items-center gap-1 shadow-red-glow hover:brightness-110 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar neste dia</span>
                    </button>
                  </div>
                </div>

                {/* Day Services Table */}
                {dayServices.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[var(--text-muted)] font-medium">
                    Nenhum serviço registrado para {day.full} ({day.dateFormatted}).
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-card-sec)]/50">
                          <th className="py-2.5 px-4">Serviço Realizado</th>
                          <th className="py-2.5 px-4 text-right">Valor (R$)</th>
                          <th className="py-2.5 px-4 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)] text-xs font-medium">
                        {dayServices.map((item) => (
                          <tr key={item.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                            <td className="py-3 px-4 font-extrabold text-[var(--text-main)]">
                              {item.serviceType}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-[var(--text-main)] text-sm">
                              {formatCurrency(item.productionValue)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => onEditService(item)}
                                  className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-[var(--text-muted)] hover:text-white hover:bg-[var(--accent-red)] transition-all cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteService(item.id)}
                                  className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-[var(--text-muted)] hover:text-red-400 hover:bg-red-950/40 transition-all cursor-pointer"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-[var(--bg-card-sec)] border-t-2 border-[var(--border-color)]">
                        <tr>
                          <td className="py-2.5 px-4 text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                            SOMA TOTAL DO DIA
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-black text-sm text-[var(--text-main)]">
                            {formatCurrency(dayProdTotal)}
                          </td>
                          <td className="py-2.5 px-4"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
