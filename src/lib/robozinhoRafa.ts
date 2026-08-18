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
  const words = msg.split(/\s+/).filter(w => w.length >= 4);
  
  // Match direto por nome
  let matches = produtos.filter(p => {
    const nome = normalize(p.name);
    return words.some(w => nome.includes(w));
  });

  // Se encontrou matches diretos, retorna (até 3)
  if (matches.length > 0) return matches.slice(0, 3);

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
// Versão assíncrona que consulta Firestore (leads) e Supabase (vendas/serviços)
// para responder perguntas sobre clientes específicos, último serviço, etc.
// Simula "digitação" com delay de 3 segundos antes de entregar a resposta completa.
export async function answerAdvancedQuestion(params: {
  question: string;
  produtos: KnowledgeProduct[];
  userName?: string | null;
  firebaseLeads?: any[]; // Array de Lead do Firestore
  supabaseSales?: any[]; // Array de SaleOrder do Supabase
}): Promise<{ isTyping: boolean; text: string }> {
  const { question, produtos, userName, firebaseLeads = [], supabaseSales = [] } = params;
  const msg = normalize(question);

  // Padrões de perguntas sobre cliente/serviço
  const asksClientService = /(ultimo servico|última serviço|ultimo pedido|última pedido|quando foi|que dia|quando fez|quando fizemos|coimbra|cliente.*serviço|serviço.*cliente)/i.test(msg);
  const asksPrice = /(preco|preço|valor|quanto custa|quanto fica|quanto e|quanto é)/.test(msg);
  const asksStock = /(estoque|tem disponivel|disponivel|tem pronto|em estoque|quantidade)/.test(msg);

  // Tenta extrair nome do cliente da pergunta (ex: "coimbra" → busca por cliente com "coimbra" no nome)
  const clienteMatch = question.match(/\b([\w\s]{3,})\b\s*(serviço|serviço|pedido|última|ultimo|quando)/i);
  const clienteNome = clienteMatch ? clienteMatch[1].trim() : null;

  // Se pergunta sobre cliente/serviço e temos dados, busca
  if (asksClientService && (firebaseLeads.length > 0 || supabaseSales.length > 0)) {
    // Normaliza e busca cliente por nome (case-insensitive, acentuação)
    const leads = firebaseLeads.filter(l => {
      const nome = normalize(l.fullName || l.contactName || l.whatsappName || '');
      if (!clienteNome) return false;
      return nome.includes(normalize(clienteNome));
    });

    if (leads.length > 0) {
      const lead = leads[0];
      // Busca vendas/serviços deste cliente
      const salesDoCliente = supabaseSales.filter(s => s.customerId === lead.id || normalize(s.customerName || '').includes(normalize(lead.fullName || '')));

      if (salesDoCliente.length > 0) {
        // Ordena por data (mais recente primeiro)
        const sorted = salesDoCliente.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        const ultimo = sorted[0];
        const dataServico = ultimo.createdAt ? new Date(ultimo.createdAt).toLocaleDateString('pt-BR') : 'data desconhecida';
        const texto = `O último serviço de ${lead.fullName} foi em ${dataServico}. Status: ${ultimo.serviceStatus || ultimo.status || 'desconhecido'}.`;
        
        return { isTyping: true, text: texto };
      }

      return { isTyping: false, text: `Encontrei o cliente ${lead.fullName}, mas não há serviços/pedidos registrados.` };
    }

    // Cliente não encontrado
    if (clienteNome) {
      return { isTyping: false, text: `Não encontrei um cliente com nome "${clienteNome}" no sistema.` };
    }
  }

  // Pergunta sobre produtos (usa lógica síncrona anterior)
  if (asksPrice || asksStock) {
    const matches = findMatchingProducts(question, produtos.filter(p => p.isActive));
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
      const texto = `Consultei aqui no sistema:\n${linhas.join('\n')}`;
      return { isTyping: false, text: texto };
    }
    return { isTyping: false, text: 'Não achei esse item cadastrado no Estoque/Produtos. Confere o nome certinho?' };
  }

  // Fallback
  return { isTyping: false, text: 'Pode perguntar sobre preço, estoque, último serviço de um cliente ou qualquer outra coisa que eu consulto aqui no sistema.' };
}
