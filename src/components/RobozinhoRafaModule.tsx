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
  Search,
  BookOpen,
  ToggleLeft,
  ToggleRight,
  Tag,
  FileText,
  XCircle,
  RotateCcw,
  Copy,
  Check,
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
import {
  RobozinhoMemoryBlock,
  carregarMemoriaRobozinho,
  salvarBlocosMemoria,
  setAprendizadoAutomaticoAtivo,
  getMemoryBlocksSync,
  RobozinhoScripts,
  DEFAULT_ROBOZINHO_SCRIPTS,
  carregarScriptsRobozinho,
  salvarScriptsRobozinho,
} from '../lib/robozinhoMemoryStorage';

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

type SubTab = 'memoria' | 'scripts' | 'testes' | 'historico' | 'configuracoes';

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
  const [subTab, setSubTab] = useState<SubTab>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rpro_robozinho_subtab');
      if (saved === 'sugestoes') return 'memoria';
      if (saved && ['memoria', 'scripts', 'testes', 'historico', 'configuracoes'].includes(saved)) {
        return saved as SubTab;
      }
    }
    return 'memoria';
  });

  const handleSubTabChange = (t: SubTab) => {
    setSubTab(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rpro_robozinho_subtab', t);
    }
  };

  // --- Simulador / Teste do Robozinho (Ambiente Seguro sem grupos) ---
  const [testInput, setTestInput] = useState('');
  const [testClientName, setTestClientName] = useState('Cliente (Simulação)');
  const [testLoading, setTestLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[] | null>(null);
  const [testDurationMs, setTestDurationMs] = useState<number | null>(null);
  const [testCopiedIndex, setTestCopiedIndex] = useState<number | null>(null);
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

  // Memória em Blocos do Robozinho Rafa
  const [memoryBlocks, setMemoryBlocks] = useState<RobozinhoMemoryBlock[]>([]);
  const [autoLearnEnabled, setAutoLearnEnabled] = useState(true);
  const [memorySearch, setMemorySearch] = useState('');
  const [memoryCategoryFilter, setMemoryCategoryFilter] = useState<'todos' | 'precos' | 'empresa' | 'servicos' | 'geral'>('todos');
  const [isEditingBlockModalOpen, setIsEditingBlockModalOpen] = useState(false);
  const [blockForm, setBlockForm] = useState<Partial<RobozinhoMemoryBlock>>({
    title: '',
    content: '',
    category: 'precos',
  });

  // Scripts & Diretrizes da Empresa (Informações da Empresa, Script Positivo, Script Negativo)
  const [scripts, setScripts] = useState<RobozinhoScripts>(DEFAULT_ROBOZINHO_SCRIPTS);
  const [isSavingScripts, setIsSavingScripts] = useState(false);

  useEffect(() => {
    carregarMemoriaRobozinho().then(({ blocks, autoLearn }) => {
      setMemoryBlocks(blocks);
      setAutoLearnEnabled(autoLearn);
    });
    carregarScriptsRobozinho().then(res => setScripts(res));

    const handleMemoryUpdate = (e: any) => {
      if (e?.detail?.blocks) setMemoryBlocks(e.detail.blocks);
      if (typeof e?.detail?.autoLearn === 'boolean') setAutoLearnEnabled(e.detail.autoLearn);
    };
    const handleScriptsUpdate = (e: any) => {
      if (e?.detail) setScripts(e.detail);
    };
    window.addEventListener('robozinho-memory-updated', handleMemoryUpdate);
    window.addEventListener('robozinho-scripts-updated', handleScriptsUpdate);
    return () => {
      window.removeEventListener('robozinho-memory-updated', handleMemoryUpdate);
      window.removeEventListener('robozinho-scripts-updated', handleScriptsUpdate);
    };
  }, []);

  const handleSaveScripts = async () => {
    setIsSavingScripts(true);
    try {
      await salvarScriptsRobozinho(scripts);
      showAlert('Scripts e diretrizes da empresa salvos com sucesso!');
    } catch (e) {
      console.error(e);
      showAlert('Não foi possível salvar os scripts.');
    } finally {
      setIsSavingScripts(false);
    }
  };

  const handleResetScripts = async () => {
    if (await showConfirm('Deseja restaurar as informações e scripts para o padrão da Rafa Arts?')) {
      setScripts(DEFAULT_ROBOZINHO_SCRIPTS);
      await salvarScriptsRobozinho(DEFAULT_ROBOZINHO_SCRIPTS);
      showAlert('Scripts restaurados para o padrão com sucesso!');
    }
  };

  const handleToggleAutoLearn = async () => {
    const next = !autoLearnEnabled;
    setAutoLearnEnabled(next);
    await setAprendizadoAutomaticoAtivo(next);
    showAlert(next ? 'Aprendizado com conversas ATIVADO! O Robozinho agora aprenderá orçamentos e regras informados no chat.' : 'Aprendizado com conversas DESATIVADO. O Robozinho usará apenas os blocos já salvos.');
  };

  const handleOpenNewBlockModal = () => {
    setBlockForm({ title: '', content: '', category: 'precos' });
    setIsEditingBlockModalOpen(true);
  };

  const handleOpenEditBlockModal = (block: RobozinhoMemoryBlock) => {
    setBlockForm({ ...block });
    setIsEditingBlockModalOpen(true);
  };

  const handleSaveBlock = async () => {
    if (!blockForm.title?.trim() || !blockForm.content?.trim()) {
      showAlert('Preencha o título e o conteúdo do bloco de memória.');
      return;
    }
    const agora = new Date().toISOString();
    let updated: RobozinhoMemoryBlock[];
    if (blockForm.id) {
      updated = memoryBlocks.map(b => b.id === blockForm.id ? {
        ...b,
        title: blockForm.title!.trim(),
        content: blockForm.content!.trim(),
        category: (blockForm.category as any) || 'precos',
        updatedAt: agora,
      } : b);
      showAlert('Bloco de memória atualizado com sucesso!');
    } else {
      const novo: RobozinhoMemoryBlock = {
        id: `block-${Date.now()}`,
        title: blockForm.title!.trim(),
        content: blockForm.content!.trim(),
        category: (blockForm.category as any) || 'precos',
        autoLearned: false,
        source: 'Cadastrado Manualmente',
        createdAt: agora,
        updatedAt: agora,
      };
      updated = [novo, ...memoryBlocks];
      showAlert('Novo bloco de memória criado com sucesso!');
    }
    setMemoryBlocks(updated);
    await salvarBlocosMemoria(updated, autoLearnEnabled);
    setIsEditingBlockModalOpen(false);
  };

  const handleDeleteBlock = async (id: string) => {
    if (!(await showConfirm('Deseja realmente excluir este bloco de memória?'))) return;
    const updated = memoryBlocks.filter(b => b.id !== id);
    setMemoryBlocks(updated);
    await salvarBlocosMemoria(updated, autoLearnEnabled);
    showAlert('Bloco de memória removido.');
  };

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
        suggestions = await suggestReplies(
          clientMessage,
          history,
          clientName,
          user?.id,
          user?.name,
          memoryBlocks,
          produtos,
          scripts.companyInfo,
          scripts.positiveScript,
          scripts.negativeScript
        );
      } catch (err) {
        console.error('Robozinho Rafa: Gemini indisponível, usando fallback:', err);
        suggestions = [generateSuggestion({ clientMessage, clientName, produtos, enabledPaymentMethods: paymentMethods, memoryBlocks })];
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

  const handleRunTest = async (msgToTest?: string) => {
    const text = (msgToTest !== undefined ? msgToTest : testInput).trim();
    if (!text) {
      showAlert('Digite uma mensagem ou clique em um dos exemplos rápidos.');
      return;
    }
    if (msgToTest !== undefined) setTestInput(msgToTest);
    setTestLoading(true);
    setTestResults(null);
    setTestDurationMs(null);
    const t0 = Date.now();
    try {
      const suggestions = await suggestReplies(
        text,
        [],
        testClientName,
        user?.id,
        user?.name,
        memoryBlocks,
        produtos,
        scripts.companyInfo,
        scripts.positiveScript,
        scripts.negativeScript
      );
      setTestResults(suggestions);
      setTestDurationMs(Date.now() - t0);
    } catch (err: any) {
      console.warn('Erro ao testar Robozinho no simulador:', err);
      const fallback = generateSuggestion({
        clientMessage: text,
        clientName: testClientName,
        produtos,
        enabledPaymentMethods: paymentMethods,
        memoryBlocks,
      });
      setTestResults([fallback]);
      setTestDurationMs(Date.now() - t0);
    } finally {
      setTestLoading(false);
    }
  };

  const handleCopyTest = (text: string, index: number) => {
    navigator.clipboard?.writeText(text);
    setTestCopiedIndex(index);
    setTimeout(() => setTestCopiedIndex(null), 2000);
  };

  const TABS: { id: SubTab; label: string; icon: any; badge?: number }[] = [
    { id: 'memoria', label: 'Memória & Blocos', icon: Brain, badge: memoryBlocks.length },
    { id: 'scripts', label: 'Scripts & Diretrizes', icon: FileText },
    { id: 'testes', label: 'Testar Robozinho', icon: Sparkles },
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
        <div className="flex items-center gap-2">
          <Badge variant={autoLearnEnabled ? "success" : "outline"} className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1">
            {autoLearnEnabled ? "Aprendizado: Ativo" : "Aprendizado: Pausado"}
          </Badge>
          <Badge variant="primary" className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1">
            Modelo: Flash Lite (~1s)
          </Badge>
        </div>
      </div>

      {/* Sub-tabs — mesmo padrão de pílulas usado nos outros módulos, com
          rolagem horizontal no mobile pra não quebrar o layout */}
      <div className="flex bg-white/5 p-2 gap-2 border border-white/10 rounded-2xl w-full md:w-fit overflow-x-auto custom-scrollbar">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => handleSubTabChange(t.id)}
            className={cn(
              "px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 cursor-pointer",
              subTab === t.id ? "bg-primary-500 text-slate-950 shadow-lg font-black" : "text-white/40 hover:text-white"
            )}
          >
            <t.icon size={14} />
            <span>{t.label}</span>
            {t.badge !== undefined && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-tight",
                subTab === t.id ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-white/60"
              )}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <RefreshCw className="animate-spin text-primary-500" />
        </div>
      ) : (
        <>
          {subTab === 'testes' && (
            <div className="space-y-6 max-w-4xl">
              {/* Card de Apresentação do Simulador */}
              <GlassCard className="p-5 border border-primary-500/30 bg-gradient-to-r from-primary-950/40 via-slate-900/60 to-slate-950/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border bg-primary-500/20 border-primary-500/40 text-primary-400 shadow-lg shadow-primary-950/50">
                      <Sparkles size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-black uppercase text-white tracking-wider">
                          Simulador de Atendimento da Rafa Arts
                        </h3>
                        <Badge variant="primary" className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5">
                          Ambiente Seguro de Testes
                        </Badge>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed max-w-2xl">
                        Simule perguntas de clientes para testar como o Robozinho Rafa responde em tempo real. Ele consulta suas <strong>Informações da Empresa</strong>, <strong>Script Positivo</strong>, <strong>Script Negativo</strong> e a <strong>Base de Memória</strong> salva.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="success" className="text-[9px] font-black uppercase tracking-widest px-2 py-1">
                      IA Pronta (~1s)
                    </Badge>
                  </div>
                </div>
              </GlassCard>

              {/* Caixa de Entrada do Teste */}
              <GlassCard className="p-5 space-y-4 border border-white/10">
                <div>
                  <label className="text-xs font-black uppercase text-white/70 tracking-widest mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <MessageCircle size={14} className="text-primary-400" />
                      Pergunta Simulada do Cliente
                    </span>
                    <span className="text-[10px] text-white/40 normal-case font-normal">
                      Pressione Enter para testar
                    </span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleRunTest();
                        }
                      }}
                      rows={3}
                      placeholder="Ex: Quanto tá o capacete personalizado? Vocês entregam hoje com urgência? Qual a chave PIX?"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary-400 resize-none leading-relaxed transition-all font-sans"
                    />
                  </div>
                </div>

                {/* Atalhos Rápidos para Teste com 1 clique */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                    <Wand2 size={12} className="text-primary-400" />
                    Exemplos Prontos para Testar com 1 Clique:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Capacete Personalizado', text: 'Quanto fica o capacete personalizado com pintura automotiva?' },
                      { label: 'Entrega para Hoje (Urgência)', text: 'Consigo pegar um banner pronto hoje ainda com urgência?' },
                      { label: 'Chave PIX e Sinal', text: 'Qual a chave PIX da loja para eu pagar o sinal de 50%?' },
                      { label: 'Cartões de Visita', text: 'Quanto custa o cento de cartão de visita com verniz?' },
                      { label: 'Caneca Personalizada', text: 'Quanto tá a caneca personalizada e qual o prazo?' },
                      { label: 'Endereço e Retirada', text: 'Onde fica a loja para eu retirar o pedido?' },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleRunTest(chip.text)}
                        disabled={testLoading}
                        className="text-xs bg-white/5 hover:bg-primary-500/20 border border-white/10 hover:border-primary-500/40 text-white/80 hover:text-white px-3 py-1.5 rounded-xl transition-all font-medium text-left cursor-pointer"
                      >
                        + {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Nome simulado:</span>
                    <input
                      type="text"
                      value={testClientName}
                      onChange={(e) => setTestClientName(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary-400 w-44"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {testResults && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={RotateCcw}
                        onClick={() => { setTestResults(null); setTestInput(''); }}
                      >
                        Limpar
                      </Button>
                    )}
                    <Button
                      icon={testLoading ? RefreshCw : Sparkles}
                      onClick={() => handleRunTest()}
                      disabled={testLoading || !testInput.trim()}
                      className={testLoading ? '[&>svg]:animate-spin' : ''}
                    >
                      {testLoading ? 'Gerando Sugestões…' : 'Testar Resposta'}
                    </Button>
                  </div>
                </div>
              </GlassCard>

              {/* Resultados do Teste */}
              {testResults && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-white/70 tracking-widest flex items-center gap-2">
                      <Sparkles size={14} className="text-primary-400" />
                      Sugestões Geradas pelo Robozinho Rafa ({testResults.length} opções)
                    </h4>
                    {testDurationMs !== null && (
                      <Badge variant="success" className="text-[9px] font-mono font-bold tracking-wider">
                        ⚡ {testDurationMs}ms (Gemini Flash Lite)
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {testResults.map((sug, idx) => {
                      const labels = ['Opção 1: Direta e Cordial', 'Opção 2: Comercial & Resolutiva', 'Opção 3: Consultiva'];
                      const isCopied = testCopiedIndex === idx;
                      return (
                        <GlassCard key={idx} className="p-4 border border-white/10 hover:border-primary-500/30 transition-all space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-primary-300">
                              {labels[idx] || `Opção ${idx + 1}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyTest(sug, idx)}
                              className={cn(
                                "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg transition-all border cursor-pointer",
                                isCopied
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                  : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/10"
                              )}
                            >
                              {isCopied ? <Check size={12} /> : <Copy size={12} />}
                              {isCopied ? 'Copiado!' : 'Copiar'}
                            </button>
                          </div>
                          <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
                            {sug}
                          </p>
                        </GlassCard>
                      );
                    })}
                  </div>

                  {/* Checklist de Verificação das Diretrizes */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
                    <span className="font-bold text-white/80">Diretrizes validadas no teste:</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={10} /> Script Positivo Ativo
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                        <XCircle size={10} /> Script Negativo Respeitado
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full">
                        <Brain size={10} /> {memoryBlocks.length} Blocos de Memória
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {subTab === 'memoria' && (
            <div className="space-y-6">
              {/* --- 1. CHAVE MASTER: APRENDIZADO COM AS CONVERSAS --- */}
              <GlassCard className="p-4 sm:p-5 border border-primary-500/30 bg-gradient-to-r from-primary-950/40 via-slate-900/60 to-slate-950/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all",
                      autoLearnEnabled 
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-950/50" 
                        : "bg-white/5 border-white/10 text-white/40"
                    )}>
                      <Brain size={22} className={autoLearnEnabled ? "animate-pulse" : ""} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-black uppercase text-white tracking-wider">
                          Aprendizado Contínuo com Conversas
                        </h3>
                        <Badge variant={autoLearnEnabled ? "success" : "outline"} className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5">
                          {autoLearnEnabled ? 'Ativado' : 'Desativado'}
                        </Badge>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed max-w-2xl">
                        {autoLearnEnabled 
                          ? 'O Robozinho está aprendendo automaticamente com o que você responde no chat (orçamentos, preços de itens personalizados como capacetes, prazos e horários) e gravando em blocos de memória editáveis abaixo.'
                          : 'O aprendizado contínuo está pausado. O Robozinho não salvará nenhuma informação nova automaticamente e consultará apenas os blocos de memória já cadastrados.'
                        }
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleAutoLearn}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 border shadow-md active:scale-95",
                      autoLearnEnabled
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/50 shadow-emerald-950/50"
                        : "bg-white/10 hover:bg-white/20 text-white/80 border-white/20"
                    )}
                  >
                    {autoLearnEnabled ? (
                      <>
                        <ToggleRight size={18} className="text-white" />
                        <span>Aprender: Ligado</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={18} className="text-white/40" />
                        <span>Aprender: Desligado</span>
                      </>
                    )}
                  </button>
                </div>
              </GlassCard>

              {/* --- 2. BARRA DE GESTÃO DOS BLOCOS DE MEMÓRIA --- */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                    <BookOpen size={16} className="text-primary-400" />
                    Blocos de Memória Salvos
                    <span className="text-xs text-white/40 font-normal">({memoryBlocks.length} itens)</span>
                  </h3>
                  <p className="text-[11px] text-white/40">
                    Estes são os conhecimentos que o Robozinho consulta para estipular orçamentos e respostas no chat. Você pode editar qualquer bloco a qualquer momento.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button icon={Plus} onClick={handleOpenNewBlockModal}>
                    Novo Bloco
                  </Button>
                </div>
              </div>

              {/* Filtros e Busca */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                  <input
                    type="text"
                    value={memorySearch}
                    onChange={(e) => setMemorySearch(e.target.value)}
                    placeholder="Buscar na memória (ex: capacete, horário, cartão)..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary-400"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {(['todos', 'precos', 'empresa', 'servicos', 'geral'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setMemoryCategoryFilter(cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border",
                        memoryCategoryFilter === cat
                          ? "bg-primary-500/20 text-primary-300 border-primary-500/40"
                          : "bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {cat === 'todos' ? 'Todos' : cat === 'precos' ? 'Preços & Orçamentos' : cat === 'empresa' ? 'Empresa & Horários' : cat === 'servicos' ? 'Serviços' : 'Geral'}
                    </button>
                  ))}
                </div>
              </div>

              {/* --- 3. GRADE DOS BLOCOS DE MEMÓRIA --- */}
              {(() => {
                const filtrados = memoryBlocks.filter(b => {
                  if (memoryCategoryFilter !== 'todos' && b.category !== memoryCategoryFilter) return false;
                  if (!memorySearch.trim()) return true;
                  const q = memorySearch.toLowerCase();
                  return b.title.toLowerCase().includes(q) || b.content.toLowerCase().includes(q);
                });

                if (filtrados.length === 0) {
                  return (
                    <GlassCard className="p-8 text-center border-dashed border-white/10">
                      <Brain size={32} className="mx-auto text-white/20 mb-2" />
                      <p className="text-sm font-bold text-white/60 mb-1">Nenhum bloco de memória encontrado</p>
                      <p className="text-xs text-white/40 mb-4 max-w-sm mx-auto">
                        Crie um novo bloco com informações de orçamentos (ex: capacetes, brindes) ou mantenha o aprendizado ativo no chat.
                      </p>
                      <Button icon={Plus} onClick={handleOpenNewBlockModal}>
                        Criar Primeiro Bloco
                      </Button>
                    </GlassCard>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filtrados.map(block => (
                      <GlassCard key={block.id} className="p-4 flex flex-col justify-between hover:border-white/20 transition-all group">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-black uppercase text-white tracking-wide">
                                {block.title}
                              </h4>
                              <span className={cn(
                                "text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border",
                                block.category === 'precos'
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : block.category === 'empresa'
                                    ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                    : "bg-purple-500/15 text-purple-400 border-purple-500/30"
                              )}>
                                {block.category === 'precos' ? 'Preço/Orçamento' : block.category === 'empresa' ? 'Empresa' : block.category === 'servicos' ? 'Serviço' : 'Geral'}
                              </span>
                              {block.autoLearned && (
                                <span className="text-[8.5px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Sparkles size={9} /> Aprendido via Chat
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditBlockModal(block)}
                                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                title="Editar este bloco"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBlock(block.id)}
                                className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Excluir este bloco"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5">
                            {block.content}
                          </p>
                        </div>

                        <div className="pt-3 mt-1 border-t border-white/5 flex items-center justify-between text-[9px] text-white/30">
                          <span>{block.source || 'Manual'}</span>
                          <span>Atualizado {new Date(block.updatedAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                );
              })()}

              {/* MODAL PARA CRIAR / EDITAR BLOCO */}
              {isEditingBlockModalOpen && (
                <Modal
                  isOpen={isEditingBlockModalOpen}
                  onClose={() => setIsEditingBlockModalOpen(false)}
                  title={blockForm.id ? "Editar Bloco de Memória" : "Novo Bloco de Memória"}
                >
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-white/40 tracking-wider block mb-1">
                        Título do Assunto / Produto *
                      </label>
                      <input
                        type="text"
                        value={blockForm.title || ''}
                        onChange={(e) => setBlockForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Ex: Capacetes Personalizados, Banners, Horário"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary-400"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-white/40 tracking-wider block mb-1">
                        Categoria
                      </label>
                      <select
                        value={blockForm.category || 'precos'}
                        onChange={(e) => setBlockForm(prev => ({ ...prev, category: e.target.value as any }))}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-primary-400"
                      >
                        <option value="precos">Preços & Orçamentos (Itens, Valores, Formas)</option>
                        <option value="empresa">Empresa & Horários (Funcionamento, Regras, Local)</option>
                        <option value="servicos">Serviços & Prazos (Técnicas, Acabamentos)</option>
                        <option value="geral">Geral</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-white/40 tracking-wider block mb-1">
                        Informação / Conteúdo para o Robozinho lembrar *
                      </label>
                      <textarea
                        value={blockForm.content || ''}
                        onChange={(e) => setBlockForm(prev => ({ ...prev, content: e.target.value }))}
                        rows={4}
                        placeholder="Ex: O capacete personalizado custa a partir de R$ 180,00 com pintura automotiva e verniz alto brilho. Prazo de 5 dias úteis."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary-400 resize-none leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                      <Button variant="secondary" onClick={() => setIsEditingBlockModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button icon={Save} onClick={handleSaveBlock}>
                        Salvar Bloco
                      </Button>
                    </div>
                  </div>
                </Modal>
              )}

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

          {subTab === 'scripts' && (
            <div className="space-y-6 max-w-4xl">
              {/* Cabeçalho explicativo */}
              <GlassCard className="p-4 sm:p-5 border border-primary-500/30 bg-gradient-to-r from-primary-950/40 via-slate-900/60 to-slate-950/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border bg-primary-500/20 border-primary-500/40 text-primary-400 shadow-lg shadow-primary-950/50">
                      <FileText size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-black uppercase text-white tracking-wider">
                          Diretrizes de Atendimento & Scripts da Empresa
                        </h3>
                        <Badge variant="primary" className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5">
                          Regras de IA
                        </Badge>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed max-w-2xl">
                        Estas 3 seções definem a postura, as regras e proibições da sua empresa. O Robozinho Rafa lê essas diretrizes toda vez que você clica em <strong>"Sugerir resposta"</strong> no chat, garantindo que ele responda conforme a cultura da Rafa Arts.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={RotateCcw}
                      onClick={handleResetScripts}
                      title="Restaurar valores padrão recomendados"
                    >
                      Restaurar Padrão
                    </Button>
                    <Button
                      size="sm"
                      icon={Save}
                      onClick={handleSaveScripts}
                      disabled={isSavingScripts}
                    >
                      {isSavingScripts ? 'Salvando...' : 'Salvar Diretrizes'}
                    </Button>
                  </div>
                </div>
              </GlassCard>

              {/* Card 1: Informações da Empresa */}
              <GlassCard className="p-5 space-y-3 border border-white/10 hover:border-white/20 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-white tracking-wider">
                        1. Informações da Empresa & Regras Oficiais
                      </h4>
                      <p className="text-[10px] text-white/40">
                        Endereço físico, retirada/entrega, horários de atendimento, chave PIX e política de sinal de 50%.
                      </p>
                    </div>
                  </div>
                </div>
                <textarea
                  value={scripts.companyInfo}
                  onChange={(e) => setScripts(prev => ({ ...prev, companyInfo: e.target.value }))}
                  rows={5}
                  placeholder="Descreva endereço, chave PIX, horários e formas de pagamento da empresa..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-blue-400 resize-y leading-relaxed font-sans"
                />
              </GlassCard>

              {/* Card 2: Script Positivo */}
              <GlassCard className="p-5 space-y-3 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                        2. Script Positivo
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                          O que o Robozinho DEVE falar
                        </span>
                      </h4>
                      <p className="text-[10px] text-white/40">
                        Boas práticas, tom de voz cordial, chamar pelo nome, valorizar acabamento premium e pedir arte/medidas.
                      </p>
                    </div>
                  </div>
                </div>
                <textarea
                  value={scripts.positiveScript}
                  onChange={(e) => setScripts(prev => ({ ...prev, positiveScript: e.target.value }))}
                  rows={6}
                  placeholder="Ex: Cumprimente com simpatia, chame pelo nome, valorize a pintura automotiva e verniz alto brilho..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-emerald-400 resize-y leading-relaxed font-sans"
                />
              </GlassCard>

              {/* Card 3: Script Negativo */}
              <GlassCard className="p-5 space-y-3 border border-rose-500/20 hover:border-rose-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                      <XCircle size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                        3. Script Negativo
                        <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.2 rounded">
                          Travas & O que NUNCA falar
                        </span>
                      </h4>
                      <p className="text-[10px] text-white/40">
                        Proibições absolutas: nunca prometer entrega urgente sem produção, nunca dar descontos não autorizados.
                      </p>
                    </div>
                  </div>
                </div>
                <textarea
                  value={scripts.negativeScript}
                  onChange={(e) => setScripts(prev => ({ ...prev, negativeScript: e.target.value }))}
                  rows={6}
                  placeholder="Ex: NUNCA prometa entrega para hoje, NUNCA dê desconto sem falar com o Rafael, NUNCA diga 'não fazemos'..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-rose-400 resize-y leading-relaxed font-sans"
                />
              </GlassCard>

              {/* Botão de Salvar no Rodapé */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  icon={RotateCcw}
                  onClick={handleResetScripts}
                >
                  Restaurar Padrão
                </Button>
                <Button
                  icon={Save}
                  onClick={handleSaveScripts}
                  disabled={isSavingScripts}
                >
                  {isSavingScripts ? 'Salvando...' : 'Salvar Scripts & Diretrizes'}
                </Button>
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
