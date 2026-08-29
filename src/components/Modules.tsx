import { AppContext } from '../App';
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
  Wallet
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

// Formata uma data com fallback seguro ‚Äî evita "RangeError: Invalid time value"
// quando vendas importadas de planilha tem um createdAt malformado ou vazio.
function safeFormat(value: any, fmt: string, fallback: string = '‚Äî'): string {
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : format(d, fmt);
}

// Converte o valor de um <input type="datetime-local"> (hora LOCAL, sem fuso) pra um ISO
// completo (com fuso) antes de gravar num campo timestamptz. Sem isso, o Postgres grava a
// hora digitada como se j√° fosse UTC ‚Äî em Manaus/Par√° (UTC-3), um agendamento de "10:00"
// virava "13:00" no banco e voltava exibido como "07:00" na tela (a hora antiga "grudando").
function localDatetimeToIso(value: string | undefined | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Converte uma data guardada (ISO/timestamptz, em UTC) pro formato que o <input
// type="datetime-local"> espera, j√° na hora LOCAL ‚Äî evita mostrar a hora errada ao reabrir
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
    subtitle: 'Vis√£o Geral do Ecossistema',
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
    title: 'Servi√ßos Recentes',
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
    subtitle: 'Gest√£o de Produ√ß√£o Ativa',
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
  pix: 'PIX', dinheiro: 'DINHEIRO', cartao_debito: 'D√âBITO', cartao_credito: 'CR√âDITO',
  transferencia: 'TRANSFER√äNCIA', boleto: 'BOLETO', crediario: 'CREDI√ÅRIO',
};

// Mostra o primeiro nome sempre inteiro, e so trunca o resto se precisar (ex: "Rafael Tava‚Ä¶")
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
  if (restanteDisponivel <= 0) return `${primeiro}‚Ä¶`;
  return `${primeiro} ${resto.slice(0, restanteDisponivel)}‚Ä¶`;
}

// Quebra uma venda em "eventos de receita" com a data REAL de cada pagamento ‚Äî se a venda foi
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
  pix: 'Pix', dinheiro: 'Dinheiro', cartao_debito: 'D√©bito', cartao_credito: 'Cr√©dito',
  transferencia: 'Transfer√™ncia', boleto: 'Boleto', crediario: 'Credi√°rio',
};

const CONTRATO_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho', aguardando_aceite: 'Aguardando Aceite', aceito: 'Aceito',
  aguardando_assinatura_empresa: 'Aguardando Sua Assinatura',
  aguardando_assinatura_cliente: 'Aguardando Assinatura do Cliente',
  assinado: 'Assinado Digitalmente',
  em_execucao: 'Em Execu√ß√£o', concluido: 'Conclu√≠do', cancelado: 'Cancelado', encerrado: 'Encerrado',
};

const ORCAMENTO_STATUS_LABELS_FICHA: Record<string, string> = {
  rascunho: 'Rascunho', enviado: 'Enviado', em_espera: 'Em Espera', aprovado: 'Aprovado', em_producao: 'Em Produ√ß√£o',
  concluido: 'Conclu√≠do', recusado: 'Recusado', cancelado: 'Cancelado', expirado: 'Expirado',
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
// aplicavel), sem inventar clausula incompativel ‚Äî percentuais/prazos vem dos dados reais.
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
  // Dados fixos da CONTRATADA (empresa) ‚Äî mesmo modelo/redacao usado no contrato padrao da
  // empresa. Fonte unica de verdade em companyIdentity.ts, reaproveitada tambem no carimbo de
  // auditoria do PDF (contratoPdf.ts) e no painel "Ver Detalhes do Aceite" (Admin).
  const CONTRATADA_NOME = OFFICIAL_COMPANY.razaoSocial.toUpperCase();
  const CONTRATADA_NOME_FANTASIA = OFFICIAL_COMPANY.nomeFantasia.toUpperCase();
  const CONTRATADA_CNPJ = OFFICIAL_COMPANY.cnpj;
  const CONTRATADA_ENDERECO = 'DO 01, 1445, Santar√©m - PA, CEP 68035010';

  // Identifica o CONTRATANTE como CPF ou CNPJ conforme a quantidade de digitos do
  // documento informado, em vez do rotulo generico "CPF/CNPJ" pra ambos os casos.
  const digitosDoc = (cpfCnpj || '').replace(/\D/g, '');
  const qualificacaoContratante = !cpfCnpj ? ''
    : digitosDoc.length === 14 ? `, inscrito(a) no CNPJ n¬∫ ${cpfCnpj}`
    : `, portador(a) do CPF n¬∫ ${cpfCnpj}`;

  const itensDescricao = items.map(i => `- ${i.name.toUpperCase()}${i.dimensions ? ` (${i.dimensions})` : ''} ‚Äî Qtd: ${i.quantity}`).join('\n') || 'A definir conforme or√ßamento vinculado.';
  const multaPct = multaPercentual ?? 2;
  const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return `CONTRATO DE PRESTA√á√ÉO DE SERVI√áOS

DAS PARTES

${CONTRATADA_NOME}, tamb√©m atuando sob o nome fantasia ${CONTRATADA_NOME_FANTASIA}, pessoa jur√≠dica de direito privado, inscrita no CNPJ n¬∫ ${CONTRATADA_CNPJ}, com sede em ${CONTRATADA_ENDERECO}, sendo aqui denominada CONTRATADA.

${customerName.toUpperCase()}${qualificacaoContratante}${address ? `, residente e domiciliado(a) em ${address}` : ''}, sendo aqui denominado(a) CONTRATANTE.

Assim sendo, ambas as partes decidem celebrar o presente CONTRATO DE PRESTA√á√ÉO DE SERVI√áOS, mediante as cl√°usulas e condi√ß√µes definidas a seguir.

CL√ÅUSULA PRIMEIRA ‚Äî DO OBJETO

1.1 Este contrato refere-se √† presta√ß√£o de servi√ßos gr√°ficos pela CONTRATADA, conforme os itens descritos na Cl√°usula Quarta, e demais termos e condi√ß√µes detalhados neste presente contrato.

CL√ÅUSULA SEGUNDA ‚Äî OBRIGA√á√ïES DA CONTRATANTE

2.1 Caber√° √† CONTRATANTE fornecer √† CONTRATADA todas as informa√ß√µes, artes, textos, imagens e materiais necess√°rios √† realiza√ß√£o do servi√ßo, especificando os detalhes fundamentais √† consecu√ß√£o.

2.2 O pagamento deve ser efetuado pela CONTRATANTE de acordo com a forma e condi√ß√µes estabelecidas na Cl√°usula Quinta deste contrato.

CL√ÅUSULA TERCEIRA ‚Äî OBRIGA√á√ïES DA CONTRATADA

3.1 A CONTRATADA dever√° realizar os servi√ßos solicitados pela CONTRATANTE conforme acordado.

3.2 A CONTRATADA se obriga a manter absoluto sigilo sobre os dados, materiais, informa√ß√µes e documentos da CONTRATANTE, mesmo ap√≥s a conclus√£o dos servi√ßos ou do t√©rmino da rela√ß√£o contratual, sendo vedada a comercializa√ß√£o desses dados ou o uso para outras finalidades ‚Äî ressalvado o uso de imagens do resultado final para fins de portf√≥lio, salvo obje√ß√£o expressa da CONTRATANTE.

3.3 Ser√° de responsabilidade da CONTRATADA o √¥nus trabalhista ou tribut√°rio referente a eventuais funcion√°rios envolvidos na presta√ß√£o do servi√ßo, ficando a CONTRATANTE isenta de qualquer obriga√ß√£o em rela√ß√£o a eles.

CL√ÅUSULA QUARTA ‚Äî DOS SERVI√áOS

4.1 A CONTRATADA realizar√° os servi√ßos contratados conforme as especifica√ß√µes abaixo:
${itensDescricao}

CL√ÅUSULA QUINTA ‚Äî DO PRE√áO E DAS CONDI√á√ïES DE PAGAMENTO

5.1 A CONTRATANTE se responsabiliza a pagar o valor de R$ ${total.toFixed(2).replace('.', ',')}${desconto > 0 ? ` (j√° com desconto de R$ ${desconto.toFixed(2).replace('.', ',')} aplicado)` : ''} √† CONTRATADA pelos servi√ßos prestados.

5.2 ${formaPagamentoTexto || 'A forma de pagamento ser√° combinada entre as partes no ato da contrata√ß√£o.'}

5.3 Caso haja atraso no pagamento, ser√° devida multa morat√≥ria no valor de ${multaPct}% sobre a parcela inadimplida.

5.4 Considera-se o cumprimento integral do contrato o momento em que todos os servi√ßos especificados tenham sido conclu√≠dos, sob aprova√ß√£o e revis√£o final da CONTRATANTE.

CL√ÅUSULA SEXTA ‚Äî DO DESCUMPRIMENTO

6.1 O descumprimento de qualquer uma das cl√°usulas por qualquer parte poder√° implicar na rescis√£o deste contrato.

CL√ÅUSULA S√âTIMA ‚Äî DO PRAZO DE PRODU√á√ÉO E ENTREGA

7.1 ${prazoTexto || 'O prazo de produ√ß√£o e entrega ser√° informado √† CONTRATANTE conforme a complexidade do servi√ßo, contado a partir da aprova√ß√£o da arte e confirma√ß√£o do pagamento, quando exigido.'}

7.2 A CONTRATADA dever√° comunicar eventual impossibilidade de cumprimento do prazo, podendo as partes estabelecer novo prazo de comum acordo.

CL√ÅUSULA OITAVA ‚Äî DA RESCIS√ÉO IMOTIVADA

8.1 Poder√° o presente instrumento ser rescindido por qualquer das partes, a qualquer momento, sem motivo relevante, cabendo √† CONTRATANTE pagar apenas os valores referentes aos servi√ßos j√° em andamento ou conclu√≠dos at√© a data da rescis√£o.

CL√ÅUSULA NONA ‚Äî DA OBSERV√ÇNCIA √Ä LGPD

9.1 A CONTRATANTE expressa consentimento de que a CONTRATADA ir√° coletar, tratar e compartilhar os dados necess√°rios ao cumprimento deste contrato, nos termos do Art. 7¬∫, inc. V, da Lei Geral de Prote√ß√£o de Dados (Lei n¬∫ 13.709/2018), e demais leis referentes √† utiliza√ß√£o de dados.

CL√ÅUSULA D√âCIMA ‚Äî DA AUS√äNCIA DE V√çNCULO TRABALHISTA

10.1 Este contrato expressa a total inexist√™ncia de v√≠nculo trabalhista entre as partes, n√£o havendo subordina√ß√£o, pessoalidade ou habitualidade que configure qualquer v√≠nculo empregat√≠cio.

CL√ÅUSULA D√âCIMA PRIMEIRA ‚Äî DO FORO

11.1 Para dirimir quaisquer controv√©rsias oriundas do presente contrato, as partes elegem o foro da Comarca de Santar√©m, Estado do Par√°.
${observacoes ? `\nOBSERVA√á√ïES ADICIONAIS:\n${observacoes}\n` : ''}
Justos e de acordo, firmam o presente instrumento.

Santar√©m, ${dataHoje}.

___________________________________________
${customerName.toUpperCase()} ‚Äî CONTRATANTE

___________________________________________
${CONTRATADA_NOME} ‚Äî CONTRATADA`;
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

      showAlert(`Saldo de R$ ${balanceToSettle.toFixed(2).replace('.', ',')} quitado com sucesso!\nA venda/servi√ßo foi totalmente quitada.`);
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

  // Intervalo de datas do periodo selecionado ‚Äî usado tanto pra filtrar notas por CRIACAO
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
  // Faturamento por data de CADA PAGAMENTO (nao pela data de criacao da nota) ‚Äî uma nota criada
  // fora do periodo mas paga DENTRO do periodo conta aqui; olha em TODAS as vendas, nao so
  // filteredOrders (que filtra por criacao)
  const { start: periodoStart, end: periodoEnd } = getPeriodRange();
  const totalRevenue = realSales
    .filter(o => o.status !== 'canceled')
    .flatMap(getRevenueEventsForSale)
    .filter(ev => { const d = new Date(ev.date); return d >= periodoStart && d <= periodoEnd; })
    .reduce((acc, ev) => acc + ev.value, 0);

  // Custo tambem por evento de pagamento (mesma base do faturamento acima) ‚Äî cada pagamento
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

  // Detecta tema claro/escuro (a classe fica no <body>, aplicada pelo App) ‚Äî o grafico usa
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
    // do periodo selecionado ‚Äî mesma logica ja usada nos cards do topo
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

  // Analise Detalhada (modal "Analise de Performance") ‚Äî independente do filtro de periodo do Dashboard,
  // sempre olha pro dia/mes/ano corrente e os ultimos 30 dias, a partir de todas as vendas reais.
  const [analisePeriodo, setAnalisePeriodo] = useState<'hoje' | 'semana' | 'mes' | 'ano'>('mes');

  const analiseDetalhada = useMemo(() => {
    // Custo de uma nota = so material Lona/Adesivo (por m2/metro, batendo com o item do
    // Estoque de Insumos) + custos extras manuais lancados na nota (frete, mao de obra,
    // ferro, tinta, etc ‚Äî ver painel "Custos da Nota" no PDV / ExtraCost). Nenhum outro
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

    // Soma o valor de comissoes JA LANCADAS (com % ja aplicado) dentro de um periodo ‚Äî conta
    // como custo, ja que e dinheiro que sai pro funcionario sobre aquele servico.
    // So entram aqui comissoes SEM origem_nota_id (lancadas manualmente, sem nota vinculada):
    // as que tem origem_nota_id ja estao dentro de custoDoPedido via extraCosts da propria
    // nota ‚Äî somar as duas listas ao mesmo tempo duplicava a despesa e derrubava o Lucro
    // Liquido artificialmente pra servicos puxados de nota.
    const custoComissoesNoPeriodo = (desde: Date, ate: Date = now) => {
      return comissoesLancadas
        .filter(c => !c.origemNotaId)
        .filter(c => { const d = new Date(`${c.data}T00:00:00`); return d >= desde && d <= ate; })
        .reduce((acc, c) => acc + c.valor, 0);
    };

    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const diaSemanaAtual = now.getDay(); // 0=domingo, 1=segunda, ..., 6=sabado
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - diaSemanaAtual); startOfWeek.setHours(0, 0, 0, 0); // semana comeca no domingo
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const inicioPeriodo = analisePeriodo === 'hoje' ? startOfDay : analisePeriodo === 'semana' ? startOfWeek : analisePeriodo === 'mes' ? startOfMonth : startOfYear;
    // Usa startOfDay (nao "now" com hora corrente) pra contar dias inteiros sem fracao,
    // evitando arredondamento que fazia a janela do grafico comecar antes do inicio real do periodo
    const diasNoPeriodo = Math.max(1, Math.round((startOfDay.getTime() - inicioPeriodo.getTime()) / 86400000) + 1);

    const calcPeriodo = (desde: Date) => {
      const vendasNaoCanceladas = realSales.filter(o => o.status !== 'canceled');
      // Faturamento conta pela data de CADA pagamento (nao a data de criacao da nota) ‚Äî uma
      // nota paga em partes em dias diferentes conta certo em cada dia
      const faturamento = vendasNaoCanceladas
        .flatMap(getRevenueEventsForSale)
        .filter(ev => new Date(ev.date) >= desde)
        .reduce((acc, ev) => acc + ev.value, 0);
      // Custo continua ligado a data da nota (o produto foi consumido/produzido quando a venda
      // foi feita, independente de quando cada parcela foi paga) + comissoes lancadas no periodo
      const custo = vendasNaoCanceladas.filter(o => new Date(o.createdAt) >= desde).reduce((acc, o) => acc + custoDoPedido(o), 0)
        + custoComissoesNoPeriodo(desde);
      const count = vendasNaoCanceladas.filter(o => new Date(o.createdAt) >= desde).length;
      return { faturamento, lucro: Math.max(0, faturamento - custo), count };
    };

    const periodo = calcPeriodo(inicioPeriodo);
    const mediaDiariaPeriodo = periodo.faturamento / diasNoPeriodo;

    // Produtos mais vendidos no periodo selecionado
    const produtosMap: Record<string, { name: string; qty: number; total: number }> = {};
    realSales.filter(o => o.status !== 'canceled' && new Date(o.createdAt) >= inicioPeriodo).forEach(o => {
      o.items?.forEach(item => {
        if (!produtosMap[item.name]) produtosMap[item.name] = { name: item.name, qty: 0, total: 0 };
        produtosMap[item.name].qty += item.quantity || 1;
        produtosMap[item.name].total += item.area ? (item.price || 0) * item.area * item.quantity : (item.price || 0) * item.quantity;
      });
    });
    const produtosMaisVendidos = Object.values(produtosMap).sort((a, b) => b.qty - a.qty).slice(0, 6);

    // Vendas mais recentes do periodo selecionado (pra lista "Historico de Vendas" no modal)
    const vendasDoPeriodo = realSales
      .filter(o => o.status !== 'canceled' && new Date(o.createdAt) >= inicioPeriodo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    // Extrato de caixa: cada RECEBIMENTO individual (nao pedido) que entrou dentro do periodo
    // selecionado, com a data/hora exata do pagamento ‚Äî mostra os recebimentos fracionados
    // (ex: uma nota de R$300 paga em 2 partes aparece como 2 linhas separadas, cada uma na
    // sua propria data/hora real)
    const extratoRecebimentos = realSales
      .filter(o => o.status !== 'canceled')
      .flatMap(o => getRevenueEventsForSale(o).map(ev => ({ ...ev, saleId: o.id, customerName: o.customerName || 'Cliente de Balc√£o' })))
      .filter(ev => new Date(ev.date) >= inicioPeriodo && new Date(ev.date) <= now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Linha do periodo (por dia, ou por mes se for "ano") ‚Äî usa o INICIO REAL do periodo
    // selecionado (inicioPeriodo), nao um numero fixo de dias, senao o grafico de "Hoje" e
    // "Semana" ficavam mostrando sempre a mesma janela de 7 dias corridos
    const porBucket: Record<string, { faturamento: number; custo: number }> = {};
    // Faturamento E custo: por data de CADA pagamento ‚Äî uma nota paga em partes em dias
    // diferentes conta em cada dia certo, nao tudo de uma vez na data de criacao. O custo
    // total do pedido e amortizado proporcionalmente a fatia de cada pagamento (mesma regra
    // usada em calcularLucroDaVenda pra nota individual), entao o lucro do dia reflete o que
    // realmente entrou de caixa naquele dia, ja descontada a parte correspondente do custo.
    realSales.filter(o => o.status !== 'canceled').forEach(o => {
      const eventos = getRevenueEventsForSale(o);
      const custoPedido = custoDoPedido(o);
      const totalRecebidoPedido = eventos.reduce((acc, ev) => acc + ev.value, 0);
      eventos.forEach(ev => {
        const d = new Date(ev.date);
        if (isNaN(d.getTime())) return;
        const diaSemHora = new Date(d); diaSemHora.setHours(0, 0, 0, 0);
        if (diaSemHora < inicioPeriodo || diaSemHora > startOfDay) return;
        const key = analisePeriodo === 'ano' ? format(d, 'MM/yyyy') : format(d, 'dd/MM');
        if (!porBucket[key]) porBucket[key] = { faturamento: 0, custo: 0 };
        porBucket[key].faturamento += ev.value;
        // Fatia do custo proporcional a esse pagamento especifico (nao ao pedido inteiro)
        const fatiaCusto = totalRecebidoPedido > 0 ? custoPedido * (ev.value / totalRecebidoPedido) : 0;
        porBucket[key].custo += fatiaCusto;
      });
    });
    // Comissoes lancadas por dia tambem contam como custo, direto no dia que foram lancadas.
    // So as SEM origem_nota_id ‚Äî as puxadas de nota ja entraram acima via custoDoPedido(o)
    // (extraCosts da propria nota), senao a mesma comissao conta 2x no grafico.
    comissoesLancadas.filter(c => !c.origemNotaId).forEach(c => {
      const d = new Date(`${c.data}T00:00:00`);
      if (isNaN(d.getTime()) || d < inicioPeriodo || d > startOfDay) return;
      const key = analisePeriodo === 'ano' ? format(d, 'MM/yyyy') : format(d, 'dd/MM');
      if (!porBucket[key]) porBucket[key] = { faturamento: 0, custo: 0 };
      porBucket[key].custo += c.valor;
    });
    const linhaGrafico: { day: string; faturamento: number; lucro: number }[] = [];
    if (analisePeriodo === 'ano') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = format(d, 'MM/yyyy');
        const v = porBucket[key] || { faturamento: 0, custo: 0 };
        linhaGrafico.push({ day: format(d, 'MM/yy'), faturamento: v.faturamento, lucro: Math.max(0, v.faturamento - v.custo) });
      }
    } else {
      for (let i = 0; i < diasNoPeriodo; i++) {
        const d = new Date(inicioPeriodo); d.setDate(inicioPeriodo.getDate() + i);
        const key = format(d, 'dd/MM');
        const v = porBucket[key] || { faturamento: 0, custo: 0 };
        linhaGrafico.push({ day: key, faturamento: v.faturamento, lucro: Math.max(0, v.faturamento - v.custo) });
      }
    }

    return { periodo, mediaDiariaPeriodo, produtosMaisVendidos, vendasDoPeriodo, extratoRecebimentos, linhaGrafico };
  }, [realSales, inventory, analisePeriodo]);

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
        subtitle={`Gest√£o Inteligente & Produtividade`} 
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
                   <span className="text-[9px] text-white/20">at√©</span>
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
                  // em desktop abre o bal√£o flutuante MessagesSidebarPopup ‚Äî o MESMO
                  // componente de chat usado ali ‚Äî, em vez de navegar pra uma tela separada.
                  // Em mobile (sem espa√ßo pro bal√£o flutuante) cai na navega√ß√£o normal.
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
                <p className="text-[10px] text-primary-400 font-bold uppercase">Ver mensagens ‚Üí</p>
              </GlassCard>
            )}
            {canFila && (
              <GlassCard onClick={() => setActiveTab?.('clientes_espera')} className="p-5 border-white/5 cursor-pointer hover:border-primary-500/30 transition-all space-y-2">
                <p className="text-[9px] font-black uppercase text-white/30 tracking-widest">Clientes em Espera</p>
                <h4 className="text-2xl font-black text-white">{aguardandoFila.length} <span className="text-xs text-white/40 font-bold">aguardando</span></h4>
                <p className="text-[10px] text-primary-400 font-bold uppercase">Atender pr√≥ximo ‚Üí</p>
              </GlassCard>
            )}
            {canFila && (
              <GlassCard className="p-5 border-white/5 space-y-2">
                <p className="text-[9px] font-black uppercase text-white/30 tracking-widest">Tempo de Espera</p>
                <h4 className="text-lg font-black text-white">M√©dia: {fmtMinSec(tempoMedio)}</h4>
                <p className="text-[10px] text-amber-400 font-bold">Maior: {fmtMinSec(maiorEspera)}</p>
              </GlassCard>
            )}
          </div>
        );
      })()}

      {user?.isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Faturamento', val: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, diff: 'Hoje/Per√≠odo', color: 'emerald', action: () => setIsRevenueModalOpen(true) },
            { label: 'Lucro L√≠quido', val: `R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, diff: `Margem: ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(0) : '65'}%`, color: 'emerald', action: () => setIsRevenueModalOpen(true) },
            { label: 'Markup M√©dio', val: `${avgMarkup.toFixed(2).replace('.', ',')}x`, diff: 'Faturamento/Custo', color: 'primary', action: () => setActiveTab?.('inventory') },
            { label: 'Pto Equil√≠brio', val: `R$ ${breakevenPoint.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, diff: `${Math.min(100, Math.round((totalRevenue / breakevenPoint) * 100))}% Reatido`, color: 'purple', action: () => setIsRevenueModalOpen(true) },
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
                   <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">An√°lise de Performance</h3>
                   <p className="text-xs text-white/30 font-bold tracking-widest uppercase">Evolu√ß√£o do Faturamento por Per√≠odo</p>
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
                     <h3 className="text-xs font-black text-white italic tracking-widest uppercase">Ordem de Servi√ßos</h3>
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
                             <p className="text-[9px] text-white/30 truncate italic">{s.service || 'Servi√ßo s/ descri√ß√£o'}</p>
                             <p className="text-[8px] text-white/40 uppercase font-bold truncate">RESP: {s.responsibleName || s.responsible || 'Respons√°vel'}</p>
                             <p className="text-[7px] text-white/20">{s.createdAt ? safeFormat(s.createdAt, 'dd/MM HH:mm') : ''}</p>
                          </div>
                          <Badge variant={s.status === 'producao' ? 'primary' : 'warning'} className="text-[8px] h-5 px-1.5 uppercase font-black leading-none shrink-0">
                            {s.status === 'producao' ? 'Em Produ√ß√£o' : 'Pendente'}
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
              <p className="text-[10px] text-white/30 font-bold mt-2 uppercase">Necess√°rio repor estoque cr√≠tico</p>
              <Button variant="secondary" size="sm" className="w-full mt-6 h-10 text-[9px] uppercase tracking-widest border-amber-500/20 text-amber-500" onClick={() => setActiveTab?.('pos')}>Ver Estoque</Button>
           </GlassCard>
        </div>
      </div>

      {/* SE√á√ÉO INTEGRADA: Servi√ßos & Mercadorias Gr√°ficas & Fluxos Financeiros (Pendentes) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
         {/* Graphics Services & Merchandise Block */}
         <GlassCard className="p-8 border-white/5 bg-white/[0.02] flex flex-col justify-between animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div>
               <div className="flex justify-between items-start mb-6">
                  <div>
                     <h3 className="text-xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
                        <FileText size={18} className="text-red-500" />
                        Servi√ßos & Mercadorias Gr√°ficas
                     </h3>
                     <p className="text-[10px] text-white/30 font-bold tracking-widest uppercase mb-1">Rafa Arts Graphics ‚Ä¢ PDV & Contratos</p>
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

               {/* Total Stats Card ‚Äî dados reais */}
               <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/10">
                     <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Vendas Este M√™s</p>
                     <p className="text-2xl font-black text-white">{realSales.filter(o => { const d = new Date(o.createdAt); const now = new Date(); return o.status !== 'canceled' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length} un</p>
                  </div>
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                     <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Faturamento do M√™s</p>
                     <p className="text-xl font-black text-white">R$ {realSales.filter(o => { const d = new Date(o.createdAt); const now = new Date(); return o.status !== 'canceled' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((acc, o) => acc + (o.status === 'pending' ? (o.downPayment || 0) : (o.total || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
               </div>

               {/* Vendas mais recentes ‚Äî dados reais */}
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
                               <span className="text-[11px] font-black text-white uppercase italic truncate">{(o.items?.[0]?.name || 'Servi√ßo/Produto').toUpperCase()}{(o.items?.length || 0) > 1 ? ` +${o.items!.length - 1}` : ''}</span>
                               <Badge variant="outline" className={cn("text-[8px] py-0 px-1 leading-none h-4", o.status === 'pending' ? "border-amber-500/30 text-amber-400" : "border-emerald-500/30 text-emerald-400")}>
                                 {o.status === 'pending' ? 'Em Aberto' : 'Pago'}
                               </Badge>
                            </div>
                            <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider truncate">Cliente: {(o.customerName || 'Cliente de Balc√£o').toUpperCase()}</p>
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
                    const domainStr = o.items?.[0]?.name ? 'Gr√°fica' : 'Servi√ßos';
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
                               <span className="text-[10px] font-black text-white uppercase">{o.customerName || 'Cliente Balc√£o'}</span>
                               <Badge className="text-[7px] py-0 px-1 uppercase bg-rose-500/15 text-rose-400 border-none font-bold">Incompleto</Badge>
                            </div>
                            <p className="text-[9px] text-white/30 font-black uppercase tracking-wider">Origem: {domainStr} ‚Ä¢ {dateStr} ‚Ä¢ Tipo: {type}</p>
                            <p className="text-[8px] text-primary-300 font-black">RESPONS√ÅVEL: {o.responsibleName || 'Caixa Central'}</p>
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

      <Modal isOpen={isRevenueModalOpen && !!user?.isAdmin} onClose={() => setIsRevenueModalOpen(false)} title="An√°lise Detalhada" size="xl">
         <div className="space-y-4 p-1 sm:p-2">
            {/* Seletor de periodo */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
               {[
                 { id: 'hoje', label: 'Hoje' },
                 { id: 'semana', label: 'Semana' },
                 { id: 'mes', label: 'M√™s' },
                 { id: 'ano', label: 'Ano' },
               ].map(p => (
                 <button
                   key={p.id}
                   onClick={() => setAnalisePeriodo(p.id as any)}
                   className={cn(
                     "px-3.5 h-8 rounded-lg text-[10px] font-black uppercase tracking-wide cursor-pointer border-0 transition-all",
                     analisePeriodo === p.id ? "bg-primary-500 text-slate-900" : "bg-transparent text-white/40 hover:text-white"
                   )}
                 >
                   {p.label}
                 </button>
               ))}
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
                  <p className="text-[8px] font-black uppercase text-white/40 tracking-widest mb-1">M√©dia Di√°ria</p>
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
                  <h4 className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-2">Hist√≥rico de Vendas</h4>
                  <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar max-h-[190px]">
                     {analiseDetalhada.vendasDoPeriodo.length === 0 && (
                       <p className="text-[10px] text-white/30 text-center py-6">Sem vendas nesse per√≠odo.</p>
                     )}
                     {analiseDetalhada.vendasDoPeriodo.map((venda) => (
                       <div
                         key={venda.id}
                         onClick={() => { setPendingReceiptOpenId(venda.id); setActiveTab?.('pos'); }}
                         className="flex items-center justify-between gap-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary-500/30 rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors"
                       >
                          <div className="flex items-center gap-1.5 min-w-0">
                             <span className="text-[10px] font-bold text-white truncate">{(venda.customerName || 'Cliente de Balc√£o').toUpperCase()}</span>
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

            <Button className="w-full h-11" onClick={() => { setPendingGoToHistorico(true); setActiveTab?.('pos'); }}>Ver Hist√≥rico de Vendas</Button>

            {/* Extrato de Caixa: cada recebimento individual, na ordem exata de hora que entrou */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
               <h4 className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-2">Extrato de Caixa do Per√≠odo (recebimentos)</h4>
               <div className="space-y-1 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {analiseDetalhada.extratoRecebimentos.length === 0 && (
                    <p className="text-[10px] text-white/30 text-center py-6">Nenhum recebimento nesse per√≠odo.</p>
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
              <p className="text-[10px] font-black uppercase text-primary-300 tracking-[3px]">Identifica√ß√£o</p>
              <div className="space-y-4">
                <Input 
                  label="T√≠tulo do Widget" 
                  value={selectedWidget.title} 
                  onChange={(e) => updateWidget({ title: e.target.value })} 
                />
                <Input 
                  label="Subt√≠tulo" 
                  value={selectedWidget.subtitle || ''} 
                  onChange={(e) => updateWidget({ subtitle: e.target.value })} 
                />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-primary-300 tracking-[3px]">Apar√™ncia & Layout</p>
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
              <p className="text-[10px] font-black uppercase text-primary-300 tracking-[3px]">Dados & Intelig√™ncia</p>
              <div className="space-y-4">
                 <div className="space-y-2">
                    <p className="text-[10px] font-bold text-white/40 uppercase">Cole√ß√£o de Dados</p>
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
                       <span className="text-xs font-bold text-white">Atualiza√ß√£o em Tempo Real</span>
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
                <Button className="flex-1" icon={Check} onClick={() => setIsSidebarOpen(false)}>Salvar Configura√ß√£o</Button>
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
          title="Quitar Saldo Devedor do Servi√ßo / Venda"
          size="md"
        >
          <div className="space-y-6 p-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white/50">Cliente:</span>
                <span className="text-sm font-black text-white">{(settleModalOrder.customerName || 'Cliente de Balc√£o').toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white/50">Total do Pedido:</span>
                <span className="text-sm font-bold text-white">R$ {settleModalOrder.total.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-400">Entrada J√° Paga:</span>
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
                  { id: 'cartao_credito', label: 'Cart√£o Cr√©dito' },
                  { id: 'cartao_debito', label: 'Cart√£o D√©bito' }
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
  // esperar o listener em tempo real do Supabase -- sem isso o nome editado s√≥
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

  // Etapas do funil (pra dropdown de mudar etapa direto da conversa) ‚Äî busca sozinho, sem
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
      showAlert('N√£o foi poss√≠vel mudar a etapa.');
    } finally {
      setIsChangingStage(false);
    }
  };

  // Botao "Sugestao do Robozinho" ‚Äî le a ultima mensagem do cliente, consulta estoque/produtos
  // reais e monta uma sugestao de resposta. O atendente sempre revisa/edita antes de enviar
  // (o Robozinho nunca envia mensagem sozinho).
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const handleGenerateRobozinhoSuggestion = async () => {
    const lastIncoming = [...messages].reverse().find(m => m.direction === 'incoming' && m.text);
    if (!lastIncoming) { showAlert('Ainda n√£o tem mensagem do cliente nessa conversa pra sugerir uma resposta.'); return; }
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
      console.error('Erro ao gerar sugest√£o do Robozinho:', err);
      showAlert('N√£o foi poss√≠vel gerar a sugest√£o agora.');
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
      showAlert('N√£o foi poss√≠vel salvar os nomes.');
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
    if (!novoPhone) { showAlert('Informe um telefone v√°lido.'); return; }
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
      showAlert('N√£o foi poss√≠vel salvar o telefone.');
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
      showAlert('N√£o foi poss√≠vel copiar o telefone.');
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
        // Hist√≥rico de vers√µes: admin pode navegar
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
      showAlert('N√£o foi poss√≠vel salvar a nota.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (note: any) => {
    // ‚úÖ S√≥ Admin pode excluir
    if (!user?.isAdmin) {
      showAlert('Apenas administradores podem excluir notas.');
      return;
    }
    if (!(await showConfirm('Excluir esta nota permanentemente?'))) return;
    try { 
      await supabase.from('crm_messages').delete().eq('id', note.id); 
    } catch (err) { 
      console.error('Erro ao excluir nota:', err);
      showAlert('N√£o foi poss√≠vel excluir a nota.');
    }
  };

  // ‚úÖ Admin pode editar notas (navegar por hist√≥rico)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [noteVersionIndex, setNoteVersionIndex] = useState(0);

  const handleEditNote = async (note: any, newText: string) => {
    if (!user?.isAdmin && note.senderName !== user?.name) {
      showAlert('Voc√™ s√≥ pode editar suas pr√≥prias notas.');
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
      showAlert('N√£o foi poss√≠vel editar a nota.');
    }
  };

  // ‚úÖ Admin pode navegar entre vers√µes
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
      showAlert('N√£o foi poss√≠vel criar a tarefa.');
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

  // --- Vendas do cliente (mesmo telefone) -- fecha o ciclo conversa -> nota -> contrato/or√ßamento,
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

  // --- Transcri√ß√£o de √°udio ---
  // Toggle por conversa (salvo no proprio lead, ver Lead em types.ts) -- fica identico nas duas
  // telas (Funil CRM e Mensagens) porque as duas leem/escrevem o mesmo documento. O gatilho em si
  // e' manual (botao "Transcrever" em cada mensagem de audio) porque este projeto ainda nao tem
  // nenhum provedor de voz-para-texto conectado -- ver lib/audioTranscription.ts.
  const [transcribingId, setTranscribingId] = useState<string | null>(null);
  const handleTranscribeAudio = async (message: any) => {
    if (!message?.id || !message?.mediaUrl) {
      showAlert('Esse √°udio n√£o tem um arquivo associado pra transcrever.');
      return;
    }
    setTranscribingId(message.id);
    try {
      const texto = await transcribeAudioMessage(message.mediaUrl);
      await supabase.from('crm_messages').update({
        transcription: { text: texto, isAutomatic: false, isVisible: true },
      }).eq('id', message.id);
    } catch (err: any) {
      showAlert(err?.message || 'N√£o foi poss√≠vel transcrever esse √°udio.');
    } finally {
      setTranscribingId(null);
    }
  };
  const handleToggleAutoTranscribe = async () => {
    if (!conversation?.id) return;
    try {
      await supabase.from('leads').update({ auto_transcribe: !conversation.autoTranscribe }).eq('id', conversation.id);
    } catch (err) {
      console.error('Erro ao atualizar transcri√ß√£o autom√°tica:', err);
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
    { label: 'üëã Boas-vindas', text: 'Ol√°! Seja bem-vindo(a). Como posso te ajudar com o seu pedido hoje?' },
    { label: 'üí∞ Or√ßamento PIX', text: 'Segue o resumo do seu or√ßamento. Para dar in√≠cio √† produ√ß√£o, aceitamos entrada via PIX de 50%.' },
    { label: '‚úÖ Pagamento Confirmado', text: 'Confirmamos o recebimento do seu pagamento! Seu pedido j√° est√° em fase de produ√ß√£o.' },
    { label: 'üì¶ Pedido Pronto', text: 'Not√≠cia boa! Seu pedido ficou pronto e j√° est√° dispon√≠vel para retirada/entrega.' },
    { label: 'üìÖ Agendamento Entrega', text: 'Prezado(a) cliente, confirmando seu agendamento de entrega para a data e hor√°rio combinados.' },
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

  // Presenca do contato (online / digitando / gravando audio / visto por ultimo) ‚Äî
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
    }).catch((err) => console.error('Falha ao assinar presen√ßa (n√£o impede o resto):', err));

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
    if (presence.status === 'recording') return 'gravando √°udio...';
    if (presence.status === 'available') return 'online';
    if (presence.lastSeenAt) {
      const d = new Date(presence.lastSeenAt);
      const hoje = d.toDateString() === new Date().toDateString();
      return `visto por √∫ltimo ${hoje ? 'hoje √†s' : format(d, "dd/MM '√†s'")} ${format(d, 'HH:mm')}`;
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

      // Dispara a mensagem de verdade pro WhatsApp (so pra conversas desse canal ‚Äî
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
            showAlert(`A mensagem ficou salva aqui no sistema, mas n√£o foi poss√≠vel enviar pro WhatsApp de verdade: ${respData.error || 'erro desconhecido'}`);
          } else if (respData.whatsappMessageId && msgRow?.id) {
            // Guarda o id que a Evolution API deu pra essa mensagem -- e o que permite ao
            // webhook (que recebe o "eco" dessa mesma mensagem, com fromMe:true) reconhecer
            // que ela ja foi gravada por aqui e nao duplicar na conversa (ver whatsapp-webhook.js).
            await supabase.from('crm_messages').update({ whatsapp_message_id: respData.whatsappMessageId }).eq('id', msgRow.id);
          }
        } catch (sendErr) {
          console.error('Falha ao disparar mensagem pro WhatsApp:', sendErr);
          showAlert('A mensagem ficou salva aqui no sistema, mas n√£o foi poss√≠vel enviar pro WhatsApp de verdade (falha de conex√£o).');
        }
      }
    } catch (err) {
      console.error('Falha ao enviar mensagem:', err);
    }
  };

  const handleSimulateClientMessage = async (customText?: string) => {
    if (!conversation || !currentCompany) return;
    const clientText = customText || (await showPrompt('Digite a mensagem enviada pelo cliente para teste:', 'Ol√°! Gostaria de saber como est√° o andamento do meu pedido e prazo de entrega.')) || '';
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
          {/* Bot√£o Voltar ‚Äî s√≥ no mobile: sai do Modo Conversa em Foco e retorna √† lista, sem recarregar a p√°gina */}
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
              {/* Status de presenca real (online/digitando/gravando/visto por ultimo) ‚Äî
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
              <span className="text-[9px] text-white/20">‚Ä¢</span>
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
            {/* ‚úÖ Bot√£o para ver mais a√ß√µes (se tiver mais de 6) */}
            {quickActions.filter(a => a.permission).length > 6 && (
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1.5 min-w-0 h-8 w-8 border-none text-white/40 hover:text-primary-300" 
                  icon={MoreHorizontal}
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  title="Mais a√ß√µes"
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

      {/* Dropdown de Etapa do Funil ‚Äî muda a etapa da conversa direto daqui, sem precisar
          arrastar no Kanban. So aparece se essa conversa tiver um lead/funil vinculado.
          Dropdown customizado (em vez de <select> nativo) pra a listinha que abre tambem
          ficar no mesmo visual do resto do app ‚Äî o <select> do navegador nao da pra estilizar
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
                                   {m.text && m.text !== 'üì∑ Imagem' && (
                                     <p className="px-1.5 pb-1">{m.text}</p>
                                   )}
                                </div>
                              ) : isVideo ? (
                                <div className="space-y-1.5 min-w-[200px]">
                                   <video src={m.mediaUrl} controls preload="metadata" className="max-w-full max-h-64 rounded-xl bg-black" />
                                   {m.text && m.text !== 'üé• V√≠deo' && (
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
                                     <FileAudio size={13} /> <span className="font-bold">Mensagem de √°udio</span>
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
                             {timeStr} ‚Ä¢ {isOutgoing ? 'Sistema' : m.senderName || 'Cliente'}
                           </p>
                        </div>
                      </div>
                    );
                 })}
                 <div ref={messagesEndRef} />
              </div>

              {/* Chat Input - FIXO */}
              <div className="p-3 bg-slate-100/50 border-t border-white/10 space-y-2 flex-shrink-0">
                {/* BARRA DE RESPOSTAS R√ÅPIDAS / MENSAGENS SALVAS ‚Äî escondida por padr√£o, s√≥ abre se clicar */}
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  <button
                    type="button"
                    onClick={handleGenerateRobozinhoSuggestion}
                    disabled={isGeneratingSuggestion}
                    className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-primary-300 bg-primary-500/10 text-primary-700 hover:bg-primary-500/20 shadow-sm whitespace-nowrap transition-all shrink-0 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    title="O Robozinho l√™ a √∫ltima mensagem do cliente, consulta o estoque/produtos e sugere uma resposta pra voc√™ revisar"
                  >
                    {isGeneratingSuggestion ? <Loader2 size={10} className="animate-spin" /> : <Bot size={10} />}
                    {isGeneratingSuggestion ? 'Pensando...' : 'Sugest√£o do Robozinho'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuickReplies(v => !v)}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm whitespace-nowrap transition-all shrink-0 cursor-pointer flex items-center gap-1",
                      showQuickReplies ? "bg-primary-500 text-white border-primary-500" : "bg-white text-slate-500 border-slate-200 hover:text-primary-600 hover:border-primary-300"
                    )}
                  >
                    <Sparkles size={10} className={showQuickReplies ? "text-white" : "text-amber-500"} /> R√°pidas
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
                <h5 className="text-[11px] font-black uppercase text-primary-300 tracking-[3px]">Informa√ß√µes</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {/* Telefone -- editavel (com Salvar quando muda) + botao de copiar, diferente
                       dos outros campos abaixo que ainda sao s√≥ leitura. */}
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-primary-300 transition-colors shrink-0">
                         <Phone size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Telefone</p>
                         <input
                           value={phoneDraft}
                           onChange={(e) => setPhoneDraft(e.target.value)}
                           placeholder="‚Äî"
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
                     { label: 'Origem', value: conversation.sourceType || conversation.channel || '‚Äî', icon: Target },
                     { label: 'E-mail', value: conversation.email || clienteVinculado?.email || '‚Äî', icon: AtSign },
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

              {/* Endere√ßo -- puxado do cadastro unificado (tabela clientes), casado pelo telefone. */}
              <div className="space-y-4">
                <h5 className="text-[11px] font-black uppercase text-primary-300 tracking-[3px]">Endere√ßo do Cliente</h5>
                {isLoadingCliente ? (
                  <p className="text-xs text-white/30">Buscando cadastro...</p>
                ) : clienteVinculado ? (
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-4">
                     <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 shrink-0"><MapPin size={16} /></div>
                     <p className="text-xs font-bold text-white/80 leading-relaxed">
                       {[clienteVinculado.logradouro, clienteVinculado.numero, clienteVinculado.distrito, clienteVinculado.city, clienteVinculado.state, clienteVinculado.cep]
                         .filter(Boolean).join(', ') || 'Cadastro encontrado, mas sem endere√ßo preenchido.'}
                     </p>
                  </div>
                ) : (
                  <p className="text-xs text-white/30">Nenhum cadastro em Clientes com esse telefone ainda. Use "Venda PDV" pra criar um.</p>
                )}
              </div>

              {/* Transcri√ß√£o de √°udio autom√°tica -- toggle salvo no lead, identico nas duas telas. */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20"><FileAudio size={16} /></div>
                    <div>
                       <p className="text-xs font-bold text-white/80">Transcri√ß√£o de √Åudio Autom√°tica</p>
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
                    placeholder="Escreva uma nota interna (n√£o √© vis√≠vel pro cliente)..."
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
                         <p className="text-[9px] text-white/30 font-bold italic">Por {note.senderName || 'Sistema'} ‚Ä¢ {dataStr}</p>
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
               <p className="text-xs text-white/40 italic">Clique em uma mensagem para preench√™-la no campo de envio.</p>
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
               <p className="text-[10px] text-white/30">Pedidos com o mesmo telefone dessa conversa ‚Äî clique pra abrir a nota, o contrato ou o or√ßamento vinculado.</p>
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
                                   Or√ßamento
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
  // Mensagens do menu lateral) ‚Äî nesse caso o ChatPanel preenche a tela
  // toda (kanban escondido). Clique direto num card do kanban mant√©m o
  // comportamento normal (60% kanban / 40% painel), sem mexer nisso.
  const [openedViaJump, setOpenedViaJump] = useState(false);
  const [isConfiguringFunnel, setIsConfiguringFunnel] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);
  // Modo de sele√ß√£o m√∫ltipla no Kanban -- liga/desliga os checkboxes nos cards pra
  // permitir excluir v√°rios leads de uma vez (em vez de um por um). Limpa a sele√ß√£o
  // sempre que sai do modo ou troca de funil, pra nunca excluir um lead "fantasma"
  // que j√° saiu da tela.
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
      showAlert('N√£o foi poss√≠vel criar o funil.');
    }
  };

  const handleDeleteFunnel = async (funnelId: string) => {
    const funnel = funnels.find(f => f.id === funnelId);
    if (!funnel) return;
    if (!user?.isAdmin) {
      showAlert('Apenas administradores podem excluir funis.');
      return;
    }
    if (!(await showConfirm(`Excluir o funil "${funnel.name}" e TODOS os leads nele?\n\nEssa a√ß√£o n√£o pode ser desfeita.`))) return;
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
      showAlert(`Funil "${funnel.name}" exclu√≠do.`);
    } catch (err) {
      console.error('Erro ao excluir funil:', err);
      showAlert('N√£o foi poss√≠vel excluir o funil.');
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
      showAlert('N√£o foi poss√≠vel criar a etapa.');
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage || !user?.isAdmin) return;
    if (!(await showConfirm(`Excluir a etapa "${stage.name}" e reclassificar todos os leads?\n\nEssa a√ß√£o n√£o pode ser desfeita.`))) return;
    try {
      // Reclassificar leads: mover pra primeira etapa
      const firstStage = stages.find(s => s.order === 0);
      await supabase.from('leads').update({ funnel_stage_id: firstStage?.id || null }).eq('funnel_stage_id', stageId);
      // Excluir a etapa
      await supabase.from('funnel_stages').delete().eq('id', stageId);
      setFunnelMenuOpen(false);
      showAlert(`Etapa "${stage.name}" exclu√≠da e leads reclassificados.`);
    } catch (err) {
      console.error('Erro ao excluir etapa:', err);
      showAlert('N√£o foi poss√≠vel excluir a etapa.');
    }
  };

  // Sai do modo de sele√ß√£o sempre que o funil muda -- os leads marcados eram de outra
  // tela e n√£o devem continuar "presos" numa sele√ß√£o que o usu√°rio nem est√° vendo mais.
  useEffect(() => {
    setLeadSelectionMode(false);
    setSelectedLeadIds(new Set());
  }, [selectedFunnelId]);

  // Exclui um lead + a conversa dele em cascata (mensagens do chat ficam √≥rf√£s sem isso,
  // ocupando espa√ßo e podendo reaparecer se o telefone mandar mensagem de novo e o
  // realtime remontar a linha). Usada tanto pro "excluir 1" quanto, em loop, pro "excluir
  // v√°rios" abaixo -- mant√©m uma √∫nica fonte de verdade pra n√£o duplicar a l√≥gica de cascata.
  const excluirLeadComCascata = async (lead: Lead) => {
    if (lead.phone) {
      await supabase.from('crm_messages').delete().eq('company_id', 'rafa-arts').eq('phone', lead.phone);
    }
    await supabase.from('leads').delete().eq('id', lead.id);
  };

  const handleDeleteLead = async (lead: Lead) => {
    if (!(await showConfirm(`Excluir o lead "${lead.fullName}" e toda a conversa dele?\n\nEssa a√ß√£o n√£o pode ser desfeita.`))) return;
    try {
      await excluirLeadComCascata(lead);
      if (selectedLead?.id === lead.id) setSelectedLead(null);
      setLeads(prev => prev.filter(l => l.id !== lead.id));
    } catch (err) {
      console.error('Erro ao excluir lead:', err);
      showAlert('N√£o foi poss√≠vel excluir o lead.');
    }
  };

  // Excluir v√°rios leads selecionados no Kanban de uma vez (checkbox por card, ver
  // KanbanCard/KanbanColumn). Cada lead leva sua conversa junto (mesma cascata do excluir
  // individual) -- em s√©rie mesmo, pra n√£o estourar limite de conex√µes do Supabase com
  // muitos leads marcados de uma vez.
  const handleDeleteSelectedLeads = async () => {
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) return;
    if (!(await showConfirm(`Excluir ${ids.length} lead(s) selecionado(s) e todas as conversas deles?\n\nEssa a√ß√£o n√£o pode ser desfeita.`))) return;
    try {
      const leadsParaExcluir = leads.filter(l => ids.includes(l.id));
      for (const lead of leadsParaExcluir) {
        await excluirLeadComCascata(lead);
      }
      if (selectedLead && ids.includes(selectedLead.id)) setSelectedLead(null);
      setLeads(prev => prev.filter(l => !ids.includes(l.id)));
      setSelectedLeadIds(new Set());
      setLeadSelectionMode(false);
      showAlert(`${leadsParaExcluir.length} lead(s) exclu√≠do(s).`);
    } catch (err) {
      console.error('Erro ao excluir leads selecionados:', err);
      showAlert('N√£o foi poss√≠vel excluir os leads selecionados.');
    }
  };

  // --- Handlers do modal "Gest√£o de Funis & Etapas" (Configurar) ---
  // Antes esse modal era s√≥ decora√ß√£o: input sem onChange, cores sem onClick,
  // bot√µes "Adicionar Etapa"/Automa√ß√µes/Editar/Excluir sem handler nenhum.
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
      showAlert('N√£o foi poss√≠vel renomear o funil.');
    }
  };

  const handleSetFunnelColor = async (color: string) => {
    if (!selectedFunnelId) return;
    try {
      await supabase.from('funnels').update({ color }).eq('id', selectedFunnelId);
    } catch (err) {
      console.error('Erro ao definir cor do funil:', err);
      showAlert('N√£o foi poss√≠vel salvar a cor do funil.');
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
      showAlert('N√£o foi poss√≠vel renomear a etapa.');
    }
  };

  const handleSetStageColor = async (stageId: string, color: string) => {
    try {
      await supabase.from('funnel_stages').update({ color, updated_at: new Date().toISOString() }).eq('id', stageId);
    } catch (err) {
      console.error('Erro ao definir cor da etapa:', err);
      showAlert('N√£o foi poss√≠vel salvar a cor da etapa.');
    }
  };

  const handleToggleStageAutomation = async (stage: FunnelStage) => {
    const isOn = !!stage.automations?.createTask;
    if (!isOn) {
      const taskTitle = await showPrompt('T√≠tulo da tarefa a criar automaticamente ao entrar nessa etapa:', 'Fazer contato com o lead');
      if (!taskTitle) return;
      try {
        await supabase.from('funnel_stages').update({
          automations: { ...(stage.automations || {}), createTask: true, taskTitle },
          updated_at: new Date().toISOString(),
        }).eq('id', stage.id);
        showAlert(`Automa√ß√£o ativada na etapa "${stage.name}": cria a tarefa "${taskTitle}" automaticamente.`);
      } catch (err) {
        console.error('Erro ao ativar automa√ß√£o:', err);
        showAlert('N√£o foi poss√≠vel ativar a automa√ß√£o.');
      }
    } else {
      if (!(await showConfirm(`Desativar a cria√ß√£o autom√°tica de tarefa na etapa "${stage.name}"?`))) return;
      try {
        await supabase.from('funnel_stages').update({
          automations: { ...(stage.automations || {}), createTask: false },
          updated_at: new Date().toISOString(),
        }).eq('id', stage.id);
      } catch (err) {
        console.error('Erro ao desativar automa√ß√£o:', err);
        showAlert('N√£o foi poss√≠vel desativar a automa√ß√£o.');
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
          subtitle={currentFunnel?.name || "Gest√£o Estrat√©gica"} 
          actions={
            <div className="flex gap-3">
               {/* ‚úÖ Dropdown Gerenciador de Funis */}
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
                                  ‚úï {s.name}
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
                 {leadSelectionMode ? 'Cancelar Sele√ß√£o' : 'Selecionar V√°rios'}
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
            {/* Cada coluna tem largura fixa e igual ‚Äî se nao couber todas na tela, rola de lado
                em vez de encolher (senao com muitas etapas cada coluna fica espremida demais).
                Com uma conversa aberta, mostra so a coluna da etapa daquele lead (pra poder trocar
                de conversa dentro da mesma etapa sem sair da tela de mensagem ‚Äî nesse caso a coluna
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
        title="Gest√£o de Funis & Etapas"
      >
        <div className="p-4 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
           <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-primary-300 tracking-[3px]">Configura√ß√£o do Funil</p>
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
                           Ordem: {idx + 1} ‚Ä¢ {stage.isInitial ? 'Inicial' : stage.isFinal ? 'Venda' : 'Negocia√ß√£o'}
                           {stage.automations?.createTask && <span className="text-amber-400"> ‚Ä¢ Automa√ß√£o ativa</span>}
                         </p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button
                           variant="ghost"
                           size="sm"
                           icon={Zap}
                           className={cn("p-1 h-8 w-8", stage.automations?.createTask ? "text-amber-400" : "text-white/30")}
                           title={stage.automations?.createTask ? "Automa√ß√£o ativa ‚Äî clique para desativar" : "Ativar automa√ß√£o (criar tarefa ao entrar na etapa)"}
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
    // Com o modo de sele√ß√£o ligado, o card n√£o deve mais "arrastar" ao clicar --
    // clicar precisa marcar/desmarcar o checkbox, n√£o iniciar um drag do Kanban.
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
  
  // Modal de Simula√ß√£o de Mensagens Multicanal
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [simChannel, setSimChannel] = useState<'WhatsApp' | 'Instagram' | 'WebChat' | 'Facebook' | 'E-mail' | 'Telegram'>('WhatsApp');
  const [simName, setSimName] = useState('Juliana Costa');
  const [simPhone, setSimPhone] = useState('(62) 99777-3322');
  const [simMessage, setSimMessage] = useState('Ol√°! Vi o an√∫ncio da gr√°fica e quero fazer um or√ßamento de 1.000 cart√µes de visita e 2 banners para minha loja.');

  // Mesma sincroniza√ß√£o do Funil CRM: mant√©m o chat selecionado alinhado com a
  // lista ao vivo, sen√£o mudar a etapa (ou qualquer campo) dentro da pr√≥pria
  // conversa n√£o refletia no ChatPanel (ficava com o valor antigo "congelado").
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
      lastMessageText: 'Quero fechar o pedido de 1000 panfletos e 500 cart√µes. Como fa√ßo para pagar a entrada no PIX?',
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
      lastMessageText: 'Voc√™s fazem a instala√ß√£o da fachada em ACM com LED no local em Goi√¢nia? Qual o prazo?',
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
      lastMessageText: 'Ol√°! Vi no site os servi√ßos de impress√£o offset. Qual o valor para 5.000 panfletos da gr√°fica?',
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
      lastMessageText: 'Boa tarde! Gostaria de um or√ßamento para 10 placas de sinaliza√ß√£o comercial em acr√≠lico.',
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
      lastMessageText: 'Prezados, solicitamos proposta t√©cnica para envelopamento da frota comercial (5 utilit√°rios).',
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
      lastMessageText: 'Ol√° equipe Rafa Arts, preciso de 50 camisetas personalizadas com estampa em silk-screen para evento.',
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
      "Conectando √†s APIs Multicanais (WhatsApp, Insta, WebChat, FB, E-mail, Telegram)...",
      "Autenticando sess√£o Rafa Arts OmniChannel...",
      "Buscando mensagens pendentes em todos os canais...",
      "Importando contatos e direcionando para a etapa ENTRADA do CRM...",
      "Sincroniza√ß√£o conclu√≠da com sucesso!"
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
              { text: 'Ol√°, gostaria de saber os valores para impress√£o de panfletos 14x20cm e cart√µes de visita.', direction: 'incoming' },
              { text: 'Ol√° Carlos! Tudo bem? Fica R$ 450,00 o pacote com 1.000 panfletos e 500 cart√µes verniz localizado. Entrada de 50% no PIX.', direction: 'outgoing' },
              { text: 'Quero fechar o pedido de 1000 panfletos e 500 cart√µes. Como fa√ßo para pagar a entrada no PIX?', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Mariana Santos') {
            msgs = [
              { text: 'Oi! Vi a fachada em ACM com LED no Instagram da Rafa Arts e gostei muito da qualidade.', direction: 'incoming' },
              { text: 'Ol√° Mariana! Que √≥timo! Produzimos e instalamos fachadas personalizadas em ACM com backlight LED. Qual a medida da loja?', direction: 'outgoing' },
              { text: 'Voc√™s fazem a instala√ß√£o da fachada em ACM com LED no local em Goi√¢nia? Qual o prazo?', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Gabriel Mendes') {
            msgs = [
              { text: 'Ol√°! Vi no site os servi√ßos de impress√£o offset. Qual o valor para 5.000 panfletos da gr√°fica?', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Amanda Prado') {
            msgs = [
              { text: 'Boa tarde! Gostaria de um or√ßamento para 10 placas de sinaliza√ß√£o comercial em acr√≠lico.', direction: 'incoming' }
            ];
          } else if (sl.fullName === 'Ricardo Fonseca') {
            msgs = [
              { text: 'Prezados, solicitamos proposta t√©cnica para envelopamento da frota comercial (5 utilit√°rios).', direction: 'incoming' }
            ];
          } else {
            msgs = [
              { text: 'Ol√° equipe Rafa Arts, preciso de 50 camisetas personalizadas com estampa em silk-screen para evento.', direction: 'incoming' }
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

      // Pr√©-seleciona lead se vindo do popup de mensagens
      if (preselectedLeadId) {
        const target = fetchedLeads.find(l => l.id === preselectedLeadId);
        if (target) {
          setSelectedChat({ ...target, name: target.fullName });
          return;
        }
      }
      // N√£o abre nenhuma conversa automaticamente ao entrar na aba -- s√≥ mostra a lista.
      // A conversa s√≥ abre quando o usu√°rio clica numa mensagem espec√≠fica.
      // (a criacao automatica de conversas de exemplo foi removida ‚Äî a lista fica vazia
      // de verdade ate a integracao real do WhatsApp comecar a trazer conversas)
    };
    loadLeads();
    const channel = supabase.channel('messages-leads').on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `company_id=eq.${currentCompany.id}` }, loadLeads).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany]);

  // O som de notifica√ß√£o de mensagem nova (incoming) e a notifica√ß√£o nativa do
  // navegador foram movidos pro shell raiz do app (ver notifyIncomingMessage em
  // App.tsx, useEffect 'app-incoming-lead-automation'). Antes esse listener s√≥
  // existia aqui dentro de MessagesModule, ent√£o s√≥ tocava/avisava com essa aba
  // especificamente aberta ‚Äî no shell raiz (sempre montado) ele continua
  // funcionando com o usu√°rio em qualquer outra aba do CRM ou com o navegador
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
                title="Transcri√ß√£o de √Åudio Inteligente"
              >
                <div className={cn("w-1.5 h-1.5 rounded-full", autoTranscribe ? "bg-emerald-400 animate-pulse" : "bg-white/20")} />
                <span className="text-[9px] font-black uppercase tracking-widest">Transcri√ß√£o: {autoTranscribe ? 'ON' : 'OFF'}</span>
              </div>
           </div>
           
           {/* SUB-TABS DO SISTEMA ANTI-V√ÅCUO */}
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

        {/* ALERTA DE CLIENTES NO V√ÅCUO */}
        {unrepliedCount > 0 && viewFilter !== 'unreplied' && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between animate-pulse shrink-0">
             <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-rose-500/25 flex items-center justify-center text-rose-400">
                   <Clock size={12} className="animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <div>
                   <p className="text-[9px] font-black uppercase text-rose-400 leading-none mb-0.5">Alerta de V√°cuo</p>
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
                slaLabel = `h√° ${diffMinutes} min`;
              } else if (diffMinutes < 15) {
                slaColor = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
                slaLabel = `h√° ${diffMinutes} min`;
              } else if (diffMinutes < 30) {
                slaColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                slaLabel = `ATEN√á√ÉO: ${diffMinutes} min`;
                pulseBadge = true;
              } else if (diffMinutes < 60) {
                slaColor = "text-orange-500 bg-orange-500/10 border-orange-500/20";
                slaLabel = `ALERTA: ${diffMinutes} min`;
                pulseBadge = true;
              } else {
                const hours = Math.floor(diffMinutes / 60);
                slaColor = "text-rose-500 bg-rose-500/15 border-rose-500/20";
                slaLabel = `CR√çTICO: ${hours}h+ s/ resp`;
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
                  <p className="text-xs text-white/50">Teste a automa√ß√£o de entrada no CRM em qualquer canal</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsSimulateModalOpen(false)}
                className="text-white/40 hover:text-white text-sm font-bold p-2"
              >
                ‚úï
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
                        if (ch === 'WhatsApp') setSimMessage('Ol√°! Quero or√ßamento de 1.000 panfletos e cart√µes de visita no WhatsApp.');
                        if (ch === 'Instagram') setSimMessage('Oi! Vi o post das fachadas em ACM no Instagram. Quanto custa m2?');
                        if (ch === 'WebChat') setSimMessage('Ol√°! Vi o site de voc√™s e gostaria de contratar adesiva√ß√£o de frota.');
                        if (ch === 'Facebook') setSimMessage('Boa tarde! Gostaria de cota√ß√£o de 10 placas de sinaliza√ß√£o acr√≠lica.');
                        if (ch === 'E-mail') setSimMessage('Prezados, solicitamos proposta comercial para envelopamento de 5 ve√≠culos.');
                        if (ch === 'Telegram') setSimMessage('Ol√°! Voc√™s fazem camisetas personalizadas em silk-screen para evento?');
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
                <span>Ao receber, o sistema criar√° o Lead automaticamente na coluna <strong>ENTRADA</strong> do Funil CRM.</span>
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
    { id: 'acc_1', fbAccountId: 'act_123456789', name: 'RPro Imobili√°ria Principal', currency: 'BRL', status: 'ACTIVE', spendMonth: 12500 },
    { id: 'acc_2', fbAccountId: 'act_987654321', name: 'RPro Gr√°fica Express', currency: 'BRL', status: 'ACTIVE', spendMonth: 4200 },
  ]);

  const [campaigns, setCampaigns] = useState([
    { id: 'cam_1', name: 'Lan√ßamento Condom√≠nio Aura', objective: 'LEADS', status: 'ACTIVE', budget: 500, budgetType: 'DAILY', spend: 8500, results: 245, cpl: 34.69 },
    { id: 'cam_2', name: 'Convers√£o Gr√°fica Premium', objective: 'OUTCOME_SALES', status: 'PAUSED', budget: 1500, budgetType: 'LIFETIME', spend: 1500, results: 42, cpl: 35.71 },
  ]);

  const [adsets, setAdsets] = useState([
    { id: 'set_1', name: 'P√∫blico Quente - Lookalike 1%', status: 'ACTIVE', dailyBudget: 150, optimizationGoal: 'LEADS' },
    { id: 'set_2', name: 'Interesses: Real Estate / Luxury', status: 'ACTIVE', dailyBudget: 100, optimizationGoal: 'LEADS' },
  ]);

  const [ads, setAds] = useState([
    { id: 'ad_1', name: 'V√≠deo Imersivo Aura - v1', status: 'ACTIVE', creative: { title: 'Lan√ßamento Aura' }, spend: 4500, results: 150 },
    { id: 'ad_2', name: 'Est√°tico Fachada - v2', status: 'ACTIVE', creative: { title: 'Sua nova vida' }, spend: 2000, results: 50 },
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
            An√∫ncios
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
      { key: 'spendMonth', label: 'Gasto no M√™s', render: (v: number) => `R$ ${v.toLocaleString('pt-BR')}` },
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
      { id: 'acc_1', fbAccountId: 'act_123456789', name: 'RPro Imobili√°ria Principal', currency: 'BRL', status: 'ACTIVE', spendMonth: 12500 },
      { id: 'acc_2', fbAccountId: 'act_987654321', name: 'RPro Gr√°fica Express', currency: 'BRL', status: 'ACTIVE', spendMonth: 4200 },
    ];

    return (
      <GenericListView 
        title="Contas de An√∫ncio" 
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
      { key: 'budget', label: 'Or√ßamento', render: (v: number, row: any) => `R$ ${v.toLocaleString('pt-BR')} (${row.budgetType === 'DAILY' ? 'Dia' : 'Total'})` },
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
      { id: 'cam_1', name: 'Lan√ßamento Condom√≠nio Aura', objective: 'LEADS', status: 'ACTIVE', budget: 500, budgetType: 'DAILY', spend: 8500, results: 245, cpl: 34.69 },
      { id: 'cam_2', name: 'Convers√£o Gr√°fica Premium', objective: 'OUTCOME_SALES', status: 'PAUSED', budget: 1500, budgetType: 'LIFETIME', spend: 1500, results: 42, cpl: 35.71 },
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
      { key: 'name', label: 'Conjunto de An√∫ncios' },
      { key: 'status', label: 'Status', render: (v: string) => <Badge variant={v === 'ACTIVE' ? 'success' : 'outline'}>{v}</Badge> },
      { key: 'dailyBudget', label: 'Orc. Di√°rio', render: (v: number) => v ? `R$ ${v.toLocaleString('pt-BR')}` : '-' },
      { key: 'optimizationGoal', label: 'Otimiza√ß√£o', render: (v: string) => <Badge variant="outline">{v}</Badge> },
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
              Ver An√∫ncios
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
      { id: 'set_1', name: 'P√∫blico Quente - Lookalike 1%', status: 'ACTIVE', dailyBudget: 150, optimizationGoal: 'LEADS' },
      { id: 'set_2', name: 'Interesses: Real Estate / Luxury', status: 'ACTIVE', dailyBudget: 100, optimizationGoal: 'LEADS' },
    ];

    return (
      <GenericListView 
        title="Conjuntos de An√∫ncios" 
        subtitle="Segmenta√ß√£o e or√ßamentos" 
        columns={columns} 
        data={adsets} 
        icon={Layers} 
        onAdd={() => setActiveDetail({ type: 'adset', isCreating: true })} 
      />
    );
  };

  const renderAdsList = () => {
    const columns = [
      { key: 'name', label: 'An√∫ncio' },
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
      { id: 'ad_1', name: 'V√≠deo Imersivo Aura - v1', status: 'ACTIVE', creative: { title: 'Lan√ßamento Aura' }, spend: 4500, results: 150 },
      { id: 'ad_2', name: 'Est√°tico Fachada - v2', status: 'ACTIVE', creative: { title: 'Sua nova vida' }, spend: 2000, results: 50 },
    ];

    return (
      <GenericListView 
        title="An√∫ncios" 
        subtitle="Pe√ßas e desempenho individual" 
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
      ? ['resumo', 'conjuntos', 'anuncios', 'p√∫blicos', 'gastos', 'hist√≥rico']
      : activeDetail.type === 'adset'
      ? ['resumo', 'p√∫blico', 'posicionamentos', 'or√ßamento', 'anuncios']
      : ['resumo', 'identidade', 'criativo', 'preview', 'rastreamento'];

    return (
      <Drawer 
        isOpen={!!activeDetail} 
        onClose={() => setActiveDetail(null)} 
        title={`${activeDetail.isCreating ? 'Criar' : 'Editar'} ${activeDetail.type === 'campaign' ? 'Campanha' : activeDetail.type === 'adset' ? 'Conjunto' : 'An√∫ncio'}`}
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
                          <option value="TRAFFIC" className="bg-slate-900">TR√ÅFEGO</option>
                          <option value="CONVERSIONS" className="bg-slate-900">VENDAS</option>
                        </select>
                      </div>
                   </div>

                   {activeDetail.type === 'campaign' && (
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <p className="text-[10px] font-black uppercase text-white/30">Or√ßamento</p>
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
                            <option value="DAILY" className="bg-slate-900">DI√ÅRIO</option>
                            <option value="LIFETIME" className="bg-slate-900">VITAL√çCIO</option>
                          </select>
                        </div>
                     </div>
                   )}

                   {activeDetail.type === 'adset' && (
                     <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-white/30">Or√ßamento Di√°rio</p>
                        <Input 
                          type="number" 
                          value={formData.dailyBudget} 
                          onChange={(e) => setFormData({ ...formData, dailyBudget: Number(e.target.value) })} 
                        />
                     </div>
                   )}

                   {activeDetail.type === 'ad' && (
                     <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-white/30">T√≠tulo do Criativo</p>
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
                         <p className="text-[10px] font-bold text-white">RPro Imobili√°ria</p>
                      </div>
                      <img src="https://picsum.photos/seed/apartment/1080/1920" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent space-y-2">
                         <h4 className="text-sm font-bold text-white">√öltimas Unidades Aura!</h4>
                         <p className="text-xs text-white/60 line-clamp-2">Venha viver no melhor condom√≠nio de alto padr√£o da regi√£o...</p>
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

              {(activeTab === 'p√∫blico' || activeTab === 'p√∫blicos') && (
                <div className="space-y-6">
                   <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                      <div className="flex justify-between items-center"><h5 className="text-[10px] font-black uppercase text-primary-300">P√∫blico Estimado</h5><Badge variant="success">1.2M - 1.5M</Badge></div>
                      <div className="space-y-4">
                         <div className="space-y-1"><p className="text-[9px] text-white/30 uppercase font-black">Localiza√ß√£o</p><p className="text-xs text-white">Brasil: S√£o Paulo (+40km)</p></div>
                         <div className="space-y-1"><p className="text-[9px] text-white/30 uppercase font-black">Idade</p><p className="text-xs text-white">25 - 55 anos</p></div>
                         <div className="space-y-1"><p className="text-[9px] text-white/30 uppercase font-black">Interesses</p><p className="text-xs text-white">Im√≥veis de Luxo, Investimentos, Decora√ß√£o</p></div>
                      </div>
                   </div>
                   <Button variant="secondary" icon={Search} className="w-full">Editar Segmenta√ß√£o</Button>
                </div>
              )}
           </div>

           <div className="flex gap-3 pt-10">
              <Button variant="secondary" className="flex-1" onClick={() => setActiveDetail(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSave}>Salvar Altera√ß√µes</Button>
           </div>
        </div>
      </Drawer>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <SectionHeader 
        title="Meta Ads Intelligence" 
        subtitle="Central avan√ßada de performance" 
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
               Este M√™s
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase text-white/60">
               <Filter size={14} />
               Status: Ativos (12)
            </div>
         </div>
         <div className="flex items-center gap-4">
            <p className="text-[10px] font-black uppercase text-white/20">√öltima Sincroniza√ß√£o: h√° 5 min</p>
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
               <Zap size={14} />
            </div>
         </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <GlassCard className="p-6">
           <p className="text-[10px] font-black uppercase text-white/30 mb-2">Gasto Hoje</p>
           <h4 className="text-3xl font-light text-white">R$ {stats.spendToday.toLocaleString('pt-BR')}</h4>
           <p className="text-[10px] text-emerald-400 font-bold mt-2">‚ñ≤ 12% vs Ontem</p>
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
           <p className="text-[10px] font-black uppercase text-white/30 mb-2">CPL M√©dio</p>
           <h4 className="text-3xl font-light text-primary-300">R$ {stats.cpl.toLocaleString('pt-BR')}</h4>
           <p className="text-[10px] text-red-400 font-bold mt-2">‚ñº 5% meta (R$ 40)</p>
         </GlassCard>
         <GlassCard className="p-6">
           <p className="text-[10px] font-black uppercase text-white/30 mb-2">ROAS M√©dio</p>
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
            <h5 className="text-[10px] font-black uppercase tracking-[2px] text-white/50 mb-6">Distribui√ß√£o Verba</h5>
            <div className="space-y-4">
               {['Imobili√°ria High', 'Gr√°fica Express', 'Lan√ßamento Aura'].map(acc => (
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

// --- PDV / POS ---
// Cronometro de contagem regressiva ate a previsao de entrega. Se ja passou da hora,
// para de contar e fica vermelho (nao fica contando "atraso" indefinidamente).
const EntregaCountdown = ({ scheduledFor, delivered, onEdit, onDeliver, onDeleteSchedule }: { scheduledFor: string; delivered?: boolean; onEdit?: () => void; onDeliver?: () => void; onDeleteSchedule?: () => void }) => {
  const target = new Date(scheduledFor).getTime();
  const [now, setNow] = useState(() => Date.now());
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const overdue = !delivered && now >= target;

  useEffect(() => {
    if (overdue || delivered) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [overdue, delivered]);

  const diff = Math.max(0, target - now);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const countdownLabel = days > 0 ? `${days}d ${hours}h` : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const hasActions = onEdit || onDeliver || onDeleteSchedule;

  return (
    <div className="inline-block shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!hasActions) return;
          if (menuPos) { setMenuPos(null); return; }
          const rect = btnRef.current?.getBoundingClientRect();
          if (rect) setMenuPos({ top: rect.bottom + 4, left: rect.left });
        }}
        className={cn(
          "text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 border-0",
          hasActions && "cursor-pointer",
          delivered ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : overdue ? "bg-rose-500/15 text-rose-400 border-rose-500/30" : "bg-primary-500/10 text-primary-300 border-primary-500/20"
        )}
      >
        {delivered ? `‚óè Entregue ¬∑ ${safeFormat(scheduledFor, 'dd/MM HH:mm')}` : `Entrega: ${safeFormat(scheduledFor, 'dd/MM HH:mm')} ${overdue ? '¬∑ ATRASADO' : `¬∑ faltam ${countdownLabel}`}`}
      </button>
      {menuPos && createPortal(
        <>
          <div className="fixed inset-0 z-[200]" onClick={() => setMenuPos(null)} />
          <div
            className="fixed z-[201] bg-[#1a2333] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
             {onEdit && (
               <button onClick={() => { setMenuPos(null); onEdit(); }} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-white/70 hover:bg-white/5 hover:text-white text-left cursor-pointer bg-transparent border-0">
                  <Pencil size={12} /> Editar Agendamento
               </button>
             )}
             {onDeliver && (
               <button onClick={() => { setMenuPos(null); onDeliver(); }} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/10 text-left cursor-pointer bg-transparent border-0">
                  <CheckCircle2 size={12} /> Marcar como Entregue
               </button>
             )}
             {onDeleteSchedule && (
               <button onClick={() => { setMenuPos(null); onDeleteSchedule(); }} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-rose-400 hover:bg-rose-500/10 text-left cursor-pointer bg-transparent border-0">
                  <Trash2 size={12} /> Excluir Agendamento
               </button>
             )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export const POSModule = ({ currentCompany, addPendingOrder }: { currentCompany: Company | null, addPendingOrder: (order: SaleOrder) => void }) => {
  const { isRegisterOpen, setIsRegisterOpen, user, setActiveTab: setRootActiveTab, setPendingWhatsAppShare, openWhatsAppChat, pendingReceiptOpenId, setPendingReceiptOpenId, pendingHistoryClientFilter, setPendingHistoryClientFilter, pendingHistoryProductSearch, setPendingHistoryProductSearch, prefilledCustomer, setPrefilledCustomer, pendingReceivablesFilter, setPendingReceivablesFilter, pendingGoToHistorico, setPendingGoToHistorico, pendingGoToServicos, setPendingGoToServicos, pendingOpenContratoId, setPendingOpenContratoId, pendingOpenOrcamentoId, setPendingOpenOrcamentoId } = React.useContext(AppContext)!;
  const [soundAlertsEnabled, setSoundAlertsEnabledState] = useState(() => localStorage.getItem('rpro_sound_alerts_enabled') !== 'false');
  const setSoundAlertsEnabled = (v: boolean) => {
    setSoundAlertsEnabledState(v);
    localStorage.setItem('rpro_sound_alerts_enabled', v ? 'true' : 'false');
  };
  const alertedThresholdsRef = React.useRef<Set<string>>(new Set());
  const initializedSalesRef = React.useRef<Set<string>>(new Set());
  const [pdvMenuConfig, setPdvMenuConfig] = useState<{ id: string; visible: boolean }[] | null>(null);
  useEffect(() => {
    supabase.from('configuracoes').select('pdv_menu_config').eq('company_id', 'rafa-arts').maybeSingle().then(({ data }) => {
      if (data?.pdv_menu_config && Array.isArray(data.pdv_menu_config) && data.pdv_menu_config.length > 0) {
        setPdvMenuConfig(data.pdv_menu_config);
      }
    });
  }, []);

  // Toca um bipe simples via Web Audio (sem depender de nenhum arquivo de audio)
  const playAlertBeep = () => {
    try {
      let tocadas = 0;
      const tocarProxima = () => {
        if (tocadas >= 3) return;
        tocadas += 1;
        const audio = new Audio('/sounds/service-alert.mp3');
        audio.addEventListener('ended', () => {
          if (tocadas < 3) setTimeout(tocarProxima, 500);
        });
        audio.play().catch(() => {
          // Se o navegador bloquear o audio, ainda tenta as proximas repeticoes no tempo certo
          if (tocadas < 3) setTimeout(tocarProxima, 500);
        });
      };
      tocarProxima();
    } catch (e) { /* navegador sem suporte a audio, ignora silenciosamente */ }
  };

  const [alertToast, setAlertToast] = useState<{ message: string; saleId?: string } | null>(null);

  const [activeTab, setActiveTabState] = useState<'venda' | 'historico' | 'estoque' | 'servicos' | 'orcamentos' | 'clientes' | 'contratos' | 'excluidos'>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('rpro_pos_subtab') : null;
    const validSubTabs = ['venda', 'historico', 'estoque', 'servicos', 'orcamentos', 'clientes', 'contratos', 'excluidos'];
    return (saved && validSubTabs.includes(saved)) ? (saved as any) : 'venda';
  });
  const setActiveTab = (tab: 'venda' | 'historico' | 'estoque' | 'servicos' | 'orcamentos' | 'clientes' | 'contratos' | 'excluidos') => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') localStorage.setItem('rpro_pos_subtab', tab);
  };
  const [cart, setCart] = useState<SaleOrderItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [dimensionModalProduct, setDimensionModalProduct] = useState<Product | null>(null);
  const [etiquetaModalProduct, setEtiquetaModalProduct] = useState<Product | null>(null);
  const emptyEtiquetaForm = { quantidade: 100, largura: 8, altura: 8, larguraMaterial: 0, metrosInput: 0, valorInput: 0 };
  const [etiquetaForm, setEtiquetaForm] = useState({ ...emptyEtiquetaForm });
  const [etiquetaInputMode, setEtiquetaInputMode] = useState<'quantidade' | 'metros' | 'valor'>('quantidade');
  const [dimWidth, setDimWidth] = useState<number | ''>('');
  const [dimHeight, setDimHeight] = useState<number | ''>('');
  const [dimLarguraMaterial, setDimLarguraMaterial] = useState<number>(0);
  // Valor final do item ‚Äî comeca preenchido com o calculo automatico (largura x altura x
  // preco, ou consumo linear x preco pro tipo "metro"), mas o usuario pode editar aqui pra
  // dar desconto ou aumentar antes de confirmar. Esse valor editado (nao o calculo puro) e
  // o que fica salvo no carrinho, na nota, e e o que conta pra comissao do funcionario.
  const [dimValorOverride, setDimValorOverride] = useState<number | ''>('');
  const [dimValorFoiEditado, setDimValorFoiEditado] = useState(false);

  // Recalcula o valor automatico (largura x altura x preco, ou consumo linear x preco pro
  // tipo "metro") sempre que os dados relevantes mudam, e so aplica no campo editavel
  // enquanto o usuario ainda NAO tiver digitado um valor manual ali
  useEffect(() => {
    if (!dimensionModalProduct || dimValorFoiEditado) return;
    const w = dimWidth === '' ? 0 : Number(dimWidth);
    const h = dimHeight === '' ? 0 : Number(dimHeight);
    if (w <= 0 || h <= 0) { setDimValorOverride(''); return; }
    const isMetro = dimensionModalProduct.unitType === 'metro';
    const rolo = dimLarguraMaterial;
    const consumo = rolo > 0 ? calcularConsumoLinear(w, h, rolo) : (w * h);
    const valorCalculado = isMetro ? consumo * dimensionModalProduct.price * selectedQty : w * h * dimensionModalProduct.price * selectedQty;
    const valorAutomatico = Math.max(valorCalculado, dimensionModalProduct.valorMinimo || 0);
    setDimValorOverride(Number(valorAutomatico.toFixed(2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensionModalProduct, dimWidth, dimHeight, dimLarguraMaterial, selectedQty, dimValorFoiEditado]);


  // Insulfilm: modal proprio pra aproveitamento entre varias pecas da mesma nota (corte fisico do rolo)
  const [insulfilmModalProduct, setInsulfilmModalProduct] = useState<Product | null>(null);
  const [insulfilmLarguraMaterial, setInsulfilmLarguraMaterial] = useState<number>(1.5);
  const [insulfilmPecas, setInsulfilmPecas] = useState<{ id: string; largura: number | ''; altura: number | '' }[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [settlingOrder, setSettlingOrder] = useState<SaleOrder | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isScheduleActionsMenuOpen, setIsScheduleActionsMenuOpen] = useState(false);
  const [scheduleMenuPos, setScheduleMenuPos] = useState<{ bottom: number; left: number; width: number } | null>(null);
  const scheduleBtnRef = React.useRef<HTMLButtonElement>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerModalIntent, setCustomerModalIntent] = useState<'finalize' | 'preselect' | 'orcamento' | 'contrato'>('preselect');
  const [customerModalMode, setCustomerModalMode] = useState<'search' | 'create'>('search');

  // --- Pesquisa de clientes ---
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerSalesStats, setCustomerSalesStats] = useState<Record<string, { total: number; count: number; lastDate: string | null; hasPending: boolean; pendingBalance: number }>>({});
  const [customerSortBy, setCustomerSortBy] = useState<'recentes' | 'az' | 'ultima_compra' | 'maior_valor' | 'frequentes'>('recentes');
  // Cliente selecionado na busca que tem nota pendente ‚Äî bloqueia o fluxo ate o caixa confirmar
  // com o cliente se ja foi paga, pra nao deixar pendencia esquecida no sistema.
  const [pendingDebtCustomer, setPendingDebtCustomer] = useState<{ customer: any; pendingBalance: number } | null>(null);

  // --- Cadastro (r√°pido + mais op√ß√µes) ---
  const emptyCustomerForm = {
    full_name: '', cep: '', numero: '', email: '', logradouro: '', phone: '', distrito: '',
    nascimento: '', cpf_cnpj: '', rg: '', city: '', state: '', complemento: '',
    limite_credito: '', patrimonios: [] as { propriedade: string; valor: string }[], notes: '',
  };
  const [newCustomerForm, setNewCustomerForm] = useState({ ...emptyCustomerForm });
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const customerNameInputRef = React.useRef<HTMLInputElement>(null);

  // customer (opcional): quando vem de um cadastro feito na hora (handleCreateCustomerInline),
  // precisamos repassar CPF/CNPJ, telefone e endere√ßo pro formulario de orcamento/contrato --
  // antes isso so acontecia ao SELECIONAR um cliente ja existente na busca, entao um cliente
  // cadastrado ali na hora perdia o CPF (ficava salvo no cadastro, mas sumia do contrato).
  const proceedAfterCustomerStep = (customer?: any) => {
    setIsCustomerModalOpen(false);
    if (customerModalIntent === 'finalize') {
      setIsPaymentModalOpen(true);
    } else if (customerModalIntent === 'orcamento') {
      if (customer) {
        const enderecoParts = [customer.logradouro, customer.numero, customer.distrito, customer.city].filter(Boolean);
        setOrcamentoForm(prev => ({
          ...prev,
          clienteId: customer.id,
          customerName: customer.full_name,
          phone: customer.phone || '',
          cpfCnpj: customer.cpf_cnpj || '',
          address: enderecoParts.join(', '),
        }));
      }
      setOrcamentoModalOpen(true);
    } else if (customerModalIntent === 'contrato') {
      if (customer) {
        const enderecoParts = [customer.logradouro, customer.numero, customer.distrito, customer.city].filter(Boolean);
        setContratoForm(prev => ({
          ...prev,
          clienteId: customer.id,
          customerName: customer.full_name,
          phone: customer.phone || '',
          cpfCnpj: customer.cpf_cnpj || '',
          address: enderecoParts.join(', '),
        }));
      }
      setContratoModalOpen(true);
    }
  };

  const [customerLoadError, setCustomerLoadError] = useState<string>('');
  const loadAllCustomers = async () => {
    setIsLoadingCustomers(true);
    setCustomerLoadError('');
    try {
      const { data, error, count } = await supabase.from('clientes').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(2000);
      if (error) {
        console.error('Erro Supabase ao carregar clientes:', error);
        setCustomerLoadError(`Erro: ${error.message} (c√≥digo: ${error.code || 's/c√≥digo'})`);
        setAllCustomers([]);
        return;
      }
      console.log('Clientes carregados:', data?.length, 'count total:', count);
      setAllCustomers(data || []);
      // Agrega estatisticas de vendas por cliente (busca leve, so campos necessarios)
      const { data: vendasData } = await supabase.from('vendas').select('cliente_id, total, status, down_payment, created_at');
      const stats: Record<string, { total: number; count: number; lastDate: string | null; hasPending: boolean; pendingBalance: number }> = {};
      (vendasData || []).forEach((v: any) => {
        if (!v.cliente_id) return;
        if (!stats[v.cliente_id]) stats[v.cliente_id] = { total: 0, count: 0, lastDate: null, hasPending: false, pendingBalance: 0 };
        stats[v.cliente_id].total += Number(v.total) || 0;
        stats[v.cliente_id].count += 1;
        if (!stats[v.cliente_id].lastDate || new Date(v.created_at) > new Date(stats[v.cliente_id].lastDate!)) {
          stats[v.cliente_id].lastDate = v.created_at;
        }
        const down = Number(v.down_payment) || 0;
        const vTotal = Number(v.total) || 0;
        const balance = Math.max(0, vTotal - down);
        if ((v.status === 'pending' || balance > 0) && v.status !== 'canceled') {
          stats[v.cliente_id].hasPending = true;
          stats[v.cliente_id].pendingBalance += balance;
        }
      });
      setCustomerSalesStats(stats);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    if (isCustomerModalOpen && customerModalMode === 'search') {
      loadAllCustomers();
    }
  }, [isCustomerModalOpen, customerModalMode]);

  useEffect(() => {
    if (isCustomerModalOpen && customerModalMode === 'create') {
      setTimeout(() => customerNameInputRef.current?.focus(), 50);
    }
  }, [isCustomerModalOpen, customerModalMode]);

  const filteredSortedCustomers = useMemo(() => {
    let list = allCustomers;
    const term = customerSearchTerm.trim().toLowerCase();
    if (term) {
      const digits = term.replace(/\D/g, '');
      list = list.filter(c =>
        (c.full_name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.cpf_cnpj || '').toLowerCase().includes(term) ||
        (c.rg || '').toLowerCase().includes(term) ||
        (digits.length >= 3 && (c.phone || '').replace(/\D/g, '').includes(digits))
      );
    }
    const withStats = list.map(c => ({ ...c, _stats: customerSalesStats[c.id] }));
    switch (customerSortBy) {
      case 'az':
        return withStats.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      case 'ultima_compra':
        return withStats.sort((a, b) => {
          const da = a._stats?.lastDate ? new Date(a._stats.lastDate).getTime() : 0;
          const db = b._stats?.lastDate ? new Date(b._stats.lastDate).getTime() : 0;
          return db - da;
        });
      case 'maior_valor':
        return withStats.sort((a, b) => (b._stats?.total || 0) - (a._stats?.total || 0));
      case 'frequentes':
        return withStats.sort((a, b) => (b._stats?.count || 0) - (a._stats?.count || 0));
      default:
        return withStats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [allCustomers, customerSearchTerm, customerSortBy, customerSalesStats]);

  const handleCepLookup = async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setIsLookingUpCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setNewCustomerForm(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          distrito: data.bairro || prev.distrito,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
    } finally {
      setIsLookingUpCep(false);
    }
  };

  const addPatrimonioRow = () => {
    setNewCustomerForm(prev => ({ ...prev, patrimonios: [...prev.patrimonios, { propriedade: '', valor: '' }] }));
  };
  const updatePatrimonioRow = (idx: number, field: 'propriedade' | 'valor', value: string) => {
    setNewCustomerForm(prev => {
      const next = [...prev.patrimonios];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, patrimonios: next };
    });
  };
  const removePatrimonioRow = (idx: number) => {
    setNewCustomerForm(prev => ({ ...prev, patrimonios: prev.patrimonios.filter((_, i) => i !== idx) }));
  };

  const startEditCustomer = (c: any) => {
    setEditingCustomerId(c.id);
    setNewCustomerForm({
      full_name: c.full_name || '', cep: c.cep || '', numero: c.numero || '', email: c.email || '',
      logradouro: c.logradouro || '', phone: c.phone || '', distrito: c.distrito || '',
      nascimento: c.nascimento || '', cpf_cnpj: c.cpf_cnpj || '', rg: c.rg || '', city: c.city || '', state: c.state || '',
      complemento: c.complemento || '', limite_credito: c.limite_credito ? String(c.limite_credito) : '',
      patrimonios: Array.isArray(c.patrimonios) ? c.patrimonios : [], notes: c.notes || '',
    });
    setIsMoreOptionsOpen(true);
    setCustomerModalMode('create');
  };

  const handleCreateCustomerInline = async () => {
    if (!newCustomerForm.full_name.trim()) {
      showAlert('Digite o nome do cliente.');
      return;
    }
    setIsCreatingCustomer(true);
    try {
      const payload = {
        full_name: newCustomerForm.full_name,
        phone: newCustomerForm.phone || null,
        email: newCustomerForm.email || null,
        cep: newCustomerForm.cep || null,
        numero: newCustomerForm.numero || null,
        logradouro: newCustomerForm.logradouro || null,
        distrito: newCustomerForm.distrito || null,
        nascimento: newCustomerForm.nascimento || null,
        cpf_cnpj: newCustomerForm.cpf_cnpj || null,
        rg: newCustomerForm.rg || null,
        city: newCustomerForm.city || null,
        state: newCustomerForm.state || null,
        complemento: newCustomerForm.complemento || null,
        limite_credito: newCustomerForm.limite_credito ? Number(newCustomerForm.limite_credito) : 0,
        patrimonios: newCustomerForm.patrimonios.filter(p => p.propriedade.trim()),
        notes: newCustomerForm.notes || null,
      };

      // Evita cliente duplicado: CPF/CNPJ igual mescla automatico (documento nao se repete);
      // nome completo igual so pergunta antes (pode ser coincidencia, e a mesma pessoa pode
      // legitimamente ter 2 numeros de telefone).
      let idParaMesclar: string | null = null;
      if (!editingCustomerId) {
        const duplicado = await buscarClienteDuplicado({ fullName: newCustomerForm.full_name, cpfCnpj: newCustomerForm.cpf_cnpj, excludeId: editingCustomerId || undefined });
        if (duplicado?.motivo === 'cpf') {
          idParaMesclar = duplicado.cliente.id;
        } else if (duplicado?.motivo === 'nome') {
          const mesclar = await showConfirm(`J√° existe um cliente cadastrado como "${duplicado.cliente.full_name}"${duplicado.cliente.phone ? ` (tel. ${duplicado.cliente.phone})` : ''}. Deseja mesclar com esse cadastro em vez de criar um novo?`);
          if (mesclar) idParaMesclar = duplicado.cliente.id;
        }
      }

      let data, error;
      if (editingCustomerId) {
        ({ data, error } = await supabase.from('clientes').update(payload).eq('id', editingCustomerId).select().single());
      } else if (idParaMesclar) {
        const duplicadoAtual = (await supabase.from('clientes').select('*').eq('id', idParaMesclar).single()).data;
        const payloadMesclado = montarPayloadMesclagem(duplicadoAtual, payload);
        ({ data, error } = await supabase.from('clientes').update(payloadMesclado).eq('id', idParaMesclar).select().single());
      } else {
        ({ data, error } = await supabase.from('clientes').insert(payload).select().single());
      }
      if (error) throw error;
      setSelectedCustomer({ id: data.id, name: data.full_name, phone: data.phone || '' });
      setNewCustomerForm({ ...emptyCustomerForm });
      setIsMoreOptionsOpen(false);
      setEditingCustomerId(null);
      setCustomerModalMode('search');
      if (!editingCustomerId) {
        proceedAfterCustomerStep(data);
      } else {
        loadAllCustomers();
      }
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      showAlert('N√£o foi poss√≠vel salvar o cliente.');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleDeleteCustomer = async (c: any) => {
    if (!(await showConfirm(`Excluir o cliente "${c.full_name}"? Essa a√ß√£o n√£o pode ser desfeita.`))) return;
    const { error } = await supabase.from('clientes').delete().eq('id', c.id);
    if (error) { showAlert('N√£o foi poss√≠vel excluir o cliente.'); return; }
    loadAllCustomers();
  };

  const handleViewCustomerHistory = (c: any) => {
    const stats = customerSalesStats[c.id];
    if (!stats) { showAlert(`${c.full_name} ainda n√£o tem vendas registradas.`); return; }
    showAlert(`Hist√≥rico de ${c.full_name}\n\nTotal de compras: ${stats.count}\nValor total: R$ ${stats.total.toFixed(2).replace('.', ',')}\n√öltima compra: ${stats.lastDate ? format(new Date(stats.lastDate), 'dd/MM/yyyy') : '‚Äî'}`);
  };

  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastFinalizedOrder, setLastFinalizedOrder] = useState<SaleOrder | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string, name: string, phone: string } | null>(null);
  const [editingFullOrder, setEditingFullOrder] = useState<SaleOrder | null>(null);
  const [editingCreatedAt, setEditingCreatedAt] = useState('');
  const [editingPaymentsList, setEditingPaymentsList] = useState<PaymentEntry[]>([]);
  const [linkedOrcamentoId, setLinkedOrcamentoId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'misto'>('pix');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [downPayment, setDownPayment] = useState(0);
  const [scheduledFor, setScheduledFor] = useState('');
  const [orderObservacoes, setOrderObservacoes] = useState('');

  // Multiplas formas de pagamento na mesma venda
  const PAYMENT_METHOD_OPTIONS: { id: PaymentEntry['method']; label: string; icon: any }[] = [
    { id: 'pix', label: 'Pix', icon: QrCode },
    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
    { id: 'cartao_debito', label: 'D√©bito', icon: Smartphone },
    { id: 'cartao_credito', label: 'Cr√©dito', icon: CreditCard },
    { id: 'transferencia', label: 'Transfer√™ncia', icon: ArrowDownWideNarrow },
    { id: 'boleto', label: 'Boleto', icon: FileText },
    { id: 'crediario', label: 'Credi√°rio', icon: Calculator },
  ];
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentEntry['method']>('pix');
  const [newPaymentMode, setNewPaymentMode] = useState<'valor' | 'percentual'>('valor');
  const [useCustomPaymentDate, setUseCustomPaymentDate] = useState(false);
  const [customPaymentDate, setCustomPaymentDate] = useState('');
  const [newPaymentInput, setNewPaymentInput] = useState<number | ''>('');
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<string>('');
  const [pixQrAmount, setPixQrAmount] = useState<number>(0);
  const paymentEntriesTotal = paymentEntries.reduce((sum, p) => sum + (p.value || 0), 0);

  const resetPaymentEntries = () => {
    setPaymentEntries([]);
    setIsAddPaymentOpen(false);
    setNewPaymentInput('');
    setNewPaymentMode('valor');
    setPendingPaymentMethod('');
  };

  const openAddPayment = () => {
    setNewPaymentMethod('pix');
    setNewPaymentMode('valor');
    setNewPaymentInput('');
    setIsAddPaymentOpen(true);
  };
  const [isVerifying, setIsVerifying] = useState(false);
  const [salesToday, setSalesToday] = useState<SaleOrder[]>([]);
  const [allSalesHistory, setAllSalesHistory] = useState<SaleOrder[]>([]);

  // Alerta sonoro de horario do pedido: 1h, 30min, 15min, 5min antes e na hora exata.
  // So verifica pedidos com entrega agendada, ainda nao finalizados/cancelados.
  useEffect(() => {
    if (!soundAlertsEnabled) return;
    // Pede permissao pra notificacao nativa do navegador (aparece mesmo com a aba minimizada
    // ou trocada, diferente do aviso amarelo de dentro do sistema que s√≥ aparece com a aba aberta)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const THRESHOLDS = [60, 30, 15, 5, 0];
    const checkAlerts = () => {
      const now = Date.now();
      allSalesHistory.forEach(sale => {
        if (!sale.scheduledFor || sale.status === 'completed' || sale.status === 'canceled' || sale.deletedAt) return;
        const minutesUntil = (new Date(sale.scheduledFor).getTime() - now) / 60000;
        // Primeira vez que vemos esse pedido nessa sessao (aba aberta agora, ou pedido novo) ‚Äî
        // se algum limite ja passou antes da gente ter chance de ver, marca como "ja alertado" SEM
        // tocar som (nao alerta retroativo de coisa que ja passou antes de abrir a tela)
        const primeiraVez = !initializedSalesRef.current.has(sale.id);
        if (primeiraVez) initializedSalesRef.current.add(sale.id);
        THRESHOLDS.forEach(threshold => {
          const key = `${sale.id}-${threshold}`;
          // Sem janela de tempo estreita ‚Äî so verifica se ja cruzou o limite e ainda nao alertou.
          // Assim nao depende do temporizador rodar EXATAMENTE no minuto certo (o navegador atrasa
          // temporizadores em aba em segundo plano, o que fazia a janela antiga de 1min ser perdida).
          if (minutesUntil <= threshold && !alertedThresholdsRef.current.has(key)) {
            alertedThresholdsRef.current.add(key);
            if (primeiraVez) return; // ja tinha passado antes da gente ver esse pedido ‚Äî nao alerta retroativo
            playAlertBeep();
            const label = threshold === 0 ? 'na hora marcada agora' : `em ${threshold} minuto${threshold > 1 ? 's' : ''}`;
            const msg = `‚è∞ Entrega de ${sale.customerName || 'cliente'} ${label}`;
            setAlertToast({ message: msg, saleId: sale.id });
            setTimeout(() => setAlertToast(prev => prev?.message === msg ? null : prev), 12000);
            // Notificacao nativa do navegador ‚Äî aparece mesmo com a aba minimizada, em segundo
            // plano ou trocada por outra (o navegador tem que estar aberto, so nao precisa estar
            // na tela). So dispara se a pessoa ja autorizou notificacoes.
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                const notif = new Notification('Rafa Arts ‚Äî Entrega Agendada', { body: msg, icon: '/icon-192.png', tag: key });
                notif.onclick = () => { window.focus(); notif.close(); };
              } catch {}
            }
          }
        });
      });
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 15000);
    return () => clearInterval(interval);
  }, [allSalesHistory, soundAlertsEnabled]);

  // ===== Or√ßamentos =====
  const [allOrcamentos, setAllOrcamentos] = useState<Orcamento[]>([]);
  const [isLoadingOrcamentos, setIsLoadingOrcamentos] = useState(false);
  const [orcamentoModalOpen, setOrcamentoModalOpen] = useState(false);
  const [editingOrcamento, setEditingOrcamento] = useState<Orcamento | null>(null);
  const emptyOrcamentoForm = {
    documentType: 'orcamento' as 'orcamento' | 'contrato',
    vendaId: undefined as string | undefined,
    clausulasContratoTexto: '',
    clienteId: undefined as string | undefined,
    customerName: '', cpfCnpj: '', phone: '', address: '', responsavel: '',
    items: [] as SaleOrderItem[], desconto: 0, observacoes: '',
    prazoProducao: 'Prazo de produ√ß√£o de at√© 5 dias √∫teis ap√≥s confirma√ß√£o do pagamento da entrada e aprova√ß√£o da arte. O prazo de produ√ß√£o n√£o √© prazo de pagamento.',
    prazoDias: 5, prazoTipo: 'uteis' as 'uteis' | 'corridos', prazoGatilho: 'pagamento_entrada' as 'aprovacao' | 'pagamento_entrada' | 'aprovacao_arte' | 'entrega_material' | 'personalizado', prazoDataPrevista: '',
    prazoPagamentoTexto: 'O saldo dever√° ser quitado no dia da conclus√£o e entrega do servi√ßo, conforme data comunicada pelo contratado atrav√©s de qualquer meio que comprove e comunique formalmente a finaliza√ß√£o do trabalho (fotos, mensagens de texto, chamadas de √°udio ou v√≠deo, redes sociais ou equivalente). O cliente receber√° confirma√ß√£o da data de entrega quando a comunica√ß√£o de conclus√£o for realizada. Eventual prazo posterior de pagamento somente ser√° v√°lido quando previamente autorizado por escrito. Conforme Art. 35 do CDC, o atraso no pagamento implicar√° em multa e juros conforme especificado nas cl√°usulas de multa e juros.',
    condicaoEntregaTexto: 'Entrega/retirada liberada somente ap√≥s a quita√ß√£o integral do valor, salvo autoriza√ß√£o expressa em contr√°rio. A data de entrega √© determinada pela comunica√ß√£o formal do contratado comprovando a conclus√£o do trabalho atrav√©s de qualquer meio que registre a finaliza√ß√£o (fotos, mensagens, chamadas de √°udio/v√≠deo, redes sociais ou outro meio que comprove). Em conformidade com o Art. 31 do CDC, a comunica√ß√£o deve ser clara e comprov√°vel.',
    formaPagamentoTexto: 'Entrada de 50% para iniciar a produ√ß√£o e saldo de 50% ser√° devido no dia da conclus√£o e entrega do servi√ßo. A data de entrega ser√° marcada quando o contratado comunicar, atrav√©s de qualquer meio comprov√°vel (fotos, mensagens de texto, chamadas de √°udio ou v√≠deo, redes sociais ou equivalente), que o servi√ßo foi finalizado. O cliente receber√° confirma√ß√£o no mesmo dia da comunica√ß√£o de conclus√£o.',
    multaJurosTexto: 'Em caso de atraso no pagamento, incidir√° multa de 2% sobre o valor em aberto, acrescida de juros de 1% ao m√™s (pro rata die), sem preju√≠zo de eventual corre√ß√£o monet√°ria.',
    garantiaTexto: 'Garantia de 90 dias para defeitos de fabrica√ß√£o/impress√£o, n√£o cobrindo desgaste natural, mau uso, exposi√ß√£o inadequada ou danos causados por terceiros. Consulte o C√≥digo de Defesa do Consumidor (CDC) para direitos aplic√°veis.',
    politicaCancelamentoTexto: 'Cancelamento antes do in√≠cio da produ√ß√£o: reembolso integral, descontadas eventuais despesas j√° realizadas. Ap√≥s o in√≠cio da produ√ß√£o ou para itens personalizados, n√£o h√° reembolso dos valores j√° investidos em material e m√£o de obra.',
    entradaPercentual: 50, entradaValor: 0, entradaModo: 'percentual' as 'percentual' | 'valor', validade: '',
    formasPagamento: [] as OrcamentoPagamento[],
    politicaPagamento: 'entrada_restante_entrega' as 'sem_entrada' | 'entrada_fixa' | 'entrada_percentual' | 'pagamento_integral' | 'entrada_restante_entrega' | 'entrada_parcelas',
    entradaObrigatoria: true,
    pagamentoPosteriorAutorizado: false, pagamentoPosteriorData: '', pagamentoPosteriorDias: 0,
    pagamentoPosteriorCondicao: '', pagamentoPosteriorResponsavel: '',
    multaPercentual: 2, jurosModo: 'mensal' as 'mensal' | 'diario', jurosPercentual: 1, diasTolerancia: 0,
    serviceStatus: 'pedido_recebido' as typeof STAGE_ORDER[number],
  };
  const [orcamentoForm, setOrcamentoForm] = useState({ ...emptyOrcamentoForm });
  const [savingOrcamento, setSavingOrcamento] = useState(false);
  const [orcamentoFromCart, setOrcamentoFromCart] = useState(false);
  const [contratoStatusFilter, setContratoStatusFilter] = useState('todos');
  const [contratoSortBy, setContratoSortBy] = useState<'recentes' | 'antigos' | 'az' | 'za'>('recentes');
  const [signingContrato, setSigningContrato] = useState<Contrato | null>(null);
  const [signContratoPassword, setSignContratoPassword] = useState('');
  const [signContratoError, setSignContratoError] = useState<string | null>(null);
  const [isSigningContrato, setIsSigningContrato] = useState(false);
  const [openContratoActionsId, setOpenContratoActionsId] = useState<string | null>(null);
  // Menu oculto de acoes por linha do Historico de Vendas (modo lista) -- mesmo padrao de
  // portal + posicionamento via getBoundingClientRect ja usado no menu de Contratos acima,
  // pra escapar do overflow-y-auto da lista e do motion.div que anima a troca de aba.
  const [openSaleRowActionsId, setOpenSaleRowActionsId] = useState<string | null>(null);
  const [saleRowActionsMenuPos, setSaleRowActionsMenuPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  // Largura das colunas do modo lista do Historico de Vendas -- ajustavel arrastando a borda
  // de cada cabecalho. Em vez de largura fixa em pixel (que obrigava rolar a tela pro lado pra
  // ver as colunas depois de um certo ponto), cada coluna guarda um "peso" relativo (como as
  // unidades fr do CSS Grid): a soma dos pesos sempre preenche exatamente 100% da largura
  // disponivel, entao a lista nunca estoura nem no celular nem no PC -- arrastar so redistribui
  // o espaco entre a coluna e a vizinha, nunca aumenta a largura total da linha.
  const SALE_LIST_RESIZABLE_ORDER = ['nome', 'itens', 'codigo', 'data', 'etapa', 'status', 'valor'] as const;
  const SALE_LIST_COL_WEIGHTS_DEFAULT: Record<string, number> = {
    nome: 3, itens: 4, codigo: 1.6, data: 1.8, etapa: 2, status: 1.6, valor: 2.6,
  };
  const [saleListColWeights, setSaleListColWeightsState] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('rpro_historico_lista_col_pesos');
      if (saved) return { ...SALE_LIST_COL_WEIGHTS_DEFAULT, ...JSON.parse(saved) };
    } catch { /* ignora e usa o padrao */ }
    return { ...SALE_LIST_COL_WEIGHTS_DEFAULT };
  });
  const setSaleListColWeights = (updater: (prev: Record<string, number>) => Record<string, number>) => {
    setSaleListColWeightsState(prev => {
      const next = updater(prev);
      localStorage.setItem('rpro_historico_lista_col_pesos', JSON.stringify(next));
      return next;
    });
  };
  const saleListHeaderRef = React.useRef<HTMLDivElement>(null);
  const resizingColRef = React.useRef<{ key: string; neighborKey: string; startX: number; startWeight: number; startNeighborWeight: number; pxPerWeight: number } | null>(null);
  const handleColResizeStart = (key: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const idx = SALE_LIST_RESIZABLE_ORDER.indexOf(key as any);
    const neighborKey = SALE_LIST_RESIZABLE_ORDER[idx + 1];
    if (!neighborKey) return; // ultima coluna redimensionavel nao tem vizinha a direita
    const containerWidth = saleListHeaderRef.current?.getBoundingClientRect().width || 800;
    const totalWeight = SALE_LIST_RESIZABLE_ORDER.reduce((acc, k) => acc + (saleListColWeights[k] || SALE_LIST_COL_WEIGHTS_DEFAULT[k]), 0);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    resizingColRef.current = {
      key, neighborKey, startX: clientX,
      startWeight: saleListColWeights[key] || SALE_LIST_COL_WEIGHTS_DEFAULT[key],
      startNeighborWeight: saleListColWeights[neighborKey] || SALE_LIST_COL_WEIGHTS_DEFAULT[neighborKey],
      pxPerWeight: containerWidth / totalWeight,
    };
    const onMove = (ev: MouseEvent | TouchEvent) => {
      const r = resizingColRef.current;
      if (!r) return;
      const x = 'touches' in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      const deltaWeight = (x - r.startX) / r.pxPerWeight;
      const MIN_WEIGHT = 0.7;
      // Arrastar so troca espaco entre a coluna e a vizinha imediata -- a soma dos dois pesos
      // fica sempre igual, entao a largura total da linha nunca muda.
      const novoPeso = Math.max(MIN_WEIGHT, Math.min(r.startWeight + r.startNeighborWeight - MIN_WEIGHT, r.startWeight + deltaWeight));
      const novoPesoVizinho = r.startWeight + r.startNeighborWeight - novoPeso;
      setSaleListColWeights(prev => ({ ...prev, [r.key]: novoPeso, [r.neighborKey]: novoPesoVizinho }));
    };
    const onUp = () => {
      resizingColRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  };
  // Posicao calculada via JS (nao CSS absolute) pro menu "..." do card de contrato --
  // absolute ficava sendo cortado pelo scroll da lista (overflow-y-auto do container pai),
  // fixed + coordenadas do getBoundingClientRect escapa desse corte.
  const [contratoActionsMenuPos, setContratoActionsMenuPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const [contratoSearchTerm, setContratoSearchTerm] = useState('');
  const [orcamentoStatusFilter, setOrcamentoStatusFilter] = useState('todos');
  const [orcamentoSearchTerm, setOrcamentoSearchTerm] = useState('');
  const [orcamentoSortBy, setOrcamentoSortBy] = useState<'recentes' | 'antigos' | 'az' | 'za'>('recentes');
  const [orcamentoItemsEditMode, setOrcamentoItemsEditMode] = useState(false);

  const handleReturnItemsToOrcamento = () => {
    setOrcamentoForm(prev => ({ ...prev, items: [...cart] }));
    setCart([]);
    setOrcamentoItemsEditMode(false);
    setActiveTab('orcamentos');
    setOrcamentoModalOpen(true);
  };
  const [contratoItemsEditMode, setContratoItemsEditMode] = useState(false);
  const handleReturnItemsToContrato = () => {
    setContratoForm(prev => ({ ...prev, items: [...cart] }));
    setCart([]);
    setContratoItemsEditMode(false);
    setActiveTab('contratos');
    setContratoModalOpen(true);
  };
  const [highlightOrcamentoId, setHighlightOrcamentoId] = useState<string | null>(null);

  const loadOrcamentos = async () => {
    setIsLoadingOrcamentos(true);
    try {
      const { data } = await supabase.from('orcamentos').select('*').is('deleted_at', null).order('created_at', { ascending: false });
      setAllOrcamentos((data || []).map(mapOrcamentoRow));
    } catch (err) {
      console.error('Erro ao carregar or√ßamentos:', err);
    } finally {
      setIsLoadingOrcamentos(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orcamentos') loadOrcamentos();
    if (activeTab === 'servicos') loadAllCustomers();
  }, [activeTab]);

  // ================= CONTRATOS (tabela propria, separada de orcamentos) =================
  const [allContratos, setAllContratos] = useState<Contrato[]>([]);
  const [isLoadingContratos, setIsLoadingContratos] = useState(false);
  const [contratoModalOpen, setContratoModalOpen] = useState(false);
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);
  const [savingContrato, setSavingContrato] = useState(false);
  const [viewingContrato, setViewingContrato] = useState<Contrato | null>(null);
  const [viewingAceiteDetalhes, setViewingAceiteDetalhes] = useState<Contrato | null>(null);
  const [viewingContratoHistorico, setViewingContratoHistorico] = useState<Contrato | null>(null);
  const [highlightContratoId, setHighlightContratoId] = useState<string | null>(null);
  const emptyContratoForm = {
    clienteId: undefined as string | undefined,
    customerName: '', cpfCnpj: '', phone: '', address: '', responsavel: '',
    items: [] as SaleOrderItem[], desconto: 0, observacoes: '',
    prazoTexto: 'Prazo de produ√ß√£o de at√© 5 dias √∫teis ap√≥s confirma√ß√£o do pagamento da entrada e aprova√ß√£o da arte. O prazo de produ√ß√£o n√£o √© prazo de pagamento.',
    prazoDias: 5, prazoTipo: 'uteis' as 'uteis' | 'corridos', prazoGatilho: 'pagamento_entrada' as 'aprovacao' | 'pagamento_entrada' | 'aprovacao_arte' | 'entrega_material' | 'personalizado', prazoDataPrevista: '',
    prazoPagamentoTexto: 'O saldo dever√° ser quitado no dia da conclus√£o e entrega do servi√ßo, conforme data comunicada pelo contratado atrav√©s de qualquer meio que comprove e comunique formalmente a finaliza√ß√£o do trabalho (fotos, mensagens de texto, chamadas de √°udio ou v√≠deo, redes sociais ou equivalente). O cliente receber√° confirma√ß√£o da data de entrega quando a comunica√ß√£o de conclus√£o for realizada. Eventual prazo posterior de pagamento somente ser√° v√°lido quando previamente autorizado por escrito. Conforme Art. 35 do CDC, o atraso no pagamento implicar√° em multa e juros conforme especificado nas cl√°usulas de multa e juros.',
    condicaoEntregaTexto: 'Entrega/retirada liberada somente ap√≥s a quita√ß√£o integral do valor, salvo autoriza√ß√£o expressa em contr√°rio. A data de entrega √© determinada pela comunica√ß√£o formal do contratado comprovando a conclus√£o do trabalho atrav√©s de qualquer meio que registre a finaliza√ß√£o (fotos, mensagens, chamadas de √°udio/v√≠deo, redes sociais ou outro meio que comprove). Em conformidade com o Art. 31 do CDC, a comunica√ß√£o deve ser clara e comprov√°vel.',
    formaPagamentoTexto: 'Entrada de 50% para iniciar a produ√ß√£o e saldo de 50% ser√° devido no dia da conclus√£o e entrega do servi√ßo. A data de entrega ser√° marcada quando o contratado comunicar, atrav√©s de qualquer meio comprov√°vel (fotos, mensagens de texto, chamadas de √°udio ou v√≠deo, redes sociais ou equivalente), que o servi√ßo foi finalizado. O cliente receber√° confirma√ß√£o no mesmo dia da comunica√ß√£o de conclus√£o.',
    multaJurosTexto: 'Em caso de atraso no pagamento, incidir√° multa de 2% sobre o valor em aberto, acrescida de juros de 1% ao m√™s (pro rata die), sem preju√≠zo de eventual corre√ß√£o monet√°ria.',
    garantiaTexto: 'Garantia de 90 dias para defeitos de fabrica√ß√£o/impress√£o, n√£o cobrindo desgaste natural, mau uso, exposi√ß√£o inadequada ou danos causados por terceiros.',
    politicaCancelamentoTexto: 'Cancelamento antes do in√≠cio da produ√ß√£o: reembolso integral, descontadas eventuais despesas j√° realizadas. Ap√≥s o in√≠cio da produ√ß√£o ou para itens personalizados, n√£o h√° reembolso dos valores j√° investidos em material e m√£o de obra.',
    entradaPercentual: 50, entradaValor: 0, entradaModo: 'percentual' as 'percentual' | 'valor',
    formasPagamento: [] as OrcamentoPagamento[],
    politicaPagamento: 'entrada_restante_entrega' as 'sem_entrada' | 'entrada_fixa' | 'entrada_percentual' | 'pagamento_integral' | 'entrada_restante_entrega' | 'entrada_parcelas',
    entradaObrigatoria: true,
    pagamentoPosteriorAutorizado: false, pagamentoPosteriorData: '', pagamentoPosteriorDias: 0,
    pagamentoPosteriorCondicao: '', pagamentoPosteriorResponsavel: '',
    multaPercentual: 2, jurosModo: 'mensal' as 'mensal' | 'diario', jurosPercentual: 1, diasTolerancia: 0,
    vendaId: undefined as string | undefined,
    orcamentoId: undefined as string | undefined,
    serviceStatus: 'pedido_recebido' as typeof STAGE_ORDER[number],
  };
  const [contratoForm, setContratoForm] = useState({ ...emptyContratoForm });

  const loadContratos = async () => {
    setIsLoadingContratos(true);
    try {
      const { data } = await supabase.from('contratos').select('*').is('deleted_at', null).order('created_at', { ascending: false });
      setAllContratos((data || []).map(mapContratoRow));
    } catch (err) {
      console.error('Erro ao carregar contratos:', err);
    } finally {
      setIsLoadingContratos(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'contratos') loadContratos();
  }, [activeTab]);

  // Novo Contrato sempre comeca pela busca de cliente (aba "Pesquisar Cliente" ativa por
  // padrao) -- so depois de escolher (ou cadastrar) o cliente e' que o formulario do contrato
  // abre com os dados ja preenchidos. proceedAfterCustomerStep() cuida de abrir o
  // contratoModalOpen na sequencia, inclusive se o usuario preferir seguir sem selecionar
  // cliente (Cliente Balcao).
  const openNewContrato = () => {
    setEditingContrato(null);
    setContratoForm({ ...emptyContratoForm });
    setCustomerModalIntent('contrato');
    setCustomerModalMode('search');
    setIsCustomerModalOpen(true);
  };

  // Gera um Contrato a partir de uma Nota ja existente no Historico ‚Äî vem com cliente/itens/valor
  // ja preenchidos, e ja fica vinculado aquela nota (venda_id). Se a nota tiver orcamento vinculado,
  // o contrato tambem fica vinculado ao mesmo orcamento.
  const handleCreateContratoFromNota = async (sale: SaleOrder) => {
    setEditingContrato(null);
    // Nota/venda em si nao tem campo de CPF/CNPJ -- o CPF so existe no cadastro do
    // CLIENTE vinculado a venda (sale.customerId). Antes essa funcao nao buscava esse
    // dado, entao o contrato saia sem CPF mesmo quando o cliente da nota tinha CPF cadastrado.
    // Busca direto no banco (em vez de depender de allCustomers, que s√≥ √© carregado
    // quando o modal de busca de cliente √© aberto e pode estar vazio nesse momento).
    let clienteVinculado: any = null;
    if (sale.customerId) {
      const { data } = await supabase.from('clientes').select('*').eq('id', sale.customerId).maybeSingle();
      clienteVinculado = data;
    }
    const enderecoParts = clienteVinculado
      ? [clienteVinculado.logradouro, clienteVinculado.numero, clienteVinculado.distrito, clienteVinculado.city].filter(Boolean)
      : [];
    setContratoForm({
      ...emptyContratoForm,
      vendaId: sale.id,
      orcamentoId: sale.orcamentoId,
      clienteId: sale.customerId,
      customerName: sale.customerName || clienteVinculado?.full_name || '',
      cpfCnpj: clienteVinculado?.cpf_cnpj || '',
      phone: sale.customerPhone || clienteVinculado?.phone || '',
      address: enderecoParts.join(', '),
      items: sale.items ? [...sale.items] : [],
      desconto: sale.discountValue || 0,
    });
    setContratoModalOpen(true);
  };

  // Gera um Contrato a partir de um Orcamento ‚Äî herda cliente/itens/valor/prazo/forma de
  // pagamento do orcamento, e fica vinculado tanto ao orcamento quanto a nota dele (se existir)
  const handleCreateContratoFromOrcamento = (o: Orcamento) => {
    setEditingContrato(null);
    setContratoForm({
      ...emptyContratoForm,
      orcamentoId: o.id,
      vendaId: o.vendaId,
      clienteId: o.clienteId,
      customerName: o.customerName || '',
      cpfCnpj: o.cpfCnpj || '',
      phone: o.phone || '',
      address: o.address || '',
      responsavel: o.responsavel || '',
      items: [...o.items],
      desconto: o.desconto || 0,
      observacoes: o.observacoes || '',
      formaPagamentoTexto: o.formaPagamentoTexto || emptyContratoForm.formaPagamentoTexto,
      prazoTexto: o.prazoProducao || emptyContratoForm.prazoTexto,
      prazoDias: o.prazoDias ?? emptyContratoForm.prazoDias,
      prazoTipo: o.prazoTipo ?? emptyContratoForm.prazoTipo,
      prazoGatilho: o.prazoGatilho ?? emptyContratoForm.prazoGatilho,
      prazoDataPrevista: o.prazoDataPrevista || '',
      prazoPagamentoTexto: o.prazoPagamentoTexto || emptyContratoForm.prazoPagamentoTexto,
      condicaoEntregaTexto: o.condicaoEntregaTexto || emptyContratoForm.condicaoEntregaTexto,
      formasPagamento: o.formasPagamento ? [...o.formasPagamento] : [],
      politicaPagamento: o.politicaPagamento ?? emptyContratoForm.politicaPagamento,
      entradaObrigatoria: o.entradaObrigatoria ?? true,
      entradaPercentual: o.entradaPercentual ?? 50,
      entradaValor: o.entradaValor ?? 0,
      entradaModo: 'percentual' as 'percentual' | 'valor',
      pagamentoPosteriorAutorizado: o.pagamentoPosteriorAutorizado ?? false,
      pagamentoPosteriorData: o.pagamentoPosteriorData || '',
      pagamentoPosteriorDias: o.pagamentoPosteriorDias ?? 0,
      pagamentoPosteriorCondicao: o.pagamentoPosteriorCondicao || '',
      pagamentoPosteriorResponsavel: o.pagamentoPosteriorResponsavel || '',
      multaPercentual: o.multaPercentual ?? 2,
      jurosModo: o.jurosModo ?? 'mensal',
      jurosPercentual: o.jurosPercentual ?? 1,
      diasTolerancia: o.diasTolerancia ?? 0,
      multaJurosTexto: o.multaJurosTexto || emptyContratoForm.multaJurosTexto,
      garantiaTexto: o.garantiaTexto || emptyContratoForm.garantiaTexto,
      politicaCancelamentoTexto: o.politicaCancelamentoTexto || emptyContratoForm.politicaCancelamentoTexto,
    });
    setContratoModalOpen(true);
  };

  const openEditContrato = (c: Contrato) => {
    setEditingContrato(c);
    setContratoForm({
      clienteId: c.clienteId,
      customerName: c.customerName,
      cpfCnpj: c.cpfCnpj || '',
      phone: c.phone || '',
      address: c.address || '',
      responsavel: c.responsavel || '',
      items: [...c.items],
      desconto: c.desconto || 0,
      observacoes: c.observacoes || '',
      formaPagamentoTexto: c.formaPagamentoTexto || emptyContratoForm.formaPagamentoTexto,
      prazoTexto: c.prazoTexto || emptyContratoForm.prazoTexto,
      prazoDias: c.prazoDias ?? emptyContratoForm.prazoDias,
      prazoTipo: c.prazoTipo ?? emptyContratoForm.prazoTipo,
      prazoGatilho: c.prazoGatilho ?? emptyContratoForm.prazoGatilho,
      prazoDataPrevista: c.prazoDataPrevista || '',
      prazoPagamentoTexto: c.prazoPagamentoTexto || emptyContratoForm.prazoPagamentoTexto,
      condicaoEntregaTexto: c.condicaoEntregaTexto || emptyContratoForm.condicaoEntregaTexto,
      formasPagamento: c.formasPagamento ? [...c.formasPagamento] : [],
      politicaPagamento: c.politicaPagamento ?? emptyContratoForm.politicaPagamento,
      entradaObrigatoria: c.entradaObrigatoria ?? true,
      entradaPercentual: c.entradaPercentual ?? 50,
      entradaValor: c.entradaValor ?? 0,
      entradaModo: 'percentual' as 'percentual' | 'valor',
      pagamentoPosteriorAutorizado: c.pagamentoPosteriorAutorizado ?? false,
      pagamentoPosteriorData: c.pagamentoPosteriorData || '',
      pagamentoPosteriorDias: c.pagamentoPosteriorDias ?? 0,
      pagamentoPosteriorCondicao: c.pagamentoPosteriorCondicao || '',
      pagamentoPosteriorResponsavel: c.pagamentoPosteriorResponsavel || '',
      multaPercentual: c.multaPercentual ?? 2,
      jurosModo: c.jurosModo ?? 'mensal',
      jurosPercentual: c.jurosPercentual ?? 1,
      diasTolerancia: c.diasTolerancia ?? 0,
      multaJurosTexto: c.multaJurosTexto || emptyContratoForm.multaJurosTexto,
      garantiaTexto: c.garantiaTexto || emptyContratoForm.garantiaTexto,
      politicaCancelamentoTexto: c.politicaCancelamentoTexto || emptyContratoForm.politicaCancelamentoTexto,
      vendaId: c.vendaId,
      orcamentoId: c.orcamentoId,
    });
    setContratoModalOpen(true);
  };

  const contratoItemsTotal = () => contratoForm.items.reduce((acc, item) => acc + (item.area ? item.price * item.area * item.quantity : item.price * item.quantity), 0);

  const handleSaveContrato = async () => {
    if (!contratoForm.customerName.trim()) { showAlert('Informe o nome do cliente.'); return; }
    if (contratoForm.items.length === 0) { showAlert('Adicione ao menos um item.'); return; }
    // So gera contrato se o cadastro tiver pelo menos telefone ou CPF/CNPJ -- sem isso nao da pra
    // mandar o link de assinatura pro cliente nem fazer a checagem de identidade na tela publica
    if (!contratoForm.phone.trim() && !contratoForm.cpfCnpj.trim()) {
      showAlert('Informe ao menos o telefone ou o CPF/CNPJ do cliente para gerar o contrato.');
      return;
    }
    // Se o CPF/CNPJ foi preenchido, valida o digito verificador aqui -- evita que um numero
    // digitado errado va parar no contrato e so de erro depois, na hora do cliente assinar
    if (contratoForm.cpfCnpj.trim()) {
      const { valid, tipo } = validateCpfCnpj(contratoForm.cpfCnpj);
      if (!valid) {
        showAlert(`${tipo === 'cnpj' ? 'CNPJ' : 'CPF'} inv√°lido. Confira os n√∫meros e tente novamente.`);
        return;
      }
    }
    setSavingContrato(true);
    try {
      const total = Math.max(0, contratoItemsTotal() - (contratoForm.desconto || 0));

      // Sem Nota vinculada ainda: cria a Nota agora (em aberto, sem pagamento) ‚Äî o faturamento
      // so conta de verdade quando ela for paga, gerar o contrato aqui nao fatura nada
      let vendaId = contratoForm.vendaId || null;
      if (!vendaId) {
        const { data: novaVenda, error: vendaError } = await supabase.from('vendas').insert({
          cliente_id: contratoForm.clienteId || null,
          customer_name: contratoForm.customerName,
          customer_phone: contratoForm.phone || null,
          items: contratoForm.items,
          total,
          discount_value: contratoForm.desconto || null,
          down_payment: 0,
          received_value: 0,
          status: 'pending',
          observacoes: contratoForm.observacoes || null,
          orcamento_id: contratoForm.orcamentoId || null,
        }).select().single();
        if (vendaError) throw vendaError;
        vendaId = novaVenda.id;
        // Guarda o vendaId no formulario JA -- se algo mais adiante nessa mesma funcao der erro
        // (ex: salvar o contrato em si), uma nova tentativa reaproveita essa nota em vez de criar
        // outra igual (que duplicava cliente/nota toda vez que dava erro e a pessoa tentava de novo)
        setContratoForm(prev => ({ ...prev, vendaId: novaVenda.id }));
        setAllSalesHistory(prev => [mapVendaRow(novaVenda), ...prev]);
      } else {
        const { error: syncError } = await supabase.from('vendas').update({
          items: contratoForm.items,
          total,
          discount_value: contratoForm.desconto || null,
        }).eq('id', vendaId);
        if (syncError) throw syncError;
        setAllSalesHistory(prev => prev.map(s => s.id === vendaId ? { ...s, items: [...contratoForm.items], total, discountValue: contratoForm.desconto || undefined } : s));
      }

      const textoContrato = buildTextoContrato({
        companyName: currentCompany?.name || 'RAFA ARTS GRAPHICS',
        customerName: contratoForm.customerName,
        cpfCnpj: contratoForm.cpfCnpj,
        phone: contratoForm.phone,
        address: contratoForm.address,
        items: contratoForm.items,
        total,
        desconto: contratoForm.desconto || 0,
        formaPagamentoTexto: contratoForm.formaPagamentoTexto,
        prazoTexto: contratoForm.prazoTexto,
        observacoes: contratoForm.observacoes,
        numero: editingContrato?.numero || `CTR-${Date.now().toString(36).toUpperCase()}`,
        multaPercentual: contratoForm.multaPercentual,
        jurosPercentual: contratoForm.jurosPercentual,
      });

      const payload = {
        cliente_id: contratoForm.clienteId || null,
        customer_name: contratoForm.customerName,
        cpf_cnpj: contratoForm.cpfCnpj || null,
        phone: contratoForm.phone || null,
        address: contratoForm.address || null,
        responsavel: contratoForm.responsavel || null,
        venda_id: vendaId,
        orcamento_id: contratoForm.orcamentoId || null,
        items: contratoForm.items,
        desconto: contratoForm.desconto || 0,
        total,
        forma_pagamento_texto: contratoForm.formaPagamentoTexto || null,
        prazo_texto: contratoForm.prazoTexto || null,
        prazo_dias: contratoForm.prazoDias || null,
        prazo_tipo: contratoForm.prazoTipo || null,
        prazo_gatilho: contratoForm.prazoGatilho || null,
        prazo_data_prevista: contratoForm.prazoDataPrevista || null,
        prazo_pagamento_texto: contratoForm.prazoPagamentoTexto || null,
        condicao_entrega_texto: contratoForm.condicaoEntregaTexto || null,
        formas_pagamento: contratoForm.formasPagamento?.length ? contratoForm.formasPagamento : null,
        politica_pagamento: contratoForm.politicaPagamento || null,
        entrada_obrigatoria: contratoForm.entradaObrigatoria ?? true,
        entrada_percentual: contratoForm.entradaPercentual ?? null,
        entrada_valor: contratoForm.entradaValor ?? null,
        pagamento_posterior_autorizado: contratoForm.pagamentoPosteriorAutorizado ?? false,
        pagamento_posterior_data: contratoForm.pagamentoPosteriorData || null,
        pagamento_posterior_dias: contratoForm.pagamentoPosteriorDias || null,
        pagamento_posterior_condicao: contratoForm.pagamentoPosteriorCondicao || null,
        pagamento_posterior_responsavel: contratoForm.pagamentoPosteriorResponsavel || null,
        multa_percentual: contratoForm.multaPercentual === '' || contratoForm.multaPercentual == null ? 2 : contratoForm.multaPercentual,
        juros_modo: contratoForm.jurosModo || 'mensal',
        juros_percentual: contratoForm.jurosPercentual === '' || contratoForm.jurosPercentual == null ? 1 : contratoForm.jurosPercentual,
        dias_tolerancia: contratoForm.diasTolerancia ?? 0,
        multa_juros_texto: contratoForm.multaJurosTexto || null,
        garantia_texto: contratoForm.garantiaTexto || null,
        politica_cancelamento_texto: contratoForm.politicaCancelamentoTexto || null,
        observacoes: contratoForm.observacoes || null,
        texto_contrato: textoContrato,
        service_status: contratoForm.serviceStatus || 'pedido_recebido',
        updated_at: new Date().toISOString(),
      };

      let newId: string | null = null;
      // Contrato que ja saiu do rascunho (ja foi aceito/executado/etc): editar cria uma VERSAO
      // NOVA em vez de sobrescrever a atual, mantendo o historico da versao anterior intacto
      const precisaNovaVersao = editingContrato && editingContrato.status !== 'rascunho';
      if (editingContrato && !precisaNovaVersao) {
        const { error } = await supabase.from('contratos').update(payload).eq('id', editingContrato.id);
        if (error) throw error;
        newId = editingContrato.id;
      } else if (precisaNovaVersao && editingContrato) {
        const { data: inserted, error } = await supabase.from('contratos').insert({
          ...payload,
          numero: editingContrato.numero,
          versao: editingContrato.versao + 1,
          contrato_anterior_id: editingContrato.id,
          status: 'aguardando_aceite',
        }).select().single();
        if (error) throw error;
        newId = inserted?.id || null;
        // A venda/orcamento passam a apontar pra versao nova (mais recente)
      } else {
        const numero = `CTR-${Date.now().toString(36).toUpperCase()}`;
        const { data: inserted, error } = await supabase.from('contratos').insert({ ...payload, numero, status: 'aguardando_assinatura_cliente' }).select().single();
        if (error) throw error;
        newId = inserted?.id || null;
      }

      // Vincula a nota de volta pro contrato, e o orcamento (se tiver) tambem
      if (newId && vendaId) {
        await supabase.from('vendas').update({ contrato_id: newId }).eq('id', vendaId);
        setAllSalesHistory(prev => prev.map(s => s.id === vendaId ? { ...s, contratoId: newId! } as SaleOrder : s));
      }
      if (newId && contratoForm.orcamentoId) {
        await supabase.from('orcamentos').update({ contrato_id: newId }).eq('id', contratoForm.orcamentoId);
        setAllOrcamentos(prev => prev.map(o => o.id === contratoForm.orcamentoId ? { ...o, contratoId: newId! } : o));
      }

      // Propaga a Etapa escolhida aqui pro Pedido e Or√ßamento vinculados a este Contrato
      if (newId) {
        await syncServiceStatus('contrato', newId, contratoForm.serviceStatus || 'pedido_recebido');
      }

      setContratoModalOpen(false);
      await loadContratos();
      if (newId && (!editingContrato || precisaNovaVersao)) {
        setActiveTab('contratos');
        setHighlightContratoId(newId);
        setTimeout(() => setHighlightContratoId(null), 4000);
      }
    } catch (err: any) {
      console.error('Erro ao salvar contrato:', err);
      showAlert(`N√£o foi poss√≠vel salvar o contrato: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setSavingContrato(false);
    }
  };

  const handleUpdateContratoStatus = async (c: Contrato, status: ContratoStatus) => {
    if (!(await showConfirm(`Mudar o status do contrato ${c.numero} para "${CONTRATO_STATUS_LABELS[status]}"?`))) return;
    const { error } = await supabase.from('contratos').update({ status, updated_at: new Date().toISOString() }).eq('id', c.id);
    if (error) { showAlert(`N√£o foi poss√≠vel atualizar o status: ${error.message}`); return; }
    setAllContratos(prev => prev.map(ct => ct.id === c.id ? { ...ct, status } : ct));
  };

  // Confirma a assinatura da CONTRATADA (empresa): o operador logado confirma a PROPRIA senha de
  // login. Pode ser feita antes ou depois do cliente assinar -- as duas partes assinam em
  // qualquer ordem. So quando o cliente ja tiver assinado o contrato fecha de vez ('assinado') e
  // o PDF final (com os dois carimbos) e' gerado; se o cliente ainda nao assinou, so grava a
  // assinatura da empresa e o fechamento acontece depois, quando ele assinar pelo link. Ver
  // signContractByCompany em otpUtils.ts.
  const handleConfirmCompanySignature = async () => {
    if (!signingContrato || !user) return;
    if (!signContratoPassword.trim()) {
      setSignContratoError('Digite sua senha de login.');
      return;
    }
    if (!user.password || signContratoPassword !== user.password) {
      setSignContratoError('Senha incorreta.');
      return;
    }
    setIsSigningContrato(true);
    setSignContratoError(null);
    try {
      const result = await signContractByCompany({
        contractId: signingContrato.id,
        numero: signingContrato.numero,
        customerName: signingContrato.customerName,
        documentText: signingContrato.textoContrato || '',
        clientSignedAt: signingContrato.signedAt || undefined,
        clientIp: signingContrato.signerIp || undefined,
        clientLocation: signingContrato.signerLocation || undefined,
        clientUserAgent: signingContrato.signerUserAgent || undefined,
        documentHash: signingContrato.documentHash || undefined,
        clientCpfCnpj: signingContrato.cpfCnpj,
        clientPhone: signingContrato.phone,
        clientSignatureId: signingContrato.contratanteSignatureId,
        companySignerName: user.name,
        companyUserAgent: navigator.userAgent,
      });
      await loadContratos();
      setSigningContrato(null);
      setSignContratoPassword('');
      showAlert(
        result.contratoFechado
          ? `Contrato ${signingContrato.numero} assinado com sucesso! Voc√™ j√° pode avisar o cliente pelo mesmo link ‚Äî ele agora mostra o contrato assinado.`
          : `Assinatura da empresa confirmada no contrato ${signingContrato.numero}. Falta s√≥ o cliente assinar pelo link ‚Äî assim que ele assinar, o contrato fecha automaticamente.`
      );
    } catch (err: any) {
      console.error('Erro ao confirmar assinatura da empresa:', err);
      setSignContratoError(`N√£o foi poss√≠vel confirmar a assinatura: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setIsSigningContrato(false);
    }
  };

  const handleDeleteContrato = async (c: Contrato) => {
    const vinculos: string[] = [];
    if (c.vendaId) vinculos.push('um Recibo/Nota');
    if (c.orcamentoId) vinculos.push('um Or√ßamento');
    const avisoVinculo = vinculos.length
      ? `\n\n‚ö†Ô∏è Este contrato est√° ligado a ${vinculos.join(' e ')}. Eles N√ÉO ser√£o exclu√≠dos ‚Äî continuam intactos.`
      : '';
    if (!(await showConfirm(`Excluir o contrato ${c.numero}?${avisoVinculo}\n\nEle fica 30 dias na aba Exclu√≠dos antes de sumir de vez ‚Äî voc√™ pode restaurar dentro desse prazo.`))) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from('contratos').update({ deleted_at: now }).eq('id', c.id);
    if (error) { showAlert(`N√£o foi poss√≠vel excluir o contrato: ${error.message}`); return; }
    setAllContratos(prev => prev.filter(ct => ct.id !== c.id));
    // Solta o vinculo na Nota (a Nota continua intacta, so para de apontar pra um contrato
    // que nao existe mais) -- sem isso a etiqueta "Contrato" ficava no card pra sempre.
    // IMPORTANTE: NAO marca a venda como excluida aqui -- a mensagem de confirmacao acima
    // promete pro usuario que a Nota/Recibo "continua intacta", entao so soltamos o vinculo,
    // sem apagar a venda em si (que ficaria escondida do Historico sem o usuario esperar isso)
    if (c.vendaId) {
      await supabase.from('vendas').update({ contrato_id: null }).eq('id', c.vendaId);
      setAllSalesHistory(prev => prev.map(s => s.id === c.vendaId ? { ...s, contratoId: undefined } as SaleOrder : s));
    }
  };

  // Monta o AuditStamp (dados do carimbo digital) a partir de um contrato ja assinado.
  // Extraido pra ser reaproveitado tanto no download avulso (fallback) quanto na regeneracao
  // em massa dos PDFs ja salvos no Storage (ver handleRegenerateAllSignedContratoPdfs).
  const buildAuditStampFromContrato = (c: Contrato): AuditStamp | undefined => {
    if (!(c.signedAt && c.signerIp && c.documentHash)) return undefined;
    return {
      signedAt: c.signedAt,
      signerIp: c.signerIp,
      documentHash: c.documentHash,
      signatureLink: getContractSignatureLink(c.id),
      signatureMethodLabel: 'Token OTP',
      clienteCpfCnpj: c.cpfCnpj,
      clientePhone: c.phone,
      // Contratos assinados antes desta migration podem nao ter o ID individual salvo --
      // gera um na hora so pra exibicao (nao persiste, ja que aqui e' so fallback de download).
      contratanteSignatureId: c.contratanteSignatureId || generateSignatureId(),
      empresaRazaoSocial: OFFICIAL_COMPANY.razaoSocial,
      empresaNomeFantasia: OFFICIAL_COMPANY.nomeFantasia,
      empresaCnpj: OFFICIAL_COMPANY.cnpj,
      empresaValidatedAt: c.empresaSignedAt || c.signedAt,
      empresaOrigin: PUBLIC_SIGN_ORIGIN,
      contratadoSignatureId: c.contratadoSignatureId || generateSignatureId(),
    };
  };

  // Regera e SOBRESCREVE (upsert) o PDF ja salvo no Storage de TODOS os contratos ja assinados
  // (ambas as partes), aplicando o layout/carimbo ATUAL -- usado uma unica vez apos uma mudanca
  // visual no carimbo (ex: tamanho do QR Code / largura), pra que contratos antigos tambem
  // passem a exibir o layout novo no download, em vez de continuarem com o PDF congelado no
  // momento da assinatura original. O hash SHA-256 do TEXTO nao muda -- so a aparencia do carimbo.
  const [isRegeneratingContratoPdfs, setIsRegeneratingContratoPdfs] = useState(false);
  const [regenerateContratoProgress, setRegenerateContratoProgress] = useState<{ done: number; total: number } | null>(null);
  const handleRegenerateAllSignedContratoPdfs = async () => {
    const alvos = allContratos.filter(c => c.signedAt && c.empresaSignedAt);
    if (alvos.length === 0) { showAlert('Nenhum contrato assinado (pelas duas partes) encontrado.'); return; }
    if (!(await showConfirm(`Regenerar o PDF de ${alvos.length} contrato(s) j√° assinado(s) com o carimbo atualizado? O arquivo salvo de cada um ser√° substitu√≠do.`))) return;

    setIsRegeneratingContratoPdfs(true);
    setRegenerateContratoProgress({ done: 0, total: alvos.length });
    let falhas = 0;
    for (let i = 0; i < alvos.length; i++) {
      const c = alvos[i];
      try {
        const auditStamp = buildAuditStampFromContrato(c);
        if (!auditStamp) { falhas++; continue; }
        const novaUrl = await uploadContratoPdfAssinado(c.id, c.numero, c.customerName, c.textoContrato || '', auditStamp);
        if (novaUrl) {
          await supabase.from('contratos').update({ pdf_url: novaUrl }).eq('id', c.id);
          setAllContratos(prev => prev.map(ct => ct.id === c.id ? { ...ct, pdfUrl: novaUrl } : ct));
        } else {
          falhas++;
        }
      } catch (err) {
        console.error(`Erro ao regenerar PDF do contrato ${c.numero}:`, err);
        falhas++;
      }
      setRegenerateContratoProgress({ done: i + 1, total: alvos.length });
    }
    setIsRegeneratingContratoPdfs(false);
    setRegenerateContratoProgress(null);
    showAlert(
      falhas === 0
        ? `${alvos.length} PDF(s) regenerado(s) com sucesso.`
        : `Regenera√ß√£o conclu√≠da: ${alvos.length - falhas} com sucesso, ${falhas} falharam (veja o console).`
    );
  };

  const handleDownloadContratoPdf = async (c: Contrato) => {
    // Contrato ja assinado com PDF salvo no Storage: baixa sempre o MESMO arquivo gerado no
    // momento da assinatura, em vez de recriar na hora com o codigo/layout atuais (ver
    // supabase/add_pdf_url_contratos.sql e signContract em otpUtils.ts).
    if (c.pdfUrl) {
      window.open(c.pdfUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    // Fallback: contrato ainda nao assinado (rascunho, so preview mesmo) ou assinado antes
    // dessa migration (sem pdf_url salvo) -- gera na hora como antes, com o carimbo completo
    // (cliente + empresa) igual ao que teria sido salvo no Storage no momento da assinatura.
    const auditStamp = buildAuditStampFromContrato(c);
    await downloadContratoPdf(`${c.numero}${c.versao > 1 ? ` (v${c.versao})` : ''}`, c.customerName, c.textoContrato || 'Contrato sem texto gerado.', auditStamp);
  };

  const handleDuplicateContrato = (c: Contrato) => {
    setEditingContrato(null);
    setContratoForm({
      ...emptyContratoForm,
      clienteId: c.clienteId,
      customerName: c.customerName,
      cpfCnpj: c.cpfCnpj || '',
      phone: c.phone || '',
      address: c.address || '',
      items: c.items.map(i => ({ ...i })),
      desconto: c.desconto,
      observacoes: c.observacoes || '',
      formaPagamentoTexto: c.formaPagamentoTexto || '',
      prazoTexto: c.prazoTexto || '',
      // duplicar NAO herda venda/orcamento vinculados ‚Äî vira um contrato novo e independente
    });
    setContratoModalOpen(true);
  };

  // Mesmo padrao do Novo Contrato: comeca pela busca de cliente (aba "Pesquisar Cliente"
  // ativa por padrao), e so abre o formulario do orcamento depois (via proceedAfterCustomerStep).
  const openNewOrcamento = () => {
    setEditingOrcamento(null);
    setOrcamentoFromCart(false);
    setOrcamentoForm({ ...emptyOrcamentoForm });
    setCustomerModalIntent('orcamento');
    setCustomerModalMode('search');
    setIsCustomerModalOpen(true);
  };

  const handleCreateOrcamentoFromCart = (overrideItems?: SaleOrderItem[], overrideCustomer?: { id?: string; name?: string; phone?: string }) => {
    const items = overrideItems || cart;
    if (items.length === 0) { showAlert('Adicione ao menos um item antes de criar o or√ßamento.'); return; }
    setEditingOrcamento(null);
    setOrcamentoFromCart(true);
    setOrcamentoForm({
      ...emptyOrcamentoForm,
      clienteId: overrideCustomer?.id ?? selectedCustomer?.id,
      customerName: overrideCustomer?.name ?? selectedCustomer?.name ?? '',
      phone: overrideCustomer?.phone ?? selectedCustomer?.phone ?? '',
      items: [...items],
      desconto: saleDiscountValue || 0,
    });
    setOrcamentoModalOpen(true);
  };

  // Gera um Orcamento ou Contrato a partir de uma nota ja existente no Historico ‚Äî vem com
  // cliente, itens e valor ja preenchidos, e ja fica vinculado aquela nota (venda_id).
  const handleCreateDocumentFromNota = (sale: SaleOrder, documentType: 'orcamento' | 'contrato') => {
    setEditingOrcamento(null);
    setOrcamentoFromCart(false);
    setOrcamentoForm({
      ...emptyOrcamentoForm,
      documentType,
      vendaId: sale.id,
      clienteId: sale.customerId,
      customerName: sale.customerName || '',
      phone: sale.customerPhone || '',
      items: sale.items ? [...sale.items] : [],
      desconto: sale.discountValue || 0,
      clausulasContratoTexto: documentType === 'contrato' ? buildContratoClausulasTexto({
        companyName: currentCompany?.name || OFFICIAL_COMPANY.razaoSocial,
        companyNomeFantasia: OFFICIAL_COMPANY.nomeFantasia,
        companyCnpj: currentCompany?.cnpj || OFFICIAL_COMPANY.cnpj,
        companyAddress: currentCompany?.address
          ? [
              currentCompany.address.line,
              currentCompany.address.number,
              currentCompany.address.neighborhood,
              currentCompany.address.city && currentCompany.address.state
                ? `${currentCompany.address.city} - ${currentCompany.address.state}`
                : currentCompany.address.city || currentCompany.address.state,
              currentCompany.address.zipCode ? `CEP ${currentCompany.address.zipCode}` : undefined,
            ].filter(Boolean).join(', ')
          : undefined,
        customerName: sale.customerName,
      }) : '',
    });
    setOrcamentoModalOpen(true);
  };

  const openEditOrcamento = (o: Orcamento) => {
    setEditingOrcamento(o);
    setOrcamentoForm({
      documentType: o.documentType || 'orcamento',
      vendaId: o.vendaId,
      clausulasContratoTexto: o.clausulasContratoTexto || '',
      clienteId: o.clienteId,
      customerName: o.customerName || '', cpfCnpj: o.cpfCnpj || '', phone: o.phone || '',
      address: o.address || '', responsavel: o.responsavel || '', items: [...o.items],
      desconto: o.desconto, observacoes: o.observacoes || '', prazoProducao: o.prazoProducao || '',
      prazoDias: o.prazoDias || 5, prazoTipo: o.prazoTipo || 'uteis', prazoGatilho: o.prazoGatilho || 'pagamento_entrada', prazoDataPrevista: o.prazoDataPrevista || '',
      prazoPagamentoTexto: o.prazoPagamentoTexto || '', condicaoEntregaTexto: o.condicaoEntregaTexto || '',
      formaPagamentoTexto: o.formaPagamentoTexto || '', multaJurosTexto: o.multaJurosTexto || '',
      garantiaTexto: o.garantiaTexto || '', politicaCancelamentoTexto: o.politicaCancelamentoTexto || '',
      entradaPercentual: o.entradaPercentual || 0, entradaValor: o.entradaValor || 0,
      entradaModo: (o.entradaValor && o.entradaValor > 0 && !o.entradaPercentual) ? 'valor' : 'percentual',
      formasPagamento: o.formasPagamento ? [...o.formasPagamento] : [],
      politicaPagamento: o.politicaPagamento || 'entrada_restante_entrega',
      entradaObrigatoria: o.entradaObrigatoria !== undefined ? o.entradaObrigatoria : true,
      pagamentoPosteriorAutorizado: !!o.pagamentoPosteriorAutorizado,
      pagamentoPosteriorData: o.pagamentoPosteriorData || '',
      pagamentoPosteriorDias: o.pagamentoPosteriorDias || 0,
      pagamentoPosteriorCondicao: o.pagamentoPosteriorCondicao || '',
      pagamentoPosteriorResponsavel: o.pagamentoPosteriorResponsavel || '',
      multaPercentual: o.multaPercentual !== undefined ? o.multaPercentual : 2,
      jurosModo: o.jurosModo || 'mensal', jurosPercentual: o.jurosPercentual !== undefined ? o.jurosPercentual : 1,
      diasTolerancia: o.diasTolerancia || 0,
      validade: o.validade || '',
    });
    setOrcamentoModalOpen(true);
  };

  const orcamentoItemsTotal = () => orcamentoForm.items.reduce((sum, i) => sum + (i.area ? i.price * i.area * i.quantity : i.price * i.quantity), 0);

  const PRAZO_GATILHO_LABELS: Record<string, string> = {
    aprovacao: 'ap√≥s a aprova√ß√£o deste or√ßamento',
    pagamento_entrada: 'ap√≥s a confirma√ß√£o do pagamento da entrada',
    aprovacao_arte: 'ap√≥s a aprova√ß√£o da arte pelo cliente',
    entrega_material: 'ap√≥s a entrega dos materiais pelo cliente',
  };

  const buildPrazoTexto = (dias: number, tipo: 'uteis' | 'corridos', gatilho: string) => {
    const tipoLabel = tipo === 'uteis' ? 'dias √∫teis' : 'dias corridos';
    const gatilhoLabel = PRAZO_GATILHO_LABELS[gatilho] || '';
    return `Prazo de produ√ß√£o de at√© ${dias} ${tipoLabel} ${gatilhoLabel}. O prazo de produ√ß√£o N√ÉO √© o prazo de pagamento ‚Äî s√£o condi√ß√µes independentes.`;
  };

  const updatePrazoStructured = (patch: Partial<typeof orcamentoForm>) => {
    setOrcamentoForm(prev => {
      const next = { ...prev, ...patch };
      if (next.prazoGatilho !== 'personalizado') {
        next.prazoProducao = buildPrazoTexto(next.prazoDias, next.prazoTipo, next.prazoGatilho);
      }
      return next;
    });
  };

  const ORCAMENTO_PAGAMENTO_LABELS: Record<string, string> = {
    pix: 'Pix', dinheiro: 'Dinheiro', cartao_debito: 'Cart√£o de D√©bito', cartao_credito: 'Cart√£o de Cr√©dito',
    cartao_parcelado: 'Cart√£o Parcelado', transferencia: 'Transfer√™ncia', boleto: 'Boleto', outra: 'Outra',
  };

  const POLITICA_PAGAMENTO_LABELS: Record<string, string> = {
    sem_entrada: 'Sem Entrada',
    entrada_fixa: 'Entrada Fixa (R$)',
    entrada_percentual: 'Entrada Percentual (%)',
    pagamento_integral: 'Pagamento Integral Antecipado',
    entrada_restante_entrega: 'Entrada + Restante na Entrega',
    entrada_parcelas: 'Entrada + Parcelas',
  };

  const buildPoliticaPagamentoTexto = (politica: string, entradaTexto: string, obrigatoria: boolean) => {
    const obrigaTxt = obrigatoria ? ' O pagamento da entrada √© condi√ß√£o obrigat√≥ria para o in√≠cio da produ√ß√£o ‚Äî a produ√ß√£o s√≥ come√ßa ap√≥s a confirma√ß√£o desse pagamento.' : '';
    const quandoEntrada = ` A entrada deve ser paga no ato da aprova√ß√£o deste or√ßamento.`;
    switch (politica) {
      case 'sem_entrada':
        return `N√£o √© exigida entrada. A produ√ß√£o tem in√≠cio ap√≥s a aprova√ß√£o deste or√ßamento. O valor total dever√° ser pago conforme condi√ß√£o definida no Prazo de Pagamento.`;
      case 'pagamento_integral':
        return `Pagamento integral antecipado, no valor de R$ ${(Math.max(0, orcamentoItemsTotal() - (orcamentoForm.desconto || 0))).toFixed(2).replace('.', ',')}, devido no ato da aprova√ß√£o deste or√ßamento e antes do in√≠cio da produ√ß√£o.`;
      case 'entrada_fixa':
      case 'entrada_percentual':
        return `Entrada de ${entradaTexto} para iniciar a produ√ß√£o.${quandoEntrada}${obrigaTxt}`;
      case 'entrada_restante_entrega':
        return `Entrada de ${entradaTexto} para iniciar a produ√ß√£o.${quandoEntrada}${obrigaTxt} O saldo restante (R$ ${orcamentoSaldoRestante().toFixed(2).replace('.', ',')}) dever√° ser quitado no momento da conclus√£o do servi√ßo e antes da entrega ou retirada do material.`;
      case 'entrada_parcelas':
        return `Entrada de ${entradaTexto} para iniciar a produ√ß√£o.${quandoEntrada}${obrigaTxt} O saldo restante (R$ ${orcamentoSaldoRestante().toFixed(2).replace('.', ',')}) ser√° pago em parcelas, conforme detalhado nas formas de pagamento abaixo, e o material s√≥ ser√° liberado ap√≥s a quita√ß√£o integral, salvo autoriza√ß√£o em contr√°rio.`;
      default:
        return '';
    }
  };

  const orcamentoEntradaValorCalc = () => {
    const totalItens = Math.max(0, orcamentoItemsTotal() - (orcamentoForm.desconto || 0));
    return orcamentoForm.entradaModo === 'percentual'
      ? (totalItens * (orcamentoForm.entradaPercentual || 0)) / 100
      : (orcamentoForm.entradaValor || 0);
  };

  const orcamentoFormasPagamentoTotal = () => orcamentoForm.formasPagamento.reduce((sum, f) => sum + (f.valor || 0), 0);

  const orcamentoSaldoRestante = () => {
    const totalItens = Math.max(0, orcamentoItemsTotal() - (orcamentoForm.desconto || 0));
    return Math.max(0, totalItens - orcamentoEntradaValorCalc() - orcamentoFormasPagamentoTotal());
  };

  const addOrcamentoFormaPagamento = () => {
    setOrcamentoForm(prev => ({
      ...prev,
      formasPagamento: [...prev.formasPagamento, { metodo: 'pix', valor: 0 } as OrcamentoPagamento],
    }));
  };

  const updateOrcamentoFormaPagamento = (idx: number, patch: Partial<OrcamentoPagamento>) => {
    setOrcamentoForm(prev => ({
      ...prev,
      formasPagamento: prev.formasPagamento.map((f, i) => i === idx ? { ...f, ...patch } : f),
    }));
  };

  const removeOrcamentoFormaPagamento = (idx: number) => {
    setOrcamentoForm(prev => ({ ...prev, formasPagamento: prev.formasPagamento.filter((_, i) => i !== idx) }));
  };

  const updatePoliticaPagamento = (patch: { politicaPagamento?: any; entradaObrigatoria?: boolean; entradaModo?: 'percentual' | 'valor'; entradaPercentual?: number | ''; entradaValor?: number | '' }) => {
    setOrcamentoForm(prev => {
      const next = { ...prev, ...patch };
      const entradaTexto = next.entradaModo === 'percentual' ? `${next.entradaPercentual || 0}%` : `R$ ${(next.entradaValor || 0).toFixed(2).replace('.', ',')}`;
      next.formaPagamentoTexto = buildPoliticaPagamentoTexto(next.politicaPagamento, entradaTexto, next.entradaObrigatoria);
      return next;
    });
  };

  const buildMultaJurosTexto = (multaPct: number, jurosModo: string, jurosPct: number, tolerancia: number) => {
    const toleranciaTxt = tolerancia > 0 ? ` ap√≥s ${tolerancia} dia(s) de toler√¢ncia` : '';
    const jurosTxt = jurosModo === 'diario' ? `${jurosPct}% ao dia` : `${jurosPct}% ao m√™s (pro rata die)`;
    return `Em caso de atraso no pagamento${toleranciaTxt}, incidir√° multa de ${multaPct}% sobre o valor em aberto, acrescida de juros de ${jurosTxt}, calculados automaticamente sobre o saldo devedor at√© a data da efetiva quita√ß√£o, sem preju√≠zo de eventual corre√ß√£o monet√°ria.`;
  };

  const updateMultaJuros = (patch: { multaPercentual?: number | ''; jurosModo?: 'mensal' | 'diario'; jurosPercentual?: number | ''; diasTolerancia?: number | '' }) => {
    setOrcamentoForm(prev => {
      const next = { ...prev, ...patch };
      next.multaJurosTexto = buildMultaJurosTexto(Number(next.multaPercentual) || 0, next.jurosModo, Number(next.jurosPercentual) || 0, Number(next.diasTolerancia) || 0);
      return next;
    });
  };

  // Calculadora de atraso: dado um saldo e dias em atraso, calcula multa + juros e o valor atualizado
  const calcularAtraso = (saldo: number, diasAtraso: number) => {
    const dias = orcamentoForm.diasTolerancia || 0;
    const diasEfetivos = Math.max(0, diasAtraso - dias);
    if (diasEfetivos <= 0) return { multa: 0, juros: 0, total: saldo, diasEfetivos: 0 };
    const multa = saldo * ((orcamentoForm.multaPercentual || 0) / 100);
    const taxaDiaria = orcamentoForm.jurosModo === 'diario'
      ? (orcamentoForm.jurosPercentual || 0) / 100
      : (orcamentoForm.jurosPercentual || 0) / 100 / 30;
    const juros = saldo * taxaDiaria * diasEfetivos;
    return { multa, juros, total: saldo + multa + juros, diasEfetivos };
  };

  const [simuladorDias, setSimuladorDias] = useState(10);

  // ---- Helpers de CONTRATO (paralelos aos de Or√ßamento) ----
  const contratoEntradaValorCalc = () => {
    const totalItens = Math.max(0, contratoItemsTotal() - (contratoForm.desconto || 0));
    return contratoForm.entradaModo === 'percentual'
      ? (totalItens * (contratoForm.entradaPercentual || 0)) / 100
      : (contratoForm.entradaValor || 0);
  };

  const contratoFormasPagamentoTotal = () => (contratoForm.formasPagamento || []).reduce((sum, f) => sum + (f.valor || 0), 0);

  const contratoSaldoRestante = () => {
    const totalItens = Math.max(0, contratoItemsTotal() - (contratoForm.desconto || 0));
    return Math.max(0, totalItens - contratoEntradaValorCalc() - contratoFormasPagamentoTotal());
  };

  const addContratoFormaPagamento = () => {
    setContratoForm(prev => ({
      ...prev,
      formasPagamento: [...(prev.formasPagamento || []), { metodo: 'pix', valor: 0 } as OrcamentoPagamento],
    }));
  };

  const updateContratoFormaPagamento = (idx: number, patch: Partial<OrcamentoPagamento>) => {
    setContratoForm(prev => ({
      ...prev,
      formasPagamento: (prev.formasPagamento || []).map((f, i) => i === idx ? { ...f, ...patch } : f),
    }));
  };

  const removeContratoFormaPagamento = (idx: number) => {
    setContratoForm(prev => ({ ...prev, formasPagamento: (prev.formasPagamento || []).filter((_, i) => i !== idx) }));
  };

  const buildContratoPoliticaPagamentoTexto = (politica: string, entradaTexto: string, obrigatoria: boolean) => {
    const obrigaTxt = obrigatoria ? ' O pagamento da entrada √© condi√ß√£o obrigat√≥ria para o in√≠cio da produ√ß√£o ‚Äî a produ√ß√£o s√≥ come√ßa ap√≥s a confirma√ß√£o desse pagamento.' : '';
    const quandoEntrada = ` A entrada deve ser paga no ato da assinatura deste contrato.`;
    switch (politica) {
      case 'sem_entrada':
        return `N√£o √© exigida entrada. A produ√ß√£o tem in√≠cio ap√≥s a assinatura deste contrato. O valor total dever√° ser pago conforme condi√ß√£o definida no Prazo de Pagamento.`;
      case 'pagamento_integral':
        return `Pagamento integral antecipado, no valor de R$ ${(Math.max(0, contratoItemsTotal() - (contratoForm.desconto || 0))).toFixed(2).replace('.', ',')}, devido no ato da assinatura deste contrato e antes do in√≠cio da produ√ß√£o.`;
      case 'entrada_fixa':
      case 'entrada_percentual':
        return `Entrada de ${entradaTexto} para iniciar a produ√ß√£o.${quandoEntrada}${obrigaTxt}`;
      case 'entrada_restante_entrega':
        return `Entrada de ${entradaTexto} para iniciar a produ√ß√£o.${quandoEntrada}${obrigaTxt} O saldo restante (R$ ${contratoSaldoRestante().toFixed(2).replace('.', ',')}) dever√° ser quitado no momento da conclus√£o do servi√ßo e antes da entrega ou retirada do material.`;
      case 'entrada_parcelas':
        return `Entrada de ${entradaTexto} para iniciar a produ√ß√£o.${quandoEntrada}${obrigaTxt} O saldo restante (R$ ${contratoSaldoRestante().toFixed(2).replace('.', ',')}) ser√° pago em parcelas, conforme detalhado nas formas de pagamento abaixo, e o material s√≥ ser√° liberado ap√≥s a quita√ß√£o integral, salvo autoriza√ß√£o em contr√°rio.`;
      default:
        return '';
    }
  };

  const updateContratoPoliticaPagamento = (patch: { politicaPagamento?: any; entradaObrigatoria?: boolean; entradaModo?: 'percentual' | 'valor'; entradaPercentual?: number | ''; entradaValor?: number | '' }) => {
    setContratoForm(prev => {
      const next = { ...prev, ...patch };
      const entradaTexto = next.entradaModo === 'percentual' ? `${next.entradaPercentual || 0}%` : `R$ ${(next.entradaValor || 0).toFixed(2).replace('.', ',')}`;
      next.formaPagamentoTexto = buildContratoPoliticaPagamentoTexto(next.politicaPagamento, entradaTexto, next.entradaObrigatoria);
      return next;
    });
  };

  const updateContratoMultaJuros = (patch: { multaPercentual?: number | ''; jurosModo?: 'mensal' | 'diario'; jurosPercentual?: number | ''; diasTolerancia?: number | '' }) => {
    setContratoForm(prev => {
      const next = { ...prev, ...patch };
      next.multaJurosTexto = buildMultaJurosTexto(Number(next.multaPercentual) || 0, next.jurosModo, Number(next.jurosPercentual) || 0, Number(next.diasTolerancia) || 0);
      return next;
    });
  };

  const updateContratoPrazoStructured = (patch: Partial<typeof contratoForm>) => {
    setContratoForm(prev => {
      const next = { ...prev, ...patch };
      if (next.prazoGatilho !== 'personalizado') {
        next.prazoTexto = buildPrazoTexto(next.prazoDias, next.prazoTipo, next.prazoGatilho);
      }
      return next;
    });
  };

  const calcularAtrasoContrato = (saldo: number, diasAtraso: number) => {
    const dias = contratoForm.diasTolerancia || 0;
    const diasEfetivos = Math.max(0, diasAtraso - dias);
    if (diasEfetivos <= 0) return { multa: 0, juros: 0, total: saldo, diasEfetivos: 0 };
    const multa = saldo * ((contratoForm.multaPercentual || 0) / 100);
    const taxaDiaria = contratoForm.jurosModo === 'diario'
      ? (contratoForm.jurosPercentual || 0) / 100
      : (contratoForm.jurosPercentual || 0) / 100 / 30;
    const juros = saldo * taxaDiaria * diasEfetivos;
    return { multa, juros, total: saldo + multa + juros, diasEfetivos };
  };

  const [simuladorDiasContrato, setSimuladorDiasContrato] = useState(10);

  const handleSaveOrcamento = async () => {
    if (!orcamentoForm.customerName.trim()) { showAlert('Informe o nome do cliente.'); return; }
    if (orcamentoForm.items.length === 0) { showAlert('Adicione ao menos um item.'); return; }
    // Orcamento nunca pode ser gerado sem telefone/endereco do cliente completos ‚Äî evita
    // orcamento incompleto que depois da trabalho pra completar na hora de virar venda/contrato.
    // CPF/CNPJ NAO e obrigatorio aqui (so e obrigatorio pra Contrato, que tem sua propria validacao)
    if (orcamentoForm.documentType !== 'contrato') {
      if (!orcamentoForm.phone.trim()) { showAlert('Informe o telefone do cliente para gerar o or√ßamento.'); return; }
      if (!orcamentoForm.address.trim()) { showAlert('Informe o endere√ßo do cliente para gerar o or√ßamento.'); return; }
      // Se o CPF/CNPJ foi preenchido (mesmo nao sendo obrigatorio), valida o digito verificador
      if (orcamentoForm.cpfCnpj.trim()) {
        const { valid, tipo } = validateCpfCnpj(orcamentoForm.cpfCnpj);
        if (!valid) { showAlert(`${tipo === 'cnpj' ? 'CNPJ' : 'CPF'} inv√°lido. Confira os n√∫meros e tente novamente.`); return; }
      }
    }
    setSavingOrcamento(true);
    try {
      const total = Math.max(0, orcamentoItemsTotal() - (orcamentoForm.desconto || 0));
      const isContrato = orcamentoForm.documentType === 'contrato';

      // Se esse Orcamento/Contrato ainda nao tem uma Nota vinculada, cria a Nota AGORA (em
      // aberto, sem pagamento) so pra existir o registro no Historico ‚Äî o faturamento so
      // conta de verdade quando essa nota for paga, gerar o documento aqui nao fatura nada.
      let vendaId = orcamentoForm.vendaId || null;
      if (!vendaId) {
        const { data: novaVenda, error: vendaError } = await supabase.from('vendas').insert({
          cliente_id: orcamentoForm.clienteId || null,
          customer_name: orcamentoForm.customerName,
          customer_phone: orcamentoForm.phone || null,
          items: orcamentoForm.items,
          total,
          discount_value: orcamentoForm.desconto || null,
          down_payment: 0,
          received_value: 0,
          status: 'pending',
          observacoes: orcamentoForm.observacoes || null,
        }).select().single();
        if (vendaError) throw vendaError;
        vendaId = novaVenda.id;
        setOrcamentoForm(prev => ({ ...prev, vendaId: novaVenda.id }));
        setAllSalesHistory(prev => [mapVendaRow(novaVenda), ...prev]);
      } else {
        // Ja tem nota vinculada: mantem os itens/valor em sincronia com o que foi editado aqui
        const { error: syncError } = await supabase.from('vendas').update({
          items: orcamentoForm.items,
          total,
          discount_value: orcamentoForm.desconto || null,
        }).eq('id', vendaId);
        if (syncError) throw syncError;
        setAllSalesHistory(prev => prev.map(s => s.id === vendaId ? { ...s, items: [...orcamentoForm.items], total, discountValue: orcamentoForm.desconto || undefined } : s));
      }

      const payload = {
        document_type: orcamentoForm.documentType,
        venda_id: vendaId,
        cliente_id: orcamentoForm.clienteId || null,
        customer_name: orcamentoForm.customerName,
        cpf_cnpj: orcamentoForm.cpfCnpj || null,
        phone: orcamentoForm.phone || null,
        address: orcamentoForm.address || null,
        responsavel: orcamentoForm.responsavel || null,
        items: orcamentoForm.items,
        desconto: orcamentoForm.desconto || 0,
        total,
        observacoes: orcamentoForm.observacoes || null,
        prazo_producao: orcamentoForm.prazoProducao || null,
        prazo_dias: orcamentoForm.prazoDias || null,
        prazo_tipo: orcamentoForm.prazoTipo || 'uteis',
        prazo_gatilho: orcamentoForm.prazoGatilho || 'aprovacao',
        prazo_data_prevista: orcamentoForm.prazoDataPrevista || null,
        prazo_pagamento_texto: orcamentoForm.prazoPagamentoTexto || null,
        condicao_entrega_texto: orcamentoForm.condicaoEntregaTexto || null,
        forma_pagamento_texto: orcamentoForm.formaPagamentoTexto || null,
        multa_juros_texto: orcamentoForm.multaJurosTexto || null,
        garantia_texto: orcamentoForm.garantiaTexto || null,
        politica_cancelamento_texto: orcamentoForm.politicaCancelamentoTexto || null,
        entrada_percentual: orcamentoForm.entradaModo === 'percentual' ? (orcamentoForm.entradaPercentual || null) : null,
        entrada_valor: orcamentoForm.entradaModo === 'valor' ? (orcamentoForm.entradaValor || null) : null,
        formas_pagamento: orcamentoForm.formasPagamento,
        politica_pagamento: orcamentoForm.politicaPagamento,
        entrada_obrigatoria: orcamentoForm.entradaObrigatoria,
        pagamento_posterior_autorizado: orcamentoForm.pagamentoPosteriorAutorizado,
        pagamento_posterior_data: orcamentoForm.pagamentoPosteriorAutorizado ? (orcamentoForm.pagamentoPosteriorData || null) : null,
        pagamento_posterior_dias: orcamentoForm.pagamentoPosteriorAutorizado ? (orcamentoForm.pagamentoPosteriorDias || null) : null,
        pagamento_posterior_condicao: orcamentoForm.pagamentoPosteriorAutorizado ? (orcamentoForm.pagamentoPosteriorCondicao || null) : null,
        pagamento_posterior_responsavel: orcamentoForm.pagamentoPosteriorAutorizado ? (orcamentoForm.pagamentoPosteriorResponsavel || null) : null,
        multa_percentual: orcamentoForm.multaPercentual,
        juros_modo: orcamentoForm.jurosModo,
        juros_percentual: orcamentoForm.jurosPercentual,
        dias_tolerancia: orcamentoForm.diasTolerancia,
        validade: orcamentoForm.validade || null,
        service_status: orcamentoForm.serviceStatus || 'pedido_recebido',
      };
      let newId: string | null = null;
      if (editingOrcamento) {
        const { error } = await supabase.from('orcamentos').update(payload).eq('id', editingOrcamento.id);
        if (error) throw error;
        newId = editingOrcamento.id;
      } else {
        const prefixo = isContrato ? 'CTR' : 'ORC';
        const numero = `${prefixo}-${Date.now().toString(36).toUpperCase()}`;
        const { data: inserted, error } = await supabase.from('orcamentos').insert({ ...payload, numero, service_status: orcamentoForm.serviceStatus || 'pedido_recebido' }).select().single();
        if (error) throw error;
        newId = inserted?.id || null;
      }

      // Vincula a nota de volta pro documento (orcamento_id ou contrato_id, dependendo do tipo)
      if (newId && vendaId) {
        const fkField = isContrato ? 'contrato_id' : 'orcamento_id';
        await supabase.from('vendas').update({ [fkField]: newId }).eq('id', vendaId);
        setAllSalesHistory(prev => prev.map(s => s.id === vendaId ? { ...s, [isContrato ? 'contratoId' : 'orcamentoId']: newId } as SaleOrder : s));
      }

      setOrcamentoModalOpen(false);
      await loadOrcamentos();

      // Veio da tela de venda: nao finaliza venda nenhuma, so limpa o carrinho e leva pra central de Orcamentos
      if (!editingOrcamento && newId) {
        if (orcamentoFromCart) {
          setCart([]);
          setSelectedCustomer(null);
          setOrcamentoFromCart(false);
        }
        setActiveTab('orcamentos');
        setHighlightOrcamentoId(newId);
        setTimeout(() => setHighlightOrcamentoId(null), 4000);
      }
    } catch (err: any) {
      console.error('Erro ao salvar or√ßamento:', err);
      showAlert(`N√£o foi poss√≠vel salvar o or√ßamento: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setSavingOrcamento(false);
    }
  };

  // SINCRONIZA√á√ÉO DE ETAPAS: Pedido ‚Üî Or√ßamento ‚Üî Contrato
  // Quando qualquer um muda de etapa, atualiza os outros 2 (se vinculados)
  const syncServiceStatus = async (sourceType: 'venda' | 'orcamento' | 'contrato', docId: string, newStatus: string) => {
    try {
      // 1. Atualizar o documento que foi alterado
      const updates: Record<string, any> = { service_status: newStatus };
      const { error: updateError } = await supabase
        .from(sourceType === 'venda' ? 'vendas' : sourceType === 'orcamento' ? 'orcamentos' : 'contratos')
        .update(updates)
        .eq('id', docId);
      if (updateError) throw updateError;

      // 2. Buscar o documento alterado pra pegar dados de vincula√ß√£o
      let vendaId: string | null = null;
      let orcamentoId: string | null = null;
      let contratoId: string | null = null;

      if (sourceType === 'venda') {
        vendaId = docId;
        // Buscar Or√ßamento e Contrato vinculados
        const { data: venda } = await supabase.from('vendas').select('orcamento_id, contrato_id').eq('id', vendaId).single();
        if (venda) {
          orcamentoId = venda.orcamento_id;
          contratoId = venda.contrato_id;
        }
      } else if (sourceType === 'orcamento') {
        orcamentoId = docId;
        // Buscar Pedido vinculado
        const { data: orcamento } = await supabase.from('orcamentos').select('venda_id').eq('id', orcamentoId).single();
        if (orcamento?.venda_id) {
          vendaId = orcamento.venda_id;
          // Buscar Contrato tamb√©m vinculado ao mesmo Pedido
          const { data: venda } = await supabase.from('vendas').select('contrato_id').eq('id', vendaId).single();
          if (venda?.contrato_id) contratoId = venda.contrato_id;
        }
      } else if (sourceType === 'contrato') {
        contratoId = docId;
        // Buscar Pedido vinculado
        const { data: contrato } = await supabase.from('contratos').select('venda_id').eq('id', contratoId).single();
        if (contrato?.venda_id) {
          vendaId = contrato.venda_id;
          // Buscar Or√ßamento tamb√©m vinculado ao mesmo Pedido
          const { data: venda } = await supabase.from('vendas').select('orcamento_id').eq('id', vendaId).single();
          if (venda?.orcamento_id) orcamentoId = venda.orcamento_id;
        }
      }

      // 3. Sincronizar os outros documentos (se vinculados ao mesmo Pedido)
      const updates_others: Record<string, any> = { service_status: newStatus };
      
      if (vendaId && sourceType !== 'venda') {
        await supabase.from('vendas').update(updates_others).eq('id', vendaId);
        // Recarregar dados do Pedido
        setAllSalesHistory(prev => prev.map(s => s.id === vendaId ? { ...s, serviceStatus: newStatus as any } : s));
      }
      if (orcamentoId && sourceType !== 'orcamento') {
        await supabase.from('orcamentos').update(updates_others).eq('id', orcamentoId);
        // Recarregar dados do Or√ßamento
        loadOrcamentos();
      }
      if (contratoId && sourceType !== 'contrato') {
        await supabase.from('contratos').update(updates_others).eq('id', contratoId);
        // Recarregar dados do Contrato
        loadContratos();
      }
    } catch (err) {
      console.error('Erro ao sincronizar etapas:', err);
      showAlert('N√£o foi poss√≠vel sincronizar as etapas entre os documentos.');
    }
  };

  const updateOrcamentoStatus = async (o: Orcamento, newStatus: string) => {
    await syncServiceStatus('orcamento', o.id, newStatus);
  };

  const handleDeleteOrcamento = async (o: Orcamento) => {
    const vinculos: string[] = [];
    if (o.vendaId) vinculos.push('um Recibo/Nota');
    if (o.contratoId) vinculos.push('um Contrato');
    const avisoVinculo = vinculos.length
      ? `\n\n‚ö†Ô∏è Este or√ßamento est√° ligado a ${vinculos.join(' e ')}. Eles N√ÉO ser√£o exclu√≠dos ‚Äî continuam intactos.`
      : '';
    if (!(await showConfirm(`Excluir o or√ßamento ${o.numero}?${avisoVinculo}\n\nEle fica 30 dias na aba Exclu√≠dos antes de sumir de vez ‚Äî voc√™ pode restaurar dentro desse prazo.`))) return;
    const { error } = await supabase.from('orcamentos').update({ deleted_at: new Date().toISOString() }).eq('id', o.id);
    if (error) { showAlert('N√£o foi poss√≠vel excluir.'); return; }
    setAllOrcamentos(prev => prev.filter(or => or.id !== o.id));
  };

  const [waSendOrcamento, setWaSendOrcamento] = useState<Orcamento | null>(null);
  const [waSendPhone, setWaSendPhone] = useState('');

  const openShareOrcamentoWhatsApp = (o: Orcamento) => {
    setWaSendOrcamento(o);
    setWaSendPhone(o.phone || '');
  };

  const confirmShareOrcamentoWhatsApp = async () => {
    const o = waSendOrcamento;
    if (!o) return;
    const phoneDigits = waSendPhone.replace(/\D/g, '');
    if (!phoneDigits) { showAlert('Digite um telefone v√°lido.'); return; }
    const linhas = o.items.map(i => `${i.quantity}x ${i.name} ‚Äî R$ ${(i.area ? i.price * i.area * i.quantity : i.price * i.quantity).toFixed(2)}`).join('\n');
    const msg = `*Or√ßamento ${o.numero} ‚Äî Rafa Arts Graphics*\n\n${linhas}\n\n${o.desconto > 0 ? `Desconto: R$ ${o.desconto.toFixed(2)}\n` : ''}*Total: R$ ${o.total.toFixed(2)}*\n\n${o.prazoProducao ? `Prazo: ${o.prazoProducao}\n\n` : ''}${o.formaPagamentoTexto ? `Pagamento: ${o.formaPagamentoTexto}\n\n` : ''}${o.validade ? `V√°lido at√©: ${safeFormat(o.validade, 'dd/MM/yyyy')}` : ''}`;
    await findOrCreateLeadAndOpenChat(phoneDigits, o.customerName || 'Cliente', msg);
    if (o.status === 'rascunho') {
      await supabase.from('orcamentos').update({ status: 'enviado' }).eq('id', o.id);
      loadOrcamentos();
    }
    // Se o numero foi trocado, salva como "telefone alternativo" (mantem o principal intacto)
    if (phoneDigits !== (o.phone || '').replace(/\D/g, '')) {
      await supabase.from('orcamentos').update({ telefone_alternativo: waSendPhone }).eq('id', o.id);
      loadOrcamentos();
    }
    setWaSendOrcamento(null);
  };

  const [viewingOrcamento, setViewingOrcamento] = useState<Orcamento | null>(null);

  const handleDownloadOrcamentoPdf = async (o: Orcamento) => {
    try {
      const canvas = await renderOrcamentoCanvas({ orcamento: o, companyName: currentCompany?.name || 'Rafa Arts Graphics', logoDarkUrl, companyContact });
      await downloadCanvasAsPdf(canvas, buildFileName('Orcamento', o.customerName, o.createdAt, 'pdf'));
    } catch (err) {
      console.error('Erro ao gerar PDF do or√ßamento:', err);
      showAlert('N√£o foi poss√≠vel gerar o PDF do or√ßamento.');
    }
  };

  const handleDownloadOrcamentoImagem = async (o: Orcamento) => {
    try {
      const canvas = await renderOrcamentoCanvas({ orcamento: o, companyName: currentCompany?.name || 'Rafa Arts Graphics', logoDarkUrl, companyContact });
      downloadCanvasAsPng(canvas, buildFileName('Orcamento', o.customerName, o.createdAt, 'png'));
    } catch (err) {
      console.error('Erro ao gerar imagem do or√ßamento:', err);
      showAlert('N√£o foi poss√≠vel gerar a imagem do or√ßamento.');
    }
  };

  const handlePrintOrcamento = async (o: Orcamento) => {
    try {
      const canvas = await renderOrcamentoCanvas({ orcamento: o, companyName: currentCompany?.name || 'Rafa Arts Graphics', logoDarkUrl, companyContact });
      const dataUrl = canvas.toDataURL('image/png');
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`<html><head><title>Or√ßamento ${o.numero}</title></head><body style="margin:0"><img src="${dataUrl}" style="width:100%" onload="window.print()" /></body></html>`);
      win.document.close();
    } catch (err) {
      console.error('Erro ao imprimir or√ßamento:', err);
      showAlert('N√£o foi poss√≠vel preparar a impress√£o.');
    }
  };

  const handleStartSaleFromOrcamento = (o: Orcamento) => {
    setCart([...o.items]);
    setSelectedCustomer(o.clienteId ? { id: o.clienteId, name: o.customerName || 'Cliente', phone: o.phone || '' } : null);
    setActiveTab('venda');
    // Guarda o vinculo para gravar no momento de finalizar a venda
    setLinkedOrcamentoId(o.id);
  };

  type OrderStatusFilterId = 'em_aberto' | 'entrada_recebida' | 'quitado' | 'entregue' | 'cancelado';
  type PaymentFilterId = 'pix' | 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'transferencia' | 'boleto' | 'crediario';

  const [selectedOrderStatusFilters, setSelectedOrderStatusFilters] = useState<Set<OrderStatusFilterId>>(new Set());
  const toggleOrderStatusFilter = (id: OrderStatusFilterId) => {
    setSelectedOrderStatusFilters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const clearOrderStatusFilters = () => setSelectedOrderStatusFilters(new Set());

  const [selectedPaymentFilters, setSelectedPaymentFilters] = useState<Set<PaymentFilterId>>(new Set());
  const togglePaymentFilter = (id: PaymentFilterId) => {
    setSelectedPaymentFilters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const clearPaymentFilters = () => setSelectedPaymentFilters(new Set());

  const [historySearch, setHistorySearch] = useState('');
  const [historyClienteIdFilter, setHistoryClienteIdFilter] = useState<string | null>(null);
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  // Abas de filtro no topo do Historico: Visao Geral (todos os pedidos, com os filtros normais),
  // Vendas do Dia (so pedidos CRIADOS hoje) e Entradas de Caixa (cada RECEBIMENTO individual,
  // nao pedido -- uma nota paga em 2 partes aparece como 2 linhas, cada uma na sua data/hora real).
  const [historyViewTab, setHistoryViewTabState] = useState<'geral' | 'vendas_dia' | 'entradas_caixa'>(() => {
    const saved = localStorage.getItem('rpro_history_view_tab');
    return (saved === 'geral' || saved === 'vendas_dia' || saved === 'entradas_caixa') ? saved : 'geral';
  });
  const setHistoryViewTab = (tab: 'geral' | 'vendas_dia' | 'entradas_caixa') => {
    setHistoryViewTabState(tab);
    localStorage.setItem('rpro_history_view_tab', tab);
  };
  const [historyViewMode, setHistoryViewModeState] = useState<'miniatura' | 'normal' | 'lista'>(() => {
    const saved = localStorage.getItem('rpro_history_view_mode');
    return (saved === 'miniatura' || saved === 'normal' || saved === 'lista') ? saved : 'normal';
  });
  const setHistoryViewMode = (mode: 'miniatura' | 'normal' | 'lista') => {
    setHistoryViewModeState(mode);
    localStorage.setItem('rpro_history_view_mode', mode);
  };
  const [historySortOrder, setHistorySortOrderState] = useState<'desc' | 'asc'>(() => {
    const saved = localStorage.getItem('rpro_history_sort_order');
    return saved === 'asc' ? 'asc' : 'desc';
  });
  const setHistorySortOrder = (order: 'desc' | 'asc') => {
    setHistorySortOrderState(order);
    localStorage.setItem('rpro_history_sort_order', order);
  };
  const [servicosSortBy, setServicosSortByState] = useState<'data' | 'nome' | 'valor' | 'status' | 'agendamento'>(() => {
    const saved = localStorage.getItem('rpro_servicos_sort');
    return (saved === 'data' || saved === 'nome' || saved === 'valor' || saved === 'status' || saved === 'agendamento') ? saved : 'data';
  });
  const setServicosSortBy = (v: 'data' | 'nome' | 'valor' | 'status' | 'agendamento') => {
    setServicosSortByState(v);
    localStorage.setItem('rpro_servicos_sort', v);
  };

  const [produtosCostMap, setProdutosCostMap] = useState<Record<string, number>>({});
  useEffect(() => {
    const loadCosts = async () => {
      const { data } = await supabase.from('produtos').select('id, cost_price');
      const map: Record<string, number> = {};
      (data || []).forEach((p: any) => { map[p.id] = Number(p.cost_price) || 0; });
      setProdutosCostMap(map);
    };
    loadCosts();
  }, []);

  // Lucro liquido de uma venda (valor recebido - custo Lona/Adesivo - custos extras manuais),
  // so pro Admin ver na coluna de valor do modo lista -- ver src/lib/lucro.ts pra regra completa.
  const calcularLucroDaVenda = (sale: SaleOrder) => {
    const down = sale.status === 'completed' ? sale.total : (sale.downPayment || 0);
    // Nota parcialmente paga: proporcionaliza o custo pelo tanto que ja entrou, igual ao
    // resumo do periodo (servicosResumo abaixo), pra nao contar custo que ainda nao foi
    // de fato "pago" pelo cliente.
    const proporcao = (sale.status === 'pending' && sale.total > 0) ? down / sale.total : undefined;
    return calcularLucroLiquido({
      valorRecebido: down,
      items: sale.items,
      custoPorId: produtosCostMap,
      extraCosts: sale.extraCosts,
      proporcao,
    });
  };

  // Painel "Custos da Nota" (Admin) -- custos extras/diretos daquela producao especifica
  // (mao de obra, frete, aluguel de andaime, insumo aplicado fora do estoque padrao), SEPARADOS
  // do Estoque de Insumos (materia-prima, controlado na aba lateral "Estoque de Insumos").
  // Fica oculto do cliente e so afeta o Lucro Liquido mostrado pro Admin/autorizado.
  const [custosNotaSale, setCustosNotaSale] = useState<SaleOrder | null>(null);
  const [custosNotaDraft, setCustosNotaDraft] = useState<ExtraCost[]>([]);
  const [custosNotaSaving, setCustosNotaSaving] = useState(false);
  const [novoCustoDesc, setNovoCustoDesc] = useState('');
  const [novoCustoValor, setNovoCustoValor] = useState<number | ''>('');

  // Calculadora auxiliar pro campo VALOR -- util quando o custo e composto de varias
  // partes (ex: 2 ajudantes x R$50 + frete R$30) e o usuario quer somar tudo antes de
  // lancar como um unico item de custo extra.
  const [calculadoraOpen, setCalculadoraOpen] = useState(false);
  const [calculadoraExpr, setCalculadoraExpr] = useState('');

  const calculadoraResultado = (): number | null => {
    if (!calculadoraExpr.trim()) return null;
    const sanitizado = calculadoraExpr.replace(/√ó/g, '*').replace(/√∑/g, '/');
    if (!/^[0-9+\-*/.%() ]+$/.test(sanitizado)) return null;
    try {
      // eslint-disable-next-line no-new-func
      const resultado = Function(`"use strict"; return (${sanitizado})`)();
      return typeof resultado === 'number' && isFinite(resultado) ? resultado : null;
    } catch {
      return null;
    }
  };

  const calculadoraPressionar = (val: string) => {
    if (val === 'C') { setCalculadoraExpr(''); return; }
    if (val === '‚å´') { setCalculadoraExpr(prev => prev.slice(0, -1)); return; }
    if (val === '=') {
      const resultado = calculadoraResultado();
      if (resultado !== null) setCalculadoraExpr(String(Number(resultado.toFixed(4))));
      return;
    }
    setCalculadoraExpr(prev => {
      const operadores = ['+', '-', '√ó', '√∑'];
      const ultimoChar = prev.slice(-1);
      // Evita dois operadores seguidos (ex: "10++5") -- so troca o ultimo pelo novo.
      if (operadores.includes(val) && operadores.includes(ultimoChar)) return prev.slice(0, -1) + val;
      if (val === '.') {
        const partesAtuais = prev.split(/[+\-√ó√∑]/);
        const numeroAtual = partesAtuais[partesAtuais.length - 1];
        if (numeroAtual.includes('.')) return prev;
      }
      return prev + val;
    });
  };

  const abrirCalculadora = () => {
    setCalculadoraExpr(novoCustoValor !== '' ? String(novoCustoValor) : '');
    setCalculadoraOpen(true);
  };

  const usarValorCalculadora = () => {
    const resultado = calculadoraResultado();
    if (resultado !== null && resultado > 0) setNovoCustoValor(Number(resultado.toFixed(2)));
    setCalculadoraOpen(false);
    setCalculadoraExpr('');
  };

  const openCustosDaNota = (sale: SaleOrder) => {
    setCustosNotaSale(sale);
    setCustosNotaDraft(sale.extraCosts ? [...sale.extraCosts] : []);
    setNovoCustoDesc('');
    setNovoCustoValor('');
  };

  const adicionarCustoNota = () => {
    if (!novoCustoDesc.trim() || novoCustoValor === '' || Number(novoCustoValor) <= 0) return;
    setCustosNotaDraft(prev => [...prev, { id: `${Date.now()}`, description: novoCustoDesc.trim(), amount: Number(novoCustoValor) }]);
    setNovoCustoDesc('');
    setNovoCustoValor('');
  };

  const removerCustoNota = (id: string) => setCustosNotaDraft(prev => prev.filter(c => c.id !== id));

  const salvarCustosNota = async () => {
    if (!custosNotaSale) return;
    setCustosNotaSaving(true);
    try {
      const { error } = await supabase.from('vendas').update({ custos_extras: custosNotaDraft }).eq('id', custosNotaSale.id);
      if (error) throw error;
      const atualizarLista = (list: SaleOrder[]) => list.map(s => s.id === custosNotaSale.id ? { ...s, extraCosts: custosNotaDraft } : s);
      setAllSalesHistory(atualizarLista);
      setCustosNotaSale(null);
    } catch (e) {
      console.error('Erro ao salvar custos da nota:', e);
      await showAlert('N√£o foi poss√≠vel salvar os custos extras. Tente novamente.');
    } finally {
      setCustosNotaSaving(false);
    }
  };

  // Composicao dos pagamentos de uma venda, ja formatada pro botao de Pagamento do modo lista
  // (ex.: "Pix: R$ 100,00" + "Din: R$ 100,00"). Usa sale.payments quando existe (pagamento
  // misto/detalhado); cai pro paymentMethod unico como fallback pra notas antigas sem o array
  // payments.
  const PAYMENT_METHOD_SHORT: Record<string, string> = {
    pix: 'Pix', dinheiro: 'Din', cartao_debito: 'D√©bito', cartao_credito: 'Cr√©dito',
    transferencia: 'Transf', boleto: 'Boleto', crediario: 'Credi√°rio',
  };
  const composicaoPagamentoDaVenda = (sale: SaleOrder): { label: string; value: number }[] => {
    if (sale.payments && sale.payments.length > 0) {
      const porMetodo: Record<string, number> = {};
      sale.payments.forEach(p => { porMetodo[p.method] = (porMetodo[p.method] || 0) + (p.value || 0); });
      return Object.entries(porMetodo).map(([method, value]) => ({ label: PAYMENT_METHOD_SHORT[method] || method, value }));
    }
    if (sale.paymentMethod && sale.paymentMethod !== 'misto') {
      const valor = sale.status === 'completed' ? sale.total : (sale.downPayment || 0);
      if (valor > 0) return [{ label: PAYMENT_METHOD_SHORT[sale.paymentMethod] || sale.paymentMethod, value: valor }];
    }
    return [];
  };

  // Dropdown "Status do Pedido"
  const [isOrderStatusOpen, setIsOrderStatusOpen] = useState(false);
  const orderStatusRef = React.useRef<HTMLDivElement>(null);
  const orderStatusBtnRef = React.useRef<HTMLButtonElement>(null);
  const orderStatusMenuRef = React.useRef<HTMLDivElement>(null);
  const [orderStatusPos, setOrderStatusPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Dropdown "Forma de Pagamento"
  const [isPaymentFilterOpen, setIsPaymentFilterOpen] = useState(false);
  const paymentFilterRef = React.useRef<HTMLDivElement>(null);
  const paymentFilterBtnRef = React.useRef<HTMLButtonElement>(null);
  const paymentFilterMenuRef = React.useRef<HTMLDivElement>(null);
  const [paymentFilterPos, setPaymentFilterPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideOrderBtn = orderStatusRef.current && orderStatusRef.current.contains(target);
      const insideOrderMenu = orderStatusMenuRef.current && orderStatusMenuRef.current.contains(target);
      if (!insideOrderBtn && !insideOrderMenu) setIsOrderStatusOpen(false);

      const insidePayBtn = paymentFilterRef.current && paymentFilterRef.current.contains(target);
      const insidePayMenu = paymentFilterMenuRef.current && paymentFilterMenuRef.current.contains(target);
      if (!insidePayBtn && !insidePayMenu) setIsPaymentFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());
  const toggleSaleSelection = (id: string) => {
    setSelectedSaleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const [viewingReceiptSale, setViewingReceiptSale] = useState<SaleOrder | null>(null);
  const [viewingReceiptEmail, setViewingReceiptEmail] = useState<string | undefined>(undefined);
  const handleDuplicateSale = async (sale: SaleOrder) => {
    if (!(await showConfirm(`Duplicar pedido de ${sale.customerName || 'cliente'}?`))) return;
    // Carrega os mesmos itens e cliente no carrinho ‚Äî nao copia pagamento/status, a nova nota comeca do zero.
    setCart(sale.items.map(item => ({ ...item })));
    setActiveTab('venda');
    if (sale.customerId) {
      // Cliente ja identificado ‚Äî pula a busca de cliente e vai direto pra tela de pagamento,
      // igual o botao "Finalizar Venda" ja faz quando ha um cliente selecionado.
      setSelectedCustomer({ id: sale.customerId, name: sale.customerName || '', phone: sale.customerPhone || '' });
      setDownPayment(0);
      setPaymentEntries([]);
      setScheduledFor('');
      setPendingPaymentMethod('');
      setIsPaymentModalOpen(true);
    } else {
      // Pedido avulso (sem cliente cadastrado) ‚Äî precisa escolher/criar o cliente antes de finalizar
      setSelectedCustomer(null);
      showAlert(`Pedido de ${sale.customerName || 'cliente avulso'} duplicado! Os itens j√° est√£o no carrinho, mas esse pedido n√£o tinha cliente cadastrado ‚Äî selecione um cliente antes de finalizar.`);
    }
  };

  const [receiptOpenedFromProduction, setReceiptOpenedFromProduction] = useState(false);

  const handleCloseReceiptViewer = () => {
    setViewingReceiptSale(null);
    if (receiptOpenedFromProduction) {
      setReceiptOpenedFromProduction(false);
      setRootActiveTab('production');
    }
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    if (receiptOpenedFromProduction) {
      setReceiptOpenedFromProduction(false);
      setRootActiveTab('production');
    }
  };

  const openReceiptById = async (saleId: string) => {
    const { data, error } = await supabase.from('vendas').select('*').eq('id', saleId).maybeSingle();
    if (error || !data) { showAlert('N√£o foi poss√≠vel abrir esse pedido.'); return; }
    await openReceiptDetail(mapVendaRow(data));
  };

  // Se outra aba (ex: Ordem de Servico) pediu pra abrir um recibo especifico, atende assim que o Terminal montar.
  // Nao precisa trocar de sub-aba: o recibo e um modal que aparece por cima de qualquer uma delas.
  useEffect(() => {
    if (!pendingReceiptOpenId) return;
    openReceiptById(pendingReceiptOpenId).then(() => setReceiptOpenedFromProduction(true));
    setPendingReceiptOpenId(null);
  }, [pendingReceiptOpenId]);

  // Se a aba Contatos (fora do Terminal) pediu pra ver o historico de um cliente especifico
  useEffect(() => {
    if (!pendingHistoryClientFilter) return;
    setHistoryClienteIdFilter(pendingHistoryClientFilter.clienteId);
    setHistorySearch(pendingHistoryClientFilter.clienteName);
    setActiveTab('historico');
    setPendingHistoryClientFilter(null);
  }, [pendingHistoryClientFilter]);

  // Se a Analise Detalhada do Dashboard pediu pra ver o historico de vendas de um produto
  // especifico (clicou em "Mais Vendidos") ‚Äî a busca do Historico ja compara com o nome dos itens
  useEffect(() => {
    if (!pendingHistoryProductSearch) return;
    setHistoryClienteIdFilter(null);
    setHistorySearch(pendingHistoryProductSearch);
    setActiveTab('historico');
    setPendingHistoryProductSearch(null);
  }, [pendingHistoryProductSearch]);

  // Se o card "A Receber" do Dashboard pediu pra ver as notas com saldo em aberto
  useEffect(() => {
    if (!pendingReceivablesFilter) return;
    setHistoryClienteIdFilter(null);
    setHistorySearch('');
    setSelectedOrderStatusFilters(new Set(['em_aberto', 'entrada_recebida']));
    setActiveTab('historico');
    setPendingReceivablesFilter(false);
  }, [pendingReceivablesFilter]);

  // Se a Analise Detalhada do Dashboard (ou outro atalho generico) pediu pra ir pro Historico, sem filtro nenhum
  useEffect(() => {
    if (!pendingGoToHistorico) return;
    setActiveTab('historico');
    setPendingGoToHistorico(false);
  }, [pendingGoToHistorico]);

  // Se o card "Ordem de Servicos" do Dashboard pediu pra ir pra aba Servicos do PDV
  useEffect(() => {
    if (!pendingGoToServicos) return;
    setActiveTab('servicos');
    setPendingGoToServicos(false);
  }, [pendingGoToServicos]);

  // Se a Ficha do Cliente (fora do Terminal) pediu pra abrir um contrato especifico
  useEffect(() => {
    if (!pendingOpenContratoId) return;
    setActiveTab('contratos');
    setHighlightContratoId(pendingOpenContratoId);
    setTimeout(() => setHighlightContratoId(null), 4000);
    setPendingOpenContratoId(null);
  }, [pendingOpenContratoId]);

  // Se a Ficha do Cliente (fora do Terminal) pediu pra abrir um orcamento especifico
  useEffect(() => {
    if (!pendingOpenOrcamentoId) return;
    setActiveTab('orcamentos');
    setHighlightOrcamentoId(pendingOpenOrcamentoId);
    setTimeout(() => setHighlightOrcamentoId(null), 4000);
    setPendingOpenOrcamentoId(null);
  }, [pendingOpenOrcamentoId]);

  // Se a aba Contatos pediu pra iniciar uma venda ja com o cliente selecionado
  useEffect(() => {
    if (!prefilledCustomer) return;
    setSelectedCustomer({ id: prefilledCustomer.id || '', name: prefilledCustomer.name, phone: prefilledCustomer.phone });
    setActiveTab('venda');
    setPrefilledCustomer(null);
  }, [prefilledCustomer]);

  const openReceiptDetail = async (sale: SaleOrder) => {
    setViewingReceiptSale(sale);
    setViewingReceiptEmail(undefined);
    setReceiptOpenedFromProduction(false); // reseta por padrao; so fica true se vier explicitamente da Ordem de Servico
    const phoneDigits = (sale.customerPhone || '').replace(/\D/g, '');
    if (phoneDigits.length >= 8) {
      try {
        const { data } = await supabase.from('clientes').select('email').ilike('phone', `%${phoneDigits.slice(-8)}%`).limit(1).maybeSingle();
        if (data?.email) setViewingReceiptEmail(data.email);
      } catch (e) { /* silencioso, email √© opcional */ }
    }
  };

  const handlePrintReceipt = async (sale: SaleOrder) => {
    const canvas = await renderReceiptCanvas({ order: sale, companyName: currentCompany?.name || 'Rafa Arts Graphics', customerPhone: sale.customerPhone, logoDarkUrl, companyContact });
    const dataUrl = canvas.toDataURL('image/png');
    const printWin = window.open('', '_blank', 'width=500,height=800');
    if (!printWin) { showAlert('Permita pop-ups para imprimir.'); return; }
    printWin.document.write(`<!DOCTYPE html><html><head><title>Recibo #${sale.id.slice(-8).toUpperCase()}</title><style>body{margin:0;background:#F5F7FA;display:flex;justify-content:center;}img{width:100%;max-width:560px;}</style></head><body><img src="${dataUrl}" onload="window.print();window.close();" /></body></html>`);
    printWin.document.close();
  };

  const handleDownloadReceiptPdf = async (sale: SaleOrder) => {
    const canvas = await renderReceiptCanvas({ order: sale, companyName: currentCompany?.name || 'Rafa Arts Graphics', customerPhone: sale.customerPhone, logoDarkUrl, companyContact });
    await downloadCanvasAsPdf(canvas, buildFileName('Recibo', sale.customerName, sale.createdAt, 'pdf'));
  };

  const handleDownloadReceiptImagem = async (sale: SaleOrder) => {
    const canvas = await renderReceiptCanvas({ order: sale, companyName: currentCompany?.name || 'Rafa Arts Graphics', customerPhone: sale.customerPhone, logoDarkUrl, companyContact });
    downloadCanvasAsPng(canvas, buildFileName('Recibo', sale.customerName, sale.createdAt, 'png'));
  };

  const handleShareReceiptWhatsApp = async (sale: SaleOrder) => {
    if (!sale.customerPhone) {
      showAlert('Essa venda n√£o tem telefone de WhatsApp cadastrado. Edite a venda para adicionar o telefone do cliente.');
      return;
    }
    setViewingReceiptSale(null);
    await handleShareViaWhatsApp(sale, sale.customerName || 'Cliente', sale.customerPhone);
  };

  const handleOpenChatFromReceipt = async (sale: SaleOrder) => {
    if (!sale.customerPhone) return;
    setViewingReceiptSale(null);
    const digits = sale.customerPhone.replace(/\D/g, '');
    await findOrCreateLeadAndOpenChat(digits, sale.customerName || 'Cliente', buildOrderShareMessage(sale, sale.customerName || 'Cliente'));
  };

  const matchesOrderStatusFilter = (sale: SaleOrder, filter: OrderStatusFilterId): boolean => {
    const down = sale.downPayment || 0;
    const isFullyPaid = sale.status === 'completed' || down >= sale.total;
    switch (filter) {
      case 'em_aberto':
        return down === 0 && sale.status !== 'canceled';
      case 'entrada_recebida':
        return down > 0 && down < sale.total && sale.status !== 'canceled';
      case 'quitado':
        return isFullyPaid && sale.status !== 'canceled';
      case 'entregue':
        return isFullyPaid && !sale.scheduledFor && sale.status !== 'canceled';
      case 'cancelado':
        return sale.status === 'canceled';
      default:
        return true;
    }
  };

  const matchesPaymentFilter = (sale: SaleOrder, filter: PaymentFilterId): boolean => {
    const method = (sale.paymentMethod || '').toLowerCase();
    switch (filter) {
      case 'pix':
        return method.includes('pix');
      case 'dinheiro':
        return method.includes('dinheiro');
      case 'cartao_debito':
        return method.includes('debito');
      case 'cartao_credito':
        return method.includes('credito');
      case 'transferencia':
        return method.includes('transferencia');
      case 'boleto':
        return method.includes('boleto');
      case 'crediario':
        return method.includes('crediario');
      default:
        return true;
    }
  };

  // Dentro de cada lista, selecionar varias = "ou" (um pedido so tem 1 status/1 pagamento).
  // Entre as duas listas, o resultado e cruzado (E) ‚Äî precisa bater com status E pagamento selecionados.
  const matchesOrderStatusGroup = (sale: SaleOrder, filters: Set<OrderStatusFilterId>): boolean => {
    if (filters.size === 0) return true;
    for (const f of filters) if (matchesOrderStatusFilter(sale, f)) return true;
    return false;
  };
  const matchesPaymentGroup = (sale: SaleOrder, filters: Set<PaymentFilterId>): boolean => {
    if (filters.size === 0) return true;
    for (const f of filters) if (matchesPaymentFilter(sale, f)) return true;
    return false;
  };

  const matchesHistorySearch = (sale: SaleOrder): boolean => {
    // Filtro preciso por cliente_id (evita confundir clientes com nomes iguais) ‚Äî tem prioridade sobre o texto
    if (historyClienteIdFilter) {
      if (sale.customerId) return sale.customerId === historyClienteIdFilter;
      // Venda orfa (sem cliente_id vinculado ainda) ‚Äî casa pelo nome como reserva,
      // mesma logica usada na Ficha do Cliente pra reconhecer vendas antigas/importadas
      const nomeFiltro = historySearch.toLowerCase().trim();
      return !!nomeFiltro && (sale.customerName || '').toLowerCase().trim() === nomeFiltro;
    }
    if (!historySearch.trim()) return true;
    const term = historySearch.toLowerCase().trim();
    const termDigits = term.replace(/\D/g, '');
    const nameMatch = (sale.customerName || '').toLowerCase().includes(term);
    const idMatch = sale.id.toLowerCase().includes(term);
    const itemMatch = sale.items?.some(i => i.name.toLowerCase().includes(term));
    const phoneMatch = termDigits.length >= 3 && (sale.customerPhone || '').replace(/\D/g, '').includes(termDigits);
    return nameMatch || idMatch || !!itemMatch || phoneMatch;
  };

  // Contagens facetadas: quantas O.S. restam considerando a busca + a OUTRA lista ja selecionada
  // (assim cada lista atualiza sozinha conforme a combinacao muda)
  const orderStatusCounts = useMemo(() => {
    const searched = allSalesHistory.filter(matchesHistorySearch).filter(s => matchesPaymentGroup(s, selectedPaymentFilters));
    const ids: OrderStatusFilterId[] = ['em_aberto', 'entrada_recebida', 'quitado', 'entregue', 'cancelado'];
    const counts: Record<string, number> = { todos: searched.length };
    ids.forEach(id => { counts[id] = searched.filter(s => matchesOrderStatusFilter(s, id)).length; });
    return counts;
  }, [allSalesHistory, historySearch, historyClienteIdFilter, selectedPaymentFilters]);

  const paymentFilterCounts = useMemo(() => {
    const searched = allSalesHistory.filter(matchesHistorySearch).filter(s => matchesOrderStatusGroup(s, selectedOrderStatusFilters));
    const ids: PaymentFilterId[] = ['pix', 'dinheiro', 'cartao_debito', 'cartao_credito', 'transferencia', 'boleto', 'crediario'];
    const counts: Record<string, number> = { todos: searched.length };
    ids.forEach(id => { counts[id] = searched.filter(s => matchesPaymentFilter(s, id)).length; });
    return counts;
  }, [allSalesHistory, historySearch, historyClienteIdFilter, selectedOrderStatusFilters]);

  const pendingOrScheduledSales = useMemo(() => {
    const filtered = allSalesHistory.filter(sale => {
      const down = sale.downPayment || 0;
      const balance = sale.total - down;
      const isPartial = balance > 0 || sale.status === 'pending';
      return isPartial || !!sale.scheduledFor;
    });
    return filtered.sort((a, b) => {
      if (servicosSortBy === 'agendamento') {
        // Sem agendamento sempre vai pro fim da lista, em qualquer direcao escolhida
        if (!a.scheduledFor && !b.scheduledFor) return 0;
        if (!a.scheduledFor) return 1;
        if (!b.scheduledFor) return -1;
        const cmp = new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
        return historySortOrder === 'desc' ? -cmp : cmp;
      }
      let cmp = 0;
      switch (servicosSortBy) {
        case 'nome':
          cmp = (a.customerName || '').localeCompare(b.customerName || '');
          break;
        case 'valor':
          cmp = (a.total || 0) - (b.total || 0);
          break;
        case 'status':
          cmp = (a.status || '').localeCompare(b.status || '');
          break;
        default:
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return historySortOrder === 'desc' ? -cmp : cmp;
    });
  }, [allSalesHistory, historySortOrder, servicosSortBy]);

  const filteredSalesHistory = useMemo(() => {
    const fromDate = historyDateFrom ? new Date(historyDateFrom + 'T00:00:00') : null;
    const toDate = historyDateTo ? new Date(historyDateTo + 'T23:59:59') : null;
    const filtered = allSalesHistory.filter(sale => {
      if (!matchesOrderStatusGroup(sale, selectedOrderStatusFilters)) return false;
      if (!matchesPaymentGroup(sale, selectedPaymentFilters)) return false;
      if (!matchesHistorySearch(sale)) return false;
      if (fromDate || toDate) {
        const saleDate = new Date(sale.createdAt);
        if (isNaN(saleDate.getTime())) return false;
        if (fromDate && saleDate < fromDate) return false;
        if (toDate && saleDate > toDate) return false;
      }
      return true;
    });
    // Ordena pela data/hora do pagamento/transacao MAIS RECENTE de cada pedido (nao pela
    // criacao da nota) -- um pagamento lancado as 12:00 fica posicionado exatamente entre
    // um das 11:00 e um das 13:00. Pedidos sem nenhum pagamento lancado (ex: em aberto sem
    // entrada) caem de volta na data de criacao, que e o unico marco temporal que tem.
    const chronoKey = (s: SaleOrder) => {
      const eventos = getRevenueEventsForSale(s);
      if (eventos.length === 0) return new Date(s.createdAt).getTime();
      return Math.max(...eventos.map(ev => new Date(ev.date).getTime()));
    };
    return filtered.sort((a, b) => {
      const diff = chronoKey(b) - chronoKey(a);
      return historySortOrder === 'desc' ? diff : -diff;
    });
  }, [allSalesHistory, selectedOrderStatusFilters, selectedPaymentFilters, historySearch, historyClienteIdFilter, historySortOrder, historyDateFrom, historyDateTo]);

  // Aba "Vendas do Dia": os mesmos pedidos da Visao Geral (respeitando os filtros de status/
  // pagamento/busca ja aplicados), restritos aos CRIADOS hoje -- independente do periodo
  // personalizado escolhido no filtro de data, pra sempre dar uma visao rapida do dia atual.
  const historyVendasDoDia = useMemo(() => {
    const inicioHoje = new Date(); inicioHoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(); fimHoje.setHours(23, 59, 59, 999);
    return allSalesHistory.filter(sale => {
      if (!matchesOrderStatusGroup(sale, selectedOrderStatusFilters)) return false;
      if (!matchesPaymentGroup(sale, selectedPaymentFilters)) return false;
      if (!matchesHistorySearch(sale)) return false;
      const d = new Date(sale.createdAt);
      return !isNaN(d.getTime()) && d >= inicioHoje && d <= fimHoje;
    }).sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return historySortOrder === 'desc' ? diff : -diff;
    });
  }, [allSalesHistory, selectedOrderStatusFilters, selectedPaymentFilters, historySearch, historyClienteIdFilter, historySortOrder]);

  // Aba "Entradas de Caixa": cada RECEBIMENTO individual (nao o pedido inteiro), com a data/hora
  // exata de cada pagamento -- uma nota paga em 2 partes em dias diferentes vira 2 linhas
  // separadas, cada uma na sua propria posicao cronologica real (mesma logica do Extrato de
  // Caixa ja usado na Analise de Performance).
  const historyEntradasCaixa = useMemo(() => {
    const fromDate = historyDateFrom ? new Date(historyDateFrom + 'T00:00:00') : null;
    const toDate = historyDateTo ? new Date(historyDateTo + 'T23:59:59') : null;
    const eventos = allSalesHistory
      .filter(sale => sale.status !== 'canceled')
      .filter(matchesHistorySearch)
      .flatMap(o => getRevenueEventsForSale(o).map(ev => ({ ...ev, saleId: o.id, customerName: o.customerName || 'Cliente de Balc√£o' })))
      .filter(ev => {
        const d = new Date(ev.date);
        if (isNaN(d.getTime())) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    return eventos.sort((a, b) => {
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return historySortOrder === 'desc' ? diff : -diff;
    });
  }, [allSalesHistory, historySearch, historyClienteIdFilter, historyDateFrom, historyDateTo, historySortOrder]);

  // Resumo da Ordem de Servicos: usa o mesmo filtro de periodo (De/Ate) do Historico
  const servicosResumo = useMemo(() => {
    const fromDate = historyDateFrom ? new Date(historyDateFrom + 'T00:00:00') : null;
    const toDate = historyDateTo ? new Date(historyDateTo + 'T23:59:59') : null;
    const noPeriodo = allSalesHistory.filter(sale => {
      if (sale.status === 'canceled') return false;
      const saleDate = new Date(sale.createdAt);
      if (isNaN(saleDate.getTime())) return false;
      if (fromDate && saleDate < fromDate) return false;
      if (toDate && saleDate > toDate) return false;
      return true;
    });

    let faturamento = 0, liquido = 0, custoTotal = 0;
    const comEntrada = { count: 0, total: 0, recebido: 0, pendente: 0 };
    const emAberto = { count: 0, total: 0 };

    noPeriodo.forEach(sale => {
      const down = sale.downPayment || 0;
      const total = sale.total || 0;
      const isFullyPaid = sale.status === 'completed' || down >= total;
      faturamento += total;
      liquido += down;
      // Amortiza o custo pela proporcao efetivamente recebida (down/total) ‚Äî mesma regra de
      // calcularLucroDaVenda, pra nao abater custo que ainda nao foi pago. Custo = so Lona/
      // Adesivo (materia-prima) + custos extras manuais lancados na nota (ver src/lib/lucro.ts).
      const proporcao = (!isFullyPaid && total > 0) ? down / total : undefined;
      custoTotal += custoTotalDaNota({
        items: sale.items,
        custoPorId: produtosCostMap,
        extraCosts: sale.extraCosts,
        proporcao,
      });
      if (down > 0 && !isFullyPaid) {
        comEntrada.count += 1;
        comEntrada.total += total;
        comEntrada.recebido += down;
        comEntrada.pendente += Math.max(0, total - down);
      } else if (down === 0) {
        emAberto.count += 1;
        emAberto.total += total;
      }
    });

    return {
      faturamento, liquido, lucro: liquido - custoTotal,
      temCustoRegistrado: custoTotal > 0,
      comEntrada, emAberto,
    };
  }, [allSalesHistory, historyDateFrom, historyDateTo, produtosCostMap]);

  const handleToggleSelectAll = () => {
    setSelectedSaleIds(prev => {
      if (prev.size === filteredSalesHistory.length && filteredSalesHistory.length > 0) {
        return new Set();
      }
      return new Set(filteredSalesHistory.map(s => s.id));
    });
  };

  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const handleBulkDeleteSales = async () => {
    if (selectedSaleIds.size === 0) return;
    setIsBulkDeleteConfirmOpen(true);
  };
  const confirmBulkDeleteSales = async () => {
    const ids = Array.from(selectedSaleIds);
    const { error } = await supabase.from('vendas').update({ deleted_at: new Date().toISOString() }).in('id', ids);
    setIsBulkDeleteConfirmOpen(false);
    if (error) { console.error(error); showAlert('N√£o foi poss√≠vel excluir as vendas selecionadas.'); return; }
    setSelectedSaleIds(new Set());
  };

  const handleBulkMarkAsPaid = async () => {
    if (selectedSaleIds.size === 0) return;
    if (!(await showConfirm(`Marcar ${selectedSaleIds.size} venda(s) selecionada(s) como paga/quitada (100% recebido)?`))) return;
    const ids = Array.from(selectedSaleIds);
    const vendasSelecionadas = filteredSalesHistory.filter(s => ids.includes(s.id));
    for (const s of vendasSelecionadas) {
      await supabase.from('vendas').update({ down_payment: s.total, received_value: s.total, status: 'completed' }).eq('id', s.id);
    }
    showAlert(`${vendasSelecionadas.length} venda(s) marcada(s) como paga(s)!`);
    setSelectedSaleIds(new Set());
    loadSalesHistory();
  };

  const handleBulkClose = async () => {
    if (selectedSaleIds.size === 0) return;
    if (!(await showConfirm(`Fechar (finalizar) ${selectedSaleIds.size} venda(s) selecionada(s)? Elas v√£o sair da lista de abertas.`))) return;
    const ids = Array.from(selectedSaleIds);
    const { error } = await supabase.from('vendas').update({ status: 'completed' }).in('id', ids);
    if (error) { console.error(error); showAlert('N√£o foi poss√≠vel fechar as vendas selecionadas.'); return; }
    showAlert(`${ids.length} venda(s) fechada(s)!`);
    setSelectedSaleIds(new Set());
    loadSalesHistory();
  };

  // Edicao em massa: so aplica os campos que o usuario marcar, pra nao sobrescrever nada sem querer
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditFields, setBulkEditFields] = useState({
    paymentMethod: { on: false, value: 'pix' as string },
    scheduledFor: { on: false, value: '' },
    serviceStatus: { on: false, value: 'pedido_recebido' as string },
    observacoes: { on: false, value: '' },
  });
  const [isSavingBulkEdit, setIsSavingBulkEdit] = useState(false);

  const handleOpenBulkEdit = () => {
    if (selectedSaleIds.size === 0) return;
    setBulkEditFields({
      paymentMethod: { on: false, value: 'pix' },
      scheduledFor: { on: false, value: '' },
      serviceStatus: { on: false, value: 'pedido_recebido' },
      observacoes: { on: false, value: '' },
    });
    setIsBulkEditOpen(true);
  };

  const handleSaveBulkEdit = async () => {
    const camposAtivos = bulkEditFields.paymentMethod.on || bulkEditFields.scheduledFor.on || bulkEditFields.serviceStatus.on || bulkEditFields.observacoes.on;
    if (!camposAtivos) { showAlert('Marque pelo menos um campo pra alterar.'); return; }
    if (!(await showConfirm(`Aplicar essas altera√ß√µes em ${selectedSaleIds.size} venda(s) selecionada(s)?`))) return;
    setIsSavingBulkEdit(true);
    const payload: Record<string, any> = {};
    if (bulkEditFields.paymentMethod.on) payload.payment_method = bulkEditFields.paymentMethod.value;
    if (bulkEditFields.scheduledFor.on) payload.scheduled_for = localDatetimeToIso(bulkEditFields.scheduledFor.value);
    if (bulkEditFields.serviceStatus.on) payload.service_status = bulkEditFields.serviceStatus.value;
    if (bulkEditFields.observacoes.on) payload.observacoes = bulkEditFields.observacoes.value || null;
    const ids = Array.from(selectedSaleIds);
    const { error } = await supabase.from('vendas').update(payload).in('id', ids);
    setIsSavingBulkEdit(false);
    if (error) { console.error(error); showAlert('N√£o foi poss√≠vel salvar as altera√ß√µes em massa.'); return; }
    showAlert(`${ids.length} venda(s) atualizada(s) com sucesso!`);
    setIsBulkEditOpen(false);
    setSelectedSaleIds(new Set());
    loadSalesHistory();
  };
  const [settleModalOrder, setSettleModalOrder] = useState<SaleOrder | null>(null);
  const [settleMethod, setSettleMethod] = useState<'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito'>('pix');
  const [isWhatsAppFormOpen, setIsWhatsAppFormOpen] = useState(false);
  const [waFormName, setWaFormName] = useState('');
  const [waFormCountry, setWaFormCountry] = useState({ code: '+55', flag: 'üáßüá∑', name: 'Brasil' });
  const [waFormPhone, setWaFormPhone] = useState('');
  const [isWaSaving, setIsWaSaving] = useState(false);
  const WA_COUNTRIES = [
    { code: '+55', flag: 'üáßüá∑', name: 'Brasil' },
    { code: '+1', flag: 'üá∫üá∏', name: 'Estados Unidos' },
    { code: '+351', flag: 'üáµüáπ', name: 'Portugal' },
    { code: '+54', flag: 'üá¶üá∑', name: 'Argentina' },
    { code: '+595', flag: 'üáµüáæ', name: 'Paraguai' },
    { code: '+598', flag: 'üá∫üáæ', name: 'Uruguai' },
  ];

  const buildOrderShareMessage = (order: SaleOrder, customerName: string) => {
    const total = order.total;
    const down = order.downPayment ?? order.receivedValue ?? (order.status === 'completed' ? total : 0);
    const balance = Math.max(0, total - down);
    const isPending = balance > 0 || order.status === 'pending';
    const itemsText = order.items.map(i => `‚Ä¢ ${i.quantity}x ${i.name} (R$ ${((i.area ? i.price * i.area : i.price) * i.quantity).toFixed(2).replace('.', ',')})`).join('\n');
    const deliveryStr = order.scheduledFor ? `\nüìÖ *Previs√£o de Entrega:* ${safeFormat(order.scheduledFor, 'dd/MM/yyyy HH:mm')}` : '';
    return `Ol√° *${customerName || 'Cliente'}*!\n\nSegue resumo do seu pedido *#${order.id.slice(-8).toUpperCase()}* na *${currentCompany?.name || 'Rafa Arts Graphics'}*:\n\n${itemsText}\n\nüí∞ *Total do Pedido:* R$ ${total.toFixed(2).replace('.', ',')}\n‚úÖ *Valor Recebido (Entrada):* R$ ${down.toFixed(2).replace('.', ',')}${isPending ? `\nüî¥ *Valor que Falta Pagar:* R$ ${balance.toFixed(2).replace('.', ',')}` : '\nüéâ *Status:* 100% Quitado'}${deliveryStr}\n\nObrigado pela prefer√™ncia!`;
  };

  // Acha (ou cria) o lead correspondente ao telefone no Funil de Atendimento,
  // deixa a conversa selecionada com a mensagem pronta para enviar.
  // Delega pra funcao central do AppContext (openWhatsAppChat) -- assim todo botao de
  // WhatsApp do sistema (Contratos, Orcamentos, Contatos, Ficha do Cliente etc.) passa pelo
  // mesmo ponto unico, pronto pra quando a integracao de envio real for plugada.
  const findOrCreateLeadAndOpenChat = async (phoneDigits: string, name: string, prefillMessage: string) => {
    await openWhatsAppChat(phoneDigits, name, prefillMessage);
    setIsSuccessModalOpen(false);
  };

  const handleShareViaWhatsApp = async (order: SaleOrder, customerName: string, phone: string) => {
    const digits = phone.replace(/\D/g, '');
    const message = buildOrderShareMessage(order, customerName);
    await findOrCreateLeadAndOpenChat(digits, customerName, message);
  };

  const handleSaveWhatsAppCustomer = async () => {
    const digits = waFormPhone.replace(/\D/g, '');
    if (!waFormName.trim() || digits.length < 8) {
      showAlert('Preencha o nome e um n√∫mero de WhatsApp v√°lido.');
      return;
    }
    setIsWaSaving(true);
    try {
      const fullPhone = `${waFormCountry.code} ${waFormPhone}`.trim();
      // Salva/atualiza o cliente no Supabase
      let customerId = selectedCustomer?.id;
      if (customerId) {
        await supabase.from('clientes').update({ phone: fullPhone }).eq('id', customerId);
      } else {
        const { data: inserted, error: insertErr } = await supabase.from('clientes').insert({ full_name: waFormName, phone: fullPhone }).select().single();
        if (insertErr) throw insertErr;
        customerId = inserted?.id;
      }
      setSelectedCustomer({ id: customerId || '', name: waFormName, phone: fullPhone });
      setIsWhatsAppFormOpen(false);
      if (lastFinalizedOrder) {
        const message = buildOrderShareMessage(lastFinalizedOrder, waFormName);
        await findOrCreateLeadAndOpenChat(`${waFormCountry.code.replace('+', '')}${digits}`, waFormName, message);
      }
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      showAlert('N√£o foi poss√≠vel salvar o cliente.');
    } finally {
      setIsWaSaving(false);
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [pixConfig, setPixConfig] = useState<{ key: string; keyType?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'; beneficiaryName: string; city: string; bank?: string } | null>(null);
  const [isPixQrModalOpen, setIsPixQrModalOpen] = useState(false);
  const [logoDarkUrl, setLogoDarkUrl] = useState<string | null>(null);
  const [companyContact, setCompanyContact] = useState<CompanyContactInfo>(COMPANY_CONTACT);
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<string[]>(['pix', 'dinheiro', 'cartao_credito', 'cartao_debito']);
  const [creditCardFees, setCreditCardFees] = useState<{ installments: number; feePercent: number }[]>(
    Array.from({ length: 12 }, (_, i) => ({ installments: i + 1, feePercent: 0 }))
  );
  const [debitCardFeePercent, setDebitCardFeePercent] = useState(0);
  const [newPaymentInstallments, setNewPaymentInstallments] = useState(1);
  const canManageHistory = !!(user?.isAdmin || user?.allowedActions?.includes('canManageSaleHistory'));
  const [editingSale, setEditingSale] = useState<SaleOrder | null>(null);
  const [editSaleForm, setEditSaleForm] = useState({ customerName: '', total: 0, downPayment: 0, paymentMethod: 'pix', observacoes: '', scheduledFor: '' });

  const handleReopenSale = async (sale: SaleOrder) => {
    if (!(await showConfirm(`Reabrir a venda #${sale.id.slice(-8).toUpperCase()}? Ela voltar√° a aparecer como pendente.`))) return;
    const { error } = await supabase.from('vendas').update({ status: 'pending' }).eq('id', sale.id);
    if (error) { console.error(error); showAlert('N√£o foi poss√≠vel reabrir a venda.'); }
  };

  const handleCancelSale = async (sale: SaleOrder) => {
    if (!(await showConfirm(`Cancelar o pedido de ${sale.customerName || 'cliente'} (R$ ${sale.total.toFixed(2).replace('.', ',')})? Ele deixa de contar como venda ativa, mas continua no hist√≥rico marcado como cancelado.`))) return;
    const { error } = await supabase.from('vendas').update({ status: 'canceled' }).eq('id', sale.id);
    if (error) { showAlert(`N√£o foi poss√≠vel cancelar o pedido: ${error.message}`); return; }
    const atualizado = { ...sale, status: 'canceled' as const };
    setAllSalesHistory(prev => prev.map(s => s.id === sale.id ? atualizado : s));
    setSalesToday(prev => prev.map(s => s.id === sale.id ? atualizado : s));
    showAlert('Pedido cancelado!');
  };

  // Abre a nota inteira no Terminal de Vendas pra editar os itens do carrinho, com o cliente ja
  // preenchido (nao precisa escolher de novo). Ao avancar, vai pro pagamento e ATUALIZA a nota
  // existente em vez de criar uma nova.
  const handleStartFullEdit = (sale: SaleOrder) => {
    setEditingFullOrder(sale);
    setCart(sale.items ? [...sale.items] : []);
    setSelectedCustomer(
      sale.customerId
        ? { id: sale.customerId, name: sale.customerName || 'Cliente', phone: sale.customerPhone || '' }
        : (sale.customerName ? { id: '', name: sale.customerName, phone: sale.customerPhone || '' } : null)
    );
    setOrderObservacoes(sale.observacoes || '');
    setScheduledFor(sale.scheduledFor ? isoToLocalDatetimeInput(sale.scheduledFor) : '');
    setSaleDiscountValue(sale.discountValue || 0);
    setSaleDiscountInput('');
    setEditingCreatedAt(sale.createdAt ? isoToLocalDatetimeInput(sale.createdAt) : '');
    setEditingPaymentsList(sale.payments ? sale.payments.map(p => ({ ...p })) : []);
    setActiveTab('venda');
  };

  const startEditSale = (sale: SaleOrder) => {
    setEditingSale(sale);
    setEditSaleForm({
      customerName: sale.customerName || '',
      total: sale.total,
      downPayment: sale.downPayment || 0,
      paymentMethod: sale.paymentMethod || 'pix',
      observacoes: sale.observacoes || '',
      scheduledFor: sale.scheduledFor ? isoToLocalDatetimeInput(sale.scheduledFor) : '',
    });
  };

  const handleSaveEditSale = async () => {
    if (!editingSale) return;
    // Zerar/remover a entrada (cliente reaver o dinheiro e quitar so na retirada) precisa:
    // 1) limpar o registro financeiro vinculado (lista de pagamentos e valor recebido), senao
    //    o caixa continua contando um pagamento que na pratica foi estornado;
    // 2) reverter o status de "Quitado"/"completed" pra "Aberto"/"pending" imediatamente.
    const novoDownPayment = editSaleForm.downPayment || 0;
    const entradaZeradaOuVazia = novoDownPayment <= 0;
    // Se o novo valor de entrada ficou menor que a soma dos pagamentos individuais ja
    // lancados, esse formulario simples (sem lista editavel por pagamento) nao tem como saber
    // qual pagamento especifico foi reduzido/excluido ‚Äî entao limpa o array pra nao deixar o
    // caixa somando um valor de pagamentos maior do que a entrada informada (dessincronizado).
    const somaPagamentosExistentes = (editingSale.payments || []).reduce((sum, p) => sum + (p.value || 0), 0);
    const limparPagamentos = entradaZeradaOuVazia || novoDownPayment < somaPagamentosExistentes;
    const novoStatus: 'completed' | 'pending' = novoDownPayment >= editSaleForm.total && editSaleForm.total > 0 ? 'completed' : 'pending';

    // Se o total foi alterado nessa tela, os itens (items[].price) precisam ser reajustados
    // proporcionalmente ‚Äî sen√£o o pre√ßo de cada item (inclusive os por metro/m¬≤, onde o pre√ßo
    // j√° √â o valor total do item) fica desatualizado e a aba Comiss√µes (que le item.price, n√£o
    // o total da venda) continua puxando o valor antigo pro colaborador.
    const totalMudou = Number(editSaleForm.total) !== Number(editingSale.total);
    const itemTotal = (item: SaleOrderItem) => (item.price ?? 0) * (item.area ? item.area : 1) * (item.quantity ?? 1);
    const brutoAtual = (editingSale.items || []).reduce((sum, item) => sum + itemTotal(item), 0);
    const itemsAtualizados: SaleOrderItem[] =
      totalMudou && brutoAtual > 0
        ? (editingSale.items || []).map((item) => {
            const fator = editSaleForm.total / brutoAtual;
            return { ...item, price: Number(((item.price ?? 0) * fator).toFixed(2)) };
          })
        : (editingSale.items || []);

    const { data, error } = await supabase.from('vendas').update({
      customer_name: editSaleForm.customerName,
      total: editSaleForm.total,
      items: itemsAtualizados,
      down_payment: novoDownPayment,
      received_value: novoDownPayment,
      payments: limparPagamentos ? [] : (editingSale.payments || []),
      pending_payment_method: entradaZeradaOuVazia ? null : (editingSale.pendingPaymentMethod || null),
      payment_method: editSaleForm.paymentMethod,
      observacoes: editSaleForm.observacoes || null,
      scheduled_for: localDatetimeToIso(editSaleForm.scheduledFor),
      status: novoStatus,
    }).eq('id', editingSale.id).select();
    if (error) { console.error(error); showAlert('N√£o foi poss√≠vel salvar as altera√ß√µes.'); return; }
    if (!data || data.length === 0) { showAlert('Nada foi salvo ‚Äî o pedido pode ter sido removido ou alterado por outra pessoa. Feche e abra a tela de novo.'); return; }
    const atualizado: SaleOrder = {
      ...editingSale,
      customerName: editSaleForm.customerName,
      total: editSaleForm.total,
      items: itemsAtualizados,
      downPayment: novoDownPayment,
      receivedValue: novoDownPayment,
      payments: limparPagamentos ? [] : (editingSale.payments || []),
      pendingPaymentMethod: entradaZeradaOuVazia ? undefined : editingSale.pendingPaymentMethod,
      paymentMethod: editSaleForm.paymentMethod as any,
      observacoes: editSaleForm.observacoes || undefined,
      scheduledFor: localDatetimeToIso(editSaleForm.scheduledFor) || undefined,
      status: novoStatus,
    };
    setAllSalesHistory(prev => prev.map(s => s.id === editingSale.id ? atualizado : s));
    setSalesToday(prev => prev.map(s => s.id === editingSale.id ? atualizado : s));
    setEditingSale(null);
    loadSalesHistory();
  };

  const handleUpdateServiceStatus = async (saleId: string, newStatus: string) => {
    await syncServiceStatus('venda', saleId, newStatus);
    // Atualizar estado local ap√≥s sincroniza√ß√£o
    setViewingReceiptSale(prev => prev && prev.id === saleId ? { ...prev, serviceStatus: newStatus as any } : prev);
    setLastFinalizedOrder(prev => prev && prev.id === saleId ? { ...prev, serviceStatus: newStatus as any } : prev);
    setAllSalesHistory(prev => prev.map(s => s.id === saleId ? { ...s, serviceStatus: newStatus as any } : s));
    setSalesToday(prev => prev.map(s => s.id === saleId ? { ...s, serviceStatus: newStatus as any } : s));
  };

  // Botao unico de status (aba Servicos): em vez de duas setas (avancar/retroceder), um clique
  // avanca pra proxima etapa ‚Äî e ao chegar na ultima ("Produto Entregue"), o proximo clique volta
  // pro inicio ("Pedido Recebido"), igual um ciclo.
  const handleCycleServiceStatus = (saleId: string, currentStage: string) => {
    const idx = STAGE_ORDER.indexOf(currentStage);
    const nextIdx = idx >= 0 && idx < STAGE_ORDER.length - 1 ? idx + 1 : 0;
    handleUpdateServiceStatus(saleId, STAGE_ORDER[nextIdx]);
  };

  const handleDeleteSale = async (sale: SaleOrder) => {
    if (!(await showConfirm(`Excluir a venda #${sale.id.slice(-8).toUpperCase()} (R$ ${sale.total.toFixed(2)})? Ela fica 30 dias na aba Exclu√≠dos antes de sumir de vez ‚Äî voc√™ pode restaurar dentro desse prazo.`))) return;
    const { error } = await supabase.from('vendas').update({ deleted_at: new Date().toISOString() }).eq('id', sale.id);
    if (error) { console.error(error); showAlert('N√£o foi poss√≠vel excluir a venda.'); }
  };

  const handleRestoreSale = async (sale: SaleOrder) => {
    if (!(await showConfirm(`Restaurar a venda de ${sale.customerName || 'cliente'} (R$ ${sale.total.toFixed(2)})?`))) return;
    const { error } = await supabase.from('vendas').update({ deleted_at: null }).eq('id', sale.id);
    if (error) { console.error(error); showAlert('N√£o foi poss√≠vel restaurar a venda.'); return; }
    loadDeletedSales();
  };

  const handlePermanentDeleteSale = async (sale: SaleOrder) => {
    if (!(await showConfirm(`Excluir DEFINITIVAMENTE a venda #${sale.id.slice(-8).toUpperCase()}? Essa a√ß√£o n√£o pode ser desfeita.`))) return;
    const { error } = await supabase.from('vendas').delete().eq('id', sale.id);
    if (error) { console.error(error); showAlert('N√£o foi poss√≠vel excluir.'); return; }
    loadDeletedSales();
  };

  const [deletedSales, setDeletedSales] = useState<SaleOrder[]>([]);
  const [isLoadingDeletedSales, setIsLoadingDeletedSales] = useState(false);

  const loadDeletedSales = async () => {
    setIsLoadingDeletedSales(true);
    try {
      // Purga automatica: excluidas ha mais de 30 dias somem de vez
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      await supabase.from('vendas').delete().not('deleted_at', 'is', null).lt('deleted_at', cutoff.toISOString());

      const { data } = await supabase.from('vendas').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
      setDeletedSales((data || []).map(mapVendaRow));
    } catch (err) {
      console.error('Erro ao carregar exclu√≠dos:', err);
    } finally {
      setIsLoadingDeletedSales(false);
    }
  };

  // ===== Or√ßamentos e Contratos exclu√≠dos (mesmo padr√£o de restaura√ß√£o das Vendas) =====
  const [deletedOrcamentos, setDeletedOrcamentos] = useState<Orcamento[]>([]);
  const [isLoadingDeletedOrcamentos, setIsLoadingDeletedOrcamentos] = useState(false);

  const loadDeletedOrcamentos = async () => {
    setIsLoadingDeletedOrcamentos(true);
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      await supabase.from('orcamentos').delete().not('deleted_at', 'is', null).lt('deleted_at', cutoff.toISOString());

      const { data } = await supabase.from('orcamentos').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
      setDeletedOrcamentos((data || []).map(mapOrcamentoRow));
    } catch (err) {
      console.error('Erro ao carregar or√ßamentos exclu√≠dos:', err);
    } finally {
      setIsLoadingDeletedOrcamentos(false);
    }
  };

  const handleRestoreOrcamento = async (o: Orcamento) => {
    if (!(await showConfirm(`Restaurar o or√ßamento ${o.numero}?`))) return;
    const { error } = await supabase.from('orcamentos').update({ deleted_at: null }).eq('id', o.id);
    if (error) { showAlert('N√£o foi poss√≠vel restaurar o or√ßamento.'); return; }
    loadDeletedOrcamentos();
  };

  const handlePermanentDeleteOrcamento = async (o: Orcamento) => {
    if (!(await showConfirm(`Excluir DEFINITIVAMENTE o or√ßamento ${o.numero}? Essa a√ß√£o n√£o pode ser desfeita.`))) return;
    const { error } = await supabase.from('orcamentos').delete().eq('id', o.id);
    if (error) { showAlert('N√£o foi poss√≠vel excluir.'); return; }
    loadDeletedOrcamentos();
  };

  const [deletedContratos, setDeletedContratos] = useState<Contrato[]>([]);
  const [isLoadingDeletedContratos, setIsLoadingDeletedContratos] = useState(false);

  const loadDeletedContratos = async () => {
    setIsLoadingDeletedContratos(true);
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      // Antes de purgar de vez, pega quais Notas estao vinculadas pra soltar o vinculo delas ‚Äî
      // senao a Nota fica apontando pra um contrato que nem existe mais no banco
      const { data: expirando } = await supabase.from('contratos').select('id, venda_id').not('deleted_at', 'is', null).lt('deleted_at', cutoff.toISOString());
      await supabase.from('contratos').delete().not('deleted_at', 'is', null).lt('deleted_at', cutoff.toISOString());
      const vendaIdsParaSoltar = (expirando || []).map((c: any) => c.venda_id).filter(Boolean);
      if (vendaIdsParaSoltar.length > 0) {
        await supabase.from('vendas').update({ contrato_id: null }).in('id', vendaIdsParaSoltar);
      }

      const { data } = await supabase.from('contratos').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
      setDeletedContratos((data || []).map(mapContratoRow));
    } catch (err) {
      console.error('Erro ao carregar contratos exclu√≠dos:', err);
    } finally {
      setIsLoadingDeletedContratos(false);
    }
  };

  const handleRestoreContrato = async (c: Contrato) => {
    if (!(await showConfirm(`Restaurar o contrato ${c.numero}?`))) return;
    const { error } = await supabase.from('contratos').update({ deleted_at: null }).eq('id', c.id);
    if (error) { showAlert('N√£o foi poss√≠vel restaurar o contrato.'); return; }
    // Devolve o vinculo na Nota (foi solto na exclusao), so se ela ainda nao foi religada a
    // outro contrato nesse meio tempo
    if (c.vendaId) {
      const { data: venda } = await supabase.from('vendas').select('contrato_id').eq('id', c.vendaId).maybeSingle();
      if (venda && !venda.contrato_id) {
        await supabase.from('vendas').update({ contrato_id: c.id }).eq('id', c.vendaId);
        setAllSalesHistory(prev => prev.map(s => s.id === c.vendaId ? { ...s, contratoId: c.id } as SaleOrder : s));
      }
    }
    loadDeletedContratos();
  };

  const handlePermanentDeleteContrato = async (c: Contrato) => {
    if (!(await showConfirm(`Excluir DEFINITIVAMENTE o contrato ${c.numero}? Essa a√ß√£o n√£o pode ser desfeita.`))) return;
    const { error } = await supabase.from('contratos').delete().eq('id', c.id);
    if (error) { showAlert('N√£o foi poss√≠vel excluir.'); return; }
    // Mesma limpeza do soft-delete: se a Nota ainda estava com o vinculo (ex: contrato excluido
    // antes da correcao, ou restaurado e apagado de novo), solta aqui tambem
    if (c.vendaId) {
      await supabase.from('vendas').update({ contrato_id: null }).eq('id', c.vendaId).eq('contrato_id', c.id);
    }
    loadDeletedContratos();
  };

  // Limpar vendas √≥rf√£s: vendas que referenciavam contratos j√° deletados
  const cleanupOrphanedSales = async () => {
    if (!(await showConfirm('Isso vai marcar como deletadas todas as vendas que perderam seu contrato (contrato foi exclu√≠do). Continuar?'))) return;
    try {
      // Busca vendas com contrato_id que n√£o existe mais (contrato deletado ou inexistente)
      const { data: allVendas } = await supabase.from('vendas').select('id, contrato_id').is('deleted_at', null);
      const { data: allContratos } = await supabase.from('contratos').select('id').is('deleted_at', null);
      const validContratoIds = new Set((allContratos || []).map((c: any) => c.id));
      const orphanedIds = (allVendas || [])
        .filter((v: any) => v.contrato_id && !validContratoIds.has(v.contrato_id))
        .map((v: any) => v.id);
      
      if (orphanedIds.length === 0) {
        showAlert('Nenhuma venda √≥rf√£ encontrada. ‚úì');
        return;
      }
      
      const now = new Date().toISOString();
      const { error } = await supabase.from('vendas').update({ deleted_at: now }).in('id', orphanedIds);
      if (error) { showAlert(`Erro ao limpar: ${error.message}`); return; }
      
      showAlert(`‚úì ${orphanedIds.length} venda(s) √≥rf√£(s) marcada(s) como deletada(s)`);
      loadSalesHistory();
    } catch (err) {
      showAlert(`Erro: ${err}`);
    }
  };

  useEffect(() => {
    if (activeTab === 'excluidos') { loadDeletedSales(); loadDeletedOrcamentos(); loadDeletedContratos(); }
  }, [activeTab]);

  const loadSalesHistory = async () => {
    const { data } = await supabase.from('vendas').select('*').is('deleted_at', null);
    const allSales = (data || []).map(mapVendaRow);
    // Ordena pela atividade mais recente ‚Äî criacao OU ultima edicao, o que for mais novo. Assim
    // uma nota antiga que acabou de ser editada (ex: pagamento lancado) sobe pro topo da lista.
    const ultimaAtividade = (s: SaleOrder) => Math.max(new Date(s.createdAt).getTime(), s.updatedAt ? new Date(s.updatedAt).getTime() : 0);
    allSales.sort((a, b) => ultimaAtividade(b) - ultimaAtividade(a));
    setAllSalesHistory(allSales);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todaySales = allSales.filter(sale => {
      const d = new Date(sale.createdAt);
      return d >= startOfDay;
    });
    setSalesToday(todaySales);
  };

  useEffect(() => {
    if (!currentCompany) return;
    loadSalesHistory();
    const channel = supabase.channel('pos-vendas').on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, loadSalesHistory).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('configuracoes').select('*').eq('company_id', 'rafa-arts').maybeSingle();
      setLogoDarkUrl(data?.logo_dark_url || null);
      setCompanyContact({
        whatsapp: data?.contact_whatsapp || COMPANY_CONTACT.whatsapp,
        instagram: data?.contact_instagram || COMPANY_CONTACT.instagram,
        facebook: data?.contact_facebook || COMPANY_CONTACT.facebook,
        email: data?.contact_email || COMPANY_CONTACT.email,
        site: data?.contact_site || COMPANY_CONTACT.site,
        siteUrl: data?.contact_site ? (data.contact_site.startsWith('http') ? data.contact_site : `https://${data.contact_site}`) : COMPANY_CONTACT.siteUrl,
        endereco: data?.contact_endereco || COMPANY_CONTACT.endereco,
      });
      setEnabledPaymentMethods(Array.isArray(data?.enabled_payment_methods) && data.enabled_payment_methods.length > 0 ? data.enabled_payment_methods : ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito']);
      if (Array.isArray(data?.credit_card_fees) && data.credit_card_fees.length > 0) {
        const byInstallment: Record<number, number> = {};
        data.credit_card_fees.forEach((f: any) => { byInstallment[f.installments] = f.feePercent; });
        setCreditCardFees(Array.from({ length: 12 }, (_, i) => ({ installments: i + 1, feePercent: byInstallment[i + 1] ?? 0 })));
      }
      setDebitCardFeePercent(Number(data?.debit_card_fee_percent) || 0);
      if (data && data.pix_key) {
        setPixConfig({
          key: data.pix_key,
          keyType: data.pix_key_type || undefined,
          beneficiaryName: data.beneficiary_name || currentCompany?.name || 'RAFA ARTS GRAPHICS',
          city: data.city || 'Santarem',
          bank: data.pix_bank || '',
        });
      } else {
        setPixConfig(null);
      }
    };
    load();
    const channel = supabase
      .channel('pos-configuracoes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany]);

  const handleSettleBalance = async (order: SaleOrder) => {
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

      showAlert(`Saldo de R$ ${balanceToSettle.toFixed(2).replace('.', ',')} quitado com sucesso!\nA venda/servi√ßo foi totalmente quitada.`);
      setSettleModalOrder(null);
    } catch (err) {
      console.error('Erro ao quitar saldo:', err);
      showAlert('Erro ao quitar saldo do pedido.');
    }
  };

  const [products, setProducts] = useState<Product[]>([]);
  const loadProducts = async () => {
    const { data } = await supabase.from('produtos').select('*').order('name', { ascending: true });
    setProducts((data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      code: p.code || '',
      price: Number(p.sale_price) || 0,
      stock: Number(p.current_stock) || 0,
      unitType: p.unit === 'm2' ? 'm2' : p.unit === 'etiqueta' ? 'etiqueta' : p.unit === 'm' ? 'metro' : 'unit',
      tipoItem: p.tipo_item || 'produto',
      larguraRolo: p.largura_rolo ? Number(p.largura_rolo) : undefined,
      controlaEstoque: p.controla_estoque !== false,
      valorMinimo: p.valor_minimo ? Number(p.valor_minimo) : undefined,
    })));
  };
  useEffect(() => {
    loadProducts();
    const channel = supabase
      .channel('pos-produtos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, loadProducts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Cadastro rapido de produto direto pelo Terminal de Venda (mesma tabela do Estoque)
  const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);
  const [quickProductAddToOrcamento, setQuickProductAddToOrcamento] = useState(false);
  const [isSavingQuickProduct, setIsSavingQuickProduct] = useState(false);
  const emptyQuickProductForm = {
    name: '', code: '', category: '', unit: 'un' as 'un' | 'm2' | 'etiqueta', costPrice: 0, salePrice: 0, currentStock: 0,
    tipoItem: 'produto' as 'produto' | 'material' | 'servico' | 'acabamento' | 'composto',
    controlaEstoque: true, minStock: 0, estoqueMaximo: 0, localizacao: '', descricao: '', larguraRolo: 0,
  };
  const [quickProductForm, setQuickProductForm] = useState({ ...emptyQuickProductForm });

  const handleSaveQuickProduct = async () => {
    if (!quickProductForm.name.trim()) { showAlert('Digite o nome do produto.'); return; }
    setIsSavingQuickProduct(true);
    try {
      const { data, error } = await supabase.from('produtos').insert({
        name: quickProductForm.name,
        code: quickProductForm.code || null,
        category: quickProductForm.category || null,
        unit: quickProductForm.unit,
        cost_price: quickProductForm.costPrice || 0,
        sale_price: quickProductForm.salePrice || 0,
        current_stock: quickProductForm.currentStock || 0,
        is_active: true,
        tipo_item: quickProductForm.tipoItem,
        controla_estoque: quickProductForm.controlaEstoque,
        min_stock: quickProductForm.minStock || 0,
        estoque_maximo: quickProductForm.estoqueMaximo || null,
        localizacao: quickProductForm.localizacao || null,
        descricao: quickProductForm.descricao || null,
        largura_rolo: quickProductForm.larguraRolo || null,
      }).select().single();
      if (error) throw error;
      await loadProducts();

      // Se veio do orcamento, adiciona o produto recem criado direto nos itens do orcamento
      // e permanece na mesma tela do orcamento (nao navega pra Terminal Venda)
      if (quickProductAddToOrcamento && data) {
        setOrcamentoForm(prev => ({
          ...prev,
          items: [...prev.items, { productId: data.id, name: data.name, price: Number(data.sale_price) || 0, quantity: 1 }],
        }));
        setQuickProductAddToOrcamento(false);
      }

      setIsQuickProductOpen(false);
      setQuickProductForm({ ...emptyQuickProductForm });
      // Permanece na aba/tela onde o usuario estava (Terminal Venda ou Orcamentos)
    } catch (err: any) {
      console.error('Erro ao cadastrar produto:', err);
      showAlert(`N√£o foi poss√≠vel cadastrar: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setIsSavingQuickProduct(false);
    }
  };


  const addToCart = (product: Product) => {
    if (product.unitType === 'm2' && product.name.toUpperCase().includes('INSULFILM')) {
      setInsulfilmModalProduct(product);
      setInsulfilmLarguraMaterial(product.larguraRolo || 1.5);
      setInsulfilmPecas([{ id: 'p1', largura: 0, altura: 0 }]);
      return;
    }
    if (product.unitType === 'm2' || product.unitType === 'metro') {
      setDimensionModalProduct(product);
      setDimWidth('');
      setDimHeight('');
      setDimLarguraMaterial(product.larguraRolo || 0);
      setDimValorOverride('');
      setDimValorFoiEditado(false);
      return;
    }
    if (product.unitType === 'etiqueta') {
      setEtiquetaModalProduct(product);
      setEtiquetaForm({ ...emptyEtiquetaForm, larguraMaterial: product.larguraRolo || 1.02 });
      setEtiquetaInputMode('quantidade');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && !item.dimensions);
      if (existing) {
        return prev.map(item => (item.productId === product.id && !item.dimensions)
          ? { ...item, quantity: item.quantity + selectedQty }
          : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: selectedQty,
      }];
    });
    setSelectedQty(1);
  };

  const calcularEtiquetas = (product: Product) => {
    const { largura, altura, larguraMaterial } = etiquetaForm;
    const larguraRoloCm = (larguraMaterial || product.larguraRolo || 1) * 100;
    if (largura <= 0 || altura <= 0 || larguraRoloCm <= 0) return null;

    // Quantas etiquetas cabem por metro linear do material, testando as duas orientacoes
    // (normal e rotacionada 90 graus) e usando a que da mais unidades por metro (melhor aproveitamento).
    // IMPORTANTE: tanto as colunas (largura) quanto as linhas (por metro de comprimento) sao
    // arredondadas pra baixo ‚Äî nao da pra imprimir etiqueta fracionada, entao 100/8=12,5 vira 12, nao 12,5.
    const porFileiraA = Math.max(1, Math.floor(larguraRoloCm / largura));
    const linhasPorMetroA = Math.max(1, Math.floor(100 / altura));
    const unidadesPorMetroA = porFileiraA * linhasPorMetroA;

    const porFileiraB = Math.max(1, Math.floor(larguraRoloCm / altura));
    const linhasPorMetroB = Math.max(1, Math.floor(100 / largura));
    const unidadesPorMetroB = porFileiraB * linhasPorMetroB;

    const usarB = unidadesPorMetroB > unidadesPorMetroA;
    const porFileira = usarB ? porFileiraB : porFileiraA;
    const alturaEfetiva = usarB ? largura : altura; // dimensao que determina o comprimento gasto do material por linha

    // Regra de 3: a partir do campo que o usuario preencheu (quantidade, metros ou valor),
    // calcula os outros dois automaticamente
    let quantidade: number;
    let metrosLineares: number;
    const IMPRESSAO_MINIMA = product.valorMinimo ?? 30;

    if (etiquetaInputMode === 'metros') {
      metrosLineares = etiquetaForm.metrosInput;
      if (metrosLineares <= 0) return null;
      const linhas = Math.floor((metrosLineares * 100) / alturaEfetiva);
      quantidade = linhas * porFileira;
    } else if (etiquetaInputMode === 'valor') {
      const valorInput = etiquetaForm.valorInput;
      if (valorInput <= 0 || product.price <= 0) return null;
      metrosLineares = valorInput / product.price;
      const linhas = Math.floor((metrosLineares * 100) / alturaEfetiva);
      quantidade = linhas * porFileira;
    } else {
      quantidade = etiquetaForm.quantidade;
      if (quantidade <= 0) return null;
      const fileiras = Math.ceil(quantidade / porFileira);
      metrosLineares = (fileiras * alturaEfetiva) / 100;
    }

    const valorCalculado = metrosLineares * product.price;
    const valorFinal = Math.max(valorCalculado, IMPRESSAO_MINIMA);
    const fileiras = Math.ceil(quantidade / porFileira);

    return { porFileira, fileiras, metrosLineares, valorCalculado, valorFinal, rotacionada: usarB, quantidade, unidadesPorMetro: usarB ? unidadesPorMetroB : unidadesPorMetroA };
  };

  const confirmAddEtiquetaItem = async () => {
    if (!etiquetaModalProduct) return;
    const calc = calcularEtiquetas(etiquetaModalProduct);
    if (!calc) { showAlert('Preencha as dimens√µes, a largura do material e a quantidade/metros/valor desejado.'); return; }
    const { largura, altura, larguraMaterial } = etiquetaForm;
    const dimensoesLabel = `${calc.quantidade}un ${largura}x${altura}cm`;
    setCart(prev => [...prev, {
      productId: etiquetaModalProduct.id,
      name: etiquetaModalProduct.name,
      price: calc.valorFinal,
      quantity: 1,
      dimensions: dimensoesLabel,
      consumoEstoque: calc.metrosLineares,
    }]);
    // Se a largura do material foi mudada, salva como novo padrao pra proxima vez
    if (larguraMaterial && larguraMaterial !== etiquetaModalProduct.larguraRolo) {
      await supabase.from('produtos').update({ largura_rolo: larguraMaterial }).eq('id', etiquetaModalProduct.id);
    }
    setEtiquetaModalProduct(null);
  };

  // Insulfilm: aproveitamento entre TODAS as pecas da mesma nota, respeitando o corte fisico do rolo.
  // Agrupa pecas lado a lado dentro da largura do rolo (bin-packing guloso), e o comprimento
  // consumido por corte e o MAIOR comprimento entre as pecas daquele corte.
  const otimizarCortesInsulfilm = (pecas: { largura: number; altura: number }[], larguraRoloM: number) => {
    const validas = pecas.filter(p => p.largura > 0 && p.altura > 0);
    if (validas.length === 0 || larguraRoloM <= 0) return null;

    // Empacota um conjunto de pecas JA orientadas (guloso: mais larga primeiro, encaixa no primeiro corte que sobra espaco)
    const empacotar = (pecasOrientadas: { largura: number; altura: number }[]) => {
      const ordenadas = [...pecasOrientadas].sort((a, b) => b.largura - a.largura);
      const cortes: { pecas: { largura: number; altura: number }[]; larguraUsada: number; comprimento: number }[] = [];
      for (const peca of ordenadas) {
        let encaixou = false;
        for (const corte of cortes) {
          if (corte.larguraUsada + peca.largura <= larguraRoloM + 0.0001) {
            corte.pecas.push(peca);
            corte.larguraUsada += peca.largura;
            corte.comprimento = Math.max(corte.comprimento, peca.altura);
            encaixou = true;
            break;
          }
        }
        if (!encaixou) {
          cortes.push({ pecas: [peca], larguraUsada: peca.largura, comprimento: peca.altura });
        }
      }
      const metrosLineares = cortes.reduce((s, c) => s + c.comprimento, 0);
      return { cortes, metrosLineares };
    };

    // Pra cada peca, testa as duas orientacoes possiveis (normal e girada 90¬∞) e so considera
    // as que cabem na largura do rolo ‚Äî assim uma peca pode "deitar" pra encaixar ao lado de outra
    // (ex: peca de 1,00x0,80 pode virar 0,80x1,00 pra caber junto com uma de 0,70m de largura)
    const opcoesPorPeca = validas.map(p => {
      const normal = { largura: p.largura, altura: p.altura };
      const girada = { largura: p.altura, altura: p.largura };
      const cabem = [normal, girada].filter(o => o.largura <= larguraRoloM + 0.0001);
      return cabem.length > 0 ? cabem : [normal]; // nenhuma orientacao cabe -> usa normal mesmo, o aviso de "nao cabe" aparece na tela
    });

    // Testa todas as combinacoes de orientacao entre as pecas e fica com a que da o MELHOR aproveitamento
    // (menos metros lineares no total). Limitado pra nao travar a tela se vierem muitas pecas de uma vez.
    const totalCombinacoes = opcoesPorPeca.reduce((acc, opcoes) => acc * opcoes.length, 1);
    let melhor: { cortes: { pecas: { largura: number; altura: number }[]; larguraUsada: number; comprimento: number }[]; metrosLineares: number } | null = null;
    if (totalCombinacoes <= 4096) {
      const combinar = (index: number, atual: { largura: number; altura: number }[]) => {
        if (index === opcoesPorPeca.length) {
          const resultado = empacotar(atual);
          if (!melhor || resultado.metrosLineares < melhor.metrosLineares - 0.0001) melhor = resultado;
          return;
        }
        for (const opcao of opcoesPorPeca[index]) combinar(index + 1, [...atual, opcao]);
      };
      combinar(0, []);
    } else {
      melhor = empacotar(validas);
    }

    const { cortes, metrosLineares } = melhor!;
    const areaUtilizada = validas.reduce((s, p) => s + p.largura * p.altura, 0);
    const areaRetirada = cortes.reduce((s, c) => s + larguraRoloM * c.comprimento, 0);
    const desperdicio = Math.max(0, areaRetirada - areaUtilizada);
    const aproveitamento = areaRetirada > 0 ? (areaUtilizada / areaRetirada) * 100 : 0;

    return { cortes, metrosLineares, areaUtilizada, areaRetirada, desperdicio, aproveitamento };
  };

  const confirmAddInsulfilmItem = async () => {
    if (!insulfilmModalProduct) return;
    const calc = otimizarCortesInsulfilm(insulfilmPecas, insulfilmLarguraMaterial);
    if (!calc) { showAlert('Informe largura e altura v√°lidas de pelo menos uma pe√ßa.'); return; }
    const IMPRESSAO_MINIMA = insulfilmModalProduct.valorMinimo ?? 30;
    const valorCalculado = calc.areaRetirada * insulfilmModalProduct.price;
    const valorFinal = Math.max(valorCalculado, IMPRESSAO_MINIMA);
    const pecasLabel = insulfilmPecas.filter(p => p.largura > 0 && p.altura > 0).map(p => `${p.largura}x${p.altura}`).join(' + ');
    setCart(prev => [...prev, {
      productId: insulfilmModalProduct.id,
      name: insulfilmModalProduct.name,
      price: valorFinal,
      quantity: 1,
      dimensions: `${pecasLabel} (${calc.cortes.length} corte${calc.cortes.length > 1 ? 's' : ''})`,
      area: calc.areaUtilizada,
      consumoEstoque: calc.metrosLineares,
    }]);
    if (insulfilmLarguraMaterial && insulfilmLarguraMaterial !== insulfilmModalProduct.larguraRolo) {
      await supabase.from('produtos').update({ largura_rolo: insulfilmLarguraMaterial }).eq('id', insulfilmModalProduct.id);
    }
    setInsulfilmModalProduct(null);
  };

  // Consumo linear real do rolo: testa as duas orientacoes da peca e usa a dimensao
  // que sobra como comprimento consumido, aproveitando a largura do rolo ao maximo.
  // Ex: peca 80x70cm cabe deitada ou em pe num rolo largo -> usa a MENOR medida como comprimento (70cm).
  // Ex: peca 3m x 0,50m num rolo de 1m -> s√≥ cabe de um jeito (0,50m na largura) -> consome os 3m inteiros.
  const calcularConsumoLinear = (w: number, h: number, larguraRolo?: number): number => {
    const area = w * h;
    if (!larguraRolo || larguraRolo <= 0) return area;
    const cabeComoEsta = w <= larguraRolo;
    const cabeGirada = h <= larguraRolo;
    if (cabeComoEsta && cabeGirada) return Math.min(w, h);
    if (cabeComoEsta) return h;
    if (cabeGirada) return w;
    return area / larguraRolo; // nenhuma orientacao cabe ‚Äî fallback, tela avisa o usuario nesse caso
  };

  const confirmAddDimensionedItem = async () => {
    if (!dimensionModalProduct) return;
    const w = dimWidth === '' ? 0 : Number(dimWidth);
    const h = dimHeight === '' ? 0 : Number(dimHeight);
    if (w <= 0 || h <= 0) {
      showAlert('Informe largura e altura v√°lidas.');
      return;
    }
    const area = w * h;
    const dimensions = `${w.toString().replace('.', ',')}x${h.toString().replace('.', ',')}`;
    const product = dimensionModalProduct;
    let consumoUnitario = area;
    const rolo = dimLarguraMaterial || product.larguraRolo || 0;
    if (rolo > 0) {
      const cabeComoEsta = w <= rolo;
      const cabeGirada = h <= rolo;
      if (!cabeComoEsta && !cabeGirada) {
        showAlert(`Aten√ß√£o: nem ${w}m nem ${h}m cabem na largura do material (${rolo}m) em nenhuma orienta√ß√£o. Confira as medidas.`);
      }
      consumoUnitario = calcularConsumoLinear(w, h, rolo);
    }
    // Se a largura do material foi mudada, salva como novo padrao pra proxima vez
    if (dimLarguraMaterial && dimLarguraMaterial !== product.larguraRolo) {
      await supabase.from('produtos').update({ largura_rolo: dimLarguraMaterial }).eq('id', product.id);
    }

    if (product.unitType === 'metro') {
      // Metro linear puro: preco cobrado e sobre o consumo linear (lado que "sobra" ao encaixar
      // a peca na largura do material, sempre preferindo o lado menor quando os dois cabem)
      const valorCalculado = consumoUnitario * product.price * selectedQty;
      const valorFinal = Math.max(valorCalculado, product.valorMinimo || 0);
      const dimensoesTexto = `${dimensions} (${consumoUnitario.toFixed(2).replace('.', ',')}m linear)`;
      setCart(prev => [...prev, {
        productId: product.id,
        name: product.name,
        price: valorFinal,
        quantity: 1,
        dimensions: dimensoesTexto,
        consumoEstoque: consumoUnitario * selectedQty,
      }]);
      setDimensionModalProduct(null);
      setDimWidth('');
      setDimHeight('');
      setSelectedQty(1);
      return;
    }

    // m2: aplica o valor minimo ajustando o preco unitario, pra manter a formula preco x area x qtd
    // usada em todo o resto do sistema (carrinho, recibo, orcamento) sem precisar mexer nela
    let precoUnitarioEfetivo = product.price;
    if (product.valorMinimo && area > 0) {
      const valorCalculado = product.price * area * selectedQty;
      if (valorCalculado < product.valorMinimo) {
        precoUnitarioEfetivo = product.valorMinimo / (area * selectedQty);
      }
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.dimensions === dimensions);
      if (existing) {
        return prev.map(item => (item.productId === product.id && item.dimensions === dimensions)
          ? { ...item, quantity: item.quantity + selectedQty }
          : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: precoUnitarioEfetivo,
        quantity: selectedQty,
        dimensions,
        area,
        consumoEstoque: consumoUnitario
      }];
    });
    setDimensionModalProduct(null);
    setDimWidth('');
    setDimHeight('');
    setSelectedQty(1);
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const [discountItemIndex, setDiscountItemIndex] = useState<number | null>(null);
  const [discountMode, setDiscountMode] = useState<'percentual' | 'valor' | 'preco'>('percentual');
  const [discountInput, setDiscountInput] = useState<number | ''>('');

  const openItemDiscount = (index: number) => {
    setDiscountItemIndex(index);
    setDiscountMode('percentual');
    setDiscountInput('');
  };

  const applyItemDiscount = () => {
    if (discountItemIndex === null) return;
    setCart(prev => {
      const updated = [...prev];
      const item = updated[discountItemIndex];
      const original = item.precoOriginal ?? item.price;
      const val = discountInput === '' ? 0 : Number(discountInput);
      const qty = item.quantity || 1;

      // Subtotal ORIGINAL da linha inteira (todas as unidades, considerando area se houver)
      const subtotalOriginalLinha = item.area ? original * item.area * qty : original * qty;

      if (discountMode === 'preco') {
        // O valor digitado e o TOTAL da linha inteira (todas as unidades juntas) ‚Äî nao por unidade.
        // Ex: 2 unidades, digitou 120,00 -> as duas juntas valem 120,00 (60,00 cada), nao 120,00 cada.
        const novoSubtotalLinha = Math.max(0, val);
        const novoPreco = item.area ? novoSubtotalLinha / (item.area * qty) : novoSubtotalLinha / qty;
        updated[discountItemIndex] = { ...item, price: novoPreco, precoOriginal: original, descontoValor: undefined };
        return updated;
      }

      const descontoValor = discountMode === 'percentual' ? subtotalOriginalLinha * (val / 100) : val;
      const novoSubtotalLinha = Math.max(0, subtotalOriginalLinha - descontoValor);
      const novoPreco = item.area ? novoSubtotalLinha / (item.area * qty) : novoSubtotalLinha / qty;
      updated[discountItemIndex] = { ...item, price: novoPreco, precoOriginal: original, descontoValor };
      return updated;
    });
    setDiscountItemIndex(null);
  };

  const removeItemDiscount = (index: number) => {
    setCart(prev => {
      const updated = [...prev];
      const item = updated[index];
      if (item.precoOriginal !== undefined) {
        updated[index] = { ...item, price: item.precoOriginal, precoOriginal: undefined, descontoValor: undefined };
      }
      return updated;
    });
  };

  const [obsItemIndex, setObsItemIndex] = useState<number | null>(null);
  const updateItemObservacao = (index: number, texto: string) => {
    setCart(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], observacao: texto || undefined };
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setSaleDiscountValue(0); setSaleDiscountInput(''); setSaleCreditApplied(0);
    // Limpa tambem qualquer estado de "editando pedido existente" ou "quitando debito" que
    // tenha ficado preso de uma acao anterior cancelada ‚Äî senao a proxima nota nova herda
    // dados (valor ja pago, itens) de um pedido antigo sem querer.
    setEditingFullOrder(null);
    setSettlingOrder(null);
    setScheduledFor('');
    setOrderObservacoes('');
    setDownPayment(0);
    setEditingCreatedAt('');
    setEditingPaymentsList([]);
    resetPaymentEntries();
  };

  const [saleDiscountValue, setSaleDiscountValue] = useState<number>(0);
  const [saleDiscountMode, setSaleDiscountMode] = useState<'percentual' | 'valor' | 'final'>('valor');
  const [saleDiscountInput, setSaleDiscountInput] = useState<number | ''>('');
  const [isSaleDiscountModalOpen, setIsSaleDiscountModalOpen] = useState<boolean>(false);
  // Credito acumulado do cliente (ex: troco de dinheiro que ele nao levou), abatido automaticamente
  // do total da venda quando aplicado aqui. Fonte da verdade e' clientes.saldo_credito.
  const [saleCreditApplied, setSaleCreditApplied] = useState<number>(0);
  const selectedCustomerCredit = selectedCustomer ? (allCustomers.find((c: any) => c.id === selectedCustomer.id)?.saldo_credito || 0) : 0;

  const cartRawTotal = cart.reduce((acc, item) => {
    const itemTotal = item.area ? item.price * item.area * item.quantity : item.price * item.quantity;
    return acc + itemTotal;
  }, 0);

  const settlingRawTotal = settlingOrder
    ? ((settlingOrder.items && settlingOrder.items.length > 0)
        ? settlingOrder.items.reduce((acc, item) => acc + (item.area ? item.price * item.area * item.quantity : item.price * item.quantity), 0)
        : (settlingOrder.total + (settlingOrder.discountValue || 0)))
    : 0;

  const activeRawTotal = settlingOrder ? settlingRawTotal : cartRawTotal;
  const total = Math.max(0, cartRawTotal - saleDiscountValue - saleCreditApplied);

  const applySaleCredit = () => {
    const disponivel = Math.max(0, selectedCustomerCredit);
    const maxAplicavel = Math.max(0, activeRawTotal - saleDiscountValue);
    setSaleCreditApplied(Math.min(disponivel, maxAplicavel));
  };

  const remainingValue = Math.max(0, total - (downPayment === '' || typeof downPayment === 'string' ? 0 : Number(downPayment)));

  // Aplica o desconto da venda a partir do modo escolhido (%, R$ de desconto, ou valor final desejado)
  const applySaleDiscountInput = () => {
    const val = saleDiscountInput === '' ? 0 : Number(saleDiscountInput);
    let novoDesconto = 0;
    const baseTotal = activeRawTotal;
    if (saleDiscountMode === 'percentual') {
      novoDesconto = baseTotal * (val / 100);
    } else if (saleDiscountMode === 'valor') {
      novoDesconto = val;
    } else {
      // valor final desejado: desconto = total original - valor final que o cliente quer pagar
      novoDesconto = Math.max(0, baseTotal - val);
    }
    setSaleDiscountValue(Math.max(0, Math.min(baseTotal, novoDesconto)));
  };

  // Quitar Debito: abre a mesma tela de pagamento do Terminal, mas pra uma venda ja existente com saldo pendente
  const paymentModalTotal = settlingOrder 
    ? Math.max(0, settlingRawTotal - saleDiscountValue - saleCreditApplied)
    : total;
  const paymentModalItems = settlingOrder ? settlingOrder.items : cart;

  // Soma a lista EDITAVEL de pagamentos (nao o campo downPayment travado) ‚Äî assim, se a pessoa
  // excluir um pagamento da lista, o valor "ja pago" cai na hora, refletindo a edicao
  const alreadyPaidForSettle = (settlingOrder || editingFullOrder) ? editingPaymentsList.reduce((sum, p) => sum + p.value, 0) : 0;
  const paymentModalRemaining = (settlingOrder || editingFullOrder)
    ? Math.max(0, paymentModalTotal - alreadyPaidForSettle - paymentEntriesTotal)
    : remainingValue;

  const openSettlePayment = (order: SaleOrder) => {
    setSettlingOrder(order);
    setSelectedCustomer(order.customerId ? { id: order.customerId, name: order.customerName || 'Cliente', phone: order.customerPhone || '' } : null);
    setPaymentEntries([]);
    setDownPayment(0);
    setScheduledFor(order.scheduledFor ? isoToLocalDatetimeInput(order.scheduledFor) : '');
    setPendingPaymentMethod('');
    setEditingPaymentsList(order.payments ? order.payments.map(p => ({ ...p })) : []);
    setSaleDiscountValue(order.discountValue || 0);
    setSaleDiscountInput(order.discountValue ? Number(order.discountValue) : '');
    setSaleDiscountMode('valor');
    setSaleCreditApplied(0);
    setIsPaymentModalOpen(true);
  };

  // As 3 acoes do card de Entrega (clicavel em Servicos/Notas em Aberto e tambem disponivel
  // dentro de Quitar Debito): editar a data, marcar como entregue, ou excluir o agendamento.
  // Editar agendamento a partir do card (aba Servicos): antes isso tambem abria o modal
  // grande de "Quitar Debito" por baixo do popup de data (via openSettlePayment), o que nao
  // era necessario so pra mudar a data/hora e ainda arriscava um segundo save (o do modal
  // grande) disputar/sobrescrever o valor logo depois. Agora seta so o minimo necessario
  // (settlingOrder + scheduledFor) pra o popup de agendamento salvar sozinho, sem abrir
  // o modal de pagamento.
  const handleEditScheduleFromCard = (sale: SaleOrder) => {
    setSettlingOrder(sale);
    setScheduledFor(sale.scheduledFor ? isoToLocalDatetimeInput(sale.scheduledFor) : '');
    setIsScheduleModalOpen(true);
  };

  const handleDeliverFromCard = async (sale: SaleOrder) => {
    if (!(await showConfirm(`Marcar o pedido de ${sale.customerName || 'cliente'} como entregue?`))) return;
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase.from('vendas').update({ service_status: 'produto_entregue', updated_at: nowIso }).eq('id', sale.id).select();
    if (error) { showAlert(`N√£o foi poss√≠vel marcar como entregue: ${error.message}`); return; }
    if (!data || data.length === 0) { showAlert('N√£o foi poss√≠vel marcar como entregue ‚Äî o pedido pode ter sido removido ou alterado por outra pessoa. Feche e abra a tela de novo.'); return; }
    const atualizado = { ...sale, serviceStatus: 'produto_entregue' as any, updatedAt: nowIso };
    setAllSalesHistory(prev => prev.map(s => s.id === sale.id ? atualizado : s));
    setSalesToday(prev => prev.map(s => s.id === sale.id ? atualizado : s));
    showAlert('Pedido marcado como entregue!');
  };

  const handleDeleteScheduleFromCard = async (sale: SaleOrder) => {
    if (!(await showConfirm(`Excluir o agendamento de entrega do pedido de ${sale.customerName || 'cliente'}?`))) return;
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase.from('vendas').update({ scheduled_for: null, updated_at: nowIso }).eq('id', sale.id).select();
    if (error) { showAlert(`N√£o foi poss√≠vel excluir o agendamento: ${error.message}`); return; }
    if (!data || data.length === 0) { showAlert('N√£o foi poss√≠vel excluir o agendamento ‚Äî o pedido pode ter sido removido ou alterado por outra pessoa. Feche e abra a tela de novo.'); return; }
    const atualizado = { ...sale, scheduledFor: undefined, updatedAt: nowIso };
    setAllSalesHistory(prev => prev.map(s => s.id === sale.id ? atualizado : s));
    setSalesToday(prev => prev.map(s => s.id === sale.id ? atualizado : s));
    showAlert('Agendamento exclu√≠do!');
  };

  // Monta o objeto de pagamento a partir do que esta digitado no formulario (valor/percentual,
  // forma, parcelas, taxa e data). Retorna null se nao ha valor valido digitado ainda.
  // Usado tanto pelo botao "+ Adicionar" quanto pela protecao automatica do handleFinalize
  // (evita perder um valor digitado e nunca clicado em Adicionar).
  const buildPaymentEntryFromInput = (): PaymentEntry | null => {
    const rawInput = newPaymentInput === '' ? 0 : Number(newPaymentInput);
    const baseValue = newPaymentMode === 'percentual' ? Number(((total * rawInput) / 100).toFixed(2)) : rawInput;
    if (baseValue <= 0) return null;
    let value = baseValue;
    let installments: number | undefined;
    let feePercent: number | undefined;
    if (newPaymentMethod === 'cartao_credito') {
      installments = newPaymentInstallments;
      feePercent = creditCardFees.find(f => f.installments === newPaymentInstallments)?.feePercent || 0;
      value = Number((baseValue * (1 + feePercent / 100)).toFixed(2));
    } else if (newPaymentMethod === 'cartao_debito' && debitCardFeePercent > 0) {
      feePercent = debitCardFeePercent;
      value = Number((baseValue * (1 + feePercent / 100)).toFixed(2));
    }
    const dataLancamento = useCustomPaymentDate && customPaymentDate ? (localDatetimeToIso(customPaymentDate) || new Date().toISOString()) : new Date().toISOString();
    return { method: newPaymentMethod, value, date: dataLancamento, installments, feePercent };
  };

  const confirmAddPayment = () => {
    const entry = buildPaymentEntryFromInput();
    if (!entry) { showAlert('Digite um valor v√°lido para o pagamento.'); return; }
    setPaymentEntries(prev => [...prev, entry]);
    setNewPaymentMode('valor');
    setNewPaymentInstallments(1);
    setUseCustomPaymentDate(false);
    setCustomPaymentDate('');
  };

  const removePaymentEntry = (idx: number) => {
    setPaymentEntries(prev => prev.filter((_, i) => i !== idx));
  };

  // Cliente pagou em dinheiro e nao quis levar o troco: guarda a diferenca como credito no
  // cadastro dele, pra abater automaticamente numa proxima compra
  const [isSavingTrocoCredito, setIsSavingTrocoCredito] = useState(false);
  const handleSalvarTrocoComoCredito = async (trocoValor: number) => {
    if (!selectedCustomer?.id || trocoValor <= 0) return;
    setIsSavingTrocoCredito(true);
    try {
      const saldoAtual = allCustomers.find((c: any) => c.id === selectedCustomer.id)?.saldo_credito || 0;
      const { error } = await supabase.from('clientes').update({ saldo_credito: saldoAtual + trocoValor }).eq('id', selectedCustomer.id);
      if (error) throw error;
      await loadAllCustomers();
      setCashReceived('');
      showAlert(`R$ ${trocoValor.toFixed(2).replace('.', ',')} guardado como cr√©dito para ${selectedCustomer.name}.`);
    } catch (err) {
      console.error('Erro ao guardar troco como cr√©dito:', err);
      showAlert('N√£o foi poss√≠vel guardar o troco como cr√©dito.');
    } finally {
      setIsSavingTrocoCredito(false);
    }
  };

  useEffect(() => {
    setDownPayment(paymentEntriesTotal);
    if (paymentEntries.length === 1) setPaymentMethod(paymentEntries[0].method as any);
    else if (paymentEntries.length > 1) setPaymentMethod('misto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentEntries]);

  useEffect(() => {
    if (enabledPaymentMethods.length > 0 && !enabledPaymentMethods.includes(newPaymentMethod)) {
      setNewPaymentMethod(enabledPaymentMethods[0] as PaymentEntry['method']);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledPaymentMethods]);

  // O campo de valor sempre vem preenchido com o saldo restante ‚Äî ao abrir o pagamento,
  // ao adicionar um pagamento (recalcula o que falta), ou ao trocar de forma de pagamento.
  // Nunca mexe no modo (R$ ou %) escolhido pelo usu√°rio.
  useEffect(() => {
    if (!isPaymentModalOpen) return;
    // Editando os itens de uma nota que j√° existe (ex: adicionar mais um produto): N√ÉO
    // pr√©-preenche o campo com o saldo restante. Nesse modo o usu√°rio normalmente s√≥ quer
    // salvar a altera√ß√£o dos itens sem lan√ßar pagamento nenhum, e o bot√£o de salvar reaproveita
    // qualquer valor que estiver digitado nesse campo ‚Äî se ele vier preenchido sozinho com o
    // saldo total, a nota √© quitada (status "pago") mesmo o usu√°rio n√£o tendo digitado nada e
    // mesmo o bot√£o mostrando "R$ 0,00" (o texto do bot√£o n√£o olha esse campo nesse modo).
    if (editingFullOrder) {
      if (newPaymentInput !== '') setNewPaymentInput('');
      return;
    }
    if (newPaymentMode === 'valor') {
      setNewPaymentInput(paymentModalRemaining > 0 ? Number(paymentModalRemaining.toFixed(2)) : '');
    } else if (newPaymentMode === 'percentual') {
      const pct = paymentModalTotal > 0 ? (paymentModalRemaining / paymentModalTotal) * 100 : 0;
      setNewPaymentInput(pct > 0 ? Number(pct.toFixed(2)) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaymentModalOpen, paymentModalRemaining, newPaymentMethod, newPaymentMode, editingFullOrder]);

  // Soma por data de CADA pagamento (nao pela data de criacao da nota) ‚Äî uma nota paga em
  // partes em dias diferentes conta o faturamento em cada dia certo, nao tudo de uma vez
  const faturamentoHoje = useMemo(() => {
    const inicioHoje = new Date(); inicioHoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(); fimHoje.setHours(23, 59, 59, 999);
    return allSalesHistory
      .filter(o => o.status !== 'canceled')
      .flatMap(getRevenueEventsForSale)
      .filter(ev => { const d = new Date(ev.date); return d >= inicioHoje && d <= fimHoje; })
      .reduce((acc, ev) => acc + ev.value, 0);
  }, [allSalesHistory]);

  const handleFinalize = async (isPending: boolean = false, forceZeroPayment: boolean = false) => {
    // Protecao de UX: se o usuario digitou um valor no campo de pagamento mas esqueceu de
    // clicar em "+ Adicionar", inclui esse valor automaticamente na lista antes de processar ‚Äî
    // evita registrar/quitar um pagamento de R$ 0,00 por engano so porque o valor ficou
    // digitado no campo e nunca foi confirmado na lista.
    const pendingEntry = forceZeroPayment ? null : buildPaymentEntryFromInput();
    const effectivePaymentEntries = pendingEntry ? [...paymentEntries, pendingEntry] : paymentEntries;
    const effectivePaymentEntriesTotal = effectivePaymentEntries.reduce((sum, p) => sum + (p.value || 0), 0);
    if (pendingEntry) {
      setPaymentEntries(effectivePaymentEntries);
      setNewPaymentMode('valor');
      setNewPaymentInstallments(1);
      setUseCustomPaymentDate(false);
      setCustomPaymentDate('');
    }

    // Play money sound
    try {
      const audio = new Audio('/sounds/sale-complete.mp3');
      audio.play().catch(() => {});
    } catch (e) {}

    // Edicao completa de uma nota ja existente (itens do carrinho alterados): atualiza a mesma
    // linha no banco (itens + total) em vez de criar uma venda nova, e ajusta o estoque so pela
    // DIFERENCA entre o que tinha antes e o que ficou agora (nao deduz tudo de novo).
    if (editingFullOrder) {
      // Recalcula o total pago a partir da lista EDITADA de pagamentos (editingPaymentsList),
      // nao do downPayment travado da nota original. Usar o downPayment antigo aqui somava o
      // valor anterior com o novo mesmo quando um pagamento existente foi removido/substituido
      // na edicao (ex: 50 excluido + 60 lancado virava 50 + 60 = 110 em vez de 60). Assim o
      // total pago fica sempre igual a soma real do array que vai ser salvo (idempotente).
      const totalPagoAnteriorEditado = editingPaymentsList.reduce((sum, p) => sum + (p.value || 0), 0);
      const totalPago = totalPagoAnteriorEditado + effectivePaymentEntriesTotal;
      const novoSaldo = Math.max(0, total - totalPago);
      try {
        // Ajusta estoque so pela diferenca de consumo entre os itens antigos e os novos
        const consumoItem = (i: any) => i.consumoEstoque !== undefined ? i.consumoEstoque * i.quantity : (i.area ? i.area * i.quantity : i.quantity);
        const consumoAntigo: Record<string, number> = {};
        (editingFullOrder.items || []).forEach((i: any) => { if (i.productId && i.productId !== 'manual') consumoAntigo[i.productId] = (consumoAntigo[i.productId] || 0) + consumoItem(i); });
        const consumoNovo: Record<string, number> = {};
        cart.forEach((i: any) => { if (i.productId && i.productId !== 'manual') consumoNovo[i.productId] = (consumoNovo[i.productId] || 0) + consumoItem(i); });
        const todosIds = new Set([...Object.keys(consumoAntigo), ...Object.keys(consumoNovo)]);
        await Promise.all(Array.from(todosIds).map(async (pid) => {
          const delta = (consumoNovo[pid] || 0) - (consumoAntigo[pid] || 0);
          if (delta === 0) return;
          const { data: prodAtual } = await supabase.from('produtos').select('current_stock, controla_estoque').eq('id', pid).maybeSingle();
          if (prodAtual && prodAtual.controla_estoque !== false) {
            const novoEstoque = Math.max(0, (Number(prodAtual.current_stock) || 0) - delta);
            await supabase.from('produtos').update({ current_stock: novoEstoque }).eq('id', pid);
          }
        }));

        const pagamentosFinaisEdicao = [...editingPaymentsList, ...effectivePaymentEntries];
        const { data, error } = await supabase.from('vendas').update({
          cliente_id: selectedCustomer?.id || null,
          customer_name: selectedCustomer?.name || editingFullOrder.customerName,
          customer_phone: selectedCustomer?.phone || editingFullOrder.customerPhone,
          items: cart,
          total,
          discount_value: saleDiscountValue || null,
          down_payment: totalPago,
          received_value: totalPago,
          payments: pagamentosFinaisEdicao,
          status: novoSaldo <= 0 ? 'completed' : 'pending',
          observacoes: orderObservacoes || null,
          scheduled_for: localDatetimeToIso(scheduledFor) || editingFullOrder.scheduledFor || null,
          created_at: editingCreatedAt ? new Date(editingCreatedAt).toISOString() : editingFullOrder.createdAt,
          updated_at: new Date().toISOString(),
        }).eq('id', editingFullOrder.id).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('O pedido n√£o foi encontrado pra atualizar ‚Äî pode ter sido removido ou alterado por outra pessoa.');

        // Se essa nota tem Orcamento e/ou Contrato vinculados, mantem os itens/valor deles
        // em sincronia com o que foi editado aqui na nota
        const idsVinculados = [editingFullOrder.orcamentoId, editingFullOrder.contratoId].filter(Boolean) as string[];
        if (idsVinculados.length > 0) {
          await Promise.all(idsVinculados.map(id =>
            supabase.from('orcamentos').update({ items: cart, total, desconto: saleDiscountValue || 0 }).eq('id', id)
          ));
        }

        const updatedOrder: SaleOrder = {
          ...editingFullOrder,
          customerId: selectedCustomer?.id || editingFullOrder.customerId,
          customerName: selectedCustomer?.name || editingFullOrder.customerName,
          customerPhone: selectedCustomer?.phone || editingFullOrder.customerPhone,
          items: [...cart],
          total,
          discountValue: saleDiscountValue || undefined,
          downPayment: totalPago,
          receivedValue: totalPago,
          payments: pagamentosFinaisEdicao,
          status: novoSaldo <= 0 ? 'completed' : 'pending',
          observacoes: orderObservacoes || undefined,
          scheduledFor: localDatetimeToIso(scheduledFor) || editingFullOrder.scheduledFor || undefined,
          createdAt: editingCreatedAt ? new Date(editingCreatedAt).toISOString() : editingFullOrder.createdAt,
          updatedAt: new Date().toISOString(),
        };
        setLastFinalizedOrder(updatedOrder);
        // Reordena pela data/hora real da transacao (createdAt) ‚Äî editar uma nota nao deve
        // mudar sua posicao cronologica no historico.
        setAllSalesHistory(prev => prev.map(s => s.id === editingFullOrder.id ? updatedOrder : s).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setSalesToday(prev => prev.map(s => s.id === editingFullOrder.id ? updatedOrder : s));
        setIsSuccessModalOpen(true);
        setIsPaymentModalOpen(false);
        setEditingFullOrder(null);
        setCart([]);
        setSelectedCustomer(null);
        setPaymentEntries([]);
        setDownPayment(0);
        setScheduledFor('');
        setOrderObservacoes('');
        setSaleDiscountValue(0);
        setSaleDiscountInput('');
        setSaleCreditApplied(0);
        setEditingCreatedAt('');
      } catch (err: any) {
        console.error('Erro ao salvar edi√ß√£o da nota:', err);
        showAlert(`N√£o foi poss√≠vel salvar as altera√ß√µes: ${err?.message || 'erro desconhecido'}`);
      }
      return;
    }

    // Quitar Debito: atualiza a venda ja existente em vez de criar uma nova
    if (settlingOrder) {
      const novoTotalPago = alreadyPaidForSettle + effectivePaymentEntriesTotal;
      const novoSaldo = Math.max(0, paymentModalTotal - novoTotalPago);
      // Usa a lista EDITADA (pode ter pagamento excluido ou data alterada), nao a original travada
      const pagamentosFinais = [...editingPaymentsList, ...effectivePaymentEntries];
      try {
        const { data, error } = await supabase.from('vendas').update({
          total: paymentModalTotal,
          discount_value: saleDiscountValue || null,
          down_payment: novoTotalPago,
          received_value: novoTotalPago,
          payments: pagamentosFinais,
          status: novoSaldo <= 0 ? 'completed' : 'pending',
          pending_payment_method: novoSaldo > 0 ? (pendingPaymentMethod || null) : null,
          scheduled_for: localDatetimeToIso(scheduledFor) || settlingOrder.scheduledFor || null,
          updated_at: new Date().toISOString(),
        }).eq('id', settlingOrder.id).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('O pedido n√£o foi encontrado pra atualizar ‚Äî pode ter sido removido ou alterado por outra pessoa.');

        const updatedOrder: SaleOrder = { 
          ...settlingOrder, 
          total: paymentModalTotal,
          discountValue: saleDiscountValue || undefined,
          downPayment: novoTotalPago, 
          receivedValue: novoTotalPago, 
          status: novoSaldo <= 0 ? 'completed' : 'pending', 
          payments: pagamentosFinais, 
          scheduledFor: localDatetimeToIso(scheduledFor) || settlingOrder.scheduledFor || undefined, 
          updatedAt: new Date().toISOString() 
        };
        setLastFinalizedOrder(updatedOrder);
        // Atualiza so essa venda localmente (nao recarrega a tabela inteira, que fica lenta com muitas vendas)
        // Reordena pela data/hora real da transacao (createdAt) ‚Äî quitar debito nao deve
        // mudar a posicao cronologica da nota no historico.
        setAllSalesHistory(prev => prev.map(s => s.id === settlingOrder.id ? updatedOrder : s).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setSalesToday(prev => prev.map(s => s.id === settlingOrder.id ? updatedOrder : s));
        setIsSuccessModalOpen(true);
        setIsPaymentModalOpen(false);
        setSettlingOrder(null);
        setSelectedCustomer(null);
        setPaymentEntries([]);
        setDownPayment(0);
        setScheduledFor('');
        setOrderObservacoes('');
        setPendingPaymentMethod('');
        setSaleDiscountValue(0);
        setSaleDiscountInput('');
        setSaleCreditApplied(0);
      } catch (err: any) {
        console.error('Erro ao quitar d√©bito:', err);
        showAlert(`N√£o foi poss√≠vel registrar o pagamento: ${err?.message || 'erro desconhecido'}`);
      }
      return;
    }
    const finalDownPayment = forceZeroPayment ? 0 : (downPayment === '' || typeof downPayment === 'string' ? 0 : Number(downPayment));
    const currentRemaining = Math.max(0, total - finalDownPayment);
    const paymentsToSave = forceZeroPayment ? [] : effectivePaymentEntries;

    // So salva agendamento de entrega se o usuario escolheu uma data/hora manualmente
    // (campo scheduledFor). Antes, toda venda com pagamento parcial ("entrada") sem data
    // escolhida ganhava um agendamento automatico pra 2 dias depois as 17h, sem o usuario
    // pedir nem saber -- removido.
    const deliveryDate = localDatetimeToIso(scheduledFor) || undefined;

    const isPartialSale = currentRemaining > 0 || isPending;

    const order: SaleOrder = {
      id: `ord_${Date.now()}`,
      companyId: currentCompany?.id || 'default',
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name || 'Cliente de Balc√£o',
      items: [...cart],
      total,
      discountValue: saleDiscountValue || undefined,
      downPayment: finalDownPayment,
      receivedValue: finalDownPayment,
      paymentMethod,
      payments: paymentsToSave,
      pendingPaymentMethod: currentRemaining > 0 ? (pendingPaymentMethod || undefined) : undefined,
      status: isPartialSale ? 'pending' : 'completed',
      createdAt: new Date().toISOString(),
      scheduledFor: deliveryDate || undefined,
      observacoes: orderObservacoes || undefined
    };

    // Save to Supabase
    let insertedVenda: any = null;
    try {
      const { data: insertedVendaResult, error } = await supabase.from('vendas').insert({
        customer_name: order.customerName,
        customer_phone: selectedCustomer?.phone,
        items: order.items,
        total: order.total,
        down_payment: order.downPayment,
        received_value: order.receivedValue,
        payment_method: order.paymentMethod,
        payments: paymentsToSave,
        pending_payment_method: currentRemaining > 0 ? (pendingPaymentMethod || null) : null,
        status: order.status,
        scheduled_for: order.scheduledFor || null,
        observacoes: orderObservacoes || null,
        orcamento_id: linkedOrcamentoId || null,
        discount_value: saleDiscountValue || null,
      }).select().single();
      if (error) throw error;
      insertedVenda = insertedVendaResult;

      // Baixa automatica de estoque para cada item vendido (produtos do catalogo real, ignora itens livres/manuais)
      // Roda em paralelo (Promise.all) em vez de um item de cada vez, pra nao deixar o fechamento lento
      await Promise.all(cart.filter(item => item.productId && item.productId !== 'manual').map(async (item) => {
        const qtdBaixa = item.consumoEstoque !== undefined
          ? item.consumoEstoque * item.quantity
          : (item.area ? item.area * item.quantity : item.quantity);
        const { data: prodAtual } = await supabase.from('produtos').select('current_stock, controla_estoque, unit').eq('id', item.productId).maybeSingle();
        if (prodAtual && prodAtual.controla_estoque !== false) {
          const estoqueAnterior = Number(prodAtual.current_stock) || 0;
          const novoEstoque = Math.max(0, estoqueAnterior - qtdBaixa);
          await Promise.all([
            supabase.from('produtos').update({ current_stock: novoEstoque }).eq('id', item.productId),
            supabase.from('movimentacoes_estoque').insert({
              produto_id: item.productId,
              produto_nome: item.name,
              tipo: 'saida',
              quantidade: qtdBaixa,
              unidade: prodAtual.unit || (item.consumoEstoque !== undefined ? 'metro linear' : (item.area ? 'm¬≤' : 'un')),
              motivo: 'venda',
              referencia: `Pedido #${order.id.slice(-8).toUpperCase()}`,
              quantidade_anterior: estoqueAnterior,
              quantidade_posterior: novoEstoque,
            }),
          ]);
        }
      }));

      // Se essa venda veio de um or√ßamento, marca o or√ßamento como Conclu√≠do ‚Äî Venda Gerada
      if (linkedOrcamentoId && insertedVenda) {
        await supabase.from('orcamentos').update({ status: 'concluido', venda_id: insertedVenda.id }).eq('id', linkedOrcamentoId);
        setLinkedOrcamentoId(null);
      }

      // Se o cliente teve credito aplicado nessa venda (ex: troco de outra compra), abate do
      // saldo dele agora que a venda foi confirmada
      if (selectedCustomer?.id && saleCreditApplied > 0) {
        const saldoAtual = allCustomers.find((c: any) => c.id === selectedCustomer.id)?.saldo_credito || 0;
        await supabase.from('clientes').update({ saldo_credito: Math.max(0, saldoAtual - saleCreditApplied) }).eq('id', selectedCustomer.id);
        loadAllCustomers();
      }
      
      // RULE: Always create Service/OS if pending or has balance OR specific items
      const hasServiceItems = cart.some(item => 
        item.name.toLowerCase().includes('banner') || 
        item.name.toLowerCase().includes('adesivo') ||
        item.name.toLowerCase().includes('servi√ßo')
      );

      if (hasServiceItems || currentRemaining > 0 || isPending) {
        await addDoc(collection(db, 'services'), {
          companyId: currentCompany?.id,
          orderId: order.id,
          client: order.customerName,
          phone: selectedCustomer?.phone || '',
          service: cart.map(i => `${i.quantity}x ${i.name}`).join(', '),
          status: currentRemaining > 0 ? 'pendente' : 'concluido',
          priority: 'normal',
          total: order.total,
          balance: currentRemaining,
          scheduledFor: deliveryDate || null,
          createdAt: Timestamp.now()
        });
        console.log('Ordem de Servi√ßo gerada.');
      }
    } catch (err) {
      console.error('Erro ao salvar venda:', err);
    }

    if (isPartialSale) {
      addPendingOrder(order);
    }
    
    // Adiciona a venda recem criada localmente (usa o id/dados reais vindos do banco)
    // em vez de recarregar a tabela inteira, que fica lenta conforme o historico cresce
    let novaVendaMapeada: SaleOrder = order;
    if (insertedVenda) {
      novaVendaMapeada = mapVendaRow(insertedVenda);
      setAllSalesHistory(prev => [novaVendaMapeada, ...prev]);
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);
      if (new Date(novaVendaMapeada.createdAt) >= inicioHoje) {
        setSalesToday(prev => [novaVendaMapeada, ...prev]);
      }
    }
    // Usa a venda com o id REAL do banco (nao o id local temporario "ord_..."), senao
    // qualquer acao feita a partir da tela de sucesso (ex: mudar Etapa Atual) falha
    // tentando usar um id que nao existe de verdade no banco.
    setLastFinalizedOrder(novaVendaMapeada);
    setIsSuccessModalOpen(true);
    setIsPaymentModalOpen(false);
    
    // Reset cart but keep customer for the success modal
    setCart([]);
    setDownPayment(0);
    setOrderObservacoes('');
    setScheduledFor('');
    setSaleDiscountValue(0); setSaleDiscountInput(''); setSaleCreditApplied(0);
    resetPaymentEntries();
  };

  const [isImportingVendas, setIsImportingVendas] = useState(false);
  const vendasFileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isRegisterOpen) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
        <GlassCard className="max-w-md w-full p-10 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-[32px] flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Caixa Fechado</h2>
          {user?.isAdmin ? (
            <>
              <p className="text-white/40 text-sm">√â necess√°rio abrir o caixa para iniciar as vendas do dia.</p>
              <Button className="w-full h-14 text-lg" onClick={() => setIsRegisterOpen(true)}>Abrir Caixa Agora</Button>
            </>
          ) : (
            <p className="text-white/40 text-sm">Apenas o administrador pode abrir o caixa. Aguarde a libera√ß√£o para iniciar as vendas.</p>
          )}
        </GlassCard>
      </div>
    );
  }

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const { data: vendasData } = await supabase.from('vendas').select('*').is('deleted_at', null);
      const allSales = (vendasData || []).map(mapVendaRow);
      allSales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllSalesHistory(allSales);
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      setSalesToday(allSales.filter(sale => new Date(sale.createdAt) >= startOfDay));

      // Reforca a atualizacao do catalogo de produtos tambem (alem do tempo real)
      const { data: produtosData } = await supabase.from('produtos').select('*').order('name', { ascending: true });
      setProducts((produtosData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.code || '',
        price: Number(p.sale_price) || 0,
        stock: Number(p.current_stock) || 0,
        unitType: p.unit === 'm2' ? 'm2' : p.unit === 'etiqueta' ? 'etiqueta' : p.unit === 'm' ? 'metro' : 'unit',
        tipoItem: p.tipo_item || 'produto',
        larguraRolo: p.largura_rolo ? Number(p.largura_rolo) : undefined,
        controlaEstoque: p.controla_estoque !== false,
        valorMinimo: p.valor_minimo ? Number(p.valor_minimo) : undefined,
      })));

      setSyncedAt(new Date());
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      showAlert('N√£o foi poss√≠vel sincronizar agora. Verifique sua conex√£o.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportVendasFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingVendas(true);
    try {
      const buffer = await file.arrayBuffer();
      const rows = parseVendasXlsx(buffer);
      if (rows.length === 0) {
        showAlert('Nenhuma venda v√°lida encontrada na planilha. Confira se o modelo de colunas est√° correto.');
        return;
      }
      const payload = rows.map(r => ({
        customer_name: r.customerName,
        items: r.items,
        total: r.total,
        down_payment: r.downPayment || 0,
        payment_method: r.paymentMethod,
        status: r.status,
        ...(r.createdAt ? { created_at: r.createdAt } : {}),
      }));
      const falhasVendas: string[] = [];
      let vendasNovas = 0;
      const batchSize = 200;
      for (let i = 0; i < payload.length; i += batchSize) {
        const slice = payload.slice(i, i + batchSize);
        const { error } = await supabase.from('vendas').insert(slice);
        if (!error) {
          vendasNovas += slice.length;
        } else {
          for (const row of slice) {
            const { error: rowError } = await supabase.from('vendas').insert(row);
            if (rowError) falhasVendas.push(`${row.customer_name || 'sem cliente'}: ${rowError.message}`);
            else vendasNovas += 1;
          }
        }
      }
      if (falhasVendas.length > 0) {
        showAlert(`${vendasNovas} venda(s) importada(s).\n\n${falhasVendas.length} venda(s) N√ÉO foram importadas:\n${falhasVendas.slice(0, 10).join('\n')}${falhasVendas.length > 10 ? `\n... e mais ${falhasVendas.length - 10}` : ''}`);
      } else {
        showAlert(`${vendasNovas} venda(s) importada(s) com sucesso!`);
      }
    } catch (err: any) {
      console.error('Erro ao importar vendas:', err);
      showAlert(`N√£o foi poss√≠vel importar: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setIsImportingVendas(false);
      if (vendasFileInputRef.current) vendasFileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-full min-h-[500px] flex flex-col bg-slate-900/50 rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-right-5 duration-500">
      {alertToast && (
        <div
          onClick={() => { if (alertToast.saleId) { openReceiptById(alertToast.saleId); setAlertToast(null); } }}
          className={cn(
            "fixed top-4 right-4 z-[200] bg-amber-500 text-slate-950 font-black text-sm px-5 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 flex items-center gap-3 max-w-[calc(100vw-2rem)] sm:max-w-sm",
            alertToast.saleId ? "cursor-pointer hover:bg-amber-400 active:scale-95 transition-all" : ""
          )}
        >
           <span className="flex-1">{alertToast.message}</span>
           {alertToast.saleId && <ChevronRight size={16} className="shrink-0" />}
           <button onClick={(e) => { e.stopPropagation(); setAlertToast(null); }} className="text-slate-900/50 hover:text-slate-900 border-0 bg-transparent cursor-pointer shrink-0"><X size={16} /></button>
        </div>
      )}
      {/* Tab Navigation */}
      <div className="flex flex-wrap bg-white/5 p-1 sm:p-1.5 gap-1 sm:gap-1.5 border-b border-white/10 items-center justify-between shrink-0">
        <div className="flex sm:flex-wrap gap-1 flex-1 min-w-0 justify-between sm:justify-start">
          {[
            { id: 'venda', label: 'Terminal Venda', icon: ShoppingBag },
            { id: 'historico', label: 'Hist√≥rico & Abertas', icon: History },
            { id: 'estoque', label: 'Estoque / Produtos', icon: Box },
            { id: 'servicos', label: 'Servi√ßos', icon: Wrench },
            { id: 'orcamentos', label: 'Or√ßamentos', icon: FileSpreadsheet },
            { id: 'contratos', label: 'Contratos', icon: FileText },
            { id: 'excluidos', label: 'Exclu√≠dos', icon: Trash2 },
            { id: 'clientes', label: 'Clientes', icon: Users }
          ].sort((a, b) => {
            if (!pdvMenuConfig) return 0;
            const idxA = pdvMenuConfig.findIndex(m => m.id === a.id);
            const idxB = pdvMenuConfig.findIndex(m => m.id === b.id);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          }).filter(tab => {
            // Config global do admin (Configuracoes > Menu Lateral > Abas do PDV)
            if (pdvMenuConfig) {
              const cfg = pdvMenuConfig.find(m => m.id === tab.id);
              if (cfg && !cfg.visible) return false;
            }
            // Permissao individual desse usuario especifico (admin sempre ve tudo)
            if (!user?.isAdmin && user?.allowedPdvTabs && !user.allowedPdvTabs.includes(tab.id)) return false;
            return true;
          }).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              title={tab.label}
              className={cn(
                "flex items-center justify-center gap-1 flex-1 sm:flex-initial px-1 sm:px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[9px] font-black uppercase tracking-tight sm:tracking-wider transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-primary-500 text-slate-900 shadow-xl" : "text-white/40 hover:bg-white/5 hover:text-white"
              )}
            >
              <tab.icon size={18} className="sm:hidden shrink-0" />
              <tab.icon size={14} className="hidden sm:block shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            title={syncedAt ? `√öltima sincroniza√ß√£o: ${syncedAt.toLocaleTimeString('pt-BR')}` : 'Sincronizar agora'}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg border transition-all shrink-0",
              isSyncing ? "bg-white/5 border-white/10 text-white/30" : "bg-white/5 border-white/10 text-white/50 hover:text-emerald-400 hover:border-emerald-500/20"
            )}
          >
            <RefreshCw size={13} className={cn(isSyncing && "animate-spin")} />
          </button>
          {(user?.isAdmin || user?.allowedActions?.includes('canCloseCashRegister')) && (
            <button
              onClick={() => setIsRegisterOpen(false)}
              title="Fechar Caixa"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-rose-400 hover:border-rose-500/20 transition-all shrink-0"
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
        {activeTab === 'venda' && (
          <>
            {/* Cima no mobile / Esquerda no desktop: Terminal POS + Carrinho */}
            <div className="basis-[50%] shrink-0 grow-0 md:basis-auto md:flex-1 md:shrink bg-[#fef9c3] flex flex-col pt-1 px-2 pb-2 sm:p-6 relative overflow-hidden justify-between min-h-0">
               {/* Top Bar */}
               <div className="flex justify-between items-center text-slate-900/50 pb-1 sm:pb-2 border-b border-slate-900/10">
                  <div className="flex items-center gap-1 sm:gap-2">
                     <ShoppingBag size={10} className="sm:hidden text-slate-900" />
                     <ShoppingBag size={16} className="hidden sm:block text-slate-900" />
                     <p className="text-[6px] sm:text-[10px] font-black uppercase tracking-[1px] sm:tracking-[3px]">Rafa Arts POS Terminal</p>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-3">
                     <p className="hidden sm:block text-[10px] font-black uppercase tracking-[3px]">#001-ALPHA</p>
                     {cart.length > 0 && (
                        <button
                           onClick={clearCart}
                           className="text-[6px] sm:text-[9px] font-bold uppercase text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 px-1 sm:px-2 py-0.5 sm:py-1 rounded-md transition-all flex items-center gap-0.5 sm:gap-1 cursor-pointer"
                           title="Limpar Carrinho"
                        >
                           <Trash2 size={7} className="sm:hidden" />
                           <Trash2 size={10} className="hidden sm:block" />
                           <span className="hidden xs:inline sm:inline">Limpar</span>
                        </button>
                     )}
                  </div>
               </div>

               {/* Total Banner */}
               <div className="py-1.5 sm:py-3 px-2 sm:px-4 bg-slate-900/5 rounded-lg sm:rounded-2xl border border-slate-900/10 flex items-center justify-between my-0.5 sm:my-2 gap-2">
                  <div className="min-w-0 flex-1">
                     <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[6.5px] sm:text-[9px] font-black uppercase tracking-[1.5px] sm:tracking-[3px] text-slate-900/40">Total da Nota</p>
                        {saleDiscountValue > 0 && (
                           <span className="text-[7px] sm:text-[8.5px] font-black text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                              Desc: -R$ {saleDiscountValue.toFixed(2).replace('.', ',')}
                           </span>
                        )}
                        {saleCreditApplied > 0 && (
                           <span className="text-[7px] sm:text-[8.5px] font-black text-blue-700 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.2 rounded">
                              Cr√©dito: -R$ {saleCreditApplied.toFixed(2).replace('.', ',')}
                           </span>
                        )}
                     </div>
                     <h1 className="text-base sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tighter italic truncate">
                        R$ {total.toFixed(2).replace('.', ',')}
                     </h1>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                     <button
                        type="button"
                        onClick={() => setIsSaleDiscountModalOpen(true)}
                        className={cn(
                           "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-black uppercase text-[7px] sm:text-[9px] transition-all flex items-center gap-1 cursor-pointer border",
                           saleDiscountValue > 0
                              ? "bg-emerald-600 border-emerald-700 text-white shadow-sm hover:bg-emerald-700 active:scale-95"
                              : "bg-white/90 hover:bg-white text-slate-800 border-slate-900/10 shadow-xs active:scale-95"
                        )}
                        title="Lan√ßar desconto geral na nota"
                     >
                        <Percent size={11} className={saleDiscountValue > 0 ? "text-white" : "text-slate-600"} />
                        <span>{saleDiscountValue > 0 ? `Desc R$ ${saleDiscountValue.toFixed(2).replace('.', ',')}` : 'Desconto'}</span>
                     </button>
                     <Badge className="bg-slate-900 text-white border-none py-1 sm:py-1.5 px-2 sm:px-3 rounded-full font-black uppercase tracking-widest text-[7px] sm:text-[9px]">
                        {cart.length} {cart.length === 1 ? 'Item' : 'Itens'}
                     </Badge>
                  </div>
               </div>
               {/* Visualizador de Itens no PDV (Compact Items Cart List) */}
               <div className="flex-1 min-h-0 my-1 sm:my-2 bg-white/70 backdrop-blur-xs rounded-xl sm:rounded-2xl border border-slate-900/10 p-1.5 sm:p-3 flex flex-col overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between pb-1 sm:pb-2 border-b border-slate-900/10 mb-1 sm:mb-2">
                     <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider text-slate-700">Itens ({cart.length})</span>
                     <span className="hidden sm:inline text-[8px] font-bold text-slate-400 uppercase">Lista de Lan√ßamento</span>
                  </div>

                  {cart.length === 0 ? (
                     <div className="fxúÏΩ›s‹∆ñ'¯æE™∆sYlW?%À4IER6g$ëM“∫wZ´ê¿»Çç  ä.3bﬁÊqf˜a{˚·∆ùà±±1è≠ˇ§ˇí='?ÄL 3ë(ííÌ€[¨B˘yÚ‰…ÛÒ;Qp›_!ÁQpMˇÈìàÑy0Œ˙√ ŒÉî¸0ÕÚ¸F|ÕÉÎ\|ûÙ◊H6ﬁòÙüêl‚É˛MeoâØ´ùÌˇçÆÕìQ2ôÑÒ≈sÔÇd·œ¡÷lu˘ñ#/À^{„`´çBﬂbVkyy–__^^zºLº8„◊≥dÉYjW—S•"^‘w%√ÔX›D.öıˆÎ…ı;,û}[Y∆ØÁIú˜œ"O≠Ô´Âe2ùLÇtËe…S¯Zﬁø
˝ ÌlÔzi∆£Ñº/”`si“ÆOïf|]∂"â|πè°cÔ∫’ª∫åçÌlüQ0ì8 IF&i‚Os¯{$
≥‹#ﬁô^'d‚•ŸÒI/%‹	¸–OÊ¶n.˘·•Ó∑E≤A∫Üw‡πwîrW»8å˚£˛2I.ÉÙ<JÆÄ =h&	'„~6Lì(:Év¡Î0û˝ÒÅı∫∫Ùd:◊_±êÌlË•˘`ÏM∫]\'=˙◊ãdkõÃåØ¿5L‚,ßÎdzñ'πë-˙u‡•ÅGû±œì4‰Ô§¯Áü¶^úá˘I˝AÒ„7∂§A>Mc”Ä™#˚cp≥5Én)kdãõLÆ≈
ükÓ≠íé˘∆Ÿ Øq’êã¯˝Ë	9Œ¬»¢ÔEπÄü&ñA6O≥û9ù˘Uƒç%:z·MDﬂ„*•´+†+Ff.ï`=¿„K∞ `â2û+Àt¯	å¸r1ÚÿN1Ãcü∑-ØE|_«Ô2ÎŒF¿G~Ï/;vÆôBk∑◊nÉ∞Ñ£‡8`ïâôk‘I[˛[·|_Wÿ/p{∏M¢ ò∞·<ºÂ%W¶_›[Fƒ(∆–¥[Á˛ÿ∏º∂x?∞⁄ÄÂê?¸°q…+ui∆Ó+eÏûZ7çÍ~’¢jMÎog2á¸@∫_î7yÚ"º¸ÓÍ‚ &∞zÇÓ¬`°Gzã∑d¸ØˇÔ‚‡ñŒ„L⁄ı¢s¡º[Aõ@ûºÒ¢$%è∂∂Æ⁄Û0|ú%Õ3€d˘”Ã_0R/Ú˚Oñ[vÌÒoê˛Ò∫û⁄ÁÈÛŒçQÙ–?˜ {ÀZ¡à…8ﬁé,;≤JÕÌ´[.´[!Ü∂ˆ‡Yí¬¬ÂîÕß>õÊy∑ò€$ﬁç¬·è[≥.ï§¶ÍY7ˇ˚¸¶ÇHèÙWZã4(W˝5Ë◊à˛√p’_«?#¯√;ècr5ÇaìôŸS`f’}YªwE˛µå“$c<í›°ejUŸh8M≥$ÌOíË¥Ë5lÃÙx/Ñ≠s∫ø⁄fÕ˜›∑-FÓd3è¿"ê$UvÚŒvEhi#éêá!‰ﬂ<ãÕ‚ìêÚŒdÅ‹{R˛ÚaHŸy∑ ≠)¨B^Yêûe0k@ ◊›D˙B∂@¬ ä¡)û¬Tl–s™3ÌïÑ7∆›N±ã‡"MÚ0Å->´ŒsèI3–ú ΩÙÜ^ç`´Ÿü¡∂Çr4®£™YdjÇÛÌÿKoËìÓçÊDs»Í˝¯Áèˇî?°çq# wŒ*»2Ô"8÷í\©¥≤¢◊^YµENØ⁄¥UŒ≈ód¸	hS#œ>#i0Ü9F›·óiúw©ˆdÉ$ì Æ›üìZ›Y@[∫v/Y€˝NU⁄ñIû ÌV∆˝Uÿ
“X†ı«tˆR"~†- ≤D?VM&iÒœI«≠N˜ÖqgrÿÓs≠Uä¸<´L/ı∏+åøñè›L?¡µ>ÎOU-–ìÂBî∂S\à£ù–]ﬁ√°NàbüÄ1ÆÛ"M∆(âÕÀY,kR,]QÃú‚ﬂ÷ƒÚ;xÄÌÏ4ı≤—Í}Æ-µƒ˚^Zè:ÌùöÈ≈™_~©
9ãn öÕ0ûLsá˛^z—TbIîÇä›îZ∞
F^|EtÈ4Ç]9,äcáí` å˚"»¥Nß’ëƒ/í·43â¢ÆãåÚéQ˘AZ‹Çÿ{“Æ7»0I{ö|Ê·ë ÈqÀ
x√(ƒC ‚`0pY °ÍÖ„q´s‘ÇG(&¢>^Æ®BÿÌUX‰≤ŒM∆3U≈™'uu£¬KŒq(7íiÖq–è— ∆n)ïØªl˘çK©qZöW≈¢Ÿ“tk*ﬁlÊ´Ω`8@Õñ˛é<O`˝è…Œ˛ıêœíÁ q¸›RΩåäjlí√LÒ—ÃuÍ-vÆÿì‘qUπ†ÈåõFnÕ¥Û∫Ωn5™WJ∏B€¸/àñí{Â/l€ìiî5ò∂-¬ä$ùòÏ◊ Â{√0øÅÂ–Ÿ>⁄{CvÅ“áπÁ'V≈åç $É¸f≠dœ◊N˝T}Ç£µiûÌ«ﬁYíŒ£¨vœºí∏]ƒËz√#Y')≤9ê$“èˇòÜ	äæÑ¡ ˇˆ_ˇ‰i?M¶=‰ÑÙótÊ◊≈sı¯Î∆ˆ∫ûüL
m∆©ÖX≤˘ÚU∂\ë{*J"€©J;Ä _q
Ú]Z]& …Ë+~Ü™OUûk§”¨Z<¥Õ‹|¿R+Âü•mhΩyx~Æ‹73dõJ‘aΩu∂≠$òë√X")¯z~æ`◊ë6H`∞g∏oﬁ–>ÇIwÒ\†Ù˚i‚eywF∆Le˘∑ˇ˛ˇêS*7¿∫ÿB¡• #sô?˛OíL/√)I»Y8	‹Ñ/2<{f R¿´ˇë‰SXAÁ”ò:±ƒ~Úh∂5ZÌi8`óÓåBjjŸ{éÀmoË`3aÎJÄ∆«–íÑ5ÅxIÍı†Ë1û£áaœL/¸ùéÀµû^dByﬂ”.LÆ(^zLJ›Ì“∫Fük\¬ÌË∞ÌäbÉ3	Œ^'∞ÖáC*,ê0&W!L‚JÁÚOhÎ8Ã––L≠±¿ñÚ¿_∞äÒç'Q'ó®‹Àn‚!È6{q"l5Ÿ"ﬁïÊj“ ÿ}ñ›ÍZ‰4º¬s“e≈…›_lhpÂQrE	ø[å5àÏˇd(ã«ﬁep[P w3/{Dvê®—oÃ„åV'Ï)<Hºât‰´x¢<¨ÍMÜJåp˛%¿™ÇJÜq∞––ß[Ä3g‡‘„?Ë4ñ“™‰®ÿ>°’@˛Yf!t3√	9/¶©Æ˜K.üÄN~ä’Å¬Mô2|¨πSÊ_Õ|¶¥°`ÎÂ0≠x—‘A1ÅœÉe,‘Ï¿pƒ±™‹ØŸùØ
UäÚ–⁄Ú√ÚªrdáM¯ÎÍòΩcfdvÊ§ï-å‚Ìl
«·gÉ0€ÒaÃl©*Ûªh¯Ó&Y ¢<î©œ¨pë¬”kg˚Öó√¬†'uÚ]ÚC–`y54ß¶˜sÿfgíÁeX√ O^èàÇì<Övt‡»˜¸x°•·È¯t9Â^xÊŸYÌ°ì´ˆ<«⁄ö‹˛4´π•‹√”Ì˛òy—∆	'gaê%≤¶ÙÔ¡∏ˇò'ìÚí∫‹=~∏’pÉÉÏÿﬂ@˝c:ºÖ˛L’ÖYı/'hxI|fÂÒoëz∂F}I6ÇÁ–Î§ñyiPßKÏ˛I‡•√˘Ÿ∂:⁄√°
÷ı“ª®“‡ëæfw}‘û¿k°£˛◊Ã¯æb<ãœ∫ÍÍ˝Â¬n¿ë'π
|÷«àá—¶∂ª0Ù‚ﬂßs:ÃÌ˙D.à´ük≤øü¬^≈·$àªy⁄†„ª».nÂ9ä°úËl™(EÒ5sWXY)}ù
*„ƒR®fƒïbUsóº°@â‚êU±î«¬™''¬∂µ!R‡FÜ¨¢ˇı„Fœáπ6êÕ£hö©6‹«s)’5YCl≈Õ≥9/yª }F
∑2˝Ññl¿8{¯~·±Õ<ˆ„§Ù÷∑˘‚ø]È!_Îëıy¸é∫ÂˇÑƒn”√;,¬|‡∫µ?§—aòà—ËÔÛSÉ™µï’Z∞pI˚,#zÿ„rπŒ
4ê∫l0t÷π–++ªAO?’ı.Uu®›lÕn6≠≠#f◊l√dŸ|“õmGã≠U◊Ê*K∆ºÔÒÁ˘÷'Ω‚ùeI4•ÆÁÁyïÌ>ÙÛ!†ø≤¥J˙tVÈ»ﬁ–“PØ·îpé±~k‰
Ãe§rnÉ hÛåsS≥4—ÖÄØtUÀ»hﬂ£Dπe◊8ﬁ:Õ®ˇîÔ∏wd6+˛Æ–P¡ñÇ¿EŒŸêÎIÎÎn±Á¿¿≥%GY@ÍU»⁄∆%¢Àû≤ªsLø'œévéÕ∂/Ì‘õI◊=°\ÂKt∆l¬DçlpF∞ôv'H °C)1b´ê ‚ 
‚ã|tãboY™∏…“∫Ÿ"’˜¡Œ'ZöÜgm¥õÁâüd⁄°®;ñõ|¯PL›=|u¥≥{Jéé˜æáø/NNurÍù£‘ùÎ∑Z∫>¶Ì±Ÿo˚Á∑]^ö}Û•ç∂pi∫ÎÚí°o›~+õØÁ˚ß	u‡Ô[˜´ë(zçªØ)–ç}jê6π„çp´™.88Sº≠…ã∞lë÷–BnWÅ^øÍvÙî2∞JxÂwùèì*fñ∆?9t8⁄C©˝ﬁ)ˆOØf¯ »ﬂ÷dÁ™∑tk(ªWú6W8,∂ùl,uvò¯ÅªÁyÎ&ÆÀkùÌ} §biÄ£t¨ºŸÓÔƒ›Ïﬂe9b‘;¡…ﬁî*ΩAe≤∫H	ùµ;∞ÕAôW˝'‘ÅDUzñ‰—Ë__ôQ >˙V£˛T˜î•|r√Û•bç|h*±˛lê	ÔvÈÍ‹jáBã3aÆ>˚’;ÜPÂW≠ò≠·è7z†@a?˜1QF“™P ≠*«Ryvu›(;%∞§©z›™≤}?Ã_+Åìÿ¸÷©bœy›èÇcNã?MEuñ}≥æΩå
óôFMzù'µsc±bP?(…ÍoWüq)N¿µP7ÆÚπ.î?ßÅ⁄‚ZØÀ‰e—|∫†÷AÅMwÛE'ìv›lÖÛìy˝6ÆÆﬂÕmSøóI:
‡ívcg‰ùÌ7á/O·¥≥sHè?˛∑ùW˚ØOIóa1C¿bÛ6◊»ºj-÷"É‘∑"aY◊Çwº]g^tIÕ†0˘qF–q>ÇÚ·FÄI{MfíA7…Í˝T<có◊6/Àò¶ì(–sˆS¡0ÿâˇ2ã¢i*Ø`∑c¨"ºà—X‹£®˜´dªáØOèw˛ùI‘.¨éãj‹3ÍF∂%+’/[ò@’©´—/E(†w©R$HõΩRò}Î»ªAòûïˆ≠{Ò¡
Dsh˘∞"„ºªp∆pÃ¯9hr„–ÅÃπª¿¥*nØdJŒ}úœÖ‰oMﬁ‘Ω!π7˜.RÔÜ≤˜_+ØØ„ú›Å”k@”~=|˛≈¡Îùóˇ ¨˛Õ˛ÎΩù_;S?H2⁄ƒª‡>19Ü#ˆÂé¸‹›ß»Ïä"ﬂ(øA—≈Á£˘SÔåπé¬ù‰ÜIÕ_“†áƒ3˜ÿá£˜”‚P˝ƒI^:qØW‹⁄5T:≠p«ñ4π2v†ó)ıe©≠ªıöÆñ9…¢—Ë¨_?≥oÍ£’:Ω”Ü—è»´˙,&Á2≈U]°UíXõ–êÕÔËd›‘⁄"q¬é¥»µÀ¯¯œ8„‰[Tπ°!ÊM˚^F˛@NÇÙ2¸¯gç}esi¥™£~Oå∞’7πT~öù“åz‡ùa2Ü5∆ú?Eóñ…º≈+?∏¸$P–‚Œ©Ò.∞áò¶_5°^ÂŒÁ)±^•ûè€i”‡|kvIG%Òºyúﬂr∑„s∏◊Å›iLÚ≠Œ‡: Æ{¯oßŒÿ:í’ñÏ∆ì$ÕﬂÖkÈ¿|Z,√0cE¡ƒ∞“tJDöWü≈v]ÔÉçP‡wRryqç<m,KE ¨è”`8MSÙgÉ!>ÿ’ÚN'¿A˛ı
∏ö¶ıŒıja¡@$∫~¨çÌ/}'ÍVcÍ>€(¥‘%-_¯~%û/dÖ5y{Góî˙‰ ´Ô®·bãz21ÓYf‚éf˚◊ï©÷IWïôÆK“˝}óY4NSA∆πﬂÔb≤'v/πä+S€jñf‚¸Öx‡g,«H∑iì}nS.—∆ÅPjíü/Ω4Ùb‡dY0L`n””ìÛá$R[/˙sV&ŒTSEvö\\DÛ˙⁄â"˝Q hÅ◊é2äW:˙gm`ê{A$präN»"?Ä^q—-≈‹.~–7vsÈπE‹º€ÑJ”§EíínÆ◊OéwúYÍòÓ6´œß—èØºÙ«ùÏ»˝vì˙äM	9Ú.“’NÛÌ‚g}˘¯Æ?Œ—ﬂçíÃ ëj¯x†J=√˝‡^®=¬—F;Aª¡ﬁgX?¡Ë=Àº_œ®´D^]w÷U´¬ß%Ì=®<†,πÂò_£iòíÇ”S._ø©j"Sã`ñù3ËÚwû&‰H©‚Ë¯ã89˙	Ÿ=¯æœèc¯∆Æ^{N!-•¸ıvy∞º˙N+Ñ=VTéÏ®%é\‹ªî(úáıx©Y˜m]6"°GíÏ…BèDﬁY¡wËFâ}Ào√99ﬁ ‚‡}[w∏Ê≈∞C {?Ù‰≤‰—)
ì5rÊ≈¡ˆ˝áQ*¥6ƒE¡¡2»Îeæ#¥“]ò)π≈¯µRﬂ7¢æåÜa}√´bÑ∑Ôò´†¡I–|4†nÅ‘!∞˘,ê9ı7apuÍùuÒ≈·ﬂËÄ/¥W@!ÙSÉ(‹xXÜÃˇ‹H @Üm¢ëÁTé|î≤ô-N® @Ô—?RFÇäñ8çﬁ¸BÖé˛”:ezÈÌoé/X._Ü:©ô-oÇFŸO3∞Ú%>ç+Æ·§Sı721≥Á^JÅ8òy=÷ΩAéÇÏß)05Xá¿nb&˙‰tS4ÒøpHﬁIÓÂ”å:)Sòÿ@ßcÙTéGé,Ø–È!Á·á´É«uæ}˛6ùN≤"u¥Ó‰l
tP+«uÑü⁄bÔúb ÏëÇ;«^èv‡ãÊƒÙPjŒQQÚmÿè‡OÏ2∞™ˇÛ∫¶∏¿’·ö¡¡¬‡ÁÔ¬ Æ
”]Eg!)4h|ƒ$Ì≈8ñ!-m©]º¨µf+âÉÿπUeÑ(≥™´Fsîóf¡W√d4T13‘nRxX‹fj&5˙XXòõ&
EŸÀp<¸ú2	M/äÍñç«Y∂Æ™∫¢™§]]©˛OM^¶fmîIm`F∞i]T∑BWp lÑôÎ#ﬂK?˛5Ò1áQö%‘∆èÿJÕ\–Ñíd„~&ûƒ˚‹ßkïcÌ¡SsiÁYeå÷wÍkUÆeV€wˆ¥≠Qœ^äQôÈ∞<62«YV9Œ“W≠¯l?P:‘õ©€¥ÜiVÒ™¨˘Ël{˘«øòÏµ˜6áßZ∫Ü<MZÃﬂt„˜4É≥ne	`ºΩ2¢∆h˙9y±h*¨úOΩÎƒø'úÀ4≤ÌâíÏ…∆©TwT#î~Ø¨{u√.éœÕæ—«¬¿çdd<üû$iéMMÒ7òã‚l/†∫ﬂ√ø¸ÜeYœ yÂÖAîËbÖ„ LZ4˝	≥d†’ª¯Âs[Ãû4ßò(¶ƒÈ Ÿ0Bõ;iö\°ÒÏèpÍ~Ì·7Â,Å~ÙôÔ'Ü'‹œûM*≠«°ÜßX/Óßı{ò’’WÙ6”È .—ë¥DØƒΩ¨PΩÙnÄgõÜæNÌ$ï'ÈX—âΩ7∏ã·Xÿ°AªR/˘wﬁ¯¶/ÄÅ?\ö„OÌéÓT≈tiP1·eU3Q?N|5f^¨∑5„≈Í•IQ¡.Gd`ì_¡˙˙JÖ®,èFt3ƒHÌ])ó-ïG•jÀAcd“°”§&ﬂºTîEÊ†6õcù.MÎT˜‡˚Ÿ⁄ÜP¡Ÿ„àa^I^‡ ¢PÖKa◊üÒ—ÂìëËa¿?»Í5õﬁ¨kr≈f8Éî…∞ä'™hÉØ–√Úv\=+J_‘Ùí-¢„=BI=~/§y"Îß«dá›”/pUø˝˜±≥–◊h∏…±¯…Z–O”°á•˜ˇûﬂi¨?∏òïzÈ-ÎãC/ëZ„nqO˜Íª∫O7Åd^Óïâ·æÔsO $ºñövﬂ¨˝Ò√xD•ÑÚù=q´a “‹Kﬁ˚0Gπ:iŒêﬂ…ﬁ«ø–] ¶òxƒP–n˙Ò/~cIîiûi;Ã)øˇÒ“¨eú%Q†¥‚9ªaÔ∂›KC•ıxè¢ºöà¬@)Æ˜îMˇ^öLÄ«0„õßX,¸ñqJÿÓœ/6¥Ò™ÌFÛ@aÕ—˝ò®Ùx™°@›k¬Ä	å.»7O∑uœ‰‘œfÉti¡ÃΩ/	}›£√(“©j|ìAKÅU ß€dÏëxäî⁄ÑZÀ7@¸Çyıb}GÚ˛T˜≤xí¸B∫›IÒï6K|nhcú{pRNèÉsl©7ÃÒÏÆÕÔN_Ω‹/˜£ Ω∂…gyl|ïÇmo√”ykû$î
(Z!”o®ø¸v˙˘H|%∑0H®Ù4åÍácÿ¶HÀÿﬁ£êÿJbr¡K$^X@∞ZÇFK≠e≠Lß,Êí•˝u√P÷äAîyFüÁÀjpõz7¡ñ+•åº¨õ†âsÒì*Ömê_Ãjıﬂ*ÓtXå….ÆÛò≥’5†à;‰Ÿ3∏øQÈ	Us€˙2 .8›n6˜H¬dÓÈDünY√[|ˆ≠a±ˇõ[œ¯ÆMhº-ÉœalΩ£÷ø±•$¸áÕ—hÇ≈ ©/.Ç¸9
Î¿mò“PnjfÉÉÙﬂÂ§èE√¿Nzú¯Èw¸ÿÙOÔ–œ[Æ-X/PÛ ÎN“Ä¶·m9∑∫õ÷<ÛFsa)
Sw6√%˜ª5 ˙¡ÀEilÃën≈ÈÆ$Û√¸«ó;…mê/f€∏5xW‚Âå˚g—D!Ãr’≠@Ä :ªç¬úŒº75N∞m‡ç‚j<?j‘¡M˛÷
Y2UÌ‰™o2ól<„[∞O(cQ=4@%Õ9X∂Zk
´Ÿ7`4(aî÷|YjÒó%M35Sb'q“U”ù†πÍ›Qpô&1Í‘¥È≈hzQâ ô(ß€í'Ùà è;iíS\ùßÀÜ^w‰„¨ŒÊAn°” *8¬8Ñ»ff°ªÇ˜pA GñÂ7»QÏ!»–8:FpF8G¢;ä'€xØÿa}û!€lt	É0ﬁ˚]@
ˆãb`ÁÅ-¯©Ω§qà˙S‹ã^y˘h0ˆÆª‚}∫/ı»Í*lÿñ2l1…BÆ≤£ôjµå∆è?#ü\~«X(4±?¬‰4økåJú†Õ%âa±—2˜	!À@Ã:A…úâXL.–@x´wı[üıW¡gÕ≤e-j±áé =„ìÂö#Zè◊0iØ¶∂*üfº±‚úåLÿ∆©y≤œ’“˛*4Ω∂ÅïvÑNeøîsnBÿL{∞”±K wsÓ«™x9B≠´‘ì1¶•_˜◊b’gÚY≠
ÁÆŸY¬L @WœHx≤9«ìçß¡*>K=uLàJ≠Á´FyUÏÿx&≥f7–:	ÛÁÁGNù•9˝LØ∆	h˚´âÅÌ”ösNº≥é—#˙Ød∏‚ªw£Mπù™Sg¶ÄüƒÖò¿ø÷}	õÏjfáÏöIÌ ≈b S./ﬂ÷úè$\u[Ç∏Úr%¿¨∆«ˆeŒI˜∏µµ^∆Œ˚ù√¬ttIiu^(≠Ók
‹#[∑c‚V"lúÊAˆì·U¡É≥ƒøigƒ5'“—hm5ñÀ~iIûÈÃ$]”Ê.å2U¨ÒÏ≈$∞ïNŒ/ı—_¡Ùha.©€ZMØî¶Ò©fç5æ+L(\√U}œÙ7ß–?Óï	˚ä‘5™00æ Ã+Wç 6Eala›^Sç*RÛ‡ªÈaGëû~Noô^(L'“Øÿ=”+‘b"=~îXàÄD0Á∂√¶ï=ﬂB(¸öV µ Ó¬h$’öÌN˙äΩ€ëÏïw\Hﬁ≠AÓ˘iWÇW™hCÚŒ/™DØ4“ÅÏïÁ	_y«ÖÙï‹àˇ»È=˘k£]´[ŒÌb!∆F◊a∆º”™æ6&Oõ•%åë%ùZ\fgÉgÆ¿åóÑ˘π0ü0¶…¶^D∫±óM†Aò^ LìöNÍ¯¡£l%∆≤&A‰ﬂÀΩ•f‰ƒ$≤4®ç˛&ˆ†RZƒ4qÑ’¿OùMLzUÙíˆPÅç‘”ZŸë03√Y"îO˝BÑ\ªé**BhŒ(k
COf>mÚàY&øØ© {cû√J	"∞h4XXEÓ¶Îøpöì†˛_Òh:V$à˛/fT7bÿk*T—∂†π€áYIØu9<OhJÛ§˛4{$f6&¡5PF4b>QJ©7“JÙk%¯UÒﬂÀLÄÜùiâ5?]ËlèÑ˛µ∑î)∆A>J|·5∞ˇ'ä?˚˛hÁø Zı˚ó;œ˜_ûºÖÚÏAQXXxá õ&ΩQ/‘`å†ä†_Ã∞¶å‹ˆøòAølÜJ} ƒQ@Õ◊ËdNh¡ø[ñkM~M˝«e≈œ©)Nd/J}à´QimY√ñ¢≥·è9OΩ9dÇ]w˙\sL‘R˜,˝öbQ®.ˆ¥éëªR•Ò§©pæJRC%!«˙≤›éIKkL&QÎÔ]“Ÿ∞8V=‚¢»e”Ÿ¶kd»Av_ﬂk¶Tlås£∑~•H}&]2Æbw»Ω≥i‰•˝x:Œ†'ôwPO·ú.På@Îëﬂ_zıjÈ.Ú›w„ÒÇ=◊≠|Õdáz¨÷iÑeıÈPÁWíÙ∂\ºhSìéƒÖÜ¡_[£√ÍR,V®_ÍÊü¡	I⁄&*nJG‹ÿìPõÑ‘uÒ∏™éa€†:°Nvî1DûO–õ{	"¬lh!–j
 0ï%Àr√ßï*ê÷{*Ô.R^@cR'y“Iö‹…8'	@Ñ‡X±ÑßS£dJìŒÛCEMÃ4âës”*úå˙˝>yu∏wH3¯Ì‡W˚…ßàÇ·1J:ÚbK ƒÖ∏lë.^¬ˇπ¡ÈÙ
G
ëªIÙGÍzëΩÖ®≤¯dÁÂ˛{lÈ˚›√óÔˇ∏Ìwß'Ô˜ˆ_Ï|ˇÚ¥xj≈‚ì7£r uΩ∫%ÙüÂˇ¯AÁ∆ßπ≈⁄x u~G±¨∞w3ÏÍn»-˙Ê≤œ•ª˜¢)´ÏÀÒ˛…¡?Ï<áØá«{˚«å[π><ÔÚby4Ÿ¥º¬W|ü¨”úXÑ„$~ïL≥ ˝ìä¿jÜ’s¿∫{Ç(—ºE=bŒñùƒß…t8¢èﬂµ,\¬4,ì>Cm†ôôY‰
ÑG.∫B¡˝îVƒ“Ñ-Ò/ò¨äIÅn…≠Eòxöz‚} xπáØz)Ê’Ù“ã)‚·x8Â”X—j	–“G©‡$+J¢3ﬁè*D°Êâ+j6™òyÕ`¶#(Ÿ†˛ËÕå•’é¢‚ìsâ–t&≈T£ Å§0J(o√>IìIíRóÌ¯)õóK»∫ù/ò*∫˚¿ÖiÊûŸp√u?0›”(Yà+éÕiåz<IaÚS8âGpÆ_Y^˛è8È“¸ÁA‰ôCPæ>3Qf"wá]ûHø≈–± BâU|=⁄ê›ƒ/í•=‘&d ÑèçÂKÔcñ◊,9√ı‘w5°5°&"dÿ—§˚ ÍëñWÖºÒ‡H∑8–fn-Êé˙	¶¸]‡˘ÃŸ%'%E	‰)C•‚äìÇbÅ4ª/zÒ+/ˆ.!9Ërfmó=KM,«Ëú-é\¬KëÔn›Ö€8∞õ ÷¿‹Vü¿:≠¬i˚äin¨ôMÊŸ≤a“ }CËwn	©Âº®∂lHiõ∂˚ÒüÒ£æ9Ï±O–Tˆbkp1ÈõÇO‹{CÎ|≠QA‚∂j?ËõEüπ{ª¨Ì»®·RXµÙçaﬁSkË˛]oÃ%Ú#leL@”eõ⁄‘Y$ªDÏπ˜€;∞<˛%»,•ô≤^„•bIS›(Ú≈f≠(èBƒá¯ô[mPÌπl{aG^Ñ·±‚Â<…aøÎ”Ì/¢I-•0ç[E!à]U“íÿt2Q~¬¥ôˆ1}DíÖC/)„≠∑tw˜<zä•ccéÍ°eF”aä•ÄÙô>ÑŸédÇT^4ƒ-Ì%˛Æî«Öí¶Œ'Whq„¡N	¸¡9Éª;T´ê¯¥Ît(Ùëáx9iúô^ôó‰¥-*	]d◊8ª˜„™÷ñªˇπ'º’nóv7%ûtÉ¡7—cÎ,πÓ˙	]Tëw—«ìè≈‚≠å◊DOÃ çœ2G$h¥ÙtmÀ)7MÍÁ
àû]ª∫X;Ú*£“%n€FÒGö„∫ˆµÙê…DL¢Å}|ı⁄CõöñÔ.•≤ñ°¨Æ•vé®áÓsXO ,,™iÎùtûå¥ì3‘YÄLdÕDcW‹“è®
Ì'OıSÈòà1´÷ª›©ﬂÎ∏t≈Í@j„¸|$Ä`4“˘íybvŒÿ	Ïn …wEb–•√Ù„ük‘°P(m0–öYïﬁHÖÖúË0…¥úﬁÚõP-XÚ^(hö˜B„V§w“Õ6≠˙mΩ}≤Ún£=¬AOÔX“L◊Y‘£| ›/ø–¸
Øﬁ.~@ƒ(-8î2w%J—ç"•≠Ô4éÆÒ:”Êé»qÜÇ<´4+‡›.FJnªEk∫ï÷=bOûÜ„ ôÊ]	'®˛*E¯ÏëıÂÂÂ&É)ª∏FÊMê)~…e£§`¬éì/ùÑÿt*µx‚*π{ã(B~kmπû0óõ^[òTŸ’LÍbP©—…E÷ÖÀºÏüí ãZkyX∂ß[m`#M /ﬂÖ(ìÇœf≤¨dO™ÿÎ©Né2À≠Ô·i”mÁ:â˚˙⁄(CÊ´˚Ê⁄≤% ∂N&7u∂ˇÉ8Ñ2XDA∑ˇ¥Ω∏Á6ÜT-˘âPhoÓi¯™É&˚∞Ωå∆=˚;πh· ‡6zT„ÉzÊqêçÓ ãnıcZf Ç§ÀaŒ8éWB∞ÕGi‚OóíÄ‚6ñ1ı/Z—éâ.]~¬Ú21wQ-5Áô5¡ˆI-'Qg_1ÎæÊîLCg9r0”i†Uu8<1◊PÅì¶ÛîØæ03]}?A∑ëπxqlÌƒ·J|ãc5†*&ô¿Ã¢´!=7!≤R:⁄…ßû&%ûz)°ODfå¯Få·5LD√Å¶LLY©"ìø¨.´€Õ$B=⁄_iV„Ô¥‹É⁄‡ ◊|“¯ë¡⁄È∆›ì”ùoÖ˝Uy°o∆ÕîØMÊ¥œ‘>®Ò·$XQ˛»Í`3¨6Ó ˙ÔÄõ∞rö⁄©CaTö≥ƒ÷…›˘“Û$˜Oò‘OSœGÁf(£û∞^ö>¶ÛÚì¨GÄ°√OXÏ7q& Òd@^3Û]z$
hrY‰Bg¥ˆqíÂhgïÙä,Âp¨Û$t(ütÉÎ¡9
Ø7»Ò+ÀÀ=† 8Øáq˘}ë¿Å/ÜX˘πQõntë4—aÜ]oËëŒ| #Íê`|å:vÇ¶æbÏbÍG„Bá¶c÷¡ÜÚ;8Ù¿1)”>KjΩÑ≤òëë–q±…º¨⁄âAóF;È9Iı5ô]J
ıÙ"SŒy^¶p≈1	"ò"¸ïªŸÓ¡æF‚◊F—º»Æ+·œ»¬1sÍA[i√CXDOB“\b*ê`û5Ô-c=;Z¶+it9√ET#a3UmÂM©ññÖïïﬂ´ãÛÕ1¢≈h5>)0åò"OŸ4§{kÀu_y¯(Z’ÊE™^,BUÒÍ-*îÔä*≈Ω5]jM∑jXo£Cl£˜jeãå1,õûÉÜK¶Ì.52mS(°ñ
 ÜOãÇ»ÔEcÖÜÑ∫Ÿán¢«=îé›A'<ª>N_´~æÚëË˘kI¶gkóôS¸~Q7Ó¯M¯¶æ@h°Ó*—4?›Ö¡zz‡˘y∞iWW&◊A¡b$6e)π)£X&HX[nv(«´ÿ˘f‹¨¯i∆´Ir@FqÇjñgîÅòŸvw∫ˇ√Ê¸MEBI ˝§°#∞A„?±zëÀcæApÆ 	∑èF!Ï˙(Å5 WÏÃÿ•f‘E™$„©«œLL¡∆“˛Ã+Aî¸f„Ca–h“ci!∑ì§ì—ãç¸£≠-jn~g¿"Õ*¯Ï¢I/€Û^CßúÂû2πä¸3¶a¶•  rJTò´6N–lÃ¢—g¨GŒA‘π‰x/É¡`±çÚRjz™≤muÆƒ·S"#∂;£ î‚i∞”„tø-#^IQKO%Äë›eâ"·›YaI=ÿ~@a'%nz•CªGó“xVﬁí,hã∏7Éú˘/8Zè>ëN]%úæ£úíÉ«ºdêÛ¡πeáC¡©:òzèùL‡_ l+l∆t|áˇí	5!∆—Ÿç0a{!ñœ“>p@x¯ƒ2,˜».å¥°ä .ˆê©FSx3œ√(YŒJh>VÀèS1œ69Äû£
nÇG\Ïz•hà‰K
CHùOœûf‘õ3°±ﬂti'1òYò–⁄r[≈áIwhªﬂ£Y`çÌ,/vvìºkôëÊP„a#R¯1/öoàªÚ• 0¯î©◊Z¬WK}µˇ˙˚˜ﬂΩﬂ?9=xµ≥∑Äƒ„˙2R<Hcﬁn8ˆ‡M
/Ã∞"Å™%ok‡#õ+ÇATGòÇ;eYi‰3Ç¸Ùÿ©O6*~‚Ç$†0+•jë1 3ñµ5ª‘√ :êÃß=˛9åª¥ÿî◊±∫º‹SjßöÙáßãV Mvôp†ÂÀD»¬E©©GùDáeöb\÷]uKwÿyÚM’2Æ¨Í+˜LÇÅZëq†,Qèk‡n+·ªû•_%i&Ä—80Ω]∑ ﬂÚ◊ú∂–ô:|Ø-EwX\^πCÄk5:e∆@â¿˚F†ØÂwM‚%3√mQØ√‚òºå¡hÖ±n°Ñ˝*‡⁄ıœPPC·ñ‘áã” ; ˝«ísÂ”f8\WßtkñÄù-œÚxÒºúz/ªâáDrå∞Ìπ¬øÎ]ya]LÆ@9”qwae,Iü\Í´Òl#‰≥Ö≈≈≈b„6jho]‹]+	‡Îgª"SÆ¡E»óùmÜ∏¶√(XUs”—ÙE©»ù„∂˙ŸÂ†™x‡II∏Êπa&⁄{ùâ"]i#jß2//@‡>ÖÔÍú”^µôãöœõ)®±q~gÊ≥˙Ω›ÎÃÈ¸œtKßÍ$ºà1œa†Œ∫2âÊ∂ZA "|VﬁˆmÄñ8òﬁÅÈ|7eä;™ıPM•õ∫Ë3¶¥U5.ø∂bùkéÊ‚ré√so:Å∑–_˚uÒß›dr£é$S>¥‚MÌc(äqu√…mÒfÃêú\$=ﬁÍGär∑>D@ÕM/36ä*ZD±€P5R1•.OGHãBΩ/OV¯w1¶“z¿ì¥†ˆ1{Ó≈ï¿µm≠ÏÅò8”˘£ƒîbºÄ¢Òáb‘RîΩuLè0gb§+ÎF∆¢”vú®ıAŸnëI›:ß©óç*r9”‡∂>e˝r216¬#—⁄Ω0û’–ú_àëÛÍ‡ı¡ŒÈ˜«≠¿a ¨⁄wƒ∫¿å€¯∆3†ŒlºQ~]#—ÖÙuù\G“◊«TŒÑ-Ò7Ã€”˙-?¢õ#[)"°	‹Iço-7$5≥@5-é∑6,sàÀík¡Wl%sItøÇ∏XÜ¢wáÿf∑äÁûËçºOjé%¶>Ò‘ﬂdQ/™w.}óT?≤’™œXG„˚µZ˜Úr…À#◊˙·≈ŒÀ”4ı~·ÊÀBc˛évæ=l∞‹n.—qª⁄^3¢ü›±öF:…P+EË∞s‰p3 ‰ΩÖêj˙ıÙo6~¥a–õ∞√X 1EnAD÷65R6ÅqçófpL˛˛ô$à∞,PÒÄ’«P@c"µÑb1ü17 jı']™›«¨ûã3)FÇ'”úÉ0Ïªh8†à·%¬RìVU;¥é∏Ë ∫`ƒÃ¬F;mjÛª{1˝ÊÇáÔ>L4Œïü5nXì§ˆ^¨Ué—ƒÆ∆Uá#⁄\1≈˜H´ø∆∏‚{à,æOäΩØê‚á"ZÁ@„{#€∆çŒÆ∞¿”V$∑∂ﬁ≠ˆÌŸak!ìº˘–d◊'´∫¿œaçf(VHx≥—Y=iŸ≤£ZóÜË’[äëÊ§MΩ€∏›ü¡X7Xéû>≈‡03Ø∆
¨HªÒËJQ∏√“ΩwÇ◊ëÚgõQãûÃiƒØyß˚ì6u√'I +nÇä¥ZT+•Æ…&+gõ%4üˆ∆·¯Ád1”ƒ«U
ö[6öºdçà¥ ®y´n˝j3f¥sŸªÙÊ¨∆˛R√Å‹›∫%°xDÍ¨∞Mï´Q2_µÌºãÔﬁR⁄¶§ÕµÿùT¨!÷∏ö™£“ç¬v+V•áöÏ˝Îa4•î≠êZı•…ft7√L°ˇıòg^ø⁄yI∫¬Òü®¬§j•1j¸å-+dÏo»∂◊µrakc º¶î9)w1£hl∞¢∏ŸPûm(Îw≥°‘Û,D≠;T≠(≤ÖE ÇT±I'gFSõ•&πdóƒ€ø-[Õ:¡ˇc8M=®ï∆≈∫Ìîõ…%Ì˘Êh›˘‰*ßUiej≠;4ÑßZiA‹3¥; ∞≠j\ŒŸÔ›¯u?Æ-ΩŸ–àÜóÉ!ç=Ê≤4¶+ºösí≤fì	Ü|í›4DkB3‡òöñÃQêüRà*("ç†ÚŒ≤n\!Xì‹ g1òıñ¿—˙D}®héÙ–"lìOñ·rıu‘GtKÇmgõé…Õ€°ï¢≠wK÷÷8~yÌ>≠¡
ØOj¥¢]º'√Q„8∑§}©¥m.;mâ≥} Øﬂú=Ø;€¥jëªPﬁˆ~=V-º\],ù≠[x›ªk˝úñ.⁄ñ˚§Ê_ß≈Ø{∞z·u_4˝9Ì^xπíu˚^˜LÿNÿ]ÌiçÃeˆ*ë’‡ƒ_¿Í;&˛wåR”ugå“ﬂ© Ù[Gﬂª«$•Õq¿$-,√Q‡O£¿ÈﬂIô√‡çΩ]òˆ5~çÉ#◊∞UØ¥ôª˘A˚fJUEı5Ã‘Öô˘}¿±ó∑Iå {U◊éwNx€–ZáDÆuw(oèµ≥¶æ«õsïÜzﬁ≠M`Æñ>®Üﬁévƒ∏å3r2„z∂çjê<\9Àyãö·˜´eŸ‹å˛ÒuhOUcjœ‘T∫ç>£ú†ãü{$ÙØçe+-Áº‡∫§WÔ
‘–2¸ß9¡<=Ñœ˝ ”øπΩ&Ï:«Vı Ï‰Gêéí8CR˜ãÍ›¬;÷Ìî_S6hÉEüÚ‰l$p&G8˙ò˚0 G 6§≈/¢áãwáókˆ≤,*∆^<D›Û‰∫ïWå@kµúeèiŒ2ô¬WM$Æ&ﬂkœÊ¬lÿﬂ%ÿ%ª(ˇ?E√ë”|ikp/[éi>˝…æQ˙‹Áπ øÚ^R™ö'nıøŸÅ,,‡˙Qdò™ÃªlûQ,√rîëÏÙ3Á≥
b"{í"≥,!ã¥ªÕ5˜É{Áôsaâ<h∂3§€%cÄb”ƒS"˙Gñ*M˚Fﬁ˙gÛπãÜá∫Et≤qãÛîj>™ª9R §Üº"eTuÖê'◊‘ÿ˘uS£>≥ÉËùNgZoœuEº√…”ïAı#%]ÁU¥ÿ∞åû7*uÏ‚µ^zirP`Äˆ¢ÌsÓFÆ-@“Îî∑ÜîWı•∞◊˜9n-≤Û¨µr«Êâˇú€&Á·π'Dx	ﬂqJ¥>¬˜±E¥ù«π6ï;Œe{kQ”º∑_’ÊW}ß}Fıõ~Xé?OFËF-Ê£∂©úàØˆÑçó+q„unÚÈ1¯x7S7^nÓÁçπò}∏ßπÉÌßôÒrå4z§ˇ≠“ë‰+›ËN}"™˘Ùﬂ	˛OGEÆD0	∏¿=Óì¥1B¿Ö>iDCköIâ’ﬁ4˜éDÙ{£ë˚fnq wüSÒq/ìj¸h÷¶õ~l˘–|Ë¬=¥’Tﬁæ]TÌÍïw•@êô'|yò˝VeÚ”4®mî:Ö¯ˆü`p«§ˇ¥∏°»<,[Ã∏ü”$äŒ`¡+ëkUèàÕÉ¯ı1ÈÕ´mÅÑ'mÿM∆/æŸö©ﬂo…4C%˛[*o—[fÄM≤ÔÓzíÒ§“qT)Ÿtú`™ë√‘ßÈ°»	oÕ&8Õ<í4ø!ì“Ù*∞®√Ñ¶s"LË∆¸*U≠§…¯®â±pÙÌoPX∂NVg1∞dyg˚(H?˛∫πaVÓ≤∏Ì∫b±æ1À+˜o‡‡sËΩåá0˝*Ø9ÃPè5Â≈ÆìÉå™Q6Æå˘ËBIÈ(£+™Ê„.(∫1—Ú?˝§ñ·C≈w∂Ω¸„_>—Tù&sM‘iÚ{ù¶Y∑B»Ë¶ò≈˜⁄ÜZ%ÛÖ¬€SUz˜VìÅ—uÒK†ÀÖ‰Å£ŸŸ~€∑‚~÷'—`Ã°{∆≥Aò—ÏvÜÒhi¨‡G⁄"´eπÕ&aïdEõÇQö{]√i_P§Mj±E3hÍÑfÍ„∂8∏⁄ò‚ÄPc6ﬂ÷ÿé78/´úçƒ"v˝V∆˝Â«ø≤ºå›cÓªπx˜ÒóMrM≥¿ÛB˛œ fËª˚òÀ«È∆1oN
hk–ÏQ•<”hñGëô»…ÆÎ≤C˙*F∂U	?(÷ÃONÂ]2Ù|è◊É¨ Ωô– r/nëàì∑≠;ÜÿDZ˙˚ãµ ˜á‡ı´my}©ö≠RΩ¢Ÿ≠P~q^∞Ü79awVñA©=Æ≠8\Óâ”r5ZUxúÇn0jW%◊a2Ê¡«iúﬂ˙¿«?'›ÃŒ˝\‚ÃÖıØ‡Éù∑qõ¥…ªÎÀŒ_èBΩõóqÄÓÓ˚e˜zi3§w5±Ω›√¿’‹∫Ã√'"~#x èÄ£¯=å†∞õÜo¬´|®·k'>Í«*/ïUóüåïÍ›ÒêìÓè…∞Ÿ÷ít[>åY5ˇŒEµt\œÉÚ–÷bäÊ!´“Nç2˚Ùsö\YV‡πöˆn›Äª¢˜‰L#oÎY7G´:y*§WõŒÉ≈r…1ÿöVÆ´6Ä"õLÉx8≤‚pˇ∫’UC:KÙ∑»H ñ+˘”º¬ »Œ>êm3ç~¥™„z#£∆z¨À¢µ¡HìÂ\Ë÷¥˝6/C˝Ô—ﬁÏü¡ûò¡≤I2%,ê»#ÎãßÈJçMhÈˆ>¥√Ê0G⁄»óÔIíÊœotáùnÔDy´¢‹C/æ—û0îP¡ß§ΩñœmõòGÁWâ¨´ µÇáÔ±—D]™◊1«ÌÌ¡œ∂HΩJiq2,•ΩÜüë9OãÇ·OíZJ~Éø∑(èy~X
dw-Jdãá™©,≈∂õùÚqs%ÊÿFsÄ~=}/W¿"Âcı©P 7ò°¯»pÅ<#˛›‡7¥kÇß?h(Áï&ÈÕ?çÚ52$ﬁ LZ˛´ øc∞0†‚ÁÜÖ8ObÍÊÖ+≠√'ı§“¸3∑≈÷0Dõ;)l–{…U¸G`„Ø=¸¶Ê≤⁄‡œ|?1<°≥˛ö‡õ,Œ∑fót_@D‘ºyúﬂrÎ 9‹ÎPË∞Iæ’\GŸuˇU®öcΩI¨ñÓ∆ËÍõ¢pÌéj&^?Ãº≥É_√å{+ÕBáµgë˙ÿ-hT2(ΩÒ;)9äº8åFûñÃ*Îß>Nne~6‚É˙ÙOI¨èb’¯ÎËù{T8?1Ú	Ñ¬s‹OæüDâÁKD©∆
’'Á òÄ12≈…4 0_ªñLÃÑl$†ﬂ≥2’:ÛXe¶ÉÎítˇDﬂÂ∞åá©à=fàìøã˘vú[dMïŸm1QQwíôZ‰∞Añπ¨IÀ\ï6—ú˙DïáUˆZ-~¶j5ß”…®¸P¡FeÌâósÕº=Û∑6P«ÜÀ_â(ÜcÄÑo¯:àG”1s«sâ«Œ%QﬁMr◊eS∂ü/y2GÕÿg≥	®u>ò÷π@ZÔ7”+çÔ
 7^Ìh`1ó'–†,µh-ÑÆ+nl∂Ø√ãUìûHÆ}e–û>[[µÿaÙ,UÃ*WŸÉdø#Éä=°vÅ‹?˛ŸãF…¥ôAzR°&Ï'∞/IàG€<zˇ¸Òü®”.ï^±<>˛_∞·•AÀ«¢9W@.mµ¿q˜ØpÄG»…∆ú0MÁ¿LïÚ¥YÉ‡À7À>JÉÀ0∏ÍvùVÅ™Ïë’'Vºƒ3•–d_ù¨5o¬x(ßhÒÅ{êﬂ.ˇûŒ√ÿÔ#,{g´ˆ≤L$jx6M˘/Ÿ≈◊°‘'ÁÔáÒ‰Õ∂V0—’«ò®îrO™≥®≤9ªˆ’l›™˙è÷ZÌ¶
*SKV\¸™∆z™Ÿ∂∂∫Æ÷Vπ"g†´ÂY¶ß.óƒts‡Ñâ?06_mC3vkÄ“ª§û<©ÊQÍq÷oÈéhK÷íÿHõ— ÓHÈ>aî
D…ÍÎﬁ@8∆¢Ì
:)¶jk&1¡¶ûú°8≈wÙ.‰¿ÌQ2ÖëZ¥Ï‚3æAŸìÖ.ñ ¥¨öa'=;ô;ÅÃKûU´›z√Œõ5J|ú-¨‹ÍVîÜ}Æ>nÄ0»!Ö¸’E˝@˘W?{~’6…	X1âçÕ˝∆ì|iHœJI¶£1ñ≤ÒáŒ”:´íy˚â&:<ç˙îÍ∫›Ó‘ÔuÓ÷•;Â∏Ø˚ÉÒã∆\$æ7˘¯óPhIåß¿ÉcA_jîÄø»ì˛%»z$&utõ$ÍÌq8Ìπé›ë|∆êhhx_-”¥0Ω7C¸ÍC7oÜë	˘S>ßZgL§\BßRƒYI=‚]z1ÍÖ6∫z	äÔ4p´G..Ç[a¸ÒØ√–äŒ€"ÉI*√¸î◊tlπõæ§Ækr%≠·ÔVO∫XO>i≈9;EìwdYXá≈=√—ﬁE‹ﬂ√ÛÆ2É≥ãûÌgÏÖ•hÀ∂Òƒ†xQWtG 8R’B0¥∂‘OrΩä∏º
	uˇ˚B-Çz-yT.˜Ó˘Œ4ªyúßA6⁄Ωí‰tiÈ
Ω˘∫=«J©+ùGÆ®ùxÜ{Î¿¥Ö¢iN⁄·YKô\•‰$eöÜî#êÃñ»!Oá}µ˚¥QCRt#˜Œ0√A?ûé≥˘@˜Ó|Zñ2˚PÏa>‹QUw›*ùj„ŒˇÎK∑z’ˇ
x…W?†ä•Â3dd]sœ ◊TÁÑ¡oâƒ:	ºt8*ÚE}SÅÂâxPå»∫K@˝›gfﬁÃÑSÚíÆwñ§Ä⁄¡¨%8Pˇ«`Òn`⁄ïîàz3ôÚÇÖ‹EÆù«ôV_^è.◊YèÊå#óÚBPFT◊Ê.-ë ÏsÜR∑íp¯ã‚cé2ˆÜ‰n é!:„°£[B:j©É‰qµhŸ¶áŸu<§…0AÅO®v»
L$Ù∆K·‡ˇ»…‡  DËa.#êœ‡ŸX„∆jŸ„"•¡Ù9¸’"´∂⁄˜¸†Gb9‚•úº«˚iJ≈1v9Z{¡ˆ2ŸBΩuë◊ò±õ‡8& 5ß¯√ÈÕ$‡7º TÎ™:ˆ≤·4alé¶‚JE≤°,Â/™UÂÓ«ó!ê⁄∞˜L•é˜3êHºˆ≈éﬂÙMC¡;0›óÛ¥◊„/|Ñ…°7«HåﬂO¯ªÜ¬wŸëiéV≈õÜíèÉ·4õg8R˛¢©≈πgûã7M}=	”πéøàÂ÷
f¯
Y±Ú†Ù∑™K	˝≤ê'¿@åê¿˜S˛ù:‚oh[ƒC∑=]y≈‚*ã<.oï•äõˆ“ƒö*€/ÓîeÒ{EÎH*lLˆ≈=©8æTÌÂÀß,nßºUñ&n6∂ÆX2J˚é
mN•çbu⁄À-óKY*[|ˇZih±&&X¨iÇÀ[“ÛõÌ+á‘>Èû‘<q∑a ≈¢êF±º% ø©-ÌùfA¡;ßA:ñW)ì^ÒÓ ©Øã∏ó…ï∞¿iW;_MLf¿›WªÍïû),†jI∆√MŸ  ^–«è`À[_P˘TE(˛ì¬[¥%V—y⁄5Ú@ó∂‘|›d ß⁄ M®·~°2“ÉIm›¢í_~—ïQsh.©RL£HÖ,IÛn◊Îë3≠›_ù-ÍÁœ7„üÀIÍz⁄vF…N;8(∫g∫g™√i¨ÓgO™N[T•:mìú´„≤pYgëc””&ÿî≥pûiü0N√[rπ˙öøA…xÅ˚ÇgïπVÿÇÜV?!ﬁ“Ê	Àµ¸] Ï¢ä∆Oïe¥¨zvÃ¶g‹¸Ò·ãôyìøïíŒu≥≈’£ñ«@‰∑fBé¿95ﬁöE”Ï∂<˜£Œ‰upU»"∑€ØìÀD —V`ö©Â/UΩ0i&*◊`^Q$Öôﬁ=ÃàóMΩàãŒíMFp¯(HMxRu◊¡∫óî˘ÆAØi√P·àI„π≤æò|Ó~'“ƒ˜«îTË?g˚Ê¨*’Qè≈sSõzÜ˙’ù£SùˆÁzà∆°nKËû”4ﬂ⁄"ú•ëXØO¨å çV¬•ƒˇû‚g˛´>û ·jÆHÇzõG’0Rœ\h≤~ò˜e6ûÎZñíî∫¯$û˘ZI&S∏[W˝´±!zÂëvÍÙ: *P .4&”î7jﬁò±ˇÌ >â‚;ù‘ëÙ√H‹z‡îBêbøa$ïç Ó6ÉÖõ4⁄ \UwLsa“î¡–≥∏hÉ≤ÃàRf‘‡’Û)πKöY´ß ≠£2ç±H}ËÁ&°ıŸ#º≥,â¶∞¢‡<áıû'¿ñVIü.H∫Iﬁ–jñÙõ±çmjƒzw\∂√˙ÀnËl‘3J"Xº[ùÁ”l[öÊ„èˇãäª…Txe=·( mJÚµUhoLRd-“õ‹Ã’Ú˛‡⁄ﬂ∆®€äËÈv{®æ6o‹m€gÜ˚àOOÓîñ≥∞b◊˙·8*‰aK‘(çë<ÊœµâIeGÉ¶íwÿcm
˛ŸRÊNˇZı≥-¸¯˙;Ì£c]√é¬Ïe‚±P!¢;D)0|O•ëGùm…E@Ê¥<‘-õÑ±j⁄z,a¨3ª°64G£Ÿh%GEIqR™øu6°Er:Ï ff?Ã:‘ñ]‘pu®n3›8†åÆUã‡≈CLıríﬂDA∂ÅÀ÷Ûfñ√í•˛1¯wõl¬Ñ uÉ,Dé«Àz	áÎWŸõr~a˙2Ω±æl|YhTŸÎRÓÜ«à.CBÖ ﬁWlﬂèk∂os#Ñ‚tﬁf:RVÄbÈ}\≥Ù
jQVF	/˛XÖÿ15A(7Á{](=e
®Ñ+hﬂº5«v1ä|âˇù(RR˛óƒV*ÒeíµÒiHZuu≤+⁄Ò∆π-ıﬁ‘sèÜ—“Ï2>÷(M†¨œñ&F÷KK#^™ó]Gxiâx;≈È‰•?h‹Œ!ysÊêƒ‹‡2åá””JvQF»4áûl°’◊AÕ∂,5A¸⁄kê)x±Á ebÂ=a’≈o	µÏTO¿é2fËÚ¨12°±Áoänëd@oâà%W…ù=X–RF≈.≤T<ﬁ¨ƒCÅ.è∞ô[’™—<Øﬁ™ÿ«å/PyY}≤∆πH∂´07*-¿ΩccR	a¥ùëÎ≤§	l≠6m:Àé¬ãQÑ^õÖ,q ÊÄeÎB$.sÿ˝Ëô/¢br$uÖ¢,ˇTq|°'`ó<eÊsÔ\—çzå%Câ.·çŒÆo Œª%¡dÖìñ2]ÖÉ/#'âNØÍI±•xREì-√òPXÿ“´‡cÕ)P	JAÕYÿ-æ -ı¿Õi‚›R`ìôÜ94∑˚^ß§‡TlÙUáΩ:˙#Kñ,∑±G7„≤ÊÖ˚?ˇ&#f-`õáŸy†õÛ"›Î†*ÿâC∫∆√‹Ì5l°±+Œ€.Öøª*oLﬁl	Àïqï#Éhõ	[ksÆZÉﬁ=Yäı5Z`’∏U[•M›∂êõ’Eú•:∞y˛¥∑¬T˛d& Â/Øv«HTK∂˝úAÎQd›ÛÙôLj±~kÀ2~°Ñ’ô(aµ`∞∂5Éƒ–åÚŒ‹◊Ô“:“P¡%‘FÌqîÓòËÕ«å–´≥á(·—eE"4zÈ.;<∫96’hâ§v»¬Zñó¯’∞+E~±íè>ü⁄t—kπ&ª…¢&eÜ√öS„ñÙÁWﬂ£!`^”~ f’qq	2_¿V]jëy†A‡ Ú N0qr…≠IpÜ©ÎöãÒ|ª¿Z≤Œ›¿‹.‰R©Hœ^.‚ä–ÖH|x5ı=LÙÃèR@⁄í⁄Ìãrß`rù/TvX∂Í›mÁŸ)é¢°=”	&–©òúªIO=ÌI¨∏Ïä‚˛Ì*5'Œãöi¶piºOƒÃ‚≤nÕU>W√XŸBScSåõäÁ™KÈ\Â3W·BGd+^ËéÊ©@(õl˛»úÌZ+{Jm÷<’™.K%•
lûÑäÃFD¸ëπ: Ùk∂àgÊöÆ©≥Õƒ°x3Úi˘àyÔ<yi…‡˛8ÚÚlg2πøMtﬁH≤m—ómUﬂΩ,»ﬂÑ¡ïlµ˙¬¡ux∫mu∆c8≠h'˘Ûõø™c§Òm∫¥b:o`#CppáÅ∞ùÂgÕœt6TµÎ2Bˆ=^(Ö˛ëHEä6ÆΩ‹-ö—ï€Ùà=Ü^ú∞Õv%d·˙{µÿ#∞ñÇÔeæ$Â€JM˘& ::kº_ÉfÇÖ∂ä>['ÀÅ04TµåVÓùãñÑ®(Ç“àáRf˝b·π•$™ÀººKΩ{≈ úêÃç~ß”Œ∆Ïæ¶›2B&(#9Ÿôø=Y" :`Ûƒ◊QøºÍø¸kâ.UJeàt≈◊j¥)wÙz¯<æı¥≈H2–öåe-Ætπ!áqÂÈ$∆›ü€¸^$)CY
·›;7à0$Û[ÿ+q”pî.c∆wE1‹π(V3}µHs©B˝„ÜËÛ £5Êëƒ40Õùö.õ˚tBE»¿»é≈Mç£¬ÖS√U±Ñπ„K7Ío†^CÏ]ªÅ=«w‹:qêâÁÄÿºõ◊≈X†¶æÃõªî$Ã!‹'	'òˆXIôóêW;'‰xwˇıÈ>⁄⁄1G`π≈úÑq˙]|√X~Äå §k%“˙bÍ°ù~åRPUèx√ À†©ò]†ÿ⁄äx˘‘ãdÁ"ùN‡˜ J»õÉ◊ªﬂø<Tãáç.b∞±D4¶+∫√√∆AhÛ&∏∆i¥7Ø¡«=4º∆ã,∆õV¡:j]dœ	Üœ 
«LL}
Hê“»Uâëa‚å0ìÉ»√Û •,ç‰∆p‹CÁVµa"2¬·CØW‰Á—^ıÍíﬁ‡¿»~v2ù"Ñ£zNÇºã©¢vÍw5§©É˙p,äÄµÁI^º®	◊+;B£ÿÀí˘´¥GrS#/ÎQ‘◊ó≥AQjcÙ†:Lª»˛)`0Üd√,L"˙Õß⁄è	RIíıöËÕk8Èu1|Êß)¸ÛÉGÁ0N¶ï)ÊÕBtl$[¡=—ZÊ‹å'iê!≤@üÉ–=®úf@‰aB¢‰Ç¶—*k ÁÈ©P#Ê¡0¶Y··…ÛhzMIë6ã&“•–g^x≠ôx©ô;¨–ÆÓp£zËÚ~Ùh8»¬ã£ªåÛ
}j(Ç˜˜§(…L"ªeªÑôUökïdÜ¬3Âëé¸ÈQΩÉ›°ï8wãﬁ‹©bmΩJãä·jh}ä/Ã{lG€f™"áv‘ıÕÂ °ª≈MeßRÍ–ÖÄ,†Ø+ıæåñlO/∫»ÃÊJ}œ≠Œv§“Æ-û û;6ÂÓ-)*“5•B0ÜpT‚L#JY∂Úî!Ä⁄H4èÚ¶ËÈJê9G…·ÎYè%ˆ∏˜…S^∞˙ÂﬂÜ‹.d
ÆŒç1⁄√61⁄÷b&Áªà^>	ì⁄i¯˚¬ÓºÙøÔ-¡¡o)Öh0°À”ÛÃ-™=ê@ÙÇÙ?I∫Æ∂áC◊ˆÌwÖ^~„^∏àÚ*∂]y[*∂b O
‘ŸıÜCÍ(M¿GÚ%,UÍc—#À!Õâ"SÓæM`%≈Êß¿ïHw´%j‰.∑J|OSáÔY™(¨dòbì†a§{’ÚÀIrÉJ…tX)∫ÇÀPN¥ºO’MÊÅ‡Í
˙Ri†Ëpﬁ¥∏√∞pã¬(>›/L”_”ı÷¢±lX
%∞÷∫ÇVAS®˚m1!:	CA£ëtƒY5¯ÔÃ¶Yê>ÑŸé?cõaã√7ıΩóp∂É%∂’…ËåÔ•7f-5ÉÄ(‚ÃÃJ‰BwÃ¥∆«¡E√1$π(bG.1‰G˛π≈#GŒ»W∆.o[2Jò≥Ë’üë‚-ƒ˛ˇbñΩ*JHìöÏŸ¿G˘‚Ÿ3≤|ªdê%ã¢OÉñ˙ë’†ﬁ(¸3ÀÌΩ»H…yÃôû[TÈ+Ä
¯Å9Jp ¯‘ë?Dè8á¯j´ÿ†§Ø6¶
R	äÆI2ç&ƒA˘°ia©È—§≈¡Ñ9Û&ƒmƒ:ƒYßhå	¢íx…Ä'≈s%i¯3*‰"T
éì≥∞¶v«´õ±Êû°]áBµ/ûW0CÿH>ıôB“K/P{‚3D€Å‘}ÿÎkü
˘ÑŒlE±Éü–v7ÿ%@P™˚6àÍ]qPr{ˇ]„°–ë0ù∑eHî¬™CD)~|@ºåÛhŸ,¨‡(xµ H¡Î∑íÇóÀ¥ﬁN
^ˆ»;^
ùçüqõmπéùBÃ6ÂV*∫\PTÿãüJÖUg∆S°˜ßÆ;,N:té›Zn∏*Ùj WÈï;˝Ó—ã•›◊Gˇ©á[gpéÇ»Òø˛/’ÂŸà¡BØﬂ4ΩÛms¶∞∫÷W©¿ÃÇóu˙€b≥TÊ„7åœÇóëS=Nã¶¯˚√j—~ºMqÛc∂–¬ÃæΩz†,m≤8ö$.ˆ—Hõ¿AÅú√A,!?ö\ÜŸ«ø2Î?ìÄñYñ!zVØãÓö√º)∑®§|Ì%:Ω†¶”ÓJ˘¥‰`¢”Å8™#´ØYÌ ]V≠ôo´/◊˝ßUÜQ	ÊUCÛÕÈuuQd·#≤À∂"õ√èœP(1.ãìæ%§L”Ñ≥2ﬁè∂@Œú&G(”à<E”LÕ®û?°û[›ÖIﬁ~º–#3îN√Òt¸"e⁄≠Ω"Ã≥≤äu∆ÊŸ∂ô˙I@/’˘Q¢®pväÿÏ∆πyçÈÿ`Ç Ërz§5ˇ…f»C›ßKıÄdÚ…ó‘õJ√ˆ
¨r0uÓÁüã9I◊}ö@∞ÓÉU∏§ŸA∞L^‹µ4∏\!øjR√Ã4ù,<≠!ê¨jîn3tÜâ!ü¡Æ‘À‚ˇÍRƒ”è˛Úy˚nëéRàUÑ4ìÁ‚‡ê˝∫∆LSª.úc<Ò«YÕù@©`í¯ã|›aC§˚∫>øâµò<Y0P3É(Té˙∆‚]Cöß†˛kÇ¶{dÍ-ho{ÂπóR∏ÜZ”$Q‰ôïµ`‡ß0oROüUë∆,Ø)`bˆFáŸ´ û¢	
êtñ(NQ°âv¨BDkàì.™«Zıò-ÚM™:Õ±IﬁQ¡áË5™«‚„"ïÍ?®íXo/D/≥í¿™GÇ}	(1E’zé$”D˙äÔ!ïÏ—s1J‡‘ Tı8ÇÖÍÍQQ ºfQZ–‰´†k≤DƒÚ√èÃu8ˆìç~≤/bù”<§¶¶G'©7A‡¯ ¡,ÄÉÜ	Ù,—öá^òÿ
˝’Ö^\?SÁ`°µÖæ¥£¡!^à>ƒ‘¸ ßrMö6‘áÂMh._nøÄ°˘Œ∞4ÍÌI‡Z-<«|SıÕí3fOÎ◊ÃÒ∫i<ì1Y)˜∆,Y‘ôC‰´≤äú†e>√B9Ät_@ÇN≈í∫ó/åÁ"±5Bz©÷òlºA?ß…~Æô÷(F%|h ÑmL¶›§R¥∂]cÜnEã≠£«î†4æÜSµ=Æe∑3
®;¶∑~F>ê˝ˇ»Â≈Ì€»ƒöAlDkÓÇ≥\…Ù±{¯˙ÙxÁÙ˝…ÈŒÈ˜'Áøº‹?y+ˆ3
S}F§Äœ»€h–ârÕTÈ«ò˚{éû5%C§≥Ñê^ÉJ+JP!ß‚2'jﬂ˘£‹^„¯Q*:îÀ´M–A“‡4#@—«Z`4Q(°z~#å†M&óLw–&mK0DÎÀ2bîÍ«)¥Ù$∆„tü#∏åŸ-.˝ôÏ±â{±–‰;≤ ß÷≠-+cEç’3.Ú;V”LêŒä—,^-øù°Q∫:aLı÷¶ÃæÛØ;∑˙Àêfûÿbˇ]oLºJ/GD=<ÙñmCfJ”Írù¿◊∏Ûﬂ
ßÍB2S∫R8ˇµ·sÜ·£è˛Ü'æhÛkúˇj» Œöó>1∏lzãEı°F^UÖ•B+`Ÿ≥–I. râµî™Á>à\pûci,nœîÛàúmÒËÜnxtéÚ¶#¶‹nJ”— hr√“kºúúTµÀ‰v ﬁ°g6q¯38Œ"Q£ıäÖÆ~IÄƒùËûFÙ·aêt–T«dßı\¬(ΩÕÉ0•gÍßh∞eâºò˚ˇ®\Ì$\¯œ5úxﬂ]˜_GÇj¬¿∫éÓéà‹ï¯MVÜ>ö∑Â≈ø^ıüR/Øπ∞`jP≤ÓÜ*6≤ŒˆÊ˛M πê∏ÊâÁ•ó2åìÜ¶R3wFÅ÷ôódSö¬§19û—:ôb<)˚V‰
˘‚˛\eí“¿‘åk3Ç]ïQYìQΩÇ––lÿa°eq≠jÇ˘±Ew†≠4K{°∂Y*‘õMzÜr∞Í¶‘ÜjãvS~+5™é¯∆x9Aµîó•[´ˆ7‚v·∫£{ï§~wa°˛„~ö&©¡5ﬂrÒµ√Ë+UÊ√i≥«ÎÓã≠!;ÑÑÈ"#i?÷¨5∑6;
(Ëˇ5
É»óE∂ÇÈ¢Õ:oF}∆´8ê}*ÍDÕªÄ/€—}í6‡Qè®gÿ˘p}¸GÇ "˘˛Ì#r\LvÒE©q¬ùÜZXqÉy‡7Å`¡mºDN·õ†TïÖıä~ë$Œ8˘Ñ$?'î‹ß yî,9≠Ø}VZ7πm∫	w |7ËYÈ¬0™“^µÿÊU“h’¶(7 XÈr^Co‚MF_ëã`pñ¯7Ëbî†›(¶Ä, FSÅÉÖgH∆èVï	˜Zf¡3™‘PãL5*Œ‡14`$i!Ô–⁄∆	é˙ )Æ˚"rK…+zCC@BGê≥Ú4aÊ)Ôå⁄´¶cÈÕV¢1Ö.f‘∑§kÃ∑ãxø»%Ω•r%√;$‡‚:∞–I¬Vˇ∆9ÚFG] ØÚ‹˚9F"îÊR¥¨e…µ8°ùã«◊@Ga
Yü
ù>CÚƒ˜öÏ`“≈åπi0Ã)43áπ:eßˇsdã(˘P©Ûû´á 7ˇjˇı˜Ôø{ørzjgojZ[]¶øYBùòAÃÜ°{@&…Ü8± z≥∂ucIG^ÍÌbA[¥ß∞(ÄÒåaY˚ˇ  ˇˇÏΩ_o…ï'˙UB¥zXeì•")©’lëERn$ëM™€3W§dUíLª™≤úYEQ¶	,∞Éª3¿ ã{±k¯¡,¸r}{wóﬂdæ¿ÓGÿsNDd∆ﬂÃ»bQR{∫∑äYôë'"Núøø#:∂…@}ÈßÔ;…hgﬂƒ®d7-Ë[ÓË”˙øsì(å¯€0ãºü#±€l∂ùÿã∑â>…ÖI:^ôY¬è2;_'∞Ñûä^Fÿ#˜·¶ØxÙE£˜	úëpΩ
æàµÆêù/&à&ÿÌ0õ;È»‘∑FØ„ÄëØîF0äÚ^!éŒÑ”õª£˚‹ï s”`ÔücëÏË7I3^√a•p‚˚x[xJ ∑8*‹9HÛV£S&r]_ªO `∂n¨„á8c¸1´y{È≥e˛ËæDçjÙB¥\≠≥—‰¨3å.Zèñƒ˜d‘¢ˆ3Ò≤’.¸§v„IrÜ?¨<l∑ºÚ™	èÚj‹Pc≠é«£Î?\ˇs*&ö!-3â∑∂å∫§FÛ®âK+˛ƒ•Ê∂óÖPï \~ëfÒ˜qÜE€∑≠ R\fA•2Ú€ÿÊÙY*π8®BgÇáÕçN«QÔW˝vf2‚v…8'qÔ¨àOAcQè$à1pi·:≈ì3òPÆ\q®Uù5-ä(Ó@O`/-wŸoñ_Øvªo¬
Q:|ﬁdâÒX«f„ÚísV˜‹!£[*ÿ£Á˛Ûí`jûõ»VŒcQì®∏Ú∂É’D‚Q◊å¸∂Ry.≤>≈(<´E†M®ä&iÌÉˇ.Mæ[Ωz±√ä?ãsi´A®àØ·	økº0ñ¨?¡3ƒäz=Íπ∆´pR6]F#R§ŸÛÙ7≈Óy“ø˛'ÑfÃ2à:r…2¶ÒcíâS‰Kçl[πB¥ƒ™ËÙ∫¥¬rü∞E˛7y˙¯W÷zôÇÏl:ø˛}⁄∆»ÑπU‡/Û¢ü%íƒà∂€È¯ÉNY1ö(ˇHïæ“HE˘Kˆ^'?ÿy6≈Ù∏∫p€m=…mßÿ7˜Dtë¶†”À,‡◊∆—ÃF¯p+1üß2übûì‰≠b¡X¸0ÊÒh^¡ﬂˆ$÷¬ò√ÙX!òÛ‹G
xYrﬁ,ï°˙’aã©ÙóÀPü’Îe|‰†ƒïVã2ª\v<OFÜ,√Ω)eôŸôÁøŸ¯$˛›†’3WÓ'Z≥ã∂.Ú«a	-O¢ñù-U&~ºçHõp›É?8Àﬂjœ¥¨e˜ly¨§Å‚5$´
:d.§•øLçNS≤Ó¬åûECÑÖ ›kÃ£ë(æöùã:L©ƒ.G√/)¨È .@∫0&8Ä£§IçåIÂP>•,.´8Ruœº“
≠Ì≤ã@ÚAï¥,∫Ñ®wo[55ó^ÿCÅ~‹¿ò˙ÀYo®˙’màµk’xZ1ÓªA≈*2êÙ”€/Y£`Ö>2ã◊xRòZñù0†OÛ{ '«¿[h˘c≈ƒj‹œgXˆÉg–!¬–Zóı‰C2¶-OáòœEˇMOTe¯óÛÏÓeüDüí†––Ù¬Í@<,R‰wîÜ>ﬂ,y«po/?>"BÚj0ãèÂ`N7Hì7‡EV(≤YAú*ÆøæÔ44Íìè)‚9|Û«tpGÆx!§Ÿ√':‚ô“˙/8¥‚'è3G¥k˜#)2s£tWuópi/Û∞{AlasùQ˙ûê≠ïûïx÷mvèµV@}`?eãˇ¨ﬁo∑=Ω®Iá¶Ÿ†§g`“◊éK/ŒìÃ∑QAÓÃ≈è‚X ¡LEê¨p¯*§7_£";≥ﬁ,Ì 72)ÀPÚüHzurT‚÷Ú£YÚ∏ö$îa˛Ω”J!eº–»¸4ÙÆü6O*8ÜgŒ{\±≤ãÂ#=ÅEΩ∫2õ·R€9W}6æ«@=EÛeMÚF›`*y∑\p|1"bfÙ‘≠<7m\Io%}
—ﬂh5·+üHFS€Ω¢n¥Fy;$c≈›GVF·^US2®AY7%`∫∆nq“¿yØ&mËºXÀ€`ﬂ|≥>÷fox¡$	
vÎV0∫âÓ´Ke®,Êàã9Õb<ühmK5)2ƒ¸0yrS≠Œ´J1m±iÍ®·AÛ3fƒ≈ß€i…<∫Û(∆®Ob%€B’6§s’Ú≠¯—y ﬂPì®îŒMÉ¡Ç%—Œ[û/SöW¿Ö§H_‚àŒ(ÿóm~ˆ“Ω5¸[Ñ¿*ÈZ»˘ÈÁ*Á+tAa?m&Èßn1?˝! ¯åÏri.Àøæ~É5fﬁ∏° %ò|∂3ûÊg≠EÆ±€ıÄ‘geàä„qiåÛ5¨ì§?*$°
	–™@ôø‚ë⁄Zb¨â§¡’çö∫ë~b]#˝(ä∆e¡óƒ07·ÿ¨Û‘Tk'JËΩG∞h˛Â?˝óˇıˇˇGˆ<°J≠—∫ÚFéHrÑµeÃ∏hWÔé ZÒ5ß‘‘ú“Æ⁄T˜≠Ù/^q∫≠±˛®:}2’©t±~<≈©xgP˝¥ ≠È Ï˙GÅ˛‹5¶í(50√.Ö©ÁVòzˇä¶ﬁ&Ÿxæ4¨‹XgÍ˝®3ÎLΩ€‘ô`?ÍL°É˘u¶ﬁ'÷ô!≥~‘ôöÙ-@gÍ˝pu&1Î/[e∫•°˛®1›Xc∫œ¥3¶RQa∆ñfgØ‚¸xkgìÌ$Î
X∂áWk(´¿∏¬nü≠YO‰Cã}+•dû'√q¸Ÿ·ıjŒ÷¨A9Î`π0tçvXÿ—Ó‰QÃŒÆ«kÑ`A¨àjô!Ø_ˇ9ÁtîïV®v¡ùpËx™ùZWÔ˙wÀ–D=H≈S–‡∫’yã˘…mkı¨ÿ«0—h:ﬁœ∆∞óEƒñΩtÌ"ÄÍëÌ€∆˜i+¯©|#+5éò%áä≠¨¨Eˇ2]≥QÌ9¯ﬂˇ˘ˇù·‹°øÁq˝˜Ÿ…ıÔML7ã∞VÑq°ÿø⁄uä‰"'{ëˆ£ËEGX}-I1J_∆	ïAŸè˘]EªIé±‘X˝[∂C7‡≈´Ú.úF‡yZƒû˝DÎ$‰1—ﬁÀ1ß~üÍƒÂÊèò–â9¢Å2vA/‘V·? Î‰Tørë«vùfìûyø(vB©ÛXÈ§õo+”K%Ö(ÕtW˚$SÆ¢~ªh”SAúÂ|•∂ã√>ΩbpZ<[Œ≠èçÚ@s@Y7gt∂£®åcE7@ÆÏIÁX¥˛2®\Æ¥ö iØZ2Ó‰¯(Á"ÆZÁ\G+YfVuˆA7{Vâ¶¨ﬂ¨îπ‰ßç„ñπ¯ÉS––aﬂÉ*4ªÑfß∞qÁøû∂ÉXÒéÈıK:7üy±q¯ÃøåﬂÀ[P>o]≤Nì√&‘À’R«Z¸<ÈøàJVÛŸ,"ãùÜ/"∑|‰YVŒ$=™@˜Â2êã`ú•ΩÙ∫`óÚ∑£I<nπ◊@Öu©¢òÌöMI‘Ï≠ZÔåJâ·˝µl∑B2öFÅ∞‰Â·$ÃLı¢äî
DËpà|‚–|á^…Œå„;Ê\«¶•øÔ˘+j' ˜n\Úÿ´Å∑÷u:Ù÷∑éóáQ2µñÂõÂ*´+‚≠Vp^ß“Ã≤å≥’B`oÙ=√ Nb™ÃŒÅ∏S++Wõ#Ø*\Ì¨[≠=ÿ¨nµ¶øÆ¨4®[ç˙ÁEY;ºÇmkπı∑U∂⁄c!∏›¢’Û-+m¥6 ˛ﬁ[P.«YUÅÈÎˇD7≤m∫±Ÿ;`K¶Ÿ[¬Æ&	lÓÔÒÆfÕüd1®Õ5V‹TŸ∏øL∂Ø¬ÄÂ'â.ñœñ_Ø>Ã‚·õ˙î¿¢:©ß6iY,VÏøº¬
Í˘ÌﬁÃÛªÍı¸“«Õ.Ô∏á"˛FY¯U„≥ç1bTÙ˝"7lÉ0÷ádã@∑Å˘ØΩ∏YˇÔ8¿Kè«}‰ñ•¿cx¡o<–B≤ì*=·Bî(ÎÁ≤÷%à1f7˛õúÌ{Eè‚ag>‘Ò—!¨æ.Ê˘Á‰Û~K_´´»∆eÚ"P`!>Ú§c\GwQe;gQ~¿Å6åá7kûÕ£A?›Œ–∂ÅEh_N—ZÖ	x˝mèˇ–ÆÔgBÖiÉµ™A±]¬ı%K˙ÎTâtâç`·w¥ﬁΩ^<·»„µ≤ƒÿb≤&9œU·a€G.^>ı≈J¯m>8ÑóÖ#2=à2ö›◊ΩŒ =≈e:ÕR∂ÁŒ`¸÷O0$`Bﬂ{…‰√õ_P≠ßiä∂À*¸ND$ê›"uú≈ÁH≈j®VêÒ∆ ƒ}±¡ˆ$}+ÔUúœ˙T=ÂöùÍ◊¢r¯|}€ìÊ™üä˙}8Úu}Nî2ŒO_˘¢:ËSmãõµÚ±I6≠|™z›Îñ¨\‘“2ˇy≠iÈ`˚qIª?üÂíñìv˚+∫¬ñ‚~‰Íıª=ëN¬KÑÒK.ìµ©¸ h*ÙéaÜ9ÖÊ∆,®EH˘	”FUy3ÅáK#"ê
√Xîª[gÈqñúFTÓ9π¿j¿NílH.æ!´)G§w—8h≥¢¢∆0ú◊«Îß”$[*q‰_òí∏Vﬂ:»Ö—yí£_1œ±ﬁ∫‚ì.`pé 4’l≠CDGæY I!%7`àªw‚„â"§Hf€|…∑BÄæ√™n‘AÂËW]ÑË_è√îâ*lè7ó ?Gª¡q~’}ÚU~.c∆hπ`ç8ø‚ÚUÙ≠<Û‰$@YÂ÷"≈ÖàÊïE’“ƒv—‡PJ©E©àjõÚJ£¬‘‘ #Z;xaÜfx-«∑—§ll'ŒÅ◊8k>¬}v—«‡WO÷%W'É!‚Ê;π·†‹ÓD5∞K	á|ÖÍ˚:#‡ﬁ\Ç]tÎ@&ÉÓ≠Ω^ÒIk!7+Æ≥À>Â%åè÷d˚”ﬂ`¶]j:|H‘eŸìïRëkV]ãòcﬁâË_;®O∑è´?Æuï–öõÆÆäÿdkıÈR,Áz˝G"÷Níè”—ıüŒ„¡z√5Êã
^1∫•ufª2•ò≤˘-˝9Ø+≈ÆÙqWîreÆ'5öÍ#Æ¶2‰ÀZKX~%‹-∏cíﬁÍ2‚Ω(ë.{~ñÀ(¨),‚}û•£C™ª„è±‰ÏzµÀ’™eÀ;˛@”ø“qD“ÅÙè—Wä YÅ(fbèV+Cπôƒ≤>fyu•+<á∞'g…H˚¡&E›.±√¶EiCw@œd)*xÿ$F:êOı#§“≥pS˘ÓÆ®ﬂ⁄≠ﬂ⁄]ê°<ÊŒ*±⁄†Vr√ëÚ¿qŒóCÙÅ#vî(z‡(QTåPá≤wÄ©7k£∞	„+˜∫§ŸÇH4kj@Ér≠õè_ƒyù∆GøûFY<-Î8ﬁLÎJ‰!4€DÕÚÿp@Ó‹rÒto8òü
9◊æÊ»âıf∏bÑ(ÊáeÒIkÇO—Â√¯‰ä¢„xÄò¥†ßˇtA∆•åÙx¬rπ_˘cpú1àFCK¨hiùÈA+∫y IÊÃ5®Œ^•≥«ìûŸ∏ÜnUƒ|È∂w¸v$-jÍ+ên∫Àˇ˝˙˜‚±sﬁpF†ms.ú∂|›”¡4”_∆˜˙v<~û¶øöéÉØ¸‚
Z§(ä~7ÜVI…-C$ ‚sA¡»7d]FÂ1Ñ)/Öì≥o˛-.vî‹6◊ˇIﬁ}#{ﬂpäx3ÆYrÓwÁıûÔRh∞Ãc ^ÃˇåÇ~ΩÒ ®ï‡1hù}^8Ôº},˝{7ÓhŸTpoo¬ïP¶†·>=î.é˜÷+NŸˆéú’AüÀ‹˝f„.¡sﬂ(≠iy%Y≈îH◊Íç'D6‘pÿ◊∑8è8 >Ç≈Oú®â Ô-◊÷ªNF†£D,ÖxFU^◊YwIÍ=›ÔªÏL}rÖúEÂÒˇ„ÒE2ô·≠•ZÖ˜ßIsHgıÏ`8ö°¯œﬁh:YÙ7§lÜ"ËÓ,È˜ÅúeÍéÛYøÿí{¯lêCvÇ”ñ¢V*¨)ØW…‚L©éò7íßQí◊ ‹Ñ•(≠h˚u'öPŒÂK¨ËL1íˇ˜—k„=ƒä€o~êMÖÓe}8€<A’ˆ¡3vèaπw2`a\R∂UÕ(ï>ûj›=¸π∑õŸÈ<:òùwMßc“è˙˛U@æßÀöƒÄfôy]x…˛¿€Utg‹\S°VÊ–Yå—ƒbª);ˆÒ2⁄-óW˝4/Ω9ÈÀ∂ö*H!˛¨ôÔ≥dÑÜ‰$KÎØ.y&√Ñ(¸*≠√ªm…7GR∫ k%£
Ú¡/üRC2ËÙÊ2™÷\√	Ωù˘jöz[{vÕwD¿Ká◊ˇﬂ(IÎŒ^Ê∞uE˝>o!Ö”˜∑nﬁÍ'"içãâ;o>>Ls≠Ä÷ÕZ±µäb∞¡aÚÛÊ¿BTêu∂Â¡Ûﬁek∫ùn$’Ì‘
yı—ºX3cï¶À ±aË{kºƒí˛Ì¿ö±avpø]CçÇ|¥EÒìTôäèfI:(ók≈ÇéÌ™p&Ò‹i‹QUÄø‘JAõéQd‘vDH≤ƒïÜAW	4)•Êl=•≥%©iπ*ÀlçŸiµÆ/JhMw:¢¸C˝(»∆#·Z!Ñ”%nÒ£™˛IÌ,k∞Ü(álæ´áöºÈ∫yøº∂˙∂j‹òOY<ÑSƒ¢c€8ún
ﬂ‰*€àUUwÓ¥˝S;£îRd9g°bˇ8è≥ÛË˙◊ˇ◊jÙÿZî≈Q%≈≤Ù=Ç˚’^€Í[˙Ã{¿(iîlñß«Yå·œ<äŸüÇ->>’?ù∏0à‘è+;9–Äç7r=‡«Ámæ…≈-Ïuÿí∏KË¶*ä◊
ÁÓüJÉ£Îßó—≤y÷ZØQfç¬7<fÎßú#ùGYç&ßgi>Ypﬂ†·ŒÇg3>“’’Ê6Øzù=æ˜‘œ§¨‰q/ıa"ÉG·Ï£Ã∫É_⁄Wûâvÿôü∞≈Ò(ÕŸ˛òogÇC¢‹Ù‚ä«[0Lﬂê˙I‚>·[a∞B‘´r¿¬√G!¬Õ)≠bÑf{8ƒ£hpéußÅ#–¯ËÔ¨È¿ΩÁWç‡8l’∆ì∑Rü™‚«W±Ômê$d€€=ŸezyZÉˆóOÙ¿wß≈·—{dM’¡6"kŸÂ€ÊÏ9
Ö£i≥˚¯Ma¡Ã
ê∑úı#ÜvYk´?LFm,«›„ø¿@éÅf≤ònƒx$~´ïSuÔ^ríÙ‡—aÑÿ~™ê~úEKÏåó@HÔG	&Ì&£|:DAXò÷}ÇU¬˚ò””œ¢¥Ω´ a—ÍWw°òÂ£5ºGM‰Ü¿ˆï¡$≈õ≈π˝5&≈ò≠ÜA?= ‹t@ø?üˆ@E~û¸´#Ûw¬Vtl;â^wáß∆ÁHÑº2Î$C.Ó‡ˆ™ ’1ËÀeç¥-Ä¸Ωú≠† ï SÅï{±≠NßòF^Ñß˙O4áh="V.,8}ˆ””i<¿Îµã)√	Ö∂@-ôÙÙd¨Ω&Ë˙è¿(6Âd√Bﬁ‘Á[Œ2ãÒæ&…HJ∫ô∞%’9ø˛3ã–ZÜW≈L_ˇâOu|ë`Jò|Üπ⁄%B’ø}b2„–VkQ1Ú_ñÎh'ãN&µÊ°†Y^} `ù-˛U)‡{˘¥≥A4∫˛N’®ò~#¡êá¨é∞Vè˝ŸîÅàÇzqÒáf§∑îWΩ¨L]a\UÅ‘
u’,ÑhÜILHƒIÇ«* Áéì: “ª»#’≤àÛ.@¢!–b“û5“ªRCÊ«*N|'¥Ìãæ÷Q…§V‹Tv#≥Ÿu›◊Vw˝ _b~‚Qø¶TΩz“pÔmÓ]ˇ›ıø›_–UK¥–æ–òË3d¢®Mczûuw`≠Uπ5‘˚¨¯0SrPÀ⁄˚Â’G5˚~Î˘˛°È™©¸$πÿX8ºÎt€»ní-d<t£	¿Eb%Åö¢å+÷∏1Ë∞Qá))  ﬂ'bÜìƒ |—§J_˛∂]˛dIè≈èì4S2¨ﬁ∫ÑÛÜæØvKz<ä›zµ˘3◊[l ‡¿fyH˙¨p≠ƒÏ◊”àäù
ñFè=Qx A ¬4ÌÛ$√·»IFgp“‡<ô—∫BŸ}x¸ÁÈêp˚	+∫cû¡æ”ôŒq˝@Ó0∫«⁄îÖà{V|◊ÅGZMÎÃÿÏgÉl∑ZàÜÕ>˚kô,õ t@⁄Ì÷2Ôcsi∂Æ≠5≥JÃGôw ø5÷˘ÊRèVÂÏsP´l‰˝◊´o®¨áTdK*{õì¬\v’⁄ΩV¸j∑ê•Ì;`œ’kc%{a—Ù"$jÄ:Ãpú2‚ÃòXf(†¨·VBÈV¿,HπOÈ
F2§(
íÁkEÂ>áe∏`áwak¸åÀ˙Ì¨ì»8ÙCä-NGI/•C¥BaRx'á˙vËK˙-¬<UjL*˜m†$ÈévÛÆR≤| Yrì'¡øﬂ˜Û”Aåê⁄r>
çv/∆e˙wM,∑z—∆ànªÔÑK∏|Ω∏çº‰_˛˝≈æ¿ˇ\ˇ∑≈7$«;ÂxÏâˆ«∂……‡ Ë–|ö”·‘:vòYıìmU•~ò"`fJâπp»6Qπı0oa=á‚2P,2ı»∂ˆ∏›í¨ÈôÍâÑˇ˘ähˇèüÌ/ﬂôƒ/	È'ª{yÃ6≤ YfÃ9Oƒhµk≠9öZº≤ Œu^Ô„l>¿ˇ<ƒˇ,ˇÖMÎÚøŒY]¡π\≈ˇ¨·~ˆ6´?˚W8´Ói
ö8ñ≠È9µB)QudUÕß´ıŒ$Z◊êPùbn@ûŒgIûjötnô&MiR°À(¢§† …°hæ]^Yôùµ4pHü∂KT¯ŒfV ¶yîë%»oV˘-qãÅÇú¥ö˙V≠zµE‡qÂnífI∫Æ ÷âr},Ìi „uÿ3DáUÄÒ“¡ôXáã^“O≤R{Í…r
⁄hR«Qˇ4ÆØS4,âÍ°ÇŒÈÀiÂx¬•âπ–Ït˜ï®∞®b&N≠¬ï≈ànE*ÍÁOà}ﬂ©x!¨öÉEA’@ƒ5Zh–“ÃŸÂ"s∏·k˚¶‘uSÄ[¥Œ Êb`⁄±UJÎ@‹\îﬁÊ0ê|˛Seœ∞“ç¯ÀÎﬂ9ïM@æ∑∑ã√& àö8∆Îıíàıß‹ëQåvl(Ú‡Ê	ÏˇaT?8Ø◊Œë„ÿÇ’‰∞πΩb€π¿‹0åUªœ˚DSËVxD†ílKh‹gßó:uÒ∫ -∑√˜»ùDØ¢„÷‚=ùÙ<ıßùŸè‰U¬– È…¨≤wøÚ‰î´‹∫Qô¡‹πï«B∂∑¡	˛,ØßÎ∂Ínï˝∆êÏªz0ˆZÿÍ`ÃÍ ´õ°Uœ U=3NuHıL’3 ÆWaÓ∫cio
¥˛QWjSàı™Ûsµ!ézÛu⁄>}ˆ„∏7PÀVª∂kÒ_Éÿ	áqrÇeáÚAóuÏ^ƒ˘0e[†öo„|Æ‘†B©∫Z8äÜ#hŒ$îû⁄P’U.4o˛gÈ†F¸ ˙Ä\Z‘),û®¨,‚¨Òıvª¶/LÊ#úÓìÂÈ	{˜Ìî™ıÓ\ˇÒ”îq˝ƒ}å¸…]˝n`zù¶?n-?2ïƒwX≠ÛZ¥.¸≈[»µe∂â˛
Û©∫∑,`Jˆ ˘ç,ÕÓ±gqÔ,‚‚ËÇQ?xapZÆª¿◊Wœœﬁ∞!è`TnLÈ`€÷’œ zr~g¨˜≥n∫ó¨ò?„D"øÊ√uÚdvå:≈∏~^•àﬁwí≤ßQ∂^ñ®˛+v4¢Ò	U‘„d˜ïµÂÏ©TÈÖæ(ΩèÎ
u’ÄQG‡,_l¥IaÇ√uØöï£2[ß°‘ì<À™—ÔÌà∞/Ÿ¸∫~˘˛sˇ¯≥≤Wç¨lLÚáwä?ı®Õ≠u´c$yüøÀaú≈pÜx´ä{+2Å¸ãµ≤ZÄ+∏ËKå-b’b˚≥`Ë ≈·Ò¡≥£Ü«∫æ∞)çm[<\˙ï–˛.Ÿ78,jrC√÷e^ÍêÖkô[)	V‰Bÿds≤gdÆê$üL%ÌèæÙjÀr;Ï)Ùœ€ŸÚCæ7æ‰¿‘f≤\±à1A=c˛ÍØÿB2:OÚ‰x/x”Ù @®;w¥|Ñ~!A’<E√J˛ÿ⁄NkÒÑ@±€∫„yÿ»S´È¨-UWä»<-ﬂ¶·ß±ª‹LERò7≥∂é°óF©0ñnìc•Äwl˝¬	]*˚3G^¶s,ˇqÚ2ˇDãxÀ$¬”(√¯ºx'…{˘=Ecú'àP†sßCÙç†TB1’áwŸ]˚˛j˚xeß≈≈+zé£Ïoç«¿ ˙ {$Vç˙ÌﬁÍwô0Úeﬁ9h∆–Ûa19p˚ÇØ˚ÕƒºL–UKFdà®ÛS91‰èPÿ≈´˙jçGZy0êw¨8 Ñ¥`÷≈≠CáV<é°¯/V<•≤õÀπ\Ëc^Ÿ>Å˚üÄ∫âß2ı”œ(úç´ów¨√¬<x˘ÙÒhå $DFô9≥¬ôTp…éUïçy≤ú´·
=V´Å·YBR‹@˜[ÖSM‘–p“.»sFŒ*¡ <]©‡ˇÛø›åcT0ﬂÚˆ∆Wé◊ùÍÉˆ}≥°VWœı9„à√1ÍÑb'yQîA/f3À≥ë*±3àﬂﬁÅG0 Â†CÜ™Ìé÷Í∞∂ì¯«ºE£fÃaËf>7„äÙ”A⁄££nG≠£"∏Á9ï¿AÔÎãÙ8ƒån¸’$∑MÕöπE†&™¨¢åá®ÃÅ<Œ'U‘{—œÑzç.3¨wû≤∫ÂÜ|åä2+vñù¢i#Z´5aû÷_›≈INe∫∆tﬁ©;¿ÇC´îÚ<<ÁRr)¿qÌ`Ã)1ç…BΩÖR‘Zããf%“Ëd© •€µ[“(Àil¿%ñ˝„n•è¿j*Éû–\ßßd∑Ø∞Ü\Ø√æ®EjF;é ıŸíçwÔF;º;gíë˚˘íåwoFíq 32WSÕ'á+ªÂ2ë©“£¥¢zÊe˝Ü´Q≠ØTolƒæº~∞ƒV∫¯wµ˚F‡ˆ&`áAU{ÒCQ‚–f=JO≈ÂÕ÷#Õ5¨LÁ¿Ò÷◊Æe“±}åk}CÑ§FÔImzﬁx;©Û-jÓß{¡Ó¡dt+ÎZãOMQ[Í¨∂°C∫∑ å~Zi›∂áfÕÓ¢è95¥5ê0w@A⁄ÅØeÀÎÙ§≥àıJWtT•™Ìuˆ`’Ó„⁄_‘lµ 8Ωz¨<ÁSÓá8•œŒ|3P <…2ıﬁs√0m\v}Ø†ﬁ#o›X¿pÂa‰ÛèHÏ∑V^Ö5⁄¬≥≥9 L˘˛û7™êgº‰‘v§!ﬂX#´,ÇJo<ÅóËw∆èÁÄBöìÈıW‰õAÜ¢Â‡<r'C¨t¨ìUO©ÂF`{eÂ]gÔ}~5Ø≠/]õ˛í€ôºÓD3l≥N˘≤ü—‹‡—¢·z‘Oﬂ/_‰a˙4Û°+ƒéPâìi›pas°p45≥πP.»ÊÚ<éÎ»Â⁄öÅ(.Ò≤÷’>Ï+ÆˆïU	∞√=ÌkÃà<0·ô‡i3‹†±âõIû«'vö˛:€CiRâ4ÿâ'Q2»Ã!Ú"cÎAMPÑ5 OpD®ùh¢øêÀ¡fÛÚµM¨6&á8ÿæ¢TL≥|)ø∆?V ´i>ö+År’ˆª!‹´√ˆbtg˘É¸")¬©¯˙Au±tGOI¡@u%S›è®NìÖ∞ZÔM4$;5Å◊JöÂµıÇı¡⁄0ã≤Õ∞ÇÃ˙BQq¸N-]ãêyΩÚà¶Èí -’´µ\ÑFvΩÿf·√≠±£‡r¢f™¡ÅGvXésµ´î
R6(˛ÃüÍc"LqÃ√+{«ı•V®éJ∑Ø√
/Ëm˜˘
ÿ]B$È'5Nô·ˇ¸€°„'c {HiÏ†{Ø¶r?©a]¬q\VÀ†%m≠Çò '”wxÆá˙z˘É¯.˜HœˆçÚ«ôÏ¬»‚”"nl˝r«Ó≠Õ#–£∆P’<»√Ôt√0
”jw1∫eÃ>å)õ5"’È :MŸ=&~Øs¿«¶∫˚áÓä†’iv*¿ÇÏ8àí˛≥4;¬_1ñ≠⁄¡H$eÙ∑ø%E<=a÷èº¨jÜ›R]UÓj∑kóÒ—∆ä´ 0˚”™L?ÖiŒ'òÒ<£eû>´b1W¥ê±Íπ∏{A”{‹ˆo3Ñ•hcŒ‘$‘îâCú7°Mºò&…÷°X=Mıà/?æ·éÍñ/∫]Õ`Õ÷@ËÎj±‹XFay© ˜IbC3p(Y°h·Ø∑ÿÓﬂÏΩ⁄}˘j˜àµ!™)”πMA˝},â—y<X‚©˝1/™Óò[ÒÉW˚13⁄(pâãr≠<OÚj<Dˇ\ÆvÂ\ßlÄ’˚M1çk'ˆÀê©\ıMÂ¬&û!œfqM°êKÖÃ2U’æÓ∆H«¿ÓŸ¡÷ﬂæÄ©~˚b˜’7˚;o˜^ÌÌø<Íú$£~+≈¶“N“Áf¯Œ0ûú•ælj˘·i\µÇsM©¨∞∏.F »Æ™*™C#DæÖ=n§¸∞K†˘ìNÙßíÂˇCÑD¨VÜDîﬁWñ‹Ö[>v √‹ºÍ–≠J>√ªOËπ∏ÂÇh¢c◊3£OY}vŒÚ Ì˘˘Êß(CÖè£ûßØ“Áÿ¬éhO8ˇËÜvu ´Ò±ú AæG˛·õoîûGTowÉ‘>ΩJ˜Ú‘tpbc7Éºå¸S÷@Q9Eë!ãˇ
∂Å|ÉFë–>á˝‰¢ö<¯Sü ú˝ΩBç«!.J˛	pT
∫Ë±i∞ü…DÉ8¯ óV;∏D9cÕ¨¬püZVVÈúñÎ>h ıE∫¬TZ∫oòÎéf=(ÏfÂSÂ¿-|1ﬁTU∫>¿?•7&ˇ0Í±.˛¡úˆ;≠Ë}î†i5}/ê^ZÔvÖ‡Á-Â†"4>hÿ¨u◊«€OﬁÅ∫Tô‹Ï¸‹{ñS≠•cøåòê…$ 5lıå€FÙ$sw§lÔ≈ÓŒﬁ÷´-<‡wΩ∫5Ç◊Ê)ã±q„!+2Ôâ\“~<Nìú
ô‡˝?Ëb[±Ã‘dæ¯b˜;áîı0≈5%Ã(*+ßßÕ˝ëÁÈ`Ç¿T¢BFvÒ~ßÿËhø^ﬁËΩ÷≈ÿ_Ò*i'0√¢<¿îq0`$1Î!Ae5e˘ÑæÖm'0åó§€`}î«»s¬ﬂ–€ó 
≠∑%sø√ô{0ÎfﬁC§xmì∂Ñ‘âw$J={Ï	Jôù Ø7xÌrÒä6]A‘îbz»ê≥Qπ<üó$ˇˇtà®Ác¡(J¥ÛôﬁÀÌÏE49É„˘¢’’m<óhYÔ„åØöD8—KO‚˛"˚-∆P¢ˇ"∏Ë–„≤H®∑Æó∑6~=Ù9ã@–¡wƒÔ
?-4)ÌÌëÌ…ç‡‡˘L≤MNÇ¢ó§».±8À`C^aH?¶„É≤:'Y:l-ûcˆyæÿÓ≤§–"ûèòø|Ω\IA—PÍ≠ooECÎ˙Ï7nŸfr˜ﬂ“ÇΩikπXFÂíj‹ÑXGr|o˘—πÆ¨?ë!nî)ûtn8¢Äâˇ6~;ü÷˛€+f≥FÆ⁄ù¯◊≠≈§ÚÄd>ETÉÖÃ8£ıÿfì≥,}œgÛ6ÓêçHÉˇj%òd√∏Òv±Ò÷‚>Ã ¡4hb€≈#Û”Á@d·![=ﬁEß"~Iß,¢SîE`ÅÑù!“]ûßQß2˘’ÒúÉòP∆ M∂dñ∆ëpëÚùxØ¥M™7úz°Â‰KŒ-™⁄≈ÕMRÏ°Ô][»µ'‰2€RVô÷∆ˇYgy3¢"^›`Ä4À‘ù≠ Í$◊Ïä7PÛØ‡t∫ï∆U)AkM(Ù}†D{)=Ñ‹Å˛m‹Å]C"˘∏}∏bΩh“;#¶ B-õuÈ Óƒ|´„éGAYökΩb}ë¬ÜÙÒ˘0>è≥	 Õ»∞T"…»K(Ω£<çö¡e¶yû`¶ï‘T≤RQ”ÙµÒ9® åÏÀI∏H∑3 ≤ËÉ¶6Â¢h_,l‘À“Qb¢l÷|<í∞&t7]\†ÜnÄx≠w/%„E*ÒÑ49C©2G†è¬=›2œ£SéÜ+B7œH4]ºÍ∞óËòƒˆ$Óºk¥Ín—∏S[OÕöÙñ–®	£Z€™`≈z0®¶π∏5¿“pS’§˘+aWá{{ù@\ë‘wlbYwù@^Ôé”Î4?èçÊÿƒccˆÓGo…èﬁ◊(Ê‡-Ò;I.«ùR4p'8J˙ïM∂B9ˆwç[Ø.D÷|#ÎjEh°ŒÇˇNùƒà£I∑»[Ï˜ÔΩx¡æ˘f}8lb‡˝¡⁄∫Oë`ìx`{aÀ£ADbì%@·ƒDÏ[ÀZÉ4‚ñ¥r›3zW‘n≤tÉBiÄΩîQdÃ$’iñÊ´9+Ï‹DÇ–L.æÕ∂®(¢§#œìÿÀÈ'*\ºí®èà÷˝Ì!€}=‘Ojg*U‰3yyuv-\Häõ·0¥¢∫¡¡™¡Ç_lUÑJ„C≈äf%Ñ]—ËèˇFìPˇ“ÖO<v¶É‘(››ÖÊß<ÇﬁÃZ5£:!‘L*ÉEÄ5Ã	åsˆ«Y˙00ªH‚X…;4§ºÕ·ÒiF’ò;®ü†V∂ÜX@°M2Û0 )ºYV86^ø˝l$üóÒ{≠øºó∑êΩÄƒ∂ B`JıÖQ	*¿CÃ¸h≥¢ë»®Y{à!ˆÁëA:ÿê(#–·°]¡ó'˝¿Ha∏Ö4ÈêÉ·Ò–îˇÉÇ.‹R–C&Ï¡±°OºZ…®!y»Ö˚@Q8åoW‰nWÈ7ß&≤Sî˙y‡!oÉ´@µ°í˙“Ú«cRD?´üKec8rù9bHÎnõÎßî:ù∆C÷˙¢]ˆ¯¨~¸{aÅn!Ÿ ß61^˘hô„ïTy˜‚˙wÒ“<úúÙ”›ãu∂÷â°”BΩPÔZ¢¯Éê∏+„W≠2u_˘®|%ÇÅv∞Ã?ëø¯‘∞≠ —l^¿V•ùm≤º¥´Cı† 3[Erj¥^Jh"Ló„ˆkì¬çrK¨r;ÃÄDT7ä ∆ux∑û˜*sú&¨Ï3ö´„ìÕa¬j@[BÁ+dø€%)Œ…)\ï“‹ÛÑ[°î™ÏÒ¿»≠æ‘ÆjEúÉ¡4w[eáŸÚ
A˘m	'Buh^(µA¨
cˇùis\T1Ä ^)Óm{≥|Áx∑ﬁ‘¨/ªBJmi)√%ÒrqÜá_\UÅDÙs°®;W⁄)¥_Ó”¡¨U®” ‚(Wµ”◊™YR≠Uû˝uI¡€–Èo£ƒ®ŸèDéMFnbååπwÜ^·,ûdip#L vÎ7s8´h£±§Œ
ãÉFÚäyk‡∫ôáúÔíÙ}òtZÜ¶ªP(.YØj¸wÆÄ.≠ Lb∏˜Œ˙a1Î¨üñp!ˆµ0†I≤˙4	S+‰Êô”bÑº‹3YVê‘Ö|e3?CjŸUh˘+]¯2p…+ÿQ†Q»TK≠∆ÆÇ¿PóR÷Æ≠F≠-"Ã,(∏π¸Œ√HTøpOñÄc™}õ.PâÍàùâH
c´ßå&≥|ec=π5o≠∞¬fÆùO÷”Z◊L2¿HhÆO VJa∂ø`ü
Îéœ¨Nßﬁo`ç˙3%
,∏«º˜v›$õ“õ‹£ÿöPH˚O•6mt¶›†ò3&¥PàÚüÅx=∞§«å† Ü√ÿ™¡f÷¯<ú’ûXïtÿ©uê_5≤%´ÿ>ú
∆:p¯AÔ¿Jâ:ÒäVO|°dmæåGgX¸∫wù«Ï`ÔoñΩŒ	£S=e¨÷f\3¢[0]å2ƒöR°!U*ΩÆ2-	c,›W‚˜«úokÏ˝dt'Y‰⁄∂Î£——À°îî—XÛâ j\oµÓAWríı∆‰Å-`[“%0ﬂ’˙4¥ÛO´0ˇÈ∂ÔAçë1Q;˘IM∫ï˙(µ(lﬁ}™˜N
™Q~v("ÌiÖ/,†±Ì9ÍO¡¥U‚›• πéº„m•.kqŸ„Y≠≈Ùôgz±N÷;ºì’b@ìt[/	∫U/ÂªLœfdP˚–fÀ¨Uo‰îJR[7∆@e è7åµêõç∑uÉrE V‘¬n5ôk ÄU∏*_9ëÖÕW∏Bö≈ÖUÙ≈W˝ë'Øó´q~˘Î‘ó¿-'>J?dl¥Y…âaÖ˘5N√OYÜ1…è¢sòö^)(mñòd(£ºF1ØÃMá≤·VIÅ#ë>∂§R[é"0òMíb=ÖçõL–ÄÓÜü∞Åó9Ùfx®]ì 8¸»¢`îò7éOSÃE'íÿy:ç≤>7g¶uEΩ\üfÅr¯	û¥;#Ñ+_µÎE®êê∂ôƒÍ^îM¢Ùm?∆ Ÿt “◊m ˛≥8ñuçd≤C‡Y…è…,z/
X«o·kÆ8—j)WV¨‡0ﬂŒ¥‚úïù+Vy%ΩÑ/_\v‚ß¨µ¬~Ê$"◊ıkõ'tŸduêüÚ©”zöô€oÁ–mv⁄F ™≥ñf¯0{] Ñ¥ÉˆW_4ä“ûÂ.◊√úé·0.#S√´óU=ã©f=~¬5òˇU0Åﬂ»©#V\Œ3¶NêF'zñvE†íb§sR2
ÑŸò¬Ó5„:s‡2RE6Ä‹™yÖ›ÜÖÂ ÇâÇˆä‘èπ@.ƒ8b¿î¥ïv\Ó≠óŒF[7“‰Èc‘øhV"•¶>J®sK1™bÑ§	Pπ¡ 0û¸§!Üó‹–ßáùeÆ-≠2ä¿ΩÌyãX≈Ì•˜∂’®˘ÜÊÒ¡¸«$Ò∏y˝ÌWròóıB“e<T3%>óö§’ÙiD⁄xw◊Ï›EÅ±¶R∫&–¥˘´◊]Ø~◊y„Ò=N˝FÑkîqŒ=Ä°ãMZ÷√.Ò(Zå.Y7IîÛ≤>°<Õ;v˚B5–Ø°]—≥è,IÛû4P⁄÷k†t~ªbπ¢µ7ıàU¯ekä+m¡!;üQ‰%xh'√Drê˜ CøZ\´f∏∞	BKíE˜¢qñ^$CÑPDö\ˇ>≠u?Œ≈ò“rœŸ’N‚,ıíàÍ∏Ô!&∆âÛﬁ@f.∂ÁÁ„UÀ∞¯≥Á,∏≥áÌ'Eñ–<ΩïìPïhYáíÇ0^æﬂ)Ω§∏‚%¿.?ü’k/¨£ÃÄæ;≤Ä)¢î˝ﬂ_AÈÜı/É´¢TßSUöÂ≥¯d„2Ôù≈˝È ~:∆'ûÖP7¥."√…wbÅ⁄6ı∏¸ïòSÿfíâV∑z(&Â/‚—3Ÿ€<2mœ˜{û&†:´êáÑ≠$’(◊˝ÌÙO:†é=E˙œmÁáu |ÿl¥Mhc¢YÏﬂAö∑.AD∫◊Ÿ{ÿÛÈ{#GqˆMLﬁÓeÍúøc–9Ó/±A|2YÁ◊Î<”üúâ+Ù≥äûTäC¯Æ¡:ı“U{©â@‡~»0ñ\[Üx>¬¯L	¥£√◊|ÚÒñ∫(toÆ∂âÏ⁄ƒ+Æ⁄ƒT √pIÕRûXQˆµHYd¬√#‹Áåác∫#®+2n/ä(H2Í/&ûÊnù“õ®^R|π+=Uó^˛CV}O„%ê@>HA@xÍcÅÛ EÈõÅ~O‡¸¸ÕÚÎ’n˜ÕÇ#Y§éV≈ã‚K+X£ŸÍ≈
EÒº˛…J¥∫∂∂ˆ¶ÆÓ≈@÷ë]ÖØT^1¡JùƒÀ…àùD}˙˜7i:Ñ1cΩ?Õ"⁄:+ï…ö˘‰√ VO…Jç	ÈÎíöøj¨‘¸QpU/w´Ω™J⁄÷Xï|”(qÎÕ)†π÷êﬁ∫MœY˝K+˘˛ÅÕË+íÕÙV{ú⁄µï/PTh\Ä!"lZæyÎ'B¸Ã7õílTA¶-¬v‚∞ÙÏYñ—ˆh‹Ù5ã·yé∫kU#r7`›w≥≠F–nÑÕ}ö∑œ‚ﬁØ∂ì¨7àutDˆ" z2ÃÄ≥Èi<üÈÆÏ“L5BñKM\“‰ò»[n†’ª§‰∫F	ïYi3ûæ∂pE ¢r¢M5Ê)Ös\g∏x˜Rywß'¢çp≈ähèö,^5)W°Ãx∏S:IiGÈ˚õ°øK ˜¶–Ì•‡ˆˆ$Õ`∏Ü .∫¶Bz´ÑKÍ 5ÔÀ`åWe
 köIò◊´wa
íBâ>Lµx)ürKö¯∫Œ¯?IFq_©ñÑÆ¡y-ÿÊ≤;a‘≥X±áπA£!0ÿπ(ÆœπÇÁ1§>í¥{ﬁo+ñŸ¢r"Ûıu˝ß~zßng÷$ÅÕ˘x3s∏NÀ¸≠Y∂äÆ◊ùy,`&Îúdõ*#ﬁ„{õ≥üˆ¶¯jêé˚\∑42\]ö[ k0ıD.‘«4˚~j‚3ª´ÔßÃ◊≈$]⁄'5˘∑5I∑ÕígÖcUêoõÙF`è˛›‚
#ÿ5ûOíue∆VòML’NEÑ·¯øä}§∞ñ8bÇ#|îsk≤æ≠‡ÃœÛœ£òÍÃ˛qgÁQ/ç›¡Æ˘ÿ7ö-wD<|˝<”[ÈòR¡‡`ïŸ_2—%Ø#∏3π˛Cö∑ùƒ˙4S¨åFÖÅè©»òµÊﬁûv£¬4Ãßd	`\jgOAÂhm=ˇ≈÷ﬂ±Ô˜éˆû>ﬂeÀÏÂ>;⁄>‹˛ºm¶c:›w‚Tö,ØH“MtVÄ¢	‘kÑÁQñD£…∆BÉ∏’íÿT∞=,8ü4≠+Z©B›hYrG’˘´-uU–÷Ô◊·øêëñî¯¶gëÿC	.p[8¨F€rçnΩéÎ‡úsÓaË4∫¯Do¢C“»íWAL˙Î∫WhA{}ü°w/Ù=ÖìÎ{é¸ΩæG˜ìnˇ¿∑RÃB!w{÷5K¸≥ôÙ~v˝ß0‰Ìi«*!é˝5˜“Î’7⁄nR£KL0ö¶õAãEÒ≥“Ág=ı°uŒÙQl—ã&‰>_5s˝CüAôN6/uì∆ˆÓp˜Á{GØ∑Ÿ¡÷œ©j‰>%ñòÄªºÄæ‘ ~#$‡ªÁ[/ØˇöÉñ∑v∂Dc-•∞í3¿Y˘Ω],˛Œ‚‚[ónÁ¯Õñüz2P^l∫UüQ±MW≥eàÆ≤õ.D·§]âcb”π¯Ìw{Ø`˘Ï\ˇªß{∏_Ìø⁄zéãsüÉw>€{πı|ÔˇÇ[æﬂ}âÎãﬂ@èÌ¿=Õ◊Ü.PËrãˆÁ„{ƒ◊§É“À—¥◊ãÛú—•pÚòˇ-õIr<)Ìéﬂ_úóW≈=8†;N\n›4¥Z≤¿ËâÖ-*íß‹#ﬂq2û`#qçÉ,ÌOI¸2NdhÒ–≥Î®«'“t≤E>’W—qkq\‹Øô#
ö_ï‡à3ó∞Û&rˆEAP^\MÊ,àbï∞Xv©`]ƒ(Òê›c/±*‘¯ÁˇÁøˇh≈|è*}Q…∂èø¸áW∫i°.N≈Ó(Êﬁó‚ª∆˝dz†òJ?V·tÑ·Å›gcxl}¸Í¿_ÛÄèØtΩ≤≠≠ÊØ†Ñ
ˇÅ◊¿´Çª≠ö9»í!©®Ï˙k=˜Ç…ïﬁF£ıäòŒT7Yux£]˙Âcß ˘¯lÕ2U Ï‚¨¯í¿…óÙJ;¡Hï5Ü·ôÆu;1NM`NgkéûÖÖ©’s˛|Çè^∑F{kˇàeÒi¬ë[@*ŒiwÂb{Â ÷Öà€#S%ÂS|ƒ·‘∑√µ¨Ÿ≥µDsŸê¡⁄éP˜åôø¥3È8ÃàÜkZu πü´"òeüé≠≤«ŒÙù«g˜Î+U§@+‰5÷∏á≈Á”a `∂pBaEﬁwºÛi‘?çK≠W¥Å‚€áÈ(UdÊÖÕü8Y“áÖª(n-?BÒÓ;ÏÓ6t∑Ö{Ç^∞Ø´	_ÿ+ùÀﬂ›-ú^øñÂ¡¸vRE.sŒÖ–∂R·Ÿ˜[VπtÑùÍ¸z
SêL>\]0~5TãÜU1ﬂº5Çﬁ¢`uÙ0sFkæ≠Û)o{ÉûïÂ4L[©ÿÄ^#MÖ:h◊©3`†:˘ER’@˙NÃ ˛b74:|¢™˚ õiÃ™âHa¸T´"ÑÆbRtj¥\‰PU¬'OòÎ≠‰.ﬁ‘Z•s•_·∏jD<æä8ÏY4 i±F≥ô(XÚNKX«IWû≈K5Èdg~§ø	Ì›¢áó‚ù™öµ“‰m#“ƒŸAõ„*hJC-Ÿ }∏®3/bÖ+±≠fœ÷QãÛ’—OÜYﬁ˚ üê⁄}>>nãm·b#Ã°˚Ùû›ô—ú«#Y#.’y$w'—f=Ùuû»ö\f·«≤©‘AÔÀºv8ËÅ∑ô@¨´(≥ayº∏Á;
Ì8Rv¨#òû%v#˜§‹˚∞.õŸÌ˝H…Ã˛»ÄÀ£W[?ﬂ}ª∏≥{HÚ FiTæ“ísì~ëêã_ΩI∏‚=œ∑ûÓ>?zùÙﬂ\’ßô˙≥Ã+”B˜∑SLª4!™ú˚∑—ﬁıè8w≤m©¯R+(AÀN©Eò¡$Œá“⁄¯;ÿtπQsœπ·∂)–/>ÌΩéﬂ<§˙´•I∫˜ßêÖ‰Æ9€Â˘à»Wébƒ∆-.,˙^Â&ÑÎ™∂¢Íıw£∫›É˛~∏é_◊¸,èΩﬁ·õµÓ¡*bóGgQØ^YøöÊ~4Èù-Ø<‰18˘9ñ=≈8!¶éjﬂ‘ùkn+∞€∂ø)ﬂÚó5ΩÜ$ñM1á‡≈•PS˚L®
Âé\¬éñWµKó®ˇ}˝‚,ö‰[„±„,Z≤¿Òh?8.Û˜5vùÊÒ‰äT8€Æ√–
ìıÖ—-ëo◊KÊ{9dºø:Ÿ ‚ı¶ü÷ﬁ¨€ÈpeìdpÊ®µRUXÇﬂ¡Å=Hﬂ´´v¢«tË(ï”«‰`ú¬eÈfô˜Ê=»Ëpˇ!Ï^CopÄŒe˜6ﬂº¢∞=	gY›˚W*7¯£\≈Ùﬁã⁄eq´°jÚãñrŸ‚◊U•¢´z√ñGk4˝:s¢∫H¨´A4Í≈Ù,pô˙‰våKÎ	ˆZ$}¶∏I—Â¸÷¿ËW¯ç2è6Ó?Ë.ùQ6Ë∆√]ÁÆÁqˇ¢MOÔ°ª<¡ÔﬁYt»É|$=OÚIA˛“¬ô‡"rÇ©<ûdæX’I_‰r-å£>ÍxÎ˜«¨˚ı¬Ê›ÀDµL‚üBrôÙÎ[„ÄÉ‰t¥N0“_3≥}6–J:pfD∞í“j…/≠ÀKm∫Ê2c:¡1<›É\Tx◊Ó¸î
ŒﬁÌüÂ$wäÿ›˜êºÂ¶Ûùù˝ÌW{∞ÀŒ&C∑˘∏‚ó8Ú]ßõxdÈ9fÃ≥ü‹Ω†_axÁœy•©Ú™%£Ã.9ó<âÜ…‡√:C´ÈË_ÛÎ(XØ≥ï’Ò≈◊∏ﬁi2Çø‡_TÒzù˝§€ÌV‰7tpÃ¿©.ô≤^È≈+ﬁ”N\g®1~]xVD÷·
¨•~îü≈}Ò&±»äï=”Øyª4AÿXËêHN\Èvø(^ÉD„Ü,øçO“q]Àú©ÊÏ≤P°kjÉ®œîÉ
yGñæáÙìˆLó_ó∫ñ¬a>&ŸYÑmÕ"–˝ÍWêÓ~Èöˇ3'i:ÒŒ≥:‚U±∫∏ËB%≈ÇÈÚåw…?æÁ›èq+¯6Q°¸l,≈ÏO…£{,G∏Ç‰Fv+Hÿ}xB‹ñ‘√Ë$b[Ÿ$g?œ¢ÒY“ÀQ©´Çr!]v{ˇ≈¡·˛˜[/_Ì≤ù]v∞ª≥∑≥œÓ±˝£Äáê∫,Nﬁª™ì?–ìQÒ>£eUˆD≈oï›Œ'Y::› hïÂòI›¢øÑb°Ôi4Ë]ˇ>]¥xËqÊœ‡æki·BO¬»;Ÿ°WB◊z‰Vw¯€®ÚÆﬂ(g≈»Œ/ﬁwê≈ÁIéAÏ¬R≠øÿú´ smß*'ç8™⁄&Áø!ìõFÁ˛»ÚtêH6†∞ ¯∫:7ﬁªπ≤úëgu7zÖöÖÕ£ÈÒÑ{+õÒ≈èï4x<!t˜≤ê˛dØbJ˜™hÆ≤,~$’∞,q/-õ‹B!y“Ô°j†8G¬èu˜“tá˙°ÃÍí£2 ıpw{˜ÈﬁŒVmPEòCwÓ^JMÑá=ø3˚'óóÅ~“Î¢∏À˚¸lÎ˘´-äƒ=¨ÌÆxKÉ”ıPÎhÔ’w[◊w˝o˜´^,¢,µVg⁄ÙJ'¯ŸÔ_c˚«∞ô"JlDòMyg◊ˇÑ@bwàÛTr‡≠<˝‘®hùΩ≠˙Ã0Üºó%c?$£T$GÉ4ÍÉ>v2Ò∏…6âèöˆ'ˇÓa(˛ÌK¡ ˚ﬂ˙¯ûw”É¯‚V,ﬁπTO[´ëknú⁄¢…#π√îlÕS‚ê!Ê’Ygò;Ä„ˆ,T;¿Ap∂&*Ç¥ÌStπâq™ßaVU/ùGyë‰í/<%¢ë∑È∑ñ”¨B_wX∂ú…7=.Lø§îü&∂ª55Ÿg›QÊeÏÕ§ßÈNî˝ÍªlP’—mò®7q‹‚Ã"Íãı»	∂ïåN[ú∞KÏxö˙œíALÜE≈v gGç]‹}É"‘èGßãéˆnù∆√[‡⁄ÊÊ”(πê¿&/˛ëYR¸tËá¿"ŒÑ„t0	Ò√èl‚/ÉMp⁄YÃ¢ÚëòEˇd6fq∞ÛÏ8ÖX‹6Øÿy6^Ò±˜˘-g™›‘áò›§›.∑Jÿ˝µYQ Ωî@˚˙çÁWD¿ÌÙÖ;wJØWÀÈ≥
√Q b∏Ô@Kƒt˙äÏ¶Ãπ"$G{ı;Í%ljFIs›XõœtQ≥øb€î+í∏Ca])zv@…ÂüUÕRrÖÀ(Q¢2∂C÷Ç≤kD.êIO2§«áNøÕ´∑0'%"Œ™Ö”ûç“¬©ﬁ1I¢EÁî±6™jÍHL‰	àïú1é¶ºü«˝4+≥yÚ•@2¥bxc˘nôƒxÁé˘ò≤¨å,Fâ
•‹ÃwüÚà(4ÔÏ*|ïP†‘—¬TXœ‹ˆãK
•|…!m kª|Å3„nµ"„ŒW⁄ßqnêΩ~j*)%x¡ji·v≈˛∫Ãáæ“ó-sæg3îª7º;yÔ£”å◊u(‡Üf§ùﬁ0◊∑ànˆ¸¨h•E…‘êøæ˛e6‹î^Z„î0bëMç#°‹ÜOEBOÑ+¶L\Ò¨¡•>äD%±î≥√-…»∑N”¨!±i≠ÚE>RÀòôÄIòœ,8bê}¸€f±ûàˇ*∞5◊B⁄·ˇ‰£jE}/Ä6S~>πs j]W}œóØmÅÓí†k«…)X2¯Î`Ôoÿ∑áãÏ °ÿâ˙…Ë,N≤TyjG^™zŒ®gX>ΩÕ´á∞mQi6§Q~≈ndÁ˙èº0ãÂ2xC!JCOÃ}p,Eﬂ;âª |m±[»+T—£Ö≥(ß‚ÔŒÑ‡ﬂ/å	4 A‹m!J8∏≠éOØ
óË°\È2≈Œa∑}n	πﬁÃur(Ñ .™—Ω®z¡ò˜mÃ{g£Æ˘p'ΩEY«∫Ú·8˙íYÌ+U<K;J@ve<º›uLHcAaH<=KÛâQﬁ#Oon£3pÄ9ÜNòì kƒc ¬‡Ã≠Fˇq‡4Ñß‹i2&ÈÌs.gÜª6z2ün^®àZk@ˇª–¡ËØ›P¬H"0l†z•<Q©YÌñ˜˘î*Åÿ>≈ÈæCq‚ıjiwm,ºç ©*tÅG˚à'™¶9\iikÎƒdï°…gZÑe¨∂≤ƒ‘f÷ç‹5]Ô¿*{∆ :ß≠"G˙`ï$qD∏j/à£fDhVË‚è«0"7H¬∫¡¯È˘;À»›sŸ›}ê‹Q≠ñ¬¸„P‰¡åFi•¡ò,˘sëQ%".ÛÈ≈•Dı3w)±nIè’¬pÎ$ê˘Í}~"§∂´«V›ΩJÂsª•zÂÛ3á;ñ¡¢¨Ak+ÒxÜÿs Z∑Î<RÉU”3Û	•O–œ&˜ævas‹H}…Vïf¢˝ÓLëü´€í˝ÙÄ6TŸ[‡§:ÈÎŸËÇáOZ3KÁärk]≥*ÅQ≥¿b»R89Àa<ƒ76·+∑…VnãØîHÍˇÁ<ç«ÿÊyYƒ»“˜˘∆Â™Ω\!≠Çä˜·ˆW-G•¡ F†A»Ô^¨óN@Ùå≤11W
2Elå’È≤$v_úè„ﬁıüNí\à'ΩN%‚¯{!ò¡`†ÅÑê◊˘L£¢®2òôxNS±˝VÃ&∂≤j1—-$Mc),IŸ7aâŒcπËÆnlÎ  ‘åmÄÏvâï‹dÁ∞´4v8RË-pbaÙw √∂ÍpW≥‰o¡bhõâºåªy1äŒ`QÇˇ°æ3âál:,C/¡ Ï<ı¶êã;e Å>ê“ü2ı3føº˛ù‰*ÑŒ	À4«–y√XÉg”Q2@°nkÇ»M§™vLê0ÎŒ˚L°¬ † .TŸjúñöè!Í≤·1ˆ*Ë˛”9à∑∆Ω—qe:T†Fitﬁﬁ=…>tzi?vJAÆ#ÌÍ£≠_lΩ›ﬁˇÓÂ´√Ω]Q’ºá˜ı®MRˆL”ÀoÀ‘á^wﬂ‘J`3»∫dÒŸÚóL∫àïÉ(ÇπÑEÏ∫ÒaTèÂ÷Ò42°’°WÅ•AAqJpPÚO?$TØs2àNØòºµ 	Â≈ÅÚÄ¯x/m©Qtjç•Ø0éÉR$¶âD_≠±ØæZ][[^ÌÆÿÓÉπÈQ˜]ÀÍ¶qjï+gºA ÷Ûá≈I N0zvù\@,k`Í$RÑéFgÙÈIe˛S=P:˚»Ó¨~ícÊdüƒóD78H¨Ó‰(e¿‚º]\Jw∫õ§¿ù¡t©Œ˚„,…0ì$O≠Ñ9 Ü@ØÆKÃ§›ÉÌx¡Ó¿ÉÚ7ï‰ÊµuÀçx·ﬁ‰€…∂·{¥@¡5øR¿Ú$S&-DQ/ØíËéy∑–'§¯πÁ§ÄûïÉ,∆»EõÊ!kÊ√Ö@”‹YAB&æj›d@,‚·„!§¿r)a®ëÓõl'ß¢m¬Vf-˘ƒI≥ı„º-⁄≤·ÊúåF-q<øﬁòCAÛ!Ã]aZôFX
qkeEêkß—`±}eò‰Â¡C˘
Çe-“üøƒ˙ +%pjÒZá]ÁNhÚ÷)lW[á}·5Ö‡=ÇuÏ¸ç7ˆ·›è{ú≈ΩÙ„Œ9Ωq∆qá>g,Ó¡;ÑÆ $‚ä›e›¢\,¯YÎ™¿S1ìÔ {Ô∂Ôj|ZbˇÚo˛A rÅ*ˇ¨‡Ë?Éø$´X‰PTMÍezûä—öÕΩ£óPõº∂y◊Ê< ¥Ä⁄õSÚ;=Mõg∂ÊÙ6~+]‡∆X‚äÜ∆u!FLioæ–´*Ô®O¬tY8kqë˘<ÂÜƒ}Øˆ±
E~®—_◊2°ulIÏOXKô'ßæÑ%9≈ì(e¥vîE·ü@÷"kâ|∫—√®ÖÈ0‚ã Ö„Ê
=…9f>·¸ÄÙú˙xqáÌ#z »=a!Í”ŸL%ä`ÕéR∂‚b∂”õÜ”~‘qy·R⁄°˙Ÿ,ïmÊ◊f£8œc∆+I‡wiÏ·›k˛Ú≈∂ıˆı ÚÓyƒNº˛#À”c ?	¢rH_Î©£t :â'ëß†Nc‚(π2ò]à4·T[\“B∞‚‚Î‘ñ≥≤?OÈI4>‡€eOÆ6Ω{¥P	‰¡Avk-¡%…≥Qpıπâ‰≤ø∫Ø⁄≠R(Úë†_≈ÒsT√d÷:ÿ˘$ÊÈq2à·‹ˆ´I:VæE’‘™j— Véu≥¥ö”úÏ|FjüÂ£¶P?‚˝U“ª°^\)I.⁄€)HkMRê∫vÉƒTñZ:(3Œ–$l„µüQÓ¿ôvºÒÿLf-’YtìPm9åﬁT•¥9Ñ-]Ê b‡ò§à›„põ≈˝≈ˆ‰™QssÇjâ1≈"Ö∏›°Uç íÆÀåÚïLR4$Øì¿!¬ÁßJ5¿)Ôπ„Ãîe
∫÷ôÖ°0~mﬁ¬Ö7LÈUÎäœm(¶ï{âÂFèõÎõ28õ•äXUXÀ 8öÕe!4Uc/:5ò€ö4°‰˛pÊ+PGæù©:º˚)ÁäLﬁ?§π‚˛Ës≈Cπ	^£v∫πÙ ö};ÖŸ@(Õzg…#ó2&xEt
∫A)Ñ—CıÃ≈::√™ûbCä±U—◊ñÿJ˛ˇÆvyLpk‹õx
˜˘√’»]∫ºôuëléƒkëbü\mD¸*Ki“`Ò †‡Í5Ï|inéÄÊF·™êçk≠#"à√k"ﬂ€‡H‚‘˚@qËøáÑ˘≥¶eÒÖΩñ<ÊF”Íbâ@Ö.ƒnd°≥zQø˝# ï;z®ibdÿs<≤^}*yåãú#äÉxºÔ0éíúõﬂ‹ÆÀâï·≥Ò/	ı£]§íàèOœ≈î7L@èÏöM˘|‰>Grl,Ù„¨j+<YuqpK¨d}ÅX÷ãu4ów>XÍ“ÕÔØªó-Ub?e›ŒWefv∑m<Öç“⁄Ò¡vJõ€Õ›VvÃÿLÎ≥K{´∂~⁄ï21ôbË4±“ñZ&Â≈@≠^µ€Ï¢≈◊$Ã„æîñ3K≠W(U^r	±‰ìSJ- °—lπÇf∑D¨@‘YPLW(@ÄUï<[22<±iÔI’µÃíˆ¡`ò¢ èe≤–C‹Àkkj®DÚ._?Íò˝ Ä‚S!¢∏·≤¸ZÄ˚ﬁj˚û˝ê	çÂ
Dp~q™Y+Œe<mÔ£µuo”ê¬#	?∆zp•Ap´€MÁΩﬁÿZKyiS¢xΩÇ»qCº<”–fRéb—Í@ıi›I¿ﬁ"ÅΩe>‚Ü1A”gIŒ∆ÌO˜å]&£|:8IC∫~ÄÓ#–^ºÒDΩh–√JIìdò¸& ∂”lÁ{≤çV—⁄A‹CÃ‚ÔÁ ƒL≥é¥v†Ç%»õ›{qp∏{t¥µˇˆ≈ﬁÀΩ[
g«:$‘ΩHF…0≈"Xk]£!˙}:I!‡ˆ~BˇP§√xíPÓˆO=o‡5ì÷ô≥e.i+ı≤Ù˜-Y1ı˚Hh¢‹ÎÕZ„,>«_^w:¸æT$,£˜ÿ•Ô[mÃ&öBWóX4‡àÌ]vı∆|gFlXæ€ 'Y2:≠È ˛€ÅÀ0c≠1]¿î\Äí~€|«îÍÊ⁄ÔXb'I<¿Óãﬁ.≤ﬂ≤Eﬁ[JH®]g\˜`T:0†Shæ({¥A=Ç9¶‹£Ò{MØ|≥ŒDéLÊXÈ∞⁄f∑›π„\Æ»∂=◊çFt€ãxíëân€Éxp˝'\,¨xt°L®J:#_É≈∑|∂¸˙ÀÁgor‹ìp≈À®Å	∞áÂºó•É¡qdcò9ïg©>/àÕä
Èa: mwÿ∂Ä*≠±Bo,)k®N:”4™=O≠ô4+ÎXµBGëóá·˚=L˘8ª˛#U ˝ˆŒí>Â†Äf.∂BÈ∫Á.˝1j 1Wä~=MñÜ å0ûáp`^Í$Á)e¡A„æÄSêù«ø·π(fÉ”7◊ Ûû˙sN7Yÿ<àØˇÄ±,ÁI§Î6Í/îì3Ò$TÀ~ò·lÇı^yÊ–ﬂ3UéÒ‘•Ùÿf+ ¿¶ze∂’OzI:¬ê±{Pæ‡=_‚Çz¬'∂_8ö=∆_π∏©∑c‘ÊnRìöörc‡ö◊7–˚eD-J9`p¸≠∏„ØÀ◊ôyÈàÃQ:Î(v>œ¡¢[^-ıB2Fdàíèç;b;_ŸâÂ©ÿSÕ¯‚\b3Ú(gz«W≤;*…á'r8Î+ßú˜cµ+ﬂª∞y˝èüt.∑H1¶í&A3Y»0±iréA<:ùú…êvObÛób(ë∞m3‚JãRÉ˛UÂgEí«}^ÑﬁÀÈ„ŒøÛÒL[p`◊!ÖÑv·p°59zÌ€aD∏n§)I_
¯”ˇ  ˇˇÏ}_s‹»ëÁW)ÒÏesñˇ)Õåπî≈s=9"GﬁÖB6@„ÓF–›Õaƒ›„=‹”ﬁ”∆>ÏÏ=lÿ~9«∆E¯—¸&˛$óôU
UÖ∫õ¢ÏÈà±≈n†P»   øøL•Â´f:Q+xÒ$˚·cUcÏG "∆°.˜©sjÃ/eÃ∏2îd|∂.[l)ähJœ‚M¥t√q”ìAb∂Íö5Œ“æO˜≤ÈﬂRR7kê∂~I2q˚`l$ŸW4Rî›è˜ª˝ÿ|8ïÜ˜¥ãY1ÂÎﬁÚœˇ∑ˆ=Õ€€∂5ï"πÍÊTº´Ì)üItÀ⁄#∞"8j#Zúf]r÷1~√ËO√/≤ˆ@V8vxÈnR,ªN≈≤ (ióqUµÙd,Î‡åÂñ0)©4nc•0WÖÔ@ËbNˆëΩ¨±‹BŸ1µœo∆—´F P¸ˆ¨ùºÆÕl¨Ö.V≈w50‹√q)ÄüU¥±(%x
iP—M¡üœX®ü≤$»π+1 u% {Ö_¬€?ÄE9◊öÀˆê?.;aŒ¶Ïr(ò¯|ÂzÂqlÁ1[_]_ﬂ0*t÷5©çÒ™XÇO˛Úoˇ¬é˜_∞Á˚«G˚Øûﬂ˛ØΩÉC—Ï*ÓË8K“†œrñ∆‚†Y? ˙	óŸÚ≠‡è»Ü–⁄Ω◊Û\Ûˇ◊g*s—‹±ZÜÔ˙BØÇŸﬂ˛1c8ÎﬁEí≤Ú˛d√$Ànˇ0âzˆ70ä)€ae∑Fºä∑Æóﬂ—~Z¬JDÿuÈˆ«4Nx·œ Í≥QÇãT¨`78ÖoEu–†˜’Æ€çØ–…#iË0Ûh∑ÇZrë≥™«Ÿ
+Qé'z0≈mÙyã3øOã#Â‘ù†?ôd 6M≈ï¡≤ß€?`≥!‡:å¶Âi⁄3õóQËû›‘Á:ÎÈœÍr·|Ì[€•òRû“·≈q∞Z˝R-±kIm,π‡ƒ/∏s≤◊^_õÖ¨A‡?©·›Z«l’áO Ù˚Q.("œCô:åz(G o∆¿‘$b»˝ﬂÂ35âì™$ô™ Ø@â#$V_ÎW<© yÄo™√5.ˇÎrL˚›0Ãgà≈Ä7O
ø{ê∞Ω M„¡EbÕî®EãÙ*ÔÉ]Û˝8çÇÓr¡˜≈ÕY«4L£@ßi SúsﬂpùÊîó∞]–©‚	iÂáGò±<ö°yTØˆg8[Ó…Ôˆ}‹≈ª@¶—›_∆∆U.àò 7J‡æïÎÿV_}CÈﬂn˛Ç&'x£˜ì…3|=£ˆébKﬂ|"Ÿ&ÓhÕˆ‰9Ú‰˝ÄqnXå‹H∏”ò∑EÎù^oéM”—ûåa9Ì·Íπ˙'X¡]$€»˝Œ"áÑBåÉ¶0/.≤È8/ë˛`Œ¿ √["æ|ùè‡é
5¢	w¨ zà∑§≈∫{ÜthÖz42LÖ}ƒÀd∞¶MÖ£⁄L„Úë\0&µêjú~<ÁE4∆¶xÏ't1»¨ïì—j£†dm?ÍqVf2∂ï◊;UËß®7nRÚÁÛ*ûˆ¥TF˘êƒƒèñ|C<è≥a2 O\]+#7!ÈŸ”“±dÓdú6ö?/\[¸#{Hå{« íG“›t^æµπ_P„Å„?ÃºËêÀ\l ∫e/ä”ˇ`K*—QE√ﬂøuöår4Äå‹Q˛^ C≠˜âXb˛™”{N,#"ªg'NOú8syıV	ÕËs≠{ï¥è®LH£‹∂Œ&mrÏÊ2uMe2Â·Öè>ê√íÜÓò∆†ïüÖ{îˇÍ~∞·S
7∞fB}„ï“k∆‘‚YèÀCâ≈“Øï.¡Çôó™L¥O’yß}v\çÊ["œ≥s«ˆ]AπmÏ1aèªkÉ0◊¶ÒVMÑÿE*W¶-KÈ8>3fDÃÑXm2#⁄k«öKjﬁP‹'n¯ÅÀ∆R0≤¯∆'"9u8≤›.ò:Èà4:ˇ´ıqm⁄ÕÁì±Æ∂%ù∂A\≤ÖE,ïé≥S›éê§∆®≠©˝°BèG‹i`˙ıµ…∞“2+e-‰.€æ/NÌ5Æ¨qOÌ=éI:¬W˜#$ô;⁄>XDíØ=<µíî∑Ÿ€oÔuˆ¶zn∫√“í˚˙€RÂœÃSÂ˚*jK•v]%â%J®tÙä8nUzÿ¬›˘Ñ îZ%[‡¡?´	àπ"bV  fËÎ∑±llVõÉÅ˜á£ã&MIüã{fÄ¨#Ù´ËÍyr9(?Èö≈gË¢˙Mt≈áﬁG1ª∏ƒäù3x‚ûÓˆû˛ ØÊ7úëäB©;‰£
≥l÷1À/#ƒîm»-¸¶øv1¯5Mk”(@ÓXD€ã‚ÆÌv≠ÃJ∫µNy˛AÓ≠{‰Œ%£FïÛøÚù†âºzI4ﬂÛ[Ú,n"ÓÚ∏dè+#Í6øÚ¢t•xÜ˘“8#‹`>”«Éxt¸ßÑãÕ#aÓ!Ê+∑WJdTâí´«¸FÓ±ë ´®«‚nØŒÂ2ªXÊπç®v_≤OòÌÕ1Ôw/È'˚X†^˙ìÀÈÔmê≤„»~ˇó<ù≤t˜Ö◊›É ŸÉˆ˚/£¡¶
*c¿Í>(ÕN~¡g=Vﬂd|6Ù⁄Ø≤ç¬ØGWˆõrå1ÉOrz{‡ˆ◊ÂCØ”≥¨Ü—IóﬂØ8È¯;Æï~wxË,@3Çó+ß¬SÂÂÕ\ŒgJ§©å≤ùØÄ˜éyÔ >âÀ∆¸$’√√¨Í~][c«	K£ï,t”dˇñãJ)ÏÇ‚·—ÄåIlQ2Œ∆`∆%≤À+>(0ìqu~0=jPB“5åÜIú1Ï/œÂÏr—Ù€¶$ëa‡eQGëE’qÖ _æelûërÿOí‘ú$yÄ&*äÚFcÃ˝œxà(ßs åú7ˆ¿9bßŸtπO(—[ñ†∂Ä6˘/æHbÍ`ƒΩ]Ú€√IV!Ã≈Ω∂§KG?ú©'∞ö…x‘Qm∞“X}úe√‚ÍJâ©2«¸®÷yo[9'J∑TkıÜœ:2kÙ<]Às V4∑Tπ4òuH÷ âíõB—®Iºoù‚èû¶—Í?¥(Õçíîò5çÑ6‡]®÷êJ&'ÎÃ	ƒ…√}•®oQmˆ#Ãyû+^Ç)Ro¥x„‰8-U
¢’q†µı¶ZIz]“à‰+Z√ï&3üµGIgã≈SÄ\aôí∞PÕèΩÒM_ûnıı9æë•éQß´›eî+°úq¶Îä™Î,M´1ı$Í/nî#&)ÊÔ∑ˇâQ‘îµBæíÅ«˘@—¨5~¯±v±ÎM_Õ]÷÷:\∑ú2‘;M¨∑ïêïè≠ˆŒ7⁄€>‹˚Å‚ΩªnVBùÏ‹ìñàUOìNÆU À∫∏¸ı—x˚9∂Jì[6„ÆUp‘MÏ‹≠¯qTT˚ΩPYÊRÊxÊ”˘L≠≤≈û∑›÷L71 Â˙Cˆ˛HgÛ[ÈfãaÙá…BP5:ûê‰∂f›πÎù~PÎx⁄>Ò`q	≤PIA∞B—õ√z629‡
‹≤◊¬◊;pÁ#x˜˝ô6K¢–∆é;C7Ç„+jb=‚√#pDlÿØ)¢~nÖœ®◊r˘6ª8¨`¸]´^ë¬Ô“Aó+Ô™Uqô¥	JòB;˘GY¥ÀïÕá¨g<rMmUa±í° i©ETÛ_,/a«4˚¥l> ìoÀx–q<÷ı®íS√5g®w/oösŸÛÆ©Øì∫·Ù˛Àn~ hÕô]”˜	lUß}∫ŒêÉR\y˚‡.ÂÉ˙°Uöüv çˆ„¿nÊœì”<=eÔŸ·V¨3⁄©ÃGÈ+œõw”€ﬂe]8ioÑOú´¬xÀÌètOÜJÀë3å2”p6[V¡We2Á¨ï\∫jÍë∏©}.Xì‘ˆ¥£∫D∞˙.‘>ç/ŸÀë
LŸ`Z6¿M5·BEè˛‘TÙ$Ms"ô·ò7ætì>÷E&ŸepÎuòvÖÌRÕ!SR«¥ãMÿø._¢√N&1ºﬂa
Êü∞ï0Â◊¡(€Õ®M0'€ΩÍYUÔ@ø+YÍ⁄õØÇÍ•â‘ã9lcGøà˚G)éå—∑≈Et∏}É˘<{AuLÕõÌ}Ú^ﬁ˛	äÜhN0Ì R"NÁ[KÏ¯Y¡ˇ—ØöüÙ—Øws¥_˜Ë
ì_èπµ⁄U´m!∏8FÙ¿>≈∂+	Ç`ñ•bP‘êÁ∂ÇRî¢ÏN´â⁄s/:C%	∂¸†©{7Xß97–@Ω˝BbÄ‚ÑQU ı8iàßRv˚GtJ(O∆ §'¥,∞∑0¨¬=r"ª Ì∞Òî• Â¥¬PC˙âsí±´ôE•™ Vu}f«üY==\À¶BÓê¯7Kﬁ"m‰Í·ıM+{˚ßﬁ(6”€ãÃ’⁄Rìí£wªú&ÛŸˇº3ãŒ˙îgÛYß≈YßMíûè/Ç4 g&•œÕ.œ˝:˘ùGì8∫åÁÆ©≤8ôÙ€ú˘ÃØµã≠©Ã AÒ≥ Ã‰PÕbÓáSf1œ:PnÄXj‚97jƒ.‹ÿá™K%œ_]x≤«aV°¿⁄„òz≤=©.Üz÷⁄‹Uf§:≥fìbj∫µ£‹âeç¢∏ﬁƒ£∂;˘Ãt´û3D%û√ÅB>pT∑ßy¯$‹h#võ≤â;SÂ weïÔ®ú d§Í4!¿…V~dﬂç	*&/@æW{ÛıÌè0-PFF∑øõ…˛ÃÇ≥ßÉQ«J hÆΩx±vóáﬁkÛö 6ÿ\¢ü§q/3√™ÚΩDÄÙ¯œeáÔm®Ù
}¯æ¶◊ëæÚ√˜®§!‰QM€ñj?˙V¸Ç∏€◊8#Q:?∫∫yœ¯X˛T1ß·ú¢–î∆«‰Xˆî»ë'õ?àÀY±m√ÖÚ«∂©∂k¡wZ	◊ñ“ôÿC€Œ"Pa¡(ºZ`1¸ÎÒıQJMGot,›∞—ØÖb®Û*®„ìéÎ’q˚˙¡yt ˇ¥LãRzIPòtCﬂ<¸eäπ l»	pìÔTé¬3”<éû1C+`áú}Ë8H˚%ï_*¸qˆıÊ*|Ç¯]ŒWÜ∂èïãıŒºòÖ/ÑÓª«◊h(£¨!Ìd¯ˇz…íFåõïZœbV˜ Sw√$)5bºRˆ/L6øÜÄód#Õéñ$,ªçñø%È∑ù˜"ÂÇ;í˘$∞—'>ñzb°í„øó	ÄÌ¢]9˛ÇMΩﬂ—Kî@.—»FW€lÉ›º-M·f©Ï8Ü˜˘⁄JÑjÎ›úÍ2ˆ≤&E√u"Ô ;˜zÜ’€úÜ·aÂÚjga
ñ)ñÙ)˚vüï¨F˝∫‹jƒ®¿KLU/._¨XíΩÛfñ§Ï3∫Ó”g÷ª‚∞òA_Iª3Øæi#∫äÚ∫∆7õp”¬ìÁàáé∫‹z¨Ü6¨±DèF“ÃπÚfƒ∏cOút√Ãk0Í,Ê¸fn‹^Ωë√4fQêv/˜d•ªh~<–]Ω√∏ÙIP»ı#¸∑¢ ï„&’∆)ZooãÎOE^ËjíRÆo’†'ıw4© «DVyŸ†æùœ∆:è/±=YX)2{jM!dÏH@…ÑFmÛ<:Y”àŸtØ„Å/'≤Ñëœ‚°Yeo‘x25›jÉe˝Ì⁄jy¶¡JZ~íTkQ]3ˆ†B˘‰#»¡“8ÀLhõïemzôÂÀ∞MqÚ≥xÖ»¡ùΩ·Ÿﬁ`¯]˘•éæX€{yÙè∂w‚∑î^g¢∑Íˆx#>Ã6õÿÊF.zöŸ≥Wrn“¥VƒÕåì‰nù)ßHÉ8&X¢⁄´1*≥€§íB{ª Cû√iôe Ôm£7w(„ËÃ·5˜}LßànˇÊ©û≠˝mÿ+hÂ`¸◊¯A"Ç–T≥c¯Œ‹g Øû‘¿Û`DY±˚˝ò‡ìûı˘^¨ll⁄0”	‰ﬂSı}/O‘Ãn„9™˙UtµÏÈj,„QÓéPÕDó^$	»ïÉ„√c⁄4(W ^”´öΩ~^æ¿≤å˚£`ËjŒΩ√Få$5ná,J'`/èÇ—8£»·yìwi‘çN·ãÊúïJäü◊∆)=≠≤}∞””‡  £œ?:K^ÆúÅı◊åâi≈Jl+Q.?k“‰Œπ4K‡´Ñ<¶Ï.ÉüÏ~πˇÓ’Û˝W‰OÀF¡y‰ÍÔ∏ìQ£‚5∫˙FÆ©¯ÀÑr‘NàY|µ˚lˇ´„74Ã[ko§5>ÛhÊ˛á;kú!}˜ò•LÓS	ûå}¢-R]zZßÎrπÓ„ªX*Ω6xCh/∑≠…Y6cKç¢-h©&Ì\åµΩ uﬁËƒÊÓé∑v#™πçW8‡ph4Ô…^≥Y^¸¶›Ó(ûD'¡igq∫O`4Îjå4!áH&©≠$Êjä©“ÀmãŸΩäIπÈe£©πqè»B+“‡êÍ~fsÜ+Ãe‚ÊÒB»ßµåCˇu´h5n∏LÉa√≤’ä¡ø…˙Ò`ÂreùÈ(ÉeÜjÇd@9]eÅòK8.ü-`°˘«Ø?0S‡˜hBÑó√-Œ;™ŒÀôÑO¯~t•‚pl,[JPÛŸ∞BÁáœ7wÛJœn·’ïú*8«î0º»û2∫*<µ8ÁäÛ,Uú¥ïè3Û]Sõ §>cz~ä[kBﬁG'S5=≥‘⁄”Õ=<°¥Ä w]nØ§c’˝“`_0[¬©QÑcc–xã{tıÎñO®≠ì†O5ül
∂¢MÌ‰-|ëÛ$ΩBûZïíÆë'TY3‰Å ÅœøW8—ÕjLÂ6l\Sw5Ìdﬁ|f= ÔÅ‰]/¸ú¨?¢?„©Á‹2ZÆù¬»X≤ìUÁSê	•ÛñæÿMpïÆ‹Ï÷ΩòªÑîƒVˆ@,íaÄ≈ï<#2e"–∂våìEﬂá{∞∫∫gÆß»¢| qÜòÖ≈.Ã?u)¸W	tÕØû'gQ$ÿ@¨–`$S∫IOå
Í°‰xUM◊˘ª\-dS‹dU„7ÿ¥~¿ÂÛ8˘Yì√üπ°'ÀU††eÌDökL*<_‚±nŸÂeÖàG¶"¢Ÿ*=8G%ÅøÖ∑r¿jı¶◊EÇ›±ÚÈ4*B•@≠÷rœ≈}Ú◊60næ¸|7er˝·Õg≈úEYYëû3”Lõb∂÷ŒpmxÁ,∆3¢”yWpœŒ=¸‡∂$=ïk<ÄùíVﬁZyµ¢‹±6ˆÇs3"Ä…–˝Ëq?∫Pm›á`ﬂ*˜ûÁ åy¬l*ïÅTSd´soë•≈È∂DÇ„P){¡dib]1£_L‚„MÂìÉÃ∂yÿ˝ßW∂A4ÑTÉòÄYƒ^p˝¡k‰êàS‡EÇPõ∏úH>¯rÙpaçÂó¿™Ø ’≈˙>f^Ùüó]Æ>ÖıG7ÒQ“ã±û˚(8	L◊¨2˘ˆ¸lü¿v˝à6≥Î1ú4&¡C.…ñÒëRúÆIDƒ¬~∂√ΩæAØb˙9ZÙzË˘ñ3∑v¡ê∑À„¶⁄¶°!`¶‹\€®uaπ√∑lŒ˙Ûz#lJöà÷òwAé©⁄‘"ãìëÓqàò[ça¿ƒŸ&öÛ⁄∏YVı'UÕ1U*äQùÅñ÷ãöö˘zø3-Á˚a•ûd˚ ˜àE’Y‚5µı°Ç`Õv–Ú\K∞j ì¡ú7ÂIa–€i·%ˆQπ
À-Õ—õZÑ+É∂nv˙¯Ì‚á⁄.ŒF¢¯KèÃöK±Ã&oœiÚ∆0z‹ÂÆÍÒHJÒSö˝
Îò-
éPﬁ¬ûo‰‹î 9„»˘Q¸ñ9…J@yk(1¢Û†“Q¬4’Jõ£í}¯Pƒc}lëZ\\€Ûyﬁ,r…®Y≠ı@a» ™â<ö≥.q-Ò}ºlU∞„ç«£t‹çS`¨€Cm{«=µ˘\fˇ¢Å»ñ`eÜ∏›úîyª
u?ÿˆ$∫“ô;{éπ8áû·P¶Ã∏≈Ò(ä≥EzH7A(´$[ºˇ¸„ë«ë*ôÚ∆)ø@$X∞ùÚ\0±€≈´‹…j’°%MÎFﬂ◊’åoÕ{cmˆ	S≤öÔtÀÏ!$:I19ä¡¨àÊ¥ÉæFqÔbVõHå÷4√î˝unB<∫A‚`nŒ®ø%ú•¶i(-ùw¬¢q<4∑ä–\ç§+∂ŸÛÚó{˘æa¿Í¶œä∏ñ˜Nb ;û&¬5’Xtea\C≤ñLa˚sa«"Z<æ§zK¿:»âÿjbíFK3ó^&•ûU"XÉpîFì8„≈0ŸnoL›ú;…ê"2Ω%èl_Æj¡hr∞©¬ï—l˘øï∑Cíbë~ïLir	 Ó¶AÃÿ_àﬁ&œΩ+óË‰˝ÈJ|brX¥K‹/M–DüÍÉÍìÅ§Ñ"Uw6`æ•íxñFìTÂ¶*JÕ	@Õ®%|ã\¶øY_]ﬂ|´˚ ‡Ñ•d†Gï3°"˚ΩÙÎ*->†T0]◊>/yf°]ÔÏˆ¢t¥ß›^$£¡õîÛõ€ø√‹˛e˘üˇŒyÑæœ≈:B˘EY`ÁQ<‡◊L«XÙtåÏ:Ç‡gÉÑ=ˇ"/ï#å>YA…ÂÊjUÚòLÓôö¸,Ó(È›˛ùyd˚Àw4&Õ∑®‹¥X¸MÎyÜ∫√—≥|«ÓÆ¨å8]›Œz[∑„<ï)À9x}x˙Pü¸ƒqîuéø:89ÿ€}w¥˚ÂÓã˝ó'á¢rfâgÔºA®:ÏﬁQK;qòóÎ‡?≠'¯5pì—ÕÍjò;µiòÁ4çœÉQ˙À6{`Ùû+óx∞Ä#1îsG%“˚√ØÑ¡YÚÆR∑•ê÷æ5?6∏‘-ïz(ﬂm≠Î›Jºkb©ëÿ~aV
—]ÆlQÑnK…≠;≤é‚∂pùÉ,öp
®ØΩI±:k¨“ÂQâ…A{,∫8±÷´©OJ§p≠öÛ#®ÂH6ìaµÑ?˜ˆè¯‡·ãq7Ê Û‚T4Ó[[EåEÅû«AFeµYÈcùn“?Q Î‡◊au„,Hó|8G›Zu›ŒËÒ˘£πË<k_ƒ”Ï<Å„ƒ=[„	¡Xœ#‰ç_^∞çVò÷ Ú4D‚∆÷:É±yyzà'‹æù|nè¸à≥Ólµçí–ÓŸëãJR≤Mî#
∏ —í¯‡-=Úcu¯4HÄΩSØè¸‘¶˜W‘ó√W{Bk˘‡˙ãÚq©2≈55…ø9õÒH9äã5˛X£Ωπ·≥7Áµ;øΩß~ªSﬂÙ˝wà$˘ä&«s¶⁄p≈hFg…ú7’Ç;U‹É_úLÈ‚
lÙa$4œR©IÊ©∞AÛlmÜÒÔE÷ñÅ&Sf∏|`Ê™ØC0g‘•Q?ô∏hS~3|•K¯Ø÷Ù)ÉQø∞AJI˝E9y~…¶ö4πsíŸ≈f´º€œöPÓÈ(HﬁÉ!Ú—ﬂV”ÄµMﬁDÀ∆~∆*˚˛C	˛#N¨öte≥ŸÙ"ï¢ÿÒb—!f√∞Ûb…ëfXñ/—#üΩÃÖê n.m¿
·¢çÁ6±µ¸5Õ	ÖêGŸïQL}~üŒ¿{…t ≠âïÒÊ˙J˙ÿÁf¿™Õ2˝∑ÃÙ7AJ;õÁ÷Û'ïì	Ó/«ôÃù?W˚‚k¸Q≤¡∆üˇƒ^GÉn,|Ïç4_C¸lïö«iRå:ù\œ[ûN
T
,ˇJ%¬¥¶∏aX'åAË#0ñÛ°< ‡ù≠ı∂ºS ¶ÏÚGÃââf{î∏∑ã±BA|0q>™®·Î€œœ+’V¿6ŒV¬ü¡¨‰`y¨èV∂b·Ü≈ÕÀ0CukP™tËÕª√Än^≥¶TP±MTåàR
TÃ"¶‚Y)"¢3+a÷ZÆ∂ªT‰î—ÑΩÇÍ‹°ûà›Nÿ÷Ï…`…øã≈eÖèπ2èû'◊YbOÿ:Ü˘ëM]]ÊExJ(H™û¬]Õ`™„~"”Ë®’<ãﬁ«ëäi+E¬§9`&S≈ÚÃ0s˙∆YI
ú‡≥ÇŸ+eÀ0îßtnû†°•j)·w÷ñ=/ òo◊b]Û\(GOï=E÷è2Xm¬`™¶;Mµƒ<ïn&KlÍc_‚™lûel∑AjåKûÈvîdò‰ÀÅßîN∏ÕBãÎ;™ö≤UÉ:CZj⁄ºëá†¡=ú:gƒIôjù∑âÖ¶À qN†íK≤1˚\íBÙ‰3` :—˚nƒì&ÉD¢a¶(Çö(B¨.c4œ3zr|˚G‰E¡4I∫∑øgpHﬂ˛àÓ€nFÏ¥F¸xÅpàH¯¡2˜•§åœ¢Îƒl9êåìwø†≠ìÆ≥7õ/î#eƒ@(öì57€zLÓëùh7Î®èèk}hGªèÜc3 ¬À \õŸ£=ä*©∑œlñÓ≤uõ S]r,πùëm∂Â;ÚØµÊ1èö¿9≤õRf¥ü£nåÌj}é'è–3∞ff|"G4
õÚ»˛{‡˝ÛqêÜA x+Q®1L.Jä—~bü∆Ï£∑
r≠áxjÊ¨Ù ÷∂hnzU”√®ƒP/ì~ÑÃäUü¸eìÒ}Âªc”í8_LI‡`#^]πˆ*≈ºh¥Ω=ﬁBAå9ïAnÎc∑»gºê/∆Ω÷|˝„8M26DÉ.…⁄‘QÕ 9≈°¨ÕGÚÒ◊Ô¸ºF5õ}ÚûSAÎ„¨
`Dk,àfO+ÏØ›4óîæª;ôÆ…ù3ﬂK˜ç©æ√Y5e*Ì¶üòÍÉ1U{€ª˝±◊˜¸∞s¨ÄÄwò‡ÖªÆ„û,Ø^≥a◊Y5@ NÊDê‡õ:HXˇˆ˜ıp6˙`˛ÉéÍ3<\yó`6wŒ«'I/Joˇc 6™óW‰."8öWÄ”Ú€Â{˛∆£Õ ‘Ò˚9!ßRÔµa>rÕ˛zÌv˜©G5";±ÄÒm÷Hﬁìô⁄Fq7aü¨Uøj®é∂'¶äÿÇrÊd
/ç›≥UõU∂Ã0Û§<ß[*HF∞Xéé~ΩjÄÚl^b)ìÎow»´ótZI}[l<ú_#2W"òã	 Î≠$w£‹]fYröF¨}C∑ÂÂ∏9•5√&NÆú¢Ëw4{,6vêrãªc{x[uÕm’i4ß{Çfçıæ5m¡ŒNmV≥—yaÔ6¶∞¿VuÀ”aÏ—Œ—cÆ ‰-í•(+
ÜRuyPŒ«◊◊¶›-…Ñ] _˜—˛Y4ä'IvShfEI≤˛™(…ã?w—$¶†˜¨®WÙ¸…â7B‰Á9œı´Q‘‹,êÅÔ»Ì¸eêb√ß sdºiúÕÁbº©‘–“ π:spn§kL•®ÿq∫|Sˆ@í:ﬁtâ{∂ZÕ“jûbJ
˛WîM≥Ç	®õD≠”î!>≤U™ìõFÛDZW— ÀxteûÒ¢ÜIê∆ ï@ÕªH≤—Ç+ùRoÈ~ÛDÏÉtgÌô%ï_<%å≥‡¥Ö`π`î|Ãõ‚Å∞∂a/:îj{Æƒﬁ>F.aJN)˝π‘5ËM‡ô	uH•øS•}Cá”¸¢˙—X˛{gç'˛Ü#ëˇ„€1§ÅB÷RF‹}]ågx…„Í] ëî†(k∑ß_-óÆ∏âwÆΩéBêlÉsy–ß£}µ
v∆húq”ëÓxpA‡õﬂÓ√Ö@∏¸ﬁüÈ£≠Ç•…Õ∑@fyµı"BüÏ":◊Î(%êŸÍ•¯%Hÿﬂ≥çõoópÌ^&ì$üÄ∫nî∫–;œsg’u≤¯:±~~Â˚KN.ﬁ2¨´9Î%ó∫VlŸQ“_…∫i“ÎùtXeáUË	kk°ÁÉ2=iëóçµÆ
^WıË—æQ≈5lö˝dΩ‰7ˆ›Ìè,‚1–r∂¥Tﬂ6¡˜„ò/€∏Ä…>Jì¡˘ìA2	ÿÑØ#X–¸K÷ô∏VŸ>Z¥B07≥Ä˙÷Ò‹û0¿⁄çã8#∑n¢£ãt’|ﬂYhZÎßöQÉíq:ÏE∆CÛ9ÿ*¨{j⁄pn⁄·5±mˆ*8ÇŸWÄ7≥G)›ÄµΩÉQgQ2≈¢Á}?`ádQêv/˜d•ªhz£tlúù©An£⁄ªç’Gzı_sÒ]Ò[^{W,eQzWΩÃÂ´tﬁÈÔg8’véâ§J¶˚⁄ˆlúuQãÑÌ=ÿ-Ñÿ[©¡3ÁùˆN~Ëƒ>AhUŒ|usÎ©ï˛˚ˇ¸Âﬂ˛ÖΩé]Ú`t0ü9eâáVïIÕƒl·kÍ=T@ó§¸$O¥.D0->—Åhæß‹√5Uuîe¶£k™`◊Él≥lÉéæ|∂r(î°≠_Îﬁlo0¸Æ¸FG_¨ÌΩ<˙GÀÒ;JÔ2Ÿf∞¿¨ﬁØ√Ÿf€ƒé.@Y£i={%'vı"‡å(«í6œpà∑N7?¬1ªΩÙƒ«ÑÌ‚˘ãLR”S[Ób#¶HkíÎ&æ‹ëF∑ˇY)√&PÚHç”¬+D¶ò∫¡w⁄˜°£,«ÿÔ«YÊNh≠b◊llò¡k∂öî≤íWôÔg6∞jŒ"J¯È⁄˙”’.ò◊£(‹!P¿ ∫dv<ﬁqp|xL{E…bÆΩx±v3rÕG◊Isù≠°Î¡ŸK[˝q7:ÊÍ:¢.©X„O07˜k`Êñuõ¶Ù¨È€7XkÜj&ÁÙl2m3∑0˜Ò…Óó˚Ô_=ﬂE8ß`/ùGv§aV∆=•´ãÄ)ˇÀöVcuããYpº’74Ã[0ä;«.·J“Ò(˛€¬‚?–ö¿∞ä±Ú`†˘÷g	;‚≈ESõS≤âT∂(üàõq´F´£]+œˆ› È 36∂‡¯Ê∆ñÿ~Û±∂Çt‘y£mÚU: ﬁ:Lß∆6ö∏· F˜
Ÿ[6Àâﬂ≥€≈ìË$8Ì,N@ì	åfYçë•6•UÒˇÁfJ©…mK˘µ≤±T†ìG–	R‹œ¨bé√—í@r]Âé˜åˇlèªÓôë£Ä‘‘ %;:[o“n(îÁŒÎ—ŸùS†gŸT?S∂2•èW?S˙‘45•èDÂÜ7_%¯˛xtÂæ£9~'œ#˘~t5K‹N]è1A,–zn3ÇR(±.¸DSè…ëÃ…û2∫ídÿ¶)ﬂ∞mìkÊdíS*JILõÛKbr39⁄æ¶WÉ0r]Ó∆2÷6PÉç¬‹ööG»†ãÊO8ó–√·ë√‡ÄÎP>’PS{Æ¢-Ìd-|èÛ$ΩBñZï`W∫)ñ±Hh1£ÑB˘˜
#6hL‡Ëô£|j3LÎy˝ßd»˛à˛å§ÅsÀ«÷	G˘–Ÿ!Ïà%;xVË∏|¸“[zøû7 ßûÑbß wêbP=ÿ_x‚ÒıYìY”v[∏ˆ§»¢| qÜòÖ≈À?µH‹lö¨ˇì¥¿o Uäﬁ)›§ÁŸ4ÖYì5u˛.ÁMŸÙ8ôAıÕ 6≠33|Ω&¿f£∞&˙ |ä˙´∫+U≈ ,Èn‘º	K`o| h∂·u¶4F_∑i^`ﬂÛ”¯KxÎ¨Ve`ö÷ 2bÂ”i¥Ü
Ñâ»‰ãœ/F51ec„Ü4$™——>Â≥bŒ|¢îoÿ)8ì}¬J˙k;@@u∂Ê6ÌXÁ,∆c£”yW0œŒ<¸,ØP%H‹’r-w˛©UüÖF?ô5ì)ÿãÁ£⁄ÎÑze‘Î ØJƒVIc}Ú2\å˚åÇ¬Æ≈[<rŸR8_Mâ€…JécFkJeHìÑ:´,‘6?)—/˜N‹êCLSœuOÉ ˚≤°∑wÏÉ4ÖöR˜π<ÂyÏu◊üø&^â85^‰ÌPÜyë3.≤È⁄¢¿tÈ4÷ó1Û§˜§Ï≤ı©(OîºÌË:ãJn˚D∂˝'Úz ÆC∂Ih‹‚àºò-C%•p]}p$˜lZ8—vﬁ˜ù2Â°j!ùX+Ô‡aXéaÔu„U‡•ÕRN∂%DJ,G•V¶‰G÷ªwTŸ¬≤ˇ6ê@î9≠KË:È87Zónû¸ºﬁZõU®ù»ùD<©1-^˝¨ÜﬁÓq¥òòaê7à≠i’Ê8»¶9≈Íè∞öÛ´[Ú;EéôØ˜:Ïr˛±c ∑Ø|ΩÙ∫ù%—¢†6:^P´›VZûÎqaâxMyVòs·¶;;e;e›Ü≠øIyƒgÆoÒ˘Ìi¥˛	ñ¡ïªfz≥U‹sZ≈1åwπ¨˙D‰† ,Õ xõ3¨ﬁ@™Ö°<ﬂòª)r∂1˜π=Gd_àkF<·˘√àYc%sB˚çÎ:~x+©&piL∆ƒu% ì∆$ÊqÄ„Q:Óé∆)ÏàkñπÌµÙ‘ˆÔ9•ï≤ﬂûÁé9˘$˙·J5Ê#y∆|ÑCöRÈ«£(ŒË(›$Aídã˜ûã¸öç€]íe∏)¢Ämäz¶›˛+^Ue•-IZ7˙û∏Ó.¡¨6<`tÁ¿<"ˇ*Ü5GqJ4ÛÿG_£∏w1Î≠$Fmöò ˛*7O0LìI–\pmªY†!Atsù¥Ÿ^ Aåﬂ	;«Òƒ¢7ÿ≤ëÙÂ6{^˛fÔÄI#◊Î—Öﬂ7`xu”gE\|◊ûŸ	≠'îET!Â’º£++Êíµd%€ü´Ä´∑≤´T/û§—“ÃXc4√ijG;®≠è…ÔøÔeÛÖÜ53lá£U‰{mˆÀñ√~πÓºYÃ¢æ‹˝h$äæS\û ∑gÒ{∫™(Œ”ÚU©Äéz'ˆ`i\—B{Ò-
wJX¢P¸0È9≤Nùô_îé
˜€â∆n’°˛›6~Â8Ü<ì≥l™x_Ω9˚óÎ9’∞+eét≠ÚF÷_í‹Y≠#äÆ;|1á´ö~˝∞í~ÌJDPìæUˆvY˘…≥∏s?Ñe`ÀJŸ$¯ı—·W'{ªÔévø‹}±ˇÚ‰Pñf A,Ö.W∂!‹nª◊5ãÚÄ'åõcÚ>˜ˆ®•7íg∫óE£uÔÕ∂!ç√”4>∞/B∞Õò‹ƒ ^;ÛéßπÙºô6O´£I%8c8◊ˆK”π’Tü6iy+
´VÔN>íÒ\ƒjx:Á¡ Ó∆2õì4´¶;◊¸dÂ°∫òÆ#§[ŸgK›“≤b√˛{ÛñüÉù≥ˆ%3nèh|œ<)c”ß&√A(å)ãπ»
€ÿ\']»ùµ6ßF∑ø√Œ„~Ì¥5psŸ∂‹
‹¨Íƒ’ñŸ¸ÊVÿÊ≥È
„Z.?◊áßﬂH ƒQ÷9|µ'NM˝¸L˝f≤Ãzoâ$•j IndLUî◊Ωõ‹
™ÀûuŸC≈55πçE'z
Òaãß†Æ˝<kƒÍ>¨>/fˇ‘˙ß;«kº~à$˘ä&ÁÓÔ√˚≈`ﬁ}ˇf»˛S7ãwó∏ò‚reÛ·áëw<»^ììP·Ç:^ô∫ÉHŒeÄo…Tì)£ıò·Í3ØÕÈBi‘Û»NöÚã·]¬µ≠e0# Zı∑•4Ê¬6À/ŸTS¬vN“ ªÿlïÈl˚Y”› ât1Ñf–3uÙ6Å‡ˆ ’NQ°éÇ#·èiv‘*”¿—o‹b@∫ã(k>ı(yEäkÜ%´ÙÒëIÚ·À\:	≤Áb‘~.Úx[ÀoP:P:yLÈÊÉ∂0•O≠ªóõÅ≈5±6ﬁ;¢í*Ûπ∞g≥Lˇ-3˝UÑíÚ∆Ã.eù⁄H˛/«ŸÃù+T˚‚k¸Q≤¡∆üˇ‘¨s6üãµ}ˆ÷4ı£8MäQß“ö´√›«~Ÿ1  eä˚≈øq∂¬wv:∆röîÒ µµﬁí£J#Ÿîc˛Ñ›"õ∫Ü≠‹ø€e[°Q>òÖF9]ÙˆáÓök>¬|íñ›l$¸ÃH8ñá˙hc+nX˛Y1$É04∑ÈG¡›º\WÃ∆âÅkÀ•P1ô65L¶ºfNc∆Ö§…ít·ô /¸ı3Àèg÷˘V-–0Cû∫F1Ÿ6äuò◊“M®…`;Kˆ2m}2ìu∆¬$≠I{¬÷1‰•†è?.]yÊÖHE(´Q„.[⁄ˇ˚œÿíDD«òÈ∏ü»°≥xÙXÙ>F¿HD/óoeÏ®‰ô„sV⁄˚S$˚˙€À˙…±ïy$êoõ€ﬂ±Ñı£÷ô†j‰u√<Æ9ÕÚ“p≥X^√@˘ÚV≈Ò,™ÆTâ¿yÜ«Qía⁄bíÓé1
èiá€ÏV∏Æ±„N›y÷Ñ_eÚ,3&úÑôCÓƒµˇ”gëC·Riì?ù)èÔDÔªOK!{ÜAò¢‘i¢Ú0≥∏¨∂◊›·ˆè¨§(ÎÄs&I˜ˆ˜‰€qÕ∫Qà=;É(p‹<Xf„æéÒYî4mòœñÁÑ¿89Œ?mFk “h¥FéÏWP!è"l6∑€∫JÓë)h∑kàèOkyL«∫èña3X∂ª˙\yŸ£˝â∫ß∑ßlv†™Óf∆u¸dmq‹Çü»k6€ÄÛπ”Z≥úG≠”πO©ùÿœÜQ7z˛¬«èAË›†≠nlœ(xJ0˚ÔÅÎyK™îÒn ¢Ù&bòãî£/¸ƒ;çyGÔ∫‰⁄1‘¨˘Ëï≠cK{VzU”æ•ƒM/ì~Ñú⁄UüÄ¸·MìÒ}eªsÆMÌï9ä§¡.º§eÌU4äy	\k3º+‰År
;‹4“Gnàœv©Y;ãÔ@>§ﬁŸÿÛﬁ∏zsáápËksJn¶◊Ô¸ºF;õ	JÑ=∑œ•ûQ≥˚Æ6ÙCoD´	˚Aªy.ôwäË0#Ü;Á3æΩÓ3ü}á3lÀg⁄Õ?ÒŸá‚≥<∑w˚cØ;Ó˘aÜÿ‚ÖOÒFï^¥-€¯êÿvµV´bç3sñÕÛ›$¨˚˚z}¯0@ìıÆºKè;ÁÊì§•∑ˇ1 ÷Àâ2ÒÈíô8%öcÄSl∂O ˜˛mIÃÈp˙9ß0¥A>nõ‡zÌv˜©µ‹∞Ätxˆ…Z’2¨∆ÒhgZóÁ;srÖóbÔŸ˙ *Vfòâëb€>§Q*…ÉH@t|ø‚o7ÛËŒD(erÌ—€*9ﬂº/éMóv⁄	8–˘ÑÙΩ≤Òp~ü\Ÿc.v)sÜí%éÇxôe…i±÷…/Hî–„f©f æÀ£]E˝F7ËuŸc˙?‰on¡Áãky!xg/ÿ (“h4NˆœÁ¿÷¥5B;µŸ“F◊àΩÀì¬[UQAgµG„-GkØ—¥»∫‚ÈU∞N¸´À®r>ææÓnI&l\˛z∏´ˆœ¢Q<I≤õ–òì3+Jí≈ÒWEI^Ç∫ã¶4≈‘gEΩ¢±JNºbÁŒëxÆ_ç¢Êf… ®z7˛Ï/É{Ípúl>6Ö˚\7ÖñZ‚„÷QÁâ
∂6T‘
`∞v&·Ç‘·¶…¥˜”B*yxä=ˇ0æ¯_Q6≈‚%|únµÃ]P¯∏®NPÌiÜEÉP4Ç‚9‘ıwûÒ:àIê∆ â@≠ªH≤—Ç#'SÔ°}ÛD∫≥ˆÃò'ü∆Yp⁄ãB∞gÇ	pH…ê·OÉE{—qPÛÎÿ(ä{O/êxXj√!◊
…kP<µ9P?JÏ◊>‡¥ä:Q€[π‰Ô˛éi_≠ÇÆ=gºb
tÚÓxpAΩ-ø›KåÈuîf=˝Ÿµ~#Ã<ˆ˜l„Ê[lIœNsà˝j™ô∏˙È[˛{gçK¸ù#9]O‚ËRôÃ/„#„]û⁄ßô#kkÏ"Ï≤ Ãè0äI„Ïaaœ.ê rõ±XãQö∞¯∞?¬ÄıÉΩ¬£¯<¿tE˛˜ ôˆÒªXø»	á"ÖeBG7Ï††W4 ÿ|ÄÉ4ƒµb˘Ôˇ[¨ ÿa0p#ÅFÓFxq1(D†∆¬”≥1õ¨H¨Ã‰`“√yÑXN?à.AïÌd£(˙§Û∆F€’8T‘˜¢ëNoÁkŒ~`(LŒ@&Ñ0≤m†|‡Ú^°aûÆ£ï˘§WÉ07ôÓQT6~L%Ëı‰4∞‡ ÓßZN‰I‡>pwS¶·3{-ÿ®ÚÍ1»üëO˚"»:¯ƒ••Uxÿ®”	ñŸ)Òj w”
;ˇ,û[5kwhS∞8C!ˆ¯˙¡•π\ïZëÇØ-◊Î˜zË∆°Fª◊ﬂ‚àŒ÷%f,÷¯g÷Õ∑ ŸÒÊ€û˚ºêı5±e≈]cCZ˝µJc¬¢öXê’
Xµ	∏“B…œ«∑•ÜykD.ÖñŸDÆråï‚ö
⁄ÊÜ	msKkú\¡–¥¶•[˙};“èΩÏ/û˝ÛDä˝k˘Œ7◊•∑WÊMiïD ∂Ò∂ ≈"Îh*.Q£‰EßΩÊõv~Ωw¯Ú‰’Ó…·ª„ì›ìoé%ÊÁDio±U˛q√˛¸ˇûh $·‹<ã(
9ÍLVª îGQ∏;S2◊^ºXªÇ˚Â/∑˚}óeÈ Ç2C¸pÕ‡yr9Ë%A^™yûu&ÜÆ£é∏ÖBÄ57Vi•öíâR}j ^Uê}éû—PQ;⁄´G∏zhF4∑õÕ'x)'üÀ∑b@´†SÊQ+ËÑ|+ÓêÇŒ.Ÿ§@´˛ 8˚	€@U	ôkbªàkGã ãGsÒÿÛjïz˘– #«2Íõ-≈õéFŒÅ9ˇ°µ"Rﬂì«'ˇ¸’˛±ÆR»jîm÷}mÉvπÒ'Éã¶A◊'ÿPæ]üÙ«{9¨¨≠úJ¥®ºY|>@ae,a±õΩÂ»¬JÑÒ¨=QV`;ÇdåÒÅíh¥<⁄SNj2¢Ú&QÀÄÇ„æ–>“˜Ö¥òﬂÀ=ÔgW¥˝;’ΩØ]v≥Ù≠Â‰´£ì∞œ(‹E/fE≤∞(V-a!wªPyÏze:ÅLÂÖUC-ùÑ∞∂ ï€JBíüóæyT_Í◊¡N›ìÇA6ÏbK¯6
<Ån“K“¨R‘h:
è/‚®ñJ˚Md&ià~YN’™1ù≤˙IÍB®œÁñù¯˙¡˚ïãï7èM.ﬁ2§ﬁY/πÑ#Û«¡‘Mµøíu”§◊;L˝˜ÜhDV6ﬁÜ∂Ò>_gÙ~@¡='Ã)üÖ¡DBt£•Q/ I*[ER¢Ø±∞`ã˚%sú:é3™™∆^‰ºj˛V<LVi/•Q≠›·„wG∏±ÎJt8ÉH« óO}¨OSﬂ…‡UÙ˝8 F{I§¯,7◊5è`üTÕCﬂXˇ / ï@†ı%,jgq±˙„~ö&)◊^˛Å›î'£˚÷º¸hÜ˜ˆ°ôï™'_D›ª˚,é∞jµ.œû<‚˜à0éJÔÃùQeiZVh%Óvª—pÑﬁFº.Óeö¶[·¡Ú†>˙Æ&‘ÀZÔZeÚYôW=ıpÌ.˚ºÆY|∆:‚L€KÊù"∏º˝ˆ(mÆ·/¿ïg1® )€U:/LËäÙœ›Û”À·<OGöªa≥r&Ú rq"cGoÏŒWIq.}^5'Û®tn˚1Pö0]“‘ ÷ñ‚p!`£Z’Éê3îŒa“®≤X÷FùO?zÂ≥7[‡áyÕxÂÈ¸¯ãRˇÜ}w˚£TWô‡ìàe„ ∏lpA>÷^r–Ûk|“Ã ,ÙZgŒ[Bˇc;#—»
pÓ~˛Ì™1«∆\j◊≠7okg"íªmv°0ôññ◊¸W(dK{µ•óÒl±°ÿŸX	TV(Ò¨˙SûSVùµä;kï/Z˛X££X<ÎW—ûE √P F´øâÆ∏øèZÒ‚í8∑œ)ö©(À¯E ™"QΩ¥uŸ§∫–*?Ø’*çù™=ìo”ƒÓÒrÍ€	pf<¬/+´^E•E&Ú€˙‡∏ÂFëWR—(äÃ>Æπj[Æ≈’µû˘úûıëP9y'≥°ß¨|°‹â/sÌéh™v7-ÀkqXÀˆ™‹hÚCU∂>≥Ã5GBX:iÉAå=W≤a<¿sL~ìŸ¯∆˝b|‚"◊Yä†Ób°ŒDB°IæÆŸÈ∑0≠ÓEé{Q9˜R˜9ÿÉÍı2B_—ÈvœaÉ	D’Ïî:*UZÜwù)n◊›rä¶∏S )<dTJ®Xı^€Ö≤C¨8∑Û≥KU¿$@›‰5íÆë3TJ˚ è¸û-˝ú∆®¬<»aƒ‹V)"{QΩ"îÜÜ4©é^P¶Ç
p\aBù˙∞ï◊ãDuÂ˜•6†Ö”í–ñﬂL–FæÙÕªGâ[ÜîlDZm‡ÇÆi‘bêØQ?õ	›{U⁄≠H◊Â’~Ígäÿ/a®r!gV±wL
v—4ä˚—
Ù*á´‘£Ö‘ø ]HøF’ûãÚ‘"îªt≈π2äEô_k∫√¸}ZésßN≤hCmt°¸tQŸÜóÈ√*—É∫µ–¿Ÿ’†À¨eN2†◊÷ÿ◊„Vú=π…-Zs„XRﬂ!∆[úç»˛Ó`Ü-XA∆RÌﬁG6=7>€ci∏3ƒ‚ï4NYüR_¬® Va0D«˝•mña
X⁄Í¯É hûÀ@¥42¡˛¬c	;ÖuN¯s¬^7#<dÑ~ì>öÓBÂ¬◊Ã¸›˛wïùãŒ”`bp¿¯º∆2|å	òÍ∞PààAi‹],K@=î∆0eDπ˜`Î,≈†[Ê$ﬁôF∞™·zÄ–zlÇÔœÇnp
‰«Œÿc–ï4MaÒ—|;?ƒs`…\≈√3û&1h°œy˙§“xÙ=qîÂ¨c,–·ÉíÀÉ,yg Áx›“¡Ò·1ÂüuÃ≈=¸^ïŸ˘ $◊û)wí¿óı"◊`l|ôEdTﬁ`
◊e√C∆√‡ıÍYöÙ;ãD lqiï/bÁ∫ò≈ª3L~”&µ¨¨ˆ∂|€õ•’Ë˚Œb."(Ù∆l∞ºÑŒ8YÚ‡…czë\Óˆ¢t‘˘ˆ%EŒíX%ÀnˇÄhHœ¿,Òˇ6fn‚Ì´}‰åÛËÊ[0ÙxJŸ?0É¬ü¯ iÉ¸ô”ÉäÃzyãáÂÕ&'ÖS·ycâ√˜l´ˇ¢~W¯`– ìÂ∫$%à,‡òl¨2å+ O„ﬁ«¸ ‚=aﬁc2IVÎ^ÑØ≥XX_ ®.ëπ¥zïµD‰	ç˘¬Ó*Îj\2xƒnØ˙OîÒ¥∞´ñ`]1ë-£≥G¶Í< ¢ú6Lj…Ãx„3N`◊ÕÁ	»	∆Mo"4C ˘<„¡8ïá¥¬ßA¸>aù≥ﬁ¯=Ç^ÉX%y^:Qñàw˙®9ˆ≠OJ o≈ÇºâuaWÂœO·_b4√DZŒ_ä\WPŸ HbÉ€Q]}hGP—L¿ò<œN¨˝Ú—HGî<ı∂Iﬁ_¶#èìs~·ö^‹¬ÊáÊéπ¯ $F+nº1n¡ÿk5q·a; à÷‰}‹O Î„IÓW≤_¨™êËù2“–»˚Ö⁄UïâúXF£˙ì·1|}•è∏C7æ	Í¡£(cî;æp¯´ñœ&≠∏Åé'V>íåœ…§˛êÊ Ì ÆºP∫9>ƒ§PrNDY¥,¯uYak–˙@5+	§ë´øKÇó◊µ,ˆ.O‰Ä8ÕÊdoè3éì4∫†{AˇFÖ#¯~ÉŒg|÷”‡˘a∞ÑÛÉÉ5/[ÀÚÕ9Aœ0+#L‰+	˜≈Rñ§z71xTq8DÒÉ;ÆØåãî\eªÁIAIæÈr≤”˚pΩoŸ¯$™@l.¡—u˚;‹À|≥ç›Äù—R*2à›4oZ1Q`ÒÏôz]ÏcPÖJjè˛v?i>w≠˘Ë+–D˘±k:˚⁄®Ó±πjd‡õŸkG≠“Ó™¨ôÍ´˙…(Ä∞ß›^î>Ω1≈Ó…Îu¯+ã˚À‡≈h8äﬂùñ"√¯='ŒMeXú'É~FÛI≤wÅ˛"`Õ!é≤Kﬂä60Í7€¨ÏÚ˚áÚhp)òûò˜#ùé„^xî”Q§Áo¢´Ìbvã].˝xr5å¥+Â¢”h ;°È˙u‘ãµüîõ0Ã©^â+?sZlk4…/∏©/Ró±à∫î¶ƒZ¶†K˘Újƒ%èπ6ˇ$ÿ—¡?ïSï∏ã∆∆FW5VÔ&=Cì
ÏHeÍi£\ÆºŸ¸úú≠˘ø0˝Q´’R$qÏˆÁ%Ây◊•∞Âï›˜œYñv_{1≥Ìµ5PÂWøO±P7¬Ú¥˛⁄dcçô¨|ü¬ªÜ—⁄S¢’√GÎÔ·øø√ÉÊ1úU¸ÌõW®e&xrß`Ô%,™Ç”‚Ò¬◊Ø@≈Æ3@˛rÁRzaÒﬁ…Èwp∞Æ†Ü`,2ç@°O£Ù(5ÓÍÒ¬ Yë_UÄåPU¬K7ã¿MÊÏî©bAÌÇcÑga∆i+ÔÊiR›≤ ¸Ù‘Tπ∂  fP«	ø±%ÇLI¶vÑzÜ∂ÉX©≠‡m≤ñf’¢©›◊ ÎOHBM…:Ï‰Êo∞ÈüH‚âœ/F¨ﬂ√»Î“i›Ñëöà7¢ñˇÕﬁäﬂ¯œ¶ÜIz.èŸA2&`è∞»πOì W/S†"ttJØoı±‰˙ÈBæ&†:„ ,ò¡mLÖ∆?+Â>ëÔÈP¬\ÜFë èyßHÒ›ñ).6ì^ë,Ëé‚I¥ùÅiG‘#üB8^áà|@´Úì≠E‰áf©(xp¬Ì√¯<a†˜Òw+s/ÈÇ1íüÉ9CÀì1åÚ«òŒË™2G≠Õäª´£U•nú=˜~Û<¬∞£»=kêfº∑&Ãxè5¨»á€ﬂÌç±n}È`›È`f§ÕáîÛÃJ,ÇﬂÌ*q~’f≈¥ÿ°Õ ~aÔo“˙ÛLô‹D©jÛ’ƒÿRÔ⁄ÁªÊÉﬁ0ÅË∑9y√(ã(ÆéSÜ`!…‡‹“ÿÓ…5˜ÎE!z`˘_‡ÜG•;àêÃo«’ÜÎ∞C/}ˇîÌcö7r·5rùeãœŒ¢x¨Í˚kËd∂I∫MíGú‹Íô@¢eåH∆(§_æ–fEâ´(≈ÙD`´ò˘¬™Â÷;'iê]¯xîˆ≈“?Gá »—	πÃ∆¡L›L¯Ëd¥»M‘»+M»'•+‰
I1"B=¿¯/`)Ç#Üâ´HO 5Àhu/Dﬂƒ€?2à`˘g¥·‡øT∏áiNÛŸq´ÏêûF{$hó•"d€M˙âh‰à“ %«˝†⁄—Í‚è>&*WÎ”ÎlMÎÄÚKùªËL=Mﬁ√Iãˇ¬D™S¡_`∂v∂:	-—Ë"	WìÅØÌYÈ&éÿV˚?)#m3√5Âá-√ìp71A,l”ﬁx'’†ãtPµ#cEóvÿ/MÒ≥u•kCÓ¥Ï|SäbuÕÂÏûΩ8{+üöÏ÷Î7◊,Ç/Çnº∏ÃhZ@ãÏfôâ√xpÅ°NÂäÁÚ+Â2ÿ£ y◊M1P†^º?‡ﬁŸKoG?Uo
)`n∏GÑ·ñ∑íË[∞çr„Çı	‡®dUé•V¨âú7J«—2œ›f¯,Œzf´BÉ!›üjÖTXæÛ´á–÷ÀÃ…‘wüádÙtJÕà®&S÷¿+ï≥qÌ=ÄÅÍ¥|F:8 t=öM&A˘™)…≥åU„çSâÿr”$a’+Ó©Ä≈îÔ5û	ﬂ≠E¨F\≥Ñuñf÷‰éÁŸ„Æ”%>%ô-W∫"∞tPT≥ËRa”‡¯¿™»ı¶Uëº%…V´ñ$
+Èì”9ÎoS2PJttL–7”âu$ãlP/πß¬aé∂>çL–»j
‹íﬁÓ•1gæﬂıÂªØ^AöDkõ∆√y}|≤˚Â˛ª√Wœ˜_ë àÈ+6ùQtÏ"ù5F±~etL≠móxÄ@\ã√∑7éÊ]F›∆ÿÀÎoRà)`›Sâ∞Ë∑IÄ)‹SÒUPgùl|öç‚—8f§ÏHœ¬“¢≠Ll≥`ì ÌUNñ®ÌæBO}⁄¨Eû∂‹3xó+o∞óFgc}˝ÁòtëF˝•∑m% ôy”ƒœSöSï†…{ÿŒø€æ"PCâ x9/#
}˛c5ùBøﬂÄ ˇÌÓ∞G)ÃQü˝¨∆…¯ÌçæsgÊ`XXß)Ø”ûaò·Ø9>≥rãñ;à%ÿp^æ™ñk?} øKÒŒIRﬁ!~€°ØU<∆.ØàBÃß_©$Ë∂æ§=Ì4Ë!£¿_£8ºﬂw÷ó’{VhB˙mqv‘Ö˜¿¸F1fI˛´Ãf»Ø\lï5òCÎ*3g
`¸C\ã¿cQj |g<6≈˚¯41dˆŒ}3•V∞Uu∂˚ËÙ§!âN+%ßF–3&ñ=Ó_Elq«i=„p5Éõ¢Œ ÁX˘û®{p¢vñ∫•»6~y˚'B˛/j6d£”VΩûé≥.ı	RÄ‹—KógîCnÈ{ıd6å\~ö ónï®~Çœ"˙r`ôñ\]KÜïØû
√≈1ûÉàt,
Ëƒ2å`Ù˚â≤üˇv]≥677º2É¬(pG∆∆Ä.¯mO¸[CV9˝N¥'*.ΩO‰sKb‚≥ <ètg∞Ü4Ê¯^›ˆhYz‹·[√S–Ï∂
˜ÆÜ![Ë¿ÀÃH”ÍÉ˜_00{^ù»Œ◊ﬂúÏ>?4Î‡€∂…)”"¨nÎã‰1äAcÿcÌˆ‰ !—JÑgCì’Í∞%eQT÷ÿa’éo#rÒ–ÇÊÔËƒTñJ+&÷?ENº÷Œ⁄≈CÛCçñN◊b3(∞ÄD+i"ÛhŒ∑ˇ'Y‘wΩ≠7¿uiƒ£T~ü⁄⁄R:¸¡NÒ»ÎbÙEöÙ≈Loa”x»ÙÕ*ú≤"∫ï≠î+˛ä–A¥‘ÛÅX›$H¨á…ÑãQV„G¬8¶Ë:ÑïèEx_å1ªÓépoR®—2ä%VÉjØ¯:˛~ßI	≠ŸvãaÕ,ƒt»kPY±ÎíÂæ∫|Ä-ƒU$î„^tÜ<ÉÜ1ñE⁄ª+ö\Só˜˚PÙÂ⁄<Z/0ö’õâ”M"§QÎÏ¶bÏ  ªŸÖ˙áÃﬁ˙¥\6MhrÓ(MBòBftB/¡Ω¸î¸Å¸7†·˚%´cê)Õr‡¬´·¨CFïú:Ó¶ÿ’™mO√d¢—5æ√*Ï‹»à´õ˜å1Äa*Ú◊—«òàn%)íÅP ,ª@È/£·JÊ®	€ïm;CõÅtÍI˝r≠é∑ò@Ôœ†‡QuxömWtœ†¶Û©Óÿ3‚Ω˛BÌCËfƒf´‘)%´@6∞L?a≈€ KÚπ™m œÍ_…‡ê∂J#.b®Í'∫+!cf~D”&Dúu±rà˚Ãµ-4-Ô=Áªõ:∑%ﬂï«„SÚS‘Ó93OıìA"òGÒy¸=´æ˘4¨QÀÔç	TÖ∏´'’Û(√∫ÑqﬂYËÓ∑^G≥Í¯^•”‹»¥cVíÃ™F[ñ{de9N√ìZ^≥”ÃHûì±-leÈö”¬PÈ&åÄ™tÛT›DO„†ÿ”Ò5◊=»âÙE–î©h/ÈÙ£îπŒÁ∏2+Ôƒ£"éñ“ëÇwÛ§1>¨àü˘ÂêlÊ`ı…ìC3÷π6Õ˚ÊΩ9 g% Wká†”∫4⁄‚≠πZ€J©˝‘≠ù≤BA•¶∑´Ï˙h˜ü_Ïø<y˜bˇ‰óáœEÿ¸›—…õ·jü©;ô¸£±ˆj"ºèîÚÿ‡T'´;KÕ⁄ñ˚>óu‹Zwa.Ó˛ˇ   ˇˇÏΩ[oIí.¯^ø¬≈—vfˆê…ãTÍjJ¢@ë¨*Œà"ád’Ù∂ñ
f…Ë Ã»é»§§ N‡,Œ√yZÏ√Y`Åyö¬yhÙ˙ip0¿yY`¯OÊó¨ô˘Õ¸ëôUU=;Dw)„Êsssss≥œfJä˘‹öΩœ‚*3ÄuxX˙≤íQi•qü¬¢v˚ªÁﬁDx[ù…
p5Z%yRæ◊Q∞‡ôÀ@%Ñ|D¬˛e†V=üp$îyŒ/–ŒJõœ≥uf;óÆ hA∂k◊)òâ9LI9≥≠GµèŸ>ÏNCÛÁ√t@ÿj©:ßîø¯N¸0ó√U ˝Gº{¸≥Ú2ÖÈ¬vô/ Q:*Ëº&ƒ˜1)†®J◊!ƒ~∑¯!ﬁÏÃ‹UÛÙzøü\•˚t˜˘Ò˙≠S_©ÆS˙u¿Áü§˚_f=:À¸	{èyø*ªn”}íÓü\'»§O#Ä¢π+lˆAÆƒ
⁄QÉ·˛˛:ï€√a5ıÙwß]]†Û'`ìJOÖHÁd–Ùú]´Dëg◊uÅ’Œh˙Ù≥œVW≈  
%–›ﬁ9=¡ãœ“˜√º)WÃ	ítFò1nL.Õ	é„iπJoÇﬁÿCÖ¨∫ç<ƒ¬˚'òvÁ.$)“º¸∞O±g‰ãké|IL—	Õ≠fS®‚Wßß’æ eO•·⁄Ônäíùóuf.â¢%oKﬁ‰Y˜i¥•¨†M\%ø{*¨îßbà«6˙hÕãı∫äeñ‰∆mÑKß_Uu†íFRDÑ;¬8M.6ÒÍ8œÌÇV⁄ù‚©D/˚]ˇ…!0;)§4,pCO?<¯#å∆„ÿ°=.1Ï'J ü≠OMìŒTÀ…ùz§é5À7P |äû’È3Ë“Ÿõ≠ÊŸõ˚Ö*|ıJ˛Ê5—+ëøüïä`Y˙ÀôkÁ;ã*Ø>º|ó'·´/’ÖÛ…D ¬πÏÏ`‘@„OÑáÎ…üù·Âyg0¸ù∫"5¸ÖNRÙ∂ÇTSı*–øÕ¢ÀŒ–‹tË§K≤˝ñE∑5 Â&¨¶⁄æΩÆ•¿%,õîƒ·8Ω‰„
óœæ>=xEœˆz)≤É©ı3âOã}Éyáÿ¨2ØBtú§ŒÄ◊$yÌ˙≤å∞±„B≤Ü ^·ÔﬁmâTûw	t ™„'—Ñ_¢7Óy+‡*Ïë√Yt√°⁄1
wüÈ˘? ÙGª4$z‚v$ﬁÄí£<d°≥óÿHv•kÔPìO˘7b∫µ’ú8£≠⁄KπoúÀ;u-ñ”√/Pìg÷¥Éd(ÁØ{ØÆPŸ–†‘À÷!’29!ÿ“Vr¢,E…ñíï£o9%Èª°†rå$bŸ{NIÊ6+äíE$=!√aEÛ∞∏˝£˙v’¥gı5_Ÿ"‹dÀ¨‹Ëy5HU«úY⁄‚$ß,¿‚*ã"oÏI⁄IÚmD«NlkŸMßπç‹t£¥lËçÚjÄMjÑ4Üœ˜./∑ñ˚üv,Ωàp+óˆDò%›˚¨ÕzËBæz‡º∂ÌV∑ÒÀÜ‡UºN@ººç¬õïÕFó@"0gAcô˙€jì¬	ﬂJ/1˘d"í≤#◊®MAbD™“q⁄£Ît–lJ,aµ0Ü}ojx]Ë¨åzNÜ˙Èq˛Æ•ÅVΩﬁ±ÅZ¥{¯F7ÔåÒÛsﬁ@ò)Øqøe£Î©ylª:]v'=≤ÕwUyïPﬂe¢kﬂΩWøæjIù&EÁ˙4-˙é∏6wùBªW¨e/?8_”˙ƒùXÉºü“$B"–è<j•_•Jx“ÿr&êˆﬁæ!ƒb
:=}6´Ì+ËÒˆ¥çÑÓπ÷gŒK®]„Îj_gı=˙C´6¸A∞{™9Œ=›2Á¶idã\ªoXI£∆»„ìUÛõM1¢dmﬁ®:)k≤,‰'”p _•0œ∂ªÖ¢ΩªÄ≤£J>-•Ùµo≠C%f7ªQ*å.R-}\•E⁄≈ﬁß]≠® &§˝‹·WîBÎÓ?elıÌ#À‰mhQü2Œº ﬂiS¸S#¿Ò3ªÆ «⁄≤qÕBt⁄F%≥n√+∞ù:Ωq7-UÅ|CJ´~ﬂ}C5ajÿ[•{À⁄îÅ∫¸˚lt©∆iâ§Â;xì¥:]+
3Y%E0uñ≈9™°Â¶‡J·Y%Ã-—°úŒµÈö‰q€-⁄⁄À©≤iˆ—jVõ¥ë√õM`ﬂ‚ìCË¢m≈7v~≠ÖB„4ÎCá≈ä}/©yœƒ^»¶»…:[†í/îwïC•ë^mF ‹©B“üc≤¶¬nzô¿û`Åäíê≥H•d(ê¸˛åèpÖ≥{–»j‰-/a≈˘ÍóIÔ2πH)Uc˚ÂŒÓﬁó_}Ωˇ7˚Í‡ı·—ﬂüú~ÛÌﬂˇÊ?˝C£]{Ÿ»]’zX~πõï√| õÛ¨T9©N“ëÊ—í±˙ú≥ÎlV{5-_Êy/M-ﬁ`ÈGxöSÔp•†f865∞Ñ‡˘T¸’¢)◊˚ô:èº )Ÿ
ôe7yV|™‡Ü÷=éæë∆±uôzÅDÉÓ›ÂÕ÷B¢õÍhyS[ôÆŒT–$H§m9˚†Ü°Ÿ
ÑÿEzù‹d)—(˚y>∫ÜEî21‚¨µa¿ÿÅô?_”Î´VijD•Ljdß9[ø¬Ï{°
gÕ)BåäﬁxI]sSmÔO“æˆNüù´C+ÀYwYh˜f¢5ª§ï©!wé2-wÒ'˛É†a0ê˛=?ôÜë?,Æ	≥5î@0m»†.%¡%›¿í9Ó%Ù7Ä⁄æaΩ§€<ŸÇõËg%Á(V4UIK=C<jÆUˆ®Ü«ı∞CE¯l%Ví°—á‰ø[ÕÉSÂ˚˝≈<_5›ˆ´≠∆e^Ï%ùÎf≥cmïñ÷:	µ´vÍ
õœiO~Ì®4⁄«`ı∑ª´–\'ü2	V⁄“TAñÓ ‚6Õ}*0é.œ≈-á4Ù)æa¢±º2îVâ®&2∆∆”/ô†2Ø°»/nmUÌ¶ÌÃ£;éï07µ{∑HD>Jª°Hz•H⁄íßGDı¶%„ïO∆ñ7
¶27—úπÅ¨ ŸdÕÊ)Ån‹Å|§˛˙πX∑è¶ﬁ4fŸÄNÏWS4Å¬ç∏‡±ë înKÀ`Ñ§œ´Ó‰}Ë]Ûà&öôàŒ˘ÿfòPJˆ‰≠ˆ[Ω>¿=Rs”¢PÛèãrP⁄îî®ŸÿÉ∞Us°8p≥Ayò]ÍÈèU≤£:◊qVÑ¿©PÒu⁄…∫ycjõ	p“ÎŸÖ&≤$Ò¸ØSµ‚UôøîNï']ΩUàÂú]]/),ıÙpw˚Ñ…˘&¶√$j%¶è≠ı2)†˙"/.Ò;6í¿i-[OI√S&⁄éÉ∏jF–dÖµyÒl“◊"«ÃÚ¶ËµﬂO4‰§(’,Õî∏y¡EŸ¥~∆Ω,Ì‚À(~Æúã‰ÈQ|cÕX≥Vn∑⁄û]ﬂ˝ñﬂâºùìØøø
v§)|SƒÌﬂòú ‰ñj:m◊≥![œt±gC⁄d>◊y’ám€íÇkOYù–BﬂTÂÿ3X&Cyö"C®çH≈0ÌÅŒ,TJ©›Ï*…XK√ZÕ~{âÃÙŸ¯ËíÇnëèVwww·£Kôä≤ÂÍì´F—ˇaÍë≤HA2ﬂ§;|uΩëƒ1«…“jÂ“ä§∂ô¸—{i~”ßÕO´GhCÈ˝+¯˘h"õ9•∂æ“FÙ”:rF©}$çè¥óA4Mû˚πäây_>›Tœ&Æ∂˘ºf,ºö°0ΩÀOWJœKi^3G‘-·ﬂ°îñÆ7ÃÍµ¨©ª∂¨	ª∂¨h∫∂Ã»π∂ÏPrçß Tä)^Õßí≈À»ÁiS¢Ÿ{W!≤‹¥˘'¿vëfﬁ[Åúäo™qY"ê,\]<>%£&*ã¿\êÿ2òTñ-¶Tˆ5WY-utS‰}§3>‡U€&b5Œ€j0GåA*êp&ﬁç1ßaOÁoY”’¬™¢˜`µÏåˆ•#;0Íª·lü-„ó"å§ﬂ^†4AÅLﬂ˜møÂú‹Ã \∂5ªÉ ≤4Æˆìßüπ3…Œ§™y≈û1VØy≥=ó◊<!π/·Œ«QÁñ9Ghùn”§QÎ0˜∏3õy¡8ˆ'„>∆ØnÃ √É-dQ€jˇ.œM<•9Ÿ¿ ÙØÀë—∞ø)¡ú4(õ>,Ô…”ä-yp0”zø=öe∑wﬁhqÕŒqÁ[æIï&	0Ω…±'AFY2Ò6k-ªΩiö£[˝ûcïñ÷@È¸É>±v7DãîIp∏=hÊ(ÙÒ	ˆUó≤É˝Ü◊ÂãˆŸ⁄€‚x”]1\§z„≈6uÖQ˚±0òµEÚ·%=ïOÑÃ√ÏùIQÍ•¨¸MØ|ﬂîÂ8÷A|w„ﬂÎtpÕ{7∑?Ù–	#»¿á€6–lYÔ:iômÛCãs§ÉnNpÇyo<HJïπ tLÔ\kÙ7ßòâA’`7jå%mª∏óŒ
	«JÿVMôözÁËÀ’ù◊G√m-Ò^Ï®
 ﬁ›|•Ôa~‹Õ©ˆÜ⁄˘-bÖ‹^ﬁiW1óíµ|dáö˚›Ï˘M`w€Z@=-E⁄¿u’æ¬ŸKË≠DµâQë-)í˝Aôô4˚úπkÑ}…pçÔ 
≥ÑæSÔ[f©Ñw–Vâ*¥O*ö¬√ªS?^–$ôu˜4–∏@+‰fI}%Im7ﬁFBÔ#|”#+‘5>:$Tã+ëë}±Lt‚:ƒT§Ë¬„§Lﬂ/|È†q¢ß‘ÉÊõqÜìùyôeÅVÜgWﬁ¢ô$˚â∂±Êö•±†åæÅû9MïbÔˇıs[F»¥/ì⁄|+˜jŸ2~Ãæıt2+<D=jR…˛6FÁngDó‘Åñ”∫3u√2ø¨ÀÀìÁ¥|_›[¥Ó¯Î^ËíZjË%Øº}8¡ô‚öF–Ig∞S¥∆ÍyˆyßtÍ™!»:8ç∞a@d{≈ÈHgbÑ¸∞»†*>ƒÎIôﬁâ,i%Mà|Œp™òià5´*πf”'†5Dﬁ)QÕ˛v%á´eh´n Í∆ÃHø¸vp‚T5’jñı˙ˆø™≥Éå4,,dì}#g»Åı5≠eˇv–hMΩB1í≥ûø˝Ì†›nãTê˘–i^öæE¥#Z0_bùgmé“A§µÑx¿™ª„	á¢èqI_åC~OgVÊÁä≥ò'ævhâÿ]ùödæîÈ2È$|Ñö¯SÔ‹§‚»ÑÎâÀLbÓ$´<\ÕºÙ\±9lΩ$È-€Í[†ÿƒüTw∂ÈU8‹—SL¢…Ôπ5ÛZ…}hŸŒ+ÅÔ›êíZ;UjÏ¥§›hb©Ç⁄Íâ%€Jáve@>˝J≥8qtU§Âπ~ä‘KqÁ”Òóôï§ü`™©ÒLz∏3BÑfL•«˜äîûUåËù"ª0∆]móUÁÜU®èOÌ@i?øIwT”U0ÿÏHù`≠7&T£ÀLÇL⁄(È=l“ﬂßôÃ<ÛhMt3Ù2ñgúr7m˝Ù[óf¸J5 ¥1fJ˜‰ì‡∂„Yzíé‘Übk´©]ÆZÆœ3Â%d±DÊ∫ﬁ◊Yvi˛°èw›{≥#ü≤R1U™ÆŸ≠˙6d%’h£à¥œ∂;ZÃg\&xMØÒ%b≠´⁄Áçã´D Æ]?¡ò°Mï—ó€ÎD.=ñ	D	Àv_Ü}Ôà£îp©7ïd†±ªHzÑ€&∫Ø.Ø‘%uYKÏ,!&á≥ŸjÚëwíŸ»J„†‘Û™ZG˘˛…·	qZ≥ÂÔÿ¥ˇ˛Ç≤¥æ%J“:œ£±LöyÉ <æ‚Œ\lçÙeì:æÓV˘ pVä∏ D∏Ø6Q&E≈Q¨ ⁄ÛŸIﬁ™+ëΩg•E«
2%£ôFÇ\Øö†ò’‹F˘ep'·&õ"#ûÜE"kHn≤›Ë≤3È¥√*/.…’¶NëK)5ìaÛ‘ïT\ÓeJ˜	cÜV‹˛õë∑l$∂:)P˜∑∂ïfˆÛ2€â6√3i=&ß[M∫≤¡4«RI˛?∂œÄ˝Å%ögö#f:0É´#•F˙÷-∏sù&]£V¥Qıu‹
m˚´\ñ„ı«Çú~‰&D#ë>∫≤≤7û.`F–q˛k⁄öÒÙü9£À>5*∑R´Ã≈¡
ìU0ó¥Œ¯ˆ\Æ%≤É?≈√Ü≈*8tt∂ﬂèSﬂÍAƒ´∑K'÷ë¡8£qéﬁÅO–˚Ö∑	•)®ækLóp';$[æŸ&ïoy;pŒÁ∂Nü`ﬂ©8Ñ6oø `1•Æ∆ç
u™‰Ï¶åD¬ﬂV&5eË£/ïo¢!AFå0 ·ﬂ≤1%C8eÏÖù(AP†&àòa
´Qü…rm≥^k"HÅâuÉ∂Y†}]-Ì∑™sõfáC€Ç¶Z+a«&ÌÔ˝Ê[ù˙·«m˙c6ìx”©›˝∆‘®P„+µP…Zé˚Y°‘r˘Íﬁ˛@ñ˜√C«hH«cQπÒC$˘"˘>o√&ñçÏ[ë√_õÂvΩ∞—¥
#I6ôz‰Í"Z(ÀJÈlΩ‘˛jtç∂∫` B®Z{ÙÇÍÇ^Æ¨ï†zsﬁàlŒ’˜Ê|•B©Ë˜-‰Ç	§◊(/¥dbãü™P…ó«Ü]rs®Ñ‚√ ÜÈ“ãÄOÓkË—eÅ{ª≤Ûg]O_√Úî∞√›*«u§(1èR–Tä#ÓÔBTì~ÔÀ˝◊˚ß˚ﬂn#ﬁ^HX±Wñ0©I"Jmhò„‰&ÀÚ2ÕF d>û¯fãëÑfå|2èÚ´´û¶´û§xíu„¡=ëâ<,“õ–Ù3HﬂèXhæ‰à|ﬁæNpb“ï¢	íAôôÒn“Ì6ôW)¯HM√†S;ÇÄñ]BFâ`f4Ÿ0H„¡¿<˜BÉÌ·úÔòèNõ~®ªöN˜√?O‘( pN‘=Ö“!Áäîó5m±µ¬¿óÿE"úXòb+∫-óGÚ™Î∂ó ΩœÂ˙pÂ&îM–wŸ¬r≠∑Ü¢üyEû[3ª$§yL◊ˆ±••yCﬂb/QÌpi*Íößt≠O?€¥Ï„¢~U¿ÉQK–ÀV`h Æ$®H+‘¶=`ó∆©~ZvzÃúë/€≤…ΩQ9qÂÍ˝ã.Æ∆∏Sî Fïû≤Ë¨ˆ≤ãU%Tv”Óx„T∂¥£7«uèí"9†ã¿'‘Ò{îá_ﬁúOd†	mÑπkáï]˝X°ﬂºÆx≤ù¯à~T¶ŒÌ~*_Æú›Üó˜DÕÈ.4–|®˝Z€‹ØUùC‘‘ c#Æg}SEd≠˘å˛¢S›x¿pé+Oÿ<∂≈URñ∑“”UTæ3m©Só∂ÿMÀÙwâi1Í“r[a‘È>i¨h(0Û‘∏O'./‹ì?§í*£µ(ùÕA„LGC§ØÜıöw–kî,b+lPÉ"%7â¨k5ÏOáñ∏¥,bÖc«íºñv	ÕÍ°gX≠h˛…∂Íâ|õ&^_nH˘}Ot∑¨?‰æñw'§Ææ≤’Á{’™Œµu€Ωcº9ˆ|	tœ bãæZ‚,˚˜ãﬁÖ§’ˆEdè/ÊÉ.bi/1€‹Ñ`u0‚EHœ-E5F…Ç>+>ÀìXÛ±f¯I¨ã‹‘$ΩÕÍN§ÍΩêÈ|Ò˜2˝Pã˛Tl
GÕ^´ˆuÛo‹JLÙ…vFvÁÈ9ËO◊†˘C'à±„¡O)E/‹√H∏,(îjìb(òÓ;W∫Ã@§Aí≈tŸ©RÜŸ⁄Í4$^¥ e„Q%·˙∏Ù0Îñ»Lyú¶ÿÃáGEéñ\Ll’T`ºéØyCï1£ìÃ;N≈92pY|VCeB-›P±èïX2-é`Yì2K¿ÄX¬yŸØ–˚>é/∏7÷ñ∂˛Ì?ˇﬂı⁄TM≈Fıˆ%`ù¥‰¨û 2∆Ìs>»Á4Dﬁ.P Ü¢–7%„!
2ö¬Ì‘˜C£èÛ˛¯ô¥îØ˛e/á	ŸDÛO{êøs˝ôôª:sg´34Øâ_ä'Ê?èπsúûì§,`m[œÒµ¢·‰J@;õ~¸»>ñy’ÛÜÉ}o”∆FÚ∆§±ùLpïºΩÑgÖ+;aMƒºH$≠$¥∑Ê¿‰@â⁄IdiËË$±l8‡’>‰∫/W]~ÖÛ"+?Œd<&VÊBûW‘ºh7 ú^I»O§À÷5‘á®mŸ>Ω!)éLÆ∞<ë»æcªc¿W]Ò¡ﬂØW~˝$2∂û_^Z ¯g«Èeëñ◊;Ôx!… Î#6z9ÃnÆ-ûvû√‚~&Íõ•3W|!tŸPÚe“•øœÛ>¸ªÚÎœA’T9	±"› jÄ{X03'˝Fµ»œB i@∏ ¯^¿Óè+2ØØaj·«0ﬂœ)¸Ïz#L≤Aç°üòh*ûo◊§
S»»£ÏÍõcAì+≤>zË˝œæï±⁄¿í¢)>ûllŸ_b=∞˘°£ÿQ^:3z√Èheb[›◊ À√9nE?L˛ï:V≤K‘ËùÛpßÖ,√¢áÊ<;µ¥^¡MÇßœ2t^æ|>·ædSÅpÑP‹[IßìAd¥ﬂ˜ ˜À¯_˚:Îv”	rC“÷6 ƒêXbQû;ﬁ¯¡π“UÍ¸9ÆÚÇ%Ü◊w
q§2ºTπ‡xÃáÓnr;ﬂ5ΩLs%ÒVóÔV~-@:ô\lΩ+L’†S€ƒ2≤≠Øπy®b™í∫¸îI*“lˆÍ§◊3T›d©ûYè¸)6$%?ñ+WUNx◊Fl«∞[j˘ÉIFx•ÓΩ˜m©nÃ$¸∏›£gŒ_¯ê’èŒ'¿ËNÁSÕÅ’àM∑%ué˙˙E2êô⁄ªÚÿ`d`bÛ$t%`≈àAòò3„eÇº`¢ÛnI≈`WcW-0»ZﬂØ<ä/çı5oî˝°™◊´≈ß°‡KK<+_Bjÿ…≥Q3iù!ûc‚F2	I	/ ˛f6¿l K[ﬂjhYlò:h±È?aûS(‘øE§ÇN÷1<3!πÆN„Î•πÎíŸ|¿]∑™òÈ‰<b©H{	˘πﬁIjH&Úfˆ≤Wá€gL‚I{$≈BäÕ≠«k,ÁÀ/Ôäß9‰íIZÁ%Vµ;™y|BÌﬂ®íG∏ãr'Y`D,S¿w…Eô˜∆ FV`˚Aìx•@˝QÊEV˘8û‡∫÷?Üò™C=£+WLÂ¸˚¬õ~≥∑}äfœÚˆzë°ve*3Qo\N£Ÿó*LöüÃò?fƒ≠›Î¸∆ÿ3√$ézÍ¶ˆÚ¶8€ô~Öæì]'1†›¨◊Ã~∂÷^€x„™”≥5a≥‘øà$¯~v˝(–ˇÀ~≈ﬁ∆ jπÀY⁄ze=[5¿„QPÀiñE7K[Ë¡‘…Ô«≠§⁄[	˜7√<”û—÷ë∫OÎ0˙*Uq.Û∞Ò≥πáÈd&ÆzòÈ1‹°„iÊ¥∫”Œ\m¯÷PÑME`Ö "”B§Ì·∏®ÊFv~@˘·áïuÿ∑{—·ÃUÕßg$Õ`êéú“Ωü=˘¸Ê˙ÕÃîÔ3r8#nAcÉwyñJÙíUZ’#·$û~‚kOz‚jqåŸ®Q	≤UÊgØ»Œ.˜Øµâ@c˜uOºªâ‚˝˘Àö;C˛(Œ¨7úÀK[‰ùt˚Á.∆BÒ÷#ã`‹ç›ê?q,á‚ÎØ7˚˝≤P¶s£¶YµIîÂ*OªÂz∂5;≠iEÁ¢+Ó*⁄ƒéûöÌf˝ö3=ÿÜìﬂ]˚õ≈“y;˜6£éöç®Ù"Î¶óŸ Clcí†KÓ‚v–(PÎ\Qs∫∆’;€/Oã⁄ê¬¨∫ãÉ$=çD~XbV]~^¢≈Ç…‰>	„®⁄ÿ–PÖ[|6"ÑìŒï úbÆyLRƒóz’÷;_h5⁄ÕçÔÏî^ƒV…π¨p°»´‡‘Yæ¥ÕI◊T…∂Z
¢“Ç`ŸU,€¥·∑"¯>¥a‚œxÇD«¡øπçò.“Y àXNﬂ˘è.ÎÖ÷£∏»äÌ‹π¸dmmñâˇ¬…õÛ"BH‹KÅƒÏõZBù∞h†ÜOùËp˙÷c~iË;'7«- ˛«Œ6ö%Q¸'•o‚ó»˚—`/Ω¡8—6puˆÉ∏µ&Õ„›p≥}WÔH•¡€£L?◊¡ˇﬂß©5p7S=Sw¸èö
âäÿñ@KÆA©OãÁKGi	ä<o≈¨b0‡>+1⁄ºì€€Îîö3Õî\zˆV~-Üí3–jyÛ¯FœÕ|<B„ÂV∑B3ô€`N˝ •ú‰¸}o ({ÄCø∫êπ\Í£çè1ùBúÕ…¬ƒ{ØÈVkªsÙÃ»á	-ÀnÂî§òQ”ù»˘ÕJä`K»8éÇ¬ıÚ•≠C
∂Ÿ∆Ñ∑¬=°h¢;¨c≤ò∫¢—Y≠¶hÇõƒ›ÆÚ4úßHJ_RSÊAí¡d¯ﬂ¢|ûËO9Oπ:QI}—•–nÂ™ä»â˛lUr'ª•Ÿ“&ΩlX’˙éˇ≠¥‡Lf$˛b¸ˆ1ÍGksòô´#ºeKÊY
…0]œ~„,eÓö,D|:∆=[ŒXí›zs»$ûõ)j€‡:◊8]ÛH?u∑;Z™‹≈oÕ_ˆ>ù†ä8∆0ÒøéãíJ÷Û4ÚVƒ«ÌR≈ÜŸ⁄*^†≥Ë&bùI4mŸf?iJGÅkßΩxûyŸ◊)h^#Ü—ÒÃ]=ÁbÜå¿ /"ªÇ°–2Ùñ}iÀwxh)¢Ô‚_•!¢BˆD£d[¸£"–(>u¬™¡˝ÆÓ¯ÃCΩùÂ‘Ë‰ ¡Ày¬tmè8!e6bË˛ÕÆˇb[;€Ù⁄πNA.*)∂Ó±§h‡Ú≈G†ﬁ.Ò∂≠Ö≠[˜c⁄˙xˇí»@∞@($˚ñ~>»©˘∫ j}Âp»Í ˘kq ∆ù◊ø˛ãh»ãâ
WgÒ“û?Ñ
$¶2¸˜ÀÏ=L≠ãLÿh#«r£5≥°uªYO'3ó∆≤åäm<˚Û$G‡J¨ÍYÊ°qRJ˝›¡Û7Ú˜i<îüD∆W›éZ∂ÆıQVt´°‘L…1€ó9ﬁÊ\-∂j ’áŒr∂!o˝(ôx∑¢@«≥hIsç⁄ïŒ∞ÃòüÚF∆W∑úÇ@ûZ u®’ø’Ï`%^º®cÖ€I1”æÎi·sªÇ0CÔQ:ËdΩπΩu˜]o∑‘WΩ>æõ⁄˘˜nãZ•∫ÿË>6˘›
¥Ái(4Îw1Í∏2‚1!ÓÎÃ“"Ygñ‘	∑≈Å)áü&∞ÛÍ/≈KDÍ®HÉ€+ˇ VVƒMVfÈ3BØE˝¸Åƒõ—∞√<Ãà”ÅräUnª¢õªÎ§Ω1Ö°£–ê¸ë∫ÇjS ô”„sX§2≤¡¶â@ë»ß!IËêV¸rïoHkΩØqπY>3¢–ﬂÍ’üÄ¢üÙwÇ›M…Ø◊+ó)7ÇÅ¨õ˛Óp¢Ûà“¶≠'ssÜÁ∑UÀ;m∑Ë´P˛[˛É „()«2óÂLcæì8¥Ú£Zw+¸S€è«Húw+O∂·˛:⁄;p3ÆØÆß∏âπMπ“ék÷¥Ñ˚ˆÌ∫±‰Ú6&óvCÌ"†S‰?:zqa‰íƒ|qÙEhÙ'_ëïËûÉG:∆˜G:$Åîtí"òu~JS-∫'A¥"–|owˇt˚XÏº⁄Gº"ÂÎ√oÕ∂±ÛgÁEõ@ªÆÌ‰”-CeûCy{bÁ‡Ë’ﬁÈ·í64á1ÎS«ƒlc`\G´vª≠?]Ê^WÆÒŸMãbﬂÛ◊ı˙rUd]ÅˇAISÆl»êﬂZtÑ∫$ıÌÂ±Ó›Èﬁ´Ω/_ÔÖìö'Ôî¯X”/Â>v6‹'Óﬁ¡ˆ˛´∞nr:ªAï≥ög……ÁØ∏3Ë˘(NœâQ‡tH£9Ñ}2[œ;ë‘˙ﬁÕA’ù˝›Ì›»ê‚!„®*=˝f5⁄ì”Ì›»Ñ!o¡;¥By~ÙÿÌc1ÖÉZÏÊãÒı ˙„•®€Â¬Rnk'ÄRí±onª¸6úmº°Vx
∏p◊≠T–Ry∫⁄;¥D™_Æ>æ‰;—#Ãt+*~Odºı6j†äÙ?”íd∞∫Øﬁ]ö∆˙Tw¢¸lï®g=@˝»u/xet¨ÃdÚÍçAAe‹t∂u
*'‘&Oã"u◊øxù¡ËÔæ‘Yé⁄ù¯aˇ:¿≤ﬂùa˘◊ŸÁ"Ê-Rgåì!Qõ®=ŒÔ„è"∞3¢˚ËÜ7/ÜŒØ"¬ Çﬂ·®vÕ2`Õ2_Öı-ãx≥ÎåZ˜a“˙î≠≤/c´jØ1c≈çXè•+§ﬁ]Ì‡U‘u´–>Á	ä•ABÄ=?ƒ™ˇãbÙ;òècﬁó˜Ã1éâ—sZkz|¥d*˙IoESc£Âç•≠&+•5Àrx'nÙVÄv	ƒÀœ;Æüƒá5O+¢[lã™N#™]I∏ê°ƒ;≈Ìü®∂.me	9eì$T* Í∂füUDõ%U•›k˛£#kv´XëÍg∂c∆5kn’€Åö◊ú«ÜÃâ3';œ#»FA¨j÷_rò*˚´ûÖÆÌ;tÃ≥o÷œWy†W=∑Í§’Ï#0?9Ìã£›/kOßC≈R§T¸,—˜2Bﬁr Q˜í!h…¸207€xÈæÿMÀÓü,$ZIsFMNÓMG“≈,jŒüˆ¡⁄‘ﬂÀ¯–@ÖóYf'3Ot>`•›Î¨¿2k-Ol3”öl¬i|:£∂i=9´Á.˛˝;ôø¯W–âpßà˚:{&”˚≥éÅÓ<-£0ﬁü/ÏÎ ú(,‡ˇ|l}O˚Iı9¡Êπd’◊®?Æs°Ω=è¡◊xeG’!W´ñà√Ë‡ÇıEÙJ£J3Oœ‚◊‰àø∑ÇE°ÍWUäø…ó÷]˙Çz£é˚Ö„˜Û±÷&⁄EöÏ¯Õ€Í‚Í^⁄{¸’"--Æj„ );•k∏ó∂n„…XQﬁ˛Pd˘åV3èä˘Ëg3˙Â”ÀØLz\‰(Y›¡ƒºÏ’∫†?◊`Ü≠‡>±:Ú4∫1õ![z˚«ºŒ£Æöê5"nrVªlU—(Ûˆ·§‚È‘{2√3G‘aÃ=yd2<÷+QÓ∆µdÇ˘øÇ˝Ï®»˙Ñ‘#˝•ìÔûVGxÂøßÚL„.MáuoøiKÔéÊÀ<Ô•…Äg∂Ø1¢U∞Qµ£IPV≈2‰çoéqfæ%ïf‚;ÿ0åGYˇá∏WPÁ’ΩÎq=Zû8Ò;‹A=ªcŒæ¨%TX=‚ƒnMg.Ì◊+√˜∂aÎE0à|pÇÜ˚ì§áBTô*Ü¢ZKL±bU.jOa]
µ?jÿ4g¿S=•&–P!Û€:¬¯µô⁄©å6å˙`∞õè√„2ˇ»ß]©@Ø®GéóŒLÌ4 ØœNÆÛ·ä}ô\iÖÙ	ôC˜Y'”xI
°}dPBbúW°ßFò˝¨Y9ôsé≤p¡Ô◊∞)	 ‰"'¿AL¿ÑàÉ∏óÈ‹˛@êÀ)KDCH‘±ﬁQˆ®ä]«‰aÀwìﬂè”^JN[O©LÇ˘Ç›¸õo+ïÒ i«JFPÙ
ì –˘∫$–z‹fvXŒZ¯ª€`H◊â∞â™L˛™X˘}åî eH˘mG≈ñ¡Ë˙^`ä∞¡	•˘Sh∑I—%˚ÑheÿÃõØ8çßºUz<’õæYm≈T&nèı!RâEÇe√ﬂ0Iö∂áÊuÌM7ÑË‚m£mÈ;Ï/€‹üØhIé…-Øıæ˜À	-ÍMdC\à4óGHµB8°·ï—RÙUkB–0À“ßè∞·’!Úﬂ¨ﬁÃ´ån&Ø.íˆ$Ì$˘∂DÉ«œ©4 cu)µYä≥M-*@K’V\aıØ˙˜+|òYWõä/dˆíM”Ì˙8ÉŸŒÖ¸oâk	$d…{\bjw°ùÌP#»,≥¶
zäB∑}Œµõç˘‹˝øM≈L3_‘-·Kk$(Ÿ[X+cîk4'T›Øÿ“Ó{RŒU_-£‘á&-®”:å[r êdõT≠…”≈…ò£Y1Z3M¨ïvƒà'∫,1Æ˜«\Ÿõ1}$*¡î¯G˝∂nøsàâ£[≈æòâ:≥–Óﬁ-Õ“ñT≤ö&N,¿àqjZ–U5˙o≥Ù›◊¢3}0:˝ãv3–Á+\Óp$)&Gh˘¬—+NÅÔ‚|-fÕ≈◊&{1≈pﬁ˘‡Éê*“ùë∏[LG-ß
¿›Y¡€’º8—p∆µÁ≠v	lí6◊ñ≈˙ZãÙîõ*p7›ÓŸ ) 75⁄ÙaQtù;N;i6Ω¸∞ﬂÓº°l{wa=':!(zﬁìèô[LÓ)∑¡	·"Ï®<‡x¥∆èS™¢≈ÂºApoë≥∞BÍ~7ΩL∆=´`nz-¸¸Æ(ï,øØïõ¥Ïƒ9jˇ÷_≥)V^˘¢Â∫Õœ^L+ö¿!/‹<><™Fæ8˜±AwÆ,LÃl„7ÌNëBç›Ì8¶ﬂ*Cm∞|≈Hê9”≈f~Rz†K[Ërt3oÙBµ€L.LØ Y0Ñ%∫Í|8J≤Æ	·aS66«$ôA∞Äâˇa„(π )‡˚H…÷a,Œ9.≥C{+4÷™ÇÁ6IVhaÃ(qoJÿ«hN÷T’úDç
5∫‘ß^ÖΩˆ‘¢ßÍ&Õπ¿÷A†–_,˘∂∏ÍVôú∂¯¸8œG€¥Û;M.öç!Ú]óﬂèZEá„bÿìaµl)ewC#ÁY|Â¨Z*Ô«ë‡'YeØÕ±'‘Q¸"7aÙ$]ß£™˝qÛ–‹÷GTüj±ÍT,VÒÀTÁì,S≥ñ(_‡Mv_üoüûüúnü~sr˛j˚Âﬁ´ì3ôÙy\írØ/˛.@‹H˛≥XÅ¯—âZÉ£˘OΩ±·*îﬂ”*î‰*döÀP˛≥[Ü Ô>¯kêæ,@Ï¡ˇ_VÏ≤\zrΩÙ|™%%ˇ˜∫§‰?è%Âxg˚`Ôµø¶úπøÛıˆYŒWñ¸ﬂ√ R∆¡Æ‚ﬁˇ5ß∏¯gÛ£Ó¶e7˝F¶x˝§©R#ı£À]è≤å&**oçI•⁄)@‘trùD’{GÊSÖˆ`Õ•ùl˛]£¢⁄Y«Öﬁú™?W[rNœ∆tcTk÷¬–Vì¿Àô¥ÊLzÑ{ˇä6îìEKsÅ[∂Ω7£•0ÈÅ*¬ÕpPπb‘‚÷Í7|S ¨S—Öº —Ã√–⁄Ås–ò–@S;ûÒ∆ÿs∏ëg∆©‡ñŒ›¨—?˙êŒÕ>WÊ_ïÜ«ù∏Sú…˛MÒ hÄõøF© E2*n®ˆî”N…§pW•hW˜óŸﬁ|CjÑHKÀÛ£–˜h\g¨/~ç˚«s˚É∏Læ«úÉ√ú»{ìÙ–Èî”DÄ∂ŸWi‰n§4’PPà*ïÙÆ#Í&ó®˙;y?Ì‡óËÖÈ?DﬁªñEÛ.I†F ‹Nc‰<å_€Ù~@ÿYCVwf=kÆÓ√Î©Æ9‹CÓfˇ‡.Å”¯w?ëzáà%ÉÌ5#ó$Ìò/…BT/Åw√Ãò∏yƒÍ¥èmˆ@≥ú˘>Ê+vÎV?ò3Êz~ÊM‚ZæùdVÁh]=¡‚*[‹ÈÅ ö+¿ßr+‚æ∞csç˘…ó∞_(‰>_úJΩDã‘[ÈöM‘‹∫Ut´ìë?W¢æ"–ö{#'WÖà®äÛ£ë‘”tk)ÎÈø˜K`ciK¶ëxu˚Áﬂè≥n.–â‡"ÎŒ–˛ÓHr›˘£—‹Ÿû‘R‹æyÔÙ6ÀÉ•vZ
}Ä:C]ùèŒv“TV•JWõ&BªDòÀˇ‚é—¡µ¬'ª·5JßYØOñ∂ˆJ$Ì2Ôxø˜åyπZÍ\(⁄üìIE!`°√ÀL-Ì ò˘@Øßr	u>Çg”ßü}∂∫*VVVƒ…ﬁÒ∑˚;{'xÒôÃVÜ⁄øuRDf˜–]∫9*+&ãIƒ=Ú›{õB?¸Ét-ûìê,ˆ¨_ú&Àî}ç~¢#˛∏$≤ÙY#/œ1éÅ˘ıwFÁh—ol5ÕCÍü.OµSñ®.ú2°5go∂ögo¯gysŸÉ†„k8:˚!√ÿ≥{Œ'“˛%Çr˛“µÕLó™Ÿ∞Ìÿõ¥<ãP}õbMﬁÍÊÔG…‰b˜¡∞»ÚBfñp=çœ$∂¸MŸªºL;#«"ó]äÊw∏Z <%˘Eˆ˜–óﬂè”‚Éû"†SaNá,4ª0pMÒFKÎ–ÔÆ”DBG∫ﬂE—¸9F8µ·¡Ö˛ÑÊÀë6X„G] GCÚø‚ae>À'ÉdX^Á£ÊÔóE≥TéΩëçøy°›Õ;Ú(á¬
TtVó\8€Ìv∑çyó4T€%¿tYúπç#I+i$±˛æ¬◊4Ëcƒ“S¿$XÅ:YF¶|Ï W èä¶ÈAdLÂÌÊùfˇÔ–zY Ò`Hïgä6¯S—IFùkÅ)ª&fÏeﬁK€iQ‰E≥±ˇà˛7'ΩÏ{Ãk#ÀËÊBã®MÃc≠ãDR˝FåCEi€ÌzFCã¯≠)#ú{lB∏\…È$[ëïÍhÉ8Ù˜˛DœÏ3;ØûÍ˝»øı∂ÿ!Ê%⁄2‰Jév,Í|(À¬<9àë.(0
Ê‹Hz2Ÿ3¸‘—\Cã« »zùèM0 Tê“w“z*.ôf–68`Ô◊M‡_ÿéa,◊uÇ¯âäÁ∆—∏RdI'¡¯/Åû›%&˘wS∆oÁÔ`‰p†’mrSéá…Ë2ÛcCÜ|5ZÌl §1†yfö
l◊5ªo¶˚¶8„ˆ˛aÀEg¥s†—O¿eæ—ˆJdcÓz#.;E¬+õ±¡‰o!G$◊Õ›)æQ8!µ•qﬂ¨·¨- i]˝‹»hjæ|rﬁOG◊9íeòΩg4—”ŸÚÙxE˛${ôäÁKªÊ£i´-≥Ï4·º÷ÇÈßû˚ñ]˘;√O÷!vﬂ« *Õ< ˘Ùÿ0”ctç	˛ ºì°§÷Kê´3∆Æ92,ÈvQÄ’¨©Z06√ï¬íHµtSˇ∞OÙ[…¢:Æ÷Åiñ1µld€‚|éTC´≈¨ª€™‘≠≈X"È!≤Ì¶<Î'Ô—È<ÚÖX©Ê?6{Ã‚∫)‘∫– Û5√Kf»„8ºˆ!Éf∫”kù∆”g¢∫LDèπÀÇÜB≤0Kòê¢ßn%˜•	µQüƒc<‰ÛD¨
ô¡Ó8¯ `=0Í a—∫pÎæŒ]˚X˙cø–ﬁÿOZƒîØ_ô-:0”ƒãÕy∞®‹q4¸i@º†Rÿ"›ΩÌ∞Ì—Ì~Çá‡7‘÷ÿ›®ÑïmV¡£OÖÇV´∞iáÎµY∆ÓRõﬂ¬ı·§IMYCWˆWyÒÍU≥1≠º<n†∫‘œY‹ˇ˜ çv≥´ëŒ6ñ—g(˙£µﬁ˙ÕSÛí˜°≈nzìvÎj2}{D* eƒ=¢ìõr∏S$x=ÇÛﬂa<¶TIüõO@t€ﬁ˛Í–ú∆pX–ñ?˛$29—Ùç
V4‘zôtØRa˙•∆°däójÜ<µl®(\-ıc-°ÒÒª§®≈‘~
ñˇ∞Qé;∞BÒœïKûu&ñ!É¡8á^#~Òã‹5«D≠KvØØõÎpAH•Ωæ8¬Î€?ﬁ˛˜ºäV€W„4R–E„‰:¢üb∏*é”QÜ -QN]‰å)h „\¡w|ö1paÒÿB£‹ÉîÂªMÊRáy»;†(™ì_‡Å≠Ÿæ ã$0óÈ{7 ˛âÇuÖ’œ7q†CŸ÷≠ ÁaÓ¯Tπ˘ƒˆLP±^"òó˝%ã©ØÚ/U¯-]Ø¸JÜU˚»I!¬≤'?¸´«ùŒØ/◊t{Ée}ºbw◊◊‹˛p‹,HÖ\f|◊önœ}üEÄ˙ôU+§ì·‹üíNµ3–?πìSwQ:·ƒíTÇ_”Hêz
›=‹£€wæ,ÒìÕœ£Y˙›ÖËSh±:H
t–su1RôÇb≈≥"ˇ:“Ê,¿ÒÎ'◊Ã˚oˇœˇezÇ2FÓ&ºaÿ∂M dçøtÔÈ¥éìYï£Ù”ä®bvCuÑ∫=´cß ËÜˆSk±Üﬁ!Ö¥¸2É.∑p◊∏,«>—`ÅK@]¢x~ª·°µæ“b≠úÍµy:ƒsÿ_±|Ô OYıÿ	⁄ñ«≥¨>F
Œ4ò[∂+›‘8Vâ_≤¥NË◊ﬁ˛SèI|ímÃ?Vnw~Ùõ	·k#Ú~!∂AöH€g^7Õ„‰2€≈®U9¿.Ù‹§ÇUÌÄ9ûªœæJiëu^¡kà{ R*Ø†Ø`h∞UåÛ %·]Ω·“‘J:∏}Äc¶Qæ*n@/∞ñWû⁄õ´…S˜1ö<üO¥E…{ò∂ª]∆€‹§1*∆Æ/îãá^d8–á_“ ñBf≠që´HÂ5≠ò<6Ø∂_ﬂ˛◊ÌcAπÿË@ÓˆøÇ^zx"∂_≥˝jF:ûõÌIpÏ<√WÜr$ŒJÜ+>õÅı…∑kìÕÖ˘∂»û1WÆ+7·ñ2FππÆ"∑®MÒsÁ⁄loàÛv¯˙t;ñ–n°ºo—¥oU≠äväì∫ﬁ°¿çÀGyV£©ëAè%*NˆüIÎ≥à<!Åîyo}—¡∂÷¬`∏£ÂáqM◊+ÎÎÇv7Î…∆£Gè‚©D=Oè˜+èç-åHZ¶˝Ãá;P©Ò^Êùq¨ày˜UƒªÂC\Eó.íÏ}≤¥ıˇy∂*üÕı°NÊÚö˛]Ë”§7Ç*∑·ø}6Üq¡‹ ò<Âœ#Ñ\ﬂ»{uÂÄŒKå5ˇ¨˝Hë¥ªw≤s¬ˆˆø¢d“¢7íÖœ∂ßÇ¸_ÆaÏ”‚˘“ﬁo6≈ÀÌ◊Ø˜é≈˛¡—Òﬁ……°XˇÕ˙ÅÿııÌ;YZò¡˙Gâ4ß´ﬂnø:<ßáß€Ø@≠x+ÓË√ôÉ,ïaè≠Â~qÅÃ≠˛^BRL»íÑv#ïA«}ßU’ÕHv˜ƒ∆¯ÓnáùÏøÜŒ°mrÆ˙áã˜3<Œ∏ØﬁFát±‘åÙ≈«ßgåk.3“/Ú∫?}
∆≥k,9£RÌ¶[Øí¡Ìì’,‹IIØ¨BÏ…C˚™ûEÜf∂?KÏ8≥=€Q[–ˆQˇÔ)g+˜0Ù`Áö1LΩs◊˛Îo1VÒ¯?ëw‹î+f˙Ü"®Ïj⁄Õ»∑ ï'˜#àÅ	|AÒ5M|ÛzÁPåKƒo%h¸‰bØÂË
AáÓtÁ4-˙Ÿ@NXZÀXÑ\%ûÃ‰;±¥ıÅ¯:…˙ñÎ£›oÅ”~á∂îø\∫W‰
†gÊœÚ’^~ÖÀI◊4°Ì:≠©Bq¬ æí€öT—óµVæ,TvŒ}ÿ\‚]dã.y≥	ÂÀõ¿Å"éßáÍªMÂ‰rì„Aπ‡•lä˝¡zmR9ø…o©t¯∂ƒèπ-Y‰{»•˝·±Á†–£§e∞f;ÖoAß‰i®Ù¶h≤kWˇÇto“y∆EIL∏=dx^;Xß¨ìQﬁ˘éé`a‰Ãå˛0G“Ìb/Gˆ*+e»˘&¬;•x}bŒœQ:(O∂lòK¬4cQ+—a¶ó®±”%§ÚÚ èùr™£ágVŸ˜Ëˆ"{Ö~aEf.ÅÆ∆Erú˜r”Ê<0<¿C-}o∫à◊ﬁ≥8≠∑öf8ß√‰Üé–xB?£>Éü’z‚IFs}ù¯b√ÿñ ÔÀoM≈¶∫©hŒÕ—ı®Ut¥¢PÃV‰Ú )z/uF+◊y˛]πöæøN0LÙ&]È¶√Ú3Èˆ¶g´,‚˚Ü\]Ì¸eVYd—mÿı1bw<G15Õù+‚,‰}t&![OEƒT”D“XÓﬂCß0ËÓW 5pdWπ@‹á~Çë:n{\éQvê;UÎÃ«bêÆ«}òì9…(¨ôB‘®◊(˚ ≥‡ûÙ¯¡⁄”KG™™/I‚14úÜ∫∑‹#Áˇøm[A^ﬁaë^fÔ14∫iKV”ö“sp‚“Y¸—Òn√∫fØû˝Ô€+ˇê¨|˚üWnˇﬂ7´¿ßç√0|‰Aøô"xæ_ﬁø∑'™M”ïáuîlCµ[÷ãa˙÷xÊt)˘@πÉû≥Œzæ`x©HWÂ&•o€§†eØÒ%ù˚≤äÊEºdÓ> œ}ﬂ3#…ÔÄ∑¨/πÈø,ÂÔy)eÆ}ü…eÔê–¡ÎZj{ØfÂyË–dÑ4Òè”ÍÉDItˆæÚÈËΩè¢˝<#Ÿn∑J‹+Åœ˘öˇy™%?#í≥&ƒ*Tù˜’aﬂÛÖ#^g1±ª·'lù±}/RÉ\áŒZàlvyäp(¢·Àî=˛wÏQ¸[Z„Œ˚jë3ﬂ±•œˇf˙îI≠Rj"†~p·T+ã§É©r+≠v&UCéÓ§“âπ©f|´ù˛æ)œﬁY=Ë^Ì√®öÖ5jF∫x ÊÊAøc€å¿)pÕ=t@˘√ö‹w;’øJ1îj°)S©öÕ¿Æ(îﬁ8√Æî…‰U»Æ(¨üY~ﬂæF£˛eûâa^™|Í[πoäá¯ÙEª/CFijce4IÚ¡u⁄Aè∏È[”‘K…Ωé?æ\∏π/°uƒs-}k∫gHW?¥—|‚jGçΩ›˝”Ìc±∫w £Ã∑w∑ONè—D∞ˇ˙‰õ4®Ó~szÿ0SÛZ“?ﬁÜæà©*n7«ÆÖV ˛>èÂB8¶πˆ∫¶O)@√k∞EuÕ·Ê◊i˝ŒÌ€›ˇ
Z{…„◊á¢yÚ∑ﬂ¥ñ\⁄nöΩO1◊‰Ï;R#ªJq/N™‹Ì®ÀEŒ@∏C◊•·Yj+Lï˘=´ÖqgXﬁw∂O˜æ:<ﬁﬂÔ⁄‰5go|î9ª¬Ä°∑“£\öœ$∑Q»<íc¶å!Ò)<k≤Ÿ∆.mùËü¢˘*$´ﬂ¬ö◊[=JÜiØUeYˆJ°Å6ÌS¸≥ˆúB_ãrŒèAi∏ê—K[€Ê∑hÓ˜Æoˇπ\˝6-Ÿ˜Û∂§K…ˇÚrikW˝ä3ãá≥Óß‡◊o^ÔÔnÔÓ˝,πï˘≈8UÓÓ •„–c@«f¢9ÃÀﬂ]-m˝›8£åÅ˝D4øªö˜À˛“÷Aäy°^@V6˚sπ°?˝ªq“•ÃLÕ˛∆º_£Œ∫¥Ö˙ÈúÙ2®jiÎ˛#ösO‘tîÅnèsuO˝€¿vŸP©s˚CØ39-á†Ü$UÖŒ7uúÎËxOﬂAm@#ËÒ∂hÓ|srz'»ÒÛ•„á±ïIm¸Ó¥<c€N"YEÔæ›{ΩªΩHßÃ÷˜ùbˆƒèË‘O-ÓN˜è§>	öÿœRÊÈ]¯brœöjÔ*˚‘fciKôﬂÁïC†M®_s~(Ì®å±èXæÁ¸7Á07m/)“Ô¸•-€Ñã|¯
∂K{ Ÿ˛ÓõΩ!7W8àZFwW∆∞,çºL*üD%|‰EÏ‰±ZFFŒº´©ìM4Î8qDù,dsX©fxrH6IÛÈ$ÎWÇ)›;udCLÚ<ˇHÚ†m"Nü»YÎœaJI4X‹¶+√_ÿårı>)ØÑ¶e≈$<æ`&ŸÜR*∏‰^)ÚÈßè!â?o"sqZÏíjjTÕvg2á§@s`W◊TããÄô±˝jñ7?˚∏ã÷Ïiﬂã‚\›°É€ˇÛı˛¡°hnø⁄;>›ûÈi§jÓ–/{2ˇ…˚Ù¸˙4´+ŒâÀ˙„ı¢NΩ:‹Ÿ~µˇ€‰ŸÁ˜ﬁoä£K/Õ
ÿRnÑùd'DwË¢sÍ4ÀÃË^πxá{˛ã∆	Iü˛F√9∂OÙéπÍ9ÜGÜì∏Œ0-™œÄ‚€«_}õeX A≥<\=ÿ>›;ﬁG_√~ã<ä§— fÎŒlª"UN@>˚ï£tj˚‡Cd◊€k±±≥Gow;ÓWrÃ93w¶l°ı‰]ëcÆ|3’™Q≠Ö
À+Ÿ”è#«Ér”è73,xt~≤‘^«ÏáÌGøzChJÔ™c‘a€R*åwqGmgùéæ1ˇ⁄Ì„ª™Ï´Û¡’bte.˛YÍ#yÊKd=*F{7ü∆Ãbıÿ@∆)Ö	„ƒçí(ÓÏ=yWèÿèqE%rlòª Ó¸J‚&¯Zü2°©nü3à£Ì›crËﬁ/_Óøﬁ62Hz+ñ¢è∂œR‹§}<tBWHÅFMìßñ)ê/üG(ÂHß‡©ïV¡£@z≈JÕàé;@8Bw0.:%ﬁY∆y-	ñ4o f´⁄åµL∫ñ%Ô¯°‰ûNé«ì∑LDˇˆœòùÀ =ïúÃÃ≤Ü{6 0∆»Õøñm¨µqb˚¿¸:Ó∞ò9ë˜¥òÕ⁄Ö»~èp—ø¿ÚY<G∫ÙÀJä'˚ªÚ˘dc±’ﬁ≈L+√£Y∂ZQ§Za∑u<å0¡"Ê[Ê≤4ÛP€=ˇrë¯Çè
-–æıa∫
õ†Xz›NÉ
Ó?¶ 90›R-¿ysÇæ2ÉncÅS»Û÷ïè±›Cˆ€?ﬁ˛œTÊóP˜Ò5ÇŒı˚Ìå	ª`! «ﬂÒ{7NÀ’h≠ÀËã\ÃÉŸ˙îﬁ‹€√·7¯Iík'$É‰*5ïCµ4Ò„h”Ë¬Ó9ZﬁH0èC⁄›&L°^@‘`ﬁf#,®—r†ZQUñ ≠¯ÀÒ⁄vºµCîWÙ‡“é⁄Ø‰o«S€xrTÿJˇrœïüÆ‚N¸Ùà9ÚÀW=g~∫YÔ–/ø„N˝t«sÏW˜ÊuÓWÖ∆¸?30síX8( ®#˘]˝˜îø^„óõf|≥Å‘%–´§ÏHhEcËîNiÃëoR	1ó •Ø¨o]©úÎ‡£ßåø4oÑ^Ï‘’f˚£Û „V™È‚iÔ9D RH(Íé‰ºáøÙ]ÈœÑwÒóπk8àû®+˝T2>·>œåI@≈8@€™œ»˙¥”≥y¡aFzá˚:Î◊,{‚+∆∑Y?fLG0ÕˆÕ©ÍπÙ_÷è1î*#'|¨ØL-$"5P^û'ÜñªÒπÒvé∫6/È‚z;á>ÕŒ?·éƒ∞|(ÖÃÇ¡c®{\ÇZ—µMtzŸ◊…ÿ-”-◊3’·wÆ#∂[¶˚,Z¢c£æŸ˙¶Õ‡ÊR?wîZ|ÉªDª-‚O"Ìô‚˘∂#Üt8ô?”>´ÒxûP¢i^µTÇ1H1îBã-’ù∂zbÿJá4ø≤°√M⁄˘ÄR{éÆ@á<◊OQò•7ÑÛóΩŸπN˚	
‰ÒË-àΩâJìï–%¢Ej™¡Öh}a|èµ{ÆNH™nëˆÛõtG5\u åŒÅõ}÷O≤„ü÷ v√Y/'§¡û*Ä_ÙØ“¯äb ¸¯¿ÿá◊]n‹g‹dΩŒêzÇ~„† tSÇÍi# Ø:Ö`Ê ñc–óãÓ3N=¢–>„≤Ô¨†`Ï%ùÎ&G∆≥æÓÕõ65#x[zrá”RØhEAÚ7c∑	cS¸µ†“⁄iYﬁ∂ŒÓSÛ{ÍıW·⁄üã√ãﬂ—⁄àåùÅÓßk≥ 7rI<√±_fc˛F-é¬Ä»Ìˆ„T‚f‘Özˇ¢Õ^\	ª‰Ÿ¿(wÀ¶©{†}ÿüöiÔº6t<E«+O¡“òK{0Ã≠Ó⁄“L:ùeëQ‡'í^	∂Ã9)k…1X¶q∞ìåÌEˆª4Àˆ¯göIT:˛V”¨.J6Ë˙ÚÉ,äﬂ°2‹8@îΩπó~®2Ë7ÊÖÀ[ëI™c%hQÄﬁ¿òÌ€‹l ∆Ùzzé£‹§î˙Ì™Ïûjåsœ∂Àπ-õÿÇ≈Dﬁ‹T%>˝Ls∂j∞Gú=7õb.∞ﬁGI⁄ºiic‘(´©±,nÙ*å]öùk–v∆œ‹u66çÁ$,:Ì~ô·.6ÌjU^>Ä5¿]S≥|¢8ôØ~qÓÕ±—~Ø`g®‚¨>éüŸpU8˛”æ§53	ôÉlxeŸ=¶,ﬁ¡	ÑYxùÖŒ˙ÑÖ∏∏$DòÈvªç≠£tåwôÏ·cœ¢{– %9»Ê>Uº.ãÙeù…ñ{as@+tdì3ó'’M™_≥‚õZ°ŸwŒÜ`¸HF¨πâpÙ´í≥c˛ä‹xLUãw”TÍ_2ÓçÊ-=qã&bJΩ@≥g<∞iŸò+"≥œkZÃL√Ùé(§…~Ù\®u€UO]ô¡%∫\ò≥Æ’_]k!Ì_¶ˆi äf\„ΩK⁄åjíŒnR€0
vn*ΩÈ:∑ì.≥¢ﬂ|ª˜ÊIVà•á£XLó^àΩ≤LÑ¬Ω£§I&(L™À4%mqÑ^…•MN.Û
@Ü/Qò6F¨]√Ã∫˝gÙº˝Ù¯HZõ…&©∆5Y¢K`«\¿B⁄#1u©Ïx[ú¶ÖÈÉ≤√®õÙ{DÕ–/b ¸º`ı Æ°Qçi§Vap q?é˜Æ¿å√·´Ö5&#+¥ÅGƒ≈œ£◊◊´Ï˜ÃxÉ
…O˝cÁ∫cn˜D{‘Z®B€E$d˝ÍN√´“ÅSı`™ï‡ÁP˙ÚVÊCUs0}â\^ãJè@Ï#™A[,¡¥Éå Lö≤F˛›®€€#JΩA•øÑÓ
5Ã¿ìØª‰K†®àg ‡îÂá/nÍœø?ttûëæﬂ„≥œ§≤Ï_¸B<£I∫ìùû…|Íπµ√Æ)Cıï·∏'√£º‚Ω^{ÿÄÄ¸B LÇ≈©NP7£Ä#Í˝[”∑U9¥±l
ø¬ªâ11êıÖÖ«ßt˜í´!˘àôâÉN˛tˇ€C˙`ˇµ¸]…Ã2◊ œ∞≠éMX3œi+{Oºﬁ˛<D-é•]÷Î2ÚïEÌƒªI·Ãkô≥ò9â∏ÁQŸ_ﬂ{Ãë¥Ω®≠gGÈ†ìıúΩïæqTmª~{MóKÕÃ∂k˜S”pì•¬Õslö|Z$ÂıFmìÉπÛf~hô0ÿú∏">ÑàC<x»ΩÄÜÃã≤T»|(!ÛÑÃáÚ¢Å‹s„Áä ‚†s8ÿ0«~óCs4—eÁ¡„Ä‚≠ÒŒ«—X®6<√ñ ˚Uâò!KØ∂¶œNRÂnã¨ª+bÿiâòˆqhi •EÚbÕ@˘±†?ºÌ YVÓ˜—;AΩÔ€Î⁄cÙÀ¨'Aòè”KxÔ± ⁄6\>˚˙Ù‡=€Î•xtelïaµ†p›dÈ;vä‹Ø?Õœ¯Î«˘;Â}‡ﬂù#À,}Ç@∏ ≤RÙ≠–¯fæ§Wƒc;◊9 e¸ˆµsÀµª ≠0ŸøGÃó´ÓπjOé≥Ñö¢H‰ﬂÆB¥„+µÌã]Ø”M5n“ÖiÁq8xÅ˘˜Rb\ò∫|—>[{c∑‹f ò«ò´
!NVq1æº›O1,¨ùEÚ·%=∞BFæénbÚ0) TÖ|ñøÈïÔõ≤‡ﬂuRLsqÕwNcmﬁ‹˛–√lÈ†Èhó~{∞ÛË]'m!«$AÉGBF x Aãöˇå⁄ÜÆ≥nBéä∑Çi|˚øËXﬂIÄ4"ø(≤´ÑÏ#yªa.JZcuÍ°#Ö6n1Q¶Úw\vuŸ—<65˘ rI7˙H,,ı™°èbföYëí‚˜„Ï&w‰Ñkøáë◊„eh≈<‚¸ËÆO»)\ƒi5Æ%bwµ´&,Rq1€ë3VPrhTqéN˙…¢∏?êÑt>W8û*MåE•“Z∏N ‚ôL¿Óä7yÙ"Ï◊DùÕ~⁄‚YJ_éÀN"†ﬂZ	A¥Foã9÷	M®ãVVH´•=~/v‘;?ä&ÙÜ°—ßròg)‹zù˜ÕY°õs7}üï#‹Nñπ%af#⁄vê
“ÑT)%¢©˛ ö3b˘Ôñ/ß‡l‰<4Yõ˝ì‚aÏòX3Ó∞öCÔËDô Z‡•˛j üπ4ﬁg±„=Y†æñ%	û·≠e1¥¶X˝*÷÷“¥†7ÂI±Û*Àv™˜èE≤è*k&©3\ıŒﬁ<^2úÉÓì69‹SìùúoÅ∞tö.Áí»/iJÖ{ä∏é°rÚj∞Ö	¨riw˜4O»„ˇ.NNKÛ+IÛñ<£JÂs¢Ûï¢sÀVjÀÒ:phŸéÀkïíù}AˆÊDŸì>r≤¥p∞/ÃöÊ%»„Îƒ$c˜F7a(PÓÅÍÆs§Káë5.t®bÇ,ÎÂ£Ù©¿ü≤Ç¥˙3|˜≤¶ÙNPø@!Ì0%œr≥‡Leî9Ω∫n‘ÉbúıùÊ_‡bxí}èCµ±∂Ê∞∂>£Ü¬?œ˙H≈Ôˇıs[F»ä‰!UÛ≠té»ñÒcˆ≠œFwÿ#R…ﬂ<–ß*l§Âê@ÀÈ›ô:ﬁßû¨Ày…k9yìÌ-⁄óÈt/tI-≈oíAﬂ>ú8sµ$Ã·>Qõ›Éärµs˚œ8˝”n∆tÅzCfv^˙èH`µŒN#s" ŒA5Ìê\Œ,çÅÇ.l~@B±”4_zß˜JÆ¥íVD'>±9µ¶N&ÏP/ç(s≤ΩJÒﬂ™R˚°+46S¢&,VAÅ´eh2k”î5û∂;¯Ì‡·ƒ©j™Eñıw0ñI_ikX»&˚∆¯7≠Øµ⁄øÀ≥A≥Ò€A£5ı
ÖˆØSÍ‡ﬂ@ü©@_=·ø¥/…,¿FŸ`∆:œ⁄•TYGÙtF√3à¸´z1ìàŸ-(ZÓ‹sLÙÁ˜ìQŒ„ê©»t*¶óaÈ4ÊÓ;kSA^Ø¸˙I$±ﬁÔ˛ÚÉ∫¥ß"œ`;R§ÂıŒ;^à>+áŸ¿=–†3ªU±bsR|6gÜ /Ãôî|ôtÈﬂÔÛºˇÆ¸˙s—	≈÷bEU ÆŒë5"≥“oîm∫õÈËlôJ≈æú=÷!CAÿ¬âàzÊ#l\o'cÔ©1Ù”fÚck{J.œ∆ÌAˆ(ª∫∆Ê∞„Óô«±‘Ä#( Ÿ—o;{ZR5AúK˙'Ω	Jﬁπ’Îß≥ïÅ|∫øN`FÚYÅöòæQêÏlGöESló>"HaÀ3∫˝Së%+Gÿ7—¸2Ô‰¬‰t>\,˙-vfX¶?âÑCÕÅòíQ‰ië^>üp¿Tè‚Ω%tMá£ÁKdÑX∆ˇ:Gw◊Y∑õx™)ﬂ:%®à”∑—vÃàÜ+fˆû˜ ßÔ‚Hôe—0f~v≥Öº¿ÏÄùÔöë0ı⁄1sõx∑Úk"–;Ê‘ëÙÒûïˆëc‹ ›Ê'ÚÚöj
ojèè0<ÇˇÕê:m*Q◊›Çfîw}‚9¶‚XA^to=«òeoî›y,#ì™\»–¥î)?oÙZ[vŒS3vêÍ†fÏ‰‘7>π˛“À¸à4≥>"”ñCó∆Uú‡ﬁàÓÊÔÔxQ¡!#Ã'ÕTÄnjŒÛ…Qo\N˝°ûTù…˝˚8çã˚RäÈtÎ5⁄±†Xh3„µXºoÖ^3ËºZˇ~ªì]‚ﬁ·≈œ+4ä'PW>¬⁄‘Kúy3)Ø®ı¶t/π ï{˙Ã(Æ¨âµ¯˜› ∆cò*è˘—”ÜW˙¬•Æ‡‚ø![∞"gAâ^O+Îü;úO?Òú›™ÜÎkL	ç∑5;û¡‹GS·:RÖZ•4ßp.E–√\«q÷@⁄π¿&Yqià@x˝8¶ìFı–•≠I,N•“˚Ê'mæô"G (ãèk1óﬁÅsBﬁÙYÏûGı—ºz˛i!öøFuŸ≠¯XNLÉR`Ëí–±KUj2¨<fœŸl:ô≈+®‡™˛è`B…3–DP °Lº?ìn¥Ω⁄›Ñâ±Ò4ôëæX€)¥¨Ø´Bƒ'*ô@™≤ d¢bÛ®ÜFu5ûs6Íÿ)ÈÒ+¸Ò =òrhb]ü∂°’m¥tÓ≠5e˙≥òç∏(Øa≤~,ﬁÔ!ˇL˙,n˙æ™í(ìØ&≈`Ï≥`j{\≈4ÏOs3!œ÷⁄koj≥TA´¡åz"—Z‚ª∑X9∏¬fÉïw0ëøX#ßV∑Î4H*?2 √ÀåqSxæàF}y•Ãî"k='K@—5à0AÃHÏO«’¨KÁr◊d.Ú‘“È∏◊V
fqπ"_„ƒ∏5£H„’*¯5¨ÍsË‘.2œ£*å∂®˛’öJŸ=Wo‘AÀnÂYÃ™µo?wﬂÄNYd∑≠C®ß/∂{ó…≈Ìü(qvìŒü+∆Ω|"†J◊îçö6⁄M‘πwjπóÑAéZM±∫«eS¨WM… m^'îçïb¨œc’1∂¡–˛&ë†«˙U/‘/a1z"ôKI°àJÒ(¿xÜqπNªWWcp˙Ë£'Œ4Ôø_AîMŒÊæn¨ 	Ó≤?áK/Ê*ñ…x1E–∑Ç’ˆ©iëÆä2ã^.ÿ2>+\∂Õ`ó}kÜﬂëEÓ‚èGÇÛ·ÍÊÌÓcI˙®'ÄÄ;
∆_˛ñ=2uÀ–ZïJX*Êä’ÚÕ–~∞ñ∏(“‰ªïw–›¬W≠¢,ÀEmËÁÉ‹®*∫é∫–-∑≤èª
+Áëø^,÷|Í“<
äØW≥Ë[ ˆ|÷¥måRan#v}9ë—´èÈíÙ‚—ΩœTÎùÇºÇ‚¶BﬁãF}π·«ïmπ◊†∞y∏!B◊9&£—ﬂÅ`óJˇ p‹∫.m?Tù6¶Ø }˙¸3HITçLøX¸W0ïx95Aa±vÕeä¨üƒÙ≥Y~æ 0Ïœœ-
lŒ~Qa^_~¬∞0øïÛ'r{9¢oT[]Ÿ>U›õDB	àÎöQ…2ÌØÕ–cV¡Uê”ÏÉÇ÷¥V‡∆§ù˚Ø”+ Â0≥®à_m‡⁄ÌLì ≈j–Eño’ÄlW{¬∆Qá|2äﬂÕ™ÛÂ•~◊ﬂ:WXpB˚çˇÊ¸{@¥Î¢)°N{éZÌÓ©æ-}˘B›∑¢¶
€19Nˆ”ä¢Îœ		©9¿∞°©5Ú◊
ëØg–Óã˘hgRhïÒUV Úß \ŒeáÆ¨¢Z∆|¬éü¿>iGZÅ>æÔR+°SäâA?≥k7-÷>æ◊zµÅN3qyÁ·é√Õr/R:˝≈’ëàË2´¢/ΩÿrY)¿U®¸Qìª'X®¸GH≤˚«“—∫o#&–±NcUtˇƒ°¿ÎÀ‰˚¥ƒUt“ÿ‚E?yøBß)ÊhÊÉ4Ft`sì˜W Në˜zI·XÈúSÒJEÕ„›¯D√©V¯—îôkR»çÏfÖfntCRDqó^≠V◊vòÊ ⁄√TOhsé≠ùXÃG3VƒäxBsa—ÌIï˛]?Â'qe≥&˛´*ìôyôe¶˝VMüÿÅ∆¬âtH§óLãO∫'ar≠@«à:m»º[Ë[Ñe"Æ^?üü`2ÍG£ó	øÚ3êx'3ìíÃ$‹NõπiáæÊ‚“¢ûlUÊïË!’‘‹A^Nü?ô-úå@ã±DÈ∞Xíksâ£⁄#«Z;ë4i3#Ó“"Ff7QÕ‹∆û•à:*≠åÎKFb÷õaÍN=9∂∂"Í»øXÈ4+åùƒäÍÂhÙ°∂AM¬À©˜9±h Â‹ôeÄ™í¨Q˘_©¥¬h≠bàP˘Q√êòïØïµ¨@-‹-?∂^ƒ5°Ë2·õ-iœù8Aˆà´Î∂PâX≥˚¨œ·VƒΩZ}W{Ê¥ç®ùzZ‹|&‚s-R}‹oVΩÖ©"ÿÊ:‚<+™z·ƒH"HìUB˛±H…¶£œ)–aè>0Ô[[ÇqÇ≥MÙl	ì
éJ¡©-äaï<ü8¿%@>Èvtô∫“{4kg ’PQ‡+bì˛·ÌDƒ°ÆmgÄdv3#Åµ±∫*VVVdbÿù”˝√◊xâwwäœÉG+"0+ÛˆW{
Çôb;îfx|X¶]'ë^"æÃzÚ<∑ó…Ä^:~Öï>˘L⁄íˆ‰gÈY»Ñ È@Äüîƒ\Íx» ≈«Ÿ 'Å'ÚwÑ§‚à∂·ÖZ¡M«‰7	A†®´¶’|†V∆*≠isñDﬁÈ•Iaæ◊≈‡eéæ—Õ./O(-p$£kXëﬂ„‚Løa›œãf*‰∞®Ü(U¨ ˆ∞¬aèëÍœyaº∆UÒdÕA÷·/˝oæ£∫wÎ°ì1v‹≤5Qf}’ÜV{òtO∞›Õçe—X√lŸ@Ë∑TÕë∑JµêI>u3 h∂í,ı#¶ï9ª∆ñiT‡«là
ßícÍ+s=˚„≈Û√lwª~ä~´W∏Ïuﬁ◊X.Ùª Ê›i⁄Ka‰Õ˙∫˛´É∑!˙yUÉÚ<î¯Ãnﬁû0û∏‚jWi	¨ØP≤Íﬂ,U;E£ªû,©O<sÖge)s˛tSùßƒU(ë„µ(olYç∫–ıË|Ã^Fôô9d6ABJnÆ\EﬁSçÛ2…`‘d©qœ…’8)∫∏bc⁄√¥ÕteNç∆ìxÎ û:WREÊ®NC£òæi*AûF˙rùˇ.ΩK?0◊Ù£a'<∫BŒ–-F»Eù«@ÀFÛã}ùèã•©˙_ëˆO5¸@@V§C;†Üf
7©üúwJŒ1+áÕ√Åî[ëî≥©8>6ùÜ£ı„d‹êg~€›¨S0)¢≥Ñ"ÔïlR†∞ÒnvÖ{¡\¢NÄ¢f2°ªâéB(ôô·‚.∑™–zv∆&Î:ó˘@‹v.oçîà§7µºToáp}}éÙÆîìïo IÉH•lÍõß·Dﬂl∫8√"Ÿ8hï®x¡"¬ﬁ©≈Ñª∑T{≤ãz¡®çöf—œ:b:1L§h-nˇ	£ıíè≈ãS<:"òW5ﬁuêï'˜√^
ê`b‘ìﬁà¸!=∆œáà!W3çC†tñ(ñA›0ŒOÍ˚°¶ñ°úûë\0!9≥é≤B"ˆ%éê¡ôÇÏ‚Â\f®NXmﬁ}äÅ:ÖY≠ë„˜+™ÆÍ˝—ÉŒf∂Ü≥YØX≥Á≤˝F"ù+Ω{S˜ÿN˚*X˘ü”™3k>V!˛7ÙÁ–Ñ‘ånB„E√«Ëüc#†¸› qÅŒ–n¸^ªL\Rhq[éª4w3AŒË¥ømÖ¡ÏB<·¡
Ç°ïÅÈ2TòπÚ ¨bÒ‡πL$E÷‰/˚µÄç}ö¬O/_»…G&„f¯¶II§c$Ñ˙LÕ™Ç—πwçmñì,/îJ;_kP,¥€Ì‡UØ‡À˛Ë ¿n∑¶±v¢gÉV˚PÔÖôò·oÀÕz≈>⁄|Ï|Å;˜ÿñ˙≠¡ÈxÄ˚™6ÓnÙDı|r™¡9å”r]ÿ±4±2”/èã	›E‹£>·wˆˇ6Ô‹˛ô≈ÉéóÂŒèíz‡èâ∏˝vy<ŒãcÇ”Ñˆ†NÓ‘‰?0M˛b1MvzxÇs7Dìàôîï¸c"öh√-[6»ÉdeÇëÇ2’∑`∂ÙÍ†K&Mí4“vb.+KNÀwOô#l?‹qê!l∫e˜ë†˙cG¬”s–µ`4;∫∏{Nk7V~^Á vØ˛}{öqƒˆU^$û≥G,∫∫zJHNòXƒ∫/ÒpÈÖ¢£<Jú[‹˛	µ≤–¥ÓH¶™hbñÙ¶UaZt9@5G3…G—≈xˆÖTa∫‘dq'·ƒQn+]ÿ™ñ2◊ÌŸı£jE!F8>ÿ±Ÿ≈ö˝z‰ƒ†ª'†JKÊªUÃ¨3•sœ„œ6¸0”«x‚:Á’ár≈bøÊVªL|≥ã≈˝´◊1◊!«+Põ–t‘ç4í!èº˝◊˘ÕÈ[˝7öËW∑’=
Å~æGYãÇv«=2ù„LsJß∆9¥NDè‘:âá
≥WIU´Ô® 7Z†n8Q∆õ%qal1*‡bÀ‹®:ºüf_Ã¿ÌÁòƒOaXzø€çw3≤Æµ‹æç≠ç÷n‹W`≠Ø]ŒøÌyÅ’&€3_ˆªÉà;YFÖ*ëvgÅv¨R∂’«≠.(ËÓ_Ã˝(B.D”â∏◊|¨à™^´ãÿ¸±v'«¶∏åS÷{ìâˆ
ÚŒú"ŒÙCö˘ÊÓI]§õ2A⁄6πä·∆«F∂È¯'UOÈˆ∏.“mñà˜≈E’æ Í‚€∂x<W‰(…ÑrŸﬁé=„¡çûÊ*˚5+zçπ·ÌﬁZ
Âˆ{æÙZù"™:ñDBﬁeùq©—E‘)_˛â>ÚöÅz‚‚õ]SS^Î∆ËÉ2—Ãá‘˜^kâ5„‘»	÷7Áßw‡vTÎt^¬9µ9∞1{Ô1ÉŒ(#ËòU•eë∑L§ÓÀ‡bÃ°e=ô‘©üK®†çwˆË\ƒô3∆z3¸8ÔIVyÁ‡Ãî´6@)s‚Eô”dƒŸoª_àtîìy|òSåïFÀ°ﬁ˛=ïâ»	Ìù˙[&&ù¡*Ÿ|ÇÖ–U4:(◊æÙ<?<ﬁ›;∆…&ÁE⁄I/2ÈíbUãs\oË¸{ûˆœAaK7yÔ∆x:oã¸œ´>˘´ﬂpÔ"â}Q≥RnSöxØÈ’8m`zGﬁËW€/˜^ù áw†ˇ~™ï»—ÎÊP•;¯ïÓ°◊ALjU–mŸÂä„ª-lª>-†ˆ1º‚È∂t…]öHîÍ~Í˚ñ`¯5£û[á&ü[≈±%™OS]œ({öÃÀö˚vrLù-9äòP4AØ¢Ïòø°{ï"˙z	/]‚œÀÒ ÎÖÃâ©Íâˇ^Á£Ñ¨¶€i1 ±éîJ†¬J|Â–HßUBhN@Lâ#‡‰˛∂Jî∫äÖåMmÇÒŒA´Ã;Ú)Œl`ﬂè3úXC7≠‚¥^Ω∏¡Ï√{˝¥ÏÀ≤åêd·π†≥ ù√≠¶9t´7æÇ'¡¶Èê`ÊˆN⁄vÿqÁ’·q»élÅMÚÇM±WW÷a∂ícU	£sÉÅATRÉâ¨GtÀ¥Ôí
ÚyCÊ»ùmÏD^—Úæ[¥¡∞`EWÕVE6¿ÄåHÍÅ[â∫YŸ;üX√q1Ï≈(§∏U®õNv
≤bA^¬ä)V=pãU7›ñ≥Ã
Ó|HëbÈ∂[(›™"Üù¯¨Ïi„ë¬“’∑|u3§Ö#.XÒÃÁïÔ>—p”ó™çri%WÈNﬁÀãCÃ÷ÿ§Î}◊IÄœ≤3ı¬TÓ˘É∂7{§$€ìK(à'úÂ]L€s§‘!+p@iëÉÆÒ}Ñí;ÿ;9ÿ>±ãpì-ó-Z°£Ï*)ÂrBßB‰bóQ%á«;€{ØOœ—%ˇx~P'À±Gr=”k∏IL·ú,—‰1m¥∏¡nëª˘;•¨°á.zfP:0˘;Ì‚{ß˘’U/=°;“∑˙ªÙ√RÏû™‚6≈I“K±¬‚iPÚ¶ho-c÷çÑ®Í—Mûuü≤ñº0π¿üö6Ò{nÎ‡âÔÇn›˝!A`NìãMº:Œs{áºïè§K(ÆÚŸpÑJ‚~ó\|L&Pl‡÷Êˆp®~∂<eï$#h«z≈/”ñ“¢T!]Ã#∫,f23l Ùnë\]ëTWæ“ws—”nCÿKITÿKJgÈä;!∞~ò/∏¶‚z-uï‡‹¿ΩÛ¡˛L{ˇÈôÙÅºÎ'∂qõbÁ‰§}äó∏$ÿ¥^ÊçoørÇ	O§)µÄÌ˛T÷∑ü©ò¿~¬“L^∫Ö ÛÜD/ƒ“˜\èësÖÉÊ¥él"å É„ø%	:úzú’nrs/”*FqﬁˆŸã‹wnPë€9¶˝/I‰kåØ‰ˆÅ
\æıjòˆG⁄p ¡´œ÷€k_ºQ∑æG$'ıÙ:Å©Kºn™ CŸe÷:K3à«C›∫*í°2x≥[@∑Hy)FR-!áaØÒüö `:$YÅç®zßpóeTGÒƒ´™&ÛΩˆπ,+<VfFdF	ˇå€›Õz„#ÏÄ@Ø+ËuØ∏∂Ë‡3ΩJ¥’Ñû~Mw‡“∑>Æ˙sHÌXoŒ€p≤Eÿ)Á–$•,~œvÆ”Œw⁄µ˙ˇ∞¯m»Ã7>±”?î:fÁ}6‘	B‘úîq’iÒZy—6^&Ω4Ü ∆>z’°»∞uç'…“÷_MÃ‘Wÿ+OZÆ%$ ÃdÑ5©`“fsVÎºBñ≈˙„V`
ÆÑG©81p{uè8“=}"•À €‹sû2$Fü#ëcuÜOìU#ì	zU
0ÿ¨∑$¥b⁄óXÌçi≠óâ*£0∞ß˚•<Ás¶ùøñK˜Çw$i~UçNPèìö/ûI†-|¯ae≠Ì°≥ªÁ^≤M®HdÓ§L.”/â7öë.ô∫›’ÉÒı◊õ˝~√Õà‚≈Å◊L#…∑j»EQÏF2ı“ÀıñD‘ÍÜêŸh ~†ÔËÒµ—F¥P´¡
Eßî≤◊Àéæn∫*Û_úHèVdﬂñ‘j√Ê!∞V„Bœ]∞è}$çÈJ\+f⁄ÜÈ9<7π"W9?êU-¸*b2ùƒ>Ï¶÷È=´™£`‡üç<∑´U%Œı;9|◊òÈ ∫T¬ùıªbÿCª{´XT±3∂ª]á…ãØUÉ_Oÿ∆Kä°nC„BÀSŒÓTsíw÷È¢CO∏9Ò,Îæô∆Aß[˛å≠åh|Ûndóìµ?0Ò’∏ø’;Ärﬁﬂ~∑Ù7}˛ı6Fùx˚@oø≠7Ü%€ÛùΩ˘Ù{Ch=‹>IG z∂5Á—∫(ﬂd˘ygÏ'Õû.+—ΩXm‹∞øCπsSπö’∏¯˚5ª∆≤~æÁª2¥#ñ‘6<'ê¸Æ ©Ó9RÈª }ãÕ°<¸∞¥j_'eì“Rœ·EÏ@?Wóœâ˚ãÀÁöãw>ôßCŒÑç&éÛSÉÅ’{9âÔM4ë$NÅ’1§°z!GWF˙TƒÀñV£Ê√»‘G¥H>≤ã‰‚jΩ∑ÀZˆk	YÂS(˚¬?5ˆŒî'a3¸]¿Øÿƒ2ÉÒ˙£ÍK•Nb¸<EDÕΩòösO:˚U˚ÛjˇLÓïx,≈7ÓB¢MîSœQ°#◊Aë Ö‘&ı„ *m*CÆ3¸eWlhê;	}pdw¡Çﬂ¶ëæ©gCáìYÂ—Õ˜.°Nz»rÚπ^9{º&}„	UÎ6ùÊ˙⁄⁄Õı ∆Zëˆ[oÊ¿ ¥vèÚEÈH∫„îö«!Mû”où!·ô∂Ù)ì¢§Áì∏»BZÅ–†≠ ÜY~ïï£ô~ÒD=t6ÊnQ“>˙Æ÷c“àÃﬁv™ƒ≥æ5ñˆÁˇŒî≠Xé
jñ§Áìpq2Ü¥©' ±~Ìm\∑Dè™¡V“K´Qo¬Yö?0J¶ﬂ–1pÙœ^%“¢‘±"_‘ÁpÛ˝núüˆ‘ˇ±v0ø+¬Ù$†Tâ>F.!$Kt÷/◊3¯ü"™È„÷í\=∫©î›Ë4+qíU˘rDˇƒíèÛwˇq–£4t≥µ¡òI‰Öã.§„Ü#Ø≤ j±¬¡îƒ™@∫&~)ûòˇl<nµtïmG¬Ü °‚mÅ)5oû9€1µTMÉüõøbq´sç’Î∂qÍ3€io˝ÛÚ∏x{aœ-ñAE‹≥E›Û—≠9n–ÀúZFäUõ gX AüCmÓÓ™≥´+J[∏g
Ø±ÑG"a´î`w1∞À[›>ÕÛêõm◊Æñ08⁄≈1—¿≈œe«%hSx§mÅU|c#∞äœ	\YkøgÉ∂;îsò≥c˚gnxÍ{u‹ëRKb&kwÜâÓÇá…!t∏û/≥åËQy›DZÃ@>1] r6ÜùoülÔ6úâÂÿŒ´gñ…ÒsÄü√ÇæÒ3¥üGÃÁe=øì¸G±œ4;÷Ô«∏Q˛bQ€wÔ
mﬂO–ˆΩQÅ&ˇcø›I3óÈ˚SZæ”Z`˜ÆŸÃ80ê‰h⁄¡¬´! Áaççú‘@˙Ì‡52ˆ«¢6".çˆîïû;ıòçπ‹lañU˙Ù–^◊†0 Ø(Ÿ)˚äÆÈuß´µÀk3—[’aj·√Êˆ:Â»#T·)óS£˘9’{.≈G~é˘.∏ú*É†kL≠‡∑U`í77Õ-¬Êàˆr7+‹n¬çH?ì≤C}D¢˚Èa7+™;(´s:G5ÛÆ·;~ø‹ÒBñøŸ±A≤∏∆˛¯6o@:Ω(gç”≤∏—ò~a3Äû∫#-–§_¨	H»†g“}]x¯ƒl¨ÂglïC¥úÌ[
ŸÑJ¶∂>åæU˘˝8È9ıèº7ÈGÓá_∞’cjwxF7ƒπ)€ƒ9I}a&›_=Ç5ù¥„Èi±±§NÜÉIuŸ”	≤ªÁ›åÍV3Tj∏tuLK£sY/Wù√OÛ]ªÎÄ=X‹"s
‹hr$Ê≥¨|9Ó}áÿ‹îóﬂ™oHVû$7Pº˛B‡ﬁ¨/‚ﬁ˙2K{™+/Õ•Ûôd\Gµ€$kâÅ∏•Â3Tˆ–´YG»›◊¿+
QÓ‡Óâ¶5À–ºâc∫π£—¬ëgΩìe–P.QqD%∆üì5O˘Ëmç‡FÜù1_Èn“Ì6ûöï¯H°”1ê∑’U¡éO’— ãòZΩ*∆√≠~ –˙ªS%π •Æ#A¢ªGÚ¥1Ùsy´Ç^_ëWËÛÿı=—çù;®Êb¿Æ>KñJ§CYCrx	∂ı{IÁZΩ&-sNasç√%≠-ﬁ∞zïäœÂÖ‘rÕuSyˆ»+ˇ≈UÑˆ;XHëd¢;A{Ñ¡Äõ‚:ã_ˆ
˙€Ù√Eû][R'—ó`z}ïéF/^™S˝Óéy£Ñ?”ÿ]8Z)ü3Ò£´±&o0?yÈFóÕÜ$¥ÜQ&øÅ¿‹°ÿ«¥€0h…∆i®h’fìZ«å#Jô~úøkŸ◊GM÷Ãû<4ªÖCìèÑNVÂh‘d’§<˘GÈ∑ˇñKÊ>ˆêÙƒ∞ì—òP?‰BéAv◊9°ÙQò_Ïkîı”≈∑IÕú¢ıD&£UíAJ±/©œZﬁ‡øÓô%©,∆8HÿÓÌv{∏Ï/F¶∏‡–ŒõaÀˇô»´f‰-“Æ¨Âº™·X®ÃÏˇô^D*√7}çxÇóy&Äß €?ﬂ '&äÆÖıS¯ßyÅ ®ˇ   ˇˇ JP}xúÏΩ€rGñ ¯ÆØpbj
ô’»ƒÖ§JÇ r  î0Mêhdu/õEfxfÜëäàƒEhòı|¿ÓKœ„öÕ÷ˆCô∆¨l ÷÷¨“_0ü∞Áwèp˜∏$àî∂“åDfÑﬂ˝¯π˘π§ﬁò_◊˝Í3∆Æø˙˛_]eØSœ˜X‰±0H3è•Ût∆£‘c>è≤$f~ÃÜ^‚≥ˇÁˇ f<œ#(‰EO°õŒ}/a/I<®ú∞Ô=∆Ÿ| ∆<Õ†.ÉO<?^Å‚º~z∆Qö±â˘!ﬂÒœºh»è3ﬁÇl≤G£ ô≤mÊ•ó—êuf‹¸xì{!ô¯<Åˆ‚3o?Ûfﬁ&K≥$à∆]∂˝Ñ]AÀ™Ì°hz«ÜŒΩ cÈ$>óçwæ;§±„®∞qúÕoÆƒ˜˛p√üÚ‰Ö7ÂÏü˛â-√ ñÉ/_≥ôóxlÈ7W«';ﬂÏü>ﬂ˘zˇ˘Ò€|0ÔÆóûäıe,±ŒÉb]ñlûD‚ey‚rí⁄Ã¥}“WÎ%Ïœ◊Û˝æ3⁄fm‚ÿe C>Ã∏‡ß˝4¯ë≥ÌÌm∂fˆûÚ[x–O;W;9hŸ<›dW,é6Ÿ»Sæ¬ŒºpŒ7Ÿ≤ﬁi¬á| _ñŸı
KáÓœCÓ?ãìäjPé]wÛnR5túF'KÊºbö«ﬁ◊¶)!¡öÏÉA>çæ1â~±ﬂ˛ñÔµ¡¬Î.å·a'‰I÷Y>ÙíÊÄ!åŸîGqä`<Ù¶3 ÿq/Ã êì˛r˜+µíÏ∫F«_;≥0Ä£√xöz©l‡ÊO7ˇú>X≥7ÍZBb'Ì2zƒëG?§∫•<HaÖ Ó’k©÷qÊ]Ü±Áo≤W|'˛ñ8'+pz/ü¿ä^]pZ≥å]’ézsö“+h°≤mæ>}Ì“ÿ™kn{ ¬xËÖ{^∆≥` Ob®—©*O]uŸ&ãÊaËûêΩÔ˘|‘ã”Qú¿ê¨AÍ„|úÔ†πÀ˛(âß˙)3÷¸ä˘^Ê≠0û$–ÊuÅyÊ3o‡•\‘^>„ëÔ•À›˛|Â·Ïã!u˚A‘Y¸ÂÏ±€Ωt∫’õNßMC8‘Ø	⁄ﬂΩ∏˘◊òç‚ÄÕ‚4Ω˘ÛYÍÖg ö∏úz Æõ û‘Rä–+àÜ˜@:v≤π?zbøêÜL‚&üB;»HB¯5·–Ï£ö√Ay⁄ô%¸O3˛ÌOΩYgVúmy¨``EÜ·‹ÁPæ¯˘1`≥ØdA˘[’c¨ﬂÔœVÚ_j´√OkŒÅ≠Wtâ–63ﬂk˝(± ;ˆ© J3è|>
"ÓÀN¥™ylØª
,äù˛ÕBﬂ”~»£q6¡ˆp≈/Ωxr„ƒØa<¯¬N«æ´D’:§¡€„‚ t"~Œé9¿©˝˙0ˆπVQGÚq¥óxcXΩÑàáëm≤¸Ÿ>˛&dçÌ≥‡å„ª_îÏ{Ù ˜D2 •÷˜#ﬂjû-_ÁV¥∏¬‚3..UÀ'dåqçNÂ±éâ†%¨≈∂¸íˆak}ÁÕDöÛôËäÚfìp‡é„∏/8]√`ä–(∫
ÁpÙŒºèu∞UX8≥ CÒ\/œë£#v∏ç1P5∆ë—PL^W:NÈX4
nÁÂ´Ω˝W≈Åƒ"ÊH–Æ|∑Y∑≤V˜©y∫à≥˘èbµÙ°ÕóåTã&∫ÏÅÏÙX-òB#5¸ô^^≈∂q8à»âïò©Ce∂¸‡åC¿Æ»Tn/Mz_~ŒF!ø`A∆ßioà¸%0–¿y£K˘sÈâ¬+[Ø¯(·Èd˜\oƒã`g3ﬁKgAƒ2~ëıf	<I.{è◊÷ñÿ™®æµ
}„W˝Ñ»]@nπ$oosä«Ô`wê0Ë8Y‘ ≥m#¿Ü-íµ`µógIÏœ≥¯≈>ûÛe‚”âÌÀ'i±¢O?p|‰˙Q|\`è!“Ÿ#⁄ŸâT¥ìu˚cûù ≠TƒVYg}mmç˝é}ûˇ∑Ò®k—j{kõm[ôøCéäV∑r9‡·8W|zÃΩd8ÈºO;›~?èœy≤Tø£üm™“µ˚PF wzŸpÇûï%ëe´·‚8ävÆ Kkã y˚Xhµ‡tÇ~ç◊∑*õïc.∆àFu"W*çÅuÄXº∫X"x˚ı•Äﬁr◊$˙ûAıo< ◊nÌ´Ízy°u£PEKΩºîÇ∏—-á1´ÌÃt@T≤@._àΩ +·•√e¿ö‘Î&Î·_´∆‰Ç{s@Æ∆V∂Àµé<ºúµ¶pÇtäVj1c:ÛÜºwŸ˚Ç)Ù»m‰˘Ù˜«8û¬ﬂﬁóèô?Oºd$¬u
Q⁄çÜ≈ˇz@&Y:›§ÔI|ûc⁄œŒ9èùÅâ«ﬁ¨˜àpÅíﬁ@}9ü@°’ı56ÙËYt¨˝ƒ'ì}$Ñû/B6ı7ÈÎ|≈Q÷ÑﬁΩ¿ﬁ‘:ú(`ŒÜÄ‡9í^å'8¢˘XÍ!úO›¿—n,ô¿1<˜.yíñ∆°»ƒ#$(|n_ml\¡`H¶»,#zø˘SlŒiu≤aÕrVj¸Ì˙⁄Ï‚]>—ãTõ‹Í£59Î8ÙµÂì= Îdlöı÷óûÏê^âJB»T¶']Ag(∫G¿rí¨é\Ã&Aö›¸%	Ü12∏≥êgÒ÷ÍLﬂ±UsÀú†S^dMÁâ7≥ñªπ˛`,·±ßT%1
 ~/≥Yo≠ˇ∏º£WoÌ'ÿ¸M∂¸√‹Ûìd«–¸ùz ãm2Ä‡ øI‡X^ØT∂B§Zk‰pæ|&⁄ŸÖµüFÈ√∫VHô®µÚ\˛ñ#Å_'1ÏgπÖw$
í`ÿ)∑æ5ògYï_0ˆû_n_ùŒπvΩç£]8SÔ∑Ø:J®xsíOŒ$üäíù≥n±ßW√»1(¸T@Àzˇ1õ &õ]Ù6‡´⁄ﬁ©/éƒ€/Ò†hX†‚@∞·<∫⁄õ≈Å $6kX*J¬Ç^.9ˆ?gr™Ñçi∫OŸ £∆,äÒ§!¢€/)lR	jÊ%0#ÎOêﬁ,û-π∫v≠g	¢Ò≥£»ê®h]†¢-Ë92xÊ¿˜%¶éBíóû¿ÜÑ]o≠baG€[´dJØ∫÷‡lt¿ ':·∞>@ xV∞~j¸èÆ.}ê¬â4ÚQ÷{»≤ cuÉâ’•%ø§⁄
?,ÿwΩõ öÕ≥Ú$I;±}•1°éÖá# RÕ u∏:/ã`Ω∏©Rs¥0Â@‹<Ÿ^˙zû¢vsË˘ADƒíµ1¬¶Ï√Œ{è7Dà!Tõ%∏Äï—Ë¶6ºMc)5ä3äÅ£ﬁ4à”ã‚àÀG≤c]~≤Á`Ìá`Ñ¬Œ™hÏÒøˆ⁄Vo∑∂¶
YY+ºÿ‚
U±≤∑Z?iôÀiÉˆV<C,&◊jIê˚%}J0ù==˘6NHm!¯œ≠UQΩ°U)p46ÀôE=wªÄkhõ≠ßN“T¶;/5éªS…~/_6≈É“VgAÍ U™æõ@}§C¨3ıÑ‡"Ò*DÄ âª‘ÙZ≈Pt«_Eπ ´ yÅO¬”B0ÿ|ÇÊî!È—"¿VΩn[¿q∆ÁØg ¢˚¬√Ô
•?$í¥)KÏ≈ÁQE{¡⁄líΩÀ6ir—∞∂ w¨´V:ñ¶•z{ùºŒR€˚˛ê @€◊ú[±∏òFÊ≈jôgY›X3ï^∆EAù¡¥ÿ›ö}	LÏ˛óˇ˝ˇ¯vß8p¿=˘+⁄æó√yàW‡EÖ:si´Õî∑Åƒ•=-qæ[e∆¶ƒ52î≈J<^√}˘ qiﬁ<V±U[_”‡/•”%Ê©7πø]jS\@_[HW'Ú\èu±‘bH„óì%!•Z*G˘&˝⁄≈ó‚º¡ù≤Cº+/√Í◊nÊ≤FP±Ëï˚∂§ÊäÖ]ª§î aë3ZuîZˇÆ›EuzË%éït≥È[”Ö◊b•”Q±÷TX¨3›ñó≤ôºÂ\“œº¿6∫¥ÜÓ ¡›	æ?˛a‚õI≈é’∑˜¡Ω˙2LØ¸!]b¶“F–çL^k/Úwa…`V∞,DäÉæ\£R'Rÿœ`ü‡P°0NyöÌ“\Î◊Ü¿˛?Æã+?ıæá⁄ñÊ∆®¡ˇP5òˆ6PÆ,~>B˝UÒÛã|ÛÒ1ÈÅl .Å~OÜzåT›†ïµ[Rˆ¬KîX®TJ[H:ŸFVÂãöR)ª}eﬂˆ˜ù6w9]⁄Uu±XÓ
◊<û˘¿)Q¶÷∂À1õ¸lnkƒ∞™aEÉ÷∏Ütè«!ß~˚*”~q«jôÂw¬–ÆÚúÁô]œFP∆⁄îdƒ-ÑÃóp≤CÔ“ÇùíR˝©#xo+∂eªT¯z·Ï,ﬁdõvÁW=Öâ∫Oæ– ZøB…où ßUù<Dà£0>Ô]Ùºy3q7÷Ká	‡çÍ"»‘ÿ\\Õôº*„i:8è≤‚R„Œéç4≈¯™‘≠q!b~jTû¯?eH∫‹ú¯^ß˙L”Ç¥P~≤•tí—{†n’D”EuâÔ∂Z–ñ:Pqq≠Õ[ﬂòF}(s®á™%ç«k%1∑ï∫‘©/u+LôiÄ*ÁÒÓ8sœsk€ñ4.òX‹èKÿÆ	–9±	_¿,≠¥Y•|Qr˘´§6Œßm, R˜˙…≠k`úqòÆ©U*lY◊>7◊Êzïr∫TËËÆé≥ΩHÍ\≥'lÕD{b\ÓlM©È‹ﬂÄs{;aUWÇª;·ÉÕ#Qbh´.5Ã{Î§îu‚-ÿ\X\4q¡õEiÚdÌêÊ,‡™Á◊MÓqÉÖcÉôƒ%{X¶M˜º¡ÚrﬁuïVf-àòH€©¿øŒYçŸmå
é.Á‡LU¡ƒK;yÔ›Î&Ó≠|;RÜ‚{\^y‡Iµ·8ÚÄ@Ë°2•7ñãôv	5&`àßœ∆¿/Ÿeo}≠|˘DΩ…ã~q ≠9÷«ycQs≥àÒ≥í·óΩÌ>ÀH°ºEµÄk@-ﬁ"øäœŸÄkAmy= ≠ﬁ‡Â´™  •Õß
z√≤ÿÇXjû‚´m´Ë5Õ8Â?Î4Sæñ7$Kño©–X÷©rÈÑ9¨j/¶âp:O§;	Ú!I˛ÇâÚ$¡!°GFçKÕ	—•ùÕM∏∑VE›'ñ¬vìl\ÍADÕÆLèJeâyT;Z,IûàÀOtâo∞≤_rﬂ‡X ˝«Çô4˘hd!ùËè¨ ⁄XÔX˜DnÊZ›¥≥ÏrÜ®9åA|±ƒË"Äö^;Øs´~ø_4∞Rvø2ﬁ[û‰dï_Àëìï°b?‡EÓﬁ‚Ùùv¡éYª/Í¥Ïøf)··êãIúïà&h˜úÔÍ⁄MwÂD\Ò˘Gﬁ»◊{{∏ÂaÊæ≠øªÌïés÷ïˇµ-ÏËc€âΩò >gÜ¨ˆ˘ZK+ V∆hwd?!>U∞WV‘NΩ©æÀÚzü §¸r_ÒkÂø)8 3WY‰á|$‡¥Pµ ïLÖπˆ¸Œ±n…ŸË◊ÜtÕ	ﬁÁZÆ´÷ô‘˝Æ~I˜f6ÚÛ{Ë;¡ª0’†›
˚4Ò˚ÍK∑Œ9V 	'ä.π}ﬁÜ^ >M¸¸°XŸ†’(Ãı¨Ö`¢D Q°a≥Ã°≥œÌŒº$¢l{i<â”l…°Œv≥ˇO‘EsÂΩÍ·√¨ä™[@ñóÓµmx†˚∂ªpk©4>9Fü›»GÛJ48)¸Àú…ø+mb≈¢î/´le …fö@gÍ~ı:¡≠Æ≤^Ø«é˜ON^|så?>„≥8…‰Â 1œ2òZ
ç¡°B◊§+$®Î€çßÄ¨.Wÿ<E'L<äÊ4>ß/ÏüÑ√7ï‹d;≥Ÿk¨"û¬YT∑;¢À∑‚∫Ïƒ¨æúÎÙ Î≈;ÀﬂÄ\.Î~.o√xøNB™ı\|7Íò£{⁄óÂ•ß÷WfCœ—è#oä~ÈçIˇ|9á'Öì©÷ƒûóºœ[¿ã4êHaMj‚8ˇi4≤‚¿ñ°ïe #Ôó´öÀgtÄ8ˇGﬂ$†>√¨M¡œ≠oOü”ª˝êOaëú-‡n‡3·ãÀ<ehíÌ•¨spƒ˛!H€¿ù≈]4‰ä_åÊêŒóƒÄÏ—E$fû?"6ã„¢≠%‡ÃaF»`'¿a•‹®G∆™¡Óø}˜§Ûˆ]>ºCÕ"
 *¥ßåÜ¡æub@Êl'óÌΩYax©Íe0@ûªeEåáN–ı5Í¬áú¡7·≤ïèÛpˇ≈Î”Éì˝√„”Ω˝g;Øüü†''ùLÈä·{Èd{âØπcÏÂœîÜ,<L¶Z±gÛ(ŸÓ´Cªòêje1j©]ˆCw'Ÿ{√æIn˛à+PÍ◊bòÈ≈’ÚîääÄ,È©à3†◊êo/ÓãóˆÄ–LùÃK¥j%ø'ªV‚Éhü&ﬁHÔ z´
Â)MScN¯ÃU:ï®Q◊Ãh¯ùvû·LÃIg9&Ë<Ãê)ö®·+v§©M‡2‚êÎyç`["¿¶$â¶˝¿_)™£˘Ü Ë:«#|˝¨Qâáã#¨Csö«÷C±‡—˛hÑ—3J1cêd<ÌÈ4+Æä¶É¢˜åÁ¿c„ÊÒ8ñq¶ß‚%<Â?`I¢ ßªc!§Á%÷ôzó~C—Ø6õ ì“QB42•∆&¬7hÕ#≥-¬é¿xÒ/—Kt±à˝PªêÏjVÄñæÒåﬁ$ıë^H:IŸ0ÓÖ{JÉ~z¨Càá…qPƒÊãBü∫!‡Æ3o:Ä⁄Ñ°n˛T\¨…¿/PçúÀÌ¢C3h~e5¯È±jQôDä.Ñi1Öt£i◊»»»jw€Å2’Ω¸ÉºRÌO©π∂Á°Ë÷Ä˝˙÷ãÅÆ†t°FÛ.Ø ò))ÈzÖΩ5ÄÙ]◊©hﬂ …qX AÇÆöB’ÿg`>K1÷H·°Ø Sá{eÖ°Ì¯&”ñ|-¬ﬂ¯ß^∂Y∏-£á˚¡ÒÀcÇãNWîÖ5¡¯RXÿﬁL†Vu‰ÙS•)Pàú6ëpÙ(R:—/¢¨<¿L^Bv·p§f7ëó;´zÛKˆ˛≤ûm∂√Í?"%(ÍZö©iÁÑ' #–·î¸Wÿ∑pÄct|]ò≈påWòº2Ë{ô=‰¶b
Z= âMê∆BÒãa8«Î'‡K$<	L~äa~∆»∑`$Í*Aæá∆9
N`ÒrXÖÒùûÏ|]…õP$ç⁄ôS±…„DML´Òm·Êòr ª‡ï»*´†’íÎ¬VŸëYsêb±`Z%≈î ∆˘í`C˘‘¡Á–ä[åN‚‚t∏⁄}¯¯ÏÊœ~5_‰`àƒÃ?+ ≥8ôÖ=≤ü.ÃOÿ€~n¬õ∆Pïü/ŒSçhlÖÒ¸cp0Î”{Ê.¨.*8´T¡eX/*8ı∑;˛x@	>Ôá˛ó“˝∞F7ıúÄQÙgg, ÿde¸sﬂ|Åπ ?'k@Ñ\íÏú3“€≤∑√Bbõ·ÒƒC5ÜStØTh4éÅ∏¬40RÃH ùÂ$ÂS˘ó”Äï†"
ót€Ó∞Ç§S(Hñª+Ï|¬ﬁY“W¸,~œ	mo√ˇbÈçÁQ:`,•Ë8Úf∞tYÁá÷I·áÅ $nëΩ‡¯°Dﬂèá¯⁄)ıÈî¬IÛ˚àÇ`©Æï˜t~‰(Æõí[µäJ%åâáä%¡€P8PbÆ·˙!À†ª÷B£∞Xg»¸L…Éˆ{è¡ÓL@⁄ÇÜú°n—48èÄëí}zÏË’À£W;‘ªG°hae1Ü"†Ò8ú÷B6åüd(Ùæ{Ö÷
ui@\Z\tÉaqá å@“√6TêﬂÑ«d_ƒRRiÄ¨≥•3‰Æ»ü_Lu)Sî—x·…ÿÑ(>áı/‚rôQîÑ7q`π˝]é•) õ	é@g∞U-åQ⁄Ω4;Ê<⁄…P≥ö¢ö5àÃ∞G[∏12 Ü˝“Ç.· Ï∞TZå$≥ÒÅ´Òûu…,Ô9 Á}ótÜ17Œå≈$2ùÇNk∞  »>
 W˝¿wÑHÆäZªl@l	Ì¢@oÿ·)€a3<"o0@ÀTû¬
 x†S∆ç`Ü9†++jmñ\ÊáXt-¸^<Ï¯¯œ¿+,ü@ë|éCrj+WÄcë!ˆﬁÒ9U'ıh\S˚J\˛T°rR‡#róÖ&|à÷†◊*<fÒŒŸ˜E‡!u|c•mfSèÓbeÑT8JCxˇÕ—±8Z∞E0&@hæµF0BpID√∏†		êL1j : ©±ÑjıÊO8ª(&	-"T1ÊÒ
S&–LsLö@„})Z¬Ê†∂Q √A*l@Aê,‹õöZG»àovf≥~ñ^†¢zéV’)åül›®y…m'Pö—=√ê¢u—*úãWÆ70Ú˙e+™âv∞_’{Q©{ ñe_Ö≠Üô…ãÔÒ(@'˘·@é◊Ä: ®,ÓlÑRyX,G*p]<W¸GÂ¢“æ≠∞ı«R.NèõãQ◊CûÔ‰fÕXÀÌôU%c·Ω”)›rùŒÒnè~„]˛\L‚“}~ß'≈,≥\a-jl^ÔøÙ
jVyÛó§cL¿a Úë∆ …Àˆ˚ÚM'øTËa0U ÿ5ºõ…∆ÄNád/Å@|≈dº‹Âﬂ-Àà©áó&Û∞$ÛH‡±ViE∞V≠KáI0∞Ê^ÔjØ>çœ¯Æ≠5zπ+
Ë z∏rœÇê+èH¯¶ºA/(‘o˘qEôPú2„≤≥Ñ¿∞`˚πµ˛NüˆﬂÆΩ”"z‚Cì“·c|* <a_¨	æd„ëÎ‹.Ô∞`
«pä±∞á]4ùt>Ω˘„pbX˝oøÓ”›7⁄"–q«çÅê◊DAë\3÷§E“∏ÚÌ»%p`:m`Úu*Ùôü1D`G	ﬁ`Òp3ib–‰ÑGÀ8£Ë·´ê÷q”^—É‚Ï0Y Ry#≤Òé|?Å/5¬=óÍÈu[ßT ˇÏ§{8≥Wœi
π€b]á‰êM…uRé-OôÖC( àâFæ≤P’á	÷ç¢5co≈êﬂm™≠+^µó¶€ ”Ü∏úM0˝–ﬂ:VÆ[Fî0P8ÏiùçÈUâ˙ô¡Åc8c‘sgyÈ(2∂=n«Ê2E‚/ênq‰jÇ‚S’¸(9iüvêt,˝ôƒ‘í˚÷pô∞x&æéxñ€:JiÃ#ﬁØË±@ƒ#”ne9∑9ÿÕ°÷·Ë‡ÔYÁXÇ4D√$éHÎÄ¸H¯3úøH«Úv\¸-øzV˙ZÓ…*{r9„Zy¸iöìg#¬Ø√hˆ=}zÑÙ-ÉIç‡‘“/‰≤ªﬁÚìéˆ√ÍÒkÒQ0º$•ˆ®~¥ªAñW¬ÔfÈcÄUàQ©G/züwﬂk˙ê∫Â‡B◊(zdQiÁ˘Û”£ù8‹qrz∏ÚÌÀΩc˚í°P¿/KÈÔ◊é—∫tı»æ ¨·≈ß√ÿ¬LØ∞/HÄT±õ‹¸Do›u}>®¨∫wÛ”¿QìLïG<· Í◊=Ú˘ÕßV≠AåA[µ‚_ã%ìòJ[˙êŸÕÒa˘÷ÉGdßw‰]"—<‰Ÿ$f˙ŸæÎçC(°#+˜E_˝ÚÚZãˆŒ.Âa;^‘—[—!∫q>„\4≤k<≤Øp†‡4l?≈ ”Oæb#ŒAf˜'ûâÎZm-˘	»6§ÙﬂdÎH0:ß+,Ë*µõ—t¿˛Ü≠Ø-Ø°û¸3ÈŒ-«OÀ#«*“$ˆ œçÖX+Øß±«∆#ÁÊòÌåVº[J?~†(Ω∂l„Â©∫‘ZO¡ÒñVö[ÿ/ö‰ŒS€Åá˚ªW–∏œ5$+Õú˛0Ò≤‘õÕƒnôœjêå¨}ÄÀ˝TØû?lÆˇÃÚAø◊´´gÕµ˜áÎUÈAsΩcXΩ˛n—[æ“ZáÚY#:ñÂupO™†·£»§øªù‹©nıÙ´∑úÀãº‡‚Ù=ø‘LR≠bH≤ç¢ßh®OÂ-2¨W‘®Æ®<(úF2[Åm´û;ÇY4ÑÓ®T»§»FÁ@áã!‡ó´U'6Ô8Ó:%A8ùâíßSQ¥∏Û¨(†á}xZ[‰É†≈^;/Íûb˛ñS@≥⁄®Ì7Wµ
tóÍŒìÜ	:∞"ÈÅû7L|‹=ç‚dﬂN:ùëTVëÃoÙv‘◊Iû∆Qø†_i≤Ü‹Oì¢uÓå ô√¢Ôÿ”ßÇPiÉ∏÷ÅÀAô:/hçƒ∂–Ê+r:E∫ßk&òZ®_Ó™xxz.übΩ›óáG;/˛·t˜Âãìù›ìæzÁl.'f{ÅzÏj0ÈlQQ≥¡ë|ÍjOΩs6G√lã$WCÙ¬Ÿ
≥¢æé6π{ ííXcëOù√ëÔ
ÌÅ`ÒÑ∫P^;Îÿ”¨!*XÊ †˝3NO©˘~qJ@sëï†àØ``yâ˘QïT‹ ∏âÉëì.œÅ¯]¿ÔÙL7ô“Ìe@©⁄(w¿ƒ}ÔJ…Œ4[£ø ºñN≈·‘#ÓÒ‡¬ aÈ1¿≈"˝◊ÃKﬁu‚°Ÿ^Ê˘^;ç°µJö›HYq¯3®∫*àÏ&sKvMvµÌVjl◊m¥Xm‘W÷ÆÍ∆0◊ ãï30.áπ‚#Õ£g—ÒR»˛2πÇy„¡S·¶9“ªÉ…n≤Q∑Ê¯ô]◊€JÂ¸ÿ‡nsWõÃ˜Ûín¶cìπƒÎO‚TXWôıG#Û.ƒ…
ÖSıπh4⁄˙∞õO>ÍéÜ˘A∆ic°\|tÄìr‡&ìÍ`˚	àÍ-)ÄÛ∂H•t•m1
ÛË-©eç.P†Q˜˙À‘|Ñ]∆—¡ﬂﬂTsﬂ£°ªÉ_Ñ¥v†õã£∏eäÇÄmÈiS=…un•¢πÏìó-4l•¬J∞…ÀÊ⁄¥RQ]ÚrBoV*Ñ≤I^ÜtdÂv§ÃQ4•îbÌ|úp.2ë¥Aç™ ÊÙ˚œ7ƒÿ	x…Ì°.Lﬁ¸ÂÇl*RØ¶KrØ	çÖπÂ9*∆Ù±	á<%Ó√∑∫ »ï˝–ã–$ ŸRQzM4	L1¯È4_´_Üä_:ƒóÓAÊ
¶sÙPÚÒΩÙ©8∂üe 	EÌ	~£≥ö˚fÔä8–ËC~Ì>–ØWÄ5ÅYbS‚R•¯ÌbŸ¿Àlä˚ù!oI¸¨—˙ä:ÖÇzø¯›XÎ»K”Û8ÒµäÍQc›W áZ=¸i^Ñí_7]uéÒ&,ì◊ûûlıkË}Cœ(Ó«â∞M·i0é∏¯£O≥z#¸ãΩò.MÛ¶ £;Ò©6:¸YuØıŒ±.˛ô’Ä|≤@;d!Æ∑!ü,–ÜQÿ5Í≠ïﬁÌñﬁ>È\]∑?î&Uû;ä?hπ EË%Y±G¨ßıótÄì±áú_øk†K÷* ˙Öˆ†πû“/ÃgÕµs†~Q¸˛òP˝Y≠„É©$™ıøí¶›¿‘xWR#™,À‰5‰ÕƒªWÒπR'>N≈ñ{é ®îF˘üAÄqh7e∞à)fIMDTâ(fœÇÑ£ı´Ã£îùg‰ÈÕéu}a»—–M‘!ríTyãõ≠ú∞∞òZ∆öbÇ¶<!Àº‹:4ßS‰etGFÀrö}Mà.;¸H‘¥'1∆rwπ
≈]Mæ£Ìµ6:TêÎs˝†˚Dµ¡ SÿßŒ2J`§Õı0Øf•∑lÁôπ°∏_}-:A¯uœ∞–O3[XY≠f”C7ï;SRÁk§Ù”∆ › jzhi´∏Í`é¶±aE¡™Rˇ[ã Zô•4–BY7ŸßÁbÉäqdÀhÆé6ﬁÄq¶3·ﬁ£Ñó*rWìUë›|?9R•Û!˙å<p1ÙUº|¡ü€riä˘~êÊπàùÁx»RÒågg.3∏»Œ\øm1yExßﬂ:ï¯Ax?ì_çªgÉÑB	¸ë.g‚J›d“d$#V∏å`p«≤C|.851@ò¿àÿcÛa{~_ÏºdtMh∂ËøˆÔˇ¸_UÎÈÕ_Ñ;Ÿ˜ Å›¸$IF'û£ÆΩ÷ v±Ìà‹}Ñß∆C„'ùÒ$éàÙ†ΩoŒá≥‘≥Ñ'“c	…E©â]ê;˛îΩ5¢…ËCzt!=H‰à˝cÜÙ1ÇÓ1uﬁ…^7ÔΩ◊w›‘vπX)˘Äm¡p†E-–Éò¡åPF®Ä"¿;{0íÔ.#–`‰"œQb≠q∆Ö]Bt√D¨Âäïíèº´”ãv| ÑÙ}Æè…€:ä—±Z’;î˘ú{æQ≥rÔR^û†°∂,ãèw2ÿã	iˇÂS2$îΩ3˜ÉXÄUi∫%÷&>µü·‹«x´?ÚÊaÊ™B0lù‡öõ‚≥µˆ+1Ω&.W£yR√—s≤8N=dRy∏lE˙Ÿ—YCÑì öÏa^∏íàÓjÖô]‘É1°Ê’DuÌù‘~È2πˆ©é)x”µé¬´™^˛Øw@j”õ¿]QÂHX—ﬁiHI!)∂\Dû∆ºC)Óñ ì¢
*ôV+ÿH<uÚ)Ìåm{›ƒ≤˜Ω¿§ı‰D¯Ω«8õOŸÎ◊{®aC\ﬁQ‘‰{Ooõ_`l'Ω1ÿÀ‹À]°’uf“ãô‚—O7≈!P˚X∏à∆Ct,÷˚àÔ·F”0ëò!ïQ√À«%ÚkÙ≈ßü®°Úå…zÔ——ë≤´–CÃb∂Ñ∞Ÿ[ˇ¸K˘YÍ"Y´üœz˜–;¿òU–:N'íûäËzÈ˝»Ñrk’‚6∆à°!ëk&‡˚|·†AÀC¬*3}L÷@{Å0qÉÆ¬≈¿ÈÎ9[∂˙øæ]Î}ÈıFÔÆæ∏ÓÂﬂµ¯ææq˝õ’†kïYË@±¨&—‡Ü^2Üı⁄ï2ıRÓdÑ¿ô |E√yHõÄ€îqÄ©–ÍsñxÉò‰rû.Èt8=Z:iëZÕ	!0!Ô ‡Ú¡‚d‰_
›h-#X—{H…{V&õÚ’îcMÕâ!N1I™ëL¥›Ë o„shÛ,h'f£((\Ò3`u∫…◊∂ù⁄gŒ∆∞¶æ'é^Ñπ¥„Æ±ÈbøQN÷Z†˙nôÔ§£_aô§pΩ@hœÁ
”pèéÙ÷Ã◊¨Í~E€U∫_¡C”1k2Zˆ*ºéü
ÏM’u”¯0PßêIÌWã‹fàœµP‡ê‚∆\ïØ¥r%úã]ÿﬁ‘+Ô~Z◊∆õ˝ƒuÖeØës≈ÌBA$.∏ K^±ö»Ü¨o<|Ù¯ÛÂ}a	Ï∂•V†¸‹≤$†ˆì¸ﬁ«|˙ïµz&∞ó÷î±)¸Ã¬í3ÔR⁄Xˇ"Xå =%LØ:‚4kÊGN1RN÷ä#9ıY¡Ï¢5à‚FU·≤>]´¶Ì"›¥V‚$XQDZQW‘Ú0_õ»PPNó…r„U≤¶ìXNòÜ*JÑT€ﬁ⁄€O'.πÕ¿ËÙÀÅïÓe•ª‹ıb˚Ã¸´€£¬fë±*»SJãWò>(Ã-EäÓÓx€{Y	â®&™πä≠Æ§è˙ˆë;tâM»∞R°T!®i◊7ÿ…˝b∆içy 0ÚŒ0‡∞\<Nî≈Ñ„Ò¢[±…uòe„â UÏå8àLª®±éÂWFE‚±ÚÀ)à∂Ÿ[Ö£ä´õwf_H√§®ÿ∂∫ŒAï8öÍπ*≈‰£/°¨B⁄<≈ÿ}u∏Ç‹ù«<Xı¢Tœ›¥«[„jÓÉ∏ùNIytOÍ#˜¬+ΩÃvÆñπ[≈L{’Ã])g»S~”ƒáp‚ÛiERk*∂<-⁄≠Eêó'òK9⁄†¯&Å†≤[fˇ1‡zÎçc§7>¢˜ÄôH PÌ”û”ËÂ‹(R†˛‡¢À”æI\ªπæV∆#õ"»©*∂âà˚®Ú¡kIMgì`à‚j	Ñ«MüÃe"≠y©r5F˚Çπã§Dòí ìGÅê˘∂ëE–h9î#Aﬁ-k›»V€,µuıN<µuAﬁí©v1‘fzqFz&:gõÁ6‘¬‰˝
ﬁZ_†¸ïd≠uB◊8òÁˆ∏œdón¬4ÎÕúØÆ[›º∏`≠u[ÉbsŒ∫D·l÷ãRî5[ê49nçöïã˜Ω´„ÀùÁ,ºâ˜ãÇ.æN[≠”»¢îÖL(CQ»fÛÕñ<‘lXbÉ¥mrÚHºø{Å±ÁsF4« ƒÏΩ˝Õïù◊Ô(!NÙc„vÒ£åˆ{dÛ*¥◊ˇà$œ|˛‹ó◊ÿ¬`L‹√§”‚?¬—ÇâSÏÙ
·Vh˛ÊèÄDœpÑ
—zËÊß≥<4øNÅÄª˝Ô¥uŸ¥◊ÂÁ]â}TŸ¡Dê÷!	‚â$Aë∏dAÑ6›°ZºÏEO¯à‹‡ÛôËÇD…` ∞ÅdñQTgyŸÒF‹Œ:_Âw≥Œ∑t![æ]\äA%aR ÕåYuá	ß,5∏¸é$ò=Ä<[Çq^å„¡ù7] Ÿ.F7?i±Ø%*âN  0QWME
âZŸ∆áårÈ;G&ﬁ¸w·8UˇYœêg\è0Œ)ú6¿’x1,%ﬁkáÕ#q≈¬¸n?ühæwKøπF◊¿Ä‚w¢ë◊]OΩãnNû≤}∫0óëÛ±Ààô#d^ˇª∫ ôJﬁÀçUÓÙˆ`Æ´:ßw‰b‡⁄Û>¡bG”±ÃMÕJì˙BÿDÄòÑ2Ä&MrIê∞êî¸…bŸãç› °#ùŒaãÿöt´≥ú∆3±;NπÅÎ@2¡˜2¨«Ã–ò…óá¿∏U◊0@ 
Lñ¿<¬À"b'`–æ±∫yD°S˚Ìoa—jt˚iˆ;´bJÍS•)œUH’wî@„ËÑQ¢∫áÅIwåπ	^G‹±†$Ñ3≥80Ó˙å{µÇØ3∞‰ºïûaﬁØoâÕ6Y üó™| ?|π˜˙˘>£?xqprÚE)‘B9ºfV
 w©ûŸ
≥^ÏΩ˘êî^í}KSäTd®X4ŸÌÚy∆…Âr)-»á%Òjó(åu^©r›i¿,Î∫"™UD Ωºúô˙¢V¿≥B@äÅ≈$Fn2ÑìêÔÍ$Ω∆≈¬‡Hé\Óù GV–BŒ–ﬁ[î†C‘5•lµHÜ7DÒëãÄ)∂Ä^Z∑&ìÅàÌd‡d¡íb; ì©IXó7¸L[x9PìAvÓ0A ùY_™≤€ÂÌ~É¨ãXîa~îàH…$7¥=”Y‚hëCYL$={Åê°·ë€¢
fƒ¿[û¿Rß¢û'{T©EÊRú7«ÃÒ“ÃÖ¸~}‰9…$(òV›R¬#!∫à\@¢ œõ?G¡¥‚ıH¿yåÙùCÈAJ≤Ø◊äí;ŒM	#¥L>ò"«-Ïîg‰vR,v∞”et ˘ÖÚå#«HVï'„jÓ˛∏HíBmíõˇk )MïñJπ‚…qÌÄ\áK÷ú&#hÕRÑ°ˇPÿÇá è‚Í$ëßçÎ[˘Ç≈Önô<`Ò@°wˇ‚œC5˙3‡8'Œ©zœA0:√ëÿÈ(¡„Æ/™l`K(;∫s2X
¿Ø¬ˆjûäúôNb·æõ‰É°Á7óA ÷(6ë±ÍW»•ò˜/≈˚?5–ND±ÈÉ0G∆•cØ_)¯2¶íÿÚâóëÁ∆n"M9T„”†cBs‚ô–¶≥å£w-∫ycQúÚ1π√p¯»Â8õ∂Cmh8úSûåxòá›pı,ú2	óX®¸›2)Ú©A£z∞äÂ«‰Æò9DÿhääÑ£–<+ßêiUÓ1„∂¶ âäƒJ(wÓ%@B=-2Èº»N£G"SÕ®ä·r_©æﬂ¿"äKfDfö,HÁZÚö£g+Ï’7à˜…∑ß´Cd≈0Ã´ß|™y8Å7ˆ/]›|ßÔ√°Løí¸0ŒÑ2ótû•yûΩz`_tY·Má	Z—≥õˇÇ/]òH∂M960É∆Õ3ôeÔ,˛Q(—«6ÜÛ uWB%ûë˙Ô“	óﬂLƒ¡£8éá7HÇDòE‡Â÷<w[C:Auà|Å,‚‚•0N-•ìWTö':ãHπqÿ.yñ!2Á†XOïJtH#+LôÒÑ$AF"	·%≤)‘ë‡Nt‰(ı¶âJˇÁ8úyëπLç*πÜ\£ãQñÚ|ÖjE+wÁ¿¡§{SbW‘0ƒ.¨0Ô˚9ù÷B˚•ò∫‘x™	πX1U~L4∞-?8”≥ﬁß3†¯ΩÀﬁ -SLlú…»ÛÈÔèq<ÖøΩ/3p%“·ﬁ„µµ%ï~ÎX8„}+ÇºÁ≤{d!¥m˚};,Ö“˘@ñ€¡Ÿ	æÄ„Te†-ÛZmyi≤}µ%íŸ3 Ïh˚
âÒ5Z–Ñ¡˝ˆUaê˝‰XíúÃ˝xkUTz¢¥´˘å¨Â'Åœø`∆¥∑Œ¬ÒfÒÛ{≥ﬁz± –¿7X©±ﬁÃ¨∑∆ M'£0>ÔMPõÙFA∆‰´◊;ü¿vØ>÷B z+ì“Ø uÀ#”‚/J4˙\$≈ﬂÄ•A˙A¡ãnõl∂p˘µTUn+,i’◊ﬁ˝|∂¸éº˝: Fä¿â˙8`V±»ÊS∆ﬁÛÀÌ+®s]zìoAÓ*R!ùxÍ‰⁄ÆP¨÷’0Íÿo[:ÔçÚëa/‰£åÕzüã_o◊◊fÔÿ0Co¬|ÿ|Ü¡èP˘Ñî˙=´ΩÛ ŒVæﬁk·≈®¬Ω0\Z)MHÄMÄîu0	ˆî-∆=J ê\‚…„I1òBÔK8(lì-—#—Õ£56A0ÿÑZ™cÒ†(¥dwl/’ì“»h¨[;fÓjMm≠ÊÄ⁄º Ú Ì=¿QÔ!Cxg
k¿◊Z 6óLB3*7m¯™¬JKÂŸVï˝‹QãOÍ•i°/B	,qË≥bÈ`…0A‹0\ ”“+Ãâ«é`´=z∂µ:yË@=JŸ ‚ö®®MπKÕÿ^z#9¿î«K.©[„7^8á÷øÏ?Ío∞}e .aÃ@∞RqµU{ÿ˙Œt@\ó›¸Ò?ˆ=⁄ËΩzπ∑p”/–ˆmäÏ≠=Ù+WÏÃÎñMÔæ8˙œMÌa
Ç™ˆ∂Vaó∞Êx\~÷’ÏòYÍ5‘˝}Ãv°m^5∏œ }¶Ã@ÇKOP8PòˇHÃ/öÇR¥J®
oáÿ^@àOa#•∂3°a
Qõÿ ÖÌæ±KéPû®`5ÇÌjmààC›>Zä·8D©x˙[´≥€úÊuñN7Ì√]±=*´øc¥∞ª4Ôﬂ≠ñ»b√Œ?¨l⁄Ωµ§≤ÿ£«k6·î  ∆Ÿ°Uï;”≠Z*˜»G!ø ‚”¥GÆ‹¥BèÍ¶·h‰º∑Ò0P_œ1¶Ho [í¢ı5ﬂÄú
KÜB∆˘œ`t©~Œ∞â±"„∞È$	¢˜ΩµÜQ‚ÜÜ*Ω0.¶4±`:fi2‹.*^3/Ã∂óhπÈ8,ô3'.h"˛ƒÃt‘#›r-U"À‚É—j€åÎ è¡4Ã0á’ˆ’∆◊%`R+⁄™ﬂ*»ñ˝πÒØQƒHxﬁ‰Iÿhﬁú≠ÄHF¬G⁄ry≈G◊√B≥ATœ˘vÅ∞¡ÍÔå-¸˚≤∏åx\NLÆ+;YáØ‰Èè™âô6F!ô4ÔêÃØ® Õ>}`@Kúc˘#Ñ§◊3t5®ﬂ˙(˙æ}ïÊèÙÑN-ö∞‰Ä“≤˜%ïÚåÂ:pBü
§V¡Ù'∂k\¢∆˝Å#Ó^LF:_¿å˝~ürÇI0ù•iÛjÂbicAbˇó@;ñ◊4BØ—Ò£ﬂa»#)ö—lxä îãÎ09k>¶µÔÂÀ&R∏/»˜ßOÂ@%1$„WKì∏ ƒTn∑!ÉXOßÇÇ°˚d…†‡Æ˝bÈ Æ˜œAEéÕ_§	›éÍk˛+†Å¥ø¯:ıËÜ∞à<€9⁄{∂*$øŒÓÜ∂Sıÿ¬ìﬁÏ"G‘U<˘«‘ú†Jø–[±Œ0 "Û_˜ˆ Ñ«®LHA÷&Á iÏ£Ã›&.gÄÂxÇAQƒUZåôÍŸ,W€m˛<ÇæT†Wç@∫¢Pı-+’)>Ô”~G·÷ ™MÍı¸≥Ñju≈I<‘9	SEÆ)‚sCÕ•q“õ≈dK«+D”Snﬂ},Ÿ—å•†ê√VYícH`H®e/ÑÛ5ŒÅs='¶ù‘`†ÙGñ]›ZxõÒ—õ@Ω|s≤ÀﬁÔïä^=X∫^9⁄ øh±`ûùsX≠≈˘≥=ÕZÊX6t|ŒFôœ¡}‘éÀŸ¬ÀcPì≠!ãﬂNßKOÒg≥I@ÿÿá°dÜó$6\˝ˆ∑¿gx˛ò\Ñº Yz≤É”@åıì™’H\b«∫Eß@¬@3µ°w¡˝•'¬Ä1O"4PI„`Œ`àfbhçG¶k∏L+âCQ¬o∫1¬9ﬁK¨‘d2˝ñËc°-•˘u·≠\#‡@\í\˜Ñã·∞\ﬁ(êÿ∫yıà˘Êˇä–ÿ÷ÒºüyòõàÏ>£ï–ò},∞ÍŒ©ë˙Î>∞öÑ∫O ≠âô#¿óŸdby’√YtÛgº#c\°JÃw∆Ö≠IG%l„–±ƒÊÄ€!µˆ´RMµ‚≤?)6[⁄î≥Uˆä“ã¥ƒx]GÓùf>ıáCõ0ÆzvÛˆíD≈:%ÛoºùÉ˜ÖI‰
ÖA¡t'Ë_(&c@Ç1O»¯KfNFì®îåÉÜsô‰÷,˚‘/±Ï’⁄∂≠£Iqí—ø~•Óôï°ÙÜZ§Kf3≥ÃµÆ93r:r}û’)C¨kyeèΩÑ¬ÀêO 0x≤Ω¥±ôJÒTπ*ƒ©=¿ºæ1B^‰guÂÂ˝ÃK∆<ÎS[Ì´¨»o9VUΩy®yR“€éT¯I;∆)s≈¸'¿E\‹x£ÁwêÿÉé’ç#~À∑&ùíN)©∏c‹ç„≈¶öáKâUoΩ® ~◊1æù3!∂?Ù–˘/∫˘◊˝èc_¸û˝˚?ˇIüo~ö“Ø£ù“jÀ¥G-\Âu-ÕB√Är”¶ç*6†FeSß¶t!ÊlW_[◊(kTî÷fRká¶x·ö‚5Å¬»oZ=‰4]]UÏª9HTˇëë•¶˛ìFóU“åaúì™V ﬁâ-éa8πÄ5éãtoUÇ≈]t}ƒB≈Ÿ4Î≠Î 2rzDú<^∞üPÙ£’∞∫¶Ë£Ω7+πìêÔlÿ%CúX—zÚ–BNΩœv¡Ø!EO8ñàºƒMπ´òØ´2.Äå%ÔæIjú˙C``éo˛RäW@˘ÊÛ%vCüø{úUwF[Ó”QJ54W8a5-Ãqq-Qæø0rÉ8>2\ÄH—w∏ˇ‚ıÈ¡…˛·1:Ôº~~“ë/”´†¥OVƒCw´È±Ù˘by-qör_∞ö6ÎÛä.UΩ FÜ∆≤ÔÜK?Ò∆cD¢ı≈‚h
í/ë¶ò8Ã7 ﬂ¯µJùä÷^Çúù_Éq ÿN∆Èiº÷¡6‚Y^øf∑Âß‹CÕ>»EªòZ≥Dèı“3Få0uc	Û‹æÕSa
ÿ0í¡Åê&nG˛ †ãŒåí+–≥G€bÊyY‹¢Éß£¯‡¢Êá  j¿ä ~Ë∑ZAÍtÅ±FÄ«–ÛQÊ∑@’∑òîÜí|a#˝tÑÖ´aÆ∞ıvS”Î“ÑVÿ⁄
£¶€5 ÁçÌ4óøn—¶ÎîjaI´€n8~≠5çÙ©“J1Õ¥_p]%õ•§ñ`v—{ƒföƒÆÅt4ÿ‘0˙ûÌ¢–4ƒ∫ç∫I•|$¥ãÕ>† gA v’[x,[®o†ˇ5i‡∂æIÇŸû†
<îZΩıœ´åjFõÕ⁄ΩírO±Œkl¸º˜X≥Üπ
Õ˛Ü≠_∑—Íπtâ¬ÑCi]å"v‘˝iüd,D/ä∂ÏS‘3Åºà7ä©≠Ë‘ø3¶ﬁ|©{›¬v@Xü¥A‚va8·√˜É¯¢Öab,å‚ì™-Ã)t…´òq´ä%˚7ÃÛ€;ÈåJh?[ar–õ,\Â§(ﬂ¨€∆:ƒœ«L‡Û `i‚^ã%m÷åWaé—d]˜àéècÀ«§¿¿u†Äc(Gv,ÃÉ˛Ω˘ÀÂóC`~‚Ân€£∞Jg°∂Xìºöÿ\WÏOMã.F[P@î”ΩQ{]Èk`7T#Øbr’|æÆª;l“ú≥) ∑˙\UØ\˛;ïØw¬›Ñ€JÒö:˝@[î1ˆ:âì‡G≤Y$GwÂo.›ùsÁ‚7"TB·¿Ω¢º}WrÌ:à„Z∞Åï"
îEè·õ?˚ÙX˙“w´/PÍ‡ÙÌÃ?+ ÓYúL?D∞Öu9=Ÿ˘˙C≈⁄_ñHz§Ø‡ØY*ùï'ä|éÎÒme”#ÔQDuå˚ØRj©ÍØXJu‹ø
™éO√	ˇ´¨j¥˝ˇCYµQNµ∏öMÉ>Y1‘%MVS≠ø
ï5BeëÒ◊,1P„Õr£Q∏Ft‘‰©F…—ıŒqÔVäm≤‡•ØÁÅa√ÉÂ±G8˘¿\∑<‚4á™åCR9ÛZw≈€{]>tx]ä¿≤GÄÚá¡LD› √+.ÊxŸ“YÓj4è"¶ÑbGé∏H•~Ï•ÂáD«Q≥‹Ë2ù>¶4‹FCÎåZàÅã≤åE∞•`¯≤W©fBΩ(´áå±>~:†#…‰Y6,íUèπ√+ïÿÿ"§SMüó/≠7”©¶em&b&¯;|—ÏC/y9†^#˛¶—≠ﬁ‹5üJ›\nÈØ∆ «J€›ˇÌ√<Ú.)„1káGJ>œ ûLzöåB–9.l∫W7$¥‰O}ùõÃ“ˇo¶¨…◊ÍùXÕß'è‹Ä°ìÂÛ
Cπ©0Ÿl'è‚¥Ó-),KÊŸ'1yFûyx{àòu™‚bz"`ÈÕEòJe©v*Üy*]ö'C7ÁQDÈ–c˛pü¬5bvÜ:n«éœ2@E∑Û(œCÄùá9Ë¶ÿ·STwGq61ÜV√Z¡´6Q:’!a6õÿë©>
GA'»i52´˜Ôy∫x+#·‹◊∫+ ¿¢ÏW+Oí2⁄Ÿ@¥≥a£ù∑ˇ··∆`Ë˘ÔÌ4∆T–°™‘‚ΩøK»^¢ùGu&∏Mà∫›≠BıÛ_A8¯˚⁄{ïñ| üqF˘D»—ΩÚ–¡“Z£≠uY∞;Á£Õ∏u4-X£‹–y\¸-ø¨±o>¢e≥f√‘öÇ)cPºL÷≈a'˘ä Vœ1î¯?rèÆîºWy>˚èk!∑§√YÑ˚ˇ|Õé_0„·{†OÅHK@Î÷,ño	n≥yÀ~r9´W”4Ï
÷/ÌL]{Æê&ÎÎÎföûg‚§é‚·<›åÁYD\ÿ~ãGc]Ø≥©Wzƒú_.‚“p6Z≤¯AÕ	`rkUTX®—hˆ}]´ ‰∑iñ«è vÖg»mZVÆ¶ÒY‰6Õ”©çÈ–V/
ùÔù¸|∑Ëò:+5E¥C"àªö©ãÆ[≠◊ÜÎ<:∞A´_¿‡)ÖÄå) 9z¬JÅ˝õ«è1ç+l”…-√ºS"€≈ê'ô»'%)BìYy6Îâ©#®iÃæÊ√Ä‚,Îÿ\ΩÄ£Vè’µÇ∑vΩ˘⁄ãÜ.∑õÛÅΩ_aÙûÜõxiˆ˚}c®P¶aåP‚÷É€%øòS˜b*F∞d´Ñ%Zè†YÖZ1pó∂˙ö“ä:%lpAô‚≈©ë©s´*ˇlÆ<ï]u≠#è≈‹-Æ‰≠åw;o€EÖÇñ
⁄ãöDŸ^0–§¬Z¡vk7¡Ù ≠ªÖ|–†îhêÓVD¿;,ètÿG*›JŒ∫◊ä
ÌdeÄı√-´‚Y…cYf∞≈<+yˇù¥R)–<Ü9üj#B’aòˆñT•ò‡ÜHÒ®IÕqµÛ¸˘È—Œ?Óø89=‹?˘ˆÂﬁ1È¨ßM¶- √g?Åº∑ﬂéºK\óCûMb?Ì—0úÉÑ’i47ic\’RONjÚÊU∂ñ<ã«„ê3êÛÎ¥±öZT[æ‰÷í√.“Åßsÿ«⁄ì/Æ≥÷¶WRüØÆó4Ë95Q6Ë–◊◊¨+©D◊ÀTëô‚”∞ﬁÕ°7Ã√BÜÎh”0ÅjŸßæµÍuzﬁï∫us,Z9ÄL∫ï≠;ª*z¬∏ªxÈÆB!I¥´ç’∫¯raö„É∞[)'M—õ +9úG‚ÊZ›ú∑πõ∏è{Òò:ÕµÊÏZ’˙tX:c∏5‹ùÉ.ˇïΩ´fÔ {,∆€Qçf∆Œ1É5˘ø4∆ÓƒªPìÅ≈í¨’nrÛ∞™qu†G5ò6Ï›H…òıäe–Î¸«.»ˇSÙ<˜bî$c Ü™å/›¸”±‡ıhLîQ¯√¿èõı≈˜√ﬂ=4ÉG>2ŸΩœŸΩaŒ˘?„ºùuçHŸ`Äó0§úy◊öZ@Ìà”hßf’˙‡ñˆ\Í`{2m,µJª£¬Ωµçú¨ïä£g®R5πvBh‘Z≈ÛFÜ—5a-,Ë“åœ∂ó†√eA†ŸæZk1©ÜıGú¡.¿í∂nlZ,ä¥Ûª:åvÃ}Za¶Gh1`ﬁC].Ç≠„Y0(rÆMˇ“ı˘˘Zhác‘®o∞Y¢Úã(H|MHÚntÌ‚sã`tﬁ ç√9Û«q°$œzÎ´¨G"Õ˛íËÃ_E®‰•'ˇÒ.¢”’øØ⁄œ∫$∑d 5Ôè'0P⁄1πˆ˚◊™ÓAÆÄ≤¡zâ ˇªwÛ” Ç;·N™ÿÄÊîB9÷¥<¿ —˜U˜˜M¯ßﬁEÔŒ€Áx‡⁄É◊Ω‚˚!√jÉÛ]m$¬∑%¡˜EÄ"øÌâoK“+	Øœ9≈lK]˛{Âv:˜Ap‰∂âÿ~§∂ì7‚©ª—î¸\kMIS˘OFG¢Z£…Ö[I«n≠i|hŸ‘ïåÍ™“˘∫Æ·J¯úgy~Ë‰FÆ`±^ßp†+¬±-‡LAÂ+2ÀOõ „e˘˝bò¬„≤¯Uπò()∑E¨ß±S¯V´R∆µ‹[
®KÓk÷NíƒÁœ)†yÓi∏˙ÑΩâC4††ÀvèÖà_"ó=ÁòB‡Ò¥Äk£¬;yÈ¸í#ùn“w~Øﬁ¬¯≤-∫‘çúCµÿ<©≈≥.=Ÿë	÷µ”Tœõ∂±Æ¶±L·ÃÃßπ÷
5RËÖÜ['#M—∆ó¢A»x'"Ñ[iØÏ∫rÍ°HÂ0@‰‰V&êUõ€dd›|õ◊.O@È(◊;Â£3L0EE)˜q¸éæçnÒÈ$>ﬂ	yíuæÌPÏqÿ)£¸¶º∫æ´m≥÷sªÆFËs·e≠KíÖÎJ.)‘1«E‘(V‚ ]`µR#Hr
,ô’˛Bà
?µ¸Ã˛%7QïX˛Ñ°ã&≠=FUDÆÏnónÀ-dÓ˚P$˛aËü–“Êó,∆0+u»≥¬Raç˚ÿÂµì©ﬂœﬂ`∞kÌ¬<VﬂéH÷fÁ√öGOÔ\ Ñ4k G∞ˆÁ qucQeÏ†w0æ+ÜﬁI©˜î¬…ÛÔΩ§“‚y–hv#¨ê∑´œgöYôa¥ƒmOÄÒ«¬ïïÏØmi˝\≈[1s’_≈u.Íï&y˚yÂˆÜœe¡—»Ë‘ 1n\«Dç$v	∫Q+2ZÊ√≠°{ña.ö+°Gn6ºµs  ∫Ù‰ÒÖ}ò≥∂¬ˆx2˘¢±ıÒÄ]‡µ∞l∂Ì∞1µ–“ìó ∂?ô!Ã6‘9⁄{”]∏π3¥≥Ù‰ç¸∆ˆ/2Lv¥pSpjÇqÑ÷	{Ú[û[`·∂b9=s¢R?•#∑Ë≤≈»Pz1:∆k	Æ#9ø4t7ˇ'R«	; R¿Ä6Æiì…∂v∞Ö‹®∆“`Ø›ê›≈¥÷Æ!Ù˚)`∑π$„¿˜¬Ã1ƒ:≤›Wá}∂c.L ¸|äV€˝ƒy [ß„ƒõMÇaä)VÃ3ÑÑ¸›˝ ·ôÃÊ∑*&Û¥_3å´˜¥Ø	@dï≥å„HI∆_Ag∆(>ã)îyöâãc≠`<tÅDWHÃ√L{ÑWıË÷hzEˆkr]÷0Áwp+í€G OÚπ¬¢ôÂw€⁄Á≠1õìê˝ŒaÀöΩ1Ô&µSI8:Ô˝ûM‡üÌ—iò√=∂Dx≈Eõ°sØläH:Î≠n…Zôhô˛¿¬Ω~Ïæm)¯)‘Z◊/:ø†I≥l¿{xÛ69À15_ΩòÓÆ∞ô≈\ë¬.¯Œ˜*€EÁa¯ãÏÇ¯Ça	:˙î6@"¿‹π„~”∞≤V6®m≈÷
˜cXo.∑0y⁄sØ¸Æ@◊ ˜ÖΩÍt†◊¥UöhÈ∏¨	ø2êF7t]˝¬í`Ω}Á∆l#-ïüêËáòô‹éŒïvÎv˘÷B`ÂÈ˛.zàŒÎT™πålCeÎ„H™‡‡™ﬂáNkãª∫l¬=ø·dI”IÜfnyﬂWé¡í√ƒ˙“ìôdìè3”0ıO>ï°Æ˚T#Ó'3Åıõá%j![h8[Ÿ ˆ/Îªπ:|π˜˙˘>î=xqprÚÖpúËLcøUºS·@k2Eﬂ	7“çıˇzÉ]À»œ7Ÿ»Sæå$‹êˇƒÚ>0æ˘;v›sRÖEﬂKg–ﬂDõøxƒƒòvìπ_å´e<◊b∂HT1<ôÈ^∆5˝y¶Ë]X¶°ó≈≈ìÉYaoi≠ﬁm≤Úë|–ÆÌ’UvLz% ûHÀñﬁêèÅz¿≤9PµÔÁd	y1˚GTGehÄJ1UVπ`ä–…(PµÀ?À«(;\:Í»)ˆÒI∑]T[µ,}±Ê∞:¥∞_ÂœqxÂßbÚÁ-zjcP∫â∏Ö "+L…fæ}-v•9Dkc#≠ô4X∫*—@›µo◊˙kkc}hÌ˘F‰≈Üı[ã%‰\ZÔ"DGçr’»ÿÒπÍºê¥¬ñ,‡7‹}¸+ˆ{˘ÛRqú∫¬X@ach4mr¬ÎÈkE~=•…Ê.;¥Àë º/©I'8Èv>94å÷—?Èsã†Ù…„Ä>xÄ$B¢ïV±6ÈSòSàÈ?0;∂I'Ω}ãöWÛïªÿ.®òXõH†vZm5õ<ı∆ZÒLñç‚ï±Ò9˜€.sõh¢å8ÜVß†ç•qwBÌ‘#ò*Ô¶ºÉzÊ
‡∫›Û›◊ΩÎíö5FüÜÆg£9ˆV£¢Áæ¥<qïÿ2L¨IAêéï•I—≥∞ñÁ–K0´Öp≠&ªéÜ(ªÍgÔ®%îTä‡Ü∏owå∞)LS8.]„÷≈ ºÇÛˆí‘Ò¬·¶œ≤FZπWÔåñã'ﬁ@Û©Üñ~nØj—e¢k≠ˇbön‡Yÿ|e⁄±™π(ÇÎg¡x”€…à¶ùî´⁄"Vˇ5„(H‹~osfUt˙ÆMßM¸È]{©õvZÖûJ˜^®≈x5MCtÀ@¶¨µYÆ0õæœ#[)ÿ∆Å]çãøêèªàDﬂ¶Y· üª†ÂVu$ŸGN'¯ıµí‡={≈_+◊{â>’vÃhø¸PZ3?dÁ=ÙkŸ®#Ø«l§ÎH2P*5L ∏ön%±ÅsÒ∂˜PwÙ]m∂çÈùö øzS¥ÿRT•!ı(}¯3∏«◊pê∑‰˛Æ\ƒiyßÀ›: ªc¶——‚}_ŒìY»MŒQ<˙p∆Ò·'Ih&@ªáã¡2ÀxÀdg"·∏aT@IºœPıﬂ∑Öw±á>Woõê<¸M¯qMñWÑ!¸6kô]7—YŸŒ5∆5’⁄*ö˝ñÌxíyi˚πÿ≠=πYlï%±?œ‚ZK1ô›jÕÂ˘Ì⁄∑'¬√hGKé◊æ•°J¢ß5î'÷[`ëËŒ√7ö)íÚ-0ôºOçz‘‘»ªˆ2~™‰ñ#ˇla—?Ìu©Ì(∞Öƒ¸," ‡gaq?∑iSµäÂΩ;…?H7µÉπçêC˝∑πhSh—$Ãô¸ÃÂÅ-øœ¥†JBñ™SgOôŸ6i3ò&+µ‹I).iÃM!-ÂY{âE}>éºÑüöŸV˜Öå–B”€"Ω˚0mÔmu^∂õ`^ÂØZ\73˛Ë÷‚Í∂zË$!ÉVÓq®9Ac‘{PÊJü4…ôÀ9CçN ëE1ç&ÂÛ5äëoé…Û>úìë…ß°ŸmTÂ¢;m⁄\xtkmÓŒP4îsE–ÿœ≠–]˛b∫r	ùúèá<‚|‰¬ﬁìN◊D¡Òà~?]µÆ@xì	Ëø#˝Ó'°œ•∏#A•{œ\GX”Ê›Æå{⁄û¢sÕ+6´ˆ∂M–TÀÖ‘CµqÅõπ9S^
∞ä.Ô˘?õl_Qº§F]tõ†™≠vujÌ/¿<æ"ûE¥ŸãÍ≥®Øí&{n≠…nµlüö∫ª“◊˝Ú…_,Œ'◊á≤hK}€Ñ≥®Ó√ö0G3‡úıÑ2•DàfŒò;q$/ }AÅjÿÿı"åﬁôT¬@É¿oN∑E3äΩ’ﬁËx3ﬂü™ƒó˜·Ô¶Ú#'eã[Ì]ÂÈÆx—J≥Hdö™8¬Wsr˙B)∏ 3å>7‹â/5Êá‰œ¸y˚LòMj92JïÄ⁄∫Ø"·bC÷\ƒÇQ†ËÂ@Ál/Q.E_L{Ë•¨#C·sí≠Bç≥Iù'ˆ⁄N∞—µ’-&ˇ›úOQÓ≈‹óË∏KÅBºqúxhÂç‚s»éVDÇâpÇ~°@R…ıM§IÒfI|PpBL`Ñd5é0.p⁄”8£ú §çaê~ê$ÕÚpQ÷⁄ëÌÏZEÿ¶⁄*)fÚ‡è&Û©óáLAë}{SvÛoaL·2AÑ∑@Môò*≠6Æ€•pv≠
¸iKìÂ"nrj€v7{∆í^¨U@º«VB∑G :wÆme:^^&X˛ﬁyØﬁO€l¿πˇ.ÏLb⁄G$˘¬kï©∏∂è2É˙}p¥…p·g◊Ï¸ø¯ÕÁg¡p±Œ†ûFÚ…$Æ˝z å…Ò0Çÿ‡Uj+[ö≈ÁÒ?ˇ€ø¸o˙@ö@{≥lËA`˛\vÙ§º4b»7ﬁÌÏÙ$"≠ÁÇüˇ˘ﬂ˛˜ˇõmyãTalí—ˆ’wì,õ•õ´´ÁÁÁ˝qèCé1V·DßOÿ˛Myp˛◊+Œ—¯˙ªˆÔÙÒM∂óNÅ˜äﬁ∑˜†OÇQp¢8ûqåP≈0#û$≠¬}ÎmOc$hê‰rÍ›hjZˇ,¥áåΩ°90X˘Övrk’[®£´e<˘^&<…ÅÓ.__•ﬁàS™ä¨SﬁVÈ$¥ì°Àäøzx»æ˝vs:]^¿π°.@CÈ≥–ÈÛ∏˛K„Ω‘„J®¯{8úœf‰õ£cã]ú\TèÇä˝{[Å(
˘÷‡ˆ’%áµ Èœ∏äÏÒ(Z+.∂Æ5¡E≈L>MET¬xÄ|ågÛØ»Î≤BN˘A:ãe√(Œôﬁ⁄,i∑_∞˙˘‰öƒ'o–∂âvQ2ü»8Ëx…éÅ)€…–€∑aDñXΩÑOé*Zœ•]
&Q¥’5ÍÜv]ŸrçJxÂ‡ßΩ˝ç˙XÍ*°y≈ò√iRHπì∂Iª¶
«∑D4B™j∂î¶ò∂4˝Qü|€sÔı˛c#¯EÈ∂¢F£§Ωë© Jæoè]È÷€SÌE(È÷°7;
"%ìØ◊Âp|ˆ√&Å∏¨EMF¡†<5ëJÉmiu°>≠akQ¯vB˜^Ä"
R§\æÔì8Â“ÉG:ÊEöÔZ‘ß=LÏ)-F•N÷˛,∂´mQkªrM^ùM≠‘⁄Ô¥§QDoo~“»-Ï√†h¿∆Ûõ?≈ÏpgM¢sEjã"R≥‰9Øœ˘Ä¯M¢°µAà∑»#ı¥sÊE¢e?F«;„cÏπœéÄäÀ‚@‰√Ò¸Êß)#ÍYáX"LÇÍã÷÷πÇßª‘_˙˝ha›Tlio‡qùûÁLô>ù`”∑ŒÜr»ßÉDò’®¿éh⁄÷VR‡»a¿)(âfQt§¡ %h»†”<7˚ôÂ§∑é}_˜_È.E#8å}/|	‚s'K(‘k€õñ∆XÀ˝˛%Â·H⁄o  ”/›@ı÷ëòk‡Í(úßfÊ?¬–‡ÿ´ÿÀ22≥_Ñπ’ÕM´É›∆¶ãÏ´ıΩtaì>d$L∫ÊvK¬úKÿÖ]¬ 'Ûæ|Ä∂œOïÍ¸ÈSˆ˚ÍõiŸê∞*5$≠äÙ∂÷◊ö"Ä/L©!=ﬁOgaêuñŸ≤ª·‹¢∑kÔ∫˝Ô:À<ù“ÑáqgmÖmt˚Y¸ÅrÄ≤Ss±ÆÃ⁄Ú`Í–ijV'>oé|»Nùˆ[1Ë%	”x¯æá[—¸Âön+_¥0ç#Ë©•Á§≤üì æ∂‹B8KÉÍ<ø›¯i|ûv8øæ´0xæïC≠IÔlöf‹,<Zk¥·—˜¯inéSö7Úó=.õÏ<fÜUUWYÀr5∏FÈCm!¡÷ª∑ÆI˜VsÜ6j-BñŸË˝-ÌtuƒnÉPKJé[H«ÚÓåÆ=Mlöq∏‹Önÿ‹ñÖçìjù*oúx>∫/ı≤∏7Hÿ(âß&ÕçÛüüØµM¶Á¶—éÑ÷ÈT'ø 6N„”˜ÓJ!È;3)s›oÆ∑âeìÓÊKÒÎ °◊∂Ùö´Ã!-ú?€^yÂù`†uÍÉSvÅVäµ∂ö2‡öœ &øˆ¸±Ø≥AóÛ»i‘àöMæâÀ.…äN3ö–¨˙[I∫∞:8hÎÚî§ÉV™í≠UöT+èóy;´y◊íU+‰bi*á{X)∆h-ı≠óßUƒß6g∏çd5Oúó±Ìâ‹ÜàîsÑïëÖ—A·>—é€‘ÙKìX:32πBÜJõWÚG£b	›⁄ÏUXµV£B
°3ˇ◊(IbÒùôº~íÎ+˛#M‡ø◊5÷‰"Zc@RÈpá¶≈ãü™
76<Uo¥Bt“Røºò;≤≠AnçÇ…"xﬁ{ï-Oπ)Ib/5üÿ¬yƒÌÃiô˜Î‡¯˚≤√gµÕpY•by◊öiÙö÷Ø`Ûo6“•y‘l≤∏G£ ›‚ö‘ﬂm’ﬁ?Ï¥tà≤´Õ€x˘S›"©Y˛Fd,y¶Rà˚dåàæ…~£8œ˙§j‚”¬C‹åô˙®ª-m‡5@’Æ5k„Å≤aX*Úöw0≤Ê§í§IëÒ†ﬁŒ√vGp\6ú&ÂYzPé§Êy··≤ÒJVjŒ™ı=ﬁ~ê7~q∂5∫mã:+Ì∫±≥¯ÎèÄ9™úJ=‹\µïlvíxÈdcP\¿/ˇ√Æ˝ö
TbÆ*o•ÖΩc[t‚RÊ)^èl_ˆçâSä†‡U{”B¡Ω›W-(vE¶$¿L/0qR~u≈Ïü≈ ≥_»+ŒUX–I£M÷ﬁîn^wñ2}ì»ÂÑôüdZ)ià#x—êíÿ¯ﬁ¢>É∑;â3N.ÔXo‰˝ßàÃàXÄóoû™?åßx´+≤-rôzP&î¬Ê™ÔHkE‚Ωnëàj…Ãs∏±…=ò;¬3/O®ÒÛ◊ B€ôMÒEQ†uf«¶¨í∆»¶8™ˇƒ)Åöá∆∫ˆÿj“Næ–J‹rtY'g2}§5XA•ãÏpX÷ıçáèﬁµá]ü§ÚÖY®ı‡[›ï}Ï¥ìäØs3…;IA)ıñ9(_µÔ&	Â„_UJ÷9â3/\<G„_ìQ˛5Âù%£‘é¯}e£$R_ØYªìúîn
/†ÍÓ`e&ÀÑ+è£R⁄Ht,ÁπÙ`™°µ!¨SdøÏVßøºﬂ\ì¶À|çy’œgT√∞äè”˚·ÇÚn5ï&‡Y‚⁄Ø€^ÏûÓ[≠˚ùZ_UÔAq›{◊>Óñ®s´ΩYT0‹Z%ò∑_8JÎÁ|kı‹‡ËÚ\(Zç¸+àµ◊_}ˆŸˇ  ˇˇ àrsx