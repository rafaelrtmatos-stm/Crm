import { AppContext } from '../App';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ContractApprovalModule } from './ContractApprovalModule';
import { 
  TrendingUp, 
  LayoutGrid,
  Square,
  Clock, 
  MessageSquare, 
  Plus, 
  Search, 
  Filter, 
  LayoutDashboard, 
  ShoppingBag, 
  Home, 
  Users, 
  FileText, 
  Wrench, 
  Building2, 
  Settings,
  ArrowRight,
  Briefcase,
  Layers,
  Zap,
  Bot,
  Globe,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock3,
  BarChart2,
  PieChart as PieChartIcon,
  HardDrive,
  RefreshCw,
  Calendar,
  QrCode,
  CreditCard,
  UserPlus,
  ArrowLeft,
  Calculator,
  Smartphone,
  Banknote,
  Check,
  Package,
  PlusCircle,
  BarChart3,
  Printer,
  X,
  ChevronRight,
  Mic,
  Image as ImageIcon,
  Video,
  File,
  MapPin,
  Phone,
  StickyNote,
  ListTodo,
  FileJson,
  Link,
  Send,
  MoreHorizontal,
  Paperclip,
  Sparkles,
  Sun,
  Moon,
  Trash2,
  Pencil,
  Upload,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  ListFilter,
  Link2,
  Percent,
  Wifi,
  FileSpreadsheet,
  ClipboardList,
  CalendarClock,
  Share2,
  Star,
  Tag,
  AtSign,
  History,
  FileAudio,
  GripVertical,
  Maximize2,
  Minimize2,
  Move,
  Palette,
  Layout,
  Activity,
  UserCheck,
  UserX,
  Target,
  Trophy,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  List,
  Table as TableIcon,
  Eye,
  EyeOff,
  Copy,
  Trash,
  Settings2,
  ChevronDown,
  ChevronUp,
  Download,
  Share,
  CalendarDays,
  Timer,
  Box,
  Save,
  LogOut,
  PlusSquare
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Company, 
  AppUser, 
  Lead, 
  Funnel, 
  FunnelStage, 
  Product, 
  SaleOrder, 
  SaleOrderItem,
  PaymentEntry,
  Orcamento,
  OrcamentoPagamento,
  InventoryItem,
  PrintingService,
  DashboardWidget,
  DashboardLayout,
  WidgetType
} from '../types';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  SectionHeader, 
  Button, 
  GlassCard, 
  Badge, 
  DataTable, 
  Input, 
  Modal, 
  Drawer,
  ChartErrorBoundary,
  cn 
} from './SharedUI';
import { collection, query, where, onSnapshot, orderBy, Timestamp, addDoc, doc, updateDoc, getDocs, setDoc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { supabase } from '../supabase';
import { buildPixPayload } from '../lib/pix';
import { renderReceiptCanvas, downloadCanvasAsPng, downloadCanvasAsPdf } from '../lib/receipt';
import { renderOrcamentoCanvas } from '../lib/orcamentoDoc';
import { exportClientesXlsx, parseClientesXlsx, exportProdutosXlsx, parseProdutosXlsx, exportVendasXlsx, parseVendasXlsx } from '../lib/spreadsheet';
import { format } from 'date-fns';

// Formata uma data com fallback seguro — evita "RangeError: Invalid time value"
// quando vendas importadas de planilha tem um createdAt malformado ou vazio.
function safeFormat(value: any, fmt: string, fallback: string = '—'): string {
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : format(d, fmt);
}

// Mapeia uma linha da tabela 'usuarios' (Supabase) pro formato AppUser.
// Usuarios comuns vivem no Supabase; so o admin master continua no Firebase.
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
    allowedActions: Array.isArray(row.allowed_actions) ? row.allowed_actions : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as AppUser;
}

// Nome de arquivo padronizado pra recibos/orcamentos baixados: NomeDoCliente_dd-MM-yyyy
function buildFileName(prefix: string, customerName: string | undefined, dateValue: any, ext: string): string {
  const safeName = (customerName || 'Cliente')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'Cliente';
  const dateStr = safeFormat(dateValue || new Date().toISOString(), 'dd-MM-yyyy', format(new Date(), 'dd-MM-yyyy'));
  return `${prefix}_${safeName}_${dateStr}.${ext}`;
}

import { 
  calculateSLA, 
  extractTracking, 
  canAccessModule 
} from '../lib/businessLogic';

// --- DASHBOARD ---
const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: 'revenue-main',
    title: 'Faturamento Consolidado',
    subtitle: 'Visão Geral do Ecossistema',
    type: 'line_chart',
    icon: 'TrendingUp',
    size: 'lg',
    gridPos: { x: 0, y: 0, w: 2, h: 2 },
    dataSource: { collection: 'saleOrders', filters: {}, calculation: 'sum' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'list-servicos',
    title: 'Serviços Recentes',
    subtitle: 'Acompanhamento de Atividades',
    type: 'list',
    icon: 'Wrench',
    size: 'md',
    gridPos: { x: 2, y: 0, w: 1, h: 2 },
    dataSource: { collection: 'services', filters: { status: 'active' } },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ordem-servicos',
    title: 'Notas Abertas (O.S.)',
    subtitle: 'Gestão de Produção Ativa',
    type: 'list',
    icon: 'ListTodo',
    size: 'md',
    gridPos: { x: 0, y: 2, w: 1, h: 2 },
    dataSource: { collection: 'services', filters: { status: 'pendente' } },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'list-pendentes-financeiro',
    title: 'Pendentes (Entradas)',
    subtitle: 'Saldo a Receber / Entradas Pagas',
    type: 'list',
    icon: 'Clock',
    size: 'lg',
    gridPos: { x: 1, y: 2, w: 2, h: 2 },
    dataSource: { collection: 'saleOrders', filters: { financialStatus: 'partial' } },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// Converte uma linha da tabela "vendas" (Supabase) para o formato SaleOrder usado no app
const mapVendaRow = (row: any): SaleOrder => ({
  id: row.id,
  companyId: row.company_id,
  customerId: row.cliente_id,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  items: row.items || [],
  total: Number(row.total) || 0,
  downPayment: row.down_payment !== null ? Number(row.down_payment) : undefined,
  receivedValue: row.received_value !== null ? Number(row.received_value) : undefined,
  paymentMethod: row.payment_method,
  status: row.status,
  createdAt: row.created_at,
  scheduledFor: row.scheduled_for || undefined,
  deletedAt: row.deleted_at || undefined,
  observacoes: row.observacoes || undefined,
  serviceStatus: row.service_status || 'pedido_recebido',
  statusHistory: Array.isArray(row.status_history) ? row.status_history : [],
  responsavel: row.responsavel || undefined,
} as SaleOrder);

const mapOrcamentoRow = (row: any): Orcamento => ({
  id: row.id,
  numero: row.numero,
  clienteId: row.cliente_id || undefined,
  customerName: row.customer_name || undefined,
  cpfCnpj: row.cpf_cnpj || undefined,
  phone: row.phone || undefined,
  address: row.address || undefined,
  responsavel: row.responsavel || undefined,
  items: row.items || [],
  desconto: Number(row.desconto) || 0,
  total: Number(row.total) || 0,
  observacoes: row.observacoes || undefined,
  prazoProducao: row.prazo_producao || undefined,
  prazoDias: row.prazo_dias !== null ? Number(row.prazo_dias) : undefined,
  prazoTipo: row.prazo_tipo || 'uteis',
  prazoGatilho: row.prazo_gatilho || 'aprovacao',
  prazoDataPrevista: row.prazo_data_prevista || undefined,
  formasPagamento: Array.isArray(row.formas_pagamento) ? row.formas_pagamento : [],
  politicaPagamento: row.politica_pagamento || 'entrada_restante_entrega',
  entradaObrigatoria: !!row.entrada_obrigatoria,
  pagamentoPosteriorAutorizado: !!row.pagamento_posterior_autorizado,
  pagamentoPosteriorData: row.pagamento_posterior_data || undefined,
  pagamentoPosteriorDias: row.pagamento_posterior_dias !== null ? Number(row.pagamento_posterior_dias) : undefined,
  pagamentoPosteriorCondicao: row.pagamento_posterior_condicao || undefined,
  pagamentoPosteriorResponsavel: row.pagamento_posterior_responsavel || undefined,
  telefoneAlternativo: row.telefone_alternativo || undefined,
  multaPercentual: row.multa_percentual !== null ? Number(row.multa_percentual) : 2,
  jurosModo: row.juros_modo || 'mensal',
  jurosPercentual: row.juros_percentual !== null ? Number(row.juros_percentual) : 1,
  diasTolerancia: row.dias_tolerancia !== null ? Number(row.dias_tolerancia) : 0,
  prazoPagamentoTexto: row.prazo_pagamento_texto || undefined,
  condicaoEntregaTexto: row.condicao_entrega_texto || undefined,
  formaPagamentoTexto: row.forma_pagamento_texto || undefined,
  multaJurosTexto: row.multa_juros_texto || undefined,
  garantiaTexto: row.garantia_texto || undefined,
  politicaCancelamentoTexto: row.politica_cancelamento_texto || undefined,
  entradaPercentual: row.entrada_percentual !== null ? Number(row.entrada_percentual) : undefined,
  entradaValor: row.entrada_valor !== null ? Number(row.entrada_valor) : undefined,
  validade: row.validade || undefined,
  status: row.status,
  vendaId: row.venda_id || undefined,
  aprovadoEm: row.aprovado_em || undefined,
  aprovadoPor: row.aprovado_por || undefined,
  createdAt: row.created_at,
});

export const DashboardModule = ({ user, currentCompany, companies = [], pendingOrders = [], setActiveTab }: { user: AppUser | null, currentCompany: Company | null, companies?: Company[], pendingOrders?: SaleOrder[], setActiveTab?: (tab: any) => void }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);
  const [selectedWidget, setSelectedWidget] = useState<DashboardWidget | null>(null);
  const [period, setPeriod] = useState('Semana');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [revenueDataPoint, setRevenueDataPoint] = useState<any>(null);
   const [realSales, setRealSales] = useState<SaleOrder[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [realEstateSales, setRealEstateSales] = useState<any[]>([]);
  const { setCurrentCompany, setPrefilledCustomer } = React.useContext(AppContext)!;
  const [isLotModalOpen, setIsLotModalOpen] = useState(false);
  const [settleModalOrder, setSettleModalOrder] = useState<SaleOrder | null>(null);
  const [settleMethod, setSettleMethod] = useState<'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito'>('pix');
  const [lotForm, setLotForm] = useState({
    lotName: '',
    quadra: '',
    value: '',
    customerName: '',
    customerPhone: '',
    downPayment: '',
    responsibleName: ''
  });

  const handleSettleBalanceInDashboard = async (order: SaleOrder) => {
    if (!currentCompany || !order) return;
    const balanceToSettle = order.total - (order.downPayment || 0);
    if (balanceToSettle <= 0) return;

    try {
      try {
        const audio = new Audio('/sounds/cash-register.mp3');
        audio.play().catch(() => {});
      } catch (e) {}

      const { error: settleErr } = await supabase.from('vendas').update({
        status: 'completed',
        down_payment: order.total,
        settled_at: new Date().toISOString(),
        settled_payment_method: settleMethod,
      }).eq('id', order.id);
      if (settleErr) throw settleErr;

      const qSvc = query(
        collection(db, 'services'),
        where('companyId', '==', currentCompany.id),
        where('orderId', '==', order.id),
        limit(1)
      );
      const snapSvc = await getDocs(qSvc);
      if (!snapSvc.empty) {
        await updateDoc(doc(db, 'services', snapSvc.docs[0].id), {
          status: 'concluido',
          balance: 0,
          updatedAt: Timestamp.now()
        });
      }

      alert(`Saldo de R$ ${balanceToSettle.toFixed(2).replace('.', ',')} quitado com sucesso!\nA venda/serviço foi totalmente quitada.`);
      setSettleModalOrder(null);
    } catch (err) {
      console.error('Erro ao quitar saldo:', err);
      alert('Erro ao quitar saldo do pedido.');
    }
  };

  useEffect(() => {
    if (!currentCompany) return;
    const qSvc = query(collection(db, 'services'), where('companyId', '==', currentCompany.id), orderBy('createdAt', 'desc'));
    const qRealEstate = query(collection(db, 'serviceContracts'), where('companyId', '==', currentCompany.id), orderBy('createdAt', 'desc'));
    
    const unsubSvc = onSnapshot(qSvc, (snap) => setServices(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubRealEstate = onSnapshot(qRealEstate, (snap) => setRealEstateSales(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const loadSales = async () => {
      const { data } = await supabase.from('vendas').select('*').is('deleted_at', null).order('created_at', { ascending: false });
      setRealSales((data || []).map(mapVendaRow));
    };
    loadSales();
    const salesChannel = supabase.channel('dashboard-vendas').on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, loadSales).subscribe();

    const loadInventory = async () => {
      const { data } = await supabase.from('produtos').select('*');
      setInventory((data || []).map((row: any) => ({
        id: row.id, name: row.name, code: row.code, category: row.category, unit: row.unit,
        salePrice: row.sale_price, costPrice: row.cost_price, currentStock: row.current_stock,
        minStock: row.min_stock, isService: row.is_service, isActive: row.is_active,
      })));
    };
    loadInventory();
    const invChannel = supabase.channel('dashboard-produtos').on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, loadInventory).subscribe();
    
    return () => { unsubSvc(); unsubRealEstate(); supabase.removeChannel(salesChannel); supabase.removeChannel(invChannel); };
  }, [currentCompany]);

  const getFilteredOrders = () => {
    const now = new Date();
    return realSales.filter(order => {
      const orderDate = new Date(order.createdAt);
      if (period === 'Hoje') return orderDate.toDateString() === now.toDateString();
      if (period === 'Ontem') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return orderDate.toDateString() === yesterday.toDateString();
      }
      const days = period === 'Semana' ? 7 : period === '30 dias' ? 30 : 0;
      if (days > 0) {
        const past = new Date(now);
        past.setDate(now.getDate() - days);
        return orderDate >= past;
      }
      if (period === 'Personalizado' && customRange.start && customRange.end) {
        return orderDate >= new Date(customRange.start) && orderDate <= new Date(customRange.end);
      }
      return true;
    });
  };

  const filteredOrders = getFilteredOrders();
  const totalRevenue = filteredOrders.reduce((acc, o) => {
    if (o.status === 'pending') {
      return acc + (o.downPayment || 0);
    }
    return acc + (o.total || 0);
  }, 0);

  const totalCost = filteredOrders.reduce((acc, o) => {
    let orderCost = 0;
    o.items?.forEach(item => {
      const invItem = inventory.find(i => i.id === item.productId || i.name?.toLowerCase() === item.name?.toLowerCase());
      let unitCost = 0;
      if (invItem && typeof invItem.costPrice === 'number') {
        unitCost = invItem.costPrice;
      } else {
        unitCost = (item.price || 0) * 0.35;
      }
      const itemCost = item.area ? unitCost * item.area * item.quantity : unitCost * item.quantity;
      orderCost += itemCost;
    });

    if (o.status === 'pending' && o.total > 0) {
      const scale = (o.downPayment || 0) / o.total;
      orderCost = orderCost * scale;
    }
    return acc + orderCost;
  }, 0);

  const netProfit = Math.max(0, totalRevenue - totalCost);
  const avgMarkup = totalCost > 0 ? (totalRevenue / totalCost) : 3.1;
  const fixedCosts = 3800;
  const contributionMargin = totalRevenue > 0 ? (netProfit / totalRevenue) : 0.65;
  const breakevenPoint = contributionMargin > 0 ? (fixedCosts / contributionMargin) : fixedCosts / 0.65;

  const totalSalesCount = filteredOrders.length;
  const pendingEntries = realSales.filter(o => o.status === 'pending');
  const pendingValue = pendingEntries.reduce((acc, o) => acc + ((o.total || 0) - (o.downPayment || 0)), 0);
  const totalRealEstateSalesCount = realEstateSales.length;
  const totalRealEstateSalesValue = realEstateSales.reduce((acc, s) => acc + (s.value || 0), 0);

  const chartData = useMemo(() => {
    const groups: Record<string, any> = {};
    const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime());
    filteredOrders.forEach(o => {
      const dateObj = new Date(o.createdAt);
      if (!isValidDate(dateObj)) return;
      const day = format(dateObj, 'dd/MM');
      if (!groups[day]) groups[day] = { day, total: 0, sales: 0, svcs: 0, entries: 0 };
      const val = o.status === 'pending' ? (o.downPayment || 0) : (o.total || 0);
      groups[day].total += val;
      groups[day].sales += 1;
      if (o.status === 'pending') groups[day].entries += 1;
    });
    services.forEach(s => {
      const date = s.createdAt instanceof Timestamp ? s.createdAt.toDate() : new Date(s.createdAt);
      if (!isValidDate(date)) return;
      const day = format(date, 'dd/MM');
      if (groups[day]) groups[day].svcs += 1;
      else groups[day] = { day, total: 0, sales: 0, svcs: 1, entries: 0 };
    });
    return Object.values(groups).sort((a, b) => a.day.localeCompare(b.day));
  }, [filteredOrders, services]);
  const IconMap: Record<string, any> = {
    TrendingUp, Target, Clock, MessageSquare, ShoppingBag, Users, FileText, BarChart2, PieChartIcon, Trophy, Activity, Timer, CalendarDays, Wrench, Home
  };

  const addWidget = (type: WidgetType) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      title: 'Novo Widget',
      type,
      size: 'md',
      gridPos: { x: 0, y: 0, w: 1, h: 1 },
      dataSource: { collection: 'leads', calculation: 'count', filters: {} },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWidgets([...widgets, newWidget]);
    setSelectedWidget(newWidget);
    setIsSidebarOpen(true);
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
    if (selectedWidget?.id === id) setSelectedWidget(null);
  };

  const updateWidget = (updates: Partial<DashboardWidget>) => {
    if (!selectedWidget) return;
    const updated = { ...selectedWidget, ...updates };
    setWidgets(widgets.map(w => w.id === selectedWidget.id ? updated : w));
    setSelectedWidget(updated);
  };

  const goToReports = (periodType: string) => {
    setIsRevenueModalOpen(false);
    // Redirecting to POS for sales history since documents/reports is removed
    setActiveTab('pos');
  };

  const handleSaveLotSale = async () => {
    if(!lotForm.lotName || !lotForm.value || !lotForm.customerName || !currentCompany) return;
    try {
      await addDoc(collection(db, 'realEstateSales'), {
        companyId: currentCompany.id,
        lotName: lotForm.lotName,
        quadra: lotForm.quadra || 'Q1',
        value: Number(lotForm.value),
        customerName: lotForm.customerName,
        customerPhone: lotForm.customerPhone || '',
        downPayment: Number(lotForm.downPayment || 0),
        status: 'completed',
        responsibleName: lotForm.responsibleName || 'Corretor Fernando',
        createdAt: new Date().toISOString()
      });
      // Reset form
      setLotForm({
        lotName: '',
        quadra: '',
        value: '',
        customerName: '',
        customerPhone: '',
        downPayment: '',
        responsibleName: ''
      });
      setIsLotModalOpen(false);
    } catch(err) {
      console.error('Falha ao salvar lote:', err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 relative min-h-screen pb-20">
      <SectionHeader 
        title={`Dashboard Rafa Arts Graphics`} 
        subtitle={`Gestão Inteligente & Produtividade`} 
        actions={
          <div className="flex flex-wrap gap-4 items-center">
            {/* Company Selector */}
            {companies.length > 0 && (
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 items-center gap-2 pr-4">
                 <div className="p-2 bg-primary-500/10 text-primary-300 rounded-xl">
                    <Building2 size={16} />
                 </div>
                 <select 
                   value={currentCompany?.id}
                   onChange={(e) => {
                     const comp = companies.find(c => c.id === e.target.value);
                     if (comp) setCurrentCompany(comp);
                   }}
                   className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer"
                 >
                   {companies.map(c => (
                     <option key={c.id} value={c.id} className="bg-slate-900 text-white font-bold">{c.name}</option>
                   ))}
                 </select>
              </div>
            )}

            <div className="flex flex-col gap-2 items-end">
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                {['Hoje', 'Ontem', 'Semana', '30 dias', 'Personalizado'].map(p => (
                  <button 
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                      period === p ? "bg-primary-500 text-slate-900 shadow-lg" : "text-white/40 hover:text-white"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {period === 'Personalizado' && (
                <div className="flex gap-2 items-center bg-white/5 p-2 rounded-xl border border-white/5 animate-in slide-in-from-top-2">
                   <input 
                     type="date" 
                     className="bg-transparent text-[9px] font-bold text-white outline-none" 
                     value={customRange.start}
                     onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                   />
                   <span className="text-[9px] text-white/20">até</span>
                   <input 
                     type="date" 
                     className="bg-transparent text-[9px] font-bold text-white outline-none" 
                     value={customRange.end}
                     onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                   />
                </div>
              )}
            </div>
          </div>
        } 
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Faturamento', val: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, diff: 'Hoje/Período', color: 'emerald', action: () => setIsRevenueModalOpen(true) },
          { label: 'Lucro Líquido', val: `R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, diff: `Margem: ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(0) : '65'}%`, color: 'emerald', action: () => setIsRevenueModalOpen(true) },
          { label: 'Markup Médio', val: `${avgMarkup.toFixed(2).replace('.', ',')}x`, diff: 'Faturamento/Custo', color: 'primary', action: () => setActiveTab?.('inventory') },
          { label: 'Pto Equilíbrio', val: `R$ ${breakevenPoint.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, diff: `${Math.min(100, Math.round((totalRevenue / breakevenPoint) * 100))}% Reatido`, color: 'purple', action: () => setIsRevenueModalOpen(true) },
          { label: 'A Receber', val: `R$ ${pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, diff: 'Balancete Aberto', color: 'rose', action: () => setActiveTab?.('pos') },
          { label: 'Ordem de Serviço', val: services.length.toString(), diff: 'Ativas no PDV', color: 'amber', action: () => setActiveTab?.('services') }
        ].map((item, i) => (
          <GlassCard 
            key={i} 
            onClick={item.action}
            className="p-4 border-white/5 flex flex-col justify-center transition-all cursor-pointer hover:border-primary-500/30 group relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 group-hover:bg-primary-500/10 transition-all" />
             <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">{item.label}</p>
             <div className="flex items-end justify-between">
                <h5 className="text-sm font-black text-white">{item.val}</h5>
                <span className={cn("text-[8px] font-bold", item.color === 'emerald' ? 'text-emerald-400' : 'text-primary-300')}>
                  {item.diff}
                </span>
             </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard className="lg:col-span-2 p-8 border-white/5 bg-white/[0.02]">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Análise de Performance</h3>
                 <p className="text-xs text-white/30 font-bold tracking-widest uppercase">Evolução do Faturamento por Período</p>
              </div>
              <Button variant="ghost" icon={Maximize2} onClick={() => setIsRevenueModalOpen(true)} />
           </div>
           
           <div className="h-[350px] w-full">
              <ChartErrorBoundary>
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart 
                   data={chartData.length > 0 ? chartData : [
                     { day: 'Seg', total: 400 }, { day: 'Ter', total: 600 }, { day: 'Qua', total: 300 }
                   ]}
                   onClick={(data: any) => {
                      if (data?.activePayload) {
                         setRevenueDataPoint(data.activePayload[0].payload);
                         setIsRevenueModalOpen(true);
                      }
                   }}
                 >
                    <defs>
                       <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4cc9f0" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4cc9f0" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontWeight: 800 }} />
                    <YAxis hide />
                    <Tooltip 
                       cursor={{ stroke: '#4cc9f0', strokeWidth: 1, strokeDasharray: '5 5' }}
                       contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#4cc9f0" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                 </AreaChart>
              </ResponsiveContainer>
              </ChartErrorBoundary>
           </div>
        </GlassCard>

        <div className="space-y-8 flex flex-col min-w-0">
            <GlassCard className="p-8 border-white/5 bg-white/[0.02] flex-1 overflow-hidden">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-primary-500/20 text-primary-300 flex items-center justify-center">
                        <ListTodo size={20} />
                     </div>
                     <h3 className="text-xs font-black text-white italic tracking-widest uppercase">Ordem de Serviços</h3>
                  </div>
                  <Badge variant="outline" className="text-[8px] opacity-40 uppercase">{services.length} ATIVAS</Badge>
               </div>
               <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                  {services.length === 0 && (
                    <div className="text-center py-10 opacity-20">
                       <Package size={32} className="mx-auto mb-2" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma OS ativa</p>
                    </div>
                  )}
                  {services.slice(0, 8).map((s, i) => (
                    <div key={i} onClick={() => setActiveTab?.('services')} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group space-y-2 min-w-0 overflow-hidden">
                       <div className="flex justify-between items-start gap-2">
                          <div className="space-y-0.5 min-w-0 flex-1">
                             <p className="text-[10px] font-black text-white truncate uppercase">{s.client}</p>
                             <p className="text-[8px] text-[#4cc9f0] uppercase font-black truncate">Empresa: {currentCompany?.name || 'Geral'}</p>
                          </div>
                          <span className="text-[10px] font-black text-emerald-400 italic shrink-0">R$ {(s.total || 0).toFixed(2).replace('.', ',')}</span>
                       </div>
                       <div className="flex justify-between items-end pt-2 border-t border-white/5 gap-2">
                          <div className="space-y-0.5 min-w-0 flex-1">
                             <p className="text-[9px] text-white/30 truncate italic">{s.service || 'Serviço s/ descrição'}</p>
                             <p className="text-[8px] text-white/40 uppercase font-bold truncate">RESP: {s.responsibleName || s.responsible || 'Responsável'}</p>
                             <p className="text-[7px] text-white/20">{s.createdAt ? safeFormat(s.createdAt, 'dd/MM HH:mm') : ''}</p>
                          </div>
                          <Badge variant={s.status === 'producao' ? 'primary' : 'warning'} className="text-[8px] h-5 px-1.5 uppercase font-black leading-none shrink-0">
                            {s.status === 'producao' ? 'Em Produção' : 'Pendente'}
                          </Badge>
                       </div>
                    </div>
                  ))}
               </div>
            </GlassCard>

           <GlassCard className="p-8 border-white/5 bg-amber-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-12 -mt-12" />
              <div className="flex items-center gap-3 mb-4">
                 <AlertCircle size={20} className="text-amber-500" />
                 <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Alerta de Estoque</h3>
              </div>
              <p className="text-xl font-black text-white italic uppercase leading-none">12 Itens Baixos</p>
              <p className="text-[10px] text-white/30 font-bold mt-2 uppercase">Necessário repor estoque crítico</p>
              <Button variant="secondary" size="sm" className="w-full mt-6 h-10 text-[9px] uppercase tracking-widest border-amber-500/20 text-amber-500" onClick={() => setActiveTab?.('pos')}>Ver Estoque</Button>
           </GlassCard>
        </div>
      </div>

      {/* SEÇÃO INTEGRADA: Serviços & Mercadorias Gráficas & Fluxos Financeiros (Pendentes) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
         {/* Graphics Services & Merchandise Block */}
         <GlassCard className="p-8 border-white/5 bg-white/[0.02] flex flex-col justify-between animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div>
               <div className="flex justify-between items-start mb-6">
                  <div>
                     <h3 className="text-xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
                        <FileText size={18} className="text-red-500" />
                        Serviços & Mercadorias Gráficas
                     </h3>
                     <p className="text-[10px] text-white/30 font-bold tracking-widest uppercase mb-1">Rafa Arts Graphics • PDV & Contratos</p>
                  </div>
                  <Button 
                    size="sm" 
                    icon={Plus} 
                    onClick={() => setActiveTab?.('contract_approval')}
                    className="text-[9px] uppercase tracking-widest font-black h-8 px-3 bg-red-600 hover:bg-red-700 text-white"
                  >
                    Novo Contrato PDV
                  </Button>
               </div>

               {/* Total Stats Card */}
               <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/10">
                     <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Total de Contratos</p>
                     <p className="text-2xl font-black text-white">24 un</p>
                  </div>
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                     <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Faturamento Bruto</p>
                     <p className="text-xl font-black text-white">R$ 48.950,00</p>
                  </div>
               </div>

               {/* Merchandise / Contracts Quick List */}
               <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {[
                     { client: 'Carlos Alberto Oliveira', service: 'Fachada ACM 3x1m LED', value: 3800, status: 'Aceito Eletronicamente' },
                     { client: 'Mariana Santos', service: '1.000 Panfletos + 500 Cartões', value: 450, status: 'Entrada PIX Paga' },
                     { client: 'Roberto Souza', service: 'Adesivação de Frota (2 Vans)', value: 2600, status: 'Aguardando Aceite' }
                  ].map((s, idx) => (
                    <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center group hover:bg-white/10 transition-all">
                       <div className="space-y-1">
                          <div className="flex items-center gap-2">
                             <span className="text-[11px] font-black text-white uppercase italic">{s.service}</span>
                             <Badge variant="outline" className="text-[8px] py-0 px-1 border-red-500/30 text-red-400 leading-none h-4">{s.status}</Badge>
                          </div>
                          <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">Cliente: {s.client}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-xs font-black text-emerald-400">R$ {s.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[8px] text-white/40 uppercase font-black">Entrada 50%: R$ {(s.value / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </GlassCard>

         {/* Pending Entries Block */}
         <GlassCard className="p-8 border-white/5 bg-white/[0.02]">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <h3 className="text-xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
                     <Clock size={18} className="text-rose-400" />
                     Fluxos Inacabados
                  </h3>
                  <p className="text-[10px] text-white/30 font-bold tracking-widest uppercase">Caixa & Contas Parciais (Aberto)</p>
               </div>
               <Badge variant="outline" className="text-[8px] opacity-40 uppercase bg-rose-500/5 text-rose-400 border-rose-500/10">{pendingValue > 0 ? pendingEntries.length : 0} PARCIAIS</Badge>
            </div>

            {/* Pending Entries List */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
               {pendingEntries.length === 0 ? (
                 <div className="text-center py-12 opacity-20 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center">
                    <Clock size={32} className="mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Sem saldos pendentes ativos</p>
                    <p className="text-[8px] text-white/50 lowercase mt-1">crie um pedido com entrada no pdv</p>
                 </div>
               ) : (
                 pendingEntries.map((o, idx) => {
                    const balance = o.total - (o.downPayment || 0);
                    const type = o.paymentMethod ? o.paymentMethod.replace('_', ' ') : 'Geral';
                    const dateStr = safeFormat(o.createdAt, 'dd/MM/yyyy');
                    const domainStr = o.items?.[0]?.name ? 'Gráfica' : 'Serviços';
                    return (
                      <div 
                        key={o.id || idx} 
                        onClick={() => {
                          if (setPrefilledCustomer) {
                            setPrefilledCustomer({ name: o.customerName || 'Cliente Balcão', phone: o.phone || o.customerPhone || '' });
                            setActiveTab?.('pos');
                          }
                        }} 
                        className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-primary-400 hover:bg-white/10 cursor-pointer transition-all flex justify-between items-center group relative overflow-hidden"
                      >
                         <div className="space-y-1">
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black text-white uppercase">{o.customerName || 'Cliente Balcão'}</span>
                               <Badge className="text-[7px] py-0 px-1 uppercase bg-rose-500/15 text-rose-400 border-none font-bold">Incompleto</Badge>
                            </div>
                            <p className="text-[9px] text-white/30 font-black uppercase tracking-wider">Origem: {domainStr} • {dateStr} • Tipo: {type}</p>
                            <p className="text-[8px] text-primary-300 font-black">RESPONSÁVEL: {o.responsibleName || 'Caixa Central'}</p>
                         </div>
                         <div className="text-right flex flex-col items-end gap-1">
                            <p className="text-xs font-black text-white/90">Total: R$ {o.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p className="text-[9px] text-emerald-400 font-bold">Entrada: R$ {(o.downPayment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p className="text-[10px] font-black text-rose-400">Falta: R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSettleModalOrder(o);
                              }}
                              className="mt-1 text-[8px] font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-2.5 py-1 rounded-lg transition-all shadow-md flex items-center gap-1 active:scale-95"
                            >
                              <CheckCircle2 size={10} />
                              <span>Quitar Saldo</span>
                            </button>
                         </div>
                      </div>
                    );
                 })
               )}
            </div>
         </GlassCard>
      </div>

      {/* Real Estate Sales Modal Simulation */}
      <Modal 
         isOpen={isLotModalOpen} 
         onClose={() => setIsLotModalOpen(false)} 
         title="Lançar Venda de Lote (Imobiliária)"
      >
         <div className="space-y-6 p-6">
            <div className="grid grid-cols-2 gap-4">
               <Input 
                 label="Identificação do Lote" 
                 placeholder="Ex: Lote 14" 
                 value={lotForm.lotName} 
                 onChange={(e) => setLotForm({ ...lotForm, lotName: e.target.value })} 
               />
               <Input 
                 label="Quadra / Bloco" 
                 placeholder="Ex: Quadra C" 
                 value={lotForm.quadra} 
                 onChange={(e) => setLotForm({ ...lotForm, quadra: e.target.value })} 
               />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <Input 
                 label="Valor do Lote (R$)" 
                 type="number" 
                 placeholder="150000" 
                 value={lotForm.value} 
                 onChange={(e) => setLotForm({ ...lotForm, value: e.target.value })} 
               />
               <Input 
                 label="Entrada / Sinal (R$)" 
                 type="number" 
                 placeholder="1500" 
                 value={lotForm.downPayment} 
                 onChange={(e) => setLotForm({ ...lotForm, downPayment: e.target.value })} 
               />
            </div>
            <Input 
              label="Nome do Comprador" 
              placeholder="Ex: Rafael Matos" 
              value={lotForm.customerName} 
              onChange={(e) => setLotForm({ ...lotForm, customerName: e.target.value })} 
            />
            <div className="grid grid-cols-2 gap-4">
               <Input 
                 label="WhatsApp do Comprador" 
                 placeholder="(62) 99999-5555" 
                 value={lotForm.customerPhone} 
                 onChange={(e) => setLotForm({ ...lotForm, customerPhone: e.target.value })} 
               />
               <Input 
                 label="Corretor Responsável" 
                 placeholder="Ex: Fernando Santos" 
                 value={lotForm.responsibleName} 
                 onChange={(e) => setLotForm({ ...lotForm, responsibleName: e.target.value })} 
               />
            </div>
            <div className="flex gap-4 pt-4 border-t border-white/10">
               <Button className="flex-1" icon={Check} onClick={handleSaveLotSale}>Registrar Contrato</Button>
               <Button variant="ghost" className="text-rose-400" onClick={() => setIsLotModalOpen(false)}>Cancelar</Button>
            </div>
         </div>
      </Modal>

      <Modal isOpen={isRevenueModalOpen} onClose={() => setIsRevenueModalOpen(false)} title="Detalhamento Operacional">
         <div className="space-y-8 p-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/10">
                  <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1">Valor Total</p>
                  <p className="text-2xl font-black text-white">R$ {(revenueDataPoint?.total || totalRevenue).toLocaleString()}</p>
               </div>
               <div className="p-6 bg-primary-500/10 rounded-3xl border border-primary-500/10">
                  <p className="text-[10px] font-black uppercase text-primary-300 tracking-widest mb-1">Vendas (PDV)</p>
                  <p className="text-2xl font-black text-white">{revenueDataPoint?.sales || totalSalesCount} un</p>
               </div>
               <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <p className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-1">Serviços (OS)</p>
                  <p className="text-2xl font-black text-white">{revenueDataPoint?.svcs || services.length} un</p>
               </div>
               <div className="p-6 bg-rose-500/10 rounded-3xl border border-rose-500/10">
                  <p className="text-[10px] font-black uppercase text-rose-400 tracking-widest mb-1">Entradas Pendentes</p>
                  <p className="text-2xl font-black text-white">{revenueDataPoint?.entries || pendingEntries.length} un</p>
               </div>
            </div>
            
            <div className="space-y-4">
               <h4 className="text-[10px] font-black uppercase text-white/30 tracking-widest italic">Últimos Lançamentos</h4>
               <div className="space-y-2">
                  {filteredOrders.slice(0, 5).map(o => (
                    <div key={o.id} className="p-4 bg-white/5 rounded-2xl flex justify-between items-center">
                       <div>
                          <p className="text-xs font-bold text-white uppercase">{o.customerName || 'Cliente Balcão'}</p>
                          <p className="text-[9px] text-white/30 uppercase font-black">{safeFormat(o.createdAt, 'dd/MM HH:mm')}</p>
                       </div>
                       <p className="text-sm font-black text-emerald-400">R$ {o.total.toFixed(2).replace('.', ',')}</p>
                    </div>
                  ))}
               </div>
            </div>
            <Button className="w-full h-14" onClick={() => setActiveTab?.('pos')}>Ver Histórico de Vendas</Button>
         </div>
      </Modal>

      {/* Widget Customization Sidebar (Drawer) */}
      <Drawer 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        title="Configurar Widget"
        className="w-[450px]"
      >
        {selectedWidget && (
          <div className="p-8 space-y-8 h-full overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-primary-300 tracking-[3px]">Identificação</p>
              <div className="space-y-4">
                <Input 
                  label="Título do Widget" 
                  value={selectedWidget.title} 
                  onChange={(e) => updateWidget({ title: e.target.value })} 
                />
                <Input 
                  label="Subtítulo" 
                  value={selectedWidget.subtitle || ''} 
                  onChange={(e) => updateWidget({ subtitle: e.target.value })} 
                />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-primary-300 tracking-[3px]">Aparência & Layout</p>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <p className="text-[10px] font-bold text-white/40 uppercase">Tamanho</p>
                   <div className="flex bg-white/5 p-1 rounded-xl">
                      {['sm', 'md', 'lg', 'full'].map(s => (
                        <button 
                          key={s} 
                          onClick={() => updateWidget({ size: s as any })}
                          className={cn(
                            "flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                            selectedWidget.size === s ? "bg-white/10 text-white shadow-lg" : "text-white/30 hover:text-white/60"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                   </div>
                 </div>
                 <div className="space-y-2">
                   <p className="text-[10px] font-bold text-white/40 uppercase">Cor Destaque</p>
                   <div className="flex gap-2">
                      {['primary', 'emerald', 'rose', 'amber', 'purple'].map(c => (
                        <button 
                          key={c}
                          onClick={() => updateWidget({ color: c })}
                          className={cn(
                            "w-6 h-6 rounded-full transition-all border-2",
                            selectedWidget.color === c ? "border-white scale-125 shadow-lg shadow-white/20" : "border-transparent opacity-50 hover:opacity-100",
                            c === 'primary' ? 'bg-primary-500' : 
                            c === 'emerald' ? 'bg-emerald-500' : 
                            c === 'rose' ? 'bg-rose-500' : 
                            c === 'amber' ? 'bg-amber-500' : 'bg-purple-500'
                          )}
                        />
                      ))}
                   </div>
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-primary-300 tracking-[3px]">Dados & Inteligência</p>
              <div className="space-y-4">
                 <div className="space-y-2">
                    <p className="text-[10px] font-bold text-white/40 uppercase">Coleção de Dados</p>
                    <select 
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={selectedWidget.dataSource.collection}
                      onChange={(e) => updateWidget({ dataSource: { ...selectedWidget.dataSource, collection: e.target.value } })}
                    >
                      <option value="leads">Leads (CRM)</option>
                      <option value="payments">Pagamentos</option>
                      <option value="saleOrders">Pedidos PDV</option>
                      <option value="tasks">Tarefas</option>
                      <option value="messages">Mensagens Meta</option>
                    </select>
                 </div>
                 
                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                       <RefreshCw size={16} className="text-primary-300" />
                       <span className="text-xs font-bold text-white">Atualização em Tempo Real</span>
                    </div>
                    <button 
                      onClick={() => updateWidget({ autoRefresh: !selectedWidget.autoRefresh })}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-all",
                        selectedWidget.autoRefresh ? "bg-primary-500" : "bg-white/10"
                      )}
                    >
                      <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", selectedWidget.autoRefresh ? "right-1" : "left-1")} />
                    </button>
                 </div>
              </div>
            </div>

            <div className="pt-8 flex gap-4">
                <Button className="flex-1" icon={Check} onClick={() => setIsSidebarOpen(false)}>Salvar Configuração</Button>
                <Button variant="ghost" className="text-rose-400" icon={Trash} onClick={() => removeWidget(selectedWidget.id)}>Excluir</Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Modal Quitar Saldo Devedor */}
      {settleModalOrder && (
        <Modal
          isOpen={!!settleModalOrder}
          onClose={() => setSettleModalOrder(null)}
          title="Quitar Saldo Devedor do Serviço / Venda"
          size="md"
        >
          <div className="space-y-6 p-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white/50">Cliente:</span>
                <span className="text-sm font-black text-white">{settleModalOrder.customerName || 'Cliente de Balcão'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white/50">Total do Pedido:</span>
                <span className="text-sm font-bold text-white">R$ {settleModalOrder.total.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-400">Entrada Já Paga:</span>
                <span className="text-sm font-bold text-emerald-400">R$ {(settleModalOrder.downPayment || 0).toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/10 pt-2">
                <span className="text-xs font-black text-rose-400 uppercase">Saldo A Quitar Agora:</span>
                <span className="text-xl font-black text-rose-400">R$ {(settleModalOrder.total - (settleModalOrder.downPayment || 0)).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/60 tracking-wider block">Forma de Recebimento do Saldo</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'pix', label: 'PIX QR' },
                  { id: 'dinheiro', label: 'Dinheiro' },
                  { id: 'cartao_credito', label: 'Cartão Crédito' },
                  { id: 'cartao_debito', label: 'Cartão Débito' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSettleMethod(m.id as any)}
                    className={cn(
                      "py-3 px-3 rounded-xl border text-xs font-bold transition-all text-center",
                      settleMethod === m.id
                        ? "bg-primary-500 border-primary-400 text-slate-900 font-black shadow-lg shadow-primary-500/20"
                        : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setSettleModalOrder(null)}>Cancelar</Button>
              <Button 
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black gap-2"
                onClick={() => handleSettleBalanceInDashboard(settleModalOrder)}
              >
                <CheckCircle2 size={16} />
                <span>Confirmar Recebimento do Saldo</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// --- CHAT PANEL (Right Content) ---
export const ChatPanel = ({ 
  conversation, 
  onClose,
  currentCompany,
  user,
  initialDraft,
  onDraftConsumed,
}: { 
  conversation: any; 
  onClose?: () => void;
  currentCompany: Company | null;
  user: AppUser | null;
  initialDraft?: string;
  onDraftConsumed?: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'data' | 'tasks' | 'notes' | 'history' | 'sales' | 'attachments'>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showQuickTemplates, setShowQuickTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialDraft && conversation?.id) {
      setNewMessage(initialDraft);
      onDraftConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, initialDraft]);

  const quickTemplates = [
    { label: '👋 Boas-vindas', text: 'Olá! Seja bem-vindo(a). Como posso te ajudar com o seu pedido hoje?' },
    { label: '💰 Orçamento PIX', text: 'Segue o resumo do seu orçamento. Para dar início à produção, aceitamos entrada via PIX de 50%.' },
    { label: '✅ Pagamento Confirmado', text: 'Confirmamos o recebimento do seu pagamento! Seu pedido já está em fase de produção.' },
    { label: '📦 Pedido Pronto', text: 'Notícia boa! Seu pedido ficou pronto e já está disponível para retirada/entrega.' },
    { label: '📅 Agendamento Entrega', text: 'Prezado(a) cliente, confirmando seu agendamento de entrega para a data e horário combinados.' },
  ];

  useEffect(() => {
    if (!conversation || !currentCompany) return;
    const q = query(
      collection(db, 'messages'),
      where('companyId', '==', currentCompany.id),
      where('phone', '==', conversation.phone),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [conversation, currentCompany]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation || !currentCompany) return;
    try {
      await addDoc(collection(db, 'messages'), {
        companyId: currentCompany.id,
        phone: conversation.phone,
        text: newMessage,
        direction: 'outgoing',
        senderName: user?.name || 'Sistema',
        channel: conversation.sourceType || 'WhatsApp',
        createdAt: Timestamp.now()
      });
      // Also update lead's last message
      await updateDoc(doc(db, 'leads', conversation.id), {
        lastMessageText: newMessage,
        lastMessageDirection: 'outgoing',
        waitingSince: null,
        updatedAt: Timestamp.now()
      });
      setNewMessage('');
    } catch (err) {
      console.error('Falha ao enviar mensagem:', err);
    }
  };

  const handleSimulateClientMessage = async (customText?: string) => {
    if (!conversation || !currentCompany) return;
    const clientText = customText || prompt('Digite a mensagem enviada pelo cliente para teste:', 'Olá! Gostaria de saber como está o andamento do meu pedido e prazo de entrega.') || '';
    if (!clientText.trim()) return;

    try {
      await addDoc(collection(db, 'messages'), {
        companyId: currentCompany.id,
        phone: conversation.phone || '(62) 99999-9999',
        text: clientText,
        direction: 'incoming',
        senderName: conversation.name || 'Cliente de Teste',
        channel: conversation.channel || conversation.sourceType || 'WhatsApp',
        createdAt: Timestamp.now()
      });

      await updateDoc(doc(db, 'leads', conversation.id), {
        lastMessageText: clientText,
        lastMessageDirection: 'incoming',
        waitingSince: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Falha ao simular mensagem do cliente:', err);
    }
  };

  // Mock permissions (in real app, fetch from RolePermissions)
  const permissions = {
    canStartNote: true,
    canSendSavedMessage: true,
    canCreateCard: true,
    canAddTask: true,
    canStartPosSale: true,
    canStartRealEstateSale: true,
    canMoveLead: true,
    canViewCustomerData: true,
    canViewAttachments: true,
    canTranscribeAudio: true,
  };

  const { setPrefilledCustomer, setActiveTab: setRootActiveTab } = React.useContext(AppContext)!;

  const tabs = [
    { id: 'chat', label: 'Conversa', icon: MessageSquare },
    { id: 'data', label: 'Dados', icon: Users },
    { id: 'tasks', label: 'Tarefas', icon: ListTodo },
    { id: 'notes', label: 'Notas', icon: StickyNote },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'sales', label: 'Vendas', icon: ShoppingBag },
    { id: 'attachments', label: 'Anexos', icon: Paperclip },
  ];

  const quickActions = [
    { id: 'note', icon: StickyNote, label: 'Nota Interna', color: 'text-amber-400', permission: permissions.canStartNote, onClick: () => alert('Nota interna simulada no sistema') },
    { id: 'saved', icon: MessageSquare, label: 'Msg Salva', color: 'text-primary-300', permission: permissions.canSendSavedMessage, onClick: () => setShowQuickTemplates(!showQuickTemplates) },
    { id: 'card', icon: LayoutDashboard, label: 'Criar Card', color: 'text-emerald-400', permission: permissions.canCreateCard },
    { id: 'task', icon: ListTodo, label: 'Tarefa', color: 'text-purple-400', permission: permissions.canAddTask },
    { 
      id: 'pos', 
      icon: ShoppingBag, 
      label: 'Venda PDV', 
      color: 'text-blue-400', 
      permission: permissions.canStartPosSale,
      onClick: () => {
        if (setPrefilledCustomer) {
          setPrefilledCustomer({ name: conversation.name, phone: conversation.phone || '' });
          setRootActiveTab?.('pos');
        }
      }
    },
    { 
      id: 'lot', 
      icon: Building2, 
      label: 'Venda Lote', 
      color: 'text-indigo-400', 
      permission: permissions.canStartRealEstateSale,
      onClick: () => {
        if (setPrefilledCustomer) {
          setPrefilledCustomer({ name: conversation.name, phone: conversation.phone || '' });
          setRootActiveTab?.('dashboard');
        }
      }
    },
    { id: 'print', icon: Printer, label: 'Imprimir', color: 'text-slate-400', permission: true },
    { id: 'share', icon: Share2, label: 'Compartilhar', color: 'text-emerald-500', permission: true },
  ];

  if (!conversation) return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
      <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center text-white/10">
        <MessageSquare size={48} />
      </div>
      <h3 className="text-xl font-bold text-white/40">Selecione uma conversa</h3>
      <p className="text-sm text-white/20 max-w-xs italic uppercase tracking-widest font-black">
        Clique em um lead ou mensagem para abrir o painel de atendimento
      </p>
    </div>
  );

  return (
    <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden bg-white/3 border-white/10 relative h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center font-bold text-white text-base border border-primary-500/30">
              {conversation.name?.[0] || 'C'}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0f172a]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white">{conversation.name}</h4>
              <Badge variant="outline" className="text-[7px] py-0 px-1 leading-none h-3.5">{conversation.channel}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-0">
              <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Ativo</span>
              <span className="text-[9px] text-white/20">•</span>
              <span className="text-[9px] text-white/40 font-bold">{conversation.phone || '(62) 99999-9999'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 p-0.5 rounded-lg mr-1">
            {quickActions.filter(a => a.permission).slice(0, 6).map(action => (
              <Button 
                key={action.id}
                variant="ghost" 
                size="sm" 
                className={cn("p-1.5 min-w-0 h-8 w-8 border-none", action.color)} 
                icon={action.icon}
                title={action.label}
                onClick={action.onClick}
              />
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-1.5 min-w-0 h-8 w-8 border-none text-white/40" 
              icon={MoreHorizontal}
              onClick={() => setShowQuickActions(!showQuickActions)}
            />
          </div>
          {onClose && <Button variant="ghost" icon={X} onClick={onClose} className="p-1.5 min-w-0 h-8 w-8" />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-white/5 bg-white/[0.01] px-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-3 py-2 text-[9px] font-black uppercase tracking-[1px] transition-all relative whitespace-nowrap",
              activeTab === tab.id ? "text-primary-300" : "text-white/30 hover:text-white/60"
            )}
          >
            <div className="flex items-center gap-1.5">
              <tab.icon size={10} />
              {tab.label}
            </div>
            {activeTab === tab.id && (
              <motion.div layoutId="activeChatTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
                 {messages.length === 0 && (
                   <div className="flex flex-col items-center justify-center h-full space-y-3 py-10">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
                        <MessageSquare size={24} />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-xs font-bold text-white/70">Nenhuma mensagem registrada ainda</p>
                        <p className="text-[10px] text-white/30 font-medium">Inicie o atendimento com uma mensagem do atendente ou simule uma chegada do cliente:</p>
                      </div>

                      <div className="space-y-2 text-center pt-2 w-full max-w-md">
                        <p className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Respostas do Atendente:</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {quickTemplates.map((tpl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setNewMessage(tpl.text)}
                              className="text-[10px] font-medium bg-white/5 hover:bg-primary-500/20 hover:text-primary-300 text-white/70 px-3 py-1.5 rounded-xl border border-white/10 hover:border-primary-500/30 transition-all cursor-pointer"
                            >
                              {tpl.label}
                            </button>
                          ))}
                        </div>

                        <p className="text-[9px] font-black uppercase tracking-wider text-sky-400 pt-2">Simular Mensagem do Cliente (Teste):</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          <button
                            type="button"
                            onClick={() => handleSimulateClientMessage('Olá! Gostaria de fazer um orçamento de impressão e faixas.')}
                            className="text-[10px] font-medium bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 px-3 py-1.5 rounded-xl border border-sky-500/30 transition-all cursor-pointer"
                          >
                            💬 Quero Orçamento
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSimulateClientMessage('Boa tarde, qual o prazo de entrega do meu pedido?')}
                            className="text-[10px] font-medium bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 px-3 py-1.5 rounded-xl border border-sky-500/30 transition-all cursor-pointer"
                          >
                            📦 Prazo de Entrega
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSimulateClientMessage('Qual a chave PIX para envio da entrada?')}
                            className="text-[10px] font-medium bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 px-3 py-1.5 rounded-xl border border-sky-500/30 transition-all cursor-pointer"
                          >
                            💰 Pedir PIX
                          </button>
                        </div>
                      </div>
                   </div>
                 )}
                 
                 {messages.map((m, idx) => {
                    const isOutgoing = m.direction === 'outgoing';
                    const timeStr = m.createdAt instanceof Timestamp ? format(m.createdAt.toDate(), 'HH:mm') : '';
                    
                    return (
                      <div key={m.id || idx} className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}>
                        <div className={cn("group space-y-1", isOutgoing ? "text-right" : "")}>
                           <div className={cn(
                             "max-w-[85%] p-2.5 rounded-2xl border text-xs text-slate-800 leading-relaxed shadow-sm bg-white",
                             isOutgoing 
                               ? "rounded-br-none border-primary-200 text-left ml-auto" 
                               : "rounded-bl-none border-slate-200"
                           )}>
                              {m.text}
                           </div>
                           <p className={cn("text-[8px] font-bold uppercase", isOutgoing ? "text-primary-300/30 mr-1" : "text-white/20 ml-1")}>
                             {timeStr} • {isOutgoing ? 'Sistema' : m.senderName || 'Cliente'}
                           </p>
                        </div>
                      </div>
                    );
                 })}
                 <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-slate-100/50 border-t border-white/10 space-y-2">
                {/* BARRA DE RESPOSTAS RÁPIDAS / MENSAGENS SALVAS & TESTE CLIENTE */}
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  <button
                    type="button"
                    onClick={() => handleSimulateClientMessage()}
                    className="text-[9.5px] font-black uppercase tracking-wider bg-sky-500 text-white hover:bg-sky-400 px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap transition-all shrink-0 cursor-pointer flex items-center gap-1"
                    title="Simula o envio de uma mensagem pelo cliente para testar o recebimento no CRM"
                  >
                    <MessageSquare size={10} /> + Simular Msg Cliente
                  </button>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 shrink-0 mx-0.5">|</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 shrink-0 flex items-center gap-1">
                    <Sparkles size={10} className="text-amber-500" /> Rápidas:
                  </span>
                  {quickTemplates.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewMessage(tpl.text)}
                      className="text-[9.5px] font-bold bg-white text-slate-700 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-300 px-2.5 py-1 rounded-full border border-slate-200 shadow-sm whitespace-nowrap transition-all shrink-0 cursor-pointer"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-end gap-2 bg-white p-1 rounded-2xl border border-slate-200 focus-within:border-primary-500/50 transition-all shadow-lg">
                  <div className="flex gap-0.5 pb-0.5">
                    <Button variant="ghost" size="sm" className="p-1.5 min-w-0 h-8 w-8 text-slate-400 hover:text-primary-600 transition-colors" icon={Paperclip} />
                    <Button variant="ghost" size="sm" className="p-1.5 min-w-0 h-8 w-8 text-slate-400 hover:text-primary-600 transition-colors" icon={ImageIcon} />
                  </div>
                  <textarea 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Sua resposta..."
                    className="flex-1 bg-transparent border-none outline-none text-xs text-slate-900 font-medium p-2 resize-none max-h-24 min-h-[36px] custom-scrollbar focus:ring-0 placeholder:text-slate-400"
                    rows={1}
                  />
                  <div className="flex gap-1.5 pb-0.5 pr-0.5">
                    {newMessage.trim() === '' ? (
                      <Button 
                        onClick={() => setIsRecording(!isRecording)}
                        className={cn(
                          "p-2 min-w-0 h-9 w-9 rounded-full border-none transition-all shadow-md",
                          isRecording ? "bg-rose-500 shadow-lg shadow-rose-500/40 animate-pulse" : "bg-slate-100 hover:bg-slate-200 text-slate-500"
                        )} 
                        icon={Mic} 
                      />
                    ) : (
                      <Button 
                        onClick={handleSendMessage}
                        className="p-2 min-w-0 h-9 w-9 rounded-full bg-primary-500 hover:bg-primary-400 shadow-lg shadow-primary-500/40 text-slate-900 border-none" 
                        icon={Send} 
                      />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'data' && (
            <motion.div 
              key="data"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 space-y-8"
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-white/30 tracking-widest leading-none">Status</p>
                  <Button variant="secondary" className="w-full justify-between h-12">
                    {conversation.status?.toUpperCase() || 'EM ATENDIMENTO'}
                    <ChevronRight size={14} />
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-white/30 tracking-widest leading-none">Prioridade</p>
                  <div className="flex gap-2">
                    {['B', 'M', 'A'].map(p => (
                      <button key={p} className="flex-1 h-12 rounded-xl bg-white/5 border border-white/5 hover:border-primary-500/50 flex items-center justify-center font-bold text-white/40">{p}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-[11px] font-black uppercase text-primary-300 tracking-[3px]">Informações Pessoais</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {[
                     { label: 'E-mail', value: 'rafael@exemplo.com.br', icon: AtSign },
                     { label: 'Telefone', value: '(62) 98888-7777', icon: Phone },
                     { label: 'Origem', value: 'Instagram Ads', icon: Target },
                     { label: 'Vendedor', value: 'Atendente Lucas', icon: Users },
                   ].map((item, i) => (
                     <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-primary-300 transition-colors">
                           <item.icon size={16} />
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{item.label}</p>
                           <p className="text-xs font-bold text-white/80">{item.value}</p>
                        </div>
                     </div>
                   ))}
                </div>
              </div>

              <div className="p-6 bg-primary-500/5 border border-primary-500/10 rounded-3xl space-y-4">
                 <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-black uppercase text-primary-300 tracking-[3px]">Etiquetas (Tags)</h5>
                    <Button variant="ghost" size="sm" icon={Plus} className="h-8 p-1" />
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {['Quente', 'Investidor', 'Lançamento', 'Aura'].map(tag => (
                      <Badge key={tag} variant="primary" className="px-3 py-1 text-[9px] uppercase font-black bg-white/5 border-white/10">{tag}</Badge>
                    ))}
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-6">
               <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white italic">Notas Internas</h3>
                  <Button icon={Plus} size="sm">Nova Nota</Button>
               </div>
               <div className="space-y-4">
                  {[
                    { title: 'Preferência de Contato', text: 'O cliente prefere receber áudio em vez de texto.', date: 'Hoje, 10:30', author: 'Atendente Lucas', priority: 'alta' },
                    { title: 'Orçamento Fachada', text: 'Pediu para orçar a fachada em ACM preto fosco.', date: 'Ontem', author: 'Você', priority: 'media' },
                  ].map((note, i) => (
                    <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-3 relative overflow-hidden group">
                       <div className={cn("absolute top-0 left-0 w-1 h-full", note.priority === 'alta' ? 'bg-amber-500' : 'bg-primary-500')} />
                       <div className="flex justify-between items-start">
                          <h4 className="font-bold text-white text-sm">{note.title}</h4>
                          <span className="text-[9px] font-black text-white/20 uppercase">{note.date}</span>
                       </div>
                       <p className="text-xs text-white/50 leading-relaxed">{note.text}</p>
                       <div className="pt-3 border-t border-white/5 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] text-white/30 font-bold italic">Por {note.author}</span>
                          <div className="flex gap-2">
                             <Button variant="ghost" size="sm" icon={Star} className="p-1 h-6 w-6" />
                             <Button variant="ghost" size="sm" icon={Trash2} className="p-1 h-6 w-6 text-rose-400" />
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
};

// --- CRM / FUNNEL ---
export const CRMModule = ({ currentCompany, user }: { currentCompany: Company | null, user: AppUser | null }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isConfiguringFunnel, setIsConfiguringFunnel] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!currentCompany) return;
    const qF = query(collection(db, 'funnels'), where('companyId', '==', currentCompany.id));
    const unsubscribeFunnels = onSnapshot(qF, (snapshot) => {
      const funnelData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Funnel);
      setFunnels(funnelData);
      if (funnelData.length > 0 && !selectedFunnelId) {
        setSelectedFunnelId(funnelData[0].id);
      }
    });

    const qL = query(collection(db, 'leads'), where('companyId', '==', currentCompany.id), orderBy('updatedAt', 'desc'));
    const unsubscribeLeads = onSnapshot(qL, (snapshot) => setLeads(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Lead)));

    return () => {
      unsubscribeFunnels();
      unsubscribeLeads();
    };
  }, [currentCompany]);

  useEffect(() => {
    if (!selectedFunnelId) return;
    const qS = query(collection(db, 'funnelStages'), where('funnelId', '==', selectedFunnelId), orderBy('order', 'asc'));
    return onSnapshot(qS, (snapshot) => setStages(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as FunnelStage)));
  }, [selectedFunnelId]);

  const onDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    const lead = leads.find(l => l.id === leadId);
    // Find the stage specifically if dropped over a column or a card in that column
    const overStageId = stages.find(s => s.id === overId)?.id || 
                       leads.find(l => l.id === overId)?.funnelStageId;

    if (lead && overStageId && lead.funnelStageId !== overStageId) {
      try {
        await updateDoc(doc(db, 'leads', leadId), { 
          funnelStageId: overStageId,
          updatedAt: Timestamp.now()
        });
      } catch (err) {
        console.error('Kanban: Fallback move failed', err);
      }
    }
  };

  const currentFunnel = funnels.find(f => f.id === selectedFunnelId);

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-6 animate-in slide-in-from-right-10 duration-500">
      <div className={cn("flex flex-col space-y-6 transition-all duration-500", selectedLead ? "w-[60%]" : "w-full")}>
        <SectionHeader 
          title="Funil Rafa Arts" 
          subtitle={currentFunnel?.name || "Gestão Estratégica"} 
          actions={
            <div className="flex gap-3">
               <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar max-w-[400px]">
                  {funnels.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFunnelId(f.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                        selectedFunnelId === f.id ? "bg-primary-500 text-[#0f172a] shadow-lg" : "text-white/40 hover:text-white"
                      )}
                    >
                      {f.name}
                    </button>
                  ))}
                  {/* Quick Add Funnel */}
                  <button 
                    onClick={async () => {
                      const name = prompt('Nome do novo funil:');
                      if(name && currentCompany) {
                        const far = await addDoc(collection(db, 'funnels'), {
                           companyId: currentCompany.id,
                           name,
                           isActive: true,
                           isDefault: false,
                           createdAt: Timestamp.now(),
                           updatedAt: Timestamp.now()
                        });
                        // Add default stages too
                        ['Entrada', 'Negociação', 'Fechamento'].forEach(async (st, i) => {
                          await addDoc(collection(db, 'funnelStages'), {
                             funnelId: far.id,
                             name: st,
                             order: i,
                             isInitial: i === 0,
                             isFinal: i === 2,
                             createdAt: Timestamp.now(),
                             updatedAt: Timestamp.now()
                          });
                        });
                      }
                    }}
                    className="px-4 py-2 text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
               </div>
               <Button variant="secondary" icon={Settings2} onClick={() => setIsConfiguringFunnel(true)}>Configurar</Button>
               <Button icon={Plus}>Novo Lead</Button>
            </div>
          } 
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-4 overflow-x-hidden pb-6 grow min-h-[500px]">
            {stages.map(stage => (
              <KanbanColumn 
                key={stage.id} 
                stage={stage} 
                leads={leads.filter(l => l.funnelStageId === stage.id || (!l.funnelStageId && (stage.isInitial || stage.order === 0)))}
                onLeadClick={setSelectedLead}
                selectedLeadId={selectedLead?.id}
              />
            ))}
            
            <button 
              onClick={async () => {
                const name = prompt('Nome da nova etapa:');
                if(name && selectedFunnelId) {
                  await addDoc(collection(db, 'funnelStages'), {
                    funnelId: selectedFunnelId,
                    name,
                    order: stages.length,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                  });
                }
              }}
              className="flex-1 min-w-0 shrink-0 basis-24 h-[calc(100vh-25rem)] border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center justify-center opacity-20 hover:opacity-100 hover:bg-white/5 transition-all text-white/40"
            >
               <Plus size={32} />
               <span className="text-[10px] font-black uppercase tracking-[3px] mt-2">Nova Etapa</span>
            </button>
          </div>

          <DragOverlay>
            {activeDragId ? (
              <KanbanCard 
                lead={leads.find(l => l.id === activeDragId)!} 
                isDragging 
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <AnimatePresence>
        {selectedLead && (
          <motion.div 
            initial={{ opacity: 0, x: 100, width: 0 }}
            animate={{ opacity: 1, x: 0, width: '40%' }}
            exit={{ opacity: 0, x: 100, width: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="h-full"
          >
            <ChatPanel 
              conversation={{ ...selectedLead, name: selectedLead.fullName, channel: 'WhatsApp' }}
              onClose={() => setSelectedLead(null)}
              currentCompany={currentCompany}
              user={user}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Modal 
        isOpen={isConfiguringFunnel} 
        onClose={() => setIsConfiguringFunnel(false)} 
        title="Gestão de Funis & Etapas"
      >
        <div className="p-4 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
           <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-primary-300 tracking-[3px]">Configuração do Funil</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nome do Funil" value={funnels.find(f => f.id === selectedFunnelId)?.name || ''} />
                <div className="space-y-2">
                   <p className="text-[10px] font-bold text-white/40 uppercase">Cor do Funil</p>
                   <div className="flex gap-2">
                      {['#4cc9f0', '#4361ee', '#f72585', '#7209b7', '#3a0ca3'].map(c => (
                        <div key={c} className="w-6 h-6 rounded-full cursor-pointer border border-white/10" style={{ backgroundColor: c }} />
                      ))}
                   </div>
                </div>
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-primary-300 tracking-[3px]">Etapas do Processo</p>
                <Button size="sm" variant="ghost" icon={Plus}>Adicionar Etapa</Button>
              </div>
              <div className="space-y-3">
                 {stages.map((stage, idx) => (
                   <div key={stage.id} className="p-5 bg-white/5 border border-white/5 rounded-3xl flex items-center gap-4 group">
                      <div className="cursor-grab text-white/20"><GripVertical size={16} /></div>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: stage.color || '#4cc9f0' }} />
                      <div className="flex-1">
                         <p className="text-sm font-bold text-white">{stage.name}</p>
                         <p className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-1">Ordem: {idx + 1} • {stage.isInitial ? 'Inicial' : stage.isFinal ? 'Venda' : 'Negociação'}</p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="sm" icon={Zap} className="p-1 h-8 w-8 text-amber-400" title="Automações" />
                         <Button variant="ghost" size="sm" icon={Settings2} className="p-1 h-8 w-8" />
                         <Button variant="ghost" size="sm" icon={Trash} className="p-1 h-8 w-8 text-rose-400" />
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </Modal>
    </div>
  );
};

const KanbanColumn = ({ stage, leads, onLeadClick, selectedLeadId }: { key?: any, stage: FunnelStage, leads: Lead[], onLeadClick: (l: Lead) => void, selectedLeadId?: string }) => {
  const { setNodeRef } = useSortable({ id: stage.id, data: { type: 'column', stageId: stage.id } });

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", stage.color || 'bg-primary-500')} />
          <h3 className="text-[10px] font-black uppercase tracking-[3px] text-white/50">{stage.name}</h3>
          <Badge className="ml-2 bg-white/5 border-none opacity-50 px-2 py-0 h-5 flex items-center">
            {leads.length}
          </Badge>
        </div>
      </div>
      <div 
        ref={setNodeRef}
        className="bg-white/[0.03] border border-white/5 rounded-[40px] p-4 flex flex-col gap-4 grow shadow-inner overflow-y-auto max-h-[calc(100vh-25rem)] custom-scrollbar"
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <KanbanCard 
              key={lead.id} 
              lead={lead} 
              onClick={() => onLeadClick(lead)}
              isSelected={selectedLeadId === lead.id}
            />
          ))}
        </SortableContext>
        
        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-10">
             <Layers size={32} className="text-white/40 mb-3" />
             <p className="text-[10px] font-black uppercase tracking-widest">Sem Cards</p>
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanCard = ({ lead, onClick, isSelected, isDragging }: { key?: any, lead: Lead, onClick?: () => void, isSelected?: boolean, isDragging?: boolean }) => {
  const { setPrefilledCustomer, setActiveTab } = React.useContext(AppContext)!;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: lead.id,
    data: { type: 'card', lead }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={cn(isDragging ? "z-50" : "relative")}
    >
      <GlassCard 
        onClick={onClick}
        className={cn(
          "p-5 border-white/5 cursor-grab active:cursor-grabbing transition-all hover:border-primary-400 group relative overflow-hidden",
          isSelected ? "bg-primary-500/10 border-primary-500/40 ring-1 ring-primary-500/20" : "",
          isDragging ? "shadow-2xl ring-2 ring-primary-500 scale-105" : ""
        )}
      >
         <div className="flex justify-between mb-2">
            <p className="font-black text-white text-[11px] tracking-tight truncate flex-1 pr-2 uppercase italic">{lead.fullName}</p>
            <span className="text-[7px] font-black text-white/20 uppercase tracking-widest leading-none">
               {(lead.createdAt as any)?.toDate?.() ? format((lead.createdAt as any).toDate(), 'HH:mm') : 'Agora'}
            </span>
         </div>
         
         <div className="flex flex-wrap gap-1.5 mb-4">
            <Badge className="text-[8px] px-1.5 py-0.5 bg-primary-500/10 border-none opacity-60 uppercase font-black">{lead.sourceType || 'Ads'}</Badge>
            <Badge className="text-[8px] px-1.5 py-0.5 border-white/10 opacity-30 italic">R$ {(lead.estimatedValue ?? 0).toLocaleString('pt-BR')}</Badge>
         </div>

         {lead.lastMessageText && (
           <p className="text-[10px] text-white/40 line-clamp-2 leading-relaxed bg-white/5 p-3 rounded-2xl italic border border-white/5">
              "{lead.lastMessageText}"
           </p>
         )}

         <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?u=${lead.id}`} className="w-full h-full object-cover grayscale opacity-50" referrerPolicy="no-referrer" />
               </div>
               <p className="text-[9px] font-bold text-white/30 uppercase tracking-[2px] truncate max-w-[80px]">{lead.phone}</p>
            </div>
            <div className="flex items-center gap-2">
               <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    if (setPrefilledCustomer) {
                       setPrefilledCustomer({ name: lead.fullName, phone: lead.phone || '' });
                       setActiveTab?.('pos');
                    }
                 }}
                 title="Iniciar Venda (PDV)" 
                 className="w-6 h-6 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500 hover:text-slate-900 transition-all cursor-pointer mr-1 z-10"
               >
                  <ShoppingBag size={10} />
               </button>
               <ArrowRight size={12} className={cn("transition-transform duration-300", isSelected ? "translate-x-1 text-primary-300" : "text-white/20")} />
            </div>
         </div>
      </GlassCard>
    </div>
  );
};

// --- GENERIC LIST VIEW COMPONENT ---
const GenericListView = ({ title, subtitle, columns, data, icon, onAdd, noHeader }: any) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
    {!noHeader && title && (
      <SectionHeader 
        title={title} 
        subtitle={subtitle} 
        actions={onAdd && <Button icon={Plus} onClick={onAdd}>Adicionar Novo</Button>}
      />
    )}
    <GlassCard className="p-4 overflow-hidden border-white/5 shadow-2xl">
      <div className="flex items-center gap-4 mb-6 px-4">
        <div className="flex-1">
          <Input icon={Search} placeholder="Buscar registros..." />
        </div>
        <Button variant="secondary" icon={Filter}>Filtros</Button>
      </div>
      <DataTable columns={columns} data={data} />
    </GlassCard>
  </div>
);

// --- MESSAGES ---
export const MessagesModule = ({ currentCompany, user }: { currentCompany: Company | null, user: AppUser | null }) => {
  const { pendingWhatsAppShare, setPendingWhatsAppShare } = React.useContext(AppContext)!;
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatInitialDraft, setChatInitialDraft] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState('');
  const [autoTranscribe, setAutoTranscribe] = useState(true);
  const [viewFilter, setViewFilter] = useState<'all' | 'unreplied'>('all');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  
  // Modal de Simulação de Mensagens Multicanal
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [simChannel, setSimChannel] = useState<'WhatsApp' | 'Instagram' | 'WebChat' | 'Facebook' | 'E-mail' | 'Telegram'>('WhatsApp');
  const [simName, setSimName] = useState('Juliana Costa');
  const [simPhone, setSimPhone] = useState('(62) 99777-3322');
  const [simMessage, setSimMessage] = useState('Olá! Vi o anúncio da gráfica e quero fazer um orçamento de 1.000 cartões de visita e 2 banners para minha loja.');

  const getInitialStageInfo = async () => {
    if (!currentCompany) return { funnelId: null, funnelStageId: null };
    try {
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
        let stageSnap = await getDocs(stageQ);
        if (stageSnap.empty) {
          const anyStageQ = query(collection(db, 'funnelStages'), where('funnelId', '==', funnelId), orderBy('order', 'asc'), limit(1));
          stageSnap = await getDocs(anyStageQ);
        }
        if (!stageSnap.empty) {
          return { funnelId, funnelStageId: stageSnap.docs[0].id };
        }
        return { funnelId, funnelStageId: null };
      }
    } catch (e) {
      console.error(e);
    }
    return { funnelId: null, funnelStageId: null };
  };

  const sampleLeadsData = [
    {
      fullName: 'Carlos Oliveira',
      firstName: 'Carlos',
      lastName: 'Oliveira',
      phone: '(62) 98111-2233',
      sourceType: 'WhatsApp',
      lastMessageText: 'Quero fechar o pedido de 1000 panfletos e 500 cartões. Como faço para pagar a entrada no PIX?',
      status: 'ENTRADA',
      estimatedValue: 450,
      waitingSince: new Date(Date.now() - 12 * 60000).toISOString(),
      lastInteractionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      fullName: 'Mariana Santos',
      firstName: 'Mariana',
      lastName: 'Santos',
      phone: '(62) 99222-3344',
      sourceType: 'Instagram',
      lastMessageText: 'Vocês fazem a instalação da fachada em ACM com LED no local em Goiânia? Qual o prazo?',
      status: 'ENTRADA',
      estimatedValue: 3800,
      waitingSince: new Date(Date.now() - 28 * 60000).toISOString(),
      lastInteractionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      fullName: 'Gabriel Mendes',
      firstName: 'Gabriel',
      lastName: 'Mendes',
      phone: '(62) 98777-1122',
      sourceType: 'WebChat',
      lastMessageText: 'Olá! Vi no site os serviços de impressão offset. Qual o valor para 5.000 panfletos da gráfica?',
      status: 'ENTRADA',
      estimatedValue: 680,
      waitingSince: new Date(Date.now() - 8 * 60000).toISOString(),
      lastInteractionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      fullName: 'Amanda Prado',
      firstName: 'Amanda',
      lastName: 'Prado',
      phone: '(62) 99666-8899',
      sourceType: 'Facebook',
      lastMessageText: 'Boa tarde! Gostaria de um orçamento para 10 placas de sinalização comercial em acrílico.',
      status: 'ENTRADA',
      estimatedValue: 1250,
      waitingSince: new Date(Date.now() - 18 * 60000).toISOString(),
      lastInteractionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      fullName: 'Ricardo Fonseca',
      firstName: 'Ricardo',
      lastName: 'Fonseca',
      phone: '(62) 98888-4433',
      sourceType: 'E-mail',
      lastMessageText: 'Prezados, solicitamos proposta técnica para envelopamento da frota comercial (5 utilitários).',
      status: 'ENTRADA',
      estimatedValue: 5400,
      waitingSince: new Date(Date.now() - 35 * 60000).toISOString(),
      lastInteractionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      fullName: 'Bruno Alves',
      firstName: 'Bruno',
      lastName: 'Alves',
      phone: '(62) 99111-5544',
      sourceType: 'Telegram',
      lastMessageText: 'Olá equipe Rafa Arts, preciso de 50 camisetas personalizadas com estampa em silk-screen para evento.',
      status: 'ENTRADA',
      estimatedValue: 1600,
      waitingSince: new Date(Date.now() - 3 * 60000).toISOString(),
      lastInteractionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const handleSyncWhatsApp = async () => {
    if (!currentCompany) return;
    setSyncStatus('syncing');
    
    const steps = [
      "Conectando às APIs Multicanais (WhatsApp, Insta, WebChat, FB, E-mail, Telegram)...",
      "Autenticando sessão Rafa Arts OmniChannel...",
      "Buscando mensagens pendentes em todos os canais...",
      "Importando contatos e direcionando para a etapa ENTRADA do CRM...",
      "Sincronização concluída com sucesso!"
    ];

    for (let i = 0; i < steps.length; i++) {
      setSyncMessage(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 650));
    }

    try {
      const { funnelId, funnelStageId } = await getInitialStageInfo();

      for (const sl of sampleLeadsData) {
        const exists = leads.some(l => l.phone === sl.phone);
        if (!exists) {
          await addDoc(collection(db, 'leads'), {
            companyId: currentCompany.id,
            funnelId,
            funnelStageId,
            ...sl,
            createdAt: new Date().toISOString()
          });

          let msgs: any[] = [];
          if (sl.fullName === 'Carlos Oliveira') {
            msgs = [
              { text: 'Olá, gostaria de saber os valores para impressão de panfletos 14x20cm e cartões de visita.', direction: 'incoming' },
              { text: 'Olá Carlos! Tudo bem? Fica R$ 450,00 o pacote com 1.000 panfletos e 500 cartões verniz localizado. Entrada de 50% no PIX.', direction: 'outgoing' },
              { text: 'Quero fechar o pedido de 1000 panfletos e 500 cartões. Como faço para pagar a entrada no PIX?', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Mariana Santos') {
            msgs = [
              { text: 'Oi! Vi a fachada em ACM com LED no Instagram da Rafa Arts e gostei muito da qualidade.', direction: 'incoming' },
              { text: 'Olá Mariana! Que ótimo! Produzimos e instalamos fachadas personalizadas em ACM com backlight LED. Qual a medida da loja?', direction: 'outgoing' },
              { text: 'Vocês fazem a instalação da fachada em ACM com LED no local em Goiânia? Qual o prazo?', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Gabriel Mendes') {
            msgs = [
              { text: 'Olá! Vi no site os serviços de impressão offset. Qual o valor para 5.000 panfletos da gráfica?', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Amanda Prado') {
            msgs = [
              { text: 'Boa tarde! Gostaria de um orçamento para 10 placas de sinalização comercial em acrílico.', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Ricardo Fonseca') {
            msgs = [
              { text: 'Prezados, solicitamos proposta técnica para envelopamento da frota comercial (5 utilitários).', direction: 'incoming' }
            ];
          } else {
            msgs = [
              { text: 'Olá equipe Rafa Arts, preciso de 50 camisetas personalizadas com estampa em silk-screen para evento.', direction: 'incoming' }
            ];
          }

          for (let index = 0; index < msgs.length; index++) {
            const m = msgs[index];
            await addDoc(collection(db, 'messages'), {
              companyId: currentCompany.id,
              phone: sl.phone,
              text: m.text,
              direction: m.direction,
              senderName: m.direction === 'outgoing' ? (user?.name || 'Rafa Arts Sistema') : sl.fullName,
              channel: sl.sourceType || 'WhatsApp',
              createdAt: Timestamp.fromDate(new Date(Date.now() - (msgs.length - index) * 600000))
            });
          }
        }
      }
      
      setSyncStatus('completed');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setSyncStatus('idle');
      alert('Erro ao sincronizar mensagens.');
    }
  };

  const handleSimulateIncomingMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !simName.trim() || !simMessage.trim()) return;

    try {
      await addDoc(collection(db, 'messages'), {
        companyId: currentCompany.id,
        phone: simPhone,
        text: simMessage,
        direction: 'incoming',
        senderName: simName,
        channel: simChannel,
        createdAt: Timestamp.now()
      });

      setIsSimulateModalOpen(false);
      alert(`Mensagem do canal [${simChannel}] recebida com sucesso!\nO lead "${simName}" foi gerado/atualizado automaticamente na etapa ENTRADA do Funil CRM.`);
    } catch (err) {
      console.error(err);
      alert('Erro ao simular envio de mensagem.');
    }
  };

  useEffect(() => {
    if (!currentCompany) return;
    const q = query(
      collection(db, 'leads'),
      where('companyId', '==', currentCompany.id),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, async (snap) => {
      const fetchedLeads = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      setLeads(fetchedLeads);

      if (pendingWhatsAppShare) {
        const target = fetchedLeads.find(l => l.id === pendingWhatsAppShare.leadId);
        if (target) {
          setSelectedChat({ ...target, name: target.fullName });
          setChatInitialDraft(pendingWhatsAppShare.prefillMessage);
          setPendingWhatsAppShare(null);
          return;
        }
      }

      if (fetchedLeads.length > 0 && !selectedChat) {
        setSelectedChat({ ...fetchedLeads[0], name: fetchedLeads[0].fullName });
      }

      // If database has no leads yet, auto-seed sample client conversations for all channels
      if (snap.empty) {
        const { funnelId, funnelStageId } = await getInitialStageInfo();

        for (const sl of sampleLeadsData) {
          await addDoc(collection(db, 'leads'), {
            companyId: currentCompany.id,
            funnelId,
            funnelStageId,
            ...sl,
            createdAt: new Date().toISOString()
          });

          let msgs: any[] = [];
          if (sl.fullName === 'Carlos Oliveira') {
            msgs = [
              { text: 'Olá, gostaria de saber os valores para impressão de panfletos 14x20cm e cartões de visita.', direction: 'incoming' },
              { text: 'Olá Carlos! Tudo bem? Fica R$ 450,00 o pacote com 1.000 panfletos e 500 cartões verniz localizado. Entrada de 50% no PIX.', direction: 'outgoing' },
              { text: 'Quero fechar o pedido de 1000 panfletos e 500 cartões. Como faço para pagar a entrada no PIX?', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Mariana Santos') {
            msgs = [
              { text: 'Oi! Vi a fachada em ACM com LED no Instagram da Rafa Arts e gostei muito da qualidade.', direction: 'incoming' },
              { text: 'Olá Mariana! Que ótimo! Produzimos e instalamos fachadas personalizadas em ACM com backlight LED. Qual a medida da loja?', direction: 'outgoing' },
              { text: 'Vocês fazem a installation da fachada em ACM com LED no local em Goiânia? Qual o prazo?', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Gabriel Mendes') {
            msgs = [
              { text: 'Olá! Vi no site os serviços de impressão offset. Qual o valor para 5.000 panfletos da gráfica?', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Amanda Prado') {
            msgs = [
              { text: 'Boa tarde! Gostaria de um orçamento para 10 placas de sinalização comercial em acrílico.', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Ricardo Fonseca') {
            msgs = [
              { text: 'Prezados, solicitamos proposta técnica para envelopamento da frota comercial (5 utilitários).', direction: 'incoming' }
            ];
          } else {
            msgs = [
              { text: 'Olá equipe Rafa Arts, preciso de 50 camisetas personalizadas com estampa em silk-screen para evento.', direction: 'incoming' }
            ];
          }

          for (let index = 0; index < msgs.length; index++) {
            const m = msgs[index];
            await addDoc(collection(db, 'messages'), {
              companyId: currentCompany.id,
              phone: sl.phone,
              text: m.text,
              direction: m.direction,
              senderName: m.direction === 'outgoing' ? (user?.name || 'Rafa Arts Sistema') : sl.fullName,
              channel: sl.sourceType || 'WhatsApp',
              createdAt: Timestamp.fromDate(new Date(Date.now() - (msgs.length - index) * 600000))
            });
          }
        }
      }
    });
  }, [currentCompany]);

  const unrepliedCount = leads.filter(l => l.waitingSince).length;

  const filteredLeads = leads
    .filter(l => 
      l.fullName.toLowerCase().includes(filter.toLowerCase()) || 
      l.phone.includes(filter)
    )
    .filter(l => {
      if (viewFilter === 'unreplied') {
        return !!l.waitingSince;
      }
      return true;
    });

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-8 animate-in fade-in slide-in-from-right-5 duration-500">
      <GlassCard className="w-96 p-0 overflow-hidden flex flex-col bg-white/5 border-white/10 shrink-0">
        <div className="p-6 border-b border-white/10 space-y-4">
           <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-1.5">
                 Conversas
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </h3>
              <div className="flex items-center gap-2">
                 <button 
                   type="button"
                   onClick={() => setIsSimulateModalOpen(true)}
                   className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary-500/20 border border-primary-500/40 text-primary-300 hover:bg-primary-500/30 text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95"
                   title="Simular Mensagem Recebida (Qualquer Canal)"
                 >
                   <MessageSquare size={10} />
                   <span>+ Simular</span>
                 </button>
                 <button 
                   type="button"
                   onClick={handleSyncWhatsApp}
                   disabled={syncStatus === 'syncing'}
                   className={cn(
                     "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95 disabled:pointer-events-none",
                     syncStatus === 'syncing' 
                       ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                       : syncStatus === 'completed'
                       ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 font-bold"
                       : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                   )}
                 >
                   <RefreshCw size={10} className={cn(syncStatus === 'syncing' && "animate-spin")} />
                   <span>{syncStatus === 'syncing' ? 'Buscando...' : syncStatus === 'completed' ? 'Sincronizado!' : 'Buscar'}</span>
                 </button>
              </div>
           </div>

           <div className="flex justify-between items-center gap-2">
              <div className="flex-1">
                 <Input icon={Search} placeholder="Filtrar chats..." value={filter} onChange={(e) => setFilter(e.target.value)} />
              </div>
              <div 
                onClick={() => setAutoTranscribe(!autoTranscribe)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-xl border cursor-pointer transition-all shrink-0 h-10 select-none",
                  autoTranscribe ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/10 text-white/30"
                )}
                title="Transcrição de Áudio Inteligente"
              >
                <div className={cn("w-1.5 h-1.5 rounded-full", autoTranscribe ? "bg-emerald-400 animate-pulse" : "bg-white/20")} />
                <span className="text-[9px] font-black uppercase tracking-widest">Transcrição: {autoTranscribe ? 'ON' : 'OFF'}</span>
              </div>
           </div>
           
           {/* SUB-TABS DO SISTEMA ANTI-VÁCUO */}
           <div className="flex gap-2">
              <button 
                onClick={() => setViewFilter('all')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5",
                  viewFilter === 'all' 
                    ? "bg-white/10 border-white/20 text-white" 
                    : "bg-transparent border-transparent text-white/40 hover:text-white/60"
                )}
              >
                Todos
                <span className="bg-white/10 text-white px-1.5 py-0.5 rounded text-[8px]">{leads.length}</span>
              </button>
              <button 
                onClick={() => setViewFilter('unreplied')}
                className={cn(
                  "flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 relative overflow-hidden",
                  viewFilter === 'unreplied' 
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                    : "bg-transparent border-transparent text-white/40 hover:text-white/60",
                  unrepliedCount > 0 && "animate-pulse"
                )}
              >
                <div className="flex items-center gap-1.5">
                   <span>Sem Resposta</span>
                   <span className={cn(
                     "px-1.5 py-0.5 rounded text-[8px] font-black",
                     unrepliedCount > 0 ? "bg-rose-500 text-white" : "bg-white/10 text-white/40"
                   )}>
                      {unrepliedCount}
                   </span>
                </div>
              </button>
           </div>
        </div>

        {/* ALERTA DE CLIENTES NO VÁCUO */}
        {unrepliedCount > 0 && viewFilter !== 'unreplied' && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between animate-pulse shrink-0">
             <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-rose-500/25 flex items-center justify-center text-rose-400">
                   <Clock size={12} className="animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <div>
                   <p className="text-[9px] font-black uppercase text-rose-400 leading-none mb-0.5">Alerta de Vácuo</p>
                   <p className="text-[8px] text-white/50">{unrepliedCount} {unrepliedCount === 1 ? 'cliente aguardando' : 'clientes aguardando'} resposta!</p>
                </div>
             </div>
             <Button 
               variant="ghost" 
               size="sm" 
               className="text-[8px] uppercase tracking-widest font-black h-6 px-2 text-rose-400 hover:bg-rose-500/20 border-rose-500/10"
               onClick={() => setViewFilter('unreplied')}
             >
                Filtrar
             </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {syncStatus === 'syncing' && (
            <div className="m-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col gap-2 animate-pulse">
               <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/25 flex items-center justify-center text-emerald-400">
                     <RefreshCw size={12} className="animate-spin" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase text-emerald-400 leading-none mb-1">WhatsApp Sync</p>
                     <p className="text-[9px] text-white/70 font-bold leading-none">{syncMessage}</p>
                  </div>
               </div>
               <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full w-2/3 animate-pulse" />
               </div>
            </div>
          )}

          {syncStatus === 'completed' && (
            <div className="m-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center gap-2 animate-in fade-in duration-300">
               <div className="w-5 h-5 rounded-full bg-emerald-400 text-slate-900 flex items-center justify-center font-black">
                  <Check size={10} />
               </div>
               <div>
                  <p className="text-[9px] font-black uppercase text-emerald-400 leading-none">Novas Conversas!</p>
                  <p className="text-[8px] text-white/50">WhatsApp sincronizado com sucesso.</p>
               </div>
            </div>
          )}

          {filteredLeads.map(l => {
            const lastUpdate = l.updatedAt instanceof Timestamp ? l.updatedAt.toDate() : new Date((l as any).updatedAt || Date.now());
            const timeStr = format(lastUpdate, 'HH:mm');
            const isSelected = selectedChat?.id === l.id;

            const waitingSinceDate = l.waitingSince 
              ? (l.waitingSince instanceof Timestamp ? l.waitingSince.toDate() : new Date(l.waitingSince)) 
              : null;
            
            let slaColor = "text-white/30";
            let slaLabel = "";
            let pulseBadge = false;

            if (waitingSinceDate) {
              const diffMinutes = Math.round((new Date().getTime() - waitingSinceDate.getTime()) / 60000);
              if (diffMinutes < 5) {
                slaColor = "text-sky-400 bg-sky-400/10 border-sky-400/20";
                slaLabel = `há ${diffMinutes} min`;
              } else if (diffMinutes < 15) {
                slaColor = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
                slaLabel = `há ${diffMinutes} min`;
              } else if (diffMinutes < 30) {
                slaColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                slaLabel = `ATENÇÃO: ${diffMinutes} min`;
                pulseBadge = true;
              } else if (diffMinutes < 60) {
                slaColor = "text-orange-500 bg-orange-500/10 border-orange-500/20";
                slaLabel = `ALERTA: ${diffMinutes} min`;
                pulseBadge = true;
              } else {
                const hours = Math.floor(diffMinutes / 60);
                slaColor = "text-rose-500 bg-rose-500/15 border-rose-500/20";
                slaLabel = `CRÍTICO: ${hours}h+ s/ resp`;
                pulseBadge = true;
              }
            }

            return (
              <div 
                key={l.id} 
                onClick={() => setSelectedChat({ ...l, name: l.fullName })}
                className={cn(
                  "p-3 border-b border-white/5 cursor-pointer transition-all group relative",
                  isSelected ? "bg-primary-500/10" : "hover:bg-white/5"
                )}
              >
                 {isSelected && <div className="absolute left-0 top-0 w-1 h-full bg-primary-500" />}
                 <div className="flex justify-between items-start mb-1 gap-2">
                    <div className="flex items-center gap-2 truncate">
                       <p className={cn("font-bold transition-colors truncate text-sm", isSelected ? "text-primary-300" : "text-white group-hover:text-primary-300")}>{l.fullName}</p>
                       {waitingSinceDate && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" title="Cliente aguardando resposta!" />
                       )}
                    </div>
                    <span className="text-[10px] font-black text-white/30 uppercase shrink-0">{timeStr}</span>
                 </div>
                 
                 <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs text-white/40 truncate flex-1">{l.lastMessageText || 'Sem mensagens'}</p>
                    {waitingSinceDate && (
                       <div className={cn(
                         "px-2 py-0.5 rounded-full text-[8.5px] font-black border uppercase tracking-wider leading-none shrink-0",
                         slaColor,
                         pulseBadge && "animate-pulse"
                       )}>
                          {slaLabel}
                       </div>
                    )}
                 </div>

                 <div className="mt-1.5 flex items-center gap-2">
                    <Badge variant="primary" className="px-2 py-0 h-5 text-[9px] uppercase font-black">
                      {l.status}
                    </Badge>
                    <div className="ml-auto flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                       <span className="text-[9px] text-white/40 font-bold">{l.sourceType || 'WhatsApp'}</span>
                       <div className="w-3 h-3 rounded-full bg-white/5 flex items-center justify-center">
                          <CheckCircle2 size={10} className="text-emerald-400" />
                       </div>
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
      
      <ChatPanel 
        conversation={selectedChat}
        currentCompany={currentCompany}
        user={user}
        onClose={() => setSelectedChat(null)}
        initialDraft={chatInitialDraft}
        onDraftConsumed={() => setChatInitialDraft('')}
      />

      {/* MODAL SIMULADOR DE MENSAGENS RECEBIDAS (TESTE MULTICANAL DE CRM) */}
      {isSimulateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <GlassCard className="max-w-lg w-full p-6 space-y-5 bg-slate-900 border-white/10 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Simular Mensagem Recebida</h3>
                  <p className="text-xs text-white/50">Teste a automação de entrada no CRM em qualquer canal</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsSimulateModalOpen(false)}
                className="text-white/40 hover:text-white text-sm font-bold p-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimulateIncomingMessage} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-white/60 tracking-wider mb-2 block">
                  Selecione o Canal de Entrada
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['WhatsApp', 'Instagram', 'WebChat', 'Facebook', 'E-mail', 'Telegram'] as const).map(ch => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => {
                        setSimChannel(ch);
                        if (ch === 'WhatsApp') setSimMessage('Olá! Quero orçamento de 1.000 panfletos e cartões de visita no WhatsApp.');
                        if (ch === 'Instagram') setSimMessage('Oi! Vi o post das fachadas em ACM no Instagram. Quanto custa m2?');
                        if (ch === 'WebChat') setSimMessage('Olá! Vi o site de vocês e gostaria de contratar adesivação de frota.');
                        if (ch === 'Facebook') setSimMessage('Boa tarde! Gostaria de cotação de 10 placas de sinalização acrílica.');
                        if (ch === 'E-mail') setSimMessage('Prezados, solicitamos proposta comercial para envelopamento de 5 veículos.');
                        if (ch === 'Telegram') setSimMessage('Olá! Vocês fazem camisetas personalizadas em silk-screen para evento?');
                      }}
                      className={cn(
                        "py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5",
                        simChannel === ch 
                          ? "bg-primary-500/20 border-primary-500 text-primary-300 shadow-lg shadow-primary-500/10" 
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        ch === 'WhatsApp' ? "bg-emerald-400" :
                        ch === 'Instagram' ? "bg-pink-400" :
                        ch === 'WebChat' ? "bg-sky-400" :
                        ch === 'Facebook' ? "bg-blue-400" :
                        ch === 'E-mail' ? "bg-amber-400" : "bg-indigo-400"
                      )} />
                      <span>{ch}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-white/60 tracking-wider mb-1 block">Nome do Cliente</label>
                  <Input 
                    value={simName} 
                    onChange={e => setSimName(e.target.value)} 
                    placeholder="Nome completo" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-white/60 tracking-wider mb-1 block">Telefone / Contato</label>
                  <Input 
                    value={simPhone} 
                    onChange={e => setSimPhone(e.target.value)} 
                    placeholder="(62) 99000-0000" 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-white/60 tracking-wider mb-1 block">Mensagem Recebida do Cliente</label>
                <textarea 
                  value={simMessage} 
                  onChange={e => setSimMessage(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary-500 min-h-[90px]"
                  placeholder="Digite o texto da mensagem enviada pelo cliente..."
                  required
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                <span>Ao receber, o sistema criará o Lead automaticamente na coluna <strong>ENTRADA</strong> do Funil CRM.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsSimulateModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" className="gap-2">
                  <Send size={14} />
                  <span>Receber no Sistema</span>
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

// --- META ADS ---
export const MetaAdsModule = ({ currentCompany }: { currentCompany: Company | null }) => {
  const [viewLevel, setViewLevel] = useState<'accounts' | 'campaigns' | 'adsets' | 'ads'>('accounts');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedAdSetId, setSelectedAdSetId] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<{ type: 'campaign' | 'adset' | 'ad', id?: string, isCreating?: boolean } | null>(null);

  const [accounts, setAccounts] = useState([
    { id: 'acc_1', fbAccountId: 'act_123456789', name: 'RPro Imobiliária Principal', currency: 'BRL', status: 'ACTIVE', spendMonth: 12500 },
    { id: 'acc_2', fbAccountId: 'act_987654321', name: 'RPro Gráfica Express', currency: 'BRL', status: 'ACTIVE', spendMonth: 4200 },
  ]);

  const [campaigns, setCampaigns] = useState([
    { id: 'cam_1', name: 'Lançamento Condomínio Aura', objective: 'LEADS', status: 'ACTIVE', budget: 500, budgetType: 'DAILY', spend: 8500, results: 245, cpl: 34.69 },
    { id: 'cam_2', name: 'Conversão Gráfica Premium', objective: 'OUTCOME_SALES', status: 'PAUSED', budget: 1500, budgetType: 'LIFETIME', spend: 1500, results: 42, cpl: 35.71 },
  ]);

  const [adsets, setAdsets] = useState([
    { id: 'set_1', name: 'Público Quente - Lookalike 1%', status: 'ACTIVE', dailyBudget: 150, optimizationGoal: 'LEADS' },
    { id: 'set_2', name: 'Interesses: Real Estate / Luxury', status: 'ACTIVE', dailyBudget: 100, optimizationGoal: 'LEADS' },
  ]);

  const [ads, setAds] = useState([
    { id: 'ad_1', name: 'Vídeo Imersivo Aura - v1', status: 'ACTIVE', creative: { title: 'Lançamento Aura' }, spend: 4500, results: 150 },
    { id: 'ad_2', name: 'Estático Fachada - v2', status: 'ACTIVE', creative: { title: 'Sua nova vida' }, spend: 2000, results: 50 },
  ]);

  // Stats for the top cards
  const stats = {
    spendToday: 1250.50,
    spendWeek: 8500.00,
    spendMonth: 32400.00,
    leads: 852,
    cpl: 38.02,
    roas: 4.2
  };

  // Breadcrumbs navigation
  const Breadcrumbs = () => (
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[2px] text-white/30 mb-4">
      <span 
        className={cn("cursor-pointer hover:text-white transition-colors", viewLevel === 'accounts' && "text-primary-300")}
        onClick={() => setViewLevel('accounts')}
      >
        Contas
      </span>
      {selectedAccountId && (
        <>
          <ArrowRight size={10} />
          <span 
            className={cn("cursor-pointer hover:text-white transition-colors", viewLevel === 'campaigns' && "text-primary-300")}
            onClick={() => setViewLevel('campaigns')}
          >
            Campanhas
          </span>
        </>
      )}
      {selectedCampaignId && (
        <>
          <ArrowRight size={10} />
          <span 
            className={cn("cursor-pointer hover:text-white transition-colors", viewLevel === 'adsets' && "text-primary-300")}
            onClick={() => setViewLevel('adsets')}
          >
            Conjuntos
          </span>
        </>
      )}
      {selectedAdSetId && (
        <>
          <ArrowRight size={10} />
          <span 
            className={cn("cursor-pointer hover:text-white transition-colors", viewLevel === 'ads' && "text-primary-300")}
          >
            Anúncios
          </span>
        </>
      )}
    </div>
  );

  const renderAccountsList = () => {
    const columns = [
      { key: 'name', label: 'Nome da Conta' },
      { key: 'fbAccountId', label: 'ID', render: (v: string) => <span className="font-mono text-[10px] opacity-40">{v}</span> },
      { key: 'currency', label: 'Moeda' },
      { key: 'status', label: 'Status', render: (v: string) => <Badge variant={v === 'ACTIVE' ? 'success' : 'outline'}>{v}</Badge> },
      { key: 'spendMonth', label: 'Gasto no Mês', render: (v: number) => `R$ ${v.toLocaleString('pt-BR')}` },
      { 
        key: 'actions', 
        label: '', 
        render: (_: any, row: any) => (
          <Button 
            variant="ghost" 
            size="sm" 
            icon={ArrowRight} 
            onClick={() => {
              setSelectedAccountId(row.id);
              setViewLevel('campaigns');
            }}
          >
            Abrir
          </Button>
        )
      }
    ];

    const data = [
      { id: 'acc_1', fbAccountId: 'act_123456789', name: 'RPro Imobiliária Principal', currency: 'BRL', status: 'ACTIVE', spendMonth: 12500 },
      { id: 'acc_2', fbAccountId: 'act_987654321', name: 'RPro Gráfica Express', currency: 'BRL', status: 'ACTIVE', spendMonth: 4200 },
    ];

    return (
      <GenericListView 
        title="Contas de Anúncio" 
        subtitle="Gerenciamento de contas Meta" 
        columns={columns} 
        data={accounts} 
        icon={Briefcase} 
        onAdd={() => setActiveDetail({ type: 'campaign', isCreating: true })} 
      />
    );
  };

  const renderCampaignsList = () => {
    const columns = [
      { key: 'name', label: 'Campanha' },
      { key: 'objective', label: 'Objetivo', render: (v: string) => <Badge variant="outline">{v}</Badge> },
      { key: 'status', label: 'Status', render: (v: string) => <Badge variant={v === 'ACTIVE' ? 'success' : 'outline'}>{v}</Badge> },
      { key: 'budget', label: 'Orçamento', render: (v: number, row: any) => `R$ ${v.toLocaleString('pt-BR')} (${row.budgetType === 'DAILY' ? 'Dia' : 'Total'})` },
      { key: 'spend', label: 'Gasto', render: (v: number) => `R$ ${v.toLocaleString('pt-BR')}` },
      { key: 'results', label: 'Resultados' },
      { key: 'cpl', label: 'CPL', render: (v: number) => `R$ ${v?.toFixed(2)}` },
      { 
        key: 'actions', 
        label: '', 
        render: (_: any, row: any) => (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              icon={ArrowRight} 
              onClick={() => {
                setSelectedCampaignId(row.id);
                setViewLevel('adsets');
              }}
            >
              Explorar
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              icon={Search} 
              onClick={() => setActiveDetail({ type: 'campaign', id: row.id })}
            >
              Editar
            </Button>
          </div>
        )
      }
    ];

    const data = [
      { id: 'cam_1', name: 'Lançamento Condomínio Aura', objective: 'LEADS', status: 'ACTIVE', budget: 500, budgetType: 'DAILY', spend: 8500, results: 245, cpl: 34.69 },
      { id: 'cam_2', name: 'Conversão Gráfica Premium', objective: 'OUTCOME_SALES', status: 'PAUSED', budget: 1500, budgetType: 'LIFETIME', spend: 1500, results: 42, cpl: 35.71 },
    ];

    return (
      <GenericListView 
        title="Campanhas" 
        subtitle="Listagem de campanhas da conta" 
        columns={columns} 
        data={campaigns} 
        icon={Target} 
        onAdd={() => setActiveDetail({ type: 'campaign', isCreating: true })} 
      />
    );
  };

  const renderAdSetsList = () => {
    const columns = [
      { key: 'name', label: 'Conjunto de Anúncios' },
      { key: 'status', label: 'Status', render: (v: string) => <Badge variant={v === 'ACTIVE' ? 'success' : 'outline'}>{v}</Badge> },
      { key: 'dailyBudget', label: 'Orc. Diário', render: (v: number) => v ? `R$ ${v.toLocaleString('pt-BR')}` : '-' },
      { key: 'optimizationGoal', label: 'Otimização', render: (v: string) => <Badge variant="outline">{v}</Badge> },
      { 
        key: 'actions', 
        label: '', 
        render: (_: any, row: any) => (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              icon={ArrowRight} 
              onClick={() => {
                setSelectedAdSetId(row.id);
                setViewLevel('ads');
              }}
            >
              Ver Anúncios
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              icon={Search} 
              onClick={() => setActiveDetail({ type: 'adset', id: row.id })}
            >
              Configurar
            </Button>
          </div>
        )
      }
    ];

    const data = [
      { id: 'set_1', name: 'Público Quente - Lookalike 1%', status: 'ACTIVE', dailyBudget: 150, optimizationGoal: 'LEADS' },
      { id: 'set_2', name: 'Interesses: Real Estate / Luxury', status: 'ACTIVE', dailyBudget: 100, optimizationGoal: 'LEADS' },
    ];

    return (
      <GenericListView 
        title="Conjuntos de Anúncios" 
        subtitle="Segmentação e orçamentos" 
        columns={columns} 
        data={adsets} 
        icon={Layers} 
        onAdd={() => setActiveDetail({ type: 'adset', isCreating: true })} 
      />
    );
  };

  const renderAdsList = () => {
    const columns = [
      { key: 'name', label: 'Anúncio' },
      { key: 'status', label: 'Status', render: (v: string) => <Badge variant={v === 'ACTIVE' ? 'success' : 'outline'}>{v}</Badge> },
      { key: 'creative', label: 'Criativo', render: (v: any) => <span className="text-[10px] opacity-40">{v.title}</span> },
      { key: 'spend', label: 'Gasto', render: (v: number) => `R$ ${v.toLocaleString('pt-BR')}` },
      { key: 'results', label: 'Resultados' },
      { 
        key: 'actions', 
        label: '', 
        render: (_: any, row: any) => (
          <Button 
            variant="ghost" 
            size="sm" 
            icon={Search} 
            onClick={() => setActiveDetail({ type: 'ad', id: row.id })}
          >
            Editar
          </Button>
        )
      }
    ];

    const data = [
      { id: 'ad_1', name: 'Vídeo Imersivo Aura - v1', status: 'ACTIVE', creative: { title: 'Lançamento Aura' }, spend: 4500, results: 150 },
      { id: 'ad_2', name: 'Estático Fachada - v2', status: 'ACTIVE', creative: { title: 'Sua nova vida' }, spend: 2000, results: 50 },
    ];

    return (
      <GenericListView 
        title="Anúncios" 
        subtitle="Peças e desempenho individual" 
        columns={columns} 
        data={ads} 
        icon={Zap} 
        onAdd={() => setActiveDetail({ type: 'ad', isCreating: true })} 
      />
    );
  };

  const MetaDetailDrawer = () => {
    if (!activeDetail) return null;
    const [activeTab, setActiveTab] = useState('resumo');
    
    // Find existing data if editing
    const existingData = activeDetail.isCreating ? null : (
      activeDetail.type === 'campaign' ? campaigns.find(c => c.id === activeDetail.id) :
      activeDetail.type === 'adset' ? adsets.find(a => a.id === activeDetail.id) :
      ads.find(a => a.id === activeDetail.id)
    );

    const [formData, setFormData] = useState<any>(existingData || { 
      name: '', 
      status: 'ACTIVE', 
      objective: 'LEADS',
      budget: 100,
      budgetType: 'DAILY',
      dailyBudget: 50,
      creative: { title: '' }
    });

    const handleSave = () => {
      if (activeDetail.isCreating) {
        const newId = `${activeDetail.type.slice(0, 3)}_${Date.now()}`;
        const newItem = { ...formData, id: newId };
        
        if (activeDetail.type === 'campaign') setCampaigns([...campaigns, newItem]);
        if (activeDetail.type === 'adset') setAdsets([...adsets, newItem]);
        if (activeDetail.type === 'ad') setAds([...ads, newItem]);
      } else {
        if (activeDetail.type === 'campaign') setCampaigns(campaigns.map(c => c.id === activeDetail.id ? { ...c, ...formData } : c));
        if (activeDetail.type === 'adset') setAdsets(adsets.map(a => a.id === activeDetail.id ? { ...a, ...formData } : a));
        if (activeDetail.type === 'ad') setAds(ads.map(a => a.id === activeDetail.id ? { ...a, ...formData } : a));
      }
      setActiveDetail(null);
    };

    const tabs = activeDetail.type === 'campaign' 
      ? ['resumo', 'conjuntos', 'anuncios', 'públicos', 'gastos', 'histórico']
      : activeDetail.type === 'adset'
      ? ['resumo', 'público', 'posicionamentos', 'orçamento', 'anuncios']
      : ['resumo', 'identidade', 'criativo', 'preview', 'rastreamento'];

    return (
      <Drawer 
        isOpen={!!activeDetail} 
        onClose={() => setActiveDetail(null)} 
        title={`${activeDetail.isCreating ? 'Criar' : 'Editar'} ${activeDetail.type === 'campaign' ? 'Campanha' : activeDetail.type === 'adset' ? 'Conjunto' : 'Anúncio'}`}
      >
        <div className="space-y-8">
           <div className="flex gap-2 p-1 bg-white/5 rounded-2xl overflow-x-auto custom-scrollbar">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase tracking-[2px] rounded-xl transition-all whitespace-nowrap",
                    activeTab === tab ? "bg-primary-500 text-white" : "text-white/40 hover:bg-white/10"
                  )}
                >
                  {tab}
                </button>
              ))}
           </div>

           <div className="space-y-6">
              {activeTab === 'resumo' && (
                <div className="grid grid-cols-1 gap-6">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-white/30">Nome</p>
                      <Input 
                        placeholder="Nome identificador..." 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-white/30">Status</p>
                        <select 
                          className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-xs outline-none focus:border-primary-500 transition-all font-bold"
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                          <option value="ACTIVE" className="bg-slate-900">ATIVO</option>
                          <option value="PAUSED" className="bg-slate-900">PAUSADO</option>
                          <option value="ARCHIVED" className="bg-slate-900">ARQUIVADO</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-white/30">Objetivo</p>
                        <select 
                          className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-xs outline-none focus:border-primary-500 transition-all font-bold"
                          value={formData.objective}
                          onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                        >
                          <option value="LEADS" className="bg-slate-900">GERAR LEADS</option>
                          <option value="TRAFFIC" className="bg-slate-900">TRÁFEGO</option>
                          <option value="CONVERSIONS" className="bg-slate-900">VENDAS</option>
                        </select>
                      </div>
                   </div>

                   {activeDetail.type === 'campaign' && (
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <p className="text-[10px] font-black uppercase text-white/30">Orçamento</p>
                           <Input 
                             type="number" 
                             value={formData.budget} 
                             onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })} 
                           />
                        </div>
                        <div className="space-y-2">
                           <p className="text-[10px] font-black uppercase text-white/30">Tipo</p>
                           <select 
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-xs outline-none focus:border-primary-500 transition-all font-bold"
                            value={formData.budgetType}
                            onChange={(e) => setFormData({ ...formData, budgetType: e.target.value })}
                          >
                            <option value="DAILY" className="bg-slate-900">DIÁRIO</option>
                            <option value="LIFETIME" className="bg-slate-900">VITALÍCIO</option>
                          </select>
                        </div>
                     </div>
                   )}

                   {activeDetail.type === 'adset' && (
                     <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-white/30">Orçamento Diário</p>
                        <Input 
                          type="number" 
                          value={formData.dailyBudget} 
                          onChange={(e) => setFormData({ ...formData, dailyBudget: Number(e.target.value) })} 
                        />
                     </div>
                   )}

                   {activeDetail.type === 'ad' && (
                     <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-white/30">Título do Criativo</p>
                        <Input 
                          value={formData.creative?.title || ''} 
                          onChange={(e) => setFormData({ ...formData, creative: { ...formData.creative, title: e.target.value } })} 
                        />
                     </div>
                   )}
                </div>
              )}

              {activeTab === 'posicionamentos' && (
                <div className="space-y-6">
                   <h4 className="text-sm font-bold text-white">Posicionamentos Manuais</h4>
                   <div className="grid grid-cols-1 gap-3">
                      {['Feed Instagram', 'Explore Instagram', 'Stories Instagram', 'Feed Facebook', 'Marketplace', 'Messenger'].map(p => (
                        <div key={p} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                           <span className="text-xs text-white/80 font-bold">{p}</span>
                           <div className="w-10 h-5 bg-primary-500 rounded-full flex items-center justify-end px-1"><div className="w-3 h-3 bg-white rounded-full shadow" /></div>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {activeTab === 'preview' && (
                <div className="space-y-8">
                   <div className="aspect-[9/16] max-w-[280px] mx-auto bg-slate-900 rounded-[40px] border-[8px] border-slate-800 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full p-4 flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center font-bold text-[10px]">R</div>
                         <p className="text-[10px] font-bold text-white">RPro Imobiliária</p>
                      </div>
                      <img src="https://picsum.photos/seed/apartment/1080/1920" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent space-y-2">
                         <h4 className="text-sm font-bold text-white">Últimas Unidades Aura!</h4>
                         <p className="text-xs text-white/60 line-clamp-2">Venha viver no melhor condomínio de alto padrão da região...</p>
                         <Button className="w-full">Saiba Mais</Button>
                      </div>
                   </div>
                   <div className="grid grid-cols-4 gap-2">
                      {['Feed', 'Story', 'Reels', 'Explore'].map(v => (
                        <button key={v} className="p-3 bg-white/5 rounded-xl border border-white/10 text-[8px] font-black uppercase tracking-widest hover:border-primary-500">
                          {v}
                        </button>
                      ))}
                   </div>
                </div>
              )}

              {(activeTab === 'público' || activeTab === 'públicos') && (
                <div className="space-y-6">
                   <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                      <div className="flex justify-between items-center"><h5 className="text-[10px] font-black uppercase text-primary-300">Público Estimado</h5><Badge variant="success">1.2M - 1.5M</Badge></div>
                      <div className="space-y-4">
                         <div className="space-y-1"><p className="text-[9px] text-white/30 uppercase font-black">Localização</p><p className="text-xs text-white">Brasil: São Paulo (+40km)</p></div>
                         <div className="space-y-1"><p className="text-[9px] text-white/30 uppercase font-black">Idade</p><p className="text-xs text-white">25 - 55 anos</p></div>
                         <div className="space-y-1"><p className="text-[9px] text-white/30 uppercase font-black">Interesses</p><p className="text-xs text-white">Imóveis de Luxo, Investimentos, Decoração</p></div>
                      </div>
                   </div>
                   <Button variant="secondary" icon={Search} className="w-full">Editar Segmentação</Button>
                </div>
              )}
           </div>

           <div className="flex gap-3 pt-10">
              <Button variant="secondary" className="flex-1" onClick={() => setActiveDetail(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSave}>Salvar Alterações</Button>
           </div>
        </div>
      </Drawer>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <SectionHeader 
        title="Meta Ads Intelligence" 
        subtitle="Central avançada de performance" 
        actions={
          <div className="flex gap-2">
             <Button variant="secondary" icon={RefreshCw}>Sincronizar</Button>
             <Button variant="secondary" icon={Bot}>AI Insights</Button>
             <Button 
               icon={Plus} 
               onClick={() => {
                 const typeMap: Record<string, 'campaign' | 'adset' | 'ad'> = {
                   'campaigns': 'campaign',
                   'adsets': 'adset',
                   'ads': 'ad',
                   'accounts': 'campaign' // Default to campaign if on accounts
                 };
                 setActiveDetail({ type: typeMap[viewLevel], isCreating: true });
               }}
             >
               Criar Novo
             </Button>
          </div>
        } 
      />

      <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5">
         <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase text-white/60">
               <Calendar size={14} />
               Este Mês
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase text-white/60">
               <Filter size={14} />
               Status: Ativos (12)
            </div>
         </div>
         <div className="flex items-center gap-4">
            <p className="text-[10px] font-black uppercase text-white/20">Última Sincronização: há 5 min</p>
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
               <Zap size={14} />
            </div>
         </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <GlassCard className="p-6">
           <p className="text-[10px] font-black uppercase text-white/30 mb-2">Gasto Hoje</p>
           <h4 className="text-3xl font-light text-white">R$ {stats.spendToday.toLocaleString('pt-BR')}</h4>
           <p className="text-[10px] text-emerald-400 font-bold mt-2">▲ 12% vs Ontem</p>
         </GlassCard>
         <GlassCard className="p-6">
           <p className="text-[10px] font-black uppercase text-white/30 mb-2">Leads Gerados</p>
           <h4 className="text-3xl font-light text-white">{stats.leads}</h4>
           <div className="flex gap-2 mt-2">
             <Badge variant="outline" className="text-[8px] opacity-50">12 Ativas</Badge>
             <Badge variant="outline" className="text-[8px] opacity-50">4 Pausadas</Badge>
           </div>
         </GlassCard>
         <GlassCard className="p-6">
           <p className="text-[10px] font-black uppercase text-white/30 mb-2">CPL Médio</p>
           <h4 className="text-3xl font-light text-primary-300">R$ {stats.cpl.toLocaleString('pt-BR')}</h4>
           <p className="text-[10px] text-red-400 font-bold mt-2">▼ 5% meta (R$ 40)</p>
         </GlassCard>
         <GlassCard className="p-6">
           <p className="text-[10px] font-black uppercase text-white/30 mb-2">ROAS Médio</p>
           <h4 className="text-3xl font-light text-emerald-400">{stats.roas}x</h4>
           <p className="text-[10px] text-white/20 font-black mt-2 uppercase tracking-widest">Alvo: 3.5x</p>
         </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <GlassCard className="lg:col-span-2 p-8 h-[300px]">
            <div className="flex items-center justify-between mb-6">
               <h5 className="text-[10px] font-black uppercase tracking-[2px] text-white/50">Gasto vs Leads (7D)</h5>
            </div>
            <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height="80%">
               <AreaChart data={[
                 { day: '01', spend: 400, leads: 12 }, { day: '02', spend: 350, leads: 15 },
                 { day: '03', spend: 600, leads: 22 }, { day: '04', spend: 450, leads: 18 },
                 { day: '05', spend: 800, leads: 30 }, { day: '06', spend: 750, leads: 25 },
                 { day: '07', spend: 1200, leads: 40 }
               ]}>
                 <XAxis dataKey="day" hide />
                 <Tooltip contentStyle={{ backgroundColor: '#1a2333', border: 'none', borderRadius: '12px' }} />
                 <Area type="monotone" dataKey="spend" stroke="#4cc9f0" fill="url(#colorLeads)" />
                 <Area type="monotone" dataKey="leads" stroke="#4361ee" fill="url(#colorSales)" />
               </AreaChart>
            </ResponsiveContainer>
            </ChartErrorBoundary>
         </GlassCard>
         <GlassCard className="p-8">
            <h5 className="text-[10px] font-black uppercase tracking-[2px] text-white/50 mb-6">Distribuição Verba</h5>
            <div className="space-y-4">
               {['Imobiliária High', 'Gráfica Express', 'Lançamento Aura'].map(acc => (
                 <div key={acc} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-white/80"><span>{acc}</span><span>45%</span></div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="w-[45%] h-full bg-primary-500" />
                    </div>
                 </div>
               ))}
            </div>
         </GlassCard>
      </div>

      <div className="space-y-4">
        <Breadcrumbs />
        {viewLevel === 'accounts' && renderAccountsList()}
        {viewLevel === 'campaigns' && renderCampaignsList()}
        {viewLevel === 'adsets' && renderAdSetsList()}
        {viewLevel === 'ads' && renderAdsList()}
      </div>

      <MetaDetailDrawer />
    </div>
  );
};

// --- PDV / POS ---
// Cronometro de contagem regressiva ate a previsao de entrega. Se ja passou da hora,
// para de contar e fica vermelho (nao fica contando "atraso" indefinidamente).
const EntregaCountdown = ({ scheduledFor }: { scheduledFor: string }) => {
  const target = new Date(scheduledFor).getTime();
  const [now, setNow] = useState(() => Date.now());
  const overdue = now >= target;

  useEffect(() => {
    if (overdue) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [overdue]);

  const diff = Math.max(0, target - now);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const countdownLabel = days > 0 ? `${days}d ${hours}h` : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <span
      className={cn(
        "hidden sm:inline text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0",
        overdue ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-primary-500/10 text-primary-300 border-primary-500/20"
      )}
    >
      Entrega: {safeFormat(scheduledFor, 'dd/MM HH:mm')} {overdue ? '· ATRASADO' : `· faltam ${countdownLabel}`}
    </span>
  );
};

export const POSModule = ({ currentCompany, addPendingOrder }: { currentCompany: Company | null, addPendingOrder: (order: SaleOrder) => void }) => {
  const { isRegisterOpen, setIsRegisterOpen, user, setActiveTab: setRootActiveTab, setPendingWhatsAppShare } = React.useContext(AppContext)!;
  const [activeTab, setActiveTabState] = useState<'venda' | 'historico' | 'estoque' | 'servicos' | 'orcamentos' | 'clientes' | 'contratos' | 'excluidos'>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('rpro_pos_subtab') : null;
    const validSubTabs = ['venda', 'historico', 'estoque', 'servicos', 'orcamentos', 'clientes', 'contratos', 'excluidos'];
    return (saved && validSubTabs.includes(saved)) ? (saved as any) : 'venda';
  });
  const setActiveTab = (tab: 'venda' | 'historico' | 'estoque' | 'servicos' | 'orcamentos' | 'clientes' | 'contratos' | 'excluidos') => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') localStorage.setItem('rpro_pos_subtab', tab);
  };
  const [cart, setCart] = useState<SaleOrderItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [dimensionModalProduct, setDimensionModalProduct] = useState<Product | null>(null);
  const [etiquetaModalProduct, setEtiquetaModalProduct] = useState<Product | null>(null);
  const emptyEtiquetaForm = { quantidade: 100, largura: 8, altura: 8, larguraMaterial: 0, metrosInput: 0, valorInput: 0 };
  const [etiquetaForm, setEtiquetaForm] = useState({ ...emptyEtiquetaForm });
  const [etiquetaInputMode, setEtiquetaInputMode] = useState<'quantidade' | 'metros' | 'valor'>('quantidade');
  const [dimWidth, setDimWidth] = useState<number | ''>('');
  const [dimHeight, setDimHeight] = useState<number | ''>('');
  const [dimLarguraMaterial, setDimLarguraMaterial] = useState<number>(0);

  // Insulfilm: modal proprio pra aproveitamento entre varias pecas da mesma nota (corte fisico do rolo)
  const [insulfilmModalProduct, setInsulfilmModalProduct] = useState<Product | null>(null);
  const [insulfilmLarguraMaterial, setInsulfilmLarguraMaterial] = useState<number>(1.5);
  const [insulfilmPecas, setInsulfilmPecas] = useState<{ id: string; largura: number; altura: number }[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [settlingOrder, setSettlingOrder] = useState<SaleOrder | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerModalIntent, setCustomerModalIntent] = useState<'finalize' | 'preselect' | 'orcamento'>('preselect');
  const [customerModalMode, setCustomerModalMode] = useState<'search' | 'create'>('search');

  // --- Pesquisa de clientes ---
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerSalesStats, setCustomerSalesStats] = useState<Record<string, { total: number; count: number; lastDate: string | null; hasPending: boolean; pendingBalance: number }>>({});
  const [customerSortBy, setCustomerSortBy] = useState<'recentes' | 'az' | 'ultima_compra' | 'maior_valor' | 'frequentes'>('recentes');

  // --- Cadastro (rápido + mais opções) ---
  const emptyCustomerForm = {
    full_name: '', cep: '', numero: '', email: '', logradouro: '', phone: '', distrito: '',
    nascimento: '', cpf_cnpj: '', city: '', state: '', complemento: '',
    limite_credito: '', patrimonios: [] as { propriedade: string; valor: string }[], notes: '',
  };
  const [newCustomerForm, setNewCustomerForm] = useState({ ...emptyCustomerForm });
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const customerNameInputRef = React.useRef<HTMLInputElement>(null);

  const proceedAfterCustomerStep = () => {
    setIsCustomerModalOpen(false);
    if (customerModalIntent === 'finalize') {
      setIsPaymentModalOpen(true);
    } else if (customerModalIntent === 'orcamento') {
      setOrcamentoModalOpen(true);
    }
  };

  const [customerLoadError, setCustomerLoadError] = useState<string>('');
  const loadAllCustomers = async () => {
    setIsLoadingCustomers(true);
    setCustomerLoadError('');
    try {
      const { data, error, count } = await supabase.from('clientes').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(2000);
      if (error) {
        console.error('Erro Supabase ao carregar clientes:', error);
        setCustomerLoadError(`Erro: ${error.message} (código: ${error.code || 's/código'})`);
        setAllCustomers([]);
        return;
      }
      console.log('Clientes carregados:', data?.length, 'count total:', count);
      setAllCustomers(data || []);
      // Agrega estatisticas de vendas por cliente (busca leve, so campos necessarios)
      const { data: vendasData } = await supabase.from('vendas').select('cliente_id, total, status, down_payment, created_at');
      const stats: Record<string, { total: number; count: number; lastDate: string | null; hasPending: boolean; pendingBalance: number }> = {};
      (vendasData || []).forEach((v: any) => {
        if (!v.cliente_id) return;
        if (!stats[v.cliente_id]) stats[v.cliente_id] = { total: 0, count: 0, lastDate: null, hasPending: false, pendingBalance: 0 };
        stats[v.cliente_id].total += Number(v.total) || 0;
        stats[v.cliente_id].count += 1;
        if (!stats[v.cliente_id].lastDate || new Date(v.created_at) > new Date(stats[v.cliente_id].lastDate!)) {
          stats[v.cliente_id].lastDate = v.created_at;
        }
        const down = Number(v.down_payment) || 0;
        const vTotal = Number(v.total) || 0;
        const balance = Math.max(0, vTotal - down);
        if ((v.status === 'pending' || balance > 0) && v.status !== 'canceled') {
          stats[v.cliente_id].hasPending = true;
          stats[v.cliente_id].pendingBalance += balance;
        }
      });
      setCustomerSalesStats(stats);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    if (isCustomerModalOpen && customerModalMode === 'search') {
      loadAllCustomers();
    }
  }, [isCustomerModalOpen, customerModalMode]);

  useEffect(() => {
    if (isCustomerModalOpen && customerModalMode === 'create') {
      setTimeout(() => customerNameInputRef.current?.focus(), 50);
    }
  }, [isCustomerModalOpen, customerModalMode]);

  const filteredSortedCustomers = useMemo(() => {
    let list = allCustomers;
    const term = customerSearchTerm.trim().toLowerCase();
    if (term) {
      const digits = term.replace(/\D/g, '');
      list = list.filter(c =>
        (c.full_name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.cpf_cnpj || '').toLowerCase().includes(term) ||
        (digits.length >= 3 && (c.phone || '').replace(/\D/g, '').includes(digits))
      );
    }
    const withStats = list.map(c => ({ ...c, _stats: customerSalesStats[c.id] }));
    switch (customerSortBy) {
      case 'az':
        return withStats.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      case 'ultima_compra':
        return withStats.sort((a, b) => {
          const da = a._stats?.lastDate ? new Date(a._stats.lastDate).getTime() : 0;
          const db = b._stats?.lastDate ? new Date(b._stats.lastDate).getTime() : 0;
          return db - da;
        });
      case 'maior_valor':
        return withStats.sort((a, b) => (b._stats?.total || 0) - (a._stats?.total || 0));
      case 'frequentes':
        return withStats.sort((a, b) => (b._stats?.count || 0) - (a._stats?.count || 0));
      default:
        return withStats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [allCustomers, customerSearchTerm, customerSortBy, customerSalesStats]);

  const handleCepLookup = async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setIsLookingUpCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setNewCustomerForm(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          distrito: data.bairro || prev.distrito,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
    } finally {
      setIsLookingUpCep(false);
    }
  };

  const addPatrimonioRow = () => {
    setNewCustomerForm(prev => ({ ...prev, patrimonios: [...prev.patrimonios, { propriedade: '', valor: '' }] }));
  };
  const updatePatrimonioRow = (idx: number, field: 'propriedade' | 'valor', value: string) => {
    setNewCustomerForm(prev => {
      const next = [...prev.patrimonios];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, patrimonios: next };
    });
  };
  const removePatrimonioRow = (idx: number) => {
    setNewCustomerForm(prev => ({ ...prev, patrimonios: prev.patrimonios.filter((_, i) => i !== idx) }));
  };

  const startEditCustomer = (c: any) => {
    setEditingCustomerId(c.id);
    setNewCustomerForm({
      full_name: c.full_name || '', cep: c.cep || '', numero: c.numero || '', email: c.email || '',
      logradouro: c.logradouro || '', phone: c.phone || '', distrito: c.distrito || '',
      nascimento: c.nascimento || '', cpf_cnpj: c.cpf_cnpj || '', city: c.city || '', state: c.state || '',
      complemento: c.complemento || '', limite_credito: c.limite_credito ? String(c.limite_credito) : '',
      patrimonios: Array.isArray(c.patrimonios) ? c.patrimonios : [], notes: c.notes || '',
    });
    setIsMoreOptionsOpen(true);
    setCustomerModalMode('create');
  };

  const handleCreateCustomerInline = async () => {
    if (!newCustomerForm.full_name.trim()) {
      alert('Digite o nome do cliente.');
      return;
    }
    setIsCreatingCustomer(true);
    try {
      const payload = {
        full_name: newCustomerForm.full_name,
        phone: newCustomerForm.phone || null,
        email: newCustomerForm.email || null,
        cep: newCustomerForm.cep || null,
        numero: newCustomerForm.numero || null,
        logradouro: newCustomerForm.logradouro || null,
        distrito: newCustomerForm.distrito || null,
        nascimento: newCustomerForm.nascimento || null,
        cpf_cnpj: newCustomerForm.cpf_cnpj || null,
        city: newCustomerForm.city || null,
        state: newCustomerForm.state || null,
        complemento: newCustomerForm.complemento || null,
        limite_credito: newCustomerForm.limite_credito ? Number(newCustomerForm.limite_credito) : 0,
        patrimonios: newCustomerForm.patrimonios.filter(p => p.propriedade.trim()),
        notes: newCustomerForm.notes || null,
      };
      let data, error;
      if (editingCustomerId) {
        ({ data, error } = await supabase.from('clientes').update(payload).eq('id', editingCustomerId).select().single());
      } else {
        ({ data, error } = await supabase.from('clientes').insert(payload).select().single());
      }
      if (error) throw error;
      setSelectedCustomer({ id: data.id, name: data.full_name, phone: data.phone || '' });
      setNewCustomerForm({ ...emptyCustomerForm });
      setIsMoreOptionsOpen(false);
      setEditingCustomerId(null);
      setCustomerModalMode('search');
      if (!editingCustomerId) {
        proceedAfterCustomerStep();
      } else {
        loadAllCustomers();
      }
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      alert('Não foi possível salvar o cliente.');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleDeleteCustomer = async (c: any) => {
    if (!confirm(`Excluir o cliente "${c.full_name}"? Essa ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('clientes').delete().eq('id', c.id);
    if (error) { alert('Não foi possível excluir o cliente.'); return; }
    loadAllCustomers();
  };

  const handleViewCustomerHistory = (c: any) => {
    const stats = customerSalesStats[c.id];
    if (!stats) { alert(`${c.full_name} ainda não tem vendas registradas.`); return; }
    alert(`Histórico de ${c.full_name}\n\nTotal de compras: ${stats.count}\nValor total: R$ ${stats.total.toFixed(2).replace('.', ',')}\nÚltima compra: ${stats.lastDate ? format(new Date(stats.lastDate), 'dd/MM/yyyy') : '—'}`);
  };

  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastFinalizedOrder, setLastFinalizedOrder] = useState<SaleOrder | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string, name: string, phone: string } | null>(null);
  const [linkedOrcamentoId, setLinkedOrcamentoId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'misto'>('pix');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [downPayment, setDownPayment] = useState(0);
  const [scheduledFor, setScheduledFor] = useState('');
  const [orderObservacoes, setOrderObservacoes] = useState('');

  // Multiplas formas de pagamento na mesma venda
  const PAYMENT_METHOD_OPTIONS: { id: PaymentEntry['method']; label: string; icon: any }[] = [
    { id: 'pix', label: 'Pix', icon: QrCode },
    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
    { id: 'cartao_debito', label: 'Débito', icon: Smartphone },
    { id: 'cartao_credito', label: 'Crédito', icon: CreditCard },
    { id: 'transferencia', label: 'Transferência', icon: ArrowDownWideNarrow },
    { id: 'boleto', label: 'Boleto', icon: FileText },
    { id: 'crediario', label: 'Crediário', icon: Calculator },
  ];
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentEntry['method']>('pix');
  const [newPaymentMode, setNewPaymentMode] = useState<'valor' | 'percentual'>('valor');
  const [newPaymentInput, setNewPaymentInput] = useState<number | ''>('');
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<string>('');
  const [pixQrAmount, setPixQrAmount] = useState<number>(0);
  const paymentEntriesTotal = paymentEntries.reduce((sum, p) => sum + (p.value || 0), 0);

  const resetPaymentEntries = () => {
    setPaymentEntries([]);
    setIsAddPaymentOpen(false);
    setNewPaymentInput('');
    setNewPaymentMode('valor');
    setPendingPaymentMethod('');
  };

  const openAddPayment = () => {
    setNewPaymentMethod('pix');
    setNewPaymentMode('valor');
    setNewPaymentInput('');
    setIsAddPaymentOpen(true);
  };
  const [isVerifying, setIsVerifying] = useState(false);
  const [salesToday, setSalesToday] = useState<SaleOrder[]>([]);
  const [allSalesHistory, setAllSalesHistory] = useState<SaleOrder[]>([]);

  // ===== Orçamentos =====
  const [allOrcamentos, setAllOrcamentos] = useState<Orcamento[]>([]);
  const [isLoadingOrcamentos, setIsLoadingOrcamentos] = useState(false);
  const [orcamentoModalOpen, setOrcamentoModalOpen] = useState(false);
  const [editingOrcamento, setEditingOrcamento] = useState<Orcamento | null>(null);
  const emptyOrcamentoForm = {
    clienteId: undefined as string | undefined,
    customerName: '', cpfCnpj: '', phone: '', address: '', responsavel: '',
    items: [] as SaleOrderItem[], desconto: 0, observacoes: '',
    prazoProducao: 'Prazo de produção de até 5 dias úteis após confirmação do pagamento da entrada e aprovação da arte. O prazo de produção não é prazo de pagamento.',
    prazoDias: 5, prazoTipo: 'uteis' as 'uteis' | 'corridos', prazoGatilho: 'pagamento_entrada' as 'aprovacao' | 'pagamento_entrada' | 'aprovacao_arte' | 'entrega_material' | 'personalizado', prazoDataPrevista: '',
    prazoPagamentoTexto: 'O saldo deverá ser quitado no momento da conclusão do serviço e antes da entrega ou retirada do material. Eventual prazo posterior de pagamento somente será válido quando previamente autorizado e registrado neste orçamento.',
    condicaoEntregaTexto: 'Entrega/retirada liberada somente após a quitação integral do valor, salvo autorização expressa em contrário.',
    formaPagamentoTexto: 'Entrada de 50% para iniciar a produção e saldo de 50% na conclusão do serviço, antes da entrega ou retirada.',
    multaJurosTexto: 'Em caso de atraso no pagamento, incidirá multa de 2% sobre o valor em aberto, acrescida de juros de 1% ao mês (pro rata die), sem prejuízo de eventual correção monetária.',
    garantiaTexto: 'Garantia de 90 dias para defeitos de fabricação/impressão, não cobrindo desgaste natural, mau uso, exposição inadequada ou danos causados por terceiros. Consulte o Código de Defesa do Consumidor (CDC) para direitos aplicáveis.',
    politicaCancelamentoTexto: 'Cancelamento antes do início da produção: reembolso integral, descontadas eventuais despesas já realizadas. Após o início da produção ou para itens personalizados, não há reembolso dos valores já investidos em material e mão de obra.',
    entradaPercentual: 50, entradaValor: 0, entradaModo: 'percentual' as 'percentual' | 'valor', validade: '',
    formasPagamento: [] as OrcamentoPagamento[],
    politicaPagamento: 'entrada_restante_entrega' as 'sem_entrada' | 'entrada_fixa' | 'entrada_percentual' | 'pagamento_integral' | 'entrada_restante_entrega' | 'entrada_parcelas',
    entradaObrigatoria: true,
    pagamentoPosteriorAutorizado: false, pagamentoPosteriorData: '', pagamentoPosteriorDias: 0,
    pagamentoPosteriorCondicao: '', pagamentoPosteriorResponsavel: '',
    multaPercentual: 2, jurosModo: 'mensal' as 'mensal' | 'diario', jurosPercentual: 1, diasTolerancia: 0,
  };
  const [orcamentoForm, setOrcamentoForm] = useState({ ...emptyOrcamentoForm });
  const [savingOrcamento, setSavingOrcamento] = useState(false);
  const [orcamentoFromCart, setOrcamentoFromCart] = useState(false);
  const [orcamentoItemsEditMode, setOrcamentoItemsEditMode] = useState(false);

  const handleReturnItemsToOrcamento = () => {
    setOrcamentoForm(prev => ({ ...prev, items: [...cart] }));
    setCart([]);
    setOrcamentoItemsEditMode(false);
    setActiveTab('orcamentos');
    setOrcamentoModalOpen(true);
  };
  const [highlightOrcamentoId, setHighlightOrcamentoId] = useState<string | null>(null);

  const loadOrcamentos = async () => {
    setIsLoadingOrcamentos(true);
    try {
      const { data } = await supabase.from('orcamentos').select('*').order('created_at', { ascending: false });
      setAllOrcamentos((data || []).map(mapOrcamentoRow));
    } catch (err) {
      console.error('Erro ao carregar orçamentos:', err);
    } finally {
      setIsLoadingOrcamentos(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orcamentos') loadOrcamentos();
  }, [activeTab]);

  const openNewOrcamento = () => {
    setEditingOrcamento(null);
    setOrcamentoFromCart(false);
    setOrcamentoForm({ ...emptyOrcamentoForm });
    setOrcamentoModalOpen(true);
  };

  const handleCreateOrcamentoFromCart = () => {
    if (cart.length === 0) { alert('Adicione ao menos um item antes de criar o orçamento.'); return; }
    setEditingOrcamento(null);
    setOrcamentoFromCart(true);
    setOrcamentoForm({
      ...emptyOrcamentoForm,
      clienteId: selectedCustomer?.id,
      customerName: selectedCustomer?.name || '',
      phone: selectedCustomer?.phone || '',
      items: [...cart],
    });
    setOrcamentoModalOpen(true);
  };

  const openEditOrcamento = (o: Orcamento) => {
    setEditingOrcamento(o);
    setOrcamentoForm({
      clienteId: o.clienteId,
      customerName: o.customerName || '', cpfCnpj: o.cpfCnpj || '', phone: o.phone || '',
      address: o.address || '', responsavel: o.responsavel || '', items: [...o.items],
      desconto: o.desconto, observacoes: o.observacoes || '', prazoProducao: o.prazoProducao || '',
      prazoDias: o.prazoDias || 5, prazoTipo: o.prazoTipo || 'uteis', prazoGatilho: o.prazoGatilho || 'pagamento_entrada', prazoDataPrevista: o.prazoDataPrevista || '',
      prazoPagamentoTexto: o.prazoPagamentoTexto || '', condicaoEntregaTexto: o.condicaoEntregaTexto || '',
      formaPagamentoTexto: o.formaPagamentoTexto || '', multaJurosTexto: o.multaJurosTexto || '',
      garantiaTexto: o.garantiaTexto || '', politicaCancelamentoTexto: o.politicaCancelamentoTexto || '',
      entradaPercentual: o.entradaPercentual || 0, entradaValor: o.entradaValor || 0,
      entradaModo: (o.entradaValor && o.entradaValor > 0 && !o.entradaPercentual) ? 'valor' : 'percentual',
      formasPagamento: o.formasPagamento ? [...o.formasPagamento] : [],
      politicaPagamento: o.politicaPagamento || 'entrada_restante_entrega',
      entradaObrigatoria: o.entradaObrigatoria !== undefined ? o.entradaObrigatoria : true,
      pagamentoPosteriorAutorizado: !!o.pagamentoPosteriorAutorizado,
      pagamentoPosteriorData: o.pagamentoPosteriorData || '',
      pagamentoPosteriorDias: o.pagamentoPosteriorDias || 0,
      pagamentoPosteriorCondicao: o.pagamentoPosteriorCondicao || '',
      pagamentoPosteriorResponsavel: o.pagamentoPosteriorResponsavel || '',
      multaPercentual: o.multaPercentual !== undefined ? o.multaPercentual : 2,
      jurosModo: o.jurosModo || 'mensal', jurosPercentual: o.jurosPercentual !== undefined ? o.jurosPercentual : 1,
      diasTolerancia: o.diasTolerancia || 0,
      validade: o.validade || '',
    });
    setOrcamentoModalOpen(true);
  };

  const orcamentoItemsTotal = () => orcamentoForm.items.reduce((sum, i) => sum + (i.area ? i.price * i.area * i.quantity : i.price * i.quantity), 0);

  const PRAZO_GATILHO_LABELS: Record<string, string> = {
    aprovacao: 'após a aprovação deste orçamento',
    pagamento_entrada: 'após a confirmação do pagamento da entrada',
    aprovacao_arte: 'após a aprovação da arte pelo cliente',
    entrega_material: 'após a entrega dos materiais pelo cliente',
  };

  const buildPrazoTexto = (dias: number, tipo: 'uteis' | 'corridos', gatilho: string) => {
    const tipoLabel = tipo === 'uteis' ? 'dias úteis' : 'dias corridos';
    const gatilhoLabel = PRAZO_GATILHO_LABELS[gatilho] || '';
    return `Prazo de produção de até ${dias} ${tipoLabel} ${gatilhoLabel}. O prazo de produção NÃO é o prazo de pagamento — são condições independentes.`;
  };

  const updatePrazoStructured = (patch: Partial<typeof orcamentoForm>) => {
    setOrcamentoForm(prev => {
      const next = { ...prev, ...patch };
      if (next.prazoGatilho !== 'personalizado') {
        next.prazoProducao = buildPrazoTexto(next.prazoDias, next.prazoTipo, next.prazoGatilho);
      }
      return next;
    });
  };

  const ORCAMENTO_PAGAMENTO_LABELS: Record<string, string> = {
    pix: 'Pix', dinheiro: 'Dinheiro', cartao_debito: 'Cartão de Débito', cartao_credito: 'Cartão de Crédito',
    cartao_parcelado: 'Cartão Parcelado', transferencia: 'Transferência', boleto: 'Boleto', outra: 'Outra',
  };

  const POLITICA_PAGAMENTO_LABELS: Record<string, string> = {
    sem_entrada: 'Sem Entrada',
    entrada_fixa: 'Entrada Fixa (R$)',
    entrada_percentual: 'Entrada Percentual (%)',
    pagamento_integral: 'Pagamento Integral Antecipado',
    entrada_restante_entrega: 'Entrada + Restante na Entrega',
    entrada_parcelas: 'Entrada + Parcelas',
  };

  const buildPoliticaPagamentoTexto = (politica: string, entradaTexto: string, obrigatoria: boolean) => {
    const obrigaTxt = obrigatoria ? ' O pagamento da entrada é condição obrigatória para o início da produção — a produção só começa após a confirmação desse pagamento.' : '';
    const quandoEntrada = ` A entrada deve ser paga no ato da aprovação deste orçamento.`;
    switch (politica) {
      case 'sem_entrada':
        return `Não é exigida entrada. A produção tem início após a aprovação deste orçamento. O valor total deverá ser pago conforme condição definida no Prazo de Pagamento.`;
      case 'pagamento_integral':
        return `Pagamento integral antecipado, no valor de R$ ${(Math.max(0, orcamentoItemsTotal() - (orcamentoForm.desconto || 0))).toFixed(2).replace('.', ',')}, devido no ato da aprovação deste orçamento e antes do início da produção.`;
      case 'entrada_fixa':
      case 'entrada_percentual':
        return `Entrada de ${entradaTexto} para iniciar a produção.${quandoEntrada}${obrigaTxt}`;
      case 'entrada_restante_entrega':
        return `Entrada de ${entradaTexto} para iniciar a produção.${quandoEntrada}${obrigaTxt} O saldo restante (R$ ${orcamentoSaldoRestante().toFixed(2).replace('.', ',')}) deverá ser quitado no momento da conclusão do serviço e antes da entrega ou retirada do material.`;
      case 'entrada_parcelas':
        return `Entrada de ${entradaTexto} para iniciar a produção.${quandoEntrada}${obrigaTxt} O saldo restante (R$ ${orcamentoSaldoRestante().toFixed(2).replace('.', ',')}) será pago em parcelas, conforme detalhado nas formas de pagamento abaixo, e o material só será liberado após a quitação integral, salvo autorização em contrário.`;
      default:
        return '';
    }
  };

  const orcamentoEntradaValorCalc = () => {
    const totalItens = Math.max(0, orcamentoItemsTotal() - (orcamentoForm.desconto || 0));
    return orcamentoForm.entradaModo === 'percentual'
      ? (totalItens * (orcamentoForm.entradaPercentual || 0)) / 100
      : (orcamentoForm.entradaValor || 0);
  };

  const orcamentoFormasPagamentoTotal = () => orcamentoForm.formasPagamento.reduce((sum, f) => sum + (f.valor || 0), 0);

  const orcamentoSaldoRestante = () => {
    const totalItens = Math.max(0, orcamentoItemsTotal() - (orcamentoForm.desconto || 0));
    return Math.max(0, totalItens - orcamentoEntradaValorCalc() - orcamentoFormasPagamentoTotal());
  };

  const addOrcamentoFormaPagamento = () => {
    setOrcamentoForm(prev => ({
      ...prev,
      formasPagamento: [...prev.formasPagamento, { metodo: 'pix', valor: 0 } as OrcamentoPagamento],
    }));
  };

  const updateOrcamentoFormaPagamento = (idx: number, patch: Partial<OrcamentoPagamento>) => {
    setOrcamentoForm(prev => ({
      ...prev,
      formasPagamento: prev.formasPagamento.map((f, i) => i === idx ? { ...f, ...patch } : f),
    }));
  };

  const removeOrcamentoFormaPagamento = (idx: number) => {
    setOrcamentoForm(prev => ({ ...prev, formasPagamento: prev.formasPagamento.filter((_, i) => i !== idx) }));
  };

  const updatePoliticaPagamento = (patch: { politicaPagamento?: any; entradaObrigatoria?: boolean; entradaModo?: 'percentual' | 'valor'; entradaPercentual?: number; entradaValor?: number }) => {
    setOrcamentoForm(prev => {
      const next = { ...prev, ...patch };
      const entradaTexto = next.entradaModo === 'percentual' ? `${next.entradaPercentual || 0}%` : `R$ ${(next.entradaValor || 0).toFixed(2).replace('.', ',')}`;
      next.formaPagamentoTexto = buildPoliticaPagamentoTexto(next.politicaPagamento, entradaTexto, next.entradaObrigatoria);
      return next;
    });
  };

  const buildMultaJurosTexto = (multaPct: number, jurosModo: string, jurosPct: number, tolerancia: number) => {
    const toleranciaTxt = tolerancia > 0 ? ` após ${tolerancia} dia(s) de tolerância` : '';
    const jurosTxt = jurosModo === 'diario' ? `${jurosPct}% ao dia` : `${jurosPct}% ao mês (pro rata die)`;
    return `Em caso de atraso no pagamento${toleranciaTxt}, incidirá multa de ${multaPct}% sobre o valor em aberto, acrescida de juros de ${jurosTxt}, calculados automaticamente sobre o saldo devedor até a data da efetiva quitação, sem prejuízo de eventual correção monetária.`;
  };

  const updateMultaJuros = (patch: { multaPercentual?: number; jurosModo?: 'mensal' | 'diario'; jurosPercentual?: number; diasTolerancia?: number }) => {
    setOrcamentoForm(prev => {
      const next = { ...prev, ...patch };
      next.multaJurosTexto = buildMultaJurosTexto(next.multaPercentual, next.jurosModo, next.jurosPercentual, next.diasTolerancia);
      return next;
    });
  };

  // Calculadora de atraso: dado um saldo e dias em atraso, calcula multa + juros e o valor atualizado
  const calcularAtraso = (saldo: number, diasAtraso: number) => {
    const dias = orcamentoForm.diasTolerancia || 0;
    const diasEfetivos = Math.max(0, diasAtraso - dias);
    if (diasEfetivos <= 0) return { multa: 0, juros: 0, total: saldo, diasEfetivos: 0 };
    const multa = saldo * ((orcamentoForm.multaPercentual || 0) / 100);
    const taxaDiaria = orcamentoForm.jurosModo === 'diario'
      ? (orcamentoForm.jurosPercentual || 0) / 100
      : (orcamentoForm.jurosPercentual || 0) / 100 / 30;
    const juros = saldo * taxaDiaria * diasEfetivos;
    return { multa, juros, total: saldo + multa + juros, diasEfetivos };
  };

  const [simuladorDias, setSimuladorDias] = useState(10);

  const handleSaveOrcamento = async () => {
    if (!orcamentoForm.customerName.trim()) { alert('Informe o nome do cliente.'); return; }
    if (orcamentoForm.items.length === 0) { alert('Adicione ao menos um item.'); return; }
    setSavingOrcamento(true);
    try {
      const total = Math.max(0, orcamentoItemsTotal() - (orcamentoForm.desconto || 0));
      const payload = {
        cliente_id: orcamentoForm.clienteId || null,
        customer_name: orcamentoForm.customerName,
        cpf_cnpj: orcamentoForm.cpfCnpj || null,
        phone: orcamentoForm.phone || null,
        address: orcamentoForm.address || null,
        responsavel: orcamentoForm.responsavel || null,
        items: orcamentoForm.items,
        desconto: orcamentoForm.desconto || 0,
        total,
        observacoes: orcamentoForm.observacoes || null,
        prazo_producao: orcamentoForm.prazoProducao || null,
        prazo_dias: orcamentoForm.prazoDias || null,
        prazo_tipo: orcamentoForm.prazoTipo || 'uteis',
        prazo_gatilho: orcamentoForm.prazoGatilho || 'aprovacao',
        prazo_data_prevista: orcamentoForm.prazoDataPrevista || null,
        prazo_pagamento_texto: orcamentoForm.prazoPagamentoTexto || null,
        condicao_entrega_texto: orcamentoForm.condicaoEntregaTexto || null,
        forma_pagamento_texto: orcamentoForm.formaPagamentoTexto || null,
        multa_juros_texto: orcamentoForm.multaJurosTexto || null,
        garantia_texto: orcamentoForm.garantiaTexto || null,
        politica_cancelamento_texto: orcamentoForm.politicaCancelamentoTexto || null,
        entrada_percentual: orcamentoForm.entradaModo === 'percentual' ? (orcamentoForm.entradaPercentual || null) : null,
        entrada_valor: orcamentoForm.entradaModo === 'valor' ? (orcamentoForm.entradaValor || null) : null,
        formas_pagamento: orcamentoForm.formasPagamento,
        politica_pagamento: orcamentoForm.politicaPagamento,
        entrada_obrigatoria: orcamentoForm.entradaObrigatoria,
        pagamento_posterior_autorizado: orcamentoForm.pagamentoPosteriorAutorizado,
        pagamento_posterior_data: orcamentoForm.pagamentoPosteriorAutorizado ? (orcamentoForm.pagamentoPosteriorData || null) : null,
        pagamento_posterior_dias: orcamentoForm.pagamentoPosteriorAutorizado ? (orcamentoForm.pagamentoPosteriorDias || null) : null,
        pagamento_posterior_condicao: orcamentoForm.pagamentoPosteriorAutorizado ? (orcamentoForm.pagamentoPosteriorCondicao || null) : null,
        pagamento_posterior_responsavel: orcamentoForm.pagamentoPosteriorAutorizado ? (orcamentoForm.pagamentoPosteriorResponsavel || null) : null,
        multa_percentual: orcamentoForm.multaPercentual,
        juros_modo: orcamentoForm.jurosModo,
        juros_percentual: orcamentoForm.jurosPercentual,
        dias_tolerancia: orcamentoForm.diasTolerancia,
        validade: orcamentoForm.validade || null,
      };
      let newId: string | null = null;
      if (editingOrcamento) {
        const { error } = await supabase.from('orcamentos').update(payload).eq('id', editingOrcamento.id);
        if (error) throw error;
      } else {
        const numero = `ORC-${Date.now().toString().slice(-6)}`;
        const { data: inserted, error } = await supabase.from('orcamentos').insert({ ...payload, numero, status: 'rascunho' }).select().single();
        if (error) throw error;
        newId = inserted?.id || null;
      }
      setOrcamentoModalOpen(false);
      await loadOrcamentos();

      // Veio da tela de venda: nao finaliza venda nenhuma, so limpa o carrinho e leva pra central de Orcamentos
      if (!editingOrcamento && newId) {
        if (orcamentoFromCart) {
          setCart([]);
          setSelectedCustomer(null);
          setOrcamentoFromCart(false);
        }
        setActiveTab('orcamentos');
        setHighlightOrcamentoId(newId);
        setTimeout(() => setHighlightOrcamentoId(null), 4000);
      }
    } catch (err: any) {
      console.error('Erro ao salvar orçamento:', err);
      alert(`Não foi possível salvar o orçamento: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setSavingOrcamento(false);
    }
  };

  const updateOrcamentoStatus = async (o: Orcamento, status: Orcamento['status']) => {
    const extra: any = {};
    if (status === 'aprovado') { extra.aprovado_em = new Date().toISOString(); extra.aprovado_por = o.customerName; }
    const { error } = await supabase.from('orcamentos').update({ status, ...extra }).eq('id', o.id);
    if (error) { console.error('Erro ao atualizar status do orçamento:', error); alert(`Não foi possível atualizar o status: ${error.message}`); return; }
    loadOrcamentos();
  };

  const handleDeleteOrcamento = async (o: Orcamento) => {
    if (!confirm(`Excluir o orçamento ${o.numero}?`)) return;
    const { error } = await supabase.from('orcamentos').delete().eq('id', o.id);
    if (error) { alert('Não foi possível excluir.'); return; }
    loadOrcamentos();
  };

  const [waSendOrcamento, setWaSendOrcamento] = useState<Orcamento | null>(null);
  const [waSendPhone, setWaSendPhone] = useState('');

  const openShareOrcamentoWhatsApp = (o: Orcamento) => {
    setWaSendOrcamento(o);
    setWaSendPhone(o.phone || '');
  };

  const confirmShareOrcamentoWhatsApp = async () => {
    const o = waSendOrcamento;
    if (!o) return;
    const phoneDigits = waSendPhone.replace(/\D/g, '');
    if (!phoneDigits) { alert('Digite um telefone válido.'); return; }
    const linhas = o.items.map(i => `${i.quantity}x ${i.name} — R$ ${(i.area ? i.price * i.area * i.quantity : i.price * i.quantity).toFixed(2)}`).join('\n');
    const msg = `*Orçamento ${o.numero} — Rafa Arts Graphics*\n\n${linhas}\n\n${o.desconto > 0 ? `Desconto: R$ ${o.desconto.toFixed(2)}\n` : ''}*Total: R$ ${o.total.toFixed(2)}*\n\n${o.prazoProducao ? `Prazo: ${o.prazoProducao}\n\n` : ''}${o.formaPagamentoTexto ? `Pagamento: ${o.formaPagamentoTexto}\n\n` : ''}${o.validade ? `Válido até: ${safeFormat(o.validade, 'dd/MM/yyyy')}` : ''}`;
    await findOrCreateLeadAndOpenChat(phoneDigits, o.customerName || 'Cliente', msg);
    if (o.status === 'rascunho') {
      await supabase.from('orcamentos').update({ status: 'enviado' }).eq('id', o.id);
      loadOrcamentos();
    }
    // Se o numero foi trocado, salva como "telefone alternativo" (mantem o principal intacto)
    if (phoneDigits !== (o.phone || '').replace(/\D/g, '')) {
      await supabase.from('orcamentos').update({ telefone_alternativo: waSendPhone }).eq('id', o.id);
      loadOrcamentos();
    }
    setWaSendOrcamento(null);
  };

  const [viewingOrcamento, setViewingOrcamento] = useState<Orcamento | null>(null);

  const handleDownloadOrcamentoPdf = async (o: Orcamento) => {
    try {
      const canvas = await renderOrcamentoCanvas({ orcamento: o, companyName: currentCompany?.name || 'Rafa Arts Graphics', logoDarkUrl });
      await downloadCanvasAsPdf(canvas, buildFileName('Orcamento', o.customerName, o.createdAt, 'pdf'));
    } catch (err) {
      console.error('Erro ao gerar PDF do orçamento:', err);
      alert('Não foi possível gerar o PDF do orçamento.');
    }
  };

  const handleDownloadOrcamentoImagem = async (o: Orcamento) => {
    try {
      const canvas = await renderOrcamentoCanvas({ orcamento: o, companyName: currentCompany?.name || 'Rafa Arts Graphics', logoDarkUrl });
      downloadCanvasAsPng(canvas, buildFileName('Orcamento', o.customerName, o.createdAt, 'png'));
    } catch (err) {
      console.error('Erro ao gerar imagem do orçamento:', err);
      alert('Não foi possível gerar a imagem do orçamento.');
    }
  };

  const handlePrintOrcamento = async (o: Orcamento) => {
    try {
      const canvas = await renderOrcamentoCanvas({ orcamento: o, companyName: currentCompany?.name || 'Rafa Arts Graphics', logoDarkUrl });
      const dataUrl = canvas.toDataURL('image/png');
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`<html><head><title>Orçamento ${o.numero}</title></head><body style="margin:0"><img src="${dataUrl}" style="width:100%" onload="window.print()" /></body></html>`);
      win.document.close();
    } catch (err) {
      console.error('Erro ao imprimir orçamento:', err);
      alert('Não foi possível preparar a impressão.');
    }
  };

  const handleStartSaleFromOrcamento = (o: Orcamento) => {
    setCart([...o.items]);
    setSelectedCustomer(o.clienteId ? { id: o.clienteId, name: o.customerName || 'Cliente', phone: o.phone || '' } : null);
    setActiveTab('venda');
    // Guarda o vinculo para gravar no momento de finalizar a venda
    setLinkedOrcamentoId(o.id);
  };

  type OrderStatusFilterId = 'em_aberto' | 'entrada_recebida' | 'quitado' | 'entregue' | 'cancelado';
  type PaymentFilterId = 'pix' | 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'transferencia' | 'boleto' | 'crediario';

  const [selectedOrderStatusFilters, setSelectedOrderStatusFilters] = useState<Set<OrderStatusFilterId>>(new Set());
  const toggleOrderStatusFilter = (id: OrderStatusFilterId) => {
    setSelectedOrderStatusFilters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const clearOrderStatusFilters = () => setSelectedOrderStatusFilters(new Set());

  const [selectedPaymentFilters, setSelectedPaymentFilters] = useState<Set<PaymentFilterId>>(new Set());
  const togglePaymentFilter = (id: PaymentFilterId) => {
    setSelectedPaymentFilters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const clearPaymentFilters = () => setSelectedPaymentFilters(new Set());

  const [historySearch, setHistorySearch] = useState('');
  const [historyClienteIdFilter, setHistoryClienteIdFilter] = useState<string | null>(null);
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historyViewMode, setHistoryViewModeState] = useState<'miniatura' | 'normal' | 'lista'>(() => {
    const saved = localStorage.getItem('rpro_history_view_mode');
    return (saved === 'miniatura' || saved === 'normal' || saved === 'lista') ? saved : 'normal';
  });
  const setHistoryViewMode = (mode: 'miniatura' | 'normal' | 'lista') => {
    setHistoryViewModeState(mode);
    localStorage.setItem('rpro_history_view_mode', mode);
  };
  const [historySortOrder, setHistorySortOrderState] = useState<'desc' | 'asc'>(() => {
    const saved = localStorage.getItem('rpro_history_sort_order');
    return saved === 'asc' ? 'asc' : 'desc';
  });
  const setHistorySortOrder = (order: 'desc' | 'asc') => {
    setHistorySortOrderState(order);
    localStorage.setItem('rpro_history_sort_order', order);
  };
  const [servicosSortBy, setServicosSortByState] = useState<'data' | 'nome' | 'valor' | 'status' | 'agendamento'>(() => {
    const saved = localStorage.getItem('rpro_servicos_sort');
    return (saved === 'data' || saved === 'nome' || saved === 'valor' || saved === 'status' || saved === 'agendamento') ? saved : 'data';
  });
  const setServicosSortBy = (v: 'data' | 'nome' | 'valor' | 'status' | 'agendamento') => {
    setServicosSortByState(v);
    localStorage.setItem('rpro_servicos_sort', v);
  };

  const [produtosCostMap, setProdutosCostMap] = useState<Record<string, number>>({});
  useEffect(() => {
    const loadCosts = async () => {
      const { data } = await supabase.from('produtos').select('id, cost_price');
      const map: Record<string, number> = {};
      (data || []).forEach((p: any) => { map[p.id] = Number(p.cost_price) || 0; });
      setProdutosCostMap(map);
    };
    loadCosts();
  }, []);

  // Dropdown "Status do Pedido"
  const [isOrderStatusOpen, setIsOrderStatusOpen] = useState(false);
  const orderStatusRef = React.useRef<HTMLDivElement>(null);
  const orderStatusBtnRef = React.useRef<HTMLButtonElement>(null);
  const orderStatusMenuRef = React.useRef<HTMLDivElement>(null);
  const [orderStatusPos, setOrderStatusPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Dropdown "Forma de Pagamento"
  const [isPaymentFilterOpen, setIsPaymentFilterOpen] = useState(false);
  const paymentFilterRef = React.useRef<HTMLDivElement>(null);
  const paymentFilterBtnRef = React.useRef<HTMLButtonElement>(null);
  const paymentFilterMenuRef = React.useRef<HTMLDivElement>(null);
  const [paymentFilterPos, setPaymentFilterPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideOrderBtn = orderStatusRef.current && orderStatusRef.current.contains(target);
      const insideOrderMenu = orderStatusMenuRef.current && orderStatusMenuRef.current.contains(target);
      if (!insideOrderBtn && !insideOrderMenu) setIsOrderStatusOpen(false);

      const insidePayBtn = paymentFilterRef.current && paymentFilterRef.current.contains(target);
      const insidePayMenu = paymentFilterMenuRef.current && paymentFilterMenuRef.current.contains(target);
      if (!insidePayBtn && !insidePayMenu) setIsPaymentFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());
  const toggleSaleSelection = (id: string) => {
    setSelectedSaleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const [viewingReceiptSale, setViewingReceiptSale] = useState<SaleOrder | null>(null);
  const [viewingReceiptEmail, setViewingReceiptEmail] = useState<string | undefined>(undefined);
  const openReceiptDetail = async (sale: SaleOrder) => {
    setViewingReceiptSale(sale);
    setViewingReceiptEmail(undefined);
    const phoneDigits = (sale.customerPhone || '').replace(/\D/g, '');
    if (phoneDigits.length >= 8) {
      try {
        const { data } = await supabase.from('clientes').select('email').ilike('phone', `%${phoneDigits.slice(-8)}%`).limit(1).maybeSingle();
        if (data?.email) setViewingReceiptEmail(data.email);
      } catch (e) { /* silencioso, email é opcional */ }
    }
  };

  const handlePrintReceipt = async (sale: SaleOrder) => {
    const canvas = await renderReceiptCanvas({ order: sale, companyName: currentCompany?.name || 'Rafa Arts Graphics', customerPhone: sale.customerPhone, logoDarkUrl });
    const dataUrl = canvas.toDataURL('image/png');
    const printWin = window.open('', '_blank', 'width=500,height=800');
    if (!printWin) { alert('Permita pop-ups para imprimir.'); return; }
    printWin.document.write(`<!DOCTYPE html><html><head><title>Recibo #${sale.id.slice(-8).toUpperCase()}</title><style>body{margin:0;background:#F5F7FA;display:flex;justify-content:center;}img{width:100%;max-width:560px;}</style></head><body><img src="${dataUrl}" onload="window.print();window.close();" /></body></html>`);
    printWin.document.close();
  };

  const handleDownloadReceiptPdf = async (sale: SaleOrder) => {
    const canvas = await renderReceiptCanvas({ order: sale, companyName: currentCompany?.name || 'Rafa Arts Graphics', customerPhone: sale.customerPhone, logoDarkUrl });
    await downloadCanvasAsPdf(canvas, buildFileName('Recibo', sale.customerName, sale.createdAt, 'pdf'));
  };

  const handleDownloadReceiptImagem = async (sale: SaleOrder) => {
    const canvas = await renderReceiptCanvas({ order: sale, companyName: currentCompany?.name || 'Rafa Arts Graphics', customerPhone: sale.customerPhone, logoDarkUrl });
    downloadCanvasAsPng(canvas, buildFileName('Recibo', sale.customerName, sale.createdAt, 'png'));
  };

  const handleShareReceiptWhatsApp = async (sale: SaleOrder) => {
    if (!sale.customerPhone) {
      alert('Essa venda não tem telefone de WhatsApp cadastrado. Edite a venda para adicionar o telefone do cliente.');
      return;
    }
    setViewingReceiptSale(null);
    await handleShareViaWhatsApp(sale, sale.customerName || 'Cliente', sale.customerPhone);
  };

  const handleOpenChatFromReceipt = async (sale: SaleOrder) => {
    if (!sale.customerPhone) return;
    setViewingReceiptSale(null);
    const digits = sale.customerPhone.replace(/\D/g, '');
    await findOrCreateLeadAndOpenChat(digits, sale.customerName || 'Cliente', buildOrderShareMessage(sale, sale.customerName || 'Cliente'));
  };

  const matchesOrderStatusFilter = (sale: SaleOrder, filter: OrderStatusFilterId): boolean => {
    const down = sale.downPayment || 0;
    const isFullyPaid = sale.status === 'completed' || down >= sale.total;
    switch (filter) {
      case 'em_aberto':
        return down === 0 && sale.status !== 'canceled';
      case 'entrada_recebida':
        return down > 0 && down < sale.total && sale.status !== 'canceled';
      case 'quitado':
        return isFullyPaid && sale.status !== 'canceled';
      case 'entregue':
        return isFullyPaid && !sale.scheduledFor && sale.status !== 'canceled';
      case 'cancelado':
        return sale.status === 'canceled';
      default:
        return true;
    }
  };

  const matchesPaymentFilter = (sale: SaleOrder, filter: PaymentFilterId): boolean => {
    const method = (sale.paymentMethod || '').toLowerCase();
    switch (filter) {
      case 'pix':
        return method.includes('pix');
      case 'dinheiro':
        return method.includes('dinheiro');
      case 'cartao_debito':
        return method.includes('debito');
      case 'cartao_credito':
        return method.includes('credito');
      case 'transferencia':
        return method.includes('transferencia');
      case 'boleto':
        return method.includes('boleto');
      case 'crediario':
        return method.includes('crediario');
      default:
        return true;
    }
  };

  // Dentro de cada lista, selecionar varias = "ou" (um pedido so tem 1 status/1 pagamento).
  // Entre as duas listas, o resultado e cruzado (E) — precisa bater com status E pagamento selecionados.
  const matchesOrderStatusGroup = (sale: SaleOrder, filters: Set<OrderStatusFilterId>): boolean => {
    if (filters.size === 0) return true;
    for (const f of filters) if (matchesOrderStatusFilter(sale, f)) return true;
    return false;
  };
  const matchesPaymentGroup = (sale: SaleOrder, filters: Set<PaymentFilterId>): boolean => {
    if (filters.size === 0) return true;
    for (const f of filters) if (matchesPaymentFilter(sale, f)) return true;
    return false;
  };

  const matchesHistorySearch = (sale: SaleOrder): boolean => {
    // Filtro preciso por cliente_id (evita confundir clientes com nomes iguais) — tem prioridade sobre o texto
    if (historyClienteIdFilter) {
      return sale.customerId === historyClienteIdFilter;
    }
    if (!historySearch.trim()) return true;
    const term = historySearch.toLowerCase().trim();
    const termDigits = term.replace(/\D/g, '');
    const nameMatch = (sale.customerName || '').toLowerCase().includes(term);
    const idMatch = sale.id.toLowerCase().includes(term);
    const itemMatch = sale.items?.some(i => i.name.toLowerCase().includes(term));
    const phoneMatch = termDigits.length >= 3 && (sale.customerPhone || '').replace(/\D/g, '').includes(termDigits);
    return nameMatch || idMatch || !!itemMatch || phoneMatch;
  };

  // Contagens facetadas: quantas O.S. restam considerando a busca + a OUTRA lista ja selecionada
  // (assim cada lista atualiza sozinha conforme a combinacao muda)
  const orderStatusCounts = useMemo(() => {
    const searched = allSalesHistory.filter(matchesHistorySearch).filter(s => matchesPaymentGroup(s, selectedPaymentFilters));
    const ids: OrderStatusFilterId[] = ['em_aberto', 'entrada_recebida', 'quitado', 'entregue', 'cancelado'];
    const counts: Record<string, number> = { todos: searched.length };
    ids.forEach(id => { counts[id] = searched.filter(s => matchesOrderStatusFilter(s, id)).length; });
    return counts;
  }, [allSalesHistory, historySearch, historyClienteIdFilter, selectedPaymentFilters]);

  const paymentFilterCounts = useMemo(() => {
    const searched = allSalesHistory.filter(matchesHistorySearch).filter(s => matchesOrderStatusGroup(s, selectedOrderStatusFilters));
    const ids: PaymentFilterId[] = ['pix', 'dinheiro', 'cartao_debito', 'cartao_credito', 'transferencia', 'boleto', 'crediario'];
    const counts: Record<string, number> = { todos: searched.length };
    ids.forEach(id => { counts[id] = searched.filter(s => matchesPaymentFilter(s, id)).length; });
    return counts;
  }, [allSalesHistory, historySearch, historyClienteIdFilter, selectedOrderStatusFilters]);

  const pendingOrScheduledSales = useMemo(() => {
    const filtered = allSalesHistory.filter(sale => {
      const down = sale.downPayment || 0;
      const balance = sale.total - down;
      const isPartial = balance > 0 || sale.status === 'pending';
      return isPartial || !!sale.scheduledFor;
    });
    return filtered.sort((a, b) => {
      if (servicosSortBy === 'agendamento') {
        // Sem agendamento sempre vai pro fim da lista, em qualquer direcao escolhida
        if (!a.scheduledFor && !b.scheduledFor) return 0;
        if (!a.scheduledFor) return 1;
        if (!b.scheduledFor) return -1;
        const cmp = new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
        return historySortOrder === 'desc' ? -cmp : cmp;
      }
      let cmp = 0;
      switch (servicosSortBy) {
        case 'nome':
          cmp = (a.customerName || '').localeCompare(b.customerName || '');
          break;
        case 'valor':
          cmp = (a.total || 0) - (b.total || 0);
          break;
        case 'status':
          cmp = (a.status || '').localeCompare(b.status || '');
          break;
        default:
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return historySortOrder === 'desc' ? -cmp : cmp;
    });
  }, [allSalesHistory, historySortOrder, servicosSortBy]);

  const filteredSalesHistory = useMemo(() => {
    const fromDate = historyDateFrom ? new Date(historyDateFrom + 'T00:00:00') : null;
    const toDate = historyDateTo ? new Date(historyDateTo + 'T23:59:59') : null;
    const filtered = allSalesHistory.filter(sale => {
      if (!matchesOrderStatusGroup(sale, selectedOrderStatusFilters)) return false;
      if (!matchesPaymentGroup(sale, selectedPaymentFilters)) return false;
      if (!matchesHistorySearch(sale)) return false;
      if (fromDate || toDate) {
        const saleDate = new Date(sale.createdAt);
        if (isNaN(saleDate.getTime())) return false;
        if (fromDate && saleDate < fromDate) return false;
        if (toDate && saleDate > toDate) return false;
      }
      return true;
    });
    return filtered.sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return historySortOrder === 'desc' ? diff : -diff;
    });
  }, [allSalesHistory, selectedOrderStatusFilters, selectedPaymentFilters, historySearch, historyClienteIdFilter, historySortOrder, historyDateFrom, historyDateTo]);

  // Resumo da Ordem de Servicos: usa o mesmo filtro de periodo (De/Ate) do Historico
  const servicosResumo = useMemo(() => {
    const fromDate = historyDateFrom ? new Date(historyDateFrom + 'T00:00:00') : null;
    const toDate = historyDateTo ? new Date(historyDateTo + 'T23:59:59') : null;
    const noPeriodo = allSalesHistory.filter(sale => {
      if (sale.status === 'canceled') return false;
      const saleDate = new Date(sale.createdAt);
      if (isNaN(saleDate.getTime())) return false;
      if (fromDate && saleDate < fromDate) return false;
      if (toDate && saleDate > toDate) return false;
      return true;
    });

    let faturamento = 0, liquido = 0, custoTotal = 0;
    const comEntrada = { count: 0, total: 0, recebido: 0, pendente: 0 };
    const emAberto = { count: 0, total: 0 };

    noPeriodo.forEach(sale => {
      const down = sale.downPayment || 0;
      const total = sale.total || 0;
      const isFullyPaid = sale.status === 'completed' || down >= total;
      faturamento += total;
      liquido += down;
      (sale.items || []).forEach(item => {
        const custoUnit = produtosCostMap[item.productId] || 0;
        const qtd = item.area ? item.area * item.quantity : item.quantity;
        custoTotal += custoUnit * qtd;
      });
      if (down > 0 && !isFullyPaid) {
        comEntrada.count += 1;
        comEntrada.total += total;
        comEntrada.recebido += down;
        comEntrada.pendente += Math.max(0, total - down);
      } else if (down === 0) {
        emAberto.count += 1;
        emAberto.total += total;
      }
    });

    return {
      faturamento, liquido, lucro: liquido - custoTotal,
      temCustoRegistrado: custoTotal > 0,
      comEntrada, emAberto,
    };
  }, [allSalesHistory, historyDateFrom, historyDateTo, produtosCostMap]);

  const handleToggleSelectAll = () => {
    setSelectedSaleIds(prev => {
      if (prev.size === filteredSalesHistory.length && filteredSalesHistory.length > 0) {
        return new Set();
      }
      return new Set(filteredSalesHistory.map(s => s.id));
    });
  };

  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const handleBulkDeleteSales = async () => {
    if (selectedSaleIds.size === 0) return;
    setIsBulkDeleteConfirmOpen(true);
  };
  const confirmBulkDeleteSales = async () => {
    const ids = Array.from(selectedSaleIds);
    const { error } = await supabase.from('vendas').update({ deleted_at: new Date().toISOString() }).in('id', ids);
    setIsBulkDeleteConfirmOpen(false);
    if (error) { console.error(error); alert('Não foi possível excluir as vendas selecionadas.'); return; }
    setSelectedSaleIds(new Set());
  };
  const [settleModalOrder, setSettleModalOrder] = useState<SaleOrder | null>(null);
  const [settleMethod, setSettleMethod] = useState<'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito'>('pix');
  const [isWhatsAppFormOpen, setIsWhatsAppFormOpen] = useState(false);
  const [waFormName, setWaFormName] = useState('');
  const [waFormCountry, setWaFormCountry] = useState({ code: '+55', flag: '🇧🇷', name: 'Brasil' });
  const [waFormPhone, setWaFormPhone] = useState('');
  const [isWaSaving, setIsWaSaving] = useState(false);
  const WA_COUNTRIES = [
    { code: '+55', flag: '🇧🇷', name: 'Brasil' },
    { code: '+1', flag: '🇺🇸', name: 'Estados Unidos' },
    { code: '+351', flag: '🇵🇹', name: 'Portugal' },
    { code: '+54', flag: '🇦🇷', name: 'Argentina' },
    { code: '+595', flag: '🇵🇾', name: 'Paraguai' },
    { code: '+598', flag: '🇺🇾', name: 'Uruguai' },
  ];

  const buildOrderShareMessage = (order: SaleOrder, customerName: string) => {
    const total = order.total;
    const down = order.downPayment ?? order.receivedValue ?? (order.status === 'completed' ? total : 0);
    const balance = Math.max(0, total - down);
    const isPending = balance > 0 || order.status === 'pending';
    const itemsText = order.items.map(i => `• ${i.quantity}x ${i.name} (R$ ${((i.area ? i.price * i.area : i.price) * i.quantity).toFixed(2).replace('.', ',')})`).join('\n');
    const deliveryStr = order.scheduledFor ? `\n📅 *Previsão de Entrega:* ${safeFormat(order.scheduledFor, 'dd/MM/yyyy HH:mm')}` : '';
    return `Olá *${customerName || 'Cliente'}*!\n\nSegue resumo do seu pedido *#${order.id.slice(-8).toUpperCase()}* na *${currentCompany?.name || 'Rafa Arts Graphics'}*:\n\n${itemsText}\n\n💰 *Total do Pedido:* R$ ${total.toFixed(2).replace('.', ',')}\n✅ *Valor Recebido (Entrada):* R$ ${down.toFixed(2).replace('.', ',')}${isPending ? `\n🔴 *Valor que Falta Pagar:* R$ ${balance.toFixed(2).replace('.', ',')}` : '\n🎉 *Status:* 100% Quitado'}${deliveryStr}\n\nObrigado pela preferência!`;
  };

  // Acha (ou cria) o lead correspondente ao telefone no Funil de Atendimento,
  // deixa a conversa selecionada com a mensagem pronta para enviar.
  const findOrCreateLeadAndOpenChat = async (phoneDigits: string, name: string, prefillMessage: string) => {
    if (!currentCompany) return;
    try {
      const leadsQ = query(collection(db, 'leads'), where('companyId', '==', currentCompany.id));
      const leadsSnap = await getDocs(leadsQ);
      const existing = leadsSnap.docs.find(d => {
        const p = (d.data().phone || '').replace(/\D/g, '');
        return p && (p === phoneDigits || p.endsWith(phoneDigits) || phoneDigits.endsWith(p));
      });

      let leadId: string;
      if (existing) {
        leadId = existing.id;
      } else {
        // Acha o funil/etapa inicial padrão da empresa, igual ao Funil CRM faz
        let funnelId: string | null = null;
        let funnelStageId: string | null = null;
        const funnelQ = query(collection(db, 'funnels'), where('companyId', '==', currentCompany.id), where('isDefault', '==', true), limit(1));
        let funnelSnap = await getDocs(funnelQ);
        if (funnelSnap.empty) {
          funnelSnap = await getDocs(query(collection(db, 'funnels'), where('companyId', '==', currentCompany.id), limit(1)));
        }
        if (!funnelSnap.empty) {
          funnelId = funnelSnap.docs[0].id;
          const stageQ = query(collection(db, 'funnelStages'), where('funnelId', '==', funnelId), where('isInitial', '==', true), limit(1));
          let stageSnap = await getDocs(stageQ);
          if (stageSnap.empty) {
            stageSnap = await getDocs(query(collection(db, 'funnelStages'), where('funnelId', '==', funnelId), orderBy('order', 'asc'), limit(1)));
          }
          if (!stageSnap.empty) funnelStageId = stageSnap.docs[0].id;
        }

        const nameParts = (name || 'Cliente').trim().split(' ');
        const newLeadRef = await addDoc(collection(db, 'leads'), {
          companyId: currentCompany.id,
          funnelId,
          funnelStageId,
          fullName: name || 'Cliente',
          firstName: nameParts[0] || 'Cliente',
          lastName: nameParts.slice(1).join(' ') || '',
          phone: phoneDigits,
          sourceType: 'WhatsApp',
          createdAt: new Date().toISOString(),
        });
        leadId = newLeadRef.id;
      }

      setPendingWhatsAppShare({ leadId, prefillMessage });
      setRootActiveTab('messages');
      setIsSuccessModalOpen(false);
    } catch (err) {
      console.error('Erro ao localizar/criar lead:', err);
      alert('Não foi possível abrir a conversa no Funil de Atendimento.');
    }
  };

  const handleShareViaWhatsApp = async (order: SaleOrder, customerName: string, phone: string) => {
    const digits = phone.replace(/\D/g, '');
    const message = buildOrderShareMessage(order, customerName);
    await findOrCreateLeadAndOpenChat(digits, customerName, message);
  };

  const handleSaveWhatsAppCustomer = async () => {
    const digits = waFormPhone.replace(/\D/g, '');
    if (!waFormName.trim() || digits.length < 8) {
      alert('Preencha o nome e um número de WhatsApp válido.');
      return;
    }
    setIsWaSaving(true);
    try {
      const fullPhone = `${waFormCountry.code} ${waFormPhone}`.trim();
      // Salva/atualiza o cliente no Supabase
      let customerId = selectedCustomer?.id;
      if (customerId) {
        await supabase.from('clientes').update({ phone: fullPhone }).eq('id', customerId);
      } else {
        const { data: inserted, error: insertErr } = await supabase.from('clientes').insert({ full_name: waFormName, phone: fullPhone }).select().single();
        if (insertErr) throw insertErr;
        customerId = inserted?.id;
      }
      setSelectedCustomer({ id: customerId || '', name: waFormName, phone: fullPhone });
      setIsWhatsAppFormOpen(false);
      if (lastFinalizedOrder) {
        const message = buildOrderShareMessage(lastFinalizedOrder, waFormName);
        await findOrCreateLeadAndOpenChat(`${waFormCountry.code.replace('+', '')}${digits}`, waFormName, message);
      }
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      alert('Não foi possível salvar o cliente.');
    } finally {
      setIsWaSaving(false);
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [pixConfig, setPixConfig] = useState<{ key: string; beneficiaryName: string; city: string; bank?: string } | null>(null);
  const [isPixQrModalOpen, setIsPixQrModalOpen] = useState(false);
  const [logoDarkUrl, setLogoDarkUrl] = useState<string | null>(null);
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<string[]>(['pix', 'dinheiro', 'cartao_credito', 'cartao_debito']);
  const [creditCardFees, setCreditCardFees] = useState<{ installments: number; feePercent: number }[]>(
    Array.from({ length: 12 }, (_, i) => ({ installments: i + 1, feePercent: 0 }))
  );
  const [debitCardFeePercent, setDebitCardFeePercent] = useState(0);
  const [newPaymentInstallments, setNewPaymentInstallments] = useState(1);
  const canManageHistory = !!(user?.isAdmin || user?.allowedActions?.includes('canManageSaleHistory'));
  const [editingSale, setEditingSale] = useState<SaleOrder | null>(null);
  const [editSaleForm, setEditSaleForm] = useState({ customerName: '', total: 0, downPayment: 0, paymentMethod: 'pix', observacoes: '' });

  const handleReopenSale = async (sale: SaleOrder) => {
    if (!confirm(`Reabrir a venda #${sale.id.slice(-8).toUpperCase()}? Ela voltará a aparecer como pendente.`)) return;
    const { error } = await supabase.from('vendas').update({ status: 'pending' }).eq('id', sale.id);
    if (error) { console.error(error); alert('Não foi possível reabrir a venda.'); }
  };

  const startEditSale = (sale: SaleOrder) => {
    setEditingSale(sale);
    setEditSaleForm({
      customerName: sale.customerName || '',
      total: sale.total,
      downPayment: sale.downPayment || 0,
      paymentMethod: sale.paymentMethod || 'pix',
      observacoes: sale.observacoes || '',
    });
  };

  const handleSaveEditSale = async () => {
    if (!editingSale) return;
    const { error } = await supabase.from('vendas').update({
      customer_name: editSaleForm.customerName,
      total: editSaleForm.total,
      down_payment: editSaleForm.downPayment,
      payment_method: editSaleForm.paymentMethod,
      observacoes: editSaleForm.observacoes || null,
      status: editSaleForm.downPayment >= editSaleForm.total ? 'completed' : 'pending',
    }).eq('id', editingSale.id);
    if (error) { console.error(error); alert('Não foi possível salvar as alterações.'); return; }
    setEditingSale(null);
    loadSalesHistory();
  };

  const handleDeleteSale = async (sale: SaleOrder) => {
    if (!confirm(`Excluir a venda #${sale.id.slice(-8).toUpperCase()} (R$ ${sale.total.toFixed(2)})? Ela fica 30 dias na aba Excluídos antes de sumir de vez — você pode restaurar dentro desse prazo.`)) return;
    const { error } = await supabase.from('vendas').update({ deleted_at: new Date().toISOString() }).eq('id', sale.id);
    if (error) { console.error(error); alert('Não foi possível excluir a venda.'); }
  };

  const handleRestoreSale = async (sale: SaleOrder) => {
    const { error } = await supabase.from('vendas').update({ deleted_at: null }).eq('id', sale.id);
    if (error) { console.error(error); alert('Não foi possível restaurar a venda.'); return; }
    loadDeletedSales();
  };

  const handlePermanentDeleteSale = async (sale: SaleOrder) => {
    if (!confirm(`Excluir DEFINITIVAMENTE a venda #${sale.id.slice(-8).toUpperCase()}? Essa ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('vendas').delete().eq('id', sale.id);
    if (error) { console.error(error); alert('Não foi possível excluir.'); return; }
    loadDeletedSales();
  };

  const [deletedSales, setDeletedSales] = useState<SaleOrder[]>([]);
  const [isLoadingDeletedSales, setIsLoadingDeletedSales] = useState(false);

  const loadDeletedSales = async () => {
    setIsLoadingDeletedSales(true);
    try {
      // Purga automatica: excluidas ha mais de 30 dias somem de vez
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      await supabase.from('vendas').delete().not('deleted_at', 'is', null).lt('deleted_at', cutoff.toISOString());

      const { data } = await supabase.from('vendas').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
      setDeletedSales((data || []).map(mapVendaRow));
    } catch (err) {
      console.error('Erro ao carregar excluídos:', err);
    } finally {
      setIsLoadingDeletedSales(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'excluidos') loadDeletedSales();
  }, [activeTab]);

  const loadSalesHistory = async () => {
    const { data } = await supabase.from('vendas').select('*').is('deleted_at', null);
    const allSales = (data || []).map(mapVendaRow);
    allSales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setAllSalesHistory(allSales);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todaySales = allSales.filter(sale => {
      const d = new Date(sale.createdAt);
      return d >= startOfDay;
    });
    setSalesToday(todaySales);
  };

  useEffect(() => {
    if (!currentCompany) return;
    loadSalesHistory();
    const channel = supabase.channel('pos-vendas').on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, loadSalesHistory).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('configuracoes').select('*').eq('company_id', 'rafa-arts').maybeSingle();
      setLogoDarkUrl(data?.logo_dark_url || null);
      setEnabledPaymentMethods(Array.isArray(data?.enabled_payment_methods) && data.enabled_payment_methods.length > 0 ? data.enabled_payment_methods : ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito']);
      if (Array.isArray(data?.credit_card_fees) && data.credit_card_fees.length > 0) {
        const byInstallment: Record<number, number> = {};
        data.credit_card_fees.forEach((f: any) => { byInstallment[f.installments] = f.feePercent; });
        setCreditCardFees(Array.from({ length: 12 }, (_, i) => ({ installments: i + 1, feePercent: byInstallment[i + 1] ?? 0 })));
      }
      setDebitCardFeePercent(Number(data?.debit_card_fee_percent) || 0);
      if (data && data.pix_key) {
        setPixConfig({
          key: data.pix_key,
          beneficiaryName: data.beneficiary_name || currentCompany?.name || 'RAFA ARTS GRAPHICS',
          city: data.city || 'Santarem',
          bank: data.pix_bank || '',
        });
      } else {
        setPixConfig(null);
      }
    };
    load();
    const channel = supabase
      .channel('pos-configuracoes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany]);

  const handleSettleBalance = async (order: SaleOrder) => {
    if (!currentCompany || !order) return;
    const balanceToSettle = order.total - (order.downPayment || 0);
    if (balanceToSettle <= 0) return;

    try {
      try {
        const audio = new Audio('/sounds/cash-register.mp3');
        audio.play().catch(() => {});
      } catch (e) {}

      const { error: settleErr } = await supabase.from('vendas').update({
        status: 'completed',
        down_payment: order.total,
        settled_at: new Date().toISOString(),
        settled_payment_method: settleMethod,
      }).eq('id', order.id);
      if (settleErr) throw settleErr;

      const qSvc = query(
        collection(db, 'services'),
        where('companyId', '==', currentCompany.id),
        where('orderId', '==', order.id),
        limit(1)
      );
      const snapSvc = await getDocs(qSvc);
      if (!snapSvc.empty) {
        await updateDoc(doc(db, 'services', snapSvc.docs[0].id), {
          status: 'concluido',
          balance: 0,
          updatedAt: Timestamp.now()
        });
      }

      alert(`Saldo de R$ ${balanceToSettle.toFixed(2).replace('.', ',')} quitado com sucesso!\nA venda/serviço foi totalmente quitada.`);
      setSettleModalOrder(null);
    } catch (err) {
      console.error('Erro ao quitar saldo:', err);
      alert('Erro ao quitar saldo do pedido.');
    }
  };

  const [products, setProducts] = useState<Product[]>([]);
  const loadProducts = async () => {
    const { data } = await supabase.from('produtos').select('*').order('name', { ascending: true });
    setProducts((data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      code: p.code || '',
      price: Number(p.sale_price) || 0,
      stock: Number(p.current_stock) || 0,
      unitType: p.unit === 'm2' ? 'm2' : p.unit === 'etiqueta' ? 'etiqueta' : 'unit',
      tipoItem: p.tipo_item || 'produto',
      larguraRolo: p.largura_rolo ? Number(p.largura_rolo) : undefined,
      controlaEstoque: p.controla_estoque !== false,
    })));
  };
  useEffect(() => {
    loadProducts();
    const channel = supabase
      .channel('pos-produtos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, loadProducts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Cadastro rapido de produto direto pelo Terminal de Venda (mesma tabela do Estoque)
  const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);
  const [quickProductAddToOrcamento, setQuickProductAddToOrcamento] = useState(false);
  const [isSavingQuickProduct, setIsSavingQuickProduct] = useState(false);
  const emptyQuickProductForm = {
    name: '', code: '', category: '', unit: 'un' as 'un' | 'm2' | 'etiqueta', costPrice: 0, salePrice: 0, currentStock: 0,
    tipoItem: 'produto' as 'produto' | 'material' | 'servico' | 'acabamento' | 'composto',
    controlaEstoque: true, minStock: 0, estoqueMaximo: 0, localizacao: '', descricao: '', larguraRolo: 0,
  };
  const [quickProductForm, setQuickProductForm] = useState({ ...emptyQuickProductForm });

  const handleSaveQuickProduct = async () => {
    if (!quickProductForm.name.trim()) { alert('Digite o nome do produto.'); return; }
    setIsSavingQuickProduct(true);
    try {
      const { data, error } = await supabase.from('produtos').insert({
        name: quickProductForm.name,
        code: quickProductForm.code || null,
        category: quickProductForm.category || null,
        unit: quickProductForm.unit,
        cost_price: quickProductForm.costPrice || 0,
        sale_price: quickProductForm.salePrice || 0,
        current_stock: quickProductForm.currentStock || 0,
        is_active: true,
        tipo_item: quickProductForm.tipoItem,
        controla_estoque: quickProductForm.controlaEstoque,
        min_stock: quickProductForm.minStock || 0,
        estoque_maximo: quickProductForm.estoqueMaximo || null,
        localizacao: quickProductForm.localizacao || null,
        descricao: quickProductForm.descricao || null,
        largura_rolo: quickProductForm.larguraRolo || null,
      }).select().single();
      if (error) throw error;
      await loadProducts();

      // Se veio do orcamento, adiciona o produto recem criado direto nos itens do orcamento
      // e permanece na mesma tela do orcamento (nao navega pra Terminal Venda)
      if (quickProductAddToOrcamento && data) {
        setOrcamentoForm(prev => ({
          ...prev,
          items: [...prev.items, { productId: data.id, name: data.name, price: Number(data.sale_price) || 0, quantity: 1 }],
        }));
        setQuickProductAddToOrcamento(false);
      }

      setIsQuickProductOpen(false);
      setQuickProductForm({ ...emptyQuickProductForm });
      // Permanece na aba/tela onde o usuario estava (Terminal Venda ou Orcamentos)
    } catch (err: any) {
      console.error('Erro ao cadastrar produto:', err);
      alert(`Não foi possível cadastrar: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setIsSavingQuickProduct(false);
    }
  };


  const addToCart = (product: Product) => {
    if (product.unitType === 'm2' && product.name.toUpperCase().includes('INSULFILM')) {
      setInsulfilmModalProduct(product);
      setInsulfilmLarguraMaterial(product.larguraRolo || 1.5);
      setInsulfilmPecas([{ id: 'p1', largura: 0, altura: 0 }]);
      return;
    }
    if (product.unitType === 'm2') {
      setDimensionModalProduct(product);
      setDimWidth('');
      setDimHeight('');
      setDimLarguraMaterial(product.larguraRolo || 0);
      return;
    }
    if (product.unitType === 'etiqueta') {
      setEtiquetaModalProduct(product);
      setEtiquetaForm({ ...emptyEtiquetaForm, larguraMaterial: product.larguraRolo || 1.02 });
      setEtiquetaInputMode('quantidade');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && !item.dimensions);
      if (existing) {
        return prev.map(item => (item.productId === product.id && !item.dimensions)
          ? { ...item, quantity: item.quantity + selectedQty }
          : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: selectedQty,
      }];
    });
    setSelectedQty(1);
  };

  const calcularEtiquetas = (product: Product) => {
    const { largura, altura, larguraMaterial } = etiquetaForm;
    const larguraRoloCm = (larguraMaterial || product.larguraRolo || 1) * 100;
    if (largura <= 0 || altura <= 0 || larguraRoloCm <= 0) return null;

    // Quantas etiquetas cabem por metro linear do material, testando as duas orientacoes
    // (normal e rotacionada 90 graus) e usando a que da mais unidades por metro (melhor aproveitamento).
    // IMPORTANTE: tanto as colunas (largura) quanto as linhas (por metro de comprimento) sao
    // arredondadas pra baixo — nao da pra imprimir etiqueta fracionada, entao 100/8=12,5 vira 12, nao 12,5.
    const porFileiraA = Math.max(1, Math.floor(larguraRoloCm / largura));
    const linhasPorMetroA = Math.max(1, Math.floor(100 / altura));
    const unidadesPorMetroA = porFileiraA * linhasPorMetroA;

    const porFileiraB = Math.max(1, Math.floor(larguraRoloCm / altura));
    const linhasPorMetroB = Math.max(1, Math.floor(100 / largura));
    const unidadesPorMetroB = porFileiraB * linhasPorMetroB;

    const usarB = unidadesPorMetroB > unidadesPorMetroA;
    const porFileira = usarB ? porFileiraB : porFileiraA;
    const alturaEfetiva = usarB ? largura : altura; // dimensao que determina o comprimento gasto do material por linha

    // Regra de 3: a partir do campo que o usuario preencheu (quantidade, metros ou valor),
    // calcula os outros dois automaticamente
    let quantidade: number;
    let metrosLineares: number;
    const IMPRESSAO_MINIMA = 30;

    if (etiquetaInputMode === 'metros') {
      metrosLineares = etiquetaForm.metrosInput;
      if (metrosLineares <= 0) return null;
      const linhas = Math.floor((metrosLineares * 100) / alturaEfetiva);
      quantidade = linhas * porFileira;
    } else if (etiquetaInputMode === 'valor') {
      const valorInput = etiquetaForm.valorInput;
      if (valorInput <= 0 || product.price <= 0) return null;
      metrosLineares = valorInput / product.price;
      const linhas = Math.floor((metrosLineares * 100) / alturaEfetiva);
      quantidade = linhas * porFileira;
    } else {
      quantidade = etiquetaForm.quantidade;
      if (quantidade <= 0) return null;
      const fileiras = Math.ceil(quantidade / porFileira);
      metrosLineares = (fileiras * alturaEfetiva) / 100;
    }

    const valorCalculado = metrosLineares * product.price;
    const valorFinal = Math.max(valorCalculado, IMPRESSAO_MINIMA);
    const fileiras = Math.ceil(quantidade / porFileira);

    return { porFileira, fileiras, metrosLineares, valorCalculado, valorFinal, rotacionada: usarB, quantidade, unidadesPorMetro: usarB ? unidadesPorMetroB : unidadesPorMetroA };
  };

  const confirmAddEtiquetaItem = async () => {
    if (!etiquetaModalProduct) return;
    const calc = calcularEtiquetas(etiquetaModalProduct);
    if (!calc) { alert('Preencha as dimensões, a largura do material e a quantidade/metros/valor desejado.'); return; }
    const { largura, altura, larguraMaterial } = etiquetaForm;
    const dimensoesLabel = `${calc.quantidade}un ${largura}x${altura}cm`;
    setCart(prev => [...prev, {
      productId: etiquetaModalProduct.id,
      name: etiquetaModalProduct.name,
      price: calc.valorFinal,
      quantity: 1,
      dimensions: dimensoesLabel,
      consumoEstoque: calc.metrosLineares,
    }]);
    // Se a largura do material foi mudada, salva como novo padrao pra proxima vez
    if (larguraMaterial && larguraMaterial !== etiquetaModalProduct.larguraRolo) {
      await supabase.from('produtos').update({ largura_rolo: larguraMaterial }).eq('id', etiquetaModalProduct.id);
    }
    setEtiquetaModalProduct(null);
  };

  // Insulfilm: aproveitamento entre TODAS as pecas da mesma nota, respeitando o corte fisico do rolo.
  // Agrupa pecas lado a lado dentro da largura do rolo (bin-packing guloso), e o comprimento
  // consumido por corte e o MAIOR comprimento entre as pecas daquele corte.
  const otimizarCortesInsulfilm = (pecas: { largura: number; altura: number }[], larguraRoloM: number) => {
    const validas = pecas.filter(p => p.largura > 0 && p.altura > 0);
    if (validas.length === 0 || larguraRoloM <= 0) return null;

    // Ordena da peca mais larga pra mais estreita — ajuda a encaixar melhor (guloso)
    const ordenadas = [...validas].sort((a, b) => b.largura - a.largura);
    const cortes: { pecas: { largura: number; altura: number }[]; larguraUsada: number; comprimento: number }[] = [];

    for (const peca of ordenadas) {
      if (peca.largura > larguraRoloM + 0.0001) {
        // Peca mais larga que o proprio rolo — nao cabe de jeito nenhum, corte dedicado mesmo assim (avisa na tela)
        cortes.push({ pecas: [peca], larguraUsada: peca.largura, comprimento: peca.altura });
        continue;
      }
      // Tenta encaixar num corte ja aberto que ainda tenha espaco na largura
      let encaixou = false;
      for (const corte of cortes) {
        if (corte.larguraUsada + peca.largura <= larguraRoloM + 0.0001) {
          corte.pecas.push(peca);
          corte.larguraUsada += peca.largura;
          corte.comprimento = Math.max(corte.comprimento, peca.altura);
          encaixou = true;
          break;
        }
      }
      if (!encaixou) {
        cortes.push({ pecas: [peca], larguraUsada: peca.largura, comprimento: peca.altura });
      }
    }

    const metrosLineares = cortes.reduce((s, c) => s + c.comprimento, 0);
    const areaUtilizada = validas.reduce((s, p) => s + p.largura * p.altura, 0);
    const areaRetirada = cortes.reduce((s, c) => s + larguraRoloM * c.comprimento, 0);
    const desperdicio = Math.max(0, areaRetirada - areaUtilizada);
    const aproveitamento = areaRetirada > 0 ? (areaUtilizada / areaRetirada) * 100 : 0;

    return { cortes, metrosLineares, areaUtilizada, areaRetirada, desperdicio, aproveitamento };
  };

  const confirmAddInsulfilmItem = async () => {
    if (!insulfilmModalProduct) return;
    const calc = otimizarCortesInsulfilm(insulfilmPecas, insulfilmLarguraMaterial);
    if (!calc) { alert('Informe largura e altura válidas de pelo menos uma peça.'); return; }
    const IMPRESSAO_MINIMA = 30;
    const valorCalculado = calc.areaRetirada * insulfilmModalProduct.price;
    const valorFinal = Math.max(valorCalculado, IMPRESSAO_MINIMA);
    const pecasLabel = insulfilmPecas.filter(p => p.largura > 0 && p.altura > 0).map(p => `${p.largura}x${p.altura}`).join(' + ');
    setCart(prev => [...prev, {
      productId: insulfilmModalProduct.id,
      name: insulfilmModalProduct.name,
      price: valorFinal,
      quantity: 1,
      dimensions: `${pecasLabel} (${calc.cortes.length} corte${calc.cortes.length > 1 ? 's' : ''})`,
      area: calc.areaUtilizada,
      consumoEstoque: calc.metrosLineares,
    }]);
    if (insulfilmLarguraMaterial && insulfilmLarguraMaterial !== insulfilmModalProduct.larguraRolo) {
      await supabase.from('produtos').update({ largura_rolo: insulfilmLarguraMaterial }).eq('id', insulfilmModalProduct.id);
    }
    setInsulfilmModalProduct(null);
  };

  // Consumo linear real do rolo: testa as duas orientacoes da peca e usa a dimensao
  // que sobra como comprimento consumido, aproveitando a largura do rolo ao maximo.
  // Ex: peca 80x70cm cabe deitada ou em pe num rolo largo -> usa a MENOR medida como comprimento (70cm).
  // Ex: peca 3m x 0,50m num rolo de 1m -> só cabe de um jeito (0,50m na largura) -> consome os 3m inteiros.
  const calcularConsumoLinear = (w: number, h: number, larguraRolo?: number): number => {
    const area = w * h;
    if (!larguraRolo || larguraRolo <= 0) return area;
    const cabeComoEsta = w <= larguraRolo;
    const cabeGirada = h <= larguraRolo;
    if (cabeComoEsta && cabeGirada) return Math.min(w, h);
    if (cabeComoEsta) return h;
    if (cabeGirada) return w;
    return area / larguraRolo; // nenhuma orientacao cabe — fallback, tela avisa o usuario nesse caso
  };

  const confirmAddDimensionedItem = async () => {
    if (!dimensionModalProduct) return;
    const w = dimWidth === '' ? 0 : Number(dimWidth);
    const h = dimHeight === '' ? 0 : Number(dimHeight);
    if (w <= 0 || h <= 0) {
      alert('Informe largura e altura válidas.');
      return;
    }
    const area = w * h;
    const dimensions = `${w.toString().replace('.', ',')}x${h.toString().replace('.', ',')}`;
    const product = dimensionModalProduct;
    let consumoUnitario = area;
    const rolo = dimLarguraMaterial || product.larguraRolo || 0;
    if (rolo > 0) {
      const cabeComoEsta = w <= rolo;
      const cabeGirada = h <= rolo;
      if (!cabeComoEsta && !cabeGirada) {
        alert(`Atenção: nem ${w}m nem ${h}m cabem na largura do material (${rolo}m) em nenhuma orientação. Confira as medidas.`);
      }
      consumoUnitario = calcularConsumoLinear(w, h, rolo);
    }
    // Se a largura do material foi mudada, salva como novo padrao pra proxima vez
    if (dimLarguraMaterial && dimLarguraMaterial !== product.larguraRolo) {
      await supabase.from('produtos').update({ largura_rolo: dimLarguraMaterial }).eq('id', product.id);
    }
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.dimensions === dimensions);
      if (existing) {
        return prev.map(item => (item.productId === product.id && item.dimensions === dimensions)
          ? { ...item, quantity: item.quantity + selectedQty }
          : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: selectedQty,
        dimensions,
        area,
        consumoEstoque: consumoUnitario
      }];
    });
    setDimensionModalProduct(null);
    setDimWidth('');
    setDimHeight('');
    setSelectedQty(1);
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const [discountItemIndex, setDiscountItemIndex] = useState<number | null>(null);
  const [discountMode, setDiscountMode] = useState<'percentual' | 'valor' | 'preco'>('percentual');
  const [discountInput, setDiscountInput] = useState<number | ''>('');

  const openItemDiscount = (index: number) => {
    setDiscountItemIndex(index);
    setDiscountMode('percentual');
    setDiscountInput('');
  };

  const applyItemDiscount = () => {
    if (discountItemIndex === null) return;
    setCart(prev => {
      const updated = [...prev];
      const item = updated[discountItemIndex];
      const original = item.precoOriginal ?? item.price;
      const val = discountInput === '' ? 0 : Number(discountInput);

      if (discountMode === 'preco') {
        // Editar preco direto do item (nao mexe no preco cadastrado do produto no Estoque)
        updated[discountItemIndex] = { ...item, price: Math.max(0, val), precoOriginal: original, descontoValor: undefined };
        return updated;
      }

      const subtotalOriginal = item.area ? original * item.area : original;
      const descontoValor = discountMode === 'percentual' ? subtotalOriginal * (val / 100) : val;
      const novoSubtotal = Math.max(0, subtotalOriginal - descontoValor);
      const novoPreco = item.area ? novoSubtotal / item.area : novoSubtotal;
      updated[discountItemIndex] = { ...item, price: novoPreco, precoOriginal: original, descontoValor };
      return updated;
    });
    setDiscountItemIndex(null);
  };

  const removeItemDiscount = (index: number) => {
    setCart(prev => {
      const updated = [...prev];
      const item = updated[index];
      if (item.precoOriginal !== undefined) {
        updated[index] = { ...item, price: item.precoOriginal, precoOriginal: undefined, descontoValor: undefined };
      }
      return updated;
    });
  };

  const [obsItemIndex, setObsItemIndex] = useState<number | null>(null);
  const updateItemObservacao = (index: number, texto: string) => {
    setCart(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], observacao: texto || undefined };
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setSaleDiscountValue(0); setSaleDiscountInput('');
  };

  const [saleDiscountValue, setSaleDiscountValue] = useState<number>(0);
  const [saleDiscountMode, setSaleDiscountMode] = useState<'percentual' | 'valor' | 'final'>('valor');
  const [saleDiscountInput, setSaleDiscountInput] = useState<number | ''>('');
  const cartRawTotal = cart.reduce((acc, item) => {
    const itemTotal = item.area ? item.price * item.area * item.quantity : item.price * item.quantity;
    return acc + itemTotal;
  }, 0);
  const total = Math.max(0, cartRawTotal - saleDiscountValue);
  const remainingValue = Math.max(0, total - (downPayment === '' || typeof downPayment === 'string' ? 0 : Number(downPayment)));

  // Aplica o desconto da venda a partir do modo escolhido (%, R$ de desconto, ou valor final desejado)
  const applySaleDiscountInput = () => {
    const val = saleDiscountInput === '' ? 0 : Number(saleDiscountInput);
    let novoDesconto = 0;
    if (saleDiscountMode === 'percentual') {
      novoDesconto = cartRawTotal * (val / 100);
    } else if (saleDiscountMode === 'valor') {
      novoDesconto = val;
    } else {
      // valor final desejado: desconto = total original - valor final que o cliente quer pagar
      novoDesconto = Math.max(0, cartRawTotal - val);
    }
    setSaleDiscountValue(Math.max(0, Math.min(cartRawTotal, novoDesconto)));
  };

  // Quitar Debito: abre a mesma tela de pagamento do Terminal, mas pra uma venda ja existente com saldo pendente
  const paymentModalTotal = settlingOrder ? settlingOrder.total : total;
  const paymentModalItems = settlingOrder ? settlingOrder.items : cart;
  const alreadyPaidForSettle = settlingOrder ? (settlingOrder.downPayment || 0) : 0;
  const paymentModalRemaining = settlingOrder
    ? Math.max(0, paymentModalTotal - alreadyPaidForSettle - paymentEntriesTotal)
    : remainingValue;

  const openSettlePayment = (order: SaleOrder) => {
    setSettlingOrder(order);
    setSelectedCustomer(order.customerId ? { id: order.customerId, name: order.customerName || 'Cliente', phone: order.customerPhone || '' } : null);
    setPaymentEntries([]);
    setDownPayment(0);
    setScheduledFor(order.scheduledFor || '');
    setPendingPaymentMethod('');
    setIsPaymentModalOpen(true);
  };

  const confirmAddPayment = () => {
    const rawInput = newPaymentInput === '' ? 0 : Number(newPaymentInput);
    const baseValue = newPaymentMode === 'percentual' ? Number(((total * rawInput) / 100).toFixed(2)) : rawInput;
    if (baseValue <= 0) { alert('Digite um valor válido para o pagamento.'); return; }
    let value = baseValue;
    let installments: number | undefined;
    let feePercent: number | undefined;
    if (newPaymentMethod === 'cartao_credito') {
      installments = newPaymentInstallments;
      feePercent = creditCardFees.find(f => f.installments === newPaymentInstallments)?.feePercent || 0;
      value = Number((baseValue * (1 + feePercent / 100)).toFixed(2));
    } else if (newPaymentMethod === 'cartao_debito' && debitCardFeePercent > 0) {
      feePercent = debitCardFeePercent;
      value = Number((baseValue * (1 + feePercent / 100)).toFixed(2));
    }
    setPaymentEntries(prev => [...prev, { method: newPaymentMethod, value, date: new Date().toISOString(), installments, feePercent }]);
    setNewPaymentMode('valor');
    setNewPaymentInstallments(1);
  };

  const removePaymentEntry = (idx: number) => {
    setPaymentEntries(prev => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    setDownPayment(paymentEntriesTotal);
    if (paymentEntries.length === 1) setPaymentMethod(paymentEntries[0].method as any);
    else if (paymentEntries.length > 1) setPaymentMethod('misto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentEntries]);

  useEffect(() => {
    if (enabledPaymentMethods.length > 0 && !enabledPaymentMethods.includes(newPaymentMethod)) {
      setNewPaymentMethod(enabledPaymentMethods[0] as PaymentEntry['method']);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledPaymentMethods]);

  // O campo de valor sempre vem preenchido com o saldo restante — ao abrir o pagamento,
  // ao adicionar um pagamento (recalcula o que falta), ou ao trocar de forma de pagamento.
  // Nunca mexe no modo (R$ ou %) escolhido pelo usuário.
  useEffect(() => {
    if (!isPaymentModalOpen) return;
    if (newPaymentMode === 'valor') {
      setNewPaymentInput(paymentModalRemaining > 0 ? Number(paymentModalRemaining.toFixed(2)) : '');
    } else if (newPaymentMode === 'percentual') {
      const pct = paymentModalTotal > 0 ? (paymentModalRemaining / paymentModalTotal) * 100 : 0;
      setNewPaymentInput(pct > 0 ? Number(pct.toFixed(2)) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaymentModalOpen, paymentModalRemaining, newPaymentMethod, newPaymentMode]);

  const faturamentoHoje = salesToday.reduce((acc, o) => {
    if (o.status === 'pending') {
      return acc + (o.downPayment || 0);
    }
    return acc + (o.total || 0);
  }, 0);

  const handleFinalize = async (isPending: boolean = false, forceZeroPayment: boolean = false) => {
    // Play money sound
    try {
      const audio = new Audio('/sounds/cash-register.mp3');
      audio.play().catch(() => {});
    } catch (e) {}

    // Quitar Debito: atualiza a venda ja existente em vez de criar uma nova
    if (settlingOrder) {
      const novoTotalPago = alreadyPaidForSettle + paymentEntriesTotal;
      const novoSaldo = Math.max(0, paymentModalTotal - novoTotalPago);
      const pagamentosAnteriores = settlingOrder.payments || [];
      try {
        const { error } = await supabase.from('vendas').update({
          down_payment: novoTotalPago,
          received_value: novoTotalPago,
          payments: [...pagamentosAnteriores, ...paymentEntries],
          status: novoSaldo <= 0 ? 'completed' : 'pending',
          pending_payment_method: novoSaldo > 0 ? (pendingPaymentMethod || null) : null,
          scheduled_for: scheduledFor || settlingOrder.scheduledFor || null,
        }).eq('id', settlingOrder.id);
        if (error) throw error;

        const updatedOrder: SaleOrder = { ...settlingOrder, downPayment: novoTotalPago, receivedValue: novoTotalPago, status: novoSaldo <= 0 ? 'completed' : 'pending', payments: [...pagamentosAnteriores, ...paymentEntries] };
        setLastFinalizedOrder(updatedOrder);
        // Atualiza so essa venda localmente (nao recarrega a tabela inteira, que fica lenta com muitas vendas)
        setAllSalesHistory(prev => prev.map(s => s.id === settlingOrder.id ? updatedOrder : s));
        setSalesToday(prev => prev.map(s => s.id === settlingOrder.id ? updatedOrder : s));
        setIsSuccessModalOpen(true);
        setIsPaymentModalOpen(false);
        setSettlingOrder(null);
        setSelectedCustomer(null);
        setPaymentEntries([]);
        setDownPayment(0);
        setScheduledFor('');
        setOrderObservacoes('');
        setPendingPaymentMethod('');
      } catch (err: any) {
        console.error('Erro ao quitar débito:', err);
        alert(`Não foi possível registrar o pagamento: ${err?.message || 'erro desconhecido'}`);
      }
      return;
    }

    const finalDownPayment = forceZeroPayment ? 0 : (downPayment === '' || typeof downPayment === 'string' ? 0 : Number(downPayment));
    const currentRemaining = Math.max(0, total - finalDownPayment);
    const paymentsToSave = forceZeroPayment ? [] : paymentEntries;

    // Rule: If partial payment (entrada), ensure a scheduled delivery date is set
    let deliveryDate = scheduledFor;
    if (currentRemaining > 0 && !deliveryDate) {
      const defaultDelivery = new Date();
      defaultDelivery.setDate(defaultDelivery.getDate() + 2);
      defaultDelivery.setHours(17, 0, 0, 0);
      deliveryDate = defaultDelivery.toISOString().slice(0, 16);
      setScheduledFor(deliveryDate);
    }

    const isPartialSale = currentRemaining > 0 || isPending;

    const order: SaleOrder = {
      id: `ord_${Date.now()}`,
      companyId: currentCompany?.id || 'default',
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name || 'Cliente de Balcão',
      items: [...cart],
      total,
      downPayment: finalDownPayment,
      receivedValue: finalDownPayment,
      paymentMethod,
      payments: paymentsToSave,
      pendingPaymentMethod: currentRemaining > 0 ? (pendingPaymentMethod || undefined) : undefined,
      status: isPartialSale ? 'pending' : 'completed',
      createdAt: new Date().toISOString(),
      scheduledFor: deliveryDate || undefined,
      observacoes: orderObservacoes || undefined
    };

    // Save to Supabase
    let insertedVenda: any = null;
    try {
      const { data: insertedVendaResult, error } = await supabase.from('vendas').insert({
        customer_name: order.customerName,
        customer_phone: selectedCustomer?.phone,
        items: order.items,
        total: order.total,
        down_payment: order.downPayment,
        received_value: order.receivedValue,
        payment_method: order.paymentMethod,
        payments: paymentsToSave,
        pending_payment_method: currentRemaining > 0 ? (pendingPaymentMethod || null) : null,
        status: order.status,
        scheduled_for: order.scheduledFor || null,
        observacoes: orderObservacoes || null,
        orcamento_id: linkedOrcamentoId || null,
      }).select().single();
      if (error) throw error;
      insertedVenda = insertedVendaResult;

      // Baixa automatica de estoque para cada item vendido (produtos do catalogo real, ignora itens livres/manuais)
      // Roda em paralelo (Promise.all) em vez de um item de cada vez, pra nao deixar o fechamento lento
      await Promise.all(cart.filter(item => item.productId && item.productId !== 'manual').map(async (item) => {
        const qtdBaixa = item.consumoEstoque !== undefined
          ? item.consumoEstoque * item.quantity
          : (item.area ? item.area * item.quantity : item.quantity);
        const { data: prodAtual } = await supabase.from('produtos').select('current_stock, controla_estoque, unit').eq('id', item.productId).maybeSingle();
        if (prodAtual && prodAtual.controla_estoque !== false) {
          const estoqueAnterior = Number(prodAtual.current_stock) || 0;
          const novoEstoque = Math.max(0, estoqueAnterior - qtdBaixa);
          await Promise.all([
            supabase.from('produtos').update({ current_stock: novoEstoque }).eq('id', item.productId),
            supabase.from('movimentacoes_estoque').insert({
              produto_id: item.productId,
              produto_nome: item.name,
              tipo: 'saida',
              quantidade: qtdBaixa,
              unidade: prodAtual.unit || (item.consumoEstoque !== undefined ? 'metro linear' : (item.area ? 'm²' : 'un')),
              motivo: 'venda',
              referencia: `Pedido #${order.id.slice(-8).toUpperCase()}`,
              quantidade_anterior: estoqueAnterior,
              quantidade_posterior: novoEstoque,
            }),
          ]);
        }
      }));

      // Se essa venda veio de um orçamento, marca o orçamento como Concluído — Venda Gerada
      if (linkedOrcamentoId && insertedVenda) {
        await supabase.from('orcamentos').update({ status: 'concluido', venda_id: insertedVenda.id }).eq('id', linkedOrcamentoId);
        setLinkedOrcamentoId(null);
      }
      
      // RULE: Always create Service/OS if pending or has balance OR specific items
      const hasServiceItems = cart.some(item => 
        item.name.toLowerCase().includes('banner') || 
        item.name.toLowerCase().includes('adesivo') ||
        item.name.toLowerCase().includes('serviço')
      );

      if (hasServiceItems || currentRemaining > 0 || isPending) {
        await addDoc(collection(db, 'services'), {
          companyId: currentCompany?.id,
          orderId: order.id,
          client: order.customerName,
          phone: selectedCustomer?.phone || '',
          service: cart.map(i => `${i.quantity}x ${i.name}`).join(', '),
          status: currentRemaining > 0 ? 'pendente' : 'concluido',
          priority: 'normal',
          total: order.total,
          balance: currentRemaining,
          scheduledFor: deliveryDate || null,
          createdAt: Timestamp.now()
        });
        console.log('Ordem de Serviço gerada.');
      }
    } catch (err) {
      console.error('Erro ao salvar venda:', err);
    }

    if (isPartialSale) {
      addPendingOrder(order);
    }
    
    // Adiciona a venda recem criada localmente (usa o id/dados reais vindos do banco)
    // em vez de recarregar a tabela inteira, que fica lenta conforme o historico cresce
    if (insertedVenda) {
      const novaVendaMapeada = mapVendaRow(insertedVenda);
      setAllSalesHistory(prev => [novaVendaMapeada, ...prev]);
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);
      if (new Date(novaVendaMapeada.createdAt) >= inicioHoje) {
        setSalesToday(prev => [novaVendaMapeada, ...prev]);
      }
    }
    setLastFinalizedOrder(order);
    setIsSuccessModalOpen(true);
    setIsPaymentModalOpen(false);
    
    // Reset cart but keep customer for the success modal
    setCart([]);
    setDownPayment(0);
    setOrderObservacoes('');
    setScheduledFor('');
    setSaleDiscountValue(0); setSaleDiscountInput('');
    resetPaymentEntries();
  };

  const [isImportingVendas, setIsImportingVendas] = useState(false);
  const vendasFileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isRegisterOpen) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
        <GlassCard className="max-w-md w-full p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-[32px] flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Caixa Fechado</h2>
          {user?.isAdmin ? (
            <>
              <p className="text-white/40 text-sm">É necessário abrir o caixa para iniciar as vendas do dia.</p>
              <Button className="w-full h-14 text-lg" onClick={() => setIsRegisterOpen(true)}>Abrir Caixa Agora</Button>
            </>
          ) : (
            <p className="text-white/40 text-sm">Apenas o administrador pode abrir o caixa. Aguarde a liberação para iniciar as vendas.</p>
          )}
        </GlassCard>
      </div>
    );
  }

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const { data: vendasData } = await supabase.from('vendas').select('*').is('deleted_at', null);
      const allSales = (vendasData || []).map(mapVendaRow);
      allSales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllSalesHistory(allSales);
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      setSalesToday(allSales.filter(sale => new Date(sale.createdAt) >= startOfDay));

      // Reforca a atualizacao do catalogo de produtos tambem (alem do tempo real)
      const { data: produtosData } = await supabase.from('produtos').select('*').order('name', { ascending: true });
      setProducts((produtosData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.code || '',
        price: Number(p.sale_price) || 0,
        stock: Number(p.current_stock) || 0,
        unitType: p.unit === 'm2' ? 'm2' : p.unit === 'etiqueta' ? 'etiqueta' : 'unit',
        tipoItem: p.tipo_item || 'produto',
        larguraRolo: p.largura_rolo ? Number(p.largura_rolo) : undefined,
        controlaEstoque: p.controla_estoque !== false,
      })));

      setSyncedAt(new Date());
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      alert('Não foi possível sincronizar agora. Verifique sua conexão.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportVendasFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingVendas(true);
    try {
      const buffer = await file.arrayBuffer();
      const rows = parseVendasXlsx(buffer);
      if (rows.length === 0) {
        alert('Nenhuma venda válida encontrada na planilha. Confira se o modelo de colunas está correto.');
        return;
      }
      const payload = rows.map(r => ({
        customer_name: r.customerName,
        items: r.items,
        total: r.total,
        down_payment: r.downPayment || 0,
        payment_method: r.paymentMethod,
        status: r.status,
        ...(r.createdAt ? { created_at: r.createdAt } : {}),
      }));
      const falhasVendas: string[] = [];
      let vendasNovas = 0;
      const batchSize = 200;
      for (let i = 0; i < payload.length; i += batchSize) {
        const slice = payload.slice(i, i + batchSize);
        const { error } = await supabase.from('vendas').insert(slice);
        if (!error) {
          vendasNovas += slice.length;
        } else {
          for (const row of slice) {
            const { error: rowError } = await supabase.from('vendas').insert(row);
            if (rowError) falhasVendas.push(`${row.customer_name || 'sem cliente'}: ${rowError.message}`);
            else vendasNovas += 1;
          }
        }
      }
      if (falhasVendas.length > 0) {
        alert(`${vendasNovas} venda(s) importada(s).\n\n${falhasVendas.length} venda(s) NÃO foram importadas:\n${falhasVendas.slice(0, 10).join('\n')}${falhasVendas.length > 10 ? `\n... e mais ${falhasVendas.length - 10}` : ''}`);
      } else {
        alert(`${vendasNovas} venda(s) importada(s) com sucesso!`);
      }
    } catch (err: any) {
      console.error('Erro ao importar vendas:', err);
      alert(`Não foi possível importar: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setIsImportingVendas(false);
      if (vendasFileInputRef.current) vendasFileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-full min-h-[500px] flex flex-col bg-slate-900/50 rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-right-5 duration-500">
      {/* Tab Navigation */}
      <div className="flex flex-wrap bg-white/5 p-1 sm:p-1.5 gap-1 sm:gap-1.5 border-b border-white/10 items-center justify-between shrink-0">
        <div className="flex sm:flex-wrap gap-1 flex-1 min-w-0 justify-between sm:justify-start">
          {[
            { id: 'venda', label: 'Terminal Venda', icon: ShoppingBag },
            { id: 'historico', label: 'Histórico & Abertas', icon: History },
            { id: 'estoque', label: 'Estoque / Produtos', icon: Box },
            { id: 'servicos', label: 'Serviços', icon: Wrench },
            { id: 'orcamentos', label: 'Orçamentos', icon: FileSpreadsheet },
            { id: 'clientes', label: 'Clientes', icon: Users },
            { id: 'contratos', label: 'Contratos Rafa Art', icon: FileText },
            { id: 'excluidos', label: 'Excluídos', icon: Trash2 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              title={tab.label}
              className={cn(
                "flex items-center justify-center gap-1 flex-1 sm:flex-initial px-1 sm:px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[9px] font-black uppercase tracking-tight sm:tracking-wider transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-primary-500 text-slate-900 shadow-xl" : "text-white/40 hover:bg-white/5 hover:text-white"
              )}
            >
              <tab.icon size={18} className="sm:hidden shrink-0" />
              <tab.icon size={14} className="hidden sm:block shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            title={syncedAt ? `Última sincronização: ${syncedAt.toLocaleTimeString('pt-BR')}` : 'Sincronizar agora'}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg border transition-all shrink-0",
              isSyncing ? "bg-white/5 border-white/10 text-white/30" : "bg-white/5 border-white/10 text-white/50 hover:text-emerald-400 hover:border-emerald-500/20"
            )}
          >
            <RefreshCw size={13} className={cn(isSyncing && "animate-spin")} />
          </button>
          {(user?.isAdmin || user?.allowedActions?.includes('canCloseCashRegister')) && (
            <button
              onClick={() => setIsRegisterOpen(false)}
              title="Fechar Caixa"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-rose-400 hover:border-rose-500/20 transition-all shrink-0"
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
        {activeTab === 'venda' && (
          <>
            {/* Cima no mobile / Esquerda no desktop: Terminal POS + Carrinho */}
            <div className="basis-[50%] shrink-0 grow-0 md:basis-auto md:flex-1 md:shrink bg-[#fef9c3] flex flex-col pt-1 px-2 pb-2 sm:p-6 relative overflow-hidden justify-between min-h-0">
               {/* Top Bar */}
               <div className="flex justify-between items-center text-slate-900/50 pb-1 sm:pb-2 border-b border-slate-900/10">
                  <div className="flex items-center gap-1 sm:gap-2">
                     <ShoppingBag size={10} className="sm:hidden text-slate-900" />
                     <ShoppingBag size={16} className="hidden sm:block text-slate-900" />
                     <p className="text-[6px] sm:text-[10px] font-black uppercase tracking-[1px] sm:tracking-[3px]">Rafa Arts POS Terminal</p>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-3">
                     <p className="hidden sm:block text-[10px] font-black uppercase tracking-[3px]">#001-ALPHA</p>
                     {cart.length > 0 && (
                        <button
                           onClick={clearCart}
                           className="text-[6px] sm:text-[9px] font-bold uppercase text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 px-1 sm:px-2 py-0.5 sm:py-1 rounded-md transition-all flex items-center gap-0.5 sm:gap-1 cursor-pointer"
                           title="Limpar Carrinho"
                        >
                           <Trash2 size={7} className="sm:hidden" />
                           <Trash2 size={10} className="hidden sm:block" />
                           <span className="hidden xs:inline sm:inline">Limpar</span>
                        </button>
                     )}
                  </div>
               </div>

               {/* Total Banner */}
               <div className="py-1 sm:py-3 px-2 sm:px-4 bg-slate-900/5 rounded-lg sm:rounded-2xl border border-slate-900/10 flex items-center justify-between my-0.5 sm:my-2">
                  <div>
                     <p className="text-[6.5px] sm:text-[9px] font-black uppercase tracking-[1.5px] sm:tracking-[3px] text-slate-900/40">Total da Nota</p>
                     <h1 className="text-base sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tighter italic">
                        R$ {total.toFixed(2).replace('.', ',')}
                     </h1>
                  </div>
                  <Badge className="bg-slate-900 text-white border-none py-1 sm:py-1.5 px-2.5 sm:px-4 rounded-full font-black uppercase tracking-widest text-[7px] sm:text-[9px]">
                     {cart.length} {cart.length === 1 ? 'Item' : 'Itens'}
                  </Badge>
               </div>

               {/* Visualizador de Itens no PDV (Compact Items Cart List) */}
               <div className="flex-1 min-h-0 my-1 sm:my-2 bg-white/70 backdrop-blur-xs rounded-xl sm:rounded-2xl border border-slate-900/10 p-1.5 sm:p-3 flex flex-col overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between pb-1 sm:pb-2 border-b border-slate-900/10 mb-1 sm:mb-2">
                     <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider text-slate-700">Itens ({cart.length})</span>
                     <span className="hidden sm:inline text-[8px] font-bold text-slate-400 uppercase">Lista de Lançamento</span>
                  </div>

                  {cart.length === 0 ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-center p-3 sm:p-6 space-y-1.5 sm:space-y-2">
                        <ShoppingBag size={20} className="sm:hidden text-slate-400/50 animate-bounce" />
                        <ShoppingBag size={28} className="hidden sm:block text-slate-400/50 animate-bounce" />
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-700 uppercase tracking-wider">Carrinho Livre</p>
                        <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 max-w-[200px]">Selecione os produtos na lista abaixo para adicionar ao pedido.</p>
                     </div>
                  ) : (
                     <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-slate-200/60 pr-1">
                        {cart.map((item, idx) => {
                           const itemSubtotal = item.area ? item.price * item.area * item.quantity : item.price * item.quantity;
                           return (
                              <div key={idx} className="py-1 px-1.5 sm:py-1.5 sm:px-2 hover:bg-slate-900/5 rounded-lg transition-all group">
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                                    <span className="text-[8px] sm:text-[9px] font-black text-slate-900 bg-slate-900/10 px-1 py-0.5 sm:px-1.5 rounded-md min-w-[20px] sm:min-w-[24px] text-center shrink-0">
                                       {item.quantity}x
                                    </span>
                                    <div className="min-w-0 flex-1">
                                       <p className="text-[9px] sm:text-[10px] font-bold text-slate-900 uppercase truncate leading-tight tracking-tight">
                                          {item.name}
                                       </p>
                                       {item.dimensions && (
                                          <p className="text-[7px] sm:text-[8px] font-bold text-slate-500 tracking-wider">
                                             {item.dimensions}{item.area ? ` (${item.area.toFixed(2).replace('.', ',')} m²)` : ''}
                                          </p>
                                       )}
                                       {item.descontoValor !== undefined && item.descontoValor > 0 && (
                                          <p className="text-[7px] sm:text-[8px] font-bold text-emerald-600">
                                             Desconto: -R$ {item.descontoValor.toFixed(2).replace('.', ',')}
                                          </p>
                                       )}
                                    </div>
                                 </div>

                                 <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-1 sm:ml-2">
                                    <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-900/5 rounded-md p-0.5 border border-slate-900/10">
                                       <button
                                          onClick={() => updateCartQty(idx, -1)}
                                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded bg-white text-slate-800 font-black text-[8px] sm:text-[9px] flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                                          title="Diminuir"
                                       >
                                          -
                                       </button>
                                       <span className="text-[8px] sm:text-[9px] font-black px-0.5 sm:px-1 text-slate-900">{item.quantity}</span>
                                       <button
                                          onClick={() => updateCartQty(idx, 1)}
                                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded bg-white text-slate-800 font-black text-[8px] sm:text-[9px] flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                                          title="Aumentar"
                                       >
                                          +
                                       </button>
                                    </div>

                                    <button
                                       onClick={() => setObsItemIndex(obsItemIndex === idx ? null : idx)}
                                       className={cn("p-0.5 sm:p-1 transition-colors cursor-pointer", item.observacao ? "text-amber-600" : "text-slate-400 hover:text-primary-600")}
                                       title="Observação do item"
                                    >
                                       <MessageSquare size={11} className="sm:hidden" />
                                       <MessageSquare size={12} className="hidden sm:block" />
                                    </button>

                                    <button
                                       onClick={() => item.descontoValor ? removeItemDiscount(idx) : openItemDiscount(idx)}
                                       className={cn(
                                         "p-0.5 sm:p-1 transition-colors cursor-pointer",
                                         item.descontoValor ? "text-emerald-600 hover:text-rose-600" : "text-slate-400 hover:text-primary-600"
                                       )}
                                       title={item.descontoValor ? "Remover desconto" : "Desconto / editar preço"}
                                    >
                                       <Percent size={11} className="sm:hidden" />
                                       <Percent size={12} className="hidden sm:block" />
                                    </button>

                                    <span className="text-[9px] sm:text-[10px] font-black text-slate-900 tracking-tight min-w-[48px] sm:min-w-[60px] text-right">
                                       R$ {itemSubtotal.toFixed(2).replace('.', ',')}
                                    </span>

                                    <button
                                       onClick={() => removeFromCart(idx)}
                                       className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 sm:p-1 cursor-pointer"
                                       title="Remover Item"
                                    >
                                       <Trash2 size={11} className="sm:hidden" />
                                       <Trash2 size={12} className="hidden sm:block" />
                                    </button>
                                 </div>
                              </div>
                              {(obsItemIndex === idx || item.observacao) && (
                                <input
                                  value={item.observacao || ''}
                                  onChange={(e) => updateItemObservacao(idx, e.target.value)}
                                  onFocus={() => setObsItemIndex(idx)}
                                  placeholder="Observação deste item (ex: cor, acabamento, pedido do cliente)..."
                                  className="w-full mt-1 h-6 bg-amber-50 border border-amber-200 rounded-md px-2 text-[8px] sm:text-[9px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
                                />
                              )}
                              </div>
                           );
                        })}
                     </div>
                  )}
               </div>

               {/* Bottom Automation Bar */}
               <div className="pt-2 border-t border-slate-900/10 flex justify-between items-center text-slate-900">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[9px] font-black uppercase tracking-wider opacity-70">PDV Conectado</span>
                  </div>
                  {user?.isAdmin && (
                    <div className="text-right">
                       <span className="text-[8px] font-black uppercase tracking-widest opacity-50 block leading-none">Faturamento Hoje</span>
                       <span className="text-[10px] font-black italic">R$ {faturamentoHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
               </div>
            </div>

            {/* Embaixo no mobile / Direita no desktop: Lista de Produtos */}
            <div className="flex-1 min-h-0 md:w-[450px] md:flex-none bg-white flex flex-col min-h-0 border-t md:border-t-0 md:border-l border-slate-200 shadow-2xl relative">
               {/* Search & Action Bar */}
               <div className="p-2 sm:p-4 bg-slate-50 space-y-1.5 sm:space-y-3 shrink-0">
                  <div className="flex gap-1.5 sm:gap-2 h-9 sm:h-12">
                     {(user?.isAdmin || user?.allowedActions?.includes('canAddProduct')) && (
                       <button 
                          onClick={() => setIsQuickProductOpen(true)}
                          title="Cadastrar Produto"
                          className="w-9 sm:w-11 shrink-0 bg-white border-2 border-primary-400 text-primary-600 rounded-lg sm:rounded-xl hover:bg-primary-50 transition-all shadow-sm active:scale-95 flex items-center justify-center"
                       >
                          <PlusSquare size={15} className="sm:hidden" />
                          <PlusSquare size={18} className="hidden sm:block" />
                       </button>
                     )}
                     <div className="flex-[2] flex gap-1 bg-white border-2 border-slate-200 rounded-lg sm:rounded-xl p-1 overflow-x-auto no-scrollbar">
                        {[1, 2, 3, 4, 5].map(q => (
                          <button 
                            key={q} 
                            onClick={() => setSelectedQty(q)}
                            className={cn(
                              "flex-1 rounded-md sm:rounded-lg text-xs sm:text-sm font-black transition-all",
                              selectedQty === q ? "bg-primary-500 text-slate-900" : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            {q}x
                          </button>
                        ))}
                     </div>
                  </div>
                  <div className="relative">
                     <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                     <input 
                       value={search}
                       onChange={(e) => setSearch(e.target.value.toUpperCase())}
                       className="w-full h-8 sm:h-11 bg-white border-2 border-slate-200 rounded-lg sm:rounded-xl pl-8 sm:pl-10 pr-3 sm:pr-4 text-[11px] sm:text-xs font-bold text-slate-700 placeholder:text-slate-300 outline-none focus:border-primary-500 transition-all uppercase"
                       placeholder="BUSCAR OU BIPAR..."
                     />
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 px-1">
                     {products.filter(p => p.name.toUpperCase().includes(search.toUpperCase())).length} de {products.length} produto(s) — role a lista pra ver todos
                  </p>
               </div>

                {/* COMPACT PRODUCT LIST */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-white">
                   <div className="divide-y divide-slate-50">
                      {products.filter(p => p.name.toUpperCase().includes(search.toUpperCase())).map(product => (
                        <div 
                          key={product.id} 
                          onClick={() => addToCart(product)}
                          className="flex items-center px-3 sm:px-4 py-1.5 sm:py-1.5 hover:bg-primary-50 transition-colors group cursor-pointer border-b border-slate-50 last:border-0"
                        >
                           <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-black text-slate-800 truncate leading-none uppercase tracking-tight">{product.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[7px] font-bold text-slate-300 tracking-[1px] uppercase bg-slate-100 px-1 rounded-sm">{product.code}</span>
                                 <span className="text-[7px] font-bold text-slate-400 uppercase">Est: {product.stock}</span>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <p className="text-[10px] font-black text-emerald-600 tracking-tighter italic">R$ {product.price.toFixed(2).replace('.', ',')}</p>
                              <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary-500 group-hover:text-slate-900 transition-all">
                                 <Plus size={12} />
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

               <div className="shrink-0 p-1.5 sm:p-6 bg-slate-50 border-t border-slate-200 space-y-4 sticky bottom-0 z-10">
                  <div className="flex gap-2 sm:gap-4 h-11 sm:h-24">
                     {orcamentoItemsEditMode ? (
                       <button
                         onClick={handleReturnItemsToOrcamento}
                         className="flex-1 h-full bg-primary-500 border-2 border-primary-600 text-slate-900 rounded-2xl sm:rounded-[28px] flex flex-col items-center justify-center gap-0.5 sm:gap-1 shadow-xl shadow-primary-500/20 hover:bg-primary-400 transition-all active:scale-95"
                       >
                          <div className="flex items-center gap-1.5 sm:gap-3">
                             <FileSpreadsheet size={16} className="sm:hidden" />
                             <FileSpreadsheet size={24} className="hidden sm:block" />
                             <span className="text-xs sm:text-lg font-black uppercase tracking-tighter">VOLTAR AO ORÇAMENTO ({cart.length})</span>
                          </div>
                          <span className="hidden sm:block text-[10px] font-black opacity-40 uppercase tracking-[4px]">Salva os itens escolhidos e retorna</span>
                       </button>
                     ) : (
                       <button 
                         disabled={cart.length === 0}
                         onClick={() => {
                            if (selectedCustomer) {
                               setIsPaymentModalOpen(true);
                            } else {
                               setCustomerModalIntent('finalize');
                               setIsCustomerModalOpen(true);
                            }
                         }}
                         className="flex-1 h-full bg-primary-500 border-2 border-primary-600 text-slate-900 rounded-2xl sm:rounded-[28px] flex flex-col items-center justify-center gap-0.5 sm:gap-1 shadow-xl shadow-primary-500/20 hover:bg-primary-400 transition-all disabled:opacity-50 disabled:grayscale active:scale-95"
                       >
                          <div className="flex items-center gap-1.5 sm:gap-3">
                             <ShoppingBag size={16} className="sm:hidden" />
                             <ShoppingBag size={24} className="hidden sm:block" />
                             <span className="text-xs sm:text-lg font-black uppercase tracking-tighter">FINALIZAR VENDA</span>
                          </div>
                          <span className="hidden sm:block text-[10px] font-black opacity-40 uppercase tracking-[4px]">Ir para pagamento e fechamento</span>
                       </button>
                     )}
                  </div>
               </div>
            </div>
          </>
        )}

        {activeTab === 'historico' && (
          <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar bg-slate-900/40">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
                  <History className="text-primary-400" size={24} />
                  Histórico Geral de Vendas & Serviços
                </h2>
                <p className="text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
                  Acompanhamento de entradas, saldos devedores e entregas agendadas
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <input ref={vendasFileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportVendasFile} />
                <button
                  disabled={isImportingVendas}
                  title={isImportingVendas ? 'Importando...' : 'Importar Planilha'}
                  onClick={() => vendasFileInputRef.current?.click()}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-primary-400 hover:border-primary-500/20 transition-all disabled:opacity-50"
                >
                  <Upload size={13} className={cn(isImportingVendas && "animate-pulse")} />
                </button>
                <button
                  title="Exportar Planilha"
                  onClick={() => exportVendasXlsx(filteredSalesHistory)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-primary-400 hover:border-primary-500/20 transition-all"
                >
                  <Download size={13} />
                </button>
                {selectedSaleIds.size > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-[9px] font-black uppercase tracking-wider px-3 h-9 border-white/10"
                      onClick={handleToggleSelectAll}
                    >
                      {selectedSaleIds.size === filteredSalesHistory.length ? 'Desmarcar Todos' : `Selecionar Todos (${filteredSalesHistory.length})`}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-rose-500 hover:bg-rose-400 text-white text-[9px] font-black uppercase tracking-wider px-3 h-9 border-none"
                      onClick={handleBulkDeleteSales}
                    >
                      Excluir Selecionados ({selectedSaleIds.size})
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Barra de controles: Pesquisa | Ordenação & Visualização | Filtros de Status — tudo em uma linha */}
            <div className="flex flex-wrap items-center gap-2 bg-white/[0.02] border border-white/5 rounded-2xl p-2.5">
              {/* Grupo 1: Pesquisa */}
              <div className="relative w-full sm:w-40 xl:w-48 shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" size={13} />
                <input
                  value={historySearch}
                  onChange={e => { setHistorySearch(e.target.value); setHistoryClienteIdFilter(null); }}
                  placeholder="Buscar..."
                  className={cn(
                    "w-full bg-white/5 border rounded-lg pl-8 pr-7 py-2 text-[11px] text-white placeholder-white/30 focus:outline-none focus:border-primary-500",
                    historyClienteIdFilter ? "border-primary-500/50" : "border-white/10"
                  )}
                />
                {historyClienteIdFilter && (
                  <button
                    onClick={() => { setHistorySearch(''); setHistoryClienteIdFilter(null); }}
                    title="Limpar filtro do cliente"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-primary-400 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="w-px h-6 bg-white/10 shrink-0" />

              {/* Grupo 1.5: Período personalizado */}
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="date"
                  value={historyDateFrom}
                  onChange={(e) => setHistoryDateFrom(e.target.value)}
                  title="De"
                  className="bg-white/5 border border-white/10 rounded-lg px-1.5 py-2 text-[10px] text-white/70 focus:outline-none focus:border-primary-500 w-[108px]"
                />
                <span className="text-white/20 text-[9px]">até</span>
                <input
                  type="date"
                  value={historyDateTo}
                  onChange={(e) => setHistoryDateTo(e.target.value)}
                  title="Até"
                  className="bg-white/5 border border-white/10 rounded-lg px-1.5 py-2 text-[10px] text-white/70 focus:outline-none focus:border-primary-500 w-[108px]"
                />
                {(historyDateFrom || historyDateTo) && (
                  <button
                    onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); }}
                    title="Limpar período"
                    className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-rose-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="w-px h-6 bg-white/10 shrink-0" />

              {/* Grupo 2: Ordenação & Visualização */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setHistorySortOrder(historySortOrder === 'desc' ? 'asc' : 'desc')}
                  title={historySortOrder === 'desc' ? 'Mais recentes primeiro' : 'Mais antigas primeiro'}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all shrink-0"
                >
                  {historySortOrder === 'desc' ? <ArrowDownWideNarrow size={13} /> : <ArrowUpWideNarrow size={13} />}
                </button>
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 gap-0.5">
                  {[
                    { id: 'miniatura', label: 'Miniaturas', icon: LayoutGrid },
                    { id: 'normal', label: 'Normal', icon: Square },
                    { id: 'lista', label: 'Lista', icon: List },
                  ].map(v => (
                    <button
                      key={v.id}
                      onClick={() => setHistoryViewMode(v.id as any)}
                      title={v.label}
                      className={cn(
                        "w-7 h-7 rounded-md transition-all flex items-center justify-center",
                        historyViewMode === v.id ? "bg-primary-500 text-slate-900 shadow-lg font-black" : "text-white/40 hover:text-white"
                      )}
                    >
                      <v.icon size={12} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-px h-6 bg-white/10 shrink-0" />

              {/* Grupo 3: Status do Pedido + Forma de Pagamento (duas listas independentes) */}
              {(() => {
                const orderStatusOptions: { id: OrderStatusFilterId; label: string }[] = [
                  { id: 'em_aberto', label: 'Em Aberto' },
                  { id: 'entrada_recebida', label: 'Entrada Recebida' },
                  { id: 'quitado', label: 'Quitado' },
                  { id: 'entregue', label: 'Entregue' },
                  { id: 'cancelado', label: 'Cancelado' },
                ];
                const paymentOptions: { id: PaymentFilterId; label: string }[] = [
                  { id: 'pix', label: 'Pix' },
                  { id: 'dinheiro', label: 'Dinheiro' },
                  { id: 'cartao_debito', label: 'Cartão de Débito' },
                  { id: 'cartao_credito', label: 'Cartão de Crédito' },
                  { id: 'transferencia', label: 'Transferência' },
                  { id: 'boleto', label: 'Boleto' },
                  { id: 'crediario', label: 'Crediário' },
                ];

                const renderFilterDropdown = <T extends string>(cfg: {
                  label: string;
                  icon: any;
                  options: { id: T; label: string }[];
                  selected: Set<T>;
                  toggle: (id: T) => void;
                  clear: () => void;
                  counts: Record<string, number>;
                  isOpen: boolean;
                  setIsOpen: (v: boolean | ((p: boolean) => boolean)) => void;
                  containerRef: React.RefObject<HTMLDivElement>;
                  btnRef: React.RefObject<HTMLButtonElement>;
                  menuRef: React.RefObject<HTMLDivElement>;
                  pos: { top: number; left: number; width: number } | null;
                  setPos: (p: { top: number; left: number; width: number }) => void;
                }) => {
                  const buttonLabel = cfg.selected.size === 0
                    ? 'Todos'
                    : cfg.selected.size === 1
                      ? cfg.options.find(o => cfg.selected.has(o.id))?.label
                      : `${cfg.selected.size} Selecionados`;
                  const buttonCount = cfg.selected.size === 0 ? cfg.counts.todos ?? 0 : cfg.options.filter(o => cfg.selected.has(o.id)).reduce((sum, o) => sum + (cfg.counts[o.id] ?? 0), 0);
                  const toggleOpen = () => {
                    if (!cfg.isOpen && cfg.btnRef.current) {
                      const rect = cfg.btnRef.current.getBoundingClientRect();
                      cfg.setPos({ top: rect.top, left: rect.left, width: rect.width });
                    }
                    cfg.setIsOpen(prev => !prev);
                  };
                  return (
                    <div className="relative shrink-0" ref={cfg.containerRef}>
                      <button
                        ref={cfg.btnRef}
                        onClick={toggleOpen}
                        title={`${cfg.label}: ${buttonLabel}`}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide border transition-all whitespace-nowrap",
                          cfg.selected.size > 0
                            ? "bg-primary-500 text-slate-900 border-primary-500 shadow-lg shadow-primary-500/20"
                            : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                        )}
                      >
                        <cfg.icon size={13} className="shrink-0" />
                        <span>{buttonLabel}</span>
                        <span className="bg-black/20 text-[8px] px-1.5 py-0.5 rounded-full font-mono">{buttonCount}</span>
                        <ChevronDown size={11} className={cn("transition-transform shrink-0", cfg.isOpen && "rotate-180")} />
                      </button>
                      {cfg.isOpen && cfg.pos && createPortal(
                        <div
                          ref={cfg.menuRef}
                          style={{
                            position: 'fixed',
                            left: cfg.pos.left,
                            bottom: window.innerHeight - cfg.pos.top + 8,
                            minWidth: Math.max(cfg.pos.width, 220),
                          }}
                          className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[100] py-2 max-h-[28rem] overflow-y-auto custom-scrollbar"
                        >
                          <button
                            onClick={cfg.clear}
                            className={cn(
                              "w-full flex items-center justify-between gap-2 text-left px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all mb-1",
                              cfg.selected.size === 0 ? "text-primary-400 bg-primary-500/10" : "text-white/60 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <span>Todos</span>
                            <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded-full min-w-[20px] text-center", cfg.selected.size === 0 ? "bg-black/20" : "bg-white/5 text-white/30")}>
                              {cfg.counts.todos ?? 0}
                            </span>
                          </button>
                          <div className="h-px bg-white/5 my-1 mx-3" />
                          {cfg.options.map(f => {
                            const isSelected = cfg.selected.has(f.id);
                            return (
                              <button
                                key={f.id}
                                onClick={() => cfg.toggle(f.id)}
                                className={cn(
                                  "w-full flex items-center justify-between gap-2 text-left px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all",
                                  isSelected ? "text-primary-400 bg-primary-500/10" : "text-white/60 hover:bg-white/5 hover:text-white"
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  <span className={cn(
                                    "w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0",
                                    isSelected ? "bg-current border-current" : "border-white/20"
                                  )}>
                                    {isSelected && <Check size={10} className="text-slate-900" />}
                                  </span>
                                  {f.label}
                                </span>
                                <span className={cn(
                                  "text-[9px] font-mono px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                                  isSelected ? "bg-black/20" : "bg-white/5 text-white/30"
                                )}>
                                  {cfg.counts[f.id] ?? 0}
                                </span>
                              </button>
                            );
                          })}
                        </div>,
                        document.body
                      )}
                    </div>
                  );
                };

                return (
                  <>
                    {renderFilterDropdown({
                      label: 'Status do Pedido',
                      icon: ClipboardList,
                      options: orderStatusOptions,
                      selected: selectedOrderStatusFilters,
                      toggle: toggleOrderStatusFilter,
                      clear: clearOrderStatusFilters,
                      counts: orderStatusCounts,
                      isOpen: isOrderStatusOpen,
                      setIsOpen: setIsOrderStatusOpen,
                      containerRef: orderStatusRef,
                      btnRef: orderStatusBtnRef,
                      menuRef: orderStatusMenuRef,
                      pos: orderStatusPos,
                      setPos: setOrderStatusPos,
                    })}
                    {renderFilterDropdown({
                      label: 'Pagamento',
                      icon: CreditCard,
                      options: paymentOptions,
                      selected: selectedPaymentFilters,
                      toggle: togglePaymentFilter,
                      clear: clearPaymentFilters,
                      counts: paymentFilterCounts,
                      isOpen: isPaymentFilterOpen,
                      setIsOpen: setIsPaymentFilterOpen,
                      containerRef: paymentFilterRef,
                      btnRef: paymentFilterBtnRef,
                      menuRef: paymentFilterMenuRef,
                      pos: paymentFilterPos,
                      setPos: setPaymentFilterPos,
                    })}
                  </>
                );
              })()}
            </div>

            {/* Orders List */}
            {(() => {
              const filteredSales = filteredSalesHistory;

              if (filteredSales.length === 0) {
                return (
                  <div className="py-16 text-center bg-white/5 rounded-3xl border border-dashed border-white/10 space-y-2">
                    <History size={36} className="mx-auto text-white/20" />
                    <p className="text-sm font-bold text-white/40 uppercase">Nenhum registro encontrado</p>
                    <p className="text-xs text-white/20">As vendas e serviços finalizados ou com entrada aparecerão aqui.</p>
                  </div>
                );
              }

              // --- MODO LISTA ---
              if (historyViewMode === 'lista') {
                return (
                  <div className="flex flex-col gap-1.5">
                    {filteredSales.map(sale => {
                      const down = sale.downPayment || 0;
                      const balance = sale.total - down;
                      const isPartial = balance > 0 || sale.status === 'pending';
                      return (
                        <div key={sale.id} className="flex items-center gap-3 bg-slate-900/60 hover:bg-slate-900 border border-white/5 rounded-xl px-3 py-2 transition-all">
                          {canManageHistory && (
                            <input type="checkbox" checked={selectedSaleIds.has(sale.id)} onChange={() => toggleSaleSelection(sale.id)} className="w-3.5 h-3.5 shrink-0 accent-primary-500" />
                          )}
                          <div className="flex-1 min-w-0 flex items-center gap-3 overflow-x-auto custom-scrollbar">
                            <span className="text-[11px] font-black text-white whitespace-nowrap">{sale.customerName || 'Cliente de Balcão'}</span>
                            {sale.items && sale.items.length > 0 && (
                              <span className="text-[9px] text-white/40 italic whitespace-nowrap" title={sale.items[sale.items.length - 1].name}>
                                {sale.items[sale.items.length - 1].name}{sale.items.length > 1 ? ` (+${sale.items.length - 1})` : ''}
                              </span>
                            )}
                            {sale.observacoes && (
                              <span className="text-[9px] text-amber-300/70 italic whitespace-nowrap" title={sale.observacoes}>
                                "{sale.observacoes}"
                              </span>
                            )}
                            <span className="hidden sm:inline text-[9px] text-white/30 font-mono shrink-0">#{sale.id.slice(-8).toUpperCase()}</span>
                            <span className="hidden sm:inline text-[9px] text-white/30 shrink-0">{safeFormat(sale.createdAt, 'dd/MM HH:mm')}</span>
                          </div>
                          <Badge className={cn("text-[7.5px] font-black uppercase px-1.5 py-0.5 border-none shrink-0", isPartial ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300")}>
                            {isPartial ? `FALTA R$ ${balance.toFixed(2).replace('.', ',')}` : 'PAGO'}
                          </Badge>
                          <span className="text-[11px] font-black text-white shrink-0 w-20 text-right">R$ {sale.total.toFixed(2).replace('.', ',')}</span>
                          <div className="flex gap-1 shrink-0">
                            {isPartial && (
                              <button onClick={() => openSettlePayment(sale)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="Quitar Débito"><CheckCircle2 size={13} /></button>
                            )}
                            <button onClick={() => openReceiptDetail(sale)} className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10" title="Recibo"><FileText size={13} /></button>
                            {canManageHistory && (
                              <>
                                {!isPartial && <button onClick={() => handleReopenSale(sale)} className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" title="Reabrir"><History size={13} /></button>}
                                <button onClick={() => startEditSale(sale)} className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20" title="Editar"><Pencil size={13} /></button>
                                <button onClick={() => handleDeleteSale(sale)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" title="Excluir"><Trash2 size={13} /></button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // --- MODO MINIATURA ---
              if (historyViewMode === 'miniatura') {
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filteredSales.map(sale => {
                      const down = sale.downPayment || 0;
                      const balance = sale.total - down;
                      const isPartial = balance > 0 || sale.status === 'pending';
                      return (
                        <GlassCard key={sale.id} className="p-3 border-white/10 space-y-2 bg-slate-900/80 hover:border-white/20 transition-all relative">
                          <div className="flex items-start justify-between gap-1">
                            {canManageHistory && (
                              <input type="checkbox" checked={selectedSaleIds.has(sale.id)} onChange={() => toggleSaleSelection(sale.id)} className="w-3.5 h-3.5 mt-0.5 shrink-0 accent-primary-500" />
                            )}
                            <Badge className={cn("text-[6.5px] font-black uppercase px-1.5 py-0.5 border-none ml-auto", isPartial ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300")}>
                              {isPartial ? `FALTA R$ ${balance.toFixed(2).replace('.', ',')}` : 'PAGO'}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-white uppercase truncate">{sale.customerName || 'Cliente de Balcão'}</p>
                            {sale.items && sale.items.length > 0 && (
                              <p className="text-[8px] text-white/40 italic truncate" title={sale.items[sale.items.length - 1].name}>
                                {sale.items[sale.items.length - 1].name}{sale.items.length > 1 ? ` (+${sale.items.length - 1})` : ''}
                              </p>
                            )}
                            <p className="text-[8px] text-white/30 font-mono">#{sale.id.slice(-8).toUpperCase()}</p>
                          </div>
                          <p className="text-sm font-black text-white">R$ {sale.total.toFixed(2).replace('.', ',')}</p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {isPartial && <button onClick={() => openSettlePayment(sale)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="Quitar Débito"><CheckCircle2 size={12} /></button>}
                            <button onClick={() => openReceiptDetail(sale)} className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10" title="Recibo"><FileText size={12} /></button>
                            {canManageHistory && (
                              <>
                                {!isPartial && <button onClick={() => handleReopenSale(sale)} className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" title="Reabrir"><History size={12} /></button>}
                                <button onClick={() => startEditSale(sale)} className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20" title="Editar"><Pencil size={12} /></button>
                                <button onClick={() => handleDeleteSale(sale)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" title="Excluir"><Trash2 size={12} /></button>
                              </>
                            )}
                          </div>
                        </GlassCard>
                      );
                    })}
                  </div>
                );
              }

              // --- MODO NORMAL (padrão) ---
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSales.map(sale => {
                    const down = sale.downPayment || 0;
                    const balance = sale.total - down;
                    const isPartial = balance > 0 || sale.status === 'pending';

                    return (
                      <GlassCard key={sale.id} className="p-6 border-white/10 space-y-4 bg-slate-900/80 hover:border-white/20 transition-all relative overflow-hidden">
                        <div className="flex justify-between items-start border-b border-white/5 pb-3">
                          <div className="flex items-start gap-2">
                            {canManageHistory && (
                              <input type="checkbox" checked={selectedSaleIds.has(sale.id)} onChange={() => toggleSaleSelection(sale.id)} className="w-4 h-4 mt-1 shrink-0 accent-primary-500" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-white uppercase">{sale.customerName || 'Cliente de Balcão'}</h4>
                                <Badge 
                                  className={cn(
                                    "text-[8px] font-black uppercase px-2 py-0.5 border-none",
                                    isPartial ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"
                                  )}
                                >
                                  {isPartial ? `FALTA R$ ${balance.toFixed(2).replace('.', ',')}` : 'PAGO'}
                                </Badge>
                              </div>
                              <p className="text-[9px] text-white/30 font-mono mt-0.5">#{sale.id.slice(-8).toUpperCase()} • {safeFormat(sale.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                            </div>
                          </div>
                          
                          {sale.scheduledFor && (() => {
                            const overdue = new Date(sale.scheduledFor).getTime() <= Date.now();
                            return (
                              <div className={cn(
                                "border rounded-xl px-2.5 py-1 text-right",
                                overdue ? "bg-rose-500/10 border-rose-500/20" : "bg-primary-500/10 border-primary-500/20"
                              )}>
                                <span className={cn("text-[7.5px] font-black uppercase tracking-wider block", overdue ? "text-rose-300" : "text-primary-300")}>
                                  {overdue ? 'Entrega Atrasada' : 'Entrega Agendada'}
                                </span>
                                <span className="text-[9.5px] font-bold text-white">{safeFormat(sale.scheduledFor, 'dd/MM/yyyy HH:mm')}</span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Items Summary */}
                        <div className="space-y-1 text-xs text-white/70 bg-white/5 p-3 rounded-xl border border-white/5">
                          {sale.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[11px]">
                              <span>{item.quantity}x {item.name} {item.dimensions ? `(${item.dimensions})` : ''}</span>
                              <span className="font-bold text-white/80">R$ {((item.area ? item.price * item.area : item.price) * item.quantity).toFixed(2).replace('.', ',')}</span>
                            </div>
                          ))}
                        </div>

                        {/* Financial Box */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-2xl border border-white/5 text-center">
                          <div>
                            <span className="text-[8px] font-black uppercase text-white/30 tracking-wider block">Total</span>
                            <span className="text-xs font-black text-white">R$ {sale.total.toFixed(2).replace('.', ',')}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black uppercase text-emerald-400 tracking-wider block">Entrada Paga</span>
                            <span className="text-xs font-black text-emerald-400">R$ {down.toFixed(2).replace('.', ',')}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black uppercase text-rose-400 tracking-wider block">Falta Quitar</span>
                            <span className={cn("text-xs font-black", balance > 0 ? "text-rose-400 font-extrabold" : "text-white/30")}>
                              R$ {balance.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 justify-end pt-1 flex-wrap">
                          {isPartial && (
                            <Button
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-[9px] font-black uppercase tracking-wider px-4 h-9"
                              onClick={() => openSettlePayment(sale)}
                            >
                              <CheckCircle2 size={14} className="mr-1" />
                              Quitar Débito (R$ {balance.toFixed(2).replace('.', ',')})
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-[9px] font-black uppercase tracking-wider px-3 h-9 border-white/10"
                            onClick={() => openReceiptDetail(sale)}
                          >
                            Recibo
                          </Button>
                          {canManageHistory && (
                            <>
                              {!isPartial && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="text-[9px] font-black uppercase tracking-wider px-3 h-9 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                                  onClick={() => handleReopenSale(sale)}
                                >
                                  Reabrir
                                </Button>
                              )}
                              <Button
                                variant="secondary"
                                size="sm"
                                className="text-[9px] font-black uppercase tracking-wider px-3 h-9 border-primary-500/20 text-primary-400 hover:bg-primary-500/10"
                                onClick={() => startEditSale(sale)}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="text-[9px] font-black uppercase tracking-wider px-3 h-9 border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                                onClick={() => handleDeleteSale(sale)}
                              >
                                Excluir
                              </Button>
                            </>
                          )}
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'estoque' && (
          <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-slate-900/30">
            <InventoryModule currentCompany={currentCompany} />
          </div>
        )}

        {activeTab === 'servicos' && (
          <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-slate-900/40 space-y-6">
            {/* Resumo da Ordem de Servicos — usa o mesmo filtro de periodo do Historico */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Período:</span>
                  <input
                    type="date"
                    value={historyDateFrom}
                    onChange={(e) => setHistoryDateFrom(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white/70 focus:outline-none focus:border-primary-500"
                  />
                  <span className="text-white/20 text-[9px]">até</span>
                  <input
                    type="date"
                    value={historyDateTo}
                    onChange={(e) => setHistoryDateTo(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white/70 focus:outline-none focus:border-primary-500"
                  />
                  {(historyDateFrom || historyDateTo) && (
                    <button onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); }} className="text-[9px] font-black uppercase text-white/30 hover:text-rose-400 px-2">Limpar</button>
                  )}
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                     <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Faturamento</p>
                     <p className="text-xl font-black text-white italic mt-1">R$ {servicosResumo.faturamento.toFixed(2).replace('.', ',')}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                     <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Líquido (Recebido)</p>
                     <p className="text-xl font-black text-emerald-400 italic mt-1">R$ {servicosResumo.liquido.toFixed(2).replace('.', ',')}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                     <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Lucro</p>
                     <p className="text-xl font-black text-primary-400 italic mt-1">R$ {servicosResumo.lucro.toFixed(2).replace('.', ',')}</p>
                     {!servicosResumo.temCustoRegistrado && (
                       <p className="text-[8px] text-amber-400/70 font-bold mt-1">Sem custo cadastrado nos produtos — lucro = líquido</p>
                     )}
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-1.5">
                     <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Com Entrada</p>
                     <p className="text-[10px] text-white/50 font-bold">{servicosResumo.comEntrada.count} serviço(s)</p>
                     <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                        <span className="text-white/40">Total</span>
                        <span className="font-black text-white">R$ {servicosResumo.comEntrada.total.toFixed(2).replace('.', ',')}</span>
                     </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-white/40">Recebido</span>
                        <span className="font-black text-emerald-400">R$ {servicosResumo.comEntrada.recebido.toFixed(2).replace('.', ',')}</span>
                     </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-white/40">Pendente</span>
                        <span className="font-black text-rose-400">R$ {servicosResumo.comEntrada.pendente.toFixed(2).replace('.', ',')}</span>
                     </div>
                  </div>
                  <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 space-y-1.5">
                     <p className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Em Aberto</p>
                     <p className="text-[10px] text-white/50 font-bold">{servicosResumo.emAberto.count} serviço(s)</p>
                     <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                        <span className="text-white/40">Total</span>
                        <span className="font-black text-white">R$ {servicosResumo.emAberto.total.toFixed(2).replace('.', ',')}</span>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
                  <Wrench className="text-primary-400" size={22} />
                  Notas em Aberto & Serviços Agendados
                </h2>
                <p className="text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
                  Vendas do PDV com saldo pendente ou entrega agendada
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={servicosSortBy}
                  onChange={(e) => setServicosSortBy(e.target.value as any)}
                  className="h-8 bg-white/5 border border-white/10 rounded-lg px-2 text-[10px] font-black uppercase text-white/70 focus:outline-none focus:border-primary-500 cursor-pointer"
                >
                  <option value="data" className="bg-slate-900">Data</option>
                  <option value="nome" className="bg-slate-900">Nome do Cliente</option>
                  <option value="valor" className="bg-slate-900">Valor</option>
                  <option value="status" className="bg-slate-900">Status</option>
                  <option value="agendamento" className="bg-slate-900">Ordem de Agendamento</option>
                </select>
                <button
                  onClick={() => setHistorySortOrder(historySortOrder === 'desc' ? 'asc' : 'desc')}
                  title={historySortOrder === 'desc' ? 'Maior/Mais recente primeiro' : 'Menor/Mais antiga primeiro'}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all"
                >
                  {historySortOrder === 'desc' ? <ArrowDownWideNarrow size={13} /> : <ArrowUpWideNarrow size={13} />}
                </button>
                <input ref={vendasFileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportVendasFile} />
                <button
                  disabled={isImportingVendas}
                  title={isImportingVendas ? 'Importando...' : 'Importar Planilha'}
                  onClick={() => vendasFileInputRef.current?.click()}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-primary-400 hover:border-primary-500/20 transition-all disabled:opacity-50"
                >
                  <Upload size={13} className={cn(isImportingVendas && "animate-pulse")} />
                </button>
                <button
                  title="Exportar Planilha"
                  onClick={() => exportVendasXlsx(pendingOrScheduledSales)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-primary-400 hover:border-primary-500/20 transition-all"
                >
                  <Download size={13} />
                </button>
              </div>
            </div>

            {pendingOrScheduledSales.length === 0 ? (
              <div className="py-16 text-center bg-white/5 rounded-3xl border border-dashed border-white/10 space-y-2">
                <Wrench size={36} className="mx-auto text-white/20" />
                <p className="text-sm font-bold text-white/40 uppercase">Nenhuma nota em aberto ou entrega agendada</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {pendingOrScheduledSales.map(sale => {
                  const down = sale.downPayment || 0;
                  const balance = sale.total - down;
                  const isPartial = balance > 0 || sale.status === 'pending';
                  return (
                    <div key={sale.id} className="flex items-center gap-2 sm:gap-3 bg-slate-900/60 hover:bg-slate-900 border border-white/5 rounded-xl px-3 py-2.5 transition-all overflow-x-auto custom-scrollbar">
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0 sm:min-w-0 sm:flex-1">
                        <span className="text-[11px] font-black text-white whitespace-nowrap">{sale.customerName || 'Cliente de Balcão'}</span>
                        {sale.items && sale.items.length > 0 && (
                          <span className="text-[9px] text-white/40 italic whitespace-nowrap" title={sale.items[sale.items.length - 1].name}>
                            {sale.items[sale.items.length - 1].name}{sale.items.length > 1 ? ` (+${sale.items.length - 1})` : ''}
                          </span>
                        )}
                        {sale.observacoes && (
                          <span className="text-[9px] text-amber-300/70 italic whitespace-nowrap" title={sale.observacoes}>
                            "{sale.observacoes}"
                          </span>
                        )}
                        <span className="hidden sm:inline text-[9px] text-white/30 font-mono shrink-0">#{sale.id.slice(-8).toUpperCase()}</span>
                        <span className="hidden sm:inline text-[9px] text-white/30 shrink-0">{safeFormat(sale.createdAt, 'dd/MM HH:mm')}</span>
                        {sale.scheduledFor && <EntregaCountdown scheduledFor={sale.scheduledFor} />}
                      </div>
                      <div className="flex-1 sm:hidden" />
                      {isPartial && (
                        <Badge className="text-[7.5px] font-black uppercase px-1.5 py-0.5 border-none shrink-0 bg-amber-500/20 text-amber-300">FALTA R$ {balance.toFixed(2).replace('.', ',')}</Badge>
                      )}
                      <span className="text-[11px] font-black text-white shrink-0 w-20 text-right">R$ {sale.total.toFixed(2).replace('.', ',')}</span>
                      <div className="flex gap-1 shrink-0">
                        {isPartial && (
                          <button onClick={() => openSettlePayment(sale)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="Quitar Débito"><CheckCircle2 size={13} /></button>
                        )}
                        <button onClick={() => openReceiptDetail(sale)} className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10" title="Recibo"><FileText size={13} /></button>
                        {canManageHistory && (
                          <>
                            <button onClick={() => startEditSale(sale)} className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20" title="Editar"><Pencil size={13} /></button>
                            <button onClick={() => handleDeleteSale(sale)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" title="Excluir"><Trash2 size={13} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orcamentos' && (
          <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-slate-900/40 space-y-6">
            <SectionHeader
              title="Orçamentos"
              subtitle={`${allOrcamentos.length} orçamento(s)`}
              actions={<Button icon={Plus} onClick={openNewOrcamento}>Novo Orçamento</Button>}
            />

            {isLoadingOrcamentos ? (
              <div className="flex justify-center py-16"><RefreshCw className="animate-spin text-primary-500" size={24} /></div>
            ) : allOrcamentos.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-sm">Nenhum orçamento cadastrado ainda.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allOrcamentos.map(o => {
                  const statusStyles: Record<string, string> = {
                    rascunho: 'bg-white/10 text-white/50',
                    enviado: 'bg-blue-500/15 text-blue-400',
                    aprovado: 'bg-emerald-500/15 text-emerald-400',
                    em_producao: 'bg-amber-500/15 text-amber-400',
                    concluido: 'bg-primary-500/15 text-primary-400',
                    recusado: 'bg-rose-500/15 text-rose-400',
                    cancelado: 'bg-rose-500/15 text-rose-400',
                    expirado: 'bg-white/5 text-white/30',
                  };
                  const statusLabels: Record<string, string> = {
                    rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', em_producao: 'Em Produção',
                    concluido: 'Concluído — Venda Gerada', recusado: 'Recusado', cancelado: 'Cancelado', expirado: 'Expirado',
                  };
                  return (
                    <div key={o.id} className={cn(
                      "bg-white/5 border rounded-2xl p-4 space-y-3 transition-all",
                      highlightOrcamentoId === o.id ? "border-primary-500 ring-2 ring-primary-500/40 shadow-lg shadow-primary-500/20" : "border-white/10"
                    )}>
                      <div className="flex items-start justify-between gap-2">
                         <div className="min-w-0">
                            <p className="text-[9px] font-mono text-white/30">{o.numero}</p>
                            <p className="font-black text-white truncate">{o.customerName}</p>
                         </div>
                         <span className={cn("text-[8px] font-black uppercase px-2 py-1 rounded-full shrink-0", statusStyles[o.status])}>{statusLabels[o.status]}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                         <span className="text-[10px] text-white/30 uppercase font-bold">{o.items.length} item(ns)</span>
                         <span className="text-lg font-black text-emerald-400 italic">R$ {o.total.toFixed(2).replace('.', ',')}</span>
                      </div>
                      {o.validade && (
                        <p className="text-[9px] text-white/30">Válido até {safeFormat(o.validade, 'dd/MM/yyyy')}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                         <button onClick={() => openEditOrcamento(o)} className="text-[8px] font-black uppercase px-2 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10">Editar</button>
                         {(o.status === 'rascunho' || o.status === 'enviado') && (
                           <button onClick={() => updateOrcamentoStatus(o, 'aprovado')} className="text-[8px] font-black uppercase px-2 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">Aprovar</button>
                         )}
                         <button onClick={() => openShareOrcamentoWhatsApp(o)} className="text-[8px] font-black uppercase px-2 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">WhatsApp</button>
                         <button onClick={() => setViewingOrcamento(o)} className="text-[8px] font-black uppercase px-2 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10">Exibir</button>
                         {o.status !== 'concluido' && o.status !== 'cancelado' && (
                           <button onClick={() => handleStartSaleFromOrcamento(o)} className="text-[8px] font-black uppercase px-2 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20">Iniciar Venda</button>
                         )}
                         {o.status === 'concluido' && o.vendaId && (
                           <span className="text-[8px] font-black uppercase px-2 py-1.5 rounded-lg bg-white/5 text-white/30">Venda #{o.vendaId.slice(-6).toUpperCase()}</span>
                         )}
                         {o.status !== 'concluido' && (
                           <button onClick={() => updateOrcamentoStatus(o, 'cancelado')} className="text-[8px] font-black uppercase px-2 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 ml-auto">Cancelar</button>
                         )}
                         <button onClick={() => handleDeleteOrcamento(o)} className="text-white/30 hover:text-rose-400 p-1.5"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'clientes' && (
          <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-slate-900/30">
            <ContactsModule
              currentCompany={currentCompany}
              onViewHistoryForClient={(clienteId: string, clienteName: string) => {
                setHistoryClienteIdFilter(clienteId);
                setHistorySearch(clienteName);
                setActiveTab('historico');
              }}
            />
          </div>
        )}

        {activeTab === 'contratos' && (
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <ContractApprovalModule currentCompany={currentCompany} />
          </div>
        )}

        {activeTab === 'excluidos' && (
          <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar bg-slate-900/40 space-y-6">
            <SectionHeader
              title="Excluídos"
              subtitle={`Ficam aqui por 30 dias e depois somem automaticamente — ${deletedSales.length} nota(s)`}
            />

            {isLoadingDeletedSales ? (
              <div className="flex justify-center py-16"><RefreshCw className="animate-spin text-primary-500" size={24} /></div>
            ) : deletedSales.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-sm">Nenhuma nota excluída no momento.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {deletedSales.map(sale => {
                  const deletedDate = sale.deletedAt ? new Date(sale.deletedAt) : new Date();
                  const diasRestantes = Math.max(0, 30 - Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24)));
                  return (
                    <div key={sale.id} className="bg-white/5 border border-rose-500/20 rounded-2xl p-4 space-y-3">
                       <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                             <p className="text-[9px] font-mono text-white/30">#{sale.id.slice(-8).toUpperCase()}</p>
                             <p className="font-black text-white truncate">{sale.customerName || 'Cliente de Balcão'}</p>
                          </div>
                          <span className="text-[8px] font-black uppercase px-2 py-1 rounded-full bg-rose-500/15 text-rose-400 shrink-0">{diasRestantes}d p/ apagar</span>
                       </div>
                       <div className="flex justify-between items-baseline">
                          <span className="text-[10px] text-white/30 uppercase font-bold">{sale.items?.length || 0} item(ns)</span>
                          <span className="text-lg font-black text-white/60 italic">R$ {sale.total.toFixed(2).replace('.', ',')}</span>
                       </div>
                       <p className="text-[9px] text-white/30">Excluída em {safeFormat(sale.deletedAt, 'dd/MM/yyyy HH:mm')}</p>
                       <div className="flex gap-1.5 pt-2 border-t border-white/5">
                          <button onClick={() => handleRestoreSale(sale)} className="flex-1 text-[9px] font-black uppercase px-2 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">Restaurar</button>
                          <button onClick={() => handlePermanentDeleteSale(sale)} className="flex-1 text-[9px] font-black uppercase px-2 py-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20">Excluir Agora</button>
                       </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Customer Modal / Selecionar Cliente */}
      <Modal 
        isOpen={isCustomerModalOpen} 
        onClose={() => { setIsCustomerModalOpen(false); setIsMoreOptionsOpen(false); setEditingCustomerId(null); }} 
        title={customerModalMode === 'create' ? (editingCustomerId ? 'Editar Cliente' : 'Cadastrar Cliente') : 'Selecionar Cliente'}
        size={customerModalMode === 'create' ? 'md' : 'lg'}
      >
        <div className="space-y-5">
           <div className="flex items-center justify-between gap-2">
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 gap-1 flex-1">
                 <button
                   onClick={() => { setCustomerModalMode('search'); setEditingCustomerId(null); }}
                   className={cn(
                     "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                     customerModalMode === 'search' ? "bg-primary-500 text-slate-900 shadow-lg" : "text-white/40 hover:text-white"
                   )}
                 >
                   Pesquisar Cliente
                 </button>
                 <button
                   onClick={() => { setCustomerModalMode('create'); setNewCustomerForm({ ...emptyCustomerForm }); setEditingCustomerId(null); setIsMoreOptionsOpen(false); }}
                   className={cn(
                     "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                     customerModalMode === 'create' ? "bg-primary-500 text-slate-900 shadow-lg" : "text-white/40 hover:text-white"
                   )}
                 >
                   Cadastrar Cliente
                 </button>
              </div>
              <button
                onClick={() => { setSelectedCustomer(null); proceedAfterCustomerStep(); }}
                className="text-[9px] font-black uppercase text-white/30 hover:text-white/60 whitespace-nowrap px-1 transition-all shrink-0"
                title="Continuar sem selecionar cliente"
              >
                Cliente Balcão
              </button>
           </div>

           {customerModalMode === 'search' ? (
             <div className="space-y-3">
                <div className="flex gap-2">
                   <Input
                     icon={Search}
                     placeholder="Buscar por nome, CPF/CNPJ, telefone ou e-mail..."
                     value={customerSearchTerm}
                     onChange={(e: any) => setCustomerSearchTerm(e.target.value)}
                     autoFocus
                     className="flex-1"
                   />
                   <select
                     value={customerSortBy}
                     onChange={(e) => setCustomerSortBy(e.target.value as any)}
                     className="h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-[10px] font-black uppercase text-white/70 focus:outline-none focus:border-primary-500 cursor-pointer shrink-0"
                   >
                     <option value="recentes" className="bg-slate-900">Mais Recentes</option>
                     <option value="az" className="bg-slate-900">A-Z</option>
                     <option value="ultima_compra" className="bg-slate-900">Última Compra</option>
                     <option value="maior_valor" className="bg-slate-900">Maior Valor</option>
                     <option value="frequentes" className="bg-slate-900">Frequentes</option>
                   </select>
                </div>

                <div className="max-h-[26rem] overflow-y-auto custom-scrollbar space-y-2">
                   {isLoadingCustomers && (
                     <div className="flex justify-center py-10"><RefreshCw className="animate-spin text-primary-500" size={22} /></div>
                   )}
                   {!isLoadingCustomers && customerLoadError && (
                     <p className="text-center text-xs text-rose-400 py-6 px-4">{customerLoadError}</p>
                   )}
                   {!isLoadingCustomers && !customerLoadError && filteredSortedCustomers.length === 0 && (
                     <p className="text-center text-xs text-white/30 py-10">Nenhum cliente encontrado ({allCustomers.length} no total). Tente Cadastrar.</p>
                   )}
                   {!isLoadingCustomers && filteredSortedCustomers.map(c => {
                     const stats = c._stats;
                     const isVip = !!c.is_vip;
                     const hasDebt = (c.dividas_em_aberto || 0) > 0;
                     const pendingBalance = stats?.pendingBalance || 0;
                     const hasPending = pendingBalance > 0;
                     const isActive = !!(stats?.lastDate && (Date.now() - new Date(stats.lastDate).getTime()) < 90 * 24 * 60 * 60 * 1000);
                     return (
                       <div key={c.id} className="w-full p-4 rounded-2xl border bg-white/5 border-white/5 hover:bg-white/10 transition-all group relative">
                          <button
                            onClick={() => {
                              setSelectedCustomer({ id: c.id, name: c.full_name, phone: c.phone || '' });
                              if (customerModalIntent === 'orcamento') {
                                const enderecoParts = [c.logradouro, c.numero, c.distrito, c.city].filter(Boolean);
                                setOrcamentoForm(prev => ({
                                  ...prev,
                                  clienteId: c.id,
                                  customerName: c.full_name,
                                  phone: c.phone || '',
                                  cpfCnpj: c.cpf_cnpj || '',
                                  address: enderecoParts.join(', '),
                                }));
                                setIsCustomerModalOpen(false);
                                setOrcamentoModalOpen(true);
                                return;
                              }
                              proceedAfterCustomerStep();
                            }}
                            className="w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-2">
                               <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                     <span className="font-bold text-white truncate">{c.full_name}</span>
                                     {isActive && <span title="Cliente Ativo">🟢</span>}
                                     {hasDebt && <span title="Possui Débitos">🔴</span>}
                                     {isVip && <span title="Cliente VIP">⭐</span>}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px] text-white/40">
                                     {c.phone && <span>{c.phone}</span>}
                                     {c.city && <span>{c.city}</span>}
                                     {c.created_at && <span>Desde {safeFormat(c.created_at, 'dd/MM/yyyy')}</span>}
                                  </div>
                                  {stats && (
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px]">
                                       <span className="text-emerald-400 font-bold">Total: R$ {stats.total.toFixed(2).replace('.', ',')}</span>
                                       {stats.lastDate && <span className="text-white/30">Última compra: {format(new Date(stats.lastDate), 'dd/MM/yyyy')}</span>}
                                    </div>
                                  )}
                                  {hasPending && (
                                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                       <span className="text-[8px] font-black uppercase text-amber-400 tracking-wider">Conta em Aberto:</span>
                                       <span className="text-[11px] font-black text-amber-300">R$ {pendingBalance.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                  )}
                               </div>
                               <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 transition-opacity shrink-0 mt-1" />
                            </div>
                          </button>
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                             <button onClick={(e) => { e.stopPropagation(); startEditCustomer(c); }} className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20" title="Editar"><Pencil size={12} /></button>
                             <button onClick={(e) => { e.stopPropagation(); handleViewCustomerHistory(c); }} className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10" title="Ver Histórico"><FileText size={12} /></button>
                             {c.phone && (
                               <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${c.phone.replace(/\D/g, '')}`, '_blank'); }} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="WhatsApp"><MessageSquare size={12} /></button>
                             )}
                             <button onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(c); }} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 ml-auto" title="Excluir"><Trash2 size={12} /></button>
                          </div>
                       </div>
                     );
                   })}
                </div>
             </div>
           ) : (
             <div className="space-y-4">
                <Input ref={customerNameInputRef} label="Nome *" value={newCustomerForm.full_name} onChange={(e: any) => setNewCustomerForm({ ...newCustomerForm, full_name: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                   <div className="relative">
                      <Input
                        label="CEP"
                        placeholder="93000-000"
                        value={newCustomerForm.cep}
                        onChange={(e: any) => setNewCustomerForm({ ...newCustomerForm, cep: e.target.value })}
                        onBlur={(e: any) => handleCepLookup(e.target.value)}
                      />
                      {isLookingUpCep && <RefreshCw size={14} className="animate-spin text-primary-400 absolute right-3 top-9" />}
                   </div>
                   <Input label="Número" value={newCustomerForm.numero} onChange={(e: any) => setNewCustomerForm({ ...newCustomerForm, numero: e.target.value })} />
                </div>
                <Input label="E-mail" type="email" value={newCustomerForm.email} onChange={(e: any) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })} />
                <Input label="Logradouro" value={newCustomerForm.logradouro} onChange={(e: any) => setNewCustomerForm({ ...newCustomerForm, logradouro: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                   <Input label="WhatsApp (Telefone)" placeholder="(93) 99999-9999" value={newCustomerForm.phone} onChange={(e: any) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })} />
                   <Input label="Bairro" value={newCustomerForm.distrito} onChange={(e: any) => setNewCustomerForm({ ...newCustomerForm, distrito: e.target.value })} />
                </div>

                <AnimatePresence>
                  {isMoreOptionsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden space-y-5"
                    >
                       <div className="h-px bg-white/10" />
                       <div className="space-y-3">
                          <p className="text-[9px] font-black uppercase text-primary-300 tracking-[2px]">Dados Pessoais</p>
                          <div className="grid grid-cols-2 gap-3">
                             <Input label="Data de Nascimento" type="date" value={newCustomerForm.nascimento} onChange={(e: any) => setNewCustomerForm({ ...newCustomerForm, nascimento: e.target.value })} />
                             <Input label="CPF / CNPJ" value={newCustomerForm.cpf_cnpj} onChange={(e: any) => setNewCustomerForm({ ...newCustomerForm, cpf_cnpj: e.target.value })} />
                             <Input label="Cidade" value={newCustomerForm.city} onChange={(e: any) => setNewCustomerForm({ ...newCustomerForm, city: e.target.value })} />
                             <Input label="Estado" value={newCustomerForm.state} onChange={(e: any) => setNewCustomerForm({ ...newCustomerForm, state: e.target.value })} />
                             <Input label="Complemento" className="col-span-2" value={newCustomerForm.complemento} onChange={(e: any) => setNewCustomerForm({ ...newCustomerForm, complemento: e.target.value })} />
                          </div>
                       </div>

                       <div className="space-y-3">
                          <p className="text-[9px] font-black uppercase text-primary-300 tracking-[2px]">Financeiro</p>
                          <Input label="Limite de Crédito (R$)" type="number" step="any" value={newCustomerForm.limite_credito} onChange={(e: any) => setNewCustomerForm({ ...newCustomerForm, limite_credito: e.target.value })} />
                       </div>

                       <div className="space-y-3">
                          <div className="flex items-center justify-between">
                             <p className="text-[9px] font-black uppercase text-primary-300 tracking-[2px]">Patrimônios</p>
                             <button onClick={addPatrimonioRow} className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20" title="Adicionar propriedade"><Plus size={13} /></button>
                          </div>
                          {newCustomerForm.patrimonios.length === 0 && (
                            <p className="text-[10px] text-white/30">Ex: Casa — R$ 350.000, Carro — R$ 85.000</p>
                          )}
                          {newCustomerForm.patrimonios.map((p, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                               <input
                                 placeholder="Propriedade (ex: Casa)"
                                 value={p.propriedade}
                                 onChange={(e) => updatePatrimonioRow(idx, 'propriedade', e.target.value)}
                                 className="flex-1 h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary-500"
                               />
                               <input
                                 placeholder="Valor (R$)"
                                 type="number"
                                 value={p.valor}
                                 onChange={(e) => updatePatrimonioRow(idx, 'valor', e.target.value)}
                                 className="w-32 h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary-500"
                               />
                               <button onClick={() => removePatrimonioRow(idx)} className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"><Trash2 size={13} /></button>
                            </div>
                          ))}
                       </div>

                       <div className="space-y-2">
                          <p className="text-[9px] font-black uppercase text-primary-300 tracking-[2px]">Observações</p>
                          <textarea
                            rows={4}
                            placeholder="Anotações internas sobre o cliente..."
                            value={newCustomerForm.notes}
                            onChange={(e) => setNewCustomerForm({ ...newCustomerForm, notes: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary-500 resize-none"
                          />
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-2">
                   <Button variant="ghost" className="flex-1 h-12" onClick={() => { setCustomerModalMode('search'); setIsMoreOptionsOpen(false); setEditingCustomerId(null); }}>Cancelar</Button>
                   <Button variant="secondary" className="flex-1 h-12" onClick={() => setIsMoreOptionsOpen(prev => !prev)}>
                     {isMoreOptionsOpen ? 'Menos Opções' : 'Mais Opções'}
                   </Button>
                   <Button className="flex-1 h-12" disabled={isCreatingCustomer} onClick={handleCreateCustomerInline}>
                     {isCreatingCustomer ? 'Salvando...' : 'Salvar'}
                   </Button>
                </div>
             </div>
           )}

           {customerModalMode === 'search' && (
             <button
               onClick={() => {
                 setSelectedCustomer(null);
                 proceedAfterCustomerStep();
               }}
               className="w-full text-center py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
             >
               Pular (Cliente de Balcão)
             </button>
           )}
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        title={settlingOrder ? `Quitar Débito — Pedido #${settlingOrder.id.slice(-8).toUpperCase()}` : "Finalizar Venda"}
        size="lg"
        className="max-h-[98vh] my-auto"
        contentClassName="min-h-0"
      >
        <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden gap-1.5 sm:gap-2.5">
           {/* Top Info Bar: Customer & Summary combined */}
           <div className="grid grid-cols-2 gap-1.5 sm:gap-3 shrink-0">
              <div className="p-2 sm:p-2.5 bg-white/5 rounded-xl border border-white/5 flex gap-2 items-center min-w-0">
                 <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary-500/20 text-primary-300 flex items-center justify-center border border-primary-500/30 shrink-0">
                    <UserCheck size={16} />
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-white/30 leading-none mb-0.5">Cliente Atendido</p>
                    <p className="text-[10px] sm:text-xs font-black text-white truncate">{selectedCustomer ? selectedCustomer.name : 'Cliente de Balcão'}</p>
                 </div>
                 <Button 
                   variant="secondary" 
                   size="sm" 
                   className={cn("text-[7.5px] sm:text-[8px] uppercase tracking-widest h-6 sm:h-7 px-2 border-white/10 shrink-0", settlingOrder && "invisible")}
                   disabled={!!settlingOrder}
                   onClick={() => {
                      setIsPaymentModalOpen(false);
                      setIsCustomerModalOpen(true);
                   }}
                 >
                   Alterar
                 </Button>
              </div>

              {!settlingOrder && (
                <div className="space-y-1.5 px-1">
                   <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 gap-0.5">
                      <button onClick={() => { setSaleDiscountMode('percentual'); setSaleDiscountInput(''); }} className={cn("flex-1 py-1 rounded text-[8px] font-black uppercase transition-all", saleDiscountMode === 'percentual' ? "bg-primary-500 text-slate-900" : "text-white/40")}>Desc. %</button>
                      <button onClick={() => { setSaleDiscountMode('valor'); setSaleDiscountInput(''); }} className={cn("flex-1 py-1 rounded text-[8px] font-black uppercase transition-all", saleDiscountMode === 'valor' ? "bg-primary-500 text-slate-900" : "text-white/40")}>Desc. R$</button>
                      <button onClick={() => { setSaleDiscountMode('final'); setSaleDiscountInput(''); }} className={cn("flex-1 py-1 rounded text-[8px] font-black uppercase transition-all", saleDiscountMode === 'final' ? "bg-primary-500 text-slate-900" : "text-white/40")}>Valor Final</button>
                   </div>
                   <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={saleDiscountInput}
                        onChange={(e) => setSaleDiscountInput(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={saleDiscountMode === 'percentual' ? '% de desconto' : saleDiscountMode === 'valor' ? 'R$ de desconto' : 'R$ valor final da venda'}
                        className="flex-1 h-7 bg-white/5 border border-white/10 rounded-lg px-2 text-[10px] text-white focus:outline-none focus:border-primary-500"
                      />
                      <button onClick={applySaleDiscountInput} className="h-7 px-3 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-300 text-[9px] font-black uppercase hover:bg-primary-500/20 shrink-0">Aplicar</button>
                      {saleDiscountValue > 0 && (
                        <button onClick={() => { setSaleDiscountValue(0); setSaleDiscountInput(''); }} className="h-7 px-2 rounded-lg bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase hover:bg-rose-500/20 shrink-0">Limpar</button>
                      )}
                   </div>
                </div>
              )}

              <div className="p-2 sm:p-2.5 bg-slate-900 rounded-xl border border-white/5 flex justify-between items-center px-3 sm:px-4">
                 <div>
                    <p className="text-[7px] sm:text-[8px] font-black text-white/30 uppercase tracking-widest leading-none mb-0.5">Total a Pagar{saleDiscountValue > 0 ? ` (com desconto de R$ ${saleDiscountValue.toFixed(2).replace('.', ',')})` : ''}</p>
                    <p className="text-sm sm:text-lg md:text-xl font-black text-white tracking-tighter italic leading-none">R$ {paymentModalTotal.toFixed(2).replace('.', ',')}</p>
                 </div>
                 <Badge variant="primary" className="bg-emerald-500/10 text-emerald-400 border-none font-black text-[8px] sm:text-[9px] tracking-widest uppercase py-0.5 px-2">Conferido</Badge>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 flex-1 min-h-0 overflow-hidden">

              {/* Left Side: Items & Summary Details */}
              <div className="md:col-span-5 flex flex-col justify-between min-h-0 overflow-hidden gap-1.5 sm:gap-2">
                 <div className="flex-1 flex flex-col gap-1 overflow-hidden min-h-0 bg-white/5 rounded-xl border border-white/5 p-2">
                    <p className="text-[8px] sm:text-[9px] font-black uppercase text-white/40 tracking-widest shrink-0">Resumo da Nota ({paymentModalItems.length})</p>
                    <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5 min-h-[50px]">
                       {paymentModalItems.map((item, idx) => (
                          <div key={idx} className="py-1 px-1.5 flex justify-between items-center hover:bg-white/5 transition-colors">
                             <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[8px] font-black text-white/40 bg-white/10 px-1 py-0.5 rounded text-center min-w-[18px]">{item.quantity}x</span>
                                <div className="flex flex-col min-w-0">
                                   <span className="text-[8.5px] sm:text-[9px] font-bold text-white/80 uppercase truncate max-w-[120px]">{item.name}</span>
                                   {item.dimensions && (
                                      <span className="text-[7px] text-white/40 font-bold tracking-wider uppercase">
                                         {item.dimensions} ({item.area?.toFixed(2).replace('.', ',')} m²)
                                      </span>
                                   )}
                                </div>
                             </div>
                             <span className="text-[8.5px] sm:text-[9px] font-black text-primary-300 italic shrink-0 ml-1">R$ {(item.area ? item.price * item.area * item.quantity : item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="p-2 sm:p-2.5 bg-white/3 rounded-xl border border-white/5 flex justify-between items-center shrink-0">
                    <div>
                       <p className="text-[7.5px] sm:text-[8px] font-black text-white/30 uppercase tracking-widest leading-none">{settlingOrder ? 'Entrada Já Recebida' : 'Pago / Entrada'}</p>
                       <p className="text-xs font-black text-emerald-400 mt-0.5">R$ {(settlingOrder ? alreadyPaidForSettle : (downPayment === '' || typeof downPayment === 'string' ? 0 : Number(downPayment))).toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[7.5px] sm:text-[8px] font-black text-white/30 uppercase tracking-widest leading-none">Saldo Restante</p>
                       <p className={cn("text-xs font-black mt-0.5", paymentModalRemaining > 0 ? "text-rose-400" : "text-white/40")}>R$ {paymentModalRemaining.toFixed(2).replace('.', ',')}</p>
                    </div>
                 </div>
              </div>

              {/* Right Side: Multiple Payments */}
              <div className="md:col-span-7 flex flex-col justify-between min-h-0 overflow-hidden gap-1.5 sm:gap-2">
                 <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
                    <p className="text-[8px] sm:text-[9px] font-black uppercase text-white/30 tracking-widest px-0.5 shrink-0">Pagamentos ({paymentEntries.length})</p>

                    {/* Lista de pagamentos ja adicionados */}
                    {paymentEntries.length > 0 && (
                      <div className="space-y-1 shrink-0 max-h-20 overflow-y-auto custom-scrollbar">
                         {paymentEntries.map((p, idx) => {
                            const opt = PAYMENT_METHOD_OPTIONS.find(o => o.id === p.method);
                            return (
                              <div key={idx} className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white/5 border border-white/5 rounded-lg">
                                 <div className="flex items-center gap-2 min-w-0">
                                    {opt?.icon && <opt.icon size={12} className="text-primary-300 shrink-0" />}
                                    <span className="text-[9px] font-black text-white uppercase truncate">{opt?.label || p.method}{p.installments && p.installments > 1 ? ` ${p.installments}x` : ''}</span>
                                    <span className="text-[8px] text-white/30 shrink-0">{safeFormat(p.date, 'dd/MM HH:mm')}</span>
                                 </div>
                                 <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-black text-emerald-400">
                                      R$ {p.value.toFixed(2).replace('.', ',')}
                                      {p.installments && p.installments > 1 && (
                                        <span className="text-[8px] text-white/30 font-normal ml-1">({p.installments}x R$ {(p.value / p.installments).toFixed(2).replace('.', ',')})</span>
                                      )}
                                    </span>
                                    {p.method === 'pix' && (
                                      <button
                                        onClick={() => { setPixQrAmount(p.value); setIsPixQrModalOpen(true); }}
                                        title="Ver QR Code"
                                        className="text-primary-300 hover:text-primary-200 transition-colors"
                                      >
                                        <QrCode size={13} />
                                      </button>
                                    )}
                                    <button onClick={() => removePaymentEntry(idx)} className="text-white/30 hover:text-rose-400 transition-colors"><X size={12} /></button>
                                 </div>
                              </div>
                            );
                         })}
                      </div>
                    )}

                    {/* Formulario de pagamento — sempre visivel */}
                    {paymentModalRemaining > 0 ? (
                      <div className="flex-1 min-h-0 flex flex-col gap-1.5 bg-white/5 rounded-xl border border-white/5 p-2 overflow-hidden">
                         <div className="grid grid-cols-4 gap-1 shrink-0">
                            {PAYMENT_METHOD_OPTIONS.filter(m => enabledPaymentMethods.includes(m.id)).map(m => (
                              <button
                                key={m.id}
                                onClick={() => setNewPaymentMethod(m.id)}
                                className={cn(
                                  "p-1 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 min-h-[36px]",
                                  newPaymentMethod === m.id ? "bg-primary-500 border-primary-600 text-slate-900" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                                )}
                              >
                                 <m.icon size={12} />
                                 <span className="text-[6.5px] font-black uppercase truncate w-full text-center">{m.label}</span>
                              </button>
                            ))}
                         </div>

                         <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex-1 space-y-0.5">
                               <label className="text-[7px] font-black text-white/40 uppercase tracking-widest block">
                                 {newPaymentMode === 'valor' ? 'Valor (R$)' : 'Porcentagem (%)'}
                               </label>
                               <Input
                                 type="number"
                                 step="any"
                                 placeholder={newPaymentMode === 'valor' ? `Máx. R$ ${paymentModalRemaining.toFixed(2).replace('.', ',')}` : 'Ex: 30'}
                                 className="h-8 text-xs bg-slate-900/50"
                                 value={newPaymentInput}
                                 onChange={(e: any) => setNewPaymentInput(e.target.value === '' ? '' : Number(e.target.value))}
                               />
                            </div>
                            <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 shrink-0 mt-3.5">
                               <button
                                 onClick={() => setNewPaymentMode('valor')}
                                 className={cn("px-2 h-7 rounded-md text-[9px] font-black uppercase transition-all", newPaymentMode === 'valor' ? "bg-primary-500 text-slate-900" : "text-white/40")}
                               >
                                 R$
                               </button>
                               <button
                                 onClick={() => setNewPaymentMode('percentual')}
                                 className={cn("px-2 h-7 rounded-md text-[9px] font-black uppercase transition-all", newPaymentMode === 'percentual' ? "bg-primary-500 text-slate-900" : "text-white/40")}
                               >
                                 %
                               </button>
                            </div>
                            <Button className="h-8 text-[9px] bg-primary-500 text-slate-900 border-none shrink-0 mt-3.5 px-3" onClick={confirmAddPayment}>
                              <Plus size={12} className="mr-1" /> Adicionar
                            </Button>
                         </div>

                         {newPaymentMode === 'percentual' && newPaymentInput !== '' && (
                            <p className="text-[9px] text-primary-300 font-bold shrink-0">= R$ {((total * Number(newPaymentInput)) / 100).toFixed(2).replace('.', ',')}</p>
                         )}

                         {/* Painel contextual pela forma escolhida */}
                         <div className="flex-1 min-h-0 bg-black/20 rounded-lg p-2 flex flex-col items-center justify-center text-center overflow-hidden">
                            {newPaymentMethod === 'pix' && !pixConfig && (
                              <p className="text-[9px] text-white/40">Nenhuma chave PIX cadastrada.</p>
                            )}
                            {newPaymentMethod === 'pix' && pixConfig && (
                              <p className="text-[9px] text-white/40">Clique em Adicionar — o QR Code aparece ao lado do pagamento na lista.</p>
                            )}
                            {newPaymentMethod === 'dinheiro' && (
                              <div className="w-full max-w-xs space-y-1">
                                 <div className="flex items-center justify-between gap-2">
                                    <span className="text-[7.5px] font-black text-white/40 uppercase tracking-widest">Valor Recebido</span>
                                    <input
                                       type="number"
                                       step="any"
                                       className="h-6 w-24 text-[10px] bg-slate-900/80 text-white rounded px-1.5 text-right font-bold border border-white/10"
                                       value={cashReceived === "" ? "" : cashReceived}
                                       placeholder="0,00"
                                       onChange={(e: any) => setCashReceived(e.target.value === "" ? "" : Number(e.target.value))}
                                    />
                                 </div>
                                 {cashReceived !== "" && newPaymentInput !== '' && (
                                    <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex justify-between items-center">
                                       <span className="text-[7.5px] font-black text-emerald-400 uppercase tracking-wider">Troco</span>
                                       <span className="text-xs font-black text-white">R$ {Math.max(0, Number(cashReceived) - (newPaymentMode === 'percentual' ? (total * Number(newPaymentInput)) / 100 : Number(newPaymentInput))).toFixed(2).replace('.', ',')}</span>
                                    </div>
                                 )}
                              </div>
                            )}
                            {newPaymentMethod === 'cartao_debito' && debitCardFeePercent > 0 && (() => {
                               const rawInput = newPaymentInput === '' ? 0 : Number(newPaymentInput);
                               const baseValue = newPaymentMode === 'percentual' ? (total * rawInput) / 100 : rawInput;
                               const finalValue = baseValue * (1 + debitCardFeePercent / 100);
                               return baseValue > 0 ? (
                                 <div className="w-full max-w-xs p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex justify-between items-center">
                                    <span className="text-[7.5px] font-black text-amber-400 uppercase tracking-wider">Total Com Taxa ({debitCardFeePercent}%)</span>
                                    <span className="text-xs font-black text-white">R$ {finalValue.toFixed(2).replace('.', ',')}</span>
                                 </div>
                               ) : null;
                            })()}
                            {newPaymentMethod === 'cartao_credito' && (() => {
                               const rawInput = newPaymentInput === '' ? 0 : Number(newPaymentInput);
                               const baseValue = newPaymentMode === 'percentual' ? (total * rawInput) / 100 : rawInput;
                               const fee = creditCardFees.find(f => f.installments === newPaymentInstallments)?.feePercent || 0;
                               const finalValue = baseValue * (1 + fee / 100);
                               return (
                                 <div className="w-full max-w-xs space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                       <span className="text-[7.5px] font-black text-white/40 uppercase tracking-widest">Parcelas</span>
                                       <select
                                         value={newPaymentInstallments}
                                         onChange={(e) => setNewPaymentInstallments(Number(e.target.value))}
                                         className="h-7 bg-slate-900/80 border border-white/10 rounded px-2 text-[10px] text-white font-bold focus:outline-none focus:border-primary-500 cursor-pointer"
                                       >
                                         {creditCardFees.map(f => (
                                           <option key={f.installments} value={f.installments} className="bg-slate-900">
                                             {f.installments}x {f.feePercent > 0 ? `(+${f.feePercent}%)` : '(sem taxa)'}
                                           </option>
                                         ))}
                                       </select>
                                    </div>
                                    {baseValue > 0 && (
                                      <div className="p-1.5 bg-primary-500/10 border border-primary-500/20 rounded-lg flex justify-between items-center">
                                         <span className="text-[7.5px] font-black text-primary-300 uppercase tracking-wider">Valor da Parcela</span>
                                         <span className="text-xs font-black text-white">{newPaymentInstallments}x R$ {(finalValue / newPaymentInstallments).toFixed(2).replace('.', ',')}</span>
                                      </div>
                                    )}
                                    {fee > 0 && baseValue > 0 && (
                                      <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex justify-between items-center">
                                         <span className="text-[7.5px] font-black text-amber-400 uppercase tracking-wider">Total Com Taxa ({fee}%)</span>
                                         <span className="text-xs font-black text-white">R$ {finalValue.toFixed(2).replace('.', ',')}</span>
                                      </div>
                                    )}
                                 </div>
                               );
                            })()}
                            {newPaymentMethod === 'cartao_debito' && (
                              <div className="flex flex-col items-center gap-1">
                                 <Smartphone size={16} className="text-blue-400" />
                                 <p className="text-[8px] text-white/50">Insira/aproxime o cartão</p>
                              </div>
                            )}
                            {(newPaymentMethod === 'transferencia' || newPaymentMethod === 'boleto' || newPaymentMethod === 'crediario') && (
                              <p className="text-[9px] text-white/40 uppercase">{PAYMENT_METHOD_OPTIONS.find(o => o.id === newPaymentMethod)?.label}</p>
                            )}
                         </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-h-0 flex items-center justify-center text-center p-4">
                         <p className="text-[9px] text-emerald-400/70 uppercase tracking-wider">Saldo Restante: R$ 0,00 — Quitado ✓</p>
                      </div>
                    )}
                 </div>

                 <button
                   type="button"
                   onClick={() => setIsScheduleModalOpen(true)}
                   className={cn(
                     "w-full h-8 sm:h-9 rounded-lg border flex items-center justify-center gap-1.5 text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shrink-0",
                     scheduledFor ? "bg-primary-500/10 border-primary-500/30 text-primary-300" : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20"
                   )}
                 >
                   <CalendarClock size={12} />
                   {scheduledFor ? safeFormat(scheduledFor, 'dd/MM HH:mm') : 'Agendar Entrega'}
                 </button>

                 <input
                   value={orderObservacoes}
                   onChange={(e) => setOrderObservacoes(e.target.value)}
                   placeholder="Observação (opcional, aparece na lista de Serviços)"
                   className="w-full h-8 sm:h-9 rounded-lg border border-white/10 bg-white/5 px-2.5 text-[9px] sm:text-[10px] text-white placeholder-white/30 focus:outline-none focus:border-primary-500 shrink-0"
                 />
              </div>
           </div>

           {/* Bottom Action Bar (ALWAYS VISIBLE - NO SCROLL) */}
           <div className="flex gap-2 pt-1 border-t border-white/5 shrink-0">
              {!settlingOrder && (
                <Button
                  variant="secondary"
                  className="flex-1 h-9 sm:h-11 text-[8px] sm:text-[9px] uppercase font-black tracking-wider border-white/10"
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    handleCreateOrcamentoFromCart();
                  }}
                >
                  Orçamento
                </Button>
              )}
              {paymentModalRemaining > 0 ? (
                <Button 
                  className="flex-[2] h-9 sm:h-11 bg-amber-500 hover:bg-amber-400 text-slate-900 border-none shadow-lg shadow-amber-500/20 text-[9px] sm:text-[10px] font-black uppercase tracking-wider gap-2 cursor-pointer"
                  onClick={() => handleFinalize(true)}
                >
                   <Clock size={16} />
                   <span>{settlingOrder ? `REGISTRAR PAGAMENTO (R$ ${paymentEntriesTotal.toFixed(2).replace('.', ',')})` : `LANÇAR ENTRADA (R$ ${(downPayment === '' ? 0 : Number(downPayment)).toFixed(2).replace('.', ',')})`}</span>
                </Button>
              ) : (
                <Button 
                  className="flex-[2] h-9 sm:h-11 bg-primary-500 hover:bg-primary-400 text-slate-900 border-none shadow-lg shadow-primary-500/20 text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider gap-1.5 cursor-pointer"
                  onClick={() => handleFinalize(false)}
                >
                   <CheckCircle2 size={16} />
                   <span>{settlingOrder ? 'QUITAR DÉBITO (TOTAL PAGO)' : 'FINALIZAR VENDA (TOTAL QUITADO)'}</span>
                </Button>
              )}
           </div>
        </div>
      </Modal>

     {/* Success Modal */}
     <Modal 
       isOpen={isSuccessModalOpen} 
       onClose={() => {
         setIsSuccessModalOpen(false);
         setSelectedCustomer(null);
       }} 
       title={lastFinalizedOrder?.status === 'pending' ? 'Entrada Salva / Nota Aberta 📝' : 'Venda Finalizada 🎉'}
       size="lg"
     >
       <div className="space-y-3 py-1 flex flex-col min-h-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-4 p-3 sm:p-4 bg-white/5 rounded-3xl border border-white/10 shrink-0">
             <div className="w-11 h-11 sm:w-12 sm:h-12 bg-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/20 shrink-0">
                <Check size={22} />
             </div>
             <div>
                <h3 className="text-lg sm:text-xl font-black text-white italic tracking-tighter uppercase">R$ {lastFinalizedOrder?.total.toFixed(2)}</h3>
                <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mt-0.5">
                   {lastFinalizedOrder?.status === 'pending' ? 'OS registrada nas Notas Abertas' : 'Venda concluída e integrada'}
                </p>
             </div>
          </div>

          <div className="bg-slate-900/50 rounded-3xl p-3 sm:p-4 border border-white/5 text-left space-y-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
             <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="text-[9px] font-black uppercase text-primary-300 tracking-[2px]">Resumo da Nota</h4>
                <Badge variant="outline" className="font-mono text-[9px]">#{lastFinalizedOrder?.id?.slice(-8).toUpperCase()}</Badge>
             </div>
             
             <div className="space-y-1.5">
                {lastFinalizedOrder?.items.map((item, idx) => (
                   <div key={idx} className="flex justify-between text-[11px] font-bold text-white/70">
                      <span>{item.quantity}x {item.name}</span>
                      <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                   </div>
                ))}
             </div>

             <div className="pt-2 border-t border-white/5 space-y-1">
                <div className="flex justify-between text-[11px] text-white/40">
                   <span>Valor Total</span>
                   <span className="font-mono">R$ {lastFinalizedOrder?.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-400 font-black italic">
                   <span>Entrada Recebida</span>
                   <span className="font-mono">R$ {(lastFinalizedOrder?.downPayment ?? lastFinalizedOrder?.receivedValue ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-rose-400 font-black italic">
                   <span>Valor que Falta Pagar</span>
                   <span className="font-mono font-bold">R$ {Math.max(0, (lastFinalizedOrder?.total || 0) - (lastFinalizedOrder?.downPayment ?? lastFinalizedOrder?.receivedValue ?? 0)).toFixed(2)}</span>
                </div>
                {lastFinalizedOrder?.scheduledFor && (
                   <div className="flex justify-between text-[10px] text-primary-300 font-black bg-primary-500/10 p-2 rounded-lg border border-primary-500/20 mt-1.5">
                      <span>Entrega Agendada:</span>
                      <span className="font-mono">{safeFormat(lastFinalizedOrder?.scheduledFor, 'dd/MM/yyyy HH:mm')}</span>
                   </div>
                )}
             </div>

             {selectedCustomer && (
               <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] shrink-0"><Users size={12} /></div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-white/60">{selectedCustomer.name}</p>
                    <p className="text-[8px] text-white/30">{selectedCustomer.phone || 'Sem telefone'}</p>
                  </div>
               </div>
             )}
          </div>

          <div className="grid grid-cols-5 gap-1.5 sm:gap-3 shrink-0">
             <Button 
               variant="secondary" 
               icon={Share2} 
               className="flex-col h-16 sm:h-20 gap-1 py-2 px-1 text-[7.5px] sm:text-[9px] uppercase font-black tracking-wide border-white/5 bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all"
               onClick={() => {
                  if (!lastFinalizedOrder) return;
                  if (selectedCustomer?.phone) {
                    handleShareViaWhatsApp(lastFinalizedOrder, selectedCustomer.name, selectedCustomer.phone);
                  } else {
                    setWaFormName(lastFinalizedOrder.customerName || '');
                    setWaFormPhone('');
                    setIsWhatsAppFormOpen(true);
                  }
               }}
             >
                Compartilhar
                <span className="text-[8px] opacity-60 lowercase font-medium text-emerald-400">Via WhatsApp</span>
             </Button>

             <Button 
               variant="secondary" 
               icon={Printer} 
               className="flex-col h-16 sm:h-20 gap-1 py-2 px-1 text-[7.5px] sm:text-[9px] uppercase font-black tracking-wide border-white/5 bg-white/5 hover:bg-primary-500/20 hover:text-primary-300 transition-all"
               onClick={() => {
                 if (!lastFinalizedOrder) return;
                 const order = lastFinalizedOrder;
                 const total = order.total;
                 const down = order.downPayment ?? order.receivedValue ?? (order.status === 'completed' ? total : 0);
                 const balance = Math.max(0, total - down);
                 const printWin = window.open('', '_blank', 'width=450,height=650');
                 if (!printWin) {
                   window.print();
                   return;
                 }
                 const itemsList = order.items.map(i => `
                   <tr>
                     <td style="padding:4px 0;">${i.quantity}x ${i.name}</td>
                     <td style="text-align:right; padding:4px 0;">R$ ${((i.area ? i.price * i.area : i.price) * i.quantity).toFixed(2).replace('.', ',')}</td>
                   </tr>
                 `).join('');

                 printWin.document.write(`
                   <!DOCTYPE html>
                   <html>
                   <head>
                     <title>Comprovante #${order.id.slice(-8).toUpperCase()}</title>
                     <style>
                       body { font-family: monospace; font-size: 12px; margin: 15px; color: #000; }
                       .header { text-align: center; font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
                       table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                       .totals { border-top: 1px dashed #000; margin-top: 10px; padding-top: 8px; }
                       .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
                       .bold { font-weight: bold; }
                       .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 8px; }
                     </style>
                   </head>
                   <body>
                     <div class="header">
                       <div style="font-size:14px;">${currentCompany?.name || 'Rafa Arts Graphics'}</div>
                       <div>COMPROVANTE DE PEDIDO / OS</div>
                       <div>Ped #${order.id.slice(-8).toUpperCase()} - ${safeFormat(order.createdAt, 'dd/MM/yyyy HH:mm')}</div>
                     </div>
                     <div>
                       <strong>Cliente:</strong> ${order.customerName || 'Cliente de Balcão'}<br/>
                       ${selectedCustomer?.phone ? `<strong>Telefone:</strong> ${selectedCustomer.phone}<br/>` : ''}
                       ${order.scheduledFor ? `<strong>Previsão Entrega:</strong> ${safeFormat(order.scheduledFor, 'dd/MM/yyyy HH:mm')}<br/>` : ''}
                     </div>
                     <table>
                       <thead>
                         <tr style="border-bottom:1px solid #000; text-align:left;">
                           <th>Item</th>
                           <th style="text-align:right;">Subtotal</th>
                         </tr>
                       </thead>
                       <tbody>${itemsList}</tbody>
                     </table>
                     <div class="totals">
                       <div class="row"><span>TOTAL:</span> <span class="bold">R$ ${total.toFixed(2).replace('.', ',')}</span></div>
                       <div class="row"><span>ENTRADA RECEBIDA:</span> <span class="bold">R$ ${down.toFixed(2).replace('.', ',')}</span></div>
                       ${balance > 0 ? `<div class="row" style="color:#c00;"><span>FALTA PAGAR:</span> <span class="bold">R$ ${balance.toFixed(2).replace('.', ',')}</span></div>` : '<div class="row"><span>SITUAÇÃO:</span> <span class="bold">QUITADO</span></div>'}
                     </div>
                     <div class="footer">
                       Obrigado pela preferência!<br/><br/>
                       Assinatura: _____________________________
                     </div>
                     <script>
                       window.onload = function() { window.print(); window.close(); };
                     </script>
                   </body>
                   </html>
                 `);
                 printWin.document.close();
               }}
             >
                Imprimir
                <span className="text-[8px] opacity-60 lowercase font-medium text-primary-400">Via Balcão / Thermal</span>
             </Button>

             <Button 
               variant="secondary" 
               icon={Download} 
               className="flex-col h-16 sm:h-20 gap-1 py-2 px-1 text-[7.5px] sm:text-[9px] uppercase font-black tracking-wide border-white/5 bg-white/5 hover:bg-blue-500/20 hover:text-blue-300 transition-all"
               onClick={async () => {
                 if (!lastFinalizedOrder) return;
                 const canvas = await renderReceiptCanvas({
                   order: lastFinalizedOrder,
                   companyName: currentCompany?.name || 'Rafa Arts Graphics',
                   customerPhone: selectedCustomer?.phone,
                   logoDarkUrl,
                 });
                 downloadCanvasAsPng(canvas, buildFileName('Comprovante', lastFinalizedOrder.customerName, lastFinalizedOrder.createdAt, 'png'));
               }}
             >
                Imagem
                <span className="text-[8px] opacity-60 lowercase font-medium text-blue-400">Baixar como PNG</span>
             </Button>

             <Button 
               variant="secondary" 
               icon={FileText} 
               className="flex-col h-16 sm:h-20 gap-1 py-2 px-1 text-[7.5px] sm:text-[9px] uppercase font-black tracking-wide border-white/5 bg-white/5 hover:bg-violet-500/20 hover:text-violet-300 transition-all"
               onClick={async () => {
                 if (!lastFinalizedOrder) return;
                 const canvas = await renderReceiptCanvas({
                   order: lastFinalizedOrder,
                   companyName: currentCompany?.name || 'Rafa Arts Graphics',
                   customerPhone: selectedCustomer?.phone,
                   logoDarkUrl,
                 });
                 await downloadCanvasAsPdf(canvas, buildFileName('Comprovante', lastFinalizedOrder.customerName, lastFinalizedOrder.createdAt, 'pdf'));
               }}
             >
                PDF
                <span className="text-[8px] opacity-60 lowercase font-medium text-violet-400">Baixar como PDF</span>
             </Button>

             <Button 
               className="flex-col h-16 sm:h-20 gap-1 py-2 px-1 text-[7.5px] sm:text-[9px] uppercase font-black tracking-wide bg-primary-500 hover:bg-primary-400 text-slate-900 border-none shadow-lg shadow-primary-500/20 transition-all"
               onClick={() => {
                 setIsSuccessModalOpen(false);
                 setIsCustomerModalOpen(false);
                 setSelectedCustomer(null);
                 setCart([]);
                 setOrderObservacoes('');
                 setDownPayment(0);
                 setScheduledFor('');
                 resetPaymentEntries();
                 setActiveTab('venda');
               }}
             >
                Nova Venda
                <span className="text-[8px] opacity-60 lowercase font-medium">Limpar & Concluir</span>
             </Button>
          </div>

          {!selectedCustomer?.phone && (
             <p className="text-[10px] text-rose-400/60 font-black uppercase tracking-widest italic animate-pulse text-center">
               Cadastre o cliente para compartilhar no WhatsApp.
             </p>
          )}
       </div>
     </Modal>

     {/* Modal Quitar Saldo Devedor */}
     {settleModalOrder && (
       <Modal
         isOpen={!!settleModalOrder}
         onClose={() => setSettleModalOrder(null)}
         title="Quitar Saldo Devedor do Serviço / Venda"
         size="md"
       >
         <div className="space-y-6 p-4">
           <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
             <div className="flex justify-between items-center">
               <span className="text-xs font-bold text-white/50">Cliente:</span>
               <span className="text-sm font-black text-white">{settleModalOrder.customerName || 'Cliente de Balcão'}</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-xs font-bold text-white/50">Total do Pedido:</span>
               <span className="text-sm font-bold text-white">R$ {settleModalOrder.total.toFixed(2).replace('.', ',')}</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-xs font-bold text-emerald-400">Entrada Já Paga:</span>
               <span className="text-sm font-bold text-emerald-400">R$ {(settleModalOrder.downPayment || 0).toFixed(2).replace('.', ',')}</span>
             </div>
             <div className="flex justify-between items-center border-t border-white/10 pt-2">
               <span className="text-xs font-black text-rose-400 uppercase">Saldo A Quitar Agora:</span>
               <span className="text-xl font-black text-rose-400">R$ {(settleModalOrder.total - (settleModalOrder.downPayment || 0)).toFixed(2).replace('.', ',')}</span>
             </div>
           </div>

           <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-white/60 tracking-wider block">Forma de Recebimento do Saldo</label>
             <div className="grid grid-cols-2 gap-2">
               {[
                 { id: 'pix', label: 'PIX QR' },
                 { id: 'dinheiro', label: 'Dinheiro' },
                 { id: 'cartao_credito', label: 'Cartão Crédito' },
                 { id: 'cartao_debito', label: 'Cartão Débito' }
               ].map(m => (
                 <button
                   key={m.id}
                   type="button"
                   onClick={() => setSettleMethod(m.id as any)}
                   className={cn(
                     "py-3 px-3 rounded-xl border text-xs font-bold transition-all text-center",
                     settleMethod === m.id
                       ? "bg-primary-500 border-primary-400 text-slate-900 font-black shadow-lg shadow-primary-500/20"
                       : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                   )}
                 >
                   {m.label}
                 </button>
               ))}
             </div>
           </div>

           <div className="flex justify-end gap-3 pt-2">
             <Button variant="ghost" onClick={() => setSettleModalOrder(null)}>Cancelar</Button>
             <Button 
               className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black gap-2"
               onClick={() => handleSettleBalance(settleModalOrder)}
             >
               <CheckCircle2 size={16} />
               <span>Confirmar Recebimento do Saldo</span>
             </Button>
           </div>
         </div>
       </Modal>
     )}

     {editingSale && (
       <Modal
         isOpen={!!editingSale}
         onClose={() => setEditingSale(null)}
         title="Editar Venda"
         size="md"
       >
         <div className="space-y-4 p-4">
           <Input label="Nome do Cliente" value={editSaleForm.customerName} onChange={(e: any) => setEditSaleForm({ ...editSaleForm, customerName: e.target.value })} />
           <div className="grid grid-cols-2 gap-4">
             <Input label="Valor Total (R$)" type="number" step="any" value={editSaleForm.total} onChange={(e: any) => setEditSaleForm({ ...editSaleForm, total: Number(e.target.value) })} />
             <Input label="Valor Pago / Entrada (R$)" type="number" step="any" value={editSaleForm.downPayment} onChange={(e: any) => setEditSaleForm({ ...editSaleForm, downPayment: Number(e.target.value) })} />
           </div>
           <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-white/60 tracking-wider block">Forma de Pagamento</label>
             <div className="grid grid-cols-2 gap-2">
               {[
                 { id: 'pix', label: 'PIX' },
                 { id: 'dinheiro', label: 'Dinheiro' },
                 { id: 'cartao_credito', label: 'Cartão Crédito' },
                 { id: 'cartao_debito', label: 'Cartão Débito' }
               ].map(m => (
                 <button
                   key={m.id}
                   type="button"
                   onClick={() => setEditSaleForm({ ...editSaleForm, paymentMethod: m.id })}
                   className={cn(
                     "py-3 px-3 rounded-xl border text-xs font-bold transition-all text-center",
                     editSaleForm.paymentMethod === m.id
                       ? "bg-primary-500 border-primary-400 text-slate-900 font-black shadow-lg shadow-primary-500/20"
                       : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                   )}
                 >
                   {m.label}
                 </button>
               ))}
             </div>
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/60 tracking-wider block">Observações</label>
              <textarea
                rows={2}
                value={editSaleForm.observacoes}
                onChange={(e) => setEditSaleForm({ ...editSaleForm, observacoes: e.target.value })}
                placeholder="Ex: cliente pediu pra deixar na portaria, cor específica, etc."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white resize-none focus:outline-none focus:border-primary-500"
              />
           </div>
           <div className="flex justify-end gap-3 pt-2">
             <Button variant="ghost" onClick={() => setEditingSale(null)}>Cancelar</Button>
             <Button className="bg-primary-500 hover:bg-primary-400 text-slate-900 font-black gap-2" onClick={handleSaveEditSale}>
               <CheckCircle2 size={16} />
               <span>Salvar Alterações</span>
             </Button>
           </div>
         </div>
       </Modal>
     )}

     {isWhatsAppFormOpen && (
       <Modal
         isOpen={isWhatsAppFormOpen}
         onClose={() => setIsWhatsAppFormOpen(false)}
         title="Cadastrar Cliente para Compartilhar"
         size="md"
       >
         <div className="space-y-4 p-4">
           <p className="text-xs text-white/50">Essa venda ainda não tem um cliente com WhatsApp vinculado. Cadastre para compartilhar o comprovante e já deixar a conversa pronta no Funil de Atendimento.</p>
           <Input label="Nome do Cliente" value={waFormName} onChange={(e: any) => setWaFormName(e.target.value)} />
           <div>
             <label className="text-[10px] font-black uppercase text-white/60 tracking-wider block mb-1.5">WhatsApp *</label>
             <div className="flex gap-2">
               <div className="relative">
                 <select
                   value={waFormCountry.code}
                   onChange={(e) => setWaFormCountry(WA_COUNTRIES.find(c => c.code === e.target.value) || WA_COUNTRIES[0])}
                   className="h-11 bg-white/5 border border-white/10 rounded-xl pl-3 pr-7 text-sm text-white appearance-none focus:outline-none focus:border-primary-500 cursor-pointer"
                 >
                   {WA_COUNTRIES.map(c => (
                     <option key={c.code} value={c.code} className="bg-slate-900">{c.flag} {c.code}</option>
                   ))}
                 </select>
               </div>
               <input
                 value={waFormPhone}
                 onChange={(e) => setWaFormPhone(e.target.value)}
                 placeholder="93 99233-2012"
                 className="flex-1 h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary-500"
               />
             </div>
             <p className="text-[9px] text-white/30 mt-1">Formato final: {waFormCountry.flag} {waFormCountry.code} {waFormPhone || '93 99233-2012'}</p>
           </div>
           <div className="flex justify-end gap-3 pt-2">
             <Button variant="ghost" onClick={() => setIsWhatsAppFormOpen(false)}>Cancelar</Button>
             <Button
               className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black gap-2"
               disabled={isWaSaving}
               onClick={handleSaveWhatsAppCustomer}
             >
               <CheckCircle2 size={16} />
               <span>{isWaSaving ? 'Salvando...' : 'Salvar e Abrir Conversa'}</span>
             </Button>
           </div>
         </div>
       </Modal>
     )}

     {discountItemIndex !== null && cart[discountItemIndex] && (
       <Modal isOpen={discountItemIndex !== null} onClose={() => setDiscountItemIndex(null)} title="Desconto / Preço do Item" size="sm">
         <div className="space-y-4 p-2">
            <p className="text-xs text-white/50">Item: <span className="text-white font-bold">{cart[discountItemIndex].name}</span></p>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1">
               <button onClick={() => setDiscountMode('percentual')} className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all", discountMode === 'percentual' ? "bg-primary-500 text-slate-900" : "text-white/40")}>Desc. %</button>
               <button onClick={() => setDiscountMode('valor')} className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all", discountMode === 'valor' ? "bg-primary-500 text-slate-900" : "text-white/40")}>Desc. R$</button>
               <button onClick={() => setDiscountMode('preco')} className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all", discountMode === 'preco' ? "bg-primary-500 text-slate-900" : "text-white/40")}>Editar Preço</button>
            </div>
            <Input
              label={discountMode === 'percentual' ? 'Desconto (%)' : discountMode === 'valor' ? 'Desconto (R$)' : 'Novo Preço (R$)'}
              type="number"
              step="any"
              autoFocus
              value={discountInput}
              onChange={(e: any) => setDiscountInput(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <p className="text-[10px] text-white/30">
              {discountMode === 'preco' ? 'Define o preço só nesse item, nessa venda — o preço cadastrado do produto no Estoque não muda.' : 'O desconto afeta só esse item nessa venda — o preço cadastrado do produto não muda.'}
            </p>
            <div className="flex justify-end gap-3 pt-1">
               <Button variant="ghost" onClick={() => setDiscountItemIndex(null)}>Cancelar</Button>
               <Button className="bg-primary-500 text-slate-900 border-none" onClick={applyItemDiscount}>{discountMode === 'preco' ? 'Salvar Preço' : 'Aplicar Desconto'}</Button>
            </div>
         </div>
       </Modal>
     )}

     {insulfilmModalProduct && (() => {
       const calc = otimizarCortesInsulfilm(insulfilmPecas, insulfilmLarguraMaterial);
       const IMPRESSAO_MINIMA = 30;
       const valorCalculado = calc ? calc.areaRetirada * insulfilmModalProduct.price : 0;
       const valorFinal = Math.max(valorCalculado, IMPRESSAO_MINIMA);
       const addPeca = () => setInsulfilmPecas(prev => [...prev, { id: 'p' + Date.now(), largura: 0, altura: 0 }]);
       const removePeca = (id: string) => setInsulfilmPecas(prev => prev.filter(p => p.id !== id));
       const updatePeca = (id: string, field: 'largura' | 'altura', value: number) => setInsulfilmPecas(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
       return (
         <Modal isOpen={!!insulfilmModalProduct} onClose={() => setInsulfilmModalProduct(null)} title="Metragem — Película Insulfilm" size="md">
           <div className="space-y-4 p-2 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <Input
                label="Largura do Rolo (m)"
                type="number"
                step="any"
                value={insulfilmLarguraMaterial}
                onChange={(e: any) => setInsulfilmLarguraMaterial(Number(e.target.value) || 0)}
              />
              <p className="text-[9px] text-white/30 -mt-2">Vem pré-preenchida com a largura cadastrada — pode editar aqui, e o novo valor fica salvo pra próxima vez.</p>

              <div className="space-y-2">
                 <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-white/60 tracking-wider">Peças (vidros) desta nota</label>
                    <button onClick={addPeca} className="text-[9px] font-black uppercase text-primary-400 hover:text-primary-300 flex items-center gap-1">
                       <Plus size={12} /> Adicionar Peça
                    </button>
                 </div>
                 {insulfilmPecas.map((p, i) => (
                   <div key={p.id} className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-white/30 w-10 shrink-0">Peça {i + 1}</span>
                      <input type="number" step="any" placeholder="Largura (m)" value={p.largura || ''} onChange={(e) => updatePeca(p.id, 'largura', Number(e.target.value) || 0)} className="flex-1 h-9 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-primary-500" />
                      <span className="text-white/20 text-xs">×</span>
                      <input type="number" step="any" placeholder="Altura (m)" value={p.altura || ''} onChange={(e) => updatePeca(p.id, 'altura', Number(e.target.value) || 0)} className="flex-1 h-9 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-primary-500" />
                      {insulfilmPecas.length > 1 && (
                        <button onClick={() => removePeca(p.id)} className="text-rose-400 hover:text-rose-300 shrink-0"><Trash2 size={14} /></button>
                      )}
                   </div>
                 ))}
              </div>

              {calc ? (
                <div className="space-y-2">
                   <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 space-y-1">
                      <p className="text-[9px] font-black uppercase text-amber-300">Consumo do Rolo</p>
                      <div className="flex justify-between text-xs text-white/70"><span>Largura do rolo</span><span className="font-mono font-bold text-white">{insulfilmLarguraMaterial.toFixed(2).replace('.', ',')} m</span></div>
                      <div className="flex justify-between text-xs text-white/70"><span>Consumo linear</span><span className="font-mono font-bold text-white">{calc.metrosLineares.toFixed(2).replace('.', ',')} m</span></div>
                      <div className="flex justify-between text-xs text-white/70"><span>Área retirada do rolo</span><span className="font-mono font-bold text-white">{calc.areaRetirada.toFixed(2).replace('.', ',')} m²</span></div>
                   </div>

                   <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 space-y-1">
                      <p className="text-[9px] font-black uppercase text-emerald-300">Aproveitamento — {calc.cortes.length} corte{calc.cortes.length > 1 ? 's' : ''}</p>
                      {calc.cortes.map((c, i) => (
                        <div key={i} className="flex justify-between text-xs text-white/70">
                           <span>Corte {i + 1}: {c.pecas.map(p => p.largura.toFixed(2).replace('.', ',')).join(' + ')} m</span>
                           <span className="font-mono font-bold text-white">{c.comprimento.toFixed(2).replace('.', ',')} m</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs pt-1 border-t border-white/5"><span className="text-white/70">Aproveitamento</span><span className="font-mono font-bold text-emerald-400">{calc.aproveitamento.toFixed(2).replace('.', ',')}%</span></div>
                   </div>

                   <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 space-y-1">
                      <p className="text-[9px] font-black uppercase text-rose-300">Desperdício</p>
                      <div className="flex justify-between text-xs text-white/70"><span>Área desperdiçada</span><span className="font-mono font-bold text-white">{calc.desperdicio.toFixed(2).replace('.', ',')} m²</span></div>
                   </div>

                   {calc.desperdicio <= 0.001 ? (
                     <p className="text-[10px] text-emerald-400 font-bold text-center">✓ SEM DESPERDÍCIO — as peças foram aproveitadas no mesmo corte do rolo.</p>
                   ) : (
                     <p className="text-[10px] text-amber-400 font-bold text-center">⚠ Desperdício — sobra de material após o melhor aproveitamento possível.</p>
                   )}
                   {calc.cortes.length > 1 && (
                     <p className="text-[10px] text-white/40 text-center">{calc.cortes.length} cortes necessários — nem todas as peças cabem juntas na largura do rolo.</p>
                   )}

                   <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-4 space-y-1.5">
                      {valorFinal > valorCalculado && (
                        <div className="flex justify-between text-[10px] text-amber-400 pb-1 border-b border-white/5">
                           <span>Impressão mínima aplicada</span>
                           <span className="font-mono font-bold">R$ 30,00</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                         <span className="text-emerald-400 font-bold">Subtotal (sobre área retirada do rolo)</span>
                         <span className="font-mono font-black text-emerald-400">R$ {valorFinal.toFixed(2).replace('.', ',')}</span>
                      </div>
                   </div>
                </div>
              ) : (
                <p className="text-center text-xs text-white/30 py-4">Informe largura e altura de pelo menos uma peça pra calcular.</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                 <Button variant="ghost" onClick={() => setInsulfilmModalProduct(null)}>Cancelar</Button>
                 <Button disabled={!calc} className="bg-primary-500 text-slate-900 border-none" onClick={confirmAddInsulfilmItem}>Adicionar ao Carrinho</Button>
              </div>
           </div>
         </Modal>
       );
     })()}

     {etiquetaModalProduct && (() => {
       const calc = calcularEtiquetas(etiquetaModalProduct);
       return (
         <Modal isOpen={!!etiquetaModalProduct} onClose={() => setEtiquetaModalProduct(null)} title="Etiqueta Adesiva — Calculadora" size="sm">
           <div className="space-y-4 p-2">
              <div className="grid grid-cols-2 gap-2">
                 <Input label="Largura (cm)" type="number" step="any" value={etiquetaForm.largura} onChange={(e: any) => setEtiquetaForm({ ...etiquetaForm, largura: Number(e.target.value) || 0 })} />
                 <Input label="Altura (cm)" type="number" step="any" value={etiquetaForm.altura} onChange={(e: any) => setEtiquetaForm({ ...etiquetaForm, altura: Number(e.target.value) || 0 })} />
              </div>
              <Input
                label="Largura do Material (m)"
                type="number"
                step="any"
                value={etiquetaForm.larguraMaterial}
                onChange={(e: any) => setEtiquetaForm({ ...etiquetaForm, larguraMaterial: Number(e.target.value) || 0 })}
              />
              <p className="text-[9px] text-white/30 -mt-2">Vem pré-preenchida com a largura cadastrada do material — pode editar aqui, e o novo valor fica salvo pra próxima vez.</p>

              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase text-white/60 tracking-wider block">O cliente informou...</label>
                 <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1">
                    <button onClick={() => setEtiquetaInputMode('quantidade')} className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all", etiquetaInputMode === 'quantidade' ? "bg-primary-500 text-slate-900" : "text-white/40")}>Quantidade</button>
                    <button onClick={() => setEtiquetaInputMode('metros')} className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all", etiquetaInputMode === 'metros' ? "bg-primary-500 text-slate-900" : "text-white/40")}>Metros</button>
                    <button onClick={() => setEtiquetaInputMode('valor')} className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all", etiquetaInputMode === 'valor' ? "bg-primary-500 text-slate-900" : "text-white/40")}>Valor (R$)</button>
                 </div>
                 {etiquetaInputMode === 'quantidade' && (
                   <Input label="Quantidade de Etiquetas" type="number" autoFocus value={etiquetaForm.quantidade} onChange={(e: any) => setEtiquetaForm({ ...etiquetaForm, quantidade: Number(e.target.value) || 0 })} />
                 )}
                 {etiquetaInputMode === 'metros' && (
                   <Input label="Metros Lineares Desejados" type="number" step="any" autoFocus value={etiquetaForm.metrosInput} onChange={(e: any) => setEtiquetaForm({ ...etiquetaForm, metrosInput: Number(e.target.value) || 0 })} />
                 )}
                 {etiquetaInputMode === 'valor' && (
                   <Input label="Valor Disponível (R$)" type="number" step="any" autoFocus value={etiquetaForm.valorInput} onChange={(e: any) => setEtiquetaForm({ ...etiquetaForm, valorInput: Number(e.target.value) || 0 })} />
                 )}
              </div>

              {calc ? (
                <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-4 space-y-1.5">
                   <div className="flex justify-between text-xs text-white/50">
                      <span>Quantidade de etiquetas</span>
                      <span className="font-mono font-bold text-white">{calc.quantidade} un</span>
                   </div>
                   <div className="flex justify-between text-xs text-white/50">
                      <span>Etiquetas por fileira</span>
                      <span className="font-mono font-bold text-white">{calc.porFileira} {calc.rotacionada ? '(rotacionada)' : ''}</span>
                   </div>
                   <div className="flex justify-between text-xs text-white/50">
                      <span>Fileiras necessárias</span>
                      <span className="font-mono font-bold text-white">{calc.fileiras}</span>
                   </div>
                   <div className="flex justify-between text-xs text-white/50">
                      <span>Metros lineares</span>
                      <span className="font-mono font-bold text-white">{calc.metrosLineares.toFixed(2).replace('.', ',')} m</span>
                   </div>
                   {calc.valorFinal > calc.valorCalculado && (
                     <div className="flex justify-between text-[10px] text-amber-400 pt-1 border-t border-white/5">
                        <span>Impressão mínima aplicada</span>
                        <span className="font-mono font-bold">R$ 30,00</span>
                     </div>
                   )}
                   <div className="flex justify-between text-sm pt-1 border-t border-white/5">
                      <span className="text-emerald-400 font-bold">Valor Total</span>
                      <span className="font-mono font-black text-emerald-400">R$ {calc.valorFinal.toFixed(2).replace('.', ',')}</span>
                   </div>
                </div>
              ) : (
                <p className="text-center text-xs text-white/30 py-4">Preencha as dimensões, a largura do material e a quantidade/metros/valor pra calcular.</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                 <Button variant="ghost" onClick={() => setEtiquetaModalProduct(null)}>Cancelar</Button>
                 <Button disabled={!calc} className="bg-primary-500 text-slate-900 border-none" onClick={confirmAddEtiquetaItem}>Adicionar ao Carrinho</Button>
              </div>
           </div>
         </Modal>
       );
     })()}

     {dimensionModalProduct && (
       <Modal
         isOpen={!!dimensionModalProduct}
         onClose={() => setDimensionModalProduct(null)}
         title={`Metragem — ${dimensionModalProduct.name}`}
         size="sm"
       >
         <div className="space-y-5 p-2">
           <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
               <label className="text-[10px] font-black uppercase text-white/60 tracking-wider block">Largura (m)</label>
               <Input
                 type="number"
                 step="any"
                 autoFocus
                 placeholder="Ex: 1,20"
                 value={dimWidth}
                 onChange={(e: any) => setDimWidth(e.target.value === '' ? '' : Number(e.target.value))}
                 onKeyDown={(e: any) => { if (e.key === 'Enter') confirmAddDimensionedItem(); }}
               />
             </div>
             <div className="space-y-1">
               <label className="text-[10px] font-black uppercase text-white/60 tracking-wider block">Altura (m)</label>
               <Input
                 type="number"
                 step="any"
                 placeholder="Ex: 2,20"
                 value={dimHeight}
                 onChange={(e: any) => setDimHeight(e.target.value === '' ? '' : Number(e.target.value))}
                 onKeyDown={(e: any) => { if (e.key === 'Enter') confirmAddDimensionedItem(); }}
               />
             </div>
           </div>

           <Input
             label="Largura do Material (m)"
             type="number"
             step="any"
             value={dimLarguraMaterial}
             onChange={(e: any) => setDimLarguraMaterial(Number(e.target.value) || 0)}
           />
           <p className="text-[9px] text-white/30 -mt-3">Vem pré-preenchida com a largura cadastrada do material — pode editar aqui, e o novo valor fica salvo pra próxima vez.</p>

           {dimWidth !== '' && dimHeight !== '' && Number(dimWidth) > 0 && Number(dimHeight) > 0 && (
             <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-4 space-y-1">
               <div className="flex justify-between text-xs text-white/50">
                 <span>Área</span>
                 <span className="font-mono font-bold text-white">{(Number(dimWidth) * Number(dimHeight)).toFixed(2).replace('.', ',')} m²</span>
               </div>
               <div className="flex justify-between text-xs text-white/50">
                 <span>Valor unitário (m²)</span>
                 <span className="font-mono text-white">R$ {dimensionModalProduct.price.toFixed(2).replace('.', ',')}</span>
               </div>
               {dimLarguraMaterial > 0 && (() => {
                  const w = Number(dimWidth);
                  const h = Number(dimHeight);
                  const rolo = dimLarguraMaterial;
                  const consumo = calcularConsumoLinear(w, h, rolo);
                  const cabeComoEsta = w <= rolo;
                  const cabeGirada = h <= rolo;
                  const naoCabeEmNenhuma = !cabeComoEsta && !cabeGirada;
                  return (
                    <div className="pt-1 border-t border-white/5 space-y-1">
                       <div className="flex justify-between text-xs text-amber-300">
                          <span>Consumo do material ({rolo}m largura)</span>
                          <span className="font-mono font-bold">{(consumo * selectedQty).toFixed(2).replace('.', ',')} m linear</span>
                       </div>
                       {naoCabeEmNenhuma && (
                         <p className="text-[9px] text-rose-400">⚠ Nenhuma orientação cabe na largura do material — confira as medidas.</p>
                       )}
                    </div>
                  );
               })()}
               <div className="flex justify-between text-sm pt-1 border-t border-white/5">
                 <span className="text-emerald-400 font-bold">Subtotal</span>
                 <span className="font-mono font-black text-emerald-400">R$ {(Number(dimWidth) * Number(dimHeight) * dimensionModalProduct.price * selectedQty).toFixed(2).replace('.', ',')}</span>
               </div>
             </div>
           )}

           <div className="flex justify-end gap-3 pt-1">
             <Button variant="ghost" onClick={() => setDimensionModalProduct(null)}>Cancelar</Button>
             <Button className="bg-primary-500 hover:bg-primary-400 text-slate-900 font-black gap-2" onClick={confirmAddDimensionedItem}>
               <Plus size={16} />
               <span>Adicionar ao Carrinho</span>
             </Button>
           </div>
         </div>
       </Modal>
     )}

     {waSendOrcamento && (
       <Modal isOpen={!!waSendOrcamento} onClose={() => setWaSendOrcamento(null)} title="Enviar Orçamento pelo WhatsApp" size="sm">
         <div className="space-y-4 p-2">
            <p className="text-xs text-white/50">Orçamento <span className="text-white font-bold">{waSendOrcamento.numero}</span> — {waSendOrcamento.customerName}</p>
            <Input
              label="Número de WhatsApp"
              placeholder="(93) 99999-9999"
              value={waSendPhone}
              onChange={(e: any) => setWaSendPhone(e.target.value)}
              autoFocus
            />
            <p className="text-[10px] text-white/30">Pode trocar o número aqui pra mandar pra outro contato — o telefone principal do orçamento não é alterado, fica guardado só como número alternativo de envio.</p>
            {waSendOrcamento.telefoneAlternativo && waSendPhone === (waSendOrcamento.phone || '') && (
              <button
                onClick={() => setWaSendPhone(waSendOrcamento.telefoneAlternativo || '')}
                className="text-[10px] text-primary-300 hover:text-primary-200 font-bold"
              >
                Usar último número alternativo: {waSendOrcamento.telefoneAlternativo}
              </button>
            )}
            <div className="flex justify-end gap-3 pt-1">
               <Button variant="ghost" onClick={() => setWaSendOrcamento(null)}>Cancelar</Button>
               <Button className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 border-none" onClick={confirmShareOrcamentoWhatsApp}>Enviar</Button>
            </div>
         </div>
       </Modal>
     )}

     {viewingOrcamento && (
       <Modal
         isOpen={!!viewingOrcamento}
         onClose={() => setViewingOrcamento(null)}
         title={`Orçamento ${viewingOrcamento.numero}`}
         size="md"
       >
         <div className="space-y-5 p-2">
            <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-4 space-y-2">
               <div className="flex justify-between text-xs">
                  <span className="text-white/40 font-bold uppercase">Cliente</span>
                  <span className="text-white font-black">{viewingOrcamento.customerName}</span>
               </div>
               {viewingOrcamento.phone && (
                 <div className="flex justify-between text-xs">
                    <span className="text-white/40 font-bold uppercase">Telefone</span>
                    <span className="text-white font-black">{viewingOrcamento.phone}</span>
                 </div>
               )}
               <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                  <span className="text-white/40 font-bold uppercase">Itens</span>
                  <span className="text-white font-black">{viewingOrcamento.items.length}</span>
               </div>
               <div className="flex justify-between text-sm">
                  <span className="text-emerald-400 font-bold uppercase">Total</span>
                  <span className="text-emerald-400 font-black">R$ {viewingOrcamento.total.toFixed(2).replace('.', ',')}</span>
               </div>
               {viewingOrcamento.validade && (
                 <div className="flex justify-between text-xs">
                    <span className="text-white/40 font-bold uppercase">Válido até</span>
                    <span className="text-white font-black">{safeFormat(viewingOrcamento.validade, 'dd/MM/yyyy')}</span>
                 </div>
               )}
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
               {viewingOrcamento.items.map((item, idx) => (
                 <div key={idx} className="flex items-center justify-between px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-xs">
                    <span className="text-white/70">{item.quantity}x {item.name}</span>
                    <span className="text-white font-bold">R$ {(item.area ? item.price * item.area * item.quantity : item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                 </div>
               ))}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
               <Button variant="secondary" icon={Printer} onClick={() => handlePrintOrcamento(viewingOrcamento)}>Imprimir</Button>
               <Button variant="secondary" icon={ImageIcon} onClick={() => handleDownloadOrcamentoImagem(viewingOrcamento)}>Imagem</Button>
               <Button variant="secondary" icon={FileText} onClick={() => handleDownloadOrcamentoPdf(viewingOrcamento)}>PDF</Button>
            </div>
         </div>
       </Modal>
     )}

     <ProdutoFormModal
       isOpen={isQuickProductOpen}
       onClose={() => setIsQuickProductOpen(false)}
       editingItem={null}
       onSaved={(saved) => {
         loadProducts();
         if (quickProductAddToOrcamento && saved) {
           setOrcamentoForm(prev => ({
             ...prev,
             items: [...prev.items, { productId: saved.id, name: saved.name, price: Number(saved.sale_price) || 0, quantity: 1 }],
           }));
           setQuickProductAddToOrcamento(false);
         }
       }}
     />

     {orcamentoModalOpen && (
       <Modal
         isOpen={orcamentoModalOpen}
         onClose={() => setOrcamentoModalOpen(false)}
         title={editingOrcamento ? `Editar Orçamento ${editingOrcamento.numero}` : 'Novo Orçamento'}
         size="lg"
       >
         <div className="space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
            <div className="flex items-center justify-between">
               <p className="text-[10px] font-black uppercase text-primary-300 tracking-[2px]">Dados do Cliente</p>
               <button
                 onClick={() => {
                    setOrcamentoModalOpen(false);
                    setCustomerModalIntent('orcamento');
                    setCustomerModalMode('search');
                    setIsCustomerModalOpen(true);
                 }}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-300 hover:bg-primary-500/20 text-[9px] font-black uppercase tracking-wider transition-all"
               >
                 <Search size={11} /> Buscar Cliente Cadastrado
               </button>
            </div>
            {orcamentoForm.clienteId && (
              <p className="text-[9px] text-emerald-400 font-bold -mt-3">✓ Vinculado ao cadastro de clientes</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <Input label="Cliente *" value={orcamentoForm.customerName} onChange={(e: any) => setOrcamentoForm({ ...orcamentoForm, customerName: e.target.value, clienteId: undefined })} />
               <Input label="CPF/CNPJ" value={orcamentoForm.cpfCnpj} onChange={(e: any) => setOrcamentoForm({ ...orcamentoForm, cpfCnpj: e.target.value })} />
               <Input label="Telefone/WhatsApp" value={orcamentoForm.phone} onChange={(e: any) => setOrcamentoForm({ ...orcamentoForm, phone: e.target.value })} />
               <Input label="Responsável pelo Atendimento" value={orcamentoForm.responsavel} onChange={(e: any) => setOrcamentoForm({ ...orcamentoForm, responsavel: e.target.value })} />
               <Input label="Endereço" className="sm:col-span-2" value={orcamentoForm.address} onChange={(e: any) => setOrcamentoForm({ ...orcamentoForm, address: e.target.value })} />
               <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/60 tracking-wider block">Data de Emissão</label>
                  <div className="h-11 flex items-center px-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70">
                    {safeFormat(editingOrcamento?.createdAt || new Date().toISOString(), 'dd/MM/yyyy')}
                  </div>
               </div>
               <Input label="Validade" type="date" value={orcamentoForm.validade} onChange={(e: any) => setOrcamentoForm({ ...orcamentoForm, validade: e.target.value })} />
            </div>

            <div className="h-px bg-white/10" />

            <div className="space-y-2">
               <p className="text-[10px] font-black uppercase text-primary-300 tracking-[2px]">Itens do Orçamento</p>
               <button
                 onClick={() => {
                    setCart([...orcamentoForm.items]);
                    setOrcamentoModalOpen(false);
                    setOrcamentoItemsEditMode(true);
                    setActiveTab('venda');
                 }}
                 className="w-full h-11 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-300 hover:bg-primary-500/20 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2"
               >
                 <Plus size={15} /> Adicionar Item
               </button>
               <div className="space-y-1.5">
                  {orcamentoForm.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2 bg-white/5 border border-white/5 rounded-lg flex-wrap">
                       <div className="flex items-center gap-2 min-w-0 flex-1">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => {
                               const qty = Math.max(1, Number(e.target.value) || 1);
                               setOrcamentoForm(prev => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, quantity: qty } : it) }));
                            }}
                            className="w-12 h-7 bg-slate-900/60 border border-white/10 rounded px-1.5 text-xs text-white text-center"
                            title="Quantidade"
                          />
                          <div className="min-w-0 flex-1">
                             <p className="text-xs font-bold text-white truncate">{item.name}</p>
                             <button
                               onClick={() => setOrcamentoForm(prev => ({ ...prev, items: prev.items.map((it: any, i) => i === idx ? { ...it, category: it.category === 'servico' ? 'produto' : 'servico' } : it) }))}
                               className={cn(
                                 "text-[7px] font-black uppercase px-1.5 py-0.5 rounded mt-0.5 inline-block",
                                 (item as any).category === 'servico' ? "bg-blue-500/20 text-blue-300" : "bg-white/10 text-white/40"
                               )}
                               title="Clique para alternar Produto/Serviço"
                             >
                               {(item as any).category === 'servico' ? 'Serviço' : 'Produto'}
                             </button>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col items-end">
                             <span className="text-[7px] font-black text-white/30 uppercase tracking-wider">Valor Unit.</span>
                             <input
                               type="number"
                               step="any"
                               value={item.price}
                               onChange={(e) => {
                                  const price = Math.max(0, Number(e.target.value) || 0);
                                  setOrcamentoForm(prev => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, price } : it) }));
                               }}
                               className="w-20 h-6 bg-slate-900/60 border border-white/10 rounded px-1.5 text-[10px] text-white text-right"
                             />
                          </div>
                          <span className="text-xs font-black text-emerald-400 min-w-[70px] text-right">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                          <button onClick={() => setOrcamentoForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))} className="text-white/30 hover:text-rose-400"><X size={13} /></button>
                       </div>
                    </div>
                  ))}
                  {orcamentoForm.items.length === 0 && <p className="text-xs text-white/30 py-3 text-center">Nenhum item adicionado ainda.</p>}
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
               <Input label="Desconto (R$)" type="number" step="any" value={orcamentoForm.desconto} onChange={(e: any) => setOrcamentoForm({ ...orcamentoForm, desconto: Number(e.target.value) || 0 })} />
               <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/60 tracking-wider block">Entrada</label>
                  <div className="flex gap-1.5">
                     <input
                       type="number"
                       step="any"
                       value={orcamentoForm.entradaModo === 'percentual' ? orcamentoForm.entradaPercentual : orcamentoForm.entradaValor}
                       onChange={(e: any) => orcamentoForm.entradaModo === 'percentual'
                         ? updatePoliticaPagamento({ entradaPercentual: Number(e.target.value) || 0 })
                         : updatePoliticaPagamento({ entradaValor: Number(e.target.value) || 0 })}
                       className="flex-1 h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-primary-500"
                     />
                     <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/10 shrink-0">
                        <button onClick={() => updatePoliticaPagamento({ entradaModo: 'percentual' })} className={cn("px-2.5 h-full rounded-lg text-[10px] font-black", orcamentoForm.entradaModo === 'percentual' ? "bg-primary-500 text-slate-900" : "text-white/40")}>%</button>
                        <button onClick={() => updatePoliticaPagamento({ entradaModo: 'valor' })} className={cn("px-2.5 h-full rounded-lg text-[10px] font-black", orcamentoForm.entradaModo === 'valor' ? "bg-primary-500 text-slate-900" : "text-white/40")}>R$</button>
                     </div>
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-white/60 tracking-wider block">Valor da Entrada</label>
                  <div className="h-11 flex items-center px-3 bg-white/5 border border-white/10 rounded-xl text-sm text-emerald-400 font-bold">
                    R$ {orcamentoEntradaValorCalc().toFixed(2).replace('.', ',')}
                  </div>
               </div>
            </div>

            <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 flex justify-between items-center">
               <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Total do Orçamento</span>
               <span className="text-xl font-black text-emerald-400 italic">R$ {Math.max(0, orcamentoItemsTotal() - (orcamentoForm.desconto || 0)).toFixed(2).replace('.', ',')}</span>
            </div>

            <div className="h-px bg-white/10" />

            <div className="space-y-3">
               <p className="text-[10px] font-black uppercase text-primary-300 tracking-[2px]">Prazo de Produção/Entrega</p>

               <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="space-y-1">
                     <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Dias</label>
                     <input
                       type="number"
                       min={1}
                       value={orcamentoForm.prazoDias}
                       onChange={(e) => updatePrazoStructured({ prazoDias: Math.max(1, Number(e.target.value) || 1) })}
                       className="w-full h-9 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-primary-500"
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Tipo</label>
                     <select
                       value={orcamentoForm.prazoTipo}
                       onChange={(e) => updatePrazoStructured({ prazoTipo: e.target.value as 'uteis' | 'corridos' })}
                       className="w-full h-9 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-primary-500 cursor-pointer"
                     >
                       <option value="uteis" className="bg-slate-900">Dias Úteis</option>
                       <option value="corridos" className="bg-slate-900">Dias Corridos</option>
                     </select>
                  </div>
                  <div className="space-y-1 col-span-2">
                     <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Contado a partir de</label>
                     <select
                       value={orcamentoForm.prazoGatilho}
                       onChange={(e) => updatePrazoStructured({ prazoGatilho: e.target.value as any })}
                       className="w-full h-9 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-primary-500 cursor-pointer"
                     >
                       <option value="aprovacao" className="bg-slate-900">Aprovação do orçamento</option>
                       <option value="pagamento_entrada" className="bg-slate-900">Pagamento da entrada</option>
                       <option value="aprovacao_arte" className="bg-slate-900">Aprovação da arte</option>
                       <option value="entrega_material" className="bg-slate-900">Entrega de material pelo cliente</option>
                       <option value="personalizado" className="bg-slate-900">Condição personalizada (texto livre)</option>
                     </select>
                  </div>
               </div>

               <Input label="Data Prevista de Conclusão (opcional)" type="date" value={orcamentoForm.prazoDataPrevista} onChange={(e: any) => setOrcamentoForm({ ...orcamentoForm, prazoDataPrevista: e.target.value })} />

               <textarea
                 rows={2}
                 value={orcamentoForm.prazoProducao}
                 readOnly={orcamentoForm.prazoGatilho !== 'personalizado'}
                 onChange={(e) => setOrcamentoForm({ ...orcamentoForm, prazoProducao: e.target.value })}
                 className={cn(
                   "w-full border rounded-xl px-3 py-2.5 text-xs resize-none focus:outline-none",
                   orcamentoForm.prazoGatilho !== 'personalizado' ? "bg-white/[0.02] border-white/5 text-white/50" : "bg-white/5 border-white/10 text-white focus:border-primary-500"
                 )}
               />
               <p className="text-[9px] text-amber-300/80 font-bold flex items-center gap-1.5">
                  <AlertCircle size={12} /> Prazo de produção ≠ prazo de pagamento — essa distinção fica registrada e visível no PDF/WhatsApp enviado ao cliente.
               </p>

               <p className="text-[10px] font-black uppercase text-primary-300 tracking-[2px] pt-1">Política de Pagamento</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={orcamentoForm.politicaPagamento}
                    onChange={(e) => updatePoliticaPagamento({ politicaPagamento: e.target.value as any })}
                    className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-primary-500 cursor-pointer"
                  >
                     {Object.entries(POLITICA_PAGAMENTO_LABELS).map(([id, label]) => <option key={id} value={id} className="bg-slate-900">{label}</option>)}
                  </select>
                  <button
                    onClick={() => updatePoliticaPagamento({ entradaObrigatoria: !orcamentoForm.entradaObrigatoria })}
                    className={cn(
                      "h-10 rounded-xl border-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all",
                      orcamentoForm.entradaObrigatoria ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-white/5 border-white/10 text-white/40"
                    )}
                  >
                     <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center", orcamentoForm.entradaObrigatoria ? "bg-amber-500 border-amber-500" : "border-white/20")}>
                        {orcamentoForm.entradaObrigatoria && <Check size={10} className="text-slate-900" />}
                     </div>
                     Entrada obrigatória p/ iniciar produção
                  </button>
               </div>

               <p className="text-[10px] font-black uppercase text-primary-300 tracking-[2px] pt-1">Formas de Pagamento (combine quantas precisar)</p>
               <div className="space-y-2">
                  {orcamentoForm.formasPagamento.map((f, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                       <div className="flex flex-wrap gap-2 items-end">
                          <div className="space-y-0.5 flex-1 min-w-[130px]">
                             <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Forma</label>
                             <select
                               value={f.metodo}
                               onChange={(e) => updateOrcamentoFormaPagamento(idx, { metodo: e.target.value as any })}
                               className="w-full h-9 bg-slate-900/60 border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-primary-500 cursor-pointer"
                             >
                                {Object.entries(ORCAMENTO_PAGAMENTO_LABELS).map(([id, label]) => <option key={id} value={id} className="bg-slate-900">{label}</option>)}
                             </select>
                          </div>
                          {f.metodo === 'outra' && (
                            <div className="space-y-0.5 flex-1 min-w-[110px]">
                               <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Qual?</label>
                               <input value={f.metodoOutraLabel || ''} onChange={(e) => updateOrcamentoFormaPagamento(idx, { metodoOutraLabel: e.target.value })} className="w-full h-9 bg-slate-900/60 border border-white/10 rounded-lg px-2 text-xs text-white" />
                            </div>
                          )}
                          <div className="space-y-0.5 w-24">
                             <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Valor (R$)</label>
                             <input type="number" step="any" value={f.valor} onChange={(e) => updateOrcamentoFormaPagamento(idx, { valor: Number(e.target.value) || 0 })} className="w-full h-9 bg-slate-900/60 border border-white/10 rounded-lg px-2 text-xs text-white" />
                          </div>
                          <button onClick={() => removeOrcamentoFormaPagamento(idx)} className="h-9 w-9 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 shrink-0"><Trash2 size={13} /></button>
                       </div>

                       {f.metodo === 'cartao_parcelado' && (
                         <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-white/5">
                            <div className="space-y-0.5">
                               <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Parcelas</label>
                               <input type="number" min={1} value={f.parcelas || 1} onChange={(e) => {
                                  const parcelas = Math.max(1, Number(e.target.value) || 1);
                                  updateOrcamentoFormaPagamento(idx, { parcelas, valorParcela: Number(((f.valor || 0) / parcelas).toFixed(2)) });
                               }} className="w-full h-8 bg-slate-900/60 border border-white/10 rounded-lg px-2 text-xs text-white" />
                            </div>
                            <div className="space-y-0.5">
                               <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Valor/Parcela</label>
                               <div className="h-8 flex items-center px-2 bg-slate-900/30 border border-white/5 rounded-lg text-xs text-emerald-400 font-bold">
                                 R$ {(f.valorParcela || 0).toFixed(2).replace('.', ',')}
                               </div>
                            </div>
                            <div className="space-y-0.5">
                               <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">1º Vencimento</label>
                               <input type="date" value={f.primeiroVencimento || ''} onChange={(e) => updateOrcamentoFormaPagamento(idx, { primeiroVencimento: e.target.value })} className="w-full h-8 bg-slate-900/60 border border-white/10 rounded-lg px-2 text-[10px] text-white" />
                            </div>
                            <div className="space-y-0.5">
                               <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Intervalo (dias)</label>
                               <input type="number" min={1} value={f.intervaloDias || 30} onChange={(e) => updateOrcamentoFormaPagamento(idx, { intervaloDias: Number(e.target.value) || 30 })} className="w-full h-8 bg-slate-900/60 border border-white/10 rounded-lg px-2 text-xs text-white" />
                            </div>
                         </div>
                       )}
                       {f.metodo !== 'cartao_parcelado' && (
                         <div className="pt-1 border-t border-white/5">
                            <div className="space-y-0.5 w-40">
                               <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Data de Vencimento</label>
                               <input type="date" value={f.dataVencimento || ''} onChange={(e) => updateOrcamentoFormaPagamento(idx, { dataVencimento: e.target.value })} className="w-full h-8 bg-slate-900/60 border border-white/10 rounded-lg px-2 text-[10px] text-white" />
                            </div>
                         </div>
                       )}
                    </div>
                  ))}
                  <button onClick={addOrcamentoFormaPagamento} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-300 hover:bg-primary-500/20 text-[10px] font-black uppercase tracking-wider transition-all">
                     <Plus size={12} /> Adicionar Forma de Pagamento
                  </button>
               </div>

               <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5 flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Saldo Restante (não coberto acima)</span>
                  <span className={cn("text-sm font-black", orcamentoSaldoRestante() > 0 ? "text-amber-400" : "text-emerald-400")}>R$ {orcamentoSaldoRestante().toFixed(2).replace('.', ',')}</span>
               </div>

               <p className="text-[10px] font-black uppercase text-primary-300 tracking-[2px] pt-1">Resumo (texto final exibido no orçamento)</p>
               <textarea rows={2} value={orcamentoForm.formaPagamentoTexto} onChange={(e) => setOrcamentoForm({ ...orcamentoForm, formaPagamentoTexto: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white resize-none focus:outline-none focus:border-primary-500" />

               <p className="text-[10px] font-black uppercase text-amber-300 tracking-[2px]">Prazo de Pagamento (não é o mesmo que prazo de produção)</p>
               <textarea rows={2} value={orcamentoForm.prazoPagamentoTexto} onChange={(e) => setOrcamentoForm({ ...orcamentoForm, prazoPagamentoTexto: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white resize-none focus:outline-none focus:border-primary-500" />

               <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
                  <button
                    onClick={() => setOrcamentoForm(prev => ({ ...prev, pagamentoPosteriorAutorizado: !prev.pagamentoPosteriorAutorizado }))}
                    className="flex items-center gap-2 text-[10px] font-black uppercase text-white tracking-wider"
                  >
                     <div className={cn("w-4 h-4 rounded border flex items-center justify-center", orcamentoForm.pagamentoPosteriorAutorizado ? "bg-primary-500 border-primary-500" : "border-white/20")}>
                        {orcamentoForm.pagamentoPosteriorAutorizado && <Check size={11} className="text-slate-900" />}
                     </div>
                     Pagamento Posterior Autorizado (exceção ao prazo padrão)
                  </button>
                  <p className="text-[9px] text-white/40">Só marque se você está concedendo, de forma expressa, um prazo diferente do padrão para este cliente pagar.</p>

                  {orcamentoForm.pagamentoPosteriorAutorizado && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                       <div className="space-y-0.5">
                          <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Data de Vencimento</label>
                          <input type="date" value={orcamentoForm.pagamentoPosteriorData} onChange={(e) => setOrcamentoForm({ ...orcamentoForm, pagamentoPosteriorData: e.target.value })} className="w-full h-8 bg-slate-900/60 border border-white/10 rounded-lg px-2 text-[10px] text-white" />
                       </div>
                       <div className="space-y-0.5">
                          <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Prazo Concedido (dias)</label>
                          <input type="number" min={0} value={orcamentoForm.pagamentoPosteriorDias} onChange={(e) => setOrcamentoForm({ ...orcamentoForm, pagamentoPosteriorDias: Number(e.target.value) || 0 })} className="w-full h-8 bg-slate-900/60 border border-white/10 rounded-lg px-2 text-xs text-white" />
                       </div>
                       <div className="space-y-0.5 col-span-2">
                          <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Condição Especial</label>
                          <input value={orcamentoForm.pagamentoPosteriorCondicao} onChange={(e) => setOrcamentoForm({ ...orcamentoForm, pagamentoPosteriorCondicao: e.target.value })} placeholder="Ex: aguardar recebimento de outro pagamento" className="w-full h-8 bg-slate-900/60 border border-white/10 rounded-lg px-2 text-xs text-white" />
                       </div>
                       <div className="space-y-0.5 col-span-2">
                          <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Responsável pela Autorização</label>
                          <input value={orcamentoForm.pagamentoPosteriorResponsavel} onChange={(e) => setOrcamentoForm({ ...orcamentoForm, pagamentoPosteriorResponsavel: e.target.value })} placeholder="Nome de quem autorizou" className="w-full h-8 bg-slate-900/60 border border-white/10 rounded-lg px-2 text-xs text-white" />
                       </div>
                    </div>
                  )}
               </div>

               <p className="text-[10px] font-black uppercase text-primary-300 tracking-[2px]">Condição de Entrega/Retirada</p>
               <textarea rows={2} value={orcamentoForm.condicaoEntregaTexto} onChange={(e) => setOrcamentoForm({ ...orcamentoForm, condicaoEntregaTexto: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white resize-none focus:outline-none focus:border-primary-500" />

               <p className="text-[10px] font-black uppercase text-primary-300 tracking-[2px]">Multa e Juros por Atraso</p>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="space-y-0.5">
                     <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Multa (%)</label>
                     <input type="number" step="any" min={0} value={orcamentoForm.multaPercentual} onChange={(e) => updateMultaJuros({ multaPercentual: Number(e.target.value) || 0 })} className="w-full h-9 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-primary-500" />
                  </div>
                  <div className="space-y-0.5">
                     <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Juros (%)</label>
                     <input type="number" step="any" min={0} value={orcamentoForm.jurosPercentual} onChange={(e) => updateMultaJuros({ jurosPercentual: Number(e.target.value) || 0 })} className="w-full h-9 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-primary-500" />
                  </div>
                  <div className="space-y-0.5">
                     <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Forma de Cálculo</label>
                     <select value={orcamentoForm.jurosModo} onChange={(e) => updateMultaJuros({ jurosModo: e.target.value as any })} className="w-full h-9 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-primary-500 cursor-pointer">
                        <option value="mensal" className="bg-slate-900">Juros ao mês</option>
                        <option value="diario" className="bg-slate-900">Juros ao dia</option>
                     </select>
                  </div>
                  <div className="space-y-0.5">
                     <label className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Tolerância (dias)</label>
                     <input type="number" min={0} value={orcamentoForm.diasTolerancia} onChange={(e) => updateMultaJuros({ diasTolerancia: Number(e.target.value) || 0 })} className="w-full h-9 bg-white/5 border border-white/10 rounded-lg px-2 text-xs text-white focus:outline-none focus:border-primary-500" />
                  </div>
               </div>

               <textarea rows={2} value={orcamentoForm.multaJurosTexto} onChange={(e) => setOrcamentoForm({ ...orcamentoForm, multaJurosTexto: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white resize-none focus:outline-none focus:border-primary-500" />

               {/* Simulador de atraso: calculo automatico */}
               <div className="bg-black/20 rounded-xl p-3 space-y-2 border border-white/5">
                  <div className="flex items-center justify-between gap-2">
                     <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Simular atraso de</span>
                     <div className="flex items-center gap-1.5">
                        <input type="number" min={0} value={simuladorDias} onChange={(e) => setSimuladorDias(Number(e.target.value) || 0)} className="w-14 h-7 bg-slate-900/60 border border-white/10 rounded px-1.5 text-xs text-white text-center" />
                        <span className="text-[9px] text-white/40 font-bold">dias, sobre R$ {orcamentoSaldoRestante().toFixed(2).replace('.', ',')} em aberto</span>
                     </div>
                  </div>
                  {(() => {
                     const calc = calcularAtraso(orcamentoSaldoRestante(), simuladorDias);
                     return (
                       <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
                          <div>
                             <p className="text-[7px] font-black uppercase text-white/30 tracking-wider">Multa</p>
                             <p className="text-xs font-black text-amber-400">R$ {calc.multa.toFixed(2).replace('.', ',')}</p>
                          </div>
                          <div>
                             <p className="text-[7px] font-black uppercase text-white/30 tracking-wider">Juros ({calc.diasEfetivos}d)</p>
                             <p className="text-xs font-black text-amber-400">R$ {calc.juros.toFixed(2).replace('.', ',')}</p>
                          </div>
                          <div>
                             <p className="text-[7px] font-black uppercase text-white/30 tracking-wider">Valor Atualizado</p>
                             <p className="text-xs font-black text-rose-400">R$ {calc.total.toFixed(2).replace('.', ',')}</p>
                          </div>
                       </div>
                     );
                  })()}
               </div>

               <p className="text-[10px] font-black uppercase text-primary-300 tracking-[2px]">Garantia do Serviço</p>
               <textarea rows={2} value={orcamentoForm.garantiaTexto} onChange={(e) => setOrcamentoForm({ ...orcamentoForm, garantiaTexto: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white resize-none focus:outline-none focus:border-primary-500" />

               <p className="text-[10px] font-black uppercase text-primary-300 tracking-[2px]">Política de Cancelamento</p>
               <textarea rows={2} value={orcamentoForm.politicaCancelamentoTexto} onChange={(e) => setOrcamentoForm({ ...orcamentoForm, politicaCancelamentoTexto: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white resize-none focus:outline-none focus:border-primary-500" />

               <p className="text-[10px] font-black uppercase text-primary-300 tracking-[2px]">Observações</p>
               <textarea rows={2} value={orcamentoForm.observacoes} onChange={(e) => setOrcamentoForm({ ...orcamentoForm, observacoes: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white resize-none focus:outline-none focus:border-primary-500" />
            </div>

            <div className="flex justify-end gap-3 pt-1">
               <Button variant="ghost" onClick={() => setOrcamentoModalOpen(false)}>Cancelar</Button>
               <Button disabled={savingOrcamento} onClick={handleSaveOrcamento} className="bg-primary-500 text-slate-900 border-none">
                 {savingOrcamento ? 'Salvando...' : 'Salvar Orçamento'}
               </Button>
            </div>
         </div>
       </Modal>
     )}

     {isScheduleModalOpen && (
       <Modal
         isOpen={isScheduleModalOpen}
         onClose={() => setIsScheduleModalOpen(false)}
         title="Agendar Entrega"
         size="sm"
       >
         <div className="space-y-5 p-2">
           <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-4 space-y-2">
             <div className="flex justify-between text-xs">
               <span className="text-white/40 font-bold uppercase">Total da Venda</span>
               <span className="text-white font-black">R$ {total.toFixed(2).replace('.', ',')}</span>
             </div>
             <div className="flex justify-between text-xs">
               <span className="text-emerald-400 font-bold uppercase">Entrada Recebida</span>
               <span className="text-emerald-400 font-black">R$ {(downPayment === "" ? 0 : Number(downPayment)).toFixed(2).replace('.', ',')}</span>
             </div>
             <div className="flex justify-between text-xs border-t border-white/5 pt-2">
               <span className="text-rose-400 font-bold uppercase">Saldo Restante</span>
               <span className="text-rose-400 font-black">R$ {remainingValue.toFixed(2).replace('.', ',')}</span>
             </div>
           </div>

           <div className="space-y-1.5">
             <label className="text-[10px] font-black uppercase text-white/60 tracking-wider block">Data e Hora da Entrega</label>
             <Input
               type="datetime-local"
               value={scheduledFor}
               onChange={(e: any) => setScheduledFor(e.target.value)}
               autoFocus
             />
           </div>

           <div className="flex justify-end gap-3 pt-1">
             <Button variant="ghost" onClick={() => setIsScheduleModalOpen(false)}>Cancelar</Button>
             <Button
               className="bg-primary-500 hover:bg-primary-400 text-slate-900 font-black gap-2"
               disabled={!scheduledFor}
               onClick={() => setIsScheduleModalOpen(false)}
             >
               <CheckCircle2 size={16} />
               <span>OK</span>
             </Button>
           </div>
         </div>
       </Modal>
     )}

     {isPixQrModalOpen && pixConfig && (() => {
       const amountToCharge = pixQrAmount > 0 ? pixQrAmount : remainingValue;
       const pixPayload = buildPixPayload({
         key: pixConfig.key,
         beneficiaryName: pixConfig.beneficiaryName,
         city: pixConfig.city,
         amount: amountToCharge,
       });
       return (
         <Modal
           isOpen={isPixQrModalOpen}
           onClose={() => setIsPixQrModalOpen(false)}
           title="Pagamento via PIX"
           size="sm"
         >
           <div className="flex flex-col items-center gap-4 p-2">
             <div className="w-56 h-56 max-w-full bg-white rounded-2xl p-3 shadow-lg flex items-center justify-center shrink-0">
               <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixPayload)}`} alt="QR Code PIX" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
             </div>

             <div className="w-full bg-slate-900/60 rounded-2xl border border-white/10 p-4 space-y-2">
               <div className="flex justify-between text-xs">
                 <span className="text-white/40 font-bold uppercase">Valor</span>
                 <span className="text-white font-black">R$ {amountToCharge.toFixed(2).replace('.', ',')}</span>
               </div>
               <div className="flex justify-between text-xs">
                 <span className="text-white/40 font-bold uppercase">Nome</span>
                 <span className="text-white font-black">{pixConfig.beneficiaryName}</span>
               </div>
               {pixConfig.bank && (
                 <div className="flex justify-between text-xs">
                   <span className="text-white/40 font-bold uppercase">Banco</span>
                   <span className="text-white font-black">{pixConfig.bank}</span>
                 </div>
               )}
               <div className="flex justify-between text-xs">
                 <span className="text-white/40 font-bold uppercase">Chave PIX</span>
                 <span className="text-white font-black break-all text-right ml-4">{pixConfig.key}</span>
               </div>
             </div>

             <div className="w-full flex gap-2">
               <button
                  type="button"
                  onClick={() => {
                     navigator.clipboard.writeText(pixConfig.key);
                     alert("Chave PIX copiada!");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-300 hover:bg-primary-500/20 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
               >
                  Copiar Chave
               </button>
               <button
                  type="button"
                  onClick={() => {
                     navigator.clipboard.writeText(pixPayload);
                     alert("Código Pix Copia e Cola copiado!");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-300 hover:bg-primary-500/20 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
               >
                  Copia e Cola
               </button>
             </div>
             <Button variant="ghost" className="w-full" onClick={() => setIsPixQrModalOpen(false)}>Fechar</Button>
           </div>
         </Modal>
       );
     })()}

     {isBulkDeleteConfirmOpen && (
       <Modal
         isOpen={isBulkDeleteConfirmOpen}
         onClose={() => setIsBulkDeleteConfirmOpen(false)}
         title="Confirmar Exclusão"
         size="sm"
       >
         <div className="space-y-5 p-4">
           <div className="flex items-center gap-4 p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
             <AlertCircle size={28} className="text-rose-400 shrink-0" />
             <p className="text-sm text-white/80">
               Tem certeza que deseja excluir <strong className="text-white">{selectedSaleIds.size} venda(s)</strong> selecionada(s)? Essa ação não pode ser desfeita.
             </p>
           </div>
           <div className="flex justify-end gap-3">
             <Button variant="ghost" onClick={() => setIsBulkDeleteConfirmOpen(false)}>Cancelar</Button>
             <Button className="bg-rose-500 hover:bg-rose-400 text-white font-black gap-2" onClick={confirmBulkDeleteSales}>
               <Trash2 size={16} />
               <span>Excluir Definitivamente</span>
             </Button>
           </div>
         </div>
       </Modal>
     )}

     {viewingReceiptSale && (() => {
       const sale = viewingReceiptSale;
       const down = sale.downPayment ?? sale.receivedValue ?? (sale.status === 'completed' ? sale.total : 0);
       const balance = Math.max(0, sale.total - down);
       const isPending = balance > 0 || sale.status === 'pending';
       return (
         <Modal
           isOpen={!!viewingReceiptSale}
           onClose={() => setViewingReceiptSale(null)}
           title="Visualizar Recibo"
           size="md"
         >
           <div className="space-y-4 p-2">
             <div className="flex items-center justify-between border-b border-white/5 pb-3">
               <div>
                 <h3 className="text-lg font-black text-white uppercase">Pedido #{sale.id.slice(-8).toUpperCase()}</h3>
                 <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{safeFormat(sale.createdAt, 'dd/MM/yyyy HH:mm')}</p>
               </div>
               <Badge className={cn("text-[9px] font-black uppercase px-2.5 py-1 border-none", isPending ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300")}>
                 {isPending ? 'EM ABERTO' : 'QUITADO'}
               </Badge>
             </div>

             {/* Dados do Cliente */}
             <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 space-y-2">
               <h4 className="text-[9px] font-black uppercase text-primary-300 tracking-[2px] mb-1">Cliente</h4>
               <p className="text-sm font-black text-white">{sale.customerName || 'Cliente de Balcão'}</p>
               {sale.customerPhone ? (
                 <button
                   onClick={() => handleOpenChatFromReceipt(sale)}
                   className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-xs font-bold underline decoration-dotted"
                   title="Abrir conversa no Funil de Atendimento"
                 >
                   <MessageSquare size={13} />
                   {sale.customerPhone}
                 </button>
               ) : (
                 <p className="text-xs text-white/30">Sem telefone cadastrado</p>
               )}
               {viewingReceiptEmail && <p className="text-xs text-white/50">{viewingReceiptEmail}</p>}
             </div>

             {/* Itens */}
             <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
               <h4 className="text-[9px] font-black uppercase text-primary-300 tracking-[2px] mb-1">Produtos</h4>
               {sale.items?.map((item, idx) => (
                 <div key={idx} className="flex justify-between text-xs text-white/70">
                   <span>{item.quantity}x {item.name}</span>
                   <span className="font-bold text-white/90">R$ {((item.area ? item.price * item.area : item.price) * item.quantity).toFixed(2).replace('.', ',')}</span>
                 </div>
               ))}
             </div>

             {/* Valores */}
             <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5 space-y-1.5">
               <div className="flex justify-between text-xs text-white/50">
                 <span>Total</span>
                 <span className="font-mono font-bold text-white">R$ {sale.total.toFixed(2).replace('.', ',')}</span>
               </div>
               <div className="flex justify-between text-xs text-emerald-400 font-bold">
                 <span>Recebido</span>
                 <span className="font-mono">R$ {down.toFixed(2).replace('.', ',')}</span>
               </div>
               {isPending && (
                 <div className="flex justify-between text-xs text-rose-400 font-bold">
                   <span>Falta Pagar</span>
                   <span className="font-mono">R$ {balance.toFixed(2).replace('.', ',')}</span>
                 </div>
               )}
               <div className="flex justify-between text-xs text-white/40 pt-1 border-t border-white/5">
                 <span>Forma de Pagamento</span>
                 <span className="font-bold uppercase">{sale.paymentMethod || '-'}</span>
               </div>
             </div>

             {/* Ações */}
             <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
               <Button variant="secondary" size="sm" icon={Printer} className="text-[9px] uppercase tracking-wider font-black h-11" onClick={() => handlePrintReceipt(sale)}>
                 Imprimir
               </Button>
               <Button variant="secondary" size="sm" icon={ImageIcon} className="text-[9px] uppercase tracking-wider font-black h-11" onClick={() => handleDownloadReceiptImagem(sale)}>
                 Imagem
               </Button>
               <Button variant="secondary" size="sm" icon={FileText} className="text-[9px] uppercase tracking-wider font-black h-11" onClick={() => handleDownloadReceiptPdf(sale)}>
                 Baixar PDF
               </Button>
               <Button variant="secondary" size="sm" icon={Share2} className="text-[9px] uppercase tracking-wider font-black h-11 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleShareReceiptWhatsApp(sale)}>
                 WhatsApp
               </Button>
               <Button variant="ghost" size="sm" className="text-[9px] uppercase tracking-wider font-black h-11" onClick={() => setViewingReceiptSale(null)}>
                 Fechar
               </Button>
             </div>
           </div>
         </Modal>
       );
     })()}
    </div>
  );
};

// --- CONTACTS ---
export const ContactsModule = ({ currentCompany, onViewHistoryForClient }: { currentCompany: Company | null; onViewHistoryForClient?: (clienteId: string, clienteName: string) => void }) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', phone: '', email: '', cpf_cnpj: '', city: '', state: '' });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Estatisticas de vendas por cliente (ultimo pedido, faturamento, pago, pendente) e custo dos produtos (pro lucro)
  const [clienteStats, setClienteStats] = useState<Record<string, { lastDate: string; count: number; total: number; pago: number; pendente: number; custoTotal: number }>>({});
  const [clienteVendas, setClienteVendas] = useState<Record<string, any[]>>({});
  const [produtosCostMap, setProdutosCostMap] = useState<Record<string, number>>({});
  const [fichaCliente, setFichaCliente] = useState<any | null>(null);
  const [isLinkingVendas, setIsLinkingVendas] = useState(false);
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const [clienteSortBy, setClienteSortByState] = useState<'nome' | 'data' | 'valor' | 'servicos'>(() => {
    const saved = localStorage.getItem('rpro_clientes_sort');
    return (saved === 'nome' || saved === 'data' || saved === 'valor' || saved === 'servicos') ? saved : 'nome';
  });
  const setClienteSortBy = (v: 'nome' | 'data' | 'valor' | 'servicos') => {
    setClienteSortByState(v);
    localStorage.setItem('rpro_clientes_sort', v);
  };
  const [clienteLetraAtiva, setClienteLetraAtiva] = useState<string | null>(null);
  const clienteRowRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const filteredSortedClientes = useMemo(() => {
    let list = clientes;
    const term = clienteSearchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(c => (c.full_name || '').toLowerCase().includes(term) || (c.phone || '').includes(term));
    }
    if (clienteLetraAtiva) {
      list = list.filter(c => (c.full_name || '').trim().toUpperCase().startsWith(clienteLetraAtiva));
    }
    const withStats = list.map(c => ({ ...c, _stats: clienteStats[c.id] }));
    switch (clienteSortBy) {
      case 'data':
        return withStats.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      case 'valor':
        return withStats.sort((a, b) => (b._stats?.total || 0) - (a._stats?.total || 0));
      case 'servicos':
        return withStats.sort((a, b) => (b._stats?.count || 0) - (a._stats?.count || 0));
      default:
        return withStats.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    }
  }, [clientes, clienteSearchTerm, clienteSortBy, clienteLetraAtiva, clienteStats]);

  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const letrasDisponiveis = new Set(clientes.map(c => (c.full_name || '').trim().toUpperCase()[0]).filter(Boolean));

  const scrollToLetra = (letra: string) => {
    setClienteLetraAtiva(null);
    setClienteSortBy('nome');
    setTimeout(() => {
      const ordenados = clientes.slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      const target = ordenados.find(c => (c.full_name || '').trim().toUpperCase().startsWith(letra));
      if (target) clienteRowRefs.current[target.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };


  const handleLinkVendasToClientes = async () => {
    setIsLinkingVendas(true);
    try {
      const { data: vendasSemCliente } = await supabase.from('vendas').select('id, customer_name, customer_phone').is('cliente_id', null).is('deleted_at', null);
      if (!vendasSemCliente || vendasSemCliente.length === 0) {
        alert('Todas as vendas já estão vinculadas a um cliente cadastrado.');
        return;
      }
      const { data: todosClientes } = await supabase.from('clientes').select('id, full_name, phone');
      const porNome = new Map<string, string>();
      const porTelefone = new Map<string, string>();
      (todosClientes || []).forEach((c: any) => {
        const nome = (c.full_name || '').trim().toLowerCase();
        const tel = (c.phone || '').replace(/\D/g, '');
        if (nome) porNome.set(nome, c.id);
        if (tel) porTelefone.set(tel, c.id);
      });

      let vinculadas = 0;
      for (const v of vendasSemCliente) {
        const nome = (v.customer_name || '').trim().toLowerCase();
        const tel = (v.customer_phone || '').replace(/\D/g, '');
        const clienteId = (nome && porNome.get(nome)) || (tel && porTelefone.get(tel));
        if (clienteId) {
          await supabase.from('vendas').update({ cliente_id: clienteId }).eq('id', v.id);
          vinculadas += 1;
        }
      }
      alert(`${vinculadas} de ${vendasSemCliente.length} venda(s) sem cliente foram vinculadas com sucesso (por nome ou telefone igual ao cadastro).`);
    } catch (err: any) {
      console.error('Erro ao vincular vendas:', err);
      alert(`Não foi possível vincular: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setIsLinkingVendas(false);
    }
  };

  useEffect(() => {
    const loadStats = async () => {
      const { data: vendasData } = await supabase.from('vendas').select('id, cliente_id, total, down_payment, status, items, created_at').is('deleted_at', null).not('cliente_id', 'is', null);
      const { data: produtosData } = await supabase.from('produtos').select('id, cost_price');
      const costMap: Record<string, number> = {};
      (produtosData || []).forEach((p: any) => { costMap[p.id] = Number(p.cost_price) || 0; });
      setProdutosCostMap(costMap);

      const stats: Record<string, { lastDate: string; count: number; total: number; pago: number; pendente: number; custoTotal: number }> = {};
      const vendasPorCliente: Record<string, any[]> = {};
      (vendasData || []).forEach((v: any) => {
        if (!v.cliente_id) return;
        if (!stats[v.cliente_id]) stats[v.cliente_id] = { lastDate: v.created_at, count: 0, total: 0, pago: 0, pendente: 0, custoTotal: 0 };
        const s = stats[v.cliente_id];
        const total = Number(v.total) || 0;
        const down = v.down_payment !== null ? Number(v.down_payment) : (v.status === 'completed' ? total : 0);
        const isFullyPaid = v.status === 'completed' || down >= total;
        s.count += 1;
        s.total += total;
        s.pago += isFullyPaid ? total : down;
        s.pendente += Math.max(0, total - down);
        (v.items || []).forEach((item: any) => {
          const custoUnit = costMap[item.productId] || 0;
          s.custoTotal += custoUnit * (item.area ? item.area * item.quantity : item.quantity);
        });
        if (new Date(v.created_at) > new Date(s.lastDate)) s.lastDate = v.created_at;

        if (!vendasPorCliente[v.cliente_id]) vendasPorCliente[v.cliente_id] = [];
        vendasPorCliente[v.cliente_id].push({
          id: v.id, total, down, isFullyPaid, status: v.status, createdAt: v.created_at,
          itemsSummary: (v.items || []).map((i: any) => i.name).join(', ') || 'Sem itens',
        });
      });
      Object.values(vendasPorCliente).forEach(list => list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setClienteVendas(vendasPorCliente);
      setClienteStats(stats);
    };
    loadStats();
  }, []);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const rows = parseClientesXlsx(buffer);
      if (rows.length === 0) {
        alert('Nenhum cliente válido encontrado na planilha. Confira se o modelo de colunas está correto.');
        return;
      }

      // Busca os clientes ja cadastrados pra decidir Atualizar (mesmo CPF/CNPJ ou telefone) x Cadastrar novo
      const { data: existentes } = await supabase.from('clientes').select('id, phone, cpf_cnpj');
      const porCpf = new Map<string, string>();
      const porTelefone = new Map<string, string>();
      (existentes || []).forEach((c: any) => {
        const cpf = (c.cpf_cnpj || '').replace(/\D/g, '');
        const tel = (c.phone || '').replace(/\D/g, '');
        if (cpf) porCpf.set(cpf, c.id);
        if (tel) porTelefone.set(tel, c.id);
      });

      const paraInserir: any[] = [];
      const paraAtualizar: { id: string; row: any }[] = [];
      for (const row of rows) {
        const cpf = (row.cpf_cnpj || '').replace(/\D/g, '');
        const tel = (row.phone || '').replace(/\D/g, '');
        const idExistente = (cpf && porCpf.get(cpf)) || (tel && porTelefone.get(tel));
        if (idExistente) {
          paraAtualizar.push({ id: idExistente, row });
        } else {
          paraInserir.push(row);
        }
      }

      const falhas: string[] = [];
      let novos = 0, atualizados = 0;

      const batchSize = 200;
      for (let i = 0; i < paraInserir.length; i += batchSize) {
        const slice = paraInserir.slice(i, i + batchSize);
        const { error } = await supabase.from('clientes').insert(slice);
        if (!error) {
          novos += slice.length;
        } else {
          for (const row of slice) {
            const { error: rowError } = await supabase.from('clientes').insert(row);
            if (rowError) falhas.push(`${row.full_name || 'sem nome'}: ${rowError.message}`);
            else novos += 1;
          }
        }
      }
      for (const { id, row } of paraAtualizar) {
        const { error } = await supabase.from('clientes').update(row).eq('id', id);
        if (error) falhas.push(`${row.full_name || 'sem nome'}: ${error.message}`);
        else atualizados += 1;
      }

      if (falhas.length > 0) {
        alert(`${novos} novo(s) cadastrado(s), ${atualizados} atualizado(s).\n\n${falhas.length} cliente(s) NÃO foram importados:\n${falhas.slice(0, 10).join('\n')}${falhas.length > 10 ? `\n... e mais ${falhas.length - 10}` : ''}`);
      } else {
        alert(`${novos} cliente(s) novo(s) cadastrado(s) e ${atualizados} atualizado(s)!`);
      }
    } catch (err: any) {
      console.error('Erro ao importar clientes:', err);
      alert(`Não foi possível importar: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.from('clientes').select('*').order('full_name', { ascending: true });
      if (!active) return;
      if (error) { console.error('Erro ao carregar clientes:', error); setLoading(false); return; }
      setClientes(data || []);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel('clientes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [currentCompany]);

  const handleSave = async () => {
    if (!formData.full_name.trim()) return;
    try {
      const { error } = await supabase.from('clientes').insert({
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email,
        cpf_cnpj: formData.cpf_cnpj,
        city: formData.city,
        state: formData.state,
      });
      if (error) throw error;
      setIsModalOpen(false);
      setFormData({ full_name: '', phone: '', email: '', cpf_cnpj: '', city: '', state: '' });
    } catch (err) {
      console.error(err);
      alert('Não foi possível salvar o cliente.');
    }
  };

  const columns = [
    { key: 'full_name', label: 'Nome', render: (v: string) => <span className="font-bold text-white">{v}</span> },
    { key: 'phone', label: 'WhatsApp', render: (v: string) => v ? (
        <button
          onClick={(e: any) => { e.stopPropagation(); window.open(`https://wa.me/${v.replace(/\D/g, '')}`, '_blank'); }}
          className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold"
        >
          <MessageSquare size={13} /> {v}
        </button>
      ) : <span className="text-white/20">—</span>
    },
    { key: 'ultimo', label: 'Último Pedido/Serviço', render: (_: any, row: any) => {
        const s = clienteStats[row.id];
        return s ? <span className="text-white/60 text-xs">{safeFormat(s.lastDate, 'dd/MM/yyyy')}</span> : <span className="text-white/20 text-xs">—</span>;
      }
    },
    { key: 'exibir', label: '', render: (_: any, row: any) => (
        <Button variant="secondary" size="sm" onClick={(e: any) => { e.stopPropagation?.(); setFichaCliente(row); }}>Exibir</Button>
      )
    },
  ];

  if (loading && clientes.length === 0) return (
    <div className="h-96 flex items-center justify-center">
       <RefreshCw className="animate-spin text-primary-500" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <SectionHeader
        title="Base de Contatos"
        subtitle="Gestão unificada de clientes"
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
            <button
              disabled={isImporting}
              title={isImporting ? 'Importando...' : 'Importar Planilha'}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-primary-400 hover:border-primary-500/20 transition-all disabled:opacity-50"
            >
              <Upload size={14} className={cn(isImporting && "animate-pulse")} />
            </button>
            <button
              title="Exportar Planilha"
              onClick={() => exportClientesXlsx(clientes)}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-primary-400 hover:border-primary-500/20 transition-all"
            >
              <Download size={14} />
            </button>
            <button
              disabled={isLinkingVendas}
              title="Vincular vendas importadas aos clientes cadastrados (por nome/telefone)"
              onClick={handleLinkVendasToClientes}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-primary-400 hover:border-primary-500/20 transition-all disabled:opacity-50"
            >
              <Link2 size={14} className={cn(isLinkingVendas && "animate-pulse")} />
            </button>
            <Button icon={Plus} onClick={() => setIsModalOpen(true)}>Novo Cliente</Button>
          </div>
        }
      />
      <div className="flex items-center gap-2 flex-wrap">
         <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
            <input
              value={clienteSearchTerm}
              onChange={(e) => setClienteSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome ou telefone..."
              className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary-500"
            />
         </div>
         <select
           value={clienteSortBy}
           onChange={(e) => setClienteSortBy(e.target.value as any)}
           className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-[10px] font-black uppercase text-white/70 focus:outline-none focus:border-primary-500 cursor-pointer"
         >
           <option value="nome" className="bg-slate-900">Ordem Alfabética (Nome)</option>
           <option value="data" className="bg-slate-900">Data de Cadastro</option>
           <option value="valor" className="bg-slate-900">Maior Valor Comprado</option>
           <option value="servicos" className="bg-slate-900">Mais Serviços/Pedidos</option>
         </select>
         {clienteLetraAtiva && (
           <button onClick={() => setClienteLetraAtiva(null)} className="h-10 px-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-300 text-[10px] font-black uppercase flex items-center gap-1.5">
             Letra "{clienteLetraAtiva}" <X size={12} />
           </button>
         )}
         <span className="text-[10px] text-white/30 font-bold uppercase">{filteredSortedClientes.length} cliente(s)</span>
      </div>

      <div className="flex gap-3">
         <GlassCard className="p-4 border-white/5 bg-white/[0.02] flex-1 min-w-0">
            <div className="max-h-[65vh] overflow-y-auto custom-scrollbar space-y-1.5">
               {filteredSortedClientes.map(c => {
                  const s = c._stats;
                  return (
                    <div
                      key={c.id}
                      ref={(el) => { clienteRowRefs.current[c.id] = el; }}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                    >
                       <div className="min-w-0 flex-1">
                          <p className="font-bold text-white truncate">{c.full_name}</p>
                          {s && <p className="text-[9px] text-white/30">{s.count} pedido(s) · R$ {s.total.toFixed(2).replace('.', ',')}</p>}
                       </div>
                       {c.phone ? (
                         <button
                           onClick={() => window.open(`https://wa.me/${c.phone.replace(/\D/g, '')}`, '_blank')}
                           className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold text-xs shrink-0"
                         >
                           <MessageSquare size={13} /> {c.phone}
                         </button>
                       ) : <span className="text-white/20 text-xs shrink-0">—</span>}
                       <span className="text-white/40 text-[10px] shrink-0 hidden sm:block w-20 text-right">{s ? safeFormat(s.lastDate, 'dd/MM/yyyy') : '—'}</span>
                       <Button variant="secondary" size="sm" onClick={() => setFichaCliente(c)} className="shrink-0">Exibir</Button>
                    </div>
                  );
               })}
               {filteredSortedClientes.length === 0 && (
                 <p className="text-center text-xs text-white/30 py-10">Nenhum cliente encontrado.</p>
               )}
            </div>
         </GlassCard>

         {/* Barra lateral A-Z */}
         <div className="hidden md:flex flex-col gap-0.5 shrink-0 bg-white/[0.02] border border-white/5 rounded-2xl p-1.5 h-fit sticky top-0">
            {alfabeto.map(letra => (
              <button
                key={letra}
                disabled={!letrasDisponiveis.has(letra)}
                onClick={() => scrollToLetra(letra)}
                className={cn(
                  "w-6 h-5 rounded text-[9px] font-black transition-all",
                  letrasDisponiveis.has(letra) ? "text-white/50 hover:bg-primary-500 hover:text-slate-900" : "text-white/10 cursor-not-allowed"
                )}
              >
                {letra}
              </button>
            ))}
         </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="NOVO CLIENTE">
        <div className="p-6 space-y-4">
          <Input label="NOME COMPLETO" value={formData.full_name} onChange={(e: any) => setFormData({ ...formData, full_name: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="TELEFONE" value={formData.phone} onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })} />
            <Input label="EMAIL" value={formData.email} onChange={(e: any) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="CPF/CNPJ" value={formData.cpf_cnpj} onChange={(e: any) => setFormData({ ...formData, cpf_cnpj: e.target.value })} />
            <Input label="CIDADE" value={formData.city} onChange={(e: any) => setFormData({ ...formData, city: e.target.value })} />
            <Input label="ESTADO" value={formData.state} onChange={(e: any) => setFormData({ ...formData, state: e.target.value })} />
          </div>
          <div className="flex gap-4 pt-4">
            <Button variant="secondary" className="flex-1 h-14" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button className="flex-[2] h-14 bg-primary-500 text-slate-900 border-none shadow-xl shadow-primary-500/20" onClick={handleSave}>Salvar Cliente</Button>
          </div>
        </div>
      </Modal>

      {fichaCliente && (() => {
        const s = clienteStats[fichaCliente.id];
        const lucro = s ? s.total - s.custoTotal : 0;
        return (
          <Modal isOpen={!!fichaCliente} onClose={() => setFichaCliente(null)} title="Ficha do Cliente" size="md">
            <div className="space-y-5 p-2">
               <div>
                  <h3 className="text-xl font-black text-white italic">{fichaCliente.full_name}</h3>
                  {fichaCliente.phone && (
                    <button
                      onClick={() => window.open(`https://wa.me/${fichaCliente.phone.replace(/\D/g, '')}`, '_blank')}
                      className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold text-sm mt-1"
                    >
                      <MessageSquare size={14} /> {fichaCliente.phone}
                    </button>
                  )}
               </div>

               <div className="grid grid-cols-2 gap-3 text-xs">
                  {fichaCliente.email && <div><p className="text-white/30 uppercase font-bold text-[9px]">E-mail</p><p className="text-white">{fichaCliente.email}</p></div>}
                  {fichaCliente.cpf_cnpj && <div><p className="text-white/30 uppercase font-bold text-[9px]">CPF/CNPJ</p><p className="text-white">{fichaCliente.cpf_cnpj}</p></div>}
                  {fichaCliente.city && <div><p className="text-white/30 uppercase font-bold text-[9px]">Cidade</p><p className="text-white">{fichaCliente.city}{fichaCliente.state ? ` - ${fichaCliente.state}` : ''}</p></div>}
               </div>

               <div className="h-px bg-white/10" />

               {s ? (
                 <>
                   <div className="flex items-center justify-between">
                      <p className="text-[9px] font-black uppercase text-white/40">Serviços Feitos ({s.count})</p>
                      <button
                        onClick={() => { onViewHistoryForClient?.(fichaCliente.id, fichaCliente.full_name); setFichaCliente(null); }}
                        className="text-[9px] font-black uppercase text-primary-400 hover:text-primary-300 flex items-center gap-1"
                      >
                        Ver no Histórico <ChevronRight size={12} />
                      </button>
                   </div>
                   <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                      {(clienteVendas[fichaCliente.id] || []).slice(0, 10).map(v => (
                        <div key={v.id} className="flex items-center justify-between gap-2 bg-white/5 border border-white/5 rounded-lg px-3 py-2">
                           <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold text-white truncate">{v.itemsSummary}</p>
                              <p className="text-[9px] text-white/30">{safeFormat(v.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                           </div>
                           <div className="text-right shrink-0">
                              <p className="text-[10px] font-black text-white">R$ {v.total.toFixed(2).replace('.', ',')}</p>
                              <p className={cn("text-[8px] font-black uppercase", v.isFullyPaid ? "text-emerald-400" : "text-amber-400")}>{v.isFullyPaid ? 'Pago' : 'Pendente'}</p>
                           </div>
                        </div>
                      ))}
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                         <p className="text-[9px] font-black uppercase text-white/40">Faturamento Total</p>
                         <p className="text-lg font-black text-white">R$ {s.total.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                         <p className="text-[9px] font-black uppercase text-white/40">Lucro Total</p>
                         <p className="text-lg font-black text-emerald-400">R$ {lucro.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                         <p className="text-[9px] font-black uppercase text-emerald-400/70">Valor Líquido Recebido</p>
                         <p className="text-lg font-black text-emerald-400">R$ {s.pago.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
                         <p className="text-[9px] font-black uppercase text-amber-400/70">Valores Pendentes</p>
                         <p className="text-lg font-black text-amber-400">R$ {s.pendente.toFixed(2).replace('.', ',')}</p>
                      </div>
                   </div>
                 </>
               ) : (
                 <p className="text-center text-xs text-white/30 py-6">Esse cliente ainda não tem pedidos/serviços registrados.</p>
               )}

               {fichaCliente.notes && (
                 <div>
                    <p className="text-[9px] font-black uppercase text-white/40 mb-1">Observações</p>
                    <p className="text-xs text-white/60 bg-white/5 rounded-xl p-3 border border-white/5">{fichaCliente.notes}</p>
                 </div>
               )}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

// --- SERVICES ---
export const ServicesModule = ({ currentCompany }: { currentCompany: Company | null }) => {
  const [subTab, setSubTab] = useState<'os_list' | 'contract_flow'>('os_list');
  const [services, setServices] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    client: '',
    phone: '',
    serviceDesc: '',
    totalValue: 0,
    downPaymentValue: 0,
    priority: 'normal'
  });

  useEffect(() => {
    if (!currentCompany) return;
    const q = query(
      collection(db, 'services'),
      where('companyId', '==', currentCompany.id),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [currentCompany]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'services', id), { status: newStatus });
    } catch (e) {
      console.error('Erro ao atualizar status do serviço:', e);
    }
  };

  const handleSaveService = async () => {
    if (!currentCompany || !formData.client || !formData.serviceDesc) return;
    try {
      const isPending = formData.downPaymentValue < formData.totalValue;

      // 1. Create sale order so it counts in faturamento/revenue instantly
      const { data: vendaRow, error: vendaErr } = await supabase.from('vendas').insert({
        customer_name: formData.client,
        items: [{
          productId: 'manual',
          name: formData.serviceDesc.toUpperCase(),
          price: formData.totalValue,
          quantity: 1
        }],
        total: formData.totalValue,
        down_payment: formData.downPaymentValue > 0 ? formData.downPaymentValue : formData.totalValue,
        payment_method: 'pix',
        status: isPending ? 'pending' : 'completed',
      }).select().single();
      if (vendaErr) throw vendaErr;
      const orderId = vendaRow.id;

      // 2. Create the associated service document
      await addDoc(collection(db, 'services'), {
        companyId: currentCompany.id,
        orderId: orderId,
        client: formData.client,
        phone: formData.phone || '',
        service: formData.serviceDesc,
        status: 'pendente',
        priority: formData.priority,
        total: formData.totalValue,
        balance: Math.max(0, formData.totalValue - formData.downPaymentValue),
        createdAt: Timestamp.now()
      });

      setIsModalOpen(false);
      setFormData({ client: '', phone: '', serviceDesc: '', totalValue: 0, downPaymentValue: 0, priority: 'normal' });
    } catch (e) {
      console.error('Erro ao criar serviço manual:', e);
    }
  };

  const columns = [
    { key: 'orderId', label: 'OS / Pedido', render: (v: string) => <span className="font-mono text-[10px] opacity-40">#{v?.slice(-6) || 'MNL'}</span> },
    { key: 'client', label: 'Cliente' },
    { key: 'phone', label: 'Contato', render: (v: string) => <span className="font-mono text-xs opacity-60">{v || 'Sem contato'}</span> },
    { key: 'service', label: 'Serviço' },
    { key: 'total', label: 'Valor', render: (v: number) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { key: 'balance', label: 'Saldo Devedor', render: (v: number) => (
      <span className={v > 0 ? "text-rose-400 font-extrabold" : "text-emerald-400 font-extrabold"}>
        {v > 0 ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'PAGO'}
      </span>
    )},
    { key: 'status', label: 'Status', render: (v: string) => (
      <Badge 
        variant={v === 'producao' ? 'primary' : v === 'pendente' ? 'warning' : v === 'pronto' ? 'warning' : 'success'}
        className={cn(
          "uppercase text-[9px] font-black tracking-wider",
          v === 'pronto' && "bg-amber-500/10 text-amber-400 border-amber-500/20"
        )}
      >
        {v === 'producao' ? 'Em Produção' : v === 'pendente' ? 'Aguardando' : v === 'pronto' ? 'Pronto p/ Retirada' : 'Retirado'}
      </Badge>
    )},
    { key: 'createdAt', label: 'Data', render: (v: any) => v?.toDate ? format(v.toDate(), 'dd/MM HH:mm') : 'Agora' },
    { key: 'id', label: 'Evolução / Retirada', render: (id: string, row: any) => (
      <div className="flex gap-2">
        {row.status === 'pendente' && (
          <Button size="sm" variant="outline" className="text-[8px] h-7 px-2 uppercase font-black tracking-widest text-[#4cc9f0] border-[#4cc9f0]/20 hover:bg-[#4cc9f0]/10" onClick={() => handleUpdateStatus(row.id, 'producao')}>Produzir</Button>
        )}
        {row.status === 'producao' && (
          <Button size="sm" variant="outline" className="text-[8px] h-7 px-2 uppercase font-black tracking-widest text-amber-400 border-amber-500/20 hover:bg-amber-500/10" onClick={() => handleUpdateStatus(row.id, 'pronto')}>Pronto</Button>
        )}
        {row.status === 'pronto' && (
          <Button size="sm" className="text-[8px] h-7 px-2 uppercase font-black tracking-widest bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-none shadow-md" onClick={() => handleUpdateStatus(row.id, 'retirado')}>Marcar Retirada</Button>
        )}
        {row.status === 'retirado' && (
          <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1 uppercase tracking-widest">
            ● Retirada Concluída
          </span>
        )}
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      <div className="flex bg-white/5 p-2 gap-2 border border-white/10 rounded-2xl w-fit">
        <button
          onClick={() => setSubTab('os_list')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
            subTab === 'os_list' ? "bg-primary-500 text-slate-950 shadow-lg" : "text-white/40 hover:text-white"
          )}
        >
          Ordens de Serviço & Retirada
        </button>
        <button
          onClick={() => setSubTab('contract_flow')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer",
            subTab === 'contract_flow' ? "bg-primary-500 text-slate-950 shadow-lg" : "text-white/40 hover:text-white"
          )}
        >
          <FileText size={14} />
          Contratos & Aprovação WhatsApp (Rafa Art)
        </button>
      </div>

      {subTab === 'os_list' ? (
        <>
          <GenericListView 
            title="Gestão de Serviços" 
            subtitle="Ordens de Serviço e Retirada de Mercadorias (Gráfica)" 
            columns={columns} 
            data={services} 
            onAdd={() => setIsModalOpen(true)}
          />

          {/* Manual Service Creator Modal */}
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="LANÇAR NOVO SERVIÇO / OS MANUAL">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input label="NOME DO CLIENTE" value={formData.client} onChange={(e: any) => setFormData({...formData, client: e.target.value})} />
                </div>
                <Input label="TELEFONE / CONTATO" value={formData.phone} placeholder="(00) 00000-0000" onChange={(e: any) => setFormData({...formData, phone: e.target.value})} />
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Prioridade</p>
                  <select 
                    value={formData.priority} 
                    onChange={(e: any) => setFormData({...formData, priority: e.target.value})}
                    className="w-full h-11 bg-[#1a2333] border border-white/10 rounded-xl px-4 text-xs font-semibold text-white outline-none focus:border-primary-500"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Crítica / Urgente</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Input label="DESCRIÇÃO DO SERVIÇO" value={formData.serviceDesc} placeholder="EX: BANNER IMPRESSO 1X1M ILHÓS" onChange={(e: any) => setFormData({...formData, serviceDesc: e.target.value})} />
                </div>
                <Input label="VALOR TOTAL (R$)" type="number" value={formData.totalValue} onChange={(e: any) => setFormData({...formData, totalValue: Number(e.target.value)})} />
                <Input label="VALOR DE ENTRADA / SINAL PAGO (R$)" type="number" value={formData.downPaymentValue} onChange={(e: any) => setFormData({...formData, downPaymentValue: Number(e.target.value)})} />
              </div>
              <div className="flex gap-4 pt-4">
                <Button variant="secondary" className="flex-1 h-14" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button className="flex-[2] h-14 bg-primary-500 text-slate-900 border-none shadow-xl shadow-primary-500/20 font-black tracking-wider" onClick={handleSaveService}>Lançar OS & Registrar Entrada</Button>
              </div>
            </div>
          </Modal>
        </>
      ) : (
        <ContractApprovalModule currentCompany={currentCompany} />
      )}
    </div>
  );
};

// --- INVENTORY ---
// Modal de cadastro/edicao de produto — COMPONENTE UNICO usado tanto no Estoque quanto no Terminal de Venda,
// pra garantir que "Adicionar Produto" no PDV seja literalmente o mesmo formulario/logica do Estoque.
export const ProdutoFormModal = ({ isOpen, onClose, editingItem, onSaved }: {
  isOpen: boolean;
  onClose: () => void;
  editingItem: InventoryItem | null;
  onSaved: (savedRow: any) => void;
}) => {
  const emptyForm: Partial<InventoryItem> = {
    name: '', code: '', category: 'substrato', unit: 'un', currentStock: 0, minStock: 0,
    salePrice: 0, costPrice: 0, isActive: true, isService: false,
    tipoItem: 'produto', controlaEstoque: true, estoqueMaximo: 0, localizacao: '', descricao: '', larguraRolo: 0,
  };
  const [formData, setFormData] = useState<Partial<InventoryItem>>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(editingItem ? { ...editingItem } : { ...emptyForm });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingItem]);

  const handleSave = async () => {
    if (!formData.name?.trim()) { alert('Digite o nome do item.'); return; }
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim().toUpperCase(),
        code: formData.code || null,
        category: formData.category || null,
        unit: formData.unit,
        sale_price: formData.salePrice || 0,
        cost_price: formData.costPrice || 0,
        current_stock: formData.currentStock || 0,
        min_stock: formData.minStock || 0,
        is_service: formData.isService || false,
        is_active: formData.isActive !== false,
        tipo_item: formData.tipoItem || 'produto',
        controla_estoque: formData.controlaEstoque !== false,
        estoque_maximo: formData.estoqueMaximo || null,
        localizacao: formData.localizacao || null,
        descricao: formData.descricao || null,
        largura_rolo: formData.larguraRolo || null,
      };
      let saved: any;
      if (editingItem) {
        const { data, error } = await supabase.from('produtos').update(payload).eq('id', editingItem.id).select().single();
        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await supabase.from('produtos').insert(payload).select().single();
        if (error) throw error;
        saved = data;
      }
      onSaved(saved);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar produto:', err);
      alert(`Não foi possível salvar o item: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingItem ? 'EDITAR ITEM' : 'CADASTRO DE INSUMO / PRODUTO'}>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input label="NOME DO ITEM" value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value.toUpperCase() })} className="uppercase" />
          </div>
          <Input label="CÓDIGO INTERNO (SKU)" value={formData.code} onChange={(e: any) => setFormData({ ...formData, code: e.target.value })} />
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">CATEGORIA</p>
            <select className="w-full h-12 bg-[#1a2333] border border-white/10 rounded-xl px-4 text-xs text-white outline-none" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}>
              <option value="substrato">Substrato (Lona/Vinil/Papel)</option>
              <option value="tinta">Tintas / Toners</option>
              <option value="acabamento">Acabamento (Ilhós/Verniz)</option>
              <option value="diversos">Diversos</option>
            </select>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">UNIDADE</p>
            <select className="w-full h-12 bg-[#1a2333] border border-white/10 rounded-xl px-4 text-xs text-white outline-none" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}>
              <option value="un">Unidade (un)</option>
              <option value="kg">Quilograma (kg)</option>
              <option value="m">Metro Linear (m)</option>
              <option value="m2">Metro Quadrado (m2)</option>
              <option value="rolo">Rolo</option>
              <option value="litro">Litro (l)</option>
              <option value="etiqueta">Etiqueta Adesiva (cálculo especial)</option>
            </select>
          </div>
          <Input label="PREÇO DE COMPRA (CUSTO)" type="number" prefix="R$" value={formData.costPrice} onChange={(e: any) => setFormData({ ...formData, costPrice: Number(e.target.value) })} />
          <Input label="PREÇO DE VENDA" type="number" prefix="R$" value={formData.salePrice} onChange={(e: any) => setFormData({ ...formData, salePrice: Number(e.target.value) })} />

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">TIPO DE ITEM</p>
            <select className="w-full h-12 bg-[#1a2333] border border-white/10 rounded-xl px-4 text-xs text-white outline-none" value={formData.tipoItem} onChange={(e) => setFormData({ ...formData, tipoItem: e.target.value as any })}>
              <option value="produto">Produto</option>
              <option value="material">Material</option>
              <option value="servico">Serviço</option>
              <option value="acabamento">Acabamento</option>
              <option value="composto">Produto Composto</option>
            </select>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">CONTROLAR ESTOQUE?</p>
            <div className="flex bg-[#1a2333] p-1 rounded-xl border border-white/10 h-12">
               <button type="button" onClick={() => setFormData({ ...formData, controlaEstoque: true })} className={cn("flex-1 rounded-lg text-xs font-black uppercase transition-all", formData.controlaEstoque !== false ? "bg-primary-500 text-slate-900" : "text-white/40")}>Sim</button>
               <button type="button" onClick={() => setFormData({ ...formData, controlaEstoque: false })} className={cn("flex-1 rounded-lg text-xs font-black uppercase transition-all", formData.controlaEstoque === false ? "bg-primary-500 text-slate-900" : "text-white/40")}>Não</button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">STATUS DO PRODUTO</p>
            <div className="flex bg-[#1a2333] p-1 rounded-xl border border-white/10 h-12">
               <button type="button" onClick={() => setFormData({ ...formData, isActive: true })} className={cn("flex-1 rounded-lg text-xs font-black uppercase transition-all", formData.isActive !== false ? "bg-emerald-500 text-slate-900" : "text-white/40")}>Ativo</button>
               <button type="button" onClick={() => setFormData({ ...formData, isActive: false })} className={cn("flex-1 rounded-lg text-xs font-black uppercase transition-all", formData.isActive === false ? "bg-rose-500 text-white" : "text-white/40")}>Inativo</button>
            </div>
          </div>

          {formData.controlaEstoque !== false && (
            <>
              <Input label="ESTOQUE ATUAL" type="number" value={formData.currentStock} onChange={(e: any) => setFormData({ ...formData, currentStock: Number(e.target.value) })} />
              <Input label="ESTOQUE MÍNIMO (ALERTA)" type="number" value={formData.minStock} onChange={(e: any) => setFormData({ ...formData, minStock: Number(e.target.value) })} />
              <Input label="ESTOQUE MÁXIMO" type="number" value={formData.estoqueMaximo} onChange={(e: any) => setFormData({ ...formData, estoqueMaximo: Number(e.target.value) })} />
              <Input label="LOCALIZAÇÃO" placeholder="Ex: Prateleira A2" value={formData.localizacao} onChange={(e: any) => setFormData({ ...formData, localizacao: e.target.value })} />
            </>
          )}

          {(formData.unit === 'm2' || formData.unit === 'etiqueta') && (
            <div className="md:col-span-2">
              <Input label="LARGURA DO ROLO (m) — usado no cálculo de m²/etiquetas e no PDV" type="number" step="any" placeholder="Ex: 1.02" value={formData.larguraRolo} onChange={(e: any) => setFormData({ ...formData, larguraRolo: Number(e.target.value) })} />
            </div>
          )}

          <div className="md:col-span-2">
             <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">DESCRIÇÃO</p>
             <textarea rows={2} className="w-full bg-[#1a2333] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none resize-none" value={formData.descricao || ''} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-4 pt-4">
           <Button variant="secondary" className="flex-1 h-14" onClick={onClose}>Cancelar</Button>
           <Button disabled={saving} className="flex-[2] h-14 bg-primary-500 text-slate-900 border-none shadow-xl shadow-primary-500/20" onClick={handleSave}>{saving ? 'Salvando...' : (editingItem ? 'Salvar Alterações' : 'Salvar Item')}</Button>
        </div>
      </div>
    </Modal>
  );
};

export const InventoryModule = ({ currentCompany }: { currentCompany: Company | null }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: '',
    category: 'substrato',
    unit: 'un',
    currentStock: 0,
    minStock: 0,
    salePrice: 0,
    costPrice: 0,
    isActive: true,
    isService: false,
    tipoItem: 'produto',
    controlaEstoque: true,
  });

  const loadInventoryItems = async () => {
    const { data, error } = await supabase.from('produtos').select('*').order('name', { ascending: true });
    if (error) { console.error('Erro ao carregar produtos:', error); setLoading(false); return; }
    setItems((data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      category: row.category,
      unit: row.unit,
      salePrice: row.sale_price,
      costPrice: row.cost_price,
      currentStock: row.current_stock,
      minStock: row.min_stock,
      isService: row.is_service,
      isActive: row.is_active,
      provider: row.provider,
      createdAt: row.created_at,
      tipoItem: row.tipo_item || 'produto',
      controlaEstoque: row.controla_estoque !== false,
      larguraRolo: row.largura_rolo ? Number(row.largura_rolo) : undefined,
      estoqueMaximo: row.estoque_maximo ? Number(row.estoque_maximo) : undefined,
      localizacao: row.localizacao,
      descricao: row.descricao,
    } as InventoryItem)));
    setLoading(false);
  };

  useEffect(() => {
    loadInventoryItems();
    const channel = supabase
      .channel('produtos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, loadInventoryItems)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany]);

  const stats = [
    { label: 'Itens Totais', val: items.length, icon: Package, color: 'text-primary-400' },
    { label: 'Estoque Baixo', val: items.filter(i => i.currentStock <= i.minStock).length, icon: AlertCircle, color: 'text-amber-500' },
    { label: 'Valor em Estoque', val: `R$ ${items.reduce((acc, i) => acc + (i.costPrice || 0) * i.currentStock, 0).toLocaleString('pt-BR')}`, icon: Banknote, color: 'text-emerald-400' },
  ];

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [estoqueSortBy, setEstoqueSortByState] = useState<'nome' | 'data' | 'estoque' | 'preco'>(() => {
    const saved = localStorage.getItem('rpro_estoque_sort');
    return (saved === 'nome' || saved === 'data' || saved === 'estoque' || saved === 'preco') ? saved : 'nome';
  });
  const setEstoqueSortBy = (v: 'nome' | 'data' | 'estoque' | 'preco') => {
    setEstoqueSortByState(v);
    localStorage.setItem('rpro_estoque_sort', v);
  };
  const [estoqueSearchTerm, setEstoqueSearchTerm] = useState('');

  const sortedFilteredItems = useMemo(() => {
    let list = items;
    const term = estoqueSearchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(i => (i.name || '').toLowerCase().includes(term) || (i.code || '').toLowerCase().includes(term) || (i.category || '').toLowerCase().includes(term));
    }
    const sorted = [...list];
    switch (estoqueSortBy) {
      case 'data':
        return sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      case 'estoque':
        return sorted.sort((a, b) => (b.currentStock || 0) - (a.currentStock || 0));
      case 'preco':
        return sorted.sort((a, b) => (b.salePrice || 0) - (a.salePrice || 0));
      default:
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }, [items, estoqueSearchTerm, estoqueSortBy]);


  const openEditItem = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!confirm(`Excluir "${item.name}"? Essa ação não pode ser desfeita. Prefira inativar se quiser manter o histórico.`)) return;
    const { error } = await supabase.from('produtos').delete().eq('id', item.id);
    if (error) { alert('Não foi possível excluir. Tente inativar o item em vez de excluir.'); }
  };

  const columns = [
    { key: 'name', label: 'Item / Insumo', render: (v: string, row: InventoryItem) => (
      <div className="flex flex-col">
        <span className="text-[11px] font-bold text-white uppercase italic">{v}</span>
        <span className="text-[9px] text-white/30 uppercase font-black tracking-widest">{row.code || 'S/C'}</span>
      </div>
    )},
    { key: 'category', label: 'Categoria', render: (v: string) => <Badge variant="outline" className="uppercase text-[9px] opacity-60">{v || 'Geral'}</Badge> },
    { key: 'currentStock', label: 'Qtd. Atual', render: (v: number, row: InventoryItem) => (
      <div className="flex items-center gap-2">
        <span className={cn("text-[11px] font-black", v <= (row.minStock || 0) ? "text-amber-500" : "text-white")}>{v} {row.unit}</span>
        {v <= (row.minStock || 0) && <AlertCircle size={12} className="text-amber-500 animate-pulse" />}
      </div>
    )},
    { key: 'salePrice', label: 'Preço Venda', render: (v: number) => <span className="text-[11px]">{`R$ ${v.toLocaleString('pt-BR')}`}</span> },
    { key: 'isActive', label: 'Status', render: (v: boolean) => <Badge variant={v ? 'success' : 'outline'} className="text-[9px]">{v ? 'ATIVO' : 'INATIVO'}</Badge> },
    { key: 'actions', label: 'Ações', render: (_: any, row: InventoryItem) => (
      <div className="flex items-center gap-1.5">
        <button onClick={() => openEditItem(row)} title="Editar" className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20"><Pencil size={13} /></button>
        <button onClick={() => handleDeleteItem(row)} title="Excluir" className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"><Trash2 size={13} /></button>
      </div>
    )},
  ];

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        category: formData.category,
        unit: formData.unit,
        sale_price: formData.salePrice,
        cost_price: formData.costPrice,
        current_stock: formData.currentStock,
        min_stock: formData.minStock,
        is_service: formData.isService,
        is_active: formData.isActive,
        tipo_item: formData.tipoItem || 'produto',
        controla_estoque: formData.controlaEstoque !== false,
        largura_rolo: formData.larguraRolo || null,
        estoque_maximo: formData.estoqueMaximo || null,
        localizacao: formData.localizacao || null,
        descricao: formData.descricao || null,
      };
      let error;
      if (editingItemId) {
        ({ error } = await supabase.from('produtos').update(payload).eq('id', editingItemId));
      } else {
        ({ error } = await supabase.from('produtos').insert(payload));
      }
      if (error) throw error;
      await loadInventoryItems();
      setIsModalOpen(false);
      setEditingItemId(null);
      setFormData({ name: '', category: 'substrato', unit: 'un', currentStock: 0, minStock: 0, salePrice: 0, costPrice: 0, isActive: true, isService: false, tipoItem: 'produto', controlaEstoque: true });
    } catch (err: any) {
      console.error(err);
      alert(`Não foi possível salvar o item: ${err?.message || 'erro desconhecido'}`);
    }
  };

  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [negStockChoice, setNegStockChoice] = useState<'manter' | 'zerar'>('manter');
  const [isConfirmingImport, setIsConfirmingImport] = useState(false);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const rows = parseProdutosXlsx(buffer);
      if (rows.length === 0) {
        alert('Nenhum produto válido encontrado na planilha. Confira se a coluna DESCRIÇÃO está preenchida — é o único campo obrigatório.');
        return;
      }
      setImportPreviewRows(rows);
      setImportFileName(file.name);
      setNegStockChoice('manter');
      setIsImportPreviewOpen(true);
    } catch (err) {
      console.error('Erro ao ler a planilha:', err);
      alert('Não foi possível ler o arquivo. Confira se é um .xlsx válido.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmImportProdutos = async () => {
    setIsConfirmingImport(true);
    try {
      const rows = importPreviewRows.map(r => ({
        ...r,
        current_stock: r.current_stock < 0 && negStockChoice === 'zerar' ? 0 : r.current_stock,
      }));

      // Busca os produtos ja cadastrados pra decidir Atualizar x Cadastrar novo (por Codigo, depois por Nome)
      const { data: existentes } = await supabase.from('produtos').select('id, code, name');
      const porCodigo = new Map<string, string>();
      const porNome = new Map<string, string>();
      (existentes || []).forEach((p: any) => {
        const cod = (p.code || '').toString().trim();
        const nome = (p.name || '').toString().trim().toLowerCase();
        if (cod) porCodigo.set(cod, p.id);
        if (nome) porNome.set(nome, p.id);
      });

      const paraInserir: any[] = [];
      const paraAtualizar: { id: string; row: any }[] = [];
      for (const row of rows) {
        const cod = (row.code || '').toString().trim();
        const nome = (row.name || '').toString().trim().toLowerCase();
        const idExistente = (cod && porCodigo.get(cod)) || (nome && porNome.get(nome));
        if (idExistente) {
          paraAtualizar.push({ id: idExistente, row });
        } else {
          paraInserir.push(row);
        }
      }

      const falhas: string[] = [];
      let novos = 0, atualizados = 0;

      // Insere em lote; se o lote falhar, tenta linha por linha pra nao perder o arquivo inteiro por 1 produto ruim
      const batchSize = 200;
      for (let i = 0; i < paraInserir.length; i += batchSize) {
        const slice = paraInserir.slice(i, i + batchSize);
        const { error } = await supabase.from('produtos').insert(slice);
        if (!error) {
          novos += slice.length;
        } else {
          for (const row of slice) {
            const { error: rowError } = await supabase.from('produtos').insert(row);
            if (rowError) falhas.push(`${row.name || 'sem nome'} (${row.code || 's/código'}): ${rowError.message}`);
            else novos += 1;
          }
        }
      }
      for (const { id, row } of paraAtualizar) {
        const { error } = await supabase.from('produtos').update(row).eq('id', id);
        if (error) falhas.push(`${row.name || 'sem nome'} (${row.code || 's/código'}): ${error.message}`);
        else atualizados += 1;
      }

      setIsImportPreviewOpen(false);
      if (falhas.length > 0) {
        alert(`${novos} novo(s) cadastrado(s), ${atualizados} atualizado(s).\n\n${falhas.length} produto(s) NÃO foram importados:\n${falhas.slice(0, 10).join('\n')}${falhas.length > 10 ? `\n... e mais ${falhas.length - 10}` : ''}`);
      } else {
        alert(`${novos} produto(s) novo(s) cadastrado(s) e ${atualizados} atualizado(s) com sucesso!`);
      }
    } catch (err: any) {
      console.error('Erro ao importar produtos:', err);
      alert(`Não foi possível importar: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setIsConfirmingImport(false);
    }
  };

  if (loading && items.length === 0) return (
    <div className="h-96 flex items-center justify-center">
       <RefreshCw className="animate-spin text-primary-500" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <SectionHeader 
        title="Gestão de Insumos" 
        subtitle="Controle de Estoque e Matéria-Prima (Foco Gráfica)" 
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFile} />
            <button
              disabled={isImporting}
              title={isImporting ? 'Importando...' : 'Importar Planilha'}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-primary-400 hover:border-primary-500/20 transition-all disabled:opacity-50"
            >
              <Upload size={14} className={cn(isImporting && "animate-pulse")} />
            </button>
            <button
              title="Exportar Planilha"
              onClick={() => exportProdutosXlsx(items.map(i => ({ ...i, sale_price: i.salePrice, cost_price: i.costPrice, current_stock: i.currentStock, min_stock: i.minStock })))}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-primary-400 hover:border-primary-500/20 transition-all"
            >
              <Download size={14} />
            </button>
            <Button icon={Plus} onClick={() => { setEditingItemId(null); setFormData({ name: '', category: 'substrato', unit: 'un', currentStock: 0, minStock: 0, salePrice: 0, costPrice: 0, isActive: true, isService: false, tipoItem: 'produto', controlaEstoque: true }); setIsModalOpen(true); }}>Novo Item</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s, i) => (
          <GlassCard key={i} className="p-6 border-white/5 flex items-center gap-6 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-1000" />
            <div className={cn("p-4 rounded-2xl bg-white/5", s.color)}>
              <s.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1">{s.label}</p>
              <h4 className="text-xl font-black text-white">{s.val}</h4>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-4 border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-6 px-4 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <Input icon={Search} placeholder="Filtrar por nome, código ou categoria..." value={estoqueSearchTerm} onChange={(e: any) => setEstoqueSearchTerm(e.target.value.toUpperCase())} className="uppercase" />
          </div>
          <select
            value={estoqueSortBy}
            onChange={(e) => setEstoqueSortBy(e.target.value as any)}
            className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-[10px] font-black uppercase text-white/70 focus:outline-none focus:border-primary-500 cursor-pointer"
          >
            <option value="nome" className="bg-slate-900">Ordem Alfabética (Nome)</option>
            <option value="data" className="bg-slate-900">Data de Cadastro</option>
            <option value="estoque" className="bg-slate-900">Quantidade em Estoque</option>
            <option value="preco" className="bg-slate-900">Preço de Venda</option>
          </select>
        </div>
        <DataTable columns={columns} data={sortedFilteredItems} />
      </GlassCard>

      {isImportPreviewOpen && (() => {
        const semCodigo = importPreviewRows.filter(r => !r.code).length;
        const comNegativo = importPreviewRows.filter(r => r.current_stock < 0);
        return (
          <Modal isOpen={isImportPreviewOpen} onClose={() => setIsImportPreviewOpen(false)} title="Importação de Estoque" size="md">
            <div className="space-y-5">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                 <p className="text-[9px] font-black uppercase text-white/30 tracking-widest">Arquivo</p>
                 <p className="text-sm font-bold text-white truncate">{importFileName}</p>
                 <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
                    <div>
                       <p className="text-[8px] font-black uppercase text-white/30">Produtos</p>
                       <p className="text-lg font-black text-white">{importPreviewRows.length}</p>
                    </div>
                    <div>
                       <p className="text-[8px] font-black uppercase text-white/30">Sem Código</p>
                       <p className="text-lg font-black text-amber-400">{semCodigo}</p>
                    </div>
                    <div>
                       <p className="text-[8px] font-black uppercase text-white/30">Estoque Negativo</p>
                       <p className="text-lg font-black text-rose-400">{comNegativo.length}</p>
                    </div>
                 </div>
              </div>

              {comNegativo.length > 0 && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 space-y-3">
                   <p className="text-xs font-bold text-rose-300">⚠ Existem produtos com estoque negativo. O que fazer?</p>
                   <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar text-[10px] text-white/50">
                      {comNegativo.slice(0, 6).map((r, i) => (
                        <p key={i}>{r.name}: <span className="text-rose-400 font-bold">{r.current_stock}</span></p>
                      ))}
                      {comNegativo.length > 6 && <p className="text-white/30">... e mais {comNegativo.length - 6}</p>}
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => setNegStockChoice('manter')} className={cn("flex-1 h-10 rounded-xl text-[10px] font-black uppercase border-2", negStockChoice === 'manter' ? "bg-rose-500 border-rose-600 text-white" : "bg-white/5 border-white/10 text-white/40")}>Manter Valor Negativo</button>
                      <button onClick={() => setNegStockChoice('zerar')} className={cn("flex-1 h-10 rounded-xl text-[10px] font-black uppercase border-2", negStockChoice === 'zerar' ? "bg-primary-500 border-primary-600 text-slate-900" : "bg-white/5 border-white/10 text-white/40")}>Converter para Zero</button>
                   </div>
                </div>
              )}

              <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1">
                 {importPreviewRows.slice(0, 30).map((r, i) => (
                   <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-[10px]">
                      <span className="text-white truncate flex-1">{r.name}</span>
                      <span className="text-white/30 shrink-0">{r.code || 's/código'}</span>
                      <span className={cn("shrink-0 font-bold", r.current_stock < 0 ? "text-rose-400" : "text-white/50")}>{r.current_stock} {r.unit}</span>
                   </div>
                 ))}
                 {importPreviewRows.length > 30 && <p className="text-[9px] text-white/30 text-center py-1">... e mais {importPreviewRows.length - 30} produto(s)</p>}
              </div>

              <div className="flex justify-end gap-3 pt-1">
                 <Button variant="ghost" onClick={() => setIsImportPreviewOpen(false)}>Cancelar</Button>
                 <Button disabled={isConfirmingImport} onClick={confirmImportProdutos} className="bg-primary-500 text-slate-900 border-none">
                   {isConfirmingImport ? 'Importando...' : 'Confirmar Importação'}
                 </Button>
              </div>
            </div>
          </Modal>
        );
      })()}

      <ProdutoFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItemId(null); }}
        editingItem={editingItemId ? items.find(i => i.id === editingItemId) || null : null}
        onSaved={() => { loadInventoryItems(); setEditingItemId(null); }}
      />
    </div>
  );
};

// --- PRODUCTION ---
export const ProductionModule = ({ currentCompany }: { currentCompany: Company | null }) => {
  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <SectionHeader title="Linha de Produção" subtitle="Status operacional em tempo real" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { id: 'fila', name: 'Fila de Espera', icon: Clock3, color: 'text-white/40' },
          { id: 'proc', name: 'Em Processamento', icon: Zap, color: 'text-primary-300' },
          { id: 'ready', name: 'Finalizado / Entrega', icon: CheckCircle2, color: 'text-emerald-400' },
        ].map(step => (
          <div key={step.id} className="space-y-5">
            <div className="flex items-center gap-3 px-2">
               <step.icon size={18} className={step.color} />
               <h3 className="text-[11px] font-black uppercase tracking-[2px] text-white/50">{step.name}</h3>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 min-h-[400px] flex flex-col gap-4">
               {step.id === 'proc' && (
                 <GlassCard className="p-5 border-primary-500/20 bg-primary-500/5">
                    <p className="font-bold text-white text-sm mb-1">OS #1042 - Banner 1x1m</p>
                    <p className="text-[10px] text-white/30 uppercase font-black mb-4">Rafael Matos</p>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="w-3/4 h-full bg-primary-400" />
                    </div>
                 </GlassCard>
               )}
               <div className="flex flex-col items-center justify-center grow opacity-10">
                  <step.icon size={48} />
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- SETTINGS ---
export const SettingsModule = ({ currentCompany, user }: { currentCompany: Company | null; user: AppUser | null }) => {
  const [activeTab, setActiveTab] = useState('Geral');
  const [logoUrl, setLogoUrl] = useState(currentCompany?.logoUrl || '');
  const [logoLight, setLogoLight] = useState<string | null>(null);
  const [logoDark, setLogoDark] = useState<string | null>(null);
  const [savingLogo, setSavingLogo] = useState<'light' | 'dark' | null>(null);
  const logoLightInputRef = React.useRef<HTMLInputElement>(null);
  const logoDarkInputRef = React.useRef<HTMLInputElement>(null);

  // Sessoes ativas (IP + dispositivo) de todos os usuarios, pra o admin poder desconectar
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  useEffect(() => {
    if (!user?.isAdmin) return;
    const q = query(collection(db, 'sessions'), where('isRevoked', '==', false));
    const unsub = onSnapshot(q, (snap) => {
      const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      // So mostra sessoes com atividade nos ultimos 30 minutos (mais antigas provavelmente ja fecharam a aba)
      const now = Date.now();
      const recent = sessions.filter(s => now - new Date(s.lastSeenAt || s.loginAt).getTime() < 30 * 60 * 1000);
      recent.sort((a, b) => new Date(b.lastSeenAt || b.loginAt).getTime() - new Date(a.lastSeenAt || a.loginAt).getTime());
      setActiveSessions(recent);
    });
    return () => unsub();
  }, [user?.isAdmin]);

  const handleDisconnectSession = async (sessionId: string) => {
    if (!confirm('Desconectar essa sessão agora? A pessoa vai ser deslogada automaticamente.')) return;
    try {
      await updateDoc(doc(db, 'sessions', sessionId), { isRevoked: true });
    } catch (err: any) {
      alert(`Não foi possível desconectar: ${err?.message || 'erro desconhecido'}`);
    }
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('configuracoes').select('logo_light_url, logo_dark_url').eq('company_id', 'rafa-arts').maybeSingle();
      setLogoLight(data?.logo_light_url || null);
      setLogoDark(data?.logo_dark_url || null);
    };
    load();
    const channel = supabase
      .channel('settings-logos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>, variant: 'light' | 'dark') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      alert('A imagem precisa ter no máximo 800KB. Comprima a logo e tente novamente.');
      return;
    }
    setSavingLogo(variant);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const column = variant === 'light' ? 'logo_light_url' : 'logo_dark_url';
      const { error } = await supabase.from('configuracoes').upsert({
        company_id: 'rafa-arts',
        [column]: dataUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' });
      if (error) throw error;
      if (variant === 'light') setLogoLight(dataUrl); else setLogoDark(dataUrl);
    } catch (err) {
      console.error('Erro ao salvar logo:', err);
      alert('Não foi possível salvar a logo.');
    } finally {
      setSavingLogo(null);
    }
  };
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState('');

  // Configuracao PIX (Supabase, sincronizada em tempo real)
  const [pixKey, setPixKey] = useState('');
  const [pixBeneficiary, setPixBeneficiary] = useState('');
  const [pixCity, setPixCity] = useState('Santarem');
  const [pixBank, setPixBank] = useState('');
  const [savingPix, setSavingPix] = useState(false);
  const ALL_PAYMENT_METHODS = [
    { id: 'pix', label: 'Pix' },
    { id: 'dinheiro', label: 'Dinheiro' },
    { id: 'cartao_credito', label: 'Cartão de Crédito' },
    { id: 'cartao_debito', label: 'Cartão de Débito' },
    { id: 'transferencia', label: 'Transferência' },
    { id: 'boleto', label: 'Boleto' },
    { id: 'crediario', label: 'Crediário' },
  ];
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<string[]>(['pix', 'dinheiro', 'cartao_credito', 'cartao_debito']);
  const [savingPaymentMethods, setSavingPaymentMethods] = useState(false);
  const [creditCardFees, setCreditCardFees] = useState<{ installments: number; feePercent: number }[]>(
    Array.from({ length: 12 }, (_, i) => ({ installments: i + 1, feePercent: 0 }))
  );
  const [debitCardFeePercent, setDebitCardFeePercent] = useState(0);
  const [savingCardFees, setSavingCardFees] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('configuracoes').select('*').eq('company_id', 'rafa-arts').maybeSingle();
      if (data) {
        setPixKey(data.pix_key || '');
        setPixBeneficiary(data.beneficiary_name || currentCompany?.name || '');
        setPixCity(data.city || 'Santarem');
        setPixBank(data.pix_bank || '');
        setEnabledPaymentMethods(Array.isArray(data.enabled_payment_methods) && data.enabled_payment_methods.length > 0 ? data.enabled_payment_methods : ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito']);
        if (Array.isArray(data.credit_card_fees) && data.credit_card_fees.length > 0) {
          const byInstallment: Record<number, number> = {};
          data.credit_card_fees.forEach((f: any) => { byInstallment[f.installments] = f.feePercent; });
          setCreditCardFees(Array.from({ length: 12 }, (_, i) => ({ installments: i + 1, feePercent: byInstallment[i + 1] ?? 0 })));
        }
        setDebitCardFeePercent(Number(data.debit_card_fee_percent) || 0);
      } else if (currentCompany?.name) {
        setPixBeneficiary(currentCompany.name);
      }
    };
    load();
    const channel = supabase
      .channel('configuracoes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany]);

  const togglePaymentMethodEnabled = (id: string) => {
    setEnabledPaymentMethods(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleSavePaymentMethods = async () => {
    if (enabledPaymentMethods.length === 0) {
      alert('Deixe pelo menos uma forma de pagamento habilitada.');
      return;
    }
    setSavingPaymentMethods(true);
    try {
      const { error } = await supabase.from('configuracoes').upsert({
        company_id: 'rafa-arts',
        enabled_payment_methods: enabledPaymentMethods,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' });
      if (error) throw error;
    } catch (err) {
      console.error('Erro ao salvar formas de pagamento:', err);
      alert('Não foi possível salvar.');
    } finally {
      setSavingPaymentMethods(false);
    }
  };

  const updateCreditCardFee = (installments: number, feePercent: number) => {
    setCreditCardFees(prev => prev.map(f => f.installments === installments ? { ...f, feePercent } : f));
  };

  const handleSaveCreditCardFees = async () => {
    setSavingCardFees(true);
    try {
      const { error } = await supabase.from('configuracoes').upsert({
        company_id: 'rafa-arts',
        credit_card_fees: creditCardFees,
        debit_card_fee_percent: debitCardFeePercent,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' });
      if (error) throw error;
    } catch (err: any) {
      console.error('Erro ao salvar taxas de cartão:', err);
      alert(`Não foi possível salvar: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setSavingCardFees(false);
    }
  };

  const handleSavePixConfig = async () => {
    setSavingPix(true);
    try {
      const { error } = await supabase.from('configuracoes').upsert({
        company_id: 'rafa-arts',
        pix_key: pixKey,
        beneficiary_name: pixBeneficiary,
        city: pixCity,
        pix_bank: pixBank,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' });
      if (error) throw error;
    } catch (err: any) {
      console.error('Erro ao salvar configuração PIX:', err);
      alert(`Não foi possível salvar a configuração PIX: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setSavingPix(false);
    }
  };

  // User Management State
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const { simulatedUserId, setSimulatedUserId, theme, setTheme } = React.useContext(AppContext)!;
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPassword, setEditedPassword] = useState('');
  const [editedRole, setEditedRole] = useState<'admin' | 'gerente' | 'atendente' | 'caixa' | 'vendedor' | 'designer' | 'operador'>('atendente');
  const [editedTabs, setEditedTabs] = useState<string[]>([]);
  const [editedActions, setEditedActions] = useState<string[]>([]);

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'gerente' | 'atendente' | 'caixa' | 'vendedor' | 'designer' | 'operador'>('atendente');

  useEffect(() => {
    if (!currentCompany) return;
    const q = query(collection(db, 'funnels'), where('companyId', '==', currentCompany.id));
    getDocs(q).then(snap => {
      setFunnels(snap.docs.map(d => ({ id: d.id, ...d.data() } as Funnel)));
    });
  }, [currentCompany]);

  useEffect(() => {
    // Lista combinada: admin master fica no Firebase, usuarios comuns vivem no Supabase
    let firebaseUsers: AppUser[] = [];
    let supabaseUsers: AppUser[] = [];
    const merge = () => setUsersList([...firebaseUsers, ...supabaseUsers]);

    const q = query(collection(db, 'users'));
    const unsubFirebase = onSnapshot(q, (snap) => {
      firebaseUsers = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser));
      merge();
    });

    const loadSupabaseUsers = async () => {
      const { data } = await supabase.from('usuarios').select('*').order('name', { ascending: true });
      supabaseUsers = (data || []).map(mapUsuarioRow);
      merge();
    };
    loadSupabaseUsers();
    const channel = supabase
      .channel('usuarios-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, loadSupabaseUsers)
      .subscribe();

    return () => { unsubFirebase(); supabase.removeChannel(channel); };
  }, []);

  const handleSave = async () => {
    if (!currentCompany) return;
    try {
      await updateDoc(doc(db, 'companies', currentCompany.id), {
        logoUrl,
        updatedAt: Timestamp.now()
      });
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error(err);
    }
  };

  const startEditUser = (u: AppUser) => {
    setEditingUser(u);
    setEditedName(u.name);
    setEditedEmail(u.email);
    setEditedPassword(u.password || '');
    setEditedRole(u.role as any || 'atendente');
    setEditedTabs(u.allowedTabs || ['dashboard', 'crm', 'messages', 'pos', 'contacts', 'production', 'settings']);
    setEditedActions(u.allowedActions || [
      'canStartNote', 'canSendSavedMessage', 'canCreateCard', 'canAddTask',
      'canStartPosSale', 'canStartRealEstateSale', 'canMoveLead',
      'canViewCustomerData', 'canViewAttachments', 'canTranscribeAudio'
    ]);
  };

  const handleSaveUserPermissions = async () => {
    if (!editingUser) return;
    try {
      if (editingUser.id === 'admin-rafael') {
        // Admin master continua no Firebase
        await updateDoc(doc(db, 'users', editingUser.id), {
          name: editedName,
          email: editedEmail,
          ...(editedPassword ? { password: editedPassword } : {}),
          role: editedRole,
          allowedTabs: editedTabs,
          allowedActions: editedActions,
          updatedAt: Timestamp.now()
        });
      } else {
        // Usuarios comuns vivem no Supabase
        const { error } = await supabase.from('usuarios').update({
          name: editedName,
          email: editedEmail,
          ...(editedPassword ? { password: editedPassword } : {}),
          role: editedRole,
          allowed_tabs: editedTabs,
          allowed_actions: editedActions,
          updated_at: new Date().toISOString(),
        }).eq('id', editingUser.id);
        if (error) throw error;
      }
      alert('Dados e senha do usuário atualizados!');
      setEditingUser(null);
    } catch (err: any) {
      console.error('Erro ao salvar permissões:', err);
      alert(`Erro ao salvar permissões do usuário: ${err?.message || 'erro desconhecido'}`);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail) {
      alert('Por favor, preencha o nome e o e-mail.');
      return;
    }
    try {
      const defaultTabs = ['dashboard', 'crm', 'messages', 'pos', 'contacts', 'production', 'settings'];
      const defaultActions = [
        'canStartNote', 'canSendSavedMessage', 'canCreateCard', 'canAddTask',
        'canStartPosSale', 'canStartRealEstateSale', 'canMoveLead',
        'canViewCustomerData', 'canViewAttachments', 'canTranscribeAudio'
      ];

      const { error } = await supabase.from('usuarios').insert({
        name: newUserName,
        email: newUserEmail.trim().toLowerCase(),
        password: newUserPassword || '123456',
        role: newUserRole,
        is_admin: newUserRole === 'admin',
        is_active: true,
        allowed_tabs: defaultTabs,
        allowed_actions: defaultActions,
      });
      if (error) throw error;

      alert(`Novo usuário [${newUserName}] cadastrado com sucesso!\n\nE-mail: ${newUserEmail}\nSenha: ${newUserPassword || '123456'}\n\nEle já pode fazer login na tela inicial com essas credenciais.`);
      setIsCreateModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('atendente');
    } catch (err: any) {
      console.error('Erro ao criar usuário:', err);
      alert(`Erro ao criar usuário no repositório: ${err?.message || 'erro desconhecido'}`);
    }
  };

  const tabOptions = [
    { id: 'dashboard', label: 'Dashboard', desc: 'Painel de controle e faturamento consolidado' },
    { id: 'crm', label: 'Funil CRM', desc: 'Criação e movimentação de Leads / Contatos comerciais' },
    { id: 'messages', label: 'Mensagens / Chats', desc: 'Canal de atendimento direto integrado' },
    { id: 'pos', label: 'PDV Gráfica', desc: 'Faturamento rápido, caixa e vendas' },
    { id: 'contacts', label: 'Contatos', desc: 'Gestão de clientes e histórico de compras' },
    { id: 'production', label: 'Produção', desc: 'Fila de fabricação e acabamentos gráficos' },
    { id: 'settings', label: 'Opções', desc: 'Parâmetro de configurações do Rafa Arts Graphics' },
  ];

  const actionOptions = [
    { id: 'canStartNote', label: 'Criar Notas Internas', desc: 'Habilita o registro de notas internas no módulo de conversas' },
    { id: 'canSendSavedMessage', label: 'Enviar Mensagens Prontas', desc: 'Permite responder rapidamente usando atalhos de chat' },
    { id: 'canCreateCard', label: 'Criar Leads no CRM', desc: 'Permite criar novos cards de clientes no funil comercial' },
    { id: 'canAddTask', label: 'Pode Criar Tarefas', desc: 'Gestão de agenda, lembretes e agendamentos de leads' },
    { id: 'canStartPosSale', label: 'Iniciar Venda no PDV', desc: 'Permite registrar faturamento e receber pagamentos' },
    { id: 'canManageContracts', label: 'Gerenciar Contratos e Orçamentos', desc: 'Permite criar e aprovar contratos de prestação de serviços' },
    { id: 'canMoveLead', label: 'Movimentar Leads', desc: 'Permite arrastar leads entre as colunas do funil CRM' },
    { id: 'canViewCustomerData', label: 'Ver Dados do Cliente', desc: 'Habilita visualização de CPF, RG e endereços de clientes' },
    { id: 'canViewAttachments', label: 'Visualizar Mídias/Anexos', desc: 'Mostra arquivos recebidos e PDFs dentro de conversas' },
    { id: 'canTranscribeAudio', label: 'Transcrever Áudios', desc: 'Habilita conversão automática de voz para texto via IA' },
    { id: 'canManageSaleHistory', label: 'Gerenciar Histórico de Vendas', desc: 'Permite reabrir, editar ou excluir vendas já registradas no PDV' },
    { id: 'canCloseCashRegister', label: 'Fechar Caixa', desc: 'Permite fechar o caixa do PDV (abrir continua restrito ao admin)' },
    { id: 'canAddProduct', label: 'Cadastrar Produto', desc: 'Permite cadastrar um novo produto direto pelo Terminal de Venda' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <SectionHeader 
        title="Configurações Hub" 
        subtitle="Ajustes do ecossistema Rafa Arts Graphics" 
        actions={<Button icon={Save} onClick={handleSave}>Salvar Tudo</Button>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <GlassCard className="p-0 overflow-hidden h-fit border-white/5">
           {['Geral', 'Identidade', 'CRM / Funis', 'Integrações', 'Usuários e Permissões', 'Backup'].map((tab) => (
             <button 
               key={tab} 
               onClick={() => setActiveTab(tab)}
               className={cn(
                 "w-full text-left p-6 text-[10px] font-black uppercase tracking-widest border-b border-white/5 transition-all", 
                 activeTab === tab ? "bg-primary-500 text-slate-900" : "text-white/40 hover:bg-white/5 hover:text-white"
               )}
             >
                {tab}
             </button>
           ))}
        </GlassCard>
        <GlassCard className="lg:col-span-3 p-10 space-y-10 border-white/5">
           {activeTab === 'Geral' && (
             <div className="space-y-8">
                <div className="space-y-6">
                   <h3 className="text-xl font-bold text-white tracking-tight italic uppercase">Informações da Plataforma</h3>
                   <div className="grid grid-cols-2 gap-8">
                     <Input label="Versão do Sistema" defaultValue="9.4.2 Enterprise" disabled />
                     <Input label="ID do Ambiente" defaultValue="SYM-442-PROD" disabled />
                     <Input label="Nome da Empresa" defaultValue={currentCompany?.name} />
                     <Input label="CNPJ" defaultValue={currentCompany?.cnpj} />
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'Identidade' && (
             <div className="space-y-8">
                <div className="space-y-6">
                   <h3 className="text-xl font-bold text-white tracking-tight italic uppercase">Logo da Empresa</h3>
                   <p className="text-xs text-white/40">Envie duas versões: uma clara (para fundos escuros, como o menu e a barra do sistema) e uma escura (para fundos claros, como o recibo). Máximo 800KB por imagem.</p>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Logo Clara */}
                      <div className="space-y-3">
                         <p className="text-[10px] font-black uppercase text-white/50 tracking-widest">Logo Clara (fundo escuro)</p>
                         <div className="flex items-start gap-4">
                            <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center p-2 bg-slate-950 shrink-0">
                               {logoLight ? (
                                 <img src={logoLight} alt="Logo clara" className="w-full h-full object-contain" />
                               ) : (
                                 <ImageIcon size={28} className="text-white/10" />
                               )}
                            </div>
                            <div className="flex-1 space-y-2">
                               <input ref={logoLightInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoFileChange(e, 'light')} />
                               <Button
                                 variant="secondary"
                                 icon={Upload}
                                 disabled={savingLogo === 'light'}
                                 onClick={() => logoLightInputRef.current?.click()}
                                 className="text-[10px] uppercase tracking-wider font-black"
                               >
                                 {savingLogo === 'light' ? 'Enviando...' : 'Enviar Imagem'}
                               </Button>
                               <p className="text-[9px] text-white/30 font-bold uppercase">PNG transparente recomendado</p>
                            </div>
                         </div>
                      </div>

                      {/* Logo Escura */}
                      <div className="space-y-3">
                         <p className="text-[10px] font-black uppercase text-white/50 tracking-widest">Logo Escura (fundo claro)</p>
                         <div className="flex items-start gap-4">
                            <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center p-2 bg-white shrink-0">
                               {logoDark ? (
                                 <img src={logoDark} alt="Logo escura" className="w-full h-full object-contain" />
                               ) : (
                                 <ImageIcon size={28} className="text-slate-300" />
                               )}
                            </div>
                            <div className="flex-1 space-y-2">
                               <input ref={logoDarkInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoFileChange(e, 'dark')} />
                               <Button
                                 variant="secondary"
                                 icon={Upload}
                                 disabled={savingLogo === 'dark'}
                                 onClick={() => logoDarkInputRef.current?.click()}
                                 className="text-[10px] uppercase tracking-wider font-black"
                               >
                                 {savingLogo === 'dark' ? 'Enviando...' : 'Enviar Imagem'}
                               </Button>
                               <p className="text-[9px] text-white/30 font-bold uppercase">Usada nos recibos (PDF/imagem)</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
                <div className="h-px bg-white/10" />
                <div className="space-y-6">
                   <h3 className="text-xl font-bold text-white tracking-tight italic uppercase">Tema do Sistema (Aparência)</h3>
                   <p className="text-xs text-white/50">Escolha o modo de exibição preferido para toda a plataforma:</p>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <button
                        type="button"
                        onClick={() => setTheme?.('dark')}
                        className={cn(
                          "p-6 rounded-3xl border-2 transition-all text-left space-y-3 cursor-pointer relative overflow-hidden",
                          theme === 'dark' ? "border-red-500 bg-slate-900 shadow-2xl ring-2 ring-red-500/20" : "border-white/10 bg-slate-900/40 opacity-70 hover:opacity-100"
                        )}
                      >
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <Moon size={22} className="text-red-400" />
                               <span className="font-black text-white uppercase text-sm">Modo Escuro (Dark)</span>
                            </div>
                            {theme === 'dark' && <Badge variant="primary">Ativo</Badge>}
                         </div>
                         <p className="text-[11px] text-white/50 leading-relaxed">Visual moderno e sofisticado em tom escuro, ideal para baixa iluminação.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTheme?.('light')}
                        className={cn(
                          "p-6 rounded-3xl border-2 transition-all text-left space-y-3 cursor-pointer relative overflow-hidden",
                          theme === 'light' ? "border-red-500 bg-white text-slate-900 shadow-2xl ring-2 ring-red-500/20" : "border-slate-300 bg-slate-100 text-slate-800 opacity-70 hover:opacity-100"
                        )}
                      >
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <Sun size={22} className="text-amber-500" />
                               <span className="font-black uppercase text-sm text-slate-900">Modo Claro (Light)</span>
                            </div>
                            {theme === 'light' && <Badge variant="primary">Ativo</Badge>}
                         </div>
                         <p className="text-[11px] text-slate-500 leading-relaxed">Interface clara e nítida com fundo suave e excelente contraste diurno.</p>
                      </button>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'CRM / Funis' && (
             <div className="space-y-8">
                <div className="space-y-6">
                   <h3 className="text-xl font-bold text-white tracking-tight italic uppercase">Automações de Entrada</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                         <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Funil Principal de Mensagens</p>
                         <div className="space-y-2">
                           {funnels.map(f => (
                             <button
                               key={f.id}
                               onClick={() => setSelectedFunnel(f.id)}
                               className={cn(
                                 "w-full p-4 rounded-2xl border text-left transition-all",
                                 selectedFunnel === f.id ? "bg-primary-500 border-primary-400 text-slate-900" : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
                               )}
                             >
                                <p className="font-bold uppercase tracking-tight text-xs">{f.name}</p>
                             </button>
                           ))}
                         </div>
                      </div>
                      <div className="bg-white/5 p-6 rounded-[32px] border border-white/5 space-y-4">
                         <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                            <Zap size={20} />
                         </div>
                         <h4 className="font-bold text-white text-sm">Regra de Lead Automático</h4>
                         <p className="text-xs text-white/40 leading-relaxed">Toda nova mensagem recebida criará automaticamente um Lead na primeira etapa do funil selecionado ao lado.</p>
                         <div className="pt-4 flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Ativo e Monitorando</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'Integrações' && (
             <div className="space-y-10">
                <div className="space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#32bcad]/20 flex items-center justify-center text-[#32bcad]">
                         <QrCode size={24} />
                      </div>
                      <div>
                         <h3 className="text-xl font-bold text-white tracking-tight italic uppercase">Configuração PIX</h3>
                         <p className="text-xs text-white/30">Chave base para geração de QR Codes no PDV</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Input label="Chave PIX" value={pixKey} onChange={(e: any) => setPixKey(e.target.value)} placeholder="CPF, CNPJ, telefone, e-mail ou chave aleatória" />
                      <Input label="Nome do Beneficiário" value={pixBeneficiary} onChange={(e: any) => setPixBeneficiary(e.target.value)} />
                      <Input label="Banco" placeholder="Ex: Nubank, Banco do Brasil..." value={pixBank} onChange={(e: any) => setPixBank(e.target.value)} />
                      <Input label="Cidade (para o QR Code)" value={pixCity} onChange={(e: any) => setPixCity(e.target.value)} />
                    </div>
                    <Button
                      onClick={handleSavePixConfig}
                      disabled={savingPix || !pixKey.trim()}
                      className="bg-primary-500 text-slate-900 border-none shadow-xl shadow-primary-500/20"
                    >
                      {savingPix ? 'Salvando...' : 'Salvar Configuração PIX'}
                    </Button>
                 </div>

                 <div className="h-px bg-white/10" />

                 <div className="space-y-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <CreditCard size={24} />
                       </div>
                       <div>
                          <h3 className="text-xl font-bold text-white tracking-tight italic uppercase">Formas de Pagamento no PDV</h3>
                          <p className="text-xs text-white/30">Escolha quais opções aparecem na tela de pagamento (só o admin controla isso)</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {ALL_PAYMENT_METHODS.map(m => {
                          const isEnabled = enabledPaymentMethods.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              onClick={() => togglePaymentMethodEnabled(m.id)}
                              className={cn(
                                "p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all",
                                isEnabled ? "bg-primary-500/10 border-primary-500 text-primary-300" : "bg-white/5 border-white/10 text-white/30 hover:border-white/20"
                              )}
                            >
                               <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center", isEnabled ? "bg-primary-500 border-primary-500" : "border-white/20")}>
                                  {isEnabled && <Check size={12} className="text-slate-900" />}
                               </div>
                               <span className="text-[10px] font-black uppercase tracking-wider text-center">{m.label}</span>
                            </button>
                          );
                       })}
                    </div>
                    <Button
                      onClick={handleSavePaymentMethods}
                      disabled={savingPaymentMethods}
                      className="bg-primary-500 text-slate-900 border-none shadow-xl shadow-primary-500/20"
                    >
                      {savingPaymentMethods ? 'Salvando...' : 'Salvar Formas de Pagamento'}
                    </Button>
                 </div>

                 <div className="h-px bg-white/10" />

                 <div className="space-y-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                          <Calculator size={24} />
                       </div>
                       <div>
                          <h3 className="text-xl font-bold text-white tracking-tight italic uppercase">Taxas de Parcelamento (Crédito)</h3>
                          <p className="text-xs text-white/30">Defina a taxa (%) somada ao valor conforme o número de parcelas escolhido no PDV</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                       {creditCardFees.map(f => (
                         <div key={f.installments} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-white/40 tracking-wider block">{f.installments}x</label>
                            <div className="relative">
                               <input
                                 type="number"
                                 step="any"
                                 min={0}
                                 value={f.feePercent}
                                 onChange={(e) => updateCreditCardFee(f.installments, e.target.value === '' ? 0 : Number(e.target.value))}
                                 className="w-full h-9 bg-slate-900/60 border border-white/10 rounded-lg px-2 pr-6 text-xs text-white text-right font-bold focus:outline-none focus:border-primary-500"
                               />
                               <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30 font-bold">%</span>
                            </div>
                         </div>
                       ))}
                    </div>

                    <div className="h-px bg-white/10" />

                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                          <CreditCard size={24} />
                       </div>
                       <div>
                          <h3 className="text-xl font-bold text-white tracking-tight italic uppercase">Taxa do Cartão de Débito</h3>
                          <p className="text-xs text-white/30">Taxa (%) somada ao valor quando o pagamento for no débito</p>
                       </div>
                    </div>
                    <div className="max-w-[160px]">
                       <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-white/40 tracking-wider block">Taxa do Débito</label>
                          <div className="relative">
                             <input
                               type="number"
                               step="any"
                               min={0}
                               value={debitCardFeePercent}
                               onChange={(e) => setDebitCardFeePercent(e.target.value === '' ? 0 : Number(e.target.value))}
                               className="w-full h-9 bg-slate-900/60 border border-white/10 rounded-lg px-2 pr-6 text-xs text-white text-right font-bold focus:outline-none focus:border-primary-500"
                             />
                             <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30 font-bold">%</span>
                          </div>
                       </div>
                    </div>

                    <Button
                      onClick={handleSaveCreditCardFees}
                      disabled={savingCardFees}
                      className="bg-primary-500 text-slate-900 border-none shadow-xl shadow-primary-500/20"
                    >
                      {savingCardFees ? 'Salvando...' : 'Salvar Taxas de Cartão'}
                    </Button>
                 </div>
              </div>
            )}

            {activeTab === 'Usuários e Permissões' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {editingUser ? (
                  <div className="space-y-8">
                    <button 
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="flex items-center gap-2 text-xs text-primary-450 font-bold hover:text-white uppercase tracking-wider bg-transparent border-0 cursor-pointer"
                    >
                      <ArrowLeft size={16} /> Voltar para a lista de colaboradores
                    </button>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">Ajustar Permissões</h3>
                        <p className="text-xs text-white/40 font-medium">Defina o nível de acesso e abas visíveis de <span className="text-white font-bold">{editingUser.name}</span></p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSimulatedUserId(editingUser.id);
                            alert(`Simulando sessão de ${editingUser.name}!`);
                          }}
                          className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg text-slate-950 border-0 cursor-pointer"
                        >
                          <Eye size={16} /> Simular Visão deste Usuário
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                      <Input label="Nome Completo" value={editedName} onChange={(e) => setEditedName(e.target.value)} />
                      <Input label="E-mail de Acesso" value={editedEmail} onChange={(e) => setEditedEmail(e.target.value)} />
                      <Input label="Senha de Acesso" type="text" value={editedPassword} onChange={(e) => setEditedPassword(e.target.value)} placeholder="Altere a senha se desejar" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-white/50 font-black">Cargo / Função</label>
                      <select 
                        value={editedRole}
                        onChange={(e: any) => setEditedRole(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white hover:border-primary-500 font-bold focus:outline-none transition-all"
                      >
                        <option value="admin">Administrador</option>
                        <option value="gerente">Gerente de Equipe</option>
                        <option value="atendente">Atendente Comercial</option>
                        <option value="caixa">Operador de Caixa (PDV)</option>
                        <option value="vendedor">Vendedor Externo</option>
                        <option value="designer">Designer Gráfico</option>
                        <option value="operador">Operador de Impressão</option>
                      </select>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-white/5">
                      <h4 className="text-lg font-bold text-white uppercase italic tracking-tight font-black">Abas Permitidas no Sistema</h4>
                      <p className="text-xs text-white/30 -mt-4 font-medium">Marque quais abas estarão visíveis no painel lateral do usuário</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tabOptions.map((opt) => {
                          const isAllowed = editedTabs.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                if (isAllowed) {
                                  setEditedTabs(prev => prev.filter(t => t !== opt.id));
                                } else {
                                  setEditedTabs(prev => [...prev, opt.id]);
                                }
                              }}
                              className={cn(
                                "flex flex-col text-left p-4 rounded-3xl border transition-all duration-300 relative overflow-hidden cursor-pointer",
                                isAllowed 
                                  ? "bg-primary-500/10 border-primary-500 text-white" 
                                  : "bg-slate-950/40 border-white/5 text-white/40 hover:border-white/10 hover:text-white"
                              )}
                            >
                              {isAllowed && (
                                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                              )}
                              <span className="font-bold uppercase tracking-wide text-[11px] md:text-xs">{opt.label}</span>
                              <span className="text-[10px] text-white/30 mt-1 lines-clamp-2 leading-tight">{opt.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-white/5">
                      <h4 className="text-lg font-bold text-white uppercase italic tracking-tight font-black">Permissões de Ações Detalhadas</h4>
                      <p className="text-xs text-white/30 -mt-4 font-medium">Defina quais ações e flows internos de segurança este usuário pode executar</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {actionOptions.map((act) => {
                          const isAllowed = editedActions.includes(act.id);
                          return (
                            <button
                              key={act.id}
                              type="button"
                              onClick={() => {
                                if (isAllowed) {
                                  setEditedActions(prev => prev.filter(a => a !== act.id));
                                } else {
                                  setEditedActions(prev => [...prev, act.id]);
                                }
                              }}
                              className={cn(
                                "flex items-start gap-4 text-left p-4 rounded-3xl border transition-all duration-300 relative cursor-pointer",
                                isAllowed 
                                  ? "bg-primary-500/10 border-primary-500/40 text-white" 
                                  : "bg-slate-950/40 border-white/5 text-white/40 hover:border-white/10"
                              )}
                            >
                              <div className={cn(
                                "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all",
                                isAllowed ? "bg-primary-500 border-primary-500 text-slate-950" : "border-white/20"
                              )}>
                                {isAllowed && <Check size={12} strokeWidth={4} />}
                              </div>
                              <div>
                                <span className="font-bold text-xs uppercase tracking-wide block">{act.label}</span>
                                <span className="text-[10px] text-white/30 mt-0.5 block leading-tight">{act.desc}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-4 pt-8 border-t border-white/5">
                      <button 
                        type="button"
                        onClick={() => setEditingUser(null)} 
                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all font-bold border-0 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="button"
                        onClick={handleSaveUserPermissions} 
                        className="flex-1 py-4 bg-primary-500 hover:bg-primary-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg font-bold border-0 cursor-pointer"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {user?.isAdmin && (
                      <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 space-y-4">
                         <div>
                            <h3 className="text-lg font-bold text-white tracking-tight italic uppercase flex items-center gap-2">
                               <Wifi size={18} className="text-primary-400" /> Sessões Ativas ({activeSessions.length})
                            </h3>
                            <p className="text-[11px] text-white/30 font-medium">Quem está acessando agora, de qual IP e aparelho — desconecte remotamente se precisar</p>
                         </div>
                         {activeSessions.length === 0 ? (
                            <p className="text-xs text-white/30 py-2">Nenhuma sessão ativa nos últimos 30 minutos.</p>
                         ) : (
                            <div className="space-y-2">
                               {activeSessions.map(s => (
                                 <div key={s.id} className="flex items-center justify-between gap-3 bg-slate-900/60 border border-white/5 rounded-xl px-4 py-2.5 flex-wrap">
                                    <div className="min-w-0">
                                       <p className="text-xs font-bold text-white">{s.userName}</p>
                                       <p className="text-[10px] text-white/40">IP: {s.ip} · {s.device}</p>
                                       <p className="text-[9px] text-white/20">Visto por último: {safeFormat(s.lastSeenAt || s.loginAt, 'dd/MM/yyyy HH:mm')}</p>
                                    </div>
                                    <button
                                      onClick={() => handleDisconnectSession(s.id)}
                                      className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 shrink-0"
                                    >
                                      Desconectar
                                    </button>
                                 </div>
                               ))}
                            </div>
                         )}
                         <p className="text-[9px] text-white/20">Não é possível ver o endereço MAC do aparelho — nenhum sistema web consegue, é bloqueado por privacidade dos navegadores. Pra bloquear alguém de vez (não só desconectar essa sessão), inative o usuário na lista abaixo.</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-white tracking-tight italic uppercase">Membros de Equipe</h3>
                        <p className="text-xs text-white/30 font-medium">Gerencie permissões de visibilidade de abas e ações permitidas</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)} 
                        className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg self-start sm:self-center text-slate-950 border-0 cursor-pointer"
                      >
                        <Plus size={16} /> Adicionar Usuário Simulado
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {usersList.map((u) => {
                        const allowedCount = u.allowedTabs?.length ?? 7;
                        const actionsCount = u.allowedActions?.length ?? 10;
                        const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                        const isSimulated = simulatedUserId === u.id || (!simulatedUserId && u.id === 'mock-user-id');
                        
                        return (
                          <div 
                            key={u.id} 
                            className={cn(
                              "p-6 rounded-[28px] border-2 space-y-4 hover:border-white/10 transition-all duration-300 relative overflow-hidden flex flex-col justify-between bg-slate-900/40",
                              isSimulated ? "border-amber-500 bg-amber-500/5" : "border-white/5 bg-slate-950/20"
                            )}
                          >
                            {isSimulated && (
                              <span className="absolute top-0 right-0 bg-amber-500 text-slate-950 px-3 py-1 font-black text-[8px] uppercase tracking-widest rounded-bl-xl shadow-lg">
                                Sessão Ativa
                              </span>
                            )}
                            
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-slate-950 font-black tracking-wider text-sm shadow-lg shrink-0 uppercase">
                                {initials}
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-bold text-white text-base leading-tight">{u.name}</h4>
                                <p className="text-[10px] text-white/40 leading-none">{u.email}</p>
                                <div className="flex items-center gap-2 pt-1.5">
                                  <Badge className="bg-primary-500/10 text-primary-400 border-primary-500/20 text-[9px] px-2 py-0.5 uppercase font-black">
                                    {u.role || 'membro'}
                                  </Badge>
                                  {u.isAdmin && (
                                    <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[9px] px-2 py-0.5 uppercase font-black">
                                      Admin
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-white/5 pt-4 grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase font-black text-white/30 tracking-widest block">Abas Visíveis</span>
                                <span className="block font-bold text-white text-xs">{allowedCount} de 9 abas</span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase font-black text-white/30 tracking-widest block">Ações Permitidas</span>
                                <span className="block font-bold text-white text-xs">{actionsCount} de 10 ações</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                              <button
                                type="button"
                                onClick={() => startEditUser(u)}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 hover:border-white/20 text-white/70 hover:text-white transition-all font-bold text-xs uppercase cursor-pointer bg-transparent"
                              >
                                <Settings2 size={14} className="text-primary-400" /> Configurar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSimulatedUserId(u.id);
                                  alert(`Alternando visualização para: ${u.name}`);
                                }}
                                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white hover:text-amber-400 transition-all font-bold text-xs flex items-center justify-center cursor-pointer border-0"
                                title="Simular Sessão"
                              >
                                <Eye size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Modal 
                  isOpen={isCreateModalOpen} 
                  onClose={() => setIsCreateModalOpen(false)} 
                  title="Cadastrar Novo Usuário no Repositório"
                >
                  <div className="space-y-6">
                    <p className="text-xs text-white/40 -mt-2">O usuário criado será salvo diretamente no banco de dados Firestore e poderá fazer login imediatamente com o e-mail e senha cadastrados.</p>
                    <Input label="Nome Completo do Colaborador" placeholder="Ex: Maria Silva" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                    <Input label="E-mail de Acesso" placeholder="maria@empresa.com" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
                    <Input label="Senha de Acesso" type="password" placeholder="Defina a senha (ex: 123456)" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
                    
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-white/50 font-black">Cargo / Função do Usuário</label>
                      <select 
                        value={newUserRole}
                        onChange={(e: any) => setNewUserRole(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-white hover:border-primary-500 font-bold focus:outline-none transition-all"
                      >
                        <option value="admin">Administrador (Total)</option>
                        <option value="gerente">Gerente de Equipe</option>
                        <option value="atendente">Atendente Comercial</option>
                        <option value="caixa">Operador de Caixa (PDV)</option>
                        <option value="vendedor">Vendedor Externo</option>
                        <option value="designer">Designer Gráfico</option>
                        <option value="operador">Operador de Impressão</option>
                      </select>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setIsCreateModalOpen(false)} 
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase rounded-xl transition-all border-0 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="button"
                        onClick={handleCreateUser} 
                        className="flex-1 py-3 bg-primary-500 hover:bg-primary-400 text-slate-950 font-black text-xs uppercase rounded-xl transition-all shadow-lg border-0 cursor-pointer"
                      >
                        Salvar no Repositório
                      </button>
                    </div>
                  </div>
                </Modal>
              </div>
            )}
         </GlassCard>
      </div>
    </div>
  );
};

