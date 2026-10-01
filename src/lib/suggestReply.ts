// Sugestão de resposta contextual (Gemini) do botão "Sugestão do Robozinho". A chamada real ao
// Gemini acontece no servidor, em api/ai/suggest-reply.js, pra a chave nunca ficar exposta no
// navegador. So pede as 3 sugestões; quem envia a mensagem continua sendo sempre o atendente.

export interface SuggestReplyHistoryItem {
  direction: 'incoming' | 'outgoing';
  text: string;
}

// Cache local temporário em memória (2 minutos) por cliente e mensagem: evita nova requisição
// ao Gemini caso o atendente clique de novo ou retorne à mesma conversa.
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
  negativeScript?: string
): Promise<string[]> {
  const cacheKey = `${clientName || ''}:::${clientMessage.trim()}:::${history.length}`;
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
      negativeScript
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
