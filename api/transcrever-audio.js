// Transcreve um áudio do WhatsApp (voz -> texto) usando a API do Gemini.
// A chave (GEMINI_API_KEY) fica só no servidor — o front nunca fala direto com o Gemini.
//
// POST /api/transcrever-audio
// headers: x-user-id: <id do usuário logado>
// body: { mediaUrl: "https://<supabase>/storage/v1/object/public/whatsapp-media/..." }
// resposta: { text: "..." }

import { exigirUsuarioAutorizado } from './_lib/auth.js';
import { transcreverAudioDaUrl, chaveGemini, ErroTranscricao } from './_lib/gemini-transcricao.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!chaveGemini()) {
    res.status(500).json({ error: 'Transcrição não configurada — adicione a variável GEMINI_API_KEY no painel da Vercel (Settings > Environment Variables).' });
    return;
  }

  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const { mediaUrl } = req.body || {};
  try {
    const text = await transcreverAudioDaUrl(mediaUrl);
    res.status(200).json({ text });
  } catch (err) {
    if (err instanceof ErroTranscricao) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error('Erro ao transcrever áudio:', err);
    res.status(500).json({ error: 'Erro interno ao transcrever o áudio.' });
  }
}
