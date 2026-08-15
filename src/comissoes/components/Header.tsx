import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Table,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  MinusCircle,
} from 'lucide-react';
import { UserSettings } from '../types';
import { AddServiceButton } from './AddServiceButton';

interface HeaderProps {
  activeTab: 'dashboard' | 'weekly' | 'table' | 'reports' | 'servicos' | 'descontos';
  setActiveTab: (tab: 'dashboard' | 'weekly' | 'table' | 'reports' | 'servicos' | 'descontos') => void;
  userSettings: UserSettings;
  onOpenAddModal: () => void;
  onOpenSettings: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userSettings,
  onOpenAddModal,
  onOpenSettings,
  onLogout,
}) => {
  // Format current date in Portuguese
  const todayDateFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Capitalize first letter of Portuguese weekday
  const capitalizedDate =
    todayDateFormatted.charAt(0).toUpperCase() + todayDateFormatted.slice(1);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-color)] bg-[var(--bg-main)]/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Linha do topo: logo + abas (desktop) + ações, tudo numa linha só,
            como era antes. Altura mínima (não fixa) pra nunca cortar nada. */}
        <div className="flex items-center justify-between gap-2 lg:gap-4 py-3 min-h-[4.5rem]">

          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-red-glow">
              <img src="/icon-192.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-[var(--text-main)] uppercase whitespace-nowrap">
                  PRODUÇÃO <span className="text-[var(--accent-red)]">&</span> COMISSÃO
                </h1>
                <span className="hidden xl:inline-block px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-red-500/10 text-[var(--accent-red)] border border-red-500/20 rounded-md shrink-0">
                  PRO
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] font-medium whitespace-nowrap">
                {userSettings.userName} • {capitalizedDate}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs -- linha única, nunca quebra. Se não couber
              tudo, a barra desliza horizontalmente (scroll) em vez de cortar ou
              soltar abas pra fora do painel. */}
          <nav className="hidden md:flex flex-1 min-w-0 items-center justify-center gap-0.5 lg:gap-1 bg-[var(--bg-card)] p-1 lg:p-1.5 border border-[var(--border-color)] overflow-x-auto no-scrollbar">
          <button
            id="nav-tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 lg:py-2 text-[10px] lg:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
            <span>DASHBOARD</span>
          </button>

          <button
            id="nav-tab-weekly"
            onClick={() => setActiveTab('weekly')}
            className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 lg:py-2 text-[10px] lg:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'weekly'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
            <span className="lg:hidden">SEMANA</span>
            <span className="hidden lg:inline">AGENDA SEMANAL</span>
          </button>

          <button
            id="nav-tab-table"
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 lg:py-2 text-[10px] lg:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'table'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <Table className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
            <span className="lg:hidden">PLANILHA</span>
            <span className="hidden lg:inline">PLANILHA GERAL</span>
          </button>

          <button
            id="nav-tab-reports"
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 lg:py-2 text-[10px] lg:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'reports'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
            <span>RELATÓRIOS</span>
          </button>

          <button
            id="nav-tab-servicos"
            onClick={() => setActiveTab('servicos')}
            className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 lg:py-2 text-[10px] lg:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'servicos'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <Bell className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
            <span>SERVIÇOS</span>
          </button>

          <button
            id="nav-tab-descontos"
            onClick={() => setActiveTab('descontos')}
            className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 lg:py-2 text-[10px] lg:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'descontos'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <MinusCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
            <span>DESCONTOS</span>
          </button>
          </nav>

          {/* Actions: Add Service Button & Settings */}
          <div className="flex items-center gap-1.5 lg:gap-3 shrink-0">
            <div className="hidden lg:block">
              <AddServiceButton onClick={onOpenAddModal} />
            </div>

            <button
              id="btn-abrir-configuracoes"
              onClick={onOpenSettings}
              className="p-2 lg:p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-red)] transition-all cursor-pointer shrink-0"
              title="Configurações e Aparência"
            >
              <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 lg:p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--accent-red)] hover:border-[var(--accent-red)] transition-all cursor-pointer shrink-0"
                title="Sair"
              >
                <LogOut className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs - Fits 100% width on any smartphone screen.
            grid-cols-3 em telas bem estreitas evita que os rótulos sejam
            espremidos/cortados; a partir de xs (config abaixo) volta a 6 colunas. */}
        <div className="grid grid-cols-3 xs:grid-cols-6 md:hidden border-t border-[var(--border-color)] py-1.5 gap-1 w-full">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 px-1 rounded-xl text-[10px] sm:text-xs font-black transition-all text-center leading-none min-w-0 ${
              activeTab === 'dashboard'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'text-[var(--text-muted)] bg-[var(--bg-card)] hover:text-[var(--text-main)]'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Painel</span>
          </button>

          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 px-1 rounded-xl text-[10px] sm:text-xs font-black transition-all text-center leading-none min-w-0 ${
              activeTab === 'weekly'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'text-[var(--text-muted)] bg-[var(--bg-card)] hover:text-[var(--text-main)]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Semana</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 px-1 rounded-xl text-[10px] sm:text-xs font-black transition-all text-center leading-none min-w-0 ${
              activeTab === 'table'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'text-[var(--text-muted)] bg-[var(--bg-card)] hover:text-[var(--text-main)]'
            }`}
          >
            <Table className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Planilha</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 px-1 rounded-xl text-[10px] sm:text-xs font-black transition-all text-center leading-none min-w-0 ${
              activeTab === 'reports'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'text-[var(--text-muted)] bg-[var(--bg-card)] hover:text-[var(--text-main)]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Relatórios</span>
          </button>

          <button
            onClick={() => setActiveTab('servicos')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 px-1 rounded-xl text-[10px] sm:text-xs font-black transition-all text-center leading-none min-w-0 ${
              activeTab === 'servicos'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'text-[var(--text-muted)] bg-[var(--bg-card)] hover:text-[var(--text-main)]'
            }`}
          >
            <Bell className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Serviços</span>
          </button>

          <button
            onClick={() => setActiveTab('descontos')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 px-1 rounded-xl text-[10px] sm:text-xs font-black transition-all text-center leading-none min-w-0 ${
              activeTab === 'descontos'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'text-[var(--text-muted)] bg-[var(--bg-card)] hover:text-[var(--text-main)]'
            }`}
          >
            <MinusCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Descontos</span>
          </button>
        </div>
      </div>
    </header>
  );
};
