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
  MoreVertical, MoreHorizontal, CirclePlus, VolumeX, CheckSquare, Check, Archive, Trash2, Flag, MailOpen, GitMerge, ArrowUp, ArrowDown,
  Camera, Plus, CheckCheck, Pin, Mic, Sparkles, FileText, PhoneIncoming, Phone, Store, Settings, CircleDot, User, ArrowLeft, ChevronLeft, ChevronRight, Smile, Music, Users,
} from 'lucide-react';
import { MergeLeadsModal } from './MergeLeadsModal';
import { format } from 'date-fns';
import { leadLastMessageDate, leadSortTime, formatListTime, formatWhatsAppDate } from '../lib/leadTime';
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
const PAGINA_LEADS = 1000;
const MAX_LEADS_INICIAL = 1500; // teto seguro para performance: as 1500 conversas mais recentes

// Seleciona apenas os campos estritamente necessários para a lista de conversas,
// evitando trafegar megabytes de dados pesados (histórico raw, notas internas, etc.)
const COLUNAS_LEADS_MENSAGENS = 'id,company_id,full_name,contact_name,whatsapp_name,phone,source_type,last_message_text,last_message_direction,last_message_at,last_client_message_text,last_client_message_at,waiting_since,funnel_id,funnel_stage_id,priority,status,archived,unread,muted,created_at,updated_at,photo_url,estimated_value';

const buscarLeadsPaginado = async (ordenar: (q: any) => any): Promise<{ rows: any[] | null }> => {
  const todos: any[] = [];
  for (let de = 0; ; de += PAGINA_LEADS) {
    const { data, error } = await ordenar(supabase.from('leads').select(COLUNAS_LEADS_MENSAGENS).eq('company_id', 'rafa-arts')).range(de, de + PAGINA_LEADS - 1);
    if (error) return { rows: null };
    todos.push(...(data || []));
    if (!data || data.length < PAGINA_LEADS || todos.length >= MAX_LEADS_INICIAL) break;
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
  status: r.status, archived: r.archived, unread: r.unread, muted: r.muted,
  createdAt: r.created_at, updatedAt: r.updated_at, photoUrl: r.photo_url || undefined,
  estimatedValue: r.estimated_value !== null && r.estimated_value !== undefined ? Number(r.estimated_value) : undefined,
  orderSummary: r.order_summary || r.service_name || r.tracking?.orderSummary || undefined,
  serviceName: r.service_name || r.order_summary || r.tracking?.orderSummary || undefined,
  tracking: r.tracking || undefined,
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
// Regra unica de visibilidade de conversa quanto a grupos do WhatsApp (balao, modulo Mensagens e abertura por
// notificacao/agenda/link):
//  - grupo cadastrado: so aparece/abre se ESTE usuario tem acesso a ele (permitidos);
//  - grupo AINDA NAO cadastrado em whatsapp_groups: some (nao ha como saber quem pode ver);
//  - leitura dos grupos falhou (info nula, ex.: primeira carga): some tudo que tem cara de grupo.
// "Cara de grupo" = digitos do group_jid, sempre maiores que um telefone (mais de 15 digitos).
export const TAMANHO_MAX_TELEFONE = 15;
export const conversaVisivelPorGrupo = (phone: string | null | undefined, info: Pick<InfoGrupos, 'permitidos' | 'todos'> | null): boolean => {
  const d = digitosDoGrupo(phone);
  const temCaraDeGrupo = d.length > TAMANHO_MAX_TELEFONE;
  if (!info) return !temCaraDeGrupo;
  if (info.todos.has(d)) return info.permitidos.has(d);
  return !temCaraDeGrupo;
};
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
  // Abas estilo WhatsApp iOS: Todas / Não lidas / Favoritos / Grupos
  const [viewFilter, setViewFilter] = useState<'all' | 'unread' | 'favorite' | 'group'>('all');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [groupPhones, setGroupPhones] = useState<Set<string>>(new Set()); // grupos que ESTE usuario pode ver
  const [gruposTodos, setGruposTodos] = useState<Set<string>>(new Set());
  const [nomesGrupos, setNomesGrupos] = useState<Map<string, string>>(new Map());
  const gruposTodosRef = useRef<Set<string>>(new Set()); // mesma info, lida pela reconciliacao (closure sem state novo)
  const [gruposCarregados, setGruposCarregados] = useState(false); // false ate a 1a leitura dar certo: ate la esconde o que tem cara de grupo
  const aplicarInfoGrupos = (info: InfoGrupos | null) => {
    if (!info) return; // falha na consulta: mantem o que ja estava
    setGruposCarregados(true);
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
      type UltimaReal = {
        em: string;
        text: string;
        direction: 'incoming' | 'outgoing';
        deliveryStatus?: string;
        readAt?: string;
        deliveredAt?: string;
      };
      // Previa da lista: última mensagem real (minha ou do lead, texto, áudio ou mídia)
      const previaDaMensagem = (m: any): string => {
        let texto = (m.text || '').trim();
        if (!texto) {
          if (m.content_type === 'audio' || (m.media_url && /\.(m4a|mp3|ogg|opus|wav)$/i.test(m.media_url)) || (m.file_name && /\.(m4a|mp3|ogg|opus|wav)$/i.test(m.file_name))) {
            texto = '🎤 Áudio';
          } else if (m.content_type === 'image' || (m.media_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(m.media_url))) {
            texto = '📷 Foto';
          } else if (m.file_name) {
            texto = m.file_name;
          }
        }
        const ehGrupo = gruposTodosRef.current.has((m.phone || '').replace(/\D/g, ''));
        return ehGrupo && m.direction === 'incoming' && m.sender_name ? `${m.sender_name}: ${texto}` : texto;
      };
      // Otimizado: lê até 2 páginas de 200 mensagens recentes (cobre as conversas ativas rapidamente em 1-2 requisições leves)
      const PAGINA_MENSAGENS = 200;
      const MAX_PAGINAS = 2;
      const ultimaPorTelefone = new Map<string, UltimaReal>();
      for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
        const de = pagina * PAGINA_MENSAGENS;
        let consulta = supabase
          .from('crm_messages')
          .select('phone,text,direction,created_at,sender_name,content_type,media_url,file_name,delivery_status,read_at,delivered_at')
          .eq('company_id', 'rafa-arts')
          .or('is_note.is.null,is_note.eq.false');
        if (SEM_CRM_MESSAGES) consulta = consulta.neq('channel', 'WhatsApp');
        const { data, error } = await consulta
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(de, de + PAGINA_MENSAGENS - 1);
        if (error) break;
        const lote = data || [];
        for (const m of lote as any[]) {
          if (!m.phone || m.direction === 'note' || ultimaPorTelefone.has(m.phone)) continue;
          ultimaPorTelefone.set(m.phone, {
            em: m.created_at,
            text: previaDaMensagem(m),
            direction: m.direction === 'incoming' ? 'incoming' : 'outgoing',
            deliveryStatus: m.delivery_status || undefined,
            readAt: m.read_at || undefined,
            deliveredAt: m.delivered_at || undefined,
          });
        }
        if (lote.length < PAGINA_MENSAGENS) break;
        let menorIndiceRestante = Infinity;
        for (const l of lista) {
          if (!l.phone || ultimaPorTelefone.has(l.phone) || !l.lastMessageAt) continue;
          const ms = new Date(l.lastMessageAt as any).getTime();
          if (Number.isFinite(ms) && ms < menorIndiceRestante) menorIndiceRestante = ms;
        }
        const maisAntigaMs = new Date((lote[lote.length - 1] as any).created_at).getTime();
        if (Number.isFinite(maisAntigaMs) && maisAntigaMs < menorIndiceRestante) break;
      }

      // Leads ainda sem last_message_at e fora da janela acima: consulta pontual em lote reduzido (até 10 por vez)
      const pendentes = lista.filter(l => !l.lastMessageAt && l.phone && !ultimaPorTelefone.has(l.phone) && !reconciliadosRef.current.has(l.id)).slice(0, 10);
      pendentes.forEach(l => reconciliadosRef.current.add(l.id));
      if (pendentes.length > 0) {
        await Promise.all(pendentes.map(async l => {
          let consultaLead = supabase
            .from('crm_messages')
            .select('text,direction,created_at,sender_name,content_type,media_url,file_name,delivery_status,read_at,delivered_at')
            .eq('company_id', 'rafa-arts')
            .eq('phone', l.phone)
            .or('is_note.is.null,is_note.eq.false')
            .neq('direction', 'note');
          if (SEM_CRM_MESSAGES) consultaLead = consultaLead.neq('channel', 'WhatsApp');
          const { data } = await consultaLead
            .order('created_at', { ascending: false })
            .limit(1);
          const m: any = data?.[0];
          if (m?.created_at) {
            ultimaPorTelefone.set(l.phone as string, {
              em: m.created_at,
              text: previaDaMensagem({ ...m, phone: l.phone }),
              direction: m.direction === 'incoming' ? 'incoming' : 'outgoing',
              deliveryStatus: m.delivery_status || undefined,
              readAt: m.read_at || undefined,
              deliveredAt: m.delivered_at || undefined,
            });
          }
        }));
      }

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
          lastMessageDeliveryStatus: c.deliveryStatus,
          lastMessageReadAt: c.readAt,
          lastMessageDeliveredAt: c.deliveredAt,
          ...(c.direction === 'incoming' ? { lastClientMessageAt: c.em, lastClientMessageText: c.text } : {}),
        } as any as Lead;
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

    // Realtime inteligente e cirúrgico: atualiza o estado local em memória diretamente sem refazer queries pesadas ao banco
    let agendado: ReturnType<typeof setTimeout> | null = null;
    const recarregarLogo = () => { if (agendado) clearTimeout(agendado); agendado = setTimeout(loadLeads, 1000); };
    const channel = supabase.channel('sidebar-popup-leads').on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `company_id=eq.rafa-arts` }, (payload: any) => {
      const row = payload.new;
      if (payload.eventType === 'UPDATE' && row?.id) {
        setLeads(prev => {
          const idx = prev.findIndex(l => l.id === row.id);
          if (idx < 0) return prev;
          const atualizado = {
            ...prev[idx],
            ...mapearLeadDaLista(row),
          };
          return ordenarEDeduplicarConversas(prev.map((l, i) => (i === idx ? atualizado : l)));
        });
        return;
      }
      if (payload.eventType === 'DELETE' && payload.old?.id) {
        setLeads(prev => prev.filter(l => l.id !== payload.old.id));
        return;
      }
      if (payload.eventType === 'INSERT' && row?.id) {
        const novoLead = mapearLeadDaLista(row);
        setLeads(prev => ordenarEDeduplicarConversas([novoLead, ...prev]));
        return;
      }
      recarregarLogo();
    }).subscribe();
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
      { event: '*', schema: 'public', table: 'crm_messages', filter: `company_id=eq.rafa-arts` },
      (payload: any) => {
        const row = payload.new;
        if (!row?.phone || row.direction === 'note' || row.is_note) return;
        const chave = String(row.phone).replace(/\D/g, '');
        if (!leadsRef.current.some(l => (l.phone || '').replace(/\D/g, '') === chave)) {
          setTimeout(() => recarregarListaRef.current?.(), 1500);
          return;
        }

        // Se for UPDATE de status de entrega (ex: delivered ou read)
        if (payload.eventType === 'UPDATE') {
          setLeads(prev => prev.map(l => {
            if ((l.phone || '').replace(/\D/g, '') !== chave) return l;
            return {
              ...l,
              lastMessageDeliveryStatus: row.delivery_status || (l as any).lastMessageDeliveryStatus,
              lastMessageReadAt: row.read_at || (l as any).lastMessageReadAt,
              lastMessageDeliveredAt: row.delivered_at || (l as any).lastMessageDeliveredAt,
            } as any;
          }));
          return;
        }

        const emMs = Date.parse(row.created_at);
        if (!Number.isFinite(emMs)) return;
        console.log('[CRM REALTIME] nova mensagem recebida');
        const entrada = row.direction === 'incoming';
        const ehGrupo = gruposTodosRef.current.has(chave);
        let textoMsg = (row.text || '').trim();
        if (!textoMsg) {
          if (row.content_type === 'audio' || (row.media_url && /\.(m4a|mp3|ogg|opus|wav)$/i.test(row.media_url)) || (row.file_name && /\.(m4a|mp3|ogg|opus|wav)$/i.test(row.file_name))) {
            textoMsg = '🎤 Áudio';
          } else if (row.content_type === 'image' || (row.media_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(row.media_url))) {
            textoMsg = '📷 Foto';
          }
        }
        const previa = ehGrupo && entrada && row.sender_name ? `${row.sender_name}: ${textoMsg}` : textoMsg;
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
            lastMessageDeliveryStatus: row.delivery_status || undefined,
            lastMessageReadAt: row.read_at || undefined,
            lastMessageDeliveredAt: row.delivered_at || undefined,
            ...(entrada
              ? { lastClientMessageAt: row.created_at, lastClientMessageText: row.text || '', waitingSince: row.created_at, archived: false, status: 'ENTRADA' }
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
  const nomeDaConversa = (l: Lead) => nomesGrupos.get((l.phone || '').replace(/\D/g, '')) || (l.contactName || l.fullName || l.whatsappName || l.phone || 'Cliente').trim();
  const conversaPermitida = (l: Lead) => conversaVisivelPorGrupo(l.phone, gruposCarregados ? { permitidos: groupPhones, todos: gruposTodos } : null);

  // Conversas ativas: quando um serviço/atendimento for concluído, ele sai da lista de mensagens
  const activeLeads = leads.filter(l => !l.archived && l.status !== 'CONCLUIDO' && conversaPermitida(l));
  const unrepliedCount = activeLeads.filter(l => !!l.unread || (!!l.waitingSince && l.lastMessageDirection !== 'resolved')).length;
  const favoriteCount = activeLeads.filter(l => l.priority === 'alta').length;
  const groupCount = activeLeads.filter(l => groupPhones.has((l.phone || '').replace(/\D/g, ''))).length;

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
    const prioridade = (l: Lead) => (unreadFirst && (l.unread || (l.waitingSince && l.lastMessageDirection !== 'resolved')) ? 2 : 0) + (highlightFirst && l.priority === 'alta' ? 1 : 0);
    const sinal = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const pd = prioridade(b) - prioridade(a);
      if (pd !== 0) return pd;
      const ka = chave(a), kb = chave(b);
      const cmp = typeof ka === 'string' && typeof kb === 'string' ? ka.localeCompare(kb, 'pt-BR') : (ka as number) - (kb as number);
      return cmp * sinal;
    });
  };

  const baseList = activeLeads;

  const filteredLeads = sortLeads(
    baseList
      .filter(l =>
        nomeDaConversa(l).toLowerCase().includes(filter.toLowerCase()) ||
        l.phone.includes(filter)
      )
      .filter(l => {
        if (viewFilter === 'unread') return !!l.unread || (!!l.waitingSince && l.lastMessageDirection !== 'resolved');
        if (viewFilter === 'favorite') return l.priority === 'alta';
        if (viewFilter === 'group') return groupPhones.has((l.phone || '').replace(/\D/g, ''));
        return true;
      })
  );

  const handleStartNewChat = async () => {
    const raw = newChatPhone.trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 8) return;
    setIsCreatingLead(true);
    try {
      const { data: existing } = await supabase
        .from('leads')
        .select('id,phone,full_name')
        .eq('company_id', 'rafa-arts')
        .or(`phone.eq.${raw},phone.eq.${digits},phone.ilike.%${digits.slice(-8)}%`)
        .limit(1)
        .maybeSingle();

      if (existing) {
        setPendingOpenLeadId(existing.id);
        setActiveTab('crm');
        setIsNewChatOpen(false);
        onClose();
        return;
      }

      const { data: created, error } = await supabase
        .from('leads')
        .insert({
          company_id: 'rafa-arts',
          phone: digits,
          full_name: newChatName.trim() || digits,
          contact_name: newChatName.trim() || digits,
          source_type: 'WhatsApp',
          status: 'ENTRADA',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (created) {
        setPendingOpenLeadId(created.id);
        setActiveTab('crm');
        setIsNewChatOpen(false);
        onClose();
      }
    } catch (err) {
      console.error('Erro ao iniciar nova conversa:', err);
    } finally {
      setIsCreatingLead(false);
    }
  };

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
    // Marca apenas como lido ao abrir a conversa (o tempo de espera/waiting_since permanece ativo enquanto a mensagem não for respondida ou resolvida)
    if (lead.unread) {
      supabase.from('leads').update({ unread: false }).eq('id', lead.id).then();
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, unread: false } : l));
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
      if (patch.unread === false) {
        patchSnake.waiting_since = null;
        patchSnake.last_message_direction = 'resolved';
      }
      await supabase.from('leads').update({ ...patchSnake, updated_at: new Date().toISOString() }).in('id', Array.from(selectedIds));
      setLeads(prev => prev.map(l => selectedIds.has(l.id) ? {
        ...l,
        ...patch,
        ...(patch.unread === false ? { waitingSince: undefined, lastMessageDirection: 'resolved' as any, unread: false } : {})
      } : l));
      cancelSelection();
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleConfirmMute = () => applyBulkPatch({ muted: true });

  // Apaga as conversas selecionadas da lista
  const handleBulkDelete = async () => {
    if (!selectedIds.size || isSavingAction) return;
    const qtd = selectedIds.size;
    const msg = `Remover ${qtd} conversa${qtd === 1 ? '' : 's'} da lista?`;
    const ok = window.confirm(msg);
    if (!ok) return;

    setIsSavingAction(true);
    try {
      const ids = Array.from(selectedIds);
      const phones = leads.filter(l => ids.includes(l.id)).map(l => l.phone).filter(Boolean);

      if (phones.length) {
        try {
          await supabase
            .from('crm_notifications')
            .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: 'conversation_deleted' })
            .eq('company_id', 'rafa-arts')
            .in('phone', phones)
            .eq('status', 'pending');
        } catch (e) {
          console.warn('Erro ao resolver notificações na exclusão de conversas:', e);
        }
      }

      await supabase.from('leads').update({ archived: true, updated_at: new Date().toISOString() }).in('id', ids);
      setLeads(prev => prev.map(l => ids.includes(l.id) ? { ...l, archived: true } : l));

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
      {/* Camada invisível só pra fechar ao clicar fora no desktop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:block hidden" onClick={onClose} />

      {/* Wrapper posicionado (balão no desktop, tela inteira no mobile) */}
      <div className="fixed inset-0 z-[60] lg:inset-auto lg:top-4 lg:left-[275px] lg:z-40 lg:w-[440px] lg:h-[calc(100vh-2rem)] animate-in fade-in zoom-in-95 duration-150">
        {/* Caldinha sutil no desktop apontando pro item Conversas */}
        <div className="hidden lg:block absolute top-8 -left-2 w-4 h-4 bg-black border-l border-b border-[#202c33] rotate-45 shadow-sm" />

        {/* Corpo do painel — WhatsApp iOS Dark puro (#000000) */}
        <div className="relative bg-black border border-[#202c33] rounded-none lg:rounded-[28px] flex flex-col shadow-2xl overflow-hidden h-full text-white font-sans">
          
          {/* Top Action Bar (iOS Style: circle '...' on left, Plus on right) */}
          <div className="px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-2 flex items-center justify-between flex-shrink-0 bg-black">
            {/* Botão de Mais Opções '...' */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => {
                  const r = menuRef.current?.getBoundingClientRect();
                  if (r) setMenuPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 240 - 8)) });
                  setIsMenuOpen(o => !o);
                }}
                className={cn(
                  "w-9 h-9 rounded-full bg-[#1c1c1e] hover:bg-[#2c2c2e] active:scale-95 text-white/90 flex items-center justify-center transition-all shadow-sm cursor-pointer",
                  isMenuOpen && "bg-[#2c2c2e] text-white"
                )}
                title="Mais opções"
              >
                <MoreHorizontal size={20} />
              </button>

              {/* Menu de opções (Dropdown Dark iOS) */}
              {isMenuOpen && createPortal(
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => setIsMenuOpen(false)} />
                  <div
                    className="fixed bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl z-[100] py-2 text-sm whitespace-nowrap text-white divide-y divide-white/10"
                    style={{ top: menuPos.top, left: menuPos.left, width: 240, minWidth: 240, maxWidth: 260, maxHeight: `calc(100vh - ${menuPos.top + 12}px)`, overflowY: 'auto' }}
                  >
                    <div className="py-1">
                      <p className="px-3.5 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Ações</p>
                      <button type="button" onClick={() => startSelection('group')} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-200 hover:bg-white/10 transition-colors text-left">
                        <CirclePlus size={16} className="text-slate-400 shrink-0" />
                        <span>Criar um grupo</span>
                      </button>
                      <button type="button" onClick={() => startSelection('bulk')} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-200 hover:bg-white/10 transition-colors text-left">
                        <CheckSquare size={16} className="text-slate-400 shrink-0" />
                        <span>Ações múltiplas</span>
                      </button>
                      <button type="button" onClick={() => { setIsMenuOpen(false); setIsMergeOpen(true); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-200 hover:bg-white/10 transition-colors text-left">
                        <GitMerge size={16} className="text-slate-400 shrink-0" />
                        <span>Mesclar duplicados</span>
                      </button>
                      <button type="button" onClick={() => startSelection('mute')} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-200 hover:bg-white/10 transition-colors text-left">
                        <VolumeX size={16} className="text-slate-400 shrink-0" />
                        <span>Silenciar</span>
                      </button>
                    </div>

                    <div className="py-1">
                      <p className="px-3.5 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Organizar</p>
                      {SORT_OPTIONS.map(opt => {
                        const ativo = sort.key === opt.key;
                        const DirIcon = (ativo ? sort.dir : opt.defaultDir) === 'asc' ? ArrowUp : ArrowDown;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => pickSort(opt.key)}
                            className={cn(
                              "w-full flex items-center gap-2 px-3.5 py-2 transition-colors text-left",
                              ativo ? "text-emerald-400 font-bold bg-white/5" : "text-slate-300 hover:bg-white/10"
                            )}
                          >
                            <span className="w-4 shrink-0 flex items-center justify-center">
                              {ativo && <Check size={14} className="text-emerald-400" />}
                            </span>
                            <span className="flex-1">{opt.label}</span>
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
                            "w-full flex items-center gap-2 px-3.5 py-2 transition-colors text-left",
                            p.on ? "text-emerald-400 font-bold bg-white/5" : "text-slate-300 hover:bg-white/10"
                          )}
                        >
                          <span className="w-4 shrink-0 flex items-center justify-center">
                            {p.on && <Check size={14} className="text-emerald-400" />}
                          </span>
                          <span className="flex-1">{p.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => { setIsMenuOpen(false); handleRefresh(); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-300 hover:bg-white/10 transition-colors text-left"
                      >
                        <RefreshCw size={15} className={cn("text-slate-400 shrink-0", isRefreshing && "animate-spin")} />
                        <span>Sincronizar conversas</span>
                      </button>
                    </div>
                  </div>
                </>,
                document.body
              )}
            </div>

            {/* Right: Plus, Close */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsNewChatOpen(true)}
                className="w-9 h-9 rounded-full bg-[#1c1c1e] hover:bg-[#2c2c2e] active:scale-95 text-white flex items-center justify-center transition-all shadow-sm cursor-pointer"
                title="Nova conversa"
              >
                <Plus size={20} strokeWidth={2.4} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-[#1c1c1e] hover:bg-[#2c2c2e] active:scale-95 text-slate-400 hover:text-white flex items-center justify-center transition-all shadow-sm cursor-pointer"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Large Title: "Conversas" */}
          <div className="px-4 pb-2.5 flex items-baseline justify-between bg-black flex-shrink-0">
            <h2 className="text-[34px] font-extrabold tracking-tight text-white select-none leading-none">
              Conversas
            </h2>
          </div>

          {/* Search Bar (WhatsApp iOS style) */}
          <div className="px-4 pb-3 bg-black flex-shrink-0">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 text-[#8696a0]" size={16} />
              <input
                type="text"
                placeholder="Buscar"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-[#1c1c1e] border border-white/5 rounded-xl py-2 pl-9 pr-8 text-sm text-white placeholder:text-[#8696a0] outline-none focus:bg-[#242426] transition-all"
              />
              {filter && (
                <button
                  type="button"
                  onClick={() => setFilter('')}
                  className="absolute right-2.5 text-[#8696a0] hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills Bar (Todas / Não lidas 295 / Favoritos / Grupos 6 / +) */}
          <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar bg-black flex-shrink-0 select-none">
            <button
              type="button"
              onClick={() => setViewFilter('all')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer",
                viewFilter === 'all'
                  ? "bg-[#2a2a2c] text-white border border-white/10"
                  : "bg-[#1c1c1e] text-slate-300 hover:text-white"
              )}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setViewFilter(prev => prev === 'unread' ? 'all' : 'unread')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all shrink-0 flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                viewFilter === 'unread'
                  ? "bg-[#2a2a2c] text-white border border-white/10"
                  : "bg-[#1c1c1e] text-slate-300 hover:text-white"
              )}
            >
              <span>Não lidas {unrepliedCount > 0 ? unrepliedCount : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewFilter(prev => prev === 'favorite' ? 'all' : 'favorite')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all shrink-0 whitespace-nowrap cursor-pointer",
                viewFilter === 'favorite'
                  ? "bg-[#2a2a2c] text-white border border-white/10"
                  : "bg-[#1c1c1e] text-slate-300 hover:text-white"
              )}
            >
              Favoritos
            </button>
            <button
              type="button"
              onClick={() => setViewFilter(prev => prev === 'group' ? 'all' : 'group')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all shrink-0 flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                viewFilter === 'group'
                  ? "bg-[#2a2a2c] text-white border border-white/10"
                  : "bg-[#1c1c1e] text-slate-300 hover:text-white"
              )}
            >
              <span>Grupos {groupCount || 6}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsNewChatOpen(true)}
              className="w-7 h-7 rounded-full bg-[#1c1c1e] text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              title="Adicionar filtro ou conversa"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Barra contextual de seleção múltipla (se ativada via menu) */}
          {selectionMode && (
            <div className="px-4 py-2.5 border-y border-white/10 bg-[#1c1c1e] flex-shrink-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {selectedIds.size} {selectedIds.size === 1 ? 'selecionada' : 'selecionadas'}
                </span>
                <button type="button" onClick={cancelSelection} className="text-slate-400 hover:text-white p-1 rounded-lg">
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
                    className="flex-1 bg-black/60 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-emerald-500"
                  />
                  <Button
                    variant="primary"
                    className="h-8 px-3 text-[10px]"
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
                  className="w-full h-8 text-[10px]"
                  icon={VolumeX}
                  disabled={!selectedIds.size || isSavingAction}
                  onClick={handleConfirmMute}
                >
                  Silenciar {selectedIds.size || ''} conversa{selectedIds.size === 1 ? '' : 's'}
                </Button>
              )}

              {selectionMode === 'bulk' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" disabled={!selectedIds.size || isSavingAction} onClick={() => applyBulkPatch({ unread: false })} title="Marcar como lida" className="p-2 rounded-lg bg-black/60 border border-white/10 text-slate-300 hover:text-emerald-400 transition-colors disabled:opacity-40">
                    <MailOpen size={14} />
                  </button>
                  <button type="button" disabled={!selectedIds.size || isSavingAction} onClick={() => applyBulkPatch({ unread: true })} title="Marcar como não lida" className="p-2 rounded-lg bg-black/60 border border-white/10 text-slate-300 hover:text-emerald-400 transition-colors disabled:opacity-40">
                    <Mail size={14} />
                  </button>
                  <button type="button" disabled={!selectedIds.size || isSavingAction} onClick={() => applyBulkPatch({ priority: 'alta' })} title="Marcar prioridade alta" className="p-2 rounded-lg bg-black/60 border border-white/10 text-slate-300 hover:text-amber-400 transition-colors disabled:opacity-40">
                    <Flag size={14} />
                  </button>
                  <button type="button" disabled={!selectedIds.size || isSavingAction} onClick={() => applyBulkPatch({ muted: true })} title="Silenciar" className="p-2 rounded-lg bg-black/60 border border-white/10 text-slate-300 hover:text-emerald-400 transition-colors disabled:opacity-40">
                    <VolumeX size={14} />
                  </button>
                  <button type="button" disabled={!selectedIds.size || isSavingAction} onClick={handleBulkDelete} title="Remover da lista" className="p-2 rounded-lg bg-black/60 border border-white/10 text-slate-300 hover:text-rose-400 transition-colors disabled:opacity-40">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Lista Virtualizada de Conversas */}
          <div className="flex-1 min-h-0 relative bg-black pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]">
            <Virtuoso
              className="absolute inset-0 custom-scrollbar divide-y-0"
              data={filteredLeads}
              computeItemKey={(_, l) => l.id}
              increaseViewportBy={400}
              itemContent={(_, l) => {
                const isOutgoing = l.lastMessageDirection === 'outgoing';
                const text = (l.lastMessageText || l.lastClientMessageText || '').trim();
                const isAudio = text.toLowerCase().includes('áudio') || text.toLowerCase().includes('audio') || text.toLowerCase().includes('voz') || text.includes('.m4a') || text.includes('.mp3') || text.includes('.ogg') || text.includes('.opus') || text.includes('.wav') || (l as any).lastMessageMediaType === 'audio';
                const isPhoto = !isAudio && (text.toLowerCase().includes('foto') || text.toLowerCase().includes('imagem') || /\.(jpg|jpeg|png|webp|gif)$/i.test(text));
                const isSticker = !isAudio && (text.toLowerCase().includes('figurinha') || text.toLowerCase().includes('sticker'));
                const isFile = !isAudio && !isPhoto && !isSticker && (text.includes('.pdf') || text.includes('.zip') || text.includes('.doc') || text.includes('.docx'));
                const isCall = text.toLowerCase().includes('ligação') || text.toLowerCase().includes('chamada');
                const audioLabel = text && !/\.(m4a|mp3|ogg|opus|wav)$/i.test(text) && !text.includes('temp-upload') && !text.startsWith('http')
                  ? (text.replace(/^[🎤🎵]\s*/, '') || 'Áudio')
                  : 'Áudio';
                const timeStr = formatWhatsAppDate(leadLastMessageDate(l)) || formatListTime(leadLastMessageDate(l));

                const hasStatusRing = l.priority === 'alta';
                const isPinned = l.priority === 'alta' || (l as any).pinned;
                const isMuted = l.muted;
                const isGroup = groupPhones.has((l.phone || '').replace(/\D/g, ''));
                const isUnread = !!l.unread || (!!l.waitingSince && l.lastMessageDirection !== 'resolved') || Number((l as any).unreadCount || 0) > 0;
                const unreadCountNumber = Number((l as any).unreadCount || 0) > 0 
                  ? Number((l as any).unreadCount) 
                  : (isUnread ? 1 : 0);

                return (
                  <div
                    key={l.id}
                    onClick={() => handleSelectLead(l)}
                    className="relative px-4 py-3 flex items-center gap-3.5 hover:bg-[#111b21] active:bg-[#182229] cursor-pointer transition-colors group select-none bg-black"
                  >
                    {selectionMode && (
                      <div className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                        selectedIds.has(l.id) ? "bg-[#25D366] border-[#25D366]" : "border-slate-500 bg-transparent"
                      )}>
                        {selectedIds.has(l.id) && <Check size={12} className="text-black stroke-[3]" />}
                      </div>
                    )}

                    {/* Avatar 52x52 circular */}
                    <div className={cn(
                      "w-[52px] h-[52px] rounded-full shrink-0 relative flex items-center justify-center overflow-hidden transition-transform",
                      hasStatusRing && "p-[2px] ring-2 ring-emerald-500 ring-offset-2 ring-offset-black"
                    )}>
                      {l.photoUrl ? (
                        <img
                          src={l.photoUrl}
                          alt={nomeDaConversa(l)}
                          className="w-full h-full rounded-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                        />
                      ) : groupPhones.has((l.phone || '').replace(/\D/g, '')) ? (
                        <div className="w-full h-full rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-white">
                          <Users size={22} className="text-emerald-400" />
                        </div>
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center text-white font-bold text-base select-none">
                          {nomeDaConversa(l).charAt(0).toUpperCase() || <User size={22} className="text-slate-400" />}
                        </div>
                      )}
                    </div>

                    {/* Conteúdo central */}
                    <div className="flex-1 min-w-0">
                      {/* Linha superior: Nome / Telefone + Hora */}
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <h4 className="text-[16px] font-semibold text-white truncate tracking-tight">
                          {nomeDaConversa(l)}
                        </h4>
                        <span className="text-xs text-[#8696a0] shrink-0 font-normal ml-2">
                          {timeStr}
                        </span>
                      </div>

                      {/* Linha inferior: Ícone status + Prévia da mensagem + Badges (Pin, Mute, Contador) */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[14px] text-[#8696a0] truncate leading-snug flex-1">
                          {isOutgoing && (() => {
                            const rawDelivery = String((l as any).lastMessageDeliveryStatus || '').toLowerCase();
                            const isMsgRead = rawDelivery === 'read' || rawDelivery === 'played' || rawDelivery === 'viewed' || Boolean((l as any).lastMessageReadAt);
                            const isMsgDelivered = isMsgRead || rawDelivery === 'delivered' || rawDelivery === 'delivery_ack' || rawDelivery === 'received' || Boolean((l as any).lastMessageDeliveredAt);
                            if (isMsgRead) {
                              return <CheckCheck size={16} className="shrink-0 text-[#53bdeb]" title="Visualizada" />;
                            }
                            if (isMsgDelivered) {
                              return <CheckCheck size={16} className="shrink-0 text-[#8696a0]" title="Entregue" />;
                            }
                            return <Check size={16} className="shrink-0 text-[#8696a0]" title="Enviada" />;
                          })()}
                          {isAudio ? (
                            <>
                              <Mic size={15} className="shrink-0 text-[#53bdeb]" />
                              <span className="truncate">{audioLabel}</span>
                            </>
                          ) : isPhoto ? (
                            <>
                              <Camera size={14} className="shrink-0 text-[#8696a0]" />
                              <span className="truncate">{text && !/\.(jpg|jpeg|png|webp|gif)$/i.test(text) ? text : 'Foto'}</span>
                            </>
                          ) : isSticker ? (
                            <>
                              <Sparkles size={14} className="shrink-0 text-[#8696a0]" />
                              <span className="truncate">Figurinha</span>
                            </>
                          ) : isFile ? (
                            <>
                              <FileText size={14} className="shrink-0 text-[#8696a0]" />
                              <span className="truncate">{text || 'Documento'}</span>
                            </>
                          ) : isCall ? (
                            <>
                              <PhoneIncoming size={14} className="shrink-0 text-slate-400" />
                              <span className="truncate">Ligação de voz</span>
                            </>
                          ) : (
                            <span className="truncate">{text || 'Nenhuma mensagem recente'}</span>
                          )}
                        </div>

                        {/* Ícones da direita: Mute, Pin, Status Arquivada e Contador apenas em Grupos */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isMuted && (
                            <VolumeX size={14} className="text-[#8696a0]" />
                          )}
                          {isPinned && (
                            <Pin size={14} className="text-[#8696a0] rotate-45" />
                          )}
                          {unreadCountNumber > 0 && !isOutgoing && (
                            <span className="bg-[#25D366] text-black font-bold text-xs min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center">
                              {unreadCountNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Divisória hairline inset à direita do avatar */}
                    <div className="absolute bottom-0 left-[76px] right-0 border-b border-[#202c33]/70 pointer-events-none" />
                  </div>
                );
              }}
            />
          </div>

        </div>
      </div>

      {/* Modal de Nova Conversa (acionado pelo botão '+') */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsNewChatOpen(false)}>
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in zoom-in-95 text-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageCircle size={18} className="text-emerald-400" />
                Nova Conversa
              </h3>
              <button onClick={() => setIsNewChatOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Número de WhatsApp (com DDD)</label>
                <input
                  type="text"
                  placeholder="Ex: 93 98417-5343"
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nome do Contato (opcional)</label>
                <input
                  type="text"
                  placeholder="Nome ou empresa"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                disabled={!newChatPhone.trim() || isCreatingLead}
                onClick={handleStartNewChat}
                className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isCreatingLead ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <>
                    <MessageCircle size={16} />
                    <span>Iniciar conversa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
