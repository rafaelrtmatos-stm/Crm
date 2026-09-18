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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Tenta o modelo configurado (GEMINI_MODEL) e, se ele não existir mais, cai pros seguintes.
const MODELOS = [process.env.GEMINI_MODEL, 'gemini-3.6-flash', 'gemini-2.5-flash'].filter(Boolean);
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

async function chamarGemini(modelo, mime, base64) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: 'Transcreva fielmente este áudio, no idioma em que foi falado (normalmente português do Brasil). Responda somente com o texto transcrito, sem comentários, sem marcações de tempo e sem aspas. Se não houver fala compreensível, responda apenas: [inaudível]' },
          { inline_data: { mime_type: mime, data: base64 } },
        ],
      }],
      generationConfig: { temperature: 0 },
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!GEMINI_API_KEY) {
    res.status(500).json({ error: 'Transcrição não configurada — falta GEMINI_API_KEY nas variáveis de ambiente da Vercel.' });
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
    for (const modelo of MODELOS) {
      resposta = await chamarGemini(modelo, mime, base64);
      if (resposta.status !== 404) break; // 404 = modelo não existe mais -> tenta o próximo
    }

    if (!resposta || !resposta.ok) {
      const corpo = resposta ? await resposta.text() : '';
      console.error('Gemini recusou a transcrição:', resposta?.status, corpo);
      res.status(502).json({ error: 'O serviço de transcrição recusou esse áudio.' });
      return;
    }

    const json = await resposta.json();
    const texto = (json?.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || '')
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
