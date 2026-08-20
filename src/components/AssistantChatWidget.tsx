import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { supabase } from '../supabase';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { cn } from './SharedUI';
import { answerAdvancedQuestion } from '../lib/robozinhoRafa';
import { Company, AppUser, Lead, SaleOrder } from '../types';
import type { KnowledgeProduct, RobozinhoConversationContext } from '../lib/robozinhoRafa';

// Robozinho Rafa — bolha de chat flutuante (estilo "suporte do site").
//
// Fica disponível em qualquer tela do sistema (renderizado uma única vez no
// App.tsx, fora das abas) para o usuário testar/conversar livremente com o
// mesmo motor de conhecimento usado nas sugestões de atendimento — consulta
// produtos/estoque reais (Supabase), nunca inventa preço. Não usa a mesma
// collection de sugestões (`robozinhoInteractions`): é só um bate-papo local
// de teste, não mexe em nenhum lead/conversa de cliente.

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

export const AssistantChatWidget = ({ currentCompany, user }: { currentCompany: Company | null; user: AppUser | null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Status "digitando..." fica no cabeçalho (abaixo do nome), estilo WhatsApp —
  // nunca é renderizado como balão dentro da área de conversa.
  const [assistantTyping, setAssistantTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasWelcomedRef = useRef(false);
  // Contexto da conversa (produto/cliente em discussão, opções pendentes) —
  // mantido fora do state porque não precisa re-renderizar por si só, só
  // influencia a próxima chamada ao motor de respostas.
  const contextRef = useRef<RobozinhoConversationContext>({});
  // Garante que o som de nova mensagem toque no máximo uma vez por id —
  // protege contra duplicação em caso de re-render/stream.
  const playedSoundIdsRef = useRef<Set<string>>(new Set());
  const msgCounterRef = useRef(0);

  // Mostra/esconde a bolinha conforme configurado em Integrações > Robozinho Rafa >
  // Configurações. Enquanto a config nao carrega ainda, mostra normal (nao pisca escondido
  // sem querer) — so esconde depois de confirmar que esta desligada de fato.
  const [showWidget, setShowWidget] = useState(true);
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase.from('robozinho_config').select('show_floating_widget').eq('company_id', 'rafa-arts').maybeSingle();
      const visivel = data?.show_floating_widget !== false;
      setShowWidget(visivel);
      if (!visivel) setIsOpen(false);
    };
    loadConfig();
    const channel = supabase.channel('widget-robozinho-config').on('postgres_changes', { event: '*', schema: 'public', table: 'robozinho_config', filter: `company_id=eq.rafa-arts` }, loadConfig).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const nextId = (prefix: string) => {
    msgCounterRef.current += 1;
    return `${prefix}-${Date.now()}-${msgCounterRef.current}`;
  };

  // Toca o som de nova mensagem UMA VEZ por mensagem — nunca ao abrir,
  // digitar ou re-renderizar, só quando a mensagem realmente entra na conversa.
  const playMessageSound = (id: string) => {
    if (playedSoundIdsRef.current.has(id)) return;
    playedSoundIdsRef.current.add(id);
    try {
      const audio = new Audio('/sounds/robozinho-apresentacao.mp3');
      audio.play().catch(() => {}); // navegador pode bloquear autoplay — ignora sem quebrar a conversa
    } catch (e) { /* ignora se o navegador bloquear */ }
  };

  // Adiciona uma mensagem do bot à conversa e dispara o som — ponto único
  // pra isso acontecer, evitando duplicação de mensagem/som.
  const pushBotMessage = (text: string) => {
    const id = nextId('b');
    setMessages(prev => [...prev, { id, role: 'bot', text }]);
    playMessageSound(id);
  };

  // Divide uma resposta longa em blocos menores (até 3), pra simular uma
  // pessoa mandando mensagens em sequência, em vez de um bloco único.
  const splitReplyIntoSegments = (reply: string): string[] => {
    const parts = reply
      .split(/\n{2,}|(?<=[.!?])\s+(?=[A-ZÀ-Ú0-9])/)
      .map(p => p.trim())
      .filter(Boolean);
    if (parts.length <= 1) return [reply];
    // Agrupa em no máximo 3 blocos, juntando o excedente no último
    const max = 3;
    if (parts.length <= max) return parts;
    const head = parts.slice(0, max - 1);
    const tail = parts.slice(max - 1).join(' ');
    return [...head, tail];
  };

  // Tempo de "digitando..." proporcional ao tamanho do texto — curto e natural,
  // nunca instantâneo nem demorado demais.
  const typingDelayFor = (text: string) => {
    const len = text.length;
    if (len <= 40) return 1200;
    if (len <= 120) return 2400;
    return 3600;
  };

  // Abre o balão: a área de mensagens começa vazia. Aparece "digitando..." no
  // cabeçalho por ~3s e só então chega a mensagem de apresentação (uma única
  // vez por sessão — não repete se o usuário fechar e abrir de novo).
  const handleOpen = () => {
    setIsOpen(true);
    if (hasWelcomedRef.current) return;
    hasWelcomedRef.current = true;
    setAssistantTyping(true);
    setTimeout(() => {
      setAssistantTyping(false);
      pushBotMessage('Oi! Eu sou o Robozinho Rafa 🤖 Pode perguntar sobre preço, estoque, último serviço de um cliente, ou qualquer outra coisa — eu consulto direto no sistema.');
    }, 3000);
  };

  // Carrega leads e vendas, ambos do Supabase agora, uma única vez ao montar
  useEffect(() => {
    if (!currentCompany) return;
    const loadData = async () => {
      try {
        const { data: leadRows } = await supabase.from('leads').select('*').eq('company_id', 'rafa-arts');
        setLeads((leadRows || []).map((r: any) => ({
          id: r.id, fullName: r.full_name, contactName: r.contact_name, whatsappName: r.whatsapp_name,
          phone: r.phone, sourceType: r.source_type, lastMessageText: r.last_message_text,
        } as any as Lead)));

        // Supabase: vendas
        const { data } = await supabase
          .from('vendas')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        setSales((data || []) as SaleOrder[]);
      } catch (err) {
        console.error('Erro ao carregar dados para o Robozinho Rafa:', err);
      }
    };
    loadData();
  }, [currentCompany]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, assistantTyping]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    const userMsg: ChatMessage = { id: nextId('u'), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setDraft('');
    setSending(true);
    setAssistantTyping(true);

    try {
      // Carrega produtos
      const { data } = await supabase
        .from('produtos')
        .select('name, sale_price, current_stock, tipo_item, controla_estoque, is_active');
      const produtos: KnowledgeProduct[] = (data || []).map((row: any) => ({
        name: row.name,
        price: Number(row.sale_price) || 0,
        stock: Number(row.current_stock) || 0,
        tipoItem: row.tipo_item || 'produto',
        controlaEstoque: row.controla_estoque !== false,
        isActive: row.is_active !== false,
      }));

      // Últimas falas do próprio bot nesta conversa — só pra variar a resposta
      // e não repetir apresentação/fallback (não interfere na lógica de dados)
      const recentBotHistory = messages.filter(m => m.role === 'bot').slice(-6).map(m => m.text);

      // Gera resposta (função async) — a consulta ao sistema já acontece
      // "por trás" do status digitando..., sem mexer na lógica de estoque/CRM.
      // Passa e recebe o contexto da conversa, pra próxima mensagem continuar
      // do ponto onde parou (produto/cliente em discussão, opções pendentes).
      const { text: reply, context: newContext } = await answerAdvancedQuestion({
        question: text,
        produtos,
        userName: user?.name,
        firebaseLeads: leads,
        supabaseSales: sales,
        recentBotHistory,
        context: contextRef.current,
      });
      contextRef.current = newContext;

      // Mostra a resposta em blocos, como uma pessoa digitando mensagens em
      // sequência, em vez de tudo de uma vez — cada bloco com seu próprio som
      const segments = splitReplyIntoSegments(reply);
      for (let i = 0; i < segments.length; i++) {
        setAssistantTyping(true);
        await new Promise(resolve => setTimeout(resolve, typingDelayFor(segments[i])));
        setAssistantTyping(false);
        pushBotMessage(segments[i]);
        if (i < segments.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (err) {
      console.error('Erro no chat do Robozinho Rafa:', err);
      setAssistantTyping(false);
      pushBotMessage('Não consegui consultar o sistema agora. Tenta novamente em alguns instantes.');
    } finally {
      setSending(false);
      setAssistantTyping(false);
    }
  };

  if (!currentCompany) return null;

  if (!showWidget) return null;

  return (
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          aria-label="Conversar com o Robozinho Rafa"
          className="fixed bottom-[90px] right-5 sm:bottom-[94px] sm:right-6 z-[9999] w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-red-700 shadow-2xl shadow-red-950/60 flex items-center justify-center border border-white/10 hover:scale-105 active:scale-95 transition-transform"
        >
          <span className="absolute inset-0 rounded-full bg-primary-500/50 animate-ping" />
          <Bot size={26} className="text-white relative z-10 animate-[bounce_2.5s_ease-in-out_infinite]" />
        </button>
      )}

      {/* Painel de chat */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-[9999] bg-[#0c0c12] border border-white/10 shadow-2xl shadow-black/60 flex flex-col overflow-hidden",
            "inset-0 sm:inset-auto sm:bottom-[94px] sm:right-6 sm:w-[380px] sm:h-[560px] sm:rounded-3xl sm:max-h-[80vh]"
          )}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-primary-600 to-red-800 border-b border-white/10">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Bot size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white truncate">Robozinho Rafa</p>
              {assistantTyping ? (
                <p className="text-[10px] text-white/90 italic animate-pulse">digitando…</p>
              ) : (
                <p className="text-[10px] text-white/70 flex items-center gap-1"><Sparkles size={10} /> Assistente do sistema</p>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Fechar chat"
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3 bg-[#08080c]">
            {messages.map(m => (
              <div key={m.id} className={cn("flex animate-in fade-in slide-in-from-bottom-1 duration-300", m.role === 'user' ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap",
                    m.role === 'user'
                      ? "bg-primary-500 text-slate-950 font-medium rounded-br-sm"
                      : "bg-white/[0.06] text-white/90 border border-white/10 rounded-bl-sm"
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="shrink-0 p-3 border-t border-white/10 bg-[#0c0c12] flex items-center gap-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Pergunte sobre um material ou produto…"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500/50 min-w-0"
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || sending}
              aria-label="Enviar"
              className="w-10 h-10 rounded-xl bg-primary-500 text-slate-950 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed shrink-0 hover:bg-primary-400 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
