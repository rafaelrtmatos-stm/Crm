/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Entrada de "Funcionários / Comissões" para o Administrador dentro do CRM:
// Gerencia a equipe de colaboradores com visão analítica, métricas de equipe,
// controle de permissões, salários, comissões, metas, acompanhamento do TOTAL ESTIMADO
// semanal em tempo real e acesso direto ao painel individual.

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Users,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Search,
  CheckCircle2,
  Copy,
  Check,
  LayoutGrid,
  List,
  Edit3,
  Briefcase,
  TrendingUp,
  DollarSign,
  Target,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  SlidersHorizontal,
  FileSpreadsheet,
  Wallet,
  Calendar,
  Layers,
  Award,
  ArrowUpRight
} from 'lucide-react';
import { Colaborador, ModoLancamentoComissao, Desconto, calculateDescontosNoPeriodo } from './utils/supabaseStorage';
import { getWorkWeekBounds } from './utils/caixaSemanalStorage';
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
  modo_lancamento_comissao: string | null;
  created_at: string;
  updated_at: string;
}

interface ColaboradorWeeklyStats {
  salarioBase: number;
  totalComissao: number;
  totalProducao: number;
  totalDescontos: number;
  totalPago: number;
  totalEstimado: number;
  qtdServicos: number;
  metaSemanal: number;
  percentualMeta: number;
}

interface FormState {
  nome: string;
  senha: string;
  cargo: string;
  salarioBase: number;
  comissaoPadraoPercentual: number;
  metaSemanal: number;
  modoLancamento: ModoLancamentoComissao;
  ativo: boolean;
}

const emptyForm: FormState = {
  nome: '',
  senha: '',
  cargo: '',
  salarioBase: 0,
  comissaoPadraoPercentual: 10,
  metaSemanal: 0,
  modoLancamento: 'livre',
  ativo: true,
};

function formatCurrencyBR(value: number): string {
  return `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateBR(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

function formatWorkWeekLabel(start: string, end: string): string {
  const f = (d: string) => {
    const parts = d.split('-');
    return `${parts[2]}/${parts[1]}`;
  };
  return `${f(start)} a ${f(end)}`;
}

// Gera iniciais para o avatar
function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Cores de gradiente suaves para avatares baseadas no nome
const AVATAR_GRADIENTS = [
  'from-rose-500 to-red-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-pink-600',
  'from-cyan-500 to-blue-600',
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export default function ComissoesAdminPanel() {
  // Sincroniza com tema claro/escuro do CRM
  useSyncWithCrmTheme();

  const [colaboradores, setColaboradores] = useState<ColaboradorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ColaboradorRow | null>(null);

  // Mapa de estatísticas da semana para cada colaborador (id -> stats)
  const [weeklyStatsMap, setWeeklyStatsMap] = useState<Record<string, ColaboradorWeeklyStats>>({});

  // Offset de semanas (0 = semana atual, -1 = semana passada, -2 = 2 semanas atrás, etc.)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Limites da semana de trabalho (domingo a sábado) considerando o retroagir de semanas
  const weekBounds = useMemo(() => getWorkWeekBounds(weekOffset), [weekOffset]);

  // Estados de busca, filtros e visualização
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modoFilter, setModoFilter] = useState<'all' | 'livre' | 'somente_nota'>('all');
  const [sortBy, setSortBy] = useState<'estimado' | 'comissao' | 'producao' | 'nome' | 'salario' | 'recentes'>('estimado');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal de criação / edição
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showPasswordInModal, setShowPasswordInModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Carrega lista de colaboradores e as estatísticas financeiras semanais de cada um
  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);

    try {
      // 1. Busca colaboradores
      const { data: colabData, error: colabError } = await supabase
        .from('colaboradores')
        .select('*')
        .order('nome', { ascending: true });

      if (colabError || !colabData) {
        if (!opts?.silent) setLoading(false);
        return;
      }

      const colabs = colabData as ColaboradorRow[];
      setColaboradores(colabs);
      setSelected((prev) => (prev ? colabs.find((c) => c.id === prev.id) ?? null : prev));

      // 2. Busca dados da semana atual para cálculo do Total Estimado
      const { start, end } = weekBounds;

      const [servicosRes, descontosRes, pagamentosRes] = await Promise.all([
        supabase
          .from('comissoes_servicos')
          .select('colaborador_id, comissao_valor, valor_producao, status')
          .gte('data', start)
          .lte('data', end)
          .is('deleted_at', null),
        supabase
          .from('comissoes_descontos')
          .select('*')
          .eq('ativo', true),
        supabase
          .from('comissoes_pagamentos')
          .select('colaborador_id, valor')
          .gte('data', start)
          .lte('data', end),
      ]);

      const servicos = servicosRes.data || [];
      const descontos = descontosRes.data || [];
      const pagamentos = pagamentosRes.data || [];

      // Mapeia descontos por colaborador
      const descontosByColab: Record<string, Desconto[]> = {};
      descontos.forEach((d: any) => {
        const cId = d.colaborador_id;
        if (!descontosByColab[cId]) descontosByColab[cId] = [];
        descontosByColab[cId].push({
          id: d.id,
          colaboradorId: cId,
          tipo: d.tipo,
          descricao: d.descricao || '',
          valor: Number(d.valor) || 0,
          recorrencia: d.recorrencia,
          data: d.data,
          ativo: d.ativo !== false,
          createdAt: d.created_at ? new Date(d.created_at).getTime() : 0,
        });
      });

      // Mapeia serviços por colaborador
      const servicosByColab: Record<string, { totalComissao: number; totalProducao: number; count: number }> = {};
      servicos.forEach((s: any) => {
        if (s.status === 'CANCELADO') return;
        const cId = s.colaborador_id;
        if (!servicosByColab[cId]) servicosByColab[cId] = { totalComissao: 0, totalProducao: 0, count: 0 };
        servicosByColab[cId].totalComissao += Number(s.comissao_valor) || 0;
        servicosByColab[cId].totalProducao += Number(s.valor_producao) || 0;
        servicosByColab[cId].count += 1;
      });

      // Mapeia pagamentos por colaborador
      const pagamentosByColab: Record<string, number> = {};
      pagamentos.forEach((p: any) => {
        const cId = p.colaborador_id;
        pagamentosByColab[cId] = (pagamentosByColab[cId] || 0) + (Number(p.valor) || 0);
      });

      // Constrói estatísticas individuais
      const statsMap: Record<string, ColaboradorWeeklyStats> = {};

      colabs.forEach((c) => {
        const salarioBase = Number(c.salario_base) || 0;
        const metaSemanal = Number(c.meta_semanal) || 0;
        const colabServicos = servicosByColab[c.id] || { totalComissao: 0, totalProducao: 0, count: 0 };
        const colabDescontos = descontosByColab[c.id] || [];
        const totalDescontos = calculateDescontosNoPeriodo(colabDescontos, start, end);
        const totalPago = pagamentosByColab[c.id] || 0;

        // Fórmula: Total Estimado = Salário Base + Comissão da Semana - Descontos - Pagamentos
        const totalEstimado = Math.max(0, salarioBase + colabServicos.totalComissao - totalDescontos - totalPago);
        const percentualMeta = metaSemanal > 0 ? (colabServicos.totalProducao / metaSemanal) * 100 : 0;

        statsMap[c.id] = {
          salarioBase,
          totalComissao: colabServicos.totalComissao,
          totalProducao: colabServicos.totalProducao,
          totalDescontos,
          totalPago,
          totalEstimado,
          qtdServicos: colabServicos.count,
          metaSemanal,
          percentualMeta,
        };
      });

      setWeeklyStatsMap(statsMap);
    } catch (err) {
      console.error('Erro ao carregar dados da equipe:', err);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [weekBounds]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tempo real via Supabase para colaboradores e serviços
  useEffect(() => {
    const channel = supabase
      .channel('comissoes-admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colaboradores' }, () => {
        loadData({ silent: true });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comissoes_servicos' }, () => {
        loadData({ silent: true });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comissoes_descontos' }, () => {
        loadData({ silent: true });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comissoes_pagamentos' }, () => {
        loadData({ silent: true });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Métricas agregadas da equipe
  const metrics = useMemo(() => {
    const total = colaboradores.length;
    const ativos = colaboradores.filter((c) => c.ativo).length;
    const inativos = total - ativos;

    let folhaBaseAtivos = 0;
    let metaTotalAtivos = 0;
    let totalComissaoSemana = 0;
    let totalProducaoSemana = 0;
    let totalDescontosSemana = 0;
    let totalEstimadoEquipe = 0;
    let somaTaxaComissao = 0;

    colaboradores.forEach((c) => {
      if (c.ativo) {
        const stats = weeklyStatsMap[c.id];
        folhaBaseAtivos += Number(c.salario_base) || 0;
        metaTotalAtivos += Number(c.meta_semanal) || 0;
        somaTaxaComissao += Number(c.comissao_padrao_percentual) || 0;

        if (stats) {
          totalComissaoSemana += stats.totalComissao;
          totalProducaoSemana += stats.totalProducao;
          totalDescontosSemana += stats.totalDescontos;
          totalEstimadoEquipe += stats.totalEstimado;
        } else {
          totalEstimadoEquipe += Number(c.salario_base) || 0;
        }
      }
    });

    const mediaComissao = ativos > 0 ? somaTaxaComissao / ativos : 0;
    const metaProgressoGeral = metaTotalAtivos > 0 ? (totalProducaoSemana / metaTotalAtivos) * 100 : 0;

    return {
      total,
      ativos,
      inativos,
      folhaBaseAtivos,
      metaTotalAtivos,
      mediaComissao,
      totalComissaoSemana,
      totalProducaoSemana,
      totalDescontosSemana,
      totalEstimadoEquipe,
      metaProgressoGeral,
    };
  }, [colaboradores, weeklyStatsMap]);

  // Lista filtrada e ordenada
  const filteredColaboradores = useMemo(() => {
    return colaboradores
      .filter((c) => {
        // Busca textual
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchNome = c.nome?.toLowerCase().includes(q);
          const matchCargo = c.cargo?.toLowerCase().includes(q);
          if (!matchNome && !matchCargo) return false;
        }
        // Filtro de status
        if (statusFilter === 'active' && !c.ativo) return false;
        if (statusFilter === 'inactive' && c.ativo) return false;

        // Filtro de modo
        if (modoFilter === 'livre' && c.modo_lancamento_comissao === 'somente_nota') return false;
        if (modoFilter === 'somente_nota' && c.modo_lancamento_comissao !== 'somente_nota') return false;

        return true;
      })
      .sort((a, b) => {
        const statsA = weeklyStatsMap[a.id];
        const statsB = weeklyStatsMap[b.id];

        if (sortBy === 'estimado') {
          return (statsB?.totalEstimado || 0) - (statsA?.totalEstimado || 0);
        }
        if (sortBy === 'comissao') {
          return (statsB?.totalComissao || 0) - (statsA?.totalComissao || 0);
        }
        if (sortBy === 'producao') {
          return (statsB?.totalProducao || 0) - (statsA?.totalProducao || 0);
        }
        if (sortBy === 'salario') {
          return (Number(b.salario_base) || 0) - (Number(a.salario_base) || 0);
        }
        if (sortBy === 'nome') {
          return a.nome.localeCompare(b.nome, 'pt-BR');
        }
        if (sortBy === 'recentes') {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        return 0;
      });
  }, [colaboradores, weeklyStatsMap, searchQuery, statusFilter, modoFilter, sortBy]);

  const openNewForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowPasswordInModal(false);
    setShowModal(true);
  };

  const openEditForm = (c: ColaboradorRow) => {
    setEditingId(c.id);
    setForm({
      nome: c.nome || '',
      senha: c.senha || '',
      cargo: c.cargo || '',
      salarioBase: Number(c.salario_base) || 0,
      comissaoPadraoPercentual: Number(c.comissao_padrao_percentual) || 10,
      metaSemanal: Number(c.meta_semanal) || 0,
      modoLancamento: c.modo_lancamento_comissao === 'somente_nota' ? 'somente_nota' : 'livre',
      ativo: c.ativo !== false,
    });
    setShowPasswordInModal(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setShowPasswordInModal(false);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let generated = '';
    for (let i = 0; i < 6; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((prev) => ({ ...prev, senha: generated }));
    setShowPasswordInModal(true);
  };

  const handleCopyAccess = (c: ColaboradorRow) => {
    const text = `Acesso ao Sistema de Comissões:\nColaborador: ${c.nome}\nSenha: ${c.senha}`;
    navigator.clipboard?.writeText(text);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
    showAlert(`Dados de acesso do ${c.nome} copiados com sucesso!`);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      showAlert('Preencha o nome do colaborador.');
      return;
    }
    if (!form.senha.trim()) {
      showAlert('Defina uma senha de acesso para o colaborador.');
      return;
    }

    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      senha: form.senha.trim(),
      cargo: form.cargo.trim() || null,
      salario_base: Number(form.salarioBase) || 0,
      comissao_padrao_percentual: Number(form.comissaoPadraoPercentual) || 0,
      meta_semanal: Number(form.metaSemanal) || 0,
      modo_lancamento_comissao: form.modoLancamento,
      ativo: form.ativo,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingId
      ? await supabase.from('colaboradores').update(payload).eq('id', editingId)
      : await supabase.from('colaboradores').insert(payload);

    setSaving(false);
    if (error) {
      showAlert(`Não foi possível salvar: ${error.message}`);
      return;
    }
    closeModal();
    await loadData();
    showAlert(editingId ? 'Colaborador atualizado com sucesso!' : 'Novo colaborador cadastrado com sucesso!');
  };

  const handleToggleAtivo = async (c: ColaboradorRow) => {
    const novoStatus = !c.ativo;
    const { error } = await supabase.from('colaboradores').update({ ativo: novoStatus }).eq('id', c.id);
    if (error) {
      showAlert(`Não foi possível atualizar: ${error.message}`);
      return;
    }
    await loadData({ silent: true });
  };

  const handleDelete = async (c: ColaboradorRow) => {
    const confirmed = await showConfirm(
      `Deseja realmente excluir ${c.nome}?\n\nEsta ação excluirá permanentemente o colaborador e seu histórico de lançamentos no sistema.`
    );
    if (!confirmed) return;

    const { error } = await supabase.from('colaboradores').delete().eq('id', c.id);
    if (error) {
      showAlert(`Não foi possível excluir: ${error.message}`);
      return;
    }
    showAlert(`Colaborador ${c.nome} removido com sucesso.`);
    await loadData();
  };

  const toColaborador = (c: ColaboradorRow): Colaborador => ({
    id: c.id,
    nome: c.nome,
    cargo: c.cargo || undefined,
    salarioBase: Number(c.salario_base) || 0,
    comissaoPadraoPercentual: Number(c.comissao_padrao_percentual) || 10,
    metaSemanal: Number(c.meta_semanal) || 0,
    tema: (c.tema as any) || 'dark',
    ativo: c.ativo !== false,
    modoLancamentoComissao: c.modo_lancamento_comissao === 'somente_nota' ? 'somente_nota' : 'livre',
  });

  // Se um colaborador estiver selecionado, abre o painel completo dele
  if (selected) {
    return (
      <div className="comissoes-app h-full min-h-[500px] flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300">
        {/* Barra superior de navegação / voltar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-card)]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-card-sec)] hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-bold transition-all border border-[var(--border-color)] shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--accent-red)]" />
              <span>Voltar para Lista de Funcionários</span>
            </button>
            <div className="h-4 w-px bg-[var(--border-color)] hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Visualizando painel de:</span>
              <span className="text-xs font-black text-[var(--text-main)] uppercase bg-[var(--accent-red)]/10 text-[var(--accent-red)] px-2.5 py-1 rounded-lg border border-[var(--accent-red)]/20">
                {selected.nome}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openEditForm(selected)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-card-sec)] hover:bg-[var(--border-color)] text-xs font-bold text-[var(--text-main)] border border-[var(--border-color)] transition-all cursor-pointer"
              title="Editar configurações do colaborador"
            >
              <Edit3 className="w-3.5 h-3.5 text-primary-400" />
              <span className="hidden md:inline">Editar Dados</span>
            </button>
          </div>
        </div>

        {/* Painel Embutido */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <ComissoesEmbedded presetColaborador={toColaborador(selected)} />
        </div>
      </div>
    );
  }

  return (
    <div className="comissoes-app min-h-full pb-12 bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6">
        
        {/* ========================================================= */}
        {/* 1. CABEÇALHO & AÇÕES PRINCIPAIS */}
        {/* ========================================================= */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[var(--bg-card)] p-5 sm:p-6 rounded-3xl border border-[var(--border-color)] shadow-xl relative overflow-hidden">
          {/* Decorative background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent-red)]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-1 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-600/30 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[var(--text-main)]">
                    Funcionários & Colaboradores
                  </h1>
                </div>
                <p className="text-xs text-[var(--text-muted)] font-medium">
                  Acompanhamento de <strong>Totais Estimados</strong>, remuneração semanal, comissões em tempo real e gestão da equipe.
                </p>
              </div>
            </div>
          </div>

          {/* Navegação Semanal & Retroagir Período */}
          <div className="flex flex-wrap items-center gap-2.5 relative z-10">
            <div className="flex items-center gap-1 bg-[var(--bg-card-sec)] p-1 rounded-2xl border border-[var(--border-color)] shadow-inner">
              <button
                type="button"
                onClick={() => setWeekOffset((v) => v - 1)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 border border-[var(--border-color)]"
                title="Retroagir 1 semana (Semana Anterior)"
              >
                <ChevronLeft className="w-4 h-4 text-[var(--accent-red)]" />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              <div className="px-3 py-1 text-center min-w-[170px] sm:min-w-[190px]">
                <div className="flex items-center justify-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--accent-red)]" />
                  <span className="text-xs font-black font-mono text-[var(--text-main)]">
                    {formatWorkWeekLabel(weekBounds.start, weekBounds.end)}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider block ${
                    weekOffset === 0
                      ? 'text-emerald-400'
                      : weekOffset === -1
                      ? 'text-amber-400'
                      : 'text-amber-300'
                  }`}
                >
                  {weekOffset === 0
                    ? '● Semana Atual'
                    : weekOffset === -1
                    ? '◀ Semana Passada'
                    : `◀ ${Math.abs(weekOffset)} semanas atrás`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setWeekOffset((v) => v + 1)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 border border-[var(--border-color)]"
                title="Avançar 1 semana"
              >
                <span className="hidden sm:inline">Próxima</span>
                <ChevronRight className="w-4 h-4 text-[var(--accent-red)]" />
              </button>

              {weekOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  title="Voltar para a semana atual"
                >
                  Atual
                </button>
              )}
            </div>

            <button
              onClick={() => loadData()}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-2xl bg-[var(--bg-card-sec)] hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-bold uppercase tracking-wider border border-[var(--border-color)] transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Atualizar lista e cálculos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--accent-red)]' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={openNewForm}
              className="flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 border border-white/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Funcionário</span>
            </button>
          </div>
        </div>

        {/* Banner Indicador de Semana Retroagida */}
        {weekOffset !== 0 && (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-300 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-amber-200">
                  Visualizando Semana Histórica: {formatDateBR(weekBounds.start)} a {formatDateBR(weekBounds.end)} ({Math.abs(weekOffset)} {Math.abs(weekOffset) === 1 ? 'semana' : 'semanas'} atrás)
                </p>
                <p className="text-[11px] text-amber-300/80 font-medium mt-0.5">
                  Todos os totais estimados, faturamentos, comissões e descontos da equipe abaixo correspondem aos registros dessa semana passada.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider shrink-0 transition-all shadow-md cursor-pointer active:scale-95 self-start sm:self-center"
            >
              Retornar à Semana Atual
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. CARDS DE MÉTRICAS DA EQUIPE & TOTAL ESTIMADO */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          
          {/* Card 1: TOTAL ESTIMADO DA EQUIPE (DESTAQUE PRINCIPAL) */}
          <div className="bg-gradient-to-br from-emerald-950/40 to-[var(--bg-card)] border-2 border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-lg shadow-emerald-950/20 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Total Estimado da Equipe
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <DollarSign className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 truncate">
                {formatCurrencyBR(metrics.totalEstimadoEquipe)}
              </span>
            </div>
            <p className="mt-2 text-[10px] text-[var(--text-muted)] font-medium">
              Previsão semanal a repassar (Base + Comissões - Descontos)
            </p>
          </div>

          {/* Card 2: Comissões Acumuladas na Semana */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 shadow-sm hover:border-[var(--accent-red)]/30 transition-all relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                Comissões da Semana
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-rose-400 truncate">
                {formatCurrencyBR(metrics.totalComissaoSemana)}
              </span>
            </div>
            <p className="mt-2 text-[10px] text-[var(--text-muted)] font-medium">
              Taxa média: {metrics.mediaComissao.toFixed(1)}% aplicada
            </p>
          </div>

          {/* Card 3: Produção & Meta Semanal */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 shadow-sm hover:border-[var(--accent-red)]/30 transition-all relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                Produção da Equipe
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-amber-400 truncate">
                {formatCurrencyBR(metrics.totalProducaoSemana)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px]">
              <span className="text-[var(--text-muted)] font-medium">
                Meta: {formatCurrencyBR(metrics.metaTotalAtivos)}
              </span>
              <span className="font-black text-amber-400">
                {metrics.metaProgressoGeral.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Card 4: Total da Equipe & Folha Base */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 shadow-sm hover:border-[var(--accent-red)]/30 transition-all relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                Equipe Ativa
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">
                {metrics.ativos}
              </span>
              <span className="text-xs text-[var(--text-muted)] font-medium">de {metrics.total} total</span>
            </div>
            <p className="mt-2 text-[10px] text-[var(--text-muted)] font-medium">
              Folha base semanal: {formatCurrencyBR(metrics.folhaBaseAtivos)}
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. BARRA DE PESQUISA, FILTROS E CONTROLES */}
        {/* ========================================================= */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Input de Busca */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou cargo do funcionário..."
                className="w-full h-11 pl-10 pr-9 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl text-xs sm:text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-red)] transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtros e Modos de Visualização */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Filtro Status */}
              <div className="flex items-center bg-[var(--bg-card-sec)] p-1 rounded-xl border border-[var(--border-color)]">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === 'all'
                      ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  Todos ({colaboradores.length})
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-emerald-400'
                  }`}
                >
                  Ativos ({metrics.ativos})
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === 'inactive'
                      ? 'bg-rose-500/20 text-rose-400 shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-rose-400'
                  }`}
                >
                  Inativos ({metrics.inativos})
                </button>
              </div>

              {/* Ordenação */}
              <select
                value={sortBy || 'estimado'}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-10 px-3 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)] cursor-pointer"
              >
                <option value="estimado">💵 Maior Total Estimado</option>
                <option value="comissao">📈 Maior Comissão da Semana</option>
                <option value="producao">🎯 Maior Produção da Semana</option>
                <option value="salario">💰 Maior Salário Base</option>
                <option value="nome">🔤 Nome (A - Z)</option>
                <option value="recentes">🕒 Mais Recentes</option>
              </select>

              {/* Grid / Table Switcher */}
              <div className="flex items-center bg-[var(--bg-card-sec)] p-1 rounded-xl border border-[var(--border-color)] shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-[var(--bg-card)] text-[var(--accent-red)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                  title="Visualização em Cards com Totais Estimados"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'table'
                      ? 'bg-[var(--bg-card)] text-[var(--accent-red)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                  title="Visualização em Tabela com Totais Estimados"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Sub-filtro de modo de lançamento */}
          <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)] overflow-x-auto pb-1">
            <span className="font-bold shrink-0 flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Modo:
            </span>
            <button
              onClick={() => setModoFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                modoFilter === 'all'
                  ? 'bg-[var(--border-color)] text-[var(--text-main)] font-bold'
                  : 'hover:text-[var(--text-main)]'
              }`}
            >
              Todos os Modos
            </button>
            <button
              onClick={() => setModoFilter('livre')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                modoFilter === 'livre'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                  : 'hover:text-emerald-400'
              }`}
            >
              🟢 Modo Livre
            </button>
            <button
              onClick={() => setModoFilter('somente_nota')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                modoFilter === 'somente_nota'
                  ? 'bg-amber-500/20 text-amber-400 font-bold'
                  : 'hover:text-amber-400'
              }`}
            >
              🟠 Somente Nota
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. LISTA DE FUNCIONÁRIOS (GRID OU TABELA) */}
        {/* ========================================================= */}
        {loading ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-16 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[var(--accent-red)]" />
            <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] animate-pulse">
              Carregando colaboradores e calculando totais estimados...
            </p>
          </div>
        ) : filteredColaboradores.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--text-muted)]">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[var(--text-main)]">
                Nenhum colaborador encontrado
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all' || modoFilter !== 'all'
                  ? 'Nenhum funcionário corresponde aos filtros de busca aplicados.'
                  : 'Nenhum funcionário cadastrado no sistema ainda. Cadastre o primeiro para começar!'}
              </p>
            </div>
            {(searchQuery || statusFilter !== 'all' || modoFilter !== 'all') ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setModoFilter('all');
                }}
                className="px-4 py-2 rounded-xl bg-[var(--bg-card-sec)] text-xs font-bold text-[var(--text-main)] border border-[var(--border-color)] hover:bg-[var(--border-color)] transition-all"
              >
                Limpar Filtros
              </button>
            ) : (
              <button
                onClick={openNewForm}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 hover:opacity-90 transition-all"
              >
                + Adicionar Primeiro Funcionário
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* ========================================================= */
          /* GRID VIEW COM DESTAQUE NO TOTAL ESTIMADO */
          /* ========================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredColaboradores.map((c) => {
              const stats = weeklyStatsMap[c.id] || {
                salarioBase: Number(c.salario_base) || 0,
                totalComissao: 0,
                totalProducao: 0,
                totalDescontos: 0,
                totalPago: 0,
                totalEstimado: Number(c.salario_base) || 0,
                qtdServicos: 0,
                metaSemanal: Number(c.meta_semanal) || 0,
                percentualMeta: 0,
              };

              const isSomenteNota = c.modo_lancamento_comissao === 'somente_nota';

              return (
                <div
                  key={c.id}
                  className={`group bg-[var(--bg-card)] rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-md hover:shadow-xl ${
                    c.ativo
                      ? 'border-[var(--border-color)] hover:border-emerald-500/40'
                      : 'border-[var(--border-color)] opacity-65 bg-[var(--bg-card)]/50'
                  }`}
                >
                  {/* Top Header do Card */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      {/* Avatar e Nome */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                            c.nome
                          )} flex items-center justify-center text-white font-black text-base shadow-md shrink-0`}
                        >
                          {getInitials(c.nome)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base text-[var(--text-main)] truncate" title={c.nome}>
                              {c.nome}
                            </h3>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] font-medium flex items-center gap-1.5 mt-0.5 truncate">
                            <Briefcase className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                            <span>{c.cargo || 'Cargo não especificado'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <button
                        onClick={() => handleToggleAtivo(c)}
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border transition-all shrink-0 cursor-pointer ${
                          c.ativo
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                        title={c.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                      >
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>

                    {/* ========================================================= */}
                    {/* BLOCO DO TOTAL ESTIMADO (DESTAQUE DA SEMANA) */}
                    {/* ========================================================= */}
                    <div className="bg-gradient-to-br from-emerald-950/30 to-[var(--bg-card-sec)] p-4 rounded-2xl border-2 border-emerald-500/30 shadow-inner space-y-2 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5" /> Total Estimado (Semana)
                        </span>
                        {stats.qtdServicos > 0 && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                            {stats.qtdServicos} {stats.qtdServicos === 1 ? 'serviço' : 'serviços'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                          {formatCurrencyBR(stats.totalEstimado)}
                        </span>
                      </div>

                      {/* Memória de Cálculo Resumida */}
                      <div className="pt-2 border-t border-[var(--border-color)]/60 grid grid-cols-3 gap-1 text-[10px] text-center">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-semibold text-[var(--text-muted)] block">Salário Base</span>
                          <span className="font-bold text-[var(--text-main)]">{formatCurrencyBR(stats.salarioBase)}</span>
                        </div>
                        <div className="space-y-0.5 border-x border-[var(--border-color)]/60">
                          <span className="text-[9px] font-semibold text-emerald-400 block">+ Comissões</span>
                          <span className="font-bold text-emerald-400">+{formatCurrencyBR(stats.totalComissao)}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-semibold text-rose-400 block">- Descontos</span>
                          <span className="font-bold text-rose-400">-{formatCurrencyBR(stats.totalDescontos)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Progresso da Meta Semanal */}
                    {stats.metaSemanal > 0 && (
                      <div className="space-y-1.5 bg-[var(--bg-card-sec)] p-3 rounded-2xl border border-[var(--border-color)]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1">
                            <Target className="w-3 h-3 text-amber-400" />
                            Meta de Produção
                          </span>
                          <span className="font-black text-amber-400 text-xs">
                            {formatCurrencyBR(stats.totalProducao)} / {formatCurrencyBR(stats.metaSemanal)} ({stats.percentualMeta.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[var(--bg-main)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              stats.percentualMeta >= 100
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-amber-500 to-orange-400'
                            }`}
                            style={{ width: `${Math.min(stats.percentualMeta, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Tags & Modos de Lançamento */}
                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                      <span
                        className={`font-bold uppercase px-2.5 py-0.5 rounded-lg border ${
                          isSomenteNota
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {isSomenteNota ? '🟠 Somente Nota' : '🟢 Modo Livre'}
                      </span>

                      <span className="font-semibold text-[var(--text-muted)] bg-[var(--bg-card-sec)] px-2 py-0.5 rounded-md border border-[var(--border-color)]">
                        Taxa: {c.comissao_padrao_percentual || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Rodapé de Ações */}
                  <div className="px-5 py-3.5 bg-[var(--bg-card-sec)]/60 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyAccess(c)}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] transition-all cursor-pointer"
                        title="Copiar dados de acesso (login e senha)"
                      >
                        {copiedId === c.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => openEditForm(c)}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-primary-400 hover:bg-[var(--border-color)] transition-all cursor-pointer"
                        title="Editar funcionário"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(c)}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                        title="Excluir funcionário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => setSelected(c)}
                      className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-red-600/20 transition-all cursor-pointer active:scale-95 group-hover:shadow-red-600/40"
                    >
                      <span>Ver Painel</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================================= */
          /* TABLE VIEW COM COLUNA DO TOTAL ESTIMADO */
          /* ========================================================= */
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] shadow-md overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[var(--bg-card-sec)] border-b border-[var(--border-color)] text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="py-4 px-5">Colaborador</th>
                    <th className="py-4 px-4">Cargo</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4 text-right">Salário Base</th>
                    <th className="py-4 px-4 text-right">Comissão Semana</th>
                    <th className="py-4 px-4 text-right">Descontos</th>
                    <th className="py-4 px-4 text-right text-emerald-400 bg-emerald-500/5">💵 Total Estimado</th>
                    <th className="py-4 px-4 text-right">Produção / Meta</th>
                    <th className="py-4 px-4">Modo</th>
                    <th className="py-4 px-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredColaboradores.map((c) => {
                    const stats = weeklyStatsMap[c.id] || {
                      salarioBase: Number(c.salario_base) || 0,
                      totalComissao: 0,
                      totalProducao: 0,
                      totalDescontos: 0,
                      totalPago: 0,
                      totalEstimado: Number(c.salario_base) || 0,
                      qtdServicos: 0,
                      metaSemanal: Number(c.meta_semanal) || 0,
                      percentualMeta: 0,
                    };
                    const isSomenteNota = c.modo_lancamento_comissao === 'somente_nota';

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-[var(--bg-card-sec)]/50 transition-colors group"
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(
                                c.nome
                              )} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm`}
                            >
                              {getInitials(c.nome)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-[var(--text-main)] block text-sm">
                                {c.nome}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)]">
                                Taxa: {c.comissao_padrao_percentual || 0}%
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-[var(--text-main)]">
                          {c.cargo || <span className="text-[var(--text-muted)] italic">—</span>}
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleAtivo(c)}
                            className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                              c.ativo
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                            }`}
                          >
                            {c.ativo ? 'Ativo' : 'Inativo'}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right font-black text-[var(--text-main)]">
                          {formatCurrencyBR(stats.salarioBase)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-black text-rose-400">
                          {formatCurrencyBR(stats.totalComissao)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-black text-rose-400">
                          {stats.totalDescontos > 0 ? `-${formatCurrencyBR(stats.totalDescontos)}` : 'R$ 0,00'}
                        </td>

                        {/* TOTAL ESTIMADO EM DESTAQUE */}
                        <td className="py-3.5 px-4 text-right font-black text-emerald-400 text-sm bg-emerald-500/5">
                          {formatCurrencyBR(stats.totalEstimado)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-black text-amber-400">
                          <div>
                            <span>{formatCurrencyBR(stats.totalProducao)}</span>
                            {stats.metaSemanal > 0 && (
                              <span className="text-[10px] text-[var(--text-muted)] block font-normal">
                                Meta: {formatCurrencyBR(stats.metaSemanal)} ({stats.percentualMeta.toFixed(0)}%)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg border ${
                              isSomenteNota
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {isSomenteNota ? 'Somente Nota' : 'Livre'}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleCopyAccess(c)}
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)]"
                              title="Copiar dados de acesso"
                            >
                              {copiedId === c.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>

                            <button
                              onClick={() => openEditForm(c)}
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-primary-400 hover:bg-[var(--border-color)]"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDelete(c)}
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setSelected(c)}
                              className="ml-1 flex items-center gap-1 h-8 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-[11px] font-black uppercase tracking-wider shadow-sm hover:opacity-90"
                            >
                              Painel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. MODAL DE CRIAÇÃO / EDIÇÃO DO FUNCIONÁRIO */}
        {/* ========================================================= */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Header do Modal */}
              <div className="px-6 py-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-card-sec)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[var(--accent-red)]/10 text-[var(--accent-red)] flex items-center justify-center">
                    {editingId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-[var(--text-main)]">
                      {editingId ? 'Editar Funcionário' : 'Novo Funcionário'}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {editingId
                        ? 'Altere os dados, permissões e parâmetros financeiros do colaborador.'
                        : 'Cadastre um novo colaborador para acompanhar metas e comissões.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeModal}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl hover:bg-[var(--border-color)] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo do Formulário */}
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                {/* Seção 1: Dados de Acesso */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[var(--accent-red)] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> 1. Identificação & Acesso
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <label className="space-y-1 block">
                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                        Nome Completo *
                      </span>
                      <input
                        type="text"
                        value={form.nome}
                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        placeholder="Ex: Carlos Oliveira"
                        className="w-full h-11 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3.5 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-red)] transition-all font-medium"
                      />
                    </label>

                    <label className="space-y-1 block">
                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                        Cargo / Função
                      </span>
                      <input
                        type="text"
                        value={form.cargo}
                        onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                        placeholder="Ex: Aplicador / Designer"
                        className="w-full h-11 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3.5 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-red)] transition-all font-medium"
                      />
                    </label>
                  </div>

                  {/* Campo de Senha com Gerador */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                        Senha de Acesso *
                      </span>
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="text-[10px] font-bold text-[var(--accent-red)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" /> Gerar Senha Segura
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showPasswordInModal ? 'text' : 'password'}
                        value={form.senha}
                        onChange={(e) => setForm({ ...form, senha: e.target.value })}
                        placeholder="Senha de acesso do colaborador"
                        className="w-full h-11 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl pl-3.5 pr-11 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-red)] transition-all font-medium font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 cursor-pointer"
                      >
                        {showPasswordInModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Seção 2: Configurações Financeiras */}
                <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[var(--accent-red)] flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> 2. Parâmetros Salariais & Metas
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <label className="space-y-1 block">
                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                        Salário Base (R$)
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={form.salarioBase || ''}
                        onChange={(e) => setForm({ ...form, salarioBase: Number(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="w-full h-11 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-red)] transition-all font-bold"
                      />
                    </label>

                    <label className="space-y-1 block">
                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                        Comissão Padrão (%)
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        value={form.comissaoPadraoPercentual || ''}
                        onChange={(e) => setForm({ ...form, comissaoPadraoPercentual: Number(e.target.value) || 0 })}
                        placeholder="10"
                        className="w-full h-11 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3.5 text-sm text-emerald-400 focus:outline-none focus:border-[var(--accent-red)] transition-all font-bold"
                      />
                    </label>

                    <label className="space-y-1 block">
                      <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                        Meta Semanal (R$)
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={form.metaSemanal || ''}
                        onChange={(e) => setForm({ ...form, metaSemanal: Number(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="w-full h-11 bg-[var(--bg-card-sec)] border border-[var(--border-color)] rounded-xl px-3.5 text-sm text-amber-400 focus:outline-none focus:border-[var(--accent-red)] transition-all font-bold"
                      />
                    </label>
                  </div>
                </div>

                {/* Seção 3: Modo de Lançamento de Comissões */}
                <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[var(--accent-red)] flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> 3. Regra de Lançamento de Comissão
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Modo Livre */}
                    <div
                      onClick={() => setForm({ ...form, modoLancamento: 'livre' })}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        form.modoLancamento === 'livre'
                          ? 'border-[var(--accent-red)] bg-[var(--accent-red)]/10 shadow-sm'
                          : 'border-[var(--border-color)] bg-[var(--bg-card-sec)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-[var(--text-main)] flex items-center gap-1.5">
                          <CheckCircle2 className={`w-4 h-4 ${form.modoLancamento === 'livre' ? 'text-[var(--accent-red)]' : 'text-[var(--text-muted)]'}`} />
                          Modo Livre
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Flexível</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                        Colaborador pode lançar serviços avulsos manualmente e também puxar direto das notas/pedidos do sistema.
                      </p>
                    </div>

                    {/* Somente Nota */}
                    <div
                      onClick={() => setForm({ ...form, modoLancamento: 'somente_nota' })}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        form.modoLancamento === 'somente_nota'
                          ? 'border-[var(--accent-red)] bg-[var(--accent-red)]/10 shadow-sm'
                          : 'border-[var(--border-color)] bg-[var(--bg-card-sec)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-[var(--text-main)] flex items-center gap-1.5">
                          <CheckCircle2 className={`w-4 h-4 ${form.modoLancamento === 'somente_nota' ? 'text-[var(--accent-red)]' : 'text-[var(--text-muted)]'}`} />
                          Somente Nota
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">Controlado</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                        Só permite adicionar itens vinculados obrigatoriamente a uma nota de serviço já cadastrada na empresa.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Seção 4: Status Ativo / Inativo */}
                <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[var(--text-main)] block">Status da Conta</span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {form.ativo ? 'O colaborador pode acessar o sistema normalmente.' : 'O acesso do colaborador está bloqueado.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, ativo: !form.ativo })}
                    className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                      form.ativo
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {form.ativo ? 'Conta Ativa' : 'Conta Inativa'}
                  </button>
                </div>
              </div>

              {/* Rodapé do Modal */}
              <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card-sec)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-11 px-5 rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="h-11 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
