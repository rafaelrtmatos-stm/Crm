/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ServiceItem, UserSettings } from './types';
import {
  Colaborador,
  Desconto,
  getServicesFromSupabase,
  saveServiceToSupabase,
  inserirServicosDeNota,
  deleteServiceFromSupabase,
  getDeletedServicesFromSupabase,
  restoreServiceFromSupabase,
  saveColaboradorSettings,
  colaboradorToUserSettings,
  calculateSummaryStats,
  applyComissoesTheme,
  getDescontosFromSupabase,
  lancarComissoesComoCustoDaNota,
  mapColaboradorRow,
} from './utils/supabaseStorage';
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
import { getTodayISO } from './utils/dateHelpers';
import './comissoes-theme.css';

const COLABORADOR_SESSION_KEY = 'rpro_comissoes_colaborador_id';
const LOGIN_URL = 'https://pro.rafaartsgraphics.com.br';

export default function ComissoesApp() {
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [deletedServices, setDeletedServices] = useState<ServiceItem[]>([]);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isLoadingTrash, setIsLoadingTrash] = useState(false);
  const [descontos, setDescontos] = useState<Desconto[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    userName: '', userRole: '', baseSalary: 0, defaultCommissionRate: 10, weeklyGoal: 0, themePreference: 'dark',
  });
  const [loadingData, setLoadingData] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'weekly' | 'table' | 'reports' | 'servicos' | 'descontos'>('dashboard');
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

  // Login persistido localmente (so nesse navegador) — nao mexe em nada do login do CRM principal
  useEffect(() => {
    const savedId = localStorage.getItem(COLABORADOR_SESSION_KEY);
    if (!savedId) {
      // /comissoes nao tem (e nao deve ter) tela de login propria — o acesso so acontece
      // via redirect automatico depois do login em pro.rafaartsgraphics.com.br. Se alguem
      // cair aqui sem sessao valida (link direto, sessao expirada, etc), manda de volta
      // pro login principal em vez de mostrar um formulario nessa rota.
      window.location.href = LOGIN_URL;
      return;
    }
    import('../supabase').then(async ({ supabase }) => {
      const { data } = await supabase.from('colaboradores').select('*').eq('id', savedId).eq('ativo', true).maybeSingle();
      if (data) {
        setColaborador(mapColaboradorRow(data));
        setCheckingSession(false);
      } else {
        localStorage.removeItem(COLABORADOR_SESSION_KEY);
        window.location.href = LOGIN_URL;
      }
    });
  }, []);

  useEffect(() => {
    if (!colaborador) return;
    setUserSettings(colaboradorToUserSettings(colaborador));
    applyComissoesTheme(colaborador.tema, wrapperRef.current);
    setLoadingData(true);
    getServicesFromSupabase(colaborador.id).then((list) => {
      setServices(list);
      setLoadingData(false);
    });
    // So leitura -- essa tela e' sempre a visao do colaborador (login proprio), nunca
    // tem os botoes de criar/editar/excluir desconto (ver isAdmin={false} na DescontosView abaixo)
    getDescontosFromSupabase(colaborador.id).then(setDescontos);
  }, [colaborador]);

  const handleLogout = () => {
    localStorage.removeItem(COLABORADOR_SESSION_KEY);
    setColaborador(null);
    setServices([]);
    window.location.href = LOGIN_URL;
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
    if (!confirm('Deseja realmente excluir este serviço da planilha? Ele fica disponível na Lixeira por 30 dias.')) return;
    const ok = await deleteServiceFromSupabase(id);
    if (!ok) { showToast('Não foi possível excluir.'); return; }
    setServices((prev) => prev.filter((s) => s.id !== id));
    // Se a lixeira já estiver aberta, reflete o item recém-excluído nela também.
    if (isTrashOpen && colaborador) {
      getDeletedServicesFromSupabase(colaborador.id).then(setDeletedServices);
    }
    showToast('Serviço movido para a Lixeira.');
  };

  const handleToggleTrash = () => {
    const opening = !isTrashOpen;
    setIsTrashOpen(opening);
    if (opening && colaborador) {
      setIsLoadingTrash(true);
      getDeletedServicesFromSupabase(colaborador.id).then((list) => {
        setDeletedServices(list);
        setIsLoadingTrash(false);
      });
    }
  };

  const handleRestoreService = async (id: string) => {
    const ok = await restoreServiceFromSupabase(id);
    if (!ok) { showToast('Não foi possível restaurar o serviço.'); return; }
    setDeletedServices((prev) => prev.filter((s) => s.id !== id));
    if (colaborador) {
      getServicesFromSupabase(colaborador.id).then(setServices);
    }
    showToast('Serviço restaurado!');
  };

  const handleEditService = (service: ServiceItem) => {
    setEditingService(service);
    setModalHeaderOverride(undefined);
    setIsAddModalOpen(true);
  };

  // Ponto único ao clicar em "+ ADICIONAR SERVIÇO". Checa o modo do colaborador:
  // - "livre": abre o modal de lançamento manual (comportamento atual)
  // - "somente_nota": vai direto pra aba Serviços (lista de notas pra puxar itens)
  const handleOpenAddModal = (dateISO?: string) => {
    if (colaborador?.modoLancamentoComissao === 'somente_nota') {
      setActiveTab('servicos');
      showToast('Selecione uma nota para puxar os itens de serviço.');
      return;
    }
    setEditingService(null);
    setModalInitialDate(dateISO);
    setModalHeaderOverride(undefined);
    setIsAddModalOpen(true);
  };

  // Adiciona, de uma vez, os itens marcados pelo colaborador na nota agendada (aba
  // "Serviços") direto na tabela dele — o valor de cada item já vem revisado/editado
  // de lá. Quando é só 1 item, some direto sem precisar abrir mais nada.
  const handleAddItemsFromNota = async (items: NotaSelecionadoItem[], nota: NotaDetalhe, dataSelecionada: string): Promise<boolean> => {
    if (!colaborador || items.length === 0) return false;
    const dataAgendada = dataSelecionada || getTodayISO();
    const commissionPercent = userSettings.defaultCommissionRate;

    const itensParaInserir = items.map((item) => {
      const productionValue = Number((item.value || 0).toFixed(2));
      const commissionValue = Number(((productionValue * commissionPercent) / 100).toFixed(2));
      return {
        date: dataAgendada,
        clientName: nota.customer_name || '',
        serviceType: item.name,
        quantity: item.quantity,
        unitPrice: item.quantity ? Number((productionValue / item.quantity).toFixed(2)) : productionValue,
        productionValue,
        commissionPercent,
        commissionValue,
        notes: `Adicionado da nota #${nota.id.slice(-6).toUpperCase()}`,
        origemNotaId: nota.id,
        origemItemIndex: item.idx,
      };
    });

    const { salvos, erro } = await inserirServicosDeNota(colaborador.id, itensParaInserir);
    if (salvos.length === 0) {
      showToast(erro ? `Não foi possível adicionar: ${erro}` : 'Não foi possível adicionar o(s) serviço(s).');
      return false;
    }
    setServices((prev) => [...salvos, ...prev]);
    showToast(salvos.length > 1 ? `${salvos.length} serviços adicionados!` : 'Serviço adicionado!');
    setActiveTab('table');

    // Lança a comissão de cada item puxado como Custo Extra na nota de origem (aba "Custos
    // da Nota" do PDV), pra já abater no Lucro Líquido sem o Admin lançar mão de obra na mão.
    const comissoes = salvos.map((s) => ({
      descricao: `Comissão ${colaborador.nome} — ${s.serviceType} (${s.commissionPercent}%)`,
      valor: s.commissionValue,
    }));
    lancarComissoesComoCustoDaNota(nota.id, comissoes);
    return true;
  };

  const handleGoToPullFromNote = () => {
    setActiveTab('servicos');
    showToast('Selecione uma nota para puxar os itens de serviço.');
  };

  const summaryStats = useMemo(() => calculateSummaryStats(services, userSettings.baseSalary), [services, userSettings.baseSalary]);

  const todayStats = useMemo(() => {
    const todayStr = getTodayISO();
    const todayServices = services.filter((s) => s.date === todayStr && s.status !== 'CANCELADO');
    return {
      production: todayServices.reduce((acc, s) => acc + s.productionValue, 0),
      commission: todayServices.reduce((acc, s) => acc + s.commissionValue, 0),
      count: todayServices.length,
    };
  }, [services]);

  if (checkingSession) {
    return <div className="comissoes-app min-h-screen flex items-center justify-center"><p className="text-[var(--text-muted)] text-sm">Carregando...</p></div>;
  }

  if (!colaborador) {
    // Sem sessao valida e sem tela de login propria nessa rota — o redirect pro login
    // principal ja foi disparado no useEffect acima; so mostra um estado de espera curto
    // enquanto o navegador troca de pagina.
    return <div className="comissoes-app min-h-screen flex items-center justify-center"><p className="text-[var(--text-muted)] text-sm">Redirecionando...</p></div>;
  }

  return (
    <div ref={wrapperRef} className="comissoes-app min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300 flex flex-col">
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
        onOpenAddModal={() => handleOpenAddModal()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
                onOpenAddModal={() => handleOpenAddModal()}
                onGoToTable={() => setActiveTab('table')}
                onGoToDescontos={() => setActiveTab('descontos')}
                onGoToServiceInTable={handleGoToServiceInTable}
                onEditService={handleEditService}
                onGoToPullFromNote={handleGoToPullFromNote}
                weeklyGoal={userSettings.weeklyGoal}
                descontos={descontos}
                colaboradorId={colaborador?.id}
                onlyPullFromNote={colaborador?.modoLancamentoComissao === 'somente_nota'}
              />
            )}
            {activeTab === 'weekly' && (
              <WeeklyCalendarView
                services={services}
                onEditService={handleEditService}
                onDeleteService={handleDeleteService}
                onOpenAddModalWithDate={(dateISO) => handleOpenAddModal(dateISO)}
                weeklyGoal={userSettings.weeklyGoal}
              />
            )}
            {activeTab === 'table' && (
              <ServiceTable
                services={services}
                baseSalary={userSettings.baseSalary}
                onEditService={handleEditService}
                onDeleteService={handleDeleteService}
                onOpenAddModal={() => handleOpenAddModal()}
                highlightServiceId={highlightServiceId}
                deletedServices={deletedServices}
                isTrashOpen={isTrashOpen}
                isLoadingTrash={isLoadingTrash}
                onToggleTrash={handleToggleTrash}
                onRestoreService={handleRestoreService}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsView services={services} userSettings={userSettings} stats={summaryStats} onGoToServiceInTable={handleGoToServiceInTable} />
            )}
            {activeTab === 'servicos' && <ServicosAgendados onAddItemsToTable={handleAddItemsFromNota} colaboradorId={colaborador.id} />}
            {activeTab === 'descontos' && (
              <DescontosView colaboradorId={colaborador.id} descontos={descontos} isAdmin={false} onChange={setDescontos} baseSalary={userSettings.baseSalary} services={services} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-card)]/50 py-4 text-center text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-semibold">GESTOR DE PRODUÇÃO E COMISSÕES © {new Date().getFullYear()} — {colaborador.nome}</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono text-[11px]">Sistema Ativo</span>
          </div>
        </div>
      </footer>

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
      />
    </div>
  );
}
