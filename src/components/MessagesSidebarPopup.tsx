import React, { useState, useEffect, useContext } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AppContext } from '../App';
import { Lead, Company, AppUser } from '../types';
import { cn } from './SharedUI';
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
// 4) Visual de "balão de conversa" de propósito — MESMA paleta das bolhas de
//    mensagem reais do ChatPanel (bg-white fixo + texto slate-800, ver
//    Modules.tsx ~linha 2475): branco sempre, em qualquer tema, porque é
//    assim que as mensagens já aparecem no resto do sistema. NÃO trocar pra
//    glass-panel/dark de novo — foi assim que o tema claro ficou ilegível.
//    Tem uma "caldinha" triangular na borda esquerda apontando pro item
//    "Conversas" do menu lateral, de onde o balão foi aberto.
// 5) É a LISTA de conversas com busca, filtro (Todos/Sem Resposta), alerta de
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

      {/* Wrapper posicionado (relative) só pra caldinha poder "vazar" pra
          fora do card sem ser cortada pelo overflow-hidden do card */}
      <div className="fixed top-6 left-[336px] z-40 w-[380px] max-h-[calc(100vh-3rem)] animate-in fade-in zoom-in-95 duration-150">
        {/* Caldinha do balão — triangulo apontando pra esquerda, pro item
            "Conversas" do menu lateral de onde o balão foi aberto */}
        <div className="absolute top-8 -left-2 w-4 h-4 bg-white border-l border-b border-slate-200 rotate-45 shadow-sm" />

        {/* Corpo do balão — mesma cor das bolhas de mensagem reais do
            sistema (bg-white + texto slate-800), fixo em qualquer tema */}
        <div className="relative bg-white border border-slate-200 rounded-[28px] flex flex-col shadow-2xl overflow-hidden max-h-[calc(100vh-3rem)]">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 space-y-4 flex-shrink-0">
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

            {/* Sub-tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewFilter('all')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5",
                  viewFilter === 'all'
                    ? "bg-primary-50 border-primary-200 text-primary-700"
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                Todos
                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px]">{leads.length}</span>
              </button>
              <button
                onClick={() => setViewFilter('unreplied')}
                className={cn(
                  "flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 relative overflow-hidden",
                  viewFilter === 'unreplied'
                    ? "bg-rose-50 border-rose-200 text-rose-600"
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-600",
                  unrepliedCount > 0 && "animate-pulse"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span>Sem Resposta</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[8px] font-black",
                    unrepliedCount > 0 ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-400"
                  )}>
                    {unrepliedCount}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Alerta de vácuo */}
          {unrepliedCount > 0 && viewFilter !== 'unreplied' && (
            <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 animate-pulse flex-shrink-0">
              <div className="w-5 h-5 rounded-lg bg-rose-100 flex items-center justify-center text-rose-500">
                <Clock size={12} className="animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-rose-600 leading-none mb-0.5">Alerta de Vácuo</p>
                <p className="text-[8px] text-slate-500">{unrepliedCount} {unrepliedCount === 1 ? 'cliente aguardando' : 'clientes aguardando'} resposta!</p>
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
                  className="p-3 border-b border-slate-100 cursor-pointer transition-all group relative hover:bg-slate-50"
                >
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <div className="flex items-center gap-2 truncate">
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
                      <span className="text-[9px] text-slate-400 font-bold">{l.sourceType || 'WhatsApp'}</span>
                      <div className="w-3 h-3 rounded-full bg-slate-100 flex items-center justify-center">
                        <CheckCircle2 size={10} className="text-emerald-500" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};
