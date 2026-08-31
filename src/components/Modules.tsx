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
  const [analisePeriodo, setAnalisePeriodo] = useState<'hoje' | 'ontem' | 'semana' | 'mes' | 'ano' | 'personalizado'>('mes');
  const [analiseCustomRange, setAnaliseCustomRange] = useState({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [analiseClassificacao, setAnaliseClassificacao] = useState<'faturamento' | 'qtd'>('faturamento');
  const [analiseExtratoBusca, setAnaliseExtratoBusca] = useState('');
  const [analiseProdutoBusca, setAnaliseProdutoBusca] = useState('');

  const analiseDetalhada = useMemo(() => {
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

    const custoComissoesNoPeriodo = (desde: Date, ate: Date) => {
      return comissoesLancadas
        .filter(c => !c.origemNotaId)
        .filter(c => { const d = new Date(`${c.data}T00:00:00`); return d >= desde && d <= ate; })
        .reduce((acc, c) => acc + c.valor, 0);
    };

    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

    const yesterdayStart = new Date(now); yesterdayStart.setDate(now.getDate() - 1); yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(now); yesterdayEnd.setDate(now.getDate() - 1); yesterdayEnd.setHours(23, 59, 59, 999);

    const diaSemanaAtual = now.getDay();
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - diaSemanaAtual); startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); startOfMonth.setHours(0, 0, 0, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1); startOfYear.setHours(0, 0, 0, 0);

    let inicioPeriodo: Date;
    let fimPeriodo: Date;

    if (analisePeriodo === 'hoje') {
      inicioPeriodo = startOfDay;
      fimPeriodo = endOfDay;
    } else if (analisePeriodo === 'ontem') {
      inicioPeriodo = yesterdayStart;
      fimPeriodo = yesterdayEnd;
    } else if (analisePeriodo === 'semana') {
      inicioPeriodo = startOfWeek;
      fimPeriodo = endOfDay;
    } else if (analisePeriodo === 'mes') {
      inicioPeriodo = startOfMonth;
      fimPeriodo = endOfDay;
    } else if (analisePeriodo === 'ano') {
      inicioPeriodo = startOfYear;
      fimPeriodo = endOfDay;
    } else if (analisePeriodo === 'personalizado') {
      const s = analiseCustomRange.start ? new Date(`${analiseCustomRange.start}T00:00:00`) : startOfMonth;
      const e = analiseCustomRange.end ? new Date(`${analiseCustomRange.end}T23:59:59.999`) : endOfDay;
      inicioPeriodo = isNaN(s.getTime()) ? startOfMonth : s;
      fimPeriodo = isNaN(e.getTime()) ? endOfDay : e;
    } else {
      inicioPeriodo = startOfMonth;
      fimPeriodo = endOfDay;
    }

    const diasNoPeriodo = Math.max(1, Math.round((fimPeriodo.getTime() - inicioPeriodo.getTime()) / 86400000) + 1);

    const calcPeriodo = (desde: Date, ate: Date) => {
      const vendasNaoCanceladas = realSales.filter(o => o.status !== 'canceled');
      const faturamento = vendasNaoCanceladas
        .flatMap(getRevenueEventsForSale)
        .filter(ev => {
          const d = new Date(ev.date);
          return !isNaN(d.getTime()) && d >= desde && d <= ate;
        })
        .reduce((acc, ev) => acc + ev.value, 0);

      let custo = 0;
      vendasNaoCanceladas.forEach(o => {
        const eventos = getRevenueEventsForSale(o);
        const eventosNoPeriodo = eventos.filter(ev => {
          const d = new Date(ev.date);
          return !isNaN(d.getTime()) && d >= desde && d <= ate;
        });

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

        (o.extraCosts || []).forEach(c => {
          const costAmount = Number(c.amount) || 0;
          if (costAmount <= 0) return;
          const cDate = c.date ? new Date(c.date.includes('T') ? c.date : `${c.date}T12:00:00`) : new Date(o.createdAt);
          if (!isNaN(cDate.getTime()) && cDate >= desde && cDate <= ate) {
            custo += costAmount;
          }
        });
      });

      custo += custoComissoesNoPeriodo(desde, ate);

      const count = vendasNaoCanceladas.filter(o => {
        const d = new Date(o.createdAt);
        const createdIn = !isNaN(d.getTime()) && d >= desde && d <= ate;
        const eventos = getRevenueEventsForSale(o);
        const paidIn = eventos.some(ev => {
          const ed = new Date(ev.date);
          return !isNaN(ed.getTime()) && ed >= desde && ed <= ate;
        });
        return createdIn || paidIn;
      }).length;

      return { faturamento, lucro: Math.max(0, faturamento - custo), count };
    };

    const periodo = calcPeriodo(inicioPeriodo, fimPeriodo);
    const mediaDiariaPeriodo = periodo.faturamento / diasNoPeriodo;
    const ticketMedioPeriodo = periodo.count > 0 ? periodo.faturamento / periodo.count : 0;
    const margemLucroPeriodo = periodo.faturamento > 0 ? (periodo.lucro / periodo.faturamento) * 100 : 0;

    // Produtos mais vendidos / faturados no periodo selecionado
    const produtosMap: Record<string, { name: string; qty: number; total: number }> = {};
    realSales.filter(o => {
      if (o.status === 'canceled') return false;
      const d = new Date(o.createdAt);
      const createdIn = !isNaN(d.getTime()) && d >= inicioPeriodo && d <= fimPeriodo;
      const eventos = getRevenueEventsForSale(o);
      const paidIn = eventos.some(ev => {
        const ed = new Date(ev.date);
        return !isNaN(ed.getTime()) && ed >= inicioPeriodo && ed <= fimPeriodo;
      });
      return createdIn || paidIn;
    }).forEach(o => {
      o.items?.forEach(item => {
        if (!produtosMap[item.name]) produtosMap[item.name] = { name: item.name, qty: 0, total: 0 };
        produtosMap[item.name].qty += item.quantity || 1;
        produtosMap[item.name].total += item.area ? (item.price || 0) * item.area * item.quantity : (item.price || 0) * item.quantity;
      });
    });

    const produtosMaisVendidos = Object.values(produtosMap).sort((a, b) => {
      if (analiseClassificacao === 'faturamento') {
        return b.total - a.total;
      }
      return b.qty - a.qty;
    });

    // Vendas mais recentes do periodo selecionado
    const vendasDoPeriodo = realSales
      .filter(o => {
        if (o.status === 'canceled') return false;
        const d = new Date(o.createdAt);
        const createdIn = !isNaN(d.getTime()) && d >= inicioPeriodo && d <= fimPeriodo;
        const eventos = getRevenueEventsForSale(o);
        const paidIn = eventos.some(ev => {
          const ed = new Date(ev.date);
          return !isNaN(ed.getTime()) && ed >= inicioPeriodo && ed <= fimPeriodo;
        });
        return createdIn || paidIn;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15);

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
        return !isNaN(d.getTime()) && d >= inicioPeriodo && d <= fimPeriodo;
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
        if (d < inicioPeriodo || d > fimPeriodo) return;

        let key = format(d, 'dd/MM');
        if (analisePeriodo === 'ano' || (analisePeriodo === 'personalizado' && diasNoPeriodo > 62)) {
          key = format(d, 'MM/yyyy');
        } else if (analisePeriodo === 'hoje' || analisePeriodo === 'ontem') {
          key = format(d, 'HH:00');
        }

        if (!porBucket[key]) porBucket[key] = { faturamento: 0, custo: 0 };
        porBucket[key].faturamento += ev.value;
        const fatiaCusto = totalRecebidoPedido > 0 ? custoMaterial * (ev.value / totalRecebidoPedido) : 0;
        porBucket[key].custo += fatiaCusto;
      });

      (o.extraCosts || []).forEach(c => {
        const costAmount = Number(c.amount) || 0;
        if (costAmount <= 0) return;
        const d = c.date ? new Date(c.date.includes('T') ? c.date : `${c.date}T12:00:00`) : new Date(o.createdAt);
        if (isNaN(d.getTime())) return;
        if (d < inicioPeriodo || d > fimPeriodo) return;

        let key = format(d, 'dd/MM');
        if (analisePeriodo === 'ano' || (analisePeriodo === 'personalizado' && diasNoPeriodo > 62)) {
          key = format(d, 'MM/yyyy');
        } else if (analisePeriodo === 'hoje' || analisePeriodo === 'ontem') {
          key = format(d, 'HH:00');
        }

        if (!porBucket[key]) porBucket[key] = { faturamento: 0, custo: 0 };
        porBucket[key].custo += costAmount;
      });
    });

    comissoesLancadas.filter(c => !c.origemNotaId).forEach(c => {
      const d = new Date(`${c.data}T00:00:00`);
      if (isNaN(d.getTime()) || d < inicioPeriodo || d > fimPeriodo) return;

      let key = format(d, 'dd/MM');
      if (analisePeriodo === 'ano' || (analisePeriodo === 'personalizado' && diasNoPeriodo > 62)) {
        key = format(d, 'MM/yyyy');
      } else if (analisePeriodo === 'hoje' || analisePeriodo === 'ontem') {
        key = format(d, 'HH:00');
      }

      if (!porBucket[key]) porBucket[key] = { faturamento: 0, custo: 0 };
      porBucket[key].custo += c.valor;
    });

    const linhaGrafico: { day: string; faturamento: number; lucro: number; custo: number }[] = [];
    if (analisePeriodo === 'ano' || (analisePeriodo === 'personalizado' && diasNoPeriodo > 62)) {
      const startYearMonth = new Date(inicioPeriodo.getFullYear(), inicioPeriodo.getMonth(), 1);
      const endYearMonth = new Date(fimPeriodo.getFullYear(), fimPeriodo.getMonth(), 1);
      let curr = new Date(startYearMonth);
      while (curr <= endYearMonth) {
        const key = format(curr, 'MM/yyyy');
        const v = porBucket[key] || { faturamento: 0, custo: 0 };
        linhaGrafico.push({ day: format(curr, 'MM/yy'), faturamento: v.faturamento, lucro: Math.max(0, v.faturamento - v.custo), custo: v.custo });
        curr.setMonth(curr.getMonth() + 1);
      }
    } else if (analisePeriodo === 'hoje' || analisePeriodo === 'ontem') {
      for (let h = 7; h <= 21; h += 2) {
        const hourStr = `${h.toString().padStart(2, '0')}:00`;
        const v = porBucket[hourStr] || { faturamento: 0, custo: 0 };
        linhaGrafico.push({ day: hourStr, faturamento: v.faturamento, lucro: Math.max(0, v.faturamento - v.custo), custo: v.custo });
      }
    } else {
      const maxPoints = Math.min(diasNoPeriodo, 45);
      const step = Math.max(1, Math.ceil(diasNoPeriodo / maxPoints));
      for (let i = 0; i < diasNoPeriodo; i += step) {
        const d = new Date(inicioPeriodo);
        d.setDate(inicioPeriodo.getDate() + i);
        if (d > fimPeriodo) break;
        const key = format(d, 'dd/MM');
        const v = porBucket[key] || { faturamento: 0, custo: 0 };
        linhaGrafico.push({ day: key, faturamento: v.faturamento, lucro: Math.max(0, v.faturamento - v.custo), custo: v.custo });
      }
    }

    return {
      periodo,
      mediaDiariaPeriodo,
      ticketMedioPeriodo,
      margemLucroPeriodo,
      produtosMaisVendidos,
      vendasDoPeriodo,
      extratoRecebimentos: extratoMovimentacoes,
      totalEntradasExtrato,
      totalSaidasExtrato,
      saldoCaixaExtrato,
      linhaGrafico,
      inicioPeriodo,
      fimPeriodo,
      diasNoPeriodo
    };
  }, [realSales, inventory, analisePeriodo, analiseCustomRange, analiseClassificacao, comissoesLancadas]);

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

      <Modal isOpen={isRevenueModalOpen && !!user?.isAdmin} onClose={() => setIsRevenueModalOpen(false)} title="An√°lise Detalhada de Performance" size="xl">
         <div className="space-y-4 p-1 sm:p-2">
            {/* Seletor de periodo e atalhos */}
            <div className="space-y-2">
               <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 flex-wrap gap-1">
                     {[
                       { id: 'hoje', label: 'Hoje' },
                       { id: 'ontem', label: 'Ontem' },
                       { id: 'semana', label: 'Semana' },
                       { id: 'mes', label: 'M√™s' },
                       { id: 'ano', label: 'Ano' },
                       { id: 'personalizado', label: 'Personalizado' },
                     ].map((p) => (
                       <button
                         key={p.id}
                         onClick={() => setAnalisePeriodo(p.id as any)}
                         className={cn(
                           "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                           analisePeriodo === p.id
                             ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                             : "text-white/60 hover:text-white hover:bg-white/5"
                         )}
                       >
                         {p.label}
                       </button>
                     ))}
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/10 rounded-xl text-[11px] text-white/70">
                     <Calendar className="w-3.5 h-3.5 text-primary-400" />
                     <span>
                        {safeFormat(analiseDetalhada.inicioPeriodo.toISOString(), 'dd/MM/yyyy')} at√© {safeFormat(analiseDetalhada.fimPeriodo.toISOString(), 'dd/MM/yyyy')}
                     </span>
                     <span className="text-[10px] text-white/40 font-mono">({analiseDetalhada.diasNoPeriodo}d)</span>
                  </div>
               </div>

               {/* Barra de periodo personalizado quando selecionado */}
               {analisePeriodo === 'personalizado' && (
                  <div className="p-3 bg-white/[0.02] border border-primary-500/20 rounded-xl flex items-center justify-between flex-wrap gap-3 animate-fadeIn">
                     <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                           <span className="text-[11px] font-bold text-white/60">De:</span>
                           <input
                             type="date"
                             value={analiseCustomRange.start}
                             onChange={(e) => setAnaliseCustomRange(prev => ({ ...prev, start: e.target.value }))}
                             className="bg-black/40 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white focus:border-primary-500 outline-none"
                           />
                        </div>
                        <div className="flex items-center gap-1.5">
                           <span className="text-[11px] font-bold text-white/60">At√©:</span>
                           <input
                             type="date"
                             value={analiseCustomRange.end}
                             onChange={(e) => setAnaliseCustomRange(prev => ({ ...prev, end: e.target.value }))}
                             className="bg-black/40 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white focus:border-primary-500 outline-none"
                           />
                        </div>
                     </div>

                     {/* Atalhos rapidos de data */}
                     <div className="flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() => {
                            const now = new Date();
                            const past = new Date(); past.setDate(now.getDate() - 7);
                            setAnaliseCustomRange({ start: format(past, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') });
                          }}
                          className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white/70 cursor-pointer"
                        >
                          √öltimos 7 dias
                        </button>
                        <button
                          onClick={() => {
                            const now = new Date();
                            const past = new Date(); past.setDate(now.getDate() - 15);
                            setAnaliseCustomRange({ start: format(past, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') });
                          }}
                          className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white/70 cursor-pointer"
                        >
                          √öltimos 15 dias
                        </button>
                        <button
                          onClick={() => {
                            const now = new Date();
                            const past = new Date(); past.setDate(now.getDate() - 30);
                            setAnaliseCustomRange({ start: format(past, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') });
                          }}
                          className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white/70 cursor-pointer"
                        >
                          √öltimos 30 dias
                        </button>
                        <button
                          onClick={() => {
                            const now = new Date();
                            const start = new Date(now.getFullYear(), now.getMonth(), 1);
                            setAnaliseCustomRange({ start: format(start, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') });
                          }}
                          className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white/70 cursor-pointer"
                        >
                          Este M√™s
                        </button>
                        <button
                          onClick={() => {
                            const now = new Date();
                            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                            const end = new Date(now.getFullYear(), now.getMonth(), 0);
                            setAnaliseCustomRange({ start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') });
                          }}
                          className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white/70 cursor-pointer"
                        >
                          M√™s Anterior
                        </button>
                     </div>
                  </div>
               )}
            </div>

            {/* Cards de M√©tricas do Periodo */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
               <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                  <span className="text-[9px] uppercase font-black text-white/40 tracking-wider">Faturamento</span>
                  <p className="text-base font-black text-primary-400 mt-1">
                     R$ {analiseDetalhada.periodo.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[9px] text-white/30">{analiseDetalhada.periodo.count} vendas</span>
               </div>
               <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                  <span className="text-[9px] uppercase font-black text-white/40 tracking-wider">Lucro L√≠quido</span>
                  <p className="text-base font-black text-emerald-400 mt-1">
                     R$ {analiseDetalhada.periodo.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[9px] text-emerald-400/80 font-bold">{analiseDetalhada.margemLucroPeriodo.toFixed(1)}% margem</span>
               </div>
               <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                  <span className="text-[9px] uppercase font-black text-white/40 tracking-wider">M√©dia Di√°ria</span>
                  <p className="text-base font-black text-white mt-1">
                     R$ {analiseDetalhada.mediaDiariaPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[9px] text-white/30">por dia analisado</span>
               </div>
               <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3">
                  <span className="text-[9px] uppercase font-black text-white/40 tracking-wider">Ticket M√©dio</span>
                  <p className="text-base font-black text-amber-400 mt-1">
                     R$ {analiseDetalhada.ticketMedioPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[9px] text-white/30">por venda</span>
               </div>
               <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 col-span-2 sm:col-span-1">
                  <span className="text-[9px] uppercase font-black text-white/40 tracking-wider">Saldo Caixa</span>
                  <p className={cn("text-base font-black mt-1", analiseDetalhada.saldoCaixaExtrato >= 0 ? "text-emerald-400" : "text-rose-400")}>
                     R$ {analiseDetalhada.saldoCaixaExtrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[9px] text-white/30">entradas - sa√≠das</span>
               </div>
            </div>

            {/* Grafico + Classificacao Personalizada de Produtos */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
               {/* Grafico Linha do Tempo */}
               <div className="lg:col-span-7 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                     <h4 className="text-[10px] font-black uppercase text-white/50 tracking-widest">
                        Evolu√ß√£o Financeira no Per√≠odo
                     </h4>
                     <div className="flex items-center gap-1.5 text-[9px] font-bold">
                        <button
                          onClick={() => setShowLinhaFaturamento(!showLinhaFaturamento)}
                          className={cn("px-2 py-0.5 rounded-full border transition-all cursor-pointer", showLinhaFaturamento ? "border-[#4cc9f0] bg-[#4cc9f0]/10 text-[#4cc9f0]" : "border-white/10 text-white/30")}
                        >
                          ‚óè Faturamento
                        </button>
                        <button
                          onClick={() => setShowLinhaLucro(!showLinhaLucro)}
                          className={cn("px-2 py-0.5 rounded-full border transition-all cursor-pointer", showLinhaLucro ? "border-[#34d399] bg-[#34d399]/10 text-[#34d399]" : "border-white/10 text-white/30")}
                        >
                          ‚óè Lucro
                        </button>
                     </div>
                  </div>
                  <div className="h-56 w-full">
                     <ChartErrorBoundary fallback={<div className="h-full flex items-center justify-center text-xs text-white/40">Erro ao carregar gr√°fico</div>}>
                        <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={analiseDetalhada.linhaGrafico} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                              <XAxis dataKey="day" stroke="#ffffff30" fontSize={9} tickLine={false} />
                              <YAxis stroke="#ffffff30" fontSize={9} tickLine={false} tickFormatter={(v) => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '11px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                                formatter={(value: any, name: string) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, name === 'faturamento' ? 'Faturamento' : 'Lucro L√≠quido']}
                              />
                              {showLinhaFaturamento && <Line type="monotone" dataKey="faturamento" stroke="#4cc9f0" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />}
                              {showLinhaLucro && <Line type="monotone" dataKey="lucro" stroke="#34d399" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />}
                           </LineChart>
                        </ResponsiveContainer>
                     </ChartErrorBoundary>
                  </div>
               </div>

               {/* Ranking e Classificacao Personalizada de Produtos / Servicos */}
               <div className="lg:col-span-5 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex flex-col space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                     <h4 className="text-[10px] font-black uppercase text-white/50 tracking-widest">
                        Classifica√ß√£o de Produtos
                     </h4>
                     {/* Classificacao personalizada toggle */}
                     <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
                        <button
                          onClick={() => setAnaliseClassificacao('faturamento')}
                          className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all cursor-pointer", analiseClassificacao === 'faturamento' ? "bg-primary-500 text-white shadow" : "text-white/40 hover:text-white/70")}
                        >
                          Faturamento
                        </button>
                        <button
                          onClick={() => setAnaliseClassificacao('qtd')}
                          className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all cursor-pointer", analiseClassificacao === 'qtd' ? "bg-primary-500 text-white shadow" : "text-white/40 hover:text-white/70")}
                        >
                          Qtd Vendida
                        </button>
                     </div>
                  </div>

                  {/* Busca no ranking */}
                  <div className="relative">
                     <Search className="w-3 h-3 text-white/30 absolute left-2.5 top-1/2 -translate-y-1/2" />
                     <input
                       type="text"
                       placeholder="Filtrar produtos ou servi√ßos..."
                       value={analiseProdutoBusca}
                       onChange={(e) => setAnaliseProdutoBusca(e.target.value)}
                       className="w-full bg-white/5 border border-white/5 rounded-lg pl-7 pr-2.5 py-1 text-[10px] text-white placeholder:text-white/30 outline-none focus:border-primary-500/50"
                     />
                  </div>

                  {/* Lista de Ranking */}
                  <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar max-h-[195px] pr-1">
                     {analiseDetalhada.produtosMaisVendidos
                       .filter(p => !analiseProdutoBusca || p.name.toLowerCase().includes(analiseProdutoBusca.toLowerCase()))
                       .length === 0 && (
                        <p className="text-[10px] text-white/30 text-center py-8">Nenhum produto encontrado.</p>
                     )}
                     {analiseDetalhada.produtosMaisVendidos
                       .filter(p => !analiseProdutoBusca || p.name.toLowerCase().includes(analiseProdutoBusca.toLowerCase()))
                       .map((prod, idx) => {
                         const maxTotal = analiseDetalhada.produtosMaisVendidos[0]?.total || 1;
                         const maxQty = analiseDetalhada.produtosMaisVendidos[0]?.qty || 1;
                         const percent = analiseClassificacao === 'faturamento'
                           ? Math.min(100, Math.max(5, (prod.total / maxTotal) * 100))
                           : Math.min(100, Math.max(5, (prod.qty / maxQty) * 100));

                         return (
                           <div key={prod.name} className="relative bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-2 transition-colors overflow-hidden">
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-primary-500/10 transition-all"
                                style={{ width: `${percent}%` }}
                              />
                              <div className="relative flex items-center justify-between gap-2">
                                 <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-[10px] font-black text-white/60 shrink-0">
                                       #{idx + 1}
                                    </span>
                                    <span className="text-[11px] font-bold text-white truncate block">
                                       {prod.name}
                                    </span>
                                 </div>
                                 <div className="text-right shrink-0">
                                    <span className="text-[11px] font-black text-primary-300 block">
                                       R$ {prod.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[9px] text-white/40 font-mono">
                                       {prod.qty.toFixed(prod.qty % 1 === 0 ? 0 : 2)} un.
                                    </span>
                                 </div>
                              </div>
                           </div>
                         );
                       })}
                  </div>
               </div>
            </div>

            {/* Extrato de Caixa Completo com Busca e Filtros */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 space-y-2.5">
               <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-white/50 tracking-widest">Extrato de Movimenta√ß√µes do Per√≠odo</h4>
                    <p className="text-[9px] text-white/40">Recebimentos de clientes e despesas / compras de materiais / comiss√µes</p>
                  </div>
                  <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
                    <button
                      onClick={() => setExtratoFiltroTipo('todos')}
                      className={cn("px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer", extratoFiltroTipo === 'todos' ? "bg-white/20 text-white shadow" : "text-white/40 hover:text-white/70")}
                    >
                      Todos ({analiseDetalhada.extratoRecebimentos.length})
                    </button>
                    <button
                      onClick={() => setExtratoFiltroTipo('entradas')}
                      className={cn("px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer", extratoFiltroTipo === 'entradas' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-white/40 hover:text-white/70")}
                    >
                      Entradas (+)
                    </button>
                    <button
                      onClick={() => setExtratoFiltroTipo('saidas')}
                      className={cn("px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer", extratoFiltroTipo === 'saidas' ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "text-white/40 hover:text-white/70")}
                    >
                      Sa√≠das (-)
                    </button>
                  </div>
               </div>

               {/* Busca no extrato */}
               <div className="relative">
                  <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar movimenta√ß√£o por cliente, descri√ß√£o ou valor..."
                    value={analiseExtratoBusca}
                    onChange={(e) => setAnaliseExtratoBusca(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary-500/50"
                  />
               </div>

               {/* Resumo Caixa */}
               <div className="grid grid-cols-3 gap-2 bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-center">
                  <div>
                    <span className="text-[8px] uppercase font-bold text-emerald-400/70 block">Total Entradas</span>
                    <span className="text-xs font-black text-emerald-400">R$ {analiseDetalhada.totalEntradasExtrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-bold text-rose-400/70 block">Total Despesas / Custos</span>
                    <span className="text-xs font-black text-rose-400">R$ {analiseDetalhada.totalSaidasExtrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-bold text-white/40 block">Saldo L√≠quido Caixa</span>
                    <span className={cn("text-xs font-black", analiseDetalhada.saldoCaixaExtrato >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      R$ {analiseDetalhada.saldoCaixaExtrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
               </div>

               {/* Lista de movimentacoes */}
               <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                  {analiseDetalhada.extratoRecebimentos
                    .filter(m => extratoFiltroTipo === 'todos' || m.tipo === extratoFiltroTipo)
                    .filter(m => {
                      if (!analiseExtratoBusca) return true;
                      const q = analiseExtratoBusca.toLowerCase();
                      return m.description.toLowerCase().includes(q) ||
                        m.customerName.toLowerCase().includes(q) ||
                        (m.details && m.details.toLowerCase().includes(q)) ||
                        m.value.toString().includes(q);
                    })
                    .length === 0 && (
                    <p className="text-[10px] text-white/30 text-center py-6">Nenhuma movimenta√ß√£o para os filtros selecionados.</p>
                  )}
                  {analiseDetalhada.extratoRecebimentos
                    .filter(m => extratoFiltroTipo === 'todos' || m.tipo === extratoFiltroTipo)
                    .filter(m => {
                      if (!analiseExtratoBusca) return true;
                      const q = analiseExtratoBusca.toLowerCase();
                      return m.description.toLowerCase().includes(q) ||
                        m.customerName.toLowerCase().includes(q) ||
                        (m.details && m.details.toLowerCase().includes(q)) ||
                        m.value.toString().includes(q);
                    })
                    .map((rec, idx) => {
                     const isEntrada = rec.tipo === 'entrada';
                     const methodLabel = rec.method ? (EXTRATO_PAYMENT_LABELS[rec.method] || rec.method) : null;
                     return (
                       <div key={`${rec.saleId || 'avulso'}-${idx}`} className={cn("flex items-center justify-between gap-2 border rounded-xl px-3 py-2 transition-colors", isEntrada ? "bg-white/5 border-white/5" : "bg-rose-950/20 border-rose-500/20")}>
                          <div className="flex items-center gap-2.5 min-w-0">
                             <span className={cn("w-2 h-2 rounded-full shrink-0", isEntrada ? "bg-emerald-400" : "bg-rose-400")} />
                             <span className="text-[10px] font-black text-white/70 shrink-0 tabular-nums">{safeFormat(rec.date, 'dd/MM HH:mm')}</span>
                             <div className="min-w-0">
                               <span className="text-[10px] font-bold text-white truncate block">{rec.description}</span>
                               <span className="text-[9px] text-white/40 truncate block">{rec.details}</span>
                             </div>
                             {methodLabel && <span className="text-[8px] font-black uppercase text-primary-300/80 shrink-0 bg-primary-500/10 border border-primary-500/20 px-1.5 py-0.5 rounded">{methodLabel}</span>}
                          </div>
                          <span className={cn("text-[11px] font-black shrink-0", isEntrada ? "text-emerald-400" : "text-rose-400")}>
                            {isEntrada ? '+' : '-'} R$ {rec.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                       </div>
                     );
                  })}
               </div>
            </div>

            <Button className="w-full h-11" onClick={() => { setPendingGoToHistorico(true); setActiveTab?.('pos'); setIsRevenueModalOpen(false); }}>
               Ver Todas as Vendas no PDV
            </Button>
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

  // Carrega item vindo do Motor de Precifica√ß√£o (se houver)
  useEffect(() => {
    try {
      const savedItemJson = sessionStorage.getItem("rpro_pos_item_precificado");
      if (savedItemJson) {
        sessionStorage.removeItem("rpro_pos_item_precificado");
        const item = JSON.parse(savedItemJson);
        if (item && item.name) {
          const newItem: SaleOrderItem = {
            productId: "prec-" + Date.now(),
            name: item.name,
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
            dimensions: item.width && item.height ? `${item.width} x ${item.height}` : undefined,
            area: item.area ? Number(item.area) : undefined,
            observacao: item.observations,
          };
          setCart(prev => [...prev, newItem]);
          setActiveTab("venda");
        }
      }
    } catch (e) {
      console.warn("Erro ao carregar item precificado no PDV:", e);
    }
  }, []);
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
            supabase.from('orcamentos').uxúÏΩÀr‹Hñ(∏ÔØåŒ.FT2ÇO)ïLä2ä§2e#âlí©™iµLB@*@$Ä‡#Y4≥Yå›’›ÃjV””ã≤∫fe6v€z3ÀÀ?π_2Áw‹Ó "H)≥™;,Så¿√«è?Ô3ıΩ<Ëﬁ∞0&ŸyiæÃÚ$˜¢eÊŸ(âÛdãe^ÏákÁoΩh∞?˛ë≠≤€ﬁ ¯©ª˙KÀ,Ù{«äOØ˜mÒÎˆÔäØ–\ñ≥Ÿ;ıS?H∑ÿ	¥M_ŸSv£41?Ã√¯¸≈,äËâeÂˆhñÂ…$H_˙0º 
F–‚û∏ˆl˙8BÛ˝A˘í≠©7ﬁ$∞5√ı⁄ÊE[ÉG„$∂∂8≈µM“´jõbÅﬁXpëﬁ´˜¯z)|u≠À7ã˝‡,å~ry◊ì Œ∑x≥Gﬁy¢>ë£ º|—¥ıô)oÜ;ıŒ=¸öd/¬ÿ≥?y⁄≥YÓÂ3x2N.@?a€Oµû±•Q2ôF¿mâm±•i˚ ©%ı›dòÈÖ7Jh A¯ñWúsÃF„¿üEÅˇ"ÙãíëÌ>Ê·$8M^fIW}†g]%ı	g?£4@4ﬂHäˆ‰ò^\2Ï∂kﬁÎÚ‰Â…·Iû¬’nèmYêD>´v'vvW¥m¥U>~[nœ,»_yYéÎÖ?ãmŸU˜®≤óWVÿqÄêé=6"è¡Sﬁ 8I=@/Çü,OΩ8Û`ïY∑gè˝œˇÌˇ§yx)õM<XÌ˛Åg¸‡"P[üÃ|x$õAÛIÜ∏`L‚$JŒ·º∆∆!lê4%uªQÑt$˚ûÓ^wßip¡ûÓ0¸;òx”nÜø2§Oü>≠BÆ?”ËÄ=Î≤$Õª]oô{¯~◊aπΩ¡yêüÓ¿RıÀ'<Î*YÑQ”êOﬂ{®ÎÕøÃNf£QêeØ°ãËvP7OgÅ˘êÿÔÂCg^îO˝wc¯¶?≤T©˚ÓΩ1CÉÙYﬁ›ƒÄ§AViaø§H›U£qevóñÙõá9®<pb≈JÛ /„È,∑6˚`≥;ùFa‡õM{[m·€|4f› 2‰≈◊=Â¯√É2âÇ‹√π¿{˘lËÒÓOwˇö‡v√ù¥Á/<©ˆ=N.w£ V‰„|,	qCewπ"Ÿåó1/ É‘É∆˛IËó7– ≥¡P∆;ßCb	 Åq0
˝dÈˆc9Ò7ÚYÛ´‚¥á≠¸è3⁄Ó˚¡0D»<èyÏhπ«˛‡±‡
ˆ+¨l¿Ç	\˝zÇ˝D‚¬£∆¬3÷hÊ¿íS§Tú£¿√„TûD¿Gx@‹ø>ÚBƒç|5`_±‡Ï∞N/ÁËÕo+Ú”Ë){ÌÂcÿíW›’ey≤—^°◊pœ´ù∞ ¸ê·d#ò¢«ˆ_ûÓÓÔ≤Ó4Å9–À£†0äf ZñÃàûäUÒΩﬁ2—HŒ∂È3◊∏°ç’<ca»ÔJÊIL5{√X&¶ Ñ˜r‡yzm bŒnh\Ñdp‡›"Ñ/Ω0:=ıÜ^Œ“d“]¢uÕñzNò∫*;Gå¬VÄ6∂Â√EﬂÇƒdY>L%œ¢-Üçoëm;t3/≈∂àkr–&A>N|µ≠j™+îöì @∆¿E¡ñ|8kÀ⁄h€™¬◊òàÁÉ◊é…PƒΩú+Ó*D∑9aXèÂ„4π‰Ë¶ﬂˇÇ6ˇ¢ >œ«tBÆ óp\úl®}‹X±§ÅAåÏ≠NZØ†I)Ò'≈÷Ãù4ò$bWä	/\í4 -gY‚êû∑oò.ﬂh@YfÓñ˚1˘˙>`ñÛ÷∂aÿ}ˆk∑›òµ[3Ìıò]ÜUÒªéá.øΩ+œ¬®?∂‚D§iMË<Ï"·á“48«c$˜Ü»oáp3LÅˇ|Ü<1Ïÿ i‡ù·¿Õx[YOÌoqû˝'~à˚tà◊pÏv~›óú˛ÒÌ&˘u3ÌmF˚…8ˆµs€˝+ÊÃè,«ﬁÁfﬂ·ŒÂ^π˚3qºs2Â∞œa§–@Rí¬á‚…Â®s†@£î•Éc	òÖQOAö»KœÄzo±ÆØ>¯º¥Ñ›Á◊” 9cïõ»%ÒÚõŸdH•<%Qùc4¬Á«¡ƒcxœ‡≥s¡[õ£’⁄êG«)ú:Å}"Ôﬁ£≈ŒÚ~[à*'B¥b b ûú-f ˛˘ÕXîY6Û“	ˆ(â∆¡ådîíñNºx&®∑l∂;Ú&”D;ªz∂Od8E_“}$ﬁ•80ı“Q≥ÔvbUºN0°ÆdÀ|!º{Ó≈cê	`0⁄‡ΩÏj/zKåŒ:pp4¯¡4æ≠}=^¶Vãy…¶ëeJÅ&N $∞Ñ¨ﬂ/X°Å|?à †È5N }õπ8s‡yC!ê≥4á	„vÑñ*òÅÃ0ºœq∫†Ωù∏ï»!∞‘·˛á/op`É8πÏˆn?JNyÿ◊®?]ÓÒ+R{º£ıfQ^ÓM*gÛπ&}Ú“<Ï”û{—hB—óK›´©z‚ 5Óœ‹_Àı–x?◊cSïD≥-cÉ˜-‰}ÀæÏ52P1/Ñ*ìî,©é\œJ˘—í;-VÆTŸ6â7:C™Ì‘€´™9≈Vh“6ÿ—'B÷¶Î0l`°Ì[‹ıtFÚ„)Œi§*«´R¸ñ˛‚qêé∑Ì˘Àäh/±˝CLËû‘XFäGßµÜëÚ±xõÙ£º'D$~œ∞ÄË:˛à_Eﬂ™VÄ?™a˘∞)ØÛá≠{†y∏’ ÛÓª6@Ó >H˛Kπ´k
í“#èß#~}@:úËè»ˆäk/˝Ís+nK¬ ¿DA©L®W%h 0ﬁ≤!
©v‡s/ºÚ ’#Œ 0E08¨·¸ÜCöpïŒs‘Ähê¯π	ríD	â[À,<èë_ÄÁ„ sëŸ
1a!¥°»ÜÏA0°¢ Ç&è`#Ü∞!=\ÓR_
?uç™SèXäüóÈÃÁ¬9J`Ä∆Ç5@Å1ÒΩÆ¥‹≈”fp¢¬£KÌÇDÉ4£QK˜õﬂòWæ@ê3@@"PÚ≤Îxƒ®í¬Lç‚Oπœ¡˙î∑ÖWgì‰@Ä‘)"ˇ<≥>˝[~ıßôÁa~≠<ø≈á0 ÙÚe˙nºjøÆ]ßù8gíﬁ›§R.˝RÅüKbKÄÒé~\f§ÉJ"ÔÉ¿¢eòkò/©÷tæ“Îapb 9GÛrD∞.≈èÅŸÅîÀâöôùOO<Ñ¨)∞Ç»E	^iPùÒs´ﬂV⁄Aê\ù£7{Ë(–Sõ©"‰;Â.´Åµ‘93m†[⁄ên› ^ÆÎŸ_‹<DÎ$Dmá!ˇàQÂ”ªYv<'xv“≥±·LÄü<úÇ(∏îy¿Ò/ô79Œ˙û-Hòöœ ~Ò ıDî√UÏ6Ó?‰õ‡p°»x‡•KÊ∂Zö¸èˇN’,^ÍıÃæ'	à^8|‚!*√OÉ≥ ÷D`◊è∏æˆÔøºgæ?»¢pt˚Oê˚a:“=XïëØ¬·É'∞lÀDªöw@ó/)(£øp´MN’á‹áRO=:NUøwÑâ ŸIz˜'NèóArÑshtyÖìÑÌ%Ò(ö›˝ Ç™8~Z}Gñ!Âò´≠Hü’M›VäUú’⁄>í…17P¡Æ°âpƒVª@ëI›\ïAÈöóWÊm]˚t´C¿!•<∏@!™l@ƒùf†R>V@‹Æ∂ÄıMFhÆ™G>?EcÃ•≠§l=#u5pÔHœx*#ÚÀ∂P?s?”âr´ø@=3J»∫ôä£úw I6ö*#ŸLÁnÏwª#°pÇcsTÍı.—ÑÚl@-}ê —I≤u• ıuVŸ“à∂2“~uv=√¬Sa9ö(Ò¸]e™›ä¬Ja}~xu∞≈v£KÔ:"†Azt`ÂW@∞¬∞cÿÿÀÿ–ãºx∞√cñMÉQxé∏Ë†â?§hÂ%ﬁCUÚ:åß‡t4…ÉH1PùW…•§:@Òa+¯®¥zq§KtŒÒêö»!Ω7«k»iáwÇ˜ƒK%ôAå4Ácj‘£T…ÇÁ˚˚…®;J"\ 0âª˛pôÒæGà4ÀÎP£A—¸¥êñø,$&˝&G…z¡ FW∫%ÌdcÊçƒëÜ∏æøº	&Ôˆä·OÑ˚Ì«ﬁ‡Iwëó4"/©†C*#Ön)°Q((•:v<U†?x 8ˇ	»Á=áÀ$jW˚w{¥ô∫”à´(9–¿úLπr¨<Õ˛ï› ¡tóP«F¢∆â¿GvNÁ—`…ÿœ™˛\˜÷pªµ’’’Ê‚$@◊T9eìÄ≥üπ•#Q¨m|(Rë≤Îá#¿È“≈¸	˘õ∂∑YÜ«qËØ c "¿+Ãÿ–f.œ¡Œ%ΩB[HbÖπ.mcØãAÚû‡·VX∆pe≤Q©‡Aˇ:]_{”¿Cè™Ê§â~[Ç«~‚õm¿ã∞∏†KÆø%ó∞∆0˜Œlê|Jn…	Ωnå‡˛>˘J•6≠î¡Âm4ÉüÃ‡LÄG¸ß	Ú≈ÀfﬂäπéÌ<UöTIõ›d◊f∑
Ó<•∆1ÑÏæ*pÇ[mÈ:°+ì)ph5Ë†&∫ËÙ®ÑÁd≥@ç"@¿¥ûû!: °ÿüá)Ÿf…d¿IéÜ¡Ñs8‹Ëzê{Sèì{(€ç˚ :UyÄØP9%ÅOà„„NWÿ$P	d}—<K„Á˙}ª1€ÑóÄR£—≤Ÿ`)«|¿≥DØŸpñ≥É`Zh—¥√Ú1Aª°öíËÆá”d≠Â—i≥tY›∆zÀbT´tãk|˘÷yf/q–ã`û-s8Wﬂ√Œöe¡Iéõ£)oÑkl_ÑQ@c;Œ‡È„¿Âx~n˙˙›;àœé‰¬ˇN¯⁄ÑŸ1%h∞hrSqÀ"Îä]≤Ìápà{YÜgˆ”Œ∏ˇP‘][]Ω˜ü§¡§˜ûùE¡g…˙#§±)˚¨lxv-zq8ÅYÙ√Ÿßø?'…˛ˆøyƒ¸YÍ!?“¥∫⁄Ÿ)∂ˆˆwÿ-¨æØ x◊˛e‚≥À˛ÃáM˚k´∞!ÆrŸW6ıFAˇ∫ˇXi™:èÀ˛˙*„?√Ûæá Ï}e]¥U\aiÇí≤ﬂ∑±>Ωj1’…Uuâl24F c Û^òé@ …`Û=ΩŸ\Ωe+⁄8W`†⁄ÖÒ∫:n›˙U[&Œ˚√$Ú˘Ä/«!JP©7˙®_âŒJ QèÄ€ÏÏÏë>Ó*
˝d{eºÆvr8ÉrN∂ÎO`mûÀ/∆†œ.L+c¢¨l
¯eìŒŒ›ÅÉ∑Û›ø âÙÜià∫ Ñ4´D“π´*«g§µ~Ë∂W¶ï.üœÚ<âı5$˜◊6yØ—yá%Òé?>ΩÈíàEK≈sNΩnwvi8*ª(nØå5”VÒh⁄@b˙Ö…º‰‡≈#è4, > œ“!wﬁ˝◊ƒ-LΩ€rÔ¨õG>°`'I%E√aØI√{Çö]\πÜW—ÓÚ≥ Æ¢°L9‹ñ(> }tÈk∂<IeÍoQÒ¥•vÓå,£¶?‡ùxÇÖÅÜªJG¿√QA"Å¬	Ô ∑ﬁç®Üªíù3 ÷<ÕœˆΩk+UﬁÆe°t®òü–ÒgduWÊá∆™ÏH◊n¡!Ç™#V:R"£Z< OKHé$s¬`(B$ú9"õHœäÚ≈zÙ∞h€Aà;Ó.°lÿqÿ:‚RjáH¨ÄÁà´g≥nWÎS¡îÓ¥‘…(Í^‘ÉM5yñAßÜwîêÓuÄMY§CîÔ§æu:¡∫»ïÏ™Iè⁄≈ìç|˘0™wOØß‘-©z…Ig≤æD˙⁄uW’Aò{tª¸aºΩT®ÇÖ∫7Ãïô†ñ’¯~ˇ@ZúÆ ´Úl‰•Áp®'QÇèãüR¯}STØ[˝¨0¶Ö-≥ÀˆQævöæä9°–œ˙≠@Ωn¿mOŸ∏’Ä˛Q®Gπ_•4:óH∆ËHâæ…¶#YÈF∂dãÌ(_‰*Õ{§·Æ(≈UAá¡ºWàÏ∑‹Ω#*â¥F»UV˝÷`T˘±¿π“∑øY∞ú„‹É'œÉ √yïÌTéÈ£Fç†;@?ëTŸ≥¡ª’˜•º˚^Ïinn6π˛ŒŒŒHòÊ§õÄÔ]?ß]Éß…%û&p÷fo˛˜Qv’Â≠h"+>ixß+©≤ÄA<F72a∏˚ó}∫
/u4‚≤iÃ1»v4úÖ©pG	Õ¬hˆM¢rÄÌwˇøÄ*‰…@uvT°Tj\/:TŒ¬ºh–HÌRÉÃ..-ù÷pyj4xih13]$ú^R[Wıx —ª´DN¬øëö0
gPÔ›¬Fø)m=∑=H‘Œ8l1Ó¯¯Ö±wEÍo8”ÒgƒöUΩç!“Ç`Ò·÷˙jqÂ‹.y˜–+g[Æê¿'ºˆ’”Ú}ã}-fÑß¸=nAóÒEÂΩ™â{N j◊∞F!º.T=±
9Ω&'S™Y tF{è`QÏ<ñúÒWı∆ç—o·£ÛÕ#Uÿør&≤ùû∂‹ÉÈ,w?~y∑⁄æ†É=*ÖçeÈùwe+“ÅWÒ‘Âöµ°5ıëíeø5ˆ/éRõ 8;.r√Vz∫Â›v≥âhzÙcœÒ?«_ﬁXV^xs˜ø‚˙xìÚ›l´Ú«<‡F◊V•~˝ü„•ﬁ≠µy˜™‘?˛sõïlÇjW˚£}xÙˆ#Ú öÔ≥âCsNù‘zBœˆÖÈR]„Ó8√E”B±ùπœqõ;∏|y^p«inãzƒ bRU_$ÃûEó$Ô»[ã°s∏…"hz¢™ñà$s`¨˙„˛ªG´´ÖÍˇÈ√ëÜjó,Bù–7´´+èJ=À09®¢∏$-«ê8}ÒGH÷ÄF…EêûEÃ8Ù˝ ∂Èó 9ÈK©B?œ«yﬂ°j∫ÒpùNÕo~£¯8-eØ™Öl˘.Òˆ/}@ñÄ¿ånÜ”¸˘ıKﬂÚ–∑\PîóÖn÷˜ˆVÈ±ÈÕ(÷ù≥*·Ùùˆ7üﬁ&˚πˇNõ˜öNK®!8¨–\qy£•ÇÇMØ 4”Î˛F±
Î˙2(’· ªØ*≈ŒΩ)¥∆uu•¬„
√l≤≈ÔeìéÓÉQÅêå`#»Î˝iR„c\˛≠béõ0Gè ∂2Ë
g…CûBZiÿ- %ùé]S¢©{∂≥©ß©ò]◊:;
ä¥~{ü÷ﬁø©j{o\ ◊~å´$kèo’~≤1p?ˆW;leÁV—ê´ΩJ‹Ú¿%Sn1∂ÄÃπN§∫≠Ë®¥≠«·©_ó[éÙ£M‡ãëu3÷¢¯ŒˆÔï©≠ÏlØuö¶⁄,V‡fÂ∑Ï‘≤7ﬁE»Á¡~ª"oöt•$!ó©7≈°qí’¿àUgà∞è~“∏ &3¨´&w‰óPïrnE®:*«ƒ˚ÊxC`Xiy≤%/ëˆESﬂË>q7§áêÓU Z`∑óNÉtBA„o≈çéã-v2N¶S8û{ÁÏvŸ÷PaêTCM’›øëïÚ7l6UîlR®±ÕIwπ≤1Èe∂¬é§ˆF6ı<πr4√-˙Ù®lG°À◊áûdcGäõSŸ∆a·tU∂Ç›…Sd„ xq{s\F”[€SÆïmù¬∆qGƒ˛´ç\	∑Ø≤ï”‘À∆ÎÆÅHßeÂ%ﬁ¿ æå©Ñ„Ω©·‘πjbÊß˛≈Î ûë‹y.Öm›Ô≥0˜˙Wª(s®oê?”K8.Æ∫‰]3ëﬁLûÓ§µÚºu+√j+d	ßë¿}ÿ^Ë
GM“O◊å∑ä«÷¨èUZÎœâÀ‘bü˙◊¯˘ûTΩÊ@‘*p_Y·b˛9;èí!ÜÁ
£ ÎÚÎ¿üê«˝C±WÜ¶Gsw»Õ#G˚o{ïq+iz¨ä†º≥s+∏√∏´êÁ›` Û/‡Ô‡"Ã¬a©£·
8˝•[sÍGH≥‡Ê9B˙Ëzå.pıe¯ùpÒJÄµ"¿Ä–õïaòÃÃO™sˇB∑]¡¯¯8˜ìÀ¿?Ú/‡x…h‹x√∏^:aây◊MH‹A•ì±Ê®Wnÿá¯)h Û«‡˙ÈÔ÷∏Uµ_ÌoÉC§Ã. †òoÊaºY"Ê˝f?ùF”¶v¥…C/åCt€Aíü¿W˝ıqì¸Á5¿íØú¯xQ˛äŒ9˙ÓíJ∆¥∞[ñÕú3Oì-Õ∆ôú£ìùõÄ„dÉøƒè'™‡;≤ô¿NLS`t”Î
ﬂ?;|≈πI›“Wp§íQX*∫‘1a,^≈ÿIÉÇm+Y™':∑8ŸÇè 76µ±©µ!òl£@^◊í…óÔÜ1:ç\bùÖ-fUfì™ÊJÕÍ]œnUD0Øfﬂ|≈˛2çû˙ä¯aÊyÛüﬁÑRWÆ? v[&®Ÿ∏˚ø¢–GQ“ìıe|˘yÄ¢êÇVCt∏4Õ˚œèóz\„qbj¯óÙ~kwqÛæÏ?ac¯_ŸÇB∆66RPsˇ[F¢º…Z+;dcïˆLªáuÅ$ò‡˘Áìê'vUﬁ‡^˙˛“vóÅâ«¡Yd„ΩKπ-6nòñÑ3£#Eﬂ∏ÍNØ‚≠Q≈ÎõÆ~ aÙßz ÌíÔmˆLqˇyÄîIÏ(}ñ‡$“î.Ñ∂ÜÀWŸœãπÑOìL’nΩòe.x˚uO’Eß´“O«ÅØıÑıUr~8Àïµ_iA©ÑJ¸hîUQ›5Ò˘qâ™nE8˜+ ,ÖÇ›Ë'ïêM¥0ºsP†ﬁ)¡õ$C4∂≠∞Éù)a2\?Ê…ƒ)Bû∞Ø R ·8Q‰o˚ÃÄ3TÎ˝√˚ÏÏf`û¸6wÇ≥^√o¸QDäwú}3⁄0uÇ@◊êëXg”!¸CÚ¸c‡∫‡0T¥~¶T- ⁄1ùÎí){xnNŒµrf„ÍWu(0`ŒÔ‡¿MuC˘‰öetÆTœ9©“X∑6ÇÌ®‚ø¿ÒUÎ†œ¡rÏ◊¥˘∏ñïh›r’wÍ›c‰ëÀ£_k´Õå·ª5˘JqeÆtvéΩ3èÌ¶yF¯-ë›‚ZFc1˝Ó\öÁ“LA÷n∫|rø∫∫÷ﬂ}uÙ˝ÆcBπ°Ëà“lT=O¥ZœÌS4£(RÙÀ≠Ï%ı”∞∏
”ènå \ã‡ÎU“?dMaµ’≥@>PÙXEéê™Ëaˆ•ÔÚU’µùÊÒ®}ƒq˙*úLÈ8Âƒ‘˝äc—ƒbïﬂo_€∑∞{gŸ1ÅÅÅçm9dÄ´L» ™4¿a`¥&-G≠Ú©+¸€6’‚‚√…>¶zN—\mhøêW9Úl√à#÷¶a≤RE¶≠Z≠TÍ_„?\úb˙¬∑uÊ¶˜Ê–•≤Y⁄,t®µHUË¥]M1	<rÌs7/ﬂ—ùy“n¬˘…óxô7≈M˝™Y&… ≥‡:ü«◊⁄¨ûõ÷4)ñ •J)k&¨ﬁ‹‡DåkNVÎªj`œ?˚A6⁄b˝„/-≥iÛZ	ªÎΩALaîAwiÄApÀK÷ÌUÇ†aÔ÷º}cçì˝§@¬\%ƒÈª‹≈ùÖaΩóﬁ˝ôá—÷&˙˘·Ìd[ﬁx≠OÙì)¿πqEr	}ﬂ,B
Àp°˚“µp “∂`8BMh<Çáj áÄ"œ∞EÄ≥Ω2^˚î‹⁄∫]o§6ÿ¿aæ<êàË!˜Yoì–’¯"#∂ ç*:\Â”QéÆó:V?∫t0¯1c'Qo≈OôLîÿéΩ¨Ú±ÓÜ›…’Qí®>.mÿ*MVÇeÑB7õî<•˙§·RPÀ˚1¶È∑æ15¬Í~zRL„§~9kﬂs¢Hn‘ãÔ˛D^y±
Ëç–Ô3∑:ZÆ9Óè %–@∞îköÓÃ~⁄>SïÂ•ÓúœV©S—¡h=]t6˝è?§1_Œ{˙ë≤u_Äe…™µ.Qœ©n?˜¸Û@”êú´ƒ≥D9±Ó1µ[R€ÆrGíU=Î$"Ω\{¥Ü2´‚·≠.,¢∂i£–·üÇ^b>´%'ô&¥ß‘ˆ´»Øø3kÇR~¿®_‘ZÌøE)£úÒ4(Ä2Ã|ﬂk´’Q¥n~b≤ãù˚5ÏM ¨ü&S‰R‹é™gZk>Zà∞ú∫ñÀTcâç¢à≤†v»î!Zk£0LëÉaX£Uj√öµ‡ÚÖ¡Æ‹˝_£_·ÆÜçΩ˙Ìÿdèª·âÆ`P:F≈≤˘ää8 ∂qrI˛"Ó8§M∆™{hµJŸÑû:™‘È€’òWD2°-ï·Ø˝‰OÁ‚2´ÜoΩÖ÷pìk>•Ådc‘Íl=i´J\†;ãp˙MΩ~QGN'c8≠Pñø¬µR®mOÍ4a  –-º(◊…ã∂≥C©ΩC<Aí¨øãe)oËÖW"b‘91RÙWÊ≈l°µrú.¶∫ıZæSOdRwÕÌ‹•æüç“$äÜ»ó†‡ß¸¬gS]y44u´1ò‹møá˚ã‘]Y\ùåèDÇNfCûà˙©í9ôLÈÜAømN)®=(oöæ3⁄«∞w}≤‰'”∫5UTRÄ-˘©˝,Oá™ ‡Ÿœ·VùÇ«ΩÃµ'Pcã≠-å˚RZkß‚2˚±_Œ-hÄ5xÆ	Ö≥¢hæ2Ω\¯Ha”ä^‰ÔÕB©%”4†’œçÜk∑WÌÄ–†`–û]H±hig.˙kPæoÚÀ,
<øt“ıÌG∆$);TÎ˘‘QykÛ>ÊïÃ–‹ﬂ®ˇ2˚≤¿Œ–Ö’Êy5G◊ñ—ﬂﬁ®Ú#Î~Y^®≥ÿ‰¸˜ûÂôg˙sÄ∫^≥fôñ˙ﬁbØëS&ø’üi£ø4'∞–˙) ãyólø(ÁJ∫…Í,WNöS{¯µ©ScZû˚gÀFÈ…0âÑH’rÕÛwßY'4¸A∑l9n6ÈCQ…≥H¢ú˝è˘5zG/£gÙ<»¢•kŸÄyçÈ_ √eˇå1|âOûπ‘eÊπl=ªõ¸ì*Ü„äì¶…Õa¸5>B˚∂¬—9€ø:œûÔ∑?∂jµWñaòÄRò!”d«`ZÊaGÿßA‰øz<VÃáüïwgî!˚”†ÚWüï[üln´táj%y$K¢¸ E`VÖFuÓ…©≠qO∑¯täSœeëG	ÒôπŒ"∫,Ó‡%Ö6ûáN"üah‰7ulíÒ¯d˚A§…¯D5€Ñ”Å⁄SÜ◊<ÛHKXÌÌfö^øèMŸvÅ∆ü7-¸Ï3^Ûâ≤	KìIó¥'[∫\πæ ∂∂'Û‚u˚ñ≠”Ôò‹v≈ıxæùÒ¢ä/∞è˛òVØ¥Í—H• ¿Vd)ˆi‹˝)È¥Î≥˝∆®≥.∏◊å&ô]fÁz⁄+å´éR¥˘D◊=^-¥@È|ä)⁄I›Âuí˚§àSùi2°úÆRñö=)∑ÆÖÇhfAvHkr˚Ω¸«ôÓ≤˘{KoÒ°∑VãG[àˆ≠∫±≥UòÙ^gr,Å3÷NCÃv“bæîE–bÖï¢Lmv%H+í7pißrX4«Öí")ıŸjw$Òãd4À\¨h€MF¥cúD~êöå[Ä	•)€eß%È2¶≥ 
'¢∑_TÚËa&Ï}VsπN0d‹¨f01T!¸Ú∫íöu&h˙p TÜUOôÍñAKŒî[…ãÎ‹OÉ_“:ﬂls‰7n•∆eiﬁï(ÌÚs;∑À`ıÖøÍÁ	Ïˇ	€e”í∏mpÕ4/]r∑ãÙ·7˜à®qGk¥zΩ÷®^M8ç˘¶u◊Cäó∂ÌÈ, L€5ÃJ'ådÍç¬¸∂Cg=kˆ ”G9eÜÆıÉ™Ò6≠ÁZ˘IV•ÍÑe¥…b
»Ì~ëUÆπwíå“≠ºÇŒMt´¥«	%‹N"π™Û¬ÖôÄ¶Q)¿=D2∫C5≤j^óœU[Ø;«€V~r:∂ òµjÑo’Ùƒ4≤$’HUV ÛEÚtyÌÎ’"ÓW€‡:ÕubÉkUÎ¸˝m√‹~`|h¡ˇ¨Ï¿†Ë‚·Ÿôv›MêÎT¢-ˆ[gß3v+(?œŒÓÈí¯ªÒœÕk·Û òV≥M›0ë&Ú?ˇÎˇÀNQà¬„∑fCLFwˇç%≥ãp∆6ßÉãÉÚÄxañ,ãdßòÉùÕbrbâ˝‰ã%ÃÏå›b¯<ú“›2IÜëıjôÅ∞J…ØÍiCáIE438œ0ı*Å«ﬁÛ"⁄ GèB¨¥Å…IR^q£ÿÎò·⁄	Bı‹≥nÃ2@⁄ñP¢Í9Z›¬Û··º;äg!ºYzì‰ò…ÖÿÉ%∆ÏãÏ\"wÆﬁLyZd"®‘Ëyä˛¸J†≥ﬁ{ì$⁄Œ3øƒÚj∆{◊Gd÷ÖQ9Hµ˘§ê˚,?*¶’≠·”C)|®9u˙’<>ÊGM5, ,˚øî((ˆ.Çsr£Âgëó}¡†ﬂò'÷∫çs¨jƒ<LÜ%ì`O®F!#o2FÈ±—#ﬁúQı=Ω$î˝c…¯⁄~
 uƒ¯:ç•‘ıÄ«ß(tøÇY»05ÚH¶N≤Ã~%√Ì–r·∑X Dx±ÊIπÔ∫ÈLiC¡—´‡ZÒb®ºåîXáöe®¡Ê«UÏ‰Î’U3≥¢ñ˙§¥ß^9≤À¸ç	≥7fNÚ`¡•¨R≈IñLûøçÜÔ~ú–!… £†L>≥“E
•◊ŒŒ/áç¡ÎébÒ¨À´c8Ω' ÎÏ†BÚ¨ÏÇ*~…7z~¨”@8<õºH=JÇ≤ûáXC}´§^YÔ†[7‰˘•YÀ%ÌJ∑ÓE´¶–ÿS™ﬁ•f–(«e¶√∆‹fÇøÖ˙·G^ô-É‘ÖŸ»#"^,$hL∏!æãÙ¸W§À÷Îe+å\ê95Ïπ2N/ç1‰h.—^ÊÏPB•+ÈıÆèV	º‚:Ó√çÔkNY|±|<ªæ/ÍÜXÒ®Zk®ò-¸ÔgpEt—&ÚØ8Eˆ(œëHWßä“ﬂpwÖµµ“◊©¿2Å,ÖjF põ´ÜP˜XQºU¬ãÛ£´yzd‘ùô≥∑…Ûa°d˚(öe∫˜—BJuKCµ°uÕ-r81-y∑.|F
∑2˚Çñd¿πz¯~·±/ ò≈IÈ≠_Áãˇnm…¯∆2€\fèﬁì[˛O’tà∆Ñö∑é»ï¯”m˝CÕë®%ã˛>?5®ZÁ≤ZK^ü“*+t–ÄÍ™¡∞µŒÖ>Y9í~jLTÿ`∂.„.k{ÆÖXΩf´Œ'ΩŸv‘õ[u›:‹}ÓâÁ≈—ßº‚≥$öëÎ˘YNπ-aaÈ˚e__[Yg<C6Aˆö.(†ﬁ¿%)S0:ì!ë5 âÂ¬ï—úkS±4—F¿W∫∫e	x¥ê£‰ï®›ãm´∂˜Dú∏˜$6o˛ÆQ®è`K˚õ2“öj»Å˝dıuØ±Á ‡ô€í£m ˝à*#]`—åeœ8Ÿ€=fá?∞Á/èvè›∂/Î“ªQ◊=·åhú÷Dg‹LE4ôûxäË1ïe…d(˘ él™Ùäàa`{ÀVÂEêÜÂ6Pﬂ'Øeà|2 ⁄h7œ?…¨†®:ñª|¯(À›·Î£›ΩSvt|∏ˇ¸}ıÚ‰‘∆ßﬁ;JM‚π∏fÎˆò∂GnøÌ\<vEkıá/∫ÜJ”©+Z¬,≈s∞∑ûÔü&‰‡!ﬁØ=Kjçl/”/i©ô[∑)?(¬ÕûÉ¬åâÜ˜a4π$5Gd}Æ,7∫]∂Ùjÿ¯¶€—"`Fx—;WÂŒN±≤ˇ‘"†£•=îÏ˜≠bˇjB ≠ÙmCuÆ‚)ˇ È“Êö†Ç≈±É’Wã…b}∆ˆûÁs—*? D*∂ˆÄ™8∂ÏºŸÓﬂ‚â˚ŸøÀv,»hwÇSΩ)˘Ç∏∫HÇÑBgÎÿ¿ÃÀ˛cr —ïû%z4˙◊+J‰£o!5˙≠™† Â∑A7î/5k‰ß∆í⁄€û–Òé„î6◊¶P;(Ÿ1k∫"ªc)ØÑ⁄hì¡jç~ºÜ'–˚π?OVUëˆâ+ê6Ò±ƒœÆo:yß¢¥Â9CLÿ∏s;¥∞Ni»è)(úö?Mew5Áfıx.%*é∫Ù:è´	Óµ⁄O%Ø˛n˝IµzWSô -‘≠»ú/øNïÕµYÂ…€ÊD™U·Ãÿ¥q∑ÕZ2ˆ‚NÌ˝6Æ◊ÊÓo—¨ı,St@%[î_@GÜ∑áØNA⁄Ÿ=dá«wˇ«ÓÎÉ7ßáseo·j"^59^j3ÊJk»¶5y«ªMûB√ã.»RÓtúè∆X¶áòû!IcØ…L“†¡c[L˙<4Cñ&ZîdÃ“iÿ)øU.ÒFbQMß¸Ú_©œc4ñD(åÊ~ïdbÔÕÈÒÓâ ß&≠N’xY°§íu™ÜòN]ç~)RΩ'™·6{•p˚ñ(ıld∂|üÏ@á⁄	;2ŒªKTvBìá•	$Œ›%ÆUi˜˙ÀLk†ıs!˘è∆ÔIÏﬁR‹äkÁ©wM‰˝◊JÎK&ÃCÈ-I”~=t˛≈À7ªØ^˛ê˙∑oˆwÌD˝e 3£aÕTÓ∞3,Ä”êÛO˝Å÷◊^⁄VVö.æõEa zûï¬0v=$ ‹DÔ'ÖP˝∏ï\O√ﬁËÊb/~cÏ†*®¯\eﬂm∫ã∑Ná˝™ÃæmWPå◊´¯^fø^∑døÊ|nëË⁄Phï(6Oh»∂¨•jéE°Ñeì[7≤R¨ı; ÊbØ˚Õ~√ä¢©Õx›ß~O¬»ÇÓõl-Ÿa8•9ı¿ª#L·ã'˝O—•eì>#{ÂÅü§2Z¬95cﬁ9Œ≥Ã´¢#¥´£¶ÚÅ∞”¶¡Ÿ”õj·Ù[·v|◊:p:çÇi˛¥3∏ä≤´e¸∑S%l≈jÀ;^Õ˝m—∏‹“¢Z∫Œ(o£P2“‹|ñ“ˇÚ2ı±üûXVΩ?äº8å∆fy:˛1∏LwÅ˘gÉ>ÿµ“Œ_Æ˙ò òh»ÃpóF¶• ëXÈ¬”(Ò¸öítÊ‚®•Èx∏òYõN¥Ï<≥‹$ÕÆå•∂qW∆JW%Í˛êæÀ-öÅèŸÓ3A˝˛&ªÂ¬Ó'ó±±¥s≠“çîøN®ú|6¿vÍ“m€πìÌÁu %0•.˛˘¬KC/Jñ£÷6Ωv=πxH"Ÿz—ü”X8WOÜ6Ï49?èÓıµUäﬂÚè”oÖ2≤W6¸ï≤ˆ3J (8;Eß$ëeÇ^y≥%÷4s€˚hÏˆ ÛvÛ~™Á™ØfíR.nV%«{Æ,9¶∑[’Á≥Ë«◊^˙„nv‰Uk%ÛèkQ_ÛÖÜ#aGﬁy¬∫÷eæÌ˝¬–W≈wªh¸KBü
ìŒxQQÙWÓøÍÖ⁄#Ñ6⁄	ÊˆœıL ﬂ≥Ã˚ı@]Gr#È¢º≤©[>/jÔ†ÚÄHÚú0øE≥0e•'*ˇPÄﬂ∂0ñié`ñ›!Ù˛;Oì-,±·I—ÒèRrÙ∂z˚@àc¯’n“RÚ_ÔV´ÎÔ≠Lÿ#MÂ»E-)r	ÔR
P8´ÒR7›wUﬁàÖ>à$T“fiôQ˘q¯Û√(±Ôƒe,Åæ≈§‡}[u∏Õp!ÂÉzj[*tä∆TçúªA)ÿ~!ïF+ .˛0ñA^mÛ=ÉßµÈ¬J©#∆üFﬂ ˛2
√˙Vt·≈ ÑwÔπ´†√I–-ê[ 96ÀYê®øÉÀSoÿ≈òßæ‘^Ü–∑0V‹≥ù≤®ßEÅù^Úm]-È‚–&∫ÀóË"a6W£≈	©Ï˝cƒZ"4Ω˘•
˝ßm Ù“€ﬂ;Æ◊¢Z±j…-Àb•M0h@£ziv@> ‰≥∏‚:$”ﬂ»EÃû{)%‚‡ÊıH˜;
≤üf@‘`πâEòËo bB¸¬	§çwí{˘,#'eJ3 ËlÇû Ò∏%…+¥D6G»EË·˙‡QïÓ¡úøKg”Ñ≠)≠:9ª4¬
»q·ﬂ'u±w≠b Í#$.vƒ^W.Ì 6Õâ3Ë°‘ú<EEIs¨a<yÑxbè'´zÈø‡^◊î7¬ë0Bw¯üe X8¸¸€ê≤À¬tgË,Ö≈GL”˛◊úb©1 ÷V∆%⁄⁄hNb•Pêzje@ààUU5ÚHdyif|-D∆Ç7éﬁ]
è∑ôJ
ì
~,--åf…Á3".J4;+j€V#é´\ª´™ä™l}9∏˙ﬂ7yô∫µQ.6¥Å¡°u%≥∫˙∏Ç· ‹ToÈ^z˜óƒ«Fiñƒ¢>\*Ë,ˇYC˝\4â+ˆ1qü÷:≈⁄áß0Õe=Õ*c¥æ◊_3©ñ[mﬂŸ∑éFóΩ£*—) ‚ÆkåëB‘øûãæ¿ÒM†CAuò∂¡jòÊØ´öèŒéóﬂ˝ŸeØ}∞5<µ˙”5¨‡i2«˙Ì¬4˛ñV¶klå∑◊ Íå¶_êêõ∆ Âb)Ëj+˙=T¶ëlOÕ∫m“8ïÍ3BÈoïtØo’≥„ìoÙƒ©!‡N4r ß'Iö„PSâº≈ÓbÅy∂óP›Ô·ﬂ-q°f[ﬂ4¥Û⁄3ÜY~`RòÉ(úaöP”t´d†’ª∏ÛK[Ã7óò(ñ§ï Ÿ °Ì›4M.—xˆ;ê∫ﬂx¯Kì%0Ö=Û√‘ÒD{Ÿ≥I•ıà2#TÚ)V‡%·¨~7Uı]Ê:ÃãCIt-—ky-+‘CØºk†Ÿﬂ•°oS;)Ì≈I:—tbo‰°¿‚y,Í°†]•çW‚∑¸≤7¿ì?\∏„OÎ›I≈t·P1·ßVÕD~ú¯6jÃºÿnk∆èÿ®.Eˇ¥ÃdÚkÿ__´I!ã£ŸM‹ô ∆˙Ùhß\Ã©<*U[-4F.∫ò.5˘ˆÖ¶,rµ’9÷Ÿ—¨Nuü¸<€ÿíJ#ê=éxŒÎØÿ‹Yî™p)Ï˙3@>⁄>¶¸É§ﬁV®˙¶Îr≈Êyâ»éßî™hKÏ–√ÚW_˙Ü“5ΩÏ)≥—©§û|Ä“<Qı”∂ÀØŸ7∏Æﬂ˛ÄÁÿ0Ù-nv,o’6Ù”,ƒ‘√ ˚ˇ(Æ4ˆúœ£_∫T˚‚»ãGA§˜∏W\≥Ω˙æÍ”-í@r/wcaÑÔ˚¬ã2Øî°¡Ø⁄˘¯a<&.°|g_^j Dö{…÷(◊ÅëÊ<Û;€ø˚3›l”Œ(≈¬#éÜˆ“ª?˚ç-—<“ ivòSq˝Óø—ç⁄6ÜIh£xŒ/‘O«Ó•°6zºFY^]H·¿ä˜{ ó?M¶@ÉcXÒÌS$Óev∫£≥Û-kºÉnª±<PXsl7O-h{M0Å–˘ˆÈéÌôú¸l∂XóÊÓ}IË€EÅónâî™Œá∞»åHP∫m>¿eœ0•uaÜ÷Ú-`ø`]Ωÿ>ë¸•x™{Q<…˛»∫›iÒìÜ%ø7å1Œ=êî”„‡GÍçÚ|=˛¿µ˝˝ÈÎW˚·≈A‡¶∑yò«ŒWπ!∏Óm∏1[¥ÁiBX@Ÿ
9Lø%%~˘Î2ÙÛ±¸…nH®Ùt@ıõCŒ”dloùQH|'qæ‡"/l ÿ-â£•ã÷™ïß )ãªdYÔn9⁄Zs∞2œËy±≠gp®wπ÷ ÿÀ∫	ö8{œ8WÈhlã}¸Ú¶“ˇ≠ÊN—ÅáLˆpﬂ∏a"FÃw◊Ä2Ó∞gœ‡˙ñ1Rs◊Õe Tp6
∫›l6Yf	Áπg`}∫eÔŸ˜‘Co˛wèû”‹õ0¯∫ 4>˚{‡˚µF¯ão%È?ÏéFìîx$Å§ø88ÚÁ»¨µ·J @π;Q3‚W†>6Äù.‰ßﬂ¯uY‚?]°Ôò∂‹⁄∞ù°ùq÷ù¶	S_‡k;∑∂ãµuÊùÊ¬í&wæ¬%ıªuÚ˙¡ÀEk|‹ënÖtW"ä˚a!ƒâÌƒ%π-ˆÂçB6nﬁï¯iù˜ØFÖiñM∑ô∞µ[Å‘(,Ë\ fS°;⁄(?çÚ£E‹‰èP€!/°´ù⁄Íõ‹-;e¸ö‹'DXtOK¢íÊ,;Æ5ÖøUÏ Bå“∫A¡ó•U—4ì—òêiíƒIGvM'As◊{„‡"Mb‘©YÀãQyQ9+“mIñôNè;iíS^ù'´é—wC «õ*ôæÖæ¶tpÑqQ}2≥º+hè`§Í“ëe˘5Rî˙d¡dÑ3L^¥Tü≈ìübV¸à®}ûg∂ŸÂa¥˜˚Ä

ˆãf‡‰Å#¯I}KìıßxΩˆÚÒ`‚]uÂ˚t.-≥ıu8∞k⁄®ãI6Ÿ$N3’zå_F:π˙ûìPbå1»i0yﬂï∏XÇ∂6EãcàN@d2Ö¨p qÎet$w&‚1πÄ7L&¬[øØﬂ⁄dÿ_kL>ÎÊ-+QãF::Äz∆«´G¥9h<~Óëìñ”j⁄‰`3È4ßçÜs2·:J-ä}ÆóˆW©È≠¨r"tåÛRÊ‹¶a7V	†è€p7◊~4ŸÀ1j]ïôL∞,≈‰™ø—´~£ *hU8k[ù%ÃdhSFB…Ê%õ˙<µÏ≥2”ñQ…™qVc’(?Ü}œya>ÏÊÊ.¬¸À”£Vùï5˝Ö(~†9Ÿ_Öúøº†ª±÷Ö∑a’—!zLˇ*Ü+qz7⁄îK∂∞Uw˙Í¡I\≤	‚g’ó∞I®‡üfr»?7 8Ä¡D∂–T0ƒ´∑Á#%Øz]Å∏Ú”:¡(zPk|úøÕq·è∂π∑qÎÛÆ≈∆ltEiuV(≠j	⁄FÆ=zúÖ[ô¥q∫ÅÏ'£™Ç√ƒøûœàÎ.§c—⁄Z,5Á•#$˘∆f&È∫wiî1M∞NŸãH‡(ù/ı—_¡ıha.©⁄Z]Øî¶˘≠bçuæ+M(B√eæÁzMòSËO˚Œ§}Eô)ú/HÛ
¸U°ƒnP∆˛µ›k∫QE¸vΩ#Ì( ”œÈíÎÖ¬t¢ºÒö_sΩBÂÒ£§	∏Akn∑x¡µ≥€ÖøA” ´ÏlÅFÙ◊≠ŸÌQ_≥w∑D{Ìù6(ﬂÆâÓSıÈ∂Øu1 ∑~QGzmê-–^{æ%‚kÔ¥A}ÌÖv»‘Í;˙[£]Õ#Á∂gfàq≈á—>Ã∏wöÈk„Ú¥YY¡Y÷©ƒev∂DÂ
¨x…∏üwÒ	c*Ó0Û"÷çΩÑah9ayÅ0M*:5Ë„ëï€öë«|/˜V∆Xëã»RP›ì{`¥Å1K°¯i≥â)Ø Y“µ¥ëvc⁄\v$¨ÃXÂU©_≤êWë°"Ñ·åø¢0îÈ…‹Ç–∂àòÂ¸˚Üûdo"jXiA5K.¨¢vSëÎøpöSR˝ø	‚Òl¢!HÛ¸øXQ›ô√ﬁ“°ûmÜªsòïëâ>Pó#ÍÑ¶T'ıßY∏Ãbé`\faD#÷%ÏHΩ…¿9êπXøπ?3ˇ{Y	–±¢7V$EÕO&ªÃBˇ™6o)W˛LÇ|ú¯“k‡‡˜îˆ√—ÓˇäŸ™?º⁄}~Í‰¥7‡bà¬““{¸S^t±Ëçz°c)Ç>~yÉ=eî(‡∂ˇÂÃ´ŒPiÄ8
»|çNv·îäæÙªeªµ≈ØYKˇqUÒ≥¡*ä’ã“‚ÍÃ®¥±™Üa+—Ÿ«]ßﬁ2¡?˜OÙπ—≤PK’≥Ù E°ªÿ+©uFÌï*çí¶F˘å¢ÜZAéÕ’z;&µ÷XL¢2ﬂ˚î≥·q¨ˆåã≤ñMgáˆ»H$Ÿ}Û†ïjP±1…ùﬁ˙FìˆJ0∂b\≈Èê{√Y‰•˝x6…`&ôwêßpN#–ñŸíÔØº~Ωrˆ˝˜[ì…R}≠[ıs£“8‘cÕ]FXUün v~≠¯AÔ®ÕÀ15ÈH⁄‡PcÚ◊π≥√⁄J,ÿØÃÎœ‡»"xÛ*n*G‹8ó–<©´Ï±©é·«†ñtBÔ®ÊyV<A˜Ã≥eMÅVQ !É©=ÿ»YŒ¡7|^Æ≤H“˙ LÂ˝Y sL⁄äül≈MÓf"'ÄÖπbôHúNyåíùBEÖÕt±ë„*HF˝~üΩ>‹?§
~ª¯≥^Ú)¢`DåíΩ¯ v· OY/Èˇ‹‡tz	è#ÖB‰^˝é\/≤w– )ãOv_|¿ë~ÿ;|ı·w/ø˚˛Ù‰√˛¡ã›^ùO≠’¯‰›@n†ó∑å˛Y˝áè67>À%>∆„ ±Û{ eÖ≥ª¡©˛/¡5ªEﬂ\˛Ωt˜ÓπÇ± πúº¸ß›ÁÛxˇ‡xÄq+Wág]—¨à¶b€5ØàﬂgkŒ2'5ÃqøNfYÄ˛IE`5œ’k¿ß{ÇY¢≈àñôªZvü&≥—òøo[∂tò¶aïıy÷™D»Õ"ó¿<
÷Óß‘/∂"~`±*Œ∂+n-√ƒ”‘À0ﬂ&/˜U/≈∫ö^z>√|8.˘,∂¶h≠	–≤GÈ…I÷¥BgbfäBÀód62ÃºÓ0ó ∂»Ωô∞Ãu¢Ë˘…GËíI±‘(0B¿)å¢çÏ”4ô&)πlG@O˘∫\ C÷ıhΩ`©ËÙÅ
” Ã=∑·FË~`πgQ“à;éØiÑz2MaÒSêƒFcêÎ◊VWˇ]Yˇ<à<∑aZ¿◊GaÊañô√›·T¡Ä'√Ω&D»± üG{∂ó¯·y≤≤è⁄Ñòâ≥}Â}¨Úö%C,POæ´	ıÑöàêÁéf›7–÷2{…Î™∞∑àtΩÅµrk±v‰√'âÚ˜ÅÁsw‰65))K†(⁄»N
ö“ÌæË≈ØΩÿ;$Á`c»πµ]ı,uëßs∂π§ó¢8›∫K1 ÑáÏ∂v4p˜¥ÉO`üµÃÈ¸SmÏô/Ê
€≤QRÄø} Ù∆ΩG¬*5/Ãëçwqh{wˇÜ_Ì√·è}ÜÒ†≤GÉõ…>|‚¡¢YÁ+É
r`ÔpT¯≈>,zÊ˛„™GFÜ3Ha’≤Ü?¯@£°Ûª:ò§G8"LÄ”ÂòÊÈ≥(vâπ‘ŸÔÏ¬ˆ¯˜ ´iÕUı?z.i“ç"]l÷ää(D|xÄﬂÖ’’û´Œ∞q‰E+_ŒìŒª>5Xˇ"ö‘RJ”¯¥hsóCó‘_NŒ Oπ6s©æE,ëd·»K xÎß∂´˚I±wTµÕF)∂‹g˙lfª>†	Py—è¥Wx_kO0%Mì?N.—‚&Çù¯ÉkWwI´êΩÙiÍ
{‰!~Ziúπ^Y¥‘ÍX‘
∫®Æqı~‹èL≠≠pˇk_÷z\÷ª)â¢<}”=∂Ü…Uá—7,tafﬁEOãﬁ≠öØâ$nÄ∆gπ#Zy∫rdèµÉõäzƒπñDØ^ª⁄´àº4Äªƒc€…˛(k\’æñÚ≤òàã5®áØ]{Xß¶ßK©¨Â T’µdWıê√}˚	¯Ç•û^∂æïŒì£v2DùîA÷å4ıä[˙ÍaÄ™‘~äR?∆ƒdåôŸˇÌNßz≠”f*µ§uî_@∆¬m±ØXêá¿fÁ‹Äù¿Èú|W]9LÔ˛ƒI£-Ö6ÆπUÈçXXâ-ôz¿Â-I’BM›mMÎ^h‹äÚN∂’¶ÆﬂUG—gkÔ1⁄#ZËÈ[∂tcõ,ÍQ>≤ÓW_ZÓ¬´∑Ωèò1 öJ«}ëRN£(iÎ∑ZÖñÆÒ6”ÊÆ¨qÜå<Ô4+“ªùè#‰‹ˆä—tç—}¡ü<'A2ÀªJû†Í´î·sômÆÆÆ6L˘GhdﬁiQ‚ó]Ñ1r
Æ‹qÍ«∆!6I•5û∏ZÌﬁ"äP\⁄X≠Ã¶◊9L™¸”åÍ®çÿÿ E∂>ñuŸ?'BΩV0Ú∞O◊`#N™/ﬂ)ìÇŒˇ¬hiTO2Ïç’R'ü3À£Ô”„fª\Ë$ÜÈõG≤hûõ´JîÄ<:9ﬂ‘Ÿ˘{)Ñ2ÿDA∑ˇd~vØI-˘ô (µ7>h™ ?À(ÓŸﬂÕ•ó¿Ì†G‘3OÇlíW^t´ü`¢eû@êuEö3ë«+a8Ê£4Ògç[I¶‚2ñqı/Z—éâ.]~¬Î2qw—-ôÛ‹ö‡˙E-—f_qÎæ÷î ”0Yë9òÎ4–™:
Dúä@‹5TÊI≥'ÛT?ï¸¬‹tı√›FN‘Ê•ÿ∫ÃZd6∫GÔU1…V]I nlBV	$<⁄Õgû•$û˛—BÀ Òç9Ü7(òà¬ÅfúMY33ìw÷Wı„f°û?ÌØ5+¯Ò>µÉg–<yê+>iBd®ùtcàÓ…ÈÓw“~ä™º–wÁÕT?€‹iü´}P„#P–P˛®Í 3º7· ˙ÔÅövö∆iÀ¬®gÖÔì˚”•ÁIÓ%z>E R?Õ<ù∏°å<aΩ4|,ÁÂ'Ÿ2Ç∑‡±ÿo¢LÄ‚…ÄΩ·Êª4ÙXPqY§BCÍ}íd9⁄YΩ"/9Î,	[¥œ∫¡’`ãÖW[Ï¯Àµ’’e¿ ê◊√∏¸›c–F†ã!v~ÊEd”çŒì¶ :¨∞Îç<÷yÅÔ@{Ï˜LÜ@Xab'hÍ+`ì	¿'Ñ	Õ&|ÇÌwÙ@1âh”Ä¨ó–722Çsà#H%’≠ti®GΩV\}ÖßGóíB=›„ Ÿ œã¿°8fAKÑwÖõÌ>úa$Ô6≤ÊEu]©∆ñéπS⁄Jã∆#z*HsÅ•@ÇQ8l>+ÊåıÏXâÆ¢—≥Iõ©n+o*µ¥*≠¨‚Zïùoé-†’¯§Ãaƒy⁄°°\€X5‘}•Q>¥n≠ãd~xÑ™Ê’[t®^ï] k∂“öÌ∫m Ωç±çﬁ´∆bx5Ω.∑ªdd⁄°T°ñJÃÜo=â‰¢±BCB’ÏCáË¥ÂJê°t*"±´p˙zH˜ÛU¡√d°ÁoûûÔ-‹f≠‚˜ãæÒd¿_“7ı¶ÍÆc>*Û”],Å8∞lO<ø õNumq[(Xú»¶ë–MÉbY acµŸ°?≈…w#Ãäü^MLPãÃ(≠ò†äÂy nvÖ”ùŒ8úø58î§<O&{ÿÅ	˛K¶Gcπ<ÓrKÑ}4
·‘G¨ëø‚2cóÃ®=RíÜÒÃÚgSp∞4üE9à“Äﬂl|(˙ü⁄Ü¯XZ»ÎQ≤ï—ãC˛ãßO…‹¸itúÅ`à,"‡∑ƒ¯Ï°I/€˜ﬁ¿§ZÛ=eq/æ˚ña¶V0rJ*¨U'Ë6¢—glôù´	|1Ò^8	ÉAoÂ•í®ÈâN∂ıµí¬ßÇF¸tFF(Ei∞≥,~GÕx•D¨<QÃ»Í.+î	Ôﬁ
KÚ8‡Á¢ïÑÈï@ª¢Ki<+/)¥ûÕ¿g˛?K-≠GüI'äÆ§Ô('t∏óR>ê[fq8íî™É•˜∏dw|ô`Ha3û†„;¸óL…Ñ\GóŸ^Ñ€ó1≈Ú0·ãHﬂxÖÂe∂ã#mË"»GΩe$™—F«Ã≥0
B^≥Üè›
q*’&0sT¡MQƒ≈©7—W Ü»æ¢4Ñ‰| iˆ,#oŒÑbø	Ç4Ifñ&¥y©≠Ê√d⁄V4jc;Àó›Ôö7“Z<ld	?ÓEÛ≠#„Æ˙—22a)WØÕô6ÿlıı¡õ>|ˇ·‡‰ÙÂÎ›˝]Ë 8û∂/#∆7ÊÌÖﬁ§Ù¬<W$ ÉŸÚé%}dsG DÄaJz‹Ç)£¥»⁄ ü1§ßg@N}∂e¯qõ\A2¶—™53¶L»åmCoEœm˙·):ã$ôOñ≈˜0ÓR≥©Ëc}uuYÎù“k“ç'Ω⁄Dö¸„ ≠~\à,]îöZh©ìËJSú ∂W›“	ªHΩ©ä"@Õ+´˚ =S“@≠©y†j2D=™$w[≥‰æØ,˝:IÉ∑D#†¿"Ùv≥&Û≠x≠’z£Aú·ï≠ÿ>-ÆËºEÄ´Åºc¿D†˝?c¢Ø’˜K·%7¡mÑâÏ∑≈Êî9y9Å±Ö'bó‘¬˛ø+”µ€ü°§Ü-ò[VÅiÌ=†˛#≈πÚIs:\=ÆMÈ÷Ã∑R4Ã)À„Gú‡Â“{Ÿu<bäcD›ôK)¸ªﬁ•Ê0≈‰¯ê≥0ùtóvë«RÙ…•æe€@àêœñzΩ^qp;5¥∑m‹]çUŸÆà∆Tá+È"ãÃóùû9p/LGQ∞Æ◊¶£ÚE©¨ù”n˜ÛOU≈'^îDhûV¬°–ï( ï6fÌ‘÷Â0‹ß[_ìcö’<kQÒys56ÆOÀï˘E˝ﬁtÂl˛g∂-ÑKuû«XÁ0–◊]ô‰pÁ⁄A¿"¸¢¥Ìª -; òﬁÅò“	Ën w§ı–7îM•C]ŒK⁄Íó_€
Òâ.¥FQπñ„VY˝B«è"…ìT#jpîÛÄoa–p<€üM·-t%Å«~]§{/ô^P"ΩÃ\d{˛íÆÌR7Â7ﬁn¬ì\µaÇ≈®ø–∏≥˚≠q cç>—Úr´i#ÍÎâ4äÉò4l≈í∂°!5bU‚¢éc‡/›b\€˜	!¶(àÎaˆ‹ãç ësÏùo\ ú‹!(•WxM·„üÍS‘¬ÙÀIF:X˘4Ê"ª6òŒGy[?)Ÿ-äÃ◊Ç„4ı≤±!≤pÂˆ|‡∞•Ó¨~ZY_3GQoçéQ-“_∑T√p~˘ù‘ú9Ø_æyπ{˙√Ò\ys Ç„˜LÕté≈»Ò‘SdÄùŸd´¸π¡¢sÂÁ&ªäîüèxæ=W⁄çˇ†qŒÕ·æﬂ!¯1°≥;Ëóí5∫Ú^È°øÂÅ§]0+…˙ZõOMˆ=LYì[ÛJÆ5òë‚Ë~!√<¡‡="áõ=Nû{˛y`∑?Æ¯‹∏"wƒ¬ì+Œ$¢Ùf§í/›∫tªu”ùÆcqã[Ø:¿µ)Y§ˆ˙Ò≈Ó´”]¥ÇŸŒÕá¬!èvø;l0joØ‹Óóà∞9Ÿ°-Ò•YGÑ‘,4ETuÎ†ÍÊ‹ò]kô◊ìˇ∞°µ@o⁄¿-`©Ü[µãØ™S#fÛË†∂°‰<Sï?É¶	&üñ	Å‘«–@cçπÑ“Tπá9D∞.>∞‡iè“I≈àBdöã¸TAÁ.⁄T(ôzô|™…ø·∆‘ò'¥©Ÿkëè¬ôN›ÍP[,¶∫ΩÉ◊_]\ıΩ#´ô≈ÔÙ©∂‘Ô}C^À@Î∂vÁ"⁄B·÷à´ø∆êÎ∫~Hå}®hÎOÖ¥≠c∞m∫z%@MÊ^Ésõ◊Ò∑˛xnq¥∞iﬁ,4’Îìu]‡/a®Áôcj≥Âª-∫§!yÀénxwÿË◊o)}\+mÍ˝‡ˆp∂t∞Z:A¿·pãÅ\»|Ë* √“ÉOBÙëäÍoÜÕhéô‹|aaø]ÓœbÛµÅO·@÷⁄1* n—∏∂!ª¿Ûl°≈¥7-ƒøV3ªA¨ÆJ<·™”‰•jDî]FÊ≠™ıkò—¸≤wŸÕYçÛ%√Å:›™%°xDô¨¥MïªQ1_Õ;·E7ﬂÉ§¨L´(\cw“∞B|p‘Ñ 
çÏV•OµÿW£hFò≠êÊöKìÕË~ÜôB3˛Î1œº9<~Ω˚äu1∫„Ó_IabZiúˇcÀõ¯[™Ìô√M+_8∑1eQS ÇÜî˚òQ¨6XQ⁄ŸP;m(õ˜≥°Tbkê⁄&òV’¬"s•òi[ßCß©≠¶'µÂ65…ˇ∫l5õlˇO@ö˙§Vö6÷ÌVe´⁄TÑﬂo∂ñ\’ä3sô∆õ-¬çSsiA⁄Øoëún›b‡j]¨˛¡ç_„*1ß£ˇ'4¢·ßÖ!ç?÷fXL!µôÁZ◊ok6ô`4,€KC¥&4Áb”+∂µd‰gîΩZAÇH¡eﬁ0Î∆¡%Ê±„ú[˘L„Qo	≠œÙáä·(ı‡ò|º
ü∂æéˆ`wÖ±ÌÏLv©§â*≈XÔW«Æ~-J˛}^É~>´—ä¶¯@Ü+Çh„$Ø©àcåm!;ç§µ} ?uˆ,¸‹€¶Öü9 :™«ﬁØ«™Öü∂.ñ≠≠[¯y®É-]4ñáƒÊ_ß≈?`ı¬œC·Ù/i˜¬O[¥û√˛ÖüFÏVÿ}Ìiç,dˆ*ìŒÅƒ_ThY'˘?”∑∫>˜Nﬂ˙Wì©UÊ:‹DﬂªˇL◊J√iëÆµ∞@å∆Å?ã∏ˇV û˘Ÿ€ÉeœQ„◊µáß’Nõ©õDpn¶§*™ÓaÆ.‰I´?"-u·6âQyØÎ⁄Ò âZÎPÉ(¥Ó-⁄€Á„¨®ÔÒ‚B≠°ﬁ_å∆jXh§üTC_üJ‘∂ôdÏd6¡˝\+U≤	Â¨†-zÒ„ØWUs3˙«W≥ûÍ”˙"V•€Ë3¢]¸æÃBˇ Yl◊π†W’ ªzW&T-√≈3Ûwn˝ÊF¢}{≈¯té5ı ¸é¸#pGIú°©˚•yµém'ÂWî÷`—'¢<;á‰ drÃÙCﬂÅ∏èˆ[VﬁÿRnÙ‰9√ﬁ˝3Ô5˚’lÉ6X˛"åΩxÑ*∫Á…’\XnÅ6*Â‹Q97√◊](Æ◊%l`œJüÿpæ+¥¬´¢.¬)éZ≠óµw† ‚∞’≤‚¬ÁüÍeá‡Å(„é©=êJ◊úx‘ˇ’≤∞Ä€°»”ÕrÔ≤E†XÜÂhêÏ,kfŒgF2I˛$ÂpDbYfõ,*7‘<Lä‹{Ø\í(ÇfÁ"Üt\r(Mî—?≤Ti÷‰sdE⁄~ﬁF√Cnùl2á<•õè™néÑôd»+js6eÒ6yzE∆Œoöı;àﬁK:≥z{njÏ’$œYt?R÷mΩãz€Ëy£RßûΩnÅÄ^†ΩòË˙5oáÆs‰èØbﬁbûÈKQﬂﬂ/·p[3†zÑ·ûµµ‘±y·ˇ÷∂ŒÓÙﬂnç
	Ï˘}Í)á¢≥X§g§ˆ1c?øp,£a/Ã2 ;à\’uÉk‡¨©Ê•Fzû†ˇD≤y	Hìá˙¬À+]—Ôπ$VGÙá‡CÊ]«Ö8ó{ÆÂ¸&…¶uüˇË¯dŒ˚˜bftÁ¸OÀV,RëΩQU˛≈º•CZ!5~ÊGl¸¥En¸<Çª«ÅÕÿçüv1çµ±-äpÜ∆fƒOÀPSgÿ√T<RÚ}ˆÔÅDï¿ëA"&Ú˘∞®-,ÇÌ‡œ…7gJ<¯¨¡6£iF%ﬁ{”⁄∑D¢ø5yh—.ÿË˛k √ädQÎ£ãöM6ÆõqE÷®"[Lëµ„Ì€ûÓºaº”S¢çn<È0∆ç‹∞+ìüfAÂ†¥iM1äºˇ#à¶˝'e< 5•‚≤Ò§üç“$äÜ∞·µpó”Ìf˚e|ÅJøÙ˙uÇg&ä¶Ï%ì©_?Ω—ﬂ≤YÜfp¸◊(0«lπï?…>˘t7À∏ü«∆ƒQo}d≥IÇ˙aÍSy6v"ÜF’<gô«Qf√∞R*oõ:L®ú„L7÷72Uﬂ.∑%êße IÉV|Óbë5Vº,ÔÏÈ›_`ö[n˛±Ó+‰;´,'ë·]‰Q≥ÔÚäWπEj/v[yaÈj{iHm®Òùk%U’û∫è¬~N6òXÈü}QÀµbâ;;^~˜Áœ¥Tß…Buö¸≠.”M◊@dÙ>‘ V„‡_óò÷DÛ•¬•XÖ*]ΩµT@mª˘ïÃﬁÁÅ–ÏÏº
ÅÏ◊&ó≠.¢√bHg∆≥AòQuI<„fç$•uiHÕ∂⁄#Usqƒ„Ú¶]OM¿ﬁ¥P⁄îŒïLou!3ñ>aòˆ‡@ë¡oB…f»cBk¸ƒúï].òÚ¶ÜÌ˙kÅ˚´ªø∫®›c· ‹ª?¸UõI”*à∫¨ˇÅW +dﬁÊ™8›ÛÊ¢úu∫˘¬hÿ42Û» ÄNı∫Æ˙ºëÖäëU“ŸéOÁXT‚wŸ»Û=—[º™pëÂL+Ø}˙îEΩÎ¶„8Å]®eøﬁ´dQ¯¥~}^Z_™fM¨◊4ªÊÚBm]´±∆6(µ«ï} ¬Ó^sÓ—´ûÉ©¿◊—uîLDGuÁ∑å∏˚S“ÕÍ©_õd“Oäúx∞Ûy|sÎ¯›Õ’÷^Ö∑Uª/°@˜w0¨w≠ö§˜Çö<ﬁ pﬂA7¯d‘Õﬂè† ä? %É›æ©ËÚSÅo>ˆ°P?ö¥TU]~6Rj˜˘DJz0aª@fÁÊ§Á•£¡ÑwÛüT‘ä«x>)ùõM±<T´¥”C'˛}OìÀ⁄4>\E{∑ÈHÓ¨˜th·∑Ìﬁ“€„u?“◊ı&y∞ÿ.9F√– }5O÷öÌﬂ•A<◊&°nSÎÎér≤Ëoë±@nWˆÆyÖ-î±›s†}¿€f-¸x›Á~ñê—ä6U÷⁄a§…r¡t[∆˛áó°˛˜hˇ-eî»‡LLò$Ÿ,ô1≠Ê1èœ•Í˝e!Vº}Ì∞;ñV∆œäÌ{í§˘Ûk‘^u¯ÜÊ≥éMD∞i˙N¥6U&Ó‚k´º°Eß>aÛÎ¸⁄ãh çÄ‘™B–∫=Dƒ(á-jVΩé;Ttﬂ√ÇÓ‡P£µ8ô5≠ΩÅ€àò"˜”√ü$≠i˘-ﬁü£=ÓR” èÒú£EæïHiU”la…Ÿ-ww‚ßuÁÑ®”ÍXƒ|Ï>ïÍ‡‚7{U-±gl…√ø[‚ÇuOàäÌºˆ¬$]°jbª2Dﬁ LjˇuÀ˚_‰®∏›∞)ﬂºqï}¯∏Z‚›Hπ◊n≥5Äh{7Ö„z?πåD˝çáøÙÚi[‚ô¶é'l∂`ó:\§√KÉ≥ß7tJ`ﬁóxÒ88ª∂ñ3∏÷°lu”¸igpeWÀ¯ØÜ’"Ω†BjπˇÂd
S}[4n=_›»Îáô7å0ﬁ:ÃxSp‚Ò÷j∞Ú,bøÉJÉ·õ∏í≤£»ã√hÏY—Ãÿ?U8ÑÕ˘Ÿ`Ñ⁄3"|Nd}§!´≈{«ÓÍ£gêîêﬂJ@,
s|¨ÂyÚ√4J<ﬂÍàé·i’≈˘ÕoX ù„˚”YîùûM‹àÏD†"•¨±‘6cô±“¡Uâ∫ø§ÔäL†á©wÁINˇ&÷ªÂ⁄"i2VwéÖ≤på6πÊ∆hY6	IÊ™•H∫…{¢qı±y¨ÇU{£≤ÀΩ∫´⁄Ÿ8V!bp®l<÷É/Æ∏Ôáf∑Fc‘ïÇ0ÇÿA(PRjæ	‚Òl¬»QJÒ∏îbaÏ€ÒÒ∂⁄Êı“¶®jÅçs5õr/ñx°º¿[\ë∑&N‡œãq4Á¸q∑'ä@[z”÷¨#∂vjSóô"l)ä57•«ä£_'jè˚∑d+6Ìw0
[gêÍÖ‰P∏†_‘†˚›üºhúl¡òyYb™a¡~Ä}≈Bt√≥p‰›˝ÈÓ_…Ö
∑ r±=Ó˛o8“ ÑÌ„é
^®Êd]*d≥¡I˜/RMçPÎ€µJ£ª@ö^•4`Õ`0ﬂ7•Íƒ∂è“‡".ª›÷3≤£.≥ı«I_jStﬁà<tÆ™≠¸#v'Õ€0…Õ)G¸“á≥–oO¸ŒgaÏwG∂=äòäÈiÂ$ôà‘l‡ªJÆÚèÿá Äuúû}≈”?Xéµ
Z‰Ø]§‰ØU™<*}]6tƒπaø∫iôﬁ§ïQ∑Sï’Lá?”tOzÓ⁄QW¬÷.◊‘¢áïí5´$uµ©Ö∏@ «Ä∞÷¶É–«–ú.xéú∏˜©<ΩHæÆäiÀ¨zs¶¯∫gÇ/%Ωó<Hõ‰=dÓÆáÃ‹ı©Úv’zæ7 é≥È˙¥"[WLJlŒ1¡°ûëù'zs2¡Âq2HıjNÒq@’◊ßÌïyèy7£$Ωz4oU◊@q˜4mxõ'ˇ÷»Ò	≤∞vk€QÚπ˛®!ˆ€¡á¸WsˆÛOTÚ˜/È;OCjÕ_¨õTÁd_9* tc4Õˇ‘•ÅoL4ü°§¡N´WÄ∆˚
*}›Ót™◊:˜õ“}7ãwò¯PF‚{”ª?o±Ä≤ôbt
^ú}≈»(ë&˝{ê-≥,òz‰ˆ6M0€‹1›ë*c(Ê44√Øóï(Ê0ƒ7gï∂r^è"W≤YUN≠]1YÂ]L1µOÍ1ÔBdœ∞—Y–Kê}ß0Æevë`Æ,∏∆wÖµ	°Á(¸·‚ ∞$Í¡V8Ì+Í∫&«“J gS“52…äE+‰Ï‡qêe˝5 ıÖ2Ñˆ¶ö><Îj+0û/◊›∆Y‘4]≥ÇÛ¯ePä≤KÇ‡XÉ#•Ì-√⁄ë˙InWóüÇÉC›ˇÅTã†^KKv´∂˚œ¸÷8ª}ú•A6ﬁªT¯teÎJΩ˘f}YüRW∫_aäN©0U÷ô/Ö∫R<X©áS÷=j®r#r‡µŒÑ’¢4L˝:ZœißÜ§òFÓ±®F?ûM≤≈Ú<ﬁ[ZVäIQ∫kÓ»‘]œU¡∑Ò‰ˇıU¯ΩÏ¥‰kãWêai˘ä o¥/Zÿî±UŸáö∏¨ì¿KG„¢DŸ∑F%à±å≈¯¨˚Ñ◊ﬂe-ÜŸ00≠T&Îz√4`E‚,îÉÄ∫˚7ÑAÔ~˘€ç*úv3ôˆBπ_ªàk≠%⁄ºkn≥-UÆî"!BT’ÊÆ¨∞ÿÏqÜR≈í¯ãÏcé<ˆ@|7 «]Û–Ì-aôx©É¯qΩi…¶áù<ƒ…0AAß2Ü-»IËõó¬3@ˇëíÅ  HËa˘,‡œ‡Ÿ?¡MÙ∂'·yJ¡äM‚’¢êé⁄˜¸`ô≈Rƒµ^î˜”,Tö„ÏZ˚¡[˛2{äzÎ¢Ù
*Æ±g7°tv¿5çfx„Ùzàå7bK⁄R€∫"\∂ÖH€ ı0n?8∑w†c]Èû'0◊-€Ö§´Û∞©óçf1⁄oVıA|ÿ™◊'Äü™\π„¡Ç\8^!am‰UÔ	°¬Ú,¿,≥5«ìY;∫öÜiı∆≠
‚3ƒ≠(»Y†[˝˛l◊ ÓıUœ 1_¯Ô©ÌÕw·{aØ‘71œ≈ræÀÚ˜ÑÖ·¢«¥õ_}•æ≠â∆º{ûf +PÛN∑Â≥–ﬂbKÑ¿ˇDà˘˚T¸&Ù≠≤”=»nómçH,Q⁄9./Uöíè;Z®•4vP\©¥%v5%±Qml¬‰µjsÚGÉâïˆvÀKïÊ‰„Ó·IÃ◊xT(/ÉîØ9.∂ç“Ï]ª˚ã}§≈Æ%€M]‚ÚRuâ≈=◊¯‰U«ß\´OﬁtARlmåÂ•*≈=Ωµ˜ﬂV˜ºs§u/snØÄÿN∫hqzï\Jã”∑5?#q#YiÉ63Ìå0-ßÇZà9yAèÛõÔj…Æ£≤/0Yq+Qù'¨-öπiÊ‰Äm∆Rp∫… ≤ M»PΩd@z"ŒÇê“-:˘„mmTLﬁÕ-ÕT2ÙËP»í4ÔvΩe6¥⁄πı’‚æÒ¥NﬁœÂ"u=Î8£d‹=•ÕIÉÓ–ˆå	Ngw?{Jw÷¶åÓ¨Cj›ù‡˝ >ã2¶ûµÜ©ZËth}¬Å8o©Ì⁄{˛9¡%™∞d¨µF,∏˙≥mür÷ﬂ@.ÃåYBä*ÎÃU2g≥°P˜¸Ú∆Õ÷‹*u˝∫YÔ£)Zx<Oˇ”ë@çÅ\?Ω9äfŸm)Á¢é‡MpY∞ ∑;oíãD)ÉWdÙ“€_1Ω©X
±3X∫ïßQöz~Ía—¡lÊE$ìM$¿lóAS6•™´\’+»˝é–W¥?®`ÉÖó ÈbÒÖªaú(ﬂü™–?Cá=Ô∆dÊ»CÔÃUd®NA~dgËDfΩ]I8¥	›3™§nm¢ïBø4ä⁄ıg):∑œw˜øc⁄ªä¢ˇâ¨’6èû]«o™≈!]⁄~˜πå`Âƒ’‡ EâiI$äãkız
˜b”œåÖ∞+K¨Kg◊A ≤CÂH`1!∏ñºQ”ƒç€Ô÷ãEîøiQ« ç±º¯ 0Ö6êfØ‡(uB‹o.⁄⁄ZôÅ*ÆµpiÜ Ù<*ÿ°rÊËrj¨™%´⁄á
∫¬8ÕáS`”QyƒI§=qõ≥–ˆﬁ0K¢ÏÖ(8ÀaøÁ	Åïu÷ßIá‰5]–·8üπÛïâêE[ﬂ>+ŸaıÂvπ…»Ú0N"ÿºO;œgŸé4E«wˇ±ª…Lz!;‚h \By :W‘coLS≤5œô:Ã-›ÌÔ·”ü9¥ùç1ß&ÎπP–È°ﬁ»¢QßÛ¬üõ≠Á»~Ù¯^uPne-¬&ò∫c&)BX<7OD&öZﬁÂèÕ”œ5mÓˆˇié¶~Ææ˝ß˛Ó¸±°mÉn¬ÏU‚Ò@…∞∑à±)!˛   ˇˇÏ}€nIzÊ˝>Eà£VMì≈ì§Vst EQní»!Ÿ{µÇî¨Jí9SUYìYEQ]&‡ª≈¯¬,`X˜ŒE√^ÃÕz{}iæ…ºÄ˜ˆˇˇà»åàåàå,’ÍûŒô…™Ã»8«¸>ÌÑ•ºõÖGäÉ\›wE¢W>JÜ∫cÁÆíáá{Õ¨â);G”Ã 5'H…“£çÛÅL¨Q˘«„!7ö˜“Œåâ3u¿Q˝”
f†·ljÎîÿ≠Fº§≈Öç√Òá~\µÁÛüU{æºJC˝¢C πª∫hów
S˛¢AËL”wVùóˆ˛Eù«‡ÆWÂ(†t,öûﬂªœØª•a∂j(éÜE”œy∑‚ÁtR˙$5®Ìª:‹å´
•„bñ«KÔ∆¢]]ÿ∞?yÈŒl‚3Ú9 ˇ◊öëä3†úl•Q_ùC™u^ôäë]l√X^;∂•ú‚÷(âîòVz¯Fe UÎ∂20™ïZÈÒ“ÿ⁄√++Ldõi!«(BÂ∂ˆÿ´›W{l(|‡Á…â§†≤-îb6&›HıO⁄ﬂANKNSƒÖZ2Ö(›]¯Ú%È”ƒøRÚk24V¿âêÕ,∂€ÒiBô◊Øä
>diá>í˘:îU(Bx NNbóLÿ)nØM’	w0/˜±öÕW£sZˇHÀÏ¶ÉF◊˜QJ4Ô4ì€Ïë˘Dd{Ã·Kç>ü∆\ï%]»Xf“∞K≥=KNœ˙≥X»ªrÑb["qô√ÈG?‘}Õîg0•ﬁ£(+~3¬>H·Ïrk¡3ÂˆŸÒÜ%Ü$˜~Å8∆: u≤ƒrÀE@$üòKf¡C-é@öù|l[“|·£¡€Í9gJA5’Y‹.˛Ä¥¥
[±Ù^‚gSÀÊP_ÔπI±SÒﬁØ!Gî˝Ôaå
Î{≤-ﬂº¯áø˝kdÊ-!Îª9∏£Î9ÇÊ⁄©Z¯qê∫mâØ{k6Ÿµ–Âê¬ﬂÃeñ◊≤e{íRï4TM≈‚peSÈy≠OB’ﬂ`ŒU2]ù˛X=k”˜“∫f{¶õ7@ö√˛˚‚ﬁÌµtúøÅ	2UÂÚõötOX`¬#?~é°ˆhÚûyvVèJ¶€∆™äÂß‡V¶Z:T%™ÈõAb®G<Á¡€s Ùˆ4º‡ﬁFaz˛,¬ÄÙn‰≈yuıMiêICK._$ÉW>¿Âá
wgf:˝í‰ï,|g„2˛‹L:“‰ÔÙ±sK(±»(„c≤j!W∂“∂ÖI¬ø¸¨)<30£{Û…	∞Eà´˘@úªx8‰E˘∂Hh‚Tg™•âqﬁÉ#ì˜üæròØQvxQ 
)õ±ó√ﬂ›ËP«Èkı±Ωá-ÊL§ÃW‡!⁄!mp⁄ÌãKK%M˜Vì}qï∂{ë‹ KHΩqòûèhéU—≠Øy}ﬂ¯·"xËãZ*)R¸·"W"†[Z∆ªì^Ñ|Ê¢o`CQ¶‡ÌÚ|ÊYy∑ıC®¨’õÀÖ«Ôî‹çö˙LFH·c∏˝[Èí“{V˝∑∏¸Yöª‰ı:πtgEÍtOtEÚò'Jgqy"”o"å_˜Å¥è˘‹Æ‚ÖAÕS∫0¥ÕT∏¥Ã˘äóªY^ M|>7ç∏e∆˙K[°ø•qñ◊FœKJ√„,oêÜIﬂ$∑Ã‘ i’Ù5@ﬁ3”@˚®oƒ-≈ª—VÀ[‹GË·Yîï‹ØŒ¢qæ5ÕÔ,ù5{Ìë¨ ÏBè_%Ò{’W¯]»…q"#4µ–8)ŒpX—Ôúå∆O>ÏˆLÀ.Â‘ŸàÕn¥^¡AÜ‰·≥†LëÄ[ »†“C˛3ﬁñâ®§ŸOIú∞o’h©u∫≈o√HZ8f[
öqı9´j/1X´	ãs/≈‰πV1y*	ã™e‘õcXc‚È¥≤Õﬁ¡
ò∑µ^F£ÃF¬bâp,B)sÌÍ êç˚yõ"¨eòZ·tÿyüÕkÿ==‰’≈9zîÛ˜”5RWpé@|=+T⁄ıêúÈO%£U+ï£‡öÆ"ÿÓÊôÑ´ƒ…8e†69ÁM6ö\√¢l‹ùÒÙû÷gi∆ëaÜàÊÌˆ6ôtﬂãè∞UÚCá*]Ê©oÀbDxQ¨e¯*ŸÌ Ì∑;2ﬁç[+õG:,P’&ª€tH"d‹ìhí≈uï#·"®b{∫X¬S"î™O†y”˙CõÅ-«g¬±õÀ˚`≤E}¨^Û±Í⁄2+?w)I∏”∆S6HëÉŒXIyî≤[ªáÏ`g{ÁÂ—F8 Kay¨	±Zx;¶|pNÇú!å¨ë›}:â0:æ¶¨òUK,Í∆yUEFÉ‚h+*ç'Qø›a[ßŸdﬂ«˝îΩ⁄}π˝’Û=Ωx8Ë˙™ñ… ¥dE∑D™:m—◊8eòã7ÙMN„AõÁï”+∏AGC∑ÁSò`Jpœê"9XúQ#œÜ…ë¨#…’ƒı‰$ŒhKccÇN,aÄ±^x7!xªI¥T0îãåª”òbÈî's/?úåbô∆àôUáÒ∏Ö∏¨ÚÌÌ÷%T÷Nµ;⁄2iIöˆ„hÿ∂§Lñ°Ã˘≤dÒ(~K≠JÁ, []ı-≈çy
ß,µ6ÉSÔ¶m‹˛	§3naF}˙´GêﬁwŒí4_bËà°/@”áŸ≈„fûﬂN‡ü_G4Ü√tb±®"`%˘
^íµÂ!5Ò`î≈9¢, b	B≥‡$áIû§¨üûëgl¨ß˚“å8éªC‚•á;O˙ìöäT-2iS˙qî\X^©Êo‘´’›,ÑZﬁ∑nu;yr:ƒ;Á∏BõjäÌ=,JRä¬Ù| åÿ÷:NCØ‹CΩhøÖ™"¶≥£i˚∞ﬁBËr≤~ÉráQ†òﬁı8]eﬁÊØ√$ç"|Wèq*‘ÃÚòŸD v}˜a'©>Eı(¨:Z› "Bµ™OCoyà4˘¶j˝YeÿÕ&ç†í‚–ízë≥ «ì≈ú©>»å	ÒNqÅtOqeï7˝◊_`áb.®π‰≈áZI⁄fiÀI.ˆ√Jπ2ƒe˙n1—nÈ˜[Aì"Ï•Ω(Ïù÷Wjï©õkÓ∫Dr|ØYïÎ◊§xë≠*∆íw‰GSŒ=•8s` }æŸ3˙ùìÊ÷∏.ùﬂ@=PÓ›N™ƒ>Æ ‚{GÑÖjxCCù±ó]·$se˚èù†›&†ﬁbF'€?{	£3tZâÁeË√ z∫Z~§bπ¡Åä†œ„0òÖÒç #Sˇ£ #ÿﬁvs∏÷∂˝`` ø4–!)ÃÕà9d
Gnåõ‚à“PnîOãa—_b/≤ÿãÂıúXA≈¢Ä)ü©Öï"h`NnCÃ1KSƒU¿çu◊D{óπùﬂ≤E’éCïn	5GŒß-;Åá¶l⁄æ·ÜäâπízÁÉ—`J üàUª∞§aNÿÀb
€¿3¯ã!4R÷¨5ù‰qˆ∏ì‰[ΩA2Ù˘”rá”Ã|*%,ïáyçÈEŸ∑qú£IÖn€ua≤Ê∆ÍÉ¯4Çˆ2Søœ5=ŸÂ˚Ω+è øTÚ¡¢êdxÚ¥á<√]ò«úˇòΩìO!Õ¡ÌiV¥™(!KO°kÚ«ùû‰è≥’Àˇç\[†;;ùŒ;œ˚qSAsUÚ5íË=}ñ≥rèqì:<ÒXŒÎÈXp»–jWA_dãÊã¸”˜báo¿¨åâS¡áëˆaéIsã&¿Êb©aiÖY"∂Êà!∑≈òáébP=P)O¿ì)“Diá§}ÇÆ<K≥‰k¥ˆ—9HèìäµØVŒ´{åÓ$B•o3A°Åvü.Ï˝l<Èq;hîù¢—¶«¡{;¸˙Yoºè},–YC†„ﬁPΩk‹°5¯7xUC*∂-∫ôØ`\˚4ıÑK≥U—p
/¨ß¯Ú&∞pré£Á∞‚‚‡’ ØÔ>^!√:'àº¸i8~®çöüKª
õ√‹ÆÏF‡9∂B t¯ÉEáøŒ•CóàÊÆ˙X<±6(ñÌJaê:t’‡Í,ï'˝ˆ˛≥ïÌó˚∫ÑGg|ÇÇ»√˚W=“⁄	øC◊˜Éá.«x˚b8ºÅ˝Ê,ƒ‰¡À;ö¬Ú£Û=ÜÊ¡Àπo›Dè•¯˘¡Ùÿ
øTè•∏Ÿ·z®0wÄ±1Õ íGÏx√zäSPÿ	®e√núEÂ<…Ø~œC@iÇπÃÈïHsØ
Ú’ﬁE™*P–	ı2J«§›Mƒ/ÕÓÔıÙ®∫SΩ≥£m√çËdqo“ç[≠®€Ö=ô⁄ø≤œòpî-Y‹d^åÖ,üu/ÂØ˘p5à[ﬂ0å<nï¡Õ+lK ¨…a—í‹TIxpå“A	vZË˝ûlBKéÀTO™ÅJß&ßS2¶ÊŸ$7ö≈)|¨µ8/?9X\bSîUì¡d,„∂Æß…iÇ$Î’Á¨ûÔ–©éêÇÒcéèñ@É£S§Â◊éÕK‰°ªÅ*Å ·Q÷¸G!«UW∑Ü…/‹'üSHóe€+–œ Œ¥≈¿«g<RªÍõØ√?ª>ZÁ«?sÖíW¯Öy~›eîôZYÑ{9Ú0ò r7BÍ#±Ô¿˝¨ΩóC?§◊$xWA˙}˝¶MΩî‡+¢0mw~≤_3ÿâ”vÒ0†˛?Ã+n|Ì£¥Û,‹ß	àtÆk· á∑ò_G™`† WÑí§Ö	Åqó+™ﬂyp∂'AÜ†êEµ¯#O¢åê:*USDë«J⁄¢c?ÖqSZ˙ÿôÛ<¶·»˘+ù‰/‚·R~eÛKâï∏Êé=äY›r EVÕÆ◊™ŸÄhS∑@X‘&ıDƒù¢Î¨öTÙãä=U5Ë©2S„Nd)∫‹&ØU	Œ%òâ⁄«8e!$Ω≈˜Ñ${üÏß†µr√˝T∞$GÀ=öMyË.J6wÇzï¸&+L.?¸ï«/{Èç¡∫£®œ£J'„Ñ	‹™Œ≤hÑò(È;5o‹c–≤∏áæ=≈¶Í[ZqM “ÜñÙz0∑áË~»`/ƒ@frFÄVN9ÍP•IÕ˚∞ºëo(Xåàﬁ∞4
9epΩÅ
#—VüÇRÛÙò{◊ZÒ≈&è˛ÆÎœt¿÷ ≥1O€6Áàz°$C-â„ Œ˚FÓTúı4º|ÈJóåﬁàÊ¶˚fÚ¡&˝û•ÔÒ˜äc`É‡I·ó:
p'ãxùÅ—[wãS∫	Ú[*Òàh°Ï—TÜt]NQ(†`z‰ı~Ãﬁ±˚gv~ª¯¯Ún‚ãı¯E≤6◊R™»Ûc{ÔÂ—¡÷—ﬁ€√£≠£Ø·«ü?ﬂ9|-œ3¬2Ôë‹∑Úı≠¡∏—Æ©.˝8IœghY$ç¢πuåZîxRA‰È72&:sÒl–aaè	Ë0,‰—:‘(•sÍ¡øË∂\˛%—w°áØÀ
é◊e≠âÅÍŒ™
¶«OJõ=¢:ùOW	˙Ïó˛Tçîƒ≥X⁄ı∑Ä†⁄m¨j}EÆÎ©˘_”GíF≈È$7ÀoÊvTÆÖdHvkz“ÏÎ.Ï˝eﬁà.—ÌÒﬂ©eú•+Lïﬁ≤n∏ô‹ì∞	|Å'ˇ•q°Äí©÷î"ËØ1˛b0#›˙=x#€ÁS≥ä5” tÀCg2ÑvèÖySÌ^e"J°U∞¸^h§ÖƒZJ’3ü?0>ci<yu YDŒ¶PÑ›0(¬@y3Np;#ÇSH∞[Fk7@T^2¯å+¿[§≥IÂ3…Aù≈Içﬁ+û?˚É)é0Ô)≠ïA∂ÄésPìÉ÷W|ΩÃ"åèìåtÍ˚Ë∞Âån<’?
á´h¬E4]çÜ'⁄z˛N®: iÎhuAEÅ≈Øàµ#6¬ñó¯Û˝Ú}ä˘ö	ê¶eÅ>|Ù`ÁC¨î‘É=hÕó2óîÚciÑë;&å}3Ÿá!Õ`–8ñù†ÚN'ò‘äYÃ=/|Üzâha2…(;6÷å8«¿e4÷‰dWê∂ ¢O
+KË´FH.õu%z˙¬l≥Rò7ÎÏegU≥\…áÍÀ2”æ+-™Å–÷x·≈îó*k´OÏ_»èã@fË›˜i÷k-.Vø‹…≤4sÍ{.±v¯¸ ¥Ò:ÏÒ∫˛b´!QÄeTıªñµVÁ@£¡Œí∏ﬂSEæÇÁEìu^¯çW°ê}¨Ÿâñwâ°∂}FÁ$U‡÷”uÿ%ˆnØıCcë˙˘Â-vüN¥Ì‚viq¬ìÜ<¨x@Å<p;L ËºÎ/º‰$')®ô≤Ω≤]l'Á0˝àS~F<ªè1ÂQ≤s}„;ùÎÆ Œ0!‚?ˇVπ0©™ÙWŸ2„=WM⁄Uì¢¬–hï+xË≈>∫&˙òã¡$EÁ8Ì}¿£˝FCBÖ1öû¨°8?ΩL€rœH¶√–@3GÆ'l(}$m Ô–€)ˆzg\ÎY”-c/Ë#LY@Œg)wOE«‰Øöî'Ωù)¥ò—ﬁ∆p^#Ò2Ç„.%(∞„~⁄˝ÕãÖ∏[Ë(Â´Û˜∆@[ÄxÂIÙu,ùD(ÕeËYÀ”Ú8°üKd€@Cayõ9œáa„¥’˘¡îã;s≥∏;&|hÅµuƒ#N·ø'∏-¢‰CRÁ‹WMΩ≠-˛≈ŒÀØﬁ~˘vÁh˜≈÷”-x”∆˙*%⁄Ê)páX/Ó&=8r≈I÷≈Å—≥pò5}7ñ¥e—6ÙêZ
ã6û,≥bè®/ΩÙ}'„ÏÀïÏ≠Ö˝í;˙¥˙/¡X¡ 
P•˛ˆÃ«"ÔÁP¨ƒ6õm%v£>b~¢OraúéDûñ#ÇÃŒÁ	,°ß¢ó÷»∏È}—Ë}Üg(\Øb_Dö3‹NäN¨vM‡tåd™[£◊Ò¿å»WJ-Fy7âÃgÃ˚õª£{‹ï 3’`Ìü#[zÙu“lØ·ÿV∏
Ò}<£-º %Ä[xÓÏßy´—©π©œ›«e0€4ÊÒΩ;c¸±JÒ’©œñ˘{†2¯5®——rµ…^D„≥Œ ∫h›_ø'√ïüâó≠Ø¬Wj5~ïÙ∆g¯≈⁄Ωvª¡+/õÏQŒûêµÇj¨’Q‡xtıÌ’?≈°b¢“2ìx[ïQó‘h5çiÕù∆‘‹ˆ≤™Ñ√/“,~g»◊◊øiê‚2ã^*#øçeNﬂê•íãcÅZ T&∏Ÿ‹Ëtu”À`e&CnóÏ”Åswœä¯4uiÉ1Œ!-\£xíc„ ï-’WY”¢à‚‘÷“Ú*˚z˘ı˙ÍÍõãÖ–#Jáèõ¨A#1)åNß|gµèntK≈ˆË∏áΩ$65«Md´ﬂ™Ù&ı‚⁄X¬w◊KHâ˚´f‰w%ïÁ¢/π^(˛˚C·Y-mBU4Ÿ◊.Ú“‰ª’ç°OcòÒgq.Ìc5xÒ5<˝wÉ≥‰Hû/V2€∏’smØ¬AYxd3ë"Õûßß∏(vŒìﬁ’? >dﬁpÉ®Î.Ifcö?f7Ò˘‹“GU[π“i˚òŸ◊˚kZ	À}Ã˘ﬂ‰È„ø≤÷Àd7ÿ¶Û´ﬂ•måLòkß
hŒ˜Z‚J|è˙v;}–{V¥&ÑO`ÜÆJﬂ˚i§‚é|è:K÷^Ô0éDæˇÙŸl=¶«’Ö€nÎªºÍ˚R"Ú~è:]§)Ë}é\¯≈’?bkfÎ¯p+1ß2übûÉ‰§“‡,ﬂè1Btö#¯ª:HÅÑsûJÊ<◊ëG^ºß¬◊°p<Îp≈P∫9;‘gu“éè<î∏Rø(≥√e˜˛Ûdh»2‹õR2œ<˛Õ&¿w‚ﬂö=sı‡~GÛav—÷ÊA˛8[BÀë®UÕñ*?ﬁF§MÿÓ¡/¨áÂoµgöVÜ≤{∂<RRÑ@ÒêäÂôKWÇ“_&ÑFß)YwaDœ¢¬BÄÓ5‚—H˚_ÕŒT*‘—K
k⁄è».ÃÄ	‡(˚§F∆$NñÔRóÏ.÷ÉT]3G€_.;ƒ_:√
	P/Ó~l’‘\za˙qcÍ√#,gΩ¡˜≠›[%Ãqîb‹w⁄b:HzÈÕÛÊ(»°˜MG
ÛΩäe'ˆEƒ|d‡‰ˆö˛H€ËG}Ü‹#<ÉÒÜ6VY/¡}H∆¥ÂÈ ÛŸ†°ËøÈ
jà?¸Âc∑ß=⁄ zî]@à°6¯P˛aë"ˇT)Ë”Õí∑4˜ÊÚ„#ÍHN…£ÒhQÌtç4y^dç"õ¥ë˛©ÚÁÌ◊w¨ÜF}1E<áﬂ‹1‹ë+BËfˆê·Òô∞Œ˙7ÿ¥‚+á3Gîs˜ #)2ÛaÈÆZ]¬©ΩÃ?Ä’b`ãÎ”˜Ñ(≠‘¨ƒën≥÷ZıÅ˝ú›+˛Yø”n;jQìM£AIœ‘¿§ßóNú'ô+^EπSl.n|À,Pfbb™Ñ√˚pﬂ\ÖäÏÃz≥¥3Ä‹»§,C…"˚´ìÉ†∑ñÔœí«’$°Û«Ëùï2¡%ÜFÊ'Qø{ıª¥yRY¿1<sﬁ„Z%Î±ò>“XêÊïŸSmÂ\ˆÿhÖÅ$zäÊÀö‰ç∫∆x˜n9·¯dDƒÃË©õyˆæ±%Ωï˝Sàñò¯F≥	_˘Xn‰HprI’hÛvH∆äΩñ¨å¬Ω™¶dPÇ≤2Æ€˝ÅÈ;≈IÁΩö¥°Ô≈Zﬁ˚ÚÀÕ¡†6{√	-I¿∞cò∑b£ÎÓ∞∫T/£$NÊ4ãÒ|¢&¥+™Ië!ÊÜ…ìãj}^T…¥ƒ&Y®W¿€¬˝∆gõün¶•ÂÊ±jlEï„IL£$c[®⁄ÜB˚¶ØÁKÎ|MM¬+ùõÉÖäD;oyæ4¸}Li^í"}â*:£`_ñ˘…K˜ïÊﬂ VŸØÖúü~™ræ“/(ÏßÕ$˝‘.ÊßﬂG_ÄÇë].Õ%ÌÎ7»Û∆˛ÇîP`ÚŸŒhíüµπ∆^Â·Qüï!*ñ«•1ŒU@∞Ní˛®êÑ*$–W*»¸è¥™u ∆öH¸Q›¯æ©Èw¨k§E—ò˚íhÊ#86Î<5~Ì§@	]πìÊÛwˇ˛/≈û'Dm*o‰àÑ Á@CXãPV@Å¡åã∂ux	ÎjN©©9•ﬂ_µ©8Ó[È^q∫©∂˛®:}g™SÈb˝xäSÒŒ 6µ ≠È{ Ïh˙GÅ˛‘5¶≤Sj`Üm
S◊Æ0uˇà¶Ó5&Ÿxæ4¨\[gÍ˛®3ÎL›õ‘ô,`?ÍL°ç˘u¶Ów¨3Bf˝®35©[ÄŒ‘˝˛ÍLb÷[e∫°¶˛®1][c∫√4äS
Ò0ÃT•ŸŸ9ùlı„lºùd›~ÀvÔ≤≤5î,0∂∞€gï'ÚAe˚V®dû'ÉQ¸5Åá<Â|5gïFYy∞l∫°“<V+y≥≥´o8GbEƒeÜ{ÌËÍs.AGY…∞BL~w¬°„â;¥ÆÓ’7ÀPD=H≈SP‡f•ÚïÕO.€JÕäuc'£ΩlkYDlUßnïP=≤]À¯-c?ï/dÖ„ËÆI9T,ee.∫ßÈFµ:ˇÔ|˚é=tÙ+>Wùù\˝Œƒƒ∞oïa|P¨_Ìsä‰"'{ëˆ¢>ËEá»æñ§•/„Ñ †Ï¸Æ¢‹$«Xj‰óÂ–¯·ey#ÏyZƒnıâ÷I‘œc¢ΩõcN˝ÒƒÂÊóò–â9¢Ä2vA/‘R·êurb≥\‰±›E•ÑŸ§kﬁ/»N(uôNZ±˘∂2ΩTˆ•ôn„lg ß®ﬂ.V˚SAúÂ˚Jm=zEˇ¥x∂[◊6j»ÕeÌ;£µEe)∫Ó é$qéEÎ¶A†rŸ“jº√Óõ2ˆ‰¯(Á"ÆZﬂ=.vç≤Ã‰xvA7;fâh¶dsVh.˘i#√∏e.~ˇî 4tÿ˜ æfõ–l6ˆ„¸∑¬v3ﬁ2ºnIÁ˙#/˘óÒ{y Á≠)Ît09l¸A˝°ZÍ∂˜ûÙΩüDÂVÛ…L¢ v>âÏÚëcZYìÙàÅ4Ó…i '¡(Kª1Ëu'∞] Ô«Ò®eüÎíáÃv£⁄ì®ŸWòﬂã¸n.[≈≠ê'QF ,yy8	3SΩ®"•:"üXÙ◊°Wng∆äqs6ÉcS"ªn~Ì‰ﬁáSŒàÌ∞8ôØ”ÅìÌ:^DIﬂMq-…úÂ,´£ÙVú7âöY“8WJ‰ÙFO—3§PvÏ$¶ lmà=—Àcm∂<ú∆⁄ b≠”å≈Z”f◊÷∞X£6zQÚä{6q-”˛¶H¨ˆÇõ•∞û/…¥Q⁄§èh|oA’e>∫È´ø°Ÿ6›ÿÏ∞@”Ï-°˚ªñ˙+º´YÒ'YJtMá?+nÚÓ&ÕvÒTº&—≈ÚŸÚÎı{Y<xSü Xpï:òJKÍX±˛rèM8‘ºz=?∫”Ló}òﬁ≤7EnO¯Â‰˚⁄W5ÕàV—Ôπa)Ñ∂ﬁ#À:Ã˜8≠«ÕÍÀ⁄ ND˜p∑,≈√'~ÌÜréTÈÇE…¶ÀZSjÃj8π6⁄vDè¬bg>Ω„Íá0∂]Ã˙œ…˛ñ~ıs ∆l“‚Q`J!>Ú∏c|éŒ#o9gQæœÅ2åá’<õG˝^∫ù°•)i_N–vÖà	¯˘€.ˇ¢]_æ	&•á¨Âá»∂â⁄SñÙ6âótâa·ÔhÀ{;$ÙxBï«œJ¬±EŒ&π“UQA‹ác.lˆE/7oÇÕ¬ôÓGçÓÎnßüû‚4ùd)¬‹s◊0˛÷K0@`LøwìÒá7>°ZO“-ô>4Oƒ'ê’"Öuî≈Áÿã~‡Vê$ÒFoøX`ª≤Ω˜*Æh}|OŸF«ˇN1áè¿ØoªínŒˇT‘Î¡!êoÍc¢ê:{ûæt≈x–Â∑LÜçZ˘ÿ8õxü™bw:)ΩìZ⁄È?≠9-›m?Ni˚ıINi9h7?£=ñ˚#ó◊`Ûvƒ=	üF3Ÿÿ¶Úg¿°©@<ÜQÊä± ^ä2
”bÂΩô†ƒ•…Ò»	ìa$»Ô6Yzú%ßë?'»] √Ií»·7`uêÂà˚.
mV;aD„°z=¸¸tídK%™<¢ÌR◊ÍKπ0:OrÙ2Ê9≤†„?ÈÇŒQô&◊:|t‹7K9)ÑÄÅ∏˚i|<VÑπô¿2_2≈≠ÿÔ0é:‡]‡™£D®v∏O	ü»Û`≥ËºπÑ¸Y é˙Û◊…≈L&cFlŸ@ç®ø‚rÒ˚ÜÚêÉ>Y;†‰º≠t≈ÖàÊ<£*QqïB8¥ßTä*ÍµGÚìF4’T #Z9¯¡≈pf«∑—∏,Ïiú√^ceÄÑ˚™ê¡Ø¨)W'É„Ê;∏·›ˆ`E5ÃK	é<Bı}ìå6o.°ä∂~Î@}∆ëÓdb/C˙§µêõ7ŸÙÑy	Í£Ÿæ∆7ò AiSMáâ¡,+bn•DyÕ¸ÃƒOƒWC¸t˚∏˙Â∆™hs›ŸÂâTÆÃ>›_ä‰ÆWOùı4…GÈÍ˜Áq≥·s≈Ø’“*≥ÅÜ]†RŸ¸¶˛úÁïbW˙∏3J	¿2Áì[ıgS VôKH∆ÖÓ‹1NotÒZìHó=?…iVRzügÈÄXx‹ó|ª^_Âj’r≈W~W”ø“QD“ÅÙè—Wë  Yè(fbç÷ΩÅ›L4bYo≥¸tmUxa6éœí°ˆEµ+ÍVI5àZ≤∏z∆h?KQ¡√"1ÓÅ§xbìêZH∑Ç¢ W∑áÕu5îÕuuA2º
%ƒzÊ‰Ü-Âa‰£/õ*Ë[l!,∫k!,*Z®€[†’õ¥µ#l√éqëø.©F∂†.ö5Q†yÎ£/‚<èN„√ﬂN¢,û•/ÎvºôÊï»Jh∂àöe∞Aü‹πÂ‚…Ù·‡Œ¯Æpt´üY2dù˘∂à!ä bY|RFû‡SÙÒA|r…˙—q‹GÑZ–”æ £TÜzta9›/›9÷àD£†%Vî¥…Ù†›<Ä]fÕ<ÁØ”Ÿ„H÷lÃ®ÎãüÇKt›ˆŒæ€é§≈P}“ÕÍ2¸Áæﬂ—ˇ›x‰^ú◊(€ÎÑ-_˜§?…ÙóÒµæèûßÈo&£¿P,∑∏BÅ)ä¢_ç†TRrÀâíä.(X˜…ßÀàCò“—Ú(0YÎÊ^‚bE…esıØËHrÆIÛ}Õ!‚≈ÿF…∫FÏï◊kæCÅz∞e~AÁ≈¸G+Ë€k7ÇJ	nÉVŸÁÖÛŒY«“øwÌäñE◊ˆ:ª“> ‘‹'≤¡≈Òﬁ:¡ïmgÀπqQmÙπÃ‰o÷n·<wµ≤2,O¢$Ûât≠^{@dA@ıÛ-æGÏ√>ÇT(VåàƒáwãñjŸØì!Ë(QâœàÛuì≠.IΩ~w˚.ƒv¶>πàBŒ¢Ú¯ö˚Ò¯"œ÷R≠¬á{ìå§9x§≥~V0ÕP¸±;‹õå›)ã°∫;Kz=ËŒ2ë«˙¨[Ï
…ƒ|6÷°I¡jKQπÖ
k Îu≤8S‚#fë‰iî‰58◊ŸRîR¥ı˙4SÊK‰w¶òπˇ˜–k„<ƒä€ØêEÖÆeΩ9€<Ak’ˆ˛3∂¬0›Ÿ∞0è]RñÂﬂ(ï:új’=¯g5≥”yT0;ÆöﬁèI/Íπg˘ûÆ-k“4À»Î¬Ké`Œ™¢;„˙ö
ï2á båv?ÀMY—∞éó—nπºÓÓÛÚ—Îw}YVÛF)ƒüÙÊ˚,¢!9…“∫çWó<ìA¬)
øJÎ‡v[ÓõC
)]ÄπèP˘‡ñO© tz}U+Æ·ÄﬁÃx5Mƒ≠=ªÊ;ˆ#ÿKWˇgò§ug/≥ÿ∫¢^èóêBÈ˚7oıë¬∆©ƒb⁄ù=ÿÔOrçNÎ˙-∏™ZE—ÿ‡0yœ∏Y–Ö#dìmGyD`}∑Ÿ∆›’ŒÍ*H™€®Ú”˚wÒ√öÛö.Ωm√–˜÷hâ%ΩZÅ5m+¬Ï‡˛*£˘hì> ‚'ÒôäK≥$ÌóSÇµb—èm_8ì∏ƒÓ4Í(ì*¿_ZIAõåPd‘VD∫dâ-*ÉÆhRÆ*fÕŸ2zJgKR”r3‘>,≥5dß’vp=Eae∏”!e#ÍÁ@—m<Æ“q⁄°ƒ-~T’?©ùeÊÂêÕwˆPë◊ù7Ôó7÷`≥∆é ï≈8E*˝ÿ6ßÎÇ9ŸHë´ÍŒù∂{hgîR¸Añs*ˆéÛ8;èÆæΩ˙ß∏V£«“¢,éº=ñ•Ôa/∏„ü⁄Rﬂ¬–g^FI≥†d≥<=ŒbÊQÃÓÑlqπTˇtlC$R/[vr†1 o‰z¿´Œ€|ëXäXÎ∞$qï–MæØŒÌ_ïG€V/c≈ÊYkΩ.Dô
ﬂpò≠üÈ< íh8~∏pzñÊ„˚ÒÓ,Ë6≥°%]^>⁄ÊÿŸÉï'ÓM™“Ç<Ó¶√dp+¨uîY@∑óˆ•c†-vÊ«lÒE<Ls∂7‚Àô¿ë(7Ω¯ƒ·≠
h¶´IΩ$èé˚qè–Æ0XÈ‘À≤¡¬√G!¬EüS‡õßÖfyÿƒ√®é,‘∞#P˚ËÔ¨i√ΩÁóç¿9™™ç#o•>U≈ç∂RΩ∑AíP’ﬁÓ»n(”ÀC–‘∞ø|¨æWP[LHΩFï°⁄ü¿Bd≠*9c€=ã@°Ïh⁄Ë>X°!,6≥Ú-gΩà!›.kmı…∞ç‰‹]˛¥ ‰(&ãÈFåó¡ŒÔ!w9q}wìì§è"D˙SÖÙ„,Zb'`ºBz/J0i7Êì‚	¬d¿¥Ó‰ÔaNO/ã“ˆÃD´?|∫ï¿,≠‡]*"Ô0Ñπgp®Ù«)ﬁ,ŒÌ_`RQåŸjÙ”ÖéõÙÈ˚Áì.®»œìﬂ"W2',≈~ß
j'±ÏnÒ‘¯;Å/M¸:π!w	{Y@ÏË˝≥≠·’7˝$ß1•˙HÇÖAO93¶˙kiëUóç¿COﬂ1¡\{BcõÁVLXU•c‹G±ˆ/c|é•ÓG–ÙIπﬁ⁄≤‚/¶G	†∞˙z˙Æ˙Hí?ÉÓ˘∞%Ω‡*√€©âè*o¨ç*4Êpc“zÎñ˙"Ë<•™è†-–T‰ä˙≈&CyÁfDO-]˘≥Á∞ 8v/`Ká#∞œZœ”a%m¡“¿ú¥9=€ï*R{ÂÉO≤	%ÿõOÜlÙÎ7∂Î,nµ¢nwâL$ñ≠Ÿ†Ω≤\¨é®KüËP¿][&CBI˙©TÌ´a2∆—c|çèw©ˇË®Â6à+/¢—k˝é768 Qn ó˚CÿpßÊÓ"Ó55G¶¨#˚L©“œe1Í›óK÷I©ı1¢”‚±≠ˇÆ‹∞iπ·ˇAˇC⁄ú(2…sî.V53∑;¸©múl' åÿÎ	˝â≈§ƒcPŒÉßYt2ñ)’1Å0“y7KHÅ≈ı<}/Éæ:tõˇ*üµEµêƒá$Ù1æuS>®¥}±mêˇA+ª†øç∑fi$°óÃ‘ FO∫õiﬂ´„Z|R¨iƒŒÂgLˆVÅ≥@ÔÛ’∂œqz≈ı,.,•ãÁU¯üºÕ÷|¶æ€Òly ∆ÀÒ3µÙÍ„}<≈Ò|”Ú•mzŸ,∏˙Ë µ·?‡≈Sè8eK•–˙∫Kc‚7qﬂRä≥ÊåáGè¢L≈π|ä3ø.\≈ï0OwWﬁ/@!	’óÀöH˚¿°œïMO7Ia·‚q!WKò£Ú@TCp]îÂﬁlñO¢ﬁi\≠œÁ:øGôù´•Ôk†lbH»P·2F¸ƒlÄáÁ›a±†
[«≈eÁ!*∏C	/´9 Âa¢Xº˜`±lÇ"ÁH∏π/ÚçJÈ©.◊Ë¯˚√_˛OÇã;vï≠˜Û‚qù<5•Ω≈÷>Ë¶∞·¥≠≤’‰Ëäˇ¥Ò;Q8¨µ}πdbcté˚i˜7èÑörı{Æß‡¶ÂûﬁÊ^÷Ç-ø∞T›]qR´jÁpÆ“ƒΩ‡≤»‡(ôÂ˙Gåµ¶ ^]‹ª⁄æ¸i€:VˆÜ€a]≠∆o‹í◊:R`OÚRBo¥5Ø:∑ÊªÊŒÏ≥™7áﬁÔ:6_::FzìiX±fhK⁄'ÏL“tÌˇœ£ûV∫>ºL	btÆ˛ÜgyÕ¬Ïg≈µ∂ê§ÓÍõq“5çﬁ	‘	≈TÚ(ùÛ\e¸ì¸∫Ÿ-qXÒ—Ÿ‘´D
!?Câ∞VU¨gΩ£Q„$D◊OX‡Ëƒ0À`‡
Ùä®Gõu|2·!„Å‘∏†¸Ï\xxÕ∑G(‡?(c\x17•OWﬁ–H≥∂÷oó⁄_ßhWÓ%ÉÁÈœR≈{ùö£IfÀ;÷∫=5>ælø√Å¢O—ôß›Ü¯ó”‡ﬂ˛7∞∞‡lU‘S]äùL¨|˝EÁnÉäÚ  $†^¨æ_~Ω~á£j~¯Ì$é1^ÙÇMãπw9ïùê∞mú1…Î§VLÅÎÂâ{Ω’éÒ∫¥Ì‰°¸CÓS~Ω√∂ªÛ/Ñ⁄æáñôòmt§π[®∑?ˇ7s¸ÉÇ6:N£¨∑}√k‹bÄ&tÇ †‡œå·Öz∑»´o´PÛ|bÃC ô◊/	(FåyÀ·Ç ‚ÛNÛù;µÕv°¡4∆Õˇÿ7›jÎ%æ/Ÿ—…Fä¯ÖIèı£·’∑◊=¸Õñ’Aıﬁ	>˚»áp√&◊Æx”wb®≠9ﬁ£qƒÒ≠"Ó⁄È`‡Ãù◊Ytìa∑?Å¥è—´"n›dÔnO˘ÔóGkÎõ´´ˇwB˛Ç÷>á›Do$8ê”HnÈJ∞"œ  -2Púïi¡9Q‰∂ÖÊ∫çU∞—:W¢5√ﬁùUcwj’J˚ÇêÈﬁùáAIπ¶Zs{ı∫wØ.	p”ﬁdû¬6eá…È–S@ï÷ïHÏÏÇP`øP∫÷˚´¸û4æLµàí3’óL6íœT§õÖo∏ ∆Á<ç>HÖ¸ml
0=–GVoV}8iXg’Ñ™¿Ì‘›fºV∏à˝rZÿL¢≤WT†ætÀ⁄Ü«≤V^(qòú∆bá⁄}\√"rñ«8Û?*q\<éñﬂ‡Q€¬m∏Ì¬h“ôåJz≤GÀhâ^$?øÎWπ®§¶È◊N˙¯⁄NÂsTmpN˙Wﬂdâ‡ÿ,3]xHâ£†Û<≈êúú`•ÆVïúÍ
ÒN)g#õ7Wó]∂ÓR€oŸ†óÈy [µT4Gç∏ yQ’Ï<bø?xçÂÉMÂœu-vMó~cä‰ÉÕ"-—MºldÔnÏnoÌ-Ëq…òﬁS4îCOˆ†ûÒ ™äá—…E2ÙutW◊ó&ßﬁW¡q-_p≠ß+‹ôozWº⁄zæw`Êé≤¯$πÄ·∂5OP∂É26BL7öåOiDúöT)ˆX£WÊﬁ-ÓP{cÜlm1ò&˚;á[ˆåÛb0aô:‹w”ÉæŒJärwC√Çà1‘ñINƒÃ¯’ëΩ(∞ñí>ï)á¯›v˘ïÁx} nßô<CÓzŒo¿Ï≠“ºÕ ‹∫*ï)rÜöa)vÕ‚æ¨ÊB“q∫“„[©ÁX˝l¶ñª}“◊F3£ﬁALfnLEÓSJ1∑	’€Óå›~CÍ{™Nv?,ÿ¢»{pÊ':)Ïá„Á¸pv	s◊ºÓ$õªÁ´°ìkè÷ˆêf7‰∂πy€ô˛æ€ﬁQîuö„∂¿ÇkuO…∏à⁄h0ø?«v5ŒbY≥e±Xø“h‰€À$’WyûO+˛©Â◊Îoò‰ùTMUÃ;OÔ›Uuƒ‘¯•≤E9eìîÕ±ûôïJ∫ÛRÿ∫W#gˆç´k,c^˘H—±.€-ÖÀﬁí€PJ,ö\$˝)B0#`0Jâù”lÑË//≥<D®e	“iÆVjÅíyäjÂëØ≥Ë◊ì'9π }˙¸3û˜–.©OíôßX‚dòtSÓ>uß("~`Õ>–o…^e˛Å*$ÒDÉ|†¨à0ÿäYÔ	Ñw–†zá9®,éd‹±á*§JÌ\å2ä\]4ô´;Gç∏p«·8}Ω∏ç;◊˛Îˇ¬?≈Æ˛yÒyémP.2\W◊Ü±Õ(≠√dƒú∫÷±≈z`äòJÔáy1M˙Yy†[/„>?R¢.¢ÄnÊPAúJ~S=ktµ›vÀåôÁΩˇ9ˆ¯}¸ÁÍ˚ˇ˛âı˝ÙùŸ˘eG∫ªå›ûsmÑ˚Í,#f'⁄ïµœJ≥µx˘Œlˆ\«ıéÊ]¸Á˛≥¸÷Â?ŒQ]√±\«6üœ~`£˙Ÿ·®⁄á)h0‡XÆG»©⁄æ#À7ûäiN´ùŸi´ÜdjÎÆÎtOÁìÏütn∏O6ÌVB’ÉV5=HÙ …°CxhV≥˜¡√⁄>∞HüUÄëâNmÚ7ƒÆ≈MÚ(#3∑€˙˘í$∆9LÇ“jh™dµ©„[D≈»9#«iñ§õ
˝c?&€c#û…:≥∫*Õd⁄?”Ë1µßõÙí¨‘ûê»6N"ì;4©c ÓÒRA*ñ‰»Q)uá}%‹ÚÑM≥qCÍ…‡¯õø˚˜˘+çÅ” ≤Íhn-Ì≥$aY©|†ü?6ìàù¨–Pºê§–“EéV !Mä… “'åŸtëŸÏuu+”	T$≠Ü3P#¢’(4KOÎ¥ˆwm=ΩÕIU˘¯ß öaÑ≠@]ÚÎ´o,Ï© " êªae‘õÿ∆´vìàı&_Å¢Î‚V,(¬C»XˇÉ®æq.®(æçõÆ6à§Vƒ•óÑı÷	f˜∞˚VüÛâ¶D»à‡¯ŸñD”œD˙2>‘=tHx)-ç«ı»ùDG—qkÒåûN∫©=jœä%n·1FH˝†,x”Jq@·4sûúrñ;¢Ö˝8'ÃéTé‰Fd{€;Å≈bËä‹¯æÕ∫
¿Õî%í∞úqäïç‹J9Ó$ˆr¡ßíìﬁCˇÒò‡°+ˆdÖBy‡kI‡É‡’ú‚@˙˜f‹Ô3øœÃ˙Ó°|üâÔ]ö@∂wÉµ=Õ;UªÇk˛Sô©€¢>?NTº>•â*GÊ∆Êiú1vù„∏I»çƒ
b'∆…IcB`“€RÊd/‚|ê≤-PÕ7q>{5®–^]ØÅaCCâ·*üsJ˜ohUú∆ÖÊÕˇ,¡˘Pó ]\c≠∏ãB§.õ‰‚âbπ\ñ7≠@-ƒ?‘€ï[π>;Ö!Ctœ”=≤<=fÔ~9ANˆÙÍÔèÙÁ«í`?π≠ﬂÌ≈¿TœòU"¨CQ∫≈πlº¬|™Ó-Uî|•r∞ˆ,ÓûE\](ß◊ ˚ßÂP≥(Îı˜Œœﬁ∞O¡RnLÈ`€÷≥ŒñÑc∑3Vƒà˚¿ón⁄Ød≥òåA29c\#
a“u6ú?G)raû§ÏIîm≤“¬'4>°äzåÄhf∏ï/+ÕVﬂ,wΩ“[‰Z%í„˙õ<dK¡∏U7[´°‘Eœ¸)'ÊÎﬂ/ŒŒ‡?®¬˚Â˚¯„~∏9÷éÑKv'.â?ı®≈m¨$5<¯*áE†f˚‹õG®2YΩ):∂BB‚ÅŒ™eﬁvcnB”Aä√„Écé9“ç4∂mçÒpÈyâL‹$≤npX‘$‰ÜÜáâs∆Gî⁄çﬁ;îë£Üæ¡ÊdGÀlqN.ôJ⁄]7XaD<ö>ÑÓq;[æ«◊∆Á"÷æ,&1¢Å™gÃœ~∆í·yí'«˝x¡ôÈRFV›∫•‡z »V¿˚UÛ≠ëS˘c€Umßµx¬†ÿùìiyÿ@}Æ©lU™ˆä»v:◊¢·ßqU‹¡À7Ïƒ©Ø€–K£TÿñÓv \s,˝¬J,Î3«ΩLﬂ±‹+ƒ∫óπZ`wE ûFÙ≈OìºãπbØ(’ÅÉ·Ωù;†o•J%9∏ÕnWÔ˜€«	åcqÒíû€&6•≠—∂≤ûÚ…¸§æCª∑'JÀó9«†ŸÜûä¡Å„x–˚∫;–LåÀ]Ö0eDbª:>ﬁÅ!Ñ≤]–@Õñæ7€¡@ﬁ±‚ “ÇÊ¿µÆx+≈Áx1„9Ä1ùÀâJ⁄*&Wc>«#tÖÄ∫âß≤ÚÆI∂¿≠ aaº|“,µ&È6áÁ‡"£$HX„õî—ù˙ˆ§Áâ+€òÉ3¿OæQ	˘vCW∞¬ÛàÓ7èSç{—Ï}‰9#gïÿ UÒÏˇˆœ◊€1<Ük	9k„»„vPÀ†}ﬂ,°ÌÙòÖ{\Ë	•ó©ämÙ3Ö≈∫ì,OAKHûπ"RlΩ©∞n`≈¥ÚCŸËê¶j´„neˆÜ7X[Iw›mﬁ¢âQ”Ê@Ù!ÉÅqE˙I?Ì“Q˜T≠√QøÁ˘’Ôœ„>z__§«I?ft„o∆È®ê»4RìƒTŸöÑ›˜∏fXØñ3°^£ÀÆ|`C>Üc©ÿÆU≥—Mõ0Ãs∞tY[w*√EÓ⁄
∞'úa”ºRûcœô ]G
p\;ÒûòD}¡£ﬁBâ¶≠≈E"~15:Z±‚ò’Æ]í∫•‘\Ä†≈ı„n•éY≈ÙTB'»ÈÅ–	8zˆ”⁄ƒ˛f}«˘‘>Ÿn„’ªVè‹ûsóë˚ÈvØﬁå]∆i…TÏÔ5ó¨Ï∫!~JúoÿTÈèaä:∂ãi˝ÇÛÅ‘÷+Ae˙˙Ó[[Öˇ‡Á˙Í¡⁄Páz‹G˙EQ‚Pf=HçÜiR{w∏a®º¨K €Î±‘îwl„\(BR¢˜G&üJË€IùoQq?gX∂Ç∏˜nOly9,AZeµRΩaÙ3∏ÎñΩ84kVPˇòCCK;¶≤;† ma´´ ÍKÁ”≥B»ﬂ≠¯w◊Íô.Îìú∂πÚ¢•Ò”ö•ÄéSœ<i} ÅsO¨Æ.;Ûı(^CÿYK\«Éd¯p∫Íz’˜÷áÆ<à,b~	¿é ÃÛX£+Ïê’e&0«UöÄ≥^ÚS‘v§!ﬂX#´,ÇJo<Å—˜åœÆ πúLØø ﬂn(ZN=®É ˘”Hﬁ¥(ãpÍ î√Z{ó_Õ©FÎD◊¶?Áv&ß;—€¨Sæ*lÍ*:ü±π¬ÁQ/}ø|ëáÈ”ÃaÑˆà°'?“V√ÖÕÖ¬—‘ÃÊ–sA6óÁ…`T◊]∂•È≥}V?Ò˘Á+ÆˆAœÜ|%<ÌÃà<0Òe·i3‹†rÕ$œ„ì1;MìÌ{i4GI?◊^^¬m’ET‡éµì@üË/‰r∞Yº|m´ç«ƒb± €W4Éäiñ/ÂwÅ≤S@j>+|Ÿvª!ÏVNÃ‡1®ŒÚ˘ãÏﬁãØÔrêtó‹a©©≠ﬂ'õ∫°·—¢/Ö’zo¢!Ÿ©	d8W“,ØÉ4l˘ÄÍ3–ŸìwVµÄƒ!UY¥t-BÊı⁄}+ñ}&®£È≈2oÆß≈FåÇÕâbC◊A˚◊÷U–~¬Ëm#cÃdF√äı∂ÎsblŸ*›æ™–læ‘Rg‰)ò◊8eêª!¥}·›Xß1Ø>“Ïû∆≥©\OjXópB¬†èñlt¥iºÇ	$È¢æ^~!~óÎ
§ÁÍçÚÀtÿ 	o∑∏¥àk[øÏ±{ÛÙ®1T5Ú∞≈;]3ÃÉB«ÙÄ⁄≈ånáC≥wZD™”~täT≥‚{O–òΩñ86’›/i‚hvöïä˙0!{D∂ˆ,ÕÒ[åek©å¡B˝ãø E<=aï/1cxäö·j©Æ*wµ€µ”xÜhàflny¯Aï!∫∑|åü¡#ZÜ·È£*sEKÈ D…—ª)‰oœõ’˛mÜ∞eÃyÄöC‚∏	m‚≈§?NF0≈Ïi™G|˛Òı{T∑,–x—ÕjUÕ ÑæU-ñÀ(#,/ï‹}íÿ–Ï∆ JV(J¯”-∂ÛgªáG;/èvYã†—êù2ù€‘è–Ûîù«˝%û⁄_t˚ì$≥BZ”[åΩ
∂3#Äx≈árÆ<OÚÇ¸§ŒD·ä{WŒu Xüëî≈3∞üáÂ∫k(·Ú\∞´‰æ›:“÷C‹mSOÄ∆/Aˇ<B¥˝≠?C˝ˆ≈Œ—ó{OﬂÓÌÌÓΩ<Ïú$√^+≈¢“Ú¡£æ3à«g©+õZ^µ‹  hπ9ø¬‚∫J*V±ÒªÔ˙ß!Úu(OA#ÂáM°œwËú»‡/˛áõòCïR√π9äVÿÂc´<lp˝ñ∫UπœÍ6Æ_9!öËX¬±®uî»⁄c–pñ˚i◊m»7/aÿIÇú$Oè“ÁX¬SQûp˛—m ´qUú AæG~Ò≈7Lœ#¢ x»˙jùé“›<5]º≥±öA^F~¡vªS›)äY¸)∂‹7®	≠sXè–]SJîÖØµõe}/°£F£%øï¢_Ùÿ4Xœd¢Åä5◊8∏D9cÕ¨¬püZ÷÷ÈúñÛ>®5ÙtÖ®¥tﬂ|IRäbØ<‚ìÒ∫˙´Rù¿~ïﬁò¸√∞À∏¸˘Ö9Ì∑Z—˚(A”j˙^ Ω¥ﬁÌ¡%Œ1Z AEh|P≥ë/”±7∂øu…õ‹lΩV@ÅƒöÂúU¨¨ÿØ#&d2\√›$è`©g∂mDè@2«pG v_Ï<››:⁄¬~ß—´[Cxmû≤à0p7∞"!sE‰íˆ‚Qö‰mL¬˚·Pƒ∂b'ò©…\Ò≈ˆw(/6ÍbäkJòQ–T.VNX•s‰y⁄#0UÑ;C7ŒVÔwÇ’Å*ÄˆãçﬁÀa}PåÕ•#œ–	å∞†—ô0åBõıÄ†≤ön˘}ûhÀN†mínÉ˘Q#¯ ù#j˘@°ı∂‹‹oÒÕ=xÎfŒC§xmì≤Ñ‘â;Ó.Hîzˆÿcî2-:~ﬁ‡¥ ≈+fXtEß¶”CÜúáe'√ ÔM`·∑Ú…`	OAÚˇOÏ3ß®ı#;0,â’Ê]ÉÔÂvÜáH'p«ÛEkU∑\¢eΩé3æjç·DDè®Á„∏∑»˛c	(—ë7\TËßùTo›,om¸z®sÅ†ÉÔàﬂ#r"é”›√ΩC≤=Ÿ◊8˚–‰$(j1%Evâ≈YÚC∫¯Ò0Eî’9…“AkÒ≥œÛ≈vg2BY»-‚∏ƒ¯ÂõÂL
äÜR/¥æΩmÍ£ﬂ∏,‹6ìÛ∏˜ñ&ÏuKÀ≈4*ßT„"ƒ<íÌ{ÀèŒMe˛âÑq£LÒ§€p¡Ö‡¨l¸v>¨Ω∑t¨úòÕ
πlw‚ﬂ∂ì»rÛ)¢†Ld∆70öèm6>À“˜|r6/„Ÿh†kß∆+∆Ö∑ÉÖ∑˜`¶Å@Î€.ròüä ŸÍÒ.:Òót¬"J1EYñHÿ"›Âyuº…ØñKÏƒÑ2ijH–S„H∏ÖH˘ùˆ^iõΩﬁpËÖñì/Yó®j7I±Ü^ŸñêmM»i∂•Ã2¨ç˚⁄dy≥NEº∫~˚,PwUPÔÚpÕÆxß”çÆJ	Z˘hB°˜Ës Ω ⁄KÈ!‹Ëg„
Ï…«≠√%ÎF„Óm
"‘≤˘Qóˆ„NÃó:Æxî•π∂–+6È lÿ? >ƒÁq6Fπ˜Ön$d‰%îﬁQûFÕÄ‡2”<O0”Jj*Y©®¿”ÙµÒ9® åÏÀI∏H∑3 ≤ËÉ¶6°˜%#™¬<v≥tòò(õ5óC÷ÑÓ¶ì‘–≠>t^Î›KπÒb/ÒÑ49B©2F†è¬=›2œ£SéÜ+B7œH4]ºÏ∞óËòƒÚ‰˛‹y◊h÷›†qG˜mÿxG´°9Ao	çöhLMZ<Ñ]‹`È	∏…7hóŒ@∏∑”	ƒI}’¿"ñ4v=+≥õx‹Íuöü«¶Êÿƒcc÷ÓGo…èﬁ[+Ê‡-q;I¶£N)Í˜π%˝ìGlçrÏo∑^^à¨˘F÷’0
sïjöG'1Ánë%∂ÿÎ≠ºx¡æ¸rs0hb‡˝ﬁ⁄∫Oë`ìx`ya”£ADbì)@2ƒÅÔãÿ∑VeRã[“ µb‘Æ& ®›dÍÖR:ïQdÃ$˛4KÛUçú’‹DÇ–L.~ômIºÏGû'±õ”W&T∏x%Q≠˚ólÙıP?iU8SwQE>ìØœ.¢Öi–„øÃ∞r∑ﬂ”	j,|≤Ÿ3`∏ã`ø0>¥P¨®ûMEﬁG˛LìPË¬';ì~jîÓÓBÛS@of-áöQùj¶ïAÉ"¿ÊéFåYÎc•>ÃÓÜ.q
¨‰PﬁÊê¯4£jõ;®ü†V∂H†–&ôyêﬁ,+Ø_~U$üóÒ{≠æºñ7êΩÄù]ëTÍ≈ƒAÇ
3?⁄d45˜0É!ƒ˛<4˙Ä6ÏîÇËpœéÆ‡ ìæk§0‹@öt»¡`` ˇAAv)Ëv‡Xà–'^≠d‘Äê<‡¬}†(∂o{r∑=A˙≈¡©IÅ€ÜcSî˙y‡!/É´@µ°í˙‘r«cûÏ˙ü*√íÎÃCZ∑€<X?•‘ÈË4∞÷O€ı!`V®aıÌﬂt…ÜWÆ⁄ƒxÂ“2«ΩΩÚÓ≈’7Ò“<úúÙ”ùãM∂±CßÖz›/†ﬁµDÒª!qW"∆Ølö7u_π‘ æ¡@;XÊü»_\5€VÄh6/`´“Œ6^ﬁZ’°zê˜ÃVëúÕóö”∆e˚Ω⁄§pÉ.`âyó√HDu≠ÿ∏n◊Ô=ÅJ¿áI+˚Ñ∆Í⁄¯ds∞–ñ–Ò
YÔUJ bÁ‰=ÃJiÆy¬≠P®*ª<0r´'5ÇÀZgø?…ÌVŸA∂ºFP~[¬â‡ÕÛÄRùÂ1ˆﬂö‰1«Ex ¿Ω‚~–Ç©.ñØ,Ø‚÷õö˘UeH©•ê2\PÚßã3,8¸√uHD?
ﬁπ“N°}sáfç°N£≈Q>’Nú´dâ_Úû˝uI¡€PÈo£ƒ®ŸèDéMFnbååY9CØpè≥4Ç
ÿ&eπıãŸŒ* h,©≥¬‚†uπg‹∏nÊ!Á€$}&ùñ°i'
≈)ÎTBçˇ÷∞J3 ìVæƒQ?(Fùı“2.ƒæ¶4IvAü&ajÖ‹<sZåêóªÊñdµ!_U7?C*ŸF¥¸ÖÆ|8ÂÏ(–(d™•∆±´ 0‘%Üî‹µıÕ®µEÑôe7õ¡z	ˆ˚`	8¶⁄∑	ÔQTGÏLD“P[}œh2ÀU¨'ªf‚‰
+lÊ⁄˘T`=m¨ö©CÊ¡c	Õı	¿J)ÃˆwÏSAb›ƒqô’È≤Í˝÷®°?S¢¿bÄ{Ã	_ÂM™ˆÙ£á‹£ÿSH˚œ•6mT¶›†ò3&¥ÙÂ?√–Á|`ÿ/l˜1Ç*Dc´˙gòY„Ú<ﬁ{`V“aßÚ
‡~’»ñ¨b˚4p*Û¿‚ΩøPJ‘iàW‘?ÖíıËe<<CÚÎÓYt≥˝›?cH{ù.F«?d¨÷f\”¢il∫eàúR°!U*ΩÆ2-	c,˚›S‚˜«úo™ÌΩdx'Y‰⁄ÆÚ£——À°îî—XÛâ j\_)›ÅÆd$Îç…7Z¿∂§◊J`æjÂjhÊW´0øåt€˜àä†∆»ò®ùä¸§&›J}îÄZîmﬁ~™◊N
™Q~v "ÌiÜ/,†±Ì9ÍW¡}´ƒVóÇ‰:~9∆€J=l÷‚≤∆≥ZãÈögz±ﬁ≠∑x%˝b@ìt[/	∫U7Â´Lœf›†÷°ÕñY´ﬁ»()î]]π!0:0(S^Œ0÷@nUº≠k–ÅXQª’dÆÈ¨¬UπËD·iÊ©ãã˝ë'Øó≥q~˘ÎTó¿%'.•26⁄dr¢DÿFa~ÕÉ”*iì¸0:áq°Ò‡LAi≥ƒ$CÂ≈úòöd¡≠≤¬èD∫™íJ-E`0õÏäÕn2F∫~¢
ºÃ°7√CÌö¿·%I¡(1oü¶òãN]HbÁÈ$ z‹úô÷ëzŸÆfÅrxZÉï≤+_∂ÎE®êê∂ôƒÍnîç£Ùm/FÊl:È◊mË¸gq,yçd≤C‡Y…è…,z/à*«o·kˆúhµ=W2VpòÔáŒ¥‚úïï+V˘I‡{	;^æ∏¨ƒœYkç}fÌDÆÎ◊/NË≤Hêür’i=ÕÃÌ7sË6;m#•Ô¨•Ö}òE!mÈ˚Àü6ä“ûÂ.Á√úé·∞]F¶Ü˚ßU˝„ﬂ∫¸Ñk$0ˇQl1æë˜éòq9œò:¡>:—≥∞*jïÉ«ùìr£@òçπÏBXΩfªŒv©"@n‘º¬n¬¬≤¡@AyEÍ\ b,1` tÇi≤÷@Œ¥˘∏^ZKn]KùßÀ ¡h∆ìRCíÍ·RcFjå–Ü4A+7v*?i‰%W5k¡âFöm]´ªE‡wºELexãˆ“cÔjT|CÉ∏0	2Iá<x^˚•\	Ê«:õt’LÅk™â[MüF∏çw∑Õ⁄]@kjO◊Dõ6ı¶Ì’Ô¬o<X·Ωﬂ®„•›áÔ∞´“>öπ¨åMÒ<™å.^7…ñsY≥æC°öWÏÊ%kËøÜí¥ßfYúÊ5i†πÃ◊@˝fesEuoÍÛ8gkèï2·êèŒ(¸íG‹´f√@r§˜ kø_\£4\xBKíE+—(K/í‚(bü\˝.≠ıAŒ≈¢“≤è◊N‚,vìà»Ï˜Å„¿9o â”€ÛsÙ™\,Ó∫
ÊÉY√ˆ„"UËÓ^Ô ¯≤-=¡à!Yè°q£Â;M·“ÀW\„ÂﬁguÜMî–ÅGfPÇ#E®≤ø˝kOO7$¡¶FÒÁTymÛY|Úpöwœ‚ﬁ§?‚«D`∆•√Ex8˘Nd	°eSŒÔû¬2ì¸Pî∫’E1)'òŒﬁÊ·iªÆÔã5Å◊ÈÉê|ATÎπË/h¨‹uÏ	
Pn@?®C‚√˙c°mÇ≈b˝ˆ”º5˙}∞…ﬁ√öOﬂÉ9å≥/cry/Se‡¸ÅŒqgâı„ìÒ&ˇ]Çgz„3Ò	˝áôß&ﬁé‚∏ Óák Où˝™Ω‘Ñ!∞?‰äÀ∞-„<Ôcê&∆VCFƒ◊±>πˆñ∫Ptg.Æ∂à™≈k6Çb‚Û0¸R≥p+ æ)ô&{Ñ˝úqÏòˆ0jO⁄Ì‘ËNF˝∆ï¡‰¡≠Szë&≈ßë=ã–ÎÆö:˜r≥Ík?…T·˝ƒæc¢>p≥¸ò(JﬂÙÀxÁÁ◊ÀØ◊WWﬂ,X2FÍvA_–(æ‘≥5öµ°Z¨Q(œÎü¨EÎoÍÿw/˙íLv~%é≈h3u/'CvıËÁ◊i:Äüò∂ﬁõd-ù5o∆f>˛–áŸSn•∆Ät¯Árˇ4ø’∂RÛK±´:w7üËÂ„µ≠?∞º˚¶¡sÎLÛ)π6∞øuõûïÒÛJ˛›ÍÆ@øb∑ô.kágªñ˛rEıæ∂0DDÑEÀo]ˆDà≥˘z√Aíç*»¥E,¬”∏[zˆ,Kh{4n˙ã·yΩ[°$≤PπÔ&F[£)‹àö˚0oü≈›ﬂl'Y∑ÎâÏEîue¨ﬂ¶'Ò|Ü€[•ôàB¶KM\“‰¿»[n@÷€§‰∫B	öY)3£æñΩ"eQπ—¶ÛÉî‚è9∏3|x{™ºª”!G8c	J¥À£M/õpV(3ÓîS‘µ√Ù˝ı ‡%ä{S¸ˆRp{{íf5\ÉUSqΩ’éKÍP5Ôi0–´2ÑÍ5Õ$÷ÎÂª0IÈ	ALÑúœßlƒí&æn2<˛Oía‹”ê™eGÑ4◊ÿy+ÿÕeu¬zØ≤€¿òÇÖùk®‚˙ò+†Œ–£ Ü‘áì÷Äcœ˚m≈4[TNd>øÆ~ﬂKo’≠ÃöL∞9of"◊iôƒ5À¡Ê©z›ôgfrcùìl„3‚=Xy‰–1{iwÇØÈ∏˜¡vK#√’‘\RNÉ©#|°>∞Ÿ˙S§Yÿ]†?e“.fÍ“:©I¬≠…ºmñA+´¢˚∂IoÑÌ—ΩZla;∆”·ô≤∂ÙXèŸƒTÌTX¨ÿG
kâ%Ü 8r¿’svM÷µ¨IzÓqÉBïŸ;Œ„Ï<Í¶qnÌF€xÏçáñ@"æ˙œÙV:¢|08Xe
òÃˆB…ÎÓLÆæMÛ∂µ≥æõ!VZ£b¡ÜGåx“f+c_vÀFÖπòO»¿∏‘ŒûÄ —⁄z˛´≠??dØvwü<ﬂaÀÏÂ;‹>ÿ{˛ºmÊdZ›w‚T/Ø…ÆÎ}ËAF–+ïûGY«Úƒ≠tIµ™O÷5çØP7Zñª£Í¸’çñ∫*X’Ô‘Å¿êë¶î¯MO%©6%¿ª¿ëlÙ∞mÀ"4⁄ı:ÆÉÛùs:ÜNc°ãèı":$ç,9ƒ§∑©kqÖ¥€száB◊S8∏ÆÁ»ﬂÎzpø¥?i˜\r+≈,=d/ØÚYE¸´n“{Ÿ’∑Va»Ö‹”ìU‚YÍkÆ•◊Îo¥’§Fóòà4MÉã‚ﬁJCú|Î©≠≥Ê–∆E'§ê˝|’Ãı˜\e
8y4’MèŸªÉù?Ÿ=<:ÿ:`˚[B‘ë{àñXÓp
|©A˝F\¿wœ∑^^˝g(J:ÿz∫%
k)ÏJ÷(gÂ˚v∫¯;gàãk^⁄ù„◊õ~Í…XL@˘a”)®˙åäIh∫∏öMCtï]w"
'EËL¥õN»≈_~µ{”ÁÈ’y≤ãsÒhÔhÎ9NŒ=é‡˘l˜Â÷Û›ˇ∑º⁄yâÛãﬂ@è=Ö{jÁ∆ˇ  ˇˇÏ}[oGñÊ_	±Âe—Õ;%_häMRˆJ"M“Ú,ANV%…tWUñ3´H©9v±ãyÿ}ôÃb«ª7–/kÃK?ˇIˇÇ˝	ÁDDf‹32´ä§<.†€bUfd‰â'Œı;o®
Ö™∑(n,°\:h/G£v;ŒsÇ?î …˚[ì‰p6bÌªæ8/Øãk`!®Al9qôwSª—<h—£V∂∞Sût|«…`Éƒ84≤¥3BıK;ëÈàáÓãmG=‹ë¶√-å©G'≠ŸAqΩ‚é(h~]RÄ¡Œ\—ù7ÿ·]AYá5Q∏¿;VRfŸ≈Æu¡ÍC≤D^Bk®-*OË˛ﬂˇ˙áˇâÛ
L˙¢ùm~˘o_ÜëQg∫g|wkÔ™Û]cq25QLN•°?˙¿:¬@¡ë}›˙O ˘öÅ|eŸ©€öf˛
h®ÙˇËcË´\∫≠ÍÖ»B …®òƒ+#˜\»ï—FmtON*\ö¨Z¢—6˚r√jrnúØÆ
ê¿\º¬ãX€æ$Ù‰K⁄•àB&}+)k“3m|;‘NM*úŒ◊,3KS´ñ¸˘`ù@nµˆ÷˛…‚≥Ñ¡∑P≠8«›ïÛÌïK[ãDÃÁë€)ü¡-ñ†æôÆe¨ûi%Íl´·+;Bﬁ3Vx˛“œX‘‰-ÆnÎ)Î~ˆe0ã9ùΩN¨5<Áè™€yÍ†yçÓ)≥∆˘®ó∫Z∞†î#Yû˘e‘9ãK´ó;fîÖß˜“~*ÈÃ3õø±2Y“°åFwQ‹Z¯‘ªo`∫€t∫-ÿ¯∞Ä}Ì'|·Ø¥≤ø}Z∞,¨A¸≥ÏÊˆì∫€rÈkŒï∂OdﬂÌYe⁄LjÒá]Çd¯˛˙a_ÄÖj––óÛÕFC¸-ÄrG*gî·ÁT9Âœ·–3j°¨éi£T`H7†”I„q@Ì:y4h'∑J –ﬁÒQAO‡/vC≠”¿•™⁄∞FÔ,ªà$Å¡N5!Ñr≈aì¢1®—≤ëC6	ü>%∂Kîæªp—róNî~E‡™Òzÿ≥®KµQ ÕQ∞îåñ2∫éïÆ¨î”“Œ‰H?ÌÌ™áûóùÚ≠ZÈÚ6·q·Ã§ÕÅüR3À©ne?\‰ïÁ9ç<îÿâ÷d≥cÎ»˙™Ë'“,óﬁ”OH?ó7’∂pµëÆ°˝Ù^›∆Œë¨Pó™"íª√h@W"ÙUë»äÇf«2©¥—%z,≥‚ò†√Rﬁf∂Œ”k√àx1?Œ7ò⁄q$l·#∫<Ûd¨§Üﬁ˚IU5≥Å‹{K≈ÃÓÃÄ´£„≠ØvﬂÓÓÏ¢>Y˛ÓWJqn“)
r·üŒ"\˛úÁ[_Ó>?zùtﬁ\Wóô∫´ÃΩe°Å˚€™¶]È8U÷˝[kÔ:íG¨;ŸÙT|™tï@∂ìRV0ÒÛ°Ù6l|C7]Æ5ﬁsdnÿ}
¯ãÀzØí7ü`Vç“®›ªK»BÍ ◊¨„≤zDê+G1 dS+ò~1Îzîù∂oé™∂ﬂµwèK¸ﬁ:¸sÕÌ¿r¯Î-±Y„h%ˆ‰ÍË< ‚’k„W››.ΩÛÖïOòGåû¸–sú SÖ∂ØŒ’∑Üëÿm˙ﬂ§ÑoÒÀö⁄HzßËØ≈≈TSÛL•É≤@ÆécáÏÂÈ"ı_%—∑Á—0ﬂ,g—ºÅêá˚¡Ú5{^Ì–iøç@•Ç’∂ÜFö¨+çÆ	cªÓDXtﬂãWÜÎ˝≈VÜ¨◊„¥Êf›N{É(&›sK√_[`ÅÄGÏnz)smè™£û•_2]>"^∆™\ñañIoﬁÉ˜a˜jvÉâp"ª∑˛ÊÂ›ÌQ9{b—’ù∑0£Ú	ªïôòŒk¡∫,.’LMˆ•a\∂ÿ˜≤Q—¶\›çÈño4{¸:±¢∫¿´n‘o«˛,ªqÁ‰æw ¨ım≥ÊEü)l“Y9ø•<–ˇ=¸+èû<zº<é’†O>yºl›ı,ÔüèÈêâ¸9xï#˘›πä}êΩ™@œì|XêøÙp&¿DV0ïçaÊ Uvx-◊Ã ÍÄç∑˛hé,1≥˘*ë=ì'◊\ÜùÍ—‡F79ÎØ#ñÙDü•¥íEzfDîí“k…æZ_Õ·w67¶√1=˙Éç
ﬂÕ-~Oç
&ﬁÕü≈"/πªó%yÀNÁ;˚€«ˇ·`óú{vr√ÛKπ	°”M8≤Ù*Ê…o^qËxÔÏ>«†∏TN≥rî…ìíßQ/Èæ_'‡µ@˝ˆ=(÷ÎdeuÓB•ﬁY“ß=Üø∞Ìı:˘ÕÚÚ≤ßæaﬁôJ™+"Òa*=ƒ%Óƒu„EdÖWÆP^ÍD˘y‹·O‚LV\Y93ı;ÁîÜÄK'ƒãWñó?*K_™r˙ ‚_≈‡√tP52™9π*L(∏«xy@∞g ó
yFñ^“tíúÓ∫`p\~Q⁄J–£ıòËg·æ5É@è¸è@€˝ ∂:Ó{N”tË\g˘çWÒçeÊ¬/º¶’gú,ø±‰‹∞\õ®0~ûÃ0fvó‰·µ\>ño∏‰qÀÒPŸÎøä“‘√Ë4"[Ÿ0'_e—‡<iÁ`‘˘†\–ñ›ﬁqp∏ˇjÎÂÒ.ŸŸ%ª;{;˚dâÏ‹| ‘1Ù‰}({1ŸmëÔrZ˙™'<øyßù≥¥∂…1ñ¡+ÀæÄc&µ´˛èô*}_F›ˆÕˇIgzíπ+∏V8∑ì ÛNLËò[‚ åÏÊ{∂ﬂu;≈™h’˘≈Û≤¯"…!âù{™’Îk‡cÆúîw—P¢∫ómË9˜ÿôÿ4™Ù9êß›DàI¥@¿˛⁄X˙‹Õ=™;—3ÚºÍBßR3≥y4:≤H¢wáÚQ¸Ë•¡∆–√´B˚Éì›'îñ|4óE;í*Døñ-3õ,Ç)y"Ó![†∞F<éıJá∫°Ã™íe"ıpw{˜ÀΩù≠ ˘Äâ0ÅÈ<ºñK{˛Nüü`¶˝¶ΩÍ.õÛ≥≠Á«[òâ{X9]˛î3∆=Í†÷—ﬁÒ7[7ˇÂÊ?Ô˚Ã≥,ïQmziÏÏwÛÿ˛	›L6w#®¶<ç≥õ?êÿî<^	ºïÁ‘æ•fT¥Nﬁ˙>ﬁ!og…¿…(…~7ç:‘;ıYﬁ‰™èäı'˛nC
(¸Ì*¡•îw?uc…πÈ©˙b7,æ≥ôû¶U#&Vﬂ9µ◊óG2«îîlÕS¸ê¶JÃÒyLœ0{«Ù<T;TÇ¿j.*Ñ4˝S¯uÁTNCSU;Í_DyQ‰O5_zœFﬁ∆ﬂZV∑
æ¯∫≈≥e-æi3e˙%ñ¸‘Q∞Ì£…≈>Îñ^/gP7=Kw¢Ï˜ﬂd]ﬂD∑ÈÇGÌ°ÂkQáÛ##ÿV~–?k1¬ŒììQ“Ì<K∫1:¬g%ﬂ=;*¸‚ˆ$•~–?õµT∞áHãË,ÓMAVhõõ_F…;lrÚ´[@Òc:°AD\$ «i¸á_≈ƒ/CL0⁄¬¢szK¬¢s⁄LXÏ<õÇ§‡Ãm äùgë∑Ωœß\©6n+∞∫Iπ\lï∞Î+´¢§k±Äˆı«ØàÄ=ËKØ‹)£^-kÃ*G)ãÈuJ!¶5V`7eÕB Y∆´ﬁQ/È¶&X‘1—ç5≥˘<Å5˘wdkE{*¨≠DœL(πz‡Ú™ôIJ∂t)KT‰ˆB ZPuØ âÉQW§Ù∏–È∑YdD‚ÊÓDJâàâj¥'˝¥™/Í$Q≤s \Ÿ4µ&≤DÑJŒCSﬁâ/‚NöïUä¨¯í#1¨Ü±|∂(b|@øMb+≠äQ†BI≥›'›¬ªÕ[ßJˇ)†4®Qáå)âVπ◊Î_Iîrá|bXõÌ¨w´ûä;Wü⁄µA&ˇTt
–JJ≥Æ’¬√mÀ˝µò˜\≠ÆZ˙z7sî€7ºΩxÔ÷i∆˙:pCißÃ“ı‚Öª=Ô≠î, QÚªõ±≤a\z)Éc¡àA69èkÓäÑéW(%⁄ÚYÉ[}Ö&Ra)á[Bêoù•YMb[ Z≈É\§93ã0ôU∞‰ ª‰∑)bˇ>∞9◊@⁄aˇ√nEò}œÅ6Sv>Ÿk *]W]	œWØMÖÓ
°kf…;4∞Ë√Ë_{Kæ>ú%◊√éﬂ–I˙Áqí•“];‚+ﬂ}ZS√ÚÓm÷=ÑlÛv≥!£ˆ+Ê ;7?±∆,F»‡¶(ı9˜‡XÃæÔ-&ˆÆï}LƒnÆØ`GèL¢;¿[Ç?3@–  Iîp∑π*aë∂*>Ω¨\:†ári ò;”vÖ%‰zΩ÷…bJª®¬t¢Ícﬁbbﬁ[µ≠áΩËΩ«€≤X¯ Ö„Ë*f5øÒ…,Â(°∫+aÈÌ∂cB8
G‚ŸyömàÚ}zsÇÅ]®1¥¬úx#`åIå¡Ñ[Ö˝œÛ¿ÒædÒK„ê—Ioûs¡83,¥…—ìÈÒióÂÅÜ®¡ÍﬂÖÜËÜFÄaÕ+ÈØeµ[^Á2™8b˚$ßG√â5≠≈›ıdÊ%µÄ™‹òëq4aép¢*ñ√µR∂∂éBVz5qO±åÂQÊâ<Ã∫Vª¶⁄–eO„å†s⁄hr§æ¨T$Ws3¸®È#öÑ¯„¡ì˙Fv2†Ü5∆˚„˝vñVªgye˚Ù©ÊfµPÊºá§éÒ6“(5ﬁ…"íÔãŒ&JôªS’Âœƒµƒ*ñ»ç·÷Q!sı˚º*§≤´FﬂΩ_JÈ3]ÖR˛ÊéÂôÑ√ãd—÷ L¥ïxº«àÏ9≠€v……™ñÂi|B©Õ‘≥…æØmX¿7ReY_k&‹Ô÷˘ÊX›¶íÏ¶†¥¡#gß IU“œŒVã—áún¥¶∑*`˜Ì
÷ñıÆZœC [Haï,áqûXGÆLS¨LKÆîHÍˇÁ<çÍºbdÈe˛‰j’dõ@H}PÒ.‹~;J	B~˜›zÑ»(†p≈$É~D–ù.K"j‡–›ÁÉ∏}ÛÁ”§MøàáÌE/‚¯•Üä,` —@@»´r&ã¡PîL#ôSWmüä€ƒ4ñC=&™á§n.Ö·!)Á∆ù!—E,òÓzl_°fd´KÂP±¡¶Î‡Hå‚ˆ ?áyõ◊Ÿa)°7¿âπ”ÉG‹)∂ÂÄª\%?_àôh†l&å2ÓÊyD0;ÉD	¸Ïùa‹#£^!⁄iØH Iø=ÍRΩx±L$0”R¸Sî~∆‰˚õÖTAtN ¶9§ŒCZ‰<ıì.(u[C@nBSuQ«	ÛÓ\`
ÄÑ∏‡Û’X=5∑°Ííﬁ	ˆ*Ë˛Ò‘[Ì⁄å H—±U:xP£:oSŸ=Ãﬁ?]lßåºœ¸ˆÒ„ô‡&(ﬂ É¥æ›zªΩˇÕÀ„√Ω]ﬁﬂº◊µŸ‡`ˆÈN˙@˘¶◊Ào*u±ZoÑ}∂)¡bÈHäË™RˆßÇªˆ±Tçe∑ˆ2Åˇ°ÌAÜR@°%`(Òß™Ωx⁄çŒÆâ∏‘ãeÖÖr"B9‡|&ò¬tòßZaM©∆Q™!≈ÂËÛ5Ú˘Á´kk´À+f ab’#[ç€ß“Ã≤f†>Ø1–AÓ[¶‰Úh◊â*€®_2nìsu:õOw§üπœ˜@=Ìñ[ù$á *2U‚Ëëbp∏E’o)R'Ïí¶ ﬁ®ˆ©˙∞∏àÄ›\?§'ˇIñdêçâ∫Å£k¬µDJØ6%‘‘Ó—Ì¯é<†h‚ÿúõ™2ØçKﬁ†"©eó@'_ﬂì'Æ[<‡˘ï"ñïË⁄i°î∫gym—IwÙ´πe!—ù8Hà±d1‰0R
.û·Zgﬁõ	‘6ıù§n¬£÷iAÿ">BrTóêËæIV`q<c# 2iâ;Æ	’9;Q'ŒÁ¯X&úU–»ÕŒ®ÃØvÎ`˙ºE≥˜öññë≤B‹ö≠ëj∏£®;;w≠9Á≈¡Éπ˘ñe%Êüö$?O:“#ÑjÒXãG]ïN3‡¸V)M≈$p€"˘»È*
%¿ƒoı›Ÿ«zÌ√ácø˜ ã€ÈÌÆ9>±·{Û–>,ˆó∑(Ã®”HƒLº´*¶ú-‰YÎ#Ï≈„Y…Ô kŒ=T‰â¸ı?˛wÕEçZ˙˜oâ˛[˙ó≥T˚JΩL/R˛∂˙pﬂ·CpL÷∆|hJ™¥P8«2xºÖ≠üŸJ¯[˚≠Ük?@üàg†jﬂs5∫™@{˝ÅN£yGæKS¶ÀZ≥≥ƒ3◊4Ó• ƒhâH¢⁄|mlÇ|lhÏOIKZ'´Ωåíú¡Iî‰â)‹HZË7∑–i¥!a‘ã§Ùx•k±¯‰j†`}®ˆú∞NyÒ"Ÿ8ê€‹W‘¡≥õQûÌßdó™gÄﬁéOÍç:—¢“Xi;iìTåôﬂ¸L˙qû«ÑıîÄ∑õ^˝áœŒO_"Ô>%ﬂâ7?ë<=¡Jî *áÃµö:“¢”x!y
Í‘&éDëkMÿÖhV≥≈¶-..%∞ l	q0ªÎÚ§ôDÉA˜=<]Ã‰z”πGì@(a∑t$˙ïêŸ`ÿÊ\GÛß∫?W∫ØÁZ•PT&—yGƒW`Üâ~4§u∞ÛäjÃ/“ì§”–À~?LrÎW≠Ωö‹_-Í∆“±Æ7Y≥:ñ≠˜Î≥ºUWÍ˚læR°w°‘ÛoJRÖ´ˆf1“Zùb$é≥]£ƒöÂô™ë”l ÅD∑q÷O?∑ N[ûx¢óµñfãhøÂ`∂Fó˝)M	aÍGWπƒùP|,Åp}°X‰`ül›j∆'®R"S0!oI`A•®Ït] Xπ§ì¢&y≠Æ	>9PòV}œû±†/c˙µ*,4ÉÒ˝¶ºAqØ‹Èê¶ahË^Óyík3ÆooäÃ,*ŸSƒ»≠ÇÆV⁄—¨≥∑TµΩhµ`¶µh‹»˝p÷+–FûŒR>ºÀµBó˜á¥Vl¬∑æV,©Å6*óÀRUOU≥ØGt5@ßî&ÌÛd 9L·≤":£∂A©Ñ·M’¬≈8:√˙üBCMã1M—◊èÁ… 2˝˝ÔÍ2Àn⁄CG?w‚ÜÎËç∂hfUNõ•D«`RòìmÏÄ‹_âuÅ&5òW§˚yÿ˙–\\W˙∂^Ÿ1x∞A,1XﬂÑI‚ü‡Ùﬁ«R@ß¯=$·7∞≠5≤≈G&/9‹ç∫◊≈PÅ
[à˝\ÀCgÃ¢z˚Yﬁà⁄Ä©ÿ—=≈C«ûÂñuˇ©‰p>Ã2âÑx¸Ùyáqî‰Ã˝føq]‹à¢ÓçøG¸G»{F"‹Æ›=W^/°v‰≤>îÀ¡á·s «ìôN‹¶\m$*À!Ó i	=≠ﬂ™ılÕ≈ïèÁóÒ‚Ô‡ØáW-Ÿ"ìÂ≈œÀÌÂ9”·…}î∆éˆSö“n‚æ ∞c∆Zÿìm÷õﬂ˚iˆÃÑ≤äû’UDû†µ‘“)œ_‘ò’‹Y‹¯ä“yÿó¬sfòUèQÂ$WKÓúRr{ÖföMâXÅ®µµòpÆ`Ç Ò5?õ	r2<5iÔ(⁄5‹íÊ¡†π¢ è·≤Pì›ÀÔ÷‰Tâ"˘]æn¸1Ûëm®49ÇD±gπ≠ ˚µ~ˇûyìíeQ
xö~q™gsûŒQŸáºµ¥©i·9Ö∑¡∂ÇÊuw›´ù≠ïî>ı ä{ËDé1ëÛtGõN9ÃE´Ç◊”¥uÛMˆÃ-sãF0-ü°9k_(jh‰*ÈÁ£Ói“Ì·˜>¢÷ã3ü®u€–3iòÙí?DŸvö„|Oå—*F;à€ÄáY¸˝ú*1£,¢GZLw†Ñ*»Ü›{qp∏{t¥µˇˆ≈ﬁÀΩ[Ù÷â-¢R˜"È'Ω⁄a≠-k·Ô€tíòéiOt¬OÒ?ÿÈ0&X≈˝±„	¨{“:±éÃ4m©sñ˙ºy„EÙç: ¢‹Î
ÕZÉ,æÄ_^/..¬øÁã“eà˛ÔP.ˆ”À÷‘#MÈTÁI‘eÿÌÀ‰˙ç˛Ã≈∞x,åï≥§V1¯Ô"˝öÆXkÄ_@q.(@IgN∆;Ëöœò'ßI‹ÖÈÛŸŒíø#≥l∂T)A•vù0€É`¡ÄIÅ˚¢ú—ú]c¨BÃì◊¯»7ÎÑW—≈H÷S€å‰∂¨úaÀl€≥]®e∑Ωàáê∂=àª7f!≈≠3eiEP˘∆¬eæÖÛÖ◊ü>æ8C@‚ûv©T|ø á}X»€Y⁄ÌûD&öô’xÊÛﬂ¨`ê¶]jÌˆÊÃ¿g5zÏ∆¬êrâ˘ôbQÌ9Üh5≤¨åc’HLD^ËaÜÔ+∫‰ÉÏÊ'zTQÌ∑}ût∞ÖZÊ|+î°{“Ä≥t•ËáQ2O °˘<,Å*‹¿&πH±é˛Û;z
íã¯¨*Eüop£Â‚J}ﬁ—âb¬Ö'3õÒÕ!óÂ"ÈPÌzÏ¨Œ:J´≈<Ùt6.zØkËûô¨«8:T:|≥ûÜ0›ë⁄Pôluívíˆ!Â ﬁÿ˛RÆ‰=W·Ç|¬£$Âæ_z4;úøÇò´wQÎ“]ß;5eG√’)Æn†À¿
-ö#9Ë{–„o≈û]>NØ”H˚ËéREG±ÛY¥ﬂr¢π(•B0Ç@rl∞»∑ÛµYËQûä≠vè/N¡y“PFYÀ;>ØQ›·m)^»aI¨˜.9õ«Í≤xÓÃÊÕˇ∏”µ‹BD[J¶ò≠d°√¸bRó›∏6<)Ìé¬.‚L$.’P$·ú)àΩ.©˝qÂÁEë«#÷éﬁ)ÒcØøs…LS∞†ÿÖ∏ua	°’9zÕÀ)D¿7¬ï§≤B˘”Í≤íÈÑM·˘ì‹áèSçqÅÏâáî∏|‘KÖrhÕ©±øî5„ RíÒÈ≤h∂%)¢>ãµ”“CPO˚©^ÿ©kV8K{!}Ã∆KAQÿ¨Q÷¯%—ƒÌQc#Õü„Hq~?ﬁÔÊ?A‚Lﬁ„.¶a WΩÂø˛ﬂ ˜¥oo◊÷îä‰ÃÕ)ˇx[€S<7Ë∏«‘ä`¯ç`Y0öµ—Y√≈¯5¡?-øà⁄QU‡Ÿ· ›®X∂ΩäeIP‘.Sµd,Á‡Ñ`ñtRBi\áJ·A°˛rﬂ◊≈ºÏ#∫ZCπÖ¥c*ü_è£ñÄ„ÑÌY7y}õŸZ]ÆJËj@.∏;Ü„S ?5¥∂P<π4PFÙS£	9‚£JÇ‚ó€BW¬ºW˙KÁÊœ‘¢úÍ	Õd{á=.°v ûç#ÿ≈Pt‚”ïÎ∆„»∆≤º∏ººbUËúkR„ïQ7ˇ˙Oˇ@év_êù›£É›√ùõˇ∫Ω∑è":¢ªä9:N”,ÍëÇ•°¯Ñ“¨ÁΩî…lqÇH$‚!¥fo¿Ù<ﬂ¸ˇÒüâÃ\8w®ñAÏª◊´ËÏo~Œ	Ã∫{ûfD›üdêÊ˘Õü/‚Æ˚¨b uXπ≠ë†‚≠GÀÍ;∫OK∫1Ù_∫˘1KRV¯”è{dò¬"ï+ÿéNË∑º:®_˙˚*◊Ì:TËë4pò4^ÅV-Ö»Y‘„ÏÖ•(«¶LÒ}¡¢ƒŒoÉìÚH9ÒßËOF ÌSae†ÏÈÊœ–vàrD”
Å4ÓôÕ (Ù OÉæÚsΩáı¯gµZ8_˘÷n)&ïß¥Xq›≠~Æíÿï§∂ñ\0‚ó‹9Ÿ+èã†ØÌB÷"p∏ü‘råÆ-C∂Í£ôÕΩ>˙Ω∏1èÁÅLƒ]ê£}*oFî©Qƒ†˚øÕ6ff'¶$´ Ø@â'$V]ÎW>©y o™√’.ˇk3t˚≠Nßò!^oñ~˜(%€Qñ%˝Û‘ô)QâTﬁGwÕ£x’
∫ãﬂÂ7Á-€0µù∂lqŒ]ÀuZòS\B∂®Nï\∞êVqxdëÀ£öáyu($8—`⁄
O~ªÇÂŒﬂ°2≠Ó~%W∫úccJﬂHÅ˚FÆc+lΩ˘Ü¬ø]ˇmNZÔ'í&¯zV≈˛æÈD≤m‹— ö»5b‰1»{áqn∫Öëp´1oá÷;-‰ﬁ•2¡£=—Âtá´ß
Ë√û‡wl∑'RÙ[≥
0Í¬º¯»¶„ºƒ˙ÉKoà¯Úu1Ç?*Tã&Ã±~Ù‡nHãx˜È–ıhd˚àï…@-Lìä Fuô∆Íë\2&6
jú~<E4÷¶|Ï't9»§ïõ—Í¢†`Ì0Í1V&"∂U‘;Ùì‘?)ŸÛYOsZJ£‹%1˘	£%€;I>H˚Ëâ´jj‰'$>{\:ñÉLùå„FÛßÂÅkÍèÏâ1Ôò*y›ÌêÁÍ≠ı=¯≤Äı=è¯a¶EáBÊB™[v„$´6§¬ U8¸5˜[gÈ0BGUÉ)#∑§øÁäPÎ}"üøÏÙûÀÖ»Ô¯â”Â'ŒT^ΩQ¬F=˙\È^%Ì√+≤∏∞-π≥Iõ˘ò¯L][ôå:<˜—Gb¯RR–°[∂±y®Ò3wè≤_˝ñ#|R·‘L»oº†Ã∞bL-ûıDä◊(*oº§\/DgÆTôh”yß}6|ç˙[¢»≥Û«ˆ}A±m‹1·Äª+É0W∂ÒZEÑÿG*_¶-ïtúäY3"&B¨&ôÕâµ·Ã%µo(Ê∑¸¿d£å,ø	âHéél∂∆éEÜ"≠Œ≥>ÆI„˘b2Œ’v§”÷àK6£p≠à•‘{vÃ£€í‘µ1µÔ*Ùx¿ú∂§/`áõz!Õ%k°pŸ∆Ù˚Ú‘^b˙¡Û‘ﬁ„ò§'|u?BíÖ£ÌŒ"ílÌÈSçê§∏Õ›à€zØ∑K’éÌGsÓ´Ôî
 áˆ©2¯}µ≈®]óI‚à<6ÉéA«5£°á+aÅ–ùNB™UrÒ≥äÄò/"Ê "ñ+Û÷∂µxÔ€§3<Ø”ûtáﬂ3d˛†øﬂI/˚ÍìÆHr
.™ﬂ«ÔŸ–ª fgÁHπ°è;∞ß[àΩß? ®˘Õù3RY(uã|d0Àj≥¸Mò≤5πÖ›Ùãaã_”∂6µ‰ûEt-`π(˛⁄nﬂ L°§[Îô‰^ªWAÓB2J`TˇKﬂqöà´Á@s˘=ª•¯¡·&b.èKÚƒQ∑ÈÿïÁ ï¸ˆKì]lÙ˚ô>Í'√c R∏h÷>‰≤aû˚ΩR<£äó\=a72èçP^y=s{µ.Á…˘<Àmµ˚í|L\oyø€i/›ÖueËKH.«ø◊©î≈Ó˚øbÈî ›ÁAw˜£tõ∞€{˜œ!UPÉÆÓev‚ˆ8˚Ä‡±˙&g≥¡◊¶ˇcU∂qÁÎ·{˜M∆
ü¡«Ω˚Îä° È9V√Í§+ÓóútÏóîﬂ=:–Áe„Tx*ΩºùÀ‚åBcîıbÇ«Ã{KÙ˘H}X6ˆ'…Üø˚;b∫_óñ»QJ≤x!O˙Ì,Ì'`¢Rª®|x‹GcZîåÚ5„R—Ôï> 0”ë9x/Íè¢.6(AÈ⁄âiíËB_û…Ÿ˘≤È	¥MâP"”ÅÁyEõ„rAæƒ}À–<#c∞ü(©[08JÚLTÂ9≠ì@Ó«CåÅ?ùË»Ecò#ÙúRÉÆ	•zÀ–¿¶Bˇ≈≥4¡FÃ€%æ›øà©UHÁ‚^[“9ã£üû©«t5”—∞%€` X-}úyÀ‚ÍJâ…òcqTÎº∑.ù -∆cùﬁIGf≠ûß+qNπ
É¶ÅRKÉIep/π)çäƒ˚—)ˆËq ù˛CwÅ“‘(âAâI”àk¡Öj5©ds≤Nú@å<ÃW
˙÷6A?¬ÇÁô‚≈y#’ÙçfØΩÁ°•LA†z¥¶ﬁT'IØçHº¢3å`4ôÒ¯¨J:,ûº‡À(¬B6?Z¯∆◊=q∫U◊ÁÑFñZVùÆr/®(NBy„LWÜ™Î-M´0ıÍ+n#¶‰ÔF7Ñ(h Z!üb‡1C>í4gç|úÖ]‰ÍA›WÛóµ5W≈-«ıéÎm$d≈c´ÇΩ”çˆ6˜ﬁQº7Ä`WıJ®ãÅΩ{“—√Íi‘…µ
dQWº>oA´4±e”ÏZ	gAﬁƒﬁ›
OEuÿëe&eé&^1]Ã‘)[|·y◊mıt´\Æ>dÔèt∂øïn∂ÑFﬂMÇ¨—±¸É¥∞5´Œ›‡ÙÉJÁ¿”ÊâS–à»B)¡	EoÎπ»‰Å(qÀ^q_oﬂüè‹˜g‹,âR8>Ë]éO˝Tƒz¯áEË±‚æ¶åÑπ$>√^ÀÍmnqh`¸]…^ë“Ô“ó+Î™e∏Lö%l°ù‚#-⁄Â¬Í#R˙3˚Ä¶÷LX@ËÉƒE(ÇrZ*ëÂ¸«K∏ÒÌ>-ó»Ê€
ÙèU=™ƒ«÷pÕ¬Í=»õÊ]ˆ¢kÍ´¥ÆEz˙sˇeª8e¥ÊÃæÈá∂å∆iü,‡†Vﬁ=∏O˘¿~hF”ÅÚ”§—}∏Õ¸irZ†¢'Ì=7‹äsF∆|§æÚ¨q;ª˘)o”ìvˆö˚ƒô*∑‹¸à˜‰†ë9√*3-g≥cBU&{Œö‚“ïSè¯MÕs¡ÍÙ†vßU%ÇUw°i|!…^ÜT`À”≤ÆÕÑ=˙[—74Ìâdñcﬁ˙“u˙Xóôdó—]Ø˝¨Õm3áLJ”.∂aO|´^¢√NÙ/˙~˚5ˇ∏≠Ä)ﬂûG√|k0∞£N‘¡ú∞lw”≥*=ﬁÉ~ßXÍ⁄õ/R’)ŒR°3ÿ∆ñ~ˆè3¢o≥≥‡p˚Úy∂£<nŸö7ª˚‰Õºº˘<—Ç`⁄ïJ"NÎÛµ9Ú9|‡ˇÙkπÊ∆&}pN˘7∏9⁄∑Â=∫¬÷cn©r’L‡Ø5 áàµO°ÌJJ˙ú ê•Å©5dπ≠T) ¿É@ÌN´	⁄s7>%ân˘~;`˜njù‹–ıÊ'Äƒ†äDU1◊„le8ïÚõü¡)!=.ÏS!}ÅÀSˆ∂ Ü‹#&≤%›N7û¥®ú5¿ü'Yªö9T*S∂ +2;ˆLÛÙ-õπoA‚_UºE⁄»Ê·ıMNWˆÊ/›abßˇzôÕ⁄Rõí£wª'Û9¸º≥ãŒÍîg˚Y'ÂY'uíûèŒ£,.f&§œı&ìÁaùé¬Œ£ã$æL˙gæ©≤<ôÙ€º˘ÃØ¥ãù©Ã“AÒ–òô8Ã,Ê^gÃ,ÊI -Ku<ÁVçÿá˚Hv©˘´3õ€f≈
¨<é±'€¶πÚYÎrWŸ-s,&fÌ&≈ÿtkFπc. jEqÉâá/ÏvÚŸÈfûD%û√QÖºÔ©nN1Ù	∏—ZÏ66dw¶ÃA˛ ™–QA–H’iÇÄìç¸»°ì™ò¨ ˘^ÌÕW7?“iQedxÛ”Dˆgù∆P8[NPÇv:K/^,Ωßüá>hÛ⁄ 6<ÿ\ºü%HÌ^fñUe{	È·üÛ$Èºs°“KpÙùwΩéÙïº% è*⁄∂ò˝ËÒ‡n_¡åxÈ¸˝ı;¬æÄÚ'√ás BSíc…S$GëlZ˛¿ˇ-fE÷-äõV§:ÿÆﬂy‚>–x £‚∏Ã›Ey™$d‹Í¸j≠çvjï÷´©U›È∆G‘p∆¶øœ≤¥Wﬁñ⁄Ó±y£ïË√)}27›ùÿÉUF†´oËQz`+(`rÂë{Á…M«Ã¶∞ZÔ[L_èmü«Ìﬂo'YªØ*6≤ùˆ€›Q¢∏öbÚ,Çd·⁄v^ôßê√·]QT∏ÊÈ™fXyL9´CÌﬂí–=π:»∞	ÓµŒïåG◊í7t^§Ê·ÊH$æäÿÄYÏı¢≥xè˛”1®ìÍ¶Qiù‚=˚Ñ‡óÒ¶`6«îÔBgs–9µMÂ`Áô€j6T#ãu”‡‰ zäy*å”$ˇzDﬂÄ˚Ø·ªb/[ZîÎ]§!cûæ&∏öü\ÅàëF;ä.†ﬁπï√uŸ„„ÊJõd»`ˇAzÍVßsú*8Oît≤≈5&öæ∂4y*:„™ﬂ¢ºX/˙Ê2% ∫Áÿ$ˆ†)-<˚∑¡y)˛Üœ<¨ä®-˚–ø≈Ê∞ÿA ÁﬂØìr˝Fô¬ıú*gÈ˚|Ì$ÇŸ&∫†∫êÃK‚ªJ≈]EóÈ 'Üyõ◊â±o\nˆÁ~Œ2Âí>%ﬂÌ≤7≈√°_Wx8 Çı * ÀgØG˜¨û◊CÙƒ]ÈâK◊€pÆM†™€Ò\›`‹ö≈I¯zïﬁ4≥πá‡T.<fn,µƒªÚvt"z«6wé‡{t^˝ak∂‡∑Ÿ¿§hGY˚‹sœ^Æ‹ÖÛcIµ’g2M°À√ø%e]çÒôM~¥>Ù7µ6ä∏–◊–G’à®2GHV°ƒ¨†ÛÂ(á@Á%≤-jVç≤5ªÊb9·J!É¿\ˆxØc&‘œ˘ı∑ê˘˘*ÈãTàTî€bêÑ?47ˆFÖ◊]”∫VHﬁ[ØDv î¶†Â«ò∫FŸçËÄ©'¬c*„Ãy†u¢…TÀoûÀ∞é9ßI?Ó8‡17∂ß€˝¡˜ÍK<[⁄~y;◊;±[î◊π–€ ºfù\∏ÊÜ·$úŸóábn¬qπT∆x≠ìd.»1ßàÉx&®PÌ0<’¸ÊG T≈0ÙåñoÏòe∆Ó°⁄Fw,Óê∆—ô#hÓªê˙ﬂ¸ëŒS>[{Ît/,ÄEπ
÷7à:@ªkˆ|å–ôácb¿’”Å≈ÿâÜò¡Ω€KÍÀ”å\üÔ˘¬ ä≈∆≈(ºˇ/5√E"´Ê"≤û£≤PWÀû.∂≥òÍù≠!®π˝¯í–◊£íÑ ïΩ£˝#‹4 WT°ÌUÌÍ øıù,„Ó0¯…o∞‚&+I≠€!è≥j/£·(«(˜ íŒ”∑Y‹éOË?fÌ˘UF:j–∆QûflËJ÷oi˘¿>:KrüO-D¶Â+±RÆÑZ*Yß!5=Á≤<•_•Ë≈∞e":¸ËxÎ´›∑˚á;ªáË˚Õá—YÏÎE∫ë@£bﬁ_º˙Z¨)ˇÀ0ı‘˘Y<ﬂ˙r˜˘—kÊç≥è◊õÄ}4{ØŒç%∆ê°{Lá˝FWø ˙ÜûÊ©.¢câu1Hà\q‹û/§æ+¨yyPà¡ÊÃù∞•ÜëA∞‘Jìv*∆⁄vî[Øub3w«∑Uﬂ∆+=s04ò˜hØπ,/v”V{ò\ƒ«—IkˆÇÍ>ë’¨Û=£LRùŒS4≈dÈÂ∑≈¬º”A6öú«˘-¥2e®ﬁÿ°\5eaû¿ÄôxZ√òs›7ãúaìëÀ,‘,±6˛U“K˙óÀlHO…6±Tæ§}Ã?Tb!·ò|v €ü∞z¯–ôRÓè∆E∏ÙﬁaVøx/'"~ı√Ωå≥2Ô(sÕg≈	£]|<>ﬂ¬Õ+<ª•WWp™h6û`r#ÂEÚî‡}SÈ©Ö9_cLrŒp“oïÜ&¶VV©ê˙îËπT~≠	xúLf*±“Ü÷œ=,˘πlÎ‡ª‹]ıIÃ˝Rc_Wr¥U§«Fø!lF∞ˆıñO®¨È¡èô˚8[·¶ˆÚº»YöΩûZ∞Ú/¶ëßX6`Å¨◊(æó8—œjDÊ6h≤Tu5·≠è^Í< 8ÔQ…ª\˙9Ioà&}Tœôe4_˝4<+∏ë1Á&®Œ'T&(Á-~±∆6I*ù⁄òŸøàø‹ô}¯V°Ï∏9É
ÅYˆnFx†mÈ&æˇ`U5˙<W¢ö"≥‚Å»|ª∞¯TUO±k|Â˙øûúeAk±ÇÉ°Liß]>*UÉ‡ÒM5]Áoµ≤Õ•∏â
‹o˙t”ÜÅÏO„‰'u‚áIU?≤ÄAÀ â‘◊àPXnœ›≤+J`;OFÔsU√<päJ{ã`ÂÄTÍDØ·•v«¬'„®F›ä\YËüãˇ‰Øl|a›|≈˘n/ f˙√ÎOÀ9Û»2ïl¢YaÂlù]õŒigD´ı∂‰ûå{ÿ¡ÌH–SÎjKÏäçøVﬁXyï¢‹≥6np;zÖÕ–cY∆∏	´≤∆çµXS‘M∆Aÿë«Õ÷Gpƒí%3ù€ô!3FúnçÀx’& h´zﬁY˝bÀq,øòd≤çÓÓá?Ωè»5¢!®T@ZL˙ :Ä´^+áƒå/RÄÖÖÂÚ—/GQ÷zÒAq	]uÎ®∫8ﬂ«Œã·ÛrÀ’ßt˝¡M|êv¿8àŒx”1&ﬂúü›XØû “fr˝∞ãè∆§T†K≤a|Dâ”’âà8ÿœu∏W7ìñL?O;È =ﬂqÊV.‡∫∫1ÆÕñ¬ cBgzŒº¡ïMÖgÊk0|√F¬Uac“Ñ∑qΩrå’R‡Çº§®â⁄qèCƒÃjÏDÑümºë¥˚Äõ‰aU}RUSJ?’9’“∫…®¶fø>ÏL+x«}X…'ŸÆÙ=‡¶µÊX˝wu(º$XΩ4?’√¡¨Ûd∞g¿çyRXÙƒfZ∏b¬>V+Ü°4ÿΩ©Dc≥hÎvßOÿ.~§Ì‚|»ı»¨Ωl–nÚvΩ&oBGO⁄Ã¬ï=©?≈IPæ_ -ªE¡–Ùÿ¡”çú€ '9?»¢?`"'zB‘q	$F|›OlS5Zr)ˆ·#_1M≠ÛÖ∏èòœöfôKÜçïù
π#®"Úhœ∫ÑµÑ˜	≤Ud¡7≥Q{8 (˚C›j=8ﬁ®Õ2˚Û"[ ÎY‚vSRÊ›*‘˝`€„d‡K{$˛Ï9bÁ†ßåÖ`lX”ô—0NÚô	qåjÀíõ≈ßÃ™ì¥SÄ`KÛŸ˚œK©rƒµÈol8°›)o∞…Õ?¬U˛ƒ5shA”™—∑˘u„;s‡Hì=C§Á[›>€ %SàJjbƒ”⁄M_E√§{Œ6BKGÌ(ù‘¶‚É◊Õ>%øÃmTí◊ÕÏ œ—´º∞∫k ¨†∑‹⁄Ò<¥∞ò¿îçÖõ∂ﬁÛäó{K96}√à¿’uü3≠¿Úˆ<ç+ã
†:÷_¥E—\M≤*f≤˚πtC◊xI˘ñà¥Ä°e EœM\öŸ~bD9†>· ã/íú*∞vÏJﬁJ≠ÈŒd35åé&+ÙaåÊ 6ﬁH
`&ô≤Ùí*¬´1„~!Vîm0\uˆ˚›˜÷˚Ñ$}¿ä%üÿúÕí˙ï	⁄Ëc>®:QHHX.RuGzí4ã!^)ÀMYî⁄ìÉÍQã˚ôLΩº∏º˙F˜® õJ¢–c„L0dêÓm““‚/	 ¸•fÌ“gä◊¶j˚∆V7ŒÜwBDäW1∏∞çÖmL˛˙˜ˇÃxø/ƒ:@R∆yAüÚa“g◊"‹$é	ÔM∫Î∞ï√¨xVî—!÷§®Ædrs—î<6s|¢Ó zxêvo˛é>Ùàw¥&‘7®Ítxj÷˙PÂJ˜F¢ÜÂP¨\Zï≈£iå;^iœrSœ‰4u*«qxµÚ=]t%'qﬁ:ÿæwº∑Ωıˆ`Î´≠ª/è˜yqÕKyhxÊΩA¢*E=Iß®ËÅ:Ú+‡∫8©Îïﬁöj›H–˛IñúE√î™1Î‰Å’¡.]¿û‹Q∆F0ênì@ûÍÌÓ-dweôVæ5;=òU™A§Ô÷ñıÊ;¡gà3˜‘JÏ∞H,FÒ.÷0à∑&•ﬂÚYEqWDœCÉ&åÚkØb8œŒ¥Ç‰GB˛¬&âÉkŸÃéíÇâKfZßñ'MDﬁRˆ‹õü·¡É%íÙìv¬˙%√—∫o]E3=zÁVﬁÊ aFZÌ¥wBE)+U†ø≤∏ù‰Q6rŒyJ€Ãu;≈«èf¢Û¥yùOΩÛÑ'˛ŸZ_∞ÃÜí.o¬Rá]¥ÇÃû ¡W÷ñ1·åLÀÑ<·w˘ª~ƒáüußO{ÒÇµuD˙84≈RëN* Ä´ƒ—¿Ì#>N˜OçTŸ[ıâOe!Ä°≈ÏnsÂÂŒ’È„”h k*“ÑØN≥aL`Ú£Ÿä∂ï§÷]	Ÿ¢”⁄§_è¢Ó”∞M*¬t≈6‰ÑŸí<«…±¨á±6\9ö’u2ÂM5„O*‡/S˙∏b›ç†f˘,i?‘è÷VÊ"ü≤{MËbÃ\ò;fÆÍä{Ó]˜“m‘7ÉW∫§ˇ´¥ÄTò0ÃˆÁ¶àí˛_ûó¨ Èï«YîüØ6™p˝¨	Âvî£ÙÌ  †Òxﬂ*⁄
7…∞hÿÆ“˙@iﬂﬂï‡?`ƒ™HÃêf1ôMœì. œ±dV,;øF…ñiÇ‹Ù$zƒ≥Áô‚ƒ-§5FòhcYPd©∏ANà!P†eSü›ß3^2<ûrK|eÇπﬁH4˚Ãmµ™“ÕNP∫∑%t5b·Á.˛rå…¸ôvï/∞∆$¨¸Î_»´∏ﬂN∏«ΩñÊkâ&û.bÀÌ$KÀQ«”ÉÕÒÇ5·Ò§ÄQä˘ï Ëö¡Ü!≠NBE]Åâòf	QﬁY[n ; P.eó=bJL4Ÿ£ƒˇª[åï
‚ÉI(à”Q˝®˛»è3¿FòNR.xú¨,§FìíÉÍX¨lƒ¬5À†À0Ít‘≠¿≥“Ò¢Wo-∫qîÕüí·«V5¯1$äØòDh%∞¶Ñ&VRBúU%nQ…UFSrHˇ¸s;}∂Szö–m—=ÕÖ˜∆¬–†®≤◊·Ûƒ„Zsdì,C¥œ‡‘’eVÆ'EÑ¥°!/‹fÏåNu‘KER›i“è∫$~ó ò*$±îÈìˆ∏ôH+ÚƒÏiaßä8ÜgYsPóe®@È\?OCK‹í¬˛.wñî5˚Æ¡∫ôQûÇü2*:Â¶§Átµ≠…L~kâYb›Dñÿ2‘áæƒ¶lûdà∑FÜLfKë˜vêÊêÚÀ⁄€gò\∏N ñãÔ7˛Z VçäDÑj‹ÙëGTÉ{4vÍàó2fE∏çÖ∆K$ÒN¿H)Yô|JI)zäi
≠¯];f)îQ — Íd ÇÍ(B§*¥H7⁄<∫˘ôPÚÇ‡£të∂o˛DË!}Û#∏o€q'ÓCˇNÃéz 3?ö'£ûêî…iú¡ÇCUü-Éº£„}2pÎdã÷\Œ˙Â…ÒäàÅ´ü«llÍ1πGv¢€D¨¢><ÆÒ°eÌ>éı†
Ôñò6≥ç{T“`üŸ$›eÀ.ï«\r(Œù°m≤Â[ÚØ5Ê±Ää¡)≤õTt¥õ‚vMòCN è‡3†:fb|"F¥
£d˜Â˝≥Qîu¢å∞¶ºl-&ê\îñ£œ¸ >µŸGoRZÚ‘ƒYÈ–’‡hn:¨Ëv§0‘À¥ÛP≈™G"ˆ≤ÈËæÚé€±ÈÇSúÆF8–Ôà’Z.∆√Ñïê6∑«€\(1«2»mc}Ë˘ÑÚ≈®;Ñ
∞ﬂç≤4'0xË%yì™™	`¨xîµÈH>ˆ˙≠è*T≥…'Ôy¥Ã™ÑPt∆Çpˆ∏rî˝µõ¶í“wª∞(B@πu¶b{Èæ1’˜0´∫L•›Ù+S›S±∑ÌõªÌQ7e«Q£äÀ˙BÉ–Ú®;SÉ#^¯ã<Ó…ZÎnV√z‡qU∞•§wÛßj‰}¯NQÖ5dxzÂm‚ﬁ‹:Sß›8ª˘ﬂ}j∞πHn√;”¿yE0≠∞M°ﬁÛoLJ∫Lé@ÖøWr,]_ÊWÛØñ>&GI[[âP+_'ÌÖ?⁄¨Ωhò¥SÚÒíiöq;‹ûê7‚ä–Ÿ3+Ç‘˜¿oNŸ2¡4*Â›2N2D–Ú4äkq„¡°'”KπX∑wˆHæ§’HÍË€bÂ—Ù˙ó˘≤¬|L†Æ∑îÈrwû‰ÈIìÊÈ,|@ò§„ÁîzË’z?˘˙vÚ
ÿ—‰	ﬂÿQ∆ÃÔñÎMË€ kÓ*}»‚·(Îª≥5+L˘µq´w6*Sú≠ûwì2â÷Ã-èáq@„8Ok∫«∑Ãú¬)XvHU%Ey_]®vª$„F*{=ÿGªßÒ0πHÛÎé5üfRîD˚·EIV	∫ˆ1F¿'EΩ≤UPAº! FOëxæ_≠¢ÊzŒ(|K>ËØ¢˙DEêÿ öÁç„y>„„ç•Ü*É|‡JËƒ1Ωe¸Æmj*≈›»·öø«Aì‰Ò∆À‚s¯Îj*´π›+!B¯/q>Œ
¶l†v7ŒAêÜ¯¿V©JnZÕa]≈˝ot∆í¢ç¯íU8\DYB•UÛŒ”|8„À≠‘;¡_oÚ}êm,}È»ÎÁOÈ$yt“ç;‘râ.(£c^ó§k€È∆GëTzØcó∏ªŒà%B∏IÀ)•?ª™F›˙ÃîÚ6V≈ø3©ÎÉ	—iQ˝hTˇﬁXB¬ÒøÈë»˛q]≤H"´í∑Å_óc&9\ÚƒºKö#êí*“⁄mÎWã•+oboØ‚ïl˝3q•OK˚jë⁄√QŒLGjà¥G˝sƒÂ¸nó^H	W‹˚Pmëö±qñ^G…,Æv^Ñ¿îm@Ïzgà?k^zAâRÚ[≤r˝›¨›ÀÙ"-& ØfÑŒtœäDZyùæŒ«§Ω[8á∂îÁoŸúv”K˙∏V›≤√¥∑ê∑≥¥€=A81cáÙ§kÎ†ÁïûñIãÀ∆Çdg⁄ô.⁄WL8RÀ¶ŸÕ©¨¸Fæø˘ë‰Q2ÇZÃó*g€&˙aî∞eı"j≤≥¥∂ŸO/"r¡÷ëZ–ÏK“∫≠(5d{`—ˆÏúﬂL"lw«}:rú'9BªµSx‘¢´˚ŒA”J?’Ñ˙öå≤A7∂ö;‘>»Aa›(‘ñs”ïØâmªW¡#Ïæ∏ô=Œ(ÙÌ[≥Ç)fÔ£ˇGÌê<é≤ˆπÁûΩ\πß7ÃF÷ŸŸ˙Í÷*ƒ[Y|¨ó‚±µ±W‚ïøÖxÂRñuxÊe>_•∑
O?À©∂qÑ$ï“ﬁó6…ó£º“ògoo”›Ç`æFAû=	›≤wäCáe·∞Å˜:VQÂM^∑w¨ZË°m–_ˇÈ»´§ﬂF¢
≥ôc®©Lj&ft_[À"]êÚ„"ÎZ%gZx¢Ï|[∫ái™Ú(ÛDF◊T©]ˇ∞Õ6epÙk∞NÄÉO©BŸqµy›ún˜ﬂ´otli˚Â¡Ô/ƒÓPﬁÂbù–µ†Ã¸:lêur·öÿ¡9U÷pZ_äâ«›òrF\¿L€g8Ä[«õ·ôùB/=2%[p>%<≠‘6≈Ãï»Xã)≤äÃ≈™âÔRÓ»‚õ?™!e∫	§§RÎÙ£N E∆ò:!t⁄˜°u£®ÕÿÌ%yÓœn5ÅlVVÏH6kıJQ÷+Õ˜S®µjNcÃ˛Í⁄˙”≈65Øáqgkâ˝¯í–∑cÒéΩ£˝#‹+ Jf;ù•/ñﬁ”è∆ÊÉk¿π;åﬁé“’∏Ì V ˇA“éèò∫¨‹xÀ≤ÕÌ≠àΩõC’¶Qû5ä˚
iÏœêÕÑÚúûL¶çeÊÊ>:ﬁ˙j˜Ì˛·ŒÓ!ÇûR{È,v£Ø.¶Ï/gZç”-Œg¡¿W_„0o\()˛|“Ñ/I'†p*©÷D´‰Q˚Gòo=ííViπß%π Ê13n—ju4Î ⁄ºâ§%`¬∆÷=æô±≈∑ﬂt¨≠(∂^kõ|à7”©∂ç∆oÿÉÅ¡ΩÇˆñÀrb˜lµá…E|ù¥f/®&YÕ≤
#KÓe+˜òö)%K$ø-÷é »∆íQOk®'@Ò0≥äxGG…ï…5¸˛Ÿã=0#GB¨©8@;∫ `Ø	‹n©ögxŒÀﬁŸüS†gŸòü1;†‚'®*~*z°‚G@t”7_DHˇd¯ﬁG}0OñGÚ√˝$A<u=∆Ü∑ÄÎπNWAa]˙N=AG2eNÚî‡}ì √:N˘ö¨”q ˘±bN69%AIbZù^ìüy–—>Û5æb'ÍƒæÀ˝¿∆⁄™±Qà?√@SÛË“oCµ˘&„“>x8r<ÿ“«55Á*‹“^÷Ç˜8K≥˜¿Rã‚Ã`J7∆2f:fòb@®¯^bƒ]
<}t§OeÜ	gΩ+Ÿ‚üI5pf˘∏∫„H<;∏1Á&À
©«/~±¶∑≈	ÎÉ#}™I»w
ÂDı@ä®K˜ú∏l}ñDV«∏≠Æ)2+àú¡g·0¸äO%,7'Î&¸$-¡√kHï≤üJ;Ì6R!ŒdMùø’º)ó'2®æÈ”MÎÕ¿,_≠	ê…(§é>@?e1V’ï≤b@-Èv\ø#Kîox ’\	¬ÀDÍßæÏ“Çêøßß7∞ó÷H• @4≠Å ¿ÛÖO∆—<û…óúù+8bÃ.÷iI*î£3ºó ßÂúŸD1ﬂ∞Ur&˘ò(˙k3t@y∂ˆûÕXÁ4Åc£’z[2œ∆<Ï,7®R$fÜjπñ€®ÈB≠üÏÜÕÏ∆˝≥·9ÓÜeÑ¿≤ÍuÍkQ%bM—X7_∆˝ÛQè∞Cê€µ~K˙ùùAÆNÀWcD‚÷x≤íÁò—˙«9–$≈6+3ïùP˙u¯Ωc7ƒ„‘s›” »ÆËı˚@M°¢∆.èyù√’ÁØçWbFçEoîAQÒãlª∂¨â¶`ª uÁÀÿy2xRnŸ˙îó'
ﬁˆÙùDY∑{"Î·y5f"◊$4Ó•‚ΩòC%J∏Æ:8Rx6úË:Ô≠˚NöÚ@∂ÀÓ¨∆;òéc8x›X∏≤Y‘d[ÑßÑrTloä~dΩïá!»fÊ√∑Å@•,h≠@Ìÿ„¬hùªﬁ¸®⁄ZõU∞∑»≠Ñ?©6-V£f¡€=é3≥Mc+˙∂y≤qN±Í#¨‚¸R0¨®¸Œ©"«äéÏ◊vˇ8è1Èà€ïæﬁé∫Ì÷ÔWP/©’l+ÕOı∏pDº∆<+Ïπp„ùç≤ô≤Ó⁄_≈<‚GìC⁄wxã¬ˆ¥gˇ ‡‘¿ÆêﬁnwΩVqB«N⁄Ãñ}"b` g@y6[¨÷M™Å°<›òª-r≤1˜∆ΩÄg_‚kVp·Ècä9c%SÇ˛M™⁄ﬁΩïT∏¥&c¬∫"AàIcÛ0¿—0µá£åÓà+Rπµ‘ˆo9•ë≤_ûÁñ9˘8ÑÅL’‡£ßåë`hÑû„$w7#o∆S0∫-≠nü6K®æ“N3*T“|ˆﬁsTXr∑{RÖûbÙvß»a3µõÑ´*a≠¥°I´FﬂÊ◊›&∞’J æÓ‘êôáËkÖÁ0…éf*{Í´hòtœŸ∂äYzµ£t“[ã?§n“*˘En¶í nñﬂ Û§Q"LAª–WÎÌ≠Ì¯-∑Å<O,õXP;7~ﬁzœ+ﬁÏ-e⁄ÿ˜zx!é\]˜Y1”ﬂˆ"¿qˆ¬ÓqE‘Kq5+‘hãj∫ödU,h˜s%¥c˘ñH¥üÍ&Y<7qÅVXÕ‘ÿ<Hïµ3≈˝˜Ω§æ‘æ&Ü{‡1pdãbØM¿∂YÛÿ6W≠◊≥y‹ªH˛œ∑í;T˙ˆ4yáWïÇﬁY¶^ïqX©∑|*„Ú^€≥o@∏c¡ÜÈi◊ìëÍÕ
√TUzøÎê®ÌrËﬂ≠√Wûc(0qkŒ&√3\‰…Ÿ_≠ıîC≤xîyRπ‘ç¨ø$∫∫Ë∑ûªÓÜ¸.35˚ëëöÌKRê¬{[UÜäÔ¬G·ÿ±R.	~u∞ˇ|Ôxo{ÎÌ¡÷W[/v_Ôã≤JG—ÜœÕm	≈;ƒÓU≈¢<`…dÂ&Öx}»=ñ=Íh¢ò
Ê–p˝{≥i∏cˇ$KŒ"h†≠ì6≤tE–Œº•k>=o¢]÷™hbn,ÁZÕ∆j:∑Zû“O≠ËY·‘Í˝âI"⁄¬ü8Kı‹Î'ÌDdz¢fUwÁ⁄ü¨#@òãÈ´?∫©˛\l´ñóñWØﬂ∞s∞u⁄º<c¬}≠ÔY$l¨Ü‘kxÒf?Ác+´À®˘3⁄¶‘±·Ê'hQ÷w[CA?}*úÉëÏ<óUc≥≈6¢¸˘d∫»Ñ„öãœ’˛…˜î(í8oÌnÛ√S?F9oøæò'›7H•‡Ú¢∞5.<ÖñW›Î¬™J∞ıôEÂ5ÈèeÁzåBK®®™]=©≈Ò+!?-ûˇöj˜Okvö/∫À3¬ÏIû„‰¸˝ÂCxø,∏O‡ŸÏÊÚ˛ÍS\.¨>∫±«‚iTÒ ÿG
.√}C¶∫3†«Wùúmœ( ‚µí‹§Q_ﬁËí˛Ø≤ËU≈;¬ƒf^¢´d:ó&Zq…™ú5∂qúE˘˘j£dh◊œöònGŸ0JÖß°c«EìGo+néaÌwup∑LΩ”†RA±~Â∫¬kÑ·Zã8)Y)äVƒX¨j≈OàLüg“âìΩCT˚g"è%zê•‚9Á§S¿îÆÔ¥Â)~*eÿΩ‹x(.Òµ	ﬁF6ÕgvLüUï˛kv˙?6¸ÑÇÚ÷‰Ø e;˛‚/«ÿÃüNT˘‚k¸A≤¡ ø˛•^ßm6gªÌS({Í≈Iññ£é•5õ√›«˛⁄0 fe˚%º—∂ƒ∑v:&böòA9jmπ!G)#πîcˆÑªn©Õ]¡V˛ﬂ›≤≠‘(LB£úéÆHıˆG˛≤l6¬tÚ9‹›d$˝3öêpTá˙`c#ÆY!jíQßc'nêéìªz;(πæ–ç&◊ïR!√6≠j∞ME√ÃÇ(÷ƒéì#˜"0áûªÌ'ñBOúYÙç∫§A=6ñ"¢≥iı!Ω•ùb,—ÌÕπ+πı…`àLî>Xkó¥>Vdì,C‰K(ƒ]∫ÚÃjï àV≠ﬁ^Æ Ä	∂®qÂä¶t¶£^*RÖNì~‘%Òª0%‡\ºïµÈR`™œ©≤˜«»˘±Ùo/˘ßÄÀ˜7A∂mn~")È≈9]gD≥◊äÊ8Àã√Mby-}‡Àkä„I∆U}∞+äDèÉ4áÏ≈4€A0≤◊…ƒ¥]„Ü¶∫ı‰â∞‚ÂI&Nx	3Öä´ßO"ï¬ß>ñ“¶x:ëﬂäﬂµcñù•\ˆ¢NRßé CÏ‚“Ï¿IuáõüI/ @÷QŒπH€7"Ù@æ˘÷¨w†≠‡g∞Öw@	èÊ…®'Ñcrgà^€)fÀRCË8E+ ‹2Ø÷ñ¨Qkç<Iæ†BEX≠o6uï‹#S–mVû÷ò≤éu-√z»mwª˙LyŸ∆˝	∫g∞ßlr∏´˛~«U¸‰ÏÇ‹Äü–k6ŸÄÛ-π”≥\@	‘πO*°ÿÕq;â∫·¬'åAÌ®©nÏœ*x$Ü›wîÎY◊™å∞Üº'&êãîñ£œ¸ ;µyGoÃ⁄2‘§˘Ë–’‘•9+VtxQ∏Èe⁄ãÅs®v’C¨˙¶ÈË^0Œˇ  ˇˇÏΩ€nYñ(¯û_±≠ˆI≥(JÚ≠≥d[-)3’mY*IvW∑Àcá»êï$ÉA“R™Ù‡<úß¡<úpû&ß
=@=5úóZ“_2k≠}øD")/’%T•∑}Y{Ìµ◊}-ÚËnÎóËî´º»ñµ£dîÚH∏•≈∂†¢…»·°ñ~·Ç¯ÌÆ!’sg	„E áT^;èãpá;œ Q¡Ø›ëè3M?˙/3∏≥[I$QÓ€W≈ûıqÑ:Å‹L”ÕàVˆÉÛÒùx˛˝®In)ø√èég|{˝úÒÏ˜8¬eÒÃ˘¯/xˆS·ô2≈m_ˇ–kè{Û•	Á:†E›ó1¿fqov$áè˚À∆p¸î˘
 y\'≤]¿•<DÉo˝8c˝Îˇwv™∑˘N[;OÛÊèôË„GGÌì¨ó‰◊ˇœ ⁄π4*wAK´(â∆„€'ˆ∑ˇπ»ÁÕr/Ùo %8ç¸≤Ñ´µ/ÿq⁄ßRtòá≈ƒ–≥/÷|1—7Í—Œî:WÊª∞ß≈\\˛ú•≤J… -∫e‰XÊaîK`∂†äl˙ÛÑWdÏfs®woÖ(rÌQı*1?º/éCØFÀ8–˘Ä‹Ω≤ÒËÓ*DUπíU°ãçÜÀ8‚+≤”<aK{¬0‘&ëwO5J-ñÙóa»tUÖDÃ—é{mˆú˛A¸Ê‚ºZ‹í	¡úC∏PSë'£q>(˜˜ú°)xx”Ä°g3]ßÉzíÚ™PB<ÙIù’sÍ™(¶3†j,ÓkÎƒO±YÓUï›œç˚qA&^>=‹Uªg…(ùd≈¥t–π-HíƒÒgIè⁄BπöÏ∑=]àEoÑπvÔxUOÉ§fZ$`˝qî€_«9÷‡°dr≤XŸT⁄Á¢πp©Vølı.3ÖmÉïÙbù,lπì)ÑÃÊn‚X÷‹_“X»ÉS¨à∆∆Mä,^∆€ig…íéFø¨öE(Érå√íAGé‚’ÙüΩ‰Aì8OÅ[◊Õä—JÖÉ¶[s{∫%?∂ˆ2Ë'˚Ë§E|⁄K: œƒ¿Kê·Ω¡¢vz…q¨#˚›D)ÜzœçñxdïÌêkÖ‡0ûŒ®~%÷wt2¿îä¢§€€xÂÛœôs´	ºˆh\)‡…€„Aója~‹Œ1A”€$/–îzˇ ˝F^ƒ˚€ò~ƒrô‘wÆRÚ˚©a‡∫ßØ}˝lçK\´ÏNWì4˘dÊõ¥@3yõ˚˘9‚»⁄€«,º,Ò£ì§DèqÙ∞ç∞∆P πÕX“bíg,=∆‰èNÃ˙qäZ·Qz£Ô"ødì∏º˝v“/"B∆”ì¬2°÷vP‹”ZÓ∞◊Åé±xW‡?˛ÒÌÉ;Œ†%`¿H›≥/Cl,ÙFy’l
ÌeY»∆§4Ü„‹Î`l˝ ˘¨ƒËY1 ¢[—ª2ÿ6”éQ–æóåÑvzS≠9˚Cbr4°-ó5§⁄ ,Ô% jÊE3 S®TÉn∆ùé¯(Ùç¡≤Òó`(qØ'áÅ=‹Ç9ë&ÅøxØ≤π©√ fÒV†ë◊’$‰}®aw„"¬Îı&t6ä¢∏¡N	WcπõVŸ©¯©˚ı≈⁄g¥)XZ {~uÔ^§9]ñ⁄†ÇoKﬁ‘ÔıPçCÖyØ>‚Ãÿ÷&d‘k|øtÛ59:N?Nπ#ÙJ—w»Vi.66e∑ø2aLâ©&%Ÿ÷t™µ	 ÿ+π4üéÔ°s>‚•9^i∞â\%ƒòR àwºú°úùBÀ^^ÕRıí˙‡æ»s…_‹hKí˝+9ÁÈï5{saﬁY´$*VÆ≤ç˜5≈(*÷©∞r≠R^õ◊˝j˚‡ı…QÎ‰‡√ÒIÎ‰Õ±Ã:G⁄{4 ã)˚˜cx¢ëÑsÛ,!ì‰(ö4€@îGIß5Q≤”Y€ﬂ_ªÑ?ˆÕ7õ˝~ïdYÂŒ˜√9ÉùÏ”†ó≈*nÛ∞sMUJ+ÏRd
‘‹h>v‚6%†zH∆j§˘9‹˘jÒ$ãŒ—Ó·Ê°≠Öh.7áOpÀAü”7›`)°3∆1ì–	˙¶øêÑÆú≤IÇÊ?òΩ≈6êUB‰öîΩƒπ£PE›5'è˝é
≠1°WB#h‰¬∂åŸ≈ôt$gÖCa†¬?î6ÄD∫{Ú¯‰Ô_Ìª,Ö‹°A⁄V∫Ø√m–.>
®h®jﬁ*Qn˜s)¨JK?Y∞fñûêX„Y ≈^€≤∞⁄°=k[ƒÿƒX¢ £}¿"ç%]œI'·Õ$ÈcLP||ã⁄ÂMŒ;!g·yUè˚Â%mˇ»ﬂ˚Œk”˙«íìoúÑ|FÊ.öXiZã“hE_§±’N Ç;	†k7)\ Öb}√Ã|t2◊@i…Rπ≠döÚsÎŒc}|ô∑e:;sO
Ÿ('[B∑°ì¥≥^ñ^ÑcË(<Ó¶IØc≈˘QR<ëôÑ!Íe9T}‚:e›ì¥*Ω¿lÁnYπØ_¨vWﬂ=~<ÈægΩ≥^ˆ	ét&Q8’˛j—Œ≥^Ô4’Î¢Èmºg„}πŒË?†‡J1Ã!_ ÑADå;®FÀì^îX6èR¢ÆQKè`µ]Kß
ÂåB¨±v9°?áÔdM⁄Ky2ìÜ>„Ì∑G∏±Kr0∆ÉƒÕü/{}Ó”›Ÿ‡(˘nú£Ì¨T¸ñõÎä[∞œ&Á·n¨ßÚ%≈¨?¡¢Fµöˇp7œ≥ús/OŸ‘å´[õKèXÒπuha¶jÎ´§›-Wü©ˆoC∂ [Ì“≥≠óqzÅY«ëÈΩueîMMmÜV‚`´›NÜ#‘6‚{iØp8]ÌFÁ·w¢nsΩkﬁ‡WÁ‰√ùØ «u≈“3›KgO‘√;E`˘Ú€√⁄ ú√_Å7œR`r÷2™1≈LıWjãª„À·<œGé∫·Åw&r#≤>ı5V ‰ ~ˆ*”Á“óæ8©¨“Jˆc¿4°ªd®†lôHÖ
€öÖP.ÜI°™D≤Ú|Ó—ÛXç>,Å® rØw~¸%9∂?eøø˛A≤ãM&$a≈8,tI«⁄ÀŒ”j~É=M@¿®?¡u*‹¸KÿëF¶3ΩpıÛ˜Õ†èM¿∏¥\u_U˙.§Í2€öa
--O ‡A®ÃÌµÃΩå{ã≈Œ‰ò@fÖœ¸G ßÃ'û’OB[J_ˇ±Öéb—◊ﬂ&óxù!Löﬂ&óúâﬂEÆ∏VÁñ¿9Éì %*i_†<ä:∑.ãZkÆÚÀô\e∞≤ıúŒ∑y
d˜íéx9ÙÕ03·Mo’}Rd-2Åø¨6N5›–~%~ãAR÷q›)∑Uµ∏.◊s7ßÁlK®|%≤!g¨ºfÓƒM≈›qÕ‰ÓnäÚé∂d{yÜÙP^w Î√1√XUZÙG÷IR¨K∏Z”û´ Úáƒ∆G”pò`è5Œ≥h£nM≥3â`hÚZ@◊u{¸-´›M:„^¢,Ás±âÅÔ*ÿ=ˇ}i°˜x∫÷9l0 Å°Ω!áLï„·=K/Á›EQº4¡T%ÒêV)¡bÕ÷⁄Æÿ
1}n´≥CU@$@ﬁ‰-Çn!e®§ˆ*ØÈ=ó‘s≠
wé`n"≤>’•lX&~Î2QXÄ√¯™Ë‘_YÅ≠ºÆ’çÁıe2ﬁÑe˛ÕîÁh^¯™RA‡⁄˘%≠”∞ÜkûÙ„	‰[‰œnnÅÉ}V∫öëûÂW˚§2SS¬æ…Ñ† â\ò≈~∂b∞uæ¶Q⁄OV°Ÿ∏ÁÆíèT∑ÛBÓ;&˜¨√?êã0ærgØïf~m—•X¿1l~ùV≈π3ã*·Üñ·Ö‘Èb¢=rõ◊,—ΩYk'ÚóÉ6+”®ÑA¿zmç˝fú¬ä≥†õ\¢≈Ãn<±‘Ô1·[ZåH˛é–C….XÅ∆RÏﬁ<Eé,åÏKf«yß#ƒ‡ï<ÕYü\_:âŒ≤¬ àé˚ıMV†H⁄f˚É`û« ZûÑr C7Éåù¬:gºüNì«ÕùåPo“G—]∞\8M’ÒÔ«ﬂ&;·/ùÁÒ$†$ÄˆyåeÁC<¬–’+f=ÄÉ‹∏€ñÄÈÙê√ê1Â≈∏[7fÒ(ù ‹: N‚óy{¿7/P?ÿ ÊŸcú?ã€Ò)Ä´eèÅW
(P4Ö≈GÒÌ¸ œÅz8äá{<MR‡Bw∏˚§Qå¯=qî)‘	ËFŸßΩ"~g@Áx‹“ﬁÒ¡1˘üE·‡˛≠âÏº¢k;Ç ùdp32_™jågo∞ÑÑ )∫p}äSËd<åOÅP7œÚ¨’îE≠ﬁ‰ã]ÈQ|8CÁ7gPcµ7ÂlßıfÚ]TK;5D ﬁË¶BËÇÉ%Ìë4¶›ÏS´ó‰£Ë„k4äúe)†JQ\ˇ	S#‹”¬ˇMÙ‹ƒœõ}ƒåÛd˙=ÓRˆîÑﬁ„=Ñd_È”ÉåÃ∫=å⁄ÅΩŸ‰†p(‹o,ìdaò·~ÇmU‡ø¬Ä†1:À≈ÙJN˘≤ ˇa∞Y‹dhW ú∆Ωè˛ï#L˛Ñ~èŸ$k÷fMÑØ≥XX_Ú®∂¿ﬂ∞Vœ[KÄrhT€2÷5∏d–E´◊˛')∏[ÿ•JK9^—ë≠†≥G∫∫8Ã¢6™∆<É±èÿuw”bBp”óê	·ãà! étûÈ`ã»CZ·”8Ω»Xt÷_`l ´Dœ≠•N∏”GŒ±_⁄Sfœä≈*âuaW©˛s¯%ÚçËHÀÒÀ†ÎFä6< ≤4†vî@7;ç√ ú¬ †ør`Ì⁄G#QÚ‘€$zﬂçCGg~·ù^⁄¬Êw¬Ut±#6◊I»fnº1n¡ÿkîj‚,¡√v@˘Z≥ã¥üŸÎ3'p∏^©¸eìÖDÌTÜA‹◊®e2
Óï¥&Üˇ(–_úÙ!'a®FÇ√7C>xîå|«W˛vÖ∫o‚@PÍÅËxbˆëÏßê¸CÆò⁄úy!wsÏ»§`r0∑.*àä§!µa†5p}¿ÄÜôËiE¯Í∑àÚ∏ñJƒÀÁâêÊ¿ŸÌÌqƒëmG∑ªÙé¯ªq
<_∞Ø∫¡Û√†é„ÉÉUÖ≠jsN≈Ù Ëdr∆Ü√}A∂îÜ»ØﬁŒ∫“áC"”ø°qá2ÌÌ"$õ¨uûiHÚMß¿NÛ·|_#ÿ≈`nN¡“u˝œ∏7|≥çÌòù–r
2HÌ<nñ0b"¿‚+ÿ3≥y±_+d±=ÓÏ˛¬˘¸ÿúèªã0?ÂúŒÆ”jıÅ∏8k¿õ€ÁéñÓdπc»[3◊‘ÁÎ…»Ä∞ùÊÌ^¢åO¶!€=iΩ˛∂D˝–b,k8L/~ì[ÅazA∆âÛP«…∏üÅ–|ímwQ_®9ƒVZtW‘Ñ1Ôl2[Â˜‘n^—˝~†•”q⁄Î™;ëA=øM.7ıË–€∞û\Áºeºtö`'¥”8øDΩé˘≤Û»¯ÕúÊõxm<Ê∞ÿt`¢^òŒ2óQ[]ÏÖ±P+dt±_˜-. Ê¢e˛I≥√ΩﬂZä)œÓ‚†qPïGU÷€Y/P±ÀS¥zN+üVﬂ=¯íî≠]ı›ù¯W«E/∫∞??ëü˜,V.·Ì∂¥Œäº˝¸Ícw4õkk¿ 7øÀ1P7¡¥˛⁄dcçô¨~ó√\;…⁄Ç’£«ÎˇœÒ†yg’ üΩ9⁄C.3@œëFÔ:U¡iÒ|Â7G¿Üb	 ø]∆î&,Êùù˛÷U‰∞b¥EÊ	0Ùyíf¿∆]>_d´ÚñÔ Le‡^xq≥òN‹ˆNπë-h9„Â≥(Må≥àUÃﬁÕ7©Nı3 Ê¢æ1TÆJiÂb 0€âﬂñ9Ç‹LÀÍ% âïñÅÃ±@•°Y3≥©˝X®?!
uC‘aß@7ø≈
Ä¬â'=ÔéXøáêW÷iΩ"-BﬁZ%˘ﬂ ´Cq„™û‰˙ÚÑ$Éx"Éú{È4ãÛNÛS¬ë5˝Rã‚OW‘ö Î4L„N|o%ú‹&$P8¯≥∫açº†s¿0s™FUŸHqÔa».v+Ö#Y‹•ìd≥ —é®«Ûz¿Ò:ƒÃ0ü ÍE˛‘» Ö90·˙_:Èy∆ÄÔ„s)s;Î≈1≤ø ´@¨9#HJ”äÅˆÈPÿjf‹´b1ñä‘Mãó„ﬁ∑;	öÖÔŸ.`¡og∏Åø)u”˛pªÌﬁ„÷o¡ÏQµ;X8”Ê#Ú˘d%ÅÔÂ,±zÎÅ'Z<£Õ ~!Ô?∏ı+O%¢¯‹ºÔk9ÒÆ}êkN–ËHæèI…€IäÑÏ˙ ‡4gò,$úóTπ€∫‚zΩ§ÉÃ|Åòr´tÑí˘Á∏⁄ñÎ•˚/ÿ.ØyUÆQ#’YA∂¯‚,IGq”›_√J_÷IwÁëJlù”ÅƒÒëà°©üZË0£ƒY=<aÿ“C#]òn˝Ï$èãÓ<•]±Ù;®::!U@X8∏U5Œïå%4«!5ÚÕPÊì=ÎπBíåS ˛>,EºÃaR‰:êÉeú8ä}QDÒ˙_Dbê¸⁄pˇ\®áiLw≥„öÏÄz£Ω¥MÜRa≤mg˝LTuDjÄéí„~Ïc,OÍ2ˆ1π:€ΩÆ¨ºÈ¨D˘V√6*SO≥8iÒ:Rù
Ã¯
ΩµãÊP8¥$£n÷ifÉpæ∂ó÷G<cõ›É2Z⁄dÅwÏŒ–ìë‹M€‹oº¨j‹F8ò‹Q0¢+úvx>7≈ø^7J8(%`…Œπ(ŒÇn8ú}Œ¬úΩ’'!πıÍ›K‡5‡çkF√Ç+Äjl⁄`‚a't—‘iº±#oØ¡æ≈ŸávéÜÛÂmxÄ{g;ø˛gz‰‘!Éy‡a.ÑOﬁìI¢_í€H	<¡QüYRE‡XZ
5ÛF˘8ipœ–MÜ}q‘KN⁄‚˝)V»LK√wæèpò⁄∫¡*QCß˙ÓsìåÎNÈæ3ÂåÙJ∂7nyA`Ä:-_	tõC"Å˝÷.…ødk⁄oDbm3fà¬öo¸L	,∫|ØqáÔD;|/Mb‡Ü)lehÊﬂqÂ=^’1Ω2OHÊí+Ì,7)jòtôi”‡¯¿®»ıE£"yIíáKï$1P…úãYˇ9)πD'«î˙Êf§¡l©Ñ6òØ¸Lâ√Ó(∆<€˙MhÇ÷0Q‡íƒú€˝Ö›Ë±Ô∞4◊ mÓ{wÆ_C	åv6œö»´„ì÷◊ªévvèàuD7ñ2ﬁQTÓ"ﬁ9G±évñLß|óË@d^K;ÔßEºÇ<N∞¶◊Jbf$Ìæ)≥íáôÒ¬œîåYâ‘YTåOãQ:ßåò©a®ﬂÄƒŸ¿8ô¨›«dôΩ}^^«ÏÌ∂Ygπoâ‡}Z}á55¢çııˇÇŒy“Øø_ñí∏w”DÒw…›Q¥`Hã∏úûw˘»@'[eÇó„
f£W}∑
˜˚@&˘è≠aè\ôì>ª?CŸ¯qÍÓ‹[”ã§XØù…ø≥‹”∞¿ß*O≥Òâ„Cà°ÿæﬁ4√∂_º‡˜r¸rít»ˇÔFt€ÃÀÿÊqIÁ”S
ç∏≠◊ùﬁN„"
t∏è∫px_DÎÛõUê˚YZtaËÁ(ö@oI`¥º—˘õµ•ºUä]`aBë`/ƒªòÄ,…CûÉo”Ç{ƒÊküûfœ¡ﬁ˘ºûÉí+xË+›Á1‘πŒ/Çùz°ß¡‰-·‹XÂˆ?sKµ-ü÷3Ì4¯(âVøƒ»7x¢n√â’1Öãˆ:~}˝ø®Äé›êF|¥R'˝z:.⁄T/»HËéz\zΩ _Ú†iÆ∫Ç¨,W.?	4'¿©õg›˜Rq‚YD7á1Ük…5qπdXyˇº0 évhD∏5`p¿¿V†Ö†˛OÑˇ¸’’åµôb¢ø·e89åëˆ(X ∞*˜úypŒX∂úh[fJ\öœ–K_∆ùÛƒU
œìK}}/u’= ‘0àW¸ZIÒå¨vµö◊…%k%Í¿◊¬ßÕéjª˚ƒû£ìJ∂Ûõ7{'≠ùÉ`ÇúÌ2æeé%cÉı;õÆa£ÑÚ…`–¸±ˆ€:@ie¶Á@±UøYã|Ï'óVZ-œs#:È>*…Í_Që…¶FI&÷?ENLÎŸZ˜Q∏”†ÁCI≈É+±åÙÄîêV¬HÊK‡úØˇ)´πªæ¨F¿ï’‚aôﬂeÂ)+¸&=≈#§ã—Wy÷g0Õ¢Ã\3M‡ßU6H∑±ï„oÃöÄ|> ´ùÂ1ëıN6‚§’¯'”9Qn‡u(g>„}5§Ù⁄·ﬁ$ìcI+%6dsx‰◊Òwc8M¨¨Õeü÷¨òÙXV¨æTÚ›,øÄáò_ë≤˜í3ƒå1<≤º bx¡vy∑DÅ_û9Ç«Î:W≥˘1azàÑ,TB{Q2∂P¸¥˘û:˚·ì%“f”ÄÓÇŒÊYÜPî:¡ó‡^~A˙¿√⁄π®ó*ôQ4^úñ
ŒnÍ(K©S]€_°ôejòt8∫¬94aÁÄF\N/ø1Äf<˙[Qœòà>%*R Q*JvÅQg∆¬çJÃ˚»	∆õ^Ée;√ÅTÍƒŸÏ(Æéóö@Ìœ†„QupZlzVè`FTW±Ã˚˙k≥ne9#4kR·√tî4l ô~¡ÙÉM„A]>ë´∫LÍ≥ŸS
(§K©'1˝ì¸XD&å¸òUõti—∆"Æo«∏–∞ÊﬁsÛÓÊGï€íÔ „Ò)È)fÓπ0Nı≥A&ê«–y¸ä˘3ø	jÃƒ˜Ö‰ß∫õ™ù§@_∫åq›Yß∫Ó˙,ò≠RÂwNw¶ga&)Ãj,ãrèKQé√d&Æï√¨$1π„≤È+gÅnqXUVF§¨¨∆©Y{5çw  CûÆ _w∫9êæä{£ò<ÀC;ÁÉî–πﬁÕqfﬁ	GÖ;1,÷ôôÇW õ∆h¯(Õ¸©®
 ∂ ˙ßàr-Xt˜Ù"lÂ+ gká¿”Vq¥z÷ú≠]ä©}RÕù2Õ†RÒ€&ª:l˝˝˛ÓÎì˚ª'ﬂÏ≥˘á√ìw√fü©JôºXò{~*7‰∂¡ùl÷YÊ∂™ø´íéóÊ]Xvœ§Ûπ7;üÖYf#÷¬aÓ”JJ•’⁄mãJÒ;tœæâpKÿ‰=∏<k{>ÿ¡§¡3èÅ“TÚ¡d˙/∂Í˘ïôe˚ÍYI¯|∑aËŒπ¿U5hHÌ≤tÇ°bˆKìl∂’ŸÌÊ!] «∞¡…˝Ÿ0PéµDÿ)π¬/l√	38!QI¬ˇÄwèk+/XëàÀf#_•√úÏ5!æç’()E]⁄Í–  ˆ˙(‚˚ygg÷∞ög÷{˝¯<Ÿk£ªœè7oYKLù∆–Ø >øìÈïˆ»ñ˘ŒÎïN]óªìÈw„h“›†`ÕƒùΩW3±v4`∏øÎ∆£¢5ñCOæ±<Ï™ûÔ MJ=ì„¡”sN≠4õºq]`m}è¶O?˚lmç≠ÆÆR!›÷ˆ…1^|ñ\≥|$\A∞6H‹aÂ∏1y∏DWhGkπ(sÇﬁ8Cëaxnƒ¬˚«X~Î.íh^^ÓQ˘¢¡ô√_bStB≥ªŸd‚˚√”ÈiI∑/ÄŸÂ∏ˆ:õ¨†<œY°ãg”‚7	%'Y⁄y©—–¶≤‚ﬂ=e£ïßlàfy	∞6õu¶äm‰∆Ñk 2>æ*˙@$ôQ3›QéÅì¯tØé≤Lﬂ°4–Ç;"+û(¯≤◊qü ≤CJÀ7‰ˆC√Âj<J ö„√èq£D¯êˇ¨ﬂ{™ÜÙNåú‹©G¬¨Yºá‡SÙ¨Nû¡îﬁΩﬂäﬁΩØü!Q•ÉØ^ÒﬂÊGz%öÔßÖJI–‡˛rÍ⁄˙NgóûæCy(·´ØƒÖı…√d¯b◊@Çç?1M\èˇlœ>¥√ﬂã+J¬Üø–Iäﬁ©’Dø"˘ﬂ∂D—Üë÷P›¥‡$ã£˝ñŒr´  ÃlX	µ=}]	Å386©ò√QrfÆ+\>˚Êdˇ=€Ì%à™◊œxûZúÏ;Ã— ÎÀa™NJ+)+·EîO^∫æ40}Ï8Á®Ö°ÄÁ¯_Ã{Ô÷Y¬Ì]Ü¬¸ƒ"¯≈z„vû’=¨¬YòE7,®°Q∏ÛLÓˇ+D¥CK"7nõ'ƒPëîßå4t˙i\â¡Í;4‰Û6›⁄äÆ¨’„•8÷Ä˘ù™ÛÌ·6(¡≥g⁄~<‰˚◊æW’(®◊ÍY
Áêﬂ∆w”ñb"oE–ñ¬hGﬁ≤Zíw}@Ì(Jd4§ÔY-©€FST4"Ó1À¢É¸˙è‚€55ûµ◊∞|EùÚ'38ˆ‡‰Fœ´AÃ®;√ô•…é3™∆ (.™)öÉ=N⁄q÷¬,Ÿ±≠q”n-S”®,k≤R#ø‡êj>å·Û›≥3Ã_k˙üRYsı^`¶[~ ÿ∞'¿ iﬂ7∆,e@;ı´ì§Wè]•◊≠}Q„âxÓ†ÑºÊ)oZDµ%ã¿⁄µÕ∑ﬁ$ÜæÂ^b¸…ãã6?£6ë1 ©Ç«ié∫… äxNaq0˙sèdö]ò,è~éáÚÈQˆ©.Æ:≥3j—È·ù¨=∆œ?`j¿T{µ€ù®±ö°ô™«z™”ÜΩÈmﬁ€ß ´tÄ¸ÆA∫ˆÏ{’Á´§‘Iú∑ª'Iﬁ∑»µ∫k5"í≤;-¿YˆÚ“˙öÓ–'ˆ∆d˝Ñ6Å~L–‘Jø
Q¯§∂em ÈΩ=°Ã≈|z¸$´ÕsòÒd⁄ZD˜É‰g>–ªÃ≥+}ù≈˜Ë-∆f‹√±Ó…ëY7’ Î‰⁄=°t¿ºIZ5<.8ê5ül≤˘``  ÷h"&h§® HÉÒO¶˛æJ`üµ0áãπà˙ÓÃéh∏î¬ÂZú≥ôòùt"XŸ§8˙L6hî‰Igüt$£ á¥üÙ3[Ä\Q)x,ßˇ‘@#h®Øi$o¬à˙TyÊUˆI™‚ü*éüÈÙÎ¢}¸ß…µ…—n*~î‘∫5ß¡f:h˜∆ù§¬;1≠Ú}˚1Ñ©à∑`KéJŒ÷0<4©uÒwÈ®Ë∆	áÂ'xì∏:Ÿ+3ﬁ%E0µÏ≤°≈&3ô¬wm§d∞S$Eáv⁄]55é„zZ$⁄Û≠≤©‰h±´’öà·QË{J∏†j	ù65˘∆…Ø◊ëhú§}ò0[’Ô≈Ô©ÿ>æYÁåÅÉ·Ön†Ê°sË4¿ÈMÑ•:$˛9‘°Ò@uÿIŒbê	Ë(ˆ1ã»QBäÄ¡Ôæ`‡ûpZúFŒÒ V&^Ω7iF‹;ãO™FUkΩ‹ﬁŸ˝ÍÎoˆ˛Êo_Ìø>8¸Õ—Ò…õ∑˜€øˇáZ≥ˆ“ë}™ı∞˝b'-ÜŸ ÑÛ¥µ©éìëƒ—¬@ı9w◊ªu8Ì≈∂|ôeΩ$‘Õs?¬ìåfá'√“A∏ßÅÑYW≈=-"~ﬁËßà‘Ÿx‰IÒQjc(‰iÚ)ÇÍ∑∏˙äSƒ"Ù•˙:À”-öÓÖH7ıQw¶¶P]ΩAì@ë^4˘ÏÜj+ bßI7û§òZ¢VÙ≥l‘ÖCî*2‚Ïµ¶í≤2?^óÁ´^VÆjD¶åsd'ôq~˘U¯|N´SÂóŒzq^sSà˜«I_zßœÆŸ!ôÂ¥”`“Ωô`m\“…T„íÄ≈LsI , ò¿øÁ“ΩÁ’PÙ«àk¬™ L*2®îKAiì&pdé{1=GPÍ7¥ót”,∫`¸ô¡9  ’Bï¬RÓö
kÖ>™Ê`=H®òF[êï˝x®¯!˛ÔV‰p"|øøúÁ´»ø5Œ≤|7nw£®≠uï÷≤ç´rÎyí±üìˇ⁄bi§è¡⁄Ôv÷`∏V]'DÏ¥.°Ç,,›4D1Õ~:Pé.œŸóu4Ù)æ°¢±ú6Wâ»&àà'_0¡x}CñùyÿZ/⁄§iÌ£% g¥07-∂{E$ïﬂ = ≠sé”¢xSÉÒ‹c›Y’ô]ëhŒAöêl√6KMÏÖgÊJ˝Í9€–è¶Œ66™›ø“_MQ
7¬ÑGG*SŸ-I? ‚æŸu;Î√Ï⁄XèáE®f"8gcò°*A	⁄ì’õÂ˘ ˜àÕMÚ\Ï?ìîC–§‚DQm˛¡6Dœπ¿¿Õ’cRp©.Ä$?Eè^»öGÑQÿ&PÖéªI;Ìdµ©&¿qØßö¿ëd÷ÅùäØL˝%x™,ÓHQ!T{vmçΩ§∞‘ìÉù÷±AÁ#,5Ü≈‘
,#[BÍyq@ÒEñü·w∆J¶’u?-OKu8.‚öZAUV◊«”≈_Û+Ã´a†◊~?–í£Tq4SÁe5˙tÉÎ≈(˛A8qÎ&0¢0¯F´±fù‹ˆ§>ªz
Ú-wY1˙@æ˛Ó)ÿÊ™M÷cë*Uc*≤∆‡ûgC„<ìÕæíê˘\÷W6ıHà
Æ?5ÍÈ¯˙H¥£O¨dπ5ÖáP+ê∞a“ûôT
 ©ùÙ<ÒXKÖZQ?Yb;=Gt<:£†[ƒ£µùù¯Ëåó§¨[Ä∫svA1˙·¶(Û(Û$Ÿ6O◊	é2's≠ï+*î⁄4Ëèî•Õõ.l~Z>B*Joüy¿Ô»@YÌ)!˙r—Oc¥Ëå`˚àJ/Éƒ∑˚Ÿ  Û.}öîÔ&ìmsqMix%B›3¯.∑l)=/∏zMô®ÎÃΩC•ˇ4\'Ü÷´!°ªﬁêÄ]oòÆ7pÆ7,HÆõ• ≈Çb˙ßgSI„•ËÛÑ´¿ivﬁY&MÛÄc˜@\§ù˜B7bæ@N≈ìÚº,Åî,*π
∫x\∆òFçï6Å5!qd∞®-›L!Ùk6≥Z»Ë¶¿˚g|`v≠áà›Xoã≈¿/Ã¥1·å1b<Ãƒª!‰TËâÎ¸fêí6]¨"zNÀˆhè;≤¶O˜A1Ó£˙-;µ‚ódõ¿,Óæhj|¬È^øêÌø{4HÆâÀuf®Äã¶Dx E˙ÇVVÚÙ3{/πD¿⁄V°Ÿw≤WºŸéãÆYîêòPˆ±∫Üâí´€TX©;¨BnÌg≥a\˝„q#X7=t‡¬Rä©≠7ü•Éç¢¥+kÇûbËu≠X˝ÎÄJÕÒPÉ"r†±è€+∂∏È`¶˛æ5ö•π∑ﬁ®õºùÂ–·è»ìDïàHòs¥-H±K*‚fΩÆúHoÂ{ñ^öÎπ˚z≈jyàé4ïÒÙpª0ÃëÔÂ„IVgºï˝ØãÕwÎÔıàÔ·M˚Ã∞Ωê™ïåßcÎr≈¯ccÕ8œ„ÀóÙ¿e?1i÷ÒåÛBf≈o{≈Eƒ€±ÙÉ¯Ó<Íø◊…†k®ˆ&◊?Ù–K$H≈áÇ6É¥◊çõå◊›¿J—,√jÈ¿ùSB¡¨7ƒÖ®a G:zÆT∫‚)÷dêj5êGµä± Å±É“töÛƒ¨î›*‚E™∑øZ€~}¯7¶∂†Œ.ÿ∂h ß:æAÒ+πÄ˝±ú"RHá“˝-†á‹û-%WÃ•Ö4FæÄ
≤MC	A{~%ÿr¬ÙS∞ ˘ ÆÀ$Köê¬DπíQÄ-Œ„ΩAë‰)W¸º≥œ˝í¬◊ôv	}…¶Œ∑ÜÆﬁAm%n(_C)`
óá*~º†R2ÌÏJ†uÅQpqA}ŒA≠≈
GîêíÑ´|4µ’è≈·J`4æhúLb t‚q∆õÅoÃ/\Í q§ßêãÊ,™õqáì¶πa‘É™gõﬁ¢¢8˝Åˆ`›VLcC)}ˇ<≥Ü …(ﬁˇ’s›Üè$ôq≠æÂ“Z⁄¿èço›ΩöUﬁ D)6=ä®eWêëU‹†sË¿»È9ô™eÚëü˜ÂTÃ≥FæâØÓ.:{˝Â,dKu±ÙW>ﬁø¬ùb+GPIVÿ)ÍcÂáfz´uö™»Ü˘p@Càˆ”,÷∆ÒaëEJ|àV◊{î2Y
,I)LÊû1°¢∂!ˆ,∫49≥?£!N	 ®¯◊'9\5`4FwS£o¨ëÙª¡Ô˜Ø¨Æ¶í-¿∂^_ˇ◊a=Hâ√¬F6ço¯n:∞±.πÏﬂjı©”(∆rc˝Ûèø4õMñ0R ∫/≠¬K”èËÑV3ÄÊÌó–‰ç1·¿íJ@‹3∫[“∆!‡£ú“¥r»œo… °˘a”¬!0À≈óŒu∫+ã‘¿ÇÃg"AöŒÀO¬G»â?u,'%FìOl,∞âM7Y·„™ˆ•Î‚ä√1ŒK¢ﬁ|¨Æ ÿ¯WeÀ›±!9˜ó>zjÑìH;éÕ¶ÑVò^¥Ü Á¥` nI…ù
∂$≠q7X¢°¶x¢¡∂⁄&©¿'_…`◊&éŒÛ§¯ ü"Ùî‹`;~Q„ıI˙1ùü¬¶á;#Ã—å≈†‰z†¨HÖZe√òΩùßßJΩ+5≥¬¬°PÖÊ¯T/tûÙ≥I≤-Ü.¶Äë¿J"µ¬µﬁ´`å/S•2IPí2ÈI k–<\gù˝åπïìK”⁄SøNëi ≥T¶ÑVÍLÓ†|Ï›∂|Kèìë(∂∂"ÈtU∑Ωû©B°M§Æ´ΩùÖπK‚}ºcﬂõ˚î¡®SÈrm‹™CZPè:éHzmª∑ÉÕ|f“gËﬁD∆Ë ‰|¿Å√q~3Ãl◊è1jhS‘ˆƒ„∂Û£G#+‡ÿÓÛ¿¢Ô-r‘ÜŒ§PI
-E“#õËæ∏<ó®‘y®u±≥à_Œ®ﬁd#«ñYKÂ¢‘sä^GŸﬁÒ¡1aZTw%6È¡ø -≠â†¥÷Û`4ÅAÕúEˆiûy‚Œ<lı56u¯‹-Û0Q)‡8‡B∏!M
í£P$ÛÈM^Øj—xOS7äèeîa’4<Õıö
ãYÀt‹ëÎRwbSÂ£ãebÃ”0èyÒ$-–1Äﬁ!=ì,@,*‰]çd±\*Æcÿo¿Æ$¨´Úp7®'¨Fq˝'FV◊±L8Í8©∫ﬂÍQ™›Ø‘ÀÜ$ÍÈﬂqËπ›J8–ïß9‚Dà„ˇ!†}
Ë(Ωì1”ÖÅ\ïj…ú[pßõƒ≈V4ëıµı¯Àú·˛CaN?ÚÇ±H7ÔÏΩ√®¥\ºE†ZO˜ôµ∫Ê√ßäC5µ‘¢Ü±w¬§%»≈µ3Æ>◊‰”ü¿aÖb%òçZ<€w„8ú~0Á’«ï˚W⁄ïAπ£réﬁÅO–	˚Ö#Ñ“ﬂ’¶+(IÅÑ§€WbRÒ—Ó˘LO¬ö»ùCHx˚› SSkTÃWßÇÅ4•(˛÷4)‚¡è.UbÊj∞bî•˛-jSRÑSÌ^êD)I Öjâ&pıCŒm⁄oç%N0±o‡6s‘Øãc£˘QLnSI8$D‚¨âçÎﬂ˚—GY$˙˛Æ€ÙFm∆·°”∏˚µ©b1†«W‚†Rîµ˜”\∞‰Ù’π˛Å4Ô9àéQëéÜQ.¯a.˘<˛>kÇk¨HÅıÄ1ƒe¡f9^/¨4ÆBQíMÉ=≤yIÑf•∞D/!_ç∫®€°ÉYYkáÉ^ê]ê«ï÷îÁµÄp.æWˆï¶¬É{ÿª–$L@ΩFY.)ìq¯πVÖRº<RËí)£íM¶+/<<π≠•Gß”ﬂ’∞XRt5| S…[TÛHA`&¿©‡ã‹/TU~˜´Ω◊{'{o[òo◊,€-
ÿ‘D974Ãpsìóeqñ§# 27ænhëóÛ(;?ÔI∏ Mäˆê¥Ô	l‰aûL|’œ π¡I¯íE.y≥„!
¿§+ÉP3„›∏”â-Æ`2ëÿÜﬁ§0Ò¶ƒ–Ë‚#J kFd¨Äë‘CyAÈ<<Cï›√≤Ô©DÌ&˝w%úTÊ◊û(ÛÄ¿}¯WﬁA⁄‰\ëòmMÎ∆Y°òËC¬ﬂXXd+(ñsìºò∫û•p≥±ﬁ?yÜÒ•–	jÂÆ6ø]Ì≠!‡ß^·ˆa≠fÁÄTèÈZ?÷∞To»[∆KT˝\Íá∫Í)]À«SÀ”6)˙x®üÁî‚A±%ËgÀ08O‰∏jSÿπr™üÌû°Œ»∫mrpn\ôxø¿¶ÛÛ1JäúŸàêÈ)ÚˆZ/=]De'Èåá∞NE]∫zì9ÆsÁÒ>ıò{^°ñÁ#7~9{¬∑»@/<A¥"r‰p,Vv‰cëˇÊuŸ¬„ímáWÃÛ£R}æhˆ3`˘2·Ó6<´Ÿ5k∫0@ı°Ùlmöû≠¬Q—èN8üıUÅ≥Êo0˛ã¨∫·ê/\‡Ox∆Iz<eY>r_WV˙Œ¥.¨.M∂ì…Ôc5b‰•πX°ÿÈ>q¨®»±ˆ‘∏Oó∂Â°$⁄®/
geà10”‚È¿´@Ωh	æF–"„Ñızp-R\H4¶VÅ˛d¥ƒ£e-úañ4{i0¨zÜ5QãÊZ∂≈L¯€¥Ò˙\ 5Ôc˙D{p˘°Èmπ< e˜•≥(∑Ô-‘´∞kÀ±;fº9dÛ¥me°Cﬂ
.±é˝€ÕﬂÖ¶›ˆôü"Hõ/cËÉ.bI/VbnLâu0ÊÖqœ-50fRÙYqQû»öõm∆¥ƒ⁄πõ"‚€4ÔD¨ﬁ^–7Ëá8ÙßlìYlûox-ìÎÊ‹
,ıiHFZÇs¯ÙßÎP˝¡ïÇWòe÷√¥&Rë^∏á±pôS0’&EQºÔ\G∞ëLìÃ¶´Kh´ªìIÒÇ]6îGOÿg%L˜ÎnÈôâiÑE6≥·aû°&K[E"Øôê/öPgÜ“…MÕ;U≈9jpÈL¯F•%µ‰@Ÿv60 iô9,+äf1X8ß˛˙ﬂáÛ√Û‹÷W∂˛„ˇáô˜⁄YTOe¨Íıˇ‰)Î∏&gÌsc\ˇ13˘-ë≥¬ûîëÜ‚–7%5Éx<Ö
€©ûáÃ?nŒ«=`H•%ºıœzl»’?ÕAˆ…ˆg6‹’wf∂∆∞FÛ:˚Ç=Qˇy»téì{íòÏmÎ9æˆÇ’¨j	®gìèÍ«ºr¢x^≥≤ﬂÎ¬±Å ±htçG´\)nØ†"wÀ^Cƒ HD≠xroâÅÌ\‘V)KG´åeÕJ_Ì&]wÈ™çè¿pû¶πÅè3œ +sÂûó‘ºhFFJ8yíêüPó≠]®õ§∂ÆÁÙû®8"π»Êâ@v€-æòäõ˛Ωª˙Î'Åµï	˙˘•NˇÏ(9Àì¢ª˝…l$§}Ãé^”Å]mÀ,<o&∆˝åUK÷Æ¯í…∂°Â≥∏Cˇ~üe}¯wı◊èÅ’U	±#9 Ú˜p‡amN˙çlë[áÄ√Ä2É‡{∫?*©-º±é≈Ö)Û›™¬œ∫¸24˙â•¶¬wU±0ëyîûwq8:mrI›G'ˇ≥7¿2ﬁå≤hèØ<Í)æƒ~@¯!SÏ(+¨ÿ}`M¥¥¥≠ú´WÁaé*∑¨ÔóxˇZòU∆ÉÙ9zÀnç–®±Ë‰sû]\Zû‡™DÇ5äg):è.ü=ø2}…¶B{poÖ≈Ìv2í—ºË¸Øï!ªõv:…Äàπ!…◊: ƒYêPiQ≥zºÚÉ≥©+Á#ÃÁxz£4ººì≥Cê·ÀuRéá|Ë^†ê€˛6rjÃU∆[\~Z˝5Í§™±ıŒ±XÉ,n™…∂±nW¢
’®6r©ÛOJEúÄÆ_˜z
™õF±gcFÓì™çß™	x ◊äl« Ä≠‘›Eî#-º‡w/úE[©Z3ûÄ‹äÓë;ÁædÀ#+
¥ƒÕ≠f%÷m∑aG~˝4ZÌnVY2∞¥yú:<e≈»Hb¢l∆Jz1¿RÁÅÃ%%ã]ûΩjÅEñpx±˙0∞ºÊjl¨;´Ï.U…∫û/æôy¥Ñk±öGHZ xTlZkâÁÿ∏ÅZBú¬≥¢øô∞ûÚ ÷[ôÜ7ÎZl˚_ûSH‘ﬂ¢RNñuœåâÆk|55∑]2£{¶ÎV“ ú¨Gå≠‰I/&?◊•®G"gg7ú>Ï9cOíë
	T∑≠UÁå
Û6yöÉ.©≤uQ2∫∂7£5Oh¸ ËJQ∂q“åï`Ú.>-≤ﬁ»»*à¥âWs‰yedQë„	Ó†Æ¸1ƒbr)PÈ¡∏öå)ﬂ_:€o∂(Q2ß`˝,G÷Ï!ïâ⁄DΩq1÷_*Qiﬁô23lfD—Óu6Q˙Lø
â≈û⁄≈Ωú-nH¶_„Ço«y«*®ÖÖ·Ÿﬂ≠7◊º∑ŸÈŸú∞+,ıO%æüuz¸—/ëm4≠ÊRŒ ÷+ÌŸ*Òåá^/sZ~,V∂–É©œ‚Ô∆)ù§“[	ÂõañJœhÌH›ßs}ï 0◊∞qÎπ˚eÆltø÷£/°£à4s[-%ôÅo	è?TT ñ R-∆ÓØãn@Ú»/W7@nw¢√W5ûÅBÉ^Ar*¯˛Ó…„I˜˝Ã¢Ô3™8{+Æ”∆zÔöu*—K¬/UÈqUôUz˙âÀ=…ç+…1÷£F&¿VZ°Ω§>;ó_+KÅÜ˜áº€•‚›˝kî4∑<Ü‹UúŸØøóW∂»;È˙O2∆BÛ⁄#ãπ+Ω°˘ƒ“≤oæŸÏ˜kàB5ÿŒµäaUñQÊßP∏ñÌŸµÎ”í…9VX‹»h::l∂]˜kŒa¨
Ô“ﬂ,têŒ;¡∞∑MT	¢‹ã¨ìú•É≥]±'ÇäÅ⁄05kj&{ßÁÂpQ81+üb…‚zeO—4ñ®S◊¥óH≤†jπ_˘qTM®œ¬-~ +bÇŒ¶ &ƒl*Úà®àKı µw.êl¥]5<Ÿ©x:%Á“¬˘$ØSg˘“.¥'mU•!H*àL¶À.Cπê–Ü¶¡ı°ıKÜK$Z˛Qs∫pg!BU}Á7]V≠áaííÏΩ¸d}}ñäˇ¸Õ⁄Û, HîÖ9A2ÙõíB—@5:¡Âtµ«Ê•ÇÔúÿ÷(ª[b¥QFÒK‹îÆäüÁﬁ
ÄΩ‰lÎDb‡⁄êQ¥&Œ„ínÿıæÀ%RÆv`E”œeÜÆ ‡¬T+∏£DÓ‘m˜£H•B¢f=¥•§%]`Íì¸˘ aR #è¡[!≠,∏ãJl>qÒ∂ªäTs¶ö“§ûΩ’_≥aé‡Ù∏Zsx¶ åÁf6°Úá*ã[æöÃ∞	}Ø%ﬂ‰Ê˚ŒB™5¯[A»¨Xê¨Z^w¿^‘V¢A”jƒS„ÖÑ`•œ‚8 $∑,2∏ïQ¡bÆˆñŒÜ®`†„Ä2ÁerË+[v”¬‚◊ˇå“!ã–1N4ﬁLU”Ë∂V—4•ûDπW¯Œ”$ï2©hs?Na[º≈∑®∂'zVŒ”Æ,ZR›t¡§G±&bsç?[„xj‹í™`x⁄¨Ú£}€˝ñÎr¶2~¯v]ı√ı9ŒÂ.Œ∆kÑ¨¯`òÆ∞gøµ5˚ÙÒé$s;Ü}\ﬁw´#W·:MA-á©™≥’T¡”è8UÎò[RgeÉÎÓxw™Ä2‡(Ö¿ï˚≥úïD·ûßÅ∑>9ˆîJDg≠i(yÅ¨“f=„ôµ˘ò›*mëh;ÈÖkŒÛôÿÓAÛ™3∑ßÓ =Rix˙~ê'0ÜÇPHÂÔÈ¯πVﬂ¬°ï Áã•*â⁄å‚cqçF¿[<∆B3ƒ˝éú¯LsàlMh¥3†‡≈< 1∏n8>dÑLË¨.ˇBBû˙zmw†ãÇäm¯“wıúøÃ®÷P‹@Àµ∞ûÎvî\7˜4	,ÑÖ`_@'ﬁœ_6@£/]ﬁ]1/V€(É˝˚ø±∂∏ÅÎF‰4ÉßG˜°û_˛˚Uz[ÎÅŒQXkb6éF≠>s†U™ªYOØ⁄*z$Lçy%ΩÒÁPœ©XÙ”0É‰J®î¯[¬8w7æ Ã‹DJ/W>éJ¥ÆÙVp´Ä‘L 1€´9<√5∏úlU¥+Õœ|∑("Ø=®.˚¥*@ÜZ‘©ŸÍÌR∑XC≠ÌRÕAÜO∑å¬A1Q5ßÎ–´{+jc'N‰®•˙Ö€q>S”Îp·s;Ö*ﬂ√d–N{s´|´&Ó:·.Æ≥/Q›|ö“xπâuÑú›Û¥ı?Ì|çÆ{‹Û‘'ö’Rå0\|'ÿmY/uNkœzIì∞GÏ)uLªÇ!1Ø}¡^bŒnÜå4ê`÷Z˝∂∫ &iëbÃœ˝ˇ1(ëı≥SL)a≤Ü,Û0c@N¬=V8≤Nf¨ùÙ∆Ãá.CCÚLÍ§ò^õB©H±ÜŸ>áy“&uMîâºã09	ôkŸk¶@ZÈáç«Õ:‡ô"ÖÆ®WmEèÈ!JÇùMéØ›’3åô¡∏$=ß+^…ö¢$¥ıxùNﬂí[vºì∏E_˘Ù_ÎÚÔy’Gâ9Êu-g™ı≠"¢•U:^·ü?!p>≠>¡aƒÙ‹ë>ŸÅõ·zÖU3EY$‰@eS;ì≥–™%îSåo7î&oêçp0Ÿß§„sú÷¸‡ÍÖâëe.	yÂ»_˝O^?,-–Qç; àª&ï¥\ì°òUKSI∫Øº∏EÄ˘ÓŒﬁIÎàmø⁄√Ã ◊o‘C∞swÁE™@ŸNÓ‰›ÕÉfûC{˚ªl˚`ˇ’Ó…¡äT9˚—ÎSK≈¨£aló´f≥)?mò˛W∂ÚŸ.ãdﬂÒ‹uÊrûßÜˇAJS¨>‡¡Æ∂ËyIö€À#9ªì›Wª_ºﬁı'∆9OsRvd≈ºÑ#Ÿƒ∏‹›˝÷ﬁ+øor?[†¬mÕ—‰˚‡sO‹|ÜÁ6œV`MHÊuÁ§Dœ•@™ΩÊÄÍˆﬁNk'∞§hn\™‹ÁoPΩ•=>iÌ6˘.1
·ox„µU
⁄Gl8Úµ"ÏÕi„ÓÍ∆£ï†Ê¬Tnk; S{Qpˆ∏‹1º{ûF·0‡Ã>c$SA§¢º⁄'‘Dä_6?æ‚∫”c^òÈVê¸Û»Îr†òÈ_ìÇh∞∏/ﬁ]ôÜÊTe[~∂F–”æ†nªSº4N÷	k˜™zı∆¿Å`>e:õ≤ïU‡i”,ä'µœø{˜Ã>Ω#–ïæÑ-GH'n jŸÔÃ–¸ÀÉÏ1˘çT)„x_–’&®ès˝ÃG_ÿq~dÖ1ñ»T/˙n∞,ÄBÉñpƒ∏f)∞f©Ø¸˛,<Ï*•÷m®¥ÓR°UÙy‘aYÔj¨∞ÎWb˘–[V^]ªÈÒ!F≤4à)uœèá°ÓQËÇ~ÛaÃEqÀÛ Ä1!xN+Uè◊Ly?Ó≠r35öﬂXŸäåVÍ≥4áKa£s4 ^ˆ°ù„˘IxXÒ¥$ŒEè®ÃQÓJb“Tºù_ˇ3ı÷!Qñr®líABî•,`}∂≠"8Ù ®Jı^Ûõé¥⁄≠‰D™ﬁŸñWùπeo{l^4èŸfHùl=‰HPbŸ∞~…´∆_˘.¥uﬂæãû~≥zørÉ^˘ﬁ™¢V≥M`nXr“gá;_UZßBÖä•î¸©¨¢<V^c aÁÃ»•≈+Õ¿ﬁlRB¿3˚≈öØZ∂ˇx#¡N¢#Tıπ7-J“®Y“kS~œ#E=û◊ò›/“|%kÓ^VÊlÕ2¡∫J≠™,,séOgÙ6≠g˘ﬁ≈ø?ì˝ã’ÜNLÏpÇ`gÔdzñhÈmL‡¸πƒæ¸çB),¸ü≠o	aˇÇêÙWçê≥Ú#∏Ôœ¥Kñ}Ω ˚c;Í€Û(|ïvê≤πjû{\∞ø _©Xi√ﬂ”qÄ¯5π‰ÔÆbS»˙ïµ‚
˘\ªK_–lC–±ø∞¸~n:`©¢]d»ñﬂ–º£ŒœoeºG_/2“¸|°1‚¢ùR·Ü[k-cyq˝Cûf3Fm¯xîå»ÕÉ6c^v3ΩÏm“„<C j/f:∫¨óÛÇÓ^É∂ärbyjP0õaB∂‰˙èYïG]9 +H‹’ª c´^ ôè˜ØJûNù'É1òÊ∆*îÅG™÷c5eØeªÊH0ˇW œéÚt°O(óz`æd)qÓÒÎòhy’ù)∑i,3—dXıˆ˚&˜Óà^fY/âfç˚
%Z	ï;öxmïCŒ˙fqV‚[R™&^Bá°< ˙ß®¿88EYAÿ gÎ˜c{¥<±‚wLmÙÏ9c∏¥ñ P¢ıª>ùy¥wWáz`<ü†∑Ÿ‡˜«qâ®P?î,E9óÏ©4BÕä™‘√⁄`"P±©l¿U=)êICÊ◊u¯ël3πSwÙ¡0n>ÚÕeÆ…ß$œRé^Q-/ùô‹i_üw≥·ö}üKÜÙ	©C˜i;ïôìDÆˆë ¬º>5Ä|Ëgu`‘ì„’Á®¸~HA©@N3J=à•ò0˜  2ÌÎ(˘rbî§°ú‘°ŸQËö›¿2	)eôÔƒﬂçì^BN[O©MJ¯“¸õ(o+Q˚ nÜZ∆Ù&Ë∆SAÛÿ•ØG1ã≤àe∆˝,È†3]≤JU≤
µﬂ«8@û™!¿ømãÿ2ÿ◊L ÷≥P™?ë˜6Œ;§ü‡©ZçZlˆáÆáW\á⁄Sô∆ï{<ïBﬂÄ¥∂l K∏áÊËDÁÑ5ñø¶I⁄∂ÍuÈMVÑ»Êı†uÎ€∆=≥muæ¶9ÃÏ‹¸Z Ω/åÍp¡¶ﬁ‚™@§π<B ¬+Z^-ÖA_ï*ôpô˚‘°	>"ˇÕra^‘vSv¥«I;ŒZ</<~N≠À[©å»ò≠jZ¢∑Í‡
Ì@(Uø_‚√lL5@x¡Îòl™iW«Ãv.4ˇVL.·í'/π¿#F‰o3]hg;Ü 2K≠)ÇûÇI‹õ‹ÕÉ˘‹›øMÅL3_î#1è÷@P≤s∞ñ∆(WhŒ§umÌÆ'Â\˝U"Juh“Ç<≠ï®qão¢l≥Ç™Ç=YÈ∆ds<ÊhVå÷Lk©1‡âŒ[Û˝!Wˆ(ƒè)ò ˇ»ﬂV…!áòpû´–3Ûœ,$˝œ+“¨lq&+Rqb^∂´ß]ê£õ&üæI1O”•‚È_4#èü/qQX¬$…áØ˘ı¬—K¨¿À8º≈˙†˚F’1¶ŒIûé0©4 ›ZâÂb:*1ïÒ ntgoó„‚ïLl\ig®7@ì$Zo∞çı:Ò)ì≤4or‹≥9 b &⁄Ù@Qtù;J⁄I:Ωº‹Î vN®Óﬁ2®gE'xMœk˘ò)böûrLEÇÖ;J◊MsJY¥8ﬂ7òÊ∆9‰tÇ!qøìú≈„ûf07ù>^÷Ärì®d˛}%›ƒ†]O7Û˜o˝!õ@Â’/Î∂€¸Ï√¥df ª¢è]#^è˚8†•;∫ÒI≥ù'–cßŒÓ7ÀPÃ_qRdŒt±ôîéË ∫MÊçÅ^®w]”≈Kÿ´Ä4,aÅÆ:óáq⁄Q!<Ü«îéÕQÂf0Y¿ï˚aÌ0>œ(‡˚Pòd´≤-Œπ.≥C{K8÷≤ÜÁVIñpaÜR‚÷ò∞õpNZU]ï
º‘]ü¬Œx*Û® !Õy¿V•@°øP<‚%àx Q©Í∂¯¸(ÀF-í¸N‚”®6ÑE^ˆ¯Ω—):Á√´5éR„Æü∆»z>9Àé €q$¯IŒA>kÃÎéπ'Ñ©~ëõ0zínê©ÍﬂˇçMÓ´€“DuWáUª‰∞˙≈SÌ;9¶fQ.¡ª⁄>x}r‘:9¯p|“:ys¸·UÎÂÓ´„wº¸Û∏ Ê^^¸@¶í¸gqô¶qyJÛü˙2ÑßPvKßPv√SHé°Ïgwﬂ^∫gêºÂ@∆Éˇ,ßNô=ô<zÓÍH…˛\èîÏÁq§m∑ˆw_ªg áØˆ∂øiΩÀÃì%˚s8Yäp≤´∞˜Öˇt•‘ù§Ë$ox±◊;-öË]ÓzTo4ïTÕ—®¢™ÌHM;ìÂTùwxeUœ Œ\íd≥ok%›Œ2:{™⁄Æ∂b'8y4;o†£ZaX≥ C¨ÅS=i√ØûÙeˇöVê„MsuÅ›∂æ7£Òø¸Åh¬ÆuPzbTÊ3¨‡ïo∏™îYV—Ö^≈h¶1¥r·¨lL®†©\Gy£Ù9¶ígÜUpKVqñŸol§≥kÑœUX‰±7Ów≤{ì›†W+D
BèÚÎ =Â‰ﬂï	…{ƒp[∆hóœ◊–Ωπä‘˛3 ≠4Ê]‡áæÓ·¨tù°π∏]‘˛„˛ﬂÏoÆ`gÒ˜X}pòx'qùéÄ9çpõ}QPnÇIJô

≥J≈ΩsÃ5…x~˝Ì¨ü¥ÒKtç¬B ,Îuyì√¨Éâ§r`#yïß1‚„W«√¶óÑﬂÏ¨%´≤Yœ:ÑKó{¡zÍk˜ê%¬ÏÔ-8ç∑ì>rAÔ∂¢r{Õ®*IrÅ·K≤ïáÅÁ›03&nﬁ±ºÄ≈#]GPgÆèá˙Bì›ÍÅU/ÊåΩ^ï?sõ6q%ﬁŒ2´r¥.ﬂ`añ-ÏÙ@mÕ‡S*ä∏ü/Ïÿ\AFn¢ ˘
‰ÖúÀ˘å“©TS¥@_ JWQsß–-É[ç¸πı%≠π5pö¨ïí‚¸h u8›J»:¸ÔÌÿNÅ±≤≈ÀHº∫˛”w„¥ì1t"8M;3∏ø%AŒ£;4ò[‚I%ƒıõ∑ou<hh'ì‘ÏÍ|p÷'êÑ≤h˝ ]Æöı~UG¸;F´Æ%>ŸU^Épöï„ı… ÷nã$]Ê-Ô˜æHc^¨≤äÙÁ«≤R¡∞0·Äf¶v*ò˙@ûß¸µ>Çg”ßü}∂∂∆VWWŸÒÓ—€ΩÌ›cº¯åfE	…oÌ3≥ç{Ë.]1Qã≈ƒÉK6Eè|˚ﬁ&ìˇ¿]ãßJ%ƒõ}WåOO‚”’a£üËà?.(YÚ¨ñ0é¡Îoè>†Fø∂©á4?Ÿû'oQ\Xm¬hﬁΩﬂäﬁΩ7?32o6útÊ«2ù˛–»±ß”ÔYüp˝G™˛K◊∫^0]äaÉ(⁄÷7Èx~ã©˙6Ÿ:ø’…>„Kƒb˚¡0O≥ú◊ÊÈzjüÒ‹
e˜Ï,iè,ç\z∆¢{ˆr’Özä„ü·w0óÔ∆I~)∑TX”!ÕQÆ&!^´K˙S7…Å$¥y£{$œücƒÅ’.‰'D0_^¬GRaçu 5éˇáÖ˙,‚a—ÕF—w‚¬“7ÎØ^hv≤67ÂPXÅàŒÍêg≥ŸÏ4±Ó%ïzCû`⁄`ÔÏ¡øÁ†Â0‚π˛ﬁ·kZÙ1Ê“âI∞t“@&leÆ‰ÂójË<É»ò⁄€…⁄Qˇo¡∫¡xhÌ©¶U˛Ç)k«£vóa…Æ+µvÉ"Î%Õ$œ≥<™Ì¬?,Üˇç∆q/˝Î⁄6:ì$j+ZÀ&ﬁº1«°Ä¥ûv5¢°F¸ûN≠…#¨{∆Ü∞±“ÑEZ”q»Ô›ç¬ûÈgz_=ïÚ–øç&€&‰cÍ2¯IézlÍ√ê∑Öur0G:£¿(ÿp#ÓÒ≤œ`X¥éèÄµõçU0 têP¶Ô∏˛îùú=4Dâ∂Q¡≤_'ÜA√XÆnå˘+bœç-¢r%O„våÒ_=ª-H\1ƒﬂMøuî}Çï√Ö7`µç$7≈xü?¡k@÷x»W≠ﬁL ˙ëë®Ü€Lì\$€uVMÀÕ$±o≤w¶æò√q—Ì¡®ı„`YÕ¥ùç5∑ΩVì fh1Õ∑Ç#"áÍÓ‘H|#ÚÑT∂bÆ˚ffmQuÎÚÁäF”˘ì˝d‘Õ,√Ù¬Äâ‹Œß_¿+¸'ÈÀD<_“QMÎM^e'ÇZ &|‹zrÌÎl‘Õ≥O
ûZ®CËæáTyÄ(ö€„Å⁄£.¯+≤väîZ] Æˆßf—∞∏”AVqfXyH≈Å±ÈüDb§õÚá~"œÿRïqµVöfSk,[/˝ï™I∂ÿhB∆∫+qk1<ç{òŸvì[≈˙Ò:ùæ`´Â¯gÏu∏n2¥ö¡˙Cn_S∏§ñ<úáW?4Rºç¡◊x<ç√œyô ≥ÃÅÜD2WG„§ßÍ$˜Ö
’QüÑcf»Á1[cºÇ!‹ÕqÒÅ¿:…®Ωã⁄¿‘ÓÀ*∂è∏?ˆÈç˝§NHπˇ˙ï™–"3Uº(¡‹ÂGÕ}ëƒ	*i˘±Éÿ#«˝ç‡Î1H7¢`DÈòBÉëV!o‘Ñ*∆ã$·:cÊ±ª4Êè °ﬁøäh(ÎË ˛*k√!~L≥äj√—ÍÀ£≤K˝têˆ«˝ØPé j¥ìûßòÈÏA}ÜÇO0ZÎ£;<±/Õô`™G∂ìLíN’@UÕo» E~åÿ&:.î√ù<F#P–ÁæcxT´>ì; ∫m∑æ>P÷3-h›]"ô&–‰çTT–zwŒ¶Ê%å√¸HœŸnµ¨â(<-ÂcI°ÒÒß8à√Tñ˚∞Vå€pBô≈ûK+év&T!√H{`úA|˛πo∑’1AÌíñıÂp-,°¥€gáx}˝«Î  `’:«¿ë/◊!˝d√5vîåRdn	r‚"3êÇ0å¶ƒ'-dñ{†í£lágì9ìa¸0ä¬Ú+<p4≠Û,è=ìö4}w‰ü ¡å©˝õBPz4
CÀÂõaÓW©prÅÌ®†d∆zû¡ºËØËú˙¢ûÒJâﬂRwıØyXµõ9…«C8ˆ¯áı®›˛ıŸ∫¨¢£oUœçªÎ^ﬁ~_érb!ﬁ’ß[ÑsﬂßÅD˝ÜVÀáì¬‹üNï;–µ‹Ò≠ª(úpcq(¡ØÖa$	H5Ñn∂ÈAœ›<ñLÀÊ„`Ö~g!¯‰í¨ Ñˆ„›‰^]T™!X·™»øÑ¥Ypÿ`]·ƒc´yˇ„ˇ˙?’L0áLà—ü:±90'Ÿ∂. §ïøtÔ=Ò¥ñìYô£Ù5ä Ò2vCaB}¥’VtC˚Ñ•µå	˙ﬁ~>
Æ˘5∫¶Üª¬ç`0ˆâL&·πTäw˜∑ZÈ¿5÷¬©^™ß˝|˙îÔùª%´YA€‹<kÙgÄ¬D¨-‚J'QéUÏsÖCˆûÖ~ë’∞ıÌ?ıöÑ7ŸÉ˘◊ ûŒèæb3S¯ÍàºœY®9%i˚'√Î&:äœb÷ Gı“∂Sœ]ï†™^0Às˜Ÿ◊… …”ˆ+xÛ0î¬+ËkXïÅy≈
sÅ.^`i¢)‹ﬁ«µÅ)≈,_Á◊?†X›iO»ÊÄj¸«‘~å*œÁWR£‰<Ã≠N«¿mS•1 «∂/îù+”{Ìì‚@ø∏,ÀØZcgÆZ†î[Pµ¢ÍÿºjΩæ˛o≠#Fµÿ» w˝ﬂÄ/=8f˚≠◊oZØfî≥1k≥=ÒÃŒ3|e®F‚¨bh°v‡≥π>ï·vt±9øﬁÈ3Ê™ue‹ (ª÷U†‚ç)lwÆ¨ˆÜyﬁ^ü¥BÌ™˚,˚V6–≤hß0®´
Ï∏|§gú !)‰–,QbŸ∆µœ,àπ z°Ù†®©YÖE¶·o]y≠:Ù÷>ÿæ‰‘]›ÿ`$Ílƒ>|Æ+Í∏}\¨>Rä1ÇoëÙS7˜ÅêF8˚{ñµ«E {E»’Ø$¯-‚¡(¿ªrßÒ ÷K¸ÁŸ6◊á≤≤Àk˙w°O„ﬁ∫l¡˙lÎÇÖB∞í üFòpçΩ·˜™⁄ò∞l˛-|C˙¥≥{º}î˜˙ø ôít8PíOkπßåúa∫∞ˆI˛|e˜∑õÏeÎıÎ›#∂∑x¥{||¿6~ª±œˆ^}s˝ﬂèWFpK°~#˙fMımÎ’¡;98iΩ„>ø£À!"©-˝k5˛‚‘Ÿ48’âK!µ*ëD9˚ùzŸ4ÛŸŸeªª”;ﬁ{ìCEÂ\3t-ãœ”∑m‹÷lÉK∫XùF˙‚Êµ√lÃåZåfﬂw_è±B™‘(¯ºÈ÷´xp˝«8Gû≈*Ó¢ï≥]n¡/õY`if;gUÅ-œ∂g€B^÷ÖÅûº≤-£¿[◊¬T{zÌΩ~ãÅãGOÆ^pì≥ØXˆfàf◊íNJé	7„èxTVÛ.x6ˆÊıﬁˆòÃu£&xê±›bî°_Y‡ÈŒIí˜”oúk5∞?å9ès4”Á‰H±“Ç˛Ä¸úy+¯ı·Œ[¿¥ﬂc>[*fŒ}-2ë≠w O≥µ^vé«IG°i{∞âFq√ÚπíÁ◊íEo0Q™s$Mºãh—!◊6 !y0ê2ä£)Q|∑)<^&ZÕôŸ &€L–Ö#øƒK·	«ø•÷·€ˇ=2Àº!◊].ÈGòà=åÛQ
g∂’¯LäõFπkEç“ºv‰/ÿAÁ&7Ní6·ˆxê¢Òv<–Z«£¨˝-ŸcaÂ‘5åŒ1á‹c/F˙*-x¸˘&ÊzJ˙X”ë:∑∂tòq¿‘b—(—{¶ãµì-$¸rmPı—CV˙=˙¿Y°ìXû™K@ÜÛqeΩLçyÇ÷√}¥p…{”E\¯ûÖaΩ©Â∞<„	Ÿ	PìB?ÉÑüU∫ÂqD≥üÃ√∆@/8B®ÿØyk 6≈M9@eDG?§X——™Hi∂: ˇ_`N—ï©=ZÌfŸ∑≈Zr—ç1ftí¨víaÒ˜Åìª≈Ë,‡áX]Ó	¶NYD—Mé˙æ{<˚D6Qçåå∏ÀY=KHÒ”ƒt"l*a¬aÃÖyﬂC¶˚5P‹Èy∆0	D?∆∞û{{\åëvêoU˚Ã∆lê∫„>Ï…åhˆLÒj4k$à}†YpèªaÇ©ëÈ%#—’WDÒá4‹Ür∂¶{Œ=Û˝œ?g˜ÿ÷Ω"Ω√<9K/0N:“-ãmMµ:L‡ía˛hß¶˝¥◊ﬁ˝o≠’àWøø˛«’ÎˇÔ˝‡i≠f$4|Ë‰ÅSMò≈Õ˘}º%∆4]Ω%Ï :nªÆ]¶ïÚg÷î‚K*$Ù‹ò¨„Üóteéaú ôc˚'¥∆+ä¸AgøÃâ¢z/ﬂ†Å\G4E…	¡Y1Ú^Vt”}ô”ﬂßπ˙}É.;ü Öˆ^óT€y5->¯ﬁMäH˛h2->àE7ﬁÁDû¬ù˜ë¥Hâ∂kqAê{B%EMº&¬ˇ!ëîﬂ íu&Ñ:}ËãB}k˛ÚZßà˙»∏Îbú3ZPê˜=sËCNëÓBO≈‘¯º~è˚ùÒ(¸-ùq˙‚êSﬂGü˚ÕÙ©Aµ
Œâ ˚aßJZƒΩMÖèiπg©XrÙ-ÂÕëÿÒıfÚ]ƒÒF?Ë^Ó–(ÜÖ=JF∫xjÏÕ	ÂÅ«±)Ç√¿ö[òÄpéU∏Ìqäc»ŸB’¶`5#œ.œﬂ8√+Æ‡ïÂ≈|».œµOü:~?æFˇYñ≤aVà‚‚[~o≤˚WÈãfü«è“÷∆ŒhìdÉn“F˜∏ÈG5‘3$…ΩKÀ9ü‹¶c°ˆ ≥-òÆj›—™ãRÉ~esGµ›ùΩì÷€;Ÿ›Á!Á≠ù÷Ò…—™ˆ^øŸGÌ˙·—¡ŒõìÉöÚûöW≠~sÖ˙"™™∞ßÊk1®¸<öf©.¯Ÿk´"¶ ∆ÄuZP[]·ø÷Ë∑Øˇ˚Œﬁ◊0zê%è^∞Ë¯oﬂ‘Wl⁄Ní^$XxÚ$≈6Á»Œî≈âïª˛yπÄÒ ∏Å%¶ŒôGS„ia tÒﬁZ-îwÜ~ªu≤˚ı¡—^À”¬K˝{Pù˝‡FÍÏ∂Ô#µ¢ÑÀ{fÇ_1hŒ`0ÛìW8⁄e›Û÷±¸…¢WŸ ^{g`oÌ0&Ωzô¶ŸiàÍ∏O,Èssœã9?&‚îán¨lµ‘oÌı∫◊ˇR¨ΩMÚA˙˝º#ÈPe¿¨XŸ⁄ø¬Ü‘‰˛.¸)˜ÕÎΩù÷ŒÓœ{ëª'ÃDY.&,ãÆ–›÷õ◊X4ÃãﬂûØl˝fúR]¡~Ã¢oœÁ˝≤ø≤µü`ı®W  ¢QÓ/»O3é;Tø)Í?ò˜kdfW∂êqùÛÉ^
]≠lΩ¬X4˜éMF)0˝∏iw≈/÷¸K' •ˆıΩˆXÁ§ó5:ﬂ≤N≤√£]¥—?Å⁄—£ã∂ﬂüxv.)?_9∫:≤ÑD∏‘π•¥pKò'\…ÏﬁÓæﬁi-2)%/1)C—xÉI˝‘tÔdÔê3ö¿¢˝<âü)üØŸ`A*®5∫ÀRBŸÔñ–“œKïÄc»S¥`Ôã_s~»’ »&®ºd78’Á¸exÿ©zñèw~iß9ÂR>xR’.–πﬂºŸ}·„vâS©∆htë5–∑¡q'¯ˆK·«(Hø(À)f¿‹‡»5îåM@ç‰¥ñØG¿â—™\6á2kÜ'¢ô∆M•±Å˝túˆK0›:t¯@L<ø!xPÖÜO¿$˚sÿR<É,JÛBÒ€Q∂ÌÔNq≈◊@$1cÊAí¥RÇ%∑
ëªﬂ>
$Óæ	§•√boóC£lœwÆÊ†t^¢/s∞Õyä√Ö¡ŒhΩöÂ¥cöHñ·°-À˜≠∞—Â⁄ø˛?^ÔÌ∞®ıj˜Ë§5”!I⁄sñòó6‡ﬂ˘ú˛˜ﬂ¬úfM≈2Ã,1«#‡é&ıÍ`ªıjÔZ‰ ËË$w/6ŸaÑ•ó§9ò¸IÜ§%¶hßfi#›$Yvéƒ+m&&%¡ßˇ†fŸäı)?ó=«êJWÈØYŸ·ÈAºuÙıù· ŒÚ`møu≤{¥á.â˝:9q?£A∆î o®ÄY"|Ö\Ù+F…ÿˆ¡e`7öÎ°µ”∫e÷Œt?π=‰úYoì√–yÚ)èá!èøô¡mÂôÆ˚À+>”≠ñ„A±È∆®)|p~“ ho`≈ƒÊ√ø~Oò>ï”® áKÂ3>Ö˝π≠s:¯∆¸g∑µåü *∂Œó‚#¢®⁄Òe‡®‘:òØ¯q–¢åˆi>éŸàÔ3˙±€‰e7¢∞O¯’ßÍÇ˝VîfõıÎÑ}dâ‹x_Kc*Óˆ®ò;lÌëﬂwãΩ<xπ˜∫•hwj,X5°õ$}¥M°«$Cß™m«–ó«HY‘…{™©ï˜»£^°÷}•¢Â5‡Ø–™F´≈•iú3ÔHsgv™Õ8À∏∫bÚéÓsÏigh≈º˛cÃ˙◊¿Ól/VÚES« l `å´õˇ,{∞ﬁƒçÌ"Ä·˛±ƒaf˘Mﬁ“a6ci˚-
‡¨äÌa~∏”3l+Œ‹ÏüäÁW¶ÕÌ2J[8Œ“‹≤<¡¿—∞◊vD¬≤ã®oœ¶ô∂o{ı‹ÀE¬nÅ ]>™£d∫®1wŒùz‹~ËA0¿`∫%FÄ˚Ê]jù÷∑ê„‘ÀÁ¨’C∑˜Î?^ˇk¬kRà˚¯•€uÁm≠âqaDàP À=^˘6ógxm†Àr>Oû◊ßÙÊ&káoìíÏØÌx∞‚ÛDu›ﬁª·«/Pß—È1öﬂà±ˆC“iQ¢^¿L	ÄºQÕo®V∑“ª"´Ãª‚/Àπ€rÍˆ3√¢£óÙÁ~≈[› Ò¯Œ3…ñ∫°;ˇtˆıßGÜø?’Ò˘ßõ’~ˇ¸;”˜üÓ8˛ˇ‚ﬁº1 ¢—P¿g*5.äÖ"Ëoæ¨õüpÎ´}øi«G5Ñ.% äã6O«®ù‹wÕ˜ª*MK§œµ^!|‡£ß~I‹ù›i™QÑÛëµËQîäÏúD“…≥âÏ)‚«ºáø‰]ÓˆÑwÒó∫´0àûà+˘î#>1]£$°§+ OZw•pÜ˜'}£’2“;¶K¥|M£'æ¢\†ÂcÈ  ÔYø 1U<ÁnŒÚ1F\•î˙	À+5FùFë»/?ƒ
ªÒπräz@{œ·b;E˚ÆœñÄäüò˛∆p|ÜÃ}Ç1f»{ú[——Cpxz>€Ÿn”}l◊Q’·w∂ø∂›¶˝,ÿ¢•£πÈÚÉõ¡7‘•|n1µ¯ÜÈ9mè»|œÌ€Ri£˝Õ¸ôtmá˝¯M˙˘ä£òàAÇílâÈ4≈M¿V€ƒ˘5ï“ÃTtt<‰˘âY2·â;ø¿tùÌn“èë èOÅo¡|ù»4i
]`µ¿@U7x– ¨Oïã≤Ù‚ïEL%¡Õì~6I∂≈¿≈∞(Èπ∂ﬂı„¥¿0BL§OgÂæq√:/Ø(|H&`x*í£∑ïÃ…»¶∆Å^}‡ò˝è˚¿ô#◊≤<gà=A˜r`e:	•˜j+¿ãµZçSíÕs§-G¿/Áùg*π8Õà" ïgøuR É±∑ªëôMOªƒGì&√{õ;|˚05bØËDAG°€îóì˝äQkMôùôﬂ÷>ÒSı{ÍÃO·Íü≥É”ﬂ–öòM;ﬁOˆ¶ì‚#ÒÆ}√XÛ˜‚pdÓÃˆÆ?.Ä%é"`NÈ˝”¶Ò‚*ãçKÛ#?e§»5&í3êÆÓO’∂∑^õ'›<—ø¡BÃπ>ˆVgcâ‚vª¡Rö¸D–¬ñZñ≤:_É≠ÉﬁdÜ,≤◊°]∂kﬁ±∂G@¡„oE
geS|Ä« ◊óóº)Ûµa}¿¢äàΩÙC¥Aø±ñ\V€
lRRAáÃ.º¿
°8Ê®ñìÁÈ\ÂöC•ƒÁ®◊#¯3Óâ¡X˜Ù∏¨€|àu8L¯ÕM—‚”œ$fã;∞¿›3Ÿds¿ò}§—§.QÃÄFQçõ»S [ª$Œ€]å„∂÷O›µõZÕƒ$l:È|ï¢õt$´/Ô√`üÄ	êŸ>òlû~qÓ{√—AÅØ@2·	ö«œtTåhˇiû—Ä¢îHB™£%kN[Z∆‰m¡;∏Å∞2·ØŒÒ≥>1"albjÍf≥â£/xåO)èˇ1◊ﬁB-« ]/U‡:o“•u™¬Ó©Æ-2*´:ªf!ﬁ∏¸5Mæi}Á¿xƒû£@ §€ﬂÛwdámä^úõ™`ˇ‚qo4oÎ±ÖX¥"Ë9¬ÿxf∆?5î∫"∞˚¨µ¶CAÌ4,	âDöÙGœô8∑mˆ‘¶&EÁs⁄—¸´≠-$˘e™üzâ‘4ÉkÜÇÔ7#Ü$+¢Tåb¢#¡7u≥O€Ÿ‡,Õ˚—«›ÿ'iŒVÓ_)∆b∫ÚÇÌEÃDÆ<*¥§ÍÜ¬¶:K“Q‹dáË£å¡‹‰‰B©·ÅHÒ%äÊ∆¿∂.Ï¨ÎÅEœöÅèî¬πZ@Ö¿Ÿ∏»àq¥l©å»˜@Ë]¬'ﬁd'î˙BÕÅ«‚°jí|è…5‰ã'?oÇ{°◊êôêi•÷`qäq?ú#^$@ˆóØ22)Yaf‡\ÿΩ±Q¶ø7î˜∞®¿qaÚ˘©kvÆ2s€Ìy2›BR/¬”‹Øm◊ú.≠¨NjkA¯ÕÙ˚¸VÍ¶∑6ÛlÁïôåÉ	«i˘1˘AGÃp{UjjÚ7£NìµFTÆ%ê…~9›*ê¡,Ñºa»WÄQaœÄ¿	ÕèyDÿE´{~ËË8√S£‚ Cü´“∂?ˇú=£M∫ùÊÌû™ñjÅÏﬁAjJ—E}u8ÓÒË»`ﬁ^'Kæ<{å˙Ö…3){NyqÅ™Q]†>˝XV∑A*ÀfeÓiqBH`}°SÍ#C,∞∫ÊÉèêô0S–üÏΩ=†ˆ^Ûﬂ•»ÃÎòıZ¬lbÛâ≤∑Ñ¡Õ«~¶„P©fy.#^ÈLüx7Œ≠}ÕÎN"∂=JUê˜ôŸ∑‘÷≥√d–N{V]ﬂ“î¿·L‹˙¸vÜŒèöôcóÓßj‡™≤Ö]Y˘$èãÓÉ !{{Á˝¸h¸Ías¶q3çX°∆sÂπï‹"Û¶Y,£»|…DÊÕ#2_˙êü0i»2©9~ÆâF¨$Vä	'«^«Ã‡-¬ÀŒì∂ö◊ ;7›∆BΩ996t´ÊºJk÷ÀµÈ≥[Ÿbë•Åµ•"#≈⁄´›,©⁄	’µ¥f$˘±2Ñ8‚ ª¥ÿÎ£wÇ4ΩÔÈÎJ3˙Y⁄„âõèí3xÔSö5·m∏|ˆÕ…˛+z∂€K–t•tï~∑¿pM“‰ìa≈˜ÓW[ÛSÛı£Ïì>pÔŒQôñ>¡‰Òx ≠»[æÚM};HŒ	«∂ª“e¸ˆµuÀ÷ªrQòtåﬂcé¨±+ÓŸB&«]BC roó%æ3Oj=}^'õb›∏”.ÓcÒ<ıÔoDπ0·uÒ¢˘n˝ΩπÔ·M/ØûÅ\eâ‰xß„≥3‡˝$√∆öqû«ó/ÈÅ&2¸utÉóáq^$"‰≥¯mØ∏àx;V8|◊*KmíkSA¿””…îúìÎzXa8= ⁄°"°√HΩn‹d|MbTxƒ§ÄßfncLÁˇ∆pC›¥ì£‚ı?√6æ˛_t¨o« ñùÊÈyL˙ë¨YSg$5ç°:Õ–¢¬GL§©Ê;6∫⁄ËË,û±5ÕE4)›ÃI b¶°Wû!)§¶Èë)ŒøßìÃ<ÄV¨y+/◊K¡0ò…ƒG˚|BL1Iúd„Í,tW∫j¬!&≥mæc% 9ÜÁ‡Øﬁ,˚=JHˆπ‹ÚTa®bÃKô÷‹vaœx—võºq”'\ 9Æ3Ô;]1µnV6}9.⁄1ÉyK&ì:ä,∏Xóùíu¿JsÆ°R…l[ºìS~H¡<aŸ1!˙T≥>Ö[Ø≥æ≤⁄uzìã¥°8Y,‰ñÑ’êHÏ §ÊËíZDU˝~<T6b˛ÔñKß‡‰<D∆ò]KÒ0d&ñàÜV4tL'BQwÚb Ø|Pôm†q>ô‰fÅ˛Í$hˇ¬[6‘™X˘*ˆVó∞†7π•ÿz’®ê*Â«<ﬁCñ5Âå‘;<ıﬁΩÍΩ§0›'uAπß™†:#Xﬂ`…öŒ˜ÀŒhK˘â¯p-EÂ"‡ï˛`X‘ﬂÓÏJú‡ÊˇnNÛsÛ:7áQß¸9¡˘\¿πÓ¨Ü—j›Ú:∞`ŸéãÆ(„n|A˙√â  ì0sÂx3®·0æPgöµî@èª±*‡Ó¨
aHêÓÎ.Î™sáëuìËP«îŸ¨óçíß< Úr‡Í¨
ﬁKX0A¸ZÑŸjá	yñ´áa˘£4œË’≈‰„¥oˇ√„Ù{\™ÎÎ™·ËS(¸ÛÃÇgL˛ØûÎ6|T$GŒÚ®oπsD⁄¿èço]4ZBF§ñºπ'≠*∆JÛ%Åë”r2U∏·o=ﬁóıí3rÚ&€]t6“…Y»ñÍﬂ8Ç~ºeÌ’ÇR˜Qâ›∑≈Z˚˙_p˚’¶u∆dÉR Síó¸#(@mòßÅ=·Å	˜†ÿv.kóÜrá.¨~@@÷4óz'∑
Æ§V'scõ–öZ’≥}æ4¿ÃÒÒ
∆´åÌá©–⁄Liâ"84ÉW≤1¶©1@x⁄¸›‡wÉ˚WVWSI"∞≠◊(	¿Z∆}¡≠a#õ∆7Ñ¸ˇ?   ˇˇ J_ÓÅxúÏΩŸrIñ(¯û_·¬Õ.U ∏I™Lä§Ü"©Lﬁ%6Iew_µÜ@»H»à ód√¨ÁÓ}õáÆÈá≤l≥z*≥˚x˘'ı%sŒÒ%‹=<PT.5E´J!"|˜„gÛ≥¥W∫lu•”ˇ.£ˆ“øDKù˘Á∑#o|·•˝qùgl
∞ÁÏ€â˙˝>ÿƒSfÍA°˘∑lÉ--ÕøÌ<˚å—ﬂú„4`∑‚ë±Ù"æ⁄I÷˛ˆÛ€(æå”9õ&±?À‚v⁄a¯ˇzæófâÁ”S ΩyŸÃá?¿®ë?P·x¬“Ÿ0H”¯ë÷ıg| C/^∞vê$Ããn:j0√8J„q–á/q“^⁄áò≥p2çìÃK‰∞“ç•.É2™am
ØÔ˛#f£8d”8MÔ˛tåUı3‘zﬁü¿∏ºÛÄ˝Îø≤%Ïä˘A
]_√–èÛµö≥Qy„Òç_dÈnç¬dFÁ‘pV=d¯Ô¸Ÿgﬂpƒ⁄„ÿÛ°˚ÕoXòµ3[[[l•√í õ%kSÕM?ºd√±ó¶ØΩI∞’∫Ë}˘îç∆¡5Ø⁄Q$ÏªYöÖ£Òÿ⁄ñ€∏yåí ΩÿΩ“Ò¢p‚eA/ùÜÀÇÎ¨7M‡Mr”{≤≤“bÀº˙Ê2Ùç?;4Ú a•SoÙnz_0Ÿ6¥<Ú|˙˜á8û¿øΩ/ü0ñxYG‘ë•›Mˇ”∆c6Ò7Ëw_©iÇÏ*"±)ÏbÜÂå%9˜¶Ω«l'~êÙÚ«’ZÜc2ÙÁÎDc»ü‡˘bM-“5Ü~Æ¡ÔQeΩ¡ÿ~‡kHM√ê ‡áéƒlr/œ/p8≥È4HÜú±‚Ó·P◊Zz˜0Ä#h ¡—Ö‹™«∏Ui¯C∞uª∂6óõ&ˇæ
“aﬁÿAîŒ&q™On˘bÕòÏ¥–Àª’ïÈı{5ﬂÎTõ„Ú„1˘xÏkSsæ
·Ë¿édΩUkVpJ≤Œ2ék?Õ‚Ôg çC/ª˚1	ΩﬁŒçµ_∆√ò}ï‹˝aΩé1©∂eÀ∆û9°®∞Ã´˝'¥ÆojÓvËEá^K~]BÖ8π¡⁄6w≈úº£È,É√1⁄∫Öc®èpËÊ,ªô‚(‡]ãy√a0Õ∂Z˝Îqz›≈ˇ∂åC˙~µXÌ^x—9Ï(¸„CcÑI^BÖ˝Öû≥,ã#Î-c~òzÉq‡o›Ü)o ∂d^(ñÖŸ80  ÂX‚–yd	âƒÅƒ≤Gc8⁄@Hñäm¡∏Ê?l›∂;lkõÈÎ–ŒíVÛyàE⁄ùbÌ =3ªÍ}… ≤$ûE~‡˜∆Álp.†Úâ8„Ö£ÆAÓìv_…Ü}îƒkQUCáÀk+ÿQﬁƒØVx#¨fX¨eÕ ﬁ,ÿÆ∑Sƒ˚‚ƒÆ>ûkÛæFm}# ÏéûŒÄå¥:. XÊ`·£ú±‹.à·`–⁄ø∂vŸúêµ¡ï>d˜ü ¶€úêMºi;ƒÌ[ vYÍçÉ3XŒa∞¡¬>>·CàzöÂI~‡ sÿa¯ÅæÒ'¯‹e@aÛO@ØŸº”± Î◊U˙Ç[;∫_EÏõÏÑfÿÏ’c!∞9[∑G„pl÷Vﬂ"w≥Ôáó∞Ñ~;öç«ùg¯˛eúLˆºÃÉ›é`•ë•Ï"úCwîŒ»f1ºûEaØf—í⁄‚æç+¥©˘ÉzRêAOa∫3Ã¬Kx»íYÄœ'ArI_âﬂÍ@Oc(Ù%¯BÏêìOê^ÄÊÁ›cﬂøôQﬂ√€˘|˚50∏⁄\~QX]÷*$J¯öÛ$Ù˛˘ö¥∑ä‘5\#˙ÙTÁIæ¬∫ª^‚Î≠@üîpO°Øx6⁄4ˆpÕ¬‚h_ıΩ1`»´7 ñ{¸LO{+,A.˛ΩÍ≠=Ü£ˇ—à<6# ÷õ$Ω’5¯'√h=~
“!lloıâ˘Ùspî≥Ü´+Írv≤Wd≈¥¡x§∂JpN≈≥d3Ç÷s∑§qÑWî„âıï"è4@Èf^îÖ>À,òH∆»`v®„ã«.û‘…á∂∂o≥X—∑5õä6˚Y¸*∆}8…E{iöı^É(	Áê∂.éÃ¢¢¥Ã‚„ä⁄\VPz»˝a”±ﬁ’ı¶|˛)†BﬂNùºJ0	oÏs¶ySîﬂÚ˝7X›∑¯{rnQ ã¬&∞|Ì:ÿ6Yˇu8PØÉËb|:–ﬂÉ-<I‡1/Ñ}´˜pëV'%¬#Ê-õ…1«é¸E{hühS€*+Z˛‹ _;/p n·Qlçòj°j÷ÖØ«ÔqÛg=8r!˚[ù˜a‘˝(ûÛÕe¨⁄®M˚k;Œ“8¨ ƒ'cÑh˝{Ö0Ê◊eùPÌÜ≈&
§≠p¥-WrÃ€«\»w+˝ïµ˜ñ‹]/µ≠·âz ¶◊–¥[zsµÉ6åzWpêø¿ìlü<íQÛsx…pﬁv ∏ π6H∂Z y`'∏]Ü˚	åƒ›ü˝<fÒLÚ9°ånã]z„ú›Ä£Yﬁ⁄iêLÊöP◊Ñb`π*ªl–≥óúYüZ\˝ÒÕ.‡õ6Ïõ>=Öàl,V _i0Üô1qk¨¿ ø∏A≠WÁÿ2·CΩ=p™höy)Õ±îø ˙ﬁÄªñxËÏ˙:[!ˇ’√Y∫œ≤qΩ(éÒ™»ä#7ö∆*IwVŒá«S‰OƒÚÒ≈“gìJ«(≤}â\«Ëg¬v∆#op˜c=÷~5ÄúÚf*€ˆÅ©Æhyn‘†ÏrÂk‹®M±›Õñp!⁄û&¡0Æh˘(	Ó˛H (DÂû´M¿b©ãÈwîñPËvÃ#~˚ö>„ 	¸ÉÇ≤µ@ˇäú&ê•ß∏>r0Î»Çp˚r¯®ñîŒf®gì3]j¯…uœYFÛ5õKÌIx:—Ùu¶/G$Ç¨ÚeAD"ìÁ«.‘AWêƒªñö»uH¬òíBÒããzk§JÙCøH¿’fßì\%ø‰ﬁ‚èu¶√·ÚS%êkoùËI ¨ıü`√¯Àﬁ€PEêV ò√Íñ∑ÍdEﬁ≠ÆZxQSHÁ(R®¶I‡}Ë]¡tSdYpµQzØ`V ∫˝{59a√$éb≈¥»>Ü±œÔVNñwó*;{·˘p.=†≠Q∂’XºÂ§LâT«=])v.î4ÄØê≥¬!PGß&¨äÕa∞»WÄˆl–Ã«Ë\Ö∆ÍÏÍvªáÍ∆¿iu_/MC√6∑ù‚\›´∏“‰…[Ò&88tu¥¡4Ê∏’ôÀÂ◊öõ3˛BU` ≈ •c˘Õoÿ&›ıÌÜ…p,ëËÍZQîR£e¶äpiQ7]éump'P Ú*˝KüIàmm.&≠î`•{Û$0™Pù°ö?ùÒñ¸‚x-Wäü*˚(ÈÌÏú|ÛÜ_ºÊøÀOk®î¨>Ùı Øî›∂>3û™3ë _-u‡⁄KZ¶(ÉÃTÎZ\©v®|œ-uok{Û®j8ñ†πéö'∑ø¡<¯—∞LY‡öÀıp<Î'ìƒi`ÃÑ^”PEhß	p6kãÃ°¸¸8ÓÇ\Ö¸Fπ˛UìX≈;u≈LËe\°ûó†N(∏UKhfêÅ|3ŸçI∆€&¢ﬁq|ïˆGƒﬂ¥¨˘(!ö÷Â3´°a<yú£v´æ©§o‹z∞M@iy{∆Õªò(©¨Yò‚l∂\S‰ö|ÿ;	1§È.f

pƒuﬂ›≈ÂÒæîh«[ﬂ¢Kt9EMé]≤πà^T*TqœN˝›ó˜Sﬂµ∂wíÔg∞oEﬁ∑§ß€P©ª‹◊úŸr6]}c∞Œ8Á $`MÆVf1Æ%(±®∆ÆYª/ö≠ v¸–=£“ ˇî)ÆãgEh§Kª(«1üp‚' 'Ìr}–«œùs%t_q´P–/l¬“`C¢µèüµ§60i]ﬁ{ªùÔMï•¸sÙ«∂Ÿäõq†.EmÏ•ëÀR∂^¬Ú;ïÔb°ˆ◊q…˛Ú˛;€øSî◊•	ôÿ	Mã‰¸ÿÜœ#Ôá y^∂™•Zy6ÒÆ{tØ¢.in∏2b¬M<È•√$è^bhÈå˚ÒRFÕÿá8ú†Ω“eO;\wêî´˙µE
ˇÌ€Ñ≤%úπ‚m‘í∂∞éAz%[]€∂
Ωd2
®ûípR‹€¸`i÷öÆ&zÏ)ùÖE≈ì2˛ŸI?y7≥	¨åâƒ≠›ã˜hi‚°∫‘±ÕX§ûÉ‘ºö•V+éœH†ë—iÍd(sjßœ8tOWt£íE<Ü”|„Ò
J™á‘˚∆«âÜ‚™˘ÛÊGœ˚	◊ãw'ñK◊v[
pµhπ∂v—Ö€çAòKpÌ¶^‚±ˇ$’ÀV¶^q^WÕmƒmC5GNOû÷#'Ö–\‡Ô`:6Z_iÑé*/+ıD\1$’å(•9îÃ@>5†h¨Ïi9ÿQÆe\m)åY≠Ü©∫ˇ\7tmIÆÂKó≈]Y•Æœ—:ù
•'…Qu◊%%)î‚$LíûŒºàÂº©S@ïaV'˛/eZÅ ¨ØîP óUøjò∞Í‘°¥óÙ¢ËªËÖõrí	[mI2áÛ‡H2•Æ=øàAÑr`ƒ
Ès{◊ãÜ¡ÿK\∆VVG∫}´mtØôØ˘'Ÿ%gèÊß#FJ¥áWáÓ≥ÊËﬁmA+J“Öká-+õΩãΩÀ§»_Â˛ùvéF7≈R†ÈUPÂs]Ç2áÀáhÈnmª9·ÏPj,8œõ
ÚÔ[∑Å^ñè ç¬»Áv§a`$hF¡blñˇ—«y‚]"l»q¢›§q˜î∂õ”·Å˛ÀÀ¨◊Î±£„7{owOﬁº∆G|ªõƒxúë◊€}Û˙tÁ´˝C÷∆[4é•«Ü i]0>Mò¿_˛Ì∞YÍ˘1ã<ˆ2Û˚‹qà?Â◊Ø@ÈΩœ∏.iüW;'Ä∂–∫ñ|'c¿Ójèıƒ∞ÎRª≈õx≈W]bL‚´˜–∆,N2 v°€Éü}(“Ó‹¿◊˝—(fÜñå∑D◊‰óﬁA(OÌúÛÅV¥Ê–kiE™≥§*ã «Åó®˙≤Y*9Ô≤wÔÈÔ”G£ì ~˚)t{Ëe@ëØë8”o†˚q“nCáÄ£‡ä¶”Vã“Èü.á-ÛÒhç√û·™oÈçÈ=.≥ß+Z˘TD/ÙwPÀà)∫|ËfLªnŸæj}1ÜNÍ˘'8ÓˆZó-≠ √_ò,%zvîJ!„p˙∑–„ï`≈A
Ìlp(Dq7û@›õ.n{¬ ¸≤¡ƒ∆œ›3*π¡v¶”∑XEú∆Ãç ∞	Ë¬u®€Ñ∂ﬁΩﬂnõ¸é´∏Îò®•ûÎ+Ø*™¯äˇ6‡úõˆÊÂ√t«˜Îrå¶ø2jÁﬁ\Ú8WØ…$àx}˙mTXZ≤Jü„ v^’êœ’µcCd˛T¨°™¿O¯◊‰9ﬁ‘¯=œa?ë‚J£Èa@M˘ÑòU˛ˆÈ>AöG£·oiB0sçáiBO‰ŒA@uT!Fv˜"Ï≤y7‚AˆCèháùœÄ›∑òóﬁDCVD>∑mc6 CrhÜQB·+/Ñc9õzç˙£$û¥óˆƒ‡ñ:}n\“^˙-¸FˇI¿Ÿ,]4≥‰ùœºƒGäèK¡‰Ü˘Ä-Äf,ΩÔÙâh/a Sg´@)(~r˚Õ‹®úÜ+Äæ≠
$ ÷ûÀE¸]püyﬂkÛX |:G»ê#P~‡„U∏Q˝¿&≥Ø„Yí"6ˇÎt˙Y|pÚF†ùNa¥&ç%»7T≠Å:¬mößæ˘I’Œ˜ìt é∂±Ü√/ä¢ErŸƒ+ær=ærΩ!Y±•∞41Ï˛X‘ÛÄWæ∆i»% øˆ[xJá¡ƒCÇŸ ¯Ixì!”π¡åÌ@2ÖCÇ5ú@–A€EËnÛ¡%¡’]1D1T‰<$’3Ô{˝h;ø?¬ÙÁ)Aˇ“G7ıa˜&HÚn5Wÿ•Ωe¡ò,0 ‚$˜ëàa?>πYrc8·"»ínSh£˚‘Óÿx_gÿ˜3«Ÿ-î ä§í_ä“íÃkM9RYé'KKÚCõ©}ıµx–7òv\åÉ!kÕ∑ç@k‘aŸ(—ÉrI∂âå·&Ã4bBà›"˙;>EI0*˝ß5?hÈ;Ì) kÕÓ˛˝ˆºÖΩ°’â5`1h†AhËK∆TÉ’èØŸ‘«=πÕ7‘¬ﬁ]∆ü¸¯¯°AQÂ°$à9«£°ÖCø—66_ÍáYMâCıı$£:iL\∂úaÑªµ¯íG¿5˘ô—¬(Dv"ÁÊÕØË≤3Ù‚
éÎ˜ƒ8L÷˚£7Ωxö5
X<Õíb’üÂºétI:|˜Üúq~Ï5‡·fãøH:&™Swâv¥≈¿0Ñ‚¢Ω$´√Ö0|è∆Û•NG∆,‡Ch∞áúˇkèû>Ù9√∏±æ4ôëìqüÔ;Wwkà\c†É…NéÍ±êá÷l-∞/Cç©'´Õ2aè∂ÁpmrMaª˜C`†qÖ°Ë∑óœ˘·#ïqªX2	¸Ÿ$~ê…¥Ô˚ øG≥¨a4Ó]—Ñe/å¡“6¢Ö~ø_(j5<ödáa“4ä¶‰ªv"O]4√€qÒ∑üKYXC3zi.¨ó»—™≤Q%wóH˝≠äÿÒÂ™>J7Ú†Z69Âa:î—rï2W±j™_›C¶h÷∏Ó0kt⁄Ñﬂ€¸õxx˜ü,B# ∫^Êí>“è@ª˚Hy∫«ó¶ó‰⁄
zÚ†·M˛›‰W›dwå78˜ãm‚Pìj-ˇî±M§‚V#dÅA∏?ÂH _¡iW1πm¶·∫§ıÜ&ßcõß4p‡/J§õoÁr$∞˛8ë‚ÌÉ∫ËZ–ØM‹-£5K‹üTô≤=®}ﬂæ∂s'ûeÏ·Ú≥.?ns$7_“ßÚì˛ÈV‚î¿ÚÓG‰.HC”πÁjË´bMIoÁ,LÁ◊±.á»ÊH ˘®uQñ}≈U—x©Àb¬[Éπ-5a+#e¶	⁄Ê≈z9£‡Z8}≥]ßKÃk›F7N!cê«(òU4+–r¯íÉsôÁÈﬂ÷l7”«x„^4Œ´vÂr˘~5fªîí¶s€=ñ”1” «jP™–§◊Wí!å|˚ø˛_‡áµóÛoe!]i"ãÓàw‰˝y±‘vå€mëi\g™[:±œEÌÑ#ˆë†ìx©PO%EØ∂°¥Ä›0º$î5ã€„BÈbÑ√≈∂zQvy_Îp_ÊÃ†]⁄78ƒa∫®h˝ûﬁm]Îò'∫X¬È[Îr¨]{(«Zõªl.ˆ¨ª\`•ä#üôç˚ÕMDIV[Ö2îvoÑˆ¨∑U˚≠.àËÕ˝$HÆW«a^Û±(™‹y≠ cÛ#–⁄Ωõ‹8NhÔ€R£	≤”≈©yp5_„ôTy∫	d>&ì1\˚Xœ6Èˇ$˙)x∫=ÆÚt´CÒ6∫(ì´lß.]ls˚s9Æíî+W.‡ÌÊw<(ËIgÆtRàE“¿ñÙ.‚¶åΩA0ﬁjΩ∑à¢èÛ»∫l8KeúqÀW	E^y’ƒ?1#ù] ”P^À¡»ã2÷éß4˜qß•„T·	m(óÜ&‹∫pª,tkLû_¬ΩdˆØ7ÿqêÖD&@V©À‚‰ÓèÁ}µ¿1Í“≤zôƒ≠üπPÖ1ﬁ€¢scNË’ÿq>Æ≤Ó¡5UÜ´€Bº2√_T3öt˚Ì§Ïdﬁ‘K∆ß·4@_i‘ÏP‹¡ª?¢•R‰±ò¢Ω†Qƒfvù~„Ò,"5 äÆ‚°“Aòˆù†•‡Ÿõ„Ω˝c∂≈ﬁ-q09KÇa0πIJŒZú!Ω°WÔY09Ü-à.„Ò•∫4JOì¯Ô´=Ÿãﬂn‡πj$¨æß*dÒKÇÛY∞ÙEÙ´ù˚ØN¬á0ˇM~ä∫‚4m√lPUnÕgÉ-—¨%ghM h,Ëür…å±,|A€ûΩ–ªk1¨ÊÈ57…Ì2πH8L¸)ﬂÁÜµµ’3˚êÀgvqú/™Ω¶≤ü,f˚rôª˙vA“h!à" dm‡´¬ËÇÆm–À„∞ßP Ò	>G≥(Ås¶<^–Î8ÛHk∫3í,∆>jÅK±»Öùñ)V≥hä$Of *1Ñf6ç	ˆ;Æ2ÚØx≤¿øüÖx∞?ŒñÒX/Œq¿'Pn§ﬁﬁíÅ,∆zNË.]⁄"æßY”œŒ·z∞…uÄˇ#@ıp‹}ÛÍÕqoq«?#ì?ŒsÉŸRà-,)û∏¥¢ññ4îµNÔ±Õº,± O–T»Gt≠i•'≤öÊÔÕ¶U≠È≤Û°uFËê·ËC|0;/K'êü'≠ãÈ,ôé]+$>ò]àóF˘‘ö|	——¨¯`6+^ö#◊N∞÷∆ãÕ“k≥QzU∂˘¡◊⁄æ	∆ËèTl]|0€/ãka†≠yMgµo~ëË™/— a“úyÁ¡n<éì7#º•Á”H@?eÔDÅ˜»‹Î˙÷È·òlüìP@Ox AÜﬂ`GÇ ‡"âr–4~Ç°‰˜OwNr"‹÷»eá(tîÖÁ^ Ôê=∫"ªê:ysºªs∏ˇ˙ÙÕö‰Ô¿j‡§Î˙ƒÈô§q¿çGéIM”äããˆíxÍ«WÇYC]¥Ã~B˝|,wüüèÉz√m´?7œâ±{&ö€`'ﬁ8¿ìgÖñ7XªP™ã˘7<ZUcã.„–¶ç∫ƒÒ8¢gjL˙;st≈6¡f›‰˝¡É¿úzÉ|:é„¸Y+qìP§Ú·4C&Ò¿'ü„¿f}q≥Z€;”©¯ŸyÙLÎƒÀ`¥äÔ	¢ IÖÉ·®ÀTÙ‡Æ¶ÿ¿®–{âw~NX]ÿJ£ﬂÕ`,ÕÜpñ|QAñ‰∆<‹˜ñ¬ˆ√yAöäÙöÛ*sQF~◊7˚3i˝'O“Y◊ﬂÊÉ€`ª''˝S|Dí rç¥Bê%:˙¯ÖLÒFöí‰”üÛæ‡˛3g∑ O‰k∆ü’∫√Õ´%zŒZ?`{ÙúìÒx—iNÚ»Í"BÒ–Ö·x¡ü/	úZê’o´Â÷≠LÀ ≈(mÉôÔ.ôNEÊ‰4Óø≈c`£•Æ(âÀ∑Z∞}]*xÎw´˝ï/ﬁãW?`$'Òı¬É£Kºf“ µ≤]mt˘ö·.XÅ(q?ƒ´Ûƒ £»Á⁄´¨õ£Ω =©Za8k¸ß¬ò.IVäÅç®{£qdƒDÒ∆´¨'{Â	o´x≠¨)ëµï∞Ô∏Mi÷⁄_ÿa#Ù™Ω Ä≤ã<Nx≠Uâ‘¢*◊”`Ë∆òÎ[ÌW˝$w§6¥∑‰≠y#Ú#g¨	ÙÜﬁ£ª¡É‘F≠Ì4ˇm3êô≠|“nlWjóûws*SÖà3…˝™É‰µ∞¢]z·çá‰–Xglá√—ú^•+2"_Yí¥∂ˇÀ≠:˙¬ª˜¥cjÇ ≥!ŒÙ2ÏI8ì∂€u£≥È≤’«ùÇ*∏4<J…çÅqŸ+g§«ºß*ªD8Ê±ÒUãƒhØ√≠BÅ±¬k"œØí≥L¬zááV&<j˚“º“ D¥ç^Ëÿ„ø‰˜|∆±≥˝◊¬àbÈ»pá/ÕÔÀ£T«IŒÔ$P>ΩÈ≠Ù≠8ÌÊ}Üï6C.î√3˜6ıF¡KÇç∂cä∞Læø|x»æ˛zc2Y2s£X~‡«DaÚÌäÂ"/vÖô∆¡(£ŸäZ^c<ÔŸzqEü/åm¥ÇÙ»;%Â≥Ó¸∫ö*œÑq¬-Zl]Rß¬CA[X!∫q√vÃË#>hL\bj1É>œÈ0∏ﬁ9ô Ÿ	År÷b¡ZïÈ≠´bë¡nKûﬁ“™˛ÂûÁ9µ*çs}≈∑Ôs8i@i∏≥âœ¶c‘ª'@≈ú8Hªcª†Îb£«+Â¡Øo5¡ã£!ﬂC∆ÖÊ∑ú˛\Bíu◊iFáæ’’âÔBˇ˝‹t∫cüÿ™Ä—[ΩÎêÚ‡∞N"Â_çÚ≠î “¶ﬂÅü⁄Bü˝ºÉ^'ñh…€R0L5ôÔ›˚O/¬Ë·ıIê	ÌŸvC—.S‰%SY®Wµ<©d∫0}ÉÊ≈Bp√˘Nπ‰∆x«b_lyçˆn©+@}]*C=bJc√{n¿o≤úb¡-C*˘∞or”ûÚÀè|≠˙^⁄û¢ò“¿äÿ˝\∏ºa‹_$ü+fºÛ€&2¨3Öú0µ∞±Rñ„ÒΩiM¯X∑¿‚R≠z¬wW2y+bÂM´`Û·pÍ:…ıúH.Œ÷[RV◊Ó•*üÇŸgˆ≠±uß|[Ü-|πÄ‡ ¶˜Ôd_Jyeø`1"‚Ïπÿóy“ªﬂ˜üî€gÍVIã%∑`©¢ú[à":rU(RNHÛÙ~:≥JBeÍ|ÂdB;8≤I∞‡∑§≠Íi†Ë0r¨¨øópo∆ îÈ/¯áå|.zÔØp€xä™ı¯a{ueÂÚ¢∑∂íìŒ˚1 sΩ«·"µîÑ›ÒH5—Cp’ÅeÙ[•Hÿîö>°R‰õ¥uÎFY®BK04<p+√,Ñ	ø
”ÏÑ'b<¡‹läÎã∂´Ì1qDJ∂ùÙ,_Õ§}Î÷~3◊(ñ¡Ç*í¥u[$NJë6∑P9v†?[bÅiñh≠jAî¥“jT´pZÕ£x˙yÜ~lÛïw$©Ù˘¢:õõmwc¸Ão˝_—Î=á@©0LèLõ‡ed·√k—]?ßg?±Ë®&Ø[S2ıéª—hñ_‚xÀº∞Éˇƒñè„´ø]4¸§~Ë!7ËRâ<7£IøaGQÕÅöıÙ`Jlô!]aøeO’÷w:"tU>êÑrèéT”l€.∂TÉ_öøÑ∏Uô∆J∫≠å˙î8m—?+èã%[f±Z®à÷®[6∫◊íÃ	§•∞Xπ™ºFS¸rs˜gùM^˘SÍ¬-UxÖ&‹·	[∆õƒ 'oUröe!WØó¶ñ∞9Í≈—QÖão§G¥à*‹1∂ÇV|m≠†o∏≤R)˛¿
ms+®≥]Úçq6,ˆΩ‹oê»±%.ïµyBF7É-íã°√Ây©S¢;U‰Ui1˘≠ö,ÁC7†”„ùìùΩ7K∆¡2tÁÂ'Ke{u¿7–†Ø˝ıÁı˘GiœÔ• ˇIÙﬂµÍoC˚˝Â/’}èœQ˜˝uﬂk%—‰
Â∑yh©æ?•Ê€P≠Ùﬁ¬åíMáÿxy»&¡ãaïéúÿ@˙mƒk‘tÿµ„“HKYﬁ·â˛¶:fcÃÖ-Ã∑JUﬂ‰œQy-Jv™’¢g*nLuIHyKLÙ•mG’√‘B≈1Êˆ:…‚≤îÀi)ô&Òı{∆—G|Ü˘óÃ‡r¢
]£z˝W˝µ  ˛rCΩ¢ÿŒYÓÖâ9Mx·òßóiéÜËafËáI˘yw∆‰®g}jX∆ûóπ_ÚóÃµIy\c{€óÄ
çY§u˚‘eó2¶_q∞ûr∆":F ó~±!‡BFéõ°	^ü(¡öø0ˆVDÛ”æ-b#Á!ì)µŸ7‚¡!ﬂœ<?âi~dΩIøH9Ú0Ç„(’ª3r ∆K>&íDe0…˘ ¨òdæü∆"-∂ó4…‚fR_˘Ì ≤ªoΩtlÍvª»‘Ëÿ’P-e'Í±Øóü™=õt øX‹&u
ºhÎëòﬂÖÈãŸ¯∆Ê÷ÇÚÍØ™¶'ﬁ%4/kàÃó’M†‘À0ã©ºPèF5∏k∑A⁄‚ñ»ˇFëŸC´fÈq¿•ù/iDòÉõ7öπZÜŒç;¶õπÌ)»àz÷;ﬁVÑär%waÏ;iìÒñèJÀn§ÿ	0Ê+Ωı|ø≠Ö¿ß?âËtZê∑Âe¶]ûä´AÕcj˘<ôMc‘˙	EÎw¶6ÚbL›êâˆ—èx	‘1EÚ;U≤^_ëUËñÎä˙Å÷Mªw>√≈4ÄæºKÊL§±≤j…°àı˚ﬁB„ö9£±F˚†≈%≠‹âﬁ"†^©Äs˛¿π\ı‹ñ=¸âÇˇ"!ŸbIºÉËﬁ"Éù°3‡˚ÇÓ‚ªVC‹b/ÒÛñÜ1†æ0Ç„ıUêe^<∑≤ÏÆ*ëBãü…ÿ]y‡h¡|÷∆è.è5yâ˘…S;`t⁄^‚-√(Sø»¿<$ﬂ«¿_R—íyß&°¢≈¿€mù¶ÅˇS Ù„¯™ì_<j≤Ï†q‰©ízjM>2t≤hGFMC˙âÉ'_‚.ù†¯üCI„kæûËvíÕ(Í'‰Ëdwc† ƒ>"ÊˆïÖì†C˛m<ÑfLﬁz,‰ﬁ*^êÔK`√Åƒ7¯ØygI,ãRRl˜~ø?Ì⁄ƒHM 	Iv¿ÿL;∆˛◊F^U;üG⁄ÂΩú•ÖnÙX®ö⁄ˇ3IDD,T-æÈkå'8äC0ïﬁ˝È —ÎöHW?ˇ4Nd TÈT—ê∑¸vN]ªÕ`ı£›# ∆!u•∞-Á3Ã«¡˝ÑÄÿpß∆∂ó$∆r 
àùc
=åR@ôx®¡çïı;@ıèav!‚¶ﬁæd˛Xû6ÜnÑäAYø=§±«“EfÛy©VZ XöÛç≠œM≈ÉÃ˚yÎ˘∑⁄û= a∆x-N\iëTc˙¬+!'Y1§¿V ZçóÏ£éüﬂ(õΩ|YîãÒaÛnCŒK«”&3ök'ä”ƒ<4⁄4K"µÁ‹¶©'Tã*W„ª6X¯lEu∂ dß¡ÿü }z1éçá¡›˘xü÷K1ﬁÀÇ˛~ª3ìG.ªT4p˜«ªˇá«]¸¸÷ﬁ(i“–÷$ÕÌñ‡@™Sÿ@õ+œ◊RÂ≤nêLzôë´Ó<á”äeÏ»v˙&ÍÇJk—ÊÎC—◊˛ ç≠∫Ê∆ J&¢Äw∞à˝Oc®—.+œU≠⁄epqBˆæ´˘»g¿,"7©è?§l5;ÄÊn8f◊6œëí¢ª(]C‚©5D<ÁTÒPùÚM◊£ﬂkD‚∂ÜL§ﬁ¯iD.'Ä´ìhXp_JƒëíNO4*ﬁåDKÅé2Úa4œ@Lf¢í∑ôZ|yŒú®πz≤P[æx^qÃ'Ä–65øk˝(± €ˆ©¿8?ëå¬3\Q'˙ÂíËc.≈	˘N~ã–˜\⁄A{∏Ç¬vNC/íK‡Op5ùaß„Gﬂñ¢j“,·Œ‘D0SÛQ‡±˘A¡KÔúF#∞z∑èœ2VäÆh„%˚\áúRt
≠ÔGæ’6º…[6≈ﬁbóÏÛË‡R55!cJ£'‡ÎòZf‚÷m ñò≥ô¨®öâﬁ /o6âÚ~<Œ(.&C3Ö} ∏?Ñ#yW⁄pwX<”K«3‰Ëàùn„‹S· ì◊—ÜéS:¶‡[zêï¸@bsÑhó~€®ZQ´Ûº¡•_æZ˙PÒ÷∫˘u${$:=ë&—H¶ó∑s|™@›©[ÕÙç≤∞€bÔsä€'ëj0[6¨Ÿ"QãÆTÏ®8ƒß◊RKM$,Ã¥§xzñ∫©àˆ\ÃSÁ4≥ËµΩπ≈÷Ú≠Tﬂê£‚*Ï“ÂÄó<‡⁄Õò»ö”œ‚WÒï4—Œ6UÈÿ}(ï»áî€&<-J"KV√˘q‰Ì\@ñ÷ña8íbº0Õr§∫USØêè)åÏD¨Íú¥	9ØÎ◊H˙ù[«$˙^¡Â—¿4’ì„XyV^OZ5
ï¥‘S•$ƒçFz⁄Ø¬XQî≤@.6.≤‘Â‹sﬁÎÎ·ø:8ñç…˜ÊÄ\%å≠l<#«\~v‘ò¬q“˘Û&H'Â…‡€G$(d¯‰`πyw„<‹ûZÅeŒ…Jâ”Ïê^)»ï4Ñ2Ö´A¶]gmE˜XNí’πö"L≥ª?'·ê2
L«Af°µ£L6s[„–tïx”¡_Õ˙7ôJ3€=çˇ›æ≥ﬂ0∆=˚‰UjóWÑˇ _`zÉ∞ ‡Wòl`^⁄R≠[ÿºë#„.ﬁÒv∏õg∫^’
ø¡Õ[y%û≈H‡	/¨-º'Q≤$Iº”·éˇë›–%∫Ü∏æ0 ;Âˆ•‡SQ≤s÷≠v™„enÜdS˜=jÜuø÷L“tﬂ≤åØÿ¨îõ]óÍŒ∞Ò%◊zWéîÊì‘>∆äã2Îs√k-B±´k◊z#≥√ﬂ&å
 C3JTTà†p˙æ¿‘K°µNVûÜæ,‰l!Ω+àqì¿º$g˝¥`∑:ónÿ`Æó€`ˆ¿≠b–v∂b‘‚$Ö©ú∆Ñ:^∑qîá@3‡*ƒD-∂`Ñf}1KQªâé9î±`Ì1,k±≤)˚∞´ﬁìµ‚™MôÁ©h◊®o√4≠æó≈cavÑj¿8BAXª√˘_‡õ[ú§µÏu.ﬂ&™jmS‚≤V{±ÖÊ»ÍZèöK[b.,A˘∫…u*7˝oÅòp^‘˙†–™>jõD\Qœ›n1àΩuí©"“Ì‘⁄•¨∏0‘ÊnÖ≠Â’wì %öƒ0a
¬pîx≠‚@òƒjz/Z≈På«ßº\êïyŸ#	xZkÅØ‘ÒÁÒb¿Vænõ¿}∆Woßˇ¯µáø%z_'Ú¥!J`êñí2Ö∞Ó6…ﬁç%õLπËYSÄ3l}€ñ÷•|{ù|OmÜ rC (é+òì◊22∆Pã¸6≤ù;$#°ŒLÅ`ı`Õæ &vˇK˘ø˛;;å—`C´O¥}oÜ≥1^áÁ(Ãfú6⁄L›AÌy1Bå#µçÕ(-êªI¯Ê+Uºè4o!ÀX,î\≈ƒ/8:ÿó—∂AøN(î¢&¢⁄QÕ‚ùì´¢°Î∑Ísèä6w¬Òä¨∏%π™ÑñÇˇ®ÛÊ§‚∫≈é∞ƒˇÄÑEŒhŸQj ∏TÜ∫w¨§õeﬂ¥0º"+úéíµv†¬|ùyBøBùzÚ¶∏§üxÅmti›Ç‰ÛyÚ˝D9ìäÂ&§Ö’vÌBßÃ‘JÆfàú »€Ã¨∂˘2»Ñ∞úDÑA?Ê®‡á)l/»2£*ÑÈ;“lóv`Æ_!Ú`‚aû_ˇ…˜”8‘5◊ÃåèQóï?~ë«¸Ä◊§≤µÅÃ·ı$+π¢~£h∂êÙ¢ç"¨ä%ÑÇVEÚP7?∆›Fª…ΩNávU^2ª*Ü‚®¥ÛrÃ∆ß£§aEÉ÷∏ÜdÜÓ0≠ôÎ Ôå«v2Ä∂ÎŸ ä∑fgµA»ƒh.cÔ∆ÇùÇÇ˝π#"äåÄbv≈B©ﬁ ŒŒ‚≠∂9`Á ·µ:∏≈Tk÷…>çR*Z'®2îä¢s]EN§ùú•˙LﬁÒø0#úEY~¡Ò`«Fòe<+tke∆÷ˇ*‘ü5¯ˇä4–vxióüiZêäPÕºúh∫à¢.Ò›W#⁄P lÔ}cju£—‘˚…JAÃm§:uÍN› SV∂´®ã\¬ı]vX.-ˆV∑…*ÂÆ…ke*d5mcQ0>˙--;¶ó˛W™ºe˚‹ÃÕı**Á‹—˝>˙8€ã‘©äXzÇ≠£È 5ÌO7‡Í(ÑƒõG¢¿–ñ]pòw÷I)Í«∞πFEZká\0g◊B˘ª◊ÿ¯‹`&)ˆNë6}‚.	¥FÛyÄ`k5∆Bë◊jØY‹[Ò¶§≈üpy´"∑π °á ac°hnÄgÀ£πâﬁåònèWÎ„ºΩ(ÄyE‚∑RÜO¯7b¯,ÉÖ‚UÆµ2Ù€Øp-®-ÆG§}Tò¿:¿™á™"H’gfæ5ñ-∏±ÛyÍE›˘<&À*üß•¡sfÒ¨êN
y<ô”˙≈4wNg[∏ñP¢π…˛¡'¯"ΩJpHËùGÁÖÊd˙ﬂ
oëÕe^w€RÿnêΩK5à∏”Ÿ;ÀÛ®GC<7íS'∫¿Å◊X‹ª¢ò>n≈tu•eÁ˚ê√&ãÄ&ñ<÷=ëõπñ∑Ó(P7rÉ¯∫≈Ë"ÄäŒù◊πÜÔUøﬂ7]Ê-W,„ªÂu@WÍBXàÆªÃ‰‚q˙Na«¨›ó
UZˆø∑≤¢√‚rw;í8Kç5M–Ó9øU-¥õÓäâ∏.Â’ü∏ùœ€∂åœüããvº≤/\÷´øOªÕ¬ôŒ∫˙ü€Bè˛Á §∞∫rüpR◊2íîÅŸ»¶Çˇï¡`”¨	˙n 
⁄üCNpZ»Z≈J¶‚\{ˇ‡ÿ∑‡ÄÙ◊Ü|Õ	ﬁ˜ZÓ¨÷ô4˝˝ä0Ôq Lm‰´˚Ë¡ø0U†ﬂõ5˛«˜’Æû=r$,ATÌp}8Ω 0¸2ÒÛ«be7Äñ£0◊ªJ£ƒÍå-î[›%‘‰V◊z¯8ÎÑ¸ÑÍñvd•πmÄ†˚ªªpk°4B9A?ﬁ»GìK4<…}ŒkÃø-lb…¢/≠l•Äñ ^á#&|Ø◊c'˚ßßØø:¡3¥‚IêaæÄ¥<∞bc≥$M¬+>£ílg:}ãU Ç.zFtU€d¯¶¸]“}_ﬁç„Û¯m2È∑Q«›Ûæ(/º∑ûôΩBﬂ’=-JõÿÛí™|X§Åî@
kÚ¿cÍ—E7∆ÅÒH{–¡RYsjFàÛèÉëE7ø>=|Eﬂˆ«∆mq∂ÄsX∏ÅœD@¨4çÉî°ô6f;>8bø√CR7pEóq:U÷ÅY:\Ça∞¶o∆Û'aƒ¶1b\¥πú9Ã»0¬ Ï8¨TÉ˘ X5ÿ}ØìÔ0àf ⁄UF√p
ø⁄1 s ﬂŒéˆæÈRg/ÉŸ∞CëW¯»pH„tá°\Ó<á;√¨ÓdW®∆y∏ˇ˙ÌŸ¡È˛·…Ÿﬁ˛Àù∑ØN—ªìN¶pœΩÙÇ"Bi.{ÍùtÀÖá…D+ˆrÖc∂{|h°R≠Ï!Fí9«Ë”VY\ØπòÏ}√æJÓ˛Ä+PË◊bòÈ≈ÂÚäÚ -Èè=†◊_/ÓÛèˆÄT¥&≠Z¡ ÆïƒÉ¯á0∫àœo§wx ΩùÀ∞
≈)MBScN¯ŒU:®Q◊‘h¯Ωvû·LÃHw…#¬™G2e*0û*Ì2LC
0%≤M∞9Çmàx<-íøxL˛úW1πåxÑ˘x¥¿ôá÷À≈÷°9ÕÎeIÑBwt/ÚEíÒº¶;x–¨X+fËäËs>w0èsÜ3=„óx$ß!ß gœc	!§Á%÷ôx7É‡Ü<F_€Ïòî∂¨÷—çpl<§É÷<2€<	åˇ•"zâ±_jìÕ⁄–“W^ÇùÑ^“ìnE6åED!†RLÉ=ÒXõ„†("Ã#
 Ö~vB¿]gﬁd µ	C›˝1ø`ìÅJ«ó‰pnèùÍAÛô’\Ëß'≤Ei…ª‡&ƒˆı¯Ä≤&@FF÷ª[î)Ôá‡©NH≈?°Êöûáº[ˆ€Ëoœ⁄EÈBéÊΩ™¿ô)g∞Àﬁ@ÍŒÜ,dﬁæ3hí„∞’Ü5≥œ¿löb¸ë‹k_˛Ü˜“C€Ò¶!,Òôáƒ¡†π+3zΩúºyﬂE0ƒyóbNau`{3éZÂë”£N¶¸QasöD«—#KÈD?èºÚ√2y	Ÿá√ëöﬁ˝·<å<Â¿ÍQ0Nÿ˚Kf»∂ÿ
µ˛Äî0§Hly∏6§¶Ì” Å)¯aó}8Fgÿ.¿,Üc‹e‚Í†ÔM2§0z1≤Åêƒ&Hc°¯ıp<„—…%Â<…Cá"√Ü|F¡°.Ùá„–˜–HG¬	,ûÇUﬂŸÈŒãRﬁÑb#i‘ŒúäM/‰ƒ¥_ÁÆøÄ)∞^Å¨|¥Zb]ÿ2ÙÓ`0DLaùKŒ†P6VKj0Ä≈[üC+n1:âã”	‰ûË√«wwÚÀ˘"C‰‡ ¶˛e~P0’èJoø]òü∞∑˝>‹Ñ16ç°8*æ_úß0—ÿ
„˝œ¡Y¿¨œ>1wauQ¬aX•r.√˙P¬i∏®ø›Òœ«‡Û”–ˇ¬A˙4lÄ—M5'`˝…ô 6Xˇ|jæ¿\Äüí5 B.H∂‚ºÙæ¨¡˝∞ﬂÊ	ÊlD5ÜSƒØîk4‹yƒG\NVæáä(<‹¥—}Éªm¥˝AI'Wê,u∫ÏÍ"HÇˆRòóÒáÄ◊÷¸ó/Ω—‚,JgåØùDﬁñ.kﬂeÌT&pÛ^p¸P¢Ô«Cé|Ìî˙tJ·§˘}DA∞TsÈE≠é≈ZcrÔ£VQ©ÑqÚP±ƒy
äÅ·ﬂı\?dt[hÎôäQå—qaw.@⁄ÇÜú°Nﬁ4àôædü;:~st|∞CΩ{ûVvB‹Y<æ ¨ÖlXpb6hÆ˜›ÀµV®ÎHC‚“‚ºÕà;`í∂!ˇ&œ∂…RRiÄ¨≥÷%rW‰„œß⁄R`äR ⁄Ø!<õQN=É¢˛ï{Á ¶Ïñ¶†l&8bÓFhUmîˆ«^öùA¥ìQ6
T≥Üë
i7FD˛¬P`Z &Ñ™Jãõd6>p5ﬁ”#1ôÂ=Gy’wAgÿÊ£ë±‰\!ºÈ¥ÄΩ° ¡@Ùë ±ÍÆTeëló®Ç-°ΩCËùvxŒvÿè∆ —≤ïß∞Ëú1Ò0/0@WV$€,πQáòwÕÒ¸^<l˚¯{tôö@ëº¬!VD¯9 '∆'CÏ-Úy…N™—∏¶ˆ∏¸πDÂ§¿G‰.
]CJ>&CfÊQ ·ú>F$èo,µÕl‚—]¨àö
Giﬂø::·G∂∆® Õ∏0uF5BpIx√∏†		êå6j: ©±ÑlıÓè8ª(&	-"TqƒG(L	ò@sÕs“¸`»}!Z¬Ê†∂Q ÜàîÿÄ#ÁX∏79µ6ó/ﬂÏLß˝,ΩFEı≠´S?ŸºQÛÇ€N@@iF˜Cä‡Ew®ò›‘ıeFûCøhE6—ˆÀzœ+u^«¢e—Ff´`fTÒΩ 
∆â@~<ê„5†Ä*É;°T>Œó#Â∏.ûI˛£tQiﬂ∫lıIéîÛ”„Êb‰ıêÁ;πŸ¶È) d,ºw:£[Æ≥ﬁÌ—3ﬁu·„bóÜË’ùû≥Ã^pÖµH≤™ﬁÈ‰0¨Ú"0.I]V
—~ûúB^*Ù∞òÅ,ë	*Ã’ïy*TÎóß¬AÙpÂ^Ü„Ä[y‰@làD˛Å¬ˇØª“¨Äbóóù Ü€W÷¯ú>Ôø[yØE˘ƒó&•√◊¯ñBÿf_¨pædÌ±Î‹.Ì∞p«pÇÒ±á!]4ù¬$Íw∏N´ˇ˝ã>›}£-ÁÛò°1Úö("Hík∆ü‘#KWæm±L'"PLæM∆}™3ÜÏ(¡¨†‹Lè1êr|GÀ8£9Ë·+ó÷q”éÈE~vò( )é<á—x[|ÖG‡Kç–Ö˙\z›√)¿v“=úŸÒ+⁄ü\Ó∂X◊!9fCSbù§√AÀsf·
b¢ëg™˙8¡∫V¥fÏÚ˚πu˘ßÊ“tSy⁄ó≥åÖC˙W« uäà*≥1Ÿ(ë>®ü08Ü3F=∑óˆë~è"‚›„vl,Qt˛ÈÊGÆ"P>UUG…I˚¥É§cÈœòëxX;¿e‹v‡%ˇmp8¸]1œß4Ê·ﬂç,q¸U1ßRÂ(Çu8:¯'÷>`çÑ—0â#“: ˇ˛îÏœS¥ºõÜ◊ÃùGÙ≥"’'/{z3¥Ú¯höìß#¬Ø√h˙O˝RÛò~e0©úZz∆ÅáÏ.&<‘¨_Q0
á°ó®QjØ™Gªf™˛6Kü`ä! FÖΩËÉÍ
~WÙ!tÀ·µÆQØ+sËÌºzuv¥Ûœá˚ØOœ˜Oø~≥wb_í¿ t
x≤î˛>pÌµK7êØÏ˚¿^|6LÄ-ÃÙ
ªèHª…›èÙ’]◊•U˜Ó~8jí©Ú(HuåÎÒ˛Ó?ÈÉUkc W≠¯˛¢`≤sAiKæª˚æ,ﬁzŸÈy7H4ÉÏ"	˜]_B	Y±/˙Íó◊Z¥˜p)„ƒÒ°:#Ô›9_"’ÔÆÒ æ¬¡îZcRUa^™Ÿd$œÿ(@f˜«ﬂÒÎZm-!
»6§Ùﬂ`´kH0⁄g]v§⁄Õh:døc´]£Â‘ì&‹∫≈¯iyƒXEAöƒ^ÒΩ±+≈ı4·ƒxÂ\CÖ9—Œh9ƒªUÆÙÆ√%»dylŸ ∆ÀSy©¥(û"¿[VXÈ ÿí`8ƒ~—$wFô‡Åá˚ách‹4$+Ãú˛Ò¬ÀRo:Âªeæ´@2¢ˆ.3HÙΩ∫zY_ˇ•7q¸AØ.ﬂ’◊ﬁGÆW•ııN`iÙj¯‹†7µ“Zá‚]-:Âup‡o †·gëI{?πSﬁÍÈWoäããº˙ÏCp£ô§Z≈êdEœ–Pü [dXØ®Q]^yêø8ãD€<Væw	2o›R©êIëçŒÅÁC¿ì´U'6o;Ó:A8õÚíg^4øÛ,)†áx^Y‰Éè†˘^;œÎûaNó3@≥⁄®Ì/%Wµt79ÍVâƒ8Ë
z†Á„ÓûdF÷ˆH(´HÊ7zx7ÍÎ§O„®ü”	=´ÿOì¢µå ô√¢ÔŸÛÁúPiÉòÎ¿Â†LÌ◊¥F|[h’äúMyë¬Èä	¶Íª _û]â∑Xo˜Õ·—ŒÎ>€}Û˙tg˜¥/ø9õS§¿l/îØ]™èŒ%u0â∑Æˆ‰7gsD1Ã∂H2p5Dú≠ 1!ÍÎhﬂª"(â5Ò÷9Ò-◊pO®Â±≥é=ÕºÇe⁄?É‡Ù§öÔWß¨HVÀ„,X^`˛™Dﬂn‚`‰©SyqBø¯ùﬁÈÜ"∫Ω)}ÂSÇòÃÔ}!öf´aÙWöÎ“)¢!!úzƒΩ º∂ÚZzp1O	6ıŒÔz·°Ÿ^Ê˘^3ç°µJö›HQq¯®∫JàÏsKv?õÏ>j+⁄≠‘ÿÆ˚h±ö®Ø¨]’çaÊ Ûï30.áŸuàëÊ—≥Ëx!7‰üLÓÄ`ﬁx!r9èÙÓ(mÛ®Sq¸ÃÆ´m•‘ np∑π´fâ˚™§õÈÿ`.Ò˙q*¨´ÃÍ£ëy◊¸dπ¬©¸\‘m}‹ÕßUG√¸ „4±–ØvÄr‡Í`˚	àÚ+)ÄU	[
§R∫“6àyÙï‘≤F(–Òä®{˝ı™⁄nóqtO˜UÂ{c4Ùpãê÷tïH1äkP&/¯≥∞-=m»7JÁV(™dU6◊∞
K¡FïU⁄¥BQ]T9Æ7+BŸDï!Y±!s‰MI•ÿœv>NÅ8ë\ö˚É†Fïs˙à˝◊ª?`Ïº‰ˆ–&Ô˛|M6ï	©WSÜé% kBcaÓy√í1˝‹ÑCú˜·[^f‰ ~ËEhÄl©(sΩ&ö¶ètöoÂì°‚ÒÖªEêπ¬…=î|¸.|*NÏw|\Q{äøË¨*ﬂÏ]∫}àüùG˙ı
∞&0Klä_™‰œÆ!ºÃ¶£3®ñ¯cÖ÷ó◊…‘˚˘sm≠#/MØ‚ƒ◊* Wµuèµz¯h^Ñí_7]uû„MX&Æ=3<ŸÚiËÖ◊˝Bœ®¿ènõ§·yá}öÂÓ_Ï≈ti™ö*éÓ‘§⁄Ë±Ï^ÎΩc]¸K´ÒfÅ6v»B\oCºY†2"∑k‘[+|3⁄-|›nﬂŒÛ€Jù*Œ≈!¥é\òÚ"ÙçtyÏÎmı%‡dÏAÅÛÎ¸π∫D≠†_k/ÍÎ ˝⁄|W_[ıÎ¸˘ÁÑÍœ*L%Q•ˇï0ÕXË¶¬ª*7hìQf^&Ø!o ø«WRùú;¯8[Ó9†RjM‰!∆£›¡"&ò95·Q%¢òΩìÄ}»®Xe•Ï2º$Oov¢Î«∫Ò:DNT@ïw∏Ÿ“	ã…e¨(∆!h$dôß¨Cù"'(£;Ú–0ZÎPÔkB¥p…·G"◊†Å?â1ñ˚∏ìàU»Ô
hÚmmØµ—°ÇÙDüÎG›' ∂ ô¬>µóP#mÆá˘≈0SΩe;œÃ≈˝rÄÔ[ﬁ	¬Ø{Üπ~⁄òŸ¬ j9õ∫©<òíZ≠ë‘OÉt+´È••≠6‡™çπö>∆Ü´R˝o%*kdñŒ—XHe›0ÑdüÆƒ„»ñ#–\mº„L¶‹ΩG
.U‰Æ&´"ªÕ˘~r§JgCÙy‰bËÀx˘ú?∑Â“Û˛ Õ'r;Sx»RÒÁåg{&3∏»ˆLøm1yE¯¶ﬂ:¯A¯>?çªgÉÑB	¸#\Œ¯ï∫…§âHF,w¡‡édá¯äsj bÄ0Åë±)˛Fsd{~_ÔºatMj∂Ëøˆó˚≤ıÙÓœ‹ùÏ;ê¿Ó~$£œP◊å^k ªÿvDÓ>‹”?∆∆O∫íê;"“GÄˆæ9KÃR,Ãﬁè%|ã¿S ª v¸9{gD'—áÙËB"zê»˚«Èc›…cÍºΩn|Ú^ﬂw
P√ŸÂ|•ƒB¥*
Ç‡@ãZ†#0É°åPy$Ä˜ˆ`ﬂùFº†¡àEû-¢[Ø„,‡v	—	±ñ»WJºÊ<Æ\L/⁄Ò“J£⁄:ä—±Z÷;î˘*|£fÍﬁ•¸>AÇÜ⁄¢,æﬁ…`/.H˚/ﬁí˘ °Ïùô∆¨
”-∞˛0Òâ˝Á~é∑˙#o6Œ\UÜ≠\q”@|∂÷~)¶◊ƒÂr4Ojòº zNÊ«©áLj0^≤"˝ÏË¨!¬IÕˆP.%"úªÍ2≥kÉz0∆’ºö®Æ}⁄/]&◊æ#’6o∫÷ëxU÷SÒz§6Ω	‹YéÑÌõÜîdíbãEƒiT
q∑XPúYP ¥Z¡Z‚©ìOa7`l€€:ñΩœÈ&≤''¬Ô<∞ŸÑΩ}{∞á6ƒÂmIMæÛÙ∂ÉkåÌ§7{©º|—ıZçPg&ºò)@$wSµèπ´1Äh<D«bΩèò=‹h&3§2rxj\</1∞&@_|zDêüú¨◊Ò)∞
=d·4f-ÑÕﬁÍ”/≈_´ÉdëØæö	ÙÓ°và1´†uúN$<—ı“˚ÅqÂ2÷0™«≈måCC"◊L¿˜j·†AÀC¬*3}L⁄@{Åô0ÅÉÆ¬≈¿È€[∂¸øø[È}ÈıFÔoøò˜‘Ô«~ØÆÕ?_˚∞VôÖ$ÀjnË%Á∞^ªB¶n)'#Œ‡+Œ∆¥	∏MIpbä¥z≈‹%ﬁ &π<H[zÌÄç=Z:i$ëZVÑàq–!@¿ÂÉ≈…»ø∫—ZŒG–’{H…{ñ&õÀiÄ55'Ü8≈d©ZD2ﬁv†g ºç@ªòoAõ8π0ù@AÓäü´”·‡Hæ∂˘Ë‰>Ï÷‘˜¯—ã0ßv<≈5 ùÔ7 …ZbAﬂ-ÛõpÙÀ-ì$ÆÁç„y•1˜»‡HoÕ¸Ã ÓW¥]•˚<4m≥&£e/√Î¯WÇΩi£ö†nÍ‰2©˝ië€˛7Á
R‹ò´ÚL+W¿π¯ß€zÂ]¬O]~Ìa|ŸO\WXˆ9W‹.F¸Ç´∏‰%´âl»Í⁄˙„'Oó∫˙¬ÿm≠@ÒΩeIÃˇ,Ä⁄O‘Ωè˘ˆôµz&∞÷î±9)¸Ã¬íSÔFÿXˇ*Xå0=#LˇÆ:‚,´ÁGŒ0RN÷à#9ÛjYŒÏ¢5à‰Fe·¢>]´¶Ì"›¥ñ‚$XQxzQW‘0œMd»)ßÀdπˆ*YSè	,' LCB™moÂÌßó‹g`t˙≈¿
˜≤¬]næÿ¿>3ˇ’mâQ	8f±*»SJãWò> Õ-EäÓÓxﬂ{Yâ®&™∏ä-Ø§è˙˛ë;tâçÀ∞B°T"®i◊7ÿ…#˝b∆içy 0Ú.1‡∞\Aú(ã	«„E∑dì´0ã∆a*Ÿ~ôvQcÀgFE‚±Úõ))à∂ÿ;â£Ú´õ˜füK√§®ÿ≤∫V†ÜJMıÅ\ïdÚ—óPT!mñ‚ÏvëªÛò´ûÇÍ™—{ºπ1Æ6·é1àO°”)(è>ë˙»ΩR/≥•‘2´òiÆöy(Â9bä_öò‚N¸†FAÑ‘öí-OÛvKD‰Â	Ê“ mP|¯@PŸ-≤ˇpΩuÚ∆1“è?£ÄôH êÌ”û”Ë≈‹(R†˛:À”æI\;J_+‚ÉëåäÕs‰T€áÇDƒ}T˘‡µ$à¶”ãpà‚jqÑ$ö>9Aà¥Êa§>»’ÌÊí/ía
åä!Ú+l"ß—:r(FÇ|X÷∫ñ≠∂YjÎÍùxjÎÇº!SÌb®ÃÙ‚åÙ"L¥bõÁ6‰¬®~9o≠/ê˙$Xkù–ı&ƒπΩÓ3Ÿ•õ0ÕzSÒ’U´´äs÷Z∑5»Pq÷
g≥÷Xî¢¨ŸÇ§…qk‘¨X$g∏?π:æÿπb·MºütqU⁄jùFÊ≠†,dBäB6õoñ∞‰°z√¿§mìì@‚˝Ìkå=ØQÖïâŸ{˜˘≠ùÛ˜ã'˙±qª¯/—øD˚=≤™
Ì¸_êD‚ôWÔ]p9«v c‚&ïòˇO8ö3qíùÓnÖÊÔ˛ HÙG(≠GÅa~:ÀCÛkÁ∏”ˇV[ó{]~⁄ïÿGïLií† $(‚˜É,å–¶{,/{—>"7x5]ê(L6êÃ2äj/-9æ€YÁ'u7Î¸J≤≈˚◊≈•T&π R/¡òPwòî•ó?ê≥êgK0Œãq<∏≥∫$€≈ËÓGÕ ñ„µD&—	9&Ú™)O!Q)€„Q.}Áæâáwˇ…"¡¢Ïﬂ#‚)ÚlúÎ
"ås
ßp5û@Kâ˜⁄„˙ë∏ba~ªØ&™ˆÆı˘-7òäøâFŒ;$ûz›ú<g˚ta."3™±ãàô£ Ãº˛∑U2•ºßåUÙˆ`¶´:8ßw‰b‡öÛ>¡b[”±ÃLÕJù˙Ç€DÄòÑ2Ä&MÊrIê∞êî¸…bŸÛç6› °#ùŒaÛÿöt´3E„ﬂß‹@Üu ô‡w÷cÍÖhÃ‰ãC`‹*Î  &K`·e±0hﬂX›<"◊©˝Ê7∞h∫˝Ö4˚íùï1%ıç)”î+R˘%–8:aî(ÜÓa`í˘£2¡kÛ;îÑbfá∆]üqØñÛ’|Üñú∑“3#Ã˚¸ûÿ\bìy° Gb√7{o_Ìc0˙É◊ßo^B@-î√kjÂ° róÍô≠0Î≈ﬁ7ì“Îc≤oiJëíã&#ª_>Ø0B„¡8πY*§˘∏$^ÕÖ±ˆ±,◊iêÃ≤ÆÀ£Z) ÈÂÕ‘‘5û.)çª…NBæ®ìÁÉ#9bpπwJ5é",ßÖC{3lQºÄQ◊î≤Â<ﬁULƒG.¶ÿ:xi›zòLz ∂/Åì9KÚÌ(N¶"aùj¯•∂.q¢&ÉÏ‹aÇ$@:≥æîe∑SÌ~Ö¨_î°:JD§Dí⁄û…4q¥ø»°Ã'é={Åê°Á·ë€¢
fƒ¿{û¿Bßºû'zî©yÊRúwÄ‰Öô˘˝˙»,rísHê0-ª•ÑG\t·πÄx7 ûwä¬Iƒ´ëÄÛÈ:á“ÊÇî`_)Æ)$)v8úõFhò|PB·vÂYπùîãÖÅÏtùÚ‡Zz∆ëc$À“ìqYπ?.í§P[Ö‰Óˇûî¶JÀ%]Òƒ∏v@ÆÜ√≈kN„äë¥f)¬Û–(l¡KêGquí»”∆ıµà|¡‚\∑L	∞x(äÛ–ªˆgc9˙K‡8'Œ©zW ]‚HrÏtî‡q◊	U6∞%Ü›9,‡Wn{5KyŒÜÃ_ƒ‹}6…1Cœo.G¨Ql"cŸ/óK1Ô_ä˜-~j†ùàb”ácÖå«^øR»ÒeL!$±ÂS/	FûªÒ4ÂP-ò ö„Ô∏6çòeΩk—Õã¸,êè9œÜ√G.«±ÿ¥ÌjC√·Ââ¿àá*ÏÜ´gÓîI∏ƒBÂ_âËñIûO’ìÄï,?&w≈Ã!‹FìW$ÖÊYäB¶eπ«å€öú$J+@†ÿπó 	¡Ô¥»§Û";uå"ÒL5£2ÜÀ}$˚˛ë_2#2„–‰8Äóa:”í –ΩÏ≤„ØÔìo3NWá»íaòWOj≤y8ÅwÚC/]ﬁ|ßÔ√°Høí|?/πr ">ËºLUûΩj`_tY·Má	Z—≥ªˇ?∫0ëhõrl`çª?d"Àﬁe¸W¢èm+ÊÍ.ÖJ<<ıﬂç.ø6òào8è‚8ﬁ 	nÅó[3%Óp∂ÜtÇÚ˘Y:ƒ	ƒK„8¥î^SÈ —YD ç√v…3∞0û9≈z‚®d¢CYn å'$	3…H/êMé†é8w¢#G°7Md˙?«·TEf"5™‡îF£,©|ÖrEKwÁ¿¡§‰{S`W‰0¯.tô˜›åNkÆ˝íL]j<ŸÑX,ÉòJ?&ÿ¶^ÍYÔ”)P¸ﬁMÔêñ√	&∂Œd‰˘ÙÔq<Å{_>a>‡J§√Ω'++-ô~ÛÑ;„}ÕÉº+Ÿ=≥1¥m˚}=¥ÚBÈl  Ì‡Ï8_„Tf†-ÚZmqi≤uª…ìŸ3 ÏhÎâÒ-h∆·√÷mnê?ﬂ>·Ü$ß3?ﬁ\Êï∂•ñcYÕ»ZûÛ$Ù˛ßò1Ì≠≤Ò˘F˛¯òù{”ﬁjæ –¿WX©±ﬁÃ¥∑¬ M'£q|’ª}@-Ï¢7
36 _Ωﬁ’l˜Ú≠!¢w")}®õäLãOîhÙO4äœÄ•A˙A¡ãnõl∂pÈ≠PUnÀ-i”o¯a6]zOﬁ~m#y‡D}0´_dÛ-cÇõ≠[®3/|Q[†<@y*§So@ùÃÌ
˘j›£∂˝ï±÷UoÑóœà{„`î±iÔ)z∑∫2Ω~œFÄzÉ1ÃáÕ¶¸ïOH©? ø⁄ª
·l©ıXœ(FuHÓç«≠naB‰h§¨ÉI∞Á¨58ÔQRÜ‰OOä¡z_¬Aa¨EØx7èWÿÇ¡‘íÛy°ñ›±ΩT€Öë—X∂ÃwÃ(‹—ö⁄\VÄZº Ú Ì=¿Qoù!º3â5‡g% õK&†ïõ6|ïa•Vq∂eeü: bÒãuΩ4-ÙıX K<ˆYæÙ9∞dò†ÄÓŒÅ©µmÖ9ÒÿlµGÔ6ó/÷›®F)kÑC\Âµ)w	ß[≠oß òÚÑc…ñº5˛∆œ†ı/˚è˚klEÄK3¨îáC\n‘≈¡∂æ3◊e7ÚœáΩ«è◊zG«oˆn˙5⁄æ¡¢ÌOêΩµá~Îäù9oÿÙÓÎ£ˇZ◊¶ (kosv…ké◊≈wÕéô°^C›øb–«l⁄ÊïÉ˚¥ÿg $ÿ⁄F·@a¸#1øh
J—*°*0ºmb{A !n<Öç⁄ÃÑÜ)DQlbb¥˚∆9ByºÇ’∂´µ¡#u˙ h)v∏„•‚Èo.OÔsöWY:Ÿ∞w…ˆ ®,ˇñ—¬Ó“ºª\ ã5;ø^⁄¥{+*IeæGOVl¬) Äè≥M´*v¶S∂TÓëè∆¡5ÄW0I{‰ M+Ù∏jéFÆzk_ ˇI‚∆È≠`R¥&†ÊêìA°Äbi#¿Pà¿∏"ˇén‰„õ8ód÷"ΩH¬ËCo•fî∏°côﬁòSòX89gi2‹ +Œô7Œ∂Z¥‹tZÊÃâ∫‡ˇƒÃt‘#›rµJëe˛á—jõåÎ è¡4Ã0á’÷Ì⁄Û0…m‘odã˛‹¯◊(‚ $<o‚$¨’oŒfH$#	F⁄r9FsÜa°ŸpTœÉ)ÏaÉÂﬂ[¿˘˜≤∏åx‹Äò\Wv≤v–UÈè âô6F.ô‘Ôê»Ø® Õ>}`@úcÒèIoßËjPΩ!Ù'È˚÷m™2È	ù4a…ÖeÔ*‰Àµk‡Ñ˛JêZ	”ühÿÆvâj˜é∏{-0-È|3ˆ˚} 	&t¿tñ&ı´•ƒ“⁄Çƒ˛%.Åv,◊W4BØ—Ò£◊_qa»#)ö—lxÇ îã´09´?¶ïﬂ≈«:R∏œ…˜/üäÅ
bH∆_--‰L‚ÇtSπ›áb=ù
rÜÓK9ü∞æÚ´•É∏ﬁ?‰96ˇä® MË~DP_ÛøH+Òk!ÅoSènÛ»≥Ì£ΩóÀ\Ú´A·Ïaà`Û/eØ-,p—õ^+D]∆ìˇú˙ÉSTÈÁz+÷ﬁÑg˛Î‹_ôï	)»⁄‰\9â}n¥Çπ€¯≈‚∞\ê`P~ïc¶z6UjªçüF–
ÙR†·Hó*?†E•:≈Á}ﬁoK‹ZZµNΩÆ˛Z®Vóúƒ∫ŒIò*rMØ05ó∆Ioì-Ø1öûˆ›GÀéˆ`,Ö6∞JKå!Å!°ñ=ŒWP8ŒıäòtRÉÅ“?¢ÏÚ◊¬€åèﬁÍÂcòCò›Ù~/UÙÚ≈*–ı“—ñ.¯˝ò@ãŸU ´µ8?`∂á†Y…ãÜ„úœY+Ú9∏¢èõq9õxY`*g≤5§aÒ€È§µ}àGò8ÎòµëHr¿∆>%3º$±·Í7ø>√ÛœÉúãW9≠Ì¥òbÑü∑+®V--pâ´ù	Õ08‘éΩÎ¿omsƒhA°ÅJè sÜC4Ck<2]√e¬XI%¸6†Ûp<√{i¬Ä•öL¶ﬂ˝\hKjF˛∫ñ“8ó ó∆=·b8L…9[5Ø1ﬂ¸ﬂ€<ôU·3së=√Gb¥≥ØÅ9VC›9 5R}
¨&†ÓÄ÷¯Ã‡xçl21ÅÜ∏Í	Xt˜'º#c\ÆJÃwp[ó`L:*náé%~8|ÿ©5üXôj™ó˝ãb≥ÖM9[f«îñ¯Ñß%˛»Î:rÔ4Ûix®?ÚÿÑ	p’”ª…∞ó$*÷.ò„Ì|œM"ª”ù†!Oòå	ŒÉÑåøDÊd4âJ…8h8ôAÓÕ≤O¸À^Æm€<∫à£ÄdÙ«ÚûYJ∑0‘"]2õôeÊ∫:‰“»=Ë»ıyY•±ÆÂ•=vÖóapÄ$[≠˝Îe(§“U!NÌ™˙∆É<?´+wh–œº‰<»˙‘VÛ¡J+Ú{éUVØ™JJzﬂër?i«8EÆòˇpQ¿oº—Ûª?HÏ¡r«Í⁄ërøÂ˚ìNIªêT‹1Ó⁄ÒbSı√•ƒ™˜^TiøÎﬂŒe!∂?Ù–˘/∫˚è.ã˛◊ˇdk_¸û˝Âﬂ˛;„IüÔ~ú–”—NaµE⁄£.Û∫f°a@ ¥i≠å®PŸT©)FàÍÄç‚‚kÎEçí“⁄L*Ì–$/Bìº&PÒK´áú¶´´í}7âÍ?2≤‘‘¬Ë2ßJö1åsRÂ
¿±≈1'∞∆qëÓÕR∞xHÇÆè¯c®8õdΩU]YFNOúàì«ˆ3Ê˝hF5¨çÆ)‹˙hÔõÆr“Úù;dàKZOZ»©˜ŸN¬˘5§ËIÄ%"/qSÓ2ÊÎˆëà b…ªoíjßæÃ…›üÒ
»!ﬂ√|æƒnËÛwè≥ÏŒh”}: @©‚ÇÊ¡≠¶π9.Æ% ˜◊Fn«ü¿SÙÓø~{vp∫xÇN≈;o_ùˆGa‰ã¥≈2ËÌìÒ–›jz"|æò™≈OìÚ´h√∞>/˘√•™¿»–XÙ]sâ‡'ﬁ˘9"—Íbq¥…óHSL™¿Ø~[ÆRMßºµ7 g´k∞Ä2B∂qzjØu∞çx™ÍWÏ∂¯+ˆP±‚è¢]L¨Y¢«z·ù#Fòä™?c	Unﬂ˙©0	l…‡¿øH	∑#ˇ –u{JIÇ%ËŸ£m0s’E7Ë†¡È»ˇpQ’¿°2à∞¢¢zñ+Hù.0÷z>ä¸‚Ô®˙ì“Pí/l§üNÅ∞rò]∂⁄ljz]öPó≠t5›¨1olßæ¸ºAõÆS™Ö%-oªÊ¯5÷4“_ôVäi¶˝úÎ*ÿ\H%%∞”Îﬁc6’4ê vÑ£¡ÜˆjÄ—˜lÖ∫!Vùh‘MJÖ‡cÆ]¨oUæ”∞´ﬁ¬—Bu’¯ØN∑˘UNø	TÅèÖVoıiôQ‚∫f¥YØ›+(˜$·º∂¿∆ØzO4kò[†–ÏwluﬁD´Á“%r©=t1äÿ	P˜Á}í±ΩHjÿ∞O^œÚ ^Àß÷’©fLΩy´3o`;¿≠Oö†~ª0ºÜÒu√8ƒX≈'TòSËíW>„Fˆ/n®Ú€;ÈåLh?Ì21Ë¶W1)ä∆7Ì4±1D√+¿14Ê¿“ƒΩKZØ/;>‹£Œ∫Ó1∆ñNHÅÅÎ@«Pél[ò˝{’«•7C`~‚•N”£∞Lg°≤XùºúÿÃKˆß¢Eó£≠»! Èﬁ®}.ı5∞™ê◊1πl>/™ÓÎ4ÁlHƒ≠>ó’KóˇAÂÎùww·∂Tº¶N?Rƒ÷eÃáΩ^ƒI¯Ÿ,í£ªÙ7ÓŒ π¯*!w‡ÓJoﬂÆ“ÆÉ8ÆËÊQ†,zﬂ˝…ß◊¬óæS~ÅRß˜êhß˛eq/„dÚ1Ç-¨ÀŸÈŒãèk]"ÈëæÇÕRÈ¥8Q‰s\ØÔ+õŸ–¯	ET«∏ˇ&•™˛K©ÆÉ˚7A’ÒWs¬ˇ&´mˇˇPV≠ïS-Æz”†_¨Íí&À©÷ﬂÑ 
°≤Å»¯◊,1P„Õ5r£Q∏Bt‘‰©Z…—ıÕqÔVàm≤‡•ØÁWÅa√É©ÿ#˘¿\˜<‚4á*çCR:ÛJw≈˚{]Æ;º.y`Ÿ#@˘√p £n©äã9^6tñªÕ¢(ßÑbGé∏HÖ~jÏ•≈âé£zπ—e:}B	hˇ%≠=j . 2Ê¡ñ¶Ä·ã^•ö	ı¢¨2∆˙¯ÈÄéìgŸ∞vTæzÏØT`cÛêN94=-^Z≠ßSuÀZOƒLw¯¢Ÿá^r@ΩF<¸M≠3Zµπ´öJ’\ÓÈØ∆ä«J€›ˇ›˙yóîÒÑ5√#ügO.zöåB–yû€t/Ø	hQoj}ùÎÃ“ˇõ7ï÷‰+’N¨µÊ”è›Ä°ìÈså°‹dòl∂£bD∆Ä¯/Ü{
ÀÇyˆiLûëóﬁ"fù»∏òXz˜¶“CŸFD™ù°EûLóÊâ–Õ*ä(zÃÓS∏FÃŒPe¬ÌÿÒi®Ë~û E‡YÿYW†Cò`'ò†∫õ;j»`à”Ÿch’0¨%ºj•ìf≥âôÍ3†pqfqÇúV-≥˙È=O~eÑ"\Ä˚ZuEXî˝j‰IRa^D;kàv÷l¥ÛÓø¨ØÜûˇ—NmL≤J%ﬁ˚áÑl‡⁄y\eÇ[á®+Ò—√z ®®üˇr¿¡?Uﬁ´4¥‡©¯2`îOÑ›–K@Öˆ–2m•s»ÇáÄ=8m∆≠£i¡)CÁix˝˜¡MÖ}Û(ö5¶÷LÉ‚u1YW ;te∂≤xÜ°ƒ/—¯1ËJ…´¿p•Á≥ˇ§r:úE∏ˇß+v¸Ç¡8~ ˙Ú¥¥nıb˘&Á6´ê∑±Ïß7SJﬂ“NG≠JˆØf{∞°¬UµÁäm≤∫∫∞ív›tA„GvgÈF<À∆ap#p˛ ‚∞´ï7’⁄èò¢Ùã’§Â≥CÕÄssôWX®—h˙]U´ Ì˜i6‡ •Ìrë˚¥,O^E„ß¢»}öß„”È-_:Ë;Í†7Ë∏:4EÙ”BT^Œ‘E‡≠÷+„vpf¯°Â/`îK¿œ)9∫ÊJÅ#˝›ì'òœãÂFÍ‰òña*ûˆb$O,%HC∑Yz6´©™#∫iÃ^Q0
á!\÷—∫¸ G≠ΩkÔÌÉÛ¬ãÜ.ˇõ◊≥Å}Ë2˙N√Mº4˜˚}c®P¶fåP‚ﬁÉ€%°Swg G∞f5´Ñ%è†^óZ2pó⁄˙Ê*”í:MlxM)„˘©9tÀ*ˇd>=•]u•Gè≈Â-ÆÌ-w?∑€E•ÉèöÀöhŸ\B–ƒ√J	ws7¡<∂ªÅ†P£ù®VV¿À,èîŸG2Ôä‚·+eÜfBÉ¥ƒ˙~Ü&VÒ¥‡∫,RŸb¬’;ÕùÖd.4èaÚß –PU¶πIU!8∏![<Æ”w‹Óºzuv¥Ûœá˚ØOœ˜Oø~≥wB ÎIùçãtıŸèxDÔ-_GﬁÆÀaê]ƒ~⁄£·x¢Vª÷Ó§âïUCÖ9ÈÀÿYŸÍÚ,>?∆ƒ¸⁄MÃßUõ∑‹ÍrÿE:ts˚XyÚ˘Ωˆ¬jı|„
zÙÂ’Ç*]Q˘bΩFôæ∫b›Õm∫^¶åÃ‰5Î]É√<,d¡é∆πÏﬂZı*Öo∑j›ãVå$ìndÙŒnÛû0@«.ﬁæKÀGlÌécπ*PáXò˙@!Ï^ZJSßÚRWÁë∏πFWËM.)>≈˘LùÅÊsvçj˝rX:c∏‹ùÉ.ˇçΩ+gÔ {,∆€Qçz∆Œc*kÚmå›©w-·'ã%X´›‰ÓG`U„Úàèr0Mÿª=êí1˝À†7÷˛ª»ˇtA˜bî$cJÜ™4›˝O‡ßcŒÎ—ò(µá°◊+é?∑nFë|l≤{OkŸΩ°‚¸_A33ë4@¿H/„1%œõ[hjµ#N£ôVòï+ÜvïËÖÌ…\71Ÿ*Ïéå˚÷4Ñ≤V*é^¢J’TT(Ì◊®5
ÏÀ≠£j¬ò“•Y0›jAá Ç@≥uª“`B3ÍèÇ‡vñ¥Yîc”tëÁüﬂ’a¥mÓSóô
ÆMƒ»y+uU∏∂ég¡Ë»Jõ˛•ÛÛÈJhèœQ£æ∆¶âL4f† ˛3!ò#…á—µÛø{D•Ûi<ûaTJÒ¥∑∫º∆z$R–ÏoËÖŒ¸ïƒLnmˇ›CÑ©´˛^∂üUŸÓ…@8j~:û¿∞Di∆(Ì˜_´∫πJÎ%2ﬁ›è`Ñ8-cæüQ.ÂX”Ú [ÄDﬂó›j¬?ÒÆ{Wpﬁû‚Åk^üå2,7XÌj-æ/	˛Tx!Ú€ú¯6$ΩÇ˙¡@QÃ¶Ù◊Â8∞Wlß˝)Ó_π≠#∂ø R[É…kÒ‘√hJ~Æ±¶§Æ¸/FG"Z°Q¬≠†c˜Vç‘æ¥åÎ
÷uey}]◊e~VÈû◊ù‹»-Ç ,÷€tI\∂º*®|IäaÒ◊$“x—X~?&wΩl ~eæfJRFÈOÙ#v.ﬂrU*¿∏ñÑKu¡èm! ﬁ‹Ií¯ÍE6W.áÀ€ÏõxåtŸÓ±q‚Ojƒ9¶XxAZ¿ï··ùº¥∫‰H'ÙÜÑø´‚Å7∞¬,Gã.uMq®v∆õ'µx÷÷ˆé»¥Æù¶jﬁ¥âô5çegf6QZ+‘H°;núå4Ec_
!ü†n•Ω¥ÎR‘C?ê“sÄ»…Ωl!À6∑Œ⁄∫˛6ØY¬Ä¬QÆˆŒGØòpÇä“¿«8€˙r‘˙«ßÒ’Œ8H≤ˆ∑º
B["dîœã´˚Ë€ 6+]∏‡`Ñûrwk]íÃ}Xî§hPGÖãr®P,≈A∫¿jÂH‰X2´˝Ö˛UÚ3˚7Åâ™¯Ú'}5iÌ1Ñ®$rÂ`Wsªt_Œh!ªﬂuûà°£BC„_≤√Ù‘„ À-≈÷ªú;ô˙}ı˝#£^#hÔÊ±˙vÑ¥6;ˇ»`÷At·Èùs§Äêf‰÷˛
 Æj,≤LçAÙz≈<)ıûR\˘‡;/)5}^4Í˝	K‰ÌÚÛôfVä-É€60ûÁ1˜i%˚´A[òAóÒVÃ\ı„xÃç†·–G>eÅ/Gg•z˚™≠Êv–E9“»ÙT#@Æ]sáEçBf
∫PQ)AZ÷%√≠ Éñù.Zg°GÆ∑√µ9([kk˚+˛ÉÄøüÖ”¶√ˆx‘∂nÔ»üàÜ 
CØÅ°≥mñç)áZ€o ä)Æ2…EòÖ®}¥˜Mg·Ê.qD–Nk˚ÒãÌ_gòi·¶‡ÖÁ+Ïâ_*Á¿¬m≈bzÊD(‘~J'p—eãëøÙbtò!NË][0ÇiÃ=ÎÓ˛ùÂYäR¿è÷Æiù∑~ŒIåîc©1ﬂÆ…˙boW–˝˝ê›LPu`ÉaÊ˙ŸÓÒaüÌƒò#¯Ä`ÇF‹˝ƒy jßÁâ7Ωá)¶6Ë2ò#fóËVËáIêâ,À|Bqêˆ+Üq˚HcÎû˜5yËÄåtñp)â¸]trå‚ÀòBúßøG÷j ∆C◊Htëƒ¸\¿√GxsèÓé¶∑dø"fØ˛ ó$ \Yîßãfñ?nc_∏⁄,O\ºÇ-´˜“|òîOYÈ™˜{vˇ∑==Î∏'ñD/ôj3§NÌNagµ—•Y#ã-”Oòª›üª/_r6B»∏÷måŒ>h¬-õﬁ˝ŸüçÎä≈òÍobLywóõ–bÅàéOm˛ Á{ôÌ¢S1¸ãÏˇÅ·
C:˙îN@ @ÂÎÒi”≥≤F&©M•ÿçT‡∆∞ﬁÅÿ¿‰i˚<êÒÚäﬂrt]£ã_ÿ€NzMy•ôÖéÀ
w3·tMW›/,Võ{Ó`,7RZ˘	IÇàyëÁmkƒkﬁ©⁄Â{ÀÑEt§“ ^˜ùWi@2‘z;Ÿ<dÜÃ‚ ©ÇÉ+ü1>ú÷WwŸE‡˘5á KÍN24sœÎøbl´≠mÖL≤ãüg¶ùÍ7AÚK
·∫_ `8¬˝≈åÜc˝˙·@âJ»∆jN«f6à˝õÍnnﬂÏΩ}µèÅf^úºyÕ˝(⁄ìÿoï˚S¿öL–ï¬çÙﬂAc˝–è¬ˆ-∞å¡’y„4Ë# nPèÿÄzÅÒUﬂÿº.•'äÆ0ñˆ(∆˛ö ∆#∆«¥õÃ¸|\„ºV≥EÇ™Ú·’†ãÔÙßYòºwn®ÜN//O¶Àﬁ—ZΩﬂ`èƒ+Ò¢Y€ÀÀÏÑ‘L@<ëñµæ!ó˘Çe3†jﬂÕ»06Úbˆ®ù –ïb≠,ú)BüW†@‘N˝QåW#ÏpÈH®{$¶ÿ«7ùf—nÂ≤Ù˘ö√Í–¬>SÔqx≈∑|‘˚=5â=(ºâx<C ë.ì@≤°∂Ø¡Æ‘án≠m§ë_˛ûK4P∑ÅÌªï˛ ze≠=ﬂàà#Ÿ∞˛K`±$≈•ıÆ«Ë∑£ëûY¡ˇn€Ô8$uŸá¸ÖªèˇÚ˝^zœºîß∑CÊPX2Mõ∑J∆z˙ZëõOa≤ ÉGÉv1Ñ˜ñútÇìnÊ¢C√hî˛Óî˛T|–GèêD¥“('˝Â÷|˙èÃ√ém“Ioﬁ¢¶«’\Á¯.6 '÷$B®ùn[ŒF•®^[…ﬂâ≤Qú°26æ
¸¶À‹$ (#é°—)hbx\«ùP;’¶ÃŸIuPÕº@\∑O|ˆ…uIı£_ÜÆg≠>&W≠¢ÁSiy(+±eòpìÇ#ùHJù¢ga-œ°ó`∂ÓiMf⁄Q†Ïû€3D®ü1Ï£ñhR*Çk‚¡=Xê¬∫M„Û¬≠nUl¬[8ooHœ˝o⁄Ò4´Â†•∑ı«hJD8ıöã5¥ÙS;YÛ.Î]c˝[–íˇêÖU+”åUU¢Æü{‚≈o;#öFtR¨jÉ˛s† qˇºSÃ*ÔÙ}ìNÎ¯”ávZ7Õ∂r=ïÓÃæÆ≈~5-EtCA&ç∑ôRò]ÑæD∂R∞â?ª<!ów°æI≥‹^Ÿæ†!WyÑŸ«Nü¯’ïÇM‡'víøÕWÆ.˝ïõ5£9Û∫0n^gW=tsY´"ØÕ¨∞ÎH>PB5L“÷ön%±ÁuÒ6wXwÙ]n≈çiüö ø0ˆ&h¿%´
´BÍP˙'ñØ‡ Ô…˝›∫à”“4Nó:U@ˆ¿L££≈O}M8K¶„¿‰˘´èg◊ÒóÑfb¥Op1XdÔôç'"◊å
˛?   ˇˇÏ]›r€∆æœSl<ôíöëDI¶lGï™™rõx∆Rÿ(v.<ô$Wj` P≤£—#¥7}Ä\vr’ÀŒÙ≤~°<B˜ú] `Å=KÅíöÒ^I$∏XÏÏûﬂÔ%π˜%∏˛W-l¿€ı€&œ¸Òû0¯aN:Î2ØN¸_ú¨ª±ù≥™ü1©!Ã©÷W>—Ï7Ïh»£ƒãÈ=rπ4Zj±Xè¢pºHBáﬁb πâ_‰›eºwÙ^¬H¶`˙—HÛË=çRr=≠£åpœaí0Ê1.tììı9Gë˙È£I?≤uÚ›fÅVg∑∆óŒ¶4∫/ïF¨¿úÃh.¶4gs⁄&¥<«UNo{ñ4Î¶q0À9xJdÄrë+π3í¢ô
≤’ﬂs,~«—*π:uı‘™ÃRË4òf+WRôKörì[KŸáån±§Ì~Ï%hœ,)Œë€O/ÅvÉ›Œ€ª¨œ´\5ò˝‰£◊¨å˜∞Wœ’Éö	Öa˘úã_^@2Í
úπ™DMiÊÍéúÅG'f∏ë!é&Ê äa©NQˇÊÔ¯hÅI&√≥kuÂBumºπ‚£•ΩπG#ŸQ¶âŒÓ⁄°+o˘Î–USh‘|<¯¿CÕGMÏä|∫ÂA‰èºÔ√uÎ Ì1âî˛ñ¸ª¬üã0$˜‡“]±◊Ärj_ÌZT˙1nÃ-HØp«ûM◊ñÇ°Z™(5B™Z'ÿÆÕ˝‡ºU(·xÀøı«…≈¡5¬'Y}—åUí√Æ…≠m)
Ã‡Ó`„qÒfª˙≥A^O6‹ôÏ…&M€Csw◊ñæ˜AO~ÊÆ'7#[PO_
∫E˝=Jœ#î£π–úu~ô
AbëB¶ï∫Ú\–ÎÍe„ÿ Ã3™ïK@Àãì„‰¿≤hI±K≠çæofÎSGàπäÚˇ,X :ú≤-ñZª⁄∑ªÊã5q“∏ ’‘¡
_/∞\Pú/»‡ +$}Óò	1µzÊ«Xœ¸ÑŒêi3P´@)u™…ØÜà—¬¶ãÉ¯÷?˜”s¯Y˜\ìÌG¡ïÈtà^Ã∫
	>G€j ÉIr—T	wµ†ZK[ÕfÚü|v/pbB·.‚Üxì0Ú ÀÃÁ){1Xó|”®G*ñæI÷oÖÔ|ƒ*>#8V√ ÿqÖ¶=Y1
X¬⁄˘Ò≠,iñ°GïÊsg∑jPúg®‚Dò#¬).3/CPìj{cˆ·?”ƒüâ?@…àŸàôj^Zm\ÀQ;õÊ˛òò≤ú√(«Â‹n{e,˙≈H¯xª%~∑~öù◊íR«´”$¶„j£πNªÿÅq˝MªáP„Mÿ$O=Éq„=™
j_˙≈`è¡ƒœoÿˇç˘•?rªô¯ºçXì/6qÌøOe29ºå¬l!îJ •qé_~˙«ﬂÙÅ8= =-[‹AÓ ¸•∫—°∞ hƒ@ol˜ÈtNÚ≥@˚ÂßøˇãÌ{.?aÏ"‚Á◊ﬂ_$…<ﬁÎıÆÆÆ6'a8ôr¿Ëâ7:>¸·‡≥Í¿Ûﬂ¨ø&7ﬂ”3ﬁ±I|ìÉG∫Wñ^Ä-Pú Á*ÇP<è"˙∑ﬁ¥5Å#ÇÑ$SQÔyZoNk»ÿk|&fﬁi%˜{û”çÆ;Ê{â¨$ÁnÁÊ:ˆŒ92W$›Í≤™"°£JV∆ΩìˆÂó{≥Y«°∏°	†°“úﬁŒ	sSAÓ?°íãÒ∂±ıò¯üäóÛeA˘bp&±8†ƒ9ÇIı†‡ÿ_Ÿ°8!ÔaN·æ˛(rî& æ√HœÄÁ<•◊™,w5'0	Á°/>é%Ha8=∆+ÎØ†Î≤.Héå˝x*L√ ÃîﬁF“¥Â'¨˘y2O‚Ô^CnÆ¢R>Aq–˜	—Ir&î≤£™Ma&~êÔΩ˜¢e[˘YhåLÚRRuGWÁ®≤Ø‹B~Ë˘7i+π´§_‰k˛√BºMÈ¶‹ç),lzÀﬂ"Ÿï0R”ﬁƒí‚#∆ƒ‘ü¥9‘∂g’ÎõªãJ¥¢£QÒﬁ(fÄJÌ€Æâ- $`õ~jªú§˚'ﬁ|‡©Mæ›D%`hñu ÂÅ0ó5eP
'O"Re∞ƒ¨ã¥ëeÀUæç“˝‹ìxeR∫ w+íÖ1/à!~–◊e0ªƒkI]&ûß^åZülππ≠*uk•]g´Í¥ı“òøC<£º˝≥v‹äub ä&‘x˛·ü!;9:ÜîËÃëﬁ¢ ›,ˆb"ü@J¥Ëm8ÖÑ[Pç·Ù€Œ•7íºÀ„P(:ﬁ%üHÏÁM6ß∏∫\Ú”…‚√œ3Ü	‘?≤.™D¿â:Œ≤≠3œ⁄∫8˝U›èÎñBM{Cœ6˘yZHez8ÿ”Kì£úŸ0íi5)∞„≠pßÀﬁJé˘AI¥å¢K?ˆá˛TâÜ¬†ÊY⁄œ<+ ]JzUÒØÒ1¢úÑco˙ï0üªIÑ»Ø‘Hãz˘ﬁ„/1üû´¸!»¯üû†∫40sÉ\¶ã∏à |4ˆGbh‚µO°òPÛ∏ìôπ!Ωÿîú.Ã_¨˜˜b¿&~)6#ô“µ∞‰-…t.6p,V	@NõÍ»}>L]ÁááÏi}dZu$≥á*©¨"ΩØÌ-[g~ §ƒõ∆ÿ ëo∆Û©üt;¨#a7x∂‡Õ÷wkõ"–Ìàœ„≈0NÑÒ0Èn≠≥ùµÕ$|By,Ñ≤€XO”⁄2luq”∏à≥ézﬁÙ<a;u?-+L¸èY8zªK±·è;∑≠˝Çêá“”xû£À~Å.˚∆ÎúpÅ¶ÔÛõùgp∆g,ƒY¯Æ&·y©Ç⁄‚yW>”
ëÖ˛ñ5áG_„√,'«ù/–ôÌVSvvY!´ ¶U6™\ñ“(}®∂πºuKï∑ü∞ºµÊêeÂÌ˝Æt=Äw*√©∆Q3ù,¯3;√∞ß5≈∆ûàc—rù"lÊÃBÎCëôÛ&ë7ÜÚ•ç$‹FÏ<
g≈37Ã˛}≤EÂ÷3ü—~Îx¶øinú¶ßY◊Ó:›§[K)3≈7∑	#)Â§õıR¯s“[ŒÙZ§D"Ñ‚Oj»+ª	 ≠„=8íêkTOô–Ï<¥™À?x„IØ”‚ÀÈì¡ì£Ÿwí«Ï=f—iIZV?…“≥),˛Œ≠í´døáE™xYPÚXJ›õ¶¨ﬁÈ†&Ks9¨`¶√á ˙»”CB|¢º√î$»zù8ª¶úOdNDD
V)DñI ¬*∑s™ÈÁ≈√“H–dÇU9ØXè˛:≈Z:ÌUfµ÷oÖ°+ˇ7`éfqk)Ør~ï¡?–˛ïŒ±f·ã≠C9ZL-v´j ÿ‡≠zºhÖº	—øÏVé\vâÄ6I¡òº Ï^’ÃS´6•éÿ˜ZMl^<b.Ê,•˜Î‚¯¥ZYü3\u©î™kã¨z∂˘#ˆO ≤Ô§ëæ=eÒ8Œ}(ã≥πø©nÔ;ëbATôgmA©Ú«ﬂÊkò˘`≤‰eJ „…Äàæ«>K5œfé5Ÿ‚EÃ‘~Uvâ9ö†j¸k6aµæPeVé<˚
&~2œîr¶)ì±©/”≤µ$«’ƒita¶r$m œüv
_©Q·¨»qº[?®à"Œí∑[í,Í™¥)bW“ØÔQ 3L9;R˜∞˝ß$€Ïõ»ã/v\D—°.ˇva?€µ;W]µís5É!0∂èÅì3«è!<rpÌó#&F/(à∫Ø∆HÇ{õC-J(é%SíÿôNÅ8)!˚öœC!≥Ä/dê„,8iPXY7f5¯*èY*˙&…ÂÃOäVJ%‚ãëΩ`Ñ$6c¢®ﬂvgKﬁ·wÁﬁè‚-¬4"ÊCÕK?
g’ï‰ã\1*B)ËÆ>F⁄¿	q·„úàÍQëˆèÔˆÿâ'ãù˘”K/„W¯’´4C€HÆxö_@&z¥ëLF6ÉQ˝û#Åö…∫Â±5∞PûjW,9∫ πbì,V"§Ïë].¶u{Áq˜…ZyÿÕúïß≈ã»É'≈ ÓõÖDÒUñ&Ÿ
#•ö‘v()OÛŒ⁄·§‹˝UqR≤Ó7a‚M›)?rS~‰¶lçõR„WDNâ'≥£≠äJÛÅ/Û°öB≤äÿ2‚iRÖE*	´¥óûx‘iiAX7'√\´g√\-ıd±Çæ!€ÍÓ2ÖÙWŸåEŸèÊÕ^+Õﬁ+YoøÓ™xπv/5Ô≠&c’ØA˝mª‰Ωd˘,µ6Æv‚~eæ¸Ö·j˝=ﬂÔ}À ºåE˚Eˆß∞ro~˚…'ˇ  ˇˇ áR ~