/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Versão "embutida" do app de Comissões, pra rodar dentro do sistema principal
// (menu lateral), sem virar página cheia. Reaproveita os mesmos componentes e a
// mesma lógica de dados do app completo (src/comissoes/ComissoesApp.tsx), só
// troca o wrapper de "página" (min-h-screen) por um wrapper que ocupa o espaço
// disponível dentro da área de conteúdo do sistema.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ServiceItem, UserSettings } from './types';
import {
  Colaborador,
  Desconto,
  getServicesFromSupabase,
  saveServiceToSupabase,
  deleteServiceFromSupabase,
  saveColaboradorSettings,
  colaboradorToUserSettings,
  calculateSummaryStats,
  mapColaboradorRow,
  getDescontosFromSupabase,
} from './utils/supabaseStorage';
import { supabase } from '../supabase';
import { ColaboradorLogin } from './ColaboradorLogin';
import { useSyncWithCrmTheme } from './utils/useSyncCrmTheme';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ServiceTable } from './components/ServiceTable';
import { WeeklyCalendarView } from './components/WeeklyCalendarView';
import { ReportsView } from './components/ReportsView';
import { ServiceModal } from './components/ServiceModal';
import { SettingsModal } from './components/SettingsModal';
import { ServicosAgendados } from './components/ServicosAgendados';
import { DescontosView } from './components/DescontosView';
import { NotaDetalhe, NotaSelecionadoItem } from './components/NotaDetalheModal';
import { CheckCircle2 } from 'lucide-react';
import './comissoes-theme.css';

// Sessão própria (não mexe na sessão do colaborador usada em /comissoes)
const COLABORADOR_SESSION_KEY = 'rpro_comissoes_colaborador_id_menu';

export default function ComissoesEmbedded({ presetColaborador }: { presetColaborador?: Colaborador } = {}) {
  const [colaborador, setColaborador] = useState<Colaborador | null>(presetColaborador ?? null);
  const [checkingSession, setCheckingSession] = useState(!presetColaborador);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [descontos, setDescontos] = useState<Desconto[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    userName: '', userRole: '', baseSalary: 0, defaultCommissionRate: 10, weeklyGoal: 0, themePreference: 'dark',
  });
  const [loadingData, setLoadingData] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'weekly' | 'table' | 'reports' | 'servicos' | 'descontos'>('dashboard');
  // So o admin (veio de "Ver Painel" no painel de Comissoes do CRM, com presetColaborador
  // preenchido) pode criar/editar/excluir desconto -- o colaborador (login proprio, seja
  // aqui no menu embutido ou em /comissoes) so enxerga, nunca escreve.
  const isAdmin = !!presetColaborador;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);
  const [modalHeaderOverride, setModalHeaderOverride] = useState<{ title: string; subtitle: string } | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Id do serviço a destacar na Planilha ao chegar via clique num item da lista do
  // Dashboard ("Serviços no Período") -- ver handleGoToServiceInTable abaixo.
  const [highlightServiceId, setHighlightServiceId] = useState<string | null>(null);
  const handleGoToServiceInTable = (serviceId: string) => {
    setHighlightServiceId(serviceId);
    setActiveTab('table');
  };

  useEffect(() => {
    // Modo "visão do admin": o colaborador já vem escolhido de fora (Configurações > Comissões),
    // sem precisar de login/senha. Não mexe em nenhuma sessão salva no navegador.
    if (presetColaborador) { setColaborador(presetColaborador); setCheckingSession(false); return; }

    const savedId = localStorage.getItem(COLABORADOR_SESSION_KEY);
    if (!savedId) { setCheckingSession(false); return; }
    import('../supabase').then(async ({ supabase }) => {
      const { data } = await supabase.from('colaboradores').select('*').eq('id', savedId).eq('ativo', true).maybeSingle();
      if (data) {
        setColaborador({
          id: data.id, nome: data.nome, cargo: data.cargo || undefined,
          salarioBase: Number(data.salario_base) || 0, comissaoPadraoPercentual: Number(data.comissao_padrao_percentual) || 10,
          metaSemanal: Number(data.meta_semanal) || 0, tema: data.tema || 'dark', ativo: data.ativo !== false,
        });
      } else {
        localStorage.removeItem(COLABORADOR_SESSION_KEY);
      }
      setCheckingSession(false);
    });
  }, [presetColaborador]);

  // Dentro do CRM, o modulo de Comissoes nao usa mais o tema salvo por
  // colaborador — ele segue o tema claro/escuro do CRM principal (ver hook).
  useSyncWithCrmTheme();

  useEffect(() => {
    if (!colaborador) return;
    setUserSettings(colaboradorToUserSettings(colaborador));
  }, [colaborador]);

  // Busca os serviços só quando o colaborador em si muda (não a cada
  // atualização de campo dele), pra não ficar recarregando/piscando a tela
  // toda vez que salário/meta/tema mudam em tempo real.
  useEffect(() => {
    if (!colaborador) return;
    setLoadingData(true);
    getServicesFromSupabase(colaborador.id).then((list) => {
      setServices(list);
      setLoadingData(false);
    });
    getDescontosFromSupabase(colaborador.id).then(setDescontos);
  }, [colaborador?.id]);

  // Tempo real: reflete na hora qualquer alteração feita em outro lugar
  // (o próprio colaborador lançando um serviço em /comissoes pelo celular,
  // outro admin editando salário/meta/nome, etc.), sem precisar recarregar.
  useEffect(() => {
    if (!colaborador?.id) return;
    const colaboradorId = colaborador.id;

    const servicosChannel = supabase
      .channel(`comissoes-servicos-${colaboradorId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comissoes_servicos', filter: `colaborador_id=eq.${colaboradorId}` },
        () => { getServicesFromSupabase(colaboradorId).then(setServices); }
      )
      .subscribe();

    const descontosChannel = supabase
      .channel(`comissoes-descontos-${colaboradorId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comissoes_descontos', filter: `colaborador_id=eq.${colaboradorId}` },
        () => { getDescontosFromSupabase(colaboradorId).then(setDescontos); }
      )
      .subscribe();

    const colaboradorChannel = supabase
      .channel(`comissoes-colaborador-${colaboradorId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'colaboradores', filter: `id=eq.${colaboradorId}` },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            showToast('Este colaborador foi removido.');
            setColaborador(null);
            setServices([]);
            return;
          }
          if (!payload.new) return;
          setColaborador(mapColaboradorRow(payload.new));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(servicosChannel);
      supabase.removeChannel(descontosChannel);
      supabase.removeChannel(colaboradorChannel);
    };
  }, [colaborador?.id]);

  const handleLoginSuccess = (c: Colaborador) => {
    localStorage.setItem(COLABORADOR_SESSION_KEY, c.id);
    setColaborador(c);
  };

  const handleLogout = () => {
    if (presetColaborador) return; // visão do admin não tem sessão própria pra deslogar
    localStorage.removeItem(COLABORADOR_SESSION_KEY);
    setColaborador(null);
    setServices([]);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveSettings = async (newSettings: UserSettings) => {
    if (!colaborador) return;
    setUserSettings(newSettings);
    const ok = await saveColaboradorSettings(colaborador.id, newSettings);
    showToast(ok ? 'Configurações salvas com sucesso!' : 'Não foi possível salvar.');
  };

  const handleSaveService = async (savedItem: ServiceItem) => {
    if (!colaborador) return;
    const exists = services.some((s) => s.id === savedItem.id);
    const saved = await saveServiceToSupabase(colaborador.id, savedItem, !exists);
    if (!saved) { showToast('Não foi possível salvar o serviço.'); return; }
    setServices((prev) => (exists ? prev.map((s) => (s.id === saved.id ? saved : s)) : [saved, ...prev]));
    showToast(exists ? 'Serviço atualizado com sucesso!' : 'Novo serviço adicionado!');
    setEditingService(null);
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Deseja realmente excluir este serviço da planilha?')) return;
    const ok = await deleteServiceFromSupabase(id);
    if (!ok) { showToast('Não foi possível excluir.'); return; }
    setServices((prev) => prev.filter((s) => s.id !== id));
    showToast('Serviço excluído.');
  };

  const handleEditService = (service: ServiceItem) => {
    setEditingService(service);
    setModalHeaderOverride(undefined);
    setIsAddModalOpen(true);
  };

  // Adiciona, de uma vez, os itens marcados pelo colaborador na nota agendada (aba
  // "Serviços") direto na tabela dele — o valor de cada item já vem revisado/editado
  // de lá. Quando é só 1 item, some direto sem precisar abrir mais nada.
  const handleAddItemsFromNota = async (items: NotaSelecionadoItem[], nota: NotaDetalhe, dataSelecionada: string) => {
    if (!colaborador || items.length === 0) return;
    const dataAgendada = dataSelecionada || new Date().toISOString().split('T')[0];
    const commissionPercent = userSettings.defaultCommissionRate;

    const resultados = await Promise.all(items.map((item) => {
      const productionValue = Number((item.value || 0).toFixed(2));
      const novoServico: ServiceItem = {
        id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: dataAgendada,
        clientName: nota.customer_name || '',
        serviceType: item.name,
        unit: 'unidade',
        quantity: item.quantity,
        unitPrice: item.quantity ? Number((productionValue / item.quantity).toFixed(2)) : productionValue,
        productionValue,
        commissionPercent,
        commissionValue: Number(((productionValue * commissionPercent) / 100).toFixed(2)),
        status: 'CONCLUÍDO',
        notes: `Adicionado da nota #${nota.id.slice(-6).toUpperCase()}`,
        createdAt: Date.now(),
      };
      return saveServiceToSupabase(colaborador.id, novoServico, true);
    }));

    const salvos = resultados.filter((r): r is ServiceItem => !!r);
    if (salvos.length === 0) { showToast('Não foi possível adicionar o(s) serviço(s).'); return; }
    setServices((prev) => [...salvos, ...prev]);
    showToast(salvos.length > 1 ? `${salvos.length} serviços adicionados!` : 'Serviço adicionado!');
    setActiveTab('table');
  };

  const summaryStats = useMemo(() => calculateSummaryStats(services, userSettings.baseSalary), [services, userSettings.baseSalary]);

  const todayStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayServices = services.filter((s) => s.date === todayStr && s.status !== 'CANCELADO');
    return {
      production: todayServices.reduce((acc, s) => acc + s.productionValue, 0),
      commission: todayServices.reduce((acc, s) => acc + s.commissionValue, 0),
      count: todayServices.length,
    };
  }, [services]);

  if (checkingSession) {
    return (
      <div className="comissoes-app h-full min-h-[420px] flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">Carregando...</p>
      </div>
    );
  }

  if (!colaborador) {
    return <ColaboradorLogin onLoginSuccess={handleLoginSuccess} embedded />;
  }

  return (
    <div ref={wrapperRef} className="comissoes-app h-full min-h-[420px] bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300 flex flex-col overflow-y-auto">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-gradient-red text-white px-4 py-3 rounded-xl shadow-red-lg-glow text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Header
        activeTab={activeTab as any}
        setActiveTab={setActiveTab as any}
        userSettings={userSettings}
        onOpenAddModal={() => { setEditingService(null); setModalInitialDate(undefined); setModalHeaderOverride(undefined); setIsAddModalOpen(true); }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={presetColaborador ? undefined : handleLogout}
      />

      <main className="flex-1 w-full mx-auto px-4 sm:px-6 py-6">
        {loadingData ? (
          <div className="animate-skeleton h-40 rounded-2xl" />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                userSettings={userSettings}
                stats={summaryStats}
                todayStats={todayStats}
                recentServices={services}
                onOpenAddModal={() => { setEditingService(null); setModalInitialDate(undefined); setModalHeaderOverride(undefined); setIsAddModalOpen(true); }}
                onGoToTable={() => setActiveTab('table')}
                onGoToDescontos={() => setActiveTab('descontos')}
                onGoToServiceInTable={handleGoToServiceInTable}
                onEditService={handleEditService}
                weeklyGoal={userSettings.weeklyGoal}
                descontos={descontos}
              />
            )}
            {activeTab === 'weekly' && (
              <WeeklyCalendarView
                services={services}
                onEditService={handleEditService}
                onDeleteService={handleDeleteService}
                onOpenAddModalWithDate={(dateISO) => { setEditingService(null); setModalInitialDate(dateISO); setModalHeaderOverride(undefined); setIsAddModalOpen(true); }}
                weeklyGoal={userSettings.weeklyGoal}
              />
            )}
            {activeTab === 'table' && (
              <ServiceTable
                services={services}
                baseSalary={userSettings.baseSalary}
                onEditService={handleEditService}
                onDeleteService={handleDeleteService}
                onOpenAddModal={() => { setEditingService(null); setModalInitialDate(undefined); setModalHeaderOverride(undefined); setIsAddModalOpen(true); }}
                highlightServiceId={highlightServiceId}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsView services={services} userSettings={userSettings} stats={summaryStats} onGoToServiceInTable={handleGoToServiceInTable} />
            )}
            {activeTab === 'servicos' && <ServicosAgendados onAddItemsToTable={handleAddItemsFromNota} />}
            {activeTab === 'descontos' && (
              <DescontosView colaboradorId={colaborador.id} descontos={descontos} isAdmin={isAdmin} onChange={setDescontos} baseSalary={userSettings.baseSalary} />
            )}
          </>
        )}
      </main>

      <ServiceModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditingService(null); setModalInitialDate(undefined); setModalHeaderOverride(undefined); }}
        onSave={handleSaveService}
        editingService={editingService}
        initialDate={modalInitialDate}
        defaultCommissionRate={userSettings.defaultCommissionRate}
        headerOverride={modalHeaderOverride}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userSettings={userSettings}
        onSaveSettings={handleSaveSettings}
        hideThemeOption
      />
    </div>
  );
}
