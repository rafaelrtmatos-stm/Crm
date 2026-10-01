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

// Modelos suportados em ordem de velocidade e preferência. Os modelos flash-lite
// respondem em menos de 1 segundo e não sofrem sobrecarga (503). Se houver instabilidade,
// cai automaticamente para o próximo.
const MODELOS = [
  process.env.GEMINI_MODEL,
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
].filter(Boolean);

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

  let ultimoErro = null;
  for (const modelo of MODELOS) {
    try {
      const resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${ASSIST_REGRA_BASE} ${instrucao}\n\nTexto:\n${text}` }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
        }),
        signal: AbortSignal.timeout(8 * 1000),
      });

      if (!resposta.ok) {
        const corpo = await resposta.text().catch(() => '');
        console.warn(`[ai/assist] Gemini (${modelo}) HTTP ${resposta.status}: ${corpo.slice(0, 150)}`);
        ultimoErro = `HTTP ${resposta.status}`;
        continue;
      }

      const json = await resposta.json();
      const textoFinal = (json?.candidates?.[0]?.content?.parts || [])
        .map((p) => p?.text || '')
        .join('')
        .trim();

      if (!textoFinal) {
        console.warn(`[ai/assist] Gemini (${modelo}) respondeu sem texto.`);
        continue;
      }

      res.status(200).json({ text: textoFinal });
      return;
    } catch (err) {
      console.warn(`[ai/assist] falha no modelo ${modelo}:`, err?.message || err);
      ultimoErro = err?.message;
    }
  }

  console.error('[ai/assist] Todos os modelos falharam:', ultimoErro);
  res.status(502).json({ error: 'Não foi possível processar o texto.' });
}

// --- rota=suggest-reply (ex api/ai/suggest-reply.js) ---
const SUGGEST_MAX_HISTORICO = 10;
const SUGGEST_MAX_CHARS_MENSAGEM = 2000;

const SUGGEST_INSTRUCAO = `Você é um assistente de atendimento via WhatsApp da empresa Rafa Arts.
DIREÇÃO DA COMUNICAÇÃO (MUITO IMPORTANTE):
- O CLIENTE envia mensagens "de lá para cá" (recebidas por nós).
- O ATENDENTE (você) envia mensagens "daqui para lá" (enviadas para o cliente).
- A sua função é sugerir o que NÓS (atendente da Rafa Arts) devemos responder PARA O CLIENTE.

REGRAS ABSOLUTAS:
1. NUNCA responda como se você fosse o cliente. Você é SEMPRE o atendente/empresa respondendo.
2. NUNCA se passe pelo cliente e NUNCA coloque palavras na boca do cliente.
3. Se o nome do cliente for informado, cumprimente o cliente pelo nome dele (ex: "Olá, [Nome do Cliente]!"). NUNCA diga que o seu nome é o nome do cliente!
4. Fale na primeira pessoa ("eu" ou "nós"), em tom cordial, prestativo e profissional, representando a Rafa Arts.
5. Responda diretamente à última mensagem que o cliente enviou pra cá, aproveitando o contexto do histórico.
6. Não invente preços, prazos ou promoções fora do contexto. Se faltar informação técnica, pergunte com gentileza ao cliente ou avise que vai verificar.
7. As respostas devem ser em português brasileiro natural para WhatsApp.
8. Gere exatamente 3 opções de resposta para o atendente escolher:
   - Opção 1: Direta e cordial.
   - Opção 2: Comercial e resolutiva.
   - Opção 3: Mais consultiva ou com pergunta para dar continuidade.
9. Responda SOMENTE em JSON, no formato exato: {"suggestions": ["...", "...", "..."]}`;

function montarPromptSuggest({ clientMessage, history, clientName, attendantName, memoryBlocks, products, companyInfo, positiveScript, negativeScript }) {
  const historicoTexto = (history || [])
    .slice(-SUGGEST_MAX_HISTORICO)
    .map((m) => {
      const label = m.direction === 'incoming' 
        ? `[Cliente enviou pra cá]:` 
        : `[Você/Atendente enviou pra lá]:`;
      return `${label} ${String(m.text || '').slice(0, SUGGEST_MAX_CHARS_MENSAGEM)}`;
    })
    .join('\n');

  // Formata os blocos de memória aprendidos
  const memoriaTexto = Array.isArray(memoryBlocks) && memoryBlocks.length > 0
    ? memoryBlocks
        .slice(0, 15)
        .map((b) => `- [${b.title}]: ${b.content}`)
        .join('\n')
    : '(Nenhum bloco de memória específico cadastrado)';

  // Formata os produtos do catálogo do PDV
  const produtosTexto = Array.isArray(products) && products.length > 0
    ? products
        .slice(0, 25)
        .map((p) => `- ${p.name}: R$ ${Number(p.price || 0).toFixed(2).replace('.', ',')}${p.stock > 0 ? ` (Estoque: ${p.stock})` : ''}`)
        .join('\n')
    : '(Consulte itens diretamente na conversa)';

  const infoEmpresaTexto = (companyInfo || '').trim() || 'Rafa Arts — Comunicação Visual, Gráfica e Personalizados.';
  const scriptPositivoTexto = (positiveScript || '').trim() || 'Seja cordial, prestativo e comercial. Valorize os acabamentos premium e convide o cliente a enviar arte ou medidas.';
  const scriptNegativoTexto = (negativeScript || '').trim() || 'NUNCA prometa prazos de entrega urgentes sem falar com a produção. NUNCA dê descontos não autorizados. NUNCA diga apenas "não fazemos".';

  return `${SUGGEST_INSTRUCAO}

PAPÉIS NO ATENDIMENTO:
- Quem está respondendo agora (Daqui pra lá): ${attendantName || 'Atendente'} (Rafa Arts)
- Destinatário da resposta: ${clientName || 'Cliente'}

🏢 INFORMAÇÕES & REGRAS OFICIAIS DA EMPRESA:
${infoEmpresaTexto}

✅ SCRIPT POSITIVO (DIRETRIZES DE OURO — O QUE VOCÊ DEVE FALAR E ENFATIZAR):
${scriptPositivoTexto}

⛔ SCRIPT NEGATIVO (TRAVAS & PROIBIÇÕES ABSOLUTAS — O QUE VOCÊ NUNCA DEVE DIZER OU PROMETER):
${scriptNegativoTexto}

BASE DE MEMÓRIA & CONHECIMENTO DO ROBOZINHO (Informações aprendidas e orçamentos salvos da empresa):
${memoriaTexto}

CATÁLOGO DE PRODUTOS & SERVIÇOS DO PDV (Valores oficiais de tabela):
${produtosTexto}

HISTÓRICO RECENTE DA CONVERSA:
${historicoTexto || '(Sem mensagens anteriores)'}

ÚLTIMA MENSAGEM DO CLIENTE (O cliente enviou isso pra cá e está aguardando sua resposta):
"${clientMessage}"

IMPORTANTE: 
1. Respeite RIGOROSAMENTE o Script Negativo (não cometa nenhuma das proibições listadas).
2. Siga as orientações do Script Positivo e as Informações da Empresa.
3. Se a pergunta do cliente envolver produtos, serviços, orçamentos (ex: capacetes, cartões, banners, lonas, adesivos) ou dados da empresa (ex: horários, pagamentos, sinal de 50%), CONSULTE a Base de Memória e o Catálogo acima e já forneça os valores e condições corretos!

Gere as 3 sugestões de resposta que VOCÊ (atendente) vai enviar PARA O CLIENTE:`;
}

function extrairSugestoes(texto) {
  if (!texto) return null;
  const limpo = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    const json = JSON.parse(limpo);
    const suggestions = Array.isArray(json?.suggestions)
      ? json.suggestions.filter((s) => typeof s === 'string' && s.trim())
      : null;
    if (suggestions && suggestions.length > 0) return suggestions.slice(0, 3);
  } catch {
    // continua para regex
  }

  const match = limpo.match(/"suggestions"\s*:\s*\[([\s\S]*?)\]/);
  if (match) {
    try {
      const parsed = JSON.parse(`[${match[1]}]`);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(String).filter((s) => s.trim()).slice(0, 3);
      }
    } catch {
      // continua para fallback de linhas
    }
  }

  // Fallback caso venha em formato de lista: 1. ... 2. ... 3. ...
  const linhas = limpo
    .split('\n')
    .map((l) => l.replace(/^(\d+[\.\-\)]|\-|\*)\s*/, '').trim())
    .filter((l) => l.length > 5 && !l.toLowerCase().startsWith('sugest'));

  if (linhas.length >= 2) {
    return linhas.slice(0, 3);
  }

  return null;
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
  const attendantName = String(req.body?.attendantName || '').trim().slice(0, 100);
  const memoryBlocks = Array.isArray(req.body?.memoryBlocks) ? req.body.memoryBlocks : [];
  const products = Array.isArray(req.body?.products) ? req.body.products : [];
  const companyInfo = String(req.body?.companyInfo || '').slice(0, 3000);
  const positiveScript = String(req.body?.positiveScript || '').slice(0, 3000);
  const negativeScript = String(req.body?.negativeScript || '').slice(0, 3000);

  if (!clientMessage) {
    res.status(400).json({ error: 'Mensagem do cliente vazia.' });
    return;
  }

  let ultimoErro = null;
  for (const modelo of MODELOS) {
    try {
      const resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: montarPromptSuggest({ clientMessage, history, clientName, attendantName, memoryBlocks, products, companyInfo, positiveScript, negativeScript }) }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 500, responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(8 * 1000),
      });

      if (!resposta.ok) {
        const corpo = await resposta.text().catch(() => '');
        console.warn(`[ai/suggest-reply] Gemini (${modelo}) HTTP ${resposta.status}: ${corpo.slice(0, 200)}`);
        ultimoErro = `HTTP ${resposta.status}`;
        continue;
      }

      const json = await resposta.json();
      const textoFinal = (json?.candidates?.[0]?.content?.parts || []).map((p) => p?.text || '').join('').trim();
      const suggestions = textoFinal ? extrairSugestoes(textoFinal) : null;

      if (!suggestions || suggestions.length === 0) {
        console.warn(`[ai/suggest-reply] Gemini (${modelo}) respondeu sem sugestões utilizáveis.`);
        ultimoErro = 'Sem sugestões válidas';
        continue;
      }

      res.status(200).json({ suggestions });
      return;
    } catch (err) {
      console.warn(`[ai/suggest-reply] falha no modelo ${modelo}:`, err?.message || err);
      ultimoErro = err?.message;
    }
  }

  console.error('[ai/suggest-reply] Todos os modelos falharam:', ultimoErro);
  res.status(502).json({ error: 'Não foi possível gerar as sugestões agora.' });
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
