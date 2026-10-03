import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, 
  Flame, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Trophy, 
  Edit3, 
  Check, 
  X,
  HelpCircle,
  Calendar,
  Sparkles
} from 'lucide-react';
import { GlassCard, Button, Badge, cn } from './SharedUI';
import { SaleOrder } from '../types';
import { supabase } from '../supabase';

interface DashboardMetasCardProps {
  realSales: SaleOrder[];
  despesasFixasBaseMensal: number;
  contributionMargin: number;
}

export interface MetasConfig {
  diaria: number;
  semanal: number;
  mensal: number;
}

const STORAGE_METAS_KEY = 'rpro_dashboard_metas_config';

const DEFAULT_METAS: MetasConfig = {
  diaria: 1500,
  semanal: 10000,
  mensal: 45000,
};

export const DashboardMetasCard: React.FC<DashboardMetasCardProps> = ({
  realSales,
  despesasFixasBaseMensal,
  contributionMargin,
}) => {
  const [tab, setTab] = useState<'diaria' | 'semanal' | 'mensal'>('diaria');
  const [metas, setMetas] = useState<MetasConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_METAS_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_METAS;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [folhaSupabase, setFolhaSupabase] = useState<number>(0);

  // Carrega folha salarial real dos colaboradores ativos no Supabase
  useEffect(() => {
    const loadFolha = async () => {
      try {
        const { data } = await supabase
          .from('colaboradores')
          .select('salario_base, ativo')
          .eq('ativo', true);

        if (data && data.length > 0) {
          const soma = data.reduce((acc, c: any) => acc + (Number(c.salario_base) || 0), 0);
          if (soma > 0) {
            setFolhaSupabase(soma > 10000 ? soma : soma * 4);
          } else {
            setFolhaSupabase(0);
          }
        } else {
          setFolhaSupabase(0);
        }
      } catch (err) {
        console.warn('Erro ao carregar salários de colaboradores para o Ponto de Equilíbrio:', err);
      }
    };
    loadFolha();

    const colabChannel = supabase
      .channel('dashboard-colaboradores-folha')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colaboradores' }, () => {
        loadFolha();
      })
      .subscribe();

    const handleUpdate = () => {
      loadFolha();
    };
    window.addEventListener('focus', handleUpdate);
    window.addEventListener('rpro-colab-updated', handleUpdate);

    return () => {
      supabase.removeChannel(colabChannel);
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('rpro-colab-updated', handleUpdate);
    };
  }, []);

  // Soma dos salários fixos mínimos dos funcionários ativos para compor o Ponto de Equilíbrio
  const folhaFixaMensal = useMemo(() => {
    if (folhaSupabase > 0) return folhaSupabase;
    if (typeof window === 'undefined') return 0;
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('rpro_colab_remun_') || key.includes('colab'))) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            const salario = Number(data.salarioBase || data.salario_base || 0);
            if (salario > 0 && data.ativo !== false) {
              total += salario;
            }
          } catch {}
        }
      }
      if (total > 0) return total > 10000 ? total : total * 4;

      const rawList = localStorage.getItem('rpro_colaboradores_list');
      if (rawList) {
        const list = JSON.parse(rawList);
        if (Array.isArray(list)) {
          const soma = list
            .filter((c: any) => c.ativo !== false)
            .reduce((acc: number, c: any) => acc + (Number(c.salarioBase || c.salario_base) || 0), 0);
          if (soma > 0) return soma > 10000 ? soma : soma * 4;
        }
      }
    } catch {}
    return 0;
  }, [folhaSupabase]);

  const custoTotalFixoMensal = despesasFixasBaseMensal + folhaFixaMensal;

  const handleStartEdit = () => {
    setEditValue(metas[tab].toString());
    setIsEditing(true);
  };

  // Cálculo bidirecional: alterando diária, semanal ou mensal calcula as outras duas
  // Proporção oficial de operação: 6 dias úteis por semana e 26 dias operacionais no mês
  const handleSaveEdit = () => {
    const val = parseFloat(editValue.replace(',', '.')) || 0;
    if (val > 0) {
      let updated = { ...metas };
      if (tab === 'diaria') {
        const diaria = val;
        const semanal = Math.round(val * 6);
        const mensal = Math.round(val * 26);
        updated = { diaria, semanal, mensal };
      } else if (tab === 'semanal') {
        const semanal = val;
        const diaria = Math.round((val / 6) * 100) / 100;
        const mensal = Math.round((val / 6) * 26);
        updated = { diaria, semanal, mensal };
      } else {
        const mensal = val;
        const diaria = Math.round((val / 26) * 100) / 100;
        const semanal = Math.round(((val / 26) * 6) * 100) / 100;
        updated = { diaria, semanal, mensal };
      }
      setMetas(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_METAS_KEY, JSON.stringify(updated));
      }
    }
    setIsEditing(false);
  };

  // 1. Apuração das vendas e lucro líquido real para cada período
  const { realizado, breakeven, metaAlvo, custoFixoPeriodo, lucroRealizado, lucroProjetadoMeta } = useMemo(() => {
    const now = new Date();
    const margin = contributionMargin > 0 ? contributionMargin : 0.65;

    let faturamentoPeriodo = 0;
    let custoPeriodo = custoTotalFixoMensal;
    let metaPeriodo = metas.mensal;

    if (tab === 'diaria') {
      const startToday = new Date(now);
      startToday.setHours(0, 0, 0, 0);
      const endToday = new Date(now);
      endToday.setHours(23, 59, 59, 999);

      faturamentoPeriodo = realSales
        .filter(s => s.status !== 'canceled')
        .filter(s => {
          const d = new Date(s.createdAt);
          return d >= startToday && d <= endToday;
        })
        .reduce((acc, s) => acc + (s.total || 0), 0);

      // 26 dias úteis de trabalho no mês
      custoPeriodo = custoTotalFixoMensal / 26;
      metaPeriodo = metas.diaria;
    } else if (tab === 'semanal') {
      const day = now.getDay();
      const diffToSaturday = day === 6 ? 0 : (day + 1);
      const startSab = new Date(now);
      startSab.setDate(now.getDate() - diffToSaturday);
      startSab.setHours(0, 0, 0, 0);

      const endSex = new Date(startSab);
      endSex.setDate(startSab.getDate() + 6);
      endSex.setHours(23, 59, 59, 999);

      faturamentoPeriodo = realSales
        .filter(s => s.status !== 'canceled')
        .filter(s => {
          const d = new Date(s.createdAt);
          return d >= startSab && d <= endSex;
        })
        .reduce((acc, s) => acc + (s.total || 0), 0);

      // Ciclo de 6 dias úteis por semana
      custoPeriodo = (custoTotalFixoMensal / 26) * 6;
      metaPeriodo = metas.semanal;
    } else {
      const startMes = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      faturamentoPeriodo = realSales
        .filter(s => s.status !== 'canceled')
        .filter(s => {
          const d = new Date(s.createdAt);
          return d >= startMes && d <= endMes;
        })
        .reduce((acc, s) => acc + (s.total || 0), 0);

      custoPeriodo = custoTotalFixoMensal;
      metaPeriodo = metas.mensal;
    }

    const be = custoPeriodo / margin;
    const lReal = (faturamentoPeriodo * margin) - custoPeriodo;
    const lProj = (metaPeriodo * margin) - custoPeriodo;

    return {
      realizado: faturamentoPeriodo,
      breakeven: be,
      metaAlvo: metaPeriodo,
      custoFixoPeriodo: custoPeriodo,
      lucroRealizado: lReal,
      lucroProjetadoMeta: lProj,
    };
  }, [tab, realSales, custoTotalFixoMensal, contributionMargin, metas]);

  // Status e cálculos de progresso
  const isAbaixoBreakeven = realizado < breakeven;
  const isMetaBatida = realizado >= metaAlvo;

  // Escala da barra visual: o máximo entre a meta, o breakeven e o realizado
  const escalaMaxima = Math.max(metaAlvo * 1.1, breakeven * 1.2, realizado * 1.05, 1);
  const progressoPercentual = Math.min(100, Math.max(0, (realizado / escalaMaxima) * 100));
  const breakevenPosPercentual = Math.min(95, Math.max(5, (breakeven / escalaMaxima) * 100));
  const metaPosPercentual = Math.min(98, Math.max(10, (metaAlvo / escalaMaxima) * 100));

  const percentualMetaAtingido = metaAlvo > 0 ? (realizado / metaAlvo) * 100 : 0;

  return (
    <GlassCard className="p-5 sm:p-6 border-white/10 bg-gradient-to-br from-slate-900/90 via-[#0e1626]/90 to-slate-900/90 relative overflow-hidden shadow-2xl space-y-5">
      {/* Background Glow */}
      <div 
        className={cn(
          "absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700",
          isMetaBatida ? "bg-emerald-500" : isAbaixoBreakeven ? "bg-rose-500" : "bg-sky-500"
        )} 
      />

      {/* Header com Abas e Controle de Edição */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center border transition-colors",
            isMetaBatida ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
            isAbaixoBreakeven ? "bg-rose-500/20 text-rose-400 border-rose-500/30" :
            "bg-sky-500/20 text-sky-300 border-sky-500/30"
          )}>
            {isMetaBatida ? <Trophy size={18} className="animate-bounce" /> : <Target size={18} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white uppercase italic tracking-tight">
                Termômetro de Metas & Ponto de Equilíbrio
              </h3>
              {isMetaBatida && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                  Meta Batida! 🚀
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">
              {tab === 'diaria' ? 'Apuração das Vendas de Hoje' :
               tab === 'semanal' ? 'Ciclo Semanal Oficial (Sábado a Sexta)' :
               'Apuração do Mês Vigente'}
            </p>
          </div>
        </div>

        {/* Seletor de Abas: Diária / Semanal / Mensal */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          {(['diaria', 'semanal', 'mensal'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setIsEditing(false); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                tab === t
                  ? "bg-primary-500 text-slate-950 font-extrabold shadow-md shadow-primary-500/20"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              {t === 'diaria' ? '📅 Diária' : t === 'semanal' ? '🗓️ Semanal' : '📊 Mensal'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid com os 3 Indicadores Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
        {/* 1. Realizado */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
          <span className="text-[9px] font-black uppercase tracking-wider text-white/40">Faturamento Realizado</span>
          <p className="text-xl sm:text-2xl font-black text-white font-mono">
            R$ {realizado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={cn("text-[9px] font-bold", isAbaixoBreakeven ? "text-rose-400" : "text-emerald-400")}>
            {percentualMetaAtingido.toFixed(1)}% da meta alcançada
          </p>
        </div>

        {/* 2. Ponto de Equilíbrio (EM DESTAQUE VERMELHO) */}
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1 relative">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-rose-300">
              🔴 Ponto de Equilíbrio
            </span>
            <AlertTriangle size={13} className="text-rose-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
            R$ {breakeven.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] text-rose-300/80 font-bold">
            {isAbaixoBreakeven 
              ? `Faltam R$ ${(breakeven - realizado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para cobrir custos` 
              : `✓ Superado em +R$ ${(realizado - breakeven).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          </p>
        </div>

        {/* 3. Meta Desejada (EM DESTAQUE MAIOR COM BOTÃO DE EDITAR) */}
        <div className={cn(
          "p-3.5 rounded-xl border space-y-1 relative transition-colors",
          isMetaBatida 
            ? "bg-emerald-500/15 border-emerald-500/40" 
            : "bg-emerald-500/5 border-emerald-500/20"
        )}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
              🎯 Meta Alvo ({tab})
            </span>
            {!isEditing ? (
              <button
                onClick={handleStartEdit}
                className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Editar valor da meta"
              >
                <Edit3 size={13} />
              </button>
            ) : null}
          </div>

          {isEditing ? (
            <div className="flex items-center gap-1.5 pt-0.5">
              <input
                type="number"
                step="50"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                className="w-full bg-slate-900 border border-emerald-500 rounded px-2 py-1 text-sm font-black text-white font-mono outline-none"
              />
              <button
                onClick={handleSaveEdit}
                className="p-1 bg-emerald-500 text-slate-950 rounded hover:bg-emerald-400"
                title="Salvar"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 bg-white/10 text-white/60 rounded hover:bg-white/20"
                title="Cancelar"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              R$ {metaAlvo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}

          <p className="text-[9px] text-emerald-300/80 font-bold">
            {isMetaBatida 
              ? `🚀 Meta batida! Superávit de +R$ ${(realizado - metaAlvo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : `Faltam R$ ${Math.max(0, metaAlvo - realizado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          </p>
        </div>
      </div>

      {/* Barra Visual de Progresso com Marcador de Breakeven e Meta */}
      <div className="space-y-2 relative z-10 pt-2">
        <div className="relative w-full h-5 bg-white/5 rounded-full border border-white/10 p-0.5 overflow-visible">
          {/* Barra preenchida */}
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 relative overflow-hidden",
              isMetaBatida
                ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-lg shadow-emerald-500/30"
                : isAbaixoBreakeven
                ? "bg-gradient-to-r from-rose-600 to-rose-500 shadow-lg shadow-rose-500/30"
                : "bg-gradient-to-r from-rose-500 via-amber-400 to-sky-400 shadow-lg shadow-sky-500/30"
            )}
            style={{ width: `${progressoPercentual}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>

          {/* Marcador Vermelho: Ponto de Equilíbrio */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-rose-500 z-20 shadow-md shadow-rose-500/80"
            style={{ left: `${breakevenPosPercentual}%` }}
            title={`Ponto de Equilíbrio: R$ ${breakeven.toFixed(2)}`}
          >
            <span className="absolute -top-5 -translate-x-1/2 text-[8px] font-black uppercase tracking-wider text-rose-400 whitespace-nowrap bg-slate-950/90 px-1 py-0.5 rounded border border-rose-500/40">
              🔴 P. Equilíbrio
            </span>
          </div>

          {/* Marcador Verde: Meta Alvo */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-emerald-400 z-20 shadow-md shadow-emerald-400/80"
            style={{ left: `${metaPosPercentual}%` }}
            title={`Meta: R$ ${metaAlvo.toFixed(2)}`}
          >
            <span className="absolute -bottom-5 -translate-x-1/2 text-[8px] font-black uppercase tracking-wider text-emerald-400 whitespace-nowrap bg-slate-950/90 px-1 py-0.5 rounded border border-emerald-500/40">
              🎯 Meta
            </span>
          </div>
        </div>

        {/* Legenda de Status Abaixo da Barra */}
        <div className="flex items-center justify-between text-[10px] font-bold text-white/50 pt-2">
          <span>R$ 0,00</span>
          <span className={cn(
            "font-black uppercase tracking-wider",
            isMetaBatida ? "text-emerald-400" : isAbaixoBreakeven ? "text-rose-400" : "text-sky-300"
          )}>
            {isMetaBatida ? "🌟 Meta Conquistada com Sucesso!" :
             isAbaixoBreakeven ? "⚠️ Ainda na Zona de Custos (abaixo do Ponto de Equilíbrio)" :
             "✨ Ponto de Equilíbrio coberto! Rumo à Meta de Lucro!"}
          </span>
          <span>R$ {metaAlvo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      {/* Seção Exclusiva: Lucro Líquido Real no Bolso (Descontando Custos Fixos e Salários dos Funcionários) */}
      <div className="pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span>💰</span> Lucro Real Estimado na Meta
            </span>
            <span className="text-[9px] font-bold text-white/40">Após Insumos, Luz, Aluguel e Salários</span>
          </div>
          <p className="text-base sm:text-lg font-black text-emerald-300 font-mono">
            R$ {lucroProjetadoMeta.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] text-white/50 font-medium">
            Descontando <strong className="text-white/80">R$ {custoFixoPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> de custos fixos + folha de colaboradores do período.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <span>⚖️</span> Lucro Líquido Real Atual
            </span>
            <span className="text-[9px] font-bold text-white/40">Realizado {tab === 'diaria' ? 'Hoje' : tab === 'semanal' ? 'na Semana' : 'no Mês'}</span>
          </div>
          <p className={cn("text-base sm:text-lg font-black font-mono", lucroRealizado >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {lucroRealizado >= 0 ? '+' : '-'} R$ {Math.abs(lucroRealizado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-[9px] text-white/50">
            <span>Sincronia Bilateral:</span>
            <span className="font-mono text-white/70">Dia R$ {metas.diaria.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} | Sem R$ {metas.semanal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} | Mês R$ {metas.mensal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
