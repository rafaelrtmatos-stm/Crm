// Sugestão de resposta contextual (Gemini) pro botão "Sugestão do Robozinho" no chat.
// UMA chamada ao Gemini por clique, retorna 3 sugestões. So recebe a mensagem atual + as
// ultimas mensagens da conversa (ja carregadas no front) -- nao consulta Supabase aqui.
// A chave (GEMINI_API_KEY) fica só no servidor.
//
// POST /api/ai/suggest-reply
// headers: x-user-id: <id do usuário logado>
// body: { clientMessage: "...", history: [{ direction: "incoming"|"outgoing", text: "..." }], clientName?: "..." }
// resposta: { suggestions: ["...", "...", "..."] }

import { exigirUsuarioAutorizado } from '../_lib/auth.js';

// Mesmo modelo (e mesma variável GEMINI_MODEL) já usados pela transcrição de áudio e pelo
// assistente de escrita, pra não introduzir uma segunda config de modelo.
const MODELO = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const MAX_HISTORICO = 10;
const MAX_CHARS_MENSAGEM = 2000;

const INSTRUCAO = `Você é um assistente de atendimento via WhatsApp.
Analise a mensagem atual e o contexto recente.
Gere 3 respostas naturais e úteis para o atendente enviar ao cliente.
Preserve o contexto da conversa.
Não invente preços, prazos, estoque, descontos, serviços ou qualquer informação que não esteja no contexto.
Se faltar uma informação, faça uma pergunta adequada ou diga que é necessário verificar.
As respostas devem ser em português brasileiro.
Não envie a mensagem. Apenas gere sugestões.
A sugestão 1 deve ser natural e direta, a sugestão 2 mais comercial, a sugestão 3 mais consultiva -- mas não inclua rótulos como "Sugestão 1:" dentro do texto.
Responda SOMENTE em JSON, no formato exato: {"suggestions": ["...", "...", "..."]}`;

function montarPrompt({ clientMessage, history, clientName }) {
  const historicoTexto = (history || [])
    .slice(-MAX_HISTORICO)
    .map((m) => `${m.direction === 'incoming' ? 'Cliente' : 'Atendente'}: ${String(m.text || '').slice(0, MAX_CHARS_MENSAGEM)}`)
    .join('\n');

  return `${INSTRUCAO}\n\nMENSAGEM ATUAL:\n${clientMessage}\n\nHISTÓRICO RECENTE:\n${historicoTexto || '(sem histórico anterior)'}\n\nCLIENTE:\n${clientName || '(nome não disponível)'}`;
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Sugestão com IA não configurada — adicione a variável GEMINI_API_KEY no painel da Vercel (Settings > Environment Variables).' });
    return;
  }

  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const clientMessage = String(req.body?.clientMessage || '').trim().slice(0, MAX_CHARS_MENSAGEM);
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
        contents: [{ parts: [{ text: montarPrompt({ clientMessage, history, clientName }) }] }],
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
