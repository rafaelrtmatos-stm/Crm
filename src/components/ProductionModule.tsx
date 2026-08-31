import React, { useState, useEffect } from 'react';
import { 
  Layers, Search, ArrowRight, ArrowLeft, CheckCircle2, Clock, 
  AlertTriangle, Wrench, Printer, RefreshCw, User, Calendar
} from 'lucide-react';
import { Company, SaleOrder } from '../types';
import { supabase } from '../supabase';
import { showAlert } from '../lib/notify';
import { Badge, Button } from './SharedUI';

interface ProductionModuleProps {
  currentCompany?: Company | null;
}

const PRODUCTION_COLUMNS = [
  { id: 'aguardando_arte', label: '1. Aguardando Arte', color: 'border-amber-500/40 text-amber-300' },
  { id: 'arte_em_desenvolvimento', label: '2. Em Criação', color: 'border-blue-500/40 text-blue-300' },
  { id: 'aguardando_aprovacao', label: '3. Aguardando Aprovação', color: 'border-purple-500/40 text-purple-300' },
  { id: 'producao', label: '4. Em Impressão / Produção', color: 'border-indigo-500/40 text-indigo-300' },
  { id: 'acabamento', label: '5. Acabamento', color: 'border-cyan-500/40 text-cyan-300' },
  { id: 'aguardando_retirada', label: '6. Pronto / Retirada', color: 'border-emerald-500/40 text-emerald-300' }
];

export const ProductionModule: React.FC<ProductionModuleProps> = ({ currentCompany }) => {
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProductionOrders();
  }, [currentCompany]);

  const fetchProductionOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('vendas')
        .select('*')
        .is('deleted_at', null)
        .neq('service_status', 'produto_entregue')
        .order('created_at', { ascending: true });

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
        items: Array.isArray(row.items) ? row.items : [],
        total: Number(row.total) || 0,
        status: row.status || 'completed',
        serviceStatus: row.service_status || 'aguardando_arte',
        responsavel: row.responsavel || '',
        observacoes: row.observacoes || '',
        scheduledFor: row.scheduled_for || '',
        createdAt: row.created_at || new Date().toISOString()
      }));

      setOrders(mapped);
    } catch (err) {
      console.error('Erro ao carregar produção:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveStatus = async (orderId: string, direction: 'next' | 'prev') => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const currentStatus = order.serviceStatus || 'aguardando_arte';
    const currentIdx = PRODUCTION_COLUMNS.findIndex(c => c.id === currentStatus);
    const targetIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;

    if (targetIdx < 0 || targetIdx >= PRODUCTION_COLUMNS.length) return;
    const targetStatus = PRODUCTION_COLUMNS[targetIdx].id;

    try {
      const { error } = await supabase
        .from('vendas')
        .update({ service_status: targetStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, serviceStatus: targetStatus as any } : o));
    } catch (err: any) {
      console.error('Erro ao mover ordem:', err);
      showAlert('Erro ao atualizar status.');
    }
  };

  const filteredOrders = orders.filter(o => {
    const term = search.toLowerCase();
    return (
      o.customerName?.toLowerCase().includes(term) ||
      o.id.toLowerCase().includes(term) ||
      o.items.some(i => i.name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="text-primary-400" size={24} />
            <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight uppercase">
              Esteira de Produção & Fábrica
            </h2>
          </div>
          <p className="text-xs text-white/50">
            Painel Kanban para controle do fluxo de impressão e acabamento gráfico.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={fetchProductionOrders}
            className="text-[10px] py-2 px-3 sm:px-4"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 min-h-0 overflow-x-auto custom-scrollbar pb-4">
        <div className="flex gap-4 min-w-[1300px] h-full">
          {PRODUCTION_COLUMNS.map((col, colIdx) => {
            const colOrders = filteredOrders.filter(o => (o.serviceStatus || 'aguardando_arte') === col.id);

            return (
              <div
                key={col.id}
                className="flex-1 flex flex-col bg-slate-950/60 border border-white/10 rounded-2xl sm:rounded-3xl p-3 min-w-[210px] h-full"
              >
                {/* Column Header */}
                <div className={`flex items-center justify-between pb-3 border-b ${col.color} mb-3 shrink-0`}>
                  <h3 className="text-xs font-black uppercase tracking-wider">{col.label}</h3>
                  <Badge variant="default" className="text-[10px] font-mono">
                    {colOrders.length}
                  </Badge>
                </div>

                {/* Cards List */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                  {colOrders.length === 0 ? (
                    <div className="h-32 border border-dashed border-white/5 rounded-2xl flex items-center justify-center text-white/20 text-xs font-bold uppercase">
                      Sem pedidos
                    </div>
                  ) : (
                    colOrders.map(order => (
                      <div
                        key={order.id}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3.5 space-y-2.5 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[9px] font-mono text-white/40 uppercase">
                            #{order.id.slice(0, 6)}
                          </span>
                          <span className="text-[10px] font-bold text-primary-400 font-mono">
                            R$ {order.total.toFixed(2)}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-black text-white truncate">{order.customerName}</h4>
                          <div className="mt-1 space-y-0.5">
                            {order.items.slice(0, 2).map((item, idx) => (
                              <p key={idx} className="text-[11px] text-white/70 truncate">
                                • {item.quantity}x {item.name} {item.dimensions ? `(${item.dimensions})` : ''}
                              </p>
                            ))}
                            {order.items.length > 2 && (
                              <p className="text-[9px] text-white/40 italic">+ {order.items.length - 2} itens</p>
                            )}
                          </div>
                        </div>

                        {/* Navigation Arrows */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                          <button
                            disabled={colIdx === 0}
                            onClick={() => handleMoveStatus(order.id, 'prev')}
                            className="p-1 text-white/40 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                            title="Voltar etapa anterior"
                          >
                            <ArrowLeft size={14} />
                          </button>

                          <span className="text-[9px] text-white/30 font-mono">
                            {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                          </span>

                          <button
                            disabled={colIdx === PRODUCTION_COLUMNS.length - 1}
                            onClick={() => handleMoveStatus(order.id, 'next')}
                            className="p-1 text-white/40 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                            title="Avançar para próxima etapa"
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
