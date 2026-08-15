import React, { useMemo, useState } from 'react';
import { MinusCircle, Plus, Pencil, Trash2, X, Ban, CheckCircle2 } from 'lucide-react';
import {
  Desconto,
  DescontoFormInput,
  DescontoTipo,
  DescontoRecorrencia,
  DESCONTO_TIPO_LABELS,
  DESCONTO_RECORRENCIA_LABELS,
  saveDescontoToSupabase,
  deleteDescontoFromSupabase,
  setDescontoAtivo,
  calculateDescontosNoPeriodo,
  formatCurrency,
} from '../utils/supabaseStorage';
import { formatDateBR } from '../utils/storage';
import { showAlert, showConfirm } from '../../lib/notify';

interface DescontosViewProps {
  colaboradorId: string;
  descontos: Desconto[];
  // Só true quando é o admin vendo pelo painel de Comissões do CRM ("Ver Painel") --
  // a tela do colaborador (login dele, seja em /comissoes ou no menu embutido) sempre
  // vem com isAdmin false, então só lista os descontos, sem nenhum botão de escrita.
  isAdmin: boolean;
  onChange: (updated: Desconto[]) => void;
}

const getTodayISO = () => new Date().toISOString().split('T')[0];

const getThisMonthBounds = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const format = (d: Date) => d.toISOString().split('T')[0];
  return { start: format(new Date(y, m, 1)), end: format(new Date(y, m + 1, 0)) };
};

const emptyForm: DescontoFormInput = {
  tipo: 'falta_meio_periodo',
  descricao: '',
  valor: 0,
  recorrencia: 'unica',
  data: getTodayISO(),
  ativo: true,
};

export const DescontosView: React.FC<DescontosViewProps> = ({ colaboradorId, descontos, isAdmin, onChange }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DescontoFormInput>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const monthBounds = useMemo(() => getThisMonthBounds(), []);
  const totalMesAtual = useMemo(
    () => calculateDescontosNoPeriodo(descontos, monthBounds.start, monthBounds.end),
    [descontos, monthBounds]
  );

  const openNewForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEditForm = (d: Desconto) => {
    setEditingId(d.id);
    setForm({ tipo: d.tipo, descricao: d.descricao || '', valor: d.valor, recorrencia: d.recorrencia, data: d.data, ativo: d.ativo });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleSave = async () => {
    if (!form.valor || form.valor <= 0) { showAlert('Informe um valor de desconto maior que zero.'); return; }
    if (!form.data) { showAlert('Informe a data do desconto.'); return; }
    setSaving(true);
    const saved = await saveDescontoToSupabase(colaboradorId, { ...form, id: editingId || undefined }, !editingId);
    setSaving(false);
    if (!saved) { showAlert('Não foi possível salvar o desconto.'); return; }
    const updated = editingId ? descontos.map((d) => (d.id === saved.id ? saved : d)) : [saved, ...descontos];
    onChange(updated);
    closeForm();
  };

  const handleDelete = async (d: Desconto) => {
    if (!(await showConfirm('Excluir este desconto? Essa ação não pode ser desfeita.'))) return;
    const ok = await deleteDescontoFromSupabase(d.id);
    if (!ok) { showAlert('Não foi possível excluir.'); return; }
    onChange(descontos.filter((x) => x.id !== d.id));
  };

  const handleToggleAtivo = async (d: Desconto) => {
    const ok = await setDescontoAtivo(d.id, !d.ativo);
    if (!ok) { showAlert('Não foi possível atualizar.'); return; }
    onChange(descontos.map((x) => (x.id === d.id ? { ...x, ativo: !x.ativo } : x)));
  };

  return (
    <div className="space-y-4">
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
              <MinusCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Descontos no Mês Atual</span>
              <div className="text-2xl font-black text-rose-400 font-mono">{formatCurrency(totalMesAtual)}</div>
            </div>
          </div>
          {isAdmin && !showForm && (
            <button
              onClick={openNewForm}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-red text-white text-xs font-black uppercase tracking-wide shadow-red-glow hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Novo Desconto
            </button>
          )}
        </div>
        {!isAdmin && (
          <p className="text-[11px] text-[var(--text-muted)] mt-3">
            Aqui você só consulta os descontos lançados. Qualquer dúvida, fale com o administrador.
          </p>
        )}
      </div>

      {isAdmin && showForm && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-[var(--accent-red)]">{editingId ? 'Editando desconto' : 'Novo desconto'}</h4>
            <button onClick={closeForm} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Motivo</span>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as DescontoTipo })}
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
              >
                {(Object.keys(DESCONTO_TIPO_LABELS) as DescontoTipo[]).map((key) => (
                  <option key={key} value={key}>{DESCONTO_TIPO_LABELS[key]}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Valor (R$)</span>
              <input
                type="number" step="0.01" value={form.valor}
                onChange={(e) => setForm({ ...form, valor: Number(e.target.value) || 0 })}
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Recorrência</span>
              <select
                value={form.recorrencia}
                onChange={(e) => setForm({ ...form, recorrencia: e.target.value as DescontoRecorrencia })}
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
              >
                {(Object.keys(DESCONTO_RECORRENCIA_LABELS) as DescontoRecorrencia[]).map((key) => (
                  <option key={key} value={key}>{DESCONTO_RECORRENCIA_LABELS[key]}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                {form.recorrencia === 'unica' ? 'Data do desconto' : 'Data de início'}
              </span>
              <input
                type="date" value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
              />
            </label>
            <label className="space-y-1 block sm:col-span-2">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Observação (opcional)</span>
              <input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: faltou dia 10/08 sem avisar"
                className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={closeForm} className="h-9 px-4 rounded-xl text-xs font-black uppercase text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">Cancelar</button>
            <button
              disabled={saving}
              onClick={handleSave}
              className="h-9 px-4 rounded-xl bg-gradient-red text-white text-xs font-black uppercase tracking-wide shadow-red-glow hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Adicionar Desconto')}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden">
        {descontos.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">
            <p className="font-bold text-sm">Nenhum desconto lançado.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {descontos.map((d) => (
              <div key={d.id} className={`flex items-center gap-3 px-4 py-3 flex-wrap ${!d.ativo ? 'opacity-50' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[var(--text-main)] text-sm">{DESCONTO_TIPO_LABELS[d.tipo]}</p>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[var(--bg-card-sec)] text-[var(--text-muted)] border border-[var(--border-color)]">
                      {DESCONTO_RECORRENCIA_LABELS[d.recorrencia]}
                    </span>
                    {!d.ativo && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400">Inativo</span>}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {d.recorrencia === 'unica' ? formatDateBR(d.data) : `A partir de ${formatDateBR(d.data)}`}
                    {d.descricao ? ` · ${d.descricao}` : ''}
                  </p>
                </div>
                <div className="font-mono font-black text-rose-400 text-sm shrink-0">-{formatCurrency(d.valor)}</div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => openEditForm(d)} className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20" title="Editar">
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleToggleAtivo(d)}
                      className={`p-1.5 rounded-lg ${d.ativo ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                      title={d.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {d.ativo ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                    </button>
                    <button onClick={() => handleDelete(d)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400" title="Excluir">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
