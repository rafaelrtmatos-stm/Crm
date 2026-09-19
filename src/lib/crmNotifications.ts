import { supabase } from '../supabase';

// Notificações persistentes de mensagens de clientes (tabela crm_notifications, ver
// supabase/create_crm_notifications.sql). REGRA PRINCIPAL: visualizar/abrir a conversa
// NÃO resolve a notificação — ela só vira 'resolved' via resolveCrmNotifications(),
// chamado exclusivamente pelo botão "Marcar como resolvido".

export interface CrmNotification {
  id: string;
  messageId: string;
  phone: string;
  leadId?: string;
  groupId?: string;
  isGroup: boolean;
  title: string;
  senderName?: string;
  photoUrl?: string;
  preview: string;
  messageAt: string;
  status: 'pending' | 'resolved';
}

/** Notificações pendentes de uma mesma conversa (mesmo cliente ou mesmo grupo), agrupadas. */
export interface CrmNotificationThread {
  key: string;
  phone: string;
  leadId?: string;
  isGroup: boolean;
  title: string;
  photoUrl?: string;
  /** Ordem cronológica: items[0] é a mensagem que abriu a notificação. */
  items: CrmNotification[];
  first: CrmNotification;
  last: CrmNotification;
}

const mapRow = (r: any): CrmNotification => ({
  id: r.id,
  messageId: r.message_id,
  phone: r.phone,
  leadId: r.lead_id || undefined,
  groupId: r.group_id || undefined,
  isGroup: !!r.is_group,
  title: r.title || r.phone,
  senderName: r.sender_name || undefined,
  photoUrl: r.photo_url || undefined,
  preview: r.preview || '',
  messageAt: r.message_at,
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

export function groupNotifications(list: CrmNotification[]): CrmNotificationThread[] {
  const byPhone = new Map<string, CrmNotification[]>();
  for (const n of list) {
    const arr = byPhone.get(n.phone);
    if (arr) arr.push(n); else byPhone.set(n.phone, [n]);
  }
  const threads: CrmNotificationThread[] = [];
  byPhone.forEach((items, phone) => {
    items.sort((a, b) => new Date(a.messageAt).getTime() - new Date(b.messageAt).getTime());
    const last = items[items.length - 1];
    threads.push({
      key: phone,
      phone,
      leadId: items.find(i => i.leadId)?.leadId,
      isGroup: items[0].isGroup,
      title: last.title,
      photoUrl: last.photoUrl || items.find(i => i.photoUrl)?.photoUrl,
      items,
      first: items[0],
      last,
    });
  });
  // Conversa com mensagem mais recente primeiro.
  return threads.sort((a, b) => new Date(b.last.messageAt).getTime() - new Date(a.last.messageAt).getTime());
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
