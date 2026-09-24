// Endpoint combinado de transcrição de áudio — agrupa em UMA Serverless Function os dois
// endpoints que antes eram arquivos separados (transcrever-audio.js e transcrever-pendentes.js),
// só pra respeitar o limite de 12 Serverless Functions do plano Hobby da Vercel.
//
// As URLs públicas continuam EXATAMENTE as mesmas de antes — o roteamento é feito no
// vercel.json, que reescreve cada URL original pra cá com um parâmetro `rota` interno
// (o front-end não muda nada). Autenticação, variáveis de ambiente, comportamento e
// respostas de cada rota são idênticos aos arquivos originais — só o arquivo físico mudou.
//
// POST /api/transcrever-audio      (chega aqui como ?rota=audio)      -> transcreve UM áudio
//   headers: x-user-id: <id do usuário logado>
//   body: { mediaUrl: "https://<supabase>/storage/v1/object/public/whatsapp-media/..." }
//   resposta: { text: "..." }
//
// POST /api/transcrever-pendentes  (chega aqui como ?rota=pendentes) -> reprocessa pendências
//   headers: x-user-id: <id do usuário logado>
//   body: { phone: "5511999999999" }
//   resposta: { processados: <n>, resultados: [...] }

import { exigirUsuarioAutorizado } from './_lib/auth.js';
import { transcreverAudio, provedorTranscricao, ErroTranscricao } from './_lib/transcricao-audio.js';
import { processarPendentesDoTelefone } from './_lib/transcricao-fila.js';

export const config = { maxDuration: 60 };

// --- rota=audio (ex api/transcrever-audio.js) ---
async function handleAudio(req, res) {
  if (!provedorTranscricao()) {
    res.status(500).json({ error: 'Transcrição não configurada — adicione a variável GROQ_API_KEY no painel da Vercel (Settings > Environment Variables).' });
    return;
  }

  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const { mediaUrl } = req.body || {};
  try {
    const text = await transcreverAudio(mediaUrl);
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

// --- rota=pendentes (ex api/transcrever-pendentes.js) ---
async function handlePendentes(req, res) {
  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const phone = String(req.body?.phone || '').replace(/\D/g, '');
  if (!phone) {
    res.status(400).json({ error: 'Telefone inválido.' });
    return;
  }
  const resultados = await processarPendentesDoTelefone(phone);
  res.status(200).json({ processados: resultados.length, resultados });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rota = String(req.query?.rota || '');
  if (rota === 'pendentes') {
    await handlePendentes(req, res);
    return;
  }
  // default / rota === 'audio'
  await handleAudio(req, res);
}
