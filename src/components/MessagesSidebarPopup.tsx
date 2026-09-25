import React, { useState, useEffect, useContext, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { createPortal } from 'react-dom';
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, writeBatch, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { supabase } from '../supabase';
import { AppContext } from '../AppContext';
import { Lead, Company, AppUser } from '../types';
import { cn, Button, AvatarPhoto } from './SharedUI';
import {
  Search, RefreshCw, Clock, CheckCircle2, X, Instagram, Facebook, Send, Mail, MessageCircle, Globe,
  MoreVertical, CirclePlus, VolumeX, CheckSquare, Check, Archive, Trash2, Flag, MailOpen, GitMerge, ArrowUp, ArrowDown,
} from 'lucide-react';
import { MergeLeadsModal } from './MergeLeadsModal';
import { format } from 'date-fns';
import { leadLastMessageDate, leadSortTime, formatListTime } from '../lib/leadTime';
import { SEM_CRM_MESSAGES } from '../lib/flags';

// Regras de ordenação do menu ORGANIZAR (mesmas do menu "Ordenar" do Funil CRM, ver LEAD_SORT_OPTIONS em
// Modules.tsx). Cada uma tem direção (↑ crescente / ↓ decrescente); clicar na ativa inverte a direção.
type SortKey = 'ultima_mensagem' | 'ultimo_evento' | 'criacao' | 'nome' | 'venda';
type SelectionMode = null | 'bulk' | 'mute' | 'group';

const SORT_OPTIONS: { key: SortKey; label: string; defaultDir: 'asc' | 'desc' }[] = [
  { key: 'ultima_mensagem', label: 'Pela última mensagem', defaultDir: 'desc' },
  { key: 'ultimo_evento', label: 'Por último evento', defaultDir: 'desc' },
  { key: 'criacao', label: 'Por data de criação', defaultDir: 'desc' },
  { key: 'nome', label: 'Por nome', defaultDir: 'asc' },
  { key: 'venda', label: 'Por venda', defaultDir: 'desc' },
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

// ---------------------------------------------------------------------------------------------
// ORIGEM DA LISTA DE CONVERSAS
// A posicao da conversa depende EXCLUSIVAMENTE da ultima mensagem real (leads.last_message_at =
// horario original da ultima mensagem, recebida ou enviada) -- nunca do updated_at do cadastro,
// que muda com qualquer edicao (etapa, nome, silenciar, arquivar...). Quem mantem esse campo:
// api/whatsapp-webhook.js, api/whatsapp-send.js e src/App.tsx (ver add_last_message_at_to_leads.sql).
// ---------------------------------------------------------------------------------------------
const PAGINA_LEADS = 1000; // limite padrao do PostgREST por consulta: pagina pra NENHUMA conversa ficar de fora

const buscarLeadsPaginado = async (ordenar: (q: any) => any): Promise<{ rows: any[] | null }> => {
  const todos: any[] = [];
  for (let de = 0; ; de += PAGINA_LEADS) {
    const { data, error } = await ordenar(supabase.from('leads').select('*').eq('company_id', 'rafa-arts')).range(de, de + PAGINA_LEADS - 1);
    if (error) return { rows: null };
    todos.push(...(data || []));
    if (!data || data.length < PAGINA_LEADS) break;
  }
  return { rows: todos };
};

const buscarLeadsDaLista = async (): Promise<any[]> => {
  const porUltimaMensagem = await buscarLeadsPaginado(q => q.order('last_message_at', { ascending: false, nullsFirst: false }).order('id', { ascending: true }));
  if (porUltimaMensagem.rows) return porUltimaMensagem.rows;
  // Coluna last_message_at ainda nao existe neste banco (supabase/add_last_message_at_to_leads.sql nao
  // rodou) ou a consulta falhou: carrega so com ordem estavel por id -- NUNCA por updated_at. A posicao
  // na lista e sempre definida no navegador pela ultima mensagem (leadSortTime). Nao e o caminho normal.
  const legado = await buscarLeadsPaginado(q => q.order('id', { ascending: true }));
  return legado.rows || [];
};

const mapearLeadDaLista = (r: any): Lead => ({
  id: r.id, companyId: r.company_id, fullName: r.full_name, contactName: r.contact_name, whatsappName: r.whatsapp_name,
  phone: r.phone, sourceType: r.source_type, lastMessageText: r.last_message_text, lastMessageDirection: r.last_message_direction,
  lastMessageAt: r.last_message_at || undefined,
  lastClientMessageText: r.last_client_message_text, lastClientMessageAt: r.last_client_message_at,
  waitingSince: r.waiting_since, funnelId: r.funnel_id, funnelStageId: r.funnel_stage_id, priority: r.priority,
  createdAt: r.created_at, updatedAt: r.updated_at, photoUrl: r.photo_url || undefined,
  estimatedValue: r.estimated_value !== null && r.estimated_value !== undefined ? Number(r.estimated_value) : undefined,
} as any as Lead);

// Monta a lista: mais recente primeiro (pela ultima mensagem) e UMA conversa por telefone.
// Sort estavel + desempate por id => mesma ordem em qualquer recarga.
const ordenarEDeduplicarConversas = (lista: Lead[]): Lead[] => {
  const ordenados = [...lista].sort((a, b) => leadSortTime(b) - leadSortTime(a));
  const vistos = new Set<string>();
  return ordenados.filter(l => {
    const chave = (l.phone || '').replace(/\D/g, '');
    if (!chave) return true; // sem telefone (ex.: canal sem numero): nao da pra deduplicar, mantem
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
};

const prepararListaDeConversas = (rows: any[]): Lead[] => ordenarEDeduplicarConversas(rows.map(mapearLeadDaLista));

// GRUPOS DO WHATSAPP: o grupo e uma conversa propria, identificada pelo group_jid (o `phone` do lead/da
// mensagem e so os digitos do group_jid -- nunca o telefone de um participante).
//  - permitidos: grupos liberados (visivel) que ESTE usuario escolheu/recebeu acesso. Usuario comum: vinculado
//    a ele em user_whatsapp_groups. Administrador: grupos marcados com admin_ve. As duas escolhas sao feitas
//    em Configurações > editar usuário (NAO aqui na aba Mensagens) -- o admin nao ve grupo so porque foi liberado
//    (mesma regra das notificacoes).
//  - todos: todo grupo cadastrado; conversa de grupo que nao esta em `permitidos` NAO aparece na lista,
//    mesmo que as mensagens existam em crm_messages.
//  - nomes: nome real do grupo (whatsapp_groups.nome) pra mostrar no lugar do nome de um participante.
export const digitosDoGrupo = (jid?: string | null) => (jid || '').replace('@g.us', '').replace(/\D/g, '');
export type InfoGrupos = { permitidos: Set<string>; todos: Set<string>; nomes: Map<string, string> };
export const carregarInfoGrupos = async (user: AppUser | null): Promise<InfoGrupos | null> => {
  const { data: grupos, error } = await supabase.from('whatsapp_groups').select('id,group_jid,nome,visivel,admin_ve').eq('company_id', 'rafa-arts');
  if (error) return null;
  let vinculados = new Set<string>();
  if (!user?.isAdmin) {
    const { data: v, error: erroV } = await supabase.from('user_whatsapp_groups').select('group_id').eq('user_id', user?.id || '');
    if (erroV) return null;
    vinculados = new Set<string>((v || []).map((x: any) => x.group_id));
  }
  const info: InfoGrupos = { permitidos: new Set(), todos: new Set(), nomes: new Map() };
  for (const g of (grupos || []) as any[]) {
    const d = digitosDoGrupo(g.group_jid);
    if (!d) continue;
    info.todos.add(d);
    if (g.nome) info.nomes.set(d, g.nome);
    if (g.visivel && (user?.isAdmin ? !!g.admin_ve : vinculados.has(g.id))) info.permitidos.add(d);
  }
  return info;
};

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
//    a ordem pela ÚLTIMA MENSAGEM real (last_message_at desc, já realtime — uma
//    conversa antiga que recebe mensagem nova sobe sozinha; updated_at do cadastro
//    NUNCA entra na ordem); "Não lidos primeiro"
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
  // Abas estilo WhatsApp: Tudo / Não lidas / Favoritas / Grupos (ver bloco das
  // sub-tabs mais abaixo). "unread" reaproveita o mesmo criterio de waitingSince
  // (cliente mandou mensagem e ainda nao foi respondido) que ja alimentava o
  // Alerta de Vácuo; "favorite" reaproveita priority==='alta', ja usado no modo
  // de ordenação "Destaque" e na ação em lote de bandeira (Flag); "group" cruza
  // o telefone do lead com os grupos do WhatsApp liberados (whatsapp_groups).
  const [viewFilter, setViewFilter] = useState<'all' | 'unread' | 'favorite' | 'group'>('all');
  const [groupPhones, setGroupPhones] = useState<Set<string>>(new Set()); // grupos que ESTE usuario pode ver
  const [gruposTodos, setGruposTodos] = useState<Set<string>>(new Set());
  const [nomesGrupos, setNomesGrupos] = useState<Map<string, string>>(new Map());
  const gruposTodosRef = useRef<Set<string>>(new Set()); // mesma info, lida pela reconciliacao (closure sem state novo)
  const aplicarInfoGrupos = (info: InfoGrupos | null) => {
    if (!info) return; // falha na consulta: mantem o que ja estava
    gruposTodosRef.current = info.todos;
    setGroupPhones(info.permitidos); setGruposTodos(info.todos); setNomesGrupos(info.nomes);
  };
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Menu de opções (⋮) e suas funções
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false); // Mesclar contatos duplicados (MergeLeadsModal)
  // Ordenação principal (padrão = pela última mensagem, mais recente primeiro, como sempre foi) + prioridades
  // opcionais que passam na frente da ordenação escolhida ("Não lidos primeiro" e "Destaque").
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'ultima_mensagem', dir: 'desc' });
  const [unreadFirst, setUnreadFirst] = useState(false);
  const [highlightFirst, setHighlightFirst] = useState(false);
  const pickSort = (key: SortKey) => {
    const opt = SORT_OPTIONS.find(o => o.key === key)!;
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: opt.defaultDir });
    setIsMenuOpen(false);
  };
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [isSavingAction, setIsSavingAction] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Menu (⋮) fora do card: o card tem overflow-hidden e cortava o menu. Ele e desenhado num portal
  // no <body>, posicionado (fixed) a partir do botao.
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const ultimaRequisicaoRef = useRef(0);
  const reconciliadosRef = useRef<Set<string>>(new Set());
  const leadsRef = useRef<Lead[]>([]);
  leadsRef.current = leads;
  const recarregarListaRef = useRef<(() => void) | null>(null);

  // RECONCILIACAO (fonte oficial = crm_messages; leads.last_message_at = indice/cache da lista).
  // Para cada conversa comparamos a ULTIMA MENSAGEM REAL em crm_messages (nota interna nao conta) com
  // leads.last_message_at:
  //   - crm_messages.created_at MAIS RECENTE  => corrige o lead (last_message_at/text/direction e, se a
  //     mensagem for 'incoming', tambem last_client_message_at/text);
  //   - igual ou anterior                     => nao altera nada.
  // Antes so corrigia lead com last_message_at VAZIO; conversa com last_message_at = ontem e mensagem
  // de hoje 15:27 em crm_messages ficava presa no lugar errado.
  // Como fazer sem 1 consulta por conversa: le crm_messages recentes em PAGINAS (500 por consulta, ate
  // uma pagina voltar incompleta) e guarda a ultima por telefone. Leads ainda VAZIOS que nao aparecem
  // nessa janela seguem sendo consultados um a um (em lotes, uma vez por sessao).
  // A gravacao so vale se o lead ainda estiver mais antigo (nunca sobrescreve valor mais novo escrito
  // agora pelo webhook), entao rodar de novo e inofensivo. Roda no maximo a cada 2 min (o Realtime de
  // leads chama isso a cada mudanca); o botao "Atualizar" forca.
  const reconciliandoRef = useRef(false);
  const ultimaReconciliacaoRef = useRef(0);
  const reconciliarUltimaMensagem = async (lista: Lead[], forcar = false) => {
    if (reconciliandoRef.current) return;
    if (!forcar && Date.now() - ultimaReconciliacaoRef.current < 2 * 60 * 1000) return;
    reconciliandoRef.current = true;
    try {
      type UltimaReal = { em: string; text: string; direction: 'incoming' | 'outgoing' };
      // Previa da lista: em GRUPO a mensagem recebida mostra quem falou ("Maria: texto"), como no WhatsApp.
      const previaDaMensagem = (m: any): string => {
        const texto = m.text || '';
        const ehGrupo = gruposTodosRef.current.has((m.phone || '').replace(/\D/g, ''));
        return ehGrupo && m.direction === 'incoming' && m.sender_name ? `${m.sender_name}: ${texto}` : texto;
      };
      const PAGINA_MENSAGENS = 500;
      const MAX_PAGINAS = 20; // teto de seguranca por rodada (10 mil mensagens); o corte normal e o de baixo
      const ultimaPorTelefone = new Map<string, UltimaReal>();
      for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
        const de = pagina * PAGINA_MENSAGENS;
        // Sem janela fixa de dias: le da mais nova pra mais antiga e para assim que NENHUM lead restante
        // pode mais ser corrigido (ver corte abaixo) -- conversa parada ha semanas tambem e reconstruida.
        // Com a flag (WhatsApp fora de crm_messages) so os canais que ainda gravam la entram: o indice do
        // WhatsApp vem do webhook, e ler paginas de 500 so pra achar 'nada mais novo' e egress a toa.
        let consulta = supabase
          .from('crm_messages')
          .select('phone,text,direction,created_at,sender_name')
          .eq('company_id', 'rafa-arts')
          .or('is_note.is.null,is_note.eq.false');
        if (SEM_CRM_MESSAGES) consulta = consulta.neq('channel', 'WhatsApp');
        const { data, error } = await consulta
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(de, de + PAGINA_MENSAGENS - 1);
        // Ordem da mais nova pra mais antiga: mesmo com erro numa pagina, o que ja foi lido continua
        // valido (a primeira ocorrencia de cada telefone e a ultima mensagem dele).
        if (error) break;
        const lote = data || [];
        for (const m of lote as any[]) {
          if (!m.phone || m.direction === 'note' || ultimaPorTelefone.has(m.phone)) continue;
          ultimaPorTelefone.set(m.phone, { em: m.created_at, text: previaDaMensagem(m), direction: m.direction === 'incoming' ? 'incoming' : 'outgoing' });
        }
        if (lote.length < PAGINA_MENSAGENS) break;
        // Corte: um lead ainda sem mensagem encontrada so pode ser corrigido por mensagem MAIS NOVA que o
        // seu last_message_at. Se a pagina ja chegou em mensagens mais antigas que o menor indice restante,
        // nao ha mais o que achar.
        let menorIndiceRestante = Infinity;
        for (const l of lista) {
          if (!l.phone || ultimaPorTelefone.has(l.phone) || !l.lastMessageAt) continue;
          const ms = new Date(l.lastMessageAt as any).getTime();
          if (Number.isFinite(ms) && ms < menorIndiceRestante) menorIndiceRestante = ms;
        }
        const maisAntigaMs = new Date((lote[lote.length - 1] as any).created_at).getTime();
        if (Number.isFinite(maisAntigaMs) && maisAntigaMs < menorIndiceRestante) break;
      }

      // Leads ainda sem last_message_at e fora da janela acima: consulta individual (ate 40 por vez)
      const pendentes = lista.filter(l => !l.lastMessageAt && l.phone && !ultimaPorTelefone.has(l.phone) && !reconciliadosRef.current.has(l.id)).slice(0, 40);
      pendentes.forEach(l => reconciliadosRef.current.add(l.id));
      await Promise.all(pendentes.map(async l => {
        let consultaLead = supabase
          .from('crm_messages')
          .select('text,direction,created_at,sender_name')
          .eq('company_id', 'rafa-arts')
          .eq('phone', l.phone)
          .or('is_note.is.null,is_note.eq.false')
          .neq('direction', 'note');
        if (SEM_CRM_MESSAGES) consultaLead = consultaLead.neq('channel', 'WhatsApp');
        const { data } = await consultaLead
          .order('created_at', { ascending: false })
          .limit(1);
        const m: any = data?.[0];
        if (m?.created_at) ultimaPorTelefone.set(l.phone as string, { em: m.created_at, text: previaDaMensagem({ ...m, phone: l.phone }), direction: m.direction === 'incoming' ? 'incoming' : 'outgoing' });
      }));

      const correcoes: (UltimaReal & { id: string })[] = [];
      for (const l of lista) {
        const real = l.phone ? ultimaPorTelefone.get(l.phone) : undefined;
        if (!real) continue;
        const realMs = new Date(real.em).getTime();
        if (!Number.isFinite(realMs)) continue;
        const atualMs = l.lastMessageAt ? new Date(l.lastMessageAt as any).getTime() : NaN;
        if (Number.isFinite(atualMs) && realMs <= atualMs) continue; // igual ou anterior: nao altera
        correcoes.push({ id: l.id, ...real });
      }
      if (!correcoes.length) return;

      // Conserta na tela na hora e depois grava no banco
      const porId = new Map(correcoes.map(c => [c.id, c]));
      setLeads(prev => ordenarEDeduplicarConversas(prev.map(l => {
        const c = porId.get(l.id);
        if (!c) return l;
        return {
          ...l,
          lastMessageAt: c.em,
          lastMessageText: c.text,
          lastMessageDirection: c.direction,
          ...(c.direction === 'incoming' ? { lastClientMessageAt: c.em, lastClientMessageText: c.text } : {}),
        } as Lead;
      })));
      await Promise.all(correcoes.map(c => supabase.from('leads').update({
        last_message_at: c.em,
        last_message_text: c.text,
        last_message_direction: c.direction,
        ...(c.direction === 'incoming' ? { last_client_message_at: c.em, last_client_message_text: c.text } : {}),
      }).eq('id', c.id).or(`last_message_at.is.null,last_message_at.lt.${new Date(c.em).toISOString()}`)));
    } catch (e) {
      console.warn('Reconciliacao da ultima mensagem: erro', e);
    } finally {
      ultimaReconciliacaoRef.current = Date.now();
      reconciliandoRef.current = false;
    }
  };
  useEffect(() => {
    if (!currentCompany || !isOpen) return;
    const loadLeads = async () => {
      const minhaRequisicao = ++ultimaRequisicaoRef.current;
      const rows = await buscarLeadsDaLista();
      if (minhaRequisicao !== ultimaRequisicaoRef.current) return; // chegou uma recarga mais nova: descarta esta
      const lista = prepararListaDeConversas(rows);
      setLeads(lista);
      reconciliarUltimaMensagem(lista);
    };
    recarregarListaRef.current = loadLeads;
    loadLeads();
    // Realtime: qualquer mudanca em leads (mensagem nova => last_message_at/previa) recarrega a lista e a
    // conversa sobe pro topo sozinha. Agrupa rajadas de eventos numa unica recarga.
    let agendado: ReturnType<typeof setTimeout> | null = null;
    const recarregarLogo = () => { if (agendado) clearTimeout(agendado); agendado = setTimeout(loadLeads, 250); };
    const channel = supabase.channel('sidebar-popup-leads').on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `company_id=eq.rafa-arts` }, recarregarLogo).subscribe();
    return () => { if (agendado) clearTimeout(agendado); supabase.removeChannel(channel); };
  }, [currentCompany, isOpen]);

  // REALTIME DE crm_messages: INSERT => a conversa atualiza a previa/horario, sobe pro topo e conta como
  // nao lida (mensagem recebida) na hora, sem esperar o lead ser gravado no banco nem recarregar a
  // pagina. Canal unico por abertura do popup (deps fixas): nao e recriado a cada mensagem. Ignora
  // mensagem igual/mais antiga que a ultima ja mostrada (nunca volta no tempo nem duplica a conversa).
  // Telefone sem conversa na lista (contato novo): o App cria o lead; a lista recarrega logo depois.
  useEffect(() => {
    if (!currentCompany || !isOpen) return;
    const channel = supabase.channel('sidebar-popup-messages').on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'crm_messages', filter: `company_id=eq.rafa-arts` },
      (payload: any) => {
        const row = payload.new;
        if (!row?.phone || row.direction === 'note' || row.is_note) return;
        const emMs = Date.parse(row.created_at);
        if (!Number.isFinite(emMs)) return;
        console.log('[CRM REALTIME] nova mensagem recebida');
        const chave = String(row.phone).replace(/\D/g, '');
        if (!leadsRef.current.some(l => (l.phone || '').replace(/\D/g, '') === chave)) {
          setTimeout(() => recarregarListaRef.current?.(), 1500);
          return;
        }
        const entrada = row.direction === 'incoming';
        const ehGrupo = gruposTodosRef.current.has(chave);
        const previa = ehGrupo && entrada && row.sender_name ? `${row.sender_name}: ${row.text || ''}` : (row.text || '');
        setLeads(prev => {
          const idx = prev.findIndex(l => (l.phone || '').replace(/\D/g, '') === chave);
          if (idx < 0) return prev;
          const atualMs = prev[idx].lastMessageAt ? new Date(prev[idx].lastMessageAt as any).getTime() : NaN;
          if (Number.isFinite(atualMs) && emMs <= atualMs) return prev;
          const atualizado = {
            ...prev[idx],
            lastMessageAt: row.created_at,
            lastMessageText: previa,
            lastMessageDirection: entrada ? 'incoming' : 'outgoing',
            ...(entrada
              ? { lastClientMessageAt: row.created_at, lastClientMessageText: row.text || '', waitingSince: row.created_at }
              : { waitingSince: null }),
          } as any as Lead;
          console.log('[CRM SIDEBAR] conversa movida para o topo');
          return ordenarEDeduplicarConversas(prev.map((l, i) => (i === idx ? atualizado : l)));
        });
      }
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany, isOpen]);

  // Grupos do WhatsApp liberados (visivel=true) -- monta um Set com o telefone
  // "equivalente" de cada grupo (mesmos digitos que o webhook usa como `phone`
  // no lead, ver api/whatsapp-webhook.js) pra dar pra filtrar a aba "Grupos".
  useEffect(() => {
    if (!currentCompany || !isOpen) return;
    const loadGroupPhones = async () => { aplicarInfoGrupos(await carregarInfoGrupos(user)); };
    loadGroupPhones();
    const channel = supabase.channel('sidebar-popup-groups').on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_groups', filter: `company_id=eq.rafa-arts` }, loadGroupPhones).subscribe();
    // Fallback por polling: whatsapp_groups só recebe eventos em tempo real depois
    // que supabase/fix_realtime_whatsapp_groups.sql for rodado no projeto Supabase.
    // Enquanto isso não acontecer (ou se a conexão realtime cair), esse polling a
    // cada 15s garante que um grupo liberado/novo apareça na aba Grupos mesmo assim.
    const pollId = setInterval(loadGroupPhones, 15000);
    return () => { supabase.removeChannel(channel); clearInterval(pollId); };
  }, [currentCompany, isOpen, user?.id, user?.isAdmin]);

  // Botão "Atualizar": força uma nova busca manual além do listener em tempo
  // real (útil se a conexão realtime cair ou demorar a refletir uma mudança).
  // Também recarrega whatsapp_groups — essa tabela não faz parte da
  // publication supabase_realtime (ver supabase/fix_realtime_whatsapp_groups.sql),
  // então sem esse refresh manual os chats de grupo (@g.us) liberados ou
  // recém-chegados só apareciam na aba Grupos depois de um F5 na página.
  const handleRefresh = async () => {
    if (!currentCompany || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const [rows, infoGrupos] = await Promise.all([
        buscarLeadsDaLista(),
        carregarInfoGrupos(user),
      ]);
      ++ultimaRequisicaoRef.current; // esta recarga manual vence qualquer uma em andamento
      const lista = prepararListaDeConversas(rows);
      setLeads(lista);
      reconciliarUltimaMensagem(lista, true);
      aplicarInfoGrupos(infoGrupos);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Conversa de grupo so aparece se o usuario pode ver aquele grupo; nome do grupo no lugar do participante.
  const nomeDaConversa = (l: Lead) => nomesGrupos.get((l.phone || '').replace(/\D/g, '')) || l.fullName;
  const conversaPermitida = (l: Lead) => {
    const d = (l.phone || '').replace(/\D/g, '');
    return !gruposTodos.has(d) || groupPhones.has(d);
  };

  const unrepliedCount = leads.filter(l => l.waitingSince && conversaPermitida(l)).length;

  // Ordenação client-side sobre a lista já ordenada pela ÚLTIMA MENSAGEM (last_message_at desc, ver
  // prepararListaDeConversas). Padrão (última mensagem ↓, sem prioridades) não reordena nada. Prioridades
  // ("Não lidos primeiro" e "Destaque") passam na frente; dentro de cada grupo vale a ordenação escolhida.
  // Sort estável: empate mantém a ordem por recência.
  const sortLeads = (list: Lead[]) => {
    if (!unreadFirst && !highlightFirst && sort.key === 'ultima_mensagem' && sort.dir === 'desc') return list;
    const ms = (v: any) => { const d = typeof v?.toDate === 'function' ? v.toDate() : new Date(v); const t = d.getTime(); return isNaN(t) ? 0 : t; };
    const chave = (l: Lead): number | string => {
      switch (sort.key) {
        case 'ultima_mensagem': return leadSortTime(l);
        case 'ultimo_evento': return ms(l.updatedAt);
        case 'criacao': return ms(l.createdAt);
        case 'nome': return (nomeDaConversa(l) || '').toLocaleLowerCase('pt-BR');
        case 'venda': return l.estimatedValue ?? 0;
      }
    };
    const prioridade = (l: Lead) => (unreadFirst && (l.unread ?? l.waitingSince) ? 2 : 0) + (highlightFirst && l.priority === 'alta' ? 1 : 0);
    const sinal = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const pd = prioridade(b) - prioridade(a);
      if (pd !== 0) return pd;
      const ka = chave(a), kb = chave(b);
      const cmp = typeof ka === 'string' && typeof kb === 'string' ? ka.localeCompare(kb, 'pt-BR') : (ka as number) - (kb as number);
      return cmp * sinal;
    });
  };

  const favoriteCount = leads.filter(l => l.priority === 'alta').length;
  const groupCount = leads.filter(l => groupPhones.has((l.phone || '').replace(/\D/g, ''))).length;

  const filteredLeads = sortLeads(
    leads
      .filter(l => !l.archived)
      .filter(conversaPermitida)
      .filter(l =>
        nomeDaConversa(l).toLowerCase().includes(filter.toLowerCase()) ||
        l.phone.includes(filter)
      )
      .filter(l => {
        if (viewFilter === 'unread') return !!l.waitingSince;
        if (viewFilter === 'favorite') return l.priority === 'alta';
        if (viewFilter === 'group') return groupPhones.has((l.phone || '').replace(/\D/g, ''));
        return true;
      })
  );

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

  // Apaga de vez as conversas selecionadas (mensagens + o próprio lead) — diferente do
  // resto das ações em lote, que só faz um PATCH; aqui remove as linhas mesmo, então pede
  // confirmação antes e nunca é chamado sem o usuário confirmar.
  const handleBulkDelete = async () => {
    if (!selectedIds.size || isSavingAction) return;
    const qtd = selectedIds.size;
    const ok = window.confirm(
      `Apagar ${qtd} conversa${qtd === 1 ? '' : 's'} selecionada${qtd === 1 ? '' : 's'}? Isso remove o histórico de mensagens e o contato da lista. Essa ação não pode ser desfeita.`
    );
    if (!ok) return;

    setIsSavingAction(true);
    try {
      const ids = Array.from(selectedIds);
      const phones = leads.filter(l => ids.includes(l.id)).map(l => l.phone).filter(Boolean);

      if (phones.length) {
        await supabase.from('crm_messages').delete().eq('company_id', 'rafa-arts').in('phone', phones);
      }
      await supabase.from('leads').delete().in('id', ids);

      cancelSelection();
    } finally {
      setIsSavingAction(false);
    }
  };

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
      <MergeLeadsModal
        isOpen={isMergeOpen}
        onClose={() => setIsMergeOpen(false)}
        onMerged={() => recarregarListaRef.current?.()}
        gruposTodos={gruposTodos}
      />
      {/* Camada invisível só pra fechar ao clicar fora — sem escurecer nem
          bloquear a leitura do conteúdo atrás do balão */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Wrapper posicionado (relative) só pra caldinha poder "vazar" pra
          fora do card sem ser cortada pelo overflow-hidden do card */}
      <div className="fixed inset-0 z-[60] lg:inset-auto lg:top-6 lg:left-[336px] lg:z-40 lg:w-[380px] lg:max-h-[calc(100vh-3rem)] animate-in fade-in zoom-in-95 duration-150">
        {/* Caldinha do balão — triangulo apontando pra esquerda, pro item
            "Conversas" do menu lateral de onde o balão foi aberto */}
        <div className="hidden lg:block absolute top-8 -left-2 w-4 h-4 bg-slate-50 border-l border-b border-slate-200 rotate-45 shadow-sm" />

        {/* Corpo do balão — mesma base das bolhas de mensagem reais do
            sistema, só que um tom levemente mais escuro (slate-50 em vez de
            branco puro) pra dar mais "corpo" profissional, fixo em qualquer
            tema */}
        <div className="relative bg-slate-50 border border-slate-200 rounded-none lg:rounded-[28px] flex flex-col shadow-2xl overflow-hidden h-full lg:h-[calc(100vh-3rem)]">
          {/* Header */}
          <div className="p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] lg:p-6 border-b border-slate-200 bg-white space-y-4 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 italic uppercase tracking-tight flex items-center gap-1.5">
                Conversas
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="lg:hidden text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
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
                    onClick={() => {
                      const r = menuRef.current?.getBoundingClientRect();
                      if (r) setMenuPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.right - 240, window.innerWidth - 240 - 8)) });
                      setIsMenuOpen(o => !o);
                    }}
                    className={cn(
                      "text-slate-400 hover:text-primary-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100",
                      isMenuOpen && "bg-slate-100 text-primary-600"
                    )}
                    title="Mais opções"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {isMenuOpen && createPortal(
                    <>
                      <div className="fixed inset-0 z-[90]" onClick={() => setIsMenuOpen(false)} />
                      {/* Largura fixa (240px) e cada opção numa linha só (nowrap). Desenhado no <body>
                          pra o overflow-hidden do card do balão não cortar o menu. */}
                      <div
                        className="fixed bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] py-1.5 text-sm whitespace-nowrap"
                        style={{ top: menuPos.top, left: menuPos.left, width: 240, minWidth: 240, maxWidth: 260, maxHeight: `calc(100vh - ${menuPos.top + 12}px)`, overflowY: 'auto' }}
                      >
                        
                        <p className="px-3.5 pt-1 pb-1 text-[11px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">Ações</p>
                        <button type="button" onClick={() => startSelection('group')} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-left whitespace-nowrap">
                          <CirclePlus size={16} className="text-slate-400 shrink-0" />
                          <span className="whitespace-nowrap">Criar um grupo</span>
                        </button>
                        <button type="button" onClick={() => startSelection('bulk')} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-left whitespace-nowrap">
                          <CheckSquare size={16} className="text-slate-400 shrink-0" />
                          <span className="whitespace-nowrap">Ações múltiplas</span>
                        </button>
                        <div className="border-t border-slate-100 my-1.5" />
                        <p className="px-3.5 pt-1 pb-1 text-[11px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">Organizar</p>
                        {SORT_OPTIONS.map(opt => {
                          const ativo = sort.key === opt.key;
                          const DirIcon = (ativo ? sort.dir : opt.defaultDir) === 'asc' ? ArrowUp : ArrowDown;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => pickSort(opt.key)}
                              className={cn(
                                "w-full flex items-center gap-2 px-3.5 py-2 transition-colors text-left whitespace-nowrap",
                                ativo ? "text-primary-600 font-bold" : "text-slate-600 hover:bg-slate-50"
                              )}
                            >
                              <span className="w-4 shrink-0 flex items-center justify-center">
                                {ativo && <Check size={14} className="text-primary-600" />}
                              </span>
                              <span className="whitespace-nowrap flex-1">{opt.label}</span>
                              <DirIcon size={14} className={cn("shrink-0", !ativo && "opacity-40")} />
                            </button>
                          );
                        })}
                        {([
                          { label: 'Não lidos primeiro', on: unreadFirst, toggle: () => setUnreadFirst(v => !v) },
                          { label: 'Destaque', on: highlightFirst, toggle: () => setHighlightFirst(v => !v) },
                        ]).map(p => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => { p.toggle(); setIsMenuOpen(false); }}
                            className={cn(
                              "w-full flex items-center gap-2 px-3.5 py-2 transition-colors text-left whitespace-nowrap",
                              p.on ? "text-primary-600 font-bold" : "text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            <span className="w-4 shrink-0 flex items-center justify-center">
                              {p.on && <Check size={14} className="text-primary-600" />}
                            </span>
                            <span className="whitespace-nowrap flex-1">{p.label}</span>
                          </button>
                        ))}
                        <div className="border-t border-slate-100 my-1.5" />
                        <p className="px-3.5 pt-1 pb-1 text-[11px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">Contatos</p>
                        <button type="button" onClick={() => { setIsMenuOpen(false); setIsMergeOpen(true); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-left whitespace-nowrap">
                          <GitMerge size={16} className="text-slate-400 shrink-0" />
                          <span className="whitespace-nowrap">Mesclar contatos duplicados</span>
                        </button>
                        <div className="border-t border-slate-100 my-1.5" />
                        <p className="px-3.5 pt-1 pb-1 text-[11px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">Notificações</p>
                        <button type="button" onClick={() => startSelection('mute')} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-slate-50 transition-colors text-left whitespace-nowrap">
                          <VolumeX size={16} className="text-slate-400 shrink-0" />
                          <span className="whitespace-nowrap">Silenciar</span>
                        </button>
                      </div>
                    </>,
                    document.body
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

            {/* Abas estilo WhatsApp -- Tudo / Não lidas / Favoritas / Grupos, coladas
                direto no topo da lista de conversas (logo abaixo da busca) pra troca
                de filtro em 1 clique. "Não lidas" reaproveita waitingSince (mesmo
                criterio do Alerta de Vácuo); "Favoritas" reaproveita priority==='alta'
                (mesmo campo usado pela bandeira/Destaque no menu de ações em lote);
                "Grupos" cruza com whatsapp_groups liberados (ver useEffect acima). */}
            <div className="flex gap-1 w-full">
              <button
                type="button"
                onClick={() => setViewFilter('all')}
                className={cn(
                  "flex-1 min-w-0 justify-center whitespace-nowrap px-1 sm:px-2 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-wider border transition-all flex items-center gap-1",
                  viewFilter === 'all'
                    ? "bg-primary-50 border-primary-200 text-primary-700"
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                )}
              >
                Tudo
                <span className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded text-[8px] shrink-0">{leads.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewFilter('unread')}
                className={cn(
                  "flex-1 min-w-0 justify-center whitespace-nowrap px-1 sm:px-2 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-wider border transition-all flex items-center gap-1",
                  viewFilter === 'unread'
                    ? "bg-rose-50 border-rose-200 text-rose-600"
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100",
                  unrepliedCount > 0 && viewFilter !== 'unread' && "animate-pulse"
                )}
              >
                Não lidas
                <span className={cn(
                  "px-1 py-0.5 rounded text-[8px] shrink-0 font-black",
                  unrepliedCount > 0 ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-400"
                )}>
                  {unrepliedCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setViewFilter('favorite')}
                className={cn(
                  "flex-1 min-w-0 justify-center whitespace-nowrap px-1 sm:px-2 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-wider border transition-all flex items-center gap-1",
                  viewFilter === 'favorite'
                    ? "bg-amber-50 border-amber-200 text-amber-600"
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                )}
              >
                Favoritas
                <span className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded text-[8px] shrink-0">{favoriteCount}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewFilter('group')}
                className={cn(
                  "flex-1 min-w-0 justify-center whitespace-nowrap px-1 sm:px-2 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-wider border transition-all flex items-center gap-1",
                  viewFilter === 'group'
                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                )}
              >
                Grupos
                <span className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded text-[8px] shrink-0">{groupCount}</span>
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
                  <button type="button" disabled={!selectedIds.size || isSavingAction} onClick={() => applyBulkPatch({ status: 'ENCERRADO', archived: true })} title="Encerrar (mantém o histórico, só arquiva)" className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-300 transition-colors disabled:opacity-40">
                    <Archive size={14} />
                  </button>
                  <button type="button" disabled={!selectedIds.size || isSavingAction} onClick={handleBulkDelete} title="Apagar de vez (remove mensagens e contato)" className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300 transition-colors disabled:opacity-40">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Alerta de vácuo — clicável: leva direto pro filtro "Sem Resposta" */}
          {unrepliedCount > 0 && viewFilter !== 'unread' && (
            <button
              type="button"
              onClick={() => setViewFilter('unread')}
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

          {/* Lista de conversas */}
          {/* Lista virtualizada: so as conversas visiveis ficam no DOM (antes eram todas, com calculo de SLA em cada uma). */}
          <div className="flex-1 min-h-0 relative">
            <Virtuoso
              className="absolute inset-0 custom-scrollbar"
              data={filteredLeads}
              computeItemKey={(_, l) => l.id}
              increaseViewportBy={400}
              itemContent={(_, l) => {
              const timeStr = formatListTime(leadLastMessageDate(l));

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
                      {/* Avatar com foto de perfil (mesmo padrão do ChatPanel/Dashboard, ver
                          Modules.tsx ~linha 4311) + badge do canal de origem sobreposto no
                          canto — funde o layout profissional do Dashboard com o ícone de canal
                          que já existia aqui, sem remover nenhuma das duas informações. */}
                      {(() => {
                        const { icon: ChannelIcon, color, bg } = getChannelStyle(l.sourceType);
                        return (
                          <div className="relative w-8 h-8 shrink-0">
                            <AvatarPhoto photoUrl={l.photoUrl} name={nomeDaConversa(l)} className="w-8 h-8 text-[11px]" />
                            <div
                              className={cn("absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shrink-0", bg)}
                              title={l.sourceType || 'WhatsApp'}
                            >
                              <ChannelIcon size={9} className={color} />
                            </div>
                          </div>
                        );
                      })()}
                      <p className="font-bold transition-colors truncate text-sm text-slate-800 group-hover:text-primary-600">{nomeDaConversa(l)}</p>
                      {waitingSinceDate && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" title="Cliente aguardando resposta!" />
                      )}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase shrink-0">{timeStr}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-1 pl-10">
                    {/* Previa SEMPRE da ULTIMA MENSAGEM REAL da conversa -- recebida ou enviada
                        (cliente: "Quero orcamento" / atendente: "Claro, vou preparar." => mostra
                        "Claro, vou preparar."; o cliente respondeu "Obrigado" => muda pra "Obrigado").
                        lastClientMessageText so serve de fallback pra lead sem last_message_text. */}
                    <p className="text-xs text-slate-500 truncate flex-1">{l.lastMessageText || l.lastClientMessageText || 'Sem mensagens'}</p>
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

                  <div className="mt-1.5 flex items-center gap-2 pl-10">
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
            }}
            />
          </div>
        </div>
      </div>
    </>
  );
};
