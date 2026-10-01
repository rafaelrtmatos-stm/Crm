// Sugestão de resposta contextual (Gemini) do botão "Sugestão do Robozinho". A chamada real ao
// Gemini acontece no servidor, em api/ai/suggest-reply.js, pra a chave nunca ficar exposta no
// navegador. So pede as 3 sugestões; quem envia a mensagem continua sendo sempre o atendente.

export interface SuggestReplyHistoryItem {
  direction: 'incoming' | 'outgoing';
  text: string;
}

export type SuggestReplyAction = 'followup' | 'quote' | 'thanks' | 'general';

export interface SuggestActionCategory {
  id: SuggestReplyAction;
  label: string;
  badge: string;
  description: string;
  tagColor: string;
}

export const SUGGEST_ACTIONS_LIST: SuggestActionCategory[] = [
  {
    id: 'followup',
    label: 'Follow-up Orçamento',
    badge: 'Retomada',
    description: 'Checar se viu a proposta, tirar dúvidas e incentivar o fechamento.',
    tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  {
    id: 'quote',
    label: 'Enviar Orçamento',
    badge: 'Valores & Sinal',
    description: 'Passar preços, materiais e a condição de 50% de sinal no PIX.',
    tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  {
    id: 'thanks',
    label: 'Agradecimento & Pós-Venda',
    badge: 'Fidelização',
    description: 'Agradecer a confiança na Rafa Arts e verificar se gostou do resultado.',
    tagColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  },
  {
    id: 'general',
    label: 'Resposta Geral',
    badge: 'Dúvidas',
    description: 'Responder com precisão e simpatia à última dúvida do cliente.',
    tagColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
];

// Cache local temporário em memória (2 minutos) por cliente, mensagem e ação
const suggestionsCache = new Map<string, { timestamp: number; suggestions: string[] }>();
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function suggestReplies(
  clientMessage: string,
  history: SuggestReplyHistoryItem[],
  clientName?: string,
  userId?: string,
  attendantName?: string,
  memoryBlocks?: any[],
  products?: any[],
  companyInfo?: string,
  positiveScript?: string,
  negativeScript?: string,
  action?: SuggestReplyAction | string
): Promise<string[]> {
  const chosenAction = (action || 'general') as SuggestReplyAction;
  const cacheKey = `${clientName || ''}:::${chosenAction}:::${clientMessage.trim()}:::${history.length}`;
  const cached = suggestionsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.suggestions;
  }

  const effectiveUserId = userId || (typeof window !== 'undefined' ? localStorage.getItem('rpro_remembered_user_id') || 'admin-rafael' : '');
  const resp = await fetch('/api/ai/suggest-reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': effectiveUserId },
    body: JSON.stringify({
      clientMessage,
      history,
      clientName,
      attendantName,
      memoryBlocks,
      products,
      companyInfo,
      positiveScript,
      negativeScript,
      action: chosenAction,
    }),
  });

  let data: any = null;
  try { data = await resp.json(); } catch { /* resposta sem JSON */ }

  if (!resp.ok || !Array.isArray(data?.suggestions) || data.suggestions.length === 0) {
    throw new Error(data?.error || 'Não foi possível gerar as sugestões agora.');
  }

  const suggestions = data.suggestions as string[];
  suggestionsCache.set(cacheKey, { timestamp: Date.now(), suggestions });
  // Limita tamanho do cache em memória
  if (suggestionsCache.size > 50) {
    const firstKey = suggestionsCache.keys().next().value;
    if (firstKey) suggestionsCache.delete(firstKey);
  }

  return suggestions;
}
