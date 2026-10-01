import React from 'react';
import {
  Calendar,
  Bell,
  LayoutDashboard,
  Users,
  Clock,
  AlertCircle,
  BarChart2,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PontoNavTab } from './PontoSidebar';

interface PontoHeaderProps {
  pendingCount?: number;
  userName?: string;
  userPhoto?: string | null;
  currentTab?: PontoNavTab;
  onSelectTab?: (tab: PontoNavTab) => void;
}

export const PONTO_TABS: { id: PontoNavTab; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'funcionarios', label: 'Funcionários', icon: Users },
  { id: 'registros', label: 'Registros de Ponto', icon: Clock },
  { id: 'ajustes', label: 'Ajustes', icon: AlertCircle },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart2 },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

export function PontoHeader({
  pendingCount = 0,
  userName = 'Rafael Matos',
  userPhoto,
  currentTab = 'dashboard',
  onSelectTab,
}: PontoHeaderProps) {
  const dataHoje = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const dataCapitalizada = dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1);
  const inicial = (userName || 'R').charAt(0).toUpperCase();

  return (
    <header className="bg-slate-900/90 border-b border-white/10 px-3 sm:px-6 py-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 backdrop-blur-xl shrink-0 text-white select-none">
      {/* Título do Ponto */}
      <div className="flex items-center justify-between md:justify-start gap-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shrink-0">
            <Clock size={17} />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider leading-none">
              Controle de Ponto
            </h1>
            <p className="text-[10px] text-white/40 leading-tight mt-0.5">
              Jornada & Frequência
            </p>
          </div>
        </div>

        {/* Notificação & Avatar no mobile */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => onSelectTab?.('ajustes')}
            className="p-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors relative cursor-pointer"
            title="Ajustes pendentes"
          >
            <Bell size={16} />
            {pendingCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border border-slate-900">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
          <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center ring-1 ring-emerald-500/40 overflow-hidden">
            {userPhoto ? (
              <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
            ) : (
              inicial
            )}
          </div>
        </div>
      </div>

      {/* Abas de Navegação Direta no Topo (1 Clique) */}
      <nav className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 md:pb-0 shrink min-w-0">
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-white/10 shrink-0">
          {PONTO_TABS.map((tab) => {
            const active = currentTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab?.(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  active
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-xs'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon size={14} className={active ? 'text-emerald-400 shrink-0' : 'text-white/40 shrink-0'} />
                <span>{tab.label}</span>
                {tab.id === 'ajustes' && pendingCount > 0 && (
                  <span className="text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.2 rounded-full ml-0.5 animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Lado Direito Desktop: Data, Notificações e Perfil */}
      <div className="hidden md:flex items-center gap-3 shrink-0">
        {/* Pílula de data */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-white/80 text-xs font-semibold select-none">
          <Calendar size={13} className="text-emerald-400" />
          <span>Hoje, {dataCapitalizada}</span>
        </div>

        {/* Notificações / Alertas */}
        <div className="relative">
          <button
            onClick={() => onSelectTab?.('ajustes')}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors relative cursor-pointer"
            title="Ajustes pendentes"
          >
            <Bell size={17} />
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-slate-900">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Avatar Usuário */}
        <div 
          className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center ring-2 ring-emerald-500/30 overflow-hidden"
          title={userName}
        >
          {userPhoto ? (
            <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
          ) : (
            inicial
          )}
        </div>
      </div>
    </header>
  );
}
