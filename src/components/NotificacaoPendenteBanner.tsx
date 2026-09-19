import React, { useCallback, useEffect, useState } from 'react';
import { Bell, BellRing, CheckCircle2, Crosshair, Users } from 'lucide-react';
import { supabase } from '../supabase';
import type { AppUser } from '../types';
import { cn } from './SharedUI';

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
 * Grupos que ESTE usuario pode ver: vinculados a ele em user_whatsapp_groups (tela de grupos do
 * WhatsApp) E liberados (visivel = true). Vale tambem pro administrador: so aparece notificacao
 * de grupo que ele tem permissao de ver. Em caso de erro devolve vazio (esconde, nunca vaza).
 */
export const carregarGruposPermitidos = async (userId?: string | null): Promise<Set<string>> => {
  if (!userId) return new Set();
  try {
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
      const permitidos = row.is_group ? await carregarGruposPermitidos(user?.id) : new Set<string>();
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
        carregarGruposPermitidos(userId),
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
  }, [userId, podeVer]);

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

/**
 * Sino com o contador de notificacoes pendentes. Cada item mostra foto, nome (ou grupo), previa
 * e horario; clicar leva direto a conversa, posicionada na mensagem que gerou a notificacao.
 * Clicar NAO resolve: o item continua na lista ate alguem usar "Marcar como resolvido".
 */
export const NotificacoesPendentesBell = ({
  itens,
  onAbrir,
}: {
  itens: NotificacaoPendente[];
  onAbrir: (n: NotificacaoPendente) => void;
}) => {
  const [aberto, setAberto] = useState(false);
  const total = itens.length;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
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
      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-[calc(100vw-2rem)] sm:w-96 max-h-[70vh] overflow-y-auto custom-scrollbar bg-[#1a2333] border border-white/10 rounded-2xl shadow-2xl">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-[11px] font-black uppercase tracking-wider text-white">Notificações pendentes</p>
              <p className="text-[10px] text-white/40">Abrir a conversa não resolve — só o botão “Marcar como resolvido”.</p>
            </div>
            {total === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-white/40">Nenhuma notificação pendente.</p>
            ) : (
              itens.map(n => (
                <button
                  key={n.phone}
                  type="button"
                  onClick={() => { setAberto(false); onAbrir(n); }}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left border-0 border-b border-white/5 bg-transparent hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {n.photoUrl ? (
                    <img src={n.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary-500/15 text-primary-400 flex items-center justify-center shrink-0 text-xs font-black">
                      {n.isGroup ? <Users size={16} /> : (n.title || n.phone || '?').trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-white truncate">{n.title || n.senderName || n.phone}</p>
                      <span className="text-[10px] text-white/40 shrink-0">{formatarHoraNotificacao(n.lastMessageAt)}</span>
                    </div>
                    {n.isGroup && n.senderName && <p className="text-[10px] text-primary-300 truncate">{n.senderName}</p>}
                    <p className="text-[11px] text-white/60 line-clamp-2 break-words">{n.lastMessageText}</p>
                    {n.messageCount > 1 && (
                      <p className="text-[10px] font-bold text-amber-300 mt-0.5">{n.messageCount} mensagens pendentes</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
