// Transcrição de áudio (voz -> texto). A chamada real ao provedor (Gemini) acontece no servidor,
// em api/transcrever-audio.js, pra a chave nunca ficar exposta no navegador.
export async function transcribeAudioMessage(mediaUrl: string, userId?: string): Promise<string> {
  const resp = await fetch('/api/transcrever-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId || '' },
    body: JSON.stringify({ mediaUrl }),
  });

  let data: any = null;
  try { data = await resp.json(); } catch { /* resposta sem JSON */ }

  if (!resp.ok || !data?.text) {
    throw new Error(data?.error || 'Não foi possível transcrever esse áudio.');
  }
  return data.text as string;
}
