import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers, Plus, Search, Edit2, Trash2, CheckCircle2, XCircle,
  Download, RefreshCw, AlertCircle, FileText, Check, X, Tag, DollarSign,
  ShieldCheck, ArrowUpDown, Filter
} from 'lucide-react';
import { Company, AppUser, MateriaPrima } from '../types';
import { showAlert, showConfirm } from '../lib/notify';
import { Badge, Button, Modal } from './SharedUI';
import {
  fetchMateriasPrimas,
  saveMateriaPrima,
  deleteMateriaPrima,
  toggleMateriaPrimaStatus
} from '../lib/materiasPrimasStorage';
import * as XLSX from 'xlsx';

interface MateriasPrimasModuleProps {
  currentCompany?: Company | null;
  user?: AppUser | null;
}

const COMMON_UNITS = [
  { value: 'm²', label: 'Metro Quadrado (m²)' },
  { value: 'm', label: 'Metro Linear (m)' },
  { value: 'un', label: 'Unidade (un)' },
  { value: 'cm', label: 'Centímetro (cm)' },
  { value: 'mm', label: 'Milímetro (mm)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'l', label: 'Litro (l)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'rolo', label: 'Rolo (rolo)' },
  { value: 'pacote', label: 'Pacote (pct)' },
  { value: 'folha', label: 'Folha (fl)' },
];

export const MateriasPrimasModule: React.FC<MateriasPrimasModuleProps> = ({ currentCompany, user }) => {
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MateriaPrima | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    unit: 'm²',
    costPrice: 0,
    notes: '',
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, [currentCompany?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchMateriasPrimas(currentCompany?.id);
      setMateriasPrimas(data);
    } catch (err) {
      console.error('Erro ao carregar matérias-primas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      unit: 'm²',
      costPrice: 0,
      notes: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MateriaPrima) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      unit: item.unit,
      costPrice: item.costPrice,
      notes: item.notes || '',
      isActive: item.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showAlert('Informe o nome da matéria-prima.');
      return;
    }
    if (formData.costPrice < 0) {
      showAlert('O custo por unidade não pode ser negativo.');
      return;
    }

    try {
      setSaving(true);
      const saved = await saveMateriaPrima({
        id: editingItem ? editingItem.id : undefined,
        name: formData.name,
        unit: formData.unit,
        costPrice: formData.costPrice,
        notes: formData.notes,
        isActive: formData.isActive,
      }, currentCompany?.id);

      if (editingItem) {
        setMateriasPrimas(prev => prev.map(m => m.id === saved.id ? saved : m));
        showAlert('Matéria-prima atualizada com sucesso!');
      } else {
        setMateriasPrimas(prev => [saved, ...prev]);
        showAlert('Matéria-prima cadastrada com sucesso!');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao salvar matéria-prima:', err);
      showAlert(`Erro ao salvar: ${err.message || 'Falha na operação'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: MateriaPrima) => {
    const confirmed = await showConfirm(`Tem certeza que deseja excluir a matéria-prima "${item.name}"?`);
    if (!confirmed) return;

    try {
      await deleteMateriaPrima(item.id);
      setMateriasPrimas(prev => prev.filter(m => m.id !== item.id));
      showAlert('Matéria-prima excluída com sucesso.');
    } catch (err) {
      console.error('Erro ao excluir matéria-prima:', err);
      showAlert('Erro ao excluir matéria-prima.');
    }
  };

  const handleToggleStatus = async (item: MateriaPrima) => {
    try {
      const newStatus = await toggleMateriaPrimaStatus(item.id, item.isActive);
      setMateriasPrimas(prev => prev.map(m => m.id === item.id ? { ...m, isActive: newStatus } : m));
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const handleExportExcel = () => {
    if (materiasPrimas.length === 0) {
      showAlert('Nenhuma matéria-prima para exportar.');
      return;
    }

    const dataToExport = materiasPrimas.map(item => ({
      'Nome da Matéria-Prima': item.name,
      'Unidade de Medida': item.unit,
      'Custo por Unidade (R$)': item.costPrice.toFixed(4),
      'Status': item.isActive ? 'Ativa' : 'Inativa',
      'Observação': item.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Materias_Primas');
    XLSX.writeFile(wb, `Materias_Primas_${currentCompany?.shortName || 'RafaArts'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Filtered list
  const filteredList = useMemo(() => {
    return materiasPrimas.filter(item => {
      const term = search.toLowerCase().trim();
      const matchesSearch = !term || (
        item.name.toLowerCase().includes(term) ||
        item.unit.toLowerCase().includes(term) ||
        (item.notes && item.notes.toLowerCase().includes(term))
      );

      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.isActive) ||
        (statusFilter === 'inactive' && !item.isActive);

      const matchesUnit = unitFilter === 'all' || item.unit === unitFilter;

      return matchesSearch && matchesStatus && matchesUnit;
    });
  }, [materiasPrimas, search, statusFilter, unitFilter]);

  const stats = useMemo(() => {
    const total = materiasPrimas.length;
    const active = materiasPrimas.filter(m => m.isActive).length;
    const inactive = total - active;
    const avgCost = total > 0 ? materiasPrimas.reduce((acc, m) => acc + (m.costPrice || 0), 0) / total : 0;
    return { total, active, inactive, avgCost };
  }, [materiasPrimas]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
              <Layers size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight uppercase">
                Cadastro de Matérias-Primas
              </h2>
              <p className="text-xs text-white/50">
                Cadastre e precifique insumos para compor produtos, calcular o consumo e custos diretos no PDV.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={loadData}
            title="Recarregar dados"
            className="text-xs py-2 px-3 bg-white/5 hover:bg-white/10 text-white/70"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>

          <Button
            variant="secondary"
            onClick={handleExportExcel}
            className="text-xs py-2 px-3 sm:px-4 bg-white/5 hover:bg-white/10 text-white/80"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>

          <Button
            onClick={handleOpenAdd}
            className="text-xs py-2.5 px-4 bg-primary-500 hover:bg-primary-400 text-slate-950 font-black shadow-lg shadow-primary-500/20"
          >
            <Plus size={16} />
            <span>Adicionar</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-white/50">Total Cadastradas</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white">{stats.total}</span>
            <span className="text-[11px] text-white/40 font-semibold">insumos</span>
          </div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">Ativas no Sistema</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-400">{stats.active}</span>
            <span className="text-[11px] text-emerald-300/60 font-semibold">disponíveis</span>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">Inativas / Ocultas</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-400">{stats.inactive}</span>
            <span className="text-[11px] text-amber-300/60 font-semibold">bloqueadas</span>
          </div>
        </div>

        <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-sky-400">Custo Médio</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-sky-400">
              R$ {stats.avgCost.toFixed(2)}
            </span>
            <span className="text-[11px] text-sky-300/60 font-semibold">por unidade</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, unidade ou observação..."
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === 'all' ? 'bg-primary-500 text-slate-950' : 'text-white/60 hover:text-white'
              }`}
            >
              Todas ({materiasPrimas.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === 'active' ? 'bg-emerald-500 text-slate-950' : 'text-white/60 hover:text-white'
              }`}
            >
              Ativas ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === 'inactive' ? 'bg-amber-500 text-slate-950' : 'text-white/60 hover:text-white'
              }`}
            >
              Inativas ({stats.inactive})
            </button>
          </div>
        </div>
      </div>

      {/* Main Table / Grid */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-white/40 gap-3">
            <RefreshCw className="animate-spin text-primary-400" size={28} />
            <p className="text-sm font-semibold">Carregando matérias-primas...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-white/30">
              <Layers size={32} />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Nenhuma matéria-prima encontrada</h3>
            <p className="text-xs text-white/50 max-w-md mx-auto mb-5">
              {search || statusFilter !== 'all'
                ? 'Nenhum resultado corresponde aos filtros aplicados.'
                : 'Cadastre suas matérias-primas (adesivos, lonas, tintas, chapas) para calcular o consumo dos produtos no PDV.'}
            </p>
            <Button
              onClick={handleOpenAdd}
              className="bg-primary-500 hover:bg-primary-400 text-slate-950 text-xs font-black mx-auto"
            >
              <Plus size={16} />
              <span>Cadastrar Primeira Matéria-Prima</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-wider text-white/50">
                  <th className="py-3.5 px-4">Nome da Matéria-Prima</th>
                  <th className="py-3.5 px-4 text-center">Unidade</th>
                  <th className="py-3.5 px-4 text-right">Custo por Unidade</th>
                  <th className="py-3.5 px-4">Observação</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredList.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-white/[0.03] transition-colors group"
                  >
                    {/* Name */}
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-primary-400 shrink-0">
                          <Layers size={16} />
                        </div>
                        <div>
                          <p className="leading-tight">{item.name}</p>
                          <span className="text-[10px] text-white/40 font-mono">
                            ID: {item.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Unit of measure */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-white/5 border border-white/10 text-white/90">
                        {item.unit}
                      </span>
                    </td>

                    {/* Cost per unit */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      R$ {Number(item.costPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      <span className="text-[10px] text-white/40 font-normal ml-1">/{item.unit}</span>
                    </td>

                    {/* Notes / Observation */}
                    <td className="py-3.5 px-4 text-xs text-white/60 max-w-xs truncate">
                      {item.notes ? (
                        <span title={item.notes}>{item.notes}</span>
                      ) : (
                        <span className="text-white/20 italic">—</span>
                      )}
                    </td>

                    {/* Active / Inactive Status */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        title="Clique para alternar o status"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-transform active:scale-95 ${
                          item.isActive
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 hover:bg-zinc-500/25'
                        }`}
                      >
                        {item.isActive ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Ativa</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            <span>Inativa</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Editar matéria-prima"
                          className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          title="Excluir matéria-prima"
                          className="p-2 text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Editar Matéria-Prima' : 'Adicionar Matéria-Prima'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-white/70 flex items-center justify-between">
              <span>Nome da Matéria-Prima *</span>
              <span className="text-[10px] text-primary-400 font-normal">Ex: Vinil Fosco, Lona 440g, Tinta Solvente</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Adesivo Vinil Branco Brilho"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary-500/50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Unidade de Medida */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-white/70">
                Unidade de Medida *
              </label>
              <select
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary-500/50"
              >
                {COMMON_UNITS.map(u => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custo por Unidade */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                <span>Custo por Unidade (R$) *</span>
                <span className="text-[10px] text-white/40">/{formData.unit}</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-emerald-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  required
                  value={formData.costPrice || ''}
                  onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white font-mono outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-white/70">
              Observação (Opcional)
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Especificações técnicas, fornecedor padrão, rendimento, bobina, etc."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary-500/50 transition-colors resize-none"
            />
          </div>

          {/* Status Ativa / Inativa */}
          <div className="pt-2">
            <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/[0.08] transition-colors">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded accent-primary-500 cursor-pointer"
              />
              <div>
                <p className="text-xs font-bold text-white">Matéria-Prima Ativa</p>
                <p className="text-[10px] text-white/50">
                  Disponível para ser vinculada aos produtos e serviços no Estoque e no PDV.
                </p>
              </div>
            </label>
          </div>

          {/* Botões do Modal */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-primary-500 text-slate-950 font-black hover:bg-primary-400 shadow-lg shadow-primary-500/20"
            >
              {saving ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Adicionar Matéria-Prima'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
