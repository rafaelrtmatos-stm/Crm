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

type SubTab = 'sugestoes' | 'aprendizado' | 'conhecimento' | 'historico' | 'configuracoes';

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

  // Evita gerar/gravar a mesma sugestão duas vezes por causa de re-render do
  // listener em tempo real (o efeito abaixo roda toda vez que `leads` ou
  // `interactions` mudam).
  const generatingRef = useRef<Set<string>>(new Set());

  // --- Leads aguardando resposta (mesma regra já usada no resto do sistema:
  // waitingSince preenchido = última mensagem é do cliente, ver ChatPanel e
  // MessagesSidebarPopup) ---
  useEffect(() => {
    if (!currentCompany) return;
    const q = query(collection(db, 'leads'), where('companyId', '==', currentCompany.id));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
      setLeads(all.filter(l => !!l.waitingSince));
    });
  }, [currentCompany]);

  // --- Interações do Robozinho Rafa (sugestões + histórico + aprendizado,
  // tudo na mesma collection para não duplicar dado) ---
  useEffect(() => {
    if (!currentCompany) return;
    const q = query(
      collection(db, 'robozinhoInteractions'),
      where('companyId', '==', currentCompany.id),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setInteractions(snap.docs.map(d => ({ id: d.id, ...d.data() } as RobozinhoInteraction)));
      setLoading(false);
    });
    return () => unsub();
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
    const ref = doc(db, 'robozinhoConfig', COMPANY_ID);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setConfig({ companyId: COMPANY_ID, ...DEFAULT_ROBOZINHO_CONFIG, ...snap.data() } as RobozinhoConfig);
      }
    });
    return () => unsub();
  }, []);

  // --- Regra 1 e 2: se a última mensagem for do cliente (waitingSince
  // preenchido), prepara uma sugestão. Se o cliente voltar numa conversa
  // antiga, o waitingSince muda de novo -> trata como nova interação. ---
  useEffect(() => {
    if (!currentCompany || !config.isActive || !config.autoGenerateSuggestions) return;
    leads.forEach(lead => {
      const waitingKey = String(toMillis(lead.waitingSince));
      const dedupeKey = `${lead.id}:${waitingKey}`;
      if (generatingRef.current.has(dedupeKey)) return;
      const jaExiste = interactions.some(i => i.leadId === lead.id && String(toMillis(i.clientMessageAt)) === waitingKey);
      if (jaExiste) return;

      generatingRef.current.add(dedupeKey);
      const suggestedText = generateSuggestion({
        clientMessage: lead.lastMessageText || '',
        clientName: lead.fullName || lead.contactName || lead.whatsappName,
        produtos,
        enabledPaymentMethods: paymentMethods,
      });
      addDoc(collection(db, 'robozinhoInteractions'), {
        companyId: currentCompany.id,
        leadId: lead.id,
        phone: lead.phone,
        clientName: lead.fullName || lead.contactName || lead.whatsappName || 'Cliente',
        channel: lead.sourceType || 'WhatsApp',
        clientMessageText: lead.lastMessageText || '',
        clientMessageAt: lead.waitingSince,
        suggestedText,
        suggestedAt: Timestamp.now(),
        status: 'pending',
        createdAt: Timestamp.now(),
      }).catch(err => console.error('Robozinho Rafa: erro ao gerar sugestão:', err));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, interactions, produtos, paymentMethods, currentCompany, config.isActive, config.autoGenerateSuggestions]);

  // --- Envio real: único caminho de envio, igual ao ChatPanel (regra 9: só
  // a resposta efetivamente enviada conta como atendimento concluído). ---
  const handleEnviar = async (interaction: RobozinhoInteraction, finalText: string, status: 'used' | 'edited') => {
    if (!currentCompany || !finalText.trim()) return;
    setBusyId(interaction.id);
    try {
      await addDoc(collection(db, 'messages'), {
        companyId: currentCompany.id,
        phone: interaction.phone,
        text: finalText.trim(),
        direction: 'outgoing',
        senderName: user?.name || 'Sistema',
        channel: interaction.channel || 'WhatsApp',
        createdAt: Timestamp.now(),
      });
      await updateDoc(doc(db, 'leads', interaction.leadId), {
        lastMessageText: finalText.trim(),
        lastMessageDirection: 'outgoing',
        waitingSince: null,
        updatedAt: Timestamp.now(),
      });
      await updateDoc(doc(db, 'robozinhoInteractions', interaction.id), {
        status,
        finalText: finalText.trim(),
        finalSentAt: Timestamp.now(),
        actionByName: user?.name || 'Sistema',
        updatedAt: Timestamp.now(),
      });
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
      await updateDoc(doc(db, 'robozinhoInteractions', interaction.id), {
        status: 'ignored',
        actionByName: user?.name || 'Sistema',
        updatedAt: Timestamp.now(),
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveConfig = async (partial: Partial<RobozinhoConfig>) => {
    const next = { ...config, ...partial };
    setConfig(next);
    try {
      await setDoc(doc(db, 'robozinhoConfig', COMPANY_ID), { ...next, updatedAt: Timestamp.now() }, { merge: true });
    } catch (err) {
      console.error('Robozinho Rafa: erro ao salvar configuração:', err);
    }
  };

  const pendentes = useMemo(() => interactions.filter(i => i.status === 'pending'), [interactions]);

  // --- Aprendizado: agregações client-side sobre as próprias interações —
  // não duplica dado em outra collection. ---
  const aprendizado = useMemo(() => {
    const usadas = interactions.filter(i => i.status === 'used').length;
    const editadas = interactions.filter(i => i.status === 'edited').length;
    const ignoradas = interactions.filter(i => i.status === 'ignored').length;
    const freq: Record<string, number> = {};
    interactions.forEach(i => {
      const key = (i.clientMessageText || '').trim().toLowerCase();
      if (key.length < 3) return;
      freq[key] = (freq[key] || 0) + 1;
    });
    const perguntasFrequentes = Object.entries(freq)
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    return { usadas, editadas, ignoradas, perguntasFrequentes };
  }, [interactions]);

  const produtosPorTipo = useMemo(() => {
    const grupos: Record<string, KnowledgeProduct[]> = { produto: [], material: [], servico: [], acabamento: [], composto: [] };
    produtos.filter(p => p.isActive).forEach(p => { (grupos[p.tipoItem] || (grupos[p.tipoItem] = [])).push(p); });
    return grupos;
  }, [produtos]);

  if (!currentCompany) return null;

  const TABS: { id: SubTab; label: string; icon: any }[] = [
    { id: 'sugestoes', label: 'Sugestões', icon: Sparkles },
    { id: 'aprendizado', label: 'Aprendizado', icon: Brain },
    { id: 'conhecimento', label: 'Conhecimento', icon: Database },
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
        {pendentes.length > 0 && (
          <Badge variant="warning" className="animate-pulse">{pendentes.length} sugestão(ões) aguardando</Badge>
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
              {pendentes.length === 0 && (
                <GlassCard className="p-8 text-center">
                  <CheckCircle2 className="mx-auto text-emerald-400 mb-3" size={32} />
                  <p className="text-sm font-bold text-white/60">Nenhuma conversa aguardando sugestão no momento.</p>
                </GlassCard>
              )}
              {pendentes.map(interaction => (
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

                  <div className="bg-primary-500/10 border border-primary-500/20 rounded-2xl p-3">
                    <p className="text-[9px] font-black uppercase text-primary-300 tracking-widest mb-1 flex items-center gap-1.5">
                      <Sparkles size={11} /> Sugestão do Robozinho Rafa
                    </p>
                    {editingId === interaction.id ? (
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={4}
                        autoFocus
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-primary-400 transition-all resize-none"
                      />
                    ) : (
                      <p className="text-sm text-white/90 whitespace-pre-wrap">{interaction.suggestedText}</p>
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
                          onClick={() => handleEnviar(interaction, interaction.suggestedText, 'used')}
                        >
                          Usar Resposta
                        </Button>
                        <Button
                          variant="secondary"
                          icon={Pencil}
                          disabled={busyId === interaction.id}
                          onClick={() => { setEditingId(interaction.id); setEditText(interaction.suggestedText); }}
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
              ))}
            </div>
          )}

          {subTab === 'aprendizado' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <GlassCard className="p-5 border-white/5">
                  <p className="text-[9px] font-black uppercase text-white/30 tracking-widest">Respostas Usadas Direto</p>
                  <h4 className="text-2xl font-black text-emerald-400 mt-1">{aprendizado.usadas}</h4>
                </GlassCard>
                <GlassCard className="p-5 border-white/5">
                  <p className="text-[9px] font-black uppercase text-white/30 tracking-widest">Respostas Editadas</p>
                  <h4 className="text-2xl font-black text-amber-400 mt-1">{aprendizado.editadas}</h4>
                </GlassCard>
                <GlassCard className="p-5 border-white/5">
                  <p className="text-[9px] font-black uppercase text-white/30 tracking-widest">Sugestões Ignoradas</p>
                  <h4 className="text-2xl font-black text-rose-400 mt-1">{aprendizado.ignoradas}</h4>
                </GlassCard>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase text-white/60 tracking-widest mb-3">Formas de Atendimento Mais Utilizadas</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Resposta da IA usada sem alteração', value: aprendizado.usadas, color: 'bg-emerald-500' },
                    { label: 'Resposta da IA editada pelo atendente', value: aprendizado.editadas, color: 'bg-amber-500' },
                    { label: 'Sugestão ignorada (atendente respondeu por fora)', value: aprendizado.ignoradas, color: 'bg-rose-500' },
                  ].map(row => {
                    const total = aprendizado.usadas + aprendizado.editadas + aprendizado.ignoradas || 1;
                    const pct = Math.round((row.value / total) * 100);
                    return (
                      <div key={row.label} className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <div className="flex justify-between text-xs text-white/70 mb-1.5">
                          <span>{row.label}</span>
                          <span className="font-black">{row.value}</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", row.color)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase text-white/60 tracking-widest mb-3">Perguntas Frequentes</h3>
                {aprendizado.perguntasFrequentes.length === 0 ? (
                  <p className="text-xs text-white/40">Ainda não há repetições suficientes para identificar um padrão.</p>
                ) : (
                  <div className="space-y-2">
                    {aprendizado.perguntasFrequentes.map(([texto, count]) => (
                      <div key={texto} className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                        <p className="text-xs text-white/70 truncate">{texto}</p>
                        <Badge variant="primary" className="shrink-0">{count}x</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {subTab === 'conhecimento' && (
            <div className="space-y-6">
              <p className="text-xs text-white/40">
                Dados consultados ao vivo direto do ERP — o Robozinho Rafa nunca usa preço, estoque ou prazo "lembrado" de conversa antiga quando existe informação atualizada aqui.
              </p>
              {(['produto', 'servico', 'material', 'acabamento'] as const).map(tipo => (
                <div key={tipo}>
                  <h3 className="text-sm font-black uppercase text-white/60 tracking-widest mb-3 flex items-center gap-2">
                    <Package size={14} className="text-primary-400" />
                    {tipo === 'produto' ? 'Produtos' : tipo === 'servico' ? 'Serviços' : tipo === 'material' ? 'Materiais' : 'Acabamentos'}
                    <span className="text-white/30 font-normal normal-case">({produtosPorTipo[tipo]?.length || 0})</span>
                  </h3>
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

              <div>
                <h3 className="text-sm font-black uppercase text-white/60 tracking-widest mb-3 flex items-center gap-2">
                  <Wallet size={14} className="text-primary-400" /> Formas de Pagamento
                </h3>
                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map(m => <Badge key={m} variant="outline">{m.replace(/_/g, ' ')}</Badge>)}
                </div>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 text-white/40 text-xs">
                <CalendarClock size={16} className="shrink-0" />
                Prazos de produção são definidos por pedido e não têm um valor fixo cadastrado no ERP — o Robozinho Rafa nunca inventa uma data e sempre pede confirmação à produção.
              </div>
            </div>
          )}

          {subTab === 'historico' && (
            <DataTable
              loading={loading}
              columns={[
                { key: 'clientMessageText', label: 'Mensagem do Cliente', render: (v: string) => <span className="text-xs">{v || '—'}</span> },
                { key: 'suggestedText', label: 'Sugestão da IA', render: (v: string) => <span className="text-xs text-white/60 line-clamp-2">{v || '—'}</span> },
                { key: 'status', label: 'Ação do Atendente', render: (v: string) => {
                  const map: Record<string, { label: string; variant: any }> = {
                    pending: { label: 'Aguardando', variant: 'warning' },
                    used: { label: 'Usou direto', variant: 'success' },
                    edited: { label: 'Editou e enviou', variant: 'primary' },
                    ignored: { label: 'Ignorou', variant: 'error' },
                  };
                  const info = map[v] || { label: v, variant: 'default' };
                  return <Badge variant={info.variant}>{info.label}</Badge>;
                } },
                { key: 'finalText', label: 'Resposta Final Enviada', render: (v: string) => <span className="text-xs">{v || '—'}</span> },
                { key: 'createdAt', label: 'Data/Hora', render: (v: any) => {
                  const ms = toMillis(v);
                  return <span className="text-[10px] font-mono text-white/50">{ms ? new Date(ms).toLocaleString('pt-BR') : '—'}</span>;
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
                    <p className="text-[10px] text-white/40">Gera novas sugestões automaticamente quando um cliente manda mensagem.</p>
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
