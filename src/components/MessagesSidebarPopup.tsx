import React, { useState, useEffect, useContext, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, writeBatch, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { supabase } from '../supabase';
import { AppContext } from '../App';
import { Lead, Company, AppUser } from '../types';
import { cn, Button } from './SharedUI';
import { GroupChatModal } from './GroupChatModal';
import {
  Search, RefreshCw, Clock, CheckCircle2, X, Instagram, Facebook, Send, Mail, MessageCircle, Globe,
  MoreVertical, CirclePlus, VolumeX, CheckSquare, Check, Archive, Trash2, Flag, MailOpen, Users, Star,
} from 'lucide-react';
import { format } from 'date-fns';

type SortMode = 'recent' | 'unread' | 'highlight';
type SelectionMode = null | 'bulk' | 'mute' | 'group';
// Filtros da aba lateral — "Tudo", "Não lidas", "Favoritas" (leads) e "Grupos"
// (troca a lista inteira pra mostrar os grupos do WhatsApp em vez de leads)
type ViewFilter = 'all' | 'unreplied' | 'favorite' | 'groups';

interface WhatsAppGroupRow {
  id: string;
  group_jid: string;
  nome: string | null;
  visivel: boolean;
  created_at: string;
}

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'recent', label: 'Mais recentes' },
  { id: 'unread', label: 'Não lidos primeiro' },
  { id: 'highlight', label: 'Destaque' },
];

// Ícone + cor por canal de origem — MESMA paleta usada no simulador de canais
// (ver Modules.tsx ~linha 4290, bolinhas coloridas do seletor de canal), só
// que aqui com o ícone da marca em vez da bolinha, pra identificar de onde a
// mensagem veio de relance na lista.
const CHANNEL_STYLE: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  WhatsApp: { icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  Instagram: { icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50' },
  Facebook: { icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50' },
  WebChat: { icon: Globe, color: 'text-sky-600', bg: 'bg-sky-50' },
  'E-mail': { icon: Mail, color: 'text-amber-600', bg: 'bg-amber-50' },
  Telegram: { icon: Send, color: 'text-indigo-600', bg: 'bg-indigo-50' },
};
const getChannelStyle = (channel?: string) => CHANNEL_STYLE[channel || 'WhatsApp'] || CHANNEL_STYLE.WhatsApp;

interface MessagesSidebarPopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentCompany: Company | null;
  user: AppUser | null;
}

// Balão flutuante de Mensagens acionado pelo menu lateral (desktop).
//
// Regras de posicionamento e comportamento (não mexer sem revalidar):
// 1) É um BALÃO flutuante sobreposto ao conteúdo (não cobre a tela toda) —
//    ancorado logo à direita do menu lateral (left-80 = mesma largura fixa
//    da sidebar em desktop, w-80), com tamanho e altura máxima limitados.
//    O conteúdo por trás continua visível e a página não trava.
// 2) Nunca cobre a própria sidebar: left sempre >= largura da sidebar (w-80)
//    e o balão fica em z-40, abaixo do z-50 da sidebar — dupla garantia.
// 3) Sem backdrop escurecido: existe apenas uma camada invisível (sem blur
//    nem cor) atrás do balão só para fechar ao clicar fora.
// 4) Visual de "balão de conversa" de propósito — MESMA paleta das bolhas de
//    mensagem reais do ChatPanel (bg-white fixo + texto slate-800, ver
//    Modules.tsx ~linha 2475): branco sempre, em qualquer tema, porque é
//    assim que as mensagens já aparecem no resto do sistema. NÃO trocar pra
//    glass-panel/dark (bg-zinc-950) de novo — no tema escuro isso fica quase
//    preto e sem contraste com o rounded-[28px], lendo como "um quadrado
//    preto" em vez de balão. Tem uma "caldinha" triangular na borda esquerda
//    apontando pro item "Conversas" do menu lateral.
// 5) É a LISTA de conversas com busca, filtro (Todos/Sem Resposta), alerta de
//    vácuo CLICÁVEL (leva direto pro filtro "Sem Resposta") e atualização
//    manual (getDocs, além do listener em tempo real) — ao clicar numa
//    conversa, o popup fecha e pula direto pro Funil CRM com aquele card já
//    aberto (via pendingOpenLeadId), onde o ChatPanel passa a preencher a
//    tela toda (ver flag openedViaJump no CRMModule).
// 6) Cada conversa mostra o ícone colorido do canal de origem (WhatsApp,
//    Instagram, Facebook, WebChat, E-mail, Telegram — ver CHANNEL_STYLE
//    acima) pra identificar de onde a mensagem veio sem precisar ler o texto.
// 7) Menu de opções (⋮ no header) — dropdown compacto no padrão do restante
//    do ERP (mesmo estilo do dropdown de etapa do ChatPanel, ver Modules.tsx
//    ~linha 2320): "Criar um grupo", "Silenciar" e "Ações múltiplas" entram
//    no MESMO modo de seleção por checkbox (SelectionMode), cada um com sua
//    barra de ação específica — evita duplicar a lógica de seleção 3x. Um
//    separador e o submenu "Ordenar" (Mais recentes / Não lidos primeiro /
//    Destaque) ficam embaixo, com o item ativo marcado (✓ + cor primária).
//    Ordenação é client-side e independente do status: "Mais recentes" usa
//    a própria ordem da query (updatedAt desc, já realtime — uma conversa
//    antiga que recebe mensagem nova sobe sozinha); "Não lidos primeiro"
//    prioriza unread/waitingSince; "Destaque" prioriza priority === 'alta'.
export const MessagesSidebarPopup: React.FC<MessagesSidebarPopupProps> = ({
  isOpen,
  onClose,
  currentCompany,
  user,
}) => {
  const { setPendingOpenLeadId, setActiveTab } = useContext(AppContext)!;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- Grupos do WhatsApp (aba "Grupos") ---
  // Só traz os grupos já liberados pelo admin (visivel=true — ver
  // WhatsAppGroupsModule.tsx); se o usuário não for admin, só os grupos que
  // ele tem acesso liberado (tabela user_whatsapp_groups)
  const [grupos, setGrupos] = useState<WhatsAppGroupRow[]>([]);
  const [grupoPreview, setGrupoPreview] = useState<Record<string, { texto: string; data: string }>>({});
  const [grupoAberto, setGrupoAberto] = useState<WhatsAppGroupRow | null>(null);

  useEffect(() => {
    if (!currentCompany || !isOpen) return;
    const carregarGrupos = async () => {
      let gruposQuery = supabase.from('whatsapp_groups').select('*').eq('company_id', 'rafa-arts').eq('visivel', true);
      const { data: gruposData } = await gruposQuery.order('created_at', { ascending: false });
      let listaFinal = gruposData || [];

      if (user && !user.isAdmin) {
        const { data: acessos } = await supabase.from('user_whatsapp_groups').select('group_id').eq('user_id', user.id);
        const idsPermitidos = new Set((acessos || []).map((a: any) => a.group_id));
        listaFinal = listaFinal.filter(g => idsPermitidos.has(g.id));
      }
      setGrupos(listaFinal);

      // Busca a última mensagem de cada grupo (pra preview na lista), num único
      // select filtrando pelos telefones (IDs) dos grupos já carregados
      if (listaFinal.length > 0) {
        const telefonesDosGrupos = listaFinal.map(g => g.group_jid.replace('@g.us', '').replace(/\D/g, ''));
        const { data: mensagens } = await supabase
          .from('crm_messages')
          .select('phone, text, created_at')
          .eq('company_id', 'rafa-arts')
          .in('phone', telefonesDosGrupos)
          .order('created_at', { ascending: false });
        const previewMap: Record<string, { texto: string; data: string }> = {};
        (mensagens || []).forEach((m: any) => {
          if (!previewMap[m.phone]) previewMap[m.phone] = { texto: m.text, data: m.created_at };
        });
        setGrupoPreview(previewMap);
      }
    };
    carregarGrupos();
    const channel = supabase.channel('sidebar-popup-grupos').on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_groups' }, carregarGrupos).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany, isOpen, user]);

  // Menu de opções (⋮) e suas funções
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [isSavingAction, setIsSavingAction] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentCompany || !isOpen) return;
    const loadLeads = async () => {
      const { data } = await supabase.from('leads').select('*').eq('company_id', 'rafa-arts').order('updated_at', { ascending: false });
      setLeads((data || []).map((r: any) => ({
        id: r.id, companyId: r.company_id, fullName: r.full_name, contactName: r.contact_name, whatsappName: r.whatsapp_name,
        phone: r.phone, sourceType: r.source_type, lastMessageText: r.last_message_text, lastMessageDirection: r.last_message_direction,
        waitingSince: r.waiting_since, funnelId: r.funnel_id, funnelStageId: r.funnel_stage_id,
        createdAt: r.created_at, updatedAt: r.updated_at,
      } as any as Lead)));
    };
    loadLeads();
    const channel = supabase.channel('sidebar-popup-leads').on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `company_id=eq.${currentCompany.id}` }, loadLeads).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany, isOpen]);

  // Botão "Atualizar": força uma nova busca manual além do listener em tempo
  // real (útil se a conexão realtime cair ou demorar a refletir uma mudança).
  const handleRefresh = async () => {
    if (!currentCompany || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const { data } = await supabase.from('leads').select('*').eq('company_id', 'rafa-arts').order('updated_at', { ascending: false });
      setLeads((data || []).map((r: any) => ({
        id: r.id, companyId: r.company_id, fullName: r.full_name, contactName: r.contact_name, whatsappName: r.whatsapp_name,
        phone: r.phone, sourceType: r.source_type, lastMessageText: r.last_message_text, lastMessageDirection: r.last_message_direction,
        waitingSince: r.waiting_since, funnelId: r.funnel_id, funnelStageId: r.funnel_stage_id,
        createdAt: r.created_at, updatedAt: r.updated_at,
      } as any as Lead)));
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const unrepliedCount = leads.filter(l => l.waitingSince).length;

  // Ordenação client-side sobre a lista já vinda ordenada por updatedAt desc
  // (Firestore). "Mais recentes" não precisa reordenar; os outros dois modos
  // fazem um sort estável (mantém a ordem relativa por recência dentro de
  // cada grupo) só pra trazer o grupo relevante pro topo.
  const sortLeads = (list: Lead[]) => {
    if (sortMode === 'unread') {
      return [...list].sort((a, b) => Number(!!(b.unread ?? b.waitingSince)) - Number(!!(a.unread ?? a.waitingSince)));
    }
    if (sortMode === 'highlight') {
      return [...list].sort((a, b) => Number(b.priority === 'alta') - Number(a.priority === 'alta'));
    }
    return list;
  };

  const filteredLeads = sortLeads(
    leads
      .filter(l => !l.archived)
      .filter(l =>
        l.fullName.toLowerCase().includes(filter.toLowerCase()) ||
        l.phone.includes(filter)
      )
      .filter(l => (viewFilter === 'unreplied' ? !!l.waitingSince : true))
      .filter(l => (viewFilter === 'favorite' ? l.priority === 'alta' : true))
  );

  const filteredGrupos = grupos.filter(g => (g.nome || g.group_jid).toLowerCase().includes(filter.toLowerCase()));

  // Ao escolher uma conversa: fecha o popup e abre ela direto no Funil CRM,
  // preenchendo a tela toda (não fica só na lista/preview do popup). Em modo
  // de seleção, o clique alterna o checkbox em vez de abrir a conversa.
  const handleSelectLead = (lead: Lead) => {
    if (selectionMode) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.has(lead.id) ? next.delete(lead.id) : next.add(lead.id);
        return next;
      });
      return;
    }
    setPendingOpenLeadId(lead.id);
    setActiveTab('crm');
    onClose();
  };

  const startSelection = (mode: Exclude<SelectionMode, null>) => {
    setSelectionMode(mode);
    setSelectedIds(new Set());
    setGroupName('');
    setIsMenuOpen(false);
  };

  const cancelSelection = () => {
    setSelectionMode(null);
    setSelectedIds(new Set());
    setGroupName('');
  };

  // Aplica um patch de campos a todos os leads selecionados de uma vez
  const applyBulkPatch = async (patch: Record<string, any>) => {
    if (!selectedIds.size || isSavingAction) return;
    setIsSavingAction(true);
    try {
      // Converte as chaves camelCase usadas no resto do app pra snake_case das colunas
      const patchSnake: Record<string, any> = {};
      Object.entries(patch).forEach(([k, v]) => {
        const snakeKey = k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
        patchSnake[snakeKey] = v;
      });
      await supabase.from('leads').update({ ...patchSnake, updated_at: new Date().toISOString() }).in('id', Array.from(selectedIds));
      cancelSelection();
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleConfirmMute = () => applyBulkPatch({ muted: true });

  const handleCreateGroup = async () => {
    if (!currentCompany || !groupName.trim() || !selectedIds.size || isSavingAction) return;
    setIsSavingAction(true);
    try {
      await supabase.from('lead_groups').insert({
        company_id: 'rafa-arts',
        name: groupName.trim(),
        lead_ids: Array.from(selectedIds),
        created_by: user?.id || null,
      });
      cancelSelection();
    } finally {
      setIsSavingAction(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Camada invisível só pra fechar ao clicar fora — sem escurecer nem
          bloquear a leitura do conteúdo atrás do balão */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Wrapper posicionado (relative) só pra caldinha poder "vazar" pra
          fora do card sem ser cortada pelo overflow-hidden do card */}
      <div className="fixed top-6 left-[336px] z-40 w-[380px] max-h-[calc(100vh-3rem)] animate-in fade-in zoom-in-95 duration-150">
        {/* Caldinha do balão — triangulo apontando pra esquerda, pro item
            "Conversas" do menu lateral de onde o balão foi aberto */}
        <div className="absolute top-8 -left-2 w-4 h-4 bg-slate-50 border-l border-b border-slate-200 rotate-45 shadow-sm" />

        {/* Corpo do balão — mesma base das bolhas de mensagem reais do
            sistema, só que um tom levemente mais escuro (slate-50 em vez de
            branco puro) pra dar mais "corpo" profissional, fixo em qualquer
            tema */}
        <div className="relative bg-slate-50 border border-slate-200 rounded-[28px] flex flex-col shadow-2xl overflow-hidden max-h-[calc(100vh-3rem)]">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 bg-white space-y-4 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 italic uppercase tracking-tight flex items-center gap-1.5">
                Conversas
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="text-slate-400 hover:text-primary-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                  title="Atualizar conversas"
                >
                  <RefreshCw size={18} className={cn(isRefreshing && "animate-spin")} />
                </button>

                {/* Menu de opções — grupo, silenciar, ações múltiplas e ordenação (ver regra 7 acima) */}
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(o => !o)}
                    className={cn(
                      "text-slate-400 hover:text-primary-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100",
                      isMenuOpen && "bg-slate-100 text-primary-600"
                    )}
                    title="Mais opções"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {isMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                      <div className="absolute top-full right-0 mt-1.5 w-[230px] bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1.5 text-sm">
                        <button
                          type="button"
                          onClick={() => startSelection('group')}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-left"
                        >
                          <CirclePlus size={16} className="text-slate-400 shrink-0" />
                          Criar um grupo
                        </button>
                        <button
                          type="button"
                          onClick={() => startSelection('mute')}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-left"
                        >
                          <VolumeX size={16} className="text-slate-400 shrink-0" />
                          Silenciar
                        </button>
                        <button
                          type="button"
                          onClick={() => startSelection('bulk')}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-left"
                        >
                          <CheckSquare size={16} className="text-slate-400 shrink-0" />
                          Ações múltiplas
                        </button>

                        <div className="border-t border-slate-100 my-1.5" />

                        <p className="px-3.5 pt-1 pb-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400">Ordenar</p>
                        {SORT_OPTIONS.map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => { setSortMode(opt.id); setIsMenuOpen(false); }}
                            className={cn(
                              "w-full flex items-center justify-between gap-2.5 pl-6 pr-3.5 py-2 transition-colors text-left",
                              sortMode === opt.id ? "text-primary-600 font-bold" : "text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            {opt.label}
                            {sortMode === opt.id && <Check size={14} className="text-primary-600 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Busca — estilo claro próprio (não usa o Input compartilhado,
                que é escuro por padrão e destoaria do balão branco) */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Filtrar chats..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-primary-400 transition-all"
              />
            </div>

            {/* Sub-tabs: Tudo / Não lidas / Favoritas / Grupos */}
            <div className="flex gap-1.5">
              <button
                onClick={() => setViewFilter('all')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1",
                  viewFilter === 'all'
                    ? "bg-primary-50 border-primary-200 text-primary-700"
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                Tudo
                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px]">{leads.length}</span>
              </button>
              <button
                onClick={() => setViewFilter('unreplied')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1 relative overflow-hidden",
                  viewFilter === 'unreplied'
                    ? "bg-rose-50 border-rose-200 text-rose-600"
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-600",
                  unrepliedCount > 0 && viewFilter !== 'unreplied' && "animate-pulse"
                )}
              >
                Não lidas
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[8px] font-black",
                  unrepliedCount > 0 ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-400"
                )}>
                  {unrepliedCount}
                </span>
              </button>
              <button
                onClick={() => setViewFilter('favorite')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1",
                  viewFilter === 'favorite'
                    ? "bg-amber-50 border-amber-200 text-amber-600"
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <Star size={11} className={viewFilter === 'favorite' ? "fill-amber-500 text-amber-500" : ""} />
                Favoritas
              </button>
              <button
                onClick={() => setViewFilter('groups')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1",
                  viewFilter === 'groups'
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                <Users size={11} />
                Grupos
                {grupos.length > 0 && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px]">{grupos.length}</span>}
              </button>
            </div>
          </div>

          {/* Barra contextual de seleção — aparece para os 3 modos disparados
              pelo menu (grupo/silenciar/ações múltiplas). Reaproveita o mesmo
              mecanismo de checkbox na lista pros 3 casos. */}
          {selectionMode && (
            <div className="px-4 py-3 border-b border-slate-200 bg-primary-50/60 flex-shrink-0 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-primary-700">
                  {selectedIds.size} {selectedIds.size === 1 ? 'selecionada' : 'selecionadas'}
                </span>
                <button type="button" onClick={cancelSelection} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              {selectionMode === 'group' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Nome do grupo..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-primary-400 transition-all"
                  />
                  <Button
                    variant="primary"
                    className="h-9 px-3 text-[10px]"
                    disabled={!groupName.trim() || !selectedIds.size || isSavingAction}
                    onClick={handleCreateGroup}
                  >
                    Criar
                  </Button>
                </div>
              )}

              {selectionMode === 'mute' && (
                <Button
                  variant="primary"
                  className="w-full h-9 text-[10px]"
                  icon={VolumeX}
                  disabled={!selectedIds.size || isSavingAction}
                  onClick={handleConfirmMute}
                >
                  Silenciar {selectedIds.size || ''} conversa{selectedIds.size === 1 ? '' : 's'}
                </Button>
              )}

              {selectionMode === 'bulk' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" disabled={!selectedIds.size || isSavingAction} onClick={() => applyBulkPatch({ unread: false })} title="Marcar como lida" className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-primary-600 hover:border-primary-300 transition-colors disabled:opacity-40">
                    <MailOpen size={14} />
                  </button>
                  <button type="button" disabled={!selectedIds.size || isSavingAction} onClick={() => applyBulkPatch({ unread: true })} title="Marcar como não lida" className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-primary-600 hover:border-primary-300 transition-colors disabled:opacity-40">
                    <Mail size={14} />
                  </button>
                  <button type="button" disabled={!selectedIds.size || isSavingAction} onClick={() => applyBulkPatch({ priority: 'alta' })} title="Marcar prioridade alta" className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-300 transition-colors disabled:opacity-40">
                    <Flag size={14} />
                  </button>
                  <button type="button" disabled={!selectedIds.size || isSavingAction} onClick={() => applyBulkPatch({ muted: true })} title="Silenciar" className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-primary-600 hover:border-primary-300 transition-colors disabled:opacity-40">
                    <VolumeX size={14} />
                  </button>
                  <button type="button" disabled={!selectedIds.size || isSavingAction} onClick={() => applyBulkPatch({ archived: true })} title="Arquivar" className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-primary-600 hover:border-primary-300 transition-colors disabled:opacity-40">
                    <Archive size={14} />
                  </button>
                  <button type="button" disabled={!selectedIds.size || isSavingAction} onClick={() => applyBulkPatch({ status: 'ENCERRADO', archived: true })} title="Excluir / encerrar" className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300 transition-colors disabled:opacity-40">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Alerta de vácuo — clicável: leva direto pro filtro "Não lidas" */}
          {unrepliedCount > 0 && viewFilter !== 'unreplied' && viewFilter !== 'groups' && (
            <button
              type="button"
              onClick={() => setViewFilter('unreplied')}
              className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 animate-pulse flex-shrink-0 text-left hover:bg-rose-100 hover:border-rose-300 transition-colors cursor-pointer"
              title="Ver conversas sem resposta"
            >
              <div className="w-5 h-5 rounded-lg bg-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                <Clock size={12} className="animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-rose-600 leading-none mb-0.5">Alerta de Vácuo</p>
                <p className="text-[8px] text-slate-500">{unrepliedCount} {unrepliedCount === 1 ? 'cliente aguardando' : 'clientes aguardando'} resposta!</p>
              </div>
            </button>
          )}

          {/* Lista de conversas (leads) ou de grupos, dependendo da aba ativa */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {viewFilter === 'groups' ? (
              <>
                {filteredGrupos.length === 0 && (
                  <div className="p-6 text-center">
                    <Users size={22} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">
                      {grupos.length === 0
                        ? 'Nenhum grupo liberado ainda. Peça pro admin liberar em Integrações > Grupos WhatsApp.'
                        : 'Nenhum grupo encontrado com esse filtro.'}
                    </p>
                  </div>
                )}
                {filteredGrupos.map(g => {
                  const groupPhone = g.group_jid.replace('@g.us', '').replace(/\D/g, '');
                  const preview = grupoPreview[groupPhone];
                  const timeStr = preview ? format(new Date(preview.data), 'HH:mm') : '';
                  return (
                    <div
                      key={g.id}
                      onClick={() => setGrupoAberto(g)}
                      className="p-3 border-b border-slate-200 cursor-pointer transition-all group relative bg-white hover:bg-slate-50 flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <Users size={16} className="text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-sm text-slate-800 truncate group-hover:text-primary-600">{g.nome || g.group_jid}</p>
                          {timeStr && <span className="text-[10px] font-black text-slate-400 uppercase shrink-0">{timeStr}</span>}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{preview?.texto || 'Sem mensagens registradas'}</p>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              filteredLeads.map(l => {
              const lastUpdate = l.updatedAt instanceof Timestamp ? l.updatedAt.toDate() : new Date((l as any).updatedAt || Date.now());
              const timeStr = format(lastUpdate, 'HH:mm');

              const waitingSinceDate = l.waitingSince
                ? (l.waitingSince instanceof Timestamp ? l.waitingSince.toDate() : new Date(l.waitingSince))
                : null;

              let slaColor = "text-slate-400 bg-slate-100 border-slate-200";
              let slaLabel = "";
              let pulseBadge = false;

              if (waitingSinceDate) {
                const diffMinutes = Math.round((new Date().getTime() - waitingSinceDate.getTime()) / 60000);
                if (diffMinutes < 5) {
                  slaColor = "text-sky-600 bg-sky-50 border-sky-200";
                  slaLabel = `há ${diffMinutes} min`;
                } else if (diffMinutes < 15) {
                  slaColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
                  slaLabel = `há ${diffMinutes} min`;
                } else if (diffMinutes < 30) {
                  slaColor = "text-amber-600 bg-amber-50 border-amber-200";
                  slaLabel = `ATENÇÃO: ${diffMinutes} min`;
                  pulseBadge = true;
                } else if (diffMinutes < 60) {
                  slaColor = "text-orange-600 bg-orange-50 border-orange-200";
                  slaLabel = `ALERTA: ${diffMinutes} min`;
                  pulseBadge = true;
                } else {
                  const hours = Math.floor(diffMinutes / 60);
                  slaColor = "text-rose-600 bg-rose-50 border-rose-200";
                  slaLabel = `CRÍTICO: ${hours}h+ s/ resp`;
                  pulseBadge = true;
                }
              }

              return (
                <div
                  key={l.id}
                  onClick={() => handleSelectLead(l)}
                  className="p-3 border-b border-slate-200 cursor-pointer transition-all group relative bg-white hover:bg-slate-50"
                >
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <div className="flex items-center gap-2 truncate">
                      {selectionMode && (
                        <div className={cn(
                          "w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                          selectedIds.has(l.id) ? "bg-primary-600 border-primary-600" : "border-slate-300 bg-white"
                        )}>
                          {selectedIds.has(l.id) && <Check size={11} className="text-white" strokeWidth={3} />}
                        </div>
                      )}
                      {(() => {
                        const { icon: ChannelIcon, color, bg } = getChannelStyle(l.sourceType);
                        return (
                          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", bg)} title={l.sourceType || 'WhatsApp'}>
                            <ChannelIcon size={13} className={color} />
                          </div>
                        );
                      })()}
                      <p className="font-bold transition-colors truncate text-sm text-slate-800 group-hover:text-primary-600">{l.fullName}</p>
                      {waitingSinceDate && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" title="Cliente aguardando resposta!" />
                      )}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase shrink-0">{timeStr}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs text-slate-500 truncate flex-1">{l.lastMessageText || 'Sem mensagens'}</p>
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
                    <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border bg-primary-50 text-primary-700 border-primary-200">
                      {l.status}
                    </span>
                    <div className="ml-auto flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                      <div className="w-3 h-3 rounded-full bg-slate-100 flex items-center justify-center">
                        <CheckCircle2 size={10} className="text-emerald-500" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
            )}
          </div>
        </div>
      </div>

      {grupoAberto && (
        <GroupChatModal
          group={grupoAberto}
          currentCompany={currentCompany}
          user={user}
          onClose={() => setGrupoAberto(null)}
          onCloseParent={onClose}
        />
      )}
    </>
  );
};
