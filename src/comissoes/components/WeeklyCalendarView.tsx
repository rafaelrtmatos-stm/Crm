import React, { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon,
  Plus, Edit2, Trash2, LayoutGrid, Table as TableIcon, Columns, Trash,
  DollarSign, Percent, CheckCircle2, TrendingUp, Clock, Sparkles, X, Copy, Check
} from 'lucide-react';
import { ServiceItem } from '../types';
import { formatCurrency } from '../utils/storage';
import { getTodayISO } from '../utils/dateHelpers';

interface WeeklyCalendarViewProps {
  services: ServiceItem[];
  onEditService: (service: ServiceItem) => void;
  onDeleteService: (id: string) => void;
  onOpenAddModalWithDate: (dateISO: string) => void;
  weeklyGoal?: number;
  // Vai direto pra Lixeira (aba Serviços) já aberta — antes só dava pra acessar a Lixeira
  // trocando manualmente pra aba Serviços e clicando lá.
  onGoToTrash?: () => void;
}

const WEEKDAYS = [
  { full: 'Segunda-feira', short: 'SEG', key: 'mon' },
  { full: 'Terça-feira', short: 'TER', key: 'tue' },
  { full: 'Quarta-feira', short: 'QUA', key: 'wed' },
  { full: 'Quinta-feira', short: 'QUI', key: 'thu' },
  { full: 'Sexta-feira', short: 'SEX', key: 'fri' },
  { full: 'Sábado', short: 'SÁB', key: 'sat' },
];

const noteKey = (s: ServiceItem) => s.origemNotaId || `service:${s.id}`;

export const WeeklyCalendarView: React.FC<WeeklyCalendarViewProps> = ({
  services, onEditService, onDeleteService, onOpenAddModalWithDate, weeklyGoal = 2500, onGoToTrash
}) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'columns' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayISO, setSelectedDayISO] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const todayISO = useMemo(() => getTodayISO(), []);

  const weekDaysData = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Segunda-feira da semana atual (getDay: 0=Dom...6=Sáb)
    const dayOfWeek = base.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMonday + weekOffset * 7);

    const standard = WEEKDAYS.map((info, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        ...info,
        dateISO: iso,
        dateFormatted: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        dateObject: d,
        isToday: iso === todayISO
      };
    });

    // Índice de hoje dentro de Seg-Sáb (se hoje for domingo, cai fora do range: mantém ordem padrão a partir de segunda)
    const todayIndexInWeek = dayOfWeek === 0 ? 0 : dayOfWeek - 1;
    const first = standard[todayIndexInWeek];
    const rest = [...standard.slice(todayIndexInWeek + 1), ...standard.slice(0, todayIndexInWeek)];
    return [first, ...rest];
  }, [weekOffset, todayISO]);

  const weekServicesByDay = useMemo(() => {
    const map: Record<string, ServiceItem[]> = {};
    weekDaysData.forEach(d => { map[d.dateISO] = []; });

    services.forEach(service => {
      if (!map[service.date]) return;
      const q = searchQuery.trim().toLowerCase();
      if (q && ![
        service.serviceType,
        service.vehicle || '',
        service.clientName || '',
        service.notes || ''
      ].some(v => v.toLowerCase().includes(q))) return;
      map[service.date].push(service);
    });
    return map;
  }, [services, weekDaysData, searchQuery]);

  const groupedByDayAndNote = (dateISO: string) => {
    const map = new Map<string, ServiceItem[]>();
    (weekServicesByDay[dateISO] || []).forEach(service => {
      const key = noteKey(service);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(service);
    });
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      items,
      noteId: items[0].origemNotaId,
      client: items[0].clientName || 'Cliente de Balcão',
      total: items.reduce((sum, s) => sum + s.productionValue, 0),
      commission: items.reduce((sum, s) => sum + s.commissionValue, 0)
    }));
  };

  const weeklyStats = useMemo(() => {
    let totalProd = 0, totalComm = 0, totalCount = 0;
    let busiestDayName = '—', max = -1;

    weekDaysData.forEach(day => {
      const list = weekServicesByDay[day.dateISO] || [];
      const prod = list.reduce((sum, s) => sum + s.productionValue, 0);
      const comm = list.reduce((sum, s) => sum + s.commissionValue, 0);
      totalProd += prod;
      totalComm += comm;
      totalCount += list.length;
      if (prod > max && list.length) {
        max = prod;
        busiestDayName = `${day.full} (${formatCurrency(prod)})`;
      }
    });

    return {
      totalProd, totalComm, totalCount, busiestDayName,
      goalProgress: weeklyGoal > 0 ? Math.min(100, totalProd / weeklyGoal * 100) : 0
    };
  }, [weekDaysData, weekServicesByDay, weeklyGoal]);

  const toggleNote = (key: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Copia o número da nota (código completo, não só os 6 últimos dígitos mostrados) pra
  // área de transferência — feedback visual rápido (ícone vira check por 1.5s).
  const [notaCopiada, setNotaCopiada] = useState<string | null>(null);
  const handleCopiarNota = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(noteId);
    setNotaCopiada(noteId);
    setTimeout(() => setNotaCopiada(prev => (prev === noteId ? null : prev)), 1500);
  };

  const renderNoteCard = (group: ReturnType<typeof groupedByDayAndNote>[number]) => {
    const open = expandedNotes.has(group.key);
    return (
      <div key={group.key} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] overflow-hidden">
        <div className="w-full p-3 flex items-center gap-3 hover:bg-[var(--bg-card)]">
          <button
            type="button"
            onClick={() => toggleNote(group.key)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            {open ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" /> : <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-xs text-[var(--text-main)] truncate">{group.client}</span>
                {group.noteId && (
                  <span
                    onClick={(e) => handleCopiarNota(e, group.noteId!)}
                    title="Copiar número da nota"
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer shrink-0"
                  >
                    NOTA #{group.noteId.slice(-6).toUpperCase()}
                    {notaCopiada === group.noteId
                      ? <Check className="w-3 h-3 text-emerald-400" />
                      : <Copy className="w-3 h-3" />}
                  </span>
                )}
                {!group.noteId && (
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">SERVIÇO AVULSO</span>
                )}
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">
                {group.items.length} {group.items.length === 1 ? 'serviço' : 'serviços'}
              </span>
            </div>
          </button>
          <span className="font-mono font-black text-xs text-[var(--text-main)]">
            {formatCurrency(group.total)}
          </span>
          {group.items.length === 1 ? (
            <button
              onClick={() => onDeleteService(group.items[0].id)}
              className="p-1.5 rounded-lg hover:bg-red-950/40 text-red-400 shrink-0"
              title="Excluir serviço"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => { if (confirm(`Excluir os ${group.items.length} serviços desta nota?`)) group.items.forEach(s => onDeleteService(s.id)); }}
              className="p-1.5 rounded-lg hover:bg-red-950/40 text-red-400 shrink-0"
              title="Excluir todos os serviços desta nota"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {open && (
          <div className="border-t border-[var(--border-color)] p-2 space-y-2">
            {group.items.map(service => (
              <div key={service.id} className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--text-main)]">{service.serviceType}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {service.quantity || 1} {service.unit || 'unidade'} · Comissão {formatCurrency(service.commissionValue)}
                  </p>
                </div>
                <span className="font-mono font-black text-xs">{formatCurrency(service.productionValue)}</span>
                <button onClick={() => onEditService(service)} className="p-1.5 rounded-lg hover:bg-[var(--accent-red)] hover:text-white">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDeleteService(service.id)} className="p-1.5 rounded-lg hover:bg-red-950/40 text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDay = (day: typeof weekDaysData[number]) => {
    const groups = groupedByDayAndNote(day.dateISO);
    const prod = groups.reduce((sum, g) => sum + g.total, 0);
    const comm = groups.reduce((sum, g) => sum + g.commission, 0);

    return (
      <div key={day.dateISO} className={`rounded-2xl border bg-[var(--bg-card)] overflow-hidden ${day.isToday ? 'border-[var(--accent-red)] shadow-red-glow' : 'border-[var(--border-color)]'}`}>
        <div className={`p-3 border-b border-[var(--border-color)] ${day.isToday ? 'bg-red-500/10' : 'bg-[var(--bg-card-sec)]'}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black uppercase">{day.short} {day.dateFormatted}</span>
            {day.isToday && <span className="text-[9px] font-black bg-[var(--accent-red)] text-white px-1.5 py-0.5 rounded">HOJE</span>}
          </div>
          <div className="mt-2 flex justify-between text-[10px]">
            <span className="text-[var(--text-muted)]">{groups.length} {groups.length === 1 ? 'nota' : 'notas'}</span>
            <span className="font-mono font-black">{formatCurrency(prod)}</span>
          </div>
        </div>

        <div className="p-2 space-y-2 min-h-[130px]">
          {!groups.length ? (
            <div className="min-h-[100px] flex items-center justify-center text-[11px] text-[var(--text-muted)]">
              Sem serviços
            </div>
          ) : groups.map(renderNoteCard)}
        </div>

        <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[var(--bg-card-sec)] flex justify-between">
          <span className="text-[10px] font-black uppercase text-[var(--text-muted)]">Comissão</span>
          <span className="text-xs font-mono font-black text-[var(--accent-red)]">{formatCurrency(comm)}</span>
        </div>
        <div className="p-2">
          <button
            onClick={() => onOpenAddModalWithDate(day.dateISO)}
            className="w-full py-1.5 rounded-xl border border-dashed border-[var(--border-color)] text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--accent-red)]"
          >
            <Plus className="w-3.5 h-3.5 inline mr-1" />Lançar no Dia
          </button>
        </div>
      </div>
    );
  };

  const sortedDays = [...weekDaysData].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const range = `${sortedDays[0]?.dateFormatted || ''} — ${sortedDays[sortedDays.length - 1]?.dateFormatted || ''}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-gradient-red text-white"><CalendarIcon className="w-5 h-5" /></span>
          <div>
            <h2 className="text-xl font-black uppercase">CALENDÁRIO SEMANAL</h2>
            <p className="text-xs text-[var(--text-muted)]">Notas agrupadas por dia e serviços agrupados por nota.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[var(--bg-card-sec)] p-1.5 rounded-xl border border-[var(--border-color)]">
          <button onClick={() => setWeekOffset(v => v - 1)} className="p-2 rounded-lg hover:bg-[var(--bg-card)]"><ChevronLeft className="w-5 h-5" /></button>
          <div className="px-3 text-center min-w-[180px]">
            <span className="text-xs font-black font-mono block">{range}</span>
            <span className="text-[10px] font-bold text-[var(--accent-red)]">
              {weekOffset === 0 ? 'SEMANA ATUAL' : weekOffset < 0 ? `${Math.abs(weekOffset)} SEMANA(S) ATRÁS` : `DAQUI A ${weekOffset} SEMANA(S)`}
            </span>
          </div>
          <button onClick={() => setWeekOffset(v => v + 1)} className="p-2 rounded-lg hover:bg-[var(--bg-card)]"><ChevronRight className="w-5 h-5" /></button>
          {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="px-2.5 py-1.5 rounded-lg bg-[var(--accent-red)] text-white text-[11px] font-bold">Esta Semana</button>}
        </div>

        <div className="flex items-center gap-2">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-32 sm:w-44 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-xs"
          />
          <div className="hidden sm:flex items-center p-1 bg-[var(--bg-card-sec)] rounded-xl border border-[var(--border-color)]">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-gradient-red text-white' : ''}`} title="Grade"><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('columns')} className={`p-2 rounded-lg ${viewMode === 'columns' ? 'bg-gradient-red text-white' : ''}`} title="Colunas"><Columns className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-gradient-red text-white' : ''}`} title="Tabela"><TableIcon className="w-4 h-4" /></button>
          </div>
          {onGoToTrash && (
            <button
              onClick={onGoToTrash}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-[var(--text-muted)] hover:text-red-400 hover:border-red-500/30 text-xs font-bold shrink-0"
              title="Ver serviços excluídos"
            >
              <Trash className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">LIXEIRA</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <span className="text-[10px] font-bold text-[var(--text-muted)] block">PRODUÇÃO DA SEMANA</span>
          <span className="text-2xl font-black font-mono">{formatCurrency(weeklyStats.totalProd)}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <span className="text-[10px] font-bold text-[var(--text-muted)] block">COMISSÃO DA SEMANA</span>
          <span className="text-2xl font-black font-mono text-[var(--accent-red)]">{formatCurrency(weeklyStats.totalComm)}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <span className="text-[10px] font-bold text-[var(--text-muted)] block">TOTAL DE SERVIÇOS</span>
          <span className="text-2xl font-black">{weeklyStats.totalCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]">
          <span className="text-[10px] font-bold text-[var(--text-muted)] block">PICO</span>
          <span className="text-sm font-bold">{weeklyStats.busiestDayName}</span>
        </div>
      </div>

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3 items-start">
          {weekDaysData.map(renderDay)}
        </div>
      )}

      {viewMode === 'columns' && (
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {weekDaysData.map(day => {
              const groups = groupedByDayAndNote(day.dateISO);
              const selected = selectedDayISO === day.dateISO;
              const total = groups.reduce((sum, g) => sum + g.total, 0);
              return (
                <button
                  key={day.dateISO}
                  onClick={() => setSelectedDayISO(selected ? null : day.dateISO)}
                  className={`p-2 rounded-xl border text-center ${selected ? 'border-[var(--accent-red)] bg-red-500/10' : 'border-[var(--border-color)] bg-[var(--bg-card)]'}`}
                >
                  <span className="text-[10px] font-black block">{day.short}</span>
                  <span className="text-[9px] text-[var(--text-muted)]">{day.dateFormatted}</span>
                  <span className="text-[10px] font-bold block mt-2">{groups.length} notas</span>
                  <span className="text-[9px] font-mono block">{formatCurrency(total)}</span>
                </button>
              );
            })}
          </div>
          {selectedDayISO && (
            <div className="rounded-2xl border border-[var(--accent-red)] bg-[var(--bg-card)] p-4 space-y-2">
              {groupedByDayAndNote(selectedDayISO).map(renderNoteCard)}
            </div>
          )}
        </div>
      )}

      {viewMode === 'table' && (
        <div className="space-y-4">
          {sortedDays.map(day => (
            <div key={day.dateISO} className="rounded-2xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-card)]">
              <div className="px-4 py-3 bg-[var(--bg-card-sec)] border-b border-[var(--border-color)] flex justify-between">
                <span className="font-black text-xs uppercase">{day.full} — {day.dateFormatted}</span>
                <span className="font-mono font-black text-xs">{formatCurrency((weekServicesByDay[day.dateISO] || []).reduce((s, x) => s + x.productionValue, 0))}</span>
              </div>
              <div className="p-2 space-y-2">
                {groupedByDayAndNote(day.dateISO).map(renderNoteCard)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
