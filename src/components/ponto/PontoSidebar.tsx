import React from 'react';
import {
  LayoutDashboard,
  Users,
  Clock,
  AlertCircle,
  BarChart2,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { RafaArtsLogo } from '../RafaArtsLogo';
import { AvatarPhoto } from '../SharedUI';

export type PontoNavTab =
  | 'dashboard'
  | 'funcionarios'
  | 'registros'
  | 'ajustes'
  | 'relatorios'
  | 'configuracoes';

interface PontoSidebarProps {
  currentTab: PontoNavTab;
  onSelectTab: (tab: PontoNavTab) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  userName?: string;
  userRole?: string;
  userPhoto?: string | null;
  pendingAdjustmentsCount?: number;
}

export function PontoSidebar({
  currentTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
  userName = 'Rafael Matos',
  userRole = 'Administrador',
  userPhoto,
  pendingAdjustmentsCount = 0,
}: PontoSidebarProps) {
  const navItems: { id: PontoNavTab; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'funcionarios', label: 'Funcionários', icon: Users },
    { id: 'registros', label: 'Registros de Ponto', icon: Clock },
    { id: 'ajustes', label: 'Ajustes Pendentes', icon: AlertCircle, badge: pendingAdjustmentsCount },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart2 },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleSelect = (tab: PontoNavTab) => {
    onSelectTab(tab);
    if (window.innerWidth < 1024) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Overlay no mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-[#042419] text-white flex flex-col justify-between transition-transform duration-300 ease-in-out shrink-0 select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Logo Cabeçalho */}
          <div className="p-5 flex items-center justify-between border-b border-emerald-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center p-1 shadow-sm">
                <RafaArtsLogo className="w-7 h-7 text-emerald-400" />
              </div>
              <div className="leading-tight">
                <span className="block font-black text-sm tracking-wider text-white">RAFA ARTS</span>
                <span className="block text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                  Ponto Eletrônico
                </span>
              </div>
            </div>
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-emerald-200/60 hover:text-white lg:hidden"
            >
              <X size={18} />
            </button>
          </div>

          {/* Itens de Navegação */}
          <nav className="p-3 space-y-1.5 mt-2">
            {navItems.map((item) => {
              const active = currentTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-[#0B3D2B] text-white border-l-4 border-emerald-400 shadow-xs'
                      : 'text-emerald-100/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon
                    size={18}
                    className={active ? 'text-emerald-400 shrink-0' : 'text-emerald-300/60 shrink-0'}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Rodapé Usuário Logado */}
        <div className="p-4 border-t border-emerald-900/40 bg-[#031d14]/70 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <AvatarPhoto
              photoUrl={userPhoto}
              name={userName}
              className="w-10 h-10 border-emerald-500/30"
              textClassName="text-sm font-bold text-emerald-950"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{userName}</p>
              <p className="text-[10px] text-emerald-300/70 truncate">{userRole}</p>
            </div>
          </div>
          <button
            title="Sair do Ponto"
            onClick={onCloseMobile}
            className="p-1.5 text-emerald-200/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
