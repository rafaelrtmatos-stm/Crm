import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bot,
  Sparkles,
  Brain,
  Database,
  History,
  Settings2,
  CheckCircle2,
  Pencil,
  Ban,
  Clock,
  MessageCircle,
  RefreshCw,
  AlertCircle,
  QrCode,
  Save,
  Package,
  Wallet,
  CalendarClock,
  Building2,
  UserRound,
  Lightbulb,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Wand2,
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { supabase } from '../supabase';
import { Company, AppUser, Lead } from '../types';
import { GlassCard, Badge, Button, DataTable, Modal, cn } from './SharedUI';
import { showAlert, showConfirm } from '../lib/notify';
import {
  RobozinhoInteraction,
  RobozinhoConfig,
  KnowledgeProduct,
  DEFAULT_ROBOZINHO_CONFIG,
  generateSuggestion,
} from '../lib/robozinhoRafa';
import { suggestReplies, type SuggestReplyHistoryItem } from '../lib/suggestReply';

// Robozinho Rafa — assistente de IA de atendimento da gráfica.
//
// Reaproveita 100% do sistema de mensagens já existente (collection
// `messages` do Firestore, o mesmo que o ChatPanel usa) para o envio real —
// esta tela só PREPARA a sugestão. Quem decide e efetivamente envia é sempre
// o atendente (ver handleEnviar abaixo: só existe um caminho de envio, e é o
// mesmo do restante do sistema).
//
// "companyId" segue a mesma convenção single-tenant já usada no restante do
// projeto (ex.: tabela `configuracoes`, company_id fixo 'rafa-arts').
const COMPANY_ID = 'rafa-arts';

type SubTab = 'sugestoes' | 'memoria' | 'historico' | 'configuracoes';

// Campos estruturados da memória do cliente (regra: só dado estável sobre a
// pessoa/negociação — nunca preço/estoque, que continuam vindo ao vivo do PDV).
interface ClientMemoryFields {
  veiculo?: string;
  interesse?: string;
  cor?: string;
  orcamento?: string;
  objecao?: string;
  etapa?: string;
  preferenciaContato?: string;
}

// Linha da tabela `robozinho_knowledge` — conhecimento da empresa (tipo
// 'empresa'), memória do cliente (tipo 'cliente', com `leadId` + `campos`) ou
// conhecimento sugerido pela IA aguardando aprovação (tipo 'sugerido').
interface KnowledgeEntry {
  id: string;
  companyId: string;
  tipo: 'empresa' | 'cliente' | 'sugerido';
  leadId?: string | null;
  titulo?: string;
  conteudo?: string;
  campos?: ClientMemoryFields | null;
  status: 'approved' | 'suggested';
  createdByName?: string;
  createdAt: string;
}

const mapKnowledgeRow = (r: any): KnowledgeEntry => ({
  id: r.id, companyId: r.company_id, tipo: r.tipo, leadId: r.lead_id,
  titulo: r.titulo, conteudo: r.conteudo, campos: r.campos || null,
  status: r.status, createdByName: r.created_by_name, createdAt: r.created_at,
});

const toMillis = (v: any): number => {
  if (!v) return 0;
  if (v instanceof Timestamp) return v.toMillis();
  const d = new Date(v);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

export const RobozinhoRafaModule = ({ currentCompany, user }: { currentCompany: Company | null; user: AppUser | null }) => {
  const [subTab, setSubTab] = useState<SubTab>('sugestoes');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [interactions, setInteractions] = useState<RobozinhoInteraction[]>([]);
  const [produtos, setProdutos] = useState<KnowledgeProduct[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [config, setConfig] = useState<RobozinhoConfig>({ companyId: COMPANY_ID, ...DEFAULT_ROBOZINHO_CONFIG });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  // Lead cujas 3 sugestões estão sendo geradas agora (spinner do botão
  // "Gerar sugestões") — geração acontece SOMENTE nesse clique, nunca sozinha.
  const [generatingLeadId, setGeneratingLeadId] = useState<string | null>(null);
  // Índice da sugestão escolhida por interação (pra destacar o card ativo
  // entre as 3 opções antes de editar/enviar).
  const [selectedOption, setSelectedOption] = useState<Record<string, number>>({});
  // Memória (conhecimento da empresa / do cliente / sugerido) — aba Memória.
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);

  // --- Leads aguardando resposta (mesma regra já usada no resto do sistema:
  // waitingSince preenchido = última mensagem é do cliente, ver ChatPanel e
  // MessagesSidebarPopup) ---
  useEffect(() => {
    if (!currentCompany) return;
    const loadLeads = async () => {
      const { data } = await supabase.from('leads').select('*').eq('company_id', 'rafa-arts');
      const all = (data || []).map((r: any) => ({
        id: r.id, fullName: r.full_name, contactName: r.contact_name, whatsappName: r.whatsapp_name,
        phone: r.phone, sourceType: r.source_type, lastMessageText: r.last_message_text,
        waitingSince: r.waiting_since,
      } as any as Lead));
      setLeads(all.filter(l => !!l.waitingSince));
    };
    loadLeads();
    const channel = supabase.channel('robozinho-leads').on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `company_id=eq.${currentCompany.id}` }, loadLeads).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany]);

  // --- Interações do Robozinho Rafa (sugestões + histórico + aprendizado,
  // tudo na mesma collection para não duplicar dado) ---
  useEffect(() => {
    if (!currentCompany) return;
    const loadInteractions = async () => {
      const { data } = await supabase.from('robozinho_interactions').select('*').eq('company_id', 'rafa-arts').order('created_at', { ascending: false });
      setInteractions((data || []).map((r: any) => ({
        id: r.id, companyId: r.company_id, leadId: r.lead_id, phone: r.phone,
        clientName: r.client_name, channel: r.channel, clientMessageText: r.client_message_text,
        clientMessageAt: r.client_message_at, suggestedText: r.suggested_text, suggestedAt: r.suggested_at,
        status: r.status, finalText: r.final_text, finalSentAt: r.final_sent_at,
        actionByName: r.action_by_name, presentedOptions: r.presented_options,
        createdAt: r.created_at, updatedAt: r.updated_at,
      } as RobozinhoInteraction)));
      setLoading(false);
    };
    loadInteractions();
    const channel = supabase.channel('robozinho-interactions').on('postgres_changes', { event: '*', schema: 'public', table: 'robozinho_interactions', filter: `company_id=eq.${currentCompany.id}` }, loadInteractions).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany]);

  // --- Conhecimento: produtos/serviços/preços/estoque/materiais/acabamentos,
  // sempre consultados ao vivo (mesma tabela e mesma fonte do módulo de
  // Estoque) — nunca usa valor "lembrado" de conversa antiga. ---
  const loadProdutos = async () => {
    const { data } = await supabase.from('produtos').select('name, sale_price, current_stock, tipo_item, controla_estoque, is_active');
    setProdutos((data || []).map((row: any) => ({
      name: row.name,
      price: Number(row.sale_price) || 0,
      stock: Number(row.current_stock) || 0,
      tipoItem: row.tipo_item || 'produto',
      controlaEstoque: row.controla_estoque !== false,
      isActive: row.is_active !== false,
    })));
  };
  useEffect(() => {
    loadProdutos();
    const channel = supabase.channel('robozinho-produtos').on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, loadProdutos).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany]);

  // --- Formas de pagamento habilitadas (mesma configuração usada no PDV) ---
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('configuracoes').select('enabled_payment_methods').eq('company_id', COMPANY_ID).maybeSingle();
      setPaymentMethods(Array.isArray(data?.enabled_payment_methods) && data.enabled_payment_methods.length > 0
        ? data.enabled_payment_methods
        : ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito']);
    };
    load();
    const channel = supabase.channel('robozinho-configuracoes').on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany]);

  // --- Configurações do agente (Firestore, doc único por empresa) ---
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase.from('robozinho_config').select('*').eq('company_id', COMPANY_ID).maybeSingle();
      if (data) {
        setConfig({
          companyId: COMPANY_ID, ...DEFAULT_ROBOZINHO_CONFIG,
          isActive: data.is_active, agentName: data.agent_name, tone: data.tone,
          autoGenerateSuggestions: data.auto_generate_suggestions, useKnowledgeBase: data.use_knowledge_base,
          showFloatingWidget: data.show_floating_widget, whatsappQrIntegration: data.whatsapp_qr_integration,
        } as RobozinhoConfig);
      }
    };
    loadConfig();
    const channel = supabase.channel('robozinho-config').on('postgres_changes', { event: '*', schema: 'public', table: 'robozinho_config', filter: `company_id=eq.${COMPANY_ID}` }, loadConfig).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- Memória (conhecimento da empresa / do cliente / sugerido) ---
  const loadKnowledge = async () => {
    const { data } = await supabase.from('robozinho_knowledge').select('*').eq('company_id', COMPANY_ID).order('created_at', { ascending: false });
    setKnowledge((data || []).map(mapKnowledgeRow));
  };
  useEffect(() => {
    if (!currentCompany) return;
    loadKnowledge();
    const channel = supabase.channel('robozinho-knowledge').on('postgres_changes', { event: '*', schema: 'public', table: 'robozinho_knowledge', filter: `company_id=eq.${COMPANY_ID}` }, loadKnowledge).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany]);

  const conhecimentoEmpresa = useMemo(() => knowledge.filter(k => k.tipo === 'empresa' && k.status === 'approved'), [knowledge]);
  const conhecimentoSugerido = useMemo(() => knowledge.filter(k => k.tipo === 'sugerido' && k.status === 'suggested'), [knowledge]);
  const memoriaClientes = useMemo(() => knowledge.filter(k => k.tipo === 'cliente'), [knowledge]);

  // --- Geração de sugestões: SOMENTE no clique de "Gerar sugestões" (nunca
  // automático, nunca por polling/Realtime). Chama o Gemini já integrado em
  // POST /api/ai/suggest-reply (uma única chamada, retorna as 3 sugestões).
  // Se o Gemini falhar, cai no fallback local generateSuggestion() (regras/
  // heurística), mantendo pelo menos 1 sugestão disponível. ---
  const handleGerarSugestoes = async (lead: Lead) => {
    setGeneratingLeadId(lead.id);
    const clientName = lead.fullName || lead.contactName || lead.whatsappName || 'Cliente';
    const clientMessage = lead.lastMessageText || '';
    try {
      // Até os últimos 10 textos relevantes da conversa — nunca a conversa inteira.
      const { data: historicoRows } = await supabase
        .from('crm_messages')
        .select('direction, text')
        .eq('company_id', 'rafa-arts')
        .eq('phone', lead.phone)
        .order('created_at', { ascending: false })
        .limit(10);
      const history: SuggestReplyHistoryItem[] = (historicoRows || [])
        .reverse()
        .filter((m: any) => m.text)
        .map((m: any) => ({ direction: m.direction === 'incoming' ? 'incoming' : 'outgoing', text: m.text }));

      let suggestions: string[];
      try {
        suggestions = await suggestReplies(clientMessage, history, clientName, user?.id);
      } catch (err) {
        console.error('Robozinho Rafa: Gemini indisponível, usando fallback:', err);
        suggestions = [generateSuggestion({ clientMessage, clientName, produtos, enabledPaymentMethods: paymentMethods })];
      }

      const { error } = await supabase.from('robozinho_interactions').insert({
        company_id: 'rafa-arts',
        lead_id: lead.id,
        phone: lead.phone,
        client_name: clientName,
        channel: lead.sourceType || 'WhatsApp',
        client_message_text: clientMessage,
        client_message_at: lead.waitingSince,
        suggested_text: suggestions[0],
        presented_options: suggestions,
        status: 'pending',
      });
      if (error) throw error;
    } catch (err) {
      console.error('Robozinho Rafa: erro ao gerar sugestões:', err);
      showAlert('Não foi possível gerar as sugestões agora.');
    } finally {
      setGeneratingLeadId(null);
    }
  };

  // --- Envio real: único caminho de envio, igual ao ChatPanel (regra 9: só
  // a resposta efetivamente enviada conta como atendimento concluído). ---
  const handleEnviar = async (interaction: RobozinhoInteraction, finalText: string, status: 'used' | 'edited') => {
    if (!currentCompany || !finalText.trim()) return;
    setBusyId(interaction.id);
    try {
      await supabase.from('crm_messages').insert({
        company_id: 'rafa-arts',
        lead_id: interaction.leadId || null,
        phone: interaction.phone,
        text: finalText.trim(),
        direction: 'outgoing',
        sender_name: user?.name ? `${user.name} (${user?.isAdmin ? 'Adm' : 'Atendente'})` : (user?.isAdmin ? 'Adm' : 'Atendente'),
        channel: interaction.channel || 'WhatsApp',
      });
      await supabase.from('leads').update({
        last_message_text: finalText.trim(),
        last_message_direction: 'outgoing',
        waiting_since: null,
        updated_at: new Date().toISOString(),
      }).eq('id', interaction.leadId);
      await supabase.from('robozinho_interactions').update({
        status,
        final_text: finalText.trim(),
        final_sent_at: new Date().toISOString(),
        action_by_name: user?.name || 'Sistema',
        updated_at: new Date().toISOString(),
      }).eq('id', interaction.id);
      setEditingId(null);
      setEditText('');
    } catch (err) {
      console.error('Robozinho Rafa: erro ao enviar resposta:', err);
      showAlert('Não foi possível enviar a resposta.');
    } finally {
      setBusyId(null);
    }
  };

  // --- Ignorar: NÃO envia nada e NÃO mexe no waitingSince do lead (regra 8:
  // fechar/ignorar a sugestão não significa que o cliente foi atendido —
  // ele continua aparecendo como aguardando resposta no resto do sistema). ---
  const handleIgnorar = async (interaction: RobozinhoInteraction) => {
    if (!(await showConfirm('Ignorar esta sugestão? O cliente continuará aparecendo como aguardando resposta.'))) return;
    setBusyId(interaction.id);
    try {
      await supabase.from('robozinho_interactions').update({
        status: 'ignored',
        action_by_name: user?.name || 'Sistema',
        updated_at: new Date().toISOString(),
      }).eq('id', interaction.id);
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveConfig = async (partial: Partial<RobozinhoConfig>) => {
    const next = { ...config, ...partial };
    setConfig(next);
    try {
      await supabase.from('robozinho_config').upsert({
        company_id: COMPANY_ID,
        is_active: next.isActive,
        agent_name: next.agentName,
        tone: next.tone,
        auto_generate_suggestions: next.autoGenerateSuggestions,
        use_knowledge_base: next.useKnowledgeBase,
        show_floating_widget: next.showFloatingWidget,
        whatsapp_qr_integration: next.whatsappQrIntegration,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' });
    } catch (err) {
      console.error('Robozinho Rafa: erro ao salvar configuração:', err);
    }
  };

  // --- Memória: conhecimento da empresa (horários, políticas, procedimentos
  // — nunca preço/estoque/produto, que continuam vindo ao vivo do PDV) ---
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoConteudo, setNovoConteudo] = useState('');
  const handleAddConhecimentoEmpresa = async () => {
    if (!novoConteudo.trim()) return;
    const { error } = await supabase.from('robozinho_knowledge').insert({
      company_id: COMPANY_ID, tipo: 'empresa', titulo: novoTitulo.trim() || null,
      conteudo: novoConteudo.trim(), status: 'approved', created_by_name: user?.name || 'Sistema',
    });
    if (error) { console.error('Robozinho Rafa: erro ao salvar conhecimento:', error); showAlert('Não foi possível salvar.'); return; }
    setNovoTitulo(''); setNovoConteudo('');
  };

  const handleDeleteKnowledge = async (entry: KnowledgeEntry) => {
    if (!(await showConfirm('Remover este item da memória?'))) return;
    await supabase.from('robozinho_knowledge').delete().eq('id', entry.id);
  };

  // --- Memória: conhecimento sugerido pela IA/atendente, só entra em
  // "conhecimento da empresa" depois de aprovado explicitamente. ---
  const [novoSugerido, setNovoSugerido] = useState('');
  const handleAddSugestaoConhecimento = async () => {
    if (!novoSugerido.trim()) return;
    const { error } = await supabase.from('robozinho_knowledge').insert({
      company_id: COMPANY_ID, tipo: 'sugerido', conteudo: novoSugerido.trim(),
      status: 'suggested', created_by_name: user?.name || 'Sistema',
    });
    if (error) { console.error('Robozinho Rafa: erro ao sugerir conhecimento:', error); showAlert('Não foi possível salvar.'); return; }
    setNovoSugerido('');
  };
  const handleApproveSugestao = async (entry: KnowledgeEntry) => {
    await supabase.from('robozinho_knowledge').update({ tipo: 'empresa', status: 'approved', updated_at: new Date().toISOString() }).eq('id', entry.id);
  };
  const handleRejectSugestao = async (entry: KnowledgeEntry) => {
    await supabase.from('robozinho_knowledge').delete().eq('id', entry.id);
  };

  // --- Memória do cliente: nome, veículo, interesse, cor, orçamento,
  // objeção, etapa e preferência de contato — sempre vinculada a um lead. ---
  const [memoriaLeadId, setMemoriaLeadId] = useState('');
  const [memoriaCampos, setMemoriaCampos] = useState<ClientMemoryFields>({});
  useEffect(() => {
    const existente = memoriaClientes.find(k => k.leadId === memoriaLeadId);
    setMemoriaCampos(existente?.campos || {});
  }, [memoriaLeadId, memoriaClientes]);
  const handleSaveMemoriaCliente = async () => {
    if (!memoriaLeadId) return;
    const lead = leads.find(l => l.id === memoriaLeadId);
    const existente = memoriaClientes.find(k => k.leadId === memoriaLeadId);
    const payload = {
      company_id: COMPANY_ID, tipo: 'cliente' as const, lead_id: memoriaLeadId,
      titulo: lead?.fullName || lead?.contactName || lead?.whatsappName || 'Cliente',
      campos: memoriaCampos, status: 'approved' as const, updated_at: new Date().toISOString(),
      created_by_name: user?.name || 'Sistema',
    };
    const { error } = existente
      ? await supabase.from('robozinho_knowledge').update(payload).eq('id', existente.id)
      : await supabase.from('robozinho_knowledge').insert(payload);
    if (error) { console.error('Robozinho Rafa: erro ao salvar memória do cliente:', error); showAlert('Não foi possível salvar.'); return; }
    showAlert('Memória do cliente salva.');
  };

  // Sugestões já geradas (aguardando escolha do atendente) e leads aguardando
  // resposta que ainda não tiveram sugestão gerada (aguardando o clique em
  // "Gerar sugestões" — nunca preenchido sozinho).
  const pendentes = useMemo(() => interactions.filter(i => i.status === 'pending'), [interactions]);
  const leadsSemSugestao = useMemo(() => {
    const comSugestao = new Set(pendentes.map(i => `${i.leadId}:${String(toMillis(i.clientMessageAt))}`));
    return leads.filter(l => !comSugestao.has(`${l.id}:${String(toMillis(l.waitingSince))}`));
  }, [leads, pendentes]);

  const produtosPorTipo = useMemo(() => {
    const grupos: Record<string, KnowledgeProduct[]> = { produto: [], material: [], servico: [], acabamento: [], composto: [] };
    produtos.filter(p => p.isActive).forEach(p => { (grupos[p.tipoItem] || (grupos[p.tipoItem] = [])).push(p); });
    return grupos;
  }, [produtos]);

  if (!currentCompany) return null;

  const TABS: { id: SubTab; label: string; icon: any }[] = [
    { id: 'sugestoes', label: 'Sugestões', icon: Sparkles },
    { id: 'memoria', label: 'Memória', icon: Brain },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'configuracoes', label: 'Configurações', icon: Settings2 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
            <Bot className="text-primary-400" size={22} />
            Robozinho Rafa
          </h2>
          <p className="text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
            Assistente de IA de atendimento — sugere, nunca envia sozinho
          </p>
        </div>
        {(pendentes.length + leadsSemSugestao.length) > 0 && (
          <Badge variant="warning" className="animate-pulse">{pendentes.length + leadsSemSugestao.length} conversa(s) aguardando</Badge>
        )}
      </div>

      {/* Sub-tabs — mesmo padrão de pílulas usado nos outros módulos, com
          rolagem horizontal no mobile pra não quebrar o layout */}
      <div className="flex bg-white/5 p-2 gap-2 border border-white/10 rounded-2xl w-full md:w-fit overflow-x-auto custom-scrollbar">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={cn(
              "px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 cursor-pointer",
              subTab === t.id ? "bg-primary-500 text-slate-950 shadow-lg" : "text-white/40 hover:text-white"
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <RefreshCw className="animate-spin text-primary-500" />
        </div>
      ) : (
        <>
          {subTab === 'sugestoes' && (
            <div className="space-y-4">
              {!config.isActive && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2 text-amber-300 text-xs font-bold">
                  <AlertCircle size={16} className="shrink-0" />
                  O Robozinho Rafa está pausado em Configurações — nenhuma sugestão nova será gerada.
                </div>
              )}
              {pendentes.length === 0 && leadsSemSugestao.length === 0 && (
                <GlassCard className="p-8 text-center">
                  <CheckCircle2 className="mx-auto text-emerald-400 mb-3" size={32} />
                  <p className="text-sm font-bold text-white/60">Nenhuma conversa aguardando resposta no momento.</p>
                </GlassCard>
              )}

              {/* Conversas aguardando resposta que ainda não tiveram sugestão gerada
                  — o Gemini só é chamado quando o atendente clica no botão abaixo. */}
              {leadsSemSugestao.map(lead => {
                const clientName = lead.fullName || lead.contactName || lead.whatsappName || 'Cliente';
                return (
                  <GlassCard key={lead.id} className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center shrink-0">
                          <MessageCircle size={14} className="text-primary-300" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{clientName}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-wider">{lead.sourceType || 'WhatsApp'}</p>
                        </div>
                      </div>
                      <Badge variant="warning" className="shrink-0 w-fit">Aguardando resposta</Badge>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                      <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">Mensagem do cliente</p>
                      <p className="text-sm text-white/80">{lead.lastMessageText || '(sem texto)'}</p>
                    </div>

                    <Button
                      icon={generatingLeadId === lead.id ? RefreshCw : Wand2}
                      disabled={!config.isActive || generatingLeadId === lead.id}
                      onClick={() => handleGerarSugestoes(lead)}
                      className={generatingLeadId === lead.id ? '[&>svg]:animate-spin' : ''}
                    >
                      {generatingLeadId === lead.id ? 'Gerando sugestões…' : 'Gerar sugestões'}
                    </Button>
                  </GlassCard>
                );
              })}

              {/* Sugestões já geradas — sempre 3 opções (ou 1, no fallback local),
                  o atendente escolhe/edita e só ele decide enviar. */}
              {pendentes.map(interaction => {
                const options = interaction.presentedOptions && interaction.presentedOptions.length > 0
                  ? interaction.presentedOptions
                  : [interaction.suggestedText];
                const chosenIndex = selectedOption[interaction.id] ?? 0;
                const chosenText = options[chosenIndex] ?? options[0];
                return (
                  <GlassCard key={interaction.id} className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center shrink-0">
                          <MessageCircle size={14} className="text-primary-300" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{interaction.clientName}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-wider">{interaction.channel}</p>
                        </div>
                      </div>
                      <Badge variant="warning" className="shrink-0 w-fit">Aguardando resposta</Badge>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                      <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">Mensagem do cliente</p>
                      <p className="text-sm text-white/80">{interaction.clientMessageText || '(sem texto)'}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase text-primary-300 tracking-widest flex items-center gap-1.5">
                        <Sparkles size={11} /> Sugestões do Robozinho Rafa{options.length > 1 ? ` (${options.length})` : ''}
                      </p>
                      {editingId === interaction.id ? (
                        <div className="bg-primary-500/10 border border-primary-500/20 rounded-2xl p-3">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={4}
                            autoFocus
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-primary-400 transition-all resize-none"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {options.map((opt, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedOption(prev => ({ ...prev, [interaction.id]: idx }))}
                              className={cn(
                                "text-left rounded-2xl p-3 border transition-all",
                                idx === chosenIndex
                                  ? "bg-primary-500/15 border-primary-500/40"
                                  : "bg-white/5 border-white/10 hover:border-white/20"
                              )}
                            >
                              <p className="text-sm text-white/90 whitespace-pre-wrap">{opt}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {editingId === interaction.id ? (
                        <>
                          <Button
                            icon={Save}
                            disabled={busyId === interaction.id}
                            onClick={() => handleEnviar(interaction, editText, 'edited')}
                          >
                            Salvar e Enviar
                          </Button>
                          <Button variant="secondary" onClick={() => { setEditingId(null); setEditText(''); }}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <Button
                            icon={CheckCircle2}
                            disabled={busyId === interaction.id}
                            onClick={() => handleEnviar(interaction, chosenText, 'used')}
                          >
                            Usar Resposta
                          </Button>
                          <Button
                            variant="secondary"
                            icon={Pencil}
                            disabled={busyId === interaction.id}
                            onClick={() => { setEditingId(interaction.id); setEditText(chosenText); }}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            icon={Ban}
                            disabled={busyId === interaction.id}
                            onClick={() => handleIgnorar(interaction)}
                          >
                            Ignorar
                          </Button>
                        </>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}

          {subTab === 'memoria' && (
            <div className="space-y-8">
              {/* --- Conhecimento da Empresa --- */}
              <div>
                <h3 className="text-sm font-black uppercase text-white/60 tracking-widest mb-3 flex items-center gap-2">
                  <Building2 size={14} className="text-primary-400" /> Conhecimento da Empresa
                  <span className="text-white/30 font-normal normal-case">({conhecimentoEmpresa.length})</span>
                </h3>
                <p className="text-[10px] text-white/40 mb-3">
                  Horários, políticas, procedimentos e outras informações estáveis — nunca preço, estoque ou disponibilidade (isso continua vindo ao vivo do PDV, mais abaixo).
                </p>
                <GlassCard className="p-4 space-y-3 mb-3">
                  <input
                    value={novoTitulo}
                    onChange={(e) => setNovoTitulo(e.target.value)}
                    placeholder="Título (opcional) — ex: Horário de funcionamento"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary-400"
                  />
                  <textarea
                    value={novoConteudo}
                    onChange={(e) => setNovoConteudo(e.target.value)}
                    rows={2}
                    placeholder="Conteúdo — ex: Funcionamos de segunda a sexta, das 8h às 18h."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary-400 resize-none"
                  />
                  <Button icon={Plus} disabled={!novoConteudo.trim()} onClick={handleAddConhecimentoEmpresa}>Adicionar</Button>
                </GlassCard>
                {conhecimentoEmpresa.length === 0 ? (
                  <p className="text-xs text-white/30 italic">Nenhum conhecimento cadastrado ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {conhecimentoEmpresa.map(k => (
                      <div key={k.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {k.titulo && <p className="text-xs font-bold text-white">{k.titulo}</p>}
                          <p className="text-xs text-white/60 whitespace-pre-wrap">{k.conteudo}</p>
                        </div>
                        <button onClick={() => handleDeleteKnowledge(k)} className="text-white/30 hover:text-rose-400 transition-colors shrink-0" aria-label="Remover">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* --- Memória do Cliente --- */}
              <div>
                <h3 className="text-sm font-black uppercase text-white/60 tracking-widest mb-3 flex items-center gap-2">
                  <UserRound size={14} className="text-primary-400" /> Memória do Cliente
                </h3>
                <GlassCard className="p-4 space-y-3">
                  <select
                    value={memoriaLeadId}
                    onChange={(e) => setMemoriaLeadId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-primary-400"
                  >
                    <option value="" className="bg-slate-900">Selecione um cliente…</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id} className="bg-slate-900">
                        {l.fullName || l.contactName || l.whatsappName || l.phone}
                      </option>
                    ))}
                  </select>

                  {memoriaLeadId && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {([
                          ['veiculo', 'Veículo'],
                          ['interesse', 'Interesse'],
                          ['cor', 'Cor'],
                          ['orcamento', 'Orçamento'],
                          ['objecao', 'Objeção'],
                          ['etapa', 'Etapa'],
                          ['preferenciaContato', 'Preferência de contato'],
                        ] as const).map(([campo, label]) => (
                          <div key={campo}>
                            <label className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1 block">{label}</label>
                            <input
                              value={memoriaCampos[campo] || ''}
                              onChange={(e) => setMemoriaCampos(prev => ({ ...prev, [campo]: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-primary-400"
                            />
                          </div>
                        ))}
                      </div>
                      <Button icon={Save} onClick={handleSaveMemoriaCliente}>Salvar Memória do Cliente</Button>
                    </>
                  )}
                </GlassCard>

                {memoriaClientes.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {memoriaClientes.map(k => (
                      <div key={k.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
                        <p className="text-xs font-bold text-white truncate">{k.titulo}</p>
                        <button onClick={() => setMemoriaLeadId(k.leadId || '')} className="text-[10px] text-primary-300 font-black uppercase tracking-widest shrink-0">Editar</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* --- Conhecimentos Sugeridos --- */}
              <div>
                <h3 className="text-sm font-black uppercase text-white/60 tracking-widest mb-3 flex items-center gap-2">
                  <Lightbulb size={14} className="text-primary-400" /> Conhecimentos Sugeridos
                  <span className="text-white/30 font-normal normal-case">({conhecimentoSugerido.length})</span>
                </h3>
                <p className="text-[10px] text-white/40 mb-3">
                  Sugestões aguardando revisão — só entram no Conhecimento da Empresa depois de aprovadas pelo atendente.
                </p>
                <GlassCard className="p-4 space-y-3 mb-3">
                  <textarea
                    value={novoSugerido}
                    onChange={(e) => setNovoSugerido(e.target.value)}
                    rows={2}
                    placeholder="Ex: cliente perguntou sobre retirada no balcão aos sábados"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary-400 resize-none"
                  />
                  <Button variant="secondary" icon={Plus} disabled={!novoSugerido.trim()} onClick={handleAddSugestaoConhecimento}>Sugerir Conhecimento</Button>
                </GlassCard>
                {conhecimentoSugerido.length === 0 ? (
                  <p className="text-xs text-white/30 italic">Nenhuma sugestão pendente.</p>
                ) : (
                  <div className="space-y-2">
                    {conhecimentoSugerido.map(k => (
                      <div key={k.id} className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                        <p className="text-xs text-white/70 whitespace-pre-wrap min-w-0">{k.conteudo}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => handleApproveSugestao(k)} className="text-emerald-400 hover:text-emerald-300 transition-colors" aria-label="Aprovar">
                            <ThumbsUp size={16} />
                          </button>
                          <button onClick={() => handleRejectSugestao(k)} className="text-white/30 hover:text-rose-400 transition-colors" aria-label="Rejeitar">
                            <ThumbsDown size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* --- Dados ao vivo do ERP (referência, nunca fica salvo na memória) --- */}
              <div>
                <h3 className="text-sm font-black uppercase text-white/60 tracking-widest mb-3 flex items-center gap-2">
                  <Database size={14} className="text-primary-400" /> Dados ao Vivo do PDV
                </h3>
                <p className="text-xs text-white/40 mb-4">
                  Consultados direto do ERP — o Robozinho Rafa nunca usa preço, estoque ou prazo "lembrado" de conversa antiga quando existe informação atualizada aqui, e nada disso fica salvo na memória acima.
                </p>
                {(['produto', 'servico', 'material', 'acabamento'] as const).map(tipo => (
                  <div key={tipo} className="mb-4">
                    <h4 className="text-xs font-black uppercase text-white/50 tracking-widest mb-2 flex items-center gap-2">
                      <Package size={12} className="text-primary-400" />
                      {tipo === 'produto' ? 'Produtos' : tipo === 'servico' ? 'Serviços' : tipo === 'material' ? 'Materiais' : 'Acabamentos'}
                      <span className="text-white/30 font-normal normal-case">({produtosPorTipo[tipo]?.length || 0})</span>
                    </h4>
                    {(produtosPorTipo[tipo]?.length || 0) === 0 ? (
                      <p className="text-xs text-white/30 italic">Nenhum item cadastrado nessa categoria.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {produtosPorTipo[tipo].slice(0, 12).map(p => (
                          <div key={p.name} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                            <p className="text-xs font-bold text-white truncate">{p.name}</p>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-[10px] text-emerald-400 font-black">{p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              {p.controlaEstoque && <span className="text-[9px] text-white/40">{p.stock} em estoque</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div className="mb-4">
                  <h4 className="text-xs font-black uppercase text-white/50 tracking-widest mb-2 flex items-center gap-2">
                    <Wallet size={12} className="text-primary-400" /> Formas de Pagamento
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {paymentMethods.map(m => <Badge key={m} variant="outline">{m.replace(/_/g, ' ')}</Badge>)}
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 text-white/40 text-xs">
                  <CalendarClock size={16} className="shrink-0" />
                  Prazos de produção são definidos por pedido e não têm um valor fixo cadastrado no ERP — o Robozinho Rafa nunca inventa uma data e sempre pede confirmação à produção.
                </div>
              </div>
            </div>
          )}

          {subTab === 'historico' && (
            <DataTable
              loading={loading}
              columns={[
                { key: 'clientName', label: 'Cliente', render: (v: string) => <span className="text-xs font-bold text-white">{v || '—'}</span> },
                { key: 'clientMessageText', label: 'Mensagem', render: (v: string) => <span className="text-xs text-white/70 line-clamp-2">{v || '—'}</span> },
                { key: 'suggestedText', label: 'Sugestão', render: (v: string) => <span className="text-xs text-white/60 line-clamp-2">{v || '—'}</span> },
                { key: 'finalText', label: 'Resposta Final', render: (v: string) => <span className="text-xs">{v || '—'}</span> },
                { key: 'actionByName', label: 'Atendente', render: (v: string) => <span className="text-xs text-white/60">{v || '—'}</span> },
                { key: 'createdAt', label: 'Data', render: (v: any) => {
                  const ms = toMillis(v);
                  return <span className="text-[10px] font-mono text-white/50">{ms ? new Date(ms).toLocaleString('pt-BR') : '—'}</span>;
                } },
                { key: 'status', label: 'Status', render: (v: string) => {
                  const map: Record<string, { label: string; variant: any }> = {
                    pending: { label: 'Aguardando', variant: 'warning' },
                    used: { label: 'Usou direto', variant: 'success' },
                    edited: { label: 'Editou e enviou', variant: 'primary' },
                    ignored: { label: 'Ignorou', variant: 'error' },
                  };
                  const info = map[v] || { label: v, variant: 'default' };
                  return <Badge variant={info.variant}>{info.label}</Badge>;
                } },
              ]}
              data={interactions}
            />
          )}

          {subTab === 'configuracoes' && (
            <div className="space-y-6 max-w-2xl">
              <GlassCard className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white">Robozinho Rafa ativo</p>
                    <p className="text-[10px] text-white/40">Libera o botão "Gerar sugestões" nas conversas aguardando resposta. A IA nunca gera nem envia nada sozinha — sempre no clique do atendente.</p>
                  </div>
                  <button
                    onClick={() => handleSaveConfig({ isActive: !config.isActive })}
                    className={cn("w-12 h-7 rounded-full transition-all relative shrink-0", config.isActive ? "bg-primary-500" : "bg-white/10")}
                  >
                    <span className={cn("absolute top-1 w-5 h-5 rounded-full bg-white transition-all", config.isActive ? "left-6" : "left-1")} />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <div>
                    <p className="text-sm font-bold text-white">Bolinha de chat flutuante</p>
                    <p className="text-[10px] text-white/40">Mostra ou esconde a bolinha do Robozinho no canto da tela (assistente interno pra testar/consultar o sistema).</p>
                  </div>
                  <button
                    onClick={() => handleSaveConfig({ showFloatingWidget: !config.showFloatingWidget })}
                    className={cn("w-12 h-7 rounded-full transition-all relative shrink-0", config.showFloatingWidget ? "bg-primary-500" : "bg-white/10")}
                  >
                    <span className={cn("absolute top-1 w-5 h-5 rounded-full bg-white transition-all", config.showFloatingWidget ? "left-6" : "left-1")} />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-sm font-bold text-white">Consultar dados do ERP</p>
                    <p className="text-[10px] text-white/40">Usa produtos, estoque e formas de pagamento reais nas sugestões.</p>
                  </div>
                  <button
                    onClick={() => handleSaveConfig({ useKnowledgeBase: !config.useKnowledgeBase })}
                    className={cn("w-12 h-7 rounded-full transition-all relative shrink-0", config.useKnowledgeBase ? "bg-primary-500" : "bg-white/10")}
                  >
                    <span className={cn("absolute top-1 w-5 h-5 rounded-full bg-white transition-all", config.useKnowledgeBase ? "left-6" : "left-1")} />
                  </button>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Tom das sugestões</p>
                  <div className="flex gap-2">
                    {(['amigavel', 'formal', 'direto'] as const).map(tone => (
                      <button
                        key={tone}
                        onClick={() => handleSaveConfig({ tone })}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          config.tone === tone ? "bg-primary-500 text-slate-950" : "bg-white/5 text-white/40 hover:text-white"
                        )}
                      >
                        {tone === 'amigavel' ? 'Amigável' : tone === 'formal' ? 'Formal' : 'Direto'}
                      </button>
                    ))}
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-5 space-y-2 opacity-70">
                <div className="flex items-center gap-2">
                  <QrCode size={16} className="text-white/40" />
                  <p className="text-sm font-bold text-white">Integração WhatsApp por QR Code</p>
                  <Badge variant="outline" className="ml-auto">Em breve</Badge>
                </div>
                <p className="text-[10px] text-white/40">
                  Estrutura reservada para uma futura conexão direta com o WhatsApp via QR Code. Ainda não implementada nesta versão — o Robozinho Rafa continua apenas sugerindo, dentro do próprio ERP.
                </p>
              </GlassCard>
            </div>
          )}
        </>
      )}
    </div>
  );
};
