// Transcreve um áudio do WhatsApp (voz -> texto) usando a API do Gemini.
// A chave (GEMINI_API_KEY) fica só no servidor — o front nunca fala direto com o Gemini.
//
// POST /api/transcrever-audio
// headers: x-user-id: <id do usuário logado>
// body: { mediaUrl: "https://<supabase>/storage/v1/object/public/whatsapp-media/..." }
// resposta: { text: "..." }

import { SUPABASE_URL } from './_lib/whatsapp-config.js';
import { exigirUsuarioAutorizado } from './_lib/auth.js';

export const config = { maxDuration: 60 };

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
const PREFIXO_PERMITIDO = `${SUPABASE_URL}/storage/v1/object/public/whatsapp-media/`;

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
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: 'Transcrição não configurada — adicione a variável GEMINI_API_KEY no painel da Vercel (Settings > Environment Variables).' });
    return;
  }

  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const { mediaUrl } = req.body || {};
  if (typeof mediaUrl !== 'string' || !mediaUrl.startsWith(PREFIXO_PERMITIDO)) {
    res.status(400).json({ error: 'URL do áudio inválida.' });
    return;
  }

  try {
    const arquivo = await fetch(mediaUrl);
    if (!arquivo.ok) {
      res.status(502).json({ error: 'Não foi possível baixar o áudio.' });
      return;
    }
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    if (buffer.length === 0) {
      res.status(422).json({ error: 'O arquivo de áudio está vazio.' });
      return;
    }
    if (buffer.length > MAX_BYTES) {
      res.status(413).json({ error: 'Áudio muito grande pra transcrever (limite de 14 MB).' });
      return;
    }
    const mime = descobrirMime(arquivo.headers.get('content-type'), mediaUrl);
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
        console.warn(`[transcrever-audio] Exceção ao chamar modelo ${modelo}:`, err);
      }
    }

    if (!resposta || !resposta.ok) {
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
      res.status(502).json({ error: detalhe });
      return;
    }

    const json = await resposta.json();
    const parts = json?.candidates?.[0]?.content?.parts || [];
    const texto = parts
      .map((p) => p.text || p.audioTranscription?.text || '')
      .join('')
      .trim();

    if (!texto) {
      res.status(422).json({ error: 'Não foi possível entender esse áudio.' });
      return;
    }

    res.status(200).json({ text: texto });
  } catch (err) {
    console.error('Erro ao transcrever áudio:', err);
    res.status(500).json({ error: 'Erro interno ao transcrever o áudio.' });
  }
}
