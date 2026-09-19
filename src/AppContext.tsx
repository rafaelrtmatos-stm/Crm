import { createContext, useContext } from 'react';
import { Company, AppUser, SaleOrder } from './types';
import type { CrmNotification, CrmNotificationThread } from './lib/crmNotifications';

export type MainTab = 
  | 'dashboard' 
  | 'crm' 
  | 'messages' 
  | 'pos' 
  | 'contacts' 
  | 'services' 
  | 'production' 
  | 'settings' 
  | 'comissoes' 
  | 'robozinho_rafa'
  | 'clientes_espera'
  | 'inventory';

export interface AppContextType {
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
  prefilledCustomer: { id?: string; name: string; phone: string } | null;
  setPrefilledCustomer: (customer: { id?: string; name: string; phone: string } | null) => void;
  pendingWhatsAppShare: { leadId: string; prefillMessage: string } | null;
  setPendingWhatsAppShare: (v: { leadId: string; prefillMessage: string } | null) => void;
  openWhatsAppChat: (phone: string, name: string, prefillMessage?: string) => Promise<void>;
  pendingReceiptOpenId: string | null;
  setPendingReceiptOpenId: (id: string | null) => void;
  pendingHistoryClientFilter: { clienteId: string; clienteName: string } | null;
  setPendingHistoryClientFilter: (v: { clienteId: string; clienteName: string } | null) => void;
  pendingHistoryProductSearch: string | null;
  setPendingHistoryProductSearch: (v: string | null) => void;
  pendingReceivablesFilter: boolean;
  setPendingReceivablesFilter: (v: boolean) => void;
  pendingGoToHistorico: boolean;
  setPendingGoToHistorico: (v: boolean) => void;
  pendingGoToServicos: boolean;
  setPendingGoToServicos: (v: boolean) => void;
  pendingOpenContratoId: string | null;
  setPendingOpenContratoId: (id: string | null) => void;
  pendingOpenOrcamentoId: string | null;
  setPendingOpenOrcamentoId: (id: string | null) => void;
  pendingOpenLeadId: string | null;
  setPendingOpenLeadId: (id: string | null) => void;
  // Notificações pendentes de mensagens de clientes (ver lib/crmNotifications.ts).
  // Abrir uma notificação NÃO a resolve; só resolveCrmNotificationThread resolve.
  crmNotifications: CrmNotification[];
  openCrmNotification: (n: CrmNotification) => void;
  resolveCrmNotificationThread: (thread: CrmNotificationThread) => Promise<void>;
  // Alvo pedido por uma notificação: a aba Mensagens abre a conversa e posiciona na mensagem.
  messageFocus: { phone: string; leadId?: string; messageId: string; nonce: number } | null;
  clearMessageFocus: () => void;
  simulatedUserId: string | null;
  setSimulatedUserId: (id: string | null) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  logout: () => void;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
