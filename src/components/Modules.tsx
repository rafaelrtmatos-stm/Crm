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

function deduplicateExtraCosts(costs: any[]): Array<{ id: string; description: string; amount: number; colaboradorId?: string; origemItemIndex?: number }> {
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
  });
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

  // Analise Detalhada (modal "Analise de Performance")
  // Permite selecionar Hoje, Semana, M√™s, Ano e Personalizado com navega√ß√£o dia a dia, semana a semana, m√™s a m√™s, ano a ano ou intervalo livre.
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
      const dayOfWeek = baseRefDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = S√°bado
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

      // Custo: notas criadas dentro do per√≠odo ou comiss√£o lan√ßada no per√≠odo
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

    // Extrato de caixa: cada RECEBIMENTO individual no per√≠odo selecionado
    const extratoRecebimentos = realSales
      .filter(o => o.status !== 'canceled')
      .flatMap(o => getRevenueEventsForSale(o).map(ev => ({ ...ev, saleId: o.id, customerName: o.customerName || 'Cliente de Balc√£o' })))
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
            {/* Seletor de periodo e navega√ß√£o temporal */}
            <div className="flex flex-col gap-2.5 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
               <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
                     {[
                       { id: 'hoje', label: 'Hoje / Dia' },
                       { id: 'semana', label: 'Semana' },
                       { id: 'mes', label: 'M√™s' },
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

                  {/* Informa√ß√£o do intervalo ativo */}
                  <div className="text-[10px] font-bold text-primary-300 flex items-center gap-1.5 bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20">
                     <Calendar size={13} className="text-primary-400" />
                     <span>
                        {safeFormat(analiseDetalhada.inicioPeriodo, 'dd/MM/yyyy')} {analisePeriodo !== 'hoje' && ` at√© ${safeFormat(analiseDetalhada.fimPeriodo, 'dd/MM/yyyy')}`}
                     </span>
                     <span className="text-[9px] text-white/40 ml-1">({analiseDetalhada.diasNoPeriodo} {analiseDetalhada.diasNoPeriodo === 1 ? 'dia' : 'dias'})</span>
                  </div>
               </div>

               {/* Controles para alterar dia/semana/m√™s/ano ou digitar intervalo */}
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
                             title="Pr√≥ximo dia"
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
                             title="Pr√≥xima semana"
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
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Mudar M√™s:</span>
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                           <button
                             type="button"
                             onClick={() => {
                               const cur = new Date(`${analiseSelectedDate}T12:00:00`);
                               cur.setMonth(cur.getMonth() - 1);
                               setAnaliseSelectedDate(format(cur, 'yyyy-MM-dd'));
                             }}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="M√™s anterior"
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
                             title="Pr√≥ximo m√™s"
                           >
                              <ChevronRight size={14} />
                           </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAnaliseSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                          className="px-2.5 py-1 text-[9px] font-black uppercase bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                        >
                           Este M√™s
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
                             title="Pr√≥ximo ano"
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
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">At√©:</span>
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
                              √öltimos 7d
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
                              √öltimos 30d
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
        xúÏΩ[s‹Fñ0¯>ø"]„iVu≥äW…2MQAQî≠XI‰ê¥∫w4
,Ä,¥´Ä2Ä‚≈4#6b6ˆivü6ˆagÁ¡—_DGlÏƒºÏ„ÍüÃ/ŸsNfôâL ´H…Ó¬´P@^Nû<yÓá±”`$√hãgY%≈Q4	‚$NŒóˇÅïW>E·lÖœ”lãÖ—8æà≤ÎgA±ü~b…l<Vüf¸Ó[Ï$ûDyL¶É$ΩÏˆ án{_ïüáiíß„h0NœªKYM†veÒáüSveAñ 7nÈÔ-≈pƒ∫QñıÿÕ?Ëm¡Õ4Î.Ì√§,∆A∆.¢$∂ññæ√õª˝˙ü±núY„„`UMaxÔDplY7≈À∑Ò_˙geÖÌÜÒ0NìÄº'ñECòÃ0ãalúÉÒ ±Ó,X ‚p%¬4áÁÇ8gqÇ_¬÷$¶=Ÿ,4q˝à0ÅˆX§sòJ¿ä‡4,Ü„,Xf?Ã"v°#Ë#@Hú•Ÿ$Ç~Fq^§Y<LqeÚaDè£Ç%ÈEG˙*òF0∆-ÜSßi≤«å&˙Uû$è2XVz°èŸº8	¶tÁñ\K.aªcÇs˛Ó∫;Õ¢ˆxáΩ5\fÉ¡ }Wæé´\¿Ã‹ﬂ§å†œ$∫dàè›Ú°ÍÁt˜M:ÀÚÓÍ2ˇUè¡‘ óÕæ%*˜ÿŒc•…j˛4ö…IÛÕ„VA"XËoÛ
uÜÈÑ0ÑÌÔæ,qÜ
ÿL˜	ùXM¶idq :∞^Ô°ãNoÜœ…fòc@¿ô!º|≈v3E\œtU vÂ≥aîÁ–Gtµ≈&≥∞lø¶€-†Ö;∆£@6Z íæ2@ÂåÕ&8$ƒ@_tkaì@% √·Æˇ‡¿^yÒ<NÇq¸cÚ}e¬K@	~ëœÜ8∂W ·Ò¡4J∫E6ã‘Ék‹Z’0ÿ\>!«|¡≥@6≤ÇùŒ
ˆ}MÅÍ˙M 8∞YX1"(`WlÇM…ˆ‡ùÓ€wUèœ“ÀDÙŸ]≠n”LNÂ/ÇaÂ›••Í«cÖàÍ? ˆ<ãÛa:Kä7¡xaìÊ/íÈ¨†◊‰/{Y∆≈Ót:é£∞EÜìC€Oä,ÜQ–O∑_!©„[Ámúø@ƒ)Ä™ÃÛeG„Ó;ÿY≥<:.psT Âç¢Êœ„qDc;äŒ‡È£(xænsÚÍ%˝∂?ép<;]<*z4‹wü≈˘Qté»í·¢…MïE≈,KXWÏíÌ0æ`√qêÁØÉIÙ∏3Íø‘v◊VW/F˝GY4ÈΩcg„Ëä≈∞Ú˛il∆˛+ü]ÀØAO`˝8DÈÔèi:Åø˝/∞pñ–Ó˛É’’ŒNπµ∑ø∆naıCu ì‡™ŸüÑÏ≤Ûa”˛⁄*là´BˆïOÉa‘øÓ?Tö™œ„≤øæ F¯œÈy?òúFˆæ≤.⁄*Ô∞÷?å¬˛€çıÈï«T'W˝`V§lrjå ∆∞;rºg√1†:læ«7õ´∑lEÁ
Tª1ZW«M£[ø√ñIä˛i:˘Ä/G0(Vd¡{@†˛e¬—œf”iîÉ<ÍÏÏÒU¿ûG√úz€+£uµì¿ôÏ… Œw√	¨Õìr˘≈Ùy¿çimL4ÄïMø|“Ÿ˘?√¡Ä€˘√ø!âN3 yp“@Äú§„yö|FZ∆¡`{eZÎÚÈ¨(“D_C¬ÄQmì˜:>Ô∞4Ÿ«√Ôﬂt{x–∆RÒúSØ€ù]á Ó9êÒÌﬁÉ±f⁄ÍÙÿñ	HÏBø09ÄÇÜLPºi
‘YÀ Ü2Ñá€l
~˛Ô©Z&òz∑’ﬁY)7è|B¡,Ní*ä4Ç√dΩ
8jéØì!êí «øÜ7 Y wø‘#†»Æ5∞`7p∞¿œQ¬Ÿ √M^q$~úFŒ≤t“]‚œ,ıÄMGC†±øÖœ1–n‡s#8¸ﬂ∞åÇr©ùÇÖÅÜªJG¿√Q1 .®´pBÂªÚ≠Aî∂€æ‡î¶X2!ß
◊18è
‰°
˝Íâ¿˙Dw%;5f ¨yVú=Æ≠,Tıs#•3@Â¸Œ‚1 |xÔHõﬁ0´™£?¢éÂ!≤+Ú Òèƒ¬Ñà™E ÚBäL∆4KC w9pƒ@2'FÄ"D ô#dÆ«=+r»õ—C>e q«›•6`«`ÎêK	[1Sëp<∆6ÜEﬁÌj}*ò“ùn¡uMò–≠xÀ8Ña‚∞Ø∞Cºá´ªCÿ«xˇb≥KK’oS`˝·«◊3<P∫”¬ˇ=›Ï·£´’ìÄ+√Ôï'ÖH¯ûÓõœí∏8πûR∑¯ô=~¸ò-M÷óÄv”˝á®àÅ?,˙π˙bºÕ_éä,≈üñe&E<M_¿™‚K¯˘=ûÇ4]VÂŸqêù√°~îéS|\|}ü¡wË£ú¢zI+û¥gqÖ*lÅçJ«¡>ÄFÕ¡ÃoΩè¯=ˆåû¯£Íµ@–ÏPÃ	Äææü–wu Í}Î n{ û¿≠Ù7N%µ»ù?üH'√,M`Ke∫Dùå“K‚∫KØëÙü•1pà˛˘"´/≤ O≠{eÒÆ(Ïí<£+xØŸoA.V\içê´¨˙≠¡®ÚcÅs•oJ~≥:`58«πOûG˚@Üã:€©!ºŸ3ﬁH4 ∫ÙIUî?º]}W…ªü·Õû`FQ√`ëõœ°”ŸŸ	”ú¥`ì·ÉÎßÙC◊†«Yzâß	úµyƒõˇ√8øÍÚV4ëüÄ§^åhÎ¨j©≤ÄQ2öM§TyÒ·ﬂ∆1¸ç¬`◊`Ñ∆¿Él7`{ir√9ü£⁄ $†hLvòég»= ∂¯7¯T°Hç”†$%Z9©ip=NÉÊEÉFjódNJaÔ9uÀÚ∆kç ”ã?”Ö.§p‡}˙P›AJ{?Â≤˛VRõAÃƒCÔÅÙå“üw^—ïD¬IDc‡ü™_@ÙÓf’π{¸Fj¬ÄÉ†Iïø›¬FøπÌ)[\«µsé[–gËˆÖ±∑Ô‰É®ø·L«kúkVı6Nëã?≠Øñ?¢ú€≈ócz˛lÀ¯Ñ˜~˜∏z_≈,¡6 {ûÚ˜Ë{7^∆ï˜æ2^ªaDÉ<81Æ5ÍRªJ3¥-©uLLÉåú^ìì©Té,:£ΩG∞(wKœ¯´z„∆Ë∑—˝˘Êë)Ï_5ŸNO[Ó¡tñè∫ﬂ}~?¥}A]é
E¯A–[∫›bÙµ2òÄòúG∑ﬂ]—¨≠©èT,˚≠±qî⁄ÿ¡Ÿqë∂“”-Ô∂õ˜XLD3†/ÉM˛5˘¸∆“∞Ú¬Îˇ„ÆO0©ﬁÕ∑jÔqÃntmµ7¯c'›•Mñz∑÷Êa‹ ®?aﬂ˝kõïElÇjW˚£}xÙˆ;‰Añà÷phŒ©ìZOËŸ>Sö≠ﬂÇl9√E”B±ùªœÒÔ,Á∏|ëﬁz"à–; üC«£hái«inãÍ©Œ1©Æ/ífœ¢Kíø!É4Cb≥¥d≤öû®Æ%"…´˛®ˇˆ¡Íj©:¡˙p§°⁄%£NËÀ’’ïïûÂ
òTQ\íñ„î8}ÒGH÷ÄFÈEîùç·ôQÜQb”/r“á>RÖ~üèäæC’t‡:ù§öﬂ¸FqZ ^5T7ÿÍ]‚Ì_ÑÄ8,Åˇ(FÒ¥xz˝"¥<ÙÂm°õÉıΩΩUz¨@z3Lt≈CÁ,æäB8}ß˝M∆ß∑…~ÏøÖ”Êù¶”jk 4WçÉ·˜RA¡¶W öÈu£\Öu}¯ÍpÂ›◊ïbÁ¡Z„∫∫JaçqÖa>Ÿ‚øÂìŒ≤6≠§Ädt A^ÔO”ò·Úoïs‹Ñ9_D[9tÖ≥DEXí«¥“∞[:@J:ª¶DS˜lÁ”@S1∫Æuv)i˝ˆ
>≠ΩS> ‘ˆﬁ(∫ Æ˝WI(˛÷ﬁ™˝‰#‡2æÔØvÿ Œ≠6¢SÆˆ™p/»îNA∏ùÁÑ”]'R›÷tT⁄÷„‘ÔÀ-G˙QÇ&≈»∫kQ|g˚ ‘Vv∂WNuö¶⁄,W‡fÂ∑Ï$8eØÉãòœÉ˝vE˛h“ïäÑ\f¡á∆I¬T#V¡ü¡¬>˙J‡ÜòÃiçêX5πßQqU©Ê¶QÑ⁄Ä†£jLºoé7D /Üµñ'[Úi_4EÒÕ[mG‹êÇ≥5p∆å—ÚﬂO¢lÇG{#~à·∏ÿb«£t:ÖÉ‡ipŒnómïI•1‘T}¯≤R˛ÜÌ¬¶*ÄÉíM
5ñ£9!Ñ+ç	Qù≠∞C©ΩëM=MØÕ†’û…ïv§∫z˝˜ÄÅpF€[@]
ZŸáü´ªº<Ëéß Ñ˘(^‹ﬁó—Ù÷ˆî{U['∞q\¿πégpÄ´çÏ„ΩïVN≤ ≠ª¬Nm’-ﬁ¿∑ æú©Ñ„ù©·‘πjbÊß·≈´(ôë‹y.ÖÌJí·ó0˜ÜWª(s®oÄ‡ûÑ/‡∏∏ÍN∞á… I‡Cœ— SÔVNÎ≠ê%úFø√ˆ⁄ õ§ØÆoïè≠Y´µ÷7û∑©≈>ıØÒÛ=©z-Ä®’‡æ≤¬≈¸sv>NOa˜Ü¬(¿∫¸>'hªnAƒ^9Œ‡±ÿï‹<r¯ÏMØ6nc%ı>%ÙágÁV‡páq◊!œª¡ Êü¡ﬂ¡Eú«ßïéÜ+‡ÙónÕ©"ÕÇ√òÁiŒpúFlñœ»êÂS`yœêu9`@ËÇÕ
L*+faZü˚g∫Ì
∆«o¿πü^F·ax«KN„∆å˚ %¬vÑ1t≈ºõ&$~A•ì±Ê®Wnÿá¯)h Û˚Ë˙ÒÔ÷¯©nø⁄%ﬁ+Üà PÃ7ã∏GºY"ÊÔÃ$^ùV”¶v¥…C/Nbt€Aíü¿W˝ıqì¸Î5¿íØúÑxS~üsÙÌó$Tåii∑¨,ögû&[öç338=F';7')»âW ™‡;≤ô¿NL3`t≥Îﬂ_;|≈πI›“Wr§íQX*∫’1a,^ÕÿIÉÇm+Y™G:∑8ŸÇè 7∂µ±©µ!òlùéS ySK&W\Ω'„8âÄ?Æ∞Œ¬≥:3 –Ãïö’ªô›™	à`^Õæ˘ ˝e=ı	„< Ú>æâ•Æ\@Ï∂\P≥Ò·Ä>äíû¨∑(„À«E˙}á"¥ìj±ª4-˙Oèñz\„qlj¯óÙ~wq˚æÏ?b#¯_ŸÇB∆66R	Psˇî[F¢º…Z+;dcïˆåﬂ√∫@M¸I»ªåø*‡^˙˛“vóÅâG—YÂ£ΩKπ-6nòVÑ3£#Eﬂ∏ÍNØÊ≠Q«ÎõÆ~ ˝Ùì~ !9áÛ¯IuÚ,@ 4èˆÄîæ
Kpi B€é√ÂÅ´ÉÏÁEá\BÑ'ÑI¶∑ûfôÓøÓÄ£æËtW˙È8µô∞æLœfÖ≤ˆ+î A®ƒóVY’]ìêó®ÍVÑ√Qø¶ÃR(ÿç~R	–D√;Í=$C	ZëN—ÿ∂¬ˆstBÈ&†‹˜E:±Cäêá«ÏwÄÄpî*Ú∑}f¿â∆9™ı˛È]	vv3É?0O˛3wÇ≥^√O¸QDä∑ˇxù}9‹0uÇ@◊êëXg”S¯á‰˘á¿u¡`®i˝L©Z ¥c.:◊1§Sˆ‹úúkÂÃ∆5‘ØÎP`¿úﬂ¡ÅõÍÜÍ…5ÀË\#®üsR•±nm€Q≈Å„´÷AüÉÂÿohÛa#+·›r›wÍÌC‰ëÀ£ok´Ìå·€5˘JygÓtvéÇ≥ÄÌfEN¯-ë›‚ZFc1˝Ó\öÁ“L[AÊ7]>π\]]ÎÔæ<¸f◊1!∏n–€V1’œmÄ÷≥Eª Éf8éÇ˝rk{IΩZWa˙—çQôky |±J˙«íÏØ)¨∂z®¬ä´»r·C=å#√æî‚]æ™∫∂”<µKß/„…îéSNL›Ø8M,ÜP	Ò˝ˆÖ}ªwñ≠Éÿ⁄ñC∏ Ö†J6A@k“r‘*Wç_·Ôÿ∂©~ó'˚pOÉ$âºhøêW9Úl√à#÷¶a≤RE¶≠[≠TÍﬂ‡?\ûb%˙¬ßuÊ¶˜Ê–•≤Y⁄,t»[§*u⁄Æ¶òÉÑ∏ˆπõÜWÔhÑŒ<i7·¸‰K
ºÃk¯‡¶~à πÈ‹ﬂNô◊˘<æ–fıàèÿ¥¶I±DP.UJY3π`ı«Nƒ∏Êdu∞.±´ˆ¸zÂ√-÷?˙‹2[ê6ü£ï∞ªﬁd—FuóKÀliy…∫Ω*¥Ï›Ü∑iZxƒG˙)ÃUBú>[¡]˛≤0¨˜≤Çi•
ºµâ~zx;Ÿ¸m¥VÉ'˙…î‡‹∏"πÑ>oñ!äe∏‘}ÈZ8 i[0¢&4¬CêC@ëgÿ"¿Ÿ^≠}Lnm›Æ7Rl·ääÎ)JDÙê˚¨∑IËj|ë[ÂFïÆruî£k√•é’è.~ÃÿâD‘Ω¯)ìâ€—¢óU.+·nŸù\%âÍ√ Ü≠“d%XF(tÛI≈S™O.çº\™~ÎKS#¨ÓßG’¿4Œ@ÍósˇûEr£AÚ·g`Gπ7Q¡z«Ëwö¿ût¥‹p‹J†Ä`)◊4›ô˝¥}¢*À+›9ü;¨Rß¶É—z$∫Ël˙;<˛ê∆|>ÔÈG ÷g,KV≠u5àfNu˚iûGöÜ‰\%û âuOR‡óç-©mWπ#…ã™ôuë^Æ=⁄@ôUÒVQ€¥Ü— ËO¡ !…óúdö ‡O©Ìwë_Á<÷§¬àQø®µ:|ˆm§ Xº;…Q∆*ÿÀ8/zæZEÎ6‡'&ª‹π_¿ﬁ¿ÜY:E~!√Ì®z¶yÛ˘”RåÄÂ‘µ\¶Kl¸EîµC¶·≠ç¬0EÜ”≠íkÊ¡ÂÉ]µ˚ø@'<æ¬]{Õ€±Õ%v√#]¡†tåäe%6qà¢∞9π$˜“&cı=¥Z•lCOUöÙÌjÃ+"ô–ñ WÅ~Ú´sqôU√∑Ó°5‹‰öOi 9Öç1åı∂é˘™ËŒ"ú~Ÿ¨_‘ë”âƒN+îÂ/„ã,jîBm√x‘§	SÅvh·EπN^¥ùùcåÉãÒIÛ*¸.¡ÄQƒ‚‡4àØDƒh rbdËØ<A%Lm°µrú.¶∫ıZΩ”LdKRwÕÌ‹•æü≥t<>EæΩ@ ?Â>kòÍ C†°ô[ç¡‰n£¯=‹'ÀËãcqu2.·â/œNI0aèÈÎ »¢ ˆ+}¶=ˆ[ÂÒ˘áYê ou ©?(4}g¥À∞w]YÚÅi›ö**)¿V¸É‘~ñåßCUeÏÁSìÇ«ΩÃç'Pkã^çñ∆})≠˘©∏Ã~Ï«ós⁄`ûkB·¨(öØL/>Rÿ¥¢˘}≥Tj…t-h˝∫—pÌˆ -
ÌŸÖãñvÊ¢øÂ˚“ ø\—¿∆QVÓ@∫^¬dLBC{3⁄|ö®ºµ˘0^"Gs´˛ÀÏÀ;C÷xhòÁ’][F{£R»ÔX˜ÛÍF≥ò≈&ˇﬂˇ”°<ÛLP7k÷,”Bﬂ˛•‡·2Ïó<JÎœ¯Ë/Õ	,¥~äÚbﬁ%ì¢¨–M÷g±∏r“ú⁄˝ØMì”Ú‹G8[6*OÜ…XàD„FÆy˛Ó4À¢„ÑÜ£É?Ëñ-Á ¿Ì&]„2ï≥i˝¢ú˝œ≈5zG/£gÙ<»¢•kŸÄyçË_ √eˇå0|âOûπ‘eÊπl=ª€¸ìjÜ„öì¶…Õa¸5.°}{√—9ã˝_ùgœ˜˝è≠FÌïÂÖE&`Åf»ÙŸ1òñyÿˆq˘/èÛ·«GÂ›jEÇèÉ ø˚8®Ï}Z∞π1¨n–98ÕQ+…#YRÂ)Ç „Äq¬x<ANı∆=›‚”)O<CîE¶pƒÁÊ:/sn&IÒÇ¥‘∆Û–I‰3ç¸¶éM“!üÙ¥@ëåèÁ∞
Så˘SÜW<ÛHKYÌ˛3ÌØﬂ≈á¶jªD„OÄõ~ˆ	À¢	¨1‚®4ôtI{≤E°Àµ˚b´?	òØ˝[∂Nøcr€5◊„˘v∆˝ã*"º¿>˙#ZΩ ™G#ï [aËídlöE~N;~}˙oå&‡Ç{ÕhÚóŸevÆ«_a\wîêZ†ÕG∫Ë·j© ÊS\H—NÍ.ÔA®ì¨ÿ' EúÍ<œ“	Ât]ê≤4ÏIπu-D#0≤C‚Xì€Ô≈G8ŒtóÕ˚ÿ[zã˜Ωµ<ıÌΩ∫±≥U?˝d29ñ¿kß1f;Òò/%A¥Xa•(”ü˛¬.†ieÚ.ç‡T Ê∏PR&E£>ΩvGö<Oá≥‹≈ä˙n2¢£tFô…∏EòPö≤˝QvÍaö-c:ÎSn(]ñ% …”{ò	€£œz.◊	FÄå˙’&Ü*Ñﬂ^WRÛ¢ŒMNô ∞Í)S›2h…Çr+ùhFÊ~¸ñ÷˘¶œëﬂ∫ïZó•}W‘¢¥´Îvnó¡˙~’OSÿˇ∂;Éy÷œ‡öiQπ$nÈ9¬oÓQ„é÷zΩ—®^O8ç˘¶u◊Cäó∂ÌÈlú∑ò∂ò'åt„‚∂Cg=kˆ ”áeÜnÙÉj6mÊº¸$ÎRı1Bã2⁄‰˚	‰v?Àk˜‹;IFÈ÷^AÁ&∫∞<MRJ∏úD&rUÒ É˝◊ˇø!M√l&”=Dr˙%#ó(˜ÎÚπz‚uÁx}Â'ßc´åÄY´G¯ˆWMOL#KRÉTe†0_&Oó˜æX-„~µÆ”\'6∏Vµ…ﬂﬂ6ÃÌß∆áñ¸œ änúùi˜›πI%Í±ﬂ:;ç(ò≥ÉDA)¯zvvGóƒ˚ﬂç7xn^”üF—¥ûmÍÜâÃX0ëˇ˙_˛ovâBﬂ(∏0b:¸ﬂX:ªàg,eßÒ4bpæPê‡"ŒÅ•‡…N1·;õ%‰ƒíÑÈgKòŸª≈y8•ªUí#Î’21`ïí_5”Ü3¿Ï9úgòzïÜ¿cÔ±0√ÂËaåï609I∆+nî{3\;A®û{÷çYH€J‘=GÎ[x><úwGq‡,ÑÇ7KØ”3π{∞ƒ‚Ñ]bëùK‰Œ’üSûô¥∆.ùY*¢∞Ë¨˜ﬁ&â˙yÊWX^œxÔ∫Df]uôÉTõOπœã√rZ›>/J·CÕ©”ØÁÒ1/5’∞ ∞ÏˇQ¢†$∏àŒ…çñüEA˛/tÄ~cÅ 4∞;·Ù¿™F,¿oX2	vÒ$•dô‰M∆(=6z‰¬õ3@®t®óÑ≤_ñåØ˛S ©#¡–i,£ÆÏ∞<>a‘Ä˛˘2f1√‘»Cô:…2˚ï∑ODÀÖüPx(·¡«⁄'Â˛’Mg*
é^ ◊äóCÂe§ƒ:4,C6{W±ì/VWÕÃä"XÍ£“ûfÂ»._◊&Ã^Kò9…√Ωó≤Zy'Y2y~ﬂ›8†CíïGAô|f•ãJØùùÁAÉ$uÜ≈≥Z,Øé·‘Ùû< ¨≥É
…≥™™¯%s‹Ë˘m∞N·lÚ<(	 ≥¯<.Ú-∂æåNÆ÷_PémÚ¸“¨Âñv•€˝	˜¢USh<ã3™ﬁ•f–(«e¶√÷‹fB∏Ö˙·^ô-É‘•Ÿ»#"^,%hL∏!>ãÙ¸€Xó≠◊´Vπ sjÿseGA6a*»·\¢ΩÃŸ°ÑJV:<“7ö]≠xÕ!t‘ˇíﬂ◊ú≤¯b˘xv√P‘±&‚Q*2¥6P1[¯ﬂ?œ‡éË¬'ÚØ<Eˆ(/êH◊§ä“_rwÖµµ ◊©ƒ2Å,•jF põ´ÜP˜PQº’¬ÀÛ£Îyzd‘ùô≥∑ÕÛa°d˚p<ÀuÓÉÖîÍñÜCöö[‰pbZÚv]¯åîneˆ≠»Äsı˝“c_î1K“ [ø…ˇÌ⁄2íÒçe∂πÃº#∑¸ÍÈç	µoë+Òá€Êá,ö#*ÖËÔÛCã™u.´µ$·Õ)ØÚR®ÆΩu.tÂ’4H:¯°5QaãŸ∫äªlÏπbÕömX¨&üÙv€Qon’µw<∏˚‹œã£Oy%8Õ”Òå\œœ
 m	Kü7(˚˙⁄ :„≤	≤◊tCı.IïÇ—ôâ¨QN,6®úÜÁ\õö•â6æ“’-K¿£}ãÂpî]'ºmLÒ∆O‹;õ1o˛ÆQ®è`À˙õ2“öj»Å˝dıuo∞Á ‡ô€í£m ˝à™"]`—åeOø=ﬁ€=bﬂ≤ß/wè‹∂/Î“ªQ◊=·åhú6Dg‹LE4ôûxäË¡+ôÈ»PÒAŸTÈï√¿ˆV≠ õ" Àm†æN^À˘dîµ—n^§aö[AQw,w˘QñªÉWáª{'ÏË‡Ÿ∑˜Âã„üzÁ(5âÁv‡ö≠€c⁄∏˝∂Ôqmÿ≠5æ4Ë*MßÆh	≥œ¡ﬁaxííÉáxøÒ,i4≤Q0ºLø§•f¬O-‹¶p¸†7{
3&ﬁá—íD4ëÕπ≤‹ËvÈË’≤ÒM∑£GD¿å(¢wÆ, ùùre)˛…#†√”Jˆ{ØÿøÜêr+}€Pù´x øjz•¥π&®`yÏ`ı’r≤Xü—ﬂÛ|Ó!AÂ˚ÄHÂ÷PGœŒ€Ì˛O‹Õ˛]µcAFªúÍMÈ»ƒ’E$:€Ï¿∂ f^ˆíâÆÙ¨–£’øﬁXQ"}©—™˚™\æ∫°|©Y#?6ñ4˛Ï‡	Ô8NismJµÉí„°¶+≤;ÜêÚJ®ç6¨÷˚kx=P†±˚ÛdUiü∏iìK¸Ï˙¶ìw*KãPﬁë˝0∆ÑMë;∑Éáu HC~DA·‘¸Iz ªk87Î«À®t)Qq‘•◊yXOpØ’~™xı∑ÎèÍ’ª⁄ h°neÊ|˘…p®mÆÕ:OÓõ©QÖ3wP`€∆›6k…ÿã;˘˚m:\oÃ›Ô—¨ı,St@%= /†#√õÉó' ÌÏ∞É£ˇ”Ó´˝◊'seo·j#^9^3ÊJk»¶5y«€MûB#_ê4¶‹3Ë8?aôazÜ4KÇ63Iãèm1Y@Ë”–YöhQí1À¶„»N1¯O%¡‡ˇ'$Â–tZ¡oˇÖëä¯<AcYtOÑ¬hÓWI&ˆ^üÌ˛ùH‘ÆÜ¥:>™Ò™BI-ÎT0ù∫Z˝R§zOT√m˜J·ˆ-QÍŸ»ly/>#ÿÅµˇvdRtó®6*ÏÑ67KHúªK\´‚˜˙ã\k¿{éãπê¸≠Ò{ª∑˜ÜÚﬁy\yˇµ“˙÷í	ÛPzK“¥_ù˛‚ıÓÀˇ§˛Õ˛Îgªøv¢˛"„ô—∞f*˜ââÿ¿i…˘'Ü~œ	Îom+´MóüÕ¢0U=œZaªeÓI¢˜£R®~Ë•◊”∞∑∫πÿãﬂÿ;®
*>W€wõÓ‚≠””~]fﬂ∂+(FÎu|Ø≤_Ø[≤_s>∑Ltm(¥*õ'4d[÷R5«¢P¬é≤…≠Y)÷˙5eÛ±Ç◊˝føae—Tãéf¥nåSø'adA˜M∂ñÏ0ú“úz‡›!¶pMƒÜì˛ßË“≤åIüëΩ
£ã(L≥-·úö≥‡gèYÊU”⁄’Q˜S˘@ÿi≥ËÏÒMΩp˙≠p;>É{8ùÜ—¥x‹\çÛ´e¸∑S'l≈jÀ;^Õ˝MŸ∏‹“¢Z∫Œ(o£P2“‹|ñ“ˇÚ2ıIòûXVΩ?I<ôÂÈ¯epôÓÛOC|∞k•ùø\ı1ï1—
êô·.≠LKù#±“Öoß„4J“ôã£ñ¶„·bfm:—≤ÛÃr#êp4€ø2ñ⁄∆]+]U®˚@˙.∑hF!fªœı˚´XlœÖ}ñ^&∆“ŒµJ7R˛:¶rÚ˘ €iJH∑mÁN∂ü6)óhp¿î∫¯Áã ãÉ(YSX€Ï⁄ı‰‚!âdÎENc·\=⁄∞ìÙ¸|qØØ›q≠¯-øúx+îëΩ≤·ØîµüPy@¿Ÿ	:5 â¸N&Ëï71[bC3∑ΩÔÏÉ›^y⁄¿nﬁmAı\ııLR ÕÕ∫‰x«ï%«tøU}:ˇ*»æﬂÕÉz≠d~πı_`8Rvúß¨k]Ê€ﬁ/}U|∑ã∆ø$Ù©0È|ÄE5‡˛†^®=Bh£ù`>`ÔÛ\?—=œÉ_‘u$7í. ;õ∫U·”¢ˆ3 TIûÊW√Ò,ŒXIÈâ ﬂ‡∑-Bçeö#òe˜î˙ˇ]dÈñÿ§Ë¯ìî√î=ã¯æ/ƒ1|Éj{Ö¥T¸◊€’¡Í˙;+ˆ@S9rQKä\¬ªîŒ‚zº‘M˜mù7bq"	ï¥YZfT~æ√¸0JÏkqK†o1)xﬂ÷ÆE3\Hy∆Å⁄ñ
ù≤1U#ÁnP
∂ÔáF•—àÀÜåeT‘€|«‡im∫∞RÍàÒ´—ﬂW≤øú¬∞æ]	 ·Ì;Ó*Ëptã‰HÅÌ≤@Ío‚ËÚ$8Ì‚ã-Ãø”_jØ CËSú +ÿäNY‘”¢¿Œ/˘∂Æñtqh›ÂKtëè0õ´—íîTvè˛ë	b-≠ﬁ¸RÖé˛”6ezÂÌÔé◊kQ≠Xµ‰ñe±“&4†Q≥4;†ÚY\qíéÈo‰"fOÉåqpÛz
§{ãF˘3 j∞	Ä‹$"LÙ7U1!~„'Ai„A1À…Iô“¿:õ†ßr2Ú$y•ñ»Êπ=\<®”=òÛ◊Ÿlö≤5e¢u'gW†ÉFX9Æ∆¯˜QSÏùWDs‰Éƒ≈NãÿÎ ¿%¢ƒ¶9v=Tö≥àß®®hé5ÏÅ'èOÏÒdU/¬Á‹ÎöÚF8FËˇ≥áüø)ª,MwÜŒBQhP|ƒ4Î¡)ñ°lme\¢≠çˆ$V
i¶VÑàX’U#Dñóv∆◊Bd,Xq„Ë›•hpõ©•0©·«““¬8añ|>#‚¢§A≥≥¢∂mE1‚∏ çª™Æ®™0¡÷óÉ´ˇCõó©[ÂbC[àZW2´[©è+)¬MıêÓe˛úÜX√(À”D‘áÛ†ÇŒÚü‘œEì∏b˜Ÿ`≠S¨g¶πl¶YUå÷7˙k&’r´Ì;œ¨£—eØ≈®Jt ≤∏Îc§ı/Ê¢/p¸@ËPP¶Ì@∞¶y«Î™Ê£≥˛‰≤◊ﬁ€ûX˝ÈZV$ùc˝vaM+x”5∂ ∆€kuF”/H»ÀMcêr±t◊ã~Oïi%€S≥ÜÆOßJ›aF(˝µíÓı≠fv|aÚçû8‹âFN˘Ù8Õ
j&ë∑º¡],0œˆ™˚¸ª%n4lÎõñv^qŒ0ÀL
s≈ì(ŒRjö~¬*hı.˘•-f€KLîK‚%H∂@h{7À“K4û˝§Ó◊~”d	L·Gœ|;u<·/{∂©¥PfÑZ>≈ºÑ#ú’Ô·¶Ææ¢€\ßÉyq(âé¢%z%ÔÂ•zËep4˚Î,mj'•Ω$Õ&öNÏµº!X<èEs#¥´¥ÒR|cÅoˆxÚáw¸i≥£;©ò.*&º’L‰«âo£∆,HÏ∂fºƒFΩp)*¯Âô»‰∞øæPìB¥G7≤õ∏3AåÙÈ—NπòSyT©∂<4F.∫ò.5˘ˆÖ¶,rµ59÷Ÿ—¨Nu˝<€ÿíJ#ê=yŒÎﬂ±Á∏≥(TÈRÿgÄ|¥}r>L#¯IΩ≠PıM◊ÂäÕÛë·L)U—ñÿ°’/\\}J_‘Ù≤«ÃF{§ízÚ^»äT’OOÿ.øgﬂ‡∫~˚=ûcßqh—p≥#˘ScC?ÃbL=¨ºˇœ‚Nkˇ—˘,2˙•[ç/Édçı˜ {∂Wﬂ’}∫EHÓÂn,å}_xQ¶Òï2¥C¯÷8ü0NFƒ%TÔ<ì∑Z ëA˙>Ñ5*t`dœ¸Œû}¯˝Ë”Œ0√¬#éÜˆ≤
[["¢yeQ2‘Ï0'‚˛áˇF?4∂qöé#mO˘çÊ)‡ÿÉ,÷Fè˜(À´)Xë·~œ¯Ú?À“)–‡V|˚ÑâÖﬂrÅ	;›·Ÿ˘ñ5ﬁA∑›X(≠9∂SO,h{M0Å–E≈ˆ…éÌôÇ¸l∂XóÊÓ}i⁄é£ €)Uùaë!)ê
†t€|ÄÀ,ôaJÎ‚≠Â[¿~¡∫â}"≈ÒT˜¢|í˝ƒ∫›i˘ïÜ%?∑å1)êî≥£ËGã|<8˝#Äk˚õìW/ü≈˚„7Ωu»ßE‚|ïÇõﬁÜfãˆ<M	([!áÈW§ƒØæ]∆a1í_Ÿ- 	ïû®bs√yölÄÌ≠3
âÔ$ŒºD‰Öªe q¥r—ZµÚ eqó,ÎØ[é∂÷¨Ãz^l´¡Í›GÆµ2
Únä&ŒﬁŒU:€bﬂ}~SÎˇVs'¯ŒÅá%Lˆpﬂ∏a"FÃw◊Ä2Ó∞'O‡˛ñ1Rs7Õe Tp6å∫›|6Yf)Áπg`}∫UoÒŸw‘Co˛wèû”‹õ0¯¶ 4>˚{‡˚µF¯ço%È?ÏéFìîx(Å§ø88èäß»¨µ·J @Ö;Q3‚W†>6Äù.‰ßÔ¯qY‚?›°œò∂‹⁄∞ù°ùq÷ùf	Sü·k;∑∂õçuÊùÊ¬ä&wæ¬ıªuÚ˙-¡Àek|‹ën•tW!ä˚a!ƒâÌƒ%π-ˆ˘çB6nﬁïxyÁ˝k–Daöe”≠@&Ùv+êÖùƒljî`«AÂ’*?Z‘¡m˛çÚb∫⁄…Wﬂ‰nŸ)„7‰>!¬¢{2Xï¥◊`Ÿ—p≠-¸≠fﬂ hbT÷
æ¨¥¯´ä¶ôå∆ÑLì4I;≤k:	⁄ªﬁEYö†NÕZ^å ã*»Yqên+ö∞Ãtz‹…“ÇÚÍ<ZuÑàæ[R>ﬁ‘…<-Ù1ã†ÉCåC7'3k¿ªíˆF™)Y^\#EiAÜ¡å@F8√‰EKÕY<˘˘ f≈èà∆Áyfõ-Q.a'@{øâ®†`ølN8Ç5∑4âQäg—´†&¡UWæOÁ“2[_áª°ç¶òdëM≤·4S≠Wë¡¯ÒG§ì´Ô8	Ö!ˆGÉúEìw≠Qâã%hÛ)bXCt¢ sü)dÖà['(£#π3è…ºa2ﬁ˙]˝÷&ß˝µ÷‰≥nﬁ≤µhƒ°£à°g|∏ZsDõÉ∆„uáú¥úVì@‡ìÉÕ§”ú6Œ…HÑõ(µ(ˆπ^Ÿ_•¶∑	∞ â–1ŒKòHp€2Ñ›X%Äf<ˆ	‡nØ˝h≤ó#‘∫*3ô`Yä…U£%V˝FïU–™pÊ[ù%ŒehSFB…Ê%õÊ<çÏ≥2SœÇ®d’8k∞jTóaﬂ¿¡s^òªΩÅπã0ˇÚÙ»´¢≥≤¶ø¬´u⁄ì˝’ÿ¿˘À∫Û.º´é—#˙W1\â”ª’¶\±Ö^›È´K $q…&àØu_¬6°Ç_Ì‰ê_7 8Ä¡D∂–T0ƒ´∑5Á#%ØzSÅ∏ÍÚN0 Ä4ÁosA\∏«£mÓmÏ}ﬁylL/†+J´≥Riu_K‡WπÒËqne“∆Èròg®
ú¶·ı|F\w!ã÷÷b˘h8/!…763I◊u∏K£åiÇu ^‹@GÈÙ4≤˝\èñÊí∫≠’ıJe*ëüj÷XÁª“Ñ"4\Ê{Æ◊Ñ9Ö˛¯w&Ì+ ‘Ha‡|AöW‡Ø
ç(qÉ¢4∂è~ØÈFex›ıé¥£(O?•[ÆJ”âÚ∆+~œı
YLî«”$‡¨πÌÒÇkg/∂JÉ∂@VŸ=ÿ≠ËØ[≥˝Q_≥w{¢Ωˆé ˚u"—}™>ÌãZÛ†º˜ã:“kÉÙ@{ÌyOƒ◊ﬁÒA}Ì?‰?Ùz≈é˛÷hWÛ»πÌôb\Òa¥sÓùf˙⁄∏<mVV0Fñujqôù-Qπ+^2ÓÁ¬]|‚Ñä;ÃÇ1Î&A 04ÅÇ∞º@ú•5ùÙÒ«Ä»JÇmM£q¿¬†VFXëã»RP˝&7ˆ¿h-bñ8B3”fS^ï≥§ji#Ì∆¥πÏHXô·° ™Rød!7Æ∆ÜäÜ3ä¬ö¬P¶'sB€"bñÛÔzíΩâ®a•4h,π∞ ⁄MeÆˇ“iNIıˇ:JF≥âÜ Q¬ÛˇbEug{Káz∂-ÓŒA^aD.˙@]é®öQù‘fÒ2K8ÇMXtòÖçXOî∞#&Á@Êb˝Êb¸Ã¸ÔU%@«äﬁXë5?]òÏ2ã√´∆º•\˘3âäQJØÅ˝?P˛Ÿ˜áªˇ=f´~ˇr˜È˛À„∑–ﬁÄ?à!
KKÔOu”≈¢∑ÍÖZå§˙ÓÛÏ)ßD∑˝œo`^MÜJ{ ƒaDÊkt≤ãßTDEÿ≠⁄m,~Õ<˝«U≈œ´)NT/J{à´3£“∆™Ü≠Dg√wùzw»øÓûËs√≥PK›≥ÙK E°ªÿ+©uF˛JïVIS£|FQC≠ «Êj≥ìZk-&QõÔ] Ÿ8V{∆EYÀ¶≥C{d(íÏææ◊J5®ÿòNo}£I{%[1ÆÚt(Ç”Ÿ8»˙…lí√LÚ‡,"O·Ç6(F†-≥•0\yıjÂ.ˆÕ7[ì…Rs≠[ı∫QiÍ±Ê.#¨™O7 ;øP¸†w‘ÊÂò⁄t$>8‘ö¸uÓÏ∞∂ãˆ+Û¬˙3∏ ≤ﬁºÖä€ ∑Œ¡Â4OAÍ:{l™c¯1®%ÉÉ–∆;™9DûîO–Õg)fÑŸ≤¶@´)Äê¡‘lÂ,Á‡>-WY&iΩ¶ÚÓ,Â9&Û‚'Ω∏…›\d„d∞"W,â”)èQ:£¢ÛB®®±ô.6ra\…®ﬂÔ≥Wœ®Çﬂ.~mñ| (£dC/æÄ]xé¿c÷∆K˙?∑8ù^¬„»B°πóéOÆ˘[hÄî≈«ª/˜ﬂ„HﬂÔº|ˇ˚˝_sr¸˛Ÿ˛Û›o_ûîO≠5¯‰›@n†ó∑å˛Y˝ßÔln|ñ[|åGbÁ7îÀ
gwÉS˝Ô¢kvãæπ¸sÂÓ›scUs9⁄?~Ò/ªO·Î¡—≥˝£∆≠\úuE≥"öäm7º"v|ü≠9Àú40«iÚ*ùÂ˙'ïÅ’<W¨üÓ1fâ#ZfÓjŸiríŒÜ#z¸ÆmŸ“5`öÜU÷ÁY®!7ã\Û(XWh∏üQGºLÿä¯Ç≈™8ËW‹ZÜâgYêcæL^‡´AÜu5ÉÏ|Ü˘p\ÚYbM—⁄†eé“ìì¨iÖŒƒ<ÃÖñ'.…ldòy›`.îmë?z;aôÎD—Ûìé–%ìb©Q`ÑÄS•D%ÿßY:M3rŸ=ÂÎrY7†ıÇ•¢”(Œ¢∏‹Ü°˚ÅÂûç”ê@‹q|Ms ‘ìiãüÅ$6Å\ø∂∫˙O∏Ë ˙—8pÜ†|}Áfôc∏;ú*ƒ¯-ÅâEc‰XÂ◊√Ω€K√¯<]yÜ⁄Ñòâ≥}Â}¨ÚößßX†û|WSÍ	51œÕ∫Ø°≠eˆÇ◊UaoÈzkÂ÷rÌ»áOÂo¢ ‰Ó»>5))K†(⁄ N
ö“Ìæ$ØÇ$8è$Á`c»πµ]ı,uëßs∂π§ó¢8›∫K	 ÑáÏ∂v4p˜∏ÉO`üçÃÈ¸SmÏô/Ê
{Â√,¶ ˚@Ëç;èÑ’j^ò#Ó‚–ˆ>¸~¥á?ˆ	∆É ^n&˚Pâ{àfùØ**ÄΩ√QÌ„˚∞Ëôªè´q9Œp •UÀ>˛‡=çÜŒÔ˙`.ê·Xà0NWcößœ≤ÿ%Ê^Pgø≥€„?£º°5W’kºÙ\“§E∫ÿÆQà¯ ?´™=Wùa/<‚(cx¨|πH8Ô˙‘`ÛãhRÀ(M„„≤Ã]]RK|99+?Â⁄Ã•Ê±|Dö«√ ≠‚≠€Ó>Hä%ÿ∏£z®ÕÒlòa+¿}fOqæö` U0‚ëˆ◊⁄LI€‰è“K¥∏â`ß˛‡ö¡›]“*‰/Bö:Å¬yàóó∆ôÎïEK^«¢V–Euçkˆ„~`jmÖ˚ü¡[ÎqŸÏ¶$änÙMCÙÿ:MØ:å>a°3Û.˙x
XÙn’|M$	p4>Àë`– ”µ#{§‹T‘#)¥$zÕ⁄’^M‰’†‹%€NˆGY„∫ˆµÚêó≈D\¨A3|Ì⁄√&5≠8]*e-°™Æ%ªä»®áÓSÿO¿,ıÙ≤ı^:Oé⁄È)Í,ÄßåÚv§iV‹“« T•ˆSî˙1&&cÃÃ˛ow:ı{ü©4:ê6Q~	@∑≈~«¢"6ª‡ÏN7‡‰ª≤0Ë Aˆ·gNmY(¥18pÕ≠Jo≈¬íOÙXdÍó∑˙&Uu/¥	¥≠{©q+À;ŸVõ∫~[Eü≠Ω$hè–”{∂tcõ,ÍQæc›ﬂ}n˘^ΩÌ}á£¨…°4p‹)Â4 í∂°◊*x∫∆€Lõª≤∆2Úº”ºLÔv>#Á∂Wé¶kåÓ3˛‰I<â“Y—UÚ’_•üÀlsuuµÕ` /°ëyeeâ_v'»)∏r«©óçClìJ<qµ⁄Ωe°∏µ±Z/ò+LØsòT˘’éÍ®≠ÿËÂ"ÎÉèU]ˆOâêeØ5å<®∆”5ÿäìÍÀwA ¥§Ûø0Z’ì{cΩ‘…«√ÃÍË˚¯∏ÈwÄùƒ˝0}Û(CaÕsscUâêG'Áõ:;ˇ(ÖêAõ(ÍˆÕœÓ˘¡ê‘íüÄR{sO‡3Å¶˙≥å‚û√›Bz	Ã· ‡=“¯†ûyÂìT∏Ú¢[˝-ÛÇ¨+“úâ<^)√1fi8k›J2ê±ú´—zàvLtÈ
S^óâk∏Àn…úÁ÷7/jµà6˚ä[˜’≤¶òñ…äÃ¡\ßÅV’a$‚P‚Æ°2Oö=ôßz’Ús”’∑St9VõóbÎ2Û»8lt!é8ﬁ™b“)¨,∫í@‹⁄Ñ¨Hx¥[ÃKI<˝“B  Òç9Ü7(òà¬ÅfúMY33ìñø¨ØÍ«Õtåz˛¨ø÷Æ‡«ﬂ©<ÉÊ…É\ÛI"C„§[CtèOvøñˆSTÂ≈°;o¶zmsß}ÆˆAçè@AC˘£™sÄÃﬁÑdæj¬€iß-£6úæOÓNóû¶EêÍ˘ÅH˝0Bt~‡Ü2ÚÑ≤,
±úWòÊÀ:¸è%aeOÏ57ﬂeq¿∆óE*tJΩO“º@;´¢W‰%GÄbù•±G˚¨]∂ÿa|µ≈é>_[]]y=N™Ô=m∫cÁg¡òl∫„Û¥-à+Ï√Äuû„;–˚CáEìS ¨0±c4ıï∞K»è‡√Ñf>¡ñˆ;z†òD¥O≥à¨ó–722Çså#H%’^∫2
4£ûW_„È—•§TO˜∏r6*ä20E(éY4Ü%¬_ÖõÌ387‚±¸µï5/´ÎJE¯∂tƒùz–VZ∆0—ìRAö,„”ˆ≥bŒXœéïË*]Ap1´ë¥ôÍ∂Ú∂RK´“ *Ó’Ÿ˘ˆ—Z≠O F\ëß ΩçUC›W	’CÎ÷∫HÊ≈#T5Øﬁ≤CıÆÏRﬁ€∞ï÷ÙÎ∂ÖÙ∂:ƒ∂zØG‰8
–√´Èyh∏T‹ÓíëiáRYPÑZ&1>ı$íﬂã∆
	u≥¢Sœ3î C'ËTDb◊·Ù≈‡ÅÓÁ´Çá…Bœ_*<=ﬂ[∏Õº‚˜ÀæÒd¿o“7ı9¶ÍÆc>*Û”],Å8∞lO<ø €Numq=,Nd”ÄHË¶A±*ê∞±⁄ÓPéWyÚ›≥‚ßÅW‰ë≈ã	™Yûë‚fW8›È¸á√˘+ÉCI´Û§e"∞Åò‡?âdz4ñ+‡æA W∞TÿG«1ú˙»ÅµÚW\fÏíµGJ“8ôB˛„l
ñÊ≥(Q€ç•Aˇc€¿+y3JzΩ8‰?{¸òÃÕG«	Ü»"~EåœöÙÚg¡kòî7ﬂSW	í?cfj gd†¬ZµIäﬁ`ë!}∆ñŸ∞ö¿ƒìh0ÙÊQ^*âöÈd[_+)|*hƒOgdÑ2î;ÀÔw‘åWJT¡ #%¡å¨Ó≤BôÓ¨∞$è~– öQIò^	¥{ ∫T∆≥ÍñbAÎ·Ÿ|Êˇµ‰i=˙D:Qtï` }èBáÄ{… ÂπeñƒCI©:XzèK&K(l)lc∆St|áˇ“)ôêK„Ë2€c¡ˆeL±|ö≈A$ÑáOº¬Ú2€≈çëµt√ﬁ2’ÒF«Ã≥x≈ºf%ª‚T"™M`Ê®Çõ¢àãSo£Øîë˝é“íÛ)ßŸ≥úº9Sä˝&“$1òYö–Ê•∂öìMhª_—,jåÌ¨..ª)ﬁ5=n§9∞xÿ»~‹ãÊ+G∆]ı“2G2a	WØÕô6ÿlı’˛ÎoﬂÛ~ˇ¯‰≈´›gª–p<æ/#∆7Ï≈ì ﬁ§Ù¬<W$ ÉŸÚé%}d{G DÄaJzÏ¡îQZdmêO“”3 ß!€2¸–'WêLÖi¥jÕå)2c€–[Ÿ≥O?<Egô$Û—≤¯']j6}¨ØÆ.kΩSzM˙·QØ1ë&ø\y†’ÀÖ»“E©≠OùDáWö‚T÷_uK'Ï"ı¶jä 5Ø¨Ó+˜DIµ¶ÊÅj»ı†ñ‹mÕíC¯Æ≤Ù´4ãﬁD Åã–€ÕÜÃ∑‚5Ø#ÙFÇ8√k[—?-ÆË‹#¿’åé@^É≈	`"–˛1—◊Íªé•íõ‡∂¬DˆÎ±9eN^N`¨@·âÿ%µ∞?¬ïÈ⁄ÌœPRCÊñ’¡E`Z{®ˇ@qÆ|‘ûWœÜkS∫µs¿^äÜ9eyºƒ	^-}ê_'C¶8F4ùπî¬ø\qSL/Å9ã≥Iwiy,Eü\È´Q∂çÑ˘d©◊Îï∑SC{Î„ÓjÄØÀve4¶8\KYfæÏÏÃÅ{q6GÎzm:*_î…⁄9~ªü_™äèº(©–<∑¨ÑC~Ø+Qñ+mÕ⁄©≠Às`∏O‡ªæ&G4´y÷¢ÊÛÊ
jl]œï˘E˝ﬁÓuÂl˛g∂-ÑKuü'XÁ0“◊]ô‰pÁ⁄A¿"¸¢¥ÌÎ-; òñﬁÅò“	Ën∆w§ı–7îM•C]ŒK⁄Íó_€
Òâ.¥FQ9œÖq´¨~°cÇGëi¶Éèè58 y¿∑0h8û=õM·-t%Å«~]§{/ù^P"ΩÃ\d{˛íÆ~)Ñ€Úõo7·IÆ|ò`1Íœ4ÓÏn+|…X£è¥º‹j⁄ä˙z"çÚ &[π§>¥Ä §Få°J\‘qå¬•ªCåk˚>"ƒq3Ãûâ±Ñ"rnÄ}§Ûç´Côì;‰ •Ù
œ°)|¸cùaJÇFòb9…±V>çπ»Æ¶ÛQ^¿÷èJvÀ"Ûç‡8…Ç|dà,\π=8l©;Îóóıµ5sı÷ÍÂë˛⁄cP-√˘‰wRsÊºzÒ˙≈Ó…∑GsÂÕ©
éﬂ15”9#«POëvÊì≠ÍÎü+_7Ÿ’X˘˙ÄÁ€s•›¯çsn˜˝¡è	ù›Aøî¨—ï˜J˝≠$ΩËÇY1H∆–7⁄|≤Ôa ö¬öWr≠≈å¥G˜+Ê	Ô9‹ÓqÚ4œ#ª˝˚aÕÁ∆π#û\q&cJoF*˘ ≠Kw±[7›È:∑∏ı∫úO…"µ◊ÔûÔæ<ŸE+¯Á~n>y∏˚ıAãQ{{Ö‡v∑DÑÌ…mâ/Õ˙8ä §f°)£™ΩÉ™€scﬁ[t≠e^è˛fCk[Äﬁ∂Å=`©Ü[˘≈W5é©≥ytêo(9œTŒ‡üiä…ße¬@ ı	4–Zc.•4’ß‹CÇ"XóX¥GÈ§D!x2+D~™(ásm*îLΩJ>’ÊﬂpcjLÀZâ‘Ïy‰£p¶√A{jã≈T˚;x˝≈≈Uﬂ9≤öY¸N—êjK˝ﬁ{1‰yZ˚⁄ù=D¥Ö¬≠ÔWç!◊˜t}ü{_—÷iΩc∞Ôm[∫f%@CÊ^Ésõ◊Ò∑˘xˆ8Zÿ¥hööı…∫.ó0‘ÛÃ1çŸÚ›Ü]“êºeG7º;lÙÎ∑î>ŒKõz7∏›ü-›,O'®8‹n1êÎ ô]%@ŸbX∫˜Ià>2Q˝Õ∞Õ1ìõœ,Ï◊¢À˝Ilæ6)»ö£¢Ï›Äk≤À <œZL{„!˛yYÃÏ±V∏*ÒÑ´Nìó™Qvô∑Í÷Øy`FÛ[»ﬁe7gµŒóÍtÎñÑÚe≤“6UÌF≈|5ÔÑ›|˜fê≤n0≠¢pÉ›Ig¿JÒ¡’lPs*+h4≤kXï>÷bÔ_«3¬l›Ä4◊\⁄lFw3ÃîöÒ_èyÊı¡—´›ó¨ã—˛ù&¶ï∆©Òo1∂¨±I∏•⁄^ê9‹¥ÚÖsS5•,hHπã≈⁄`ã≈œÜÚ–iCŸºõ•≥ÿÄ‘6y¿¥¢®ô+≈L€:=uö⁄zR[ˆ©I˛óe´Ÿd#¯“‘Gµ“¯X∑Ω V˘TÑﬂmzKÆj≈ôπL£MèÅp„‘\Zˇ‚ı…È÷-.Ôbı˜n¸∫Wâ9˝?¢/CÃgXL!çôÁºÎ∑µõL0ñÌe1Z⁄s±È€<˘eÔÇVê RpYpöwìËÛÿqŒ≠z¶áqÜ®∑ä÷g˙CÂpîázpL>\ÖÀ◊◊—ÏÆ0∂ùÇ….ï4±A•Î›Íÿµ¬œ£‰ﬂß5X·ıIçV4≈{2\D}4åì¢°"é1∂ÖÏX4o˚ ^qˆ,ºÓl”¬ké≤éÍ±˜Î±j·ÂÎbÈm›¬Îﬁ£¥t—XÓõù/ºÓ¡ÍÖ◊}·Ù/i˜¬À≠Á∞·uœàÌ≈Å›’û÷˙¿BfØ*ÈH¸e≈œ:…OﬂÍ∫Óúæı/&S´Ãu∏âæwO◊J√ÒH◊ZZ Ü£(úç£∏/eœ¸Ï¡≤®Òké⁄√„zßÌ‘-å∆pnf§*™ÔaÆ.‰I´ﬂG"-µápõ&®º◊uÌxÁXå≠u®AZwèˆûÒq÷‘˜xs°÷PÔ/Fcµ	,4“è™°oN%j€Lrv<õ‡~nçjŸäÑrV–Ω¯Ò´™π˝„ÎYOuçis´ mÙ	QÇ.~^fqxÂ,∂kå\–Ç´zê]Ω+™V·?≠‚â˘;7¯˛ s#—øæΩb¸:«öz˛K¸#pGií£©˚πy∑ÙéıìÚk k∞Ë#QûùCr 29f˙°œ@‹á˚-´~ÿR~Ë…_‰{wœº◊Ó;‘∞|∞¸yú…UtO”´π∞‹0m‘ π=†rn*ÜØªP\ØKÿ¬û-î>±Â|W*"hÖWE]Ñ4y≠óµw† ˜‚∞ÂYq·”ÉOıç≤Cp_îq«‘û˜
H•kN<ÍˇbYZ¿ÌP‰ÈfπwŸ"P¨¬r4Hvñ53Á#ô$ír8"±¨≤Mñâ€jÓ'EÓùWŒá$ä†Ÿπà!óú  C•DÙè¨TöÕ˘Yë∂ü˙hx»-¢ìOÊêßtÛQ›Õë0ìyemŒ∂,ﬁ"OØ»ÿ˘e€†~a—;IgVoœMçΩöÄ‰ÈëïA˜#e]Ô]‘kŸFO[ï:ÕÏµ^Y|``Ñˆ`¢õ◊‹]Á»_«ºƒ<”ó¢πø_¬·∂a@Õ√=k©c˚¬ˇ5¨mì‹ÈøÌç
	Ï˘}ö)á¢≥éÿXœHb∆~‡·XF√^úÁîw8π™õ◊¬XSˇÃKçÙ<AG≤y	Hõá˙¬À+]—Ô∏$VGÙ˚‡CÊ]«Ö8ó;ÆÂ¸&…∂uüˇË¯hŒ˚wbftÁ¸èÀV,RëΩUU˛Ÿº•CºêØ˘/_‰∆Î˛‹Â8Ê$h«nº¸bZÚ±-äpc;‚ÂjÍ{¯[≈#≈!ø’gˇHTπ$ía"üã|ë`GÄ{<'‹úa(>xIÉmZF”éJº˜∂µ˜D¢ø6πo·lt˜5ÂaE˜≤®Õ—EÌ&◊è-qE÷®"[Lëµ„Ì€ûÓºaº”S¢çnÈ0∆ç‹∞+”fQÌ†¥iM1äºˇ#à¶˝GU< 5•‚≤Ò§ü≥t<>ÖØÖªlòn7€/íT˙e◊ØR483Q4e/ùLÉ‰˙Òç˛˝ñÕr4É„øF°Ä9fÀ≠¸i˛—ßªY≈˝<4&ézÎ£(üMR–≤ê ≥±c14™Ê9Àñä2€ÜïQy#ÿ‘qJÂ‘g∫±æë©˙vY∏-Å<û$-ZÒπãE6XÒÚ¢≥se˛”‹r[xèu_ÒÄ†–YeY8—àáË"èBò}ó◊º≤»-R{±ÎÂÖ•´Ì•!µ•∆√¯\+©™¶‘}Ês≤¡ƒJˇÏãZ≈®ïK‹Ÿ	ä˙DKuí.¥P'È_Î2›tDFÔC`˛MâiM4_*]äU®“›[KTﬂÕØdˆ.9ÑfgÁedø1πl}C:3û‚ú™K:‡—7k$)mJCj∂ÂèLTÕ≈èÀõvE<µ{”BiüS:W2Ω5ÖÃX˙Ña⁄ÉEø	%õ!è	q¨ÒopVuπ` õ∂Î/Ó/?¸ô◊EÌ	·ﬁ›·Ø⁄L⁄VA‘e˝^¨êywò´‚t+Ã€ãr6ËÊ3£=`”»Ã#+√:5Î∫öÛFñ*F~TIg;>ùc`Qâﬂe√ Do	™¬Eñ3≠ºˆÈc6Ë›4«	ÏB-˚˝^-ã¬«†ıÎÛ“˙J5kbΩ¶Ÿ50øîcËºƒ€†“◊ˆWL∏{ÕπDØz¶o04\G◊a:¡«YR‹2z‡√œi7o¶~>…§ü9Ò`Û¯Ê6Òªõ´ﬁ^Ö∑Uª/°@ww0lv≠ö§wÇö<ﬁÓp5ﬂA7¯d‘Õ_#† äﬂ%É›æ©ËÚcÅo>ˆ°T?ö¥TU]~2Rj˜˘DJ∫?aª@fÁÊ§Á•£—ÑwÛw*j≈„<ïÜŒÕ¶XjT⁄È°åìpã>gÈecxÆ¶Ω€t$˜÷{zj·∑Ìﬁ“€£u?“«ı6y∞‹.F√–™}5O÷öÌﬂgQ25&°nSÎÎér≤Ëoë≥HnWˆÆyÖ-î≥›s†}¿€Ê-¸h›Á~ñê—ä6U÷⁄a§…¡t[∆˛áó£˛˜Ÿ (ë√ôò2I≤Y:c<Z-`üK›˚ÀB&¨x{⁄aw,≠åü€˜8Õäß◊6°¿¶€;÷ﬁ2î{ò™#HÆ≠Üè˙àÕØÂÛ;&—˘!®u†uCàQM‘•wpË≥ ã∫√Aç÷ít5¥ˆ~FTŸûÊh˛§YCÀo˜9⁄„ûÚ®Œ9Z‰õá‘TÕñ∂õ›Íqw'Ó Zwàz˘l°ÄEÃ«Ó3© .opC–ë·{¬ñ¸ª%nX˜Ñ®±—“Œ´ N≥™ˇé¸5Dﬁ(ŒRjˇUî»ﬂ1¢P˘sÀF\§0|˚∆Uˆ·√zQw#…ûﬂfk—ˆnÙ≥Ù2˘=êÒ◊~”¶mâgæù:û∞Y]
pë /ãŒﬂ\–πÄiw_‡Õ£ËÏVXWŒ‡^áÚ”Mã«ù¡’8øZ∆5¨	RÀ˜/&SòÍõ≤qÎâÍFﬁ0ŒÉ”1FX«9o
Œ8ﬁZ÷ûEÏ„∑`PÈ`0 |w2v8íx<
¨hfÏü:ú¬ ¸d0ƒÌ9>%≤>–ê’‚ØcwÓ—sFJ»o• ≈>Êyû|;ßAhu=«Ä¥˙‚¸Ê7¨ÄÓ˝ÈlúGùûM‹àÏD†2â¨±‘6Ûò±“—UÖ∫ §Ôä‹üôpÁiMˇ*÷€smë4´;«BYxDõ$s„ ¥,îÑ$s’R›‰6—ú˙Pç5V¡*ÅΩQRÜÂÜ^›uÏl<™*8T6Í·W‹€C3[„/öä?aÎ (I4_G…h6·.„(ó\.±∞Ú~úª≠öy≥|)*ÜZ`„\Õ∂l¿ãÂ^(˝ñS‰≠âS¯∆ÛrÌY~‹Ì…"–ñﬁ¥5œà≠ù∆‰ƒUn[RbÕ1È°‚⁄WEÜ⁄#˝-˘âMãÜà¬V≈“Ö∆§˙9T,Ë	µË˛·Á`<J∑`Ã<o,1’∞`? ¿~«bm„≥x|¯˘√øì”nïÂr{|¯?·¿À¢∂è;x°*ìM…èÕ'q“ølI.4B≠hÁï8wÅƒºJ1¿Ü¡`ÜoJŒâmf—E]vªﬁ3Ú°.≥ıá-i^ìrﬁàÃsÆ:≠¸ªìèÊMúÂÊî#~¬ŸË∑'æÁÉ≥8	ª√1∂=0˘“„⁄;H2©·Ÿ(tYÂóÿá ÄuúûΩ&”?Zéµ<2÷Æ?P2÷*uï>À.€K8‚‹0m_”¥Lˇ—⁄®˝TAU˝R√≈œ4÷ìfªq‘u∞µÀ5µÃa≠HÕ*I]>’Hr·Vó¡˙⁄œë˜.µ¶…–UÛ(ıÃ£7gRØ;¶ÙRz…É¥=%ﬁ}fÎ∫œ\]+SW£Ø{‚8õnN‘!Ús%§∂ÊÍÈ)≤S‚DÔb&∏=Jg ©^√)~#®Êä¥Ω*”1ÔfòÇ§◊åÊ^ïO”j∑ŸrÚ¬açü k∑∂e!üÎZ¢Ω|H…µÁ;ˇHE~Ò"æÛ4§V˘≈JIMÓœ Oˆ;G`BônÇ∆X"„ªçâÊÛ/î4—i
–xa_A•Ø€ùN˝^ÁnS∫À·fÒ≈\§a0˝ß-Q˛Råß@¡ãì†ﬂ12J¿_§IˇÂÀ,è¶9∫MSıDŒˆÖDCw§ äÔÎUÌâ9LÔÌy§Ì°õ◊√±+Ω¨*ß6Æò¨ÎÖN•òÃ'Xp!ÚeÿË§»æS‡÷2ªH1;‹äì∆ç)†Á(ı·‚ ∞Í¡V∏È+Í∫6W“ZígS“5r«äE+ÂÏMﬁIîÁ˝5 Õ•rÑˆ&ó>8Îj+08=_n˙g—–t√
Œ„âAI….	Ç#éî®∑dG¶Ö]E\]%á∫ˇ}©AΩññﬁVm˜û˘ﬁ8ª}ùeQ>⁄ªT¯teÎJΩ˘fs!üJW∫_aäNcR5ﬁcÊ1™•3_“t•\∞Rß™t‘R◊FdΩÛŒ}ÂQ¶y≠Á¥SCRN£N±åF?ôMÚ≈2;ﬁYZV GQÇkÓ±©ªû´foÎ…ˇÎ´È{Ÿˇh…? √“Úî˝›/Sÿñ—´–CC$÷qd√QYîÏ+£ˆ√H∆ÉbD÷]ÍÔæ2ãñølòVìuÉ”,be™,çÉÄ˙Éﬁ›2∂u7Ìf2Ìπ_ªà3≠%æº]n≥-GÆ!BT◊ÊÆ¨∞Á  qÜ2∑í
¯ãÏcÅ<ˆ@|7 «ùÒ–—-eôj©É¯qΩÈ …fÄ%úƒ…8EÅO®v»ÀúHËçó¡3@ˇëíÅ  H`¡,‡œ‡Ÿ?Ú¡MÙ∂'ÒyF¡M‚’≤té:¬hô%RƒµBT√,Vö„Ï
Zœ¢7¸eˆı÷e±T\c˘ÕnJ	ÏÄkŒáìÎi$r‹à,iKmÎÍ(»á≥dÑ±9ñéçéTCY&^‘ª(€›O.bêÊm6‚ÔπZùÏÁ¿ëÛ7;y—õéÜwaπ/o ^t¯…a∞ $&Ôß‚]G„{\dZ`‘C˘¶£Â£h8ÀG&^tçògÓYdƒÚM†Ø¶q∂¬â±›Z√<øB^Ó<h˝≠Ó“¿‚pã-)ê `«H ‡˚â¯Né¯[÷	≈–Ì≤≠ΩrsUMU∑™VÂÕÊ÷‰û™€/ÔTmâ{-Mï˚Hil¬ˆÂ=•9±Uõ€+∑O’‹nu´jMﬁl]πe¥Òñ⁄cårw6∑[mó™Uæ˘>¸Ÿhπ'[XÓeÅ´[ ãõ-„+7á2>Âû2<y∑êrS(P¨n) 7≠≠Ω≥l(xÁ$ &Í.Â‹+ﬁ¿ıu—˜2Ωî8ÎnªâÛx˙ZwΩ63çòñdn™uxNès¡∑∑_P˘ô,î¯I£-÷ÕÏ<ÛÚ3@ü±‘æn: ©6 R2‹/êƒà∫ ¥uÀN~˙…÷FÕ†Ω%£ôZé"
yö›n∞ÃN≠v}µ»œ_∆?Vã‘¨„ßCêv(qPuOmœò‡tv˜c†tgm ËŒ:$ÔÓ/\ıYr¨U\’RØß÷'à”Úñ⁄ÆΩÁØê3^æ‡˘í±÷Y∞‡Í'Ã∑¥}Ãzπ0sÜ	©≤™¥WÀ›úœNÖ˘„ªœo‹á¸≠RŸ∞õ˜æ3E≠ÄW*x|#R»1êSì«7á„Y~[…˝®3y]ñº»ÌŒÎÙ"U
ñ9ÕÙˆWL/L*C|ØÂâ§¶AòXv1ücãN”MF |TR[>©∫Î`›K ˝é–†◊¥a®pÑÖó ˙rÒÖ˚eí*ﬂü™–?ß˚Êç…’ë«‚ô´ÃRìzÜ¸ÍŒ–©Œ˙s=D„¿v$tœ®ñºµ	/Ge$∂ÎR¥n%ûÒÔ~∆ƒ5√«#5\Õ7ì†›ÊaFÍÂ1]÷˜πå`’’`)E©kIü$ ´kãJwk”ü—å±+è¨Kg◊… ≤CÂHqa1©∏ñºUÛ∆ç˝o◊äEîﬂiQG #yA`
m Õ~√Q‡ã&Ñ∏€
ñ˛m
¥µµ2w\k·“îËy\¥CYÊÃRÊ‘‡’ãv˘K∫YÕá3‡÷Qô∆I§=Ùsõ≥–ˆ%¡iûég∞∆—Y˚ΩHÅ¨¨≥>mH:$ØÈÜ^
»ë˙Õù±MmZÿzˇºlıó˝≤≥ë%fîéaÛ>Ó<ùÂC8
–4ü|¯â›Mg“+s0ÿGSn S.‘π¢@«∆4C [3Ω©√‹“› Ô?úC˚€uk∞ûæa∑˙kã∆›Œqn∏ü#„”√;’~-≠ÿµyxéJ~∏!jîb$èƒsÛƒ§r—†≠Â]˛ÿ<ˇÿ–Ênˇ_ÊhÍ«¶„ÈÔŒÎvÁ/”Äá™H›# HKÉ!ŒTä<ÍÏ(.*•°n˘4Nt”÷%˜¿&∑ZCs,öçyc£‘®(%NJ˜∑Œ'2¥H≠π%‹l¶ÉCá⁄íeçœkymY›nlp@›™¡ã+Ü∏ÍÂ∏∏G˘n#ÿœ€y[ñ¸cÔ{Ï#ê*◊-∂‰`9¨.Ÿ9°_Âo™E¨Èe∫±πÍ|YjT˘ÎJÌÜFä.GRÖ ﬂ◊lﬂj∂o˜ §‚t—aî:RﬁÄfÈ}P≥Ù:ëjQﬁFï^¸Åûb«5©‹\Ïu©ÙT1¿W∞æyÎéÌ‚˘9˛;a§¢¸Øê≠R‚´8§j„‘P¥Í˙b⁄Ò÷µ≠Ùﬁ‰πGa¥T]&ƒïTıŸ ¬®zi‚ïzŸ¬++Lƒ€iN'ß»˝¡‡vÿõoX"º .‚ãg¡`ª»#Dlñƒ√@µ–⁄˚ ≥-/Õƒ0ˇÕx
—Ïpôÿ˘≤¥Í‚∑î,ª’p"ƒúòE∂b~M(ˆ¸M9¿«,–-±Dqï¬ŸÉ-Âƒv…ê•ÚÒ÷`%rxyà√|lvçÊy˝ña7úL1æ \BÂ•˘§∆Ÿc;f‹ç ö‡ﬁ3ä15Bõd‰:/È ∂aÜMªdŸQ|>£◊f…Kºêk DŸ:â€N?˙£“ETLé •.ëïü«íÄ}ÍîπÂﬁÖ¢Ì9ñ-˙Ñ7zªæ;ÔWiï7Í¨åÀuæå%:À¶'≈cÕìB*öö*åIÖESy|¨ΩŒ.C.®e8K{Â †ïÿöÌBáöWùuvc!Ì„æ◊%))á~KAH	ˇÜ*Y~∞G7„™Á•ˇ˙?˛W¨xÕ-”.∂ÉŸ–ÌuëÓ®övÍºnÒ0˜{GËáÏöÛ∂O„ÔÓÀ[+Ñ7ÑÂ*Å∏öà≈S¥›H[k{ÆﬁÉ›=YâıuZ`ı∏’¶N€¶›Änç.‚º‘AìÁ)†Ωï¶ÚwÄ 7*£\˝“⁄ÏÈì’í?ß0z‘5ûyˆJ&µXøçU5°í´3’¬j¡`ÛˆC{ñwÓæ~	/!\@o‰®ÿGÈ‡éµÄﬁ|¯∑1zµaı-<∫ÍHÜFØ\√’ú›õÍ¥Dí≤¥ñïæv•Ò/çËcØßÅ6]ÙZ.ô…n⁄≥îÃÿsz‹í]~UÛ{T!‹k⁄√OŸ≠:./©C∏ëDWZdhy$yêLí^k»0u]s	œ∑K|$KÔöS7p∑µUbÈ˘Àe‹ÇG∂âÔ^Õ¬ ´âQ
P[Qª}^ù<BÆÛπN´QΩªÌ<˘Nâ£hœlätìs7]V†gïƒ ´9"@S‹ø]'s‚¢Y3›ÆúÅ˜ô1≥ºèfSÉ/‘0äl©©iRåªö™ùÜ÷Ö g°∆•é®©y©;Z§©lj2àGø‘Z5œ†“f-“M©ÍjË§RÅ-“ÉTë5!ëxd°	H˝Z”‰3-Ñ–‘5≠Çxƒ£ywÊ”Í˜Ÿy<
≤ä¿˝~˘ÓtzáË¢ëd;r(>«™}zyTºâ£K’jıK0WÒiÏ√Ã´+p√eEh<-û^øM#≈∑Ÿ ä}T0ºÅÉìÉ{ ¢Iñø¡‘¸\gC™]5üÒ∂®@%ÙØåD*K¥	ÌÂ^9åÆ:¶œ¯cË≈	«lW…,\GıñlÉUè‡¡{Y/E˘∂VSæ)¡É™éÆ1ﬁØE3¡C[ÂúÀ1,TΩçπ‹3:-3ò¢¢JcrôÃãáÁVú®≠ÚÚy˜J`:!ï˝ï.;áŸ}-{ÑDPÕ‰‘L¸õã%(À‘€'¿æé ¯Âuü¯Â_Kt©÷*œHW~5£MÖ£◊«Ø„[/[å(£…y’bc -5åçß”OaÛ{ûf<À"`àòﬁãpãIC≤∏Ö≥í7¢t3æ'õ.»e≥ñÂ´Eö+⁄wDüè÷àGöP`:ö;-SvœÈòX»(îôÀ7⁄GÃÖ◊¿t∂Ñª„+7Ío†^CÏ}ßÅ3«w¸&Ò"óœ≤c^cÅ⁄Ê≤huÏäìpápßlíb@8c`'ÂA ^Ìæ8fG˚{˚ØOˆ—÷é5´£(¡ƒIßﬂ≈«1‹Ä◊»¶t5"≠œg⁄È·«$e%V-≥`Â9´îG[9Ä†ò„ﬁÄÌûg≥)¸çSˆÊ≈ÎΩo_ËÕ√A7ÊicôLWtWÑç”LqèS¥∑Ë!ƒ34>è&=„M]pÖéﬁC…sä·3@Ç‚	<ìêOã2ä\Âë9Œàs5à<>ã2"i¨†4Üìetn’¶¿"c:‹a,óı¡E¥◊yD^] "1ròœ¶ë°√®û„®ËbéTŸ;˘])CÍ†éûX{ö¶„(HzñpΩj"≈^µ,^•∆?Sá2ywà¨æ•πÇá V[£u0Ì!˘ßÑ¡í´0”∑ê“k?`à%iæÃ–$@7Ø@“Ï‚¯Ã3¯Áè≠aíŒå%√¬Ï8HæÉóÂhπsG4ôfQéô˙") ’ËAµ‡,$èS6Nœ©åfdÏ\ßGRçXD√Ñ™¬√ìg„Ÿ’ˇ  ˇˇÏΩ_oIñ˙~?Eà£YVMì≈íZÕ¶$P$5ÕÖ$rHvœÓïR≤*IÊLUeMfEu˜a±Äa?¨ˆ‹yÏ^ÃÀµçıı„ÚõÃ∞?¬=ÁDDfDdDdd±®nÕvÓN´XïNú8áHë∫EÖt) ˙4JÆ,Øtsõè˙’ÍnBmÔ{˜∫ù<9bvós]aL5MàÒ-πIdßÏót≥*k≠ìLWF¶‹”Û√ë?›´∞’ıÁN1ö[Ωÿ˙^≠G≈t’tàÓsé˝h⁄ç¬T–èj¢æª]5u∑¯R;©¥wÿR@P…◊UF_fK6ß[ff˝K{Qÿ;õëJ≥æDíxnŸï€˜§xë≠+¡8“Q)≈ô2Jy∂vó#Å⁄I4˜∆uŸ”Fíπ@ÔvR%‡ÎYèeÿì‡"&O{¿óÁ|Î
øê+πzÏÃ—Ó6…—ˆ63:€AÙÚŸ[]†üF</˝Œ+ˇjw¸JkƒrÉ#	]]ûgaYÌ„;ID/Hˇ£‰°€ﬁvwiË÷±˝Ÿd°óâ(\Dyï«Æz,G1êgo‘Ÿä∫]Íà&‡#˚∂*≈X,±UååîåfDë)Oﬂ:∞í‚”‡JîoÕ-rWÿKzëÂΩ»ÛäR¿™AÜ)é0F˘Œlø\§0®î‹Üïbk∏¸1 Âƒ À—d2woP5®–C•Ä–%@ﬂê¥∏Õ±à¬,>€/‹“_±ıV≤±|X
%∞ú÷™ÅVCS0â˝∫XÇÇÇ°`±H‚¨:‚w¶ì<Œûuí|ª7HÜ>«ñÄop⁄{/A∑É-ˆd!èa0Ω(˚‡∂Rsà"œÃmD.l«‹j|ü«CP£AíÎ˜π %ß¸∞wÊâ»Q+Úç$√Ûêß=%‹çyÏÍœÿ;˘bˇﬂüf≈®ä≤Ù¶&÷È°|ÒÏ[Ω^Òﬂ»ãE—ùùNÁùÁ˝»j–nî|áïÂv_‰¨‰<ÓJœ=¶tá@¸¿%∏d®æ«U‰9"¸!ˇÙΩÿa§7;cBÑT@B§aDÿE“‹b		0~XzXöCñ®hqƒ∞‡√òG‚1b‚¨cä®$Q⁄aGiü/“,˘r}4
“”§bv«´ïÛÓû¢_á†⁄€L‘ï@Lé6ûÙ∏A2 Œ—z“„à∂®˚,∞'ﬁ«>Ú	≠¨!å¯¡O®ﬂ5~…º™±Úı°8(xÉΩˇY„°–L∏Ùm•pá⁄QäÔ/Á:z/8
^ R˙î@R
Y÷9·§‡ÂœÃ„•–j‘ƒå˚|ÀUÏÊˆ)7BP±=Ç¢¬¸hP*¸un<∫D<u’Ÿ·	*∞°sÏT√U°´\e©<Èw_¨Ïº>¸À%<:„3Ã@.˛Ûˇ‘Cûù,t}“@,t9÷€L·≠7©¿	ÃÇów˘õb≥ÎÒ	„≥‡Â‰Twá”bi~~X-∂∆oÅ◊binvÃjÃ€k ≤ã£"q√:iSPÿ(b√nú’‰2…o˛»Ωˇ†&-Û*C§´WEwã2Ô™-™_G©Õ.ht∏áR’ñ\t6Ä@s§˘ò'—æ–e›[˘÷|∏?≠3#ôWOÕwó◊µeë’§è®!€öl<8Ey†ƒ∏,4}OJô•ßeæı@≠ú¶f(SFûfi&wöÁè)r´µ8/??Z\bSîNì¡d"„÷≠›‰<ÁõlÍú›Û3’RÄ^Ãı—≤®Ôpuä‹Ï⁄µyçÂÿÓ`Å Ïryî=ˇ—V»ÒC5¶KèÄ‰Ú…óMea{V9ô∂ÛÔãIWcÍ@∞nÉUÑ§˘A∞\Q‹ï2∏¬ øÓ2√L-É,"≠)êV9•¡ƒtÉabÿ˜‡◊ﬁÀÛˇS
)ÂG˚[ˆÊ€6ÕRÇØH®ígªÛ+ê˝Zò∆L•]è„j¸√ºN†Ω`îˆbû˘∫õ¿ÅHÁ∫Ωæâ∑ô_E™`†W?Té˛Ê‚]≈]™SP˝µHA≥=	2E˙ª≈ye◊PÈö"ä<”†≤¸÷MÈ3iÃÛò&ÊÔtíøäátA!íÕ%(*q—éBàYq EvÃÆ◊éŸ†ﬁ§ns∞®MÍâ>D◊E5ßòÄ®4ˇi¯CeíƒÉBtπç^;úK@âö÷«H2∞‹@îI/BÒ=!…#˚)h≠‹T?,…—VèÜR5ã“ÇÕÅ†^]≥&∑~‰°√√^∫McúÏ(ÍÛÄŒ…8!◊∑£≥,! ¸?¥ÉU ;5o<`0≤∏áﬁ<å¬ƒ°ÙWFqG¡¡“jëÙz@€Ct8d¿1Üò‹†ïSz8tiRÛ>loDµ|Öˇ,FıŒ∞5äˆdpΩÅcΩ©>≈ÉÊÈ)˜ßµ‚´Mx]7üÈÄ≠ïgcû∂mÓı2BY¥¨gXêÓH…©xÒœˆ•Û\∂FH/›ì6Èsñæ«œW¿aT¬á∫JÿŒb⁄u&Eoﬂ-nË&W‘l=¶•Q5ò™ßSZv=E°Ä‚ÿ±ºı3ˆé˝Û?±À˚≈◊◊Ôêâ/÷Éÿ»ﬁ‹9f’®Ù±s˙‰h˚‰‡ÌÒ…ˆ…◊«œ_ø‹;~#œ3è1Ôë%`Â=Í1Zt¢]S]˙q÷˛ûadu≈iï“´cÙ¢
™!~'k¢ù?*Ï1Å•£CÖ<Z§LN=›÷ £â†§È˘!Ã0Ç6πB2√Aõ¨=q¿=XU£Ù8Ni•gCTßì·ÇÎ¿ú]„÷ü™õxKK~ Í›∆™6W‰¨û
ë?5Õ¡iUúnq≥˝féFÂZHÜd∑vUˆù}ﬂÖΩøLŸ∞`ÊYÅ=˛ﬂµÖWÈ
D‘C•∑Ï2S*´+l_‡…-ÉZ(Ñd™•˛k¬√G∑~¬o$⁄¸◊ﬂÏbÄé`yË„C»¡`˜Xò7’Ú*ñN
≠BÄÂ˜¬ ÖÄ($÷R™ûA¯‰ rÒŸ[„y„®SŒ"r6≈£ÎÜ·— õÅòr;ï£U—‰∫e‘x89Â’!ãœ∏ºM:õT>ì‘Y$jÙ^Ò‘’œê8¢3 ›SF*Él]Â†&ÌØ¯fôEm'È‘è—aÀyÒ7Tˇ( Æ¢	Òs5û{Ë˘HPu8“÷—ÍÇä(Bâø°be£π∂ΩƒüÔóSî◊LX0ï(’vCÜç|·È÷ﬁáX	!	≠/.¢ó2çìRSâ¬ ù–:èíÏ√íf∞hFNT¥N'òOä	ƒ=/rÖzâ¯a2…(15÷å8«Pe4÷‰dWê∂ ™ÜùVñ–Wç∞>∂Ùï™¥fõï¬ºYgg('´ö`J>T_∂õˆ[iQƒ7∆+™•ºl(=ÿ[ù∞øî_°À0ªÔ”¨◊Z\¨˛∏óeiÊÕ˜\bÔp˙ ¥ı:ÏÒ∫˝f´©°`∫®H⁄-{-¨œÅ
∆]$qøßä$|“Eì}^è˙åW°ê},ÍDÀªÑ/€π†sí:poâÈ:Ï{w–ø˘Ccë˙˝ı=vüO4vqø¥8·ICV<†@∏&tﬁÖÕ^í»	æ	˙@¶,|Ø€G‚¶ë‰gÑí˚$èí•†ıçÔï÷]aõaBƒ-?zVπ0ç™ÙWµõ< Í≠ö4´\¡{à&—5—«Ï&ktN”ﬁ1J—o4$@£I‡‡ÈäÛ£—Àdx-˜åÄ‡ÅU⁄»#cf≈ı$x%å§‰z€ ≈YÔ ≈µ^d@n{E_aj»B» r÷8Kπ{*:%’d†<ŸËÖËL°Õåˆ6ÜtçıvÔπdî†4¿N˚i˜◊,‚:∞–Q wˇÊÚ∆@[ÄxÂYÙ],ùD(ÕeËYÀ”Ú8°üK‰◊¿@a	˘ò9
-œÄa„¥’˘¡îã;s≥∏;&hfsu¬#N·œë-¢‰CRÁ‹WMÆm˛’ﬁÎØﬂ~ıvÔ¯dˇ’ˆÓ6ºic}ï~ÛîÇ∏C¨wìúπ‚$Î‚¬ÇËY8Ãöæ[:å≤hzB#ÖMåg €¬ÏÿSÍK/}ﬂIÜ√8˚*F%ª¡ha@ø‡é>≠ˇK∞V∞àœhÅø}3∞»˚9;±Õf€â›®èpõËì\ß£ëô%¸à ≥s:ÅÌ ÙTÙ2¬y 7}¡£/ΩO ‡ÖÎUE¨uÖÏ§x1A4¡ná’‰ÿIßh@¶æ5z l¿à|•4Çaîwìqt∆|æπ;∫«]©<7ˆ˛%…éæKöÒ+Öªﬂ«sÿ¬P∏≈QÅÁŒaö∑ù:∞êõ:Ì>+Éqÿ¶A«èp∆¯cïÊ´§œñ˘{†3¯5®——rµ…^E„ãŒ ∫j=^üìaã⁄œƒÀ÷W·'µøLz„¸aÌQª›‡ï◊MxîÛÄ'P´‡Üku8›¸·Êø«°b¢“2ìx[ïQó‘h5qiÕù∏‘‹ˆ≤™Ñ√Ø“,˛&Œ∞h[ˇÆ@äÀ,f©å¸6∂9˝BñJ.éjÅ–ô‡as£”i‘˝u/Éùôπ]≤OŒY‹Ω(‚S–X‘%	búCZ∏FÒ$ß÷î+[™Ø≥¶E≈Ë	Ï•ÂUˆ›Úõı’’o,Bè(æn≤çƒx¨cÛd:Âú’æv»Ëñ
ˆË∏áˇº$òö„&≤’ásº*≥I≥∏ˆ-l·áÎ%àƒ„U3Úªí s’óıÈ(˛˚C·Y-mBU49◊.¯Ô“‰ª›ç°ª1P¸EúK˚XBE@|O¯›‡Ö±d˝	û!V‘ÎÒ®ÁØ¬EYxj3ë"Õ^¶Á∏)ˆ.ìﬁÕ?"4cﬁêA‘Mó, cö?Ê4Ò˘‹2GU[π2iáàUŸ◊ÁkZ	À}∆˘ﬂ‰È„YÎu
≤∞È¸Ê˜i#Ê:©ô˝,ë$>°π›IGÙô£	ÅÚüa™“˜√~©H#ü–d…ﬁÎ∆A¿w_Ã6cz\]∏Ì∂~ ´N±Ø$Ó'4È"MAüs,≥Ä?‹¸WÕln%ÊÎTÊSÃsëúU,xãOcçèÊ˛Æ.R`-å9,O%sû˚HA/KŒõ•2îBø:Ï`±îÓrÍ≥zΩåèLJ\©_îŸ„≤{ˇe24dÓM)ÀÃŒº˛Õ‡{ÒÔQœ\=∏ﬂ=Ã.⁄⁄<»á%¥âZ’l©2Ò„mD⁄ÑÌ¸¡˙pX˛V{&≤2î›ãÂëí"ä◊ÄT,t»\¶î˛2!4:O…∫+ztØèF:§¯jv)Í0•ªø§∞¶˝∏ È¬ò‡ érNjdL*áÚ} ‚≤∞äı U˜ÃâVhÖoó=í™§Uôó∞ ı‚Óß¡VMÕ•ˆP†70¶><¬r÷|ø⁄±’Z5éVå˚nQ±Üä$ΩÙÓK÷(X°èÕ‚5éÊGÀN–'äà˘
»¿…)"¨òË«˝|Åe?x"m¨≤^Ç|H∆¥ÂÈ ÛŸ`†ËøÈä™˙◊ˇû›üˆàAÙ(	∫ B/lÄ°ƒ√"E~WiËáõ%oÓ›Â«G4ëº¨bƒ£E9ò”-“‰xë5älV–F˙Á üƒØXç˙‚cäxü‹1‹ë+BiˆÑ·Òô“˙/8¥‚'á3G¥¥{Ñéô˘§tW≠.!i/Û/`˜Çÿ¬Ê:√Ù=![+=+Ò¨€lÖµ÷@}`?cèäˇ¨?h∑Ω®Iá¶’†§g`“”éK'ŒìÃØ¢Ç<(òãƒB ¡LEê*·>§7W£";≥ﬁ,Ì 72)ÀPÚü»˘Í‰ ®ƒ≠Â«≥‰q5I(√¸1zg%ÖLîÒB#ÛÛ®ﬂΩ˘}⁄<©,‡û9Ôq≠íıXêèÙıÍ lÜ©∂sÆ{l¥¬@=GÛeMÚF›`ºº['FDå¡åû: ≥œç-È≠úüB¥ƒƒ7¢&|Â3…»aiWØ©≠aﬁ…X±˜¬íïQ∏W’îÍBPV∆mß?0]cØ8i‡ºWì6t^¨Âm∞Øæ⁄j≥7ú`í;∫ån¨ª√ÍRº≈ëò”,∆ÛâÜ–Æ®&EÜò&On™ıyU)¶-6…BΩﬁ∆∞>C`F\|∫õëñÃc’`≈ï„IêQí±mTmCj1˚»◊Û£ı æ•&·ïŒMÉ¡BE¢ù∑<_˛>¶4ØÄIëæƒùQ∞/€¸¡K˜ï·ﬂ!V9ØÖúü˛PÂ|e^PÿOõI˙©]ÃO?E_ÄÇë].Õe˘◊7ﬂbçôoÌèP	ê
L>€MÚã÷"◊ÿ´ıÄ‘geàäÂqiås5¨ì§?*$°
	ÃUÅ
2≈#≠jà±&íT7>5u#˝ûuçÙ£(”Ç/âa>Öc≥ŒS„◊N
î–ï«@4˙˚ˇÚø˛«øc/™‘m*o‰àÑ Á¿@XãPV@Å¡åã∂wxk≈7‘úRSsJ?]µ©8Ó[ÈüΩ‚tWc˝Qu˙ﬁTß“≈˙Òß‚ùAı”¥¶O 8ÿ1Ùè¸C◊ò I©Å∂)L]ª¬‘˝§0uo°0»∆Û•aÂ÷:S˜Gù)XgÍﬁ•Œd˚˚Qg
ÃPgÍ~œ:S d÷è:SìæËL›OWg“≥˛ºU¶;Íè”≠5¶L+1cJ!û
3Uivˆ*Œ[€˝8Ô$Y∑_¿≤=∫Æ∞Ü≤
å-ÏvÎb£ÚD>®∞o•îÃÀd0äø#ê]^ØÊb£2(k,ÜÆQ¬;V;y≥ãõﬂÒ!X+¢Zf»kG7ˇ5ÁtîïV®v¡ùpËx™ùZW˜ÊwÀ–D=H≈S–‡f•ÛÊ'∑m•g≈>Ü5àÜì—A6ÇΩ,"∂™§[-®ŸÆm¸Ä∂±Çü 7≤R„Ë°Yr®ÿ 
-∫…t£ÇàZ]Éˇ˝üˇˇ1\{òËo¯B‹¸]vvÛ{√Œ"*a|QÏ_Ì{ä‰"'{ïˆ¢>ËE«X}-I1J_∆	ïAŸ[¸Æ¢›$«Xj¨˛-€°ÀÎÚ.\F‡yZƒ~ıâ÷Y‘œc¢ΩücN˝’âÀÕ1°s(DeÏ6Ç^®≠¬@÷…©~Â"èÌ.:%Ã&]Û~QÏÑRÁ±“I+6ﬂV¶ó ¢4”§ˆq¶|ã˙Ìbu>ƒYŒWj˚∞8Ë—+˙Á≈≥Â⁄∫ÿ®!4îµsFk;ä 8Rt‰ é$qéEÎ.É‡AÂ≤•’xó›G2ˆ‰¯(Á"ÆZÁW\G+YfVuvA7;®DS÷oV \Ú”FÜqÀ\¸˛9hË∞ÔAömB≥Uÿ8åÛﬂL€APºey›íŒÌW^læÚØ„˜Úîœ[S÷È`rÿ¯É˙5Bµ‘±7O˙‰â®d5?"™∞”p"≤ÀG≤≤&ÈQ“∏'…@¡(Kª1Ëug¿.Âo«„x‘≤”Ä«∫‰)fªQùI‘Ï+µﬁï7*¬ªkŸ*nÖd8â2a…À√IòôÍE)à–·˘ƒ¢/∏Ωíù;∆uÃŸéMKoÌª+j' ˜>ôÚÿ´Å≥÷u:p÷∑éóQ“wµñÂõ%ï’ÒV+8oRifY∆π“B`oÙΩ¿ Nb™Ã÷ÅÿSΩï´Õë˚
W[ÎVk6´[≠ÈØkkÍV£˛yU÷˜∞m-∑˛Æ V;,w[¥zæe•ç÷&}ƒﬂ{ Â(Ûòæ˘{∫ëÌ–çÕﬁ[2ÕﬁŒ∞J`sÉw5k˛,ãAmÆô≈Mﬁ∆›e≤]*~íËj˘b˘Õ˙£,|[üXT'u‘&-ã≈ä˝ó{¨¿°ûﬂ’€y~◊ùû_∫Ï\`zœ>…ê7 ¬˜çØjå£¢œWπaÑ±>"[∫Ã˜8Ì≈Õ˙œ: ^z<Ó!∑,√~ÎÅíçXTÈ	¢DY?óµ¶ ∆ò› ¯orf¥;ÏÑ)ƒ√Œ|f«5aıu1œ?'ü˜[˙ËØ"î-»Oà@ÅIÑ¯»≥éÒ=∫ãºÌ\D˘!⁄0~ZÛlı{ÈNÜ∂,B˚zÇ÷*ƒH¿Ôﬂv˘Ì˙>p&Tëû∞ñ€&\OY“€§J§KltÑü—z˜vHxÒÑ#èﬂï%∆}»ö‰<WÖKÑméπxY¯‘Ω€|p/Gdze¥∫o∫ù~zéd:…R∂ÁŒ`¸‘K0$`Lüª…¯√∑NP≠Áiä∂K~'"»nëä: ‚KúE?T+»éx£7q_l∞}9øﬁ{Á≥ææßl´„/*áè¿«∑]Y`ŒˇT‘Î¡!êoÍk¢îqˆ<}ÌäÍ†Àoã[µÚ±q6Ò>UΩÓtKzâZZÊX4-l?í¥˝˙Aí¥\¥ªßhè-≈˛»ı-Íw;"ùÑó„ól&kS˘3 –TË√sÕçXP%äêÚ¶ç {3ÅáK#"ê
√Hîª€dÈiñúGTÓ9π¬j¿Œíl@.æ´)G§w—8h≥¢¢∆0ú◊√Ôœ'I∂T‚»#æ˛ %q≠æuê£À$GøbûcΩt5"ƒ'}AÄ¡9*”T≥µ˘f)'Öî‹ÄM ÓﬁçO«äê"ô	lÛ%S‹
˙´∫Qï£\uEj†SB$Ú<ÿ,o.A~ñvÉ„¸¸}rU~.c∆hŸ`ç8ø‚rUÙ≠<ÛdùÄ≤ me*ÆD|0Ø,™ñ&Æù)µ(Õ⁄S˘M£¬‘‘ #Z;¯≈ÕZéo£qŸÿnúØ±÷|Ñ˚™EÉ_ºXSÆNCƒÕwq√AπÌ·âj`óyÇÍ˚&#‡ﬁ\ÇmÛ÷Å˛å)›Y{Ω‚ì÷BnV‹d”3æ‰%åè÷d˚ÀﬂÄ Ç ”¶öuYvƒd•T‰ö˘ksÃ;˝[Í”Ì„Íè´JhÕm©Àõ\°>›CäÂ\o˛Å&k7…GÈÊèóq≥!çπ¢Ç◊åniùŸ@√ÆÄL)ñl~§?g∫RÏJó¢îê+ìû‘h™èHMe»WÖñ∞¸J∏€p«8ΩS2‚Ω(àHó=êd÷ÒæÃ“·’›q«XrvΩæ ’™Âäw¸°¶•£à§È£Æ5 2≤>9PÃƒ≠{Cπôƒ≤>f˘Ì⁄™5é/í°ˆCu*ÍvI5lZî6dqÙå—añ¢ÇáMb§IÒT?Bj!›
n*ﬂ›û˙≠´°ı[WdËèπ´ÅXoP+π·Hy‡8ÁÀ°
˙¿[J=¥î(*F®CŸ[¿‘õåµQÿÜ„*˜∫§ŸÇ¶h÷‘ÄÂZünΩäÛ<:èè3â≤xñπ¨„x3—ï»Ch∂âöÂ∞Aü‹πÂ‚Èº·‡…¯æês´ﬂYrbù∂!ä˘aY|V∆ö‡SÙıQ|vÕ˙—i‹GLZ–”∂ „RÜz<aIÓ◊Ók¢—–+Z⁄dz–än¿)≥Ê¯≥Å◊ÈÏq§g6Æ°ÎãòÇKL›Œﬁ°€é§EM}“ÕÍ2¸œ}øc˛ªÒ»Ω9oπ"–∂πVÇ-_˜º?…ÙóÒΩæè^¶ÈØ'£¿‡+∑∏BÅ)ä¢_è†URrÀâ≤¯\P∞ÚYAóQ˘CaJGÀ_†¿dÌõ{ãã%∑ÕÕˇDGísﬂ»¬ﬁ∑\"ﬁåmï¨{ƒﬁyΩÁ{ö,Û√&/Ê8FAøﬁz‘J¥Œæ,úwŒ>ñ˛Ω[w¥l*∏∑∑·Já(S–pü…«{ÎDÑS∂ù#Á∆Eu–ó2wøŸ∏ÖK“5  ≤<èíÃ≥$“µzÎë5‹ ’Ô∑9è8>Ç≈O¨®â Ô-∑jÎ]'C–Q¢>ñBº†*ØõluIÍ=ŸÌªÏL}rÖúEÂÒ5˜„ÒU2û·≠•ZÖ˜&IsHg˝!Ï`8ö°¯œ˛`2^t7§lÜ"ËÓ"Èı`:À‘Î≥n±+$˜2Ÿ  áÏ´-E≠&TXSﬁ¨ì≈ôR1o$O£$ØA6∏KQZ—ˆÎn4¶úÀ◊X—ôb:$ˇÔ°◊∆yà∑ﬂ˛ +ö
›À˙pvxÇ6™ù√lÖaπs2`a\R∂ÂgîJüèŒµÓ˝‹ŸÕÏ|ÃŒÉª¶œc“ãzn* ﬂ”≠eMb@≥¨º.º‰‡Ï*∫3nØ©P+sË,∆h˜c±›î˚xÌñÀÎÓ9/Ω˝‘óm5TêB¸Éfæ/í!íì,≠cº∫‰ô^D†´¥éÓ∑%ﬂRHÈ–J<B‰É[>•Üd–ÈÌeT≠πÜz7Î’4ı∂ˆÏö/F¿K7ˇmò§ug/≥ÿ∫¢^è∑êBGÈ˚;7o˜ë¥∆ãá≈ƒùünˆ'πV@Îˆ-∏™ZE1ÿ‡0yœ∫YÑdìÌDyD|G˜Ÿ∆√’ŒÍ*H™;®Ú€«ÒÀöÛö.Ωc√–˜÷hâ%Ω+⁄Å5c+¬Ï‡˛j5
Ú—à> ‚'ÒôäK≥$ñ$¡Z±ò«∂/úI\Ç;ç:
Q¯K+)hìäå⁄éh¡î,±E•a–UA UE©πXFOÈlIjZnÜ:áe∂FÉÏ¥⁄	Æ/JXYÓtH˘á˙9PLèÑkÖLúF î∏≈è™˙'µ≥¨QŸ|©áöº-›º_ﬁXˇ3£;ÊS‡©Ãc€8únﬂd+€àUUwÓ¥›K;£î‚≤ú≥Pqpö«ŸetÛáõˇ◊jÙÿZî≈ëw∆≤Ù=Ç~Ç◊∂˙6Ü>Û0Jö%õÂÈic¯3èbvß`ãÀ•˙ßcëzŸ≤ìçÿx#◊^’pﬁÊõ\ Q‹¡^á-âªÑnÚÕx≠pnˇ©48⁄Ó∞z+6œZÎu! lP¯Ü√l˝ús§À(K¢·¯…¬˘EöèÏ«7h∏≥‡ŸÃÜèt}˝táWΩŒ∂VûªôTey‹Má=X»‡QX˚(≥ÄÓ·áˆµc°-vÊglÒU<Lsv0‚€ô‡ê(7Ω¯∆·≠
¶kHΩ$èN˚qè≠0Xô‘Îr¿¬√G!¬≈úS‡õgÑf{8ƒ„®âußÅ#–¯ËÔ¨È¿ΩÁ◊ç‡8™™ç#o•>U≈çØRΩ∑AíP’ﬁÓ»n(”ÀC–‘∞ø|¨æWpZLΩGï•:ú¿Fd≠j9∆∂πzÅB·h⁄Ín≠–Ã¨ yÀY/bX`óµ∂{Édÿ∆r‹]˛å ‰h&ãÈFåó¡…Ôaµr™Ó›MŒí.<:à€O“O≥hâù¡ÉÒÈΩ(¡§›dòOà ƒÄi›gX%ºá9=Ω,J€K@àV¯v:ÅY>Z√˚‘Dﬁalœ‡PÈèSºYú€_bRQåŸjÙ”ÖâõÙÈ˜óì.®»/ìﬂ`ud˛Nÿä˝N∆N¢◊›„©Ò9NB^õàuí!wpÇΩ.@uÙ˘çŸˆÊw˝$ß5•˛HÇÖAO93¶˙kiìU∑ç@@Oﬂ1¡\{B´/œ≠ò∞´<«∏èbÌ1^∆¯[=å>†ÈìrΩµm≈_Lè$aııÙ[ıë$”Û·0Jz¡]Ü∑”ü>QﬁXmUhÃ·∆§ı÷=ıE0yJWü¬X`®…ıáMÜÚŒPDOm]˘àŸsÿe\ªW¿“·Ï≥÷ÀtAK€∞50'mEígª“EØ|y6°{s‚…ÇÉ~Û-ÜÌ¬>ã[≠®€]"âÖub"åW∂ã›}i·
∏kÀdHhIgêJ◊æ&cÏ=∆˜¯xüÊè˛Ä^ÓÄ∏Ú*Ω—Ô¯÷¿€˝ÕönG)&æ¸¸3˛˘7$0,wSˇ[oÆÏ>˚LÈÌœÍù◊KVZ’¶A
jyf[ñü)7lZn¯Úˇ–…‚òx•I&yéB«  1ßÅPê‚ø?eÉh8≈ﬁOòfl&•Ç%yÏf—ŸXfZÚ‚IÁ›,!yˆ‹ÀÙΩåÎP,n˛Àd|—Z›¬jæ∏R°èqéN#h¯†2ˆ≈∂e9@- eY0GˇÔÕ2H5ôiîçût”Œ,´ÎZ|Slu—ÂGz´Äﬂà†éç˘Fk€iú^q@3ãU	ï)ûW„{úxüò£˘L}∑„ŸÚòîÉ/∂„gjÎ’«˚xLäS˚(¶ÌK‹{Ÿl∏˙Ë ï‰?˜≈SOyÌñJ£+Ùs∂>Ü o";Sö≥¶íáï¢®≈ã˙¢@)s∏ö+—üÆ"Œ_ÄûÇ´/≈/4øvÀ°+œéôMO7…l·Rs!nKÙ£ÚúT#s]µÀΩI.[œ£ﬁy\ÌœÁz°è2iWÀÍ◊∞⁄ƒíê˝¬e£¯â9 O¡wá!É:l]ó˘#§b¡ ÉYÌ∏™Pz&JÀáq6À&Ëwé<ú«"©™ÍRêNü≤?˝ÎˇõP‰N]m+1ˇºy‹ßOM!p±u*+0ú∂Uq∂Z"]a°∂BO%kùD_äô•Bà±:ß˝¥˚ÎÖßB{π˘#W_êiπ…€|#‚ÃZ@Êñ™‹ı)ØnUù¸◊UZæ\Ü\%≥]ˇä±÷T·’≈Ω´ÌÎü∂≠ke∏ﬂ’jGñº÷ër|íóÇ{#÷ºÍdÕMŒÏ3∂7«‡Ô:5_::Eøz2¨9¥-Ì∆vÊn∫¯ˇÀËb™ïo…±:7ˇ À≥|à÷bˆ≈µ∂±Z›ÕÔ∆I◊¥âx	$hä-®§W:È\e¸D~[BvKV†t6ıÍñB»∆ÔP"¨’ ÎÀﬂQÉj‰’à‹ü0
¡—=àÅ ÄpΩzEÙ£Õ∫’K‚aÈ¬Æq!¸Ÿã‚·5ﬂ°8¸¢Öp¡»‹ïömæan
∑µÎ˚45>˝[ΩÍóÍ"CÏE∫T…7_tÜ2Q^YŸ˛Ö!ÍÈ˚Â7Î8‘≈TõõÎ+6-V> w⁄é˝bVéìS1∑∑KŸˆ:éx@◊6ÓZ¸«}≤ÆwÿNaÅ£ıïPï–≥çé¥<ïÚ«#˜né\PäFßiîıv.bxç˚Ë’=8|ı¸cπ@â=D∂tÛá*Œ;'åyø$g˙O_≈p0Ô≥7¸E®ÇL~†-Ÿ~Põ∞˘µ¶ákΩÑ⁄%ì6Ÿ%~æ0£±~4º˘√m\sdu®πÖ£ÄSôÛ?3ÁNAÜê¥∂¿r<í!*QK°ÇH*D¢†Í)ì Ày»Mè¶çUBœ:W˚4S‘ÉUÉ:ı@e|Aka¿mSm∑Óeq%D>Ú∫M∂µª3 éìÛ°ßÅj›RW*l9ˆ¿R°èWU 8ç C§çZàí0√ùRêµ—®JÎÇ…»+TWA?“≠
´By!Á7ç◊çŸø:}WE0!˚‰TB[xh!èG@ñ◊¬›v¡÷ËÂ\Jƒw≤≈IÚoíÛ—⁄¿hvCÕ–oˇ§Œ ˜(bb<‹§Ûª,ÖÀ‡Ó•%±¿"YV∑ÉpG9Ê˜∏f‚2Íï"û0ÔïΩù^¶bp´í≥G¨r÷µ€<ˆ\2¢ÂQáAÅn◊≥#˜éwéˆw∂Ù¯JLSx¡#?^)ß‰;A|÷$KæãHvƒÀ"é∆M√ﬁÊÁKˆQÔ´†&∏(ﬁ"hÃ¿˚Âu.àm¸ﬂlø<82õFY|ñ\¡ﬁΩoMrí›ßpÛêq“çfπ
ì†Ä&∏°1≥ÕFXà¬		√Ñ‹°à±KôÑøÌî?9ô¸ñ∏iúfíè=Ùå√≈◊t( Ç®Néi]u˚(GúöÔ$ˆpq8G˘Y„·∏LÇÕÛ£ò,mòŸ◊ß=Æ◊’ÎﬂF.ıÜî:U…qòì≤#v¶˚8êv^˚9Áµ¡ÆÓ““çÀs∑74œ`	æ√“tÆ_œ[ßo§æø≥£hD„6á‹≠¶ß
Zx;õ˘—Ê‡ÛG∂€É∆A·k∂†pke@T∫|{ì≠⁄¯/ì·yµä˚õıoô,„¶®ªULπF°Àá´Íä©~ˇrD9gó√±ûïN∫√ºŸ6∫%"g0ªkj,k^˘JëœØ€-•¥%T∏<ªY4πJ˙	"ÓcÄÌ`î2Ñı‘àx]^fy:àPB5 §…IÈF{¶(ÔRZÊ:ã~5ÈÒöW†Î¡ú∆√à€e%D8Âw)∂8&›îª3‹—ºä`¬ÎP[Çyı[DÓDŒ´ä6<n7(;",|ñ@üáF>’&¿úÅ„ ∞∞áŸ®¶árÑ{W£å"kVÕBcUŒQ#.<∞FMﬂ,Ó Á˙”ø˘üü‚n˛iÒ[≤û⁄2ã]51»|vZ›õQFáπ=9	k≠SãÊiäá Ïáy"ÃjéÚ@)Xo„1?R¢.ÇÍmÊ–A$%]†æÏju‹v≠ﬁLÑŸˇg¸1˛Áö˚ˇõ˚È;sÚÀâtOª?=Â˙˘Í,+f]'‚ ⁄w≠YöZº~g{ÆÎ˙ WÛ!˛Á˛g˘œlYóˇeÆÍÆÂ:˛gˇÛŸüŸ™~ˆ/pUÌÀ¥p,Wñ#‰‘
ù	ﬂëÂ[O¢IÎù9i´ÜdjõÆ€LOÁ9=˛9È‹Òú<i:'jñ∂™≠jzêòíCá6–¨füÉ'µs`ë>´˘∫"±ì∆‰à]ãõ‰QFÜW∑ÕÚk¨9Á@Ñ¿°ı–T…j31∑©≤/¡6N≥$›T™©ıc≤+ˆ0z»(€÷AGHW≠⁄ñˆ/¥jjﬂMzIVjOX2N"≥hRßÔ≠¨¶hX≤‰ÑZMO	ÆdTZû∞ib∂RkznÂü˛˛ø¸ØˇÒÔ¥ÇvFÌ´éÊ…€`ñ‰ã"ïÙÛ«f±◊˛2/¨˘eôé"∑!∞≈dÈÑk6]d6{A]ﬂ 0\µ™à÷√*ç˘™ë$ñô÷´D?¥ÕÙØQ»◊?Uˆ£Teöí_›¸ŒRåPŸ‰?rGl¢åf«xÛè√n±ﬁÑß+SÑLú√ÓÄEÈ≈y˚’ŒÖº‚ÇãpW™˘(Ç6À˙œV≥{g}ªœ˘D”∫¢à(ô±#Î∂æiË4Ø{Ëò‡ZZQ	◊#€tùDß≠≈z:È¶ˆx+4Ø•,("ËeQÜ®îAŒìSRπ#‚œ¿Ï¿øX+ÑloáÇX,Ü.ØˇßFuwZ2¸÷ı¬?^aÂY*Ö◊÷T.®¨Ê‚VSnVJyÜ: 3QˆTPû©|ÚÂ¿}aÌ°L∑≠˛Q)µi˝Ô	’z›°6,Ú›úNõ’ˆû˝8n√qgÒ_Çÿ	áqrñÄ¿ò6Îéî9Ÿ´8§lTÛ¡]úœ^*tV◊kPç–Pb∏ Á<Ö“˝:EßÒE°yÛ?K¨+T¡%ﬁ◊X+nƒ¢©À&πx¢ÿ.◊ÂMÖF+@¿ıvÂVÆœNa…,Ô¸Ä,Oœÿª_L∞¨€Ω˘áSƒ–F˙·9ÿÏ'˜ıª}…‰Ô∞é˚ÜÈ–EÎÁ≤Ò
Û©∫∑,PTQÚ¥ !uVÿã∏{qqt°$;Æï˜œKPÑR*≈õ/]^|À<çBπ1•ÉmGØˆ}±\ Ü∫ù±"˛@‹Ø %t”~%¶ﬁ,¿!C‘Û¡&y2Õ`P§üìKÀù•Ïyîm≤“¬é'4>°äzä¯Bf∏ï/≥ƒí]„q]£Æµ/‘ÿ"+Å±>ÿ‰![
d§ l≠ÜR≤sMÑ5ÛsvˇÉ.º_~åˇ\¿?n»u2—G›È‚O} js´Ò[_Á∞	‘‘ÉGÛàAUà’õaK"ò¨⁄B∂n;:Hqx|pËŒ¡)Gàê∆∂Ì1.=o] 7¶πÏµ	π°·Î2ø¢§LÙˆÿ!@=ÅuåÃÁ‰í©§˝—uÉ5âBƒ£ÈKË^∑ãÂG|o|Œ´&õ¡ó#∏ûz∆¸≈_∞Ödxô‰…i?^pfIîëU˜Ói∏≤˘AA’<Ek‰T˛ÿNU€i-ûÒ(vgcY6@Tk:[ï™Ω"≤£ÿìk””∏*Ó‡Â	v¬>◊1Ù“(∆“Ω)Ÿå≠_YÎj ˛ÃëóÈÀΩC¨ºÃΩ–Û&â< 0†/ﬁMÚ.Ê}C¡˜DÍË‹È }#(ïPí√—}vøzøﬂ>ﬁFŸiqÒöû„%‡∑G#`e=Â=≤êä˙Ìﬁ|â∑)_Ê\Éf=ã«Ò†'¯∫;–L¨À]Ö@2"9U]Ô¬ê?Ba¥P≥•~Õv0êw¨8 Ñ¥†Öπî.V<éïâ‚4^P<OË5»π$tP“V1≈Û
Â9tÖÄ∫âß≤*™I∂¿Ω aaºú âJ≠NößÿsëQ‚çØq&eLßŒûÙlUÖç9 ∏˝Xˆïêow˙9+<èË~Û8’∏Õ>wAû3rV	‡Ëäáw¸Û?›écxÜk9{„HÇvTj@˚æŸBBÈ1è∏–Z≠°N(∂ÀñÎN≤<-!MxÊäHœÙ¶Q∫ì„-ì`î AáU€+‘>`m'=tèyõ£fÃÅ"ÿ8„äÙÛ~⁄•£nW≠√†∫Á˘Õ/„>z__•ßI?ft„Ø«È®ê»$≤ñÇUŸö¸œy\3åDÀôPØ—eÜıŒëwÔ—-1‰c8ñäÌZ5ìY—¥)ïﬁ\0«ÎAe¥Mß≤\î≠Ì {¬Õ+Â9xŒTr)¿qÌ`ƒgbıEôı m-.RS££+éi—Ì⁄-©[JÕZú—?ÓÊQ˙(‹AOe⁄Ω$Lª«’Î∞ü÷&Ö7õ;^ûË;mº{∑ö±£˚sû2“c∏S∆ª7„îÒ*[d*ˆœöKVv›@#%>.0U˙cò‚üv1≠ﬂpæ
Å˝
Cﬂòæy∏ƒ÷V·Ô˙Í∑¢_wPâœ„>“/äá6ÎKàixµwáÜ À∫pºKMyq«ˆ)“˙ízΩ?1ÀÑæù‘˘5˜3ÜΩ`+àÌˆƒñó≥Ï∑“YmCátoA˝åRöu€^ö5ª?h~Ã•°≠ÅS·(H[ä?UÂ8§óß≤B/?¨¯w◊Í«˘Î^2O1ı‚¢≠Ò”ö≠Ä¨R_»Õ˙îöä$∫ÏÃ∑´òRÏ∞D∫p‹0HÜO¶´ÆWPÔë∑>Y¿pÂAdÒÛK‡hT(œcçÆ[´rîô‡5oT°PŒx…OQ€ëÜD|cç¨≤*ΩÒ~Eø3~<ª:Ár2Ω˘Ç|3»P¥úzP5¶’L“¢,¬+¡ï®÷ﬁª¸jN5Z']õ˛ú€ôúÓD3l≥N˘™'V°¬Ê
ﬂGΩÙ˝ÚU¶O3á⁄#vÑJú¸H[6
GS3õK¿ÃŸ\^&ÉQ›tŸ∂¶œˆY˝∆ÁüØ∏⁄=≈’æ∂.—‘∏ßù◊dP"LåHx⁄7®ÖçD3…À¯lÃéA”ﬂd˚Ñc\FÏ∆„(Èá‡∫¿Àãå≠á5Aï8Ç#BÌ$0'˙πl6/_€ƒj„1±X,¿¡ˆÕ†böÂK˘]†Ïe’4ü≠ïÄ¯ºnª›ˆ	´etg˘É¸ gÑœ‚õáﬁÿ%wXzjAπˆ…¶nPg¥ËKaµﬁõhHvj“JöÂupxÛû§6=:ªcÚ¡™êà„∑jÈZÑÃõµ«VÍ®BÁ–ãm>\œàçõ≈
h¨√mØ≠´p€ÅË⁄≈≈üÍ%@±ò‚ò{’∞q}^-è¢åJ∑Ø*Âi_jÈ3÷æ(0⁄ü’8eˇ¸ˇ⁄†≠„ü∆ÄR·µ£°˜4¶¶r?©a]¬q\	É>Z≤——÷™Äﬂ√s›X¢ﬂ˚êµÂè5»¢∑Egui∑∂~Ÿc˜6ÊËQc®j‰aãw∫eòÖéÈµã{›á2fãöC©Ná—9Vnø{Ç∆Ï∞ƒ±©Ó~Y^â®”ÏT‘ÇÏQë¢ivåøb,[K-¿)î—ﬂ˛ñÒÙåU~ƒdå·9jÜ´•∫™‹’n◊íÒ—Õ™ }‰ÂUÜ $ÂcÃ¯^—2O_U±àò+Z
HGÒ JÜàﬁıT)öT‘G≤⁄øÕñ¢ç9/PS`H\7°MºöÙ«…ËPPOS=‚ÛèØGÿ£∫eÉ∆ãÓV3ÿ®j Ù≠j±‹XFay© ˜IbC3∞(Y°h·/∑Ÿﬁ_ÌüÏΩ>Ÿ;f-ÇF√˙…îÈ‹¶†˛^ÑyÒ=85/„˛OÌèØ∫˝IíYíÈ-ØˆcfPΩLÒ•§ïóI^0®3Q∏‚ﬁïsù≤÷g,¨‡YÿœCñr›µîOÒy)*$‰>Óiõ!Ó∂©/ƒ/Q6uÑÖÉ∑ˇ˙,ı€W{'_Ïæ=8<Ÿ?x}‹9KÜΩVäM•,Øåf¯Œ _§Æljy’V(PVÀ]≠',Æ´,H¿*6~‚]ˇ<Dæ≈∏o§¸∞)Ã˘≥NÛèÑºÒ?‹UT)5ºP@1
ª|lïáçô•nUÚﬁ}´∆˝+	¢âé%ÅZ˜ ªâ«†·,˜”Æ€êo^¬∞?Í‡„(ºÁÈI˙[ÿÌ	Á›–ˆ≤W≈	‰{‰ﬂ|√Ù2⁄ç®|m_Ì”I∫üß¶kÄO6v3»À»/`∑{UNQd»‚øÇm ﬂ†Q$¥œa?¬tM)Q~¬◊nñ˝ΩÜâçB\î¸
pTäy—c”`?ìâf*÷p\„4‡vÂå5≥
√}hEX[ßsZ“}– jJ#–¢““}Û-∞Q4{+Ë‡'∆€ÍØJw√¯UzcÚ√.k‡ÚÁ∂oEÔ£M´È{ÅÙ“z∑'ó8«h)°ÒA√f≠˚.ﬁÿ~ˆ‘%or≥ıZ{ñÛzBe«~1!ì·Ó&y[=c¿∂=F …ú¬)€µ∑ªø}≤ç¸^£W∑Ü⁄<ea‡ 6n<`EBÊä»%Ì≈£4…€òÑ˜√ˇA/€äùa¶&s≈€ﬂ9†ºÿ®ã)Æ)aF¡PπX9a1¥Œ˝ëóiå¿TrÜnú≠ ﬁÔª] Ì+4z/áıA16√óFå<Cg∞¬¢ÀÑq0`úb÷Ç j Ú˚∞<—6∂ù¿0ûÿ$›ÙQ#¯ ù#j˚@°ı∂dÓ˜8sf›ÃyàØm“ñê:ë„ÓcYIMxÜR¶E'¿ÔºÉvπx≈õÆò‘îbz»êÛ§údÿ˘=^˘~2X¬Sê¸ˇì˚å¡)*|˝÷≤˜¡ÔÂvÜ'XN‡éÁ´÷™n#‡πDÀzg|’8√ààPœ«qoë˝c	(—ë\thãóéSo›,om¸zËsÅ†ÉÔàﬂ3~ZhR⁄?>8&€ì¡¡qç≥MNÇ¢SRdóXúe∞!Ø1§ãìQÑAYù≥,¥/1˚<_lw&#îÖ<–"éK¨_æYRRP4îz°ıÌ≠hhS_˝∆m!€L.„ﬁ["ÿ€∂ñ2*I™qÇé‰¯ﬁÚ£sS°?ë!nî)ûtn8¢ äƒøù/kÔm+	≥Y#◊ÌN¸õ÷b“y@2ü"
™!3Œ¿à€l|ë•Ô9q6o„Ÿh`j_≠§l7ﬁ6ﬁZ<Ä ò≠Clªx»a~z(Ç,<d´«ªËTƒÈÑEîbä≤l!ê∞3D∫ÀÛ4Íxì_-ó‡ƒÑ2ijXÿH„H∏ÖH˘LºW⁄&ƒ¨7\z°Â‰K÷-™⁄≈ÕMRÏ°ol[»∂'$ôm+TÊÄµq_õ,o6©àW◊Ô„úÂÍÆ™ ÍSÆŸo†ÊO‡t∫ì∆U)Akü◊∏Ü˜Ë4Ä^Ì•Ùr˙∑qˆâ‰„ˆ·öu£q˜ÇòÇµl~‘•˝∏Û≠é;eiÆ-ÙäÕE:ŒàœGÒeúçQnFæ–çÑåºÑ“; ”®\föÁ	fZIM%+‡1M__Ç
¬∏¿N∞úÑã$p;£,ã>hjz_Ä7!0m2ÏfÈ01Q6k.á$¨	›Mâ‘–Ì>L^Î›k…xqñxBö\°TY#–GaçûÅnôÁ—9«√Ö°õ$ö.^wÿktLb{í?wﬁ5¢∫;4ÓËæ[Õ jhN–[B£&óµ,¬.n∞Ù‹‰[¥kg†Ö?‹€È‚ä§æk`À:t=ke7Ò∏’Î4?èM5Ã±â«∆Ï›èﬁíΩ%∂QÃ¡[‚víLGù)Í˜π%˝õßlçrÏÔ∑^_â¨˘F÷UOh°ŒÇˇNù≈à£I∑»[ÏıV^Ωb_}µ941~≤∂Ó¿S$ÿ$ÿ^y4àHlB4!C\¯æà}kUhêF‹íVÆ£w5AÌ&§BHl–ËTnDë1ì\˘”,ÕW5rVTs	B3π˙E∂M∆Â<Ú<â˝ú~2A†¬≈+â˙∏Äh›ø8b;†Øá˙I´¬ô E˘L~Ω>ªà.§¡åˇ"√aHnø,¶5‘X8±Ÿ3`∏ã‡∞0>¥P¨hX¶›çæıWöÑ˙Á.|ÚÏ÷_◊‹]h~ „ËÕ°ÂP3™B≠¡t°2hPX√‹ë¿à1k¨•≥ªaJú+yáî∑9$<>Õ®ösı‘ ÷ (¥If$Ö7À
«∆Î∑_…Áu¸^Î/ÔÂ‰D/‡dW B`Iu¬AÇ
3?⁄¨h$2j6aCà˝yhÃl8(#–·ë]¡ï'˝–Ha∏É4ÈêÉak` ˇAAv)Ëv‡Xà–'^≠d‘Äê<‡¬}†(∆∑=π€û ˝‚Ü‡‘§@∂·`äR?Ø<‰mp®6TR'-w<∂®ì]ø‡SecXrù9bHÎË~õÎßî:ù«÷˙iª>lkÖV?˛˝∞@∑êlxÂ™MåW.-s‹;+Ô^›¸Ó™#"^öáìì~∫wµ…6VCbË¥PØ«‘ªñ(˛0$ÓJƒ¯ïCÛ¶Ó+ó¿W"hÀ¸˘ã´ÜmàfÛ∂*Ìl„Âç†]™yœl…©Ωî–Dò6.«7Ë’&ÖÂñòw;ÃÄDT7ä ∆utøû˜*s\&¨Ï¥V∑∆'õ√Ç’Ä∂ÑÆW»~Øñ§,8'ü…‡™îÊû'‹
•TeóFn˜§Fp]+‚ˆ'π›*;»ñ◊ o[8¸°yPjc≤<∆˛{ì<Ê∏®b ª< ‹+ÓmòÍf˘⁄Ú*nΩ©°ØjÖî⁄“RÜJ‚Â‚ˇr]—œÖ¢Ó\iß–~y@≥V°N+ã£|´ù>H´dâ_Úû˝uI¡;–ÈÔ†ƒ®ŸèDéMFnbååYπ@Øpè≥4Çÿ&eªıõŸŒ*⁄h,©≥¬‚†Mπg›∏nÊ!Á€$}&ùñ°i/ä$ÎTBçˇV
X%
¿$ÜïØp’èäUgΩ¥ÃÄ±ØÖi Mí]–ßIòZ!7œú#‰ÂÆ…≤Ç,†6‰´*Û3Ñ·†ñmÖñø–’ÅœI^¡éçB¶Zj5vÜ∫ƒê≤vm˝0jmafŸ@¡ÕÊ_∞F¢˙Ö}±SÌ€ÑwÅJTGÏBD“P[˝Ãh2ÀU¨'ªf‚¨VÿÃµÛ©¿z⁄X5SáÃÉ«0öÎÄïRòÌÿßÇƒ:¬qô’È≤Í˝÷®°?S¢¿bÄ{Ã	_≠õTùÈßO∏G±5¶êˆüIm⁄ËLª-@1gLhò! –Áı¿Æp^ÿ(ÓcU6à∆Vı/0≥∆Ây‡≥·˜$ U“aß÷@~’»ñ¨b˚4p*t`ÒÉﬁÉîu‚ı/|°d=}/∞¯u˜"∫åŸ·˛_1,{ù.F«ød¨÷f\3¢;0]å2ƒöR°!U*ΩÆ2-	c,˚›S‚˜«úÔjÏΩdx'Y‰⁄Æ÷G££óC)··)£±Ê‘∏æ“∫]….H÷ìn¥ÄmIoï¿|;0‘ ’–ÃØ&Va~È∂ÔAçë1Q;˘IM∫ï˙(µ(lﬁ~™˜N
™Q~q$"Ìâ¬–ÿÉˆıß‡πU‚´KArøú„•6kqŸ„Y≠≈tÕ3ΩXü÷{ºì~1†I∫-èó›™õÚ]¶g≥âiP˚–fÀ¨Uo‰î ©Æ‹î)/gk ∑*ﬁ÷- ÅXQª’dÆ)V·™\ÂDûû Ö4ãÛÙ≈U˝ë'Øó‘8ø¸uÍK‡ñó“mVr¢DÿFa~ÕÉ”*À0&˘qt	ÎBÎ¡+•Õìeî◊(ÊÅy£È@6‹*g ¸H§´*©‘ñ£fìS±ô¬∆M∆h@∑√OTÅó9Ùfx®]ì 8ºdQ0JÃ≈Á)Ê¢”íÿy>â≤7g¶uEΩlW≥@9ºÇ≠¡Œ· ◊Ìz*$§m&±∫e„(}€ã±r6àÙq&ˇEÀ∫F2Ÿ!¨‰«dΩÖ*«o·kˆúhµ3WV¨‡0ﬂOúi≈9+;W¨Úõ¿˜vº|qŸâü±÷˚Ã:â\◊Øm^ú–eì˛ ?Â™”zöô€ÔÊ–mv⁄FJﬂYK+
|òùDW!mô˚Îü6ä“ûÂ.ÈaN«póë©·~≤™g1~ˆ–Â'\#Å˘_àÒç|v≈Â<cÍÁËLœr¿Æ®TRûuŒJFÅ0s·BÿΩf\g\F™¡ê;5Ø∞ª∞∞F∞P–^Cëzãƒ·Bå%LI[	o«Êﬁzmm¥u+Mû.£˛E≥)5ıQBù[j∏àQ#t MÄ ÄÒ‰g1º‰Ü¶8-8ÃË,≥miïQÓm«[√[¥óÆl´QÛÕ‚¬¸«$Ú∏y˝Ì◊rò_ÎÖ§Àx®fJ\SM“j˙4"mºªoˆÓ™¿XSg∫&–¥˘´7mØ~◊yckÖœ~£âkîqŒ=Ä°ãMZ÷√¶x
-Fó¨õ$ πYﬂ£<Õ;v˜B5Ã_C!⁄”≥è,IÛû4P⁄Ë5P:ø[±\—⁄õzƒ<~Ÿöb«Jõ«p»éGy…UìOa!9»{ê°ﬂ-ÆU3\x
BKíE+—(KØíB(‚ú‹¸>≠u?Œ≈ò“≤ØŸ’Œ‚,vìàÍÿÔ!&∆Ösﬁ@f.∂ÁÁ„UÀ∞∏≥Á*pf€œä,°[xzΩã‡K¥Ùƒ!Ü$<ÜÜ åñ4EJ/g\Ò`xóõœÍµ6Qf@ﬂY@	âQ ˛„ﬂyf∫a˝À‡™(˛t*ØY>ãœûLÛÓE‹õÙ„Á„·Q|Ê ÑÄ¢∏°ïpNæÑ–∂©«Â˜bNaõI~,Z›Ó¢òîøäáÃdoÛ»¥}◊ÔExöÄÍÙ!	[	H>™Õ\Ù¥”?ÎÄ:ˆË?∑ù’Åaˇ±—6°çâf±áiﬁöÇàÛ>ÿdÔaœßÔAå∆ŸW1yªó©3p˛é@Áx∞ƒ˙ÒŸxìáó‡ôﬁ¯B|Cü·0ÛÙƒ;Q¿˝p÷©s^µóöˆá\Éa…µeàÁcåœƒê¿j4`√`¯∫ÇO.ﬁRÖÓL√’6Qµ6Òö≠61ïÚ0\R≥î'Vî}-Rôp˚9„‡òˆjO∆Ì‘òIF˝≈ƒì¡º¡Ìsz’Käœ#{°◊S5uÚÚ∞Í{ø…T·√ƒæÉP∑‹~Ã•o˙e<ÜÛÛªÂ7Î´´ﬂ.XíEÍ∏†/^_Íaçfo®k≈ÛÊ'k—˙∆∆∆∑uÖwØ˙≤éÏ:|§Úä—(u/'CvıËﬂÔ“t ˇb∆zoíE¥u÷º…ö˘¯C®ßd•∆Çt¯˜íöøj¨‘¸QpU'wÛâ^æí∂ıñóo%nù>4◊Œ∑n”≥V?¸ºí|ˇ∞ Ë#NõÈ≠v8µk+_¢®ﬁ◊∏ C0Dÿ¥|Û÷%NÑ¯ôo∑$Ÿ®ÇL[Ñ!Ï∆}`ÈŸã,†Ì—∏ÈK√Ûu∑Rç»ﬁ@ÂæªXm5Ç¶Xp#hÓÀºswΩìd›~¨£#≤WQ÷ïaúMO‚˘,∑∑K3’|!óö&∏§…1ë∑)‹@´∑I…uç*≥“f(<}m·äîEÂ&DõjÃR
=Ê∏ŒÂ˝©ÚÓNWD!≈ähóö,^7)W°Ãx∏S:I–‘”˜∑Có ÓM°€K¡ÌÌYö	¿p\tMÖÙV'.©t‘ ºß¡Ø 
î◊4ì0Ø◊Ô¬$ef$˙0’‡•| A,i‚Î&√„ˇ,∆=§ZND»pŒ[Åm.ª6{Vl√an–hvÆäÎkÆ‡9√åÇRIZÉã=Ô∑d∂®ú»úæn˛ÿKÔ’ÌÃö$∞9of◊yôø5À¡ÊÈz›ôg¡fí±ŒI∂ÒÒ∂Vû:tÃ^⁄ù‡´A:Ó}∞›“»p55∑î”`Íà\®èiv·˝‘ƒgvWﬁOôØãI∫¥OjÚokínõ%œ
«™òæ“Å=∫wã-å`œx:<I÷ñÎ1õò™ùä√Ò˚Ha-±ƒG∏fŒÆ…∫∂Ç5?œΩébQ®3ßyú]F›4∂{ÿ÷„¿x0h=¥‹ÒÕLo•#JÉÉUf…D/îºé·Œ‰Êiﬁ∂N÷˜≥ƒ hTÿàO∆leÌ´ÀnaTòÜ˘ú,åKÌÏ9®≠Ìóø‹˛ÎcˆÕ˛Ò˛Ûó{lôΩ>`«;G/_∂ÕtL´˚NúJ„Â59uc}=†hu•2¬À(K¢·¯…BÉ∏’É)©ŒB’√ÇÎIÀ∫¶ï*‘çñ%wTùø∫—RW´˙·É:¸2Ú IâOzIu(ﬁb´ á’h[°—Æ◊qúsŒò:çÖ.>÷õËê4≤‰Tìﬁ¶Æ≈Z–~œeË¬]O·‚∫û#ØÎ¡C¸—˛§›?pÕ≠≥ÃêΩΩ wÒØ §≤õ?XÖ!hOC8V	qdÈØπóﬁ¨´Ì&5∫ƒ£i∫¥X7+q.p÷SZgMü≈ùhBˆÛU3◊?rî)‡‰ÈT7i<cÔéˆ~æ|r¥}ƒ∑NU#(±ƒ‹„(•!ﬂΩ‹~}Û7–¥t¥Ωª-k)Öï¨Œ ÔÌ:`ÒwŒ]⁄ù„∑#?ıd,P~ŸîUüQAÑ¶ã´¢´Ï∂Ñ(ú°îh1&6%»≈_|Ω‰≥{Û∑œ˜ëON∂_"qpŒ˚Ø∑_ÓˇüpÀ7{Øëæ¯Ùÿ.‹”ú6tÅBó[¥?∑VàØI•ó„I∑Á9£J·dãˇ-õIr<)Ìéﬂ_úó◊≈=∏†[N\n›4¨¥dÅ—[T$OπG8æ„d4∆F‚áY⁄õê¯eú»–‚ë˚f€QèO§Èxõ|™'—ikqT‹Øô#ä9ø.gÄ#ŒLaÁç%ˆDAP^\MÊ,àbï@,{T∞.bîx»Vÿk¨
µ¸˛˘ﬂˇ˘Ô˛QÃ7®“ïl{¯Àø˝€“ÂHÑ∫–?ª£X{WäÔ˜ìÈÅbj(¸Ë√È√{¿F&ÿ˙¯—Ç=æ· _[u ∂U5%T¯º˛X‹m›ÃAñIï@e?–oXÎπLÆÙ6≠{bj8S‹d›‚ç∂Èó[VïsÎb£b™@,ÿ+ƒZÒ%Åì/Èñ,våë 0*%j√3mt;6NM`NñûÖÖ©’s˛|åèN∑F{Î‡òeÒy¬ë[@*ŒiwÂb{Â ÷Öà€#S%Âs|ƒ‚‘ØÜkUVØ™%ödk@k;B›3Vd˛“ŒX§„0#Æi’)Î~ˆE0À>ùV úZ”w∂.‘W(Ú§@Úk‹±∆˘dê2X-\P†»ñw>èzÁq©ı
¡Ç6P|˚ ¶äÃºÙ'V"Kz@h∞ã‚÷ÚcÔæ∆ÓÓ@w[∏'Ëe˚⁄?ÒÖΩ“J˛ˆn·≤⁄`¯±,Ê∂ì∫+rôk.Ñ∂5ègﬂmYÂ“v™Ûõ	,A2˛p}≈¯®°VÊ–ÛÕ[#Ë-j ®£ãô3ZÛmùO9€sÙ*πPV√t%U`–i§Ò†Évù∫™ì[$ÂP§Ô¯f¡‡/vC£”¿%™⁄∞ô∆¨öàÜ¡O5ﬂDH·J &E∑òçñm:TïŸ3fªE+πã7≠QÈ\ÁØp\5ö<NEˆ"ÍÉ4äX£ŸL3XÚ>ó*∞éu^y/’§Gêù˘M˝mÊﬁ.zòq…!ﬁ)ﬂ™ï&Ô*!-\5hs‰É¶4‘rê≠Ïáã∫Ú"¶Q∏{—f ovlµ8_›¸…0ÀïpÖ‘ÓsÒÒ™ÿ.6¬⁄Oˇ‡’ù˘@Õ9<í5‚RùGroç`E—C_Áâ¨…e~¨Í,u–ª«2ØN:<D‡m&Î<e6*/n«˘öB;é’Ü-tÀ≥ƒnÂû4Ä{’e3W@{?R2≥;2`z|≤˝ÛΩ∑Gª{G$bîÜøïñúõÙäÑ\¸ËL¬Ôyπ˝|ÔÂÒõ§˜Ìu}ö©;À‹õ∏ø≠b⁄‘Ñ®≤ÓﬂF{◊<b›…UK≈ÁZA	";•U`ì8Jk√÷◊∞Èr£Êû#r√nS†_\⁄{øyDıWçô&ÈﬁùBí∏amóÁ#"_9é¥`¯b—ı*˚Dÿæ’(™^7™€=,·Ôõ¯q√m¿rÿÎ-æŸ =XEÏ…Ù¯" ‚ıÎ Ø¶πMzÀkè∏EN~éeO1NÅ©£⁄7uÁö[£ÿ]µø)ﬂÚóΩÜ$ñM1á‡≈•P”Íô‡Âé\¬é»ÀÔ“•Ÿˇ&â~yçÛÌ—»r-U¿Òh?XæÊÔkÏ:Õ„Ò/#©pµmáa%L÷FW¥Dæ]w ,ôÔÂêÒ~≤UÖ◊õ~⁄Íf›I£('˝K≠_E`	~v?}ØRÌ Dè…¿R*ñè…¡XÖÀ“Õ2ÔÕ{ò—·˛)Ï^Co∞ÄŒe˜6ﬂº¢∞=	gO,≤∫ÛÆT>·èr”y/jó≈≠Ü™…ø¨(ó-˛Ω™TtÅ™˚1ly¥FÛ◊o2+™ãƒ∫ÍG√nl@œÚó©OÓgGHZøL∞◊"È3≈M∫à.Á∑@√_„' <zÚ‡·Í“eÉ>yÙp’∫Îy‹øh”¡≈{Ë.Gªs-Ú â@/ì|\Li·Lêà¨`*[„Ã´:Óâ\ÆÖQ‘CoÛ¡Ëä≠~πÙ˛4Q-ì¯ßê\∆Ω˙÷8‡F?9nåÙóÃlüá¥íúP@RZ-˘WõÚ´6}g3cZ¡1›Él≥Æ›˘(úΩWñã‹)bwﬂg0Â-˚<ﬂ€=ÿ9˘Î√=v1ÿ5»-œ/q‰ûXtù>≈s K/1cû˝‰˛T@œcxÁœ9••r™%£Ã¶úKûEÉ§ˇaì°’ÇtÙ/˘˜(Xo≤µı—’ó∏ﬁy2Ñø‚_TÒzì˝duu’ìﬂ–¡1ßö2Ö^È≈+ﬁ”N‹d®1~YxVD÷·–R/ /‚ûxì ≤‚Ü«eœÙÔú]#l,tH$'Æ≠Æ˛¥x-™çr≤¸T4>NGu-s¶ö≥i°B·3ï!®¢>S*‰Y˙^–Krÿ∞`x\~YÍJX
cà˘òdg∂µ =øÇt˜©mu‹œú•ÈÿπŒÍà◊iƒ*q—ﬁûêgú$øµ‚‹[∏\õ®P~û,pbvß‰—ΩÇ?ñ#\√ÈFv+Hÿ~xF‹ñ‘£Ë,b€Ÿ8g?œ¢—E“ÕQ©ÛAπê.ªsÍË‡õÌ◊'{lwèÓÌÓÔ∞vp!Œn ãÅì˜æj≈‰teTºÀhÈÀû¸ÊÌv>Œ“·˘SØåVY˛3©]ÙóPÃ Ù=è˙›õﬂßãzöπ3∏ÔW¥p°'a‰ùÏ–â–ƒµŸ’˛6™ºÎ6 U1≤Ûã˜fÒeícª∞TÎ/6◊*¿∆\€)Ô¢Gu/€ÿsÓÒ2πitÓè| O˚âd
k¡ Ä/˝π±ﬁß˚ ;¡yQw£S®Yxz<9sO¢∑áQ¸ËùÉ≠11†˚”B˙√ì›«îV|sÆ≤,~$’∞,q/-OπÑBÚ§ﬂC’@qçÑÎ˛‘tá∫°ÃÍí•2 ıhogÔ˘˛ÓvmPEòCwÓO•&¬√ûﬂô˝ì‰¬e†ütWQ‹Â}~±˝Údõ"qèjª+ﬁ“†«¥G≥uºÚıˆÕﬂ‹¸_æã(K≠’ô6Ω“	~ˆªiÏ‡6SDâÕ˝≥)œ‚ÏÊHÏq/ﬁŒs–oAçä6Ÿ[ﬂ5√Únñå‹êåRëˆ”®˙ÿŸd»„&€$>j⁄ü¸ªã!†¯∑+fﬁ˝÷≠Á¶Ò≈ÆXº≥©ûU≠Fv¨πqjÄ&è‰.SJ∞57LâCÑòìãŒ0{ «›Y®vÅÉ‡j
&*Ç¨⁄ßËÎ&∆©úÜYMT›hxÂEí?HæîàFﬁ°ﬂZV≥
|”bŸ≤&ﬂtπ0˝öR~öÿˆ÷‘düMKôóë3®üûßªQˆÎØ≥æØ£;∞‡Qwlπ≈öE‘Ù»'l;?û∑¯ƒ.±”I“ÔΩH˙1¬€ú5vq˚äP?û/∂ˇ   ˇˇÏ}›o#«ïÔøR#ÿ+ —∑fÏX—h K≤£¨g$KÚ$É¡∏E∂§ˆíl∫õ§f"ÿ˚xÓ”.pÅ≈>¨˜%pÄº\cqÅ<FˇI˛í[ÁTUw}wuìî4^H<"ª´´Où:u>ßô¥à.‚ﬁdEÅ∂π˝Yîº¿&G/æ∏c?•zDƒ88Nãê‡?¸"&~bÇ—ŒùÛ;ùÛf¬‚hÔÛH
Œ‹¶¨ÿ˚|*≤‚Æ˜˘å+’&çaV7)óã≠v}eUît-–æzÌ¯’ ∞}Èï{e‘´eçYÖ·(e1ΩÓH)ƒ¥∆ä Ï¶¨πB$Àx’;Í›‘ã:¶∫±Ê∂øL DM˛ÅÏb≠HbOÖµïËô	%◊è\^53I…ñ.#eâä‹^HY™Æ·µ@$q0Íäî:˝.Î~åH‹‹ùH)1QÕÉˆ§üAıeù$JvNôk#õ¶ñ¬DVÄàP…ah {Ò8Ó§YY•»ä/9í°Å√jÀgã"∆GèÙ€$∂“™*ît1€}“-º—ºu™ÙüJÉu»òíàaï{ΩNÒïD)Wq»«&ÄµŸæ¿Zq∑Ó©∏sµˆ©]dÚOEß ≠§‰	kX-<‹∂‹_˚Äyœ’z‡∫•Øw3Gπ}√€ã˜Óúf¨ØC7‘êvÍ¿,]ﬂ ^∏€ÛA—J…•!øª˝+&•ó28ådìÛH∞∂·æHË»pÖRÇ°-ü5∏’GQh"ñ2q∏#˘ŒEö’$∂•¨U<»Ejë3∞”YK≤K~õ"÷ëÒÔKêSp§ñÒè10ÏVÑŸ˜h3eÁìΩ†"—u›ï|˝ TËÆ∫f~êºEã>å˛utÚ’Ò<π±v¸ÜN“øåì,ïÓ⁄_˘Ó”˙ñwÔ≤Ó!dówöÖ∑_1Ÿª˝ë5f1BØ1E©Á»π˜ «bˆ}o9±7ÑØÏ£`"vs};z¥``Âÿ¸›˙Ä¸˚πÇ H¢ÑªÕU	ã¥UÒÈeÂ“=îKS∆‹9ò∂+,a ◊ÎµNÉP⁄Eˆ†U/Û˛cÛﬁ:®m=ÏEÔ=ﬁñ≈¬W.GW1´˘çOf)G	’]	Ko∑¬YP8/.”|hCîwË”€ªÏBç°Ê$¿— cLb&‹*ÏûéØã_áåNzÛú∆ôa°MéûLèOª,4DPˇ.l0¸´@70í h^Iwx-´˝Ú:óQ≈€ßa8=∂N¨_-ÓÆßs/®E TÂ∂¿úå£	sÑU±nî≤µM≤“´â{Zàe,è≤H‰a6µ⁄5’ÓÄ.{gù”Fì#ıe•"q@∏Zò„GM—¨ ƒûŒ—7≤ì5¨	ﬁÔ/∞≥¥⁄=À+€ßO5w0´Ö2ﬂ‡=$}pÇ∑ëF©ÒNë¸PtF0âP ‹ü¢¯ãñ(¶Æ%V±Ù@n∑â
ô´ﬂÁÉP!ï]=0˙Ó˝¢PJüŸ*îÚ7˜,œ$ÓX$ã∞a¢≠ƒ„µ8F`œÅh›∂ÛHNVµ,O„Jmû†ûMˆ}m√f∏ë*À˙Z3·~∑ñ»7«Í6ïd7†9;I™í~~æZåŒ9‰dp£5ΩUªØhW∞±™w%–zŸB
´d9é{ƒ:reñbeVr•DRˇØ8w‡il¡@PÁe#KØÚß◊Î&ÿBÍÉäw·ˆ˚ÿQ0H(Ú˚o7À  DF… Ö+&Ù#2ÄÓtYQáÓæ8ƒÌ€øú'm˙E<l/{«Ø4TÑ`âB^ï3YÜ¢,`…ú∫j˚L‹&¶±Í1Q=$us)I97Óâ∆±`∫õâ}Ñöëù.ïC≈õ≠É#1ä€É¸Êm^gá•Ñﬁ 'ÊNqßdÿïÓrï¸|!f¢Å≤ô0 ∏üÁ¡Ï%ˇ}∞wÜqèåzÖ`hßΩ"Äåì~{‘•zÒrôH`¶§¯ß(˝å…∑∑?©ÇËúîMsHùá¥0»5¯|‘O∫†‘Ìπ	M’e$ÃªsUÄ)x ‚ÇœWcı‘‹Ö™Kzgÿ´†˚GSPoµk3*k E«VÈ‡AçRËºKe˜0{∑‹N;±U≤iøóom˝~ÁÕÓ·◊/NèˆyWÛ6\◊∆1—ÿ”]/ﬂO‰õ^≠æÆ‘¿Ë∫]ÒŸ“'DÑà•É(¢kIôûäÎ⁄áQ52î›∆S»^á∂JÅÇbî,‡†ƒünH®ˆÚy7∫∏!‚R/"î âÂ Òq^
´avjÖ•r√A©ST¢O7»ßüÆol,≠ØÆô·É©ŸQèml5iCúJ„ öoÄıº¡†πGqòís»û›$ö‡lcD^DÃ–QËlÇ>›ìVÊ>’µ≥;guí*';®æDTu£â¡·Oº•HXúvàKö@w£ÿßJ√Ú2¬ts≠êû˜gYíA&jé^	S‘)Ω⁄¿óPI{@∑„[Úà0†cKn™¿º2.yçÍ£ñ/\¬õ|5|Gû∫n-P@ÄÁ◊äXVD†Î§Ö*ÍûÂçE›”ØÊˆÑP?˜‚Ä ≤rî≈êπH’&∏xéÎöyo.P«‘wVêí	è⁄t$iãp¯8…±\Jj†˚6YÉ≈Òåçÿ §%Ó∏!T”ÏDù8_‡côpsVA#∑8£2ø⁄ôÉIÛ%ÃﬁaZZF 
qktE™◊é¢Ó¸¬çÊíf‰KñïHjj¸"ÈHè¿©≈c-~tU:ÕÅÀ[•4ì¿mÀ‰CßÉ(î càﬁÈª≥'NÙ⁄«L¸ﬁÉ,nßwªÊ¯ƒÜÔÕ˙L∞ÿ_ﬁ¢t0SN#3ÏÆ´òræêg≠±èg%ø)Ø=˛`·En–ë»ﬂˇ˘_9 5eÈﬂø*$˙ØË_BTÃ3(	Ï&ı"ß¸mı·æ¡á‡ò¨å˘Å)y®“BÕﬁãﬂÒ:¥~f+AoÌ∑2Æ˝ ›!>’P˚û´—ÖP⁄Îtö {Ú]ö2]6Œöü'ÆHπ¶qØTû F£Hƒ’Êkc‰cCcFZ“:YÌ%`î‰N¢î ÔHL·^@“Boâ∏ÖN£Y£^ƒò •«+]+à¿'c®|Çı°⁄s¬˙„≈À‰–‡@nsQœflQDy∂üí}™ûf;>©7ÍDÀV /`•=ÏüMR1f~˚È«y÷I˛-ú=lzı>ø`<}3àºáî<|'ﬁ˛HÚÙÎOÇ®2◊jÍHàŒ„aÑ‰)®Sõ8En4a¢MXÕõ∂l∏∏î¿*≥%ƒ≠ÏÆ∆ìf›wt1ìõmÁ-Lqp†Ñ›–ëËWBfÉ5`õsÕüÍ˛\ÈæYhïf@QèDÁU_Ä&∫–ê÷—ﬁK™1?OœínLˇA/˚ßa:êæjM’‰ÆjQ7ñéuΩµö’ùlΩGXüÂ≠∫RﬂgÛï ª•ûSí*\µ7Kê6Íî qtÌÖ6®,'¥tPeúf‡#∫çs∞~˙πg⁄Úƒ3Ωòµ4[D”(Z ≥Â8∫
ËJiJS?∫Œ%f`ò§Ä›c	Î≈‚≈ ˆdÎQ39Aï¬òÇ	y#nw(Ee'à†Î¡z%ù5…k%pMàÈôÄ¬∞Í{ˆ<ΩdìÆUa°åø—/a îÙ ˝˘gÜÜÓÂ^$π6„˙ˆ¶»«¢íÕ0Eåå*Ëe•Õ:[pKU€ãVfVã∆ç‹˜gΩm‰Ÿ,’Ò˜πVËÚ~ü÷äM¯Œ◊ä•r#ºFÂrYjÈ©jˆ’àÆ(‡î“§}ô s)#\VD‘6(ï0º©Z∏GgX◊Sh°i1¶)˙Í…"Y[•ˇ£ˇ]_e9¡≠A{Ëh‹ÁNW√pΩ—Õ¨ d≥ÊL
s≤çêÒ+±.–§Ûä§`?[öÎoÄÎJﬂ¬÷!>Ø"à%´#ﬂõ‡H¸ú‘˚D
Ëøá§˘6≥F∂¯–‰%áªQ˜∫*Pa±ükyËåYTo?ÀQ(;∫ßXbËÿ≥‹≤È?ïŒáy&ë≈Å?Ä>Ô8éíúπﬂÏ7näQî¡ΩÒ∑à˙Ÿ.¬HÑ€µªß‚ Î%‘é\’ár9¯0|‰x:◊â€î´çÙd9ƒ -°ìı[¿≤ûØ¢π∏Ú…‚*^¸¸ı¡uK∂á»Gdu˘”≤2{u¡txr•±„É˝î¶¥õ∫Ø2Ïò1Ö÷#ˆdõıÊ˜~öù2°ò¢guëßh-µt Û5fµ∞@V -æ¢`ˆ•úf’¿cT9…≈’í{ßî‹îC°Ÿíáf3"V†jm(&ú+ò @|-œÊÇúœL⁄;Ju∑§y0hÆ®Úc∏,‘˜Úª9U¢HyáØuÃ|d@Û)Mé QÏpYn+¿~≠ﬂøgﬁ§CcYîûú_új«ŸúßTˆ!o≠lkBx&·]É≠Çy›&]˜jgk%ÂÖO=à‚zëcBº<›—¶Ss—™@ı4m›|ìÄΩÖsÀ‹·Ü—AÀghŒ⁄ üÓπN˙˘®{ût{¯˝Ñè®ı‚Ã'jG›6tJ&Ω‰èQ∂õf√8?c¥ä—é‚6†`IïòQ—#-¶;P¬d√<?:ﬁ?9Ÿ9|Û¸‡≈¡Û˙ÎƒñQ©{ûÙì^
M∞6VµÅ˜]:IL«¥':·g¯lÇt¨›˛»Ò÷3iìXGfö∂‘/K}ﬁ¢Ò"˙ãFùêÜQÓuÖf≠Aè·óWÀÀÀÔ≈¢`¢ˇ{îÄÀ˝Ù™µ U¿HS:’Eub˚*πy≠?3C1,cÂ√,È_TL ˛ªLø¶+÷‡Pí
P“Y–ü1¬æπÊ3…ywa˙|∂Û‰{2œfKïTj7	≥=∂ò∏/ =≈—5∆⁄£¡"yÖè|ΩIxç]ÃÅ4a=µÕHn{Ù» ∂Ã∂€ÖZv€Ûxò°	a€£∏{˚`R‹:WTùa,åPÊ[∫\zı…ìÒÂk˜ºK•‚ª%∞¿8ÿ√RﬁŒ“n˜,21Ã¨∆≥0üÁ¯fÉÙ8ÌRk∑∑` >´—c7ÜîK4¯ãŒãÍ¿1D´ëee´FÍh`"ÚR3|_“%d∑?“£äjøÌÀ§É5(‘2Á[°›≥ê˛ ,êò•+EﬂçíE)}»Áa	P◊6…8≈*8:¯OoÈ)H∆ÒY-ä>ﬂ‡≤EÀ≈ï˙º£ˇƒîÀMÊ∂è‚€?A.À8ÈPÌzÏ¨…:
™≈<Ùt6.zokËûô¨«8˙R:|≥û60G›ë⁄FôÏtívíˆ!Â ﬁÿ˛RÆ‰=W·Ç|¬£$Âæ_z4;úøÇò´wYÎÕ]ß'5e«¿’)Æn†´%@-Z#9Ë{–„oÕû]>NØ”H˚ËéREG±ÛY4›rb∏(•B0Ç@rl∞Ã∑ÛçYËQûä≠ˆå/N¡E“PFYÀ;>≠Q›·m$^»aI¨˜.9õ«˙™xÓ‹ˆÌˇπ◊µ‹AD[J¶ò≠d°√¸lRó›∏1º)Ìé¬.‚L$.’P$·Ç)àΩ.©˝iÂóEë«c÷Ñﬁ)ÒcØøs…LS∞`◊Ö∏ua	°’9zÕÀ)D¿7¬ï§≤B˘”˙™íÈÑ≠‡˘ì‹áèSçqÅÏâál∏|‘KÖrhÕ©±øî5„ RíÒ…™h±%)¢>ã5—“√MO˚©Tÿ©kV8K{!›À&KAQÿ¨Q÷¯%—ƒÌQc#Õøƒë‚¸aºﬂÌˇÑÊ√ô0º']L√îØzÀø˝ﬂ ˜¥oo◊÷îä‰ÃÕ)ˇxW€S<7Ëîµ«‘ä`®ç`Y0öµ—Y√≈¯¡?-øà⁄QU‡Ÿ· ›®X∂ΩäeIP‘.Sµd,Á‡ÑñtRBi‹ÑJ·A°˛rﬂ◊≈ºÏ#zYCπÖ¥c*ü_è£óåÄ£
ÑÌY7y}õŸZ]ÆJËj@.∏;Ü„S ?1¥∂P<π4PFÙS√)9‚£JÇ‚óªBW¬ºW˙KÁˆ/‘¢úÈ	Õd{á=.°v¿úM"ÿ≈Pt‚≥ïÎ∆„»÷S≤∫º∫∫fUËúkR„ï±∑ˇ˛ÔˇBNˆüìΩ˝ì£˝„Ω€ˇΩ{pà":¢ªä9:Œ”,ÍëÇ•°¯Ñ“¨ÁΩî…lqÇ¯#‚!¥fo¿Ù<ﬂ¸ˇÌ?àÃ\8w®ñAƒª◊´ËÏo 	Ã∫{ôfD›üdêÊ˘Ì_∆q◊˝V1Â:¨‹÷HPÒ÷„Uı›ß%]â∫.›˛ê%)+¸È«=2Laë lGgÙ[^‘/˝}ïÎv*täH8Ã⁄≠@ÉñB‰,Îqvâ¬Rîc[¶¯çæ`QbÁ∑¡Yy§ú˘”Ù'£Ä¶©∞2Pˆt˚h6Dπ¢iÖ@öÙÃfezÄßA7˘πﬁ√zÚ≥Z-úØ|k∑ì SZ¨8éÓãVøPIÏJR[K.ÒKÓúÑÏï«E–◊v!k8‹Oj9F7V![ıÒ‹ˆAü
˝^\äò«Û@¶‚.»—>ï7# ‘(b–˝ﬂf3≥âSíLTÂW†ƒ´Æı+üTá<Ç7’·Äjóˇµ¶˝NßSÃäo∂Kø{îí›(Àí˛eÍÃî®Dã*Ô£ªÊªQ<åj›≈ÇÔÛõÛñmòZÅN€ ∂8ÁæÂ:-Ã).!;TßJ∆,§UYd«Ú®áÊa^
N4p∂¬ìﬂÓÖ ∏ÛwCÄL´ª_≈∆ï.Áàò“7R‡æëÎÿ
Voæ°o◊Aõº÷˚âdÑ)æûUG±Öøo6ëlw4àfrçyÚﬁcúõ.Fa$‹iÃ€°ıŒ
Ø∑¿¶LhOGt9›·Íô˙∞'8¡]€à˝÷<ÉÑåÉ∫0/>≤È8/±˛`∆¿“√"æ|Uå‡è
’¢	s¨ﬂ=¯É“‚9ﬁ=E:4B=ö&¬>be2P”$Å"ÄQ]¶±z$óåâÌÑßœEçıÄ);¡	]2m%ƒf¥∫((X;åzåïâàmıN˝$ı∆OJˆ|V≈”úñ“(˜ILæA¬h…6ƒ^í“>z‚™Z˘	âœûîéÂ 3'„§—¸Yy‡ö˙„ü∏CbÃ;¶JAw;–πzk}æ,†F}œ#<~òY—°êπ–8ÄÍñ›8…*¸É©0 G√˝÷Y:å–—@’` »-ÈÔÖ"‘˙êà≈Á/;Ωgƒ2|!ÚF ~‚t˘â3ìWoî∞Qè>◊∫WI˚ Ñ,.lKÓl“&G>">S◊V&£œ}ÙëæîtËñml^j¸Ã›£ÏWˇÉÂüT∏5Ú/)3¨Sãg=Uá‚5ä Ø(ó¿—ô+U&⁄«tﬁiü-_@£˛ñ(ÚÏ¸±}_ElwL8‡Ó  Ãµ-BºQ!ˆë ÇiFK%'Ñb÷åà©´IfDsbm9sIÌä˘ƒ-?0Ÿ®#ÀoB"íá#õÌÇâcë·ÅH´Ûﬂ¨èk“næòåsµÈ¥5‚íÕ(\+b)uúùËˆÑ$5FmLÌ˚
=1ßmÈÿ◊&áHãD…Z(\∂1˝æ<µWò~∞¬<µ8&È	_=åêd·hª∑à$[{˙T#$)ns∑ﬂ∂ﬁÎÌMµgª√—í˚˙•ÇÚ˚T¸æå⁄b‘ÆÀ$qD	ûòA«†à„Ü—–√Ü∞@ËŒ&!’*πé¯YE@Ãs K_øµEk≥⁄º˜˚§3º¨”îtèﬂ3d˛†åﬂÌ•W}ıI◊$9’?≈Ôÿ–˚ fÁHπ°è;∞ß[àΩß? ®˘ÕΩ3RY(uá|d0Àz≥¸6LŸö‹¬n˙Ÿ∞ã≈Øi[õZrœ"∫∞\m∑oefP“≠u ro<® w!%0™Çˇ•Ô8Mƒ’†π¸û›R¸‡p1ó«yjå®€tÏ KÂJ˛˚•Ié.6zÉ˝Lıì·)Â?)\4o	rŸ0_˙ΩR<£äó\=e72èçP^y=s{µÆ…Â"Àmµ˚ä|D\oyøªi/›áueË+H.«ø7©î≈Ó˚ø`Èî ›óAw˜£tó∞ﬂ{˜/!UPÉÆÓ#ev‚ˆ8˚Ä‡±˙:g≥¡◊¶ˇcU∂qÁ´·;˜M∆
ü¡GΩ˚Îä°ó È9V√Í§+ÓóútÏWîﬂ=:–Áe„Tx&ΩºùÀ‚åBcîÕbÇ«Ã{GÙ˘H}X6ˆ'…ÜÔø'¶˚ueÖú§$ãóÚ§ﬂŒ“~ÚG&*Ö∞ã á«}4&°E…(Q3.]^©·3ôÉ˜¢˛(ÍbÉîÆùxê&9Å> ÙÂôú],õû@€î%2xë◊Q‰±9.‰+‹∑Õ32˚âí∫É£$è¿DQû”—:	‰˛Áp<ƒ¯”9Äé\4ˆÄ9BßŸ!5Ë
üP™∑,ml*Ù_|û&ÿ¡àyªƒ∑á„òZÖt. Óµ%]∞8˙ÈôzJW3[≤¶å’“«Y¥,ÆÆîX∞ëå9GµŒ{õ“9°‹b<÷Èüvd÷Íy∫Áî´0hf(µ4ò¥P÷ ÒíõR—®Hºoùbèû§—È?t(Õåíîò6ç∏6\®VìJ6'Î‘	ƒ»√|•†oamÙ#,xû)^ú1RMﬂh˛∆ÀqZ ™Á@kÍMuíÙZ—àƒ+:√Fìèœ:†§≥¡‚I¿æ∞å",dÛ£Öo|”ß[u}Nhd©e’È*˜Çär‡$î7Œtm®∫ﬁ“¥
SO†é∞‚F1böA˛nt˚'à‚Ä¶¨Ú)3‰#I#p÷¯¡«YÿEÆ’}5Y[„0pU‹r¬PÔ$±ﬁFBV<∂*ÿ;€hoÛpÔ=≈{v]ØÑ∫ÿª'=¨ûFù\´@uq≈ÎÉÒˆ!¥J[6¡Æïp‰MÏ›≠ÒTTáΩPYfRÊdÍ”≈Lù≤≈ûw›VO7± ÂÍCˆ·Hg˚[ÈfKxaÙ˝d!»À?H[≥Í‹N?®t<kûx0çXÅ,îRúPÙˆ∞ûãL¯á∑Ï%˜ıˆ˝˘¡}&Õí(µqÄ„ÉŒ–µ‡¯‘OE¨áXƒÄkÓk ËAòA‚3Ïµ¨ﬁÊá∆ﬂµÏ)˝.-pπ≤ÆZÜÀ§IP¬⁄)>“¢]-≠?&•?„âhj√ÑÑ>H\Ñb` (ß•9PŒqºÑO–Ó”r˘Älæ≠ ‡AœÒX’£J|l◊,ú¡°ﬁÉºiﬁe/∫¶æLª‡Z§ß?˜_∂ãSFkŒÏõ~H`ÀhúˆÒ* `Â›É˚îÏáf4(?Õ@›«Å€Ãü%ß*z“ﬁs√≠8g¥eÃGÍ+œö∑≥€Û6=iÁo∏Oú©¬pÀÌxOJ)ê3¨2”r6;V!Te≤Á¨).]9ıàﬂ‘<¨Njw⁄QU"XuÍê∆íÏeH∂l0-‡∆L∏ê—£?∂=qC”ûHf9Ê≠/]ßèuôIvù–ı:Ã⁄‹v1s»§‘1ÌbˆƒÔ’Ktÿâ˛8°ÔwòQÛè€J òÚ˚ÀhòÔv‘â:òñÌnzV•«{–ÔK]{Ûe™:≈Y*Ùb€ÿ“/b¿˛q#CÙm~n_C>œnî«-[Ûfwüºπ∑ÖáÇ!ZLªRIƒi}∫±@>Öœ¸ü~-◊‹ÿ§è.)ˇ7G˚}yèÆ0Öıò[©\5¯k¿≈!¢GÌShªíí>'di`*FYn+Uä2 Pªì√jÇˆ‹çœAI¢[æﬂNÿΩõZß7Ù¡@Ω˝ 1®‚QUÃı∏EYN•¸ˆ'pJHOÜ˚THèqYb ﬁ¿0É{ƒDv§€È∆ìñïSÉ°¯„$kW3áJe VyCf«ûiûæeì!˜-H¸Îä∑HŸ<ºæŒÈ ﬁ˛µ;LÏÙﬂ"≥Y[jSrÙnóìd>áüwv—YùÚl?Î$É£<Îd„°N“Û…eî≈≈ÃÑÙπŸfÚ<¨”Qÿy4N‚´§·;ê !ÀìIøÕõœ¸Rªÿô ,3gÄô≈‹ÎLò≈<Ì@πb©éÁ‹™˚pcÀ.ï"un{ó¡¨xBÅï«1ˆd€6C>k]Ó*ªbé≈ƒ¨›§òònÕ(w EY≠(n0ÒÖ›N>;›Ã”`ä®ƒSb8™ê˜=ï¿Õ)Ü>7Zã›&ÜÉ¨„Œî9»_Y:*#©:Mp≤ë9tcRì ?®Ω˘Úˆ:-™åoú ˛Ã£Û
ß£aÀIJ–NgÂ˘ÛïwÙ„Û–m^ƒÜõã˜3£©›ÀÃ≤™l/! =¸së$ù∑.Tz	éæÛ∂¢◊ëæÚÉ∑†§‰QE€≥}#~‹Ìkò/ùæªyKÿP˛dòÇìpNYhä„Cr,yÜ‰(íMÀ¯ø≈¨»¶ÂBÒc”äT€5‡;≠ÑkCÍL†mÁ1Ua©Q¯né$Ù_OØè2l:z£+‡‘“Ìtc¸µTu^•Í¯∆§ìju‹=ÖÉ^t–:&E)›4*Mº°gü¸2¡\ 6‰îrSËTé:Á∂yÌ}>E+`ù}‡8»zä /˛$ˇjDÁ }Ç]¡Wñ∂è∆≈zg^»B¶/Óªß◊`H£ùDc®!mÂ_Ω‰H√«Õï÷≥ê¸ùÙ‘ùNÁ4Uå>ûí˝K'[\É¿K¢ëfKK›F’oQ˙mΩHô`Öé§6âhÙ	è≈ûX ÉƒﬂÔEÇ`≥lWø@SÔ7¯√&ê4≤·ªM≤Fn^+S∏YP«Ù}ær¡lΩ[P]ƒ^VÑh∏N≈]EÁﬁ √–ºÕkóõ=úπm»Y¶\“g‰õ}V4§Xç˙uÖ’QÅê™^^>oXí›ãzñ§Ë3∫“gîÆ∑·∞òB_I∑3Ø∫i#∏ää∫∆WÎÙ¶πÌ=@çG]a=ö°g,1†ë4ÒÆºÒÖﬁ±ÀNº·ÄŒ´?lÕ¸fo‹nﬁ»`Û8 ⁄óû{rÂ.útõwÿó!	
Ö~ˇñ 5nb6N—z{;\⁄(‚B_ìµæUÉû‘ﬂ—¶Çú YE‰e˚v~6 ¡yÃyâÏä:@£»Ó¥®5•êA∞#%{–±:hÎÁ—âöF»¶{ôÙEx9%åËxÊÕçΩQ·…‘t´5í˜6+´ÂâO(h˘QP≠QDvÕ∏É
Í…áêÉ 8ãDhì®ÅUõ^$≈2lbú¸<È«‰‡÷Ó‡|∑?¯V}©£œWv_˝ŒıNÏÂu∆z´ÓÄ7b√lí±knË¢«ô}v,Ê&úA+e‹Ã:IÊ÷ôpä8àgÇ
’éc¿®Ão êJÌÌP¡ÿa9úéYfÏ™mt'‚iù9ÇÊæÈÒÌüË<Â≥µ∑I˜¬X9ˇµæA‘È Ç–D≥ÁcÑŒ<g Æû‘¿^4ƒ¨ÿ˝^ÇIûœ˙|/ó÷÷,mòÒ
Ô©˙∂[$jf∑ıï˝*∫ZˆlπM-„a‹ŸÇö€èØ}=*I®\989<¡MrEı∫ÿ^’ÓıÚﬁÀ2Ó£ÅØ9˜+±í‘∫Ú8S{·dG9Fê»õæ…‚v|Fˇ1oœY1R¸Ç6éÚ4c˚@ßß˛;å>˚Ë,yµtN≠øz,àLÀWb≠\	µ¸¨Nì_zŒeyJøJ—SaÀÓr0¯…ÈŒ˚oè˜ˆè—üñ£ãÿ◊ﬂq+ÄF≈<jxıçXS˛ó#Â©ù‡≥¯rÁ≥˝/O^·0ØùΩëVÿÏ£Ÿ˚n≠0Ü›c:î2∫Ox2ÙâvHu·iùH¨ãAB‰zà3Ïri ıXc°É‹∂6gŸî-5å∂Ä•Vö¥31÷v£lÿz•õπ;^ªç®˙6^ÈÄÉ°¡ºG{Õey±õv⁄√düFg≠˘1’}"´YWa§q9Ñ2In%1SSLñ^~[ÃÌêL ı MŒç{ÇZôT3Àà7\a/∑0O`B<≠aÇ˚ØE#∞q√Ujñ≠ˇ:È%˝•´•U6§ßñX™	“>Êt©±êpL>;¿BãOX|ËL)w¯G„"\∑xÔ0+
ºóü›ùå√±∂Ë( ÕgÕ	M\|<>ﬂ¬Õ+<ª•WWp™h‡ú`¬ÂEÚå‡}SÈ©Ö9ﬂ`úg¡p“oÊª&¶÷÷©ê˙ÑË˘)~≠	xúLfz¶“⁄”œ=,°¥Ñ ˜]ÓÆ§#Ê~©±/à+·‘™“c£ﬂéXã{ÙıÎO®¨ì¿èôO6[·¶ˆÚº»EöΩûZ∞í¶ëßXY3`ÅÃÅ/æó8—œjDÊ6h\Su5·Ìd^}‚< 8ÔQ…ªZ˙9Ioà&}Tœôe¥X˝4<+∏ë±‡&®ŒgT&(Á-~±¡õ‡H*ù⁄Ï÷øàøÑî}¯V°ÏX$Éä+YFdFx†mÂ&æˇ`Uuœ<˛\MëyÒ@‰>á]X|™*Rÿ5æËä_OŒ≤H∞ÜX¡¡P¶¥”.ï™áAê„¶öÆÛ∑Z-‰R‹DU„◊}∫i√ÄÀgqÚì:á?ÒCO™Y¿†eÂDÍkD(,_‚©nŸeÖÄG&#¢π*8C%ÅΩE∞r@*ı¢◊ERªcÈ„IT£@Æ÷Úœ≈ÚW6∞næ‚|∑e2˝·’'ÂúyYYôû3’Lõr∂ŒŒpMxÁ<Å3¢’zSrœ#∆=Ï‡v$=©µä%¿÷Ñï∑V^•(˜¨çª‡‹é`3Ùx?zÿà.TY7ƒ ÿ7‘ﬁÛ‡Ä∞#èõ≠éäáe fä¨9˜9PZúnÉ x’&J´˙àY˝bo"øòd∫Õ√Ü?Ωè∏≤5¢!®T¿L˚ :Ä´^+áƒåœSÄ⁄ÑÂÚ—/GQ÷zÒQq	]uÎ®∫8ﬂ«Œã·ÛrÀ’gt˝¡M|îv®Á>ä.x”51&ﬂúü›ÿ¨û “fz=Üãè∆§T†K≤a|Dâ”’âà8ÿœu∏W7ËïL?Oãﬁ =ﬂqÊV.‡¶∫1nÃ6≠ Agz…º¡ïçZÁk0|√Ê¨Va“Ñ∑∆ºrL‘¶ Xº§®âÑÄCƒÃjÏDÑümº9Ø˚ÄõÊaU}RUSJQ4’9’“∫…©¶fø>ÏL+x«}X…'ŸæÙ=`QµXMmu(º$XΩ¥8”√¡¨öd∞g¿MxRXÙƒfZ∏b¬>Q´0°‹“Ω©D∏≤hÎvßOÿ.~¨Ì‚|»ãøÙ»¨ΩÀnÚvΩ&oBGO⁄Ã¬ï=©?≈IPæ_"-ªE¡ ÿ¡≥çú€ ß9? ¢?b"'zB(o$F|%lS5⁄)ˆ·cè±E*qq]GÃØõfôKÜÕjù
π'®"Úhœ∫ÑµÑ˜	≤Ud¡7û≥Q{8 (˚C›j38ﬁ®Õ2˚”"[ÄïY‚v3RÊ›*‘√`€”d‡K{$˛Ï9‚„ zJCŸ2„ÊG√8…Á	’C⁄)@Y•˘¸√ÁüÄÙ8‚âTâî7F˘9$¡úÎîgÇâ‹˛\ÂOV3á4≠}ó_W1æ3Ôç4Ÿ'D jæ”-≥ê<‡$ÖH‰0°fE<£ÙE4L∫ó”⁄D|¥∫¶‰ÁπmÒ8jG©áπ8õ£˛*8Ku7“@X:o∏E„yhaÅπWlΩÁ/˜Ürh˙ÜÅ´Î>+fZﬁÅÅÏyW j¨±hã¬∏ödULa˜sÈé¥xxI˘ñà¥Ä°’ƒ8ã¶.ΩlJ=1"PÉpî≈„$g≈t≤ÌÓª9∑“Fd∫ŸæL’¢£â¡&
o£πÚç∑íBëæI¶,Ω¢ Ó∫EÃ∏_àﬁF6Hü—9Ïwﬂ˘D'ÎOßâÕa—,q_ô†ç>ÊÉ™ìÅÑÑÂ"Uw6@æ•îxñ≈ìîÂ¶,JÌ	@ı®≈}ãL¶øZ]^]≠˚TpB%Ëâq&≤?Hø6iiÒâ •R”uÂ◊äg¶⁄ı÷N7ŒÜªI÷Ó∆"ºé9øÖ˝;(Ï_Ú˜ˇıåG˚B¨î_úÁÙw&}v-¬ÙQ·òûé1°ª!¯I?%G{ü•rà—'*(ô‹\6%èÕ‰û™…œ¡‚é“ÓÌ_¿ôá∂øxGk“|É Má≈_∑ûg†;Àw‹ÓJcƒ…ÍvVõ∫g©L9Œ¡Î√≥o)ı—OúƒyÎËÀÉ”É›ù7G;_Ï<ﬂqz»+gXˆŒ+Äj¿√Ó5U©ÿI:Eπ¸”yÇ_„ 7≈]ØÆÜ¯sPÎÜyœ≤‰"¶TŸ$è¨ﬁsÈí $Ü2Ó0"}tÑï08"K¡UÍÆ“ ∑f«ì∫J©áÙ›∆™ﬁ≠$¯p&ñZâf≈›’“FË6§‹Zæ#´(Ó
◊y»b–ÑQ@~Ìuå’9cïˆ(è¸HH⁄ΩåÈ¢Ûk’L}í"Ö+fŒßñ'ŸLÑ’Rˆ‹€ü‡¡ÉíÙìv¬ Ê˘©h›∑Æäá=ãÉÀjsÂ#≠v⁄;£¢î’!–_Y‹NÚ([9‡<ukÊ∫ù„„ãG3—yﬁºàßﬁyBèˇl≠/X&C=ó7ay¡.ZAZœ”‡Yàk´`FfÂÈAû˚vä	¯}<‚√œ∫ÛÂ^<L;nœé¯8T≈6ëé( Äñƒo‡Ëß√ßFÏùz}ƒß2ΩﬂP_èwπ÷rÔ˙ãÙÒ©2Â5…øõ±H9 äGÛ˛H≠Ωπ≤7gµ;øE›gaªSﬂÙ˝w$˘'«r&⁄pÂhVg…å7’ú?U<Ä_ºLÈ„
ht?öe©T$ÛlP?[ôa|Œzë5e†ÒÑ.˜Ã\’uˆå∫,Ó•cm‘7ÉW∫¢ˇ´4}T/Ã·Á6àí‘_ñìó¨ÀIì[ßYî_Æ7 ˚w˝¨	Âvî£ÙÕ   "¸mXõ‰M4lÏg}†¥ÔÔK1bU§[H≥òŒ¶Á©ÂéÁãÜ1kñù_£Kå4≈≤l˙	=‚ŸãLq‚“ÜZ!L¥±‹&≤R‹ ß9Å
(ª≤ä©_?§3A2<ûr+|eÇπﬁH˚µ∞j]•ˇÜù˛6HioÛ‹j˛ƒr2Œ]¸Âì˘ÛÁ*_<`çﬂK6X˚€_…À∏ﬂN∏èΩñÊkâû/cs‚$KÀQ'”ÉÕÒÇ5·…§ÄQ`˘3ï ”ö¡Ü!≠NBE}ÅâòÊQﬁŸXm ; P.eó=bFL4›£ƒˇª[åï
‚£i(à≥Q˝®˛∏∫˝¸¨Rm9l„te!˝3öñT«zoe`#ÆY‹lXÜQß„†nJïéΩ~w–ç√kÆ¿î*∂ÆÅä!Qî@≈4b*Åï"<Z0µB‚¨Ò‡j˚KEN®2öíc˙Ô@ù[ÿ±ù“”ÑnÎàÓ…h!ºã∆EÖèΩ2ü'◊Z €d¬|ñ»¶Æ.≥"<)§’O·.Éft™£^*“Ë∞’<âﬂ& ë
i+e¬§=`&R≈äÃ0{˙∆π"N·Y¡î≤e*P:◊O––Rµ§á?kÀùeÕ∑k∞ÆE.îßåßÇäû¢)È≈9]mƒ`2”ù&ZbñJ7ï%∂ıæ/±)õß€≠ëÑƒRd∫•9$˘≤F‡¶níGà–‚ª∆ç™ÄlU£ŒPáñö4o‰1’‡Oú3‚•åYÁmc°…2Hº0rI÷¶üKRäûbDöB+~€éY“dîrA4à:à†:ä© -Úå∂On"îº ¯(ç”ˆÌü	=§o ˜m;Óƒ}Ë¥‹âŸÒBO¿ ·Gãd‘í29è3Xp®#‡≥e@vtú¢˚nùlŸöΩY°<)#æ BŸú¨æŸÿ‘cÚÄÏD∑âXE}x\„CÀ:⁄C4Îﬁ/0mf˜(®§¡>≥i∫ÀV]*èπ‰Pr;=B7⁄t# w‰_kÃc5Å3d7©Ãh?ƒÌ⁄’Ü
ú@¡g@=Ã‘¯Dåh6
Ú»˛[ ˚£(ÎDa≠0x°ZL π(-Gü˚Ö}j≥èﬁz(*¥‰©©≥“±´m—$‹t\—√Ha®i/Ê°äUèDÏe”—CÂ∑c”í8[å"p†ã´Æ\9éá	+mnè∑πP‡cNdê€∆zﬂ-Ú)/‰ÛQw5_øeiN`–KÚ&uTS@NÒ(k≥ë|Ïı[V®f”OﬁÛ*h=òU	åËå·ÏqÂ(˚k7Õ$•Ôn¡N¶ÑkrÁL≈ˆ“Cc™oaVuôJªÈ¶∫7¶*boª∑?t€£nvéá Æ<˜◊u<êÂ’k6‹:´Ë@âì{$ÿ¶éR“ª˝s5úç><5ˇ©é2<ΩÚ.¡lÓúèO”nú›˛gü⁄®A^ëªpà¿4p^L+lS®˜¸7å.+#P«ÔÑúHΩ◊Üyœ5˚Îïè»I“√’ÄÏD"Tƒ7I;Byèfj/&Ìî|¥b~f®∑'§ä∏Çrˆdä ç=∞UõS∂L1ÛÇJyF∑åìa±<¬z’x Â…¨ƒR.÷ﬂÌê=ë/i5í:˙∂X{<ªFdæD0®Î-%wÉ‹]$yzñ≈§y∑ÊÂ¯9•5Å&NæúºËv4y 7vî1ãªÂz˙∂Úöª™≤x8 ˙ÓÕ
Î}c“Çù≠ ¨f´Û¬›mLbÅsÀ„a–Œ”cÆ‰-ì•0+
ÜRUyPﬁ«W◊¶›-…∏] ^ˆ—˛y<L∆i~”±¶–Lãíh?¸¨(…ä?w¿$∆†˜¥®Wˆ¸)à7‰Áœ˜´U‘‹,XêÅÔ»Ì¸EîA√ßrDºIúÕ|ºâ‘Peê˜\	ù:8∑“µKM•∏πq∫BSˆ8@í<ﬁdâ{ÆYMe5œ†%ˇ+Œ'Y¡î‘N„∆i“ÔŸ*U…M´y"¨´∏ﬂ·ÀX¥±ü±¢Üqî%T*Q5Ô2ÕásætJΩ•˚Õ6ﬂŸ÷ géT~˛îNíGg›∏C-óhL•Û¶| ]€N7>â§j{Æƒ›>F,bJZN)˝πÿ5ÍéÈ3S 3ÿ!ˇŒ§ˆ&ß˝Eı£Q˝{k	«ˇ¶G"˚«5¥c»"â¨JF‹~]éô‰p…SÛ.ié@J™Hk∑´_-ñÆºâuÆΩé;T≤ı/ƒî>-Ì´ejgG93©!“ı/|Ûõ}z!%\qÔ˙hÀ‘åç≥ÙÊJfqµÛ"Dül:◊À8CêYÛ“1˝%J…Ø»⁄Õ7∞v/“qZL@^7LùÎ^π≥Ú:9|ùOH/zªt	˝%«óØ	‘’úw”+˙∏V›≤√¥∑î∑≥¥€=CË0cáÙ§kÎ†Á#ïûñ¥HãÀ∆ÇZgÇ◊ô.⁄◊LÃQÀ¶Ÿœ©¨¸FæΩ˝Å‰Q2ÇZÃó*g€&˙nî∞eı"j≤≥¥±›O«≥u§4˚í¥∆æ•Ül,⁄>"òÛõIÑ}ÎXnO'Ç⁄çÀ$G∑v™£ãZt’bﬂ9hZÈßöRÉíQ6Ë∆÷Csè⁄9(¨ªj⁄rn∫·5±m˜*xÇ›W 7 ≥«ﬁ µΩ˝ak^0≈|‡}Ùˇ®í«Q÷æÙ‹sê+w·ÙÜŸ»:;[É‹ZµwkÀOÙÍ;∂6ˆ‚ªÚ∑¢ˆÆ\ ≤ÙŒºÃÁ´ÙﬁÈÔg9’∂Nê§R¶˚ 6˘lî∑AÛÑÌ]∫[±◊®¡≥Áù[ˆNqË∞ƒ6A«*™º˘Íˆ÷SKΩ!Ùˇ˘˚øˇyôÙ€Ë¡BË`6sÃ‚5ïIÕƒl·kÎ=§ †R~T$Z´·LOÙ öÔJ˜0MUeë»√Ëö*µÎø∂Ÿ•léæb6	p9U(;Æ~≠ªÉÛ›˛‡[ıçé>_Ÿ}qÙ;«±;îwo∫îYÉ_á≤I∆Æâ]ReßıŸ±òÿi‹ç)gƒñ¥}Ü∏u≤˘·ûŸ)Ù“S≤ÁS¬3ImSÃ\πãµò"´HV¨ö¯>Âé,æ˝ìR¶õ@ #µN?Ít†BdÇ©ÛBß˝z0ärå˝^íÁ˛ÑVªfmÕ^≥Qœ†ïº“|?q·P´Ê<∆Ñè°Æ≠?[nSÛzwvÜ –èØ};Ô889<¡Ω¢dæ”Yy˛|Â˝ÿëkﬁªNö˚√h‡m]ŒÆl$Ì¯Ñ©ÎÄ∫0¿bç7,¡‹ﬁØÅÿ[6TmÂYì!∂Øë∆˛ŸL(œÈÈd⁄XfÓ`Óì”ù/ˆﬂÔÌ#Œ)µó.b7“0QqOÒÍ2` ˛r¶’8›‚|oıÛ⁄å‚œ«qÄK¯ítäˇ6†¯èjM‘∞J˛ï±Ù`Ä˘÷#)9b≈E1ëõSí±P∂0üàôqÀV´£Y+œÊ› -È S6∂ËÒÕå-æ˝fcmEŸ∞ıJ€‰Àx@ºˆòNµm4~√Ó¥∑\ñªgß=L∆Òit÷öSM&≤öeFñ‹îV∆ˇüô)%K$ø-÷z »∆íÅNûh@'@Ò0≥äxGG…µ…5Ô˛Ÿw=0#G©©8@;∫ [Ø	“n)îgŒ´—ŸüS†gŸòü	[ô‚'®ü)~*öö‚G†r”7_F¯˛d¯ŒG}¸NñGÚ››4q;u=∆±ÄÎπIJAa]˙N=AG2eNÚå‡}ì √&N˘Ül“q ˘±bN69%AIbZü]ìüy–—>˜æb'ÍƒæÀ˝X∆⁄™±Qà?√@SÛË“oCÅ˘6„“>x8r<p“«55Á*‹“^÷Ç˜∏H≥w¿RÀ‚Ã`J7∆2Ê-fòb@®¯^bƒç	<=s§OeÜ	gΩ´ˇŸ‚üI5pf˘∏:·H<;∏±‡&À
©«/~±°∑¿	Îy#}™I»w
ÂÚä®K˜ú∏Gl}VDV«§›Æ)2/àú¡g·0¸äO%7ô$Î&¸$-Ò¬kHï≤wJ;Ì6M!ŒdMùø’º)ó'2®æÓ”MÎÕ¿,_≠	êÈ(§é>@?e˝U’ï≤b@-Èv\ø	K`ox ’\	¬´DjåæÍ“Ç¿ægß7∞ó÷H• @4≠Å ¿À•è'—û…ó\\+8b¬∆÷iI*î£3º} 'ÂúŸD1ﬂ∞Ur&˘à(˙k3@@y∂ˆ6ÕXÁ<Åc£’zS2œ#∆<Ï,7®R$fÜjπñ[h‘g°÷Ov√f
v„˛≈w√*¢^Yı:ıµ®±°h¨€/‚˛Â®Gÿ!»ÌZø%˝NÑŒ W
ßÂ´	"q<Y…sÃhMâ„híbgïπ Ê'
˝:¸ﬁ	ÇbàIÍπhd_4Ùé}†¶PQ
„?ó'<èÉŒ·ÍÛ◊∆+1£∆Û¢ †(rÜE∂][ñAS∞]Ä:çÛeÏ<<)∑l}∆Ào{˙áN£í€=ëÕâºú∞Îêk˜RqÑ^ÃÜ°%\W)<õNtù˜÷}'My [àe'V„Ã«1ºn¨
\Ÿ,j≤-"RB9*∂2E?≤ﬁΩ√dsã·€@ Q¥V–u“qa¥.‹lXm≠Mâ*ÿN‰N¬üTõ«T£f¡€é3≥b+Zµy≤IN±Í#¨‚¸R`´®¸Œ©"«äéÏ◊vˇ8è1Èà€óæﬁç∫Ì÷oQP/©’l+-ŒÙ∏pDº&<+Ïπpìùç≤ô≤Ó¬÷_«<‚«”◊wxã¬ˆ¥Zˇ ‡‘¿ÆÉﬁnwΩVqB«N⁄Ãñ}"b` g@y	ö3[¨÷@™Å°<€òª-r∫1˜πΩ@d_·àkV<·Ÿ√à9c%3B˚M™:ﬁøïT∏¥&c¬∫"AàIcÛ0¿…0µá£åÓàkRπµ‘ˆÔ9•ë≤_ûÁé9˘4Ñ·J’Ê#y |C⁄RÈÊG√8…Á	’Q⁄iFIöœ?x.
k6ÓvI™pSH⁄ˆLª˝7∏™ JZê¥jÙ]~›]ÇY≠¿ËŒÄyà˛Ukì!hf±èæàÜI˜r⁄[âèZ71ï¸,7O4»“q‘é|pm;yûÙ#JCÑ"h:iΩΩTÄø·véÁâeo
jÀ∆¬ó[Ôy≈õΩ°L˚^/‰¯æÅ´Î>+f‡õ^Ã^h=Æ,Ç
)Æf≈mQ1Wì¨äïÏ~Æb,ﬂâÆR›dú≈S`µ¡”,ß©Ì†≤>¶∏ˇ°óÕó÷‘∞<FåTQÏµ)ÿ/˚Â∫ıj>è{b˜Éë»ˇ˘FryJﬂû'oÒ™RpÄ¿ª»‘´2ıÜÔAe\ﬁB{˛5wLX¿P¸ Ìz≤NΩô_òéJÔwµ›™˝ªM¯ s&gÕ¡Ÿdx_É99˚´ıúrÿè2O∫ñ∫ëıóDw˝÷E◊æê√e¶_?6“Ø}âr“◊co´ Oë≈]¯!;V %¡Øèø<8=ÿ›ys¥Û≈ŒÛ˝ßá¢4ÉƒQò·se[¬Ì±{]±(èX¬XπI!&rèeè:z#¶{94Zˇﬁl“8<Àíã˙"Dõ‰ëÕM,]¥3Ô®qöOœõjÛ¥*ö¡ÀπV≥_öŒ≠ñßÜ¥I+ZQ8µzÚëà®ÁVCƒ“9˙I;Ÿú®Y’›πˆ'Î(Êb˙jåÄn™œª•ÂÂÜ˝˛{ÚÍ5;[ÁÕK0¶‹—˙ûER∆zHMÜáPSÊ1rû∂∂æä∫ê?kmFçnÑŒ„aÌ¥5ps—∂‹	‹,ÎƒfÀlvs#lÛÈtÖ	-üÎ√≥o)P $qﬁ:<ﬁÂß¶~~r¶~5^$›◊H•ör\cOÂu˜¶∞Ç™≤g}ˆPyMEncŸâC|–‚)™j?Oj±˙Z´œäŸø¢j˝≥öù„5^?í|âìÛ˜ã·˝r∞‡æSdˇâõ≈˚K|Lqµ¥˛¯~‰≤W‰$\P≈+w)∏ôj<a¥˛ûÆ:Û⁄û.î≈=jπI£æº—˝_eE´
fÑYÀº˛VIc.m≥‚íu9%lÎ4ãÚÀıFôŒÆü51›é≤aî
C«z&èﬁ$‹†⁄+
ÓÎ(8‚˛òzßA•Ç0	˝⁄M)Ñªc±qRèRT§à±¶X≤äüô$æ»§'{!Ü®⁄œDÀ‚ +≈rBHßÄ)›‹kS¸T ∞πP\·kº#åTô_€{÷U˙oÿÈˇƒp
 [3ªîulS ¯ãøc3ÆPÂã¨Ò{…k˚kΩŒŸl.ŒˆŸÁP”‘ãì,-GùHk6á{à˝≤ﬂc @ ˆKx„lâÓÏtLƒ41„År‘∆jCéRFr)«Ï	˜›"õ∫Ç≠¸øªe[©Q>öÜF9]ëÍÌè˝5◊lÑŸ$r,ªÈ
H˙g4%·®ıﬁ
∆F\≥¸”0$£N«N‹
§w˝n p}1/Æ+óB∆dZ◊0ôäòQ¨.ê&G“E`Ç<˜◊O-?û8S‰µ@ÉyÏED€(“ÍC^K;≈&W$¢€1ZpóiÎì¡ÿò®k∞&iM™»6YÖêóÑ>˛òG∏tÂô"ï°¨Zçª\iˇSÏ?„J·ËLGΩT‰ù'˝®K‚∑	 Fzπx+kG•¿üseÔOêÏcËø_÷OÅÖÔ©\("Ål€‹˛HR“ãs∫ŒU#ÆqÕIñáõ∆ÚZzœó◊«”®˙R% SGiiãi∂3Ç(<§níGX·ª∆ç;uÁYaï…”Ãòfπ◊·OüFÖO},•MÒt"=æøm«,-5JπÏDù§Nïáÿ≈•Ÿ^ìÍ∑?ë^îÅ¨£ú3N€∑&Ù@æ˝÷¨w†gÄc∞ÖwÄ è…®'ÑcrgM€)fÀrBË8Œ?nFkÀ“®µFûÏ_P°à"¨◊∑õ∫Jê)Ë∂+àOkxLY«zàña=X∂˚]}¶ºÏ‚˛›3ÿS6=PU3„*~r∂8n¿OË5õn¿˘é‹içY.†÷iÜ‹'’NÏÁÉ∏ùD›p·∆ ¯àv‘T7vég<
Ã¬˛[ ı¨%UFX7 ^z»EJÀ—Á~·ù⁄º£w]â
Ìj⁄|tÏÍÿ“úïé+⁄∑(‹Ù"Ì≈¿9TªÍ!ê?}”tÙP«Ì¬úi”_weé$i†Ö+iY9éá	+ÅklÜ∑π<‡CN`á€FzœÒÈÆ!6k'1a»ÿ;zﬁ[WoÊ}mF…Õ¯˙≠+¥≥©†D∏s˚|Í6ª/—·*C?¯F∏öt?h7œ$ÛÔN¶ﬁpÁ|∆∂◊CÊ≥oaÜM˘Lª˘>ª/>+Bqª∑?t€£nfàõ!ûáoò¨ºiŸ∆}b∏’Z≠äùjúπ∑lûÌˆ(%Ω€?W√xË√wíàj≤!√”+Ôƒ„Œπ˘4Ì∆ŸÌˆ©‰DôÖ¯Ù…LòŒ1Ç)÷€'ÍΩˇΩ$Êd8ΩÇå⁄ Ô∑MpΩÚ9IzÿZ nHÑ:<˘h≈¥Õ8ÓLKÎÚ"bgOÆRÏ[_9≈ 312h€4 y 	»ÉéV¸ÌA‡&›©•\¨=x[Á€˜≈âÌ“V3·Ct6!}Ø¨=û]«'_ˆòè]TŒê≤ƒA/í<=Àb“8˘ÖÄ	z¸,Uƒó@y¥Ø„!ØﬂhG›6yäˇ˛f|±∏é¢Ôl„WEGYﬂù‚Y·ÿò¥Fh´2[⁄Íqwyíb√xV4ﬁÚ¥ˆ*MÀ¨+ñ^E◊âùbUUﬁ«WW√›-…∏çÀ^v’˛y<L∆i~”±Ê‰Lãíhq¸¨(…JPw¿î∆ò˙¥®W6V)à7Ï‹œ˜´U‘‹,X UÔ∆ü˝EîAOéÕ«&b_·&–Rï!ﬁouñ®`ª‘ÜäªQ	÷l¡\ê<‹$9ÄÆ·~YHi!œ†Áƒˇ+Œ'Xºîç”N„Üπ“ Ô◊U	J´#Ã∞∏ﬂ·ç†XµF˝≠œXƒ8 *â®ZwôÊ√9ON¶ﬁC˚fõÛ∂µÚô5N<£ì‰—Y7ÓP{&SQˆ4∫®ùn|ï≈¸:6ä‰ﬁ”$+m8ƒZy-äß6ÏG	˝⁄˚ùîrXE≠∏C∑∑t…?¸—æZ¶∫ˆpî≥ä)™ì∑G˝KÏm˘Õn`L/„,áËÈ◊˙çtÊyîí_ëµõo†˝%>;+ ˆÕT;qı”W˝{kãˇ] 9]èì¯JöÃoì"„mñ⁄ßô#++‰9 Ïíàöù8Ay≥ß€zvQ	 ∂iQk1ŒRí\P≈Ü⁄ùàÙ¢º¬√‰"ÇtEˆw?GÓÒ€µ~ÅREJó	›tE›≤¿NüÂtËÉ˙øñO‡Ôˇ¸Ø“¯‘
¢;åú“ë®ÜÓF˙¸b™Q5ñ>1ã∑…Àƒ \&¨1òÁA È˚ÒU%Ü[˘0£›nΩr—v9ÈHÍªÒê{ß7ã5'ﬂ&ÁT&tË»ÆÅä1(ówcJÊŸ≤Ö0≤QYLz9Ít¯M∂{$ïç]Dßuªb–∞OÔ«ZÙù–ì¿.|‰ÓF•·ê2f˛í≥ëÒÏ1»ûQL˚2 [ƒÖÖe˙∞a´-í3‰’HÏ¶%r∆ˇY>◊4k∑pSê$!ˆÙ˙—#•ô\¢*µ$_:Æ•¨ﬂÌÇÌ^? :[ô±\„úõoô±„Õ77,˜y.ÔibÀâªF6¥˙kô∆àE5v ´ï∞jcJ`£ÖRòèoC;≥÷àL
œ-í±X%‡'¯5⁄ÊömsCkúl`h:”“˝æ=È«AˆÀ˛ŸbˇZºÛÕµÚˆÚ¬ºRVâw†\"kØKRÃìV¶‚6Jû˜⁄k°iÁ◊ªá/NèwNﬂúúÓú~}"0?«¸H{Ö®‚èÚ∑ˇG‡D£BíûõÁ1F!á≠Òrõ
Âa‹ŸRS≤”Yy˛|Â˝êﬂ˛v≥◊ÛYñæ,(;ƒ”ˆ“´~7çäRÕ£ŒyklÈ:ÍâKa(Ñ≤Ê⁄Ú≠TS0ëD™è-¿´≤œ—ﬁÁıµ£›<¬ÂCª4¢ô›l?¡ïú|&ﬂ ùÇNöG•†„Ú≠ºC:∑dÕ¸Åsˆ6YU	òkÏ∫àiGÛT*ñèf‚±◊)™idÍ9d‰cãå¨À®n∂Tozb¸÷ë˙û<9˝_ÓüË*Öÿ°VŸÊ‹◊ˆ1pó[≤∏hjt}¢*¥Îì˛¯ áï≥ïìB„Õíã>+k	ã€ÏU#KΩ!ƒ≥vyYMÌ“ƒ—Ëxt†ú‘dÑÒ&q Ä¢ì)æ–>2ÙÖ¥ÿﬂÀ?Ôœﬁ·ˆoô{_ªÏf·«…WE'nüa∏_Ãâd·,P4-a.w⁄1•‡^LŸı2ŒuŸ MC%ùÄp∂ €J@í_(ﬂ<)è/˘kÅ`'ÔIŒ kn±≈}%û@;Ì¶Yn5⁄é¬ìÀ$Óvî“>ƒ¡ôÇ_ñQ’>∂SV?I}à’˘‹¢_/zªtπÙÍ…ìÒÂk‘;Ô¶WÙÅ¸qjÍPMµ∑î∑≥¥€=ãl˝˜`DoM€xø^%¯v@—{NòQ>ß¶&b‘7Zw#*	© fHJ5ñ÷„˜d~_1«±„8¡™jËEŒ™Ê/Ëäw“e‹KY\)C∑ÿ¯Ì!ÏEË∫GQ?÷±Ú≈SüÍ”‘˜A⁄?éø≈˘p7ÌQ)˛õÎöE∞/˙≤Ê°o¨ﬂàã
%ê“˙ä.jk~ﬁ¸q?À“åi/ø!7ÍdtﬂZêÕ≤‚¡>4ªRµ˝y‹ætªœäÒß·´°VÎÚl˚≥(y„†ÙN›•JSU°<∏”n«É!x·∫§õköÆ¡ÉÍ†!˙Æ&‘U≠w≈ò|ÆÚj†Æ›Âû◊5IŒIÎQík{b¡æS8ó˚∑«ˇ  ˇˇÏΩ€n[Yí ˙û_±¨ŒS$´(Í‚Ke ∂ZRf™€∂TíÏÆnóèΩEnâ;ì‰fÓMJr™Ã`ÊÈ‡<Ã–OìËáB=‘Sc0¿º`Ù'˝%'"÷˝∂yëúô’›BUö˚∂.±bEƒäk’ˆ∞6óW‡Õ≥DÄÇµç K	ÚÇA˝ï⁄‚”…Â¿œã±£nÿÙx"7"ké®Ø±¢w ÌìπÊK_¯«IeïVg?B∫KÜ
ƒ∆\@*TX®÷‘ (Ñr1L™"'Î†ÃÁ≤ûájÙ·¯Åä˜zÁÏ/-∞˝)˚ˆÊG).∂ò¿ìîïì∞lÿ#k??œÜ®˘ˆt« ÙRß¬-!ˇ±îùid:πW?ˇ–
˙ÿåKÀUÎUeÌB@™.õ≠¶–“ÚòB1∑◊ò{˜âùH+Å¬
9û˘èîOôO"2´üw6J_ˇ±ÖX±ËÎÔ“è»ãåŒê ¶≠Ô“è\àﬂC©∏÷|K‡ú!IêàRè¥ØPEùKZóE™µT˘≈L©2X©zNÁ€"≤˚ëXº˙VòôçÒ¶∑Í>)≤ô¿´ÉSM7¥_âﬂbêÖu\üT⁄™Z\WÍ˘4‹s∂%TæŸPé3V^w‚¶íÓ¯ÕîÓnãÚé6≤ΩºCz(Ø;8ÎõM`¨*˙ã”&√kÆñ£là|é¸°c„Éi8ıK∞«óY¥Q∑¶≈ôT4E-†Î∫;˘Ü’È•›I?UñÛπƒƒ¿wïÏæˇæ¥–{2]˚6Ä@DÕﬁRÜC° ÒûuèÀnäÄ‚Q<öS™íxH´î±fkmWlÖòÊ€äóc®
	P6yÉ†[H*©ΩJÂGzœ%ıúA´¬ß G0Á∂	YãÍà≤4,øuôzDÄ√‰#:T◊_YÅ≠ºÆ’çÁçeíﬁÑ1ˇfJm4/|Uıà pÌîíÅ÷iX√µHIÜÚ gw∑ c_@îÆ§g˘’>™LŒî≤orqPÂD.,b?Ÿ	ÿ:E”8§´–l“˜ò´î£’Ì~≤ê˚é)=Îî"åØ\¡Ÿk%"ÃØ-∫8ÜÕØ”™‡;≥‰°à4¥å,§∏ãâ6<Ù»m^ãD˜f≠ùH\~vX4L£Ëµ5ˆªI+ŒvÅnÚ-&s„π§æ≈oY9¶ÛwÌ0îﬂÇ…h,≈~ÛÊYqd—Û`/X;)∫M!ØY¡‰˙“Mub6ÑÉËd–ÿb%∫†¡I€lò Ãã§	@+“P⁄_Ëfò≥SXÁú˜”MaÚ∏°ì1ÍMxt"NSu¸Ì˛€b'¸•Û"π(	†}cŸ}üå±tıJX D¿ 7ÓÜ%`=§∆0dÃr1È√÷MX2Œ. n]8N‚óE
{¿7/P?ÿ ¶÷c8ñtíS ?V∆ûÄ¨P8‡—èoÁ»·(ÓÒtëÅ∫À›'ç¬≥ Ô	V¶P'†√Êó˚e.¸ŒÄŒÒ∏•˝„ÉcÚ?´áÉ{¯∑&≤ÛFàÆÌ
*wí√Õ∫˘RUc<Ÿxì•t®ú¢◊eíA'ìQr
Ñ∫uV‰Ézç@Y÷-æàık=ä˜gË¸Ê™i¨ˆñúÌ¥—JøØ◊≤n¿Ä7zÉ©∫‡`I{ÄC$çi/øl˜”b\ˇ
ç"gy®Rñ7¡lH%˜¿¥=7ÒÛ÷ 1„<ù~ÄÉw){Ãáﬁ„=Ñd_È”ÉÇÃ∫=å⁄ÅΩŸ‰†p(‹o,ódaî„~ÇmU‚’ª¬Ä†	:À%ÙJA)≤ ˇa∞y“bhW ú∆Ωè˛ïcÃ˜Ñ~è˘Eﬁ™Õö_g±∞æ‰QmÅøi≠û∑ñ Â–®∂m¨kp…†ãvøÚOZr∑∞è*,•uEG∂íxèt?tqÑE9lT#å»É±èÿuü¶ƒÑ‡¶èê	·ãà! étûŸpíà»CZ·”$ª Y˝¨?π¬§◊@Vâû[•A∏3@…qÌ)∑g≈çDé∫∞´Tˇ¸)FKt§Â¯e–u#+2Ä<®%–ÕNÎäa Na–_X{6k$%πﬁ—˚^byúMt¯Öw˙Ÿ`õc“WÃ≈é ÿ\7%ò∏dx‹Ç+∞◊(’ƒYäÃvH)ZÛ´lê€Î3'p∏^)˛≤)B¢v*√ Ók
‘6Ö	Ö˜"≠	Ç·?
t√◊'}»I™ëÄ˘Ê(è”íëÔ¯ ¡ﬂ≠∞R˜Mûz‡bOÃfI¡~J)?J°¿Ör7«>ÄL
!”È¢Ç®Lõ_õZÉ‘hXHÄûVÑØ~õ/èkY°‹ª|ûàYíÕ1–ﬁ>GŸ&ItIßGøQ‡Hæüd Û˚£<g0V∂V™ÕyÅ(^¢WF7ó36ÓK≤•4EJıN –ïf©Ã¯Ü∆JÆo¥ãêl±ˆyÆ!…7ù;ÕáÀ}Õ`OÄπM83H◊Õüqo4˘fõ;	;†dê;E>$‹åb"¿‚+ÿ3≥e±øQ»{‹Ÿ˝á‰ÛSK>Ó
,"¸ƒ%ù=ß’jÜ∏∏h¿õªóéñÓd96‰≠ôkÍÛıdd@ÿ…äN?U∆áG”êÌû¥^Q¥À≥´ﬂñE`î]ëq‚<Ü≈q2‰ph>…wz®/‘a+m∫+ ¿òw∂ò≠Ú{l∑Ø¬—˝~†•”I÷Ô™;uÉz~ó~‹“£C[l”zxÚqî:/‡-„•”t;°ì%≈G‘Îò/;èåè–Ãiæâ◊∆cã-&ÍÖÈÏ sµ’≈^µBF˚uﬂ‚¢l.˙Ãë%Ïpˇ˜ñb ≥ª8hTÂQaıNﬁ©¿äT≠û” ÂÍ€Õ/HŸ⁄Sø–˝—âu\$±Ò≤˚Ûí¸ºgπ∞Íp	o∑eÉsVùß◊z„Ò®‹Z[Qæı}ÅÅ∫)Üß÷.6÷xê…Í˜ÃµõÆ=#X=x∏~ˇˇ2öß¿´Ü¯Ïı—>Jô˘zÆkÙn`Ppãß+ø;1´Œ ¯Ì •4a1Ô¸Ù[`¨´(a%hã,RËã¥8ÃAå˚¯teòØ [æP0ïÅx	‡≈Õb:qSÿ;ÂV∂†Âåcîœ"ög´òΩõoSêÍ L?}k®\GiÂb 0€IÜﬂ≈An	¶Â ıœâïñÅÃ1†hh÷Ãlj?÷ Í_Ö∫%Í∞S†õﬂa—?·ƒìù˜∆l–G»kã[/ÇHãê7ÇV$ˇ[º 7æÒ«°ÇIÆ/OXA2L.‡<∆ Á~6:Õì¢€∫, Bò°£nM?™cQÚÈäZùFY“MÓ≠Ñì€Ñ˛¨nÿu"ØàfÆ@°H„°™)Ó›Ÿ≈Ó§V$K:„Ï"›*·h,Í·<Å¿^Gò˘Ä Ê„S¨D‰œçRPòn˛•õùÁ‰>>W8eÓ‰˝D F˛à¡*C kNƒ“üàaZ	–>
[≠√Ç{U,∆Rë∫Y˘|“ˇn7E≥£=[¿,¯Ì7∞‡7QW0Ì∑w’ÈO0n˝‹¡TªÉÖ3m> ü/@VÚ`¯â’[õﬁ—‚	mV~‡Á˝ÕÄ[øÚîQG_ö˜c-'ﬁµ/Áö4z√ “RÚv”2%ª> 8+&…áÁë¬v€◊\ØóvQÉô/pSnïÆcÜd˛9Æ6ºázÈ˛3∂á∆k^»Ök‘HuVí-æ<K≥q“r˜◊®¡óu“]ƒy§[Át q<F$bhÍß:,(qEO∂Ù–HÊá[?9)í≤7èFiO,˝.*Åé^ê* |8∏S5Œïåö„ê˘f(Û…æıÜ\!IFÑ©ˇ%,E≤ÃaR‰:êÉeú8äó¢n‚Õø04à$pÚ/i√¡ˇ°¶1}ö◊b‘Ì5††2î
ìm'‰¢ê#Rtîúø˛b<©À¸Ÿ«D‰Íl˜∫XE”YâÚ≠ ÖT¶ûÊW¿iÒ:Rù
Ã¯
ΩµÀ÷H8¥§„^ﬁmÂ√pæ∂Á÷G<cõ›÷2Z⁄bÅwÏŒö–ìë‹M€‹oºíj“A8ò“Q0¢+úvx>7≈ﬂÆUî0≤ÛC.ä≥†gü≥gıQË‹z˝ˆöe »∆µ&£a¡Äjl⁄d‚a7ˆ–‘iº±+oØ¡æ'˘˚NÅÜÛÂxÄ{gß∏˘3=Ú?Íí¡<ç0¬'Ô»$1à‰6Ráû‡h@	é¨SEÄ--Ööày„bí6πgË√æ8ÍÖON⁄í˝)V»LK√wæèpò⁄∫…*QCß˙pìåÎNÈ"|g Èïlo‹x`Ä:-_	t5öCG˚≠\íˇöi¨ioºâµÕò!
kæÒ%∞ËÚΩ∆æSÌΩ4âuÄ¶∞ï°ô3|«ï˜xU«Ù <!ôKÆ¥G∞‹§®a“e¶MˆÅQëÎãFEÚí$˜ó*Ib†í;8≥˛}RrâNè)ıÕÌHÉŸRÑ6òØ¸Bâ√ﬁ8%<€˙mhÇ÷0Q‡'âπ∑ª’ÊùÔww˘~©^A	àv6Õ»Î„ìˆ◊{Ôév˜éHdD˜ïòÃ(*vëÃà£X?;;¶S∂Kt 2Æe›w”ä‚]AŸ&XÀÎﬂ%3íuﬂäÑYIøCÃx·Jæ¨Í¨^NNÀq6ûdåÑ©Yh‹Ç¥Ÿ¿6ô§›«dôµ}^¢gˆv◊$œYÓ;"xó´o±ñF}c}˝ˇ@ßã"4ﬁ-KÈòw€ÒüR˙DQÇ!Ì·r˙›Â#ù,î^é+òÖ^=Ù›)‹Ô‰?¥G}raNÏÛJ∆SwÁﬁôX$√¬8ÌlD~ùq√ü™¸Ã∆'éÔ Ü`√{¯zÀ◊~ˆåﬂ+Àã¥K~áx∑N∑Õ|åêv1a>=•êxÄ€z√ÈÌ4È#¢@á/ìqò˜U}Ωi~≥Jr?À CÄ.Ã˝EË%˘«?2o4#˛fm)ØAïZ◊ XÿsP$÷¿Ò.&Kãê«‡õ¨‰û∞∆ÿgßy¿c∞>Ø«†î
Ó˚ ˆytÆ”ã†Dß^¸i0iK8'V‹ÓÔgl©∂·”zf›V	•ı’/0,Ú5r‘‡®ı¶n—ﬁ∆Øn˛e˛◊1“xè÷È£^O'eáÍâ‹QKØó‰C4ÈœUOê≈r‰rN†%N›<´æóÇy›%¶%◊ƒïíaÂ}~a @Ì–àpg¿†Ä°¨@AΩü˚˘õÎk3≈£è·§0F∫£`a¿™Ù€sÊø8aŸÓ¿—∂ÕT∏4ü%2üGü'›Û‘UœìC}|?Íj{î®i=Æµí·ŸÏÓkıÆìC÷J–ÅØÖ3Mõ’ˆ^28ˆùPíùﬂΩﬁ?iÔÎ‡lóÒ)s,l–›r $ÉA≥«⁄ØŸ.– D+3<ä¨˙ÕZ¬‡C?©l∞¬j<øçË§˜ íÕø¢ìM'åRLlpäúò÷ìµﬁÉpßAèáH•Ék±å¥ÄîàV¬HÊsêúo˛9Øπª>V‡⁄jÒ∞á¬Ô≥XY 
Ç¡dß»≤·t1˛™»Ç”,bfö9h˙¶üNŸ ›∆VRÇøAt0[ ˘ ¨N^$D÷ª˘àKêV„üL„D9@÷°\˘Ñ˜’dòQ∞k{å{ìLçëV"∂sxƒ◊Ò˜‡&V∂Êÿ'Å5ã ≥Ç^É»äUó"ﬂÕÚ∏èy)Àq?=Cú¡É1ÜE∆´+Ü‹ó˜	@‰Âô#x∏Æs4õ¶áH»B•≥%c˚Ä ÂOAªPû·)≥Ô?Z"]6ËS–π√"Ô¬ (°r	ÓÂg§¨„o`†›´FT1»åb9‚4zpvSFYJùÍ¢ÿ˛
Õ,O√§£—5Œ°;w4‚„ÙäÒCh∆£øuå9ÄËS¢"%•2≤å˙2Ê!‹®¿¸%¡dÀk0∂3úH•NíœÅíÍxâ	‘˛;	≤™É”rÀk∞z3*ü∫äΩ`æ◊/Õz1î›å–¨Eü+iÿ‡d˙k¶lÚâ\’eRûÕûR@!•FúƒP‘O˙Sô0Úc6m“Ade#á∏æ!€B√ö{œÕªõTnKæ+è'ß§ßòπÁ¬85»áπ@CÁÒÊœ¸6®1ﬂêü‚n6®v”}Ër∆ug›ÍzÎ≥`∂Jﬂ}8}20=	IaQcYî{E9√ìô∏áY$!π„≤i+gÅnqXTVF§™¨∆©Y{5çü  ∆y∫Ç|}“=»ÅÙU“'‰©ÈúRBÁ˙iÿUXx'np$∞X7dF
^ylN£·#öÒS1®
 ∂ ˙\D9áñ¨~˜Ù*lÂãÄãµ#êi´$Z=k.÷.%‘>™ñNôP©Ëmã]∂ˇ·Âﬁ´ì˜/˜Næ9ÿfÛ˜á'oG≠90Ru2y±∞Ù¸<TnƒmÉ∑‚l/K[’ﬂUùéóñ]Xvœ§Ûπ5;üÖEf# ÷¬aÓÀJJ•’⁄]ã „wËû}‡∂∞…{p<[yæ◊¡d¡3Ÿ@4Ö|0âÑ˛À@¨zzmfBô«~ÅzV:|æ›0tÁ¸¿ç4NÌ≤dÇ°bˆKíl∂’YÌÊ!]¬«∞¡…‘¸˘(RnµTÿ)π¬/l√	3êÜê(íË?‡›„⁄ ÀV§«e3xëØ“aAˆèﬂ≈jDJ@Qó∂:4 à˝Ò˝|≥3kWÕ3Î˝ArûÓw–›Áßõ∑,}%¶NcT üíÈïı…ñ˘3ŒÎ~EßÆÀ}íÈ˜íh“ß!@¡ZâùΩW+1;∞ ‹ﬂ˜íqŸç‚–ìo,ª™@ÁOÄ&QOÖ¿‰x–ÙúSãfë7Æ´´≠/‡—ÙÒgü≠≠±’’U*†€ﬁ99∆ãœ“´Q^åÖ+÷I:c¨7!ó˙5«—Z. õ†˜ŒPdVŸÜ±˛1ñCÜb›ECí ÕÛè˚{Fæh¿s¯KläNhv7[L¸`d»ùG∫}¬û(√µﬂ›b%Âwn  \<ãøI(yëg›«¡ëmâ‡*˛›c64ZyÃFh∂ëó k≥Yg™ÿfInL¡AÿP∞ S‡„´¢Ù@íô1√Â8IN∑Í(œıJˇ,§#≤‚âB/˚]˜… ;	§¥,pCn?4¸Qé∆£–°5)1Ï7JÚüç{è’êﬁäëì;ıXò5Àw– |äû’Èò“€w€ı∑Ô∆gHTi¡‡´¸∑˘QΩÕ˜≥R•"hr9um}ß≥ ãœ@ﬂ•¸ì’W‚¬˙‰öaÑ˜|±kpÇç?1=\üˇÏåŒﬁwÜ£o≈%_√_Ë$Eoãîj¢_ëÙoG¢h”Hg®nZpà≈—~[g∑U ·6¨Ñ⁄ææÆÑ¿∞M*‚pîûôÎ
óOæ9y˘ÇûÌıSD’Îg<?-ŒˆÊfÂuÂ0E'•ìîÍîG^∫æ41mÏ§‡®Ö!ÄÁ¯_ÃwÔ6X Ì]F¬¸ƒÍãı'ù"oxXÖ3≤0ãnXP;B£p˜â‹ˇ◊à˛xóñDn‹OÑ7§‚(èiËÙ%“∏É’wh»'Ê7l∫Ω]ø∂V[åójﬂXÊw™FÃ∑á€†œ¥ó…àÔ_˚^U£|†^´g!12æ!åÓ¶çb"oE–ñ“hGﬁ≤Zíw}@Ì(Jd4§ÔY-©€FST,"È3ÀÍ≈Õüƒ∑kj<kØ`˘ ÂMf¿ˆÄs£Á’0a‘ù·Ã“b«9Ua UÕ¡ßù$ocvÏDè÷∏i∑ñ´i‘ ñ5Y°ë_qH5∆˘ﬁŸÊ≠5˝O)w¨πzœ0√-g6Ï	0H⁄˜ç1À3†ùÚ’IŒ´«Æ“Í÷~]„	xÓøßDºÊ)	oV÷k]JÅ5jMöo£E'|ÀΩƒ¯ìkñîŒ£∂ë1 ©B∆iç{È∞^ÁπÑcÙÁ^óÈua≤<Í9…ßG˘eC&Zufg,‘¢”√7∫ygÇüø«‡‘Ä©ˆjw;Qc5C3UèıTßM{”#⁄º≥π ãlàÚÆA∫ˆÌ{’¸URÍ4):Ωì¥X‰Z›µ…ÿùÄó=ˇh}MwË{cÛAJõÅ@?.–‘JøJQ§∂mm ÈΩ}Aã)ËÙ‰I8¨∂Œa∆c8”÷
 ∫Ô•<ÛæÑﬁe~]ÈÎ,æGh1Ü?2„ûéuOéÃ∫©Ÿ ◊ÓJÃõ§U3¿„ÇEÛã-6 ¡Zø¥ RV §…¯'S_§∞œ⁄òª≈\D}waG¥xRJÈJ-ØC!f7ª"ålR∞>SßE⁄≈Ÿß])®Ú!ΩLπÖ-@Æ®Ñ<ñ”l†44–è4í∑`D™8Û"øî™¯«äÄ„g:Ì∫hˇiÒ¡’;dÑË¥î<Jj›ö”`+v˙ìnZä·¯ÜÑV˘æ˝Ü¬Tƒ[∞%G%gkZTÅ∫¸˚l‹tcçÑ√Úﬁ$©NˆäƒåwILù&{èbhπ≈L°m)ÏI—°ùNOMç„∏ûÌ˘VŸRÁh±´’Zà·ı:†Ô)·Ç™!t⁄“‰'øﬁ@¢qí`¬lUøóTºßb/¯P¯fù,0Üg¬ªÅöáŒ°”¿ß7EñÍê‰ÁPá∆’a7=K‡L∞@GâèYDéRR~˜èê√È3hÄ9Ï%@¨Lºzg“å§ñú¶TÖ™÷~æ≥ª˜’◊ﬂÏˇÌﬂΩx˘Í‡wG«'Øﬂ¸˝Ôˇ·k≠r‘œ∆6WÎc˚ÂnVéÚ!Œ≥R‘§:N«GK’Á‹]o◊Å€ãm˘<œ˚i2lòÊ~Ñ'9Õ9√“A∏‹@¬¨ß‚rã:Á7˙)"u>;AR|º Ú4˘¡ç;\}Eç)b˙R˝àÜ›ÂÈM˜B§õ˙h8å©%TWoE–$P§g-æ˚ Ü°⁄
àÿi⁄K.2L)Q+y>Ó•Jåx{≠©dÏÄÃ◊%’À Uç(îqâÏ$7¯ó_}œ·¥:Ö±qÒ—Y/.knâ„˝q:êﬁÈ≥kuHa9Î6ôto&Xóƒôj¸$`	”¸$> ò¿øÁ“ΩÁ”PÙ«àk¬j% L*2®ÑKIÈí.ÄeN˙	=«†‘oh/ÈñYl¡.Ù3Çsú*™Öä¬RÓö
kÖ>™Ê`=úP1}∂ +/ìëíá¯ø€uˇÉ·˚˝≈<_’ÌÒã£∆Y^Ï%ù^Ωﬁ—∫JkYÑè∆Uπı<…ÿœiümâ4“«`Ìªk0\´û"	v⁄êPAñÓ ‚1Õ~:Pé.OŸ4Ù)æ°¢±ú6ÑTâ(&àà'_0¡x]Cñüyÿ⁄àÌ¢eÌ£% g¥07-±{èH>*ª!@z.@⁄‡ßDÒ¶„π∆Ü≥
™3ª—úµÅ4!Ÿ2Ümñ∫∞ûô+ıõßlC?ö:€ÿ®Ù˘µ˛jä*P∏&<:Rô mI˙àêÃÆ;˘ f◊¡:<¨éj&Çs>—Å™î†=y£ıAÚ∏GbnZbˇô§Ç%™◊ˆ‡lCÙ\‹™Q&óÍ¬GÚcQÏËô¨uDÖa‚TË∏óv≤n^õÍaN˙}Õh,…¨ˇ:/¶˛2UûtÂQ!Tsvmç=ß∞‘ìÉ›ˆ±AÁÎXbã®ïX>6BÍyQ@ÒE^ú·w∆J¶5t?%-OôHu8.‚öZAUV◊≈”E_ã+À´a†◊˛ “íì†T¡ö©pÛÇLYç~ÉnrΩxì≈ﬂÁ"n›¿ƒEﬂh5÷,ŒmO@Í≥´ß ﬂr'ëó„˜‰ÎÔr¡WÖo±∞˛ãS©⁄Ruk.?¸L6˚vDáÃß≤Æ˙®•GBTp˝±QG«◊–◊E;öc`Àdƒ≠)<ÑZëÄîç“>»Ã‹†RIÌfÁŸò«Z*‘™8Kåaßà.ÄGgtãx¥∂ªªùÒRîPü\\PÇ˛HSîE
î˘"›1πÎé2's≠ï+*ê⁄2Ëè<Kõ7]ÿ¸ºrÑTîﬁΩÄﬂë?Ä≤⁄S‚ËÀuD?è9–¢3BÏ#j|(ΩRoh‹ÓgS(ÉÃªÙÈ"æõL±Õ≈5•·ïuœêª‹r•Ùº‰Í5e¢n0˜ï¸”pΩ0¥^M	›ı¶ÏzS¿tΩiÄsΩiAr›,(”ß8={òJ/Eü/∏
LêfÁ]ëëÂ¢e28véã¥ÛûÈFÃ»©¯"ûó%êíE%WAèèá	¶Qc—&∞$éˆµ•õ)Ö~ÕVK›x·åÃÆı±Îm±¯Öô6&ú1°@BÄáôx7Ñú
=qù_3“¶∆*¢˜Ä[v∆˚‹ë›X0öª¬ün„◊Ãè§ﬂN†TAÅÜºÔ2©ø51π¡pŸíËÑH_–∫ÍOfÔ$óXõ™‚!4˚÷@ıä7[£IŸ3Kí˚û|,qÆibÑîÈ∂N*±kè[ªŸl◊˛x2¿¯’-xx∞∆Çå"j≠oÛlXGì(Ì…†gx]kVCˇ:†s<–†¨ª –∏«≠€‹p0S{ﬂœ“€[o4L…ŒrÁG‰øIï:0y»—ñ %,©xõıÜ>ﬁ‘ïÈVægi•π6ê;ˇ†O¨>ìACO∑√˚>>ﬁπÍå7¢rø·u˘¨ıv˝ùÒ=ºis€©Z≈x:ÅC]°ƒ~lvmë||N\·SÊaıŒ§(%++ﬂ/ØÍºK;àÔŒ£¸{ï{ÜbÔ‚Ê«>:Å`aƒ!)¯ÿíÕ0Î˜í„’6∞>4À±F:»ÊîN0ÔOÜI)* C«ÚŒï™A˜päï§RN£Z¡X“q±ãgÈ¨‡ÈX)∑Uùó¶ﬁ9¸jmÁ’·ﬂö∫Çªb;¢ÅÇ™˜_ÈÏèÂ‘ê‚l(ùﬂZ»ù—ŸRßäπtê∆»P@vhHp>ê√û_∂‹—˙iX–È ÆcÁ
Î,!èq£ [R$˚√2-2ÆˆykÛ˝í¬◊ïv	}…¶Œ∑Ü¶ﬁA]%n(_?)`
óá*~º†J2ÎÓI†uÅQ√Ç˙úÉZ*úÉÑ<G∏™G£Q[˘hÅP0W£ÒEì‡d Sñ¢è€êX0ﬁ|c~·RAà =•\4g°PŸå;úÙÃM£
¥P<€Ù’Ñ«Ÿ¥Õu[-çeÙ¸Ûƒ*'£xˇ7Ou>2–πåhı-?´eM¸ÿ¯÷]–ÎYu‡Bîa”„:µÏcdÌvË:0r˙@N¶jô|‰Á}9uÚ¨ëo·´{ãŒ¡^9ŸRC,=«ïü_„N±U#®ä$Ïµ±ÚC≥˙º’:MUd√|8†°D{ÅÈkc¯¯∞»¢
>D+Î=Jô.ñ4
ÇáπgL®®mà=ã.M…,$O¿hºSÇ2™˝5'á´&å∆ËnjÙçïë˛0¸√Ûk´´©∞≠W7ˇÂ@ÿ2í∞∞ë-„æ€Äl¨K)˚√ZcÍ4äë‹Xı¸√Ü≠Vã•å‘áÓK´“Ù∫†’†y˚%4ycÃA8∞¥˜åÓñ¥p¯(óÙmÚÛ;≤qhyÿ¥oÃ2<Ò•Î@ÉÖÓ “4∞ ÛHê¶Û¢ìJ‚èªIƒdb âÕ6±È$+<\’æt\q8ø$ÍÕ«Íj†åç[Ó“sπ·£«F0âø„÷lû–J”á÷8¿9-òg7Ñ§îNÖX'≠!I7X¢°ñx¢¡∂⁄°SÄOæí√ÆLüi˘^>EË•xrÉÌ¯ÎØJ2H∞‘‘‰6=‹cÜf,%◊œäTûU6å9–;Ev™îªR/+Ï
UhéèıBÈ øHwƒ–≈0XùH≠`≠w*T£ÀTÅL:(…3“Ø“åWûπøŒ∫zs'?Mk?˝≈•)øRôZ)3π{Ú±w€Ú,=N«‚@±Ω]ó.W€ÁôÍ±DÍ∫⁄◊Yª$˛–«ªˆΩŸëOY)å:ï◊∆≠Í1d%ı®£à§œ∂{;ÿÃg&MpÜ^·Kdå.vŒ8úÁ	√ºvÉcÜ∂DEOd∑ΩÑ≥ç¨∂=‡aE?X‰®-ú…C%)hÙ)í·±âÓãÀsqâJù˚Z;ãàÒÂ¨7Z√|ÏX2kY©î˙ÓC—Î8ﬂ?>8&L´7‹õÙﬂ_êñVèDPZÎy0ñ¿†fŒ"˚4œ‰∏3ô≠¢æ∆¶Û›òÄâJÄ É·jiRêÖ†3üﬁ‰ç™ç˜4u£ËXF™dT”$◊k*(f-◊QGÆC‹ILïè.ëâO£"·=$YânÙÈôdŸaQóËj]ñ»•íö…(Å˝‚J z*wì }¬⁄¡Äa7¡a‰…Ñ£N
ë®˚ç•⁄˝JΩlúD=ù·[Æ="ß[	∫“¡4Gúq¸?¥œ ˝%Ío%FÃt` &•Zz|ÓÙ“§´ƒääæñ[°ÃE°Ó?‰Ù!âtÎ1Œﬁ9≤ÄZAÀ¡˚7tTÎÈ>≥V◊|¯XI®¶ñZT.ˆ8LA.Æùqıπ¶îh˛+ã`66h…lﬂORﬂp˙¡åWV>ø÷é âïsÙ|Ç.ÿœúC(mAÒ]m∫Ç')8!Èˆ’1©¸`é˜|Æ'aÕ	ŒùCËˆá!&,¶“’xP1_ù
zß)Eë∑¶Iu˙ËR%fQÅ†+F9 ·ﬂ≤6%E8UÏÖì(•†@M 1£∏—¿†1‰⁄¶Ω÷X:‰˚i≥@˝∫`≠br[ÍÑC«Ç∫‡ïpb„˙˜A˝É,˝˘5Æ€Ù∆l&·°”∏µ©1†«ÇQ) ZNY!ƒr˘Íﬁ¸Hö˜√C'®HG≥(?¯a&˘"˘!o¡!÷X-86∆WõÂvΩ∞“§
EI∂Ò»ñE$9öï“:zâÛ’∏á∫∫0Ñ_¥v$Ë≈…Æ¥ñ ~8ØÁ‚{e_â‹√æÖ&aÍ5ŒIôÊÁZ¢xy§–%WF%$ö6LWûyxrWKè.¶∑´a?∞N—’U(O;Ï£rXF
Û0IeØX‰~†™:{_Ìø⁄?Ÿ”∆x{>`Ÿ^Y¬¶&ä»•°Qéõõ|,À≥4ëπ=’·ñÄ6y0èÛÛÛæÑ´‹§h…∫·‡û¿FÈÖØ˙¶Wc#4	_≤»>oıd¢ L∫0A053ﬁM∫›∫°≈B>€–õ¶¡Ñ]|D	‰Ã®+`§ÙP^F2œΩPÂˆ∞Ï{*ÕGßE?ƒ]	'ï˜√µ' , pNƒ=ë§CŒ©Ÿ÷¥a
ïæD3	caâ≠‡±úõ‰≈‘ı,Ö{üçı>Á%ÖNP+w∞˘Ìjo?ı
∑k5;§zL◊˙±Ü•zCﬁ2^"†Í‡R?–UOÈZ>ûZ~∂i9@¶~^PÇ%ñ†ó-√–@‰$(p-‘ñ6∞sÂ‘ -;}Cùë7u€‰ﬁ(ú∏rÒ~âMÁ<)ra£éBOYt÷˙ŸÈö *ªiw2Çu*“—õÃq›√§H^RèÖÁj˘=r„ó≥'|ãÙ¬”C+"GÓ∆“aeW>Ÿo^≈ól'ºbûïÍÛYkêÉ»óg∑—YÕ∂®Y”Ö™•_kÀÙkvàäxlb¿ıl†∫öø≈Ë/≤ÍÜæpÅs‰<˛Nz<EY>pOW}g⁄Vó€MÀÙ€Dçei~¨P‚ÙÄ$V‘Xyj2 ãÀ3€ÚáPm4Ö≥2ƒòiIàƒ*PØæÑ\#hë¡aΩ\ã?$S´@2Z"kYDgò%Õ^Z%´èûa-‘¢πñm1˛6mº?êö˜1y¢=∏¶¸–Ùµ\ê≤˚Ë,‚ˆΩÖzvm9v«å7«Y√dÅ∂≠,ƒÙ≠–ãÌﬂmˆ.¸£ Ëv¿¸A⁄|ô»0tK˚â:Ê&îV#^˜‹P3 c¶dAüÂâ¨ππfLK¨ùπ©NrõñùH‘{∆À˘‚Ô&˝L ∂ò%Ê˘Ü◊ÿπn˛É[âÖ>çìë>¡9r˙”Ü®˛‡J¡kÃ±ÎaZ©D/‹√H∏,(îjãb(ŸwÆr#XÅH&If”¶’%≥’›…îx¡.õ £äßÎ≥“•˚U∑tÇÃ‘å3¬õ˘Ë∞»QìãÖ≠Í"ØôéØ~AùJ'71Ô¸5Á®¿•Û‡=Dj…Å≤}Ïlh”23XVîÃb∞ pNı+ÙægáÁ∏7◊W∂ˇı?˝?f÷kgQy4ï±™7ˇƒ÷qMŒ⁄1f∆∏˘Sn.Ú{Z"gÖ=(#E)†oJfÜ(h
¥S=ô}‹úèÀ`H•%|ıœ˙9l»:™Z√¸“ˆg6‹’wf∂∆∞BÛ:˚5{§˛≥˘¿téì{íÑÏm˚)æˆå’¨Z	®gìèÔÎ«ºn¢x^≥rﬂÎ≤±Å∫±htÖG´\∑W–Q∏ieØç!b]$¢V<µ∑ƒ¿Mƒ@;µU»R¡—*bY≥íWª)◊]∫j„#úßYa‡„Lƒ3» \ŸÇÁ%5œZu#!ú‰$‰ß‘e{èÍ¶®mË9Ω#*éH.ry"ê]«vKÅ/¶‚&Ô≠~˘(∞∂2=?ø‘â‡ü•gEZˆv.ÕFía6¿‹ËÂ(⁄µ∂Ã≤ÛfZ‹œXı∞dÂä/òlZ>K∫ÙÔy>ÄWø|¢¶®Ià…Q∆‹√√ úÙ≈"∑
áÂ¡˜<t©,º±é•Ö	Û›ö¬Ozõ~ë˝ƒBS·zª™Tò»å<ŒŒ{8ù49Rı—…ﬁˇ‰5àå•7£(ö¿„ÎÕMØö‚sÏ?däÁ•µ{õ÷D£ÖmÂ\Ω*s‘∏eø¿˚◊¬¨2fg(—[ˆpkÑFÖE'õÛÏ““íÉ´	÷(ûdË<∏|ˆÙ⁄Ù%õ2LGÌ¡Ωñt:ÈHFÎ™_^5ÒøV~Ï^÷Ì¶C"‰Ü$”[Î(gABÖEÕ⁄Ò Œ¶Æ\é0ü#˜‡Faxyß`á" √)ïÎ$˘–=√CnÁª∫Si`Æ"ﬁ‚ÚrıK‘I’bÎüc©Y⁄&Tëmc›ÆC™PmdRÁüîä$]Ω:È˜T∑åRœ∆å‹-6"!?T+π™	x ◊älé&p [i∏ã(FZx!Ó]9ã∂Rµf<˝∏›#wŒ_˘íU,è¨'`,–R7∑öïV#¥›VÑ-Âı”d»+µwπXÂ»¿¬ÊI6ÏÚÑc#Öâ≤7)Â≈ùÚñD;ûªjÅEñptµz?∞ºÊjl¨;´Ï.Ud]œﬂÜÃd-·J¨&©@œf≈¶µñxéç®$ƒ)<+[Ÿ´)Øløë©ax≥~È†≈∂ˇµ·9ÖD˝∫ dY«ÃÑË∫∞∆WSs€%≥~œt›ä!¬…zƒÿJëˆÚs]äjp$rvv”È√û3Ò§3í@!ÅÅÍ÷Éu£ÊúQ_ﬁ&Os–%U¥Œ"JF◊ˆf¥†Ê‡	ç3Fèe'ç¿àP&Ôí”2ÔOÄå¨¬ÒÉ6ÒjÅÚ#Øã,Íq<¬‘ì?FX™C.*=òWS0Â˚Ôg˚Õ>JDÊ¨ûÂúı;Bú De¢˛§ú´/ETöüLô63‚—ÓU~°Ùô~K<µK{9[‹8ô~çæì]´0†>¨(ó»˛vΩµæ˘ŒßgK¬Óaip(˝§wﬂìˇÀA‰l£i5?Â¨lø–û≠?‡ÄqﬂÎeé2À˜ÉãïmÙ`∞‰˚IFúTz+·˘fîg“3Z;Rà£ØRs∑öª_NÊ⁄vA˜+=˙'t<"Õ‹VKùÃ≈Åo	è?TT F©c˜◊E7pÚ»è>Æn¿π›â7\’\x zÂ»©‹˚€G/zÔfñ|üQ√Ÿ[qù4÷{◊¨Râ^~°JO™∫œ¨¬”è\ÈIn\Ié±5
a ∂h}ˆHuv~~≠,:∏o8‰›.ÔÓ_£†πÂ1‰Æ‚Ã~˝Ωº≤MﬁI7Èí1ö◊Yî∆]ÈÕ'ñÊê}ÛÕ÷`PC™¡vÆU´≤à2ÁB·≤[∂g[Ω”òF&îXaq7Q–&ttƒlªÍ◊úÂ¡6≠˙Ó“ﬂ,ƒHÁù`ÿ€å&™¢‹ã¨õûe√s]±ôì?A%@mòÇö55Sº”Ûr§®MNÃ‚Så,ÆWÙ4@Mcâ‚∫¶ΩDíU…˝⁄è£j·@}nq¨Hà	:õÇò≥©»¢".’ãkÔ\" ≈hª6jx≤S3"ƒ%Á“¬˘$/Ç©≥|i⁄ì∂™“8H*àB&Àé°\Ë–Ü¶¡ı°ıÜ$Z˛ı6Êt·Œ˛BÑj˙Œo∫¨&Z˜√$+tj∞˜Ú£ııY*6¸Û7khœ≥  Ò,Ã	í°ﬂîÍÿà™π–	.ß´=6/|ÁƒÊ∞FŸ˝ÿ:FEø¿MÈ™¯yÊ˝‡∞üûçaùË∏∂	ÁA<Zì‰Òënÿ’æ„'RÆv`E”OeÜŒˇÔ¬T+∏Î©‹©;ÓGuï
âöı–ñíñÙ@®Oãß+ái	Ç<oÖ¥b∞‡.*∞π‰«€ﬁ*RÕôjJìzˆWød£¡ÈIµÊÃÉû[˘då ™,n˘j2{¿&ÙΩBî|ìõÔ;A’,¯U≠ Ø5`Cuîh∆¥±'ÔJ¬≠Rwg…ôÄZñ9‹ ©H±M{#Á#T+	Ä≠ ‚Xä)óØlP∞MR‹¸œÑ¨éÓ0¿«x3UM£≥ZE”înOª¬”pû&©|IEõ/ì6√|ãÍy¢?Â<Ì B%’MóL∫mîk""'–¯ì5éù∆-âñ∫ËÖß√ä3Ù˜[Æ¡ôz»H¯e‡€m4‘˜◊ÁP3«#∂≈ÎÇ¨¯`òÆ∞'ø∑XôÕs<Fdn«∞gÀ[£»nµ:‰:\õ)®€0t∂r*»ÛH>µò€íö*õ˘≠ªlÔ”) b¿QjÄk˜fπ(âb=èo<qÏ)EÃZøyÅl—uÃu∆≥iÛ1ªES:"πv⁄◊ôÁ3±ùÇÊUb(O›ï{.§»¥¸,pä¿ 
=!EøßŸÁ∫|áVÚ.˛E⁄å˛·cqME Q<qBã¡ÉÆú¯L#à<Œö–Ë‰@¡Ày b»⁄p|»lÜË˛¨.ˇBG;=Ù⁄È•@€œX‹‘s˘2W†Z/q›÷¬⁄≠ªQm›ﬁø$∞F Ç}M¯ Ê4|Ÿ ç>∫ºªr˛^¨∂Ò‰ıøˇ'´ÒãkÆnƒK3xzÙ9t¿s*√ø Æ`kmÍÃÑµÊ‡h÷3Z•∞õıÙ∫£bF¬‘ò∑9∆Â\âE?M34.B•ƒﬂûøÅøO„°ÃÃM§¥qÒqT¢u•è≤Ä[§fRéŸæÃ·È¡q≤U—Æ4:Û›¢àºˆ†ZdÏrUÄÃ≥®I≥ï⁄QgXCôÌõOÕAÜπ[NA†òûö”uË’ΩUÔ`'Nº®•Ö€I1SøÎH·sªÇäﬁ√tÿ…˙s+z´&Ó∫ﬁ.Æ©è(Ωn?MÈ¸ª‹ƒÇöA.Óy:˙_éNæÇF7<ÈyÍÕÍSå0W<&ÿ]Ÿ,u&kœfIì∞GÏ©rLkÇqb^˚5{éô∫
“@ÇY{ıŸÍ*ª» #}∆Ëıè°àlêüb"Ò:¶hh¬2èr‰t(úbÖ€.ÎÊˆ¿:iB!|Ë(4"§nÜIµ)Ää‘iò„sT§R≤¡°âí"ëO¶$!#-˚ıöy ≠ÙæFv≥x¶H°{‘´∂Ä¢üÙOÇ›-éØΩ’3åî√¯H⁄M˜tx-Îà“°≠œks˙ˆ€{ß„}Â”≠¡øÁU%·ò◊≤ú©Ã∑
áF?™t∑¬?q¸xÄ¿π\}Ñˇá”_Gzb{nÜ√˛UÕœ"!∑)õ⁄ôíÖV-·9≈¯vCiÚÜ˘ì_¶]_∫‡∞·W/Lå,#I»G^¯JÚıaYâÓ9h“Qæ?‹!	®§Âê¿¨ÚSöJ“}ÌE+Ã˜v˜O⁄GlÁ≈>ÊÎ Pæ:xs†n;wwé Q§
‰ÅÌ⁄N>›<TÊ)¥˜rèÌº<|±wr∞"Õ~Ã˙‘R1Î€—™’j…Oõ¶◊ï≠|∂ãƒ"Ÿw¸uùπúYó·ê“î´õ<d√’¢,Is{~$gw≤˜bÔ´ÉW{˛ƒ∏‰iN |¨òópªÓwÔe{ˇÖﬂ79ù-P·¨ÊhÚ}πw<Ôá·π√sXíŸ¸9©£ÁR ’æws@ug∑ΩXR42.UÓÈ7®ﬁ“ü¥wÜºóÖ2ºı⁄*Ì6˚ãZÏÊ4Ã∏∑∫Ò`%Ëvπ0ï€ﬁIÜ î$^Ïõ=.wo7ﬂ—(úŸ<F
d@*{ ´]¢&R¸≤ÂÒ◊â≥¡L∑É‰˜ò«[∑Q≈§Hˇ#-âã˚‚›ïihNUÂ'k=ÌÍFÆ;¿£—±N0ªW…´?	≥(„°≥%KPYe†∂ÃQ°(Rõˇ›ªgˆÈ±@˜Ù%l9‚t‚Ü˝À ÀAwÜÊ_2≤á,‰-R•å„!Aõ†>ŒÔ3<`gD˜ë∆X"SΩË;ø≤ 6V¯Ñ#∆5KÅ5K}Â˜◊d·aW)µÓB•ı)ZÂÄ«∆zØPcÖïX∏Àáﬁ≤ztÌ.§ƒ˚…“0°Ñ=?~Ñ∫ˇ´BÙ;òcÆ ;∆òÕ ∆Ñ‡9≠T=ﬁ_0É§ø Õ‘8h~ceªn¥“ò•9\
–*x˘˚NÅ¸ì∞‚i$∫Eè(fçàªíòtÄáÔ7¶ﬁ∫tî•Ã)[dê•(„lÃ∂UáUTÔ5øÈH´›"©zg[j\≈sco{b^}≤	Ãê:Ÿz»å†ƒÿ∞˛ö√Tçø¯.¥uﬂæcû~≥zørÉ^|oUQ´Ÿ&079∞√›Ø*≠S
°B%R"*óËèê◊òrÿ=32hÒ˙2∞7[îÃ~±Ê´ñÌ?ﬁH∞ì˙å™ö‹[•i‘¨?ÈÉµ%øÁÒ°ûœ´ÃnéfæñıÄÖt/´Û™µfi`]ôVUñô∆ß3zõVÉ3æwÒÔﬂ»˛≈øjC'¶s8¡ºØ≥w2Ω?À¥Ù∂¶	p˛\b_ç ˛F°ƒ˛œá÷wÑ∞ˇÅêÙWçê≥≤"∏Ôœ¥K∆æ^@¸±ùıÌyæ +;(ŸR5œ8å.ÿ_@ÆT¢¥·ÔÈ8@|Ié¯{´ÿä~±V‹C>◊Ó“4€tÏ/,øü€X™h≤Â74Ô®ãÛ;Ô—◊ãå¥8_hå√§ÏdTÆ·N∆⁄FÀXQﬁ¸Xd˘åQ>ëπŸœfÃÀn¶üü£MzR‰HYÌ≈ƒ∫ÏqY–›k∞√VÒúè<ÃÊﬂ@òÜ-Ω˘S^ÂQdâª~[…∂b»|¯¸:ÚtÍ<N‡Äôc÷a¨=x§*<VQˆ
QékéÛÁŸqë-Ù	ePÃó,%Œ=ûX”+Ø∫3Â6çe&öé™ﬁ~◊‚ﬁıÁyﬁOì°YŸæBâA£∏£â◊VÑ9ÎõcúYƒ∑$™&^Bá°< ß®¿88≈≥Ç∞7ƒgÎ˜c{¥<≤‚wLmÙÏ9c∏¥ñ —zÑÅ›òŒdÌΩ’—ïÿœ"Ë-D><F≈˝q“G"*‘ë•àK…ûJ#‘¨®EÌ¨M&≤ˆõ P’Siô*d~]áø6S:Â—ÜA„Êﬂ\Êö, q"Ÿï
Ùä∫oyÈÃîNÉ¯˙‰∏óèF–ÏÛ‰\
§èH∫?Ã:ôÃó$2¥èUñêÊE‰‘ Ú°ü’ÅQEé◊ú£*\˚@JJ röS¬A,¿ÑÒ,”π˘ëR.ßF! DöU?Ä>†Ÿ,éêQn˘nÚ˝$Ìß‰¥ıò⁄§4_pöÇSÂm%*$≠PÀò‘Ω¬xhû˘∫§§ıxÃ¢‹aπ1¬oo~Ñ%ˆ¶U©˙U°ˆ»î!¯∑[{†ÎzÅ	¿zJı'≤›&EóÙ<A´QÅç¡˛–5·jàÎP{,ì∑rèÅ«Ú–7$≠-õÚ¬Ì°9:—ô`çÂØ©É$m€ı∫Ù&+BdÛz–∫ı„ûŸ∂∫?_”fNn~-œΩœåöp¡¶ﬁƒUÅHsyÑƒ¬kZ^-ÖA_ï*ôfô˚‘°	>"ˇÕ¯a^TtSuu¥«i'…€<<~N≠„≠TFd	xÃVµà -—[upÖv îø™ﬂè¯0S≠ <„’K∂‘¥´„f;ö+¶îëß,πB#≤∂ô.¥≥
C ô•÷AO¡‘mMÈfs>7B˜oK ”ÃÂHL÷Jvk4Fπb@s¶™˚≠¡⁄]O π˙´DîÍ–§eZ+=„6ﬂ2DŸfU{≤íå…ÊxÃ—¨≠ô*÷®1‡âŒ[À˝!WˆzH	R0A˛Qæ≠:oÑb¬Ÿ≠B_ÃÃ:≥–Èﬁ#Õ 6≤Í*NÃÀcı¥†´JÙo≤ÙÚõ≥3}T2˝≥V›ìÁ#.
Kò$Ÿ¬‡5ø^8zƒ
ºåÛ¡¨
ö≥oTıbä·º(Ú·!E“≠ïX.¶£S‡ÜÉÓ¨‡Ì8.^Àt∆ïvÜF´4IÎÎM∂±ﬁ 9Â"ñ‹Mé{∂@¿EEÑ6˝P]Áé“Nöç∆œ?Ów;/®⁄ﬁ2®gE'xMœk˘òyƒ4=Â6MEÇœÑ¬ÅQ«˝u”úãÁ˚ì€8LNß˜ªÈY2ÈksÀ·√e(∑âJÊﬂW“M⁄ıN‚f÷˛Ìø!d®º˙E√võüÕL#C0S^ÿu|ÃXhËÒ‚x2¿-›Y0òÿ–ç_¥:E
=v€·ú~sàï1¿¸g!u@ÊLõ˘AÈxÄÆl£À—≈º1–ıÆ+πxizuê&É%,—UÁ„aíuUè·1•csTëLpÌ~X;LŒs
¯>&Ÿ™ãsÆÀÏ–ﬁàƒkxnïdD
3îw&Ñ›Fr“™™˙uP©P!K}j.Ïåß2{™“ú∂*
˝Ö‚/·»Å‹PéJ’¥≈ÁGy>n”…Ô$9≠◊F∞»À≤ﬂ[q——§ıyX≠¡Jçª~#ÎYòs∆XÂ›8¸,|êœ≥πcÓ	ajÉ_‰&åû§d™˙ﬂˇì]|ÆnK’ßbVù≥˙´gSùO¬¶f±(ó‡]Ôº:9jüº?>iüº>~ˇ¢˝|Ô≈Ò[^ÙyRíp//˛2 SI˛ã‡@¶ÈD Oi˛s3!c@»ÖÚ;‚B˘-πê∞°¸«Ü Ô>∫<HﬁÚêÒ‡ﬂ˜¡)s÷ìK÷Û©XJ˛oï•‰øñrp¥”~π˜ Â)Ôø⁄ﬂ˘¶˝679K˛oÅ≥î·dWaÔˇ
+.˛È˙®ªiŸM_ÛØü¥Tj†tπÎSï—D‘O5G£J©v
 5ù\Quﬁ·ıTa<C‡πtíÕø´E∫ùe.tˆTµ]m≈NpÚ`vﬁ@;Fµ¬∞fÜ∞NÕ§øf“}<˚/–¥Çoö´Ï∂ıΩçØ¯EDvÖÉ(«®ÃgX¿+ﬂpU)≥¨¢º ÒLchÂ¬YŸòPASπéÚFÈsL%œ´‡∂¨›,≥ˇﬁ⁄HgWü´ÚØ(√co‹)Ód˜&ª0¿√_≠)Y2.n~å{ …økí˜H‡˛.&h«ÁkËﬁ\EÍ`åêVöÛ.}_wV∫Œ–\‹.jˇ˙Oˇù˝ÌÕèÏ,˘kérÔE“Gß#N“Ê@îëª¿$•©LÖY•í˛9Êà∫»yV˝ù|êvKtç¬Ú,Ô˜xì£ºãâ§
#ymß	‚„W'£ñózﬂÏ¨%´≤Yœb¬—Â^0ºû˙ö√=dâ0˚{ÀN„ﬂ›§è\–;Ñ≠®‹^3jI“π¿%YàÄJf‡y7Ãåâõó!∆ÀV<–’;s}<‘öÏV¨z1gÏı™¸ô;¥â+ÒvvêYï£u|ÉÖE∂∞”µ5WÄOÙ(‚~æ∞csπçÇ‰+8/¸úœ(ùJ5EÙGÈäC‘‹)tcp´¢ëøT†æ†§5wNS"†RRúü§é§[	YG˛Ω[ €)0V∂yâ7˘~íusÜNßYwÜÙ∑$»ytÁOsÎxR	q˝Êù√[±Ì¥d“Ä:C\ùŒöI(ã÷?§„™	_/·◊rƒø∞c¥ ‡Ò…Æ Ñ”¨ØèV∂˜JX$È2oyøDÛr≠îµP§??ì
¶ÄÖ	43ï∞S	¿‘íürj}œ¶è?˚lmç≠ÆÆ≤„Ω£7˚;{«xÒÃä:øuRÃÃ6È£ªt˝öâ™X,&~dSÙ»∑Ôm1˘è‹µx™TBºŸ∑Â‰Ù$9mRı5˙âé¯ìíRê•Ojy˘„ø˛Œ¯=jÙk€uıêÊ'€„‰-ä´MÕ€w€ı∑ÔÃœåÃõM'ù˘±LGß?4rÏÈÙ{÷'\ˇ≈Çj˛“µÆLóbÿpÌËõƒûﬂ`™æ-∂ŒouÛÀ·aÚ±ÿ~0*≤º‡UÖy∫û⁄g<∑¸CŸ;;K;cK#óù±˙={πB=≈ÒÖœ{òÀ˜ì¥¯(∑»TX”!Àáı.,\MBº÷ê2Ùe/-Ä$tx£˚]$OübƒÅ’.‰'D0üÑè§¬?Í8jˇıY><&£≤óèÎﬂ7YΩñæ—XıB´õw∏)á¬
DtVó\8[≠V∑Öuó(i®‘Úl ”&{k˛-áœı˜z_”¢O0óûHLÇ†ì&™0˘c+s%∏¯®ÜŒ3àL®Ω›ºSÔ‚ˇ-X7C¢=’¥ _0eùd‹È1,Ÿu≠÷nXÊ˝¥ïE^‘k{K‡„I“œ~¿∫6ºçnŒ$â⁄¬:÷≤IÖ7oÃq( ≠ß]çh®øßSkÚ<Îû±!l¨4·ƒGëï¬4ÜAÚ{w£∞'˙ôﬁWèÂyËﬂFãÌÚ±uúì£õz?‚maùÃëŒ(0
ˆ‹H˙ºÿ3¸ƒV_Gç«¿⁄À'* :H)”w“xÃŒ…¢D€®‡Ä≥_7Å·8Ü±\ΩÛW$"û[DÂJë%ù„øzv[ê∏fàø[<~Î(øÑï√Ö7`µç$7ÂdîúÇ<¡+?÷x»W≠— Ü ˙±ë®Ü€L”B$€uVMüõÈƒæ≈ﬁö˙˛QÏ¢3ﬁá=P$C¿≤öy–vZ4÷‹ˆFlZM¬+[°≈4ﬂBéân®ªS#Òç»RŸäπÓ[òµM5≠„œç¶·Û'ÔÈ∏ó#XFŸïπù5N?ÉW¯O“óâxæ¥´>ö6Zº N~¿k} òd¯∏ı‰⁄7ÿ∏W‰ó
[®CËæèTyÄ(ö€cSmèq¸ïy'CJ-YÄ´3¡©Y4,ÈvëÄU+©`[>ß– #›í?Ù…c£(*„j≠4Õ<¶÷X>∂0^˙+Uìb±—Ñf∆∫+qk1<M˙òŸvã[≈…:ùæ`´q¸3vèbÆ[≠f0Ö¡à€◊.©%Á·’çT√Ülc»5ûL„»3AY& «,√–êHäÖ1Nz™8 Ëd0,U®é˙$3C>èŸ„·nÅã÷IFÌeX‘Ó ¶v_÷Æ}¿˝±üIoÏGB óØ^®
-20S≈ãÃÕ`Q~‚®π/“Ç8A•pDZ~ÏpÏë„~ÑFÎ1únD¡àËòBÉëV!o‘Ñ*∆ãt¬u∆ÃcwiÃ‡Ñ˙˘uùÜ≤éÆÏ/Ú0ÒcöUΩ6Ø>?™°∏4»ÜŸ`2¯
œ@çv≥Û3ùm6—g(¯£µ>∏√˚“ú	¶zdªÈE⁄≠®™ÙÌ †»Ÿàm¢„ár∏S$h
ö‡‹wèjï√Á‚ ›∂€_(kåô¥·Æ?ëLhÚF¥û'›Ûî©y…„0?R≈s1É[-k" π•|,)4>æLä°`¶˙k∞‹áµr“eñxé4VÌL®BÜëˆ¿268É¯’Ø|∏≠é	jóÙY_◊¬J{và◊7∫˘Á<´ˆ˘$âd—0∏È'≠±£tú°pKêπÅ¥Äa¨0O|1ê±8h!≥‹ïÁª<õÃôÛ‡w@Pñ_‡Å£iüÁE‚òÃ§È{@˛	Ãòä—øyàJèFah,QæÊ~ü
7 ÿé
Jf¨ÁÃÀ¡äŒ©/ÍØD¸ñz´øÂa’nÊ$ÅÌÒˇÊAßÛÂŸ∫¨¢£oUœçªÎ^ﬁ~ˇ\/HÑlx◊ònŒ˝êıZ-N
sN8UÓ@◊r«∑Ó¢p¬ç≈°øÜë$ ’∫xÿ¶=wì-ôñÕá¡*
ÉÓB)$YΩL
tê{u1P©Ü<`Ö´"i≥pÿ`]·ƒc´yˇıˇ˝ø’L0áLà—_∫â90'Ÿ∂. §ïøtÔ…¥ñìYÃQ˙ëEêxªë0°nmuÜ›–.±¥ñ1Aﬂª¡œG¡5øÜB◊‘pW∏¨ ∆>í…$<óÄ™BÒÓ˛∂√C+}∏∆Z8’Kı¥üœ¡AÅÚ˝s∑d’+hõõgç˛PòHÉµÂ·∏“Mïc˚ï¬!{œBø»jÿ˙ˆü{M¬õls˛µ≤ßÛìØÿÃæ:"ÔW¨‘úí¥˝≥·uS?JŒ÷.∆çË€©ÁÆ#®™ÃÚ‹}Úu:Lã¨Û^√ºÃ•
˙ñGe`^π¬\†ãóXöjJ∑_‚⁄√Å)√,_7?¢X√iOúÕ’¯è©˝UûOØ•F…yò€›ÆÅ€¶Jc\Ll_(;W¶˜zIäi¸‚
∞º`ºjçùπjÅRnA’ä™cÛ¢˝ÍÊø∂è’b#É‹Õ= πÙ‡òΩløz›~1£úçYõÌëgvû·+C5gCµüÕ»ı®∑´ãÕ˘ı∂Hü1W≠+ª‡ñPFŸµÆ∑hLaªseµ7ÃÛvÍ§*h∑P›∑`Ÿ∑ÿ@c—NaPW;ÿq˘Hœ*$ïCR»°Y"bŸ¬µœ,à˘ ÍΩi¯ıE[kΩÂ∂Ô«5ıV76ùn6íÕ˚˜ÔáKâ:ûW´î.å@Z¶ÉÃMw  \‚=À;ì2ê∞"‰›âwÀG»DWNìÏ*YŸ~éˇ<Y„œÊ˙PsyEˇ.Ùi“Cóm¯ÔBüM`]∞6O˘ÀSÆ±◊¸^U; ÛbÕøkoIív˜éwéÄÿﬁ¸ó§LíÙ™i≈ˆîëˇK÷>-ûÆÏ˝~ã=oøzµwƒˆ_Ì∞çﬂoºd˚/æπ˘o«+#∏•CøI≥¶˙¶˝‚‡àùú¥_ÄXÒ9p‹Ò«"i*˝kÕ˝‚Ÿ‘˙;I0!MÍçD˚ùFlöÅ˘ÏÓ±=åÒ›mÜÔøÇ…°nrÆ∫∆à≈ÁÈõ3Ój∂¡%]¨4#}q˚Úåa…eF˘E≥ÔO_Ç±BÌ*Œ(DªÈˆãdxÛß§@1OR‹+´`{‹hõY`if˚cÖÄ-g∂';‚à“> ˇ}·leCA∂ÆÑ©vÓ⁄ıcè˛Åºª‡&óX±“7Ãì Æ•›å|RnπÛ@,‡ÇàiÏı´˝ù6)1Î8AÂÔ0g{Â8GW2∫”ùì¥dCﬁ8Â“jbrûhô/»wb•˝˘8Ú˛VÎ√›7Äiﬂb
[™_Œ›+rë†w÷œÚµ~~éÏ§´Ü–≤ù÷D£∏a˘\…mçãËM)ï7ô®ŒπáKºãh—%o6 !y0êíà£ıP|∑%ú\.r4î3≥ï-∂?º@Øç‚#^
Á7˛-µﬂñ¯Ôë©KÊπrÈ`4∆‹s–ËaRå3‡ŸV„€0)nÂﬁ5 Ï⁄ïø`ù√õdœ8-ÈÄ	∑'√Ìµì°v :ÁùÔ»+ß.®aÙá9‰nÎÿx9÷WY…CŒ∑0ΩSä◊« ~é‘Ax≤e£ú¶&ãFâ3˝D¨ùl!Âó/—ÏîS}¥Ye?†€ü˙Öô∫d8ü…Qﬁœ’ò/–`¯çZÚﬁtØΩ'aXo◊’rXNá…ôPyB?É>ÉüUz‚qD≥}ùLfc†∞™Ôkﬁö≤-qSPŸÕ—ı®Qtº*≤ò≠…ÂÑSÙ^ÍåW{y˛]πñ^ıΩHWªÈ®¸åªΩ…›bt}C¨é;).ã(˙¨Á°FÏ^œ/)¶¶^#ª"ÓÚa>@g“ı¥0ÉÅÄõJòpÛÛªÔ”˝®nÇÏ<gò˜aê`§O∑=)'H;»ù™ã}Ê6LáΩ… ˆdN4
{¶5ö5ƒ–,∏«=æÄ0¡ÖT¬Ù”±ËÍ+¢xÜnC9[”#Áû˘˛Ø~≈Ó∞mxuyGEzñ]aht]∑,∂5ïÁ0ÅK∂¯√£›övÕ^{˚∂Wˇ1Y˝·Ê?≠ﬁ¸Ô÷ Ok5#á·}'ıõj¬¨˜kŒÔ√Á◊bL”’œØÖ)Yáj7¥√ÙÉÚ<˛ÃöRÚëj=5&Î¯Ç·• ]ÃåS9sl‰Ñ÷xEëø ËÏó9QT/‚•·Ó4ΩÎ{¶#˘ò#+«ﬁÀän∫/s˙˚æ‰4Wøo–eÁ†–ﬁÎíj;ØfÂ{ﬂ°Ii¬M¶≈â†Ë∆˚ú»S§£Û>íˆ˜—v}\‰ûPI|ØâøO%Â7ÄdÒÑPá‚£˜¡ t·{ìq¯Àkqıëq◊ˇƒ‡3˙† Ôz‡|Ë}AåHw°ŸS C1>/Ÿ„~g<
K<Ó˝@09ıù¡˙‹o¶è™UrIƒì8U“"Ó`*‹J„Œ§b…—ùî;1◊≈éo¥“ÔÎ‹ˆnÙÉé‡qF1,ÏQ∫0“≈cco^PÍwõ"8,¨πÉ	X5Åªß¯WÜ\,Tm
Q≥Óy¿Öêg8¬ïºòºòy¿Öv„SÏ˜√+TÍüÂÂ•®!æÂúxã}~ü>kx»(mmÏå6I>Ï•Ùàõ~PC=Cí‹ˇh˘„s∆m˙jG<€hÈj”E∫¯!ïÊ◊∂tT€€›?i±˝ìΩó< ºΩ€>>9:@¡˛´„◊/Q°~xt∞˚˙‰†¶¶Ê’§ﬂ^áæà™*¨7«©˘Z™˛>èÊÇY™Œ{mUÑ#†b¬∞Œj´+¸√Ø5˙ùõˇ∂ªˇ5åŒíGØX˝¯Ô^7Vl⁄nö]•XkÚNä.ëùßx'QÓÊGîÂˆêñò:"MçßÖâ©ﬂΩµZ(#ÓÕ˚N˚dÔÎÉ£˝∂ßxó*˜†:{ÛVÍÏà; o!GŸ0ü	n%ê9 «J1CÊÁßp¥…Íª≤},≤˙ã|ò¨Ωû◊_;LFiø”,;≠—@ùˆ	˛ÉU{N`ÆE9Á« 4úÚËåïÌ∂˙ÕÍ˚˝ﬁÕøîko“bò˝0ÔH∫T¸//W∂w≈Øá!µ∏øÎ~|}˝j∑Ωª˜ãƒVÊ√T~XK+€/S,”Ù∆§´>ò“qB,"Âû¯≈⁄ ﬂÏ"jtqÕ-CXä!YÏX}2åÙ;Yƒ˚h-—¿BQ!x‘fıù◊«'ûjùüÆ}¢“‚¥©Väß%4Î¢ô›õΩWªÌE&•éÅKL –≠›bR?˜÷?Ÿ?‰≤H%ø»˝/O§ã— ≠∂\ñ¡{e[®¢Á‹√`ìEÜf⁄ó‚◊úäB¿Uæ≠[∞≤9?∆É*ÏM=Kä˙∆;m,årºÄ£√P∂ﬂΩﬁ{ÊcsƒYR„0∫~Aiƒ}ﬂH'¸ÛÒ·!+\úFtÍéNI∆ÑïœH∫j94úÛ¨ä\shlfxÿôÈ…TzÿO«Ÿ öXËŒ°√˙SÇÁÈ-¡ÉÁÙ0|v«_¬ñ‚ôQÒ»*Œ€e; 6p}R\Ò’¨IL_˚yê§≠D∞‰N!ÚÈ∑èâªoÈ÷¬∞ÿ&qhƒˆåqÁzJÁ%êÒ2‚⁄≤¶`.vF˚≈,œ”∞å‘lôwÔDpéOËÂÕˇıjˇÂ´∑_Ïù¥gz›H£≈Û“VÍO>ßˇ¸{ò”¨©X÷á%Ê„òΩ?—§^Ï¥_Ïˇcõº‹≈€ﬁ’;,Ä∞Ù”¨ÄSÁ¶?I√Z≤ƒ-Ã,ïõõ¸…Œ˝w≠m°xPÁl÷,É®~"’±Á*Ëo‚*%-ã1O‚Ì£Ø_√a Hñk/€'{G˚Ëw7hêww¶Ê¨sÛcø3ÈÁ¶ûì•¬!∆Eørúé@l~,‚Fk=¥v⁄µÃ⁄ô>wáú3ÎHÚ ‚'óE2
πµÕ⁄ägºøÓ,/¯LK4ÕMÜÂñ{•P-¿˘Q†ΩÅï [˜˚é2]∆äDTÂy•≤óaßeãOﬂòüw[Àx´D:_ÍVåÙ°*æ¨>ê√æ¢æA≥)bÿÂ|≥∑f,ÙC?f«/6nDa«ÁÎÀÍ‹xÉVD≥®˙y¸√é†DnºØ•≈Uu˚T§Ä∂wè»ππÕû<ﬂ’V4à{ÓïlÄ:Àí]§4¿†[ C£¥™Ÿl
ËÀ√ §,Í‰=’‘ {‰QØPÎæ—2ç˚+¥Ñr—jqiÁåƒciŒ˛¬∏⁄^∆›¨ïêwÙ9«ûNé¶∫õ?%lpÛó!ÏŒ¶p’$á+≈÷Ã ∆x±˘yŸÊz7∂ã Üè√ÃÃrº#f6ci˚¿Ÿ‡€7b¸0û'ÿVR§∏Ÿ/Àß◊õ”ÄÆv5-pÜ˚≥tµ¨H1 2¢∑µºm0ˇ"Í[√}g¶Å◊^=˜r_˚[πŸKøÜjózŸÖ.÷À=Pß^wÔ_Ù¢ünã‡æ9Føëa7áµ¿-‰xÆÚ«k˜—∑˚ÊO7ˇ#Âµƒ}|ç“»∫Û∂÷ƒ∏0‹ÎÖøªÂÆx„ôKõËó[ÃìøÙ1Ωπ≈⁄£—k¸$í’¥ì_&√‰<UùC∑˜Ó’Ò„g®”Ë¬È1öﬂH∞¶A⁄mS~ù^¿ ÄºıöﬂP≠a•-EQô',≈_ñ≥ÂπÏg<Eo&È¥¸Çˇ∂ºñïwÌ'œêıµv‹⁄È*Ï–Nèßv˛™„ÿN7´ù€˘w¶É;›qú‹≈Ωy›E£!g˜œT 5,\
e–©zY_6·ªV˚5¸¶_Ø!t)TRvxöA•Ë‰ZÜS€u4›Zê>◊~f•p4Éè¯%q√˜Ë¶©÷Î8YcèRu;◊éÙ$√l<"+à∏√qÔ·/yó˚ˆ‡]¸•Ó*¢'‚J>ÂHÑOLˇ_I(ôàr÷])ú·˝I`ıÇÖåÙéÈ˜+_”ËâØ(?_˘ÿ@:ÄrÓ’/HLœπ/Ø|åaE•4¬«ÚJçQß§ÚÀ˜âÉ∆n|Æ<Énæ¬s∏ÿûøæØu@≈OLßZ`B sü`  g Vtıôû¡v∏µ€tü€uTu¯ùÌîl∑i?∂hi∆hn˙Ü|«êfu)ü[B-æa∫€#2ü∆3E˚∂EÜT:d3&˝7√±->EìŒ¨ÇUÇ1L1¨@í-1ùñx¢	ÿjá$ø≤&C/Z˘ê \éœAÜ|/ü"1K/xB _c N/$Hê'ß ∑`Jö4Ö.19X`†™d4 ÎSÂá+]UeqNIpãtê_§;b‡bXlsé“oIVb¨&à'^˘“∏aÒÀkäëëâãd∑Ë#s≤©¡√£éŸOê›ÿgé¬íœêxÇ>‘  tSJ[‘VÄ!µß‰ëÁH[é@^.∫OT“löÖπ)˜uãSÄÄ±ótzu3Kúˆ˚Æ_¥hﬁ€‹´ŸˇÄ©°êxE¡_›¶|ìÏ7åZk…¨√¸∂v¸û™ﬂSg÷»Öá®ˇ} Nø†µ0Kt≤üÏM'{·,Ò-Æ}”XÛwÇ92˜f1◊ó ◊Î .ú“˚ß-„≈UñóÊG:H»H˝j"L]Œ@˙s?V€ﬁzmû4Í).\◊Je0Á˙`ÿ[›	å•ût:Mñ—‡'Ç^∂Ã≤î5¯4iÙ&3Œ"˚]⁄e{Êkõq2˛v]·¨lä‡˙¸#o ºCmÿ≈pÅ®íb/˝m–o¨ëñ◊∂õT∆SÄŸÄX˘«\Ø@∆$?}è´\s®î¯ıbd∆=1Îûóuõ±ÃÑﬂ‹->˛Lb∂∞‹=[l. ≥Ç¥~—ê(f@£åC£….$óÚ÷.MäNÉï≠ıSw≠ÉM≠fb6ùvø õv•®/ø`s¿»lüL6π|<Ä˚ﬁpt‰€8
|-è„g:ÙC4éˇ¥Œh@ıåHB¶CkN[˙å…€Çwpa≈Ω^7BÈf}bÑ{ÿ ƒîÀ≠VGˇN»ór1◊ﬁàtA-« ]T‡:o“•u™rÏ©Æá,2´˙±fÅŸ$˛ö&ﬂ4
âæs‡Fıaœı@¥ü€ﬂÛwd«&ä^úõ™ˇíI<oÎâÖX¥S"Ë¬ÿxf˘4ï∫"∞˚¨µ&¶†vñ:D"M˙£ßLm[<µiÜI—9cŒ∫Z~µµÖt~ôÍß^Ç0-‡öÒŒª$Õà!…Jï£¿ﬂ∫êõz˘ÂN><ÀäA˝√ﬁÏì¨`+ü_+¡b∫ÚåÌïe¬D8* §Ía¬¶:K≥q“báËïåÀ‰‰B)œA »%
Y∆Ë≠Ï¨õÅEœ[@éîxπ^@Ö¿≈∏∫»gÿR·›Å¯≤îOº≈N(øÉö8C‘E˙fêê/b0¯ºâ€Ö^Cf¯•ïZÉ≈)'ÉpÓsëÿ◊_æ ø§dÖ1ò—aa{Ù∆FLo(ÔaQA‚¬§ÍS◊Ï\eÊ∂-⁄ÛdpÖ.§^Ñßo_€©9]Z©EùîÕÇõiÂ˘≠ÃM€l&ñÁYº+3Ùi“ÕcÑGÃK{ŸÒjjÚw„nãµ«TÜ$ê°}9›*ê¡,ªa»W@PaOÄ¿	Õè…"ÏbÃ=ø?ttú·©n)÷≈EüÎh€ø˙{Bõt'+:}U‘6ŸΩ√©)Cı’—§œC É˘hùÏÔí˜ÙìBRäòx“¸™Qù‹æ1˝´G ïe≥2“ã‹/!$∞>”©‚©Ù;«Íö>Bf¬`L≠~≤ˇÊÄ>ÿ≈GëôÁ›7ÛÊ∑ÖŸƒÊ{: ﬁo¥˙|C%à%_Fº“,ÒnRX˚ö◊Ô5úDl{î r/Ô=0≥J;®Ì'áÈ∞ìı≠zµ—T∑·”ö;CÁ¨fÊÿU≠{9pU±¡Æ˘´Ü|R$eo≥r»ﬁﬁy7öø*÷ú96‹tV<Ì\â4Ó$Å∆ºπ3Kõ1_∆åyìeÃó#„gÃå±L˛â_j6+SÖïG¡IR±ﬂ5”T‘ëeÁ…MÕkÂùõSb°ﬁúD∫Us^—Ïºı∏6}v¡&˚Xdi`ÌSëëGÏñŸ√nó9lÅ¨aÅQ32d¸Ti0ú„ €¨‹†wÇ4ΩÔÎÎJ3˙Y÷Á	âè“3xÔÛvµ‡m∏|ÚÕ…ÀÙlØü¢ÈJÈ*˝nA‡∫»“K√äÔ›Ø∂ÊgÊÎG˘•>pÔŒQqï>¡§Ë»eçV‰-_˘¶æ¶ÁÑc;ΩÈ2~˚ ∫eÎ]˘Qòtå?`"	¨+ÓŸ‚LéªÑÜ"@‰ﬁéew39µûãÊ◊ÈñX7Ó¬¥á˚ÿ_<O˝{∆Q.Lx]>kΩ]ßè‹˜¶ó<Œ@ÆX∂4ﬁ≈È‰Ïd?Iƒ∞±VR…«ÁÙ@˛:∫â¡À£§(SÚY˛æ_^’y;V≤3|◊*∑líkSA¿s∞…ºì7?ˆ±r8Hzî≥K≈/G}8yÙ{IãÒ5IP·ëê ûö	|1M˝èµÙ≤nBéä7Üm|ÛøÜËXﬂI 4,?-≤ÛÑÙ#y´¶Œ,HjBuö°EÖ-4Æ0ë¶öÔÿËj££≥x∆÷4—§t3” àôÜ^<PHM”'-RR|?….r NX±÷¨º\/√`˛m˛Ñòbí8)∆5XËÆt’&&≥æc% 9ÜÁ‡Øﬁ,˚=JHˆπ¬ÚTa®b,¢Bka;Å∞'ºπMﬁ∏ÈÖ.89Æ3Ô;]	¥aVÏ|>);	ÉyK!3äTØXoú2Îtëae◊äP	‡+∂#ﬁ)(	"´√<aŸ1Õ˙TéÚ>Ö[ØÚÅ≤⁄ıg”´¨S!˙Ö‹í∞ ;H©9D∫‰ÉÄQUˇ2)1ˇw€•S	rûÍ∆ò]KÒ(d&ñàÜ'¨˙»1ùD√I˛(øÚA¡g∂Å∆˘,d˛ëõ˙khê†˝o5ŸH´bÂ´ÿ[C¬Çﬁ‰ñbÎU£Úß<?…>ä¨§ﬁ"◊{˚Ó±˜í¬tü‘Ö“´BiËå`}Ä%k:ﬂK,?£-Âgõ¿µïãÄW˙É-`QW∫ª'qÇõˇª∏95Ãœ9Ã‹FùÚÁÁsÁÜ≥F´ÀÎ¿Çek4){¢<πÒÈw'Ç¿ôÑô+«õAáÒÖ‚i÷R=Ó%™0π≥bxCZÄtDwY/ú;å¨õDá:¶Ù]˝|ú>Ê! ¯ìwPÄTübµÎ~6ƒÚ÷Ä	‚–"L…:J…≥\1Üe}≤"ßW7îxPL≤Å5¸SdÜ«Ÿ∏TõÎÎ™·Ë3(¸ÛƒÇL˛oûÍ6|T$G.Ú®oπsD÷ƒèço]4Z‚åH-;xsOZUåïÊK#ß‰d™p√ﬂzº/Î%g‰‰M∂∑Ël§ì≥ê-5æq˝˘µµWK ø;@%j˝s€PQÆun˛∑_m⁄¿√òlP»‘…K˛†6Ãá”¿û¿Ñ{Pl;óµKC	2V? †köKΩ”;WÖ¡…‹ÿ&¥¶VUh_.s|ºBﬂéâ˝0Zõ)-QòÄP‡™	C6∆45O[˛a¯˘µ’’TílÎû`-ìÅê÷∞ë-„Âﬂ¥±ﬁh}õg√zÌ√ZcÍ4
„ﬂ†2∫Ç<«RÜæzÃ}i^‚qkdΩMöº1Ê †À*@†ß+ ⁄ Ú{F◊ã©D‘iA¿ sÁûSa"?øìî°·<ú>ëNƒ4 ÊNcˆπ≥≤,boıÀGÅ"sﬂbFÙ≥è‚R[Eû¿q§HÀﬁŒ•Ÿà¥ãï£lh4»f∑&#Vt}ÜœÊ¨÷¯Ö≤πAÀgIó˛˝!œÔÍóYwR$[ã≈öZ&kÃRJøë∂…iû¶„K82î∞äc|œ≥=ê!Cß^ÿË‘äàz‚fÿËmzñ±+˝ƒí¶ŸZ[…πm\≤«Ÿyácòªgöci á– ¢£;
√ˆ¥"5õõ^úüQ è{îÊ‰÷zõ÷d£Å|ræV`FÚiÅäòæ±W¯ká´ESó4§p‰ﬂ¸π»í’Cú´ïwr¶ÍÏY-˝≤F¬ÙØ·PsdL…(Ú¥Hœû^õ:Ä©≈{+Ëöé∆OWH	—ƒˇZ¶ª^÷Ì¶C≥Ïí´ù%%àƒÈÎh;CâÎáãåƒ∆;hÔÂFXúºS∞C°ñ©√òM€eHÚ+Âuæ´¬‘+◊Ã&lÏrıK$–1s H˙Hºg4¿>`∆ıJüa≠ß∆ßÑñÙ¯c¡˘^è»–©Àj⁄ÓÊB`uu€w!\o)ú+»âÓ≠∆ePvVŸûê≥¿<r—R©rFÜ™•L¯y£◊Z”≤ßfÜ!’2†fÜÂ‘U>Ÿ˛“M”Döiëi√MC◊ÜU&¿ù›Õ/áÓ8Q¡>"ÃGÕDÄnbŒ”Î√˛§ú∫K}≥…˝€∞∆Ö})Ÿt∫˝
uäÿP(¥Ÿ¿µPºoDÆô'ªï¿˝k¸v')∫n∫wF$äG–W>oÍ'îúq´
Ø
~Sït/9ë{ÚÃ8≠Æ≥•¯˜ruÛlïÕÊë€ÜW¶K]EÊø…G∞ wAâ^O´-Ãßühg◊¢·∆∫!ÑÜGáíùYÕ€Õ¶b H±JHN˛^
d#\,Ô‡"y|0Ô»Hø”A.pHXÍg Ï=…§A9te˚:ßı>É˝	D€<éL£ÜeÑ≈ï9ñ.Åπ?#n∫(v«´z^9ˇ§‡ÕØGAŸÄE¶V|¿∑¶a…0tâ…ÿ•òòº¿åŸ≥õVïÌl—ˇ>l(nM“¡Ú"Ñ3…‡FÀÈ›.ZOU%ÿÚÁçùBÀ2∞ œ¯D-Sí™ÃK29<ä•S◊_:vrx¸2D¶[U¨”å∫Öö.œΩµ¢Mw+Œ l÷Ô ≈}ƒüÎÅ7ΩäuL√‰äI°|0˙ô∑µŸÊ‹mÆ6‰€ı÷˙Êªä"%±‘j∞£Òl-·”[®‰∞Ÿpı6ÚÎ‰‘jOù'‚¬èÚpÍ‰b‹⁄Q©œçQBM…Úâîs≤]ï∆ã©H˚„≈q’´Jõ,[ÿÑ[-≠â;c•`+BÈk¨∑z0”x\ÔWüC¶∂3Û‹èÂhí·ﬂÆãÚ’sU¥F¥Ã·Vûë∆,.}ªu©v( LJgv€>Ä~¨›?KNo˛LE§ÎdédwjkÄ(]—6J⁄®7vÔX÷rßN_µäf#≤«mS¨WEÀ¬m^WµÈÁXüG´£tÉæ8¸]Ç´πû/_3zƒëKP°ÄHqﬂÀÒÎ“KªV«spzÚË˝G÷6\≠bñMÕ7]ŸX¥„3Ór0;ódÊ"ñIy1≤oy‹{‘ƒ§cQf!¿sÜÕ„≥|∂≠ªhE0¸0	∏ã?Ó3◊ﬁÓn.)Ou ÊéÑÜÒó{d,CZèâÑïâCŸ\±ZÆ⁄÷bßEö|∑z	”-QPQ!|qeÅX.√ ÊJTë}TÖnŸù›>Ï Ô‹å¸ub±ÊóÊP\πêEﬁ≤Á¢¶c
s+±´€	¨^uLáó›˚D±.‰Â57e¸^0ÍÀ˛Û?ééÂNÉ¬Ê¡Ü \ÁÿåJ~,ÄS*˝À√qË∫≤}Ùπò¥R}EœÈÛÔ AQef˙≈‚øº≠d∂S◊\™»Í@H?ÂÁ√˘¸“¢¿ÊúáÊÃÂgs'›?PËÂÄº◊∫ÁTqÔ:J@XW:HñÈ@ym˙≥"]9Õﬁ+àß5<7&È8xïûS-áôM¸j=◊nkõxÂFΩ)µGUíÌ∏'åBa‰„Q¸⁄4+ÏÀ+ÉÆ{téhp|˝ç˚Ê¸g@‘Î¢*°JzjÌñN©ﬁÊæ|æÏÈ)"`[
!À…~i∫⁄Npüq…X¿¶Ñ÷ÿ\#$—W^œÄ›Û¡Nï–*√3äv Ù'¶Æˆ˜ä–CGªà”òO8Òc8'Ìp-–ÌÁŒ•≤R\+Ùõ∞t”êdÌˆ≥ñ‹&mêÀ•ó;únﬁ´êÉÅ˛–È/,éHó‚ä.ı2ÿeîÄ›èà¸AïªCX®˝˚≤˝ßˇŒ∏£ı@GL†cùÃU9îÛcØœí“¬/ô§“≈≥ArµJ÷eö˘»ï8‹‰É’≤S‰˝˛iRXZ:À*‘¨uPﬁçèd:’∏Çﬂ öPÛo_¸ ªëÃïl£@äYEl÷+≈Í
‹ˆÀ'£êÍN¸µ’À—5± —^XÙxìüÉ¸ì6+‚øbï¥HÕkËPfÍo≈ˆŸÑh(úHÜD:≈¥ÃM˜»/ÆÂ…Aß^wÎ%œ?ÙSç$ÆZ>ü`<Í'Éó
ør+ê8
G3ãíÃ‹NáπaáæÊÏ”¢l1ıJ–H5u	∑WóÄà”√G≥âì"h!Ù:ó‰˙\‰®“‰X©'‚ä!©fƒSZ@…l™ô[Ÿ≥GπñqcEQÃj5Lï’Ûæ•k+Çé¸ãµNªBÈI4©n£•JINMΩáÑ¢ïgpgñ*FYÉÙ?*¥∏ø· !™ij≤ö‹!⁄À*Ùb∫Âá¯EX
≤	WmIgé‡∆Ò™Gú˜r8B(b≈È≥∫zÑ›ëÈ’Í∫⁄Nk¡à⁄©#≈ÕWa"º◊›á˝f≈[X*¬8\úgYlˆLÇTU%¯ü)Y◊dÙâ :Ï—Í}≠KPNpzàé.·:íº#Í"8’MπJû^[âK |‹ÌË,vπ˜h÷ x*W'ÅäHæ¬∂Ësúòq®´«L@2{òÅ¿å⁄X[c´´´º0ÏŒ…˛¡+ºƒª;Eéˆ‡1≈ä0¨ ‹˛zÔ•H¡L±Ç*38>*”Óˇ  ˇˇ Jg°“xúÏΩ€r«ñ(¯ÓØHÒ∏7Å› xì¥mä§Ü&iõßEâ-RÍÓ——–T(®Ç´
ºòÕàûòyÈÛ8ÁÏÈáÓàÛ∞c‚DÙcÛO˙Œ'ÃZ+/ïôïuE⁄Úûç∞L†*Ôπr›r]⁄Ï?˛Èø≤yÍ˘1ã<ˆu8Òò∞ΩIDYê≤` “Yêxü‚(Õÿ¡ƒõ•ÅNÉÑm≥÷5K3/…7c7õL˚π	_ì0±õ6€ﬁa◊ü1∆õx≈ñŸÀ¯‚=¥1OÉìÃÀÇVã
Ó√◊iµ€œ†º=ÉA&^c;≤•Üòú{hö;øDAﬁAKkÆ√÷VWW©U∆í õ'„eì¿KT}Ÿ,ïºÈ∞wÔÈÔ”á√ì æ˚)t{‰e„ﬁ‘ªl≠v¯˜·$éìV:d]4ùñZîvod∏x0∂¬«£5>£9Æ˙∂ﬁòﬁ„
{∫™ïO’@ÙBÖ∞åò‚V:Û"ò¢ó¶/Ωi∞Ω4å£¨;ç£ò—∑˛ƒ|X⁄π>°Ìjâ1¥{3œ?¡q∑÷;lyuπ}oò,%zvîJ∑V∞√ùgü›<˚Ï≥œÇÀYúdbº¨8H≈˛|p(Ãì^Ì≈S®{’¡mO8@ôo6ô¯¬˛ëEÛ…‰ï‹dª≥Ÿ¨¬üanÄM@áÆC›¥ıÓ˝NÀÿd(yìG8©®•~◊WûƒûkD_Ôúg…<–ÀáÈÆÔ√bxìW≥ ¢já∆#£ˆ–õ§FuÄ≤óÒ4‡Gä7*,/[•OÉI ;Øj»ﬂ’µé‚,<èe˛´XCUÅûÚ∑…ÛŒ°Á9ÏÁy\l2\É$‘îø?Ã‰w∆$ﬂ∞∂…Zº•)¡Ã14¶i==ÔPùUÏˇ±§Z9Ÿç¯!˚°ü 6⁄pa^zX˘\3ﬂÀºM¿êöaîP¯¬·XŒg^ﬂKÉﬁ0âß≠eÑ=1∏Âv/Öõ-ˇæáQkpC6OóÕ,{£πó¯^‰«s9òû¡∞#∞Eî≈ÀÔ€Ω8ÒÉ§µå} Lù	¨•†¯5tÄ•£ë\5ÅÈ–∑‘@aÅ¿⁄s«ﬂwôGÉ6èÂ¸¿´BÜ1åOéW·FıõÃæçÁIäÿT¸◊n˜≤¯‰ï@;Ì¬"hMKêo®ZuÑ[4O}Úì™ùØ7B‡hk8{Q-íÀ&ÒïÎÚïÎ‚√Qê¬“ƒ∞˚≥8ÕF	 Ø|å”Œa«7,-∑¡8ò¬÷,œÊ˝I8Ä'ô◊ü ƒ€Åd
ák8ÔßÉ$Ï-°ªŒó”¯<ÿCCm?√Ys™g"ﬁ˜˙—Ä¬˛$ÿı√A/qûíp»ZènÍ¡ÓMë‰Aˇ„¯bw ¡XﬁGa0`<†Dú‰ 1l5ñ%W¢ŸdÉ$âì¶–F)ˆ)€`≤Ø3Ï{ìô„ÏJeERIâ/Ei$$:y≠)!G*ÀÒdiI~h`3ı£Øﬁ˙&”éãq0d-	Ò|hç⁄,'¿ê–˘∂@d4¿Ô1!ƒnë
˝ü¢$06≤¡ò:ﬂd :mµu˘Êw Éa¸ßÄH¨5ª˝Ô˜nì}~-  “‘—y]∆) ŒN∆¡ Ñ’∫˘Nv´N¨£àABC_2¶¨~4xÕg>Ó…uæ°ˆÓ0˛ÀèœÄ⁄t1~LÏ·—–á¬°ﬂhõ/ı˝¨¶ƒ°˙zf¡Tt]±úaÑªµ¯bΩ^¿5˘ô—¬0Dv"ÁÊÕ∑˛<Ò^\¡ëc˝Æá…zÙ¶O≥FãßYR¨˙≥ú◊¡˘epLŒﬂΩ)gú{xpi?QzMTßÓ<Ìhâ-ÄaÏ≈—0L`duB†ÜÔ¬xæ‹
#Ë5”`9ˇ◊*=}Ë9rÜqc˝¸dƒ÷á<ÏÒ}g€€€"◊Ë`∫õ#É˙F,‰°5[,É∆ÀPcÍó’f¯∞G€Ñs⁄pRfuÖÌﬁèÄÅ∆9Ü“õ—(≥∂
ú>æ$ûG~´X2	¸˘ $~ê…˙¥Ô˚k÷G~éfY√mV5aŸ„D∞¥ÕFÉh°◊ÎäZßŸQÅ4ç¢igﬁ‰Dû∫h>Ì	ç¯ªœ•,¨°Ω4÷K‰hUŸ®ÅíªK§˛éÄëN U=în‰Aï¸ù8µ[~xÆ˚„ÓóOŸp\“ˇ∫ÉxB¯!ÌÏ$Ï˚yöÖ√+˘s‰Õ∫∞òóôx≤¥£ê—aÉΩ0Ä‘ûÜ?€◊Î7zgTÔb¨¨Ø.±≠Ó¨P.ù
˝C<ÒôVÛÒ*õœ`ö8≥K;o„¡Ìø≤Ëˆ_b‹b+AÚ√ü36^ è›˛§ºﬁ÷ Lˆπµ+¡-óPàÁmsÂ ◊≠bπ‘‚lΩÜ¿≈è˜.Ù6º(ú¬9Ó¶3ÿqö·¯@/πÍ>YÕóGîsÿï£Jgﬁ Ë^uø`≤mhyË˘Ù˜«8û¬ﬂÓóOò<√‘—N	hòP1ı7È;9À~ê]A$ñÄ®4ñ3V!Ê1ÎìX÷ÌÀ/|+◊VŸ¨ﬂ}¨√ê⁄Ò{º^ åK}]áÔπíJÉúﬁ∞v≥õÖ£1GÅécÛp®ÎKz˜0ÄΩI-€cêı7ä√˙:¿˙äYŸ°&’Z^ØS-Åwk´≥À˜j∂ó©uÚÛëOKÕ¯"¬˚ëu◊ñv§‚V#ÄÕ¶-‚°	‰#8-Ì¥Á?◊-¬4\wÇ¥ﬁ–‰¥Ÿo~£P’˛jûe1@
 ≤ÌÎ„…<ΩaqÎ3¯∞}≠≤ñƒAä∞õù\é÷'≤µ¬[ÀG”æ1Ou	Dèí–g¯?ÑË¥ª∆“Èf˛sÉ√™çﬂ`›= ÿz+≥Óåü,’Ì„ó∏ç†j€ïoË∆™ΩyK;pÿÓ(N<cGt<.ÙU~$8$\Áà Å7 âèıçV≥˛îV‚î¿ÚËˆ'‰.HC”æ„jSXœâègWÆâ"È≠úÖiˇ:÷ÂŸ	$µ.Ú.ÓU—x©Àb¬kÉπ’Ÿ.Gîë≤sÈ∆ÂåÇk·ÙÕvù.mh0ØΩ/k‡»
#π@\’2i˝Cpµ}-D´õ-–ô÷©¡^ë#G∑æ àS|$~≥K ®3{e\kH{Øç∫›’BÒEÿ. öúÆª± ≠∫93àó›†T°›0˛ú+…Fæ˚˜ˇ¸∞ˆÊ;YHWö»¢ª‚√güÀAm«∏-Ú&◊ôÍñNÏsQ;Q` ùƒKÖz*)z¥Ú‹KB/ ‡(˚Ï∆íq@∆  |Ämµ	©•ã!†2™…'ˇ("Z≤"m≠ÄÒ≤}SFp]áx·#,P®„¸ÓÊÇwÀA◊⁄Êâ.ñ i≈?ÉU±Ê 'mm]y‰ä1©cπÁ“<øæóéﬂÊwmÓ≤πÿ≥aà=/Éh<ü*G>3˜õõàí¨∂
e(ÌŒ-ù†ÃÒ%†¨ß´lå™òM˝©µDˆ"Í∏7;JCRº…ƒ^∑≈›˝£πü…˙u ©èFQN©7t≠˜Ñ)sèhMÎ`Cìx˘“Ÿ¿“ç`ΩJpú–ﬁ∑§Fd˛§!äSÛ‡jæ∆3ÈÛô8«$Tê˘òL∆pΩó√˚dÑg&â”Ä®¸öXzÄ¸ä:@™jM≤0õ@S¢ü•ù≠”PÕ∫êB◊„o≠ÙÔÑ‚mtQ&Wëå∆¬≈4 5Cl„Çå∏\∞„WI7r*πÄ∑óﬂÒ††'DÎ•tj©\4Ü%ΩoF≥y∆&^?òl/Ω∑à¢è%ÊÕ≥¯Îx0OÅ“NÊ0\qÀG†ÎVòAê_^hW^A‘(»zT≥ó≈o5Ôjn¡öôGlÎxLC˘Íµåº(c≠xFsü¥ó¥aú*<°Â‹–Ñ[nÁÖnç…ÛK8£∑–⁄`Ë/H∂ó.7ŸÎ ÿÑYÄ¨Rá≈…Ì<Œ˚ˆz˙Ëxc’À$n˝ÃÖ*å—Ö{§r	≤ ,3GL»µy§—8é†^ß @ogœã¡§å∫'\e›Ék™W∑÷·3~n≠–äAºáXYaª)˚Çô7ÛRÑÒY8&!Äó∞ì 9oˇÄñJë«púS2Íxæ«ÊSèù√Æ”óA<ôG§&ƒ‚{®.B•É0Ì;9›˝Ê‡Ï’Î˝É◊lõΩ[Ê`rñÉ†rìîúµ8CzCè‡ÔY0=Ü-àŒ„…π∫4Jœí¯Ô´9|˜Á‚;<Î{Æ	´Ô©
Y|≈í`4ñﬂ√¢ËÉ~±˚’¡ãÑÃãü¢é8M;0Tï[ÛŸdÀ«Ùk…ZÑ2∫Àß\2c,oP√∂oØÙÓZ´yz|˚á€¡ë»E¬a‚W˘<_0¨≠≠ûŸá\>≥ã◊˘¢⁄k*˚…bv óπ#°o$-ÄÇ(B÷æ*å∆tm„˘£†Õ¢8ÖâO9úG·§úì|¸2Œ<“öÓˆÉ$ã±èÄZ†∆R,ÚJaßï=`‰–;HûŒATbÕ4(lÏw\e<‡oÒdÄˇ0Ò4`~ú≠‡±^Èè q¿ßPn§Sﬁﬁ¬≤‡e"6Å√%rÖZ”¶5ôè‡ÕshW¨¸CÄÍ‡∏˜Í≈´◊Epº∆Hˇå0L˛´? fK!V¥∞¨xn‡"–"àZZ÷P÷=«6Û≤ƒÇ<AS!	–µ¶ïû»jö?7õÊœÃ¶ÀŒá÷E“˙(vÙ!^òùàá•»œì÷≈lûÃ&Æ/Ã.ƒC£ã¸jÕæäËhVº0õÕëk'XkxpÂEéfÈ±Ÿ(=*[å¸‡km_ìI|·h]º0€ãka†≠yMgµoæëË™/— a“úy£`/ûƒ…´!ﬁø“ÔC”H@?eÔDÅ˜»‹Î/z÷È·òÏÄìP@Ox AÜﬂd«Ç ‡"âr–4–D éNévOr"‹“»eõ(tîÖ#xA”ËVàLÏBÍ‰’ÎΩ›£ÉóßØ`t/O_Ô¬j‡§„z≈Èô§qØê§"ƒ§â&ãi≈≈E˚I<Û„¡¨°Ö.Zf?°æ>ñ;çG£IpBO∏mıá‡Í91vœDsõÏƒõÿaÚ¨–Ú&kJZá≥G´jl—y˙œ¥ë@7˝8û^ÙLçIféﬁÿÜ!ÿ`¡¨˚¿›p¢¡©◊ﬂƒ_Ø„8B÷ «‹$©|8ÀêI<Ù…ƒÁu‡≤Ñ∏Ÿ ≠≠›ŸL|m?z¶u‚e0é>Z≈wàÑQê§¬Ö¡Åpÿ·⁄åaúL;öb£‘~‚çFÑ’Ö≠túêß0¬YÚEYíÛpS‹kñ]Õê*#MEzÕyïQ&L±\¢|≥?ì÷Ú$]ëu˝u>∏M∂wr“;≈üH@ÆëV≤D[ø0Ç)ﬁH'¡p˚:ü˛Ô·üvÚDæf¸∑Z7]^æD-mâû≥•),±M∂î Ûéª∏ºº‰ë’EÑ‚°-q‡ö.¯Û%AÉS≤z-µ‹∫ïi†•m"Û]4Ñº…≈nsr˜ø4J‚˘eXC?`]óKawM*¯{M2AE!ó‡vﬂ≠ıVøx/˝ÿ]Wo«]‘πôö6¶V∂£ç._3‹Ö¡<IcË5&W⁄Òhîx}†`XS{‘áus¥¯ÿBŒˇË"ñcnOVô)á°Jª77AFLoº z‚+µ∂˙Ñ∑UºV÷î»⁄Jÿw‹¶4kÌ/Ï∞◊OA¬~1ãg∞É	ö$¿_ ºlˇƒ∂◊ZïH-™TŒ±aË∆òÎ€Ø[Vöµ≠Ω5 o}uIk>?r∆ö@o∞"[{„`Aj£Vãˆ?™¥p—ıQ∂ÚIªm∞ÙN=Ô÷LËìÆ≈ô¿™≈¿JºV¥À_yìJI¶6€°f⁄ùlñÃ£⁄8 !Úï%…“Œ∫VGøóí	Z›ßmSòq¶óaO«IÄfY≠V›Ë¨F:lÌqª†
vÈüø∞‘œ˙çÅqŸ+gDßÀ—U·ÿ%¬1Oå∑˝$>t/bﬂ¨u∏V(!VxMõDπ!1∑{ﬂ«ËÃ¬:Yπ/üÄ»¢t˘¶“ D¥ç^Ëÿ„ÕÔ˘åcg˚ØÖ™>`≤±ºŸ~˜ª“€ı:1±ÄÛ≈;	‘ÖœÆ∫´öÚvà6ŸÊ}Üﬁ‡YπP§≤Oå7æ&ÿh9¶À‰˚+GGÏ€o7ß”Â∂yJ»}Æ…1Qò|ßbπMÂòi3ö-°®ïu÷Õ$7ÄT\–Î1˝ﬂXA∫‰ùíÚYw~]MïxUrõƒtIÌm!G3∆B
•d„ÜM˝wÛAÔkj1ÉœŸ10∏ﬁàLÂZmªÆd-¨ÂPô^ª*Ïñ‰È-≠™¡`‡G≤€µ2KhPr¡∑o‹}Z∏¡s]◊≠Â∂SüÕ&®wOÄä9qêv«6DM˚f<œËp"tàG≈√√L˛"ÁfauaÜVw:9≤éñ&xq4‰-6 ò‚±∞¸ñ”øëêd›uÍ+Ç>∞ö:Ò]Ëø‰≈€1«–∂O,ÌB©j◊2†±’ª)Î4R˛’(ﬂJ	 m*Ò˙©-ÙŸøw—Îƒí-y[
Ü©&ÛΩ{ˇ≤!åüô–ûÌ4Ìb0E^2ïEÅzUÀìJ¶”Wh^,7úÔåKnåw,ˆ≈ñ◊hÔñ;≤ ‘◊•2‘#¶46º'‡¸&À)‹2§íO˚&W≠ø¸»◊™7ˆ“÷≈îVƒÇΩ≤Ã¬≈ùpµπp¡,`…Ájœ0Äªn2!„¿äWÛ[¬]qc•,ó†5·K`›ãkHµÍ	ﬂt\…‰≠»íY•ÇÕá‡‘"í9ë\ú≠∑§¨é›KTÇŸgˆ≠±uß|]Ü-|πÄ¿W◊zˇNˆ•î'Qˆ#"ŒûãÕpô'Ω˚]ÔIπ}¶nïT∞Xr&!ë* ÀqÎ+ºÌ∞»ë4ö—nô§ãOfïÑ "‘)¯ )6»<Ñ0Í€·,¡æ§≠Íi†ËPìx∑⁄[›x/·^n
Í‹˙ƒâ»»g‹}˜xï€∆{ó¯¯Akmuı|‹]_MÇi˚=C¡eàäÍ´.ﬁÙ3.pu”AO&}<‰πﬁcÄpëZJ¬Óx§öË!∏Í¿2˙≠R$lIMüP)ÚM⁄æv£,T°% H#‡V`XY~¶6pu"^ÇπŸ◊mW⁄c‚àîl{#–≥|tS Ì€◊ˆìçb,®"I€◊E‚§i7*«ÙﬂñX`ö%Z´Z%S”ÙØZÖ≥‘‹1
≠ü™ÉX0Ùc[/º´ I•Ø»∂lS¢˚–û;n˝_–Î =@©0LèLõ‚e‰¬á∑Dw˝úû¡b–QM^∑¶dÍ·w£—,øƒÒVxaˇâ-øé/˛r—≥^4¯°á‹†K%Ú‹å.$˝ÜE5j÷’É)±Ütï˝ñ=Uˇ[‹FìQä§£∆·≤°ÄPÓ±¿ëj:Ä-√a€≈ñäc©ÈÒKà[ïi¨§€ ®Oâ”˝„V∞àQ–X–íÖ-≥X-Tƒ=k‘-›äÎIÊ“RX¨\U^£)~ππª≥Œ&Ø¸ê∫pK^°	wx¬ñ1¡&1»…[ïúfY»’+√•©%lŒÇzqtC|mC58í†ET·é±¥‚ÎÎ≠x©_’JÒ{Vhõ[Ÿ@ùÌíoå≥a±ÔÂ~cÄD÷â-q©¨Õ¢0:?!Â…‚ ˆ»õˆ©r*—ù*Ú™É¥òÇ¸ZMñsô°–ÈÎ›ì›˝WÀ∆¡2tÁÂ'KjŒù4ËÎü†˛‹°>ˇ(Ì˘ù‡?ã˛ªV˝mhø£†¸≈¢∫Ô…uﬂOQ˜-úÉ
˛?áÚ€<4çTﬂ©˘6TkΩwÖ0cÑÅ$C”6^≤I«bòG•#'6êæÒ5ˆ«Fmƒ∏4“Rñwx¢?©éŸsaÀKc™˙*ˇ]Öë◊Çu¸ÍJ´Eø©∏1’e!Â-3u–ówATSÔ<@ì≤I<&'Yú >B˛®ck9ô%Òı{∆—G|¿õ-õ¡ÂD∫Fı˙è˙c1  @¸·¶zD±9ú≥‹sö¿1O/–1—˝Ã–ìÚ	ÚÓå…Qœ˙‘∞å=/sø‰œ7ôkìd†æ‚˛∂Œ≥HÎˆ©√ŒeLø‚0`=Â8åEtå@.˝bC¿Ö,å‡7Bº>QÇ5`Ï≠0àÊß}ßE!ã¥Üê…î⁄áÏ≠¯·ÄêÊûüƒ4?≤ﬁ§o§πx¡qîåÍ›Ä9„!ìI¢≤ò‰|ÂVL2ﬂOcë€Ködq3©Ø¸vÄŸ=∞:6ußUdjtÏj®ñ≤ı≥Øóü™˝6È@~±∏CÍx–“#1ø”ØÊì~òiAyıG’	”Ôöó5DÊ√Í&˙PÍÎ0òà©|•~’8‡¨›&iKTà["ˇõEf≠ö•«ótº§anﬁhÊj:7ÓònÊn¥f #Ê/e[* yî@‹,dÑ±√˜§M∆[>*-#∏ëb'¿òØÙ‘Û˝ñOúJ|%¢”iAﬁVVòv5x*Æ5è©ïQ2ü≈®ıä÷Ô=ÜWá1¶n¿ÉD˚ËG?x	‘1EÚ=T≤^ﬂêUË∂Îä˙û÷Mªw>√Ö¢–ù∏KÊL§±≤j…°àıﬁ`,äqÕú—X£}–‚íVÓÖDoPØT¿9ˇ¡π\ıª%,{¯/
˛ãTÑdã=l$ÒB¢{çvÜŒÄõÏ∫ãÔX˝Mp’èΩƒœ[ƒÄ˙¬é◊7AñaxÒT‹:»≤{™D
-~&cwÂÅ£ÛY?∫<÷$Hâæó⁄£”÷2_hFô¢¯Ef Ê˘>˛≤äñÃ√85	-ﬁj—Ë4Â¸{ãCz_¥Û‚ãGMñ4û<S“BW≠…GÜNÌ»®…bH?s‰s‹•ˇs(i|Ì¡◊›N≤9E˝‡ÑùÏ∆1
BÏ#b~Ò`_Y8⁄‰ﬂ∆Ch∆‰≠«BÓ≠‚E˘æ6H|ÉÕ;KbYîrêbª˜zΩY«&FjHpH≤∆f÷6ˆø6Ú™⁄˘<“.ÔÂ,-t£«B’‘˛üI""b°jÒM_b<¡a2Ä©ÙˆèÁ âûX◊D∫˙â¯ßq"†äHßäÜº·∑sÍ⁄m´•ËÓ<~LÒ≠q¡QW
€2ö√¢3Ó'ƒÜ;5∂º$Ò0ñQ†@‡:√¯m  ƒC›n¨¨ﬂÆ ™ø≥±àõzg¯áì∑¬oÑäAYø;¢±«“EfÛy©VZ Xæ··ó>7j0ÔoñûßÌŸ£|få◊‚ƒïI5V†/ºrqíC
l†’x…Í¯˘ç≤Ÿª¡óÂ@πv”i»yÈx⁄dFsÌDqö¿s⁄4K"µÁ‹¶©'Tã*W„Ω6XxmEu∂ dg¡ÿü }z1éçá¡›˘xü÷K1ﬁÀÇ˛~∑;õêG.ªT4p˚á€ˇó«]¸¸⁄ﬁ(i“–÷$ÕÌñ‡'ÄTª∞Å6WûØ• e·]!ô(8Ù2#W›õN+ñ±-€Èô®Z(≠EõØE_˚√4∂Íö(ôàﬁ¡"ˆ?ç°F´¨<Wµjó¡≈	Ÿ˚ÆÊ#_ú≥à4‹§>˛ê≤’Ïöª‚ò]€<GJäŒ¢tAâß÷ÒúS≈CµÀ7]è~ØâÎ2ëzìs§E∏úz ÆN¢a¡})GJ:D<—®x3-:V»»á—`21EòâJﬁffÒÂy8s¢ÊÍóÖ⁄™≈Ûäs@`&8Ñ∂ô˘^Îœ@âïPﬁ≤O∆˘â¸`FÅ/:—/óD7R¸ê`ëÔÙÁ◊}œ•-¥á+(lÁ4Ù"π˛Æ¶ÛÏt¸ËªRT≠Cö%‹ôöfj>
<6?(xâ‚ç(`41¡ ´g¯[∆J—mºdè+„êÅSÍÄv°ıÉ»∑⁄Ü'yÀ¶X√[Ïê}\™¶&dåAiÙúbAÀlB‹∫MŸ√÷˙+™f¢7»ÀõM¢ºO2
Ü;ßû)Ï¡˝1Ù…ª“ÜªÕ‚π^:û#GGÏp#OÖÉL^[:NÈDòÇoÎAVÚâEÃ
†]˙n≥j-D≠ˆÛó~˘jÈC≈[ÎÊ◊ëÏëËÙD.òD#¸ô^ﬁŒPÅ∫Ô3R∑öÈ+ea∑Õﬁ!Ê∑O2"ˇÃ>(`∂mX≥E¢]©ÿQqàO3Æ•⁄ñöHXòiIÒÙ,u3ÌπòßŒi8f—j{kõ≠Á[©ﬁ!G≈Uÿ•Àßx¿µõ1ë5ßó≈/‚i¢ùm™“∂˚P*1ê;é(∑LxVîDñ≠ÜÛ„»€5∏Ä,≠-√p$≈xaöÂHu´¶^!#RŸâX)‘9ir^=÷ØëÙ;∑∂IÙΩÇ £æi™'«±˙¨ºû*¥f*i©´JIàı¥/^Ö±¢*‘/+dÅ\l\d©ÀπÁº◊M÷≈ø:8ñç…˜ÊÄ\%å≠l<#«\~v‹ò¬q“˘À&HßÂ…‡›G$(d¯r∞‹ºªqû nO≠á¿2Ád%x‡Ù ª§W
r%°F·jêÈAW¡9FõE—=ñìduÆ&áiv˚ß$PFÅŸ$»¨ ¥vî…fécÎö.o÷ ¯´Yø‡&Si∆cªßÒœı;˚	c‹≥O^•vxpEx∑Ú¶7ÿd ¿~É…n
^[™~õ7råa‹≈3ﬁwÛL7™Z·7∏y+/ƒo1¯ÖVéﬁì(xÓÚçe%w¸CvCÁË‚z[¿(Ôî[ÁÇOE…ŒY∑⁄©é ‹…¶Ó2z‘Î¶~≠ô§Èæe_	∞Y-7ª6>ÁÍŒ∞Ò9◊zWéîÊì‘>∆äã2Îs√k-B±´k◊z#≥√gFê°%**DPáæ/05≈RX⁄Å'ª±√‰-óÑúe∂ª•+àqì¿º$g˝¥`∑:ónÿ`nî€`ˆ¿K≈†Ìl+ƒ‡©≈I
S9ç	u,ºn„(Åf¿UàâZl¡Õ˙’<EÌ&:ÊP"L@ƒÇµ«∞¨≈ ¶Ï√.∫O÷Dà®6Kdûß¢]£6ºM”¥˙NèÖ9ÿ™ „aÌÒøˆ⁄ño∑∂¶YY+ºÿ‚rıÄ£ÊróÎOæVKú‹/ï~~ã∑Ö@@8ˇÈwPhUµÕ"ñ®Án∑8Åû:ISëÓË∂i≠Rˆ[Á	∑¬V'äÚÍ{Iêbò$·∏Hº   L‚65Ω¨b(∫„Øº\êïy÷#	xZkÅØ‘ŸÁÒb¿Væn[¿q∆ofD˜•áﬂ%Jﬂ í¥)J``ñí2ÖPÓ6…ﬁçeõ4πhXSÄ3Ï{[ñ¶•|{ùºNmV rC (ã+òê◊2/∆Pã<3≤:$„"°ŒL{`ı`Õæ &vˇÀˇÒ˝3;ä—H√´W¥}ØÛ	^ÅÁ(¥fú6⁄L›)Ìy1*å#ùçÕ-êØI¯„˚TºÉ4oÀÿ*à\≈¡/87ÿ–∂øN(îÔ°&ñ⁄ëÃ‚óì´"†Î7È7.æ_‡Óî·µXqJÚ9T	*üQÁmI≈ãUâÄÑEŒhŸQj¿ˇªTÜ∑w¨§õMﬂ≤ò.º+úéíµv†¬|ùyøBùzÚ¶∏§üyÅmti›Ç‰ÁyÚ√ƒ7ìäÂf£Ö’vÌBªÃ‘J®fàô ∞€Ã¶∂˘2∞Ñ∞ñDÑA_nP©3	Sÿ~êd:TSv§ŸÌ¿ç~m»<à7˘ïü|_çC]ìuq›Ã∫¯ıW˘œ/Ú8òÙ@∂ê9<ùd0%W§Øb‰¨¬íNC¥QÑUÒ¢¢ÑP ™ËÍ∂«∏œh5πÀi”Æ ã≈bW≈ï∂]éŸ∏csîî#¨h–◊êÃp¶s]˘›…ƒÆBFœv=AY1÷ÏL6ô¡e‚]Y∞SP™?wDAëQOÏ¬Æ¯'’¿ŸYº…6Ï <V∑ò^Õ:˘¬è£QEÎUf}Rës.K"Á¿â¥≤Tü…Î"˛¶ÉÛ(À/5ÓÌÿSågÖn≠lÿ˙ßBÂYÉS§Å∂ìK´¸L”Ç4P~jﬁﬂÂD”EuâÔÆZ–Ü:Pf{¸ËS´≠à»‡†ﬁOVbn#u©S_ÍVò≤íP]≈‡\‰ÆGÂ≤CqiÒ∂:MV)wG^/S´iãÇ1—ØÈhŸqºÙO©¬ñµÌsscÆWQ!ÁéË˜—«Ÿ^§vUå¿“lM©i=‹Ä´#ﬁlâC[v©aﬁ;X'•®o¿ÊÅi1¨r¡ú\ÂÏ^gìë¡LRºù"mz‡.	ÆFÛπá k5∆B—÷jÉ≠Y‹[Òv§≈∏ºU—⁄‹ Ä–Ee
è™±P7¿≥Â‹DoF∑«´éıqﬁX¿º"Ÿ[)√'¸1|ñëBqã*◊ÄZÓÌW∏‘◊£“>*4``’CU§Í≥1_õN ‹ÿ9<ı¢Óû3eï√”“‡93wVH'Ö‹ùÃiÒbö∏ ß≥#‹I(π‹t¸K§'		=2‚hThN¶¸≠ŸZ·uw,ÖÌ&Ÿ∏TÉà;ÖΩ≥,1èzT¡sc8u¢xçïΩ+rÈ„&ëK◊VóÏrÿd–ƒz«∫'r3◊Ú¶ùÇcÍF£_.1˙Ü†bÜ7ŒÎ\√ﬂ™◊ÎônÚñ˚ïÒﬁÚ4 '+u!,DNVÜä]foÒ8}ß]∞c÷ÓKÖ*-˚ﬂYô–aqπãIú•à&h˜úÔ™⁄Mw≈D\ÒÍ#n‰´Ω=‹Ú0sﬂ÷ﬂﬂˆ
«9Î ˇ∆vÙè+k¬⁄Í]BG] ®QFª'˚	˛)ÉΩ¶Ù]~»d	⁄«!â8-d≠b%SaÆ=øw¨[p6˙sC∫ÊÔÄs-◊UÎLA˝~E˜u Ãl‰´{Ë{¡ª0U†›˚4˛·˚Í∑Œ.9ñ 	'ä.∏}ﬁÜ^ >M¸¸±XŸ†Â(Ãı¨Å`“(â:cÂQw±ˇ5y‘µ>Œ*!?°∫ÑEÈ∆6<–}€]∏µ–üú†œn‰£y%ú‰˛Â5Œ‰ﬂ6±dQäóU∂2@KˆÆÄ√ˇΩ€Ì≤ìÉ””√óﬂú‡3å‚IêanÄ¥<àb„∞$MB)>£íõlw6{ÉU ,zFƒsA€Z¯¶˜]÷˝\ﬁM‚Q¸&ôàËäÙ›®céÓyOîûZœÃÜ^†ájä~-6õÿ˜í™¸±H)Å÷‰A∆‘O3Ï‹∆£ÍAÀeÕ©"ŒıàÒsÎ€”£ÙÓ``åg8áÖ¯LøJ”8Hödcf„√cˆ◊xA⁄ÆË<n£!ß 00OÁÄK0‰’åbÀx˛4åÿ,Fåã∂ñÄ3D Éù áïjp#´ªØbsÚ·—ú!¢ †B{ hŒ‡[+dNπ⁄ŸÒ˛€elˆ2`ê⁄eÖèá4£ÎÂmÁ˘⁄fp'{B5Œ£ÉóoŒOéNŒˆæﬁ}Û‚=9Èd
WﬂK«˝Is«ÿWœ§Ü(<H¶Z±ØÁQ8a{ØèÏb",@™ï=¬®1#å4mï≈ ıö;…˛[ˆMr˚{\ÅBÁ∏ÉL/.óßPîdIœxúΩÜxÉxÒÄø¥§"3i’
~Ov≠$Ó«?Ü—8>Kº°ﬁ·!Ù6í!äSöÜ¶∆úô´t*P£>Æô—{Ì<√ôòìŒíG=R?»îiøxZ¥Û0)òî»,¡nlã@ƒcgë¸≈òb¢Áº∫àøeƒÃ«£…<≤.é∞éÃiûXK¢∫#yë(íåÁΩ0›≈Éf≈U1√tPÙû—xl‹¡<¶ŒÙåø\ÊQõúúQÏéeÑêÆódXgÍ]ıÉÚ˝j≥10)-D≠≠!‡ÿx¯≠yd∂yÿ/˛•"zâ6±jímÕ –“7^Ç—õÑ>“õêNE6å;D·ûRLy=ıXã„†à!Ã#
Ö>uB¿]gﬁ¥µ	C›˛!øXìAI'Á‰\nèùÍAÛô’\Ëß'≤Ei…ª‡¶ƒˆÙXÄ≤&@FFVª€î)ÔÖ‡©NHµ?•Êöûáº[ˆ[Ë[œ⁄AÈBéÊΩ™¿ô)S∞√ﬁ@ÍƒÜ,dﬁæ3@í„∞É’Ü0≥œ¿|ñb¨ë‹C_˛¶˜“
C€ÒM¶!,Òöáø¡ õπ€2z∏ûº9ﬁE‡√õ≈ó¬Í¿ˆfµ #ßGò*L˘£B‰4âÑ£Gë“â~eÂÜ`Ú≤á#5ª˝˝(å<Â¨ÍQÃ/Nÿ{Àfx∂]ÿ
´˛àî0§®kyh6§¶≠” Å)–aá}8F«◊¿,Üc‹a‚ †ÔU2†êy1≠Åêƒ&Hc°¯Â`2Áë»%Â<…√Ñ"√Ü|F¡°ÆÙáì–˜–8G¬	,ûÇUﬂŸÈÓW•º	≈A“®ù9õ<éÂƒ¥ﬂÊnæÄ)˚∞^Å¨|¥Zb]ÿ
ÍÓ`0D¸`ùKŒ†P6VKj0Ä≈SüC+n1:âã”	‰ûË√«g∑ÙÀ˘"C‰‡ f˛y~P0≠è@o?]òü∞∑˝.‹Ñ16ç°8.>_úß0—ÿ
„˘/¡Y¿¨œòª∞∫(·0¨R9óaΩ(·4\‘ﬂÓ¯ó„ 
˘0ÙøpêÜ0∫©Êå¢?;3`¿&+‚üáÊÃ¯9Y"‰Çd+Œ¿KÔ ‹Òmûb~FTcx1E˜JπF√ù3@ºƒÂ4`Â®à¬√U›6∏ªFÀÔwêtr…rª√.∆A¥ñ√Ùupmo√ˇ˘“-Œ£tﬁ«XJ—I‰Õ`È≤÷÷J·áÅ d∞mﬁéJÙ¸x¿QÄØùRüN)ú4øá(ñÍFzO´#Gq’ÿî‹˙®UT*aL<T,qﬁÜ¬ÅbC¯ª±äÎá,ÉÓZç¬bù#ÛCÒà1.ÏŒ§-hà¡jÁ›AÉò’KˆÈ±„◊Øé_ÓRÔÖ¢ÖïùR∞vO∆ÑµêŒCÃ¸Ãıæ˚π÷
uiH\ZúwÉaqá å@“√6dêﬂ$‡ô5YJ*êıb∂té‹˘ÛÛ©.)0E)mÅ◊ûåMà(€¶û-QÀΩâs Sˆw
KS 61O#¥™Ö1J{/ÕNÇ ⁄Õ(Û™Y√»{¥Ö#¢|aÿ/-Ë¬K•≈H2ÔªÔÍQóÃÚû£ºÍª†3lÒ—»∏qÆp›t
Zç	¿~àPÄ` ˙»	ÄXıCWZÉ≤®µÀT¡ñ–ﬁ!
ÙFÄû≥]6√#ÇÒC¥l@Â)¨ Ç:eL=ÃLG –ïµ6KÆ‘!Ê]s<øZ>˛3∞Gá©	¥…+bEø‡ƒXdàΩEÓ.ŸI5◊‘æó?ó®ú¯à‹E°q0†Dc2<fÒŒŸq‡Û¿CÚ¯∆R€Ã¶›≈ä©pî˛õ„~¥`ã`LÄ
–|”4`#óÑ7åöê …x#†¶!†í*K»VoˇÄ≥ãbí–"B£ >FaJ¿öiéHÛÉ·ıÖh	õÉ⁄rD)c)±AŒ±0porj-._ æŸùÕzYzâäÍ9ZUß0~≤u£Ê∑ùÄÄ“åÓ≠ãÓP1ì©ÎÕå<á~—äl¢ÏóıûWjﬂºNDÀ¢/å¬V¡Ã®‚˚A"åÅ¸x «k@ 	Tw6D©|í/G q]<ó¸GÈ¢“æuÿ⁄ì)Áß«Õ≈»Î!œwr≥MSQî…XxÔtF∑\gsº€£ﬂx◊Ö?ì∏4DØÓÙÑòeˆÇ+¨EçU5˛KØ áaï1qIÍ2PàˆÛDÚR°ã¿dÅèLFaÆÆÃI°Zøøú¢á+˜u8	∏ïG$¡¶∏A‰/(‘oÒ±#Õ
(NôqŸY B`X∞}eÌÅø”ÁΩw´Ôµàû¯–§t¯üÚ ;ÏãUŒó¨?vù€Â]N·N1ˆ ¢ã¶Sò0˝ˆ˜ó¿âaıø˘™Gwﬂhã@«y34B^EIrÕXìzI„ ∑%ñ¿ÅÈD¥IÄ…7…D¢Ou∆Å'xÉ¥ÄõI„	MNÇÔ·hg4g=ºcÂ“:n⁄kzêü&ä @ä#œaD4ﬁo·'•F∏ÁB}.Ωnã·
‡ü›tgˆ˙ÌO.w[¨ÎÄ≤°)±N“—Å†Â9≥p 1—»3U}ú`]+Z3ˆé˘˝¶‹∫¸Usi∫©<màÀŸc‡–˝≠cÂ⁄ED	ïôólîHØ
‘œ√£û[ÀHøÄG±Ìq;6ó)étÛ#Wü™™£‰§}⁄A“±ÙgÃH2¨‡2n;5ˇnp8¸Y1ßß4Ê·Ôçåp¸Q1Ÿ¶RÂ(Çu8>¸{÷:`çÑ— â#“: ˇ˛åÁœ”±ºõÖó,ù«Ùµ"≠'/{z5¥Ú¯”4'ÃÜÑ_—Ï{ûÊ§Ê	}À`RC8µÙ√õ≤ªò‹P˚aı¯U√pzâ•ˆ®z¥{a¶*·w≥Ù	¶bTË—ã>®Æ‡{EB∑^ÍÂ≤2_ﬁÓãg«ªˇptÚÙÏË‡Ù€W˚'ˆ%	B7†Ä_ñ“ﬂÆ£uÈÚë}? X√ãœ	∞Öô^a^‡ë ©b/π˝âﬁ∫Î˙Aø¥Í˛ÌO}GM2UI ¢éq›#ûﬂ˛+Ω∞jıc⁄™ˇä?(ò¨¿\P⁄“áÑœnèã∑ADvz«ﬁÕ£ «"Y·ÅÎçC(°#+ˆE_˝‚ÚZãˆﬁ.≈aú8^T']‰¢Á◊ÅHÎªg<≤Øp0}÷ÑTUòÉj>Ì…36êƒ˝Òg¸:áV[K~≤)˝7Ÿ⁄:å÷YáÖm©v3öŸ_≥µé—Ú*Í…?Ó‹b¸¥<b¨¢ Mbø¯‹Xà’‚zãpb<rÆ°¬úhg¥‚›*W˙óaüí·≤|lY?∆ÀSy©¥(û"¿[VXÈ ÿí`8ƒ~—$wNYﬂÅá˚€◊–∏hHVò9˝›ÿÀRo6„ªe>´@2¢ˆ!.3HÙSΩ∫zX_ˇkoÙ„¯É^]>´Ø}Ä8\ØJÍÎù¿“Ë’wÉﬁ‘JkägµËXî◊¡Å?)ÉÜ_D&˝Ì›‰Ny´ß_Ω)Z,.Ú¬À≥¡ïfíjCím=CC}*oëaΩ¢FuyÂ~˛‡,Ÿ
lÛX˘‹1$»º!tG•B&E6::úπø\≠:±yÀq◊)¬Ÿåó<õÚ¢˘ùgI=Ï√Û í |Ω»˜⁄1x^˜Û∑úö’Fmø)π™ï†€ø:ÃQ∑J∆È@G–=oˇ∏{íŸW[C°¨"ôﬂË·›∞ßì
<ç√^N'Ù‘´b?Mä÷∫7Çdã
ºgœüsB•‚F.ejΩ§5‚€B®V‰l∆ã¥NWM0µPøÿU˛ÏB<≈z{Øééw_˛√Ÿﬁ´óßª{ß=˘ŒŸú"f{°|ÏjPΩt∂(©ÉŸ‡P<uµ'ﬂ9õ#äa∂EíÅ´!z·l	àŸQ_G¯‹=AI¨±àßŒ·àwπˆÄ∞xB](ØàùuÏi÷‡,sÄè–˛ß+’|ø:%`EbZ_¡¿ÚÛW%ıv#'ù Å˙m¿ÔÙL7ô“ÌeH©⁄(w¿ƒ}Ô…Œ4[£ø“ºñN≈·‘#Ó·•ï√“cÄãy˙Øô7ºÎÿC≥ΩÃÛΩfCkï4ªë¢‚gPuïŸMÊñÏ~1=ÿ]‘V¥[©±]w—b5Q_Yª™√‹X ÃWŒ ¿t∏bd«!FöGœ¢„Ö<êC¸erÛ∆ë∑y®wG)öáÌä„gv]m+•¯KÉªÕ]m2K‹W%›L«&sâ◊üƒ©∞Æ2´èFÊ]Úì1‡
ßÚsQk¥ıq7ü|TÛÉå”ƒB/º¸≈N»ÅõL®ÉÌ$  ∑§ V%l)êJÈJ€| Ê—[RÀ]†@«+¢Óı◊®j∏]∆Ò·ﬂﬂTïÔç—–˝¡/BZ3–U"≈0ÆAôº‡/¿∂Ù¥)ü(ù[°®í}TŸ\√V(,UVi”
EItQÂ∏ﬁ¨PeUÜtd≈vÑÃë7%ïbøÿ˘08‡\D"iÓÇUÃÈ#ˆüoè±í€C\4òº˝”%ŸT&§^M:ñ(Ø	çÖπ„9K∆ÙKqJ‹áoeÖë+˚ë°I ≤5§¢Ãıöhòb;“iæëøøpà/‹-ÇÃNÁË°‰„{·Sqb?À@‡„ä⁄S¸FgU˘fÔÒ8–-ËC|m?“ØWÄ5ÅYbS¸R%ˇÌb—¿Àl*1:Éjâˇ¨–˙Ú:πÇ˙ ˇ][ÎÿK”ã8ÒµäÚQm›◊ áZ=¸i^Ñí_7]ué&,◊ûûl˘k‡Öó}Cœ®¿ènõ§·(
¯è}öÂÓ_Ï≈ti™ö*éÓ‘Îß⁄ËgŸΩ÷{«∫¯ÁV‚…mÏíÖ∏ﬁÜx≤@<dDn◊®∑Vxg¥[xª”∫æ…o(M™8w–:ra ã–K4“·±G¨ß’ótÄì±Œ/Ûﬂ–%jÂ ˝R{P_œ ÈóÊ≥˙⁄
®_ÊøI®˛¨“Ò¡TU˙_	”åÖn`*º´rè©eñeÚÚf¸›Î¯B™ìsßbÀ=G TJ£â¸O?ƒ8¥õ"Xƒ≥§&<™D≥Ø√$‡F2ÍVôG);œ…”õùË˙¬IÄÜnºëPÂn∂t¬¬br+äqö	YÊ)ÎPEß»	 Ëé<4åñ≈:‘˚ö-\v¯ë»5h‡ObåÂ.Ó$bÚªö|K€kmt® =—Á˙Q˜ârÉ-@¶∞O≠eî¿HõÎa^1ÃJoŸŒ3sCqø‡˚ÜwÇÎûaÆü6f∂∞≤ZŒ¶ãn*˜¶§Vk$ı”∆ › jzhi´∏jaé¶è±aE¡™Tˇ[â ô•s4“BY7!Ÿß+±A∆8≤Â4WGo¿8”wÔë¬ÉKπß…™»nsæü©“˘ }Fπ˙2^>Áœmπ4≈|?HÛâ\ƒŒ≤T¸9„Ÿöã∆.≤5◊o[L^ﬁÈ∑N~ﬁœƒW„ÓŸ` °PÑÀøR7ô4…àÂ.#\√qÄÏ_pND&0"6≈ﬂË`>lœO†‡À›WåÆ)BÕˆ˝◊˛„ü˛´l=Ω˝w'˚$∞€ü…h≈s‘5£◊¿.∂ëª˜ÙœÇâáÒìŒÉ$‰éàÙ†ΩgŒá≥‘≥Ñ'¬c	âE‡©â];˛úΩ3¢âËCzt!=H‰à˝cÜÙ1ÇÓ‰1uﬁã^7º◊˜Ì‘pv9_)ÒÄ≠äÇ`8–¢Ë¡Ã`F(#T@	‡Ω=¡wÁÉh0bëÄgã(±÷À8∏]Bt√D¨ÂÒïè9º'”ãv} ÑÙÉ“«®∂éct¨ñıé eæ<ﬂ(áYπ˜(ØOê†°∂(ãèw3ÿã1iˇ≈S2$îΩ;˜√òÉUa∫÷&>µü·‹Gx´?ÙÊìÃUÖ`ÿ:¡7ƒgkÌóbzM\.GÛ§Ü…¢Ád~ú∫»§ìe+“œÆŒ"úÑ—‹`U·R"¬π´3ª6®c\Õ´âÍ⁄;°˝“erÌ-0R-S¶kâWe=ıØw@j”õ¿]ëÂHX—ﬁiHI!)∂XDúF’°wã≈Ië•L´¨%û:˘v∆∂Ω©cŸ{ú^`“zr"¸ﬁcõOŸõ7á˚®aC\ﬁí‘‰{Oo;∏ƒÿNzc∞ó À]°’uf¬ãô‚—Os7≈P˚òªà∆t,÷˚àY–≈ç¶a"1C*#áß∆≈ÛkÙ≈ßü®°Úé»zÔ——ë≤ ´–CŒb∂Ñ∞Ÿ]{˙•¯,µë,Ú’W3Åﬁ=Ù¡1f¥é”âÑß"∫^z?2Æ\∆∆Buπ∏ç1bhH‰ö	¯^-4àayHCe¶è…h/0„ &n–U∏∏"}3«cÀV˛∑w´›/ΩÓ˝ı7]ı˝qÉÔkÎ7üØÑ=X´ÃBíe5Åà7í¨◊ûê©óîìgÊ⁄‹¶$ÖòZ ≠^1gâ◊èI.“%ΩÉV¿&-
ù¥íH≠(Bƒ$h ‡Ú¡‚d‰_
›h-Á#ËË=§‰=ÀìMÉï4¿ööCúbíT-"oª–”ﬁ∆†]Ã≥†Mú\òçN† w≈œÄ’isp$_€|trü6Ç5ı=~Ù"Ã•œpçHÁ˚çr≤÷ÖX–wÀ|'˝rÀ$âÎ9B„x^)DL√=28“[3_≥≤˚mWÈ~MÀ¨…hŸÀ:~J∞7mT‘M„√@ù\&µ_-rõ¡?7\ÅCäsUûiÂ
8?∫∞Ω©Wﬁ#¸‘·◊∆õÉƒuÖeØës≈ÌBaƒ/∏äK^≤ö»Ü¨≠o<~Útπ£Ø!,Å›∂–
ü[ñƒ¸c‘A¢Ó}Ãßœ¨’3ÅΩ∞~Ä†å-»I·gñúyW¬∆˙W¡bÑÈ±`˙{]–q∞gY=?rÜër≤F…ôWÀípf≠A$7*ıÈZ5mÈ¶µ'¡äö¿”ä:∏¢Üá˘∆DÜúr∫LñkØí5ıò¿r¿4TQ §⁄ˆVﬁ~:q…]Fß_¨p/+‹ÂnÿgÊ_›FêïÄc´Ç<•¥xÖÈ£‹,–R§ËÓéwΩóêàj¢ä´ÿÚJ˙®ÔπCóÿ∏+J%Çöv}Éù<“/fú÷ò«  CÔ^ ÀD¿â≤òp<^tK6π  ≥h<¶íù·ëi5÷±|fT$.+øöëÇhõΩì8*ø∫yo÷Òπ4Lääm´kj®ƒ—T»UI&}	E‚–Ê).¿ﬁÎ£rwÛ`’ÛBP]5∫iè77∆’&‹6Ò:ùÇÚËÅ‘GÓÖózôm•ñπ_≈Ls’Ã})g»S|”ƒáp‚5“ä §÷îlyö∑["ä /O0óhÉ‚õ¿Ç ^ë˝«ÄË≠ì7éë~x‹¯I} ÃDÅlüˆúF/ÊFë ıáóπXûˆL‚⁄V˙ZådTlûãX ß ÿ>$"Ó° Ø%A4ùç√6à´≈^êh˙‰@!“öáë˙ Wc¥/òKæHRÑ)0*
Ñ»Ø∞mà,úFÎ»°	Ú~YÎZ∂⁄f©≠´w‚©≠ÚÜLµã°v0”ã3“ã0—äm^ú€ê£˙Âºµæ@Íï`≠uB◊8òÁˆ∏œdèn¬4ÎM≈WW≠Æ*ŒYk›÷ _@≈Y(úÕZcQä≤fí&«≠Q≥bëú·~pu|±s≈¬õx?/Ë‚‡´¥’:çÃ[AY»Ñ2Öl6ﬂ,a…CıÜÅ6H€&'ˇÄƒ˚ªó{^1¢
+≥˜ÓÛk:oﬁS,BúË«∆Ì‚â˛Kt–Â ´™–ﬁ¸$ëxÊ’s\ﬁ`ªÄ1qìJLãˇGs&N≤”¬≠–¸ÌÔâû„%¢ı(–#ÃOgyh~≠∑{ﬂiÎ≤iØÀœª®≤Éâ ≠C$ÇE¸~êÖ⁄tO‰b‡e/z¬G‰Øf¢É)√íYFQ≠Âe«~;Î|•ÓfùoÈB∂xˇ∫∏ÉJ¬$@Í%≥ÍìÄ≤‘`‡Ú{í`ˆÚl	∆y1éw^wÅdª›˛§ƒrºñ»$:!á¿D^5Â)$*ec" •Ô¡€xp˚Ø,¬q, ˛=≤ û!œ∆πÆ ¬8ßp⁄ W„	ƒ∞îxØ=©â+Êwj¢jÔñ>øÊF7¿Ä‚w¢ë7mOΩãnNû≥∫0ë’ÿEƒÃaf^Ôª™ ôRﬁS∆*˜z{0◊UúÅ”;r1pÕyü`±•ÈXÊ¶f•N}¡m"@LB@ì&s9Å$HXHJ˛d±Ï˘çFãnÄ–ëNÁ∞ylM∫’äô¢ÒåÔéSn √:êLΩÎ1ÛB4fÚ≈!0n¯uÄì%0è2èÿ	¥g,ÑnëÎ‘~ÛX¥
›˛Bö}…Œ òí˙∆îi ï
©¸éhù0JC˜00…¸éQô‡µ¯JBx13ãC„Æœ∏WÀ˘j>CKŒ[ÈπÊ˝Êéÿ\bìy° Gb£W˚o^`0˙√óáßáØ^B@-î√kfÂ° róÍô≠0Î≈˛€èIÈı1Ÿ∑4•HIÜäEìë›-üW°Ò`ú\-“Ç|\Øfâ¬XÎµ,◊nêÃ≤ÆÀ£Z) ÈÂ’Ã‘5û)çª…NBæ®ìÁÉ#9bpπwJ5é",ßÖC{3lQ<ÄQ◊î≤ï<ﬁ ULƒG.¶ÿ:xi›zòLz ∂/Åì9KÚÌ(N¶"aùj¯km]‡Â,DMŸπ√IÄtf})Ànß⁄˝Yæ(uîàHâ$7¥=”Y‚hëCôO$úxˆ!Cœ√"∑EÃàÅw<ÅÖNy=OÙ(S5ÚÃ•8Ô 3«3Ú˚ıë#X‰$Áê aZvK	è∏Ë¬sÒn <oˇÖ”"àW#Á1“/,t•≈)¡æR\+RHRÏp87å–0˘†Ñ¬-Ï5îg-‰vR,v∏€ft ÉKÈGéë ,¨HO∆Â˛∏HíBmí€ˇ{Pö*-7ît≈„⁄π¨8ç+FJ–ö•œCˇ°∞A≈’I"O◊∑"Úãs›2%x¿‚°(ŒCÔ˛…üO‰ËœÅ„pú8ßÍ]Å`té#…±”qÇ«]_$TŸ¿ñPvtÁd∞Ä_πÌ’<Â92o2éπ˚"lícÜûﬂ\éX£ÿD∆≤_.óbﬁøÔ[¸‘@;≈¶'
éΩ~•ê„ÀòBHbÀß^=7v„i °Z0Ì:&4«üqm1À8z◊¢õ7˘Y sû;áè\éc±i€1‘ÜÜ√ ÅUÿWœ‹)ìpâÖ ø—-ì<ü4™'+Y~LÓäôC∏ç&ØH8
Õ≥ÖLÀrè∑59Iî$VÄ@±s/ÇÔiëIÁEvÍE8‚ôjÜeó˚*Hˆ˝ë_2#2„–‰8ÄÁa:◊í –›aØøAºOæÕ8]"KÜa^=©Q»Ê·ﬁ˛—ΩteùæG"˝JÚ√<<Á^»Åà¯†Ûu™ÚÏU£ ˚¢À
o:H–äû›˛Ô¯“ÖâD€îc3h‹˛>YˆŒ„π‚}lcX1Pw)T‚i‡©ˇÆúp˘≠¡DºÂ<ä„xx˝$L∏Y^nÕï∏√Ÿ“	 C‰sdÈ'/M‚–R:~M•ÉDg)7€#œ¿¬ xÊÎâ£íâidπ)3ûê$ÃH$#!º@69Ç:Ê‹âéÖﬁ4ëÈˇáSôã‘®ÇkP]å≤§Ú -›ùCìíÔMÅ]ë√‡ª–aﬁ˜s:≠πˆK21t©Ÿ˜db±b*˝òh`[~xÆgΩOg@ÒªW›/@Zßòÿ8ì°Á”ﬂ„x
ª_>a>‡J§√›'´´K2¸÷	w∆˚ñyW≤{fh€ˆ	˙vﬁ_ •Ûæ(∑ã≥„|A0àSôÅ∂»#hµ≈•…ˆıOfœ ∞£Ìk$∆7hA3	∂ØsÉ¸õùnHr:˜„≠^iGj9V‘å¨Â%°œ]¿åiwçMFõ˘œ«l‰Õ∫k˘Ç@ﬂ`e§∆z3≥Ó*4ù'ÒEw˙ÄZÿ∏;3÷'_ΩÓ≈∂{Ââ÷—;ëîæ‘ME¶≈_îhÙO4äøKÉÙÉÇ›6Ÿl·Ú°™ ‹ñ[“‡´Øº¡á˘l˘=y˚µ@å‰Åıq¿¨˙|ëÕßå}Æ∂Ø°ŒM·ç⁄Â S!ùz}Í‰∆ÆêØ÷ı jŸo[∫ËÒÚëaw36Î>Âøﬁ≠≠Œ.ﬂ≥!`ÜnÛaÛ?BÂRÍ¿Øv/B8[jΩ˚÷¬3äQÑ{ì…Rß0!r4R÷¡$ÿs∂‘u))CrÖ'Éè'≈`
›/·†∞M∂Dèx7èWŸ¡`j…é˘Éº–í›±ΩT;Öë—X∂¬wÃ(‹÷ö⁄ZQÄZº Ú Ì]¿QwÉ!º3â5‡k% õK&†ïõ6|ïa••‚lÀ >uî≈‚„Ω4-ÙÂD K<ÒYæÙ9∞dò†ÄÓŒÅii«
s‚±cÿjèûm≠å7‹®F)ÎÑC\Âµ)w	ß€Koß òÚÑc…%yk¸÷õÃ°ı/{è{ÎÏ EÄK3¨îáC\i‘≈·>∂æ;Ì◊e7ÚG›«è◊ª«Ø_Ì/‹ÙK¥}ÉE;ò"{k˝⁄;Û¶a”{/èˇs]{òÇ†¨Ω≠ÿ%¨9üµ5;fVÑzuˇäA≥]hõWÓ≥bü)3ê‡“
« 
s‡â˘ESPäV	UÅ·m€q„)l§–÷`&4L!äbÎ££›7∂… „¨F∞]≠q®›·@K±√á(Ookevó”º∆“È¶}∏K∂AeÂ∑åvèÊ˝€ïY¨Ÿ˘ç“¶›[QI*Û=z≤jN |ú-ZU±3Ì≤•rè|8	.ºÇi⁄%WnZ°«U”p4r—]ˇ(¯_œ1¶Hw [ê¢u˘5ﬂÄú
KÜB∆˘œpx%Œ∞âë$„∞È8	£›’öQ‚ÜNdz`\Lab·tƒ“d∞ùWºaﬁ$€^¢Â¶„∞dŒú∏†1ˇ˜1”QótÀa¥Tä,ÛF´m2ÆC<á–0√V€◊Î_‹ÄIÆh£~À [ÙÁ∆øF ·y'aΩ~s∂B"I0‘ñõ»»Î`x√0¨!4NÄÍyÉA0É] l∞Ú[c8ˇæÑ,.£ 7 &◊ïù¨tT˙£rb¶çëK&ı;$Ú+*@≥O–ÁX¸p!ÈÕ]™7Ñ>íæo_ß*„ëû–©AñPXˆû†“@û±\´NËSÇ‘Jò˛D√vµKTª?pƒ›kÅi¡HÁò±◊ÎQN0°¶≥4≠_-%ñ÷t ˆ/q	¥cπ±™zçéø¸Ü;@I—åf√ST^†\\Ö…Y˝1≠|/^÷ë¬Næ?}Z(*à!q∂¥ê3â“ALÂv2àıt*»∫Oñr>acıWKqΩ2»sl˛QAö–›à†æÊ4êV‚◊Bﬂ§›Êëg[«˚_Øp…ØÖ≥˚!ÇÕﬂî=∂∞¿∏;ªTà∫å'ˇ%ıß®“œıV¨µœ¸◊æª2·	*Rêµ…πr˚‹hs∑Òã≈`π ¡†(¸*-∆Lıl¶‘võ?è†/Ë•@√ë./T~@ãJuäœ˚º◊í∏µ¥jùz]}ñP≠.9âùì0U‰ö"^1`j.çìÓ,&[
8^4=Ïªè%;⁄É±rÿ¿*Kb		µÏπpæä¬9pÆƒÙ†ìî˛à≤+Î\o3>z®óèaav’˝ùT—Àk@◊KG[∫‡wc-¨d¨÷‚¸ÄŸÇf%s,:äs>gΩ»Á‡ä>n∆Âl·eÅ1®ú…÷êÜ≈oß”•ù#<¬ƒY«¨ÖDê6ˆq(ô·%âWø˘û?
r.B\Â,ÌÏ¢≈4#|ΩSAµjiÅKÏX≥ËHhÜ¡°v‚]˛“7`@å$®§Ò0g8@31¥∆#”5\&åï@Q¬o}∫1'sºó&X™…d˙-—/Ö∂§f‰œo)çÄq	ri‹.Ü√îºë#±5ÛÍÛÕˇ°±≠ìy>Û07Ÿ3|$F+†1˚òc5‘ùR#ı◊C`5uü Z„3GÄ/‡5≤…ƒ‚™'`—ÌÒvååqπ*0ﬂy¿m]Ç	È®∏m:ñ¯·a3§÷|be™©F\ˆ'≈fõr∂¬^SZ‚ûñ¯#ØÎ»Ω”Ãß·°˛p¿c&¿Uœn"√^í®X´`˛ç∑s>7âÏPLwÇ˛Ö<a2$	âÃ…hïíq–`.2É‹ôeü˙ñΩ\€∂u<é£ÄdÙØ^À{fi(ΩÑ°ÈíŸÃ,s£´CŒç‹Éé\üÁU ÎZ^⁄c/°2∆ A≤Ωtpπ©•ÇT∫*ƒ©=@UﬂaêÁguÂzôóåÇ¨Gm5¨¥"ø„Xeı˙°™§§w)˜ìvåS‰ä˘_ ¸∆=ø{˝ƒ,w¨Æ)˜[æÎ0Èî¥
I≈„Æ/6U?\J¨zÁEïˆªéÒÌûb˚#ùˇ¢€È∞Ëﬂˇç≠Ò;ˆˇÙœå'}æ˝iJøéw´-“5Xpô◊µ0C BP¶MÎel@Ö ¶JMÈ0BTló_[◊(jîî÷fRiá&y·ö‰5Å¬àoZ=‰4]]ïÏª9HTˇëë•¶˛Fó9U“åaúì*W ﬁã-éa8πÄ5éãtoïÇ≈}t}ƒC≈Ÿ4ÎÆÈ 2rz‚Dú<^∞ü	ÔG3™a-tM·.–«˚o; I»w6hì!N,i=yh!ßﬁcª	Á◊ê¢'ñàºƒMπÀòØÎG".Äà%ÔæI™ù˙00'∑*ƒ+ á|Û˘ª°œﬂ=Œ≤;£-˜È(•äök∑öÊÊ∏∏ñ(ﬂ_πA.ÄßË;:x˘ÊÏÙ‡Ëùäwﬂº8Ì√»iãe–⁄'+‚°ª’ÙD¯|1Uãü&ÂV—Üa}^Ú¡•™¿»–XÙ]sâ‡'ﬁhÑH¥∫XÌCAÚ%“GjÌ°ﬂí´T”)oÌ»ŸÍ,†å–ÄÌDúû⁄kl#û©˙ª->≈*ˆA|(⁄≈‘ö%z¨ûÈ0bÑ©®˙K®r˚÷OÖI`√Há˛%@öH∏˘áÄÄ.[3J,AœmÉô´.≤∏ANG˛¡EUá  j¿ää~Ë∑\AÍtÅ±FÄ«–ÛQ‰ø@’wòîÜí|a#ΩtÑ%ê√Ï∞µfS”Î“Ñ:lµ√®Èfàyc;ıÂo¥È:•ZX“Ú∂ké_cM#} ¥RL3ÌÁ\W¡ÊB*)Å%ò]v≥ô¶Å±´/6µG}åægª(‘±ÍD£nR*sÌb}Éè®ÚyòÜÄ]ıûà™®∆u∏≠oípˆ6HP>ZΩµßeFâö—fΩvØ†‹ìlÑÛ⁄øË>—¨aÆÅB≥øfk7M¥z.]"7·ê⁄C£àù uﬁ#—ã§Ü˚‰ıL /‚ı|jù˙a∆‘õ/µoÿpÎì&®Éﬂ.∆¡‡C?æl`ÿá£¯§Éjs
]Ú g‹®b¡˛≈MU~{'ùë	Ìg&Ω…î‡*&E—¯fÌ&÷!Ühx8fˇ–ò K˜,iΩfºÏ¯pså:Î∫«t|t[>!ÆC9≤eaÙÔU/ó_Ä˘âó€Mè¬
ùÖ bu
rbsS≤?-∫\mE@QN˜FÌu©ØÅ›PÖºnà…eÛ˘™ÍÓ∞NsŒ¶ÄD‹ÍsYΩt˘ÔUæﬁÌswwnK≈kÍÙ#ElMP∆|pÿÎ8N¬…fë›•øπpwVŒ≈oy®Ñ‹Åª#Ω};Jª‚∏l†ìG!Ä≤Ë1|˚Gü_˙v˘JúﬁA¢ù˘Á9ƒ}'”èla]ŒNwø˙X±ˆ◊%íÎ+¯Á,ïŒäE>«ı¯Æ≤È±ç(¢:∆˝)µPıœXJu‹ø™éOÕ	ˇã¨j¥˝ˇCYµVNµ∏ÍMÉ>Y1‘%MñS≠øïBeëÒœYb4†∆)4ö%j‰F£pÖË®…Sµí£Îù„ﬁ≠€d¡K_=:ŒØ8√.ÜS±GÚÅ!∏ÓxƒiUá§tÊïÓäw˜∫‹px]Ú¿≤«ÄÚ·åG›R·sºlË,w=úGQ0I	≈që
˝‘ÿKãâé√zπ—e:}B	hˇkZkÿ@\îeÃÉ-Õ √ΩJ5ÍEY=dåıÒ”
&œ≤aÏ®|Ùÿ^©¿∆Ê!ùrhzZº¥VOßÍñµûàô‡ÔE≥Ω‡ÂÄzy¯õZg¥jsW5ï™π‹—_çèï∂∫5˛ªçu<Ú.)„	kÜG
>œ ûåªöåB–9 m∫W÷¥®'µæŒufÈˇ´7ì÷‰´’N¨µÊ”„«n¿–…ÅÙàyç°‹dòl∂´bD∆Ä¯/Ü{
ÀÇyˆiLûëÁﬁ"fù ∏òXz˚{¶“CŸFD™ùÚ°EûLóÊâ–Õ*ä(zÃÓS∏FÃŒPe¬ÌÿÒY®Ënû E‡Ÿ ÿŸP†Cò`'ò¢∫õ;j»`à≥˘ch’0¨%ºj•ìf≥âôÍ3†pqfqÇúV-≥˙ûßãø2B.¿}≠π¢, ~5Ú$©0/¢ùuD;Î6⁄y˜ü6÷˚œèhß6¶áY•Ô˝mB6Ì<Æ2¡≠C‘ï¯Ë~=T‘œ9‡Ô+ÔUZÅT|0 'BénË%†B{hå∂“9d¡C¿Óùè6„÷—¥`çî°Û,º¸õ‡™¬æ˘ò
ÕöSk
¶åAÒ:ò¨+Äù:2[Y<«P‚Áh¸xt•‰U`∏“ÛŸ{R	πŒ"‹ˇ”U;~A> }
yZZ∑z±|ãsõU»€Xˆ”´Yµö¶fW∞~ag™⁄sÖ4Y[[X7ªazûÒì:åÛt3ûgì0
∏Ì7d1÷’:õj•GL¡˘≈".f√%ã‘ú‡ &∑VxÖÖçfﬂWµ
@~ófÓ¯Q⁄.˜πKÀÚ¿U4~*ä‹•y:µ1⁄ÚE°ÛΩ´ŒwÉ~Äπ†≥RQD;$ú∏Àô∫Ë∫’ze∏Œ£¥ÚûR¯·àê£W  ¨—ø~Ú”x±‹6ù¸—2Ã;≈≥]Ç$„˘§E®a2Kœf51u5çŸWA√AHqñul._¿Q´∆ÍZ¡;ªﬁ|ÂEó€ÕÀyﬂã>tΩß·&^NzΩû1T(S3F(qÁ¡ÌëﬂáÃ©{1Â#ÿ≥öU¬çGPØB-∏K[
}sMiIùÇ6º§LÒ¸‘à‘πeï6WûRÑÆç∫“ë«bÓWÚñ∆Åªõ∑Ì¢B¡GKÕ≈M¢l.hRa•`ªµó`z ä÷›@>®QJ‘H˜+"‡ñG:ÏcônE±Óï¢B3YA`˝0GÀ™xVXl1œäÍøïÊ>B2ö«0ÁSeD®*”‹í™‹)◊©9Æw_º8;ﬁ˝á£ÉóßgGßﬂæ⁄?!ùı¥Œ¥Ez¯D<ê˜6¯∑cÔ
◊Â(»∆±üˆ¬h0ôÉÑ’™57ib\’PONjÚÊU∂ñ<ãG£I`Ã@ÃØ’ƒjjQm˘í[KªHû.Ãa+O>øŒ^Xõûo\A}æ≤V–†+j"l‘Ë–◊V≠+°D◊Àîëô¸S≥ﬁı°7Ã√BÜÎh”0ÜrŸßæµÍUzﬁN’∫9≠@
&›»÷ù]Á=a\é=ºtó!éê$⁄’∆JU|±0ıÒAÿùîì¶ËMÂ•äŒ#qsçnŒõ‹M<ƒΩ¯LùÅÊsvçj}:,ù1‹
ÓŒAóˇ¬ﬁï≥w}ê=„Ì®F=cÁM0É5˘ø6∆Ó‘ªîìÄ≈¨’^r˚∞™qy†G9ò&Ï›>H…òıäe–k˝U‰ˇ)zû{1Jí1ÂC’ ∆óânˇ¯ÈòÛz4& (¸aË«ı˙‚á·Ô6Ã‡ëèMvÔi-ª7Púˇ◊A–Ã:ÅF$Ì0¿ÀdB9Ûn,4µÄ⁄ß—LÃ ı¡ÌπJ‘¡ˆd.õXjvGÜ{k9Y+G_£J’TT(Ì◊®5äÁÀç£9j¬X–•Y0€^ÇîÅf˚zµ¡Ñfÿ¡1Ï,i≥‡∆¶≈"O;øß√hÀ‹ß38\õàÛVÍ™plœÇAëï6˝K3‘Á”’:–ûåP£æŒfâÃ/f† ˛5!ò#…˚—µÛœÇ—y˝4ûÃ1ò?é%âx÷][Yg])hˆWÙ@g˛JB%/Ì¸’}Dß´~_∂üUIÓ»@8j>O`†4c
îˆ˚œU›É\eÉıôˇwˇˆß>0˜¬úñ±?Ã)Ör¨iyÄ-@¢ÔÀÓöOΩÀÓú∑ßx‡öÉ◊É‚á!√rÉ’Æ÷·ªí‡á"¿ëﬂÊƒ∑!ÈÑ◊˙äb6•ø.Å˝b;≠á ∏‰∂éÿ~§∂ì◊‚©˚—î¸\cMI]˘OFG"Z°Q¬≠†cwVç‘>¥lÍ
FueÈ|]◊%|VYû7ú‹»5Ç ,÷õtI8∂ú)®|IfaÒi`ºh#êì{\6 ø23%)[Ù'zj;Öoπ*`\ÀΩ%Å∫‡æ∂ oÌ&I|ÒÇö+O√ïˆ6û†]∂{lÇ¯≈sŸqé)^êñ peTx'/≠.9“È&}á!·˜™0‡å/À—¢ãA]W™ùh¿ÊI-ûuigW$X◊NS5o⁄ƒ∫ö∆2Ö33ü*≠j§–∑NFö¢ç/EÉÒNx,∑“^⁄u)Í°HÈ0@‰‰N&êeõ[gd]õ◊,O@·(W;Â£3L8EEi‡„˙-}9j›‚”q|±;	í¨ıoábè√ñÂÛ‚Í>˙Æ≤ÕJœÌ∏°ß‹ÀZó$s◊%)‘Q·¢ÍKqê.∞Z©9ñÃj!DÖüJ~Ê‡*0Q_˛Ñ°ã&≠=FïDÆÏjnóÓ -dÓª¡ˇ0ÙOhhÛKcòïzdπ•¬Z‡có7N¶˛@Ωˇ»`◊⁄ªÑy¨æë¨ÕŒ?2Üuç=Ωsé“¨Å√⁄_ ƒUçEñ©±Éﬁ≈¯Æz'•ﬁS
'|Ô%•œãÄFΩaâº]~>”Ã £%n€∆ssWV≤ø™¥Öıso≈ÃUWπ®óö‰® ÕüãÇ£ë—©Fb\ø‰éâI4Ït)¢Rd¥Ã-JÜ[A˜,√\4VBè2\oxk52
(+Î“Œ7¸9˙˛0glÖÌÒdA‰Û∆vÂWƒ; v°◊¿≤Ÿ∂√∆‘BK;Ø l)~2	Bòm®uºˇ∂ΩpsÁ8"hgiÁ≠¯∆.3Lv¥pSpj¬QÑ÷	˚‚õ -∞p[±òû9—C
©ü“ë[tŸbd(Ωcàµ◊ú_s∫€ˇŒÄ‘ÑE)`@k◊¥Œd[;ÿ\nîc©±◊Æ…ÓbZkW˙É∞€\êq‡{aÊ‚ŸﬁÎ£€ç1&˛`äV€Ωƒz [ß£ƒõç√Aä):ÊàB&¡9∫˙ad"õﬂ
üP§Ωäa\?“¯∏Á=M :$´úeGJ2~ù£¯<¶PÊi∆/éµÄÒ–]!10Ì^’£[£ÈŸ´»uY¡úﬂ√≠à≤è@û‰©ƒ¢ôÂw€ÿÁ≠6õó˝.`ÀÍΩ1Ô'µSA8∫Ë˛éç·üÌ—iò√=±Dx…Eõ°sjØlÚH:kçn…ôhô˛¿‹Ω~‰æm…˘!‘Z◊/:ø†I≥l¿{t˚'>©sc™øz1‹=n3ãπ":6<Ö]¯#úÔ∂áŒ√Ÿ˛√ÜtÙ)mÄ@Ä π„a”∞≤F6®M≈÷T‡≈∞ﬁÅÿ¿‰ik»∏x≈w9∫ÆQæ/ÏUßΩ¶≠“Ï@«eï˚ïÅ4∫ÆÎÍñ´Ì;w1fi©¸ÑD?ƒº»‰∂tÆ¥]µÀwãËH•˚ªÏ":ØRyd®Êv0≤yhô≠/@RW˛∆8dpZ‹’e„¿ÛkAñ‘ùdhÊé˜}≈,
&÷ñv2…∆øÃL√‘∑AÚ©Öp›ß2ép?ô—p¨_?(Q	ŸÿBÕÈÿ ˙±U›Õı—´˝7/0†Ï·À√”√W/π„Dk˚ç‚ùr
Xì)˙N∏ë˛;h¨˙Ô—ÏX∆‡bìΩItÄë 7®üÿÄ˙·„´ﬁ±õ∫òì2l(˙>¿XZ√0ò¯õhÛ”^2˜Ûq5åÁZAÃ	û á'2›ã∏¶?œ¬‰ΩsÀ4Ùr°∏xb0ˆé÷Í˝&{$âÕ⁄^Ya'§W‚â¥lÈ-˘»,õU˚~Nñ∞ë√∞DuTÜ®Se%‡L:π™†vÍC±\qå\∞√•#°Óëòbü¥õEµïÀ“„k´C˚L=«·üÚ]PœÙ‘$∆†p‚qD:L…¶⁄æªR¢µ∂ëFéL¯,\ïh†nã⁄w´Ω’ç XZ{æ˘F≤aΩ'ñ¿bIäKÎ^N–QF#]5≤6ÇÆ[Ô8$uÿ2á¸Üªè˘~/øg^ èSõs(¨ç¶Méõ!c=}≠»Øß0YÂ≤£Aª	¬˚íútÇìnÊìC√h˝ì>wJÙ—#$≠4äµIü‹úÇOˇëyÿ±M:ÈÕ[‘Ù∏öØﬂ≈fA@˘ƒöDµ”jÀŸ®T‘Î´˘3Q6ä3T∆∆ÅﬂtôõDeƒ14:M,çÎ∏jß¡îy7©™ô(ÄÎˆ¿w_ÆK™◊}∫ûı˙ÿ[µäûá“ÚPƒUbÀ0±&A:ë:î:Eœ¬Zû#/¡¨‹µöÏ4ú@Ÿ=7`àP?bxG-°§T◊ƒ}ª∑`Ñuaö&£¬5nU¬k8oØHœnZÒ,´Â†•{ı.«hJD8ı˙öO5¥Ùs{UÛ.Î]c˝[–t?»¬™ïi∆™*Q◊œÇ=Ò¶∑ïM#:)VµA¨˛† q˜ºSÃ*ÔÙ}ìNÎ¯”˚ˆR7Ì¥r=ïÓΩæ°≈x5MCtÀ@&≠µôRòçCﬂ"[)ÿƒÅ]çãøêè;èDﬂ§YÓ Øå]–r´<íÏcß¸⁄j¡ÅΩ‚ØÛï´ãΩDür;f¥_ﬁ÷ÃÏ¢ã~-ÎU‰u¡‡òıÅtI™BÂ¢ÜIW”≠$ ˆ<p.û¿ÊÍéæÀÕ∂1ΩCÛ‡&ﬁ-∂d UaFHΩJ¸ÓÒ‰πøkqZû≈Èrª
»Óôit¥¯–◊ÑÛd6	LŒë?˙x∆q„ìø$4†=¿≈`ëeºc≤3ûp‹0*†$ﬁÁ®˙Ë€¬˚çÿCüÎwuHûÖ˛&¸∏&ÀnHøÕ≈Zf7utV¥3ÜEçqMµ∂ÚÖføaª˝ …º¥yãﬂ≠=±YlÖ'±?œ‚ZK1ô› j‰Õ©¸vÕ[ânÇa¥£%«kﬁ“@&—”RâıX$∫ÛçfÚ§|G$Ô”G#’5ÚæπÃÇü2πÂÿ?_Xt¡Os]j≥
l!1?ãà2¯YXú¡œD¸‰F≠|yÔO≤¡œ“MÂ`Ó"‰PˇMnöZ4âs&?sy`ãÔ3-(¸˙Çíê•Í‘Ÿ”Zf∂I⁄¶…JwRàKsìKKÍ!k.±»œ/#/·ßÅf∂—=G.#4–Ù6HØ¡>N€{WùóÌ&®™¸EãÎf∆¬Z\›Vù$D– ˝ jé—ıîπ¬'MpÊ¢«Ä°F'eÑ»¢òFìÛ5äëoé…ó¡`NF&üÜf∑VïãÓ¥qdhs·—ùµπªﬁê‚ä†±ü[°Àª¸’*t≈:9xƒ˘àÖ} ùÆ=àú„·˝~∫j]é˛"&„–O˙›OBüKqG~ïÓkpaMÎwª4Óis2àjÃU4ØX<ÿ¨‹€&AS-Rg’⁄ÆÁÊL=x!¿*∫p|˛.Ù≥Òˆ5≈K™’E7	™⁄HaW•÷ÆÒTÒÌÒ,¢Õ^TüçÄ@}4ŸÿscMv£e˚‘‘›•æÓèëO˛bq>π:îESÍ€$úEy÷|Ä9öÁ¨'î)$B4s∆‹ã#yË˙î√∆ûaÙŒ§j¸ ÓysÚ¿8∏-öQÏùˆF«õj _>ÑøˇlòÃå<úê-Ó¥w•ßª‰E(Õ"ëi ‚_œ…]Ë•X‡Ã0˙\w'æ‘¸ô7»ü˘iÛLòuj12JôÄZ∫Ø$·bM÷\ƒﬂÖ√P“·/äÅŒ5ÿ^¢Å}1Ì°ó≤ñyÑœI∂ö—(WyaØ5·k][›bÚﬂŒÉ) Ωò˚w)Pà7ä≠ºQ|û∞√„O01£_(êTr}„iRºY_Üú!Yç#ÃÇúˆ4Œ∏«(' ic¶%I3. Z;≤ù]-	€TπB%¬åBº¢Ò|Í©ê)(2†oo nˇmíÖS¯ÇLF·-P]&¶íC´çÎn)ú]ÎÅ⁄–d9èõú⁄∂›ıû±§kÔâï–Ì±4ÇVŒµçL«ãÀÀﬂΩËV˚iõ8˜ﬂÖ=ÄIL{à$_zç2WˆQdP√†è7.¸ÏÜ˝˚ˇ¿o~pÎj·i$ü|@‚⁄ØG‹ò#à!^•6≤•Y|ˇÛø˝Ûˇ°d°	47ÀÜ8	^àéûÉÙÄóF˘∆˚ùùûD§Ò\Û?ˇ€ˇ˘ˇ∞-oë*åçì`∏}˝›8ÀfÈÊ  ≈≈Eo«£IÄ1V‡Dßœÿ˛º∏ 8ˇõéÛE4∫˘Æπ≈;}x|ìÌ•3‡Ω¢Õ˝ Ëì`ú(égF®àbòQê$ç¬}ÎmOc$hê‰rÍ]ojZˇ,¥áåΩ•90X˘Övrk≈[®£Îe<˘^∆=…ÅÓ.ﬂ\ßﬁ0†TY´∏≠¬Ih7CóÂËà}˚ÌÊt∫ºÄsCUÄÜ¬g°”9
‚\T‡¯g,9å˜>Pè+°‚Ô‡pæ0òëoéOx,tqNpQ=
`(ˆl¢(‰/∞/±ﬂp /9¨H∆ê4`?àBÆµ≤·b˚ÁZ\Ña¬‰”îG%å˚»«x6ˇäº.k!‰Ñë¶≥X1åb≈ÙVfIª˚ÇUœGiwﬁ¢mÌ¢`>ëq–Ò4íù S∂õ°∑)n√(år,±rÖ*œ•Y
&^¥—5Í∫v]Ÿpç
xÂ#‡ßπ˝ç¸XÍ*Æy¸0á”$ër+mívMˇ‰éo	o
ÑTŸl)M1mh˙#?¯∂+Ôıﬁ#¯E·∂¢F£†Ω© 
æoO\È÷öSÌE(È÷ë7;#)ìØUÂp|jˆ√&É∏¨EMF¡†<ë
Émhu!?çakQ¯vB˜~à"
B§\æÔì80§èuTEÍÔZ‰ß9LÏK-F©N÷˛,∂´MQk≥ru^ùu≠T⁄Ô4§QDoo“»-Ï√†h¿∆∑àŸ—ÓöD+Ejã"R≥®ú◊AüÇöDCk˝	‹"kå‘–Œπ7‡âñ˝Ô<Ò`œ=vT\"?Õoö22†˛ëµà%¬$®~æ±hm≠<ÌP·˜£Öuì±•Ωæ^∆Uzû{0e˙tÇMﬂ9 Q0Ì'‹¨Fv¸®@”∂∂íG¬ÄÇíhEÁaˆ√â t:Pf?3Â@zÁÿ—uˇuòÓQ4Ç£ÿ˜&Ø@|ne	Özmz”Rk˘øIÉ…Pÿo  ”/›@ıŒëò+‡Íx2OÕ0Ãª~8Ä°¡±ó±óEdfø,s£õõFªâMŸ/ñÎ{È¬&}»àõtÕkÏñ∏9ó6∞ªÑANÊ=Ò müüK’˘ÛÁÏwÂ7”¢!n=ThHXÈm≠≠÷5F %ﬁ$•Ü0Ùx/ùM¬¨µÃñyÿçÁΩ[}ﬂÓ} –ZÜÁÈºüf <åZ´∂ﬁÓeÒ =  V≈≈∫4kS¡‘°”‘¨N|ﬁ˘<êùZèÏ∑ b–K<¶Ò‡C∑¢˙À›ñæ®7ç˚ˇ   ˇˇÏ]KO€@æÛ+V®pàÄê–BSµ*j{jZËÖìÜFrbî-E¸˜ÓÃ>ºª^Ôéç"ßD±ìıÓÏcfæo>a=¡˝CˆKŸØ´¿YTÛ˘¨˚ˆx-;¨”wÄÁFÑZ{øs˜4+≥–€âbxÃ1~Ø·8E°yKø¨_ÜÏÙôÖ™äù*ÉGÆ5 l*¡É”[w$Ω’~Bwi-JñπÀ˚étu≈ne£Ã•…Æ¸±Ãùa⁄3
±âq"ß‹Z6?≤0˙Pd©º´YrÙ•Œ"ÔåfÏrñOÏ=7◊˜w®bz˛=⁄#h=üò€Ø¬∆Á¥Ëÿ›©E∫5Hô/øπKhâÉI˜üK·Ì¨◊Ez-ïrÅ¸IMyÈ?ÅBÎ¯)™êk‘H?ƒÖgÂO~L.Æ¨zùëXNœjÑHé·ﬂ	·≤[D—†	’OÚtyÔ`·\æ∑nL–; ÖJ€¯P$∆ÀíÇcq~ﬁ◊e’AŸYF»a=≈>1~@ÓR≈' ¶Ä ´œƒ˙O‰"¢Ê+ëË@DXÂ≤„áöÿõ•Wë…W2Tb^ëè˛S’j{®÷Í•ãEòáˇ{pä–-nÚ˙_ˆØt¯øˇJ˚ÿã∞è˘“!É-BãÎœ™
Ã™Ω&E+ƒü„ÀıË»nHNc 
FDí∞zïëß—”î‹boNlAÒì9xøiéØÀÑœjÃp9§‚∞kmΩXˇ˚8]@fcﬁUë^≤xîO/«@ããÖø©aÔG±"! V[RX˛xo!™Ü»ﬂ)Ç%oîÄ»'CEÙCˆJù<√¢j‚E`à€5S{e€%b‡C5◊b∆ùPÆÀ@^|„E∆üIâ§Ió±´wuÿZ≤„2pÉCàÙ@ç§Ëº§ŸÜıïºâZŒäú«{`·ôÒ√ä≥‰ÂñdãÊQ⁄ó±sŒ◊OhÄ⁄ïfá
«o%˘f'≥d˛´[«kÚñˆã]PπrU±ïj≥<â±&B|¡úÒ“#ÔÓ∆n∆ƒSÁÊÃ¥`qo™E≈ëPJ‚+”ÑìtÍ`ö≥ÈuŒmÍyl≈€5I÷Œ≥ﬂäú•îoZN†¸$e•$ü∑|îLœQƒÊ"Å,Íg˛-‘NJYäîw∏Ô2˘Àg¬àÿíoâ∫ˇ<ü@VW®-¶RzP
J¡œUÁHBëê>*Ñ®÷mù√OŸ◊Ñ?;g7âTú¶øOB€´¶8,. +;∆T%≠ñM†URPK ¨Î∂- ;94Æhÿ∫
’…k)È4VDPrëõ)Ô÷›Ó^ØøøÂ6;,R9¥/"7ûî+{jŸI0≈SìlEÇRvjC aqw;"î˝g%B…6OÚEí’◊h|£|£lMå“ò‚´R£ƒ≠>YkEì“ø√ T(+ï,g©bïd#Å:X÷πL¯£fŒÄ∞ÕB˝r´Z˛rµZì6e> Øz<hP‡¿*^^ˆ^MÜº?Le8xéªˆºib`v7Í˜V—W’cP§{€Ê∏;ÆN£±©Î∂—Ê›/<WõÛ|∞˝ÜÅüË¥äqá~À›⁄˚∑kkˇ   ˇˇ ÿ(Ò