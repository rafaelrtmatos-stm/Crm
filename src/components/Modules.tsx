import { AppContext } from '../AppContext';
import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { ContractApprovalModule } from './ContractApprovalModule';
import { ContractSignatureOtpPanel } from './ContractSignatureOtpPanel';
import { ContractAcceptanceDetailsModal } from './ContractAcceptanceDetailsModal';
import { 
  TrendingUp, 
  LayoutGrid,
  Columns3,
  Square,
  Clock, 
  MessageSquare, 
  Plus, 
  Search, 
  Filter, 
  LayoutDashboard, 
  ShoppingBag, 
  ShoppingCart,
  Home, 
  Users, 
  FileText, 
  Wrench, 
  Building2, 
  Settings,
  ArrowRight,
  Briefcase,
  Layers,
  Zap,
  Bot,
  Globe,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock3,
  BarChart2,
  PieChart as PieChartIcon,
  HardDrive,
  RefreshCw,
  Calendar,
  QrCode,
  CreditCard,
  UserPlus,
  ArrowLeft,
  Calculator,
  Smartphone,
  Banknote,
  Check,
  CheckSquare,
  FileSignature,
  Ban,
  Package,
  PlusCircle,
  BarChart3,
  Printer,
  X,
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  Mic,
  Image as ImageIcon,
  Video,
  File,
  MapPin,
  Phone,
  StickyNote,
  ListTodo,
  FileJson,
  Link,
  Send,
  MoreHorizontal,
  Paperclip,
  Sparkles,
  Sun,
  Moon,
  Trash2,
  Pencil,
  Upload,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  ListFilter,
  Link2,
  Percent,
  Wifi,
  FileSpreadsheet,
  ClipboardList,
  CalendarClock,
  Share2,
  Star,
  Tag,
  AtSign,
  History,
  FileAudio,
  GripVertical,
  Maximize2,
  Minimize2,
  Move,
  Palette,
  Layout,
  Activity,
  UserCheck,
  UserX,
  Target,
  Trophy,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  List,
  Table as TableIcon,
  Eye,
  ExternalLink,
  PlayCircle,
  EyeOff,
  Copy,
  Trash,
  Settings2,
  ChevronDown,
  ChevronUp,
  Download,
  Share,
  CalendarDays,
  Timer,
  Box,
  Save,
  LogOut,
  PlusSquare,
  ShieldCheck,
  Lock,
  Loader2,
  Wallet,
  ClipboardCheck,
  DollarSign
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Company, 
  AppUser, 
  Lead, 
  Funnel, 
  FunnelStage, 
  Product, 
  SaleOrder, 
  SaleOrderItem,
  PaymentEntry,
  Orcamento,
  Contrato,
  ContratoStatus,
  OrcamentoPagamento,
  InventoryItem,
  PrintingService,
  DashboardWidget,
  DashboardLayout,
  WidgetType,
  ModuleCrudPermission,
  ModulePermissions,
  ExtraCost
} from '../types';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line
} from 'recharts';
import { 
  SectionHeader, 
  Button, 
  GlassCard, 
  Badge, 
  DataTable, 
  Input, 
  Modal, 
  Drawer,
  ChartErrorBoundary,
  PhoneInputBR,
  CpfCnpjInput,
  RgInput,
  cn 
} from './SharedUI';
import { collection, query, where, onSnapshot, orderBy, Timestamp, addDoc, doc, updateDoc, getDocs, setDoc, limit, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { supabase } from '../supabase';
import { showAlert, showConfirm, showPrompt } from '../lib/notify';
import { buildPixPayload } from '../lib/pix';
import { renderReceiptCanvas, downloadCanvasAsPng, downloadCanvasAsPdf, COMPANY_CONTACT, CompanyContactInfo } from '../lib/receipt';
import { renderOrcamentoCanvas } from '../lib/orcamentoDoc';
import { exportClientesXlsx, parseClientesXlsx, exportProdutosXlsx, parseProdutosXlsx, exportVendasXlsx, parseVendasXlsx, exportFichaClienteXlsx } from '../lib/spreadsheet';
import { downloadContratoPdf, type AuditStamp } from '../lib/contratoPdf';
import { uploadContratoPdfAssinado } from '../lib/contratoPdfStorage';
import { buildContratoClausulasTexto } from '../lib/contratoTemplate';
import { OFFICIAL_COMPANY, PUBLIC_SIGN_ORIGIN, getContractSignatureLink } from '../lib/companyIdentity';
import { signContractByCompany, generateSignatureId } from '../lib/otpUtils';
import { transcribeAudioMessage } from '../lib/audioTranscription';
import { generateSuggestion, type KnowledgeProduct } from '../lib/robozinhoRafa';
import { validateCpfCnpj } from '../lib/validators';
import { buscarClienteDuplicado, montarPayloadMesclagem } from '../lib/clienteDedupe';
import { custoTotalDaNota, calcularLucroLiquido, somaCustosExtras, isMaterialLonaAdesivo } from '../lib/lucro';
import { format } from 'date-fns';

// Formata uma data com fallback seguro — evita "RangeError: Invalid time value"
// quando vendas importadas de planilha tem um createdAt malformado ou vazio.
function safeFormat(value: any, fmt: string, fallback: string = '—'): string {
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : format(d, fmt);
}

// Converte o valor de um <input type="datetime-local"> (hora LOCAL, sem fuso) pra um ISO
// completo (com fuso) antes de gravar num campo timestamptz. Sem isso, o Postgres grava a
// hora digitada como se já fosse UTC — em Manaus/Pará (UTC-3), um agendamento de "10:00"
// virava "13:00" no banco e voltava exibido como "07:00" na tela (a hora antiga "grudando").
function localDatetimeToIso(value: string | undefined | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Converte uma data guardada (ISO/timestamptz, em UTC) pro formato que o <input
// type="datetime-local"> espera, já na hora LOCAL — evita mostrar a hora errada ao reabrir
// pra editar um agendamento.
function isoToLocalDatetimeInput(value: any): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

// Mapeia uma linha da tabela 'usuarios' (Supabase) pro formato AppUser.
// Usuarios comuns vivem no Supabase; so o admin master continua no Firebase.
function mapUsuarioRow(row: any): AppUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password || undefined,
    role: row.role || 'atendente',
    isAdmin: !!row.is_admin,
    isActive: row.is_active !== false,
    allowedTabs: Array.isArray(row.allowed_tabs) ? row.allowed_tabs : undefined,
    allowedPdvTabs: Array.isArray(row.allowed_pdv_tabs) ? row.allowed_pdv_tabs : undefined,
    allowedActions: Array.isArray(row.allowed_actions) ? row.allowed_actions : undefined,
    modulePermissions: row.module_permissions && typeof row.module_permissions === 'object' ? row.module_permissions : undefined,
    colaboradorId: row.colaborador_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as AppUser;
}

// Permissoes granulares padrao (visualizar/criar/editar/excluir) por perfil.
// O admin sempre tem acesso total independente disso (checado a parte via isAdmin).
const ALL_MODULE_IDS = ['dashboard', 'pos', 'messages', 'clientes_espera', 'contacts', 'crm', 'production', 'inventory', 'settings', 'robozinho_rafa', 'comissoes'];
function fullAccess(): ModuleCrudPermission { return { view: true, create: true, edit: true, delete: true }; }
function noAccess(): ModuleCrudPermission { return { view: false, create: false, edit: false, delete: false }; }
function viewOnly(): ModuleCrudPermission { return { view: true, create: false, edit: false, delete: false }; }
function viewCreateEdit(): ModuleCrudPermission { return { view: true, create: true, edit: true, delete: false }; }
function viewEdit(): ModuleCrudPermission { return { view: true, create: false, edit: true, delete: false }; }

function getDefaultModulePermissions(role: string): ModulePermissions {
  const empty: ModulePermissions = {};
  ALL_MODULE_IDS.forEach(m => { empty[m] = noAccess(); });

  switch (role) {
    case 'admin':
      ALL_MODULE_IDS.forEach(m => { empty[m] = fullAccess(); });
      return empty;
    case 'gerente':
      // Acesso amplo, exceto Configuracoes (critico)
      ALL_MODULE_IDS.forEach(m => { empty[m] = m === 'settings' ? viewOnly() : fullAccess(); });
      return empty;
    case 'atendente':
      empty.dashboard = viewOnly();
      empty.pos = viewCreateEdit();
      empty.messages = viewCreateEdit();
      empty.clientes_espera = viewEdit();
      empty.contacts = viewCreateEdit();
      empty.robozinho_rafa = viewCreateEdit();
      return empty;
    case 'operador': // Producao
      empty.dashboard = viewOnly();
      empty.pos = viewOnly();
      empty.production = viewCreateEdit();
      return empty;
    case 'vendedor':
      empty.dashboard = viewOnly();
      empty.contacts = viewCreateEdit();
      empty.messages = viewCreateEdit();
      empty.clientes_espera = viewEdit();
      empty.crm = viewCreateEdit();
      return empty;
    case 'designer':
      empty.dashboard = viewOnly();
      empty.pos = viewOnly();
      empty.production = viewCreateEdit();
      return empty;
    case 'caixa':
      empty.dashboard = viewOnly();
      empty.pos = fullAccess();
      return empty;
    default:
      empty.dashboard = viewOnly();
      return empty;
  }
}

// Nome de arquivo padronizado pra recibos/orcamentos baixados: NomeDoCliente_dd-MM-yyyy
function buildFileName(prefix: string, customerName: string | undefined, dateValue: any, ext: string): string {
  const safeName = (customerName || 'Cliente')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'Cliente';
  const dateStr = safeFormat(dateValue || new Date().toISOString(), 'dd-MM-yyyy', format(new Date(), 'dd-MM-yyyy'));
  return `${prefix}_${safeName}_${dateStr}.${ext}`;
}

import { 
  calculateSLA, 
  extractTracking, 
  canAccessModule 
} from '../lib/businessLogic';

// --- DASHBOARD ---
const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: 'revenue-main',
    title: 'Faturamento Consolidado',
    subtitle: 'Visão Geral do Ecossistema',
    type: 'line_chart',
    icon: 'TrendingUp',
    size: 'lg',
    gridPos: { x: 0, y: 0, w: 2, h: 2 },
    dataSource: { collection: 'saleOrders', filters: {}, calculation: 'sum' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'list-servicos',
    title: 'Serviços Recentes',
    subtitle: 'Acompanhamento de Atividades',
    type: 'list',
    icon: 'Wrench',
    size: 'md',
    gridPos: { x: 2, y: 0, w: 1, h: 2 },
    dataSource: { collection: 'services', filters: { status: 'active' } },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ordem-servicos',
    title: 'Notas Abertas (O.S.)',
    subtitle: 'Gestão de Produção Ativa',
    type: 'list',
    icon: 'ListTodo',
    size: 'md',
    gridPos: { x: 0, y: 2, w: 1, h: 2 },
    dataSource: { collection: 'services', filters: { status: 'pendente' } },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'list-pendentes-financeiro',
    title: 'Pendentes (Entradas)',
    subtitle: 'Saldo a Receber / Entradas Pagas',
    type: 'list',
    icon: 'Clock',
    size: 'lg',
    gridPos: { x: 1, y: 2, w: 2, h: 2 },
    dataSource: { collection: 'saleOrders', filters: { financialStatus: 'partial' } },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// Converte uma linha da tabela "vendas" (Supabase) para o formato SaleOrder usado no app
// --- Mapeamento Funil/Etapas/Leads (migrados do Firestore pro Supabase) ---
const mapFunnelRow = (row: any): Funnel => ({
  id: row.id,
  companyId: row.company_id,
  name: row.name,
  description: row.description || undefined,
  color: row.color || undefined,
  isDefault: !!row.is_default,
  isActive: row.is_active !== false,
  order: row.order ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapFunnelStageRow = (row: any): FunnelStage => ({
  id: row.id,
  funnelId: row.funnel_id,
  name: row.name,
  order: row.order ?? 0,
  color: row.color || undefined,
  isInitial: !!row.is_initial,
  isFinal: !!row.is_final,
  isLost: !!row.is_lost,
  slaMinutes: row.sla_minutes ?? undefined,
  automations: row.automations || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapLeadRow = (row: any): Lead => ({
  id: row.id,
  companyId: row.company_id,
  fullName: row.full_name,
  whatsappName: row.whatsapp_name || undefined,
  contactName: row.contact_name || undefined,
  firstName: row.first_name || undefined,
  lastName: row.last_name || undefined,
  phone: row.phone,
  email: row.email || undefined,
  cpfCnpj: row.cpf_cnpj || undefined,
  city: row.city || undefined,
  state: row.state || undefined,
  priority: row.priority || undefined,
  responsibleUserId: row.responsible_user_id || undefined,
  funnelId: row.funnel_id || undefined,
  funnelStageId: row.funnel_stage_id || undefined,
  sourceType: row.source_type || undefined,
  lastMessageText: row.last_message_text || undefined,
  photoUrl: row.photo_url || undefined,
  lastMessageDirection: row.last_message_direction || undefined,
  // Previa da lista de chats: SEMPRE a ultima mensagem do cliente (nunca a que o
  // atendente mandou) -- ver add_last_client_message.sql / App.tsx processIncomingMessage
  lastClientMessageText: row.last_client_message_text || undefined,
  lastClientMessageAt: row.last_client_message_at || undefined,
  waitingSince: row.waiting_since || undefined,
  estimatedValue: row.estimated_value !== null ? Number(row.estimated_value) : undefined,
  tags: row.tags || undefined,
  tracking: row.tracking || undefined,
  status: row.status || undefined,
  autoTranscribe: row.auto_transcribe !== false,
  muted: !!row.muted,
  unread: !!row.unread,
  archived: !!row.archived,
  createdBy: row.created_by || undefined,
  updatedBy: row.updated_by || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
} as Lead);

// Data/hora de uma mensagem podem vir de duas fontes diferentes: Timestamp do
// Firestore (dados antigos/outras telas) OU string ISO do Supabase (crm_messages,
// fonte atual do chat) -- o chat so tratava o caso Timestamp e ficava com o
// horario/data em branco pra toda mensagem vinda do Supabase. Aceita os dois.
const parseMsgDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const mapCrmMessageRow = (row: any): any => ({
  id: row.id,
  companyId: row.company_id,
  leadId: row.lead_id || undefined,
  phone: row.phone,
  text: row.text || undefined,
  direction: row.direction,
  isNote: !!row.is_note,
  senderName: row.sender_name || undefined,
  channel: row.channel || 'WhatsApp',
  mediaUrl: row.media_url || undefined,
  fileName: row.file_name || undefined,
  mediaContentType: row.content_type || undefined,
  transcription: row.transcription || undefined,
  versions: row.versions || undefined,
  currentVersionIndex: row.current_version_index ?? undefined,
  lastEditedAt: row.last_edited_at || undefined,
  lastEditedBy: row.last_edited_by || undefined,
  createdAt: row.created_at,
});

const mapVendaRow = (row: any): SaleOrder => ({
  id: row.id,
  companyId: row.company_id,
  customerId: row.cliente_id,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  cpfCnpj: row.cpf_cnpj || undefined,
  items: row.items || [],
  total: Number(row.total) || 0,
  discountValue: row.discount_value ? Number(row.discount_value) : undefined,
  downPayment: row.down_payment !== null ? Number(row.down_payment) : undefined,
  receivedValue: row.received_value !== null ? Number(row.received_value) : undefined,
  paymentMethod: row.payment_method,
  payments: Array.isArray(row.payments) ? row.payments : undefined,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at || undefined,
  scheduledFor: row.scheduled_for || undefined,
  deletedAt: row.deleted_at || undefined,
  observacoes: row.observacoes || undefined,
  serviceStatus: row.service_status || undefined,
  statusHistory: Array.isArray(row.status_history) ? row.status_history : [],
  responsavel: row.responsavel || undefined,
  orcamentoId: row.orcamento_id || undefined,
  contratoId: row.contrato_id || undefined,
  extraCosts: Array.isArray(row.custos_extras) ? row.custos_extras : [],
} as SaleOrder);

const mapOrcamentoRow = (row: any): Orcamento => ({
  id: row.id,
  numero: row.numero,
  documentType: row.document_type === 'contrato' ? 'contrato' : 'orcamento',
  clienteId: row.cliente_id || undefined,
  customerName: row.customer_name || undefined,
  cpfCnpj: row.cpf_cnpj || undefined,
  phone: row.phone || undefined,
  address: row.address || undefined,
  responsavel: row.responsavel || undefined,
  items: row.items || [],
  desconto: Number(row.desconto) || 0,
  total: Number(row.total) || 0,
  observacoes: row.observacoes || undefined,
  prazoProducao: row.prazo_producao || undefined,
  prazoDias: row.prazo_dias !== null ? Number(row.prazo_dias) : undefined,
  prazoTipo: row.prazo_tipo || 'uteis',
  prazoGatilho: row.prazo_gatilho || 'aprovacao',
  prazoDataPrevista: row.prazo_data_prevista || undefined,
  formasPagamento: Array.isArray(row.formas_pagamento) ? row.formas_pagamento : [],
  politicaPagamento: row.politica_pagamento || 'entrada_restante_entrega',
  entradaObrigatoria: !!row.entrada_obrigatoria,
  pagamentoPosteriorAutorizado: !!row.pagamento_posterior_autorizado,
  pagamentoPosteriorData: row.pagamento_posterior_data || undefined,
  pagamentoPosteriorDias: row.pagamento_posterior_dias !== null ? Number(row.pagamento_posterior_dias) : undefined,
  pagamentoPosteriorCondicao: row.pagamento_posterior_condicao || undefined,
  pagamentoPosteriorResponsavel: row.pagamento_posterior_responsavel || undefined,
  telefoneAlternativo: row.telefone_alternativo || undefined,
  multaPercentual: row.multa_percentual !== null ? Number(row.multa_percentual) : 2,
  jurosModo: row.juros_modo || 'mensal',
  jurosPercentual: row.juros_percentual !== null ? Number(row.juros_percentual) : 1,
  diasTolerancia: row.dias_tolerancia !== null ? Number(row.dias_tolerancia) : 0,
  prazoPagamentoTexto: row.prazo_pagamento_texto || undefined,
  condicaoEntregaTexto: row.condicao_entrega_texto || undefined,
  formaPagamentoTexto: row.forma_pagamento_texto || undefined,
  multaJurosTexto: row.multa_juros_texto || undefined,
  garantiaTexto: row.garantia_texto || undefined,
  politicaCancelamentoTexto: row.politica_cancelamento_texto || undefined,
  entradaPercentual: row.entrada_percentual !== null ? Number(row.entrada_percentual) : undefined,
  entradaValor: row.entrada_valor !== null ? Number(row.entrada_valor) : undefined,
  validade: row.validade || undefined,
  status: row.status,
  vendaId: row.venda_id || undefined,
  clausulasContratoTexto: row.clausulas_contrato_texto || undefined,
  aprovadoEm: row.aprovado_em || undefined,
  aprovadoPor: row.aprovado_por || undefined,
  createdAt: row.created_at,
  deletedAt: row.deleted_at || undefined,
});

const mapContratoRow = (row: any): Contrato => ({
  id: row.id,
  numero: row.numero,
  versao: row.versao || 1,
  contratoAnteriorId: row.contrato_anterior_id || undefined,
  clienteId: row.cliente_id || undefined,
  customerName: row.customer_name || '',
  cpfCnpj: row.cpf_cnpj || undefined,
  phone: row.phone || undefined,
  address: row.address || undefined,
  vendaId: row.venda_id || undefined,
  orcamentoId: row.orcamento_id || undefined,
  items: row.items || [],
  desconto: Number(row.desconto) || 0,
  total: Number(row.total) || 0,
  formaPagamentoTexto: row.forma_pagamento_texto || undefined,
  prazoTexto: row.prazo_texto || undefined,
  prazoDias: row.prazo_dias !== null && row.prazo_dias !== undefined ? Number(row.prazo_dias) : undefined,
  prazoTipo: row.prazo_tipo || 'uteis',
  prazoGatilho: row.prazo_gatilho || 'pagamento_entrada',
  prazoDataPrevista: row.prazo_data_prevista || undefined,
  formasPagamento: Array.isArray(row.formas_pagamento) ? row.formas_pagamento : [],
  politicaPagamento: row.politica_pagamento || 'entrada_restante_entrega',
  entradaObrigatoria: !!row.entrada_obrigatoria,
  entradaPercentual: row.entrada_percentual !== null && row.entrada_percentual !== undefined ? Number(row.entrada_percentual) : undefined,
  entradaValor: row.entrada_valor !== null && row.entrada_valor !== undefined ? Number(row.entrada_valor) : undefined,
  pagamentoPosteriorAutorizado: !!row.pagamento_posterior_autorizado,
  pagamentoPosteriorData: row.pagamento_posterior_data || undefined,
  pagamentoPosteriorDias: row.pagamento_posterior_dias !== null && row.pagamento_posterior_dias !== undefined ? Number(row.pagamento_posterior_dias) : undefined,
  pagamentoPosteriorCondicao: row.pagamento_posterior_condicao || undefined,
  pagamentoPosteriorResponsavel: row.pagamento_posterior_responsavel || undefined,
  multaPercentual: row.multa_percentual !== null && row.multa_percentual !== undefined ? Number(row.multa_percentual) : undefined,
  jurosModo: row.juros_modo || 'mensal',
  jurosPercentual: row.juros_percentual !== null && row.juros_percentual !== undefined ? Number(row.juros_percentual) : undefined,
  diasTolerancia: row.dias_tolerancia !== null && row.dias_tolerancia !== undefined ? Number(row.dias_tolerancia) : 0,
  prazoPagamentoTexto: row.prazo_pagamento_texto || undefined,
  condicaoEntregaTexto: row.condicao_entrega_texto || undefined,
  multaJurosTexto: row.multa_juros_texto || undefined,
  garantiaTexto: row.garantia_texto || undefined,
  politicaCancelamentoTexto: row.politica_cancelamento_texto || undefined,
  validade: row.validade || undefined,
  observacoes: row.observacoes || undefined,
  textoContrato: row.texto_contrato || undefined,
  status: row.status || 'rascunho',
  rg: row.rg || undefined,
  signedAt: row.signed_at || undefined,
  signerIp: row.signer_ip || undefined,
  signerLocation: row.signer_location || undefined,
  signerUserAgent: row.signer_user_agent || undefined,
  documentHash: row.document_hash || undefined,
  signatureMethod: row.signature_method || undefined,
  contratanteSignatureId: row.contratante_signature_id || undefined,
  empresaSignedAt: row.empresa_signed_at || undefined,
  empresaSignedBy: row.empresa_signed_by || undefined,
  empresaUserAgent: row.empresa_user_agent || undefined,
  contratadoSignatureId: row.contratado_signature_id || undefined,
  pdfUrl: row.pdf_url || undefined,
  responsavel: row.responsavel || undefined,
  serviceStatus: row.service_status || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at || undefined,
  deletedAt: row.deleted_at || undefined,
});

const PAYMENT_METHOD_LABELS_PT: Record<string, string> = {
  pix: 'PIX', dinheiro: 'DINHEIRO', cartao_debito: 'DÉBITO', cartao_credito: 'CRÉDITO',
  transferencia: 'TRANSFERÊNCIA', boleto: 'BOLETO', crediario: 'CREDIÁRIO',
};

// Mostra o primeiro nome sempre inteiro, e so trunca o resto se precisar (ex: "Rafael Tava…")
function formatNamePreview(fullName: string, maxTotalChars: number = 16): string {
  const nome = (fullName || '').trim();
  if (!nome) return '';
  const partes = nome.split(/\s+/);
  if (partes.length <= 1) return partes[0];
  const primeiro = partes[0];
  const resto = partes.slice(1).join(' ');
  const completo = `${primeiro} ${resto}`;
  if (completo.length <= maxTotalChars) return completo;
  const restanteDisponivel = maxTotalChars - primeiro.length - 1;
  if (restanteDisponivel <= 0) return `${primeiro}…`;
  return `${primeiro} ${resto.slice(0, restanteDisponivel)}…`;
}

// Quebra uma venda em "eventos de receita" com a data REAL de cada pagamento — se a venda foi
// paga em partes (ex: R$100 dia 7, R$100 dia 14), o faturamento conta em cada dia separado, nao
// tudo de uma vez na data de criacao da nota. Vendas antigas sem lista detalhada de pagamentos
// (so tem o campo down_payment/total) caem no formato antigo: tudo na data de criacao.
function getRevenueEventsForSale(o: SaleOrder): { date: string; value: number; method?: string }[] {
  if (o.payments && o.payments.length > 0) {
    return o.payments.filter(p => p.value > 0).map(p => ({ date: p.date || o.createdAt, value: p.value, method: p.method }));
  }
  const valor = o.status === 'pending' ? (o.downPayment || 0) : (o.total || 0);
  if (valor <= 0) return [];
  return [{ date: o.createdAt, value: valor, method: o.paymentMethod }];
}

const EXTRATO_PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix', dinheiro: 'Dinheiro', cartao_debito: 'Débito', cartao_credito: 'Crédito',
  transferencia: 'Transferência', boleto: 'Boleto', crediario: 'Crediário',
};

const CONTRATO_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho', aguardando_aceite: 'Aguardando Aceite', aceito: 'Aceito',
  aguardando_assinatura_empresa: 'Aguardando Sua Assinatura',
  aguardando_assinatura_cliente: 'Aguardando Assinatura do Cliente',
  assinado: 'Assinado Digitalmente',
  em_execucao: 'Em Execução', concluido: 'Concluído', cancelado: 'Cancelado', encerrado: 'Encerrado',
};

const ORCAMENTO_STATUS_LABELS_FICHA: Record<string, string> = {
  rascunho: 'Rascunho', enviado: 'Enviado', em_espera: 'Em Espera', aprovado: 'Aprovado', em_producao: 'Em Produção',
  concluido: 'Concluído', recusado: 'Recusado', cancelado: 'Cancelado', expirado: 'Expirado',
};

const CONTRATO_STATUS_STYLES: Record<string, string> = {
  rascunho: 'bg-white/10 text-white/50',
  aguardando_aceite: 'bg-amber-500/15 text-amber-400',
  aceito: 'bg-emerald-500/15 text-emerald-400',
  aguardando_assinatura_empresa: 'bg-amber-500/15 text-amber-400',
  aguardando_assinatura_cliente: 'bg-amber-500/15 text-amber-400',
  assinado: 'bg-primary-500/15 text-primary-400',
  em_execucao: 'bg-blue-500/15 text-blue-400',
  concluido: 'bg-primary-500/15 text-primary-400',
  cancelado: 'bg-rose-500/15 text-rose-400',
  encerrado: 'bg-white/5 text-white/30',
};

// Monta o texto completo do modelo de contrato de prestacao de servicos grafica, com base
// nos dados preenchidos. Estrutura compativel com a legislacao brasileira (CC, CDC quando
// aplicavel), sem inventar clausula incompativel — percentuais/prazos vem dos dados reais.
function buildTextoContrato(params: {
  companyName: string; companyDoc?: string; companyAddress?: string;
  customerName: string; cpfCnpj?: string; phone?: string; address?: string;
  items: SaleOrderItem[]; total: number; desconto: number;
  formaPagamentoTexto?: string; prazoTexto?: string; observacoes?: string;
  numero: string; multaPercentual?: number; jurosPercentual?: number;
}): string {
  const {
    customerName, cpfCnpj, address, items, total, desconto,
    formaPagamentoTexto, prazoTexto, observacoes, multaPercentual,
  } = params;
  // Dados fixos da CONTRATADA (empresa) — mesmo modelo/redacao usado no contrato padrao da
  // empresa. Fonte unica de verdade em companyIdentity.ts, reaproveitada tambem no carimbo de
  // auditoria do PDF (contratoPdf.ts) e no painel "Ver Detalhes do Aceite" (Admin).
  const CONTRATADA_NOME = OFFICIAL_COMPANY.razaoSocial.toUpperCase();
  const CONTRATADA_NOME_FANTASIA = OFFICIAL_COMPANY.nomeFantasia.toUpperCase();
  const CONTRATADA_CNPJ = OFFICIAL_COMPANY.cnpj;
  const CONTRATADA_ENDERECO = 'DO 01, 1445, Santarém - PA, CEP 68035010';

  // Identifica o CONTRATANTE como CPF ou CNPJ conforme a quantidade de digitos do
  // documento informado, em vez do rotulo generico "CPF/CNPJ" pra ambos os casos.
  const digitosDoc = (cpfCnpj || '').replace(/\D/g, '');
  const qualificacaoContratante = !cpfCnpj ? ''
    : digitosDoc.length === 14 ? `, inscrito(a) no CNPJ nº ${cpfCnpj}`
    : `, portador(a) do CPF nº ${cpfCnpj}`;

  const itensDescricao = items.map(i => `- ${i.name.toUpperCase()}${i.dimensions ? ` (${i.dimensions})` : ''} — Qtd: ${i.quantity}`).join('\n') || 'A definir conforme orçamento vinculado.';
  const multaPct = multaPercentual ?? 2;
  const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

DAS PARTES

${CONTRATADA_NOME}, também atuando sob o nome fantasia ${CONTRATADA_NOME_FANTASIA}, pessoa jurídica de direito privado, inscrita no CNPJ nº ${CONTRATADA_CNPJ}, com sede em ${CONTRATADA_ENDERECO}, sendo aqui denominada CONTRATADA.

${customerName.toUpperCase()}${qualificacaoContratante}${address ? `, residente e domiciliado(a) em ${address}` : ''}, sendo aqui denominado(a) CONTRATANTE.

Assim sendo, ambas as partes decidem celebrar o presente CONTRATO DE PRESTAÇÃO DE SERVIÇOS, mediante as cláusulas e condições definidas a seguir.

CLÁUSULA PRIMEIRA — DO OBJETO

1.1 Este contrato refere-se à prestação de serviços gráficos pela CONTRATADA, conforme os itens descritos na Cláusula Quarta, e demais termos e condições detalhados neste presente contrato.

CLÁUSULA SEGUNDA — OBRIGAÇÕES DA CONTRATANTE

2.1 Caberá à CONTRATANTE fornecer à CONTRATADA todas as informações, artes, textos, imagens e materiais necessários à realização do serviço, especificando os detalhes fundamentais à consecução.

2.2 O pagamento deve ser efetuado pela CONTRATANTE de acordo com a forma e condições estabelecidas na Cláusula Quinta deste contrato.

CLÁUSULA TERCEIRA — OBRIGAÇÕES DA CONTRATADA

3.1 A CONTRATADA deverá realizar os serviços solicitados pela CONTRATANTE conforme acordado.

3.2 A CONTRATADA se obriga a manter absoluto sigilo sobre os dados, materiais, informações e documentos da CONTRATANTE, mesmo após a conclusão dos serviços ou do término da relação contratual, sendo vedada a comercialização desses dados ou o uso para outras finalidades — ressalvado o uso de imagens do resultado final para fins de portfólio, salvo objeção expressa da CONTRATANTE.

3.3 Será de responsabilidade da CONTRATADA o ônus trabalhista ou tributário referente a eventuais funcionários envolvidos na prestação do serviço, ficando a CONTRATANTE isenta de qualquer obrigação em relação a eles.

CLÁUSULA QUARTA — DOS SERVIÇOS

4.1 A CONTRATADA realizará os serviços contratados conforme as especificações abaixo:
${itensDescricao}

CLÁUSULA QUINTA — DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO

5.1 A CONTRATANTE se responsabiliza a pagar o valor de R$ ${total.toFixed(2).replace('.', ',')}${desconto > 0 ? ` (já com desconto de R$ ${desconto.toFixed(2).replace('.', ',')} aplicado)` : ''} à CONTRATADA pelos serviços prestados.

5.2 ${formaPagamentoTexto || 'A forma de pagamento será combinada entre as partes no ato da contratação.'}

5.3 Caso haja atraso no pagamento, será devida multa moratória no valor de ${multaPct}% sobre a parcela inadimplida.

5.4 Considera-se o cumprimento integral do contrato o momento em que todos os serviços especificados tenham sido concluídos, sob aprovação e revisão final da CONTRATANTE.

CLÁUSULA SEXTA — DO DESCUMPRIMENTO

6.1 O descumprimento de qualquer uma das cláusulas por qualquer parte poderá implicar na rescisão deste contrato.

CLÁUSULA SÉTIMA — DO PRAZO DE PRODUÇÃO E ENTREGA

7.1 ${prazoTexto || 'O prazo de produção e entrega será informado à CONTRATANTE conforme a complexidade do serviço, contado a partir da aprovação da arte e confirmação do pagamento, quando exigido.'}

7.2 A CONTRATADA deverá comunicar eventual impossibilidade de cumprimento do prazo, podendo as partes estabelecer novo prazo de comum acordo.

CLÁUSULA OITAVA — DA RESCISÃO IMOTIVADA

8.1 Poderá o presente instrumento ser rescindido por qualquer das partes, a qualquer momento, sem motivo relevante, cabendo à CONTRATANTE pagar apenas os valores referentes aos serviços já em andamento ou concluídos até a data da rescisão.

CLÁUSULA NONA — DA OBSERVÂNCIA À LGPD

9.1 A CONTRATANTE expressa consentimento de que a CONTRATADA irá coletar, tratar e compartilhar os dados necessários ao cumprimento deste contrato, nos termos do Art. 7º, inc. V, da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), e demais leis referentes à utilização de dados.

CLÁUSULA DÉCIMA — DA AUSÊNCIA DE VÍNCULO TRABALHISTA

10.1 Este contrato expressa a total inexistência de vínculo trabalhista entre as partes, não havendo subordinação, pessoalidade ou habitualidade que configure qualquer vínculo empregatício.

CLÁUSULA DÉCIMA PRIMEIRA — DO FORO

11.1 Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da Comarca de Santarém, Estado do Pará.
${observacoes ? `\nOBSERVAÇÕES ADICIONAIS:\n${observacoes}\n` : ''}
Justos e de acordo, firmam o presente instrumento.

Santarém, ${dataHoje}.

___________________________________________
${customerName.toUpperCase()} — CONTRATANTE

___________________________________________
${CONTRATADA_NOME} — CONTRATADA`;
}

export const DashboardModule = ({ user, currentCompany, companies = [], pendingOrders = [], setActiveTab, setIsMessagePopupOpen }: { user: AppUser | null, currentCompany: Company | null, companies?: Company[], pendingOrders?: SaleOrder[], setActiveTab?: (tab: any) => void, setIsMessagePopupOpen?: (open: boolean) => void }) => {
  const { setPendingReceivablesFilter, setPendingGoToHistorico, setPendingGoToServicos, setPendingHistoryProductSearch, setPendingReceiptOpenId } = React.useContext(AppContext)!;
  const [isEditMode, setIsEditMode] = useState(false);
  const [valorEmEstoque, setValorEmEstoque] = useState(0);

  // Cards por permissao: Clientes em Espera / Tempo de Espera
  const [filaEspera, setFilaEspera] = useState<any[]>([]);
  const [filaFinalizadosHoje, setFilaFinalizadosHoje] = useState<any[]>([]);
  useEffect(() => {
    const canSeeFila = user?.isAdmin || user?.modulePermissions?.clientes_espera?.view;
    if (!canSeeFila) return;
    const load = async () => {
      const { data: emEspera } = await supabase.from('fila_espera').select('*').in('status', ['aguardando', 'em_atendimento']).order('waiting_started_at', { ascending: true });
      setFilaEspera(emEspera || []);
      const { data: hoje } = await supabase.from('fila_espera').select('*').eq('status', 'finalizado').gte('waiting_ended_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
      setFilaFinalizadosHoje(hoje || []);
    };
    load();
    const channel = supabase.channel('dash-fila-espera').on('postgres_changes', { event: '*', schema: 'public', table: 'fila_espera' }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.isAdmin, user?.modulePermissions]);

  // Card: Mensagens (conversas ativas com leads que ja trocaram mensagem)
  const [conversasAtivas, setConversasAtivas] = useState(0);
  useEffect(() => {
    const canSeeMsg = user?.isAdmin || user?.modulePermissions?.messages?.view;
    if (!canSeeMsg || !currentCompany) return;
    const loadCount = async () => {
      const { data } = await supabase.from('leads').select('last_message_text').eq('company_id', 'rafa-arts');
      setConversasAtivas((data || []).filter((r: any) => !!r.last_message_text).length);
    };
    loadCount();
    const channel = supabase.channel('dash-conversas-ativas').on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `company_id=eq.${currentCompany.id}` }, loadCount).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.isAdmin, user?.modulePermissions, currentCompany]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    const loadValorEstoque = async () => {
      const { data } = await supabase.from('produtos').select('cost_price, current_stock');
      const total = (data || []).reduce((acc: number, p: any) => acc + (Number(p.cost_price) || 0) * (Number(p.current_stock) || 0), 0);
      setValorEmEstoque(total);
    };
    loadValorEstoque();
  }, [user?.isAdmin]);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);
  const [selectedWidget, setSelectedWidget] = useState<DashboardWidget | null>(null);
  const [period, setPeriod] = useState('Semana');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [showLinhaFaturamento, setShowLinhaFaturamento] = useState(true);
  const [showLinhaLucro, setShowLinhaLucro] = useState(true);
  const [revenueDataPoint, setRevenueDataPoint] = useState<any>(null);
   const [realSales, setRealSales] = useState<SaleOrder[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  // Comissoes lancadas (valor ja calculado com % aplicado) - contam como CUSTO no
  // faturamento/lucro que o ADM ve, ja que e dinheiro que sai pro funcionario.
  // Traz origemNotaId junto: comissoes puxadas de uma nota (tem origem_nota_id) ja foram
  // embutidas como Custo Extra na propria nota (ver lancarComissoesComoCustoDaNota /
  // custoDoPedido em analiseDetalhada) -- quem for somar essa lista junto com o custo da nota
  // precisa excluir essas pra nao contar a mesma comissao duas vezes (ver custoComissoesNoPeriodo).
  const [comissoesLancadas, setComissoesLancadas] = useState<{ data: string; valor: number; origemNotaId: string | null }[]>([]);
  useEffect(() => {
    const loadComissoes = async () => {
      const { data } = await supabase.from('comissoes_servicos').select('data, comissao_valor, origem_nota_id');
      setComissoesLancadas((data || []).map((r: any) => ({ data: r.data, valor: Number(r.comissao_valor) || 0, origemNotaId: r.origem_nota_id || null })));
    };
    loadComissoes();
    const channel = supabase.channel('dashboard-comissoes-custo').on('postgres_changes', { event: '*', schema: 'public', table: 'comissoes_servicos' }, loadComissoes).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  const { setCurrentCompany, setPrefilledCustomer } = React.useContext(AppContext)!;
  const [settleModalOrder, setSettleModalOrder] = useState<SaleOrder | null>(null);
  const [settleMethod, setSettleMethod] = useState<'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito'>('pix');

  const handleSettleBalanceInDashboard = async (order: SaleOrder) => {
    if (!currentCompany || !order) return;
    const balanceToSettle = order.total - (order.downPayment || 0);
    if (balanceToSettle <= 0) return;

    try {
      try {
        const audio = new Audio('/sounds/sale-complete.mp3');
        audio.play().catch(() => {});
      } catch (e) {}

      const { error: settleErr } = await supabase.from('vendas').update({
        status: 'completed',
        down_payment: order.total,
        settled_at: new Date().toISOString(),
        settled_payment_method: settleMethod,
      }).eq('id', order.id);
      if (settleErr) throw settleErr;

      const qSvc = query(
        collection(db, 'services'),
        where('companyId', '==', currentCompany.id),
        where('orderId', '==', order.id),
        limit(1)
      );
      const snapSvc = await getDocs(qSvc);
      if (!snapSvc.empty) {
        await updateDoc(doc(db, 'services', snapSvc.docs[0].id), {
          status: 'concluido',
          balance: 0,
          updatedAt: Timestamp.now()
        });
      }

      showAlert(`Saldo de R$ ${balanceToSettle.toFixed(2).replace('.', ',')} quitado com sucesso!\nA venda/serviço foi totalmente quitada.`);
      setSettleModalOrder(null);
    } catch (err) {
      console.error('Erro ao quitar saldo:', err);
      showAlert('Erro ao quitar saldo do pedido.');
    }
  };

  useEffect(() => {
    if (!currentCompany) return;
    const qSvc = query(collection(db, 'services'), where('companyId', '==', currentCompany.id), orderBy('createdAt', 'desc'));
    
    const unsubSvc = onSnapshot(qSvc, (snap) => setServices(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const loadSales = async () => {
      const { data } = await supabase.from('vendas').select('*').is('deleted_at', null).order('created_at', { ascending: false });
      setRealSales((data || []).map(mapVendaRow));
    };
    loadSales();
    const salesChannel = supabase.channel('dashboard-vendas').on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, loadSales).subscribe();

    const loadInventory = async () => {
      const { data } = await supabase.from('produtos').select('*');
      setInventory((data || []).map((row: any) => ({
        id: row.id, name: row.name, code: row.code, category: row.category, unit: row.unit,
        salePrice: row.sale_price, costPrice: row.cost_price, currentStock: row.current_stock,
        minStock: row.min_stock, isService: row.is_service, isActive: row.is_active,
      })));
    };
    loadInventory();
    const invChannel = supabase.channel('dashboard-produtos').on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, loadInventory).subscribe();
    
    return () => { unsubSvc(); supabase.removeChannel(salesChannel); supabase.removeChannel(invChannel); };
  }, [currentCompany]);

  // Intervalo de datas do periodo selecionado — usado tanto pra filtrar notas por CRIACAO
  // (getFilteredOrders, usado no custo e nas listas) quanto pra filtrar PAGAMENTOS por data
  // (usado no faturamento, que conta por quando cada parcela foi paga, nao quando a nota nasceu)
  const getPeriodRange = (): { start: Date; end: Date } => {
    const now = new Date();
    if (period === 'Hoje') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (period === 'Ontem') {
      const start = new Date(now); start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (period === 'Semana') {
      const dayOfWeek = now.getDay(); // 0=domingo, 1=segunda, ..., 6=sabado
      const start = new Date(now); start.setDate(now.getDate() - dayOfWeek); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (period === '30 dias') {
      const start = new Date(now); start.setDate(now.getDate() - 30); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (period === 'Personalizado' && customRange.start && customRange.end) {
      const start = new Date(customRange.start); start.setHours(0, 0, 0, 0);
      const end = new Date(customRange.end); end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    return { start: new Date(0), end: new Date(8640000000000000) };
  };

  const getFilteredOrders = () => {
    const now = new Date();
    return realSales.filter(order => {
      const orderDate = new Date(order.createdAt);
      if (period === 'Hoje') return orderDate.toDateString() === now.toDateString();
      if (period === 'Ontem') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return orderDate.toDateString() === yesterday.toDateString();
      }
      if (period === 'Semana') {
        // Semana comeca no domingo
        const dayOfWeek = now.getDay(); // 0=domingo, 1=segunda, ..., 6=sabado
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // domingo + 6 dias = sabado
        endOfWeek.setHours(23, 59, 59, 999);
        return orderDate >= startOfWeek && orderDate <= endOfWeek;
      }
      const days = period === '30 dias' ? 30 : 0;
      if (days > 0) {
        const past = new Date(now);
        past.setDate(now.getDate() - days);
        return orderDate >= past;
      }
      if (period === 'Personalizado' && customRange.start && customRange.end) {
        return orderDate >= new Date(customRange.start) && orderDate <= new Date(customRange.end);
      }
      return true;
    });
  };

  const filteredOrders = getFilteredOrders();
  // Faturamento por data de CADA PAGAMENTO (nao pela data de criacao da nota) — uma nota criada
  // fora do periodo mas paga DENTRO do periodo conta aqui; olha em TODAS as vendas, nao so
  // filteredOrders (que filtra por criacao)
  const { start: periodoStart, end: periodoEnd } = getPeriodRange();
  const totalRevenue = realSales
    .filter(o => o.status !== 'canceled')
    .flatMap(getRevenueEventsForSale)
    .filter(ev => { const d = new Date(ev.date); return d >= periodoStart && d <= periodoEnd; })
    .reduce((acc, ev) => acc + ev.value, 0);

  // Custo tambem por evento de pagamento (mesma base do faturamento acima) — cada pagamento
  // recebido no periodo abate a fatia proporcional do custo do pedido a que pertence, entao
  // Lucro Liquido = Faturamento - Custo usa exatamente a mesma janela de tempo (pagamentos
  // recebidos no periodo), eliminando a soma incorreta que misturava "pedidos criados no
  // periodo" com "dinheiro recebido no periodo".
  const totalCost = realSales
    .filter(o => o.status !== 'canceled')
    .reduce((acc, o) => {
      const eventos = getRevenueEventsForSale(o);
      const eventosNoPeriodo = eventos.filter(ev => { const d = new Date(ev.date); return d >= periodoStart && d <= periodoEnd; });
      if (eventosNoPeriodo.length === 0) return acc;
      let orderCost = 0;
      o.items?.forEach(item => {
        const invItem = inventory.find(i => i.id === item.productId || i.name?.toLowerCase() === item.name?.toLowerCase());
        const unitCost = invItem && typeof invItem.costPrice === 'number' ? invItem.costPrice : (item.price || 0) * 0.35;
        orderCost += item.area ? unitCost * item.area * item.quantity : unitCost * item.quantity;
      });
      const totalRecebidoPedido = eventos.reduce((s, ev) => s + ev.value, 0);
      const recebidoNoPeriodo = eventosNoPeriodo.reduce((s, ev) => s + ev.value, 0);
      const fatiaCusto = totalRecebidoPedido > 0 ? orderCost * (recebidoNoPeriodo / totalRecebidoPedido) : 0;
      return acc + fatiaCusto;
    }, 0)
    + comissoesLancadas.filter(c => { const d = new Date(`${c.data}T00:00:00`); return d >= periodoStart && d <= periodoEnd; }).reduce((acc, c) => acc + c.valor, 0);

  const netProfit = Math.max(0, totalRevenue - totalCost);
  const avgMarkup = totalCost > 0 ? (totalRevenue / totalCost) : 3.1;
  const fixedCosts = 3800;
  const contributionMargin = totalRevenue > 0 ? (netProfit / totalRevenue) : 0.65;
  const breakevenPoint = contributionMargin > 0 ? (fixedCosts / contributionMargin) : fixedCosts / 0.65;

  const totalSalesCount = filteredOrders.length;
  const pendingEntries = realSales.filter(o => o.status === 'pending');
  const pendingValue = pendingEntries.reduce((acc, o) => acc + ((o.total || 0) - (o.downPayment || 0)), 0);

  // Detecta tema claro/escuro (a classe fica no <body>, aplicada pelo App) — o grafico usa
  // cores fixas via SVG (fill inline), que NAO respeitam a troca automatica de classes CSS
  // (.light-theme .text-white{...}) que o resto da tela usa, entao precisa ler isso na mao
  const [isLightTheme, setIsLightTheme] = useState(() => document.body.classList.contains('light-theme'));
  useEffect(() => {
    const observer = new MutationObserver(() => setIsLightTheme(document.body.classList.contains('light-theme')));
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const chartTextColor = isLightTheme ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.3)';
  const chartGridColor = isLightTheme ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.05)';

  const chartData = useMemo(() => {
    const groups: Record<string, any> = {};
    const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime());
    const { start: rangeStart, end: rangeEnd } = getPeriodRange();
    // Faturamento por data de CADA pagamento (nao criacao da nota), dentro do intervalo real
    // do periodo selecionado — mesma logica ja usada nos cards do topo
    realSales.filter(o => o.status !== 'canceled').flatMap(getRevenueEventsForSale).forEach(ev => {
      const dateObj = new Date(ev.date);
      if (!isValidDate(dateObj) || dateObj < rangeStart || dateObj > rangeEnd) return;
      const day = format(dateObj, 'dd/MM');
      if (!groups[day]) groups[day] = { day, total: 0, sales: 0, svcs: 0, entries: 0 };
      groups[day].total += ev.value;
    });
    // Contagem de vendas/entradas continua pela data de CRIACAO (quantos pedidos nasceram no periodo)
    filteredOrders.forEach(o => {
      const dateObj = new Date(o.createdAt);
      if (!isValidDate(dateObj)) return;
      const day = format(dateObj, 'dd/MM');
      if (!groups[day]) groups[day] = { day, total: 0, sales: 0, svcs: 0, entries: 0 };
      groups[day].sales += 1;
      if (o.status === 'pending') groups[day].entries += 1;
    });
    services.forEach(s => {
      const date = s.createdAt instanceof Timestamp ? s.createdAt.toDate() : new Date(s.createdAt);
      if (!isValidDate(date) || date < rangeStart || date > rangeEnd) return;
      const day = format(date, 'dd/MM');
      if (groups[day]) groups[day].svcs += 1;
      else groups[day] = { day, total: 0, sales: 0, svcs: 1, entries: 0 };
    });
    return Object.values(groups).sort((a, b) => a.day.localeCompare(b.day));
  }, [filteredOrders, services, realSales, period, customRange]);
  const IconMap: Record<string, any> = {
    TrendingUp, Target, Clock, MessageSquare, ShoppingBag, Users, FileText, BarChart2, PieChartIcon, Trophy, Activity, Timer, CalendarDays, Wrench, Home
  };

  // Analise Detalhada (modal "Analise de Performance")
  // Permite selecionar Hoje, Semana, Mês, Ano e Personalizado com navegação dia a dia, semana a semana, mês a mês, ano a ano ou intervalo livre.
  const [analisePeriodo, setAnalisePeriodo] = useState<'hoje' | 'semana' | 'mes' | 'ano' | 'custom'>('mes');
  const [analiseSelectedDate, setAnaliseSelectedDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [analiseSelectedYear, setAnaliseSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [analiseCustomRange, setAnaliseCustomRange] = useState<{ start: string; end: string }>({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const analiseDetalhada = useMemo(() => {
    // Custo de uma nota = so material Lona/Adesivo (por m2/metro, batendo com o item do
    // Estoque de Insumos) + custos extras manuais lancados na nota (frete, mao de obra,
    // ferro, tinta, etc — ver painel "Custos da Nota" no PDV / ExtraCost). Nenhum outro
    // produto do carrinho entra automaticamente no custo -- ver src/lib/lucro.ts.
    const custoDoPedido = (o: SaleOrder) => {
      const custoMaterial = (o.items || []).reduce((total, item) => {
        if (!isMaterialLonaAdesivo(item.name)) return total;
        const invItem = inventory.find(i => i.id === item.productId || i.name?.toLowerCase() === item.name?.toLowerCase());
        const unitCost = invItem && typeof invItem.costPrice === 'number' ? invItem.costPrice : 0;
        return total + (item.area ? unitCost * item.area * item.quantity : unitCost * item.quantity);
      }, 0);
      let c = custoMaterial + somaCustosExtras(o.extraCosts);
      if (o.status === 'pending' && o.total > 0) c *= (o.downPayment || 0) / o.total;
      return c;
    };

    // Soma o valor de comissoes JA LANCADAS (com % ja aplicado) dentro de um periodo — conta
    // como custo, ja que e dinheiro que sai pro funcionario sobre aquele servico.
    const custoComissoesNoPeriodo = (desde: Date, ate: Date) => {
      return comissoesLancadas
        .filter(c => !c.origemNotaId)
        .filter(c => { const d = new Date(`${c.data}T00:00:00`); return d >= desde && d <= ate; })
        .reduce((acc, c) => acc + c.valor, 0);
    };

    // Determina o intervalo exato de datas (inicio e fim) de acordo com o modo selecionado
    let inicioPeriodo: Date;
    let fimPeriodo: Date;
    let baseRefDate: Date;

    try {
      baseRefDate = analiseSelectedDate ? new Date(`${analiseSelectedDate}T12:00:00`) : new Date();
      if (isNaN(baseRefDate.getTime())) baseRefDate = new Date();
    } catch {
      baseRefDate = new Date();
    }

    if (analisePeriodo === 'hoje') {
      inicioPeriodo = new Date(baseRefDate);
      inicioPeriodo.setHours(0, 0, 0, 0);
      fimPeriodo = new Date(baseRefDate);
      fimPeriodo.setHours(23, 59, 59, 999);
    } else if (analisePeriodo === 'semana') {
      const dayOfWeek = baseRefDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
      inicioPeriodo = new Date(baseRefDate);
      inicioPeriodo.setDate(baseRefDate.getDate() - dayOfWeek);
      inicioPeriodo.setHours(0, 0, 0, 0);
      fimPeriodo = new Date(inicioPeriodo);
      fimPeriodo.setDate(inicioPeriodo.getDate() + 6);
      fimPeriodo.setHours(23, 59, 59, 999);
    } else if (analisePeriodo === 'mes') {
      inicioPeriodo = new Date(baseRefDate.getFullYear(), baseRefDate.getMonth(), 1, 0, 0, 0, 0);
      const ultimoDiaMes = new Date(baseRefDate.getFullYear(), baseRefDate.getMonth() + 1, 0).getDate();
      fimPeriodo = new Date(baseRefDate.getFullYear(), baseRefDate.getMonth(), ultimoDiaMes, 23, 59, 59, 999);
    } else if (analisePeriodo === 'ano') {
      const targetYear = analiseSelectedYear || baseRefDate.getFullYear();
      inicioPeriodo = new Date(targetYear, 0, 1, 0, 0, 0, 0);
      fimPeriodo = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    } else {
      // custom
      const startStr = analiseCustomRange.start || format(new Date(), 'yyyy-MM-dd');
      const endStr = analiseCustomRange.end || startStr;
      inicioPeriodo = new Date(`${startStr}T00:00:00`);
      fimPeriodo = new Date(`${endStr}T23:59:59.999`);
      if (isNaN(inicioPeriodo.getTime())) {
        inicioPeriodo = new Date();
        inicioPeriodo.setHours(0, 0, 0, 0);
      }
      if (isNaN(fimPeriodo.getTime())) {
        fimPeriodo = new Date(inicioPeriodo);
        fimPeriodo.setHours(23, 59, 59, 999);
      }
      if (inicioPeriodo > fimPeriodo) {
        const temp = inicioPeriodo;
        inicioPeriodo = fimPeriodo;
        fimPeriodo = temp;
      }
    }

    const diasNoPeriodo = Math.max(1, Math.round((fimPeriodo.getTime() - inicioPeriodo.getTime()) / 86400000) + 1);

    const calcPeriodo = (desde: Date, ate: Date) => {
      const vendasNaoCanceladas = realSales.filter(o => o.status !== 'canceled');
      // Faturamento conta pela data de CADA pagamento (nao a data de criacao da nota)
      const faturamento = vendasNaoCanceladas
        .flatMap(getRevenueEventsForSale)
        .filter(ev => {
          const d = new Date(ev.date);
          return d >= desde && d <= ate;
        })
        .reduce((acc, ev) => acc + ev.value, 0);

      // Custo: notas criadas dentro do período ou comissão lançada no período
      const custo = vendasNaoCanceladas
        .filter(o => {
          const d = new Date(o.createdAt);
          return d >= desde && d <= ate;
        })
        .reduce((acc, o) => acc + custoDoPedido(o), 0)
        + custoComissoesNoPeriodo(desde, ate);

      const count = vendasNaoCanceladas.filter(o => {
        const d = new Date(o.createdAt);
        return d >= desde && d <= ate;
      }).length;

      return { faturamento, lucro: Math.max(0, faturamento - custo), count };
    };

    const periodo = calcPeriodo(inicioPeriodo, fimPeriodo);
    const mediaDiariaPeriodo = periodo.faturamento / diasNoPeriodo;

    // Produtos mais vendidos no periodo selecionado
    const produtosMap: Record<string, { name: string; qty: number; total: number }> = {};
    realSales
      .filter(o => {
        const d = new Date(o.createdAt);
        return o.status !== 'canceled' && d >= inicioPeriodo && d <= fimPeriodo;
      })
      .forEach(o => {
        o.items?.forEach(item => {
          if (!produtosMap[item.name]) produtosMap[item.name] = { name: item.name, qty: 0, total: 0 };
          produtosMap[item.name].qty += item.quantity || 1;
          produtosMap[item.name].total += item.area ? (item.price || 0) * item.area * item.quantity : (item.price || 0) * item.quantity;
        });
      });
    const produtosMaisVendidos = Object.values(produtosMap).sort((a, b) => b.qty - a.qty).slice(0, 6);

    // Vendas mais recentes do periodo selecionado (pra lista "Historico de Vendas" no modal)
    const vendasDoPeriodo = realSales
      .filter(o => {
        const d = new Date(o.createdAt);
        return o.status !== 'canceled' && d >= inicioPeriodo && d <= fimPeriodo;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    // Extrato de caixa: cada RECEBIMENTO individual no período selecionado
    const extratoRecebimentos = realSales
      .filter(o => o.status !== 'canceled')
      .flatMap(o => getRevenueEventsForSale(o).map(ev => ({ ...ev, saleId: o.id, customerName: o.customerName || 'Cliente de Balcão' })))
      .filter(ev => {
        const d = new Date(ev.date);
        return d >= inicioPeriodo && d <= fimPeriodo;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Linha do grafico
    const porBucket: Record<string, { faturamento: number; custo: number }> = {};
    realSales.filter(o => o.status !== 'canceled').forEach(o => {
      const eventos = getRevenueEventsForSale(o);
      const custoPedido = custoDoPedido(o);
      const totalRecebidoPedido = eventos.reduce((acc, ev) => acc + ev.value, 0);
      eventos.forEach(ev => {
        const d = new Date(ev.date);
        if (isNaN(d.getTime())) return;
        if (d < inicioPeriodo || d > fimPeriodo) return;
        const key = analisePeriodo === 'ano' ? format(d, 'MM/yyyy') : format(d, 'dd/MM');
        if (!porBucket[key]) porBucket[key] = { faturamento: 0, custo: 0 };
        porBucket[key].faturamento += ev.value;
        const fatiaCusto = totalRecebidoPedido > 0 ? custoPedido * (ev.value / totalRecebidoPedido) : 0;
        porBucket[key].custo += fatiaCusto;
      });
    });

    comissoesLancadas.filter(c => !c.origemNotaId).forEach(c => {
      const d = new Date(`${c.data}T00:00:00`);
      if (isNaN(d.getTime()) || d < inicioPeriodo || d > fimPeriodo) return;
      const key = analisePeriodo === 'ano' ? format(d, 'MM/yyyy') : format(d, 'dd/MM');
      if (!porBucket[key]) porBucket[key] = { faturamento: 0, custo: 0 };
      porBucket[key].custo += c.valor;
    });

    const linhaGrafico: { day: string; faturamento: number; lucro: number }[] = [];
    if (analisePeriodo === 'ano') {
      const targetYear = analiseSelectedYear || baseRefDate.getFullYear();
      for (let m = 0; m < 12; m++) {
        const d = new Date(targetYear, m, 1);
        const key = format(d, 'MM/yyyy');
        const v = porBucket[key] || { faturamento: 0, custo: 0 };
        linhaGrafico.push({ day: format(d, 'MM/yy'), faturamento: v.faturamento, lucro: Math.max(0, v.faturamento - v.custo) });
      }
    } else if (analisePeriodo === 'hoje') {
      const key = format(inicioPeriodo, 'dd/MM');
      const v = porBucket[key] || { faturamento: 0, custo: 0 };
      linhaGrafico.push({ day: key, faturamento: v.faturamento, lucro: Math.max(0, v.faturamento - v.custo) });
    } else {
      const stepDays = Math.min(diasNoPeriodo, 365);
      for (let i = 0; i < stepDays; i++) {
        const d = new Date(inicioPeriodo);
        d.setDate(inicioPeriodo.getDate() + i);
        if (d > fimPeriodo) break;
        const key = format(d, 'dd/MM');
        const v = porBucket[key] || { faturamento: 0, custo: 0 };
        linhaGrafico.push({ day: key, faturamento: v.faturamento, lucro: Math.max(0, v.faturamento - v.custo) });
      }
    }

    return {
      inicioPeriodo,
      fimPeriodo,
      diasNoPeriodo,
      periodo,
      mediaDiariaPeriodo,
      produtosMaisVendidos,
      vendasDoPeriodo,
      extratoRecebimentos,
      linhaGrafico
    };
  }, [realSales, inventory, comissoesLancadas, analisePeriodo, analiseSelectedDate, analiseSelectedYear, analiseCustomRange]);

  const addWidget = (type: WidgetType) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      title: 'Novo Widget',
      type,
      size: 'md',
      gridPos: { x: 0, y: 0, w: 1, h: 1 },
      dataSource: { collection: 'leads', calculation: 'count', filters: {} },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWidgets([...widgets, newWidget]);
    setSelectedWidget(newWidget);
    setIsSidebarOpen(true);
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
    if (selectedWidget?.id === id) setSelectedWidget(null);
  };

  const updateWidget = (updates: Partial<DashboardWidget>) => {
    if (!selectedWidget) return;
    const updated = { ...selectedWidget, ...updates };
    setWidgets(widgets.map(w => w.id === selectedWidget.id ? updated : w));
    setSelectedWidget(updated);
  };

  const goToReports = (periodType: string) => {
    setIsRevenueModalOpen(false);
    // Redirecting to POS for sales history since documents/reports is removed
    setActiveTab('pos');
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 relative min-h-screen pb-20">
      <SectionHeader 
        title={`Dashboard Rafa Arts Graphics`} 
        subtitle={`Gestão Inteligente & Produtividade`} 
        actions={
          <div className="flex flex-wrap gap-4 items-center">
            {/* Company Selector */}
            {companies.length > 0 && (
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 items-center gap-2 pr-4">
                 <div className="p-2 bg-primary-500/10 text-primary-300 rounded-xl">
                    <Building2 size={16} />
                 </div>
                 <select 
                   value={currentCompany?.id}
                   onChange={(e) => {
                     const comp = companies.find(c => c.id === e.target.value);
                     if (comp) setCurrentCompany(comp);
                   }}
                   className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer"
                 >
                   {companies.map(c => (
                     <option key={c.id} value={c.id} className="bg-slate-900 text-white font-bold">{c.name}</option>
                   ))}
                 </select>
              </div>
            )}

            <div className="flex flex-col gap-2 items-end">
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                {['Hoje', 'Ontem', 'Semana', '30 dias', 'Personalizado'].map(p => (
                  <button 
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                      period === p ? "bg-primary-500 text-slate-900 shadow-lg" : "text-white/40 hover:text-white"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {period === 'Personalizado' && (
                <div className="flex gap-2 items-center bg-white/5 p-2 rounded-xl border border-white/5 animate-in slide-in-from-top-2">
                   <input 
                     type="date" 
                     className="bg-transparent text-[9px] font-bold text-white outline-none" 
                     value={customRange.start}
                     onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                   />
                   <span className="text-[9px] text-white/20">até</span>
                   <input 
                     type="date" 
                     className="bg-transparent text-[9px] font-bold text-white outline-none" 
                     value={customRange.end}
                     onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                   />
                </div>
              )}
            </div>
          </div>
        } 
      />

      {user?.isAdmin && (
        <GlassCard
          onClick={() => setActiveTab?.('inventory')}
          className="p-6 border-white/5 flex items-center gap-6 group relative overflow-hidden max-w-md cursor-pointer hover:border-emerald-500/30 transition-all"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-1000" />
          <div className="p-4 rounded-2xl bg-white/5 text-emerald-400">
            <Banknote size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1">Valor em Estoque</p>
            <h4 className="text-xl font-black text-white">R$ {valorEmEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
          </div>
        </GlassCard>
      )}

      {(() => {
        const canOS = user?.isAdmin || user?.modulePermissions?.pos?.view;
        const canMsg = user?.isAdmin || user?.modulePermissions?.messages?.view;
        const canFila = user?.isAdmin || user?.modulePermissions?.clientes_espera?.view;
        if (!canOS && !canMsg && !canFila) return null;

        const aguardandoFila = filaEspera.filter(f => f.status === 'aguardando');
        const tempos = filaFinalizadosHoje.filter(f => f.waiting_duration_seconds != null).map(f => f.waiting_duration_seconds);
        const tempoMedio = tempos.length > 0 ? Math.round(tempos.reduce((a: number, b: number) => a + b, 0) / tempos.length) : 0;
        const maiorEspera = tempos.length > 0 ? Math.max(...tempos) : 0;
        const fmtMinSec = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}min ${String(s % 60).padStart(2, '0')}s`;

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {canMsg && (
              <GlassCard
                onClick={() => {
                  // Mesmo comportamento do item "Conversas" no menu lateral (ver App.tsx):
                  // em desktop abre o balão flutuante MessagesSidebarPopup — o MESMO
                  // componente de chat usado ali —, em vez de navegar pra uma tela separada.
                  // Em mobile (sem espaço pro balão flutuante) cai na navegação normal.
                  if (window.innerWidth >= 1024 && setIsMessagePopupOpen) {
                    setIsMessagePopupOpen(true);
                  } else {
                    setActiveTab?.('messages');
                  }
                }}
                className="p-5 border-white/5 cursor-pointer hover:border-primary-500/30 transition-all space-y-2"
              >
                <p className="text-[9px] font-black uppercase text-white/30 tracking-widest">Mensagens Recebidas</p>
                <h4 className="text-2xl font-black text-white">{conversasAtivas} <span className="text-xs text-white/40 font-bold">conversas ativas</span></h4>
                <p className="text-[10px] text-primary-400 font-bold uppercase">Ver mensagens →</p>
              </GlassCard>
            )}
            {canFila && (
              <GlassCard onClick={() => setActiveTab?.('clientes_espera')} className="p-5 border-white/5 cursor-pointer hover:border-primary-500/30 transition-all space-y-2">
                <p className="text-[9px] font-black uppercase text-white/30 tracking-widest">Clientes em Espera</p>
                <h4 className="text-2xl font-black text-white">{aguardandoFila.length} <span className="text-xs text-white/40 font-bold">aguardando</span></h4>
                <p className="text-[10px] text-primary-400 font-bold uppercase">Atender próximo →</p>
              </GlassCard>
            )}
            {canFila && (
              <GlassCard className="p-5 border-white/5 space-y-2">
                <p className="text-[9px] font-black uppercase text-white/30 tracking-widest">Tempo de Espera</p>
                <h4 className="text-lg font-black text-white">Média: {fmtMinSec(tempoMedio)}</h4>
                <p className="text-[10px] text-amber-400 font-bold">Maior: {fmtMinSec(maiorEspera)}</p>
              </GlassCard>
            )}
          </div>
        );
      })()}

      {user?.isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Faturamento', val: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, diff: 'Hoje/Período', color: 'emerald', action: () => setIsRevenueModalOpen(true) },
            { label: 'Lucro Líquido', val: `R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, diff: `Margem: ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(0) : '65'}%`, color: 'emerald', action: () => setIsRevenueModalOpen(true) },
            { label: 'Markup Médio', val: `${avgMarkup.toFixed(2).replace('.', ',')}x`, diff: 'Faturamento/Custo', color: 'primary', action: () => setActiveTab?.('inventory') },
            { label: 'Pto Equilíbrio', val: `R$ ${breakevenPoint.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, diff: `${Math.min(100, Math.round((totalRevenue / breakevenPoint) * 100))}% Reatido`, color: 'purple', action: () => setIsRevenueModalOpen(true) },
            { label: 'A Receber', val: `R$ ${pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, diff: 'Balancete Aberto', color: 'rose', action: () => { setPendingReceivablesFilter(true); setActiveTab?.('pos'); } },
          ].map((item, i) => (
            <GlassCard 
              key={i} 
              onClick={item.action}
              className="p-4 border-white/5 flex flex-col justify-center transition-all cursor-pointer hover:border-primary-500/30 group relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 group-hover:bg-primary-500/10 transition-all" />
               <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">{item.label}</p>
               <div className="flex items-end justify-between">
                  <h5 className="text-sm font-black text-white">{item.val}</h5>
                  <span className={cn("text-[8px] font-bold", item.color === 'emerald' ? 'text-emerald-400' : 'text-primary-300')}>
                    {item.diff}
                  </span>
               </div>
            </GlassCard>
          ))}
        </div>
      )}

      <div className={cn("grid gap-8", user?.isAdmin ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1")}>
        {user?.isAdmin && (
          <GlassCard className="lg:col-span-2 p-8 border-white/5 bg-white/[0.02]">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">Análise de Performance</h3>
                   <p className="text-xs text-white/30 font-bold tracking-widest uppercase">Evolução do Faturamento por Período</p>
                </div>
                <Button variant="ghost" icon={Maximize2} onClick={() => setIsRevenueModalOpen(true)} />
             </div>
             
             <div className="h-[350px] w-full">
                <ChartErrorBoundary>
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart 
                     data={chartData.length > 0 ? chartData : [
                       { day: 'Seg', total: 400 }, { day: 'Ter', total: 600 }, { day: 'Qua', total: 300 }
                     ]}
                     onClick={(data: any) => {
                        if (data?.activePayload) {
                           setRevenueDataPoint(data.activePayload[0].payload);
                           setIsRevenueModalOpen(true);
                        }
                     }}
                   >
                      <defs>
                         <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4cc9f0" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#4cc9f0" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartTextColor, fontWeight: 800 }} />
                      <YAxis hide />
                      <Tooltip 
                         cursor={{ stroke: '#4cc9f0', strokeWidth: 1, strokeDasharray: '5 5' }}
                         contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                      />
                      <Area type="monotone" dataKey="total" stroke="#4cc9f0" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                   </AreaChart>
                </ResponsiveContainer>
                </ChartErrorBoundary>
             </div>
          </GlassCard>
        )}

        <div className="space-y-8 flex flex-col min-w-0">
            <GlassCard className="p-8 border-white/5 bg-white/[0.02] flex-1 overflow-hidden">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-primary-500/20 text-primary-300 flex items-center justify-center">
                        <ListTodo size={20} />
                     </div>
                     <h3 className="text-xs font-black text-white italic tracking-widest uppercase">Ordem de Serviços</h3>
                  </div>
                  <Badge variant="outline" className="text-[8px] opacity-40 uppercase">{services.length} ATIVAS</Badge>
               </div>
               <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                  {services.length === 0 && (
                    <div className="text-center py-10 opacity-20">
                       <Package size={32} className="mx-auto mb-2" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma OS ativa</p>
                    </div>
                  )}
                  {services.slice(0, 8).map((s, i) => (
                    <div key={i} onClick={() => { setActiveTab?.('pos'); setPendingGoToServicos(true); }} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group space-y-2 min-w-0 overflow-hidden">
                       <div className="flex justify-between items-start gap-2">
                          <div className="space-y-0.5 min-w-0 flex-1">
                             <p className="text-[10px] font-black text-white truncate uppercase">{s.client}</p>
                             <p className="text-[8px] text-[#4cc9f0] uppercase font-black truncate">Empresa: {currentCompany?.name || 'Geral'}</p>
                          </div>
                          <span className="text-[10px] font-black text-emerald-400 italic shrink-0">R$ {(s.total || 0).toFixed(2).replace('.', ',')}</span>
                       </div>
                       <div className="flex justify-between items-end pt-2 border-t border-white/5 gap-2">
                          <div className="space-y-0.5 min-w-0 flex-1">
                             <p className="text-[9px] text-white/30 truncate italic">{s.service || 'Serviço s/ descrição'}</p>
                             <p className="text-[8px] text-white/40 uppercase font-bold truncate">RESP: {s.responsibleName || s.responsible || 'Responsável'}</p>
                             <p className="text-[7px] text-white/20">{s.createdAt ? safeFormat(s.createdAt, 'dd/MM HH:mm') : ''}</p>
                          </div>
                          <Badge variant={s.status === 'producao' ? 'primary' : 'warning'} className="text-[8px] h-5 px-1.5 uppercase font-black leading-none shrink-0">
                            {s.status === 'producao' ? 'Em Produção' : 'Pendente'}
                          </Badge>
                       </div>
                    </div>
                  ))}
               </div>
            </GlassCard>

           <GlassCard className="p-8 border-white/5 bg-amber-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-12 -mt-12" />
              <div className="flex items-center gap-3 mb-4">
                 <AlertCircle size={20} className="text-amber-500" />
                 <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Alerta de Estoque</h3>
              </div>
              <p className="text-xl font-black text-white italic uppercase leading-none">12 Itens Baixos</p>
              <p className="text-[10px] text-white/30 font-bold mt-2 uppercase">Necessário repor estoque crítico</p>
              <Button variant="secondary" size="sm" className="w-full mt-6 h-10 text-[9px] uppercase tracking-widest border-amber-500/20 text-amber-500" onClick={() => setActiveTab?.('pos')}>Ver Estoque</Button>
           </GlassCard>
        </div>
      </div>

      {/* SEÇÃO INTEGRADA: Serviços & Mercadorias Gráficas & Fluxos Financeiros (Pendentes) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
         {/* Graphics Services & Merchandise Block */}
         <GlassCard className="p-8 border-white/5 bg-white/[0.02] flex flex-col justify-between animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div>
               <div className="flex justify-between items-start mb-6">
                  <div>
                     <h3 className="text-xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
                        <FileText size={18} className="text-red-500" />
                        Serviços & Mercadorias Gráficas
                     </h3>
                     <p className="text-[10px] text-white/30 font-bold tracking-widest uppercase mb-1">Rafa Arts Graphics • PDV & Contratos</p>
                  </div>
                  <Button 
                    size="sm" 
                    icon={Plus} 
                    onClick={() => setActiveTab?.('pos')}
                    className="text-[9px] uppercase tracking-widest font-black h-8 px-3 bg-red-600 hover:bg-red-700 text-white"
                  >
                    Ir pro PDV
                  </Button>
               </div>

               {/* Total Stats Card — dados reais */}
               <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/10">
                     <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Vendas Este Mês</p>
                     <p className="text-2xl font-black text-white">{realSales.filter(o => { const d = new Date(o.createdAt); const now = new Date(); return o.status !== 'canceled' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length} un</p>
                  </div>
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                     <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Faturamento do Mês</p>
                     <p className="text-xl font-black text-white">R$ {realSales.filter(o => { const d = new Date(o.createdAt); const now = new Date(); return o.status !== 'canceled' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((acc, o) => acc + (o.status === 'pending' ? (o.downPayment || 0) : (o.total || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
               </div>

               {/* Vendas mais recentes — dados reais */}
               <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {realSales.filter(o => o.status !== 'canceled').slice(0, 6).length === 0 ? (
                    <div className="text-center py-8 opacity-20 border border-dashed border-white/10 rounded-2xl">
                       <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma venda registrada ainda</p>
                    </div>
                  ) : (
                    realSales.filter(o => o.status !== 'canceled').slice(0, 6).map((o) => (
                      <div
                        key={o.id}
                        onClick={() => setActiveTab?.('pos')}
                        className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center group hover:bg-white/10 transition-all cursor-pointer"
                      >
                         <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                               <span className="text-[11px] font-black text-white uppercase italic truncate">{(o.items?.[0]?.name || 'Serviço/Produto').toUpperCase()}{(o.items?.length || 0) > 1 ? ` +${o.items!.length - 1}` : ''}</span>
                               <Badge variant="outline" className={cn("text-[8px] py-0 px-1 leading-none h-4", o.status === 'pending' ? "border-amber-500/30 text-amber-400" : "border-emerald-500/30 text-emerald-400")}>
                                 {o.status === 'pending' ? 'Em Aberto' : 'Pago'}
                               </Badge>
                            </div>
                            <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider truncate">Cliente: {(o.customerName || 'Cliente de Balcão').toUpperCase()}</p>
                         </div>
                         <div className="text-right shrink-0 ml-2">
                            <p className="text-xs font-black text-emerald-400">R$ {o.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p className="text-[8px] text-white/40 uppercase font-black">Pago: R$ {(o.downPayment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
         </GlassCard>

         {/* Pending Entries Block */}
         <GlassCard className="p-8 border-white/5 bg-white/[0.02]">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <h3 className="text-xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
                     <Clock size={18} className="text-rose-400" />
                     Fluxos Inacabados
                  </h3>
                  <p className="text-[10px] text-white/30 font-bold tracking-widest uppercase">Caixa & Contas Parciais (Aberto)</p>
               </div>
               <Badge variant="outline" className="text-[8px] opacity-40 uppercase bg-rose-500/5 text-rose-400 border-rose-500/10">{pendingValue > 0 ? pendingEntries.length : 0} PARCIAIS</Badge>
            </div>

            {/* Pending Entries List */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
               {pendingEntries.length === 0 ? (
                 <div className="text-center py-12 opacity-20 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center">
                    <Clock size={32} className="mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Sem saldos pendentes ativos</p>
                    <p className="text-[8px] text-white/50 lowercase mt-1">crie um pedido com entrada no pdv</p>
                 </div>
               ) : (
                 pendingEntries.map((o, idx) => {
                    const balance = o.total - (o.downPayment || 0);
                    const type = o.paymentMethod ? o.paymentMethod.replace('_', ' ') : 'Geral';
                    const dateStr = safeFormat(o.createdAt, 'dd/MM/yyyy');
                    const domainStr = o.items?.[0]?.name ? 'Gráfica' : 'Serviços';
                    return (
                      <div 
                        key={o.id || idx} 
                        onClick={() => {
                          setPendingReceivablesFilter(true);
                          setActiveTab?.('pos');
                        }} 
                        className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-primary-400 hover:bg-white/10 cursor-pointer transition-all flex justify-between items-center group relative overflow-hidden"
                      >
                         <div className="space-y-1">
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black text-white uppercase">{o.customerName || 'Cliente Balcão'}</span>
                               <Badge className="text-[7px] py-0 px-1 uppercase bg-rose-500/15 text-rose-400 border-none font-bold">Incompleto</Badge>
                            </div>
                            <p className="text-[9px] text-white/30 font-black uppercase tracking-wider">Origem: {domainStr} • {dateStr} • Tipo: {type}</p>
                            <p className="text-[8px] text-primary-300 font-black">RESPONSÁVEL: {o.responsibleName || 'Caixa Central'}</p>
                         </div>
                         <div className="text-right flex flex-col items-end gap-1">
                            <p className="text-xs font-black text-white/90">Total: R$ {o.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p className="text-[9px] text-emerald-400 font-bold">Entrada: R$ {(o.downPayment || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p className="text-[10px] font-black text-rose-400">Falta: R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSettleModalOrder(o);
                              }}
                              className="mt-1 text-[8px] font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-2.5 py-1 rounded-lg transition-all shadow-md flex items-center gap-1 active:scale-95"
                            >
                              <CheckCircle2 size={10} />
                              <span>Quitar Saldo</span>
                            </button>
                         </div>
                      </div>
                    );
                 })
               )}
            </div>
         </GlassCard>
      </div>

      <Modal isOpen={isRevenueModalOpen && !!user?.isAdmin} onClose={() => setIsRevenueModalOpen(false)} title="Análise Detalhada" size="xl">
         <div className="space-y-4 p-1 sm:p-2">
            {/* Seletor de periodo e navegação temporal */}
            <div className="flex flex-col gap-2.5 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
               <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
                     {[
                       { id: 'hoje', label: 'Hoje / Dia' },
                       { id: 'semana', label: 'Semana' },
                       { id: 'mes', label: 'Mês' },
                       { id: 'ano', label: 'Ano' },
                       { id: 'custom', label: 'Personalizado' },
                     ].map(p => (
                       <button
                         key={p.id}
                         onClick={() => setAnalisePeriodo(p.id as any)}
                         className={cn(
                           "px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-wide cursor-pointer border-0 transition-all",
                           analisePeriodo === p.id ? "bg-primary-500 text-slate-900 shadow-md" : "bg-transparent text-white/40 hover:text-white"
                         )}
                       >
                         {p.label}
                       </button>
                     ))}
                  </div>

                  {/* Informação do intervalo ativo */}
                  <div className="text-[10px] font-bold text-primary-300 flex items-center gap-1.5 bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20">
                     <Calendar size={13} className="text-primary-400" />
                     <span>
                        {safeFormat(analiseDetalhada.inicioPeriodo, 'dd/MM/yyyy')} {analisePeriodo !== 'hoje' && ` até ${safeFormat(analiseDetalhada.fimPeriodo, 'dd/MM/yyyy')}`}
                     </span>
                     <span className="text-[9px] text-white/40 ml-1">({analiseDetalhada.diasNoPeriodo} {analiseDetalhada.diasNoPeriodo === 1 ? 'dia' : 'dias'})</span>
                  </div>
               </div>

               {/* Controles para alterar dia/semana/mês/ano ou digitar intervalo */}
               <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/5">
                  {analisePeriodo === 'hoje' && (
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Escolher Dia:</span>
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                           <button
                             type="button"
                             onClick={() => {
                               const cur = new Date(`${analiseSelectedDate}T12:00:00`);
                               cur.setDate(cur.getDate() - 1);
                               setAnaliseSelectedDate(format(cur, 'yyyy-MM-dd'));
                             }}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Dia anterior"
                           >
                              <ChevronLeft size={14} />
                           </button>
                           <input
                             type="date"
                             value={analiseSelectedDate}
                             onChange={(e) => e.target.value && setAnaliseSelectedDate(e.target.value)}
                             className="bg-transparent text-[11px] font-black text-white outline-none cursor-pointer uppercase px-1.5"
                           />
                           <button
                             type="button"
                             onClick={() => {
                               const cur = new Date(`${analiseSelectedDate}T12:00:00`);
                               cur.setDate(cur.getDate() + 1);
                               setAnaliseSelectedDate(format(cur, 'yyyy-MM-dd'));
                             }}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Próximo dia"
                           >
                              <ChevronRight size={14} />
                           </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAnaliseSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                          className="px-2.5 py-1 text-[9px] font-black uppercase bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                        >
                           Hoje
                        </button>
                     </div>
                  )}

                  {analisePeriodo === 'semana' && (
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Mudar Semana:</span>
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                           <button
                             type="button"
                             onClick={() => {
                               const cur = new Date(`${analiseSelectedDate}T12:00:00`);
                               cur.setDate(cur.getDate() - 7);
                               setAnaliseSelectedDate(format(cur, 'yyyy-MM-dd'));
                             }}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Semana anterior"
                           >
                              <ChevronLeft size={14} />
                           </button>
                           <span className="text-[10px] font-black text-white px-2">
                              {safeFormat(analiseDetalhada.inicioPeriodo, 'dd/MM')} - {safeFormat(analiseDetalhada.fimPeriodo, 'dd/MM/yyyy')}
                           </span>
                           <button
                             type="button"
                             onClick={() => {
                               const cur = new Date(`${analiseSelectedDate}T12:00:00`);
                               cur.setDate(cur.getDate() + 7);
                               setAnaliseSelectedDate(format(cur, 'yyyy-MM-dd'));
                             }}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Próxima semana"
                           >
                              <ChevronRight size={14} />
                           </button>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                           <span className="text-[9px] text-white/30 font-bold uppercase">Data Ref:</span>
                           <input
                             type="date"
                             value={analiseSelectedDate}
                             onChange={(e) => e.target.value && setAnaliseSelectedDate(e.target.value)}
                             className="bg-transparent text-[11px] font-black text-white outline-none cursor-pointer uppercase"
                           />
                        </div>
                        <button
                          type="button"
                          onClick={() => setAnaliseSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                          className="px-2.5 py-1 text-[9px] font-black uppercase bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                        >
                           Esta Semana
                        </button>
                     </div>
                  )}

                  {analisePeriodo === 'mes' && (
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Mudar Mês:</span>
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                           <button
                             type="button"
                             onClick={() => {
                               const cur = new Date(`${analiseSelectedDate}T12:00:00`);
                               cur.setMonth(cur.getMonth() - 1);
                               setAnaliseSelectedDate(format(cur, 'yyyy-MM-dd'));
                             }}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Mês anterior"
                           >
                              <ChevronLeft size={14} />
                           </button>
                           <input
                             type="month"
                             value={analiseSelectedDate.slice(0, 7)}
                             onChange={(e) => e.target.value && setAnaliseSelectedDate(`${e.target.value}-01`)}
                             className="bg-transparent text-[11px] font-black text-white outline-none cursor-pointer uppercase px-2"
                           />
                           <button
                             type="button"
                             onClick={() => {
                               const cur = new Date(`${analiseSelectedDate}T12:00:00`);
                               cur.setMonth(cur.getMonth() + 1);
                               setAnaliseSelectedDate(format(cur, 'yyyy-MM-dd'));
                             }}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Próximo mês"
                           >
                              <ChevronRight size={14} />
                           </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAnaliseSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                          className="px-2.5 py-1 text-[9px] font-black uppercase bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                        >
                           Este Mês
                        </button>
                     </div>
                  )}

                  {analisePeriodo === 'ano' && (
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Mudar Ano:</span>
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                           <button
                             type="button"
                             onClick={() => setAnaliseSelectedYear(prev => prev - 1)}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Ano anterior"
                           >
                              <ChevronLeft size={14} />
                           </button>
                           <span className="text-[12px] font-black text-white px-3 tracking-wider">{analiseSelectedYear}</span>
                           <button
                             type="button"
                             onClick={() => setAnaliseSelectedYear(prev => prev + 1)}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Próximo ano"
                           >
                              <ChevronRight size={14} />
                           </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAnaliseSelectedYear(new Date().getFullYear())}
                          className="px-2.5 py-1 text-[9px] font-black uppercase bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                        >
                           Ano Atual
                        </button>
                     </div>
                  )}

                  {analisePeriodo === 'custom' && (
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">De:</span>
                        <input
                          type="date"
                          value={analiseCustomRange.start}
                          onChange={(e) => setAnaliseCustomRange(prev => ({ ...prev, start: e.target.value }))}
                          className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-[11px] font-black text-white outline-none cursor-pointer uppercase"
                        />
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Até:</span>
                        <input
                          type="date"
                          value={analiseCustomRange.end}
                          onChange={(e) => setAnaliseCustomRange(prev => ({ ...prev, end: e.target.value }))}
                          className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-[11px] font-black text-white outline-none cursor-pointer uppercase"
                        />
                        <div className="flex items-center gap-1">
                           <button
                             type="button"
                             onClick={() => {
                               const end = new Date();
                               const start = new Date();
                               start.setDate(end.getDate() - 7);
                               setAnaliseCustomRange({
                                 start: format(start, 'yyyy-MM-dd'),
                                 end: format(end, 'yyyy-MM-dd')
                               });
                             }}
                             className="px-2 py-1 text-[8px] font-black uppercase bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                           >
                              Últimos 7d
                           </button>
                           <button
                             type="button"
                             onClick={() => {
                               const end = new Date();
                               const start = new Date();
                               start.setDate(end.getDate() - 30);
                               setAnaliseCustomRange({
                                 start: format(start, 'yyyy-MM-dd'),
                                 end: format(end, 'yyyy-MM-dd')
                               });
                             }}
                             className="px-2 py-1 text-[8px] font-black uppercase bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                           >
                              Últimos 30d
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            </div>

            {/* Cards do periodo selecionado */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
               <div className="p-3 bg-primary-500/10 rounded-xl border border-primary-500/10">
                  <p className="text-[8px] font-black uppercase text-primary-300 tracking-widest mb-1">Faturamento</p>
                  <p className="text-base font-black text-white">R$ {analiseDetalhada.periodo.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
               </div>
               <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <p className="text-[8px] font-black uppercase text-emerald-400 tracking-widest mb-1">Lucro</p>
                  <p className="text-base font-black text-emerald-400">R$ {analiseDetalhada.periodo.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
               </div>
               <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-[8px] font-black uppercase text-white/40 tracking-widest mb-1">Média Diária</p>
                  <p className="text-base font-black text-white">R$ {analiseDetalhada.mediaDiariaPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
               </div>
               <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/10">
                  <p className="text-[8px] font-black uppercase text-purple-300 tracking-widest mb-1">Vendas</p>
                  <p className="text-base font-black text-white">{analiseDetalhada.periodo.count} un</p>
               </div>
            </div>

            {/* Grafico + Produtos mais vendidos lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
               <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-1.5">
                     <h4 className="text-[9px] font-black uppercase text-white/40 tracking-widest">Faturamento x Lucro</h4>
                     <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setShowLinhaFaturamento(!showLinhaFaturamento)}
                          className={cn(
                            "flex items-center gap-1 px-2 h-6 rounded-md text-[8px] font-black uppercase border cursor-pointer transition-all",
                            showLinhaFaturamento ? "bg-[#4cc9f0]/15 text-[#4cc9f0] border-[#4cc9f0]/30" : "bg-white/5 text-white/30 border-white/10"
                          )}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[#4cc9f0]" /> Faturamento
                        </button>
                        <button
                          onClick={() => setShowLinhaLucro(!showLinhaLucro)}
                          className={cn(
                            "flex items-center gap-1 px-2 h-6 rounded-md text-[8px] font-black uppercase border cursor-pointer transition-all",
                            showLinhaLucro ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-white/5 text-white/30 border-white/10"
                          )}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Lucro
                        </button>
                     </div>
                  </div>
                  <div className="h-[190px] w-full">
                     <ChartErrorBoundary>
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analiseDetalhada.linhaGrafico}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                           <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: chartTextColor, fontWeight: 800 }} interval="preserveStartEnd" />
                           <YAxis hide />
                           <Tooltip
                              cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                              contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                              formatter={(value: any, name: string) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, name === 'faturamento' ? 'Faturamento' : 'Lucro']}
                           />
                           {showLinhaFaturamento && <Line type="monotone" dataKey="faturamento" stroke="#4cc9f0" strokeWidth={2} dot={false} />}
                           {showLinhaLucro && <Line type="monotone" dataKey="lucro" stroke="#34d399" strokeWidth={2} dot={false} />}
                        </LineChart>
                     </ResponsiveContainer>
                     </ChartErrorBoundary>
                  </div>
               </div>

               <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex flex-col">
                  <h4 className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-2">Histórico de Vendas</h4>
                  <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar max-h-[190px]">
                     {analiseDetalhada.vendasDoPeriodo.length === 0 && (
                       <p className="text-[10px] text-white/30 text-center py-6">Sem vendas nesse período.</p>
                     )}
                     {analiseDetalhada.vendasDoPeriodo.map((venda) => (
                       <div
                         key={venda.id}
                         onClick={() => { setPendingReceiptOpenId(venda.id); setActiveTab?.('pos'); }}
                         className="flex items-center justify-between gap-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary-500/30 rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors"
                       >
                          <div className="flex items-center gap-1.5 min-w-0">
                             <span className="text-[10px] font-bold text-white truncate">{(venda.customerName || 'Cliente de Balcão').toUpperCase()}</span>
                          </div>
                          <div className="text-right shrink-0 flex items-center gap-1.5">
                             <span className="text-[8px] text-white/30 font-bold">{safeFormat(venda.createdAt, 'dd/MM')}</span>
                             <p className="text-[10px] font-black text-emerald-400">R$ {venda.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>

            <Button className="w-full h-11" onClick={() => { setPendingGoToHistorico(true); setActiveTab?.('pos'); }}>Ver Histórico de Vendas</Button>

            {/* Extrato de Caixa: cada recebimento individual, na ordem exata de hora que entrou */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
               <h4 className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-2">Extrato de Caixa do Período (recebimentos)</h4>
               <div className="space-y-1 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {analiseDetalhada.extratoRecebimentos.length === 0 && (
                    <p className="text-[10px] text-white/30 text-center py-6">Nenhum recebimento nesse período.</p>
                  )}
                  {analiseDetalhada.extratoRecebimentos.map((rec, idx) => {
                     const methodLabel = EXTRATO_PAYMENT_LABELS[rec.method || ''] || rec.method;
                     return (
                       <div key={`${rec.saleId}-${idx}`} className="flex items-center justify-between gap-2 bg-white/5 border border-white/5 rounded-lg px-2.5 py-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                             <span className="text-[9px] font-black text-white/70 shrink-0 tabular-nums">{safeFormat(rec.date, 'dd/MM HH:mm')}</span>
                             <span className="text-[9px] font-bold text-white/50 truncate">{rec.customerName}</span>
                             {methodLabel && <span className="text-[8px] font-black uppercase text-primary-300/70 shrink-0">{methodLabel}</span>}
                          </div>
                          <span className="text-[10px] font-black text-emerald-400 shrink-0">R$ {rec.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                       </div>
                     );
                  })}
               </div>
            </div>
         </div>
      </Modal>

      {/* Widget Customization Sidebar (Drawer) */}
      <Drawer 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        title="Configurar Widget"
        className="w-[450px]"
      >
        {selectedWidget && (
          <div className="p-8 space-y-8 h-full overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-primary-300 tracking-[3px]">Identificação</p>
              <div className="space-y-4">
                <Input 
                  label="Título do Widget" 
                  value={selectedWidget.title} 
                  onChange={(e) => updateWidget({ title: e.target.value })} 
                />
                <Input 
                  label="Subtítulo" 
                  value={selectedWidget.subtitle || ''} 
                  onChange={(e) => updateWidget({ subtitle: e.target.value })} 
                />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-primary-300 tracking-[3px]">Aparência & Layout</p>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <p className="text-[10px] font-bold text-white/40 uppercase">Tamanho</p>
                   <div className="flex bg-white/5 p-1 rounded-xl">
                      {['sm', 'md', 'lg', 'full'].map(s => (
                        <button 
                          key={s} 
                          onClick={() => updateWidget({ size: s as any })}
                          className={cn(
                            "flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                            selectedWidget.size === s ? "bg-white/10 text-white shadow-lg" : "text-white/30 hover:text-white/60"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                   </div>
                 </div>
                 <div className="space-y-2">
                   <p className="text-[10px] font-bold text-white/40 uppercase">Cor Destaque</p>
                   <div className="flex gap-2">
                      {['primary', 'emerald', 'rose', 'amber', 'purple'].map(c => (
                        <button 
                          key={c}
                          onClick={() => updateWidget({ color: c })}
                          className={cn(
                            "w-6 h-6 rounded-full transition-all border-2",
                            selectedWidget.color === c ? "border-white scale-125 shadow-lg shadow-white/20" : "border-transparent opacity-50 hover:opacity-100",
                            c === 'primary' ? 'bg-primary-500' : 
                            c === 'emerald' ? 'bg-emerald-500' : 
                            c === 'rose' ? 'bg-rose-500' : 
                            c === 'amber' ? 'bg-amber-500' : 'bg-purple-500'
                          )}
                        />
                      ))}
                   </div>
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-primary-300 tracking-[3px]">Dados & Inteligência</p>
              <div className="space-y-4">
                 <div className="space-y-2">
                    <p className="text-[10px] font-bold text-white/40 uppercase">Coleção de Dados</p>
                    <select 
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={selectedWidget.dataSource.collection}
                      onChange={(e) => updateWidget({ dataSource: { ...selectedWidget.dataSource, collection: e.target.value } })}
                    >
                      <option value="leads">Leads (CRM)</option>
                      <option value="payments">Pagamentos</option>
                      <option value="saleOrders">Pedidos PDV</option>
                      <option value="tasks">Tarefas</option>
                      <option value="messages">Mensagens Meta</option>
                    </select>
                 </div>
                 
                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                       <RefreshCw size={16} className="text-primary-300" />
                       <span className="text-xs font-bold text-white">Atualização em Tempo Real</span>
                    </div>
                    <button 
                      onClick={() => updateWidget({ autoRefresh: !selectedWidget.autoRefresh })}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-all",
                        selectedWidget.autoRefresh ? "bg-primary-500" : "bg-white/10"
                      )}
                    >
                      <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", selectedWidget.autoRefresh ? "right-1" : "left-1")} />
                    </button>
                 </div>
              </div>
            </div>

            <div className="pt-8 flex gap-4">
                <Button className="flex-1" icon={Check} onClick={() => setIsSidebarOpen(false)}>Salvar Configuração</Button>
                <Button variant="ghost" className="text-rose-400" icon={Trash} onClick={() => removeWidget(selectedWidget.id)}>Excluir</Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Modal Quitar Saldo Devedor */}
      {settleModalOrder && (
        <Modal
          isOpen={!!settleModalOrder}
          onClose={() => setSettleModalOrder(null)}
          title="Quitar Saldo Devedor do Serviço / Venda"
          size="md"
        >
          <div className="space-y-6 p-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white/50">Cliente:</span>
                <span className="text-sm font-black text-white">{(settleModalOrder.customerName || 'Cliente de Balcão').toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white/50">Total do Pedido:</span>
                <span className="text-sm font-bold text-white">R$ {settleModalOrder.total.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-400">Entrada Já Paga:</span>
                <span className="text-sm font-bold text-emerald-400">R$ {(settleModalOrder.downPayment || 0).toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/10 pt-2">
                <span className="text-xs font-black text-rose-400 uppercase">Saldo A Quitar Agora:</span>
                <span className="text-xl font-black text-rose-400">R$ {(settleModalOrder.total - (settleModalOrder.downPayment || 0)).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/60 tracking-wider block">Forma de Recebimento do Saldo</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'pix', label: 'PIX QR' },
                  { id: 'dinheiro', label: 'Dinheiro' },
                  { id: 'cartao_credito', label: 'Cartão Crédito' },
                  { id: 'cartao_debito', label: 'Cartão Débito' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSettleMethod(m.id as any)}
                    className={cn(
                      "py-3 px-3 rounded-xl border text-xs font-bold transition-all text-center",
                      settleMethod === m.id
                        ? "bg-primary-500 border-primary-400 text-slate-900 font-black shadow-lg shadow-primary-500/20"
                        : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setSettleModalOrder(null)}>Cancelar</Button>
              <Button 
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black gap-2"
                onClick={() => handleSettleBalanceInDashboard(settleModalOrder)}
              >
                <CheckCircle2 size={16} />
                <span>Confirmar Recebimento do Saldo</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// --- CHAT PANEL (Right Content) ---
export const ChatPanel = ({ 
  conversation, 
  onClose,
  currentCompany,
  user,
  initialDraft,
  onDraftConsumed,
  fallbackFunnelId,
  onLeadPatched,
}: { 
  conversation: any; 
  onClose?: () => void;
  currentCompany: Company | null;
  user: AppUser | null;
  initialDraft?: string;
  onDraftConsumed?: () => void;
  fallbackFunnelId?: string;
  // Callback opcional: chamado com (leadId, patch) sempre que o ChatPanel salva um
  // campo do lead direto (ex: handleSaveNames). Deixa o componente pai (dono do
  // estado `leads`/`selectedLead`/`selectedChat`) atualizar a lista NA HORA, sem
  // esperar o listener em tempo real do Supabase -- sem isso o nome editado só
  // aparecia certo depois de um refresh manual (o header ficava com o valor
  // antigo ate o realtime devolver a mudanca).
  onLeadPatched?: (leadId: string, patch: Record<string, any>) => void;
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'data' | 'notes' | 'tasks' | 'sales'>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showQuickTemplates, setShowQuickTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Identidade unificada (Nome do WhatsApp / Nome do Contato / Nome Real-Documental) ---
  // Os 3 campos vivem no proprio lead (ver Lead.whatsappName/contactName/fullName em types.ts) e
  // sao editados aqui, iguais nas duas telas que usam este mesmo painel (Funil CRM e Mensagens).
  const [nameFieldsDraft, setNameFieldsDraft] = useState({ whatsappName: '', contactName: '', fullName: '' });

  // Etapas do funil (pra dropdown de mudar etapa direto da conversa) — busca sozinho, sem
  // depender de prop, ja que o ChatPanel e usado tanto no Funil CRM quanto em Mensagens
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([]);
  const [isChangingStage, setIsChangingStage] = useState(false);
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);
  // Se o lead nao tem funnelId salvo (cadastro antigo/incompleto), usa o funil que ja esta
  // selecionado na tela (passado pelo Funil CRM) como respaldo, e aproveita pra corrigir o
  // cadastro do lead na hora, gravando o funnelId que estava faltando
  const effectiveFunnelId = conversation?.funnelId || fallbackFunnelId;
  useEffect(() => {
    if (!effectiveFunnelId) { setFunnelStages([]); return; }
    if (conversation?.id && !conversation?.funnelId && fallbackFunnelId) {
      supabase.from('leads').update({ funnel_id: fallbackFunnelId }).eq('id', conversation.id).then(() => {});
    }
    const loadStages = async () => {
      const { data } = await supabase.from('funnel_stages').select('*').eq('funnel_id', effectiveFunnelId).order('order', { ascending: true });
      setFunnelStages((data || []).map(mapFunnelStageRow));
    };
    loadStages();
    const channel = supabase.channel(`chatpanel-stages-${effectiveFunnelId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'funnel_stages', filter: `funnel_id=eq.${effectiveFunnelId}` }, loadStages).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [effectiveFunnelId, conversation?.id]);

  const handleChangeStageFromChat = async (novaStageId: string) => {
    if (!conversation?.id || novaStageId === conversation.funnelStageId) return;
    setIsChangingStage(true);
    try {
      const { error } = await supabase.from('leads').update({ funnel_stage_id: novaStageId, company_id: 'rafa-arts', updated_at: new Date().toISOString() }).eq('id', conversation.id).eq('company_id', 'rafa-arts');
      if (error) throw error;
    } catch (err) {
      console.error('Erro ao mudar etapa:', err);
      showAlert('Não foi possível mudar a etapa.');
    } finally {
      setIsChangingStage(false);
    }
  };

  // Botao "Sugestao do Robozinho" — le a ultima mensagem do cliente, consulta estoque/produtos
  // reais e monta uma sugestao de resposta. O atendente sempre revisa/edita antes de enviar
  // (o Robozinho nunca envia mensagem sozinho).
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const handleGenerateRobozinhoSuggestion = async () => {
    const lastIncoming = [...messages].reverse().find(m => m.direction === 'incoming' && m.text);
    if (!lastIncoming) { showAlert('Ainda não tem mensagem do cliente nessa conversa pra sugerir uma resposta.'); return; }
    setIsGeneratingSuggestion(true);
    try {
      const [{ data: produtosRows }, { data: configRow }] = await Promise.all([
        supabase.from('produtos').select('name, sale_price, current_stock, tipo_item, controla_estoque, is_active'),
        supabase.from('configuracoes').select('enabled_payment_methods').eq('company_id', 'rafa-arts').maybeSingle(),
      ]);
      const produtos: KnowledgeProduct[] = (produtosRows || []).map((p: any) => ({
        name: p.name, price: Number(p.sale_price) || 0, stock: Number(p.current_stock) || 0,
        tipoItem: p.tipo_item, controlaEstoque: !!p.controla_estoque, isActive: p.is_active !== false,
      }));
      const suggestion = generateSuggestion({
        clientMessage: lastIncoming.text,
        clientName: conversation?.name,
        produtos,
        enabledPaymentMethods: configRow?.enabled_payment_methods || [],
      });
      setNewMessage(suggestion);
    } catch (err) {
      console.error('Erro ao gerar sugestão do Robozinho:', err);
      showAlert('Não foi possível gerar a sugestão agora.');
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };
  const [isSavingNames, setIsSavingNames] = useState(false);
  useEffect(() => {
    setNameFieldsDraft({
      whatsappName: conversation?.whatsappName || '',
      contactName: conversation?.contactName || '',
      fullName: conversation?.fullName || conversation?.name || '',
    });
    setIsStageMenuOpen(false);
  }, [conversation?.id]);
  const nomesMudaram = conversation && (
    nameFieldsDraft.whatsappName !== (conversation.whatsappName || '') ||
    nameFieldsDraft.contactName !== (conversation.contactName || '') ||
    nameFieldsDraft.fullName !== (conversation.fullName || conversation.name || '')
  );
  const handleSaveNames = async () => {
    if (!conversation?.id) return;
    setIsSavingNames(true);
    try {
      const fullNameFinal = nameFieldsDraft.fullName.trim() || conversation.name;
      const patch = {
        whatsapp_name: nameFieldsDraft.whatsappName.trim(),
        contact_name: nameFieldsDraft.contactName.trim(),
        full_name: fullNameFinal,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('leads').update(patch).eq('id', conversation.id);
      if (error) throw error;
      // Atualiza a lista do componente pai (leads/selectedLead/selectedChat) na hora --
      // ver comentario do prop onLeadPatched acima.
      onLeadPatched?.(conversation.id, {
        whatsappName: patch.whatsapp_name,
        contactName: patch.contact_name,
        fullName: patch.full_name,
      });
    } catch (err) {
      console.error('Erro ao salvar nomes:', err);
      showAlert('Não foi possível salvar os nomes.');
    } finally {
      setIsSavingNames(false);
    }
  };

  // --- Telefone (editavel + copiar) ---
  // O telefone e' a CHAVE de correlacao com o chat (crm_messages.phone, ver loadMessages
  // acima) -- editar so o lead.phone e deixar as mensagens antigas com o telefone velho
  // "quebraria" o historico (a conversa sumiria da tela, so reaparecendo se o cliente
  // mandar mensagem de novo). Por isso handleSavePhone atualiza os dois em conjunto.
  const [phoneDraft, setPhoneDraft] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  useEffect(() => {
    setPhoneDraft(conversation?.phone || '');
  }, [conversation?.id]);
  const phoneMudou = conversation && phoneDraft.replace(/\D/g, '') !== (conversation.phone || '').replace(/\D/g, '');
  const handleSavePhone = async () => {
    if (!conversation?.id) return;
    const novoPhone = phoneDraft.replace(/\D/g, '');
    if (!novoPhone) { showAlert('Informe um telefone válido.'); return; }
    const phoneAntigo = conversation.phone || '';
    setIsSavingPhone(true);
    try {
      const { error } = await supabase.from('leads').update({ phone: novoPhone, updated_at: new Date().toISOString() }).eq('id', conversation.id);
      if (error) throw error;
      // Reata o historico de mensagens ao novo telefone -- sem isso o chat some da tela
      // (loadMessages filtra por phone=eq.<novo>, mas as linhas antigas ainda tem o telefone velho).
      if (phoneAntigo && phoneAntigo !== novoPhone) {
        await supabase.from('crm_messages').update({ phone: novoPhone }).eq('company_id', 'rafa-arts').eq('phone', phoneAntigo);
      }
      onLeadPatched?.(conversation.id, { phone: novoPhone });
      showAlert('Telefone atualizado!');
    } catch (err) {
      console.error('Erro ao salvar telefone:', err);
      showAlert('Não foi possível salvar o telefone.');
    } finally {
      setIsSavingPhone(false);
    }
  };
  const handleCopyPhone = async () => {
    const valor = conversation?.phone || '';
    if (!valor) return;
    try {
      await navigator.clipboard.writeText(valor);
      showAlert('Telefone copiado!');
    } catch (err) {
      console.error('Erro ao copiar telefone:', err);
      showAlert('Não foi possível copiar o telefone.');
    }
  };

  // --- Cliente vinculado (cadastro unificado em Contatos/Clientes) -- casado pelo telefone,
  // igual convencao ja usada no resto do sistema (ultimos 8 digitos). Usado tanto pro bloco de
  // Endereco quanto pra decidir, no "Iniciar Venda", se atualiza um cadastro existente ou cria
  // um novo (ver handleStartSale abaixo).
  const [clienteVinculado, setClienteVinculado] = useState<any>(null);
  const [isLoadingCliente, setIsLoadingCliente] = useState(false);
  useEffect(() => {
    let ativo = true;
    const digitos = (conversation?.phone || '').replace(/\D/g, '');
    if (!digitos || digitos.length < 6) { setClienteVinculado(null); return; }
    setIsLoadingCliente(true);
    const ultimos8 = digitos.slice(-8);
    supabase.from('clientes').select('*')
      .or(`phone.ilike.%${ultimos8}%,telefone_alternativo.ilike.%${ultimos8}%`)
      .limit(1).maybeSingle()
      .then(({ data }) => { if (ativo) { setClienteVinculado(data || null); setIsLoadingCliente(false); } });
    return () => { ativo = false; };
  }, [conversation?.phone]);

  // --- Notas internas e Tarefas ---
  // Notas reaproveitam a mesma collection/consulta de mensagens (ja carregada pro chat, ver
  // useEffect abaixo) filtrando por isNote -- assim nao duplica listener nem dado.
  const notes = messages.filter(m => m.isNote);
  const chatMessages = messages.filter(m => !m.isNote);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const handleAddNote = async () => {
    if (!newNoteText.trim() || !conversation || !currentCompany) return;
    setIsSavingNote(true);
    try {
      await supabase.from('crm_messages').insert({
        company_id: 'rafa-arts',
        lead_id: conversation.id || null,
        phone: conversation.phone,
        text: newNoteText.trim(),
        direction: 'note',
        is_note: true,
        sender_name: user?.name || 'Sistema',
        channel: conversation.sourceType || 'WhatsApp',
        // Histórico de versões: admin pode navegar
        versions: [{
          text: newNoteText.trim(),
          editedAt: new Date().toISOString(),
          editedBy: user?.name || 'Sistema',
          versionIndex: 0,
        }],
        current_version_index: 0,
      });
      setNewNoteText('');
    } catch (err) {
      console.error('Erro ao salvar nota:', err);
      showAlert('Não foi possível salvar a nota.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (note: any) => {
    // ✅ Só Admin pode excluir
    if (!user?.isAdmin) {
      showAlert('Apenas administradores podem excluir notas.');
      return;
    }
    if (!(await showConfirm('Excluir esta nota permanentemente?'))) return;
    try { 
      await supabase.from('crm_messages').delete().eq('id', note.id); 
    } catch (err) { 
      console.error('Erro ao excluir nota:', err);
      showAlert('Não foi possível excluir a nota.');
    }
  };

  // ✅ Admin pode editar notas (navegar por histórico)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [noteVersionIndex, setNoteVersionIndex] = useState(0);

  const handleEditNote = async (note: any, newText: string) => {
    if (!user?.isAdmin && note.senderName !== user?.name) {
      showAlert('Você só pode editar suas próprias notas.');
      return;
    }
    try {
      const currentVersions = note.versions || [];
      const newVersions = [
        ...currentVersions,
        {
          text: newText,
          editedAt: new Date().toISOString(),
          editedBy: user?.name || 'Sistema',
          versionIndex: currentVersions.length,
        },
      ];
      
      await supabase.from('crm_messages').update({
        text: newText,
        versions: newVersions,
        current_version_index: newVersions.length - 1,
        last_edited_at: new Date().toISOString(),
        last_edited_by: user?.name || 'Sistema',
      }).eq('id', note.id);
      
      setEditingNoteId(null);
      setEditingNoteText('');
      showAlert('Nota atualizada com sucesso.');
    } catch (err) {
      console.error('Erro ao editar nota:', err);
      showAlert('Não foi possível editar a nota.');
    }
  };

  // ✅ Admin pode navegar entre versões
  const handleViewNoteVersion = (note: any, versionIndex: number) => {
    if (!user?.isAdmin) return;
    if (versionIndex < 0 || versionIndex >= (note.versions?.length || 1)) return;
    setNoteVersionIndex(versionIndex);
    const version = note.versions?.[versionIndex];
    setEditingNoteText(version?.text || note.text || '');
  };

  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSavingTask, setIsSavingTask] = useState(false);
  const taskInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (activeTab === 'notes') setTimeout(() => noteInputRef.current?.focus(), 100);
    if (activeTab === 'tasks') setTimeout(() => taskInputRef.current?.focus(), 100);
  }, [activeTab]);
  useEffect(() => {
    if (!conversation?.id || !currentCompany) { setTasks([]); return; }
    const q = query(collection(db, 'tasks'), where('companyId', '==', currentCompany.id), where('relatedId', '==', conversation.id));
    return onSnapshot(q, (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [conversation?.id, currentCompany]);
  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !conversation?.id || !currentCompany) return;
    setIsSavingTask(true);
    try {
      await addDoc(collection(db, 'tasks'), {
        companyId: currentCompany.id,
        title: newTaskTitle.trim(),
        relatedType: 'lead',
        relatedId: conversation.id,
        assignedUserId: user?.id || null,
        createdAt: Timestamp.now(),
      });
      setNewTaskTitle('');
    } catch (err) {
      console.error('Erro ao criar tarefa:', err);
      showAlert('Não foi possível criar a tarefa.');
    } finally {
      setIsSavingTask(false);
    }
  };
  const handleToggleTask = async (task: any) => {
    try { await updateDoc(doc(db, 'tasks', task.id), { completedAt: task.completedAt ? null : Timestamp.now() }); }
    catch (err) { console.error('Erro ao atualizar tarefa:', err); }
  };
  const handleDeleteTask = async (task: any) => {
    if (!(await showConfirm('Excluir esta tarefa?'))) return;
    try { await deleteDoc(doc(db, 'tasks', task.id)); } catch (err) { console.error('Erro ao excluir tarefa:', err); }
  };

  // --- Vendas do cliente (mesmo telefone) -- fecha o ciclo conversa -> nota -> contrato/orçamento,
  // reaproveitando a navegacao com destaque que a Ficha do Cliente ja usa (pendingOpenContratoId /
  // pendingOpenOrcamentoId / pendingReceiptOpenId, ver AppContext).
  const [clienteVendas, setClienteVendas] = useState<any[]>([]);
  const [isLoadingVendas, setIsLoadingVendas] = useState(false);
  useEffect(() => {
    let ativo = true;
    const digitos = (conversation?.phone || '').replace(/\D/g, '');
    if (!digitos || digitos.length < 6) { setClienteVendas([]); return; }
    setIsLoadingVendas(true);
    const ultimos8 = digitos.slice(-8);
    supabase.from('vendas')
      .select('id, customer_name, customer_phone, total, status, down_payment, contrato_id, orcamento_id, created_at')
      .is('deleted_at', null)
      .ilike('customer_phone', `%${ultimos8}%`)
      .order('created_at', { ascending: false })
      .limit(15)
      .then(({ data }) => { if (ativo) { setClienteVendas(data || []); setIsLoadingVendas(false); } });
    return () => { ativo = false; };
  }, [conversation?.phone]);

  // --- Transcrição de áudio ---
  // Toggle por conversa (salvo no proprio lead, ver Lead em types.ts) -- fica identico nas duas
  // telas (Funil CRM e Mensagens) porque as duas leem/escrevem o mesmo documento. O gatilho em si
  // e' manual (botao "Transcrever" em cada mensagem de audio) porque este projeto ainda nao tem
  // nenhum provedor de voz-para-texto conectado -- ver lib/audioTranscription.ts.
  const [transcribingId, setTranscribingId] = useState<string | null>(null);
  const handleTranscribeAudio = async (message: any) => {
    if (!message?.id || !message?.mediaUrl) {
      showAlert('Esse áudio não tem um arquivo associado pra transcrever.');
      return;
    }
    setTranscribingId(message.id);
    try {
      const texto = await transcribeAudioMessage(message.mediaUrl);
      await supabase.from('crm_messages').update({
        transcription: { text: texto, isAutomatic: false, isVisible: true },
      }).eq('id', message.id);
    } catch (err: any) {
      showAlert(err?.message || 'Não foi possível transcrever esse áudio.');
    } finally {
      setTranscribingId(null);
    }
  };
  const handleToggleAutoTranscribe = async () => {
    if (!conversation?.id) return;
    try {
      await supabase.from('leads').update({ auto_transcribe: !conversation.autoTranscribe }).eq('id', conversation.id);
    } catch (err) {
      console.error('Erro ao atualizar transcrição automática:', err);
    }
  };

  const { setPrefilledCustomer, activeTab: rootActiveTab, setActiveTab: setRootActiveTab, setPendingReceiptOpenId, setPendingOpenContratoId, setPendingOpenOrcamentoId, setPendingOpenLeadId, setPendingWhatsAppShare } = React.useContext(AppContext)!;

  // Atalho pra alternar entre Funil CRM e Mensagens mantendo o MESMO lead selecionado --
  // as duas telas usam esse mesmo ChatPanel, entao so precisamos trocar de aba e avisar a
  // outra tela (via pendingOpenLeadId ou pendingWhatsAppShare) qual lead deixar selecionado.
  const handleJumpToOtherView = () => {
    if (!conversation?.id) return;
    if (rootActiveTab === 'crm') {
      setPendingWhatsAppShare({ leadId: conversation.id, prefillMessage: '' });
      setRootActiveTab('messages');
    } else {
      setPendingOpenLeadId(conversation.id);
      setRootActiveTab('crm');
    }
  };


  // "Iniciar Venda": se ja existe cliente cadastrado com esse telefone (clienteVinculado), manda o
  // id junto -- o PDV abre com o cadastro ja vinculado em vez de criar um novo. Aproveita e
  // completa, no cadastro existente, o nome do WhatsApp/contato se ainda estiverem vazios (sem
  // sobrescrever nada que ja tinha).
  const handleStartSale = () => {
    if (!setPrefilledCustomer || !conversation) return;
    const nomeReal = (conversation.fullName || conversation.name || '').trim();
    if (clienteVinculado) {
      setPrefilledCustomer({ id: clienteVinculado.id, name: clienteVinculado.full_name || nomeReal, phone: clienteVinculado.phone || conversation.phone || '' });
      if (!clienteVinculado.whatsapp_name || !clienteVinculado.contact_name) {
        supabase.from('clientes').update({
          whatsapp_name: clienteVinculado.whatsapp_name || conversation.whatsappName || null,
          contact_name: clienteVinculado.contact_name || conversation.contactName || null,
        }).eq('id', clienteVinculado.id).then(() => {});
      }
    } else {
      setPrefilledCustomer({ name: nomeReal, phone: conversation.phone || '' });
    }
    setRootActiveTab?.('pos');
  };

  useEffect(() => {
    if (initialDraft && conversation?.id) {
      setNewMessage(initialDraft);
      onDraftConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, initialDraft]);

  const quickTemplates = [
    { label: '👋 Boas-vindas', text: 'Olá! Seja bem-vindo(a). Como posso te ajudar com o seu pedido hoje?' },
    { label: '💰 Orçamento PIX', text: 'Segue o resumo do seu orçamento. Para dar início à produção, aceitamos entrada via PIX de 50%.' },
    { label: '✅ Pagamento Confirmado', text: 'Confirmamos o recebimento do seu pagamento! Seu pedido já está em fase de produção.' },
    { label: '📦 Pedido Pronto', text: 'Notícia boa! Seu pedido ficou pronto e já está disponível para retirada/entrega.' },
    { label: '📅 Agendamento Entrega', text: 'Prezado(a) cliente, confirmando seu agendamento de entrega para a data e horário combinados.' },
  ];

  useEffect(() => {
    if (!conversation || !currentCompany) return;
    const loadMessages = async () => {
      const { data } = await supabase.from('crm_messages').select('*')
        .eq('company_id', 'rafa-arts')
        .eq('phone', conversation.phone)
        .order('created_at', { ascending: true });
      setMessages((data || []).map(mapCrmMessageRow));
    };
    loadMessages();
    const channel = supabase.channel(`chat-messages-${conversation.phone}`).on('postgres_changes', { event: '*', schema: 'public', table: 'crm_messages', filter: `phone=eq.${conversation.phone}` }, loadMessages).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversation, currentCompany]);

  // Presenca do contato (online / digitando / gravando audio / visto por ultimo) —
  // mostrado no header do chat (ver bloco do header mais abaixo). Assina a presenca
  // desse chat na Evolution API toda vez que a conversa abre (sem isso a Evolution/
  // Baileys nem manda o evento PRESENCE_UPDATE pra esse numero), depois escuta a
  // tabela whatsapp_presence em tempo real.
  const [presence, setPresence] = useState<{ status: string; lastSeenAt?: string } | null>(null);
  useEffect(() => {
    if (!conversation?.phone || conversation?.channel !== 'WhatsApp' && conversation?.sourceType !== 'WhatsApp') {
      setPresence(null);
      return;
    }
    const phoneDigits = (conversation.phone || '').replace(/\D/g, '');
    if (!phoneDigits) { setPresence(null); return; }

    fetch('/api/whatsapp-presence-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
      body: JSON.stringify({ phone: phoneDigits }),
    }).catch((err) => console.error('Falha ao assinar presença (não impede o resto):', err));

    const loadPresence = async () => {
      const { data } = await supabase.from('whatsapp_presence').select('status,last_seen_at')
        .eq('company_id', 'rafa-arts').eq('phone', phoneDigits).maybeSingle();
      setPresence(data ? { status: data.status, lastSeenAt: data.last_seen_at || undefined } : null);
    };
    loadPresence();
    const presenceChannel = supabase.channel(`chat-presence-${phoneDigits}`).on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'whatsapp_presence', filter: `phone=eq.${phoneDigits}` },
      loadPresence
    ).subscribe();
    return () => { supabase.removeChannel(presenceChannel); };
  }, [conversation?.phone, conversation?.channel, conversation?.sourceType]);

  const presenceLabel = (() => {
    if (!presence) return null;
    if (presence.status === 'composing') return 'digitando...';
    if (presence.status === 'recording') return 'gravando áudio...';
    if (presence.status === 'available') return 'online';
    if (presence.lastSeenAt) {
      const d = new Date(presence.lastSeenAt);
      const hoje = d.toDateString() === new Date().toDateString();
      return `visto por último ${hoje ? 'hoje às' : format(d, "dd/MM 'às'")} ${format(d, 'HH:mm')}`;
    }
    return null;
  })();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation || !currentCompany) return;
    const textoEnviado = newMessage;
    try {
      const { data: msgRow } = await supabase.from('crm_messages').insert({
        company_id: 'rafa-arts',
        lead_id: conversation.id || null,
        phone: conversation.phone,
        text: textoEnviado,
        direction: 'outgoing',
        sender_name: user?.name || 'Sistema',
        channel: conversation.sourceType || 'WhatsApp',
      }).select('id').single();
      // Also update lead's last message
      await supabase.from('leads').update({
        last_message_text: textoEnviado,
        last_message_direction: 'outgoing',
        waiting_since: null,
        updated_at: new Date().toISOString(),
      }).eq('id', conversation.id);
      setNewMessage('');

      // Dispara a mensagem de verdade pro WhatsApp (so pra conversas desse canal —
      // outros canais como Instagram/Facebook ainda nao tem envio real conectado)
      const canal = (conversation.sourceType || conversation.channel || 'WhatsApp');
      if (canal === 'WhatsApp' && conversation.phone) {
        try {
          const resp = await fetch('/api/whatsapp-send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
            body: JSON.stringify({ phone: conversation.phone, text: textoEnviado }),
          });
          const respData = await resp.json().catch(() => ({}));
          if (!resp.ok) {
            showAlert(`A mensagem ficou salva aqui no sistema, mas não foi possível enviar pro WhatsApp de verdade: ${respData.error || 'erro desconhecido'}`);
          } else if (respData.whatsappMessageId && msgRow?.id) {
            // Guarda o id que a Evolution API deu pra essa mensagem -- e o que permite ao
            // webhook (que recebe o "eco" dessa mesma mensagem, com fromMe:true) reconhecer
            // que ela ja foi gravada por aqui e nao duplicar na conversa (ver whatsapp-webhook.js).
            await supabase.from('crm_messages').update({ whatsapp_message_id: respData.whatsappMessageId }).eq('id', msgRow.id);
          }
        } catch (sendErr) {
          console.error('Falha ao disparar mensagem pro WhatsApp:', sendErr);
          showAlert('A mensagem ficou salva aqui no sistema, mas não foi possível enviar pro WhatsApp de verdade (falha de conexão).');
        }
      }
    } catch (err) {
      console.error('Falha ao enviar mensagem:', err);
    }
  };

  const handleSimulateClientMessage = async (customText?: string) => {
    if (!conversation || !currentCompany) return;
    const clientText = customText || (await showPrompt('Digite a mensagem enviada pelo cliente para teste:', 'Olá! Gostaria de saber como está o andamento do meu pedido e prazo de entrega.')) || '';
    if (!clientText.trim()) return;

    try {
      await supabase.from('crm_messages').insert({
        company_id: 'rafa-arts',
        lead_id: conversation.id || null,
        phone: conversation.phone || '(62) 99999-9999',
        text: clientText,
        direction: 'incoming',
        sender_name: conversation.name || 'Cliente de Teste',
        channel: conversation.channel || conversation.sourceType || 'WhatsApp',
      });

      await supabase.from('leads').update({
        last_message_text: clientText,
        last_message_direction: 'incoming',
        waiting_since: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', conversation.id);
    } catch (err) {
      console.error('Falha ao simular mensagem do cliente:', err);
    }
  };

  // Mock permissions (in real app, fetch from RolePermissions)
  const permissions = {
    canStartNote: true,
    canSendSavedMessage: true,
    canCreateCard: true,
    canAddTask: true,
    canStartPosSale: true,
    canMoveLead: true,
    canViewCustomerData: true,
    canViewAttachments: true,
    canTranscribeAudio: true,
  };

  const tabs = [
    { id: 'chat', label: 'Conversa', icon: MessageSquare },
    { id: 'data', label: 'Dados', icon: Users },
    { id: 'notes', label: 'Notas', icon: StickyNote },
    { id: 'tasks', label: 'Tarefas', icon: ListTodo },
    { id: 'sales', label: 'Vendas', icon: ShoppingBag },
  ];

  const quickActions = [
    { id: 'note', icon: StickyNote, label: 'Nota Interna', color: 'text-amber-400', permission: permissions.canStartNote, onClick: () => setActiveTab('notes') },
    { id: 'saved', icon: MessageSquare, label: 'Msg Salva', color: 'text-primary-300', permission: permissions.canSendSavedMessage, onClick: () => setActiveTab('saved') },
    { id: 'task', icon: ListTodo, label: 'Tarefa', color: 'text-purple-400', permission: permissions.canAddTask, onClick: () => setActiveTab('tasks') },
    { id: 'pos', icon: ShoppingBag, label: 'Venda PDV', color: 'text-blue-400', permission: permissions.canStartPosSale, onClick: handleStartSale },
  ];


  if (!conversation) return (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center p-12 text-center space-y-4">
      <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center text-white/10">
        <MessageSquare size={48} />
      </div>
      <h3 className="text-xl font-bold text-white/40">Selecione uma conversa</h3>
      <p className="text-sm text-white/20 max-w-xs italic uppercase tracking-widest font-black">
        Clique em um lead ou mensagem para abrir o painel de atendimento
      </p>
    </div>
  );

  return (
    <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden bg-white/3 border-white/10 relative h-full fixed md:static inset-0 z-50 md:z-auto rounded-none md:rounded-[inherit]">
      {/* Header - FIXO */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02] flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Botão Voltar — só no mobile: sai do Modo Conversa em Foco e retorna à lista, sem recarregar a página */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="md:hidden flex items-center gap-1 -ml-1 mr-1 px-2 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all shrink-0"
            >
              <ArrowLeft size={18} />
              <span className="text-[10px] font-black uppercase tracking-wider">Voltar</span>
            </button>
          )}
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center font-bold text-white text-base border border-primary-500/30">
              {conversation.name?.[0] || 'C'}
            </div>
            {/* Bolinha verde SO quando o contato esta realmente online agora
                (presence.status === 'available') -- antes era fixa/decorativa. */}
            {presence?.status === 'available' && (
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0f172a]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white">{conversation.name}</h4>
              <Badge variant="outline" className="text-[7px] py-0 px-1 leading-none h-3.5">{conversation.channel}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-0">
              {/* Status de presenca real (online/digitando/gravando/visto por ultimo) —
                  ver useEffect de presence acima. Sem dado nenhum ainda (chat que
                  nunca foi assinado, ou Evolution API sem suporte), cai no rotulo
                  neutro "Ativo" de antes, pra nao ficar em branco. */}
              {presenceLabel ? (
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  (presence?.status === 'composing' || presence?.status === 'recording') ? "text-primary-400 animate-pulse"
                    : presence?.status === 'available' ? "text-emerald-400"
                    : "text-white/40"
                )}>
                  {presenceLabel}
                </span>
              ) : (
                <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Ativo</span>
              )}
              <span className="text-[9px] text-white/20">•</span>
              <button
                onClick={handleCopyPhone}
                disabled={!conversation.phone}
                title="Copiar telefone"
                className="flex items-center gap-1 text-[9px] text-white/40 font-bold hover:text-primary-300 transition-colors disabled:opacity-40 disabled:hover:text-white/40"
              >
                {conversation.phone || '(62) 99999-9999'}
                <Copy size={9} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 p-0.5 rounded-lg mr-1">
            {quickActions.filter(a => a.permission).slice(0, 6).map(action => (
              <Button 
                key={action.id}
                variant="ghost" 
                size="sm" 
                className={cn("p-1.5 min-w-0 h-8 w-8 border-none", action.color)} 
                icon={action.icon}
                title={action.label}
                onClick={action.onClick}
              />
            ))}
            {/* ✅ Botão para ver mais ações (se tiver mais de 6) */}
            {quickActions.filter(a => a.permission).length > 6 && (
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1.5 min-w-0 h-8 w-8 border-none text-white/40 hover:text-primary-300" 
                  icon={MoreHorizontal}
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  title="Mais ações"
                />
                {showQuickActions && (
                  <div className="absolute top-full mt-1 right-0 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 p-2 min-w-[200px]">
                    {quickActions.filter(a => a.permission).slice(6).map(action => (
                      <button
                        key={action.id}
                        onClick={() => {
                          action.onClick();
                          setShowQuickActions(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-2 transition-all",
                          action.color,
                          "hover:bg-white/10"
                        )}
                        title={action.label}
                      >
                        <action.icon size={12} />
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {onClose && <Button variant="ghost" icon={X} onClick={onClose} className="hidden md:flex p-1.5 min-w-0 h-8 w-8" />}
        </div>
      </div>

      {/* Dropdown de Etapa do Funil — muda a etapa da conversa direto daqui, sem precisar
          arrastar no Kanban. So aparece se essa conversa tiver um lead/funil vinculado.
          Dropdown customizado (em vez de <select> nativo) pra a listinha que abre tambem
          ficar no mesmo visual do resto do app — o <select> do navegador nao da pra estilizar
          direito. Cada etapa usa a cor cadastrada em Configurar > Etapas do Processo. */}
      {effectiveFunnelId && funnelStages.length > 0 ? (() => {
        const currentStage = funnelStages.find(s => s.id === conversation.funnelStageId);
        const stageColor = currentStage?.color || '#4cc9f0';
        return (
          <div className="flex items-center gap-2 w-full py-3 px-3 border-b border-white/10 bg-white/[0.015] flex-shrink-0">
            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => setIsStageMenuOpen(o => !o)}
                disabled={isChangingStage}
                className="w-full flex items-center gap-2 rounded-full pl-3 pr-2.5 py-2.5 border transition-colors disabled:opacity-50"
                style={{ backgroundColor: `${stageColor}22`, borderColor: `${stageColor}66` }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stageColor }} />
                <span className="flex-1 text-left text-[10px] font-black uppercase tracking-widest truncate" style={{ color: stageColor }}>
                  {currentStage?.name || 'Selecionar etapa'}
                </span>
                <ChevronDown size={12} className={cn("shrink-0 transition-transform duration-200", isStageMenuOpen && "rotate-180")} style={{ color: stageColor }} />
              </button>

              {isStageMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsStageMenuOpen(false)} />
                  <div className="absolute top-full mt-2 left-0 right-0 min-w-[200px] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                    {funnelStages.map(stage => {
                      const isActive = stage.id === conversation.funnelStageId;
                      const c = stage.color || '#4cc9f0';
                      return (
                        <button
                          key={stage.id}
                          type="button"
                          onClick={() => { handleChangeStageFromChat(stage.id); setIsStageMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all text-left",
                            isActive ? "bg-white/[0.08]" : "hover:bg-white/5"
                          )}
                        >
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
                          <span className="flex-1 truncate normal-case" style={{ color: isActive ? c : 'rgba(255,255,255,0.75)' }}>{stage.name}</span>
                          {isActive && <Check size={13} style={{ color: c }} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handleJumpToOtherView}
              title={rootActiveTab === 'crm' ? 'Ver Conversa em Mensagens' : 'Ver Card no Funil CRM'}
              className="text-primary-300 hover:text-primary-200 transition-colors shrink-0"
            >
              <ExternalLink size={13} />
            </button>
          </div>
        );
      })() : (
        <button
          onClick={handleJumpToOtherView}
          className="flex items-center justify-center gap-1.5 w-full py-1.5 border-b border-white/10 bg-white/[0.015] text-[9px] font-black uppercase tracking-widest text-primary-300 hover:bg-white/5 hover:text-primary-200 transition-colors flex-shrink-0"
        >
          <ExternalLink size={11} />
          {rootActiveTab === 'crm' ? 'Ver Conversa em Mensagens' : 'Ver Card no Funil CRM'}
        </button>
      )}

      {/* Tabs - FIXO */}
      <div className="flex flex-wrap border-b border-white/5 bg-white/[0.01] px-2 flex-shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-3 py-2 text-[9px] font-black uppercase tracking-[1px] transition-all relative whitespace-nowrap",
              activeTab === tab.id ? "text-primary-300" : "text-white/30 hover:text-white/60"
            )}
          >
            <div className="flex items-center gap-1.5">
              <tab.icon size={10} />
              {tab.label}
            </div>
            {activeTab === tab.id && (
              <motion.div layoutId="activeChatTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {/* Content Area - SCROLL apenas aqui */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
                 {chatMessages.length === 0 && (
                   <div className="flex flex-col items-center justify-center h-full space-y-3 py-10">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
                        <MessageSquare size={24} />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-xs font-bold text-white/70">Nenhuma mensagem registrada ainda</p>
                        <p className="text-[10px] text-white/30 font-medium">Inicie o atendimento com uma mensagem do atendente ou simule uma chegada do cliente:</p>
                      </div>

                      <div className="space-y-2 text-center pt-2 w-full max-w-md">
                        <p className="text-[9px] font-black uppercase tracking-wider text-emerald-400">Respostas do Atendente:</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {quickTemplates.map((tpl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setNewMessage(tpl.text)}
                              className="text-[10px] font-medium bg-white/5 hover:bg-primary-500/20 hover:text-primary-300 text-white/70 px-3 py-1.5 rounded-xl border border-white/10 hover:border-primary-500/30 transition-all cursor-pointer"
                            >
                              {tpl.label}
                            </button>
                          ))}
                        </div>
                      </div>
                   </div>
                 )}
                 
                 {chatMessages.map((m, idx) => {
                    const isOutgoing = m.direction === 'outgoing';
                    const msgDate = parseMsgDate(m.createdAt);
                    // Mostra so a hora quando a mensagem e' de hoje; senao mostra
                    // data + hora, pra sempre dar pra saber QUANDO foi mandada.
                    const timeStr = msgDate
                      ? (msgDate.toDateString() === new Date().toDateString()
                          ? format(msgDate, 'HH:mm')
                          : format(msgDate, 'dd/MM HH:mm'))
                      : '';
                    // mediaContentType vem do webhook (crm_messages.content_type, ver
                    // mapCrmMessageRow) -- so existe quando a mensagem realmente tem um
                    // arquivo de midia baixado e salvo no Storage (m.mediaUrl preenchido).
                    const isAudio = m.mediaContentType === 'audio' || m.contentType === 'audio' || m.mediaType === 'audio';
                    const isImage = m.mediaContentType === 'image' && !!m.mediaUrl;
                    const isVideo = m.mediaContentType === 'video' && !!m.mediaUrl;
                    const isDocument = m.mediaContentType === 'document' && !!m.mediaUrl;
                    
                    return (
                      <div key={m.id || idx} className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}>
                        <div className={cn("group space-y-1", isOutgoing ? "text-right" : "")}>
                           <div className={cn(
                             "max-w-[85%] rounded-2xl border text-xs text-slate-800 leading-relaxed shadow-sm bg-white",
                             (isImage || isVideo) ? "p-1.5" : "p-2.5",
                             isOutgoing 
                               ? "rounded-br-none border-primary-200 text-left ml-auto" 
                               : "rounded-bl-none border-slate-200"
                           )}>
                              {isImage ? (
                                <div className="space-y-1.5 min-w-[160px]">
                                   <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl">
                                     <img src={m.mediaUrl} alt={m.fileName || 'Imagem recebida'} className="max-w-full max-h-64 object-cover rounded-xl hover:opacity-90 transition-opacity" loading="lazy" />
                                   </a>
                                   {m.text && m.text !== '📷 Imagem' && (
                                     <p className="px-1.5 pb-1">{m.text}</p>
                                   )}
                                </div>
                              ) : isVideo ? (
                                <div className="space-y-1.5 min-w-[200px]">
                                   <video src={m.mediaUrl} controls preload="metadata" className="max-w-full max-h-64 rounded-xl bg-black" />
                                   {m.text && m.text !== '🎥 Vídeo' && (
                                     <p className="px-1.5 pb-1">{m.text}</p>
                                   )}
                                </div>
                              ) : isDocument ? (
                                <a
                                  href={m.mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={m.fileName || undefined}
                                  className="flex items-center gap-2.5 min-w-[200px] max-w-[260px] group/doc"
                                >
                                   <div className="w-9 h-9 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                                     <FileText size={16} />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                     <p className="font-bold text-slate-700 truncate">{m.fileName || 'Documento'}</p>
                                     <p className="text-[9px] font-black uppercase tracking-widest text-primary-500 flex items-center gap-1">
                                       <Download size={10} /> Baixar arquivo
                                     </p>
                                   </div>
                                </a>
                              ) : isAudio ? (
                                <div className="space-y-1.5 min-w-[180px]">
                                   <div className="flex items-center gap-1.5 text-slate-500">
                                     <FileAudio size={13} /> <span className="font-bold">Mensagem de áudio</span>
                                   </div>
                                   {m.mediaUrl && (
                                     <audio src={m.mediaUrl} controls preload="none" className="w-full h-8" />
                                   )}
                                   {m.transcription?.text ? (
                                     <p className="italic text-slate-600 border-t border-slate-100 pt-1.5">"{m.transcription.text}"</p>
                                   ) : (
                                     <button
                                       onClick={() => handleTranscribeAudio(m)}
                                       disabled={transcribingId === m.id}
                                       className="text-[9px] font-black uppercase text-primary-600 hover:text-primary-700 flex items-center gap-1 disabled:opacity-50"
                                     >
                                       {transcribingId === m.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} Transcrever
                                     </button>
                                   )}
                                </div>
                              ) : m.text}
                           </div>
                           <p className={cn("text-[8px] font-bold uppercase", isOutgoing ? "text-primary-300/30 mr-1" : "text-white/20 ml-1")}>
                             {timeStr} • {isOutgoing ? 'Sistema' : m.senderName || 'Cliente'}
                           </p>
                        </div>
                      </div>
                    );
                 })}
                 <div ref={messagesEndRef} />
              </div>

              {/* Chat Input - FIXO */}
              <div className="p-3 bg-slate-100/50 border-t border-white/10 space-y-2 flex-shrink-0">
                {/* BARRA DE RESPOSTAS RÁPIDAS / MENSAGENS SALVAS — escondida por padrão, só abre se clicar */}
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  <button
                    type="button"
                    onClick={handleGenerateRobozinhoSuggestion}
                    disabled={isGeneratingSuggestion}
                    className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-primary-300 bg-primary-500/10 text-primary-700 hover:bg-primary-500/20 shadow-sm whitespace-nowrap transition-all shrink-0 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    title="O Robozinho lê a última mensagem do cliente, consulta o estoque/produtos e sugere uma resposta pra você revisar"
                  >
                    {isGeneratingSuggestion ? <Loader2 size={10} className="animate-spin" /> : <Bot size={10} />}
                    {isGeneratingSuggestion ? 'Pensando...' : 'Sugestão do Robozinho'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuickReplies(v => !v)}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm whitespace-nowrap transition-all shrink-0 cursor-pointer flex items-center gap-1",
                      showQuickReplies ? "bg-primary-500 text-white border-primary-500" : "bg-white text-slate-500 border-slate-200 hover:text-primary-600 hover:border-primary-300"
                    )}
                  >
                    <Sparkles size={10} className={showQuickReplies ? "text-white" : "text-amber-500"} /> Rápidas
                  </button>
                  {showQuickReplies && quickTemplates.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setNewMessage(tpl.text); setShowQuickReplies(false); }}
                      className="text-[9.5px] font-bold bg-white text-slate-700 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-300 px-2.5 py-1 rounded-full border border-slate-200 shadow-sm whitespace-nowrap transition-all shrink-0 cursor-pointer"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-end gap-2 bg-white p-1 rounded-2xl border border-slate-200 focus-within:border-primary-500/50 transition-all shadow-lg">
                  <div className="flex gap-0.5 pb-0.5">
                    <Button variant="ghost" size="sm" className="p-1.5 min-w-0 h-8 w-8 text-slate-400 hover:text-primary-600 transition-colors" icon={Paperclip} />
                    <Button variant="ghost" size="sm" className="p-1.5 min-w-0 h-8 w-8 text-slate-400 hover:text-primary-600 transition-colors" icon={ImageIcon} />
                  </div>
                  <textarea 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Sua resposta..."
                    className="flex-1 bg-transparent border-none outline-none text-xs text-slate-900 font-medium p-2 resize-none max-h-24 min-h-[36px] custom-scrollbar focus:ring-0 placeholder:text-slate-400"
                    rows={1}
                  />
                  <div className="flex gap-1.5 pb-0.5 pr-0.5">
                    {newMessage.trim() === '' ? (
                      <Button 
                        onClick={() => setIsRecording(!isRecording)}
                        className={cn(
                          "p-2 min-w-0 h-9 w-9 rounded-full border-none transition-all shadow-md",
                          isRecording ? "bg-rose-500 shadow-lg shadow-rose-500/40 animate-pulse" : "bg-slate-100 hover:bg-slate-200 text-slate-500"
                        )} 
                        icon={Mic} 
                      />
                    ) : (
                      <Button 
                        onClick={handleSendMessage}
                        className="p-2 min-w-0 h-9 w-9 rounded-full bg-primary-500 hover:bg-primary-400 shadow-lg shadow-primary-500/40 text-slate-900 border-none" 
                        icon={Send} 
                      />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'data' && (
            <motion.div 
              key="data"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 space-y-8 overflow-y-auto custom-scrollbar h-full"
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-white/30 tracking-widest leading-none">Status</p>
                  <Button variant="secondary" className="w-full justify-between h-12">
                    {conversation.status?.toUpperCase() || 'EM ATENDIMENTO'}
                    <ChevronRight size={14} />
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-white/30 tracking-widest leading-none">Prioridade</p>
                  <div className="flex gap-2">
                    {['B', 'M', 'A'].map(p => (
                      <button key={p} className="flex-1 h-12 rounded-xl bg-white/5 border border-white/5 hover:border-primary-500/50 flex items-center justify-center font-bold text-white/40">{p}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Identidade unificada -- 3 nomes separados pra nunca um sobrescrever o outro sem
                  querer (ver Lead.whatsappName/contactName/fullName em types.ts). Igual nas duas
                  telas (Funil CRM e Mensagens) porque leem/escrevem o mesmo lead. */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h5 className="text-[11px] font-black uppercase text-primary-300 tracking-[3px]">Identidade do Contato</h5>
                   {nomesMudaram && (
                     <Button size="sm" icon={Save} onClick={handleSaveNames} className="h-8 text-[9px]" disabled={isSavingNames}>
                       {isSavingNames ? 'Salvando...' : 'Salvar Nomes'}
                     </Button>
                   )}
                </div>
                <div className="grid grid-cols-1 gap-3">
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Nome do WhatsApp (perfil)</label>
                      <Input value={nameFieldsDraft.whatsappName} onChange={(e: any) => setNameFieldsDraft({ ...nameFieldsDraft, whatsappName: e.target.value })} placeholder="Como aparece no perfil do WhatsApp" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Nome do Contato (agenda)</label>
                      <Input value={nameFieldsDraft.contactName} onChange={(e: any) => setNameFieldsDraft({ ...nameFieldsDraft, contactName: e.target.value })} placeholder="Como o atendente salvou na conversa" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">Nome Real / Documental</label>
                      <Input value={nameFieldsDraft.fullName} onChange={(e: any) => setNameFieldsDraft({ ...nameFieldsDraft, fullName: e.target.value })} placeholder="Nome completo pra contratos e cadastros" />
                   </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-[11px] font-black uppercase text-primary-300 tracking-[3px]">Informações</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {/* Telefone -- editavel (com Salvar quando muda) + botao de copiar, diferente
                       dos outros campos abaixo que ainda sao só leitura. */}
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-primary-300 transition-colors shrink-0">
                         <Phone size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Telefone</p>
                         <input
                           value={phoneDraft}
                           onChange={(e) => setPhoneDraft(e.target.value)}
                           placeholder="—"
                           className="w-full bg-transparent text-xs font-bold text-white/80 outline-none border-b border-transparent focus:border-primary-500/40 py-0.5"
                         />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                         <button
                           onClick={handleCopyPhone}
                           disabled={!conversation.phone}
                           title="Copiar telefone"
                           className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-all disabled:opacity-30"
                         >
                           <Copy size={12} />
                         </button>
                         {phoneMudou && (
                           <button
                             onClick={handleSavePhone}
                             disabled={isSavingPhone}
                             title="Salvar telefone"
                             className="w-7 h-7 rounded-lg bg-primary-500 hover:bg-primary-400 text-white flex items-center justify-center transition-all disabled:opacity-50"
                           >
                             {isSavingPhone ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                           </button>
                         )}
                      </div>
                   </div>
                   {[
                     { label: 'Origem', value: conversation.sourceType || conversation.channel || '—', icon: Target },
                     { label: 'E-mail', value: conversation.email || clienteVinculado?.email || '—', icon: AtSign },
                     { label: 'Cadastro Vinculado', value: isLoadingCliente ? 'Buscando...' : (clienteVinculado ? clienteVinculado.full_name : 'Sem cadastro em Clientes'), icon: Users },
                   ].map((item, i) => (
                     <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-primary-300 transition-colors">
                           <item.icon size={16} />
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{item.label}</p>
                           <p className="text-xs font-bold text-white/80">{item.value}</p>
                        </div>
                     </div>
                   ))}
                </div>
              </div>

              {/* Endereço -- puxado do cadastro unificado (tabela clientes), casado pelo telefone. */}
              <div className="space-y-4">
                <h5 className="text-[11px] font-black uppercase text-primary-300 tracking-[3px]">Endereço do Cliente</h5>
                {isLoadingCliente ? (
                  <p className="text-xs text-white/30">Buscando cadastro...</p>
                ) : clienteVinculado ? (
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-4">
                     <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 shrink-0"><MapPin size={16} /></div>
                     <p className="text-xs font-bold text-white/80 leading-relaxed">
                       {[clienteVinculado.logradouro, clienteVinculado.numero, clienteVinculado.distrito, clienteVinculado.city, clienteVinculado.state, clienteVinculado.cep]
                         .filter(Boolean).join(', ') || 'Cadastro encontrado, mas sem endereço preenchido.'}
                     </p>
                  </div>
                ) : (
                  <p className="text-xs text-white/30">Nenhum cadastro em Clientes com esse telefone ainda. Use "Venda PDV" pra criar um.</p>
                )}
              </div>

              {/* Transcrição de áudio automática -- toggle salvo no lead, identico nas duas telas. */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20"><FileAudio size={16} /></div>
                    <div>
                       <p className="text-xs font-bold text-white/80">Transcrição de Áudio Automática</p>
                       <p className="text-[9px] text-white/30">Transcreve mensagens de voz recebidas nessa conversa</p>
                    </div>
                 </div>
                 <button
                   onClick={handleToggleAutoTranscribe}
                   className={cn("w-11 h-6 rounded-full transition-colors relative shrink-0", conversation.autoTranscribe ? "bg-emerald-500" : "bg-white/10")}
                 >
                   <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", conversation.autoTranscribe ? "left-[22px]" : "left-0.5")} />
                 </button>
              </div>

              <div className="p-6 bg-primary-500/5 border border-primary-500/10 rounded-3xl space-y-4">
                 <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-black uppercase text-primary-300 tracking-[3px]">Etiquetas (Tags)</h5>
                    <Button variant="ghost" size="sm" icon={Plus} className="h-8 p-1" />
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {(conversation.tags || []).map((tag: string) => (
                      <Badge key={tag} variant="primary" className="px-3 py-1 text-[9px] uppercase font-black bg-white/5 border-white/10">{tag}</Badge>
                    ))}
                    {(!conversation.tags || conversation.tags.length === 0) && (
                      <p className="text-xs text-white/20">Nenhuma etiqueta ainda.</p>
                    )}
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-6 overflow-y-auto custom-scrollbar h-full flex flex-col">
               <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white italic">Notas Internas</h3>
               </div>
               <div className="flex gap-2">
                  <textarea
                    ref={noteInputRef}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Escreva uma nota interna (não é visível pro cliente)..."
                    rows={2}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 resize-none"
                  />
                  <Button icon={Plus} onClick={handleAddNote} disabled={isSavingNote || !newNoteText.trim()} className="h-auto">
                    {isSavingNote ? 'Salvando...' : 'Salvar'}
                  </Button>
               </div>
               <div className="space-y-4">
                  {notes.length === 0 && (
                    <p className="text-xs text-white/20 text-center py-8">Nenhuma nota registrada nessa conversa ainda.</p>
                  )}
                  {[...notes].reverse().map((note) => {
                    const dataStr = note.createdAt instanceof Timestamp ? format(note.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : '';
                    return (
                      <div key={note.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-3 relative overflow-hidden group">
                         <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                         <div className="flex justify-between items-start gap-2">
                            <p className="text-xs text-white/70 leading-relaxed flex-1">{note.text}</p>
                            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => handleDeleteNote(note)} className="p-1 h-6 w-6 text-rose-400 shrink-0" />
                         </div>
                         <p className="text-[9px] text-white/30 font-bold italic">Por {note.senderName || 'Sistema'} • {dataStr}</p>
                      </div>
                    );
                  })}
               </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-6 overflow-y-auto custom-scrollbar h-full flex flex-col">
               <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white italic">Tarefas</h3>
               </div>
               <div className="flex gap-2">
                  <input
                    ref={taskInputRef}
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); }}
                    placeholder="Nova tarefa pra esse contato..."
                    className="flex-1 h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500"
                  />
                  <Button icon={Plus} onClick={handleAddTask} disabled={isSavingTask || !newTaskTitle.trim()}>
                    {isSavingTask ? 'Salvando...' : 'Adicionar'}
                  </Button>
               </div>
               <div className="space-y-2">
                  {tasks.length === 0 && (
                    <p className="text-xs text-white/20 text-center py-8">Nenhuma tarefa pra esse contato ainda.</p>
                  )}
                  {tasks.map((task) => {
                    const concluida = !!task.completedAt;
                    return (
                      <div key={task.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all", concluida ? "bg-white/[0.02] border-white/5 opacity-50" : "bg-white/5 border-white/10")}>
                         <button onClick={() => handleToggleTask(task)} className={cn("w-6 h-6 rounded-lg border flex items-center justify-center shrink-0", concluida ? "bg-emerald-500 border-emerald-500" : "border-white/20 hover:border-primary-500")}>
                           {concluida && <Check size={12} className="text-slate-900" />}
                         </button>
                         <p className={cn("text-xs font-bold flex-1", concluida ? "text-white/40 line-through" : "text-white/80")}>{task.title}</p>
                         <Button variant="ghost" size="sm" icon={Trash2} onClick={() => handleDeleteTask(task)} className="p-1 h-6 w-6 text-rose-400 shrink-0" />
                      </div>
                    );
                  })}
               </div>
            </motion.div>
          )}

          {activeTab === 'saved' && (
            <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-6 overflow-y-auto custom-scrollbar h-full flex flex-col">
               <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white italic">Mensagens Salvas</h3>
               </div>
               <p className="text-xs text-white/40 italic">Clique em uma mensagem para preenchê-la no campo de envio.</p>
               <div className="space-y-3">
                  {quickTemplates.length === 0 ? (
                    <p className="text-xs text-white/20 text-center py-8">Nenhuma mensagem salva ainda.</p>
                  ) : (
                    quickTemplates.map((tpl, i) => (
                      <button
                        key={i}
                        onClick={() => { setNewMessage(tpl.text); setActiveTab('chat'); }}
                        className="w-full text-left p-4 bg-white/5 hover:bg-primary-500/15 border border-white/10 hover:border-primary-500/30 rounded-2xl transition-all group"
                      >
                        <h4 className="text-sm font-bold text-primary-300 group-hover:text-primary-200 mb-1">{tpl.label}</h4>
                        <p className="text-xs text-white/60 group-hover:text-white/80 leading-relaxed">{tpl.text}</p>
                      </button>
                    ))
                  )}
               </div>
            </motion.div>
          )}

          {activeTab === 'sales' && (
            <motion.div key="sales" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-4 overflow-y-auto custom-scrollbar h-full">
               <h3 className="text-xl font-bold text-white italic">Vendas do Cliente</h3>
               <p className="text-[10px] text-white/30">Pedidos com o mesmo telefone dessa conversa — clique pra abrir a nota, o contrato ou o orçamento vinculado.</p>
               {isLoadingVendas ? (
                 <div className="flex justify-center py-10"><RefreshCw className="animate-spin text-primary-500" size={20} /></div>
               ) : clienteVendas.length === 0 ? (
                 <p className="text-xs text-white/20 text-center py-8">Nenhuma venda encontrada com esse telefone ainda.</p>
               ) : (
                 <div className="space-y-2">
                   {clienteVendas.map((venda) => {
                     const saldo = (venda.total || 0) - (venda.down_payment || 0);
                     const pendente = saldo > 0 || venda.status === 'pending';
                     return (
                       <div key={venda.id} className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
                          <div className="flex items-center justify-between gap-2">
                             <button onClick={() => { setPendingReceiptOpenId?.(venda.id); setRootActiveTab?.('pos'); }} className="text-left min-w-0 flex-1">
                                <p className="text-xs font-black text-white truncate">#{venda.id.slice(-8).toUpperCase()}</p>
                                <p className="text-[9px] text-white/30">{venda.created_at ? safeFormat(venda.created_at, 'dd/MM/yyyy HH:mm') : ''}</p>
                             </button>
                             <Badge className={cn("text-[7.5px] font-black uppercase px-1.5 py-0.5 border-none shrink-0", pendente ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300")}>
                               {pendente ? `FALTA R$ ${saldo.toFixed(2).replace('.', ',')}` : 'PAGO'}
                             </Badge>
                             <span className="text-xs font-black text-white shrink-0">R$ {(venda.total || 0).toFixed(2).replace('.', ',')}</span>
                          </div>
                          {(venda.contrato_id || venda.orcamento_id) && (
                            <div className="flex flex-wrap gap-1">
                               {venda.contrato_id && (
                                 <button
                                   onClick={() => { setPendingOpenContratoId?.(venda.contrato_id); setRootActiveTab?.('pos'); }}
                                   className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
                                 >
                                   Contrato
                                 </button>
                               )}
                               {venda.orcamento_id && (
                                 <button
                                   onClick={() => { setPendingOpenOrcamentoId?.(venda.orcamento_id); setRootActiveTab?.('pos'); }}
                                   className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-primary-500/20 text-primary-300 hover:bg-primary-500/30 transition-colors"
                                 >
                                   Orçamento
                                 </button>
                               )}
                            </div>
                          )}
                       </div>
                     );
                   })}
                 </div>
               )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
};


// --- CRM / FUNNEL ---
export const CRMModule = ({ currentCompany, user }: { currentCompany: Company | null, user: AppUser | null }) => {
  const { pendingOpenLeadId, setPendingOpenLeadId } = React.useContext(AppContext)!;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  // true quando o lead foi aberto via "pulo" de outra tela (ex.: popup de
  // Mensagens do menu lateral) — nesse caso o ChatPanel preenche a tela
  // toda (kanban escondido). Clique direto num card do kanban mantém o
  // comportamento normal (60% kanban / 40% painel), sem mexer nisso.
  const [openedViaJump, setOpenedViaJump] = useState(false);
  const [isConfiguringFunnel, setIsConfiguringFunnel] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);
  // Modo de seleção múltipla no Kanban -- liga/desliga os checkboxes nos cards pra
  // permitir excluir vários leads de uma vez (em vez de um por um). Limpa a seleção
  // sempre que sai do modo ou troca de funil, pra nunca excluir um lead "fantasma"
  // que já saiu da tela.
  const [leadSelectionMode, setLeadSelectionMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const toggleLeadSelected = (leadId: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId); else next.add(leadId);
      return next;
    });
  };
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!currentCompany) return;
    const loadFunnels = async () => {
      const { data } = await supabase.from('funnels').select('*').eq('company_id', 'rafa-arts');
      const funnelData = (data || []).map(mapFunnelRow);
      setFunnels(funnelData);
      setSelectedFunnelId(prev => prev || (funnelData.length > 0 ? funnelData[0].id : prev));
    };
    const loadLeads = async () => {
      const { data } = await supabase.from('leads').select('*').eq('company_id', 'rafa-arts').order('updated_at', { ascending: false });
      setLeads((data || []).map(mapLeadRow));
    };
    loadFunnels();
    loadLeads();

    const funnelsChannel = supabase.channel('crm-funnels').on('postgres_changes', { event: '*', schema: 'public', table: 'funnels', filter: `company_id=eq.${currentCompany.id}` }, loadFunnels).subscribe();
    const leadsChannel = supabase.channel('crm-leads').on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `company_id=eq.${currentCompany.id}` }, loadLeads).subscribe();

    return () => {
      supabase.removeChannel(funnelsChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [currentCompany]);

  useEffect(() => {
    if (!selectedFunnelId) return;
    const loadStages = async () => {
      const { data } = await supabase.from('funnel_stages').select('*').eq('funnel_id', selectedFunnelId).order('order', { ascending: true });
      setStages((data || []).map(mapFunnelStageRow));
    };
    loadStages();
    const stagesChannel = supabase.channel(`crm-stages-${selectedFunnelId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'funnel_stages', filter: `funnel_id=eq.${selectedFunnelId}` }, loadStages).subscribe();
    return () => { supabase.removeChannel(stagesChannel); };
  }, [selectedFunnelId]);

  // Chegou aqui vindo do popup de Mensagens do menu lateral ou do botao "Ver no
  // Funil CRM" do ChatPanel compartilhado -- acha o lead, troca pro funil dele
  // se for diferente do selecionado, ja deixa selecionado (abre o painel) e
  // marca openedViaJump pra o painel preencher a tela toda (sem kanban).
  useEffect(() => {
    if (!pendingOpenLeadId || leads.length === 0) return;
    const lead = leads.find(l => l.id === pendingOpenLeadId);
    if (lead) {
      if (lead.funnelId && lead.funnelId !== selectedFunnelId) {
        setSelectedFunnelId(lead.funnelId);
      }
      setSelectedLead(lead);
      setOpenedViaJump(true);
      setPendingOpenLeadId(null);
    }
  }, [pendingOpenLeadId, leads]);

  const onDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    const lead = leads.find(l => l.id === leadId);
    // Find the stage specifically if dropped over a column or a card in that column
    const overStageId = stages.find(s => s.id === overId)?.id || 
                       leads.find(l => l.id === overId)?.funnelStageId;

    if (lead && overStageId && lead.funnelStageId !== overStageId) {
      const stageAnterior = lead.funnelStageId;

      // Atualiza a coluna na hora (otimista) -- sem isso o card ficava "preso" na
      // coluna antiga ate o listener em tempo real do Supabase (loadLeads no
      // useEffect acima) devolver a mudanca, e na pratica parecia que o card
      // "voltava" sozinho depois do drop, so corrigindo com um refresh manual.
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, funnelStageId: overStageId } : l));

      try {
        const { error } = await supabase.from('leads').update({
          funnel_stage_id: overStageId,
          company_id: 'rafa-arts',
          updated_at: new Date().toISOString(),
        }).eq('id', leadId).eq('company_id', 'rafa-arts');
        if (error) throw error;
      } catch (err) {
        console.error('Kanban: Fallback move failed', err);
        // Deu erro no servidor -- desfaz a atualizacao otimista pra nao deixar o
        // card mostrando uma coluna que na verdade nao foi salva.
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, funnelStageId: stageAnterior } : l));
      }
    }
  };

  const currentFunnel = funnels.find(f => f.id === selectedFunnelId);
  const [funnelMenuOpen, setFunnelMenuOpen] = useState(false);

  // Mantem o lead selecionado sincronizado com a lista ao vivo (onSnapshot) --
  // sem isso, depois de mudar a etapa (ou qualquer outro campo) pelo proprio
  // ChatPanel, o objeto `selectedLead` ficava "congelado" no estado de quando
  // foi clicado, entao o dropdown de etapa dentro da conversa parecia nao
  // funcionar (voltava/nao refletia a mudanca) mesmo o Firestore ja tendo sido
  // atualizado corretamente.
  useEffect(() => {
    if (!selectedLead) return;
    const updated = leads.find(l => l.id === selectedLead.id);
    if (updated && updated !== selectedLead) {
      setSelectedLead(updated);
    }
  }, [leads, selectedLead]);

  const handleAddFunnel = async () => {
    const name = await showPrompt('Nome do novo funil:');
    if (!name || !currentCompany) return;
    try {
      const { data: newFunnel, error } = await supabase.from('funnels').insert({
        company_id: 'rafa-arts',
        name,
        is_active: true,
      }).select().single();
      if (error) throw error;
      setSelectedFunnelId(newFunnel.id);
      setFunnelMenuOpen(false);
      showAlert(`Funil "${name}" criado com sucesso!`);
    } catch (err) {
      console.error('Erro ao criar funil:', err);
      showAlert('Não foi possível criar o funil.');
    }
  };

  const handleDeleteFunnel = async (funnelId: string) => {
    const funnel = funnels.find(f => f.id === funnelId);
    if (!funnel) return;
    if (!user?.isAdmin) {
      showAlert('Apenas administradores podem excluir funis.');
      return;
    }
    if (!(await showConfirm(`Excluir o funil "${funnel.name}" e TODOS os leads nele?\n\nEssa ação não pode ser desfeita.`))) return;
    try {
      // Excluir todos os leads do funil
      await supabase.from('leads').delete().eq('funnel_id', funnelId);
      // Excluir todas as etapas do funil
      await supabase.from('funnel_stages').delete().eq('funnel_id', funnelId);
      // Excluir o funil
      await supabase.from('funnels').delete().eq('id', funnelId);
      // Trocar pra outro funil
      if (selectedFunnelId === funnelId && funnels.length > 1) {
        const nextFunnel = funnels.find(f => f.id !== funnelId);
        if (nextFunnel) setSelectedFunnelId(nextFunnel.id);
      }
      setFunnelMenuOpen(false);
      showAlert(`Funil "${funnel.name}" excluído.`);
    } catch (err) {
      console.error('Erro ao excluir funil:', err);
      showAlert('Não foi possível excluir o funil.');
    }
  };

  const handleAddStage = async () => {
    if (!selectedFunnelId) return;
    const name = await showPrompt('Nome da nova etapa:');
    if (!name) return;
    try {
      await supabase.from('funnel_stages').insert({
        funnel_id: selectedFunnelId,
        name,
        order: stages.length,
      });
      setFunnelMenuOpen(false);
      showAlert(`Etapa "${name}" criada!`);
    } catch (err) {
      console.error('Erro ao criar etapa:', err);
      showAlert('Não foi possível criar a etapa.');
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage || !user?.isAdmin) return;
    if (!(await showConfirm(`Excluir a etapa "${stage.name}" e reclassificar todos os leads?\n\nEssa ação não pode ser desfeita.`))) return;
    try {
      // Reclassificar leads: mover pra primeira etapa
      const firstStage = stages.find(s => s.order === 0);
      await supabase.from('leads').update({ funnel_stage_id: firstStage?.id || null }).eq('funnel_stage_id', stageId);
      // Excluir a etapa
      await supabase.from('funnel_stages').delete().eq('id', stageId);
      setFunnelMenuOpen(false);
      showAlert(`Etapa "${stage.name}" excluída e leads reclassificados.`);
    } catch (err) {
      console.error('Erro ao excluir etapa:', err);
      showAlert('Não foi possível excluir a etapa.');
    }
  };

  // Sai do modo de seleção sempre que o funil muda -- os leads marcados eram de outra
  // tela e não devem continuar "presos" numa seleção que o usuário nem está vendo mais.
  useEffect(() => {
    setLeadSelectionMode(false);
    setSelectedLeadIds(new Set());
  }, [selectedFunnelId]);

  // Exclui um lead + a conversa dele em cascata (mensagens do chat ficam órfãs sem isso,
  // ocupando espaço e podendo reaparecer se o telefone mandar mensagem de novo e o
  // realtime remontar a linha). Usada tanto pro "excluir 1" quanto, em loop, pro "excluir
  // vários" abaixo -- mantém uma única fonte de verdade pra não duplicar a lógica de cascata.
  const excluirLeadComCascata = async (lead: Lead) => {
    if (lead.phone) {
      await supabase.from('crm_messages').delete().eq('company_id', 'rafa-arts').eq('phone', lead.phone);
    }
    await supabase.from('leads').delete().eq('id', lead.id);
  };

  const handleDeleteLead = async (lead: Lead) => {
    if (!(await showConfirm(`Excluir o lead "${lead.fullName}" e toda a conversa dele?\n\nEssa ação não pode ser desfeita.`))) return;
    try {
      await excluirLeadComCascata(lead);
      if (selectedLead?.id === lead.id) setSelectedLead(null);
      setLeads(prev => prev.filter(l => l.id !== lead.id));
    } catch (err) {
      console.error('Erro ao excluir lead:', err);
      showAlert('Não foi possível excluir o lead.');
    }
  };

  // Excluir vários leads selecionados no Kanban de uma vez (checkbox por card, ver
  // KanbanCard/KanbanColumn). Cada lead leva sua conversa junto (mesma cascata do excluir
  // individual) -- em série mesmo, pra não estourar limite de conexões do Supabase com
  // muitos leads marcados de uma vez.
  const handleDeleteSelectedLeads = async () => {
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) return;
    if (!(await showConfirm(`Excluir ${ids.length} lead(s) selecionado(s) e todas as conversas deles?\n\nEssa ação não pode ser desfeita.`))) return;
    try {
      const leadsParaExcluir = leads.filter(l => ids.includes(l.id));
      for (const lead of leadsParaExcluir) {
        await excluirLeadComCascata(lead);
      }
      if (selectedLead && ids.includes(selectedLead.id)) setSelectedLead(null);
      setLeads(prev => prev.filter(l => !ids.includes(l.id)));
      setSelectedLeadIds(new Set());
      setLeadSelectionMode(false);
      showAlert(`${leadsParaExcluir.length} lead(s) excluído(s).`);
    } catch (err) {
      console.error('Erro ao excluir leads selecionados:', err);
      showAlert('Não foi possível excluir os leads selecionados.');
    }
  };

  // --- Handlers do modal "Gestão de Funis & Etapas" (Configurar) ---
  // Antes esse modal era só decoração: input sem onChange, cores sem onClick,
  // botões "Adicionar Etapa"/Automações/Editar/Excluir sem handler nenhum.
  const [funnelNameDraft, setFunnelNameDraft] = useState('');
  const [renamingStageId, setRenamingStageId] = useState<string | null>(null);
  const [stageNameDraft, setStageNameDraft] = useState('');

  useEffect(() => {
    setFunnelNameDraft(currentFunnel?.name || '');
  }, [currentFunnel?.id, currentFunnel?.name]);

  const handleSaveFunnelName = async () => {
    const name = funnelNameDraft.trim();
    if (!selectedFunnelId || !name || name === currentFunnel?.name) return;
    try {
      await supabase.from('funnels').update({ name }).eq('id', selectedFunnelId);
    } catch (err) {
      console.error('Erro ao renomear funil:', err);
      showAlert('Não foi possível renomear o funil.');
    }
  };

  const handleSetFunnelColor = async (color: string) => {
    if (!selectedFunnelId) return;
    try {
      await supabase.from('funnels').update({ color }).eq('id', selectedFunnelId);
    } catch (err) {
      console.error('Erro ao definir cor do funil:', err);
      showAlert('Não foi possível salvar a cor do funil.');
    }
  };

  const startRenameStage = (stage: FunnelStage) => {
    setRenamingStageId(stage.id);
    setStageNameDraft(stage.name);
  };

  const handleSaveStageName = async (stageId: string) => {
    const name = stageNameDraft.trim();
    setRenamingStageId(null);
    const stage = stages.find(s => s.id === stageId);
    if (!name || !stage || name === stage.name) return;
    try {
      await supabase.from('funnel_stages').update({ name, updated_at: new Date().toISOString() }).eq('id', stageId);
    } catch (err) {
      console.error('Erro ao renomear etapa:', err);
      showAlert('Não foi possível renomear a etapa.');
    }
  };

  const handleSetStageColor = async (stageId: string, color: string) => {
    try {
      await supabase.from('funnel_stages').update({ color, updated_at: new Date().toISOString() }).eq('id', stageId);
    } catch (err) {
      console.error('Erro ao definir cor da etapa:', err);
      showAlert('Não foi possível salvar a cor da etapa.');
    }
  };

  const handleToggleStageAutomation = async (stage: FunnelStage) => {
    const isOn = !!stage.automations?.createTask;
    if (!isOn) {
      const taskTitle = await showPrompt('Título da tarefa a criar automaticamente ao entrar nessa etapa:', 'Fazer contato com o lead');
      if (!taskTitle) return;
      try {
        await supabase.from('funnel_stages').update({
          automations: { ...(stage.automations || {}), createTask: true, taskTitle },
          updated_at: new Date().toISOString(),
        }).eq('id', stage.id);
        showAlert(`Automação ativada na etapa "${stage.name}": cria a tarefa "${taskTitle}" automaticamente.`);
      } catch (err) {
        console.error('Erro ao ativar automação:', err);
        showAlert('Não foi possível ativar a automação.');
      }
    } else {
      if (!(await showConfirm(`Desativar a criação automática de tarefa na etapa "${stage.name}"?`))) return;
      try {
        await supabase.from('funnel_stages').update({
          automations: { ...(stage.automations || {}), createTask: false },
          updated_at: new Date().toISOString(),
        }).eq('id', stage.id);
      } catch (err) {
        console.error('Erro ao desativar automação:', err);
        showAlert('Não foi possível desativar a automação.');
      }
    }
  };

  return (
    <div className="h-full flex gap-6 animate-in slide-in-from-right-10 duration-500">
      <div className={cn(
        "flex flex-col space-y-6 transition-all duration-500 min-h-0",
        selectedLead ? "hidden md:flex md:w-[300px] md:shrink-0" : "w-full flex"
      )}>
        {!selectedLead && (
        <SectionHeader 
          title="Funil Rafa Arts" 
          subtitle={currentFunnel?.name || "Gestão Estratégica"} 
          actions={
            <div className="flex gap-3">
               {/* ✅ Dropdown Gerenciador de Funis */}
               <div className="relative">
                  <button
                    onClick={() => setFunnelMenuOpen(!funnelMenuOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest text-white"
                  >
                    {currentFunnel?.name || 'Selecionar Funil'}
                    <ChevronDown size={14} className={cn('transition-transform', funnelMenuOpen && 'rotate-180')} />
                  </button>

                  {funnelMenuOpen && (
                    <div className="absolute top-full mt-2 left-0 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 p-2">
                      {/* Trocar Funil */}
                      <div className="mb-2">
                        <p className="text-[9px] font-black uppercase text-white/40 tracking-widest px-3 py-1">Funis</p>
                        {funnels.map(f => (
                          <button
                            key={f.id}
                            onClick={() => { setSelectedFunnelId(f.id); setFunnelMenuOpen(false); }}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold transition-all',
                              selectedFunnelId === f.id 
                                ? 'bg-primary-500 text-slate-900' 
                                : 'text-white hover:bg-white/10'
                            )}
                          >
                            {f.name}
                          </button>
                        ))}
                      </div>

                      <div className="h-px bg-white/10 my-1" />

                      {/* Gerenciar Funis */}
                      <div className="space-y-1 mb-2">
                        <button
                          onClick={handleAddFunnel}
                          className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold text-primary-300 hover:bg-primary-500/20 transition-all flex items-center gap-2"
                        >
                          <Plus size={12} /> Novo Funil
                        </button>
                        {currentFunnel && user?.isAdmin && (
                          <button
                            onClick={() => handleDeleteFunnel(selectedFunnelId)}
                            className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold text-rose-400 hover:bg-rose-500/20 transition-all flex items-center gap-2"
                          >
                            <Trash2 size={12} /> Excluir Funil
                          </button>
                        )}
                      </div>

                      <div className="h-px bg-white/10 my-1" />

                      {/* Gerenciar Etapas */}
                      {currentFunnel && (
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase text-white/40 tracking-widest px-3 py-1">Etapas</p>
                          <button
                            onClick={handleAddStage}
                            className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold text-primary-300 hover:bg-primary-500/20 transition-all flex items-center gap-2"
                          >
                            <Plus size={12} /> Nova Etapa
                          </button>
                          {user?.isAdmin && stages.length > 1 && (
                            <div className="space-y-1 mt-1 pt-1 border-t border-white/10">
                              {stages.map(s => (
                                <button
                                  key={s.id}
                                  onClick={() => handleDeleteStage(s.id)}
                                  className="w-full text-left px-3 py-1.5 rounded-lg text-[9px] text-white/60 hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                                  title={`Excluir etapa "${s.name}"`}
                                >
                                  ✕ {s.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
               </div>

               <Button
                 variant={leadSelectionMode ? 'primary' : 'secondary'}
                 icon={CheckSquare}
                 onClick={() => { setLeadSelectionMode(v => !v); setSelectedLeadIds(new Set()); }}
               >
                 {leadSelectionMode ? 'Cancelar Seleção' : 'Selecionar Vários'}
               </Button>
               <Button variant="secondary" icon={Settings2} onClick={() => setIsConfiguringFunnel(true)}>Configurar</Button>
               <Button icon={Plus}>Novo Lead</Button>
            </div>
          } 
        />
        )}

        {leadSelectionMode && selectedLeadIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-4 py-2.5 mb-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-300">
              {selectedLeadIds.size} lead(s) selecionado(s)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedLeadIds(new Set())}
                className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white/70 px-3 py-1.5"
              >
                Limpar
              </button>
              <Button variant="danger" icon={Trash2} onClick={handleDeleteSelectedLeads}>Excluir Selecionados</Button>
            </div>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className={cn(
            "flex gap-4 pb-2 grow min-h-0 scroll-smooth custom-scrollbar",
            selectedLead ? "overflow-x-hidden" : "overflow-x-auto"
          )}>
            {/* Cada coluna tem largura fixa e igual — se nao couber todas na tela, rola de lado
                em vez de encolher (senao com muitas etapas cada coluna fica espremida demais).
                Com uma conversa aberta, mostra so a coluna da etapa daquele lead (pra poder trocar
                de conversa dentro da mesma etapa sem sair da tela de mensagem — nesse caso a coluna
                unica ocupa toda a largura disponivel, sem precisar de rolagem horizontal, e a coluna
                se estende ate o rodape da pagina, no mesmo nivel do campo de mensagens do ChatPanel). */}
            {stages
              .filter(stage => !selectedLead || stage.id === (selectedLead.funnelStageId || (stages.find(s => s.isInitial || s.order === 0)?.id)))
              .map(stage => (
              <div key={`wrapper-${stage.id}`} className="w-full md:w-[300px] shrink-0">
                <KanbanColumn 
                  key={stage.id} 
                  stage={stage} 
                  leads={leads.filter(l => l.funnelStageId === stage.id || (!l.funnelStageId && (stage.isInitial || stage.order === 0)))}
                  onLeadClick={(l) => { setOpenedViaJump(false); setSelectedLead(l); }}
                  selectedLeadId={selectedLead?.id}
                  selectionMode={leadSelectionMode}
                  selectedLeadIds={selectedLeadIds}
                  onToggleLeadSelected={toggleLeadSelected}
                  onDeleteLead={handleDeleteLead}
                />
              </div>
            ))}
            
            {!selectedLead && (
            <button 
              onClick={async () => {
                const name = await showPrompt('Nome da nova etapa:');
                if(name && selectedFunnelId) {
                  await supabase.from('funnel_stages').insert({
                    funnel_id: selectedFunnelId,
                    name,
                    order: stages.length,
                  });
                }
              }}
              className="flex-shrink-0 w-full md:flex-shrink md:w-auto basis-24 h-full border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center justify-center opacity-20 hover:opacity-100 hover:bg-white/5 transition-all text-white/40"
            >
               <Plus size={32} />
               <span className="text-[10px] font-black uppercase tracking-[3px] mt-2">Nova Etapa</span>
            </button>
            )}
          </div>

          <DragOverlay>
            {activeDragId ? (
              <KanbanCard 
                lead={leads.find(l => l.id === activeDragId)!} 
                isDragging 
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <AnimatePresence>
        {selectedLead && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="h-full flex-1 min-w-0"
          >
            <ChatPanel 
              conversation={{ ...selectedLead, name: selectedLead.fullName, channel: 'WhatsApp' }}
              onClose={() => { setSelectedLead(null); setOpenedViaJump(false); }}
              currentCompany={currentCompany}
              user={user}
              fallbackFunnelId={selectedFunnelId}
              onLeadPatched={(leadId, patch) => {
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...patch } : l));
                setSelectedLead(prev => (prev && prev.id === leadId) ? { ...prev, ...patch } : prev);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Modal 
        isOpen={isConfiguringFunnel} 
        onClose={() => setIsConfiguringFunnel(false)} 
        title="Gestão de Funis & Etapas"
      >
        <div className="p-4 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
           <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-primary-300 tracking-[3px]">Configuração do Funil</p>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nome do Funil"
                  value={funnelNameDraft}
                  onChange={(e: any) => setFunnelNameDraft(e.target.value)}
                  onBlur={handleSaveFunnelName}
                  onKeyDown={(e: any) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
                />
                <div className="space-y-2">
                   <p className="text-[10px] font-bold text-white/40 uppercase">Cor do Funil</p>
                   <div className="flex gap-2">
                      {['#4cc9f0', '#4361ee', '#f72585', '#7209b7', '#3a0ca3'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleSetFunnelColor(c)}
                          title={c}
                          className={cn(
                            "w-6 h-6 rounded-full cursor-pointer border transition-all",
                            currentFunnel?.color === c ? "border-white scale-110 ring-2 ring-white/40" : "border-white/10 hover:scale-105"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                   </div>
                </div>
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-primary-300 tracking-[3px]">Etapas do Processo</p>
                <Button size="sm" variant="ghost" icon={Plus} onClick={handleAddStage}>Adicionar Etapa</Button>
              </div>
              <div className="space-y-3">
                 {stages.map((stage, idx) => (
                   <div key={stage.id} className="p-5 bg-white/5 border border-white/5 rounded-3xl flex items-center gap-4 group">
                      <div className="cursor-grab text-white/20"><GripVertical size={16} /></div>
                      <div className="relative group/color shrink-0">
                        <div className="w-4 h-4 rounded-full cursor-pointer" style={{ backgroundColor: stage.color || '#4cc9f0' }} />
                        <div className="hidden group-hover/color:flex absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-2 gap-1.5 z-10">
                           {['#4cc9f0', '#4361ee', '#f72585', '#7209b7', '#3a0ca3', '#10b981'].map(c => (
                             <button
                               key={c}
                               type="button"
                               onClick={() => handleSetStageColor(stage.id, c)}
                               className="w-4 h-4 rounded-full border border-white/10 hover:scale-125 transition-transform"
                               style={{ backgroundColor: c }}
                             />
                           ))}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                         {renamingStageId === stage.id ? (
                           <input
                             autoFocus
                             value={stageNameDraft}
                             onChange={(e) => setStageNameDraft(e.target.value)}
                             onBlur={() => handleSaveStageName(stage.id)}
                             onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setRenamingStageId(null); }}
                             className="w-full bg-white/5 border border-primary-500/40 rounded-lg px-2 py-1 text-sm font-bold text-white focus:outline-none"
                           />
                         ) : (
                           <p
                             className="text-sm font-bold text-white cursor-text hover:text-primary-300 transition-colors truncate"
                             onClick={() => startRenameStage(stage)}
                             title="Clique para renomear"
                           >
                             {stage.name}
                           </p>
                         )}
                         <p className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-1">
                           Ordem: {idx + 1} • {stage.isInitial ? 'Inicial' : stage.isFinal ? 'Venda' : 'Negociação'}
                           {stage.automations?.createTask && <span className="text-amber-400"> • Automação ativa</span>}
                         </p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button
                           variant="ghost"
                           size="sm"
                           icon={Zap}
                           className={cn("p-1 h-8 w-8", stage.automations?.createTask ? "text-amber-400" : "text-white/30")}
                           title={stage.automations?.createTask ? "Automação ativa — clique para desativar" : "Ativar automação (criar tarefa ao entrar na etapa)"}
                           onClick={() => handleToggleStageAutomation(stage)}
                         />
                         <Button
                           variant="ghost"
                           size="sm"
                           icon={Settings2}
                           className="p-1 h-8 w-8"
                           title="Renomear etapa"
                           onClick={() => startRenameStage(stage)}
                         />
                         {user?.isAdmin && stages.length > 1 && (
                           <Button
                             variant="ghost"
                             size="sm"
                             icon={Trash}
                             className="p-1 h-8 w-8 text-rose-400"
                             title="Excluir etapa"
                             onClick={() => handleDeleteStage(stage.id)}
                           />
                         )}
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </Modal>
    </div>
  );
};

const KanbanColumn = ({ stage, leads, onLeadClick, selectedLeadId, selectionMode, selectedLeadIds, onToggleLeadSelected, onDeleteLead }: {
  key?: any, stage: FunnelStage, leads: Lead[], onLeadClick: (l: Lead) => void, selectedLeadId?: string,
  selectionMode?: boolean, selectedLeadIds?: Set<string>, onToggleLeadSelected?: (leadId: string) => void, onDeleteLead?: (lead: Lead) => void,
}) => {
  const { setNodeRef } = useSortable({ id: stage.id, data: { type: 'column', stageId: stage.id } });

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div
            className={cn("w-2 h-2 rounded-full", !stage.color && "bg-primary-500")}
            style={stage.color ? { backgroundColor: stage.color } : undefined}
          />
          <h3 className="text-[10px] font-black uppercase tracking-[3px] text-white/50">{stage.name}</h3>
          <Badge className="ml-2 bg-white/5 border-none opacity-50 px-2 py-0 h-5 flex items-center">
            {leads.length}
          </Badge>
        </div>
      </div>
      <div 
        ref={setNodeRef}
        className="bg-white/[0.03] border border-white/5 rounded-[40px] p-4 flex flex-col gap-4 grow min-h-0 shadow-inner overflow-y-auto custom-scrollbar"
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <KanbanCard 
              key={lead.id} 
              lead={lead} 
              onClick={() => onLeadClick(lead)}
              isSelected={selectedLeadId === lead.id}
              selectionMode={selectionMode}
              isChecked={!!selectedLeadIds?.has(lead.id)}
              onToggleSelected={() => onToggleLeadSelected?.(lead.id)}
              onDelete={() => onDeleteLead?.(lead)}
            />
          ))}
        </SortableContext>
        
        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-10">
             <Layers size={32} className="text-white/40 mb-3" />
             <p className="text-[10px] font-black uppercase tracking-widest">Sem Cards</p>
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanCard = ({ lead, onClick, isSelected, isDragging, selectionMode, isChecked, onToggleSelected, onDelete }: {
  key?: any, lead: Lead, onClick?: () => void, isSelected?: boolean, isDragging?: boolean,
  selectionMode?: boolean, isChecked?: boolean, onToggleSelected?: () => void, onDelete?: () => void,
}) => {
  const { setPrefilledCustomer, setActiveTab } = React.useContext(AppContext)!;
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: lead.id,
    data: { type: 'card', lead },
    // Com o modo de seleção ligado, o card não deve mais "arrastar" ao clicar --
    // clicar precisa marcar/desmarcar o checkbox, não iniciar um drag do Kanban.
    disabled: selectionMode,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...(selectionMode ? {} : attributes)} 
      {...(selectionMode ? {} : listeners)}
      className={cn(isDragging ? "z-50" : "relative")}
    >
      <GlassCard 
        onClick={selectionMode ? onToggleSelected : onClick}
        className={cn(
          "p-5 border-white/5 transition-all hover:border-primary-400 group relative overflow-hidden",
          selectionMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
          isSelected ? "bg-primary-500/10 border-primary-500/40 ring-1 ring-primary-500/20" : "",
          isChecked ? "bg-rose-500/10 border-rose-500/40 ring-1 ring-rose-500/30" : "",
          isDragging ? "shadow-2xl ring-2 ring-primary-500 scale-105" : ""
        )}
      >
         {selectionMode && (
           <div className="absolute top-3 left-3 z-10" onClick={(e) => { e.stopPropagation(); onToggleSelected?.(); }}>
             <input type="checkbox" checked={isChecked} onChange={() => onToggleSelected?.()} className="w-4 h-4 accent-rose-500 cursor-pointer" />
           </div>
         )}
         {!selectionMode && (
           <button
             onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
             title="Excluir lead"
             className="absolute top-3 right-3 z-10 w-6 h-6 rounded-md bg-rose-500/0 text-rose-400/0 group-hover:bg-rose-500/10 group-hover:text-rose-400 flex items-center justify-center transition-all"
           >
             <Trash2 size={12} />
           </button>
         )}
         <div className={cn("flex justify-between mb-2", selectionMode && "pl-6")}>
            <p className="font-black text-white text-[11px] tracking-tight truncate flex-1 pr-2 uppercase italic">{lead.fullName}</p>
            <span className="text-[7px] font-black text-white/20 uppercase tracking-widest leading-none">
               {(lead.createdAt as any)?.toDate?.() ? format((lead.createdAt as any).toDate(), 'HH:mm') : 'Agora'}
            </span>
         </div>
         
         <div className="flex flex-wrap gap-1.5 mb-4">
            <Badge className="text-[8px] px-1.5 py-0.5 bg-primary-500/10 border-none opacity-60 uppercase font-black">{lead.sourceType || 'Ads'}</Badge>
            <Badge className="text-[8px] px-1.5 py-0.5 border-white/10 opacity-30 italic">R$ {(lead.estimatedValue ?? 0).toLocaleString('pt-BR')}</Badge>
         </div>

         {(lead.lastClientMessageText || lead.lastMessageText) && (
           <p className="text-[10px] text-white/40 line-clamp-2 leading-relaxed bg-white/5 p-3 rounded-2xl italic border border-white/5">
              "{lead.lastClientMessageText || lead.lastMessageText}"
           </p>
         )}

         <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden">
                  {lead.photoUrl ? (
                    <img src={lead.photoUrl} alt={lead.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <span className="text-[9px] font-black text-white/30">{(lead.fullName || '?').trim().charAt(0).toUpperCase()}</span>
                  )}
               </div>
               <p className="text-[9px] font-bold text-white/30 uppercase tracking-[2px] truncate max-w-[80px]">{lead.phone}</p>
            </div>
            <div className="flex items-center gap-2">
               <button 
                 onClick={(e) => {
                    e.stopPropagation();
                    if (setPrefilledCustomer) {
                       setPrefilledCustomer({ name: lead.fullName, phone: lead.phone || '' });
                       setActiveTab?.('pos');
                    }
                 }}
                 title="Iniciar Venda (PDV)" 
                 className="w-6 h-6 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500 hover:text-slate-900 transition-all cursor-pointer mr-1 z-10"
               >
                  <ShoppingBag size={10} />
               </button>
               <ArrowRight size={12} className={cn("transition-transform duration-300", isSelected ? "translate-x-1 text-primary-300" : "text-white/20")} />
            </div>
         </div>
      </GlassCard>
    </div>
  );
};

// --- GENERIC LIST VIEW COMPONENT ---
const GenericListView = ({ title, subtitle, columns, data, icon, onAdd, noHeader }: any) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
    {!noHeader && title && (
      <SectionHeader 
        title={title} 
        subtitle={subtitle} 
        actions={onAdd && <Button icon={Plus} onClick={onAdd}>Adicionar Novo</Button>}
      />
    )}
    <GlassCard className="p-4 overflow-hidden border-white/5 shadow-2xl">
      <div className="flex items-center gap-4 mb-6 px-4">
        <div className="flex-1">
          <Input icon={Search} placeholder="Buscar registros..." />
        </div>
        <Button variant="secondary" icon={Filter}>Filtros</Button>
      </div>
      <DataTable columns={columns} data={data} />
    </GlassCard>
  </div>
);

// --- MESSAGES ---
export const MessagesModule = ({ currentCompany, user, preselectedLeadId }: { currentCompany: Company | null, user: AppUser | null, preselectedLeadId?: string }) => {
  const { pendingWhatsAppShare, setPendingWhatsAppShare } = React.useContext(AppContext)!;
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatInitialDraft, setChatInitialDraft] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState('');
  const [autoTranscribe, setAutoTranscribe] = useState(true);
  const [viewFilter, setViewFilter] = useState<'all' | 'unreplied'>('all');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  
  // Modal de Simulação de Mensagens Multicanal
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [simChannel, setSimChannel] = useState<'WhatsApp' | 'Instagram' | 'WebChat' | 'Facebook' | 'E-mail' | 'Telegram'>('WhatsApp');
  const [simName, setSimName] = useState('Juliana Costa');
  const [simPhone, setSimPhone] = useState('(62) 99777-3322');
  const [simMessage, setSimMessage] = useState('Olá! Vi o anúncio da gráfica e quero fazer um orçamento de 1.000 cartões de visita e 2 banners para minha loja.');

  // Mesma sincronização do Funil CRM: mantém o chat selecionado alinhado com a
  // lista ao vivo, senão mudar a etapa (ou qualquer campo) dentro da própria
  // conversa não refletia no ChatPanel (ficava com o valor antigo "congelado").
  useEffect(() => {
    if (!selectedChat?.id) return;
    const updated = leads.find(l => l.id === selectedChat.id);
    if (updated && updated !== selectedChat) {
      setSelectedChat(updated);
    }
  }, [leads, selectedChat]);

  const getInitialStageInfo = async () => {
    if (!currentCompany) return { funnelId: null, funnelStageId: null };
    try {
      let { data: funnelRows } = await supabase.from('funnels').select('id').eq('company_id', 'rafa-arts').eq('is_default', true).limit(1);
      if (!funnelRows || funnelRows.length === 0) {
        const { data } = await supabase.from('funnels').select('id').eq('company_id', 'rafa-arts').limit(1);
        funnelRows = data;
      }

      if (funnelRows && funnelRows.length > 0) {
        const funnelId = funnelRows[0].id;
        let { data: stageRows } = await supabase.from('funnel_stages').select('id').eq('funnel_id', funnelId).eq('is_initial', true).limit(1);
        if (!stageRows || stageRows.length === 0) {
          const { data } = await supabase.from('funnel_stages').select('id').eq('funnel_id', funnelId).order('order', { ascending: true }).limit(1);
          stageRows = data;
        }
        if (stageRows && stageRows.length > 0) {
          return { funnelId, funnelStageId: stageRows[0].id };
        }
        return { funnelId, funnelStageId: null };
      }
    } catch (e) {
      console.error(e);
    }
    return { funnelId: null, funnelStageId: null };
  };

  const sampleLeadsData = [
    {
      fullName: 'Carlos Oliveira',
      firstName: 'Carlos',
      lastName: 'Oliveira',
      phone: '(62) 98111-2233',
      sourceType: 'WhatsApp',
      lastMessageText: 'Quero fechar o pedido de 1000 panfletos e 500 cartões. Como faço para pagar a entrada no PIX?',
      status: 'ENTRADA',
      estimatedValue: 450,
      waitingSince: new Date(Date.now() - 12 * 60000).toISOString(),
      lastInteractionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      fullName: 'Mariana Santos',
      firstName: 'Mariana',
      lastName: 'Santos',
      phone: '(62) 99222-3344',
      sourceType: 'Instagram',
      lastMessageText: 'Vocês fazem a instalação da fachada em ACM com LED no local em Goiânia? Qual o prazo?',
      status: 'ENTRADA',
      estimatedValue: 3800,
      waitingSince: new Date(Date.now() - 28 * 60000).toISOString(),
      lastInteractionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      fullName: 'Gabriel Mendes',
      firstName: 'Gabriel',
      lastName: 'Mendes',
      phone: '(62) 98777-1122',
      sourceType: 'WebChat',
      lastMessageText: 'Olá! Vi no site os serviços de impressão offset. Qual o valor para 5.000 panfletos da gráfica?',
      status: 'ENTRADA',
      estimatedValue: 680,
      waitingSince: new Date(Date.now() - 8 * 60000).toISOString(),
      lastInteractionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      fullName: 'Amanda Prado',
      firstName: 'Amanda',
      lastName: 'Prado',
      phone: '(62) 99666-8899',
      sourceType: 'Facebook',
      lastMessageText: 'Boa tarde! Gostaria de um orçamento para 10 placas de sinalização comercial em acrílico.',
      status: 'ENTRADA',
      estimatedValue: 1250,
      waitingSince: new Date(Date.now() - 18 * 60000).toISOString(),
      lastInteractionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      fullName: 'Ricardo Fonseca',
      firstName: 'Ricardo',
      lastName: 'Fonseca',
      phone: '(62) 98888-4433',
      sourceType: 'E-mail',
      lastMessageText: 'Prezados, solicitamos proposta técnica para envelopamento da frota comercial (5 utilitários).',
      status: 'ENTRADA',
      estimatedValue: 5400,
      waitingSince: new Date(Date.now() - 35 * 60000).toISOString(),
      lastInteractionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      fullName: 'Bruno Alves',
      firstName: 'Bruno',
      lastName: 'Alves',
      phone: '(62) 99111-5544',
      sourceType: 'Telegram',
      lastMessageText: 'Olá equipe Rafa Arts, preciso de 50 camisetas personalizadas com estampa em silk-screen para evento.',
      status: 'ENTRADA',
      estimatedValue: 1600,
      waitingSince: new Date(Date.now() - 3 * 60000).toISOString(),
      lastInteractionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const handleSyncWhatsApp = async () => {
    if (!currentCompany) return;
    setSyncStatus('syncing');
    
    const steps = [
      "Conectando às APIs Multicanais (WhatsApp, Insta, WebChat, FB, E-mail, Telegram)...",
      "Autenticando sessão Rafa Arts OmniChannel...",
      "Buscando mensagens pendentes em todos os canais...",
      "Importando contatos e direcionando para a etapa ENTRADA do CRM...",
      "Sincronização concluída com sucesso!"
    ];

    for (let i = 0; i < steps.length; i++) {
      setSyncMessage(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 650));
    }

    try {
      const { funnelId, funnelStageId } = await getInitialStageInfo();

      for (const sl of sampleLeadsData) {
        const exists = leads.some(l => l.phone === sl.phone);
        if (!exists) {
          const { data: novoLead } = await supabase.from('leads').insert({
            company_id: 'rafa-arts',
            funnel_id: funnelId,
            funnel_stage_id: funnelStageId,
            full_name: sl.fullName,
            phone: sl.phone,
            source_type: sl.sourceType,
          }).select().single();

          let msgs: any[] = [];
          if (sl.fullName === 'Carlos Oliveira') {
            msgs = [
              { text: 'Olá, gostaria de saber os valores para impressão de panfletos 14x20cm e cartões de visita.', direction: 'incoming' },
              { text: 'Olá Carlos! Tudo bem? Fica R$ 450,00 o pacote com 1.000 panfletos e 500 cartões verniz localizado. Entrada de 50% no PIX.', direction: 'outgoing' },
              { text: 'Quero fechar o pedido de 1000 panfletos e 500 cartões. Como faço para pagar a entrada no PIX?', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Mariana Santos') {
            msgs = [
              { text: 'Oi! Vi a fachada em ACM com LED no Instagram da Rafa Arts e gostei muito da qualidade.', direction: 'incoming' },
              { text: 'Olá Mariana! Que ótimo! Produzimos e instalamos fachadas personalizadas em ACM com backlight LED. Qual a medida da loja?', direction: 'outgoing' },
              { text: 'Vocês fazem a instalação da fachada em ACM com LED no local em Goiânia? Qual o prazo?', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Gabriel Mendes') {
            msgs = [
              { text: 'Olá! Vi no site os serviços de impressão offset. Qual o valor para 5.000 panfletos da gráfica?', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Amanda Prado') {
            msgs = [
              { text: 'Boa tarde! Gostaria de um orçamento para 10 placas de sinalização comercial em acrílico.', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Ricardo Fonseca') {
            msgs = [
              { text: 'Prezados, solicitamos proposta técnica para envelopamento da frota comercial (5 utilitários).', direction: 'incoming' }
            ];
          } else {
            msgs = [
              { text: 'Olá equipe Rafa Arts, preciso de 50 camisetas personalizadas com estampa em silk-screen para evento.', direction: 'incoming' }
            ];
          }

          for (let index = 0; index < msgs.length; index++) {
            const m = msgs[index];
            await supabase.from('crm_messages').insert({
              company_id: 'rafa-arts',
              lead_id: novoLead?.id || null,
              phone: sl.phone,
              text: m.text,
              direction: m.direction,
              sender_name: m.direction === 'outgoing' ? (user?.name || 'Rafa Arts Sistema') : sl.fullName,
              channel: sl.sourceType || 'WhatsApp',
              created_at: new Date(Date.now() - (msgs.length - index) * 600000).toISOString(),
            });
          }
        }
      }
      
      setSyncStatus('completed');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setSyncStatus('idle');
      showAlert('Erro ao sincronizar mensagens.');
    }
  };

  const handleSimulateIncomingMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !simName.trim() || !simMessage.trim()) return;

    try {
      await supabase.from('crm_messages').insert({
        company_id: 'rafa-arts',
        phone: simPhone,
        text: simMessage,
        direction: 'incoming',
        sender_name: simName,
        channel: simChannel,
      });

      setIsSimulateModalOpen(false);
      showAlert(`Mensagem do canal [${simChannel}] recebida com sucesso!\nO lead "${simName}" foi gerado/atualizado automaticamente na etapa ENTRADA do Funil CRM.`);
    } catch (err) {
      console.error(err);
      showAlert('Erro ao simular envio de mensagem.');
    }
  };

  useEffect(() => {
    if (!currentCompany) return;
    const loadLeads = async () => {
      const { data } = await supabase.from('leads').select('*').eq('company_id', 'rafa-arts').order('updated_at', { ascending: false });
      const fetchedLeads = (data || []).map(mapLeadRow);
      setLeads(fetchedLeads);

      if (pendingWhatsAppShare) {
        const target = fetchedLeads.find(l => l.id === pendingWhatsAppShare.leadId);
        if (target) {
          setSelectedChat({ ...target, name: target.fullName });
          setChatInitialDraft(pendingWhatsAppShare.prefillMessage);
          setPendingWhatsAppShare(null);
          return;
        }
      }

      // Pré-seleciona lead se vindo do popup de mensagens
      if (preselectedLeadId) {
        const target = fetchedLeads.find(l => l.id === preselectedLeadId);
        if (target) {
          setSelectedChat({ ...target, name: target.fullName });
          return;
        }
      }
      // Não abre nenhuma conversa automaticamente ao entrar na aba -- só mostra a lista.
      // A conversa só abre quando o usuário clica numa mensagem específica.
      // (a criacao automatica de conversas de exemplo foi removida — a lista fica vazia
      // de verdade ate a integracao real do WhatsApp comecar a trazer conversas)
    };
    loadLeads();
    const channel = supabase.channel('messages-leads').on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `company_id=eq.${currentCompany.id}` }, loadLeads).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany]);

  // O som de notificação de mensagem nova (incoming) e a notificação nativa do
  // navegador foram movidos pro shell raiz do app (ver notifyIncomingMessage em
  // App.tsx, useEffect 'app-incoming-lead-automation'). Antes esse listener só
  // existia aqui dentro de MessagesModule, então só tocava/avisava com essa aba
  // especificamente aberta — no shell raiz (sempre montado) ele continua
  // funcionando com o usuário em qualquer outra aba do CRM ou com o navegador
  // em segundo plano/minimizado, do jeito que o WhatsApp Web faz.

  const unrepliedCount = leads.filter(l => l.waitingSince).length;

  const filteredLeads = leads
    .filter(l => 
      l.fullName.toLowerCase().includes(filter.toLowerCase()) || 
      l.phone.includes(filter)
    )
    .filter(l => {
      if (viewFilter === 'unreplied') {
        return !!l.waitingSince;
      }
      return true;
    });

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-8 animate-in fade-in slide-in-from-right-5 duration-500">
      <GlassCard className={cn(
        "w-full md:w-96 p-0 overflow-hidden flex-col bg-white/5 border-white/10 shrink-0",
        selectedChat ? "hidden md:flex" : "flex"
      )}>
        <div className="p-6 border-b border-white/10 space-y-4">
           <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-1.5">
                 Conversas
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </h3>
              <div className="flex items-center gap-2">
                 <button 
                   type="button"
                   onClick={handleSyncWhatsApp}
                   disabled={syncStatus === 'syncing'}
                   className={cn(
                     "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95 disabled:pointer-events-none",
                     syncStatus === 'syncing' 
                       ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                       : syncStatus === 'completed'
                       ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 font-bold"
                       : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                   )}
                 >
                   <RefreshCw size={10} className={cn(syncStatus === 'syncing' && "animate-spin")} />
                   <span>{syncStatus === 'syncing' ? 'Buscando...' : syncStatus === 'completed' ? 'Sincronizado!' : 'Buscar'}</span>
                 </button>
              </div>
           </div>

           <div className="flex justify-between items-center gap-2">
              <div className="flex-1">
                 <Input icon={Search} placeholder="Filtrar chats..." value={filter} onChange={(e) => setFilter(e.target.value)} />
              </div>
              <div 
                onClick={() => setAutoTranscribe(!autoTranscribe)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-xl border cursor-pointer transition-all shrink-0 h-10 select-none",
                  autoTranscribe ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/10 text-white/30"
                )}
                title="Transcrição de Áudio Inteligente"
              >
                <div className={cn("w-1.5 h-1.5 rounded-full", autoTranscribe ? "bg-emerald-400 animate-pulse" : "bg-white/20")} />
                <span className="text-[9px] font-black uppercase tracking-widest">Transcrição: {autoTranscribe ? 'ON' : 'OFF'}</span>
              </div>
           </div>
           
           {/* SUB-TABS DO SISTEMA ANTI-VÁCUO */}
           <div className="flex gap-2">
              <button 
                onClick={() => setViewFilter('all')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5",
                  viewFilter === 'all' 
                    ? "bg-white/10 border-white/20 text-white" 
                    : "bg-transparent border-transparent text-white/40 hover:text-white/60"
                )}
              >
                Todos
                <span className="bg-white/10 text-white px-1.5 py-0.5 rounded text-[8px]">{leads.length}</span>
              </button>
              <button 
                onClick={() => setViewFilter('unreplied')}
                className={cn(
                  "flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 relative overflow-hidden",
                  viewFilter === 'unreplied' 
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                    : "bg-transparent border-transparent text-white/40 hover:text-white/60",
                  unrepliedCount > 0 && "animate-pulse"
                )}
              >
                <div className="flex items-center gap-1.5">
                   <span>Sem Resposta</span>
                   <span className={cn(
                     "px-1.5 py-0.5 rounded text-[8px] font-black",
                     unrepliedCount > 0 ? "bg-rose-500 text-white" : "bg-white/10 text-white/40"
                   )}>
                      {unrepliedCount}
                   </span>
                </div>
              </button>
           </div>
        </div>

        {/* ALERTA DE CLIENTES NO VÁCUO */}
        {unrepliedCount > 0 && viewFilter !== 'unreplied' && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between animate-pulse shrink-0">
             <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-rose-500/25 flex items-center justify-center text-rose-400">
                   <Clock size={12} className="animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <div>
                   <p className="text-[9px] font-black uppercase text-rose-400 leading-none mb-0.5">Alerta de Vácuo</p>
                   <p className="text-[8px] text-white/50">{unrepliedCount} {unrepliedCount === 1 ? 'cliente aguardando' : 'clientes aguardando'} resposta!</p>
                </div>
             </div>
             <Button 
               variant="ghost" 
               size="sm" 
               className="text-[8px] uppercase tracking-widest font-black h-6 px-2 text-rose-400 hover:bg-rose-500/20 border-rose-500/10"
               onClick={() => setViewFilter('unreplied')}
             >
                Filtrar
             </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {syncStatus === 'syncing' && (
            <div className="m-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col gap-2 animate-pulse">
               <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/25 flex items-center justify-center text-emerald-400">
                     <RefreshCw size={12} className="animate-spin" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase text-emerald-400 leading-none mb-1">WhatsApp Sync</p>
                     <p className="text-[9px] text-white/70 font-bold leading-none">{syncMessage}</p>
                  </div>
               </div>
               <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full w-2/3 animate-pulse" />
               </div>
            </div>
          )}

          {syncStatus === 'completed' && (
            <div className="m-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center gap-2 animate-in fade-in duration-300">
               <div className="w-5 h-5 rounded-full bg-emerald-400 text-slate-900 flex items-center justify-center font-black">
                  <Check size={10} />
               </div>
               <div>
                  <p className="text-[9px] font-black uppercase text-emerald-400 leading-none">Novas Conversas!</p>
                  <p className="text-[8px] text-white/50">WhatsApp sincronizado com sucesso.</p>
               </div>
            </div>
          )}

          {filteredLeads.map(l => {
            const lastUpdate = l.updatedAt instanceof Timestamp ? l.updatedAt.toDate() : new Date((l as any).updatedAt || Date.now());
            const timeStr = format(lastUpdate, 'HH:mm');
            const isSelected = selectedChat?.id === l.id;

            const waitingSinceDate = l.waitingSince 
              ? (l.waitingSince instanceof Timestamp ? l.waitingSince.toDate() : new Date(l.waitingSince)) 
              : null;
            
            let slaColor = "text-white/30";
            let slaLabel = "";
            let pulseBadge = false;

            if (waitingSinceDate) {
              const diffMinutes = Math.round((new Date().getTime() - waitingSinceDate.getTime()) / 60000);
              if (diffMinutes < 5) {
                slaColor = "text-sky-400 bg-sky-400/10 border-sky-400/20";
                slaLabel = `há ${diffMinutes} min`;
              } else if (diffMinutes < 15) {
                slaColor = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
                slaLabel = `há ${diffMinutes} min`;
              } else if (diffMinutes < 30) {
                slaColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                slaLabel = `ATENÇÃO: ${diffMinutes} min`;
                pulseBadge = true;
              } else if (diffMinutes < 60) {
                slaColor = "text-orange-500 bg-orange-500/10 border-orange-500/20";
                slaLabel = `ALERTA: ${diffMinutes} min`;
                pulseBadge = true;
              } else {
                const hours = Math.floor(diffMinutes / 60);
                slaColor = "text-rose-500 bg-rose-500/15 border-rose-500/20";
                slaLabel = `CRÍTICO: ${hours}h+ s/ resp`;
                pulseBadge = true;
              }
            }

            return (
              <div 
                key={l.id} 
                onClick={() => setSelectedChat({ ...l, name: l.fullName })}
                className={cn(
                  "p-3 border-b border-white/5 cursor-pointer transition-all group relative",
                  isSelected ? "bg-primary-500/10" : "hover:bg-white/5"
                )}
              >
                 {isSelected && <div className="absolute left-0 top-0 w-1 h-full bg-primary-500" />}
                 <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
                       {l.photoUrl ? (
                         <img src={l.photoUrl} alt={l.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                       ) : (
                         <span className="text-[11px] font-black text-white/40">{(l.fullName || '?').trim().charAt(0).toUpperCase()}</span>
                       )}
                    </div>
                    <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-start mb-1 gap-2">
                    <div className="flex items-center gap-2 truncate">
                       <p className={cn("font-bold transition-colors truncate text-sm", isSelected ? "text-primary-300" : "text-white group-hover:text-primary-300")}>{l.fullName}</p>
                       {waitingSinceDate && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" title="Cliente aguardando resposta!" />
                       )}
                    </div>
                    <span className="text-[10px] font-black text-white/30 uppercase shrink-0">{timeStr}</span>
                 </div>
                 
                 <div className="flex items-center justify-between gap-2 mb-1">
                    {/* Previa SEMPRE da ultima mensagem do CLIENTE (nunca a que voce mandou) --
                        ver Lead.lastClientMessageText em types.ts. Fallback pro campo antigo
                        so serve pra leads criados antes dessa coluna existir. */}
                    <p className="text-xs text-white/40 truncate flex-1">{l.lastClientMessageText || l.lastMessageText || 'Sem mensagens'}</p>
                    {waitingSinceDate && (
                       <div className={cn(
                         "px-2 py-0.5 rounded-full text-[8.5px] font-black border uppercase tracking-wider leading-none shrink-0",
                         slaColor,
                         pulseBadge && "animate-pulse"
                       )}>
                          {slaLabel}
                       </div>
                    )}
                 </div>

                 <div className="mt-1.5 flex items-center gap-2">
                    <Badge variant="primary" className="px-2 py-0 h-5 text-[9px] uppercase font-black">
                      {l.status}
                    </Badge>
                    <div className="ml-auto flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                       <span className="text-[9px] text-white/40 font-bold">{l.sourceType || 'WhatsApp'}</span>
                       <div className="w-3 h-3 rounded-full bg-white/5 flex items-center justify-center">
                          <CheckCircle2 size={10} className="text-emerald-400" />
                       </div>
                    </div>
                 </div>
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
      
      <ChatPanel 
        conversation={selectedChat}
        currentCompany={currentCompany}
        user={user}
        onClose={() => setSelectedChat(null)}
        initialDraft={chatInitialDraft}
        onDraftConsumed={() => setChatInitialDraft('')}
        onLeadPatched={(leadId, patch) => {
          setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...patch } : l));
          setSelectedChat((prev: any) => (prev && prev.id === leadId) ? { ...prev, ...patch } : prev);
        }}
      />

      {/* MODAL SIMULADOR DE MENSAGENS RECEBIDAS (TESTE MULTICANAL DE CRM) */}
      {isSimulateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <GlassCard className="max-w-lg w-full p-6 space-y-5 bg-slate-900 border-white/10 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Simular Mensagem Recebida</h3>
                  <p className="text-xs text-white/50">Teste a automação de entrada no CRM em qualquer canal</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsSimulateModalOpen(false)}
                className="text-white/40 hover:text-white text-sm font-bold p-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimulateIncomingMessage} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-white/60 tracking-wider mb-2 block">
                  Selecione o Canal de Entrada
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['WhatsApp', 'Instagram', 'WebChat', 'Facebook', 'E-mail', 'Telegram'] as const).map(ch => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => {
                        setSimChannel(ch);
                        if (ch === 'WhatsApp') setSimMessage('Olá! Quero orçamento de 1.000 panfletos e cartões de visita no WhatsApp.');
                        if (ch === 'Instagram') setSimMessage('Oi! Vi o post das fachadas em ACM no Instagram. Quanto custa m2?');
                        if (ch === 'WebChat') setSimMessage('Olá! Vi o site de vocês e gostaria de contratar adesivação de frota.');
                        if (ch === 'Facebook') setSimMessage('Boa tarde! Gostaria de cotação de 10 placas de sinalização acrílica.');
                        if (ch === 'E-mail') setSimMessage('Prezados, solicitamos proposta comercial para envelopamento de 5 veículos.');
                        if (ch === 'Telegram') setSimMessage('Olá! Vocês fazem camisetas personalizadas em silk-screen para evento?');
                      }}
                      className={cn(
                        "py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5",
                        simChannel === ch 
                          ? "bg-primary-500/20 border-primary-500 text-primary-300 shadow-lg shadow-primary-500/10" 
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        ch === 'WhatsApp' ? "bg-emerald-400" :
                        ch === 'Instagram' ? "bg-pink-400" :
                        ch === 'WebChat' ? "bg-sky-400" :
                        ch === 'Facebook' ? "bg-blue-400" :
                        ch === 'E-mail' ? "bg-amber-400" : "bg-indigo-400"
                      )} />
                      <span>{ch}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-white/60 tracking-wider mb-1 block">Nome do Cliente</label>
                  <Input 
                    value={simName} 
                    onChange={e => setSimName(e.target.value)} 
                    placeholder="Nome completo" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-white/60 tracking-wider mb-1 block">Telefone / Contato</label>
                  <Input 
                    value={simPhone} 
                    onChange={e => setSimPhone(e.target.value)} 
                    placeholder="(62) 99000-0000" 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-white/60 tracking-wider mb-1 block">Mensagem Recebida do Cliente</label>
                <textarea 
                  value={simMessage} 
                  onChange={e => setSimMessage(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary-500 min-h-[90px]"
                  placeholder="Digite o texto da mensagem enviada pelo cliente..."
                  required
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                <span>Ao receber, o sistema criará o Lead automaticamente na coluna <strong>ENTRADA</strong> do Funil CRM.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsSimulateModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" className="gap-2">
                  <Send size={14} />
                  <span>Receber no Sistema</span>
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

// --- META ADS ---
export const MetaAdsModule = ({ currentCompany }: { currentCompany: Company | null }) => {
  const [viewLevel, setViewLevel] = useState<'accounts' | 'campaigns' | 'adsets' | 'ads'>('accounts');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedAdSetId, setSelectedAdSetId] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<{ type: 'campaign' | 'adset' | 'ad', id?: string, isCreating?: boolean } | null>(null);

  const [accounts, setAccounts] = useState([
    { id: 'acc_1', fbAccountId: 'act_123456789', name: 'RPro Imobiliária Principal', currency: 'BRL', status: 'ACTIVE', spendMonth: 12500 },
    { id: 'acc_2', fbAccountId: 'act_987654321', name: 'RPro Gráfica Express', currency: 'BRL', status: 'ACTIVE', spendMonth: 4200 },
  ]);

  const [campaigns, setCampaigns] = useState([
    { id: 'cam_1', name: 'Lançamento Condomínio Aura', objective: 'LEADS', status: 'ACTIVE', budget: 500, budgetType: 'DAILY', spend: 8500, results: 245, cpl: 34.69 },
    { id: 'cam_2', name: 'Conversão Gráfica Premium', objective: 'OUTCOME_SALES', status: 'PAUSED', budget: 1500, budgetType: 'LIFETIME', spend: 1500, results: 42, cpl: 35.71 },
  ]);

  const [adsets, setAdsets] = useState([
    { id: 'set_1', name: 'Público Quente - Lookalike 1%', status: 'ACTIVE', dailyBudget: 150, optimizationGoal: 'LEADS' },
    { id: 'set_2', name: 'Interesses: Real Estate / Luxury', status: 'ACTIVE', dailyBudget: 100, optimizationGoal: 'LEADS' },
  ]);

  const [ads, setAds] = useState([
    { id: 'ad_1', name: 'Vídeo Imersivo Aura - v1', status: 'ACTIVE', creative: { title: 'Lançamento Aura' }, spend: 4500, results: 150 },
    { id: 'ad_2', name: 'Estático Fachada - v2', status: 'ACTIVE', creative: { title: 'Sua nova vida' }, spend: 2000, results: 50 },
  ]);

  // Stats for the top cards
  const stats = {
    spendToday: 1250.50,
    spendWeek: 8500.00,
    spendMonth: 32400.00,
    leads: 852,
    cpl: 38.02,
    roas: 4.2
  };

  // Breadcrumbs navigation
  const Breadcrumbs = () => (
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[2px] text-white/30 mb-4">
      <span 
        className={cn("cursor-pointer hover:text-white transition-colors", viewLevel === 'accounts' && "text-primary-300")}
        onClick={() => setViewLevel('accounts')}
      >
        Contas
      </span>
      {selectedAccountId && (
        <>
          <ArrowRight size={10} />
          <span 
            className={cn("cursor-pointer hover:text-white transition-colors", viewLevel === 'campaigns' && "text-primary-300")}
            onClick={() => setViewLevel('campaigns')}
          >
            Campanhas
          </span>
        </>
      )}
      {selectedCampaignId && (
        <>
          <ArrowRight size={10} />
          <span 
            className={cn("cursor-pointer hover:text-white transition-colors", viewLevel === 'adsets' && "text-primary-300")}
            onClick={() => setViewLevel('adsets')}
          >
            Conjuntos
          </span>
        </>
      )}
      {selectedAdSetId && (
        <>
          <ArrowRight size={10} />
          <span 
            className={cn("cursor-pointer hover:text-white transition-colors", viewLevel === 'ads' && "text-primary-300")}
          >
            Anúncios
          </span>
        </>
      )}
    </div>
  );

  const renderAccountsList = () => {
    const columns = [
      { key: 'name', label: 'Nome da Conta' },
      { key: 'fbAccountId', label: 'ID', render: (v: string) => <span className="font-mono text-[10px] opacity-40">{v}</span> },
      { key: 'currency', label: 'Moeda' },
      { key: 'status', label: 'Status', render: (v: string) => <Badge variant={v === 'ACTIVE' ? 'success' : 'outline'}>{v}</Badge> },
      { key: 'spendMonth', label: 'Gasto no Mês', render: (v: number) => `R$ ${v.toLocaleString('pt-BR')}` },
      { 
        key: 'actions', 
        label: '', 
        render: (_: any, row: any) => (
          <Button 
            variant="ghost" 
            size="sm" 
            icon={ArrowRight} 
            onClick={() => {
              setSelectedAccountId(row.id);
              setViewLevel('campaigns');
            }}
          >
            Abrir
          </Button>
        )
      }
    ];

    const data = [
      { id: 'acc_1', fbAccountId: 'act_123456789', name: 'RPro Imobiliária Principal', currency: 'BRL', status: 'ACTIVE', spendMonth: 12500 },
      { id: 'acc_2', fbAccountId: 'act_987654321', name: 'RPro Gráfica Express', currency: 'BRL', status: 'ACTIVE', spendMonth: 4200 },
    ];

    return (
      <GenericListView 
        title="Contas de Anúncio" 
        subtitle="Gerenciamento de contas Meta" 
        columns={columns} 
        data={accounts} 
        icon={Briefcase} 
        onAdd={() => setActiveDetail({ type: 'campaign', isCreating: true })} 
      />
    );
  };

  const renderCampaignsList = () => {
    const columns = [
      { key: 'name', label: 'Campanha' },
      { key: 'objective', label: 'Objetivo', render: (v: string) => <Badge variant="outline">{v}</Badge> },
      { key: 'status', label: 'Status', render: (v: string) => <Badge variant={v === 'ACTIVE' ? 'success' : 'outline'}>{v}</Badge> },
      { key: 'budget', label: 'Orçamento', render: (v: number, row: any) => `R$ ${v.toLocaleString('pt-BR')} (${row.budgetType === 'DAILY' ? 'Dia' : 'Total'})` },
      { key: 'spend', label: 'Gasto', render: (v: number) => `R$ ${v.toLocaleString('pt-BR')}` },
      { key: 'results', label: 'Resultados' },
      { key: 'cpl', label: 'CPL', render: (v: number) => `R$ ${v?.toFixed(2)}` },
      { 
        key: 'actions', 
        label: '', 
        render: (_: any, row: any) => (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              icon={ArrowRight} 
              onClick={() => {
                setSelectedCampaignId(row.id);
                setViewLevel('adsets');
              }}
            >
              Explorar
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              icon={Search} 
              onClick={() => setActiveDetail({ type: 'campaign', id: row.id })}
            >
              Editar
            </Button>
          </div>
        )
      }
    ];

    const data = [
      { id: 'cam_1', name: 'Lançamento Condomínio Aura', objective: 'LEADS', status: 'ACTIVE', budget: 500, budgetType: 'DAILY', spend: 8500, results: 245, cpl: 34.69 },
      { id: 'cam_2', name: 'Conversão Gráfica Premium', objective: 'OUTCOME_SALES', status: 'PAUSED', budget: 1500, budgetType: 'LIFETIME', spend: 1500, results: 42, cpl: 35.71 },
    ];

    return (
      <GenericListView 
        title="Campanhas" 
        subtitle="Listagem de campanhas da conta" 
        columns={columns} 
        data={campaigns} 
        icon={Target} 
        onAdd={() => setActiveDetail({ type: 'campaign', isCreating: true })} 
      />
    );
  };

  const renderAdSetsList = () => {
    const columns = [
      { key: 'name', label: 'Conjunto de Anúncios' },
      { key: 'status', label: 'Status', render: (v: string) => <Badge variant={v === 'ACTIVE' ? 'success' : 'outline'}>{v}</Badge> },
      { key: 'dailyBudget', label: 'Orc. Diário', render: (v: number) => v ? `R$ ${v.toLocaleString('pt-BR')}` : '-' },
      { key: 'optimizationGoal', label: 'Otimização', render: (v: string) => <Badge variant="outline">{v}</Badge> },
      { 
        key: 'actions', 
        label: '', 
        render: (_: any, row: any) => (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              icon={ArrowRight} 
              onClick={() => {
                setSelectedAdSetId(row.id);
                setViewLevel('ads');
              }}
            >
              Ver Anúncios
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              icon={Search} 
              onClick={() => setActiveDetail({ type: 'adset', id: row.id })}
            >
              Configurar
            </Button>
          </div>
        )
      }
    ];

    const data = [
      { id: 'set_1', name: 'Público Quente - Lookalike 1%', status: 'ACTIVE', dailyBudget: 150, optimizationGoal: 'LEADS' },
      { id: 'set_2', name: 'Interesses: Real Estate / Luxury', status: 'ACTIVE', dailyBudget: 100, optimizationGoal: 'LEADS' },
    ];

    return (
      <GenericListView 
        title="Conjuntos de Anúncios" 
        subtitle="Segmentação e orçamentos" 
        columns={columns} 
        data={adsets} 
        icon={Layers} 
        onAdd={() => setActiveDetail({ type: 'adset', isCreating: true })} 
      />
    );
  };

  const renderAdsList = () => {
    const columns = [
      { key: 'name', label: 'Anúncio' },
      { key: 'status', label: 'Status', render: (v: string) => <Badge variant={v === 'ACTIVE' ? 'success' : 'outline'}>{v}</Badge> },
      { key: 'creative', label: 'Criativo', render: (v: any) => <span className="text-[10px] opacity-40">{v.title}</span> },
      { key: 'spend', label: 'Gasto', render: (v: number) => `R$ ${v.toLocaleString('pt-BR')}` },
      { key: 'results', label: 'Resultados' },
      { 
        key: 'actions', 
        label: '', 
        render: (_: any, row: any) => (
          <Button 
            variant="ghost" 
            size="sm" 
            icon={Search} 
            onClick={() => setActiveDetail({ type: 'ad', id: row.id })}
          >
            Editar
          </Button>
        )
      }
    ];

    const data = [
      { id: 'ad_1', name: 'Vídeo Imersivo Aura - v1', status: 'ACTIVE', creative: { title: 'Lançamento Aura' }, spend: 4500, results: 150 },
      { id: 'ad_2', name: 'Estático Fachada - v2', status: 'ACTIVE', creative: { title: 'Sua nova vida' }, spend: 2000, results: 50 },
    ];

    return (
      <GenericListView 
        title="Anúncios" 
        subtitle="Peças e desempenho individual" 
        columns={columns} 
        data={ads} 
        icon={Zap} 
        onAdd={() => setActiveDetail({ type: 'ad', isCreating: true })} 
      />
    );
  };

  const MetaDetailDrawer = () => {
    if (!activeDetail) return null;
    const [activeTab, setActiveTab] = useState('resumo');
    
    // Find existing data if editing
    const existingData = activeDetail.isCreating ? null : (
      activeDetail.type === 'campaign' ? campaigns.find(c => c.id === activeDetail.id) :
      activeDetail.type === 'adset' ? adsets.find(a => a.id === activeDetail.id) :
      ads.find(a => a.id === activeDetail.id)
    );

    const [formData, setFormData] = useState<any>(existingData || { 
      name: '', 
      status: 'ACTIVE', 
      objective: 'LEADS',
      budget: 100,
      budgetType: 'DAILY',
      dailyBudget: 50,
      creative: { title: '' }
    });

    const handleSave = () => {
      if (activeDetail.isCreating) {
        const newId = `${activeDetail.type.slice(0, 3)}_${Date.now()}`;
        const newItem = { ...formData, id: newId };
        
        if (activeDetail.type === 'campaign') setCampaigns([...campaigns, newItem]);
        if (activeDetail.type === 'adset') setAdsets([...adsets, newItem]);
        if (activeDetail.type === 'ad') setAds([...ads, newItem]);
      } else {
        if (activeDetail.type === 'campaign') setCampaigns(campaigns.map(c => c.id === activeDetail.id ? { ...c, ...formData } : c));
        if (activeDetail.type === 'adset') setAdsets(adsets.map(a => a.id === activeDetail.id ? { ...a, ...formData } : a));
        if (activeDetail.type === 'ad') setAds(ads.map(a => a.id === activeDetail.id ? { ...a, ...formData } : a));
      }
      setActiveDetail(null);
    };

    const tabs = activeDetail.type === 'campaign' 
      ? ['resumo', 'conjuntos', 'anuncios', 'públicos', 'gastos', 'histórico']
      : activeDetail.type === 'adset'
      ? ['resumo', 'público', 'posicionamentos', 'orçamento', 'anuncios']
      : ['resumo', 'identidade', 'criativo', 'preview', 'rastreamento'];

    return (
      <Drawer 
        isOpen={!!activeDetail} 
        onClose={() => setActiveDetail(null)} 
        title={`${activeDetail.isCreating ? 'Criar' : 'Editar'} ${activeDetail.type === 'campaign' ? 'Campanha' : activeDetail.type === 'adset' ? 'Conjunto' : 'Anúncio'}`}
      >
        <div className="space-y-8">
           <div className="flex gap-2 p-1 bg-white/5 rounded-2xl overflow-x-auto custom-scrollbar">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase tracking-[2px] rounded-xl transition-all whitespace-nowrap",
                    activeTab === tab ? "bg-primary-500 text-white" : "text-white/40 hover:bg-white/10"
                  )}
                >
                  {tab}
                </button>
              ))}
           </div>

           <div className="space-y-6">
              {activeTab === 'resumo' && (
                <div className="grid grid-cols-1 gap-6">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-white/30">Nome</p>
                      <Input 
                        placeholder="Nome identificador..." 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-white/30">Status</p>
                        <select 
                          className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-xs outline-none focus:border-primary-500 transition-all font-bold"
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                          <option value="ACTIVE" className="bg-slate-900">ATIVO</option>
                          <option value="PAUSED" className="bg-slate-900">PAUSADO</option>
                          <option value="ARCHIVED" className="bg-slate-900">ARQUIVADO</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-white/30">Objetivo</p>
                        <select 
                          className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-xs outline-none focus:border-primary-500 transition-all font-bold"
                          value={formData.objective}
                          onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                        >
                          <option value="LEADS" className="bg-slate-900">GERAR LEADS</option>
                          <option value="TRAFFIC" className="bg-slate-900">TRÁFEGO</option>
                          <option value="CONVERSIONS" className="bg-slate-900">VENDAS</option>
                        </select>
                      </div>
                   </div>

                   {activeDetail.type === 'campaign' && (
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <p className="text-[10px] font-black uppercase text-white/30">Orçamento</p>
                           <Input 
                             type="number" 
                             value={formData.budget} 
                             onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })} 
                           />
                        </div>
                        <div className="space-y-2">
                           <p className="text-[10px] font-black uppercase text-white/30">Tipo</p>
                           <select 
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-xs outline-none focus:border-primary-500 transition-all font-bold"
                            value={formData.budgetType}
                            onChange={(e) => setFormData({ ...formData, budgetType: e.target.value })}
                          >
                            <option value="DAILY" className="bg-slate-900">DIÁRIO</option>
                            <option value="LIFETIME" className="bg-slate-900">VITALÍCIO</option>
                          </select>
                        </div>
                     </div>
                   )}

                   {activeDetail.type === 'adset' && (
                     <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-white/30">Orçamento Diário</p>
                        <Input 
                          type="number" 
                          value={formData.dailyBudget} 
                          onChange={(e) => setFormData({ ...formData, dailyBudget: Number(e.target.value) })} 
                        />
                     </div>
                   )}

                   {activeDetail.type === 'ad' && (
                     <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-white/30">Título do Criativo</p>
                        <Input 
                          value={formData.creative?.title || ''} 
                          onChange={(e) => setFormData({ ...formData, creative: { ...formData.creative, title: e.target.value } })} 
                        />
                     </div>
                   )}
                </div>
              )}

              {activeTab === 'posicionamentos' && (
                <div className="space-y-6">
                   <h4 className="text-sm font-bold text-white">Posicionamentos Manuais</h4>
                   <div className="grid grid-cols-1 gap-3">
                      {['Feed Instagram', 'Explore Instagram', 'Stories Instagram', 'Feed Facebook', 'Marketplace', 'Messenger'].map(p => (
                        <div key={p} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                           <span className="text-xs text-white/80 font-bold">{p}</span>
                           <div className="w-10 h-5 bg-primary-500 rounded-full flex items-center justify-end px-1"><div className="w-3 h-3 bg-white rounded-full shadow" /></div>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {activeTab === 'preview' && (
                <div className="space-y-8">
                   <div className="aspect-[9/16] max-w-[280px] mx-auto bg-slate-900 rounded-[40px] border-[8px] border-slate-800 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full p-4 flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center font-bold text-[10px]">R</div>
                         <p className="text-[10px] font-bold text-white">RPro Imobiliária</p>
                      </div>
                      <img src="https://picsum.photos/seed/apartment/1080/1920" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent space-y-2">
                         <h4 className="text-sm font-bold text-white">Últimas Unidades Aura!</h4>
                         <p className="text-xs text-white/60 line-clamp-2">Venha viver no melhor condomínio de alto padrão da região...</p>
                         <Button className="w-full">Saiba Mais</Button>
                      </div>
                   </div>
                   <div className="grid grid-cols-4 gap-2">
                      {['Feed', 'Story', 'Reels', 'Explore'].map(v => (
                        <button key={v} className="p-3 bg-white/5 rounded-xl border border-white/10 text-[8px] font-black uppercase tracking-widest hover:border-primary-500">
                          {v}
                        </button>
                      ))}
                   </div>
                </div>
              )}

              {(activeTab === 'público' || activeTab === 'públicos') && (
                <div className="space-y-6">
                   <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                      <div className="flex justify-between items-center"><h5 className="text-[10px] font-black uppercase text-primary-300">Público Estimado</h5><Badge variant="success">1.2M - 1.5M</Badge></div>
                      <div className="space-y-4">
                         <div className="space-y-1"><p className="text-[9px] text-white/30 uppercase font-black">Localização</p><p className="text-xs text-white">Brasil: São Paulo (+40km)</p></div>
                         <div className="space-y-1"><p className="text-[9px] text-white/30 uppercase font-black">Idade</p><p className="text-xs text-white">25 - 55 anos</p></div>
                         <div className="space-y-1"><p className="text-[9px] text-white/30 uppercase font-black">Interesses</p><p className="text-xs text-white">Imóveis de Luxo, Investimentos, Decoração</p></div>
                      </div>
                   </div>
                   <Button variant="secondary" icon={Search} className="w-full">Editar Segmentação</Button>
                </div>
              )}
           </div>

           <div className="flex gap-3 pt-10">
              <Button variant="secondary" className="flex-1" onClick={() => setActiveDetail(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSave}>Salvar Alterações</Button>
           </div>
        </div>
      </Drawer>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <SectionHeader 
        title="Meta Ads Intelligence" 
        subtitle="Central avançada de performance" 
        actions={
          <div className="flex gap-2">
             <Button variant="secondary" icon={RefreshCw}>Sincronizar</Button>
             <Button variant="secondary" icon={Bot}>AI Insights</Button>
             <Button 
               icon={Plus} 
               onClick={() => {
                 const typeMap: Record<string, 'campaign' | 'adset' | 'ad'> = {
                   'campaigns': 'campaign',
                   'adsets': 'adset',
                   'ads': 'ad',
                   'accounts': 'campaign' // Default to campaign if on accounts
                 };
                 setActiveDetail({ type: typeMap[viewLevel], isCreating: true });
               }}
             >
               Criar Novo
             </Button>
          </div>
        } 
      />

      <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5">
         <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase text-white/60">
               <Calendar size={14} />
               Este Mês
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase text-white/60">
               <Filter size={14} />
               Status: Ativos (12)
            </div>
         </div>
         <div className="flex items-center gap-4">
            <p className="text-[10px] font-black uppercase text-white/20">Última Sincronização: há 5 min</p>
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
               <Zap size={14} />
            </div>
         </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <GlassCard className="p-6">
           <p className="text-[10px] font-black uppercase text-white/30 mb-2">Gasto Hoje</p>
           <h4 className="text-3xl font-light text-white">R$ {stats.spendToday.toLocaleString('pt-BR')}</h4>
           <p className="text-[10px] text-emerald-400 font-bold mt-2">▲ 12% vs Ontem</p>
         </GlassCard>
         <GlassCard className="p-6">
           <p className="text-[10px] font-black uppercase text-white/30 mb-2">Leads Gerados</p>
           <h4 className="text-3xl font-light text-white">{stats.leads}</h4>
           <div className="flex gap-2 mt-2">
             <Badge variant="outline" className="text-[8px] opacity-50">12 Ativas</Badge>
             <Badge variant="outline" className="text-[8px] opacity-50">4 Pausadas</Badge>
           </div>
         </GlassCard>
         <GlassCard className="p-6">
           <p className="text-[10px] font-black uppercase text-white/30 mb-2">CPL Médio</p>
           <h4 className="text-3xl font-light text-primary-300">R$ {stats.cpl.toLocaleString('pt-BR')}</h4>
           <p className="text-[10px] text-red-400 font-bold mt-2">▼ 5% meta (R$ 40)</p>
         </GlassCard>
         <GlassCard className="p-6">
           <p className="text-[10px] font-black uppercase text-white/30 mb-2">ROAS Médio</p>
           <h4 className="text-3xl font-light text-emerald-400">{stats.roas}x</h4>
           <p className="text-[10px] text-white/20 font-black mt-2 uppercase tracking-widest">Alvo: 3.5x</p>
         </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <GlassCard className="lg:col-span-2 p-8 h-[300px]">
            <div className="flex items-center justify-between mb-6">
               <h5 className="text-[10px] font-black uppercase tracking-[2px] text-white/50">Gasto vs Leads (7D)</h5>
            </div>
            <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height="80%">
               <AreaChart data={[
                 { day: '01', spend: 400, leads: 12 }, { day: '02', spend: 350, leads: 15 },
                 { day: '03', spend: 600, leads: 22 }, { day: '04', spend: 450, leads: 18 },
                 { day: '05', spend: 800, leads: 30 }, { day: '06', spend: 750, leads: 25 },
                 { day: '07', spend: 1200, leads: 40 }
               ]}>
                 <XAxis dataKey="day" hide />
                 <Tooltip contentStyle={{ backgroundColor: '#1a2333', border: 'none', borderRadius: '12px' }} />
                 <Area type="monotone" dataKey="spend" stroke="#4cc9f0" fill="url(#colorLeads)" />
                 <Area type="monotone" dataKey="leads" stroke="#4361ee" fill="url(#colorSales)" />
               </AreaChart>
            </ResponsiveContainer>
            </ChartErrorBoundary>
         </GlassCard>
         <GlassCard className="p-8">
            <h5 className="text-[10px] font-black uppercase tracking-[2px] text-white/50 mb-6">Distribuição Verba</h5>
            <div className="space-y-4">
               {['Imobiliária High', 'Gráfica Express', 'Lançamento Aura'].map(acc => (
                 <div key={acc} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-white/80"><span>{acc}</span><span>45%</span></div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="w-[45%] h-full bg-primary-500" />
                    </div>
                 </div>
               ))}
            </div>
         </GlassCard>
      </div>

      <div className="space-y-4">
        <Breadcrumbs />
        {viewLevel === 'accounts' && renderAccountsList()}
        {viewLevel === 'campaigns' && renderCampaignsList()}
        {viewLevel === 'adsets' && renderAdSetsList()}
        {viewLevel === 'ads' && renderAdsList()}
      </div>

      <MetaDetailDrawer />
    </div>
  );
};

// Re-export modular components
export { POSModule } from './POSModule';
export { ContactsModule } from './ContactsModule';
export { ClientesEsperaModule } from './ClientesEsperaModule';
export { ServicesModule } from './ServicesModule';
export { ProductionModule } from './ProductionModule';
export { InventoryModule } from './InventoryModule';
export { SettingsModule } from './SettingsModule';
