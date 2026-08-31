import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, 
  Trash2, 
  Percent, 
  User, 
  FileText, 
  CheckCircle2, 
  Search, 
  Plus, 
  RefreshCw, 
  LogOut, 
  DollarSign, 
  Printer, 
  Calendar, 
  Clock, 
  Layers, 
  FileCheck, 
  Package, 
  Users, 
  AlertCircle, 
  ChevronRight,
  Filter,
  Eye,
  Send,
  X,
  CreditCard,
  QrCode,
  Banknote,
  Share2,
  Download,
  Receipt,
  ArrowUpDown
} from 'lucide-react';
import { supabase } from '../supabase';
import { showAlert, showConfirm } from '../lib/notify';
import { Company, Product, SaleOrder, CartItem, PaymentEntry, AppUser } from '../types';
import { Badge, Button, Input, Modal, GlassCard, ModuleErrorBoundary } from './SharedUI';
import { InventoryModule } from './InventoryModule';
import { useApp } from '../AppContext';

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

interface POSModuleProps {
  currentCompany: Company | null;
  addPendingOrder?: (order: SaleOrder) => void;
}

export const POSModule = ({ currentCompany, addPendingOrder }: POSModuleProps) => {
  const { 
    user, 
    isRegisterOpen, 
    setIsRegisterOpen, 
    prefilledCustomer, 
    setPrefilledCustomer,
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
    openWhatsAppChat
  } = useApp();

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'venda' | 'historico' | 'servicos' | 'orcamentos' | 'contratos' | 'estoque' | 'clientes'>('venda');

  // Handle external triggers from AppContext
  useEffect(() => {
    if (pendingGoToHistorico) {
      setActiveTab('historico');
      setPendingGoToHistorico(false);
    }
    if (pendingGoToServicos) {
      setActiveTab('servicos');
      setPendingGoToServicos(false);
    }
  }, [pendingGoToHistorico, pendingGoToServicos, setPendingGoToHistorico, setPendingGoToServicos]);

  // Cart & POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id?: string; name: string; phone?: string } | null>(null);
  const [saleDiscountValue, setSaleDiscountValue] = useState<number>(0);
  const [saleCreditApplied, setSaleCreditApplied] = useState<number>(0);
  const [orderObservacoes, setOrderObservacoes] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSaleDiscountModalOpen, setIsSaleDiscountModalOpen] = useState(false);
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [viewingReceiptOrder, setViewingReceiptOrder] = useState<SaleOrder | null>(null);
  const [isNotaObservacoesModalOpen, setIsNotaObservacoesModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastFinalizedOrder, setLastFinalizedOrder] = useState<SaleOrder | null>(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settlingOrder, setSettlingOrder] = useState<SaleOrder | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito'>('pix');

  // Dimension Modal (m2 / metro)
  const [dimensionModalProduct, setDimensionModalProduct] = useState<Product | null>(null);
  const [dimWidth, setDimWidth] = useState('');
  const [dimHeight, setDimHeight] = useState('');
  const [dimQuantity, setDimQuantity] = useState(1);

  // Products and Insumos Data
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<Date>(new Date());

  // Customers Data
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  // Sales History Data
  const [allSalesHistory, setAllSalesHistory] = useState<SaleOrder[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');

  // Services / OS Data
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [serviceStatusFilter, setServiceStatusFilter] = useState('all');

  // Orcamentos & Contratos
  const [orcamentosList, setOrcamentosList] = useState<any[]>([]);
  const [contratosList, setContratosList] = useState<any[]>([]);

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'boleto' | 'cheque'>('pix');
  const [downPayment, setDownPayment] = useState<number | ''>('');
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<string>('pix');
  const [isSavingSale, setIsSavingSale] = useState(false);

  // Quick Product Form
  const [quickProductName, setQuickProductName] = useState('');
  const [quickProductPrice, setQuickProductPrice] = useState('');
  const [quickProductUnit, setQuickProductUnit] = useState<'un' | 'm2' | 'metro'>('un');
  const [quickProductCategory, setQuickProductCategory] = useState('');

  // Handle prefilled customer from other modules
  useEffect(() => {
    if (prefilledCustomer) {
      setSelectedCustomer(prefilledCustomer);
      setPrefilledCustomer(null);
    }
  }, [prefilledCustomer, setPrefilledCustomer]);

  // Handle open receipt by ID from other modules
  useEffect(() => {
    if (pendingReceiptOpenId) {
      const order = allSalesHistory.find(s => s.id === pendingReceiptOpenId);
      if (order) {
        setViewingReceiptOrder(order);
        setIsReceiptModalOpen(true);
      }
      setPendingReceiptOpenId(null);
    }
  }, [pendingReceiptOpenId, allSalesHistory, setPendingReceiptOpenId]);

  // Handle client filter from other modules
  useEffect(() => {
    if (pendingHistoryClientFilter) {
      setHistorySearch(pendingHistoryClientFilter.clienteName);
      setActiveTab('historico');
      setPendingHistoryClientFilter(null);
    }
  }, [pendingHistoryClientFilter, setPendingHistoryClientFilter]);

  // Handle product search filter
  useEffect(() => {
    if (pendingHistoryProductSearch) {
      setProductSearch(pendingHistoryProductSearch);
      setActiveTab('venda');
      setPendingHistoryProductSearch(null);
    }
  }, [pendingHistoryProductSearch, setPendingHistoryProductSearch]);

  // Handle receivables filter
  useEffect(() => {
    if (pendingReceivablesFilter) {
      setHistoryStatusFilter('pending');
      setActiveTab('historico');
      setPendingReceivablesFilter(false);
    }
  }, [pendingReceivablesFilter, setPendingReceivablesFilter]);

  // Load Products
  const loadProducts = async () => {
    try {
      let query = supabase.from('produtos').select('*').order('name', { ascending: true });
      let { data, error } = await query;
      if (error) {
        // Fallback without order
        const fallback = await supabase.from('produtos').select('*');
        data = fallback.data;
      }
      setProducts((data || []).map((p: any) => ({
        id: p.id,
        name: p.name || p.nome || 'Produto',
        code: p.code || p.codigo || '',
        price: Number(p.sale_price ?? p.preco ?? p.price ?? 0),
        costPrice: Number(p.cost_price ?? p.preco_custo ?? 0),
        stock: Number(p.current_stock ?? p.estoque ?? p.stock ?? 0),
        unitType: (p.unit === 'm2' || p.unidade === 'm2') ? 'm2' : (p.unit === 'etiqueta' || p.unidade === 'etiqueta') ? 'etiqueta' : (p.unit === 'm' || p.unidade === 'm' || p.unit === 'metro') ? 'metro' : 'unit',
        tipoItem: p.tipo_item || 'produto',
        larguraRolo: p.largura_rolo ? Number(p.largura_rolo) : undefined,
        category: p.category || p.categoria || 'Geral',
        materiasPrimas: p.materias_primas || p.materiasPrimas || []
      })));
      setSyncedAt(new Date());
    } catch (err) {
      console.warn('Erro ao carregar produtos:', err);
    }
  };

  // Load Customers
  const loadCustomers = async () => {
    try {
      let query = supabase.from('clientes').select('*').order('full_name', { ascending: true });
      let { data, error } = await query;
      if (error) {
        // Fallback without order or filter
        const fallback = await supabase.from('clientes').select('*');
        data = fallback.data;
      }
      setCustomers((data || []).map((c: any) => ({
        id: c.id,
        name: c.full_name || c.nome || c.name || 'Cliente',
        phone: c.phone || c.telefone || '',
        email: c.email || '',
        cpf_cnpj: c.cpf_cnpj || '',
        saldo_credito: Number(c.saldo_credito) || 0
      })));
    } catch (err) {
      console.warn('Erro ao carregar clientes:', err);
      setCustomers([]);
    }
  };

  // Load Sales History
  const loadSalesHistory = async () => {
    try {
      const { data, error } = await supabase.from('vendas').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((v: any) => ({
        id: v.id,
        companyId: v.company_id || 'rafa-arts',
        customerId: v.cliente_id || v.customer_id,
        customerName: v.customer_name || 'Cliente de Balcão',
        customerPhone: v.customer_phone || '',
        items: v.items || [],
        total: Number(v.total) || 0,
        discountValue: Number(v.discount_value) || 0,
        downPayment: Number(v.down_payment) || 0,
        receivedValue: Number(v.received_value) || 0,
        paymentMethod: v.payment_method || 'pix',
        payments: v.payments || [],
        status: v.status || 'completed',
        scheduledFor: v.scheduled_for,
        observacoes: v.observacoes,
        createdAt: v.created_at,
        updatedAt: v.updated_at
      }));
      setAllSalesHistory(mapped);
    } catch (err) {
      console.warn('Erro ao carregar histórico de vendas:', err);
    }
  };

  // Load Services (OS)
  const loadServices = async () => {
    try {
      // First try comissoes_servicos (commissioned/scheduled services table)
      const { data: comissoesData, error: comissoesError } = await supabase
        .from('comissoes_servicos')
        .select('*')
        .is('deleted_at', null)
        .order('data', { ascending: false });

      if (!comissoesError && comissoesData && comissoesData.length > 0) {
        setServicesList(comissoesData.map((s: any) => ({
          id: s.id,
          title: s.servico_nome || 'Serviço',
          service_name: s.servico_nome || 'Serviço',
          customer_name: s.cliente_nome || 'Cliente Balcão',
          status: s.status || 'pedido_recebido',
          value: Number(s.valor_servico) || 0,
          created_at: s.data || s.created_at
        })));
        return;
      }

      // Fallback to vendas
      const { data: vendasData } = await supabase
        .from('vendas')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (vendasData) {
        setServicesList(vendasData.map((v: any) => ({
          id: v.id,
          title: v.items?.[0]?.name ? `${v.items[0].name}${v.items.length > 1 ? ` (+${v.items.length - 1})` : ''}` : 'Ordem de Serviço',
          service_name: v.items?.[0]?.name || 'Serviço',
          customer_name: v.customer_name || 'Cliente Balcão',
          status: v.service_status || (v.status === 'completed' ? 'entregue' : 'pedido_recebido'),
          value: Number(v.total) || 0,
          created_at: v.created_at
        })));
      }
    } catch (err) {
      console.warn('Serviços carregados com fallback:', err);
      setServicesList([]);
    }
  };

  // Load Orcamentos
  const loadOrcamentos = async () => {
    try {
      const { data, error } = await supabase.from('orcamentos').select('*').order('created_at', { ascending: false });
      if (error) {
        setOrcamentosList([]);
        return;
      }
      setOrcamentosList(data || []);
    } catch {
      setOrcamentosList([]);
    }
  };

  // Load Contratos
  const loadContratos = async () => {
    try {
      const { data, error } = await supabase.from('contratos').select('*').order('created_at', { ascending: false });
      if (error) {
        setContratosList([]);
        return;
      }
      setContratosList(data || []);
    } catch {
      setContratosList([]);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCustomers();
    loadSalesHistory();
    loadServices();
    loadOrcamentos();
    loadContratos();

    const channel = supabase
      .channel('pos-realtime-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, loadSalesHistory)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, loadProducts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, loadCustomers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comissoes_servicos' }, loadServices)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await Promise.all([loadProducts(), loadCustomers(), loadSalesHistory(), loadServices(), loadOrcamentos(), loadContratos()]);
    setIsSyncing(false);
  };

  // Total Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const itemPrice = item.area ? item.price * item.area * item.quantity : item.price * item.quantity;
      return acc + itemPrice - (item.discountValue || 0);
    }, 0);
  }, [cart]);

  const total = useMemo(() => {
    return Math.max(0, cartSubtotal - saleDiscountValue - saleCreditApplied);
  }, [cartSubtotal, saleDiscountValue, saleCreditApplied]);

  // Cart Handlers
  const handleAddProductToCart = (product: Product) => {
    if (product.unitType === 'm2' || product.unitType === 'metro') {
      setDimensionModalProduct(product);
      setDimWidth('');
      setDimHeight('');
      setDimQuantity(1);
      return;
    }

    const itemConsumo = (product.materiasPrimas && product.materiasPrimas.length > 0)
      ? product.materiasPrimas.map((mp: any) => ({
          materiaPrimaId: mp.materiaPrimaId,
          name: mp.name,
          unit: mp.unit,
          quantity: Number((mp.quantity * 1).toFixed(4)),
          costPrice: mp.costPrice || 0,
          totalCost: Number(((mp.quantity * 1) * (mp.costPrice || 0)).toFixed(2))
        }))
      : undefined;

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && !item.dimensions);
      if (existing) {
        const nextQty = existing.quantity + 1;
        const nextConsumo = (product.materiasPrimas && product.materiasPrimas.length > 0)
          ? product.materiasPrimas.map((mp: any) => ({
              materiaPrimaId: mp.materiaPrimaId,
              name: mp.name,
              unit: mp.unit,
              quantity: Number((mp.quantity * nextQty).toFixed(4)),
              costPrice: mp.costPrice || 0,
              totalCost: Number(((mp.quantity * nextQty) * (mp.costPrice || 0)).toFixed(2))
            }))
          : undefined;

        return prev.map(item =>
          item === existing ? { ...item, quantity: nextQty, materiasPrimasConsumidas: nextConsumo } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          materiasPrimasConsumidas: itemConsumo
        }
      ];
    });
  };

  const handleConfirmDimensionItem = () => {
    if (!dimensionModalProduct) return;
    const w = parseFloat(dimWidth.replace(',', '.')) || 0;
    const h = dimensionModalProduct.unitType === 'm2' ? (parseFloat(dimHeight.replace(',', '.')) || 0) : 1;
    const q = dimQuantity || 1;

    if (w <= 0 || (dimensionModalProduct.unitType === 'm2' && h <= 0)) {
      showAlert('Informe as medidas válidas.');
      return;
    }

    const area = dimensionModalProduct.unitType === 'm2' ? w * h : w;
    const dimText = dimensionModalProduct.unitType === 'm2' ? `${w.toFixed(2)}m x ${h.toFixed(2)}m (${area.toFixed(2)}m²)` : `${w.toFixed(2)}m`;
    const multiplier = (area && area > 0) ? area * q : q;

    const itemConsumo = (dimensionModalProduct.materiasPrimas && dimensionModalProduct.materiasPrimas.length > 0)
      ? dimensionModalProduct.materiasPrimas.map((mp: any) => ({
          materiaPrimaId: mp.materiaPrimaId,
          name: mp.name,
          unit: mp.unit,
          quantity: Number((mp.quantity * multiplier).toFixed(4)),
          costPrice: mp.costPrice || 0,
          totalCost: Number(((mp.quantity * multiplier) * (mp.costPrice || 0)).toFixed(2))
        }))
      : undefined;

    setCart(prev => [
      ...prev,
      {
        productId: dimensionModalProduct.id,
        name: dimensionModalProduct.name,
        price: dimensionModalProduct.price,
        quantity: q,
        area: area,
        consumoEstoque: area,
        dimensions: dimText,
        materiasPrimasConsumidas: itemConsumo
      }
    ]);

    setDimensionModalProduct(null);
  };

  const updateCartItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    setCart(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const prod = products.find(p => p.id === item.productId);
      let nextConsumo = item.materiasPrimasConsumidas;
      if (prod && prod.materiasPrimas && prod.materiasPrimas.length > 0) {
        const multiplier = (item.area && item.area > 0) ? item.area * newQty : newQty;
        nextConsumo = prod.materiasPrimas.map((mp: any) => ({
          materiaPrimaId: mp.materiaPrimaId,
          name: mp.name,
          unit: mp.unit,
          quantity: Number((mp.quantity * multiplier).toFixed(4)),
          costPrice: mp.costPrice || 0,
          totalCost: Number(((mp.quantity * multiplier) * (mp.costPrice || 0)).toFixed(2))
        }));
      }
      return { ...item, quantity: newQty, materiasPrimasConsumidas: nextConsumo };
    }));
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, idx) => idx !== index));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setSaleDiscountValue(0);
    setSaleCreditApplied(0);
    setOrderObservacoes('');
    setScheduledFor('');
    setDownPayment('');
  };

  // Quick Product Save
  const handleSaveQuickProduct = async () => {
    if (!quickProductName.trim()) {
      showAlert('Nome do produto é obrigatório.');
      return;
    }
    const price = parseFloat(quickProductPrice.replace(',', '.')) || 0;
    try {
      const payload: any = {
        nome: quickProductName.trim(),
        preco: price,
        unidade: quickProductUnit,
        categoria: quickProductCategory.trim() || 'Geral',
        estoque: 100,
        company_id: currentCompany?.id || null,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('produtos').insert([payload]).select().single();

      if (error) {
        // Fallback with english columns
        const fallback = await supabase.from('produtos').insert([{
          name: quickProductName.trim(),
          sale_price: price,
          unit: quickProductUnit,
          category: quickProductCategory.trim() || 'Geral',
          current_stock: 100,
          is_active: true
        }]).select().single();

        if (fallback.error) throw fallback.error;
        if (fallback.data) {
          await loadProducts();
          handleAddProductToCart({
            id: fallback.data.id,
            name: fallback.data.name || quickProductName.trim(),
            price: Number(fallback.data.sale_price) || price,
            stock: 100,
            unitType: quickProductUnit === 'm2' ? 'm2' : quickProductUnit === 'metro' ? 'metro' : 'unit',
            tipoItem: 'produto'
          });
        }
      } else if (data) {
        await loadProducts();
        handleAddProductToCart({
          id: data.id,
          name: data.nome || quickProductName.trim(),
          price: Number(data.preco) || price,
          stock: Number(data.estoque) || 100,
          unitType: data.unidade === 'm2' ? 'm2' : data.unidade === 'metro' ? 'metro' : 'unit',
          tipoItem: 'produto'
        });
      }
      setIsQuickProductModalOpen(false);
      setQuickProductName('');
      setQuickProductPrice('');
      showAlert('Produto cadastrado com sucesso!');
    } catch (err: any) {
      console.warn(err);
      showAlert(`Não foi possível salvar produto: ${err?.message || 'erro'}`);
    }
  };

  // Finalize Sale
  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      showAlert('O carrinho está vazio.');
      return;
    }

    const finalDownPayment = downPayment === '' ? total : Number(downPayment);
    const isPending = finalDownPayment < total;
    const remaining = Math.max(0, total - finalDownPayment);

    setIsSavingSale(true);
    try {
      const saleId = `venda_${Date.now()}`;

      // Consolidate raw materials consumption for this sale
      const totalConsumoMateriasPrimas: Record<string, { name: string; unit: string; quantity: number; costPrice: number; totalCost: number }> = {};
      cart.forEach(item => {
        if (item.materiasPrimasConsumidas && Array.isArray(item.materiasPrimasConsumidas)) {
          item.materiasPrimasConsumidas.forEach((mp: any) => {
            const key = mp.name || mp.materiaPrimaId || 'Insumo';
            if (!totalConsumoMateriasPrimas[key]) {
              totalConsumoMateriasPrimas[key] = {
                name: mp.name,
                unit: mp.unit,
                quantity: 0,
                costPrice: mp.costPrice || 0,
                totalCost: 0
              };
            }
            totalConsumoMateriasPrimas[key].quantity += (mp.quantity || 0);
            totalConsumoMateriasPrimas[key].totalCost += (mp.totalCost || ((mp.quantity || 0) * (mp.costPrice || 0)));
          });
        }
      });
      const consumoMateriasPrimas = Object.values(totalConsumoMateriasPrimas);

      const payload: any = {
        id: saleId,
        company_id: currentCompany?.id || 'rafa-arts',
        cliente_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name || 'Cliente de Balcão',
        customer_phone: selectedCustomer?.phone || null,
        items: cart,
        total: total,
        discount_value: saleDiscountValue || 0,
        down_payment: finalDownPayment,
        received_value: finalDownPayment,
        payment_method: paymentMethod,
        pending_payment_method: isPending ? pendingPaymentMethod : null,
        status: isPending ? 'pending' : 'completed',
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        observacoes: orderObservacoes || null,
        consumo_materias_primas: consumoMateriasPrimas.length > 0 ? consumoMateriasPrimas : null,
        payments: finalDownPayment > 0 ? [{
          method: paymentMethod,
          value: finalDownPayment,
          date: new Date().toISOString()
        }] : []
      };

      let insertRes = await supabase.from('vendas').insert(payload).select().single();
      if (insertRes.error && insertRes.error.message?.includes('consumo_materias_primas')) {
        const { consumo_materias_primas, ...restPayload } = payload;
        insertRes = await supabase.from('vendas').insert(restPayload).select().single();
      }
      if (insertRes.error) throw insertRes.error;
      const data = insertRes.data;

      // Update customer credit if applied
      if (selectedCustomer?.id && saleCreditApplied > 0) {
        const cust = customers.find(c => c.id === selectedCustomer.id);
        if (cust) {
          const newCredit = Math.max(0, (cust.saldo_credito || 0) - saleCreditApplied);
          await supabase.from('clientes').update({ saldo_credito: newCredit }).eq('id', selectedCustomer.id);
        }
      }

      // Deduct stock for inventory products
      for (const item of cart) {
        if (item.productId && item.productId !== 'manual') {
          const prod = products.find(p => p.id === item.productId);
          if (prod && prod.stock !== undefined) {
            const consumed = item.consumoEstoque !== undefined
              ? item.consumoEstoque * (item.quantity || 1)
              : (item.area ? item.area * item.quantity : item.quantity);
            const newStock = Math.max(0, prod.stock - consumed);
            try {
              const { error: stockErr } = await supabase.from('produtos').update({ estoque: newStock }).eq('id', item.productId);
              if (stockErr) {
                await supabase.from('produtos').update({ current_stock: newStock }).eq('id', item.productId);
              }
            } catch {
              // Ignore stock update error if column differs
            }
          }
        }
      }

      const finalizedOrder: SaleOrder = {
        id: saleId,
        companyId: currentCompany?.id || 'rafa-arts',
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name || 'Cliente de Balcão',
        customerPhone: selectedCustomer?.phone,
        items: [...cart],
        total,
        discountValue: saleDiscountValue || undefined,
        downPayment: finalDownPayment,
        receivedValue: finalDownPayment,
        paymentMethod,
        payments: payload.payments,
        status: isPending ? 'pending' : 'completed',
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        observacoes: orderObservacoes || undefined,
        createdAt: new Date().toISOString(),
      };

      setLastFinalizedOrder(finalizedOrder);
      if (addPendingOrder && isPending) {
        addPendingOrder(finalizedOrder);
      }

      await loadSalesHistory();
      await loadProducts();

      clearCart();
      setIsPaymentModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      console.error('Erro ao finalizar venda:', err);
      showAlert(`Erro ao salvar venda: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setIsSavingSale(false);
    }
  };

  // Settle Debt
  const handleSettleDebt = async () => {
    if (!settlingOrder) return;
    const currentPaid = settlingOrder.downPayment || settlingOrder.receivedValue || 0;
    const newPaid = currentPaid + settleAmount;
    const newRemaining = Math.max(0, settlingOrder.total - newPaid);
    const newStatus = newRemaining <= 0 ? 'completed' : 'pending';

    const newPaymentEntry: PaymentEntry = {
      method: settleMethod,
      value: settleAmount,
      date: new Date().toISOString()
    };

    const existingPayments = settlingOrder.payments || [];
    const updatedPayments = [...existingPayments, newPaymentEntry];

    try {
      const nowIso = new Date().toISOString();
      const updatePayload: any = {
        down_payment: newPaid,
        received_value: newPaid,
        status: newStatus,
        payments: updatedPayments,
        updated_at: nowIso
      };
      if (newStatus === 'completed') {
        updatePayload.settled_at = nowIso;
        updatePayload.settled_payment_method = settleMethod;
      }
      const { error } = await supabase.from('vendas').update(updatePayload).eq('id', settlingOrder.id);

      if (error) throw error;

      showAlert('Pagamento registrado com sucesso!');
      setIsSettleModalOpen(false);
      setSettlingOrder(null);
      await loadSalesHistory();
    } catch (err: any) {
      console.error(err);
      showAlert(`Não foi possível salvar quitação: ${err?.message || 'erro'}`);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !productSearch || 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
        (p.code && p.code.toLowerCase().includes(productSearch.toLowerCase()));
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, productSearch, selectedCategory]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => { if (p.category) set.add(p.category); });
    return Array.from(set);
  }, [products]);

  // Filtered Sales History
  const filteredSalesHistory = useMemo(() => {
    return allSalesHistory.filter(s => {
      const matchesSearch = !historySearch || 
        s.customerName?.toLowerCase().includes(historySearch.toLowerCase()) ||
        s.id.toLowerCase().includes(historySearch.toLowerCase());
      const matchesStatus = historyStatusFilter === 'all' || s.status === historyStatusFilter;
      
      let matchesDate = true;
      const saleDates = [
        new Date(s.createdAt),
        ...(s.settledAt ? [new Date(s.settledAt)] : []),
        ...(s.payments || []).map(p => new Date(p.date))
      ].filter(d => !isNaN(d.getTime()));

      if (historyDateFrom) {
        const from = new Date(historyDateFrom);
        matchesDate = matchesDate && saleDates.some(d => d >= from);
      }
      if (historyDateTo) {
        const end = new Date(historyDateTo);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && saleDates.some(d => d <= end);
      }
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [allSalesHistory, historySearch, historyStatusFilter, historyDateFrom, historyDateTo]);

  return (
    <div className="h-full min-h-[500px] flex flex-col bg-slate-900/60 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:px-4 sm:py-3 bg-white/5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {[
            { id: 'venda', label: 'Terminal PDV', icon: ShoppingBag },
            { id: 'historico', label: 'Histórico de Vendas', icon: Clock },
            { id: 'servicos', label: 'Serviços & O.S.', icon: Layers },
            { id: 'orcamentos', label: 'Orçamentos', icon: FileText },
            { id: 'contratos', label: 'Contratos', icon: FileCheck },
            { id: 'estoque', label: 'Estoque', icon: Package },
            { id: 'clientes', label: 'Clientes', icon: Users },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary-500 text-slate-900 shadow-lg shadow-primary-500/20"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <tab.icon size={15} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            title={syncedAt ? `Última sincronização: ${syncedAt.toLocaleTimeString('pt-BR')}` : 'Sincronizar'}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
          >
            <RefreshCw size={15} className={cn(isSyncing && "animate-spin text-primary-400")} />
          </button>
          <button
            onClick={() => setIsRegisterOpen(!isRegisterOpen)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-1.5",
              isRegisterOpen
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border-rose-500/30"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", isRegisterOpen ? "bg-emerald-400 animate-pulse" : "bg-rose-400")} />
            <span>{isRegisterOpen ? 'Caixa Aberto' : 'Caixa Fechado'}</span>
          </button>
        </div>
      </div>

      {/* Tab: Terminal PDV */}
      {activeTab === 'venda' && (
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Esquerda: Carrinho e Checkout */}
          <div className="lg:w-[420px] xl:w-[460px] bg-[#fef9c3] flex flex-col p-3 sm:p-4 border-r border-slate-900/10 justify-between shrink-0 overflow-hidden">
            {/* Top Info Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-900/10 shrink-0">
              <div className="flex items-center gap-1.5">
                <ShoppingBag size={16} className="text-slate-900" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">Terminal de Venda</span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[10px] font-bold text-rose-700 bg-rose-500/15 hover:bg-rose-500/25 px-2 py-1 rounded-lg flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  <span>Limpar</span>
                </button>
              )}
            </div>

            {/* Total Display Banner */}
            <div className="my-2 p-3 bg-slate-900/5 rounded-2xl border border-slate-900/10 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-900/60 block">Total do Pedido</span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                  R$ {total.toFixed(2).replace('.', ',')}
                </h2>
                {saleDiscountValue > 0 && (
                  <span className="text-[10px] font-bold text-emerald-700 block">
                    Desconto: -R$ {saleDiscountValue.toFixed(2).replace('.', ',')}
                  </span>
                )}
                {saleCreditApplied > 0 && (
                  <span className="text-[10px] font-bold text-blue-700 block">
                    Crédito: -R$ {saleCreditApplied.toFixed(2).replace('.', ',')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsSaleDiscountModalOpen(true)}
                  className="px-2.5 py-1.5 bg-white/80 hover:bg-white text-slate-800 border border-slate-900/10 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-sm"
                >
                  <Percent size={12} />
                  <span>Desconto</span>
                </button>
                <Badge className="bg-slate-900 text-white px-2.5 py-1 rounded-full text-[10px] font-mono">
                  {cart.length} {cart.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 min-h-0 bg-white/70 backdrop-blur-xs rounded-2xl border border-slate-900/10 p-2.5 flex flex-col overflow-hidden shadow-inner my-1">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-900/10 mb-1.5 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Itens Lançados</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Lista</span>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <ShoppingBag size={36} className="opacity-20 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Carrinho Vazio</p>
                  <p className="text-[10px] text-slate-400 mt-1">Selecione produtos ao lado para incluir na venda</p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                  {cart.map((item, index) => (
                    <div key={index} className="bg-white/90 border border-slate-900/10 rounded-xl p-2 flex items-center justify-between gap-2 shadow-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">{item.name}</span>
                          {item.dimensions && (
                            <span className="text-[9px] font-mono bg-slate-900/10 text-slate-800 px-1.5 py-0.5 rounded">
                              {item.dimensions}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                          {item.quantity}x R$ {item.price.toFixed(2)} = <strong className="text-slate-900">R$ {((item.area ? item.price * item.area * item.quantity : item.price * item.quantity) - (item.discountValue || 0)).toFixed(2)}</strong>
                        </div>
                        {item.materiasPrimasConsumidas && item.materiasPrimasConsumidas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.materiasPrimasConsumidas.map((mp, mpIdx) => (
                              <span key={mpIdx} className="inline-flex items-center gap-0.5 text-[9px] bg-primary-500/10 text-primary-800 font-medium px-1.5 py-0.2 rounded border border-primary-500/20">
                                <Layers size={8} className="text-primary-600" />
                                {mp.name}: {mp.quantity} {mp.unit}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateCartItemQuantity(index, item.quantity - 1)}
                          className="w-6 h-6 bg-slate-900/5 hover:bg-slate-900/10 rounded-lg flex items-center justify-center font-bold text-slate-800 text-xs"
                        >
                          -
                        </button>
                        <span className="w-5 text-center text-xs font-bold font-mono text-slate-900">{item.quantity}</span>
                        <button
                          onClick={() => updateCartItemQuantity(index, item.quantity + 1)}
                          className="w-6 h-6 bg-slate-900/5 hover:bg-slate-900/10 rounded-lg flex items-center justify-center font-bold text-slate-800 text-xs"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="p-1 text-rose-600 hover:bg-rose-500/10 rounded-lg ml-0.5"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions and Customer Selector */}
            <div className="pt-2 border-t border-slate-900/10 flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="flex-1 px-3 py-2 bg-white/80 hover:bg-white text-slate-800 border border-slate-900/10 rounded-xl text-xs font-bold truncate text-left flex items-center gap-2 shadow-sm"
                >
                  <User size={14} className="text-slate-600 shrink-0" />
                  <span className="truncate">{selectedCustomer ? selectedCustomer.name : 'Cliente de Balcão (Selecionar)'}</span>
                </button>
                <button
                  onClick={() => setIsNotaObservacoesModalOpen(true)}
                  className="p-2 bg-white/80 hover:bg-white text-slate-800 border border-slate-900/10 rounded-xl shadow-sm"
                  title="Observações da Nota"
                >
                  <FileText size={15} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="px-3 py-2.5 bg-slate-900/10 hover:bg-slate-900/15 text-slate-800 font-black uppercase text-xs rounded-xl disabled:opacity-40 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  disabled={cart.length === 0}
                  className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs rounded-xl shadow-md disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all"
                >
                  <CheckCircle2 size={16} />
                  <span>Cobrar Pedido</span>
                </button>
              </div>
            </div>
          </div>

          {/* Direita: Catálogo de Produtos e Insumos */}
          <div className="flex-1 min-h-0 bg-slate-950/40 p-4 flex flex-col overflow-hidden">
            {/* Search & Category Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Buscar produtos por nome ou código..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary-500"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                    selectedCategory === 'all' ? "bg-primary-500 text-slate-900" : "bg-white/5 text-white/50 hover:bg-white/10"
                  )}
                >
                  Todos
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                      selectedCategory === cat ? "bg-primary-500 text-slate-900" : "bg-white/5 text-white/50 hover:bg-white/10"
                    )}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  onClick={() => setIsQuickProductModalOpen(true)}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus size={12} />
                  <span>Cadastrar Item</span>
                </button>
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => handleAddProductToCart(product)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary-500/40 rounded-2xl p-3 cursor-pointer transition-all flex flex-col justify-between group active:scale-95"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-mono text-white/40 uppercase truncate">
                          {product.code || product.category || 'ITEM'}
                        </span>
                        <span className="text-[9px] font-black text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded">
                          {product.unitType === 'm2' ? 'm²' : product.unitType === 'metro' ? 'm' : 'un'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-primary-300 line-clamp-2 leading-snug">
                        {product.name}
                      </h4>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-400 font-mono">
                        R$ {product.price.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-white/40 font-bold">
                        {product.stock !== undefined ? `${product.stock} em est.` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Histórico de Vendas */}
      {activeTab === 'historico' && (
        <div className="flex-1 min-h-0 p-4 sm:p-6 flex flex-col overflow-hidden">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Buscar por cliente ou ID da nota..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary-500"
                />
              </div>
              <select
                value={historyStatusFilter || 'all'}
                onChange={e => setHistoryStatusFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary-500"
              >
                <option value="all" className="bg-slate-900">Todos os Status</option>
                <option value="completed" className="bg-slate-900">Quitados (100%)</option>
                <option value="pending" className="bg-slate-900">Com Saldo Pendente</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={historyDateFrom}
                onChange={e => setHistoryDateFrom(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
              />
              <span className="text-white/40 text-xs">até</span>
              <input
                type="date"
                value={historyDateTo}
                onChange={e => setHistoryDateTo(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
              />
            </div>
          </div>

          {/* Sales History Table */}
          <div className="flex-1 min-h-0 bg-white/5 border border-white/10 rounded-2xl overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-white/50 uppercase text-[10px] font-black tracking-wider sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Itens</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Recebido</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSalesHistory.map(sale => {
                  const down = sale.downPayment ?? sale.receivedValue ?? 0;
                  const balance = Math.max(0, sale.total - down);
                  const isPending = balance > 0 || sale.status === 'pending';

                  return (
                    <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 text-white/60 font-mono text-[11px]">
                        {new Date(sale.createdAt).toLocaleDateString('pt-BR')} {new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 font-bold text-white">
                        {sale.customerName || 'Cliente de Balcão'}
                      </td>
                      <td className="p-3 text-white/70 max-w-[200px] truncate">
                        {sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </td>
                      <td className="p-3 font-black text-white font-mono">
                        R$ {sale.total.toFixed(2)}
                      </td>
                      <td className="p-3 font-black text-emerald-400 font-mono">
                        R$ {down.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <Badge variant={isPending ? 'warning' : 'success'} className="text-[9px]">
                          {isPending ? `Pendente (R$ ${balance.toFixed(2)})` : 'Quitado'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <button
                              onClick={() => {
                                setSettlingOrder(sale);
                                setSettleAmount(balance);
                                setIsSettleModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              Quitar
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setViewingReceiptOrder(sale);
                              setIsReceiptModalOpen(true);
                            }}
                            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                            title="Ver Recibo"
                          >
                            <Receipt size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Serviços & O.S. */}
      {activeTab === 'servicos' && (
        <div className="flex-1 min-h-0 p-4 sm:p-6 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Ordens de Serviço</h3>
            <select
              value={serviceStatusFilter || 'all'}
              onChange={e => setServiceStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
            >
              <option value="all" className="bg-slate-900">Todos os Status</option>
              <option value="pedido_recebido" className="bg-slate-900">Pedido Recebido</option>
              <option value="em_producao" className="bg-slate-900">Em Produção</option>
              <option value="pronto" className="bg-slate-900">Pronto para Retirada</option>
              <option value="entregue" className="bg-slate-900">Entregue</option>
            </select>
          </div>
          <div className="flex-1 min-h-0 bg-white/5 border border-white/10 rounded-2xl overflow-y-auto custom-scrollbar p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {servicesList
                .filter(s => serviceStatusFilter === 'all' || s.status === serviceStatusFilter)
                .map(serv => (
                  <div key={serv.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-white/50">O.S. #{serv.id.slice(-6)}</span>
                        <Badge variant="outline" className="text-[9px] uppercase">{serv.status || 'Recebido'}</Badge>
                      </div>
                      <h4 className="text-xs font-bold text-white">{serv.title || serv.service_name || 'Serviço'}</h4>
                      <p className="text-[11px] text-white/60 mt-1">Cliente: {serv.customer_name || 'Balcão'}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                      <span className="text-white/40">{serv.created_at ? new Date(serv.created_at).toLocaleDateString('pt-BR') : ''}</span>
                      <span className="font-bold text-emerald-400">R$ {Number(serv.value || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Orçamentos */}
      {activeTab === 'orcamentos' && (
        <div className="flex-1 min-h-0 p-4 sm:p-6 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Orçamentos Emitidos</h3>
          </div>
          <div className="flex-1 min-h-0 bg-white/5 border border-white/10 rounded-2xl overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-white/50 uppercase text-[10px] font-black tracking-wider sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Número</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Valor Total</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orcamentosList.map(o => (
                  <tr key={o.id} className="hover:bg-white/5">
                    <td className="p-3 text-white/60 font-mono">{o.created_at ? new Date(o.created_at).toLocaleDateString('pt-BR') : ''}</td>
                    <td className="p-3 font-mono font-bold text-white">{o.numero || o.id.slice(-6)}</td>
                    <td className="p-3 font-bold text-white">{o.customer_name || 'Cliente'}</td>
                    <td className="p-3 font-mono font-black text-emerald-400">R$ {Number(o.total || 0).toFixed(2)}</td>
                    <td className="p-3"><Badge variant="outline" className="text-[9px] uppercase">{o.status || 'Rascunho'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Contratos */}
      {activeTab === 'contratos' && (
        <div className="flex-1 min-h-0 p-4 sm:p-6 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Contratos de Prestação de Serviço</h3>
          </div>
          <div className="flex-1 min-h-0 bg-white/5 border border-white/10 rounded-2xl overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-white/50 uppercase text-[10px] font-black tracking-wider sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Contrato #</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {contratosList.map(c => (
                  <tr key={c.id} className="hover:bg-white/5">
                    <td className="p-3 text-white/60 font-mono">{c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : ''}</td>
                    <td className="p-3 font-mono font-bold text-white">{c.numero || c.id.slice(-6)}</td>
                    <td className="p-3 font-bold text-white">{c.customer_name || 'Cliente'}</td>
                    <td className="p-3 font-mono font-black text-emerald-400">R$ {Number(c.total || 0).toFixed(2)}</td>
                    <td className="p-3"><Badge variant="outline" className="text-[9px] uppercase">{c.status || 'Ativo'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Estoque */}
      {activeTab === 'estoque' && (
        <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto custom-scrollbar">
          <InventoryModule currentCompany={currentCompany} user={user} />
        </div>
      )}

      {/* Tab: Clientes */}
      {activeTab === 'clientes' && (
        <div className="flex-1 min-h-0 p-4 sm:p-6 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">Base de Clientes</h3>
          </div>
          <div className="flex-1 min-h-0 bg-white/5 border border-white/10 rounded-2xl overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-white/50 uppercase text-[10px] font-black tracking-wider sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="p-3">Nome</th>
                  <th className="p-3">Telefone</th>
                  <th className="p-3">E-mail</th>
                  <th className="p-3">Saldo Crédito</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-white/5">
                    <td className="p-3 font-bold text-white">{c.name}</td>
                    <td className="p-3 font-mono text-white/70">{c.phone || '-'}</td>
                    <td className="p-3 text-white/60">{c.email || '-'}</td>
                    <td className="p-3 font-black text-blue-400 font-mono">R$ {Number(c.saldo_credito || 0).toFixed(2)}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedCustomer(c);
                          setActiveTab('venda');
                        }}
                        className="px-2.5 py-1 bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                      >
                        Iniciar Venda
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Customer Selection Modal */}
      <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title="Selecionar Cliente">
        <div className="space-y-3">
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={customerSearch}
            onChange={e => setCustomerSearch(e.target.value)}
          />
          <div className="max-h-[300px] overflow-y-auto divide-y divide-white/5">
            <div
              onClick={() => {
                setSelectedCustomer(null);
                setIsCustomerModalOpen(false);
              }}
              className="p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <h4 className="text-xs font-bold text-white">Cliente de Balcão (Não Identificado)</h4>
                <p className="text-[10px] text-white/40">Venda avulsa sem cadastro</p>
              </div>
              <ChevronRight size={14} className="text-white/40" />
            </div>

            {customers
              .filter(c => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone && c.phone.includes(customerSearch)))
              .map(c => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomer(c);
                    setIsCustomerModalOpen(false);
                  }}
                  className="p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white">{c.name}</h4>
                    <p className="text-[10px] text-white/50">{c.phone || c.email || 'Sem contato cadastrado'}</p>
                  </div>
                  {c.saldo_credito > 0 && (
                    <Badge variant="primary" className="text-[9px]">Crédito: R$ {Number(c.saldo_credito).toFixed(2)}</Badge>
                  )}
                </div>
              ))}
          </div>
        </div>
      </Modal>

      {/* Payment & Checkout Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Finalizar Cobrança">
        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-white/50 block">Total a Pagar</span>
              <h2 className="text-2xl font-black text-white font-mono">R$ {total.toFixed(2).replace('.', ',')}</h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-white/50 block">Cliente</span>
              <span className="text-xs font-bold text-primary-300">{selectedCustomer?.name || 'Cliente de Balcão'}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-white/50 block mb-2">Forma de Pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pix', label: 'PIX', icon: QrCode },
                { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                { id: 'cartao_credito', label: 'C. Crédito', icon: CreditCard },
                { id: 'cartao_debito', label: 'C. Débito', icon: CreditCard },
                { id: 'boleto', label: 'Boleto', icon: FileText },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={cn(
                    "p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all",
                    paymentMethod === m.id
                      ? "bg-primary-500/20 text-white border-primary-500"
                      : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <m.icon size={16} />
                  <span className="text-[10px] font-bold">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Valor Recebido / Entrada (R$)</label>
            <Input
              type="number"
              placeholder={`Total: ${total.toFixed(2)}`}
              value={downPayment}
              onChange={e => setDownPayment(e.target.value === '' ? '' : Number(e.target.value))}
            />
            {downPayment !== '' && Number(downPayment) < total && (
              <p className="text-[10px] text-amber-300 font-bold mt-1">
                Saldo restante de R$ {(total - Number(downPayment)).toFixed(2)} ficará pendente.
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Previsão de Entrega (Opcional)</label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={e => setScheduledFor(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleFinalizeSale} disabled={isSavingSale} className="gap-2">
              <CheckCircle2 size={16} />
              <span>{isSavingSale ? 'Processando...' : 'Confirmar e Emitir'}</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sale Discount Modal */}
      <Modal isOpen={isSaleDiscountModalOpen} onClose={() => setIsSaleDiscountModalOpen(false)} title="Aplicar Desconto na Venda">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Valor do Desconto (R$)</label>
            <Input
              type="number"
              placeholder="0,00"
              value={saleDiscountValue || ''}
              onChange={e => setSaleDiscountValue(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsSaleDiscountModalOpen(false)}>
              Fechar
            </Button>
            <Button variant="primary" onClick={() => setIsSaleDiscountModalOpen(false)}>
              Aplicar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Dimension Modal (m2 / metro) */}
      <Modal
        isOpen={!!dimensionModalProduct}
        onClose={() => setDimensionModalProduct(null)}
        title={`Medidas: ${dimensionModalProduct?.name}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Largura (m)</label>
              <Input
                placeholder="Ex: 1.50"
                value={dimWidth}
                onChange={e => setDimWidth(e.target.value)}
              />
            </div>
            {dimensionModalProduct?.unitType === 'm2' && (
              <div>
                <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Altura (m)</label>
                <Input
                  placeholder="Ex: 2.00"
                  value={dimHeight}
                  onChange={e => setDimHeight(e.target.value)}
                />
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Quantidade de Peças</label>
            <Input
              type="number"
              value={dimQuantity}
              onChange={e => setDimQuantity(Number(e.target.value) || 1)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDimensionModalProduct(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirmDimensionItem}>
              Adicionar ao Pedido
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quick Product Modal */}
      <Modal isOpen={isQuickProductModalOpen} onClose={() => setIsQuickProductModalOpen(false)} title="Cadastro Rápido de Item">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Nome do Produto / Insumo</label>
            <Input
              placeholder="Ex: Lona 440g Fosca"
              value={quickProductName}
              onChange={e => setQuickProductName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Preço de Venda (R$)</label>
              <Input
                placeholder="0,00"
                value={quickProductPrice}
                onChange={e => setQuickProductPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Unidade</label>
              <select
                value={quickProductUnit || 'metro'}
                onChange={e => setQuickProductUnit(e.target.value as any)}
                className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-primary-500"
              >
                <option value="metro" className="bg-slate-900">Metro Linear (m)</option>
                <option value="etiqueta" className="bg-slate-900">Etiqueta Adesiva</option>
                <option value="un" className="bg-slate-900">Unidade (un)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Categoria (Opcional)</label>
            <Input
              placeholder="Ex: Impressão Digital, Fachadas..."
              value={quickProductCategory || ''}
              onChange={(e: any) => setQuickProductCategory(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsQuickProductModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveQuickProduct}>
              Cadastrar e Usar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Nota Observacoes Modal */}
      <Modal isOpen={isNotaObservacoesModalOpen} onClose={() => setIsNotaObservacoesModalOpen(false)} title="Observações da Nota">
        <div className="space-y-3">
          <textarea
            value={orderObservacoes || ''}
            onChange={e => setOrderObservacoes(e.target.value)}
            placeholder="Instruções de acabamento, entrega ou observações gerais..."
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary-500 min-h-[100px]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="primary" onClick={() => setIsNotaObservacoesModalOpen(false)}>
              Concluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Settle Debt Modal */}
      <Modal isOpen={isSettleModalOpen} onClose={() => setIsSettleModalOpen(false)} title="Quitar Débito da Venda">
        <div className="space-y-4">
          <div className="p-3 bg-white/5 rounded-xl text-xs space-y-1">
            <p className="text-white/60">Cliente: <strong className="text-white">{settlingOrder?.customerName}</strong></p>
            <p className="text-white/60">Total da Nota: <strong className="text-white">R$ {settlingOrder?.total.toFixed(2)}</strong></p>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Valor a Quitar Agora (R$)</label>
            <Input
              type="number"
              value={settleAmount}
              onChange={(e: any) => setSettleAmount(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-white/50 block mb-1">Forma de Pagamento</label>
            <select
              value={settleMethod || 'dinheiro'}
              onChange={e => setSettleMethod(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
            >
              <option value="pix" className="bg-slate-900">PIX</option>
              <option value="dinheiro" className="bg-slate-900">Dinheiro</option>
              <option value="cartao_credito" className="bg-slate-900">Cartão de Crédito</option>
              <option value="cartao_debito" className="bg-slate-900">Cartão de Débito</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsSettleModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSettleDebt}>
              Registrar Pagamento
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} title="Venda Concluída!">
        <div className="text-center space-y-4 py-3">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Pedido #{lastFinalizedOrder?.id.slice(-6).toUpperCase()}</h3>
            <p className="text-xs text-white/60 mt-1">Lançamento registrado e integrado ao sistema.</p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsSuccessModalOpen(false);
                if (lastFinalizedOrder) {
                  setViewingReceiptOrder(lastFinalizedOrder);
                  setIsReceiptModalOpen(true);
                }
              }}
              className="gap-1.5"
            >
              <Receipt size={14} />
              <span>Ver Comprovante</span>
            </Button>
            <Button variant="primary" onClick={() => setIsSuccessModalOpen(false)}>
              Nova Venda
            </Button>
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title="Comprovante de Venda">
        <div className="space-y-4">
          <div className="p-4 bg-white text-slate-900 rounded-xl font-mono text-xs space-y-2 border border-slate-200">
            <div className="text-center pb-2 border-b border-slate-300">
              <h3 className="font-bold text-sm">{currentCompany?.name || 'Rafa Arts Graphics'}</h3>
              <p className="text-[10px] text-slate-500">Comprovante de Venda</p>
              <p className="text-[10px] text-slate-400">ID: {viewingReceiptOrder?.id}</p>
            </div>
            <div className="text-[11px] space-y-1">
              <p><strong>Data:</strong> {viewingReceiptOrder ? new Date(viewingReceiptOrder.createdAt).toLocaleString('pt-BR') : ''}</p>
              <p><strong>Cliente:</strong> {viewingReceiptOrder?.customerName || 'Cliente de Balcão'}</p>
            </div>
            <div className="py-2 border-t border-b border-slate-300 space-y-1">
              {viewingReceiptOrder?.items.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.quantity}x {item.name} {item.dimensions ? `(${item.dimensions})` : ''}</span>
                  <span>R$ {((item.area ? item.price * item.area * item.quantity : item.price * item.quantity) - (item.discountValue || 0)).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 pt-1 text-right">
              <p className="text-sm font-bold">Total: R$ {viewingReceiptOrder?.total.toFixed(2)}</p>
              <p className="text-emerald-700">Recebido: R$ {(viewingReceiptOrder?.downPayment ?? viewingReceiptOrder?.receivedValue ?? 0).toFixed(2)}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsReceiptModalOpen(false)}>
              Fechar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                window.print();
              }}
              className="gap-1.5"
            >
              <Printer size={14} />
              <span>Imprimir</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
