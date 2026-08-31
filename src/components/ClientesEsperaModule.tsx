import React, { useState, useEffect } from 'react';
import { 
  Clock, AlertTriangle, MessageSquare, CheckCircle, ArrowRight, 
  UserCheck, RefreshCw, Search, Phone, User, Building2, Flame
} from 'lucide-react';
import { Company, AppUser, Lead } from '../types';
import { supabase } from '../supabase';
import { showAlert } from '../lib/notify';
import { formatPhoneBR } from '../lib/validators';
import { Badge, Button } from './SharedUI';

interface ClientesEsperaModuleProps {
  currentCompany?: Company | null;
  user?: AppUser | null;
}

export const ClientesEsperaModule: React.FC<ClientesEsperaModuleProps> = ({ currentCompany, user }) => {
  const [waitingLeads, setWaitingLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetchWaitingQueue();
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, [currentCompany]);

  const fetchWaitingQueue = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('crm_leads')
        .select('*')
        .order('created_at', { ascending: true });

      if (currentCompany?.id) {
        query = query.or(`company_id.eq.${currentCompany.id},company_id.is.null`);
      }

      const { data, error } = await query;
      if (error) {
        // Fallback or empty
        console.warn('Fallback leads queue:', error.message);
        setWaitingLeads([]);
      } else {
        // Filter leads waiting for response or in initial stage
        const waiting = (data || []).filter(l => !l.deleted_at && (l.waiting_since || l.stage === 'entrada' || l.stage === 'espera' || !l.responsible_user_id));
        setWaitingLeads(waiting);
      }
    } catch (err) {
      console.error('Erro ao buscar fila de espera:', err);
      setWaitingLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const getWaitDuration = (sinceDate?: string) => {
    if (!sinceDate) return '0 min';
    const start = new Date(sinceDate).getTime();
    const diffMin = Math.max(0, Math.floor((now - start) / 60000));
    if (diffMin < 60) return `${diffMin} min`;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `${hours}h ${mins}m`;
  };

  const getUrgencyLevel = (sinceDate?: string) => {
    if (!sinceDate) return 'normal';
    const start = new Date(sinceDate).getTime();
    const diffMin = (now - start) / 60000;
    if (diffMin > 60) return 'critical';
    if (diffMin > 20) return 'warning';
    return 'normal';
  };

  const handleAttendLead = async (lead: any) => {
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({
          responsible_user_id: user?.id || null,
          responsible_name: user?.name || null,
          waiting_since: null,
          stage: 'atendimento',
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (error) throw error;
      setWaitingLeads(prev => prev.filter(l => l.id !== lead.id));
      showAlert(`Atendimento iniciado por ${user?.name || 'você'}!`);
    } catch (err: any) {
      console.error('Erro ao atender lead:', err);
      showAlert('Erro ao iniciar atendimento.');
    }
  };

  const handleOpenWhatsApp = (phone?: string, name?: string) => {
    if (!phone) {
      showAlert('Lead sem telefone cadastrado.');
      return;
    }
    const clean = phone.replace(/\D/g, '');
    const fullPhone = clean.length <= 11 ? `55${clean}` : clean;
    const text = encodeURIComponent(`Olá ${name || 'tudo bem'}! Aqui é ${user?.name ? `${user.name} da ` : ''}${currentCompany?.name || 'Rafa Arts'}. Como posso te ajudar hoje?`);
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  const filtered = waitingLeads.filter(l => {
    const term = search.toLowerCase();
    return (
      (l.full_name && l.full_name.toLowerCase().includes(term)) ||
      (l.whatsapp_name && l.whatsapp_name.toLowerCase().includes(term)) ||
      (l.phone && l.phone.includes(term)) ||
      (l.last_message_text && l.last_message_text.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="text-amber-400" size={24} />
            <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight uppercase">
              Fila de Clientes em Espera (SLA)
            </h2>
          </div>
          <p className="text-xs text-white/50">
            Acompanhe em tempo real clientes aguardando resposta para manter o tempo de atendimento ágil.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={fetchWaitingQueue}
            className="text-[10px] py-2 px-3 sm:px-4"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar Fila</span>
          </Button>
        </div>
      </div>

      {/* Search & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou mensagem..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:bg-white/10 focus:border-primary-500/50 transition-all"
          />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Aguardando</span>
          <span className="text-lg font-black text-amber-400 font-mono">{waitingLeads.length}</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Críticos (&gt;60m)</span>
          <span className="text-lg font-black text-rose-400 font-mono">
            {waitingLeads.filter(l => getUrgencyLevel(l.waiting_since || l.created_at) === 'critical').length}
          </span>
        </div>
      </div>

      {/* Queue List */}
      {loading ? (
        <div className="p-12 text-center text-white/40">Carregando fila de espera...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-white/5 border border-white/10 rounded-3xl text-center space-y-3">
          <CheckCircle className="mx-auto text-emerald-400" size={44} />
          <p className="text-sm font-bold text-white">Nenhum cliente aguardando no momento!</p>
          <p className="text-xs text-white/40">Todos os atendimentos estão em dia.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(lead => {
            const urgency = getUrgencyLevel(lead.waiting_since || lead.created_at);
            const duration = getWaitDuration(lead.waiting_since || lead.created_at);

            return (
              <div
                key={lead.id}
                className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                  urgency === 'critical'
                    ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60'
                    : urgency === 'warning'
                    ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/60'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-black text-white tracking-tight">
                        {lead.full_name || lead.whatsapp_name || 'Contato Sem Nome'}
                      </h3>
                      {lead.phone && (
                        <p className="text-xs text-white/60 font-mono flex items-center gap-1.5 mt-0.5">
                          <Phone size={12} className="text-primary-400" />
                          {formatPhoneBR(lead.phone)}
                        </p>
                      )}
                    </div>

                    <Badge
                      variant={urgency === 'critical' ? 'error' : urgency === 'warning' ? 'warning' : 'primary'}
                      className="flex items-center gap-1 shrink-0"
                    >
                      <Clock size={11} />
                      <span>{duration}</span>
                    </Badge>
                  </div>

                  {lead.last_message_text && (
                    <div className="p-3 bg-black/30 rounded-xl border border-white/5 text-xs text-white/80 italic line-clamp-2">
                      "{lead.last_message_text}"
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                    {lead.source_type || 'WhatsApp'}
                  </span>

                  <div className="flex items-center gap-2">
                    {lead.phone && (
                      <button
                        onClick={() => handleOpenWhatsApp(lead.phone, lead.full_name || lead.whatsapp_name)}
                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        <MessageSquare size={13} />
                        <span>Conversar</span>
                      </button>
                    )}

                    <Button
                      onClick={() => handleAttendLead(lead)}
                      className="text-xs py-1.5 px-3.5 bg-primary-500 hover:bg-primary-400 text-slate-900 font-black shadow-md shadow-primary-500/20"
                    >
                      <UserCheck size={14} />
                      <span>Atender</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
