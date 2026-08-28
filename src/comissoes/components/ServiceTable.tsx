import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Plus,
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
  // Id de um serviço específico pra rolar até a linha dele e destacar -- usado quando
  // se chega nessa aba a partir de um clique num item da lista "Serviços no Período"
  // do Dashboard (ver Dashboard.tsx / onGoToServiceInTable).
  highlightServiceId?: string | null;
}

export const ServiceTable: React.FC<ServiceTableProps> = ({
  services,
  baseSalary,
  onEditService,
  onDeleteService,
  onOpenAddModal,
  highlightServiceId,
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'all',
    statusFilter: 'TODOS',
    searchQuery: '',
  });

  const [sortField, setSortField] = useState<'date' | 'productionValue'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Linha destacada momentaneamente ao chegar via "ir pro serviço na planilha".
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!highlightServiceId) return;
    // Garante que a linha apareça mesmo se havia filtro/busca de uma visita anterior.
    setFilters({ dateRange: 'all', statusFilter: 'TODOS', searchQuery: '' });
    setActiveHighlightId(highlightServiceId);
    const scrollTimer = setTimeout(() => {
      rowRefs.current[highlightServiceId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    const clearTimer = setTimeout(() => setActiveHighlightId(null), 2500);
    return () => { clearTimeout(scrollTimer); clearTimeout(clearTimer); };
  }, [highlightServiceId]);

  // Helper date comparisons
  const filteredServices = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    return services.filter((item) => {
      // 1. Text Search
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesVehicle = (item.vehicle || '').toLowerCase().includes(query);
        const matchesType = item.serviceType.toLowerCase().includes(query);
        const matchesObs = (item.notes || '').toLowerCase().includes(query);
        if (!matchesVehicle && !matchesType && !matchesObs) {
          return false;
        }
      }

      // 2. Status Filter
      if (filters.statusFilter !== 'TODOS' && item.status !== filters.statusFilter) {
        return false;
      }

      // 3. Date Range
      if (filters.dateRange !== 'all') {
        const itemDate = new Date(item.date + 'T00:00:00');
        if (filters.dateRange === 'today') {
          if (itemDate < today) return false;
        } else if (filters.dateRange === 'week') {
          if (itemDate < startOfWeek) return false;
        } else if (filters.dateRange === 'month') {
          if (itemDate < startOfMonth) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [services, filters, sortField, sortOrder]);

  // Totals calculations for filtered view
  const totals = useMemo(() => {
    const active = filteredServices.filter((s) => s.status !== 'CANCELADO');
    const totalProd = active.reduce((sum, s) => sum + s.productionValue, 0);
    const totalComm = active.reduce((sum, s) => sum + s.commissionValue, 0);
    const totalForecast = baseSalary + totalComm;

    return {
      totalProduction: totalProd,
      totalCommission: totalComm,
      totalForecast,
      count: filteredServices.length,
    };
  }, [filteredServices, baseSalary]);

  // Export CSV functionality
  const handleExportCSV = () => {
    const headers = [
      'Data',
      'Veículo',
      'Serviço',
      'Valor Produção (R$)',
      'Comissão (%)',
      'Valor Comissão (R$)',
      'Status',
      'Observações',
    ];

    const rows = filteredServices.map((s) => [
      s.date,
      `"${(s.vehicle || '').replace(/"/g, '""')}"`,
      `"${s.serviceType.replace(/"/g, '""')}"`,
      s.productionValue.toFixed(2),
      s.commissionPercent.toFixed(1),
      s.commissionValue.toFixed(2),
      s.status,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_comissoes_${getTodayISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: ServiceStatus) => {
    switch (status) {
      case 'CONCLUÍDO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> CONCLUÍDO
          </span>
        );
      case 'EM PRODUÇÃO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Clock className="w-3.5 h-3.5" /> EM PRODUÇÃO
          </span>
        );
      case 'PENDENTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> PENDENTE
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-950/40 text-red-400 border border-red-800/40">
            <XCircle className="w-3.5 h-3.5" /> CANCELADO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Buscar por serviço, veículo ou observação..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)] font-medium"
            />
          </div>

          {/* Quick Date Range Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-[var(--bg-card-sec)] p-1 rounded-xl border border-[var(--border-color)] text-xs font-semibold">
              <button
                onClick={() => setFilters({ ...filters, dateRange: 'today' })}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filters.dateRange === 'today'
                    ? 'bg-gradient-red text-white'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Hoje
              </button>

              <button
                onClick={() => setFilters({ ...filters, dateRange: 'week' })}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filters.dateRange === 'week'
                    ? 'bg-gradient-red text-white'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Esta Semana
              </button>

              <button
                onClick={() => setFilters({ ...filters, dateRange: 'month' })}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filters.dateRange === 'month'
                    ? 'bg-gradient-red text-white'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Este Mês
              </button>

              <button
                onClick={() => setFilters({ ...filters, dateRange: 'all' })}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filters.dateRange === 'all'
                    ? 'bg-gradient-red text-white'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Todos
              </button>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-xs font-bold text-[var(--text-muted)] hover:text-white hover:border-[var(--accent-red)] transition-all cursor-pointer"
              title="Exportar dados para Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent-red)]" />
              <span className="hidden sm:inline">EXPORTAR CSV</span>
            </button>
          </div>
        </div>

        {/* Quick Result Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)] font-medium">
          <div>
            Exibindo <span className="font-bold text-[var(--text-main)]">{filteredServices.length}</span> registros de {services.length}
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <div>
              Produção: <span className="text-[var(--accent-red)]">{formatCurrency(totals.totalProduction)}</span>
            </div>
            <div>
              Comissão: <span className="text-[var(--accent-red)]">{formatCurrency(totals.totalCommission)}</span>
            </div>
          </div>
        </div>
      </div>

      <>
      {/* Desktop Spreadsheet Table View */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Header with Vibrant Red Gradient */}
            <thead>
              <tr className="bg-gradient-red text-white text-xs font-black uppercase tracking-wider">
                <th className="py-4 px-4 border-r border-red-700/50">Data / Hora</th>
                <th className="py-4 px-4 border-r border-red-700/50">Veículo / Detalhe</th>
                <th className="py-4 px-4 border-r border-red-700/50">Serviço Realizado</th>
                <th className="py-4 px-4 border-r border-red-700/50 text-right">Valor Produção</th>
                <th className="py-4 px-4 border-r border-red-700/50 text-center">% Com.</th>
                <th className="py-4 px-4 border-r border-red-700/50 text-right bg-red-900/60">Valor Comissão</th>
                <th className="py-4 px-4 border-r border-red-700/50">Observação</th>
                <th className="py-4 px-4 text-center">Ações</th>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-[var(--border-color)] text-sm font-medium">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--text-muted)]">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[var(--accent-red)] opacity-50" />
                    <p className="font-bold text-sm">Nenhum serviço encontrado</p>
                    <p className="text-xs mt-1">Tente ajustar seus filtros ou adicione um novo serviço.</p>
                  </td>
                </tr>
              ) : (
                filteredServices.map((item) => (
                  <tr
                    key={item.id}
                    ref={(el) => { rowRefs.current[item.id] = el; }}
                    className={`hover:bg-[var(--bg-card-hover)] transition-colors group ${
                      activeHighlightId === item.id ? 'bg-[var(--accent-red)]/15 ring-2 ring-inset ring-[var(--accent-red)]' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {formatDateBR(item.date)}
                      {item.createdAt && (
                        <span className="block text-[10px] opacity-70">{formatTimeBR(item.createdAt)}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-[var(--text-muted)] text-xs whitespace-nowrap font-mono">
                      {item.vehicle || '—'}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-[var(--text-main)]">
                      {item.serviceType}
                      {item.unit && item.quantity ? (
                        <span className="block text-[10px] text-[var(--text-muted)] font-mono font-normal">
                          ({item.quantity} {item.unit})
                        </span>
                      ) : null}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[var(--text-main)]">
                      {formatCurrency(item.productionValue)}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-xs text-[var(--text-muted)]">
                      {item.commissionPercent}%
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-black text-[var(--accent-red)] bg-red-950/10">
                      {formatCurrency(item.commissionValue)}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-[var(--text-muted)] max-w-xs truncate">
                      {item.notes || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => onEditService(item)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card-sec)] transition-colors cursor-pointer"
                          title="Editar Serviço"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onDeleteService(item.id)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Excluir Serviço"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Totals Spreadsheet Summary Footer */}
            <tfoot>
              <tr className="bg-[var(--bg-card-sec)] border-t-2 border-[var(--accent-red)] font-black text-sm">
                <td colSpan={3} className="py-4 px-4 uppercase text-xs tracking-wider text-[var(--text-main)]">
                  TOTALIZADOR DE PRODUÇÃO E COMISSÃO
                </td>

                <td className="py-4 px-4 text-right font-mono text-base text-[var(--text-main)]">
                  {formatCurrency(totals.totalProduction)}
                </td>

                <td className="py-4 px-4 text-center text-xs text-[var(--text-muted)]">—</td>

                <td className="py-4 px-4 text-right font-mono text-lg text-[var(--accent-red)] bg-red-950/30">
                  {formatCurrency(totals.totalCommission)}
                </td>

                <td colSpan={2} className="py-4 px-4 text-right">
                  <div className="inline-flex items-center gap-2 bg-gradient-red px-3.5 py-1.5 rounded-xl text-white text-xs font-bold uppercase tracking-wider shadow-red-glow">
                    <span>Previsão Final (Base + Com.):</span>
                    <span className="text-sm font-black font-mono">{formatCurrency(totals.totalForecast)}</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Mobile Service Cards View */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredServices.length === 0 ? (
          <div className="p-8 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-[var(--text-muted)]">
            <p className="font-bold">Nenhum serviço encontrado</p>
          </div>
        ) : (
          filteredServices.map((item) => (
            <div
              key={item.id}
              ref={(el) => { rowRefs.current[item.id] = el; }}
              className={`p-4 rounded-2xl bg-[var(--bg-card)] border space-y-3 shadow-sm transition-colors ${
                activeHighlightId === item.id ? 'border-[var(--accent-red)] ring-2 ring-[var(--accent-red)]' : 'border-[var(--border-color)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2.5">
                <div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                    {formatDateBR(item.date)}{item.createdAt ? ` · ${formatTimeBR(item.createdAt)}` : ''}
                  </span>
                  <h3 className="font-bold text-sm text-[var(--text-main)] leading-tight">
                    {item.serviceType}
                  </h3>
                  {item.vehicle && (
                    <p className="text-xs font-mono text-[var(--text-muted)]">{item.vehicle}</p>
                  )}
                </div>
                <div>{getStatusBadge(item.status)}</div>
              </div>

              <div>
                <p className="text-xs font-semibold text-[var(--text-main)]">{item.serviceType}</p>
                {item.notes && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{item.notes}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--bg-card-sec)] border border-[var(--border-color)] text-xs">
                <div>
                  <span className="text-[10px] uppercase text-[var(--text-muted)] block">Produção</span>
                  <span className="font-bold font-mono text-[var(--text-main)] text-sm">
                    {formatCurrency(item.productionValue)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase text-[var(--accent-red)] block font-bold">
                    Comissão ({item.commissionPercent}%)
                  </span>
                  <span className="font-black font-mono text-[var(--accent-red)] text-sm">
                    {formatCurrency(item.commissionValue)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => onEditService(item)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-xs font-bold text-[var(--text-muted)] hover:text-white"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>

                <button
                  onClick={() => onDeleteService(item.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-950/20 text-xs font-bold text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      </>
    </div>
  );
};
