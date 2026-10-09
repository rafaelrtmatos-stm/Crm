import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Search,
  User,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageCircle,
  Trash2,
  Edit3,
  Filter,
  ChevronLeft,
  ChevronRight,
  Phone,
  Check,
  X,
  ExternalLink,
  CalendarDays
} from 'lucide-react';
import { supabase } from '../supabase';
import { showAlert, showConfirm } from '../lib/notify';
import { GlassCard, Button, Badge, cn } from './SharedUI';
import { AppUser, Company } from '../types';

export interface Agendamento {
  id: string;
  company_id: string;
  lead_id?: string | null;
  venda_id?: string | null;      // nota (vendas) anexada ao agendamento
  orcamento_id?: string | null;  // orçamento anexado (quando ainda não virou nota)
  servico_nome?: string | null;  // serviço anexado: nome da nota/orçamento ou nome livre do "Criar novo"
  cliente_nome: string;
  cliente_telefone: string;
  titulo: string;
  descricao?: string | null;
  data_hora: string;
  tipo: 'servico' | 'instalacao' | 'medicao' | 'retorno' | 'tarefa';
  responsavel_id?: string | null;
  responsavel_nome?: string | null;
  status: 'pendente' | 'concluido' | 'cancelado';
  endereco?: string | null;
  lembrete_enviado?: boolean;
  created_at?: string;
}

interface AgendaModuleProps {
  user: AppUser | null;
  company: Company | null;
  onOpenLead?: (leadId: string) => void;
}

const TIPO_CONFIG = {
  servico: { label: 'Serviço', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  instalacao: { label: 'Instalação', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  medicao: { label: 'Medição', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  retorno: { label: 'Retorno de Contato', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  tarefa: { label: 'Tarefa Interna', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
};

export const AgendaModule: React.FC<AgendaModuleProps> = ({ user, company, onOpenLead }) => {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'mes' | 'semana' | 'dia' | 'lista'>('mes');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal de Novo / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Agendamento | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    cliente_nome: '',
    cliente_telefone: '',
    data: new Date().toISOString().split('T')[0],
    hora: '09:00',
    tipo: 'servico' as Agendamento['tipo'],
    responsavel_nome: '',
    endereco: '',
    descricao: '',
  });

  const [colaboradores, setColaboradores] = useState<{ id: string; nome: string }[]>([]);

  // Carrega agendamentos
  const carregarAgendamentos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_agendamentos')
        .select('*')
        .eq('company_id', company?.id || 'rafa-arts')
        .order('data_hora', { ascending: true });

      if (error) {
        console.warn('Erro ao carregar crm_agendamentos:', error.message);
      } else {
        setAgendamentos(data || []);
      }
    } catch (e) {
      console.warn('Falha na tabela de agendamentos:', e);
    } finally {
      setLoading(false);
    }
  };

  // Carrega lista de colaboradores para selecionar responsável
  useEffect(() => {
    supabase
      .from('colaboradores')
      .select('id, nome')
      .eq('ativo', true)
      .then(({ data }) => {
        if (data) setColaboradores(data);
      });
  }, []);

  useEffect(() => {
    carregarAgendamentos();

    // Tempo real
    const ch = supabase
      .channel('realtime-crm-agendamentos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_agendamentos' }, carregarAgendamentos)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [company?.id]);

  const handleOpenNewModal = (prefilledDate?: string) => {
    setEditingItem(null);
    setFormData({
      titulo: '',
      cliente_nome: '',
      cliente_telefone: '',
      data: prefilledDate || new Date().toISOString().split('T')[0],
      hora: '09:00',
      tipo: 'servico',
      responsavel_nome: user?.name || '',
      endereco: '',
      descricao: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Agendamento) => {
    setEditingItem(item);
    const d = new Date(item.data_hora);
    const dataStr = d.toISOString().split('T')[0];
    const horaStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    setFormData({
      titulo: item.titulo,
      cliente_nome: item.cliente_nome || '',
      cliente_telefone: item.cliente_telefone || '',
      data: dataStr,
      hora: horaStr,
      tipo: item.tipo,
      responsavel_nome: item.responsavel_nome || '',
      endereco: item.endereco || '',
      descricao: item.descricao || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.data || !formData.hora) {
      showAlert('Preencha ao menos o título, a data e a hora do agendamento.');
      return;
    }

    const dataHoraIso = new Date(`${formData.data}T${formData.hora}:00`).toISOString();

    const payload = {
      company_id: company?.id || 'rafa-arts',
      titulo: formData.titulo.trim(),
      cliente_nome: formData.cliente_nome.trim() || null,
      cliente_telefone: formData.cliente_telefone.trim() || null,
      data_hora: dataHoraIso,
      tipo: formData.tipo,
      responsavel_nome: formData.responsavel_nome.trim() || null,
      endereco: formData.endereco.trim() || null,
      descricao: formData.descricao.trim() || null,
      status: editingItem ? editingItem.status : 'pendente',
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('crm_agendamentos')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
        showAlert('Agendamento atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('crm_agendamentos')
          .insert([payload]);
        if (error) throw error;
        showAlert('Agendamento criado com sucesso!');
      }
      setIsModalOpen(false);
      carregarAgendamentos();
    } catch (err: any) {
      console.error('Erro ao salvar agendamento:', err);
      showAlert(`Erro ao salvar: ${err.message}`);
    }
  };

  const handleToggleStatus = async (item: Agendamento) => {
    const nextStatus = item.status === 'pendente' ? 'concluido' : 'pendente';
    try {
      await supabase
        .from('crm_agendamentos')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id);
      setAgendamentos(prev => prev.map(a => a.id === item.id ? { ...a, status: nextStatus } : a));
    } catch (e) {
      showAlert('Não foi possível alterar o status.');
    }
  };

  const handleDeleteAgendamento = async (id: string) => {
    if (!(await showConfirm('Deseja excluir este agendamento?'))) return;
    try {
      await supabase.from('crm_agendamentos').delete().eq('id', id);
      setAgendamentos(prev => prev.filter(a => a.id !== id));
      showAlert('Agendamento excluído.');
    } catch (e) {
      showAlert('Não foi possível excluir.');
    }
  };

  const handleWhatsAppReminder = (item: Agendamento) => {
    const cleanPhone = (item.cliente_telefone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      showAlert('Cliente sem telefone cadastrado.');
      return;
    }
    const d = new Date(item.data_hora);
    const dataFmt = d.toLocaleDateString('pt-BR');
    const horaFmt = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const texto = encodeURIComponent(
      `Olá ${item.cliente_nome || ''}! Passando para confirmar o agendamento de *${item.titulo}* para *${dataFmt} às ${horaFmt}*. Ficamos à disposição!`
    );
    window.open(`https://wa.me/55${cleanPhone.replace(/^55/, '')}?text=${texto}`, '_blank');
  };

  // Filtros aplicados
  const agendamentosFiltrados = useMemo(() => {
    return agendamentos.filter(a => {
      if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) return false;
      if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitulo = a.titulo.toLowerCase().includes(term);
        const matchCli = (a.cliente_nome || '').toLowerCase().includes(term);
        const matchResp = (a.responsavel_nome || '').toLowerCase().includes(term);
        if (!matchTitulo && !matchCli && !matchResp) return false;
      }
      return true;
    });
  }, [agendamentos, filtroTipo, filtroStatus, searchTerm]);

  // Navegação no calendário
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'mes') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'semana') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'mes') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'semana') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Render do Mês
  const diasDoMes = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Dom
    const totalDays = new Date(year, month + 1, 0).getDate();

    const dias: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Preenche dias do mês anterior
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, dNum);
      dias.push({
        dateStr: prevDate.toISOString().split('T')[0],
        dayNum: dNum,
        isCurrentMonth: false,
      });
    }

    // Dias do mês atual
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      dias.push({
        dateStr: d.toISOString().split('T')[0],
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Complementa até 35 ou 42 células
    const remaining = (7 - (dias.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      dias.push({
        dateStr: nextDate.toISOString().split('T')[0],
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return dias;
  }, [currentDate]);

  const hojeStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Top Header & Controles */}
      <GlassCard className="p-5 border-white/10 bg-slate-900/80 backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
              <CalendarDays size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white italic tracking-tight uppercase flex items-center gap-2">
                Agenda de Serviços & Instalações
              </h2>
              <p className="text-xs text-white/50 font-medium">
                Controle diário, semanal e mensal de compromissos, rotas e prazos da equipe
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenNewModal()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-950/40 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Novo Agendamento</span>
            </button>
          </div>
        </div>

        {/* Barra de Navegação de Datas & Modos de Visualização */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-xs font-bold transition-all border border-white/10 cursor-pointer"
            >
              Hoje
            </button>
            <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-0.5">
              <button
                onClick={handlePrev}
                className="p-1.5 text-white/60 hover:text-white transition-colors cursor-pointer"
                title="Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 text-white/60 hover:text-white transition-colors cursor-pointer"
                title="Próximo"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <h3 className="text-base font-black text-white font-mono uppercase tracking-wider pl-1">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h3>
          </div>

          {/* Seletor de Modo: Mês / Semana / Lista */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 self-start md:self-auto">
            {(['mes', 'lista'] as const).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                  viewMode === m
                    ? "bg-primary-500 text-slate-950 font-extrabold shadow-sm"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                {m === 'mes' ? 'Calendário' : 'Lista Detalhada'}
              </button>
            ))}
          </div>
        </div>

        {/* Filtros Rápidos & Busca */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por serviço, cliente ou técnico..."
              className="w-full h-9 bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-white/40 shrink-0">Tipo:</span>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full h-9 bg-slate-900 border border-white/10 rounded-xl px-2.5 text-xs text-white focus:outline-none focus:border-primary-500/50"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="servico">Serviços</option>
              <option value="instalacao">Instalações</option>
              <option value="medicao">Medições</option>
              <option value="retorno">Retorno de Contato</option>
              <option value="tarefa">Tarefas Internas</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-white/40 shrink-0">Status:</span>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full h-9 bg-slate-900 border border-white/10 rounded-xl px-2.5 text-xs text-white focus:outline-none focus:border-primary-500/50"
            >
              <option value="todos">Todos os Status</option>
              <option value="pendente">Pendentes</option>
              <option value="concluido">Concluídos</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Visão de Calendário (Mês) */}
      {viewMode === 'mes' && (
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
          {/* Cabeçalho dos Dias da Semana */}
          <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.02] text-center text-[10.5px] font-black uppercase tracking-wider text-white/50 py-2.5">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          {/* Grid de Dias */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-white/5">
            {diasDoMes.map((d, idx) => {
              const itemsDoDia = agendamentosFiltrados.filter(a => a.data_hora.startsWith(d.dateStr));
              const isToday = d.dateStr === hojeStr;

              return (
                <div
                  key={idx}
                  onClick={() => handleOpenNewModal(d.dateStr)}
                  className={cn(
                    "min-h-[110px] sm:min-h-[130px] p-1.5 sm:p-2 transition-colors flex flex-col justify-between group cursor-pointer",
                    !d.isCurrentMonth ? "bg-black/40 opacity-40" : "hover:bg-white/[0.03]",
                    isToday && "bg-primary-500/10 ring-1 ring-inset ring-primary-500/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black font-mono",
                        isToday ? "bg-primary-500 text-slate-950 font-extrabold shadow-sm" : "text-white/70"
                      )}
                    >
                      {d.dayNum}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenNewModal(d.dateStr); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-white rounded transition-opacity"
                      title="Adicionar agendamento neste dia"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Lista de itens no dia */}
                  <div className="space-y-1 mt-1 overflow-y-auto max-h-[85px] custom-scrollbar">
                    {itemsDoDia.map(item => {
                      const hora = new Date(item.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      const conf = TIPO_CONFIG[item.tipo] || TIPO_CONFIG.servico;
                      const isConcluido = item.status === 'concluido';

                      return (
                        <div
                          key={item.id}
                          onClick={(e) => { e.stopPropagation(); handleOpenEditModal(item); }}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[9.5px] border truncate flex items-center gap-1 transition-all hover:scale-[1.02]",
                            conf.color,
                            isConcluido && "opacity-40 line-through grayscale"
                          )}
                          title={`${hora} - ${item.titulo} (${item.cliente_nome || 'Sem cliente'})${item.servico_nome ? ' · ' + item.servico_nome : ''}`}
                        >
                          <span className="font-mono font-bold shrink-0">{hora}</span>
                          <span className="truncate font-semibold">{item.titulo}</span>
                          {item.cliente_nome && <span className="truncate opacity-70">· {item.cliente_nome}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visão de Lista Detalhada */}
      {viewMode === 'lista' && (
        <div className="space-y-3">
          {agendamentosFiltrados.length === 0 ? (
            <GlassCard className="p-12 text-center text-white/40">
              <CalendarIcon size={36} className="mx-auto mb-3 opacity-30 text-primary-400" />
              <p className="text-sm font-bold text-white/70">Nenhum agendamento encontrado.</p>
              <p className="text-xs text-white/40 mt-1">Clique em "Novo Agendamento" para programar um serviço ou tarefa.</p>
            </GlassCard>
          ) : (
            agendamentosFiltrados.map(item => {
              const d = new Date(item.data_hora);
              const dataFmt = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
              const horaFmt = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const conf = TIPO_CONFIG[item.tipo] || TIPO_CONFIG.servico;
              const isConcluido = item.status === 'concluido';

              return (
                <GlassCard
                  key={item.id}
                  className={cn(
                    "p-4 border-white/10 bg-slate-900/80 hover:bg-slate-900 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                    isConcluido && "opacity-60 bg-slate-950/40"
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className={cn(
                        "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer mt-0.5",
                        isConcluido
                          ? "bg-emerald-500 border-emerald-500 text-slate-950"
                          : "border-white/20 hover:border-emerald-500/50 text-white/30 hover:text-emerald-400"
                      )}
                      title={isConcluido ? "Marcar como pendente" : "Marcar como concluído"}
                    >
                      <Check size={16} className={isConcluido ? "stroke-[3]" : ""} />
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border", conf.color)}>
                          {conf.label}
                        </span>
                        <h4 className={cn("text-sm font-bold text-white truncate", isConcluido && "line-through text-white/50")}>
                          {item.titulo}
                        </h4>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-white/60 flex-wrap">
                        <span className="flex items-center gap-1 font-mono text-white/80">
                          <Clock size={13} className="text-primary-400" /> {dataFmt} às {horaFmt}
                        </span>
                        {item.cliente_nome && (
                          <span className="flex items-center gap-1">
                            <User size={13} className="text-white/40" /> {item.cliente_nome}
                          </span>
                        )}
                        {item.servico_nome && (
                          <span className="flex items-center gap-1 text-amber-300/90 font-semibold">
                            🏷️ {item.servico_nome}
                          </span>
                        )}
                        {item.responsavel_nome && (
                          <span className="text-[11px] text-white/40">
                            Responsável: <strong className="text-white/70">{item.responsavel_nome}</strong>
                          </span>
                        )}
                      </div>

                      {item.endereco && (
                        <p className="text-[11px] text-white/40 flex items-center gap-1">
                          <MapPin size={11} className="text-rose-400 shrink-0" /> {item.endereco}
                        </p>
                      )}

                      {item.descricao && (
                        <p className="text-xs text-white/70 bg-white/5 p-2 rounded-lg border border-white/5 mt-1">
                          {item.descricao}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    {item.cliente_telefone && (
                      <button
                        onClick={() => handleWhatsAppReminder(item)}
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                        title="Enviar lembrete pelo WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </button>
                    )}
                    {item.lead_id && onOpenLead && (
                      <button
                        onClick={() => onOpenLead(item.lead_id!)}
                        className="p-2 rounded-xl bg-primary-500/10 hover:bg-primary-500/20 text-primary-300 border border-primary-500/20 transition-all cursor-pointer"
                        title="Abrir no CRM"
                      >
                        <ExternalLink size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-all cursor-pointer"
                      title="Editar agendamento"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteAgendamento(item.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </GlassCard>
              );
            })
          )}
        </div>
      )}

      {/* Modal de Criação / Edição de Agendamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-black text-white uppercase italic tracking-tight flex items-center gap-2">
                <CalendarDays size={18} className="text-primary-400" />
                {editingItem ? 'Editar Agendamento' : 'Novo Agendamento de Serviço'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAgendamento} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-white/50 mb-1">Título do Serviço / Compromisso *</label>
                <input
                  type="text"
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Instalação de Fachada ACM, Medição de Banner..."
                  className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/50 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/50 mb-1">Horário *</label>
                  <input
                    type="time"
                    required
                    value={formData.hora}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/50 mb-1">Tipo de Compromisso</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                    className="w-full h-10 bg-slate-950 border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="servico">Serviço Geral</option>
                    <option value="instalacao">Instalação Externa</option>
                    <option value="medicao">Medição Técnica</option>
                    <option value="retorno">Retorno de Proposta</option>
                    <option value="tarefa">Tarefa Interna</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/50 mb-1">Responsável / Colaborador</label>
                  <input
                    type="text"
                    list="colaboradores-list"
                    value={formData.responsavel_nome}
                    onChange={(e) => setFormData({ ...formData, responsavel_nome: e.target.value })}
                    placeholder="Selecione ou digite o nome..."
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-primary-500"
                  />
                  <datalist id="colaboradores-list">
                    {colaboradores.map(c => <option key={c.id} value={c.nome} />)}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/50 mb-1">Nome do Cliente</label>
                  <input
                    type="text"
                    value={formData.cliente_nome}
                    onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                    placeholder="Nome do cliente ou empresa..."
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/50 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.cliente_telefone}
                    onChange={(e) => setFormData({ ...formData, cliente_telefone: e.target.value })}
                    placeholder="(93) 99999-9999"
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-white/50 mb-1">Endereço / Local (opcional)</label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, número, bairro ou ponto de referência..."
                  className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-white/50 mb-1">Observações e Detalhes</label>
                <textarea
                  rows={2}
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Detalhes sobre o material, escada necessária, chave do local..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-white/50 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-950/40 active:scale-95 transition-all cursor-pointer"
                >
                  {editingItem ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
