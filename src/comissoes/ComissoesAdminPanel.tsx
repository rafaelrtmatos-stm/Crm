/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Entrada de "Comissões" pro admin dentro do CRM: em vez de pedir nome/senha de
// colaborador (como em /comissoes), mostra direto a lista de colaboradores
// cadastrados — com detalhes técnicos (salário, comissão, meta, data de criação) —
// permite criar/editar/ativar/excluir colaboradores, e ao clicar em "Ver Painel"
// abre o painel completo (Dashboard, Semanal, Tabela, Relatórios, Serviços
// Agendados) sem pedir login nenhum.

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Users, RefreshCw, Plus, Trash2, X } from 'lucide-react';
import { Colaborador } from './utils/supabaseStorage';
import { useSyncWithCrmTheme } from './utils/useSyncCrmTheme';
import { supabase } from '../supabase';
import { showAlert, showConfirm } from '../lib/notify';
import ComissoesEmbedded from './ComissoesEmbedded';
import './comissoes-theme.css';

interface ColaboradorRow {
  id: string;
  nome: string;
  senha: string;
  cargo: string | null;
  salario_base: number;
  comissao_padrao_percentual: number;
  meta_semanal: number;
  tema: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const emptyForm = { nome: '', senha: '', cargo: '', salarioBase: 0, comissaoPadraoPercentual: 10, metaSemanal: 0 };

function formatCurrencyBR(value: number): string {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

function formatDateBR(iso: string): string {
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return '—'; }
}

export default function ComissoesAdminPanel() {
  // Segue o tema claro/escuro do CRM principal (em vez de ficar sempre escuro)
  useSyncWithCrmTheme();

  const [colaboradores, setColaboradores] = useState<ColaboradorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ColaboradorRow | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadColaboradores = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    const { data, error } = await supabase.from('colaboradores').select('*').order('nome', { ascending: true });
    if (!error && data) {
      const rows = data as ColaboradorRow[];
      setColaboradores(rows);
      // Mantem o painel aberto ("Ver Painel") sincronizado com a lista atualizada
      setSelected((prev) => (prev ? rows.find((c) => c.id === prev.id) ?? null : prev));
    }
    if (!opts?.silent) setLoading(false);
  };

  useEffect(() => { loadColaboradores(); }, []);

  // Tempo real: qualquer alteração de colaborador (feita aqui, em Configurações,
  // ou por outro admin em outra aba) aparece na lista na hora, sem F5.
  useEffect(() => {
    const channel = supabase
      .channel('comissoes-admin-colaboradores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colaboradores' }, () => loadColaboradores({ silent: true }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const openNewForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (c: ColaboradorRow) => {
    setEditingId(c.id);
    setForm({
      nome: c.nome || '', senha: c.senha || '', cargo: c.cargo || '',
      salarioBase: Number(c.salario_base) || 0, comissaoPadraoPercentual: Number(c.comissao_padrao_percentual) || 10,
      metaSemanal: Number(c.meta_semanal) || 0,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.senha.trim()) { showAlert('Preencha nome e senha do colaborador.'); return; }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      senha: form.senha,
      cargo: form.cargo || null,
      salario_base: form.salarioBase || 0,
      comissao_padrao_percentual: form.comissaoPadraoPercentual || 0,
      meta_semanal: form.metaSemanal || 0,
      updated_at: new Date().toISOString(),
    };
    const { error } = editingId
      ? await supabase.from('colaboradores').update(payload).eq('id', editingId)
      : await supabase.from('colaboradores').insert(payload);
    setSaving(false);
    if (error) { showAlert(`Não foi possível salvar: ${error.message}`); return; }
    closeForm();
    await loadColaboradores();
    showAlert('Colaborador salvo!');
  };

  const handleToggleAtivo = async (c: ColaboradorRow) => {
    const { error } = await supabase.from('colaboradores').update({ ativo: !c.ativo }).eq('id', c.id);
    if (error) { showAlert(`Não foi possível atualizar: ${error.message}`); return; }
    await loadColaboradores();
  };

  const handleDelete = async (c: ColaboradorRow) => {
    if (!(await showConfirm(`Excluir o colaborador ${c.nome}? Isso também apaga todos os serviços/comissões lançados por ele. Essa ação não pode ser desfeita.`))) return;
    const { error } = await supabase.from('colaboradores').delete().eq('id', c.id);
    if (error) { showAlert(`Não foi possível excluir: ${error.message}`); return; }
    await loadColaboradores();
  };

  const toColaborador = (c: ColaboradorRow): Colaborador => ({
    id: c.id, nome: c.nome, cargo: c.cargo || undefined,
    salarioBase: Number(c.salario_base) || 0, comissaoPadraoPercentual: Number(c.comissao_padrao_percentual) || 10,
    metaSemanal: Number(c.meta_semanal) || 0, tema: (c.tema as any) || 'dark', ativo: c.ativo !== false,
  });

  if (selected) {
    return (
      <div className="comissoes-app h-full min-h-[420px] flex flex-col">
        <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para colaboradores
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <ComissoesEmbedded presetColaborador={toColaborador(selected)} />
        </div>
      </div>
    );
  }

  return (
    <div className="comissoes-app h-full min-h-[420px] bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--accent-red)]" />
              Comissões — Colaboradores
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">Veja o painel de produção/comissões de cada colaborador, ou gerencie os acessos por aqui.</p>
          </div>
          {!showForm && (
            <button
              onClick={openNewForm}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-red text-white text-xs font-black uppercase tracking-wide shadow-red-glow hover:opacity-90 transition-opacity shrink-0"
            >
              <Plus className="w-4 h-4" />
              Novo
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-[var(--accent-red)]">{editingId ? 'Editando colaborador' : 'Novo colaborador'}</h4>
              <button onClick={closeForm} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Nome</span>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]" />
              </label>
              <label className="space-y-1 block">
                <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Senha</span>
                <input value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="Senha de acesso"
                  className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]" />
              </label>
              <label className="space-y-1 block">
                <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Cargo (opcional)</span>
                <input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]" />
              </label>
              <label className="space-y-1 block">
                <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Salário Base (R$)</span>
                <input type="number" value={form.salarioBase} onChange={(e) => setForm({ ...form, salarioBase: Number(e.target.value) || 0 })}
                  className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]" />
              </label>
              <label className="space-y-1 block">
                <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Comissão Padrão (%)</span>
                <input type="number" value={form.comissaoPadraoPercentual} onChange={(e) => setForm({ ...form, comissaoPadraoPercentual: Number(e.target.value) || 0 })}
                  className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]" />
              </label>
              <label className="space-y-1 block">
                <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Meta Semanal (R$)</span>
                <input type="number" value={form.metaSemanal} onChange={(e) => setForm({ ...form, metaSemanal: Number(e.target.value) || 0 })}
                  className="w-full h-10 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)]" />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={closeForm} className="h-9 px-4 rounded-xl text-xs font-black uppercase text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">Cancelar</button>
              <button
                disabled={saving}
                onClick={handleSave}
                className="h-9 px-4 rounded-xl bg-gradient-red text-white text-xs font-black uppercase tracking-wide shadow-red-glow hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Criar Colaborador')}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="w-5 h-5 animate-spin text-[var(--accent-red)]" />
          </div>
        ) : colaboradores.length === 0 ? (
          <div className="text-center py-16 text-sm text-[var(--text-muted)]">Nenhum colaborador cadastrado ainda.</div>
        ) : (
          <div className="space-y-2">
            {colaboradores.map((c) => (
              <div key={c.id} className={`bg-[var(--bg-card)] border rounded-xl px-4 py-3 ${c.ativo ? 'border-[var(--border-color)]' : 'border-[var(--border-color)] opacity-50'}`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[var(--text-main)] truncate">{c.nome}</p>
                      {!c.ativo && <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400">Inativo</span>}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {c.cargo || 'Sem cargo definido'} · Salário {formatCurrencyBR(c.salario_base)} · Comissão {c.comissao_padrao_percentual || 0}% · Meta semanal {formatCurrencyBR(c.meta_semanal)} · Criado em {formatDateBR(c.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setSelected(c)} className="text-[8px] font-black uppercase px-2 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">Ver Painel</button>
                    <button onClick={() => openEditForm(c)} className="text-[8px] font-black uppercase px-2 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20">Editar</button>
                    <button onClick={() => handleToggleAtivo(c)} className={`text-[8px] font-black uppercase px-2 py-1.5 rounded-lg ${c.ativo ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}>
                      {c.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => handleDelete(c)} className="text-[var(--text-muted)] hover:text-rose-400 p-1.5"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
