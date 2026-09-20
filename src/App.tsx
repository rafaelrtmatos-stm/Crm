/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext, Suspense } from 'react';
import { 
  LayoutDashboard, 
  Percent, 
  MessageSquare, 
  Target, 
  ShoppingBag, 
  ShoppingCart,
  Home, 
  Users, 
  FileText, 
  Wrench, 
  Building2, 
  Settings, 
  ChevronDown, 
  Menu, 
  X, 
  LogOut,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  Briefcase,
  Layers,
  Package,
  Sun,
  Moon,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Key,
  Bot,
  Calculator
} from 'lucide-react';
import { ChevronRight } from 'lucide-react';

import { NotifyHost, showAlert, showMessageToast, urlDeFotoValida } from './lib/notify';
import { sincronizarFilaOffline } from './lib/sincronizacaoOffline';
import ComissoesAdminPanel from './comissoes/ComissoesAdminPanel';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { auth, db } from './firebase';
import { supabase } from './supabase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';

import { 
  Company, 
  AppUser, 
  Lead,
  SaleOrder
} from './types';
import { RafaArtsLogo, BrandLogo } from './components/RafaArtsLogo';
import { AppContext, useApp, type MainTab, type AppContextType } from './AppContext';
import { 
  DashboardModule,
  CRMModule,
  MessagesModule,
  POSModule,
  ContactsModule,
  ServicesModule,
  InventoryModule,
  ProductionModule,
  SettingsModule,
  ClientesEsperaModule
} from './components/Modules';
import { MessagesSidebarPopup } from './components/MessagesSidebarPopup';
import { NotificacoesPendentesBell, useNotificacoesPendentes, buscarNotificacaoDaMensagem, formatarHoraNotificacao, usuarioPodeVerMensagens, type NotificacaoPendente } from './components/NotificacaoPendenteBanner';
import { RobozinhoRafaModule } from './components/RobozinhoRafaModule';
import { IntegracoesModule } from './components/IntegracoesModule';
import { AssistantChatWidget } from './components/AssistantChatWidget';
import { ModuleErrorBoundary } from './components/SharedUI';
import { PrecificacaoModule } from './components/PrecificacaoModule';
import { MateriasPrimasModule } from './components/MateriasPrimasModule';
import { MaquinasModule } from './components/MaquinasModule';

export { AppContext, useApp, type MainTab, type AppContextType };

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- COMPONENTS ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  tab, 
  active, 
  onClick,
  badgeCount
}: { 
  icon: any; 
  label: string; 
  tab: MainTab; 
  active: boolean; 
  onClick: () => void;
  key?: string;
  badgeCount?: number;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group text-sm font-medium border border-transparent relative",
      active 
        ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30 border-white/20" 
        : "text-white/60 hover:bg-white/10 hover:text-white"
    )}
  >
    <Icon size={20} className={cn("transition-transform group-hover:scale-110", active ? "text-white" : "text-white/60 group-hover:text-primary-300")} />
    <span className="truncate">{label}</span>
    {badgeCount !== undefined && badgeCount > 0 && (
      <span className="absolute right-4 top-1/2 -translate-y-1/2 min-w-5 h-5 bg-rose-500 text-white text-[10px] uppercase font-black px-1.5 rounded-full flex items-center justify-center shadow-lg border border-white/10 shrink-0 select-none animate-pulse">
        {badgeCount}
      </span>
    )}
  </button>
);

// Aba "Financeiro": quatro sub-abas internas --
// 1. Funcionários (colaboradores e comissões)
// 2. Matérias-Primas (Cadastro de insumos e matérias-primas: custo por unidade, unidade de medida, observação)
// 3. Máquinas (Cadastro e custos operacionais com cálculo automático de depreciação, manutenção, cabeça, energia e tinta)
// 4. Precificação (Motor de Precificação Inteligente com formação automática de preços baseada em insumos, máquinas, energia, aluguel, equipe e comissões).
const FinanceiroModule = ({ currentCompany, user }: { currentCompany: Company | null; user: AppUser | null }) => {
  const [subTab, setSubTabState] = useState<'funcionarios' | 'materias_primas' | 'maquinas' | 'precificacao'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rpro_financeiro_subtab');
      if (saved && ['funcionarios', 'materias_primas', 'maquinas', 'precificacao'].includes(saved)) {
        return saved as 'funcionarios' | 'materias_primas' | 'maquinas' | 'precificacao';
      }
    }
    return 'funcionarios';
  });

  const setSubTab = (tab: 'funcionarios' | 'materias_primas' | 'maquinas' | 'precificacao') => {
    setSubTabState(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rpro_financeiro_subtab', tab);
    }
  };

  const [selectedMaquinaForPrec, setSelectedMaquinaForPrec] = useState<string | null>(null);

  const handleGoToPrecificacaoWithMaquina = (maqId: string) => {
    setSelectedMaquinaForPrec(maqId);
    setSubTab('precificacao');
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Navegação de Sub-Abas do Módulo Financeiro / Operacional */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 shrink-0 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
        <button
          onClick={() => setSubTab('funcionarios')}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors border shrink-0 whitespace-nowrap",
            subTab === 'funcionarios'
              ? "bg-primary-500 text-white border-white/20 shadow-lg shadow-primary-500/20"
              : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white"
          )}
        >
          <Users size={14} /> Funcionários
        </button>
        <button
          onClick={() => setSubTab('materias_primas')}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors border shrink-0 whitespace-nowrap",
            subTab === 'materias_primas'
              ? "bg-primary-500 text-white border-white/20 shadow-lg shadow-primary-500/20"
              : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white"
          )}
        >
          <Layers size={14} /> Matérias-Primas
        </button>
        <button
          onClick={() => setSubTab('maquinas')}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors border shrink-0 whitespace-nowrap",
            subTab === 'maquinas'
              ? "bg-cyan-600 text-white border-white/20 shadow-lg shadow-cyan-600/20"
              : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white"
          )}
        >
          <Wrench size={14} className={subTab === 'maquinas' ? 'text-white' : 'text-cyan-400'} /> Máquinas & Equipamentos
        </button>
        <button
          onClick={() => setSubTab('precificacao')}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors border shrink-0 whitespace-nowrap",
            subTab === 'precificacao'
              ? "bg-emerald-600 text-white border-white/20 shadow-lg shadow-emerald-600/20"
              : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white"
          )}
        >
          <Calculator size={14} className={subTab === 'precificacao' ? 'text-white' : 'text-emerald-400'} /> Precificação
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {subTab === 'funcionarios' ? (
          <ModuleErrorBoundary label="Funcionários">
            <div className="overflow-y-auto custom-scrollbar h-full">
              <ComissoesAdminPanel />
            </div>
          </ModuleErrorBoundary>
        ) : subTab === 'materias_primas' ? (
          <ModuleErrorBoundary label="Matérias-Primas">
            <div className="overflow-y-auto custom-scrollbar h-full">
              <MateriasPrimasModule currentCompany={currentCompany} user={user} />
            </div>
          </ModuleErrorBoundary>
        ) : subTab === 'maquinas' ? (
          <ModuleErrorBoundary label="Máquinas">
            <div className="overflow-y-auto custom-scrollbar h-full">
              <MaquinasModule
                currentCompany={currentCompany}
                user={user}
                onSelectMaquinaForPrecificacao={handleGoToPrecificacaoWithMaquina}
              />
            </div>
          </ModuleErrorBoundary>
        ) : (
          <ModuleErrorBoundary label="Precificação">
            <div className="overflow-y-auto custom-scrollbar h-full pr-1">
              <PrecificacaoModule
                currentCompany={currentCompany}
                user={user}
                initialMaquinaId={selectedMaquinaForPrec || undefined}
              />
            </div>
          </ModuleErrorBoundary>
        )}
      </div>
    </div>
  );
};

const Navbar = () => {
  const { user, companies, currentCompany, setCurrentCompany, setIsSidebarOpen, theme, toggleTheme, logout, logoLightUrl, logoDarkUrl, activeTab, notificacoesPendentes, abrirNotificacao } = useApp();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCompanySelectOpen, setIsCompanySelectOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  // Logo da empresa pro balão do topo — mesma logo do login, na variante que combina
  // com o fundo escuro da navbar (clara), com fallback pra escura se só essa existir.
  const navbarLogoUrl = theme === 'light' ? (logoDarkUrl || logoLightUrl) : logoLightUrl;

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return (
    <nav className={cn(
      "sticky top-0 z-40 bg-white/5 backdrop-blur-xl border-b border-white/10 h-20 flex items-center justify-between px-8 rounded-b-[32px] mx-4 sm:mx-8",
      (activeTab === 'crm' || activeTab === 'pos') ? "mb-2 md:mb-3" : "mb-6"
    )}>
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden p-3 text-white/70 hover:bg-white/10 rounded-xl"
        >
          <Menu size={20} />
        </button>

        {/* Indicador de conexão */}
        <div
          className={cn(
            "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
            isOnline ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          )}
          title={isOnline ? 'Conectado' : 'Sem conexão com a internet'}
        >
          <span className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-400")} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
        
        {/* Company Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsCompanySelectOpen(!isCompanySelectOpen)}
            className="flex items-center gap-3 pl-1 pr-4 py-1.5 rounded-full hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
          >
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs uppercase shadow-lg overflow-hidden shrink-0",
              !navbarLogoUrl && (currentCompany?.name.toLowerCase().includes('imobiliária') ? "bg-primary-600" : "bg-primary-800")
            )}>
              {navbarLogoUrl ? (
                <img src={navbarLogoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                currentCompany?.shortName?.[0] || currentCompany?.name?.[0] || 'R'
              )}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-white tracking-wide leading-tight">
                {currentCompany?.name || 'Selecione uma Empresa'}
              </p>
            </div>
            <ChevronDown size={14} className="text-white/30" />
          </button>

          <AnimatePresence>
            {isCompanySelectOpen && (
              <>
                <div className="fixed inset-0 z-[-1]" onClick={() => setIsCompanySelectOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute left-0 mt-3 w-72 bg-[#1a2333]/90 backdrop-blur-3xl rounded-[28px] shadow-2xl border border-white/10 p-2 overflow-hidden z-50"
                >
                  <p className="px-4 py-2 text-[10px] font-bold text-white/40 uppercase tracking-[2px]">Gestão Rafa Arts</p>
                  {companies.map(company => (
                    <button
                      key={company.id}
                      onClick={() => {
                        setCurrentCompany(company);
                        setIsCompanySelectOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all",
                        currentCompany?.id === company.id 
                          ? "bg-primary-500/20 text-white ring-1 ring-primary-400/30" 
                          : "hover:bg-white/5 text-white/70 hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs",
                        company.name.toLowerCase().includes('imobiliária') ? "bg-primary-600" : "bg-primary-800"
                      )}>
                        {company.shortName?.[0] || company.name?.[0]}
                      </div>
                      <span className="text-sm font-semibold">{company.name}</span>
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Sino: notificacoes pendentes (contador + lista). Clicar num item abre a conversa na
            mensagem que gerou a notificacao -- NAO resolve; so o botao "Marcar como resolvido". */}
        <NotificacoesPendentesBell itens={notificacoesPendentes} onAbrir={abrirNotificacao} />

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun size={18} className="text-amber-400 animate-in spin-in-180 duration-300" />
          ) : (
            <Moon size={18} className="text-indigo-600 animate-in spin-in-180 duration-300" />
          )}
        </button>

        <div className="hidden sm:flex flex-col items-end">
          <p className="text-sm font-bold text-white leading-tight">{user?.name}</p>
          <p className="text-[10px] text-primary-300 font-bold uppercase tracking-[1.5px]">{user?.role}</p>
        </div>
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-11 h-11 rounded-full bg-white/10 border-2 border-white/20 shadow-xl overflow-hidden active:scale-95 transition-transform"
          >
            {user?.photoUrl || user?.avatarUrl ? (
              <img src={user.photoUrl || user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <img 
                src="https://pro.rafaartsgraphics.com.br/icon-192.png" 
                alt={user?.name} 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  // Fallback para inicial do nome se a imagem padrão não carregar
                  const div = document.createElement('div');
                  div.className = "w-full h-full flex items-center justify-center bg-primary-500/30 text-white font-bold text-lg";
                  div.textContent = user?.name?.[0] || 'U';
                  e.currentTarget.parentElement?.replaceChild(div, e.currentTarget);
                }}
              />
            )}
          </button>
          
          <AnimatePresence>
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-[-1]" onClick={() => setIsProfileOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-56 bg-[#1a2333]/90 backdrop-blur-3xl rounded-[28px] shadow-2xl border border-white/10 p-2 z-50"
                >
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-rose-500/20 text-rose-400 transition-colors text-sm font-bold cursor-pointer border-0 bg-transparent"
                  >
                    <LogOut size={18} />
                    Finalizar Sessão
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
};

// --- MAIN APP ---

// Mapeia uma linha da tabela 'usuarios' (Supabase) pro formato AppUser usado pelo sistema.
// Usuarios comuns vivem no Supabase; so o admin master continua no Firebase (bootstrap fixo).
function mapUsuarioRow(row: any): AppUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password || undefined,
    role: row.role || 'atendente',
    isAdmin: !!row.is_admin,
    isActive: row.is_active !== false,
    allowedTabs: Array.isArray(row.allowed_tabs) ? row.allowed_tabs : undefined,
    allowedPdvTabs: Array.isArray(row.allowed_pdv_tabs) ? row.allowed_pdv_tabs : undefined,
    allowedActions: Array.isArray(row.allowed_actions) ? row.allowed_actions : undefined,
    modulePermissions: row.module_permissions && typeof row.module_permissions === 'object' ? row.module_permissions : undefined,
    colaboradorId: row.colaborador_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as AppUser;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [logoLightUrl, setLogoLightUrl] = useState<string | null>(null);
  const [logoDarkUrl, setLogoDarkUrl] = useState<string | null>(null);
  const [logosReady, setLogosReady] = useState(false);
  useEffect(() => {
    const loadLogos = async () => {
      try {
        const { data } = await supabase.from('configuracoes').select('logo_light_url, logo_dark_url').eq('company_id', 'rafa-arts').maybeSingle();
        setLogoLightUrl(data?.logo_light_url || null);
        setLogoDarkUrl(data?.logo_dark_url || null);
      } catch (e) { /* mantem logo padrao */ } finally {
        setLogosReady(true);
      }
    };
    loadLogos();
    const channel = supabase
      .channel('logos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, loadLogos)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  const [user, setUser] = useState<AppUser | null>(null);

  // Cache local do usuario logado — permite continuar logado (com os dados da ultima sincronizacao)
  // mesmo sem internet, depois de ja ter logado online pelo menos uma vez.
  const cacheUserOffline = (u: AppUser) => {
    try { localStorage.setItem('rpro_cached_user', JSON.stringify(u)); } catch (e) { /* localStorage cheio/bloqueado, ignora */ }
  };
  const getCachedUser = (userId: string): AppUser | null => {
    try {
      const raw = localStorage.getItem('rpro_cached_user');
      if (!raw) return null;
      const cached = JSON.parse(raw) as AppUser;
      return cached.id === userId ? cached : null;
    } catch (e) { return null; }
  };

  // Cofre local de credenciais por e-mail — permite fazer LOGIN (digitando e-mail/senha do
  // zero, sem sessao salva) mesmo sem internet, desde que esse e-mail ja tenha logado com
  // sucesso pelo menos uma vez online neste mesmo dispositivo/navegador. Guarda por e-mail
  // (nao so o ultimo usuario) pra funcionar em dispositivos compartilhados por mais de uma
  // pessoa. A senha fica salva em texto puro de propósito: e o mesmo padrao ja usado pelo
  // resto do sistema (Firestore/Supabase guardam a senha em texto puro tambem), entao isso
  // nao piora a seguranca existente, so espelha ela localmente pra permitir o acesso offline.
  const cacheOfflineCredentials = (email: string, password: string, u: AppUser) => {
    try {
      const raw = localStorage.getItem('rpro_offline_credentials');
      const store: Record<string, { password: string; user: AppUser }> = raw ? JSON.parse(raw) : {};
      store[email] = { password, user: u };
      localStorage.setItem('rpro_offline_credentials', JSON.stringify(store));
    } catch (e) { /* localStorage cheio/bloqueado, ignora — so afeta o login offline futuro */ }
  };
  const getOfflineCredentials = (email: string): { password: string; user: AppUser } | null => {
    try {
      const raw = localStorage.getItem('rpro_offline_credentials');
      if (!raw) return null;
      const store = JSON.parse(raw);
      return store?.[email] || null;
    } catch (e) { return null; }
  };
  const [companies, setCompanies] = useState<Company[]>(() => {
    // Enquanto o Firestore (com cache offline habilitado em firebase.ts) ainda nao
    // devolveu o primeiro snapshot, comeca ja com a ultima lista conhecida salva
    // localmente — evita cair na tela de "Nenhuma empresa encontrada" por um instante
    // (ou de vez, se estiver offline e o cache do Firestore falhar por algum motivo).
    try {
      const raw = localStorage.getItem('rpro_cached_companies');
      if (raw) {
        const parsed = JSON.parse(raw) as Company[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { /* ignora */ }
    return [{
      id: 'rafa-arts',
      name: 'Rafa Arts Graphics',
      cnpj: '28.884.125/0001-40',
      isActive: true,
    } as Company];
  });
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(() => {
    try {
      const raw = localStorage.getItem('rpro_cached_companies');
      if (raw) {
        const parsed = JSON.parse(raw) as Company[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      }
    } catch (e) { /* ignora */ }
    return {
      id: 'rafa-arts',
      name: 'Rafa Arts Graphics',
      cnpj: '28.884.125/0001-40',
      isActive: true,
    } as Company;
  });
  const [menuConfig, setMenuConfig] = useState<{ id: string; visible: boolean }[] | null>(null);
  useEffect(() => {
    supabase.from('configuracoes').select('menu_config').eq('company_id', 'rafa-arts').maybeSingle().then(({ data }) => {
      if (data?.menu_config && Array.isArray(data.menu_config) && data.menu_config.length > 0) {
        setMenuConfig(data.menu_config);
      }
    });
  }, []);
  const [activeTab, setActiveTabState] = useState<MainTab>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('rpro_active_tab') : null;
    const validTabs: MainTab[] = ['dashboard', 'crm', 'messages', 'pos', 'contacts', 'services', 'production', 'settings', 'comissoes', 'robozinho_rafa', 'clientes_espera', 'inventory'];
    return (saved && validTabs.includes(saved as MainTab)) ? (saved as MainTab) : 'dashboard';
  });
  const setActiveTab = (tab: MainTab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') localStorage.setItem('rpro_active_tab', tab);
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMessagePopupOpen, setIsMessagePopupOpen] = useState(false);
  const [preselectedLeadIdForMessages, setPreselectedLeadIdForMessages] = useState<string | undefined>();
  const [pendingOrders, setPendingOrders] = useState<SaleOrder[]>([]);
  const [isRegisterOpen, setIsRegisterOpenLocal] = useState(() => {
    // Mesma ideia das empresas: comeca com o ultimo status conhecido do caixa
    // enquanto a consulta ao Supabase nao volta (ou pra sempre, se estiver offline).
    try { return localStorage.getItem('rpro_cached_caixa_aberto') === '1'; } catch (e) { return false; }
  });
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.from('configuracoes').select('caixa_aberto').eq('company_id', 'rafa-arts').maybeSingle();
        if (error) throw error;
        setIsRegisterOpenLocal(!!data?.caixa_aberto);
        try { localStorage.setItem('rpro_cached_caixa_aberto', data?.caixa_aberto ? '1' : '0'); } catch (e) { /* ignora */ }
      } catch (e) {
        // Sem internet (ou erro de rede) — mantem o ultimo status conhecido em vez de
        // resetar o caixa pra "fechado" e pedir pra abrir de novo sem necessidade.
      }
    };
    load();
    const channel = supabase
      .channel('caixa-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Limpa o preselectedLeadId quando sair da aba de mensagens
  useEffect(() => {
    if (activeTab !== 'messages') {
      setPreselectedLeadIdForMessages(undefined);
    }
  }, [activeTab]);

  // Envio das vendas feitas offline (fila do aparelho): ao abrir o CRM/entrar, quando a internet volta
  // e de tempos em tempos. Fica AQUI (raiz, sempre montada) e nao no PDV: o caixa pode estar em outra
  // tela quando a conexao voltar. A funcao ja ignora quem chama sem internet/sem venda na fila e nao
  // roda em paralelo (nem entre abas). Dependencia e o id (string), nao o objeto `user`, para nao
  // reiniciar a cada atualizacao do usuario.
  useEffect(() => {
    if (!user?.id) return;
    const enviar = () => { sincronizarFilaOffline().catch(err => console.warn('[offlineSync] Falha ao enviar vendas offline:', err)); };
    enviar();
    window.addEventListener('online', enviar);
    const timer = window.setInterval(enviar, 60_000);
    return () => {
      window.removeEventListener('online', enviar);
      window.clearInterval(timer);
    };
  }, [user?.id]);

  const setIsRegisterOpen = async (open: boolean) => {
    setIsRegisterOpenLocal(open); // resposta imediata na UI
    try { localStorage.setItem('rpro_cached_caixa_aberto', open ? '1' : '0'); } catch (e) { /* ignora */ }
    try {
      await supabase.from('configuracoes').upsert({
        company_id: 'rafa-arts',
        caixa_aberto: open,
        caixa_aberto_em: open ? new Date().toISOString() : null,
      }, { onConflict: 'company_id' });
    } catch (err) {
      // Sem internet: fica registrado so localmente por enquanto (o status ja foi
      // atualizado na UI e no cache acima) — sincroniza com o Supabase quando a
      // conexao voltar, na proxima vez que essa tela recarregar 'load()'.
      console.error('Erro ao sincronizar status do caixa (provavelmente offline):', err);
    }
  };
  // Ref (e nao state) de proposito: guarda o id da ultima mensagem ja tratada sem re-disparar o
  // useEffect do listener do Realtime. Antes era useState e estava nas dependencias do effect,
  // entao TODA mensagem recebida derrubava e recriava o canal -- e nessa janela as mensagens
  // seguintes podiam se perder (sem som, sem notificacao, sem lead atualizado).
  const lastMessageIdRef = React.useRef<string | null>(null);
  // IDs das mensagens que JA geraram aviso (som + aviso na tela / notificacao nativa). A chave do
  // evento e o ID DA MENSAGEM (nao telefone, lead nem texto): trocar de aba/menu, re-render, canal do
  // Realtime reassinado ou evento reenviado NAO disparam de novo a mesma mensagem. `lastMessageIdRef`
  // sozinho so lembra a ultima -- um reenvio de uma mensagem anterior passava. Ref (nao state) de
  // proposito: nao re-renderiza nem mexe nas dependencias do effect do Realtime.
  const mensagensNotificadasRef = React.useRef<Set<string>>(new Set());
  // Sincronizacao de conversas em segundo plano (crm_messages -> leads): nunca duas ao mesmo tempo,
  // e a primeira (historico completo) so acontece uma vez por dispositivo -- depois e incremental.
  const sincronizacaoEmAndamentoRef = React.useRef(false);
  const sincronizacaoExecutadaRef = React.useRef(false);
  const notifAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const [prefilledCustomer, setPrefilledCustomer] = useState<{ id?: string, name: string, phone: string } | null>(null);
  const [pendingWhatsAppShare, setPendingWhatsAppShare] = useState<{ leadId: string; prefillMessage: string } | null>(null);

  // Ponto único pra abrir uma conversa no WhatsApp Interno (aba Mensagens/Funil de Atendimento)
  // a partir de QUALQUER tela do CRM (Contratos, Orçamentos, Ficha do Cliente, Contatos, etc).
  // Acha (ou cria) o Lead pelo telefone e leva pra conversa dele — nunca abre o WhatsApp externo
  // (wa.me). Hoje o envio real ainda não está integrado (mensagem só fica registrada no chat
  // interno); quando a integração de envio for plugada, basta implementar o disparo real aqui
  // dentro, sem precisar mexer em cada botão espalhado pelo sistema.
  const openWhatsAppChat = async (phoneRaw: string, name: string, prefillMessage: string = '') => {
    const phoneDigits = (phoneRaw || '').replace(/\D/g, '');
    if (!phoneDigits) {
      showAlert('Esse cliente não tem telefone/WhatsApp cadastrado.');
      return;
    }
    if (!currentCompany) return;
    try {
      const { data: leadsRows } = await supabase.from('leads').select('id, phone').eq('company_id', 'rafa-arts');
      const existing = (leadsRows || []).find((r: any) => {
        const p = (r.phone || '').replace(/\D/g, '');
        return p && (p === phoneDigits || p.endsWith(phoneDigits) || phoneDigits.endsWith(p));
      });

      let leadId: string;
      if (existing) {
        leadId = existing.id;
      } else {
        // Acha o funil/etapa inicial padrão da empresa, igual ao Funil CRM faz
        let funnelId: string | null = null;
        let funnelStageId: string | null = null;
        let { data: funnelRows } = await supabase.from('funnels').select('id').eq('company_id', 'rafa-arts').eq('is_default', true).limit(1);
        if (!funnelRows || funnelRows.length === 0) {
          const { data } = await supabase.from('funnels').select('id').eq('company_id', 'rafa-arts').limit(1);
          funnelRows = data;
        }
        if (funnelRows && funnelRows.length > 0) {
          funnelId = funnelRows[0].id;
          let { data: stageRows } = await supabase.from('funnel_stages').select('id').eq('funnel_id', funnelId).eq('is_initial', true).limit(1);
          if (!stageRows || stageRows.length === 0) {
            const { data } = await supabase.from('funnel_stages').select('id').eq('funnel_id', funnelId).order('order', { ascending: true }).limit(1);
            stageRows = data;
          }
          if (stageRows && stageRows.length > 0) funnelStageId = stageRows[0].id;
        }

        const nameParts = (name || 'Cliente').trim().split(' ');
        const { data: newLead, error } = await supabase.from('leads').insert({
          company_id: 'rafa-arts',
          funnel_id: funnelId,
          funnel_stage_id: funnelStageId,
          full_name: name || 'Cliente',
          first_name: nameParts[0] || 'Cliente',
          last_name: nameParts.slice(1).join(' ') || '',
          phone: phoneDigits,
          source_type: 'WhatsApp',
        }).select().single();
        if (error) throw error;
        leadId = newLead.id;
      }

      setPendingWhatsAppShare({ leadId, prefillMessage });
      setActiveTab('crm');
    } catch (err) {
      console.error('Erro ao abrir WhatsApp interno:', err);
      showAlert('Não foi possível abrir a conversa no Funil de Atendimento.');
    }
  };
  const [pendingReceiptOpenId, setPendingReceiptOpenId] = useState<string | null>(null);
  const [pendingHistoryClientFilter, setPendingHistoryClientFilter] = useState<{ clienteId: string; clienteName: string } | null>(null);
  const [pendingHistoryProductSearch, setPendingHistoryProductSearch] = useState<string | null>(null);
  const [pendingReceivablesFilter, setPendingReceivablesFilter] = useState(false);
  const [pendingGoToHistorico, setPendingGoToHistorico] = useState(false);
  const [pendingGoToServicos, setPendingGoToServicos] = useState(false);
  const [pendingOpenContratoId, setPendingOpenContratoId] = useState<string | null>(null);
  const [pendingOpenOrcamentoId, setPendingOpenOrcamentoId] = useState<string | null>(null);
  const [pendingOpenNotaNoPdv, setPendingOpenNotaNoPdv] = useState<{ saleId: string; aba: 'historico' | 'servicos' } | null>(null);
  const [pendingOpenLeadId, setPendingOpenLeadId] = useState<string | null>(null);
  const [pendingOpenMessageId, setPendingOpenMessageId] = useState<string | null>(null);
  // Notificacoes pendentes do usuario (agrupadas por cliente/grupo, filtradas por permissao)
  const { itens: notificacoesPendentes } = useNotificacoesPendentes(user);
  // Os listeners do Realtime sao criados uma vez: leem o usuario atual por ref, nao por closure velha
  const userRef = React.useRef<AppUser | null>(null);
  userRef.current = user;
  const [simulatedUserId, setSimulatedUserIdState] = useState<string | null>(localStorage.getItem('rpro_simulated_user_id'));
  const [unrepliedLeadsCount, setUnrepliedLeadsCount] = useState(0);

  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('rpro_theme') as 'dark' | 'light') || 'dark';
  });

  const setTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    localStorage.setItem('rpro_theme', newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.body.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  const setSimulatedUserId = (id: string | null) => {
    if (id) {
      localStorage.setItem('rpro_simulated_user_id', id);
    } else {
      localStorage.removeItem('rpro_simulated_user_id');
    }
    setSimulatedUserIdState(id);
  };

  const addPendingOrder = (order: SaleOrder) => {
    setPendingOrders(prev => [order, ...prev]);
  };

  useEffect(() => {
    if (!currentCompany) {
      setUnrepliedLeadsCount(0);
      return;
    }
    const loadCount = async () => {
      const { data } = await supabase.from('leads').select('waiting_since').eq('company_id', 'rafa-arts');
      setUnrepliedLeadsCount((data || []).filter((r: any) => r.waiting_since !== null && r.waiting_since !== undefined).length);
    };
    loadCount();
    const channel = supabase.channel('app-unreplied-count').on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `company_id=eq.rafa-arts` }, loadCount).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany]);

  useEffect(() => {
    if (!currentCompany || !user) return;

    // GRUPOS DO WHATSAPP: o `phone` da mensagem/lead de grupo sao os digitos do group_jid (whatsapp_groups),
    // nunca o telefone de um participante. Conversa de grupo mostra o NOME DO GRUPO (nao o do participante),
    // previa com o remetente e nunca entra no Funil como lead individual. Cache curto: a tabela e pequena.
    let cacheGrupos: { em: number; nomes: Map<string, string> } | null = null;
    const infoGrupo = async (phone?: string): Promise<{ nome: string } | null> => {
      const digitos = (phone || '').replace(/\D/g, '');
      if (!digitos) return null;
      if (!cacheGrupos || Date.now() - cacheGrupos.em > 60 * 1000) {
        const { data, error } = await supabase.from('whatsapp_groups').select('group_jid,nome').eq('company_id', 'rafa-arts');
        if (!error) {
          const nomes = new Map<string, string>();
          for (const g of (data || []) as any[]) {
            const d = (g.group_jid || '').replace('@g.us', '').replace(/\D/g, '');
            if (d) nomes.set(d, g.nome || '');
          }
          cacheGrupos = { em: Date.now(), nomes };
        }
      }
      const nome = cacheGrupos?.nomes.get(digitos);
      return nome === undefined ? null : { nome };
    };

    // RULE: All incoming messages must create a lead in "ENTRADA" (initial stage)
    const processIncomingMessage = async (msgData: any) => {
      // Ao vivo: `quando` = agora e `aguardando` = true (comportamento de sempre). Na recuperacao
      // de mensagens perdidas (abaixo) `quando` vem com a hora real da mensagem e `aguardando`
      // vira false se alguem da empresa ja respondeu depois dela.
      const quando: string = msgData.createdAt || new Date().toISOString();
      const aguardando: boolean = msgData.aguardando !== false;
      // Ultima mensagem da conversa (leads.last_message_at = ordem da lista de Mensagens): usa o horario
      // ORIGINAL da mensagem; na recuperacao `quando` ja e esse horario. Nunca o de importacao/processamento.
      const mensagemEm: string = msgData.mensagemEm || quando;
      const grupo = await infoGrupo(msgData.phone);
      const ehGrupo = !!grupo;
      // Previa da lista: em grupo mostra quem falou ("Maria: texto"), como no WhatsApp.
      const textoPrevia: string = ehGrupo && msgData.senderName ? `${msgData.senderName}: ${msgData.text || ''}` : (msgData.text || '');
      const nomeConversa: string = ehGrupo ? (grupo!.nome || `Grupo ${msgData.phone}`) : '';
      // Check if lead already exists for this phone/contact
      const { data: leadRows } = await supabase.from('leads').select('*').eq('company_id', 'rafa-arts').eq('phone', msgData.phone || '');

      // Find or create default funnel and initial stage ("ENTRADA")
      let { data: funnelRows } = await supabase.from('funnels').select('*').eq('company_id', 'rafa-arts').eq('is_default', true).limit(1);
      if (!funnelRows || funnelRows.length === 0) {
        const { data } = await supabase.from('funnels').select('*').eq('company_id', 'rafa-arts').limit(1);
        funnelRows = data;
      }

      let funnelId = '';
      let stageId = '';

      if (!funnelRows || funnelRows.length === 0) {
        // Create default funnel and initial stage if missing
        const { data: fRow } = await supabase.from('funnels').insert({
          company_id: 'rafa-arts',
          name: 'Funil Rafa Arts',
          is_default: true,
          is_active: true,
        }).select().single();
        funnelId = fRow.id;

        const { data: stRow } = await supabase.from('funnel_stages').insert({
          funnel_id: funnelId,
          name: 'ENTRADA',
          order: 0,
          is_initial: true,
        }).select().single();
        stageId = stRow.id;
      } else {
        funnelId = funnelRows[0].id;
        let { data: stageRows } = await supabase.from('funnel_stages').select('id').eq('funnel_id', funnelId).eq('is_initial', true).limit(1);
        if (!stageRows || stageRows.length === 0) {
          const { data } = await supabase.from('funnel_stages').select('id').eq('funnel_id', funnelId).order('order', { ascending: true }).limit(1);
          stageRows = data;
        }
        if (stageRows && stageRows.length > 0) stageId = stageRows[0].id;
      }

      // If no lead exists, create it in the ENTRADA stage (INSERT simples; duplicado 23505 e ignorado abaixo).
      if (!leadRows || leadRows.length === 0) {
        const novoLead = {
          company_id: 'rafa-arts',
          funnel_id: ehGrupo ? null : (funnelId || null),
          funnel_stage_id: ehGrupo ? null : (stageId || null),
          // Os 3 nomes comecam iguais (nome que veio do WhatsApp) -- cada um pode ser
          // corrigido depois sem conflitar com os outros (ver Lead.whatsappName/contactName
          // em types.ts). fullName e' o "Nome Real/Documental": so muda por edicao manual
          // no painel, nunca automaticamente numa mensagem futura (ver bloco senao abaixo).
          // So cai no fallback de telefone se REALMENTE nao veio nome nenhum do WhatsApp
          // (webhook ja tenta pushName + agenda antes disso) -- nunca usa texto generico
          // igual pra todo mundo, assim da pra identificar o contato na lista de leads.
          full_name: ehGrupo ? nomeConversa : (msgData.senderName || (msgData.phone ? `+${msgData.phone}` : 'Contato sem nome')),
          whatsapp_name: ehGrupo ? nomeConversa : (msgData.senderName || ''),
          contact_name: ehGrupo ? nomeConversa : (msgData.senderName || ''),
          first_name: ehGrupo ? nomeConversa : (msgData.senderName || (msgData.phone ? `+${msgData.phone}` : 'Contato')).split(' ')[0],
          last_name: ehGrupo ? '' : ((msgData.senderName || '').split(' ').slice(1).join(' ') || ''),
          phone: msgData.phone || '',
          source_type: msgData.channel || 'WhatsApp',
          last_message_text: textoPrevia,
          // Previa da lista de chats (MessagesSidebarPopup.tsx/Modules.tsx): so e' tocada
          // aqui, num evento 'incoming' -- NUNCA no envio do atendente (ver Modules.tsx
          // handleSendMessage) -- entao sempre reflete a ultima mensagem real do CLIENTE.
          last_client_message_text: msgData.text || '',
          last_client_message_at: quando,
          estimated_value: 0,
          status: 'ENTRADA',
          waiting_since: aguardando ? quando : null,
        };
        // INSERT simples (nao upsert): upsert com onConflict='company_id,phone' exige um indice unico TOTAL
        // nessas colunas e o Postgres recusa ("no unique or exclusion constraint matching the ON CONFLICT
        // specification") quando ele nao existe -- o que impedia a criacao de QUALQUER lead novo e deixava
        // a conversa fora da lista. Se existir indice unico (add_unique_leads_company_phone.sql) e outra
        // mensagem do mesmo contato criar o lead antes, o erro 23505 (duplicado) e ignorado.
        const ehLeadDuplicado = (e: any) => e?.code === '23505';
        let { error: erroNovoLead } = await supabase.from('leads').insert(
          { ...novoLead, last_message_at: mensagemEm, last_message_direction: 'incoming' }
        );
        // Coluna last_message_at ainda nao existe (add_last_message_at_to_leads.sql nao rodou): cria o
        // lead sem ela, como sempre foi -- nunca deixa de criar o lead por causa disso.
        if (erroNovoLead && !ehLeadDuplicado(erroNovoLead)) ({ error: erroNovoLead } = await supabase.from('leads').insert(novoLead));
        if (erroNovoLead && !ehLeadDuplicado(erroNovoLead)) throw erroNovoLead; // sincronizador tenta de novo
        console.log(`CRM Automation: New Lead created from channel [${msgData.channel}] into ENTRADA stage.`);
      } else {
        // Atualiza o lead existente, mas so mexe no whatsappName (reflete o nome de perfil
        // mais recente) -- NUNCA sobrescreve fullName/contactName aqui, pra nao apagar uma
        // correcao manual que o atendente ja tenha feito (ex: nome do documento != nome do
        // WhatsApp). Ver Lead.whatsappName/contactName/fullName em types.ts.
        const leadRow = leadRows[0];

        // 1) TODA mensagem recebida atualiza a "ultima mensagem" da conversa (last_message_at /
        //    last_message_text / last_message_direction = 'incoming'), estando ou nao aguardando
        //    resposta. `aguardando` NAO decide se a mensagem entra na ultima mensagem: ele so decide,
        //    no passo 2, se a conversa volta a ficar "aguardando" (waiting_since/status/etapa).
        //    Regra de tempo: so avanca (mensagem antiga/reprocessada nunca faz a conversa voltar no
        //    tempo -- ex.: cliente 15:27, atendente respondeu 15:30 => a ultima continua sendo a das 15:30).
        const temColunaUltima = 'last_message_at' in leadRow;
        const ultimaAtualMs = temColunaUltima && leadRow.last_message_at ? Date.parse(leadRow.last_message_at) : NaN;
        const mensagemMs = Date.parse(mensagemEm);
        const avancaUltima = temColunaUltima && Number.isFinite(mensagemMs) && (!Number.isFinite(ultimaAtualMs) || mensagemMs > ultimaAtualMs);
        const patchUltimaMensagem = temColunaUltima
          ? (avancaUltima ? { last_message_at: mensagemEm, last_message_text: textoPrevia, last_message_direction: 'incoming' } : {})
          // Banco sem last_message_at (add_last_message_at_to_leads.sql nao rodou): comportamento antigo.
          : (aguardando ? { last_message_text: textoPrevia } : {});
        const patchUltimaMensagemDoCliente = {
          last_client_message_text: msgData.text || '',
          last_client_message_at: quando,
        };

        if (!aguardando) {
          // Mensagem que ja foi respondida por alguem da empresa: entra normalmente como ultima
          // mensagem (passo 1) e registra que existiu (pra nao ser "recuperada" de novo), mas nao
          // mexe em etapa, status nem espera.
          await supabase.from('leads').update({
            ...patchUltimaMensagem,
            ...patchUltimaMensagemDoCliente,
          }).eq('id', leadRow.id);
          return;
        }

        // 2) Aguardando resposta: alem da ultima mensagem, atualiza espera, status e etapa.
        await supabase.from('leads').update({
          ...patchUltimaMensagem,
          ...patchUltimaMensagemDoCliente,
          source_type: msgData.channel || leadRow.source_type || 'WhatsApp',
          waiting_since: quando,
          ...(ehGrupo ? {} : { status: 'ENTRADA' }),
          ...(msgData.senderName && !ehGrupo ? { whatsapp_name: msgData.senderName } : {}),
          ...(stageId && !ehGrupo ? { funnel_stage_id: stageId } : {}),
          // `quando` = agora ao vivo; na recuperacao e a hora real da mensagem (senao a lista
          // mostrava a hora da recuperacao como se fosse a da mensagem)
          updated_at: quando,
        }).eq('id', leadRow.id);
        console.log(`CRM Automation: Existing Lead updated from channel [${msgData.channel}] in ENTRADA stage.`);
      }
    };

    // SINCRONIZACAO EM SEGUNDO PLANO: crm_messages e a fonte oficial; leads.last_message_at e so o
    // indice usado pela aba Mensagens. O webhook grava toda mensagem em crm_messages, mas se ninguem
    // estava com o CRM aberto (ou o Realtime caiu) o lead ficava defasado. Aqui, ao abrir o CRM, ao
    // reconectar o Realtime e ao voltar pra aba, le crm_messages da mais nova pra mais antiga em
    // LOTES de 100 (tamanho do lote, nao limite total) e continua ate acabar. Por conversa vale so a
    // mensagem mais recente; o lead so e atualizado quando crm_messages.created_at > last_message_at.
    // 1a execucao neste dispositivo = historico completo; depois so o que veio apos o ultimo
    // checkpoint (com folga de 2 dias). Nunca roda duas vezes ao mesmo tempo.
    // Estado da execucao em curso: se um lote falhar de vez, a proxima tentativa CONTINUA dele (mesmo
    // offset, mesmas conversas ja vistas) -- nao reinicia do zero. Zera quando a sincronizacao conclui.
    type RetomadaSync = { de: number; vistas: Set<string>; atualizadas: number; aguardando: number; corteIso: string | null; inicio: string };
    let retomada: RetomadaSync | null = null;
    let tentativasSessao = 0;
    let timerRetentativa: ReturnType<typeof setTimeout> | null = null;
    const espera = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

    // Erro temporario (rede, timeout, 5xx): tenta de novo a MESMA operacao com esperas progressivas
    // (1s, 2s, 4s, 8s, 15s) -- nunca em loop rapido. Esgotou: lanca, e a sincronizacao agenda nova rodada.
    const comRetentativa = async <T,>(rotulo: string, op: () => Promise<{ data: T; error: any }>): Promise<T> => {
      const ESPERAS_MS = [1000, 2000, 4000, 8000, 15000];
      let ultimoErro: any = null;
      for (let tentativa = 0; tentativa <= ESPERAS_MS.length; tentativa++) {
        try {
          const { data, error } = await op();
          if (!error) return data;
          ultimoErro = error;
        } catch (e) {
          ultimoErro = e;
        }
        if (tentativa < ESPERAS_MS.length) {
          console.warn(`CRM Sincronizacao: falha em ${rotulo}, nova tentativa em ${ESPERAS_MS[tentativa] / 1000}s`, ultimoErro);
          await espera(ESPERAS_MS[tentativa]);
        }
      }
      throw ultimoErro || new Error(`falha em ${rotulo}`);
    };

    const sincronizarConversasEmSegundoPlano = async () => {
      if (sincronizacaoEmAndamentoRef.current) return;
      sincronizacaoEmAndamentoRef.current = true;
      if (timerRetentativa) { clearTimeout(timerRetentativa); timerRetentativa = null; }
      const LOTE = 100;
      const chaveCheckpoint = 'crm_sync_conversas_ate_rafa-arts';
      try {
        if (!retomada) {
          let corteMs = 0;
          try {
            const salvo = Date.parse(localStorage.getItem(chaveCheckpoint) || '');
            if (Number.isFinite(salvo)) corteMs = salvo - 2 * 24 * 60 * 60 * 1000;
          } catch { /* sem localStorage: roda o historico completo */ }
          retomada = { de: 0, vistas: new Set<string>(), atualizadas: 0, aguardando: 0, corteIso: corteMs > 0 ? new Date(corteMs).toISOString() : null, inicio: new Date().toISOString() };
        }
        const estado = retomada; // 1a ocorrencia de cada telefone (vistas) = mensagem mais recente dele

        for (;;) {
          const de = estado.de;
          const lote: any[] = await comRetentativa('ler lote de crm_messages', async () => {
            let q = supabase.from('crm_messages').select('id,phone,text,direction,sender_name,channel,created_at')
              .eq('company_id', 'rafa-arts')
              .or('is_note.is.null,is_note.eq.false')
              .neq('direction', 'note');
            if (estado.corteIso) q = q.gte('created_at', estado.corteIso);
            const r = await q.order('created_at', { ascending: false }).order('id', { ascending: false }).range(de, de + LOTE - 1);
            return { data: (r.data || []) as any[], error: r.error };
          });

          // Mais recente de cada telefone ainda nao visto
          const novas: any[] = [];
          const noLote = new Set<string>();
          for (const m of lote) { // lote vem da mais nova pra mais antiga: 1a ocorrencia = mais recente
            if (!m.phone || estado.vistas.has(m.phone) || noLote.has(m.phone)) continue;
            noLote.add(m.phone);
            novas.push(m);
          }

          if (novas.length) {
            const leadsLote = await comRetentativa('ler leads do lote', async () => {
              const r = await supabase.from('leads').select('id,phone,last_message_at')
                .eq('company_id', 'rafa-arts').in('phone', novas.map(m => m.phone));
              return { data: (r.data || []) as any[], error: r.error };
            });
            const leadPorTelefone = new Map<string, any>(leadsLote.map((l: any) => [l.phone, l]));

            for (const msg of novas) {
              const msgMs = Date.parse(msg.created_at);
              if (Number.isFinite(msgMs)) {
                const lead = leadPorTelefone.get(msg.phone);
                const atualMs = lead?.last_message_at ? Date.parse(lead.last_message_at) : NaN;
                // So atualiza quando a mensagem real e MAIS RECENTE que a registrada no lead
                if (!(lead && Number.isFinite(atualMs) && msgMs <= atualMs)) {
                  console.log('[CRM SYNC] mensagem mais nova encontrada');
                  if (msg.direction === 'incoming') {
                    if (msg.text) {
                      // Mais recente da conversa e do cliente => nao ha resposta depois dela (aguardando)
                      await comRetentativa('atualizar conversa', async () => {
                        try {
                          await processIncomingMessage({ phone: msg.phone, text: msg.text, senderName: msg.sender_name, channel: msg.channel, createdAt: msg.created_at, mensagemEm: msg.created_at });
                          return { data: null, error: null };
                        } catch (e) { return { data: null, error: e }; }
                      });
                      estado.atualizadas++;
                      estado.aguardando++;
                      console.log('[CRM SYNC] last_message_at corrigido');
                    }
                  } else if (lead) {
                    // Enviada (pelo CRM ou pelo celular): nunca cria lead, so atualiza o indice
                    await comRetentativa('atualizar conversa (enviada)', async () => {
                      const r = await supabase.from('leads').update({
                        last_message_at: msg.created_at,
                        last_message_text: msg.text || '',
                        last_message_direction: 'outgoing',
                        waiting_since: null,
                      }).eq('id', lead.id).or(`last_message_at.is.null,last_message_at.lt.${new Date(msgMs).toISOString()}`);
                      return { data: null, error: r.error };
                    });
                    estado.atualizadas++;
                    console.log('[CRM SYNC] last_message_at corrigido');
                  }
                }
              }
              estado.vistas.add(msg.phone); // so marca DEPOIS de processada: falha no meio => reprocessa so o que faltou
            }
          }

          // Lote inteiro concluido: so agora avanca o offset (falha antes disso repete ESTE lote)
          estado.de = de + LOTE;
          if (lote.length < LOTE) break; // ultimo lote
        }

        try { localStorage.setItem(chaveCheckpoint, estado.inicio); } catch { /* ignora */ }
        sincronizacaoExecutadaRef.current = true;
        retomada = null;
        tentativasSessao = 0;

        if (estado.atualizadas > 0) {
          console.log(`CRM Sincronizacao: ${estado.atualizadas} conversa(s) atualizada(s) (${estado.aguardando} aguardando resposta).`);
        }
        if (estado.aguardando > 0) {
          showMessageToast({
            key: 'mensagens-recuperadas',
            title: 'Mensagens recebidas enquanto você estava fora',
            body: `${estado.aguardando} conversa${estado.aguardando > 1 ? 's' : ''} aguardando resposta.`,
            onClick: () => setActiveTab('crm'),
          });
        }
      } catch (e) {
        // Lote esgotou as tentativas imediatas: NAO encerra de vez. Agenda nova rodada (pausa crescente,
        // ate 5 min) que continua do lote pendente (`retomada` guarda o ponto).
        tentativasSessao++;
        const pausa = Math.min(15000 * 2 ** (tentativasSessao - 1), 5 * 60 * 1000);
        console.warn(`CRM Sincronizacao: erro, retomando do lote pendente em ${Math.round(pausa / 1000)}s`, e);
        timerRetentativa = setTimeout(() => { timerRetentativa = null; sincronizarConversasEmSegundoPlano(); }, pausa);
      } finally {
        sincronizacaoEmAndamentoRef.current = false;
      }
    };

    // Voltou pra aba depois de mais de 1 min em segundo plano: navegadores pausam abas ocultas e o
    // Realtime pode ter perdido eventos nesse periodo.
    let ocultoDesde: number | null = null;
    const onVisibilidade = () => {
      if (document.hidden) { ocultoDesde = Date.now(); return; }
      const ficouFora = ocultoDesde ? Date.now() - ocultoDesde : 0;
      ocultoDesde = null;
      if (ficouFora > 60 * 1000) sincronizarConversasEmSegundoPlano();
    };
    document.addEventListener('visibilitychange', onVisibilidade);

    const channel = supabase.channel('app-incoming-lead-automation').on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'crm_messages', filter: `company_id=eq.rafa-arts` },
      (payload: any) => {
        const row = payload.new;
        // Mensagem ENVIADA (pelo CRM ou direto no celular): so mantem o indice da conversa em dia
        // (leads.last_message_*), com o horario original e so se for mais nova -- sem notificacao nem lead novo.
        if (row.direction === 'outgoing' && !row.is_note && row.phone && Number.isFinite(Date.parse(row.created_at))) {
          console.log('[CRM REALTIME] nova mensagem enviada recebida');
          supabase.from('leads').update({
            last_message_at: row.created_at,
            last_message_text: row.text || '',
            last_message_direction: 'outgoing',
            waiting_since: null,
          }).eq('company_id', 'rafa-arts').eq('phone', row.phone)
            .or(`last_message_at.is.null,last_message_at.lt.${new Date(row.created_at).toISOString()}`)
            .then(({ error }: any) => { if (error) console.warn('CRM Realtime: falha ao atualizar indice da conversa (enviada)', error); });
          return;
        }
        if (row.direction !== 'incoming' || row.id === lastMessageIdRef.current) return;
        lastMessageIdRef.current = row.id;
        console.log('[CRM REALTIME] nova mensagem recebida');
        processIncomingMessage({
          phone: row.phone,
          text: row.text,
          direction: row.direction,
          senderName: row.sender_name,
          channel: row.channel,
          // Horario ORIGINAL da mensagem (crm_messages.created_at) -- so alimenta leads.last_message_at
          // (ordem da lista de conversas). Nao muda `quando` (waiting_since/updated_at seguem como antes).
          mensagemEm: row.created_at,
        }).catch((e: any) => console.error('CRM Realtime: falha ao processar mensagem recebida (o sincronizador recupera):', e));
        // Som + notificação nativa (estilo WhatsApp Web) pra QUALQUER mensagem nova de
        // cliente, em qualquer lugar do app — antes isso só existia dentro do useEffect
        // de MessagesModule (Modules.tsx), então só tocava/avisava com a aba "Mensagens"
        // aberta. Ficando aqui no shell raiz (sempre montado, ver AppContext.Provider),
        // o listener do Supabase Realtime continua vivo mesmo com o usuário em outra
        // aba do CRM ou com a aba do navegador em segundo plano/minimizada.
        notifyIncomingMessage(row);
      }
    ).subscribe((status: string, err?: any) => {
      // Sem isso, se o Realtime falhar (tabela fora da publicacao, filtro invalido, queda de
      // rede) nada aparece em lugar nenhum e a notificacao simplesmente "nao chega".
      if (status === 'SUBSCRIBED') {
        console.log('CRM Realtime: escutando novas mensagens (crm_messages).');
        // Roda ao abrir o CRM e toda vez que o Realtime reconecta depois de uma queda.
        sincronizarConversasEmSegundoPlano();
      }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn(`CRM Realtime: canal de mensagens em estado ${status}`, err || '');
      }
    });

    // Inicia sozinha ao carregar o CRM (nao depende do Realtime conectar, de botao nem da aba Mensagens).
    sincronizarConversasEmSegundoPlano();
    // Rede de seguranca: Realtime = atualizacao imediata; a sincronizacao = recuperacao. Se o Realtime
    // perder um evento sem avisar, a proxima rodada (5 min) encontra a mensagem em crm_messages.
    const intervaloSincronizacao = setInterval(() => { if (!document.hidden) sincronizarConversasEmSegundoPlano(); }, 5 * 60 * 1000);

    return () => {
      clearInterval(intervaloSincronizacao);
      document.removeEventListener('visibilitychange', onVisibilidade);
      if (timerRetentativa) clearTimeout(timerRetentativa);
      supabase.removeChannel(channel);
    };
  }, [currentCompany, user]);

  // Login & Authentication State (Carrega credenciais lembradas instantaneamente)
  const [loginEmail, setLoginEmail] = useState(() => {
    return localStorage.getItem('rpro_remembered_email') || '';
  });
  const [loginPassword, setLoginPassword] = useState(() => {
    return localStorage.getItem('rpro_remembered_password') || '';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('rpro_remember_me') === 'true' || !!localStorage.getItem('rpro_remembered_email') || !!localStorage.getItem('rpro_remembered_password');
  });

  useEffect(() => {
    const isRemembered = localStorage.getItem('rpro_remember_me') === 'true' || !!localStorage.getItem('rpro_remembered_email') || !!localStorage.getItem('rpro_remembered_password');
    if (isRemembered) {
      setRememberMe(true);
      const rememberedEmail = localStorage.getItem('rpro_remembered_email');
      const rememberedPassword = localStorage.getItem('rpro_remembered_password');
      if (rememberedEmail) setLoginEmail(rememberedEmail);
      if (rememberedPassword) setLoginPassword(rememberedPassword);
    }
  }, []);

  // Identifica o dispositivo/navegador a partir do user agent (nao existe forma de ler o MAC —
  // navegadores bloqueiam isso por privacidade, nao ha nenhum sistema web que consiga)
  const describeDevice = () => {
    const ua = navigator.userAgent;
    let os = 'Desconhecido';
    if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac os/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    let browser = 'Navegador';
    if (/edg\//i.test(ua)) browser = 'Edge';
    else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
    else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = 'Safari';
    else if (/firefox\//i.test(ua)) browser = 'Firefox';
    return `${os} · ${browser}`;
  };

  // Pede autorizacao de geolocalizacao (GPS/rede) do navegador e devolve as coordenadas se a
  // pessoa aceitar, ou null se negar, o navegador nao suportar, ou der timeout. O navegador so
  // mostra o popup nativo de permissao da primeira vez — nas proximas chamadas ele so lembra
  // a decisao anterior (aceita ou negada), sem perguntar de novo (isso e um comportamento do
  // proprio navegador, nao tem como forcar o popup nativo a reaparecer sem a pessoa resetar
  // a permissao do site nas configuracoes do navegador dela).
  const requestGeoPermission = (): Promise<{ lat: number; lng: number; accuracy: number } | null> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  };

  // So dispara o pedido de localizacao se o usuario AINDA NAO tinha aceitado antes nesse
  // navegador (rpro_geo_permission !== 'granted'). Se ja aceitou uma vez, nao pede de novo no
  // login — so confirma que continua liberado (a localizacao em si, quando o admin quiser ver,
  // e buscada na hora pelo botao "Ver Localização", nao precisa disso toda vez que loga).
  const getGeoForLogin = async (): Promise<{ coords: { lat: number; lng: number; accuracy: number } | null; permission: 'granted' | 'denied' }> => {
    if (localStorage.getItem('rpro_geo_permission') === 'granted') {
      return { coords: null, permission: 'granted' };
    }
    const coords = await requestGeoPermission();
    return { coords, permission: coords ? 'granted' : 'denied' };
  };

  // Pede autorizacao de notificacoes do navegador. Mesma logica: o popup nativo so aparece
  // enquanto a decisao ainda nao foi tomada ('default'); depois de aceitar ou negar uma vez,
  // o navegador so lembra a resposta anterior nas proximas chamadas.
  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    try {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission === 'denied') return false;
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch (e) {
      return false;
    }
  };

  // Toca o alerta sonoro e dispara a notificação nativa do navegador pra uma mensagem
  // INCOMING nova, do jeito que o WhatsApp Web faz: som sempre que chega (mesmo com o
  // app em foco), notificação nativa só quando a aba NÃO está em foco (document.hidden
  // ou a janela sem foco) — pra não empilhar notificação nativa em cima do que já está
  // sendo visto na tela. Fica no shell raiz (não dentro de um módulo específico) pra
  // continuar funcionando com a aba em segundo plano ou noutra tela do CRM.
  // Navegadores bloqueiam audio.play() ate a pessoa interagir com a pagina ao menos uma vez
  // (politica de autoplay) -- e o antigo .catch(() => {}) escondia essa falha. Destrava o audio
  // no primeiro clique/toque/tecla: toca mudo e pausa; dai em diante os .play() passam.
  useEffect(() => {
    const destravar = () => {
      try {
        if (!notifAudioRef.current) notifAudioRef.current = new Audio('/sounds/mensagem-cliente.mp3');
        const a = notifAudioRef.current;
        a.muted = true;
        a.play().then(() => {
          a.pause();
          a.currentTime = 0;
          a.muted = false;
          window.removeEventListener('pointerdown', destravar);
          window.removeEventListener('keydown', destravar);
        }).catch(() => { a.muted = false; });
      } catch (e) { /* navegador sem suporte a Audio, ignora */ }
    };
    window.addEventListener('pointerdown', destravar);
    window.addEventListener('keydown', destravar);
    return () => {
      window.removeEventListener('pointerdown', destravar);
      window.removeEventListener('keydown', destravar);
    };
  }, []);

  // Abre a conversa do lead no Funil CRM imediatamente ao clicar na notificação.
  // Vale igual pra grupo: o grupo tem lead proprio (phone = digitos do JID do grupo), entao
  // abrir por telefone ja abre o grupo. `messageId` e a mensagem que gerou a notificacao: o
  // ChatPanel (Modules.tsx) rola ate ela e a destaca, em vez de cair no fim da conversa.
  const openNotificationLead = async (phone?: string | null, messageId?: string | null) => {
    setPendingOpenMessageId(messageId || null);
    if (messageId) {
      // Se a conversa nao chegar a abrir (lead nao encontrado), nao deixa o alvo preso pra
      // pular pra uma mensagem antiga quando essa conversa for aberta manualmente depois.
      setTimeout(() => setPendingOpenMessageId(cur => (cur === messageId ? null : cur)), 15000);
    }
    // Regra 9: de qualquer tela do CRM, o clique leva pra aba Mensagens (MessagesModule abre a
    // conversa via pendingOpenLeadId; se ja for a conversa aberta, nao abre outra).
    setActiveTab('messages');
    if (!phone) return;

    const findAndSelectLead = async (): Promise<boolean> => {
      try {
        const raw = String(phone).trim();
        const clean = raw.replace(/\D/g, '');
        const { data } = await supabase
          .from('leads')
          .select('id')
          .eq('company_id', 'rafa-arts')
          .or(`phone.eq.${raw},phone.eq.${clean}`)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (data?.[0]?.id) {
          setPendingOpenLeadId(data[0].id);
          return true;
        }
      } catch (err) {
        console.warn('Erro ao localizar lead da notificação:', err);
      }
      return false;
    };

    const found = await findAndSelectLead();
    if (!found) {
      setTimeout(async () => {
        const foundRetry = await findAndSelectLead();
        if (!foundRetry) {
          setTimeout(async () => {
            await findAndSelectLead();
          }, 800);
        }
      }, 350);
    }
  };

  const abrirNotificacao = (n: NotificacaoPendente) => { openNotificationLead(n.phone, n.messageId); };

  // Clique numa notificacao mostrada pelo service worker (public/sw.js): o SW avisa a aba
  // aberta e aqui abrimos a conversa, igual o onclick da Notification antiga fazia.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'open-message-notification') return;
      openNotificationLead(event.data.phone, event.data.messageId);
    };
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onSwMessage);
  }, []);

  const notifyIncomingMessage = async (row: any) => {
    // UMA mensagem = UM aviso: se este ID ja foi apresentado, nao repete (marcado ANTES de qualquer
    // await, senao dois eventos seguidos passariam juntos). Mensagem nova, mesmo do mesmo cliente e
    // mesmo depois de resolvida, tem ID novo e avisa normalmente.
    if (row?.id != null) {
      const idMensagem = String(row.id);
      const jaNotificadas = mensagensNotificadasRef.current;
      if (jaNotificadas.has(idMensagem)) return;
      jaNotificadas.add(idMensagem);
      if (jaNotificadas.size > 500) {
        const maisAntigo = jaNotificadas.values().next().value;
        if (maisAntigo !== undefined) jaNotificadas.delete(maisAntigo);
      }
    }
    // Regra 11: so avisa (som, aviso na tela, notificacao nativa) de conversas/grupos que o
    // usuario tem permissao de ver. Sem linha em crm_notifications (gatilho falhou) cai no
    // comportamento antigo, desde que o usuario tenha acesso a Mensagens.
    const usuarioAtual = userRef.current;
    if (!usuarioPodeVerMensagens(usuarioAtual)) return;
    const info = await buscarNotificacaoDaMensagem(row.id, usuarioAtual).catch(() => null);
    if (info && !info.visivel) return;

    try {
      const audio = notifAudioRef.current || (notifAudioRef.current = new Audio('/sounds/mensagem-cliente.mp3'));
      audio.currentTime = 0;
      audio.play().catch((e) => console.warn('Som de mensagem bloqueado pelo navegador (precisa de 1 clique na pagina antes):', e));
    } catch (e) { console.warn('Falha ao tocar som de mensagem:', e); }

    try {
      const emSegundoPlano = document.hidden || !document.hasFocus();
      // Regra 2: nome (ou grupo), foto, previa e horario da notificacao. Em grupo, a previa
      // mostra quem escreveu ("Fulano: texto").
      const remetente = info?.title || (row.sender_name || '').trim() || 'Novo contato';
      const previaBase = info?.preview || (row.text || '').trim() || 'Nova mensagem recebida';
      const corpo = info?.isGroup && (row.sender_name || '').trim() ? `${String(row.sender_name).trim()}: ${previaBase}` : previaBase;
      const horario = formatarHoraNotificacao(info?.messageAt || row.created_at || new Date().toISOString());

      // Aba em foco: a notificacao nativa do navegador nao aparece (so quando esta em segundo
      // plano), entao mostra um aviso visual no canto inferior do proprio CRM. Clicar abre a conversa.
      if (!emSegundoPlano) {
        showMessageToast({
          key: `msg-${row.phone || row.id}`,
          title: remetente,
          body: corpo.length > 120 ? `${corpo.slice(0, 117)}...` : corpo,
          photoUrl: info?.photoUrl,
          time: horario,
          onClick: () => {
            openNotificationLead(row.phone, row.id);
          },
        });
        return;
      }

      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const opcoes = {
        body: corpo.length > 120 ? `${corpo.slice(0, 117)}...` : corpo,
        icon: urlDeFotoValida(info?.photoUrl) || '/icon-192.png',
        tag: `msg-${row.phone || row.id}`,
        data: { phone: row.phone || null, messageId: row.id || null },
      };

      // Caminho principal: pelo service worker. E o UNICO que funciona no Chrome do Android
      // (la, `new Notification(...)` lanca "Illegal constructor" e a notificacao nunca aparece).
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.showNotification(remetente, opcoes);
          return;
        }
      }

      // Fallback: desktop sem service worker registrado.
      const notif = new Notification(remetente, opcoes);
      notif.onclick = () => {
        window.focus();
        openNotificationLead(row.phone, row.id);
        notif.close();
      };
    } catch (e) { console.warn('Falha ao mostrar notificacao de mensagem:', e); }
  };

  // Auto-login (sessao lembrada porque localizacao + notificacoes foram autorizadas): registra
  // a sessao de novo tambem, senao ela some da lista "Sessões Ativas" do admin e o pedido de
  // localização sob demanda para de funcionar depois de recarregar a página.
  const reregisterAutoSession = async (uid: string, uname: string) => {
    const { coords: geoAuto, permission: geoPermAuto } = await getGeoForLogin();
    const notifAuto = await requestNotificationPermission();
    registerSession(uid, uname, geoAuto, geoPermAuto, notifAuto ? 'granted' : 'denied');
  };

  // Guarda o "desligar" do escutador de desconexao remota e do heartbeat da sessao atual,
  // pra nunca deixar um escutador de uma sessao antiga (ja desconectada) ativo por engano
  const sessaoListenerRef = React.useRef<(() => void) | null>(null);

  const pararEscutaDeSessao = () => {
    if (sessaoListenerRef.current) {
      sessaoListenerRef.current();
      sessaoListenerRef.current = null;
    }
  };

  // Registra a sessao (IP publico + dispositivo) no repositorio, e fica escutando
  // se o admin desconectou essa sessao remotamente — se sim, desloga na hora. `geo` e o resultado
  // (ja resolvido) do pedido de permissao de localizacao feito durante o login.
  const registerSession = async (
    uid: string,
    uname: string,
    geo?: { lat: number; lng: number; accuracy: number } | null,
    geoPermission?: 'granted' | 'denied',
    notifPermission?: 'granted' | 'denied'
  ) => {
    pararEscutaDeSessao(); // desliga qualquer escutador de uma sessao anterior antes de criar um novo
    try {
      const sessionId = 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem('rpro_session_id', sessionId);

      let ip = 'desconhecido';
      let location = 'desconhecida';
      // Geolocalizacao por IP publico (cidade/regiao/pais) — nenhum dado de GPS e coletado,
      // so a localizacao aproximada que da pra saber a partir do IP de acesso.
      // Tenta ipapi.co primeiro (traz IP + localizacao numa unica chamada); se falhar
      // (fora do ar, limite de requisicoes, etc), cai pro ipwho.is; e se nem esse
      // funcionar, ao menos tenta pegar o IP puro via ipify pra nao perder essa info.
      try {
        const res = await fetch('https://ipapi.co/json/');
        const j = await res.json();
        ip = j.ip || ip;
        location = [j.city, j.region, j.country_name].filter(Boolean).join(', ') || location;
      } catch (e) {
        try {
          const res2 = await fetch('https://ipwho.is/');
          const j2 = await res2.json();
          if (j2?.success !== false) {
            ip = j2.ip || ip;
            location = [j2.city, j2.region, j2.country].filter(Boolean).join(', ') || location;
          }
        } catch (e2) {
          try {
            const res3 = await fetch('https://api.ipify.org?format=json');
            const j3 = await res3.json();
            ip = j3.ip || ip;
          } catch (e3) { /* segue sem IP/localizacao se todas as consultas falharem */ }
        }
      }

      await setDoc(doc(db, 'sessions', sessionId), {
        userId: uid,
        userName: uname,
        ip,
        location,
        device: describeDevice(),
        userAgent: navigator.userAgent,
        loginAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        isRevoked: false,
        geoPermission: geoPermission || 'denied',
        notifPermission: notifPermission || 'denied',
        preciseLocation: geo ? { ...geo, updatedAt: new Date().toISOString() } : null,
        locationRequestedAt: null,
        locationDenied: false,
      });

      // Guarda o ultimo pedido de localizacao do admin ja atendido, pra nao responder duas
      // vezes ao mesmo pedido (o onSnapshot dispara de novo quando a gente mesmo atualiza o doc)
      let lastHandledLocationRequest: string | null = null;

      // Escuta se essa sessao foi desconectada pelo admin, e tambem se o admin pediu pra ver
      // a localizacao atual agora (so responde se essa sessao tiver autorizado o GPS no login)
      const unsubSnapshot = onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
        // So desloga se essa sessao (sessionId) ainda for a sessao ativa no momento —
        // evita que um escutador antigo derrube uma sessao nova por engano
        if (sessionStorage.getItem('rpro_session_id') !== sessionId) return;
        if (!snap.exists()) return;
        const data = snap.data();
        if (data?.isRevoked) {
          showAlert('Sua sessão foi desconectada pelo administrador.');
          handleLogout();
          return;
        }
        const pedido = data?.locationRequestedAt;
        if (pedido && pedido !== lastHandledLocationRequest) {
          lastHandledLocationRequest = pedido;
          if (localStorage.getItem('rpro_geo_permission') === 'granted') {
            requestGeoPermission().then((novaGeo) => {
              if (sessionStorage.getItem('rpro_session_id') !== sessionId) return;
              if (novaGeo) {
                updateDoc(doc(db, 'sessions', sessionId), {
                  preciseLocation: { ...novaGeo, updatedAt: new Date().toISOString() },
                  locationDenied: false,
                }).catch(() => {});
              } else {
                updateDoc(doc(db, 'sessions', sessionId), { locationDenied: true }).catch(() => {});
              }
            });
          } else {
            updateDoc(doc(db, 'sessions', sessionId), { locationDenied: true }).catch(() => {});
          }
        }
      }, (err) => {
        console.warn('Aviso Firestore session (offline/conexão):', err?.message || err);
      });

      // Atualiza "visto por ultimo" a cada 2 minutos, enquanto a aba estiver aberta
      const heartbeat = setInterval(() => {
        if (sessionStorage.getItem('rpro_session_id') !== sessionId) { clearInterval(heartbeat); return; }
        updateDoc(doc(db, 'sessions', sessionId), { lastSeenAt: new Date().toISOString() }).catch(() => {});
      }, 120000);
      window.addEventListener('beforeunload', () => clearInterval(heartbeat));

      sessaoListenerRef.current = () => { unsubSnapshot(); clearInterval(heartbeat); };
    } catch (e) {
      console.error('Erro ao registrar sessão:', e);
    }
  };

  const handleLogout = async () => {
    pararEscutaDeSessao();
    sessionStorage.removeItem('rpro_logged_user_id');
    sessionStorage.removeItem('rpro_session_id');
    localStorage.removeItem('rpro_simulated_user_id');
    localStorage.removeItem('rpro_remembered_user_id');
    setSimulatedUserIdState(null);
    setUser(null);
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
  };

  // Gerencia o salvamento persistente de credenciais de acordo com a opção "Lembrar login e senha"
  const salvarCredenciaisLembradas = (uid: string, email: string, password: string, remember: boolean) => {
    if (remember) {
      localStorage.setItem('rpro_remember_me', 'true');
      localStorage.setItem('rpro_remembered_user_id', uid);
      localStorage.setItem('rpro_remembered_email', email);
      localStorage.setItem('rpro_remembered_password', password);
    } else {
      localStorage.removeItem('rpro_remember_me');
      localStorage.removeItem('rpro_remembered_user_id');
      localStorage.removeItem('rpro_remembered_email');
      localStorage.removeItem('rpro_remembered_password');
    }
  };

  const handlePasswordLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    const trimmedEmail = loginEmail.trim().toLowerCase();
    const trimmedPassword = loginPassword.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setAuthError('Por favor, informe o e-mail e a senha de acesso.');
      setIsSubmitting(false);
      return;
    }

    // LOGIN OFFLINE: sem internet, nao ha como consultar Firebase/Supabase — usa as
    // credenciais salvas localmente da ultima vez que esse e-mail logou online neste
    // dispositivo (ver cacheOfflineCredentials/getOfflineCredentials acima). So funciona
    // se esse e-mail ja tiver feito login online pelo menos uma vez aqui antes.
    if (!navigator.onLine) {
      // Admin master: senha e fixa no codigo (nao depende de ter logado online antes
      // neste dispositivo), entao sempre tem acesso offline garantido. Usa os dados
      // salvos localmente da ultima sincronizacao se existirem (respeita customizacoes
      // feitas no perfil dele), senao cai no perfil padrao.
      if (trimmedEmail === 'rafaelrtmatos@gmail.com' && trimmedPassword === 'Geper3tp@') {
        const cachedAdmin = getCachedUser('admin-rafael');
        const adminData: AppUser = cachedAdmin || {
          id: 'admin-rafael',
          name: 'Rafael Matos (ADM)',
          email: 'rafaelrtmatos@gmail.com',
          password: 'Geper3tp@',
          role: 'admin',
          isAdmin: true,
          isActive: true,
          avatarUrl: 'https://pro.rafaartsgraphics.com.br/icon-192.png',
          allowedTabs: ['dashboard', 'crm', 'messages', 'pos', 'contacts', 'production', 'settings'],
          allowedActions: [
            'canStartNote', 'canSendSavedMessage', 'canCreateCard', 'canAddTask',
            'canStartPosSale', 'canMoveLead',
            'canViewCustomerData', 'canViewAttachments', 'canTranscribeAudio'
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(adminData);
        cacheUserOffline(adminData);
        sessionStorage.setItem('rpro_logged_user_id', adminData.id);
        salvarCredenciaisLembradas(adminData.id, trimmedEmail, trimmedPassword, rememberMe);
        setAuthError(null);
        setIsSubmitting(false);
        return;
      }

      const offline = getOfflineCredentials(trimmedEmail);
      if (!offline) {
        setAuthError('Sem conexão com a internet. Este e-mail ainda não fez login online neste dispositivo — conecte-se à internet e faça login pelo menos uma vez para habilitar o acesso offline.');
        setIsSubmitting(false);
        return;
      }
      if (offline.password !== trimmedPassword) {
        setAuthError('Senha incorreta! Verifique sua senha e tente novamente.');
        setIsSubmitting(false);
        return;
      }
      const offlineUser = offline.user;
      if (!offlineUser.isActive) {
        setAuthError('Sua conta está inativa. Entre em contato com o administrador.');
        setIsSubmitting(false);
        return;
      }
      if (offlineUser.role === 'comissao') {
        if (!offlineUser.colaboradorId) {
          setAuthError('Este usuário de Comissões ainda não está vinculado a um colaborador. Peça ao administrador para reconfigurar o cadastro.');
          setIsSubmitting(false);
          return;
        }
        localStorage.setItem('rpro_comissoes_colaborador_id', offlineUser.colaboradorId);
        if (rememberMe) {
          localStorage.setItem('rpro_remember_me', 'true');
          localStorage.setItem('rpro_remembered_email', trimmedEmail);
          localStorage.setItem('rpro_remembered_password', trimmedPassword);
        } else {
          localStorage.removeItem('rpro_remember_me');
          localStorage.removeItem('rpro_remembered_email');
          localStorage.removeItem('rpro_remembered_password');
        }
        sessionStorage.removeItem('rpro_logged_user_id');
        localStorage.removeItem('rpro_remembered_user_id');
        window.location.href = 'https://pro.rafaartsgraphics.com.br/comissoes';
        return;
      }
      setUser(offlineUser);
      cacheUserOffline(offlineUser);
      sessionStorage.setItem('rpro_logged_user_id', offlineUser.id);
      salvarCredenciaisLembradas(offlineUser.id, trimmedEmail, trimmedPassword, rememberMe);
      setAuthError(null);
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. MASTER ADMIN LOGIN CHECK
      if (trimmedEmail === 'rafaelrtmatos@gmail.com' && trimmedPassword === 'Geper3tp@') {
        const adminDocRef = doc(db, 'users', 'admin-rafael');
        const adminSnap = await getDoc(adminDocRef);

        let adminData: AppUser = {
          id: 'admin-rafael',
          name: 'Rafael Matos (ADM)',
          email: 'rafaelrtmatos@gmail.com',
          password: 'Geper3tp@',
          role: 'admin',
          isAdmin: true,
          isActive: true,
          avatarUrl: 'https://pro.rafaartsgraphics.com.br/icon-192.png',
          allowedTabs: ['dashboard', 'crm', 'messages', 'pos', 'contacts', 'production', 'settings'],
          allowedActions: [
            'canStartNote', 'canSendSavedMessage', 'canCreateCard', 'canAddTask',
            'canStartPosSale', 'canMoveLead',
            'canViewCustomerData', 'canViewAttachments', 'canTranscribeAudio'
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (!adminSnap.exists()) {
          await setDoc(adminDocRef, adminData);
        } else {
          adminData = { ...adminSnap.data(), id: adminSnap.id } as AppUser;
          if (adminData.password !== 'Geper3tp@' || !adminData.isAdmin) {
            await updateDoc(adminDocRef, { password: 'Geper3tp@', isAdmin: true, role: 'admin' });
            adminData.password = 'Geper3tp@';
            adminData.isAdmin = true;
          }
        }

        setUser(adminData);
        cacheUserOffline(adminData);
        cacheOfflineCredentials(trimmedEmail, trimmedPassword, adminData);
        sessionStorage.setItem('rpro_logged_user_id', adminData.id);
        const { coords: geoAdmin, permission: geoPermissionAdmin } = await getGeoForLogin();
        const notifAdmin = await requestNotificationPermission();
        localStorage.setItem('rpro_geo_permission', geoPermissionAdmin);
        localStorage.setItem('rpro_notif_permission', notifAdmin ? 'granted' : 'denied');
        registerSession(adminData.id, adminData.name, geoAdmin, geoPermissionAdmin, notifAdmin ? 'granted' : 'denied');
        salvarCredenciaisLembradas(adminData.id, trimmedEmail, trimmedPassword, rememberMe);
        setIsSubmitting(false);
        return;
      }

      // 2. QUERY SUPABASE (usuarios comuns vivem la, so o admin master fica no Firebase)
      const { data: usuarioRow, error: usuarioErr } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (usuarioErr) {
        setAuthError(`Erro ao verificar credenciais: ${usuarioErr.message}`);
        setIsSubmitting(false);
        return;
      }

      let userData: AppUser;

      if (usuarioRow) {
        userData = mapUsuarioRow(usuarioRow);
      } else {
        // Nao achou no Supabase — pode ser um usuario antigo, criado antes da migracao, que ainda so existe no Firebase.
        // Busca la como reserva; se achar, migra automaticamente pro Supabase pra da proxima vez ja vir de la.
        const qLegacy = query(collection(db, 'users'), where('email', '==', trimmedEmail));
        const snapLegacy = await getDocs(qLegacy);

        if (snapLegacy.empty) {
          setAuthError('Usuário não encontrado. Solicite o cadastro ao administrador (rafaelrtmatos@gmail.com).');
          setIsSubmitting(false);
          return;
        }

        const legacyDoc = snapLegacy.docs[0];
        const legacyData = legacyDoc.data() as any;

        if (legacyData.isActive === false) {
          setAuthError('Sua conta está inativa. Entre em contato com o administrador.');
          setIsSubmitting(false);
          return;
        }
        if (legacyData.password && legacyData.password !== trimmedPassword) {
          setAuthError('Senha incorreta! Verifique sua senha e tente novamente.');
          setIsSubmitting(false);
          return;
        }

        // Migra o usuario antigo pro Supabase agora que a senha ja foi conferida
        const { data: migrado, error: migrarErr } = await supabase.from('usuarios').insert({
          name: legacyData.name,
          email: trimmedEmail,
          password: legacyData.password || null,
          role: legacyData.role || 'atendente',
          is_admin: !!legacyData.isAdmin,
          is_active: legacyData.isActive !== false,
          allowed_tabs: legacyData.allowedTabs || null,
          allowed_actions: legacyData.allowedActions || null,
        }).select().single();

        if (migrarErr || !migrado) {
          console.error('Erro ao migrar usuário antigo para o Supabase:', migrarErr);
          // Se falhou por já existir (ex: outra aba migrou primeiro), busca o que já foi criado
          const { data: jaMigrado } = await supabase.from('usuarios').select('*').eq('email', trimmedEmail).maybeSingle();
          if (jaMigrado) {
            userData = mapUsuarioRow(jaMigrado);
            // Ja existe no Supabase (outra aba/sessao migrou primeiro) — apaga o residuo do Firebase tambem
            try { await deleteDoc(doc(db, 'users', legacyDoc.id)); } catch (e) { /* ignora se ja nao existir */ }
          } else {
            userData = { id: legacyDoc.id, ...legacyData } as AppUser;
          }
        } else {
          userData = mapUsuarioRow(migrado);
          // Migracao concluida com sucesso — apaga o registro antigo do Firebase pra nao ficar
          // aparecendo duplicado na lista de usuarios (um "fantasma" do Firebase + o novo do Supabase)
          try { await deleteDoc(doc(db, 'users', legacyDoc.id)); } catch (e) { /* ignora se ja nao existir */ }
        }
      }

      if (!userData.isActive) {
        setAuthError('Sua conta está inativa. Entre em contato com o administrador.');
        setIsSubmitting(false);
        return;
      }

      // Check password (pula essa checagem de novo se ja veio validada do fluxo de migracao acima)
      if (usuarioRow && userData.password && userData.password !== trimmedPassword) {
        setAuthError('Senha incorreta! Verifique sua senha e tente novamente.');
        setIsSubmitting(false);
        return;
      }

      // Salva as credenciais desse login neste dispositivo, pra permitir login offline
      // (digitando e-mail/senha do zero) da proxima vez, mesmo sem sessao salva.
      cacheOfflineCredentials(trimmedEmail, trimmedPassword, userData);

      // Usuario "Comissao": nao entra no CRM. Ele so tem acesso a area de Comissoes, entao
      // aqui a gente ja guarda a sessao do colaborador vinculado e manda o navegador direto
      // pra /comissoes — a tela de ComissoesApp reconhece essa sessao salva e loga sozinha,
      // sem pedir nome/senha de novo (ver COLABORADOR_SESSION_KEY em comissoes/ComissoesApp.tsx).
      if (userData.role === 'comissao') {
        if (!userData.colaboradorId) {
          setAuthError('Este usuário de Comissões ainda não está vinculado a um colaborador. Peça ao administrador para reconfigurar o cadastro.');
          setIsSubmitting(false);
          return;
        }
        localStorage.setItem('rpro_comissoes_colaborador_id', userData.colaboradorId);
        // Lembra e-mail e senha para acesso rápido caso precise relogar
        if (rememberMe) {
          localStorage.setItem('rpro_remember_me', 'true');
          localStorage.setItem('rpro_remembered_email', trimmedEmail);
          localStorage.setItem('rpro_remembered_password', trimmedPassword);
        } else {
          localStorage.removeItem('rpro_remember_me');
          localStorage.removeItem('rpro_remembered_email');
          localStorage.removeItem('rpro_remembered_password');
        }
        sessionStorage.removeItem('rpro_logged_user_id');
        localStorage.removeItem('rpro_remembered_user_id');
        window.location.href = 'https://pro.rafaartsgraphics.com.br/comissoes';
        return;
      }

      setUser(userData);
      cacheUserOffline(userData);
      sessionStorage.setItem('rpro_logged_user_id', userData.id);
      const { coords: geoUser, permission: geoPermissionUser } = await getGeoForLogin();
      const notifUser = await requestNotificationPermission();
      localStorage.setItem('rpro_geo_permission', geoPermissionUser);
      localStorage.setItem('rpro_notif_permission', notifUser ? 'granted' : 'denied');
      registerSession(userData.id, userData.name, geoUser, geoPermissionUser, notifUser ? 'granted' : 'denied');
      salvarCredenciaisLembradas(userData.id, trimmedEmail, trimmedPassword, rememberMe);
    } catch (err) {
      console.error('Erro na autenticação:', err);
      setAuthError('Erro de conexão ao verificar credenciais. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    let companiesUnsub: (() => void) | null = null;
    let userUnsub: (() => void) | null = null;

    const initAuth = async () => {
      // 1. Fetch Companies
      const companiesQuery = query(collection(db, 'companies'), where('isActive', '==', true));
      companiesUnsub = onSnapshot(companiesQuery, (snapshot) => {
        const comps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Company);
        setCompanies(comps);
        try { localStorage.setItem('rpro_cached_companies', JSON.stringify(comps)); } catch (e) { /* ignora */ }
        if (comps.length > 0) {
          setCurrentCompany(prev => prev || comps[0]);
        }
      }, (err) => {
        console.warn('Aviso Firestore companies (offline/conexão):', err?.message || err);
      });

      // 2. Check saved session user (sessionStorage sempre; localStorage se "lembrar login e senha" foi marcado)
      let savedUserId = sessionStorage.getItem('rpro_logged_user_id') || localStorage.getItem('rpro_remembered_user_id');
      const isRememberMe = localStorage.getItem('rpro_remember_me') === 'true';
      const remEmail = localStorage.getItem('rpro_remembered_email')?.trim().toLowerCase();
      const remPass = localStorage.getItem('rpro_remembered_password')?.trim();

      // Se "lembrar login e senha" estiver ativo mas o ID do usuário não estiver salvo, recupera automaticamente
      if (!savedUserId && isRememberMe && remEmail && remPass) {
        if (remEmail === 'rafaelrtmatos@gmail.com' && remPass === 'Geper3tp@') {
          savedUserId = 'admin-rafael';
          localStorage.setItem('rpro_remembered_user_id', 'admin-rafael');
        } else {
          try {
            const { data: uRow } = await supabase
              .from('usuarios')
              .select('id, password')
              .eq('email', remEmail)
              .maybeSingle();
            if (uRow && uRow.password === remPass) {
              savedUserId = uRow.id;
              localStorage.setItem('rpro_remembered_user_id', uRow.id);
            }
          } catch {
            // ignora erro de rede/busca
          }
        }
      }

      const targetUserId = simulatedUserId || savedUserId;

      if (targetUserId) {
        // Sem internet: usa direto os dados da ultima vez que logou online, sem tentar rede.
        // Isso permite continuar usando o sistema (com os dados de quando sincronizou por ultimo)
        // mesmo sem conexao, contanto que ja tenha logado com internet pelo menos uma vez antes.
        if (!navigator.onLine) {
          const cached = getCachedUser(targetUserId);
          if (cached && cached.role !== 'comissao') {
            setUser(cached);
            setLoading(false);
            return;
          }
        }

        try {
          const userDocRef = doc(db, 'users', targetUserId);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const uData = { id: snap.id, ...snap.data() } as AppUser;
            // Blindagem: se por algum motivo (sessao antiga, cache, etc) um usuario "comissao"
            // tiver ficado salvo nas chaves do CRM principal, nunca deixa ele cair no dashboard —
            // limpa a sessao errada e manda pra /comissoes, onde ele realmente deve logar.
            if (uData.role === 'comissao') {
              sessionStorage.removeItem('rpro_logged_user_id');
              localStorage.removeItem('rpro_remembered_user_id');
              localStorage.removeItem('rpro_remembered_email');
              window.location.href = 'https://pro.rafaartsgraphics.com.br/comissoes';
              return;
            }
            setUser(uData);
            cacheUserOffline(uData);
            userUnsub = onSnapshot(userDocRef, (s) => {
              if (s.exists()) {
                const fresh = { id: s.id, ...s.data() } as AppUser;
                setUser(fresh);
                cacheUserOffline(fresh);
              }
            }, (err) => {
              console.warn('Aviso Firestore userDoc (offline/conexão):', err?.message || err);
            });
            // Auto-login (sessao lembrada porque a localizacao foi autorizada): registra a sessao
            // de novo tambem, senao ela some da lista "Sessões Ativas" do admin e o pedido de
            // localização sob demanda para de funcionar depois de recarregar a página.
            reregisterAutoSession(uData.id, uData.name);
          } else if (targetUserId === 'admin-rafael') {
            const adminData: AppUser = {
              id: 'admin-rafael',
              name: 'Rafael Matos (ADM)',
              email: 'rafaelrtmatos@gmail.com',
              password: 'Geper3tp@',
              role: 'admin',
              isAdmin: true,
              isActive: true,
              avatarUrl: 'https://pro.rafaartsgraphics.com.br/icon-192.png',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, adminData);
            setUser(adminData);
            cacheUserOffline(adminData);
            reregisterAutoSession(adminData.id, adminData.name);
          } else {
            // Nao achou no Firebase (nao e o admin master) — tenta no Supabase, onde vivem os usuarios comuns
            const { data: usuarioRow } = await supabase.from('usuarios').select('*').eq('id', targetUserId).maybeSingle();
            if (usuarioRow) {
              const uData = mapUsuarioRow(usuarioRow);
              // Mesma blindagem do ramo do Firebase acima: usuario "comissao" nunca fica logado
              // no CRM principal, mesmo que uma sessao antiga tenha ficado salva.
              if (uData.role === 'comissao') {
                sessionStorage.removeItem('rpro_logged_user_id');
                localStorage.removeItem('rpro_remembered_user_id');
                localStorage.removeItem('rpro_remembered_email');
                window.location.href = 'https://pro.rafaartsgraphics.com.br/comissoes';
                return;
              }
              setUser(uData);
              cacheUserOffline(uData);
              const channel = supabase
                .channel(`usuario-sessao-${targetUserId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios', filter: `id=eq.${targetUserId}` }, (payload: any) => {
                  if (payload.new) {
                    const fresh = mapUsuarioRow(payload.new);
                    setUser(fresh);
                    cacheUserOffline(fresh);
                  }
                })
                .subscribe();
              userUnsub = () => { supabase.removeChannel(channel); };
              sessionStorage.setItem('rpro_logged_user_id', uData.id);
              reregisterAutoSession(uData.id, uData.name);
            } else {
              sessionStorage.removeItem('rpro_logged_user_id');
              localStorage.removeItem('rpro_remembered_user_id');
            }
          }
        } catch (e) {
          // Falhou por causa da rede (sem internet, instavel, etc) — tenta os dados salvos localmente
          // da ultima vez que logou online, em vez de simplesmente deslogar a pessoa.
          if (targetUserId === 'admin-rafael') {
            const adminData = getCachedUser('admin-rafael') || {
              id: 'admin-rafael',
              name: 'Rafael Matos (ADM)',
              email: 'rafaelrtmatos@gmail.com',
              password: 'Geper3tp@',
              role: 'admin',
              isAdmin: true,
              isActive: true,
              avatarUrl: 'https://pro.rafaartsgraphics.com.br/icon-192.png',
              allowedTabs: ['dashboard', 'crm', 'messages', 'pos', 'contacts', 'production', 'settings'],
              allowedActions: [
                'canStartNote', 'canSendSavedMessage', 'canCreateCard', 'canAddTask',
                'canStartPosSale', 'canMoveLead',
                'canViewCustomerData', 'canViewAttachments', 'canTranscribeAudio'
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setUser(adminData);
          } else {
            const cached = getCachedUser(targetUserId);
            if (cached && cached.role !== 'comissao') {
              setUser(cached);
            } else {
              sessionStorage.removeItem('rpro_logged_user_id');
            }
          }
        }
      }
      setLoading(false);
    };

    initAuth();

    return () => {
      if (companiesUnsub) companiesUnsub();
      if (userUnsub) userUnsub();
    };
  }, [simulatedUserId]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'crm', label: 'Funil CRM', icon: Target },
    { id: 'messages', label: 'Mensagens', icon: MessageSquare },
    { id: 'pos', label: 'PDV Gráfica', icon: ShoppingBag },
    { id: 'inventory', label: 'Estoque & Materiais', icon: Package },
    { id: 'clientes_espera', label: 'Clientes em Espera', icon: Clock },
    { id: 'production', label: 'Ordem de Serviço', icon: Layers },
    { id: 'robozinho_rafa', label: 'Integrações', icon: Bot },
    { id: 'comissoes', label: 'Financeiro', icon: Percent },
    { id: 'settings', label: 'Opções', icon: Settings },
  ].filter(item => {
    // Admin sempre ve tudo, mesmo que tenha uma lista antiga de allowedTabs salva
    // sem essa aba (ex: aba nova adicionada depois que o allowedTabs foi configurado)
    if (user?.isAdmin) return true;

    // If user has specific allowedTabs, check it first
    if (user && user.allowedTabs && Array.isArray(user.allowedTabs)) {
      if (item.id === 'inventory') {
        return (
          user.allowedTabs.includes('inventory') ||
          !!user.allowedActions?.includes('canManageInventory') ||
          !!user.modulePermissions?.inventory?.view ||
          !!user.modulePermissions?.inventory?.edit ||
          !!user.modulePermissions?.inventory?.create ||
          (Array.isArray(user.allowedPdvTabs) && user.allowedPdvTabs.includes('estoque'))
        );
      }
      return user.allowedTabs.includes(item.id);
    }
    
    // Se nao tem admin nem allowedTabs definido, mostra so o Dashboard por padrao —
    // Configuracoes NUNCA deve aparecer de graca pra quem nao e admin
    if (item.id === 'dashboard') return true;
    
    // Otherwise check company active modules
    return currentCompany?.activeModules?.includes(item.id) ?? true;
  }).sort((a, b) => {
    // Ordem escolhida pelo admin em Configuracoes > Menu Lateral (se nao configurado, mantem a ordem padrao)
    if (!menuConfig) return 0;
    const idxA = menuConfig.findIndex(m => m.id === a.id);
    const idxB = menuConfig.findIndex(m => m.id === b.id);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  }).filter(item => {
    // Item escondido pelo admin (exceto Opcoes, que sempre fica visivel pra admin nao se trancar fora)
    if (!menuConfig || item.id === 'settings') return true;
    const cfg = menuConfig.find(m => m.id === item.id);
    return cfg ? cfg.visible : true;
  });

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-[#07070a]">
      <div className="flex flex-col items-center gap-6">
        {logosReady ? (
          <BrandLogo imageUrl={logoLightUrl || logoDarkUrl} size="xl" widthPx={105} layout="stacked" />
        ) : (
          <div style={{ width: 105, height: 64 }} />
        )}
        <div className="w-10 h-10 border-4 border-red-600/30 border-t-red-500 rounded-full animate-spin mt-2" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 animate-pulse">Iniciando Sistema de Gestão...</p>
      </div>
    </div>
  );

  const handleCreateDefaultCompany = async () => {
    setIsCreatingCompany(true);
    try {
      await addDoc(collection(db, 'companies'), {
        name: 'Rafa Arts Graphics',
        cnpj: '28.884.125/0001-40',
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (err) {
      console.error('Erro ao criar empresa:', err);
      showAlert('Não foi possível criar a empresa. Veja o console para detalhes.');
    } finally {
      setIsCreatingCompany(false);
    }
  };

  if (!user) return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#060608] p-4 relative overflow-hidden select-none">
      {/* Dynamic Ambient Background with Soft Red Radiant Halos */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ambient Crimson Orbs */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-600/[0.10] rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 right-1/4 w-[450px] h-[450px] bg-red-700/[0.08] rounded-full blur-[150px]" />

        {/* Micro-dot Matrix Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* Fine Horizon Lines */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
      </div>

      <div className="w-full max-w-sm mx-auto my-auto relative z-10 flex flex-col items-center" style={{ maxWidth: '384px', width: '100%' }}>
        {/* Logo Livre - Sem card, sem borda de fundo */}
        <div className="mb-6 flex flex-col items-center justify-center text-center">
          {logosReady ? (
            <BrandLogo imageUrl={logoLightUrl || logoDarkUrl} size="md" widthPx={200} layout="stacked" />
          ) : (
            <div style={{ width: 200, height: 100 }} className="animate-pulse bg-white/5 rounded-lg" />
          )}
        </div>

        {/* Card de Entrada em Tamanho Padrão */}
        <div 
          className="w-full max-w-sm mx-auto bg-[#0b0c12]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(220,38,38,0.06)] relative overflow-hidden"
          style={{ maxWidth: '384px', width: '100%' }}
        >
          {/* Top highlight bar */}
          <div className="absolute top-0 inset-x-6 h-[2px] bg-gradient-to-r from-transparent via-red-500/80 to-transparent" />

          {/* Form Header */}
          <div className="mb-4 text-center">
            <h1 className="text-base font-bold text-white tracking-tight">
              Acesso ao Sistema
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Digite seu e-mail e senha para entrar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handlePasswordLogin} className="space-y-3.5">
            {/* E-mail Field */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Mail size={12} className="text-red-500" />
                <span>E-mail</span>
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors pointer-events-none">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLoginEmail(val);
                    if (rememberMe) {
                      localStorage.setItem('rpro_remembered_email', val.trim().toLowerCase());
                    }
                  }}
                  placeholder="seu.email@empresa.com"
                  className="w-full h-10 bg-[#06060a] hover:bg-[#08080f] focus:bg-[#090912] border border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 rounded-xl pl-10 pr-3 text-xs text-white font-medium focus:outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Lock size={12} className="text-red-500" />
                <span>Senha</span>
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors pointer-events-none">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLoginPassword(val);
                    if (rememberMe) {
                      localStorage.setItem('rpro_remembered_password', val.trim());
                    }
                  }}
                  placeholder="••••••••"
                  className="w-full h-10 bg-[#06060a] hover:bg-[#08080f] focus:bg-[#090912] border border-white/10 hover:border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 rounded-xl pl-10 pr-10 text-xs text-white font-medium focus:outline-none transition-all placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400 transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/5"
                  title={showPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Options Row (Remember Me) */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRememberMe(checked);
                    if (checked) {
                      localStorage.setItem('rpro_remember_me', 'true');
                      if (loginEmail) localStorage.setItem('rpro_remembered_email', loginEmail.trim().toLowerCase());
                      if (loginPassword) localStorage.setItem('rpro_remembered_password', loginPassword.trim());
                    } else {
                      localStorage.removeItem('rpro_remember_me');
                      localStorage.removeItem('rpro_remembered_user_id');
                      localStorage.removeItem('rpro_remembered_email');
                      localStorage.removeItem('rpro_remembered_password');
                    }
                  }}
                  className="w-3.5 h-3.5 rounded border-white/20 bg-[#06060a] accent-red-600 cursor-pointer"
                />
                <span className="text-[11px] font-medium text-slate-300 group-hover:text-white transition-colors">
                  Lembrar login e senha
                </span>
              </label>

              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                <ShieldCheck size={12} className="text-emerald-500/80" />
                <span>Salvar neste aparelho</span>
              </div>
            </div>

            {/* Auth Error Banner */}
            {authError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-600/40 text-red-200 text-xs font-medium flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200 shadow-lg shadow-red-950/30">
                <AlertCircle size={15} className="shrink-0 text-red-500 mt-0.5" />
                <span className="leading-relaxed text-[11px]">{authError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer border border-red-400/20 mt-1"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight size={14} className="text-white/80" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security & System Footer */}
        <div className="text-center mt-5 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck size={13} className="text-red-500/90 shrink-0" />
            <span>Conexão criptografada de ponta a ponta</span>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
            © 2026 RAFA ARTS GRAPHICS • SISTEMA RPRO
          </p>
        </div>
      </div>
    </div>
  );

  if (companies.length === 0) return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050508] p-4">
      <div className="max-w-md w-full flex flex-col items-center gap-5 text-center bg-white/[0.03] border border-white/10 rounded-2xl p-8">
        {logosReady ? (
          <BrandLogo imageUrl={logoLightUrl || logoDarkUrl} size="lg" layout="stacked" />
        ) : (
          <div style={{ width: 320, height: 195 }} />
        )}
        <h2 className="text-lg font-black text-white uppercase tracking-wider">Nenhuma empresa encontrada</h2>
        <p className="text-sm text-white/50">
          O sistema não encontrou nenhuma empresa ativa cadastrada. Isso costuma acontecer se o registro da empresa foi apagado no banco de dados. Clique abaixo para recriar o cadastro da Rafa Arts Graphics.
        </p>
        <button
          onClick={handleCreateDefaultCompany}
          disabled={isCreatingCompany}
          className="w-full h-12 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all"
        >
          {isCreatingCompany ? 'Criando...' : 'Criar Empresa Rafa Arts Graphics'}
        </button>
      </div>
    </div>
  );

  const contextValue: AppContextType = {
    user,
    companies,
    currentCompany,
    setCurrentCompany,
    activeTab,
    setActiveTab,
    isSidebarOpen,
    setIsSidebarOpen,
    pendingOrders,
    addPendingOrder,
    isRegisterOpen,
    setIsRegisterOpen,
    prefilledCustomer,
    setPrefilledCustomer,
    pendingWhatsAppShare,
    setPendingWhatsAppShare,
    openWhatsAppChat,
    pendingReceiptOpenId,
    setPendingReceiptOpenId,
    pendingHistoryClientFilter,
    setPendingHistoryClientFilter,
    pendingHistoryProductSearch,
    setPendingHistoryProductSearch,
    pendingReceivablesFilter,
    setPendingReceivablesFilter,
    pendingGoToHistorico,
    setPendingGoToHistorico,
    pendingGoToServicos,
    setPendingGoToServicos,
    pendingOpenContratoId,
    setPendingOpenContratoId,
    pendingOpenOrcamentoId,
    setPendingOpenOrcamentoId,
    pendingOpenNotaNoPdv,
    setPendingOpenNotaNoPdv,
    pendingOpenLeadId,
    setPendingOpenLeadId,
    pendingOpenMessageId,
    setPendingOpenMessageId,
    notificacoesPendentes,
    abrirNotificacao,
    simulatedUserId,
    setSimulatedUserId,
    theme,
    setTheme,
    toggleTheme,
    logout: handleLogout,
    logoLightUrl,
    logoDarkUrl
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app flex flex-col h-screen overflow-hidden relative">
        {/* Background Mesh — escondido na aba Comissões, que já tem fundo preto sólido próprio */}
        <div className={cn("fixed inset-0 z-[-1] mesh-gradient", activeTab === 'comissoes' && "opacity-0")} />

        {simulatedUserId && (
          <div className="bg-amber-500 text-slate-950 font-black px-8 py-2 md:py-3 text-[10px] md:text-xs flex items-center justify-between shadow-xl relative z-50 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping shrink-0" />
              <span>Simulando Visão de: <strong className="uppercase">{user?.name}</strong> • Cargo: <strong className="uppercase">{user?.role}</strong></span>
            </div>
            <button 
              onClick={() => setSimulatedUserId(null)} 
              className="bg-slate-950 text-white rounded-full px-4 py-1.5 hover:bg-slate-800 transition-all font-black text-[9px] uppercase tracking-wider"
            >
              Voltar ao Admin
            </button>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden relative">
          {/* Sidebar */}
          <AnimatePresence>
            {(isSidebarOpen || window.innerWidth >= 1024) && (
              <motion.aside
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ duration: 0.5, type: 'spring', damping: 25, stiffness: 120 }}
                className={cn(
                  "fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white/5 backdrop-blur-3xl border-r border-white/10 flex flex-col p-8 shadow-2xl lg:shadow-none lg:bg-transparent",
                  !isSidebarOpen && "hidden lg:flex"
                )}
              >
              <div className="flex items-center justify-between mb-8 px-1">
                <div className="flex items-center gap-3">
                  {logosReady ? (
                    <BrandLogo imageUrl={theme === 'light' ? (logoDarkUrl || logoLightUrl) : logoLightUrl} size="md" layout="stacked" />
                  ) : (
                    <div style={{ width: 220, height: 135 }} />
                  )}
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden p-2 text-white/40 hover:text-white transition-colors rounded-xl bg-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-3 custom-scrollbar">
                {menuItems.map(item => (
                  <SidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    tab={item.id as MainTab}
                    active={activeTab === item.id}
                    badgeCount={item.id === 'messages' ? unrepliedLeadsCount : undefined}
                    onClick={() => {
                      if (item.id === 'messages' && window.innerWidth >= 1024) {
                        // Desktop: abrir popup de mensagens
                        setIsMessagePopupOpen(true);
                      } else {
                        // Mobile ou outros itens: navegação normal
                        setIsMessagePopupOpen(false);
                        setActiveTab(item.id as MainTab);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }
                    }}
                  />
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Backdrop for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-transparent overflow-hidden">
          <Navbar />
          <div className={cn("flex-1 custom-scrollbar", (activeTab === 'pos' || activeTab === 'crm') ? "p-2 md:p-3 overflow-hidden" : "p-4 md:p-8 overflow-y-auto")}>
            <div className={cn((activeTab === 'pos' || activeTab === 'crm') ? "max-w-full h-full" : "max-w-7xl mx-auto")}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className={(activeTab === 'pos' || activeTab === 'crm') ? "h-full" : undefined}
                >
                  {activeTab === 'dashboard' && <DashboardModule user={user} currentCompany={currentCompany} pendingOrders={pendingOrders} setActiveTab={setActiveTab} setIsMessagePopupOpen={setIsMessagePopupOpen} />}
                  {activeTab === 'crm' && <CRMModule currentCompany={currentCompany} user={user} />}
                  {activeTab === 'messages' && <MessagesModule currentCompany={currentCompany} user={user} preselectedLeadId={preselectedLeadIdForMessages} />}
                  {activeTab === 'pos' && <ModuleErrorBoundary label="o PDV"><POSModule currentCompany={currentCompany} addPendingOrder={addPendingOrder} /></ModuleErrorBoundary>}
                  {activeTab === 'contacts' && (
                    <ContactsModule
                      currentCompany={currentCompany}
                      onViewHistoryForClient={(clienteId: string, clienteName: string) => {
                        setPendingHistoryClientFilter({ clienteId, clienteName });
                        setActiveTab('pos');
                      }}
                      onStartSaleForClient={(cliente) => {
                        setPrefilledCustomer(cliente);
                        setActiveTab('pos');
                      }}
                      onOpenReceiptById={(saleId: string) => {
                        setPendingReceiptOpenId(saleId);
                        setActiveTab('pos');
                      }}
                    />
                  )}
                  {activeTab === 'clientes_espera' && <ModuleErrorBoundary label="Clientes em Espera"><ClientesEsperaModule currentCompany={currentCompany} user={user} /></ModuleErrorBoundary>}
                  {activeTab === 'inventory' && <ModuleErrorBoundary label="Estoque & Materiais"><InventoryModule currentCompany={currentCompany} user={user} /></ModuleErrorBoundary>}
                  {activeTab === 'services' && <ServicesModule currentCompany={currentCompany} />}
                  {activeTab === 'production' && <ProductionModule currentCompany={currentCompany} />}
                  {activeTab === 'robozinho_rafa' && <ModuleErrorBoundary label="Integrações"><IntegracoesModule currentCompany={currentCompany} user={user} /></ModuleErrorBoundary>}
                  {activeTab === 'comissoes' && (
                    <ModuleErrorBoundary label="Financeiro">
                      <FinanceiroModule currentCompany={currentCompany} user={user} />
                    </ModuleErrorBoundary>
                  )}
                  {activeTab === 'settings' && <SettingsModule currentCompany={currentCompany} user={user} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </div>
    
    {/* Painel de Mensagens no Menu Lateral (Desktop) — cobre todo o conteúdo à
        direita da sidebar, nunca a própria sidebar. É só a lista: ao escolher
        uma conversa, fecha e pula direto pro Funil CRM (ver MessagesSidebarPopup.tsx) */}
    <MessagesSidebarPopup
      isOpen={isMessagePopupOpen}
      onClose={() => setIsMessagePopupOpen(false)}
      currentCompany={currentCompany}
      user={user}
    />

    <AssistantChatWidget currentCompany={currentCompany} user={user} />

    <NotifyHost />
    </AppContext.Provider>
  );
}

