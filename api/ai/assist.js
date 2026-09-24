// Assistente de escrita (Gemini) pro campo de mensagem do CRM -- corrige/ajusta o texto que o
// atendente digitou ANTES de enviar. Só transforma texto: não lê histórico, não consulta Supabase,
// não envia nada do cliente/CRM pro Gemini. A chave (GEMINI_API_KEY) fica só aqui no servidor.
//
// POST /api/ai/assist
// headers: x-user-id: <id do usuário logado>
// body: { text: "...", action: "correct" | "professional" | "friendly" | "funny" | "longer" | "shorter" | "simple" }
// resposta: { text: "..." }

import { exigirUsuarioAutorizado } from '../_lib/auth.js';

// Mesmo modelo (e mesma variável GEMINI_MODEL) já usados pela transcrição de áudio
// (api/_lib/gemini-transcricao.js), pra não introduzir uma segunda config de modelo.
const MODELO = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
// Campo de mensagem é curto (chat de WhatsApp); 4000 caracteres é folgado pra qualquer
// mensagem real e evita mandar texto gigante sem necessidade pro Gemini.
const MAX_CHARS = 4000;

const INSTRUCOES = {
  correct: 'Corrija ortografia, gramática e pontuação.',
  professional: 'Deixe profissional e adequado para atendimento comercial.',
  friendly: 'Deixe cordial, natural e amigável.',
  funny: 'Deixe leve e descontraído, sem perder o profissionalismo.',
  longer: 'Desenvolva um pouco mais, sem inventar informações.',
  shorter: 'Reduza mantendo as informações essenciais.',
  simple: 'Use linguagem mais simples e clara.',
};

const REGRA_BASE = 'Transforme o texto mantendo exatamente sua intenção e todas as informações existentes. '
  + 'Não invente informações. Não altere nomes, valores, datas, horários, links, telefones, endereços ou códigos. '
  + 'Retorne somente o texto final.';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Assistente de escrita não configurado — adicione a variável GEMINI_API_KEY no painel da Vercel (Settings > Environment Variables).' });
    return;
  }

  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const text = String(req.body?.text || '').trim();
  const action = String(req.body?.action || '');

  if (!text) {
    res.status(400).json({ error: 'Texto vazio.' });
    return;
  }
  if (text.length > MAX_CHARS) {
    res.status(413).json({ error: `Texto muito longo pra ajustar (limite de ${MAX_CHARS} caracteres).` });
    return;
  }
  const instrucao = INSTRUCOES[action];
  if (!instrucao) {
    res.status(400).json({ error: 'Ação inválida.' });
    return;
  }

  try {
    const resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${REGRA_BASE} ${instrucao}\n\nTexto:\n${text}` }] }],
        generationConfig: { temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(20 * 1000),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => '');
      console.error(`[ai/assist] Gemini HTTP ${resposta.status}: ${corpo.slice(0, 300)}`);
      res.status(502).json({ error: 'Não foi possível processar o texto.' });
      return;
    }

    const json = await resposta.json();
    const textoFinal = (json?.candidates?.[0]?.content?.parts || [])
      .map((p) => p?.text || '')
      .join('')
      .trim();

    if (!textoFinal) {
      console.error('[ai/assist] Gemini respondeu sem texto utilizável.');
      res.status(502).json({ error: 'Não foi possível processar o texto.' });
      return;
    }

    res.status(200).json({ text: textoFinal });
  } catch (err) {
    const timeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    console.error(`[ai/assist] ${timeout ? 'timeout' : 'falha'} ao chamar Gemini:`, err?.message || err);
    res.status(timeout ? 504 : 500).json({ error: 'Não foi possível processar o texto.' });
  }
}
