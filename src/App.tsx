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
  Key
} from 'lucide-react';
import { ChevronRight } from 'lucide-react';

// Painel de Comissões, aberto direto pelo menu lateral (mesmo app usado em /comissoes,
// só que sem sair do sistema). Carregado sob demanda (lazy) pra não pesar o carregamento inicial.
const ComissoesEmbedded = React.lazy(() => import('./comissoes/ComissoesEmbedded'));
import { NotifyHost, showAlert } from './lib/notify';
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

type MainTab = 'dashboard' | 'crm' | 'messages' | 'pos' | 'contacts' | 'services' | 'inventory' | 'production' | 'settings' | 'comissoes';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- CONTEXT ---
interface AppContextType {
  user: AppUser | null;
  companies: Company[];
  currentCompany: Company | null;
  setCurrentCompany: (company: Company) => void;
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  pendingOrders: SaleOrder[];
  addPendingOrder: (order: SaleOrder) => void;
  isRegisterOpen: boolean;
  setIsRegisterOpen: (open: boolean) => void;
  prefilledCustomer: { id?: string, name: string, phone: string } | null;
  setPrefilledCustomer: (customer: { id?: string, name: string, phone: string } | null) => void;
  pendingWhatsAppShare: { leadId: string; prefillMessage: string } | null;
  setPendingWhatsAppShare: (v: { leadId: string; prefillMessage: string } | null) => void;
  pendingReceiptOpenId: string | null;
  setPendingReceiptOpenId: (id: string | null) => void;
  pendingHistoryClientFilter: { clienteId: string; clienteName: string } | null;
  setPendingHistoryClientFilter: (v: { clienteId: string; clienteName: string } | null) => void;
  pendingReceivablesFilter: boolean;
  setPendingReceivablesFilter: (v: boolean) => void;
  pendingGoToHistorico: boolean;
  setPendingGoToHistorico: (v: boolean) => void;
  pendingOpenContratoId: string | null;
  setPendingOpenContratoId: (id: string | null) => void;
  simulatedUserId: string | null;
  setSimulatedUserId: (id: string | null) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  logout: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

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

const Navbar = () => {
  const { user, companies, currentCompany, setCurrentCompany, setIsSidebarOpen, theme, toggleTheme, logout } = useApp();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCompanySelectOpen, setIsCompanySelectOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

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
    <nav className="sticky top-0 z-40 bg-white/5 backdrop-blur-xl border-b border-white/10 h-20 flex items-center justify-between px-8 mb-6 rounded-b-[32px] mx-4 sm:mx-8">
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
              "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs uppercase shadow-lg",
              currentCompany?.name.toLowerCase().includes('imobiliária') ? "bg-primary-600" : "bg-primary-800"
            )}>
              {currentCompany?.shortName?.[0] || currentCompany?.name?.[0] || 'R'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-white tracking-wide leading-tight">
                {currentCompany?.name || 'Selecione uma Empresa'}
              </p>
              <p className="text-[10px] text-white/50 capitalize font-medium">
                Gestão Ativa
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
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-500/30 text-white font-bold text-lg">
                {user?.name?.[0]}
              </div>
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
import { ModuleErrorBoundary } from './components/SharedUI';

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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
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
    const validTabs: MainTab[] = ['dashboard', 'crm', 'messages', 'pos', 'contacts', 'services', 'inventory', 'production', 'settings', 'comissoes'];
    return (saved && validTabs.includes(saved as MainTab)) ? (saved as MainTab) : 'dashboard';
  });
  const setActiveTab = (tab: MainTab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') localStorage.setItem('rpro_active_tab', tab);
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<SaleOrder[]>([]);
  const [isRegisterOpen, setIsRegisterOpenLocal] = useState(false);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('configuracoes').select('caixa_aberto').eq('company_id', 'rafa-arts').maybeSingle();
      setIsRegisterOpenLocal(!!data?.caixa_aberto);
    };
    load();
    const channel = supabase
      .channel('caixa-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  const setIsRegisterOpen = async (open: boolean) => {
    setIsRegisterOpenLocal(open); // resposta imediata na UI
    try {
      await supabase.from('configuracoes').upsert({
        company_id: 'rafa-arts',
        caixa_aberto: open,
        caixa_aberto_em: open ? new Date().toISOString() : null,
      }, { onConflict: 'company_id' });
    } catch (err) {
      console.error('Erro ao sincronizar status do caixa:', err);
    }
  };
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [prefilledCustomer, setPrefilledCustomer] = useState<{ id?: string, name: string, phone: string } | null>(null);
  const [pendingWhatsAppShare, setPendingWhatsAppShare] = useState<{ leadId: string; prefillMessage: string } | null>(null);
  const [pendingReceiptOpenId, setPendingReceiptOpenId] = useState<string | null>(null);
  const [pendingHistoryClientFilter, setPendingHistoryClientFilter] = useState<{ clienteId: string; clienteName: string } | null>(null);
  const [pendingReceivablesFilter, setPendingReceivablesFilter] = useState(false);
  const [pendingGoToHistorico, setPendingGoToHistorico] = useState(false);
  const [pendingOpenContratoId, setPendingOpenContratoId] = useState<string | null>(null);
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
    const q = query(
      collection(db, 'leads'),
      where('companyId', '==', currentCompany.id)
    );
    return onSnapshot(q, (snap) => {
      const count = snap.docs.filter(d => {
        const data = d.data();
        return data.waitingSince !== null && data.waitingSince !== undefined;
      }).length;
      setUnrepliedLeadsCount(count);
    });
  }, [currentCompany]);

  useEffect(() => {
    if (!currentCompany || !user) return;

    // RULE: All incoming messages must create a lead in "ENTRADA" (initial stage)
    const q = query(
      collection(db, 'messages'),
      where('companyId', '==', currentCompany.id),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) return;
      const latestMsgDoc = snapshot.docs[0];
      const msgData = latestMsgDoc.data();

      // Only process truly new incoming messages to avoid duplicates
      if (msgData.direction === 'incoming' && latestMsgDoc.id !== lastMessageId) {
        setLastMessageId(latestMsgDoc.id);

        // Check if lead already exists for this phone/contact
        const leadQ = query(
          collection(db, 'leads'),
          where('companyId', '==', currentCompany.id),
          where('phone', '==', msgData.phone || '')
        );
        const leadSnap = await getDocs(leadQ);

        // Find or create default funnel and initial stage ("ENTRADA")
        const funnelQ = query(
          collection(db, 'funnels'), 
          where('companyId', '==', currentCompany.id), 
          where('isDefault', '==', true),
          limit(1)
        );
        let funnelSnap = await getDocs(funnelQ);
        
        if (funnelSnap.empty) {
          const anyFunnelQ = query(collection(db, 'funnels'), where('companyId', '==', currentCompany.id), limit(1));
          funnelSnap = await getDocs(anyFunnelQ);
        }
        
        let funnelId = '';
        let stageId = '';

        if (funnelSnap.empty) {
          // Create default funnel and initial stage if missing
          const fRef = await addDoc(collection(db, 'funnels'), {
            companyId: currentCompany.id,
            name: 'Funil Rafa Arts',
            isDefault: true,
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
          funnelId = fRef.id;

          const stRef = await addDoc(collection(db, 'funnelStages'), {
            funnelId,
            name: 'ENTRADA',
            order: 0,
            isInitial: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
          stageId = stRef.id;
        } else {
          funnelId = funnelSnap.docs[0].id;
          const stageQ = query(
            collection(db, 'funnelStages'), 
            where('funnelId', '==', funnelId), 
            where('isInitial', '==', true),
            limit(1)
          );
          let stageSnap = await getDocs(stageQ);
          if (stageSnap.empty) {
            const anyStageQ = query(collection(db, 'funnelStages'), where('funnelId', '==', funnelId), orderBy('order', 'asc'), limit(1));
            stageSnap = await getDocs(anyStageQ);
          }
          if (!stageSnap.empty) {
            stageId = stageSnap.docs[0].id;
          }
        }

        // If no lead exists, create it in the ENTRADA stage
        if (leadSnap.empty) {
          await addDoc(collection(db, 'leads'), {
            companyId: currentCompany.id,
            funnelId: funnelId || null,
            funnelStageId: stageId || null,
            fullName: msgData.senderName || 'Atendimento Automático',
            firstName: (msgData.senderName || 'Atendimento').split(' ')[0],
            lastName: (msgData.senderName || '').split(' ').slice(1).join(' ') || '',
            phone: msgData.phone || '',
            sourceType: msgData.channel || 'WhatsApp',
            lastMessageText: msgData.text || '',
            estimatedValue: 0,
            status: 'ENTRADA',
            waitingSince: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          console.log(`CRM Automation: New Lead created from channel [${msgData.channel}] into ENTRADA stage.`);
        } else {
          // Update existing lead and bring to ENTRADA stage if needed
          const leadDoc = leadSnap.docs[0];
          await updateDoc(doc(db, 'leads', leadDoc.id), {
            lastMessageText: msgData.text || '',
            sourceType: msgData.channel || leadDoc.data().sourceType || 'WhatsApp',
            waitingSince: new Date().toISOString(),
            status: 'ENTRADA',
            ...(stageId ? { funnelStageId: stageId } : {}),
            updatedAt: new Date().toISOString()
          });
          console.log(`CRM Automation: Existing Lead updated from channel [${msgData.channel}] in ENTRADA stage.`);
        }
      }
    });

    return () => unsubscribe();
  }, [currentCompany, user, lastMessageId]);

  // Login & Authentication State (Empty by default for manual typing)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('rpro_remembered_email'));

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rpro_remembered_email');
    if (rememberedEmail) setLoginEmail(rememberedEmail);
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
  // se o admin desconectou essa sessao remotamente — se sim, desloga na hora.
  const registerSession = async (uid: string, uname: string) => {
    pararEscutaDeSessao(); // desliga qualquer escutador de uma sessao anterior antes de criar um novo
    try {
      const sessionId = 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem('rpro_session_id', sessionId);

      let ip = 'desconhecido';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const j = await res.json();
        ip = j.ip || 'desconhecido';
      } catch (e) { /* segue sem IP se a consulta falhar */ }

      await setDoc(doc(db, 'sessions', sessionId), {
        userId: uid,
        userName: uname,
        ip,
        device: describeDevice(),
        userAgent: navigator.userAgent,
        loginAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        isRevoked: false,
      });

      // Escuta se essa sessao foi desconectada pelo admin
      const unsubSnapshot = onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
        // So desloga se essa sessao (sessionId) ainda for a sessao ativa no momento —
        // evita que um escutador antigo derrube uma sessao nova por engano
        if (sessionStorage.getItem('rpro_session_id') !== sessionId) return;
        if (snap.exists() && snap.data()?.isRevoked) {
          showAlert('Sua sessão foi desconectada pelo administrador.');
          handleLogout();
        }
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
        sessionStorage.setItem('rpro_logged_user_id', adminData.id);
        registerSession(adminData.id, adminData.name);
        if (rememberMe) {
          localStorage.setItem('rpro_remembered_user_id', adminData.id);
          localStorage.setItem('rpro_remembered_email', trimmedEmail);
        } else {
          localStorage.removeItem('rpro_remembered_user_id');
          localStorage.removeItem('rpro_remembered_email');
        }
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

      setUser(userData);
      cacheUserOffline(userData);
      sessionStorage.setItem('rpro_logged_user_id', userData.id);
      registerSession(userData.id, userData.name);
      if (rememberMe) {
        localStorage.setItem('rpro_remembered_user_id', userData.id);
        localStorage.setItem('rpro_remembered_email', trimmedEmail);
      } else {
        localStorage.removeItem('rpro_remembered_user_id');
        localStorage.removeItem('rpro_remembered_email');
      }
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
        if (comps.length > 0) {
          setCurrentCompany(prev => prev || comps[0]);
        }
      });

      // 2. Check saved session user (sessionStorage sempre; localStorage se "lembrar minha senha" foi marcado)
      const savedUserId = sessionStorage.getItem('rpro_logged_user_id') || localStorage.getItem('rpro_remembered_user_id');
      const targetUserId = simulatedUserId || savedUserId;

      if (targetUserId) {
        // Sem internet: usa direto os dados da ultima vez que logou online, sem tentar rede.
        // Isso permite continuar usando o sistema (com os dados de quando sincronizou por ultimo)
        // mesmo sem conexao, contanto que ja tenha logado com internet pelo menos uma vez antes.
        if (!navigator.onLine) {
          const cached = getCachedUser(targetUserId);
          if (cached) {
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
            setUser(uData);
            cacheUserOffline(uData);
            userUnsub = onSnapshot(userDocRef, (s) => {
              if (s.exists()) {
                const fresh = { id: s.id, ...s.data() } as AppUser;
                setUser(fresh);
                cacheUserOffline(fresh);
              }
            });
          } else if (targetUserId === 'admin-rafael') {
            const adminData: AppUser = {
              id: 'admin-rafael',
              name: 'Rafael Matos (ADM)',
              email: 'rafaelrtmatos@gmail.com',
              password: 'Geper3tp@',
              role: 'admin',
              isAdmin: true,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, adminData);
            setUser(adminData);
            cacheUserOffline(adminData);
          } else {
            // Nao achou no Firebase (nao e o admin master) — tenta no Supabase, onde vivem os usuarios comuns
            const { data: usuarioRow } = await supabase.from('usuarios').select('*').eq('id', targetUserId).maybeSingle();
            if (usuarioRow) {
              const uData = mapUsuarioRow(usuarioRow);
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
            } else {
              sessionStorage.removeItem('rpro_logged_user_id');
            }
          }
        } catch (e) {
          // Falhou por causa da rede (sem internet, instavel, etc) — tenta os dados salvos localmente
          // da ultima vez que logou online, em vez de simplesmente deslogar a pessoa.
          const cached = getCachedUser(targetUserId);
          if (cached) {
            setUser(cached);
          } else {
            sessionStorage.removeItem('rpro_logged_user_id');
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
    { id: 'contacts', label: 'Contatos', icon: Users },
    { id: 'clientes_espera', label: 'Clientes em Espera', icon: Clock },
    { id: 'production', label: 'Ordem de Serviço', icon: Layers },
    { id: 'comissoes', label: 'Comissões', icon: Percent },
    { id: 'settings', label: 'Opções', icon: Settings },
  ].filter(item => {
    // If user has specific allowedTabs, check it first (unless they are admin, who can always see Settings)
    if (user && user.allowedTabs && Array.isArray(user.allowedTabs)) {
      if (item.id === 'settings' && user.isAdmin) return true;
      return user.allowedTabs.includes(item.id);
    }

    // If admin, show everything
    if (user?.isAdmin) return true;
    
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
          <BrandLogo imageUrl={theme === 'light' ? (logoDarkUrl || logoLightUrl) : logoLightUrl} size="xl" widthPx={105} layout="stacked" />
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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050508] p-4 sm:p-6 relative overflow-y-auto select-none">
      {/* Background Red Glow & Diagonal Accents */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        {/* Top-left red glow */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-red-600/15 rounded-full blur-[140px]" />
        {/* Bottom-right red glow */}
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-red-700/15 rounded-full blur-[140px]" />
        
        {/* Decorative corner diagonal lines */}
        <div className="absolute top-0 left-0 w-80 h-80 opacity-20 bg-[linear-gradient(135deg,transparent_40%,#ff0033_50%,transparent_60%)]" />
        <div className="absolute bottom-0 right-0 w-80 h-80 opacity-20 bg-[linear-gradient(135deg,transparent_40%,#ff0033_50%,transparent_60%)]" />

        {/* Subtle dot pattern grids in corners */}
        <div className="absolute top-8 right-8 w-32 h-32 opacity-10 bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:12px_12px]" />
        <div className="absolute bottom-8 left-8 w-32 h-32 opacity-10 bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:12px_12px]" />
      </div>

      <div className="max-w-md w-full space-y-6 animate-in fade-in zoom-in-95 duration-500 relative z-10">
        {/* Header Badge & Title with Separated Rafa Arts Graphics Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="px-6 py-4 rounded-3xl bg-[#0c0c12]/90 border border-slate-800 shadow-2xl shadow-red-950/60 backdrop-blur-xl">
            {logosReady ? (
              <BrandLogo imageUrl={theme === 'light' ? (logoDarkUrl || logoLightUrl) : logoLightUrl} size="xl" widthPx={210} layout="stacked" />
            ) : (
              <div style={{ width: 210, height: 128 }} />
            )}
          </div>
          
          <p className="text-xs sm:text-sm font-semibold text-slate-300 tracking-wide max-w-sm">
            Acesso ao Sistema de Gestão
          </p>
        </div>

        {/* Login Form Card - e-mail e senha, sem lista de usuarios */}
        <form onSubmit={handlePasswordLogin} className="bg-[#0e0e13]/95 backdrop-blur-3xl p-6 sm:p-8 rounded-[28px] border border-white/10 shadow-2xl space-y-5">
          <div className="space-y-4">
            {/* E-mail Field */}
            <div>
              <label className="text-[11px] font-bold uppercase text-white tracking-wider mb-2 flex items-center gap-2 block">
                <Mail size={14} className="text-red-500" /> E-MAIL DE ACESSO
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Digite seu e-mail"
                  className="w-full bg-[#07070a] border border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl pl-11 pr-4 py-3.5 text-white font-medium focus:outline-none transition-all text-sm placeholder:text-white/50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-[11px] font-bold uppercase text-white tracking-wider mb-2 flex items-center gap-2 block">
                <Lock size={14} className="text-red-500" /> SENHA DE ACESSO
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full bg-[#07070a] border border-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl pl-11 pr-12 py-3.5 text-white font-medium focus:outline-none transition-all text-sm placeholder:text-white/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-red-500 transition-colors cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Lembrar minha senha */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-red-600 cursor-pointer"
              />
              <span className="text-xs font-semibold text-white/70">Lembrar minha senha</span>
            </label>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-600/50 text-white text-xs font-semibold flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle size={18} className="shrink-0 text-red-500 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer border-0 active:scale-[0.99] mt-2"
          >
            <Lock size={18} />
            {isSubmitting ? 'Autenticando...' : 'ENTRAR NO SISTEMA'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center space-y-1 pt-2">
          <p className="text-xs text-white font-bold flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} className="text-red-500 shrink-0" />
            © 2026 RAFA ARTS GRAPHICS
          </p>
          <p className="text-[10px] uppercase tracking-widest text-white font-semibold">
            SISTEMA DE GESTÃO RAFA ARTS GRAPHICS
          </p>
        </div>
      </div>
    </div>
  );

  if (companies.length === 0) return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050508] p-4">
      <div className="max-w-md w-full flex flex-col items-center gap-5 text-center bg-white/[0.03] border border-white/10 rounded-2xl p-8">
        {logosReady ? (
          <BrandLogo imageUrl={theme === 'light' ? (logoDarkUrl || logoLightUrl) : logoLightUrl} size="lg" layout="stacked" />
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
    pendingReceiptOpenId,
    setPendingReceiptOpenId,
    pendingHistoryClientFilter,
    setPendingHistoryClientFilter,
    pendingReceivablesFilter,
    setPendingReceivablesFilter,
    pendingGoToHistorico,
    setPendingGoToHistorico,
    pendingOpenContratoId,
    setPendingOpenContratoId,
    simulatedUserId,
    setSimulatedUserId,
    theme,
    setTheme,
    toggleTheme,
    logout: handleLogout
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app flex flex-col h-screen overflow-hidden relative">
        {/* Background Mesh */}
        <div className="fixed inset-0 z-[-1] mesh-gradient" />

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
                      setActiveTab(item.id as MainTab);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                  />
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 px-2 space-y-4">
                <div className="glass-card p-5 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-500 rounded-full opacity-20 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[2px] mb-2">SLA Hub Status</p>
                  <p className="text-sm font-bold text-white tracking-wide">Enterprise Pro 9.4</p>
                  <div className="mt-5 flex items-center justify-between">
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div className="w-3/4 h-full bg-primary-400 shadow-[0_0_10px_#4cc9f0] rounded-full" />
                    </div>
                  </div>
                </div>
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
          <div className={cn("flex-1 custom-scrollbar", activeTab === 'pos' ? "p-2 md:p-3 overflow-hidden" : "p-4 md:p-8 overflow-y-auto")}>
            <div className={cn(activeTab === 'pos' ? "max-w-full h-full" : "max-w-7xl mx-auto")}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className={activeTab === 'pos' ? "h-full" : undefined}
                >
                  {activeTab === 'dashboard' && <DashboardModule user={user} currentCompany={currentCompany} pendingOrders={pendingOrders} setActiveTab={setActiveTab} />}
                  {activeTab === 'crm' && <CRMModule currentCompany={currentCompany} user={user} />}
                  {activeTab === 'messages' && <MessagesModule currentCompany={currentCompany} user={user} />}
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
                  {activeTab === 'inventory' && <InventoryModule currentCompany={currentCompany} user={user} />}
                  {activeTab === 'services' && <ServicesModule currentCompany={currentCompany} />}
                  {activeTab === 'production' && <ProductionModule currentCompany={currentCompany} />}
                  {activeTab === 'comissoes' && (
                    <ModuleErrorBoundary label="Comissões">
                      <Suspense fallback={<div className="h-64 flex items-center justify-center text-white/40 text-sm">Carregando...</div>}>
                        <ComissoesEmbedded />
                      </Suspense>
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
    <NotifyHost />
    </AppContext.Provider>
  );
}

