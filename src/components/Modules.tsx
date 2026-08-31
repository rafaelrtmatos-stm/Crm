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
import { custoTotalDaNota, calcularLucroLiquido, somaCustosExtras, isMaterialLonaAdesivo, obterConsumoItem } from '../lib/lucro';
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

function deduplicateExtraCosts(costs: any[]): Array<ExtraCost> {
  if (!Array.isArray(costs) || costs.length === 0) return [];
  const seen = new Set<string>();
  return costs.filter((c) => {
    const desc = (c.description || '').trim().toLowerCase();
    if (desc.startsWith('comiss√£o') || desc.startsWith('comissao') || c.colaboradorId) {
      const key = `${c.colaboradorId || ''}_${c.origemItemIndex ?? ''}_${desc}_${Number(c.amount || 0).toFixed(2)}`;
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  }).map(c => ({
    id: String(c.id || Date.now()),
    description: String(c.description || ''),
    amount: Number(c.amount) || 0,
    date: c.date ? String(c.date) : undefined,
    colaboradorId: c.colaboradorId ? String(c.colaboradorId) : undefined,
    origemItemIndex: typeof c.origemItemIndex === 'number' ? c.origemItemIndex : undefined,
  }));
}

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
  extraCosts: deduplicateExtraCosts(row.custos_extras),
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
  const [extratoFiltroTipo, setExtratoFiltroTipo] = useState<'todos' | 'entradas' | 'saidas'>('todos');
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
    const { start, end } = getPeriodRange();
    return realSales.filter(order => {
      if (order.status === 'canceled') return false;
      const orderDate = new Date(order.createdAt);
      const createdInRange = !isNaN(orderDate.getTime()) && orderDate >= start && orderDate <= end;
      const eventos = getRevenueEventsForSale(order);
      const paymentInRange = eventos.some(ev => {
        const d = new Date(ev.date);
        return !isNaN(d.getTime()) && d >= start && d <= end;
      });
      return createdInRange || paymentInRange;
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
  // Custo por evento de pagamento e despesa com data ‚Äî cada pagamento recebido abate a
  // fatia proporcional de mat√©ria-prima (Lona/Adesivo), e cada Custo Extra (compra de material,
  // frete, comiss√£o, etc.) entra exatamente na data da despesa em que foi pago.
  const totalCost = realSales
    .filter(o => o.status !== 'canceled')
    .reduce((acc, o) => {
      const eventos = getRevenueEventsForSale(o);
      const eventosNoPeriodo = eventos.filter(ev => { const d = new Date(ev.date); return d >= periodoStart && d <= periodoEnd; });
      let fatiaCustoMaterial = 0;
      if (eventosNoPeriodo.length > 0) {
        let materialCost = 0;
        o.items?.forEach(item => {
          if (!isMaterialLonaAdesivo(item.name)) return;
          const invItem = inventory.find(i => i.id === item.productId || i.name?.toLowerCase() === item.name?.toLowerCase());
          const unitCost = invItem && typeof invItem.costPrice === 'number' ? invItem.costPrice : 0;
          const consumo = obterConsumoItem(item);
          materialCost += unitCost * consumo;
        });
        const totalRecebidoPedido = eventos.reduce((s, ev) => s + ev.value, 0);
        const recebidoNoPeriodo = eventosNoPeriodo.reduce((s, ev) => s + ev.value, 0);
        fatiaCustoMaterial = totalRecebidoPedido > 0 ? materialCost * (recebidoNoPeriodo / totalRecebidoPedido) : 0;
      }
      
      let extrasNoPeriodo = 0;
      (o.extraCosts || []).forEach(c => {
        const costAmount = Number(c.amount) || 0;
        if (costAmount <= 0) return;
        const cDate = c.date ? new Date(c.date.includes('T') ? c.date : `${c.date}T12:00:00`) : new Date(o.createdAt);
        if (cDate >= periodoStart && cDate <= periodoEnd) {
          extrasNoPeriodo += costAmount;
        }
      });

      return acc + fatiaCustoMaterial + extrasNoPeriodo;
    }, 0)
    + comissoesLancadas.filter(c => {
        if (c.origemNotaId) return false;
        const d = new Date(`${c.data}T00:00:00`);
        return d >= periodoStart && d <= periodoEnd;
      }).reduce((acc, c) => acc + c.valor, 0);

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
    // ferro, tinta, compra de material com data da despesa, etc ‚Äî ver painel "Custos da Nota" no PDV / ExtraCost).
    const custoDoPedido = (o: SaleOrder) => {
      const custoMaterial = (o.items || []).reduce((total, item) => {
        if (!isMaterialLonaAdesivo(item.name)) return total;
        const invItem = inventory.find(i => i.id === item.productId || i.name?.toLowerCase() === item.name?.toLowerCase());
        const unitCost = invItem && typeof invItem.costPrice === 'number' ? invItem.costPrice : 0;
        const consumo = obterConsumoItem(item);
        return total + (unitCost * consumo);
      }, 0);
      let c = custoMaterial + somaCustosExtras(o.extraCosts);
      if (o.status === 'pending' && o.total > 0) c *= (o.downPayment || 0) / o.total;
      return c;
    };

    const custoComissoesNoPeriodo = (desde: Date, ate: Date = now) => {
      return comissoesLancadas
        .filter(c => !c.origemNotaId)
        .filter(c => { const d = new Date(`${c.data}T00:00:00`); return d >= desde && d <= ate; })
        .reduce((acc, c) => acc + c.valor, 0);
    };

    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const diaSemanaAtual = now.getDay(); // 0=domingo, 1=segunda, ..., 6=sabado
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - diaSemanaAtual); startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const inicioPeriodo = analisePeriodo === 'hoje' ? startOfDay : analisePeriodo === 'semana' ? startOfWeek : analisePeriodo === 'mes' ? startOfMonth : startOfYear;
    const diasNoPeriodo = Math.max(1, Math.round((startOfDay.getTime() - inicioPeriodo.getTime()) / 86400000) + 1);

    const calcPeriodo = (desde: Date) => {
      const vendasNaoCanceladas = realSales.filter(o => o.status !== 'canceled');
      const faturamento = vendasNaoCanceladas
        .flatMap(getRevenueEventsForSale)
        .filter(ev => new Date(ev.date) >= desde)
        .reduce((acc, ev) => acc + ev.value, 0);
      
      let custo = 0;
      vendasNaoCanceladas.forEach(o => {
        const eventos = getRevenueEventsForSale(o);
        const eventosNoPeriodo = eventos.filter(ev => new Date(ev.date) >= desde);
        if (eventosNoPeriodo.length > 0) {
          const custoMaterial = (o.items || []).reduce((total, item) => {
            if (!isMaterialLonaAdesivo(item.name)) return total;
            const invItem = inventory.find(i => i.id === item.productId || i.name?.toLowerCase() === item.name?.toLowerCase());
            const unitCost = invItem && typeof invItem.costPrice === 'number' ? invItem.costPrice : 0;
            const consumo = obterConsumoItem(item);
            return total + (unitCost * consumo);
          }, 0);
          const totalRecebido = eventos.reduce((s, ev) => s + ev.value, 0);
          const recebidoNoPeriodo = eventosNoPeriodo.reduce((s, ev) => s + ev.value, 0);
          if (totalRecebido > 0) {
            custo += custoMaterial * (recebidoNoPeriodo / totalRecebido);
          }
        }
        // Custos extras / despesas da nota com data
        (o.extraCosts || []).forEach(c => {
          const costAmount = Number(c.amount) || 0;
          if (costAmount <= 0) return;
          const cDate = c.date ? new Date(c.date.includes('T') ? c.date : `${c.date}T12:00:00`) : new Date(o.createdAt);
          if (cDate >= desde) {
            custo += costAmount;
          }
        });
      });
      custo += custoComissoesNoPeriodo(desde);
      const count = vendasNaoCanceladas.filter(o => {
        const d = new Date(o.createdAt);
        const createdIn = !isNaN(d.getTime()) && d >= desde;
        const eventos = getRevenueEventsForSale(o);
        const paidIn = eventos.some(ev => new Date(ev.date) >= desde);
        return createdIn || paidIn;
      }).length;
      return { faturamento, lucro: Math.max(0, faturamento - custo), count };
    };

    const periodo = calcPeriodo(inicioPeriodo);
    const mediaDiariaPeriodo = periodo.faturamento / diasNoPeriodo;

    // Produtos mais vendidos no periodo selecionado
    const produtosMap: Record<string, { name: string; qty: number; total: number }> = {};
    realSales.filter(o => {
      if (o.status === 'canceled') return false;
      const d = new Date(o.createdAt);
      const createdIn = !isNaN(d.getTime()) && d >= inicioPeriodo;
      const eventos = getRevenueEventsForSale(o);
      const paidIn = eventos.some(ev => new Date(ev.date) >= inicioPeriodo);
      return createdIn || paidIn;
    }).forEach(o => {
      o.items?.forEach(item => {
        if (!produtosMap[item.name]) produtosMap[item.name] = { name: item.name, qty: 0, total: 0 };
        produtosMap[item.name].qty += item.quantity || 1;
        produtosMap[item.name].total += item.area ? (item.price || 0) * item.area * item.quantity : (item.price || 0) * item.quantity;
      });
    });
    const produtosMaisVendidos = Object.values(produtosMap).sort((a, b) => b.qty - a.qty).slice(0, 6);

    // Vendas mais recentes do periodo selecionado (inclui notas criadas ou que receberam pagamento no per√≠odo)
    const vendasDoPeriodo = realSales
      .filter(o => {
        if (o.status === 'canceled') return false;
        const d = new Date(o.createdAt);
        const createdIn = !isNaN(d.getTime()) && d >= inicioPeriodo;
        const eventos = getRevenueEventsForSale(o);
        const paidIn = eventos.some(ev => new Date(ev.date) >= inicioPeriodo);
        return createdIn || paidIn;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    // Extrato de caixa COMPLETO (Entradas de recebimentos + Sa√≠das de despesas / compras de material / custos extras)
    const extratoMovimentacoes = [
      ...realSales
        .filter(o => o.status !== 'canceled')
        .flatMap(o => getRevenueEventsForSale(o).map(ev => ({
          tipo: 'entrada' as const,
          date: ev.date,
          customerName: o.customerName || 'Cliente de Balc√£o',
          description: `Recebimento de Venda #${o.id.slice(-6).toUpperCase()}`,
          details: o.customerName || 'Cliente de Balc√£o',
          method: ev.method,
          value: ev.value,
          saleId: o.id
        }))),
      ...realSales
        .filter(o => o.status !== 'canceled')
        .flatMap(o => (o.extraCosts || []).filter(c => Number(c.amount) > 0).map(c => ({
          tipo: 'saida' as const,
          date: c.date ? (c.date.includes('T') ? c.date : `${c.date}T12:00:00.000Z`) : o.createdAt,
          customerName: o.customerName || 'Cliente',
          description: c.description || 'Despesa / Custo de Material',
          details: `Nota #${o.id.slice(-6).toUpperCase()} ‚Ä¢ ${o.customerName || 'Cliente'}`,
          method: undefined,
          value: Number(c.amount),
          saleId: o.id
        }))),
      ...comissoesLancadas
        .filter(c => !c.origemNotaId)
        .map(c => ({
          tipo: 'saida' as const,
          date: `${c.data}T12:00:00.000Z`,
          customerName: 'Colaborador',
          description: 'Comiss√£o Avulsa',
          details: 'Lan√ßamento avulso de comiss√£o',
          method: undefined,
          value: c.valor,
          saleId: undefined
        }))
    ]
      .filter(m => {
        const d = new Date(m.date);
        return !isNaN(d.getTime()) && d >= inicioPeriodo && d <= now;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalEntradasExtrato = extratoMovimentacoes.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.value, 0);
    const totalSaidasExtrato = extratoMovimentacoes.filter(m => m.tipo === 'saida').reduce((acc, m) => acc + m.value, 0);
    const saldoCaixaExtrato = totalEntradasExtrato - totalSaidasExtrato;

    // Linha do periodo (por dia ou mes)
    const porBucket: Record<string, { faturamento: number; custo: number }> = {};
    
    realSales.filter(o => o.status !== 'canceled').forEach(o => {
      const eventos = getRevenueEventsForSale(o);
      const custoMaterial = (o.items || []).reduce((total, item) => {
        if (!isMaterialLonaAdesivo(item.name)) return total;
        const invItem = inventory.find(i => i.id === item.productId || i.name?.toLowerCase() === item.name?.toLowerCase());
        const unitCost = invItem && typeof invItem.costPrice === 'number' ? invItem.costPrice : 0;
        const consumo = obterConsumoItem(item);
        return total + (unitCost * consumo);
      }, 0);
      const totalRecebidoPedido = eventos.reduce((acc, ev) => acc + ev.value, 0);

      eventos.forEach(ev => {
        const d = new Date(ev.date);
        if (isNaN(d.getTime())) return;
        const diaSemHora = new Date(d); diaSemHora.setHours(0, 0, 0, 0);
        if (diaSemHora < inicioPeriodo || diaSemHora > startOfDay) return;
        const key = analisePeriodo === 'ano' ? format(d, 'MM/yyyy') : format(d, 'dd/MM');
        if (!porBucket[key]) porBucket[key] = { faturamento: 0, custo: 0 };
        porBucket[key].faturamento += ev.value;
        const fatiaCusto = totalRecebidoPedido > 0 ? custoMaterial * (ev.value / totalRecebidoPedido) : 0;
        porBucket[key].custo += fatiaCusto;
      });

      // Custos extras / despesas da nota com sua data espec√≠fica
      (o.extraCosts || []).forEach(c => {
        const costAmount = Number(c.amount) || 0;
        if (costAmount <= 0) return;
        const d = c.date ? new Date(c.date.includes('T') ? c.date : `${c.date}T12:00:00`) : new Date(o.createdAt);
        if (isNaN(d.getTime())) return;
        const diaSemHora = new Date(d); diaSemHora.setHours(0, 0, 0, 0);
        if (diaSemHora < inicioPeriodo || diaSemHora > startOfDay) return;
        const key = analisePeriodo === 'ano' ? format(d, 'MM/yyyy') : format(d, 'dd/MM');
        if (!porBucket[key]) porBucket[key] = { faturamento: 0, custo: 0 };
        porBucket[key].custo += costAmount;
      });
    });

    comissoesLancadas.filter(c => !c.origemNotaId).forEach(c => {
      const d = new Date(`${c.data}T00:00:00`);
      if (isNaN(d.getTime()) || d < inicioPeriodo || d > startOfDay) return;
      const key = analisePeriodo === 'ano' ? format(d, 'MM/yyyy') : format(d, 'dd/MM');
      if (!porBucket[key]) porBucket[key] = { faturamento: 0, custo: 0 };
      porBucket[key].custo += c.valor;
    });

    const linhaGrafico: { day: string; faturamento: number; lucro: number; custo: number }[] = [];
    if (analisePeriodo === 'ano') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = format(d, 'MM/yyyy');
        const v = porBucket[key] || { faturamento: 0, custo: 0 };
        linhaGrafico.push({ day: format(d, 'MM/yy'), faturamento: v.faturamento, lucro: Math.max(0, v.faturamento - v.custo), custo: v.custo });
      }
    } else {
      for (let i = 0; i < diasNoPeriodo; i++) {
        const d = new Date(inicioPeriodo); d.setDate(inicioPeriodo.getDate() + i);
        const key = format(d, 'dd/MM');
        const v = porBucket[key] || { faturamento: 0, custo: 0 };
        linhaGrafico.push({ day: key, faturamento: v.faturamento, lucro: Math.max(0, v.faturamento - v.custo), custo: v.custo });
      }
    }

    return {
      periodo,
      mediaDiariaPeriodo,
      produtosMaisVendidos,
      vendasDoPeriodo,
      extratoRecebimentos: extratoMovimentacoes,
      totalEntradasExtrato,
      totalSaidasExtrato,
      saldoCaixaExtrato,
      linhaGrafico
    };
  }, [realSales, inventory, analisePeriodo, comissoesLancadas]);

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
                   value={currentCompany?.id || ""}
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

            {/* Extrato de Caixa: todas as movimenta√ß√µes (entradas de recebimento e sa√≠das de despesas/materiais) */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 space-y-2">
               <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-[9px] font-black uppercase text-white/40 tracking-widest">Extrato de Movimenta√ß√µes do Per√≠odo</h4>
                    <p className="text-[8px] text-white/30">Recebimentos de clientes e sa√≠das/compras de materiais com data da despesa</p>
                  </div>
                  <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
                    <button
                      onClick={() => setExtratoFiltroTipo('todos')}
                      className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all", extratoFiltroTipo === 'todos' ? "bg-white/20 text-white shadow" : "text-white/40 hover:text-white/70")}
                    >
                      Todos ({analiseDetalhada.extratoRecebimentos.length})
                    </button>
                    <button
                      onClick={() => setExtratoFiltroTipo('entradas')}
                      className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all", extratoFiltroTipo === 'entradas' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-white/40 hover:text-white/70")}
                    >
                      Entradas
                    </button>
                    <button
                      onClick={() => setExtratoFiltroTipo('saidas')}
                      className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all", extratoFiltroTipo === 'saidas' ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "text-white/40 hover:text-white/70")}
                    >
                      Sa√≠das / Despesas
                    </button>
                  </div>
               </div>

               {/* Resumo do Caixa do Per√≠odo */}
               <div className="grid grid-cols-3 gap-2 bg-white/[0.02] border border-white/5 rounded-xl p-2 text-center">
                  <div>
                    <span className="text-[7.5px] uppercase font-bold text-emerald-400/70 block">Total Entradas</span>
                    <span className="text-[10px] font-black text-emerald-400">R$ {analiseDetalhada.totalEntradasExtrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-[7.5px] uppercase font-bold text-rose-400/70 block">Total Despesas / Custos</span>
                    <span className="text-[10px] font-black text-rose-400">R$ {analiseDetalhada.totalSaidasExtrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-[7.5px] uppercase font-bold text-white/40 block">Saldo L√≠quido Caixa</span>
                    <span className={cn("text-[10px] font-black", analiseDetalhada.saldoCaixaExtrato >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      R$ {analiseDetalhada.saldoCaixaExtrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
               </div>

               <div className="space-y-1 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {analiseDetalhada.extratoRecebimentos.filter(m => extratoFiltroTipo === 'todos' || m.tipo === extratoFiltroTipo).length === 0 && (
                    <p className="text-[10px] text-white/30 text-center py-6">Nenhuma movimenta√ß√£o para o filtro selecionado.</p>
                  )}
                  {analiseDetalhada.extratoRecebimentos.filter(m => extratoFiltroTipo === 'todos' || m.tipo === extratoFiltroTipo).map((rec, idx) => {
                     const isEntrada = rec.tipo === 'entrada';
                     const methodLabel = rec.method ? (EXTRATO_PAYMENT_LABELS[rec.method] || rec.method) : null;
                     return (
                       <div key={`${rec.saleId || 'avulso'}-${idx}`} className={cn("flex items-center justify-between gap-2 border rounded-lg px-2.5 py-1.5 transition-colors", isEntrada ? "bg-white/5 border-white/5" : "bg-rose-950/20 border-rose-500/20")}>
                          <div className="flex items-center gap-2 min-w-0">
                             <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isEntrada ? "bg-emerald-400" : "bg-rose-400")} />
                             <span className="text-[9px] font-black text-white/70 shrink-0 tabular-nums">{safeFormat(rec.date, 'dd/MM HH:mm')}</span>
                             <div className="min-w-0">
                               <span className="text-[9px] font-bold text-white truncate block">{rec.description}</span>
                               <span className="text-[8px] text-white/40 truncate block">{rec.details}</span>
                             </div>
                             {methodLabel && <span className="text-[8px] font-black uppercase text-primary-300/70 shrink-0">{methodLabel}</span>}
                          </div>
                          <span className={cn("text-[10px] font-black shrink-0", isEntrada ? "text-emerald-400" : "text-rose-400")}>
                            {isEntrada ? '+' : '-'} R$ {rec.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
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
                      value={selectedWidget?.dataSource?.collection || ""}
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
                          value={formData?.status || ""}
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
                          value={formData?.objective || ""}
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
                            value={formData?.budgetType || ""}
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
    if (!orcamentoForm.customerName.trim()) { showAlert("Informe o nome do cliente."); return; }
    if (orcamentoForm.items.length === 0) { showAlert("Adicione ao menos um item."); return; }
    
    // Se o CPF/CNPJ foi preenchido com tamanho completo, valida o digito verificador
    if (orcamentoForm.cpfCnpj && orcamentoForm.cpfCnpj.replace(/\D/g, "").length >= 11) {
      const { valid, tipo } = validateCpfCnpj(orcamentoForm.cpfCnpj);
      if (!valid) { showAlert(`${tipo === "cnpj" ? "CNPJ" : "CPF"} inv√°lido. Confira os n√∫meros e tente novamente.`); return; }
    }

    setSavingOrcamento(true);
    try {
      const total = Math.max(0, orcamentoItemsTotal() - (orcamentoForm.desconto || 0));
      const isContrato = orcamentoForm.documentType === "contrato";

      let vendaId = orcamentoForm.vendaId || null;
      if (!vendaId) {
        try {
          const { data: novaVenda, error: vendaError } = await supabase.from("vendas").insert({
            cliente_id: orcamentoForm.clienteId || null,
            customer_name: orcamentoForm.customerName,
            customer_phone: orcamentoForm.phone || null,
            items: orcamentoForm.items,
            total,
            discount_value: orcamentoForm.desconto || null,
            down_payment: 0,
            received_value: 0,
            status: "pending",
            observacoes: orcamentoForm.observacoes || null,
          }).select().single();
          if (!vendaError && novaVenda) {
            vendaId = novaVenda.id;
            setOrcamentoForm(prev => ({ ...prev, vendaId: novaVenda.id }));
            setAllSalesHistory(prev => [mapVendaRow(novaVenda), ...prev]);
          }
        } catch (e) {
          console.warn("Pr√©-venda opcional n√£o inserida, continuando salvamento do or√ßamento:", e);
        }
      } else {
        try {
          const { error: syncError } = await supabase.from("vendas").update({
            items: orcamentoForm.items,
            total,
            discount_value: orcamentoForm.desconto || null,
          }).eq("id", vendaId);
          if (!syncError) {
            setAllSalesHistory(prev => prev.map(s => s.id === vendaId ? { ...s, items: [...orcamentoForm.items], total, discountValue: orcamentoForm.desconto || undefined } : s));
          }
        } catch (e) {
          console.warn("Erro ao sincronizar nota vinculada:", e);
        }
      }

      const payload = {
        document_type: orcamentoForm.documentType || "orcamento",
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
        prazo_tipo: orcamentoForm.prazoTipo || "uteis",
        prazo_gatilho: orcamentoForm.prazoGatilho || "aprovacao",
        prazo_data_prevista: orcamentoForm.prazoDataPrevista || null,
        prazo_pagamento_texto: orcamentoForm.prazoPagamentoTexto || null,
        condicao_entrega_texto: orcamentoForm.condicaoEntregaTexto || null,
        forma_pagamento_texto: orcamentoForm.formaPagamentoTexto || null,
        multa_juros_texto: orcamentoForm.multaJurosTexto || null,
        garantia_texto: orcamentoForm.garantiaTexto || null,
        politica_cancelamento_texto: orcamentoForm.politicaCancelamentoTexto || null,
        entrada_percentual: orcamentoForm.entradaModo === "percentual" ? (orcamentoForm.entradaPercentual || null) : null,
        entrada_valor: orcamentoForm.entradaModo === "valor" ? (orcamentoForm.entradaValor || null) : null,
        formas_pagamento: orcamentoForm.formasPagamento || [],
        politica_pagamento: orcamentoForm.politicaPagamento || "50_50",
        entrada_obrigatoria: !!orcamentoForm.entradaObrigatoria,
        pagamento_posterior_autorizado: !!orcamentoForm.pagamentoPosteriorAutorizado,
        pagamento_posterior_data: orcamentoForm.pagamentoPosteriorAutorizado ? (orcamentoForm.pagamentoPosteriorData || null) : null,
        pagamento_posterior_dias: orcamentoForm.pagamentoPosteriorAutorizado ? (orcamentoForm.pagamentoPosteriorDias || null) : null,
        pagamento_posterior_condicao: orcamentoForm.pagamentoPosteriorAutorizado ? (orcamentoForm.pagamentoPosteriorCondicao || null) : null,
        pagamento_posterior_responsavel: orcamentoForm.pagamentoPosteriorAutorizado ? (orcamentoForm.pagamentoPosteriorResponsavel || null) : null,
        multa_percentual: orcamentoForm.multaPercentual || 0,
        juros_modo: orcamentoForm.jurosModo || "mensal",
        juros_percentual: orcamentoForm.jurosPercentual || 0,
        dias_tolerancia: orcamentoForm.diasTolerancia || 0,
        validade: orcamentoForm.validade || null,
        service_status: orcamentoForm.serviceStatus || "pedido_recebido",
      };

      let newId: string | null = null;
      if (editingOrcamento) {
        const { error } = await supabase.from("orcamentos").update(payload).eq("id", editingOrcamento.id);
        if (error) throw error;
        newId = editingOrcamento.id;
      } else {
        const prefixo = isContrato ? "CTR" : "ORC";
        const numero = `${prefixo}-${Date.now().toString(36).toUpperCase()}`;
        const { data: inserted, error } = await supabase.from("orcamentos").insert({ ...payload, numero, service_status: orcamentoForm.serviceStatus || "pedido_recebido" }).select().single();
        if (error) throw error;
        newId = inserted?.id || null;
      }

      if (newId && vendaId) {
        const fkField = isContrato ? "contrato_id" : "orcamento_id";
        await supabase.from("vendas").update({ [fkField]: newId }).eq("id", vendaId);
        setAllSalesHistory(prev => prev.map(s => s.id === vendaId ? { ...s, [isContrato ? "contratoId" : "orcamentoId"]: newId } as SaleOrder : s));
      }

      setOrcamentoModalOpen(false);
      await loadOrcamentos();

      showAlert(isContrato ? "Contrato salvo com sucesso!" : "Or√ßamento salvo com sucesso!");

      if (!editingOrcamento && newId) {
        if (orcamentoFromCart) {
          setCart([]);
          setSelectedCustomer(null);
          setOrcamentoFromCart(false);
        }
        setActiveTab("orcamentos");
        setHighlightOrcamentoId(newId);
        setTimeout(() => setHighlightOrcamentoId(null), 4000);
      }
    } catch (err: any) {
      console.error("Erro ao salvar or√ßamento:", err);
      showAlert(`N√£o foi poss√≠vel salvar o or√ßamento: ${err?.message || "erro desconhecido"}`);
    } finally {
      setSavingOrcamento(false);
    }
  };

  // ETAPAS V√ÅLIDAS DE ORDEM DE SERVI√áO (service_status)
  const VALID_SERVICE_STAGES = new Set([
    'pedido_recebido',
    'aguardando_arte',
    'arte_em_desenvolvimento',
    'aguardando_aprovacao',
    'producao',
    'acabamento',
    'aguardando_retirada',
    'produto_entregue',
  ]);

  // SINCRONIZA√á√ÉO DE ETAPAS DE SERVI√áO: Pedido ‚Üî Or√ßamento ‚Üî Contrato
  const syncServiceStatus = async (sourceType: 'venda' | 'orcamento' | 'contrato', docId: string, newStatus: string) => {
    if (!VALID_SERVICE_STAGES.has(newStatus)) {
      // Se n√£o for uma etapa de servi√ßo v√°lida (ex: √© status de or√ßamento como rascunho/aprovado), n√£o tenta gravar em service_status
      return;
    }
    try {
      // 1. Atualizar o documento que foi alterado
      const updates: Record<string, any> = { service_status: newStatus };
      const table = sourceType === 'venda' ? 'vendas' : sourceType === 'orcamento' ? 'orcamentos' : 'contratos';
      await supabase.from(table).update(updates).eq('id', docId);

      // 2. Buscar o documento alterado pra pegar dados de vincula√ß√£o
      let vendaId: string | null = null;
      let orcamentoId: string | null = null;
      let contratoId: string | null = null;

      if (sourceType === 'venda') {
        vendaId = docId;
        const { data: venda } = await supabase.from('vendas').select('orcamento_id, contrato_id').eq('id', vendaId).maybeSingle();
        if (venda) {
          orcamentoId = venda.orcamento_id;
          contratoId = venda.contrato_id;
        }
      } else if (sourceType === 'orcamento') {
        orcamentoId = docId;
        const { data: orcamento } = await supabase.from('orcamentos').select('venda_id').eq('id', orcamentoId).maybeSingle();
        if (orcamento?.venda_id) {
          vendaId = orcamento.venda_id;
          const { data: venda } = await supabase.from('vendas').select('contrato_id').eq('id', vendaId).maybeSingle();
          if (venda?.contrato_id) contratoId = venda.contrato_id;
        }
      } else if (sourceType === 'contrato') {
        contratoId = docId;
        const { data: contrato } = await supabase.from('contratos').select('venda_id').eq('id', contratoId).maybeSingle();
        if (contrato?.venda_id) {
          vendaId = contrato.venda_id;
          const { data: venda } = await supabase.from('vendas').select('orcamento_id').eq('id', vendaId).maybeSingle();
          if (venda?.orcamento_id) orcamentoId = venda.orcamento_id;
        }
      }

      // 3. Sincronizar em lote e no estado local de forma ultra-r√°pida (sem refetch pesado)
      const updates_others: Record<string, any> = { service_status: newStatus };
      
      if (vendaId && sourceType !== 'venda') {
        await supabase.from('vendas').update(updates_others).eq('id', vendaId);
        setAllSalesHistory(prev => prev.map(s => s.id === vendaId ? { ...s, serviceStatus: newStatus as any } : s));
      }
      if (orcamentoId && sourceType !== 'orcamento') {
        await supabase.from('orcamentos').update(updates_others).eq('id', orcamentoId);
        setAllOrcamentos(prev => prev.map(o => o.id === orcamentoId ? { ...o, serviceStatus: newStatus as any } : o));
      }
      if (contratoId && sourceType !== 'contrato') {
        await supabase.from('contratos').update(updates_others).eq('id', contratoId);
        setAllContratos(prev => prev.map(c => c.id === contratoId ? { ...c, serviceStatus: newStatus as any } : c));
      }
    } catch (err) {
      console.warn('Erro ao sincronizar etapas:', err);
    }
  };

  const updateOrcamentoStatus = async (o: Orcamento, newStatus: string) => {
    try {
      const { error } = await supabase.from('orcamentos').update({ status: newStatus }).eq('id', o.id);
      if (error) throw error;
      setAllOrcamentos(prev => prev.map(item => item.id === o.id ? { ...item, status: newStatus as any } : item));
      if (newStatus === 'aprovado' || newStatus === 'concluido') {
        const querVender = await showConfirm(`Status alterado para "${newStatus === 'aprovado' ? 'Aprovado' : 'Conclu√≠do'}". Deseja abrir o PDV para receber o pagamento e faturar este or√ßamento agora?`);
        if (querVender) {
          handleStartSaleFromOrcamento(o);
        }
      }
    } catch (err: any) {
      console.error('Erro ao atualizar status do or√ßamento:', err);
      showAlert(`N√£o foi poss√≠vel alterar o status do or√ßamento: ${err?.message || 'erro'}`);
    }
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
    setSelectedCustomer(o.clienteId ? { id: o.clienteId, name: o.customerName || "Cliente", phone: o.phone || "" } : { name: o.customerName || "Cliente", phone: o.phone || "" });
    setSaleDiscountValue(o.desconto || 0);
    setLinkedOrcamentoId(o.id);
    setActiveTab("venda");
    showAlert(`Or√ßamento ${o.numero} carregado com sucesso no Terminal de Venda! Clique em "Pagamento" para concluir a venda.`);
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
  const [novoCustoData, setNovoCustoData] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

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
    const d = new Date();
    setNovoCustoData(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const adicionarCustoNota = () => {
    if (!novoCustoDesc.trim() || novoCustoValor === '' || Number(novoCustoValor) <= 0) return;
    const dataFinal = novoCustoData || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    setCustosNotaDraft(prev => [
      ...prev,
      {
        id: `${Date.now()}`,
        description: novoCustoDesc.trim(),
        amount: Number(novoCustoValor),
        date: dataFinal
      }
    ]);
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
        const saleCreatedInRange = !isNaN(saleDate.getTime()) &&
          (!fromDate || saleDate >= fromDate) &&
          (!toDate || saleDate <= toDate);

        const revEvents = getRevenueEventsForSale(sale);
        const anyPaymentInRange = revEvents.some(ev => {
          const evDate = new Date(ev.date);
          return !isNaN(evDate.getTime()) &&
            (!fromDate || evDate >= fromDate) &&
            (!toDate || evDate <= toDate);
        });

        if (!saleCreatedInRange && !anyPaymentInRange) return false;
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
      if (fromDate || toDate) {
        const saleDate = new Date(sale.createdAt);
        const saleCreatedInRange = !isNaN(saleDate.getTime()) &&
          (!fromDate || saleDate >= fromDate) &&
          (!toDate || saleDate <= toDate);

        const revEvents = getRevenueEventsForSale(sale);
        const anyPaymentInRange = revEvents.some(ev => {
          const evDate = new Date(ev.date);
          return !isNaN(evDate.getTime()) &&
            (!fromDate || evDate >= fromDate) &&
            (!toDate || evDate <= toDate);
        });

        return saleCreatedInRange || anyPaymentInRange;
      }
      return true;
    });

    let faturamento = 0, liquido = 0, custoTotal = 0;
    const comEntrada = { count: 0, total: 0, recebido: 0, pendente: 0 };
    const emAberto = { count: 0, total: 0 };

    noPeriodo.forEach(sale => {
      const down = sale.downPayment || 0;
      const total = sale.total || 0;
      const isFullyPaid = sale.status === 'completed' || down >= total;

      // Se h√° filtro de data ativo, soma os pagamentos efetivamente recebidos no per√≠odo
      const revEvents = getRevenueEventsForSale(sale);
      let recebidoNoPeriodo = down;
      if (fromDate || toDate) {
        const eventosNoPeriodo = revEvents.filter(ev => {
          const d = new Date(ev.date);
          return !isNaN(d.getTime()) && (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
        });
        if (eventosNoPeriodo.length > 0) {
          recebidoNoPeriodo = eventosNoPeriodo.reduce((sum, ev) => sum + ev.value, 0);
        } else {
          const saleDate = new Date(sale.createdAt);
          if (!isNaN(saleDate.getTime()) && (!fromDate || saleDate >= fromDate) && (!toDate || saleDate <= toDate)) {
            recebidoNoPeriodo = down;
          } else {
            recebidoNoPeriodo = 0;
          }
        }
      }

      faturamento += total;
      liquido += recebidoNoPeriodo;

      // Amortiza o custo pela proporcao efetivamente recebida (down/total ou recebidoNoPeriodo/total)
      const proporcao = (!isFullyPaid && total > 0) ? (recebidoNoPeriodo > 0 ? recebidoNoPeriodo / total : (down / total)) : undefined;
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
        area: consumoUnitario * selectedQty,
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
  xúÏΩKs‹Hñ.∏øø¬ù]v2Ç¡áîJ&EEJïúëD6…T’¥Fñ ï @ë,öÕnñ≥òYçÕbzzëV◊¨Ã∆¶≠7wy˘O˙óÃ9˛ ‹Óè )ef,Så@ ˛<~¸¯y|áveÈNxv›]$œ∂»5âOI7H¢º<ŒÇ¢Ïy/\Ñ≤IîF√(ûî/ÆˆB√Cﬂê"*∑´€›tö$pÛÜ‹‹¸R]√$(ä∑¡8zv=Lª“ÑtN„À($e6È≠ì<>ï˜ßﬁ˚’¡‡99Î„ì(Ô=H]ñΩ"	 ®˜ı„9Õ“≤wí√¯/c2πÏ=&ì´ﬁ…≥iFaoı2!≈(≥˙1H„1æß§H‚?ÙNÛl‹c’ü&—%âÀh\ÙÜQZF99&P⁄8∏Ï]ÙﬁÉdÿ]Œ°∞</~ ≈xÉ˝Vå;KJ∑#EûìŒpöYﬁõd1-|îùG˘F’«uËc0,„Ûh£Ä™∞ó§ÃÉ¥àÀ8K{Aít»Èt§zÎAﬁí´ﬂ,&A*çz{÷[Èl]KÌGEúE7õÀ¯¥Ú˛u≥˘ø˚Ÿ‹EÁyñ‚,ë"˛	¶sÂ…ç\O1 „Ùáﬁ†Cñ∑nîùLÀ2K%⁄ã8ÒE˝Fˇ œ&¡YÄ=ÌZâJ©J&á¡`(ÇçßzüúdyÉ;@Z¢£9	rò[¢ÕE’≠Õ?J][ﬁ⁄\f-Ø«gs9åœ≈◊jÆóˇâ'‰mp≥~êZ?n¬˙tPjÎ]‰¡õv1∫[ÍÌ≠ U¡ü˛cJ}Ù+˝ 7xgNƒˆ÷ @%⁄?Mã2>ΩÍùDÂE•RﬂÍ>ò’mbu3∫!cX'0Üçí«‚VQyŸë©Ë˙Ω≤"ÄÕÑd·<J√`aâ$¡Iî¿˜„(á“ÉÑº„?ƒ√,› G£l2â”≥¡πY24äÅnrxZ*Ï[∏w˚Ôxì¸él√¢*É¢*Ú[˙¬ï•∏~¸qIÖΩdw»2‚ßeVı"ª¥SD˘9<SHÂ·≠€ü•◊ˇ 8YJ»Ú!LIZ*eÏÁ∑?◊wY)Ø‚$:ö‰Q£(*-≈¡£@ˆji;“Ω∫¨cX8∂¡π&”8T
yâ˜nˇJ•ÁA1Zµ5$âë<ïv‘∑Xﬂ¡Df˙∞JÀn7X"'åa(e„Œıhûøâ“)ÙÍ4>[$yTNÛîæQûÑÚãZrπMûÂç˛iúÜ{∞]\v«X√∏á‰Ÿ≥g$ÄãñR^xór“,[ÕZø√Úﬁ ä§_m=–ﬁ™[1>÷(≠ß=«o”{¥~˘˜õEËP‹§[Skå˚Ú2a›&gIv´7ÃH¬B&]vö√,*»¡!"ØÅÁÿ¨ †¿ßvﬂ-6⁄≠Õ§Zß˝·Èôqµqáv7GûUÉ%¿ò?Çø˝Û∏àOí®¶” )"ı•ΩÎ»≥`ÛÃTü«·G ∂”àLãiê«âäI4åOëuŸ¿—+9èH9≥fﬂMÅ¯ü˜„bõ>Ìc7`ﬂœ.¢ <áÌ•†Ì∆¥˚˝8ÖÂmËÚ~ª:ƒ)Ûi§Õ˘8òà	W≈4ækÉ˘CtıÏöUx£˝§	ô∏°SŸÀõHÄÇÙjQ≥åÀ$b≈RF°ˇÓ&ÒÍ4•8±GIB]µµâM/NAÃÇiúõwµO•Iˆıän¿BÆáxS|KŒò˙˛Î…ÂY0ùN&∞s†‡∑√`?ÎïLxoTw.@Õ5Iè–ùdïa‘K3‹ê5˘Ø@®DÔ(fÇ81…A–ÕØr3|Â‚%ì&ÈèLåX‘©G$ëäﬁÍhç–&oK˚yì6
ñ≠©û™“‚xcá°,¢Äƒ’V∆∫RÜ(`ºqíd0‰Æít©∏~7Nì8ç@>Æ©Œ ì¶0C çÅ"‚∑$0É¨f^|’˙iòDoÇò–—U:Tg$åã ÿ[¯Ï:.W 8ıæ⁄
¯-
∑K†üè∑ˇgR˘¿xßC˜„üÇ€üoˇ-€ _TèıÀÏuÜáî„xï–Ê≥Ó¬§ÏΩ8\Xº˘HPÍ©^ŒIpñÂ¡ÇZØs∑Ø·ãﬁS2Çˇ•%»db}!U™Øüj<¯í$Øã÷“
Y–5„˜∞z â∆∏ˇÖÙê«W{U¸ +uyu†Æ/euiîxùÊQ1⁄πÀbÌF”∫É∞gtƒ—∑ ©∫≥x£Æ]_w’ÈœV7$dÁ∞?ØwûÖa Dô—àÅá—»€Qæ ;‘Ô≥õ4∑åΩB≥?â“.› ,˚EÁU4≠ÌÒe†≥)Á“Û†,}¬˝Á=á·hN:ΩÀf‹JØn∆˙:;€üñ“‹/{p*£‚_Zœ™√,!„êmóyv!Gp8ƒûiÙ[ï8ÿµ∫SÒ3†Nõj@ΩÉl(Õ»8;Å
úƒ^p"ÀCzHÓá2õ¿±C!ˆè»ó@9·(ìŒﬂÊûÅ$Ω˜èˇ¯°vr=É?–Oˆs ø™◊+¯â=äDÒ˛N£”Øákà:H¿WPêX%ì¯áûÁüÄ‘{0É>PçS5–é>ÈL«êM»†sΩs∂ô”WHø©CÅ3yÆ´Í'W≠≥µ†πœ	ï∆™±,G>˛sXDµÜmﬂQÊß(·]Ú§°ózˇ%AîÚË∑ïAª`¯~EºR›YÉ;ù≠√‡4 €yYP˙ƒæπ<1ŒÄ*ÅÃ=5k÷©ô¥ô_wYÁ˛a0XÈmø>¯v€“!∏ÆáA^ˆì(=+GpÇ4˜•Å∆ΩEπ™çfòDA¸¢l¨%˘jô\IËœíPÓkµ|5†˙«äÌØH¢∂º»á<zP"dá˘Ë°mÊ©‰Ô≤YUµù˙ˆ®\|;}è't;eÃ‘˛äe“¯dpï[o_ôó∞}eô
—ÅFÅ≠eYŒ ó?»ß6¶ÉÄR§a´ïÆÜº¬ﬁ1-Su#Æ.∆ˆKÿ‡^iyÒ~~^eƒ≥∆6#FXÎHâœóÈLãÊUÿëπøÅÊªXEæiïÿ˘Ωﬁt°l6Ú>RU:m[Qƒ¬¬˚èmÎ‹Œ√ÎwFßÔ¥Î∞≤)YÊ-|∞s?$ ¥¡Ï∆≈Ê¶|$”®ù≠≥~|•ÙÍ)k±nM«Œπ‰S ä.À?Æ1&∆4'É˛™†.«ÿ≥k7*Ü§w¯Ö°∑p⁄|ÖV¬ÓÍb?è&– ®ª–_X"K∆ÂUAÀ⁄uºMõ±ìGa\nO&IÖ>Ë'–W1‚Ù≥q∏´_ÊÎù¸ˆ/–≠Lo•£ü~º≠b˛6ZiåÁ	.;1úkóÙ\B?Ø√ÁÜe∏“}©Z8“ñ`<DMh:Ñá#áU‚äùgp6óG+)≠≠öıFrÅ-RQy5¡}»æ◊õNËG“j}ìÖABèÍ®[vêJãW∫:“÷µfS«™[óJö<¶≠D ‘Ω‰)]à‚À—†óï.#„nYùL%òÍì⁄Ü-Û‰Z· ∫≈∏ñ)Â'5óßÏó¨ﬂ˙Z◊ÀÎÈi›0E2˙Â¬øf°i4HoqŒ¸h–Ã»5'•®(Í~9∂˚ 	Ù‡"Âä¢;3Ô∂œeey≠;g}áYÍ4t0Jçî/Zã˛à€Úò/f›˝®≤uóÀÇQk]7¬-©næ¬≥H—êú…Ã≥&9>ÔiÚ≤∂$ïÂ*V‰È4±≠IŸ
Rî÷5Í‡ÃÚÒF=,¢∂iÜwaVÛé|Hã+õ¶#‡œ©ÕwQ^SÿZ~ÇµÄTKhΩ®µ:ÿ}á6R8XKº;.åUí◊qQ.˙ju$≠€ò?≤´ï˚¨Mÿ0œ&(/‰∏%ˆË/ÁO™cLß™Â“’X|·«xDôS;§ü!ºµQdÃüÑøv≠íèhÊ!ÂsÉ]Ω˙ÅÕv∂ÿwj\t/«6{_OUÉT1*ñ´‚yµ(§6∆.©øàΩñ”&!Õ5Ñ, ≤K[»S%óæùváF"„⁄Rf˚¨N±‚´urâQ√∑Í°5\göOa 9ÅÖ1åúzSEO}UâsTg8ú~Ì÷/™ƒi%‚ŒV•,üÁëÛjj∆Só&Lj⁄°πÂÍ`@˘˘QîD√wê¨ ÓaÖ;zB©88	‚ÀåLÇ>á1>âñD∏ï0Î€õj™aòçä¶ç+f	g„^1Ã≥$9AπΩ@Ä>≈÷kËÍÚ‡°π]çAƒjCœã.Æì%Ù≈1∏:i˜DÇé¶'Ù`Bû—Ø˝ èXØÙÛ$èá˘'È˛˘«iêÇluC“|P¸®˚Œ(w"q
Ôbd©ütÎFWQâl-?Ìg%xZTUöÃ~?π<ˆivÓ@≠%zZ˜≈iÕO≈•◊cﬁæ¨K–t V∆sÖ+ú%EÛ•ÓÂ¬Z
ãñ◊"æØWJ-ﬁ«∂hÛ∫VhÌÊ“oZ ≥s)ÂÃƒ5Œ˜µ∆~ô¢Å$0µ H’K¯∑åàQL°iN≈å“ó7∆ KhÓo’Èu∆N”Ö97}øö°jCÎoÆe˘ëtø®o∏èYd¸ﬂˇøEz÷≤Ã›üa®›ö5C∑¯°âp∆xbÆ⁄Sê©∑æ·˝•ﬁÅπÊOR^Ã:e‚(ÀuìÕ^ÃØú‘ªvˇs„Rcû{ÄΩe≠ˆd'¸Hî8•ÊŸ´S,ãñ∂ˆ†˝l9n7Èjó¶®úNB®œŸˇ\^°wÙzFœB,“†\Ù÷†_#˙/√Eoˇå0|âuûÿ‘e˙æl‹ª€¸ìÜ„Üì¶.Õ`¸’.Æ}€çaÎú∆˛ØŒ≤Ê{˛€ñS{exaÅ	D I“}@∂4°eqÑ<!ˇÍÈX2><)oOQ+<)˘0§ÏΩ[êô)¨i–Ÿ?)P+…"Y2ÈU≈Å‡ÑÒxxpÑs™7Ì©üNµã‡"MÚ0É-æ–ÁyâI3–ú(?ÜAVi„YË$ öF~]•&·èO˙7öÕ>´ózAcÏ
6∆èÄ¸9√çy¨%èåv	áôˆÇWÔ‚CSó]ëÒ'†MÉ<˚ú‰—ÊiTòL∫T{≤ACó˜Á§V0+]˚ólÏ~Gó∂Æ«≥≠å˚?™sÎÈÏ’V=⁄Rq  À]ÇúLÚËˆÁ¨„Wßˇ¬pŸ Á\kZëügïô•Öq”QBhÅ÷ü™Z†'ÉJîœ¶∏G;°ªºáCù≈>+b\ÁUûçQõó≥8÷§X∫¢0ò9≈!æ≠âÂ∑˜ €ôÍ≤ykK-Òæóñ«£G{ØáÆÕb’üˇ¨9Ü¿c•q:ôñ˝=GoŒã%Q
*ˆSj¡*ÈYTÅ7∞”veø*éJ¢>0Ó≥®Ï”:ΩVGñæ Ü”¬&ä˙.2 ;FYFπ.∏E(∞˜§]nêañ/hÚ	3î.qÀ
x<V}±ﬂÔ˚,ÂPE}∆2Í=ëL4UªΩ
ã\÷ô†È√z¶“¨zRW74^räCπëMK4#3?vK©|›gÀo]J≠”“æ*Q⁄ıu3≥À`Ûá_ıã÷ˇòlO·_Ü⁄·\3)kóÑ“Ó"=C¯Õ"jÏ—^Ø;çÍZ	hõÎ≠™Æ=⁄)^ÿ∂'”§h1m;Ñ'ål„Ú
ñCg=kvÄ“áe:‹àõ [$/?…Ê©˙Gã"⁄/Sê€}T4ÓŸWíà“mºÇŒMÙF@ä,Õrds I‰∑ˇä(oÉA˛Û˘?êß!ö…$GëÇ˛íSó(˚Î‚πf	¸uk{}œOV«V≥“åÌtOL%…q™2†0OÉ2Âì—WÉ*ÓWY‡*œµRÉmV]˛˛¶fnæà0>¥íñ∑†QÙÊ˛È©rﬂŒê]*Qèı÷Ÿrí`AˆSâ§‡ÎÈÈ]Ô5^„æyE[¯"ä&M¥©k¬ë±†#ˇ˘ø˝ø‰ò ∞.∂Pp)¿»úg√€ˇJ≤Èy<%9â'ÅõÖ‚ÄÁq"ºz˚ØÉúNSÍƒíÜŸ£ÿ÷hµ>ªt∑…–PØñ¸ Õ:ÿLÿ∫2†Ò1¥$cM`±˜Kà>ÇÁËa\¿3Ní√ﬂÈ∏^Îy$÷!î˜=„¬¨§MÄMœ—Êûçg]QlpÊ"¡ÎÖ∑YâH.T<X qJ.bòƒîŒÂü˙ÉBZcŒÄ-ïQÿtVko;â˙yÊ◊T FÈ∂{q"l5yFÇã .’˛‰∞˚¢<®∫’u»ixQZú‹˝&éè~£ÏÇ~∑kŸˇ#¢@AipùQ7Z∂≈#≤çDç~cg4∞:a˜»·A ¿€»VÒDyX‘õïÒ=r·Õ)T6Ñè˝Öñ>›êÑò9ª ßéˇAß±úV›'’ˆ	≠Ú/ñ‡`C7úùdË˝rÅÀ'¢”ÖüRu†pS¶åkÔî˝W;ü©m(ÿzπL+^5uâ†ò¿Á¡1jˆ`80dµ_≥;_:≤"ñzPﬁ„Vél≥	´èŸ[1fVˆpo¡•p]7 ¶ÃlIó˘}4|wì,Ä	Q ‘gV∏H·Èµ≥ı*(aa–ì:˘6˚S‘byµ4ß°˜d`ù-THû÷U`∆çäo≥•·È¯UPî›¯,.ã≤∫ÑNÆ∆_ÎjÚÏßY√-Âûn_éô≠°±ÁÙZA–®«“a+vÜÖn†~¯1^ÅñA’ïY√·/V'h‹‡ü9¸˚ñ®gÎ’¡
#¶Ü+„(
Ú·° á3Ìfá*TiÒH_sª>O‡á–QÔkf|_±û≈Á√„ŸC:ß√“ƒ#7î#¥:∏ò)¸ÔüßpáW·˘WÌ";∏ïó(Ür¢s©¢ƒ◊Ã]ae•ˆu™®åK•ög∏ıÅv®{")ﬁ·É’˛Qõ8="ÍN«ÏmÛ|òkŸ<H¶Öj√}<óR›Pê3t¡U‹<õ±í˜´‹g§r+3OhÕ¨≥áÔW˚óÃc?Õjo}ó/˛˚ï%d„kKd}â<˛@›Úl¬!jj_:+Ò«˜CÕÜIÄç˛>?∂®Zg≤ZÓÜ4º,*4ê∫l0Ù÷π–´®ªAO?∂∂ò≠Î∏KgÕŒsk∂a≤\>ÈÌ∂£≈ôU◊ﬁÒ‡ˆ}è?œ∑>Èï‡§»í)u=?-)∂%L,˝ºF—◊WñW	C»¶#{EoHCΩÜSRC0Z¡ê®5 JÂ‹U–ÊYÁ¶ai¢_È™ñ%ê—æCâr$ ÆuºMÑxc;ÓôM¬
Çø+4‘áE∞Â <pësE6‰¿z2˙∫;Ï90ƒn…Qê∫E’ëÅ∂aQåe/æ;⁄Ÿ>$˚ﬂë{€áv€óqÍÌ§kãû∞F4N—◊&jûxÇ‰1°*1‘r#6çT´àa{ÎR≈Mê÷-©æv8—Ú–4<k£›ºÃ¬¨0E”±‹Ê√GQÓˆﬂlÔìÉ√˝›Ô‡ÔÎΩ£cìúzÁ(5AÁÊ¡’K7«¥=∂˚mﬂ„‹‡∂ÀKsoæ¥—.Mw]^¢œ ﬁaxúQ˛æs/qŸh0ºÄ_R†ôSã¥…?hÑõÉBèâÜ˜°5•`é-“çïe'∑è@ØñÖØª=•Lè¢¸ŒÜ¢‹Ÿ™fñ∆?ytx⁄C©˝ﬁ+ˆœRn‰ok≤sÉ¸´ªWù6W8¨∂ùb,uvòÖ∆¨˜‘D-®¸%Rµ¥1W«œ €Ì˛O‹Õ˛]óc F≥úÏMi¡bÍ"1$4t÷Ì¿6e^ÙûPUÈYìG´Ω6£î}Ù¨F˝©È(K˘>‰ÜÁK≈˘–T‚¸Ÿ"Zﬁ±Ï“˙‹Tj	„â¢+2;ÜPÂW≠ò≠·Wz†@a?ıfAUÂ∞OLÅ¥N®KÂŸ’u´ÏT•°∏#/√õ";∂ÉáuJÉ!?§A·¥¯„l_TÁÿ7õ€À®r)ëi‘¶◊y“∏Wr?’≤˙˚’ßU\ä0E#‘≠BŒü4ßÅ∆‚Zo ‰æòHNŒÃAÅmwSœ%cNÓ‰Ô∑i)p’â›ÔQ¨q/ìt¿%=“/†#√ª˝◊«p⁄Ÿﬁ'˚á∑ˇÎˆõóoè˜gBoajc^å'bÆ∞Ü¨¡;ﬁØ3ç 9ßf–òbœ†„|2¬4=$BxÜ,OÉ63Iãè†õ$KÙixÜHM4/ÀòÊì$2sˆS≈0ÿâˇ2ã™i*Ø`∑e¨">K—X›£–ä˚E≤âù˝∑«á€gçÀ´„£Ø3î4PßL@wÍjıK
Ë™âÚvØfﬂ:ÆPÜ—ê-Ô≈g+Õ°ÂÔ¡äLÀÓ¬)º√Jhs„0ÅÃπª¿¥*~ØÔJﬁ}úœÖ‰oMﬁ‘Ω!π7T˜ŒÚ‡ä≤˜_*ØoMô0ß7Ä¶˝r¯¸´Ω∑€Ø˜˛X˝ªóow∑ÈL}/g»hò3ï˘ƒD‰‡¥`˛Ò¶ﬂ3`ΩÛ÷¶4ãPtıYO
SÁÛl$Ü1Î!ÒÃ=·Ë˝¥:T?Ò“Å´0Ï≠n.Ê‰7Ê¿öük¨ªu{Ú÷…IØyfﬂ4+(F´MzØ—ØWË◊LŒ≠ÄÆ5ÖVMb≥ÑÜlä\™z[$Nÿëπq!K…ZO—|·XAì¿‰w§Jöj–—åVc’Ôâ±∂†˙&SvhNiV=ˆ!\Sæ‡Ñˇ)∫¥,!Ë3äWatÖY°†≈ùSúa·1Cø:B≥:Í~2p;mù>ª¶˘ò
îƒ˜Êatz√›éO·^vßa4)üu˙óIqπÑˇvöå≠#YmŸ¡no<…ÚÚ]U∏ëÏßE9u+
&Üïf‚P"“\ñ¬ˇ“[ËzﬂÔ˜0ªììÉ$H„d§ßßcó&e6«©?úÊòN˙yàvçºÛÛeì%ôÓ“*¥4%#_¯nídAËHIßOéúöéÖãÈπÈx…÷=ÀN@‹—ÏÂ•6’&ÈJõÈË≤&›?—wôE3
Ìæ‡‹Ô71Ÿûªõ]§⁄‘Œ4K◊‚¸uD”…},«H∑iñN6_∏îK¥q î⁄‰ÁÛ èÉ8Y3ò€¸ ˆ‰¸!â‘÷ã˛ú⁄ƒŸj“¥a«ŸŸY1ØØÌ§ë¸ñ]VºqîQº2—Ø8k?ß Ú@"p '«Ë‘Ä,Ú£ Ë7-—QÃÕ‚Gsc7ó_8ƒÕªM®äUﬂDíínÆ7OéwúYÍòÓ7´/¶…oÇ¸áÌ‚ hÊJfómRﬂ∞âÅ##¡YF∫∆iæY¸Ã£/ﬂÕG„œ9˙41Èlœ3ä˛bÜ˚W¿ΩP{Ñ£çvÇŸ˚%√˙â∆@ÔE¸rF]%rtQ‹YW≠
üñ¥wa† à≤‰«¸ròL„úTúûr˘˚¯MÉÄ–ôffŸ>aÅ~ óy∂Å)6qt¸≥89ÜŸç¯˛í«öÿ+§•ñøﬁ˙É’F!Ï±¢rdG-q‰‚ﬁ•4@·4n∆K]wﬂ7e#áp$°)mñM?ﬂ°%ˆ{~S†oqæi:\Ûbÿ!Â˚0‰≤‰—©
ì5rˆ≈¡ˆ˚!£Thcà´Çˇ ÇeT6À¸@‡i•ª0SrãÒ´Vﬂ7¢æÇÜa}√´RÑ˜ò´†≈I–~4†nÅ‘!∞˝,PD%ıwqtqútÒ≈·ﬂÍÄ/¥W@!ÙSúÇ(òíN‘”<¡ŒK˘∂*ßt±hÌÈK‘#•l¶FK3™20{Ùèîë†¢%éF´7øP°£ˇ¥Iô^{˚€c«’\TÀF-πaZåº	d‰>Õ¿
(˚î¯Æ∏ñìéÓodcf/Çúq0Ûz¨{ÉD≈èS`j∞ˆÅ›§<LÙwu2!v„œú“ÖwTÂ¥†N f 6–È=ï”ë'À´¥D&G»y¯·jˇqìÔAüüO'Yë:⁄tr∂:(åà„2¡øO]±w^1Ó»AãùñcØÅãG;Esdz®5gÉ®®yé1ÏÅÅG'vX’^¯äy]S‹`ÑÍ?-‡`aÒÛ˜aeïÈN”YH
1…{_1é%«DHK[j/k≠ƒJ‚ nn•çeVM’»céÚ“.¯òåÅ*Æ-µ€∑ôÑIÉ>Ê¶	=ÂÛ)e.öY5-+#é≥Ï\UMEUM	¶∫,R˝€ºLÌ⁄(õ⁄¬å`”∫®nï>Æ‚@ÿ;◊Î?Fæóﬂ˛51áQ^d)œÁ¡≠È?‹œ∆ìòbÅ˚Lc≠r¨]x
a.›<´é—˙V}MÁZvµ}g◊ÿıÏ’¢ïôNïwUå$¶˛’L¸∂(
öÕ4mF√4´xU÷|t∂ÇÚˆ/6{ÌΩÕ·±—üÆeè≥Êo∫Ò[ö¡ÎÆ∂0ﬁ^Qk4˝úåºZ4+ÁSAÔzÒÔ	Á2≠l{¢Á–ıÅq™’zÑ“oïuØn∏≈ÒπŸ7z‚8∏ïå¨Á”£,/±©π ﬁÍs±@úÌT˜¯wÉﬂp,ÎÎñrﬁqAÂ:ÖDÒ8äÛåM¬,hıÆ~˘‹≥'Ì)&™)Ò:H∂å–Êvûgh<˚ú∫ﬂ¯M9K Ñ}ÊªâÂ	ˇ≥gõJÎ1EFh‡)6∆ã;¬˝ÆõÍ+zõÈtáÇËHZ¢7‚^Q©á^W¿≥ü«°IÌ$ïóf˘X—âΩ7∏ã·X∏°AªRØ˘wﬁ¯f.ÄÅ?ú€„O›éÓT≈tnQ1·ÂT3Q?N|5fAj∂5„≈ÍπMQ¡.Od`ì_¡˙˙JÖhMéÆ°õÿë Fj˜ËJ9üQyT´∂<4F6∫e0mjÚÕsEYdjs9÷ô—åNuæü≠m•ú=Êıó‰Æ,
Uπv√)]>âÅ&¸É¨ﬁî®˙∫ks≈f8Éî…∞ä˜'™hÉØ–˝˙v\›5•/jz…3b‚=BI=˛^»ÀL÷Oè…6ªg^‡™~˚{‹«N‚–†·&á‚'gA?NcÑñﬁˇg~ßµ˛Ëliı“[ŒáA:åµ∆ùÍûÈ’Mün…º‹µâ·æÔsO $æîöv ﬂú˝	„tD•Ñ˙ù]q´e Ú2»æaéJu0Úí!øì›€ø–} ÊòxƒR–N~˚ó∞µ$ 4O£<JáäÊòﬂø˝ØÙg'Y)≠x¡n∏ªÄmÚXi=ﬁ£(Ø6¢∞PEéÎ=g”øõg‡¡)Ã¯Ê1øú∂∫√”≥cºÉjª1<PYsL?f*=(–Ùö0`£ã Õ„-”3%ı≥Ÿ ]Z0sÔÀ‚–ÙË0âÇ|ÉC™Z¬$C–R`¿È6YóH:EJc‚≠Â ~¡º©π#Â™{^=I˛L∫›Iıï6K|nicZpRŒ£Sli0,˚qˇ‰O0\õﬂøyΩüøL"\Ù∆&üî©ıUfvΩ?LÁ≠yíQ*†hÖlLø°J¸˙€Eñ#Òï‹¿ °“”2™Xé·,E:∆ˆ∆ÖƒVì^#Ò¬Ç’“4Zªhå2ú≤òKñÒ◊KY+QÊ9}û/´˛)lÍ›[Æî2
änÜ&Œ≈ÁL™¥∂A>~q›®ˇFq'¯h°√jLvp›ÿ«Ñ∑ò≠Æ>E‹!œü√˝≠'TÕÌÍK∏‡tuª≈tºD2&sO« ˙tÎﬁ„≥hãKøΩıå‡⁄Ñ∆ªÇ–0¯Ï÷¿÷;jç[J¬ÿç&8ÒPí˙bˇ,*_†∞‹Ü)˝Åïv†f68Hˇ]N˙X4Ïdâ?˝éó˝”;Ù3¬ñ6‘º2∆¬∫ì<¢á©G¯¡XŒçÈ¶3œº’\Xã¬‘√ùÕpÕ˝n¨≤~KrUõ{§[u∫´	≈˛0?ƒÒÂƒNr‰ãkâm‹Xº+ÒÚ∆˝sh¢fYw+ ÄﬁnB£0ßsÔMÉlYx£∏Zœèupõ?Ç≥BñBU;˘ÍõÏ%[œ¯Ï XTOPI{ñ-Ö÷⁄¬ﬂˆJµuÉ_÷Z¸Å§i¶FcJL„,Õ:¢j∫¥WΩ3äŒÛ,Eùö1ΩM/* ≈·t[ÛÑ%¢Ú„NûïWÁÈ¿~¿ÎnÅ|ºn≤yê[Ë«<Ç
0!qÉô9ËÆ‚=\êr¡ëÂrw24ééúNºh¡ç‚…ˆﬁ+∂E8üg»6<]B?NÅ˜~—ÑÇΩ™ÿy`~Í.i£˛˜¢7A9ÍèÉÀÆxüÓKKdu6lGÆòdçêu∂a5S≠÷ë¡¯Ò'‰ìÉåÖB{#åAŒ£Òá÷®ƒ˘ ⁄|íV€›Ò sü≤‹ƒÆ—ëÃôà≈‰›Ñ∑zWøµÒIo•|÷.[6¢µ8tt —ÙåOG¥x<^w¿§eºö|0ÿt>Õx£ÊúåLÿ≈©y≤œ’⁄˛*4ΩÆÅïvÑé∂_JÉπÜ∑!Ï⁄xp”±O w{ÓG]º°÷UÍ…”Rå/{k-±Í◊ÚY≠
ßæŸY‚B @Îg$<Ÿú‚…∆ç”‡ü•ûz&D•VçSáU£æ4˚6û…¬¨ŸÌÃúÑ˘ÛÛ#ØåŒ“ú~&ÑWÎ¥É˝5ƒ¿Ÿ”⁄ÛNº≥é—#˙Ød∏‚ªw´MπΩ™Sg¶ÄüƒÖò¿ø6}	€ÏjgáÏ∫ñ⁄&ä≈@¶\ ‹4úè$\uWÇ∏˙Ú%¿ú∆«ŸÀúìÓqkõy{Ôw”k–%•’i•¥∫Ø)KåÏ‹z¨â[â∞q⁄9ÃÜST˜O≤j6#Æ=ëéAkk∞|8ˆKKHÚµ…L“µmÓ¬(£õ`≠g/f Å≠tríyà˛
∂G+sI”÷j{•6ïàOk¨ı]aB·.˝=€k‹úBˇ¯W&Ï+R◊®¬¿˙Ç0Ø¿_y4¢‘>ï±Ö}Ù{M5™HÕÉÔ∂wÑEz˙Ωe{°2ùHoºa˜lØPãâÙ¯AÊ f¡ú€/ÿVˆ|°Ú7h[‘*ªK†ï¸Uk∂?È+ˆnO≤WﬁÒ!yøJπO‰ß}	^©bí˜~Q%z•ëdØ<ÔI¯ ;>§Øº‡G¸^Øò…ﬂÌ™o97ã:Bå->åÆ√ÇyßÈæ66OõÂeåë%ùF\fgÉgÆ¿åóÑ˘π0ü8•…¶AB∫iêM†Aò^ Œ≥ÜNÍ¯S@ŸJäeM¢$ aPÀ#Ã»âIdiP˝M,ÏæVZƒqÑz‡ß…&&Ω*zI{®¿Föçi3Ÿë03√Y"îO˝BÑ\ªL4!4gÖÖ°Ä'≥Ñ6yƒ,ìﬂ◊TêΩ1œa•84,¨*wSÖı_9ÕIPˇo£t4+•ˇ3™[1Ï™h[–‹≠˝¢¶àÇ◊Å∫û'4ßyRú∆K$e6&—%PF4b>QJy0Ó[2ìË7ì‡ß„ø◊ô -3zm$R‘¸t°≥K$/ù∏•L˘3é Q
ØÅó§¯≥ﬂlˇOàV˝˝ÎÌ/_ΩáÚ˙ÏAQXX¯ÄÍõ6ΩU/‘bå†ä†è_\cM
∏È}q˝r*Õ5_£ì]<°I˜¬n]Æ3˘5ÒÙó?k§°8ëΩ(Õ!ÆVD•µÅÜ-Eg√{ûz{»ªÓÙπÊô®•ÈY˙5≈¢P]Ï%h#•JÎIS·|ZRC%!«˙¿m«§•µ&ìhÙ˜.ÈlX´qQ‰≤Èl—52‰ ªoÔ5S*6∆•’[_+“ú	∆îå´⁄ ‡döy/ùéËIúF‘S∏§#–ñ»B.øy≥|˘ˆ€çÒx¡ùÎVæÆeáz¨ô”ÀÍ”5†ŒØ$?Ë-πx—¶6âµÇøŒåkJ±®Qø‘/Ã?É í‡Õö®∏-qkl~@≥$§nä«∫:ÜmÉ
ËlÑ&ŸQ∆y^=AoÓfà≥aÑ@k(ÄP¿Tlï,gê>≠TYÅ¥ﬁÉPywëÚì{…ì^“‰v¡—8I"«ä%8ù‚eSötû*b¶MåúõV·d‘Îı»õ˝›}ö¡oø∫O>UèQ2ë[ .º¬‡ÈÇ‡%¸ü[úN/‡q°πì%†Æ≈{(Ä*ãè∂_ø¸[˙˝Œ˛ÎÔˇrÔ˜ﬂ}ø˚Ú’ˆwØè´ßV>y◊T†n†7Ñ˛3¯«è&7>√-÷∆√©Û[äeÖΩª∆Æ˛è—πAﬂ\ˆπv˜^¥c’}9|y¥˜/€/‡Î˛·ÓÀ√>∆≠\Óüvy±<öäl:^·+æGV¨iN¬qñæ…¶EÑ˛IU`5√ÍÇ9`›=Bîhﬁ¢%bœñù•«Ÿt8¢èﬂµ,\¬4Hè°6–LÑÃ,r¬#]°‡^N+bi¬ñ˘LV≈§@ø‰÷"L<œÉÒ>º<¿WÉÛj˘ŸÒpúÚijÑhuhôÉ£Tpí%—ÔáQhx‚Çöç43Ø=Ãv%‘Ωù±Ã¥£®¯‰\"¥ùI1’(B )å2 ≈∞OÚlíÂ‘e;~ ÊÂ≤n@Á¶äÓ>0Aq≈e`7‹p›L˜4…Å‚äcsZ £Orò¸Nb√úÎWÉƒIóÊøåí¿nÇıa\à2ì`∏;Ï*DR¯-ÖéE	J¨‚Î¡NüÏda|ñ-Ô¢6° !|l-_z≥ºŸ	&®ßæ´≠	51√é&›∑P÷ŸcyU»ª étã}cÊ÷jÓ®ü` ﬂFA»‹ë}rRRî@û2¥U*÷ú§›}1Hﬂip	…¡$ê3kªÏYjc9VÁlq‰^ä|wÎ.§0†pxÿ¬Å›T∂∆‡ûu	¨”)úŒ^1ÕçÉ5≥…\&ªQ1Ãc‡on}„Œ-!çúzÀÜîv±i;∑ˇéÕÕaè}Çˆ†≤[Éã…‹|‚ﬁ¢XÁçäJÔ∞U/ÒÉπYÙôª∑ÀŸéÇŒ∞!ïUÀ‹ˆ‡=µÜÓﬂÕ∆ú#?¬∂P∆4]∑iñ:´dóàΩ ˜~kñ«DÖ£4[÷kºT,i™EæÿÆÂQà¯p?s´™=÷∞q$+^.≥ˆª-–˝"ö‘r
”¯¨*±À°JZõN& Oò6s¡]"¶è»äxduºı3”››ÄûbÈÿÿ£zhô…tòc) }Êœ˚q±ô` UêqK{çø+Âq°§≠ÛáŸZ‹x∞SpŒ‡Ó6’*{!Ì:
s‰!^^g¶WÊ%ymãJBŸ5ŒÌ«˝X◊⁄r˜?ˇÑ∑∆Ì“Ì¶ƒìn0¯¶!zlùdóB?a¢y}<˘X,ﬁ»xMÙ$¿–¯,sDÇFKO7∂Ïë≤q”§i©ÄËπµ´ãç#Ø2 ]‚∂m§9nj_kyëLƒ&∏«◊¨=t©i˘ÓR+kŸ ÍZjW·àz(·æÄır¡¬¢ö∂ﬁKÁ…H;;Aù»îQ—N4n≈-˝`Ä™–~ÚT?Z«Dåô^ˇÕVßyØ„”ß©ãÛÛë Ç1H[‰Kï1àŸ%3`g∞ªÅ$ﬂâAó˜Û€ük4°P(m∞–ö]ïﬁJÖïúË1…¥úﬁ˙õP-8Ú^(hõ˜J„V•w2Õ6≠˙}≥=≤Ú°ü¢=¬COÔY“µ©≥®G˘H∫_~a¯^ΩY¸ààQFp(e8ÓJî¢UJ€–k<]„M¶Õmë„yViQ¡ªùçî‹v™÷tµ÷=bO«„(õñ]	'®˘*E¯\"ÎÉ¡†Õ` .ÆëyÂUä_rß()ÿ∞„‰À$!∂ùJû∏JÓﬁ*äêﬂZ4Êr”Î&Uvµì∫‘VjÙrëı°«:/˚ß$»™÷EÓ◊ÌÈÍl•I˘ÂªeVÒ˘œLñZˆ$ÕﬁÿLuÚpîYo}Oõ~8◊I‹è–7ã2d1Pﬂ7◊RîÄÿ:ô‹‘Ÿ˙qÈ∞à¢nÔÈÏ‚ûﬂRµ‰'@°Ωπß·”Mˆ`{ç{∑K·%0ÉÉÄﬂËQçÍô«Q1Œ∏+/∫’èhôí.á9„8^¡6‰Y8m]JäÿX¡‘øh=D;&∫tÖÀÀƒ4‹Uµ‘úg◊ª'µûDì}≈Æ˚jôS:0-ùÂ»¡LßÅV’aƒ„ƒ\CNöÃSæ¯¬Ãtı››Fé‰‚≈±uâx kU-é’Ä™òl3ãÆÜÙ@‹ZÑ»HÈhªúÜîxÍ•Ñ>ô	0‚1Ü◊h0ö21eEG&≠~Y®€Õ$A=ﬁ[iW„Ô¥‹Éf¡An¯§Ò#É≥”≠!∫G«€øˆSTÂ≈°7Sæ6ô”>S˚†∆áì†¶¸ë’9¿fXm‹2? 7aÂ¥µ”Ñ¬®4gô≠ìªÛ•Yd*û"0©ßAàŒÃPF=aÉ<èBLÁf≈Ü?¡ciÿ∆ôÄƒ≥>yÀÃwyê$¢…eëù–⁄«YQ¢ùU“+≤î#¿±N≥ÿ£|“ç.˚‰ æ‹ á_¨K@Ap^è”˙˚"âÄ7_å±Ú” °6›‰,k¢√ª¡0 ùW¯îG˛ÿ!—¯+tÏM}’ÿ•‘è∆'ÜM«¨É-ÂwpËÅcR¶}íG‘z	e1##°„c≤yYµÉÆçn“ÛíÍ2=∫îTÍÈE¶úç ≤
L·äc%0E¯+w≥›Ö}#NƒØ≠¢yï]W(¬üìÖCÊ‘É∂“*Üá∞àûå&§9«T —0>iﬂ+fåıÏôÆ§—ÂQçÑÕTµï∑•Z++ø◊Á€cD´—j}R`1Eû≤iH˜÷ö∫Ø>|‘≠Û"ÈãPUºz´
Âª¢JqoÕîZ”Ø⁄÷€Í€ÍΩ™mëI†!Üe”Û–p…¥›•F¶-
eA#‘rAŸiQ˘Ωh¨–ê–4˚–Mt‚πá“ë°;ËÑGb7«È´˛c’œW"=-…Ùlm·2ÛäﬂØÍ∆ùø	ﬂ‘W-‘]E >öÊßª–_Ä„¿íx~ûl€’ï…ıP∞XâMDJn (÷	÷ÌÂxU;ﬂ57+~öÒjÇ<êQºÑ†ÜÂe fvÖ›ùÓˇ∞9£I(YΩü¥t÷ àc¸'Bè"rÃ7Œ$„ˆ—$Ü]%∞V˘äùª‘å∫Hï§q:¯˘èâ)ÿX⁄üy%à⁄Äﬂn|®˙mCz¨-‰níÙ2z±ëÙÏ57?åé3‚ë·¯|v–§WÏo°SﬁrOù\%Ho∆4Ã¥@Œ©Å
s’¶zÉç9B4˙å-ëS5A.9>à«Qøﬂ_úEy)5=UŸ∂:W‚)ë€ùQ Ò4ÿY‚tø%#^IQÀO%Äë›eô"·›YaI=ÿ~@·&%nz•CªGó⁄xVﬂí,hã∏7Éú˘ˇ,xZè>ëN]%úæìííC¿ºdêÛ¡πeö∆C¡©:òzèùL‡óP l+l∆3t|áˇ≤	5!W∆—%≤ì`¬ˆ%ÑX>…c¯¿··À∞ºD∂qa‰-UDÂpq	ôj2Öá—1Û4N¢òÂ¨ÑÊcµ¸8ïÚlì}Ë9™‡&xƒ≈Æ∑ÒWäÜHæ§0Ñ‘˘îÒÏiAΩ93˚MGêvÉôÖ	mVn´¯0ôm˜{4ãú±ùı≈ŒníwÕ"3“Ï<lD
?ÊEÛçqWæ‰‡H 3ı⁄å∞¡z©o^æ˝Ó˚oøytº˜f{w* â«˜e§xê∆Çùx¿õ^òaE1Ë%o‡#€+ÇATGòÇ{eYi‰sÇ¸ÙÿiH6¥?Ò¡
PòZ©FdL»åeCmUÕ>ı0àŒ
$ÛÈˇß]ZlŒÎXñî⁄)º&˝·È¢Hì]6h˘≤≤pQj+¡S'—aô¶óıW›“vû|SEÄå+´˙ =ó`†Vd(B‘„∏€äC¯ÆgÈ7YΩã‡@4ÃCo◊»∑¸5Ø-ÙZæá7ñ¢?,.Ø‹#¿Uèé@YÉƒ)P"˛üËk°cHºdg∏≠c"ÍıXúìó1„†0 v¡-Ãè∞_\ª˘
jË!‹íÊp—aZ˘ §ˇXrÆ|⁄á´¢·öînÌ∞ó¢a∆≥<^|Øß>(Æ“!ë#\{.ÖÔA\B≥êCN„|‹]ÿFK“'◊˙j<€F¸˘|aqq±⁄∏≠⁄wW-|ÛlWEc Å√∏»
˘≤≥≈êw‚|òD´jn:öæ(πs¸V?ª<T<)◊<∑ÃÑE~Ø3Q•+mEÌTÊÂ‹«]ùìC⁄´YÊ¢·Ûfjlùœô˘¨~o˜:s&ˇ3”¬©:äœRÃs©ÛÖÆL¢π3≠ >+o˚}Ññ8òVﬁÅÈ|7gä;™ıPM•õ∫Ë3¶¥U5.ø¥bùkéÊ‚rûcWY}¶mÇEëîYÆk#j∞ï≥ﬂ‹C√Ëlw:Å∑–ï˚e±Óùlr•ç’ÀÃƒ∂g/©∆’B∏ﬂdª1πÚÇy´)“Ÿ›f¯0±F4ΩÃj⁄J˙*êFµS[5•>ºÄéê1Ü*qû«1
Ó>bL€˜Ä#&)à›cˆ"Hµ¿ë3ÿÌoLJ¨“!P
Ø
ä¬«jì úczÄÈ$uXY7fbª¶1ùçÛµ>(€≠íÃ;á„8äëvda ÌŸÜ√›Ÿºº¨Ø≠»Q¥∂V«(¯kèFµ4ÁÄÔ$cÊºŸ{ª∑}¸›·L∏9u¬Ò;B3ùa2r¸ıPg1ﬁ®øÆë‰L˙∫N.ÈÎcÜ∑gÉ›¯çsn˜˝=?:€É~)X£˜J˝≠7$5ÈÇû1Hƒ–;m>Ù=Ñ¨)ç∏í+-f§π$∫_@»0ºC‰pª«…ã <ãÃˆÔ'ü[‰üxÍä3N(ºU…◊n]™ã›™ÓN◊1∏≈≠6‡|R…µ~|µ˝˙x≠‡_¯π˘–p»ÉÌﬂÔ∑µ7óÈ∏›à∞Ï–|©Á«ëB2
MUÌT›éçyo—µÜ~=˝õ≠mÙ∂Ï1ñr∏ï_|ï≥M≠îÕ¢É|C…RU8Ö&ÇO¿@`ı)–öc.£0’'ÃCÇ:Dê.5|`¬”E
'ï"	¡ìy…Ò©¢ˆ]¥©P0ı|™Õø·Z◊òV;¥©πËÅGaÖ√F{mjÛ≈T˚;x˝Í‚™ÔYM~ßü5§⁄êø˜^yûÅ÷ævgè#⁄\·÷˜H´øƒêÎ{∫æOäΩØhÎá"ZÔÏ{#€÷çŒ≠p ˜jí€¨éøÓÌŸck!ì≤˝–‰÷'´∫¿œa®g»1N¥|ª°E=iŸ≤£ﬁ-6˙’
Á•MΩ€∏›ü-›4XûNP’‡0∏¡@Æ»l„—ïîÜ•{ÔØ#ÁŸﬂ4õ—=π~døÊùÓObÛ5ü$Å¨¯	*“jQ∏¶&€¿≥,°˘¥7«?/ãôŸ ÷:ÆR<·¿jÚí5"“*£Ê≠¶ıkñ1£˝õÀﬁe6gµˆó‰Ó6-	’#RgÖm™^çí˘j÷œª¯ÓÕ e\`JFaá›I¿™bçkÿ†f`T∆°QÿÆfUz®…~y9L¶î≤U“L}i≥›Õ0Si∆9Êô∑˚áo∂_ì.Fw‹˛UòËV´∆ø≈ÿ≤B∆·Ül{A·p›(ŒlLô◊î2ß!Â.fcÅ-V? ´e˝n6îFÃ¢É®MÁ›ä"[XVä€:9±ö⁄5…%˚‰$ˇuŸj÷…˛√iÍA≠4>÷mØ¥U>·7GÎﬁ'W9„ÃL¶Ü—∫GCòqj&-àÚzp∫UÉÅÀ;Y˝ΩøÓ«UbFGˇ4¢·ÂaHcè˘¨ É)ƒâ<Áùø≠›dÇ—∞d'è—ö–é≈¶flÛ‰ßΩJAÜHÉÀÇì¢õFàc«$∑˙ôEå3DΩ%p¥Q™ö#=¥€‰ì\ææéÊ`wI∞Ìl—1Ÿ¶)ML£RµınyÏZ«œ#Âﬂß5X·ıIçV¥ã˜d∏¢#Í£aóéå8Z€Ê≤c—ñx€˙’Ÿ≥∫≥MØ“: €ﬁ/«™ÖóØã•∑uØ{è:ò”“E€rü‘¸À¥x·uV/ºÓã¶?ß›/_≤û¡˛Ö◊=∂óvW{ZÎsôΩj–98ÒW<Û$ˇæ’v›æıWÉ‘*∞◊—˜ÓÔp≠¥9p≠ïb8ä¬iÖ ˝{)sÚs∞”^¢∆Øup‰û5+mÁnaî¿æôSUQs3u!≠˛>‚∞‘á€,EÂΩ™k«;Gºmh≠C"◊∫{î∑À⁄ŸPﬂ„ÕπJCΩ?oç—&0WKTCÔÇ‚πm∆9öéq=;èF¥"ÆúÂºEM~¸’@67£|ıT’ò∫ìX’n£œ)'Ë‚Á%áó÷dªZÀ9/∏lÜ ô’ªPµˇi=û—c˛÷5æﬂGld`˙W7óÑ›@ÁX]¬~	A~È(KT uø–ÔVﬁ±~ß¸Ü≤¡,˙îßgg#Ÿá39"˝–œ¿‹á˘'Rˇ∞!˝∞(~=\º;Ú^ªÔêc¯P˘´8“!™Ë^dó3QπfZk§s{L”π…æj#q5/aãx6|bÀ˛.eDPØÚº«h8Úö/cÌ¿Ó≈aÀ3„¬ß>Ÿ7 <Ç/ywÑˆº◊Åî™f√â[˝Øv +∏y‹,Û.õgÎ∞e$;KäôÛπ&…û§é»,k¥…*#q{@Õ˝@‰ﬁyÊ|X"öùâ“Ìí1@±i‚)˝#kï¶{#üiÛÖèÜá∫EtäÒÁ)’|‘ts§îIyUnŒ6oçê'ó‘ÿ˘u[£>≥ÉËùNgFoœuEº√…”ïAı#%]ÔU¥ÿ≤å^¥*u‹‚µûyrP`Ñˆ¢›sÓGÆ3‡«7)o)O˜•p◊˜9nrÛ¨ur«ˆâˇ-Ã≠Ànıﬂˆ&Ff|7Áêt÷ITDÍ˚A˛Ö`	{qQP‹·àcUª◊"°fÂF*N–ﬂâlV“Ê°>˜Ù
WÙ;Nâ—˝>‰êYÁq.…Âés9ªI≤mﬁgﬂ:ÃyˇN¬åÍúˇ∞b≈<Ÿ[UÂèfM‚E‘xÕNÿx˘7^˜G‡6«1K A;u„Â„–Zêèmëá3x€i/œPSkÿ√ﬂ*I˘≠>˚w ¢F‡»Ωë˘tT‰KÛêÄ?‹„>Èps∞Ü°¯–¡'∂iiM;)±⁄€Êﬁìà~k4rﬂ,¬/ÿËÓs ¬äÓeR›—EÌ&€è-qE∆®"SLë±ÌÌõE’yC{gQä6∫Ñ√3r√™Ã~úFçç“§5≈(Úﬁå öÙû÷Ò(W˛âùç«ΩbògIr^	wY”›n6˜“sT˙ÂWo248û4e'OÇÙÍŸµ˙˝ÜL4É„øZ¢ÄzÀ¨¸YÒ‡›]Ø„~ûhGΩıaTL«–˜Ûê¶g#Gºi4õÁ¥H∆”lcVN”¡¢é3öNç0°ÛÈ™oõÖ€»„@“¢ü9Y§√äWîù≠É(ø˝+ts√nA`¡?∆u≈ÇBkñeÓD√—EaÊUﬁ ¢në ã]//,Um/©-9í3%•™·©˙(Ã‡Ád#ˇ3Oj£VMqg+(oˇÚâ¶Í8õk¢é≥ﬂÍ4]w5BFÔCe¿˛.`ZùÃ*óbyTÈ›CTﬂ≈/!{WíéfgÎulﬂ	.€úDã≈êÓœ˚qA≥KZ∆£5nV)u¡êÍe˘ÕÊbâ«eE€"û⁄{›¿i_Q8WjzsÖÃÍÑföÉ9ÇﬂòÇÕPè	æ≠±ØZW9'‰çCÏ˙µå˚Î€ø≤º®›CÓ ºx˜Òóm&m≥¿Û≤˛œ f»º˚òÀ«È÷1oO Èj–ı#≠<”®ôGdÜrrÎ∫‹∏ëïäëmU¬ŸéuÁDT*Ôíaº∂dUÓ"ÀÑVñ˚ÙI8yª∫cŸÅm§eæøÿ@Qx^ø:+ØØU≥:’+ö]çÚ´ÛÇ3ÜŒ V[µˆ∏±‡pE∏ª◊å´Å◊™b0UtÉ°·*π≥1Ø>N”ÚÜ–nŒ∫Öõ˚˘Ä?)Íƒ√ªú≈7◊%ÔÆºΩ
-n´f_BÎ ››¡–ÌZ5Àêﬁi‘ƒˆv◊¥üà∫˘-å‡A<é‚˜0ÇB¿næ	ØÚ°Üo6Ò°R?ÍºTV]~2Vjˆ˘DN˙rL∂ÅÕŒ,Iœ G£1´ÊÔ\‘H«’<(ùYL1<‰T⁄©°å„pÉ~Œ≥'å<◊–ﬁ≠[¿}@Ùûú‰m≥∑ÙÊh’$CÖÙ„j€y∞Z.%FC”Íu5jÕÊÚ(éú ‹mju’íN˝-
âÂJ~«4Ø∞Ñ
≤}ºd€¬†Ö≠Ü≈∫û≈»®EÎ≤hm1“%∫máÕ+Pˇ{∞˚é"J∞'fD∞líM	ãVH¿˙“Ù˛2∞	#›ﬁávÿK+‚g˘Ú= ÚÚ≈jØ:∏}CÒE«tD0i˙éî24UwÈïÒº°Dß>%≥Î¸¸6çy4ÄZ@jS!h\<bîç-jVÉé=Tt7¿Çˆ‡P≠¥4Gé“ﬁ¬œHò˚iÜÇ·Oñ;J~áøœPÛq»b<g(ë-%™¥r[Yr∂Î«Ìïÿ√iÌòÕd⁄\ãîè’ÁB\›`f/‡*√Úú,¯wÉﬂ0Æ	ûq£•ú7AúÂÀ4<_Æâ7äÛåñˇ&J≈Ô_Ï®˙πe!Œì&æ}·JÎI3≈ªπÁ∑ÿZÜhs;áÌz7ªHˇ L˝mÄﬂ‘Ùi¸ôÔ&ñ'L∂`õ:ú√·Â—È≥Îs∫K Ôﬁ<åNo∏≠ÂÓu(Z›§|÷È_&≈Â˛´P5áîX-3„Ôç'–’wU·∆˝’Nºa\'	∆[«+
v<VöÉœ"ı±[–®¨ﬂÔSz„wrrêiúå#ôiÎß9N}ns~ﬁ‚ÉfDÑOI¨èb5xÔò]}TI1Úã‚Û‹Oæõ$Y—1<≠99ø˚È¿†s|o2Mä®≥h&;![	®Çî’¶⁄d,”f:∫¨I˜è@Ù]é∫üãpwr˙õòoœπE÷§ÕÓeêMÁökÀ@ã¥I»2Ü$È∫Ïâ∆’'r‰±<¨b∞◊!À0›P´=´ùIbÂG6*kO‘‡ãKÊ˚°√ç—ÆTZ;
$HÕ∑Q:öéô9ûRvJ1ˆ~rº)∑π˚¥…Ûá∆∆:õmÿ¿Û!œÖ|ø…Yi|W πÒ¨jG;ÊèΩ<(e©EQGLÂ8°äk§D±‚¶ÙDrÙ´„DÕqˇ¥b›~á£∞T1ë°∂…^HÖ˙EÌ πﬂ˛$£l⁄ÃPd©Pˆ#ÿó$∆Én|É€üoˇç∫P·RY™ñ«Ìˇ^≈∞|ÏQ¡sÂútA!Îé„¥w—5<BŒoÁ£;LØî–—ƒ˚¶PùXˆAù«—E∑Î›0uâ¨>i}qBt^s:[÷VvÒ’…ZÛ.NábqäÔÖ∞∑ ˘ÌÔEˇ4N√Ó0¡≤áI°òû5ﬁAñâDœF°-Â*ª¯:îö ¢„‰Ù˚a:˘ìa[kåÇ~ÌÍc	øV Ú(’YUŸû–˚Ü ~ÆnÈﬁ§çV˚)ÜÍl¶ö√ün∫ßzng´õ
acï+r“√F ö=u˘‰BúÚ¬“ Ã5Épj⁄·Çg¿ƒΩKÊÈy∫˛•û®z3B|›‡KÇ˜i;@ﬁ}bw›'r◊C·v9=ﬂ[«Z¥∂É£u•TâÕ$&ÿ‘≥ß¯éﬁEL&∏= ¶0Rãé]¸öoPÓ¸¥ã5Ó1´fò¡IœMÊ^y$wO›Ü∑ﬁ≤Û¿fçg+7¶e`ü´è[bø-rH%µ£ü?P ﬂœû“wñÇ‰úøò7…Â„Iæ¥d¶$”M—4KŸ¯Cßæ÷…|ˆâ;%_/Ã3(’u≥’iﬁÎ‹≠KwŸ‹ﬁa¸¢YLnˇ≤A"äfä—xb,ËKBçy“D≈)¢I@›ﬁ&~¡}Æ#Ü¶;íœí9Õ´u&äÒÌ®“Ê@Œ´abõïœ©ŒYæ–≈°}ÚÄÁ=#‡ÉçŒÇAÜ‚;„Z"Ábe¡≠8Ω˝Î0vBœê¯√&ïaJ‘K:∂‹i_R◊µ9ñ6 üıìÆÜ$À'≠:gÁh O£¢Ë≠ Îp'(p¥wjzˇ¥´Ã@ˇ‰l…ı3ˆ¬Q¥cgÒÀ†etG 8RÿﬁJ0t∂4ÃJ≥ä∏æ*	uˇ/ÖZıZ
ÿ≠\Ó‹ÛΩivÛ0:Õ£b¥s!…È““zÛuwZüZW:è\°ù™jºG2öYg6u)y∞îßŒ{‘íÂÜc‡y#ay§Üqœ£qü∂jH™nî¡	&’Ë•”q1Œ„ùOÀR2)
wÕá;—u◊3em›˘y~/z_/˘ ‡§YZ>C‡5ˇ§Ömÿà^iqYGQêGUä≤o¥L#äÒYw	Øø˚ÃÃõ≥•aJ™L“NÚàT¿;ò(ÍˆﬂqÔÜﬂÆe·4õ…î<(‰.rÌ<ÆµÜhÛf¨π…z4gTπîäÑ2¢¶6wyôº¬¿Ê ò3¸ì≥(ñå˚ã¿_Kî±«0Ù wq—5›ﬁ2“¿Kd@ è´E»6LË M∆“:ï,A $°o^œ ˇGN  ¬ ”gÅ|œ˛â5n¨ñ=éœr⁄Ãÿƒ_≠	akÄ†√ åñH G<óÛE?Nc©8¶¡ÆGk7z«^&œPo]•^A≈5&„ÏfŒ§¶·8æöDÒÜ∑`AôjSUTWl !“&åzúÇ4	õÏ€[P±™t/3ËÎÜ©ç¸§´ ∞yPß)⁄oÍQz√∞5Ôèøy∏r„ó &‰‹Ú
=¨ÉÊo¸Pax&`Zòäc`A∆ä.'qﬁ¸·F‚S§≠$*IC7¯˛l:~ˇÚÀEmàŸ‘¿œLoæè?p{•∫àq{Æ¶Û}Q~†ÑP.âÚ„ó_ o+GcV=É(*íÉ∆ºWm˘$7»•ê§|¯~ÃøSÙç∫“>}ê‹,ô
T"ïsXﬂj%∑î∆IK*ÏeußQÿVî†Fπ∞1y)Ó5ã/X
D,ï∑]ﬂj'∑7OPæ⁄¿ÉJyai§xÕRpµl§bwËΩ€øö[ZΩaõbæ‹‰)Æo5ßòˇfküX£r˚§{ÕÊâm#…ó∂<åı≠ÊÚﬂ‘“>|”\GŒqîèÂµÃ§5º€f;Ó¢≈Èuv!,Nﬂ86∂G‚B2Ú•g °[N9∑‡¢Ï‰}úmÿlUqï}ë.2ü2Ÿy¬X¢éM3[#ÒÙiKÛÄ”Õ˙∞ëEyF’⁄H˜c§Y8§t´J˛¸gSìw{IZ1Ñuä,/ª›`âúÌ‹Íl1ﬂx:O¡Oı$uc;ìl“=ÖÕ…£ÓâÈ}8≠’˝H’ã“™36…ª:.˚’uViLcS9—ÈâÒ	·¥º%ókÆ˘îD®¬Ç6◊
[0–Í'D⁄<bÈ¨øçÄ]ËàY¸UÁôk ”ÆÓˇ¯≈µ]¨πëÚ˙uã≈è˙—"`8˝œÆ9ÄÅsY˙Ï˙ ô7ı9uo£ãJπŸzõùgRº
—K-Y˜:§…R®8É©[å“$Û ì” °«Äì¨D	€ıÅ†M©È*◊Ù
≤ø√5∆Ì*ÿ`‚Ör∫ö|Ónòf“ƒ˜∆îTË?'{ﬁµ.ÃQΩS[í!ó:Ç˙ëù¢ôÒÁfH¬æiKËû“LÍ∆"º˙µQ‘¨?”FêFÁ‡RbxwOÒ3¬ﬁ5˝OÂ`-_=≥é_74ìC⁄¥˝ˆ}áçßóÉÉ$%¶<à'WÚıTÓ≈∫ˇûaVñßŒ¨É b°ï‡¡`B∞My´¶â∑ﬂØ<·ì(æ”II?åƒM†N)t)ˆ
F_π‚n3X˘sI£≠Ãï®bõõfÜûE[îCVå.´∆™ô≤ ?T–∆©?úÉòé #∆"ÕÅèõLÑ6'ËNä,ô¬ZH¢”÷{ôX^%=∫ È&yEo®âp,¿gvº2≤hÎ˝Q…ˆõ/˚aìQÀ√(K`Ò>ÎºòCÿ
–ùﬁ˛7*ÓfS·ÖÿÔ˜ÕÑ£(s)…S$–ô¢xcí„ qŒ‰fn®n˜f—v∂∆úÍ¢Á\Aß˚j!ÛFùŒ:˛Ãl=˙—ì;ÂA≠l∏ç~xÑMVcjèô§Çá¸πY"2ŸA°≠‰mˆÿ,ˇ‰(sª˜/3ıì+¯ˆ_z€≥«Ü˙›ƒ≈Î,`ÅB`˜à±Q !¯K„n:[íÅ\Êª<–´òƒ©jÿy,≈·Ø3´ô10≈†Áò52Hé	í¢ÑTo„b,k‰¸„Q îÊa÷ü3p¶8*9k`öŒÆM„ÄªQIÇó–£∞qT^%QSüœ˛6ı˘‚™ı‰Ò`¡,ÔT™¸-°3}ôﬁXX_Æı˝jÉ«\ï•Ä⁄,∞†[~7,øˆF‘Ñ˘ö!t;Á„Üù”RHmìXP†∂´p3∂&‘Üãy^Ø≠Ê„¬ö˘Õ{d£»◊(ˇﬂâ"%c@MlµR_¶!Y;/ëÜ§dW'[Sñ∑Œm≠ß~k4àîfZ	±FieÌ∂41≤ñZÒZŸÏ;¬ÀÀÑGõ).'(B„∂˜…ªΩw˚$Â6Û8≈DR–ÿ. ô¶Ò0êÌìÊ:®—í•)"àÖB{2/Õ]X˘í∞i‚∑å⁄5	*+`Gà3ãLâÌô–»ÎwUüë¨OoâxU»]X»NA≈.∞S=ﬁ™√ÓÄ.∞ôœÙ™—8≠ﬁRbáŸxÇﬁı·Jâ˙ìz„"Ÿ“+`NDF∞wœæL‡sùòõ≤§kM∂ùlGÒŸ(Aü≈Jñÿs¿∂M!ó9Ï~ÙèÃQM9í∫@Qñ“‹>Ëyÿ'gó˝<Wlüo»R¢Opü∑„àÛ~YGY°÷,±Ls··…«I¢≥§˚<S¸Ñ⁄…ïmK®/\©F±ˆú≥•†ñÊ,ÏT_ÄÅ÷Za#÷É:j^9«…µÅ9¥∑˚^ß§‚TlÙ[í#äÒwdåÚ{t≤≠k^¯œˇÎ«Ïœl†a˚0{t{é†{T≈˝8Û›6¯W˚ΩÜ-Ù#v≈uŸß˜BÂ≠Ÿ≤A©R™rƒbpe◊¬Ú⁄Ñ™÷`vŒï"]≠ˆX5j”Ui[∑‰Êtêf∞ˇ.ø˜ÍÄˆ^Œ? Å\ÀÇr˝KK∏ß€-–·ëm?'–z‘9˜<sVèF§€⁄@∆Úìp+3%™
5kÕ 1¥#û3ÁÌ{ té4TpµQ7=w°Gx7Ê≈yw˚Ø	:“`&%8∏ÆH/_¡ÂÜ
∑GfZÌí‘*YŸŒ ⁄ˇ\:R‰'˘òsKHæ»(„c∞j%Wv≥EC&	˜Ú3ÜÃë›ON[∏∏Zåe¡yàõCQyëÔÄ&ñÍL÷4ñ˜ Gœ‰É›wÛ^ï≤Lõë3	Ü{∏—†é.“wcÛ‘2òHØ¿\¥}˙`’€WóP‡?á4T›Uˆ’UÎÓypC‰,!ŒçivŒ-zprlj¯´a}ø¿⁄≥¡¡\_‰RÈAäΩ\≈Jxa
À¯¯fòœúè0âø®˜gï◊˘B›ÑÍV}∏È<ˇ(≈n¥¥g:¡>öŸøõ-I£g<ˇVó;
A1óº_•&›yë:ÌÑ.I˜â“Y]NÅH∑õpÂó√| Ùc.sÑ≠xÆPsîŒms.4sÆ‚Ö∆nû
Ñäœe¶·èÃŸ~°+t˜†÷!ŒSM•`tTR+Á©A(&]Dƒô´B´ÈÍÄxfÆâ‡˙Q◊,G<ä∑£≠÷èÿ∑–£Qê◊Ó£†,∂'ì˚€KÁç^€Mô_B(¢Ú]]»∂¬œ!#\∆'±èå0´Ü∆ö‚ßÌŒÒ§|qµÍö]SgJlˆ†√62Ñ'˜óÂì0MU®˚åê{è7E"J·ÜUÙSï$éÎåw™ftÂ6=bè°'-l≥]	Õ∏˘ÇU-.XèÄ≈{ô/IÂπ“PyJã≤f‘cÿ¢b·¥¢œŒ…Ú ÉŸZ-c¶	˜åF{¬bTÅp$@)≥Ñ~Ö⁄a»î˚yázXã–OÖø—igcv_”Ó!ÁYú°Gπôø;]# 
Æ`Ûƒ◊Qu§]ıâô˛•D¥*•2ºÍ´· ùÌ>ìp3q2í¥¶`yìµ.∑dQ÷ûŒR‹˝π•ıUñ3dG†ﬁΩΩpÉÛ=øÖΩ7-GÈ:N}G√›¿´b”◊ànó*4?nâx◊m0è,≠PÕ.€˚tDE»(hí’mç£¬ÖW√ˆU±ÑÖDH7öo†z√˙}ªÅ=«w¸:±WàÁÄÿÇõ◊≈x¨∂æÃõüªñ$Ïa„GgòÉˆXIEêë7€{G‰ÂŒÀ∑«/—√≥÷[Qä`Mà–≈«1‰ÉÂ$(¬»j—›g” Ω#‡«4#U-ë`43T[[’Ä†ú…bülüÂ”	¸%y∑˜vÁª◊˚jÒ∞—%™ñà∆tEC∑y®:m¡◊8ç0Á5Ñ∏á∆g—xë≈ï”*òBG≠°ãÏ9√&`AÒûI©'âr¿»¢a
L÷r‡z|Âî•ëíB'éó–¡X-|òÅàåº√8X™2îÛàª≥à˙“Iop0Ê∞8öN"∆àëUGQŸE\VQ;ıvRT÷~s8E–‡ã,K¢ ]4ÑL÷°ëÛu…¸UZ¯#π)˝QPtá(Íä+Yß(µ5ÇS¶dˇ§#na&	˝RHÔ«©$+ñbËÕK8Èu1ø|Ê«)¸ÛßÄŒaöMµ)ÊÕBDl$[¡K¢µÃ•&OÚ®@4É"†YÇP-8-Ä»„å$ŸM‰ik ÁÈ©P#ñ—0•yÈ·…”dzIIë6ã™¥©˙I_&^jÊ6Î¥´;‹®Ñ∫º=ˆã¯,≈;ÎºBüZä‡˝=™Jíä¬|±£úÇ:ﬁxÜé¢˘⁄NŒñBÑÓ√¯EóÖ∞§'Lày∑„%∫-ﬁ«öJE¯°Í„T9®ÈÂΩ/*à p}%¿Iöo—v‘÷$ÑÓ∞±ÖpW≠Ê[’‘^¢'QS≥˝§1Ìz™N–í"ﬂí¬¿ZêÂÕäfö/ç æDÁH˜‘Ø¨Q”±}3 ;T¥ «íW7ïífiäIÆ¯a#Ä\ö‚:|∑"¥G*°·Ê˛»ã(¸*ø:çU*çi£5{[1øwl ›[RUdjä∂‰-Ò—4ÊûÜ83` ïﬁÃ˝V¢yT∂ÖÛk® }ÿœ$ü√Á@ú4p8‹-Ty¡ÈjıΩr#ô-⁄ø¥Çgp39›A¯¯˘Kòå–h≈ﬂÆÀˇÛÓ2ú‚ñRà·*Ç<=œ˝` AF®Hˇì #òj{8\cﬂ~3∞ı7tHssbÈ¬ë„¶⁄¢îÈnU¢&,∫KCÅa`)/¥bU[à$›ì´E–¿ú¬Ñò£ó&â´Ä#◊D}óŒŒŸ¢©«°/’f	
,«AO€v7Ÿ4˝¬s#ÙŒ£A$ FàMΩ∞§°ÏME¬&	>√†ıÑîµ8k]Oã(ﬁèãÌpß.{GÓ∞™ôœ·H	KÂYßà†3aê_Ÿï„˝£
*¥ÎÆ+ï5SVFgQ
ßwêôíÑùÙƒêÑß∆<ÇÏíìVÖƒÈôœ€é‰ˆ¬Í¸Á‰£x”|qùWΩ™J»≥3ö‚y?ƒù¸˘s2∏Yv?»NÙ…~øˇ—Q?2TW≈?aΩ›W©yå=©√áﬂb|P±^0Nj¢&ËãË«|_][lzcttò>å–«puLV0:Ck-ÃÕ÷ÃmQ2◊Qt™
!Â)dÜÄ4A÷'áYB°+GYˇÑz¿uë„Ï$nh˚ÒÍ¨π'hN¢®ÙãÑß–@Ωœx?)ß!”É˘*mBﬁ€7‡◊œÉx„|ÌSÅﬁ–ô’
7Ómwã9¥ˇØ¶K≈é·lÊÇ¿¡À◊˛7ÖCG¬v≤ï—p*+¨	ß˙Ò!∞p≤Œ£c≥p‚‚‡56^ø&|º|¶ıû rrá·∏°rËl¥∏L⁄Mÿb7eœûcz¡@áΩ¯…PtXuv(zqoÓ¶ç≈·À`ÇbŸi‡©CØ\ù•zßﬂ9xµºÛˆ‡X¬≠3:E¡‰ÇÙøˇ7’”ö¡Ô¸ˇ   ˇˇÏΩ›nIñ~Ôßq4√™i~SR´Ÿä§¶πêD…ÓŸµ H…™$ô3Uï5ôU5µ¸/Ü}±,lÿÌπÏs„¨ÌÀÂõÃÿè?ÁDDfDdDdd±®ñf;wßU¨ åå8q‚|˛éÎ˙¨1xËrÃ∑/Ü√ÿoÆÇ@Lººã°),è1;ü14^Næuw=ñÊg”ck¸P=ñÊ¶áÎ°∆‹∆vƒ4kï<™é7Ë¢ß8µÅùÅZ6ËƒâPT.ì¸Êè<î&XÀººiÓUAﬁ¢⁄ªä™
TtBΩäR≈1iwÒK≥˚{==™ÓTÔÏh€p#ñ≤∏;Óƒ≠V‘È O¶q¿Gˆé≤ãõÃã±PÉÂ≥Ê-˘k>\‚÷Üë«≠£2∏Î
€krX¥$7URá	Óü¢tPÇùzø'õ–“Ö”2’ìz†ñåSì”)SÛlíõ Õ‚«>÷öéüÕ/∞	 ™I‹ûq[◊nrû`ëÇ5åÍsvœwËTgH¡¯1ÁGK†ø√Ÿ)“ÚkÁÊ÷°ªÉ	*Å ÈQˆ¸Gõ!«UW∑Ü…/‰ì/(§À¬ˆ
Ù≥íò∂¯˛åGjW}Ûu¯g∑G@+‚‚¸¯gÆPÚJ˝_aû_se&ñA·^é<L&àú¡çÇ:¡AÏp?kÔÂ–)≈5â∫´ ˝æ~”&*%¯äÑJò∂ó~≤_3ÿ©¶Ì¸q‹G˝êW‹¯⁄Üi7ÊY∏ª	àtÆk· E5o3øéT¡@k@:Æ%Iˇ	Ø‚U¨®˛Z‰¡ŸûÇB˝›‚è<ã2BÍ®tMEûj(iÛ~
Û¶åÙ©	2ÁyL√ëÛw:…_∆É1:§¸ Êó+*q≠/z≥∫Âîã¨öØU≥A°M›aQõ‘5wäÆãjBPA{™4j–Se¶∆É»RtπM^´úK∞34¥èp…0BH∫äÔ	Iˆ>ŸKAkÂÜ˚!®`Iéñ{4õÚ–]îlÓı*Îõ,3π˝#è_t”hÉuáQèGïéG	9∏Uùe—1'‡ˇ°,∏TÛ∆#ãªË€√PP
°æµ`óÒÔ(BY⁄/ín÷ˆ ›Bd&ghÂî£]◊º€Rc·Õ ãQ°7lçBN‹Bo†∆GXh´GA©yz Ωk≠¯jÉG◊—3Ì≥’ÚlÃ”∂Õ9¢^∆A(ã°ñÖ„ Æ˚Fr*^ı4º}ÈJóΩÕM˜Õ‰˝˙ú•ÔÒs≈1∞N§°Æ∏≥äxùÅ—€wãS∫	Ú5[*Òàh°lk"C∫Æ'(P0=÷ı~ ﬁ±¸vyø¯˙˙2Ò˘z¸"Ÿõ€Ä)UdÑı±sÍ‰h˚‰‡ÌÒ…ˆ…∑«œ_Ωÿ;~-œ3¬2ÔëµoÂ=Í1ZÉq£]]˙q=übduU iñÕm…ËEâ'T<˝NÊDØ\<tXÿc:Ly¥5J!N=¯›÷ ûã¿ø§!˙!PÒ∫\°ê·x]÷û8®¨®`az¸§¥Ÿ≥™”…‡qïÄf◊∏ı'j§$û≈“Æ»Çz∑æ¢—ä\◊!Úæ¶9é$Õä”In∂ﬂÃÌ®\s…ÄÏ÷.Ù§È˜]ÿ˚Àº\¢⁄„~P[qñÆ@0ETzÀæ!3%∏'a¯
O˛k‚B%m(E–_c¸≈`F∫ı3ûx#€ÁSú≥ã5À tÀCg1ÑvèÖyS-Ø2	•–*X~/RàBb-•Í)ÑOéüç∞5ûºé:Â4"gS(¬Na†º'∏ìQÅSH∞SFk7@T^2˘å+¿€§≥IÂ3…Aù≈Eçﬁ+û?˚É%é∞Ó)≠ïA6áésPìÉˆW|	Tf∆è«IF:ıctÿÚän<’?
á´h¬E4]çÜ'∆z˛.®: iÎhu@EÅ≈ﬂQ’:åÿú€^‚œ˜ãè)Êk*@öJ<î˙pksÔC¨î‘É=h≠ó2óîÚcâ¬Ãù∆>èôÏ¡îf0iÀNîÚN«ò‘äYÃ]/|Üzâha2…(;6÷å8«¿e4÷‰dWê∂ *ûVñ–W±0∏Ùï ”fõÂ¬ºYgg(âUÕr%™/ÀL˚≠¥®B[„ÑS^6® Ï≠æ∞øñ_ÅÃ@›˜i÷mÕœW‹À≤4sÍ{.±w¯˙ ¥˘:ÏÒ∫˝f´)¢ À® Í-{-¨œÅ
FÉ]$qØ´ä$|Æã&˚ºØB!˚X´-ÔCmÁÇŒIÍ¿Ω¶Î∞Ï›AÔÊ{Ü∆"ı˚Î{Ï8>kÏ‚~iq¬ìÜ<¨x@Å<p?L XzF/º‰"')Ëô≤Ωr\lÁ ˝àK~J<ªè±‰Q≤k}˝]ÎÆ Œ0!‚?ˇVπ0©™ÙWŸ2„=WM⁄Uì¶¬–hï+xË≈!∫&zòã¡dä•”¥˚CåRÙƒh8x≤Ü‚¸hÙ2lÀ=# x`1Ü∂ Ú»ò9r]â`CÈ#iyáﬁ÷OëÍK∏‚Zœ3Xn{I_a¢»B» r÷(Kπ{*:%’∏Ø<ŸËÖËL°Õåˆ6ÜÎ/#Ë0r…(AiÄùˆ“ŒoÊX,ƒu`°√îÔ˛ç3‰çÅ∂ Ò ≥Ëw±t°4ó°g-Oó…„Ñ~.ëmÖ)‰cÊp,4}<Üç“nTÁS.ÓÃÕ‚Œà°÷÷	è8Öˇ=C∂àíIùGp_5ı∂∂˘ó{Øæ}˚Õ€Ω„ì˝ó€ª€¶ıµJ¥ÕS
‡±n‹I∫p‰äì¨É¢g·0k˙nlÈ0 ¢lË	ç60û>l≥c[‘ón˙~)‚ÏõïÏ£Ö˝í;˙¥˛/¿\¡$
P•9˛ˆ9Ã«"ÔÁ@Ïƒ6õn'v¢b~¢OrnîÁDûñ#ÇÃŒ◊	l°ß¢óˆ»∏È+}—Ë}Üg \ØÇ/bô3d'≈ã	'
v;Ã&p:E2ı≠—Î¯ `F‰+•¢ºìDÊ3‚ÙÊÓË.w•ÚL5ÿ˚óX-=˙]“å◊pl+‹Ö¯>û—ﬁÄ¿-é
<w”º’Ë‘Åâ‹–◊Ó”2ámÎ¯QN√¨“|uÈ≥E˛ËæDçjÙB¥\m∞ó—Ëb©]µ/àœ…†EÌg‚ek+ì⁄ç_%›—˛∞˙®›n Î&< y¿≤VpCçµ:
èn˛pÛ?„P1—iôJº≠ ®j4èö∆¥ÍNcjn{ôU	¬Ö·óigXØØw◊
 ≈eT*#øçmNøê•íãcÅZ t&xÿ‹Ëtu~”Õ`g&nóÏ—Åsw.ä¯4uàAÇÁêÆÉQ<…)É˘Â áÍÎ¨iQDqz{iqÖ˝nÒı⁄  õ9ãÖ–#JáœõÏA#1K=ôL8gµœ2∫ÖÇ=:Ó·?/¶Ê∏âlı·Ø
5âä´o`?\+!%ØòëﬂïTû´û¨ıBÒﬂ
œjh™¢IZª0»KìÔv'Ü^Ï∆∞‚/‚\⁄«j*‚kx˙Ô:Øí#ã`|±≤≤ç[=◊xN ‹ñÕhDä4{ëû„¶ÿªL∫7è¯êyCQG.YÃ∆4#~L2qä|i°Q’VÆÌ3{:Ω&ï∞‹ßlûˇMû>˛ëµ^• ªõŒo~ü∂12a¶D –ºﬁkâ+Ò—v'~–)+FRO`
R•ÔΩ4RqG>#b…ﬁÎ„H‰áªœß£òWnª≠'y’)ˆçD‰˝åà.“töc≠¸·Êø„h¶#|∏ïòœSôO1ÀIrñ“‡U4>è9Btö¯ª:IÅ9f0=ïÃYÓ#éºxO•^áR„Yá˚+¶“]≥C}V/⁄ÒëWÄWÍeˆ∏Ïﬁ{ëYÜ{S 
√Sœ≥É¯wÉVœL=∏?–zò^¥µyê?Kh9µ™ŸRe‚«€à¥	€=¯Éı·∞¸≠ˆTÀ Pv/áJä(^}R±|@"3!%(˝eBhtûíufÙ"Í#,Ë^CçtHÒ’ÏRÉJ%Ä:~IaM{qŸÖ0¡%MjdL™…ÚC ‚≤∫ãı U˜ÃâVÌÖoóΩ+™_:≈	P/Óﬁ
∂jj.Ω∞á˝∏Å1ı·ñ”ﬁ‡˚’nà≠Ãq¥b‹wã≤9TÈ È¶w_7GA}lV–q§0?™Xv¬`?QDÃóANNÅ∑–Ú«≤ç~–ÁX{Ñg–!ﬁ–˙
Î&»ádL[ûˆ1üä˛õé(ÒßÒÔÿ˝IóDóí†—Ù¬j¡?,R‰wïÜ>›,yÀpÔ.?>"BÚí0ãèÂ–N∑Hì7‡EV)≤YAÈù+Æø~`54Íìè)‚9|r«tpGÆx°õŸÜO,âØ(»ºÄu÷¡°?9ú9¢}XªG·HëôOJw’ .ÌE˛Ï^[ÿ‹“ }Oà“JœJÈ6[f≠UPÿœŸ£‚?k⁄mG/j“°i6(Èôòtµ„“âÛ$s≈´® 
Ê‚∆±¨Â`¶JLïpxÓõ´QëùYoñvêôîe(˘O$ΩñrT‚÷‚„iÚ∏ö$îa˛Ω≥íB&jâ°ë˘Y‘Î‹¸>mûTpOù˜∏Z…z,ñèÙEÛ lÜâ∂sÆªl∏Ã@=GÛeMÚF›`ºº[.8æ13zÍVûù6∂§∑í>Öhââo¥öïO%#«'◊‘ç÷ oád¨ÿ{a… (‹´jJu!(+„∂‰L◊ÿ+N8Ô’§ùkyÏõo6˙˝⁄Ï'¥$√é`›
F7“›au©ﬁäí∏ò”,∆ÛâÜ–Æ®&EÜò&On™µYïJ¶-6ŒBΩﬁ∆0?`F\|∫õëñÃc≈`≈ï„I,£$c€®⁄ÜÑˆ-_œè÷¯ñöÑW:7sâv÷Ú|i¯˚ò“º.$E˙UtJ¡ælÛìóÓ+√øC¨íÆÖúü~™ræBˆ”fí~jÛ”œQ∆†`dóKsYÉˆı¨Û∆˛)°¿‰≥K√q~—öÁ{µè˙¨Q±<.çqÆÇuíÙGÖ$T!Z® ≥W<“™÷Åk"iGu„sS7“X◊H?ä¢1)¯íÊõuûøvR†Ñ.?ÜEÛßø˝œˇ˜˝[ˆ"°r±—ÜÚFéHrÑµeÃ∏h˚wá∑`}CÕ)55ßÙÛUõä„æï˛Ÿ+Nw5÷UßLu*]¨Oq*ﬁTM-@k˙ÄÉCˇ(∞¡ü∫∆T•fÿ¶0uÏ
SÁüê¬‘πÖ¬d` œóÜï[ÎLùu¶`ù©só:ìÏÔGù)t0ü†Œ‘˘Åu¶@»¨u¶&}–ô:üØŒ§!f˝y´Lw4‘5¶[kLòVb∆îB<f™“ÏÙ5ù7∑{q6⁄I≤NØÄe{t]ae[ÿÌÊ≈zÂâº_aﬂJ)ôIˇé¿CvyΩöãı †¨u∞l∫FA;,ÛXÌ‰qÃ.næÁ5B∞ VDµÃê◊o˛{Œ%Ë(++¨P%?Ç;·–ÒT;¥ÆŒÕ˜ã–D=H≈S–‡F•ÛÊ'∑m•g≈>Ü9à„·A6ÑΩ,"∂™K∑ZP=≤]€¯mc?ïod•∆—C≥‰P±ïïµË^¶ÎD‘Í¸øˇÙáˇÕpÓÅ–ﬂÒâ∏˘õÏÏÊ˜&&ÜùETVÑÒE±µÔ)í[àúÏe⁄çz†cıµ$≈(}'TeoÚªävìc©±∏lán¿/ØÀªpÅÁiy˚’'ZgQ/èyàˆ~é9ıT'.7ƒÑNÃ°î±€z°∂
ˇY'ßjñÛ<∂ªËî0õtÃ˚E±Jù«J'≠ÿ|[ô^*)Di¶;∏⁄GôÚ-Í∑ÛUz*à≥úØ‘ˆaæﬂ•WÙŒãgÀπu±QCh(kÁå÷vïq®Ë»ïI‚ã÷]¡É eK´ÒNªo…ÿì„C†úã∏jù{\p≠dôY„Ÿ›ÏX%bò≤ö≥RÊíü62å[Ê‚˜Œ	@Cá}™◊lö≠¬∆aúˇvLÿb≈[¶◊-È‹~Ê≈∆·3ˇ*~/oA˘º5aKKò6˙†~çP-u¨≈Õì>˚ET≤öOfUÿi¯"≤ÀGéeeM“£
§qW.πÜY⁄âAØ;v);≈√ñ}x¨Kûb∂ÎUJ¢f_©¸Œ®∞∏Qﬁ]ÀVq+$ÉqîK^N¬ÃT/™H©@Ñá»'}¡uËïÏÃÿ1ÆcŒfplZ|sﬂ]_;π˜…ÑWƒvXúïØ”æ≥⁄uºÿèíûªƒµ,Ê,WY]IoµÇÛïfñeú+-÷ÙFO—s,°Ï‡$¶ là=—[«⁄yxkkk≠ôfU¨5mvuµAk‘FØ ∫‚&Æe⁄ﬂUkáΩ‡nKXœ∂»¥—⁄∏áh|oA’fær”7K7≤∫±Ÿ;`É¶Ÿ[Bˆì∂˙wxW≥Êœ≤îËÇ?/nÚ6Ó.öÌ™7PÒöDWããØ◊eqˇM}Ç`Q´‘Q©¥,+ˆ_Ó±	á˙ÅWnÁ^s˙ÅÈ≤sÅ…=˚P${¬ﬂ('ﬂ7æ™iFåä>_ÂÜ•∆˙à,ËD0ﬂ„¥7Îˇ=Î x!Ú∏ã‹≤ü¯≠Z»9bR•_\e5]÷öÄPcvÉ¿¿…µ—^b'ÙH!,.ÕÜ:.:ÑU€≈¨ˇú<‡oÈ£ø¶lL¿∂ M!¶‚#OóåÔ—y‰mÁ" ˘#–ÜÒVÕ≥y‘Î¶;Z:∞$Ì´1⁄Æ1ø€·?¥Î˚¿ôPaRz¬Z~àlõ®=aIwÉÍí.∞¨#¸å∂º∑Bè'Ty¸Æ,86Ô√Ÿ$W∫*j"à˚`ƒÖÕ¬√>Ô„ÊÉC∞Y8"”√(£Ÿ}›YÍ•Á∏L«Yä0˜‹5åü∫	åËs'}x≥ƒTÎYö¢%”áÊâ¯≤[§∞≥¯©ËnIoÙ¶Òã∂/ÈÎΩWqEÎS‡{ 6;˛◊s¯||€ëÂÊ¸OE›.˘Ü>'JQgœ”◊Æ∫¸ñ…∞Y+ecÔS5@ÏN'•wQK;˝ßµ¶•ªÌ«%mø>…%-'ÌÓW¥«≤b‰˙’ºqO¬gÑ—L6∂©¸ph*èaî9áÊÜ,®.EH1
”bÂΩô†ƒ•…Ò»	ìa(äﬂm∞Ù4KŒ#*˛ú\aÌ`gI÷'á_ü’Añ#Óªh¥YQﬂ	#z’Î‚˜Á„$[(QÂmøüí∏Vﬂ:»Ö—eí£ó1œ±˙:ìæ ¯‡ïi™‡Záèé|≥îìB
p¿&wÔ∆ß#EHëÃ∂˘Ç)nÖ¿~á’‡®Œ—Æ∫í5@¿˜)·ylù7ìê?Kª¡Q˛>πÍ¿ì1#∂l†äF‘_qπÍ˚Ü÷!}≤†¨y[!≈ïàÊuF’B≈’¬°îRKT’∂‰7ç TSC(èhÌ‡S4√+;æçFecªqº∆ZÓ´ñÄ~edM∏:7€…áË∂+™a^Jp‰	™Ôå`$px3	U¥—m	˙3¢àtg%ˆ2§OZπYqÉMŒ¯îó†>ZìÌ[LÉü6—t¯êÃ≤#&+•í◊Ã_ôò#‡âX‡jàünW\_Qmnª∫<ë ï’ß˚K±∏ÎÕﬂ±vì|òn˛x˜6Æ1Wå™—-≠3Îhÿ *≈îÕnÈœx])v•èª¢î ,s=©±Uq5ï`ïµÑ≈∏P¬›Ü;FÈù.#ﬁãbÈ≤Á'πå¬ö¬íﬁóY:8¢*<ÓàKŒÆ◊V∏ZµXÒï?‘ÙØtët ˝ct¿’B§ H÷«#äôÿ£5o`7ÉX‘«,ø]]ûCXç£ãd†˝P%E›.©QãBá,^=cxò•®‡aì˜@R<UìêZHßÇ¢ w∑ßöÎJh5◊ï9»¿#*%!÷TNn8RFé0˙r®è>pƒñÇE-ãäÍ¿ˆhı&cmT∂!a\≈_T#[â¶MhPºukÛeúÁ—y|¸€qî≈”–≤é„MµÆDVB≥M‘,€Äı{‰Œ-˜O>®†„á¬—≠~g…êuÊÿ"Ü(àeÒYyÇO—◊GÒŸ5ÎEßqjAOˇ˘úåRË—ÖÂrøvG‰X#çÜX—“”ÉVtÛ íÃöy‡œ^£≥«ë¨Ÿ∏¢Æ/~
.A∫ùΩC∑Iã°˙
§õïE¯ü˚~˝;Ò–Ω9o9#–∂9÷[æÓYoúÈ/„{}'æH”ﬂåáÅ°XnqÖ-REøB´§‰ñ!e)∫†`	‰≤û.£bà¬îøBÅ…⁄7˜;JnõõˇÉé$Áæëeæo9Eº€,Y˜àΩÛzœ˜(PXÊá!/Ê8FAøﬁz‘J¥Œæ(úwŒ>ñ˛Ω[w¥l*∏∑∑·Já(S–pü…«{ÎDW∂ù#Á∆Eu–ó2ìøŸ∏ÖK“5  ¥<ãíÃ3%“µzÎ	ë5‹ ’Ô∑9è8>Ç•P¨âÔ-7k´_'–Q¢Fº†öØleAÍ=ŸÌªÏL}rÖúyÂÒU˜„ÒU2ö‚≠•ZÖw«Is»“⁄Cÿ¡p4C7ü˝¡¡x4ÔnHŸE–›E“Ì9ÀDÎ≥n±+$3Ÿ Xá$´-E≠-TXS^Øë≈ô1ã$O£$Ø¡9∏KQZ—ˆÎn4¢ÃWXﬂôb:$ˇÔ¢◊∆yà∑ﬂ˛ +ö
›À˙pvxÇ6™ù√Álôa(∫s2`a\R∂ÂgîJüèŒµÓ˝¬ŸÕÏ|ÃŒÉª¶”1ÈF]˜* ﬂ”≠eMb@”Ãº.º‰Ü‡Ï*∫3nØ©P+3Ë,∆h˜b±›î˚xÌñãknöóèﬁûÙe[Õ§“Ã˜y2@Crí•uåWó<ì~¬K
~ï÷—˝∂‰õ
)ùÉµQ˘‡ñO©!tz{UkÆ·ÑﬁÕ|5Mƒ≠=ªfª #‡•˝õˇ1H“∫≥óYl]Q∑À[H°Å£Ù˝ùÇ∑ªâHa„•ƒb‚Œ[õáΩqÆï”∫ΩAÆ™VQ68Lﬁ3ot!ƒŸ`;QXﬂ—}∂˛peie$’ù‘
˘Ì„á¯eÕåyMóﬁ±aË{k∏¿íÓÌ¿ö±avpµ¢˘hã> ‚'ÒôäK≥$ñKÇµbA«∂/úI\Ç;óîE‡/≠§†çá(2j;¢$Y`ÛJ√†´Çî´äYs±àû“Èí‘¥‹ïÜe∂FÉÏ¥Z◊ó(¨Lw:†lD˝(»∆#·Z!Ñ”%nÒ£™˛IÌ,k∞Ü(ál∂´áöºÌ∫yø∏æˆg∂jÏPY‹áS§B«∂q8›Ã…Vƒ1π™Ó‹iªßvJ)≈d9c°‚‡4è≥ÀËÊ7ˇ3Æ’Ë±µ(ã#/≈≤Ù=Ç˛Ømım}Ê=`î4J6À””,∆g≈ÏN»óKıOG6D"ı≤e'∞ÒFÆº™·ºÕ7πÄ•∏ÉΩ[w	›‰£x≠pnˇ©48⁄Ó∞z+6œZÎu! ¨S¯Ü√l˝ås§À(K¢¡Ë…‹˘EöèÊÏ«7h∏”†€Láñt}Ωµ√k`gõÀœ‹L™2Ç<Ó§É.Ld(¨}îY@˜C˚⁄1—;ÛS6ˇ2§9;ÚÌL‡Hîõ^|„V”5§níGßΩ∏KhW¨ı∫∞QàpAs
|Ûå–láxı.±
5p˝ù5X†˜¸∫8GUµq‰≠‘ß™∏—V™˜6H™⁄€ŸezyZÉˆóèÙ¿˜
jã	…£˜®2Uácÿà¨U-Œÿ6gœ"P(Mõ›Õeö¬Çôêo9ÎFÀÌ≤÷v∑ü⁄Xúª√ÅÄÕd1›àÒ2H¸.÷.ßZﬂù‰,È¿£˝ë˛T!˝4ãÿ</ÄêﬁçL⁄M˘∏èxÇ∞0≠˚kÜw1ßßõEi{VÇ¢’æ›ÉN`ñè÷>5ë/1Ñπgp®ÙF)ﬁ,ŒÌØ1©(∆l5˙È ·∆=˙˝≈∏*Úã‰∑X+ôø∂bo©
j'±ÏÓÒ‘¯âÉ@É◊&~ùd»≈|¡^;:}c∂=∏˘æó‰4ß‘I0◊Ô*g∆D-m≤Í∂xËÈ˚&òkOh’ÊπvBÈ˜Q¨=∆Àﬂc´á—4}RÆ∑∂≠¯ãÈQ(¨æû~´>í‰œÅ<£§‹ex;qÎâÚ∆j”®Bc7&≠∑Ó©/‚)]›Ç± ®…eıáÜÚŒ¨àÆ⁄∫Ú≥Á∞À8w/Å•√ÿc≠È Çñ∂ak`N⁄≤\ûÌJiºÚ¡gŸòÏM¬ì!˝˙ÜÌ¬>ã[≠®”Y âÖub"åW∂ã›}i·Kp◊ñ…ê–íŒ ïÆ};HFÿ#zåÔÒ—>—è˛Ä^ÓÄ∏Ú2æ÷ÔxcÉÌ¶|ª?nÄúöˇπè∏◊4˝ô≤èÏ•K?óÕ®w_/X•FcD?(ñ≈S˝Æ‹∞aπ·Î¶œˇ11' áLÚ•ãÂ>BM√ä@váˇjåìı£¡Ñ{?ÅûÿLJu u∞õEg#ôRM#ùw≤Ñÿ\/“˜2ËkâÇnÛ_%£ã÷ºËÒ≈)	}å≥nA√ï±œ∑-”Ú?h≈Ç˙«xoöAz…T£lÙ§{òvÆXù◊‚õbO#v.?C`±∑
úç®z◊àÔ®∂}ç”+à≤∏±œ™Ò=æxüò£˘B}∑„ŸÚ<îÉ/∂„jÎ’«{xä„˘(¶ÌKlz—l∏˙hµ·>?‡≈S[ºdK•—e˙π[c‚7êo)ÕYs∆√£GQ¶‚µ|ä3ø.\Õï0OWﬁ/@!	’óÀöHªÈPäßá ¶ßõ§∞pÒ∏ê´%ÃQy ™!∏ÆíÂﬁlñÕgQ˜<ÆˆÁKΩæGôù´•Ôk†lbJ»P·2F¸ƒÄßŒª√bA∂ŒãÀŒR®‡%º¨,πäP&ä≈áq6À(réÑõ«"ﬂ®îûÍrçN∑ÿü˛≈!∏∏SW€Jp?o˜i@√S⁄õoÇn
ßm’ê≠&GW¸ß≠æÖ√ZâËÀ%≥1fÁ¥óv~3∑%‘îõ?r=ôñ{yõoDxY∂¸‹BïªnÒ¢VU‚pÆ“ƒ=Á≤»‡,ôÌ˙gåµ&
Ø.Ó]i_ˇ¥mù+˚¿Ì∞ÆV„7≤‰’%)∞'y)°7bÕ+N÷¸–‰Ã>´zsËmÒÆSÛ•√St†7YÜkÜ∂•›p¬Œ$Mˇ}@¥“ı·≠î fÁÊÔ`z—,Ã~VLQkã‘›|?J:¶Ò√ª@ÇàPlA%è“πŒ5Q∆ø»oªê›áùMºJ§≤Ò;îkU≈˙™w‘√†“8E"ÅÎ'¨?pt˜cXe¿∏Ω,˙—fﬂáï∞‚Å‘∏†¸Ïµö-E(‡ø(c\x1w•OWﬁ–H≥∂ˆoü∆_ßhWÓ&˝ÈœR«ªùö£IVÀ;÷∫?1æænø√â¢o—ôß›Ü_¯∑Sˇˇ507ÁU‘S]äΩ:ò
X˘˙´•á!TîWVêÄza∞˙~Òı⁄é™¡È€q4aºËõkÔz"âê∞mú1ã◊I·≠X∑À˜z´Ûum„‰°ıá‹ß¸⁄€)Ï2pÃøj˚Zfb∂æ$Õ›BΩ˝Ò¯øõ„¥·ie›ùã^„4°}fL(‘á»"o˛PÖöÁc¢ …º~I@1bÃZüápö<®Öh∂¶1nˆ«æÈV[+Ò}…éN6RD¿/Lz¨n˛p€√ﬂYTo·ù‡´è|wlrÌà7˝ Ü⁄ö„=Eﬂ*‚Æù%<É°◊5ƒ*∫…†”CZÛ'ÛËU∑n∞w˜'¸Ûı…Í⁄∆ 
¸ˇ;!	˛Ç÷>É›Do$8∞¶ëdÈJ∞"œ  m2Púïe¡k¢H∂ÖÊ∫ı∞—W¢5√ﬁÉÉÖ;µje|A»tÔŒSAIπ&⁄pºzÕÀ´À»¥7ÿÊ.∞ô(;NŒû™5`]âƒNÑ˚Öñk}ºR¿ÔI„ÀD€QÅ(9}Àa#˘LE∫Y»1ÒaÜ;†¸`|ŒnÙA*‰_isSÄ·ËÅÊ8≥˙∞Í√I√àU™ ∑SwCòÒZ©EÏÔê”¬f
^QÅ˙“-kÎÀZy°ƒa:pã*˘jã»Y„Ãˇ®ƒqÒ8Z|ÉGmŸp€Ö—§W2*Àê=ZFKÒ&˘˘]øÀ-@%5Cøu“«G–v*ﬂ£jÉªp‹ª˘>KDçÕ2”Öá$ê8
:œ.Ü‰‰[»(uµ™‰TwàpJë8Ÿºπ∫Ï≤uó⁄Ü`ºÂÄ^•ó)’B15‚‰EU≥Ûà˝˛t‡Uñ˜7î?◊¥T‡ö.˝∆…˚EZ¢ª≤ëUºwºs¥ø≥}0ß«%czO1P=Ÿ2<ÁAT/)£ìãd†»’Ò•…©˜UF\€«\Î!Ö;ÛM'≈w€/éÃ‹¿aü%W¿Ó[ÛÂ8(c#d¿t£YÒâ"ç®¶&U
kPeÊdqá⁄+d˚dõ¡29‹;ﬁ∂gúì	€<h“·æªûÙ5Vñ(w4,àCmô¨âxÖø:≤ˆ¡ˆ¿¢Oe !˛∂S˛‰9^7≈m£4ìg»Cœ‚û~Tö∑Ÿ Ä[S•2EŒP3,◊,é·Îj.$ßÀ]ŒJ=«ÍSç‹Ììv∏6öıéb2sc*rèRäπM®ﬁvgp˚u©Ô©:Ÿ„∞`ã"Ô¡ôüË§∞é_Ú√1ÿ%Ã]Û∫ìlÊûØÜNÆ)<ZwH!Õn»ms≥∂62˝˝∞‘QîuZ„∂¿Ç[ëßäd\Dm4ãòÅÉﬂüäc;Üg±¨⁄≤X¨Åﬂi4ÚÌeâÍ´ºLÁˇ‘‚Îµ7L÷ùTMUÃFùﬁá+Íå©ÒKÂàr &)ác=3+ùtÁ•∞mtØFŒÏi,s^˘J—±Æ€-•ñΩ%∑°îX4æJz	ñ¡åÄ˛0e$v"L≥¢ø∏»Ú¥°ñ%äñHsµ“îÃSTª(è|çEøwyëì+–◊ÅÊ_ºávY˙!ôy‡pä-éI'ÂÓSw˙Å"‚‡÷Ï˝ëÏUÊ®BO4»˚ éÉ≠ò&`Ò°ë@¯ ™ò3Ä ‚X¿ä;ˆpA•hÜB£Ω´aFÇ+Ûfeƒ*Á®X#'ØÁwês˝È_ˇW¸Áß¯üõòCÜSÇ´àÆO´{√`3 Ë01'ÅÆuj±ò"¶B˝0/¶Y~V(ã·m<ÊGJ‘A–ç:àÀ@…o™Ø]∑›2cÊ9ıøDä?∆ˇ|E¥ˇ˜üÌ'ÔL‚óÑtìå›üúrmÑ|uö≥ŒqeÌªÄ÷,MÕ_ø3á=”y}Ä≥˘ˇÛˇ≥¯g6≠ãˇ4guÁrˇ≥éˇ˘‚œlVø¯'8´ˆi
ö8ñ+”rjÖR¬wd˘ÊS1ÕiΩ3â∂bH¶6r›Ü<Kü$y¸4Y∫cö<iJVB’ÉV4=HPÄ‰–º4´Èi§ñÈ≥
0 2—iL˛Åÿµ∏qedÊv[?ø≈"âqãÅ É¥ö*YmÍ¯6ïb‰5#Giñ§J˘«^L∂«.Fu&ó–ô’QÀL¶Ω≠¸#¶ˆtíníï⁄≤M„»¨	ö‘)e˜xKA*ñ¨ë£ñp‘ˆïpÀ6MÃVROˇ”ﬂ˛Áˇ˚ø˛≠VÅ”(d’—‹Z⁄fI¬≤(Ry_?l&{±BCÒ¬"Ör9ZÅıiQå˚ëæ0`Œ&ÛÃf/®Î[ôN†ñA“z8Ei$£Çh5
ÕBiΩ¨˝C•wxQU>ˇ©≤ga+I~}ÛΩ•z™≤	»<‡Ó@ÿDQ«xÛ˜ÉN±Óò„+Pt]ú√ÓÄExy˚ø’ŒÂ¬∑qó´*R+‚“ÀÇı÷f˜∞˚vüÛâ¶Öê·Q„gGö~.“ó1°Ó°c¬KiiUp\èl”Itù∂Ê/ËÈ§ì⁄£ˆ¨X‚ñ:∆i¢îE›¥RPjö9ONπ —¬~úfG*«‚Fd{;ú¿b1tEn|n´Æp3aâ,XŒxâµπµ‰∏≥®∞∑|*k“{ä¡ºJ@äŸ°–:µE‡É+¿´9≈ÅÂﬂõ’~ü¢˚‘Uﬂ=%ﬂß™˜ÆNM`µw_k{8öw©vD≠˘Oe•Óà˛¸∏PÒ˙î™úô;[ßp∆ÿmé„&! wvˇàùp'g	å	ÅIÔHôìΩåÛ~ ∂A5Ôﬂ≈˘Ï’†B©∫V√ÜÜ√U>cJ˜o(â*N„ãBÛÊñ‡|®ÇKÄ.Æ±V‹àE#RóMrÒD±]ÆÀõ
çV†‚ÍÌ ≠\üù¿î!∫Á˘Yûû≤wøcN∂{Ûwß˙èÎácI∞ü‹◊ÔˆÅb`™gÃÅ*÷°h›‚\6^a>U˜ñ9ä*J~≠r∞eˆ<Ó\D\ù+ó◊ {ÁÂP≥(ÎıWè./ﬁ∞>O¡RnLÈ`€—≥.Ñc∑3Vƒà˚¿óN⁄´d≥òÉdr∆∏F¬§Îl∏~NR¨Öyñ≤gQ∂¡Js;˜—¯Ñ*Í)¢ô·Væ¨4gX}≥p‹µ lëkïHfåÎÔoê-„Ve∂VC©äû˘SNÃ◊ø_¸í]¿ˇ†Ô„?èª∆¡öQ„ ·í›âK‚O} jsÎ+IõﬂÊ∞	‘lüG≥àU´7E«ñ@HH<@¨⁄ €nÃM:Hqx|p¨·˛)G∫ë∆∂Ì.]o!wŸ78,jrC√√ƒ9„+JÌFoè »—Cﬂds≤cd∂8'óL%ÌèÆ¨â0"MüB˜º],>‚{„Kk_ã—@’3Êg?cs…‡2…ì”^<ÁÃt)#´Ó›”p=d+‡ÙAA’<Ek‰T˛ÿNU€iÕüÒ(vÁdZ6Pük:[ï™Ω"≤£:ùk””∏*Ó‡Ââv‚‘◊1Ù“(∆“Ω¿Ñké≠_YÀ˛ÃêóÈÀΩC¨ºÃ=—ª+â< 0†/ﬁMÚÊä}G©ÔË‹i}#(ïP*…—}vøzøﬂ>N`ÛÛ◊Ù‹US⁄Åïuï˜» OÍ;¥{kp¢$@∞|ôsö1Ùº_L«˝Æ‡ÎÓ@31/#t¬íâÌÍ¸x'Ü¸
ª†âö.}o∫ÉÅºc≈ §-Ã5†÷∫‚q¨äØÒb≈s0 c9óî¥LÆ∆|é-tÖÄ∫âß≤ÚÆI∂¿Ω aaº|“*µ&È6áÁ‡"£,ê∞ ôîANù=Èy‚
s‘ﬂ®Ñ|ª°+X·yD˜õ«©∆Ωhv⁄yŒ»Y%Ä£+ﬁÒèˇp;é·aÆ-‰Ïç#è€QZÌ˚fCmß«,<‚BOhyô:°ÿV~¶ê†XgúÂ)h	i¬3WDä≠7÷¨a)Ò£¸P:d®⁄ÓxXYΩ·÷v“C˜ò∑ia‘å9}»®é¿∏"˝¨óvË®€ïGÎ†@‘Ôƒy~Û«À∏áﬁ◊óÈi“ã›¯õQ:l$2’$± U∂&awJ◊Î’r&‘ktŸmÅ61‰c0íäÌj5]—¥	„¿ú0«ÎAóµëSô. p◊vÄ=·áÊïÚ<g"πé‡∏v0‰îG=QFΩÖM[ÛÛT¯≈‘Ëh«äcZtªvKÍñRsÇgÙèªyî>
dw–S	ù óB'‡Ï-±ü÷&ˆ7£Øßˆ…íçwÔV;∫?cíë˚ÈíåwoJíÒ≤Äd*ˆSÕ%á+ªnàüÁò*˝1HÒOªò‘o8HM`ø¬T&Ø.∞’¯¸ª∂ÚFTÌåJáz‹G˙EQ‚–f=HçÜiR{w∏a®º¨[ «Î±‘îwlü‚Z"BRè¢˜'f=ï–∑ì:ﬂ¢Ê~Œ∞lqÔ›ûÿÚrXÇ¥Œj:§{s¬Ëg‘˛≠€ˆ‚–¨Ÿ˝AÙ1ßÜ∂¶¬Pê∂T´´ ÍKØßgÖêXÒÔÆ÷W∫¨CLr⁄Ê ã∂∆Ok∂Z :N}ÂIÎSú{™ÍÍ≤3ﬂÆƒkHu÷WƒqC?<ô¨∏^AΩGﬁ˙d√ï˚ë≈CÃ/ÿQYykt•:dï£Lf‚x£äApv¿K~ä⁄é4$‚kdïyPÈç'+˙ùÒ„Ÿ’9óìÈıW‰õAÜ¢Â‡‘É:ê?≠»õe^∫≤Â∞ˆﬁÂWs™—˙—µÈ/πù…ÈN4√6ÎîØJ5uùœ`Æ}‘Mﬂ/^Âa˙4s°=bG®ƒ…è¥ïpasÆp45≥πP.»ÊÚ"ÈÎ»e€ö>€gıüæ‚jÔwm»W¬”æŒå»_û6√j!g—LÚ">±c–Ù7ÿ>·±óëªÒ(Jz!∏.Ún´&(¢2 GpD®ùh¢øêÀ¡fÛÚµM¨6ã≈l_—*¶Yæîﬂ NQRÛY–\	x‡Î∂€a'X81É«†;ã‰IN≈◊9H∫KÓ∞Ù‘Ç÷ÔìM›–h—ó¬jΩ7—êÏ‘2\+iñ◊A6Ü|¿ ıËÏé…+Z@‚êê™,Z∫!Ûzı±À>‘1ÙbõÖ◊3b#F¡ÊD±Ç°Î†˝´k*h?aÙáéë1fVF√äıéÎKbl9*›æ™îŸ
|©•œX√ß®‹¥∆)ÉµB«N∆:çàyıëf˜4^MÂ~R√∫Ñ„∏˙=¥d££M´ã!*Å$‘◊ÀƒgπØ@zÆﬁ(¨Aá®#·%ãKã∏µıÀª∑>ã@èCUÛ [º”-√<(tL®ùﬂ√Ëv8î10[‘NãHu:åŒ±‘¨¯›4fÄ%éMu˜À2q¥:ÕNE=Xê]*∂ˆ<ÕéÒWåek©ÉÖ2˙◊Mäxz∆*?b2∆‡5√ïR]UÓj∑kóÒ—Õ™π}‰ÈUÜ ΩÂ#Ã¯û—2OüU1âò+Z
HGq?Jàﬁµ•+ÍºYÌﬂfK—∆å'®)0$Œõ–&^é{£dÎP¨û¶zƒó_è∞GuÀç›≠f∞^’@Ë[—bπ1∞å2¬ÚR9@ÓìƒÜf`7P≤B—¬_l≥Ωø‹?>Ÿ{u≤wÃZçÜﬂ)”πMA˝=OY —e‹[‡©˝ÒUß7N2+§5Ω≈‡U¿~Ãå ™˚+æîkÂEí≈OÍLÆ∏wÂ\ßlÄµ)ã≤x&ˆÀê©\sMÂ‹û!/Duï‹«]Äê6
q∑M}4~âÚœC,Äv∏˝W/a™ﬂæ‹;˘Ê`˜Ì¡·…˛¡´„•≥d–m•ÿT∫Ñı‡—ø‘èG©+õZ^µµAîŸr◊¸
ãÎ*KÅ∞äçﬂÖx◊;ëØCÎ4R~ÿh˛t)˙„BﬁÑø¯Ó¬™î^õ£Ö]>∂ √F≠ﬂR∑*˘Ô>a`„˛ï¢âé%ÅZGâ¨=g±óv‹Ü|ÛÜ˝°,êì‰ÈI˙[ÿÌ	Á›–ˆ≤W≈	‰{‰ﬂ|ÉÙ2¢ OXOÌ”I∫üß¶kÄª‰e‰∞€Ω*ß(2dÒ_¡6êo–(⁄Á∞Å\JîÖüµeØÅP√aàãí_éJA=6ˆ3ôhÜ†bF5NnQŒX3´0‹gÄVÑ’5:ßÂ∫@My∫BTZ∫o∂ERäfo<‰ãÒ∂˙´“ù¿~ïﬁò¸√†√∏¸˘Ö9Ì˜Z—˚(A”j˙^ Ω¥ﬁÌ	¡%Œ1Z AEh|–∞±^¶É7∂üæu…õ‹lΩñAÅƒûÂº™XŸ±_GL»d∏á;I¡Vœ∞mDè@2ßpG ˆ_ÓÌÓoül„ø◊Ë’≠º6OYD8àç˜Yëêπ,rIªÒ0MÚ6&·˝–ƒ∂bgò©…\Ò≈ˆwˆ)/6Í`äkJòQ0T.VéY≠s‰e⁄!0UÑú°gÀà˜;∆Ó@@˚≈çﬁÀa}PåÕ•#œ–Ã∞(£3f	BÃ∫OPYMY~¶'⁄∆∂∆õ§€`}î«>HÁà⁄æPhΩ-ô˚=Œ‹ÉY7s"≈kõ¥%§N‰∏˚ QÍŸcOQ ¥Ë¯}Éw–.Øòb”DM)¶á9OJ"√ŒÔéa„∑ÚqOAÚˇè˚Ïß®ıcu`ÿ+ÕIÉÔÂvÜ'XN‡éÁ´÷än#‡πDãzß|’(¡àà}PœGqwû˝5∆P¢ˇ<∏Ë–&/;©ﬁ∫Qﬁ⁄¯ı–Á,Aﬂø«ZHXqîÓìÌ…é‡‡∏FŸá&'A—ã	)≤,Œ2ÿê◊“≈èáÒ0¬†¨•≥,Ì∑Ê/1˚<üo/çá(y†Eóòø|£\IA—PÍÖ÷∑∑¢°}ˆ∑Öl3πåªoi¡ﬁ∂µ\,£rI5nB¨#9æ∑¸Ë‹P÷üH¯7 O∫7QàöïçﬂŒßµ˚6¬ ÖŸ¨ëÎˆR¸€÷|“y@2ü"
™¡BfúÅ—zl≥—EñæÁã≥y˜»F§¡µÍ±≤a‹x{ÿxk˛ fÄ`¥±Ì‚á˘Èr†≤ê≠Ô¢S?§cQä) "∞Ö@¬ŒÈ.œ”h…õ¸jπg¿ &î1HS√Ì∞¥0éÑ[àîœƒ{•mBPΩ·‘-'_∞nQ’.nníb}g€B∂=!óŸ∂≤ ∞6ÓkÉÂÕàäxuΩ“,PwUP'y∏fWºÅö?Å”ÈNW•≠}4°–{Ù5Ä^Ì•Ùr˙∑qˆâ‰„ˆ·öu¢QÁÇòÇµl~‘•Ωx)Ê[w<
 “\[ËÛt6§àœGÒeúçPnFæ–âÑåºÄ“; ”®\föÁ	fZIM%+‡1M__Ç
¬∏¿N∞úÑã$p;£,ã>hjz_2*Uò'ÉNñe≥ÊrH¬ö–›tqÅ∫›‚µﬁΩíå©ƒ“‰• Å>
sÙtÀ<èŒ9~N¨›º@ —t˛zâΩB«$∂'˘Û“ªF´Óç;∫o√Vw¥öÙñ–®â∆•IãÇ∞ã[,=7˘&Ì⁄h·˜v:Å∏"©Ôÿƒ≤å]◊ZŸM<nı:ÕŒcSsl‚±1{˜£∑‰Goâm3ñ∏ù$ì·R)Íı∏%˝õ-∂J9ˆ˜ç[ØØD÷|#ÎjX	sïjíGg1Ø).‹"læ€]~˘í}ÛÕFøﬂƒ¿˚Ÿ⁄∫Oë`ìx`{aÀ£ADbì%@‡ƒ˜DÏ[´≤iƒ-iÂZ6zW‘n≤tÉBiÄù»ç(2fí+ö•˘™FŒäjn"Ah&WøÃ∂©Hº§#œìÿœÈ'*\ºí®èsà÷˝À#∂˙z®ü¥*ú©\Tëœ‰◊k”ãh·BP¸óCr˚ı`1≠ë†∆¬õ=ÜªK„C≈äÍŸ‘P‰›⁄¸KMB˝s>Òÿ˜"P£twöüÚ∏z3Ch9‘åÍÑPk0]®÷0w$0bÃ⁄kÈ√¿Ïn âS`%ÔPüÚ6Ñ«ßUs`Ó†~ÇZŸÍcÖ6…Ã˝Ä§fY·ÿx˝ˆ´"˘ºäﬂk˝ÂΩºÉúË9$v DñR/ÜTÄáò˘—fE#ëQ≥˛3BÏœÉt∞!,P
F†√#;∫Ç+O˙°ë¬pi“!√fﬂîˇÉÇ.ÏR–#&Ï¿±°OºZ…®!πœÖ˚@Q8åo{r∑=A˙≈¡©IÅl√¡•~^x»€‡*Pm®§æ¥‹Òÿ¢Nv˝ÑOîça…uÊà!≠£˚m¨üRÍtt˜YÎßÌ˙∞ÕeX˝¯˜√›B≤·ï´61^π¥Ãq/UﬁΩº˘˛jIDº4''˝tÔjÉ≠ØÑƒ–i°^è®w-Q¸aH‹ïàÒ+áÊM›W.5ÄØD0–ñŸ'ÚW€
ÕflU⁄ŸFãÎAª:TÚûŸ*íS£ıRBa⁄∏_ø[õnîX`ﬁÌ0Q›(◊—˝zﬁ®ÃpöT∞≤OhÆnçO6É	´m	ùØê˝^-IYpNN…‡™îÊû'‹
•TeáFnw•Fp]+‚ˆ∆π›*€œW	 o[8¸°yPjÉXcˇΩqs\T1Ä] Ó˜É6Lu≥|ky∑ﬁ‘¨ØjÖî⁄“RÜJ‚Â‚ˇrM—œÖ¢Ó\iß–~y@≥V°N+ã£|´ù>∏V»ø6‰=˚ÎíÇw†“ﬂAâQ≥âõå‹ƒ≥|Å^·,ei∞#L vÎ7≥úU¥—XRgÖ≈A#πgﬁ∏nf!Á€$}&ùñ°i/äK÷©Ñˇ≠+`ÖV &1,É≥~TÃ:Î¶e\à}-LhíÏÇ>M¬‘
πyÍ¥!/wLñdµ!_Uôü!µl+¥¸ïÆ|∏‰Ï(–(d™•VcWA`®K)k◊÷£÷fñ‹l˛Îa$™_ÿ'K¿1’æMx®Duƒ.D$Ö±’SFìYæ™b=Ÿ5g≠∞¬fÆùO÷”˙äô:d<6Äë–\ü ¨î¬lˇ ¿>$ ÷-óYù.´ﬁo`ç˙3%
Ã∏«ú˜’∫IUJo=·≈÷àB⁄.µi£3Ì∂ ≈ú2°=ÄBîˇ†«ÎÅ]!]ÿ0ÓaU÷è∆Vı.0≥∆Ây‡‘{`U“aß÷@~’»ñ¨b˚4p*Î¿‚Ω(%Í<ƒ+Íü¯B…⁄z.∞¯uÁ"∫åŸ·˛_2,{ù.∆í X≠Õ∏fDw2 `∫eà5·•BC™Tz]eZ∆Xˆ0.∫´ƒÔ!é9ﬁ’ÿª…‡"N≤4»µ]≠èFG/áR¬√SFcÕ&®	p}•u∫í]ê¨7&œ	‹h€íﬁ*Å˘v`®ï´°=ò_M¨¬¸2“mﬂ#*Ç#c¢v*Úìöt+ıQjQÿº˝TÓùT£¸‚HD⁄”
üõCc⁄s‘üÇi´ƒÁVÇ‰:~9∆;J?l÷‚≤«”ZãÈöez±N÷{ºì~1†I∫-èó›™ìÚ]¶g≥	2®}h≥E÷™7ÚJ
%©+7∆@e À∆⁄ »≠ä∑uãrE V‘¬n5ôk ÄU∏*W9ëπ≠\!Õ‚¬<}qU‰…ÎÂjú]˛:ı%pÀâKÈáåç6+9Q"l£0øÊ¡ixïeì¸8∫Ñy°˘‡ïÇ“fâIÜ2 kÛä¿º—¥/nï?È™J*µÂ(ÉŸ$)6Rÿ∏…Ëv¯â*2áﬁµk áó,
Fây√¯<≈\t"!âùÁ„(ÎrsfZW‘Àv5î√+x“ÏåÆ|›Æ°BB⁄¶´;Q6ä“∑›+g”ÅHwÄ¯œ„X÷5í…Åg%?&≥ËΩ(tP9~_≥ÁD´•\Y±Ç√|?	p¶Á¨Ï\y∞ oﬂKÿÒÚ≈e'~ŒZ´Ï+πÆ_€º8°À&˝A~ Ußı43∑ﬂÕ°€Ï¥-åîæ≥ñf¯0;âÆB⁄B˚Îü6ä“ûÊ.◊√åé·0.#S√˝À™û≈¯ŸCáüpçÊL ∆7rÍàóÛå©3§—ôûÂÄ]Q®§<]:+¬lÃÑa˜öqùp©"@Ó‘º¬Ó¬¬r¡DA{EÍM.á1ñ0e9¡2Ym g⁄|\Ø¨-∑n•Œ”e¡hV'•¶HJ®áKç1JcÑ§	Zπ¡0®¸¨!êó‹’¨'h∂}≠rã¿ÓxãX Ì•ÀÔj‘|CÉ∏0	2I<x^˚µ‹	Ê◊z5È2(™ô&◊D∑ö>çpÔÓõΩª*Ä÷TJ◊Dõ6ıÜÌ’Ô¬ol.sÍ7"\£¥˚pÓ\ï¯dhÊz∞26¡ÛP®2∫x›$[ŒeÕ˙Öjﬁ±ªó¨Å~%iOœ>≤8Õ{“@sXØÅ"˙› ÊäÍﬁ‘-ÊqŒ÷T<V⁄<ÜCv4º†K®ö!x
…ëﬁÉ¨˝.|q≠§·‹-I-G√,ΩJ˙à£à4π˘}ZÎÉúâE•eü2Æù≈Y<Ë$#∞ﬂBLåÁºÅ$
LúoœŒ—´÷bqß–U0Ã∂ü©B∑p˜z'¡ómÈ	F…zçC.>h
ó^R\q`åóõœÍ6Pf@ôA	é° ˛√ﬂx(›∞fpiNï◊6ü≈gO&yÁ"Óé{Ò≥—‡(>s,ÑÄ ∏°ÂpNæ´Ñ–∂©Á˜OaõI~,Z›Ó†òîøåcLgoÛ¥}◊ÔEåö¿ÎÙ¡	É	H>à ™Qn	Ù4÷?]uÏ
–n@?™C‚√˛c£mÇÕbˇ”º5Ëﬁﬂ`ÔaœßÔAåƒŸ71πº©3p˛AÁx∞¿zÒŸhÉá‡ôÓËB|Cü·0ÛÙƒK(é‡~∏‘IWÌ•&Å˝!W‘`XÜmÁ˘É41.∞ÿ0"æÆÍìã∑‘Ö¢;sqµMT-Pºj+PLı<ø‘45äe_ãÉîï&<¬~Œ88¶=å⁄ìv;1(¢¿…®øò†2ò<∏}No¢¢IÒydœ"Ù∫´&N˛CnV}O„W 9Ä*|òÇÄÿs,‘MwïÛ EÈõÅ~è‡¸¸›‚Îµïï7sñåë:.Ë≈ózX£ŸÍ≈*ÖÚº˛…j¥∂ææ˛¶Æ˙ÓUOì]ÉèTc1¿J≈ã…ÄùE]˙˜wi⁄á1mΩ;Œ"⁄:´ﬁåÕ|Ù°´ßd•∆Ñ,ÒÔ%ˇ4’X©˘£‡™NÓÊΩ|umÎ,/ﬂ4Í‹:”|
|Æu§∑n”≥ñ@¸≤íÅˇ∞ Ë#íÕtY;<€µÂ/QTÔi\Ä!""lZæyÎ≤'BúÕ∑õílTA¶-bv„∞ÙÏyñˆ—ˆh‹Ù5ã·yΩ[)Ido†rﬂ]Ã∂FSL∏4Ûiﬁπà;øŸI≤N/÷!ŸÀ(Î»XŒ¶«Òl¶€€•©
?Ñ,óö&∏§…Åë∑)$‹Ä¨∑I…uç4≥“f(F}mıäîEÂ&DõjÃRä?Ê‡ŒÂ˝âÚÓ•é9¬KP¢m2›§fÖ"0„·N9%A§§Ôo/Q‹õ‚∑óÇ€€≥4®·∏ËöäÎ≠.©Cu‘pº'¡@Ø 
®◊4ìXØ◊Ô¬$Ö2Çò

z>Â 4ÒuÉ·Òñ‚ÆÜT-	2\ÉÛV∞õÀÓÑQØ¬äm`Ã¡¬Œ5Tq}ŒPg†(à!ı·§5‡ÿ≥~[±ÃÊïôØØõ?v”{u;≥&l∆«õô»u^&qMs∞y∫^wÊY Åôd¨3ím|FºÕÂ-áéŸM;c|5H«›∂[Æ&ÊñrL·ıÅÕ.–üö Õ¬ÓÍ ˝)ìv1SóˆIMnMÊm≥Z·X‰€!Ωÿ£{∑ÿ¬ˆåß√3emÈ±≥â©⁄©∞0X±è÷KAp‰ÄãrvM÷µ¨IzÓyìBù98Õ„Ï2Í§qn%£m>åÉÊCK ﬂ¸œÙV:§|08Xe
òÃˆB…ÎÓLn˛êÊm+±~ò)VF£b¡ÜGåx“f+s_ùv£¬\Ãgd	`\jgœ@Âhmø¯’ˆ_≥Ôˆè˜üΩÿcãÏ’;ﬁ9:xÒ¢mÊdZ›w‚T-ÆJ“çtzê—ÙJeÑóQñDÉ—ìπ<q´$©R°Ía¡˘§i]’ÍÍFÀí;™Œ_›h©´ÇU˝Ay`IâOz*Iu(ﬁéd´†á’h[°—Æ◊qúsŒ ù∆BÈM,ë4≤‡TìÓÜÆ≈Z–~◊eË¿]O·‰∫û#ØÎ¡C¸—˛§›?pÕ≠”P»ﬁ^Âªä¯We“ŸÕ¨¬êπß!&´ƒ9≤Ù◊‹KØ◊ﬁhªIç.1iön-≈ÕJCúúı‘á÷YshD≈E'§ê˝|’Ãıè\e
8ŸöË&çßÏ›—ﬁ/ˆèOé∂èÿ·ˆ/®t‰¢%ñ¿Ä{ºäæ‘†~#.‡ª€Øn˛%4-mÔnã∆ZJu%kî≥Ú{ª]¸ù3ƒ≈µ.ÌŒÒ€-?ıd,†¸≤ÈT}F≈"4]\Õñ!∫ nªÖì"t%ZåâM‰¸/ø›?ÅÂ≥{ÛØûÌ„Z<98Ÿ~ÅãÛÄ#x>ﬂµ˝bˇü√-ﬂÌΩ¬ı≈o†«v·ûÊkC(tπE˚ssô¯öîaPz9w:qû3˙°N6˘ﬂ≤ô$«≥ërÔ¯˝≈yy]‹É
±ÂƒÂ÷M„¡ÍAK=ª∞EïÚî{Ñ„;NÜ#l$Ó‚°qò•›1â_∆â-πo∂ı¯Döé∂…ßzù∂Êá≈˝ö9¢†˘uI;3Åù7í∞+™ÇÚ
k2qAT¨Ñ≈≤GUÎ"FŸálôΩ¬“P€¿O‡üˇ˜ü˛Ê?“ä˘U˙¢úm˘7ˇ™t9“BùÎùã›QÃΩ+œwù˚…Ù@15î~ÙÅuÑÅÇ=`Cxl}¸h _w êØÆ8e€™öøä*¸^¨	Ó∂f&"KÜ§J†≤Ë7¨ı‹&Wzç÷=15ú©n≤fÒF€ÙÀM´ πy±^1U Ïb-˚í¿…ótJ;¬Hï5Ü·ô∂u;2NM`NÎñûÖÖ©’s˛|Ñ0èN ∑F{Î‡òeÒy¬·[@*ŒiwÂb{Â ÷Öà€#S9Âs|ƒ‚‘ØÜkUfØ™%öÀ÷¿÷vÑ∫g¨¸•ù±»…aF4\”“S÷˝Ïã`ñ}:≠‘8µÊl^<®/S‰…É.V»k,tã5Œ«˝î¡l·Ñ¬ä|`yÁ≥®{óZØ0Ãi≈∑˜”A™»Ãs[?±.≤§vQ‹Z|å‚›∑ÿ›Ën˜Ω,`_˚	_ÿ+≠Àﬂﬁ-ú^ ?ñ5¬‹vRwY.sŒÖ–∂ÍÒÏª-´\:¬N-˝vSêå>\_1˛j®˙bæykÑøE¿ÍË`Êå÷|[ÁSŒˆΩJ.î’0]I¡ti<Ë†]ßŒÄÌ‰I9^È;>*ò¸≈nht∏DU˚6’òUë¬0¯©Ê#ÑÆlRtj¥l‰PU¬ßOôÌ≠Ó.ﬁ¥¥JgJø¬q’àx|!zÿÛ®“(éfSQ∞‰úñ*∫éïÆ<ïó
”#“ŒÏH⁄€E3.9ƒ;Âõµ“‰]Ö#§â´m}¯îÜZ≤ï˝pQg^ƒ4
Wb7⁄‡Õé≠£VË´£ü≥\˛ WH?Øäm·b#Ã°˝Ùû›©—ú√#Y#.’y$˜F—f=Ùuû»öÑf·«™Ri	ΩKp,Û‚†√Cﬁf∂ŒSk£‚Ò‚vúo)¥„Xmÿ≤é`zÿ≠‹ìzÔ£∫lÊ
rÔGJfvGLéO∂±˜ˆ‡hwÔà‰Aå“Wø“ísìnëêãùI∏‚=/∂üÌΩ8~ùtﬂ\◊ßô∫≥ÃΩi°Å˚€*¶MLú*Î˛m¥w¡#÷ù\µT|©Uï†eß§
Ã`ÁCimÿ¸6]nﬁsDnÿm
ÙãK{Ø„7è®´AiíÓ›)d!yÄÎ÷vy>"Úï„≤AÜ/Ê]Ø≤¬ˆ≠∂¢Íıw£ƒ›√øøÅ◊›,áΩﬁ‚õ≠‹É•ƒûLé/¢,^ªÆ¸jö˚—§w±∏˙à[ƒ‡‰ÁÄˆ„Ñ8ò:¥}SwÆπ5*Å›U˚õ-Y◊IbÌsX^\
5≠û	æpPÓ»5qÏhy˘]∫D˝ÔíËW—(ﬂ-g—B!èˆÉÂk˛æ∆Æ”<˝*Bë
g€vV¬d]atEK‰€u¬í˘^Ô˜'[UxΩÈß≠n÷ù¥?å≤Q“ª∞\Òïñxp`˜“˜Í™ÌÉË1Ó[Í%√Ù19´pY∫YfΩy3:‹?á›kË$¬ôÏﬁÊõWT∑'·ÏâEVw>¬ï '¸QÆb:ÔEÌ≤∏’P5˘óÂ≤≈øWïä¨Í^[≠—¸ıÃäÍ"Øz—†¯≥¸¡EÍì˚Ÿ!.≠_%ÿkëÙô‚&ùGóÛ[XÉﬂ‡' <zÚ‡· ¬eÉ>yÙp≈∫Îy‹øh”¡≈{Ë.Gªs-Ú â@/í|Têø¥p&∏à¨`*õ£Ã´:Íä\Æπa‘Eo„¡ä≠|=∑uí®ñI¸SH.£n}kp£óú6K˙kf∂œ√Z…ú¨Ä§¥ZÚØ6‰Wm˙Œf∆¥Çc8∫?ÿ®ÆΩÙkP*8{Ø˛,'y©à›}ü…[v:ﬂ€=ÿ9˘´√=v1Í€5»Mœ/q‰&,∫N∑»“KÃòg?π?†Î1ºÛÁç“T9’åQfŒ%œ¢~“˚∞¡–jA:˙◊¸{¨7ÿÍ⁄Ík\Ô<¿_Ò/*{Ω¡~≤≤≤‚…oX¬1ßö0eΩ0.“ãWºßù∏¡Pc¸∫¨à¨√UXK›(øàª‚Mbë7<.{¶ÁÏ“±c°C"9queÂß≈kaPΩhò√êÂß¢ÒQ:¨kô3’úM

ü©AmıôrP!Ô»“˜Çní√æÄ	√„ÚÎRW¬zÃ«$;ã∞≠UÙ¿ˇ
“›'∂Ÿq?sñ¶#Á<´#^£´ããæR,ò> œ8ó¸Ê≤sˇm‚Vpm¢B˘y2«≥;%èÓ¸±·*íŸ≠¿; ao·)q[Pè¢≥àmg£ú˝"ãÜI'G•ŒÂB∫ÏŒ¡À√£ÉÔ∂_ùÏ±›=v∏∑ªø{¿ñŸ¡q¿√áH› 'Ô}’ä…Ë»®xó—“ó=·˘Õ€Ì|î•ÉÛ-Å±åVY˛3©]ÙóxÃ Ù=ãzùõﬂßÛzöπ3∏ÔW¥p°'a‰ùÏ–â–ƒµŸ’˛6*øÎ6 Y1≤Ûã˜fÒeícª∞TÎ/6Á*¿∆\€)Ô§GuO€»sÓÒ2πitÓè| O{âd
k¡ ÄØ˝π±ﬁ≠}êù‡åº®ª—)‘ÃmèOG‹ìËm∆!|?zi∞9"tRHx≤˚ò“≤èÊ*À‚GRÀ˜¬—2∑≈] í'˝™äs$¸X˜'¶;‘eVœê,ùê®G{;{œˆw∑k˚É*¬∫s"5ˆ¸ŒÏü\.\˙Ig≈]ﬁÁÁ€/N∂)˜®∂ª‚-zL{‘A≠„˝ìo∑o˛ÂÕˇw‡{±à≤‘Zùj”+ù‡gø{çú¬fä(±πa6ÂYú›¸=â›#Œ„Â¿€y˙-®Q—{Îª¶Cﬁ…í°íQ*íÉ^uA;x‹dõƒGM˚ìw0ˇv•‡Â›o›\vnz_Ïä≈;õÍY’jd«ößˆ˚hÚHÓ¬0•[s√î8§Aà9πà·≥p‹ùÖj8ŒˆÁ`¢"¯¡™}äænbú™¡iò÷D’âóQ^$˘É‰Oâh‰˙≠e5´–¿7,ñ-kÚMá”Ø(ÂßâÄmoMMˆŸ∞‘z:≥ÄzÈy∫eø˘6Î˘:∫uFñ[¨YD]±9¡∂Û√¡yãvÅùéì^˜y“ã…>Øÿ‡Ï®±ã€oPÑ˙·‡|ﬁí¡¬-¢Û∏º¢@€‹z%Wÿ‰’/>2ã@äü@á>qô ßÖIà~dlÇ”Æ¬,∫gâYtœ¶cáªœÔÄSà≈]Âªœg¬+>ˆ>ø„Lµ€˙∞≥õ¥€ÂV	ªø6+Jπóh_øq¸Z∞;}·Œ›“Î’≤˙¨¬pî≤Ó;‘1≠æ"ª)sÆ…“^˝ézõöQR«L7÷‹÷ã]‘ÏglárE{(¨-EØP2πÁ≤™UÉîl·2Jî®åÌ≈êµ†Ïë$Aá„ûÈq°”Ô»Ñƒ-Ãâ@âà≥j·¥gÉ¥p™/ô$—¢s XU5µ$&ÚDÇJŒGSﬁç/„nöïYä<˘R Vbxc˘nôƒxÔû˘ò≤¨å,Fâ
•‹ÃwüÚà®6oÌ*|îP†‘—¬TXœ‹ÎwãØJπíCU¨´Â¨wkûå;W}ü∆πA’ıSS)¿H)y»´VK∑-ˆ◊ﬁ`ﬁwïò¥Ã˘ûŒPnﬂˆ‰ΩèN3^◊°Äöívz√<\øBºp≥Á'E+-
H¶Ü¸≈Õ˜îŸp[ziçS¬HÖlj	Â6¸P$tD∏b*¡»œ\Í£H4QK9;‹ñå|˚<Õ€í÷*_‰"µåô	òÑŸÃÇ%Ÿ≈ø´,÷ÒÔKPCp+H;<‚ü|`T≠à¢Ô–f œ'{@M†Îö+‡yÚ∫*–M∫f~ò\ëÇ/Éø˜ˇí˝Úhû][;Ò@7\ƒIñ*OÌ Ø|œEÀßwxı∂# ÕÜ¥" ØTŸΩ˘;^ò•‚2xC!J}GÃΩ8ñ¢Ô˚KâΩ*|mÖ*b∑êW®¢GfQN‡≠/¡øüh Ç$*∏€Bî∞p[ü^.–Cπ“eäù√nª‹‰z3◊…¢*ªHÍÉˇ?   ˇˇÏ}€n$«ï‡ØD“∞(ÛŒnK‚Ùõí9£)≤’ûE£— ÆJí)WUñ3´™ªMò}‹á}öÃ√h^ÀÉ¸h˛âødœ9ë∑åÃ™"Ÿ`´Yïó'Œ˝‚–ùUıÇkﬁˇ‹¨yo‘vˆ§˜ÅhÀb¡+WGW2´˘çèfUX	»Æåá∑€ÿÑ4ÜƒÛã4€* ;‰È«˚ËÏcé°µÃIÄ5¢Eç118q´—ˇE8m·Óø4òåzìœ◊ô·ÆMQ=ÿßùñ*¢Tˇ.t0˙´®n(ÀHbaÿ@ıJy√´Yîœπî*Q±}ä”}ã‚ƒõ÷“Ìz¥ÙhU°,©u4qç»Q+ö√U%mmóà¨≤5˘Náj´£¨2uò]-w≠™w`ó=3Ç¯¥—‰®∫Y%I+\≠,	V3§jVË‚èGèñ`Gv0êÑ5√˛È˝¢vññªgŸ≤}˘ π£Z-Ö˘˚P‰¡v£å“`Oí|WdFTâà ‹û†¯ìî®~Ê.%÷°ÙHm∑Kô´ﬂÁù!+∑zdÙ›˚I†T>ã(’onôû)u∏c,Zî5#me=^ãaƒQÏ9∞Z∑ç©¡™ñ„iÕ°™Õ™º…~ØmµÄy›»* ˙Z3—}∑¶»∑Ø’m
…n:ä6xËÏ(iÙÀÀıdt…A'É≠È≠
¯{EªÇùMΩ+Å÷≥¿ »PX)ÀI<¿õ–ïEíïE—ï≤í˙≈π£û∆CÛº`dÈ€¸—Â∂â6Çê˙J≈ªÍˆ˚–Q0àTJ»º€-ùÄËe#"Æd0åÿª”eI
‹æ8≈›Î?û%]¯"w◊Ω«ﬂjUÇ	»ÚU:ì≈®(™¶Õi*∂/ƒlb*À°ì™Ö§i,Öa!)◊&å!—4ñHw5≥≠É
°flØt®∏`ã5p$Fr{êù√|ÕkÏ∞§–≈âÖ—Cx‹˚™√]Õí_Ä-ƒ4®\&Ú2‰yƒ(:ÉE	˛ˇıùq<`ìAA∫È†`”dÿùÙA.^/	ÃÅî˛î©ü1˚·˙GIU®:'†ié°ÛÜ±_NÜIÖ∫Ω1Vn"Uu]Øf›y[S îä>[ç’Rs¢.º·ÖΩ
∏2ÒV{6ZÉ!:∂LO’®
ú˜Åvè≥˜O÷ªiè<ÔK?{`)∏	 /’A:ø‹{ΩÙ›7œODÛ.>◊ÂÉ£⁄ßa`Bı•óõØje±Roâ}∂ˆ)ìŒbÖ%Ep™Ä˛@∏≥•˙QvmØ&¥?t=ï°*E°8$ã¬PÚOwq®Ó˙Y?:øbÚQom(kY(gE(G9á
VA:äS≠—¶™∆+¢‘ó´GüÔ∞œ?ﬂﬁŸY€ﬁ‹2	s”®Ó€–j÷÷8µjñ5Ú †ÍÛ/:(lã„îùaÌ.´“â6’/9∂©áH±:8õÂünI>sÛ˜@9ÌÜ[Ω$« 	2q¿R∑àzró2tqﬁŒ.e9Xƒõ‰¡!àÎÎT∞[»á¿˘ﬂdIÜ—ò$8∫&ÃQJxu/1ßˆÆ„;vJ‚‘úDôó∆#ØHê‘"áÀB'ﬂéﬂ≥GÆWãz àÛ[E(,O'–•”B(uØÚ "ì>’üöÖDü∆9ñT@Àqc#P¯íê:Û¡R†¥©ﬂ¨ qß⁄uÑi≈ë˘8 )™∫î©ÓèŸégl™≤Ã:Úç+2g/Í≈˘äÀ,<g%4j≥3†˘ıf
ü∑àcˆ^” 1*ƒùeîA¬ùD˝Âï+Õ8/≈Ê+µ,kk˛UÉ‰WYOôRñP-¶µX‘´‘i	çﬂUHôDl[g;ME° ò¢oF˜Œgúi€'ÕºÔQw”õ=sö±ÂæÖkü˚Ê-BWÍ4qÔ≤)óz÷˘òzÒxNÚ˚ÚŸìèV>™–â˝ıüˇUîÊ•˛˛YA—IR±ÃãJP_©o“i*v´˜=MBcÚf@8ÊG&Â°‡ú“‡ÈZÁŸ˜∑ˆ[È◊~¿>_¢h®}/ƒËÇ®"Ïı	ùJÛSı-Mò.[h-/3óœ\ì∏7j9à—2í*âjÎµ°	·±!±?aÂú¨˙"Jréú(eÑ;
R∏êu»n"_Ået1~a2à8§¿^·¨–üL1
œ§ÁÑw ã◊Ÿ÷@Ü‹∂¢ÒfjV8;LŸàgXΩùfLz—∫µ§¢“SÍ§ÕR9f~˝'6åÛ<fºß˛[ö}¯ÚöOæºbÃæﬁ# è∏â◊øgy˙Ü2QÇ†≤÷zË(àŒ‚qD‡)†”8
DÆ4b"MX’õ¥¨∏∏Ñ¿:µ%ƒ¿ÏŒÀSVçF˝˜8ª\…’cÁ-T…8à¬Óç`$¯J“l‘lkn"˘ÉÏ/ÑÓ´ïN©ôI∞ÆÇE|ÖjòÏG√:«O_Äƒ¸,}ìÙc¯<ˆ´q:R[øjÌ’‘˛jQ?Vÿ∫ﬁdÕjX∂æ#µœÚU]®Úı*âﬁÖP/æ)A.⁄õ…H;MíëDùÌ) ∂¢YŒ"”A9rö K ¡5ŒQ˚Êñä”ñﬂËi≠•⁄"€o`˙™-'—€Ä˛î&Ö0Â£À\A^ù´¯X·˙Aqœ1ñ}≤u´ô†ïô	EKKÔPà™F	◊5FôK:(Ç◊
‡Ü≈¬ÁßJ5¿*ÔŸ#Ù‰e
øÆMa¸{˝.ºarØ⁄ÈP|°hËVÓUñk+nÆo »,†lÜ*bƒVaW+ç5Îh!4UÌ.Z5òEöPr?úÛ
‘ësT'›ÊYë…˚C:+æ‡?+‘MÖ6jèÀíU¢Ÿ∑8¿“¨{ëå0Ü)cÇVDÁ†îBΩTO\÷÷ˇBhRå©äæ|∞ ∂6·ﬂÌM‹u«é~Ó¿5r◊¡ã6of]Lõ%E«@R\ìmÏÄÿ_u&êWÜ˚qÿ:iÆÔÄŒvaÎïç◊±6à≈´◊¿7À$âOpxÔ≈°S¸ÿ÷ö–‚cóÊF›Íbà@Ö.ƒnd°3VQ˝,;8ï7zP—ƒ»∞gye◊œï∆áeNë®ûÉò Ê;â£$ÁÊ7˚ãªÚE"e¯n¸’ƒ∏©$‚Î⁄€s1Â–#7ı°\>rü#8-ı‚.`µ®¨∫∏®%ˆ¥~áU≠óÎ`.ü|∞∫Iè}tŸQı!ˆ	€\ˇºÃ—ﬁ\1û¬Fi‹¯`;•IÌÊn´c3&—∫«g∂io~ÎßŸ3”*VS{D⁄RGáºÿ®±™ï∂Åu„kRÁÒ^JÀô°Vç<Jï\B,πuH©Ì9*0[Û¿lA¿
‘@≠≠≈§qÖòØ˘ŸRêë·â	{G“Æañ4Éfä*?Ü…¢Ï^~∑£ÜJ¡Ôí˘∫ÎèôS¥°“Ë≈^8À≠ÿüı€˜ÃóÙ"Y°@ÑÈ\Õ¿8õÒth·÷∆cMBè)º	|∞%Dp´€¨Á^ol≠Öº¥©A‹Ø pÃX9O7¥Èê£X¥∫Úzö¥nÓ$‡nëÉ¿º27xatC–Òí≥ˆEÂO≠ªLÜ˘§ñÙÙ˝1∫è@{q∆u£~{&çìAÚõ(€O≥qú 1:≈h«qÎaBÃ$ãÄ•≈pï™Ç|ÿ√g«'ßß{GØü~s¯l¶∞.lùÑ∫g…0§ÿkgSà~ﬂáER08Ö=¡Çü–®“I<N(ã˚«º{“.≥éÃ%m•sVuæUc#˙F£^ACîwΩ≥Œ(ãß¯ÀÀııu¸˜jë∫åﬁˇß ¿ıa˙∂≥Ç˘¿SXÍ*ã˙ºv˚&ªz•œôñ”‚X˘8KÜÁ5¿ˇÆ√◊pbù}Å…π( %Ω}é	u–5ÁXegI‹«Âã’.≥ﬂ≤eæZJH®›e\˜`‘D0`Qhæ(WÙàVgLYH£Uˆí¶|µÀD∂ÊHY∞⁄f∑›ªg≈[d€°ÌA-∫ÌY<ŒHÅD∑Ìq‹ø˛#"+^]*S+Ç“œ»∆ ˘÷.÷^~˙`zÒä!≈=ÎU|øÜò(˚∞ñw≥¥ﬂô’Ã¨ ≥TüóƒeEÖÙ$ÌÉ∂;X1ÄOkÙËçÖ"Â"˛Ù≥äFuË¢”J≥2ÿ™:àº6†ﬂp‰£Ï˙˜¿™@˙Ì^$= FÕ\\Ö“uœ]˙#‘@bÆ˝zí¨2Ab<‡¿7‘I¶)Â√¡‡z\êM„ﬂ¨}Ω¡	åñákÂyG'ä9'û,=>éØá±,”§“ı
Í/îù3v§VÀuË·lÇÙ^9Œ–Ω2Uéqt®tÿf=aé˚ìjCe∂◊K∫I:ƒê‹±}SÆ‡=W‚Ç ·âí
€/∞fáÒW¢7ıÆk]∫õtß¶°Ï’puàW/–€5¨Z47&p¿>Ä˝mŸ„ØÀÈÙ<çtHÊ®*È(n>œ¡ˆ[Œj.ï‘Ië J:6Z◊˘ LÙ(πbgD›„.∏ Z“(kz«Á≤;º-Â√9,Åıﬁ#ÁÎÿﬁîÛ.=æ˛?∑zñ{$ÉhG…ì†ì,dòøŸÉ‘)G?ûè/dHª#±ã9âK1î@∏bbØâEÈFˇ<ãÚã"…„>oGÔ$åÙ±Áﬂπh¶)X™ÿ!ÑÑvaq°5aΩÊ„Ä‚ç4%UQ°¸i{≥ÈDM·≈LnÊ„c‹,êœà~(¨óO©≠15ˆMY#Æ,)ün f[ä ö—\ºùñN`xıtò: ;eÕcÈ §èŸÏªî≈Àe≠7I*Ó îç4ˇöFäÛª±øÎˇâmà3©xœzòÜ*_∑Àø¸ﬂ⁄}⁄Ø∑Îj*IrÊÂTº©Î)Á§∫á	Ó1hº~#jf]2÷2~≈ËOÀ/2˜@fxnxÂm,ª^¡≤(Ióâ)Z"ñsp∆äbñ∞()4Ób¶®ÖÌ@»b^Ùë]≠1›Bπ1µÛ7√Ëu*K ÍÑ›Y7x}óŸö]ûJËi`,∏€á„ ?5¥1®x
jP—¡èÁLTèOïø‹ê≤≈Ω¬/ΩÎ?ÇFπPÕi{èOóÄûÜœf!Ïr(X¯bÈ∫1{¯àmÆonnY:Áô‘˙x’™Çèˇ˙Ôˇ¬Nû±ßß«'OØˇ˜˛·ëËn7tú•Y4`JcÚ	¿lÁÉî”l…AçJ$ÚÉ.¥v;‡rûo˝ˇˆLE.Z;fÀPÌªÅê´`ı◊ Æ∫ëf¨z?Ÿ(ÕÛÎ?N„æ{V2ÂbVnm$(yÎ˛fuènn	'cˇ•Î≥$Ââ?√x¿∆)RyÇ›Ë|+≤ÉÜ•ΩØˆ‹ÆBâN·ICÉY@„l’Rêúu›œÆ@XÒr<÷ù)~•/òîÿÒmÙ¶d)o¸a˙ÃD∞}*û¶=]ˇ€÷°7≠ H≥ÚlûF°;xZÙuPÁı2ÎŸyu5qæv◊n*¶§ßtxr‹ãTøRÏZP[S.8KÏúÏµÏ"Ëk;ëµa'µ∞—ùMåVΩøÙ¯pDÑ"˛<§©£∏èttÙfHM$ÜÃˇ]~1391)…LY~ç
îx\bıπ~ÂLe·ê{∏SΩP„Ùø.Ønø◊Î+ƒd¿´«•›=JŸ~îe…"uFJ‘÷çJÔÉ[ÛÎI<é9›ÂÅàóÛémòFéN€ 6?ÁÅÂ9ÕÕ)a{ S%SÓ“*òGŸky4´Êa>Zúie⁄
K~wRÀ]ÏçJeZÕ˝’*π „¢6¶Úç‚∏oe:∂ñ≠7w(Ì€Õ7h3Ç7⁄üFò„ˆ¨$8ÿã-Ì}ãÒd€∞£Ö7;k‰»3Ä˜˝‹pÖíp£>oá‘ª® ΩEï ÑX{:Å„tª´Z–áœ‡,Ó"—ÓPÜËwñyI(¨q–¥ÃãlzùóXüò#∞2yÀä/ﬂ#¯ΩBç`¬Î∑ 1qKX<£∑ÁáVUèÊ ÜôjÒ4ÃÖi@Ä®.’∏ íKƒ§FRå”ŸsëDce0Â¥3pËrêy!6•’Aâ⁄a–„®Ã§o´»w2‡ßà7~PÚ˘yO{X*£‹&0≈	É%øOì|î…W◊‘»Hö{V8ñÉ,å≥zÛeÅkkè‡vâqÎXïÚH∏€KûW_mn¡W	‘dËô¬cáY
öã-@∂Ï«IVcl	Ö™h¯+a∑Œ“qDÜÉë; ﬂ+Ö´ı.K¨_5z/eƒA‰w Ç„Ù«Y»÷[l4Éœ•nU“>"3!ã›Rõ¥≈±OòO’µ•…Tá6˙H_R
∫c[dÄ?Û(ˇ’?±Í·S70gB›ÒZeÖ5cj˛¨G’°Débe«ïGpC∞ÚJñâˆ1çw⁄Á°œ°—¸Jqv~ﬂæœâ"Øç€'v≠Ê“Ê!ﬁ©Ò˚@Âs¡¥Ée%'b÷ààπ ´MdD{`=t∆í⁄/∑â[~‡¥±‚å,ø	ÒHŒÏélwfˆEÜ;"≠∆3?ÆM„˘b1Œ”vÑ”6K∂Ép#è•“{vF÷ÌqIjà⁄⁄∑Âz<ÊF€√®√MéΩêVY%j°0Ÿ∆}…µ7∏|∞¡-µwÿ'Èq_›ódahª5è$?{ò’pI ◊‹ç∏≠ÔzªT=µΩ·hŒ}˘}%ÉÚ#˚Ry˘}µjãëªÆÇƒ·%x`:É<é;FCó¬RBw1.%W…Âxp¯œjb>èò≥ ≥t¯€Zµ∂≠-äÅ~ôÙ∆M⁄ì>ÔÃ°≤éòË„˜O”∑√ÍLó,9C’Ø‚˜|Ë$≥À+¨º–Ç«=º”™ΩßO‘¸Ê÷©Lî∫A<2êeªY~cMŸÜÿ¬_˙õAã]”v6ç‰ûCt`y(˛‹nﬂ…, •[ÎôÓ‰ﬁπSNÓÇ2*≈®
¸Wæ0ëOØ»ÕÂ˜¸ï‚áôàõ<ﬁ≤G∆à∫N«üº®<)Ê∞?ö‰dbÉÏ<}2L∆œˇw—≤}$å=‰√|Ì∑Jâà*ërıàø»-6Rx˘X‹Ï’yª .Vyl#ä›oŸ'Ãµså˚›OÈ&®WÜ~ã¡ÂÙ˜.PŸIÏ~ˇ+NYy˚"ËÌaîÓ√ Éo‚·Ü
*c¿Èﬁ´¨N~¡ß≥à´Ôræ⁄6¸ègŸ∆Ωo«Ô›/5Vƒ
>)‡0Äﬂ^WΩV.œqV#]Òæb§„{‹®¸Ó±–9
Õ\6∏¬eÛv,Ág*†1FŸ-N xœ∫˜düè‘WÀ∆>ìja¯Ìoôi~›ÿ`ß)À‚µ<v≥tò¸ÜìJIÏ¢rÚxH $∂(ô‰P„RŸÔ$òÈƒ|'QüîuÌ≈£4…ˆÅÕs:ªZ6=¡∂)QdxU‰Q‰±9Æ ‰¬∂åÕ32^ˆì(u'J°ää§<á—z	∆˛Á»br¸È #ç=pçÿsv
]aJıñ%(-†NEˆã/”Ñ:qkó¸ˆhÉVkArØÈä≈–<ı9úf:wT¨2VGg’r∏∫Pb©çd¨±`’:ÓÌ*|¢Úä1≠”>oœ¨’Út)˘î+1ha®jj0Î≠A,)7•†Qxﬂ¬;≈ßû%—i?t'(-í‰îò7åÑ4ú®÷J6#Î‹ƒ¡√m•(oQnˆ#,pû^…S;ZæÚbúñ*—ÇÍahm≠©Nê^V$"πEß¡h2„±Y§t∂8<•Çœ-S!™˙—°_$w´œœ	ı,u¨2]Ì]®V9p Îg∫4D]ojZç™'´é‰F9böa¸nt˝;Ù‚†§¨%ÚU<Æ»GäD‡ÃÒ√è3±ã]ﬁk∫5Z[k7pùﬂrFWÔ,æﬁVDVN[ÁÏ]¨∑∑Ωª˜ñ¸Ω ªlñB]ÏΩìèeOìLÆe Àº∏b˚®º}å≠“‰ïM'xkï:Í%ˆﬁV¸x2™√6Txñ9ï9ù{∆t±R'mÒπÁ]Ø5ìM¨tπû…ﬁÍlﬂïÆ∂Ñ'FﬂNÇ*—Ò¯É¥–5Î¯np¯A≠q‡I˚¿ÉHƒïíÖJÇ≥Ω›≠Áìß¸CY∑ÏÖ∞ı˝Ò¡}fçí(•q,«áù°ï„´~j|=‚√=¿"∂‹œîﬁÉ03ÇÇg‘kπ˙öõ5˛.U´HiwÈ†…ïw’2L&mú6◊NÒQÌÌ⁄ˆ}V⁄3¯
MÌòe±í °‰äi©≠®∆ø86·Æ'h∑iπl@6€VP·A{¨ÎQ%?∂ÜkÃ•ﬁÉ¨iﬁc/∫¶æH˚hZÓ/Ïó›ÇÀhÕô}Àqlç”~æ…É2<y˜‡>·É˙°M Oª"çnv‡VÛâiÅÇûr˜‹ÂVú+zh¨GÈ+œõw≥ÎﬂÁ]‡¥ÀW¬&ŒEa|Â˙Gz'G!àï3¨4”¬õß*2Ÿc÷*&]5ÙHº‘>¨IjwÿQ] X}Íê∆
ÌÂï
l—`Z4¿ïp°Vè˛π-ÈI(öˆ@2õ∑n∫IÎ2íÏmt
ÁuîuÖÓb∆ê)°c⁄√∂⁄ø¨>¢óùNÿﬂQÍü–ï∞` //¢qæ7Ÿ´N4©9aπÓ¶eUôﬁS˝Æ¢©k;_—)ŒR)Û≤ç˝!^ÿ?ŒpdÙæ-/£¡Ì;åÁŸèÚ∏ckﬁÏÓì∑ÙÕıüqRTDÄiOVq:üÔ¨∞œÒ≥Üˇß?+$7æË„¿ﬂ‡Êhø,ﬂ—¶∞sµßf˛⁄¡‚‚Ë—˝€Æ§l( ÇQäA^C€
BQÜ–;EYMîû˚Ò
IpÂá›dD›ªA;-∞aà
ÍıÔ±$NËU•XèÛIîıê+Â◊B£Ñ23>8"=•câΩ-√ÏëŸS^áãß	ßBçË'éI÷Æfë §≠Í	Ü¨éœirﬂ±©%˜-ï¯∑+÷"mdìy}ó√…^ˇπ?NÏﬂ≥ô[jrÙnó≥D>áÛ;;È¨y∂Û:E·(yù™<4	z>Ωà≤∏Xô§>Wè9=Ît∆è¶I¸6û˚R9d…ôÙ◊ºÒÃ/¥áù°Ã
£¯»Xô‰fÛ†7cÛºÂñKM,ÁVâÿW7ˆæjR)‚WóÔÛ2+W`-;¶ûlèÕ√Py≠À\e◊@Ã±8ôµ´3√≠‰ûR÷»ã<⁄∞€»gáõ…ÊXïxN˘–ì	‹bd·ìÂF°€ÃÂ õò3UÚgVÖé BJ™*8Ÿ éz1Aƒ‰	»wÍnæ∏˛ñ¬»¯˙˜sπüytc‚t4Ó8A  Ìı6û=€xüÖ>ËÚ⁄Jlxjsâ~f ê∆ΩÃ,ß Ô§«Æ≤§˜ŒUï^)Gﬂ{W”ÎH?˘—;“∞‰QM€≥}+|¡∫€ó∏"ë:?~ıéÒ/0˝…Pg¡ú2—î∆«‡XˆÑ¿Qõñ?àÀU±]ÀÉÚ«∂©¥kÅwø6ûÚà8.s@wQ*â∑:æZs£ùR•ıi–™{˝¯gj˙˚eñ ◊R€;6kt≈˚pìr√Ì§¨j∫Ê⁄ÄÓu Ü]©¶fπoû⁄tÃl
´ıﬁ–jãÈ˚µ·ÿ˛E‹˝’~íu˚Òv≈¿∆ˆ”a∑?I*¶¶ò}a∞pÜ⁄èüæ0πê√‡]ìT∏„È™fhyò’˝wâ%ØGó«5¡Ω“±í„˝Z‚Üéã†RåD‚ÀàX≈· :è·üéu`ûT?çJÌî^ÿÑøÃ∂,fÛ.t5«Ω3€Réü~È÷öM’Jc}HÜi4reÉäz*ï”$ˇv;ˆk¸Æ∏Àñ•∆√ziåòám¢©˘—%íe¥”hä˘Œùˇ´”6ò7Ø¥I∆ˆ_+≥Óızœ”ä.∆´JXlÒ	ìM_;=ïùq´ﬂΩÿ-˙Êr! ªÁé¯"±)-NK˝€ê_ øÒﬂ´åòU·µÂø`˙◊Ù√
%;» y„˜ªlã]Ω™,·j•Jga?ﬂ:Å`∂â.†.)ÛÜdcó©|´Ë2dƒ0_Û1éå«Õ~„¬é!P¶<“'Ï˚û‡V±pËœÙ`}ÉiÂ„ÀÜ’£ﬁÃÍ!{‚nÜÙƒÖÛ6åksËÅÍ6<◊7E≥f¡	_n√KKèübÖC4*ñ”7ìX‚=y{u"xc_GËÖCX◊p‹Y.m9E^R4è£¨{·yÁ0ØºEÎ„Aç≈g0M!À„øaΩÍ„3õ¸h}Ëfjm˘†Ø°OU"j! úX•≥EBÃìóÿæÃY5“÷ÏíãÖ√ïDÜ
sâ≤«á=´3°yÃßÃø≈»œ…PÜB§2›ñú$b“‹∏5VwMÍ⁄b˘`∑∂≤”JiJX~RS◊ ¢ö›∞*Á£ÚòïqVô:–.´:…™öﬂ*+éaób:Œía‹sî«|∏?:€é~®nÍ¯Àç˝oéˇ¡µ'˛Je;SΩ≠|¿é¯0ªlÍZπìhe_ú»µI√ÂFÈ„µ.íõ g\"‚Y`j'1÷SÕØƒÇ™‰Üﬁ¬ÿ„Ò∆éUf¸ê6˙3aá2ééAk?¿–ü¯˙w∞Nï∑v·.¨°Fé±
÷DΩVªöiıbå–ïá◊ƒ¿ßS„i4¶ÓÉAB•æ<Õ»ıı^¨mmYt\‚@·˝AóÅ¨öâ» GU†.ñ=YÔf1(ÍΩΩ1äπ√¯-ÉÌ%∫rxztJóÈJ’Bh€™›Bd∑æïc<G#_#˘á<π…
RÎu»„l
˙¬È8OrÚrè0Ë<}ù≈›¯¸cŸ_eÑ£]ú l∆ı¡Æd√˜ññ¸££§∞˘4BABZq[ÂITS%õ4§>óÂ)|ïí√âË@”Á{_º>:yzpB∂ﬂ|ù«æ^§”JT‹˙KO_…39¶û<±äØ˜æ8¯˙Ù%Û Ÿ«kÉ/¿>öΩWÁ√éê°wL/˚M¶~YË{ö;®∫Ù
ÃD÷Â !t=ƒp{±6R˙blÒÊÂA.õ1wŒöyQS+U⁄Ö(k˚Q6Óº‘ÅÕÕØ‹JTsØ¥Ã·–®ﬁìæÊ“º¯K{›q2çüGo:ÀSê}"´Zf{&öT5:/PS©ó_≥NÈhjÁ“– êMÑzkÉr]©˘KÚ:Ã‰l-}f‹tﬂŒsFMFﬁf—®aäµ°o≥A2\{ª∂…áÙ§l3KÊK:§¯√*A,(ßœé¬∂≈',_?∞R¿ˇhÇÑW]Éﬁ7ÃÏÔ„L˙Ø~=~Ø÷åŸZu§π†‰≥Â,£]|<6ﬂ¬Ã+-ª•UWb™l6ûPp#‡"{¬Ë=¸©¥‘‚öØ»'πbiçè7KC#S[€@§>ez,ï_jB‹G#ìJ\iCÎ«¸\∂u=ÓŒ˙dÊ}ip/ò+8⁄*€v#*õQ8¨}ΩÂÂµ9=Ù1cg@+∫‘^‹¬çúßŸ{ƒ©u˘Oˇ‚yJY`#Ó»°|ç‚{˝®∆Tl√&KuO3—˙ËÂßNV&p(ÔfiÁdÉ1˝ôI<Áö—j˝lƒ+Ñí±‚äŒoÄ&T¯-}±#6)"]µ1≥ˇ0∫3ˇà´ËÅusF&ÛË›å	G€∆).m˛¡ÍrÙE¨D=DñÂÑÑbΩ∞¯‘eOÒg|È˙5ørŒ2°µY°¡à¶t”æƒ√†Ú¯¶òÆ„w5≥Õ%∏…‹ÔÜpi√äÏ/ÇÛ≥&Ãü˘À§V?™@NÀ⁄Ö4óòxlœ#]≥+R`±vûZΩœï0·Öæã`·Ä’ Lœ·ΩcÌÁ≥àFﬁäöYË_ãüÛ◊6æ∞^æÇø€àπ¸Ú”rÕ"≤%õkTXπZg√6∏sñ èËt^óÿsècg‹é Ωj^mYª‚·?I-oµºZRÓ9wq{ı
õ¢«£åÈ>P%¨⁄7ﬁ.`ß"†>Ê≈8gyBmÌâ
éî≤dÜs;#df”ÌàdS©Z¡dm]œ;´]L÷rú….&ôo£ªªaOR‰ﬁjJZÃõ1‡z∆k≈êòC‡YäeaÒ8|Â$Í„¡Z>.ÅS∑>A¢ãs?v\_óõÆ>ÅÛG3Òq⁄O∞ˆ¿qt.ò.ô±¯ˆ¯Ï^¿n˝6ÛÎá]|4$¬C&…ñ˛ëäüÆâGƒÅ~.Ê^ﬂLZQ˝<Ì§‰|œ≠=0ƒ¡›Í≈∏2[
cXÈ∑◊6^ZmÄ-	\ØÑÕ—∆ı&¿1SKe,‰E√™wÿEÃµ∆^ƒoç§›nûÃ™ûS’∞©J?êÍ§¥~Úê‘ÏœáÒ¥w‹ÃJÂd ˜X7≠≥¬ÛøÎ]·%¿ö›†’Ö2á≥jFŒ`èÄõëSX‰ƒvRxEÖ}PÕ∆‘`ª˜¶∂õEZ∑}¬nÒ}ÌÁcë®®{fÌiÉvï∑ÔUy=ÈrWµx§ˇ)-~çuÏØ¶ﬂB^¨Á‹ 9gœ˘q˝Ü9…JE7êbƒÁë—˝ƒ∂T£%WE?ºÔK¶iƒ_òõ≈|÷7ÀX2j¨Ïd(Ïñ†œ£=Íœ˜§´®Ñ_<gìÓxí˙cﬁÜj7ÿﬂ(Õ4˚Û$[÷≥¯Ì$ÃªE®ªÅ∂œìë/Ïë˘£ÁòÉûp¬±ÒLó&„8…óÊÑM8™-JnôfYf ìtS,¡ñÊÀwóBÂò«k%√ﬂ¯)@ªCﬁ&≤Î√ß¸ÅkÊ–¶u£ÔãÁj∆w∆¿±6wÜ)Œ7z}ˆ±îL—+9N@≈àuõæä∆IˇÇ_(*-u£t^óJﬁ4˙î˝m^£ºndß¢zu•^X”ã5íZ–k°Ìx&-4&Teci¶m6_±π◊Ä±qË#ÜO7ù+Ê‡kYÀ€3õ+’)ˇ¢+ìÊÇµ¢&ªÁÖå]pìÍ+Î &bÀîiØÃùöŸ~fx90?·8ãßIŒx;u%Ô§#Ú÷ÙW"Åπ£…¡fr}£πbÉç›!H±ÿÑ	¶,}Ç∂ÖÃ∏7ƒìr#£|GΩ£aˇΩı=IIÔ	Ébâ'6cFª†˛ m1'™íVêT›!
=HJö≈ËØTÈ¶JJÌ¡AÕ†%Ïéú¶ø‹\ﬂ‹~•€™E6+ÅBû`–˛ Ÿ€Ñ•≈^P‘⁄çœ*VõFU€Óı„lÃÎNHOÒ6≈∫Ò®–çŸ_ˇ◊p°Ô≤é%)„<è∞O˘8Úg©‹$«DÙ&ç‹:j%¡kV|Y§—Q≠Iô]…ÈÊ∫IylÍ¯\Õ¢Ë·q⁄ø˛#˙». ˜h®oë’È∞4Ãı·J∑FíÑÂ¨\Rï≈¢iå;[jœf[À‰"e*;º<zÛôíì8Ô}}¯¸pÔıÒﬁW{œæy~$íkVxÄœK¨Ê@<Ôµí‘ìÙäå¸ßìë_“ Wßnñz√¸a™M=AGo≤‰<ß ∆Ï≤{VªÚH 
xbG9vŒ@∏&Å5xÍØª7ë›eZªkŒ=8Ò≠dÉ(ﬂÌlÍÕwÇyà3ˆ‘
Ï0O,yÒﬁÆÌêoG	ø7≤‚.èû,L8‘moì;œÈŒ¥;Ç‘)1~à &I∆µiFG)Œƒ3,H@Àè&=o)ü˜˙O8ÒhÉ%√§õ~	Ç9ZÔ≠+i∆!G/ÇüQÊm^af¨”MoÄîÚT¯uî≈›$è≤ï>ÁIm3œÌå¶/¶Ê§Û¨}ûO3~ÏƒøZÎÀòaL˘Ù&,tÿ+å|°"Pqkgì|û¡ÿ¢@Ñ~ìO± øÈG~Ø;{≤>à«Ë¨ıà# «!ôT4ÖS2`]%>E≥è¸8Õ?Beo‘$?µâ Üst≤/Ñó[cîèO¢)ü©	æ<ì»F>u,ì-◊¥≠dçÆËV»]‘%˝vıüÑ]RÈ¶+Æ° ÃÇ‰kZèzòÈ¬ï£YM'æTK˛†Ú |Ò"•+∞!÷ÌjœRˆc†Asomm,ÚÔ∞◊Å¶3∆¬‹2r’g,ÿcÔ≤xêN}∞©Ó∑Ù˛W´UÀÑQ¥øPE*·ˇe‚yÒ»∂^˘yÂ€≠2\?kDπe„(}=ä2l¸Ä÷∑ö∂¬m",Z∂´¥N®‹˚€"¸«X5Å *ÊsÈE–Ey„≈°Q-ô-ÀÕoê≤%Göc7|ÇHèú{ï!‹Ç⁄Ä2¬IèÇb≈j@°Ä-+ô˙Ï.Ò¿;âƒÂ6ƒ…cΩhˆôΩ¥’v˛;v¯€
•{[B◊„'%û	Ïõ„HÊè¥´›x¿êh∞ıó?≥Ò∞õã{#…◊‚M<[ßñ€Iññ£Œ&õ„K¬≥Q#Ûoî`A◊/ÎÙ ¡∑Õπä‹ŸŸlã;ï°\¬.übAH4_V‚ˇ›M∆JÒﬁ<ƒ≈à~ Üﬂ˜◊‡#,&(Wxú/-Ñ?£y—¡ÍX,lÖ¬”†Õ0Íı–≠©g•◊ãﬁæπj—≠Ωl.ˇîZ~l[+?F@©¯+Ê·Z	Ã)NÉπ•î0gVâß∑?©‰Ñ—îù¿ø#,ˇ‹°Nü›∏	\ÎÓd¥ﬁã\É2»û√GÛ…È:+Ï1€Doü≈¡©ãÀ<]OÒiCµ™ºpìæ3XÍdê †∫≥dıY¸.¡b™ƒRÜO⁄˝f2p¨à≥áÖùU®¿súÀBòÉ∏,CRÁÊqZ‡ñ‚˛«pπ£§¨—w-ŒµàåÚ$¸îæPŸ)7eÉ8á”¶jMf”LGÃÎÊrƒñ°>Ù#6iÛ<]º"dÇj∂qo«ié!øºΩ}F¡ÖªÏ’rÒ=„ÆøP´AF¢^Ñj÷ë˚ ¡›ü9tƒ3#‹ÜB≥íx`ÑîlÕ?§§$=≈
ò≤ÑN¸ÆÛ (Ñhı2$AM!V?ZÑ=>Ω˛"·ö¶›Î?0`“◊?¢˘∂˜‚!ˆÔ≈úΩ aÕ¸hïMíR&gqÜéYbµº‰åSÙ…†´ì≠[c9õî'rƒÁ@(<ÆN|µ±≠≈‰Èân±˙8]k¶eÌ.*éÕJﬁ.pifüÓ(ä§¡6≥yöÀ6]"èy‰òú;?"3⁄|= 7d_kçcÉD7%ÈË ≈›õ0áú@°90;fnx"G¥õJçíÉwÄ˚Áì(ÎE„M3D⁄ZÃ0∏(-G_˙	}£èﬁ§(*§¬©π£“â´¡—,ÿtR”Ì®ÇPﬂ§Éë´ã¯f”…]≈∑a”UNq±6ò
¡¡~G<◊r„$'<Ö¥Ω>ﬁDAå9ìBnÎC◊»Á|êœ&˝1fÄ˝√$Ks6BÖ…€dUÕ°∆äGX[Â„€Ô|\#öÕ?xœ+†pUe	Eß/àVO'ËØΩ¥êêæõ-ã2ß
(7éT¸.›5§˙W’©¥ó~B™[C™¬˜∂˝cø;ÈáUŸq‰®“±>ì… Cıó`ƒ3í«9k=Å√-¿jµ@‹I¸ÜG)\ˇ°æÚç>|/â@`ûº…∫77é‘œ”~ú]ˇÁ÷ …MXGp¥Æóv)™Ô¸7£í.ï#P‡ÄúI÷◊Ü˘¿≈¸ÀçOÿi2†÷÷XäE$ïÔ≤nDƒüt÷A4N∫)˚d√‘Mø]OåqyËÏëA‚{`á7'môcPy∑LÄå*hyEÑµ∏Ò‘°gã"Kπ<∑uˆT}§”äÍË◊bÎ˛‚˙ó˘¢¬|HP=o%“ÈÓ*À”7YÃ⁄á≥0¥QêéSöUØfÿ˚…◊∑Sd`‡çfèƒ≈é2Æ~w\;Å›™gÓJ}»‚Ò$∫£5kT˘ùY≥w÷Ü8[-Ó&e

ÏòWûòq@„8Ok∫≤éo9E!Rx0úI’EyßØOTªYê	%ïoÔ—¡Y<N¶i~’≥∆”Ãí§?¸MAígÇÓ°~LyAØlT oå£<ﬂØVRsµb)(|C6ËØ¢˚DEÿ õÁÕby>„Õ$ÜV˘¿Ö–π◊ÙVÎwÌÉ™˜#w	Ø–¯=Q4Io∂(>◊Ä?ùfÂ4èﬁ`˜JÙ˛WúœrÇ)®õ∆≠cî!>∞S™£õVıDjWÒ∞'ùÒ†h„æ‡”(KÄ*ÅòwëÊ„%_l•ﬁ	˛Í±∏Ÿ√ç/q˝bñ^íGo˙q4óh
àRåyUNg€Î«ßëízØ◊.qwùëGDÂ&-\Jüó∫™F˝)ÃôŒPcU˙;S∫>ò%:Ì’YcıÔá8Ò7∞D˛èKÏ‚êE
X+·qÈÎrÃ$«Gôo)kDPÇ`†ú›æ˛¥<∫Ú%ﬁˆ2ÓeûÀ >Ì´u–3∆ìú´é†àt'√™À˘˝<Ä+ﬁ˝Hm‘ÿ8KØæ0ÀßùQa .VÏzgT÷|t
øD)˚€∫˙~œÓõtöPœç"Bó˙ÁE ≠zN[Á6àﬁ≠]`[ È≈+ÜI6g˝Ù-¸Ç¶Wvú÷Únñˆ˚o®úòq√x¬Ÿ:‡yØ
OKå§≈dc©dg¥3-:Ç¥oôÂH-óÊ Z/Òç˝p˝#À£dÇZÆñé*Á◊&˙ı$·«6D†≤è≥tx˛xòN#6ÂÁ4ˇíu¶æEvÄÌêäùãóYDÌÓx†O/¬Déã$ß“n›T/<jëUã{ÁÄi≠ùjN}M&Ÿ®[ôÊS–rX˜ejﬂtE≈kd€nUª≠ _ dè3z}á„Œ≤DäÂ¿˜‡ˇ@…„(Î^xﬁ9Ã+o—Ú∆Ÿƒ∫:[_›Fâx[ÎÙT<~6ˆLºÚ∑"Ø< 2œ|Ãg´Ùf·È˚≥pµáßR%Ï}„1˚bíwëãËÌ}∏-TÃ◊H»≥°[ÓN¡tx¯∞g%Uﬁ‡u{«™µ¡€˝ıﬂˇÖΩHÜ]≤`QUaær
#ìö¬§¶b∂©ÓkkYT©ç.A˘Iu]à@Zú—SÏ|_yáK™Í(´LFóTAØˇ—f–}≈Ï2ƒ‡3({Æ6Ø˚£≥˝·ËáÍééø‹ÿˇÊ¯‚oTˆ2›epÄ¨¡€·ÉÏ≤©ka« ¨—≤æ8ë{˜c¿å∏(3m_·_ùm}4ÑguxÈQê)€C˛îà∞R€3W c#§»j"Î~ ÿë≈◊ø´∫î·(A•÷ÂGΩ¶ãÃ∞t1BË≤ÔBÎFôõq0HÚ‹›j≤Ÿ⁄≤W≤Ÿi¶P ¥^eΩü∫äÄVsSÙ«Xó÷ü¨wAΩ«ΩΩ1r„∑v«˝áßGßtWêî,˜zœûmºáèΩåÕ◊ÄÛ`çº•ÎÎ∂WÆ⁄ín| ≈u,¡0¢Ãç◊<⁄‹ﬁ ÅŸª9‘]ö \≥Uqﬂb≠Ì™öPÚÈ˘D⁄XVÓ@Ó”Á{_º>:yzpBEOA_:è›’áYµ*=]:L˘_Œ∞ßY\¨Ç_}I√ºrUIÒ«„8*M¯Çt2w0§&P¨íﬂD•Ôü,®æX éy¶QÃ‘ûñl*Ö-ä'‚j‹∫UÎh◊¥}IK8¿úï≠C`ﬂ\Ÿ◊o1⁄Vîç;/µKæN‚ïGuj¨£âq`4ØêæÂ“ú¯;{›q2çüGo:ÀSêd"´ZV£d©Ωl’û S•Tä‰◊•¬⁄ÈXj’ìZ’ÑxòZ≈<Ã—@rib/˛åˇl_ã=0"G©XS√@*ztQÄΩa·vK÷<ØÁº) ;˚c
Ù(Û3cT˙µA•OM/T˙»›∞Ûu*Èüåﬂ˚ﬂh^Ãì«ë¸z¸~ûE<u9∆VoÅŒsóQ]Ö
Í¬O¥ÙÑ…ÄúÏ	£˜'	Ü]ZÚ€Öq0¯±fM6:•°ƒ¥Ω∏ &?Úê°}È[⁄b/Í≈æ«˝Öçµ‘‡¢0ÑÅ&Êv1€¸1«“!Z8b<µ;îèÈjjèUt•Ω®Ö˚8O≥˜àRÎÚÓÃ‡B7˘2ñ©tÃ8%áPÒΩÇà∫x˙Ë(ü⁄Åz#û*r0¶?ì!I‡\Ûqu«Q>ƒ;Ñ±‚è
ùTŸ/}±£∑≈	ÎÉ£|ÍA(n
`Uı¡ÇQÓr‹c~>2™c÷÷óÅYñfàU8ø‚S[ñõÕuŒIÀ‚·®JŸO•õˆ©0g∞¶éﬂ’∏)ó'#®æ¬•ıF`”◊Kl>¬ k"¿ßL∆™{R@ìÓ∆Õ;≤4®ÚçÄt‡
ﬁdJ?ıMó‰T˘{qrﬂD∞º¿jE¶I@/÷~>ã‘`‘3ë|…˘≈∏#fÏr`Ωêñ†B’;#z©|ZÆô/î‚;%f≤OXE~mWP]≠Ω'C;‘9Kêmt:ØK‰π«ëáÛr*A‚j®k˘üZ5]hÙì]¬∞©Ç˝xx>æ†€∞I%∞¨r]u[ DÏT$÷«ﬂƒ√ã…Äq&(ÙZtø%√^D∆ WßÂ´<q;"X…√f¥~≈qé0I©Õ Rm'î
¸z‚›úràYÚπÓ®‰@ˆ˙ˆ}ê§Pì
„ÁÀ3Ú„ >\œm∏sh<+z£åäåg<d€≥eN4 ÄÌíiúõ±„d¢‹¥ıâHOî∏ÌÈ):è¥n˜Bv√Úb∆DÆEhÿ‰à¨ò-]%w]Ωs§∞l:0—≈Ô≠˜NYÚH’ÀÓ¨∆‘>7û^π,’`[*OâÈ®‘ﬁîÏ»z+Éê-≠Ü_Yï≤Äu•‘é,{\(≠+Wè?Æ◊÷ÊÍ-r# 35Ü≈…G5¿hòváΩ≈\¡ÏEE”ÿöæmF6´ga5¸´R√
ËwÇO:≤?ƒÏ
¸q≤1Ö≈(_ÔG˝ngEÙ+®ıéó–jwïV .ØyÖ=n6ﬁaë(€	ÎÆB˚€G|~ïˆ÷¢∞;m´≥ˇ”‡™é]{AzªV‹˜j≈	åùtπ¨⁄D‰ ,≠ p6[¥ﬁM™Ö¢ºXüª-
ræ>˜≤å{Qû}Cî_≥^|M1ßØdA•ì∫ˆÄ∑Ø%’8.≠¡òxÆTà D•±ëy‡túM∫„I7‚íCÓ{-•˝Øú“Jÿo\ûÁÜ1˘y2
+2’ èûpD¬°©Ù‘d'πªy;ú¬—mauÀ4€2y•õf@T“|˘ŒcTXr∑y≤Zzä√€"GÕ‘Æˇü™-k•-AZ7˙æxÓ&[m‘◊]XeÊ1ŸZ—≈9N2*G≥ê;ıU4N˙¸ZE£,ùF›(ù˜’ì4Zeìó©Ñ≤Â˜Ú<F C*S–-‰’fw´®v¸ZË@ûÀ&†Á∆“Œ€læbgØicﬂˆËAQ8b¯t”πb.æDX«Ÿ[vOí(^ ßy¢FWf”5kEÉvœ´T;V_âd˚©~2Õ‚ïπ¥∆Ö’LâÕS	°6w¶xˇÆß‘ó“◊‹ÍxµàEq◊Ê†€ÏxtõÀŒÀÂ<»€è
§¯Ák≈™|{ñº£ßJ¬ÅÔ<´>ïâ≤RØ≈¨å+zm/øB‚Na+‰¶•}OD™7*åBU·}ìhlrÈﬂÌ‚W6∏µÑº…∞Ã'y
ÙØÊz™.YbeûPÆÍE÷7I¶.¯÷„a◊ç¡ﬂeÜfﬂ7B≥}A
j@ÿ„nWÖ°"¬ª∞Q8vúîãÇ_}}¯¸pÔıÒﬁW{œæy~$”6  é§üô€‚äwê›ÀöCπ«É… Kä˛˙êw,w‘—D)0Ã!·˙Ôf[w«—õ,9è∞ÅB¥ÀÓŸL» A7ÛÜ:¨˘‰ºπvY´Éâ·∏±µÜç’tlµÃ“O≠ËY·îÍ˝ÅI“€"Ê≈:ı<&›DFzíd’ÙÊ⁄g÷+@òáÈÀ?B∏UÌπ‘V-//,(W/_q>ÿ9küû1Á>ä÷}€!˘@°øY¯œEƒÿ÷ˆ&…B˛à∂ul∏˛=∂(Îª≠UA?{"ú£íÏ.xÆä∆fãm>D´ÚÁÛÈ"^◊\~.èﬁ¸ p :êƒyÁËd_0Oùç
‹~9]e˝WíJ¬Â¥–5¶ûDÀÀ˛U°’ÿ˙‘¢Úôö«≤s=y±%TT◊Æû5¬¯≠å_Œ“˝ìÜùÊãÓÚ0GíØiq˛˛Ú!∏_‹'péË?ssyvÇ)ﬁÆmﬂø≤«˝5a‘· ÃG
,#}K§öŒË–øeÑ´Œ∂GeÒ ¥$7h™√ΩÖˇ’&ΩVÎQ`≥H—≠D:ó*ZÒ»∂5ˆyÂ€≠Ç°]?kd∫e„(ïñÜûΩ.ö:z_q˚÷^Rp[¨‡XòeöqÉZañäı[W%êV#r◊Z»AH Jë¥"«öcV+}Bhíú|ïS'ˆÇÅÙœIÙ`≈jÃRßÄ%]›jÀS˙‘“∞;yà)nà≥	æF4Õgˆö>€U¯Ôÿ·ˇ¿∞J»[ÉøÑuÍd ÒKlé£ô?ú®v„g¸A¢¡÷_˛‹¨”6_ã≥›ˆ¶=‚$KÀQgíöÕ·ÓbÌ∞feÜ˜%º—∂Ç7∆πL
Ñ å⁄ŸlâQïë\¬1ü·∂[js@◊†ïˇw7m+% {Ûê(#+Ç‹~ﬂüñÕGXL<¢(w7_	Fs"é’°>X¬ÿ
Éfàäd‘ÎŸÅ[SHØìª}3Ur}Æoô\WHÖZ∂i[+€T4Ã,Äbºp’qrƒ^∆–≥˝‹BËô3äæUó4¢ß∆RLvñbù!Ü∑tSÍÉ≈"∏é—ä;ì[_π»dÍÉ5wIÎc≈≥MÙ|) ÔGó.<Û\•“£’®∑ó+3`é-j\±"¢)¨t2He®–Y2å˙,~ó`MI,p.wem∫ÍsVπ˚3ƒ¸X˙Ô¸SîÀ˜$7A~mÆœR6às8g™f#üÓÕYéóÜõ«ÒZ˙¿è◊$«ÛÙ´˙"&Z‘Æ(=é”£”loÇŒxå>‹e˜®¶ÖÔwi™ûK^ûg‡Ñ0°∏ü}°>Ò±§6≈ÏLôæøÎ∆<:5JÌEΩ©NëáŸ…•ŸÅdáÎ?±Aî!≠Ãô¶›Î?0`»◊?‚ôu„∂ı¿˙ú° ªaïhïMí8&gqF’k{≈jyhåS¥†+#Í’⁄Ç5ùë'H√ÁT(º€Õ5√∂¶í;§
∫µ¿‡„l-Ÿîu¨ª®6´‹vªßœÖó}∫ü({[ ÊWw’ﬂÔ∏üú]ê[‡YÕÊÎpæ!sZkîHÅZ ˆ))˘(Ó&Q?ú¯Ñ!M—ç⁄ ∆ŒÒ¨ÑßRâ·‡`=ÔZï1ﬁ0@d‡ƒcë“rÙ•üpß1ÓËçY¢B˙!Ñö7ù∏ö∫¥G•ìö/l˙&ƒà9 ]®÷?Ï4ù‹Uƒqõ0⁄ÿù†£PÏÚ¬3[6N‚q¬3·Z´·]Aƒê3Ë·∂ë>pE|ægH˝‹YÃxìÚµ◊Œ¢‹ﬁ¿a·$<Ú⁄Çbúi˚ùèk§≥πíp«ˆ˘ƒ≥Æ∞, WÎ˙°—i¬}–^^H‰ﬂç}òS}á«3~ΩÓ2û˝Ä+lãg⁄À?·Ÿm·Y·ä€ø˛±ﬂùÙ√ äÿk–°>ì9 fÂQø>ì√ƒãgms8n≥^Å[∆’2€\‹)¸ÍG)\ˇ°æ‘á>|/â@¨ûº…B7é⁄œ”~ú]ˇÁ⁄ ã "h©èÄ‚íhç.±Ÿ=©æ˚ﬂã|ŒV{aPÄq-A‰√V.7>aß…ÄZ—aë@œ>Ÿ0’D”©G7”“ÍºpﬂŸ#-Ç§¸¿VYN≤2«∞å€¸!å2	¨‰©¶ñÓ©ÿÕÃªs!Jπ<{4ΩJÃ∑ﬂãS€£ùvƒ:_ê~W∂Ó/ÆCî/îÃá.UÃPB∆ëØ≤<}ì≈¨u$CkE˜¯Q™Y—_Ü)”æâ"ô£ıªÏ˝Òõ´Û≈·:6{∂·Ç+ß"ã«ìlËé˜¨±ÏÃö0Ù∞6t⁄j'qwÖRb«$ƒ´uyZÅïPÀ,kÁƒπX]xïw˙˙‘∏õôPx˘ˆVú≈„döÊW=kÄŒº I«ﬂ$y>ÍÍ’‰`üÙ F,∆XkwÅ¿Û˝j%5W+ñ¨7c‹˛* ∞ììÕ f0iüã·fêR+C|ÿ2Í"+ÖÌÉ˜£≤XXªì%Ñ‘·f	t˜”A*yÙ{¢≥Òø‚|Ü√K˘8›4n»†aP°¥Í1Rãá=—8äTk–¯OäòFYîƒ∫ã4/y4ıû€Wè˛g7æ∞∆∆…9zIΩÈ«=–g¢)`HEë·≥¡°ˆ˙ÒiTfˆÎÖRÛûû-qø“∂CûÇ◊"xjk†˛ïÿﬂ}ÿKsP+Íƒ=∏ﬁ #˜wL˚jdÌÒ$ÁÈS ìw'√ÍÖ˘˝~Üö^ƒYéÆ‘è.ıaÂyî≤ü±≠´Ô±]&Õù%˘ÕÑT;puÓ[˝˚·ñ¯ª®Ót9M‚∑ b~ë‰Ë&ÔÚ8?MŸÿ`œ∞
/ã@˝Ë≈	—c\=\#ÏÒ@^3÷m1ŒRñúÉ`˙G/bÉ(A´89è0vëˇ=Lßë{¸n⁄/"B Àì¬1°’nP‘/Ïyp¿a&F‚Y±Äø˛Ûø*„É7Na$¿»‹ªÉ@b,ÃFuã›‰eîe.ì⁄ÆÛ∞áπı√¯-à„á˘8à>Óºt¡v=È)Ì˚ÒXXßwã3gøeHLŒÄ&Ù`d◊@≈ÄÂ˝ B√<Y∑ FU*ãEØGΩûx…ˆé"≤Òá`)Qø/óÅá>5‹Ç=ë%Å?xœ;‹UÜc@Ã¸Ö@#cÍI»Á(ñ}Âúqee&w:—*{C∏…€¥∆ﬁàñÛöjÌC∫,…ëà=∫ºwœiNó@§V®‡«≥Ä˙˝>öq®1ÔÂ˜¯VlÎ2ñg¸ëÛÚ≠stº˙˛äB/Âçl9k±±ë≠∫˝•
c*L5uT[+K≠M¿FÀ•0ﬂé∆ÔÛVäú
/≠≤©<%ƒ'ƒ3FŒ-[Œ≠—≤QW”£ÓËÓâE“øx(–cIˆ/ÂûØ.+ªWÊeÂîD« 5∂ı™≈2ÎD®*ÆPcÂeØæÉ~πÙÕÛìΩÁGØOüÔ=ˇÓT÷ù
ñˆ
ÑÚè+ˆóˇ«ê£ëæyìKr‹ôÆwÅ(è„ﬁﬁT…^o„Ÿ≥ç˜aø¯≈Ó`‡”,}!Qˆz?\2xöæˆ”®»€<Óùu¶ñ.•øπB 5∑÷hyõâP˝‹RåU)Ûs¸ÙÀÊE5÷n≤pïióJ4◊õÌº†œÈ[9†ì–)Î®%tÇæïoHBÁ¶lí†ô?Ã~Ã∂PTB‰ö∫‚“—2P≈rjNΩ"µFÖûÉFﬁ∑–»∆æå˙ÊLe&ß«áQ``Å®m â‘Ô‰ÈÛˇÒı¡©.R»j•mŒ{mÉnπı'ãâ¶Aó(∏P°]¢ÙÈÉVŒ÷OX;KŒáH¨¨˘,nµ∑ÍYXå—üµ/rl"lQêN–?P!çé©È§F#åùƒÃ	äNÁ∏°>dËÜ¥ÿ˜Â_˜ÔÈ˙wÃªØ=vµÚΩÉÛ’¡IËg‰Ó¢ç9ÀZ8≥MMXê∆Ωn|∫^ƒπ [Æ°ia®≠G'k8[ñ k%ÀîüWæyP≤/ıkYŒNΩìA∂‹dKÿ6 ‚›¥üfπë·hcÖßI‹ÔUÚ¸®(™»L¬Ì≤™&Ò±qYùì˙ ‘wÀŒ}ÉË›⁄≈⁄À¶ØBÔ¨üæÇ¡‰†ÍÄ§:XÀªY⁄Ôøâl˝˙F®DoKªxüm2˙gPïÊêœ¬†"F=4£eq?J"õA)—÷XjèøeÀuú:î3J±∆ﬁÂ<Ö˛NºóÆ”] ‚Z˙êèﬂ„]ƒN,Ò—xtcΩ~æúıëæL˝§√ì¯◊ì8Ôß†‚Ôq`yπ.π˚|®J˙≈˙{˘P!¨ﬂ¬°vñóÕ≤,Õ∏ÙÚ˜Ï™∫›∂dG≥úx∞Õ.T=˛2Ó^∏Õg≈¯Û0Ñ5´uzˆ¯ã(yáU«QËùª1™JM´≠ƒ¡Ωn7ç—⁄àœ%˝\ìt¨"ÔjDΩ*ınãœ´∏(ákoπ◊u…í3÷πó‰⁄ùX±ﬂÅÂÌØGÂÇp		û<K@»ÿû“ç)bB^P®a∂Xú\¸<kÊÜmÉ'r'r…Àø±∏•Ò√Ø”í/}f™ìÖW∫–˝M.ik(Î
Òò∞±≠jA(J«0©T94k´Ãß≥û≈ÍÌ¯Që@nÃŒŸ_ú·¯WÏáÎ•∏∏Œûƒ,üDÄe√≤±ˆ”Ûdàñ_ÎLSP0ÎOHùn	˘è≈ÏåH#++ΩpÛÛo÷≠16ÁRªÓæEÎ;ê¸m∂KÅ…v¥º Ä!Wÿ´+ºåGãçƒÕ∂‘ò@aÖœÃüäò2ìDXdV≥≠ìæhÒcçX±òÎ„˜»ãî…ê ∆Îøäﬂs!˛ •‚Â¡∑Œ)íâ(«¯• †®A“∫lj]Jïü’Jï÷Œ÷Å¡∑Yd˜=±xπÙ›03„ó∆©õ§®r»~Wo?›(„JÃ≠§»n„Z®¥Â;\]ÍY˜¨˜Ñ ≈{ëÂ8Â‰K·N|YHw\AS•ªYQ^Û√:ÆóÒ¢ÕeL∫>∞Ÿ÷ZîEø_·¥—0¡æÑk˘("_ïﬂ¶6ﬁø≤◊Å±Œ∏Ãeñ“©ª\ä3±h≤eã≠k~Ú-,´{˜&˝∏úââñ˜ºÏ°˘ºÙ–2›ﬁ9\0 ÅH°ùQÜC°JãÆS≈›≤[A@QwòÚÈï"VΩ’v©j+˘v¡À1UTîM^ ËC%µ/Í˙ë›≥•ù”ÍUX8¨∏Uà»˛T'T≤°!LÃ—K»tz GÔ1†ä∏˛“\ÂÕ2P]˘}•M√YAËäo¶:G°-ZIXÅ[≠/Ÿ¥⁄¿%\≥x%H _†|6∏Y{Q⁄/H◊≈’˛‹[©)føHÖ¢ âú]ƒ~xh∞ÀzM„dØ¡∞Qﬂ`ÆRéT∑˜%»B˙3™Ù\¶†°º•Œ∆(a~£ÈQ4∑iy¯Nù<‰êÜ¸≤–ˇ  ˇˇÏΩÀrWí ∫◊W¢5ïôUâƒÉKI–í $°õ$P ®Æi/» C ÃHEd†Pi6◊f1´kw1◊Ïöı™eΩ(´E≠⁄∆∆l6◊l'˝%◊›œ#¸<"ÚPRu7¨JÃxùá?Ó~¸ñÖw·h#Cè‹ÊëË¡¨µSyÇÛ√é(”®ÑA¿zmM¸ní¿äã]†õÚDãô›db©o1·[íèÈ¸]G;%ªY4K±_ƒºeä]=ÿñÃé≤nFà¡+Yíâπæt„"Àä¬At2hlâ]–‡§Õ€F Û,j–≤8î∫¶‚÷9ï˝tcò<nFËdåzì›ï»Ö”4;Åˇ∂ƒâ|È"ã.Jh_∆XvO£1ˆÄÆ^ëËÑ‰∆›¡∞Lßá‘Üå)/&}ÿ∫ëà∆…%¿≠«I¸2ãa¯ÊÍ¿<{‚Á/¢Nt‡«jŸêï
<ö¬‚„ÒÌ‚ ˘@#≈#=û.êBw•˚$+FÚûbeuÇ:≤ëazµüß ÔËúå[⁄?>8&ˇ≥z8∏G~Àë]6BtmWQπìn÷˘KUç…Ã„M”°rä.\WQùLF—Í÷yñÍ5e^k¥‰"÷oäQúû£Ûõ3®&[Ì-=€i£_Ø%›" É7zÉô∫‡`I{ÄC$çi/Ωj˜„l\ˇç"Ái®íÁ∑¡‘HπÙ¿¥=7ÒÛ÷ 1„"ûæáÉût){"áŸ„Ñd_Ì”ÉÇÃ∫=å⁄ÅΩŸÙ†p(“o,’daî‚~Çmï„ø¬Ä†:ÀEÙJF˘≤ ˇa∞i‘hW ú∆Ωè˛ïcL˛Ñ~èÈe⁄™Õöà\gµ∞æ‰QmÅøi≠û∑ñ „–h∂Õ÷5∏d–Eªﬂ˘'Œ•[ÿìñrº¢#[NºGª∫8¬¢6™∆‰¡ÿ«	Ï∫è”bBp”óê	Âãà! étû…p©»CZ·≥(πNE˝º?π∆ÿ@Vâû[•A∏3@…qP⁄SjœJD&âuaWô˛3¯•ÚçÊËH+Òã—uñ¢@ö‘éËº”∫ÇbÄSÙW¨=õ5ã“\oãË}/
±<	Œ&:¸¬;˝d0ÇÕ1ÈÜ´ËbGlÆìÃ‹
2º	n¡ÿkîj‚<Ff;§|≠Èu2HÌıô8RØT˛2!Q;Ña˜
‘Ê¬Ñ¡Ä%≠)Ç·?
t#◊'}(I™ëÄ˘¶(è„\êÔ¯ ¡ﬂ≠àºËõ$<ı¿ƒûÑÕíÇ˝‰Z~»å0B;@
/‰né} ôTBÊ÷EQ7æ6ZÉ‘hXHÄûVîØ~õØåkY°DºrûàIíÕ1–ﬁæD›&ItQßGøQ‡àæü$ Û˚£ºd0V∂ñõÕyâ(û£WF7’3f˜9ŸRö*øz'Ë™`±NˇÜ∆ ¥œ⁄EH∂D˚"- )7ù;ÕG }Õ`OÄπM$c§Îˆœ∏7ör≥MÜùHú–2
2HÜù,nñb*¿‚Kÿ3≥e±øQ»{‹Ÿ˝á‰ÛSK>Ó
,"¸îK:{N´’qq—(Ä7˜/-›…rl»[3◊‘ÁÎ…»Ä∞ìdù~låèß!€=iΩ˛ÆD˝–b,k8LÆóYÅQrM∆âãPñƒ…hê¬°˘$›È°æPsÑ≠¥ÈÆ™	√Ôl	[Â˜ƒn^Ö£'˙˝@Kgì§ﬂ=4wÍåz~ÿ*Fá∂ÿ¶ı‰√(v^¿[Ï•≥x;°ìDŸ‘ÎóùGÏ#4sÚ7Òö=ñ∞ÿr`b^òŒ‚ÀXX]ÏÖ±P+dt±_˜-.∆ÊRú˘/ìHÓˇﬁRLyvçÉ™<™≤ﬁI˚ÅäXû*†’sZπZ}ª˘9)[{Ê∫?:ÒØéã$6û˜`^ëü˜,÷"\¬€m…‡B‰YÁŸÕ˚ﬁx< ∑÷÷@îo}üa†nå·iÉµÀç5d≤˙}sÌ∆kœ	Vè>[øÜˇˇ
Õ3‡UC|ˆÊh•Ãt=◊Ùn`Ppãg+ø;1K– ¯Ì2¶4a5ÔÙÏ[`¨´(aEhãÃbË≥8;LAå˚leòÆÍ[æP0ïÅx‡≈ÕbE‚¶∞w ùlAÀ«(üEibúE¨bˆnæKu™_ X0ıù°rSJ+ o'~WÊrG0-®xv®H¨¥¨`ée *ÕöôMÌß¿@˝K¢PwDqtÛ;¨ ®úxíãﬁX˙Ë ycqÎEiÚF–*…ˇV^Jﬂ‰„Pı$◊ó'¨ Fópcês?ù•Q÷m]e !Ã–Q∑¶_™c1ÚÈäYùFI‘ç¨Ñì€Ñ˛¨nÿE#Øâ03W†j${h F™{Cv±{))¢Œ8πå∑r8ã˙lû@`Ø#Ã|@ ÛÒ©¨^‰œçZPònˇ•õ\§‰>9W8eÓ§˝H!F˙à!*CkNƒ“ü√¥†}:∂Zá˜™Xå•"uì¸≈§ˇ›nåfGÂ{∂ÄX€n`¡oJ]¡
∏ΩÎNÇqÎ˜‡ˆ®⁄,úiÛ˘|≤íã¬˜rëÿºµÈ-û“fï~uﬁﬂ∏ıOsDÒ•yﬂ1÷r‚]˚<pÆ9A£7 ˛!"%o7Œc≤ÎÄìL`≤êtxQRÂn˚FÍı‚.j`0ÛN`*≠“uÃê,?«’Ü˜∞\/›.ˆ–x-´∫Hç©Œr≤≈ÁÁq2éZÓ˛U"¯≤N∫ã8èTbÎú$é«àFåÇ˙ôÖJRD)Üß[≈–HÊá[?=…¢º7èFiO-˝.*Åé^í* |8∏W5Œïå%4«!5˙ÕPÊì}ÎΩBöå(S ˛+Xäh%ò√§*»u À8qØT≈€hâ‡‰ü”ÜÉˇgJ=Lc˙8;Æ%®7⁄k@A;d(U&€N:HUUG§Ë(9D~1∆Ú§.ÛgSë´≥›Î  õŒJîoï1Ï†2ı,ΩNãø–ëÍLa∆óË≠ù∑F °%˜“n+ÜÛµΩ∞>í€ÏÜ∞kiKﬁ±;kBO,πõ ∂π	ﬁdY’®Ép‡“Q0¢+úvx>7≈ﬂÆ≥F	X≤ÛC.ä≥†gü≥0gıqË‹zÛˆF$ »∆µ¶†a¡Äjb⁄Ía7ˆ–‘…ﬁÿ’∑ÿk∞/∆Qz⁄…–P¿_ﬁÅ∏wv≤€?”#ˇ£.Ãﬂ(s!|ÚéLÉí‹FÊp!(¡ëu™∞••P1oúM‚¶Ù›ÿóDΩ©¬IB≤?≈
Ò¥4rÁ˚á©≠õ¢5äTﬂiíq›)ùCÑÔL9#ΩíÌç[^†NÀÑCEù@¡Ê–ë¿~kó‰øfÀÌçw"±∂3Da˘øPã.ﬂk“·;.æó&±p√∂24sÜÔ∏ÒØÍò^ô'$s…ïˆñõ5L∫x⁄4`πæhT§,IÚp©í$ï‹¡πòıÔì2êKt|L©oÓFxK%¥ÅøÚ%{„h…lÎw°	X√DAû$Ê‹ÓœÌFü´}á•πVÓsﬂªÀ¯K›¯⁄≤H`¥≥yÊ–Dﬁü¥ø⁄;=8⁄›;"—›X dGUπãdGî’:⁄Y2ùÚ]™ïy-ÈæõVÒ
 8¡ö^ˇ.âK⁄}'Rf%ˇ2ˆ¬/îåYâ‘E=üúÂ„d<I	=Z√–∏â≥Å&p:Yªè…:{˚º≤ÔÌæEgπÔâ‡]≠æ≈öıçııˇÑŒY<hº[ñ“qÔÆâ‚?¶,Ùë¢CZƒÂÙºÀG:Ÿ"(ºW0ΩyËªU∏ﬂ2…øoè˙‰ ƒß3îçÔßÓŒΩ7m∞JäÖÒ⁄…à¸;À=s|jÚ4≥OB≈Ü˜ı€~˛\ﬁÀÀÀ∏K˛áx∑N∑y^∆éåàªò8üûRh<¿mΩ·ÙvıQ†√W—∏Ã˚∫æﬁ‰ﬂ¨“Ä‹œí¸†Û@?G’zKÇ†Âçf$ﬂ¨-Â=hRÏ2ÄÖ=UÇºPÔb≤8y~ì‰“#6√X˚‰,xˆ/Êı‘R¡C_È>è°Œu~QîËÃÖ?&o	Á∆*∑ˇ˚ô[™m˘¥ûI∑ï√Gq}ısè|Éu8jΩÅ)\
Ø„◊∑ˇã* ±⁄àèVÍ£_œ&yáÍ±ÑÓ®«•◊sÚ%öˆÁ™+( rÂJNPHí∫y÷}/'Ú"∫9ä0\KØâ+%√ ˚¸Ç!@Ì–àrk¿‡Ä°¨@A˝ü
ˇ˘õõk3≈D£·‰0,ÌQ∞@`UÓ9Û‡ú±l7‡h€<%.ÕgâË%ä/¢ÓEÏ*ÖÁ…%çææä™{î	®…àûT¸ZIÒXVªáÖö◊…%k%Í¿◊¬ßyGµΩWé=G'îlÁwoˆO⁄ª¡;8€e|ÀK∆Üt∑\√F	Â	í¡†˘cÌ◊bË e§’ôû≈V˝f-a3?πl∞“jyû’IÔQIVˇääL6ù`%ôƒ‡%85≠ßkΩG·NÉû%n‘f`È)!≠ÜêÃ 9ﬂ˛sZsw}YçÄ´≈√
øœÀ SV0¸&=EñßãÒóY:P<òfQfÆôÉ¶o˙iïÈf[…˛åË`÷îÛXù4ãà¨w”1ó ≠∆?ùŒâr;Ä¨C9Û1ÔÀ…0°†◊ˆ˜&ôKZ)±Ÿ†ò##øéøü 7±≤6ó}X≥`V–kY±˙R…w≥¸b~E v‹èœg`å·ëÂU√ÓàÀ{É 
ÚÚÃ|∂^‰jÊ¶áH»B%¥%c˚Ä ˘OAªPûë©≥>^"m6Ëc–π√,Ì¬ÚRBß‰‹ÀœIX«ﬂ¿@ª◊çR≈†`Es‡≈iÈ¡ŸMe)u™ãc˚+4≥Lç–G78áÏ‹!–à”k!o°è˛V‘3ñ ¢Oâä‰@îÚí]¿ÍÃC8´ƒ¸
%¡hÀk∞lg8#–Jù(ù=#’…R®˝v"dUg˘ñ◊`ıfT@u{¡ºØ_∫1îÂå–¨EÖü+iÿ‡d˙kQ<ÿb˙â^’eRüÕûR@!]Jç$â°Ëü¯ß"2a‰«¨⁄§ÉHÚFI}C8∆ÖÜ5˜ûõw7?™‹ñrWOŒHO1sœÖqjêSÖ<LÁÒ·œ¸.®1ﬂêüÍn6®v„}ÈR!ug›Í∫Î≥`∂Jïﬂ}8}40=IaQcYî˚¨Â$Of‚Z9ÃJì0.õærËáE0Qe5`T  júöµQ”¯ ¿Œ”‰Î£ÓA	§/£˛8"è≈Ú–Œ˘ •tÆá]ÖÖw¬QÂGãuCg¶ê»ÊÑ1>J3UAŸ¬@üã'—\‘oB„û^á≠|• êbÌd⁄*â∂òµkójWKß¢P©¯mK‹∂ˇÛ´Ω◊'ßØˆNæ>ÿUfÛ”√ì∑£÷Ä©JôæXXz~*7í∂¡;q1ãóÜ•≠ÍÔ™N«KÀ.¢
ªgRä˘‹õùœ¬"3ÑµpX˙¥íRiµvüƒ¢Ú¯∫gﬂD∏≠lÚû \ûµÅä=)Ï`“‡ôl†4ï|0ôDÒóÄXıÏÜgDô«~ÅzV:|æ›`∫sy‡*çdßv]:Å©ò˝“dõmuv˚Äy®(Â√lp:E:äáîc-VvJ©€p¬∆dá!$*I¯ÓqmÂy+“Ö„2bî´tòëΩ∆#ƒ˜±%•†®K[ ƒ˛ è¯~ﬁŸô5¨Êôı˛ ∫à˜;ËÓÛ”Õ[ó¿RSß1™ Äœ? ÙøL˙dÀ¸gèıøJß^î˚(”?ÓE–§èCÄÇ5Ktˆ^Õƒÿ—Ä‡˛æçÛˆhT=˝∆Ú∞´
x˛hRÍ©òúûûsj•Ÿ‰ŸuUÄµı<ö>˘‰ìµ5±∫∫JÖt€;'«xÒI|=J≥±r¡⁄ Qgåï„&‰·RøA„8ZÀUôÙ˛√™k €H#ﬁ?∆Úc»P¨ªhHR†yÒaüb–»xé|IL—	ÕÓfK®‚èπ”ìínüÉ∞ß qÌw∑DNyûõ∫BóÃ¶%oJ^¶I˜Ip§¨°-d%ø{"Ü¨ï'bÑf}	∞ÊÕ:S≈6src
¬ÜÇ5 ù
_U}†íŒ®àôÓ(«¿It∂ÖWGiZ‹°4–J:"+û*¯≤ﬂuü ≤ì@JÀ7ÙˆC√Âj<äZì√èq£‘Ò°¸ŸxƒÈ≠9πSèïY3¿ßËY?Ö)Ω}∑]˚Æ¡>C¢J_Ωîø˘GuÙJ‰Ô'πII–î˛rÊ⁄˙Æ».Ø><|óÚP¬W_™ÎìÅ…NÂb◊‡£bö∏æ¸ŸùüvÜ£o’%a√_Ë$Eo´‘j™_ï¸oG£hì•547-8)ƒíhø]dπ5 ·6¨Ü⁄~q]	Ås`õTÃ·(>ÁÎ
óOø>yıíûÌıcD”Î'2O-ŒˆÊhïıÂ0U'•ï‘ïÍîO^ªæ41}Ï$ì®Ö°Ä¯_Ã{Ô6D,Ì]F ¸$ÍKÙ'ù,mxXÖ3≤0ãnXP;B£p˜©ﬁˇ7à˛xóñDo‹éLà7§")OiËäK$ªRÉ-Ó–êO¯7b∫Ω]ø±V[çój‡Xñw™F,∑á€†œ¥W—HÓ_˚^U£r†^´Á	!52π!ÿw”ñb¢lE—ñúµ£oY-Èª>†v%b˜¨ñÃm÷çà˙BÜ≈ä˙Av˚'ıÌöœ⁄kXæºA˘ì∞=‡‹Ëy5åu«úYZ‚8•jÄ‚™ö"Ïq‹â“6f…éä—≤õ÷pk©ôF`Y”ïÂ’áTÛaüÔùüc˛ZÓJ9d˘Í=«L∑í!ÿ∞'¿ iﬂgc÷g@;ı´ì§∑ªIØ[˚uM&‚U∏J	y˘)oí◊k]JÅµjMöo£E'|+Ωƒ‰ìÂ…£∂ë1 ©J∆iç{Ò∞^ó9ÖcÙÁ^◊iva≤2˙9ÈßGÈUC'\uf«j—È·›¥3¡œO1x5`¶Ω⁄˝Nî≠fh¶Êq1’i”ﬁÙà6ÔlÆÚ2¢ºÀH◊æ}ØöøjJGYßwgã\õªV#*)ª”≤¨ØÈ}bo¨a:ài!Ë«%öZÈWÆ
ü‘∂≠§Ω∑/)s1üÉ<	á’÷Ãxg⁄ZD˜TÀ3ß9ÙÆÛÏj_gı=˙C´1¸Q∞{j8÷==2Î¶dÉ\ª/)∞líVçÅ«äÊó[b>0 ¡ZøT¥ íW §)‰'S_∆∞œ⁄ò√Ö/bqwaGµxRJÓJ-ØC!f7πT"ånR±>.ç„,Ó‚Ï„ÆTÂê^≈É‘¬ WTJÎÈ?ahäGí∑`D™<Û2Ω“™¯'ÜÄ„gE˙u’>˛”íÉ´w»—iyî‘∫5ß¡V2ÏÙ'›8W¬;	≠˙}˚5Ñ©à∑`KéJœñZTâ:ˇ˚d‹tcçD¬Ú
ﬁ$©N˜äƒLvILù¶8E14ﬂ\(|€AJ;ESthß”3Sì8^Lãéˆr´lôs¥⁄’f-ƒz–˜åp¡‘:k‰'øﬁ@¢qí`¬bµx/™xœƒ^»°»Õ:ˇX`œïw5ùCßÅNoÜ ,’!…œ°Ÿ”a7>è‡L∞@GëèYDébRd~˜ÜG»·ä3hÄ9Ï%@¨8^Ω„4#ÍüGg1U£™µ_ÏÏÓ}˘’◊˚˚w/_Ω>8¸›—Ò…õo˛˛˜ˇ˘j≠|‘O∆6WÎc˚˘níè“!Œì\’¶:é«GsÜÍsÓÆ∑Î¿Ì’∂|ë¶˝86¯Ä•·IJ≥CNA√∞t.7( ¡Î™∏‹¢.˘MÒë:ùåù )9
Ymy˘T¡ç{\}Cç)b˙2˝àÜ›ÂÈ≠ËÖH7ı—pSK©Æﬁ™†I†Hœ[rˆACµ±≥∏]&òZ¢ñ“t‹&JÒˆZ3IŸô?[◊¸µXV©jD°LJd')„_~>_Ñ+‘)Bå≥ŒzIYsKÔè„ÅˆNü]≥CÀI∑)¥{3¡ö]g™…ìÄ%LÀì@¯Ä¿Åˇ¿,§{œ-™aËãk¬™9 L+2®îKNiì.ÅeN˙=«†÷o^“-^t¡.¯3Çsú*öÖ*Ö•ﬁ!4÷*}TÕ¡z8°bmEV^E##…∑Î˛' ˜˚Ûyæ™€„WGçÛ4€ã:ΩzΩSË*XÎb|4Æ ≠Á	Hl?«}˘µ%“hÉµ?ÏÆ¡p≠∫Nà$ÿiCCEX∫hà«4˚UË¿8∫<ü7,––ß¯Üâ∆r⁄PR%˛°ò»Oø`Ç»˙Ü"=˜∞µQ
¥Àñµèñ kanZb˜>ë|T~CÅÙBÅ¥!%NàÍÕå.Œ*òŒÏäDs÷*…6/ti/º‡+ıõgb£x4u∂1´
ÙÈMÒ’U†p#LxäHe*ª•È B4‡]w“ÃÆÉıxD’LÁtRfòJPäˆ§ç÷{Õ‡âπqñ©˝«I9-*NTØÌ¡?ÿÜÍ9S∏U£zL.’êÙ«™Ë—s]Ûà0
;¬™–q/Ó$›¥6-Ü	8Í˜F`IºÏTqº2ıóí©“®´è
°⁄≥kk‚Ö•ûÏ∂èùØc©1,¶ñcŸR/ã™/“Ïøc+	ò÷(˙…iyÚH´√q◊Ã
öÍ∞E}º¢¯kñbÖy3Ù⁄DCZrî*X3p^ê)õ—œ`–M©oR†¯©r.í÷L`Da M°∆ö≈πÌ	h}vıÙ[Ó$“||Jæ˛.ÏHU¯ñÎø±Hï©1U∑∆‡Ú≥„g∫Ÿ∑#:d>”ı’G≠b$D◊ü∞z:æÜæÆ⁄)8V≤åF“ö"C®	à≈(ÓÉÃ,*9ê‘nrëåe¨•A≠˙ Ç≥ƒvzÜËxtNA∑àGkªªª—π,IŸ∞ ı—≈#ËˇáÑ0u@ô≈@ô/„Œ]/%på9Yj≠lXQ°‘£?˙,Õo∫∞˘yÂ≠(Ω·ø# d≥ß‘—WÍà~s†EgîÿG‘¯P{ƒﬁ–§›œ¶PåÃªÙÈ≤|7q±Õ≈5£·’ıÄ…]nŸRzûKıö1Q7Ñ{áJˇpΩdZØ¶ÜÓzSvΩ©`∫ﬁd‡\oZê\Á• ’Çb˙ßgSI„eËÛ•TÅ)“Ïº´2≤\∂8É‡∏H;Ôy—Åúä/ÀÛ≤R≤ò‰*Ë‚Ò·0¬4j¢¥	¨	â#É}@mÕ‰Jøf´πén
ºèp∆ºÎbàÿçı∂Z¸Çßç	gåA(ê‡a&ﬁ!ßAO\Á7√Ñ¥Èä±™Ë=‡ñùÒætdgVp˜a>†˙-=µíódõ¿,È>o¯Ñ3*z˝µnáI¸.k–\éÀ¡T¿yK#<ê¢‚ÇV∂¯‰…'ˆ^râÄµ≠*B≥o≤WºŸMÚ/JHLxˆ±∫&«	-’m¨4ÇV!∑ˆ3oWˇx2¿÷-dÄpÅ	≈‘6Zﬂ¶…∞éFQ⁄ï5AO0Ù∫÷¨FÒÎÄJÕ…PÉºÓ†¿>iØÿñ¶Éô˙˚ˆxñÊﬁz£¡e;À°√ëˇ&UÍD¬Ù1ß∞q…D‹¨7äN›oı{ñ^ZÍ•˚z≈Á!b3h*ìÈ·ˆ`òcﬂÀ«;YùÀFLˆ7ºŒü∑ﬁÆø+F¸ o⁄<√ˆB™V2ûM‡Xó¡kEY}xA\ÒìÊaœ(À53ÀﬂœØÎ≤K?àÔŒ£˛{{Lµwy˚c›@∞D‚êT|xpŸfòÙ{QK»∫X)Z§X-§sJ(òˆ'√(W5Ä•c°ÁJÂ†{<≈öZ≠Á—B≈ò”Å±ãßÈ$ìâY)ªU]©ﬁ9¸rmÁı·ﬂrmAC\ã’@Fu|É«Ø¯ˆ«räHu:‘Óo=‰ŒË|©s≈\ZH6ÚTêúÙ∞ÁWÇ-w∏Ä~
t>ÄÎ≤ìÖuö–áâr%£[îE˚√<Œ©¯ykÛà‚%É5Æ3+Ï˙RLùoôÆﬁAm%n(_C©`
óá*~º†R2ÈÓi†uÅQ»„Ç˙BÇ∫8V8G	}ípïè¨Q[˝hÅP1W#˚¢Ip‚2ƒTƒËƒ„6§L6ﬂ/\Í†q§'◊ãÊ,™õqáì¶π…ÍA+’≥MoQQxú¸Ä@€\∑”ÿPBﬂ¿?O≠°J2ä˜Û¨h√G:ôImæïßµ§â≥o›ΩôUû¢õ◊©e˜ £´∏3†KË¿»È=ô™eÚë_ˆÂTÃ≥FæÖØÓ-:{˝ı,tKµÙWﬁzÉ;≈Vé†2í¨∞S‘«Íyz´uö™»8†°D{ÖÈkc¯¯∞»¢*%>§P◊{î2^
,q)L|œp®òmà=´.πdí'`4ﬁ)Aˇ'á´&åÜu7e}cç§?ˇ0¸Ù∆Íj™≈lÎıÌ=P÷ÉÑ$,ldã}#w–Åçu-eˇaXkLùF1ñÎüøˇ√∞’jâXê—}i^öæG'¥ö∑_Bìgc¬AƒïÄx¿∫[“∆°‡cú“¥rËœÔ… Q»√‹¬°0ã˘‚kÁÅÜ›’Ej`AÊ3ë MóÂ'·#îƒü8ñì£	óõlbÓ&´|\Õæt]\q8å_ıñcuuPl„ﬂî-wéÒÖø‹—N¢¡Ô86ÛZŒΩhŸŒiÅü›íZ:Ubú¥Ü$›h`©ÜZÍI∂’ù  |˙ïv-`‚¯"ãÛS˝°„…∂„Øk≤>… ¬¢Sì3ÿÙpgå9ö±î^<+R°V›0fAÔd…ôQÔjÕ¨≤pT°9>):ãÈeº£ÜÆ¶Äë¿ÊDjÖkΩ3¡"_fJe“AIüq‡ê~'≤Õ√u—M–œXZ9Âi∫‘oPdöÒ,’)°ç:S:({∑-ﬂ“„x¨€€uÌt’∞Ωû©B!ã&2◊’ﬁŒ ‹•Òá>ﬁµÔÕé}JrÖ`‘©vπf∑™«ê‰‘cG§Ω∂›€¡f>·4¡zÖ7]Ÿ9p‡pí]D3€"å⁄Rµ=ë›ˆ"…z
$9∞ÌÅ,˙¡"Gh·\*IASú"ÈõËæ∫ºPó®‘yXËbg1πúıFkòé[f-…çãRﬂ}®zß˚««ÑiıÜ{b”¸““Íë(Jk=F0jÊ,≤OÛ8«ù…lıeõ:ÃwÀº 8*ú .Ñ´u§IArjÄŒ|≈&oTµ»ﬁ+®≈«
 0ájôÊzÕÑ≈¨•E‹ëÎRw"ÆÚ)äebÃ”(ãd—eí£c ΩCz&]ÄXU»%∫Z◊≈r©∏f4ä`øÅ∏ãû…√›§¬ü∞v0`≈Ì_pi£àe¬QGôJ’˝M1J≥˚çzôùD=ù·[©="∑[∫*¬ié$í¯hü ˙J‘ﬂjåòÈ¬@ÆåJµ¯¯‹È≈Q◊à-}-«¬b¸eN
Õpˇ°0ßüx¡X§;èAvˆŒëÃ
Z.ﬁø°†YO˜ôµ∫¸·#°r-µ™aÏqò§π§v∆’Ár)ëô˛+¡ll–íŸæüƒ¿·ÙÉ9ØﬁØ|zS∏27bTŒ—;	:a?w°¥’wµÈ
û§‡ÑT¥oéI˘{>‹Ûi1	kNpÓTBá∑?1e1±∆É
u™Ëú¶E¬ﬂM™À‡Gó*	>DÇ¨e)áÛ⁄î·TªN¢î$ÄB5Åƒåb‡FFc»π≠[ÒPLÏ§ÕıÎäm¥ﬁ´…môÍäW¬âMÍﬂı˜∫HÙß7∏n”ÁµÖáN„‘¶FƒÄ_*Fe(k>$ô;»È´{˚#iﬁ3ù†"£Ú‡áπ‰≥Ëá¥áX∂Zp
lå!Æ6ÀÒza•	HÜíl1Ò»ñE49Pöï‹:z©Û’∏á∫∫`¬Ç/Z;ÙÇ‚ÇfWÖñ†¸p^Œ’˜∆æR"Txp{r¬‘kúfö21ÊÁZJÒÚ»†KjåJH>
⁄0]yÓ·…}-=:-pWf?∞N—’5(O%;Ï£rXF
Û0IeØX‰~†öä{_Óøﬁ?Ÿˇ¶çIˆ|¿äΩ<áMMQJC£77yYÊÁq2"sw‡õ#¬Õy0è”ããæÜ´ﬁ§hI∫·û¿FeÒ•Ø˙∆◊cúÑ/Y‰ü∑z2Q &])ò îöÔF›nùiqïêÅè‘6Ù&ÖâG0%FÅ.>¢≤f‘Ÿ
∞§∆Ç•ÛMvÀæg}tZÙC›’p2ô?\{¢Œ˜·_}OeÈêsEÃ€ö6Ø0	L
&·o,,≤<ñKìºöz1KÂ‡gcΩœyF—•,îªl~ªÖ∑ÜÇüyE⁄á5ª§yL◊≈„ñÊ}ãΩD@-^ÄÀ‚°ÇÆyJ◊˙Ò‘Ú¥çÛ2ıãåR<±˝l"'A9@j°∂
ªTN‚º”gÍå¥Y¥Mé ç+UÔÁÿtv1¡ì¢6Í(Ù‰Yg≠üú≠)¢≤w'#Xßº°]Ω…◊=å≤Ëıòy^°ñÁ£4~9{¬∑»@/2A¥!r‰p¨VvıcïˇÊuŸ¬„íÌÑWÃÛ£2}>oR˘RÂÓ6:ØŸ5k∫0@Û°ˆlmqœVeá®ËAF'úœ¶ã Ø˘[åˇ"´n8‰8EŒ„èq¢–„ë*ÀÚ^˙∫ä“w¶euiâ›8èøçÃàQññ«
#NHbE›@Üµß&≤∏<∑-%’FcQ8C√LKB$ÜWÅzı%‰Eãáızp-RÚê»¶VÅ˛d¥D÷≤àéô%y/≠Ü’Gœ∞j—\À∂öâ|õ6ﬁ@H˘}LühÆ©?‰ﬁñÀRw_:ãr˚ﬁBΩ*ª∂ªc∆õ„¨¡Y†m+1}+∏ƒb˚˜õøˇ(L∫?EPaæåt†∫à≈˝»s#J¨É1/Bzn)®1¿§,Ë≥‚¢<ë57€∑ƒ⁄πõÍ$∑≤âzœeA_¸›§äÈO≈ñ∞ƒ<ﬂZvÆõˇ‡ñc©Ov2*NpéúÉ˛tÉ!™?§R≥l√zpk"ÈÖ{K óSmQì}Á*8Ç5àtöd1mZ] @€¢;ù/ÿe”xT…Ñ}V¬tøÓVë"3ÊëFXd3f)jr±¥U]•„Â	˘Íó‘S:π©yÁØ™8GÆ">Î°¥§ñ®ÿ«ŒÜ¨úœaYQ4K¿ÇÄsÍ_°ˇ}8?ºÃ¡Ωπæ≤˝ØˇÂˇ·yØùEïÒTlUoˇQ¶¨ìöúµcÃçq˚ßî/Ú)-ë≥¬ûKCq
Ëõí Oa¬v™Á°ÛèÛ˘∏ÜTZ [ˇºü¬Ü¨£˙ß5LØlfÊÆŒ‹ô≈ö¿ÕÎ‚◊‚±˘œÊ#Óß˜$	ÿ€ˆ3|Ìπ®Y’Pœ¶?,À âÍyÕ ~_éTéı@S‘x¥j¡ï‚ˆ
⁄ 27±Ï"VF"j%ì{k‹D¥sQ[•,≠2ñ5+}µõt›•´6>Ç¿yñdg"#+sÂûó‘<o’YJ8ÕI»O®Àˆ‘MR€(ÊÙé®8"π Êâ@v€-æöäõ˛Ω∑˙≈„¿⁄Í˝Ú≤HˇÙ(>œ‚º∑s≈âÜ… ≥£Á£dhW€‚ÖÁyb‹ODı∞tÌäœÖnZ>è∫ÙÔi:ÄWø¯DMUï;“£,Oqks“oã‹:îﬂÛ–˝QIm·çu,.¸à•Ãw´
?Ìm˙e6h0ÙKMÖ+Óöba*7Ú8πË·pä¥…%uù¸˝OﬂÄ»ò{c`e—ﬂlnzı_`?p¯!SÏ8Õ≠ÿ€¥&ZZ⁄Vœ’´Û0Gï[1Kº•Ã*ìaréΩe∑F»j,:˘úgó÷‹îH∞FÒ4AÁ1¿ÂÛg7‹ól*0!!¥˜VD‘Èƒ# ≠Î~~›ƒˇZ≤{I∑âxêíNp]Dô8*- ´«?8õ∫J9Ç?GÓ!/Xix}'á* √)ñÎ§˘–=«CnÁª∫Sk`Æ2ﬁÍÚjı‘…TcÎ_`±]‹&Tìmc›ÆD™QÕr©ÀO•"I†®_ı˚™[¨ÿ3õëª≈F$‰á™E#WÂÄrm»Êh∞ïÜª»År§°ÖW“·ﬁµ≥h+Uk&ê[—=zÁ¸ï/Y≈ÚËälÅñÇ8ﬂjVbç–v[Q∂pî◊œ¢°¨’ﬁïF`ì%KõG…∞+SVåYc3nR“ã!ñ:d.)YÏÚÏU,≤¶Ä£Î’áÅÂÂ´±±Ó¨≤ªT%Îz±¯6úµÑk±rRÅûÕäMk-Ò7PKHRxë∂í!÷S^Ÿ˛F'áëÕ˙≈É€˛7Ãs
â˙7ËÇîëe√3#¢Î _MÕmóÃ˙Ó∫UÜ4'Îë+Y‹è»œu)™!ë»ŸŸMß{ŒX∆ìŒH
Öö[è÷Y’9Vaﬁ&Os–%S∂Œ"J¨k{3ZPsÑ∆øYFèe'Y`D®ìáw—Yûˆ'@FV·¯Aõx5C˘QVFV9„ÍÈ#,÷°óïÇ¡ï¶rˇ}ÓløŸGâí9Îg9gΩ¿éPß2Uõ®?…ß¡˙K%*Õè¶ÃõÒh˜:Ω4˙Lø
â%û⁄≈Ωú-ŒN¶_·ÇÔDY◊*XVÜkdªﬁZﬂ|gã”≥%a˜∞48î¯~⁄{Ë…ˇ˘†‰lS–jy YŸ~Yx∂j¸Ä∆CØó9
-?,V∂—Éi ¢Ô'	qRÌ≠ÑÁõQöhœË¬ëz@|}ï 0óyÿ∏ı‹˝Ç27∂∫_Î—?°„iÊ∂ZÍdÆ|ÎHx¸°¢∞Ñ ëj!0v]‘p'?Ä¸Ë√Íú€ùËpÊ™Ê¬3Ph–+HNﬂﬂ>˛Ï≤˜nf—˜UúΩ/“∆zÔÚ:ïË%·ó™Ù§™á¬*=˝ÿïûÙ∆’‰ÎQ£`+≠–^Rü]û_+KÅÜÓy∑K≈ª˚óï4∑<Ü‹UúŸØøóW∂…;Èˆ/]2∆BÛÖG%r7zC˛ƒ“äØøﬁjàB5ÿŒµäaUñQñ\(\xÀˆl´w”í…%VX‹M¥	1€Æ˚5gÅ∞M´¬ªˆ71“y'ˆ6£âöÉ®Ù"Î∆Á…0¡Ï∆DAWlÊ‰O–P\P≥¶∆≈ªb^éµ)âY˘K◊+{ à‹Xb∏.∑óh≤`jπﬂ¯qT-®/¬-ŒÄ	·†≥)áòMEq©^πˆŒ%Zå∂´£Ü';ÂÅ!.9óŒ'y%ò:Àóv°=i´*Ÿ1@SAZ0]v Öm¯«µÆ≠_˙3\"—rØ∑1ßãt"T’w~”e5—z&Y°SÉΩóØØœR±·üøYC{^ âgaIêò~SS®cTs°\NW{Ã/|ÁƒÊ∞FŸ˝ÿ:F≥2äü„¶tU¸2˜~ ÿèœ«∞Nt\€ÑÛ ≠IÚ¯@7ÏzﬂÂ'R©v`E”œtFQ¿Öi°‡Æ«zßÓ∏’M*$j÷C[JZ“°>Œû≠∆9Úº“ä¡Çª®ƒ`s%è∑ΩU§ö3’îúzˆWø£¡ÈIµ|x¸ ÇÁV:£Úá*´[æöÃ0áæWäRnr˛æ≥≤jÕˇ(V2+$´÷B÷∞◊µïh–¥±é)ÉÒZC∞RãgIú ã[Ê)‹J©`1É´Ω•”*òË$†¯º∏Ñæ≤}@a7m,Nq˚g<ä::∆ GìÕT5çnkMSÍI<˜*ü√yö§R&mæäÿﬂ‡[T€=+ÁiW-©n:⁄Å#_S±9Å∆üÆI<e∑4Ç0<mV9kﬂqøï∫ú©áåÑ_ﬂÓ¢´~∏>á¬π‹E¬a`≤F»äÜÈäx˙{ã©Ÿ‹«cI|;Ü}\ﬁ≤Çª’äëõpù¶†ñÉ´Íl5Uê˚ë§j±π%uV6\w‡«Sî«(n‹/ÑÂ¨§
˜<	º…±ßTrt.4%/êU∫éYœdfm9f∑ÄJG%⁄é˚·öÛr&∂{–ºÍ#ÌôªzœÖTûæ_ŒCA(§Ú˜t¸R´o·–J@Ú≈øRïD	Ì	∆…±∏F#ê->¡¢à]=ÒôÊ}∞Â–Ë§@¡Ûy ¬§n8>d6C&t	V	◊°C^1Ùı⁄È≈@€O[“‘s˛‚+P≠°∏Éñka=◊˝(πÓÓiXÖ`_@'>Há)_7@£/]Ÿ]>/V€x˚ﬂˇS‘d∞≈ç
\gë”û}
»¸ ﬂ/ìkÿZõEé¬Z≥q4kçô≠R›Õzz”1—#aj,€(9–≥?árxN≈™ü&í+°RÍo	‡¿ﬂ«ÒU|Ω\˘8*—∫“[Y¡≠R3)«lØÊtòkp9Ÿ™hWõüÂn1Dæ†∫d‚jUÄµ®S≥’€•n±L≠ÌR˘ √‹-•pPLT-È:ÙÍﬁ™w∞'r‘R˝¬Ì(õ©Èu§πùBò ˜0ví˛‹*ﬂ™âªN∏ãÎÏK‘_wü¶v^nbA°˜<m˝/G;_A£ûÙ<ıâfı)F.æ‚æ¨óENkœzIì∞GÏ)u∏]Åùò◊~-^`ŒnÅÇ4ê`—^˝±∫*.ì<¡òü1˙ˇcP¢§gòRºé…ö∞Ã£T 9*˜XÂ¿+∫©=∞N‹üP0∫ç»3©õ`zm
•"≈f˚eqá‘mph¢ÙH‰]Ñ…I»\+~Ω∆§ï~ÿ»n÷œ)tèz’∂PÙò·I∞ª%Òµ∑zé1scÿHœÈûotMQ:¥ıeùNﬂí[∆ﬁÈ∏E_˘Ùø–Â?™èíp,ÎZŒTÎ[EDK?™tº¬?u¸xÑ¿πZ}åˇ∞√˜‹—>ŸÅõ·zÖU3≈≥H»Å ¶v\≤(TKxNaﬂnMﬁ0„`“´∏ÎKú÷¸‡ÍÖâëe.	yÂË_˝O^?"…—Qç;∆H∫&ï¥\ì°òUKSM∫oº∏EÄ˘ﬁÓ˛I˚HÏº‹«Ã ◊ﬂòÏ`ÁÓŒ äVÅ<≤ù‹…ª[Õ<Éˆ^ÌâùÉWá/˜NV¥ Ÿè^üZ*Ê"∆vπjµZ˙”&˜ø≤ïœv¡X$˚éÁÆ3óã,È
¸Rö|uSo∏⁄¢Cî%in/éÙÏNˆ^Ó}yzœüòî<˘§Ï»äy)G≤K‡.p˜^µ˜_˙}ì˚Ÿ Unké&ﬂüÀqg¿Ûaû;2[Å5!ù◊¡üì9z.“¬o®ÓÏÔ∂wKäÊ∆%†*}˛f’[⁄„ìˆn`√êﬂ‡£P˛Üw^[£†}$FcQ+¬ﬁúFÄ˜V7≠0¶r€;—Ñí»ãÇ≥«Âé·ÌÊ;Ö#Äõ«h°ÇHydµ+‘D™_∂<æ‚∫”c^òÈvê¸À»Î6J†òÈƒ9—`u_Ωª2Õ© ∂¸tç†W¯Ç∫1ÏN1“8Y'¨›´Í’üÄÇ˘îÒ–Ÿ“Â®¨O[º\T(û‘Ê>=Ëûæî-GùN‹ :‘r–ù°˘◊åÏ3Ú©R∆…‡ø†´MPÁ˙ÒG_ÿq~dÖaKƒ’ãæ¨`É“`ÖO8j\≥X≥‘W~MvïRÎ>TZS°ïd‘aYÔj¨∞ÎëTb˘–[V^]ªÌq!YFî∫Áß√èP˜UËÇ~ÛaÃu~œ≥¿ò<ßï™«áÎ ¶lıW•ô-o¨l◊Y+çYö√•∞—· ≠Äóûv2‰üÑáOK‚\äïY# ]I8êA≈;ŸÌü©∑.e)á $TY Ú6f€*ÇCÇ™TÔ5øÈ®Pªïp§Íùm©qœ-{€ÛÍÛËê90CÍdÎy GÇÀÜı◊∞ ˛ w°≠˚ˆ]Ùä7´˜´4ËïÔ≠*j5€ÊÜ%«q∏˚e•u  T®XJ…ü…*z-cÂL9Ïû≥\Z≤“ÏÕ%<∑_¨˘™e˚O6Ï§>cÑ¶>˜ñEÈB5ÎO˚`mÈÔe§®'¬Àz≥õìEöotm`%›Î
¡≤Ç-/\T©5ïÖuŒÒÈåﬁ¶’‡,ﬂª¯˜odˇ‚_µ°;ú`ÿŸ;ôﬁüeZz[8.±ØF £PäˇÁCÎ{Bÿˇ@H˙´F»Y˘‹˜g⁄%Àæ^@¸±ùã€Û(|çvP≤•jô{\∞øÄ\iDiÊÔÈ8@|A.˘{´ÿä~e≠∏á|©›•/h∂!Ëÿ_X~?w∞V—.2dÀohﬁQg˜2ﬁ£Øiv±–áQﬁI®p√Ωåµçñ±,ø˝1K“£f>%#rÛ†Õòó›L?Ω@õÙ$Kë≤⁄ãôå?4 eAwØ¡[≈sbyj`6ˇ¬ÑlÒÌü“*è∫r@Vê∏õ∑ïl´^ ô˜üﬁî<ù:OÜ8`¶ò´PôZè’BîΩBîÌZ"¡¸_¡yvú%}Bπ‘Û%KâsO¶X«DÀ´ÓL•Mcôâ∆£™∑ﬂµ§wG˝Eöˆ„h»k‹W(—J–®‹—ƒk´Ñ9ÎõbƒYâoI©öx	ÜÒ(ú°„‡œ
 ﬁP>[ø€£Â±ø√¥—≥;‰å·“Z@â÷#Ï∆t&kÔ≠éÆãÅm»|ÇﬁB§√cT‹G}$¢J˝P≤ÂR≤ß“5´™R;kS®¸˝A≈¶±TıT§@'ô_◊·G≤ÕîNe‹a–É›|‰õÀ\ì NIû•Ω¢Z^:3•” æ>=Ó•£4˚"∫–ÈcRáÓìN¢3'©\Ìcì/$Ñy%rj ˘–œÍÄ’ìì’Á®¸~êúRÅú•îzK1aÓA<Àtn§‰À1+IC9©C≥£:–4ªÅe 2ﬂçæüƒ˝òú∂ûPõîNSolº≠TÌÉ®j”õ†WòL-s`ÁîæèYîE,e#¸ˆˆGX“a/E…*S…*‘˛ „ e™2ÑÄ¸∂£bÀ`t]/0XœBi˛Tﬁ€(Îí~B¶jeµÿÏè¢:^qjOtWÈ1D˙Ü§µSY¬=4á@'ENX∂¸5sê§m{`^◊ﬁÑaEànæt—˙ª«€6˜ÁkZBÄgÁñ◊˙‹˚úUá6ı.p Æ
DöÀ#§\ º°Âï—RÙU©B–	ó•Oö∞·5!Úﬂ,?Ã´⁄n¶¬.Çˆ8ÓDi[ÊÖ«œ©5 cy+ïY
≥U-*@KıV\Q8Í_’Ôó¯0≥©÷ûÀ:&[f⁄’q≥ù˘ﬂ
ó>»‰%◊»bT˛6ÓB;€°0êYjMÙL‚ˆón6Ás#tˇ∂2Õ|QèÑ≥÷@P≤√XKcî+4g“∫ﬂ2÷ÓzRŒ’_%¢Tá&-(”Zâ∑Âñ! 6+®*ÿìïnL7'céf≈hÕT±ñÍûË≤≈∞‹reØá‰ë S‰Â€™ÛF»!&úÁ*Ù≈Ã¸3ù˛Á=“¨lK!´n‚ƒºl1VO∫*†DˇM_}ù`û¶F¶ﬁ™{Ú|âã¬&I±08|ÕØé^b^∆˘‡¨öäØMcä·ºÃ“·!ï§[+±\LG%¶
¿›Y¡€Â∏x£W⁄≠–$ÆØ7≈∆zÉ‰îÀ≤4oz‹≥%  .+"¥È/Ä¢Ë:ww‚d4~ÒaøÿyIu˜ñA=+:¡kz^À«Ã#&˜î€‰äü	Ö;J◊π9•,Z\ÓLs„0π"¡ê∫ﬂçœ£Iø0∑ú~∂¨Â.Q…Ú˚J∫âAªﬁIúÁÔﬂ˛B6Ö ´ü7l∑˘ŸÃ¥d<ÂÖ]—á«BC◊à«ìhÈŒÇ¡ƒL7~ŸÍd1Ùÿmá≥˚Õ!2T∆ ÀWúÖ,2g∫ÿÃJ«te]é.ÁçÅ^®˜¢¶ãó∞∑H “∞Ñ9∫Í|8åíÆ	·aSElé)7É…n‹ká—EJﬂá $[ïmqŒuô⁄["±ñ5<∑J≤D
cJâ{¬Ó"9™™˙MP©P!K}l.Ïåß2è™“ú∂*
˝Ö‚/·»Å‹Pè T∑≈ÁGi:n”…Ô$:´◊F∞»À≤ﬂ;q——$ıeX-c•ÏÆü∆»zÊúe¨Ú~	~>(gçy›1˜Ñ2µ¡/rFO“2U˝Ôˇ).?5∑µâÍc1´N	≥˙´gSùè¬¶f±(ó‡›Ïº>9jüúü¥Oﬁüæløÿ{y¸Vñû‰$‹ÎãÉà+…àõNÚîÊ?7bB.îﬁJÔ»ÖÃ∞Ä•ø86î˜¡ÂA˙ñ«ÄÿÉ/‹ß,YO™Yœ«b)ÈøUñí˛2X ¡—N˚’ﬁkóßú~πøÛu˚m 9K˙oÅ≥‰·dWaÔˇ
+.˛ïRw„ºøë≈^?j—‘@ˇËr◊ßz£ë™§ Gcä™v2 5ùTóSuﬁëïUa<C‡πtíMø´ït;À\ËÏ©jª⁄äù‡‰—ÏºÅvåjÖaÕ`5úÍI~ı§áxˆ_†i9Ÿ¥Tÿm˜f4æ‚ó?PMÿµJ9Fe>√ä ^˝Ü´Jôe]»‡ïègC+Œ ∆Ñ
ö µpî7Fü√ï<3¨Ç€∫ä≥Œ˛{g#ù]#|Æ¿™ èΩqß∏ì›õ‚¿ µ\• —8ª˝±‹SNˇ›pH> Å˚ª2Aª|æL˜Ê*RcÃÄ¥“úwÅ˙∏á≥“uÜÊ‚vQ˚◊¸'Ò∑∑?äÛË¨>8J	ºóQùé@8çHõUPÓìî∆:fïä˙ò#Í2ï˘ıw“A‹¡/—5
Åà¥ﬂìMé“.&í @åîUû&àhå_ùåZ^~∞≥ñ¨ f=ã	ó.˜Ç·ı‘◊Ó!KÑŸ?X&pˇÓ'}‰Çﬁ!b≈‰ˆöQUíŒÃód!™ôÅÁ›03&n^ÜX^¿‚QQG–∞3◊«√|Qê›ÍÅU/ÊåΩ^ï?sá6q%ﬁŒ2´r¥.ﬂ`aë-ÏÙ@mÕ‡Szq?_ÿ±πÇå‹EAÚ%ú2yŒîN•ö¢˙Ç£t≈!jÓ∫ep´¢ëøT†æ§§5˜N.
P))ŒORG“≠Ñ¨#ˇﬁ/ÄÌ+€≤åƒÀ€ø|?I∫©@'Ç≥§;C˙[‰2∫Û'Éπu<©ÑxÒÊΩ√€∞á⁄q.¥uÜ∏:ú§°¨Zˇê.WM¯z	ø™#˛Ö£M◊üÏ™ØA8Õ Ò˙xe{/áE“.Ûñ˜˚@•1œ◊r]E˚ÛcY©`
Xòp@3S	;ì Ã|†˘©d°÷Gl˙‰ìO÷÷ƒÍÍ™8ﬁ;˙fgÔ/>ëÅŸJQBÁ∑NåôŸ&}tóÆﬂUã≈D√bä˘ˆΩ-°˛Q∫OçJH6˚6üúùDgM™√F?—íS
≤¯i-ÕO1éÅ˘ıw∆ß®—Øm◊ÕCöünOçS∂®.¨6a4oﬂm◊ﬂæ„ü±ÃõM'ˇXß£+>d9ˆäÙ{÷'Rˇ%Ç™ˇ“uQ/ò.’∞·(⁄)n{˛Sımâuy´õ^£à≈ˆÉQñ§ô¨/,”ı‘>ëπ‡ ﬁ˘y‹[π‰\‘ÿÀ’PÍ)â/rÜﬂ√\æüƒŸΩE@¶¬öI:¨wa·j‚µÜñ°Øzq$°#›Ô"ixˆ#¨ﬁ–p°?!Ç˘‚|§÷¯Q¿Qì¯ØpX©œ“·Ò0ÂΩt\ˇæ)Íπ∫∞Ùçl˝Õ≠n⁄ë¶
+P—Y]r·lµZ›÷]¢§°Zo(≥Lõ‚≠=¯w¥F2◊ﬂõ|Mã>¡\z*1	v ÉNö®¬îè≠Ãïr¿„ÏÉ∫Ã 2°ˆv”NΩãˇ∑`›<4©ˆL”&¡Tt¢qß'∞d◊çYªaûˆ„VúeiVØÌ¡?"Çˇç'Q?˘Î⁄»6∫©–$j+ZÎ&ﬁº1«°Çt1ÌjDCç¯É"µ¶å¿≥Ó±ac%áìEí+”qËÔ›ç"ûœä}ıDü'Ä˛m¥ƒ!ü»Qó!99Í!∞©”ëlÎ‰`étAÅQ∞/‡F‘óeü·? à˙:j<Ü ÷^:1¡ –ALôæ£∆qŒ${hàm£ÇŒ~›˛Ö„∆rı"Ã_©xnlï+Yu"åˇËŸmA‚F ˛n…¯≠£Ù
VZ›Ä’fInÚ…(:yB÷Ä¨…êØZ£ïÙcñ®F⁄L„L%€uV≠87”â}KºÂ˙˛QÏ¢3ﬁá=PDC¿≤?h;-≤5∑ΩõVì Vh1˘[¡1ë√sw ﬂ®<!ï≠uﬂ™¿¨m™n]˛‹–hæ|r:à«Ω¡2JÆLÙv.p˙9º"íæL≈Û≈]Û—¥—íUvÍ^Î¿4√«≠ß◊æ!∆Ω,Ω2∏ƒBB˜}†“»DëoèM≥=∆=,óßù)µf] ÆŒßf—∞®€EV¡3¨<§äal˘ú¢ ëÈñ˛Q<—<∂Eu\≠ï¶Y∆‘≤%êc„•øR5-≥&
f\t•n-ÜÇgQ3€nI´ÿ ∫FßÛ¿bµˇÿÓ1ÃuK†’¶0I˚ö¡%≥‰·<º≈Cñjò…6LÆÒdGû	 29fÜÜD23,LH“S≈… A'ÉanÇ@ã®O¬1Úy,÷Ñ¨`w3\| ∞N2j/√b·¿µ˚∫äÌ#Èè˝\{c?nRæz˝“Th—Åô&^î`ŒÉEÂâ£ÊæH‚ï¬i˘±√±Gè˚1¡/i¨«p∫Q#J«¨ÇF[ÖºQ™∞ÈÑÎåY∆Ó“òﬂ√	ı”õ:e]Ÿ_¶`‚«4´zm4^}qTCqiêì¡d%û#ÄÌ&	f:€l¢œP	FkΩwáßˆ%ü	¶zªÒe‹≠®©˘Ì †(Ÿàm¢ìár∏ìEh
ö‡‹wòÅ«¥*·s˘ Én€ÌØå5Üßm∏ÎO$ìMﬂ(AE≠Q˜"f^:¡8ÃèTÒRÃêVÀöär@n©k
çèØ¢l®òiÒ5XÓ√Z>È á‚≈ûK+év&T!É•=∞åŒ ~ı+ﬂn´cÇ⁄•‚¨ØákaÅ•ΩÅ8ƒÎ€?›˛sZ´ˆ≈$âd—0∏Èß≠â£xú†pKêS)C
Z¿0VüFd,ZË,˜@%«ÈÆÃ&sÆ√<‰ïÂWx‡h⁄iy&·4}Ô»?AB∞©∞˛˘!d®b4CÀÂÛ0˜¯Tππ¿vTP:cΩÃ`ûVäú˙™ûÒJâﬂRoı∑2¨⁄Õú‰„!∞=˘·ﬂ<Ítæ8_◊Utä¨Í„ªª±ÓÂÌ˜O¿ıåD»&√ª∆tõpÓá$ê®üiµ|8Ã˝9·Tπ]Àù‹∫ã¬	7ñÑ¸ZFöÄTCË>‡aõäπs∂ƒ-õü´(∫¡'”d Ù* –]@Ô’≈@eÚÄÆä¸E §Õb¿aÉuÖè≠Ê˝◊ˇ˜ˇ63¡2 FÈF|`N≤Ì¢ÄP°¸•{ÔH¶µúÃ •õQâ3ÿçî	u3h´cVtCª¬“ZlÇæwÉüèBj~ôBók∏+‹V cÎdûK@U°xw€·°ïæRc≠úÍµz⁄œÁ‡†øB˘˛Ö[≤Íë¥-Õ≥¨?
é4X[é+›ÿ8Vâ_*`ÔYËY[ﬂ˛sØIxìmŒøVˆt~Úõô¬∑à»˚ïh5ß$mˇÃºnÍG—y$⁄Ÿ∏Q∫¿vÍπõT-ÃÚ‹}˙U<å≥§Û^√º¬•Ú
˙
ñG≈0/_.–’À,çJ∑_·⁄√Å)¡,_e∑?¢X√iOùÕ’‰è©˝Uûœn¥F…yò€›.√mÆ“g€ ŒáÈΩ^ë‚@ø§,ÕÑ¨ZcgÆZ†î[PµbÍÿºløæ˝oÌ#Aµÿ» w˚ﬂ@.=8Ø⁄Øﬂ¥_Œ(g√k≥=ˆÃŒ3|e®F‚¨bh°v‡≥π>ï·vãbs~Ω-“gÃUÎ .∏•îQv≠´@≈-SÿÓ\YÌÛºº>iá
⁄-T˜-Xˆ≠l†e—NaPW;ÿq˘Hœ*$ïCR»°Y¢ƒ≤ˇTjüE‡ëpÙ‹ËAQS≥¢
ãL√ﬂ.∫ÚÖÍ–[˚`˚~êSoucC–Qg#⁄|¯a∏Æ®„ˆqΩ˙»(∆æy<H‹‹Í4"≈ﬂÛ¥3…Ÿ+BÆ~%¡oÈ£Ô Yî\G+€/üßkÚŸ\Í .ØÈﬂÖ>ç˙cË≤ˇ]Ë≥	¨
¡J*c˛¡5ÒFﬁ´j`¬≤˘∑È”ÓﬁÒŒPﬁ€ˇzÄdJ”·@IæBÀ=‰”Éµè≥g+{øﬂ/⁄Ø_Ôâ˝WáG{««b„˜Øƒ˛ÀØoˇ˚Ò ¬n)‘ÔDﬂ¨©~”~yp$NN⁄/A∆¯ÿÔ¯√ëÉ‘ñ˛å5˛‚‘ôõ újÑ$•êZ	ïH™úé˝N£löÅ˘ÏÓâ=¯›mÜÔøÜ…°¢rÆ∫ñâ≈ÁÈ€6Ók∂¡%]¨N#}q˜Zça1fF-Fﬁ˜«Ø«X°ÉUjTrﬁt˚e4º˝Sî°ÃÖ«*È¢ïâ=i¡/õY`if;g±™¿ñg€”u^—}Âye[FA(∂Æ¬T{zÌø˛è˛3πz¡M)æbŸoò!fò]ãª	9ƒ“å?ñQXÕ§ êŸƒõ◊˚;bíc2◊qÑö‡a*ˆÚqä~dÅß;'q6HÜ≤qJ¨’ƒ˛0:‰" –Lüë#≈J˙Úp>î˝≠‡◊áªﬂ ¶}ã˘l©òπÙµHU∂Z‹qXÄ<I◊˙È≤ìÆBÀˆ`Sç‚Üïs%6)Ø7µàﬁ™TÁ>ú4Ò.¢Eó\€ ÑÚÂ-¿@ (é¶Dı›ñÚxπL—j.x+[bxâ.ŸºTûpÚ[jæÕÒﬂ#ÆXñπÓrÒ`4∆Dt–Ëaîç‡ŸV„€0)iïÆ5JÛ⁄’ø`]¿õd‹8ÀÈ¥	∑'√ç∑ìa·°u<N;ﬂë=VŒ\P√Ës(}0÷±Ò|\\%πå?ﬂ¬\O1^c:RÂ÷ñåR	òöB,%zœÙ#µv∫ÖX^æBTJ}Ù—Äï¸Ä>0rVË$ñ%Êê·bíEGi?5cæDÎ·+¥pÈ{”E\¯ûÜaΩ]7Àay Fód'@M
˝:~RÈñ'Õv|‚ÃÜ°∞*ˆÀoM≈ñ∫©håËËáîÉ(:^U)ÕVá‰ˇ¬)∫2u∆´Ω4˝._ãØ{∆å^∆´›xî"}‡Ùnaù·´À=¡óE}ﬁÇ√— √woÄÇßW`SØëëw˘0†g	)~ZòŒ@ADL5L$åÂaﬁ˜ÉÈ~T7Arë
L1à0lGÊﬁû‰§‰[’≈>”â∆√ﬁd {2%Ö=SºÕ	‚ h‹ìÓ_@ò‡Bkd˙ÒXuı%Q<ÊêÜ€PœñªÁ<‡ÔˇÍW‚Ém√+“; ‚Û‰„§ÎEÀj[S≠\2ÃÌ÷
?Ìµ∑ˇG{ı¢’nˇÀÍÌˇ˜n¥Vc	:y‡Lº¯/üﬂ˚Oo‘ò¶´üﬁ(ªr∑›(\¶ÔçÚ'÷î¢THËõ¨„Üó
teéaí Ò±˝QZˆä!A–Ÿ/K¢h^ƒKÊ˚4‘uD3Ñëú¯»Ú±˜≤°õÓÀí˛ûÊíÊÔ3∫Ï|⁄{]SmÁ’$?ıΩõë&¸)»¥˙ RùΩ/â<Ö=:Ô#i?Mà∂«EÓ	ï¡ÁxMÑˇ4÷îü…‚	°’Gß≈ Ã∑„ó◊‚"Ê#v◊ˇÑÒô‚††Ôzê|Ë4#FTtQ∞ß Übj|Yø«˝é=
K<Ót†òú˘é±>˜õÈFµr)âÄ¯¡âS%-íﬁ¶ «¥‹≥T-9˙ñJèÊ∫⁄ÒçV¸}]‚Y?Ë^Ó–®ÜÖ=jF∫x¬ˆÊ%ÂÅ«±Ç#b¿ö{òÄré5∏Ôq™ï`(≈B”¶5Îû;\ñ)πqÜW\.+À´˘ê;\ñ>}Ü˝æç˛Û4£4W≈!‘∑íoâOo‡”Á≠Åå•≠çù—&IáΩ∏ÉÓq”˜f®ÁHí˚,Á|…∏πca·ïg[0]’∫£UW?¥˝∆ñéj{ª˚'Ì#±≤˜JÜú∑w€«'G®"ÿ}¸Êj◊èvﬂú‘å˜‘ºjıª+‘QUÖïË85_ãA•‡Á—\Ku!yØ≠äpÑTL∞iAmuÖ¯µFøs˚ﬂw˜øÇ—√YÚËıÅ®ˇ›õ∆ä≠C€çìÎOû¡I±#%≤ãœ‚$ ›˛à≤\¿x “¿SóBÑ£©Ò¥0e∫xo≠Jè;Cø”>Ÿ˚Í‡høÌi·µ˛=®Œﬁºì:ªDÅÌ¡˚π%H≠ò√ÂäΩ3¡o4g	∞åò˘…+Ìr—Ûˆ±˛)Í/”a¥ˆ¿˛⁄a4ä˚ç2M≥”‘qü‡?X“ÁÊûÂs~Bƒô›XŸnõﬂ¢æﬂÔ›˛KæˆMúìÊIó*¶˘ ˆÆ˙˛0§&˜w·œÅøo^ÔÔ∂w˜~ôÿã“=aÓd∏   c¬≤Ë
›møíqM‘'√y±·ªãïÌﬂM™+8àD˝ªãyø¨løä±z‘KÄ—˙`Ó/7ıßøõD]™ﬂTlŒ˚5
≥+€(∏Œ˘A?ÅÆV∂_‚?¢>˜éç«	˝∏i˜‘/—¸K.Jù€˚ù	àŒq>˘$*ktæ=dq≤√£=¥—É<Å⁄—£∂®Ôº9>9ÏÚ§¸lÂË”ÀR'¬•¯ñ—¬-afp∏íŸ}≥˜z∑Ω»§ÃôxâI1E„&ıs”Ωì˝C)hÇàˆÀ$~¸|æ¢ŒR¡B£ª,%‘˝n+-˝ºT	$Ü,Aˆ+ıkŒ•≈ìóÏ\}ŒèÒ;µò%E«„ùø6nNπî^¬©jË‹ÔﬁÏ=˜qªƒ©¥¿htëeË[Ç‡∏|˚•ÚcT§H^ÑîÂ3`npŒ5îåM@YrZÀ◊#‡ƒhU.õCô5√ëßq3il`?'É“L˜9–ü<œÓTaÑ·0…˛∂îÃ ãßy•ä¯+€Q∂ÌÔ£‚äØÅVH¬cÊAí6¥RÇ%˜
ëèø}H‹}HKÜ≈˛0*áFŸûawnÊ†t^¢/s∞-y*Ê"`g¥_Œr⁄·&íedhÀÚ}/bt˘Ñ^›˛_Ø˜_àz˚Âﬁ—I{¶Cí∂Á,1Ø¬Äˇ—ÁÙ˛Ê4k*ñafâ˘8iR/v⁄/˜ˇ°MÄéNrÔzKf@X˙qí¡s”ü$3$-1EÀ85KÈ&…≤s$ﬁfbRr|õ5ÀV\<—ÁÁ≤ÁRÈo‚*˝µ(cûƒ€G_ΩÅ£30@ê,÷^µOˆéˆ—%q– «#Èg4LÖ9»3∞àïØêã~˘8Åÿ>¸Xƒç÷zhÌ
›2k«›OÓ9g÷€î¡0ƒOÆ≤hÚ¯õ‹Vû9Ò·∫/∞ºî3Õ—j9Ê[nåöA¡∑ Á«MÄˆVLl=¸Ì; ¿tUVL£*.ïœ∏
˚s[|:¯∆¸º€Z∆´≤ä≠Û•∏≈à(™v¸!¿ÍµÊ+~¥(#Ü]Õ'1≥¯>∂–ü˘±M~Q∆0pÉ 
˚Ñﬂ\UÁÑ∞¢4€¨_Ô Ï#K‰∆˚Z£Pq∑O≈ƒa{˜à¸æ€‚≈¡ã˝◊mCÉ§Sc.®	Õ≈e<@€zL
Tqö⁄ˆ¿¶Äæ|ÄîEùºßµÚy‘+‘∫ØT¥º¸ZB’hµ∏4çsF‚±4ga\m/ìËF»;˙TbO'E+ÊÌü"1∏˝ÀvgSy±í/öakxf c\›¸ºlsΩÖ€E Ê˛±3≥¸&ÔâôÕX⁄Ö¿~èp18√ˆYÿáÓÙ€ä≤7˚U˛Ïfs–‹.£¥ŒpñÊVd1éÜµ∏∂#ñ-XD}À<õf⁄æÌ’s/	C∏SÇv˘®é6–]Eç•sÓ‘Î‡˛CÇ”m5‹7«ËR3Ï¶∞∏Öß^˘8Ì>∫Ωﬂ˛Èˆƒ≤&Ö∫èØQ∫]wﬁ÷ö∞y†B,˜x„€\û·µâ.ÀŸ<y^ü–õ[¢=Ω¡OJ≤øv¢·´h]ƒ¶sËˆ¡É:~¸u]8Ω"FÀ÷~àªm Cî√ò)ê∑^Û™5¨ÙÆ(*ÀƒÆ¯ÀrÓ∂ú∫˝Ã∞ËË•˝π_ ﬂñC∑q<˛ËôdK›–è∫
˚˙”#ÊÔ/_u|˛Èfµﬂø¸é˚˛”«ˇ_›õ7@5ä¯ƒ§¶ì¿¬E±†ê˝ÕóuÛSn}µ_√o⁄ÒıBóeEyG¶c4äNÈª∆¸˝nJ”“E Èã¬/W>x—Ü_7|gwöjΩéÛ—µËÒ(U∑si';ÃZ§≤ß®;G˛“w•€ﬁ≈_ÊÆ¡ z¢ÆÙSâD¯ÑªF3$°§+∆O∫Ë ‡åÏO˚Fõ,d§w∏K¥~≠@O|≈∏@Î«È ∆ÔπxAc™z.›úıcå∏J(ı>÷WfåEE†º<ç
Ï∆Á∆):ËÌ!ºÑãÌÌª>[T¸Ñ˚˚Pô˚cÃPˆ8±¢[¡ëÈÂl_dªM˜i∞]GUáﬂŸ˛⁄võˆ≥`ãñfåÊV‹–Ô0iﬂ0ó˙π%‘‚‹s⁄œÌ€2i£˝Õ¸âvmá˝¯M˚˘*V	Bƒ0∆àM∂‘tZÍIA¿V;$˘Â5ï“JáTt|2‰©~äƒ,æîâ;çÈ:;Ωx!AûúÅ‹Ç˘:Qh*(téI‘5› £XüeÌ≈´ãòjÇõ≈ÉÙ2ﬁQW¿¢§s‰⁄~;àí√1ë>Ò WÏÜ≈/o(|H'`x¢í£∑ïŒ…(¶å·á¶`8ºü ª±Œπñ5ü!Ò›ÀAîÈ∆îﬁ®	¨Ä,÷j5NI6/ê∂Åºúuüö‰‚4#ä 4û˝ß c/ÍÙÍ<õ^·_øl—0º∑•√∑ˇÅ0C!Òä8
Çø∫My9≈oµ÷“ŸôÂÌ¬'~j~OùY#¢˛˜ô88˚Ä÷¬l⁄	»~∫∑")édâoqÌõlÕﬂ)Ê(‹òÌΩ¯8ë∏^q·åﬁ?k±WEƒ.˘GE¸KëÀ¶Æg†]›üòmoΩ6O∫y
¢W~Éπ1òK}0Ï≠Ó∆Rè:ù¶HhAØ[bY rö¥≈&cgë˝.Ì≤=~«⁄fïåø]78´õí<∏æ¯ õ‚w®ªË.U|@Ï•™˙çµ‰“⁄v`ìÍê
b
0ª+Ñ‚òÎµ»òÊßß∏ 5áJ©œQØ°FG¡Ó©¡X˜äqY∑Â¿L‰Õ-’‚ìO4f´;∞¿›sπ%Ê õ}§ıÀÜF1çºMq©πî∑vqîuz«m≠üπklj5éIÿt‹˝2¡Sl‹’¢:º¸
xÄÕc ≥	|¢0ôs?¯x ˜Ω·AÅ/·d®¬
y?+¢bT„¯OÎúTOà$$E¥dÕi´8c ∂‡‹@XôpÅ◊ôs¸¨OX$åBLM›jµpÙÔîåqï»¯æˆ,µ\Éäz©
◊eì.≠3vœä∫—*£≤©≥ÀÒFÂØ‰õF°—wŒÅ‡ ‹ÄGÏπÑtªíªc˛éÏ∞M’ãs”t‚_4ÈèÁm=≤ã6bL=C≥g<˛©i‘Å›g≠51≥”∞$$i“=äo€‚©M38Eóå9ÈÚ´≠-§ÛÀ¥xÍ%R+\
æK“åíÆàR90äâÆ+π©ó^Ì§√Û$‘ﬂÔ]√>I2±ÚÈç,¶+œ≈^ûGBÂ £BK¶n(l™Û8G-qà> ÃMN.îÄ_¢hnlÎ¡Œ∫˝XÙ¥ı‰¯@)úõTRå´≥G¿ñ∫ÄEæBÔb9Òñ8°‘f2PóÒò\CøàqÚÛ&∏Wzù	ôVj'ü¬9‚Ud˘*S!ìí∆¿Á¬ˆËçç2˝=Sﬁ√¢ÇƒÖ…ÁßÆŸπ Ãm[¥Á…t]hΩàLsø∂Ss∫¥R∞:©≠·ÁÈ˜Â≠ƒMoÕÀlÁïôåÉ	«i˘1˘AG,p{U5eÉ¸›∏€Ì1ïk	d≤_|wÖ
d‡Öê7l˘
*‚)8•˘·,¬.Z˝ôÁ˜áénÄ32%0*Æ<Ùπ)m˚WøOiìÓ$Yßo™•⁄F ªw85%Ë¢æ:öÙetd0oØì%_Û∂ @ø0y&eœ)/.Pµ£ #™ã 4¶ÔÀÍ6heŸ¨Ã˝*-Nâ¨œãî˙(+¨Æ˘‡#d&∆Ù'˚ﬂ–˚ØÂÔRdñı	x}Å∂2õ∞aû“Qˆû0x£ıôüÈ8T™YÛeƒ´"”'ﬁç2k_À:«ÃIƒ∂Gôj ˙ﬁ#û}€1@m?=åáù§o’ı-M	Œƒ]ogËí’Ãªv?57ï-Ï⁄»f»'Yî˜6+áÏÌùwÛg†Ò´áÕô~ƒÕ4bÖœïc‰^rãÃõVd±å"Û%ô7è»|ÈC~∆§!À§Ê¯•&±íxX)&ú¸˚]û¡£æà,;O⁄hæPﬁπÈ6ÍÕ…±Q¥ ÁUöXC∂^ÆMü]ÿ >YX˚TƒR¨›1±⁄›í™-êP-PKkFÚêü*Càs\yõ‰˚ÙN–¶˜˝‚∫“å~ûÙe‚Ê£¯ﬁ;¬îf-x.ü~}ÚÍ%=€Î«h∫2∫Jø[∏.ì¯äYÒΩ˚’÷¸Ñø~î^)Ô˜ÓïiÈLè\ñµ¢o˘ 7ÛÌ0æ €È•HóÒ€◊÷-[Ô*è¬§c¸sl`ç]uœˆpPgr‹%4"˜vY‚;Œ©ãπ¸:ﬁRÎ&]òˆp˚ãÁ©œe#∆Ö	ØÛÁ≠∑ÎÔä#˜ºÈÂ’c»UñHNvq69?ŸO1l¨eYÙ·=(àå|›ƒ‡ÂQîÂ±
˘ÃﬂœØÎ≤+ækï•Ê‰ö+dz:ùíÛÚˆ«>VXIèÚÖv©HË®'è~/j	π&*<"R¿Sû€”˘ˇà1‹–@/ÈF‰®x˚gÿ∆∑ˇkàéıù@#“≥,πàH?í∂jf‡¬ÇdA£C®N3¥®∞Ö∆u&“T˛éçÆ6::ã«∂&_DNÈffHãzÂíBjö>ië¢Ï˚IrôZÄp¬äµÆaÂızS#q|¥˘b
'qZåkà–]Ì™	L*Lf;r«j J
Œ¡^ΩYˆ{îêÏsôÂ©"P≈òï
≠ôÌ"û ¢Ì6yì¶I∏‡‰∏.ºÔää©^ŸÙ≈$ÔDÊ≠ÖLÍ®≤‡b]vJ:‘EÜïdR+B•íØ≈éz'£¸ê¢ÛÑe«ÑËS9J¯nΩN∆Vh◊ÈçØì|å«…|!∑$¨ÜD«Aj—Å.Â †ET’øäF∆F,ˇ›vÈ|ÇÉúÁÉ:≥k)ÖÃƒ—ÑU9¶•Çh8y1ıWC9(¯Ã6–8üÖÃ?z≥@ç$hˇ¬[M1*T±˙UÏ≠°aAoJK±ı*´ê™œèY¥è"k"©∑»ıﬁæ{‚Ωd0›'ãÇrOLA9tF∞æ¿í5]Ó%ëû”ñÚÒ)‡Zä E¿´˝¡∞™ø››”8!Õˇ]‹úÃ/$Ã“Fù ÁÁÁÜ≥¨’ÜÂu`¡≤5ö‰=U∆ù}A˙ÊD8ìær≤‘p∞/O≥ñËq/2‹ù√C“§{ ∫Î∫Í“adùÍò2õı”q¸DÜ ‡OŸAR}åU¡˚…ÀÄ&®_@ã0[Ì(&œr√pñ?J≤î^›0‚A6I÷œê'?‡RmÆØ[®Ü£Oh†œS>R0¡˚øyV¥·£"9BHë«|+ù#í&~Ãæu—hâ3"µÏ‡ÕmUa+-óFNË…T·Üøıd_÷KŒ»…õlo—9ÿHßg°[j(|ì˙˛”kØÊîöxÄJ‘˙ß∂°"_Î‹˛nø⁄¥Åá1›†>êôìó˛#@má”¿û¿Ñ{Pm;óµKCπCV? †ò5Õ•ﬁÒΩÇ+.Ö¡âol≠©U=€óK¬úØ¸∑Àƒ~ò
≠Õîñ®L†P‡™	Cfcö≤¬”÷Ü~zcu5’$€zç'XÀh†§5ldã}c¸õ6÷≠o”dXØ˝aXkLùFa¸Tn¯CêÁD,–WO∏/≠¬K≤rpçA÷€Ñ°…≥1· ]V=]—–ë>`]/¶1ß+œù{NÖâ˛¸^≤©ÑÛpfUD:”ÄlX:çŸÁŒ ÚëΩ’/äÒ}ã…‚œ?®À¬*Úé#Yú˜vÆx#⁄.ñèí°m– õ›öéX)JW|2gUÀœçÕZ>è∫ÙÔi:ÄWø¯Lt'YD±µÿQYÆWÀdç	\È7“6=Õ≥x|GfÉVqåÔy¢G:dËÃùYQO›ΩMœ2vMÉ°üXjìõ≠+π¥çÜÏqr—√·0s˜Ls,‡@ttG¡lO+ P≥πÈ≈˘±BÅ“õ Áì[ÎmZì-‰”Ûµ„0íØ®àÈ{“v§Z4∆qiAGûÒÌü≥$Z=ƒπâ˙ói'¶°5—b—o!õaIò˛M jéå)	EûfÒ˘≥Æò™‡Qº∑Ç.†Òh¸lÖîM¸Øe∫Î%›n<‰©\Ì\()AIú~m«î∏~Ë±J÷ÃﬁA{Øº`aq˙N&ïZ¶cÊ∂Àê.‰9VÏ|WÑ©WÆôMÿƒ’ÍH†cÊ‘ëÙ%Òû•ˆ3ÆWÀ9µP5Ñ∑¥«á»ˇfDÜŒ¢¸®Ìn¡´–€æ·RT·\ANto5∆É≤≥ ˆÑúñëãñJU22T-% œΩ÷öñ=5aÜTÀÄö0À©´|≤˝•õ‹Dö>"”ÜõÜ‡Ø´8¿ù›MØÜÓ8Q¡>"ÃGÕTÄnbŒ≥õ√˛$ü∫K}Sfì˚∑aç˚RäÈt˚5Í±°Ph3√µPºoâ\3Onz+∑˝W¯ÌNîu›L¯.~V"Q<Üæ“…xS?¢‰dàãX}yUÒõ™§{—à‹êg∆Èhu]d(≈¿øW´õè`´l>‚Do
¿_dò<uôˇ¶¡™‹9z=≠n|fa>˝D;{!n¨3!4<:îÏx’s7õ
óëJƒ*%9˘{)êçp±ºÉã‰Ò¡ºòN⁄π¿!Ya©üÅ∞˜($ìÂ–ïÌõPúJ©˜ÏO ⁄¸82EåÊUÊ 0X∫Ê˛å∏È¢ÿ=ØÍ√yÂ¸ìL4øe9ùZÒë‹HòÜπ¿–%°có ƒd‡<fœ:lZ’»K†`ã˛aCIh$(êñP÷gÑüQ7ZNÔv]≈–zöj ñ?_hÏZ6–ÅU~∆'jôíT%^íâí√£Z5’pi⁄†cßÑ«oqÒ'Cdz∞ÂP≈∫1m¡®[®ÈÚ‹[+⁄tw1[që˜`≥~(>Ë#˛‹X‹Ù∫¨ì`&WL
ÂÉ)ûy[€ap%€¸ëªÕÕÜ|ªﬁZﬂ|WQø•,µÏ®«2[K¯Ùj9l2\ΩÇç¸˘:9µ⁄SóIÉ§#£<ú¬7ÖˆETÍKcîRSät¢Âú$A◊dÑÒbF*“˛xq\ı™™/À÷|ëVKk‚ŒXeÏõ,>àWl¸%≤±¢›Í¡ú„Â¬x¯˚“µù£ÁaY∂∂ A˛Ì∫™Ò=WŸoîFÛn•	ÈŒ Âp∑x˜¿
ÄI9ﬁ∂†üÅh˜œ£≥€?S•Ì:Y¢Krç;G@®Æhen‘†(xY˛rß8É\µäfK§ê9⁄¶®ØäñïΩÆ@j”œ∂>è~«h	}p¯ª	Ñ?VÛ?_“∂ÙX"ó¢G·‚°óÌ÷•w=¨.œ∆ÈI¶[~pΩä˘69öo∫R≤j«g·˘`vF.Õ÷UTìÒg
‰·Ú¯
≤¯®â]ó≈õÖ /Y∑å‘Ú∏YÏ|P®Ñ·wÄ]¿]¸ÒPp<\{Ã¸ﬁ›¨RûdÍ @Ã"	„/˜XÜ*Ü¥^&V¶sEmπ
i7lKúeqÙ›ÍL7Gë≈Ûï+Du—È05BãÓ£*àÀÓÏÓX~Á<ÿâ öOpöGTq%L@}»ûãö≈ÉPò[ù]›N`ı™£ª$ºxúÔSŒ∫T∏ó◊‹T»{¡¯/˚œˇ∏t,˜66‡:«f4í<`úWÈ_òÉáÿïÌ£O’§ç¨Ùƒ>ˇRUÁ®_,Ã€Jºùä∞–∏ÊRJVÔ B˙Ÿ(?_8ŒÁó6Á<º¯0g.?cÄò;Å“˝∞Ö^»Â˙WvbU˜nAÑuı†´dåˇ¶Ô;´Wê˚ÏÉåxZ√sh“nÅÉ◊ÒUuòŸT¿√÷sÚ∂∂âWì’õ"+–j“mó˚ƒƒQÊ>œ_iï•ye–u—%∫_ì„æ9ˇ5º®T®íûÉ˙ª•ì´∑•Wü/˚ñÙT"`[™!À›~Z“tµ≈‡°êí∞ÄM≠±#∏ñêD_ç=vüœ;SL+œ®¥†?eäkØ(çtiÂ4Ê#N¸ŒI;Rt˜πK©ÑÏ7Ü˝¬&¨64Yª˚¨5∑ÅI3rπÙráœ{µr/–∫ˇÖ≈ë È2\—•^å]ñ∞á%"P˘Ójˇ!ÇÏ_ˇÒüÑtπ±Ëbß≥Vı¸ƒÅ¿ÎÛËá8ÛK≈ïL“hÂ≈ ∫^%ªä1“|ê àn“¡jﬁ…“~ˇ, ,-ùe/‘¨u0~éèub’rU?öR¯oﬂdÚ ªU"ôŸ∆ÄÛãÿ¨Wã’∏Ì<N∆ ’c:ú¯k[l,Ê≠jbU<¶Ω∞ËÒ§L~ÚO˘IXÿ¨à+´©Ej^¶Cô©øU€gN†°¿"Èî’‚õÓ±_fÀì1ÇÓ≤◊+ôâËL: H\µ|>?¿dd‘O/àÂ÷"q‡ègñ'ô	∏ùs¬ΩŒ≈?ƒY5ÿ ‘+As’‘%‹^Ö"Nü=ûMúA°@Ë(≤JÆœEé*çèïz"©“jF<•îÃv…öπï=+qTj7V≈¨V√TŸ?Z∫∂,Ë“øXÎ¥+åû§ ’Õ`¢÷AI¬©Æ˜°®GÂ‹ô•Ä*£¨A˙_*¥x∏^¬B
Tnj≤rÓP⁄À*Ù¬ÙC¸",	ŸÑ´∂§3Gp„xu$.z)°±‚ÙY]G¬Óà˚∑∫N˜Ã}-[;u§∏˘jMÑ˜Z†˚∞≠zãF∞√u¿çVîÕ>ÄâÅíê¶æÑ¸c1ìıÇå>U†@◊=˙¿º_Ëå;\1DGópSí∆£‘YpZ4≈≤ñ<ª±Rò ¯§“y2ÏJ?“§ï»§ÆN*ïÜEl—?|úò{®[å3òädˆ0!ø±∂&VWWeâÿùì˝É◊xâww≤Ì¡cäXüπ˝’ﬁ+ïåô¢;Tpp|î«]´§^$æL˙“û€Odh/ô_Å”GüH]“û¸ì{f≤4≈<PÍO™b.ud§WÏ„Ì0Ωí)(“++3ÑÑfm¡+*whU2n2ì_Fî∞@]’…ZaÕa‘“∫VgY)…;˝8 Ã˜∫YìÇôÁ·Ë&ÁÁ«T†C9_E„p‰kdŒÙ¯~ö’Î–!OêjÄ¬3£ä59÷8l‡	B˝oå˜∏&Ø[yÉı@¯Kˇ	^¬w‘√>dcÊñÌ•÷Wch¥FQ˜«]ﬂlä⁄:VcKÜBø•zºï+F&Ò‘Æ-£—J¢‘OX`ÊÌ9 ∂,®?f'[°¿*:¶æ2◊≥?^ºRLª€uã≈[’f À^ßù’Ö~W¶Çπ:â˚1¨º˘B_Wı*≈cà˛F^U‰{…LÕvüÁ∞û»qµ”¥L¨Øê≤Íﬂ2m™vèF«=Ÿ“ÄpÊOÚ\VˇÈ(§:ç	´ê"á{Q~Ÿ≤u°˚—ïôù⁄23´…lÖîÿ\¬ä∏ßÁ‘î¡¯…\gP|[ã.&Q÷Eéç„¡){ÿï’5jÔL	ÏpÍTQY!†º çB˙∫®L◊$0ó^˙mºÃ<0◊Ã£VlxtÅò°Gå…uEMÕlr¸u:…r§¶ÍÃ9∞|†x@`MZ (‘¿¿l·:ÕìÉa©2≥
s9r´rEQéªV„‡À°r4~ö⁄“Ê◊Ó&ÿÇQ‹%ÉØhìJ·§8ﬁM.,ò ¸ Ä®ùLyãÌíG~RôôÅ„6∂™ {fcì}ù   ˆ8õﬁ[cE"ÈMM/’€~‚æGzW“…“7Â¶¡ú•lÎõß˛FﬂlªX£»icÂ˝+ÕèÁ1?ûb&DÿV¡Ô…)jÜQ?Õ‚†uÏtdêH¡Z‹˛∆ÌEwÕßptL	_Y“ÒÆïc˘Ê~–K•&∏)‘°ﬁòD˙éüé0CÑ‰f:#ÅíYÇY™ñq~Pﬂ45ÂTÖÒ¡ôqïU^!B_Ú‡ú	»vÊúÛ≈âBö∑üb»&≈,ó»Ò˚U5[ÙæÛ¢˚ªôq@7ké5{/ﬂËê§S%woÈ€æ,¡¸/ÉéàÎÃ⁄èeπˇk˙sBlF7"ÇÒºÊfÎücÈ˘ª^	ÉÇ8√∏Ò{Ì2qNA∆-πÓR›Õ9†„Aª ≤ëˇ  ˇˇ ˙i.ÏxúÏΩ€rGñ ¯ÆØpb‘ÖÃjd‚F≤$  â”â&Hu˜r∏PdÜ#bfD*"°”¨˜v_z◊l¶∂ ‘fe˚P∂6f˝ÿ¯ì˛Ç˘Ñ=Á¯%‹=<.	U[i¢êø?~n~.Aˇ4Á<Ìú≤ù'Ï¥üÂA>ÀÿŒŒ[Êìì ÁqMxú'À›/>alòƒYŒr>ô&ŸWQå£É0ÅÿiÒÀiÛ"àÚ(ùÑ≥4»£$>…84fÏ¡ãg„q∑?	¶MªΩÚ0J†€“P˙cèÚ3ˆÑ≠±ßÏ0»œ˙i2ã√N˘…îá≥!ÔtÇ6Ëb˜˚k6Xak]∂ZŸpóm±µb0ì J“Él ”†Âh&¡eßﬂÔóu>ù‰áQ|Ãá–l'OÚ`|, ±@õxJ#˛Ó”Î„<Äu®Ì”qí§÷”0ì«k›nÑ«yêÊùç∂º∂‹ùO¢òÈó≠7˛
ﬂ(øê}˜≈'0∫Ëîu¿t'˝Ûà_tŸ5\c,Â˘,çYá~0∂FÁl8≤ÏE0·;KgΩœ≥”1ø§ˇıÜ…òE Ä¨7‘‚)˚~ñÂ—Èï˙9
¶ΩM Êe.Ø,=ëC”ªcûÊ{Q:sñE?ÚùÎÕçπŸΩwq¨n¨-±U„›iÈπl¬Nì8Ôíq»å7Æ±Ÿ¶92æÙ‰€dxÛØ,æ˘óóò·Ù£,√ü” ˛∆Ã≥,`7øOy–ﬂ^ù™>∑W‚a\Åpú!@ækCÆn5‡“¿Ÿ~≈OSûùÌ]òmq4Å}‹À¶∞‚4√i
W“´ﬁ£µ<z†]ZÂ⁄Qe”`»{WΩœòjZ>B˙˚cíL‡oÔÛGLÌaÍËIjÿX1	∑Ë{ö\ËYx~¡y,Aê!R‚sDc≤AíÜ<Ì‘±îÎkl:Ë=4qH/ä¸}∂QBåK}›ÄÔI∆¡ΩÅ%0$ÿΩCñßpV≥óG£3éFœ‚·P7ñÃÓa {„Zv«†Í!.î¿ı¿ıU˚ÂΩqÑ-g0SP"sj´g÷TÀ[‡Ì˙⁄ÙÚùûÌeÊÏÉb”“3æàBéd0Ô≠/=˘*,‰Ã`@Õ&Ç,‚.%Wó`∑åç›bÌ¸\wà“·9Äˆ?˛#õe<}⁄è≤›ËWó˝Ê7ö‰–€_ŒÚ<LB∂s}4ûesñƒ ü·˚ùÎÃåÁœ‡Ì0	ÉÒÀ)è;y:„›˘ì›0Æ)ª˘Ô'≤Ω*Z+F”ù€ª∫£Gi2¸bt÷[gŸd´¯π)p’ƒ∆ØÒ›Ω ÕV¶ΩG6?ZjZ«œqD5ñ´X–Õ5wÒñû(ƒaª£$¨¡›Ò∞‘Wıñòpåf0° …ÁÄâÕÖ÷≥˛ò Òö–ÚÊ'î.:g…˜º{Kh	¿s‚ﬁU0—,ΩSà0›_\QÃQHÚAp	PvÒC≈ê•ZÄ≈ﬁÑ◊|≤[PSÏ≤hD+€¥Aw∂Y-(¯ g.∂owCÉymö}9GQŸ“™éÕ#pËÔ˘’Œ5ﬁÔG·ºƒFK|fìFzp¿ÖW∆(ƒ1Ôm¨1íîyàÃoz	uÍB∆CbÿÎrÔ¢∑Vz|±–Å&7,Ì$N&|Ó Z5v>f1/∑¡úè9tÃÁL\ü$ytû é|˜Ôˇ‰a„‚¸;ıê`gar2Ö= ›ï◊^˚¥¸ºÌ∑√ﬁ‰≈Éq0Õx¯P e$ﬂp7óÎ¨"yT≤í †˘$îºôK ^%Ø<“(àsÿ
$˛É∏±dmê3Pﬁ√≤∫åÙh˚ò+˝%%§6™/îŸß¯h&ZëÆÒÄu≥;Øb∏æMºñ$‘≥w5+c_Î⁄;∫¸i”®˛Y¢ä3ÿiÎ¶ É;WéIoÀMÿóˆ˛ÉÏåáÆºÎJóÌ’ûMKÌy¡„≥ŸÑ…Õ√äôπ¥ﬂ^D‘d(Të¥[¥lå:«Á@≤Ø±≥¥Ø-Û™"à&m√≈é≥àîî`<v·∂°ª{2˜≥πRø"ı¡$ ´ı·ÇÆ˜1McÓê¨}nØ ùã,Ω‡UA„à‘sA· KQWWZí8=è÷•ç#g23ÒéÈü ﬁc≤√ç~ÅÔ„Óô4…8q˘u	∫ÄÚäﬁ@˙¥ö‰Q>Ü¶d?KO∂_ß@j6§∫˛Wx{up+Ôíã*Ωät4e®¶™YjõPÏ`ƒ’ä›i0Œ@≥SS)<©0+EO™÷KŸƒ1¯x–G{ﬂ~Og9>ﬁYz[ôßê},±`ñ'_%√Yúv<É·∆¸¢	¿bépf|•ÊÒB<—·}ÿP#û˜ÈÕ~ûºA“º§π0≥∑ÿˆ—`0ÂÀWj0Ø%!`ùdJswóåaº÷t¬ ˘ÏÔîLSz4Í¡Œy©[kÚáÇ–òΩMÅ◊Ú3 <›Y:∏‹bØx•∞Sé¢“
K“õ?BˆÌ˜Õ—â∆Í¡$ûq U£èˆ(„ld…X¶§éÿòÎ H£≥$ÇfõÇDΩ'{A<‰„*aËéhï§R
ΩSÜØ[gÛY?∑Wi
eã‡¸ãO>Y]eª˚åÒ<ò‚¯4öÚqËrvÃ”ÛËÊI∂¬‚Ä·8'Ï?˛Èø≤al6	ÿ9¨:}&„YLf" ,aÄÊ"4:|"Ãﬁ«Øwø>8y˘jˇ‡€aoóöú§|»eyÖ-¢≈	Ú∫O¯‰6ü'„syf·<=MìÛ`–u¯Œ‰w∏6|o§Ñ¨a†_»ìx,Â£_~@1˝|˜ÀÉÁ«à·Còˇ∂ÿE+r7=ÅŸ†©‹ôœ[>¢+¯ñö°3Ax∆Aw≈î+fåœ¬¥∞Ìª∞Äﬁ}¿pößÀ7∏˘âø™Î¿mzv
|vØ
†∫0U˝‰	;P`^Qÿ∑ö`a!!ÎÄ\≈gtlÑ#ﬁeqí¡iH¯y:ã£q9«*x˘Eíd5›4O∞N-Pc>ÚRSß’=‰“ »;LûÃ@UbàÕ4(Dl¨wRe2wqgÇˇ0ãp7`aíØ‚∂^åÄp¿'‹Ñg—÷ í)tpaà_0\bWh5M`Z„ŸÓ¸0Év%‡"TﬂB«Ωóœ_æ*£„5é@—¯/à¬ø#ıùÕ+1V∂∞¨enê"`-EKÀ…⁄§ÎÿfÒ,â èñŸ‹EGBt£im'rö◊Ì¶≈5ªÈ™˝atÅ∂>J<}»v'ÚbÂä˝dt1ù•”±BÚÜ›ÖºhuQlA£Y†ó¿=Õ v≥Ú¢=rcØÇÿ”,]∂•KU¿(6æ—ˆèìOÎÚÜ›æºXÜÖE.åÊú”æ}Gu`öæd@hƒ1‚{…8I_û‚˘+˝~Z¢ëπÀﬁ ﬁ°poﬁË;ªGP≤¡BÅ<·.~ãIq® 8@ã…}! 2ë±√É„√›„Ç	wvŸ%Á—n–4:JQÑè®ìóØˆv^º~	£{Ò˙’.|°éW|∑?S<Ó%≤t"§√Ñ,— ñÎBäã˜”d&RX22„0yBÁ!>˜:ç∆¸òÆ∞9Æ‡{~ıîª/ds[Ï8sÏ0˝¢‘ÚÎîû≤{è†j-—yÖ_#ÅnI2ÊA¸ÖìyÕ‹ÈDa©A6ßØ◊˙§˛¿›!H¢¸u0ÿ¬_Øí§∏ÇÛœè–4èêÀG”Öƒg– ÒÜyB\l¿÷ŒÓt*øv|at‰0P∏8p±1Òûf‘ˆò⁄+~∫"¨ßI:Y1+†AÌß¡hDTzÑæéì4cﬁß˜8KT–%WËR‰¥{Û´)re‰©»ØÖ¨2óœD6Ç *πgç,øs‰$≈‡∂ÿﬁÒqˇ5˛Dñ zçÚBPOtÕÒ≥y≈ât OwÆãÈœE_p	ˇÃŸ5ËÃƒo7S_æ∆DOŸ“è@ñÿ[JAx«U\Y^…»˙ BÀ–é:pM¸H∫p≈¡¨~GÉª˚Öú⁄∞8àb=Ì¢WgyödÀpc^®›ˆ‰Èiî&≥)Í∞ñ}¿9.W Ó∫2à˚ÜfÇÜBq/¬.ÏΩ]ÔØ}ˆN^˙±∑°Ôû∞u—Êf[⁄òÜÏä1∫f∏
√Yö%–këóÆáº4JÉp0|À∏4 ∏y⁄„!∂ÜÜ≥∆?¶äÂô€£5fÎahR≈Ó≠∆mîë≈Ø™û§÷◊â∂ « ÜŸÄÑ{∆mk≥Œ˙¬
É4,êÛd
+ò¢K¸∆ÀŒ‡ü\ˆFØeEU∆9ˆ#›ÄﬂAXi÷Æı÷¬ºçµ%£˘bÀY0Åﬁ "€{g|¯^Y£÷ ˛?∫Ùp1ÌQÆÒ…8mpÏ^;ÔˆT⁄ìÆÂû‘%‰˛À_„!jI∂5€cf∆ôlûŒ‚!˙8 #
µ'…“ìˇt≠∑~?"√;Ω«]€îifêcOG)G∑¨NßitN#+l˝a∑d
ˆŸü?sÃœÊâÅuÿ´fDß'»Ω"®Kåc[w)ﬁ˜.Tﬂ8\kàã3y˚N¯FHr£~CÏˆøZ—AeΩKì=ï	^à≥Ây≠óâl;ûÒpÌ+qŒgm;µe©âb4}¿du≤˝ˆwïßÎ%rb;bÅ‰ãghü^ı÷„ÌÈlÏ˘òùUÄ"£êªcÇS˛·F«3E SÆ≤oæŸöLñªˆ.¡˘∂⁄&öí?©í©Ç2ç˘iN≥%µ∫¡zπíêÎ¿Ö∫}Fˇ∑`!πAèüï ƒ¨W,y]OïdU~,<Z\[R∑ C…Z(»åHiîl›∞mˇN‚#1Ë}bm+&Ô√ˆúÅÄå»UÆ”uﬂU¢≈ÇoyL¶◊æÀvG…ÙéU’0£ƒøÉ[ŸOXr!ñÔ¨˜∏tÇÁ;Æ[/|&!õé—ÓûÛ“ „åÌ-Ì[…,ßÕâÿ!/ï7≥ÂãBöË£ΩÓLv‰l-CÒd(,{l 2%Sa≈)g8Wò‰úuöZgöﬂF·; ^¢{]w«“*Töv◊ºÎ—Ú`≥Nb°ÁI˝Vi Y[çÔYòπJü˚{–¬’}[)Üô°ÛΩ}wˇ∫!å.Û\Zœû¥T›«`ä‚…L=
‹´^ü‘:]îΩD˜b©∏·|ßBsc¢cπ.ÆæFk∑º¢Ä˜M≠Ìàçœ	Ñø-rJÄ;éTÍ*PﬂÙ™3á¨˙gA÷ô¢ö“¬ãXäWé[∏<Æw.π¨#˚\Î[p◊m&dmXy‚jÔaGπ+/¨“Â2¢ÁXCj®ßb:ô®Së%˚ï1>@S7âInLrq±ﬁ—≤V‹^ ®r¬>sOçù3ÂÎÚ0\-‡Ûî Ê9∫6˚˜ä/ï2âˆ_pπ˜|bÜœ=ÈÌÔ˙è™˝3MØ§í«í_y∞â2QŒƒÌ/Ò¥√aG i∆8qdä/>≤ÑUR*ÀXßÒ´‡ÿ0 {¬H®oO∞Ñÿ¯zêÆ©ßÖ°CO‚ÌZmÛù¬{µp®®Ô/˝!'ü≥ﬁ€ák¬7>∏ƒ_†¿;ÎkkÁgΩçµîO∫Ô*.ßh®æÍ·I?
W/¶…x<¿M^ÿ=ÜàôcD Íé[™çBòßﬂ:C¬∂≤ÙIì¢X§ùk?…BZ
à4iÜïG0·ÁQñc#ÄW«Ú¶•ò€M	˚`Ÿwµd=&âHÎ∂sIû’•yâµÔ\ªWÊ«≤DPÕívÆÀÃI“Ê)«ÃﬂéZ`ª%:P-©íôÌ˙Wo¬YjÖ^ÇèıF,9˙±ÌÁ¡O3+Úô´€Tÿ>åÎûSˇÁtƒ:L&–-p™YÜ∞q¬&xπÑ¯,—Yø‡gü™©„÷å\=B.h7:ÕäCú`U<Ïë?±ÂW…≈_~÷ÉÜ0
PÙôDd £2Ïƒ¸ÇÌ=ô∫}–—YÑ¶=’èìãN+ëÄÆ±ﬂ≤«˙ªË2ä±†≈8 6ÄiI≈X`Kµ¿∂1 øX*∑¡«f«Ø`nuÆ±äokß>≠N;¸Ox¡n"EAgAGv‹béu◊u«G∑Ê∏A±9I¥4´6ï7X AûCiÓˆ¢≥-+ﬂß-‹1Ö◊X¬=ë∞UB∞Õ
ˆVßß9rÕ∆pÂj	ã≥†]√•\€“é,hS∏gl%´¯∆F…*^WµÄQ¸é⁄ˆR∂0g˚Ùko8‚{u‹ëK|&k{áhä.vHµG≤‹ñ?Úñª´ºFtØâºn#-f ø÷S p.3z˝j˜xwˇÂ≤µ±,€yıŒRñsØ|˙∆Gh?˜òœ?»z~+¯œbˇn4[÷Ôá®(∂®Ì{<B€˜c¥}À‡†R¸«œa¸∂7M+”˜}Zæ-”Z…Ó]£ÃKP<r)`í£Èáïõëì
Ë óv∆j;Òï–Ïk[L›¸GYKb˙[m#'1êæøì~7Äı|€∞a?È Ÿ/Ñﬁ∑2-Ω˙\|7_¡Í∆ÛŸYr°<eEá«ÊÎ]·înºúe+HágÙÍÀ‚∑ı‚Úr˘-Ä„óW∆[Ùõ∑¶∫,µºe¶7˙ÚìNGCLª	Á] ∆…0ÁI
ÙE¯g¿;ÀÈ4MN®ﬂA>í@ﬁ\KÀÛ≤J]£{˝GÛ≤ 0 qqK_¢‹ﬁYÓG©=M∏‡ôgêié!á/w2√0J´'(∫≥&G=õS√g‹yŸÎÖ(æ≈|ã$)¶g};Á@
≠YdMÎ¥¬ùπ O5àû(–/6dioÖ˚∫‡ÒâV¨≈km•C¥ÿÌO:î≤»hÖLe}»øï?<Ú√,”ÑÊGﬁõÙçå#wÉ/8éjÑ—Ω[8£b]c21IæÏA&5_µÇ5ì,÷”“bkIì,/&ıUú¥ŒEœ¢>ÈîÖì∫Z¶•¸Xˇ¨ß´÷·ß~è~€|†8X|BÊ∏–Èö-EŸó≥Ò˚É0"¬äà42/’$ éÉsh^Ω!∞/÷71Äßæä¯XNÂK˝”zM Æ%⁄mëµdãQã+Ç˝oïÖ=ÙjVB[0%äF§;∏}¢Yòehﬂ∏55Ds5:S–ãõ™≠Â;L≠>$˜ï»›Ñ˜…öåß|Ù¥ÌÏêaá√X≈’ Èí|WÓJº%.â	ˇ÷’UfæñGÉFƒ‘Í(ùM¥˙ICÎ˜√£√ÑÅP7H‡1é~à'–∆´˚‚Rºæ&Ø–ﬂı¡Õ8w>î√ÖG°;yñ,ÑH≤‰®ı¡L>&,sVc≠÷Aºq-yãÅ{eœ≈!ÂÍﬂÈŸ#~ap±“-ˆ∞ë4Ä˚¶Ä40ˆ~FgÒ+NC√ØIêÜEK√H_√ˆ˙öÁ–¨ã<uPœÓÈ'2hÒïªKå%I)|¬ÇÏ*≤2óπ&«≤∆Õ≤Ÿ4¿§˛iö 	-12–ÙMÎ,ˇæGYgY cΩÅã,~1ˇ°≥,¢≈bH±è<ÑH˝Ë,ã4NÚ U66“-¥ãpΩ8Ö‘‹È–Ë„¸˚áÙ*πËèKIŸ†^bºßß8nsÊd:≤å!Ë1£/ÑÇÇº‘ë·Çd’0˝m∂˘(ÂŸ…êî«åfF 5–©ﬂ¢ê≥	F¿Mg–d14◊.»vÄñôCPœŸ0çºcsseï÷É£»æ'á(á™8#¥˙÷V\ﬁôË°ÇFœqïéQ˝/∞§ı±áÄ'Üù‰3 ˙!9Ÿù%ò(©èÃ˘%í}Â—Ñw)æç‚ ·*F∞HD´1ßÿÓ‚Å¢7¯◊>≥$ëEAhπf˝~∫‚2#=d8§ŸÅ`3ÌZÎó¶I⁄b7Ã¶!±=’ÀIVÍfﬁÌ„~àä∞âæfHΩ®´.Cé2væ{Å˘OìàNe7<L$\SÍ∑≈>Ω¶7˚L88‚ÛÔlÚFúŒÈc∑@?Œ0‹d¸£"	‡h+ÖeÕ ËLƒ	≥Açù MÃÂ@8ºŒ1€ê2–6Ç´ﬁÔ÷ ’ﬂE˘¬”(ù‹ø‰Ê≠à!π: ;ŸxÁªC{¢BT`6üVZ•e¢åÂπHﬂ∏Ù©mx–Éy7_z˙ù±fäA®ƒç‚fy‚⁄ä§+ÒÒJqJClLº8~"Æ€Gø8Q∂{∑‰≤)ì√Ê+-%/ìN€¬haù(OdNnL≥ÃèæÖ¥i€	Å‘¢…’∫on„·\±óñA,¿ Ÿ)É¯√1¶Ûÿò‹âOÄ˘iÉ¥ølû⁄√Ëxkw:¶à\‹vôl‡Ê7ˇØ»ª¯ÈµªP •°¢IV¯-¡O@©ni]©ºÄ•Ç„4∏B6Q
ËbF°∫ÛOk¿ÿUÌÙm“-TæEão≈Ñ˝≥,qﬁµH21<ÉEÍˇ:Å7:UœS´q\ûêªÓz>Í∆	ã»√ÌAö„âÿ2w%(ª±xG@deQæ áíR,9 Ù®e®nı¢å≈$ÆÿDåœëGîÒr ∫zôÜÉ˜ïL9ÈD2Ò‘‡‚ÌX¥Rh[° ≈√Ò‘È&™dõ©#ó´˜ò‡Ê˙óC⁄ÍË≈”ö}@h&%ƒ∂©}ﬂËœ"âµXﬁqwÊ˘âC~≈<îùòáK≤èπR?Z+˝È5bﬂSÂKÌ!•ÔúA^îî ~a¬’l6ÑïN|WI™MLsî;€¡lÀGI∆QÇ%åF&&`}Ì ´\)¶°M<Ÿ∆8‡¥9†[j˝ ù∂·J—≤≠÷àW»?è6.Ω¶'dçA[Ù$û‚;6ÅñXz∑i_bX⁄–EıLÃ≈Ûvì®Ô'„úí·£I`+˚¿påF˙ÆÚ·Ó≤df>ùÃP¢#q§çQ†”AH!Økßt,]¡wÃ$+≈ÜƒGÏê
®]yo´Ú≠Ó”á~¥Ã°‚©u˚„Hˆ@vz¨ ¶»Hç|f>/∑¢∆Ì˚J‘}óô∫M‘Ã^jªˆ)ß<}R˘ßÓF≥„¿Ü%ío—ëäõá‰4ÎX™Îòâ§áYß b=√ôKf{ws√â´“qÃ·‘ˆˆ€(ñRﬂCâJò∞+¡'∏¡çì±>‡˚§Éé!œìÂbÏmz•Îˆ°Mb†w˘'<-k"ÀN√≈vÌZR`ñ—ñÂ8íaæ0√s§æU€ÆPå9åÍDB
mNFÖÑBVOÃc$ÛÃ≠k3˝†‰áÚ``ªÍ©q¨}Q˝û~h›z®¢•û~Ja‹È©4Lé5Œä˙°A’C %÷Añ>ú{*z›b=¸k¢c’ò|xo»˜Ñµî≠«27âGqv‘ö√	÷˘À»&’≈‡ﬁ(U¯j∞¬Ωªuù ·Om¶¿≤Á‰∏ÁÚ ªdW‚ÖëÜH£t5(Ù`®‡≥Õ¢ÍÉ»I∫∫0ûEY~Ûß4REÅÈòÁNZ7Àdª¿±ÅMi0më¸’~ø&SÎ∆„Üßâœı[˜
c"≤O•Æà‰äp·o’,o∞≈ @¸ãÃKQ[∫q
[4rÑi‹Â5—éÛÃ6ÎZ'∏E+œÂo9¯ÖVûﬁë*xÓãçew‚C~CÁ‚ª[N¿®Œî;ÁRNEÕŒ˚n}Pù¯TÖíO›g‰Ùh8÷M¬F7I;|Àqæíh≥VÌvm}Œıô;P„saıÆO©‹'©}ÃÁŒ&é◊FÜb_◊>xñ3≥√gFòa8%)*eP8ã¬PRj •∞Ùú0lÓ¶(ZÆH9À‹pK_„6âƒìBÙ3í›öR∫ÂÉπYÌÉi˘/ïì∂≥Ììßñ')]Â!‘x”«Qm√Å´îµ‹ÇïöıÀYÜ÷MÃAy	±Ì1-k˘e[˜aΩGƒ1º6MUùß≤_£1º-€µ˙Vè•9∏™=„I·¨éêAn^,m…Ösı2—´Œ2U.⁄ãZ´{ÙµA[Jb.=A‹ú™ù@ø¡ìC`&Bıß>(µ*ïè∆fπÃ+¯€-'Q†´^6UÊA¶üZßRóéz“›≠¥‘2†¢˙ıΩîgƒìLA|âè5@à“§KMÔÛ°Û™Ò¯´xÆ…™¢Ï˘$>-ÑÉç»W¯Ûp1d´Ü€6Hü…≈õÈﬂ~‡wEﬁ7â=m…'0IK≈3•¥Ó-…]çeóM˘¯Y[Ñ≥|};é’•zyΩrOcÖ 
C('é+πì7
2÷PÀÚ&6rÉ;î£∞Œ.Å‡Ù‡ÃæÑ&nˇÀˇÒ˝3;L–aSÎ[¥|/á≥1á/PöÕ$kµòfÄ⁄”rÜOiWPZ†vìåÕQ™|iüBVâX*)πŒâ_
tp£]á~ìQË8DCEu≥ö/$;ß÷eC7O’Á>o‡iÓÑ‚YµÍîñR¸®˜‰§Ê∏≈Õ∞$>`¬"{¥j+µ–| U©Ó=êÙãÏ€é ÜGd•›Qk),‡,
˙ïﬁifoZJ˙ôÏíKgË§òœ„f† Ÿ\¨p!-A€∑
›™xPß∏ö•rj'oª≤⁄~™$“s	}ô£Åge0∞}ûsr£.ÑÂ;≤|èV`n!ädÚ«º8˛S◊·´µ©*0nÿ¢-´¯˘YëÛ.ìM»µ2O‘ìJ¨‰À˙UŒ¢UZB≤o»6 ∏*o‘<!¥:ìá>˘±Œ6:mŒu∫¥™Íê±‹U9G≠üóg6˛<œU¥xçoHvÍ€õπÈ˘›Òÿ}Ö†›˜\Â‰[s´⁄ fb6óqpÂ‡N…¿˛‘ìEe@qˆÂB©_ !Œ‚©∂=`Ô ·≤ﬁ∏ÂRkŒŒó1≠J*:;®∂îŒ¢sYëEv§[ú•~O^óÈøt#ú≈yq¿qg€F∫e|QÍ÷©åm~jÃüÙ?eËºt™˜4§Ö!‘àØfö>¶hj|∑µà∂¥á27˙«\òF€hMv˜~¥VRs[ôNΩ∂SøÒîU§Ì*'Í¢êp3CóõñÀ»Ωµ“JEhÚFï	YO€
ÊGø¶≠ÂÊÙ2?ï∆[÷u˜Õ‹ÜWŸ8ÁœÓ˜¡€ŸR∑._`Âv∂¶á’tÓo¿ıYÔH∂∑DI†≠:‡∞œ úùR∂è∑s≠$ägÖ|8Á ◊Bıª7ÿxd	ìî{ßÃõÓyÅ+≠—|Ó ŸZÉÄ±PÊµ∆ƒkéÙV>))cÒ=Ç∑.sõa zhL6 Êt∂:õõÏÕ ÈˆpÕÔÈE	Õk
øU
|2∏ï¿Á8,îó®q-¨U©ﬂ~’àÎ`mòˆAiõ´´ (’\ô˘⁄Xv∆≠Ái>ÍØÁÈqY÷ı<û∑ägçvR™„…ºﬁ/∂ªH:Odh	öõL·˛Ç©ä*¡!atFèJÕ©Úø5—"€´‚›'é¡vã¸]ÍQƒ_Œﬁ˚,	èf6T)sc"9Ω£KxÉ«Ω/ãÈ√6YL◊◊ñ‹zjÿ‰–∆ì«9'Ú◊Í‘ùeÈF	cê\.1˙Ü†fÜsÔqÆ{’Ô˜Ìêy'À∫ÔDP¿ï>ñ¢Ä+ÀƒÆ*πCúæ◊Gÿ3kˇ°BùÇV†˝Ôú™Ë \nGg•≥í	Z=ÔΩ:@˚˘ÆúàÔP^‰È|—∂„|˛T¥„ë}È∞^Ówôe0ùsÙ?wïÛ„´§∞ævõtRó*ìîEŸÓ»ßB|™p∞m’sµÔ≥ÄÇÒÒËIr ^è ıV˘%€pn\øsÍ[
@˙s#æˆoA{ùpVgOZâ˛~Eî˜°6ıyÙù–_ôj»oÖœö¯àue®gè	+àÑáT{BAÔéB/Ä'}˛P™ÏG–jÊª÷BAiUXù±Öj´˚‘ÄÜ⁄ÍFÊùPÏP”¬Õ¨4wÃxwm-µÄN(««áËrâé'EÃyCÄ˘w•E¨ J˘– 5
‡5rxr¬˜z=v|˙ı≥_„;µ‚1œ±^@VùXqs≥§m“+~AOn±›ÈÙæRït1∞≤†Î¨⁄v"√Ø±‰Ô≤˚Úvúåí7ÈXf\§Ô÷;ˆËûˆÂÛ2zÎª°Á€°õ¢_ã§í√&ˆÉÙΩn,“@F(Öoäƒc˙ßùänåôˆ†ÉÂ™ÊÙåû!Õ≈OÕ,Ús˚õ◊áœÈﬁ¡òcﬁo8áÖ¯D&ƒ ≤Ñg›¥±⁄Ò≥#ˆ◊∏	AÎ©Ë<È¢CßÆ:0Àf@K0÷îÚÕ·$äŸ4Aäã>ó@3á99FX(ÉùÄÑïx£.YPÉ’◊˘:≈y<cH( ©–Ø2FS¯÷IÄòS˝vv¥ˇÌ
Uqr œá] º"FÜCüa8’r5‹Vu'øB=Œ√ÉoNûΩ>8<>Ÿ?¯j˜ÕÛ◊›I;SÜgÑAvF°åç}}MÖe»ááÈƒxÏ´YçŸﬁ´C˜1ô* 3û=ƒL2#Ã>Ì<ãâÎçì˝oŸ◊ÈÕÔ•Œ√‹|\ÅßÙ®H“íùà‹ÊÚ“≈q”êŒ÷dºVäÖrﬂJìAÚcü%'ipjv¯z©¥
Â)M"BSkNxÕ˜t&I£9Æ©’;c?√ûòëÌRdÑ=‘?-ÃT•¿D©¥Û(ã(¡î¨6¡Êà∂e$˘¥HˇL∞¯sÒ∫Ã…eÂ#,∆c$Œ<t..N∞Ìi;+2˙≥{Q\(≤åß˝(€≈çÊ‰Z±SwPFü—dl\¡"œŒÙD‹\ôúÜÇúP>èeƒê^êÊ¯Œ$∏cÚcmÛ3R:*±Z◊tF¿±âîFÛ(lãT$0^¸KèòOtÒ˜¢q0Ÿ5ºÄ,}§ò—I⁄%É1Ÿ&Qe√\Dî*√2ÿìÄuà09 "¬Ç(¶RgÉ"“uL6Q®õ?l*QÈ¯úŒ›b0C3j~·4ÖŸ±jQπFä.Ñã	Ö}3?†z0#'Ô›…TÁCÑt'd‚üPsm˜C—≠Ö˚å∑]AÌBçÊù~AS2œ‡
{k!©'9äêE˚ﬁ§IûÕRN‘ò÷Ã›≥iÜ˘Gä®}Ö¯[&ﬁ+oc≈∑òA∞‰mëì˛m°Ãı˛Ï¯•¨˚.ì!ŒW(Áæbo.H´⁄rf÷©“î?(mNõÏ8ff)ìÈôW`Z¶ %ˇpÿR”õﬂè¢8–¨ÂåΩølßl€Ö•¿T;—è»	# ƒV§kCn⁄yÕS¿ËêíÆ∞o`'ª0O`Ø0ytÿ˜2RΩÑŸ@»bS‰±¯Âp<Ÿ…2…Sá¢¿Ürf¡°ÆˆG„(–IG·	 O„*åÔ‰ıÓóï≤	ÂF2∏ù=ó=û©âo|SÑ˛•¿*%∂ å∑$\ÿ™HÙÓ0dNaì+…†Ùl¢Aj	@ÂUèúCwù‘'Èpµ&ÊÒ⁄Õ√jπ»#y$àix^l,u!≤“ªWñ'‹eøç4açÕ(é ◊ó)¨F±¬∫˛KH0Îì{ñ.ú.*$Á©B pnTH>ÓÔv¸ÀI %¸º˛_⁄H˜#X›‘K÷£?ª0‡ ¿+”ü˚ñl ¸ú¢1r…≤µdd∑nGÖƒ2O∞f#ö1ÇÑ2~e¬¢·Ø# o"8-\˘^DÂ·™É·"l£Vêu
…rwÖ]úÒîwñ£Ï?Oﬁs¢_;;z´≈YúÕò_)>éÉ)Ä.Ô¸∞¬:¸∞HôJ¿-z¡Ò√˝0
ª4§]
;-Ï#	PÕUµﬁrîkçM(ºèZE£Ê…C√íêm(E(&6Ñøõk?Ã[hÄué¬Â(∆Ï∏∞:g†mACˆP∑ËƒJ_™œÄΩzyÙÍŸ.ıPzZÄÏÑ∏≥d|FT≈0~a5ha˜›/¨VhÎ»"í“í¢LÕà+hö∂°ˇ¶\T€dô4@◊Kÿ“9JW„/¶∫§—µ@Ù	ﬁ@|≤!¶
úfEÛÆà*.L˚·i*MIŸltƒ⁄ç–™ë⁄(ÎèÉ,?Ê<ﬁÕ©öY£ÿNÖ¥ç#3a*0#¬MUe‰M≤¯ÔôôòÏÁœÛ∫ÔíÕ∞#F£r…˘Rx”.Ë¥f ˚b¢ÅÏ£` Íœ|•™2Ÿ.[XKBká$0ux vŸ∑Ê å–≥çß DŒòXò∂ ê+'ìmû^ÈM,∫t~?vB¸gQè¶'–E"Øiàì~»â˘…êzÀz^™ìz2nò}%-™H9ë∏ÀáŒ¯êäè©îôE@ÿgG<…à‘ˆMîµôM:ãïYSa+·˛◊G«bk¡¡òÄ†ñn¿¨Fà.©höí…Db#‡¶ê“*êJ®Vo˛Ä≥ã“–b"#û°2%q›5Gd˘¡î˚RµÑ≈Ak9íî3L©®%F.®0Hojj°_ ΩŸùN˚yvâÜÍzWg0~Úy£Ê•¥ùr @YNÁC ‡Eg®X›‘wgA^`ølE5—˜´z/^ÍﬁæéeÀ≤/ÃÃV#ÃË«˜y!éÉ¸p$«c@	UFwväZ˘∏ G&h]2SÚG%Pi›Vÿ˙£Ç(ª«/≈®„° ÙJ≥mÀSTÈXxÓtBß\'3<€£ﬂx÷Ö?”∏BØœÙ§öe˜Ç62…Í7¸À|A√y^ÊFê4U•êÌ≈)‘°B;Ä®>∞@Ö]UßB∑~wu*<L!˜U4Ê¬À£@æ%O≈Jˇ[>F\QnîªÃ:Ï,!!,ÿæˆˆ¿ﬂŸ”˛€µwFñOºhs:ºåWE"Ñ'Ï≥5!ól<ÙÌ€Â]M`N0?ˆ0¶ãÆSXD˝Ê˜ó â·ÎÛeüŒæ—Å∂Û(aËÑ≤&™äÂ⁄˘'ÕÃí÷ëoGÇ¿CÈdJ¿…7ÈXëOΩ«êÄ•xÇ≈; Õd…)ß¸{ÿZ÷-Ñ¿ œXÖ∂éãˆä.{á…G !Âñ8"Ô»ª‰R+tÈ}°ΩÓ»·î¿?ªŸ>ŒÏ’sZüBÔvD◊!fCSN*‡Å∞Â)sh%±…»©˙0≈∫QµfÏ≠Úª-µt≈≠ˆ⁄t[}⁄RóÛ3ÃÖC?Ãª»uÀÑ™™1π$ënï∏üù08Å=F=wñêÅå"Û›„rl-Sv˛ÇË[Æ&Q>Ω™∑íó˜…§“ü0´àv@ÀÑÔ¿W‚ª%·àkÂ:ü ôG‹∑™ƒâKÂú⁄î/±‡pÙÏÔYÁX¢4≈√4â…ÍÄÚh¯Së∞ø(—Úv]˛ï;èËkM©OÒÏÎ´)7û«ü∂;…pzJÙuOø•ˇ@k”∑&u
ªñ~c†∏ãçNè_ÚòüF√(Hı(çKı£›ãr˝~∑ü>∆C¿åJ=Ò{›|ØÈC⁄ñ£K”¢]÷÷–€}˛¸‰h˜^º>9<x˝ÕÀ˝c˜êa:P¿/«ËÇ‘éYªLu…= ™$'√ƒ¬‹|an‡ñ ≠b/Ω˘âÓ˙ﬂ˘†Ú’˝õüû7…U˘îßTÎ∏G^ø˘W∫·º5H0ë´Ò¯ó‚B…eÊÇ⁄ñ9$ºvÛ{ºX>ı‡1˘ÈW»4y~ñ»Üæ;•Ñ∂¨\˙e:@{ÁAóÚ0é=7Í1ä1úÛ+.K˝ÓYó‹#,©5&S÷•öM<˝Çùr:„ê§?qMÁ¥çÇ(†€ê—ã≠o √Ëú¨∞®´ÃnV”˚k∂æbµºÜvÚOdX∑?ÅGéU>Hìÿ/_∑ ±VÜßÑcÎíÜör¢ü—jÑg´¬Ë«/£»b˘
ƒ≤AÇáßÍPxQ2«SVÄ4±$é∞_t…ùQ%xê·˛ˆ4rÉ»J7ßø;Ú,òN≈jŸ◊jàå|˚Ç4˙â˘∫æÿ¸˛W¡êí‰Ω˘∫∫÷¸ˆ“pÛU∫–¸ﬁ1Ä∆|∑ËMC⁄ËP^k$«Úyƒï*l¯Et“ﬂﬁNÔTßzÊ—õÊ≈Ú /∫<yœØóTÁ1dŸ÷£'Ë®Oœ;lÿ|—‡∫‚ÂAq·$ñ\˜Xu›3d»¢!K•álélu|∏Ú ~˘ZıRÛéÁ¨S2Ñì©xÚd"-Œ<+0”?<≠}ÙÉ‡≈Z{/ﬁ=¡ö.'@fçQªw*éjÍÆû§[|`EÚ≥ñò¯¯{RY;ß“XE:ø’√€”æ…*p7ûˆ>añcïÎis¥Œù1${XÙ¿;ˆÙ©`T∆ Ê&ry8SÁ¡H,-†Ü»…T<“E<]≥—‘!˝rU≈≈ìyﬂ€{yx¥˚‚Nˆ^æxΩª˜∫ØÓyõ”¨¿n/Ró}Íõﬁw∞<ïW}Ì©{ﬁÊàcÿmëf‡kànx[Ab7B‹◊”^˜Drg,Ú™w8Ú^a=
,ÓP…+Sgìz⁄oàwÄ∞˛YßßÃ|ø:#`M±Zëg¡¢ÚíÚ◊˙ˆ3´NùÆãÖ]†ÔtÕtô–ÈeDÂ€®û<Ä≈¸ﬁï
†æVïµ.Ω*äï¬kG‹Á—•S◊2`@ãEI∞i0í≤ÎYÄn{yÌ,Üîøë≤·g0uU0Ÿ-Ê◊Ï~1;ÿmÃV¥Zôµ\∑±bµ1_9´j:√Ãê≥0m.èπ‚Q#Ì≠ÁÒRm»S¸eKÑÛ÷YÀ˘‘Ïé 6üvk∂ü›uΩØî‡/çÓÆtµ≈u_?È:∂òOΩ˛(vÖsîYø5Ú‡RÏå°08UÔãFß≠;˘t£n„îtú6z—Â/épR‹b“Ïﬁ Q›%∞~¬’È)”h[å‘<∫KfY´TËƒãh{˝ı!™^·óqÙÏÔoÉ™:ˆ∆jËÓ1≠Íjï‚4i ô‚¡_Å]ÌiK]—6∑“£Z˜—œ∂“√J±—œjkZÈQR]Ùs¬nVzu˝Ÿ» ÌHù£hJ≈~±˝aI"à π»‚“"-™ô≥Ï?ﬂ¸s'‡!wÄ∏Ë0yÛßKÚ©L…ºö1,—QÜsÀ}UåÈófró¯7ﬂÍ*£Pˆ√ Fó k»DYÿ5—%0√$xd”|£~Y&~_:[ù+öÃ0B)ƒ˚2¶‚ÿΩñÉ¬'µØÒÌUõΩ'ÚAw†˘µ˚¿<^—fâMâCï‚∑oàe/ª)bv›í¯YcıÔÍÉ‚w„[GAñ]$ihº®.5æ˚
–x⁄°◊MGù#<	ÀÂ±gé;[˝—e@ﬂ02äáI*|Sxçb.~$”¨Óà¯‚ °CS›TytØÉAfåVùkΩÛ¿%<wêWhcó<ƒÕ6‰ï⁄)#
øF≥µ“=´›“›'ùÎyq˙C•SÂæ£<ÑŒñã2Ò›ƒD#+"˜àsµ˛êh2ˆ†—˘EÒªª‰[Bø0.4øg°Ù˚ZÛ€©_øI¨˛§6¡6’∆_I◊åÖN`j¢´
èôUÂeä
¶‚ﬁ´‰Bôìã ØaÀ?G@T*≠âÚœ ¬|¥[2Yƒ+ß¶"´Dú∞Ø¢îßïı_ô≈;èŒ)“õõˆ¬1GG7Ò±ùPÂ-.∂
¬¬«k4·)yÊiÔPÕß( Íé"4¨ñ%öcMà.{‚HZƒìXcπM8âÑBqV@ìÔkmå§«Ê\?Ë<Q-∞É»îˆ©≥åYs¨/ÜïÍﬂyf/(Æó}ﬂàN˝3,Ï”÷Ã6V´ŸÙ0LÂŒå‘F >m“o¨¶ãéµ⁄¬´÷j˙VT¨*Ìøµ§¨ï[∫ c 9aà»?]´*«ë´G†ª:˙x≈ôLExèR|¶»=CWEq[»˝HïÕÜ3Ú¿'–W…ÚÖ|ÓÍ•÷˝AûOÏ0v¶Èêc‚/œŒL6fIëùôy⁄bÀäpœ<u*…Ép*øZgœñ •GÜúâ#u[HìôåX2Ç…50Ë…Öê‘@≈ e3cS˛ç¨ëÑ)<¯b˜%£cä»˝√¯µˇ¯ßˇ™Zœn˛$¬…æÏÊ'…2:…mÕµ∏ãm«Ó#"˝s>0“9O#àH7€˚ˆ,qx0Ks∞0K∏"#ñóÇ(ÅH‚Ç\ÒßÏ≠ïùHf2≥…ÏAfj OÓ;•èïtß»©ÛNˆ∫uÔΩæÎñ∞FàÀ§‰"¥:Çï‡¿»Z`&#∞ìX©¨TE&ÄwÓ`§‹]F^†¡H ÅÃSÅ≠IŒÖ_B|√D™
H…ÀBﬁS¿‚›!{ØÌ1∫≠£´’{á@2üÛ ¥û√J›{TﬂáßË®-ü≈Àª9¨≈YˇÂUr$íΩ;£D†Ui∫%—&>qØ·‹Gx™Ã∆πÔ¬ag◊ú4êúm¥_IÈuπöÃì¶x#'ãÌ‘C!ïèóùL?ª¶hàx≈3K<‘W2!]≠0ªkã{0&ÃºÜ™n‹ì÷/S'7ÓÇ ’±o:÷QtUΩßo‚Òhmf∏*Í9RVå{QRèê[~DÓF›°TwÀ ù¢T:≠Ò`#Û4ŸßÙ∞ñÌMì»ﬁ¸ŸS·˜„l6aoﬁ<€G“Úé‚&ﬂf€¸s;ôç¡ZÍ(_˝ÖVc¥ô…(f G<)¬á¿Ìj(ö1∞ÿÏ#aºáM√DfÜ\FOèK‘%—¯KH?—BÏ'ë˜:û£c e	W°á<ö&l	q≥∑˛¯s˘YÍ"[–◊3Åﬁå¡é0g¥é”âe§"Ü^?2a\∆7,@ıÑ∫ç9bhHö	Ù^ƒ¥<§å°13ƒ¢¥Xy 8ò&\L\ëΩô·∂e´ˇ€€µﬁÁAÔÙ›ıgÛû˛˛∞≈˜ıç˘ß´Q`ï;‰@â¨6—‡ÜA:xÌIùzI!r¶Ä_Òp6¶E¿eJ˘(¬ËıäµKÇABz9œñÃ:úç*ù≈§V5#bÃªÑ> NNÒ•–ç—r1Ç≥áå¢gEb≤	_Õ8æi1$K52íâ∂;Ä=êmBÌbΩc‚¬luäP¸DùÆ@Gäµ-Fß÷ô≥¿4ƒ÷ã±¶v2EKî.÷ıd£J±`Æñ}O˙ûIä÷Ç&Ëº6àÿé{‰pd∂fﬂfUÁ+∆™“˘
nöé˝&#∞W—u¸TPoZ®6§õ∆áâ:ÖNÍﬁZ‰4C|Ê¬ÄCÜ*_œïh.~Le{À|yèË”ä8ˆ∞Ó§æ#,F^àªE±8‡*Éºö(Ü¨ol>|Ùxy≈Ñ!Ä¿m[Z ◊ObÒqÍ ’Á>ˆ’/ËŸ»^Ç(k	
V¯âC%ß¡ïÙ±˛UàQvB"òyﬂTt<"ƒIﬁ,èú`¶úºïDr4ä$BÿEo%ç™áÀˆt„5cÈ§µí&DmÂE=RQÀÕ<∑â°‡ú>óÂ∆£d√<&©úD0ÉTî©±ºµßü^ZrõÅ—Óó+ùÀ pπ˘b˚ƒ˛k˙í†¬eëπ*(R »Wò=(‹CäÓx€sYââh&™9ä≠~…ıÌ3wòõ–a•A©BQ3éo∞ìÊ¡å◊Û‡48«Ñ rÒ$Qñç«Én%&◊9`ñù'¢Lâ3b#2„†∆Ÿñ_X/íà/øúíÅháΩU4™8∫ygø
mò;N◊’–àcò>P™RB>∆ WHBõeÄΩWá+(›, ®¡Î∫—-wºÖ3Æ1·Æ5à˚∞ÈîåG˜d>Ú^Ÿev¥YÊn3ÌM3weú°@L˘ÕPS< I»¥TA»¨©ƒÚ¨h∑BAYûp.„ËÉ⁄»ä ^Y¸«Ñ≠S4éô~Dﬁ¯qø D
Åjü÷úF/ÁFôÄÙGóÖZûımÊ⁄’ˆZôåtTl^®X†ß™‹>î$"È£…è%A5ùûECl°%O{2óIàåÊa§!Ë’òÌÊR I©0%FgÅêıv,ïEhì8î3Aﬁ≠h›(Vª"µsÙN2µs@ﬁR®ˆ	‘azqAz!ZãÕãK
0∫_![õ “∑§hm2∫>‡¡Ñ$∑Á }¶{tfxojπ∫∫˙q!Zõæ µd]‚pÆhçèRñ5Wë¥%nÉõï)Ó{7«ó;◊"ºM˜ã}|ùµ⁄‰ëE+®ŸXÜ™ê+Ê€O8˙P≥c`I2ñ…+? Û˛ÓÊû◊Ç®¶ $ÏΩ˝Ù⁄¿Œ˘; Eàâ√ƒ:]¸/Òâzeı+Ñ¥ÛˇÇ,˜ºæÓ√À9∂∞◊0≠•¥¯èh¥‚î8ΩB¥öø˘=—s°"¥%zÑ˘ô"ÕØS‡nˇ;.[.\~^H†…&ÇºYO%ä≈˘ ãbÙÈ+`‡a/F¬«Øgb*%á)Àí9NQùÂeœq:ÎΩ•œfΩwÈ@∂|˛∫∏ÉF¬¥P@ö5˚¥¶ú™‘`‚Ú;“`ˆÛ\∆{0éw÷tÄ‰Ü›¸d8ƒ
∫ñ™":ë¿¿T5%$juk2ÀeË¡∑…Ê_Yå„ \T˝‰A<EôMH]<∆<ß∞€ÄV„ƒ¥îxÆ=nâ/Êwz¢zÌñ>ΩNs@Ò;Ò»yó‘” Fƒ¢ììßÏÄÃefF=vô1ÛîGy–ˇÆ.A¶“˜¥≥ ùûÃLSá‡Ãé|\{#$\Ï6ñômYi2_üPìP0¥…BO  I≈üëΩ8—Ë–	“ô∂»≠IßZ	”<ûâ’ÒÍ‰Xö	ﬁói=¶AÑŒL°‹÷©Ç8ÓÄR`±];ÅÇˆ-@òÓÖMÌ7ø†’ÿˆ≤Ï+qVÂî4¶ RÆMH’gî¿„háQ°:áÅIgå⁄Ø#ŒXP¬ÉôiYg}÷πZ!Wã
\ÚûJœ¨4ÔÛ[RsEM†Á•W>êÇæ‹Û¸ ì—?{ÒÏı≥ó/J)†™·5uÍP ªÀÃ VXıbˇ€)Èı!’∑£HEÖäEãë›ÆûW£Û`í^-ó Ç|XØvÖ¬XÁïzÆ€¢ò„]Wdµ“H⁄ÀÀ©m/jÖ<+Ñ§òXLR4&C4	Â>‡N2j\l Lé‰…¡Â_)›8™∞ÇrÜ˛fÿ¢º ¢≠)c´E1º!öòHé\M±2∫∞òÙ@b_$'ë<ÀQûLM¡:›W\‡Ê4BK˘π√IÅÙV}©™nß€˝Eî°ﬁJƒ§dëZû…4ı¥ø»¶,&ç@(–ãÙÄ(m—v∆¿[Ó¿Rß‚Ω@ˆ®J5ä •8oé‰•õ≈˝Ü(,≤ìLP8≠∫•ÇGBuµÄD7Äû7å£I≈ÎâÄwô¶Ñ“äî_)Ø$)w8ÏõEhY|PB”ˆ
ûgîv2ë,ˆl∑ÀhóÛKGÅë†,¨™H∆U˛∏HëB
ÈÕˇ=·T¶ ®•BÒ‰∏vAØÜÕ%kMÜë
≤Ê¬ã‘®l¡E–G:i„˙Ffæ`Ia[¶¯x$©wˇŒ∆jÙÁ qxvú◊ÙÆQ0>«ë‘È(≈Ìn	M6∞$îÜ√9ÄË´Ωöe¢fCåœæã‰ÉeÁ∑¡ kúÿƒXı+ÙR¨˚ó·yKòYd'¶‹Ù—X„“∂7è
zôP
Il˘uêÚ”¿O›DôrxçO@éâÃâk¬öF¬2éﬁt˚ƒ¢ÿc.já·Q Ò õñSm4úSùÃx®”n¯zAôDKR˛µÃnôı‘†Q≥X¯±∏+V>ö‚E¢QËû•9dVU{Ã:≠)X¢b± ù)∞ºO@&õ˘©c·XT™9≠∏¸GA™Ôoà‚êâô¿&œ<è≤ôQº ëÊË´ˆÍk§˚€å”51≤bˆ—ìÖjv‡Õ√(»VwÅﬁôÎp(ÀØ§?Ã¢sÖÃe∆G@ùØ2]gØû∏]Nz”aä^ÙÏÊ«õ>J$€¶XA„Ê˜π¨≤wû¸(ácõ ƒ ›ïXâªAî˛ªÚ‚Â7ñÒ≠êQ<€#§Q*‹"pk¶’!÷êMPm¢PKè:Åtiúd@ñ≤≥WÙ4OMëj„∞=ä,BTŒAµû$*UËêFV∏2„I£úT2R¬KlS®#!ùòƒQ⁄MSU˛œ≥9ı#3YUJ⁄¢ãYñtΩB— ’yÊRäµ)â+jbVX˝åvka˝RBj’Ññ≈LUl;åŒÕ™˜Ÿ8~Ô™˜hÀ—€ÉdrÑÙ˜«$ô¿ﬂﬁÁèX¥˘pÔ—⁄⁄í™ø},ÇÒæIﬁµÓûG˘⁄vcÇæôñäá≤Ÿ@>∑ã≥r&ô™@[ñå∑Â°…Œı∂(fœ ±„ùkd∆sÙ†G√˜;◊ÖC˛¸…±p$y=ìÌUÒ“eÂX’3r¿3J£ê·ˇz@≥ﬁ:è∂äüŸ(òˆ÷Ä@_„À»çÕf¶Ω5d:='Ω≥(“¬ŒzßQŒ´◊ª8ÉÂ^}d4ÑHÙV•_Ó¶3”‚/*4˙\≈ﬂ@•A˚A≈ãNõ\±p˘ç4Um+<i÷ó¡˝l∫¸é¢˝:†FäƒâÊ8`Vd˚*cÔ˘’Œ5º3/›—K†#@E)§◊¡Ä:ôª/–∫∆˜.cKΩS<|FbÿÛ”úM{è≈Ø∑Îk”ÀwÏ(Co0Ü˘∞Ÿì°Ò	9ı{êW{Ï-ÔÅxF9™#¬`<^Z)MH†MÄåu0	ˆî-F=* ê^·Œ„…0ôBÔsÿ(lã-—%—Õ√5vÜh∞o©é≈Ö‚°%∑cTOJ#£plU¨òıp◊hj{U#jÚ ∂˜ÄRƒΩMÜ¯Œ’ÄØµlÉLb37]¸™¢JKÂŸV=˚ÿÛ,>~∂i>MÄæKdI∆!+@_ Ké
–^¿·ôñû8iNvK–µÌ’≥Mˇ ÍI —ﬂD≈€TªDåù•o•§ îÚXP…%uj¸m0ûAÎü˜ˆ7ÿ™2Äó0f`XôHá∏⁄™ãg˚ÿ˙Ód@Ró€¸Ò?ˆ>‹ËΩzπøp”/–˜Äv0AÒ÷˙µ/wÊºe”{/é˛sS{XÇ†™ΩÌUX%Æy.óØu?fV∆zÉtˇäQ´]ãWçÓ”rü≥à‡“Téf ?íãÆ†î≠^Å∑Cb/( $çg∞ê“ZÉï–∞Ñ(™MlÄJåqﬁÿ•@®@º‡4ÇÌmàåC›>(Fâ8D•x˙€´”€ÏÊuñM∂‹Õ]±<à*´øeÿ=ö˜oWKl±aÂ7+õˆ/E-´,÷Ë—öÀ8%àqv™re∫U†Úè¸tÃ/Ω¯$ÎQ(7AËa›4<ç\Ù6>
˛ó&3Ã)“€ ƒñ¨hC}AÀ7'ãC«2FÄ©ApE˘3:ΩR?ßÿƒH±qÄEvñFÒ˚ﬁZ√(qA«™º)¶4±h2bY:‹)^ú≥`úÔ,∏i;,Ÿ3')ËL¸IXÈ®G∂Â(^™$ñ≈≥’∂◊3‹œ†aÜ5¨vÆ7>õóêIA¥UøUò-˚Û”_Î"·~ì;a£yq∂#b)?5¿Ml‰?ù3LkÕFc‡z¡p»ß∞
DVk-ÅêﬂóPƒ•d „rr}’…:|Eó?™ff∆Öf“ºB≤æêt˚A -IéÂèPíﬁL1‘†~AË£¯˚Œu¶+ôùZ4·Ë%∞˜%óˆåœuÑ>D≠BËOj◊¢∆ıÅ-Óáñ#õ/P∆~øO5¡§òˆ“§ZZ-m|–Cÿ?G€rsÕ`Ù?zÒµPvÄ=í°›Ü'hº@Ω∏éí≥ÊmZ{_ﬁlbÖÇ}¸ºPT2Cí0˛ly°‰ÉX Ì6lﬂ3π†Ë>Z6(‰ÑÕµ_-DxˇlP‘ÿ¸3‚Ç4°€1AÊ<ê ÒkaÅo≤ÄNãÃ≥ù£˝ØVÖÊ◊@¬Ÿ›0¡ˆw™.;T‡¨7Ω‘Ñ∫J&ˇ%ÌØ—§_ÿ≠XgQ˘Ø{{c¬#4&d†kSpÂ$	Ö”
÷nãS†r<≈§(‚(-¡Jıl™Õv[?è¢/ËïH#àÆx®zÉñçÍîü˜iø£hkÂ´MÊu˝YB≥∫í$6MI¬6ëÜx-Äa™π,I{”Ñ|)`{ç—ıîªgKn∂îrÿ¢*Kr)	≠ÏÖræÜ 9HÆ$Ù`êî˛»gW7Ñﬁ|Ã&–.ü¿¢¸™˜;e¢W÷ÅØWé∂‡∑l¿Û–Z\∞€C‘¨éeCáI!ÁlîÂÑË√vRŒ6XÉ*ÑlÉh8Úv6Yzrà[ò$ÎÑuêIq¿∆>å$3<$qÒÍ7ø9#Gºê"‰QŒ“ì]ÙòfÑ∑ü‘p≠F^‡S;÷>∫a¨ó<\z"ê¢Ò4Fï,9 —MΩÒ»u¡Ñπí8<JÙm@'Ê—xÜÁ“D+-ôÃ<%˙•»ñ≤å¸y—-m.….≠s¬≈hò÷7
"∂n=bΩ˘ø4∂}<´£g÷&"Ü§h%2Ê™Ü∂s jd˛∫™&±Ó# kbÊà%∫F>ôX@Cıpﬂ¸O«»WòRÄÚùs·Î¬«d£æqXF3†áÌàZ˚âUô¶ZIŸïò-} Ÿ*{EeâèEY‚<Æ£NªûFÄˆ√°»MòÇT=Ω˘â{I£bùí˚7ûŒ¡˝¬%rÖ“†`πå/ì1!¡àß‰¸%+'£KTFŒA√ô¨rkë}ñDˆjk€ˆ—Ys“—ø|•Œôï£Ù¶Z§Cfª≤Ã‹4áú[µ=µ>œÎå!Œ±ºÚ«^BÂe»œ 1x∫≥tpπ••x¶BíÃ†~ﬂ!/Í≥˙jáÚ~§#û˜©≠ˆÉU^‰∑´zΩy®∫(ÈmG*‚§=„îµb˛†E\úxc‰wê∫ÉÅ’ç#qÀ∑&ÌíN©®∏g‹ç„≈¶öáKÖUoTÂøÎﬂÓ9èë⁄¸ﬂ¸À
ãˇ˝ﬂÿ∆gøcˇÒOˇÃD—Áõü&ÙÎh∑mYˆ®¿U]◊“,
Aª6mTâ5&õ:3•«	Qo∞”§Ç˘∫∂F˘F≈”∆Lj˝–î,AS≤&p˘Õx%M_WÎnÕ‰diòˇ§”e¡ïgÔ§™Äw‚ãc9N.‡ç„c›€ïhqó›Òápq6…{Î¶±åÇûßàÏg,˙1újXCSDÙ—˛∑+:Hÿw>Ïí#N¢x=Eh°§ﬁgª©ê◊ê£ßüàÉ‘œπ´ÑØÎ2/ÄÃ%Ô?Ijú˙&0«7*Â+†Ä¸ Î˘í∏aŒﬂ?Œ™3£mˇÓ®B•öökÑöÓ∏K‘Ô/≠⁄ ûèL JÙºxsÚÏı¡·1Ôæy˛∫≈°,[¨í.–:9˝≠f«2ÊãÈ∑ƒn“±`5mXﬁÁUΩFé∆≤ÔÜCÑ0F#$¢ıè%Ò><H±DÜa‚P/ ﬁ}vî:≠Ω=[Éq™‘NÊÈi<÷¡6í©~øfµÂß‹CÕ:»eªò8≥ƒàı“5G¨4uÑ∫∂oÛTòB6Ãd,ºLì∑„†ÀŒîä+‘sG€bÊ∫ã<i—Aã›Q|®z‡2® QŸ˝V§Nkt#e}Òwº˙ã“Pë/l§üMÅ±p5Ã∂ﬁnjÊª4°∂∂¬®Èv»yc;Õœœ[¥È€•FZ“Í∂∂_kK#}™¨RÃpÌRW…ÁB)A$ò^ˆ≤©aÅµk ∂åKÃæÁÜ(4±nG£mR
ÎbsÉËÂÛ(ãÄ∫ö-<í-‘7POˇö,p€_ß—Ù[û¢	|,≠zÎè´ú7ßÕfÎ^…∏ßƒÔ±6~—{dx√\áfÕ÷Ám¨z>[¢p·P÷Cü†àù w⁄'…ã‚Ü-˚ÔŸH^Åƒ≈‘VLÓ_∆€næ‘ù∑ﬁ'mHá8]ûÒ·˚ArŸ¬±61>åÍìâ™-‹)LÕ´òq´K˛/~®Î€{˘å*h?]ar–[L+ÆrRîço⁄m„b©Ü@cŒ‡:Û bÍ^ê6[∆´∂èp«hÚÆ{H€«ƒ±Âc2` (·ÍëáÚ`|Øæπ¸r¬O≤‹mªVi/‘>÷d Øf6Ûäı©i—¬Ë
åÚÜ7∑+c‹ÜjÙuKMÆöœóugáMñs6"‚7ü´◊+¡ß˙ıÓ@ÑªÉr[©^Sß®bä2÷É√^œí4˙ë|)–]≈õÀpg\¸≠HïPpØ®hﬂm]u‹H6∞Rd!Äg1b¯Êè!]ñ±Ù›Íî:<ΩÖF;œå˚*I'¢ÿ\N^Ô~˘°jÌØK%=2!¯Á¨ïNÀE9«w˘∂∫Èëãç˜®¢z∆˝-µÙÍü±ñÍ€∏QT=üÜ˛]’j˚ˇá∫j£ûÍ8p5ª}¥j®Oõ¨ÊZQ*kî *„ü≥∆haçWi¥üh–≠ákTGCüj‘}˜<Án•‹&˙öŸq~≈v1=òŒ=¬1…¶‡∫m‚Ø;Teí ô◊Ü+ﬁ>Ír”u)À…FSëuKßW\,≤e∞‹ıÈ,é˘8#{Í…ãTÍß¡_Z~Hu<m÷}Æ”«TÄÜá_—–:ß-‘¿EE∆"Ÿ“(|9™‘p°^T‘C¡ÿ?m–S)‰9>,RUó˙”+ïƒÿ"•SÅMèKâó÷õ˘TXõôòç˛ûX4w”KY∏◊©H”åVÔÓ™ßR7ó[∆´±Ú∂2÷¬Ù∆ªπÅ[ﬁße<bÌËH)Ê‘ì≥û°£vé
üÓ’â-˙Jc¨sì[˙ˇLï7˘Z}k£˚ÙŸC?bòÏ@Eƒº¬Tn*M6€’9" ¸£Ω%Ée…=˚uBëëÁû"eù®ºòÅHXzÛ{ë¶2@›Ff™ùà°≈Å*ó»‘Õ:ã(mz¨R∫F¨ŒPÁ¬ÌYÒi§Ëvë e‰Ÿ‹Ÿ‘®CîpáO–‹-5T2ƒÈlå9¥÷
Yµâ”©â≤πÃé\ıp∏$éÚ$EI´QXΩˇ»”≈ì_Y©êæ÷}YøZEí‘∏Äó…ŒíùóÏº˝OõÉaæC≤”òSA`áz•ñÓ˝mJ>íÏ<¨s¡m"‘µÙËn#t÷œ=‡Ÿﬂ◊û´¥Ù‡≠¯ú3™'BÅn%†SKhïå∂68d¡M¿Ó\é∂Û÷—¥ F⁄—y]˛ø™Òo>¢ nÕñ´5%S∆§x+X¨ã√JÚU≠,ôa*Òst~‰)5Ærˆ’bn…Ü≥àÙˇxÕÕ_0'√˜¿ü"QñÄ‡÷¨ñoi≥éx[`}5•Ú-K√ÈÈR≠¯◊∞<ÿPiâÍ⁄ÛÂ6Y__ÿHªiá†â-{ögŸV2À«QÃÖ∏∏‰Hÿı∆õzÎGBY˙%4	|é`hD√rnØäj4û~_◊*`˚möÂ"§≤]"rõñ’Œ´i¸µ|‰6Õ”ˆMh˜VÖ6˙ÆﬁË-˙)É6MÕ#Ên!.ØfÍcNÎµy;Ñ∞Ú–Íg0x™%F# Dé·Å@π2êHˇ˙—#¨Á≈
'u
LÀ± ï({1‰i.
KI÷– mVÓÕzÆÍ…nö∞/yÃO£aD	óM≤Æn¿V´'Ô∆É∑é¡˘2àáæ¯õ≥Aø_atüÜõY4Ó˜˚÷P·ôÜ1¬∑‹Ä»ùf8S1ÇΩ(oÄ>—zÕ∂‘äÅ˚Ã¶–∑0ôVºS≤ƒFóT2^ÏYC∑ÍÂü-¶ßí†£ÆçËq§º≈≠Ωï	·nvª®v¡ÍA{˝¿P-€kÜzX´·nÔ•X'Ä“v∑P¨™¬›Í
xòê1˚H’]—2|≠Œ–NiPûX?Ã–≈*ôñBóe)[,∏¢˚ÔdE∞ê™Ö0,˛Tõ™é¬¥w©*%∑tãáMˆéÎ›ÁœOévˇ·‡≈Îì√É◊ﬂº‹?&„ı§…«EÖ˙ƒ"£˜„‚€QpÖp9‰˘Yf˝(ég†ju˝N⁄xYµ4òìΩºÖüïk.œì—hÃ≠»˘u⁄∏O-j6_ÚõÀai√”…9¨cÌŒÁ⁄õ’ãÖ+Ÿ—W◊K¶tÕM‘ÖÕc˙˙ös6#≠ÈÊ3Ul¶¯4¿ª9áΩY»ÉùŒ‡ü˚$t†^g]©ÉõhÂLR0ÈVNÔÏ∫Ë	tÏ·ÈªÚÒ‰&1Œ8VÎuH¿4'
a∑≤R⁄:8=ØlÂ∞IökuÑﬁÊê‚>»Í,2◊Z≤kı÷«#“Y√≠ëÓ<|˘/‚]µx7 ›c1ŸéﬁhÏÇ1ñ≤%ˇ◊&ÿΩ.˛§C±§hµóﬁ¸¢jRùÒQ¶çx∑Z2ñøb9Ù∆:’˝Ç!ËAÇödB≈¬–4Äâf‚õy:≤çâJKÄ|ÖI≥·¯~‰ªM;ã‰C[‹{‹(Óµ‰ˇÁÌ‹hD 3Ωå«T<oÓê©Ãé8çvVaVmnÈÿUav'sŸ∆e´¥:*Ô[€ ∆SI¸öTmCÖ∂NãZ´ƒæ¬€0û°%¨Ö+]ñÛÈŒtÿ‚YPhvÆ◊ZåAöaN˚ßú¡* H€e9∂]E˝˘=G;ˆ:≠0€Ä#¨âò9oç°≠
Å‡⁄xÃé¨≠Èü€9?Ø5°ˆxÑı6MU°1ãâØ)¿ÇHﬁç≠]|nëï.d…xÜY˝q\®I$”ﬁ˙ÍÎëJA≥ø¢¶Wë3yÈ…_›Eö∫˙˚UÎYW-‡ñÑÁÕ˚ì	,OîvBÅ∂~ˇπö{P*†≤∞A™
Ôﬂ¸4 Å‡N‰Å◊Ub¿3™•úVêÈá™˚˚f¸ì‡≤w˚Ì1n∏ˆËuoå¯~ÿ∞Z`Ω™çL¯∂,¯æBÏ∑=Ûm…z%„˘@sÃ∂¸◊8∞_nßs˜œÅ›61€èÄ’6PÚF:u7ñKûkm)iz˛£±ë®Å÷XG¥r+˘ÿ≠M#çÁ∫íw]U]_ﬂ1¸BïüuπÁMØ4rç( ¿zì¡ÜÆ»À∂@T=_QbX~⁄d/;À√°ó-–Ø*÷Ã"I⁄)˝ëYcƒ≠Â[mJ7äp)§.≈±-Ñ¿€ªiö\<ßÃÊ:‰pı	˚6£∂lÅ˙%ä⁄sN(œ*∏6=ºWñ÷áŸdãæ√ê{]>^ò’d—'†nh	’≠8‡ §éÃ∫ÙdWVZ7vSΩl⁄∆Õö∆2Å=3õh´Z§0óvFñ°≥/•ÖêâODRø—^˘uiÓanH9@Ï‰VæêUã€‰m›|ö◊Æ`@i+◊GÁcTL4AC) œ¬é	é∆¯¯Ï,πÿÛ4Ô|'⁄°$‰∞$RG˘¥›ﬂ’∂Y¬›Ç÷Ä ÙXÑ[õöd√¢5Eã;jZT`=†b%2VßFÇdß í9Ì/D®S+œ\qõT	ßc5	ˆòBT1πj¥k8]∫≠d¥êﬂÔ¶® ƒ0P°•Û/yåayÍ1œO1ƒ5bósØP†Ô`÷kDÌ]¢<Nﬂûî÷vÁòÃö«gÅŸπ 
àiŒ@é ˆÄqucQœ48DÔb¢WÃ¡ìQÔÂïÁﬂi•ÎÛ"®—OX°oWÔœ,wJƒ‹ûÄ‡9JDL+˘_5(⁄“∫J∂b6‘_%c·õ>©
|59´Ù–;–mµ˜É.ÎëV•ßr„R,“rS0ïäZ“Òæ®nt¸t—ì$3˚p≥Æ”»àSµ÷•'_ã/ ¸√,ö∂pv«£óı…Æ˙äd∞0
Z8:ªnŸXrhÈ…K¿b ´LzV!ÍÌ€]∏πs¥≥Ù‰[˘ç\ÊXi·¶`E£ùˆÂ7]s`·∂9={¢œ(’~F;pQ∞%(_	Ãê§	¸Æ#¡,ëu7ˇùÁ„D,ÂS è6¬¥…É€‹Á§F™±4∏o7T}±ù∑k¯˛Aƒn&π:à¡0sL}ÜÅálÔ’aüÌ&X#‰ >A'Ó~ú†jg£4òûE√K¨0ò#VÛs+£îÁ≤ ﬂ™òP¬≥~Õ0Æb›”æ°=#'ùeGF*ˇ
9∆…yB)Œ≥\ú#o ≈√–Hëƒ˙\ √«xrè·év¥dø¶fç¨~á$⁄]Eî«ääÊN<nÎX∏∆*OBºÄ%ké“ºõíO%]È¢˜;vˇ‹HOÀ;Óë£—+°⁄N©”xÇSdÿYouh÷ cÀéa˜#ˇ·K!FH◊9ç1≈CπeS@ﬁ√õ?Ö≥qS@±SÛIå≠ÔÓ	Z¨!”∂•Ì¢aØ≤=*Üø(.à/òÆ0¢≠OÂ$‘±˜[ûïµrIm´≈VX§xxò ºπ\†‰YgƒUæºÚΩÇ\7ÿ‚é∂3ëﬁ0^n°•Ì≤&¬Ã@9›0M˜+ÜıÓûªòÀçåVaJö R^îy;ÛöwÎV˘÷:aôÈ2Äó=$Áuê≠ﬁA∂Hô°™¯qdU∞q’oÃOªµ≈—]~∆É∞a‰i”NÜfny¸WŒÕ¢qb}Èâ&&˘Ÿ/3€Oı[û~,C!Z˜±F‹èf4ÇÍ7û®≈ll°awlÁÉ$º™ÔÊ˙Â˛õÁòhˆŸãgØüΩ|!‚(:ì$lïUƒS L&J·'˙o°±~æCe˚DF~±≈NÉq∆W@ê‰@ÙOl@ˇA’˜ÿº)•J'ä°0ñŒiƒ«·∫ &ßLåi/ùÖ≈∏ZÊy≠afã$U√ÆA!"ﬂÈœò¢w·®ÜA/î/OfÖΩ%XΩ€b‰%y°]€´´ÏòÃL¿<ëó-}K!ÍÀg¿’æüëcl$0Ï—:ï£?*ÂZYÂB(¬òW‡@5‹N(«+éQ(v:RÍ»)ˆÒJ∑]∂[ñæÄ9@á ˚Öæé√+_´†Ø∑Ë©MÓAM$Úä¨0Ö$[z˘Z¨JsÍ÷∆FZ≈5·x∞å\¢Å˙lﬂÆı◊6ksÄÌÖVF%Üı9
ã£h)≠w9∆∏çä‹»ƒÒπÓºò¥¬ñ.‡7\}¸+÷{˘2±ù∫¬Y`ac 4cr¬+ﬂ3aEa>•…Í€ÂHﬂó‘§SútªFÎ¨†ÙπEjP˙Ë¸† ãêd•UN˙ﬁb˙ÏÕém“Noﬂ¢a«5BÁƒ*∂K*&÷&C®[n[ÕFó®ﬁX+Æ…g„$Gclr¡√∂`nìeîëƒ–j¥q<níN®ùzSÏ§;®^‡Ñ€=Ö›ª-©ŸbÙqÿz6ösr5zÓÀ CôXI,√ÇõîÈXŸPö=[yÉ´]àHkrc‡ËGÅ∫{·œ£}6¬¥èF°Ien»wgI
õ“7çG•S›∫‹Ñ◊∞ﬂ^í9^ƒﬂtíiﬁ(A´hÎ]A—¥ä:!÷–“œd-∫l"t≠Ì_lAO¸†´!”NT’™¬œNé}·¡o''ûF|RBµEˇ9„®H‹~oµ∞*:}◊¶”&˘ÙÆÉ÷m∑≠¬Ne≥oπ_mO”Qê)Ám¶fgQÚÿ5
∂âgW[£
yÍ€4+‚·µÔ:rUgò}Ëçâ__+˘ﬁsê¸uπ¶TLÙ©vkFwÊMÈ‹º….zÊ≤Q«^LöŸú`◊S|†.Ö.ZòîØ5ùJa/Í‚l∞ÓÈª⁄ãÀ>1t yaL–ÅK%Vï^Ö‘;êÙ·œ-_#AﬁR˙ªˆ1ßÂií-wÎêÏéÖFOã˜}L8KßcnKé‚“áéõ˝!°]ÌÀ"„-ã†âB‰ñS˜>G”ˇ}üﬁm˙\øm"Ú,
∑@·Gò,Øø:¯mkôÕõ¯¨lÁÄö Lç∂
@≥ﬂ∞›OÛ kﬂ"Kc¥'ã≠≤£4	gy≤@kπ¬Es∫Ó]˚VíT∏`XÌEÛ⁄∑4T≈ıåÜt¡ΩÄDg°’LQ¨oÅ·»¢~Êh‘•¶Fﬁµ◊YS•∑ÖÁ´.¯ioKmWXÅ-§∆‡gU?´3¯πÖJÉü¬«UÄ˜Ó4¸,†›‘Ê6JıﬂÊd†ÕCã∑`ﬁ¢hæÄl˘}j$ãﬂXPrLù¶x⁄(Ã∂)ß¡]©ÂJJu…n
mI_dÌ5ı˘eÙ%¸¥∞Ã∂:Á(tÑñﬁe7ÿáY{okÛr£ı+±‚˙ÖÒá±◊Ù’√ò	ô√rü√õgËåz∆\¢&%sŸ#gh—…≤8°—dS¿∆ C1
’±Âo~…á3r2˘8,ªç¶\åÆMbÀöónmÕ›äÜ¥Tç˝‹]—ÂØ÷†+AËï|ºê‰#{O6]wÖƒ#˙˝xÕ∫Ç¸·AL.∞ˇéÏªÖ=ó“ê¸&›{∂‡z≤ú6Øve‘ˆlÕòkË^±xÓYµ∂mr®:•ﬁî™ç nñÊl;x)ﬂ*ÜpºÁÖ˘ŸŒ5•Oj¥E∑…±⁄ `Wg÷n
‘ÈÓê,bÕ^‘ûçà@}ï,ŸÿskKv+∞}lÊÓ –˜á('∂∏ú\üŸ¢-˜mì›¢∫g> MAr6ÎÀî
$⁄%dÓ$Æº@Ù„™qc/à1ôgZâq wº8Eû\√)ˆVkc“MΩ>U1Ô#¸ˇL’	FNÍ∑Zª ›]q£úfëD5UiÖØg.¸Ö*,p f9}n¯bÒÃõœ¸∏}ÖÃ&µú(•JAm»‰WQà±°ö.‚Ô¢”HÒ·œ yœ‹^¢Ñ\™æX1»XGf@¬Î§[çy< œÍ"Å∞◊ÜÏÇç°≠~5˘og|Çz/÷ƒƒ¿] åí4@/oTü«ÏŸ—ä®71>√∏P`©˙&™¶”4πå(W!÷3B∂öƒX$ÌIíãàQÃU ⁄∆0 >Hìf:{î;Úù]´»‚T°íaJ^¯l6	tT0∂7c7ˇ6Œ£	|A!#äÒ®©0S≈¶5∆uª“Œ>x†¬üµtY.“(gÆowsd,Ÿ≈ZÂ«{‰‘w{®ú†upm+◊Ò2ò ¸Ωã^}ú∂›Äw˝}‘Ñƒ¨èDÚE–™Çqmeı!˙Ÿ—C¿OÁÏﬂˇ~˘y4\¨3xw#≈‰7~=Œ‰∏Amà(µï/Õ‚Û¯üˇÌüˇs M†Ω[6Ù (.;z
⁄1îÔvvfMë÷s¡œˇ¸oˇÁˇ√∂ÉE^aÏ,Âß;◊ﬂùÂ˘4€Z]Ω∏∏Ëèíd4Êò#`vtˆÙáùOÀ ¿˘œWº7‚—¸ªˆÔÙ˘MvñN@ˆäﬂ∑è†OäIq‚$ôrÃP'0#û¶≠≤õcMêb§Ëê‰Í›hëy⁄¸,¥Üå}Ks` ˘ÖVr{5X®£Îe‹˘A."…ÅÔ.œØ≥‡îSÂäºS^V$¥õc»J∏zx»æ˘fk2Y^ ∏°.ACÈ≥–ÓÒ§P˝ÅH„Ω“„´Ø¯;ÿúœ-a‰Î£cëãCúSj@…,√˛ΩA NÄC˛0xÅ˝FCu»·  ˚!†x¿>è#aµrÒbÁÁÇ	·4â`ÚY&í&îcW~EYóus¢8å≤i"s∆âzkã¶›`ıÛ—ñƒ'ﬂ¢o≠¢>Qp0È4íÉP∂õc¥).√(ä*±zM*Zœ•]E&Òh´c‘„∏≤%åJtÂßΩˇç˙8Ê*ay≈ò¡nRDπìµ©¬f~ä¿∑T4J™jñî¶òµt˝Qüb€uÙzˇëï¸¢tZQJ£Q≤ﬁ»  •ÿ∑GæjàÎÌπˆ"út˚0òE±“…◊ÎJ	x>ÎÄYîè@]6í(£Ä`qûöåH•¡∂Ù∫Pü÷∏µ(~{±{?Bïx©R.äﬂwÇâiíqÈ¬Cı#Õg-Í”'ˆï£“&Î~[’∂§µ›sMQùM≠‘˙Ô¥‰Qƒoo~2ÿ-¨√§h ∆Ûõ?$Ïpw]¢µ!	≠E1ôYt	Ï> G>Bóhhm0Fá[çë˚Ÿ9Ü¢ÓròÄ†úÛë»˝‹gG¿≈Â„¿‰«£ŸÕOF‘?≤âDX5,Ω≠µÅßª‹_∆˝i›T™È`DóIùùÁ\ô>û‹”∑.ér»'ÉT∏’®ƒéîw⁄µVR‚»aƒ))â·Qte— K‘ê9®πv˚ôÍ “[ßíæØÛØgŸe#8L¬`¸‘ÁNûRÊ◊∂'-ç©óÒÛóåèO•ˇ 2˝2ToùòπØé∆≥ÃŒ ºFCl{ïäY&j´r2∑:πiµ±€¯tëˇbµΩól≤Á@åÑK◊¨¡oI∏s…d{∞Jò‰d÷ó–˜˘©2ù?} ~W}2-ﬁC•Ü§WëŸ÷˙ZScQXå3j3ë˜≥È8 ;ÀlY§›àqnÒ€µw›˛˜Äùe∏ûÕY √®≥∂¬6∫˝<yÉHπHŸ©9XWnm:∑:töŸy÷IŒõ°ú∫SÁÅ{T∫Iä«$æÔ·RÙ¢pπ¶€ -\„{j˘9ôÏgd≤Ø}n!ú%ƒAµüﬂn|Ü<^W!÷«wœ∑
®µ˘ùÀ”¨ìÖákç><Ê?’Ó8Eﬁy´úŸ£≤ÀŒ#fyU5Iïµ"WChî9‘l}xÎöoµgËí÷"eôKﬁﬂ“JW'V(15j∆£¸±<;£cœFõfGú)w°6øga„§ZWŒ•Aà·KΩ<ÈRvö&õÁ&˙Á„µ∂µı¸<⁄Sﬂ:õòÏW˘∆rZ„⁄]+"}g.eæÛÕı#q|“˝r)~ ˆ∫û^3UH§Eg€#/›	&Zß>8heXkk)i†π≠lÚÀ Y˘:l9ΩNçh…1Ù;Q«ÏäºËß	√´øï¶–Ie.˛Â	i≠L%€´4©V/≥6~,NÛ>êU$∞ì√=@ä1öDK˚Ak¥ ¯‘f∑qÇ¨ñâı3Æ?ëﬂëJê∞R ≤p:–	ÓìÏ¯]M?∑ô•∑@ì/e®Ùy•xÙoU.°[ªΩ
Ø÷jRH…"L·éJÒÁ§ﬂôÀÎG	_©
ˇΩ¬ÿ–ã∆@:§—·]ãﬂUal∏´6oì¥Bt““æºX8≤kAiùÇ…#x÷Çzï=O•)…bØåòÿ"xƒÃÈ∏˜õË¯ªr¿gµœpŸ§‚D◊⁄Uıö‡◊±èyé'ŸÜ2à<lvY‹K‚”√‚öÃﬂmÕﬁ?ÓxÃ!ˇ   ˇˇÏù›N¬0«Ôyä∆òàÑ»áàâ	QØúâ¬T¨q…ÿ çÔnO?∂ÆÎ∫ä$Ñ]ë¨]∫ˆt¥˝üs~ÖÀ¿Y˚pâÚgu3∆Û¸çô≥‰Z¢ ∏û—ËTÆ<Ìå5~9DàÁs¶ˆä∂ÎËØ™¬_´2÷ 	•€∞8»´¡U∏äË;Iföÿ2z∞zÀÊ…éãé”Ïpàyz0FR8/$:À›ï\”Y9Îx[&~äÀ8Î¸πu≤Eu)mRÏ¥ıı05A…Ïê«√’Uùˆf„^æwÍòbç∏¸Ìdø™•_Æ≤h•⁄—al»Ñ”aN∏y‰˙'‘„)(ò:5/´“¬í{õ•a#NJ¢_¶ ¿I©t'ËâÃj≥ê_»`+∆^®§·BemÕòjòiñﬂƒYN@~X)·àO[˛Ç„)ÉÿºbPQÔË]»ùDa!ÔPÔ”Yƒ‹àP‚ñıß…T]_$ÇD(ÄR∏rç‘¬ç]xîÅ®NÚÿ√€Øz¿Ùµ–s≠q Wå…ÁDzh·äAV¿ÙXôÃµl≠∫!†Ü¡YWoõÖB(%6l]	Ñr.híZcEBIèl⁄≠ùnØyÆ7€Œ¨ÚÖúÔ§ïÌõB	¶8I›$Ω)Eß˙ARŸ√¸0)˚≈§DÕq≤¬Q}d„ëMydSzcS™3~GpJˆœo?hÛÇ®4ˇ·s(õ$+¿ñ"ê
Ià$,b/1}’H‘Ã`òÁÂ4Ã›¢'ÛÙo´ˇÛ≤¨_˘e Ó÷ò7üZ)˚=m˜vÿQÒ|`vo‘Ô^ù± « S}áºk;üç∆¶Ó>qÿf6Øﬂ0îVÁ˘∞}√@x)E©ë˛§ª‹ﬂ´F„  ˇˇ ÿE:i