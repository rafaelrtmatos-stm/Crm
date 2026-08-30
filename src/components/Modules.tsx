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
      xúÏΩ[s‹∆ñ.¯>ø"U«g≥™]UºJñiä
äîlûëD6IkÔ”Ö@lPPº∏Ãày;èÛ0Û8””;ˆâÿ”—1Á±ıO˙óÃZy2ÅÃD¢HJ∂˜Fÿb
»Î ï+◊Â[Ñ(◊ñ^êQ‰eŸko<ÈúE¡’`ï‡˙œ`îD$ÃÉI6q§‰áYñág◊‚k\Â‚Ût∞N≤…ÊtàdSoÆ´√áxK|]ÎlˇOƒpmèìÈ4åœüyÁ$ûÃ◊Vn‰∆AA„–˜Éò’öE^6VVñÆ/'¯ı4ô≈£†Cñ€UÙX©à◊ıùF…Ë«[V7ïã¶EΩ˝zzıãgﬂVWÎYÁÉ”»SÎ˚jeÖÃ¶” yY@Ú~Üñ.C?H;€ª^öÜÒ8!/√ã4ÿZû∂k∆c•_ó≠H"_nƒChƒƒª\ﬁÆ≠`c;€«Aå¬$Híëiö¯≥>ƒâ¬,˜àwÍÖW	ôz)|ˆC|“Kâw?Ùì°π©[À@í∫ﬂzdìtÔË©x∆ÉÒ`Ö$Az%ó@Ä4ìåÄÑì… •IùBª‡uœ¡µ¯¿z]]~¥ù¨Z»v>Ú“|8Ò¶›.Æì>	˝´y≤MÊ∆W‡%qñ”Öu<;Õì‹ã»˙uË•ÅGû≤œ”4‰§¯Áüf^úá˘5I˝AÒ„7∂§A>Kc”Ä™#˚cp˝d›R÷»7ô^â>-÷:‹[#cÛÕ”s>î_„™!),?—9rúÖ9ê≈¿ã"r?M-Élûf=s:ÚÀ àKt*Ù‹õäæ·«5JWó@WåÃ\*¡zÄ∆-ñ`ï¿e<WWË˘ïb‰±ùbò'>o),Z^ã¯æÅﬂe÷ùçÅè¸8XqÏ\sÖ÷nÆ‹aG¡q¿*≥–®ì∂¸∑¬˘æÆ∞_‡ˆpõD05`√yx>ŒKÆLø∫∑åàQå°i7Œ˝±qymÒ~8	`µÀ!¯C„íWÍ“å›W ÿ=∂n’˝™E’ö÷ﬂÃe˘Åtø(oÛ‰Ex¯›µﬁ0¶∞zÇÓ“p©Oñ˙KΩ2˘˜ˇ∑˜∏Â“íÛ8ìvC›s.òw+»`»ì7^î§‰¡ì'WÌY>ŒíÊôm≤ÚiÊ/ò©˘ÉG+-¯ªˆxã7…‡Ë]OÌÛÙyÁ∆(zËüªáΩeΩ`ƒdoGñY•Êˆ’≠î’≠√[{4Ia·Ú? Ê”ÇüŒÚ<â[ÃmÔF·Ë«'Û.ï§fSÍY7ˇ«¸∫ÇHüV[ã4(óÉuË◊ò˛√p9ÿ¿?c¯√;ècr9ÜaìôŸc`f’}YªwE˛µå“$c<í›°ejUŸh4K≥$LìË¥Ë5lÃÙx/Ñ≠s∫ø⁄fÕ‹∑-FÓd≥à¿"ê$UvÚŒvEhi#éê˚!‰ﬂ<ãÕ‚ìêÚŒdÅ‹ªR˛Ú~HŸy∑ ≠)¨B^Yêúf˚0k˚@ W›D˙BûÄÑÇS<É©ÿ§ÁTg⁄+	o>äªùb¡=Dö‰Q[|VùÁ>ìf†9Az·çº¡V≥79ÖmÂhPGU≥»‘Á€âó^”'›ÕâÊÄ’˚Òœˇ%!~B„F@Óú·Uêeﬁyp¨%∏RiuUØΩ≤jãú
^≥i´úã/…¯–¶Fû}J“`så4∫¬/≥8ÔRÌ…&I¶A\ªø µ∫≥Ä∂tÌ^≤∂˚ù™¥-ì<ï⁄≠åª?™∞§;∞@ÎèËÏ•D¸@[* dô~¨öL”‡„üìé[ùÓ„Œ‰∞‹ÂZ´˘yVô^ÍqW-ªô~Çk}6´Z†G+Ö(mß∏G;°ªºÉCù≈>+b\ÁEöLP[î≥X÷§X∫¢0ò≈!æ≠âÂ∑€ŸIÍe„µª\[jâwΩ¥u8⁄;=4◊ãUø¸Rrzn ö≠0ûŒrá˛^x—LbIîÇä›îZ∞
∆^|EtÈ4Ç]9(äcáí`å˚<»á¥Nß’ëƒ/í—,3â¢ÆãåÚéq˘AZ‹Çÿ{“Æ6…(I˚ö|Í·ë ÈsÀ
x£(ƒCJo8∫,ÂPuÜ¬Ò$á’9<¬#QÆTT!Ïˆ,rYgÇ¶„ô™b’ì∫∫Y·%g8îõ…,è¬8ƒhec∑î 7\∂¸∆•‘8-Õ´¢g∂4›òä7õ˘j/PÛÂ œXˇ≤3É=‰≥‰Hˇ∞\/£¢õÊ0S|4sùzãùÄ+ˆ$ıD\U.h:„¶ë[7ÌºnØ[çÍï.—6ˇ¢•‰^9≈€ˆte¶mã∞"I'&˚5H˘ﬁ(ÃØa9t∂˜ﬁê]†ÙQÓ˘âU1c#»… øûB+Ÿ3∆µS?U„hÌDAögœcÔ4IÁAVªg^I\åÆøbÙΩ·ë,âìŸHÈ«N√Ñ E_¿`êˇ¯_ˇ‰i?Õ¶=‰ÑÙót	Ê◊≈sı¯Î∆ˆ∫ûüL
m∆©ÖX≤˘ÚU∂Rë{*J"€©J;Ä _q
Ú]^[! …Ë+~Ü™OUûk§”¨Z<¥Õ‹z¿R+ÂüÂmhΩypv¶‹73dõJ‘aΩu∂≠$òëÉX")¯zv∂d◊ë6H`˜∞Á∏o^”>Çi∑˜.P˙˝$Ò≤º;'¶2Åé¸«ˇˆˇê*7¿∫ÿB¡• #sëå>˛wíÃ.¬I»i8‹Ñ/2<{f R¿´ˇô‰3XAg≥ò:±ƒ~Ú`	∂5ZÌI8	`óÓåBjjŸz}«Äx¯¶Å7t∞ô∞u%@„hI¬ö@ºÛ$ı˙PÙœ—£0ÉgÇ¶˛Œ&ÂZO/2°ºÔi&W/?$•ÓvyC£œ5.·vtÿvE±¡YàÁKØÿ¬√ñHìÀ&Ò•s˘ß!¥ufhh¶÷ÿ•s`Ky‡/Y≈¯∆ì®çKTÓe◊Òàtõ=à∏∂ö<!ﬁ•Êj“ ÿ}ñ›ÍZ‰4º¬3“e≈…›Ô54∏Ú8π§Ñﬂ-∆Dˆ2î≈cÔ"8á-(Âªôó= ;H‘Ë7ÊqF´vè$ﬁ‘:ráU<QVı&C%F8	Ü`’A%#¯8\jË”	@àY∞pÍàÒtKi’CrXlü–j ˇ¨≥∫ô·ÑúÖÁ≥T◊˚ÂóO@ß?≈Í@·¶L>÷‹)ÛØf>S⁄P∞ıròVºhjü†ò¿Á¡2jv`8‚XUÓ◊ÏŒWÖ*Eyh}Â~yè]9≤√&¸uuÃ^ã13≤;s“ FÒv>É„”aòÌ¯0f∂Tï˘]4|∑ì,Ä	Q ‘gV∏H·Èµ≥˝¬Àaa–ì:˘.˘!h∞ºöS”{Üπl≥≥ç
…≥≤
¨aò'/ÅGD¡qûB;∫Kp‰{v¥‘	Ç“lÚ∫Äúr/<Ûlì¨ı—…U˚ûcmMnö’‹RÓ·Èˆ˘Ñy—∆	ô$ßaêe≤¶ÙÔ¡∏ˇò'”MÚí∫‹=~∏’pÉÉÏƒﬂD˝C:ºÖ˛L’ÖYı/'hxI|fÂÒoëz∂F}I6ÜÁ–´§ñyiPßKÏ˛q‡•£1˘Ÿµ:⁄√°
÷ç“ª®“‡ëænw}‘û¿k°„¡◊Ã¯æj<ãœªÍÍ˝Â¬n¿ë'π|÷«àG—¶∂ª4Ú‚ﬂßs: ózv}"DàÖã’œµ˚Ÿ?Œ‡Ø‚`ƒ›<mP¯Ò]d∑Ú≈PNt6Uî¢Ä¯öπ+¨ÆñæNïqb)T3‚áJ±™πKﬁP†DÒ»™ÿ? ca’Åa€⁄)p3CV1¯˙a£Á√B»÷a4ÀTÓ√ÖîÍöÇ¨°∂‚ŸúàÅóº]„>#Ö[ô~BK6`ú=|øÿøb˚qRzÎ€|ÒﬂÆˆëçØ˜…Fü<|G›ÚBb∑È·ña>?›ÿ“hé0LƒhÙ˜˘©A’⁄ j-X∏§}ñÜ=Ïqπ\eÖH]6:Î\Ëïï›†ßÉüÍzó™:‘n∂f7ç÷÷≥k∂a≤l>ÈÕ∂£^k’µ˘á í1Ô{¸yæıIØxßYÕ®Î˘Y>Xcª˝ºN@¨.ØëùU:≤◊ÙÜ4‘Î8%úcl‹π≥F©ú€†2⁄<„‹‘,Mt!‡+]’≤2⁄˜(QÓÇDŸ5é∑ŒB3<Ê;Ó-ôMƒ
Çø´4‘áE∞• <pësU6‰¿z“˙∫[Ï90ƒl…Qê∫E≤∂qâ(∆≤gﬂÔÓëÉÔ…≥˝√ù#≥ÌK;ıf“5EOh«W˘‘ù1ü2Q#ûÖl¶›)í«î@®ƒP Aåÿ*§“FA|ûèoPÏ-K7y@Z7ÎQ}Ïp¢Â°ix÷Fªyû¯I¶ä∫cπ…á≈‘›ÉWá;ª'‰Ë`Ô{¯˚rˇ¯D'ßﬁ:JM–π~p´•Îc⁄ö˝∂Ôpnp€Â•Ÿ7_⁄hó¶ª./i˙÷Ì∑≤˘zæíP˛æu/±ŸÄ¢◊πKÒë›ÿßiì;~–∑™ÍÇ3ÅSïa¡˚–ö\∞Ài›-‰vÈË’∞´nGè)´ÑGQ~ß—8©bfi¸ìC@á£=î⁄ÔùbˇÙjÜØå¸m]vÆzK∑Ü≤{≈isïs¡b€…&RgGâ∏{û∑n‚Ü±÷Ÿ~ÑT,Ì!pî—èéï7€˝û∏ù˝ª,GCåz'8ŸõR•7®LVâ!°°≥v∂(Ûrà:ê®Jœí<˝Î+3JŸ«@√j‘üÍ~Ä≤îÔBnxæT¨ë˜M%÷ü2°·√.]ùõBÌPhq¶Ã’ß`øz«™º‚j£≥5˙Òû@(ÏÁÅ!& ®BZ
§BÂX*œÆmeßñ4Uo¢[Uˆ‹ÛW¿J‡$∂∏u™ÿ3A^˜£‡àÖ”‚OíQùeﬂ¨o/„¬•D¶Qì^ÁQÌ‹X¨‘J≤˙€µ«E\ä0E-‘ç´|Æ
ÂO≈i†∂∏6Í2yEY¥ò.®uP`”¬›zF¡Ò4Ö]7A·¿¸hQøMCÅk∑s€‘Ôeíé∏§›ÿ¿yg˚Õ¡À8ÌÏêÉ£èˇmÁ’Û◊'§À∞¯!†◊ºÕ52ØZãµ» ı≠HXC6¥‡o7ÑÜ]P3(L~útúè†|∏ <Cí∆^ìô§AÉG–M2Üz?œÿÂµ- 2fÈ4
ÙÉ˝T0v‚ˇÑÃ¢hö +ÿÌﬂ´œc4ñwƒ(*≈˝*ŸƒÓ¡Îì£ùø3â⁄eÅ’qQç˚aF›»û»√Juƒ+&PuÍjÙK
Ë]™	“fØfﬂ:ÙÆQÜ¶ÁE•}ÎN|F∞—Z˛>¨»8Ô.ùÖ13~ö‹84E sÓ.1≠ä€Î˚ôRÄss!˘[ì˜uoJÓ≈ΩÛ‘ª¶Ï˝◊ ÎÎ8g∑‡Ù–¥_ü±ˇzÁÂ˛?´Û¸ıﬁŒØù©ÔßmÍùsüòÄú£1˚rK~ÓÓSdvEëoîﬂ†Ë‚Ûú—¸âw ‹«aÜNr£§Ê/i–C‚ô{‚√—˚qq®~‰§/ù∏7™nÌ*ùV∏cKö\;–Àî˙≤‘÷›FMWÀúd—ht:®üŸ∑Ù
äÒZùﬁi√ËGdÅU}ìsô‚™Æ–*I¨Mh»÷wt≤Ækmë8aGZ‰⁄Öåe|¸WúqÚ-™‹–Û&à}/# «Az~¸≥∆æ≤µ<^”åQø'∆ÿÇÍõ\*?ÕNiF=Œ(ô¿„N¯ü¢KKüd^Ñ‚ï\~í(hqÁ‘åxÁÿCxL”ØöéPØérÁÛîX/SOå«Ì¥ipˆd~AG%Ò}ºyú›p∑„3∏◊Å›iLÛ'ù·Uî]ıÒﬂNù±u$´-;ÿÌO¶Iöø)
◊“Å˘¥X
Üa∆äÇâa•È8îà4Ø>ã·	Ï∫ﬁáC°¿Ô§‰0Ú‚0{⁄XñäîYß·hñ¶0ËOá#|∞´ÂùNÄÉ¸Î%p34MÎùÎ’¬ÇÅHt˝P€_˙N‘≠∆‘}∂Qh©K$Zæ˝4J<_»
ÎÚˆé.)ı…VﬂQ√≈zz21ÓYf‚éfœØ*S≠ìÆ*3\ï§˚' ˙.≥h>ú¶Çåsøﬂ≈d;NÏ^rW¶∂’,Õ≈˘pﬂœÜXéênÀ‡'˚Ã¶\¢ç°‘$?_xiË≈¿…≤`î¿‹¶◊¶'I§∂^ÙÁ¨Lú©¶ä6Ï$9?èÊıµE˙£î—ØeØtÙ+Œ⁄¿ ˜ÇH‡‰ùêE~ Ω‚&¢%ZäπÈ}–7vk˘ôE‹º›ÑJ”§Eíínn‘Oé∑úYÍòÓ6´œf—èØºÙ«ùÏ–˝vì˙äM	9ÙŒ“’NÛMÔ3èæ||◊ç?ÁËÔFIfÄH5¸<P•øû·˛p/‘·h£ù†›`?gX?¡Ë=Àº_œ®´D^]w6T´¬ß%Ì=®<†,πÂò_ç¢YòíÇ”S.Wø•j"Sã`ñùSËÚwû&õ‰H©‚Ë¯ã89˙	Ÿ=¯˛ú«ç]/ºÚúBZJ˘ÎÌ peÌùV{®®ŸQKπ∏w)P8ÎÒRÛÓ€∫lDBé$Áÿì•>âº” ÇÔ–?å˚ñﬂÜsrºIƒ¡˚¶ÓpÕãaáî˜~Ë…e…£S&k‰ÃäÉÌ˚£ThmàãÇˇÇeê◊À|G‡i•ª0SrãÒk•æoD}√˙ÜW·≈0oﬂ1WAÉì†˘h@›©C`ÛY r>Ío¬‡Úƒ;Ì‚ã¬ø—_hØÄBËß0Q(∏Ò∞ (ô˛πñ@8Ä⁄D#œ©˘(e35ZúPïÅﬁ£¨å-q4Ω˘Ö
˝ßu Ù“€ﬂ;^∞\æu,R3-Zﬁç2≤üf`‰CJ|W\√IßÍodbfœºîq0Ûz¨{ìŸO3`j∞Ä›ƒ<LÙ»Èfh‚7~·,ê.º„‹ÀguR¶0∞ÅŒ&Ë©èY^°%“9B.¬◊ÜÎ|˙¸m:õ&dUÍh›…ŸË†0V é´ˇ>∂≈ﬁ9≈@ÿ#-véΩ&.Ì¿Õ±1Ë°‘ú¢¢‰9⁄∞¡üÿe`U˚˛ÊuMq#Ä™√ˇ,ÉÉÖ¡œﬂÖï]¶ªäŒBRh–¯ài:¯äq,9&BZ⁄RªxYÎÕ V±s´ QfUWç<‰(/ÕÇØÜ…h®bn®›§∞∏Õ‘ LjÙ±¥¥0Mä≤ó·d
"¯e.ö^’-+#é≥l]UuEUI	∫∫R˝üöºLÕ⁄(ì⁄¿å`”∫®nÖ>Æ‡@ÿ3◊>Dæó~¸k‚c£4K®ç±ïöπ†	%…∆˝L<â)ˆ∏O7÷*«⁄ÉßÊ“Œ≥ ≠Ô‘◊™\À¨∂ÔÏi[£ûΩ£2”ayldé≥¢rúÂØZÒÿ~†t(®7S∑!h”¨‚5YÛ—ŸˆÚè1ŸkÔlO¥˛t3xí¥òøË∆ÔiÁ› ¿x{eDç—Ù2Úb—TX9ü
z◊âO9óid€S%Ÿì#åS©Ó®F(˝^Y˜⁄¶]_ò}£'éÖÅ…»x>=N“õö
‚-n0ƒŸ^Buøá7˘À≤û7îÛ 3Ç(?–)ƒ 
'Aò&¥h˙f…@´wÒÀÁ∂ò=jN1QLâ”A≤aÑ∂v“4πD„Ÿ·‘˝⁄√o Y!¸Ë3ﬂOO∏ü=õTZ)2BO±6^‹NÎ˜0Ø´ØËm¶”A\
¢#iâ^â{Y°zÈ]œ˛6}ù⁄I*/N“â¢{-np√±∞BÉv•2^ÚÔº-M_ ∏0«ü⁄›©äÈ¬†b¬À™f¢~ú¯6jÃºXok∆ã/‘ì¢Ç]é»¿&øÇııï
QYçË&f$à±⁄=∫R.Z*èJ’ñÉ∆»§C7¶IMæu°(ãÃAm6«:] ö÷©Óﬁ˜≥ıM°4Ç≥«!√º˛íº¿ïE!†
ó¬Æ?‚£À'#!–√4Äê’˜4õﬁºkr≈f8Éî…∞ä¶™hìØ–ÉÚv\›˜+J_‘Ùí'D«{ÑízÚ^HÛD÷OO»ªß_‡™~˚=Ócß°Ø—pì#Òìµ†üf!BKÔˇ#ø”Xp>*ı“[÷G^<
"µ∆›‚ûÓ’wuün…º‹+√}ﬂûîix%5ÌæY˚„áÒòJ	Â;{‚V√@§πóº˜aéru0“ú!øìΩè°?∫î3J1Òà°†›Ù„_¸∆í(”<“ )vò~ˇ„ß?XÀ8M¢@i≈3v√ﬁlªóÜJÎÒEy5ÖÅ*R\Ô)õ˛Ω4ôéa∆∑N∞X¯-„î∞›ùùoj„T€çÊÅ¬ö£˚1QÈÒDCÅ∫◊Ñ]êoùlÎû…©üÕ&È“Çô{_˙∫GGQ‡•õR’¯&Çñ´ N∑≈ÿ'Ò(µ-3¥ñoÇ¯ÛÍ≈˙é‰˚¸©ÓEÒ$˘Ötª”‚+mñ¯‹–∆8˜‡§úgÿRoî·„¡È0\[ﬂùºzπ^<è\Ù⁄&üÊ±ÒUf∂Ω?Ã≠yöP*†hÖlLø°J¸Ú€eËÁcÒï‹¿ °“”0™áXéaõ"-c{cåBb+â…/ëxa¡j
-]¥V¥2ú≤òKñˆ◊MCY´QÊ)}û/´·lÍ›[Æî2ˆ≤nÇ&ŒﬁS&U
€$æò◊ÍøQ‹	>Ë∞ì]\7Ê1·-f´kHw»”ßp≥“™Ê∂ıe\p6
∫›l6ÈìÑ…‹≥	à>›≤Ü∑¯Ï;ZCØˇõ[œ¯ÆMhº-Éœ`lΩ£÷ø±•$¸áÕ—hÇèƒ ©/œÉ¸
Î¿mò“PnjfÉÉÙﬂÂ§èE√¿N˚ú¯Èw¸ÿÙOÔ–œ[Æ-X/PÛ ÎN”Ä¶‡m97∫õ÷<ÛFsa)
Sw6√%˜ª1 ˙¡ÀEilÃën≈ÈÆ$Û√¸«ó;…mí/Ê€∏1xW‚Âå˚g—D!Ãr’≠@Ä :ªç¬ÇŒº75N∞m‡ç‚j<?j‘¡M˛÷
Y2UÌ‰™o2ól<„[∞O(cQ=4@%Õ9X∂Zk
´Ÿ7`4(aî÷|YjÒW$M35Sbö$q“U”ù†πÍ›qpë&1Í‘¥È≈hzQâ ô(ß€í'Ùâ è;iíS\ù«+Ü^w‰„ºŒÊAn°” *8ƒ8Ñ»ff°ªÇ˜pA GñÂ◊»QÏ!»–8:FpF8C¢%;ä'€xØÿa}û!€lÚt	√0ﬁ˚]@
äb`ÁÅ-¯±Ω§Ià˙S‹ã^y˘x8ÒÆ∫‚}∫/ı…⁄lÿñ2l1…BÆ≤£ôj≠å∆è?#ü\y«X(4q0∆‰4òºkåJ\†Õ%âa±—2w	!À@Ã:A…úâXL.–@xk∑ı[õúV¡gÕ≤e-j±áé =„£ïö#Zè◊-0iØ¶∂*üfº±‚úåLÿ∆©y≤œµ“˛*4Ω∂ÅïvÑNeøîsnBÿ\{∞”±K wsÓ«™x9F≠´‘ì	¶•ò\÷b’ÁÚY≠
gÆŸY¬L @WœHx≤9√ìçß¡*>K=uLàJ≠g´FyUÏÿx&≥f7–:	ÛÁÁGNù•9˝LØ∆	h˚´âÅÌ”ösNº≥é—c˙Ød∏‚ªw£Mπù™Sg¶ÄüƒÖò¿ø÷}	õÏjfáÏöKÌ ≈b S.Ø‹‘úè$\u[Ç∏Úr%¿¨∆«ˆe.Hw∏µµ^∆Œ˚ù√¬ttIiuV(≠Ój
‹#[∑c‚V"lúÊAˆì—U¡√”ƒøngƒ5'“—hm5ñÀ~iIûÎÃ$]”Ê.å2U¨ÒÏ≈$∞ïNO/ı—_¡Ùha.©€ZMØî¶Ò©fç5æ+L(\√U}œÙ7ß–?Óï	˚ä‘5™00æ Ã+Wç 6Eala›^Sç*RÛ‡ªÈaGëû~Foô^(L'“Øÿ=”+‘b"=~òXàÄD0Á∂√¶ïΩÿB(¸öV µ Ó¬h$’öÌN˙äΩ€ëÏïw\Hﬁ≠AÓS˘iWÇW™hCÚŒ/™DØ4“ÅÏïÁ	_y«ÖÙï‹àˇ–È=˘k£]´[ŒMØäcä£Î0cﬁiU_ìßÕÚ2∆»íN-.≥≥…3W`∆K¬¸\òãO”‰3/"›ÿKÜ&Pá L/¶IMßu¸‡Q∂cY” ÚàÔÂﬁÚ3rbY‘F{X)-bö8¬j‡ßŒ&&Ω*zI{®¿FÍçi≠ÏHòô·ë, ß~!BÆ_E!4g¯5Ö°Ä'3Ñ∂xƒ,ìﬂ◊UêΩ	œa•X4,¨"wSÅı_8ÕIPˇØÉx<õ(ƒˇ3™1Ï5™h[–‹ÌÉ¨§àå◊Å∫û'4•yRöÖ}3õê‡
(#1ü(•é‘õçi%˙µ¸™¯Ôe&@√åŒµDäöü.t∂OBˇ ä[ î?ì 'æx˛'ä?˚˛pÁø"Zı˚ó;œûø<~ÂŸÉ¢∞¥Ùˇî7M"z£^®¡AAæòcM
∏|1á~Ÿï˙ à√ÄöØ—….ú“$Ç˚~∑,◊ö¸ö8˙èÀäüuRSú»^î˙W#¢“˙äÜ-Eg√sûzs»ªnÙπÓò®•ÓY˙5≈¢P]Ï%h#w•J„IS·|ï§ÜJBéçªìñ÷òL¢÷ﬂ€§≥aq¨zƒEëÀ¶≥M◊»àÉÏææ”L5®ÿò‰Fo˝Jë˙L0∫d\≈Óê{ß≥»KÒlíAO2Ô,†û¬9]†Å÷'Kæø¸Í’Ú5\‰ªÔ6'ì%{Æ[˘öÀ<ıX≠”ÀÍ”u†ŒØ$?Ëmπx—¶&â5Çø∂Fá’•X¨Pø‘/Ã?É í‡µMT‹îé∏±&?†6	©Î‚qU√∂At6BùÏ(cà<-û†7˜DÑŸ‘B†’@(`*6Jñ-‰ÜO+U ≠w Tﬁ^§<á∆§NÚ§ì4πìq4NÄ¡±b	Nß8F…å&ùÁáäöòi#¶U8ÚÍ`ÔÄf€¡ØˆìO√cît‰≈ñ à/pxB∫ x	ˇÁß”KxE(<DÓ&—©ÎEˆ
† ‚„ùóœﬂcKﬂÔº|ˇ«Á˚ﬂ~wr¸~Ô˘ãùÔ_ûO≠Z|ÚÊT†n†ó7Ñ˛≥Úü?Ë‹¯4∑Xè§ŒÔ(ñˆné]˝üÉkrÉæπÏsÈÓ›3cï}9z~ºˇO;œ‡Î¡—ﬁÛ£!∆≠\úuy±<öälY^·+~@VçiN,¬qøJfYÄ˛IE`5√ÍÇ9`›=Fîhﬁ¢>1gÀN‚ìd6”«o[ñÆaV»Ä°6–LÑÃ,r	¬#]°‡AJ+bi¬ñ˘LV≈§@∑‰÷"L<MΩÒ>º‹√WΩÛjzÈ˘Òp<úÚY¨ÖhµhÈÉ£TpíU%—ÔG¢PÛƒ%5UÃºÊ0”îlRÙf∆“jGQÒ…πDh:ìb™QÑ@R'î7äaü¶…4I©Àv¸îÕÀd]èŒL›}`Ç¬4sœl∏·∫òÓYîÙÄ‚äcsö£ûLSò¸Nb£1úÎWWV˛3N∫4ˇyyf√îÄØè¬ÃCîô√›aW¡Ä'√o1t,àPb_wád7Ò√Ûdyµ	·c˘“˚òÂ5KN1A=ı]MhM®âv4ÈæÜ≤˙düÂU!o<8“ıÜ⁄Ã≠≈‹Q>¡îø<üπ#ª‰§§(Å<eh£T\qRP,êf˜E/~Â≈ﬁy $ù@Œ¨Ì≤g©âÂù≥≈ëKx)Ú›≠ª√Ä¬·avKŸÉ{“¡'∞N´p⁄æbökfìπLˆÇlîÜ4¿_ﬂ˙∆≠[Bj9/™-Q⁄≈¶Ì~¸W¸®o{Ï¥ïΩÿ\L˙¶‡wﬁ≈:_kTêÉxá≠zéÙÕ¢œ‹æ]÷vd‘pÜ)¨Z˙∆∞Ô®5tˇÆ7Ê˘∂Ö2&†È≤MmÍ,í]"ˆÇ‹˚ÌXˇdñ“LYØÒR±§©n˘b≥VîG!‚√C¸Ã≠6®ˆ\1ÜΩ∞à#/¬XÒrû‰∞ﬂhÅˆ—§ñRò∆'E!à]U“íÿt2Q~ ¥ôKˆ1}DíÖ#/)„≠üËÓÓyÙK«∆’CÀåf£KÈ3}:≥»®ºhÑ[⁄K¸])è%Mù?J.—‚∆Éù¯Ésww®V!€˜i◊ÈPË#Òr“83Ω2/…i[T∫»Æqv?ÓáU≠-wˇsOx´›.ÌnJ<ÈÉo°«÷ir’!Ù&∫®"Ô¢è'ãﬁçå◊DOÃ çœ2G$h¥ÙtmÀ+7MÍÁ
àû]ª⁄´yï— È∑m£¯#Õq]˚Zz»ãd"&—¿>æzÌ°MMÀwóRYÀÜPV◊Rª
G‘C	˜¨'êñzj⁄z'ù'#Ì‰u SY3—ÿ∑Ù£á™B˚…S˝T:&bÃ™ıﬂlwÍ˜:.]±:ê⁄8?	 ç¥Eæ$AÇòù3vªHÚ]ët˘ ˝¯g∆u(J¥fV•7Ra!':L2≠ß∑¸&TñºJöÊΩ–∏Èùt≥M´~[o≈Ä¨æ∆hèp–”;ñ4◊uı(H˜À/4ø¬´7Ωà•áRÜ„∂D)∫Q§¥ıùf¡—5^g⁄‹9ŒPêgïfº€˘8B…m∑hM∑“∫Ï…ìp$≥º+·’_•ü}≤±≤≤“d0e◊»º	“"≈/πcîLÿqÚ•ìõN•O\%woE»o≠Ø‘Êr”kì*ªöI]j#5:π»∫–côó˝SdQkç" ˆt´l§I˘Â€eR˘œLñïÏI{c=’…˝Qfπı›?m∫m‡\'q7B_e»"b`uﬂ\_ë¢ƒ÷…‰¶Œˆáêaã(Ë∑˜‹∆ê™%?— 
ÌÕ_u–dˇ ∂ó—∏g'^-‹Fèj|Pœ<	≤I¬]y—≠~Ç@À@êt9Ã«ÒJ∂˘0M¸Y„RP\¿∆2¶˛EÎ!⁄1—•ÀOX^&¶·.™•Ê<≥&ÿ>©Â$ÍÏ+f›W√ú“ÅiË,Gf:¥™éßÄG Ê*p“Ù`ûÚU√f¶´ÔßË6r,/é≠}‚Ä8\©Çoq¨T≈$SòYt5§‚∆"Dñ@JG;˘Ã”§ƒS/% Ùë»LÄﬂà1ºNÉâh8–åâ)´Ud“‚óµuªôF®ÁO´Õ
~¸ùñÉ{P‰öO?2X;›¢{|≤Û≠∞ü¢*/ÙÕ∏ôÚµ≈úˆô⁄5>ú+ YùlÜ’∆ CˇpVNS;u(åJsñŸ:π=_zñ‰^¢‚)ì˙iÊ˘Ë¸¿e‘÷K”¿«t^~íı	0t¯	ã˝&Œ$û…kfæKCèDM.ã\Ëî÷>I≤Ì¨í^ë•éuñÑÂìnp5‹$á·’&9˙bue•Áı0.ø˜H º¯bàïüyµÈFÁISfÿıFÈº¿w†<Úß	&ß¿X°c«hÍ+∆.¶~$0>!th6al(øÉCì2Ì”4†÷K(ã	Á[ê, ™ùti∞ìûìT_ìÈ—•§PO˜òr6»Û"0Ö+éI¡·Ø‹Õvˆç0ø6äÊEv]°JñéòS⁄Jã¬"zöêÊSÅ£¥yØhÎŸ—2]I£À.¢	õ©j+oJµ¥"¨¨¸^]úoé-F´ÒIÅaƒy ¶!›[_©®˚ √G˘–ö6/Rıb™äWoQ°|WT)Ó≠ÎRk∫U€¿zbΩW+[dxhàaŸÙ4\2mw©ëiõBY–µTP6|Í	"øçÍf∫âN˜P:2tùÚHÏ˙8}5|®˙˘ √CD¢ÁØ%ôû≠-\fNÒ˚E›∏3‡7·õ˙°Ö∫k¿G”¸tóÜKpËÎÅÁ¿¶]]ô\ãëÿîA§‰¶åbô a}•Ÿ°ØbÁõs≥‚ßØ&!»≈I™YûQbfWÿ›È˛õÛ7	%)˜ìÜé¿q`ÇˇƒBËQD.è˘¡πÇ$‹>Ö∞Î£÷(_±3cóöQ{TI∆3èüˇòòÇç•˝YTÇ(¯Õ∆á¬†ﬂ60§«“Bn'I'£˘OûPsÛ˝Ë8.iéÄﬂP¡gMzŸû˜:Â,˜î…Uº¯„ü13-êSj†¬\µqÇﬁ`éç>c}r¢&»≈ «{·$áΩ6 K	®È± ∂’πáOâåÿÓåÇPäß¡Nü”˝∂åx%E,?ñ fDvóeäÑwkÖ%ı8`˚mÑùî∏ÈïÌ.]J„YyK≤†ıpo9Ûˇ^r¥}"ù(∫J8}G9%èy… ÁÉsÀ,GÇSu0ı;ô¿/æ ÿVÿ$å'Ë¯ˇ%SjB.å£}≤a¬ˆ>B,ü¶!|‡ÄâeXÓì\iCA>Íıë©F3x3œ¬(YŒJh>VÀèS1œ69Ñû£
näG\Ïz•hà‰K
CHùOœûe‘õ3°±ﬂti'1òYò–⁄r[≈áIwhª€£Y`çÌ,/vvìºkzÃHs†Ò∞)¸òÕ7ƒ]˘RêÉ|¬‘k-aÉ´•æz˛˙˚˜ﬂΩ~|≤ˇjgo* â«ıe§xê∆º›p‚¡õ^òaE1TKﬁ÷¿G6WÉ® é0=v (,≤“»ß˘È∞SülV¸»+H@aVJ’"c
@f,j+jv©áAt ôè˚¸swi±)Øcme•Ø‘N·5Èè{V Mvôp†ÂÀD»¬E©©GùDáeöb\÷]uKwÿEÚM’2Æ¨Í+˜TÇÅZïq†,Qk‡n´·€û•_%i&Ä—80Ω›∞ ﬂÚ◊ú∂–π:|Ø-EwX\^πCÄk5:e∆@â¿˚F†ØïwM‚%3√mQØ√‚òºå¡hÖ±n°Ñ˝*‡⁄ıœPPC·ñ‘áã”Í; ˝áísÂ„f8\WßtkñÄù-œÚxÒºúz/ªéGDrå∞Ìπ¬øÎ]za]L.A9”Iwie,Iü\Í´Òl#‰”•^ØWl‹FÌçãªk%|˝lWDc Å√5∏»˘≤≥Õêw√tkjn:öæ(πs‹V?ªT˜<)	◊<7ÃÑA~ß3Q§+mDÌTÊÂ‹']ùì#⁄´6sQÛy356Œè„Ã|Vø∑;ù9ùˇôn	·TáÁ1Ê9‘˘BW&—‹V+DÑœ €æ–≤”¬;!ùÄÔ¶LqGµÍÇ‚°©tS}∆î∂™∆Â◊6C¨£Õ—B\ŒqbÃ*´œ¥M∞(í<I’·cmD∂≤Õ-<4åŒˆfSx]I‡±_ÎﬁM¶◊ïQ¢zôVlª}xI1Æn¬M¯Ê €M»ïãÃ[˝@ëŒn7√GÅà5∫ßÈeV”F“WÅ4äçòjÿä)u·tÑ‰à1TâÛ<éÅøt˚c⁄æ{1IAl≥g^\Y\Ÿz¿ÓicÍPbîŸÄRxÖP>~_{ò@`”CL'©√ ∫—äÌÍ∆¥ÁjΩW∂[$ô∑«IÍe„ ëÖ)∑€á∫≥~9Y_ë£hmçéQ◊çjhŒØ ﬂI∆ÃyµˇzÁ‰˚£V∏9e¬Ò[B3ùc2r¸ıPg6Ÿ,øÆìË\˙∫AÆ"ÈÎCÜ∑gÇ›¯çsn˜˝áùÕAø¨—Ñ{•Ü˛ñíöt°ö1Hƒ–[m>Ù=Ñ¨…µ∏í´f§Ö$∫_A»0ºE‰p≥«…3œ?ÙˆÔG5üS‰üxÍä3â(ºU…ón]™ã›Z’ùÆ£qã[´;¿π§,ík˝bÁÂ…Z¡øpsÛ°·êá;ﬂ4µ∑ñÈ∏›à∞ÏP|YÕè#Ñdö"™⁄9®∫ÛŒ¢k5˝z¸7Z€0ËMÿa,Âp+∑¯*kõ)õEπÜí3§*ˇLüÄÅ¿Íc(†1«\Ba™Oôáuà ]j¯¿Ñß=
'#	¡ìiŒÒ©Çˆ]¥©P0ı|™…øa^’ò;¥©Ÿs¿£0¬âa£ù6µ≈b™›º~sq’∑é¨&ø”œR≠…ﬂ{'Ü<«@kWª≥√m°pÎ;§’_c»ı]ﬂ%≈ﬁU¥ı}≠sˆùëm„FgWXê{+í[[«_˚ˆÏ∞µêiﬁ|h≤ÎìU]‡Á0‘3‰+ZæŸ–¢û4ÑlŸQÔ˝⁄Öès“¶ﬁn‹ÓŒñÆ,G'®bpò\c W§›xt• eçaÈŒ;¡ÎHyˆ∑äÕ®EOÊ4‚◊¢”˝Ilæ∫·ì$êU7AEZ-™W◊dì∏ÕZL{„p¸s≤òÈbç„*≈ÆM^≤FDZe‘ºU∑~µ3⁄øÖÏ]zsVc©·@Ón›íP<"uVÿ¶ ’(ôØ⁄vx—≈wg)ÌS2
[ÏN™ Våk\Õ’ÇQiáFaª´“}MˆÛ´Q4£î≠êZı•…ft;√L°ˇıòg^Ω⁄yI∫›ÒÒ_®¬§j•1j¸å-´d‚o ∂7¥rakc ¢¶î)∑1£hl∞¢∏ŸPm(∑≥°‘b-D≠;T≠(≤ÖE`•Ta[ßßFSõ•&πdóú‰ø-[Õ√ˇ8M›´ï∆≈∫Ìî∂ %#¸÷x√˘‰*gúiejo84ÑßZiA‹ì◊;Ä”≠i\Œ…ÍÔ‹¯u7Æ-˝Ô—àÜóÉ!ç=Ê≤4¶+Úús˛∂fì	F√í›4DkB3õö±ÕQêüQÙ.(".ÛN≥n\"éì‹ gzgàzK‡h¢>T4Gz®€‰£∏\}ı¡Óí`€Ÿ¶c≤CSöËF•hÎÌÚÿ5éüC øOk∞¬Îì≠hÔ»pEG‘E√8…-q*m[»éE[‚l¿Î7gœ¬Î÷6-ºZ§uî∑Ω_èU/WKgÎ^wu∞†•ã∂Â.©˘◊iÒ¬Î¨^x›MNª^Æd›¬˛Ö◊∂ìv[{Z„ôΩJ–98ÒÛ$ˇæ’t›æı7É‘*∞7–˜ÓÔp≠¥9p≠Öb4¸Y¯ ˝;)sÚ≥∑”û£∆Øqp‰û‘+mÊn~¡æôRUQ}3u!≠~pXjá√m£Ú^’µ„ùcﬁ6¥÷°ëk› €cÌ¨©ÔÒÊB•°ﬁü∑FkX®•˜™°∑AÒ‹6ìåœ&∏û≠G£ZWŒrﬁ¢&?˛jE67£|ıT’ò⁄ìXïn£O)'Ë‚Á>	˝+c≤›JÀ9/∏™á È’ªPµˇi<û—c˛ˆﬂ"620˝Îõ+¬n†slU¬~ÒA~È(â3T uø®ﬁ-ºc›N˘5eÉ6XÙ1OœŒFrgrD˙°üÅπèÚ§¸aS˙°'~=Ï›yØŸw»≤\®¸E{ÒUtœí´VT^1≠◊“π=§È‹d
_3ë∏öó∞A<[>±aó2"(âWy^Ñ49Õó∂v‡ w‚∞Âòq·”üÏ•¡Á<ç;B{ﬁÈ@JU≥·ƒ≠˛7;êÖ\?änñyó-2äeXé2íùæbÊ|ZìdORGdñ%⁄dëë∏9†Ên ro=s.,ëÕ∂bÜtªdPlöxJDˇ»R•iﬂ»[†"m=s—P∑àN6iqûRÕGu7GJô‘êW‰ÊlBÒÆÚÙä;ønj‘gvΩ’ÈLÎÌπ°àW8y:†2®~§§ÎºäzÀËY£R«.^;‡ÖóÜ ho !⁄>Án‰⁄?æNyÎHyU_
{}ü√·÷“ ;¡0œZ+wlû¯ﬂ√‹⁄l‡FˇmgR`D†«˜±sIgêHE§ˆ±‰_ÿ˙hÿ≥å‚´⁄÷∏)@˝”ñ©8A'≤∂§…C}·ÈÆË∑ú≠#˙]»!mÁq!…ÂñsŸﬁ$Ÿ4ÔÌ∑é{sﬁøï0£:ÁﬂØX±HFˆFU˘É∂©CúàØˆÑçó+q„uwnr34S7^n1çπÿy8ÉÉÅ±ôÒr55Ü=¸≠“ë‰êﬂË≥"™é‹	â0ëOGEÆD∞	∏¿Óì7cä|“`õÜ÷4ì´ΩiÓâË˜F#wÕ"‹Ççn?ß,¨ËN&’]‘l≤1˝ÿW§ç*“≈i´©º}”Sù7*ÔÙ§h£π'∆òëVeÚ”,®mî:≠)Fëa—t∏åGπ¶OÏl<d£4â¢SXJ∏Àz’Ìfk?æ@•_z˝*AÉ3·ISvì…‘ãØüÃ’Ô7dñ°ˇ≠$
h—[fÂO≤{ÔÓF˜Û®“q‘[Ÿlí‡˝ ıiz6rÃõF≥yŒ2è$<Õ6Üa•4Ω,Í0°È‘∫1øQUım≤pkyH¥‚≠ìEZ¨xYﬁŸ>“èÖnnö-,¯GªÆX@êoÃ≤Ãùh8¬!∫»„!Lø k^Y‘-Ry±Î‰Ö•™ÌÖ!µ!«CtÆ§Tï!<UÖ~N∫1—Ú?˝§ñ1j≈w∂Ω¸„_>—Tù$M‘IÚ{ù¶y∑B»Ë}®ò≈¡ﬂL[%Û•¬•XUz˜Fì’uÒK»ﬁÖ‰Å£ŸŸ~€∑ÇÀ÷'—`1§{∆”aò—ÏíÜÒhåõ≠Äî⁄`H´eπÕÊbà«eEõ"ûö{C√i_P8Wjz≥ÖÃhÍÑfÍÉ9ÇﬂÑÇÕPè	æ≠±oxVVπ ‰çEÏ˙≠å˚ÀèeyQªG‹A∏w˚Òóm&M≥¿Û≤˛œ f»º˝òÀ«È∆1oN ik–¸A•<”®ôGdÜr≤Î∫Ï∏ëÖäëmU¬ŸéuÁDT*ÔíëÁ{º∂dUÓ"ÀÑVñ˚Ù	â8y€∫cÿÅM§•øﬂ´°(‹Ø_kÀÎK’lïÍÕnÖÚãÛÇ5ÜŒ	 ∂≤JÌqm¿·äpwØñ´Å◊™b0tÉ°·*πéí	Ø>Œ‚¸Ü–>˛9ÈfvÓÁf ¸§®ÏºçoÆMﬁ›Xqˆ*4∏≠Í}	çt{CªkUõ!Ω’®âÌÌÆÊ;h>uÛ{¡√ x≈Ô`ÖÄ›4|S^Â}_;Ò°P?Vy©¨∫¸d¨TÔÛâúÙ˘ÑÏ õm-I∑Â£¡ÑUÛw.™•„bxÓïá∂S4Yïvj(„ƒﬂ§ü”‰“
„œ’¥wpΩßßy[Ô-Ω5^”…√P!˝∏÷t,ñKé≈–¥r]µA≠Ÿ˙cƒ£±ÑÇªM≠≠“…¢øEF±\…òÊñPFvŒÅ˜Ålõi¥„5Õ∞◊≥5†hC≠Fö,ÁB∑¶Ìo∞yÍ˜ﬁPDâˆƒÑñMía—jÒX_Íﬁ_6°•€ª–õciE¸,_æ«Iö?ª÷
t∫ΩcÂ≠är°:º¯Z{¬P‚QìˆZ>∑mbù_%µÆ‘.# Fu©^«∫Áa“@s8h•¥8ôñ“^√œHäÌ©E¡'I-%ø¡ﬂ[î«<?,≤®Œ%≤≈C’Tñb€ÕN˘∏πs ≠¢û>õ+`ëÚ±˙T(ÄãÃ–|d¥Dûí%ˇnÚ⁄5¡sl4îÛ ìtôÊG˘ôo¶	-ˇUãﬂ1¢PÒs√B\$1|Û¬ï÷·£zR˜
»û€bk¢≠ù6ËΩ‰2˛#∞Ò◊~S¶mÚgæüû–YM
pÄógOÊt_@ÿ›}ºyú›pÎ ‹ÎP|∫i˛§3ºä≤´>˛´P5îX-3‹ÔO¶–’7E·⁄’Lº~òyßFXá+
ˆ8VöÖkœ"ı±[–®d8Rz„wRryqç=-ôU÷O}úÜ‹ ¸t8¬ıüíX*ƒ™Ò◊—;˜®òëb‰78Ö9>Ê∏ü|?çœ◊∫ûc@Z}r˛“Å	@w¯¡teAßß'3!	® ë≠LµŒ<VôÈ‡™$›?—w9ˆÁA*‹¨ÈÔbæÁYSev[LîFF‘ùdÊÜÅâíêeÆh“¢W•M4ß>ícçÂaÉΩ^RÜÈÜZÕyÏt2*?T∞QY§Ü[\1o≈¸≠çø∞%®Ñ≠√1@—|ƒ„ŸÑπå„πƒcÁç(Ô&πÎ≤ô€œó<c®flå≥ŸÑºBH¿wõNëï∆wêœãv4£¸òÀ"PñZ¥gDWéú∏ƒÜ–Å+éIè$◊æ22TÈØ¡'ÆZÏ0Dñ*¶.¨ÏA≤ﬂëA≈ÇûPª@ÓˇÏE„d⁄Ãpc©Pˆÿó$ƒ£mxéºè˛¯/‘i
óJøXˇ/ÿ“ ÑÂcé^(À§¸∏Z‡$åó‡R¿#‰åvN¿π ÛJ… -çAÑo
Œâe¶¡E\vªŒ´‡°ˆ…⁄£ò+(Áú#œôÚ¥≤ãØN÷ö7a<ãS¥xﬂáΩ»oóœÜgaÏwGñ=äÜæÙ§ˆ≤L$jx6MIVŸ≈◊°‘ßgÔGÒÙÕ∂Vƒ⁄µáb≠î◊Q™≥®≤9Ö#ˆa˚l›™˙è÷ZÌ¶
*ÛóV\¸™∆z™Ÿ∂∂∫Æ÷Vπ*ß9¨%©Y°ß.óÏáÄ\ÑŸe BmC3@p‹€‰ö^°´ÊQÍà£◊‘Îñê^†óÿHõ!ÒÓ≠Î.±∫Ó©ÀÍÎﬁ@8∆¢Ì@ü+¶jk&1¡¶ûú¢8≈wÙ.¢0¡Ìq2ÉëÍYvÒ9ﬂ†Ïi{%“1´fî¿IœNÊNô$œ™’n£aÁ?ÑÕ%>ŒVot+J√>◊6D{‰êB˛j∆;øß$øü=âoõÇ‰,øò)…Ê˛„Iæ4‰ ¶$”ç—KŸ¯}'ûW…º˝D	ùí° ç˙îÍ∫ŸÓ‘Ôun◊•€ln0~—òãƒ˜¶ˇ≤Iä_äÒxb,ËKBçy“øYüd¡‘£én”CΩ=éŸæ–£¢;íœíÔkeÓâ¶˜fi}ËÊı(2¡À ÁTÎåâº^ËTä`>©Gºéó·Ò¡F˜@/AÒùnı…EÇËXp+å?˛uZ!†[§˙0Ieòıäé-w”ó‘uMÆ§5êÁÍI∑ÇÀ'≠8gßhÚéÉ,¨Î∞ß
»p¥w\˙‡¨´Ã¿Ùºo˚{a)⁄2Ém<1((Ÿ%¡±2é®∑≠-ıì\Ø".ØBÇC›ˇs°AΩño+ó˚˜|gö›:
Œ“ Ô^Jr∫¥tÖﬁ|√û»ß‘ï."WTèNU5ﬁ!ÚÕ•”4]J,e¿)35‰µ·®wŒÿW…`ÏÛ®›ßçí¢πwäi4Òlí-ÜÏxÎ”≤î>ä\Û·é™∫ÎV9{w˛__NﬂÀ¡W¿Kæ“¯U,-ü!ÌÔ∫{ö¬&4DßDñH¨„¿KG„")Ÿ7ï‹cäY∑	®ø˝Ã,ö˛≤°aJrL“ıN”ÄP;òÍ„ø‚Ùnáÿ^…ª©7ì)/8P»m‰⁄Eúi5ÒÂıËrùıh¡8r)˘eDumÓÚ2yÅ°Ã0g¯'eq+	˜Åø(>Ê(cO`ËAÓ‚°3:∫%§#†ñ:»Ä@Wãˆêmzò¬…Cö§¯Ñjá¨¿DBoºû˛èú @Ñ&Ã˘û˝Å5n¢ñ=	œS⁄Ã—ƒ_-RakÄ†}œ˙$ˆê#^»¢ºüf°T”`ó£µºa/ì'®∑.í≠†‚”ov
`R”hÜ?ú\Oéq√[∞§LµÆ™#/Õ‚1∆Êh*ÆT$ R˛¢ZEQÓÛ¯"ƒR€bˆû©‘…Û$Ø}±ì˜}”PL˜≈"Ìı¯ã∆‚Ar‰-0ì˜S˛Æ°]vdZ†’#Ò¶°‰£`4Àéîøhj1CÓY§≈‚M”@_M√t!Ç„/bπµÇæBV¨<(˝≠Í“@Bì,Â	∞ #d ˝Ñßé¯õ⁄q≈–M_W^±∏ "è [e©‚¶Ω4±¶ ¬ûw ≤¯ΩÜ¢äu$6!œ≈=©8æTÌÂÀß,nßºUñ&n6∂ÆX2J˚mN•çbu⁄À-óKY*[|ˇZih±&&X¨iÇÀ[“ÛõÌ+á‘>Èû‘<q∑a ≈¢êF±º% ø©-ÌùfA¡;'A:ëW)ì^ÒÓ0©Øã∏ó…•∞¿iW;_MLf¿›WªÍïû),†jI∆√MŸ  ^–«è`À[_P˘TE(˛ì¬[¥%V—y⁄5Ú@ó∂‘|›dß⁄ M®·~©2“√Im›¢í_~—ïQsh.©RL£HÖ,IÛn◊ÎìS≠›_ù-ÍÁœ7„üÀIÍz⁄vF…N;8(∫ß∫g™√i¨ÓgO™N[T•:mìú´„≤pYgë»’”fqïSΩûjü0N√[rπ˙öøA…xâ˚ÇgKïπVÿÇÜV?!ﬁ“÷1KË˝] Ï¢ä∆Oïe¶Ωvs6;ÂÊè_ÃÕõ¸çîŸ∞õı>TèZÀTdŒ!‰úS„'Û√hñ›îÁ~‘ôº.Y‰f˚urëHâ L3µ¸Â™&MCÂL^ÀÄ§¶ûüzòv1õy=ù&9öå‡Qêö§ÍÆÉu/)Û;\É^”Ü°¬&^(Îã…ÁÓóq"M¸`BIÖ˛sj∞oŒ´RıX<3•Y≤©g®_›:’iÆáhË∂ÑÓÕ%Ø-¬…¿Qâı˙ƒ “h%\JÒÔ1~F‡øö·„±ÆÊä$®∑yT#ıÙò&Îáy_∆a„	’Â`)I©´ÅO‚È’ïåEÖªu’ü±¢WißNØìb°ï‚BcR1My£Êç˚ﬂÆ>‚ì(æ”IK?å≈M†N)t)ˆF_Ÿ‚v3X¯∑I£≠ÃU5p«4&M=ãã6(Àå(eF^=ió{∞§)êµ˙p
“:*”ã‘á~n1Zü¢ƒ;Õíhk!
ŒrXÔyL`yçËÇ§õ‰5Ω°¶2@øô€x–¶F¨w«e;®øÏÜŒF-1„$Ç≈˚§Ûlñç`+@”|¸ÒPq7ô	ØÃ·p®'EπMIûb°∂äç‡çiäÉ¨Ezìõπ©∫Aﬁ= úA˚€u[=]√n‘◊çªm;‚ÃpﬂÒÈ—≠røVÏZ?GÖ<lâ•1íG¸π61©Ïh–TÚ{¨M¡?[ ‹¸Sã¢~∂Öˇ”`ß}t¨kÿQòΩL<™"Dtá(#ÉÔ©4Ú®≥-π»úñá∫e”0VM[%ÏÅf7‘ÜÊh4mc£‰®()NJı∑Œ&"¥HŒπƒÃl‡'√Cáö¿≤¢ÛN¢’mÆî—µjºòbà©^éÛÎ(»6q¡zﬁ rX≤‘?ˇnì'Ü0°r›$Kë„· í^¬·˙Uˆ¶úƒöæLol¨_Uˆ∫îª·a¢ÀPÄP°≤˜€˜√öÌ€‹°8]¥Öéî†Xz÷,ΩÜBÑZîïQ¬ã?T!vLM Õ≈^JOô*·
⁄7oÃ±]å"_¢ƒ+äîîˇ%±ïJ|ôÜdmºDíV]ùÏävºqnKΩ7ı‹£a¥4ªåè5J(Î≥•âëı““àóÍe◊^^&<ﬁNq:9EÈ∑s@ﬁÏø9 1˜∏cLûçÌ¢åêYé<ŸB´ØÉömYj&Ç¯/¥◊ Sbœ@ ƒ ˚¬™ãﬂjŸ%®ûÄ!dÃ,–%ÛcdBcœﬂ|Bí!Ω%"ñh\%wˆ`AKªD»RÒxc∞9∫<ƒf>©VçÊyıV≈n8ôb|ÅøÑ ÀÍì’0ŒŸÆV¿‹®¥ ˜éQåI%Ñ—vFÆÀí&4∞ıjÿ¥È,;œ«zm≤ƒæò~î≠ë∏Ãa˜£dæàä…1ê‘%ä≤¸S≈ÒÖûÄ]ÚîôœΩE7Í1ñ%∫Ñ7:ªæÅ8ÔñiïjÃåÀtæåú$:˝™'≈≈ìB(öl∆Ñ¬¬ñ^kŒ≥KP
jhŒ“nÒh©÷¢]®£ÊîgùÃ5Ã°π›w:%ßb£ﬂêRåø%Kñ€ÿ£õqYÛ“¸üˇ;fºf-`õáŸy†õÛ"›È†*ÿâC∫∆√‹Ì5l°±+Œ€.Öøª*oÃn	Àïqï#Éhõ[ksÆZÉﬁ=Yäı5Z`’∏U[•M›∂êõ’Eú•:∞y˛¥∑¬T˛d. Â/Øv«HTK∂˝úBÎQd›ÛÙôLj±~Î+2~°Ñ’ô(aµ`∞∂5Éƒ–åÚŒ‹◊Ô “:“P¡‘FÌqîÓòËÕ«é–´≥á(·—eE"4z˘.;<∫96’hâ§v»¬Zñó¯’∞+E~±íè>ü⁄t—kπ&ªIOì2√aÕ©qK˙Û´åÔQÜ0Øi?e≥Í∏∏Ñô/`+ã.µ»<– p y'ò8π‡÷$8√‘uÕ≈xæ]b-Yzgán`nr©T§g/qEËB$>ºö˘fÁG) mIÌˆEπS∞πŒ*;,[ıÓ¶ÛÙÉG—–ûŸËTLŒ›§/çûˆ$V\ˆà EqˇvçöEÕ4S∏¥ﬁ%bfqY∑Ê™ü´a,äl°©±)∆M≈s’é•tÆÚY®p°#≤/tGãT îM6Éd¡ˆ≠ïΩ•6këj
Uó•íR∂HBEf#"˛»B˙5[ƒ3M◊‘ŸfÅ?‚Pº˘¥|ƒºwèΩ¥dp{y∂3ùﬁ›&∫h$Ÿ∂häÀ∂™Ô^‰o¬‡R∂Z}·‡*<]ÑÉ∂∫cÇ1úV¥ÄÜ”¸Ÿıæ_’1“¯6]Z±{Ü7∞ë!8∏√@ÿŒÚsÑÊg:™⁄u!˚Øã
îBˇäH§"E◊^ÓÕË mz¿C/Nÿfª≤p˝=éÍı	,Éá‡¡;ô/I˘∂ZSæI¡É≤éŒÔ◊†ô`°≠¢œ÷…r çU-£’Ñ;FÁ¢e!*ä†4‚°îôCøXxn)âÍ2/ÔRÔ^1'$s£ﬂÈ¥≥1ª´i∑åêÅ	 HNvÊoOñHá≤Äÿ:Òu\ƒ/Øπƒ/ˇZ¢KïR"]Òµm ΩÓ?èo=m1í¥&cYã+]n»a\y:âq˜Á6øI PÅBx˜ˆ˝M"…¸ˆJ‹4•ÀòÒ]QwA.ä’L_-“\™Pˇ∏!˙ºÚhçy$1LGsß¶ÀÊ>S2≤cÒFS„®p·‘∞U,aÓ¯“ç˙®W¡{◊n`œÒ∑NÏg‚9 6/¬Êu1®©/ãf«.%	s˜qB&	f Ñ=VRÊ%‰’Œ˛19zæ˚¸ı…s¥µcé¿r+ä8	„Ùª¯8Ü∞¸ AH◊J§ı˘ÃC;=¸'§†™>ÒFAñAS1ª@±µÚôıÜdÁ<ùM·˜ J»õ˝◊ªﬂø<Pãáç.b∞±D4¶+∫√√∆AhÛ¶∏∆i¥7Ø¡«=4<&=„M´`
µÜ.≤Á√gÄÖx&¶>$Hi‰*ãƒ»0qFò…A‰·YêRñFr
c8È£s´Z¯(·pG°◊/ÚÉÛhØÛÄzuIop`d?;ûMBáQ=«AﬁEåTQ;ıªQÑ‘a}8z"`ÌYíDÅ˜4·zeGh{Y2ï˛@n pÏe›ä˙ö‚r>(JmåTáiŸ?∆êlòÖiDø˘^˚!A*I≤>Aì Ωy'}†.Ê¡Åœ¸4É~Ë∆…¨2≈ºYà.Äçd+∏/ZÀú;Ç…42DpP ö£’Ç≥à<LHîú”4öAe‡<=jƒ<≈4+<<yÕÆ()“f—D∫‘˙‘Ø4/5sáı⁄’mB]ﬁåÜYxctóq^°OE˛%ôId∑ló0≥Js≠íÃHx¶<P„√ë?=®w∞;≤Án—õ[U¨≠WiQ1\¢OÒÖyáÌh€åBU‰–éz†æπ\9t∑∏©ÏTJ∫–Ç‘‚u•ﬁó—íÌÈEôŸ\©Ôπ’ŸéT⁄µ≈ƒsÀ¶‹æ%EE∫¶T∆éJCúiD)ã√Vû2PâÊAﬁ=]	2ÁH‚£a"9|=≠·±ƒæ ó‡>y Vø<£„€à€ÖL¡’π1F{‘&F€ZÃÙl—À/a:F;_ÿùóˇóΩe8∏‡-•ÕÜ tyzû∫EµÁ˜à^ê˛'âC◊’vaË⁄æ˝n¢–Ào‹Q^≈∂+oK≈V‰ÈœÄ:ªﬁhB•	¯HæÑ•J},˙d≈##$£Qd ›∑	¨§ÿ¸∏ÈnµDç‹ÂVâÔiÍ=K•Ä’ÄSla4åtØZ~9InP)ô+EWp˘£ âñó£‚©∫…‹ºA]°B_*Ì]ŒÇwˆ nQ≈ß˚Öi˙k∫ﬁZ4ñK°Ñ√ZW–*h
Ubø)&Dá† a(h4íé8´ˇù˘,“ß√0€Ò'al3lq¯£æ˜Œv∞ƒût≤ :„{ÈµYKÕ  ä83≥π–3≠ÒQpƒpåI.äÿëK˘°fÒ»ë3ÚÖÑÒπÀ€ñåÊ¬,zıß‰Éx±ˇøòßEØä“‰Ü&{:ÙQæx˙î¨‹,€d…¢Ëì√·É•~d5®7
∆Ãr{/2Rrs¶ÉgU∫¡
†~`éú2<æu‰—#¸!æ⁄*6(È´ç©BÑ‘@BÑbÑÎEíL£	qP~hZX™C˙4i±G0·CŒº	qõ ±q÷)cÇ®$^2$GIDÒ«I˛å
πïÇì‰4¨©›ÒÍf¨πßh◊°PÌ=¬ÛJ†f€ …g>SHzÈ9jO|Üh;‘Ä∫/{b}ÌS!ü–ô≠#v⁄Óªd
^uﬂQΩ+
^Œ`Ôøk<:¶Û∂âRòCuà(≈è˜àÇóq-õÖØ )x˝ñ@Rrô÷;¬I¡Àôa«K°≥—‡3n≥-◊±SàŸ¶‹
AE˜Çä
{ÒìA©∞ÍÃx*Ù‚˛‘ucá≈©@áŒ±[+¿WÖ^‡*˝rßﬂ=|±º˚˙øÙqÎŒP0π ˛˜ˇ°∫<1XËıõb°óaæmŒV◊˙*ÅY≤N[lñ |¸ÜÒY2r™˚√i—wX-∫¬oÅ◊¢)nqÃZòŸ∑Wî•MGìƒ≈>i8(ê38à≈£ ‰Gìã0˚¯Wf˝ác–2À2DœÍu—]sò7ÂïîÇØΩDß‘t⁄›B)üñLt: Gudı5K†}†Àö5ÛmıÂ∫ˇ¥ 0*¡ºjhæ9ΩÆ.ä¨!|DvŸVdsò‡…) %∆eq“∑ÑîiöpZ∆˚—»ô”‰eëßhö©π’Û«‘s´ª4Õœéñ˙dé“i8ôM^§Lªµûáy∂I÷–°Œÿ<€6Sü!	Ë•:?Jı=ŒNõ›87Ø1€=LP^Nè¥Ê?Ÿ~®˚t©êÏB>˘ízSiÿ^ÅU¶Œ˝¸3c`1'È∫è@÷Ìa∞
ó4;ñ…ãªñó+‰◊Ljòπ¶ìÖßï!≤ÇCç“≠`bFŒ01‰3ò¡ïzY¸B]äx˙—_~!oﬂıË(ÖXEH3yˆÜ?ÄÏ◊≈0fö⁄uÈ8ò‡â?ŒjÓJ”ƒX‰Î^"›◊ı˘M¨≈¸‡…ÇÅöÑˇ@°r‘ü0Ô*—<ı_ã4›õ CPoA{≥ÿ+œºî¬5‘ö&â"O®¨%?Öyìz˙¥ä4fyM≥7:Ã^ÒMPàÄ§≥Dqä
M¥cÖ"ZCútQ=Ê»™«lëoR’9héMÚéÍ>DØq=ßÄ®Tˇ)¯CeêƒFx!zôïV=ÏK@â)™÷s$òn  –˜P|©dèûãQßV¶™ü¬,ÃPWèäRÊ5ã“ÇŒÄ _]ìe"ñ~dÆ√±üÙ°hÙìùzsËúÂ!50=:IΩ)¿Pf6‘x@†gÅè÷<Ù¬ƒÆPËØ.Ù‚"¯ô:≠˝8Ù}†Ì)BÙ!¶Ê8ï”ph“¨°>,oJs˘r˚∞ÕwÜ•QoOè–h·9Êõä®?hñú2{Z7∏⁄dé◊M„ôL»jπ7fIOgëØ F(rÇñ˘Â “}	"8K˛È^æ0ûãƒ÷È•Zc≤…&˝ú&ó¯πf
Xßï°)∂1ôvìJ—⁄vç∫¸-∂éSÇ“H¯L’ˆ\∏ñ›ÃQ(†~Ïòﬁ˙)˘@˛˝ˇ#_∑o> _j±≠πrÃJ%k,–«Ó¡Îì£ùìÉ˜«';'ﬂ√üˇ˙Ú˘Ò[±üQòÍ3"¨xFﬁFÄNîkÆJ?∆‹ﬂÙ¨)"ù%ÑÙVZQÇ
9Âøó9Q¯.ÜÂˆ«èR—°\^mÇíßä>÷£â"@	’ÛCam2πd∫É6i[bÄ!⁄Xë£T?N°•'1ß√¯¡u`ÃnpÈœeèM‹ãÖ&ﬂë8µn}E+j¨ûsëﬂ±öˆ`ÇtVåfÒj˘Ìç“’	c™∑6eˆ]|›π’_Ülh0Û4à¿˚ÔFc‚Uz9"Í·°∑l2SöVóÎæ∆ùˇF8µPíπ“ï¬˘Ø5ü3}Ù7<Òï@õ_„¸Wõÿ@pF–ºÙià¡ec–[,™5Ú™*,ùZπ ÀûÖNrëK¨•TΩÄ…@‰Ç≥Kcq„x¶\D‰lãG7r√£sî71ÂvSöéVFìï^„-‡‰§™]&ü∞=≥â√gò¡qâ≠W,tıK$éË@˜4¢É§É¶r8&;≠Ø‡FôxËmÑ)=S?FÉ-K‰≈‹ﬂ¯G‡j'·¬Æ·Ñ«˚Ó∫ˇ:Té–utGpD‰Æƒoh≤2Ù—Ï∏-/˛ıròzy-ÑSÛÄíu7T±ëu∂∑û_íâkûx~Qz)√8ih*eÄ0sßhùyIF0•)LÉë„≠ì∆ìb ±oEÆê/Óø¡U&)LÕ∏6#»–Uï5’+] ÕÜZ◊™¶ò[t⁄J≥¥jõÂBΩŸ§g(´`Jm®∂h7Â∑R£ÍàoåóTKyÈPz∞µ*a#nÆÀ0∫óIÍwóñÍ?>O”$5∏Ê[.æv}• |8mˆx›~±5dáê0]d$ÌáöµÊ÷fG˝ø∆a˘≤H¬V∞#]¥YÁÕ®œx≤OEù®yeªc∫O“<Ëı€'¢èˇLPY$ﬂøy@éÉÛô¬.æ(5N∏”P+nP |·&?∏ç^Ç»)|¥Å™≤∞^—/≤èƒ'üê‰Ñí˚$èí%ßııœJÎ&∑M7!‚ÑÔ=+]FU⁄´zm^%MÅVnE˝ˇ   ˇˇÏΩ]oIñ|Ô_‚®áU›dÒKRw≥)
IMs!âí›≥˚
Çî¨Jí9]UYìYEQ√!∞Ä/∆Îã5v{.≥∆‹xΩ∞__öˇd˛Ä˝|ŒâàÃ¯Ãå,’ÍŸÆ¡¥äYôë'"NúœÁO¨Ú	ﬁCÑ7qÄÆâ>f_0Yã†síˆﬁcàQä~£!≤ÄMOœPúç^&√kπg¨®¬–@3+Æ'¡c(a$m Ô–€)RΩÉ+Æı,ÉÂñ±t	SC@¬@ê≥∆Y ›S—	˘´&Â…F/Dg
mf¥∑1\◊XoÒ~ëKF	JÏ§üvøõc±◊ÅÖéRæ˚◊Oë7⁄ƒ+O£ﬂ∆“IÑ“\Üûµ<]"è˙πD~¶êèô#°–ÙÒ6N{QùL˘pgnw«Õ,`Æéyƒ)¸ˇ)≤Eî|HÍ<Ñ˚Ï‡⁄Ê_Ïæ¸ÊÕ◊ovèé˜^lÌl¡õ÷Vó)·7O)xÄ;ƒzq7È¡ê+N≤.N,àûÖ√¨Èª±•É(ã∂±°«4Rÿ¿x∞-Ãém2P_zÈªN2∆Ÿ◊1*ŸF˙%wÙi˝_ÄπÇIxFs¸ÌsòÅEﬁœ°ÿâm6›NÏF}Ñ€Dü‰‹8ÕâÃ,·GôùØÿBOE/#Ïëp”ó<˙¢—˚ŒP∏^_ƒZW»NäDÏvòMéùtÇdÍ[£◊Ò¿å»WJ#Fy7âGgÃÈÕ›—=ÓJÂπi∞˜/∞HvÙ€§Ø·∞R∏Ò}<á-º%Ä[xÓ§y´—©πÆØ›'e0[7÷Ò£úÜ1˛ò’ºΩÙŸ"t_¢∆5z!ZÆ÷Ÿãh|ﬁDó≠/ƒ˜dÿ¢ˆ3Ò≤’e¯IÌ∆Øíﬁ¯Xy‘n7xÂuÂ=‡	‘*∏°∆ZéG7∏˘ß8TL4CZ¶omuAçÊQóV¸âKÕm/s°*A∏0¸"Õ‚o„ã∂ıÔZ§∏ÃÇJe‰∑±ÕÈ≤Trq,PÑŒõùN¢ÓwΩvf2‰v…>8ßq˜ºàOAcQó$à1pi·:≈ìú0òPÆ\q®Uù5-ä(Ó@O`/-.≥ﬂ.æZ]^~=Á∞Và“·Û&{–Hå«:6èØÆ8guœ2∫ÖÇ=zÓ·?/¶Êπâlı·?5âä+Øa?\-A$æX6#ø≠TûÀæ¨OGÒﬂÔœjh™¢IZ˚‡øKìÔV7Ü^Ïƒ∞‚œ„\⁄«j*‚kx¬Ô/å%ÎO±¢^OÖzÆÒ*úîπMó—àiˆ<=√M±{ëÙn˛°ÛÜ¢é\≤ÄåiF¸êd‚˘‹A#€VÆÌ ±*˚:ΩÆ¨∞‹'lûˇMû>˛ïµ^¶ ªõŒo~ü∂12a¶D¯ÀºËgâ$Ò#¢Ìv:zØSVå& 
R•ÔÜ˝4RëF~DƒíΩ◊	∆A¿vûMG1=Æ.‹v[Or€)ˆµ√˝]§)Ë4«2¯√Õ?‚h¶#|∏ïòœSôO1ÀIÚV±‡,~sÑx4«∑=IÅµ0f0=VÊ,˜ëÇ^ñú7Ke(Ö~uÿ¡b*˝Â2‘gızx(q•’¢Ã.ó›˚œì°!ÀpoJYfvÍ˘o∂ ~ˇn–Íô©˜Z”ã∂.Úáa	-O¢ñù-U&~ºâHõp›É?8ÀﬂjOµ¨e˜|q§§Å‚5 ´
:d&§•øLçŒR≤Ó¬åûGÑÖ ›kƒ£ë(æö]à:L©ƒ.G√/)¨i?.@∫0&8Ä£§IçåIÂP~HY\Vq§Íû9÷
≠Ì≤ã@ÚAï¥,∫Ñ®wo[55ó^ÿCÅ~‹¿ò˙Àio®˙’màµk’xZ1ÓªE≈*2êÙ“ª/Y£`Ö~aØÒ§0?≤,;a@ü("ÊK ''¿[h˘c≈ƒj‹œgXˆÉg–!¬–⁄2Î%»ádL[û0üä˛õÆ® Áø˝wÏ˛UèDèí†––!Ù¬Í@<,R‰wîÜ>ﬁ,y«pÔ.?>"BÚj0ãèÂ`N∑Hì7‡EV(≤YAÈü)Æø~‡44Íìè)‚9|Û«tpGÆx!§ŸcÜOtƒ%
2/‡•ı_ph≈Ogéh÷Ó!F8RdÊ„“]µºÄK{ë_Ä›b`õÎ”wÑl≠Ù¨ƒ≥n≥%÷ZıÅ} ˇY}–n{zQìM≥AIœ4¿§ßó^ú'ô+n£Ç<(òãƒ±
îÉôä Y·UHoæFEvfΩY⁄@ndRñ°‰?ìÙÍ‰ ®ƒ≠≈/¶…„jíPÜ˘cÙN+ÖLîÒB#Û”®ﬂΩ˘}⁄<©,‡û:Ôq≈ z,ñèÙıÍ lÜ+mÁ\˜ÿhâÅ$zÜÊÀö‰ç∫¡TÚnπ‡¯bDƒÃË©[yn⁄∏íﬁJ˙¢%&æ—j¬W>ëå¶v˘ö∫—ÊÌêåw/YÖ{UM…†.ee‹ñ¸ÅÈª≈IÁΩö¥°Ûb-oÉ}˝ı˙`PõΩ·ì$(ÿ1¨[¡Ë∆∫;¨.ï°≤ò#.Ê4ãÒ|¢!¥-’§»Û√‰…Mµ:´*≈¥≈&Y®W†rÑ1ÃœòüÓf§%ÛX6òG1FÂxÀ(…ÿ™∂!µò´ño≈èŒ¯ñöD•tnÊ,âv÷Ú|i¯˚ê“º.$E˙GtJ¡ælÛ£óÓ≠·ﬂ!VI◊BŒO?V9_°
˚i3I?uã˘ÈèQ∆†`dóKsY˛ı’k¨1Û⁄˝ï )°¿‰≥ù—$?oÕsç›Æ§>+CTèKcúØÅ`ù$˝I!	UHÄV*»Ïè‘÷:cM$˛§n¸ÿ‘çÙ÷5“¢h\|IséÕ:OMµvR†Ñ.}ãÊœˇü˛˜ˇ¯∑ÏyBïZ£uÂçë‰k 
(0òq—Æﬁïµ‚jN©©9•?^µ©8Ó[È_º‚tWc˝Iu˙¡Tß“≈˙·ß‚ùAı”¥¶p∞gË6¯c◊òJ¢‘¿ª¶Æ[aÍ˛3Rò∫∑Pòd„˘“∞rkù©˚ìŒ¨3uÔRgrÄ˝˝§3ÖÊ#‘ô∫?∞ŒôıìŒ‘§o:S˜«´3iàYŸ*”ı'çÈ÷”¶ïò1•êä
3∂4;}Áç≠~úç∑ì¨€/`Ÿ][¨°¨„
ª›8_≥û»˚VJ…<O£¯∑≤√Î’úØYÉr÷¡raË%Ï∞∞£›…£òùﬂ|œkÑ`A¨àjô!Ø›¸cŒ%Ë(++¨PÌ>Ç;·–ÒT;¥ÆÓÕ˜ã–D=H≈S–‡∫’yã˘…mkı¨ÿ«0—p2⁄œF∞óEƒñΩtÌ"ÄÍëÌ€∆h+¯©|#+5éö%áä≠¨¨Eˇ2]≥QÌ9¯?ˇÒˇ?√πBÀ'‚ÊÔ≤”õﬂõòna≠„B±µÎ…-DNˆ"ÌE}–ãé∞˙Zíbîæå*É≤7¯]EªIé±‘X˝[∂C7‡≈ÎÚ.úF‡yZƒû˝DÎ4ÍÁ1—ﬁÀ1ß~üÍƒÂÊèò–â9¢Å2vA/‘V·? Î‰Tørû«vùfìÆyø(vB©ÛXÈ§õo+”K%Ö(ÕtW˚8SÆ¢~;o”SAúÂ|•∂ÛÉΩ¢V<[Œ≠èçÚ@s@Y7gt∂£®å#E7@ÆÏIÁX¥˛2®\Æ¥ö iØZ2Ó‰¯(Á"ÆZÁó\G+YfVuˆA7{Vâ¶¨ﬂ¨îπ‰ßç„ñπ¯˝3––aﬂÉ*4ªÑfß∞qÁøô∂ÉXÒéÈıK:∑üy±q¯Ãøåﬂ…[P>o]±Nì√∆Ô’À’R«Z¸<ÈGøàJVÛ—,"ãùÜ/"∑|‰YVŒ$=™@˜‰2êã`î•›Ù∫S`óÚ∑£q<jπ◊@Öu©¢òÌöMI‘Ï≠ZÔåJâ·˝µl∑B2úDÅ∞‰Â·$ÃLı¢äî
DËpà|‚–|á^…Œå„;Ê\«¶•ø7ˆ¸µê{_Òÿ´Å∑÷u:÷∑éQ“˜µñÂõÂ*´+‚≠Vp^ß“Ã≤å≥’B`oÙ=√ Nb™ÃŒÅ∏S++Wõ#Ø*\Ì¨[≠=ÿ¨nµ¶øÆ¨4®[ç˙ÁeY;ºÇmkπıwU∂⁄c!∏€¢’≥-+m¥6È#˛ﬁP.GYUÅÈõøßŸ6›ÿÏ∞%”Ï·Wì6˜∑xW≥ÊO≥‘ÊÇ?+n™l‹_&€Wa¿ÚìDóãÁãØVeÒ‡u}J`Qù‘Sõ¥,+ˆ_^aı¸.ﬂŒÛªÍı¸“«ÕÆÓπá"˛FY¯U„≥ç1bTÙ˝27lÉ0÷Gdã@∑Å˘ØΩ∏YˇÔ9¿Kè«=‰ñ•¿cx¡o=–B≤ì*=·Bî(ÎÁ≤÷à1f7˛õúÌ;¶G
Ò∞3Í¯ËV_Û¸sÚyø°Ø’UdcÇ≤˘	(0ây“1Æ£ª®≤ùÛ(?‡è@∆√õ5œÊQøóngh€¿"¥/'h≠Båº˛¶Àh◊˜Å3°¬àÙòµ™A±]¬ıKzÎTâtÅa·w¥ﬁΩ^<·»„µ≤ƒÿ|≤&9œU·a€ác.^>ı˘J¯m>8ÑóÖ#2=à2ö›W›N?=√e:…R∂ÁŒ`¸÷K0$`Lﬂª…¯˝Î_P≠ßiä∂À*¸ND$ê›"uî≈H≈j®VêÒ∆ ƒ}±¡ˆ$}+ÔUúœ˙T=ÂöùÍ◊¢r¯|}”ïÊ™üäz=8Úu}Nî2ŒO_˚¢:ËSmãõµÚ±q6©|™z›Îñ¨\‘“2ˇq≠iÈ`˚iIª?Âíñìv˜+∫¬ñ‚~‰˙ıª=ëN¬KÑÒK.ìµ©¸ h*ÙéaÜ9ÉÊF,®EH˘	”FUy3ÅáK#"ê
√Hîª[gÈIñúETÓ9πƒj¿Nìl@.æ´)G§w—8h≥¢¢∆0ú◊√Îgì$[(q‰_êí∏Vﬂ:»Ö—Eí£_1œ±ﬁ∫‚ì.`pé 4’l≠CDGæY I!%7`àªw‚ì±"§Hf€|¡∑BÄæ√™n‘AÂËW]ÑË_è√îâ*lè7ì ?Gª¡q~’}ÚU~.c∆hπ`ç8ø‚ÚUÙ≠<Û‰$@YÂ÷"≈•àÊïE’“ƒv—‡PJ©E©àjõÚJ£¬‘‘ #Z;xaäfx-«7—∏ll'ŒÅ◊8k>¬}v—«‡WO÷W'É!‚f;π·†‹ÓD5∞K	á<Fı}ùpo&¡â.∫u†?cäA˜÷^/É¯§µêõ◊Ÿ’)üÚ∆Gk≤}ãÈo∞ Ç ”Æ4>$Í≤Ïà…J©»5´ÆEÃ1ÔDÙØ‘ß€«’◊ñï–ö€ÆÆäÿdkıÈR,ÁzÛG"÷Níè“·Õü.‚˛z√5Êã
^1∫•ufª2•ò≤Ÿ-˝Ø+≈ÆÙaWîreÆ'5öÍÆ¶2‰ÀZKX~%‹-∏cúﬁÈ2‚Ω(ë.{~îÀ(¨),‚}ë•√C™ª„è±‰Ïzuô´Uãñw¸°¶•£à§È£Æ5 2≤>9PÃƒ≠VÜr31àE}ÃÚÍ ≤¬jü'CÌõuªƒõ•Y‹=ctê•®‡aìÈ@R<’èêZH◊¬MÂªª¢~Îrh˝÷Â9∫¿cÓ¨"´j%7)G‡|9TÅ@8bGâ¢áéE≈u({òzì±6™€ê0ærØ™ë-àD”¶4(◊∫πÒ"ŒÛË,>˙Õ$ ‚ihY«Ò¶ZW"°Ÿ&jñ_¿}rÁñ{àßXx√¡ƒ¯°êsÌkéúXoFÅ+Fàb~Xüñ±&¯]>åOØY?:â˚àIz˙ßs2.e®«ñÀ˝⁄É„åA4Z`EKÎLZ—ÕH2gÆAu6*ù=ûÙÃ∆5t´"¶‡#H∑Ω{‡∑#iQS_Çt≥ºˇ˜ﬂÔ°7˘7Á-g⁄6Á¬π`À◊=ÌO2˝e|Øo«£Ái˙›d|ÂW(–"EQÙõ¥JJn"Qü
ñ@æ!+Ë2*à!LÈhÒKòú}Ûoq±£‰∂π˘üËHÚÓYÿ˚ñSƒõqÕísè∏;Ø˜|óBÛÄeæÒb˛ágÙÎ≠A≠èAÎÏÛ¬yÁÌcÈﬂªuGÀ¶Ç{{ÆtÄ2˜È°pqº∑éE8e€;rn\T}!s˜õç[∏/|£¥¶ÂiîdS"]´∑ûŸP√`_ﬂ‚<‚ ¯?q¢B$f º_¥‹®≠wùAGâ˙X
Òú™ºÆ≥Â©˜¿wøÔB∞3ı…yrÊï«W¸è«ó…xä∑ñj>‹õd$Õ¡#ù’á∞É·hÜn‡?{√˝…xﬁﬂê≤ä†ªÛ§◊rñ©;Œg˝bWHÓe‡≥A@5ÿ	N[äZM®∞¶ºZ%ã3•:bﬁHûFI^Élpñ¢¥¢Ì◊ùhL9ó/±¢3≈tH˛ﬂCØç˜+nø˝AV4∫óı·lÛ mT€œÿ√‡sÔd¿¬,∏§l´öQ*}><”∫{¯o7≥≥Yt0;ÓöN«§ı¸´Ä|O∑ñ5âM3Û∫í#¸Å∑´ËŒ∏Ω¶B≠Ã†≥£›è≈vSv4Ï„E¥[.Æ˙i^>z{“óm5TêB¸Q3ﬂg……Iñ÷1^]ÚL	/"P¯UZá˜€ío)§t÷J<B‰Ω_>•Üd–ÈÌeT≠πÜz7Û’4ı∂ˆÏöÌ8àÄón˛€0IÎŒ^Ê∞uEΩo!Ö”wwnﬁÍ%"içãâ;onÙ'πV@Îˆ-¯ÿZE1ÿ‡0˘äys‡	!*»:€éÚà‡˘Ô≥µáÀùÂeêT∑#P+‰’/‚≈ö´4]VéCﬂ[£ñÙ.i÷å≠≥É˚Ìj‰£-˙Äàü§“»T|4K“Aπ$X+tlWÖ3âè‡N£é≤®¸•V
⁄dÑ"£∂#Z@í6Ø4∫J†!H˘ÿ(5ÁãË)ù.IMÀÕPiXfk4»N´%p}QBk∫”!ÂÍÁ@A6	◊
!ú∂@(qãUıOjgYÉ5D9d≥]=‘‰m◊Õª≈µ’ø∞U„∆| ‚ú"€∆·t[¯&WŸ∆@¨™∫sßÌü⁄)•îÍ À˚'yú]D7∏˘ß∏V£«÷¢,é*)ñ•ÔÄ<®^⁄Vﬂ¬–gﬁFI≥†d≥<=…bÊQÃ˛lÒÒ©˛ÈÿÖA§~\Ÿ…Å∆ lºëÎ?v8oÛM.Ä(Ó`Ø√ñƒ]B7UQºV8wˇT]w8ΩåñÕ≥÷z]à2kæ·1[?ÂÈ" íh8~<wvûÊ„9˜ÒÓ4x6”·#]_onÛ™◊Ÿ∆“S?ì≤Fê«›tÿÉâÖ≥è2Ë~i_{&⁄ag~¬Ê_ƒ√4g˚#æù	âr”ã+oU¿0}CÍ%yt“è{ÑoÖ¿
QØÀÖ4ß¿∑äöÌ·è¢˛÷ùé@„£ø≥¶Ùû_7Ç„∞UOﬁJ}™ä_≈æ∑Aíêmo˜d7îÈÂ!hjÿ_>÷ﬂ-úÑGÔë5Uÿà¨eóclõ≥Á(é¶ÕÓ∆Ma¡Ã
ê∑úı"ÜvYk´7HÜm,«›Âø¿@éÅf≤ònƒx$~´ïSuÔnröt·—AÑÿ~™ê~íEÏå@HÔE	&Ì&√|2@AXò÷}äU¬{ò””À¢¥Ω ´ a—ÍWw°òÂ£5ºGM‰Ü¿ˆï˛8≈õ≈π˝&≈ò≠ÜA?] ‹§Oø?ütAE~û¸´#Ûw¬VÏwl;â^wèß∆ÁHÑº6Î$C.Ó‡ˆ∫ ’—È≥≠·Õ˜˝$ß9•˛HÇπAO93ÆÙ◊“&≥∑ç@@Oﬂ1¡\{B´/œ≠ò∞´<«∏èbÌ1^∆∏é≠DÔ—ÙIπﬁ⁄∂‚/¶G	í–~=˝f?í‰œÄ<Ô¢§‹ex;qÛ±ÚFªiT°1áì÷[˜‘ÒîÆn¬XÄ‘‰í˙√:CyÁVDOm]˘äŸsÿeúª¿“·Ï≥÷ÛtAK[∞50'mI.œ∂’EØ|i6°{ìd¡Aøzçaª∞œ‚V+Ív»D‚`ùò»„ïÌbwD_Z¯DáÓ⁄2Z“§“µoÜ…{DèÒ=>ﬁ#˙—–ÀmW^D£W˙Ø]p º›ﬂåq¢Èvî‚ÅÂ˜O˘˜ﬂL@ê¿∞‹u˝oΩπ≤˚Ï3•∑ü‚‘;ØúkU#=Ç"´ÂâkZ>UnXw‹’ø–ó≈Ò,JìLÚÖé•bN√BA.àˇj¸î¢·dw?ÅÃÿLJ Â±ìEßcôiM»à'ùw≥Ñ‰!ÿsœ”w2¨C±∏˘ØíÒyk^t´˘‚LÖ>∆9:ç†·É ÿÁ€éÈ µ îe¡´«xoöA®…T£lÙ§ònfiœkq•ÿÍ¢ÀèXË≠~#Ä:6Ê≠Ì^„Ùä}¢,V%TH<´∆w˘‚}léÊ3ı›ûgÀcRæÿéü©≠€è˜ÒòßˆaL€ó∏˜¢Ÿ∞˝Ë ï‰?˜≈Sõºvã’Ë˝‹Ü≠è°ÚÎ»ŒîÊú©‰·A•(jÒ¢>Ö(P æÊJÙßáÀàÛ†ßÉ‡Zï‚ö_ª·—ïß«Ã¶ßõd∂p©π∑%˙QyN™ëπæ⁄ÂïI.O£ﬁYl˜ÁsΩ–Gô¥´eıkXmbJ»~·≥Q¸Ã@E¡wè!É:Ïúü˘#§b¡ ÉYÓ¯™Pz&JÀq6À:Ëwû<ú/DR)T’• ùl≤?ˇÌ&π_€JÃ?o˜i@√W¶8ﬂ: ïN€©8;-ëæ∞PW°'äíu±*≈ÃQ!ƒòùì~⁄˝nnSh/7‚Í2-ˇÚ6ﬂà8≥ê˘πõªnÚÍV6Ò\Wi˘ûÛjpñÃv´gåµÆ^]‹ª‹æ˛§Ìú+˜¿›¯ÆNõ8≤‰ïéî„ìº‹±Êe/k~hrÊ*c{snÒÆÛ•£Ù´7YÜñëC€“~\aoÓ¶èˇ?èﬁ#¶ZÈ©,ô fÁÊè0=ãh-f?/¶®µÖ’Ínæ']”&Rπ@ÇàPlA%Ω“ªŒ5Q¶zëﬂv!˚%'P:ª™‘-Öêç◊P"¨’ ÎÀﬂQÉj‰’à‹ü0
¡—=àaï‡zıíËGõu™ñƒ√“/Ñ]„C¯s≈√œl)Bqx°Ö¡»‹ïömæaf
∑≥Î{Dö*˝[˝‘·/’EÜ∏ãt©(íØæÏ<)d¢º“⁄˛Ö!ÍÈª≈W´8‘≈ïFõÎKvUÃ|@Ó¥˚≈¨'¶Ç∂∑KŸÆt{ÄÆ]‹3¥¯èˇd]Ì∞Ì¬GÎ°*Ô£5$fkiy*ÂOGÓ›π†çN“(Îmü«ˇ—´	zp¯Í¯sc∫@â=@∂tÛÁù/åYø$gVüæä·`÷go¯·ãP9ô¸‡A-Z≤˚†6`≥?jM◊j	µK&m≤K"¸|aFc˝hxÛá€∏Ê»ÍPsG_}dŒˇqò9gp
ö0Ñ§µñ„ëQâZBDR°%
™ûBT^ŒCnz40≠-ªzVπ⁄ßô¢,–´*„ÇXnª“∆·aq´ï,ÆÑ»G^∑Œ6v`wFŸQr6¨h¿Æ[ÍKÖ-«X*ÙãeN[Ä!“F-DIò·N)»⁄hT•u¡d‰÷™≥–èt´¬ZÖU°¸ Á7ç◊çŸøJæÄÇ´"òêá}Ú?¨–Z»„êÂµpC∑}∞5z9óÒùlq“Å|»õ‰|¥60⁄Ö›P3Ù[«¡ ©”∫é"&∆√M˙7ﬂgâ(4Xˇs/-â…“ﬁïÄ; 1ﬂ»∏«5üQØÒÑyØÏ˝ÀÙ"CÄÛXïú+ƒ*o]±Õ„aœ'#:ıËv=;r˜h˚po{kNèØƒ4Ög<Ú„ÖrJ.∞cƒgM≤‰∑…écYƒQ¬∏iÿ;¿¸™í}‘˚,‘ﬂäØ
4(nq’Ö‚ˇ∑[œ˜Õƒ¶Qü&ó∞wÔ;ìúd˜)‹<dút£YÆÜ¬$® FÑ	nhc:jÑÖ¯a úê0L»ä∏¡´±îπ@¯€v˘ìó…oàõ∆i&˘ÿ√äqTDÒ5 à ™ì«ÄcZU›> ßÊ;â=\ú ﬁQ~÷x8>ì`3≈¸0&Kfˆı)CèÎuı˙∑ëKΩ&•NU2¸"ÃIYÑ{”}ºH7Ø˝úÛ⁄`W
wiÈ∆Âô[åáß∞ﬂ!Ö4›üÎ◊≥÷È©Ô?,uÕÅ÷∏À!w+Úÿ¿†Ö∑≥ômé±Í»vó`–8(|≈Óå£àJóo/c≤UˇE2<≥´∏øZ}Õd7E›µ1ÂÖ..´3¶˙˝ÀÂú]«yXùÙáy≥-tKDﬁ`visn]R‰ÛÎvK)Ì.œnM.ì~Çà˚`;•å!D=5"^Yû"î–E irRzÅ—û) ªîñπ ¢_Ozºf¿%Ëz@Ûœxqª¨$Äß<‡.≈'√§õrwÜ?öWLxjG0Ø~ã»ù(√yU—Ü«ÌÊeGÑeÅOËÛ–»«°⁄‰ò7¿aƒÓ0’ÙPép˜rîQdÕÚºYhÃÊ5‚¬gd–’´˘m‰\˛7ˇˇ˘ˇsÛﬂÁ_ìïƒïYÏ´âAÊ≥{olFÊˆ‰$¨µNöß)*‘ÛDò’ÂÅR∞ﬁ∆¸Hâ∫™∑ûCq(ÈıeWÌqªµz3m®ˇ9R¸¸œóD˚ˇÔ#£˝’[ì¯%!˝$c˜ØN∏~Bæ:Õå9Áâ∏≤v-†5GSÛ◊oÕaœt^‡l>ƒˇ<¬ˇ,˛ÖMÎ‚?œY]¡π\≈ˇ¨·>˚õ’œ˛Œ™{öÇ&éek:BN≠PJTYUÛ©@4iΩ3â∂lH¶.r›Ü<ùèí<’4È‹1M7•âö•≠ÍAÀö$(@rËﬁö’Ù4x\KáÙiÁÎäƒNSı@‹Z‹$è22º˙mñﬂ`Õ±8á≈@ZMï¨6sã*õÒl„4K“u•öZ?&ªb£áå≤mtÑt’™miˇ\´¶Ü!Ò›§ód•ˆÑu!ì·$2K±Å&uBQÒïï’KñúP+¢È)¡VF•„	ó&Ê*µ¶ÁV˛˘Ôˇ”ˇ˛ˇV+hg‘ﬁpÍhyÃëº‡P§ÚÅ~˛∏L"Ó⁄_Ü‚Ö5ø‰(rÀÅ—¢ò"}a¿ú]Õ3óΩ†ÆoeÆZUDÎ·ïFåÇ|v$âÉ“zïËá.JoÛÖ|˛Seœ0JU&í¸˙Ê{G1Beêˇp»U∞â2¢&éÒÊÜ›$bΩ	OW¶ô8á›ä“ãÛˆˇ ™úy≈·Ø˛TÛQmñıüùÃÌù≠⁄}ﬁ'ö÷ÖGD…åmY∑ıôH˚Cßy›CG?–“äJ¯Ÿ¢ìË8:iÕü””I7u«Î8°yeA!@?(ã2D•8†îÚûúrï{"˛™aò¯kÖêÌÌ@pá≈–Áıˇ±≠∫;-~Îz·Æ∞Ú4ï¬kk*TVsÒ´)7+•<EÂ©ã(WTPû™|ÚÂ¿´
¬∫Côn[¸ÉÆ‘¶ıøZ®Œœ,‘ÜEæõØ”fµΩß?éõƒp‹ŸA¸W v¬aúú& 0&ÑÕ∫-eNˆ"Œ)€’|pÁs•J’’T#4îÆÚìP∫CId98çÖÊÕˇ,±ÆPóx7\cµ‹àE#RóMrÒD±]ÆÀõ
çVÄÄ·ÍÌ ≠\üΩÇ)C∞º≥}≤<=ao9¡≤vlÁÊè'à°çÎáÁ`≥ü›◊ÔÆJ&ÀÄµp‹7Lá.Zw8óçWòO’Ωeé¢äíﬂB´Rgâ=ãªÁGÁ e«µÚ˛Yπ‘°îJÒÍÀGÁØŸÄßQ(7¶t∞mÎ’æœ¿Pø3Vƒà˚†Ñn⁄∑bÍÕ2D=¨ì'”≈ısúbiπ”î=ç≤uVöCÿ—dÄ∆'TQO_»∑™ ,ÒÜd◊x\W®´FÌuÆG+0c¬Î<dKÅåTô≠”PÍAvÆâ∑1?gÁË¬ª≈/üs¯«æj@Ü#˙®?}B¸©@mnm9  ~„õ6Åözh1® b≠Ãàp%Ç´∂ê≠¬ÜR∫sp¬"§±mkåáKØ≤.Ä”\ˆã⁄ÄÑ‹–Äuôó()Ω=nOB`=#s≈9˘d*iÙ›‡L¢Òh˙˙ÁÌ|ÒﬂüÛ™…fe±à\O=c~˛s6ó/í<9È«sﬁ,â2≤Íﬁ=≠ﬂA∂NTÕS¥FNÂèm€⁄Nk˛î@±?ÀÒ∞¢Z”Y[™Æë=≈û|õÜü∆∂∏Éüä‡`/ÏsC/çRa,Ω2%õ`Ç±ıKg]MŸüÚ2ùc˘wàìó˘'Z`ﬁD ûEÙ≈;Iﬁ≈<£o)¯ûÉHΩù;†o•Jr8ºœÓ€˜W€«€(;Õœ_”sº¸÷h¨¨ßºGRQﬂ°›[ÉØ"Ò6ÂÀºs–å°ÁÉbr‡8Ù_˜öây£´ñåHNUÁßrb»°∞ö®ÈRø¶;»;V BZ–¬\J+GãP|ç+û'ÙÀπ\Ë†§-cäÁ% sË
uOeTTìlÅ{÷aaº|“*uV8iûbœEFâ7æ¬ôîANù=ÈŸ™
Û@pWcŸ[!ﬂ˛ÙsVx—˝V·T„^47ÌÇ<g‰¨¿”ï
ﬁÒø˛˚Ì8F√m!oo<I–ûJhﬂ7BH(=f·zB´5‘	≈ŒbŸRÇb›Iñß†%§	œ\Èôïiî˛‰xG≈$Â˚r–!C’v«CkıÜX€I˝cﬁ¢ÖQ3Ê@lúqE˙i?Ì“Q∑#è÷aP›çÛ¸ÊOqΩØ/“ì§3∫Òªq:j$2â¨•`U∂&ˇsJ◊#—q&‘ktôaΩÛ‰›WËñÚ1K≈v≈ŒdV4mJ•7'Ãs¿V†2∫»©LeGk;¿ùpÜC´îÚ<<ÁJr)¿qÌ`ƒ)1â˙¢ÃÇzeÑ∂ÊÁ©éÇ©——é«¥ËvÌñ‘-•Ê-ŒËwÛ(}¯˛†ß2Ì^.Lª«ŸÎ∞Ojì¬õ—éó'˙h…∆ªw+äﬁü1…Hè˝xI∆ª7%…xï-2WSÕ'á+ª~†ëò*˝1LÒOª∏™ﬂpU˛˚ÜæqıÍ·[YÜˇ√ø´ÀØE1æÓ8†_Ö˚HˇPî8¥Y_BL√√®Ω;‹0T~ú[ «[a©)?‹±}Çk˝±I=åﬁõÂ	BﬂNÍ|ãö˚îa/ÿ‚E˚=±Â«[ˆ[È¨∂°C∫7'å~F)Õ∫m/Õö›Dsjhk a,ÓÄÇ¥£¯ì-Gp¿!Ω<ïz˘°Âﬂ]©/W]˜íUS/>¥5>©Ÿj»*ıÖ‹úOy°©H¢œŒ|ªäâ!≈K§œÉd¯¯jŸ˜
Í=Ú÷«sÆ<àb˛8÷ ´∞F[≈÷lé2ºÜÁç*J¿Ÿ/˘µiHƒ7÷»*Û†“O‡%˙ùÒ„Ÿ◊9üìÈ’ó‰õAÜ¢Â‡‘É:®1≠fíe^	ÆD’pˆﬁÁWÛ™—˙—µÈœπù…ÎN4√6Îî/´8±
f0W∏ı“wãóyò>Õ<FË
±#T‚‰G⁄r∏∞9W8ööŸ\(dsyûFu‰rmÕ*€ß}• ?oπ⁄=≈’æ≤*—‘∏ßù◊dP"LåHx⁄7®ÖçD3…Û¯tÃé@”_g{Ñc\FÏƒ„(Èá‡∫¿Àãå≠á5A÷ <¡°v†â˛B.õÕÀ◊6±⁄TòX‡`˚äfP1ÕÚ•¸.Pvä≤jöœÇÊJ@|^∑˝n7¡Í F<›Y|/øHäp*æz»·ç}rá£ßîÎ*Ÿ‘Íå})¨÷{…NM √µífyﬁ¨Å'©Õ
ù€1˘`YHƒÒ;µt-BÊ’ NÍ®BÔ–ãm>‹ä1
.'ä–Xá€^YU·∂—µã™ó¿ä≈«ºR◊ÁvyeT∫}U)O¯RGü±ˆEÅ—˛§∆)3¯_ˇ’ùË_8JÖ◊BåÜﬁ”x5ï˚IÎé„BHÙ—íçé∂ñ~œucâ~_ÖÑØ›(¨AΩ-:´Oã∏µıÀª∑6ã@èCUÛ Wº”-√<(tL®ùﬂ≈Ëv8î10[‘äHu:àŒ∞r£¯Ω"hÃ= GõÍÓóÂïhuöùä˙∞ {T§ËYö·ØÀ÷Rp
eÙwø#E<=e÷èòå1<CÕpπTWïª⁄Ì⁄e<E4D≥*Hx˙Aï°2I˘3>Ég¥√”gUL"Êäñ“a<àí!¢wm*Eìä˙HN˚∑¬R¥1„	j
âÛ&¥âì˛8¡:´ß©Ò˘á◊#‹Q›≤A„Ew´¨Ÿö}ÀZ,7ñQFX^*»}íÿ–‹∆ JV(Z¯´-∂˚◊{G«ª/èwèXã†—∞~2e:∑)®øa^|NÕã∏ø¿S˚„ÀnídNÑdzã¡´Ä˝òT/S\îkÂyíÍLæ∏wÂ\ßlÄ’)+TLÏÁ!SπÍõ πM<Cûã
	ywB∫(ƒ›6ıÖÉ¯GîMa·†É≠øyS˝Ê≈ÓÒ◊˚;oˆé˜ˆ_uNìaØïbSiÀ+£æ3à«Á©/õZ~j+(≥ÂØ÷◊U$`ñçﬂáx◊?ëØC1Ó)?Ï
h˛§ì ˝q!o¿_¸ï UJ/På¬-;Âa£Ff©[ï|Üwü¿™qˇ —D«éÖ@≠É{
Ä›ƒc–p˚i◊o»7?¬∞?Í‡„(ºÁÈq˙[ÿÌ	Á›–Æd5>ñ »˜»?|Û”ãh'¢Úµ}µO«È^ûöÆNlÏfêóëÄ›Ó⁄ú¢»ê≈€@æA£Hhü√~r]Q¢,¸ÑØ]/˚{ÑçB\î¸‡®t—c”`?ìâf*÷p\„4‡vÂå5≥
√}hEXY•sZÆ˚†‘îF†OàJK˜Õ∂¿F—Ï≠†ÉG|1ﬁVU∫>¿?•7&?Ï≤.˛°¬ˆ≠Ë]î†i5}'ê^ZowÖ‡Á-Â†"4>hÿ¨uﬂ«€OﬁÇ∫Tô‹Ï¸,Åâ=Ày=°≤cøéòê…pwì<Ç≠û1`€à#ÄdN‡éîÌΩÿ›Ÿ€:ﬁ¬~∑—´[Cxmû≤à0p7∞"!sI‰íˆ‚Qö‰mL¬˚·–ƒ∂bßò©…|Ò≈Ów(/6ÍbäkJòQ0T.VNX≠s‰E⁄#0UÑú°gKà˜;¡Ó@@˚≈  çﬁÀa}PåÕ•#œ–)Ã∞(¡2a	BÃz@PYMY~¶'⁄¬∂∆có§€`}î«>HÁà⁄æPhΩ)ô˚=Œ‹ÉY7Û"≈kõ¥%§N‰∏{XVR”û†îÈ–	zÉw–.Øòb”DM)¶á9èK"√ŒÔÒ ˜ì¡ûÇ‰ˇüÿgNQ·ÎwñΩ~/∑3<∆rÁp<_∂ñuœ%Z‘˚8Â´∆—Œ@DÙÄz>é{ÛÏwK@â˛Û|‡¢CºtúzÎzyk„◊Cü≥|G¸é°”Bì“ﬁ—˛Ÿû‹ûœ8{ﬂ‰$(zqEäÏã≥6‰5ÜtÒ„a2ä0(´sö•É÷¸füÁÛÌŒdÑ≤P¥àÁ#Ê/_/WRP4î˙AÎ€—–∫>˚ç€B∂ô\ƒΩ7¥`o€Z.ñQπ§7!÷ëﬂ~tÆ+ÎO$|àeä'›ÜéÄ(`E‚øçﬂŒßµ˜&¬ ÖŸ¨ëÎv'˛Mk>ÈÅ< ôO’`!3Œ¿h=∂Ÿ¯<KﬂÒ≈Ÿºç{d£“‡øZHŸ0nº]lº5ø3@0ZáÿvÒê√¸Ù8PYx»Vèw—©à_“	ã(≈eÿB agàtóÁi‘©L~u|g¿ &î1HS√¬∆∞¥0éÑ[àîÔƒ{•mBPΩ·‘-'_pnQ’.nníb}Î⁄BÆ=!óŸñ≤ <∞6˛œ:ÀõÒÍ˙}§Y.†ÓlP'y∏fWºÅö?Ü”ÈNW•≠}^„ﬁ£ØÙÇh/•áê;–øç;∞kH$∂◊¨çªÁƒD®eÛ£.Ì«ùòou‹Ò((Ksm°W¨œ”Aÿê> >∆q6Fπ˘B72ÚJÔ(O£f@pôiû'òi%5ï¨TTÄ«4}m|*„;¡r.í¿Ìå≤,zØ©MË}ﬁÑ¿¥…∞õ•√ƒDŸ¨˘x$aMËn∫∏@›ÍÒZo_J∆ãT‚	irÜReé@Ö9z∫eûGg?'VÑnû#êh:›a/—1âÌI˛‹y€h’›°qG˜m∏jV⁄°9Ao	çöh\÷≤x0 ª∏5¿“pS’§]{-™√ΩΩN ÆHÍª6±¨C◊sVvè;ΩN≥ÛÿÿaéM<6fÔ~Úñ¸‰-qçbﬁøì‰j‘I`!E˝>wÇ£‰†_Ÿd+îcﬂ∏ı˙RdÕ7≤ÆVÑÍ,XÒÔ‰—iå8öëtã,∞˘^oÈ≈ˆı◊ÎÉAÔè÷÷xäõƒ€["õ,"»'æ/bﬂZ÷§∑§ïk…Ë]M@Pª…“
!§6hÙJnDë1ì\VßYöØj‰¨∞s	B3π¸e∂E∆%yûƒ^N?ô P·‚ïD}úC¥Ó_≤m–◊C˝§∂p¶rQE>ìóWß—¬Ö4†¯/3Ü‰ˆk¡bZ#AçÖ/6wwî∆˚äÀ¥;¢—7˛ZìPˇ“ÖO^Ä=¬˙ÎöªÕOy< Ωô!¥jFuB®3ò.Tä kò;1ÊÏè≥Ùa`v7êƒ+∞íwh@yõC¬„”å™90wP?A≠l∞ÄBõdÊA@Rx≥¨plº~˚ŸH>/„wZy/Ô 'zâmÑ¿îÍ£
TÄáò˘—fE#ëQ≥ˆ3BÏœCÉt∞!P
F†√#7∫Ç/O˙°ë¬pi“!√∆¿îˇÉÇ.‹R–#&Ï¡±°OºZ…®!y¿Ö˚@Q8åoW‰nWÈ7ß&≤Sî˙y‡!oÉ´@µ°í˙“Ú«cã:Ÿı~•lGÆ3GiﬁoÛ`˝îRß£≥x¿Zü¥ÎC¿6ñh`ı„ﬂt…ÜW>µâÒ GÀØ§ €7ﬂ_vDƒKÛpr“Ow/◊Ÿ⁄rHùÍıEıÆ%ä?âª1~Â–*S˜ïè¿W"hÀÏ˘ãO€
ÕflU⁄Ÿ∆ãkAª:T™<≥U$ßFÎ•Ñ&¬¥q9æAØ6)‹(∞¿*∑√HDu£`\á˜ÎyO†0√iR¡ >¢π∫5>Ÿ&¨¥%tæBˆª]í≤‡úúí¡U)Õ=O∏J© .å‹ÍIç‡∫Vƒ9ËOr∑Uvê-Æîﬂñp"TáÊUÄRƒ™0ˆﬂõ‰1«Eÿ·‡ï‚~–Ü±7À7éWqÎMÕ˙≤+§‘ñê2\PÚ/gXp¯≈UHD?ä∫s•ùB˚ÂÃZÖ:≠,érU;}p≠ê%’⁄PÂŸ_óºm ê˛6Jåö˝H‰ÿd‰&∆»ò•sÙ
gÒ8K#ËÄaR∂[øô+¿YEç%uVX4íWÃ[◊Õ,‰|ó§Ô√§”24›ÖBq…zïÄP„øs,”
¿$Ü•Øq÷ãYgΩ¥ÃÄ±ØÖi Mí]–ßIòZ!7Où#‰ÂÆ…≤Ç,†.‰+õ˘¬pPÀÆBÀ_ÍÍ¿ÁÅK^¡éçB¶Zj5vÜ∫ƒê≤vm˝0jmafŸ@¡ÕÂ_pF¢˙Ö{≤SÌ€ÑwÅJTGÏ\D“P[=e4ôÂKÎ…≠ôxkÖ6sÌ|*∞û÷ñÕ‘!Û‡qåÑÊ˙`•f˚ˆ© ±n·¯ÃÍÙqÍ˝÷®°?S¢¿|Ä{Ão◊M≤)Ω˘ò{[c
iˇTj”Fg⁄mä9eB{ Ö(ˇ@ü◊ªD∫∞Q‹«™l1å≠ÍücfçœÛ¿©QÌIÄUIáùZW ˘U#[≤äÌ”¿©`¨áÙ|°î®≥ØhıƒJ÷ÊÀxxé≈ØªÁ—EÃˆ˛öaŸÎúp1:’S∆jm∆5#∫ì”≈(C¨	/ÚP•“Î*”í0∆≤èq—=%~qÃ)`Æ∆ﬁKÜÁqí•AÆmª>ΩJ	Oç5õ†&¿ıVÎt%∑ YoLû∏—∂%ΩUÛÌ¿P≠OC{0ˇ4±
Ûèën˚Q‘µSëü‘§[©èPã¬Ê›ßzpÔ§†ÂÁá"“ûV¯‹{–û£˛L[’ >∑º$◊Òè◊`º≠Ù√e-.{<≠µò>≥L/÷…zèw≤ZhínÀ„%A∑Í¶|óÈŸlÇj⁄lëµÍç|ÅíBIjÎÜ¿Ë¿†L˘ÒÜ±6 r≥Ò∂nQÆƒäZÿ≠& sM∞
WÂ+'2∑yå+§Y\XE_|’yÚzπgóøN}	‹r‚£ÙC∆Fõïú(∂Qò_Û‡4¸îeì¸(∫Äy°˘‡ïÇ“fâIÜ2 kÛä¿º—t nï?ÈcK*µÂ(ÉŸ$)÷Sÿ∏…Ën¯	xôCoÜá⁄5	Ä√è,
Fây£¯,≈\t"!âùgì(ÎqsfZW‘Àıi(áü‡Ik∞3B∏Úuª^Ñ
	iõJ¨ÓFŸ8JﬂÙb¨úM"}›‚?ãcY◊H&;ûï¸òÃ¢w¢–Åu¸æÊä≠ñre≈
Û˝8¿ôVú≥≤sÂ¡*Øæó∞„ÂãÀN| Z+Ï3'πÆ_€º8°À&´É¸îOù÷”Ã‹~7án≥”∂0RVùµ4£¿áŸqtâ“⁄_“(J{öc∏\3:Ü√∏åLØ^Vı,¶ö=t˘	◊H`˛g¡b|#ßéXq9œò:EùÍYÿuÄJä¡ìŒi…(fc&\ª◊åÎÃÄÀH!ÿ rßÊvñÉ&
⁄k(RopÅ8\àqƒÄ)i+·Ì∏‹[/ùç∂n•…”«®—¨DJM}îPÁñ.bT≈H†rÉ`<˘iC/π°)N3:À\[ZeÅ{€Û±ä·-⁄Kó∂’®˘ÜÊÒ¡¸«$Ú∏y˝Ì◊ròóıB“e<T3%>Wö§’ÙiD⁄x{ﬂÏ›eÅ±¶R∫&–¥˘´◊]Ø~€yccâSø·e‹ás`®ƒ"Cì÷Éı∞+<
Ö£K÷MÂ|Ü¨PûÊª{°Ë◊PàÆËŸñ§yO(ÌÎ5P:ø[±\—⁄õzƒ*¸≤5≈éï6è‡êèŒ)Úí<≤ìO`"9»{ê°ﬂ-ÆU3ú€°%…¢•hî•ó… !ë&7øOk›è31¶¥‹ÛBvµ”8ãá›$¢:Ó˚@àâq‚º7êDÅÉÛÌŸ˘x’2,˛Ï9Ó¡Ïa˚Ië%tOoÂ$T%ZVƒ!Ü$<ÜÜ å4EJ/)Æx	0ºÀœgı⁄Î(3†Ôé,†ÑDä(eˇ˛Ô*(›∞˛epUîÍt™J≥|ü>æ ªÁqo“èüéááÒ©g!≈≠Ñã»pÚùX Ñ∂M=.%Ê∂ô‰G¢’≠.äI˘ãx8¡Lˆ6èL€Û˝^Ñß	®Œ*‰!a+…¡C5 u@A;˝ì®cOQÄÄ˛s€˘aˆm⁄òh˚wêÊ≠+QÄÓÉuˆˆ|˙ƒ»aú}ì∑{ë:ÁÔté¨üé◊˘5¸∫ œÙ∆Á‚
}á√¨¢'ïÑ‚ê ˛ák∞NΩt’^j"∏ÚÜ%◊ñ!û_`|&Ü⁄—ÄÉ·Î
>˘xK]∫7W€Dvm‚Wmb*Âa∏§¶)O¨(˚Z§,2··Ós∆√1›‘∑WE$ıOÛ∑ŒËMT/)>ã‹	Ñïû™+/ˇ!´æßÒH†
§  ˆ=u√_‡«<@Q˙f†_∆c8?ª¯juy˘ıú#Y§éV≈ã‚K+X£ŸÍ≈
EÒº˙ŸJ¥∫∂∂ˆ∫ÆÓe_÷ë]ÖØT^1¬J«ã…êùF=˙˜∑i:Ä1cΩ7…"⁄:+ï…ö˘¯}VO…Jç	ÈÎíöøj¨‘¸QpU/w´Ω™J⁄÷Xï|”(qÎÕ)†π÷êﬁ∫MœY˝s+˘˛°ÕË+íÕÙV{ú⁄µï/PTÔk\Ä!"lZæyÎ'B¸Ã∑õílTA¶-¬v‚>∞ÙÏYñ–ˆh‹Ùã·yé∫kU#r7`›w≥≠F–nÑÕ|ö∑œ„Ów€I÷Ì«::"{e]f¿ŸÙ$ûÕtWvi™ö!À•¶	.irL‰-ä7–Í]Rr]£Ñ ¨¥
O_[∏"eQπ	—¶ÛÉîBè9Æ3\º•ºª”—F∏b	E¥ÀMÊØõî´Pf<‹)ù$à¥√Ù›Ì–ﬂ%Ä{SËˆRp{söf0\C ]S!ΩU¬%uÄéÑ˜U0∆´2ÖÂ5Õ$ÃÎı€0I°åD¶ZºîO9àM|]gx¸ü&√∏ßÅTKBÑ◊‡ºlsŸù0ÍY¨ÿÖ√‹†—Ï\◊Á\¡säÇRIZÉã=Î∑Àl^9ë˘˙∫˘S/ΩW∑3kí¿f|ºô9\ge˛÷4[E◊ÎŒ<0ìåuF≤Mïoci”£cˆ“Ó_“qÔΩÎñFÜ´+sKy¶û»Ö˙òfﬁOM|fawı‡˝î˘∫ò§K˚§&ˇ∂&È∂YÚ¨p¨
ÚmìﬁÏ—ø[\aª∆”·I≤ÆÃÿ
≥â©⁄©à0ˇW±è÷GAp‰ÄèrnM÷∑ú˘y˛yìBùŸ?…„Ï"Í¶±;ÿ√5˚∆ÉAÛ°Âéàáo˛Ägz+Q*¨2˚K&z°‰uw&7HÛ∂ìX?Ã+£Qa`√#F*2f≠π∑ß›¡®0Û)Yó⁄ŸSP9Z[œµı7GÏ€Ω£ΩßœwŸ"{πœé∂˜ü?oõÈòN˜ù8ï∆ã+ítcùÜ†hu≈·Eî%—p¸x.èA‹ÍIl*ÿúOö÷≠T°n¥,π£Í¸’çñ∫*hÎáÍ_»»KJ|”≥HÏ°x8à≠V£m9ÑF∑^«upŒ9˜Å0t]|¨7—!id¡´ &Ωu]ã+¥†Ωûœ–;Ñ˙û¬…ı=G˛^ﬂÉ¯£˚I∑‡ö[)¶°êª=Îö%˛ŸLz?ª˘ÉSÚÅˆ4ÑcïGé˛ö{È’Íkm7©—%&M”Õ†≈¢¯YiàsÅ≥û˙–:g˙å(∂ËErüØöπ˛ëœ†L'õW∫I„	{{∏˚ãΩ£„√≠Cv∞ı™πè@â%&‡./†@Å/5Äﬂ	¯ˆ˘÷ÀõÕAKá[;[¢±ñRX…‡¨¸ﬁÆÎqÒ≠K∑s¸vÀO=ã(/6]Ç™œ®XÑ¶ã´Ÿ2DWŸm¢pRÑÆDá1±ÈÇúˇÂ7{«∞|vn˛ı”=\ã«˚«[œqqÓsŒg{/∑ûÔ˝?pÀ∑ª/q}ÒË±∏ß˘⁄–
]n—˛‹X"æ&eî^é&›núÁå~(Öì˛∑l&…Òl§¥;~q^^˜‡DÄBÏ8qπu”x–>h…£'∂®Hûrèp|«…håçƒ=<4≤¥7!ÒÀ8ë°≈CˇÕÆ£üH”Ò˘Tè£ì÷¸®∏_3G4ø.)¿gÆ`ÁçÂÏâÇ†º∏öÃY≈*a±ÏR¡∫àQ‚![b/±*‘¯Áˇ¸«ø˚¥bæEïæ®d€√_˛ﬂ]∫i°ŒıœƒÓ(Êﬁó‚ª∆˝dz†òJ?V·tÑ·Å=`#xl}¸Í¿_ÛÄèØ,{e[[Õ_A	˛ØÅ?Vw[5sê%CR%PŸÙ÷zÓì+ΩçFÎ15ú©n≤ÍFªÙÀß πqæfô*êˆäqV|I‡‰K∫%ãc$åJâ√L◊∫ß&0ßÛ5Gœ¬¬‘Í9>FÑG/Ü[£Ωµƒ≤¯,·»- Á¥ªr±ΩrekÅBƒméã©íÚ>‚pÍ€·Z÷ÏŸZ¢πl»`mG®{∆âÃ_⁄ãtfD√5≠:Â‹œUÃ≤O'VŸÄg˙Œ∆˘É˙
E)–≈
yÖ5Óa±∆˘dê2ò-úPXëÔ|ıŒ‚RÎÇ9m†¯ˆA:LôynÛgŒEñÙ`°¡.ä[ã_†x˜vw∫€¬=A/ÿ◊’Ñ/ÏïŒÂÔÓNØÜ_ÀÚ`~;©ø"ó9ÁBh[©Ï˚-´\:¬Nu~3Å)H∆ÔØ/øÄ™E√™òoﬁAoQ∞:∫ò9£5ﬂ÷˘î∑=èAœ Ör¶≠TÅ1l@Øë¶¬ ¥Î‘0Pù¸")áj }ßä
f ±ù>Q’}ÄM5f’D§0~™UB
W1)∫5Z.r®*·ì'ÃuãVroZZ•3•_·∏jD<æä8ÏY‘i±F≥©(XÚNKX«IWû≈K5Èdgv§øÌ›¢áó‚ù™öµ“‰m#“ƒŸAõ£*hJC-Ÿ }∏®3/bÖ+±≠fœ÷QãÛ’—OÜY.ΩáOHÌ>∑≈∂p±Ê–}˙œÓ‘ÇhŒ„ë¨óÍ<íª„h3ä˙:OdM.≥cŸTÍ†w	ée^;útxà¿õL ÷UîŸ∞<^‹éÛÖv©;÷Lœªï{“ Ó}TóÕlÅˆ~†dfd¿’—Ò÷/vﬂÏÓÏí<àQ’ÖØ¥‰‹§W$‰‚WoÆxœÛ≠ßªœè^%Ω◊◊ıi¶˛,Û ¥–¿˝Ì”ÆLà*Á˛m¥w=¡#Œùl[*>◊
J–≤SjQf0âÛ°¥6l|õ.7jÓy"7‹6˙≈ßΩ◊ÒõGT’†4I˜˛≤ê<¿5gª<˘ Qåÿÿ†√Öyﬂ´‹Ñp]’VTΩ˛nT∑{X¬ﬂ÷ÒÎöﬂÄÂ±◊;|≥÷=XEÏÒ’—yî≈´◊÷Ø¶πMzÁã+è∏EN~éeO1NÅ©£⁄7uÁö[√
Ï∂ÌoJ¿∑¸eMØ!âeSÃaxq)‘‘>™¬Aπ#◊Ñ∞£ÂUÌ“%ÍõDø:è∆˘÷h‰8ã,p<⁄éÀ¸}ç]ßy<˛UÑ"Œ∂Î0¥¬d}atEK‰€ı¬í˘^ÔØN∂≤xΩÈßµ7Îv:EŸ8Èü;j≠TUñ‡wp`˜”wÍ™ÄË18J%√Ù19ßpY∫YfΩy2:‹ª◊– Ñ3ŸΩÕ7Ø(lO¬Ÿcá¨Ó}Ñ+ïè˘£\≈Ùﬁã⁄eq´°jÚãñrŸ‚◊U•¢´∫√ñGk4˝:s¢∫H¨´~4Ï∆Ù,pë˙‰vÑKÎW	ˆZ$}¶∏IÁ—Â¸÷¿;¸FôGè<\^8ßl–«è.;w=è˚mzx¢x›Â	~˜Œ¢C‰„ ËyíèÚóŒëLecú˘bU«=ëÀ57äz®„≠?]≤ÂØÊ6Ô_%™eˇíÀ∏Wﬂ‹Ë'g√uÇë˛äôÌÛ∞ÅV“Å3#ÇêîVK~i]^j”5ó”	é·È¸‡¢¬€vÁ◊†Tpˆnˇ,'πSƒÓæÀÄ‰-7ùÔÌÏoˇÕ¡.;‹‰F≈/q‰',∫N7Ò»“Ãòg?ª%@Ø¬ŒüÛ4JSÂUK0Fô]q.yí˛˚uÜV“—ø‚◊Q∞^g+´£ÀØpΩ≥d=ƒø®‚ı:˚ŸÚÚrE~C«úÍä)ÎÖqë^º‚ÌƒuÜ„WÖgEdÆ¿ZÍE˘y‹oã¨∏·ã≤g˙5oó∆…â+ÀÀüØÖAı£QCñﬂä∆«È®ÆeŒTsvU®P¯å5µA‘g AÖº#Kﬂ¡zI˚&èÀØJ]	Ka1ìÏ,¬∂fËAı+HwørÕéˇô”4{ÁYÒ*çX]\t°íb¡Ùy∆ª‰7ñº˚o∑Ço œ„9æò˝)ytØ‡èÂWê‹»nﬁ	{√˜Oà€íÄzùFl+ÁÏY4:O∫9*uUP.§ÀnÔø88‹ˇvÎÂÒ.€Ÿeª;{;˚lâÌ<|Ä‘`1pÚﬁW≠ò¸ÅÆåä˜-´≤'*~´Ïv>Œ“·Ÿ¶ÄWF´,øÄ«LÍ˝%3}O£~˜Ê˜Èº≈CO2˜}KzFﬁ…M\Îë[›·o£ ª~c†ú#;øxﬂA_$9±Kµ˛bsÆlÃµù™ú4‚®˛iWú{¸ÜLnù˚#»”~"ŸÄ¬Z0 ‡´Í‹XxÔÊ»NpFû◊›ËjÊ6è&'cÓI¨l∆#|?V“`cLË˛U!˝·…^≈îñ™hÆ≤,~$’∞,q/-sõ‹B!y“Ô°j†8G¬èuˇ tá˙°ÃÍí£2 ıpw{˜ÈﬁŒVmPEòAwÓ_IMÑá=ø5˚'óóÅ~÷]Fqó˜˘Ÿ÷Û„-äƒ=¨ÌÆxKÉ”ıPÎhÔ¯õ≠õuÛ/˜´^,¢,µVß⁄ÙJ'¯ŸÔ_c˚'∞ô"JlÓGòMyg7ˇÄ@b˜àÛTr‡≠<˝‘®hùΩ©˙L1Üºõ%#?$£T$á˝4ÍÅ>v:Ú∏…6âèöˆ'ˇÓb(˛ÌK¡ ˚ﬂ∫±‰›Ù æ∏ã∑.’”÷jd«ößˆhÚHÓ¬0•[s√î8§Aà9>è·sp‹ùÖj8Œˆè¡DEÉ∂}ä.71N’‡4Lk¢ÍF√ã(/í¸AÚÖßD4Ú6˝÷röUh‡ÎÀñ3˘¶ÀÖÈóîÚ”D¿v∑¶&˚¨; ºåºY@˝Ù,›â≤Ôæ…˙U›Ü	è∫c«-Œ,¢ûXèú`[˘¡¨≈	ª¿N&Iø˜,È«düWlpv‘ÿ≈›7(B˝hx6Ô»`·—Y<∏^Q†mn>çíK	lrÚòE ≈è°C?që ßÉIà~blÇ”ŒbΩ”ƒ,zß”1ãÉùgw¿)ƒ‚∂y≈Œ≥ôäΩœÔ8SÌ∂>¨¿Ï&ÌvπU¬ÓØÕäRÓ•⁄WØ=øZ nß/‹πSzΩZNüUéR√}Z"¶”WÑ`7eŒA 9⁄´ﬂQ/aS3JÍòÈ∆ö€|û†ãö˝úmSÆH‚Öu•ËŸ%W˜|V5;H….£Dâ ÿ^Y Æπ@$q4ÈÀê:˝6Ø~LH‹¬úîà8´N{6Lßz«$âùS∆⁄®™©#1ë' Tr∆8öÚN|˜“¨ÃR‰…ó…–Bà·9åÂªe„Ω{Êc ≤2≤%*îr3ﬂ} #¢–º≥´UBiÄRGSa1<so–+.)îÚ%á<≤¨ÌÚŒåª’äå;_iü∆πAˆ˙©©`§î<‰´•Ö€˚În0¯J\µÃ˘ûŒPÓﬁÓ‰ΩN3^◊°Äöívz√<\ﬂ"^∏ŸÛ£¢ï$SC˛ÍÊ{ l∏-Ω¥∆)aƒ"õGBπ?	=ÆòJ0v≈≥ó˙(MîƒRŒ∑$#ﬂ:K≥Üƒv§µ ˘H-cf&a6≥‡àAˆÒoõ≈z"˛´¿‘\iáG¸ìå™QÙΩ ⁄L˘˘‰Œ®	t]ı<_Ω≤∫+ÇÆô%ó§`¡À‡ØÉΩøfø<úg◊≈N<–KÜÁqí• S;ÚR’sF=√ÚÈm^=ÑmãJ≥!≠àÚ+v#;7‰ÖY,ó¡k
QxbÓ+Äc)˙~–I‹·kÎ(ÿà›B^°ä-lòE9wæ ˇ~nD†í®‡nQ¬¡mu|zU∏Ù@ÂJó)vªÌsKX»ıfÆìC!TvQç>ËE’∆ºdcﬁ;uÕá;È}  ≤8÷ï«—óÃj_©‚Y⁄Q≤+„·ÌÆcB
C‚Ÿyöè]àÚyzsùÅ}Ã1t¬úX#¶¿Sgn5˙øàß!<Â˛KÎê1Ioüs¡83‹µ)–ì·¯tÛÚ@E‘Z˙ﬂÖFËÜFÅa’+ÂâJÕj∑ºœßT	ƒˆY(NäØWKªÎÒ‹K–ê™BòSq4±èx¢jö√µñ∂∂NLVö|¶EX∆j+Lmf›»]”ı¨≤g¨å†s⁄*r§VIGÑ´ˆú8jÜÑfÖ.˛xÙxF‰&IX∑?=_`gπ{é!ªªí;™’Ròübä<xã—(≠4ìÉ%,2#™Dƒe~8AÒ')Q˝Ã\J¨[“#µ0‹:	dæzüÖ©ÌÍëUwÔ'ÅR˘‹≠@©^˘Å˘ôÇ√À`—÷ åµïxº√àÏ9≠€u©¡™éÈô˙Ñ“ã'Ëgì{_ª∞Ä9n§æd´J3—~w¶»Oè’m…~
z@*¯ÏpRùÙÛÛıltŒ√'É≠ô•
¯sEπÇµe≥*ÅQ≥¿b»R89Àa<¿76·+w…VÓäØîHÍˇÁ<çlÛº,bdÈª¸Ò’™Ω\!≠Çä˜·ˆW-G•¡ F†A»Ô^ÆóN@Ùå≤1W
2FlÑ’È≤$v_úè‚ÓÕüNì.\à«›N%‚¯;!ò¡`†ÅÑê◊˘L£¢®2ò©xNS±˝NÃ&∂≤j1—-$Mc),IŸ7aâ.bπËÆomÎ  ‘åmıÅÏnâï‹dÁ∞´4v8RË-pbaÙw √∂ÍpW≥‰Ô¿bhõâºåªy1äŒ`QÇˇ¢æ3él2(C7¡ Ï"v'}êã;e Å>ê“ü2ı3føæ˘^rBÁÑeöcË<ÜÖa¨¡≥…0È£P∑5F‰&RU;&HòuÁ]¶Pa P™l5NKÕáuŸ‡Ñ{tˇt‚≠qoºCt\ô®Qù∑Åwè≥˜ùn⁄ãùRêÎH˚ï˙hÎW[o∂˜øyy|∏∑+™öwÒæ.µI ûiz˘›Ôò˙–´Â◊µÿ≤nY|∂¯9ì.bÂ ä`.a—ªn|’#Cπu<çLhuËV‡AiPPúíî¸”	’Ìúˆ£≥k&o≠DÑrÇAyq†< >≈K[jùZ£CÈ+å„†‘âi"—ókÏÀ/W◊÷WóWl˜¡ÃÙ®Æeu€Ç8µ ï3ﬁ  ÎyçC
ã‚8eß=ªŒ. ñçÉ50u)BG£≥˙ÙIe˛S=P:˚¿Ó¨^ícÊdèƒóD78H¨Ó‰(e¿‚¨]\Jw∫õ§¿!ù¡t©Œ˚ì,…0ì$O≠Ñ Ü@Ø.ÆKÃ§›ÉÌx…Ó¡ÉÚ7ï‰ÊïuÀkçx·ﬁ‰ó„˜Ï±Ô—◊¸J ÀìLô¥E˝ΩºvH¢;Ê›Büê‚ÁNú#êzV≤#Al¬õÁÑ¨ôÊeLsg	ô¯™uO0ê±àáèáêÀ•Ñ°F∫o≤úúä∂	[ôµ‰◊$Õ^‘ãÛ∂hÀÜõs2µƒ¸zcÕ;Ñ0wÖiea)ƒ≠yîAÆùD˝˘ˆµaíóE‰+ñµHzh¸Î)Øî¿©≈kvtù;Õ°…[ß4∞I\mˆâ◊@JÄÙ~–±Û7ﬁjÿá˜o=ÓQw”;ÁÙ∆)«-˙ú±∏Ô:∏*gêà+vWuãræ‡g≠O®O≈Læ-Ô=ºﬂæØÒhâ˝˘oˇù ‰U˛˛¨‡Ëü¡_íUÃs(	™&ı2ΩH≈hÕÊﬁ“K®M^€ºosZ@ÌÕ)˘ùÅ¶Õ3[szøï.p„¨ÒEC„∫£¶ä¥7_ËUïw‘ßa∫,ú5?œ|ûrC‚^™=A¨BëÑjÙ◊µLh[˚÷RÊ…©/·BIŒ$J≠eQ¯'êµ»Z"Ånt1ja2à¯"H·xÖπB|rÅôO8? ='º>^‹a˚àÄrWXàzt6Sâ"X≥√îÌÇxÜòÌÙ¶¡§uú@^∏îv®~6Keõ˘Õ?≤aúÁ1„ï$ª4ˆÓ5˘|€z˚zy˜Å<b'ﬁ¸ëÂÈ	ÂüQ9§Øı‘Q:ù∆„à»SPß1qä\Ã.Döp™-.i!XqÒ	ÅujKàYŸüçßÙ$ç˙ÔÒÌ≤'◊õﬁ=Z®Ú‡ ª5Çñ‡í‰Ÿ®∏˙‹DÚŸ_›◊ÌV©˘H–Ø‚à¯™a≤
kÏ|ÛãÙ$È«n˚núé‘ÇØFQ5µ™Z‘èïc›,≠Ê4';üë⁄g˘®)‘yïÙÓB®WJRÖãˆv
“Zì$ÅÆ› Ò√ïÂÖñ å3t 	|€8GÌgò;p¶o<1ìYKµE›¿§T[£wU)maÀGWπ≤8&)b˜8‹ﬂÊDq1Ç=πj‘‹û†ZbL±E!nw(EU#à§Î"£|%ìÅ‰˝ø   ˇˇÏ}€n$«ï‡ØDÚ∞®·ù›íL˜õí9VãTìíg—h¥íUI2Â™ RfUu∑hªè˚∞O≥¿ÉyÕã!~Yc∞ÄÕ?ô/ŸsNDdF∆-#≥™ÿl[ÿjVe∆Âƒâsøx‹∞D¯¸T@©XÂ={úÇû≤LA◊Ub°)åø“·¬¶Ù™˝≈gäÜnÂ^eπ∂‚Ê˙¶å« f®"FDˆ≤“X≥éBS’Ó¢UÉY‘°	%˜˝9Ø@y1Gı¸ÉwyVdÚ~üŒä/¯÷œäárSyç⁄„≤‰“Éhˆ’NpÄ4Î^&#å\ ò†—Ë•F/’ÉuÜu=≈6öc™¢/¨≤≠M¯¸w{ì«wF›±£qü;\ç‹u¢ÕõY…fIÃ1ê◊d; ‚WA]ÑI‰ïA¡~∂NöÎ;†sÖ]ÿ:d„«¿u¨bÒ¡ÍïÔÕ‚H‚‘˚@qËøáÑ˘6≥&¥¯ÖâKs£nu1D†B‚?7≤–´®ø~ñÅxú =®hbdÿ≥º≤ÎÁJ„√2ßHT≈AL Û=è£$ÁÊ7˚ãªÚE"e¯n¸U}ƒh©$‚Î⁄€s1Â–#7ı°\>rü#8-ı‚.`µû¨∫∏®%v≤~Éµ¨óÎ`.ü|∞∫Iã}p’Qı!ˆ!€\ˇeôôΩπb<Öç“∏Ò¡vJì⁄Õ›V∆fL¢uèœl”ﬁ¸÷O≥S&&S¨¶"ˆà¥•éy±QcU++l´≈◊$Ã„Ωîñ3C≠yî*'∏ÑXÚŒ!•6Â®¿lÕ≥+Pµ6ì∆
`æñgKAFÜ'&Ï©∫ÜY“dö)™¸&ãjà{˘›é*QÑºKÊÎÆ:fN–|J£#{π,∑`÷oﬂ3_“KcYÑú_p5„l∆”†}Ñ[è5	!<í6¡ñ¡≠n≥û{Ω±µÚ“¶qºÇ¿1cΩ<›–¶Céb—ÍäÍi“∫πìÄªEÛ ‹‚Ö—A«gHŒ⁄ï?µ∫gÏ*Êì˛y“–˜«Ë>Ì≈O‘ç˙]Ïî4N…Q∂üf„8?îctä—é„.V¡,˛˛ÑòIKã·*µ˘∞áœéüúúÏΩzv¯Â·≥=ò¬∫∞uÍû%√dêb¨ùMm ˙}I!‡ˆ~Bˇ°&Hœ„qBπ€:f‡=ìvôud.i+˝≤™Û≠—7ız¢ºÎòuFY<≈_^¨ØØ„øWãÑeÙ˛? Æ”◊ùÃ&ò¬RWY‘Á€7ŸıK}Œå»∞ú« «Y2º®Y ˛wæÜÎåËL…E(È≠ËsL®oÆ9«*;O‚>._¨vô˝û-Û’ÇPBBÌ.„∫£÷ÅãBÛEπ¢G¥"8c =≠≤4ÂÀ]&rå‡0G Çı–6#∏Ìﬁ=+fÿ"€mj—mœ‚qF
$∫mè„˛ÕüYXÒÍRôPîtFæ0»∑vπˆ‚„”Àó)Óy®‚€5‘¿D±áµºõ•˝˛Yd÷0≥*œR}^ó“Ái¥›¡ä… |Z£Go,)i'ùU4™C«ùVöï¡Vç–—¿@‰µE¯~G> n~V“o˜2ÈQ
hÊ‚*îÆ{Ó“°Ûp•Ë˚I≤ 0aàÒ<<ÄÛ⁄P'ô¶îÉˇ˘pA6ç‡π(˙zÉ”-◊ Ûé˛sN7Yz|ﬂ¸cY¶I§Î‘_('gÏH®ñÎ–√ŸÈΩvú°{e™„ËKÈ∞Õz⁄¿˜'’6 lØótìtà!∏c˚¶\¡{Æƒï√%∂_`Õ„ØDnÍ]◊zs7ÈIMCŸk‡ÍØ^†◊kX!¥hiL‡Ä} ˚€≤«_ó”ÈyÈêÃQU“Q‹|ûÇM∑ú5\*©í0"Aîtl¥.ÆÛµôËQr≈Œàz∆\pïµ§Q÷Ùé_6»Ó6íO‰∞÷{èúØc{SŒªÙ¯Êˇº”≥‹#D;J.òùd!√¸Õ§N9˙Òb|)C⁄â]ÃH\ä°¬ì{M,J˙”, /ã$è˚º	Ωì0“«ûÁ¢ô¶,`©]á⁄Ö≈Ö÷ÑıöèDà7“îTEÖÚßÌÕJ§µÇ3πôèSåq≥@>#˙°∞6\>§R8¥∆‘ÿ7eç∏≤§d|º)[l)ÇhFsÒ&Z:Å·u””aÍ(*Ïî5kå•ÉêÓe≥ÔRB/kîµﬁ$©∏P6“¸)ŒÔ∆˛n˛6Œ§‚=Îa™|›.ˇ˙k˜iøﬁÆ´©$…ôóS˝Ò∂Æßúì.Ë¶µ«†E™ç®Ypòu…X#»¯5£?-ø»‹ôU‡π·ï∑I∞ÏzÀ†$]&¶hàXŒ¡+JX¬¢§–∏ãô¬£B¸∂!ãy—Gˆ≤∆tÂ∆‘Œﬂ£◊©Å®*vg›‡ı]fk.ty*°ßÅ±‡néO ¸ÿ@–∆t†‡)®AeD?1gb†z|™î†¯Â∂»Äîï(Ó~È›¸	4 ÖrhN€{|∫Ù4,s6aóC¡¬K◊çÈÿ√Gls}ssÀ*–9œ§÷«´÷|¸_ˇˆ/Ï‰‡{zpr|¸ÈÕˇ⁄?<"¡≠‚ÜéÛ4ã¨@iL>ò‚|êrö-9®QD~–Ö÷n\ŒÛ≠ˇ_ˇù©»Ek«l™x7r¨˛Êœ9√U˜/”åUÔ'•y~Ûßi‹wÔ¿J¶\Ã ≠ç%o›ﬂ¨Ó—Õ-·$bÏ∫tÛcñ§<Ògÿ8≈C*O∞ù¡∑";hX⁄˚jœÌ:îËû44ò¥[¡-…Y◊˝Ï
Ñ/«c›ô‚W˙ÇIâﬂFg%K9ÛáË3¿¶©x2òˆtÛ'l6Xáﬁ¥Ç Õ ≥yÖÓ‡i—ÕAù◊À¨gÁ’’ƒ˘⁄]ª©òíû“·…qp,R˝J-∞kAmMπ‡¿/±s∞◊≤ã†ØÌD÷BpÑù‘¬Fw61Zı˛“„√!˝A\äX¯Ûê¶é‚>“—!–õ	 5ë2ˇw˘≈Ãl‰ƒ§$3e˘5*P‚qâ’Á˙ï3ïÖCÓ·Nır@ç”ˇ∫º¶˝^ØW¨ìØóv˜(e˚Qñ%√À‘)Q[-2(ΩnÕ˜ìx5r∫À?/Á€0çù∂l~ŒÀsöõS>¬ˆ@¶J¶‹•U0è,≤◊ÚhVÕ√|:¥8”ä≥ñ¸Ó §Çªÿ»¥ö˚´µqï«EELÂ≈qﬂ tl-VoÓP⁄∑õo–fo¥?å0«ÌYIp∞[⁄˚„…∂aGov ÷»ëg Ô;Ùs√aJ¬≠˙ºRÔ¢Íıµ)bÌÈé”ÌÆ^hA>É≥∏ãDªC¢ﬂYÊ%°∞∆A”2/>∞Èu^b}bé¿ ‰-+æ|Uå‡˜
5Ç	7¨øxàâ[¬‚Ω=G8¥™z40ÃT˚àß…`.Lõ ä Du©∆Uñ\"&µêbúŒûã$+É)ßùÅCóÉÃ[±)≠.J‘ÉGe&}[Eæì?EºÒÉíœœ≥x⁄√RÂ]S\ê0XÚÒ4…GÈê,qu≠å¸Ä§πgÖc9»¬¡8´7Q∏∂ˆ¯nó∑éU)èÑªΩ–yı’Ê|ï@MÜû)<vòE¡°†πÿ8 dÀ~úd5ˆ¡ñP°°äÜøvÎ,Gdh 1π£¸ΩR∏ZÔ∞ƒ˙U£˜ÇPFD~«  8N_púÖlΩU¿F3¯\ÈV%Ì#2≤∏–-Ö±I[˚ê˘T][öLuxa£è‰%•Ä°;∂±E®Ò≥0èÚ_˝´>%qs&‘ØUVX3¶ÊœzTJ‰(VvºQy7+Ødôh”xß}˙ÕØDgÁ˜Ì˚ú(Ú⁄∏}¬o◊:aÆl‚ù±T>L;XV¬qB fçàò∞⁄DF¥÷Cg,©˝Bqõ∏ÂN+Œ»Úõè‰ÃÓ»v∑`f_d∏#“j¸7Û„⁄¥õ/„<mG8mød;7ÚX*ggd›ó§Ü®≠°˝Æ\è«‹ha¯ıµ…±“*´D-&€æ/πˆó6∏•ˆ˚$=Ó´ª·í,mÔÃ#…œf5\íÚ5w˚mÎªﬁﬁTOmo8Zr_}[…†¸¿æT^~_≠⁄b‰Æ´ qx	òN« è„é—–√ÂÜ∞î–]åB…Ur9˛≥áòœ#Ê, ƒ,}˝∂V≠Õjãb‡Éﬂ&ΩÒeì¶§O≈;s®¨#&˙M¸ˆi˙zXùÈä%Áh¢˙]¸ñ}ÄdvyÖï∫@∏áw∫Cµ˜Ù	ÇöﬂºsD*•nèdŸÆCñ_«XS∂!∂ó˛f–≈b◊¥ùM#πÁ]Xä?∑€w2HÈ÷:ÂÖ;πwÓîìª†åJ1™ˇïÔL‰”+≤@s˘=•¯¡a&‚&è◊Ïë1¢Æ”Ò'/+Oä9Ïè&9ôÿ‡;OüìÒ)‡ü‚.Z∂èÑ±á|ò/¸V)Q%RÆÒπ≈F
Ø"ãõΩ:ØWŸÂ*èmD±˚5˚êπvéqø˚È =¿ı –Ø1∏ú˛ﬁ*;â›ÔŒ√)+o_Ω=å“}‡`e<ºƒPAe8›{ï’…/¯tˆ—bıuŒWC€ÜˇÒ,€∏˜’¯≠˚•¢∆äX¡áº€Îä°◊ Â9N√j§+ﬁWåt|èïﬂ=:G°ÅÀWx¢lﬁéÂº‚L4∆(ª≈	è·Y˜ûÏÛë˙jŸÿgR-øˇ=3ÕØÏ$eYºñ'√nñì8©îƒ.*'èá§LbãíI>5.ï]^AÒAÇôNÃ¡—pı©A	Q◊^<Jìúaÿ<ß≥´e”lõEÜÅWEEõ„
Bæ!lÀÿ<#„e?âRwpp¢‰™®H s≠ó`ÏéÏ!&«üé0r—ÿ◊àùf«†–6°ToYÇ“ÍTdø¯,M®É∑v…oè¶1hÖ∞$˜⁄ëÆX˝¿SO·4”…∏£Í`ï±:˙8´ñ√’ÖKm$cç´÷qoW·ïWåiù÷y{f≠ñß+…ß\âAÛ@USÉYáhbëHπ)çö¿˚ﬁ)>ı,ÈàN˚°;Aiaê$ßƒºa$§Å‡DµÜP≤YÁ n+Eyãrõ∞aÅÛ\8Hûjÿ—Úµ„<∞T!àTCkkMuÇÙ™"…-:›FìèÕ: •≥≈·)Ö|nô
±P’èÌ¯z π[}~N®g©cïÈjÔBµ ÅP^?”ï!ÍzS”jT=YuÑ'7 ”„w£õ?†%e-ëØ¢‡qE>R$gé~úâ]ÏÍ^”≠˘”⁄ZªÅÎ¸ñ3∫zgÒı∂"≤r⁄:gÔbΩΩÌ›ΩÔ»ﬂ ∞´f)‘≈¿ﬁ;ÈËQˆ4…‰Z≤Ãã+∂è €/∞Uöº≤Èo≠RgAΩƒﬁ€äOFuÿÜ
œ2ß2'sœò.VÍ§->˜ºÎµf≤âï.◊3ŸªCùÌª“’ñƒËwÖ†Jt<˛ -tÕ:æ~Pkx“>`q•d°Ç‡,EowÎπ¿‰)ˇP÷-˚Fÿzá˛xÑ‡æ?≥FIî“8ñ„√Œ–ç ÒU?5æÒ·`[ÓgJÔAòA¡3Íµ\}ÕMçW™U§¥ªt–‰ ªj&ì6N	õkß¯(áˆzm˚>+Ì|Ö¶vÃ≤ÄÿIêPr≈¥‘VT„_õp◊¥€¥\6 õm+®†á=÷ı®í[√5fàRÔA÷4Ô±]SøI˚hZÓ/Ïó›ÇÀhÕô}Àqlç”>⁄dàAûº{püA˝–å¶Âß]ëF7;p´˘ãƒ¥@AOπ{Ór+Œ=4÷£ÙïÁÕàªŸÕOy8ÌÚµ∞âsQ_π˘ëﬁ…QbEÂ+Õ¥f«)ÑäLˆòµäIW=/µèk“É⁄vTVﬂÖ:§ÒÖB{y•[4òpm\®’£?≤%=	E”HfaÛ÷M7Èc]FíΩéN‡ºé≤Æ–]Ã2%tL{ÿV{‚∑’GÙ≤√i˚; @˝∫L˘Ìe4Œ˜F#{’â&5',◊›¥¨*”{™ﬂU4umÁÎ :≈Y*Âb^∂±£?ƒ˚«éåﬁ∑Âe4∏}çÒ<˚QwlÕõ›}Úñæº˘Nääh0Ì…J NÁó;+Ïó¯Y√ˇ”üí_ÙÒ%‡ops¥ﬂñÔËSXèπç⁄S3Ì`qqÙËÅ~ämWR6 ¡(
≈ Ø!èm°(CËù¢¨&Jœ˝¯Ö$∏Ú√n2¢Ó›†ùÿ0DıÊ',âÇzU)÷„be=‰J˘Õü—(°ÃåÅHOÈXb@oK¡0{‰Bˆî◊·‚)GA¬©ÅP#˙âcíµ´ôC§2i´zÇ!´„sö‹√wlj…}K%˛ÌäµHŸd^_Áp≤7Èè;¸wÉ¿lÊñ⁄ÑΩ€Â,ëœ·¸ŒN:ÎCûÌºNQ8J^ß*MÇûO.£,.V&©œıcNœ√:ÖÒ£iøNÜ>ÜTYr&˝5o<Û7⁄√ŒPfÖQ|`¨LÚ 3äy–õ1äyﬁérKâ•&ñs´DÏ´{_5©Ò´Kè˜yôè+∞ñSO∂«Êa®º÷eÆ≤k ÊXúÃ⁄Uäô·÷rßÇî5Ú‚è6Ï6ÚŸ·frÉ9V%û¬Å@>Ùd∑áY¯dπ—FË6s9»&ÊLÉ¸ôU°£rÄêí™√Ñ
N∂≤#á^L1yÚù∫õﬂ‹¸Àad|Û”\Ógù«ò8ç;N @{Ωçgœ6ﬁ¬«g°∫º∂û⁄\¢ü §q/3À©ÚªDÈÒü´,ÈΩqU•W —˜ﬁ‘Ù:“O~ÙÖ4,yT”∂≈ÏGﬂ
_∞ÓˆÆH§Œèﬂ^øa¸L2T¡Y0ßL4•Ò18ñ=!p¡¶Â‚ﬂrUl◊Ú†¸±mF™ÌZ‡ùñ¬µ£t&ê∂ÛDXP
ﬂ.±˛ıËÍ8£¶£◊∫ önØ”Ø•`®„*à„á‰ìNÍ≈q˜—E|ˇt,ìR˙iT™Ù¬¿æ¸eÜµ`ŸêS¿¶–•˜ŒmÎ8~˙ŸµÄádÏC√A6®à¸R‡OÚØ&∞VaƒÔ
º≤¥}4÷;Ûb2lÕwèÆPPF;â¶òC⁄…Òøz ÇFåõWZœbT˜ ¨{ΩﬁiZQjƒxïË_XlÒ^íç4;Zê∞Ï6Z˝ñ®ﬂn—ãîVÏH:‚ã8ƒFü8-ıƒB$ˇ∆Ø2" ªeªr¸õzø¢V(Ä\V#ø›e[Ï˙ee	◊+U√1ÏÁ+'Ã÷ª‘•ÔeCíÜ´TæUtÓRÕ◊ºä·ëÒ∏Ÿ√YËÜe #}¬æ=‡IC≠QÆ–—+%Ü™óè/ödˇ¢ô&)˚ånÜÙÖÛ6sË+È6Ê’7mDSQë◊¯b^Zz¸´∆°°Æ–M◊Ü”ó–HöyOﬁ^Òﬁÿ
'ΩpÎé;ÀæŸ∑õ/Ú2çye›Kœ;áyÂ-Zwtõoÿó!
Ö|ÑˇV†™ﬂƒlú¢ıˆvò˛¥Q‰Éæ&)’¸V≠Ù§æGõrB`ïûó-Í€˘È$G„±¿%∂/Û çT ªe–"÷îDÜäâR≤á=´Å∂yùÃiƒh∫oí°t/ß2Öëœb“‹∏5ñLM∂⁄b˘`∑6[ûiÂ	%,?,
TkQM3nßBïÛQ…¡ 8´LhóUUizï«∞K~ÚÛd˜%ÓèŒ˜á£Ô™õ:˛lcˇÀ„rÌâøRŸŒTo’∞#>Ã.õ∫÷F&zZŸßœÂ⁄§1h£ÙõY…Õ:3.ëÒ,∞µÁ1÷®Ão~ƒ"ï‰⁄€¬ÿ„1úéUf¸ê6˙3aá2ééAk?¿pä¯Ê∞Nï∑v·.¨°ñÉ˛_Î¢^+Õ¥z1FË √Î‡”ã)54STÏ¡ °ÚIûœ˙z/◊∂∂,mòâÖ˜T}”/Ç5µ€ GUªä.ñ=YÔÇf<é{{csáÒk€JtÂ‰ËÑ.“ï™’≈∂Uª’/»¯NéÒ`ç|ÕπÚÑ+H≠◊!è≥)Ë'„h<……s8¬@ﬁÙUw„3¯«≤=f≈Ò∫8ïŸåÎÉùûÜo-eÙ˘GG…◊kÁ†˝5CABZq[ÂIT”œö4˘>óÂ)|ïí•¬›Â@ì”Ωœ^=zúÏi˘8∫à}˝¶#î®∏Eçûæñg*˛r8°<πb_Ï}z≈…Ê•≥7“_Ä}4{ˇ√á!CÔò^JôÃß≤x2ˆâvPuiiùâ¨ÀABËzà1Ïrm§Ùÿ‚°ÉÃ∂6cŸú55Ú∂†¶V™¥Q÷ˆ£l‹y°õõ;^∫ï®Ê:^iÄ√°QΩ'}Õ•yÒóˆ∫„düFgùÂ)»>ëU≠´Q“"ö§∂íX®*¶R/ø.Ê∂
(*Âvêé¶∆∆= ≠ÉC®á©eÃÎÆ∞ßâ[ê'–	!gkÈáˆÎVﬁj‹:ãF”VÖõí·⁄ÎµM>§'ñY≤	“!≈tU	bA·8}v->a9¯Åïv¯G$ºÍnÒæafxg≤|¬˜„∑jé≠UGÍ J>[Œ“ƒ≈«cÛ-Ãº“≤[Zu%¶ Œ	å.≤'åﬁ√üJK-Æ˘ö¸<+Üë÷¯x#ﬂ52µµDÍc¶«ß¯•&ƒ}42ô·ôï÷û~Ï·•e©|ﬂ„ÓL:fﬁó˜ÇπN≠" ∞ça7‚-Ó•–◊Ø[ŒPõ'A3ûl¥¢KÌ≈-‹»EöΩEúZóî.ëßîY3‚éäÅ/æW0—èjL≈6l\S˜4Ìd^|Ïde˜ÄÚnñvN6”ü…êƒsÆ≠÷œFºB(+n0†Ë|4°¬oÈã—GÈ™Õn˝∑Ä˘SH˘G\@¨E2ä0πíGDfL8⁄6Np±h˚Vó˜,¸œıYñfàU8Ù¬‚Sóë¬üÒ•@◊¸»9À$¡dÖ#ö“M˚bTÉJéõb∫éﬂ’l!ó‡&≥ø¬•+\æŒœö0Ê/=Y˝®R 9-k“\
`R‡ÒètÕÆH+ƒzdjE4WÜa¿Ñ¯.ÇÖV+0=/Ùéµèfå\ 5[Àø?ÁØm&`Ω|∑'er˘·≈«ÂöEZYû3◊HõrµŒŒpmpÁ<A—Èº*±Á«Œ∏AO’\≈≤¿√ñZﬁjyµ§‹s6ÓÑs{E õ¢'˙—„}†ÍBµyCº˚Nµ˜</p¿8ÀjkOT≈£43D÷\{ã(ÕO∑#<L•jì©âu}ƒ¨v1Yo&ªòdæÕ√ÓÜ=}HuexCH4®)0oFƒÄÎØCbÅg)ñ⁄ƒ„D¡óì®èk}¯∏xN›˙â.Œ˝ÿq1|]n∫˙ŒÕƒ«i?¡|Ó„ËB0]1cÒÌÒŸΩÄ›˙lÊ◊c∏¯hH
ÑáLí-˝#?]èà˝\ÃΩæAØ¢˙yZÙ»˘û[{`àÉª’ãqm∂i≈“∞“KnÆm‘∫¥⁄ ·[6g˝EΩ6#LDkÃ€ «Lmj±ã+!‹a1◊{ºM4Áu3∏y2´zNU√¶*I—@™sê“˙… ©Ÿü„iÓ∏ôï …îÔ±UgÖÁ‘÷ª¬KÄ5ªA´eg’åú¡7#ß∞»âÌ§ä
˚†öÖâÈñvÔMmÖ+ã¥n7˙Ñ›‚˚⁄-Œ«"˘K˜Ã⁄S±Ï*oﬂ´Ú&0z“ÂÆjÒH+˛SZ‡˝Îÿ5
^°ºÖºXœπ- rŒûÛ„,˙Å9…JÖÚ6êbƒë—Q¬∂T£ÕQE?º/¸±!∫Hm]\ã˘§nñ±d‘¨÷…Pÿ;RÄj<èˆ®K<K‹OêÆ¢v|ÒdúM∫„IËèyb®›`c†4_–Ï_6 Ÿ≤Xô≈o∑ aﬁ-B›¥=MFæ∞GÊèûc>¬°ÁÑA8î-2ny2éì|ôÅ“M±îUö/ﬂ}¸	ècOïy„ê_",π∏<'LÏÊ_Ò)∞ö9¥Ñi›Ë˚‚πöÒùqo¨Õ=aJTÛ≠^ô},…ÉFRÙDéP+‚›†œ£q“øú◊%£5ç0eõ◊Ü*G›(ı 7ŒU+uñö^§ë‘t^	ç∆3i°°∫KSl≥˘äÕΩçCw1|∫È\1óÚ^…»ûŸÑ@X)DM9]ô◊¨Uÿ=/‹X¨èõT_âX1[ML≥xeÓ‘À&‘3√ìÅ9«Y<Mrûå ãÌˆ'‘Õπìé»#”_	àˆÂ¢å&õ…ΩaåÊäˇ5vá ≈$}LY˙Ñ›môqoà'ﬁF6sÙéÜ˝∑>“…˚”Uƒf∞h∏_Y†>ÊDı¡@í¬
í™0ﬁR	<ÀbÙI™tS%•ˆ †f–∂EN”_lÆonø‘Ì’‚Ñï`†O0hê|m¬“b	(î
™Î∆'ÀL£j◊˜˙q6ﬁO≤n?ñﬁ‡mä˘-ÙﬂQ°ˇ≤ˇ˙üˇŒqÑæ/»:ñÚãÛ<¬˛Œ„d»ü•2}@—”1fpÎ®?¶Ï¯ÈgE™’ËìîúnÆõî«¶rœUÂ≈‚é”˛Õü–òG∫ø‹£5hæEÊ¶C„oöœ3“éÅÈ;ns•1‚ly;õmÕéã¶|ÍËÏ;Ä>Ÿâì8Ô}qxz∏ø˜ÍxÔÛΩg_ûâÃôΩÛK5≥{I@≠dÏ$Ω"]ˇÈ‰‡W4¿u¡¢õÂ’0jS7œ—Yñ\D„‰ó]vœj=W	@O`(«√”˜#,Ö¡·Y
ŒRwÖê÷Óö≥Nu+© w;õz∑í`Ê·,µ;ÃÕJ.∫◊k;‰°€Qbk≈ç¨É∏À]Áãu€€‰´s˙*Ì^uJ⁄øå·–«⁄4CüO·ÜÛ#†Â	6ìnµîœ{Ûgúx¥¡ía“MxÅy¡≠˜÷ï„†¡»(≠6Øp1÷È¶É3 •<~eq7…£l%Ñ¡yÚ÷Ãs;ßÈã©9È<oüƒ”åü ;ÒØ÷∫¡2 ÛyΩ	ãv¡
√DúÜàB‹⁄Ÿ$Ég0∂(K·Ñﬂ∂S,¿o„ë¡ÎŒ◊Ò8Ìπ-;Ú„I*∫â¬¢ ∞ZºÖ°G~úü∞∑jıëü⁄~C|9zæ/§ñw.ø(ü(S>S¸[†˜îcAÒhπ¶¡kt7∑BÓÊ¢nÁWì®ˇ$ÏvJÁõ~ˇé$_–‚x,√LÆÕj,Y•ZÚáä‡ã)}XÅ≠ÉﬁÖÊQ*5¡<4˜¡÷FüÛ^dmh:cÑÀ;FÆ˙<{D]“©6’ù·ñ^√ˇjUüjÒ/ä·:H%®øL'/ŸVÉ&ûfQ~π›*Óﬂı≥FîªQ6é“W£(√˘ho´i¿⁄&n¢ec?ÎÑ ΩWÑˇò´&‹BY≈|.Ω•(oº84™≥eπ˘±‰HsLÀÜOÈësØr"$Ä[P–B8i„±Ml£xAsB"êve%Sü‹%x'û∏‹Ü8ô`¨7¬«>±¨⁄Æ¬«[IioÛ‹z¸§t2Å]bs…¸Òsµ8„˜∂˛˙ˆM<Ï&¬∆ﬁHÚµ¯œ◊©9qí•Â®≥…¡Êx¡ílT¿H∞¸•X¶5√√:ΩHªfÅâ\≈ÓÏl∂≈ù P.aóO± $ö/+ÒˇÓ&c•Äxo‚bD?√Ô◊∑ü_T®≠(€8_ZFÛ¢É’±ﬁ[ÿ
Ö&7öa‘Î9†[S•JØΩ}{5†[ª◊\é)µ®ÿ∂VTåÄRqTÃ√ßò)"ºsKaŒ\O]m™»	£){ˇé∞®sáz"vS‡&p≠#∏ì—Jx!Ú	 {fÕ'ßÎ¨∞«l›|œ¶..Û$<≈§’™û¬m:Õ`©ìA*√Ë®’<ãﬂ$X"√V ÄIª√LÜäëaˆçÛ
8≈π,Ñ9(dÀ2T un†°Öj)Ó‘ñ;. o◊‚\ãX(OOÈï=ES6às8m™¡dÜ;Õtƒ<în.GlÍ}?bì6œ”∑€ 4&®KÈvúÊ‰ÀÅgN∏ÀÓQÖﬂ3Ó™jï≠‰Í••fçπ‹˝ôcFºê1Ûºm(4[âwF,…÷¸cIJ“S¨Ä)KËƒo∫1öåRAàFQ/C‘Dbu£Eú—„ìõ?3 />¿†i⁄Ω˘#&}Û#öoªq/bßÂ^ÃŸp¿V¬èVŸd )ergx‡òG VÀŸ¡8E˜∫:Ÿ∫5z≥˘AyBF|Ñ≤9Ysµ±≠≈‰Èân±˙8]k¶eÌ.*éÕ
æ[‡“Ã>›QIÉmfÛ4óm∫DÛ»1Âv~Df¥˘zîo…æ÷«rànJö—A>äª	∂´%8Å8Bs`>Ã‹Déh%6ï #o ˜/&Q÷ã2∆[aàDµòapQZéæÙ3˙4FΩıPTH=ÑSsG•ÁÆ∂E≥`”ÛöFÑ˙2ƒà< XXƒ7õNÓ*Ó∏õÆ"âãµ¡Tv1‚Ÿïœ„q¬ìF€Î„]Aƒò3)‰∂±ﬁwç|Œ˘l“cŒ◊?M≤4g#Tx‡ëºM’*ßxÑµ≈P>æ˝Œ/jD≥˘Ôy¥Æ™,åËÙ—ÍÈ‰ ˝µó“wª≈NÊT◊‰÷ëäﬂ•ªÜTﬂ·™ö"ïˆ“œHıŒê™ΩÌﬂ¸ÿÔN˙aµs<®ÄÔ ¡3^«9^=g√-≥j 8π∑Çø‘Q 7¨/g£Í?»®!√√ì∑YÃÊ÷Ò¯4Ì«ŸÕAG≤ä‹ÜAóAÎäpYaó¢˙ŒﬂatiÅ2˛† ‰L‚Ω6Ã{.Ÿ_m|»Níı®∆ N,"A|óu#¢˜§¶¢q“MŸá¶‚g∫ÍËzb®àÀ)g¶íÿ[µ9iÀ#/Ä s∏edTÀ”Ò!¨Wçß†<[Y Â˘ª≤'Í#ùVTGø[˜◊àÃÊCÇÍy+¡›HwWYûûe1k¡¬–ÏCq9~LiVÜöa'_NëtÅ7ö=; ∏∆›qÌv´ûπ+€!ã«ìlË–¨—ﬁwfMÿyX’l5^∏ªç)(∞c^yb∆‡<=Ê Çºe∞EE·¡p&UÂùæ>7ÌvA&ÙRæ=ºGÁÒ8ô¶˘uœB3/Hí˛7Iû¸πá*19ΩÁΩ≤ÁOº1V~^ |øZIÕıä•2-ôù?è2l¯a,ÉÏÇ7ã±˘Bå7ìZ‰=BÁ^ú[-“µ™R‹è‹u∫BCˆDÅ$uºŸ˜\˛|öï”<:√6îË¸œ8üÂS>P7ç[á(CºgßTG7≠Íâ‘Æ‚aOt,„q–∆	| ì¶Qñ U1Ô2Õ«KæpJΩ•˚ıcq≤áü:B˘≈,Ω$èŒ˙q4óh
àRåy]Ng€Î«'ëímØó+q∑èëGD5%-\Jüó⁄£F˝)ÃôŒPáT˙;S⁄7òu8Ì’YcıÔá8Ò7∞D˛è+l«êE
X+qÈÎrÃ$«Gôo)kDPÇ`†ú›æ˛¥<∫Ú%ﬁπˆ*Óe^» >Ì´u–3∆ìú´é†àt'√K*æ˘Ì<Ä+ﬁ˝@m‘ÿ8KØø0ÀßùQı….VÁ˙&Œ®»¨˘Ë~âRˆèlÎ˙€<ª/”iZ,@=7
]Í_±≥Í99lùÿ z≥vâ˝%ßó/Ê’ú˜”◊öV\Ÿq:XÀªY⁄ÔüQÈ0„ÜÑ≥u¿Û^ûñ∞Hã…∆RµŒ,^gZtiﬂ2kéZ.ÕA¥^‚˚ÓÊGñG…¥\-UŒØMÙ˝$·«6D†≤è≥txÒxòN#6ÂÁ4ˇíu¶æEvÄÌê*òãóYD}ÎxlO/¬‹çÀ$ß2n›TØ.jëUã{ÁÄi≠ùjNJ&Ÿ®[ôÊS–rX˜e©iﬂt¬kd€nUª≠ _ dè3zs{á„Œ≤DäÂ¿˜‡ˇ@…„(Î^zﬁ9Ã+o—Ú∆Ÿƒ∫:[É‹Fπw[ÎÙÏ;~6ˆ‰ªÚ∑"˜Æ< 2ıŒ|Ãg´Ù&ﬁÈ˚≥pµá'R%“}„1˚tíwëãÄÌ}∏-T±◊»¡≥«ù[ÓN¡tx‡¯∞g%Uﬁxu{Î©µ¡˚ˇ¸◊ø˝˚&v…ÇE•É˘ )rHLj
ìöäŸ¶ÑØ≠˜P• ∫ÂáE†u iqFOEÛ}Â.©™£¨2u]RΩ˛kDõ}@4Ùg∞ÀÉœA†Ïπ˙µÓèŒ˜á£Ô™;:˛lcˇÀ„rlàøQŸÀtó¡Y ≤oá≤À¶ÆÖ_Ç∞FÀ˙Ùπ\ÿi‹è3‚¢ñ¥}Ö#|u∂ı—û’U‡•>¶l˘S""ImKÃ\±ãçê"´	V¨[¯`Gﬂ¸°ÍRÜK†ƒëZóızò!2√“≈°Àæ=e:∆¡ …s@´YªfkÀ^ºfßôB)3yïı~Ï™c ZÕyLc]Z≤ﬁız˜ˆ∆X(`øf∞;ÓÔ8<9:°ªÇ§dπ◊€xˆl„-|ÏïkﬁªNö„h‰m]_úΩr–~êt„.Æc’Ö%kº‚Êˆ~Ãﬁ≤°Ó“TÊö≠b˚kmœP’ÑíOœ'“∆≤rrüúÓ}~ÍË˘”ÉÁTÁÙ•ãÿ]iòUÎû“”•√îˇÂ´qö≈≈*xΩ’4ÃKWa<é£∏Ñ/H' ˘oìˇ@j≈*˘!*}ˇd¡@ım¿RvÃìãb¶6ßdS)lQ<W„÷≠ZGªVûÌªAZ¬Ê¨l˚Ê ñ∏~ã—∂¢l‹y°]Úub/=™ScMºpà£yÖÙ-óÊƒﬂŸÎéìi|ùuñß …DVµ¨F…Rõ“™ıˇ¶J©…ØKÖµ“±‘B'¥B'Ò0µäyò£#Ä‰ ƒ^ÔˇŸæÓz`DéR§¶ÜÅTÙË¢ÿz√"ÌñDy^¬ySTtˆ«ËQ6Êg∆V¶Ù	ÍgJüö¶¶ÙëUπaÁÎTæ?øıø—º~'è#˘~¸vûu;u9∆VbÅŒsóQ)Ö
Í¬O¥ÙÑ…ÄúÏ	£˜'	Ü]ZÚ5€Öq0¯±fM6:•°ƒ¥Ω∏ &?Úê°}È+⁄b/Í≈æ«˝µåµ‘‡¢0ÑÅ&Êv1¡¸1«“!Z8b<Â:îèÈjjèUt•Ω®Ö˚∏H≥∑àRÎÚÓÃ‡B7˘2ñ©ZÃ8%áPÒΩÇàxzÊ(ü⁄Åz#ûˇ)r0¶?ì!I‡\Ûqu¬Q>ƒ;Ñ±‚è
ùTŸ/}±£∑¿	Îy£|ÍA(n
`Ú¡QÓr‹c~>2™c÷nWÅYñfàU8ø‚S[âõÕuŒIÀz·®JŸ;•õˆõ¶0g∞¶éﬂ’∏)ó'#®æ¬•ıF`”◊Kl>¬ k"¿ßÃø™{R@ìÓ∆Õõ∞4(ÏçÄt‡
ﬁdJcÙMó‰TÏ{qrﬂD∞º¿jE¶I@/◊>öEj0JòàHæ‰‚r\É366∞^HKP°ÍùÌS>.◊ÃJÒÜù3Ÿá¨"ø∂+®Æ÷ﬁÜ°Íú'»6:ùW%Ú‹„»√yπïÇ q5Tãµ|¯œ≠˙,4˙….aÿT¡~<º_“mÿ§™WVπÆ∫-"v*Î„/„·Âd¿8z-∫ﬂía/"cê+Ñ”Ú’û∏¨‰a3ZS‚8Gò§‘Ye©∂˘I~=ÒÓŒ9ƒ,˘\w‘	r z˚>HR®IÖÒÛÂ˘qÆÁø6\â94ûÌPFEí3≤ÌŸ2¿ˆ …4ŒÕÿq2xQn⁄˙D§'J‹ˆÙùG&∑{!ª·˘f∆ÆCÆEhÿ‰à¨ò-]%w]Ωs§∞l:0—≈Ô≠˜NYÚH’ÀN¨∆‘>7û^π,’`[™HâÈ®‘ îÏ»z˜Éê-≠Ü_Yà≤Äu•∫é¨t\(≠+◊èQØ≠Õ	*‘N‰V "fjãÁ‘ £a¬€ˆs≥bkZµyŸ,\¨ûÖ’ØJŸ*†ﬂ9r<È»˛|≥+«…∆w†|Ωıªù—¢†÷;^B´›UZ](ªpxºf‰ˆX∏ŸxáE¢l'¨ªjÎoSÒ˝˘◊wXã¬Ó¥≠¥˛)¶¡UªˆÙv≠∏Ô’ä;Èr%Xµâ»@XZ‡˛6g∂hºÅTEy±>w[‰|}ÓeÂˆ¢"˚Ü®∏f≠'º¯2bN_…Ç™˝&uﬂΩñT„∏¥c‚πR!Çï∆FÊqÄìq6Èé'‹à+VπÏµîˆoΩrJ+aøqyû[∆‰”dVW™1·»s∆#“J∑<«IæÃ@FÈ¶í4_æÛX÷l‹mí¨ñõ"x™MQœ¥õ≈ßjKYiCKê÷çæ/ûªÕbV[etVÄyLˆUtkéìåJ–,‚}çì˛ÂºØíµi`*˚õº<—(KßQ7Úïk€ÀÛd©A∑êIõ›•¢àÒ+°Áxf,{SÄ.K[n≥˘äùΩ$ç}€£E}ﬂà·”MÁäπ¯jayfoi=!,¢)üÊ…]ô1◊¨-Ÿ=ØRƒX}%í]•˙…4ãWÊN¿O≥pSwµÉ⁄¸ò‚˝ªû6_JXs´m‡Qb‘B≈]õÉ˛≤„—_Æ:/ñÛx o?*â‚üØìßÚÌyÚÜû*	ºã¨˙T&JGΩw∞2Æh°Ω¸â;Ö
¨ê+~îˆ=Qßﬁ»/
GÖ˜]L¢±Yu§∑ã_yÿP`p÷Ú&√˙ú»)–øöœ©∫]âïy¬µ™Yﬂ$ô≥‡[è]7¯bó~}ﬂøˆ"®A_åª]~ä(Ó¬·ÿqR.
~u|Ù≈·È·˛ﬁ´„Ωœ˜û|yz$S3  éƒü)€‚nwê›´öCπ«∆ Kä>˘êw,w‘—)0‹À!—˙Ôf[ó∆—Yñ\Dÿ!⁄e˜lfbÂâ†õyKç”|rﬁ\õß’¡ƒpŒX¯Z√~i:∂ZfiìV¥¢pJı˛‡#ÈQÛb≠Üàásìn"£9I≤jzsÌ3ÎUÃ√ÙÂ!‹™6[Íññóˆ˜øg/^r>ÿ9oüÇ1Áˆà÷}A€!9@°OY¯»ETÿ÷ˆ&…B˛®µ5b∏˘	;èáµ”÷äõÀ∂ÂŒ¬Õ™Ll∂ÃÊ/∑™m>üÆ0·EÀÂÁÍËÏ;  Ä$Œ;Gœ˜◊‘˘ß@Í”U÷I ©dSN%cÍ…¢ºÍ_ZP]Ù¨O*ü©âm,;—ìã[<EuÌÁY#Tﬂ
AıE!˚W ÷?iÿ9^√ı#…¥8ø¯‹/Ó˚7GÙüπYº?ı¿áØ◊∂Ôøz«ùÏ51	‘· ÃD
,#|K§öŒË≠«Wym ‚®Gn–T7Ü;zˇ´Õh≠3¢®eë[	c.u≥‚ëm5$Ï·iÂó€≠"ù]?kd∫e„(ï&ÜûΩËô:zGp˚’^RÆX¡±∞«4„µ¬,ÂË∑ÆK2 ÕE‰ãµêÉê|î"#Eé5«îU˙Ñ–$9˘*ßNÏ±üì<≈¡6ä‘Ä§NK∫~ß-LÈSK√Ó‰e ¶∏!Œ&¯F°2üÿˆlW·øcáˇ√@(!oçÏ
÷©MÅƒ/±9éf˛X°⁄çúÒ{â[˝K≥ŒŸ|-ŒˆŸÁò”4àì,-GùIj6áªã˝≤ﬂc¿Çîﬁó∆Ÿ
‹wL‰2)‚0jg≥%FUFr	«|Üw›"õ∫≠¸øªi[)QﬁõáDπY‰ˆ˚˛úk>¬bÇE-ª˘H¯3öq¨ıﬁ∆V‹0˝”P$£^œ‹öJ?z‹Ì€)ÅÎÛŸxk‡∫b)‘öL€ZM¶¢fkƒÖ´Hì#Ë"0@^ÿÎÁœú!Ú≠Z†aÑ<uçb≤mÎ1Æ•õRì+¡uåV‹i⁄˙b»7&Û¨âIZì*ˆòm¢ÀK©>~_x∏t·ô'"ïÆ¨Fçª\aˇsÏ?„
`•ìA*cÑŒìa‘gÒõFbırπ+kG•¿üÛ ›ü!ÿ«2–ﬂ_‘OQﬂìπPx˘µπ˘â•lÁpŒT™F>7*¸ö≥/7è„µÙûØIéÁÈPıÖJ¥(LQDxß9Ü-¶ŸﬁΩv∏ÀÓQ¡
ﬂ3Ó∫S∑5ñô<œà	/`;q>˚<b(|‚cImäŸô2}'~”çyXjî
⁄3äzRù&"≥ìK≥Ω&»7fÉ(CZò3Mª7d¿êo~ƒ3Î∆=ÏŸÅ≈18Cv7¬‡—*õ$qLŒ„åJ”ˆä’Úòß®ÛOWF£µEi4:#OtÜœ©Px∂õkÜmM%wHtkÅ5¿«ŸZ≤)ÎXwQ3lVñÌ›û>^ˆÈ~¢Ïl)õ_QU3„:|r∂8nÅOd5õØ√˘ñÃi≠Q. ◊iÅÿß‰N‰£∏õD˝p‚Ü 4E7j+;«≥ûJôÖÉ7Äıº%U∆x7 ëz3åEJÀ—ó~∆ù∆∏£w]â
ÈájﬁxÙ‹’±•=*=ØiﬂR¡¶/”Aåò“’Ä
˘√N”…]E∑	s°M›ô9
•¡.<•e„y<Nx
\k5º+ËÅr=‹6“{Æàœ˜©Y;ãÔ@>¢ﬁŸÿÛﬁzz/·ë◊‹L€Ô¸¢F:õKïwlüO<£f˜eu∏Z◊ÌàNÓÉˆÚB"ˇnµ¢√úä7‹:ûÒÎuóÒÏ;\a[<”^˛œﬁûÆ∏˝õ˚›I?¨fà!ûÖ$oò®¨m⁄∆ª¨M‡kµ,vê8so⁄<øÌQ 7¨/„°ﬂK"êdCÜá'o≥à«≠cÛi⁄è≥õˇÇdDY˘Ù—L\≠1¬%6ª'’wˇæ(ÊlugP¥Aﬁoù‡j„Cví®µ∏a…Ï√S34˝xt3-≠Àèù=∏"H∞l}Â$+såƒ»∞m¬(ì‡¡J@ûÍ¯a…ﬂû
‹,¿¢;¢îÀ≥Gk´ƒ|˚Ω8±=⁄iG|Ä°ÛÈweÎ˛‚:>˘¢«|ËR≈%J	Ò*À”≥,f≠É_ê(†«èRÕä¯2Lèˆu<˘›®ﬂeèË?àﬂ\É/◊±!ÿ≥\iY<ûdCwàgçq`g÷°áµ—“V”àªÀìÇ;&© ^–xÀ”⁄´¨hZF]Ò*8'Œ≈Í"™º”◊g√›.»ÑéÀ∑á∑Í‡<'”4øÓYcrÊI“8˛¶ …SP˜Pï&ü˙º†W6V)Ä7∆⁄πûÔW+©π^±TΩ{ˆÁQÜ=u®púl>6É˚B7ÉîZ‚˝ñQYlt®∏ïÖ¡⁄ò,§7K†k∏üR9»£3Ï˘á˛≈ˇåÛ/Â„t”∏eÏÇ2¿˚u@uÑ“™«H5,ˆD#(C≠Aˇ·ß<be	P"Î.”|º‰â…‘{h_?¯ü=‹¯‘'ÁË%yt÷è{†œDS¿êä"√gÉCÌı„ì®LÊ◊k£(Ê==A‚~•á<+ØE‘÷@˝(±_˚∞óÊ†V‘â{pΩïG˛·òˆ’:»⁄„IŒ3¶@&ÔNÜó‘€Ú€˝ã1}g9zO?∏“_ÑïÁQ ˛ëm]ãÌ/iÓ¨(±oÊ†⁄Å´sﬂÍﬂ7Ë∞ƒﬂE%ß´iøVÛÎ$GœxóáˆiÍ»∆{ÜvYÍG/Nà„Í·aœ.† Úö±hãqñ≤‰–?zD	ZÖ«…EÑ·ä¸Ôa:ç‹„w#–~R^äé	›pÉ¢~Ÿ `o»„{0—0œä¸◊ˇﬂ ¯†¡ÉÅS	027¬.ƒ√ Å≥QÕ∆b7yXôÀ¡§6ÜÎ<Ïa:˝0~¢ƒ¯a>Œ ¢è;/\∞]OzJÉ˙~<÷È›‚ÃŸÔìs†	=Ÿ5P1`y?Ä–0O÷-ÄQï b—ÎQØ'^≤Ω£àl¸!XJ‘ÔÀe`¿!ºO¥`OdI‡ﬁÛw]Ö·3ˇF†ë1ı‰sÀæåÚŒ∏≤≤ìç;ùhïùÆFÚ6≠±3Òœr^S≠}HóÇ%9±GW˜Óπ ÕÈà‘
¸∆Ò,†~øèfj¥{ı-˛Ä’Ÿ∫ÑåÂ‡º|ÎØøΩÊ±œK˘@#[Œ∫kld´V•¬òjQMï’ ≤jS ∞—B)Ã∆∑£1√˚º5"ß¬K´l*O	1∆	ÒåQmsÀVmsGkúl‘–tÜ•;˙}{¬èÉÙ/˝ÛXí˝+πÁÎ´ Ó’ÉyQ9%—ÅrçmΩ,A±Ã:™ä+‘(yŸ´ØÖÜù_Ì}y˙|ÔÙË’…ÈﬁÈ◊'≤ÊÁT∞¥óòà*ˇ∏f˝9I‡õÁ1y!«ùÈzàÚ8ÓÌçAïÏı6û=€xˆÎ_Ô>Õ“e/Ò√%ÉßÈÎa?çäTÕ„ﬁygjÈ:ÍÒKë+Psk˝Åñ™)ëH’Gñ¬´Jeü„ßü5/®®±vìÖ´LªT¢πﬁlÁ‡ïò|Nﬂ ùÑNYG-°Ù≠|C:7eìÕ¸A`ˆc∂Ö¢"◊‘ıóéñÅ*ñSsÚ8ËŸ4*Ù4ÚæÖF6ˆe‘7[*ì7=>å¸CmH§~'ONˇ€'∫H!o®ï∂9Ôµ}∫Â÷ü,&ö]ü‡BÖv}“ß2X9[9U`aÏ,π"±≤¶∞∏’ﬁ™gam0F÷æH´â∞A:Aˇ@Ö4:¶§ìç0v0(:ô„Ü¯ê°“V`ﬂó›üæ•Îﬂ1Ôæˆÿı ∑ŒW'°üëªã6Ê¨d·LP45aA˜∫1@iËzÁ:ÄlÈÖ¶Ö°∂ù,/‡lA*Øï,I~Q˘ÊA…æ‘Øe;ıN
Ÿrì-a€(Î	t”~öÂFR£çû\&qøWIÌ£:x®"3	C¥Àr®öƒ«∆euNÍ´(Pœ-;Ò¢7kók/<ò^ædΩÛ~˙X∆èÉ™íÍ`-ÔfiøŸ˙ÔçPâ4.ﬁñvÒ>ŸdÙŒ†‡*'Ã!üÑAEåzhFÀ‚~îD6ÉR¢≠±‘œñ*Í8ugîUçΩ»y÷¸úx/]ßªî≈µ4Ù!ø;∆ªà]W‚£ÒË8∆z≠|9Î#}ô˙=Háœ„Ô'q>ﬁO@≈ﬂ‚¿Úr]qˆ≈Pï<Ùãı+˘P!¨_√°vñóÕ≤,Õ∏ÙÚ+v]]ån[≤£YN<ÿÜf™w/›Ê≥b¸y¬à’:={¸iîº¡
„(ÙŒ›U•¶UÅV‚‡^∑è∆hmƒÁí~ÆI∫Vëw5¢^ïz7å≈ÁU\î√µ∑‹Î∫b…9Î‹KrÌN¨ÿoä¿Úˆ◊£rA∏ÑøOû' dlOÈº1!/(‘ø0[,N.~ûç5s√∂¡ππ‰àÂﬂÿ—€Rv¯·i…ó>1’…¬+]Ë~Ñ&ó¥5àuÖÄxLÿ®Vµ •còT™öµUÊ”YœÉbıv¸®»7fÁÏ/Œp¸kˆ›ÕèR\\gObñO"¿≤·%ŸX˚ÈE2DÀØu¶)®òË'§Œ∑Ñ¸«bvN§ëï≈]∏˘˘áukåç≈π‘Æ[o—÷Œ$€ÏR`≤-œ˘7 ‰
{uÖóÒh±ë∏Ÿñ≤(¨P‡ô˘SSfíãÃj÷ùu“-~¨+s˝&~ãºHô	`º˛ª¯-‚P*^^|K‡ú"Iêà“qå_:†ä$≠À&’•T˘I≠TiÌT|õ%@vﬂãóKﬂM3ì1~iú∫Iä*áL‡wı¡Ò”ç2Æƒ—JäÏ6ÆÖJ[æ√’•û≈pœzO®\ºŸPéSNæÓƒóÖt«4U∫õÂ5?¨„z/⁄ÏP∆t†Îõç`≠E%Ù˚NÏA∏ñèí!ÚUP˘mj„˝k{ÈÎåÀ\f)ù∫À•8Å&[∂ÿ∫Ê'ﬂ¬≤∫óqo“èœyêòhyœ+¿öœKΩ!”Ì]¿à¨Ÿe8™¥Ô:U‹-ªUqgM)/Òê^)!b’[mó™±íoºSU@%@Ÿ‰]#c®§ˆE)?≤{∂¥sZΩ
ã áµÊ∂
ŸãÍ9UihsÙ2ùà «—[®"Æø¥Wy≥TW~_iS¥pV∫‚õ©¥Q(|ãÓV‡VKJ6≠6p	◊,D	»oP>õ‹,åΩÅ(Ì§Î‚j?ÚgäŸØS°®r"g±⁄Ï≤D”8ƒk0l‘7ò´î£’Ì}≤ê˛å*=óÈ(E(oÈÇ≥1äCòﬂhz√¬mZæS'9§°6≤P¡]T¥·©G˙•HtØÓÏDi‡¸Ì∞Àúi^X"†76ÿWìNú=∫…5Z,Ê∆kI}á5ﬁí|L˙w˝0TﬂÇe—h,Â~ÛÊUqd”sÎ,ÿ; z´∞BL^…íå(Ù•óÖUÿ—…`eóÂÇö∂:˛0òg—* -ãmeaöa Œ‡úS>O/ÜÕ„eÑI∆h7†Í.D.‹f1Òw¯ˇuv ∫»¢©≈H „ÛÀﬁ´hå3`®Wƒ˙ !Öqw1-+Ë!5Ü%cïãIÆnƒ¢q2∏ı@ùƒ7≥ÓÄÈ^†yp ,≠«¶∏u£3 ?v∆ûÄ¨d18†j
áèÍ€≈ÚÅ{èxö& Ö>Â·ìJ„Yê˜++P«ö†√¶ØÛTƒùù„yKá'G'÷±'˜wUdÁÉ]{*®‹i
_v‘á|ÉÒb„´,&•ÚC∏^G	L2Eg@®◊œ≥t–Y&PÊÀ+Î¸;WÂ*^ùcõ∂®UÂ¥wÂnØW÷„Ô;ÀIo@Å7FÉ)t÷≈íı óH”ÀÙı^?Œ∆ùoøDß»yö ™‰˘Õü∞RŒ#0+¯øãëõ¯˙˙ 1„"æ˛=Rˆ+fQB¯å˜6Ëê¡ˇ òd6´ÀX>™^6π(\
èK%Y•xü‡ZÂ¯ıª¬ ÇF,—#ï»¸á≈¶—:Cø‡4ﬁ}åØcΩ'å{LßÈ˙r›F¯9ã„ÄÛ•àÍ
¯W+ßgú%†h,vO9WÎë¡{˝>»?qŒ√¬ﬁ`©¨+≤Âƒ{d¯°é , e√¢VÏòÅ<Á8Ö[∑ò¨óﬁA&D,,h Ü 8≤y&√I$2ÈÑœ¢‰M :Á˝…,zdïËyÖ£¨ÓPr8gJ´ªbQëçDÅ∫p´ä˘3¯ó(1öc -«/ÖÆ+UŸê§â≈Ï(ÅÆN⁄P¥ÛπÅuPeçƒ¢$◊€%zŸXÁ*¸¬3˝d0ÇÀ1ÈŸ;Ê‚DÆì¨
∏%dxºÇKp◊®‘ƒyåÃvH%Z”7… ≠ûO p∏]…˝∞*B¢u 
C+ÓóhO&
∏ÁMÛ'À4¸|p”«úÑ°	òoär8Œ≈é/˝fâÂÂ‹$Å†÷/{bUñdù'óÚCV#t∏B·Ê8êI!‰`9]4ÂÒ™¿◊U≠AÍ‘.$¿LK"Vè/œkY¢⁄ª|üàIíÕ	–ﬁ>G9&ItQ˜í˛çGÙ˝$ôœ:◊√‡93X¡ıc-“÷Ú‚rN≈så Ë•r«J¿}NæîUQRΩõZLU2áXV|CÁ◊W∆EHÆ≥Ωã¥Ñ$øtÿi?\Ó[µŒDπX€ÑS0Öt›¸Ñwcï_∂…∞±s ZFI…∞õ•C¬Má &,>É;S/ãΩ¢PEÏ—w˜≥‰s€íè~MÑ∑§s†çÍgàÕE#ﬁÃ_:j=I;6dúôÓÍ3Ìd‰@ÿO≤n?.ú]€|˜dı:˙ç√¸e±b¥u
'oæ *ÅQÚÜú∂4,éì— •˘4›øD{†ÊGŸ£oEıõ]V5˘˝™:<
™'∆˝¿Hgì§ﬂ;.æÈ(‘ÛwÒ€›ruËã]≠¸x˙vk‡W CgÒnB7â≤∑h◊Q÷~R^B7ß˙$˛≠¸Ãa±´¡§x‡∫>H=∆“ÎR=ò
jŸú.’«MèK·s)u˛i±„√Æ¶øãÜ∆VS5VÔ¶}Kì
ÏHe±Íi£º^{±˝	[/ãa¯£ñˇ™ÖH‚‡˘%‹œ◊Á]¬Z¶K∑-\∞<Î>∫˙ˆr<Âª  Øüa¢nåÈiÉçÈ÷O2Y˚>ÉΩˆ‚ç'´˚6ﬂ¿ˇ˛Õ#‡UC¸ÌÎÁá(e¶CòπS¢˜
&U∑x¥Ù’sC±ÎÄø⁄πî6,ˆùû}åu%¨}ëY}g«)àqo-”5˘ï d-e`^∏π[¨,‹dèNô…‘Œ9Fı,úÖqöx≈™∑yñÜTw ,X~zf®\9ie3 ®„D√ﬂπAfS;@}ä∫Éß∞RX¡] r¶f’VSª¨‘üÖöuÿ–Õﬂa”?ƒì\\éŸ†èêWn›ëöê7Çñ£˛õª!wæÒümìÙXªÅdMAcís?ù•Q÷[ùÑ∞BGß≤}ßç•êOóä3—iîDΩËﬁíΩ∏çM°–gm´⁄'ÚÒ≈Õei©¸XtäﬂÌÿ¸bsÈ…¢Ó8ô∆ª9®∆¿¢Ñ$z {aÂòâOÆëÔ§†Ä	7Ó%)πèÔ¥Ã˝¥	ƒHFÊA¨@ƒ∞“ác∫†M:d˜Z€w_.F´L›$ˇt“ˇ›”›é"ˆ¨Aòı›ö00Î;ŒP∞2Ó‡M∑?¡ºı9ÑÉ›˜áÉŸ+mﬁßò/@Vä`¯Óâãß∂’‚!]VÆ}€÷_D *ä)ÕõÅ±ï ﬁçO,zÕ):ΩaÒy{qì_ údãÖ§√Gcª«W‹Æ˜–Éï/p◊‹+›¡
…¸u<mx;Ù“˜Oÿ:Øy#nQ#”YNæ¯¸<N∆—∫~øF^o§€$xƒã≠Å$ZƒàDåí˙mî∏àR.O8∂ •ë-ÃL∑~xöE˘eàEÈ@˝S4ùí)¿ÆÃ’ÃÑ{@#£ÉÊh§F>i´|rXyBûê$#¬’àˇé"Z≤÷0Ò%È§÷d-è‚ôËõxÛgÜë4ˇú.¸/ÊaZ”bn‹:;¢ŸËÆÌí£T∏lªÈ çë`†‰dô˝›E]¬´èâÃ’˙:WG”∫B˘ïŒÖ]4¶û•oÄ”‚ø0êÍL`∆g≠ùØèD@K<æL{ÎÈ–^ØÌ” Kºb[u Ïˇ§å¥À,œT'[Öôî‚nbÅòÿ¶x„ùT£.¬Aïé¨]ˆ≤√aaäo*]
#†„Ê€BÎ†kOgÏ≈Ÿ_˚»¶∑^Ω∏b	 |d„ÂUFÀÇø@Zf◊´L¸ÿKÜóËÍTûx*øRÉ{1é“W›Í√˚ﬁù˝ÏÊ'˙…|©GsÀ;¬]Øº$óƒ¿Q€®P.xÅ£8™h∂‘
5Û∆Ÿ$^Âë°ªÁ‚®g◊*¥≤!$˚SÆêZñÜﬂ|·∞¥ı*Û¢FYÍ{¿]2z8•¶Dò¡î5Âï™—∏Ó¿ u:>+<t,=öm*Aı©!…Ô3çU˝ç3ëÿ™”Fa’'Ó(Å≈êÔóﬂ≠I¨\;Öı¶f÷ƒé—„æâÈëêîÃñ'm,Ω(™ùt©e”Ä}`V‰f”¨HﬁídßUKïÙ≈Èòı˜I($:>°“7≥ëu$mPπ£ƒ·`ç"^m}ö†Å’N∏&|›+cŒ˝æ√Ëˇ  ˇˇÏΩ[oYí.˙^øbY„›$ª%Ífª´d[-©™4€∫¥$◊Ùå€GNë)1ªH&+ìîÏbÿ˚a?úá}ÄÃ”Ê°—Ëß¡∆ ˚Â £2ø‰Dƒ∫d¨K&IYÆ™Ó=Bwôy[óX±b≈äÒÖ5|?◊	ØA	àv&Õ»…ÈYÎ´ΩÛ£ì›ΩR—}•LgTªHgDçQçüçéÈ§ÌR(ƒµ§ÛvZëº+®€sy˝o)ƒX˜Gâ0Ù;$¿ÿ?SÒe®ãz>æ»G…húRv¥e°Ò¢Õ&vX∞iêvüì5j˚ºBè◊vﬂ"œÓ{x7+o0óF}}mÌ?°”E˜oÔ*iõ˜± ÒüR˙DQÇ!Î·›ÏªwètP"^∑+àBo˙ÓÓ˜˘w≠aè\ò„æx8√»¯nÍŒ‹{≥+0,å”NÜ‰◊YÓaò„SÉœÃ>q|1ﬁ√◊õ<\˚≈y/√/Ø„˘‚›:›Êxåmw0üûRH<–m≠·‘vıêQ†¬Éh‘Ö≈˚}}mô≥Br?KÚc†.Ù˝UË%˘á?Ø5C˘fÌN^ÉZó,Ï9®Ä5BΩã¿cqÚ¸&…•'lÜ1ˆ…EÏ]ÕÎ1®µÇMﬂÿ>œùÎÙ¢$—Öm	cbïü˚˚à-’g¯4ûIßô√Gq}Âsã|ç+Í¨®ıB∑ﬁ∆á∑ˇãêˇãò}xèß”1FΩ^åÛ6Â	b@Óhø•◊sÚ!ÈœïOPîa‰ ï†–§tÛNı=N\ãËÊ0¬0-=&Æñ#ÔØå·Ä‚xûÖ(w
∏ƒ
î¥˚©∞üøôÃõ)¸?ÑAa‹Q01`¸ˆú¯∑',€˝V¥mÖK˝πÚyâc‚À®sª∆‡y0§—«˜CëmèÄñô–ì_è°ŸmÊ]C÷Ë¿◊¬H”º¢⁄ﬁÅÄmœ…ŸÅÏ¸Êı˛Yk˜(¨ÉΩΩãOôsÇ±.˙ù-˜@£DÚ≈`ÿcıób‰ !—jÑÁ@íUøXK|ÏÉ 3¨ñ„€®J∫èJ–¸+21ŸrÇ•b˝‘‡T∑û≠vÖ+z<îd:ò®…¿`	àV”DÊK–úoˇ9≠π≥æ,7¿ƒ*Ò∏ã Ôã≤¥î˛¡Nq…Ü›≈ËÀ,Ì´5òzQvL3áLﬂ·îôËfS…(˛LË ZÍ˘@¨vöE$÷;ÈÑKPV„üÜq"L–u+Éæ
vmçpn“QcI)%g5®Ê»àØ”Ô∆∞öXhÕeü∆¨ÑòÚTVÃ∫TÚ›,ÄMƒU$î„^|â<Écã,œÆpG]ﬁÎG@Q–óg∂‡ÒZÅ—Ã?&NâêÖRg/*∆ˆÅÚCv°>#!≥7ü‹.õÙ)‰‹qñv†	y©†Sz	ŒÂd¨„oX@;Ô•ÜA¡íÂ¿ã”“ç≥eu™ìb˚#43=ç–éFÏCfÓ dƒáÈ{!o†O˛V‰1ñ¢OIä‰ îÚíY¿ÚÀM8À¿|Äö`¥ÂX63úh£NîŒnÅ—Ídä	¥˛⁄.UG˘ñW`ufd>u{Aº◊/xæB7#6kR¬√¥î4Ål∞3˝•(l±˝DèÍ] œfw)`ê.ïFRƒP‘O¸c	ô0Û#ö6Ÿ íºçëC“ﬁém°fÕ=ÁÊùÕè*ß•úïß„≤SÃúsaûÍßÉT1≥y¸J¯=ˇ÷ò…Ô»á∏õM™›8G∫TH€Yß:ﬂ˙,ö≠P∆wüNüåLœ¬JRX’∏+À=.e9I√≥ôºVN≥@rC∆ª¬VŒ"›‚¥TVFAUVÛ‘¨9àñ∆O@ ∂üÆ_ütJ"}ıFy*ñátŒG)es˝4ÀUXy'Unp§∞X74"ÖÃ<6'çÒ‡£Ò”,Pí-|ËØ"∆94ıI®›”˜·SæRHµv:mïF[ÙZ™µwRjüTkß¢PP)ÈmSLé[∞wxv~∞wˆı—Æ:6??>{3lˆ…Åë≤ìÈãÖµ◊·ÁërCy6¯Q+ÑòµñÜµ≠ÍÔ™v«w÷]DwœîÛπ5;üÖUf kÒ∞Ùe%£“JÌ>ÖEÂˆ;tœæâ
pKù…{
p9Z%yRæ◊A∞‡ôÀ@)Ñ|D¢¯K@≠z>·H(Ûú_†ùï6üo÷ôÌ\n∏J£ŸÆ]ßL`&f?%Y‡Ã∂’>p<T§agpö?∆¬Vã’9•4¯Öœp¬á∏Üò®Ë?‡›„ûïÁ1åH∂À<xQé“qFÁ5û æè—(IEU⁄Ê– !ˆ˚∏≈˜ÒfgÊÆöß◊˚˝Ë*ﬁo£ªœè◊où˙Juù⁄–Ø" >ˇ$›ˇ2È—YÊOÿ{Ã˚U⁄ı"˝◊'È˛i7 @&}ÃïXb≥˜r%ñ–é¨˜w›hî∑Ü√rÍÈ7ÓNª™@ÁO¿&•û
ÅŒ…†È9ªVä"œÆ´´≠/‡—ÙÈgü≠ÆäïïJ†€⁄9;≈ãœ‚˜√4)WÃ	µGò1nL.ı	é„iπJoÇﬁÿCÖ¨∫ç<ƒ¬˚ßòvÎ.$)“º¸∞O±g‰ãké|IL—	ÕÆfK®‚Wßß%’æ eO•·⁄Ôlâúùóuf.â¢%oK^ßIÁi∞•¨†-\%ø{*¨îßbà«6˙hÕãu∫äeÊ‰∆lÑM´_Uu†íFRDÑ;¬8ã.∂Í$Mã;ˇ¨¥#:≈Sâ^ˆ;Óì#`vRHiX‡Üû~xGç'1∞Csúcÿ1Nî:>î?ûö&ΩQ-'wÍë:÷ÃﬂB)zV«œ†Koﬁn◊ﬂºm∞œP®“Ä¡WØ‰o˛QΩ˘˚In†ñ•øúπ∂æ+PÂ’áó†ÉÔ˛$|ı•∫∞>ôA8óÉ]Éåh¸âp=˘≥=º<oÜøWWæÜø–IäﬁVêj™^˙∑£Ytô¡öõùcI∂ﬂ.–m@πÄ	´©∂_\WR‡ñMJ‚p_ÚqÖÀg_üº¢g{ΩŸ¡‘˙ôƒß≈æ¡ºClVôW!:	NRg¿´éºv}YFÿÿq&YC ØøàwÔ6D,œª:’Òì®√/—∑≥¥·qˆ»‚,∫aQÌÖ;œÙ¸ü˙£]=q€o@…Qû
≤–óÿHv•[‹°&üÒoƒt{ª>±F[µórﬂXñw™Z,ßá[†&œ¨i—PŒ_˚^U°≤°^©ó	¨C™erB∞Ó§-ÂDYäí-9+Gﬂ≤J“w}@ÂIƒ
*ÓY%ô€¨(JıÑáı£ÏˆèÍ€U”û’CæºA∏…ñ=Xπ—Ûj	™é9≥4≈iJYÄ≈UEﬁÿ”∏•-D«éä÷≤õVsk©ÈFhY”Â’ õTÛiüÔ]^"n-˜?%ÏX>z/·V.6Ìâ0J⁄˜Yõı–Ü|u¿yã∂X›⁄/kÄWÒ˛9ÒÚ6oí◊kâ¿úµeÍo£I
'|+Ωƒ‰ìâàÚ∂\£∂â1©J«ié∫Ò†^óX¬jaÙ˚^◊∫–Yıı”ìÙ¶°ÅVùﬁ±ÅZ¥{¯F'mèÒÛsﬁ@ò)Øvøe£Í©y\tu∫lOzdõ∑ˆ™Ú*†æÀD◊æ}Øz}’í:é≤v˜,Œ˙ñ∏6w≠BªS¨e/?X_”˙ƒûXÉ¥”$B"–èk<j•_πJxR€∂&êˆﬁæ&ƒb
:=}6´Õ+ËÒˆ¥µÑÓπ÷gŒs®]„Îj_gı=˙C´6¸A∞{™9÷=›2Î¶idÉ\ªØ	XI£∆»„íUÛÎ-1Çd≠_´Z…+≤,‰'S _≈0œZà›¬±∏ªÄ≤£J>-%wµg≠C%f7πV*å.R-}\≈Y‹¡ﬁ«≠® &ƒ˝‘‚WîBÎÓ?elıãGì7°E} 8Û*Ω—¶¯ßFÄ„gÏ∫*ˇi ∆’€t—n}îÃ∫5ß¿f2h˜∆ù8W¬;)≠˙}˚’Ñ©ià7`wlïÓ-;xhRÍ¸ÔíQ7Pç’IÀxì¥:]+
3Y%E0µó≈9™°˘ñ‡J·õ6J2ò)Z¢C9ÌÆÈö‰Ò¢[¥µóSeÀÏ£’¨6-h"á◊Î¿æƒ&á–E≥ﬂÿ˘µ
ç≥§+≈{Q≈{&ˆB6EN÷˘€mêdx°º®x®*<pj3·Ní˛™ê=0v‚ÀˆT˘úE‚(&C@Ü‰w_`|Ñ+\±¨FŒÚVúØﬁrôı.£ãò≤P’Z/wv˜æ¸ÍÎ˝ø˝œØèésrzˆ˙õø˚ÌﬂˇC≠ô{…»^’zX~æõ‰√t õÛ$W9©N„ëÊ—ú±˙ú≥ÎÕ¨ˆjZæL”^º¡“è,•ﬁ·JAÕ∞lÓjPÇÁSqWã∫\oäß»‘Èx‰I…V»,c∏…+ƒß
nh‹„ËiLãPó©H4Ë‹]n—äZHtSgaj*”’4	ÈESé¡>®ah∂!vw£Î!%jy?MG]XD)#ﬁ¿Zkåò˘Òö^_ãaï¶FT §Fvñ≤ıÀœæÁ´pÖ9EàQˆ¡/©kn©Ì˝i‹◊ﬁÈ≥suhe9È,ÌﬁL¥fó¥2’‰N¿R¶ÂN ºA‡ƒ‡5“ΩÁ&”0Úá≈5a∂Ü¶î¬%'∏§kX2«Ωàû„P€7
/È&O∂`'˙ô…9JÅÕ@ï“RœáöÜkï=™Êp=ÏP>[âïÉhhÙ!˘Ôv›ˇ‡L˘~>œWuª˝j´qôf{Qª[Ø∑[eAkùÑè⁄U9ı<âÕÁ∏'ø∂TÌc∞˙ª›UhÆïœ	ô+mh™†
KwÄqõfø
GóÁ‚ÛÜE˙ﬂ0—XNJ´ƒ?T„ „ÈóÄL–ô◊P§ó∑6Jâv›¥Ê—«JòõÇñ⁄Ωè[$"•›P$ΩR$mHç”!¢z≥ „ïK∆Ü3
¶2;—úπÅ
A≤≈öÕS]€/¯H˝ÍπX/MùiÃ≤=ú_M—
7¬ÇßàT¶t[Z~ #D}^u;ÌCÔ⁄òáG‘—ÃDtN«E`Ü… •dO⁄hæ”Î‹#57Œ25ˇ∏(Ö†IIâÍµ=¯ÀP5gä∑jîá…–•:Òë˛X%;z°sGaEú
w„v“Ik”¢ô∞ GΩ^±–ñ$ûˇu™Vº2Ûó“©“®£∑
°ú≥´´‚%Ö•ûÌ∂NôúØcä1L¢ñc˙ÿQ/ì™/“Ïøc#	ú÷(Í…ixÚHõ√qWÕö¨∞E^º"Èkñbfy”Ù⁄ÔGrRî*ñfJ‹º‡¢lZ?cÅ^ñvÒe
?WŒEÚtÅã(æ)ÃX≥Vnª⁄û]›˝ñ€â4ùìØøª
∂•)|KÑÌﬂòú ‰ñ™[mp◊≥![œt±oÜ¥…|ÆÛ™õEKH
Æ=eyt|}]ïS¨ò¡2 ”BmD@,Üqtfy†íÉHÌ$W…H∆Z÷™˜#ÿKå`¶g».¿Gótã|¥∫ªª] TîãPü\]0ä˛hSáîYí˘:ﬁ·´Îµ$é9NñV+õVî µ…‰èﬁKÛõ.m~Z=BJÔ_y¿Ô»@ŸÃ)µıï6¢üÊ8–í3JÌ#i|¨ΩbØiÚ‹œñPLÃªÚÈ∫|6qµÕÂ5c·’ıÄÈ]n∫RzûKÛö9¢n˜•¸+ËzÕ¨^Àö∫kÀö∞kÀä¶kÀåúkÀ%◊x
@5†ü‚‘Ïq*Yºå|æñ&0%öùw"Àuì/p‚liÊΩ(
·/êSÒu9.K í≈Ä´†ã«á„a‘Diò[ÛÄ *ä…ï}ÕVVs›xÈåx’E±Îm5¯áç	#∆ H	8ÔÜò”∞'éÛÎAB÷tµ∞™Ë=X-€£}È»Œå˙n∏€WîÒK·«“o'Páö†@¶ÔªÉ∂ﬂrNnf Œõö›A4Æ≈'O?≥gí+¨IUÒä}√XΩ‚ÕÊpúwy*Br_¬ùè•Œ-sé–:›ñ·I£÷aÓqk6ÛÇqÏO«}å_›ÚòAÜ\êPDm£˘˚4‘ÒHîÊd–ºÆ-F£¯uD	Êd†A^w	Pû<≠ÿñ3≠˜≠—,ªΩıFÉkvñ;áﬂ"ˇM⁄®‘IÄÈMNqdî%o≥÷(∂7ust´ﬂ≥¨““(ù–'∂ÿ—"Éenö9Ú}|º}’•,ƒ`ø·u˛¢˘fÌm—‚x”^1l§j„≈6uôQ˚±0òµYÙ·%=pïOÑÃ√ÏùQñÎ•,ˇm/_óÂX÷A|w„ﬂa<Ë2√ﬁıÌ=t¡ƒà2·∂4õA“ÎFM!≥m`~hëbét–Õ	N0ÌçQÆ2¿ÇéÈù+MÉÓÊ31h£ÏFcN€≈Ó•ìL¬±∂U]¶¶ﬁ9˛ruÁ¯oπ≠†!ﬁãU@FŸ{ÉõØ¯=Ãèªô!’ﬁP;ø¨ê;√À;Ì*Ê≤A≤ñ/`ÄlSì`†õ=ø	Ïn[®ß°hAª∏.€WX{	Ωï(71*≤EY¥?»„,ëfü7ˆQºd∏∆ueÖYB_ä©Û-≥T¬;h´ƒ	Â€'M··›©ä/híL:{öh\†r≥Ä§æí§.6ŒFBÔ#\”#+‘6>Z$Tã+ëë}±Lt‚:ƒTƒË¬„§Lﬂ/\È†q¢'◊ÉÊõqÜìùyôeÅVÜg[ﬁ¢ô4˘â∂±fõ•±†ÑæÅûYMïbÔˇÍyQÜœ¥/ì⁄|+˜j…2~Ãæut2+<D	=™S…Ó6FÁngDó‘Åñ”∫3U√‰3ø¨À…ìgµ|_›[¥ˆ¯Î^ËíjË%Øº{8¡ôbõF–Ig∞S¥∆Íyˆy´tÍ™!»:8∞°Gd{≈ÈHkb¯¸∞»†*>§0÷{í2æY‚Rö=¯ú·T1”kVUrÕ,§O@kàºS¢2ö˝ãïÆñ°5¨∫)´3#˝nª¡√âU’T´X÷·Ì;Rg	iXX»˚FŒ6êÎkZÀ˛›†÷ò:Öb$7f=˜ªA≥Ÿ± Û°˚“
º4}á.h5F4oæÑ:œ⁄§Éà+	ÒÄUw«E„íæ‡á˛¸ûŒ8
}òüo(Œbû¯⁄u†!Bwujê˘HP¶À§ìj‚Oùsìí#Æ'./0âπì¨Úp5Û“up≈Ê∞ıí§∑l´kÅbR6‹mÿ6ƒW˛p√GOY0â&ø„÷Ãwh9˜°e8ßæwCJjÌT©E∞”êv£â•
j™'ŸV⁄¥+ÚÈWRòµ¿â£´,ŒœıS§^å;7òéø¨…¨$˝SMç/`“√ù"4c
(=∏W§Ù¨∫`ƒ@og…Ö1Ójª¨:ﬂ0¨B}|Zt˜”ÎxG5]u„ÄÕé‘
÷zkBE0∫Ã$»§çíﬁ„¿&˝}ú»Ã3õk¢ì†ó±<„îªÈ¬OøAqi∆ØTBc¶tO>ın[û•ßÒHm(∂∑Î⁄Â™a˚<S^BKdÆ´}ù’aóÊ˙x◊æ7;Ú)…ÉQ•⁄·ö›™nCíSçEëˆŸvoã˘åÀßÈæD¨ue˚|‡Å„qv	ƒµÎG3¥•2z‚r€ç‰“S0Å»aŸÓÀ∞¢Ô-q‘Ü.ı¶í4≈.í·∂âÓ´À+uâFùÕ¬;Kà…·¨7öÉt‰úd÷í‹8(ı‹á™÷Q∫ztJúVo∏;6Ìøø†,≠nâí¥÷Û`,ìfŒ ˚2èØ∏3[#}Ÿ§Øªe> úï. Å.ƒ´uîIAq*Äˆ|≈$oTï»ﬁ+§E«
2%£ôFÇ\Øö†ò’¥à:r ‡NƒM>EäLåxfë¨!∫Nrt†w»Œ§”´º∏$WÎ:E.•‘åÜÃ7PWb—5(‹ÀîÓ∆≠∏˝36#mëLÿÍ(S@›ﬂ≠4≥ﬂòóŸN‘≥æë&–r∫’t†´"òÊD
!…ˇ«¿ˆ	∞?∞D˝çÊàôƒ‡ÍH©øáuÓt„®c‘ä&™æñ[a—˛2ÖÂp˝° ßπ	¡H§ènÉ¨Ï≠£ò¥ºE;@3ûÓ3kt˘√ßFCÂVjïπÿ[aíÊí÷◊ûÀµDvßxÿ∞X	gcÅñŒˆ›8∆ßDºz∑ÙpR82'b4Œ—;	∫`øp6°4’wµÈÓ§`áTîo∂I˘;ﬁúÛi—	´O∞ÔTBõ∑ﬂ∞òRW„FÖø:UÚvSF"·ÔB&’eË£+ïo¢!AFå0 ·ﬂº6%C8eÏÖù(AP†&àòa´Qü…rm+º÷D<êÎm3C˚∫Z6öÔTÁ∂Ãá∂uµV¬éM⁄ﬂ˚ıw:5Ù√	é€Ù∆lF·¶Sª˚µ©Q1†∆Wj°2í5˜ìL©‰Ú’π˝Å,ÔÜáé—êé«¢r„áHÚYÙ}⁄ÑM,-ÿ6á!Æ
6ÀÌza£	hFíl1ı»÷E¥8Pñï‹⁄z©˝’®ã∂∫` ÇØZ;ÙÇÍÇ^Æ
+A˘Êºÿú´ÔÕ˘JâR·—=Ï[»HØQöi…ƒ?˜T°î/Oª§ÊP	≈G!¶K/<>πØ°GóÓÌ Œ¨]t5}ÀS¬{´÷ëÇƒ<éAS¿+ñ∏øQM¯Ω/˜˜œˆøi!ﬁûOX±óÁ0©I"Jmhò‚‰&À¸2NF d>û¯fãëÑfå|2è“´´û¶´û§xít¬¡=Åâ<Ã‚kﬂÙ3àﬂèXhædâ|ﬁÏF∏à1ÈJ—…†ÃÃx7ÍtÍÃä´î|§¶°◊)ÑA@åÇ]|F	`f‘Ÿ0H„¡¿<<˜BÉÌaùÔòèvì~®ªöN˜√=O‘( pN‘=Ö“&Áäòó5m∞µ¬¿óãÑ?±0≈Vp[.è‰U◊ã^*˜>õÎ˝ïg}P6¡¬∏À»Êó[xk(˙ôW‰˘pafóÑ4èÈ∫x\–“º°o±óà®≈pY<T‘5OÈZ?ûZ~∂qﬁ«E˝*#Ä£ñ†ó≠¿–@\IPêV®≠‚Ä]ß˙qﬁÓ1sF∫\îMÓç â+UÔÁXtv5∆ù¢T6Í®Ù‰Y{µó\¨*°≤w∆Cßº°ΩÈ8Æse—’òy>°ñﬂ£<¸rÊÑ"µHxh#‰»›X;¨ÏÍ«
˝Ê∞l‡q»v¬#Ê˘Qô:_4˚)®|©rv^÷Ï5´ª–@Û°ˆkmrøVuQQÉåM∏ûıMÅµÊo1˙ãNu√_8¿)Æ<~ÛÿJz<TIYﬁIOWQ˙Œ¥°N]öb7Œ„ﬂG¶≈®KÀmÖQß˚§±¢m √ÃS„>ù∏º∞O˛êJ™å∆¢t61å3-ëº
÷´ﬂAØQ≤à≠∞^Óâî‹$≤ÆU∞?Z‚“≤àéKÚZö94´áûaM¥¢π'€™'Úmöx}π!Â˜<—n‹≤˛ê˚Zﬁùê∫˙“^îüÔ-T´:◊÷mwéÒÊÿk%–>+-˙VhâµÏﬂ/z˛QêT€>@Pq|È0tã{ëŸÊF´É/Bzn)™1¬pHÙYqYûƒöã5√Obm‰¶:ÈmÖÓD™ﬁôŒ/”µËO≈ñ∞‘<ˇ‡µl_7ˇ∆-«DülgTÏ‡=˝È˙4H£‡1∂a<¯i"•ËÖ{I óÖRmQ”}ÁJ7Çà4H≤ò.[U 0€¢:â¨rŸxTI∏>.›œ∫U d∆<ŒSl¶√„,EK.&∂™+0^«Wø¶ ò—…Êù?ß‚∏
|VCiB-›P±èïX2-é`Yë2K¿ÄÑs≤_°˜}^"po¨-mˇ˚˘ø9Íµ3®2öäçÍÌ?J¿:i…Y=Edå€?¶|êœiàúˆ\† E)†oJ¬Cd4Ö	⁄©ÓáFÁ˝q2i)_˝À^
≤éÊüÊ Ω±˝ôôª:sg´34Øâ_ä'Ê?è∏súûì§,`m€œÒµ¢fÂJ@;õ~ºY<ñy’ÛöÖ}_§ç‰çıHSdx¥2¡ïÚˆûAd.¨ÏÑ5Û"ë¥í–ﬁö7êm$j+ë•°£ïƒ≤fÅWªêÎÆ\µ˘Œã$c¸8ìÒòXô-x^QÛ¢YgÄpz%!?5ê.€{‘P¢∂QÙÈ-IqdrÖÂâDv€-æÍä˛ﬁ]˘‚I`l5<øº,Ä‡üùƒóYúwwnx!— È#6z>LvÆ-ûvû√‚~&™õ•3W|.tŸPÚe‘°øO”>¸ªÚ≈cP5UNB¨H∑≤‡<ÃÃIøQ-r≥H.æÁ±˚£íÃ¬ÎkòZ¯Ãws
?În¯I6®1ÙMÖÛÌöTa
yî\u±9hrI÷GΩˇŸkPsØ,)ö‚„…∆ÜóMÒ%÷õ:ä•π5ªVGK€ÍæzYÊ»q+˙~Ç˜Ø‘± xê\¢Foùá[-d4ÁŸ©•ı
n$X≠xñ†ÛÚÂÛ	˜%õ
Ñ#ÑÚ‡ﬁíà⁄Ìx"£˘æóø_∆ˇZ¯ÿ›§”â$<»I√[Q&ŒÄÑãÚ‹Ò∆ŒñÆRè‡œqıê,1ºæìâcê·§ u «C>t/pì€˛∂Ódò+â∑∫ºY˘BÄt2πÿzWò™Aß∂	ed[_≥ÛPÖ2T3$u˘)ìT§	Ÿ´£^œPuã•zf=rßÿêî¸PÆh\U9·A\±9√l©·r ih‡ïv∏˜ﬁ¥•™1ì„Vtèû9·CV1<:ü †;QúO5V#4›ñ‘Y8ÍÎ—@fjÔ»C`ÉëÅâÕ£d–ëÄ#abŒåó	ÚbÄâŒ∏%%É]é]µ¿ k	8|ø≤^>ÎkŒ(ªCU2ÆWãOC¡óñp&VæÑT∞íg£b“ZC<«ƒdí^‰˝≠dÄŸîó∂ø—–0≤X?u–b”¬<ßP®É.Hù¨cxfDr]ù∆WKs€%≥˛Äªnï1“…z$ƒR˜"ÚsΩì‘êL‰ÃÏeßªœòƒìˆHäÖö[è÷XŒ9ñ_ﬁOs»%ì¥ŒJ¨j{2ZTs¯Ñ⁄øQ&èpeN≤¿àP&èÔ¢ã<ÌçAå¨¿ˆÉ&ÒJÜ˙£Ãã¨Úq<¡‘’?Üò™C=£+WLÂ¸˚‹ô~≥∑%}
fœrˆzÅ°ve*3QoúOÉŸóJLöüÃò>fƒ≠›azmÏô~K=µS{9SúÌLø¬ﬂâ≤éï∞ÿ¨◊Ã˛f≠π∂Ò÷Vßgk¬Óf©H˝¨ªÈÈˇyødoS»jπÀY⁄~Ux∂j˛Ä∆¶WÀiñ7Éã•mÙ`ÍãËªqB+©ˆV¬˝Õ0M¥gt·H›ßu}ï 8óyÿ∏Ÿ‹˝t2€›œÙËÔ–qã4sZ›igÆ6|k(x¸¶¢∞D ëi!–v\Ts;?†¸√ :Ï€ùËpÊ™Ê“3êf–KGNÈﬁﬂ<y|›};3Â˚åŒﬁà†±ﬁª<K%zI¯â*=≠jSXâßü∏⁄ìû∏Zc6jT¬Äl•˘ŸK≤≥À˝ke"––∆}›Ôv¢xw˛≤ÑÊñ«ê;ä3ÎıÁÚ“6y'›˛πCá±P|·ëE0Ó∆n»üXñCÒı◊[˝~Y®”πV—¨ $ r
ß›≤=€ÍÌ∆¥§sAçwmbGGÕ∂≥~Õôl√ ÔÆ˝ÕBÈº{õQGÕFTzëu‚Àdê ∂1I–%{qÚ;h®uÆ®Y]„Í]—/Gã⁄ê¬¨ºã%ÉÎ%=D~XbV]~^¢≈Ç…‰>Ò„®öÿP_Ö[|6"ÑìŒñ úb∂yDRƒïzÂ÷;Wh5⁄ŒçÓÏî^ÑV…π¨pæ»+·‘Yæ¥ÕI€T…∂Z
¢“Ç`Ÿe,⁄¥·∑"∏>¥~‚œpÇDÀ¡øﬁBLÈ,‡D(ßÔ¸Gó’Bk3,≤Bª{.?Y[õeb√?≤ÜÊº˜¬R 1˚¶ñPß,®ÊR'8úÆıò_˙Œ…Õaã≤˚±µçfI?«IÈö¯%Ú~pÿã/G0N¥\›Ä˝ n≠IÛ¯@7ÏlﬂÂ;RivhE”œuFÅˇÔ“¥0p◊c=Sw‹èÍ
âäıÿñ@K∫†‘«ŸÛ•„8EÉ∑BV1póïmn‰ˆ∂ªÇRs¶ôíKœﬁ bò!9=≠ñ7èoD@Ò‹J«#4˛Pﬁ`uÀ7ìŸÊ‘˜Q IŒﬂwÇ≤XÙ´ôk¿¶>⁄(Ò”*ƒ⁄ú,Lº˜önï∂;Kœ\Ä|ò–2O·VJIä5Ìâú—¨§∂Ñåc)(\/_⁄>¢`õ&§∏˝Ó	E›a`ì≈TçŒjE‹$Óvïß·<ER˙íä2¢&√7¯ÂÛD y ’âJ™ãŒÖv€»WUDN†g´í;Ÿ-ÕñE“œÜUæ†Ô∏ﬂJŒ‘cF‚/∆oc°ﬁ\õ√Ã\Ó·,[2/»íOÜÈíxˆ[k)≥◊o!‚”1ÏŸÚÜ%Ÿ≠6áL¬πôÇ∂n†≥çS¡5èÙSkqª£• ^¸÷‹eÔ”  àcÃ ˜aπ(©d=Oo<qÏ.ïlò˚B…t]G¨3â¶-€Ï&Mi+pÌ∏Œ3/{b;Õkƒ0:ûπ´Á\»ê·Y˘E`ÅA0zBÜ~œ≤/m˘-Ù]¸+5Dî»û`Ùèlã{T≈cP'
5∏ﬂ—üy¢∑≥úÌ$x>AòÆÌ«ßÃFË‡›?Çô¡ı_hkW¥=ºv∫1»E%≈÷˝=ñtı\æ¯T€%>¬∂µ∞uÎ~L[Ô_Öd_¿ﬁO)5_@≠/Y]>-VŸ∏Û˙∑5b1Q·Í,^Z¿”ìáPÅƒTÜˇ~ôºá©µQ ÷öà¡±\kÃlhï¡n÷”I€ƒåÑ•±,£dœ˛…·π´zñyh\âîRw¸¸}e¡'ë±∆ï∑£í≠+}î›*(5SrÃˆewá9óã≠ärı°≥ú-F»˛ îãL‹¨Ë–Ò,Z“l£v©3,3f˚«ßºë·’-• PÑßñrjuo’€Xâ/j|·vîÕ¥Ô:Z¯‹Æ Ã–{⁄IonCoU«]◊€≈-ı%FØèÔ¶v˛Ω[«ÇñA©Óy6˙üèMæBF7<ÌyÍÕÍ]å:ÆxLà˚:≥,ê¨Ω3KÍÑ›bœî√Oÿéyıó‚%"uT§Aã÷ ?àïqù‰	F˙å–ÎCE?Ω@ Ò:B4,√0S‚t†úbï€ÆË§v√⁄qoL!|Ë(4$§NÇ†⁄@EÊ4ƒ¯fqõål∞i"P$Ú)BH:§ø\Â“JÔk\n÷Äœå(t∑z’'†Ë'=ƒù`gKÚkwÂ#ÂF0>êu”›NtQ⁄¥ıdnNˇ¸∂lyßÌ}ÂÀˇ¬Çˇ¿À8J ±Ãe9”òo%-˝®“›
ˇ‘ˆ„ÁfÂ	˛√6#‹_G{b{nÜ√˛Uı˜"!∑)[⁄qÕ¢0-·>Ö}ªn,yÉtÑçIo‚éØ]xt
ú·G/,å¨Cíê/éæç˛‰Î#í›sH«¯˛Há$êíñCR  ≥ Oi™E˜ƒãVöÔÌÓüµNƒŒ´}ƒÎ R}sdn∞çù;;á¿(⁄Ú»vm'ün*Û ;ÿ;G«ØˆŒéñ¥°ŸèYüZ&Ê"∆v¥j6õ˙”eÓueüÌ$±(ˆ]ß/WY“¯î4˘ ÜŸp≠E«®KRﬂ^ûËﬁùÌΩ⁄˚ÚËpœÔò‘<yßÏ¿«ä~)˜±kø·.q˜Z˚Ø¸∫…ÈÏUŒjé%ﬂ'üª‚Œ†Áfòû;£¿ÍêFs˚d∂ûw"i·{7Uwˆw[ªÅ!≈C∆;PUz˙Õ"™7¥ßg≠›¿Ñ!o¡;¥By~ÙÿÌ#1˘ÉZÏÊãqwe˝—R–Ìra)∑Ω@)âºÿ7ª]nﬁlº•V8
∏∞◊≠T–Rﬁ]Ì-ëÍó≠è/πNÙà3›äﬂSo›BAë˛gúìV˜’ªK”Pü™Nîü≠ı
P7r›I ^Î≥{ôºzc–@E7ùMùÇ Jµ≈SDÖ¢HÌıÔ¡^ß∑∫ª/uñ£v'nÿø∞ÏwfX˛ıBˆXÑºE™åq2‰/Ë`¥«π·}¸Q¿vFtù¬∞!‚ÊEﬂ˘U∏AY∞¬;’ÆY¨YÊ+øæenvïQÎ>LZü“†ï˜e¨aYÌf¨∞Îë4b˘‘ª´ºå∫v⁄‚<B±4à∞Á«„èPıQÏÇ~ÛqÃ˚¸û9f#¿1!zN+Mèõk@¶¨ıV‰156ZﬁX⁄Æ≥R≥,áw‚FghÊ@ºÙºù·˙I|XÒ¥$∫•hQŸiDπ+	ó2îx'ª˝’÷°≠,!ßl—ÅÑJEYﬁ¿∆Ï≥ä`”É§*µ{ÕtTò›JV§ÍômôqÕö[ˆ∂ßÊ’Á±!sbÜÃ…÷Û 2ÇQÀöıó¶ ˛ g°m˚ˆÛä7´Á´<–+ü[U“jˆòå˜≈ÒÓóïßSÜ°B)RJ˛ñË{!_p qÁí!h…¸207õxiøXÛMÀˆü,$XI}FMNÓ-K“Ö,j÷üˆ¡⁄“ﬂÀ¯POÖóYf'3Ot>`•›Î¨¿2k-O\d¶5ŸÑ5“¯tFm”jrñœ]¸˚+ôø¯W}–âpgà˚:{&”˚≥éÅÓ<-É0Œü+Ï´¿ü(,`Òˇ|l}O˚I’9¡}ÊπdŸ◊®?∂saq{ÉØÒ ™C∂V-á—¡ÎËïFïf˛ûéƒ‰àø∑ÇE°ÍWVäª…ó÷]˙Çz¢é˝ÖÂ˜Û±÷&⁄Eöl˘Õ€ÍÏÍ^⁄{Ú’"-ÕÆj„  €	•k∏ó∂∂d,Ào»ítF´ôèGIã\Ù≥˝≤ãÈ•Wx&=ŒRî¨ˆ`b^ˆr]–ùk0√VpüXy‹òÕ?ÅÜ-æ˝cZÂQWN»
7ySπlï—(ÛÓ·§‰È‘y2√3E‘aÃ=xd2<V+Qˆ∆µdÇ˘øÇ˝Ï(K˙Ñ‘˝•ìÁûVGxÂ∑ßÚL„.çáUoømJÔé˙À4Ì≈—Äg∂Ø0¢ï∞Qπ£âWV…2‰åoäqf%æ%•f‚;ÿ0åGYˇG∏WPÁÂΩıÎ±=ZûXÒ;‹A=ªCŒÆ¨%îX=¬ƒnLg.Ì›ï·˚¢aÎE–àtpäÜ˚”®áBTôJÜ¢\KˆL°bU.jGa]
µ?hÿ4g¿S=•&–P!Û€:¸¯µô⁄©å6˙`∞õè¸„2˜»ß])CØ®MÀKg¶v‰◊gß›t8Ñb_FWZ!}BÊ–˝A“N4^íBhîêÁïË©ÊC?´#ñENÊú£,\˚6 9Ä\§8à	òq˜2Ì€r9fâhâ:‘; ~ u@±Îò!!l˘NÙ›8Ó≈‰¥ıî $ò/ÿM¡ø±Ò∂R¢f®d5AØ0	 -ëØs≠«maá•¨Öøø˝Üt–çDë® ‰Ø
ïﬂ«8@	PÜêﬂ∂UlÃÅéÎ¶ÎùPö?Öve≤OHÄVñÅM¿¸(r¬·’ «°ˆTÉ∑JèÅßz”7 ´≠ò ƒÌ°>*)ê`Ÿ◊ÃFí¶Ìëy]{Ü!∫¯¢—EÈ;Ï/€‹üØhIé…-Øıæ˜À	,Ím`C\à4óGHπB8°·ï—RÙUiB–0À“ßè∞·’!Úﬂ,ﬂÃ´ån&Ø.íˆ4nGiK¢¡„ÁTê±ºî à,EèŸ¶†•j´Æ(ıØÍ˜K|òYWÎä/dˆí-”ÌÍ8ÉŸŒÖ¸oâk	$d…{\bjw°ùÌP"»,≥¶
z
B∑=Ê⁄Õ∆|nÑÓﬂñb¶ô/Íñ•5îÏ,¨•1 ö™Ó◊liw=)Á™ØíQ™Cì‘i-x∆m9eH≤Õ
™
÷dÅåÈ‚dÃ—¨≠ô&÷R;b¿]ñ÷˚CÆÏıê>î`J¸£~[µﬂ9ƒÑ—≠B_ÃDùYh˜?Ôñfi[*Yu'ÊaƒX5-Ë™Ä˝7I|ÛuÇËLåNˇ¢Y˜Ù˘Ö;IäÖ…·[~ΩpÙíS‡ª8|ÉYASÒµ…^L1ú◊Y:8¡ §“Ätk$Ó”Q…©Bp√FwVv9/N4úqÂ9C£ôõƒıµe±æ÷ =Â∫‹M∑{∂@
¿uEÑ6˝X]ÁN‚vúG/?ÏwÄ;Ø)€ﬁ]XœäNäû˜‰cÊì{ mpCÇøÖ;J86◊¯qJY¥∏ú7n„,r¨ê∫ﬂâ/£qØP0∑ú>æÎ «D%ÀÔ+Â&Ìz;qé⁄ø˝7ƒläïW>oÿnÛ≥”í&p»;èèÖÜ™ë/N«}l–ù+3€¯u≥ù≈Pcß∆ÙõCe®åñØ8YdŒt±ôüîéË“6∫]œΩPÌE&¶∑  Y0Ñ9∫Í|8éíé	·aSEléI2É`˜√⁄qtïR¿˜±:í≠¬Xús\fáˆñh¨eœmí,—¬òQ‚ﬁî∞è—ú
SU}4*TËRüzv⁄Sâû™õ4Á[ÅB°x‰Kÿr‡j®[er⁄‚Ûì4µhÁw]‘kC‰ª.øµä«Ÿ∞'√jŸR Ó˙0F÷≥ Y∂Tﬁè#¡O≤ ^#ö;bO®£6¯En¬ËI∫NGUˇˆØ‚˙°π≠è®>’b’.Y¨˛‚ó©ˆ'Y¶f-QÆ¿õÏûù¥ŒéŒOœZgØOœ_µ^ÓΩ:}#ì>èsRÓı≈_·ƒç‰?ãàù®5»3öˇ‘ãkÆBÈ=≠BÈGÆB¶Y∞•?ªe(ˇˆÉªÈ[ﬁƒ¸Ô≤˙`óÂ“ìÍ•ÁS-)È_Îíí˛<ñî£ìù÷¡ﬁ°ª¶úπøÛuÎM WñÙØae…√`WaÔˇäS\¸+Ú£Ó∆y'~-Sº~“T©Å˙—ÂÆGYF#ï?ï∑∆§Rmg j⁄©N¢Íº#Û©B{∞Ê“N6˝∂VRÌ¨„BgNUü´-Ÿ 'èf„⁄1™kah´I‡‰LZ˜s&m‚ﬁÅ¢Âd—“\`ó]‹õQ¯íüÙ@ag8(]1*Ò+xıÆ)e÷©ËB^˘hÊahÂ¿YhLh†©«xcÏ9‹»3„Tp[Án÷Ëø}Hggü+ÛØJ√cO‹)Œd˜¶x 4¿Õ_-WÑ"e∑?î{ Èø	ß‰R∏ø-S¥À˚ÀloÆ!µ?B§•Âyx”∑¿mŒÇÎı≈≠¢ˆÔˇ¯O‚ooó—˜òspòyØ£:År	–6˚*ç‹5Çî∆

Q•¢ﬁbD]ßU'Ì«m¸]£0˝áH{]Y‰0Ì êTj§ÃÌ4F>¿√¯ïÒ∞ÈAÔ{Ñù5dUg÷≥·“·^0ºûÍö√=‰aˆÓ8ç˜π†wàX2ÿ^3rI“æÄ˘í,$@ıb‡y7ÃåâõwA,O[Ò®»hñ3◊«√|Qà›ÍÜUÊåπ^ÖüπCì∏íogôU9ZóO∞∞ vz†≤Ê
)›ä∏ü/Ïÿ\!F>∆@Ú%Ï2πœßR-—u¡V∫b57Ñn›™d‰œï®Ø¥Êﬁ»…U!"*Å‚¸h$u4›J :˙Ô˝ÿÜ¿X⁄ñi$^›˛˘ªq“I:\$ù⁄ﬂI.£;4ö[€ìJäoﬁ;ΩÕÚPP;ŒÖ>@ù°ÆŒGÁb“TV•Jóõ&|ªÑüÀˇ¬é—¡µƒ'ª
·5HßYØOñ∂˜r$Ì2oyø˜åyæöÎ\(⁄üìI!`°√ÀL%Ì ò˘@Øßr	µ>Çg”ßü}∂∫*VVVƒÈﬁ…7˚;{ßxÒôÃVÜ⁄øµcDf˜–]∫>*+&ãâƒ=ÚÌ{[B?¸Ét-ûìê,ˆM>æ8ã.ñ)˚˝DG¸qNdÒ≥ZöücÛÎoèŒ—¢_€Æõá‘?]ûjß,Q]XeBkﬁº›ÆøyÀ?c»õÀˇX√—2åΩ~œ˙D⁄ø$CPŒ_∫.≤”•j6lE€≈MZûøA®æ-±&ou“õ¡qÙπÿ~0Ãí4ìYÖ%\OÌ3â≠ ˇ@Sˆ./„ˆ»≤»%ó¢˛¿ÆÜ2OI~ë=¸˙Ú›8Œ>Ë):ÊtH“AΩW”Ø5¥}”ç3	mYË~E√ÛÁq`’Ü˙ò/?¿G⁄`çuÄ5…ˇäáï˘,ú¢aﬁMGıÔñE=WñΩëçøy°ŸI€Ú(á¬
TtVá\8õÕfßâyó4T€%¿tYº±ˇVíV“Hb˝Ω¬◊4Ëcƒ“S¿$XÅ:YF¶|l!W è≤¶ÈAdLÂÌ¶Ìzˇo—zY Ò`Hïgä6¯S—éFÌÆ¿î]3vÉ<Ì≈Õ8À“¨^€ÉDˇç£^Ú=ÊµëetR°E‘Ê±÷E")º~#∆°¢t—ÌjFCã¯ÉZSF‡Y˜ÿÑ∞πí”I∂"…’—qËÔ›â"ûœäyıTÔ'@˛≠7≈1ü»—ñ!Wr¥C`QÁCYÊ…AåtAÅQ0/‡F‘ì…û·?†à˙Z<@÷n:6¡ PALHﬂQ„©∏dö=D@€h‡ÄΩ_'Ça;Ü±\›Ò+"œç%¢q%K¢vÑÒ_=ª-JLÚÔñåﬂ:Io`‰p†’mrìèá—Ë2ÛcMÜ|’Õd §1†yfg
l◊µbﬂL;ˆ-ÒÜ€˚á,Ì—>ÃÅZ? ó’¯F€)ëçπÌç∏l	ØlÖìøÖë8\7wß¯F·ÑTñ¬«}´Ç≥∂)ßu˘s#£©˘Ú…y?uS$À0yœh¢ßs¡”/‡˘ìÏe*û/Óòè¶ç¶Ã≤SáZ¶|úzzÏb‘Õ“√O-÷!vﬂ« *Õ< ˘Ùÿ0”c‘≈y⁄NPRÎ•»’c◊,u:(¿*÷áT-[˛JQêHµtKˇ(ûË5∂îEu\≠”,cjŸ»∂Ö˘“©öVãY≈b\T•n-∆ÇQëm∑‰©X?zèNÁÅ/ƒJ9ˇ±Ÿc◊-Åßf–Ö˛PûØ^2C∆·-2®a¶€0Ω∆”i}&®ÀÙòª,h($3≥Ñ	)z™V2`–qêõ –"Íìxåá|ûäU!3¬›¨FÌ!,Ó ‹∫Øs◊>í˛ÿ/¥7ˆì1Â¡·+ì°EföxQ¢9ï;éö˚"àT
[§ª∑∂=∫›O¸ö⁄z
ªï0¢¥Õä!XcÙ©ê◊jbˆ"Ìpù6Àÿ]jÛ;ÿ°>ú‘©)kË ˛*m√"~JΩ™◊Ü£ïó'5Tó˙… Èè˚_‚>§—nrï “Ÿ∆2˙ü`¥÷;∑yj^Úû ‘£ÿçØ„NUCM¶oá»@EπåÿGtrSw≤ÅÇGpÓ;ÏÄ«î*Ès˝	Én€≠ØéÃiám∏„O"ìMﬂ(aEC≠óQÁ*¶_`˙G¶x©f»SÀöär¿’R?÷ﬂDŸ@-¶≈◊†`πk˘∏+OÒ\z†±‰XgB2ÏÅuÿ‡4‚øœ¿msL–∫TÏıus-.©¥◊«x}˚«€NÀh’∫G†ëÇ.&◊1˝√UqèTnârÍ"eLAÊ
æ„”åÅã√Â§‰(›ïh2ó:ÃCﬁEQù¸Í lMÎ*Õ"O¿$\¶Ô]É¯'J÷V?ﬂƒÅU¥∆phP>sü¿ß »%∂cÇ“àı¡<Ô/ò˙*üÒRâﬂRwÂ◊2¨⁄ENÚ˘ñ=˘·ﬂ<j∑ø∏\”Ytä,Î„ªªæÊ·ˆ˚;‡zF*‰2„ª∆tõxÓ˚$ ‘œ¨Z>ùÁ˛ît™úÅÓ…ùú∫ã“	'ñ§¸ZòFZÄTSË>Ëa=}ÁÀ?Ÿ|Ã¢–Ô,DüLã†–Aî°ªÄû´ãë ‰+ú˘ã@Hõµ á¨+úxl3Ôøˇ?ˇóÈ	b»¥A˝πÒÜ9`€E°¬¯K˜ﬁíNk9ôï9J?1≠
/v`7TG®¡≥:v
Çnh7òZãu–˜nÒ(§ÂótπÖª¬ç`	8ˆâì\™≈ªÛ€≠ÙêkÂTØÕ”>ûÉ√˛äÂ{Wn ™GV–∂<ûeı1Rp¶¡‹Ú∞]Èƒ∆±J¸¬PA{ÔÑ~ë—∞ÌÌ?ıòÑ'Ÿ∆¸cewÁG±ôæEDﬁ/D§9Å¥˝3Û∫©üDóëhe£FÈ €–sìV-ÃÚ‹}ˆU<à≥§˝
^C‹aëRy}CÉ≠búó/	óËÍÂ ó∆Ö§É€8ˆ∞aJ≈·´ÏˆÙk8Â©Ω9∞ö¸1µ£…Û˘D[îúáÈ†’È0ﬁÊ&çQ6∂}°l¨8Ñ˜: √Å>¸í∞42kçç\µ@*∑†i≈‰±y’:º˝Ô≠AπÿË@ÓˆøÅ^zt*ZáØ[Øf§≥·πŸûx«Œ3|e(G‚¨dh°r‡≥XüÅÃpªE≤9?ﬂŸ3Ê ue'‹R∆(;◊U „µ)|Ó\ôÌqﬁéœZ°ÑvÂ}¶}+khY¥Sò‘’v\> ≥
MÂòrx,Qr≤ˇLZüE‡ë	§Ã{”Îãva-ÙÜ;Xæ◊‘]Y_¥ªYè6677√©DOè˜+èå-åHö«˝ƒÖ;P©Ò^¶Ìq ¨y˜ïƒª•C\Eó.¢‰}¥¥˝ˇy∂*üÕı°NÊrHˇ.Ùi‘Aï-¯ÔBüça\07&O˘Û!W≈kyØ™–yâ±Êüµ)ív˜NwN@ÿﬁ˛∑#îLZÙ≤ÜÌ© ˇó.å}ú=_⁄˚ÌñxŸ:<‹;˚«'{ßßGb˝∑Îbˇ’◊∑ˇ„tia∑lË%“¨Æ~”zut"ŒéŒZØ@≠x+ÓË√ôÉ,ï~èÀ˝‚ô[˝ùÑ§òê%	ÌF*Éé˝N£¨õÅ˛ÏÓâ=åÒ›máùÓBÁ–69W›√à≈˚Èg‹WoÉC∫XjF˙‚„”3Ü5óÈy›ü>cÖŸ5îúQ©v”ÌW—‡ˆèQÜjÓ§§WV&ˆ‰°}YœC3€ã%∂úŸûÌ®-
h˚®ˇ˜î≥ï}
z∞uÕ¶⁄πkˇåU<˘{ÚÓÇõRc≈Lﬂ–Cï]ç;	˘ƒÚ‰~$10Å/(>†¶â◊á˚;Gbú#~Î(B„Ô {˘(EW:tß;gq÷O≤p¬“Z∆˙0 ‰* d>#ﬂâ•‘‚Ë|,Î[¬ØèwøN˚=BÿR˛rÈ^ë*ÄZúqòs<IW{È.'”Ñ¶Ì¥¶
≈	+˚JnkRE_÷Z˘≤PŸ9˜asâwë-:‰Õ$î/oà8û™Ô∂îìÀuäÂÇó≤%ˆ◊Ëµë}¿KÂ¸&ø•“·€ˇ=·∂dYêÎ!˜á#ƒûÉBè£lî¿ömæùíß°“õ¢F»Æ˝f–ºIÁ9m0·ˆxê‡yÌxP8eùé“ˆ∑t#g.®`Ùá9ñnkXx>*Æí\Üúo!ºSå◊ßÊ¸•ÉÚdKÜ©$LM1µfzë;]B,/ÿ)•:zxfï|èn/≤WËñ%Êò·júE'i/5mæ∆√<‘“˜¶ãxÌ=”zªnÜ√r:åÆÈh ç'Ù3Ë3¯Y•'ûd4€◊â/6åΩ`	°¸æ¸÷Tl©õ∫ÅÊ‹]èrPEG+
≈le@.ø†ú¢˜R{¥“M”oÛ’¯}7¬0—Îx•Ûœ§€õû-¨≤ÄÔruπÛóYeëE_4a?‘«à›	HÙÜbjÍ5:WƒY>H˚ËLB∂û&"(äà©¶â§±‹ø˚Na–›Ø@j‡$HÆRÅ∏˝#u$‹ˆ8£Ï w™÷ôé≈ t«}òì)…(¨ôB‘®◊(˚ ≥‡ûÙ¯¡⁄”ãG™™/I‚14úÜ∫∑‹#Áˇøm^^ﬁa_&Ô14∫^î¨¶5•Á‡ƒ•≥¯„ì›Z·öΩ˙Êˇh≠¸C¥Ú˝ÌYπ˝ˇﬁÆü÷j√p”Å~3E|øºÔNTõ¶+'Í(π’n^”w∆Û¯3´K— Ùúu÷Ò√KE∫2_0)Âx€˛ -{≈àø ÈÏó•P4/‚%s˜xÓ˙û¡H~ºe˘»{Ÿ»M˜e)œs)sã˜ô\v>	ÌΩÆ•∂Ûjíü˚MFHˇbZ})âŒﬁóBû"ù˜Q¥ü'$€ãÌÇ˜ƒJF‡sæ&¡k…œàd≠	°
’GÁ}µ@âÔ˘¬·Øµäòèÿ]ˇ∂Œ}/PÉ\áŒ3Zàä*äÂ)¿°àÜ/Sˆ∏ﬂ±G·oiç;Ô´EŒ|«ñ>˜õÈS&µr©âÄ˙¡ÖS•,í¶ ≠¥‹ôT9∫ìJ'Ê∫öÒçf¸]]ûΩ≥z–º‹áQ5k‘.åtÒîÕÕkÇ~«∂Å#b‡ö{ËÄÚá5∏Ôv™ïb(’BS¶R5Îû\ñ)ΩqÜ#\.ì…´˛ê\ñn|f˘}wàF˝À4√4W˘ ‘∑r%ﬁ'Èãf_Üå“‘∆ hí§Én‹Fè∏È;”‘K…Ωñ?æ\∏π/a·àgZ∫÷t«êÆ~h£˘ƒ÷éj{ª˚g≠±∂w £Ã[ª≠”≥ì#4Ïûæ>@É˙Ò…—ÓÎ≥£öqòö◊í˛Ò6ÙELUaª9vÕ∑bPˆ˜y,¬2]»µ◊6E8J&XÉ$P€\·o~≠÷Ô‹˛è›˝Ø†ı∞ó<9<ı”ˇ¸∫±d€–v„‰}åπ&/`ßÿñŸUå{qRÂn@].p^ ⁄¿∫.ï«R„Ya ÃÔﬁX-Ñà;√Úæ”:€˚ÍËdøÂﬁµ…=hŒﬁ¯(svâ;@o•GŸ4üIn£ê9$«L1CÊ„S8÷d≥ç]⁄>’?E˝U:àVøÅ5Ø∑z„^£Ã≤ÏîBm⁄g¯fÌ9Éæf˘úÉ“p!£3ñ∂[Ê∑®Ô˜∫∑ˇíØ~gÉ‰˚y[“°‰iæ¥Ω´~Ö?ô≈˝Y˜SÎÎ√˝›÷Óﬁœí[Qô_åSÂn‡Æ\: =tl&Í„¡ºLÌ’“ˆo∆	eÏG¢˛Ì’º_ˆó∂bÃı
à ≤≤ﬁü˚À˝Èo∆Qá23’˚Û~ç:Î“6Íßs~–K†™•ÌW¯è®œ=Q„Q∫=Œ’=ıK¥ÄÌík†R˚ˆá^{rúAâ 
ùoÍX÷Ò…ûæÉ⁄ÄF–ìñ®Ôº>=;Úé‰Ü¯˘“…√– §6~wZûå±Ìß	ÅÖ¨§wﬂÏÓ∂ÈîŸ˙ﬁ°SÃû¯ù˙©≈›Ÿ˛±‘'A˚Y <Ω_LÓ¶⁄ª >µŸX⁄VÊ˜yÂ®YÇG”Í◊úJ˚ÍcÏ#ñÔ9?∆Õ9ÃÕ¢óÈéw˛“ñm¬E>z€•=êløyΩ˜¬ÁÊ—Çá—›ï1l	K#Ô˚ì 'Q	y:y,óëÅsg√B¿jÍdìÕZNáD+ŸV™^ÖíÕ@“¿|:M˙•`J˜NŸ–ì<œ?í<hõ”'p÷˙sòR∑È ∆6£ÏCΩO +æiY1	è/òáIZPJ	ó‹+E>˝Ù1$qÁM b.Lã˝ATNç≤9√ÓLÊêthéálÎöjq03ZØfy„≥èªhÕ÷ëˆΩ(ŒÂ:∏˝?˜éDΩıjÔ‰¨5””H‘‹°_≈…¸'Ô”˝-ÙiVW¨ó;Ù«9ÍˇDùzu¥”zµˇ-ÚÏsåç{Ô∑ƒqÇ•'l)7¸N≤¢;t—:uöeftØlº√Iq˛ã∆	Iü˛FÕ:.ûËsŸsèÙ'qïaZî-û≈['_ΩÜÕ2,Ä†Y≠¥ŒˆNˆ—◊∞ﬂ è"È@4HÖŸ∫3€ÆàïêÀ~˘(Ç⁄>¯ƒıÊZhÏä£∑ªå˜+π?Êúô;S∂–zrìE√ê+ﬂÃ@µrƒÕ5_ay%{ö„q‰xêoπÒfÜﬂ ùü,µ◊1˚asÛ◊o	MÈ¶,1F∂-•¬∏	;j[Îtç˘◊nko ≤ØŒWã—Mîπ¯C`©‰-ò/ëq®9Ïf>çô≈Í±Å~Ï«)˘	√ƒí(ÏÏ=π©∆Ïá∏¢9÷œ]v~%q„}≠Oô–T∑Oâƒqk˜Ñ∫[‚Â—À˝√ñëA“[1}¥}Ê‚:Ó„°∫B
4jö<ı∞LÅ|y†î%ùºßÖ¥Úy“+T∫oF¥‹¸∫Éq—*ÒŒ2Œiâ∑§9¯3[’f¨e“µ‹(y'%˜¥S<ûº˝c$˙∑¿Ï\VÓ©‰dfñ5‹≥Å1Fn˛µlc≠â€e Ê◊qá≈Ãràºß≈l∆–.Dˆ{‹Äã˛ñœ‚9¸–•gXVî≈8ŸoÚÁìçi¿V{3-¨õ≥lµ"ã1¥ƒnkya
ÇEÃ∑ÃeiÊ°∂=zÓÂ"ÒZ†}9™√tEÇbÈu;ı*∏ˇòÇ`‰¿t[µ ÁÕ)˙ :)åN!«[W>ŒD´á˛Ï∑º˝ü±Ã/°Ó„kùÎˆ€v¡B
îèøÂ˜núñÀ—Zó—9õ≥ı)Ωπ%Z√·k¸§…µ¢Atõ °⁄Í¯Ò¥it`˜ä-oDò«!Ó¥S(áı ò∑^Û™5,®VTï%H+˛≤º∂-omÂ=∏¥£ˆ+˘€Ú‘6≈ü∂‘ø‹qÂß´∞?=bé¸ÚU«ôünV;ÙÀÔ∏S?›q˚’Ωyù˚U°!ˇœÃú$äEÖ<ËH~Wˇ=ÂØW˚%¸¶_Ø!u	Ù* €Z—:•Ss‰õîBÃE@È´¬∑.WŒu—S∆_ö7|/vÍjΩé˝—yÂq+U∑ÒÖ¥˜")$uGÚﬁ√_˙ÆÙg¬ª¯À‹5DO‘ï~*ôüpüg∆$†b†ã™œ»˙¥”≥y¡bFzá˚:Î◊
ˆƒWåo≥~Ãòé`öã4ß™Á“Y?∆P™Ñ`ú±æ2m, ©ÅÚÚ<2d(∏üoÁ†k≥«í.∂∑≥Ô”lmPÒÓHÀáR»‹'<Ü∫«%®ù¢	éN/õ`;€e∫OÉÂ:¶:¸Œvƒ∂À¥üK¥,c‘∑‚Ü~ái3¯Üπ‘œ-•ﬂ‡.—vã¯ì@{¶xæmâ!ÌOÊœ¥œj8û«óh⁄ÅW-ï†Db•–bKuß©ûl•Mö_^”·&Õt@©=GW†CûÎß(Ã‚k	¬˘KÑﬁlw„~Ñy|zbo¢“THË—5’‡B¥æ0æ«⁄=W'$’7ã˚Èuº£Æ:Ä	FÁ¿Õ~”èí„ü÷ v√Z/'§¡û*Ä_ÙØ“¯äb ¸¿Ø'∏‹ÿŒ∏…zù!ı˝∆AïÈƒ’“F@&^µ
'¿Ã+î-'†/gùg(úzD°}∆eﬂZ)@¡ÿã⁄›:G∆+|›Î◊MjÜ˜∂Ù‰ˆ?¶)§^—äÇ‰Øán∆¶¯ï†“öiYﬁ.ú›ßÊ˜‘È5Æ¬¥ˇ>Gø¢5;›O◊V ‹»%Òé˝2Û∑jqÓDn/>ŒA%Æ◊A]∏†˜/öÏ≈±K˛Q≈‡n9√‘u¥˚S3Ì≠◊ÊÅéßËxÂ)òõsiÜπ’C[ÍQªΩ,Í¸D“+¡ñX'e9À4≈$c{ë˝Õ≤=~«öfíïéø]7<´ãí<∫æ¸ ã‚w®;Åeo@Ó•™˙çy·“⁄v`íÍX	Z†wf˚ƒ6◊kà1Ωûû„(◊)•>GªÜj¡ªßc›+⁄e›ñMl¿b"on©ü~¶9[5ÿ°ŒûÎ-1XÔÉ$≠_74ã1j‰Â‘X◊zïÚ∆.é≤v¥≠Ò3w≠çM≠∆9	ãé;_&∏ãç;ZUáó`∞W¿ƒlü(NÊ´|‹á˚^sähøW∞3TqÖ>éü·.™p¸ßyI™'$í"≤ÊîUÏ1eYN Ã2∏¿Î,|p÷',ƒ≈&!¬L7õMl˝[•c‹$2∞áè=ãÓA+ó‰†"˜©‚uY§+ÎL∂‹ã"¥BG69syR›®¸µB|S+4˚ŒŸlÄ…à5◊énUrvÃ_ëè©jqnö*@˝ã∆Ω—º•Gc—DåI†gHcˆå6-sE`ˆYcMãÇôiòﬁÖ4Ÿèûµn€Í©-3∏Dós“)ÙW€ZH˚óiÒ‘E+\„ΩK⁄åjíŒnRŸ0
vÆ+Ω©õﬁÏ§ÉÀ$Î◊ﬂÌΩáyídbÈ·ƒ(”•b/œ#°pÔ(ií…
ìÍ2NFQS£W2Fiìì¡ºÉê‡K¶çk]òY∑ˇÉû6ﬂÅHk3Y¿Ñ ’∏:^¥	lôXH{ ¶.ñoä3¬¥0}êAvx uè®˙EÄü¨^Ÿ54™1ç‘*N>ÓáÒﬁò±?|ï∞∆ddÖ6à∏yÙ˙zô˝ûÔaPA„B ˘©{Ï\uÃmühœÉZUhªàÑ¨_›©9UZp™Lµ¸J_ﬁJ\®j¶/ëÀ+QâÉ‡·à}D5Ëaã%ò∂óÄIS÷»ﬂå:M—QÍï *˝›X¿wW®`û‘x›> _EE<ß,?|â∞P?ˆ¸˛–—xF¬˚R|èÀ>ì“≤ÒÒå&ÈNíµ{&Û©}d◊ª¶]‘WÜ„û{b:à˜zÌaÚÅ0	ß<Q@’åé®ÙoLﬂïÂ`–∆≤Y(¸
Ô&ƒƒ@÷<>•ªó\]Û…GÃLåpÚg˚ﬂ—˚áÚw)3À\<W@Kõ∞fû”Vˆû8xΩ˘ÿG-•]÷Î2ÚUÅ⁄âw£Ãö◊2g1s±œ£≤øæ˜à#i;P€œé„A;ÈY9zK·}√®⁄≈˙Ì4].53€Æ›OM√Mñ
;œ±iÚYÂ›ç &{sÁÌ¸–2~&∞9qE\+Üx.ê{ô/d1®ê˘PBÊô‰'DπÊ∆œAƒBÁ∞∞#`é˝áÊ®/¢ÀŒÉ«≈∆;Gc°⁄å¢TﬁØRƒYzπ5}ví*{[dY`Ì]√N˚Hƒ¥èCK[ )-êk*»è˝·lWﬁ$˘~ΩÙ—˚~q]yå~ôÙ$ÛI|	Ôù VYﬁÜÀg_üº¢g{ΩèÆå≠“ØÆÎ$æaß¯ﬁ˝Í”¸Ñø~íﬁ(Ô˜ÓYfÈÇ«Uñï¢o˘∆7ÛÌ æ"€È¶(óÒ€CÎñmwï[a≤1~è‡ò/W›≥=‘ûg	5Eë»Ω]Üh«WÍ¢/≈zo©qì.L{8è˝¡ÛÃøó≤„¬Ñ◊˘ãÊõµ∑≈ñ˚ﬁÙ Ûsï!ƒ…*.∆óó†˚i!ÜÖ5£,ã>º§ÖêëØ£õº<å≤<V!ü˘o{˘˚∫,«x√w≠”\\sÅƒù”Xõ◊∑?Ù0[:hz⁄°Ñü√Ï<z›®)‰òDhà» O9h1BÛˇÄQ€P@7ÈD‰®x˚'ò∆∑ˇkÄéıÌH#“ã,πä»>í6k¶·¬¢d!£C¨N=¥§∞≈∆u"& T˛éÕÆ6;:É«¶&D.ÈfBâEAΩrË£êô¶GV§(˚nú\ß·Åú0bÕ˜0ÚzºÉòGúÌı	9Öã8≠∆5DËÆv’ÑE*,f€r∆jJ*Œ¡	^=Y˜{íêŒÁ2ÀSE†â1+UZ3€	D<ì	ÿmÒ&è^§‡Çù„öæ+≤ü6xñ“ó„º	Ë∑VB≠Q¡€béuBÍ‡Çïd“*BièﬂãıNF¿è¢˝ÑaGhAÙ©¶	|
∑”æ9+¥sÓ∆Ôì|Ñ€…|!∑$ÃlD€RAjé–Å*e#†D4’DCsF,ˇ›vÂ|ÇçúÁÉ:k≥{R<kF√V}Ëù(D√º‘_d£‡3˚Ä∆˘,t¸£'‘◊(HÇÁ_xkYS¨~kkhZ–õÚ§ÿzïe;’˚«,⁄Gï5ëä‘\ıﬁº}ÍΩd8›'ã‰pOMr8tF∞æ¬“i∫úK"Ω§)Â#Ï)‚ZÜ E»´˝¡&∞ •›Ÿ”<!èˇ;89ö_Iö7‰qU*üùØùŒh∞Rñ◊ÅEÀÊpúwUJvˆŸwòA`O"¯»…b–¬¡æ0kö5î èªëI∆Óån¬P†‹’]ÁHó#k\ËP≈Y÷KGÒSÄ?ehı1f¯Ó%LÈú†~Å,B⁄aLûÂf¡ò (…Rzu›®Ÿ8È[Õø¿≈4˘ájcmÕb5l}BÖûYÙëä	ﬁˇ’Û¢ü…B™<Ê[Èë,„«Ï[óçÓ∞G§íæy†OUÿHÀ!Åñ”∫3Uº·O=Yóıí”rÚ&€[¥6”È^Ëíäﬂ$Éæ{8±ÊjNò√}4¢÷⁄˘j˚ˆ_p˙’¶‹åÈıÜÃÏºÙë¿jù?úÊÑG&úÉj⁄!π¨Y]ÿ¸ÄÑbßiÆÙéÔï\q)≠àN|bsjM≠Lÿæ^PÊd{ï‚ø]¶ˆCWhl¶4DuX
Æñ°…¨MS÷@x⁄¸›‡wÉá´™©X÷!Ó`,£æ“÷∞ê-ˆçÒoZ_k4ü&ÉzÌwÉZcÍ
Ì_ß‘¡øÄ>'bÅæz¬}i^íYÄkå≤ﬁ$uûµ9H®≤äËÈ
åÜgÈVıb&≥[P¥Ú‹πÁ4òËœÔ&5†úá!SëÈTL.√“iÃﬁwV¶ÇÏÆ|Ò$êXÔ˜à˘A]ß"œ`;í≈ywÁÜ¢œ≈Úa2∞4ËÃnUG¨9)>õ3CÂÁÊÃJæå:ÙÔ˜i⁄áWæx,:„,¢ÿZ¨®ƒ’:≤FdV˙ç≤MwÛ"›¿ñY— áQ·{ﬁ	—#2t·Å/¨à®g.¬Fw√;{Oç°üò6ì[ß‰Úlº8»%W]l;ÓûyK8Üê›V∞≥ß%uP≥±·≈˘±§“õ Áù[ÌnXù-‰”˝µ„0íØ®àÈy…Œv§Y4∆vÈ#Ç∂<£€?eI¥rå}ı/”v*LnA´·√≈¢ﬂBgÜ%a˙ì@8‘à)	EûfÒÂÛ	∑LU(ﬁ[B–x8zæDFàe¸Øut◊M:ùx¿SMπ÷π(AIú~m«å∏~Ë±BafÔ‡yØº`aq˙N&éïY¶cÊgó![»Ãÿ˛∂SØ3[∞âõï/à@ÁòSG“óƒ{ñÿéqΩtoòü»…k™)º•=>¸X ˛√Î!t©Dmw>òQﬁˆ]Áò
c9—Ω’cîùQ∂;‰∞å\¥L™r!C”R¢¸º—kmŸ:OMÿA™uÄö∞ìS◊¯d˚K/Û#“§ô6\Çø4Æ‚wFt7Ω8º„D˚å0ü4S∫	®9œ'«Ωq>uázRv&˜◊qˆ•”Èˆ!⁄±†Ph3„µPºoâ^3ËºZˇ~ªe‚ﬁ‚≈«%≈®+amÍENÜºàôîW‘zS∫]Ä =}fîW÷DÜZ¸{≥≤Ò¶ ∆#>AÙ¥° ¸ï~Üp©+∏¯o»¨»Yê£◊” ˙cãÛÈ'û≥™·˙SB√≠CÕég0w—T∏éT¢V)Õ…üK4¬≈p¡ÒA‹Éuê6A.∞IV\Í#vÖt“†∫¥=	≈©îzü¡¸°Õ∑#S‰®Aﬁ eÒQ%Å·“;pÓO»õ.ã›Û®nŒ´Áüe2†˘ı0®»¶hh≈Grj†`‰CóÑé]*Sìa-‡1{÷f” ,^B[ıﬂÑ	%œ@#AÅt0Ñ2Ò"¸å∏—tj∑&Ü∆”dF∂¸˘Bmß–≤æ¨Úü®d©J<êâíÕ£’’pŒŸ†cß§«Øq«\Ù` °âu}⁄ÑV7—“Âπ∑VîÈŒb6‚"Ô¬d˝XºﬂC˛ôÙY‹Ù}Y%A&WM
·¡œº©Ì,p%”¸ë;ÕÕÑ|≥÷\€x[ëò•Zf‘â÷ﬁΩÖ ¡6¨‹¿D˛|çúZÌÆK– ©¸»('70∆M·˘"ıÂaî2Sät¨ıú$E◊ ¬x1#∞?^WΩ*ùÀ]ìπ»SK´„N[)ò≈Êä|ç„V"çó´‡]X’Á–©mdûÕ2å∂†˛ıöJŸ=Wo‘AÛn•	YÃ µo7wﬂÄN»n€GPO_¥zó—≈Ìü(qvùŒüK∆ù|"†JWîçö6⁄M‘πwjπìÑAéZE±%∫«eS¨WE… m^'îïÈc¨œc’1∂Aﬂ˛&Å†«ÍUœ◊/a1z"ôKI°ÄJ±Èa<√∏t„é«’Âúû>∫˘ƒöÊ˝˜+à≤…Ÿ|√’çU9˛¬ù˜g„pÈ≈\≈2/¶ ˙ñ∑ö‡¬"5-“eQf!¬À[∆g˘À∂Ïº_Ç·w`ëÄª¯cSp>\}¬º›],)Ou0bGB¡¯À›≤Ü°jZ+S	+ÅC≈\±ZÆ⁄÷Y}ªr›ÕQQ1!|Â* ±\‘Ü~:Hç™¢Î®
›≤+˚¯∞+ør˘ÎƒbÕß.Õ£†∏z%0ãæbœeÕ¢çA*ÃmƒÆ.'0z’1]í^<∫˜ô
bΩSêóW‹T»{¡®/˚œˇ∏¥-˜67Ë:«d4˙;pÏRÈ_éÉ[◊•Ììá™”∆ÙU∫Oü)â™ëÈãˇÚ¶/ß"(,‘ÆπLë’3Äò~6ÀœÜ˝˘πEÅÕŸ/*ÃÈÀOÊv†t˛NÄB/Ùçr´+€ß™{ì@(q]=Ë ô«}„µÈ{Ã*∏
rö}ê—ö÷‹ò¥3`ˇ0æ¢\3ã
¯’zÆ›÷4ÒR¨z]d˘V»vπ'åau»'£¯ã£Yuæº‘Ô∏[Áéoøqﬂúàv]4%TiœA´›ù!’[“óœ◊}Kj*Q∞-ÉêÂd?-)∫˙ú`SHÕñÄM≠ë£∏ñàDﬂx=ÉvüœG;ìB+˜®¥ê?eÊjÆ(;tiÂ2Êv¸ˆI;“
ÙÒ}óZ	ùRLå˙ôuXªih±ˆÒΩ÷´töâÀ;wnﬁÀêÉÅ˙–È/¨éDóY]È≈ñÀR∂Y¢ÚMÓé`°Ú7ëdˇ˛èˇ$§£uøàò@«:çU9–˝GØ/£Ô„ÃOW“Icã˝Ë˝
ù¶ò£ô“—ÜÕM⁄_…€Y⁄Î]Dôe•≥N≈K5kåw„ßZn‡gDSf˛ÌI&7≤[%öπ—mIUƒ^zµZ]¡€~öÉ`gS=°Õâ?∂≈ƒb>ö°"VƒöãnO ÙÁ‡˙)?	+õÒ_eô¥»ÃÀl(3Ì∑j˙l¿4N§C"ùdZ|“=Òìky:F–iCÊ›:ê¯Cﬂ ‘(q’˙˘¸ìÒP?ΩL¯ïõÅƒ1Ä?ôôîd&·vRÿÃeH;Ù5ˇg’d+3Ø©¶Æ‡ˆÚêpz¸d∂p2-ƒ˛•£¿í\õKU9V⁄â§aHõqó02€âjÊ6ˆ,‘Qie\_2≥⁄SuÍπiŸ⁄≤†#ˇb•”¨0víBT/£µ hNNΩ«ƒ¢ûîpgñ™L≤Â©“
¿ÊZ…
2†Ú£Ü!1+_JkYÅZ∏[~hΩkB¡e¬5[“û#8qºÏW›∂PâX±˚¨ŒaWƒΩZ]W{Ê¥å®ù:Z‹|&¬s-P}ÿoVΩÖ©"ÿÊ:‡<+ z‡ƒ@"HìUB˛±H…z!Fü)R†√}`ﬁ/l	∆	Æh¢cKòîÄwî∫Nã¢V…Ûâ\‰ìnGó…†#ΩGìf"°\ æ"∂ËﬁNDÍÌêÃnf £6VW≈  äLªs∂tàóxw'KÒ<xD±"≥2∑æ⁄;PÃ+ÿ¶4C¿„√<ÓXâÙ"Òe“ìÁπΩDÙ“Ò+¨Ù—g“ñ¥'?CHœL&°H¸§, ÊR«Cz)>ﬁ“	<ëﬁXxíRà#⁄ÑWbh7ì_GÅ\†ÆÍÖÊ•∞‚0ViMõ≥, Úv/é2ÛΩ.÷ /sÙçNryyJii0ÄÛ uaE~èã3˝Üu?ÕÍu®ê√¢¢p<T±*€√
á	<F™?ÁÖÒW≈ì5-X7ÑøÙü‡%|Gu1Ï÷C'cÏ∏e{¢Ã˙™çÊ0ÍúbªÎÀ¢∂Ü9ÿíÅ–o©öoÂj!ì|jgî—l%YÍGL+ÛÊ[¶QÅ≥!V(úJå©ØÃıÏèœ”Ít‹1¸V5ÆpŸa⁄◊X.Ùª ÊÊ,Ó≈0ÚÊ}]˝’Aä€˝çº™@yJ|f;oœO\qµ´¥÷W(Yıo	ñ™ù¢—]Oñ‘'û9Ü¬ì<ó9⁄ä©Œc‚*î»·Zî7∂¨F]Ëzt>f'£ÃÃ2[ !%7óÆ"Ô©∆9ôd0j2◊∏âoj—’8 :∏bc⁄√∏ÕtdNç⁄[ìxÎ û:WREÊ(OC£òæn*Aû˙“Mﬂ•Ék˙Q+&<∫BŒ–-F»Eù«@ÀFÛã}ùé≥•©˙_ëˆOè4¸ÄGV§EÇb@ÃÆS?9ÓîúcV:é"RnERÆH≈Ò±98¯pË4ç'„Ü<Ûkuí6L¡(ŒäºW≤IÅF8¿∆ª…ÓSâ:
àö…ÑVl':Ú°dfÜã€‹™BÎŸõ¨Î\Ê±€πÏΩ5R"íﬁ‘ÚRΩÌ√ııI8“ªRNñæ)'"ï≤©oû˙}K∞ÈbMå…∆B˚+E≈ÛˆN-&$ÿù•Çﬂì]‘Fe‘4ã~÷”ëa"Ekq˚O≠},^ú‚—¡º2®ÒéÖ¨<πˆRÄìb@Èç»“c¸|à∏r5”8Jg	bT„¸§æjj È»„ì3‡(+4!b_Ú‡ú)»6^ŒeÇÍD°Õ€O1P°0À5r¸~Eµ√VΩ?z–˝ŸÃV@6Îkˆ\.æ—ÅHÁJÔﬁ“=.¶}¨¸œãÉNh’ô5Àˇk˙shBlF'"ÅÒ¢ÊbÙœ1ÜP˛éó∏†Œ–n¸^ªL\RhqSéª4w3AŒË∏ﬂ*Ñ¡ÏB·¡
Ç°ïÅÈ2Tòπr ,cÒ‡πL$E÷‰/ªµÄç}ö¬O/_»…G&„∫ˇ¶II§cDÑ˙LÕ≤Ç—πwçmñ£$ÕîJ;_kP,4õMÔUß‡À˛Ë ¿n∑¶±v™gÉV˜PÔÖôò·oÀÕz…>⁄|l}Å;˜–ñ˙ù¡ÈxÄ˚™&ÓnÙDu|r ¡9å”rUÿ±4±2”/èãÒ›7nçAü;˚Çì∂oˇ_ô≈ÉéóÂŒèíz‡èë∏˝vy<ŒãcÇ”Ñv†NÓ‘‰?0M˛b1MvzxÇs7DìÄôîï¸c"öh√-[6»ÉdeÇëÇ2÷∑`∂Ù™†K&uí4“vR$\VñúÜÎû2Gÿæø„ CÿtªÿGÇÍèÒOÃA◊Ç—ÏË‚Ó8≠Y‹X,¯∏ ïÌ^˝˚ˆ4„à÷UöEé≥G(∫∫|JHNòH·æƒ√•äé˛Ò(qFlyp˚'‘.»B”∏#5xò™¢âY“ÎÖ
”¯À†À™9öI>ä.∆≥œß
”•Ê ã=	'ñr[Í¬V∂îŸ.hœ∫õÂäBàp|∞C≥ã5˙µi≈†€'†JKÊ∫UÃÊ≠3•rœ„œ6‹0”Gx‚Ó;ÁUárÖbøÊVªL|≥ãÖ˝À◊1€!«)Põ–t‘ç4í!èº˚∑˘ÕÈ;˝7öËW[ÍÖ@?Ùﬂ£¨E^ª√ô÷q¶9•S„Ï['àGjùƒCÖŸ´§™’uTê-P7¨(	„Õé∏0∂p±mnîﬁœ≥/f`áˆsL‚Öß∞,ÚΩﬂãçw=∞Æ5ÏÌøå≠÷n‹W`≠´]ŒøÌŸÖ¿jG—3Wˆ€Éà;YFÖ2ëvgÅv¨R∂U«≠.(ËÓ_Ã˝(BŒG”	∏◊|¨à*^´äÿ¸±v'«¶∞åS÷{ìâˆ
ÚŒú"ŒÙCö˘ÊÓIU§õ2Am≤√çèçl”ÒO™/“ÌQU§€,Ôäã≤}ï‘≈∑m·xÆ¿Qí	Â*6x;≈nÙt0WﬁØÄ_—k»g˜Æ–R(∑ﬂÛ•Cuä®ÍXyóµ«πFQß|¯'˙»kÍâçor‹¶¶º<—ç—e¢û©ÔΩ∆k∆ôë¨)vŒOÁ¿Ì⁄´÷Íº<Ñ≥j≥`cˆﬁcùQB–11™JÀ"ÕnˇI›ó¡≈òCÀj2©S?õP^ÔÏ—πà3gàıf¯qﬁì¨rŒ¡ô)#T≠áRf≈ã2ß…Ä≥_+üãx£y|òcåïFÀ°ﬁ˛=ïëH	Ìù˙[&&ù¡*Ÿ|ÇÖ–U"4:(◊æSÙ<?:Ÿ›;¡5…&ÁY‹é/ÈíR®Á∏ﬁ–-¯˜<ÓüÉ¬Æ”ﬁµ9¥ﬁfÈ5ûW·}ÚVø·ﬁE˙"#f•‹¶4Ò^À‚´q\√Ùéº—ØZ/˜^ù"á∑°ˇn™ï»—ÈÊP•;¯ïÓ°”ALZ®†-ŸÂí„ª-lª.-†ˆ1ú‚È∂t…]öHîÍ~Í˚¡kF=ªM>ªäìÇ®.Mu=£TÏi2/kÓ€I1u∂‰(bBQΩä≤O`˛ÜŒUåËÎ9ºêuà?/«É§Á3'¶™'˛;LGYM[q6J±éòJ†¬r|Â»HßUBhé@Lâc‡‰˛∂Jî∫äÖåMmÇÒNA´L€Ú)Œl`Ô∆	Œ¨°ìéVqZØ^\Å‡Äˆ·Ω~ú˜eYxFH≤àú—YêŒaÇV”∫’_¡å`”tà0s{;nZÏ∏sÙÍËƒg«	∂†HÚÇM)Æ.Æ
áŸRéU%‘åŒZzQI5&≤6È>ñYºK*»„öÃëÎ1:+⁄ÿâú¢Â}ªhÉa¡ä.õ¨ädÄÅ:‘ªu≥¥≈|bU«Ÿ∞¢êz`W°nZUSêÚVƒ@±ÍÅ]¨∫i∑úÕ`Vp˚C4K∑ÌBÈV1äâœ ˛˜0…/]=∞ÀW7}ZX‚ÇœlpN˘ˆ]7}©@–(óÊQtÔ§Ω4;¬lçu∫ﬁ∑ù¯,{£^xã =–tfèîd{r	ÒÑ≥ºÉi{éï:TêEZ‰†k|°‰ˆNZß≈"\gÀeÉVË¡(πäryÜ—©πÿ%T…—…NÎ`ÔÏË]ÚOZÉ
8]=íÎô^„¿Mb
ßdâ&èi£≈v≥tÿIoî≤Ü∫Ëôy@È¿‰Ô∏ÉÔù•WWΩ¯îÓHﬂÍo„/H±{™ä€ßQ/∆
≥ß^…[¢ÓΩµåY7"¢™5D◊i“y ZÚ¬‰j⁄ƒÔŸ≠É'ÆcËπuSÙáÅ9ã.∂Í$Mã;‰≠|,]BqïOÜ#T˜;‰‚c2Å‚`∑÷[√°˙ŸxîUç†ËøLKX<à≥\Ö0t0èË≤0ò¡ÀÃ∞ÅX–ªYtuER]˘Jc‹ÕEOªa/%Qa/)ùy§+ÓÑ¿˙aæ‡öäÎµ‘UTÇs˜Œ˚3Ì˝ßg“ÚÆüç€;ßßÕ3ºƒ%°HÎeﬁhˆ+'ˇDöR›ü ∫‡˛3ÿO4ì◊Ün>»º!—±Ù=◊c‰úF·≈†9≠#õÉ£C{»‡x¿_êNŒj÷ππói£XoªÏEÓª5;®»Ó”˛ó$Ú5∆Wr˚@	.ﬂz9L˚¶6HÍ7ÎÕµœﬂ™[ﬂ#íìz⁄ç`ÍRØù*¿PvôµÆ†éÇDâ„°n]e—ÖPºŸ≠†[†º#©ñê√∞◊¯OE 0í¨˘¿FTΩU∏Õ2™£x‚UVìÇ˘^{,ÀÚèïôôQ¬=„∂w≥Œ¯¬[ –Î
z]¿¬+∫:¯LØmE5°ßﬂC”-ÿÙ≠é´~\R[÷[ãÛ6¨l≈î≥hSøg;›∏˝≠∂F≠˘˛?,~€2sçOÏ¥¡•ŸyüuÇ5'e\uú*/⁄⁄À®◊¶ÄFƒÿÖ√aAØ:¢éÒ$Y⁄˛õâô˙* {ÂI√∂ÅdCôç∞&LZØœjùS»≤X‘L¡•(%'÷aØÓG∫ßO§t`õ{÷SÜƒË“abD r¨Œi≤j$2AØJõıÜÑVå˚´Ω6≠Ù2QecîˆtæîÁ|÷¥s„◊íaÈ^ê„é$ÕØÀ—	™q“@Û≈3	¥Ö?¨¨5tv˚<√Iñ°	àÃù‰—e¸%ÒF=–E Sß≥zp æ˛z´ﬂØŸQú8äib$˘vπ(ä›H¶^|9¢ﬁíàZ›2€MŸt„Üw-à6¢ÖZV(:%óΩ^∂Ùu”Uôˇ‚Tz¥";∏∂§F6ûµ∞zÓÇ]ÃËcŸhLWb[1„&Lœ·1(∏—π πiÄ
’b¡Ø&”IËC_¡Ækùﬁ±™Z
˛ëÁ≈jUäs}#áØãôÇk@)‹Yø#Ü=¥ªg∞äe;cª;–µüºË—Z9¯ıÑmº§ÍÑÄ04.¥<ÂÏL5'9gù6:ÙÑõﬂ$ù∑”0Ët√ù±UÄ—ûçkﬁÏÚ`≤ˆ&æ˜∑zêœª„€Ô‰Ó¶œΩna‘â≥tˆ€zcò≥=ﬂõ∑ü~o≠á€ßÒHYœ∂Á‹"∫ØAÂõ,?Ôå˝§Ÿ”%˘∫´çˆw(wn*W≥wøFcW[÷/¿˜|WÜvƒú⁄ÜÁ“ÅﬂV9¡G*}§oˆ°>îá≠ö›(ØSZÍ9ºà-ËÁR‡Ú9qq˘\≥ÒŒ'Ût»ö∞¡ƒq.`™7∞z/'ÒΩâ&íŒ)∞:Ü4Tœp˛   ˇˇ „ÄxúÏΩ€rGñ ¯ÆØpbj
ô’»ƒï,	»Å H¬4A¢	R›Ω.ô·@ÜòëäàƒEhòı~¿ÓKœ„öÕ÷ˆC[çYŸ>î≠çY?6˛§ø`>aœ9~	wèKÇÄDi+M"2#¸Ó«œÕœ%…X»≥<`√d<ãÉÖœò˘éÉ,{L¯ˆı0ÓÿÔ[∏Ë≠˜≥˝õ&≥8‰!;ÛKÂ|íıÜ<Œy æüeytz•~í4Ñ?Ÿ(ç‚Ω6ú•Yíˆ¶IÑØñ‹^Ú$L≤c>Ê√(â¯Œû≥Ö¡YoöFì ΩÍ=^Yëmöèÿ&ï ∆AŒ{_¨¨,?—≈.F0æÂµg≤›Û˜3˚Âuyø˝-€⁄Ò·ñE?¬
}qc¨◊BŒ/Û¢˜∂¸Ãj~ky0ÀÛ$6∫1˚ﬂ ¶AÏ,?,˜*-˜j±‹Ω”Ÿx¨◊raâ¡VûÒ›dú§ØN;Ù„ Ïˆ√$Ôﬁ¿åFÎ•—æ˚}ˇÒÙÚ=;M‚º70≥Ÿt ”aêqñß;äœzQø∞ºX««+na¶lÃÉÀ‰—Ÿ(_xv}¸fÁÎ˝ì;_Óø8~'GÛ˛fky¥nÂÀ <„Êh`ﬂd€jÀ‚$Ê,ô√(«Ìe”KZÖÈ –®∑·Å:_bjü√ƒ`@SF∞w˝1èœÚåÑ˙VÉŸZ£s˝æÎA¶¸t˚:„˘À$‰Ø˘i±Sï'§òƒªï˛ ˙{˜j„÷.«lJì†±„?=8ÉÏ,O'Q‹ıﬁm¨¨‡ñLÇK¸5∆√ŒÍ  ˘®∑∂íÚI˜=KŒyz:N.zWΩ`ñ'pú≤<ôÙ≤aöå«É ≈çã≥(®≈ˆì4≥éXîΩÇËHïŒn≠}–ñãseû£«≈1“\ÏÓ÷qíÊ¡`0„NàM⁄÷1	¶ù)€~∆¶˝(Õ`∏9?ª⁄æÜaÂL¯EîÂÿ¿’±|ycNª)˙éÌŸÿjÎåxrÃ”ÛhòÏi»>+5
Ë˘ÜâØÍ—K‚Ω4ôÜ…Eº;
‚3ÿ_˜	—A~0Å¿°æ´Á<TOyxfœ˚£ ÎËªÿ≈õ‰ÏlÃ	´‰ÿÅ˘€>Ø¨k†á≠egUãÇÑ≥ÌÌm∂Ç® \mÛºŸXáº·¿≠>—que¡Aì[/Ç+ûf#Æ}ÓL¬:`ºœı◊Ó”œnû~ˆŸÚ2{≈#$PË(’,¬Ä≈	õ Jf¡˚˜¸ØÇT0¯O.ãgìÄç± Àí%Ü`+p˜4IÃ(Âg¡≤(¸Ÿ0â≥úôpÇ-øN.ÿ6Î\À&óJp±d@¡íﬁ˘%gsŸÕ&ªFò{æ…Ç¯Í©lnìcé}¶OK-o≤N©‘Ã˚<ÿœÉi∞âgE°˝<â¬ß∆H†õAí :éüÍ1ôœÏ—¡õNñd7Ùı6C,Œ5¥ïÔÛËúø	õ¯ÎuíOp˛˘èëºÊCMÛWS@K∞àØ9l_ñ)†ÌÏLßÚk˜—S›Iîñ%éx8Û´±‘aêè˙ÄÓí¥”â˘€|–ÒÌˆœx˛&öNóı®T?N.:›.[fà@WÿÔÿ˝œ⁄ºÿhèãqÄl “íä±¿ëj;Ä-c  —HMÚYÀ#i–ô$ﬁG√€◊±,:eùbSªƒŸ∏æÅPû vü≤õ™}∞Jªª◊Yú&Ÿ"º∏Q«≤Ç∏-î©-R≠uf–Ì“•M˝`u≈•H˛.°`î5 w6h≠`<6(ñf§X¨Ω5FÍπA%[]Òê25ÏrÎö[îHKc1Û;x÷A≥.¸rswgùm^Ÿ\ô˚fèª≈eö¨ïx‡’µˆL∞M
ÚÊR'‰Ñ.Äë#µjQú≠)À£|Ã5%‹O±&˚á`ãp†pÌ@»a_Ût˚œ…¢5B¡Î&„–`i≈◊ÀLÛµœ˛C¡*Ù38£º”{“ÌÁ…[‰èwÅ?Ó =Gt}ö§ì «∆èR~ÒãNgé±9m.±µµ.p©Sg“%Œ˝d¶|}≈`›~æò—µ∆p8ûwÔªƒCEà{¢~Õw˚ﬂ√ÅÏ,.±≈.˘òOB„l—ïΩï◊¯“<˘∆:˚˛E•\Hdçÿ[$∞lüç—≈	IìåKT z°≈y—÷Ùy±1à®¶û≠˚QO˝A
N˘W1>"ÀÜÀááÏõo6'ì≈ÓÕµû,Á"˚∑ˇ¡vﬁºﬁ9ﬁŸ{µh,\›'+Âp4˘ÂY˝-É,œH“;Õa·Û§ïÂ5÷#ÑM˝äT ™√˜¯9¿~FÇù+∂™ï .åÁA># ]/NR i¯≤Ëln2W˘<œ
—‹¨%®4ôÎFîô˜·(OèÄ]Œ§RùÆ[I
f≠k_Ω2ﬂ◊Q¨&ÔÁA
lDü&`f˙ÑQÜ"@h…fcß/ Æa7>g~úo£~ lµe„36˜û∞iäõMGqu≈∆5¨@°ß	‡∏Õdñè£òô]<*ó‡´…l*Ÿb√<6ˆ°ZÖWØ˜ˆ_Ññ>∂ïLqÅÖúáûÑ¸j´
˙‰(,"“Uàv¨tªˆi£Â˜!CWò·ó x‰í¡0gClvNºê3`]R8ª(ÌƒWBn∞üm2ıÚàe-±ÈÔ§¯#Ÿq˙˛Z÷°ûoiq‚›˚g@˚”˚núêá™æﬂÕ™  ‹,üçíã}§f\txl>±Íû„Ã™úa+Há#™˙™¯mU\\,◊Çu¸Ú ®Eø©∏5’E)Â-2}–üu:z≈T´YpÏÃ6'√`|ú')‡#d·Ä:v”iöúPø'}$' ºπñÊÁe qΩ˛É˘X êx∏©aC7ﬁYÓE©=Mx‡ôgêié!á/˜2√0J´'(∫≥&G=õS√2ÓºÏ˝Bê?ﬂdæMí”≥øùs@Ö÷,≤¶}ZbXÁ∆?XO5k=#PK?ﬂp!K#xê‹µµ¬•B∞¨Ωbπ<Ìœ:¯Ø	)»d*ÌC˛≠¸·ÅêfAò&4?é
˙F ë˚ÅG5¿Ëﬁ-òQ±ä1ôê$+{ÄIÕWÌ`Õ$ã˝¥iæΩ§Iñ7ì˙*n⁄ã}Á°gSüu Lçâ]-’R~¨÷„UCÎh‘£ﬂ6‡π«3Rß¿ÉN◊l) æúç?Ïá)®±ÎQ˝@¢Ï88áÊUŸÄ˝∞æâî˙*‚c9ï/ıO´ö \ãµ€$m…&£ó˘ﬂ,3{,»§ﬁã›i¡‰¿+YeMXÃµùW£¶ÜhÓFg
2bÒRµ£¢|õ©¡BÚ\1R	·{“&Ga∑K•˚!4
Î@äcOÉ0§G≤Æ<ï¯J<∏!•‘Ú2”∞ö≤7§JÖsÖTq7∏|ñŒ¶	j˝§¢ı˚Ä·’a¬Ä©ƒp ‚§¢Íòbı^<™XØØÅ·úäEÀ‘™crèÎ¶zÖ1 ·BQËÆíHz%ôHkeıíC!Î˜É·Hö9´±V˚ ºq/zãÅzeŒ≈¡ÂÍﬂù#¡?ã_K00"+$[Ïb#i ÔäCƒÅÒ†˜svù-9˝5ø$A-@}Q«ÎkûC∞/Ú÷Aï›’%2hQ∞πzÙ»IJÊfdWÒêï©,»“AìûMÉˆ˝”4Rbd È	ú÷Y¸|è≤Œ¢XË$@ÍN$±Û:ã~‘Xq∫på°âù≈a ]ñ*
È&ÍE∏ﬁúÇkÓthtÜr˛ˇáÙ:πË≈%ßl`/±è∞º˚ßß8nsÊ∆ tdb1Ü ˇ≈|k°WA>2°•Öû^êQgõü•<;íò—ÃH∏<ı;¯ÖËl Êõ@íÖ'¥á@∂∏Ã,ılê”h¿;65WZi=∏îOísæ+á(á™(#¥˙Œ\ﬁõ‡Ö√1ﬂ	œqóéQ¸/†§ıµáXO¿\;˘,G?Çê≥8`#†ÂÄ)˚l ·{”∆y4·]gÜCO·Èo£O¸«A*ÑÂ¬Å¬7¯◊æ≥$ñE+Åiπf˝~∫‰#=$8$Ÿc3ÌZ˚ó¶I⁄‚4Ã¶!ë=’ÀIVÍÊ¶€«ÛÖ∞„Ü⁄ˇ3ED®´.CngÃ”ºÛ›À€N@`è¿Tv˚ßsÄƒ@Æk  ◊ãÂˇÕ5’ÏOxñ¡Æ›|g”ê∑‚vN_ªÕ`ı„,   <~¬Bπ‡®+Öm9õ¡¢√r b3ôÖ–U'H” *ßDaÄ1ÄÎÍÚ1 e†n7V’Ô÷ ’ﬂF˘·iîNÓ_ÚpäVƒçê‹X;ŸxÁªC{"◊gÛõJ≠ÙPh~oÿ4 P\¯ç≠x–Éy≥¸;cœÉË™€zYû∏÷"È∆JÙETB.N±bHÅçâ◊ODu˚®„7 vÔ_V Â||ÿÕRKŒÀƒ”63Zh' ”ûì”,”#ZﬂÇ€¥ıÑÄjQÂjΩ7ØÒrÆ8Kã¿¸ $e «¿˛h ÄÒ0òLB>Äà ê”˛¢ykW£„ÅØù)`oÄ0<vôl‡ˆ_nˇ_89|∞Ênî2iË kívK@™[⁄@ó+/÷R≠„4∏B2±…^Û!T)9,!2{+z}S¿iÕ2vU;}uAïµhÛÕ°òkê%N]{c %Q¿;Xƒ˛o®—©*/T≠∆epyBÓæÎ˘®'¿,"∑ié8J(∞hÓJ`vcÛäÄ»“ºtA	8•XR ËQÛP›ÍM/ãH\7êâ,ü#ç(√Â$ pıÓ+â8R“â$‚©A≈€ëh% –±BF>äá„à)28R«ÄMæ\’cÇöÎ_j´√œkŒÅô‰⁄¶ˆ{£?%÷By«=@iPã≈<îùòóK≤è%~(∞(v˙7◊}œï-¥á+(mÁÙ¢∏ÒkòL >á∞”…£Ô*Qµ	iépgk"ò≠˘(Òÿ‚†‡%Jp´óì∞~∂èø	Ÿ;ä6Q≤/îq»¿iu@∑‘˙~:m√ì¢e[¨-.ë}\™¶'dçAkÙ$úbAK,≠€î}S∂6tXQ=≥AQﬁnÂ˝d‹úÆa4	laÓèQ¿Hﬁe éî%3≥t2Cééÿ9‡6Œ≈#*&Økßt,öÅÕ} ±àΩB¥+ﬂm÷≠Ö¨’}ﬁ‚“ØX-s®xk›˛:í=íù´Sh§Ü?3ÀÀ£®aá#od∫e´!Ûk‘˚‚I£IqΩªıöüÇ–8⁄Ω0	bÿŸú˜≤i€w€èÖıFÈRÎ34≥W⁄¬nõΩCÃ)oü`wê0ò8Y‘ ≥Ì"¿Ü-íµËJÂ‚<9·Ú ië¯4ÎZ™Î®â§ÖYß∞ b=√ò´/’;πaƒUi8Ê–j{kõ≠[©ﬂ!G%TÿïÀ'x¿çõ±>¿˚§ÉÜ!/íebúm™“u˚–*1ê;É|8¬	OÀí»¢”pqEª◊êe¥eéd–™i9Rﬂ™≠W(∆àFu"W
uNùpáWOÃk$ÛŒ≠k˝†dáÚh`õÍ©q¨<≠Æß≠ZÖ*ZÍÈR
‚NO•bí`,®1V‘ÖUÖêK¨ã,}9˜\Ù∫…z¯◊«™1˘‡ﬁêØÑµï≠«rc"è‚*Ï®5Ö§≥¬û“DjŸ4¢U ÁL°7@nßAHLí	¸Ì}ÒòÖ≥î‘¶ÑÎL'ÄjKÈl≤Iﬂ”‰Bc⁄œ/8èÒ]…BrCŸYJ”Ao√≤æ±•È…h≠d˜u9fìpìæ¢?ÅiËUÿgD90g√¬ÅÉú3`DÜÅò◊ûsÕ5Ó.Ãª›q(2±ÅdB⁄~Ø°]é∞ßFfÅl™oˇ%±Á¥<ZsfÈ1n'j¢hóW∫m¨ˆ'ﬁ* aì-wHØƒ%°d*”ì-!á3G(∫«¿rí¨.‘Ñ£(ÀoˇúF√Ñ,—«<Olª<«∂›:ÂE–tëSgπõÎó‹djÕxz+˝«ÂΩ~Á>axªW©Kl¯¸çz ão2Ä‡ øN—Pº‰µ•[∑∞E#GÄÉ˜Â3—Œ.¨˝$Œ÷ÎZ7∏E+/‰o9¯ÖVûﬁì(xÓ1¢5NXÂLÿù£kàÔ≠c©m‹)wŒ%üäíù∑nΩSù¯T@ã∞©˚úå√∫Iÿh&iªo9∆WlV™ÕÆ≠œπæsl|.¥ﬁÆ…±k˘+Ã'©˝iÄwŒ!Ü◊≈≥_◊æı,A4~∂`T ÜQ2†"◊†qaÖ°ƒ‘1Z¨-<É'ªqL(çñÀ~{rlŒ‡\t¿™Õ/=xV∞~j¸ñ…ömÉπ^mÉiŸ/ÿû8¢õ(ûŒÚÚ$•©ú¡Ñzﬁ¥qTá¿0‡Í8÷ãû¶ £|àõß€_Œ2‘n¢cÚÉàà%kbÑlŸá]ÙØÕâ«Pmö‚˙Ìç·m⁄¶’w≤x,Õ¡Ÿ¿îmY››!˛◊]€Í≠°‚Œ÷T!+gÖÁ[\Å†–b‘^N¥ïıßX´AÓ™?ø¡€B  ÇˇÙ}ñ[ïGc≥ú	Q4∑[2 OΩ§©LwL€¥N%˚-çÛ§â[i´•Euı›îgDáXgD/¿E‚Uà Qöt©È=>tä°Ëéøär5@VAÚüÑßπ`∞¯*ù}6Ê∂Íu€é3πx;˝[ ∫/¸ÆP˙:ë§MYb/πà+ ∏÷fì‹›XtIìèÜµ8Àæ∑„hZ™∑◊ÀÎ,¥ÓX' 0ˆUs+m}∆‘«jôgY^+;t(∆EAù≈¥∏›ô}	L‹˛ˇ˝ˇ¸'vò†ëN∏Gø¢Ì{5úçÒ
º®∞Cg.kµô¶S⁄ÛÁªUflJÃQ#CiE òígñÁ“æy¨b´∂æ§9¿_»&%Á˜⁄5‚7	Öˆ=4ƒRá!ùè_N84‚,á£|ì~„„KÒﬁ‡Nÿ!^ãïóa˘K?sY#®î|FΩ∑%5W,éWâ¸Ã	Ûú—™£‘Çˇ˜-Ë.ôx©g%˝l˙ñ√t·µXÈtT¨µÎL∑ÂÂÖl&oöK˙âÿEóŒ–= H~û«?Ã@|≥©Xa6ZZmﬂ.t´|@Â˘Î⁄3µa∑ÂG∏µá*∞Ñ¥ñDÑA_nP©3é2ÿœ9ôŒ'œÚ]⁄ÅÛ⁄Pxê?nä+?ıæZá⁄ïÊŒPÇˇ†j0Î≠°\Y¸‹@˝UÒÛÛ"Œ<&=ê´dOßL›†ïµvÑR©î∂êt≤ç2¨ 5%§RVGÔ–∑=÷}FßÕ]NóvU],ñª*áﬂ®µÌÚÃ∆õ£¢aEã÷¯ÜdáÎ∞-òõ Ôå«n2zvÎπ Zõíå∏Öêâ\∆¡ï;%•˙sOıƒ-ÏãRøÇù≈õl{¿ﬁ¬c}p’Sò®ˇ‰K?˚‡W(˘ù‰’°™ìß#Á\VDŒÅπZ“Õ‘ù…Î2˛ó¶É≥8/.5ÓÌÿHSåß•n≠˚S£Úl¿¯)”@◊…•S}¶iAZ(?ÔÔj¢È#ä¶ƒwW-hK(s=~Ãçi‘á÷DdPÔ«+%1∑ï∫‘´/ı+LYE®Ærp.r7£rπ°∏åx[KmV©pG^´RÎi[ã≤–ΩyvMGÀç„e~*∂¨Îûõ{Ω 
9'‘«}gwë‘πfœ °õXÂ	vé¶á‘tn¿vØ2‹›lâC[u©aﬂ;8'•¨o¡ÊJˇ'8ë√Ÿ!Ã9¿Uœ=Æ⁄‹„üYÃ$≈€)”¶ﬁ‡ä‡j4ü{∞÷¿`Ãm≠1ÿö√ΩïoG P¸ÄÀ[≠Õ0 =T¶à®sEp<[¡Mˆf≈q€XÒ¨è˜∆¢ÊvÎg%√'˝[1|éëByãj◊ÇZÓÌ∏‘ñ◊£“>*4``5CU§¨∞á~Ë±ùî∏Å•∆Ê^m;Eoàh&7¯YØôÚçº!Yp4xÖ∆≤N5†•Ê±™ÒXºÿ&.¿È<ìÓ$@t»á$c¯˛Oï'		=2í¯¨‘ú‡}⁄Ym¬Ωµ,Í>s∂õd„R"jvez‰Å∂`F@ï<7è”'∫ƒÅ7XŸ˚"ón¥â\∫J,§˝ë@ÎÁû»œ\´õvñ_Mu#á1H.}CP3√ÔuÆÂo’Ô˜m7y«˝ zÔxêìïæñ"'+K≈~¿ã‹}0ƒÈ{ÌÇ=≥ˆ_*‘	hÿˇ~≈Q¬√) ;í8+4M–Óyﬂ’-¥üÓ â¯.‚ıGﬁ»◊{{¯ÂaÊø≠øøÌïésŒïˇç+Ïòk€âΩıVWÓ:ÍREç≤0⁄=ŸOàOÏµeÌÚÜå2?˘H¿k	†jï+Ÿ
s„˘Ωc›í≥—ØÈ⁄ºŒu\Wù3iı˚a‹◊òŸ8‘˜–˜Çw`™Aªˆi‚#ˆ5înù=r¨@^]r˚º?=0|ö¯˘c±≤@´QòÔY¡Dâ  ¢2Ò4˜ËÏµ}¡yêFAúo/úçí,_®≥˝Ïˇ3u—\yCØz¯8´Ñ‚Ñön•◊¿Ùm˜·÷Rh|rå>ªqàÊïhpR¯ó78ìW⁄ƒäE)_Vπ  íÕÅŒ*TƒÔızÏxˇÕõÉó_„;å‚1œ17@VDq	„∞§mB)>•íõlg:}ãU™,VƒsA€Z¯5»e„E”œÂ›89Kﬁ¶c]ëæ[uÏ—=ÔÀÚ“SÎ©›–Ù„–M—Øy¬∆a{A˙A∑Ä?Êi #ê¬ö"»ò˛iáù„¿DT=Ë`±™9=£ƒ˘Ø˘©1~n}ÛÊΩ€så—‚mÁ0wü…‡WYñå°Ivê±Œ¡˚+<Ñ mWtût—êSgòe3¿%ÚjJ±eÇp≈lö ∆E[K¿ô√ú",ê¡NÄ√ ∏Qè¨UÉ›◊±9≈y<cà( ®–û2FS¯÷I ô≥S8πÏhÔ€%Üó™A‰˘∞KQVƒ»pH„∫æ†Ê @]¯ê3¯&\∂Ù8˜_æ=9x≥x|≤∑ˇ’Œ€o–ììN¶t≈ÉlD—üwå=˝Lπ`»¬√tb˚jGc∂˚˙–-&√dFŸCåsÜë¶ù≤§ﬁp'Ÿ˚ñ}ùﬁ˛W†‘9Æ≈07ã´Â)Y≤g¿¨!ﬂ ^‹/›È»LFµíﬂì[+M…èQ<JN“‡‘Ï z;S! SöD¶÷úôØt&Q£9Æ©’{„<√ôòëŒRD=‘?-»M‘îùGYD¡§df	vÉ`[";ã‰/—¿§ÖKEuÀä=Xå«íyË<úa⁄”<vVD#ÙGÚ"P$œ˚Q∂ÉÕâ´báÈ†Ë=g3‡±qãòf8”ÒrQDm

pB±;BzAöcùIp5‡«0‰1˙’Ê#`R:*àZ◊4B¿±âFÛ»lã∞#0^¸KEÃ],‚>4.$ªÜï†•ØÉ£7I}d0&ù$älwà¬=eQ?÷!ƒ√‰8(b¢òÇE°O]Çp◊y0@m¬P∑ˇR\¨©†§„sr.wGàNÕ†˘‘i.
≥c’¢2â]”b
˚f,@U #'´›m T˜Bèt'§⁄üPsmœC—≠˚Ù≠]BÈBçÊΩÆ ò)SpâΩ≥Ä‘àY»¢}oÄ$œa)	jaÊûÅŸ4√X#Öáæ¸MÓïÜ±„õÃ@XÚµÉ˛6∑eÙp?8~uLp—ëÅoñ(æV∂7®U93¬Ti "ßM$3äîIÙã(+è0Sêí]8©ÈÌŒ¢8–Œ™≈¸ÑΩøhág€Å≠¿∞:—èH	#ä∫VÑfCj⁄y√SÄËê.±o‡ 'Ë¯∫0O‡/1ye–˜*R»ºÑÇ÷@HbS§±P¸r8ûâH‰äå
ûdÇaBëaCæ#â‡Pó	˙£qhú£‡O√*åÔ‰ÕŒóïº	≈A2®ù=ó<é‘ƒåﬂnæÄ)∞Aâ¨r±
F-π.lYu˜02~∞IägP*õË%µ
¿ÜÚ©áœ°wù‘«Èpµ'ÊÒŸÌü¬jæ»√y8àix^Lk!"–ªOÁÊ'‹mø7açÕ`(é œÁÁ)¨F∂¬z˛sp0ÎìÊ.ú.*8ßT¡e8/*8ıw;˛˘8Ä|>˝/§áa¨nÍ9´ËOŒ8 ∞… ¯Á°˘{~J÷Äπ$Ÿö3≤ª≤w√Bbõ'òü’AB—Ω2°—Áê/q9-X˘*¢p’A∑·Æ—	KH:ÖÇd±ªƒ.F<Âù≈({Õœìú◊ˆ6¸+ñﬁjqg≥∆Räè„`
Ków~Xbù~X®L€Ω‡¯°D?LÜÑ∆)Èî¬I˚àÇ`©nî˜¥>rWçM»≠èZE•∆ƒC≈í‡m((1ÑøÎ+∏~»2òÆµ–(,÷92?è#·¬Óå@⁄ÇÜú°n—4àYΩTü;z˝ÍËı¡ıP(ZXŸ	kg…xDXŸ0~aÊg°˜›+¥V®Î»"‚“í¢√à;`í∂°Ç¸¶\d÷d©4@÷Kÿ¬9rW‰œ/¶∫†¡•@¥^Cx≤6!¶lõf∂DÛ≠&. L€ﬂi,Mÿlpƒ<ç–™∆(ÎèÉ,?Ê<ﬁ…)Û™Y£ÿ{¥Ö#£|aÿ/#Ë¬KeƒH≤¯ÔôQóÏÚÅßºÓª§3Ïà—®∏qæp›t
:≠	¿^ÑPÄ` ˚(Ä\ı_ZÉ™®µãT¡ñ–ﬁ!
Œ ;<g;läG„FhŸÄ SXt òòòé †+'jmû^ÈC,∫x~/vB¸ﬂ¬KLO†ãH^„'˙˚ '∆"CÏ-sw©NÍ—∏°ˆï∏¸πBÂ§¿G‰.ç¯êç©òEƒ?8gG<Åá‘ÒMî∂ôM∫ãïR·(·˝◊G«‚h¡¡ò †˘¶i¿F.©h4%íâ F@M#@$U ñP≠ﬁ˛Œ.NHBã	UúÒ‰Ö)	h¶yFöØ/EKÿ‘ñ#Ja8HÖ(rÅÖÅ{SSÎ˘ÒÕŒt⁄œ≥KTTœ–™:ÉÒì≠5/πÌî r∫gR¥.∫C≈L¶æ7s0Ú˙e+™âv∞_’{Q©{:ñ-Àæ0
[3£ãÔÒ8B'˘Ò@é◊Ä& ®ÃÓÏ•Úq±ô¿u…LÒïãJ˚∂ƒVHπ8=~.F]°óõmõä¢J∆¬{ß∫Â:ô·›˝∆ª.¸9üƒe z}ß'≈,ª\a#j¨ÆÅ˜_f5ßºå˘ãK“îÅB∂_$¢Pó
=Ï f†
|d2
{uUN
›˙˝Â§=\πØ¢1VêMyÉ(^P®ﬂÚ5‚í2+†8e÷eg	Åa¡ˆµµ˛Œû˜ﬂ≠º7"z‚Cõ“·c|* <cüØædm√wnwX4Åc8¡Xÿ√à.öNa¬Ù€?\'Ü’ˇ˙À>›}£-Á≥Ñ°1Úö("(ík«ö4£HZWæπL'£MLæM«
}Í3ÜÏ(≈,ﬁn&K∆49Âﬂ√—≤Œh¡x«*§u‹¥◊Ù†8;LÄîG^¿àlº#ﬂ¬O‡K≠pœ•˙Bz›ñ√)¿?;ŸŒÏı⁄üBÓvX◊!9dCSrùî£AÀsÊ‡
 b£ëß™˙8¡∫Q¥fÏùÚ˚Mµu≈´ˆ“t[y⁄óÛ∆¿°Ê[œ uÀà™2/π(ë^ï®ü8Å3F=w˜ë~è"c€„vl.R$˛ÈGÆ&(>U’G…K˚åÉdbÈœòïdX;¿e¬v‡+Ò›‚pƒ≥rNOeÃ#ﬁ[·ƒ£r≤M≠ óPÎptw¨s,¡â‚aöƒ§u@˛$¸©Œ_§cy7ç.ˇöã,ùGÙµ&≠ß(˚Êj çÚ¯”6'NO	ø„È˜"ÕHÕc˙ñ√§N·‘“è`Ãdw1π°Ò√ÈÒKÛ”h©•Ò®~¥ªQÆ+·wªÙ1¶bTÍ1à?ËÆ‡{MR∑]öÂË≤6_ﬁŒã'G;∏ˇÚÕ…·˛õo^Ìªó$0”Ä~9Jˇ∏vå÷ex®GÓ˝ `ç 9¶¿ÊfÖ]xÅG§ä›ÙˆèÙ÷_7‰É ™{∑xjí©Ú)O9à:÷uè|~˚ﬂÈÖSkê`–V£¯ó‚A…dÊÇ“ñ9$|v˚|Xæı‡1ŸÈWH4y>Jd≤¬}ﬂèPBGVÓãπ˙ÂÂuÌΩ\ √8ˆº®O∫(:D7ŒØ∏LÎªk=rØp0}÷òTUòÉj6Ù);Âd∆!q‚ô∏Œ°’6íüÄlCJˇM∂∫Ü£s≤ƒ¢ÆRªYMGÏØÿÍí’Ú
Í…?ìÓ‹r¸¥<r¨≤ MbØ¸‹ZàïÚzZãpl=ÚÆ°∆úhg¥·›™P˙ÒÀh@… Yæ∂lê‡Â©∫‘ZO¡ÒñVö[í Gÿ/ö‰Œ(Î;pÛπÅd•ô”ﬂéÇ<¶S±[ˆ≥$#k‡2ÉD?1´ÎáÕıø
Ü|ê$ÃÍÍYsÌ}ƒ·fUz–\Ôñ∆¨Üø[Ù¶W⁄ËP>kD«≤º	‚I4¸,2ÈÔÓ&w™[=ÛÍM”byë]û|‡WÜI™SI∂UÙı©ºCÜÕä’ï≈ÉìXf+pÕc’sœ@ê ãÜ–ï
ŸŸÍËp1‰¸ÚµÍ≈Êœ]ß$'SQÚd"äwûÃ∞œkKÇ|Ù¢ÿkœ‡E›Ãﬂrh÷µ˚¶‚™VÅÓ‡Í†@›:iò†Kíòy√ƒ«ﬂì æ⁄9ï *í˘≠ﬁùˆMRÅßÒ¥_–	3ı™‹Oõ¢uÓç Ÿ√¢ÔŸÛÁÇPÉ∏1ÅÀCô:/içƒ∂–Í9ôä"]Ñ”L‘/wU<<πêO±ﬁÓ´√£ùó≤˚ÍÂõù›7}ıŒ€ú&v{ëzÏkPøÙ∂®®É›‡©|ÍkOΩÛ6G√nã$_CÙ¬€
ª¢æû6π íí8cëOΩ√ëÔ
ÌÅ`ÒÑ˙P^;õÿ”Æ!*8Ê °˝≥NO©˘~qJ¿öƒ¥"æÇÖÂ%ÊØKÍÌ'VN:ù'
ªÄﬂÈôi(2°€ÀàRµQÓ$(Äâ˚ﬁóíù∂Vïy-Ω"ä
¬´G‹„—•ì√2`ÄãE˙Øip&y◊QÄf{yÌ4ÜŒ*v#e≈·O†Í™ ≤õÃ/Ÿ˝lz∞ª®≠h∑2kªÓ¢≈j£ærv’4Üπq X¨úEÄÈpyƒ»%èi=áéóÚ@û‚/õ; ò∑»ºÕßfwî¢˘¥[s¸ÏÆÎm•Ù npwπ´MÊà˚∫§üÈÿd>Ò˙ì8ŒUf˝—»ÉKq2ÜB·T}.ç∂>ÓÊ”Åè∫Éc`~êq⁄XËEó?;¿I9pìIu∞˚ÇDıñ¿∫Ñ+R)Si[åƒ<zKjY´ËDE‘Ω˛Ú UÔÄ∞À8:¯ªªÄ™ˆΩ±∫?¯EHk∫Z§8MP¶(¯≥∞+=m™'ZÁV*™e]∂–∞ï
+¡Fó’⁄¥RQ]t9°7+BŸDó!Yπ)sM)•ÿœv>,NÅ8ôHZ¯É†FU sˆà˝Á€?`Ïº‰–&oˇ|I6ï)©W3Üé%⁄k¬`aÓx£ä1˝‹ÑCûˇ·[^f‰ ~ƒhÄl©(Ω&öf¸étöo’/K≈/‚Kwã sEìz(Ö¯^˙Tªœr¯Ñ¢ˆ~£≥™}≥wEËÙ!øvô◊+¿ö¿,±)q©R¸ˆ±l‡e7≈CåŒ†[?k¥æ¢N°†ﬁ/~7÷:
≤Ï"IC£¢z‘X˜5¿°Q⁄°‰◊MWùgxñÀkœO∂˙5¢ÀÄæ°gìTÿ¶,:ãπ¯ë†O≥z#¸ãÉÑ.MuSÂ—Ω	ô1:¸YuØıﬁ≥.·π”Ä|2G;d!n∂!üÃ—ÜQÿ5ö≠ïﬁYÌñﬁ>Î\ﬂ∑?î&Uû;ä?Ëπ(EË%Y±GúßıótÄì±Œ/ãﬂ5–%k ˝“x–\œÈóˆ≥Ê⁄®_øN®˛¨÷Ò¡V’˙_I”åπn`jº´
è©UñeÚ
¶‚›Î‰B©ìØbÀ?G TJ£â¸œ ¬8¥õ2Xƒ≥§¶"™Dú∞Ø¢î£ı´Ã‚åùGÁ‰ÈÕéM}·ò£°õ®C‰DTyáõ≠ú∞∞òZ∆öbÇ&<%À<m™È9AY›ëáÜ’≤\áf_¢Öã?µ-¸I¨±‹≈ùDÆBqW@ìÔ{må§«Ê\?Í>Qm∞»ˆ©≥àisÃ+ÜYÈ€yfo(Óó|ﬂäN~˝3,Ù”÷ÃÊVV´ŸÙ–MÂﬁî‘zçî~⁄§_YMmµWÃ—Ù16¨(XUÍkQY+≥tÅ∆"Z(ÁÜ!"˚t-6®GÆÅÊÍh„g2Ó=Jx©"wYŸm¡˜ì#U6¢œ»#C_≈À¸π+ófòÔi>ëkÄÿô∆Céäø`<;3Ÿò≈EvfÊmãÕ+¬;Û÷©ƒ¬˚©¸j›=[ J·èt9WÍ6ì&#±¬eÉk`8êí¡©Åà¬Fƒ¶¯Kò;S(¯rÁ£kä»∞˝Cˇµˇ«ˇ™Zœnˇ,‹…æ	ÏˆèídtíÍö—k`€é…›Gx˙Á|`¸§sûF¬ë^¥˜ÌY‚`ñÊ`añDz,·/π"ı!±r«ü≥wVt"}»å.$£ô°Å<±Ïê>V–ù"¶Œ{ŸÎÊÉ˜˙æ[Ç¡.+%¢’Q¨ F‘3Ål¿
%`Ö
("ºw#˘Ób0ÚF.l1%÷zô‰\ÿ%ƒ«0LƒZ·°X)˘X¿ªj1Éx'@»>h}ånÎ(A«jUÔPÊÑV9Ã ΩKy}xäÜ⁄≤,>ﬁ…a/F§˝óO…|êPˆŒ,åV•ÈñXò¯ƒ}Üs?√[˝”`6Œ}UÜù\s”@|∂—~%¶7ƒÂj4Ojò¢ zN«©áL*/:ë~vL÷·$äg{®W¡]-1ªkãz0&‘ºÜ®nºì⁄/S&7ﬁ#’±o∫÷QxU’”/Òz§6≥	‹UéÑ„ùÅîTíbÀE‰i‘Jq∑\PûUP…¥F¡F‚iíOi7`m€€&ñΩ/Ë&≠''¬Ô∆Ÿl¬ﬁæ=ÿC‚Úé¢&ﬂf€¸c;ôç¡^j/_t˝ÖVc‘ôI/fäG<)‹á@Ì·j ö—±ÿÏ#aºáM√DbÜTFOèK‰#÷ËKH?QC‰':#ÎuºGGG ¨By4Mÿ¬foı…Ú≥–E≤(V_œz–;¬òU–:N'ñûäËz¸»ÑrkX’‚6∆à°!ëk&‡{Ωp– ÜÂ!aïô!&k†Ω¿åò∏¡T·b‡äÏÌè-[˛_ﬂ≠ÙæzßÔØ?øÈÈÔ-æØÆ›¸f9Í√ZÂ:P,´D4∏aêû¡zÌJôzA;!p¶ _Òp6¶M¿mJ˘YÑ©–ÍsñÉÑ‰rû-òt8¥<(t“
("µ¨	!0cﬁ%@¿ÂÉ≈……ø∫1Z.F∞dˆêë˜¨L6·À«öÜCíaíT#"ôhª–3 ﬁ&‰–.ÊY0&N.ÃV'PP∏‚Á¿Ít8íØm1:µœúù¡öÜÅ8z1Ê“N¶∏∆§ã˝F9ŸhÅB,òªeøìé~Öeí¬ı°	<Ø"∂·ô≠ŸØY’˝ä±´tøÇá¶c◊d¥ÏUx?ÿõ6™Í¶Òa†N!ì∫ØÊπÕü°¿!≈çΩ*Oçr%úãSÿﬁ4+Ô~Z◊÷õ˝‘wÖÂÆëw≈›BQ,.∏ K^±ö»Ü¨Æ≠o<~≤∏dÆ!,Å€∂‘
îü;ñƒ‚„ ‘~™Ô}ÏßOù’≥ÅΩ¥~Ä†¨-(H·gñúW“∆˙¡bDŸ	±`Ê{S–Ò∞'y3?rÇërÚV…I–»íf≠A7™
óıÈF5cÈ¶µ'¡ä⁄ “äz∏¢ñá˘∆FÜÇr˙LñØíıòƒr¿TQ"§∆ˆ÷ﬁ~zq…]Fß_¨t/+›ÂnÊÿgˆ_”Fê.0ãåUAûRFº¬ÏQaË(RLw«ªﬁÀJHD5QÕUlu%s‘wè‹aJlBÜï
•
AÕ∏æ¡Nô3^kÃ# Ä”‡^ À≈c‡DYB8/∫õ\gÄY6ûà2≈ŒàÉ»åãÁX>µ*àï_MIA¥Õﬁ)U\›º∑ÎÑB&E≈∂”µ5T‚™‰™ìèæÑ≤
qh≥`˜ı·rw`’ãBP]7∫Èé∑0∆5&‹µÒ:ùíÚËÅ‘G˛ÖWzôm≠ñπ_≈L{’Ã})g»S~3ƒèpÚiERk*∂<+⁄≠Eêó'òÀ8⁄†Ñ6Å†≤[fˇ1‡zÎçc§7~≈ 3ë@†⁄ß=ß—ÀπQ§@˝—e!ñg}õ∏vµæV∆#õ"»©*∂âH˙®Ú¡kIMß£hà‚j	Ñ«SCüÃe"£yir5F˚Çπã§Dòí ££@»¸
€ñ»"h¥â ë Ôóµnd´]ñ⁄πz'û⁄π o…T˚j3=?#=≠ŸÊ˘πµ0∫_¡[õ§_I÷⁄$t}ÄÉ	qn/Ä˚LwÈ&Ã∞ﬁ‘|u›ÍÍ‚Çµ6mä‘úuâ¬π¨5•(kÆ is‹5+)ÓW«ó;◊,ºç˜ãÇ>æN[m“»¢îÖl(CQ»eÛÌé<‘lXbÉåmÚÚHºø{â±Á5#™±21{Ô~sm@ÁÕ{äEàÅ√ƒ∫]¸/Òâ˜{du⁄õˇÇ$œº~ÓÉÀla0&ÓaZãiÒ¬—ÇâSÏÙ·Vh˛ˆÄDœqÑ
—ËÊg≤<4øNÅÄª˝ÔåuŸt◊Âß]â}TŸ¡Dê÷!	‚©$A±∏dQå6›cµxŸãû1π¡ÎôòÇD…` ≤ÅdéQTgq—ÛF‹Œz_ÈªYÔ[∫ê-ﬂøŒ/≈†í0-êf	∆ÆÄ∫√îSñ\~OÃ@û+¡x/∆Ò‡Œö.ê\£€?±Ø•*âN$ 0UWME
âZŸ∆áårzGm2º˝Ô,∆q,™˛≤ û"œ&∏.cúS8mÄ´ÒbXJº◊7èƒÛª}=QΩwøπF7¿Ä‚w¢ë7]OÉãnNû≥}∫0óëıÿeƒÃSÂAˇª∫ ôJﬁ”∆*˜z{03UÇÅ3;Ú1pÌyåê`±cËXf∂f•I}!l"@LB¿ê&9Å$HXHJ˛‰∞Ï≈çFánÄ–ëŒ‰∞ElM∫’Jò¶ÒLÏéWn √:êLΩÎ1"4f
Â!∞nƒuÄì%∞Ä≤àÿ	¥o-ÑiQË‘~˚[X¥›˛\ö}≈Œ™òíÊ∆Ti µ
©˙éhù0JC˜00…‚éQõ‡uƒJBx13M"ÎÆœ∫W+¯j1CKﬁ[ÈôÊ˝Êéÿ\aì9y© Gb√W{o_Ïc0˙Éóo^Ω,ÖÄö+á◊‘…C‰.33[a÷ãΩo?&•◊«dﬂ2î"*ÊMFv∑|^Qå∆ÉIzµXJÚqIº⁄%
cù◊™\∑E0«∫Æàj•Å§óWS[_‘
xñH1∞òƒh¬MÜpÚ}@ù§◊∏8@…ÉÀøS∫qa-‰ÌÕ∞E˘ :D]S∆ñãdxCT19òbË‡et`2ËÅÿæHN,y$∂£<ôöÑu∫·ØåuÅó”5dÁ$“õı•*ªùn˜kd]ƒ¢ıQ""%ì‹–ˆL¶©ß˝ye1ëh∏ÑΩà‹U∞#ﬁÒñ:ıŸ£J’(2ó‚º9féóf.‰˜"G0œI. A¡¥Íñ	—E‰› xﬁ˛)é&eØGﬁcd^XòJGRí}•∏V§ê§ÿ·pnJ°eÚA=ç[ÿk(œ:»Ìd"X,Ï`ßÀËîÛKÂGéë ,,+O∆eÌ˛8OíBc“€ˇ{¬)MïëJπ‚…qÌÄ\áK÷ú&#hÕQÑ°ˇPÿÇá è‚Í§q`åÎ˘Ç%Önô<`ÒH°wˇŒ∆jÙÁ¿qxNúWıÆA0>«ëÿÈ(≈„n.™l`K(;∫s2X
¿Ø¬ˆjñâúy0%¬}6…3Kœo/É@¨qb#c’ØêK1Ô_Ü˜-af°ùòb”GcçåK«ﬁºR(eB!$±Â7A O?vi °ü öœÑ6çòeΩo—Ìã‚,êèπ»Ü√G.«≥ÿ¥Ìj√¿·úÚD`ƒCv√◊≥p $\‚†ÚØetÀ¥»ßçöI¿*ñìªbÊa£)*éBÛ,M!≥™‹c÷mMAâï PÓ<HÅÑ‡{Zd“yëù:FéE¶ö”*ÜÀ§˙˛Q\2#2–‰9ÄÁQ63í –}µƒ^çxü|õq∫&DV√æz“£PÕ√	º˝SŸÚ‡;se˙ïÙáYt.ºêπå¯†ÛU¶ÛÏ’£ ˜¢À	o:L—äû›˛o¯“áâd€îc3h‹˛!óYˆŒìÖ‚}lX± Pw%T‚i©ˇÆºp˘ç≈D|+xœÒiî
≥º‹öiqG∞5§Tá(»“#N ^'†•lÙöJÛ‘d)7€%œ¿“ DÊÎâ£RâidÖ)3ûê4 I$#!ºD6Ç:‹ââ•ﬁ4UÈˇ<áSô…‘®ík–]å≤§Û™≠‹ùìRÏMâ]Q√ª∞ƒÇÔgtZÌóbbËRs®&‰bYƒT˘1—¿∂¬Ë‹ÃzüMÅ‚˜ÆzüÉ¥M0±=p&ßAHLí	¸Ì}ÒòÖÄ+ë˜Ø¨,®[«¬Ô‰]ÀÓyîè°m◊'ËõŸ`°(îÕ≤‹ŒN|òd*môG0jÀKìÌÎ-ëÃû`«€◊Håo–Çf?l_˘7œéÖ!…õYòl-ãJœîñcYœ»Yû≥4
˛”ÃòıVŸ¯l≥¯π¡ŒÇioµXh‡k¨å‘ÿlf⁄[aÄ¶””qr—E!†6ÍùF9êØ^Ôb€Ω¸ÿhÅËùLJø‘MG¶≈_îhÙÖH4äøKÉÙÉÇ›6πl·‚[©™ ‹VX“‡´/É·áŸtÒ=y˚u@åÅÕq¿¨bëÌßå}‡W€◊PÁ¶ÙFoÅˆ ©êﬁÍ‰∆≠P¨÷ı0Ó∏o[∏Ëù‚Â3"√ﬁòüÊl⁄{"~Ω[]ô^ægßÄzÉ1ÃáÕ¶¸ïOH©? ø⁄ªà‡lÈı8œ(FuDå«K•		ê£	ê≤&¡û≥Ö¡Yèí2§Wx2ƒx2¶–˚
€dÙHt≥±¬FõPKu,Ö‹é›•zVÌÄ≥aÀb«¨¬]£©≠e®M¿ –ﬁL˜÷¬;SXæ÷∞ΩdöQπÈ¬WVZ(œ∂™ÏOY,>Z7K”B_é%∞$„êK_ Ké	
‡^Ä·òû9aNv[–≥≠Â—∫ ı(eçpào¢¢6Â.4c{·[…) ¶<XrA›åg–˙˝ç˛€GQ‡∆+·ó[uq∞á≠ÔLƒuπÕˇ˝aocc≠wÙ˙’ﬁ‹MøD€7X¥˝	≤∑Ó–Ø}±3oZ6Ω˚ÚË?7µá)™⁄€ZÜ]Ú¿öÁq˘Y◊∞cfe®7P˜/Ù1€Ö±y’‡>-˜ô1	.<C·@a¸#1øh
J—*°*0ºb{A !n<Éçî⁄ÃÑÜ)DQlbbå˚∆.9B¢Ç”∂k¥!"u˚ )vÑ„•‚Èo-OÔröWY6Ÿtw≈ˆ ®,ˇé—¬Ó“º∑\"ã;ø^Ÿ¥+jIe±GèW\¬)@å≥C´*w¶[µT˛ëüé˘%Äüd=rÂ¶⁄®õÜßëãﬁ⁄Á¿@¡?i2√ò"Ω5 lIä÷‘‘|r≤(P,c
W‰?£”+ısäMú)2këç“(˛–[i%nËX•∑Ê¿√≈î&MŒXñ∑ãä7,Á€¥‹tÏô4íf:Íën9ä*ëeÒ¡hµm∆uÄ«‡ fò√j˚zÌÛõ0©m’odÀ˛¸¯◊*‚$<oÚ$¨5oŒVD$#Âß∆ryÕOoÜ5Ñf£1PΩ`8‰Sÿ¬Àø≥∂@Ô»‚R0
‡q91πæÏdæ§”U3cåB2iﬁ!ô_	Pö}Ü¿Äñ8«ÚGIoßËjPø!ÙQÙ}˚:”èÃÑN-öp‰Ä“≤˜%ïÚåÂ:pBü
§V¡Ùß∂k\¢∆˝Å#Ó_LF:_¿å˝~ürÇI0ù•IÛji±¥±†±ÅK`ÀıÉ–t¸ËÂ◊BÿÚHäf4û†ÚÂ‚:LŒöèiÌ{˘≤âÓÚ˝È”B9PIâ√¯’“B¡$ŒI1ï€]» ÷3©†`Ë>Y2(¯Ñıï_,ƒı˛)»†»±˘+¢Ç4°ªAsÕ4êV‚óBﬂf›ëg;G{_-…ØÖ≥˚!ÇÌﬂT=v∞¿®7Ω‘à∫ä'ˇ9ıoP•_Ë≠Xgë˘Ø{we¬cT&d kìsÂ$	Ö—
ÊnãS¿r<≈†(‚*-¡Lıl™’võ?ç†/Ëï@#êÆ(T}@ÀJuäœ˚ºﬂQ∏µ≤jìz]P≠Æ8âuìì∞U‰Ü"^3`j.K“ﬁ4![
8^c4=ÂÓ›«ÇÌ¡Z

9laï9ÜÜÑZˆB8_A·8◊bz–IJdŸÂ5°Öw≥	‘À'0á(øÍ˝^©Ë’ÉU†Îï£≠\ª1Å6‡˘á’öü∞€C–¨eéeCáI¡Á¨ï˘\—çv\Œ^XÉ*òli8¸v6YxvàGò8ÎÑuêHr¿∆>%3º$q·Í∑ø>#œx¡E»´úÖg;h1ƒ_?´°Zç¥¿'v¨:t
$4√P;.y∏L0 F„iå*Yr
ò3¢ôZ„ëÈ.∆J‚Pî€ÄnÃ£ÒÔ•	Vj2ôyKÙs°-•˘u·-≠ .I.≠{¬˘pòñ7
$∂j_=bæ˘ø 4∂u<´√gÊ&"{Üèƒh%4Ê^¨Ü∫s@j§˛z¨&°Ó@kbÊ%ºF6ôò@C^ıpﬂ˛	o«»W®R ÛùsaÎ¬«§£∂qËXF3¿áÌêZ˚âU©¶ZqŸüõ-m Ÿ2{MiâèEZ‚èºÆ#˜N;üFÄ˙√°àMòW=Ω˝#ˆíD≈:%ÛoºùÉ˜ÖI‰ÖA¡t'Ë_(&c@Ç3ûíÒóÃúå&Qg23»ùYˆIXbŸ´µm[G£$Ê$£˘Z›3+CÈµHóÃvfôSrnÂÙ‰˙<ØSÜ8◊Ú {Öó!`t{aˇrSJÒLπ*$ô;@]ﬂ!/Ú≥˙ráÚ~§g<ÔS[Ì´¨»Ô8VUΩy®:)È]G*¸§=„îπb˛‡".nº—Ûª?H›¡
«Í∆ë
øÂªìNIßîT‹3Ó∆ÒbSÕ√•ƒ™w^TeøÎﬂŒ9è€Ë¸ﬂ˛ÛãˇÌ_Ÿ⁄Áøgˇ˛èˇƒD“Á€?NË◊—Niµe⁄£ÆÚ∫ñfa`@⁄¥i≠ä®QŸ‘©)=Fà˙Äù&ƒ◊’5 •çô‘⁄°)^8Ñ¶xM†0ÚõQ9M_W˚n’ddi®ˇ§—eAïcÔ§™Ä˜bãcNŒaç„#›[ï`qü›Ò«Pq6…{´¶≤åúû'èÏg,˙1åjX]SÑÙ—ﬁ∑K⁄I»w>Ïí!N¢h=yh!ßﬁg;©‡◊ê¢ßKƒAÍß‹UÃ◊ı#@∆í˜ﬂ$5N}ò„€?ó‚êC~Ä˘|â›0ÁÔg’ù—ñˇtTÅRÕÕ5BXMs\\KîÔ/≠‹ ûè RÙÓø|{rfˇùäwﬁæx”?ç‚P¶-VAhüúàá˛V≥cÈÛ≈t-qö¥/XMñıy≈ó™^ #CcŸw√%BòggàDÎã%Ò$_"C1q®7 ﬂÑµJùä÷^Åú≠Ø¡8eÑl'„Ù4^Î`…T◊ØŸm˘)˜P≥ÚC—.&Œ,—cΩÙÃÑ+LE›«ZBù€∑y*LF28/“d¬Ì8< tŸôRí`zÓh[Ã\wë'-:hq:ä.™8TQVTˆCø’
Rßså5<Üûè2ø¯˚9™æ√§4î‰ÈgS ,\sâ≠∂õöYó&¥ƒVñ5›Æ9olßπ¸Mã6}ß‘KZ›v√Òk≠i§OïVä¶˝ÇÎ*Ÿ\(%%∞”ÀﬁõHª“—`”x4¿Ë{ÆãB”ÎN4Í&ïBpChõ|Dïœ£,Ïj∂X∂Pﬂ@=˛k“¿m}ùF”oyä*±‘Í≠>©2J\7å6õµ{%Âûb#º◊ÿ¯EÔ±asö˝[Ωi£’ÛÈÖ	á“˙EÏ®˚Û>…Xà^5lŸß®gyØS[2©flΩ˘B˜¶ÖÌÄ∞>iÉ:ƒÌ¬pƒá…e√8ƒX≈'T[òSòíW1„VKˆ/~®Û€{ÈåJh?]br–õLÆrRço⁄mcbâÜÄcF?Û `‚^ã%m÷åWaé—d]∑A««Ñ±≈cR`‡:P¿1î#;ÊAˇ^˝rÒ’òüd±€ˆ(,”Y®-÷§ Ø&67˚S”¢œÖ—UÂuo4^W˙∏’»Îñò\5ü/ÎÓõ4ÁlHƒØ>W’+óˇ^ÂÎùÅpw·∂Rº¶N?Rƒ6eÃáΩéí4˙ël…—]˘õKwgÌ\¸≠ïP8p/)oﬂ%≠]q‹6∞TD!Ä≤Ë1|˚ßêK_˙nıJúﬁA¢ùÜÁƒ}ï§ìèla]NﬁÏ|˘±bÌ/K$=2W◊,ïNÀE>«˜¯Æ≤Èëç(¢z∆˝)µTıW,•˙Ó_Uœß·ÑˇEVµ⁄˛ˇ°¨⁄(ß:\Õ¶Aü¨Íì&´©÷_Ñ °≤Ö»¯kñ-®Ò
çvâπ—*\#:ÚT£‰Ë{Áπw+≈6ôÛ“◊åéÛé¿∞É·¡tÏéA>0◊]èxÕ°*„êTŒº÷]ÒÓ^óÎØKXˆP˛0öä®[:º‚|éó-ùÂÆOgqÃ«°ÿSO\§R?ˆ“ÚC¢„i≥‹Ë3ù>¶4<¸äÜ÷9m!ŒÀ2¡ñ¶Ä·À^•Ü	ıº¨2∆Ê¯ÈÄûJ&œ±aëÏ®z¥·ØTbcãêN4=)^Zm¶SMÀ⁄Lƒl˜¯¢πá^Úr@ΩNE¯õFg¥zsW=ï∫π‹—_çïèï±¶5˛ªı5<Ú>)„1káGJ>œ ûåzÜåB–yVÿt/ØIh—O}ùõÃ“ˇó`™¨…WÍùXÕßG~¿0…ÅÚàyç°‹Tòl∂£cD&Ä¯7Ê√Ω%Öe…<˚MBûëÁﬁ"fù®∏òÅXz˚¶2@ŸFF™ùà°≈ÅJó»–Õ:ä(zÃR∏FÃŒPg¬ÌŸÒi®Ënû e‡YÿY◊†Cò`áOP›-5T0ƒÈlå1¥÷
^µâ“©	≥πƒéLıP∏$éÚ$EN´ëY}xœ”˘É_Y°Á‡æV}QÊeøZyí‘òÄó—Œ¢ù5Ìº˚ÎkÉaæG¥”SA@á™Rã˜˛&%xâv6ÍLpõu->∫_ıÛüA8¯ª⁄{ïñ| üsF˘D»—ΩtË`i≠Ç—÷:áÃyÿΩÛ—v‹:ö¨ë6tûFóÕØjÏõè®@Ÿ¨Ÿ2µ¶` o	ìuqÿIæ§≤ï%3%~é∆è<†+•†√Uûœ˛„Z»-ÈpÊ·˛ü¨∏Ò„d¯ËS$“–∫5ãÂ[Ç€¨Cﬁ÷≤øπö÷´ivÎóv¶Æ=_Hì’’πu≥Î∂Áô8©ß…pñm&≥|≈\ÿ~ãGc]Ø≥©Wz$ú_.‚¬pz∫‡ÉÜ¿‰÷≤®0W£ÒÙ˚∫V»Ô“,éïÌ
œêª¥¨\M„odëª4Oß6°C[Ω(tæwÙ˘n—0tVjäáDw5S]wZØ◊!xt`Éñ?á¡S
Å0:£ ‰Ë+FÙØ?∆4^¨∞M'¥ÛNâlCûÊ"üî§LfÂŸ¨'¶û†¶	˚í«¸4FgŸƒÊÍµz¨nº≥ÎÕóA<Ùπ›ºúÇ¯√£˜4‹4»¢qøﬂ∑Ü
e∆%Ó<∏]Ú˚êÅ9M/¶bªQﬁ∞JX¢ıöU®˜iK°o°)≠®SR¿Fóî)^úô:∑™ÚOÊ Sâ–çQ◊:Ú8Ã›¸Jﬁ 8pwÛ∂ùW(¯h©†ΩX`HîÌC*¨l∑vSL@—∫[»Jâ	·~Eº√
Há}§“≠h÷ΩVTh'+(¨fhYïLKÀ2É-ÊY—˝w≤¬GH•@Ê|™çUáa⁄[RïbÇ["≈Fìö„zÁ≈ãì£ùø?‹˘Ê‰pˇÕ7ØˆéIg=i2mQ>˚±‰ΩÕ∏¯v\·∫Ú|îÑY?äá„HXùFsì6∆U-ı‰§&oa^Âj…Û‰ÏlÃ≠»˘u⁄XMÕ´-_k…aÈ¿”Ö9ÏcÌ…◊Ÿsk”ãç+©œóWKtMM‘Éı˙Íäs%#ïËfô*2S|÷ª9ÙÜ}X»pmFøZˆIË¨zùûw©n›<ãV ìneÎŒÆãû0.«.^∫+ÉOH„jcπ.>á\òÊ¯ ÏN I[Ù¶ÚJEÁë∏πV7ÁmÓ&‚^|¶ŒBs≠9ªVµ>ñŒnwÁ°ÀaÔ™Ÿª»ÛÒvT£ô±∆ò¡Ñ¸_c˜&∏TìÅ≈í¨’nz˚G`UìÍ@èj0mÿª=êí1ÎÀ°7÷˘è]êˇ'Ëy$(I&î#U_&æ˝W‡ß¡Î—ò(£áQò4ÎãÜø[∑ÉGnÿÏﬁìFvo®9ˇØ8ogù@#Rv‡e<¶úy7ööCÌà”hßf’˙‡ñˆ\Í`w2óm,µJª£¬ΩµçúlîJ‚ØP•j+*¥vBh‘Z≈ÛFÜÒ5a-,Ë≤úO∑†√eA†Ÿæ^i1©Ü9Ìür~ª K⁄.∏±m±(“ŒÔö0⁄±˜iâŸ
°MƒÄy+uU∏ÆégŒ†»Zõ˛ÖÍÛ…JhèœP£æ∆¶© /f° Ò5%X …˚—µãœÇ—É,œ0ò?é%âd⁄[]^c=)hˆWÙ¿d˛*B%/<˚è˜ùÆ˛}’~÷%	∏#·©˘p<ÅeÄ“é)–⁄Ô_´∫π §*ˇÔﬁÌ¿‹?¶ä¯aF)îCÀl˝Puˇ–Ñ\ˆ.‡º=¡◊ºå?V¨wµëﬂï?ûã¸∂'æ-IØ$º!häŸñ˛˙¸ˆ ÌtÇ‡˛»m±˝Hm&oƒS˜£)±¯π÷öí¶ÚüåéD¥F;¢Ö[I«Ó¨i|Ëÿ‘ïåÍ™“˘˙Æ·ÁJ¯¨≥<Ø{πëkX¨∑Ëäpls8SP˘äÃ¬Ú”&¿xŸF~ø¶∏l~U.fJ“∂ËèÕ‘"n
ﬂjU*¿∏ë{Ku…}m. ﬁ⁄I”‰‚4◊ûÜÀœÿ∑…(Ë≤=`„ƒ/ëÀàsB!xV¿µQ·Ωº¥æ‰»&õÙÜÑﬂÎ¬Ä∑0æ¨Fã>uMs®n¢ó'ux÷Ög;2¡∫qöÍy”6÷’4ñ	úôŸDk≠P#Ö^h∏p2≤m|)Ñåw"bA¯ïˆ ÆKSÛ@*á"'w2Å¨⁄‹&#ÎÊ€ºvyJGπﬁ)ùa¢	*JyàpvÃÂhtãœF…≈ŒòßyÁ;—≈á-ë2 o ´˚Ëª⁄6k=∑[‡`Ñû/kSí,\W¥§hQGçã
®P¨ƒA¶¿Í§Fê‰X2ß˝π~j˘ô˝+n£*±¸)CMZ{å™à\5ÿ5‹.›ï3öÀ‹w]$˛aËü–“Êó,∆0+ıòÁÖ•¬±À/SøØﬂd∞kÌ¬<NﬂûH÷vÁ√ö«£¿Ï\ Ñ4g G∞ˆ qucQeÏ†w0æ+Üﬁ…®˜å¬…ÛÔÉ¥“‚y–hv#¨ê∑´œgñ;ôaåƒmœÄÒ<KÑ++Ÿ_5⁄“˙πä∑bˆ™øNÍ\‘+MÚˆuÂˆÜœe¡— Ë‘ 1Æ]
«DÉ$Zv	¶Q+2:Ê√≠°{éa.ö+aFn6ºu9„îïu·Ÿ◊‚9˙˛0ã¶-lÖ›Ò‰<Ec;Í+‚ ª(haŸÏ⁄acj°ÖgØ l)~2	Bòm®s¥˜mwÓÊŒqD–Œ¬≥oÂ7∂ôc≤£πõÇSù≈hù∞'øÈ‹s∑ï»ÈŸ=†ê˙πyó-AÜ2H–1ÜXK p…˘eâ†ª˝øê:NÿQñ¥qMõL∂çÉ-‰F5ñ{ÌÜÏ.∂µv°ﬂœ ªÕ$æfé!Œ–¡êÌæ>Ï≥ùsa·Á¥⁄Óß¡i ≤uvñ”Q4Ã0Ö¡É9bÜê1?G˜¡0Jy.≥˘-ã	%<Î◊„˙ë¡«=Ô–YÂ,‚82íÒó–ô1NŒ
eûÂ‚‚ÿ®] —Ûp”„U=∫5⁄^ë˝ö\ó5Ã˘=‹äh˚‰Iû(,ö;~∑≠}ﬁ≥9	ŸÔ∂¨ŸÛ~R;ïÑ£ãﬁÔŸ˛w=:-s∏«éØ∏h;tN„ïMIgµ’-Y+-€X∏◊ü˘o[
æA
µŒıã…/“,õﬁ˛9úçõáÂòöØ^lwWÿÃbÆÄòéçHa˝Á{ôÌ¢Û0¸EvA|¡∞Ñ}J †vÓxÿ4¨¨ïj[±µB≈√√÷õÀm LûuŒ∏äãW~W†ÎÂ˚‹^u&–⁄*√¥t\VÑ_H£k¶Æ~nI∞ﬁæsc∂ëñ*LIÙCÃãLn«‰Jªuª|g!∞åét∫øÀ¢Û:ïGéjn#[Ñ∆PŸ˙8í*8∏Í7∆!É”⁄‚Æ.Ò l8y⁄tí°ô;ﬁ˜ïc∞hòX]x¶ëI>˙yÜ`¶~À”Oe(ÑÎ>ï¡Ñ˚…åF`˝Ê·@âZ»∆N«V>H¬´˙nÆ_ÌΩ}±èe^º9xıR8Nt&Iÿ*ﬁ©p†Ä5ô†ÔÑÈøÉ∆˙Q¯Ω¡ÆÅe‰õÏ4g|	I∏AˇƒÙè_˝é›4≈úTaC—˜∆“9ç¯8‹Dõø‰îâ1Ì¶≥∞WÀxÆ5ƒlû‡©bx2”Ωåk˙”,L—ª∞LC/äã'≥ƒﬁ—ZΩﬂdè‰#˘†]€ÀÀÏòÙJ@<ëñ-|K>ÍÀg@’æüë%l$0ÏQï£*≈TYÊÇ)B'W†@5‘N(ñ+éQv∏t$‘=íSÏ„ìnª®∂jY˙bÕauhaüÍÁ8ºÚS±˙yãû⁄ƒîÓC"n!Ä»S@≤©∑Ø≈Æ4áhml§ï#~ÄKW%®ﬂ¢ˆ›JeΩ6÷á—^hEæQlXˇ±#∞8íÅÊ“zóct‘Ä—(WçºÅçüÎŒ;IKlQ¿~√›«øbøﬂ≥ «©+è6ÜF3&'Ãê±ûπV‰◊Sö¨vŸ1†]é·}AM:≈I∑Û…°a¥é˛Iü;Ñ •èé˙ËíâVZ≈⁄§OaN!¶ˇ»>Ïÿ&ùÙˆ-z\√WNÏbª †bbm"Å∫iµ’lt*Íµï‚ô,'9*cì∂]Ê6—Dq≠NAK„&ÓÑ⁄©G0UﬁM∫ÉzÊ
‡∫=›◊ÉÎíö5FüÜÆg≠9ˆV£¢Á°¥<qïÿ2L¨IAêéï•I—3∑ñÁ0H1´Öp≠&ªéÜ(ª1Íg#Ôh$îTä‡Ü∏o˜å∞)L”¯¨tç[ÉŒ€+R«áõN2Õ9hÂ^Ω#0öﬁ√ßZ˙©Ω™EóMàÆµ˛ãÕi∫Ådaı ¥cUµ(ÇÎg¡>ç¶∑ìM#:)WµE¨˛∆Qê∏˚ﬁifUt˙æMßM¸È}{©€vZÖû Ù^_7bº⁄¶!¶e S÷⁄L+ÃFQÚÿU
∂q`WG£≈‚œÂ„."—∑iV8¿kc¥‹™é$ª·uÇ_])>∞W¸u±rM±óËSm«åˆÀÎ“öyù]Ù–Øe≠éºŒ≥9êÆ'…@]®\‘0)„j∫ïƒ^Œ≈ÿﬁC›”wµŸ6¶wbh> ¸¬8ò†≈ñ
†*Õ©w@È√ü¿=æÜÉº#˜wÌ#Nã”$[Ï÷Ÿ=3çû˙öpñN«‹Ê≈£èg◊?˘KB;⁄\ñY∆;&;	«-£J‚}é™ˇáæ-ºﬂà=Ùπ~◊Ñ‰YnÇ¿èk≤∏$È‡∑ΩXãÏ¶âŒ vF∞®	Æ©—V±–Ï∑lg¿”<»⁄∑»≈÷Ì…ÕbÀÏ(M¬YûÃ—ZÜ…ÏÜP£hNÁ∑kﬂJí
´#9^˚ñÜ*âû—êN¨7«"—ùGh5S$Âõc82yü9ı®©ë˜Ìe¸T…-G·˘‹¢~⁄ÎR€%P`sâ1¯ôGî¡œ‹‚~Ó “‡ß0jÀ{í~Êênjs!á˙os3–¶–ºI,ò7˘ôœ[~üA·◊ÊîÑUß…û62≥m“f0CVjπìR\2òõBZ“Y{âE}~y	?-4≥≠Ó9
°Ö¶∑Ezˆq⁄ﬁªÍº\7A]Â/Z\?3æÒ	kqM[=tíêA+˜8‘°1Í(s•Oö‰Ãeèú°F'cÑ»‚ÑFìqå˘≈»7«Êø˘%Œ»»‰”–Ï6™r—ù6â-m.<∫≥6wg(“\4ˆS+tEóøXÖÆ\B/Á‡ÉÄ8π∞§”uQp<¢ﬂOW≠+–^ƒ‰˙ÔIø˚IËs)Ó»œ†“}`Æ'¨iÛnW∆=mOQçπÇÊÛõU{€&h™„BÍç°⁄∏¿Õ‹ú≠/XEé¸o£0m_Sº§F]tõ†™≠vujÌ/@ﬂœ<⁄ÏyıŸ‘WIìç=∑÷d∑Z∂OM›]ÈÎæÅ|ÚÁÛÛ…ı°,⁄Rﬂ6·,™˚pÊÃ—8g3°L)¢ù3Ê^…@ü”_†6vÉ£w¶ï0–‡pœõS∆¡m1åbÔ¥7&ﬁ‘˚Sï¯Ú!¸˝`√T>`‰·§lqßΩ´<›/∫@iÊâLSG¯zFÓÇ@_(%¿`ñ—Áö?Ò•·œºN˛ÃO⁄g¬lPÀëQ™‘Ü–}	≤Ê“ ˛6:ç˛ºË‹ÄÌä ¡•ËãiÉåud»#|N≤’ò«g˘®Œ{m'ÿË⁄Íìˇf∆'(˜bÓKt‹•@!¡YíhÂç‚Ûò-â„˙ÖI%◊7ë&%ò¶…eD¡	1Åí’$∆,∏¿iOí\xåbpê6ÜQˆQí4”·¢úµ#€Ÿïä∞Mµ+TR"L)‰¡Kèfì@áLAë}{3v˚Ø„<ö¿d2¢oÅö21UZc\wK·Ï[¯≥ñ&ÀE‹‰ÃµÌnˆå%ΩX´ÄxèùÑn Z;◊∂2//,Ô¢WÔßm7‡›ˆ &1Î#í|¥ T\€GôA›ÄAm2\¯È˚∑ˇÅﬂB~ÁÎj·i$ü|@‚∆ØG¬ò#à^•∂≤•ôˇÛø˝”ˇndÆ	¥7ÀÜ·/dGœAz¿K#Ü|„˝ŒŒL"“z.¯˘üˇÌˇ¯ÿV0O∆F)?›æ˛nîÁ”lsy˘‚‚¢ñ$gcé1ñ·Dgœÿ˛Myp˛7KﬁÒŸÕwÌ-ﬁÈ#‚õl/ú ÔhÔ@ü£‡ƒI2Â°"N`F<M[Ö˚6?∆û ∆H— …Á‘ª÷"‘¥˘ôk˚ñÊ¿`ÂÁ⁄…≠Â`ÆéÆÒ‰π$∫ªxsùßúRU‰ùÚ∂J'°ù]V¬Â√CˆÕ7õì…‚ŒuJüπNÁO
QA‡ü3`…aº˜Åz|	áÛÖ≈å|}t,bq†ãsäãPp K±ˇ`+'@!Ü5xâ˝FCu…·,@ˆÆÄ¢{<éÑ÷ ÖãÌüjMpNì&üe"*a2@>&p˘W‰uY!'ä√(õ&2àaúh¶∑6K⁄›¨~>Zì¯Ï[¥m¢]îÃ'2&ûÄFÚc` vrÙ6≈m8ã‚K,_¡G£ä÷sióÇImuç∫f\W∂\£^˘¯io£>é∫JËE^ÛfpöRÓdm“Æôü¬Ò-MÅê™ZÉ-•)f-M‘gﬂvÌΩﬁlø(›Vî¬hî¥72@…˜Ì±/= B¿j{™=%›:¶GQ¨dÚ’∫‹ûO√>`ÿ‰#óç®…» Xîß&"Ri∞-≠.‘ß5lÕﬂ^ËﬁãPd@^äîÛ¬˜Ω@böd‹Cz∞a¬†.“|◊¢>ÌabOi1*u≤Ógæ]mãZ€ïkÚÍlj•÷~ß%ç"z{˚GÉ‹¬>1äl<ø˝óÑÓÏ¢I¥V$°∂(&5ãŒy}¡dà¿œ–$Zå—‡Yc§~ÄvŒÉ°H¥&¿ËÁ¸L{Ó≥#†‚≤8˘ÒŸÏˆèF‘?≤±Dò5,6≠≠µÇßª‘_˙˝a›TlÈ`DóIùûÁLô>ù`”wŒÜr»'ÉTò’®¿éh⁄’VR‡»aƒ)(âaQte— K–êAßπ6˚ôj“;«é~®˚ØÉló¢&a0~‚s'O)‘k€õñ∆XÀ?˚˝K∆«ß“~ ô~ô™wéƒ\WG„Yfáaﬁ	£!éΩäΩ,#3áUAò[›‹¥:ÿml∫»~±ZﬂK6Ÿ@F¬§k÷`∑$Ãπd∞Å]ÿ%r2ÎÀh˚¸\©Œü?gøØæôñ	Î°RC“™»lku•©±((	∆5Ñ°«˚ŸtÂùE∂(¬nƒ8∑¯› ˚nˇ{ ÅŒ"<œfÉ,··¨≥≤ƒ÷∫˝<yã@π@Ÿ©πXWfm:ò:töŸÅ’âœõ!ü≤SÁë˚DzIÇ«$~Ë·VÙ¢p±¶€ -L„zjÈ9©Ïg§≤Ø-7óŒ¬†:œÔ÷>GØ”ÎÎª
ÉÁ;9‘⁄ÙŒ•i÷Õ¬∆J£èπ«œµ9Nhﬁ _ˆ∏l≤ÛòYVUM\e-À’‡eµÖ[Ôﬁ∫"›[Ì∫®µYÊ¢˜w¥”’ªH∆FRöÒY	˛Xﬁù—µg£âM≥!Nó;◊õﬂ≤∞qR≠SÂù•AàÓKΩ<ÈRvö&õÊ&˙Áìï∂…Ù¸4⁄ì–:õò‰WŸ∆|Z„ﬁ]+$}o&eæ˚Õ’#ql“˝|)~ Ù∫ñ^3ï9§ÖÛg€+/›	Zß>8eh•Xk´)n†9Ò¨lÚÀ <≥‚u6Ër6ºFç®…1‰;ë∏Ïä¨Ë£	√™øï§´CÅsÅ∂.NH:h•*ŸZ¶IµÚxôµ±cqö˜-Yµ“A.ñ°rxÄïbå&—R–zyZE|jsÜ€AVÛƒ∫åkO‰7D§ú#¨‰à,åt@ÑáD;~S”/lbÈÕ»‰*m^…˝[KËŒfØ¬™µR∞ì˘øA°¯ãÔÕ‰ıì\_)ˇÉÆ±!—ÍêJá{4-ûˇTU∏±·©ZøK–
—IK˝Ú|Ó»ÆJπ14
&ã‡YÏU∂<m‰¶$âΩ2|bÁø3ßcﬁoÇ„ÔÀü’6√eïä„]kß—kZøÄ}ÃsºŸ»÷îBd£Ÿdq7âO#tãkR∑U{ˇ$∞”“! M¨6k„ÂOuã§jd˘ì±‰πJ Óì1"˙&˚ç‚<Îì™âOq;fÍFv[⁄¿Äj$\k÷∆Â¬∞T‰5Ô`ÂcòìJí&E∆{Äz7€=¡qŸpöîCdÈA9ízòÁÖè≠W≤R€pV≠ÔÒ>2ÉºÒ£à≥≠—m+X4Yiﬂçù√_ˇå ®APÂÏPÍ·Ê™≠d≥7iêç÷Ê≈9¸Ú?Ó⁄Ø©@%Ê™ÚVö€õ¡s1∂E!>eNî·ı»ˆu‰ﬁòxµ†Í ^µ7-‹€’"ÅbWdJÃÙ'È´É8aØ˘4ò≈¯BXÒÆ¬úNm“∞ˆ&tk™∏≥îÈõD.'Ã¸$”JIC|˘ àáîƒ&ı+xã±ì8„‰ÚéıNÉ·ëãÚ-Pıá…ouE∂E.S ÑRÿ\ıiM¢Hºﬁ-Q-ÿy˜/7Ÿa ”b«—¯<–	c~ÒVYh{≥)æ,
¥ŒÏÿîU“ŸGıü8%P–X◊[M⁄…óFâ;éÆ"Î‰T¶èt+"®tëÀ∫∫∂æÒ¯I◊v}í óv°÷ÉouWˆsßùDP|´Õ$Ô%•\‘;Ê†|Y‘æü$îèUI(YÁMí„˘s4˛%Â_íQﬁ[2J„à?T6J"ııöµ{…IÈß¬ ™ÓVf≤LπÚ8*•çD◊¡rûÀ ¶:v6ÑuäÏó›ÍÙóõk“vôØ1Ø˙ÈLÉjVÒÒzaØœÈ!ÔWSû#Æ˝∫›‡≈‡Èæ”∫ﬂ´ıUı◊Ω˜Ì„Óà:w⁄õy√≠eÇy˜Öß¥yŒ∑ñø∆m éNÁB1jËØ ÷ﬁ<˝Ï≥ˇ  ˇˇ ˛ˆpH