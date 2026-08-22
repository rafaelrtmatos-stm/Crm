import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Search, Trash2, Edit2, CheckCircle2, Clock, XCircle, AlertCircle,
  Download, RotateCcw, ArrowLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import { ServiceItem, ServiceStatus, FilterOptions } from '../types';
import { formatCurrency, formatDateBR, formatTimeBR } from '../utils/storage';
import { getTodayISO } from '../utils/dateHelpers';

interface ServiceTableProps {
  services: ServiceItem[];
  baseSalary: number;
  onEditService: (service: ServiceItem) => void;
  onDeleteService: (id: string) => void;
  onOpenAddModal: () => void;
  highlightServiceId?: string | null;
  deletedServices?: ServiceItem[];
  isTrashOpen?: boolean;
  isLoadingTrash?: boolean;
  onToggleTrash?: () => void;
  onRestoreService?: (id: string) => void;
}

const groupKey = (s: ServiceItem) => s.origemNotaId || `avulso:${s.id}`;

export const ServiceTable: React.FC<ServiceTableProps> = ({
  services, baseSalary, onEditService, onDeleteService, onOpenAddModal,
  highlightServiceId, deletedServices = [], isTrashOpen = false,
  isLoadingTrash = false, onToggleTrash, onRestoreService
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'all', statusFilter: 'TODOS', searchQuery: ''
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightServiceId) return;
    setFilters({ dateRange: 'all', statusFilter: 'TODOS', searchQuery: '' });
    setActiveHighlightId(highlightServiceId);
    const timer = setTimeout(() => {
      rowRefs.current[highlightServiceId]?.scrollIntoView({
        behavior: 'smooth', block: 'center'
      });
    }, 50);
    const clear = setTimeout(() => setActiveHighlightId(null), 2500);
    return () => { clearTimeout(timer); clearTimeout(clear); };
  }, [highlightServiceId]);

  const filteredServices = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startWeek = new Date(today);
    startWeek.setDate(today.getDate() - today.getDay() + 1);
    const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return services
      .filter(item => {
        const q = filters.searchQuery.trim().toLowerCase();

        if (q && ![
          item.serviceType, item.vehicle || '', item.clientName || '', item.notes || ''
        ].some(v => v.toLowerCase().includes(q))) return false;

        if (filters.statusFilter !== 'TODOS' && item.status !== filters.statusFilter) return false;

        if (filters.dateRange !== 'all') {
          const d = new Date(`${item.date}T00:00:00`);
          if (filters.dateRange === 'today' && d < today) return false;
          if (filters.dateRange === 'week' && d < startWeek) return false;
          if (filters.dateRange === 'month' && d < startMonth) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return sortOrder === 'asc' ? da - db : db - da;
      });
  }, [services, filters, sortOrder]);

  const groups = useMemo(() => {
    const map = new Map<string, ServiceItem[]>();
    filteredServices.forEach(s => {
      const key = groupKey(s);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });

    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      items,
      noteId: items[0].origemNotaId,
      client: items[0].clientName || 'Cliente de Balcão',
      date: items[0].date,
      total: items.reduce((sum, s) => sum + s.productionValue, 0),
      commission: items.reduce((sum, s) => sum + s.commissionValue, 0)
    }));
  }, [filteredServices]);

  const totals = useMemo(() => ({
    production: filteredServices
      .filter(s => s.status !== 'CANCELADO')
      .reduce((sum, s) => sum + s.productionValue, 0),
    commission: filteredServices
      .filter(s => s.status !== 'CANCELADO')
      .reduce((sum, s) => sum + s.commissionValue, 0)
  }), [filteredServices]);

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const exportCSV = () => {
    const headers = [
      'Data', 'Cliente', 'Veículo', 'Serviço', 'Valor Produção',
      'Comissão %', 'Valor Comissão', 'Status', 'Observações'
    ];
    const rows = filteredServices.map(s => [
      s.date,
      `"${(s.clientName || '').replace(/"/g, '""')}"`,
      `"${(s.vehicle || '').replace(/"/g, '""')}"`,
      `"${s.serviceType.replace(/"/g, '""')}"`,
      s.productionValue.toFixed(2),
      s.commissionPercent.toFixed(1),
      s.commissionValue.toFixed(2),
      s.status,
      `"${(s.notes || '').replace(/"/g, '""')}"`
    ]);
    const csv = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `relatorio_comissoes_${getTodayISO()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusBadge = (status: ServiceStatus) => {
    if (status === 'CONCLUÍDO') return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3" /> CONCLUÍDO
      </span>
    );
    if (status === 'EM PRODUÇÃO') return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
        <Clock className="w-3 h-3" /> EM PRODUÇÃO
      </span>
    );
    if (status === 'CANCELADO') return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-red-950/40 text-red-400 border border-red-800/40">
        <XCircle className="w-3 h-3" /> CANCELADO
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <Clock className="w-3 h-3" /> PENDENTE
      </span>
    );
  };

  const renderGroup = (group: typeof groups[number]) => {
    const open = expanded.has(group.key);
    return (
      <div
        key={group.key}
        ref={el => {
          if (group.items.some(s => s.id === highlightServiceId)) {
            rowRefs.current[highlightServiceId!] = el;
          }
        }}
        className={`rounded-2xl border bg-[var(--bg-card)] overflow-hidden ${
          group.items.some(s => s.id === activeHighlightId)
            ? 'border-[var(--accent-red)] ring-2 ring-[var(--accent-red)]'
            : 'border-[var(--border-color)]'
        }`}
      >
        <button
          type="button"
          onClick={() => toggle(group.key)}
          className="w-full p-4 flex items-center gap-3 text-left hover:bg-[var(--bg-card-sec)]"
        >
          {open
            ? <ChevronDown className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
            : <ChevronRight className="w-5 h-5 text-[var(--text-muted)] shrink-0" />}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black text-sm text-[var(--text-main)]">
                {group.noteId ? `NOTA #${group.noteId.slice(-6).toUpperCase()}` : 'SERVIÇOS AVULSOS'}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {group.client}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-[10px] text-[var(--text-muted)]">
              <span>{group.items.length} {group.items.length === 1 ? 'serviço' : 'serviços'}</span>
              <span>{formatDateBR(group.date)}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="block text-[10px] uppercase text-[var(--text-muted)]">Produção</span>
            <span className="font-mono font-black text-sm">{formatCurrency(group.total)}</span>
          </div>
        </button>

        {open && (
          <div className="border-t border-[var(--border-color)] p-3 space-y-2">
            {group.items.map(item => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs">{item.serviceType}</span>
                    {statusBadge(item.status)}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">
                    {item.vehicle || 'Sem veículo'} · {item.quantity || 1} {item.unit || 'unidade'}
                  </div>
                  {item.notes && (
                    <div className="text-[10px] text-[var(--text-muted)] italic mt-1">
                      {item.notes}
                    </div>
                  )}
                </div>

                <div className="text-right font-mono shrink-0">
                  <div className="font-black text-sm">{formatCurrency(item.productionValue)}</div>
                  <div className="text-[10px] text-[var(--accent-red)] font-bold">
                    Comissão: {formatCurrency(item.commissionValue)} ({item.commissionPercent}%)
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onEditService(item)}
                    className="p-1.5 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-red)]"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteService(item.id)}
                    className="p-1.5 rounded-lg border border-[var(--border-color)] hover:border-red-500 text-red-400"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center px-2 pt-2 border-t border-[var(--border-color)] text-xs">
              <span className="font-bold text-[var(--text-muted)]">COMISSÃO DA NOTA</span>
              <span className="font-black text-[var(--accent-red)]">{formatCurrency(group.commission)}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-[var(--text-muted)]" />
              <input
                value={filters.searchQuery}
                onChange={e => setFilters({ ...filters, searchQuery: e.target.value })}
                placeholder="Buscar por nota, cliente, serviço, veículo..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1 bg-[var(--bg-card-sec)] p-1 rounded-xl border border-[var(--border-color)]">
            {([
              ['today', 'Hoje'],
              ['week', 'Semana'],
              ['month', 'Mês'],
              ['all', 'Todos']
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilters({ ...filters, dateRange: value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  filters.dateRange === value ? 'bg-gradient-red text-white' : 'text-[var(--text-muted)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSortOrder(v => v === 'desc' ? 'asc' : 'desc')}
            className="px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-xs font-bold"
          >
            Data {sortOrder === 'desc' ? '↓' : '↑'}
          </button>

          <button
            onClick={exportCSV}
            className="px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5 inline mr-1" />CSV
          </button>

          {onToggleTrash && (
            <button
              onClick={onToggleTrash}
              className="px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-xs font-bold"
            >
              {isTrashOpen
                ? <><ArrowLeft className="w-3.5 h-3.5 inline mr-1" />Voltar</>
                : <><Trash2 className="w-3.5 h-3.5 inline mr-1" />Lixeira</>}
            </button>
          )}
        </div>

        {!isTrashOpen && (
          <div className="flex justify-between text-xs text-[var(--text-muted)] border-t border-[var(--border-color)] pt-3">
            <span>{groups.length} cards · {filteredServices.length} serviços</span>
            <span>
              Produção: <b>{formatCurrency(totals.production)}</b>
              {' · '}
              Comissão: <b className="text-[var(--accent-red)]">{formatCurrency(totals.commission)}</b>
            </span>
          </div>
        )}
      </div>

      {isTrashOpen ? (
        <div className="space-y-3">
          {isLoadingTrash ? (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">Carregando lixeira...</div>
          ) : deletedServices.length === 0 ? (
            <div className="p-8 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl">
              <Trash2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-bold">Lixeira vazia</p>
            </div>
          ) : deletedServices.map(item => (
            <div key={item.id} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center gap-3 opacity-75">
              <Trash2 className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm">{item.serviceType}</p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {formatDateBR(item.date)} · {formatCurrency(item.productionValue)}
                </p>
              </div>
              {onRestoreService && (
                <button
                  onClick={() => onRestoreService(item.id)}
                  className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1" />Restaurar
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          {groups.length === 0 ? (
            <div className="p-10 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-[var(--text-muted)]">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-bold">Nenhum serviço encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">{groups.map(renderGroup)}</div>
          )}
        </>
      )}
    </div>
  );
};
