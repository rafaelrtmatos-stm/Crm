import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellRing, CheckCircle2, Crosshair, User, Users } from 'lucide-react';
import { supabase } from '../supabase';
import type { AppUser } from '../types';
import { cn } from './SharedUI';
import { FotoNotificacao } from '../lib/notify';

// NOTIFICACAO PENDENTE de uma conversa (tabela crm_notifications -- ja existe em producao,
// espelho em supabase/create_crm_notifications.sql). UMA LINHA POR MENSAGEM recebida, criada
// pelo gatilho do banco (crm_notify_incoming_message) com status 'pending'. Aqui as pendentes
// do mesmo contato/grupo aparecem AGRUPADAS num unico aviso.
//
// REGRA PRINCIPAL: visualizar a mensagem != resolver a notificacao.
//   * Abrir a conversa, clicar na notificacao ou rolar ate a mensagem NAO resolvem nada: este
//     arquivo so LE a tabela, e o unico UPDATE que existe e `marcarNotificacoesResolvidas`,
//     chamado exclusivamente pelo botao "Marcar como resolvido".
//   * Nao chame `marcarNotificacoesResolvidas` de nenhum efeito, abertura de conversa ou
//     clique em aviso.
//   * Mensagem que chega DEPOIS de resolvido cria uma linha 'pending' nova (o gatilho faz isso),
//     e o aviso reaparece.

export type NotificacaoPendente = {
  ids: string[];           // ids das linhas pendentes agrupadas -- sao exatamente elas que o botao resolve
  phone: string;
  messageId?: string;      // mensagem mais antiga pendente: a que gerou a notificacao
  messageCount: number;    // quantas mensagens do cliente ficaram agrupadas
  title?: string;
  senderName?: string;
  photoUrl?: string;
  lastMessageText?: string;
  lastMessageAt?: string;
  isGroup: boolean;
  groupId?: string;        // whatsapp_groups.id (so quando isGroup) -- base da permissao por grupo
};

const agruparNotificacoes = (rows: any[]): NotificacaoPendente | null => {
  if (!rows.length) return null;
  const primeira = rows[0];                // ordenadas da mais antiga pra mais nova
  const ultima = rows[rows.length - 1];
  return {
    ids: rows.map(r => r.id),
    phone: primeira.phone,
    messageId: primeira.message_id || undefined,
    messageCount: rows.length,
    title: ultima.title || undefined,
    senderName: ultima.sender_name || undefined,
    photoUrl: ultima.photo_url || undefined,
    lastMessageText: ultima.preview || undefined,
    lastMessageAt: ultima.message_at || undefined,
    isGroup: !!ultima.is_group,
    groupId: ultima.group_id || undefined,
  };
};

/**
 * Notificacao PENDENTE da conversa (agrupando as mensagens pendentes do contato/grupo).
 * Somente leitura + tempo real. `refreshKey` (ex: quantidade de mensagens do chat) forca uma
 * nova leitura -- garante que o aviso aparece mesmo se o Realtime falhar.
 * Se a tabela nao estiver acessivel, simplesmente nao mostra nada.
 */
export function useNotificacaoPendente(phone?: string | null, refreshKey?: number) {
  const [notificacao, setNotificacao] = useState<NotificacaoPendente | null>(null);

  const recarregar = useCallback(async () => {
    if (!phone) { setNotificacao(null); return; }
    const { data, error } = await supabase
      .from('crm_notifications')
      .select('*')
      .eq('company_id', 'rafa-arts')
      .eq('phone', phone)
      .eq('status', 'pending')
      .order('message_at', { ascending: true })
      .limit(500);
    if (error) { setNotificacao(null); return; }
    setNotificacao(agruparNotificacoes(data || []));
  }, [phone]);

  useEffect(() => { recarregar(); }, [recarregar, refreshKey]);

  useEffect(() => {
    if (!phone) return;
    const channel = supabase
      .channel(`chat-notificacao-${phone}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_notifications', filter: `phone=eq.${phone}` }, recarregar)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [phone, recarregar]);

  return { notificacao, recarregar, limpar: () => setNotificacao(null) };
}

/**
 * UNICO ponto que resolve notificacoes. So o botao "Marcar como resolvido" chama isto.
 * Resolve SOMENTE as linhas que o aviso mostrava (`ids`): se chegou mensagem nova enquanto o
 * aviso estava na tela, ela nasce pendente e NAO e resolvida junto.
 */
export async function marcarNotificacoesResolvidas(ids: string[], resolvidoPor?: string | null): Promise<boolean> {
  if (!ids.length) return true;
  const { error } = await supabase
    .from('crm_notifications')
    .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: resolvidoPor || null })
    .in('id', ids)
    .eq('status', 'pending');
  if (error) {
    console.error('Erro ao marcar notificacao como resolvida:', error);
    return false;
  }
  return true;
}

export const NotificacaoPendenteBanner = ({
  notificacao,
  onVerMensagem,
  onResolver,
  resolvendo,
}: {
  notificacao: NotificacaoPendente;
  onVerMensagem?: () => void;   // so posiciona no chat; NAO resolve
  onResolver: () => void;       // clique explicito no botao
  resolvendo?: boolean;
}) => {
  const n = notificacao.messageCount;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/15 border-b border-amber-500/30 flex-shrink-0">
      <BellRing size={14} className="text-amber-300 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wider text-amber-300 leading-none">
          Notificação pendente{n > 1 ? ` · ${n} mensagens` : ''}
        </p>
        {notificacao.lastMessageText && (
          <p className="text-[11px] text-white/60 truncate mt-0.5">{notificacao.lastMessageText}</p>
        )}
      </div>
      {onVerMensagem && notificacao.messageId && (
        <button
          type="button"
          onClick={onVerMensagem}
          title="Ir até a mensagem que gerou a notificação (não resolve)"
          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Crosshair size={11} /> Ver mensagem
        </button>
      )}
      <button
        type="button"
        onClick={onResolver}
        disabled={resolvendo}
        title="Abrir a conversa não resolve a notificação — só este botão"
        className={cn(
          "shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wide transition-colors cursor-pointer",
          "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <CheckCircle2 size={12} /> Marcar como resolvido
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// LISTA GLOBAL de notificacoes pendentes (sino no topo do CRM) + permissao por usuario.
// Continua valendo a REGRA PRINCIPAL: nada aqui resolve notificacao. Abrir a lista, clicar num
// item ou abrir a conversa so NAVEGA; quem resolve e apenas `marcarNotificacoesResolvidas`,
// chamado pelo botao "Marcar como resolvido" do aviso dentro da conversa.
// ---------------------------------------------------------------------------------------------

/** Quem pode ver notificacoes de mensagens: administrador ou quem tem "ver" no modulo Mensagens. */
export const usuarioPodeVerMensagens = (user?: AppUser | null): boolean =>
  !!(user?.isAdmin || user?.modulePermissions?.messages?.view);

/**
 * Grupos que ESTE usuario pode ver, ja liberados (visivel = true): usuario comum = vinculado a ele em
 * user_whatsapp_groups; administrador = marcado com admin_ve em whatsapp_groups (o login do admin nao e
 * uuid de `usuarios`). As duas escolhas sao feitas na tela Grupos do WhatsApp. Em caso de erro devolve
 * vazio (esconde, nunca vaza).
 */
export const carregarGruposPermitidos = async (userId?: string | null, isAdmin = false): Promise<Set<string>> => {
  if (!userId) return new Set();
  try {
    if (isAdmin) {
      const { data, error } = await supabase.from('whatsapp_groups').select('id').eq('company_id', 'rafa-arts').eq('visivel', true).eq('admin_ve', true);
      if (error) return new Set();
      return new Set((data || []).map((g: any) => g.id));
    }
    const [vinculos, grupos] = await Promise.all([
      supabase.from('user_whatsapp_groups').select('group_id').eq('user_id', userId),
      supabase.from('whatsapp_groups').select('id').eq('company_id', 'rafa-arts').eq('visivel', true),
    ]);
    if (vinculos.error || grupos.error) return new Set();
    const liberados = new Set((grupos.data || []).map((g: any) => g.id));
    return new Set((vinculos.data || []).map((v: any) => v.group_id).filter((id: string) => liberados.has(id)));
  } catch {
    return new Set();
  }
};

/** Conversa comum: qualquer usuario com acesso a Mensagens. Grupo: so se o grupo esta no conjunto permitido. */
export const notificacaoVisivelParaUsuario = (row: { is_group?: boolean; group_id?: string | null }, podeVerMensagens: boolean, gruposPermitidos: Set<string>): boolean => {
  if (!podeVerMensagens) return false;
  if (row.is_group) return !!row.group_id && gruposPermitidos.has(row.group_id);
  return true;
};

/** "14:32" se for de hoje, "18/09 14:32" nos outros dias. */
export const formatarHoraNotificacao = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return hora;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hora}`;
};

/**
 * Dados da notificacao gerada por UMA mensagem (nome/grupo, foto, previa, horario) + se o usuario
 * pode ve-la. Usado pelo aviso na tela / notificacao nativa quando a mensagem chega. O gatilho do
 * banco roda na mesma transacao da mensagem, entao a linha ja existe; tenta de novo uma vez
 * por garantia. `null` = sem linha (gatilho falhou): quem chamou cai no comportamento antigo.
 */
export const buscarNotificacaoDaMensagem = async (messageId?: string | null, user?: AppUser | null) => {
  if (!messageId) return null;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const { data } = await supabase.from('crm_notifications').select('*').eq('message_id', messageId).limit(1);
    const row = data?.[0];
    if (row) {
      const permitidos = row.is_group ? await carregarGruposPermitidos(user?.id, !!user?.isAdmin) : new Set<string>();
      return {
        visivel: notificacaoVisivelParaUsuario(row, usuarioPodeVerMensagens(user), permitidos),
        title: (row.title as string | null) || undefined,
        photoUrl: (row.photo_url as string | null) || undefined,
        preview: (row.preview as string | null) || undefined,
        messageAt: (row.message_at as string | null) || undefined,
        isGroup: !!row.is_group,
      };
    }
    if (tentativa === 0) await new Promise(r => setTimeout(r, 400));
  }
  return null;
};

/**
 * Todas as notificacoes PENDENTES que o usuario pode ver, ja AGRUPADAS por cliente/grupo
 * (uma entrada por conversa, com a mensagem mais antiga pendente como alvo do clique).
 * `itens.length` e o contador do sino. Tempo real + releitura a cada 60s como garantia.
 */
export function useNotificacoesPendentes(user?: AppUser | null) {
  const [itens, setItens] = useState<NotificacaoPendente[]>([]);
  const userId = user?.id;
  const podeVer = usuarioPodeVerMensagens(user);

  const recarregar = useCallback(async () => {
    if (!userId || !podeVer) { setItens([]); return; }
    try {
      const [resp, permitidos] = await Promise.all([
        supabase
          .from('crm_notifications')
          .select('*')
          .eq('company_id', 'rafa-arts')
          .eq('status', 'pending')
          .order('message_at', { ascending: true })
          .limit(1000),
        carregarGruposPermitidos(userId, !!user?.isAdmin),
      ]);
      if (resp.error) return; // mantem o que ja esta na tela em vez de zerar o contador por erro de rede
      const porConversa = new Map<string, any[]>();
      for (const row of resp.data || []) {
        if (!notificacaoVisivelParaUsuario(row, podeVer, permitidos)) continue;
        const lista = porConversa.get(row.phone) || [];
        lista.push(row);
        porConversa.set(row.phone, lista);
      }
      const agrupadas = Array.from(porConversa.values())
        .map(agruparNotificacoes)
        .filter((n): n is NotificacaoPendente => !!n)
        .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
      setItens(agrupadas);
    } catch (e) {
      console.warn('Falha ao carregar notificacoes pendentes:', e);
    }
  }, [userId, podeVer, user?.isAdmin]);

  useEffect(() => {
    recarregar();
    if (!userId || !podeVer) return;
    const channel = supabase
      .channel('notificacoes-pendentes-globais')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_notifications', filter: 'company_id=eq.rafa-arts' }, recarregar)
      .subscribe();
    const timer = setInterval(recarregar, 60000);
    return () => { supabase.removeChannel(channel); clearInterval(timer); };
  }, [recarregar, userId, podeVer]);

  return { itens, recarregar };
}

/** Nome exibido no item: titulo/remetente; sem nome, o telefone (contato) ou "Grupo" (JID de grupo nao e legivel). */
const nomeDaNotificacao = (n: NotificacaoPendente): string =>
  (n.title || n.senderName || '').trim() || (n.isGroup ? 'Grupo' : n.phone || 'Contato');

/** Inicial do avatar sem foto. Nome que e so numero/telefone nao vira "inicial": cai no icone de pessoa. */
const inicialDoNome = (nome: string): string | null => {
  const c = nome.trim().charAt(0);
  if (!c || /^[\d+\s()-]+$/.test(nome.trim())) return null;
  return /[\p{L}\p{N}]/u.test(c) ? c.toUpperCase() : null;
};

const AvatarSemFoto = ({ n }: { n: NotificacaoPendente }) => {
  const inicial = n.isGroup ? null : inicialDoNome(nomeDaNotificacao(n));
  return (
    <div className="w-10 h-10 rounded-full bg-primary-500/15 text-primary-400 flex items-center justify-center shrink-0 text-sm font-black">
      {n.isGroup ? <Users size={18} /> : inicial ? inicial : <User size={18} />}
    </div>
  );
};

const LARGURA_PAINEL = 384;   // sm:w-96
const MARGEM_TELA = 12;

/**
 * Sino com o contador de notificacoes pendentes (central de notificacoes). Cada item e UMA conversa
 * (as mensagens pendentes do mesmo cliente/grupo ja vem agrupadas) com foto, nome, previa e horario;
 * clicar leva direto a conversa, posicionada na mensagem que gerou a notificacao.
 * Clicar NAO resolve: o item continua na lista ate alguem usar "Marcar como resolvido".
 *
 * O painel e desenhado por PORTAL em document.body, posicionado com `fixed` a partir do botao e
 * limitado a tela. Dentro do <nav> ele ficava preso: o nav tem backdrop-filter (que faz o `fixed`
 * dos filhos virar relativo ao nav, quebrando o "clicar fora") e cria contexto de empilhamento
 * z-40 (o painel z-50 nao passava do conteudo da pagina). No celular, `absolute right-0` com
 * largura de 100vw saia pela esquerda da tela.
 */
export const NotificacoesPendentesBell = ({
  itens,
  onAbrir,
}: {
  itens: NotificacaoPendente[];
  onAbrir: (n: NotificacaoPendente) => void;
}) => {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const total = itens.length;

  const calcularPosicao = useCallback(() => {
    const btn = botaoRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const largura = Math.min(LARGURA_PAINEL, window.innerWidth - MARGEM_TELA * 2);
    // Borda direita do painel alinhada com a do sino, sem passar das bordas da tela.
    const left = Math.max(MARGEM_TELA, Math.min(r.right - largura, window.innerWidth - largura - MARGEM_TELA));
    const top = r.bottom + 8;
    setPos({ top, left, width: largura, maxHeight: Math.max(160, window.innerHeight - top - MARGEM_TELA) });
  }, []);

  useLayoutEffect(() => { if (aberto) calcularPosicao(); }, [aberto, calcularPosicao]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('resize', calcularPosicao);
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('resize', calcularPosicao);
      window.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto, calcularPosicao]);

  return (
    <div className="relative">
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        title={total > 0 ? `${total} notificaç${total > 1 ? 'ões pendentes' : 'ão pendente'}` : 'Nenhuma notificação pendente'}
        className="relative p-3 text-white/70 hover:bg-white/10 rounded-xl transition-colors cursor-pointer border-0 bg-transparent"
      >
        {total > 0 ? <BellRing size={20} className="text-amber-300" /> : <Bell size={20} />}
        {total > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {aberto && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[310]" onClick={() => setAberto(false)} />
          <div
            role="dialog"
            aria-label="Notificações"
            style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
            className="fixed z-[311] flex flex-col overflow-hidden bg-[#1a2333]/95 border border-white/10 rounded-2xl shadow-2xl"
          >
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-white">Notificações</p>
                <p className="text-[10px] text-white/40">Abrir a conversa não resolve — só “Marcar como resolvido”.</p>
              </div>
              <span className="shrink-0 px-2.5 h-6 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center whitespace-nowrap">
                {total > 0 ? `${total} pendente${total > 1 ? 's' : ''}` : 'Nenhuma'}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
              {total === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-white/40">Nenhuma notificação pendente.</p>
              ) : (
                itens.map(n => {
                  const nome = nomeDaNotificacao(n);
                  const hora = formatarHoraNotificacao(n.lastMessageAt);
                  return (
                    <button
                      key={n.phone}
                      type="button"
                      onClick={() => { setAberto(false); onAbrir(n); }}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left bg-transparent border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <FotoNotificacao
                        url={n.photoUrl}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                        fallback={<AvatarSemFoto n={n} />}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 text-xs font-black text-white truncate">{nome}</p>
                          {hora && <span className="text-[10px] text-white/40 shrink-0 tabular-nums">{hora}</span>}
                        </div>
                        {n.isGroup && n.senderName && <p className="text-[10px] text-primary-300 truncate">{n.senderName}</p>}
                        {n.messageCount > 1 && (
                          <p className="text-[10px] font-bold text-amber-300 mt-0.5">{n.messageCount} mensagens pendentes</p>
                        )}
                        <p className="text-[11px] text-white/60 line-clamp-2 break-words mt-0.5">{n.lastMessageText || 'Nova mensagem'}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
