import { format } from 'date-fns';

// Aceita Timestamp do Firestore (tem .toDate()), Date ou string ISO do Supabase.
function paraData(v: any): Date | null {
  if (!v) return null;
  const d = typeof v?.toDate === 'function' ? v.toDate() : v instanceof Date ? v : new Date(v);
  return d && !isNaN(d.getTime()) ? d : null;
}

// Horario da ULTIMA MENSAGEM de um lead, pra mostrar na lista de conversas. Antes a lista usava
// updatedAt, que muda com qualquer edicao do lead (mudar etapa, editar nome...) e, na
// recuperacao de mensagens perdidas, virava a hora da recuperacao -- nao a da mensagem.
//  - ultima mensagem do cliente: last_client_message_at
//  - ultima mensagem do atendente: o envio grava updated_at no lead, entao usa ele
export function leadLastMessageDate(lead: any): Date | null {
  const atualizado = paraData(lead?.updatedAt);
  if (lead?.lastMessageDirection === 'outgoing') return atualizado;
  return paraData(lead?.lastClientMessageAt) || atualizado;
}

// Hoje: so a hora. Outro dia: data + hora, pra sempre dar pra saber QUANDO foi.
export function formatListTime(d: Date | null): string {
  if (!d) return '';
  return d.toDateString() === new Date().toDateString() ? format(d, 'HH:mm') : format(d, 'dd/MM HH:mm');
}
