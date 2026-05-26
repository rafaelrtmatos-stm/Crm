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
  Package
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

type MainTab = 'dashboard' | 'crm' | 'messages' | 'meta-ads' | 'pos' | 'contacts' | 'services' | 'inventory' | 'production' | 'settings';

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
  onClick 
}: { 
  icon: any; 
  label: string; 
  tab: MainTab; 
  active: boolean; 
  onClick: () => void;
  key?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group text-sm font-medium border border-transparent",
      active 
        ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30 border-white/20" 
        : "text-white/60 hover:bg-white/10 hover:text-white"
    )}
  >
    <Icon size={20} className={cn("transition-transform group-hover:scale-110", active ? "text-white" : "text-white/60 group-hover:text-primary-300")} />
    <span className="truncate">{label}</span>
  </button>
);

const Navbar = () => {
  const { user, companies, currentCompany, setCurrentCompany, setIsSidebarOpen } = useApp();
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
  MetaAdsModule,
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

  const addPendingOrder = (order: SaleOrder) => {
    setPendingOrders(prev => [order, ...prev]);
  };

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

        // If no lead exists, create it in the ENTRADA stage
        if (leadSnap.empty) {
          // Find the default funnel or just any funnel if no default exists
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
          
          if (!funnelSnap.empty) {
            const funnelId = funnelSnap.docs[0].id;
            const stageQ = query(
              collection(db, 'funnelStages'), 
              where('funnelId', '==', funnelId), 
              where('isInitial', '==', true),
              limit(1)
            );
            const stageSnap = await getDocs(stageQ);
            
            if (!stageSnap.empty) {
              const stageId = stageSnap.docs[0].id;
              
              await addDoc(collection(db, 'leads'), {
                companyId: currentCompany.id,
                funnelId,
                funnelStageId: stageId,
                fullName: msgData.senderName || 'Atendimento Automático',
                phone: msgData.phone || '',
                sourceType: msgData.channel || 'Mensagens',
                lastMessageText: msgData.text || '',
                estimatedValue: 0,
                status: 'active',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
              });
              console.log('CRM Automation: New Lead created from incoming message.');
            }
          }
        } else {
          // Update existing lead
          const leadId = leadSnap.docs[0].id;
          await updateDoc(doc(db, 'leads', leadId), {
            lastMessageText: msgData.text || '',
            updatedAt: Timestamp.now()
          });
          console.log('CRM Automation: Existing Lead updated with last message.');
        }
      }
    });

    return () => unsubscribe();
  }, [currentCompany, user, lastMessageId]);

  useEffect(() => {
    let companiesUnsub: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        let userData: AppUser;
        
        if (!userDoc.exists()) {
          userData = {
            id: fbUser.uid,
            name: fbUser.displayName || 'Usuário',
            email: fbUser.email || '',
            role: 'gerente',
            isAdmin: fbUser.email === 'rafaelrtmatos@gmail.com',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, userData);
        } else {
          userData = { id: userDoc.id, ...userDoc.data() } as AppUser;
        }
        
        setUser(userData);

        // Fetch Companies
        const companiesQuery = query(collection(db, 'companies'), where('isActive', '==', true));
        companiesUnsub = onSnapshot(companiesQuery, (snapshot) => {
          const comps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Company);
          setCompanies(comps);
          if (comps.length > 0 && !currentCompany) {
            setCurrentCompany(comps[0]);
          }
        });
      } else {
        setUser(null);
        setCompanies([]);
        setCurrentCompany(null);
        if (companiesUnsub) companiesUnsub();
      }
      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (companiesUnsub) companiesUnsub();
    };
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'crm', label: 'Funil CRM', icon: Target },
    { id: 'messages', label: 'Mensagens', icon: MessageSquare },
    { id: 'meta-ads', label: 'Meta Ads', icon: Briefcase },
    { id: 'pos', label: 'PDV Gráfica', icon: ShoppingBag },
    { id: 'contacts', label: 'Contatos', icon: Users },
    { id: 'inventory', label: 'Estoque', icon: Package },
    { id: 'services', label: 'Serviços', icon: Wrench },
    { id: 'production', label: 'Produção', icon: Layers },
    { id: 'settings', label: 'Opções', icon: Settings },
  ].filter(item => {
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
    setIsRegisterOpen
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="flex h-screen overflow-hidden relative">
        {/* Background Mesh */}
        <div className="fixed inset-0 z-[-1] mesh-gradient" />

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
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                >
                  {activeTab === 'dashboard' && <DashboardModule user={user} currentCompany={currentCompany} pendingOrders={pendingOrders} setActiveTab={setActiveTab} />}
                  {activeTab === 'crm' && <CRMModule currentCompany={currentCompany} user={user} />}
                  {activeTab === 'messages' && <MessagesModule currentCompany={currentCompany} user={user} />}
                  {activeTab === 'meta-ads' && <MetaAdsModule currentCompany={currentCompany} />}
                  {activeTab === 'pos' && <POSModule currentCompany={currentCompany} addPendingOrder={addPendingOrder} />}
                  {activeTab === 'contacts' && <ContactsModule currentCompany={currentCompany} />}
                  {activeTab === 'inventory' && <InventoryModule currentCompany={currentCompany} />}
                  {activeTab === 'services' && <ServicesModule currentCompany={currentCompany} />}
                  {activeTab === 'production' && <ProductionModule currentCompany={currentCompany} />}
                  {activeTab === 'settings' && <SettingsModule currentCompany={currentCompany} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </AppContext.Provider>
  );
}

