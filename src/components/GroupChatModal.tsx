import React, { useState, useEffect, useRef, useContext } from 'react';
import { X, Users, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { supabase } from '../supabase';
import { AppContext } from '../App';
import { Company, AppUser } from '../types';
import { cn } from './SharedUI';
import { showAlert } from '../lib/notify';
import { format, isSameDay } from 'date-fns';

// Histórico de conversa de um GRUPO do WhatsApp, em estilo "tela de celular"
// (bolhas de mensagem, nome do participante acima de cada bolha recebida,
// mensagens da própria empresa alinhadas à direita) — aberto a partir da aba
// "Grupos" do balão de Mensagens (ver MessagesSidebarPopup.tsx).
//
// Requisito chave: clicar em cima do NOME/avatar de um participante abre (ou
// cria) a conversa individual dele no Funil de Atendimento do CRM — mesmo
// comportamento de quando se clica numa conversa normal na aba lateral.
// Isso só funciona pra mensagens que já vieram com "sender_phone" preenchido
// (participante identificado pelo webhook — ver api/whatsapp-webhook.js).

interface WhatsAppGroup {
  id: string;
  group_jid: string;
  nome: string | null;
}

interface GroupMessageRow {
  id: string;
  text: string | null;
  direction: string;
  sender_name: string | null;
  sender_phone: string | null;
  created_at: string;
}

// Paleta de cor por participante — só visual, pra distinguir quem é quem no
// grupo de relance (mesma ideia do WhatsApp de verdade, que colore o nome de
// cada participante de um jeito diferente)
const PARTICIPANT_COLORS = ['text-emerald-600', 'text-sky-600', 'text-amber-600', 'text-pink-600', 'text-violet-600', 'text-orange-600'];
const colorForParticipant = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return PARTICIPANT_COLORS[hash % PARTICIPANT_COLORS.length];
};

interface GroupChatModalProps {
  group: WhatsAppGroup;
  currentCompany: Company | null;
  user: AppUser | null;
  onClose: () => void;
  // Fecha também quem abriu o grupo (o balão de Mensagens), já que ao
  // escolher um participante a navegação sai da tela de grupos e vai pro Funil
  onCloseParent?: () => void;
}

export const GroupChatModal: React.FC<GroupChatModalProps> = ({ group, currentCompany, user, onClose, onCloseParent }) => {
  const { setPendingOpenLeadId, setActiveTab } = useContext(AppContext)!;
  const [mensagens, setMensagens] = useState<GroupMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [abrindoParticipante, setAbrindoParticipante] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const groupPhone = group.group_jid.replace('@g.us', '').replace(/\D/g, '');

  useEffect(() => {
    if (!currentCompany) return;
    const carregar = async () => {
      const { data } = await supabase
        .from('crm_messages')
        .select('id, text, direction, sender_name, sender_phone, created_at')
        .eq('company_id', 'rafa-arts')
        .eq('phone', groupPhone)
        .order('created_at', { ascending: true })
        .limit(500);
      setMensagens(data || []);
      setLoading(false);
    };
    carregar();
    const channel = supabase
      .channel(`group-chat-${group.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_messages', filter: `phone=eq.${groupPhone}` }, (payload) => {
        setMensagens(prev => [...prev, payload.new as GroupMessageRow]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id, groupPhone, currentCompany]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensagens]);

  // Acha (ou cria) o lead pelo telefone do participante e leva pro Funil CRM
  // — mesma lógica de find-or-create usada em openWhatsAppChat (App.tsx),
  // só que aqui a navegação final é pro Funil (aba 'crm'), igual ao clique
  // numa conversa normal da aba lateral de Mensagens (requisito 2).
  const handleAbrirParticipante = async (senderPhone: string | null, senderName: string | null) => {
    if (!senderPhone) {
      showAlert('Não foi possível identificar o contato dessa mensagem (participante sem telefone salvo).');
      return;
    }
    if (!currentCompany || abrindoParticipante) return;
    setAbrindoParticipante(senderPhone);
    try {
      const { data: leadsRows } = await supabase.from('leads').select('id, phone').eq('company_id', 'rafa-arts');
      const existente = (leadsRows || []).find((r: any) => {
        const p = (r.phone || '').replace(/\D/g, '');
        return p && (p === senderPhone || p.endsWith(senderPhone) || senderPhone.endsWith(p));
      });

      let leadId: string;
      if (existente) {
        leadId = existente.id;
      } else {
        let funnelId: string | null = null;
        let funnelStageId: string | null = null;
        let { data: funnelRows } = await supabase.from('funnels').select('id').eq('company_id', 'rafa-arts').eq('is_default', true).limit(1);
        if (!funnelRows || funnelRows.length === 0) {
          const { data } = await supabase.from('funnels').select('id').eq('company_id', 'rafa-arts').limit(1);
          funnelRows = data;
        }
        if (funnelRows && funnelRows.length > 0) {
          funnelId = funnelRows[0].id;
          let { data: stageRows } = await supabase.from('funnel_stages').select('id').eq('funnel_id', funnelId).eq('is_initial', true).limit(1);
          if (!stageRows || stageRows.length === 0) {
            const { data } = await supabase.from('funnel_stages').select('id').eq('funnel_id', funnelId).order('order', { ascending: true }).limit(1);
            stageRows = data;
          }
          if (stageRows && stageRows.length > 0) funnelStageId = stageRows[0].id;
        }

        const nome = senderName || 'Contato do grupo';
        const nameParts = nome.trim().split(' ');
        const { data: novoLead, error } = await supabase.from('leads').insert({
          company_id: 'rafa-arts',
          funnel_id: funnelId,
          funnel_stage_id: funnelStageId,
          full_name: nome,
          first_name: nameParts[0] || nome,
          last_name: nameParts.slice(1).join(' ') || '',
          phone: senderPhone,
          source_type: 'WhatsApp',
        }).select().single();
        if (error) throw error;
        leadId = novoLead.id;
      }

      setPendingOpenLeadId(leadId);
      setActiveTab('crm');
      onClose();
      onCloseParent?.();
    } catch (err) {
      console.error('Erro ao abrir conversa do participante:', err);
      showAlert('Não foi possível abrir a conversa desse contato.');
    } finally {
      setAbrindoParticipante(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        {/* "Tela de celular": card estreito e alto, fundo de chat clarinho, igual papel de parede do WhatsApp */}
        <div
          className="pointer-events-auto w-full max-w-[420px] h-[calc(100vh-2rem)] max-h-[780px] bg-[#e9edef] rounded-[28px] shadow-2xl overflow-hidden flex flex-col border border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header estilo WhatsApp */}
          <div className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="p-1 -ml-1 rounded-lg hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">{group.nome || 'Grupo do WhatsApp'}</p>
              <p className="text-[10px] text-white/70">Histórico de conversas do grupo</p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Corpo do chat */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-1.5">
            {loading && <p className="text-center text-[11px] text-slate-400 py-8">Carregando conversas...</p>}
            {!loading && mensagens.length === 0 && (
              <p className="text-center text-[11px] text-slate-400 py-8">Nenhuma mensagem registrada desse grupo ainda.</p>
            )}
            {mensagens.map((m, idx) => {
              const anterior = mensagens[idx - 1];
              const dataAtual = new Date(m.created_at);
              const mostraDivisorData = !anterior || !isSameDay(new Date(anterior.created_at), dataAtual);
              const isMinha = m.direction === 'outgoing';
              const participantKey = m.sender_phone || m.sender_name || 'desconhecido';

              return (
                <React.Fragment key={m.id}>
                  {mostraDivisorData && (
                    <div className="flex justify-center py-2">
                      <span className="bg-white/80 text-slate-500 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
                        {format(dataAtual, 'dd/MM/yyyy')}
                      </span>
                    </div>
                  )}
                  <div className={cn("flex", isMinha ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[78%] rounded-2xl px-3 py-2 shadow-sm",
                      isMinha ? "bg-[#d9fdd3] rounded-tr-sm" : "bg-white rounded-tl-sm"
                    )}>
                      {!isMinha && (
                        <button
                          type="button"
                          onClick={() => handleAbrirParticipante(m.sender_phone, m.sender_name)}
                          disabled={abrindoParticipante === m.sender_phone}
                          title={m.sender_phone ? 'Conversar diretamente com esse contato no CRM' : 'Contato sem telefone identificado'}
                          className={cn(
                            "text-[11px] font-black mb-0.5 hover:underline disabled:opacity-50 disabled:no-underline text-left",
                            colorForParticipant(participantKey),
                            !m.sender_phone && "cursor-default no-underline"
                          )}
                        >
                          {abrindoParticipante === m.sender_phone ? 'Abrindo conversa...' : (m.sender_name || 'Participante')}
                        </button>
                      )}
                      <p className="text-[13px] text-slate-800 whitespace-pre-wrap break-words leading-snug">{m.text}</p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className="text-[9px] text-slate-400">{format(dataAtual, 'HH:mm')}</span>
                        {isMinha && <CheckCheck size={12} className="text-sky-500" />}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <div className="bg-white border-t border-slate-200 px-4 py-2.5 flex-shrink-0">
            <p className="text-[10px] text-slate-400 text-center">
              Clique no nome de um participante pra conversar direto com ele no Funil de Atendimento.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
