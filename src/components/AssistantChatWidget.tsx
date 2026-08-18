import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { supabase } from '../supabase';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { cn } from './SharedUI';
import { answerAdvancedQuestion } from '../lib/robozinhoRafa';
import { Company, AppUser, Lead, SaleOrder } from '../types';
import type { KnowledgeProduct } from '../lib/robozinhoRafa';

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
  const [showWelcomeTyping, setShowWelcomeTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasWelcomedRef = useRef(false);

  // Abre o balão: em vez de já mostrar a mensagem de apresentação pronta,
  // exibe "digitando..." por 1,5s (estilo WhatsApp) e só então a mensagem
  // chega, junto com o som de notificação.
  const handleOpen = () => {
    setIsOpen(true);
    if (hasWelcomedRef.current) return;
    hasWelcomedRef.current = true;
    setShowWelcomeTyping(true);
    setTimeout(() => {
      setShowWelcomeTyping(false);
      setMessages(prev => [...prev, { id: 'welcome', role: 'bot', text: 'Oi! Eu sou o Robozinho Rafa 🤖 Pode perguntar sobre preço, estoque, último serviço de um cliente, ou qualquer outra coisa — eu consulto direto no sistema.' }]);
      try {
        const audio = new Audio('/sounds/robozinho-apresentacao.mp3');
        audio.play().catch(() => {});
      } catch (e) { /* ignora se o navegador bloquear */ }
    }, 1500);
  };

  // Carrega leads do Firestore e vendas do Supabase uma única vez ao montar
  useEffect(() => {
    if (!currentCompany) return;
    const loadData = async () => {
      try {
        // Firestore: leads
        const q = query(collection(db, 'leads'), where('companyId', '==', currentCompany.id));
        const snap = await getDocs(q);
        setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead)));

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
  }, [messages, isOpen, showWelcomeTyping]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setDraft('');
    setSending(true);

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

      // Adiciona mensagem "digitando..." enquanto aguarda 3 segundos
      const typingId = `b-typing-${Date.now()}`;
      setMessages(prev => [...prev, { id: typingId, role: 'bot', text: '...' }]);

      // Aguarda 3 segundos antes de gerar resposta
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Gera resposta (função async)
      const { isTyping, text: reply } = await answerAdvancedQuestion({
        question: text,
        produtos,
        userName: user?.name,
        firebaseLeads: leads,
        supabaseSales: sales,
      });

      // Remove mensagem "digitando..." e adiciona resposta real
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== typingId);
        return [...filtered, { id: `b-${Date.now()}`, role: 'bot', text: reply }];
      });
    } catch (err) {
      console.error('Erro no chat do Robozinho Rafa:', err);
      setMessages(prev => prev.filter(m => m.id !== `b-typing-${Date.now()}`));
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: 'Deu um errinho pra consultar o sistema agora. Tenta de novo em instantes?' }]);
    } finally {
      setSending(false);
    }
  };

  if (!currentCompany) return null;

  return (
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          aria-label="Conversar com o Robozinho Rafa"
          className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[9999] w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-red-700 shadow-2xl shadow-red-950/60 flex items-center justify-center border border-white/10 hover:scale-105 active:scale-95 transition-transform"
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
            "inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[560px] sm:rounded-3xl sm:max-h-[80vh]"
          )}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-primary-600 to-red-800 border-b border-white/10">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <Bot size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white truncate">Robozinho Rafa</p>
              <p className="text-[10px] text-white/70 flex items-center gap-1"><Sparkles size={10} /> Assistente do sistema</p>
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
              <div key={m.id} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
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
            {(sending || showWelcomeTyping) && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white/[0.06] border border-white/10 text-white/40 text-[13px]">
                  digitando…
                </div>
              </div>
            )}
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
