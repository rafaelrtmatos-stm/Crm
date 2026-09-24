// Sugestão de resposta contextual (Gemini) do botão "Sugestão do Robozinho". A chamada real ao
// Gemini acontece no servidor, em api/ai/suggest-reply.js, pra a chave nunca ficar exposta no
// navegador. So pede as 3 sugestões; quem envia a mensagem continua sendo sempre o atendente.

export interface SuggestReplyHistoryItem {
  direction: 'incoming' | 'outgoing';
  text: string;
}

export async function suggestReplies(
  clientMessage: string,
  history: SuggestReplyHistoryItem[],
  clientName?: string,
  userId?: string
): Promise<string[]> {
  const resp = await fetch('/api/ai/suggest-reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId || '' },
    body: JSON.stringify({ clientMessage, history, clientName }),
  });

  let data: any = null;
  try { data = await resp.json(); } catch { /* resposta sem JSON */ }

  if (!resp.ok || !Array.isArray(data?.suggestions) || data.suggestions.length === 0) {
    throw new Error(data?.error || 'Não foi possível gerar as sugestões agora.');
  }
  return data.suggestions as string[];
}
