import React, { useState, useEffect } from 'react';
import { 
  Wrench, Search, Filter, Calendar, Clock, CheckCircle2, 
  ArrowRight, User, Phone, Printer, MessageSquare, AlertCircle,
  FileText, RefreshCw, Eye, Tag
} from 'lucide-react';
import { Company, SaleOrder } from '../types';
import { supabase } from '../supabase';
import { showAlert } from '../lib/notify';
import { formatPhoneBR } from '../lib/validators';
import { Badge, Button, Modal } from './SharedUI';

interface ServicesModuleProps {
  currentCompany?: Company | null;
}

export const SERVICE_STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pedido_recebido: { label: 'Pedido Recebido', color: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
  aguardando_arte: { label: 'Aguardando Arte', color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  arte_em_desenvolvimento: { label: 'Arte em Criação', color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  aguardando_aprovacao: { label: 'Aguardando Aprovação', color: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  producao: { label: 'Em Produção', color: 'text-indigo-300', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  acabamento: { label: 'Acabamento', color: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  aguardando_retirada: { label: 'Pronto / Retirada', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  produto_entregue: { label: 'Entregue / Concluído', color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
};

export const STATUS_FLOW = [
  'pedido_recebido',
  'aguardando_arte',
  'arte_em_desenvolvimento',
  'aguardando_aprovacao',
  'producao',
  'acabamento',
  'aguardando_retirada',
  'produto_entregue'
];

export const ServicesModule: React.FC<ServicesModuleProps> = ({ currentCompany }) => {
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<SaleOrder | null>(null);

  useEffect(() => {
    fetchServices();
  }, [currentCompany]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('vendas')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (currentCompany?.id) {
        query = query.or(`company_id.eq.${currentCompany.id},company_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const mapped: SaleOrder[] = (data || []).map((row: any) => ({
        id: row.id,
        companyId: row.company_id,
        customerId: row.customer_id,
        customerName: row.customer_name || 'Cliente Balcão',
        customerPhone: row.customer_phone || '',
        cpfCnpj: row.cpf_cnpj || '',
        items: Array.isArray(row.items) ? row.items : [],
        total: Number(row.total) || 0,
        discountValue: Number(row.discount_value) || 0,
        downPayment: Number(row.down_payment) || 0,
        receivedValue: Number(row.received_value) || 0,
        paymentMethod: row.payment_method || 'dinheiro',
        payments: Array.isArray(row.payments) ? row.payments : [],
        status: row.status || 'completed',
        serviceStatus: row.service_status || 'pedido_recebido',
        responsavel: row.responsavel || '',
        observacoes: row.observacoes || '',
        scheduledFor: row.scheduled_for || '',
        createdAt: row.created_at || new Date().toISOString()
      }));

      setOrders(mapped);
    } catch (err) {
      console.error('Erro ao carregar serviços:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('vendas')
        .update({ service_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, serviceStatus: newStatus as any } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, serviceStatus: newStatus as any } : null);
      }
      showAlert(`Status atualizado para: ${SERVICE_STATUS_MAP[newStatus]?.label || newStatus}`);
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      showAlert('Erro ao atualizar status.');
    }
  };

  const handleAdvanceStatus = (order: SaleOrder) => {
    const currentIdx = STATUS_FLOW.indexOf(order.serviceStatus || 'pedido_recebido');
    if (currentIdx !== -1 && currentIdx < STATUS_FLOW.length - 1) {
      handleUpdateStatus(order.id, STATUS_FLOW[currentIdx + 1]);
    }
  };

  const handleNotifyWhatsApp = (order: SaleOrder) => {
    if (!order.customerPhone) {
      showAlert('Cliente sem telefone cadastrado.');
      return;
    }
    const clean = order.customerPhone.replace(/\D/g, '');
    const fullPhone = clean.length <= 11 ? `55${clean}` : clean;
    const statusLabel = SERVICE_STATUS_MAP[order.serviceStatus || 'pedido_recebido']?.label || 'Em andamento';
    const text = encodeURIComponent(
      `Olá ${order.customerName}! Informamos que seu pedido #${order.id.slice(0, 6)} na ${currentCompany?.name || 'Rafa Arts'} está com status: *${statusLabel}*.`
    );
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  const filteredOrders = orders.filter(o => {
    const matchStatus = selectedStatus === 'all' || (o.serviceStatus || 'pedido_recebido') === selectedStatus;
    const term = search.toLowerCase();
    const matchSearch = 
      o.customerName?.toLowerCase().includes(term) ||
      o.id.toLowerCase().includes(term) ||
      o.items.some(i => i.name.toLowerCase().includes(term));
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="text-primary-400" size={24} />
            <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight uppercase">
              Ordens de Serviço & Acompanhamento
            </h2>
          </div>
          <p className="text-xs text-white/50">
            Monitore o ciclo completo dos trabalhos gráficos: criação de arte, aprovação, produção e entrega.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={fetchServices}
            className="text-[10px] py-2 px-3 sm:px-4"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Status Chips Filter */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
        <button
          onClick={() => setSelectedStatus('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
            selectedStatus === 'all'
              ? 'bg-primary-500 text-slate-900 border-primary-400 shadow-md shadow-primary-500/20'
              : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
        >
          Todos ({orders.length})
        </button>
        {STATUS_FLOW.map(statusKey => {
          const count = orders.filter(o => (o.serviceStatus || 'pedido_recebido') === statusKey).length;
          const info = SERVICE_STATUS_MAP[statusKey];
          return (
            <button
              key={statusKey}
              onClick={() => setSelectedStatus(statusKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border flex items-center gap-1.5 ${
                selectedStatus === statusKey
                  ? 'bg-primary-500 text-slate-900 border-primary-400 shadow-md shadow-primary-500/20'
                  : `${info.bg} ${info.color} ${info.border} hover:opacity-80`
              }`}
            >
              <span>{info.label}</span>
              <span className="opacity-70 font-mono text-[10px]">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente, número da OS ou produto..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:bg-white/10 focus:border-primary-500/50 transition-all"
        />
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="p-12 text-center text-white/40">Carregando serviços...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 bg-white/5 border border-white/10 rounded-3xl text-center space-y-3">
          <Wrench className="mx-auto text-white/20" size={40} />
          <p className="text-sm font-bold text-white/60">Nenhuma ordem de serviço nesta etapa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(order => {
            const currentStatus = order.serviceStatus || 'pedido_recebido';
            const statusInfo = SERVICE_STATUS_MAP[currentStatus] || SERVICE_STATUS_MAP.pedido_recebido;

            return (
              <div
                key={order.id}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-white/40 uppercase">
                        OS #{order.id.slice(0, 8)}
                      </span>
                      <h3 className="text-base font-black text-white tracking-tight">
                        {order.customerName}
                      </h3>
                    </div>

                    <select
                      value={currentStatus || 'pedido_recebido'}
                      onChange={e => handleUpdateStatus(order.id, e.target.value)}
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border outline-none bg-slate-900 cursor-pointer ${statusInfo.color} ${statusInfo.border}`}
                    >
                      {STATUS_FLOW.map(s => (
                        <option key={s} value={s} className="bg-slate-900 text-white">
                          {SERVICE_STATUS_MAP[s].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Items Preview */}
                  <div className="space-y-1 bg-black/20 p-2.5 rounded-xl border border-white/5 text-xs">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-white/80">
                        <span className="truncate max-w-[200px]">{item.quantity}x {item.name}</span>
                        {item.dimensions && (
                          <span className="text-[10px] text-white/40 font-mono">{item.dimensions}</span>
                        )}
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-[10px] text-white/40 italic">+ {order.items.length - 3} outros itens</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Total: <strong className="text-white font-mono">R$ {order.total.toFixed(2)}</strong></span>
                    <span className="text-[10px] text-white/40 font-mono">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    title="Ver detalhes da OS"
                  >
                    <Eye size={16} />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {order.customerPhone && (
                      <button
                        onClick={() => handleNotifyWhatsApp(order)}
                        className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all"
                        title="Avisar cliente no WhatsApp"
                      >
                        <MessageSquare size={14} />
                      </button>
                    )}

                    {currentStatus !== 'produto_entregue' && (
                      <Button
                        onClick={() => handleAdvanceStatus(order)}
                        className="text-[10px] py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white font-bold"
                      >
                        <span>Avançar</span>
                        <ArrowRight size={12} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Ordem de Serviço #${selectedOrder.id.slice(0, 8)}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/50 uppercase font-bold">Cliente</span>
                <span className="text-sm font-bold text-white">{selectedOrder.customerName}</span>
              </div>
              {selectedOrder.customerPhone && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/50 uppercase font-bold">Telefone</span>
                  <span className="text-sm font-mono text-primary-400">{formatPhoneBR(selectedOrder.customerPhone)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/50 uppercase font-bold">Data de Emissão</span>
                <span className="text-sm text-white/80">{new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-white/70">Itens e Especificações</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="bg-black/30 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white text-sm">{item.name}</p>
                      {item.dimensions && <p className="text-xs text-white/50 font-mono">Medidas: {item.dimensions}</p>}
                      {item.observacao && <p className="text-xs text-amber-300/80 italic">Obs: {item.observacao}</p>}
                    </div>
                    <span className="font-black text-primary-400 font-mono text-sm">
                      {item.quantity}x R$ {item.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-2xl flex justify-between items-center">
              <span className="text-xs font-black uppercase text-primary-300">Valor Total da OS</span>
              <span className="text-lg font-black text-white font-mono">R$ {selectedOrder.total.toFixed(2)}</span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
              <Button variant="secondary" onClick={() => setSelectedOrder(null)}>
                Fechar
              </Button>
              {selectedOrder.customerPhone && (
                <Button onClick={() => handleNotifyWhatsApp(selectedOrder)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                  <MessageSquare size={14} />
                  <span>Avisar Cliente</span>
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
