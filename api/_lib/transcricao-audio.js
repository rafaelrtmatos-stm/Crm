// Ponto único de transcrição de áudio (voz -> texto), usado por api/_lib/transcricao-fila.js (automática)
// e api/transcrever-audio.js (botão "Transcrever"). O provedor é a Groq (Whisper large-v3-turbo);
// a chave fica em GROQ_API_KEY, só no servidor. Sem a chave, o erro de configuração é explícito.
import { chaveGroq, transcreverAudioComGroq } from './groq-transcricao.js';
import { ErroTranscricao } from './gemini-transcricao.js';

export { ErroTranscricao };

export function provedorTranscricao() {
  return chaveGroq() ? 'groq' : null;
}

export async function transcreverAudio(mediaUrl) {
  // transcreverAudioComGroq já lança o erro de "GROQ_API_KEY não configurada" quando falta a chave.
  return transcreverAudioComGroq(mediaUrl);
}
