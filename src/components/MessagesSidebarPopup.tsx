import React, { useState, useEffect, useContext } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AppContext } from '../App';
import { Lead, Company, AppUser } from '../types';
import { GlassCard, cn, Input, Badge } from './SharedUI';
import { Search, RefreshCw, Clock, CheckCircle2, X } from 'lucide-react';
import { format } from 'date-fns';

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
// 4) É a LISTA de conversas com busca, filtro (Todos/Sem Resposta), alerta de
//    vácuo e atualização manual (getDocs, além do listener em tempo real) —
//    ao clicar numa conversa, o popup fecha e pula direto pro Funil CRM com
//    aquele card já aberto (via pendingOpenLeadId), onde o ChatPanel passa a
//    preencher a tela toda (ver flag openedViaJump no CRMModule).
export const MessagesSidebarPopup: React.FC<MessagesSidebarPopupProps> = ({
  isOpen,
  onClose,
  currentCompany,
  user,
}) => {
  const { setPendingOpenLeadId, setActiveTab } = useContext(AppContext)!;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'unreplied'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const leadsQuery = () => query(
    collection(db, 'leads'),
    where('companyId', '==', currentCompany!.id),
    orderBy('updatedAt', 'desc')
  );

  useEffect(() => {
    if (!currentCompany || !isOpen) return;
    return onSnapshot(leadsQuery(), (snap) => {
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead)));
    });
  }, [currentCompany, isOpen]);

  // Botão "Atualizar": força uma nova busca manual além do listener em tempo
  // real (útil se a conexão realtime cair ou demorar a refletir uma mudança).
  const handleRefresh = async () => {
    if (!currentCompany || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const snap = await getDocs(leadsQuery());
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead)));
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const unrepliedCount = leads.filter(l => l.waitingSince).length;

  const filteredLeads = leads
    .filter(l =>
      l.fullName.toLowerCase().includes(filter.toLowerCase()) ||
      l.phone.includes(filter)
    )
    .filter(l => (viewFilter === 'unreplied' ? !!l.waitingSince : true));

  // Ao escolher uma conversa: fecha o popup e abre ela direto no Funil CRM,
  // preenchendo a tela toda (não fica só na lista/preview do popup).
  const handleSelectLead = (lead: Lead) => {
    setPendingOpenLeadId(lead.id);
    setActiveTab('crm');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Camada invisível só pra fechar ao clicar fora — sem escurecer nem
          bloquear a leitura do conteúdo atrás do balão */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Balão flutuante — sobreposto ao conteúdo, nunca sobre a sidebar
          (left-80 = largura da sidebar) e sem cobrir a tela toda.
          Estilo "glass-panel" do sistema: fundo escuro translúcido +
          borda/glow vermelho da marca (mesma paleta de .glass-panel). */}
      <div className="fixed top-6 left-[336px] z-40 w-[380px] max-h-[calc(100vh-3rem)] bg-zinc-950/95 backdrop-blur-2xl border border-red-500/20 rounded-[24px] flex flex-col shadow-2xl shadow-red-950/40 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="p-6 border-b border-white/10 space-y-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-white italic uppercase tracking-tight flex items-center gap-1.5">
            Conversas
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRefresh}
              className="text-white/40 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
              title="Atualizar conversas"
            >
              <RefreshCw size={18} className={cn(isRefreshing && "animate-spin")} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <Input
          icon={Search}
          placeholder="Filtrar chats..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        {/* Sub-tabs */}
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

      {/* Alerta de vácuo */}
      {unrepliedCount > 0 && viewFilter !== 'unreplied' && (
        <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2 animate-pulse flex-shrink-0">
          <div className="w-5 h-5 rounded-lg bg-rose-500/25 flex items-center justify-center text-rose-400">
            <Clock size={12} className="animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-rose-400 leading-none mb-0.5">Alerta de Vácuo</p>
            <p className="text-[8px] text-white/50">{unrepliedCount} {unrepliedCount === 1 ? 'cliente aguardando' : 'clientes aguardando'} resposta!</p>
          </div>
        </div>
      )}

      {/* Lista de conversas */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredLeads.map(l => {
          const lastUpdate = l.updatedAt instanceof Timestamp ? l.updatedAt.toDate() : new Date((l as any).updatedAt || Date.now());
          const timeStr = format(lastUpdate, 'HH:mm');

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
              onClick={() => handleSelectLead(l)}
              className="p-3 border-b border-white/5 cursor-pointer transition-all group relative hover:bg-white/5"
            >
              <div className="flex justify-between items-start mb-1 gap-2">
                <div className="flex items-center gap-2 truncate">
                  <p className="font-bold transition-colors truncate text-sm text-white group-hover:text-primary-300">{l.fullName}</p>
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
      </div>
    </>
  );
};
