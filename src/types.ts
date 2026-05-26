import { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  stock: number;
  unitType?: 'unit' | 'm2';
}

export interface SaleOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  dimensions?: string; // L x H
  area?: number;
}

export interface SaleOrder {
  id: string;
  companyId: string;
  customerId?: string;
  customerName?: string;
  items: SaleOrderItem[];
  total: number;
  downPayment?: number;
  paymentMethod?: 'dinheiro'|'pix'|'cartao_credito'|'cartao_debito';
  status: 'pending' | 'completed' | 'canceled';
  createdAt: string;
  scheduledFor?: string;
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

export interface AppUser extends BaseEntity {
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  isAdmin: boolean;
  isActive: boolean;
  lastLoginAt?: Timestamp | string;
  allowedCompanies?: string[]; // IDs of companies this user can access
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
    canStartRealEstateSale: boolean;
    canMoveLead: boolean;
    canViewCustomerData: boolean;
    canViewAttachments: boolean;
    canTranscribeAudio: boolean;
    canDeleteInternalMessages: boolean;
    canEditSavedMessages: boolean;
  };
}

export interface RealEstateEnterprise extends BaseEntity {
  name: string;
  description?: string;
  location?: string;
  city?: string;
  state?: string;
  isActive: boolean;
}

export interface Lot extends BaseEntity {
  enterpriseId: string;
  blockName?: string;
  lotNumber: string;
  areaM2?: number;
  cashPrice?: number;
  financedPrice?: number;
  status: 'disponivel' | 'reservado' | 'vendido' | 'bloqueado';
}

export interface RealEstateSale extends BaseEntity {
  leadId?: string;
  contactId?: string;
  lotId: string;
  enterpriseId: string;
  sellerUserId: string;
  totalValue: number;
  downPayment?: number;
  installmentsCount?: number;
  installmentsValue?: number;
  status: 'rascunho' | 'aguardando_entrada' | 'entrada_confirmada' | 'contrato_gerado' | 'em_pagamento' | 'quitada';
  validationLog?: string[];
  
  // Buyer Details
  buyerName?: string;
  buyerRg?: string;
  buyerCpf?: string;
  buyerMaritalStatus?: string;
  buyerBirthDate?: string;
  buyerAddress?: string;
  buyerAddressNumber?: string;
  buyerNeighborhood?: string;
  buyerZipCode?: string;
  buyerContacts?: string[];
  
  // Sale Specifics
  lotName?: string;
  blockName?: string;
  enterpriseName?: string;
  installmentsDueDate?: string;
  sellerName?: string;
}

export interface InventoryItem extends BaseEntity {
  name: string;
  code?: string;
  category?: 'substrato' | 'tinta' | 'acabamento' | 'diversos';
  unit: 'un' | 'kg' | 'm' | 'm2' | 'rolo' | 'litro';
  salePrice: number;
  costPrice?: number;
  currentStock: number;
  minStock: number;
  isService: boolean;
  isActive: boolean;
  provider?: string;
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
  paymentType: 'real_estate_sale' | 'installment' | 'pos_sale' | 'service';
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
