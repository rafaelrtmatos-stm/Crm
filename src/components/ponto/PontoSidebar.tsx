import React, { useEffect } from 'react';
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

  // Fecha o popup ao pressionar a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCloseMobile]);

  const handleSelect = (tab: PontoNavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Overlay Backdrop com desfoque e escurecimento (Mobile e Desktop) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
          onClick={onCloseMobile}
        />
      )}

      {/* Gaveta / Popup Lateral Flutuante */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900/98 border-r border-white/15 text-white flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 select-none backdrop-blur-2xl shadow-2xl shadow-black/80 ${
          isOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        <div>
          {/* Cabeçalho do Popup do Menu */}
          <div className="p-4 flex items-center justify-between border-b border-white/10 bg-slate-950/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                <Clock size={18} />
              </div>
              <div>
                <span className="text-xs font-black text-white uppercase tracking-wider block">Menu do Ponto</span>
                <span className="text-[10px] text-white/40 block">Selecione o módulo</span>
              </div>
            </div>
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Itens de Navegação */}
          <nav className="p-3 space-y-1.5 pt-4">
            {navItems.map((item) => {
              const active = currentTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
                      : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon
                    size={17}
                    className={active ? 'text-emerald-400 shrink-0' : 'text-white/40 shrink-0'}
                  />
                  <span className="truncate normal-case font-semibold text-sm">{item.label}</span>
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
        <div className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <AvatarPhoto
              photoUrl={userPhoto}
              name={userName}
              className="w-10 h-10 border-white/10"
              textClassName="text-sm font-bold text-white"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{userName}</p>
              <p className="text-[10px] text-white/40 truncate">{userRole}</p>
            </div>
          </div>
          <button
            title="Fechar menu"
            onClick={onCloseMobile}
            className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
