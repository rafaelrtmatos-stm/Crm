/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  LayoutDashboard, 
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
  Moon
} from 'lucide-react';
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
  Timestamp
} from 'firebase/firestore';

import { 
  Company, 
  AppUser, 
  Lead,
  SaleOrder
} from './types';

type MainTab = 'dashboard' | 'crm' | 'messages' | 'pos' | 'contacts' | 'services' | 'inventory' | 'production' | 'settings';

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
  simulatedUserId: string | null;
  setSimulatedUserId: (id: string | null) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
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
  const { user, companies, currentCompany, setCurrentCompany, setIsSidebarOpen, theme, toggleTheme } = useApp();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCompanySelectOpen, setIsCompanySelectOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-white/5 backdrop-blur-xl border-b border-white/10 h-20 flex items-center justify-between px-8 mb-6 rounded-b-[32px] mx-4 sm:mx-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden p-3 text-white/70 hover:bg-white/10 rounded-xl"
        >
          <Menu size={20} />
        </button>
        
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
                  <p className="px-4 py-2 text-[10px] font-bold text-white/40 uppercase tracking-[2px]">Gestão RPro</p>
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
                    onClick={() => signOut(auth)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-rose-500/20 text-rose-400 transition-colors text-sm font-bold"
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
  SettingsModule
} from './components/Modules';

// --- MAIN APP ---

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<SaleOrder[]>([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [prefilledCustomer, setPrefilledCustomer] = useState<{ id?: string, name: string, phone: string } | null>(null);
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
            name: 'Funil RPro (Atendimento)',
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

  useEffect(() => {
    let companiesUnsub: (() => void) | null = null;
    let userUnsub: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (userUnsub) {
        userUnsub();
        userUnsub = null;
      }

      let userId = fbUser?.uid || 'mock-user-id';
      const activeUserId = simulatedUserId || userId;

      let defaultUserData: AppUser = {
        id: activeUserId,
        name: activeUserId === 'mock-user-id' ? 'Rafael Matos' : 'Usuário Simulado',
        email: activeUserId === 'mock-user-id' ? 'rafaelrtmatos@gmail.com' : 'simulado@rpro.com',
        role: activeUserId === 'mock-user-id' ? 'admin' : 'gerente',
        isAdmin: activeUserId === 'mock-user-id' || activeUserId === fbUser?.uid,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const userDocRef = doc(db, 'users', activeUserId);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, defaultUserData);
        setUser(defaultUserData);
      } else {
        setUser({ id: userDoc.id, ...userDoc.data() } as AppUser);
      }

      // Real-time listener for current user settings
      userUnsub = onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
          setUser({ id: snap.id, ...snap.data() } as AppUser);
        }
      });

      // Fetch Companies so the dashboard and tables still load real-time Firestore data
      const companiesQuery = query(collection(db, 'companies'), where('isActive', '==', true));
      if (!companiesUnsub) {
        companiesUnsub = onSnapshot(companiesQuery, (snapshot) => {
          const comps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Company);
          setCompanies(comps);
          if (comps.length > 0) {
            setCurrentCompany(prev => prev || comps[0]);
          }
        });
      }
      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (companiesUnsub) companiesUnsub();
      if (userUnsub) userUnsub();
    };
  }, [simulatedUserId]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'crm', label: 'Funil CRM', icon: Target },
    { id: 'messages', label: 'Mensagens', icon: MessageSquare },
    { id: 'pos', label: 'PDV Gráfica', icon: ShoppingBag },
    { id: 'contacts', label: 'Contatos', icon: Users },
    { id: 'inventory', label: 'Estoque', icon: Package },
    { id: 'services', label: 'Serviços', icon: Wrench },
    { id: 'production', label: 'Produção', icon: Layers },
    { id: 'settings', label: 'Opções', icon: Settings },
  ].filter(item => {
    // If user has specific allowedTabs, check it first (unless they are admin, who can always see Settings)
    if (user && user.allowedTabs && Array.isArray(user.allowedTabs)) {
      if (item.id === 'settings' && user.isAdmin) return true;
      return user.allowedTabs.includes(item.id);
    }

    // If admin, show everything
    if (user?.isAdmin) return true;
    
    // Always show dashboard and settings
    if (['dashboard', 'settings'].includes(item.id)) return true;
    
    // Otherwise check company active modules
    return currentCompany?.activeModules?.includes(item.id) ?? true;
  });

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500 animate-pulse">Iniciando RPro System...</p>
      </div>
    </div>
  );

  if (!user) return (
    <div className="h-screen w-full flex items-center justify-center bg-white p-6">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col items-center">
          {currentCompany?.logoUrl ? (
            <div className="w-24 h-24 mb-8">
               <img src={currentCompany.logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-primary-600 rounded-[2.5rem] rotate-12 flex items-center justify-center shadow-2xl shadow-primary-200 mb-8">
              <Building2 size={40} className="text-white -rotate-12" />
            </div>
          )}
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">RPro <span className="text-primary-600">System</span></h1>
          <p className="text-slate-500 mt-3 text-lg">A plataforma mestre de gestão para o seu negócio.</p>
        </div>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Entrar com Google
        </button>

        <p className="text-xs text-slate-400">© 2026 RPro Gestão Inteligente. Todos os direitos reservados.</p>
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
    simulatedUserId,
    setSimulatedUserId,
    theme,
    setTheme,
    toggleTheme
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="flex flex-col h-screen overflow-hidden relative">
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
              <div className="flex items-center justify-between mb-12 px-2">
                <div className="flex items-center gap-4 group">
                  {currentCompany?.logoUrl ? (
                    <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center p-1 bg-white shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:rotate-6 transition-transform duration-500">
                       <img src={currentCompany.logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(76,201,240,0.4)] group-hover:rotate-12 transition-transform duration-500">
                      <Building2 size={24} className="text-[#0f172a]" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-black text-white leading-none tracking-tight">RPro</h2>
                    <p className="text-[10px] font-black text-primary-300 uppercase tracking-[3px] mt-1">Symmetry</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden p-3 text-white/40 hover:text-white transition-colors"
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
          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-7xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  {activeTab === 'dashboard' && <DashboardModule user={user} currentCompany={currentCompany} pendingOrders={pendingOrders} setActiveTab={setActiveTab} />}
                  {activeTab === 'crm' && <CRMModule currentCompany={currentCompany} user={user} />}
                  {activeTab === 'messages' && <MessagesModule currentCompany={currentCompany} user={user} />}
                  {activeTab === 'pos' && <POSModule currentCompany={currentCompany} addPendingOrder={addPendingOrder} />}
                  {activeTab === 'contacts' && <ContactsModule currentCompany={currentCompany} />}
                  {activeTab === 'inventory' && <InventoryModule currentCompany={currentCompany} />}
                  {activeTab === 'services' && <ServicesModule currentCompany={currentCompany} />}
                  {activeTab === 'production' && <ProductionModule currentCompany={currentCompany} />}
                  {activeTab === 'settings' && <SettingsModule currentCompany={currentCompany} user={user} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </div>
    </AppContext.Provider>
  );
}

