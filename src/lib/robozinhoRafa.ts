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

// Procura produtos cujo nome bate com o que o cliente mencionou. Só entra
// aqui informação que realmente existe na base — se não achar nada, a
// sugestão não cita preço/estoque nenhum (ver regra 5: nunca inventar).
function findMatchingProducts(clientMessage: string, produtos: KnowledgeProduct[]): KnowledgeProduct[] {
  const msg = normalize(clientMessage);
  const words = msg.split(/\s+/).filter(w => w.length >= 4);
  if (words.length === 0) return [];
  return produtos.filter(p => {
    const nome = normalize(p.name);
    return words.some(w => nome.includes(w));
  }).slice(0, 3);
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
