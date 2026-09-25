// Aprendizado automático do Robozinho Rafa (FASE 1).
//
// Observa, em segundo plano, cada mensagem NOVA de um cliente INDIVIDUAL (nunca de grupo)
// chegando pelo webhook do WhatsApp e, quando identifica informação comercial relevante,
// registra o conhecimento em `robozinho_knowledge` (tipo='empresa', status='approved') -- a
// MESMA tabela usada pelo "Conhecimento da Empresa" na aba Memória do Robozinho Rafa
// (RobozinhoRafaModule.tsx). Entra JÁ APROVADO (sem revisão manual do atendente) e fica
// disponível pro Robozinho usar nas próprias sugestões de resposta a partir daí. Não cria
// tabela nova, não cria endpoint novo, não mexe no botão "Sugerir resposta".
//
// Nunca bloqueia o webhook: é sempre chamado com `waitUntil(...)` a partir de
// whatsapp-webhook.js, depois da mensagem já estar gravada em crm_messages. Se falhar por
// qualquer motivo (sem GEMINI_API_KEY configurada, erro de rede, JSON inválido etc.), só loga
// no console e não afeta o recebimento/gravação da mensagem.
//
// O QUE ESTA FASE 1 FAZ: analisa a mensagem do cliente sozinha (sem esperar a resposta do
// atendente). A FASE 2 (aprender do PAR pergunta-do-cliente + resposta-do-atendente) fica pra
// depois, combinada previamente.
//
// Preço/estoque/disponibilidade NUNCA viram "verdade fixa" aqui -- o que é salvo é só a
// INTENÇÃO/ASSUNTO (ex: "cliente pergunta preço de envelopamento"); o valor atual sempre
// continua vindo ao vivo do PDV/orçamento (tabela `produtos`), nunca desta memória.

import { SUPABASE_URL, COMPANY_ID, supabaseHeaders } from './whatsapp-config.js';

const MODELO = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// Mensagens triviais nunca viram aprendizado -- filtradas aqui, ANTES de qualquer chamada ao
// Gemini, pra economizar tokens (o pedido é explícito nesse ponto).
const TRIVIAIS = new Set([
  'oi', 'ola', 'oii', 'oiii', 'oie', 'bom dia', 'boa tarde', 'boa noite',
  'obrigado', 'obrigada', 'obg', 'vlw', 'valeu', 'ok', 'okay', 'okey', 'blz', 'beleza',
  'ta bom', 'tudo bem', 'entendi', 'certo', 'show', 'top', 'otimo', 'perfeito',
  'combinado', 'fechado', 'de nada', 'por nada', 'ate mais', 'ate logo', 'tchau',
  'flw', 'blza', 'pode ser', 'isso', 'isso mesmo', 'exato', 'sim', 'nao', 'legal',
]);

function normalizar(txt) {
  return String(txt || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[!?.,;]+$/g, '')
    .trim();
}

// Mensagem "sem conteúdo pra aprender": trivial da lista acima, ou curta demais (emoji solto,
// "kk", "top demais" etc.) pra carregar informação comercial de verdade.
function mensagemTrivial(texto) {
  const limpo = normalizar(texto);
  if (!limpo || limpo.length < 4) return true;
  return TRIVIAIS.has(limpo);
}

const INSTRUCAO = `Você observa mensagens que clientes mandam via WhatsApp para uma empresa, procurando
identificar se HÁ informação comercial relevante o suficiente pra guardar numa base de
conhecimento de atendimento (produto, serviço, preço, prazo, pagamento, objeção do cliente ou
processo de atendimento).

Analise só a MENSAGEM ATUAL DO CLIENTE abaixo.

Se a mensagem NÃO tiver relevância comercial (saudação, agradecimento, confirmação genérica,
"ok", conversa social, mensagem incompreensível), responda SOMENTE:
{"relevante": false}

Se tiver relevância, responda SOMENTE em JSON, no formato exato:
{"relevante": true, "setor": "...", "categoria": "...", "intencao": "...", "assunto": "...", "palavrasChave": ["...", "..."], "resumo": "..."}

Onde:
- "setor": área/departamento do negócio relacionada à mensagem (ex: "Envelopamento", "Adesivos", "Atendimento").
- "categoria": tipo da informação (ex: "Preço", "Prazo", "Serviço", "Pagamento", "Objeção", "Processo").
- "intencao": intenção do cliente, em poucas palavras, snake_case (ex: "consultar_preco", "servico_disponivel").
- "assunto": frase bem curta resumindo do que se trata (vira o título do registro).
- "palavrasChave": de 2 a 5 palavras-chave em português, minúsculas e sem acento.
- "resumo": resumo objetivo e curto da mensagem do cliente, SEM inventar nenhum dado (preço, prazo, estoque) que não foi dito por ele.

NÃO invente preço, prazo, estoque, desconto ou qualquer valor. Responda SOMENTE o JSON, sem nenhum texto fora dele.`;

async function classificarMensagem({ apiKey, texto }) {
  const resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${INSTRUCAO}\n\nMENSAGEM ATUAL DO CLIENTE:\n${texto}` }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(20 * 1000),
  });
  if (!resposta.ok) {
    console.error('[aprendizado] Gemini HTTP', resposta.status, (await resposta.text().catch(() => '')).slice(0, 300));
    return null;
  }
  const json = await resposta.json();
  const textoFinal = (json?.candidates?.[0]?.content?.parts || []).map((p) => p?.text || '').join('').trim();
  if (!textoFinal) return null;
  let obj;
  try {
    obj = JSON.parse(textoFinal.replace(/```json|```/gi, '').trim());
  } catch {
    return null;
  }
  if (!obj || obj.relevante !== true) return null;
  return {
    setor: String(obj.setor || '').trim().slice(0, 80),
    categoria: String(obj.categoria || '').trim().slice(0, 80),
    intencao: String(obj.intencao || '').trim().slice(0, 80),
    assunto: String(obj.assunto || '').trim().slice(0, 140),
    resumo: String(obj.resumo || '').trim().slice(0, 500),
    palavrasChave: Array.isArray(obj.palavrasChave)
      ? obj.palavrasChave.filter((p) => typeof p === 'string' && p.trim()).map((p) => normalizar(p)).slice(0, 6)
      : [],
  };
}

// Só os últimos conhecimentos (sugeridos + já aprovados) -- suficiente pra checar duplicidade
// sem carregar a tabela inteira a cada mensagem.
async function buscarConhecimentoRecente() {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/robozinho_knowledge?company_id=eq.${COMPANY_ID}&tipo=in.(sugerido,empresa)&select=campos&order=created_at.desc&limit=300`,
      { headers: supabaseHeaders() },
    );
    if (!r.ok) return [];
    const linhas = await r.json();
    return Array.isArray(linhas) ? linhas : [];
  } catch (err) {
    console.error('[aprendizado] falha ao consultar conhecimento existente (segue sem checar duplicidade):', err);
    return [];
  }
}

// Considera "o mesmo conhecimento" quando setor/categoria batem E pelo menos 2 (ou metade)
// das palavras-chave já existem -- evita virar uma entrada nova a cada mensagem parecida.
function jaExisteConhecimentoSemelhante(existentes, nova) {
  const chavesNovas = new Set(nova.palavrasChave);
  if (chavesNovas.size === 0) return false;
  const setorNovo = normalizar(nova.setor);
  const categoriaNovo = normalizar(nova.categoria);
  return existentes.some((linha) => {
    const campos = linha?.campos || {};
    const setorExistente = normalizar(campos.setor);
    const categoriaExistente = normalizar(campos.categoria);
    if (setorNovo && setorExistente && setorNovo !== setorExistente) return false;
    if (categoriaNovo && categoriaExistente && categoriaNovo !== categoriaExistente) return false;
    const chavesExistentes = Array.isArray(campos.palavrasChave) ? campos.palavrasChave.map(normalizar) : [];
    if (chavesExistentes.length === 0) return false;
    const interseccao = chavesExistentes.filter((c) => chavesNovas.has(c));
    return interseccao.length >= 2 || interseccao.length >= Math.ceil(chavesExistentes.length / 2);
  });
}

// Ponto de entrada -- chamado pelo webhook, sempre em segundo plano (waitUntil), só pra
// mensagem RECEBIDA de cliente individual (nunca de grupo, nunca mensagem minha).
export async function analisarMensagemParaAprendizado({ phone, text, leadId }) {
  try {
    if (!text || mensagemTrivial(text)) return;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) return; // sem chave configurada: aprendizado automático fica so desligado, nao quebra nada

    const classificacao = await classificarMensagem({ apiKey, texto: text.slice(0, 2000) });
    if (!classificacao) return;

    const existentes = await buscarConhecimentoRecente();
    if (jaExisteConhecimentoSemelhante(existentes, classificacao)) {
      console.log('[aprendizado] conhecimento semelhante ja existe -- nao duplicado.');
      return;
    }

    const r = await fetch(`${SUPABASE_URL}/rest/v1/robozinho_knowledge`, {
      method: 'POST',
      headers: supabaseHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        company_id: COMPANY_ID,
        tipo: 'empresa',
        status: 'approved',
        titulo: classificacao.assunto || null,
        conteudo: classificacao.resumo || text.slice(0, 500),
        campos: {
          origem: 'auto_aprendizado',
          setor: classificacao.setor || null,
          categoria: classificacao.categoria || null,
          intencao: classificacao.intencao || null,
          palavrasChave: classificacao.palavrasChave,
          leadId: leadId || null,
          telefone: phone || null,
          perguntaCliente: text.slice(0, 500),
        },
        created_by_name: 'Robozinho (aprendizado automático - aprovado)',
      }),
    });
    if (!r.ok) {
      console.error('[aprendizado] falha ao salvar aprendizado sugerido:', r.status, await r.text().catch(() => ''));
      return;
    }
    console.log('[aprendizado] novo conhecimento aprendido automaticamente e ja aprovado.');
  } catch (err) {
    // Nunca deixa o aprendizado derrubar o webhook -- só loga.
    console.error('[aprendizado] erro inesperado ao analisar mensagem:', err);
  }
}
