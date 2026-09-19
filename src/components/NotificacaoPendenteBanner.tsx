import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, CheckCircle2, Crosshair } from 'lucide-react';
import { supabase } from '../supabase';
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
