// Robozinho Rafa — motor de sugestões do assistente de IA de atendimento.
//
// PRINCÍPIO: observa -> aprende -> consulta o ERP -> prepara a resposta -> o
// atendente escolhe -> o atendente envia. Esta primeira versão NUNCA envia
// mensagem sozinha; só gera o texto sugerido. O envio real continua
// acontecendo pelo mesmo caminho que o ChatPanel já usa (collection
// `messages` do Firestore), então "concluído" aqui sempre significa
// "o atendente mandou de verdade", nunca "abriu/ignorou a sugestão".
//
// O gerador de sugestões abaixo é baseado em regras (heurística de palavras-
// chave) e consulta dados reais do ERP (Supabase: produtos, configuracoes).
// Está isolado nesta função de propósito -- no dia em que existir uma API de
// IA real (ex.: Anthropic) para plugar, é só trocar o corpo de
// `generateSuggestion` mantendo a mesma assinatura; o resto do app (tela,
// Firestore, histórico) não muda.

import { Timestamp } from 'firebase/firestore';

// --- Tipos ---

export type RobozinhoStatus = 'pending' | 'used' | 'edited' | 'ignored' | 'answered_manually' | 'stale';

export interface RobozinhoInteraction {
  id: string;
  companyId: string;
  leadId: string;
  phone: string;
  clientName: string;
  channel?: string;
  clientMessageText: string;
  clientMessageAt: Timestamp | string;
  suggestedText: string;
  suggestedAt: Timestamp | string;
  status: RobozinhoStatus;
  finalText?: string;
  finalSentAt?: Timestamp | string;
  actionByName?: string;
  createdAt: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface RobozinhoConfig {
  companyId: string;
  isActive: boolean;
  agentName: string;
  tone: 'formal' | 'amigavel' | 'direto';
  autoGenerateSuggestions: boolean;
  useKnowledgeBase: boolean;
  // Mostra ou esconde a bolinha de chat flutuante (assistente interno pra quem esta logado
  // testar o robo) — independente do isActive, que controla as sugestoes automaticas pros clientes
  showFloatingWidget: boolean;
  // Estrutura preparada para a futura integração de WhatsApp via QR Code —
  // desligada nesta versão, sem nenhuma lógica de envio implementada ainda.
  whatsappQrIntegration: {
    enabled: boolean;
    status: 'not_configured';
  };
  updatedAt?: Timestamp | string;
}

export const DEFAULT_ROBOZINHO_CONFIG: Omit<RobozinhoConfig, 'companyId'> = {
  isActive: true,
  agentName: 'Robozinho Rafa',
  tone: 'amigavel',
  autoGenerateSuggestions: true,
  useKnowledgeBase: true,
  showFloatingWidget: true,
  whatsappQrIntegration: { enabled: false, status: 'not_configured' },
};

// Linha simplificada de produto vinda da tabela `produtos` (Supabase), já
// mapeada — mesma fonte de dados usada pelo InventoryModule (Estoque).
export interface KnowledgeProduct {
  name: string;
  price: number;
  stock: number;
  tipoItem: 'produto' | 'material' | 'servico' | 'acabamento' | 'composto';
  controlaEstoque: boolean;
  isActive: boolean;
}

function normalize(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // remove pontuação (?, !, ., vírgula...) pra "aba?" bater com "aba" —
    // sem isso, qualquer pergunta com "?" no fim falhava na busca por palavra
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  transferencia: 'Transferência',
  boleto: 'Boleto',
  crediario: 'Crediário',
};

// Procura produtos cujo nome bate com o que o cliente mencionou. Tenta match
// por palavras principais (4+ chars) e depois por padrões de quantidade/medida
// (milheiro, pacote, resma, cento, etc). Só entra informação real da base —
// se não achar nada, a sugestão não cita preço/estoque nenhum (regra 5: nunca inventar).
function findMatchingProducts(clientMessage: string, produtos: KnowledgeProduct[]): KnowledgeProduct[] {
  const msg = normalize(clientMessage);
  // Palavras de 3+ letras (fora da stoplist) — busca parcial/tolerante, não
  // exige que o cliente digite o nome exatamente como está cadastrado.
  const words = msg.split(/\s+/).filter(w => w.length >= 3 && !STOPWORDS.has(w));

  // Match direto por nome (parcial, nos dois sentidos: palavra dentro do nome
  // do produto, ou o nome do produto contido na palavra digitada)
  let matches = produtos.filter(p => {
    const nome = normalize(p.name);
    return words.some(w => nome.includes(w) || w.includes(nome));
  });

  // Se encontrou matches diretos, retorna (até 4 — o suficiente pra oferecer
  // as variações sem virar uma lista enorme)
  if (matches.length > 0) return matches.slice(0, 4);

  // Match por quantidade/medida
  const temMilheiro = /milheiro|mil unidades/i.test(clientMessage);
  const temPacote = /pacote|cx\\.|caixa/i.test(clientMessage);
  const temResma = /resma|500/i.test(clientMessage);
  const temCento = /cento|100/i.test(clientMessage);

  if (temMilheiro || temPacote || temResma || temCento) {
    const itemTypeWords = words.filter(w => 
      /cartao|panfleto|folder|flyer|convite|tag|etiqueta|adesivo|brinde|envelope/i.test(w)
    );

    matches = produtos.filter(p => {
      const nome = normalize(p.name);
      const tipo = normalize(p.tipoItem || "");
      const temTipo = itemTypeWords.length === 0 || itemTypeWords.some(w => 
        nome.includes(w) || tipo.includes(w)
      );
      const temQuantidade = 
        (temMilheiro && (nome.includes("1000") || nome.includes("milheiro"))) ||
        (temPacote && (nome.includes("pacote") || nome.includes("cx"))) ||
        (temResma && (nome.includes("500") || nome.includes("resma"))) ||
        (temCento && (nome.includes("100") || nome.includes("cento")));
      if (itemTypeWords.length > 0) return temTipo && temQuantidade;
      return temQuantidade;
    });
  }

  return matches.slice(0, 3);
}

/**
 * Gera a sugestão de resposta para a última mensagem do cliente.
 * Consulta os dados atuais do ERP (produtos/estoque/pagamentos) recebidos
 * como parâmetro -- nunca usa valor "lembrado" de conversa antiga quando
 * existe informação atualizada disponível.
 */
export function generateSuggestion(params: {
  clientMessage: string;
  clientName?: string;
  produtos: KnowledgeProduct[];
  enabledPaymentMethods: string[];
}): string {
  const { clientMessage, clientName, produtos, enabledPaymentMethods } = params;
  const msg = normalize(clientMessage);
  const nome = clientName?.trim() ? clientName.trim().split(' ')[0] : '';
  const saud = nome ? `Olá, ${nome}! ` : 'Olá! ';

  const asksPrice = /(preco|preço|valor|quanto custa|orcamento|orçamento|quanto fica|quanto e|quanto é)/.test(msg);
  const asksStock = /(estoque|tem disponivel|disponivel|tem pronto|em estoque)/.test(msg);
  const asksDeadline = /(prazo|quando fica pronto|quando entrega|quanto tempo demora|demora quanto)/.test(msg);
  const asksPayment = /(pagamento|forma de pagar|pix|parcela|cartao|cartão|boleto)/.test(msg);
  const isGreeting = /^(oi|ola|olá|bom dia|boa tarde|boa noite|opa|eae|e ai)\b/.test(msg);

  const matches = findMatchingProducts(clientMessage, produtos.filter(p => p.isActive));

  if (asksPrice || asksStock) {
    if (matches.length > 0) {
      const linhas = matches.map(p => {
        const partes = [`*${p.name}*: ${formatBRL(p.price)}`];
        if (asksStock || p.controlaEstoque) {
          partes.push(p.controlaEstoque ? (p.stock > 0 ? `${p.stock} em estoque` : 'sem estoque no momento') : 'sob encomenda');
        }
        return partes.join(' — ');
      });
      return `${saud}consultei aqui no nosso sistema e encontrei:\n${linhas.join('\n')}\n\nQuer que eu já prepare um orçamento com essas quantidades?`;
    }
    return `${saud}posso te passar o valor certinho, só preciso confirmar o item exato (nome/medida/quantidade) pra consultar no nosso sistema — pode me confirmar os detalhes?`;
  }

  if (asksDeadline) {
    return `${saud}o prazo varia conforme a fila de produção do pedido. Vou confirmar a data certinha com a produção antes de te dar um prazo exato — só um instante.`;
  }

  if (asksPayment) {
    const labels = enabledPaymentMethods.map(m => PAYMENT_LABELS[m] || m).filter(Boolean);
    if (labels.length > 0) {
      return `${saud}aceitamos ${labels.join(', ')}. Se quiser, já posso preparar o orçamento com a forma de pagamento que preferir.`;
    }
    return `${saud}vou confirmar as formas de pagamento disponíveis e já te retorno.`;
  }

  if (isGreeting) {
    return `${saud}seja bem-vindo(a)! Como posso te ajudar hoje — orçamento, andamento de pedido ou outra dúvida?`;
  }

  return `${saud}obrigado pelo contato! Já vi sua mensagem e vou te responder com todos os detalhes em instantes.`;
}

// --- Chat de teste do Robozinho Rafa (bolha flutuante) ---
//
// Diferente de generateSuggestion (que prepara resposta pra ENVIAR a um
// cliente), esta função responde direto pra quem está logado no ERP
// (dono/atendente), testando o que o robô sabe. Só responde com dado real
// de produto/estoque (ver findMatchingProducts) — pra qualquer pergunta fora
// da base de materiais/produtos, avisa com transparência que ainda não tem
// acesso à internet, em vez de inventar uma resposta.
export function answerAssistantQuestion(params: {
  question: string;
  produtos: KnowledgeProduct[];
  userName?: string | null;
}): string {
  const { question, produtos, userName } = params;
  const msg = normalize(question);
  const primeiroNome = userName?.trim() ? userName.trim().split(' ')[0] : '';

  const asksPrice = /(preco|preço|valor|quanto custa|quanto fica|quanto e|quanto é)/.test(msg);
  const asksStock = /(estoque|tem disponivel|disponivel|tem pronto|em estoque|quantidade)/.test(msg);
  const isGreeting = /^(oi|ola|olá|bom dia|boa tarde|boa noite|opa|eae|e ai)\b/.test(msg);

  const matches = findMatchingProducts(question, produtos.filter(p => p.isActive));

  if (asksPrice || asksStock || matches.length > 0) {
    if (matches.length > 0) {
      const linhas = matches.map(p => {
        const partes = [`*${p.name}*: ${formatBRL(p.price)}`];
        if (p.controlaEstoque) {
          partes.push(p.stock > 0 ? `${p.stock} em estoque` : 'sem estoque no momento');
        } else {
          partes.push('sob encomenda');
        }
        return partes.join(' — ');
      });
      return `Consultei aqui no sistema:\n${linhas.join('\n')}`;
    }
    return 'Não achei esse item cadastrado no Estoque/Produtos. Confere o nome certinho? Posso procurar de novo.';
  }

  if (isGreeting) {
    return `${primeiroNome ? `Oi, ${primeiroNome}! ` : 'Oi! '}Pode perguntar sobre preço, estoque ou prazo de qualquer material/produto que eu consulto aqui no sistema.`;
  }

  return 'Por enquanto eu só consulto o que já está cadastrado aqui no sistema (produtos, materiais, estoque e preços) — ainda não tenho acesso à internet. Pergunta sobre algum material ou produto?';
}

// --- Chat avançado do Robozinho Rafa (widget com acesso a clientes e serviços) ---
//
// Versão com MEMÓRIA DE CONTEXTO: entende a conversa como um todo (não trata
// cada mensagem isoladamente), faz busca inteligente/parcial no estoque
// (incluindo variações do mesmo produto — ex: "Aba do Tanque" / "Aba Lateral"),
// identifica clientes mesmo sem frase-gatilho, evita repetir apresentação/
// fallback, e varia as respostas pra soar menos robótico.

// Palavrinhas curtas demais pra servirem de critério de busca sozinhas —
// evita que "das", "com", "que" etc. deem match em qualquer produto.
const STOPWORDS = new Set([
  'que', 'com', 'para', 'uma', 'um', 'do', 'da', 'de', 'os', 'as', 'no', 'na',
  'tem', 'ter', 'sim', 'nao', 'não', 'sao', 'são', 'foi', 'ela', 'ele', 'isso',
  'essa', 'esse', 'esta', 'este', 'aqui', 'meu', 'sua', 'seu', 'vou', 'voce',
  'você', 'quer', 'quero', 'como', 'qual', 'quando', 'onde', 'quem', 'mais',
  'menos', 'ainda', 'agora', 'entao', 'então', 'pois', 'mas', 'ou', 'e',
]);

/** Escolhe uma frase entre as opções, evitando repetir a última usada no histórico. */
function pickVariant(options: string[], recentBotHistory: string[] = []): string {
  const recentNormalized = recentBotHistory.slice(-4).map(h => normalize(h));
  const naoUsadas = options.filter(o => !recentNormalized.includes(normalize(o)));
  const pool = naoUsadas.length > 0 ? naoUsadas : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Palavras "significativas" (3+ letras, fora da stoplist) de um texto. */
function meaningfulWords(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w));
}

/** Maior prefixo de palavras em comum entre todos os nomes de produto informados. */
function commonWordPrefix(produtos: KnowledgeProduct[]): string[] {
  if (produtos.length === 0) return [];
  const listas = produtos.map(p => normalize(p.name).split(/\s+/));
  const primeira = listas[0];
  const prefixo: string[] = [];
  for (let i = 0; i < primeira.length; i++) {
    const palavra = primeira[i];
    if (listas.every(l => l[i] === palavra)) {
      prefixo.push(palavra);
    } else {
      break;
    }
  }
  return prefixo;
}

function formatProductAnswer(p: KnowledgeProduct): string {
  const partes = [`*${p.name}*: ${formatBRL(p.price)}`];
  if (p.controlaEstoque) {
    partes.push(p.stock > 0 ? `${p.stock} em estoque` : 'sem estoque no momento');
  } else {
    partes.push('sob encomenda');
  }
  return partes.join(' — ');
}

/**
 * Monta a pergunta de esclarecimento quando há mais de um produto batendo
 * com a busca — tenta agrupar como "variações do mesmo item" quando os
 * nomes compartilham um prefixo comum (ex: "Aba do Tanque" / "Aba Lateral"),
 * senão lista os nomes completos.
 */
function buildDisambiguationQuestion(matches: KnowledgeProduct[], recentBotHistory: string[]): string {
  const prefixo = commonWordPrefix(matches);
  const opener = pickVariant([
    'Temos algumas opções de',
    'Encontrei mais de uma opção de',
    'Achei algumas variações de',
  ], recentBotHistory);

  if (prefixo.length > 0 && prefixo.join(' ').length >= 3) {
    const baseTermo = prefixo.join(' ');
    const sufixos = matches.map(p => {
      const palavras = normalize(p.name).split(/\s+/);
      const resto = palavras.slice(prefixo.length).join(' ');
      return resto || p.name;
    });
    const listaSufixos = sufixos.length > 1
      ? `${sufixos.slice(0, -1).join(', ')} ou ${sufixos[sufixos.length - 1]}`
      : sufixos[0];
    return `${opener} ${baseTermo}: ${listaSufixos}. Qual você procura?`;
  }

  const nomes = matches.slice(0, 4).map(p => p.name);
  const listaNomes = nomes.length > 1
    ? `${nomes.slice(0, -1).join(', ')} ou ${nomes[nomes.length - 1]}`
    : nomes[0];
  return `Encontrei algumas opções: ${listaNomes}. Qual delas você procura?`;
}

// Contexto que o widget guarda entre uma mensagem e outra, pra conversa fazer
// sentido como um todo (item "memória e contexto da conversa").
export interface RobozinhoConversationContext {
  pendingProductCandidates?: KnowledgeProduct[] | null; // aguardando o cliente escolher a variação
  lastProduct?: KnowledgeProduct | null; // último produto efetivamente respondido (pra "quanto?", "e a lateral?" etc.)
  pendingClientCandidates?: any[] | null; // aguardando desambiguação de nome de cliente
  lastClient?: any | null;
}

const EMPTY_CONTEXT: RobozinhoConversationContext = {};

/**
 * Versão assíncrona que consulta Firestore (leads) e Supabase (vendas/serviços)
 * pra responder perguntas sobre clientes específicos, além de estoque/preço
 * com busca parcial e memória do que já foi perguntado na conversa.
 */
export async function answerAdvancedQuestion(params: {
  question: string;
  produtos: KnowledgeProduct[];
  userName?: string | null;
  firebaseLeads?: any[]; // Array de Lead do Firestore
  supabaseSales?: any[]; // Array de SaleOrder do Supabase
  /** Textos das últimas mensagens do próprio bot nesta conversa — usado só pra variar a resposta e não repetir. */
  recentBotHistory?: string[];
  /** Contexto acumulado da conversa (produto/cliente em discussão, opções pendentes). */
  context?: RobozinhoConversationContext;
}): Promise<{ text: string; context: RobozinhoConversationContext }> {
  const {
    question,
    produtos,
    firebaseLeads = [],
    supabaseSales = [],
    recentBotHistory = [],
    context = EMPTY_CONTEXT,
  } = params;
  const msg = normalize(question);
  const produtosAtivos = produtos.filter(p => p.isActive);

  const asksPrice = /(preco|preço|valor|quanto custa|quanto fica|quanto e|quanto é|quanto\??$)/.test(msg);
  const asksStock = /(estoque|tem disponivel|disponivel|tem pronto|em estoque|quantidade|tem\??$)/.test(msg);
  const asksClientService = /(ultimo servico|ultima servico|ultimo pedido|ultima pedido|quando foi|que dia|quando fez|quando fizemos|cliente.*servico|servico.*cliente|comprou|conhece)/i.test(msg);
  const isGreeting = /^(oi|ola|bom dia|boa tarde|boa noite|opa|eae|e ai)\b/.test(msg);
  const isReferentialOther = /(a outra|o outro|outra opcao|outro modelo)/.test(msg);
  const isReferentialSame = /^(essa|esse|essa mesma|esse mesmo|esse aqui|essa aqui|esse ai|essa ai)\??$/.test(msg);

  // --- 1) Se há opções de produto pendentes de escolha, tenta resolver com a resposta curta ---
  if (context.pendingProductCandidates && context.pendingProductCandidates.length > 0) {
    const candidatos = context.pendingProductCandidates;

    if (isReferentialOther && candidatos.length === 2) {
      const escolhido = candidatos.find(c => c !== context.lastProduct) || candidatos[0];
      return {
        text: formatProductAnswer(escolhido),
        context: { ...context, pendingProductCandidates: null, lastProduct: escolhido },
      };
    }

    const palavrasResposta = meaningfulWords(question);
    const restritos = palavrasResposta.length > 0
      ? candidatos.filter(c => {
          const nome = normalize(c.name);
          return palavrasResposta.some(w => nome.includes(w));
        })
      : [];

    if (restritos.length === 1) {
      return {
        text: formatProductAnswer(restritos[0]),
        context: { ...context, pendingProductCandidates: null, lastProduct: restritos[0] },
      };
    }
    if (restritos.length > 1) {
      return {
        text: buildDisambiguationQuestion(restritos, recentBotHistory),
        context: { ...context, pendingProductCandidates: restritos },
      };
    }
    // Não bateu com nenhuma opção pendente — segue o fluxo normal (pode ser um assunto novo)
  }

  // --- 2) "quanto?" / "esse mesmo" sem produto novo mencionado → reusa o produto em discussão ---
  if ((asksPrice || asksStock || isReferentialSame) && context.lastProduct) {
    const semProdutoNovo = meaningfulWords(question).every(w => !normalize(context.lastProduct!.name).includes(w))
      || meaningfulWords(question).length === 0;
    if (semProdutoNovo) {
      return {
        text: formatProductAnswer(context.lastProduct),
        context: { ...context, pendingProductCandidates: null },
      };
    }
  }

  // --- 3) Pergunta sobre cliente/pessoa — reconhece nome mesmo sem frase-gatilho ---
  const palavrasMsg = meaningfulWords(question);
  const clientesPorNome = firebaseLeads.filter(l => {
    const nome = normalize(l.fullName || l.contactName || l.whatsappName || '');
    const nomeWords = nome.split(/\s+/);
    return palavrasMsg.some(w => nomeWords.some(nw => nw === w || nw.startsWith(w) || w.startsWith(nw)));
  });

  if ((asksClientService || clientesPorNome.length > 0) && firebaseLeads.length > 0) {
    if (clientesPorNome.length > 1) {
      return {
        text: 'Encontrei mais de uma pessoa com esse nome. Você sabe o sobrenome ou algum outro detalhe pra eu identificar a pessoa certa?',
        context: { ...context, pendingClientCandidates: clientesPorNome },
      };
    }
    if (clientesPorNome.length === 1) {
      const lead = clientesPorNome[0];
      const salesDoCliente = supabaseSales.filter(s => s.customerId === lead.id || normalize(s.customerName || '').includes(normalize(lead.fullName || '')));

      if (salesDoCliente.length > 0) {
        const sorted = [...salesDoCliente].sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        const ultimo = sorted[0];
        const dataServico = ultimo.createdAt ? new Date(ultimo.createdAt).toLocaleDateString('pt-BR') : 'data desconhecida';
        return {
          text: `O último serviço de ${lead.fullName} foi em ${dataServico}. Status: ${ultimo.serviceStatus || ultimo.status || 'desconhecido'}.`,
          context: { ...context, lastClient: lead, pendingClientCandidates: null },
        };
      }
      return {
        text: `Encontrei ${lead.fullName} aqui no sistema, mas não tem nenhum serviço ou pedido registrado ainda.`,
        context: { ...context, lastClient: lead, pendingClientCandidates: null },
      };
    }
    if (asksClientService) {
      return {
        text: 'Não encontrei ninguém com esse nome no sistema. Confere se digitou certinho?',
        context,
      };
    }
  }

  // --- 4) Pergunta sobre produto/estoque — busca inteligente com variações ---
  if (asksPrice || asksStock || palavrasMsg.length > 0) {
    const matches = findMatchingProducts(question, produtosAtivos);

    if (matches.length === 1) {
      return {
        text: formatProductAnswer(matches[0]),
        context: { ...context, pendingProductCandidates: null, lastProduct: matches[0] },
      };
    }
    if (matches.length > 1) {
      return {
        text: buildDisambiguationQuestion(matches, recentBotHistory),
        context: { ...context, pendingProductCandidates: matches },
      };
    }
    if (asksPrice || asksStock) {
      return {
        text: pickVariant([
          'Não consegui localizar esse produto no estoque. Se você me explicar um pouco melhor qual modelo está procurando, eu tento encontrar para você.',
          'Não encontrei nada parecido cadastrado. Consegue me dar mais detalhes do item?',
        ], recentBotHistory),
        context,
      };
    }
  }

  // --- 5) Saudação — variação, sem repetir a apresentação inicial ---
  if (isGreeting) {
    return {
      text: pickVariant([
        'Oi! Como posso te ajudar?',
        'Opa! Me conta o que você precisa.',
        'Oi! Pronto pra ajudar — o que você precisa?',
      ], recentBotHistory),
      context,
    };
  }

  // --- 6) Fallback inteligente — usa o contexto antes de dizer que não entendeu ---
  if (context.lastProduct) {
    return {
      text: `Você está perguntando sobre *${context.lastProduct.name}* ou sobre outra coisa?`,
      context,
    };
  }

  return {
    text: pickVariant([
      'Não consegui entender exatamente o que você quis dizer. Pode me explicar um pouco melhor?',
      'Não peguei bem essa. Pode reformular pra eu te ajudar certinho?',
    ], recentBotHistory),
    context,
  };
}
