// Transcrição de áudio (voz -> texto) com a API da Groq (Whisper). Usado, via api/_lib/transcricao-audio.js, por:
//  - api/_lib/transcricao-fila.js (transcrição automática de áudio recebido no webhook)
//  - api/transcrever-audio.js (botão "Transcrever" manual, chamado pelo front-end)
// A chave (GROQ_API_KEY) fica só no servidor (variável de ambiente da Vercel) — nunca vai pro navegador,
// pro bundle do Vite nem pro banco. Sem dependência nova: usa fetch/FormData/Blob nativos do Node.
import { baixarAudioDaUrl, ErroTranscricao } from './gemini-transcricao.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const MODELO = 'whisper-large-v3-turbo';
// Limite de arquivo da Groq no plano gratuito (documentação: 25 MB).
const MAX_BYTES = 25 * 1024 * 1024;
// A função do webhook tem maxDuration de 60s e ainda pode baixar o áudio 2x (1 retry). O Whisper turbo
// responde em poucos segundos, então 20s por chamada é folgado e mantém o pior caso dentro dos 60s.
const TIMEOUT_MS = 20 * 1000;

export function chaveGroq() {
  return process.env.GROQ_API_KEY;
}

// A Groq descobre o formato pela extensão do nome do arquivo (aceita flac, mp3, mp4, mpeg, mpga, m4a,
// ogg, wav, webm). Áudio de voz do WhatsApp é OGG/Opus ("audio/ogg; codecs=opus"). Formato desconhecido
// cai em ogg (o mais comum no WhatsApp); se a Groq não aceitar, o erro dela vira "formato não suportado".
function formatoDoAudio(contentType) {
  const mime = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (/(ogg|opus|ogx)/.test(mime)) return { ext: 'ogg', mime: 'audio/ogg' };
  if (/(mpeg|mp3|mpga)/.test(mime)) return { ext: 'mp3', mime: 'audio/mpeg' };
  if (/(mp4|m4a|aac)/.test(mime)) return { ext: 'm4a', mime: 'audio/mp4' };
  if (/(wav|wave)/.test(mime)) return { ext: 'wav', mime: 'audio/wav' };
  if (/webm/.test(mime)) return { ext: 'webm', mime: 'audio/webm' };
  if (/flac/.test(mime)) return { ext: 'flac', mime: 'audio/flac' };
  return { ext: 'ogg', mime: 'audio/ogg' };
}

// Whisper "inventa" texto quando o áudio é silêncio/ruído. Considera sem fala só quando TODOS os trechos
// (segments do verbose_json) têm alta probabilidade de não-fala e baixa confiança — critério conservador
// (o mesmo do próprio Whisper), pra nunca descartar um áudio com fala real.
function semFala(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return false;
  return segments.every((s) => Number(s?.no_speech_prob) > 0.6 && Number(s?.avg_logprob) < -1);
}

function resumoCorpo(corpo) {
  return String(corpo || '').replace(/\s+/g, ' ').slice(0, 300);
}

// Traduz a resposta de erro da Groq. `temporario` = vale tentar de novo depois (limite de uso, instabilidade).
function erroDaGroq(status, corpo) {
  let mensagemGroq = '';
  try { mensagemGroq = JSON.parse(corpo)?.error?.message || ''; } catch { /* corpo sem JSON */ }
  // Log técnico (vai pros logs da Vercel; a chave nunca aparece aqui).
  console.error(`[transcricao][groq] HTTP ${status}: ${resumoCorpo(mensagemGroq || corpo)}`);

  if (status === 401) return new ErroTranscricao(502, 'Chave GROQ_API_KEY inválida na Vercel. Verifique a chave criada no console da Groq.', false);
  if (status === 403) return new ErroTranscricao(502, 'Acesso negado pela API da Groq. Verifique as permissões da chave.', false);
  if (status === 413) return new ErroTranscricao(413, 'Áudio muito grande pra transcrever (limite de 25 MB).', false);
  if (status === 429) return new ErroTranscricao(502, 'Limite de uso da API da Groq atingido. Tente novamente em instantes.', true);
  if (status >= 500) return new ErroTranscricao(502, 'O serviço de transcrição da Groq está instável. Tente novamente em instantes.', true);
  if (status === 400 && /format|file type|following types|invalid file|could not process|unsupported/i.test(mensagemGroq)) {
    return new ErroTranscricao(422, 'Formato de áudio não suportado para transcrição.', false);
  }
  return new ErroTranscricao(502, mensagemGroq ? `Groq: ${mensagemGroq}` : 'O serviço de transcrição recusou esse áudio.', false);
}

// Baixa o áudio (Evolution API ao vivo ou bucket antigo do CRM), manda pra Groq e devolve o texto em português.
// Lança ErroTranscricao (com `temporario` quando vale tentar de novo) — mesmo contrato do Gemini.
export async function transcreverAudioComGroq(mediaUrl) {
  const apiKey = chaveGroq();
  if (!apiKey) {
    throw new ErroTranscricao(500, 'Transcrição não configurada — adicione a variável GROQ_API_KEY no painel da Vercel (Settings > Environment Variables).');
  }

  const { buffer, contentType } = await baixarAudioDaUrl(mediaUrl);
  if (buffer.length > MAX_BYTES) throw new ErroTranscricao(413, 'Áudio muito grande pra transcrever (limite de 25 MB).');

  const { ext, mime } = formatoDoAudio(contentType);
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mime }), `audio.${ext}`);
  form.append('model', MODELO);
  // O idioma é o do ÁUDIO (Whisper transcreve no idioma falado). Fixar "pt" melhora precisão e velocidade
  // pros clientes brasileiros — e é o que garante a transcrição em português.
  form.append('language', 'pt');
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');

  const inicio = Date.now();
  let resp;
  try {
    resp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` }, // sem Content-Type: o fetch monta o multipart com o boundary
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const timeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    console.error(`[transcricao][groq] ${timeout ? `timeout (${TIMEOUT_MS / 1000}s)` : 'falha de rede'}:`, err?.message || err);
    throw new ErroTranscricao(timeout ? 504 : 502, timeout ? 'O serviço de transcrição demorou demais para responder.' : 'Não foi possível falar com o serviço de transcrição.', true);
  }

  if (!resp.ok) {
    throw erroDaGroq(resp.status, await resp.text().catch(() => ''));
  }

  let json;
  try {
    json = await resp.json();
  } catch {
    console.error('[transcricao][groq] resposta 200 sem JSON válido');
    throw new ErroTranscricao(502, 'Resposta inválida do serviço de transcrição.', true);
  }

  const texto = String(json?.text || '').trim();
  if (!texto || semFala(json?.segments)) {
    console.warn(`[transcricao][groq] sem fala identificável (${buffer.length} bytes, ${ext})`);
    throw new ErroTranscricao(422, 'Não foi possível identificar fala neste áudio.', false);
  }
  console.log(`[transcricao][groq] ok modelo=${MODELO} formato=${ext} bytes=${buffer.length} caracteres=${texto.length} ms=${Date.now() - inicio}`);
  return texto;
}
