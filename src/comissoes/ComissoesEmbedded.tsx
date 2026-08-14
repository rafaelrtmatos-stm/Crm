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
  getServicesFromSupabase,
  saveServiceToSupabase,
  deleteServiceFromSupabase,
  saveColaboradorSettings,
  colaboradorToUserSettings,
  calculateSummaryStats,
  applyComissoesTheme,
} from './utils/supabaseStorage';
import { ColaboradorLogin } from './ColaboradorLogin';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ServiceTable } from './components/ServiceTable';
import { WeeklyCalendarView } from './components/WeeklyCalendarView';
import { ReportsView } from './components/ReportsView';
import { ServiceModal } from './components/ServiceModal';
import { SettingsModal } from './components/SettingsModal';
import { ServicosAgendados } from './components/ServicosAgendados';
import { CheckCircle2 } from 'lucide-react';
import './comissoes-theme.css';

// Sessão própria (não mexe na sessão do colaborador usada em /comissoes)
const COLABORADOR_SESSION_KEY = 'rpro_comissoes_colaborador_id_menu';

export default function ComissoesEmbedded({ presetColaborador }: { presetColaborador?: Colaborador } = {}) {
  const [colaborador, setColaborador] = useState<Colaborador | null>(presetColaborador ?? null);
  const [checkingSession, setCheckingSession] = useState(!presetColaborador);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    userName: '', userRole: '', baseSalary: 0, defaultCommissionRate: 10, weeklyGoal: 0, themePreference: 'dark',
  });
  const [loadingData, setLoadingData] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'weekly' | 'table' | 'reports' | 'servicos'>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  useEffect(() => {
    if (!colaborador) return;
    setUserSettings(colaboradorToUserSettings(colaborador));
    applyComissoesTheme(colaborador.tema, wrapperRef.current);
    setLoadingData(true);
    getServicesFromSupabase(colaborador.id).then((list) => {
      setServices(list);
      setLoadingData(false);
    });
  }, [colaborador]);

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
    applyComissoesTheme(newSettings.themePreference, wrapperRef.current);
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
    setIsAddModalOpen(true);
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
        onOpenAddModal={() => { setEditingService(null); setModalInitialDate(undefined); setIsAddModalOpen(true); }}
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
                onOpenAddModal={() => { setEditingService(null); setModalInitialDate(undefined); setIsAddModalOpen(true); }}
                onGoToTable={() => setActiveTab('table')}
                onEditService={handleEditService}
                weeklyGoal={userSettings.weeklyGoal}
              />
            )}
            {activeTab === 'weekly' && (
              <WeeklyCalendarView
                services={services}
                onEditService={handleEditService}
                onDeleteService={handleDeleteService}
                onOpenAddModalWithDate={(dateISO) => { setEditingService(null); setModalInitialDate(dateISO); setIsAddModalOpen(true); }}
                weeklyGoal={userSettings.weeklyGoal}
              />
            )}
            {activeTab === 'table' && (
              <ServiceTable
                services={services}
                baseSalary={userSettings.baseSalary}
                onEditService={handleEditService}
                onDeleteService={handleDeleteService}
                onOpenAddModal={() => { setEditingService(null); setModalInitialDate(undefined); setIsAddModalOpen(true); }}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsView services={services} userSettings={userSettings} stats={summaryStats} />
            )}
            {activeTab === 'servicos' && <ServicosAgendados />}
          </>
        )}
      </main>

      <ServiceModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditingService(null); setModalInitialDate(undefined); }}
        onSave={handleSaveService}
        editingService={editingService}
        initialDate={modalInitialDate}
        defaultCommissionRate={userSettings.defaultCommissionRate}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userSettings={userSettings}
        onSaveSettings={handleSaveSettings}
        onResetData={() => showToast('Reiniciar dados desativado — os dados agora ficam salvos no servidor.')}
      />
    </div>
  );
}
