// Assistente de escrita (Gemini) do campo de mensagem. A chamada real ao provedor acontece
// no servidor, em api/ai/assist.js, pra a chave nunca ficar exposta no navegador.
// So ajusta o TEXTO ja digitado -- nunca envia a mensagem, nunca le historico/cliente/CRM.

export type WritingAssistAction = 'correct' | 'professional' | 'friendly' | 'funny' | 'longer' | 'shorter' | 'simple';

export const WRITING_ASSIST_ACTIONS: { action: WritingAssistAction; label: string }[] = [
  { action: 'correct', label: 'Corrigir gramática e ortografia' },
  { action: 'professional', label: 'Deixar profissional' },
  { action: 'friendly', label: 'Deixar amigável' },
  { action: 'funny', label: 'Deixar divertido' },
  { action: 'longer', label: 'Deixar mais longo' },
  { action: 'shorter', label: 'Deixar mais curto' },
  { action: 'simple', label: 'Deixar mais simples' },
];

export async function assistWriting(text: string, action: WritingAssistAction, userId?: string): Promise<string> {
  const resp = await fetch('/api/ai/assist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId || '' },
    body: JSON.stringify({ text, action }),
  });

  let data: any = null;
  try { data = await resp.json(); } catch { /* resposta sem JSON */ }

  if (!resp.ok || !data?.text) {
    throw new Error(data?.error || 'Não foi possível processar o texto.');
  }
  return data.text as string;
}
