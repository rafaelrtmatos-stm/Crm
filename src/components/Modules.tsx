import { AppContext } from '../App';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ContractApprovalModule } from './ContractApprovalModule';
import { 
  TrendingUp, 
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
import { format } from 'date-fns';

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
  items: row.items || [],
  total: Number(row.total) || 0,
  downPayment: row.down_payment !== null ? Number(row.down_payment) : undefined,
  receivedValue: row.received_value !== null ? Number(row.received_value) : undefined,
  paymentMethod: row.payment_method,
  status: row.status,
  createdAt: row.created_at,
  scheduledFor: row.scheduled_for || undefined,
} as SaleOrder);

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
      const { data } = await supabase.from('vendas').select('*').order('created_at', { ascending: false });
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
    filteredOrders.forEach(o => {
      const day = format(new Date(o.createdAt), 'dd/MM');
      if (!groups[day]) groups[day] = { day, total: 0, sales: 0, svcs: 0, entries: 0 };
      const val = o.status === 'pending' ? (o.downPayment || 0) : (o.total || 0);
      groups[day].total += val;
      groups[day].sales += 1;
      if (o.status === 'pending') groups[day].entries += 1;
    });
    services.forEach(s => {
      const date = s.createdAt instanceof Timestamp ? s.createdAt.toDate() : new Date(s.createdAt);
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

            <Button 
              variant="secondary" 
              icon={isEditMode ? Check : Settings2} 
              onClick={() => setIsEditMode(!isEditMode)}
              className="text-[9px] uppercase tracking-widest font-black"
            >
              {isEditMode ? 'Salvar Layout' : 'Personalizar'}
            </Button>
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

        <div className="space-y-8 flex flex-col">
            <GlassCard className="p-8 border-white/5 bg-white/[0.02] flex-1">
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
                    <div key={i} onClick={() => setActiveTab?.('services')} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group space-y-2">
                       <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                             <p className="text-[10px] font-black text-white truncate uppercase max-w-[130px]">{s.client}</p>
                             <p className="text-[8px] text-[#4cc9f0] uppercase font-black">Empresa: {currentCompany?.name || 'Geral'}</p>
                          </div>
                          <span className="text-[10px] font-black text-emerald-400 italic">R$ {(s.total || 0).toFixed(2).replace('.', ',')}</span>
                       </div>
                       <div className="flex justify-between items-end pt-2 border-t border-white/5">
                          <div className="space-y-0.5">
                             <p className="text-[9px] text-white/30 truncate max-w-[140px] italic line-clamp-1">{s.service || 'Serviço s/ descrição'}</p>
                             <p className="text-[8px] text-white/40 uppercase font-bold">RESP: {s.responsibleName || s.responsible || 'Responsável'}</p>
                             <p className="text-[7px] text-white/20">{s.createdAt ? format(new Date(s.createdAt), 'dd/MM HH:mm') : ''}</p>
                          </div>
                          <Badge variant={s.status === 'producao' ? 'primary' : 'warning'} className="text-[8px] h-5 px-1.5 uppercase font-black leading-none">
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
                    const dateStr = format(new Date(o.createdAt), 'dd/MM/yyyy');
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
                          <p className="text-[9px] text-white/30 uppercase font-black">{format(new Date(o.createdAt), 'dd/MM HH:mm')}</p>
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
  user
}: { 
  conversation: any; 
  onClose?: () => void;
  currentCompany: Company | null;
  user: AppUser | null;
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'data' | 'tasks' | 'notes' | 'history' | 'sales' | 'attachments'>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showQuickTemplates, setShowQuickTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  const [selectedChat, setSelectedChat] = useState<any>(null);
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
export const POSModule = ({ currentCompany, addPendingOrder }: { currentCompany: Company | null, addPendingOrder: (order: SaleOrder) => void }) => {
  const { isRegisterOpen, setIsRegisterOpen } = React.useContext(AppContext)!;
  const [activeTab, setActiveTab] = useState<'venda' | 'historico' | 'estoque' | 'clientes' | 'contratos'>('venda');
  const [cart, setCart] = useState<SaleOrderItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastFinalizedOrder, setLastFinalizedOrder] = useState<SaleOrder | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string, name: string, phone: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'misto'>('pix');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [downPayment, setDownPayment] = useState(0);
  const [scheduledFor, setScheduledFor] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [salesToday, setSalesToday] = useState<SaleOrder[]>([]);
  const [allSalesHistory, setAllSalesHistory] = useState<SaleOrder[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'todos' | 'parciais' | 'concluidos'>('todos');
  const [historySearch, setHistorySearch] = useState('');
  const [settleModalOrder, setSettleModalOrder] = useState<SaleOrder | null>(null);
  const [settleMethod, setSettleMethod] = useState<'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito'>('pix');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [pixConfig, setPixConfig] = useState<{ key: string; beneficiaryName: string; city: string } | null>(null);

  useEffect(() => {
    if (!currentCompany) return;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const loadSales = async () => {
      const { data } = await supabase.from('vendas').select('*');
      const allSales = (data || []).map(mapVendaRow);
      allSales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllSalesHistory(allSales);
      const todaySales = allSales.filter(sale => {
        const d = new Date(sale.createdAt);
        return d >= startOfDay;
      });
      setSalesToday(todaySales);
    };
    loadSales();
    const channel = supabase.channel('pos-vendas').on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, loadSales).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('configuracoes').select('*').eq('company_id', 'rafa-arts').maybeSingle();
      if (data && data.pix_key) {
        setPixConfig({
          key: data.pix_key,
          beneficiaryName: data.beneficiary_name || currentCompany?.name || 'RAFA ARTS GRAPHICS',
          city: data.city || 'Santarem',
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

  const products: Product[] = [
    { id: '1', name: 'A4 FRENTE E VERSO COLORIDO', code: '7891396968707', price: 1.50, stock: 1500, unitType: 'unit' },
    { id: '2', name: 'ABA DO TANQUE', code: '7895858595791', price: 75.00, stock: 45, unitType: 'unit' },
    { id: '3', name: 'ABA INFERIOR', code: '7898844611000', price: 60.00, stock: 120, unitType: 'unit' },
    { id: '4', name: 'ABA LATERAL', code: '7894766221136', price: 75.00, stock: 30, unitType: 'unit' },
    { id: '5', name: 'ACABAMENTO BANNER', code: '7893919006033', price: 20.00, stock: 800, unitType: 'unit' },
    { id: '6', name: 'ADESIVO BALANÇA', code: '7891042219924', price: 30.00, stock: 50, unitType: 'unit' },
    { id: '7', name: 'ADESIVO DE IMPRESSAO AVERY', code: '7890000000000', price: 50.00, stock: 100, unitType: 'm2' },
  ];

  const addToCart = (product: Product) => {
    let area: number | undefined;
    let dimensions: string | undefined;

    if (product.unitType === 'm2') {
      const dimInput = prompt(`Digite as dimensões para ${product.name} (ex: 1,2x2,2):`);
      if (dimInput) {
        const parts = dimInput.toLowerCase().split('x').map(p => {
          const val = parseFloat(p.trim().replace(',', '.'));
          return isNaN(val) ? 0 : val;
        });
        if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
          area = parts[0] * parts[1];
          dimensions = dimInput;
        } else {
          alert('Formato de dimensão inválido! Use LxH (ex: 1,2x2,2)');
          return;
        }
      } else {
        return;
      }
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
        area
      }];
    });
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

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce((acc, item) => {
    const itemTotal = item.area ? item.price * item.area * item.quantity : item.price * item.quantity;
    return acc + itemTotal;
  }, 0);
  const remainingValue = Math.max(0, total - (downPayment === '' || typeof downPayment === 'string' ? 0 : Number(downPayment)));

  const faturamentoHoje = salesToday.reduce((acc, o) => {
    if (o.status === 'pending') {
      return acc + (o.downPayment || 0);
    }
    return acc + (o.total || 0);
  }, 0);

  const handleFinalize = async (isPending: boolean = false) => {
    if (!selectedCustomer && cart.length > 0) {
      if (isPending || remainingValue > 0) {
        setIsCustomerModalOpen(true);
        return;
      }
    }

    // Play money sound
    try {
      const audio = new Audio('/sounds/cash-register.mp3');
      audio.play().catch(() => {});
    } catch (e) {}

    const finalDownPayment = downPayment === '' || typeof downPayment === 'string' ? 0 : Number(downPayment);
    const currentRemaining = Math.max(0, total - finalDownPayment);

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
      status: isPartialSale ? 'pending' : 'completed',
      createdAt: new Date().toISOString(),
      scheduledFor: deliveryDate || undefined
    };

    // Save to Supabase
    try {
      const { error } = await supabase.from('vendas').insert({
        customer_name: order.customerName,
        customer_phone: selectedCustomer?.phone,
        items: order.items,
        total: order.total,
        down_payment: order.downPayment,
        received_value: order.receivedValue,
        payment_method: order.paymentMethod,
        status: order.status,
        scheduled_for: order.scheduledFor || null,
      });
      if (error) throw error;
      
      // RULE: Always create Service/OS if pending or has balance OR specific items
      const hasServiceItems = cart.some(item => 
        ['1', '5', '6'].includes(item.productId) || 
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
    
    setLastFinalizedOrder(order);
    setIsSuccessModalOpen(true);
    setIsPaymentModalOpen(false);
    
    // Reset cart but keep customer for the success modal
    setCart([]);
    setDownPayment(0);
    setScheduledFor('');
  };

  if (!isRegisterOpen) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
        <GlassCard className="max-w-md w-full p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-[32px] flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Caixa Fechado</h2>
          <p className="text-white/40 text-sm">É necessário abrir o caixa para iniciar as vendas do dia.</p>
          <Button className="w-full h-14 text-lg" onClick={() => setIsRegisterOpen(true)}>Abrir Caixa Agora</Button>
        </GlassCard>
      </div>
    );
  }

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const { data: vendasData } = await supabase.from('vendas').select('*');
      const allSales = (vendasData || []).map(mapVendaRow);
      allSales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllSalesHistory(allSales);
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      setSalesToday(allSales.filter(sale => new Date(sale.createdAt) >= startOfDay));
      setSyncedAt(new Date());
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      alert('Não foi possível sincronizar agora. Verifique sua conexão.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] min-h-[600px] flex flex-col bg-slate-900/50 rounded-[40px] shadow-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-right-5 duration-500">
      {/* Tab Navigation */}
      <div className="flex bg-white/5 p-2 gap-2 border-b border-white/10 items-center justify-between">
        <div className="flex gap-2">
          {[
            { id: 'venda', label: 'Terminal Venda', icon: ShoppingBag },
            { id: 'historico', label: 'Histórico & Abertas', icon: History },
            { id: 'estoque', label: 'Estoque / Produtos', icon: Box },
            { id: 'clientes', label: 'Clientes / CRM', icon: Users },
            { id: 'contratos', label: 'Contratos Rafa Art', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[2px] transition-all",
                activeTab === tab.id ? "bg-primary-500 text-slate-900 shadow-xl" : "text-white/40 hover:bg-white/5 hover:text-white"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2 mr-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all",
              isSyncing ? "bg-white/5 border-white/10 text-white/30" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
            )}
            title={syncedAt ? `Última sincronização: ${syncedAt.toLocaleTimeString('pt-BR')}` : 'Sincronizar agora'}
          >
            <RefreshCw size={12} className={cn(isSyncing && "animate-spin")} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          icon={LogOut} 
          className="text-rose-400 border-rose-500/20 hover:bg-rose-500/10 mr-4 text-[9px] uppercase tracking-widest font-black"
          onClick={() => setIsRegisterOpen(false)}
        >
          Fechar Caixa
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'venda' && (
          <>
            {/* Left Column: POS Display & Compact Cart Items Viewer */}
            <div className="flex-1 bg-[#fef9c3] flex flex-col p-6 relative overflow-hidden justify-between">
               {/* Top Bar */}
               <div className="flex justify-between items-center text-slate-900/50 pb-2 border-b border-slate-900/10">
                  <div className="flex items-center gap-2">
                     <ShoppingBag size={16} className="text-slate-900" />
                     <p className="text-[10px] font-black uppercase tracking-[3px]">Rafa Arts POS Terminal</p>
                  </div>
                  <div className="flex items-center gap-3">
                     <p className="text-[10px] font-black uppercase tracking-[3px]">#001-ALPHA</p>
                     {cart.length > 0 && (
                        <button
                           onClick={clearCart}
                           className="text-[9px] font-bold uppercase text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                           title="Limpar Carrinho"
                        >
                           <Trash2 size={10} />
                           Limpar
                        </button>
                     )}
                  </div>
               </div>

               {/* Total Banner */}
               <div className="py-3 px-4 bg-slate-900/5 rounded-2xl border border-slate-900/10 flex items-center justify-between my-2">
                  <div>
                     <p className="text-[9px] font-black uppercase tracking-[3px] text-slate-900/40">Total da Nota</p>
                     <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter italic">
                        R$ {total.toFixed(2).replace('.', ',')}
                     </h1>
                  </div>
                  <Badge className="bg-slate-900 text-white border-none py-1.5 px-4 rounded-full font-black uppercase tracking-widest text-[9px]">
                     {cart.length} {cart.length === 1 ? 'Item' : 'Itens'}
                  </Badge>
               </div>

               {/* Visualizador de Itens no PDV (Compact Items Cart List) */}
               <div className="flex-1 my-2 bg-white/70 backdrop-blur-xs rounded-2xl border border-slate-900/10 p-3 flex flex-col overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-900/10 mb-2">
                     <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">Visualizador de Itens ({cart.length})</span>
                     <span className="text-[8px] font-bold text-slate-400 uppercase">Lista de Lançamento</span>
                  </div>

                  {cart.length === 0 ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
                        <ShoppingBag size={28} className="text-slate-400/50 animate-bounce" />
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Carrinho Livre</p>
                        <p className="text-[9px] font-bold text-slate-500 max-w-[200px]">Selecione os produtos na lista ao lado para adicionar ao pedido.</p>
                     </div>
                  ) : (
                     <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-200/60 pr-1">
                        {cart.map((item, idx) => {
                           const itemSubtotal = item.area ? item.price * item.area * item.quantity : item.price * item.quantity;
                           return (
                              <div key={idx} className="py-1.5 px-2 flex items-center justify-between hover:bg-slate-900/5 rounded-lg transition-all group">
                                 <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-[9px] font-black text-slate-900 bg-slate-900/10 px-1.5 py-0.5 rounded-md min-w-[24px] text-center">
                                       {item.quantity}x
                                    </span>
                                    <div className="min-w-0 flex-1">
                                       <p className="text-[10px] font-bold text-slate-900 uppercase truncate leading-tight tracking-tight">
                                          {item.name}
                                       </p>
                                       {item.dimensions && (
                                          <p className="text-[8px] font-bold text-slate-500 tracking-wider">
                                             {item.dimensions} ({item.area?.toFixed(2).replace('.', ',')} m²)
                                          </p>
                                       )}
                                    </div>
                                 </div>

                                 <div className="flex items-center gap-3 shrink-0 ml-2">
                                    <div className="flex items-center gap-1 bg-slate-900/5 rounded-md p-0.5 border border-slate-900/10">
                                       <button
                                          onClick={() => updateCartQty(idx, -1)}
                                          className="w-4 h-4 rounded bg-white text-slate-800 font-black text-[9px] flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                                          title="Diminuir"
                                       >
                                          -
                                       </button>
                                       <span className="text-[9px] font-black px-1 text-slate-900">{item.quantity}</span>
                                       <button
                                          onClick={() => updateCartQty(idx, 1)}
                                          className="w-4 h-4 rounded bg-white text-slate-800 font-black text-[9px] flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                                          title="Aumentar"
                                       >
                                          +
                                       </button>
                                    </div>

                                    <span className="text-[10px] font-black text-slate-900 tracking-tight min-w-[60px] text-right">
                                       R$ {itemSubtotal.toFixed(2).replace('.', ',')}
                                    </span>

                                    <button
                                       onClick={() => removeFromCart(idx)}
                                       className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                                       title="Remover Item"
                                    >
                                       <Trash2 size={12} />
                                    </button>
                                 </div>
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
                  <div className="text-right">
                     <span className="text-[8px] font-black uppercase tracking-widest opacity-50 block leading-none">Faturamento Hoje</span>
                     <span className="text-[10px] font-black italic">R$ {faturamentoHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
               </div>
            </div>

            {/* Right Column: List & Actions */}
            <div className="w-[450px] bg-white flex flex-col border-l border-slate-200 shadow-2xl relative">
               {/* Search & Action Bar */}
               <div className="p-4 bg-slate-50 space-y-3">
                  <div className="flex gap-2 h-12">
                     <button 
                        onClick={() => {
                          const desc = prompt('Descrição (ex: ADESIVO):');
                          const input = prompt('Valor Unitário ou Fórmula M2 (ex: 1,2x2,2=50,00):');
                          if (desc && input) {
                            if (input.includes('x') && input.includes('=')) {
                               const [dims, priceM2Str] = input.split('=');
                               const parts = dims.toLowerCase().split('x').map(p => parseFloat(p.trim().replace(',', '.')));
                               const priceM2 = parseFloat(priceM2Str.trim().replace(',', '.'));
                               if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(priceM2)) {
                                  const area = parts[0] * parts[1];
                                  setCart(prev => [...prev, { 
                                    productId: 'manual', 
                                    name: desc.toUpperCase(), 
                                    price: priceM2, 
                                    quantity: 1, 
                                    dimensions: dims.trim(), 
                                    area 
                                  }]);
                                  return;
                               }
                            }
                            const val = parseFloat(input.replace(',', '.'));
                            if (!isNaN(val) && val > 0) {
                               setCart(prev => [...prev, { productId: 'manual', name: desc.toUpperCase(), price: val, quantity: 1 }]);
                            }
                          }
                        }}
                        className="flex-1 bg-white border-2 border-primary-400 text-primary-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary-50 transition-all shadow-sm active:scale-95 flex flex-col items-center justify-center gap-1"
                     >
                        <PlusSquare size={16} />
                        Caixa Livre
                     </button>
                     <div className="flex-[2] flex gap-1 bg-white border-2 border-slate-200 rounded-xl p-1 overflow-x-auto no-scrollbar">
                        {[1, 2, 3, 4, 5].map(q => (
                          <button 
                            key={q} 
                            onClick={() => setSelectedQty(q)}
                            className={cn(
                              "flex-1 rounded-lg text-sm font-black transition-all",
                              selectedQty === q ? "bg-primary-500 text-slate-900" : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            {q}x
                          </button>
                        ))}
                     </div>
                  </div>
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                     <input 
                       value={search}
                       onChange={(e) => setSearch(e.target.value)}
                       className="w-full h-11 bg-white border-2 border-slate-200 rounded-xl pl-10 pr-4 text-xs font-bold text-slate-700 placeholder:text-slate-300 outline-none focus:border-primary-500 transition-all"
                       placeholder="BUSCAR OU BIPAR..."
                     />
                  </div>
               </div>

                {/* COMPACT PRODUCT LIST */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                   <div className="divide-y divide-slate-50">
                      {products.filter(p => p.name.includes(search.toUpperCase())).map(product => (
                        <div 
                          key={product.id} 
                          onClick={() => addToCart(product)}
                          className="flex items-center px-4 py-1.5 hover:bg-primary-50 transition-colors group cursor-pointer border-b border-slate-50 last:border-0"
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

               <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
                  <div className="flex gap-4 h-24">
                     <button 
                       onClick={() => setIsCustomerModalOpen(true)}
                       className={cn(
                         "flex-1 h-full rounded-[28px] border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                         selectedCustomer ? "bg-amber-400 border-amber-600 text-slate-900" : "bg-white border-slate-200 text-slate-400"
                       )}
                     >
                        <UserCheck size={24} />
                        <span className="text-[9px] font-black uppercase tracking-widest">{selectedCustomer ? selectedCustomer.name : 'Venda em Aberto'}</span>
                     </button>
                     <button 
                       disabled={cart.length === 0}
                       onClick={() => {
                          setDownPayment(total);
                          setIsPaymentModalOpen(true);
                       }}
                       className="flex-[2] h-full bg-primary-500 border-2 border-primary-600 text-slate-900 rounded-[28px] flex flex-col items-center justify-center gap-1 shadow-xl shadow-primary-500/20 hover:bg-primary-400 transition-all disabled:opacity-50 disabled:grayscale active:scale-95"
                     >
                        <div className="flex items-center gap-3">
                           <ShoppingBag size={24} />
                           <span className="text-lg font-black uppercase tracking-tighter">FINALIZAR VENDA</span>
                        </div>
                        <span className="text-[10px] font-black opacity-40 uppercase tracking-[4px]">Ir para pagamento e fechamento</span>
                     </button>
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

              {/* Filter Tabs */}
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 gap-1 self-stretch md:self-auto">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'parciais', label: 'Entradas Pendentes' },
                  { id: 'concluidos', label: '100% Quitados' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setHistoryFilter(f.id as any)}
                    className={cn(
                      "flex-1 md:flex-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all text-center",
                      historyFilter === f.id ? "bg-primary-500 text-slate-900 shadow-lg font-black" : "text-white/40 hover:text-white"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Buscar por cliente, produto ou código do pedido..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary-500"
              />
            </div>

            {/* Orders List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allSalesHistory.filter(sale => {
                const down = sale.downPayment || 0;
                const balance = sale.total - down;
                const isPartial = balance > 0 || sale.status === 'pending';
                if (historyFilter === 'parciais' && !isPartial) return false;
                if (historyFilter === 'concluidos' && isPartial) return false;
                if (historySearch.trim()) {
                  const term = historySearch.toLowerCase();
                  const nameMatch = (sale.customerName || '').toLowerCase().includes(term);
                  const idMatch = sale.id.toLowerCase().includes(term);
                  const itemMatch = sale.items?.some(i => i.name.toLowerCase().includes(term));
                  if (!nameMatch && !idMatch && !itemMatch) return false;
                }
                return true;
              }).length === 0 ? (
                <div className="col-span-1 md:col-span-2 py-16 text-center bg-white/5 rounded-3xl border border-dashed border-white/10 space-y-2">
                  <History size={36} className="mx-auto text-white/20" />
                  <p className="text-sm font-bold text-white/40 uppercase">Nenhum registro encontrado</p>
                  <p className="text-xs text-white/20">As vendas e serviços finalizados ou com entrada aparecerão aqui.</p>
                </div>
              ) : (
                allSalesHistory.filter(sale => {
                  const down = sale.downPayment || 0;
                  const balance = sale.total - down;
                  const isPartial = balance > 0 || sale.status === 'pending';
                  if (historyFilter === 'parciais' && !isPartial) return false;
                  if (historyFilter === 'concluidos' && isPartial) return false;
                  if (historySearch.trim()) {
                    const term = historySearch.toLowerCase();
                    const nameMatch = (sale.customerName || '').toLowerCase().includes(term);
                    const idMatch = sale.id.toLowerCase().includes(term);
                    const itemMatch = sale.items?.some(i => i.name.toLowerCase().includes(term));
                    if (!nameMatch && !idMatch && !itemMatch) return false;
                  }
                  return true;
                }).map(sale => {
                  const down = sale.downPayment || 0;
                  const balance = sale.total - down;
                  const isPartial = balance > 0 || sale.status === 'pending';
                  
                  return (
                    <GlassCard key={sale.id} className="p-6 border-white/10 space-y-4 bg-slate-900/80 hover:border-white/20 transition-all relative overflow-hidden">
                      <div className="flex justify-between items-start border-b border-white/5 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white uppercase">{sale.customerName || 'Cliente de Balcão'}</h4>
                            <Badge 
                              className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5 border-none",
                                isPartial ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"
                              )}
                            >
                              {isPartial ? 'ENTRADA PAGA (FALTA SALDO)' : '100% QUITADO'}
                            </Badge>
                          </div>
                          <p className="text-[9px] text-white/30 font-mono mt-0.5">#{sale.id.slice(-8).toUpperCase()} • {format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                        
                        {sale.scheduledFor && (
                          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl px-2.5 py-1 text-right">
                            <span className="text-[7.5px] font-black uppercase text-primary-300 tracking-wider block">Entrega Agendada</span>
                            <span className="text-[9.5px] font-bold text-white">{format(new Date(sale.scheduledFor), 'dd/MM/yyyy HH:mm')}</span>
                          </div>
                        )}
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
                      <div className="flex gap-2 justify-end pt-1">
                        {isPartial && (
                          <Button
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-[9px] font-black uppercase tracking-wider px-4 h-9"
                            onClick={() => setSettleModalOrder(sale)}
                          >
                            <CheckCircle2 size={14} className="mr-1" />
                            Quitar Saldo (R$ {balance.toFixed(2).replace('.', ',')})
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-[9px] font-black uppercase tracking-wider px-3 h-9 border-white/10"
                          onClick={() => alert(`Comprovante do Pedido #${sale.id.slice(-8).toUpperCase()}\nCliente: ${sale.customerName}\nTotal: R$ ${sale.total.toFixed(2)}\nEntrada Paga: R$ ${down.toFixed(2)}\nSaldo Devedor: R$ ${balance.toFixed(2)}`)}
                        >
                          Recibo
                        </Button>
                      </div>
                    </GlassCard>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'estoque' && (
          <div className="flex-1 p-10 space-y-8 overflow-y-auto bg-slate-900/30">
            <div className="flex justify-between items-center">
               <div>
                  <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Gestão de Estoque</h2>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Sincronizado com todos os terminais</p>
               </div>
               <Button icon={PlusCircle}>Novo Lançamento</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {[
                 { label: 'Total Itens', val: '4.250', color: 'primary' },
                 { label: 'Baixo Estoque', val: '12', color: 'rose' },
                 { label: 'Valor em Mãos', val: 'R$ 82k', color: 'emerald' },
                 { label: 'Saídas Hoje', val: '142', color: 'amber' }
               ].map(stat => (
                 <GlassCard key={stat.label} className="p-6 border-white/5">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-2">{stat.label}</p>
                    <p className="text-2xl font-black text-white">{stat.val}</p>
                 </GlassCard>
               ))}
            </div>

            <GlassCard className="border-white/5 overflow-hidden">
               <table className="w-full text-left">
                  <thead className="bg-white/5 border-b border-white/5">
                     <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-white/40">Código</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-white/40">Produto</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-white/40">Estoque</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-white/40">Valor Unt.</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-white/40">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                     {products.map(p => (
                       <tr key={p.id} className="hover:bg-white/5">
                          <td className="px-6 py-4 text-xs font-bold text-white/60">{p.code}</td>
                          <td className="px-6 py-4 text-xs font-black text-white">{p.name}</td>
                          <td className="px-6 py-4 text-xs font-black text-primary-300">{p.stock} un</td>
                          <td className="px-6 py-4 text-xs font-black text-emerald-400">R$ {p.price.toFixed(2)}</td>
                          <td className="px-6 py-4"><Button variant="ghost" size="sm" icon={MoreHorizontal} /></td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </GlassCard>
          </div>
        )}

        {activeTab === 'clientes' && (
          <div className="flex-1 p-10 space-y-8 overflow-y-auto bg-slate-900/30">
             <div className="flex justify-between items-center">
               <div>
                  <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Base de Clientes</h2>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Integrado com contatos Symmetry</p>
               </div>
               <Button icon={UserPlus}>Cadastrar Lead</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[
                 { name: 'Rafael Matos', phone: '(11) 99999-9999', points: 120, sales: 5 },
                 { name: 'Maria Silva', phone: '(21) 88888-8888', points: 45, sales: 2 },
                 { name: 'João Oliveira', phone: '(19) 77777-7777', points: 280, sales: 12 }
               ].map(client => (
                 <GlassCard key={client.phone} className="p-8 border-white/5 space-y-6 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary-500/20 transition-all" />
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 rounded-[20px] bg-slate-800 flex items-center justify-center text-white font-black text-lg">
                          {client.name[0]}
                       </div>
                       <div>
                          <h4 className="text-lg font-black text-white tracking-tight">{client.name}</h4>
                          <p className="text-xs text-white/40 font-bold tracking-widest">{client.phone}</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                          <p className="text-[8px] font-black uppercase text-white/20 tracking-widest mb-1">Fidelidade</p>
                          <p className="text-sm font-black text-amber-400">{client.points} pts</p>
                       </div>
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                          <p className="text-[8px] font-black uppercase text-white/20 tracking-widest mb-1">Compras</p>
                          <p className="text-sm font-black text-primary-300">{client.sales} un</p>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <Button variant="secondary" className="flex-1 text-[9px] uppercase tracking-widest h-11" onClick={() => { setIsVerifying(true); setTimeout(() => setIsVerifying(false), 2000); }}>
                          {isVerifying ? <RefreshCw className="animate-spin" size={12} /> : 'Validar Telefone'}
                       </Button>
                       <Button className="flex-1 text-[9px] uppercase tracking-widest h-11" icon={Send}>Chat</Button>
                    </div>
                 </GlassCard>
               ))}
            </div>
          </div>
        )}

        {activeTab === 'contratos' && (
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <ContractApprovalModule currentCompany={currentCompany} />
          </div>
        )}
      </div>
      {/* Customer Modal / Em Aberto */}
      <Modal 
        isOpen={isCustomerModalOpen} 
        onClose={() => setIsCustomerModalOpen(false)} 
        title="Venda em Aberto"
      >
        <div className="space-y-6">
           <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-white/40">Selecionar Cliente</p>
              <Input icon={UserPlus} placeholder="Buscar cliente por nome ou CPF..." />
           </div>
           
           <div className="grid grid-cols-1 gap-2">
              {[
                { id: '1', name: 'Rafael Matos' },
                { id: '2', name: 'Maria Silva' },
                { id: '3', name: 'João Oliveira' },
                { id: '4', name: 'Gráfica Express Ltda' }
              ].map(c => (
                <button 
                  key={c.id} 
                  onClick={() => {
                    setSelectedCustomer(c);
                    setIsCustomerModalOpen(false);
                  }}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all flex justify-between items-center group",
                    selectedCustomer?.id === c.id ? "bg-primary-500 border-primary-400 text-white" : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10"
                  )}
                >
                  <span className="font-bold">{c.name}</span>
                  <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
           </div>
           
           <Button className="w-full h-14" onClick={() => setIsCustomerModalOpen(false)}>Confirmar Cliente</Button>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        title="Finalizar Venda"
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
                   className="text-[7.5px] sm:text-[8px] uppercase tracking-widest h-6 sm:h-7 px-2 border-white/10 shrink-0"
                   onClick={() => {
                      setIsPaymentModalOpen(false);
                      setIsCustomerModalOpen(true);
                   }}
                 >
                   Alterar
                 </Button>
              </div>

              <div className="p-2 sm:p-2.5 bg-slate-900 rounded-xl border border-white/5 flex justify-between items-center px-3 sm:px-4">
                 <div>
                    <p className="text-[7px] sm:text-[8px] font-black text-white/30 uppercase tracking-widest leading-none mb-0.5">Total a Pagar</p>
                    <p className="text-sm sm:text-lg md:text-xl font-black text-white tracking-tighter italic leading-none">R$ {total.toFixed(2).replace('.', ',')}</p>
                 </div>
                 <Badge variant="primary" className="bg-emerald-500/10 text-emerald-400 border-none font-black text-[8px] sm:text-[9px] tracking-widest uppercase py-0.5 px-2">Conferido</Badge>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 flex-1 min-h-0 overflow-hidden">

              {/* Left Side: Items & Summary Details */}
              <div className="md:col-span-5 flex flex-col justify-between min-h-0 overflow-hidden gap-1.5 sm:gap-2">
                 <div className="flex-1 flex flex-col gap-1 overflow-hidden min-h-0 bg-white/5 rounded-xl border border-white/5 p-2">
                    <p className="text-[8px] sm:text-[9px] font-black uppercase text-white/40 tracking-widest shrink-0">Resumo da Nota ({cart.length})</p>
                    <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5 min-h-[50px]">
                       {cart.map((item, idx) => (
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
                       <p className="text-[7.5px] sm:text-[8px] font-black text-white/30 uppercase tracking-widest leading-none">Pago / Entrada</p>
                       <p className="text-xs font-black text-emerald-400 mt-0.5">R$ {(downPayment === '' || typeof downPayment === 'string' ? 0 : Number(downPayment)).toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[7.5px] sm:text-[8px] font-black text-white/30 uppercase tracking-widest leading-none">Saldo Restante</p>
                       <p className={cn("text-xs font-black mt-0.5", remainingValue > 0 ? "text-rose-400" : "text-white/40")}>R$ {remainingValue.toFixed(2).replace('.', ',')}</p>
                    </div>
                 </div>
              </div>

              {/* Right Side: Payment Methods & Inputs */}
              <div className="md:col-span-7 flex flex-col justify-between min-h-0 overflow-hidden gap-1.5 sm:gap-2">
                 <div className="space-y-1 shrink-0">
                    <p className="text-[8px] sm:text-[9px] font-black uppercase text-white/30 tracking-widest px-0.5">Selecione o Recebimento</p>
                    <div className="grid grid-cols-5 gap-1">
                       {[
                         { id: 'pix', label: 'Pix', icon: QrCode },
                         { id: 'cartao_credito', label: 'Crédito', icon: CreditCard },
                         { id: 'cartao_debito', label: 'Débito', icon: Smartphone },
                         { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                         { id: 'misto', label: 'Misto', icon: Calculator },
                       ].map(m => (
                         <button 
                           key={m.id} 
                           onClick={() => {
                              setPaymentMethod(m.id as any);
                              setDownPayment(total);
                            }}
                           className={cn(
                             "p-1 sm:p-1.5 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 group cursor-pointer min-h-[40px]",
                             paymentMethod === m.id ? "bg-primary-500 border-primary-600 text-slate-900 shadow-md shadow-primary-500/10" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                           )}
                         >
                            <m.icon size={14} className={cn("transition-colors", paymentMethod === m.id ? "text-slate-900" : "text-white/60 group-hover:text-primary-300")} />
                            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-tight truncate w-full text-center">{m.label}</span>
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-1.5 sm:gap-2 shrink-0">
                    <div className="space-y-0.5">
                       <label className="text-[7.5px] sm:text-[8px] font-black text-white/40 uppercase tracking-widest block">Entrada / Recebido (R$)</label>
                       <Input 
                         type="number" 
                         step="any"
                         className="h-7 sm:h-8 text-[10px] sm:text-xs bg-slate-900/50"
                         value={downPayment === "" ? "" : downPayment} 
                         onChange={(e: any) => {
                            const val = e.target.value;
                            setDownPayment(val === "" ? "" : Number(val));
                         }}
                       />
                    </div>
                    <div className="space-y-0.5">
                       <label className="text-[7.5px] sm:text-[8px] font-black text-white/40 uppercase tracking-widest block">Ou por porcentagem (%)</label>
                       <Input 
                         type="number" 
                         step="any"
                         min={0}
                         max={100}
                         placeholder="Ex: 50"
                         className="h-7 sm:h-8 text-[10px] sm:text-xs bg-slate-900/50"
                         value={total > 0 && downPayment !== "" ? Number(((Number(downPayment) / total) * 100).toFixed(2)) : ""}
                         onChange={(e: any) => {
                            const pct = e.target.value === "" ? "" : Number(e.target.value);
                            if (pct === "") { setDownPayment(""); return; }
                            setDownPayment(Number(((total * pct) / 100).toFixed(2)));
                         }}
                       />
                    </div>
                    <div className="col-span-2 space-y-0.5">
                       <label className="text-[7.5px] sm:text-[8px] font-black text-white/40 uppercase tracking-widest block">Agendar entrega</label>
                       <Input 
                         type="datetime-local" 
                         className="h-7 sm:h-8 text-[9px] sm:text-xs bg-slate-900/50"
                         value={scheduledFor} 
                         onChange={(e: any) => setScheduledFor(e.target.value)}
                       />
                    </div>
                 </div>

                 <div className="bg-white/5 rounded-xl border border-white/5 p-2 flex-1 flex flex-col items-center justify-center text-center min-h-0 overflow-hidden relative">
                    {paymentMethod === 'pix' && !pixConfig && (
                       <div className="flex flex-col items-center justify-center gap-2 text-center p-4">
                          <AlertCircle size={24} className="text-amber-500" />
                          <p className="text-[10px] text-white/50">Nenhuma chave PIX cadastrada. Configure em Configurações → Integrações.</p>
                       </div>
                    )}
                    {paymentMethod === 'pix' && pixConfig && (() => {
                       const pixAmount = downPayment === "" || typeof downPayment === 'string' ? total : Number(downPayment);
                       const pixPayload = buildPixPayload({
                         key: pixConfig.key,
                         beneficiaryName: pixConfig.beneficiaryName,
                         city: pixConfig.city,
                         amount: pixAmount > 0 ? pixAmount : total,
                       });
                       return (
                       <div className="flex flex-col items-center justify-center gap-1.5 w-full h-full min-h-0">
                          <div className="max-h-[11vh] sm:max-h-[13vh] aspect-square bg-white rounded-lg p-1 shadow-lg flex items-center justify-center shrink-0">
                             <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixPayload)}`} alt="QR" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                          
                          <div className="w-full flex gap-1 justify-center shrink-0">
                             <button 
                                type="button"
                                onClick={() => {
                                   navigator.clipboard.writeText(pixConfig.key);
                                   alert("Chave PIX copiada!");
                                }}
                                className="text-[7.5px] font-black text-primary-300 hover:text-white uppercase tracking-wider bg-primary-500/10 px-2 py-0.5 rounded border border-primary-500/20 active:scale-95 transition-all cursor-pointer"
                             >
                                Copiar Chave
                             </button>
                             <button 
                                type="button"
                                onClick={() => {
                                   navigator.clipboard.writeText(pixPayload);
                                   alert("Código Pix Copia e Cola copiado!");
                                }}
                                className="text-[7.5px] font-black text-primary-300 hover:text-white uppercase tracking-wider bg-primary-500/10 px-2 py-0.5 rounded border border-primary-500/20 active:scale-95 transition-all cursor-pointer"
                             >
                                Copia e Cola
                             </button>
                          </div>
                       </div>
                       );
                    })()}

                    {paymentMethod === 'dinheiro' && (
                       <div className="flex flex-col items-center justify-center gap-1.5 w-full h-full p-1 min-h-0">
                          <div className="flex items-center gap-2 text-emerald-400">
                             <Banknote size={16} />
                             <span className="text-[9px] font-black uppercase tracking-wider text-white">Calculadora de Troco</span>
                          </div>
                          
                          <div className="w-full max-w-xs space-y-1">
                             <div className="flex items-center justify-between gap-2">
                                <span className="text-[7.5px] font-black text-white/40 uppercase tracking-widest">Valor Recebido</span>
                                <input 
                                   type="number"
                                   step="any"
                                   className="h-6 w-24 text-[10px] bg-slate-900/80 text-white rounded px-1.5 text-right font-bold border border-white/10"
                                   value={cashReceived === "" ? "" : cashReceived}
                                   placeholder="0,00"
                                   onChange={(e: any) => {
                                      const val = e.target.value;
                                      setCashReceived(val === "" ? "" : Number(val));
                                   }}
                                />
                             </div>
                             
                             {cashReceived !== "" && Number(cashReceived) >= downPayment && (
                                <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex justify-between items-center">
                                   <span className="text-[7.5px] font-black text-emerald-400 uppercase tracking-wider">Troco</span>
                                   <span className="text-xs font-black text-white">R$ {(Number(cashReceived) - downPayment).toFixed(2).replace('.', ',')}</span>
                                </div>
                             )}
                             {cashReceived !== "" && Number(cashReceived) < downPayment && (
                                <div className="p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg flex justify-between items-center">
                                   <span className="text-[7.5px] font-black text-rose-400 uppercase tracking-wider">Falta</span>
                                   <span className="text-xs font-bold text-white/80">R$ {(downPayment - Number(cashReceived)).toFixed(2).replace('.', ',')}</span>
                                </div>
                             )}
                          </div>
                       </div>
                    )}

                    {(paymentMethod === 'cartao_credito' || paymentMethod === 'cartao_debito') && (
                       <div className="flex flex-col items-center justify-center gap-1 py-1">
                          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 animate-pulse">
                             <Smartphone size={16} />
                          </div>
                          <h4 className="text-[10px] font-black text-white uppercase tracking-wider">Maquininha Integrada</h4>
                          <p className="text-[8px] text-white/50 leading-tight max-w-[180px]">Insira/aproxime o cartão de <span className="text-white font-bold">R$ {downPayment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                       </div>
                    )}

                    {paymentMethod === 'misto' && (
                       <div className="flex flex-col items-center justify-center gap-1 py-1 w-full">
                          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                             <Calculator size={16} />
                          </div>
                          <h4 className="text-[10px] font-black text-white uppercase tracking-wider">Pagamento Misto</h4>
                          <p className="text-[8px] text-white/50 leading-tight max-w-[180px]">Especifique os valores parcelados no campo de observações.</p>
                       </div>
                    )}
                 </div>
              </div>
           </div>

           {/* Bottom Action Bar (ALWAYS VISIBLE - NO SCROLL) */}
           <div className="flex gap-2 pt-1 border-t border-white/5 shrink-0">
              {remainingValue > 0 ? (
                <Button 
                  className="w-full h-9 sm:h-11 bg-amber-500 hover:bg-amber-400 text-slate-900 border-none shadow-lg shadow-amber-500/20 text-[9px] sm:text-[10px] font-black uppercase tracking-wider gap-2 cursor-pointer"
                  onClick={() => handleFinalize(true)}
                >
                   <Clock size={16} />
                   <span>AGENDAR ENTREGA & LANÇAR ENTRADA (R$ {(downPayment === '' ? 0 : Number(downPayment)).toFixed(2).replace('.', ',')})</span>
                </Button>
              ) : (
                <>
                  <Button 
                    variant="secondary" 
                    className="flex-1 h-9 sm:h-11 text-[8px] sm:text-[9px] uppercase font-black tracking-wider border-white/10"
                    onClick={() => handleFinalize(true)}
                  >
                    Salvar Orçamento
                  </Button>
                  <Button 
                    className="flex-[1.5] h-9 sm:h-11 bg-primary-500 hover:bg-primary-400 text-slate-900 border-none shadow-lg shadow-primary-500/20 text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider gap-1.5 cursor-pointer"
                    onClick={() => handleFinalize(false)}
                  >
                     <CheckCircle2 size={16} />
                     <span>FINALIZAR VENDA (TOTAL QUITADO)</span>
                  </Button>
                </>
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
       <div className="space-y-8 py-4">
          <div className="flex items-center gap-6 p-6 bg-white/5 rounded-[40px] border border-white/10">
             <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                <Check size={32} />
             </div>
             <div>
                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">R$ {lastFinalizedOrder?.total.toFixed(2)}</h3>
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1">
                   {lastFinalizedOrder?.status === 'pending' ? 'OS registrada nas Notas Abertas' : 'Venda concluída e integrada'}
                </p>
             </div>
          </div>

          <div className="bg-slate-900/50 rounded-[32px] p-8 border border-white/5 text-left space-y-6">
             <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h4 className="text-[10px] font-black uppercase text-primary-300 tracking-[2px]">Resumo da Nota</h4>
                <Badge variant="outline" className="font-mono text-[9px]">#{lastFinalizedOrder?.id?.slice(-8).toUpperCase()}</Badge>
             </div>
             
             <div className="space-y-3">
                {lastFinalizedOrder?.items.map((item, idx) => (
                   <div key={idx} className="flex justify-between text-xs font-bold text-white/70">
                      <span>{item.quantity}x {item.name}</span>
                      <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                   </div>
                ))}
             </div>

             <div className="pt-6 border-t border-white/5 space-y-2">
                <div className="flex justify-between text-xs text-white/40">
                   <span>Valor Total</span>
                   <span className="font-mono">R$ {lastFinalizedOrder?.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-400 font-black italic">
                   <span>Entrada Recebida</span>
                   <span className="font-mono">R$ {(lastFinalizedOrder?.downPayment ?? lastFinalizedOrder?.receivedValue ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-rose-400 font-black italic">
                   <span>Valor que Falta Pagar</span>
                   <span className="font-mono font-bold">R$ {Math.max(0, (lastFinalizedOrder?.total || 0) - (lastFinalizedOrder?.downPayment ?? lastFinalizedOrder?.receivedValue ?? 0)).toFixed(2)}</span>
                </div>
                {lastFinalizedOrder?.scheduledFor && (
                   <div className="flex justify-between text-xs text-primary-300 font-black bg-primary-500/10 p-2.5 rounded-xl border border-primary-500/20 mt-2">
                      <span>Entrega Agendada:</span>
                      <span className="font-mono">{format(new Date(lastFinalizedOrder.scheduledFor), 'dd/MM/yyyy HH:mm')}</span>
                   </div>
                )}
             </div>

             {selectedCustomer && (
               <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px]"><Users size={12} /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-white/60">{selectedCustomer.name}</p>
                    <p className="text-[9px] text-white/30">{selectedCustomer.phone || 'Sem telefone'}</p>
                  </div>
               </div>
             )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
             <Button 
               variant="secondary" 
               icon={Share2} 
               className="flex-col h-32 gap-3 py-6 text-[10px] uppercase font-black tracking-widest border-white/5 bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all"
               onClick={() => {
                  if(!lastFinalizedOrder) return;
                  const total = lastFinalizedOrder.total;
                  const down = lastFinalizedOrder.downPayment ?? lastFinalizedOrder.receivedValue ?? (lastFinalizedOrder.status === 'completed' ? total : 0);
                  const balance = Math.max(0, total - down);
                  const isPending = balance > 0 || lastFinalizedOrder.status === 'pending';
                  const itemsText = lastFinalizedOrder.items.map(i => `• ${i.quantity}x ${i.name} (R$ ${((i.area ? i.price * i.area : i.price) * i.quantity).toFixed(2).replace('.', ',')})`).join('%0A');
                  const deliveryStr = lastFinalizedOrder.scheduledFor ? `%0A📅 *Previsão de Entrega:* ${format(new Date(lastFinalizedOrder.scheduledFor), 'dd/MM/yyyy HH:mm')}` : '';
                  const text = `Olá *${lastFinalizedOrder.customerName || 'Cliente'}*!%0A%0ASegue resumo do seu pedido *#${lastFinalizedOrder.id.slice(-8).toUpperCase()}* na *${currentCompany?.name || 'Rafa Arts Graphics'}*:%0A%0A${itemsText}%0A%0A💰 *Total do Pedido:* R$ ${total.toFixed(2).replace('.', ',')}%0A✅ *Valor Recebido (Entrada):* R$ ${down.toFixed(2).replace('.', ',')}${isPending ? `%0A🔴 *Valor que Falta Pagar:* R$ ${balance.toFixed(2).replace('.', ',')}` : '%0A🎉 *Status:* 100% Quitado'}${deliveryStr}%0A%0AObrigado pela preferência!`;
                  
                  let targetPhone = selectedCustomer?.phone;
                  if (!targetPhone) {
                    targetPhone = prompt('Digite o número de WhatsApp do cliente (com DDD):') || '';
                  }
                  if (targetPhone) {
                    window.open(`https://wa.me/${targetPhone.replace(/\D/g, '')}?text=${text}`, '_blank');
                  }
               }}
             >
                Compartilhar
                <span className="text-[8px] opacity-60 lowercase font-medium text-emerald-400">Via WhatsApp</span>
             </Button>

             <Button 
               variant="secondary" 
               icon={Printer} 
               className="flex-col h-32 gap-3 py-6 text-[10px] uppercase font-black tracking-widest border-white/5 bg-white/5 hover:bg-primary-500/20 hover:text-primary-300 transition-all"
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
                       <div>Ped #${order.id.slice(-8).toUpperCase()} - ${format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}</div>
                     </div>
                     <div>
                       <strong>Cliente:</strong> ${order.customerName || 'Cliente de Balcão'}<br/>
                       ${selectedCustomer?.phone ? `<strong>Telefone:</strong> ${selectedCustomer.phone}<br/>` : ''}
                       ${order.scheduledFor ? `<strong>Previsão Entrega:</strong> ${format(new Date(order.scheduledFor), 'dd/MM/yyyy HH:mm')}<br/>` : ''}
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
               className="flex-col h-32 gap-3 py-6 text-[10px] uppercase font-black tracking-widest border-white/5 bg-white/5 hover:bg-blue-500/20 hover:text-blue-300 transition-all"
               onClick={() => {
                 if (!lastFinalizedOrder) return;
                 const order = lastFinalizedOrder;
                 const total = order.total;
                 const down = order.downPayment ?? order.receivedValue ?? (order.status === 'completed' ? total : 0);
                 const balance = Math.max(0, total - down);
                 const content = `================================================
${(currentCompany?.name || 'Rafa Arts Graphics Central').toUpperCase()}
COMPROVANTE DE PEDIDO / ORDEM DE SERVIÇO
================================================
Pedido: #${order.id.slice(-8).toUpperCase()}
Data: ${format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}
Cliente: ${order.customerName || 'Cliente de Balcão'}
${order.scheduledFor ? `Entrega Agendada Para: ${format(new Date(order.scheduledFor), 'dd/MM/yyyy HH:mm')}\n` : ''}------------------------------------------------
ITENS:
${order.items.map(i => `- ${i.quantity}x ${i.name} = R$ ${((i.area ? i.price * i.area : i.price) * i.quantity).toFixed(2).replace('.', ',')}`).join('\n')}
------------------------------------------------
TOTAL DO PEDIDO:          R$ ${total.toFixed(2).replace('.', ',')}
VALOR RECEBIDO (ENTRADA): R$ ${down.toFixed(2).replace('.', ',')}
VALOR QUE FALTA:          R$ ${balance.toFixed(2).replace('.', ',')}
STATUS:                   ${balance > 0 ? 'ENTRADA PAGA - NOTA ABERTA' : '100% QUITADO'}
================================================
Obrigado pela preferência!
`;
                 const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                 const url = URL.createObjectURL(blob);
                 const link = document.createElement('a');
                 link.href = url;
                 link.download = `Comprovante_Pedido_${order.id.slice(-8).toUpperCase()}.txt`;
                 link.click();
                 URL.revokeObjectURL(url);
               }}
             >
                Salvar
                <span className="text-[8px] opacity-60 lowercase font-medium text-blue-400">Baixar Comprovante</span>
             </Button>

             <Button 
               className="flex-col h-32 gap-3 py-6 text-[10px] uppercase font-black tracking-widest bg-primary-500 hover:bg-primary-400 text-slate-900 border-none shadow-lg shadow-primary-500/20 transition-all"
               onClick={() => {
                 setIsSuccessModalOpen(false);
                 setSelectedCustomer(null);
                 setCart([]);
                 setDownPayment(0);
                 setScheduledFor('');
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
    </div>
  );
};

// --- CONTACTS ---
export const ContactsModule = ({ currentCompany }: { currentCompany: Company | null }) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', phone: '', email: '', cpf_cnpj: '', city: '', state: '' });

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
    { key: 'full_name', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telefone' },
    { key: 'city', label: 'Cidade' },
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
        actions={<Button icon={Plus} onClick={() => setIsModalOpen(true)}>Novo Cliente</Button>}
      />
      <GlassCard className="p-4 border-white/5 bg-white/[0.02]">
        <DataTable columns={columns} data={clientes} />
      </GlassCard>
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
    isService: false
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.from('produtos').select('*').order('name', { ascending: true });
      if (!active) return;
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
      } as InventoryItem)));
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel('produtos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [currentCompany]);

  const stats = [
    { label: 'Itens Totais', val: items.length, icon: Package, color: 'text-primary-400' },
    { label: 'Estoque Baixo', val: items.filter(i => i.currentStock <= i.minStock).length, icon: AlertCircle, color: 'text-amber-500' },
    { label: 'Valor em Estoque', val: `R$ ${items.reduce((acc, i) => acc + (i.costPrice || 0) * i.currentStock, 0).toLocaleString('pt-BR')}`, icon: Banknote, color: 'text-emerald-400' },
  ];

  const columns = [
    { key: 'name', label: 'Item / Insumo', render: (v: string, row: InventoryItem) => (
      <div className="flex flex-col">
        <span className="font-bold text-white uppercase italic">{v}</span>
        <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">{row.code || 'S/C'}</span>
      </div>
    )},
    { key: 'category', label: 'Categoria', render: (v: string) => <Badge variant="outline" className="uppercase text-[9px] opacity-60">{v || 'Geral'}</Badge> },
    { key: 'currentStock', label: 'Qtd. Atual', render: (v: number, row: InventoryItem) => (
      <div className="flex items-center gap-2">
        <span className={cn("font-black", v <= (row.minStock || 0) ? "text-amber-500" : "text-white")}>{v} {row.unit}</span>
        {v <= (row.minStock || 0) && <AlertCircle size={12} className="text-amber-500 animate-pulse" />}
      </div>
    )},
    { key: 'salePrice', label: 'Preço Venda', render: (v: number) => `R$ ${v.toLocaleString('pt-BR')}` },
    { key: 'isActive', label: 'Status', render: (v: boolean) => <Badge variant={v ? 'success' : 'outline'}>{v ? 'ATIVO' : 'INATIVO'}</Badge> },
  ];

  const handleSave = async () => {
    try {
      const { error } = await supabase.from('produtos').insert({
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
      });
      if (error) throw error;
      setIsModalOpen(false);
      setFormData({ name: '', category: 'substrato', unit: 'un', currentStock: 0, minStock: 0, salePrice: 0, costPrice: 0, isActive: true, isService: false });
    } catch (err) {
      console.error(err);
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
        actions={<Button icon={Plus} onClick={() => setIsModalOpen(true)}>Novo Item</Button>}
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
        <div className="flex items-center gap-4 mb-6 px-4">
          <div className="flex-1">
            <Input icon={Search} placeholder="Filtrar por nome, código ou categoria..." />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={Filter} className="text-[10px] uppercase tracking-widest font-black">Filtrar</Button>
            <Button variant="secondary" icon={Printer} className="text-[10px] uppercase tracking-widest font-black">Relatório</Button>
          </div>
        </div>
        <DataTable columns={columns} data={items} />
      </GlassCard>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="CADASTRO DE INSUMO / PRODUTO">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input label="NOME DO ITEM" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <Input label="CÓDIGO INTERNO (SKU)" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">CATEGORIA</p>
              <select className="w-full h-12 bg-[#1a2333] border border-white/10 rounded-xl px-4 text-xs text-white outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                <option value="substrato">Substrato (Lona/Vinil/Papel)</option>
                <option value="tinta">Tintas / Toners</option>
                <option value="acabamento">Acabamento (Ilhós/Verniz)</option>
                <option value="diversos">Diversos</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">UNIDADE</p>
              <select className="w-full h-12 bg-[#1a2333] border border-white/10 rounded-xl px-4 text-xs text-white outline-none" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value as any})}>
                <option value="un">Unidade (un)</option>
                <option value="kg">Quilograma (kg)</option>
                <option value="m">Metro Linear (m)</option>
                <option value="m2">Metro Quadrado (m2)</option>
                <option value="rolo">Rolo</option>
                <option value="litro">Litro (l)</option>
              </select>
            </div>
            <Input label="PREÇO DE COMPRA (CUSTO)" type="number" prefix="R$" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} />
            <Input label="PREÇO DE VENDA" type="number" prefix="R$" value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: Number(e.target.value)})} />
            <Input label="ESTOQUE ATUAL" type="number" value={formData.currentStock} onChange={e => setFormData({...formData, currentStock: Number(e.target.value)})} />
            <Input label="ESTOQUE MÍNIMO (ALERTA)" type="number" value={formData.minStock} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} />
          </div>
          <div className="flex gap-4 pt-4">
             <Button variant="secondary" className="flex-1 h-14" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
             <Button className="flex-[2] h-14 bg-primary-500 text-slate-900 border-none shadow-xl shadow-primary-500/20" onClick={handleSave}>Salvar Item</Button>
          </div>
        </div>
      </Modal>
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
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState('');

  // Configuracao PIX (Supabase, sincronizada em tempo real)
  const [pixKey, setPixKey] = useState('');
  const [pixBeneficiary, setPixBeneficiary] = useState('');
  const [pixCity, setPixCity] = useState('Santarem');
  const [savingPix, setSavingPix] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('configuracoes').select('*').eq('company_id', 'rafa-arts').maybeSingle();
      if (data) {
        setPixKey(data.pix_key || '');
        setPixBeneficiary(data.beneficiary_name || currentCompany?.name || '');
        setPixCity(data.city || 'Santarem');
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

  const handleSavePixConfig = async () => {
    setSavingPix(true);
    try {
      const { error } = await supabase.from('configuracoes').upsert({
        company_id: 'rafa-arts',
        pix_key: pixKey,
        beneficiary_name: pixBeneficiary,
        city: pixCity,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' });
      if (error) throw error;
    } catch (err) {
      console.error('Erro ao salvar configuração PIX:', err);
      alert('Não foi possível salvar a configuração PIX.');
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
    // Realtime users list
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snap) => {
      setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser)));
    });
    return () => unsub();
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
    setEditedTabs(u.allowedTabs || ['dashboard', 'crm', 'messages', 'pos', 'contacts', 'inventory', 'services', 'production', 'settings']);
    setEditedActions(u.allowedActions || [
      'canStartNote', 'canSendSavedMessage', 'canCreateCard', 'canAddTask',
      'canStartPosSale', 'canStartRealEstateSale', 'canMoveLead',
      'canViewCustomerData', 'canViewAttachments', 'canTranscribeAudio'
    ]);
  };

  const handleSaveUserPermissions = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        name: editedName,
        email: editedEmail,
        ...(editedPassword ? { password: editedPassword } : {}),
        role: editedRole,
        allowedTabs: editedTabs,
        allowedActions: editedActions,
        updatedAt: Timestamp.now()
      });
      alert('Dados e senha do usuário atualizados no repositório!');
      setEditingUser(null);
    } catch (err) {
      console.error('Erro ao salvar permissões:', err);
      alert('Erro ao salvar permissões do usuário.');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail) {
      alert('Por favor, preencha o nome e o e-mail.');
      return;
    }
    try {
      const newUid = 'user-' + Date.now();
      const defaultTabs = ['dashboard', 'crm', 'messages', 'pos', 'contacts', 'inventory', 'services', 'production', 'settings'];
      const defaultActions = [
        'canStartNote', 'canSendSavedMessage', 'canCreateCard', 'canAddTask',
        'canStartPosSale', 'canStartRealEstateSale', 'canMoveLead',
        'canViewCustomerData', 'canViewAttachments', 'canTranscribeAudio'
      ];

      const newUserData = {
        name: newUserName,
        email: newUserEmail.trim().toLowerCase(),
        password: newUserPassword || '123456',
        role: newUserRole,
        isAdmin: newUserRole === 'admin',
        isActive: true,
        allowedTabs: defaultTabs,
        allowedActions: defaultActions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', newUid), newUserData);
      alert(`Novo usuário [${newUserName}] cadastrado com sucesso no repositório!\n\nE-mail: ${newUserEmail}\nSenha: ${newUserPassword || '123456'}\n\nEle já pode fazer login na tela inicial com essas credenciais.`);
      setIsCreateModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('atendente');
    } catch (err) {
      console.error('Erro ao criar usuário:', err);
      alert('Erro ao criar usuário no repositório.');
    }
  };

  const tabOptions = [
    { id: 'dashboard', label: 'Dashboard', desc: 'Painel de controle e faturamento consolidado' },
    { id: 'crm', label: 'Funil CRM', desc: 'Criação e movimentação de Leads / Contatos comerciais' },
    { id: 'messages', label: 'Mensagens / Chats', desc: 'Canal de atendimento direto integrado' },
    { id: 'pos', label: 'PDV Gráfica', desc: 'Faturamento rápido, caixa e vendas' },
    { id: 'contacts', label: 'Contatos', desc: 'Gestão de clientes e histórico de compras' },
    { id: 'inventory', label: 'Estoque', desc: 'Visualização de matéria-prima e produtos' },
    { id: 'services', label: 'Serviços', desc: 'Gestão de Ordens de Serviços e orçamentos' },
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
                   <div className="flex items-start gap-8">
                      <div className="w-32 h-32 rounded-3xl border-2 border-dashed border-white/10 flex items-center justify-center p-2 bg-white/5">
                         {logoUrl ? (
                           <img src={logoUrl} alt="Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                         ) : (
                           <ImageIcon size={32} className="text-white/10" />
                         )}
                      </div>
                      <div className="flex-1 space-y-4">
                         <Input 
                           label="URL da Logo (PNG/SVG)" 
                           placeholder="https://suaempresa.com/logo.png" 
                           value={logoUrl}
                           onChange={(e) => setLogoUrl(e.target.value)}
                         />
                         <p className="text-[10px] text-white/30 font-bold uppercase">Recomendado: Fundo transparente • 512x512px</p>
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
                        const allowedCount = u.allowedTabs?.length ?? 9;
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

