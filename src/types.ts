import { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  stock: number;
  unitType?: 'unit' | 'm2' | 'etiqueta' | 'metro';
  tipoItem?: 'produto' | 'material' | 'servico' | 'acabamento' | 'composto';
  larguraRolo?: number;
  controlaEstoque?: boolean;
  valorMinimo?: number;
}

// Consumo de matéria-prima: uma variação de produto (ver ProductVariation) pode consumir
// 0, 1 ou várias matérias-primas já cadastradas no Estoque (produtos.id).
export type TipoConsumoMaterial = 'fixo' | 'quantidade' | 'medida';

export interface MaterialConsumptionRule {
  id: string; // id da linha em variacao_consumos (ou id temporário local antes de salvar)
  materialProdutoId: string; // aponta pra um produto/insumo já cadastrado no Estoque
  materialNome?: string; // so pra exibicao, nao persistido isolado (denormalizado na leitura)
  tipoConsumo: TipoConsumoMaterial;
  quantidade: number; // fixo/quantidade: consumo por unidade vendida. medida: consumo por m2 (fator, normalmente 1)
  unidade?: string; // denormalizado da unidade do material, so pra exibicao
}

export interface ProductVariation {
  id: string;
  produtoId: string;
  name: string;
  salePrice: number;
  costPrice?: number;
  isActive: boolean;
  ordem?: number;
  consumos: MaterialConsumptionRule[]; // "Consome matéria-prima: Não" == consumos vazio
}

// Snapshot do consumo de matéria-prima GRAVADO no item da venda (carrinho), já resolvido
// (para 'medida', a quantidade ja veio multiplicada pela area calculada no momento da adição).
// Guardado junto do item pra permitir baixa e estorno exatos, mesmo se a variação for editada depois.
export interface MaterialConsumptionSnapshot {
  materialProdutoId: string;
  materialNome?: string;
  tipoConsumo: TipoConsumoMaterial;
  quantidade: number; // consumo por unidade do item (multiplicado por quantity na baixa, igual consumoEstoque)
  unidade?: string;
}

export interface SaleOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  dimensions?: string; // L x H
  area?: number;
  consumoEstoque?: number; // quantidade real baixada do estoque (m2 ou metro linear, dependendo do produto)
  descontoValor?: number; // desconto em R$ aplicado a esse item especifico (nao altera o preco cadastrado do produto)
  precoOriginal?: number; // preco antes do desconto, guardado para auditoria/exibicao
  observacao?: string; // observacao livre por item do carrinho
  variationId?: string; // id da variação escolhida (produto_variacoes), quando o produto tem variações
  variationName?: string; // nome da variação, pra exibir "Produto / Variação" no carrinho e no historico
  materialConsumption?: MaterialConsumptionSnapshot[]; // consumo de matéria-prima da variação escolhida (pode ser [] = nenhuma)
}

export interface PaymentEntry {
  method: 'pix' | 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'transferencia' | 'boleto' | 'crediario';
  value: number;
  date: string;
  installments?: number;
  feePercent?: number;
}

export interface SaleOrder {
  id: string;
  companyId: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  cpfCnpj?: string; // opcional -- "CPF na nota", informado na hora de finalizar sem precisar de cadastro completo
  items: SaleOrderItem[];
  total: number;
  discountValue?: number;
  downPayment?: number;
  receivedValue?: number;
  paymentMethod?: 'dinheiro'|'pix'|'cartao_credito'|'cartao_debito'|'misto';
  payments?: PaymentEntry[];
  pendingPaymentMethod?: string;
  status: 'pending' | 'completed' | 'canceled';
  serviceStatus?: 'pedido_recebido' | 'aguardando_arte' | 'arte_em_desenvolvimento' | 'aguardando_aprovacao' | 'producao' | 'acabamento' | 'aguardando_retirada' | 'produto_entregue';
  statusHistory?: { status: string; changedAt: string }[];
  responsavel?: string;
  orcamentoId?: string;
  contratoId?: string;
  createdAt: string;
  updatedAt?: string;
  scheduledFor?: string;
  deletedAt?: string;
  observacoes?: string;
}

export type UserRole = 'admin' | 'gerente' | 'atendente' | 'caixa' | 'vendedor' | 'designer' | 'operador' | 'comissao';

export interface BaseEntity {
  id: string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  createdBy?: string;
  updatedBy?: string;
  companyId?: string;
  status?: string;
}

export interface Company extends BaseEntity {
  name: string;
  shortName?: string;
  slug: string;
  icon?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  cnpj?: string;
  address?: {
    line?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  phone?: string;
  email?: string;
  isActive: boolean;
  activeModules: string[]; // ['crm', 'messages', 'pos', 'real_estate', ...]
}

export interface ModuleCrudPermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export type ModulePermissions = Record<string, ModuleCrudPermission>;

export interface AppUser extends BaseEntity {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  isAdmin: boolean;
  isActive: boolean;
  lastLoginAt?: Timestamp | string;
  allowedCompanies?: string[]; // IDs of companies this user can access
  allowedTabs?: string[];      // IDs of tabs this user can access
  allowedPdvTabs?: string[];   // IDs das abas horizontais de dentro do PDV que esse usuario pode ver (Venda, Historico, Estoque, etc)
  allowedActions?: string[];   // Specific action permissions allowed
  modulePermissions?: ModulePermissions; // Permissoes granulares (ver/criar/editar/excluir) por modulo
  colaboradorId?: string;      // Se role === 'comissao', vincula esse usuario a um registro em "colaboradores" (area de Comissoes)
}

export interface Lead extends BaseEntity {
  fullName: string;         // Nome Real/Documental -- nunca sobrescrito sozinho por mensagem recebida
  whatsappName?: string;    // Nome exatamente como veio do perfil/mensagem do WhatsApp (ou outro canal)
  contactName?: string;     // Nome como o atendente salvou na conversa/agenda
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  cpfCnpj?: string;
  city?: string;
  state?: string;
  priority?: 'baixa' | 'media' | 'alta';
  responsibleUserId?: string;
  funnelId?: string;
  funnelStageId?: string;
  sourceType?: string;
  lastMessageText?: string;
  estimatedValue?: number;
  tags?: string[];
  tracking?: {
    utmSource?: string;
    utmCampaign?: string;
    utmMedium?: string;
    utmContent?: string;
    utmTerm?: string;
    adId?: string;
    formId?: string;
    campaignName?: string;
    adName?: string;
  };
  capturedAt?: Timestamp | string;
  waitingSince?: Timestamp | string;
  lastInteractionAt?: Timestamp | string;
  // Usados pelo menu de opções do balão de Mensagens (ver MessagesSidebarPopup.tsx):
  // marcar como lida/não lida, silenciar notificações e arquivar em lote.
  unread?: boolean;
  muted?: boolean;
  archived?: boolean;
}

export interface Funnel extends BaseEntity {
  name: string;
  description?: string;
  color?: string;
  isDefault: boolean;
  isActive: boolean;
  order?: number;
  allowedUserIds?: string[]; // IDs of users who can access this funnel
  allowedCompanyIds?: string[]; // IDs of companies this funnel belongs to
  permissions?: {
    canEdit?: string[]; // user IDs
    canDelete?: string[]; // user IDs
  };
}

export interface FunnelStage extends BaseEntity {
  funnelId: string;
  name: string;
  order: number;
  color?: string;
  isInitial?: boolean;
  isFinal?: boolean;
  isLost?: boolean;
  slaMinutes?: number;
  automations?: {
    createTask?: boolean;
    taskTitle?: string;
    sendMessage?: boolean;
    messageTemplateId?: string;
    assignToUserId?: string;
    requiredFields?: string[]; // list of property names missing in Lead
  };
}

export type WidgetType = 'stat_card' | 'list' | 'table' | 'bar_chart' | 'line_chart' | 'pie_chart' | 'funnel_chart' | 'comparison' | 'summary';

export interface DashboardWidget extends BaseEntity {
  title: string;
  subtitle?: string;
  type: WidgetType;
  icon?: string;
  color?: string;
  size: 'sm' | 'md' | 'lg' | 'full';
  gridPos: { x: number, y: number, w: number, h: number };
  dataSource: {
    collection: string;
    filters: Record<string, any>;
    calculation?: 'count' | 'sum' | 'avg' | 'max' | 'min' | 'rate';
    targetField?: string;
    groupBy?: string;
  };
  period?: 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'inherit';
  displayMode?: 'numeric' | 'progress' | 'percentage';
  showComparison?: boolean;
  autoRefresh?: boolean;
  linkTo?: string; // Route to navigate on click
}

export interface DashboardLayout extends BaseEntity {
  name: string;
  userId?: string; // If specific to a user
  role?: UserRole; // If specific to a role
  isDefault?: boolean;
  theme?: {
    backgroundColor?: string;
    cardColor?: string;
    titleColor?: string;
    textColor?: string;
    borderRadius?: string;
    shadow?: string;
    spacing?: string;
    bgImage?: string;
    primaryColors: string[]; // Up to 5 colors
  };
  widgets: string[]; // IDs of DashboardWidget
}

export interface Conversation extends BaseEntity {
  leadId?: string;
  contactId?: string;
  channelAccountId: string;
  channelType: 'whatsapp' | 'instagram' | 'facebook' | 'email';
  assignedUserId?: string;
  subject?: string;
  lastMessageAt?: Timestamp | string;
  waitingSince?: Timestamp | string; // Start timestamp of client's unanswered message
  slaStatus?: 'ok' | 'attention' | 'late' | 'critical';
  priority?: 'baixa' | 'media' | 'alta';
  isClosed?: boolean;
}

export interface Message extends BaseEntity {
  conversationId: string;
  senderType: 'customer' | 'agent' | 'system' | 'bot';
  senderUserId?: string;
  contentType: 'text' | 'image' | 'audio' | 'video' | 'file' | 'location' | 'contact' | 'note';
  text?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number; // for audio/video
  isInternalNote?: boolean;
  transcription?: {
    text: string;
    isAutomatic: boolean;
    isVisible: boolean;
  };
}

export interface SavedMessageTemplate extends BaseEntity {
  title: string;
  content: string;
  category: 'saudacao' | 'primeiro_atendimento' | 'cobranca' | 'pos_venda' | 'confirmacao' | 'reagendamento' | 'fechamento' | 'apresentacao_orcamento';
}

export interface RolePermission extends BaseEntity {
  role: UserRole;
  permissions: {
    canStartNote: boolean;
    canSendSavedMessage: boolean;
    canCreateCard: boolean;
    canAddTask: boolean;
    canStartPosSale: boolean;
    canMoveLead: boolean;
    canViewCustomerData: boolean;
    canViewAttachments: boolean;
    canTranscribeAudio: boolean;
    canDeleteInternalMessages: boolean;
    canEditSavedMessages: boolean;
  };
}

export interface CompanyConfig {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  endereco: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  cidadeForo?: string;
}

export interface PdfCustomization {
  primaryColor: string; // default #dc2626 (red)
  secondaryColor: string; // default #000000 (black)
  backgroundColor: string; // default #ffffff (white)
  logoPosition: 'left' | 'center' | 'right';
  logoScale: number; // percentage (e.g., 100)
  fontFamily: 'sans' | 'mono' | 'serif' | 'display';
  headerText: string;
  footerText: string;
  showWatermark: boolean;
}

export interface MerchandiseItem {
  id: string;
  code?: string;
  description: string;
  costPrice: number; // Uso interno - NUNCA exibido para o cliente
  salePrice: number; // Valor unitário de venda
  stock: number; // Quantidade em estoque
  unit: 'un' | 'm' | 'm2'; // Unidade de venda (Unidade, Metro linear, Metro quadrado)
  quantity: number; // Quantidade vendida/orçada (ex: 3.5)
  totalPrice: number; // quantity * salePrice
  category?: string;
}

export interface SocialChannelTemplate {
  id: string;
  channel: 'whatsapp' | 'instagram' | 'facebook' | 'telegram';
  type: 'orcamento' | 'confirmacao_aceite' | 'pagamento_confirmado' | 'aviso_entrega';
  title: string;
  messageText: string;
}

export interface InventoryItem extends BaseEntity {
  name: string;
  code?: string;
  category?: string;
  unit: 'un' | 'kg' | 'm' | 'm2' | 'rolo' | 'litro' | 'etiqueta';
  salePrice: number;
  costPrice?: number;
  currentStock: number;
  minStock: number;
  isService: boolean;
  isActive: boolean;
  provider?: string;
  tipoItem?: 'produto' | 'material' | 'servico' | 'acabamento' | 'composto';
  controlaEstoque?: boolean;
  larguraRolo?: number;
  estoqueMaximo?: number;
  localizacao?: string;
  descricao?: string;
  valorMinimo?: number;
}

export interface PrintingService extends BaseEntity {
  clientId?: string;
  leadId?: string;
  serviceNumber: string;
  title: string;
  description?: string;
  amount: number;
  dueDate?: Timestamp | string;
  status: 'orcamento' | 'aguardando_aprovacao' | 'aprovado' | 'producao' | 'finalizacao' | 'pronto' | 'entregue';
}

export interface Payment extends BaseEntity {
  paymentType: 'pos_sale' | 'service';
  saleId?: string;
  serviceId?: string;
  amount: number;
  paymentMethod: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'transferencia';
  paidAt?: Timestamp | string;
}

export interface CashRegister extends BaseEntity {
  operatorId: string;
  openedAt: Timestamp | string;
  closedAt?: Timestamp | string;
  openingBalance: number;
  expectedBalance?: number;
  actualBalance?: number;
  difference?: number;
  isOpen: boolean;
}

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  assignedUserId?: string;
  dueAt?: Timestamp | string;
  completedAt?: Timestamp | string;
  priority?: 'baixa' | 'media' | 'alta';
  relatedType?: 'lead' | 'conversation' | 'sale' | 'service';
  relatedId?: string;
}

export interface MetaAdAccount extends BaseEntity {
  fbAccountId: string;
  name: string;
  currency: string;
  timezone: string;
  accountStatus: string;
  balance?: number;
  spendToday?: number;
  spendWeek?: number;
  spendMonth?: number;
}

export interface MetaCampaign extends BaseEntity {
  accountId: string;
  fbCampaignId: string;
  name: string;
  objective: string;
  status: string;
  budget?: number;
  budgetType: 'DAILY' | 'LIFETIME';
  buyingType?: string;
  startTime?: string;
  endTime?: string;
  results?: number;
  costPerResult?: number;
  reach?: number;
  impressions?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
}

export interface MetaAdSet extends BaseEntity {
  campaignId: string;
  fbAdSetId: string;
  name: string;
  status: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  startTime?: string;
  endTime?: string;
  targeting?: {
    locations?: string[];
    ageMin?: number;
    ageMax?: number;
    genders?: number[];
    interests?: string[];
  };
  optimizationGoal?: string;
}

export interface ContractAcceptance {
  clientName: string;
  clientCpfCnpj: string;
  clientPhone: string;
  ipAddress: string;
  acceptedAt: string | Timestamp;
  contractHash: string;
  contractSnapshot: string;
  verificationCodeUsed: string;
  userAgent?: string;
  verificationMethod: 'whatsapp_sms_code';
}

export interface ServiceContract extends BaseEntity {
  budgetId?: string;
  companyId: string;
  clientName: string;
  clientCpfCnpj: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress?: string;
  serviceTitle: string;
  serviceDescription: string;
  totalAmount: number;
  downPaymentAmount: number;
  deliveryDays: number;
  contractText: string;
  contractHash: string;
  status: 'orcamento' | 'contrato_gerado' | 'codigo_enviado' | 'aceito' | 'entrada_paga' | 'cancelado';
  verificationCode?: string;
  codeSentAt?: string | Timestamp;
  acceptance?: ContractAcceptance;
  pixPaymentStatus?: 'pending' | 'paid';
  pixPaidAt?: string | Timestamp;
}

export interface MetaAd extends BaseEntity {
  adSetId: string;
  fbAdId: string;
  name: string;
  status: string;
  creative?: {
    title?: string;
    body?: string;
    imageUrl?: string;
    linkUrl?: string;
    callToAction?: string;
  };
  spend?: number;
  impressions?: number;
  clicks?: number;
  results?: number;
}

export interface OrcamentoPagamento {
  metodo: 'pix' | 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'cartao_parcelado' | 'transferencia' | 'boleto' | 'outra';
  metodoOutraLabel?: string;
  valor: number | '';
  parcelas?: number;
  valorParcela?: number;
  dataVencimento?: string;
  primeiroVencimento?: string;
  intervaloDias?: number;
}

export interface Orcamento {
  id: string;
  numero: string;
  documentType?: 'orcamento' | 'contrato';
  clienteId?: string;
  customerName?: string;
  cpfCnpj?: string;
  phone?: string;
  address?: string;
  responsavel?: string;
  items: SaleOrderItem[];
  desconto: number;
  total: number;
  observacoes?: string;
  prazoProducao?: string;
  prazoDias?: number;
  prazoTipo?: 'uteis' | 'corridos';
  prazoGatilho?: 'aprovacao' | 'pagamento_entrada' | 'aprovacao_arte' | 'entrega_material' | 'personalizado';
  prazoDataPrevista?: string;
  formasPagamento?: OrcamentoPagamento[];
  politicaPagamento?: 'sem_entrada' | 'entrada_fixa' | 'entrada_percentual' | 'pagamento_integral' | 'entrada_restante_entrega' | 'entrada_parcelas';
  entradaObrigatoria?: boolean;
  pagamentoPosteriorAutorizado?: boolean;
  pagamentoPosteriorData?: string;
  pagamentoPosteriorDias?: number;
  pagamentoPosteriorCondicao?: string;
  pagamentoPosteriorResponsavel?: string;
  telefoneAlternativo?: string;
  multaPercentual?: number;
  jurosModo?: 'mensal' | 'diario';
  jurosPercentual?: number;
  diasTolerancia?: number;
  prazoPagamentoTexto?: string;
  condicaoEntregaTexto?: string;
  formaPagamentoTexto?: string;
  multaJurosTexto?: string;
  garantiaTexto?: string;
  politicaCancelamentoTexto?: string;
  entradaPercentual?: number;
  entradaValor?: number;
  validade?: string;
  status: 'rascunho' | 'enviado' | 'em_espera' | 'aprovado' | 'em_producao' | 'concluido' | 'recusado' | 'cancelado' | 'expirado' | 'encerrado';
  vendaId?: string;
  contratoId?: string;
  clausulasContratoTexto?: string;
  aprovadoEm?: string;
  aprovadoPor?: string;
  createdAt: string;
  deletedAt?: string;
}

export type ContratoStatus = 'rascunho' | 'aguardando_aceite' | 'aceito' | 'aguardando_assinatura_empresa' | 'aguardando_assinatura_cliente' | 'assinado' | 'em_execucao' | 'concluido' | 'cancelado' | 'encerrado';

export interface Contrato {
  id: string;
  numero: string;
  versao: number;
  contratoAnteriorId?: string;
  clienteId?: string;
  customerName: string;
  cpfCnpj?: string;
  phone?: string;
  address?: string;
  responsavel?: string;
  vendaId?: string;
  orcamentoId?: string;
  items: SaleOrderItem[];
  desconto: number;
  total: number;
  formaPagamentoTexto?: string;
  prazoTexto?: string;
  prazoDias?: number;
  prazoTipo?: 'uteis' | 'corridos';
  prazoGatilho?: 'aprovacao' | 'pagamento_entrada' | 'aprovacao_arte' | 'entrega_material' | 'personalizado';
  prazoDataPrevista?: string;
  formasPagamento?: OrcamentoPagamento[];
  politicaPagamento?: 'sem_entrada' | 'entrada_fixa' | 'entrada_percentual' | 'pagamento_integral' | 'entrada_restante_entrega' | 'entrada_parcelas';
  entradaObrigatoria?: boolean;
  entradaPercentual?: number;
  entradaValor?: number;
  pagamentoPosteriorAutorizado?: boolean;
  pagamentoPosteriorData?: string;
  pagamentoPosteriorDias?: number;
  pagamentoPosteriorCondicao?: string;
  pagamentoPosteriorResponsavel?: string;
  multaPercentual?: number;
  jurosModo?: 'mensal' | 'diario';
  jurosPercentual?: number;
  diasTolerancia?: number;
  prazoPagamentoTexto?: string;
  condicaoEntregaTexto?: string;
  multaJurosTexto?: string;
  garantiaTexto?: string;
  politicaCancelamentoTexto?: string;
  validade?: string;
  observacoes?: string;
  textoContrato?: string;
  status: ContratoStatus;
  rg?: string;
  signedAt?: string;
  signerIp?: string;
  signerUserAgent?: string;
  documentHash?: string;
  signatureMethod?: string;
  empresaSignedAt?: string;
  empresaSignedBy?: string;
  pdfUrl?: string;
  serviceStatus?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}
