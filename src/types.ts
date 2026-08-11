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
  scheduledFor?: string;
  deletedAt?: string;
  observacoes?: string;
}

export type UserRole = 'admin' | 'gerente' | 'atendente' | 'caixa' | 'vendedor' | 'designer' | 'operador';

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
  allowedActions?: string[];   // Specific action permissions allowed
  modulePermissions?: ModulePermissions; // Permissoes granulares (ver/criar/editar/excluir) por modulo
}

export interface Lead extends BaseEntity {
  fullName: string;
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
  category?: 'substrato' | 'tinta' | 'acabamento' | 'diversos';
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
  status: 'rascunho' | 'enviado' | 'aprovado' | 'em_producao' | 'concluido' | 'recusado' | 'cancelado' | 'expirado' | 'encerrado';
  vendaId?: string;
  clausulasContratoTexto?: string;
  aprovadoEm?: string;
  aprovadoPor?: string;
  createdAt: string;
}
