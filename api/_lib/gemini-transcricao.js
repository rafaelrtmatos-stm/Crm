// Núcleo da transcrição de áudio (voz -> texto) com a API do Gemini. Usado por:
//  - api/transcrever-audio.js (botão "Transcrever" manual, chamado pelo front-end)
//  - api/_lib/transcricao-fila.js (transcrição automática de áudio recebido no webhook)
// A chave (GEMINI_API_KEY) fica só no servidor — nunca vai para o navegador.
import { SUPABASE_URL } from './whatsapp-config.js';
import { buscarMidiaEvolution, messageIdDaMediaUrl, ErroMidia } from './evolution-media.js';

// Tenta o modelo configurado (GEMINI_MODEL) ou cai para os modelos ativos suportados (gemini-3.6-flash é o padrão atual do Google).
const MODELOS = [
  process.env.GEMINI_MODEL,
  'gemini-3.6-flash',
  'gemini-3.5-transcribe',
  'gemini-flash-latest',
].filter(Boolean);
// Inline do Gemini aceita até 20 MB no total; base64 infla ~33%, então limita o áudio a 14 MB.
const MAX_BYTES = 14 * 1024 * 1024;
// Só aceita áudio que já está no bucket de mídia do próprio CRM (evita usar a função
// como proxy pra baixar qualquer URL da internet).
export const PREFIXO_PERMITIDO = `${SUPABASE_URL}/storage/v1/object/public/whatsapp-media/`;

const MIME_POR_EXTENSAO = {
  ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', mp3: 'audio/mp3', mpeg: 'audio/mp3',
  m4a: 'audio/aac', mp4: 'audio/aac', aac: 'audio/aac', wav: 'audio/wav', webm: 'audio/ogg',
};

function descobrirMime(headerContentType, url) {
  const limpo = (headerContentType || '').split(';')[0].trim().toLowerCase();
  if (limpo.startsWith('audio/')) {
    if (limpo === 'audio/mpeg') return 'audio/mp3';
    if (limpo === 'audio/mp4' || limpo === 'audio/x-m4a') return 'audio/aac';
    return limpo;
  }
  const ext = (url || '').split('?')[0].split('.').pop()?.toLowerCase();
  return MIME_POR_EXTENSAO[ext] || 'audio/ogg';
}

async function chamarGemini(modelo, mime, base64, apiKey) {
  const isTranscribeModel = modelo.includes('transcribe');
  const body = isTranscribeModel
    ? {
        contents: [{
          parts: [
            { text: 'Transcreva este áudio em português do Brasil.' },
            { inline_data: { mime_type: mime, data: base64 } },
          ],
        }],
      }
    : {
        contents: [{
          parts: [
            { text: 'Transcreva fielmente este áudio, no idioma em que foi falado (normalmente português do Brasil). Responda somente com o texto transcrito, sem comentários, sem marcações de tempo e sem aspas. Se não houver fala compreensível, responda apenas: [inaudível]' },
            { inline_data: { mime_type: mime, data: base64 } },
          ],
        }],
        generationConfig: { temperature: 0 },
      };

  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}


// `temporario` = vale tentar de novo depois (cota, instabilidade do provedor, falha de rede).
export class ErroTranscricao extends Error {
  constructor(status, message, temporario = false) {
    super(message);
    this.status = status;
    this.temporario = temporario;
  }
}

export function chaveGemini() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
}

function detalheErroGemini(ultimoErro) {
  let detalhe = 'O serviço de transcrição recusou esse áudio.';
  if (ultimoErro?.body) {
    try {
      const parsed = JSON.parse(ultimoErro.body);
      const errObj = parsed?.error || {};
      const msg = errObj?.message || '';
      const status = errObj?.status || '';
      const reason = errObj?.details?.[0]?.reason || '';

      if (reason === 'API_KEY_INVALID' || msg.includes('API key not valid')) {
        detalhe = 'Chave GEMINI_API_KEY inválida na Vercel. Verifique se copiou a chave correta no Google AI Studio.';
      } else if (status === 'RESOURCE_EXHAUSTED' || ultimoErro.status === 429) {
        detalhe = 'Cota da API do Gemini excedida. Aguarde 1 minuto e tente novamente.';
      } else if (status === 'PERMISSION_DENIED' || ultimoErro.status === 403) {
        detalhe = 'Acesso negado pela API do Gemini. Verifique as permissões da chave.';
      } else if (msg) {
        detalhe = `Gemini: ${msg}`;
      }
    } catch {
      if (ultimoErro.body && ultimoErro.body.length < 150) {
        detalhe = `Erro do Gemini: ${ultimoErro.body}`;
      }
    }
  }
  return detalhe;
}

// Baixa o áudio a partir da URL gravada na mensagem e devolve os bytes + o content-type informado.
// Compartilhado entre os provedores de transcrição (Groq e Gemini), pra a regra de "de onde pode vir
// o áudio" ficar num lugar só. Erros de URL ausente/inválida, mídia indisponível, falha ao baixar e
// arquivo vazio saem como ErroTranscricao (o limite de tamanho é de cada provedor).
export async function baixarAudioDaUrl(mediaUrl) {
  // Áudio atual: a URL é /api/whatsapp-media?messageId=... (em qualquer host, ou relativa). Em vez de baixar essa
  // URL do próprio site (que muda a cada deploy e pode estar protegida pela Vercel), busca direto na Evolution.
  // Áudio antigo (bucket whatsapp-media do Supabase): continua baixando da URL do bucket.
  if (!mediaUrl) {
    throw new ErroTranscricao(400, 'Este áudio não tem arquivo (URL) associado.');
  }
  const messageId = messageIdDaMediaUrl(mediaUrl);
  const doBucketAntigo = typeof mediaUrl === 'string' && mediaUrl.startsWith(PREFIXO_PERMITIDO);
  if (!messageId && !doBucketAntigo) {
    throw new ErroTranscricao(400, 'URL do áudio inválida.');
  }

  let buffer;
  let contentType;
  if (messageId) {
    try {
      const midia = await buscarMidiaEvolution(messageId);
      buffer = midia.bytes;
      contentType = midia.mimetype;
    } catch (err) {
      if (err instanceof ErroMidia) {
        // 404 (mídia expirou no WhatsApp) não adianta tentar de novo; o resto pode ser passageiro.
        throw new ErroTranscricao(err.status === 404 ? 404 : 502, err.status === 404 ? err.message : 'Não foi possível baixar o áudio.', err.status !== 404);
      }
      throw new ErroTranscricao(502, 'Não foi possível baixar o áudio.', true);
    }
  } else {
    let arquivo;
    try {
      arquivo = await fetch(mediaUrl);
    } catch {
      throw new ErroTranscricao(502, 'Não foi possível baixar o áudio.', true);
    }
    if (!arquivo.ok) throw new ErroTranscricao(502, 'Não foi possível baixar o áudio.', true);
    buffer = Buffer.from(await arquivo.arrayBuffer());
    contentType = arquivo.headers.get('content-type');
  }
  if (buffer.length === 0) throw new ErroTranscricao(422, 'O arquivo de áudio está vazio.');
  return { buffer, contentType, urlParaMime: messageId ? '' : mediaUrl };
}

// Baixa o áudio (só do bucket whatsapp-media do próprio CRM) e devolve o texto transcrito.
// Lança ErroTranscricao com o status HTTP e a mensagem que o endpoint manual já devolvia.
export async function transcreverAudioDaUrl(mediaUrl) {
  const apiKey = chaveGemini();
  if (!apiKey) {
    throw new ErroTranscricao(500, 'Transcrição não configurada — adicione a variável GEMINI_API_KEY no painel da Vercel (Settings > Environment Variables).');
  }
  const { buffer, contentType, urlParaMime } = await baixarAudioDaUrl(mediaUrl);
  if (buffer.length > MAX_BYTES) throw new ErroTranscricao(413, 'Áudio muito grande pra transcrever (limite de 14 MB).');

  const mime = descobrirMime(contentType, urlParaMime);
  const base64 = buffer.toString('base64');

  let resposta = null;
  let ultimoErro = null;
  for (const modelo of MODELOS) {
    try {
      const resp = await chamarGemini(modelo, mime, base64, apiKey);
      if (resp.ok) {
        resposta = resp;
        break;
      }
      const textoErro = await resp.text().catch(() => '');
      ultimoErro = { status: resp.status, body: textoErro, modelo };
      console.warn(`[transcrever-audio] Modelo ${modelo} retornou status ${resp.status}:`, textoErro.slice(0, 300));
    } catch (err) {
      ultimoErro = ultimoErro || { status: 0, body: '', modelo };
      console.warn(`[transcrever-audio] Exceção ao chamar modelo ${modelo}:`, err);
    }
  }

  if (!resposta || !resposta.ok) {
    const st = ultimoErro?.status || 0;
    // 429 (cota), 5xx e falha de rede sao temporarios; 400/401/403/404 nao adianta repetir.
    throw new ErroTranscricao(502, detalheErroGemini(ultimoErro), st === 0 || st === 429 || st >= 500);
  }

  const json = await resposta.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const texto = parts
    .map((p) => p.text || p.audioTranscription?.text || '')
    .join('')
    .trim();
  if (!texto) throw new ErroTranscricao(422, 'Não foi possível entender esse áudio.');
  return texto;
}
