// Endpoint combinado das funções de IA (Gemini) — agrupa em UMA Serverless Function os dois
// endpoints que antes eram arquivos separados (ai/assist.js e ai/suggest-reply.js), só pra
// respeitar o limite de 12 Serverless Functions do plano Hobby da Vercel.
//
// As URLs públicas continuam EXATAMENTE as mesmas de antes — o roteamento é feito no
// vercel.json, que reescreve cada URL original pra cá com um parâmetro `rota` interno
// (o front-end não muda nada). Autenticação, variáveis de ambiente, comportamento e
// respostas de cada rota são idênticos aos arquivos originais — só o arquivo físico mudou.
//
// POST /api/ai/assist         (chega aqui como ?rota=assist)
//   headers: x-user-id: <id do usuário logado>
//   body: { text: "...", action: "correct" | "professional" | "friendly" | "funny" | "longer" | "shorter" | "simple" }
//   resposta: { text: "..." }
//
// POST /api/ai/suggest-reply  (chega aqui como ?rota=suggest-reply)
//   headers: x-user-id: <id do usuário logado>
//   body: { clientMessage: "...", history: [{ direction: "incoming"|"outgoing", text: "..." }], clientName?: "..." }
//   resposta: { suggestions: ["...", "...", "..."] }

import { exigirUsuarioAutorizado } from './_lib/auth.js';

// Mesmo modelo (e mesma variável GEMINI_MODEL) já usados pela transcrição de áudio
// (api/_lib/gemini-transcricao.js), pra não introduzir uma segunda config de modelo.
const MODELO = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
}

// --- rota=assist (ex api/ai/assist.js) ---
// Campo de mensagem é curto (chat de WhatsApp); 4000 caracteres é folgado pra qualquer
// mensagem real e evita mandar texto gigante sem necessidade pro Gemini.
const ASSIST_MAX_CHARS = 4000;

const ASSIST_INSTRUCOES = {
  correct: 'Corrija ortografia, gramática e pontuação.',
  professional: 'Deixe profissional e adequado para atendimento comercial.',
  friendly: 'Deixe cordial, natural e amigável.',
  funny: 'Deixe leve e descontraído, sem perder o profissionalismo.',
  longer: 'Desenvolva um pouco mais, sem inventar informações.',
  shorter: 'Reduza mantendo as informações essenciais.',
  simple: 'Use linguagem mais simples e clara.',
};

const ASSIST_REGRA_BASE = 'Transforme o texto mantendo exatamente sua intenção e todas as informações existentes. '
  + 'Não invente informações. Não altere nomes, valores, datas, horários, links, telefones, endereços ou códigos. '
  + 'Retorne somente o texto final.';

async function handleAssist(req, res) {
  const apiKey = getApiKey();
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
  if (text.length > ASSIST_MAX_CHARS) {
    res.status(413).json({ error: `Texto muito longo pra ajustar (limite de ${ASSIST_MAX_CHARS} caracteres).` });
    return;
  }
  const instrucao = ASSIST_INSTRUCOES[action];
  if (!instrucao) {
    res.status(400).json({ error: 'Ação inválida.' });
    return;
  }

  try {
    const resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${ASSIST_REGRA_BASE} ${instrucao}\n\nTexto:\n${text}` }] }],
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

// --- rota=suggest-reply (ex api/ai/suggest-reply.js) ---
const SUGGEST_MAX_HISTORICO = 10;
const SUGGEST_MAX_CHARS_MENSAGEM = 2000;

const SUGGEST_INSTRUCAO = `Você é um assistente de atendimento via WhatsApp.
Analise a mensagem atual e o contexto recente.
Gere 3 respostas naturais e úteis para o atendente enviar ao cliente.
Preserve o contexto da conversa.
Não invente preços, prazos, estoque, descontos, serviços ou qualquer informação que não esteja no contexto.
Se faltar uma informação, faça uma pergunta adequada ou diga que é necessário verificar.
As respostas devem ser em português brasileiro.
Não envie a mensagem. Apenas gere sugestões.
A sugestão 1 deve ser natural e direta, a sugestão 2 mais comercial, a sugestão 3 mais consultiva -- mas não inclua rótulos como "Sugestão 1:" dentro do texto.
Responda SOMENTE em JSON, no formato exato: {"suggestions": ["...", "...", "..."]}`;

function montarPromptSuggest({ clientMessage, history, clientName }) {
  const historicoTexto = (history || [])
    .slice(-SUGGEST_MAX_HISTORICO)
    .map((m) => `${m.direction === 'incoming' ? 'Cliente' : 'Atendente'}: ${String(m.text || '').slice(0, SUGGEST_MAX_CHARS_MENSAGEM)}`)
    .join('\n');

  return `${SUGGEST_INSTRUCAO}\n\nMENSAGEM ATUAL:\n${clientMessage}\n\nHISTÓRICO RECENTE:\n${historicoTexto || '(sem histórico anterior)'}\n\nCLIENTE:\n${clientName || '(nome não disponível)'}`;
}

function extrairSugestoes(texto) {
  // O Gemini às vezes envolve o JSON em ```json ... ``` mesmo pedindo só JSON.
  const limpo = texto.replace(/```json|```/gi, '').trim();
  let json;
  try {
    json = JSON.parse(limpo);
  } catch {
    return null;
  }
  const suggestions = Array.isArray(json?.suggestions) ? json.suggestions.filter((s) => typeof s === 'string' && s.trim()) : null;
  if (!suggestions || suggestions.length === 0) return null;
  return suggestions.slice(0, 3);
}

async function handleSuggestReply(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(500).json({ error: 'Sugestão com IA não configurada — adicione a variável GEMINI_API_KEY no painel da Vercel (Settings > Environment Variables).' });
    return;
  }

  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const clientMessage = String(req.body?.clientMessage || '').trim().slice(0, SUGGEST_MAX_CHARS_MENSAGEM);
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const clientName = String(req.body?.clientName || '').trim().slice(0, 100);

  if (!clientMessage) {
    res.status(400).json({ error: 'Mensagem do cliente vazia.' });
    return;
  }

  try {
    const resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: montarPromptSuggest({ clientMessage, history, clientName }) }] }],
        generationConfig: { temperature: 0.6, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(20 * 1000),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => '');
      console.error(`[ai/suggest-reply] Gemini HTTP ${resposta.status}: ${corpo.slice(0, 300)}`);
      res.status(502).json({ error: 'Não foi possível gerar as sugestões agora.' });
      return;
    }

    const json = await resposta.json();
    const textoFinal = (json?.candidates?.[0]?.content?.parts || []).map((p) => p?.text || '').join('').trim();
    const suggestions = textoFinal ? extrairSugestoes(textoFinal) : null;

    if (!suggestions) {
      console.error('[ai/suggest-reply] Gemini respondeu sem JSON de sugestões utilizável.');
      res.status(502).json({ error: 'Não foi possível gerar as sugestões agora.' });
      return;
    }

    res.status(200).json({ suggestions });
  } catch (err) {
    const timeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    console.error(`[ai/suggest-reply] ${timeout ? 'timeout' : 'falha'} ao chamar Gemini:`, err?.message || err);
    res.status(timeout ? 504 : 500).json({ error: 'Não foi possível gerar as sugestões agora.' });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rota = String(req.query?.rota || '');
  if (rota === 'suggest-reply') {
    await handleSuggestReply(req, res);
    return;
  }
  // default / rota === 'assist'
  await handleAssist(req, res);
}
