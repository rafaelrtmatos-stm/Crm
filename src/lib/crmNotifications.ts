import { supabase } from '../supabase';

// Notificações persistentes de CONVERSA pendente (tabela crm_notifications, ver
// supabase/create_crm_notifications.sql). Formato enxuto: 1 linha por conversa (phone),
// não 1 linha por mensagem — não depende de crm_messages. REGRA PRINCIPAL: visualizar/abrir
// a conversa NÃO resolve a notificação — ela só vira 'resolved' via resolveCrmNotifications(),
// chamado exclusivamente pelo botão "Marcar como resolvido".

export interface CrmNotification {
  id: string;
  phone: string;
  leadId?: string;
  groupId?: string;
  isGroup: boolean;
  title: string;
  senderName?: string;
  photoUrl?: string;
  preview: string;
  messageAt: string;
  /** Desde quando a conversa está esperando resposta (não reseta a cada mensagem nova). */
  waitingSince: string;
  status: 'pending' | 'resolved';
}

/**
 * Mantido por compatibilidade com o restante do app (NotificationCenter, App.tsx), que
 * trabalha com "threads". Como agora cada CrmNotification já é 1 conversa inteira, o
 * "thread" é sempre 1:1 com a notificação — não agrupa mais várias mensagens.
 */
export interface CrmNotificationThread {
  key: string;
  phone: string;
  leadId?: string;
  isGroup: boolean;
  title: string;
  photoUrl?: string;
  waitingSince: string;
  items: CrmNotification[];
  first: CrmNotification;
  last: CrmNotification;
}

const mapRow = (r: any): CrmNotification => ({
  id: r.id,
  phone: r.phone,
  leadId: r.lead_id || undefined,
  groupId: r.group_id || undefined,
  isGroup: !!r.is_group,
  title: r.title || r.phone,
  senderName: r.sender_name || undefined,
  photoUrl: r.photo_url || undefined,
  preview: r.preview || '',
  messageAt: r.message_at,
  waitingSince: r.waiting_since || r.message_at,
  status: r.status,
});

/** Só devolve o que o usuário pode ver (grupos atribuídos a ele — regra de permissão no banco). */
export async function fetchVisibleNotifications(userId: string): Promise<CrmNotification[] | null> {
  const { data, error } = await supabase.rpc('crm_notifications_visible', { p_user_id: userId, p_status: 'pending' });
  if (error) {
    console.warn('Falha ao carregar notificações:', error.message);
    return null; // null = falhou (mantém a lista anterior na tela)
  }
  return (data || []).map(mapRow);
}

/** Cada conversa pendente vira 1 "thread" (não agrupa mais várias mensagens numa mesma linha). */
export function groupNotifications(list: CrmNotification[]): CrmNotificationThread[] {
  return list
    .map((n): CrmNotificationThread => ({
      key: n.phone,
      phone: n.phone,
      leadId: n.leadId,
      isGroup: n.isGroup,
      title: n.title,
      photoUrl: n.photoUrl,
      waitingSince: n.waitingSince,
      items: [n],
      first: n,
      last: n,
    }))
    // Quem está esperando há mais tempo aparece primeiro.
    .sort((a, b) => new Date(a.waitingSince).getTime() - new Date(b.waitingSince).getTime());
}

/** ÚNICO caminho que marca como resolvida: o botão "Marcar como resolvido". */
export async function resolveCrmNotifications(ids: string[], resolvedBy?: string): Promise<boolean> {
  if (ids.length === 0) return true;
  const { error } = await supabase
    .from('crm_notifications')
    .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: resolvedBy || null })
    .in('id', ids)
    .eq('status', 'pending');
  if (error) {
    console.warn('Falha ao marcar notificação como resolvida:', error.message);
    return false;
  }
  return true;
}
