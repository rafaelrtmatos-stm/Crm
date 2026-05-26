import { AppContext } from '../App';
import React, { useState, useEffect, useMemo } from 'react';
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
  RealEstateSale,
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
  cn 
} from './SharedUI';
import { collection, query, where, onSnapshot, orderBy, Timestamp, addDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
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
  const { setCurrentCompany } = React.useContext(AppContext)!;

  useEffect(() => {
    if (!currentCompany) return;
    const qSales = query(collection(db, 'saleOrders'), where('companyId', '==', currentCompany.id), orderBy('createdAt', 'desc'));
    const qSvc = query(collection(db, 'services'), where('companyId', '==', currentCompany.id), orderBy('createdAt', 'desc'));
    
    const unsubSales = onSnapshot(qSales, (snap) => setRealSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as SaleOrder))));
    const unsubSvc = onSnapshot(qSvc, (snap) => setServices(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    return () => { unsubSales(); unsubSvc(); };
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
  const totalRevenue = filteredOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const totalSalesCount = filteredOrders.length;
  const pendingEntries = realSales.filter(o => o.status === 'pending');
  const pendingValue = pendingEntries.reduce((acc, o) => acc + ((o.total || 0) - (o.downPayment || 0)), 0);

  const chartData = useMemo(() => {
    const groups: Record<string, any> = {};
    filteredOrders.forEach(o => {
      const day = format(new Date(o.createdAt), 'dd/MM');
      if (!groups[day]) groups[day] = { day, total: 0, sales: 0, svcs: 0, entries: 0 };
      groups[day].total += o.total;
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

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 relative min-h-screen pb-20">
      <SectionHeader 
        title={`Dashboard RPro`} 
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
          { label: 'Faturamento', val: `R$ ${totalRevenue.toLocaleString()}`, diff: '+12%', color: 'emerald', action: () => setIsRevenueModalOpen(true) },
          { label: 'Ordem de Serviço', val: services.length.toString(), diff: 'Ativas', color: 'primary', action: () => setActiveTab?.('services') },
          { label: 'Vendas PDV', val: totalSalesCount.toString(), diff: period, color: 'amber', action: () => setActiveTab?.('pos') },
          { label: 'A Receber', val: `R$ ${pendingValue.toLocaleString()}`, diff: 'Pendentes', color: 'rose', action: () => setActiveTab?.('pos') },
          { label: 'Leads CRM', val: '24', diff: '+5', color: 'purple', action: () => setActiveTab?.('crm') },
          { label: 'SLA Ativo', val: '98%', diff: 'OK', color: 'primary', action: () => setActiveTab?.('crm') }
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
                    <div key={i} onClick={() => setActiveTab?.('services')} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group">
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-white truncate uppercase">{s.client}</span>
                          <span className="text-[10px] font-black text-primary-300 italic">R$ {(s.total || 0).toFixed(2).replace('.', ',')}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <p className="text-[9px] text-white/30 truncate max-w-[150px] italic line-clamp-1">{s.service}</p>
                          <Badge variant={s.status === 'producao' ? 'primary' : 'warning'} className="text-[8px] h-5 px-1.5 uppercase font-black">
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
        updatedAt: Timestamp.now()
      });
      setNewMessage('');
    } catch (err) {
      console.error('Falha ao enviar mensagem:', err);
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
    { id: 'note', icon: StickyNote, label: 'Nota Interna', color: 'text-amber-400', permission: permissions.canStartNote },
    { id: 'saved', icon: MessageSquare, label: 'Msg Salva', color: 'text-primary-300', permission: permissions.canSendSavedMessage },
    { id: 'card', icon: LayoutDashboard, label: 'Criar Card', color: 'text-emerald-400', permission: permissions.canCreateCard },
    { id: 'task', icon: ListTodo, label: 'Tarefa', color: 'text-purple-400', permission: permissions.canAddTask },
    { id: 'pos', icon: ShoppingBag, label: 'Venda PDV', color: 'text-blue-400', permission: permissions.canStartPosSale },
    { id: 'lot', icon: Building2, label: 'Venda Lote', color: 'text-indigo-400', permission: permissions.canStartRealEstateSale },
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
      <div className="flex border-b border-white/5 bg-white/[0.01] px-2 overflow-x-auto no-scrollbar">
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
                   <div className="flex flex-col items-center justify-center h-full opacity-20">
                      <MessageSquare size={32} className="mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Inicie a conversa</p>
                   </div>
                 )}
                 
                 {messages.map((m, idx) => {
                    const isOutgoing = m.direction === 'outgoing';
                    const timeStr = m.createdAt instanceof Timestamp ? format(m.createdAt.toDate(), 'HH:mm') : '';
                    
                    return (
                      <div key={m.id || idx} className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}>
                        <div className={cn("group space-y-1", isOutgoing ? "text-right" : "")}>
                           <div className={cn(
                             "max-w-[85%] p-3 rounded-2xl border text-xs text-white/90 leading-relaxed shadow-lg",
                             isOutgoing 
                               ? "bg-primary-500/10 rounded-br-none border-primary-500/20 text-left ml-auto" 
                               : "bg-white/10 rounded-bl-none border-white/5"
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
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-slate-100/50 border-t border-white/10">
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
          title="Funil RPro" 
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
          <div className="flex gap-6 overflow-x-auto pb-6 grow custom-scrollbar min-h-[500px]">
            {stages.map(stage => (
              <KanbanColumn 
                key={stage.id} 
                stage={stage} 
                leads={leads.filter(l => l.funnelStageId === stage.id)}
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
              className="min-w-[280px] h-[calc(100vh-25rem)] border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center justify-center opacity-20 hover:opacity-100 hover:bg-white/5 transition-all text-white/40"
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
    <div className="min-w-[280px] w-full flex flex-col gap-4">
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
               <Phone size={10} className="text-emerald-400 opacity-20" />
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

  useEffect(() => {
    if (!currentCompany) return;
    const q = query(
      collection(db, 'leads'),
      where('companyId', '==', currentCompany.id),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead)));
    });
  }, [currentCompany]);

  const filteredLeads = leads.filter(l => 
    l.fullName.toLowerCase().includes(filter.toLowerCase()) || 
    l.phone.includes(filter)
  );

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-8 animate-in fade-in slide-in-from-right-5 duration-500">
      <GlassCard className="w-96 p-0 overflow-hidden flex flex-col bg-white/5 border-white/10 shrink-0">
        <div className="p-6 border-b border-white/10 space-y-4">
           <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Conversas</h3>
              <div 
                onClick={() => setAutoTranscribe(!autoTranscribe)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all",
                  autoTranscribe ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/10 text-white/30"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", autoTranscribe ? "bg-emerald-400" : "bg-white/20")} />
                <span className="text-[10px] font-black uppercase tracking-widest">Transcrição: {autoTranscribe ? 'ON' : 'OFF'}</span>
              </div>
           </div>
           <Input icon={Search} placeholder="Filtrar chats..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredLeads.map(l => {
            const lastUpdate = l.updatedAt instanceof Timestamp ? l.updatedAt.toDate() : new Date(l.updatedAt);
            const timeStr = format(lastUpdate, 'HH:mm');
            const isSelected = selectedChat?.id === l.id;

            return (
              <div 
                key={l.id} 
                onClick={() => setSelectedChat({ ...l, name: l.fullName })}
                className={cn(
                  "p-5 border-b border-white/5 cursor-pointer transition-all group relative",
                  isSelected ? "bg-primary-500/10" : "hover:bg-white/5"
                )}
              >
                 {isSelected && <div className="absolute left-0 top-0 w-1 h-full bg-primary-500" />}
                 <div className="flex justify-between items-start mb-1">
                    <p className={cn("font-bold transition-colors", isSelected ? "text-primary-300" : "text-white group-hover:text-primary-300")}>{l.fullName}</p>
                    <span className="text-[10px] font-black text-white/30 uppercase">{timeStr}</span>
                 </div>
                 <p className="text-xs text-white/40 truncate">{l.lastMessageText || 'Sem mensagens'}</p>
                 <div className="mt-4 flex items-center gap-2">
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
  const [activeTab, setActiveTab] = useState<'venda' | 'estoque' | 'clientes'>('venda');
  const [cart, setCart] = useState<SaleOrderItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastFinalizedOrder, setLastFinalizedOrder] = useState<SaleOrder | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string, name: string, phone: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito'>('pix');
  const [downPayment, setDownPayment] = useState(0);
  const [scheduledFor, setScheduledFor] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

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

  const total = cart.reduce((acc, item) => {
    const itemTotal = item.area ? item.price * item.area * item.quantity : item.price * item.quantity;
    return acc + itemTotal;
  }, 0);
  const remainingValue = Math.max(0, total - downPayment);

  const handleFinalize = async (isPending: boolean = false) => {
    if (!selectedCustomer && cart.length > 0) {
      if (isPending) {
        setIsCustomerModalOpen(true);
        return;
      }
    }

    // Play money sound
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/936/936-preview.mp3');
      audio.play().catch(() => {});
    } catch (e) {}

    const order: SaleOrder = {
      id: `ord_${Date.now()}`,
      companyId: currentCompany?.id || 'default',
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name || 'Cliente de Balcão',
      items: [...cart],
      total,
      downPayment: downPayment > 0 ? downPayment : total,
      paymentMethod,
      status: isPending || remainingValue > 0 ? 'pending' : 'completed',
      createdAt: new Date().toISOString(),
      scheduledFor: scheduledFor || undefined
    };

    // Save to Firestore
    try {
      await addDoc(collection(db, 'saleOrders'), order);
      
      // RULE: Always create Service/OS if pending or has balance OR specific items
      const hasServiceItems = cart.some(item => 
        ['1', '5', '6'].includes(item.productId) || 
        item.name.toLowerCase().includes('banner') || 
        item.name.toLowerCase().includes('adesivo') ||
        item.name.toLowerCase().includes('serviço')
      );

      if (hasServiceItems || remainingValue > 0 || isPending) {
        await addDoc(collection(db, 'services'), {
          companyId: currentCompany?.id,
          orderId: order.id,
          client: order.customerName,
          phone: selectedCustomer?.phone || '',
          service: cart.map(i => `${i.quantity}x ${i.name}`).join(', '),
          status: 'pendente',
          priority: 'normal',
          total: order.total,
          balance: remainingValue,
          scheduledFor: scheduledFor || null,
          createdAt: Timestamp.now()
        });
        console.log('Ordem de Serviço gerada.');
      }
    } catch (err) {
      console.error('Erro ao salvar venda:', err);
    }

    if (isPending || remainingValue > 0) {
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

  return (
    <div className="h-[calc(100vh-12rem)] min-h-[600px] flex flex-col bg-slate-900/50 rounded-[40px] shadow-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-right-5 duration-500">
      {/* Tab Navigation */}
      <div className="flex bg-white/5 p-2 gap-2 border-b border-white/10 items-center justify-between">
        <div className="flex gap-2">
          {[
            { id: 'venda', label: 'Terminal Venda', icon: ShoppingBag },
            { id: 'estoque', label: 'Estoque / Produtos', icon: Box },
            { id: 'clientes', label: 'Clientes / CRM', icon: Users }
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
            {/* Left Column: POS Display */}
            <div className="flex-1 bg-[#fef9c3] flex flex-col items-center justify-center p-12 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center text-slate-900/40">
                  <p className="text-[10px] font-black uppercase tracking-[4px]">RPro POS Terminal</p>
                  <p className="text-[10px] font-black uppercase tracking-[4px]">#001-ALPHA</p>
               </div>
               
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 key={cart.length}
                 className="text-center space-y-6"
               >
                  {cart.length === 0 ? (
                     <h1 className="text-[8vw] font-black text-slate-900 leading-none tracking-tighter uppercase italic drop-shadow-sm">
                        Livre
                     </h1>
                  ) : (
                     <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[5px] text-slate-900/30">Valor Total</p>
                        <h1 className="text-[10vw] font-black text-slate-900 leading-none tracking-tighter italic">
                           R$ {total.toFixed(2).replace('.', ',')}
                        </h1>
                        <Badge className="bg-slate-900 text-white border-none py-2 px-6 rounded-full font-black uppercase tracking-widest text-[10px]">
                           {cart.length} Itens em Carrinho
                        </Badge>
                     </div>
                  )}
               </motion.div>

               <div className="absolute bottom-0 left-0 w-full p-8 border-t border-slate-900/5 bg-slate-900/5 backdrop-blur-sm">
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                           <Check size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-900/40 leading-none">Status Automação</p>
                          <p className="text-xs font-bold text-slate-900 italic tracking-tight underline decoration-emerald-500/30">Modulo Vendas Conectado</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-slate-900/40 uppercase tracking-widest leading-none">Faturamento Hoje</p>
                        <p className="text-xs font-black text-slate-900">R$ 4.250,00</p>
                     </div>
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
                       onClick={() => setIsPaymentModalOpen(true)}
                       className="flex-[2] h-full bg-primary-500 border-2 border-primary-600 text-slate-900 rounded-[28px] flex flex-col items-center justify-center gap-1 shadow-xl shadow-primary-500/20 hover:bg-primary-400 transition-all disabled:opacity-50 disabled:grayscale active:scale-95"
                     >
                        <div className="flex items-center gap-3">
                           <ShoppingBag size={24} />
                           <span className="text-lg font-black uppercase tracking-tighter">PAGAMENTO</span>
                        </div>
                        <span className="text-[10px] font-black opacity-40 uppercase tracking-[4px]">Ir para fechamento</span>
                     </button>
                  </div>
               </div>
            </div>
          </>
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
      >
        <div className="flex flex-col gap-4 max-h-[85vh] overflow-hidden">
           {/* Top Info Bar: Customer & Summary combined */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex gap-3 items-center">
                 <div className="w-10 h-10 rounded-xl bg-primary-500/20 text-primary-300 flex items-center justify-center border border-primary-500/30">
                    <UserCheck size={20} />
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/30 leading-none mb-1">Cliente Atendido</p>
                    <p className="text-xs font-black text-white truncate">{selectedCustomer ? selectedCustomer.name : 'Cliente de Balcão'}</p>
                 </div>
                 <Button 
                   variant="secondary" 
                   size="sm" 
                   className="text-[8px] uppercase tracking-widest h-8 px-3 border-white/10"
                   onClick={() => {
                      setIsPaymentModalOpen(false);
                      setIsCustomerModalOpen(true);
                   }}
                 >
                   Alterar
                 </Button>
              </div>

              <div className="p-4 bg-slate-900 rounded-2xl border border-white/5 flex justify-between items-center px-6">
                 <div>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Total a Pagar</p>
                    <p className="text-xl font-black text-white tracking-tighter italic">R$ {total.toFixed(2).replace('.', ',')}</p>
                 </div>
                 <Badge variant="primary" className="bg-emerald-500/10 text-emerald-400 border-none font-black text-[10px] tracking-widest uppercase">Conferido</Badge>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start overflow-hidden">

              {/* Left Side: Items & Summary Details */}
              <div className="md:col-span-5 space-y-4 flex flex-col overflow-hidden h-full">
                 <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
                    <p className="text-[9px] font-black uppercase text-white/30 tracking-widest px-1">Resumo da Nota ({cart.length})</p>
                    <div className="flex-1 bg-white/5 rounded-2xl border border-white/5 overflow-y-auto custom-scrollbar divide-y divide-white/5 max-h-[220px]">
                       {cart.map((item, idx) => (
                          <div key={idx} className="p-3 flex justify-between items-center hover:bg-white/5 transition-colors">
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-white/30">{item.quantity}x</span>
                                <div className="flex flex-col">
                                   <span className="text-[10px] font-bold text-white/70 uppercase truncate max-w-[120px]">{item.name}</span>
                                   {item.dimensions && (
                                      <span className="text-[8px] text-white/40 font-black tracking-widest uppercase">
                                         {item.dimensions} = {item.area?.toFixed(2).replace('.', ',')} m²
                                      </span>
                                   )}
                                </div>
                             </div>
                             <span className="text-[10px] font-black text-primary-300 italic">R$ {(item.area ? item.price * item.area * item.quantity : item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="p-4 bg-white/3 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                       <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Pago / Entrada</p>
                       <p className="text-xs font-black text-emerald-400">R$ {downPayment > 0 ? downPayment.toFixed(2).replace('.', ',') : (total > 0 ? total.toFixed(2).replace('.', ',') : '0,00')}</p>
                    </div>
                    <div className="flex justify-between items-center opacity-60">
                       <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Saldo Restante</p>
                       <p className={cn("text-xs font-black", remainingValue > 0 ? "text-rose-400" : "text-white/40")}>R$ {remainingValue.toFixed(2).replace('.', ',')}</p>
                    </div>
                 </div>
              </div>

              {/* Right Side: Payment Methods & Inputs */}
              <div className="md:col-span-7 space-y-6 flex flex-col overflow-y-auto custom-scrollbar max-h-[480px] pr-2">
                 <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase text-white/30 tracking-widest px-1">Selecione o Recebimento</p>
                    <div className="grid grid-cols-3 gap-2">
                       {[
                         { id: 'pix', label: 'Pix QR', icon: QrCode },
                         { id: 'cartao_credito', label: 'Crédito', icon: CreditCard },
                         { id: 'cartao_debito', label: 'Débito', icon: Smartphone },
                         { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                         { id: 'misto', label: 'Misto', icon: Calculator },
                       ].map(m => (
                         <button 
                           key={m.id} 
                           onClick={() => setPaymentMethod(m.id as any)}
                           className={cn(
                             "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 group",
                             paymentMethod === m.id ? "bg-primary-500 border-primary-600 text-slate-900 shadow-lg shadow-primary-500/10" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                           )}
                         >
                            <m.icon size={18} className={cn("transition-colors", paymentMethod === m.id ? "text-slate-900" : "text-white/60 group-hover:text-primary-300")} />
                            <span className="text-[8px] font-black uppercase tracking-widest">{m.label}</span>
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
                       <Input 
                         label="Valor de Entrada"
                         type="number" 
                         className="h-10 text-xs bg-slate-900/50"
                         value={downPayment} 
                         onChange={(e: any) => setDownPayment(Number(e.target.value))}
                       />
                       <div className="space-y-2">
                          <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Agendar entrega</p>
                          <Input 
                            type="datetime-local" 
                            className="h-10 text-xs bg-slate-900/50"
                            value={scheduledFor} 
                            onChange={(e: any) => setScheduledFor(e.target.value)}
                          />
                       </div>
                    </div>

                    <div className="bg-white/5 rounded-2xl border border-white/5 p-4 flex flex-col items-center justify-center text-center">
                       {paymentMethod === 'pix' && (
                          <div className="flex flex-col items-center gap-4">
                             <div className="w-64 h-64 bg-white rounded-3xl p-4 shadow-2xl flex items-center justify-center">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=RPro-Pix-${total}`} alt="QR" className="w-full h-full" referrerPolicy="no-referrer" />
                             </div>
                             <p className="text-[10px] text-primary-400 font-black uppercase tracking-widest mt-2 animate-pulse">Aponte a câmera para pagar</p>
                          </div>
                       )}
                       <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest text-center mt-2">Confirmação de Recebimento</p>
                    </div>
                 </div>

                 <div className="flex gap-3 pt-2">
                    <Button 
                      variant="secondary" 
                      className="flex-1 h-12 text-[9px] uppercase font-black tracking-widest border-white/5"
                      onClick={() => handleFinalize(true)}
                    >
                      {remainingValue > 0 ? 'Lançar Entrada' : 'Lançar Pendente'}
                    </Button>
                    <Button 
                      className="flex-[1.5] h-12 bg-primary-500 text-slate-900 border-none shadow-xl shadow-primary-500/20 text-[9px] font-black uppercase tracking-widest"
                      onClick={() => handleFinalize(false)}
                    >
                       {remainingValue > 0 ? 'Salvar OS e Entrada' : 'Finalizar e Integrar'}
                    </Button>
                 </div>
              </div>
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
                   <span className="font-mono">R$ {lastFinalizedOrder?.receivedValue?.toFixed(2)}</span>
                </div>
                {lastFinalizedOrder?.status === 'pending' && (
                   <div className="flex justify-between text-xs text-rose-400 font-black italic">
                      <span>Saldo em Aberto (OS)</span>
                      <span className="font-mono">R$ {(lastFinalizedOrder.total - (lastFinalizedOrder.receivedValue || 0)).toFixed(2)}</span>
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
               className={cn(
                 "flex-col h-32 gap-3 py-6 text-[10px] uppercase font-black tracking-widest border-white/5 bg-white/5",
                 !selectedCustomer?.phone && "opacity-50 grayscale cursor-not-allowed"
               )}
               onClick={() => {
                  if(selectedCustomer?.phone && lastFinalizedOrder) {
                     const itemsText = lastFinalizedOrder.items.map(i => `${i.quantity}x ${i.name}`).join('%0A');
                     const balance = lastFinalizedOrder.total - (lastFinalizedOrder.receivedValue || 0);
                     const text = `Olá ${selectedCustomer.name}, segue resumo do seu pedido RPro:%0A%0A${itemsText}%0A%0ATotal: R$ ${lastFinalizedOrder.total.toFixed(2)}${lastFinalizedOrder.status === 'pending' ? `%0AEntrada: R$ ${lastFinalizedOrder.receivedValue?.toFixed(2)}%0ASaldo em Aberto: R$ ${balance.toFixed(2)}` : ''}%0A%0AObrigado pela preferência!`;
                     window.open(`https://wa.me/${selectedCustomer.phone.replace(/\D/g,'')}?text=${text}`);
                  }
               }}
             >
                WhatsApp
                <span className="text-[8px] opacity-40 lowercase font-medium text-emerald-400">Enviar Nota</span>
             </Button>

             <Button 
               variant="secondary" 
               icon={Printer} 
               className="flex-col h-32 gap-3 py-6 text-[10px] uppercase font-black tracking-widest border-white/5 bg-white/5"
               onClick={() => window.print()}
             >
                Imprimir
                <span className="text-[8px] opacity-40 lowercase font-medium text-primary-400">Via Balcão</span>
             </Button>

             <Button 
               variant="secondary" 
               icon={Download} 
               className="flex-col h-32 gap-3 py-6 text-[10px] uppercase font-black tracking-widest border-white/5 bg-white/5"
               onClick={() => {
                 alert('Gerando PDF da Nota Fiscal... O download iniciará em instantes.');
               }}
             >
                Baixar
                <span className="text-[8px] opacity-40 lowercase font-medium text-primary-400">PDF Final</span>
             </Button>

             <Button 
               className="flex-col h-32 gap-3 py-6 text-[10px] uppercase font-black tracking-widest bg-primary-500 text-slate-900 border-none shadow-lg shadow-primary-500/20"
               onClick={() => {
                 setIsSuccessModalOpen(false);
                 setSelectedCustomer(null);
               }}
             >
                Nova Venda
                <span className="text-[8px] opacity-50 lowercase font-medium">Limpar Caixa</span>
             </Button>
          </div>

          {!selectedCustomer?.phone && (
             <p className="text-[10px] text-rose-400/60 font-black uppercase tracking-widest italic animate-pulse text-center">
               Cadastre o cliente para compartilhar no WhatsApp.
             </p>
          )}
       </div>
     </Modal>
    </div>
  );
};

// --- CONTACTS ---
export const ContactsModule = ({ currentCompany }: { currentCompany: Company | null }) => {
  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telefone' },
    { key: 'tags', label: 'Tags', render: (v: string[]) => <div className="flex gap-1">{v.map(t => <Badge key={t} variant="outline" className="text-[8px]">{t}</Badge>)}</div> },
  ];

  const data = [
    { id: '1', name: 'Rafael Matos', email: 'rafael@email.com', phone: '(11) 99999-9999', tags: ['vip', 'imobi'] },
    { id: '2', name: 'Maria Silva', email: 'maria@email.com', phone: '(21) 88888-8888', tags: ['lead', 'grafica'] },
    { id: '3', name: 'João Tech', email: 'joao@tech.com', phone: '(19) 77777-7777', tags: ['parceiro'] },
  ];

  return <GenericListView title="Base de Contatos" subtitle="Gestão unificada de clientes" columns={columns} data={data} />;
};

// --- SERVICES ---
export const ServicesModule = ({ currentCompany }: { currentCompany: Company | null }) => {
  const [services, setServices] = useState<any[]>([]);

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

  const columns = [
    { key: 'orderId', label: 'OS / Pedido', render: (v: string) => <span className="font-mono text-[10px] opacity-40">#{v?.slice(-6)}</span> },
    { key: 'client', label: 'Cliente' },
    { key: 'service', label: 'Serviço' },
    { key: 'status', label: 'Status', render: (v: string) => (
      <Badge variant={v === 'producao' ? 'primary' : v === 'pendente' ? 'warning' : 'success'}>
        {v === 'producao' ? 'Em Produção' : v === 'pendente' ? 'Aguardando' : 'Finalizado'}
      </Badge>
    )},
    { key: 'createdAt', label: 'Data', render: (v: any) => v?.toDate ? format(v.toDate(), 'dd/MM HH:mm') : 'Agora' },
  ];

  return <GenericListView title="Gestão de Serviços" subtitle="Ordens de Serviço Originadas no PDV" columns={columns} data={services} />;
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
    if (!currentCompany) return;
    const q = query(
      collection(db, 'inventory'),
      where('companyId', '==', currentCompany.id),
      orderBy('name', 'asc')
    );
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
      setLoading(false);
    });
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
    if (!currentCompany) return;
    try {
      await addDoc(collection(db, 'inventory'), {
        ...formData,
        companyId: currentCompany.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
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
export const SettingsModule = ({ currentCompany }: { currentCompany: Company | null }) => {
  const [activeTab, setActiveTab] = useState('Geral');
  const [logoUrl, setLogoUrl] = useState(currentCompany?.logoUrl || '');
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState('');

  useEffect(() => {
    if (!currentCompany) return;
    const q = query(collection(db, 'funnels'), where('companyId', '==', currentCompany.id));
    getDocs(q).then(snap => {
      setFunnels(snap.docs.map(d => ({ id: d.id, ...d.data() } as Funnel)));
    });
  }, [currentCompany]);

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

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <SectionHeader 
        title="Configurações Hub" 
        subtitle="Ajustes do ecossistema RPro" 
        actions={<Button icon={Save} onClick={handleSave}>Salvar Tudo</Button>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <GlassCard className="p-0 overflow-hidden h-fit border-white/5">
           {['Geral', 'Identidade', 'CRM / Funis', 'Integrações', 'Backup'].map((tab) => (
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
                   <h3 className="text-xl font-bold text-white tracking-tight italic uppercase">Cores do Tema</h3>
                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                         <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">Cor Primária</p>
                         <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary-500 border-2 border-white/20 shadow-xl shadow-primary-500/20" />
                            <Input value="#4cc9f0" className="w-32 h-12 text-center" />
                         </div>
                      </div>
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
                      <Input label="Chave PIX" defaultValue="44.222.111/0001-99" />
                      <Input label="Nome do Beneficiário" defaultValue={currentCompany?.name} />
                   </div>
                </div>
             </div>
           )}
        </GlassCard>
      </div>
    </div>
  );
};
