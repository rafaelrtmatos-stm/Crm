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
  const openRevenueModal = (overridePeriod?: 'hoje' | 'semana' | 'mes' | 'ano' | 'custom', customDates?: { start: string; end: string }) => {
    if (customDates?.start && customDates?.end) {
      setAnalisePeriodo('custom');
      setAnaliseCustomRange({ start: customDates.start, end: customDates.end });
    } else if (overridePeriod) {
      setAnalisePeriodo(overridePeriod);
    } else {
      if (period === 'Hoje') {
        setAnalisePeriodo('hoje');
        setAnaliseSelectedDate(format(new Date(), 'yyyy-MM-dd'));
      } else if (period === 'Ontem') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        setAnalisePeriodo('hoje');
        setAnaliseSelectedDate(format(y, 'yyyy-MM-dd'));
      } else if (period === 'Semana') {
        setAnalisePeriodo('semana');
        setAnaliseSelectedDate(format(new Date(), 'yyyy-MM-dd'));
      } else if (period === '30 dias') {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 29);
        setAnalisePeriodo('custom');
        setAnaliseCustomRange({
          start: format(start, 'yyyy-MM-dd'),
          end: format(end, 'yyyy-MM-dd')
        });
      } else if (period === 'Personalizado') {
        setAnalisePeriodo('custom');
        if (customRange.start && customRange.end) {
          setAnaliseCustomRange({
            start: customRange.start,
            end: customRange.end
          });
        } else {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 29);
          setAnaliseCustomRange({
            start: format(start, 'yyyy-MM-dd'),
            end: format(end, 'yyyy-MM-dd')
          });
        }
      }
    }
    setIsRevenueModalOpen(true);
  };
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
                <div className="flex flex-wrap gap-2 items-center bg-white/5 p-2 rounded-xl border border-white/5 animate-in slide-in-from-top-2">
                   <div className="flex items-center gap-1">
                      {[
                        { label: '7d', days: 6 },
                        { label: '15d', days: 14 },
                        { label: '30d', days: 29 },
                      ].map(pr => (
                        <button
                          key={pr.label}
                          type="button"
                          onClick={() => {
                            const e = new Date();
                            const s = new Date();
                            s.setDate(e.getDate() - pr.days);
                            setCustomRange({ start: format(s, 'yyyy-MM-dd'), end: format(e, 'yyyy-MM-dd') });
                          }}
                          className="px-2 py-0.5 text-[8px] font-black uppercase bg-white/5 hover:bg-primary-500/20 text-white/60 hover:text-primary-300 rounded border border-white/10 transition-all cursor-pointer"
                        >
                          {pr.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          const s = new Date(now.getFullYear(), now.getMonth(), 1);
                          const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                          setCustomRange({ start: format(s, 'yyyy-MM-dd'), end: format(e, 'yyyy-MM-dd') });
                        }}
                        className="px-2 py-0.5 text-[8px] font-black uppercase bg-white/5 hover:bg-primary-500/20 text-white/60 hover:text-primary-300 rounded border border-white/10 transition-all cursor-pointer"
                      >
                        M√™s
                      </button>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <span className="text-[8px] font-black uppercase text-primary-400">De:</span>
                     <input
                        type="date"
                        className="bg-slate-900/60 border border-white/10 rounded px-2 py-0.5 text-[9px] font-bold text-white outline-none cursor-pointer uppercase"
                        value={customRange.start}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                     />
                     <span className="text-[8px] font-black uppercase text-primary-400">At√©:</span>
                     <input
                        type="date"
                        className="bg-slate-900/60 border border-white/10 rounded px-2 py-0.5 text-[9px] font-bold text-white outline-none cursor-pointer uppercase"
                        value={customRange.end}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                     />
                   </div>
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
            { label: 'Faturamento', val: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, diff: 'Hoje/Per√≠odo', color: 'emerald', action: () => openRevenueModal() },
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
                <Button variant="ghost" icon={Maximize2} onClick={() => openRevenueModal()} />
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
                     <div className="flex flex-col gap-2.5 w-full">
                        {/* Linha de Atalhos R√°pidos */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                           <span className="text-[9px] font-black uppercase text-white/40 tracking-wider mr-1">Atalhos:</span>
                           {[
                              { label: 'Hoje', getRange: () => { const d = format(new Date(), 'yyyy-MM-dd'); return { start: d, end: d }; } },
                              { label: 'Ontem', getRange: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = format(d, 'yyyy-MM-dd'); return { start: s, end: s }; } },
                              { label: '√öltimos 7d', getRange: () => { const e = new Date(); const s = new Date(); s.setDate(e.getDate() - 6); return { start: format(s, 'yyyy-MM-dd'), end: format(e, 'yyyy-MM-dd') }; } },
                              { label: '√öltimos 15d', getRange: () => { const e = new Date(); const s = new Date(); s.setDate(e.getDate() - 14); return { start: format(s, 'yyyy-MM-dd'), end: format(e, 'yyyy-MM-dd') }; } },
                              { label: '√öltimos 30d', getRange: () => { const e = new Date(); const s = new Date(); s.setDate(e.getDate() - 29); return { start: format(s, 'yyyy-MM-dd'), end: format(e, 'yyyy-MM-dd') }; } },
                              { label: 'Este M√™s', getRange: () => { const now = new Date(); const s = new Date(now.getFullYear(), now.getMonth(), 1); const e = new Date(now.getFullYear(), now.getMonth() + 1, 0); return { start: format(s, 'yyyy-MM-dd'), end: format(e, 'yyyy-MM-dd') }; } },
                              { label: 'M√™s Passado', getRange: () => { const now = new Date(); const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { start: format(s, 'yyyy-MM-dd'), end: format(e, 'yyyy-MM-dd') }; } },
                              { label: 'Este Ano', getRange: () => { const now = new Date(); const s = new Date(now.getFullYear(), 0, 1); const e = new Date(now.getFullYear(), 11, 31); return { start: format(s, 'yyyy-MM-dd'), end: format(e, 'yyyy-MM-dd') }; } },
                           ].map(preset => (
                              <button
                                 key={preset.label}
                                 type="button"
                                 onClick={() => setAnaliseCustomRange(preset.getRange())}
                                 className="px-2.5 py-1 text-[9px] font-black uppercase bg-white/5 hover:bg-primary-500/20 text-white/60 hover:text-primary-300 rounded-lg border border-white/10 hover:border-primary-500/30 transition-all cursor-pointer"
                              >
                                 {preset.label}
                              </button>
                           ))}
                        </div>

                        {/* Linha de Sele√ß√£o Manual de Datas */}
                        <div className="flex items-center gap-3 flex-wrap bg-white/5 p-2 rounded-xl border border-white/5">
                           <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black uppercase text-primary-400 tracking-wider">De:</span>
                              <input
                                type="date"
                                value={analiseCustomRange.start}
                                onChange={(e) => setAnaliseCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                className="bg-slate-900/60 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] font-black text-white outline-none cursor-pointer uppercase focus:border-primary-500/50"
                              />
                           </div>
                           <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black uppercase text-primary-400 tracking-wider">At√©:</span>
                              <input
                                type="date"
                                value={analiseCustomRange.end}
                                onChange={(e) => setAnaliseCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                className="bg-slate-900/60 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] font-black text-white outline-none cursor-pointer uppercase focus:border-primary-500/50"
                              />
                           </div>
                           <div className="text-[9px] font-bold text-white/50 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                              {analiseDetalhada.diasNoPeriodo} {analiseDetalhada.diasNoPeriodo === 1 ? 'dia selecionado' : 'dias selecionados'}
                           </div>
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
 xúÏΩ[sGñ0¯>ø"çÒ@õ Øíeö¢Ç"%[±í»!iuokRU$™T¡U^åfƒFÏ√∆˜Ù=Ï>mÏ√ŒŒÉ£øàéÿ¯&Êe?˛ì˘%{Œ…Ã™Ã¨Ã™H…Ó¬Å∫‰Â‰…ìÁ~£OdGA‰á—˘ëw=	¢ÏUêçbø”nwø˘∆ÚáNºqp¶√xeoºÒ,Ë¨πxMgôµâ˝$√lo:áÅØ4q√Ü^6±Nê$€ÃãÆªlûø;å£4}∏'ùˆ3¯√ºò˝83/a˛Ìüao∑W<†v9ä/˜∆Aíu>ºæ˝∑òù≈!õ∆iz˚Áã`Ãí‡<L≥àŸ‘;˜pÓÒ6˚|ç<ÈOÇ4ıŒˆ«?≤6vÀ¸ ¶çÇaË«Ìõ≈¿≈ﬂ$»fIƒØÚk8ÍåùÖë7>à/#^ˆ∆ëÉﬂI,/=aklõu|ı©«èYªç›g◊” >c•õ0vX¥∂x˘ıl2µâÆ"∆pñ$pÒ8òxaÔ¡0^yŸ®?ÒÆ:k+,ã3oÃz•—jmL˘µÙ4>Ò.˚DﬁæÉ¡gg¡0/q˝Yc“o˛Å[]e'1KΩÒÖ« ƒëœAfñ≈dÅEô•3/	cÜÄèÇõM<Ê{ô∑:äèMºhÊçÒ’@6€zì)4=˛l¯œ„§€g{DäSÙ=vÅ›¡t&≈í√∑d¬Ï;-ÏﬁÛΩV0°ÆdÀ|!º{ÓE#F>õhÉ˜fY<Ò≤pÌ¡‡6òz)Liá)ÉoÎ_çV®’|^≤È)làÑEp+ı`	YØ∏4â/ œ˙
˝` MÆºA?éá∞P='¡i¸"ç;⁄¥sfë¿Çæ <o(Lèº$É	„vÑñJò±o√sú.ho«â¿≈wÒ+4 ˜iËo≥pˇ˝ÁsX?ä/;›õ+ˇ 7Òd
˚˙<%∫‹ÁWûÙCüˆå÷õç≥v˛∆,†	æíc@©¿ﬂ◊%Ûπ◊∞∂'#∏NÏ—d@L{Íçá@Úæ¬,ò§€Ïmøﬂxﬁ…Î¥1‰_•€à¬:I‘ÄûøTÏ¶Ì“˛Z…©«0ÄÂıEÀÆ«¶*â6.¬Ëıöﬂ∑ê˜m˚≤?a€”⁄º∫∞¡KìL3/õ¡t‰z¬⁄¢π6º‘F∞4≈
'`äøêâÇKÜh”Èˆ≥¯≈…·	ë∑N7ÔA¡Óm}7ÿ†“ πÜq £"§=,Æhopä≠–&§m∞£OfSo‡•ú∏¿∞YA0⁄7∏ÎÈå‰èf„1ßëYrùoæWÊDB∂ıèÉpúé™8ÅcÔ1Û.Ω0c©ËÆñƒìNõU⁄Óˆ˘ÀÂ0x˝>"tßπı’-∞R~t:ä#Î÷†≈b6ÈGqèvÇºßmé„Ôß…˘#~}<¡ù?™aÒ∞h˝D†,ÿ∫ÍwAæﬁõÕ.∫p…q‡ﬂ¢uπ¯ ˘/ÂÆƒﬁ˜gàæ‚!•e√≈+µl<û˘QÙÈ8å~¸CyÌÖ_~A3πVj¶ær”ÌsÇ-ö`∆∞W%ûÁÜO6J‚Kéﬁ˘]u ∆[6Ñÿ¥üz·ïWú®qÄ±?¬ò‡∞ÜÛi¬U:œ·†Ñ≈Jb^Ä#7FN“«Á1` )œ#‰‡˘(¿\$A∫JÃCòvãNèë=&‘¡8CìG∞Cÿê.7ııé~Íæ“8‡Ú
ù˘ëá<9J`ÄFÇ5„ø¢#æ◊ïñ;x⁄Ùœ¬q‹µ˚xó⁄Ô”åÜ,›_òW>Cê3@@"&ﬁ¥„•◊—êQ]lBgû3ˆcÊs∞>Êm·’Ÿ$~&¿äÍëûXü˛ø˙„Ãã≤0ªVûﬂÊCË{ z˘2}7^Åµﬂ
◊Æ”NúÛ^ÛtìJπÙÌ?€bKøáÒX¡&≥${Ô≠¿\√û~Ï¥C8é¯"HØ¡âÅ‰Õã¡∫‰?˙f“3oú™$#ß'B÷XA‰¢Ø4®ŒÅ¯πµoJÌDÒEæ*:Goˆ–ÀQ†´6SF»∑ ]VÎŸ‘«„zŒ¥ÅnkC∫qÉx•™dqÛ≠ìµÜ¸#FEîOÔf≈Òd„ŸIœF⁄ë…?Y8Q∞ùz¿Ò∑Õõg}œá$LÕg ø¯≈z" ·*vj˜ÚMp8Å–	d<í∂π≠⁄ìˇÒﬂâ£öEÌn◊Ï{ÉËÖ√'¢4¸$8`Ω@‰v˝( Ú˘èüœ≈ôÔ˜”q8:ΩG»á}?ù…>¨ã »ó·ﬁX∂m¢]≈; âÀóî—_∏—&˜N¡‹õ¸PÍ™G«	û©îÛ.Ç0$;NnÊÙx$G8ÅF◊P8âŸ~«≥€?@˛Û˘??≠æP$TéπÚ—äÙY=—‘o•X˘Y≠Ì#…A üå„@=√
üGlµô‘ÕUîÆyyiﬁÓSË048Ñ†î¿Ie"Ó0√‡D
à;¡’6∞æÒê œ≤Ñƒk8ª+Êå“V\¥LÜèOÇp‡ù„©å»/€B˝Ã˝,L&:»m¬B=5J»∫ôä£åw I6!„±l&Ös7Ú;ù°P8¡±9ƒñQΩbv	◊ªO˙‘“{	ù$[WZ R_gµëmçh+#Ìïg◊’ñ‹6¬b4„ÿÛ˜î©vJ
+Öı˘˛Â≥m∂7æÙÆS!í$@VOp+;Üçºîº±vxÃ“i0œ¬!4Òû≠º¿{®j@^'ÖÒ‰úé&y)™Û2æîT(>l?H;ÌÅEA“¶ìpÅ◊Ä‘§@ÈΩ^CN;º˝ﬁ/d1“úå©VèR&ûÔƒ√Œ0„RÜq‘Ò+å˜=D§Y1Xá
äJ(âñø»%&˝&G…j¡ Jâë¥)⁄…"∆ºÕ◊9“◊˜√ÁÛ0gÚnÆ˛D∏ﬂ|ËˆˇáQπ≠yIR)pK	çBN)’±„©˝¡¿˘OÄGVÔV…±L¢vπmåï∫]Ã“îß¿’¿'SÆ+N3ÉˇEe7H0ù6ÍÿH‘8¯»ŒÈ<Í∑ç˝¨Íœªö¬¢8'›k¬©ÆÆ6'¢∏¶ )öú¯L˙ø¡±´ÍΩ•"eœáÄ”^NﬂQÃü 8BõHÅI⁄[÷ô•xá˛*0 ¬º¬î] mÊÚÏ¸a‹ÕU±π$Ìy	ÍãË"Û¡§<h0Lº:XŒPxDÒÀ£sp∑Q∏ú†¶V&
`C<:]_y”¿Cè™Ê§â~SÄ«~‚õm¿ã∞∏†KÆø%óNh†’ÿY˙Ó‰Ä‡7–[≥¡÷Ô˜Òn¡	ΩnÑ‡˛.˛JÖ6≠ê¡Âmêí≤Ô‚ú	p‚àˇ4A>ŸÏªü£róÌ>VöTIõ0Ù§ß P/6èâ`°øO‘Aç=b;~∂˜2«	*`3]'t~e2Æ≠-‘DC≠.ïúl®—êpfË°úfÿÕq=°⁄ì∆!ù	NcŒ·Lf>`Ÿ≥ÃõzåŒÁ. v£‹>ê!íæ2@ÂÑT>a é/∏Ç5%•3P	d}I¯¯π~˘3/Õû£Œ7¸	Ÿ4‹W&ºî‡·È…làc{AÏd…,Pê:´¸.à~£Ìœ„ û%zÕ≥å˝”\cà¶ñç
ÿ–îÏ`ﬁÈº}WÙ®®™sõ\>4¥VÖEëD!¢˙õ•—ma¨∂,&8I›≈˜◊¯Ú≠Û6L_ ‚d@’ÊÈ
á£qıÏ¨Yúd∏9
êÚF∏∆ˆy8hl«¡<}x√¨Ô¿œùÔN_Ω§{œ∆égWr·ˇ¿˜›gazLFI ,ö‹T‹≤»:bóÏ¯·‚^ö‚ô˝∏5ÍΩ‘v÷◊÷.FΩGI0Èæcg„‡ä≥dΩ!“ÿÑ˝V6<ªñ?Ω(ú¿,zaàÏ”ﬂü‚x{_?`˛,ÒêÈ=X[kÌÊ[{Á[ÏVﬂW ºkÔ≤7ÒŸeÔÊ√¶Ωı5ÿWôÏ+ùz√†w›{®4Uû«eocççü¡yœCeˆæ∫!⁄ Ø∞$FIŸÔΩ›‹ò^5òÍ‰™á∫D6#Ä1êyx?LÜ ê§∞˘œ∑÷nÿ™6ŒU®va¥°éõF∑q5Ü-eΩA<ˆ˘Ä/G!JPâ7¸®w_ô±J‘C‡6[ª˚§è{éäB?ﬁYm®ùÃgPŒI˜¸	¨Õì|˘≈Ùy¿ÖiiL4Ä’-øt“⁄Ω˝/p0‡væ˝W$ëﬁ 	QW9§ÅêfïH:ûß©¿g§µ~ËıwVß•.üŒ≤,éÙ5$ı÷∑xØ„Ûã£}x<ÔêàEK≈sNΩnv˜h8*{(Ó¨Úå5”VÒhö@b˙Ö…º‰‡≈õ∆@ù5∞Ùa(3@xîR«!††w˚3˙ÿ°eÇ©{SÏù’|Û»'Ã‚$©†H#8L∆¡+“û†fWÆ·U¥ª¸,Ä´h(Sé ∑%äèŒvØÅÂI*SÉä7†›(µ√·ˇﬁÀÄe‘ÙºO∞0–pGÈ8b8*H$P8°¸]˘»Öp®tÄ/–s&d†p˝Û C†–+û¨OTqW≤Sc¿ö'Ÿ·ŸÅwme°ä€ï,îŒ ÂÛ:˛î¨Ó ¸Ç¡XÈ⁄-8DPu®Ë!˛D,åjÒ <Õ-!íÃ	É†sÊàl"]+r»´—√¢mG!Ó∏”FŸ∞cÿ:‰RjáH¨ÄÁà´g”NGÎS¡îŒ¥–…(Í^‘ÉM5yñAßÜwìÓµèMY§CîÔ§æu:¡{∫»ïÏ™Iè⁄˘ìç|Ò0™wOØß‘-©z…Ig≤—&}Ìä´Íç Å?Ã<∫]¸0ﬁnÁ™`°Ó3e&®•FıæÑﬂﬂìVß+¿™<;ˆís8‘è„qåèãüÔ¯}‰STØ[˝,7¶Ö-≥ÀˆQºvöºä9°–œ˜˙≠@Ωn¿MWŸ∏’Ä˛·∆)§πÛâ√hòƒl©ƒt$+‹»⁄72ÂEÆ“Ï≥7Aû·ä¬ﬁ!…3∏Ç˜rë˝Üªwå"≠rïUø1U~,pÆÙMŒoá¨Á8˜·…Û‡ê·¨Ãv*GàÙQ£FÇ>–†üH™ÇÙIˇÌ⁄ªBﬁ˝/v577ã\}fgg$Ls“ÇMˆAÑ˜Æü“çéAèì¯O8k”Ä7ˇªqz’·≠h"+>ŸIˇ<—÷—¥¿Í—›»Ñ}‡ˆ_«Ë”DÑ¡(ÆG¿çÅ9ŸÆèÅ≥0Óh °YÕæÒxÜ‹`˚Ìø¬/†
Y‹WùU(◊‹ãï≥0/4Rªƒ sÜãáKK'º5\û5^öáÜAÃL	ß◊Ö‘÷ï=@ÙÓ$≈π{|.5a¿A–§Ú{7∞—ÁÖ≠Á¶k‡â⁄)«Äm∆ﬂ¢0ˆˆù|ı7úÈxÇ3bÕöﬁ∆ i¡	∞¯pkc-øârnáº{Ë¯≥#WH‡^˚ÚqÒæ≈æÄ3¬S˛∑†Ö+¯¢Ú^ŸƒΩ†µkX£?^™ûXÖåú^ìì)Té, :£ΩG∞»wãœ¯´z„∆Ë∑Ò—gãÕ#Qÿøb&≤ùÆ∂‹˝È,u>|>á€}m_–Aáï¬∆“æAÁ]Ÿät‡U<u˘áfm@h]}§`Ÿoå˝ã£‘∆&ŒÆã‹¿∞ïûnx∑ù¥ÀB"ö˝ËˇKÙ/—ÁsK√ Øoˇ◊C\oRºõnóﬁ„ò‹Ë˙ö‘ØˇK‘ÓﬁXõáqØ£J˝√øD∞YY¿&®vµ?⁄ÉGo> ¢˘>õ8¥‡‘I≠'Ùlüô.’·é3\4-€©˚∑πÉÀóı wúÊÊ±®ûÍì ˙"…`v-∫$yØOﬁZù√MA”ïµD$ôc’ıﬁ>X[ÀU'¯Oé4Tª§c‘	}Ω∂∂˙†–≥\ìÉ*äK“rà”Ñdh_…ŸûÖæD6˝ '}È!UË%·˘(Î9TMs◊È4ˆÄ–|ÒÖ"‡„¥îΩj®Êÿ‚]‚Ì_¯Ä8,Åˇ›ßŸ”ÎæÂ°o∏†(/›¨ÔÕç“c“˘0“≠≥*·Ùùˆ∂üﬁ˚©˜NõwöNK®!8¨–\q4ˆÜ?Hõ^h¶◊ΩÕ|6ÙeP‡´√ïw_Väù{ShçÎÍ
Ö!4∆ÜÈdõﬂK'-›£) -¿Fê◊{”8§∆G∏¸€˘∑`é lß–ŒaQ“J√ni)iµÏöM›≥ìN=M≈DË∫ﬁ⁄UP$ßı;´¯¥ˆ˛º<|@®ù˝Qp\˚1ÆíP¸≠?ºQ˚IG¿e¸–[k±’›mDÆˆ*p/» OA∏≈ÿ2Á:ëÍ¶§£“∂áß~]n9“è4Å/F÷ÕXã|‡ª;øS¶∂∫ª≥:0‘iöj3_Å˘Íoÿ©7`ØΩãêœÉ˝fUﬁ4ÈJAB.oäC„$·™Å´‡Oˇa˝§/pALfP"$VMÓ ».†*≈‹4äPtTåâ˜ÕÒÜ‡%¿∞‘Úd[^"Ìã¶(ûÎ>qs“CH˜*≠∞€Ì” ô‡Q¿á–„éãmv2äßS8ûzÁÏf≈÷PnêTCM’ÌøìïÚ∂õ*J6)‘XéÊ§ª\—òÙ2[eGR{#õz_9ö·}zT∂#ç–≈ÎøEO≤ë£≈Õ©h„0w∫*Z¡ÉÓd
‚Äüé‡≈ÌÕqMom_πV¥u
«ú+Ó0†6ÚÏJ∏}≠ú&^:⁄pD:ı(„(.Òæ•L%ÔLßŒU3?ı/^—å‰Œs)lÎ~üππ◊ø⁄CôC}É¸ô^¿qq’!ÔöâÙfÚtÁ ≠ïßç[î[!K8çÓ√ˆBW8jí~∫f`ºï?∂n}¨‘ZœxN\¶{‘ø∆œw•Í5¢VÇ˚Í*ÛœŸ˘8¿ÓıÖQÄu¯u‡O»„~ó!àÿK «	<∂ªíõGéﬁtK„6V“ÙXAygÁV‡páqó!œª¡ Êü¡ﬂ˛EòÜÉBG√p˙K7Ê‘èêf¡·	ÃsÑ4Ù—ı]‡Íã;·‚kEÄ°6+√0ôôóÁ˛ônªÇÒÒpÓ«óÅ‰_¿Òí“∏ÒÜqΩp¬ÛÆöê∏ÉJ'cÕQØ"‹∞ÒS– Ê¡ı„9Ô∆∏U∂_ÌoÉCD
(ÊõYòçﬁ,
Û~3âüV≠iS;⁄‰°F!∫Ì …O‡´ﬁFü∏I˛Ûö`…WN|º(çœ9˙ˆkí
∆4∑[Õå3OìmÕ∆ôú£ìùõÄ£dÉøƒè'™‡;≤ô¿NL`tìÎﬂ?;|≈πI›“ós§íQX*∫‘2a,^…ÿIÉÇm+Y™G:∑8ŸÇè 7÷µ±•µ!òl∆1Äº™%ì+.ﬁ#t˛∏¿:[Ã Ã Ä@3WjVÔjv´$h ÇYx5˚ÊÀ˜óiÙ‘WƒS»õˇxJ]π˛Äÿm©0†f„ˆˇgÄ>äíû¨∑(„À«»Ö¥ä†√ˆ4Î==nwπ∆„ƒ‘∑ı~+wq˝æÏ=b#¯_ŸÇB∆66RPsˇ‰[F¢º…Z+;dsçˆL≥áuÅ$ò‡˘Áìê'vUﬁ‡^˙˛“vóÅâ«¡Y§£˝Kπ-6oòÑ3£%Eﬂ∏ÍV∑‰≠Q∆ÎyG?ê0˙S=êˆ»˜6}¢∏ˇ=@ 8ˆÅîæ
m8â4eÑ°mGÜ·Ú¿’AˆÛ¢E.!¬¬$Sï[Øfôﬁ|› Gy—È™Ù”q‡k5a}üŒ2eÌWP*°?jeUTwM|~\¢™[GΩí2K°`s˝§2†âÜw
‘˚HÜ"¥"–ÿ∂ û•ËÑË”E@π≤x
bá!èOÿóÄ	Äp+Ú∑}f¿âÜ)™ı˛È]vv3É?0O~õ;AâYØ„7˛("≈€<Œænö:A ÑÎ»Hl∞È ˛!y˛!p]pJZ?S™ môãŒuÒî=<7'ÁZ9≥qıÀ:0Áwp‡¶∫°xr›2:◊ ÁúTilX¡vTÒ_‡¯öÉu–Á`9ˆ+⁄|X…J4nπÏ;ıˆ!rÇ»Â—Øıµz∆Ì∫|%ø≤	WZª«ﬁô«ˆí,%¸ñ»nq-£±ò~wK.Õ¶si¶µ k6]>π\[[ÔÌΩ<˙nœ1!¯Ã):¢0ïœmÄ÷≥E˚‰Õpx	˙Âñˆí˙©Y\ÖÈG7FeÆ˘’Ès≤øÆ∞⁄ÍY†
(z¨!G»ÖUÙ0é˚Räw˘™Í⁄NÛx‘>‚8}N¶túrbÍ~≈±hb1ÑJàÔ∑ØÏ[ÿΩ≥lçÑ¿¿¿⁄∂2¿U*d U‡0∞	Zìñ£V˘î¯˛émõÍq˛·dS=•hÆ&¥_»´y6˘aƒkÀ0Y©åé"”ñ≠V*ıØŒO±}·€s”{sËRŸ,m:‘X§ u⁄Æ¶òÉÑ˜∏ˆπõÜÔhÑŒ<i∑‡¸‰K
ºÃk¯‚¶~à Â,µdêYpùœ„+mVè¯àMköKÂR•îuìVonr"∆5'k˝â]∞ÁüÉ n≥ﬁÒÁñŸÇ¥˘≠Ñùçn?	¶0 †”Óc‹J€∫Ω
‘Ï›ä∑Á÷8Ÿè
ÙÃUBúæ[¡ùﬂY÷˚…Ìüxmom¢üﬁN∂Ôç÷KD?ôúõW$ó–˜≠<§@±Á∫/] aÜC‘ÑFCx®r(Ú[8;´£ıè…≠mÿıFjÉ5\ÊÀâàrüı6	]ç/2b´‹®R£√U>-ÂË⁄t©cı£KGÉ3v"ıF¸î…DâÌh—À*+·ÆŸù\%âÍ√¬Ü≠“d%XF(t”I¡S™O.ïºcö~ÎkS#¨ÓßG≈¿4Œ@Íó”Ê=W ä‰FΩËˆgÃZIﬁDË£ﬂi{“—r≈q(Å^ Ç•\◊tgˆ”ˆâ™,/tÁ|Ó∞J≠íFÎëË¢≥Èx¸!ç˘|—”èî≠,m´÷∫D5ß∫Û‘ÛœMCrÆœÂƒ∫G‘nlImª I^T’¨ìàÙrÌ—
 ¨äá7∫∞à⁄¶uå@á
xÅ˘¨⁄N2MhN©ÌWë_¶<÷§¸ÄQø®µ::xÉ6R,Ü„iP e/√4Î6’Í(Z∑â ?1Ÿ˘Œ˝
ˆ& ÷O‚)Ú	nG’3≠1ü?Õ≈XN]Àe™±ƒ∆QDYR;d çµQ¶»¡0®–*5aÕp˘¬`WÏ˛Ø–	èØpG√∆nıv¨≥Gâ›HW0(£bYâçD¢(lN.…_ƒ=á¥…Xy≠ïB)Î–SGï*}ªÛäH&¥•2¸U†ü¸È\\f’m4–nqÕß4ê`cÉJ=Ç≠£GMUâKtgNøÆ÷/Í»ÈDbß Úóò‚ØR
µ„Qï&L⁄°ÖÂy—∂vO0.ƒ$NãªFãΩÅ^âàQO‰ƒH–_yJ…∑l°µrú.¶∫ıZºSMdsRwÕÌ‹•æóìx< _Ç^ ÄüÚü5Luı!––ƒ≠∆`r∑Q¸ÓìÙ≈±∏:·â/úÃ<ıc%s‡ô“É,~SüRP{Pﬁ4}g¥è`Ô˙d…O¶uc™®§ [R˚ô3ûUï¡≥ü√≠*è{ô+O†⁄5ö˜•¥÷L≈eˆc?æú[–& k\
gE—|ezπë¬¶Ω»ﬂ[πRK¶+®@ÀüπÜk7WÕÄP£`–û]J±hig!˙kPæØÚÀlx~·§Î%öèåI(Rv®∆Û©¢Ú÷Ê}Ã+ô¢πøVˇeˆeÅù°´<4ÃÛjÅÆ-£øô´ÚÎ|^\®≥ÿ‰¸˜ÆÂYd˙Ä∫Z≥fôñ˙ﬁ`ØëS&ø’üi¢ø4'∞‘˙) ãEóLä≤B7Yû≈Ú Isj˜ø6UjLÀs·lŸ,<&c!ç+πÊ≈ª”,ãéé˛†[∂\Ä ◊õtçè°®‰Y$QŒ˛ÁÏΩ£W–3zd—“µl¬ºFÙ/Ä·≤∑ÖFæƒ'œ\Í2Û\∂û›u˛I%√q…I”‰ç0˛°};·ËúÖÕ_]dœ˜ö[ï⁄+ÀÀ0L¿)ÃêÈ≤k0-ã∞#Ï„ Ú_<+Ê√èè {3 ê˝qP˘ÀèÉ çO∂0Üï:áÉµí<í%V~ê"0'å«C¡‰‘∆∏ß[|Z˘)Çgà≤»√é¯‘\gë]w‚\œC'ëœ04Ú[:6Iáx|≤˘†“àd|<áï”`ö!Ps äGcû iI´]¢π√L}√wÒ°)⁄Œ—¯‡¶Öü}¬k>Q6ai2ÈêˆdõBóK◊óƒ÷Ê$`Qºnﬁ≤u˙-ì€.π/∂3Ó_T·ˆ—”ÍV=© ÿ*Có/a”$∏˝9n5Î≥˘∆®≤.π◊å&ô]fÁzö+åÀéR¥ıH◊=\Àµ@…bä)⁄I›Â=uí˚§àSùÁI<°úÆKRñä=)∑ÆÖÇhfIvHkr˚Ω¯«ôÓ≤y{KoÒæ∑VÉGàˆçö€Ÿ*LzØ39ñ¿kß!f;i0_JÇ"h±¬JQ¶ø&¯ªÄ§Â…∏4ÇS9Ãõ„BIûç˙l¥;‚Ëy<ú•.V¥È&#⁄1ä«~êòå[Ä	•)€eß∆…
¶≥»
'‹≤Dô!y`z3a7Ë≥úÀuÇ £ﬁC5Éâ°
·ó7î‘º®3A”áS¶2¨z T∑ZrÜ†‹égöëπüø§uæ’‰»Ø›JµÀRø+JQ⁄≈Áfaó¡Ú~’Ocÿˇ∂' ¶≈Q”‡öiV∏$dnÈ¬oÓQ„é÷hÙz•QΩúpÛMÎÆ=Ü/m€”Ÿ8≠1mW0+Mú0‚©7≥kÿ≠]Ù¨ŸLfî∫“™¬€¥ö3h‰'Yñ™OZî—&}Q@nÁ≥¥tÕΩìdînÈtn¢K„(¶Ñ[¿I$"Wu^x¢0–4*ò†áHJw®FV≈ÎÚπr‚uÁxõ ON«V≥^éÌ≠ôûòFñ§
© 
@#`>Oû.Ø}µñ«˝j\ßπNlp≠jïøømò;OåÕ˘ü’]]<<;”Æª	rïJ¥¡~kÌV¢` #•‡ÁŸŸ]Ô7ŒÒ‹º¶>Çi9€‘úâÃX0ëˇ¸Øˇ/;D!
èo‹
ò1ﬁ˛7œ.¬ãŸ ú.¬ ‚]Ñiº"íùb¬v6ã»â%Ú„œ⁄òŸª≈y8•;Eí#Î’
1`çí_U”Üìäh¶pûaÍUèΩÁE¥AéÜXiìì$º‚Fæ◊1√µÑÍπg›òEÄ¥-°DŸs¥ºÖ√√EwŒR(8oøé3Ã‰BÏAõÖªƒ";ó»ù´∑˙Sûô*5zû`Ö?øË¨˜^'â6ÛÃ/∞ºúÒﬁıôua‘yRm>I ‰>ÕéÚiu*¯4¸P
jNù~9èè˘QSã À˛%
äºã‡ú‹h˘Y‰•üÒBË7Ê	BÉµn£´1ºa…$ÿ≈™Q»»õåQzlÙ»Ö7gT}O/	eˇX2æ6üH˛ÉNc	u›gG˘Ò)
›ØÄ`2Lç<î©ì,≥_Mq˚¥\¯-“Öá2|¨~RÓªn:SÿPpÙÍ ∏V<*/#%÷°b*∞π¡q;˘jmÕÃ¨(Ç•>*Ì©VéÏÒm¬ÏµÑôì<‹[p)+ïGqí%ìÁo¢·ªgtH≤Ú((ìœ¨tëBÈµµ˚‹À`c∫£X<´∆ÚÍNIÔ…¿Zª®ê<+∫†ä_2«çûﬂÎ4œ&œèí†ÑÁ!÷Pﬂ¿*©W÷;(«Vyqi÷rIªÜ“Ì≥	˜¢UShÑ	UÔR3h‰é„2”amÓ3
¡ﬂF˝ØÃñAjá‹Ül‰/Ê4&‹ﬂE˙˛k¨À÷E+å\ê95Ïπ2N/é0‰p!—^ÊÏPB•+Èõ’ÆèV	º‰:Í}ÕçÔÎNY|π|<{æ/ÍÜXÒ®Z+®ò-¸ÔügpEt—$Ú/?EˆÒ(œêHW•ä“_swÖıı¬◊)«2Å,πjF p[kÜP˜PQºï¬ÛÛ£Àyzd‘ùô≥∑ŒÛa©dÁh<KuÓÉ•îÍñÜ*C™ö[ÊpbZÚvC¯å‰neˆ-»Äsı˝‹c_î1ã‚¬[ø ˇÌ˙
íÒÕ∂µ¬º#∑¸ÀÈç	’oë+Ò«õÍá,ö#QK˝}~¨Qµ.dµñ$º:•·UöÎ†’UÉacù}“b$¸Xõ®∞∆l]ƒ]Vˆ\	±jÕ6,VïOzΩÌ®ª∞Í∫q<∏˚‹œã£Oy≈§ÒxFÆÁgÂ∂ÑÖ•Ôõî}}}uÉÒŸŸk∫†Äzó§H¡ËLÜD÷('ñTJ√sÆM…“D_ÈËñ%‡—æGéíW¢v/∂≠⁄ﬁ#q‚ﬁëÿåyCwùB}x[“€í…ê÷UCÏ'´Ø{Ö= œ‹ñmÈGTËãf,{˙˝…˛ﬁ1;¸û=}q¥wÏ∂}Yóﬁç∫ÆË	gD„¥":c>U–dz‚)¢«Tñ%Wê°‡É8≤®“Õ#ÜÅÌ-ZïE@ñ€@}úºñ!Ú…(k£›<ã˝8µÇ¢ÏXÓÚ·£,wáØéˆˆOŸ—Ò·¡˜˜ÂãìSüzÁ(5âÁv‡ö≠€c⁄∏˝∂Ôqmÿ≠Uæ4Ë
*MßÆh	≥/¿ﬁzæìÉáxøÚ,©4≤Q0ºLø§•f¬o5‹¶p¸†7{
3&ﬁá—díDTë’π≤‹ËvŸ –´f„õnGèàÄ·QDÔ\Yî[ª˘ R¸SÉÄéÜˆP≤ﬂ7ä˝´)∑“∑M’πäß¸+¶óKõÎÇ
Ê«V_Õ'ãıõ{û/<D#®¸ Ræµ˚T≈±aÁıvˇO‹Õ˛]¥cAFªúÍMÈ»ƒ’E$:[Ì¿∂f^ˆíâÆÙ,–£÷øﬁXQ"=©—oï˝ U.ø	∫°|©Y#?6ñTﬁvÑéwß¥π6π⁄A…éÒP”ŸCHy%‘F[Vk¯√5<Å(–ÿOΩE≤™ä¥O\Å¥≈àè%~vcÀ…;Â•E(Ô»3?ƒÑMÅ;∑CÎîëÜ¸òÇ¬©˘”¯PvWqnñèóQÓR¢‚®KØÛ∞ú‡^´˝TÍo7ï´w’ï	–B›ÚÃ˘Úõ·4P⁄\[eûºiN§JŒ¬AÅuw«¨%c/Ó‘‹o”—‡FeÓ˛ÕZœ2EGT≤A˘tdxs¯Ú§ùΩCvx|˚øÌΩzˆ˙Ùp°Ï-|@uƒ´"«Ke∆\iŸ≤&Ôxª≈Shx„2ÉÜî{Á«#,”√Lœ'ëWg&©—‡±m&}ö!K-K2f…tÿ)øï.ÒBbëMß¸Ú_©œ#4ñ˜D(åÊ~ïdbˇıÈÒﬁﬂâDÈSëVßâjº®PR :UALßÆZø©Äﬁ’pÎΩR∏}Kîz62[ﬁãœv áCÌøÄeù6’FÖùPÁ∆aiâsßÕµ*Õ^ëj4û„r.$k¸ûƒÓm≈Ω!øvûx◊Dﬁ≠¥æ∂d¬"îﬁí4Ì◊CÁüøxΩ˜Ú≈ÔÅ‘øyˆ˙`Ô◊N‘_$<3÷LÂ>1;√859ˇƒ–Ô9a}Â•e°È¸ªY¶®ÁY*c◊C¢Ã=ÒAÙ~î’È¿ı4Ïµn.ˆ‚7ˆ¿™Çäœïˆ›ñªxÎt–+ÀÏ;v≈h£åÔEˆÎKˆkŒÁÊâÆÖVÅbãÑÜÏ»Z™ÊXJÿR6πu#+≈Zø•læ V∫ﬂÏñMµËhF¿8ı{6@tﬂdk…√)Õ©ﬁb
◊Hl8Èä.-+òÙŸ+?∏¸8	ê—Œ©)ÛŒqÜòe^%°]u?ïÑù6	ŒœÀÖ”oÑ€Ò\k¡È4¶Ÿ„Vˇjú^≠‡ø≠2ak)V[.ÿÒjÓoÚ∆≠x‡ñ’“uFaxÖíëÊÊ≥î˛óó©è¸∏ﬂÔÛ<¿≤Í˝—ÿã¬Ò»,O«?óÈ.0ˇ§?ƒ;V⁄˘ÀUS≠ ôÓRÀ¥î9+]¯~:é=ø¢$ùπ8ji:.f÷¶-;œ,7	G≥gW∆R€∏+c•É´uHﬂ·Õ¿«l˜©†~ã›pa‚À»X⁄ÖVi.ÂØ*'üˆ±ù™Ñt;vÓdÁiïrâL©ãæí–ãÄí•¡0ÜµMÆ]O.íH∂^ÙÁ4Œ’ì°;çœœ«˜˙⁄óäﬂÚè”oÖ2≤W6¸ï≤ˆJ (8;Eß$ëdÇ^y≥%V4s”˝`ÏŒÍ”
vÛn™Á™/gíR.nï%«;Æ,9¶7[’ß≥ÒØº‰áΩÙ»+◊JÊ◊¢æ‚GÃéºÛòu¨À|”˝Ö°ØäÔv—¯óÑ>&]¢¢ËØ‹‘µGm¥,Ïg<◊O0|OSÔ◊u…ç§ãÚ ñnU¯¥®} Ä "…¬¸j8ûÖ	À)=Q˘˚¸éÖA(±L≥Ïx†ﬂYocâOäéîí£≥É–ÉﬂœÑ8ÜoPM‡F!-ˇıv≠ø∂ÒŒ Ñ=–Té\‘í"ó.• Ö≥∞/5Ôº-ÛF,ÙA$°í6ÌFÂ«·7Ã£ƒæó±˙6ìÇ˜MŸ·Z4√Öî˜~Ë©m©–…S5rÓ•`˚~à`T-Å8o¯∑¿XYπÕwû÷¶+•é˝}#˚K)Î—Öﬁæ„ÆÇ'A∑h@nÅ‰X/§A&†˛&.OΩA_¨a˛ù¯R{Bﬂ¬XqœVt ¢ûv6y…∑µ§ãCõË._¢ã|ÑŸ\ç≈§2∞{Ùè4Hkâ–®ıÊó*tÙü∂)”owÏ∏^ãj’™%∑,ãï6¡†ç™•ÿYüêœ‚äÎêtL#1{Í%îàÉõ◊c ›€Ï(HúQÉMp‰&a¢_≈Ñ¯Ö?
HÔ$Û≤YJN îf –Ÿ=ï£QCíókâléêÀ–√ç˛É2›É9õÃ¶1[W&Zvrv:hÑê„jåU≈ﬁ5äÅ®é|ê∏ÿ™{]∏D¥Éÿ4'Œ†áBsÕ±Ü=‰‚â}û¨ÍÖˇú{]SﬁG¬›·ñÇ`·ÛoB .s”ù°≥P1Mz_qä•∆D([[óhk≥>âïBA™©ï!"Ve’»ëÂ•ûÒµVÃΩªn3•&%¸h∑ó∆	≥‰Û%öùµm+ä«UÆ‹UeEUÅ	∂æ\˝ÔÍºL›⁄(ZCå‡–∫íY›r}\NÅpn™◊Ät/π˝sÏc£$ç#QÆtñˇ¨†~.öƒ˚ò∏œkùb¿SòÊ≤öf1ZﬂÈØôTÀ≠∂oXG£À^5äQïË‰eq74∆H!Í_-D_‡¯Å&–°†<L€Å`5LÛé7TÕGk◊Ànˇ‰≤◊ﬁ€ûZ˝ÈjV4^`˝ˆ`M+8Ô[ „Ì5à:£Èó$‰˘¶1HπX
∫⁄à~Oï©%€S≥Ünì4NÖ∫√åP˙k%›€’Ï¯“‰=q*∏çúÚÈIúd8‘D"o~ÅªX`ûÌ6™˚=¸ª-.TlÎyM;Øº0eòÂ&Ö9à¬I&15M∑∞JZΩÛ;ø¥≈Ïa}ââ|I	í5⁄ŸKí¯çgø©˚µáø4YS¯—3ﬂOO4ó=ÎTZ(3B)üb	^¬ŒÍ˜0/´ØË2◊È`^J¢£hâ^…kiÆzÈ]Õ˛6	}õ⁄Ii/äìâ¶{-/œcQ›Ì*mºø≈X‡óΩû¸·¬ZÌËN*¶áä	?ïj&Ú„ƒ∑QcÊEv[3~ƒFΩp)*¯ßaf ì_¡˛˙JM
Q[›»n‚Œ1“ßG;ÂbAÂQ°⁄j†1rÈ–¿t©…w.4eë;®≠ ±Œàfu™˚ËÁŸÊ∂TÅÏqƒs^…û„Œ¢PπKa«üÚ—ˆIY¯0‡$ı∂B’ÛéÀõÁ$"√;>úR™¢m±Cã;\\}·J_‘Ù≤«ÃF{§ízÚ^H≤X’OOÿøfﬂ‡∫~˚=ûcÉ–∑h∏Ÿ±ºUŸ–è≥S+Ôˇ≥∏R€p>å~ÈRÂãC/cΩ«˝¸öÌ’weünëí{π#|ﬂó^îix•Ì~UŒ«£q	≈;ÚR íÃãﬂ˚∞Fôå$„ôﬂŸ¡ÌüËfìvÜ	q4¥ü‹˛…ØmâàÊYê—P≥√úäÎ∑ˇçnT∂1à«Å6äß¸BıpÏ^j£«kîÂ’Ö¨Hpø'|˘íx
48Çﬂ9e@b·^*0a∑3<;ﬂ∂∆;Ë∂Àπ5«v3÷ÒÒ‘ÇÅ∂◊§]êÌúÓ⁄û…»œfõu®aÓﬁáæÌ—·8ímëR’˘Çë© J∑√∏¬¢f†¥é L—ZæÏ¨´Ÿ'íΩOu.Ú'ŸYß3Õ“∞‰˜ö1Fôírrú·HΩa÷áØáÉ? ∏væ;}ıÚ ºx6p”[á<»"Á´‹\ı6‹ò-€Û4&,†lÖ¶ﬂêø¯u˙ŸH˛d7 $Tz:†zÑÕ!i≤∂7Œ($æì8_ë6Ïñæƒ—¬EkÕ SÄî≈]≤¨w∑m≠;Xô'ÙºÿV˝38‘;1é\ke‰•ùMú›'ú´t4∂Õ>|>/ı£π|p‡aì}‹7nòàÛ›’ßå;Ï…∏æmÃÑ‘‹UsÈúÉN'ùMVXÃyÓŸXüN—√[|ˆı–]Åˇ›£ÁÙ˜&æ*Éœ>√¯~G≠˛‚[I˙ª£—$%J È/ˆœÉÏ)2Î@m∏“PÊN‘ÃÅÉ¯ﬂ®èM`ß+˘È7~]ë¯OWË;¶-∑6lg®EgúÑu¶I@¬‘g¯≈⁄ŒçÌbeùyßπ∞`Ö…√ùØpA˝núº~Mrﬁ_w§[.›à‚~Xqb;qInõ}>W»∆ç√ª?çÛ˛Uh¢0Õ≤ÈV ì 6v+êÖ%ùƒlJî`◊AÂßV~¥®ÉÎ¸*;‰≈ tµSS}ìªeßå_ë˚ÑãÓ…`ITR_ÉeW√µ∫∑í}†AàQX7(¯≤–‚Ø)öf22M‚(n…ÆÈ$®Ôz\$qÑ:5ky1*/™  g≈A∫-h¬
”Èq+â3 ´ÛhÕ~ ˙ÆI˘8/ìy‡[Ëk@Gá0ÆNfVÅw9ÌåTU:≤4ªFäRÇÉ#ÅåpÜ…ã⁄’Y<˘˘ f≈èà ÁyfõmQ.°F@{ø®†`/oN8ÇU∑4	Qäg—+/ı'ﬁUGæOÁ“
€ÿÄª¢ç™òdëM≤·4Smë¡¯ı'§ìkÔ8	Ö!ˆFÉúìwµQâÀ%hkRƒ0?ÜËDAÊ>S»
∑NPFGrg"ìx√d"ºçª˙≠MΩı⁄‰≥nﬁ≤µhƒ°£à°g|∏VrD[Ä∆„Á9i9≠&Å†I6ìNs⁄h8'#Æ¢‘¢ÿÁFaïöﬁ*¿*'BÀ8/`n"¡≠À6∑J ’x‹$Äªæˆ£…^éPÎ™ÃdÇe)&WΩÕöXıπ*´†U·¨iuñ0ï	†M	%õ3îl™Û4T≤œ LD%´∆YÖU£¯ˆ<ÁÖ˘∞ÎX∏Û/OèUtV÷Ù¢@¯©]Ä˙d%6pÒÚÇÓ∆ﬁÜUGáË˝´ÆƒÈ]kS.ÿ¬F›È´K $q…&àüe_¬:°ÇÍ…!ˇÃïq Éâl1†©`à◊nJŒGJ^ı™q≈ßqÇQÙ†“¯∏xõK‚¬=mo„∆Á]ÉçŸËä“Í,WZ›◊4+å\yÙ8∑2i„tŸèá3T˜±Ωò◊]H«¢µµX>*ŒKGHÚ‹f&È∏wiî1M∞NŸãH‡(ùb/Ò—_¡ıhn.)€Z]Ø¶˘≠dçuæ+M(B√eæÁzMòSËOÛŒ§}Eô)ú/HÛ
¸U°DnP‰∆˛µŸk∫QE¸vΩ#Ì( ”OÈíÎÖ‹t¢ºÒä_sΩBÂÒ£∏	∏Akn7x¡µ≥ó€πøA› ´Ï>lÅZÙ◊≠ŸÕQ_≥w7D{Ìù&(ﬂ¨âÓSıÈ¶Øu± 7~QGzmê–^{æ!‚kÔ4A}ÌÖf»‘Ë;˙[£]Õ#Á¶kfàq≈á—>LπwöÈk„Ú¥Y]≈Y÷*≈e∂∂EÂ
¨x…∏üwÒ	#*Ó0Û∆¨y1√–r¬Úaótj–«<"+∂5∆ÛΩÃ[aEN,"KAmtOnÏæ—Zƒ,qÑf‡ßÕ&¶º*gI3‘“F⁄çiŸë∞2√Cï#T•~…Bn^ç!g¯%Ö°LOÊÑvDƒ,Áﬂ7ı${Q√J"®–8XraÂµõÚ\ˇπ”úíÍˇuçfAÇàÁˇ≈äÍŒˆñıl[0‹›√¥¿àTÙÅ∫Q'4°:©?Œ¬qõ∞‡
0#±û(aG‚M˙ŒÅ,ƒ˙-ƒ¯ô˘ﬂãJÄéù[ë5?òÏ
˝´ º•\˘3	≤QÏKØÅgø£¸≥Ôèˆ˛gÃV˝˛Âﬁ”g/OﬁB{}˛ Ü(¥€ÔOq—≈¢◊ÍÖjå§˙˘{J)Q¿MÔÛ9Ã´ PiÄ8
»|çNv·îäæ;Eªï≈ØYCˇqUÒ≥…Jä’ã“‚ÍÃ®¥π¶Üa+—Ÿ«]ßﬁ2¡?wOÙπŸ∞PKŸ≥Ùk E°ªÿ+©uFÕï*µí¶F˘å¢ÜZAé≠µj;&µV[L¢4ﬂªî≥·q¨ˆåã≤ñMkóˆ»P$Ÿ}}ØïjP±1…úﬁ˙FìˆJ0∂b\˘ÈêyÉŸÿKz—lí¬LRÔ, O·å6(F†≠∞∂ÔØæzµzˆ›w€ìIª∫÷≠˙ô´4ıXóV’ßõÄù_)~–ªjÛrLu:í&8Tõ¸u·Ï∞∂ãˆ+Û¬˙3∏ ≤ﬁ¢ÖäÎ ◊Œ¡Â¥HAÍ2{l™c¯1®%ÉÉ–∆;™9Dû‰O–≈É3¬l[S†ï@»`j÷rñüñ´Ãì¥ﬁSywñÚì4‚'qì{©»∆…`!DÆX&ßS£xFEÁÖPQb3]l‰“∏
íQØ◊cØ©Çﬂ˛¨ñ|Ú(£dC/æÄ]xé¿c÷∆K˙?◊8ù^¬„»B°πèKÆÈ[hÄî≈'{/üΩ«ëæﬂ?|˘˛∑œ^|˚›È…˚Égœ˜æyö?µ^·ì7'>Ä‹@/o˝≥ˆOln|ñK|å«bÁwîÀ
g7«©˛O¡5ªAﬂ\˛Ωp˜Ó∫Ç±äπ?;yÒ˚ΩßÛ¯‡Ÿq„VÆœ:¢YM≈v*^;æ«÷ùeN*ò„8zœ“ ˝ìÚ¿jû´÷ÄO˜≥Dã≠0wµÏ8:çg√=~◊∂lÈ0M√ÎÒ¨TâêõE.Åy¨+4‹K®#^&lU¸¿bUúlV‹ZÜâ'âóbæL^Ó·´^Çu5Ω‰|Ü˘p<\ÚYdM—Z†eé“ìì¨kÖŒƒ<ÃÖñ'.…ldòy›`.îmì?z=aYËD—Ûìé–%ìb©Q`ÑÄS≈D%ÿßI<çrŸ=ÂÎrY«£ıÇ•¢”(LÇ0Û‹Ü°˚ÅÂûç„.ê@‹q|MS ‘ìiãüÄ$6Å\øæ∂ˆO∏Ë ˙g¡ÿsÜ†|}¶fôc∏;ú*ƒ"∏¡ƒÇ1r¨ÚÁ—~üÌ«~xØ†6!&|‚l_y´º¶Ò ‘ìÔjL=°&"‰π£YÁ5¥µ¬^∫*Ïç"]∑o≠‹öØ˘I¢¸]‡˘‹πIMJ (JÜ÷r≈ÜìÇfÅtª/z—+/ÚŒ…9ÿrnmW=K]$«Èú-E.È•(N∑N;ÄÇ∞ãÄ›—éN‡∑	Ï≥í9]ºc™çÉ=Û≈\eA:LB
∑Ñﬁ∏ÛHX©ÊÖ9≤!·.mˇˆﬂÒ´}8¸±O0Tˆ‚hp3ŸáÇO‹˚@4Î|iPAÏéÍ~±ãûπ˚∏*«ëí·í[µÏÉ·ﬁ”hË¸.ÊÈéÖ‡t1¶E˙Ãã]bÓuˆª{∞=˛#H+ZsUΩ∆èûKöt£HÎµ¢"
Ó„waµAµÁö3ÏÖGycèï/gqÁ]è¨~Mj	•i|ú7ÇπÀ°Kjâ/'gÂß\õŸÆnÀGƒi8Ù‚"ﬁ˙±ÌÍÅGR,¡∆’Cmég√[Ó3y“”=–®ºÒè¥óx_kO0%uì?é/—‚&Çùb¯ÉkW˜H´êæiÍ
{‰!~iúπ^Y¥‘ËX‘
∫®Æq’~‹L≠≠pˇk^÷z\Vª)â¢<}”=∂ÒUã—7,tafﬁEOãÓçöØâ$nÄ∆gπ#Zy∫tdè¥ÉõäzDôñDØZª⁄-âº4Äªƒc€…˛(k\÷æÚ≤òàã5®ÜØ]{X•¶ßK°¨Â T’µdWıê√}
˚	¯ÇvW/[ﬂHÁ…Q;†Œx  ≠Göj≈-}ı0@Uj?E©cb2∆ÃÏˇf∑Uæ÷j2ïJ“* / c·∂ÿó,»B`≥3n¿é·tNæ#ÉÆ&∑?s“hÀB°ç¡ÅknUz-Ê|bÉE¶pyã_RµPQ˜Bõ@›∫Á∑ººìmµ©Î∑ÂQÙÿ˙ª~Ñˆàz˙Ü-ÕmìE= ÷˘ÚsÀ]xı¶˚3FYìCi‡∏+R i‰%m˝F´––5ﬁf⁄‹ì5ŒêëÁù¶yz∑Û—9∑˝|4ctüÒ'O√Iœ≤éí'®¸*e¯\a[kkkuS˛ô7Aíó¯eaÑúÇ+wú˙±qàuRiÖ'ÆVª7è"ó6◊ sÖÈuì*ˇ‘£∫j-66rëmÇèE]ˆOâêyØ%å<,∆”1XãìÍÀwA 8ßÛø0Z’ì{cπ‘…«√Ã‚Ë˚¯∏ŸÏ :â˚a˙QÜ,√öÁÊÊö% èNŒ7µvˇQ
!˝6Q–È=Zú›kCRK~" JÌÕ=ÅœöÍ¿œ2ä{ˆ˜2È%∞ÄÉ@3Ëë∆ıÃì ùƒ¬ï›Í'òhô'dëÊL‰Òäé˘(â˝YÌVí©∏Äå•\˝ã÷C¥c¢KóÛ∫L\√ùwKÊ<∑&∏zQãE¥ŸW‹∫Øö5%¿‘LVdÊ:¥™ßÄ"wïy“Ï…<’O)ø07]}?E∑ëµy)∂Æ∞áç.ƒ«{@UL<ÖïEWCàkõêU	èˆ≤ôg)âß¥Ä–á≤2F|cé·M
&¢p†gS÷ÕÃ§˘ùç5˝∏ôéQœüÙ÷Î¸xü⁄¡3hë<»%ü4!2TN∫6D˜‰tÔ[i?EU^ËªÛf™üÓ¥œ’>®Ò(h(TuêﬁõpÄ˝w@Mx;u„¥ea‘Ü≥ ˜…›È“”8Ûb=ü"©gûèŒ‹PFû∞^í>ñÛÚ„tÖAá[X‰◊Q&@Ò∏œ^sÛ]zlPqY§BÍ}ß⁄YΩ"/9Î,¥œ:¡UõÖW€Ï¯Ûıµµ¿ ê◊√®¯›e–F†ã!v~Êç…¶;>èÎÇË∞¬Æ7ÙXÎ9æÌ±ﬂµX0 aÖâù†©/á]D~$ ü&4õ	÷¥ﬂB–≈$¢=H≤^B[‹»»Œ!é ^ñT7"–ÖQ†ıqı%û]Jrıtó+gÉ,ÀSÑ‚òcX"º+‹l‡‹«Ún-kûW◊ïä'¨}Ãùz–Vö«0—SAö,√A˝Y±`¨gÀJtçÆ ∏ò’H⁄Lu[y]©•5ie◊ Ï|}åh≠⁄'e#Æ»”Â⁄Êö°Ó+Ñè‚°k]$Û√#T5ØﬁºCı™ÏR^€¥ï÷l÷mÈ≠uà≠ı^5é»q‡°!ÜW”k†·RqªCF¶]JeAjâƒl¯÷ïH~/+4$îÕ>tàNû°:Aß"ªßØ˙t?_<Lz˛Z·È˘ﬁ¬m÷(~?ÔO¸%}Sücj°Œ&‡£2?ùvø‚¿ä=Ò¸2 ¨;’µ≈m†`q"õDB7äEÅÑÕµzár¸‰'ﬂ\ò?ºÍò†ôQ1A%À3Ú@‹Ï
ß;ùˇp8cp(qqû‘Lˆ ∞¸'íLè∆ry‹7‰
˚Ë8ÑS9∞Z˛äÀå2£vIIF3O»úM¡¡“|ñÂ 
~ΩÒ!7Ël‚ca!ØF…FF/˘œ?&sÛ«—qÇ!≤àÄﬂ„≥è&ΩÙ¿{ìjÃ˜≈UºËˆg,√L≠`‰ÑTX´6ä—l"2D£œÿ
;V¯b‡„ΩpÙ˚˝Ó" K%Q”#ùlÎk%ÖOç¯ÈååPÇ“`kE‡˝ÆöÒJâ*X}§$òë’]V)ﬁùñ‰q¿œD5*	”+ÅvDó¬xV\R,h]<õÅœ¸⁄≠GüH'äÆ§ÔqFË‡q/§| ∑Ã¢p()UKÔq…Ó¯2¡6ê¬:f<F«w¯/ûí	97éÆ∞˝1l_¡ÀÉ$Ñ/"!<|„ñWÿnå§¶ã vWê®ég0:fûÖ„ ‰5+a¯ÿ≠ß"Qm≤3G‹E\úz}•làÏKJCHŒßúfœRÚÊå)ˆõ Hìƒ`fiB[î⁄j>L6°Ì~E≥†2∂≥¯pŸMÒÆÈr#Õ°≈√Fñ„^4ﬂ82Ó™-sp ürı⁄ÇiÉÕV_={˝˝˚Ôﬁ?;9}ÒjÔ`: éßÈÀàÒ¿çy˚·ƒÉ7)Ω0œ	»`∂ºkIYﬂ Q Bòí7` (-≤6»'ÈÈêSüm~ÿ$WêLÖi¥jÕå)2c€–[ﬁsì~xäŒ<IÊ£Ò=å:‘l"˙ÿX[[—zßÙöt„Q∑2ë&ˇ∏Ú@´"K•∫Í$Zº“ß≤ÕU∑t¬.So™§PÛ ÍærOî4PÎj®äQJ…›÷-9ÑÔ*Køäì‡M —(∞Ω›™»|+^ktÑŒu à3º¥õß≈ù7p5£#ê◊`aò¥ˇ'LÙµˆÆe)º‰&∏µ0ë˝6ÿú2'/'0V†DÏíZÿ·we∫v˚3î‘∞sÀ ‡"0≠ø‘†8W>™Oá´g√µ)›Í9‡FäÜey¸àºXz/ΩéÜLqå®:s)Ö«ªÙ¬¶_r&ìN{y,Eü\Ë´Q∂Ñ˘§›ÌvÛÉ€©°Ωi‚ÓjÄ/Àvy4¶8\JôgælÌÚÃÅ˚a2zm:*_î»⁄9Õv?ˇ4PU|‰EâÖÊπf%⁄{]âº\im÷Nm]û√}
øı59¶Y-≤%ü7WPcÌ˙4\ô_‘ÔÌ^WŒÊf€B∏T'·yÑu}Ω–ïIw°,¬/J€æ–≤ÇiÓà)ùÄÓ&\qGZ}Câ–T:‘Âú±§≠Æq˘µ≠üËRk¥ïk∏0nï’/tL(í,NtÒ1¢Ü Gπ¯ñ«≥ÉŸﬁBWxÏ◊E∫˜„Èµ%“À,D∂/…·⁄,Öp]~s‡Ì&<…U&Xå˙3ç;ª€
2÷Ë#-/∑ö÷¢æûH#?àI√ñ/iZ@R#∆P%.Í8~˚Ó„⁄æè1EA\≥ß^dÏ °à\`È|„ÍPÊ‰9@)Ω¬sh
ˇXgòíÄ†¶GXNr¨ÉïOc!≤kÉÈbî∞ı£í›º»|%8N/"Wn/[ÍŒÚßëıµ6sıVÎ’ ˝uÉA’ÁWêﬂIÕôÛÍ≈Î{ßﬂ/î7ß(8~«‘LÁXåˇA=E
ÿôN∂ãüõl|Æ¸‹bWcÂÁûoœïv„o4Œπ>‹˜[?&tv˝R≤FWﬁ+=Ù∑8êÙ¢f≈ C_iÛ©»æá)k2k^…ı3“R›Ø dò'ºC‰pΩ«…Sœ?ÏˆÔá%üW‰éXxr≈ôå)Ω©‰∑.›≈n√tßkY‹‚6 pMJ©Ω~xæ˜Út≠‡ü7sÛ°p»£Ωokå⁄;´∑ª%"¨OvhK|i÷«Q!5MU›8®∫>7ÊΩE◊ZÊıËo6¥∂Ëu∏,’p´fÒUïc™≈l‘4îúg™Úgœ4∆‰”2a ê˙®≠1SöÍ˜ê á÷!√<ÌR:©QûL2ëü*H·‹Eõ
%S/íO’˘7ÃMçi~B+ëö›˘(úÈƒp–çµÂb™õ;x˝≈≈Uﬂ9≤öY¸N—êjK˝ﬁ{1‰5¥njwn ¢-n}è∏˙kπæá†Î˚ƒÿ˚ä∂˛XH€8˚ﬁ–∂ˆ†´VTdÓ58∑E´èÁGõfıBSµ>Y◊˛Üzû9¶2[æ€–¢Kí∑lÈÜwáç~„Ü“«5“¶ﬁn˜gK∑´°Tn∑»uÄ,èé†l1,›˚$Dâ®˛fÿåò…¸3˚µÏrõØ|
≤ﬁåQQvãn¿µŸe ^d-ßΩi ˛5≤òŸbµpU‚	◊ú&/U#¢Ï22oï≠_ã¿åÊ∑îΩÀnŒ™ù/‘Èñ-	˘# d•m™ÿçä˘j—	/ª˘ÓÕ e›`ZE·
ªìŒÄÂ‚É+Ÿ† TV–hd◊∞*}¨≈~v5œ≥u“Bs©≥›Õ0ìk∆=Êô◊á«Øˆ^≤Fw‹˛)LL+çS„_clYg[µΩ s∏eÂ6¶,kJY“êr3äµ¡+J3 CßeÎn6îRÃbR€‰”ä¢ZXdÆ3mÎt‡4µUÙ§∂‹§&˘_ñ≠fãç‡ˇ	HS’J”ƒ∫›®lUìä;£≠∆í´Zqf!S√h´¡@∏qj!-HÛ‚ıí”mX\çã’ﬂªÒÎ~\%tÙˇàF4¸40§Ò«öÏ ã)§2Û\„˙mı&åÜe˚Ià÷Ñ˙\lz≈∂Üå¸å≤wA+H)∏Ã§ù(∏ƒ<vús+ûÈbú!Í-Å¢ıò˛P>Â°.ì◊‡”‘◊—ÏÆ0∂≠]Ç…ï4±A%Î›Íÿ’¬ØA…øOk∞¬œ'5Z—Ô…pEm¢aúdqå±-e«¢ë4∂‡Á/ŒûÖü;€¥≥@YGıÿ˚ıXµ”‘≈≤±u?˜u∞§•ã∆rüÿ¸Î¥x·Á¨^¯π/ú˛%Ì^¯iä÷ÿøsœà›àª´=≠ˆÅ•Ã^E“9ê¯ÛäÎ$ˇ=}´ÎsÁÙ≠1ôZeÆ√-ÙΩ˚{∫VNÉt≠πb8
¸Ÿ8Å˚o§Ã·ôüΩ}Xˆ5~µ¿Q{x\Ó¥û∫˘¡ŒÕÑTEÂ=Ã’Ö<iı˚@§•n ‹∆*Ôu];^9cCkjÖ÷ΩA{|ú%ı=^\™5‘˚ã—XmKçÙ£jË´Aâ⁄6ìîùÃ&∏ü+E£R∂"°ú¥E/~¸’öjnFˇ¯r÷S]cZ]ƒ™p}Bî†ÉﬂWXË_9ãÌ#¥‡™dWÔ Ñ™E¯O≠xFb˛ÓﬂÔcnd ˙◊7Wå_@ÁXS¬Ô¯¿?wG)*ê:üõWsÔÿfR~IŸ`}$ ≥sHˆA&«L?Ùà˚0`øa≈çmÂFWﬁë3Ïﬁ=Û^ΩÔP≈6hÇÂœ√»ãÜ®¢{_-ÑÂÜh≥TŒÌïsS1|√Ö‚z]¬ˆl©Ùâ5ÁªRA+º*Í"ú¢·®—zY{
p/[+.|z©æQv>e‹1µÁΩRÈöÉè˙øX@Êp;y∫YÓ]∂ã∞í≠ÕÃ˘ƒH&…ü§éH,ãlìyE‚˙Äö˚Ië{ÁïkBE–ÏBƒêéKN Â°âR"˙G*ÕÍÉ|Å¨H;Oõhx»-¢ïNêßtÛQŸÕë0ìyymŒ∫,ﬁ"OØ»ÿ˘u›†~a—;IgVoœ-çΩöÄ‰Ÿ +ÉÓG :çwQ∑f=≠UÍT≥◊¬KB‡É ¥7 ]ΩÊÕ–uÅ¸ÒeÃ€DÃ3})™˚˚%n+Tç0‹≥∂í:÷/¸_√⁄VŸ¿ù˛€çQÅ#Å=øO5ÂPt÷Î©}Ãÿ¸/ú +hÿ”îÚ"Wu’‡j∏ kÍüE©ëû'ËÔH∂(©ÛP_zy•+˙óƒÍà~|»¢Î∏Ár«µ\‹$Y∑ÓãÕyˇNÃåÓúˇqŸäe*≤◊™ ?[¥tH#§∆œ‚àçü¶»çü˚Cpó„ò#ê†ªÒ”,∆°∂°&∂EŒ–¿¿XèÉ¯ijÍ{¯[≈#≈!ø÷gˇHT
π$ía"üãö"¡2(–ÓÒú¨pspÜ°4¡ÉOlS3özT‚Ω◊≠}C$˙k√ë˚&ÕÇçÓæ¶<¨Ë^µ:∫®ﬁd„∫YWdç*≤≈Yª1ﬁæÈÍŒ∆;]%⁄hÓIá1n‰Ü]ˇ8J•MkäQ‰ΩáA4Ì=*‚QÆ)˝óç'Ωtòƒ„Ò 6ºÓ≤i∫›Ïºà.PÈó\øä—‡ÃD—î˝x2ı¢Î«s˝˜õ•h«çBÃñ[˘„Ù£Ow´à˚yhLı÷«A:õƒ(†&>ïgc'bhTÕsñz,e∂1+°ÚF∞©√ò ©1Œtc}#SıÌ≤p[yê‘h≈.Ya≈K≥÷ÓQê‹˛¶πÌ∂ ‡Îæ‚Aæ≥ ≤p¢—EÖ0˚./yeë[§ˆbßëñÆ∂óÜ‘ö„s≠§™ö¬S˜QX¿œ…+˝≥/j£ñ/qk◊ÀnˇÙâñÍ4^j°N„ø÷eöwDFÔC`˛UâiM4oÁ.≈*TÈÍç•j”ÕØdˆŒ9Ñfk˜edø2πlyC:3ûÙ√î™K:‡Q7k$)≠JCj∂’ô®öã#ó7Ìäx™ˆñÖ“>ßtÆdz´
ô±Ù	√¥ä~J6C‚X„'^ˇ¨Ër…î7l◊_
‹_ﬁ˛ô◊EÌ·Ó›·Ø⁄LÍVA‘e˝^¨êywò´‚t-ÃÎãrVh˛ô—∞idÊëï·ù™u]’y#s#?™§≥üŒ	∞®ƒÔ≤°Á{¢∑xU·"ÀôV^˚Ù1ÙÆöé„v°ñ˝z∑îE·c–˙çEi}°ö5±^”ÏòüÀï1tçƒ€†–óˆWL∏{-∏DØz¶o04\G◊a<¡◊Yî›0z‡ˆÁ∏ìVSø&…§ü9Ò`gã¯ÊVÒª[kçΩ
n´v_B'ÄÓÓ`XÌZµHÔ5yº›‡JæÉn…®õø@#@øJª|S—Â«ﬂbÏCÆ~4i©™∫¸d§‘ÓÛâîÙŸÑÌô]òì^îéﬁÕﬂ©®ès|T∫0õby®Rißá2N¸m˙ûƒóïi|‡πíˆnÀë‹XÔÈ¿¬o€Ω•wF6~:§ØuÚ`æ]2å(Ü°˚jë¨5;øMÇh8™LB!‹¶66Âd—ﬂ"eÅ‹ÆÏÆyÖ-î≤Ωs†}¿€¶-¸h√Á~ñê—ä∂T÷⁄a§I3¡t[∆˛áó¢˛˜Ë‡eîH·Låô$Ÿ,û1≠Ê1èœ•Ï˝e!VºΩÌ∞;ñV∆œäÌ{'Ÿ”kõP`”Ìùho =L’·E◊V	CãG}ƒ◊Ú5;&ñ—˘!®e†uCàQM‘•z-wpËÅáE›·†FkQ<	*Z{∑E∂ßÜ?qR—Úºø@{‹Û£¢A’π@ã|Ûêö™¢Ÿ‹v≥W<ÓÓƒ@ÎŒQ.ü-∞à˘ÿ}"¿˘nË:2l≥'¨Ì·ﬂmq¡∫'Dççöv^yaú¨R˝w‰Øëÿ ÚaS˚ØÇHﬁ«à: @˘Ìöç∏La¯˙ç´Ï√áÂ¢ÓFíΩfõ≠D;{	–ÒeÙ[ „Ø=¸•L€œ|?u<a≥˛∫‡"^ú=û_–πÄiw_‡≈„‡ÏFXWŒ‡ZãÚ”M≥«≠˛’8ΩZ¡5¨	RÀ˜/&SòÍõºqÎâÍF^?LΩ¡#¨√î7go≠Kœ"ˆÒK0®∏ﬂÔæâ+	;{Q8yV43ˆON}ae~“‚ÉˆüYh»jÒ◊±;˜Ë9#%‰∑cÑ¬kxû|?«ûou=«Ä¥Ú‚|Òk¡†;|o:ßA´kG7";(O"k,µÕ<f¨tpU†ÓÔ È;"˜Áa"‹yZ”øäın∏∂Höå’]`°,<¢Míô; -%!…\≥îE7πM4ß>TcçU∞J`oñÇîaπ°Ww;è*Ñ
ïÕáz∏≈˜ˆ–Ãﬂ÷¯ã™‚Fÿ:àJÕ◊A4öM∏À8 %óK,¨|3Œ›VÕºZæC-∞qÆf]6‡Âr/ï	¯~À)Ú÷ƒ© |„y>é˙,?Óˆd
hKo⁄ögƒ÷Ner‚"7Ñ-)±ÊòÙPqÌ+"CÌë˛ñ¸ƒ¶≈CDa´bÈB„R˝é*ÙÑ⁄tø˝Ÿè‚m3œKL5,ÿè ∞/Yà¢mxΩ€üoˇçú¶p´¨‰€„ˆˇÜ/	Bÿ>Ó8‡•™LV%?6úÑQÔ≤&π–µ¢]£ƒπK$ÊUäV3|SrNl˚(	.¬‡≤”i<0#Í
€xXìÊ•2)Á\dûs’iÂ±;˘hﬁÑ—PnN9‚>ú-Ä~˚‚w⁄?#ø3c€√qì/=.ΩÉ$ëû|WëU˛˚P∞é”≥˜√h˙À±VÇBÉåµîåµJ]G•œºÀ˙é87L€W5-”¥4Íf™†¢~©·‚gÎI≥]9Í≤
ÿ⁄Â∫ZÊ∞T§fç§Æ&’óHr·Vó¡˙Í/ê˜.µ¶ó…–UÚ(mòGo¡§^wLÈ•$Ùíi}Jº˚Ã÷uüπ∫>V¶ÆJ_˜ƒq6]ù®C‰ÁäHmÕ9&8‘„≤S‚DÔ`&∏<äg ©n≈)>TuE⁄nëÈòw3åA“´FÛFïO”j∑UsÚ¡açü Î7∂e!üj¢Ω|HŒ’Á;ˇHE~Ò"æã4§V˘≈JIUÓœ Oˆ•£0°L'Bc,ëÒè]xn¢˘‚%MtZÖ4^ÿWPÈÎf∑Uæ÷∫€îÓr∏Y¸¡ƒáb.bﬂõﬁ˛iõîø„)P‚$ËKFF	¯ã4È?ÇtÖ•¡‘#G∑iå°ﬁû»ŸæîàaËéTC1†°·}£®=±ÄÈΩ>è¥=tÛz8v•óUÂ‘ ìuΩ–©ì˘$Û.DæO ›ΩŸw
‹Za1f«ÇKat˚ÁaXôzÅR.Æã†^lÖõæ¢Æ´s%-%y6%]#w¨X¥\ŒN–‰i⁄[“Q]* EhÔcrÈ√≥é∂˝¡˘J’múEE”+∏à'%%ª$é48R¢ﬁú1¨©gvqÒ…98‘˝?ìj‘kiÈm’vﬂ·ôﬂgwéÉ≥$HG˚ó
üÆl]©7ﬂ™.‰SËJó·+L—iL™∆{Ã<FµtKöÆîV*‡ïéjÍ⁄à¨wçs_5(SΩé÷s⁄©!…ßëy,£—ãfìtπÃéwññïÚQî‡ZÄ{lÍÆ™Ÿ[{Úˇ˙j˙^ˆæZÚï≈»∞¥¸e7õó)¨ÀÜÿ®–CE$÷I‡%√Q^îÏ£ˆ√H∆ÉbD÷]ÍÔæ2Àñø¨òVìuºA∞<’ñ∆A@›˛;¬†{∑åÌF›MªôL{°Ü‹ÖØ]∆ô÷_^é.∑Yèñå#Wäè!*ksWWŸseˆÄ8√?	è[âÖø¸Eˆ1C{†æêcàŒxËË≥ñLµ‘B¸∏ﬁ¥ád”√N‚d#é¿7T;§yN$Ù∆K‡†ˇH…@  $Ù∞`gÏ¯‡&z€ì<°Å`ç&Òj^:GÌ{~∞¬")‚ÖZ! ˚q*Õqv≠É‡ô=FΩu^l◊X~≥S;‡öÜ3ºqz=Dé1Ç∂∂‘∂ÆéΩt8ãFõcÈÿËH5î%‚EΩãº›g—Eà“¢Õ¸=W´ìg)p$ﬁ‚ÕNﬁÙ¶£·=XÓãe∆Îâù>BArË-â…˚©x◊—¯>ôñıPæÈh˘8Œ“e¿ëà]#Êô{ñ±|”Ë´iò,Öp‚El∑‘0œØêÊ;Z´ª4∞–ﬂfÌ, l‡	 ¸>ø…€:"°∫Y±µóoÆ¢…„‚R—™ºX›ö‹SEcœÚ+E[‚ZMS˘>Rõ∞gÚö“úÿ™’ÌÂ€ßhnØ∏T¥&/÷é.ﬂ2⁄¯érmé1Fπ;´€-∂K—*ﬂ|∑6öÔ…öñ˚DY‡‚í≤¿‚bÕ¯ÚÕ°åOπ¶O^≠§‹
ãK
 ≈EkkÔ,
ﬁ9íâ∫K9˜äW˚p}¥¿Ωå/•Œ∫€≈n‚<ûæ÷]ØÕL#¶%Öõb@Dû”„úFÌ-≈T~&%ni¥≈⁄¢ôùg±A~& ÿd,eÅØ˜A™íò˜m“˝QÑ∂Nﬁ…ˇhk£‰Pﬂí—L)GëÖ4N≤N«[a´›__-ÚÛáÒO≈"u<Î8«Ò§JîùÅÌúŒÓ~ÚîÓ¨M›Yá‘∏;¡}ÊÖ\=kWµ‘Î¿˙ÑqjﬁR€µ˜¸r∆m·û∂çµ÷»ÇW?aæ•ù^–˚ª »Öô3LHïE•ΩRÓÊt6Êèüœ›á¸çRŸ∞ìv?ò¢ñ«+<ûãr‰‘ËÒ¸h<Ko
πu&ØÉÀúπŸ}_ƒJ!¿<ßôﬁ˛™ÈÖIÂbàØ¡‚µ<ë‘‘ÛÀ.¶3oLb— Œ–d¬G! ’Âì*ªñΩ§‹ÔzIÜ
GXx©¨œ_∏_F±≤Ω	°
˝3pÿ7Á&WGãgÆ2KUÍÚ´;Cß:ÎÌrà∆°ÌHËúQ-ykçÖëÿÆO4 H—J∏ïx∆øG¯ˇïè‘pµ¶ôÌ6”0R.èÈ≤~∏œeõ(®ÆK)J]K˙$Q^]´Xîª[õ˛åflà]yd]:ªNêÖ*GäãI≈µ‰µö7nÏª˛P,¢¸Mã:Rnå‰E¿Å)¥Å4˚GÅØ™‚n+ò˚∑)–÷÷ ‹q≠ÖKS†Áq—eô3KôSÉW.⁄’<X“»j>ú ∑é 4N"Ì°ü;úÖ∂ó(Òi<û¡^gÏ˜,"∞∫¡z¥!Èêº¶z) GÍ7w∆6¥iaÎõÁe;,ø‹,;YbFÒ6Ô„÷”Y:Ñ£ MÛ—ÌˇGÏn<ì^ô˝~ﬂé8örõPûr°.:Ü7¶	ŸöÈMÊ∂Óyˇ	‡⁄ﬂ⁄®[Éılv{®ø∂l‹Ì¢ÁÜ˚2>=ºSÌ◊‹ä]öGÉ¿Q…WDçRå‰±xnëòT.‘µº«[§·ü*⁄‹Î˝~Å¶~™
?˛}ooÒËÿ¶aGa˙2ˆx®äd—Dii0ƒôJëG≠]≈E@•¥"‘-ùÜën⁄z†‰ÿ‚vCkhéE≥±hlî•ƒIÈ˛÷ÈDÜ©5◊Éàõ¸∏ødËP]≤¨Òy)O¢-´€‹‰—≠j¸p≈WΩúd◊„ ›∆m˚y'Õ`Àí˛›eèaRÂ∫Õ⁄ñ„¡Z€Œ·˝*S-bM/”Ö≠5ÁÀR£ _Wj7<0Rt9ê*T˛æf˚~P≤}ª!ßÀ#◊ëÚ4KÔÉí•◊—àTãÚ6äÙ‚Ù;Æ!HÂÊrØK•ßäF∏ÇıÕwl«»ó»Òﬂ	#ÂÅlÖ_≈!UØ†Ü¢U◊€–é◊Æm°˜&œ=
£•Í2>ˆ®,†™œVF’K+/‘ÀM!º∫ DºùÊt2@Ó∑w»ﬁºxs»"·pFX<€A!`≥(z™Ö÷ﬁômyi&Ü˘_h÷¿SàfœÄÀƒŒW§U≈dŸe®ûÄ!‰ƒ,∞Û„hB±ÁoÚ>fqü.…à%ä´Œ<h)%∂KÜ,Âè◊+âêC¿À#Êc≥k4œÎóª·däÒ~ïóÊìfgóÌöp7*kÇ˚ÜQå±¬X%#óyIW6∞M3l⁄%Àé¬Û—Ω6s^‚Ö\! ñôH‹Êp˙—ï.¢br(uâ¨¨¯f8æê‹§Nô[Ó]*∫—ûc…—bì∆∆Æo¿Œ7´¥ uV∆Â∫äæå%Z+¶'≈cÕìB*ö™*åIÖEUy|¨æŒ.C.®f8Ì˝¸–BlÕv°C≠Qùu6∑á˙qﬂÎí‰îäCø¶ §ÑEï¨f∞G7„¢Áˆ˛_ˇ;VºÊÄñiÎ¡‹–ıuëÓ®öv‹ x›‚aﬁÏ5a3d◊ú∑õ4˛Ó^∞º∂BxEXÆà´âX<E€\⁄ZÎ√pıÏÓ…J¨Ø”´«≠VuZ7Ì
t´tÁ•™<ˇsÌ≠4ïøô´årqß&‡µ⁄1≤IVK~¸`Ù®™<ÛÏïLJ±~õkj˛B%Wg¨ÑïÇ¡Ì8Ü˙,Ô‹}˝^VB:∏Äﬁ»Q±:é≤AÄ;÷zs˚ØcÙj√Í!Zxt——ˇ  ˇˇÏ}[sIvﬁªEÀ∫wÄ∆ç‰p ^Aº`Ã¨döA∫
@ÌvwıVuÉ‡`·7á#÷É·Ö“Zíc_,+d˚Q¯'˚Ïü‡sNfVefefe5r4%Ì∞—]ïïóì'œı;25zÂ\~xtwn™”I~»“[6©"Õ¥+M~ÒíèΩû˙t1jπ&;Y◊R2#`œÈyKv˝U≈˜®Rx‘t@ú≤€t\^“Ü,6∞óEWVdëhêÄ<Hfîù	oË0u[s9üØyOﬂ¯°xÿÖ⁄*âÙ¸·2o!†	[äƒª”8¬j‚Bï“VÃn∑´ìÇg»-‹÷Ÿa’´7óèﬂ)y˝ôé±Äé·rÓdK ÏY5±ÚÚghÜ˚◊Î‰Nú5”M· 8OƒÃÚÚÕ¶_òa<Üli©Ò∆]Õ”éßuaÚô©qi#Ú5/mG≥º@õ|qÀå˝óV+ˇ*k÷,Ø)M]ûóT&∞Yﬁ Md>"∑Ã4 i_Û@ﬁ3”BKùoƒ-ÕªëO´[‹gÁ¡iîWÓß—§ÿèÁwàŒöIˆHv%‰XµØH&ﬂ¶…{’kı}ÁÈQ"¥µ8å·≤¢4Oû|ÿçM#Â∑Ÿ ä›Ë4|ÇÉLÑOóø@h~n≥!”n»˘œx[V†í˙Wf"ï%⁄ÑırªÏFGÌ”-~Fq¬1€QêÖÎœ!pTwâ¡6XHúÀz)∆∑µöÒMITmtﬁ|øÀOmïcˆ.V aX®z≠<0;=3QQ&•±•Ã	åãßÁVí®≠ÚÚ6E˜ @8!ï˝@óùœŸºñ›3C&®"9˘ôøøX"Me	‡ƒ◊”2y=$˘S….’ZÂàtÂüf∂©Ù∫˘:æı≤≈H2–õÇW-6Ü‹P√ÿ∏;·È/|~œ≤ú£,Öà·Ì∆õL:í≈W8*˘•CïÆr∆∑e3"πl÷≤|µLsÂÖˆ€ŸÁ∆≠5Êëç(1›ùñ!ª«t@"dKd«Úâ¶Œëp‘±W∫X¬√Òï/ÍO†]SÏCáÅ#«g¬±[»˚Äÿ¢vØÉπ@Mcôµ:v%I∏S∏26Ã∞ ú1∞ìä(c/∂vÿ˛ŒˆŒÀ√Ùµcç¿Í(!pÊÈwvL7‡ı
ÜêÆF¶ı…4B?=¸8 XIUK,Í'E]≈ÍÂ—Vv öL£A∑«∂NÚÈ~O˚v˜Âˆ7œ_ÈÕ√A7‡∞±Lv¶#;∫%“∆Ahã∆∏«)€[º!∆34=IÜ]û„MØ‡˝dœ¶œ Jápœàb
XíSÊ*œƒ(∞pFZ®I‰ÈqíKcÇ1.ap´ﬁx?·p˚i¥T÷Ÿ^'	Eu)O`‰∏8òéôBáY=…§É©ÚÌw’'Ñ‘^}:∫2aÌIñíh‘µ§ÎU°,ˆ™eÒ(5~KÌJÔ4*:}ı-ÕMx˙†lµ1{Pü¶mdˇå)Ÿ∞
„˝ºˆ]ÜTíK]ÙÂ9h˙@]<ÇÔ˘ı˛ÛÀà÷pîMç%›BtÏ$ﬂ¡K≤∑<∏#éÛ§@dÅe
@5z–,8-Ä»”å≤*£ô{ ◊Èæ4#Ní˛à™¬√ù«ÉÈ9ë"uã
ÈR ÙQîû[^ÈÊÙ´”ﬂ,Ö⁄ﬁ∑nı{Ez2¬Ï.Á∫¬òö„=([rì»v’/ÈfU÷Z'ôæåLπ•Áá#∫U`ßÔ%ŒÌr4◊z±ıΩZè ÈjË›%6Ê˚—∂•©(†ıD}wªjÍn˘•vRiÔ∞•Äñ,†ñØ´åæ ñlO/∂ÃÃÊó∆Qÿ;€ëJªæDíxÆŸïÎ˜§|ë≠+¡8“Q)≈ô2Jy∂vó#Å⁄I4∑&MŸ”Fíπ@Ô˜2%‡ÎqèeKp	ìß=‡çÀsæıÖ_»ï\=qÊh˜€‰h{õo#z˘Ï-åO—O#ûó~ÁïÛt¸JkƒrÉ#	]]û«aYÌìID/Iˇ£‰°€ﬁvsiË÷±˝`≤–´øD.¢º cW=ñ £»3ûuv¢~Ñ:¢	¯»æÄ≠J1Kl’##%£Qd™”∑	¨§<¸4∏Â[≥Eã‹ˆí8≤º#é<Ø®¨dòÚS†aîÔÃˆ´E
ÉJ)lX)∂Ü´PN¨ºOÊ!sCuÉ
=T˘]ÙIã[{ è(Ã‚≥˝¬-˝5[o-Àá•PAÀi≠h54ìÿ/À±!((
ãd Œ™#~ÁbZ$˘„^Zl≈√t‰sl	¯ßΩ˜t;ÿbäG˘∑ïöC@îyfn#ri;ÊV„˝‰$Åí‹`¿U.9Â{Ò±'"G≠»W6íéNBûˆTîp7Ê±´?fÔ‰Sà˝˚"/GU∂êg'05≈„^åÚ≈„«lır≈#/EwˆzΩwû˜#´AªQ˙Vñ{˙¨`ÁqW:x‚1•;º :‡÷(¡%Cı=©#»	‡˘ßÔ≈#ΩŸ"§"#¬.íKHÄÒ√“√ ≤DEã#Ü&<öè	Îgù–3D%â≤€œÑÁxöÂÈwhê†Qpò•5≥;^ùÇw˜˝:’ﬁe¢Æ`˙p∞…4Ê…(?AÎIÃm{P˜Y`Oºè},‰ZYCÒÉüPø¸í (x’c‰ÎCqP
{ˇA„°–L∏Ùm•tá⁄Q o/Á:z/8
^- R˙ú@R
Y÷9·§‡ÂœÃ„•–j4ƒå˚|ÀuÏÊˆ)∑BP±=Ç¢¬¸hP*¸un<∫D<u›Ÿ·	*∞°sl◊√U°´\e©:È∑˜û≠lø‹˚”%<:ìcÃ@.˝Ûˇ—Cûù,t}÷@,t9÷€L·≠7©¿	ÃÇów˘€b≥ÎÒ„≥‡Â‰T7á”bi~~X-∂∆ØÅ◊binvÃjÃ€k ≤ã£"q£ù¥(
Ï±Q?IÖjrñWøÁﬁPìÄñyï!“’Î¢ªEôw’UåÇ/£Ãf¥:‹C©jK.:x@†9“|Ãìhﬂ Ë≤Ó≠|k>\èü÷ÜëÃ´ßÊªÀÎ⁄≤»“G‘êmM6á°<Pa\ñöæ'•Ã“Ö£*ﬂèz†VNS3î)#O≥4ìªÕÛπ’YOñüÏ/.±îN”·t¯,Á÷≠ßÈI:)6Ÿ:‘9ªÁ;fÍ+§ ΩòÎ£eQﬂ‡ÍîπŸçkÛÀ±›¿UŸ·’Ú({˛£≠ê„ázLó…/‰ìœ)ö ¬ˆJ¨j2m·Áﬂ3íÆ«4Å`]´IÛÉ`π¢∏kepÖA~›eÜπ∞≤å¥r§@X1‰în”ÜâaﬂÉ\{/œˇœ(§Hî˝ÕoÿÎ7]ö•_ëR%œnÔó ˚u0çôJª.$C‘¯GE-ú@{¡8ãû˘˙4ÖëŒu{}o3øåT¡@Ø"~ ®˝'Ã≈;O˙Tß†˛kôÇf{däÙwã?Ú$ 	Æ°÷5Ey¨Ae-:¯)¨õ2“«&“òÁ1LÃﬂÈ¥xëå¶ËÇB$õ'JPTÍ¢/Ñ≥:‚îãÏò}Ø≥EΩI›Ê`Qõ‘5|àÆ”z.N9/* Qe˛”á™$â;-‡ÖËr	ºv$8óÄs4≠Oêd`πÅ(”8BÒ=%…#h≠‹T?,-–VèÜR5ã“ÇÕÅ†^%]≥&∑~‰°√£8[Ç¶1Nvx@ÁtííÎÄ€—Yçx ˛⁄¡*ÄΩÜ7æb0≤$FoFa‚P˙´£8Kæ£‡`iµ?M„h{Ñáx!∆ì˚¥rJá.MﬁáÌç©ñØ_ÄÇ≈®ﬁ∂F—ûn°7P„¨75†x–";‚˛¥Nræ…ØõÊ3≤µÍl,≤ÆÕ¢^∆A(kÇVıK„ “}		"9/˛ﬁætûÀ¬÷È•{cä·&}Œ≥˜¯πÊ
ÿ åJ¯–T	€YLª…§ËÌª≈›˛äö≠£«T†4
æÜSıËBÜñ]^†P@qÏXﬁ˙1{«˛˘üÿŸÌÚÎÀw»ƒõAldoÆÉ≥jTç˙ÿ~ıÚpÎ’€É√≠√o‡ü?æsZûgcﬁ#K¿ {‘c¥ËDª.tÈ«Y˚{Üë5C§UBHØû—ã
T(®Ü¯ç¨â^¿w6¸®∞«~îéÚhtê29ÕPt[å&BÄí¶Áª0√⁄‰
…m≤ˆƒCtgUEå“„8•ïûçPùNG«Æsvâ[ˇBçÿƒ≥XZÚY@PÔ6Vµπ"gıÖ˘_”LêV≈È7€oÁhTÆÖtDvkWeﬂŸ˜]ÿ˚´îfûÿ„ˇΩ”XxïÆ@D=Tz´æ!3•≤∫¬&û¸ó2®ÖBH.¥°î¡≠A¯Ça¯Ë÷œx·çDõOq˝Õ.6êËñá>1ÑvèÖyS#Ø2aÈ§–*X~/RàBb≠§ÍÑO"óO∞5û7é:Â,"g[<∫~]†ºà)∑ùS9ZMÆ_Eç∑ÄìS^≤¯å+¿[§≥IÂ3-@ùE¢FÔO]˝Çâ#:–=eÙ°2»–Ujr–˛JŒ`ñYÑ—ÊIöìN}∂ºêCıè‡jöp?◊†·â±áûøÅ’ÑÅ#mù>®à"î¯[*VÜ1öa€K¸˘~˘>EyÕÑSãÄRm7dÿ(=ÿ˘ê(!$°u‚≈EÙR•qRj*1@Xπ#ZÁQíX“ç√»âä÷ŸÛI1Å8ˆ"W®óàﬂ&ìúSaÕH
UFcMAvi†jÿiie	}’ÎcÀ·@_©J{i∂Y)ÕõMvÜj≤Í	¶‰CıeªiøU’@|cºÇ†Z™ÀÜ“ÉΩ’	˚èÂ◊eË2ÃÓ˚,è;ããıwÚ<À°˘ûKÏN_π∂Aá=^◊ﬂl’!LI˚ÆeØÖı9P@¡¯Ø”4ƒ™H¬wp ]¥ŸÁÕ®œxï
Ÿ«¢N¥ºK¯≤ÌS:'©∑ñòÆ√.±wØWøeh,Røøº≈íì©∆.nW'<i»√ä»∑√Çﬁª∞˘¬K9¡7A»îÖÔï„bªHú£Ï#í¸åPrÉ‰Q≤¥æÒΩ“∫+l3Là∏·áAœ*¶QU˛™nõGYS¢Uõ¶¬Ä`ï+xﬁƒ∫&ò}¡d-ÇﬁQ¿£˝F#d1öûû°8?ZΩLÜ◊rœXQÖ°-Ä<2fV\,¡c(a$k!Ô–€ÜŒz)ÆÛ,rÀŸ˙
SC@¬@ê≥&y∆›S—˘´¶CÂ…V/Dg
mf¥∑1§k¨∑ãxø»%£•v4»˙øZ`â◊ÅÖé3æ˚7èë7⁄ƒ+è£ÔÈ$Bi.GœZë≠ê«	˝\"ø
K»«ÃëPh˘xõdq‘‰S.ÓÃÕì˛Ñ†ôÃ’!è8Öˇ=A∂àíIù˚p_=∏±˘;/øy˚ı€ùÉ√›[O∑‡MÎ´î[d<¿bq“Oc8
≈I÷«Ö—≥tòµ}7∂¥Â—66ÙêF
õœ∂ÖŸ±G‘ó8{ﬂKG£$ˇ:A%ª≈ha@?Áé>≠ˇK∞V∞àœhÅø}3∞»˚9;±Àf€â˝hÄpõËì\òd„ëô%¸à ≥s:ÅÌ ÙTÙ2¬π7}≈£/ZΩO ‡åÑÎUE¨uÖÏ§|1A4¡ná’‰ÿIGh@¶æµz l¿à|•4ÇQTÙ”qt&|æπ;:ÊÆTûõ{ˇãdGﬂ•Ìxáï¬]àÔ„9l·(‹‚®¿sg/+:≠NX»MùvW¡8l”†„{-8c¸±ZÛu“gÀ¸=–|â‘ÍÖhπ⁄d/¢…ioùwÓ/âœÈ®CÌÁ‚eÎ´ì⁄ç_§Ò‰Xª◊Ì∂xÂeÂ<‡	‘*∏°÷ZéGWøª˙«$TL4CZfoÎ2ÍíÕ£&.≠πó⁄€^BUÇpa¯Eñ'ﬂ&9m‹¥HqôÂ,Uëﬂ∆6ß_»R…≈±@-:<lnt:ä˙øäsÿôÈà€%t‡'˝”2>çE}bê ∆¿9§ÖÎ`Ozƒ`}@π≤≈°˙:kZQ‹Åû¿^Z^eﬂ-ø^_]}≥`±zDÈuì=h%∆cõáú≥⁄◊›R…˜üóSs‹D∂˙péÄWm6i◊ﬁ¿æª^ÅH‹_5#øk©<ÁYüé‚ø?îû’2–&TEìsÌÇˇÆLæ[˝zÒ4ä?M
ik@®àØ·	øº0ñ¨?¡3ƒ z=ı\„U∏(èlF#R§ŸÛÏ7≈ŒY_˝=B3-D”t…2¶ÒcNüë/-sT∑ï+ì∂áXï}æ.jaπèŸ"ˇõ<}¸#ÎºÃ@v6]\˝m÷≈»ÑπN™¿_ÊE?+$âœhn∑≥Ò}f≈hB†¸gò™Ï˝hêE*“»g4Y≤˜˙ÑqΩßœfõ1=Æ.‹v€<Âußÿ◊˜3ötë¶†œ9ñY¿Æ˛G3€ƒá[â˘:U˘Û\$g^¿‚ÛX#ƒ£9ÑøÎãXcÀS¡úÁ>Rê¿´íÛf©•–Ø;X.•ª\Ü˙¨^/„#SÄWÍev∏Ï>xûéYÜ{S™2≥3Ø;¯^¸ªA‘3WÓ˜D≥ã∂6Ú«a	G¢V=[™J¸xë6aª∞>ñø’ùâ¨e˜ty¨§Å‚5$À2ó©•øJçN2≤Ó¬äûFCÑÖ ›kÃ£ëˆ(æöùâ:Lôƒ.G√/)¨Ÿ )A∫0&8Ä£öìì °|ü≤∏,¨b=H’=s®Z·€eÅ‰É*i’Ê%,@Ωº˚Q∞USsÈÖ=Ë«å©è∞úıﬂØvClΩVç£„ækT¨°"iú›|…+ÙæYº∆ë¬|ØfŸ	˙D±X8=ﬁB‰è˝∏üœ∞Ïœ†CÑ°çUß»ádL[ë1üä˛õæ® á˚üÿÌãòDLI–%hËzaµ ñ)ÚOïÜ>›,yÀpo.?>¢â‰’0`#- ¡úÆë&o¿ã¨Qd≥Ç628Q˛‹ ~}«jh‘Sƒ¯‰éÈ‡é\ÒBH≥áüËâØ(»ºÑó÷¡°ï?9ú9¢}†›}åp§»Ãáïªju	I{ôªƒ¿6◊eÔ	ŸZÈYÖg›e+¨≥Í˚ªW˛g˝N∑ÎËEC:4≠%=” ”X;.ù8O2Wºé
rßd.n|(3A™Ö√˚êﬁ\çäÏÃf≥¥3Ä‹»§¨B…"Á´WÄ†ítñÔœí«’&°Û«Ëùµ2Q∆çÃO¢AˇÍo≥ˆIe«Ãyèkµ¨«í|§'∞¨WWe3\h;Á2f„íË	ö/í7ö„Â›í‡81"bfÙ4Qû}nlIo’¸î¢%&æ5·+KFKªzI›ËåänH∆äΩñ¨å“Ω™¶dPÇ≤2Æ;˝ÅÈ;ÂIÁΩö¥°Ûb-oÉ}˝ıÊpÿòΩ·ì$(ÿ	–≠`t›÷î ‡-ÊàƒúÂ	ûO4ÑnM5)3ƒ‹0yrS≠œ´J1m±iÍép/Åı3‚‚”Õå¥b´Û(«®OÇå“úm°jRãŸGæû≠55	ØtnjÌºÂ˘ ˜1•y\HäÙéËåÇ}’Ê'/›◊ÜÉX’ºñr~ˆ© ˘ º†∞üµìÙ3ªòü}é2æ #ª\V»ÚØØﬂ`çô7ˆG®H&üÌçß≈igëkÏız@Í≥2D≈Ú∏4∆π÷I≤íPÖÊ™Dôø‚ë’µƒXIÉ?™üõ∫ë}œ∫FˆQçãí/âa>Çc≥…S„◊NJî–ï˚@4¯´ø˘øˇÎ/ÿÛî*µFõ 9"!»90÷!îP`0„¢ÎﬂﬁZÒ-5ßÃ‘ú≤œWm*è˚NˆÉWúnj¨?™NﬂõÍTπX?û‚Tæ3®~ZÄ÷Ù ;Ü˛Q`É?uç©öîòaõ¬‘∑+L˝A
Sˇ
ìÅÅl<_VÆ≠3ı‘ôÇu¶˛MÍL∞øu¶–¡|Ç:Sˇ{÷ô!≥~‘ô⁄Ù-@gÍæ:ìÜòı√Vônh®?jL◊÷òÓ0≠ƒå)Öx*Ã‘•ŸŸ´8?ÿ$˘d;Õ˚ÉñÌﬁeç5TU`la∑N7jO√˚VJ…<Oá„‰;y Î’ún‘e≠Ée√–5Jÿaa«z'vzı[^#bETÀyÌ¯Í
.AGyUaÖj˜‹	áéß⁄Y†uıØ~ª=@‘ÉL<n÷:_c~r€÷zVÓcXÉh4ø «∞óEƒVùtÎE ’#€µçÔ–6VS˘FVj›5Kï[Y°E7ôn‘QÎkˇ˛˙wˇõ·⁄√DÀ‚Í/Û„´ø511Ï,¢F∆Â˛’æßHn!r≤Y@/:¿ÍkiÜQ˙2N®
 ~¿Ô*€Må•∆Íﬂ≤∫øº¨Ó¬eûßÂAÏ÷üËGÉ"·!⁄ªÊ‘ø¢:qÖ˘#&tbÖh†ä›F–µU¯»:’Ø\‰±›eßÑŸ§oﬁ/äùPÍ<V:È$Ê€™ÙR9Cîf∫ç‘>…ïoQø]¨œßÇ8À˘Jcá1ΩbpR>[≠≠ãçÚ@{@Y;g¥∂£®åcE7@ÆÏHÁX¥Ó2T.[ZçwŸ}$cOéÅr.„™uÓq¿u¥íefUgt≥ÉJƒ0e˝f•Ã%?md∑Ã≈úÄÜ˚T°Ÿ&4[ÖçΩ§¯ıî∞≈[ñ◊-È\Â≈∆·+ˇ2y/oA˘ºs¡z=Lõ|PøF®ñ&÷‚ÊIü=U¨Êì!¢;'"ª|‰ +kíU MbIí∆y÷O@Ø;v);ò$„éù<÷%O1€ç˙L¢f_´ıŒ®î∏Qﬁ]ÀVq+§£iîKQN¬Ã‘,™H©@Ñá»'}¡uËUÏÃÿ1ÆcŒfpl[˙˚¡Æª¢v
rÔ√^€a5p÷∫ŒÜŒ˙÷…Ú0JÓ¢÷≤|≥§≤¶"ﬁjÁM*Õ,À8◊Z¨‚çû¢gXBŸ¡ILïŸ:{*¢∑rµ9r_·jk›jÌ¡vu´5˝um≠E›j‘?œ´⁄·∂≠Â÷ﬂTŸjáÖ‡fãVœ∑¨¥—⁄tÄ¯{oAπÁæ”WE7≤m∫±›;`Kf˘[¬ˆO	lÓoÒÆvÕÁ	®Õ˛¨º…€∏ªL∂´¬@ÕOù/ü.ø^øó'√7Õ)ÅeuRGm“™X¨ÿÖ«
Í˘]ΩûÁw›È˘•ÀŒ.nŸá"˛FY¯æÒ’ç1bTÙ˘º0lÉ0÷{dã@∑Å˘ßΩ∏]ˇoY¿Kè'1rÀJ‡1º‡◊h)ŸàEïûp!JTısYÁƒ≥ˇMŒånè“#•xÿõœÏ∏Ê!¨æ.Ê˘‰Û~K˝UdÇ≤˘	(0ây‹3æGwë∑ù”®ÿ„è@∆√èû-¢AúmÁh€¿"¥/ßh≠Bå¸˛müˇ–mÓgB•È!Î¯A±m¬ıK„M™D∫ƒF@G¯≠woGÑO8Ú¯]Ubl—á¨IŒsU∏Dÿˆ—Ñãó•O}—øÕá≤pDf{QN´˚∫ﬂd'H¶”<C`{Ó∆Oqä!˙‹O'ﬁÙ8Auûd⁄.}¯ùàH ªE*Í8OŒp˝P≠ ;‚çﬁƒ}±¡vÂ¸zÔUúœ˙¯û≤≠éˇ5º®>ﬂˆeÅ9ˇSQ√!PlÍk¢îqˆ<}ÈäÍ†Àoã[µÍ±I>ı>’ ΩÓtKzâZZÊ?-öñ∂I⁄~}í$-ÌÊ)⁄cK±?ryç˙›éH'·%¬¯%õ…⁄T˛ 4z«0√ú@scTâ"§¸Ñi£ÚﬁL‡·“HÉ‰Ñ¬0ÂÓ6Yvîß'ï{Nœ±Z0Ü„4íão»ö@ È]4⁄¨®ËÑ1<åÁ≈¯˝…4Õó*yƒ◊f$Æ5∑ratñËW,
¨wÄÆFÑ¯§/0∏@eöj∂6!¢#ﬂ¨‰§êí∞	ƒ›Oì£â"§Hf€|…∑BÄæ√™n4AÂËWSÑË_á√îâ<∂ã«õKêü•›‡8?ü\ï_ÉÀ«ò1Z6E#ŒØ<á\}C+è√<Y'†™r[õäsÃ+ã™•âÎEÉCgJ-JE≥ˆH~”™055ÑÚà÷~1C3ºñ„€hR5ˆ4)Ä◊Xk>¬}ı¢è¡Ø^¨ÆNCƒÕwq√AπÌ·âj`óyàÍ˚&#‡ﬁ\ÇmÛ÷É˛L(›Y{Ω
‚ì÷BnV‹d«|…+≠…Ó5ñø¶]h:|H‘e’ìïRëkÊØEÃ1ÔDÙo=®O∑è´?n¨*°5◊•.Olrç˙t)ñsΩ˙;ö¨ßi1ŒFWø?Kõ-iÃºftKÎÃvdJπdÛ#˝9”ïbW˙∏•Ñ\ôÙ§FS}Dj™Bæj¥ÑÂ∑P¬›Ç;&ŸçíÔEID∫Ï˘IíQXSXƒ˚,œF˚Tw«c…Ÿı˙*W´ñkﬁÒªö˛ïç#í§å∏FP‘ »»Ê‰@1{¥ÓÂfbÀ˙òÂ∑k´¬s‘89MG⁄ı©h⁄%ı∞iQ⁄ê%=–3∆{yÜ
6âë$≈S˝©ÖÙk∏©|w{Í∑ÆÜ÷o]]ê°<ÊÆVbΩE≠‰ñ#ÂÅ„ú/á*ËGl)Qt◊R¢®°eoSo3÷V5`[Nå´‹Îíjdö¢YSZîk}Ù‡ER—IrÎiî'≥Ãe«õâÆDBªM‘.øÄ‰Œ≠ˆO7®·O∆˜Öú[ˇŒíÎÃ(∞≈QÃÀì„*÷ü¢Ø˜ì„K6àéíb“Çû˛≥ó2“„	+røt«‡XcçÜñXŸ“&”ÉVtÛ Nô5◊¿üºNgè#=≥u]_ƒ\bÍ∂wˆ‹v$-jÍ+ênVó·Ó˚ÛﬂO∆ÓÕyÕÅ∂Õµ∞lı∫'ÉiÆøåÔıÌd¸<À~5_π≈
¥»P˝f≠íí[ÖHT≈ÁÇÇ%êo»
∫å bS6^˛
&kﬂ‹[\Ï(πmÆ˛:íú˚FˆæÊÒfl´d›#ˆŒÎ=ﬂ°–<`ô∆0y	ˇ√1
˙ı⁄É†VÇ«†uˆyÈºsˆ±ÚÔ]ª£US¡ΩΩW⁄CôÇÜ˚d_∏<ﬁ;á"ú≤Î97.™É>ìπ˚Ì∆-\ÇgÆQ÷ñÂIîÊû%ëÆ’k/àl®Â®ø≈yƒ,~bEÖHÕ x∑h˘†±ﬁu:%`)ƒS™Ú∫…Vó§ﬁü›æ¡Œ‘'Q»YT_s?ûúßìﬁZ©U¯p<ÕIöÉGzÎwa√—›¿vGØ¶ìEwC f(ÉÓN”8ÜÈ¨Rw¨œ∫≈Æê‹À¿gÉÄ∞¨∂µöPiMyΩNgJuƒºë"ã“¢Ÿ‡:,EiE€ØO£	Â\æƒäŒ”!˘å^Á!Vﬁ~˝É¨l*t/Î√ŸÊA⁄®∂˜û±Ü¡ÁŒ»ÄÖypIŸñüQ*}ﬁ?—∫ªˇ'ŒnÊ'ÛË`~‹5}”8ä›T@æßkÀöƒÄfYy]x)˛¿ŸUtg\_S°VÊ–Yå—$bª);ˆÒ2⁄-ó◊›s^=z˝©Ø⁄j?® Ö¯ìfæœ“í”<kbº∫‰ôS^D†Ù´tˆow%ﬂQHÈ–J2F‰É[>•Üd–ÈıeT≠πñz3Î’6ı∂ÒÏö/ÏE¿KáWˇsîfMg/≥ÿ∫¢8Ê-d–¿~ˆ˛∆¡[q*í÷xÒ∞Ñ∏Û£{Éi°–∫æAÆ∫VQ68Lﬁ≥n<!DŸd€Q<ﬂ˛m∂qwµ∑∫
íÍvjÖ¸ˆ˛]¸≤a≈º¶KÔÿ0ÙΩ3^bi|N;∞aleò‹_Ø°FA>—D¸§^#Syiñ§Ωä$X'ÛÿıÖ3âKpßqO!™ i-m:FëQ€òí%∂®4∫J†!HπÍ(5ßÀË)ù-IMÀÕPÁ∞ ÷hëù÷8¡ÕE	kÀùç(ˇP? i„ëpùêâ”Ñ∑¯Q’¸§vñµ†! !õ/ıPì◊•õ˜ÀÎ?0™±c>Â…Në⁄<vç√È∫M∂≤çÅXUMÁN◊Ω¥3J)˛ À9Øéä$?ãÆ~wıèI£Fè≠Eyyg,œﬁ/∏„'xm´oaË3Ô£§YP≤YëÂ	Ü?Û(fw
∂∏\™6±a©ó-;9–Äç∑r=‡UÁmø…≈Ïuÿí∏KË&ﬂå7
Áˆü*É£Ì´ó±fÛl¥^ó¢ÃÖo8Ã÷O8G:ãÚ4M.úúf≈d¡~|ÉÜ;ûÕl¯Hóóè∂y’Î¸¡ 7ì™ç†H˙Ÿ(ÜÖÖµè2Ë~Ë^:⁄bg~Ã_$£¨`Ø∆|;Â¶óﬂ8ºU√t)NãËhêƒÑoÖ¿ §^V>
.Áúﬂ<#4€√!DÉ3¨;Å∆GÁmË=øl«QWmy+Õ©*n|ï˙Ω-íÑÍˆvGvCï^Ç÷†Ü˝=ΩÜ”bÇË=™-’ﬁ6"Î‘À1vÕ’≥
G”V˜¡
-a…ÃJê∑Ç≈√ª¨≥”QÀq˜˘/0êc†ô<°1^'?∆jÂT›ªüß}xt!∂ü*§Â—;Üì%“„(≈§›tTLáà ƒÄi›«X%<∆úû8è≤ÓP¬¢’æ›ÅN`ñè÷.5QÙ€38TìoÁˆcRQÇŸjÙ”áâõË˜Á”>®»œ”_cud˛NÿäÉ^∆N¢◊›‚©ÒNB^öàuí!ówpÇΩ,AuÙ˘Mÿ÷ËÍ∑É¥†5•˛HÇÖa¨ú˙kiì’∑ç@@œﬁè0¡\{B´/œ≠ò∞´<«∏èbÌ1^∆¯[›ã>†ÈìrΩµm≈_Lè$a˝ıÙ[˝ë¥x”Ûa/J„‡.√€iàè*o¨7ç*4Êpc“zÁñ˙"ò<•´è`,0‘‰ä˙√&CyÁ("V[W>bˆv◊Ó∞t8¨Û<E–“lÃI[ë‰Ÿ≠uë∆+|íO)¡ﬁúx2Ñ‡†_ø¡∞]ÿgIßı˚Kd"±∞NLdÉÒ v±;¢/|¢Gw]ô	-ÈRÈ⁄7£tÇ=¢«¯üÏ“¸—–ÀmW^D„◊˙olp º›_Op°Èvî‚a‚´œ?„ü=A√r7ıøıÊ™Ó≥/îﬁ˛ﬂ†ﬁyπd•UmÍ°§ñ«∂e˘ôr√¶ÂÜ?˛W:Yœ¢4…¥(PËX"Ê4
rA¸W„ßlç¶ £ÿ˚	”åÕdT–†"èßyt<ëô÷Ñ<Åx“E?OIÇ=˜<{/c¡zã[¸"ùúvE∑∞ö/ÆTËcú£”Z>®å}±kYP@YÃ—?∆[≥í@Mfe´'›√¥3À˙∫ñﬂî[At˘—Ñﬁ)·7¢!®cæ—∫vßWº¢ô≈™Ñ œ´ÒNºÕ—|°æ€ÒluL ¡ó€Òµı˙„<&≈©Ωü–ˆ%ÓΩl6\tàJÚêü˚‚©GºvK≠—˙π[CÂ7ëù)ÕYS…√ÉJQ‘‚E}JQ†í9\ÕUËOwWÁ/@O¡’ó‚ö_˚¿°+œéôMO∑…l·Rs)nKÙ£ÍúT#s]µÀΩI.ûDÒIRÔœóz°è*iWÀÍ◊∞⁄ƒíê˝¬e£¯â9 O¡wá!É:l]ó˘#§b¡ ÉYÌπ™Pz&JÀ{IõeÙ;GŒ}ëÜT	UM)HGèÿ˛Ì#π#W€JÃ?o˜i@√¶∏ÿŸïN◊™8[-ëÆ∞P[°'äíµN¢/≈ÃR!ƒXù£A÷ˇ’¬#°Ω\˝û´/»¥‹‰mæqf- ÛKuÓ˙àW∑™O~âÎ*-ﬂ.CÆíŸÆ≈XÁB·’ÂΩ´›Àüv≠ke∏ﬂ’jGñº÷ìr|ZTÇ{+÷ºÍdÕwMŒÏ3∂∑«‡Ô:2_:>Bøz2¨9¥-Ì∆vÊn∫¯ˇÛËb™Uo…±:WÀ≥ºá÷bˆGÂu∂∞Z›’o'iﬂ¥âx	$h -®§W:È\e¸D~]BvKV†tv·’-Öêçﬂ°Dÿ®A6óø£’»)´	∏?aÇ£{ò ï‡zıäËGóı™ñƒ√“/Ñ]„B¯≥≈√kæ3Bq¯E
·Çëπ)5€|√‹nk◊wij|˙∑z5·/5EÜÿãt©(íØøÍ›)d¢º≤∂˝˛
C‘”˜ÀØ◊Ôp®ãmn.œŸEπÚπ”vÏ≥rúò πΩ^ ∂◊qÏ¿∫¥qœ–‚?ÓìuΩ«∂K[≠/Ñ™¸
≠!	€ËIÀ≥P)<roÊ»•h|îEyº}ö¿k‹GØ&Ë¡·´/‡ÀJÏ≤•´ﬂ’qﬁ9aÃ„¯%9”˙*ÜÉyüΩ·á/BÂdÚù;çh…ˆÉ⁄4ÄÕˇ®5=\Î‘.ô¥….âÛ•ç¢—’ÔÆ{‡ö#kBÕ-ú˙»úˇyò9Áp
ö0Ñ§µñ„ëQâZBDR!UOôT^ŒCnz40m¨⁄z÷π⁄ßô¢Ó¨–©*„ÇXnª–∆·`qÎ^WA‰#Ø€dû¬ÓåÚÉÙd‰i†^∑‘ï
[ç=∞TË˝UN#¿i£¢$Ãpßdm5™ ∫`2Ú’’–èt´¬Ü«™P]»˘M„ukˆØN_@¡UL»√>˘µ–Z»„êÂupCw]∞5z9ó
Òùlq“Åºœõ‰|¥10⁄Ü›–0Ùk«¡©≥ˆ=äò7\˝6OE°¡*¯ü{iI,∞HñıÌ‡‹Qé˘V∆=Æô∏åzïà'Ã{UÔ_fgôú«™‰Ï´úumƒ6OF±KF¥<Í0(–Ìzv‰Œ¡ˆ˛Óˆ÷´=æ”ûÒ»è )πƒü5Õ”Ô"í1∆≤å£Ñq”∞üÛÛ%˚®˜’P\Ô4f‡˝Ú∫ƒ6˛o∑ûø⁄7õ∆yrúû√ﬁΩmMrí›ßpÛêq“çfπ
ì†Ä&∏°1≥ÕFXà¬		√Ñ‹°à±KïÑømW?9ô¸q”$À%ªÎá'äØÌP6@Qù<”∫ÍˆQé85ﬂIÏ·ÚpéÚã÷√qô€)Ê˚	Y⁄0≥o@z\Øk÷øç\Í)u™í·˝0'eFÏL˜q: ÌºˆKŒkÉ])‹••óÁn1niû¡|É3§È˛\øû∑NﬂJ}ˇ~gG—à∆mπkMO¥Ùv∂Û£Õ¡1Êèl∑	≠É¬◊lA·÷8 Ä®t˘ˆ*&[µÒü•£ìz˜◊Îoò,„¶®ªuLπ;F°Àª´Íä©~ˇjDgW√±ûµN∫√ºŸ∫%"g0ªkj,k^˚Jëœ/ª•¥%T∏:ªY4=O)"ÓcÄÌpú1Ñı‘àx]^fE6åPB5 §…IÈF{f(ÔRZÊ:ã~9çyÕÄs–ı`Œø‡aƒ›™í "úÚÄª[úé“~∆›Óh^E0·u®-¡º˙-"w¢
ÁUE∑[ïñ>K†œ]#ájìﬂaŒ¿ãqXÿ√lT”C5¬ùÛqNë5´ãf°±:ÁhÓX#É.^/n#Á˙√¯Ô¯œOÒ?Wˇ¥¯Ü¨ÑG∂ÃbWM2ü’˜Ü¡fî—anOA¬ZÁ»¢yö‚°2˚aû≥ö£<PJ√€∏œèî®è†zõt…@Ih.ªZ∑]´7”aˆøƒøèˇ˘äÊ˛?bsÒŒú¸j"›S∆n_q˝Ñ|uñ≥ÆqeÌªÄ÷,M-^æ3á=◊uΩÉ´yˇsˇ≥¸[÷Âô´∫ÜkπéˇŸ¿ˇ|Ò[’/˛Æ™}ôÇéÂ⁄rÑúZ°3·;≤|Î©@4iΩ3'm’êLm”uùÈÈ}í”„üìﬁœ…√∂s¢fi´z–™¶â 9toÕjˆ9xÿ8È≥ûØ+;iL˛Åÿµ∏iÂdxu€,ø¡öcIƒ@ZMï¨1sã*õÒlì,O≥M•ö⁄ !ªbå—CFŸ∂:B˙j’∂lp™US√ê¯~ßy•=a]»t4çÃRl†IQTº∑≤ö¢a…íjE4=%∏ñQiy¬¶âŸJ≠Èπï¯´ø˘øˇÎ/¥ÇvFÌ´éÊ…€`ñ‰ã"UıÛ«f±◊˛2/¨˘eôé2∑!∞≈tÈÑkv±»lˆÇ¶æUa∏jU≠á3T1
Ú’#I,3≠WâækõÈm^£êØ¶ÏF© 4%øº˙≠•°≤	»8‚é*ÿD9Õ&éÒÍÔG˝4bÒîß+SÑLR¿ÓÄEÈ≈E
˚5ŒÖº‚ÇãpW™˘(Ç6´˙œV≥{g}ªœ˘D€∫¢à(ô±-Î∂>iË4ozËÄ‡:ZQ	◊#[tFGù≈Sz:Ìgˆx+4Ø•,("ËeYÜ®îAŒìSRπ#‚œ¿Ï¿øX+Ñlo{ÇX,Ü.ØˇÁFu7Z2¸⁄ı¬?^aÂY*Ö7÷T.®¨Ê‚VSnWJyÜ: 3QˆTPû©|ÚÂ¿}aÌ°L◊≠˛Q)µm˝Ô	’z› °∂,Ú›ûN€’ˆû˝8n√qcÒüÇÿ	áqzúÇ¿ò6Î∂î9Ÿã§flTÛ·Múœ^*tV◊Pç–Pb∏ Á<Ö“˝:E5ßÒE©yÛ?+¨+T¡%ﬁ◊Xknƒ≤©À¶Öx¢‹.ó’M•F+@¿ıvÂVÆœ^¿í!Xﬁ…+≤<=fÔ~>≈≤vÏÈ’ﬂ!Ü6“œ¡f?π≠ﬂÌK&«Äµp‹7Lá.[∑8óçWòO5ΩeÅ¢ä“Ô†U©≥¬û%˝”àã£Ÿq≠|pR—ÄZ îR)^uÔÏÙÚ4
Â∆å∂mΩ⁄˜Èr	Ív∆ä¯qøî–œµòz≥ áQ/Üõ‰…4ÉAë~3,-wú±'Qæ…*s;ò—¯Ñ*Í‚ô·VæÃgHvÉ«uç∫j‘æPG`ãp¨∆bL¯pìál)êë*≥µJ»Œ˛ı@Ã/Ÿ)¸∫~˘>˛s
ˇ∏!√◊»pDußOà?ı®Õm¨ƒ?¯¶ÄM†¶‹õG™B¨ﬁå[!X¿d5≤uCÿ¡–Aä√„ÉCwè8BÑ4∂mMpâΩu‹òÊ≤opX4$ÜÜ¨À¸äí2—€cá qÙ0 ÷12[úìK¶íˆG◊÷$
è¶/°{›NóÔÒΩÒ%Øöl_ñDå‡zÍÛGƒ“—YZ§GÉd¡ô%QEV›∫•5‡z »V¿ÁUÛmêS˘c€umß≥xÃ†ƒùçeyÿ QmËl]™ˆä»ébOÆM√O„∫∏Éó'8ÿ	˚‹ƒ–+£TK˜¶dL0∂~n≠´)˚3G^¶s,˜±Ú2˜BÃõ$¬ì(«Äæ‰iZÙ1œË[
æÁ RÔ@ÁŒÜËA©Ñíˆo≥€ı˚˝ˆÒ. NããóÙ/ø5+ãï˜»B*Í;¥{U$ﬁ¶|ôs⁄1ÙbX.«√Xuw†ôXó	∫
ÅdDr™∫>ﬁÖ!Ñ¬.h°fK˝öÌ` ÔXy iAs(]¨xk≈iº§xû–kêsEË†§≠bäÁ9 sË
uOeTTõlÅ[µ√¬<x9ïZ+ú¥O±Á"£ƒ_„L òNù=ÈŸ™
s@p˚±Ïk!ﬂÓÙsVz—˝Êq™q/ö}ÓÇ<g‰¨¿—Ô¯Á∫«0◊rˆ∆ëÌ®‘Äˆ}≥!ÑÑ“cÓq°'¥ZCìPl-ñ-%(÷üÊEZBñÚÃëûÈM£t'«[*&¡(?TÉ™∂;Ó÷®7|¿⁄N∫ÎÛF√òD∞q∆È'É¨OG›Sy¥éJÄÍ~RWø?KË}}ë•ÉÑ—çøöd„n@"ì»Z
VeÚ?g‰qÌ0-gB≥Fó÷;GﬁΩG∑‹√êè—D*∂kıLfE”¶Tzs¡¨ï—6ù rQv¥∂Ï	g84ØîÁ‡9íÎHékc>”h  ,®∑PFhgqëÍ(òÌXqLãn7nI›Rjn@–‚å˛q7è“GÅÔ‡z™“Ó%y`⁄=Æ^è˝¥1)º›‹ÒÚDüÏ¥ÒÓ]k∆ˆoœy Hè˝tßåwo∆)„U∂»TÏü5ó¨Ï∫ÅF*|\`™Ù«(√?Ï‚¢y√˘*¸ˆ+}„‚ı›%∂∂
ˇÉ◊Wﬂàb|˝I@%>è˚Hø(J⁄l.!¶·a4ﬁn™.Î¿Òz,5’≈€GHÎEHÍ~Ù˛–,O˙vRÁ;‘‹œˆÇ≠ ^¥€[]Œ≤ﬂJgµ“ΩaÙ3Ji6m{qh6Ï˛†˘1óÜ∂NLç;† m)˛Tó#8‡ê^û 
Ω|∑Êﬂ]k.ÁØ{…<≈‘Àã∂∆O∂Z ≤Js!7ÎS|h*íË≤3_ØbbH±√
È¬q√0=ºXuΩÇzèºı·Ü+#ãáò_G£Fykt≠ÿZù£ÃØ·x£
Öpv¿K~ä⁄é4$‚dïEPÈç'+˙ùÒ„Ÿ’9óìÈıW‰õAÜ¢Â‡4É:®1≠fíe^	ÆB’∞ˆﬁÂWs™—:ÅË⁄Ùó‹Œ‰t'öaõM W≠8±
f0W¯>ä≥˜ÀÁEò>ÕFhèÿ*qÚ#m5\ÿ\(MÌl.3dsyû«M”e€ö>€g˝üæÊj∆ä´}m]¢©qO;Ø…†Dòë¥n–âfíÁ…ÒÑÄ¶ø…v	«∏ä4xöL¢tÇÎ//3∂Ó6E‘‡éµì¿úË/‰r∞Ÿº|m´ç«ƒb± €W4ÉäiñØ‰wÅ≤SñU”|¥V‚Û≤ÎvCÿ'¨	`î¡c–ùÂÚÉú>ãØÔrxcó‹aÈ©Â⁄'õ∫Aù—¢/Ö’fo¢!Ÿ©	dH+Y^4¡·Õxí⁄ÙËÏé…;´Z@"éﬂ™•k2Ø◊Ó[Q®C†
ùC/∑Y¯p=#6blN+†±∑Ω∂Æ¬m¢kó*NÅb1≈±™·a„˙≤^Eïn_U ”æ‘“g¨}Qb¥?np ˇ˘ÿ†≠„ü∆ÄR·ç£°˜¥¶¶j?©a]¬q\
	√Z≤——÷©Åﬂ√s˝D¢ﬂ˚êµÂè»¢◊Egui◊∂~Ÿc˜6ÊË—`®j‰aãw∫fòÖéÈµã;›á2fãöC©N{—	Vnø{Ç∆Ï∞ƒ±©Ó~Y^â®”ÏT4 Çå©H—≥,?¿_1ñ≠£‡ Ëo~CäxvÃj?b2∆Ë5√’J]UÓÍv…xÜhàvUê>ÚÚÉ*Ceíä	f|ØhÜßØ™XDÃ≠§˝d•#DÔz§M*Î#YÌﬂfKŸ∆ú®-0$Æõ–&^Lìtt(®ß≠ÒÂ«◊#ÏQ›≤A„E7´l‘5˙VµXn,£å∞¢Rê˚§â°ÿçî¨P∂ß[lÁœvw^Ó∞A£a˝d tÓRPa^|ßÊY2X‚©˝…y0Ms+B2Ω≈‡U¿~Ãå ™ó)æî¥Ú<- M&
W‹ªrÆS6¿˙åÖ<˚e»RÆªñr·û!œEÖÑ¬«]`"m3ƒ›6ÕÖÉ¯% ¶é±p–ﬁ÷üøÄ•~˚bÁÎWOﬂæ⁄;‹}ıÚ†wúé‚NÜMe=,Øåf¯ﬁ0ôúfÆljy5V(PVÀ]≠',Æ´*H¿j6~‚›‡$Dæ≈∏o•¸∞òÛ«ΩÊ	˘¸≈ˇpW	P•‘BÂ(ÏÚ±U6jdV∫U≈gx˜	¨˜Ø$à6:ñp,j‹S Ï&ôÄÜ≥<»˙nCæy	√˛∏áè£^dáŸsl·©hO8ˇËÜÆ?ê’∏jNÄ ﬂ#ø¯Êeg—”à ◊‘>fªEf∫¯dc7Éºå¸vªSÁeÜ,˛+ÿÚEJ˚ˆ#L◊% ¬O¯⁄Õ™øó0Q„qàãí_éJ1/zlÏg2—åA≈Mú‹¢ú±fVa∏œ ≠kÎtNK∫@Ci∫BTZ∫oæ6 fØ<Êƒx]˝UÈN`¯ ø*oLÒa‘g-\˛¸¢¬ˆùË}î¢i5{/ê^:ÔvÑ‡í-Â†24>hÿ¨s€≈ªèﬂÅ∫‰Mn∂^+†@bœ
^O®Íÿ/#&d2‹√˝¥à`´Áÿ6¢« ô#∏#cª/vûÓnn·ø”Í’ùº∂»XD8àçõYôêπ"rI„dú•EÅ~¯?Ëb[±cÃ‘dÆ¯b˚;áîı1≈5#Ã(*+ß,Å÷π?Ú,Lò*BŒ–OÚƒ˚ùbw††˝beÄVÔÂ∞>(∆Ê¯“àëgËVXî`ô2åBÃzHPYmY˛ ñ'⁄¬∂S∆Cõ§€Ç>™c§sDm_(tﬁVÃ˝gÓ¡¨õ9ëÚµm⁄R'r‹],+©ÈèQ ¥Ë¯}ãw–.Øòa”ïìöQLrVì;?ÊïÔß√%<…ˇ?≤/ú¢¬◊o-{¸^ngxàÂN·x>Ô¨Í6ûK¥¨˜q∆WM¢	úÅàË1ı|íƒãÏ7K@â˛ã|‡¢CxÈ8ı÷ÕÍ÷÷Øá>Á:¯é‰=C·ßÉ&•›ÉWd{≤#88ÆI˛°ÕIPˆ‚ÇŸ%ñ‰9l»KÈ‚«√taPVÔ8œÜù≈3Ã>/ªΩÈe!¥à„ÎWlVî•^h}{+⁄‘Wøu[»6”≥$~K{›÷
AFIµnB–ëﬂ[~tn*Ù'>ƒç2≈ìn√G@@ë¯oÎ∑ÛeçﬂF0±í0€5rŸÌ%øÓ,¶1»í˘îQP-ôqFÙÿeì”<{œâ≥}∑»FSÉˇj e√∏Òv∞ÒŒ‚+XÇi –:ƒ∂KFÊ'Ê@d·![=ﬁEß"~»¶,¢SîE`ÅÑù#“]QdQœõ¸jπg¿ &î1HS√¬∆@ZG¬-D g‚Ω“6!fΩÂ“-ßX≤nQ’.nnír}k€B∂=!…lK°2¨ç˚⁄dEªIEº∫¡ Á¨PwuPüÚpÕÆ|5ß”ç4ÆJ	Z˚º∆5ºGßÙÇh/•áê;–ø≠;∞cH$∑ó¨M˙ßƒD®e˚£.$ΩÑou‹Ò((Ksm©Wl.“Aÿr~@|ﬁOŒí|Çr3ÚÖ~$d‰%îﬁQûFÕÄ‡2≥¢H1”Jj*y•® èi˚⁄‰T∆vÇÂ$\$Å€ÂyÙASõ–˚º	Åi”Q?œF©â≤Ÿp9$aMËnK\†Ün`Ú:Ô^J∆ã≥ƒ“‰
e Å>
kÙtÀ¢àN8~.¨›<E —lÒ≤«^¢c€ì¸π˜Æ’›†qG˜mÿjV÷CsÇﬁ5—∫¨e˘`@vykÄ•'‡&ﬂ¢]:-¸·ﬁN'W$ı]õX÷°ã≠ï›ƒ„VØ”¸<6ı0«6≥w?zK~ÙñÿF1oâ€Ir1Ó•@H—`¿ù‡(9Ëﬂ<bkîc€∏ıÚ\dÕ∑≤ÆzBu¨¯wäË8AÕH∫EñÿbØºx¡æ˛zs8lc‡˝lm›ÅßH∞I<∞Ω0ÚhëÿÜhBF∏˚÷©— ç∏#≠\+FÔÇ∫mH7(Ñêÿ¢—πE∆LzÓO≥4_’ YQœM$ÕÙ¸Á˘óÛ»Û$v˙…Å
Ø$Í„¢uˇ|ümÉæÍ'≠g*U‰3˘ı˙Ï"Z∏ê3˛Ûá!π˝F∞ò÷JPc·ƒfœÄ·.ÇΩJ¿¯–A±¢eôvK4˙É?”$‘∫…∞GX]sw°˘©HÜ†73ÑñCÕ®Iµ”Ö †A`-sG#∆¨˝±ñ>ÃÓÜ)q
¨‰RﬁÊà¯4£jÃ‘OP+;C,†–%ôyêﬁ.+oﬁ~u$üó…{≠øºó7êΩÄì]Å%’	√	*¿CÃ¸h≥¢ë»®Ÿ∏á!ˆÁë1t∞·<X†å@á{vtWûÙ]#Ö·“§CÜCS˛
∫∞KA˜xò∞«BÑ>	j%£Ñ‰!ÓE·0æÌ…›ˆÈó7ß&≤Sî˙y‡!oÉ´@ç°í:iπ„±EùÏÊøP6Ü%◊ô#Ütˆowy∞~F©”—I2dùüvõC¿¨–¿ö«øËíØ\çâÒ •eé{gÂ›ã´ﬂû˜DƒK˚pr“OwŒ7Ÿ∆jHùÍuøÑz◊≈ÔÜƒ]âøjhﬁ‘}ÂR¯*Ì`ô"y5∞≠ —l^¿Vïùm≤º¥´Cı Ôô≠"9µ¢ó
ö”∆Â¯ÜqcR∏Q.`ây∑√HDM£`\˚∑õyO†0«eR¡ >°µ∫6>Ÿ¨¥%tΩBˆ{Ω$e…9˘LW•4˜<·V(•*˚<0r+ñ¡e£à≥7òv´Ï0_^#(ø-·DáÊy@©ç…Ú˚oMãÑ„¢ä<Â‡^q?h√‘7À7ñWqÎM}’+§4ñê2\PÚ/gXp¯óÎ*êà~.îuÁ*;ÖˆÀ:òµ
uZYÂ[ÌÙAZ5 K¸⁄ê˜ÏoJ
ﬁÜ6H%FÕ~$rlrrcdÃ )zÖÛdígt¿é0)€mﬁÃpV—FkIùïm =Î÷¬u39ﬂ&Èª0È¥M{°P$Yßj¸∑R¿*Q &1¨|ç´æ_Æ:ã≥*.ƒæ¶¥IvAü&ajÖ‹<sZåêó˚&À
≤Ä⁄êØÍÃœÜÉZ∂Z˛JWæ$y;
4
ôj©’ÿUöC™⁄µÕ√h¥EÑôe7õ¡zâÍˆ≈pLçoﬁ*Q±SICalÕ3£…,_’±ûÏöâ≥VXi3◊ŒßÎic’L2¿HhÆO VJi∂ø`ü
õ«eVßÀ™˜X£Ü˛LâãÓ1'¸}ΩnR}¶=‰≈ŒÑB⁄&µi£3›Æ ≈ú1°=`Ü(ˇ¿Ä◊;«ya„dÄT˘0b[58≈ÃóÁÅœÜﬂì TIáùZW ˘U+[≤äÌ”¬©`–Å≈z>PJ‘IàW‘ø•íıËe2:≈‚◊˝”Ë,a{ª∆∞ÏuA∏=ˇí±Fõq√ànd@¿t1 k¬KÖÜ<TôÙ∫ ¥$å±`\t¨ƒÔ!é9ﬁ‘ÿ„ttö§y‰⁄Æ◊G££óC)··)£±Ê‘∏æ÷∫]….H6ìn¥Äm…Æï¿|=0‘⁄’“ÃØ6Va~È∂ÔAçë1Q;˘IM∫ï˙(µ(lﬁ~™˜N
™Qq∫/"Ìâ¬–ÿÉˆıß‡πU‚´KArøú„m•6kq’„Y≠≈tÕ3ΩXü÷[ºì~1†M∫-èó›™üÒ]¶g≥âiP˚–eÀ¨”l‰î™©Æ›î)/gk ∑:ﬁ÷5 ÅX—ª’dÆ-V·™\ÂD"Ö¥ãÛÙ≈U˝ë'ØW‘8ø¸uÍK‡ñó“mVr¢DÿVa~ÌÉ”™ 0¶≈AtÎBÎ¡+eÌìeî◊(ÊÅy£ŸP6‹©f ¸H§´.©4ñ£fìS±ô¡∆M'h@∑√O‘Åó9Ùfx®]õ 8ºdQ0JÃ''Ê¢”íÿy2çÚòõ3≥¶¢^∂´]†^¡ã÷bgÑpÂÀn≥“6ìX›èÚIîΩç¨úM"}‹Ü…ñ$≤ÆëLv<+˘1ôGÔE°É⁄Ò[˙ö='Z„ÃU+8Ã˜√ gZyŒ ŒU´¸&ΩÑ/_\u‚g¨≥∆æ∞N"◊ıõ't’§?»Oπö¥ûvÊˆõ9t€ù∂•ë“w÷“äfá—9BH[Ê˛Úß≠¢¥g9Ü+zò”1∆edj∏ü¨öYåü=Ù˘	◊J`˛¡|#üAqœò:∆9:÷≥∞+Í ïÉ«Ω„äQ Ã∆\∏vØ◊ôóë*B∞‰FÕ+Ï&,,{,¥◊R§~¿‚p!∆¶§≠Ñ∑csoΩ¥6⁄πñ&OóQˇ¢]âîÜ˙(°Œ-5\ƒ®ä:ê6@Â¿xÚ„ñ^rCSúftñŸ∂¥ (˜∂„-Çä·-⁄KW∂’™˘ñÊqa˛cöçx‹º˛ˆKπ	ÃØıB“U<T;%ÆM“j˚4"mºªmˆÓºƒXSg∫!–¥˝´7mØ~◊y„¡
ü˝V◊*„>ú{ C%ö¥¨á]‡Q(¥]≤nì(Á2d}èÚ4ÔÿÕ’0-ÖhOœ>≤$Õ{“Bi†◊@È¸f≈rEkoÎÛ¯eä+m¿!;üR‰%∏WO<ÇÖ‰ ÔAÜ~¥∏VÕp·-i≠D„<;Oá°àsrı∑Y£˚q.∆îé}]»Ævú‰…®üFTá¿~1	.úÛí(0cp±;?ØZÜ≈ù=WÉ{0{ÿ}\f	]√”Î]_¢•'1$·14aº|ß-Rz5„äó √ª‹|VØΩ∞â2˙Ó»JH§àRˆ_˛“3”-Î_WEÒßSyÕÚyr¸¢Ëü&Òtê<ôåˆìc!≈≠Ñã»pÚùX Ñ∂M3.øs
€Lã—ÍV≈§‚E2öb&{óG¶Ì∫~/√”TßyHÿJ@ÚAPmÊz†ø†ù˛q‘±'(@@ˇπÌ|ø	Ñ˚èçv	mL4ã˝€ÀäŒà(0Ô√Mˆˆ|ˆƒ»Qíùê∑{ô:ÁÔté;KlêO6˘w¯q	ûâ'ß‚˙áôß'ﬁâ‚ê Óá∞NùÛ™Ω‘D ∞?‰
KÆ≠B<Ôc|&Ü÷£[√7|rÒñ¶(tgÆ∂âÍµâ◊lµâ©îá·íö•<±¢Ïk!ê≤»ÑÉGÿœ«¥GP{2n/åQêd‘_L<Ã‹:°7QΩ§‰$≤'z=UN˛CV}O„W 9Ä*ºóÅÄ8pÍwÅÛ EÈõÅ~ôL‡¸¸n˘ı˙ÍÍõK≤HÙ≈ã‚K=¨—Ïıbç¢x^ˇd-Zﬂÿÿx”Tx˜| Î»Æ√G*ØçÄR'…r:b«QLˇ~óeC¯3÷„i—÷YÛ&kì†ûäï“„ﬂK˛i˛™±RÛG¡Uù‹Õ'z˘J⁄6X^æiî∏uf¯î–\8ﬂ∫MœZ˝ÀZÚ˝›:W†è8m¶∑⁄·‘n¨|πá¢˙@„¡a”ÚÕ€î8‚gæﬁrêd£
2]Ü4 KœüÂŸmè∆MÃxû£Ó÷™Ÿ®›w´≠F–înÑÕ}ô∑Oì˛Ø∂”º?HttDˆ" ˚2ÃÄ≥Èi2üÂˆvi¶ö!‰“–ó49&ÚEÉhı6)π©QBeV⁄Ößo,\ë±®⁄ÑhSM¯AJ°«◊æº}°ºª◊—FH±Ñ"⁄ÁÅ&ãóm U(3ÓîN4µ£Ï˝ı–ﬂ%Ä{[ËˆJp{{úÂ0\C ]S!Ω’âKõ 5Ôã`åWe	 kñKò◊Àwa
í23}òj	R>’ ñ4Òuì·ÒúéíX©ñ2\ÉÛ÷`õ´ÓÑÕ^ç€pò[4É]hÄ‚˙ö+xŒ0£ Ü4Gí6‡bœ˚m%ô-*'2ßØ´ﬂ«Ÿ≠¶ùŸê6Á„ÕÃ·:©Ú∑f9ÿ<]o:Û,X¿L2÷9…6>#ﬁÉïG3Œ˙S|5H«Ò€-≠WÊñrLëÕ1Õ.ºüÜ¯Ã“ÓÍ¿˚©Úu1IóˆIC˛mC“mª‰Y·X”∑Mz#∞G˜n±ÖÏOá'…⁄2c=fSµSa8˛Øb)≠%ñÇ‡»◊ÃŸ5Y◊V∞ÊÁπ◊Q,
uÊ’Që‰gQ?KÏ¡∂ıxe<¥ZÓàx¯Íwx¶w≤1•Ç¡¡*≥ød¢J^pgzıª¨ËZ'Î˚Ybe4*lxƒà'c∂∂ˆıe∑0*L√|Bñ ∆•vˆTéŒ÷Û_l˝˘˚v˜`˜…Û∂Ã^æb€˚Øû?ÔöÈòV˜ù8ï&ÀkrÍ&˙z@—ÍJmÑgQûF£…√Ö"q+Ü)©œB›√ÇÎIÀ∫¶ï*‘çñwTùø∫—RWÎ˙·ù&¸2Ú IâOzI}(ﬁb´ á5h[°—Æ◊qúsŒW01t]|¢7—#id…© ¶Ò¶Æ≈ïZ–nÏ2Ùé‡ÖÆßpq]œëø◊ı‡˛h“Ó∏‰VäYf»ﬁ^Ìªö¯Wg“ØÚ´ﬂYÖ!hOK8V	qdÈØπó^Øø—vì]bÇ—¥›Z,äõïÜ88Îi≠≥¶œàbãN4!˚˘™ôÎÔπ pÚËB7i<fÔˆw˛d˜‡pküÌm˝	Uç|Ö@â&‡/†@Å/Äﬂ	¯Ó˘÷À´ÕAK˚[O∑Dc•∞í5¿Y˘Ω€,˛Œ‚‚¢Kªs¸z‰ßûå% /€í†Í3*â–tqµ#Ctï]óÖì"î-∆ƒ∂π¯ÛovÅ|û^˝˚'ªHãáØ∑û#qæ‚‡ùœv_n=ﬂ˝◊pÀ∑;/ëæ¯ÙÿS∏ß=mËÖ.∑h>X!æ&eî^¶˝~Rå~®Ñì¸oŸLZ‡ŸHiw¸˛Úºº,Ô¡Ö Öÿr‚rÎ¶Ò`˝†%åûXÿ°"y =¬Òù§„	6íƒxhÏÂY<%ÒÀ8ë°≈}˜Õ∂£ü»≤…˘T££Œ‚∏º_3Gîs~YÕ GúπÄù7ëãÇ†º∏öÃY≈*ÅXv®`]ƒ(Òê≠∞óXj¯	¸Ûˇ˛˙/ˇ+QÃ∑®“óïlc¸Â?˛˚ ÂHÑ∫08ª£\{WäÔ˜ìÈÅbj(¸Ë√È√ª√∆&ÿ˙¯—Ç=æ· _[u ∂u5%T¯º˛X‹m›ÃAñIï@e?–oÿËπLÆÚ6≠{bj8S‹d›‚ç∂Èó¨*ÁÉ”çö©9∞`Ø8k≈óNæ¥_±ÿ	FÇ¿®î®1œ¥—Ìƒ85Å9ùnXz¶÷Ã˘ã	"<:1‹ZÌ≠W,ONRé‹RqAª´€´P∂(D‹Ê±Ñ*)ü‡#ß~=\´∂zu-—$[2X€Íû±"ÛWv∆2á—pm´NY˜≥/ÇYˆÈ®V6‡»öæÛ‡ÙNsÖ"O
tI!Ø±∆=kRLáÉ’¬äºcyÁì(>I*≠W¥Å‚€áŸ(SdÊÖG?±Y°¡.J:À˜Qº˚ªª›Ì‡û†óÏkˇƒóˆJ+˘€ªÖÀ¬kÉ·«™<ò€NÍÆ»eÆπ⁄÷<û}∑eïKGÿ©ﬁØß∞È‰√Â9„_†ÜZõC_Ã7oç†∑®†é>fŒhÕwu>Âlœa–´ÂBY”µTÅ	l@ßë∆cÄ⁄uÍ
®NnëîC5êæ„õ3Äø‹≠Nó®j?¿f≥j"R?’|!Ö+Åò]c6:∂ÈPU¬«èôÌ≠‰.ﬁ¥D•sùø“q’jÚ8!pÿ≥h “(bçÊ3Õ`≈;¯\™¿:÷yÂYºTìAvÊ7ı◊ô{ªËa∆%áxß|´VôºÎHÑ¥pı†Õ±ö“PÀA∂≤.Í ãòF·Jå£Õ ﬁÏÿ:jqæ¶˘ìañ+‡
©›Á‚„u±-\lÑ5¥ü˛¡´;ÛÅ ösx$ƒ•&è‰Œ$√ä¢áæ…ŸêÀ,¸XıYÍ°w	ée^;útxà¿€\ ÷y l‘<^‹éÛÖv®[Ëñgâ]À=i ˜ﬁk fÆÅˆ~§dfwd¿≈¡·÷üÏº}µˇtgü‰Aå“æ“ís”∏L»≈èŒ$\ÒûÁ[OvûºN„7óÕi¶Ó,soZh‡˛∂äi&Dïuˇ∂⁄ªé‡ÎNÆ[*æ‘
JŸ)µ®3òƒ˘PY|õÆ0jÓ9"7Ï6˙≈•Ω7Òõ{T’òiíÓ›)d!yÄ÷vy>"ÚïÉ±±AÜ/]Ø≤OÑÌ[ç¢öıw£∫››
˛~∏â7‹,áΩﬁ‚õ≠›ÉUƒ^úFy≤~Y˚’4˜£IÔtyÌ∑à¡…œ±Ï)∆	!0uT˚∂Ó\sk‘ªÎˆ7%‡[˛≤°◊êƒ≤)Ê∞º∏jZ?|·†‹ëkBÿy˘]∫4˚ﬂ¶—/N£I±5[Œ¢•8ÌÀ◊¸}≠]ßE2˘EÑ"Æ∂Ì0¨Ö…∫¬Ë ñ–∑˚ˇ  ˇˇÏ}Õo‰FñÁø•)ØR}´ nßU*»íÏQØ´$K≤=ãB°L1)âÓÃd6ôô™jY¿.ˆ∞ÿ√ûfÅsœn†/kÃ•èìˇIˇ%ÔEå/ôôí Ì∫] $É¡/^ºœﬂãÏâ∞ËæØ◊ªã≠4YØ∆iıÕ∫óÙA:åªWÜ^+Æé¿¸éÿ›‰ZÊ⁄U=F=C´d∫|DºåQπ,¬,≥ﬁº«)ÓÔ√ÓUÏ·Lvo˝ÕÀ€£rˆÃ†´[oaFÂ3v+31≠◊Çuô_™òöÏKÕ∏l±Ôe£"§\›çËño4{|õQ]÷U7Ëáë=Àn\¡9ŸÔ k}√¨y—gõtBŒo(Ùˇ¬ £gOûÆ/_a5Ë≥èûÆw=À˚ÁcZd"^eI~∑Æ¢AdÔÅ*–óq6Ã…_x8c`"#ò ˆ0µÂ™;ºñkat¿∆k?º%Îü.Ï<æâeœ$¸…5óaßz4∏—ç/˚mÑë˛î®„≥¥ÅVºJœåÄr@\x-ŸWmÒ’~grc¡1,”£?ò®›“Í˜‘®`‚]ˇY,Újûª{ùRí∑Ãt~¥¥wˆ_é»’∞g∂ ∑øDÅù∞:›Ås M∆P1O˛ÓÒgÄé√ÒŒÓ≥äKe5K Gô‹0)yÙ‚Óª6Ø⁄Ëü≤ÔA±nìçÕ¡€O	ïzóqü˛ı˛¬é◊mÚwÎÎÎé˙ÜUxg*©nàƒ/Ñ©Ù¸◊∏€,∆OÛ»
Ø:‹†º‘	≤´®√üƒô,ø‡7≈Ã ﬂYß4ÿX:!^ú∏±æ˛A˛X˙R›`ê—Wˇ &É™ëôPÕ»MnB¡=⁄+»Ç=Sºîœ3“‰ö>†gt_–É„Ú”¬VÇV}®«D?˜≠iz‚~⁄Ó7¶’±ﬂsë$CÎ:Àoºâo,3~·§ò7}®>ce˘Ì5Î˛€Ü≠`€DπÒÛlÅ1≥Ω$ØÂÚ±x√ 7à[éwÄ ^ˇ›sî∂®†ûŸMá˘"WqòÅQÁÇrA[vÔË≈Ò…—7ª/œ»˛9>ÿ?‹?"k‰Ë‘„Êc†Æáà°'ÔcŸã…nEVºÕiÈ™ûp¸Êúv6Lì˛ÂáWØ,˚éôƒ¨˙(f™Ù}t√…ˇM5zû⁄+∏kV8∑ì ÛNLËå[‚•ôÕˆ4ÏºkwäUQ™ÛÛÁß—8Œ âù{™ÀV◊ √«\9)Á¢°Dµ/€–qÓ±R±i “‰@ñtc!$—	 ü∫kcÈsw©ÓDœ»´™≠JÕ¬ŒÈË|»"âŒa, G˛£ì€C@èorÌNvóPZs—\YÏH™Y¸Zz¥,Ï∞¶‰â∏álÅ¬Ò8÷„5já2´HÜIà‘ìÉΩÉœ˜w+Á&¬¶Û¯FX",Ì˘;u~Ç]òÙw·:®ªlŒüÔ~y∂ãô∏'ï”ÂO©1c‹£jùû}Ω;˘ìˇ~‰z0œ≤,ç⁄h”Kì`gøù«éŒÈf
∞∞π@5ÂEîN˛@bèPÚ8%nñQ˚ñöQAõºq}ºC¶Ò¿…(…~7	:‘ªıYﬁ‰™è%ÎO¸B
(¸m+¡•î∑?u{Õ∫È©˙b6,æ3ôû∫U#&Vﬂ9uÿóG<«îîlÕS¸ê¶JÃŸUDœ0s«¸<T˚TÇ¿jø.*Ñ‘˝S¯uÁTNCSUÙ«Añ˘SÕóﬁ≈≥ë˜∑ñ—≠Ç/ﬁ6x∂å≈7!S¶_b…O€<ö\Ï”6¥yX´Ä∫…e≤§ø˚:Ì∫&∫G<áÜKåUDŒèå`ªŸqˇ≤≈ªLŒGq∑Ûy‹ç–æ(˘ËŸQ·7_ )ıÉ˛Â¢°Ç›GZóQo≤"G€‹˘,àﬂ
`ì„ó_‹±à äü—	Ω"bßAH~ø1¡hß	ãŒ≈	ãŒE3aqºˇ˘$gn]VÏ>Yq◊˚|Œïj”∆∞<´õJóã≠‚w}eUît-–æzm˘U0}Èï˚E‘´eåY˘·(•ΩÓ∏TàiåÿMQsÖHÜÒ™w‘K∫©	uÃtc-Ï|Càö¸'≤áµ"±9÷T¢ß'î‹<≤y’Ù$%S∫åî%*r{!eÕ´∫Ü◊	êƒ¡®+RzlËÙ{¨˚1"qsw"•D¿D5⁄ì~í’WUíî≤sä\Ÿ45&≤DÑJN	CSﬁè∆Q'Iã*EV|…ë5ÑV√X<[1>z§ﬁ&±ïR≈(P°§ãŸÓìn·çÊçS•ˇP‘®C∆îD´‹ÎuÚØ$JŸäC>“¨ıˆ∆äªMG≈ù≠µOÌ⁄ ù*:(%%OY√j··6Â˛öÃz∂÷7-uΩõ9 Õﬁ\ºwÁ4c}r∏°Ü¥+Ã“ı5‚˘ª=≠JY@¢4‰∑ì±≤aZzï«Ççlr	÷6‹	-ÆPJ04Â≥z∑˙»M§¬R&wÖ ﬂΩL“öƒ6îµäŸH-rf<a6´`»A∂…o]ƒZ2˛]`	r
ÆÜ¥√2˛1Ü›ä0˚ûm&Ï|2◊ T$∫n⁄ûo^È
›B◊,‚∑h`—á—øéˇë|u≤HnÜø°˜Ø¢8M§ªˆ≈WÆ˚î~Ü≈›{¨{Ÿ„ùf}F·ÌWÙAˆ'?±∆,Z»‡5¶(ı,9˜‡XÃæÔ≠∆ÊÜï}tƒnÆØ`GèLÇõø‡Éø0@–  Iîp∑π*aê∂e|zYπ¥@e“î1w¶mKh»ıj≠ì¡ îvQÖ=hE’Û∆ºˇH«º7jZs—{è∑e1ï«—VÃ™„íY•£ÑÍÆÑ•∑õé	·,»âóWI64! [ÙÈù=v°∆–s‚·çhÄ1&1nˆ?œ«W¯å≈/µCF%Ω~Œy„Ã∞–&GO¶«ßYñ{¢îˇŒm0¸+G70í Îi^Iw8-´É‚:õQ≈€ga8=1N¨_-ÓÆg/©E TÂ∂¿Çå£	sÑµd9‹ñ ÷⁄(d•W˜¥ÀXeô»√¥ï⁄µ≤›]ˆŒ:ßµ&GÂóïäƒ·jiÅ5}D≥Ç4x∂@ﬂ»L‘∞¶xº?«ŒRj˜Ølû>’‹¡¨ |É˜êÙ¡)ﬁF•∆;DÚC—¡$B)sä‚ØZ¢¸ôπñX≈“π1\2[øœ°Bñvı@Îª˜´B)}Ê´P ﬂ‹≥<ìp∏#ë,ö√¯â∂è◊‡±Ä={¢uõŒ#9Y’∞<çO®rÛÑÚŸdﬁ◊&,`ÜYfYWk&‹Ô∆˘ÊX›∫ílß†¥¡!gÁ IÀ§_\¨£9È›hMmU¿ÓÀ€l≠´]	îûö@6ê¬(YN¢<±é\ôßXôó\)ê‘ˇ= ,x€0‘yiƒHìÎÏŸÕ¶Œ&Åê∏†‚m∏˝.vîÙ%˘É∑Ì"ëQ2@·äI˝Ä†;]‘¿°ª/ Q8˘ÛE“/¢a∏ÍDøVPº$˘≤úI#0e”HÊ‘U€Á‚6—çe_èIŸCR7óBÛês„Œê`	¶ªù⁄◊Å@®)ŸÌR9îo∞˘:8b≠∏›Àœ°ﬂÊtvJË5pbÓÙ‡wJÜ=9‡.W…œ¡¢'î6F≤, òùAÇ˛øˆŒ0ÍëQ/a“Àì»8Óá£.’ãWãD=} ¡?EÈgDæü¸(§
¢sR6Õ u“¬ ◊‡ÛQ?ÓÇR∑;‰&4UWU?ÔŒu¶‡p Hà._ç—Ss™.Èù3`ØúÓŒ@ΩUÆM©¨ÅS•É5™DÁ=*ªáÈª’0ÈDF-»t§}+ﬂ⁄˙v˜Õﬁ—◊/œNxWÛÆqL4ˆT◊À?˘¶WÎØ+5∞∫nD|∫Ú1!bÈ 
ËZR¶ß‚∫ˆaTçe∂ÒJdØCË¿É*AA1JÊpP‚O;$T∏z—.oâ∏‘âeÉ≤‚@Y@|,ÜWâ’0;µ¬Ü*s√A©+©DülëO>Ÿ‹⁄ZŸ\ﬂ–√3≥£ûòÿj⁄Ü8ï∆ï1ﬂ¿ÎyãArè‚0!ê=€&ä‡lcD^DÃ–)—Y}∫'≠Ã~™{jgwŒÍƒTNvP}	®ÍFç√
ûxKë∞8Îó4ÄÓF-∞OïÜ’UÑÈÊZ!=Ôœ”8ÖL‘,Ωf®RzÖ¿óPI{H∑„[Úà0†cKn™¿º“.yçÍ£í/\¿õ|5|GûŸnÕQ@ÄÁ7ÚXVD†Í§π*jüÂ≠A›WØÊˆÑP?˜£Ä ≤rúFêπH’&∏xÅÎöYo¡S«Twñóí	èj[íÅàE8|,Ñ‰X.5–}ál¿‚8∆Fle“w‹™ivÇNî-Ò±t∏9£†ë[úQô_ÌÃ¡§yÉfÓ0--#eÖ®µ∫"’kGAwqÈVq…ãÉ3Ú%ÀJ§ørj¸2ÈHè¿©˘c~Ù≤tZ ówô“TL∑≠í¨"_å!"xßÔŒû8’kü<û˙Ωi&wªÊ¯ƒÜÔÕ˙L∞ò_ﬁ†t0SN!3Ïn™òr1óg≠∞èc%ø+Æ=yºÙ∏$7ËH‰Øˇıs@.j “øˇ>óËOˇ¢bëAI`7©ó…8·o´˜>«d-Ä`Ã«∫‰°J5{3,~«[Ë–Íô]
z+ø!pÂËÒ9®Ü ˜\çŒÖ*–^}†’TﬁóÔRîÈ¢q÷‚"±E ç{≠Ú—E"~®2_õ k˚s“í÷…h/£ƒóp%yGb
˚ízKƒ-t!d-åzcÇÑØt≠ è°Ú	÷ájœ1Îè≠í#@Ä9‰¢ûÕÿ¢àÚl?!T=Ãv|Ro‘	Vç@^¿J˚ÿ?õ$bÃlÚ3ÈGY÷I˛-ú=lzıæ∏§=ΩÌEﬁ#Jæ'?ë,9«˙/*˚Ãµö:“Çãh yrÍ‘&éDë[Eÿ˘hF≥≈§-x.6%∞ lÒq+€´Ò§ôÉA˜<]Ã‰v«∫Gsì@(awt$˙ïêŸ`òÊ\GÛß∫?W∫oóZÖê◊#—yÂGƒ`Üâ.4§uºˇ’ò_$Áq7¢ˇ†ó˝nò‰ÜØJS5π´Z–ç§c]m≠ft'Ô÷gq´™‘˜Ÿ|•ÚÓ\©Áﬂ§ÚWÌı§≠:%H]ªF·á	*À
-ÌUßÿ ¯àn„¨ü~f¿ô6<Ò\-f-Ã—tä¿l9	Æ=∫RÍB◊èn2â&)`˜¬ﬂÍB±x1Ä=ôz‘LO–RaLŒÑºÅ∑€ó¢≤D–uÖ`ΩíJäö‰5∏&D¯ÏL@aı=sûÇZ≤åI◊ea°åü™ó0ÂJzÂ˛Ü¸3CCır/ìLôq}{S‰cQ…¶ô"ZFÙ≤Réfï-∏•™ÏE£3ØE„FÓ˚≥^û6Ú|ñÍ‰Ò}Æ∫ºﬂßµbæÛµb©‹ØQπ\ÜZz™ö}5¢´
8•4	Ø‚d.•ÑÀä‡í⁄ÖÜ7UÌËÙÎz
m -F7E_=]&ÎÙÙøõÎ,'∏5áñ∆}ˆt5◊—M—Ã™L6Caé∆§0'”ÿøÎMj0ØH
vÛ∞Ò°ô˙∏ÆÙ-L≤·£Ò: Çb∞*ÚΩéƒ?ﬁIΩO•ÄN˛ªOöØg3kdãt^≤∏UØã¶Â∂˚πñáNõEıˆ3ºµè±£{%K{Ü[⁄ÓS…‚|Xd	Q¯ËÛN¢ Œò˚Õ|c[‹à¢ÓçæG‘G»vF"‹Æ‹=W^/¶v‰∫:îÕ¡á·s «≥ÖNRÆ÷“ìÂ∑á¥ÑN÷oÀz±äÊ‚ ßÀÎxÒw◊„õñlë…˙Í'Eeˆ˙íÓ‰>Jm«{˚)ui7s_•ﬂ1£≠GÏ…&ÎÕÌ˝‘;eB1EœË*"œ–Zj©îÁ/™Õjiâ¨Z|E¡<ÏK·9”Ã™Å√®≤íã´%˜N)π)Gâf+öÕâXû®±°òpÆ`Ç qµ<[r2<◊io)’’‹í˙¡†∏¢äèÊ≤(ß∏ﬂm…©y ª8|Ì®c˙#=öO)râbÜÀ≤[Êk›˛=˝&À†‰¸¸T”8Œ‰<]¢≤ykmG—¸3	ÔÇLeÃÎ6Ì∫W;[+)/|Í^w–ÀãS‚Â©é6ïròãV™ßhÎ˙õxÏ-Ë[Ê7å`Z>MsVæ(˝©‡ûëõ∏üç∫q∑áﬂC¯àZ/÷|¢0ËÜ–)i˜‚?È^í£ÏPå— G;éB@¡Ãˇ˛í*1£4†GZDw†Ñ%»Ü=|q|rpz∫{ÙÊ≈·À√ªÙ∆â≠¢R˜"Ó«Ωö`m≠+·Ô{tíòéiOt¬œÒ?ÿÈ$∆Xª˝°Â	¨gRõGfö∂‘/´¸ºeÌE‘: ¢ÿÎ%öµi4Ü_^≠ÆÆ¬øóÛÇeà˛ÔSÆˆìÎ÷T#MÈTóI–eàÌÎ‰ˆµ˙Ã≈∞x,åï”∏Y1¯Ô*˝öÆXkÄ_@I.(@qgI}∆˚ÊÍœX&q‘ÖÈÛŸ.í»"õ-UJP©mf{lË1)p_3zÜ3¢kåµGÉeÚ
˘∫Mxç]ÃÅ4a5µMKn{Ù»»¶Ã∂C”ÖJv€ãhò¢	a€„®;˘30…o](
*ºäŒ0F(Û≠\≠º˙¯È¯Í5â{—•RÒ›
X`Ïa%”§€=t3£Ò,ÃÁæY¡ =I∫‘⁄Ì-ÈÄÀjtÿçπ!eÓ¢≥íEuh¢’»≤“éU-u‘3y•áæﬂ–%§ìüËQEµﬂ*Ó`
µÃ˘V(B˜,§? $bÈJ¡ÔGÒ2ÅÑ>‰Û∞®kõdú`¸Á∑Ù$„Ë¨EùØwŸ¢·‚J}ﬁ“b∆Â&;«—‰èêÀ2é;Tª^˚krÜñÇj15ùçãﬁ[À⁄g&Î1ñæîﬂ¨£ÃqwTn£Lv;q'}H9Ä76øî-yœV∏ ü(IπÔóÕÁØ`ÊÍ]Uzs◊ÈIçCô1pUäó7–ı
 ÑÊ-çëÙ=ËÒ∑aŒø.ß÷i$}tGïEGæÛY4›≤b∏îJ/Ñ`Å(‰ÿ`ïoÁ[Ω–£8[ÏüüÇÀ§°å2ñw|R£∫√ŸHﬁøê√êXÔ\r6èÕuÒ‹Öù…ˇπ◊µ‹EDYJ¶òx≠dÆ√¸bRï›®9º)Ìñ¬.bM$.‘P$·í.àù.©˝YdWyë«÷Ñﬁ*ÒcÆø≥…L]0`◊Ö∏ua°’9zıÀ)¿7¬ïTfÖ‚ßÕıR¶∂ÇÁO≤>V5∆~≤'B
∞·≤Q/ °1ß∆¸R∆å+CI∆«Î¢≈ñ§à¶¯,÷DK07=È'Pa´ÆY·,Ì˘t/õ˛-Ea≥i„óD∑Gçç$˚Gä≤áÒ~ìˇÕáSaxOªòö)_ıñˇÒˇ*ﬂ”ºΩm[S*í”7ß¸„]mOÒL‹†ªP÷Q+Ç°6Çe¡h¢≥ÜãÒ[Ç~µ¢™¿±√Kw£b:ÀÇ†®]∆∫jÈ…X÷¡	…!,È§Ñ“ÿÜJ·AÆ˛rﬂ◊≈úÏ#zYCπÖ¥c*ü_è£WåÄ£
¯ÌY;y]õŸX]¨äÔj@.∏=Ü„R ?÷¥∂(%xriP—M¡f,‰àOY‰ø‹ï∫ÊΩ“_:ì?SãrÆ'4ìÌˆ∏ò⁄i s6ç`C—âœWÆkè#€œ»˙Í˙˙ÜQ°≥ÆIeåW∆‹˘Îø¸9=xAˆNèNˆ'ˇkÔEt@wst\$i–#9KCÒ	•Y/ z	ìŸ‚’GƒBhÕﬁÄÈyÆ˘ˇÛøôπpÓP-Éàw=ÆW—ŸO~ŒÃ∫{ï§§º?… …≤…ü«Q◊˛F1e;¨Ï÷àWÒ÷ìıÚ;⁄OK∫t]ö¸ò∆	+¸ÈG=2L`ëäÉs˙-ØÍ˛æ uªı:y$fÌV†AK.rV’8ªDa) ±£S‹Fü∑(1Û€‡º8RŒ›iÍìQ@”TX({ö¸öQÆÉhZ.ê¶=≥YÖ‡i–ÕA~ÆÛ∞û˛¨.ŒWæµ]äIÂ)-VG˜ÄA´_™$v%©ç%å¯wNCˆ „¬Îk≥ê5Ó'5£[Îê≠˙daÁ∞OÖ~/ Eƒ„y SQ‰hü õej1Ë˛Ÿ∆LM‚Dó$SU˘’(qÑƒ™k˝ä'¿!è‡MU8†⁄Â!√¥ﬂÌtÚB1‡ÌN·w≤§i‹øJ¨ôïhë^Â}t◊¸~ÉZAw±‡¸Ê¨e¶V†”4Ä)Œy`∏N	säK».’©‚1iÂáGò±<Í°yËW˚Åú-˜‰á=w˛nêit˜ó±q•À9"¶Ùç∏o‰:6Ç’Îo(¸€ı_–‰Øı~"aÜØg¡ﬁQl·ÔõO$€ƒ¢Ÿû\#FûÇº˜Á¶ãë	wÛ∂hΩÛ¬ÎÕ±)c<⁄ì]N{∏zÆÄ>Ï	Vp¡vá"Eøµ» ° „†.Ãããl*ŒK§>ò1∞ÙÜà/_Â#∏£Bµh¬Î˜@˛‡Ü¥xÅwœêçPèf@Ü©∞èXô‘¬4I†`Tõi\>í∆ƒˆ BçSèÁºà∆x¿èù‚Ñ.ôµb2Zm¨ÌG=∆ Dƒ∂Úz'ç~íz„&%{>´‚iNKiî˚$&ﬂ ~¥db?ŒI=qU≠å‹ÑƒgOK«bêπìq⁄h˛º<pM˝ÒOÌ!1Ê+KAw3–y˘÷˙|Y@ç˙éG8¸0Û¢C.s°q ’-ªQúV¯Ra é*˛ñ˚≠”d†£Å™¡îë[“ﬂKy®ı!ãœ_vzœâe¯Bdå ¸ƒÈÚg.Øﬁ(a£}nTØíÚ·ï	iî€ñ‹Ÿ§Lé|H\¶Æ©L¶<<˜—b¯BR–°[¶±y®ˆ3wè≤_›ñ#|R·‘L»oºRöa≈òJ<ÎYy(^£Xz„µ“%BtÊ•*Â£;Ôîœ∂+†QK‰yvÓÿæ+à"∂ç=&ÏqweÊ∆!ﬁ™àªHÂ
¡4£e)«áb∆åàô´IfDsbm[sIÕä˘ƒ?0ŸX
Fﬂ¯D$ßG6€S«"˝ëFÁø^◊§›|>Îj[“ikƒ%õQ∏VƒRÍ8;Â—ÌI*å⁄ò⁄˜z<fN€ “∞ØMêñI)k!wŸFÙ˚‚‘^c˙¡Û‘>‡ò§#|ı0Bíπ£Ìﬁ"ílÌÈSµê§∏Õﬁ~€xØ≥7’æÈKKÓõÔJîèÕSe˚2jãVª.ìƒ%x™Ω"é[ZC[¬ °;üÑT´d<X‚g1WDÃ
 D}˝6ñçÕjs0ﬁ∑qgxUß)È>øg»:¸Aˇ9z∑ü\˜ÀO∫!Ò∏®~ΩcCÄò]\"≈ÜŒ<Í¿ûn!ˆû˙ ØÊ7˜ŒHE°‘Úë∆,õUÃÚ` ÷‰v”/Ü]~M”⁄‘
ê;—∂Ä≈¢∏kª]+3áín•Sûê{ÎAπs…(ÅQÂ¸/}«i"Æ^ Õ≈˜Ïñ¸ãõàπ<Æ…3mD’¶cW^ïÆ‰œ0_gËb£7òœÙQ?ûQ˛ì¬EãÊë ˜êÛ•€+≈3™x…’3v#ÛÿÂï◊c1∑WÎzô\-≥‹FPªØ…áƒˆÊê˜ªóÙí(P/}…Â¯wõJŸQdøˇñNY∫˚ ÎÓ~êÏ—z/£˛§
Jc–’}Töù¯Ç=Œ< x¨æŒÿlµÈˇXïm‘˘j¯Œ~Sé±¬gaNoè‹˛∫|Ëïbzñ’0:ÈÚ˚%'{«µ“ÔùhÜÛ≤v*<ó^ﬁÃÂq¶Dmîvæﬁc8ÊΩ+˙|$.,Ûìd√?›˝∫∂FNíF+Y‹”§ˇÅâJ!ÏÇ‚·QçIhQ2 F‘åKDóWj¯Ä¿LF˙‡Ω†?
∫ÿ†•k'$qF†}y&góã¶'–6%@âL^ÊuY§èÀ˘˜-CÛåî¡~¢§n¡‡(…0QAîgt¥Nπˇ˛T†#Áç=`é–ivH∫‹'î®-K@[ õ
˝ü'1v0bﬁ.ÒÌ—8¢V!ùà{eIóé~z¶û—’LF√ñlÉï∆j©„,WUJÿH⁄Û£ZÂΩ∂tNîn—kıÜœ:2kÙ<›às V4∑Tπ4ò¥P÷ ÒíõB—®Hºoùbèû¶—Í?¥(Õçíîò5ç∏6‡]®VìJ&'ÎÃ	ƒ»√|•†oamÙ#Ãyû)^ú1RMﬂhÒ÷…qZ ™„@kÍMµíÙ¶§âW¥Ü¥&3üµGIgÉ≈ìÄ\aôí∞êÕèæÒmOún’ı9æë•ñQß´‹eî+°úq¶M’uñ¶UòzuÑ7äìÚwÉ…!äö≤R»W2ò!HÅµ∆>÷¬.rÛ®Ó´πÀ⁄áÅ´‚ñSÜzßâı6≤‚±U¡ﬁ˘F{õá{Ô)ﬁÎA∞õz%‘˘¿Œ=iâËaı4Í‰J≤®ãÀ_å∑†Uöÿ≤…v≠Ñ≥ obÁnÖè£¢⁄ÔÖÚ»2ì2ß3ØòŒgjï-ÆºÌ∂z∫âQ.W≤G:õﬂJ5[¸£Ô'A÷ËX˛Aí€öUÁÆw˙A•s‡yÛƒÉ9hƒ%»B)¡
EoÎŸ»‰Ä(pÀæ·æﬁæ;¡ªÔœ¥YÖ6p|–∫_˘SÎ·1†GƒÜ˝ö"z‡ÁFê¯{-óo≥ãC„ÔFˆä~ó∏\YW-Õe“$(a
Ì‰i—ÆW6üê¬üÒ‘4µ•√B$.B10‡ï”Râ(ÁøX^¬é'hˆiŸ|@&ﬂñ†„x¨ÍQ%>¶ÜkŒ‡PÔ^ﬁ4Á≤Á]SøI∫‡Z§ß?˜_Ü˘)£4gvMﬂ'∞•5N˚hù •∞Úˆ¡] ˆC”öüf çˆ„¿nÊœì”<=iÔŸ·V¨3⁄÷Ê#ıïgÕà√tÚS“ìvÒñ˚ƒô*∑L~ƒ{2PÇHéúaîôÜ≥Ÿ≤
æ*ì9g≠‰“ïSè¯MÕs¡ÍÙ†∂ßU%ÇUw°ˆi|!…^ÜT` S≤nıÑ=˙#S—74ÕâdÜcﬁ¯“u˙Xôd◊¡)]Ø£4‰∂ãûC&•é)õ∞'æ-_¢¬NÙ«1}ø£îö‹V¿îoØÇa∂;òQ'Í`N∂ªÓYïÔ@ø+YÍ õØR’)J°3ÿ∆ñzˆèR¢oãã‡p˚ÚyˆÇ,jôö7€˚‰-ºú¸
ÜhN0Â R"NÎì≠%Ú	|V‡ˇ‘kπÊ∆&}|E˘◊ª9⁄∑≈=™¬‰◊cn≠r’t‡Ø- áàµO°ÌJB˙ú ê•Å©5dπ≠T)J¡É@ÌN´	⁄s7∫ %ân˘~∞{7µNsnËÉÅ:˘	 1®‚QUÃı∏iN•lÚ38%§'√Ö}*§«∏,eo`ò∆=b"ª“Ìt„IKÅ ©∆P¸âqí±´ôE•“e´ºÇ>≥cœ‘O◊≤…ê˚$˛Õí∑HY?ºæŒË N˛“∆f˙∑Ω»¨◊ñöîµ€Â4ôœ˛ÁùYtVß<õœ:…‡(Œ:Ÿx®ìÙ|z§Q>3!}nwò<˜Ît‰wç„Ë:Ó_∫§b»‚dRosÊ3£\lMeñä«⁄Ãƒ†g1˜:Sf1œ:PnÄX™„97jƒ.‹ÿ'≤K%œ_]ÿŸc0+éP`Âqå=ŸvÙ≈êœZõª lÅËc11k6)¶¶[3 ùqQV+äÎM<|aªìœL7˝4ò!*Òåé*‰}G%psä°áO¿ç÷b∑©· Î∏3erWV˘é ÇF™Júl‰Gˆ›òT≈d»jo~3˘ëNã*#√…O3ŸüYpA·t0lYI@	⁄È¨Ωx±ˆé~\zØÕkÇÿp`sÒ~fî µ{ôVïÌ%§á.ì∏Û÷ÜJ/¡—wﬁVÙ:RW~î4Ä<™h€¢˜£oƒ/Äª}3‚•Û√w∑o	˚ ü4SpŒ)
Mq|Hé%œëy≤iÒˇ∑òi.?6≠Hµ∞]æSJ∏∂§Œƒ⁄vQñÖÔHLˇıÏÊ8≈¶£∑™N-›N7¬_≈PÂU™ébL:ÆV«ÌS8Ïó—!˝ßePî“MÇ¬¿zÊŸ¿/SÃ`CŒ(7˘NÂ∏saö«Ò˛Á3¥∂—ŸéÉ¥WR˘Ö¬g_çË\πOæÀ˘ –ˆQªXÌÃY»ÙÖ¿}˜Ïåi¥”`5§≠˛´ñ\ i¯∏Y©ı,dˇ^zÍnßsñîå>^)˚óN6øÅóD#Õñí$,∫çñøEÈ◊Œ{ë2¡
Ilá–Ëã=±@âø·ﬂÀ@ªhWø@SÔ7¯√&ê4≤·ª6Ÿ ∑ØKS∏]*;éÈ˚|e%Çﬁz7ß∫àΩ¨	—pìàªÚŒΩ^Ü°~õ”0<“.◊{8s€ê≥L±§œ…w¨h®d5™◊ÂV#D^B™zq˘¢fIv/ÎYí¢œË∫OüQ∫ﬁö√b}%ÌŒºÍ¶ç‡* Î_m“õvˆ5uπı®á6¨±DèF“ƒπÚfƒz«78ÒÜC:Ø˛∞µòÛõπqª~#ÉiÃ¢ Ø˜f•ªp~,–≠ﬂa
\˙$(‰˙¸[RÄ qΩqä“€€‚˙SF∫ö§îÎ[ËIıM*»)íUD^6∞oÁg£ú«úó»û®‘JÅÃûAÉZS;‚P≤á£É∂~ù®iÑl∫o‚æ/'¢Ñœ¸°ô∂7*<ôänµA≤^ª≤Zû(ÑÇñÊ ’
Ed◊å=®P>˘r∞4Œ2ëjìr‡°¨M/ì|⁄'øà˚Q«9∏Ω7∏ÿÎæ/ø‘ÒÁk{/èk{'vKÈu∆j´nè7b√¥…ÿ67t—„Ã>;sŒ†µ"nfú$sÎL9Eƒ1¡’N"¿®Ã&?H%Üˆv©`Ï∞NÀ,Sv’6∫Sqá4é ^s?ÄtähÚG:O˘lÌµÈ^X+‚ø∆7:@öjˆ|ﬂô˚„¿’ÛÅÿÜò{–ã>…—‡YùÔ’ ∆Ü°3û@˛=UﬂvÛ‰@≈Ï6û£≤_EUÀûØÜ‘2Fù›!®π˝Ëö–◊£íÑ ï√”£S‹4 W ^”´öΩ~^æ¿{Y∆Éa0p5Áﬁf#Fí∑C•cj/úÉ·(√»· yì7iFÁÙãÊú-≈œk„îû¶mËÙ‘gÄ—gï%ØW.®ıWèëi˘Jl+Q.?´”‰óûsiñ–ØÙTò≤ª,~z∂˚≈¡õ£ì˝ÉÙße√‡2rıw‹N†Q1è^}+÷îˇe	B9j'¯,æ‹˝Ï‡À”W8Ãkko§56ÛhÊ˛á€kå!}˜ò
•åÓSû}¢-R]xZßÎbπÓ„ªZHΩ6XCh/∑≠…Y6cK£-`©&Ì\åµΩ ∂^©ƒfÓé◊v#™æçW8‡`h0Ô—^≥Y^Ï¶›pè£≥‡ºµ8¶∫O`4Î*å4.áP&…≠$Êjä…“ÀmãŸΩíIπÈe£…πqO—B+“‡ÄÍ~fqÜ+Ãe‚ÊÒBàß5åCpˇu£h6n∏NÉAÕ≤UÕ‡ﬂ$Ω∏ørΩ≤ŒÜtî¡C5A“«úÆ≤@Ã%ìœ∞–¸„WÉ :S Ó—∏/á[úwËŒÀâÄO¯˝ùå√±±l) Õg√
Mú>ﬂ‹Õ+<ªÖWWp™h‡c¬ÂEÚú‡}S·©Ö9ﬂbúgIs“jgÊª"¶66©ê˙ò®˘)n≠	xúLzzf©µßõ{XBiïÔ∫‹^IGÙ˝Rc_[¬©Q§«F?Xã{tıÎO®¨ì¿èûO6[·¶vÚº»eíæûZ∞í¶ë'XY3`ÅÃÅœøó8—ÕjDÊ6h\Su5·Ìd^}l= 8ÔQ…ª^¯9Ioà∆}Tœôe¥\˝4<+∏ë±d'®ŒÁT&îŒ[¸bã7¡ëT∫r≥[˜. ÓRˆ·[Ö≤`ë(Ædë)·Å∂µSò,¯>‹ÉU’=Û¯s5E≈ë3¯,,va˛©™Ha◊∏J†+~ı<9ã"¡bCô&]>*UΩ «u5]ÂÔrµêMqUç_˜È¶ı.ü«…OÍ˛ƒ=Y˛»Z -+'R_ B`˘œTÀ./+<2ÕVaËÒ¿9*	Ï-ºïR©µ.í⁄+M£"hµ rµñ{.Óìø≤ôÄqÛÂÁªπ(ìÈØ>.ÊÃÀ äÙúôf⁄≥µvÜk¬;1ú≠÷õÇ{1Óa∑%È©\´X‡lˇ£∞Ú∂¿ ´Âéµ±úõLÜÔG˚—Ö*ÎÜ˚Vπ˜<8 Ï»„fká£‚aàû"´œΩAîß€‚éC•Ï•âU}ƒå~1Åè7ï_L2€Êa√üﬁG\Ÿ—T*`f}{¿’ØëC"FÅ	@m¬r˘Ëó£†kº¯8øÑÆ∫Ò
T]¨ÔcÊEˇyŸÂÍs∫˛‡&>N∫1‘só<ÅÈÜhìoŒœˆ	¥´'Ä¥ô]è·¸£0)<Ëíl)≈ÈÍDD,Ïg;‹´ÙJ¶ü£EØáûo9s+x∞]ﬁ∑zõVÄÜ†3Ωbﬁ‡ F≠À5æas÷™ç∞)i¬[cﬁ9¶jS,NR‘DBx¿!bf5v¬œ6ﬁú◊~¿ÕÚ∞™>©*é©RQ4’’“∫Ò®¶fæﬁÔLÀy«~X…'ŸÅÙ=`QµñXMmu(º XΩ¥<◊√¡¨öÚd0g¿MyRÙƒfZx…Ñ}ZÆ¬ÑrKsÙ¶· †≠õù>~ª¯â≤ã≥!/˛R#≥ÊR,≥…€uöº1=ôÖ+{<íR¸'A˘~Ö¥ÃC(o`œ7rnJÄúq‰¸8˛ÄâúË	E†º5ê—e†uî0MUksT≤üx¨è-Râãk;b~”Ñ7ã\2lVk=P»=@ëGs÷%¨%ºèó≠"v∏Òtòé¬·(•Ïu|®∂wº—Sõœeˆ'5D∂ +3ƒÌÊ§Ã€U®á¡∂gÒ¿ïˆH‹Ÿsƒ≈A0Ùå8Ü2e∆-éÜQú-™áÑ	@Y%Ÿ‚√ÁèÙ8‚àTâî7F˘$¡ÇÌîgÇâL˛Ær'´ÈCöVçæ«Ø´ﬂö˜FöÏ"e5ﬂÈñŸHpíB$rS≥"ö”˙"∆›´Ym">Z›SÚÀ‹6àxÑA‚`nŒÊ®ø%ú•∫i ,ù7‹¢q<4∑ä¿\çÑ+∂ﬁÛÚó{C94Ú}√Ä¿’uü1-Ôç¿@v<ç+Ñ% j¨±Ea\M≤ñLa˚sÈé¥xxI˘ñÄ¥Ä°’ƒ8çñf.ΩLJ=—"PÉpúF„8c≈t≤awÑ›ú[… #2›%èl_¶j——ƒ`SÖ7¥—l˘ø⁄€I°H_'Sö\Sew” fÏ/ƒ
oì§œËıªÔ\¢ìıß+Òâ…a—,qø4A}ÙU'		ÀE™ÍlÄ|K)Ò,ç &)ÀMYîöÄÍQã˚ôLµæ∫æ˘Zıî¡	K…@Oµ3Aì˝^˙µNKÉOƒ(ïöÆkø)yfj°]oÔv£t∏ßa7—‡MÃ˘ÕÌﬂAnˇíø˛œe<ÇﬂÁb†¸¢,†øÛ0Ó≥k¶è
«ò˜tå›u¡O˙	9ﬁˇ</ïCå>QA…‰Ê™.yL&˜LM~wút'g⁄˛‚çIÛ*7-›zûÅÍpÙ,ﬂ±ª+µß´€YoÍvúß2e9oéŒøß‘G?qe≠„£/œ˜vﬂÔ~±˚‚‡ÂŸØúYbŸ;Ø ™ª◊H‘R≈N‹…Àu‡ü÷¸∏ÕèËzu5ƒùÉZ7Ãstû∆ó¡0°˙Kõ<2zœ•K<X¿ë ∏CãÙ—˝·W¬`â,yW©€RH+ﬂöLÍñJ=§Ô∂÷’n%ﬁáá5±‘Hlø0+ÜËÆW∂0B∑%Â÷ÚYEq[∏ŒAç&åÚkob¨Œ´4Gy‰GBr–ﬁUDùüXÎzÍì)\”s~8µ…f"¨ñ∞ÁN~Ü÷H‹è√òÃÛS—∏om1zñ’f•Så¥¬§wNE)´C†ø“(å≥ ]Ú9‡uk˙∫]‡„ÛG3—y—ºàßﬁyBè˜lç/X$C=ó7~y¡6ZAZœ”‡Yà[Î`pFÊÂÈAûp˚vÚ	∏}<‚√œ∫ã’^4L:vœé¯XTíím"Qî -âﬁ¿—#>VáOçÿ;ı˙àOezø¶æùÏq≠ÂﬁıÈ„Reäk*ís6cër +¸ëZ{s√goŒkw~5
∫œ˝vßæ©˚ÔHÚ%NéÂ2Lµ·ä—åŒí9o™w™∏ø8ô“≈–:Ë~$4ÀR©HÊ—ÿ†~∂2√¯Çı"k @„)3\Óôπ™ÎÃui‘K∆.⁄îﬂ^Èö˛Ø“Ù)Éa?∑AJI˝E9y~…¶ú4π}ñŸ’f£º€œäPÉt$oA
˘‡o´h¿⁄$o¢ac?„•}_Çˇò´"›Bö≈l6=O•(v<_4DàŸ0Ï¸ÖXb§ñe”èóËœ^fBà7ó6‘
a¢çÂ6ëµ¸9Õ	ÑêGŸïQL˝Ê!ùÅí·Òî[„+„ÕıZ˙ÿoÃÄUõe˙oôÈoÇîv6œ≠ÊO,'„‹≈_é1ô;ÆÚ≈=÷¯ΩdÉçˇ¯˘&Íá1˜±◊“|Ò√ãUlNßI1Ítz∞>û∑&<ù–
,°í `ZSÿ0§’â©æÔ#0Û¡<  ;[ÎMyß4îMŸeèòÕˆ(qˇncÖÇ¯h
‚|T?™Ü?©n??ØT[€8[YHˇf%ÀcΩ∑2∞◊,n÷,√†”±P∑•JEÅﬁº;Ë∆·5[`J€T@≈ê(•@≈,b*ûï"<Z0≥Bb≠q‡jªKEN©2öê˙Ô @ù[ÿ1LËiB∑u@˜d∞‰ﬂEcÇ¢¬«\ôáœèk-ë≤a>CdSUóYû
RÜjÑßpóA3:’Q/itÿjûDocÄHÖ¥ï"a“0©byfò9}„¢$Œ‡Y¡Ïï≤e S:◊O–PRµ§á;kÀûeÃ∑k∞Æy.î£åßÇäû¢	ÈE]mƒ`“”ù¶ZbñJ7ì%6ıæ/±.õg€≠ë„Öƒíg∫'$˘≤F‡)¶∂…#Dhq]cGUÛ@∂™Qg®BKMõ7ÚÑjpO¶ŒqRFØÛ6±–t$Œ	hπ$≥œ%)DO>"M°Ω#ñ4$\ÇN
"®é"D™2FÛ<£ù”…œÑíÂ†qN˛DË!=˘‹∑a‘â˙–iπ±„ÖûÄ@¬ñ…®'$e|•∞‡PG¿gÀÄÏË8y˜‹:È™1{≥˛B9RF\Ñ¢9Y}≥±©«‰Ÿâv±ä˙∏∆áñq¥áh8÷ º_`⁄ÃÓQPIΩ}f≥tó≠€T}…°‰vvÑn¥ŸFîÔ»ø÷ò«<jÁ»nRô—A6à¬⁄’˙
O¡g@=ÃÃ¯Dåh6%‰ëÉ∑î˜/GA⁄	R¬ZaBµà@rQRåæ+˚‘fµıPêk=»S3g•[€¢i∏È§¢áQâ°^&Ωòá*V=∞óMFïwÏéMH‚|}0%Å]åXuÂ⁄I4åY—hs{<‰BÅè9ïAnÎ}∑»gºê/F›!‘|˝vî&Ä¡C/…ö‘QÕ 9≈°¨ÕGÚ±◊o}P°öÕ>yœ©†ı`V0¢5Ñ≥«ï£ÏØ‹4óîæª;ôÆ…ù3€Kç©æáY’e*Â¶_ôÍﬁò*èΩÌM~ÏÜ£ÆvéÉ Æºp◊u<êÂUk6Ï:´Ë@âì9$ÿ¶“õ¸©ŒFûöˇTGıû^yó`6wŒ«gI7J'ˇ÷ß6™óW‰."0úW ”Ú€Â{˛∆£Õ ‘Ò{9!ßRÔïaﬁsÕ˛fÌCr˜∞G5 ;ë Ò6	î˜h¶ˆÇa&‰√5›”Cu∏=!Uƒî3'SxiÏû≠⁄¨≤eÜôT 3∫•údãÂË¯‡◊´∆(OÊ%ñ2±˛váÏ©|I´ë‘Q∑≈∆ì˘5"s%Çπò†ºﬁRr7»›eí%ÁiDög∞p˚`^éõSÍ¡Ph‚‰j¿…ã.`Gìg|c)≥∏[∂7°o+Øπ≠⁄!çÜ£¥oO–¨∞ﬁ∑¶-ÿŸÆÃj6:/Ï›∆$ÿ“∑<∆‡=Ê
@ﬁ"Y
≥¢`aÿ!UïÂ||um⁄›íå€•Ïı`\D√xúd∑c
Õ¨(âˆ√/äí¨¯sLbzœäzEœüúxC@~û#Ò\øEÕÌí¯é‹Œ_)4|
 óAt¡õ∆Ÿ|…«õJ-Úû+°3ÁñA∫ˆ®©u;Nóo Hí«õ.qœ6‡Ø´YZÕ£shC	A¡è≤iV0aÖI‘8Ì@‚=[•*πi4OÑuı;ºcÀÉ÷V‡3V‘0“òJ%™Ê]%Ÿp¡ïN©∂tø›·˚ ›^˚Ãí œü“â≥‡ºu®Âå)£‰cﬁ§k€ÈFßÅTmØ¬ïÿ€«à%BLI√)•>€£›1}fBy;§‚ﬂ©‘æA«·4ø®z4ñˇﬁ^C¬ÒøÈë»˛qÌ“@"k)#nø.∆å3∏‰ô~ó4G %U§µ€SØKW‹ƒ:◊ﬁD*Ÿ˙ó‚JüñÚ’*µ3Ü£åôé‘	G˝+ﬂ¸ÓÄ^H	óﬂ˚Xmïö±Qö‹~G…,Æ∂^ÑËì!†s}•2´_:¶ø	˘{≤q˚›¨›Àdú‰ê◊ì@∫óyÓ¨ºN_ÁS“ﬁÆ\A…Ò’ku5›‰ö˛ÆB∑Ï0È≠daötªÁ¶Ì0çûtm-Ù|T¶ß!-“‡≤1†÷È‡u∫Gáãˆs‘∞i2*ÎøëÔ'?í,àGp@ãŸ‚Rel€ø≈lŸFΩÄöÏ√4È_ÓÙìq@∆l©Õæ$≠±kE©!€ã∂èÊ¸f`ﬂ:ñ€”	†v„*Œ∆-LTtQÉÆöÔ;M+˝T3jP2J›»xhÓS˚ ÖuO@MŒM["º"∂Õ^á@0˚
‡dˆ(≈†∂∑?l-
¶XÙºè˛µC≤(H√+«=áYÈ.úﬁ0ggjê[´ˆncı©Z}«÷∆\|W¸ñ◊ﬁKYîﬁÈóπ|ïŒ¬;ı˝ß⁄ˆ)íT t_€!üç≤§1Oÿﬁ£ª{µ<sﬁπaÔ‰áKºavå¢ ôØnn=µ“Bˇüø˛À?ëo‚~à,Ñf3«Ã!˛P]ôTLÃ&æ¶ﬁC% tA ÛDÎ2A8”¬àÊ{“=LSïGY&Ú0™¶JÌ˙ØÅmˆ(€Ä£/_É6æ†
e«÷Øuop±◊|_~£„œ◊ˆ^ˇ÷ÚBÏé“ªå€ÑÆeVÔ◊aÉ¥…ÿ6±„+™¨·¥>;;ã∫Âå(«í6œp ∑N7?¬1ªΩ‘ƒ«ÑÏ¬˘ÛLR”S[Ób-¶H+í´&~@π#ç&,áîÈ&êÚHç”:®ôbÍ|ﬂi?Ñå¢„†gô;°U«ÆŸÿ0É◊l’3(E%Ø4ﬂèm8‘™πà0·c®jÎœWCj^£ŒÓÄ˙—5°o«‚áßGß∏W@î,v:k/^¨Ω£3rÕ{◊IÛ`ú≠°´¡ŸK[¸qù2uPX¨ÒÜ%òõ˚5sÀÜ™MSz÷tàÌ§±?C6äsz6ô6Üô[ò˚Ùl˜ãÉ7G'˚'àsJÌ•À»é4L ∏ßxu0eY”j¨nq>Ü∑˙
áymFqÁ„X¿%\I:≈[P¸Gµ&jX≈äÿ?z0¿|ÎëÑ≥‚¢à»Õ)…X([òOƒÃ∏U£’—¨ïgÛnêÜtÄ[áÙ¯f∆ﬂ~Û±∂Çtÿz•lÚU< ^;Lß⁄6ø·˜
⁄[6Àâ›≥„qtú∑«Tì	åfYÖë%7•ïÒˇÁfJ……mK˘µ≤±d†ìß
–	P‹œ¨"é√—í@r£s√{Ü6«]˜Ã»ë@j*êíùÉ≠◊i7 3ÁuéËÏŒ)P≥lÙœî≠LÒ„’œ?MMÒ#PπÈõØ"|<|Áæ£>~'À#˘˝›,q;U=∆±ÄÎŸ&•Pb]˙N=FG2eNÚú‡}ì Cß|K⁄tH~¨òìIN…D(%1mŒ/â…Õ<Ëh_¯
_±t"◊Ân,ce’ÿ(ƒùa†®yÙÈáP`æ√∏¥è\áÙ—CMÕπ
∑¥ìµ‡=.ìÙ∞‘™¯É3ò“ç±åEDã& øó±FcGœÈSôa¬Yo¿Í?CˆÜ¯g‹GúY>∂N8“œnG,Ÿ…¿≤BGÂ„øÿR[‡¯ıºë>’$‰;Ör˘ E–•˚N‹c∂>k"´c⁄n7ûYDŒ‡≥∞~˘ßâõLìu„íx·5§J—;%L∫ûMSà5YSÂÔrﬁîMèT_˜È¶uf`ÊèØ÷»lîRG†ü¢˛™ÍJY1†ñt’o¬Rÿ@µ[Ç:ë£Ø€4/∞Ô˘ÈÏ%ºıR©2Ek†2jÂ£i¥¬ÑgÚ≈óW√
éò≤±ÅqCí
ÂËoüÚq1g6QÃ7lúI>$%˝µ †<[sÜf¨s√±—jΩ)òÁcvñkT…3Cï\ÀÌl‘g°÷Of√d
v£˛Â
w√:¢^ı∫ÚkQ%b´§±Óºå˙W£aá ∑k!¸˜;:Él)úÜØ¶àƒmÒd%«1£4%é2†IÇùU*õüîË◊·˜N‹CLSœı@É ¢°∑wÏ5ÖäR˜π<ÂyÏuWüø&^â5^‰ÌPyë3,≤È⁄¢ö2ÄÈ‘i¨/cÊIÔIŸeÎs^û(x€—?tï‹ˆâ¥˝'ÚÕî]álìP∏óä#Ùb6ïî¬u’¡ë‹≥i·D€yo‹w“î≤ÖXtb’ﬁ¡√∞√ﬁÎ∆™¿Kõ•úlãàîPéä≠L—è¨vÔ–Ÿ¬≤ˇ6@î9≠KË:È87Zónw>®∂÷fDl'r'·O™Mãì«ƒ®YˆÄ£≈Ã¿ÏyÉÿäVméÉlöS¨˙´8øJ∞UT~gTëcEGÊÎΩªú¨«òtƒH_Ô›∞µƒ[TF«j5€JÀs=.,Ø)œ
s.‹tgáA£l¶¨€∞ı71è¯…Ï¿ı-ﬁ"ø=mÇ÷?É2∏r`◊åAo∂äªN´8¶c«!3ÇeüàÿÄ≈Pﬁ_ÅÊÃ´É5êj`(œ7Ên ÇúmÃΩ@nœŸ◊8‚öOx˛0b÷X…ú–~„™éÄ˜o%U.ç…ò∞ÆD‡c“òƒ<p:LG·pî“qCÚ!€ﬁQKOmˇŒëS)˚µ·yÓòìœ‚ÅÆTm>ÇëgÃG0§)ïnq4å‚lëP%LR*HílÒ¡së_≥qªK≤7Öp†Maœ¥…?√UïPV –Ç§U£ÔÒÎÓÃj√Fwn ÃCÙØBXsßA3è}ÙE0åªW≥ﬁJ|‘∫â©‰πyÇAöåÉ0p¡µÌfY‹(ä Ãu“z{)1~√Ì«ãﬁ‘ñçÑ/∑ﬁÛÚ7{Cô4rΩ^»Ò}W◊}Vƒ4¿7Ω ‡ôù–z\YR\Õä1BQ1Wì¨%+Ÿ˛\	ƒXæ%]•∫Ò8çñf.¿jÉßNS;⁄Ae}L~ˇC/õ/4¨ôa8å®"ﬂk3∞_∂ˆÀMÎ’bıƒÓ#ëˇÛç‰ÚîæΩàﬂ‚UÖ‡ ÅwôñØJ9t‘æK„Ú⁄ãØA∏c™¿Ü‚I◊ëuÍÃ¸¬tTzøÌê®ÌV®ﬂµ·+«1‰ôúµ gìÊ}ı.‰‰Ï_ÆÁî√Æxî9“µ Y}Itg—oQt’·9\z˙ı-˝⁄ïà '}=’ˆvY˘…≥∏s?Ñe`ÀJŸ$¯ÕÒ—óágá{ªoéwøÿ}qÚÏHîfPÇX
3\ÆlC∏›"vo*ÂK+6)ƒ‰}Ó1ÏQKo$œt/ãFÎﬁõMCGÁi|@_Ñ†Mô‹ƒ“^;ÛéßπÙºô6O´¢âú1úk5˚•©‹jx™Oõ¥ºÖU´w'âà
.`5,ùÛ∞á±»ÊDÕ™ÓŒ5?YEy–”Uct+˚l±[ZVlÿ~ Ø^≥s∞u—ºc∆ÌçÔô'el˙‘d81e#ÁYaõÎ®π≥÷Ê‘àaÚt˜kß≠Äõã∂ÂV‡fY'÷[f≥õaõœ¶+å?hπ¯‹ùO	Ä é≤÷—…?5’Ûì3ı´Ò2ÈæFíî™)«πë1vTQﬁtos+®*{÷e◊T‰6ùË1ƒ-ûÇ™ˆÛ§´o¯∞˙ºò˝+™÷?ØŸ9^·ı# …ó89wøxﬁ/ÛÓ˚7Cˆü∫YºªÙ¿≈◊+õOÓGﬁ± {ENÇ∆Uº2uëúÀ0 ﬂê©∆SFÎÔô·™3ØÕÈBi‘£Êëù4ÂÉ7∫¶ˇ´¨h-Éa÷2Øø-•1∂Y~…¶ú∂}ñŸ’f£Lg€œäòÉt$¬≈–1Éû…£7	7®väÇ˚:
éπ?¶ﬁiP© LGøq[à·.¬X¨A¯‘£‰)b¨ñ¨‚«G&âá/3Èƒ…ûã!™ˆ3ë«≤8»Z~Éú–“…cJ∑˜⁄¬?ï2ÏAn<◊¯⁄xÔ-UÊ7f¿ûÕ2˝∑ÃÙ™9Âçô] :∂)¸≈_é±ô;W®Ú≈=÷¯ΩdÉçˇ¯KΩŒŸl.÷ˆŸP”‘ã‚4)FùJk÷á{à˝≤ﬂc @ ˆã„lâÓÏtå≈41„År‘÷zCé*çdSéŸÓªE6#t[π∑À∂B£|4çr>∫"’€ü∏kÆŸÛI6‰Xv≥êÙœ`F¬±<‘{+qpÕÚOÕê:3q+ê~T‹ÕªÅ¿u≈lú∏∂\
ìiS¡d `ÊD1f\ÿ@ö,Iû	Ú‹_?≥¸xbMëo‘2‰±km£H´y-aÇMÆH@∑c∞d/”V'É±1Q◊`,LRöTë≤!/	}¸	èp© 3+D*BYµwŸ“˛gÿ∆ñ$¬;.–ôézâ»∫à˚AóDoc åÙrÒV∆éJû9>•Ω?E≤èa†øΩ¨üﬂQπêGŸ∂ô¸D“ã2∫ŒU#Æ‰qÕiñáõ≈ÚzœóW«≥®∫R% S‰«IiãI∫;Ç(<§∂…#¨p]c«ù∫Û¨	ø ‰YfL8	3á‹âˇßœ"á¬•>“&:ëﬂäﬁÜKK.{A'©SGÂ!fq©∑◊§∫√‰g“Rêuîs∆I8˘°Ú‰GX≥0Í@œ «`
=Ó ,ìQO«¯"Jö∂ìœñÂÑ–qrú‹2å÷î•QkçŸÆ†BEÿ¨o6uï< S–nVû÷ò2éı-√z∞l˜ª˙LyŸ√˝	∫ß∑ßlv†™Óf∆U¸dmq‹Äü–k6€ÄÛπ”≥úG≠”πO™ù8»Q]·„« ¯à0h™[«3
ûÃ¬¡[ ı¨%UJX7 ^z»EJä—~Âù⁄º£v]	rÌj÷|tbÎÿ“úïN*⁄∑î∏Èe“ãÄs®v’C ˙¶…Ë°2é›Ö9◊¶øˆ I“@V“≤vcV◊ÿπ<‡CNaáõFzœÒŸÆ!6k'a»ÿ;zﬁWoÓ}mN…Õ¯˙≠*¥≥ô†Dÿs˚\Í6ª/–·*C?¯F∏öt?(7œ%ÛÔNfﬁpÁ|∆∂◊CÊ≥ÔaÜM˘Lπ˘W>ª/>ÀCq{ìª·®Îábgà>≈:+ºhZ∂qüÿvµV©bßgÊ,õgª=HHoÚßju¯NPM÷gxzÂ]Çx‹97ü%›(ù¸[ü⁄∞^NîyàOóÃÑ)·òbΩ}Ræ˜oKbNá≥–À…8Öa†Ú~€7kí”∏á≠Â ‡Ü®√ì◊tÀPè„·Œ4¥.œ#vÊ‰
/≈ﬁ≥ıïU¨Ã0#Ö∂}@£TêêÄË¯~≈ﬂn‚·—ùâP ƒ⁄É∑Upæy_úö.m5>Ù@gR˜ ∆ì˘u|reèπÿ•ÃRñ8‚eí%ÁiD'øp aBèõ•ÍÅ¯(èvu<‰ıa–…3¸7≥‡Û≈µº}g/ÿ (“h8J˚ˆœ
Á¿÷¥5B€ïŸ“F◊àΩÀìƒ[∫®¿≥⁄£Òñ£µWÅhZd]±Ù*∫NÏ´ ®r>æ∫ÓnI∆m\ˆz∞´.¢a<N≤€é1'gVîDã„EIVÇ∫¶4∆‘gEΩ¢±JNº!`ÁŒëxÆ_ç¢Êv… ®z7˛Ï/ÇzÍ púh>6Ö˚í7ÖñZ‚˝÷QÁâ
∂Gm®®¿`ÕL¿…√MìhÓ◊ÖîÚËz˛A|Òﬂ£lä≈Kÿ8a˘Á.¸   ˇˇÏΩ…rYí(∫œØ8bÁK™@p–PôîDDRôÏñDI©´[•'Å ô pHÃ˙⁄]‹’≥∑∏◊Ïô›’KÎEY-j’v≠ÕÓÊô5ˇ§ø‰π˚ôá§2≥™õVïBLg„«›èè÷r¸e-–,B<«»cX2ËàBP‹á⁄Å˛ìÁ<‚"ŒS†D ÷u≥b¥R·ìÈ÷–ûn¸œü¨=∫√…>:iüˆíúg‚¿Î √{ÉEÌÙí„XÛªπQıû Ò¿*√!◊
¡<ù1P=J¨◊>ËdÄ9x*äílo„ï/æ`Œ≠&»⁄£q¡#¶@&oè]™m˘q'«dLoìº@ÎÈÁ˜CygÏ◊lc˙À_RﬂπJ±Ô«†ÜÅÎr_˚˙…-ñ∏Vôú&iriÊõ¥@Àxõªˆ9«ëµ5ˆ
3Ï≤éù$%zå£ámÑ5ªÄ»m∆"8-&y∆“sl‡¸—âY?NQ+<JœctW‰◊ÉÏ".oø√È!„©HaôP—;(ÓÈ ≠˜ÿÔ@GÉXº+ÔˇÙ?åˆ·;Œ†%¿H›≥/É@b,ÙF9’l
ÌXY»∆‰i«πﬂ¡p˙Ar	¢ƒËI1 ¢€—ª2ÿ6”éQ†æóåÑvzK≠9˚Cbr4°-ó5§⁄ ,Ô% jÊY3 ÛP©›å;ÒQËCd„/¡P‚^O+ ‡{*†s"MÒ^esSÜ#@Ã‚≠@#Ø™1»˚P√Ó∆EÑ=÷ÎMËlEqÉùÆ∆r7≠≤SÒS˜Îkü–¶`iÅDÏÈ‰ﬁΩ2Hs∫"µAﬂñº®ﬂÎ°á
ÌN>‚ÃŒ÷&d‘k¸yÈÊkrtú~úrﬂÁï¢Ôê≠“ºkl V?1aLπ®.J2´È¥j `ØÑ“|:æ˚3|¿K#r*º“`rïcJÅ ﬁÒ≤mnÑ≤mﬁw
'{94K›“KÍ}W∏œu˛‚ﬁ?€íÏO‰úßkˆÊ¬º≥VIT†\eÔ5(j,äÒ®XßB…µ Û⁄ºnÁìùÉ◊'G≠ìÉ«'≠ì7«2ÁÁÖ`iÔ1U^LŸø˝+CéD¯ÊYBV»Qt—lQ%ù÷éíùŒ⁄´Wk◊«æ˘f´ﬂØ:YVyAÖS¸p…`7ªÙ≤XÖjvŒ¢ã@’—
ªôB 57öùPMâD®Øô}w_,ûP—aÌ>7ô∂>DÛssòÉ[>˘úæÈK	ù1éôÑN–7˝Ö$tÂîM4ˇÅ¿Ïm∂Å¢"◊EŸK\:™U‘]sÚÿÔ®hz%4ÚAÄF.lÀò]lIoVÿ0*¸√”êHwOü¸√ÀΩcW§ê;4H€J˜u∏⁄Â¡GÕUü`CÕ[ı…Ì~.ÖUi)'ﬁÃ“Û´`K˘±◊∂,¨ˆGhœ⁄a51ñ#»∆h∞HcI◊s“IáFx3I˙ﬂ·ÑˆxìÛN»Ax^’„~~M€?Ú˜æÛ⁄¥˛±ÑÛÕÇì8üëπã&Vö…¢4@—?	“ÿj' ¡›–µõ.ÄB·ÖæÜaf
:ô^†¥©‹V2%˘πuÁ°f_Êmô¡Œ‹ìA6 …ñ–mË|Ì¨óÂÖ‘bÖ«›4Èu¨–> ÉáGd&aàzYUü¯Ñ∏¨ÀI´2
ÃˆÁñï¯˙Ò’jwı›√á›˜°w÷À.ÅÖ†ˇ8u@RÌØÌ<ÎıN„P˝Ω!"Ωç∑·lº/◊˝‡
æ°t¬Ú@éàq’hy“ãÅÇ»ÊQJ‘5Í”„Xmœ:éS≈qFQ’XãúGÕü√äw≤&Ì•<ôICüˆ€#‹ãXu%9„A‚Ê óΩ>uáÈÓÉlpî|?Nä—N÷*~çÀÕ5·ÏÛÅ)y∏Î±|I	Å ÎKX‘®VÛÓÂyñsÈÂ1õ⁄ÉquksÈ—+>∑-,TmøH⁄›rıôjˇ.aà’.=€~ßWòaÖﬁ;WFŸ‘‘h%∂⁄Ìd8Bm#æóˆ
G“ıp–nty◊!Í∂‘ªÊæ∞quN9‹˘™|\ñû±Ë^Z8{¢ﬁ)Àóﬂ÷·˛
ºyñÇê≥ñQy)fB^0®øR[|:π¯y>r‘õO‰FdÕı5VÙ§~Ú2”|ÈKˇ8©¨“ÍÏ«@hBw…PÅÿ2ê
™55
°\ìá™íìuPÊsYœC5˙	¸@≈å{Ωsˆó‰ÿ˛î}{Û£õL‡I¬äqX6Ëíéµóùß‘¸{∫Äc ˙	©S·ñêˇX¬Œà42ù‹Ö´üh}l∆•Â™ı™≤v! UóÕ÷ShiyÃø°2∑◊2˜2Ó-6;;êVÖr<Û)ü2üDdV?Ôl)}q¸«b≈¢ØøKÆëù!Löﬂ%◊\àﬂC©∏V|K‡ú!Iêàï¥ØPEùKZóE™µT˘ÂL©2X©zNÁ€<≤{M,^}+ÃLGx”[uüYãL‡/´ÉSM7¥_âﬂbêÖu\üT⁄™Z\WÍ˘4‹s∂%TæŸPé3V^w‚¶íÓ¯ÕîÓnãÚé∂d{yÜÙP^wp÷6√XU&Ùßç)÷ \-ÜÈ ˘*˘C«∆”pÍó`è5.≥h£nMã3âhÚZ@◊uwÚ-´›M:„^¢,ÁsââÅÔ*ÿ}ˇ}i°˜d∫÷9l0 ÅàöΩ•áBï„·=Î(^.ª)äGÒ“úRïƒCZ•Ñà5[kªb+ƒ4ﬂVºCU‡HÄ≤…[›B PIÌU*?“{.©ÁZ>8Ç9∑Mà»ZTGî•aAò¯≠k»D„kt®"Æø≤[y];™œÎÀ$-º-À¸õ)µ—ºU’#Ç¿µSJ.Zßa◊<È«)»∑(ü›	‹å}Q∫ZêûÂW˚®29S¬æ…ƒAïπ∞à˝d?$`ÎM£¥ü¨B≥qœcÆRéT∑Ûd!˜Sz÷·(E_πÇ≥◊Jâ0ø∂ËR,‡6øN´ÇÔÃíáJ§°ed!≈]L¥·°GnÛZ$∫7kÌDj‡‚z–f•aï0x@Ø≠±ﬂéSXq∂tìüh1ôœ%ı-ÊxKãùø#¥√P~ñ«C†±˚EÃõg≈ëEœÉΩ`yÏ8Ô4`Ñºíß9ÎìÎK'—âUÿ ¢„~}ãËÇ'm≥˝A0œ„ -OBi°õA∆Naù3ﬁO'Å…„fÑNF®7È„—]à\8M’Ò∑c¯oìùóŒÛ¯"†$ÄˆyåeÁC<¬–’+f=ÄÉ‹∏€ñÄÙê√ê1À≈∏[7fÒ(Ω ∏u‡8â_Ê	Ïﬂº@˝`òZè]‡¸Y‹éO¸X{≤R@·ÄGSX|<æù ®á£x∏«”E
RË.wü4
œÇº'XôBù`Äodê]Óô;:«„ñˆèé…ˇ,
˜oMdÁç]€TÓ$Éõë˘RUc<ŸxÉ%t®ú¢◊eúB'„a|
Ñ∫yñg˝®F†,jı&_ƒh¢GÒ·ùﬂúA5å’ﬁí≥ù÷õ…˜Q-Ì‘x£7ò
°ñ¥8D“òv≥ÀV/…G—«◊h9ÀR@ï¢∏˘3fC*∏¶Öˇ[Ëπâü7˚àÁ…Ù#Ù∏KŸc8ÑÔ!l– ÉˇJüd÷Ìa‘ÏÕ&ÖC·~cô$√˜l´Ø®ﬁ˛ ç—Y.¶WrJë¯ÉÕ‚&Cª‡4Ó}ÙØaæ'Ù{Ã.≤fm÷D¯:ãÂÄı%èj¸kıºµD (áFµ∞-c]ÉK]¥z=êíÇªÖ]´∞î÷Ÿ
‚=“˝–≈	Â∞aPı0f ∆>N`◊}öÇõæÑL_X$–@p§ÛL„XD“
ü∆ÈU∆¢≥ﬁ¯
ì^Y%znqî:·N%«~iOô=+´h$r‘Ö]•˙œ·óH1Z†#-«/ÉÆYŸêdi@Ì(Ånv	(Ü8ÖA@Â¿⁄≥Y#±(…ı∂àﬁw„À„‡l†√/º”K˚Cÿ„N∏b.vÑ ¡Ê:	Y¿l¿≠ √„\ÅΩF©&Œd∂J—ö]•˝Ã^ü9Å√ıJÂ/õ"$jßÇ0‚æ¶@-SòPpØ§5A0¸GÅn¯˙‡§9	C50ﬂÂ‡QR0Ú_9¯ªVËæI¡S|@ÏâŸ,)ÿO!Âá\	#¥∏BÓÊÿêI!‰`:]TIC‡k√@kê˙@ 	–”ä’o·Âq-+î{óœ1 ÕA≤9⁄€„à#€$â.nwÈ7
Ò˜„dæ`_#tÉÁÃ†é„∆™¬÷
µ9/≈Ù Ëdr∆Ü√}A∂îÜH©ﬁŒ∫“Ã!ëﬂ–∏C…ıçvíM÷:œ4$˘¶S`ß˘pπØÏâb0∑	ß`È∫˘Óçﬂl„A;fg ¥úÇ“A;œÑõ%Çò∞x{f∂,ˆó 
Ybè;ªˇî|~j…«]ÅEÑürIgœiµö!..ÊÓ•£•;YéykÊö˙|=v“º›KîÒ·—4dª'≠◊¡ﬂï®øZåeçáÈ’osÀ"0LØ»8q
√‚8˜384üd;]‘j±ï›e`Ã;[ÃV˘=∂[ÉW·Ëâ~?–“È8Ìu’ù»†ûﬂ%◊[zthãmXOÆáâÛﬁ2^:M∞⁄iú_£^«|Ÿyd|ÑfNÛMº6sXl90Q/Lgá ôÀ®≠.ˆ¬X®2∫ÿØ˚es—g˛ã4fá˚ø≥Sû›≈A„†*è
´∑≥^†HV§
hıúV.Wﬂm~I ÷Æ˙ÖÓèN¸´„"âç]ÿüó‰Á=ÀÖUáKxª-Ìü≥"o?ù|ÏéF√bkmD˘Ê˜9Í&û÷_ªÿX„A&´ﬂÁ0◊N≤ˆå`ı‡·˙¸ˇd4OÅWŸõ£}î2≥ÙiÙÆcPpãß+ø=1´Œ ¯Ì •4a1ÔÏÙ[`¨´(a≈hãÃËÛ$?Ã@åª~∫2»VÂ-ﬂ(ò ¿º‚f1ù∏)Ïùr+[–r∆1 gQög´òΩõoSêÍ L?}k®LJiÂb 0€âﬂï9Ç‹LÀÍ9û*+-+òcÄJC≥ffS˚)∞PˇÇ(‘-Qáù›¸ã˛	'ûÙº;b˝:@N,nΩ"-BﬁZ%˘ﬂ Bq„*ò‰˙ÚÑ$É¯é¿#rÓ•√”,Œ;ÕÀ Ñ:"k˙•:%üÆ®5—iò∆ù¯ﬁJ8πMË@·‡œÍÜ]'Úä¯ÄaÊ
ä4™Jë‚ﬁ˝ê]ÏNjE≤∏=J/í≠é∆¿¢ŒËÏuàô`>>ïïà¸πëA

s`¬Õøt“ÛåÅ‹«Á
ßÃù¨ƒ»˛1Xb`ÕâA˙SbòV¥Oá¬VÎ∞‡^ã±T§nZ<˜æ€M–Ï(|œp~;√,¯M©+òˆá€ªj˜∆∑~Ó`™›¡¬ô6êœ +y∞|/â’[õﬁ—‚	mV~‡Á˝ÕÄ[øÚîQG_ö˜c-'ﬁµ/Áö4z√ íbRÚví"!ª> 8Õ&…Á%ÖÌ∂'\ØótPÉô/pSnïé0C2ˇWﬁ√
Ωtˇ€C„5/‰¬5j§:+»_ú%È(n∫˚kXâ‡À:È.‚<Râ≠s:ê8#14ıSî∏à¢á'[zh§Û√≠üú‰q—ùG£¥'ñ~Ç@G/H>‹©ö	ÁÄJ∆ö„ê˘f(Û…æıÜ\!IFÑ©ˇ,EºÃaR‰:êÉeú8äW¢n‚Õø04àƒpÚ/h√¡ˇs°¶1}ö◊d‘Ì5††m2î
ìm;Îg¢ê#Rtî˜cø˛byRó˘≥èâ»’ŸÓueMg% ∑*∂Qôzö]ß≈_ËHu*0„zkÕ°phIF›¨”Ã·|mœ≠èx∆6ª!¨ˇd¥¥≈Ôÿù5†'#πõ ∂π	ﬁx%’∏çp0•£`DW8Ì|näøY7™6(%`…Œπ(ŒÇn8ú}ŒZúΩ’G°sÎ‰›Ñ• »∆µ£a¡Äjl⁄`‚a't—‘iº±+oØ¡æ≈ŸávéÜÛÂxÄ{g'ø˘=Ú?Íê¡<ç0¬'Ô…$—/…m§<¡QüYßä [Z
5ÛF˘8ipœ–-Ü}q‘ü*ú¥!$˚S¨êôñÜÔ|·0µuÉU¢ÜNı›Á&◊ù“9D¯Œî3“+Ÿﬁ∏Â5ÄÍ¥|A8T$–	‘h	Ï∑pI˛K¶±¶ΩÒV$÷6cÜ(¨˘∆/î¿¢À˜w¯N¥√˜“$÷nò¬VÜfŒWﬁ„U”+ÛÑd.π“¡rì¢ÜIóô6ÿFEÆ/…Kí‹_™$âÅJÓ‡\Ã˙èI»%:9¶‘7∑#fK%¥¡|ÂJˆFÒ0ÊŸ÷oC∞Üâ?IÃΩ›≠6Ô|øªÀ˜K›“≤H@¥≥iÊ–@NéOZ_Ô}88⁄›;"ë›W dFQ±ãdFî≈˙ŸŸ1ù≤]¢ëq-ÌºüVÔ
 6¡Z^ˇ!âòë¨˚V$ÃJ˙"`∆øPÚe%PgQ1>-FÈhú2v§f°~“f;Lÿdívìe÷ˆyâûŸ€]ì<gπÔà‡]Ææ√Z—∆˙˙ˇÅNy“Øø_ñ“1Ô∂	‚?•Ùâ¢C⁄√ÂÙªÀG:Y"(ºW0ΩzËªS∏ﬂ2»l{‰¬úÙŸÁ3îåßÓŒΩ3-∞HÜÖq⁄Èê¸:À=|™Ú3ü8æÉÇÔ·ÎM3\˚Ÿ3~/«//í˘‚›ànõ˘€< È`¬|zJ!Ò ∑ı∫”€i‹CDÅ_≈£.0Ô´hΩa~≥Jr?KãCÄ.Ã˝EË%˘á?0o4C˛fm)ØAïZ◊ XÿsP$÷¿Ò.&KÚê«‡€¥‡û∞9∆ÿßßY¿c∞w>Ø«†î
Ó˚ ˆytÆ”ã†Dß^¸i0iK8'Vπ›ﬂœÿRm√ßıL;Õ>J¢’/1,Úr‘‡®QS∑ho„◊7ˇõ2ˇÎòiºGÎtÇQØß„¢MuÇåDÓ®ø•◊Ú!öÙÁ™'» r‰rN†%N›<´æóÇy›∆¶%◊ƒïíaÂ}~a @Ì–àpg¿†ÄÅ¨@AΩü˚˘õ…åµôbÇø·u8)åëÓ(X∞*˝ˆú˘oNX∂˚p¥m3.ÕgâÃÁ%éâœ„Œy‚*ÉÁ…!ç>æ◊∫⁄e jDè+|≠dxF6ª˚ZΩÎ‰êµt‡k·L”fGµΩWé=G'îdÁ∑oˆOZª¡ƒ:8€e| ∆Îw∂\ÉF	Â	í¡†ŸcÌWlË e¢ïûEV˝f-a°üT6Xaµ<øçË§˚†$õE%&õN•òXˇ%81≠'k›·NÉ%ï&b3i)≠ÑêÃÁ 9ﬂ¸sVsw}YmÄâ’‚aÖﬂgee)+˛ìù"ÀÜ”≈ËEûı¶YîôiÊ†Èõ~:eÉt[I	˛—¡l	(Á∞⁄YYÔd# .AZç2çÂt YárÂcﬁãÒ •`◊÷˜&ôKZ)±’†ò√#æéø7±≤5ó}X≥`V–kY±ÍR…w≥¸Óc^E r‹KŒg`åaëÂ’√ÓàÀ{˝ 
ÚÚÃ<\◊9öÕè	”C$d°“Ÿãí±}@Ä‚ß†](œîŸ˜-ë.õÙ)Ë‹aûu`E)°r	ÓÂg§å70–ŒUΩT1»åb9‚¥Ù‡Ï¶å≤î:’E±˝öYûÜIG£	Œ°	;w 4‚zz≈¯ç4„—ﬂä:∆@Ù)QëàRQ≤å˙2Ê!‹®¿¸
%¡xÀk∞lg8#êJù8õ=%’Ò®˝¥cdUß≈ñ◊`ıfT>u{¡|Ø_ôıb(ª°Yì
>#V“∞¡…ÙWL?ÿ2‘Âπ™À§<õ=•ÄB∫îqCQ?…OEd¬»èŸ¥Iëmå‚˙ÜplkÓ=7Ôn~Pπ-˘Æ<üíûbÊû„T?dyù«Øô?Û€†∆L|_@~äªŸ†⁄M
Ù°À◊ùu™Î≠œÇŸ*U|˜·Ù…¿Ù$,$ÖEçeQÓa) qûÃƒµròï$$W`\6mÂ,–-ã`Ç j¿àTï’85k¢¶Ò ¿8OWêØO∫9ê^ƒΩQLûäÂ!ùÛAJË\?ª
ÔÑ£¬éÎÜÃH¡+èÕ	c4|îf¸T™Ç≤Ö-Ä>QŒ°ã&°qOØ¬VæR p±v2mïD´gÕ≈⁄•Ñ⁄G’“)”*Ωm≤…aÎ^ÌΩ>˘jÔ‰õÉ]a6ˇpxÚnÿÏì#U'ìKØ!¿œCÂÜ‹6x+¡fÒ“∞¥U˝]’ÈxiŸÖUa˜LJ1ü[≥ÛYXd6`-Êæ¨§TZ≠›%±®<~áÓŸ7Q n	õº' ógk†"O¬˜:ò,x&(M!L"°ˇR´ûNÃL(Ûÿ/PœJáœwÜÓú∏J£çSª,ô`®ò˝ídõmuV˚ÄyHó1lp256Lî[-vJÆ€p¬∆dá!$*IÙÓqmÂE+“Å„≤º»WÈ0'{çGàÔb5JJ@Qó∂:4 à˝>Ò˝|≥3kWÕ3Î˝~|ûÏ∑—›Áßõ∑,}%¶NcËW üíÈøH{dÀ¸gèuøJßÆÀ}íÈw„h“ß!@¡Zâ%:{ØVb	Ïh¿pﬂçGEk8,áû|cyÿU:4)ıTLéMœ9µ“,Ú∆uU`µı<ö>˛Ï≥µ5∂∫∫Jt[;'«xÒYr5ÃÚëp¡ö q{Ñ„∆‰·M–8é÷rQﬁΩˇpÜ"≥»6‹àÖ˜è±Ï2Î.íhû_ÔSÏ˘¢œ·/±):°Ÿ›l1ÒÉ˝Å!wz\“Ì3ˆDÆ˝Œ+(øsCVÊ‚Y¥¯MB…ã,Ì<é‘hhKWÒÔ≥Å— c6D≥çºXõÕ:S≈6rc
¬ÜÇ5 ô_}†íÃ§àÓ(∑¿I|∫ÖWGY¶ÔP˙g!ëOzŸÔ∏O ŸI •eÅr˚°·èr4%ÄÕqÅa«∏Q"|»÷Ô=VCz'FNÓ‘#a÷,ﬁC)zV'O`JÔﬁoGÔﬁ◊çœê®“Ç¡W/˘oÛ£ΩÕ˜”B•"hp9um}ß≥ ãœ@ﬂ•¸ì’qa}2aò·_Ïú`ƒB„OL◊„?€√≥Ì¡[qE…◊:I—€"•öËW$˝€ë(⁄0“™õúbq¥ﬂ÷Ÿm@∏Ä+°∂ØØ+!plìä8%gÊ∫¬ÂìoN^Ω§g{Ω—Aı˙œOãsÉ}áπYy]9L—IÈ$eºàÚ»K◊ó¶çÁµ0ˇã˘Ó·›:K∏Ωã°¡PòüXøXo‹Œ≥∫áU8#≥ËÜµ#4
wû»˝?a@ÙGª¥$r„∂y"ºGyÃHCß/qê∆ï¨æCC>1øa”ÌÌhb≠∂/’æ±ÃÔTçòo∑A	û‡iØ‚!ﬂøˆΩ™F˘@ΩVœR‡Cbd|C7‹M[äâºA[
£yÀjIﬁıi µ£(ë—êægµ§nMQ±à∏«x8,ãÚõ?äo◊‘x÷^√Úu õÃÄÌÁFœ´AÃ®;√ô•…é3™¬ (.™(öÉ=N⁄q÷¬Ïÿ±≠q”n-S”®,k≤B#ø‡êj>å·ÛΩ≥3Ã[k˙üRÓXsıûaÜ[Œlÿ`ê¥Ôcñg@;Â´ìúWè]•’≠˝™∆
‹ˇ@âxÕ1Rﬁ¥àjJÅ5jöoΩI'|ÀΩƒ¯ì	ãã6ÁQ[å»êT!„4G›dE<ó∞`å˛‹#ô^&À£û„°|zî]÷e¢Ugv∆B-:=|£ìµ«¯˘ﬁ@òjØv∑5V34SıXOu⁄∞7=¢Õ{õ´ºL(Ô§kﬂæWÕ_%•N‚º›=IÚæEÆ’]´ëå›ixŸÛkÎk∫Cüÿkêı⁄D˙qÅ¶V˙UàÇ'µmkIÔÌ XLAß« O¬aµy3¡ô∂ñ—˝ ÂôÙ.ÛÎJ_gÒ=˙Cã1¸Å˜ƒp¨{rd÷M5»:πv_P`ﬁ$≠ö(ö_l±˘``  ÷ËBL–HQê„üL˝|ô¿>kaÓsı›Ñ—"‡1H)Ö+µ8ºÖò›ÙBà0≤I¡˙L1hî‰Igüt§† áÙ*Èg∂ π¢:XNˇ±ÅF–P_?“HﬁÑı©‚ÃÀÏR™‚+éüÈ¥Î¢}¸ß…µ…—n*yî‘∫5ß¡f:h˜∆ù§¬;	≠Ú}˚1Ñ©à∑`KéJŒ÷0<4©uÒ˜È®Ë∆	áÂ%ºIRùÏâÔí"ò⁄ˆ≈–bãôB·ª6R2ÿ)í¢C;ÌÆö«q=-:⁄Û≠≤•Œ—bW´4√£–˜îpA’:mjÚçì_Ø#—8I˚0a∂™ﬂã+ﬁS±|(|≥Œ?√3·›@ÕCÁ–i‡Å”õ"KuHÚs®C„ÅÍ∞ìú≈p&X†£ÿ«,"G	)rø˚ÇÅG»·Ù4¿çˆ V&^Ω7iF‹;ãO™BUk=ﬂŸ›{Òı7˚˚w/_Ω>8¸Ì—Ò…õ∑ˇª¯«Z≥ˆ“ëÕ’zÿ~±õ√l áÛ¥5©éìëƒ—¬@ı9w◊ªu‡ˆb[>œ≤^ÍÊÄπ·IF≥CNA√∞t.7–Ä0Î©∏‹"‚¸F?E§Œ∆#'HäèÇW√Cû&ü"∏°~á´Ø®1E,B_™_ —†≥<›"†È^àtSuá15ÖÍÍùöäÙ¨…◊`ƒ0T[;M∫ÒEä)%jE?ÀF]`¢Tâo`Ø5ïåê˘·∫‰ØzYπ™Ö2.ëùdˇÚ´Ô˘"úVß06 Øùı‚≤Êñ8ﬁ'}Èù>ªVáñ”NÉI˜fÇµqIú©∆Oñ0ÕO·Ç	¸{ﬁ¿`!›{n1Eå∏&¨÷P ¿§"ÉJ∏î.ÈXÊ∏”s< J˝Üˆínö≈ÏB?” 8G†¢Z®RX ‚@Sa≠–G’¨á*¶œdÂU<TÚˇw;Ú?8æﬂ_ŒÛUdè_5Œ≤|/nw£®≠uï÷≤ç´rÎyí±üìˇ⁄i§è¡⁄Ôw◊`∏V='DÏ¥.°Ç",›4ƒcö˝*t†]û≤/ÎhËS|CEc9m©ˇPL4Oæ`Ç∫Ü,;Û∞µ^
¥ã¶µèñ ú—¬‹¥ƒÓ}<"¯®ÏÜ Èπ iùKú≈õåÁ.ÎŒ*®ŒÏJDs÷“ÑdÀ∂YË¬^xfÆ‘Øü≤˝hÍlc£–Á˝’U†p#Lxt§2ï€íÙ!Óõ]∑≥>ÃÆçuxXÑj&Çs6÷Å™î†=YΩ˘QÚ∏GbníÁbˇô§Ç&%äj{∂!zŒn’®ìÇKu·#˘±(vÙL÷:"å¬é0q*t‹M⁄i'´Mı0Å«Ωûf4ñd÷ù
éW¶˛2Uw‰Q!Tsvmç=ß∞‘ìÉ›÷±AÁ#,1ÜE‘
,[BÍyQ@ÒEñü·w∆J¶’u?-OKu8.‚öZAUV◊≈”E_Û+À´a†◊~?–íì†T¡ö©pÛÇLYç~ÉnpΩxÉ≈?Á"n›¿ƒEﬂh5÷,ŒmO@Í≥´ß ﬂr'ë£‰ÎÔr¡6WÖo±∞˛ãS©⁄Rë5óü~&õ}7§CÊSYW}ÿ‘#!*∏˛ÿ®£„kË#—éÊX¡2rk
°V$ a√§237®@R;Èy:‚±ñ
µ¢~gâÏÙ—ËåÇnè÷vww·£3^ä≤nÍìãJ–ˇO	aÍÄ2OÄ2_$;&wΩ‡¿QÊdÆµ≤aERõ˝ëgiÛ¶õüWéêä“ª;Úê@V{J}πéËÁ1ZtFà}Dç•óA‚ç€˝l
eêyó>]îÔ&SlsqMix%B›3‰.∑\)=/∏zMô®ÎÃΩC%ˇ4\/≠WCBwΩ!ªﬁ0]o‡\oXê\7K ä≈Ù)Nœ¶í∆K—ÁÆ§ŸyWddπhöé›É„"Ìºg∫Ûr*æ(œÀH…¢í´†ã«ıaåi‘XiXG˚Ä⁄“ÕBøf´Öån
ºèp∆f◊zàÿçı∂X¸¬LŒÉP !¿√LºBNÖû∏Œo)i”c—{¿-€£}Ó»n,Õ]aéO∑Ò+Ê«“o'PÜ™†@CﬁwÉ‘ﬂöò\gÜ∏hJtB§/h]ı'è?≥wíK¨MUÒö}g†z≈õÕ·∏Ëö•…}	O>ñ8◊01B t[
'ïXáµ«≠›l6åk<Óc¸Íñá<<XcAJµıÊ∑Y:à–$J{≤ÜË)^◊Å’–ø®¿4(" ˜∏µbõfjÔ[£Yz{Îç∫)ŸYÓ˛à¸7È†ìám	R¬íä∑YØÎ„M§L∑Ú=K+ÕµÅ‹˘}bıiàò xr∏=Ê»˜ÒÒŒUgºï˚ØãgÕwÎÔıàÔ·Mõcÿ>H’*∆”1Ír%ˆcc∞kÛ¯˙9=pÖOLôá’;„ºê¨¨¯]Ø∏äx;ñvﬂùG˘˜:t≈ﬁ≈Õè=t¡¬àR·±$õA⁄Î∆M∆´m`}hñaçtêÕ)ù`÷‚BT. ÜéÂù+UÉÓ·+1H•úFµÇ±†„bœ“iŒ”±Rn´àó¶ﬁ9|±∂Û˙oM]Aù]±—@N’{ÉáØ‰
ˆ«rjHq6îŒo-‰Œl©S≈\:Hc‰( €4$8»aœØ[Óh˝‘,Ët ◊eÁ
Î,!èÂ*F∂8è˜Eíß\ÌÛŒÊ˙%Ö5Æ++Ï˙íMùoM%ºÉ∫J‹Pæ~R¿.U¸xAïd⁄Ÿì(@Î£‡áı9µ>T8	yépUèF£∂Ú—°`ÆF„ã¡…î!¶,A∑!±`º¯∆¸¬•Ç«@z
πhŒB°≤w8ÈôFh°x∂È-™	è”hõÎ∂ZJÈ¯Áâ5TNFÒ˛ØüÍ6|d†s'–Í[~VK¯±Ò≠ª†ìYu‡Bîb”£àZvè1≤vªt9} 'SµL>ÚÛæú:y÷»∑’ΩEÁ`ØøúÖl©.ñû„ «œ'∏Sl’™"…;Em¨¸–¨>oµNSU Ÿ0NhËÅ—^`:Ç≈⁄>>,≤®BÖè — zèR&KÅ%)Ö	¡√‹3&T‘6ƒûEó¶dí'`4ﬁ)A’˛öì√UFct75˙∆ Hø¸~˘ƒÍj*≈lÎıÕ=∂Éî$,ldÀ¯ÜÔ6†ÎR ˛˝†Vü:çb$7V=ˇ¯˚A≥Ÿd	#ı°˚“*º4˝à.h5hﬁ~	Mﬁs,©ƒ=£ª%-> %}Aá¸¸élZ6Ì≥O|È:Pg°ª≤4,»|§ÈºË$|Ñí¯c«nRb21Âƒ∆õÿtíÆj_∫Æ8É_ıÊcu5P∆∆üî-wé…πø‹—c#òDÇﬂqk6OhÖÈCk‡úÃ≥BRJßB,Çì÷Ä§	,—PS<—`[m”©¿'_…`◊&éŒÛ§¯ ü"Ù<π¡v¸UçW%È«Xjj|
õÓå0C3ñÄíÎÅgE*œ*∆ËÌ<=U ]©óˆÖ*4««z°Û§ü]$;bËb
¨N§V∞÷{*Ç—e™@&î‰ÈWI +œ‹_gùΩåπçìü¶µü~ù‚“î_©L≠îô‹=˘ÿªmyñ'#q†ÿﬁé§ÀU›ˆy¶∫ÑF,ë∫Æˆu∆.â?ÙÒÆ}ov‰SZ£N•√µq´ziA=Í("È≥Ìﬁ6ÛôIú°W¯£+;ÁéÛÛòa^ª~å1C[¢¢'≤€nÃYèFV €ÓÛ∞¢,r‘ÜŒ‰°í4˙IèÿD˜≈Âπ∏D•Œ}≠âùEƒ¯rFıÊ 9ñÃZZ(•û˚PÙ: ˆèé	”¢∫{bì˛˚““ÍëJk=∆‘ÃYdüÊôw&≥U‘◊ÿ‘aæ[Ê`¢R¿ ¿‡B∏!M
í£PtÊ”õº^’¢Òû¶nÀHïåjû‰zM≈¨e:Í»u(É;±©Ú—%21‚iò«ºá¯"-–-Äﬁ!=ì,;,Í‚]çdâ\*©cÿo Æ$¨´≤p7®‹'¨FqÛgFV◊ëL8Í8â∫ﬂÍQ™›Ø‘À∆I‘”æ„*–#r∫ïp†+Lsƒâ«ˇC@˚–P"z'1b¶!∏0)’í+‡[pßõƒ%V4QÙµ‹
ı¯À\·˛CAN?ÒÇëH∑ÔÏΩ#®¥ºM'@µûÓ3kuÕáèïÑjj©EÂbè√§%»≈µ3Æ>◊î√ü¿aÖb%òçZ2€˜„√7ú~0„’«ïœ'⁄ëA9£réﬁÅO–˚ôs•-(æ´MW$'$›æ:&Õq‡ûœÙ$¨9¡πS`ﬁ~?¿Ñ≈T∫*Ê´SAè‡4•(˛÷4)‚°è.UbÊj∞bî£˛-jSRÑS≈^8âRä 
‘3LÄıCÆm⁄kç%N0±oê6s‘Ø∂—¸(&∑•N8t,àØÑ◊ø˜£è≤4ÙÁ\∑È3åŸå√Cßq˜kS%b@è/£Rîµ˜”\à‰Ú’π˘ë4Ô9ÜáéQëéfQ~√LÚy¸C÷ÑC¨±Zp
¨å!Æ6ÀÌza•	Häíl‚ë-ãHr 4+ÖuÙÁ´Qu;taæhÌH–äí]i-A˘·º8úãÔï}•D®‡ˆ-4	PØQñK d0?◊™PäóG
]2eTBÚ°i√tÂôá'wµÙË≤`zªˆÎ]_ÖÚT∞√>*áe§ 0êTäEÓó™™ø˜bˇı˛…˛€¶¿€ÛÀˆä65QD.3‹‹‰cYú%ÈàÃÌÅØé∑¥Å»ÀÄyîùü˜$\Â&E{H⁄	˜6Ú0O.|’œ π°I¯íE.y≥#`“ïÄ	ÇA®ôÒn‹ÈDÜW¯HlCoRòvbhtÒ%ê3#2V¿HÈ°º ådû{° ÌaŸ˜Töèvì~àªN*ÔákOîY@‡>:úà{"Hõú+≥≠i›‡*}âf˛∆¬[¡c97…ã©ÎY
˜>Î}Œ3åØÖNP+w∞˘Ìjo?ı
∑k5;§zL◊˙±Ü•zCﬁ2^"†Í‡R?–UOÈZ>ûZ~∂I—G¶~ûSÇ%ñ†ó-√–@‰$(p-‘ñ6∞sÂT?)⁄=Cùë5t€‰ﬁ(ú∏2Ò~ÅMÁÁc<)ra#B°ß»€kΩÙtMï›§3¬:uÈËMÊ∏Œaú«Ø®«‹Û	µ¸πÒÀŸæEz·È°ë#wcÈ∞≤+ãÏ7ØÀól'ºbûïÍÛY≥üÅ»ó	g∑·YÕ∂®Y”Ö™•_k”Ùkvàäxlb¿ı¨Ø∫öø≈Ë/≤ÍÜæpÅ3‰<˛Nz<EY>rOWV˙Œ¥.¨.M∂õ…∑±1 “¸X°ƒÈ>I¨®»±Ú‘∏Oóg∂Â°$⁄®/
geà10”íâ·U†^¥Ñ\#hë¡aΩ\ã?$S´@2Z"kYDgò%Õ^ö´áûaM‘¢πñm1˛6mº>?êö˜1y¢=∏Ü¸–Ùµ\ê≤˚“Yî€˜ÍUÿµÂÿ3ﬁgì⁄∂≤”∑BK,∂∑ŸªèÇ4†€>ÛiÛe,√|–E,È≈ÍòSZåxa‹sK@Õ åôí}V\î'≤ÊÊö1-±vÊ¶à‰6-;ë®˜åóÛ≈ﬂ˙!ò˛îm1KÃÛØeÁ∫˘n˙4NF˙Á»9ËO◊†˙É+'òc÷√¥&Râ^∏áëpôS(’≈P≤Ô\ÂF∞ëLíÃ¶´Kf´ªì)ÒÇ]6îGO◊g•K˜´nÈôâgÑ%6≥·aû°&[E"Øôé/∫†Œ•ìõòw˛öäsT‡“yçJj…Å≤}Ïl`”23XVîÃb∞ pNı+ÙægáÁ∏7◊W∂ˇ˝ü˛áôı⁄YTMe¨ÍÕˇ‰	Î∏&gÌ3c‹¸13˘-ë≥¬ûîë Ü¢–7%5Cx4Ö
⁄©ûáÃ>nŒ«e0§“æ˙gΩ6dÑÍüÊ ª¥˝ôwu√ùô≠1¨–ºŒ~≈©ˇl>0ù„‰û$a{€~äØ=c5´VÍŸ‰„˚˙1Øõ(û◊¨‹˜∫ll†n¨]·—™Wä€+hÉ»›¥≤càXâ®OÌ-1p1–ŒDm≤Tp¥äX÷¨‰’n uóÆ⁄¯Áiö¯8Ò≤2W∂‡yIÕ≥fd$ÑìúÑ¸‘Ä∫lÔ—@›µu=ß˜D≈…E.O≤Îÿn)≈T‹‰Ô›’Ø÷V¶ÁÁó:¸ì£‰,OäÓŒ•ŸH<H˚òΩ¶ª÷ñYvﬁLã˚´ñ¨\Ò%ìmCÀgqá˛˝!À˙ÔÍWA‘5	±#9 Ú˜¿∞2'˝F±»≠B¿a@yA=›îTﬁX«“¬åÑ˘nM·'›Mø»Ü~b°©pΩ]U*LdF•Á]éNö\Rı—…ﬁˇ‰àåÖ7£(ö¿„…Ê¶WMÒ9ˆá2≈é≤¬⁄Å›Mk¢•ÖmÂ\Ω*s‘∏e}ø¿˚◊¬¨2§g(—[ˆpkÑFÖE'õÛÏ““íÉ´	÷(û§Ë<∏|ˆtb˙íM¶#Ñˆ‡ﬁ
ã€Ìd$£y’+Æ¯_+?v7ÌtírCíÈ≠uîâ≥ °¬¢fÌxÂgSW.Gòœë{£0ººì≥Cê·î uéá|Ëû·!∑˝]‰Tò´à∑∏º\˝äuRµÿzÁX™Añ∂	Ud€X∑ÎPÖ*Tô‘˘ß•"I@WØé{=’-£‘≥1#wãI»’äFÆj»µ"õ√1¿VÍÓ"äëÜ^Há{WŒ¢≠T≠O?nE˜»ùÛædÀ#Î	¥ƒÕ≠f•’m∑aGy˝4JÌnV92∞∞yú:<a≈»Ha¢l∆Jy1¿BÁÅº%%ã]ûªjÅEñpxµz?∞ºÊjl¨;´Ï.U…∫û/æô…Z¬ïXMRÅûÕäMk-Ò7PIàSxVÙ∑“VS^Ÿ~+S√f˝“Aãmˇâ·9ÖD˝-∫ ÂdY«ÃòË∫∞∆WSs€%3∫g∫nï!¬…zƒÿJûÙbÚs]äjp$rvv√È√û3Ò§3í@!ÅÅÍ÷Éu£ÊúQ_ﬁ&Os–%U¥Œ"JF◊ˆf¥†Ê‡	ç≥å·) 6NÅ°Lﬁ≈ßE÷YÖ„m‚’ÂG^Y‘„xÑ;®+±Tá\
Tz0Æ¶` ˜ﬂóŒˆõ}î(ôS∞zñs÷Ïq*ïâz„b¨æT¢“¸d Ã∞ôèvØ≥•œÙkêX‚©]⁄ÀŸ‚∆…Ùk\ù8ÔXÖıaEa∏DˆwÎÕıÕ˜∂8=[vK˝”@ÅÔ'›˚û¸_ÙKŒ6öVÛSŒ ˆKÌŸ*Ò˜Ω^Ê(≥|?x∞XŸF¶>ãøßƒI•∑ûoÜY*=£µ#uü¯0˙*ïaÆ·a„Vs˜À…Lltø“£B«#“Ãmµ‘…\¯÷ë¯CE`	"’B`Ï˛∫à·N~ ˘·ıÍú€ùËp√UÕÖg†Ã†Wéú Ωø{Ù¢˚~f…˜5úΩ◊IcΩwÕ*ïË%·™Ù§™˚Ã*<˝»ïû‰∆ï‰´Q£`+≠œ^Rùùü_+ÅÜÓy∑≈ª˚◊(hnyπ´8≥_/Ølìw“Õü;dåÖÊµG•qWzCÛâ•9dﬂ|≥’Ô◊Öj∞ùk√™,¢ÃπP∏ÏñÌŸµÎ”í…%VX‹M¥	1€Æ˙5gy∞M´æªÙ71“y'ˆ6£â™É(˜"Î$gÈ ≈‹∆DAWlÊ‰OP	P¶†fMÕÔÙº)jì≥Ú)ñ,ÆWÙ4@Mcâ‚∫¶ΩDíU…}‚«Q5q†æ∑8V$ƒùMALàŸT‰QóÍïkÔ\" ≈hª6jx≤S3"ƒ%Á“¬˘$ØSg˘“.¥'mU•qêTÖLñ]Ür°C˛ôZ◊á÷/¸.êh9¯G-ÃÈ¬ù¸Ö’ÙùﬂtYM¥ÓáIVË‘`ÔÂGÎÎ≥Tl¯Áo÷–ûg@‚Yò$Cø))‘±Ts°\NW{l^*¯ŒâÕaç≤˚±uå6ä(~âõ“UÒÛÃ˚¡`/9¡:—1pmŒÉx¥&…„önÿ’æÀO§\·Ì¿ä¶ü ‡ùˇﬂÖ©VpGâ‹©;ÓGëJÖDÕzhKIK∫ ‘'˘”ï√§ AÉ∑BZ1Xpïÿ\Ú„mw©ÊL5•I={´_±aé‡Ù§ZsxÊAœ≠l<BÂ’∑|5ô=`˙^!Jæ…Õ˜ùÖ†Í¸™VÄ◊∞°è:J4cZçXáìÖÅw%·V©ª≥‰Ã¿á-ãneT§ÿÄ¶Ωë≥!™ï¿Vq,≈îÀW∂(ÿ¶Ö)n˛ÑgB°;1ﬁLU”Ë¨V—4•õƒ”Æ4úßI*_R—Ê´8ÖÕﬂ¢zûËO9Oª≤PIu”ìn≈öà»	4˛dçcßqK¢•.z·È∞ ˙é˚-◊‡L=d$¸2Ì6Í˚Îs®ôÀ#∂≈ÎÇ¨¯`òÆ∞'ø≥XôÕs<Fdn«∞gÀ;£»nµ:dÆÕ‘mò
:[9‰y$üZÃmIMïÕ¸÷]∂˜È e¿QjÄâ˚≥\îD±û«Å∑û8ˆîJÃZøPÚŸ¢#Ãu∆≥iÛ1ªES⁄"πv“◊ôÁ3±ùÇÊUb(O›ï{.§»¥¸,pä¿ 
=!EøßŸÁ∫|áVÚ.˛ï*"JhO0˙áè≈5ÅDÒƒ	-˜;r‚3ç Ú8kB£ù/Êà!k;¿Ò!≥2\†˚G∞2∏¸ÌÙ–√kßõ ]Tl√?cqPœÂÀ\ÅjΩƒ-t[k∑ÓFµu{ˇí¿BÅPˆ4·˝lê—e4˙“Â‡›Û˜bµç'Ø˚WV„!ÆnƒK3xzÙ9t¿s*√_§W∞µ6uf¬Zsp4jıô≠RÿÕz:i´òë05Êmî„ç?árxÆƒ¢üÜWB•ƒﬂûøÅøO„°ÃÃM§¥qÂ„®DÎJe∑
HÕ§≥}ô√”1ÇÀ…VEª“ËÃwã"Ú⁄Äjë±ÀU9 2œ¢&ÕVjó:√ lﬂ|j2Ã›2
≈Ù‘úÆCØÓ≠®çù8Ò¢ñ¬n«˘L˝Æ#ÖœÌ
b(zìA;ÌÕ≠Ë≠ö∏Îzª∏¶æDÈu˚iJÁﬂÂ&‘rqœ”—ˇrtÚ4∫ÓIœSühVübÑπ2‡1¡Ó f©3Y{6KöÑ=bOïcZåÛ⁄ØÿsÃ‘ÕPêÃZ´ˇ»VWŸEZ§È3BØEd˝ÏâGò¢°À<Ãê”Åpänª¨ìŸk'Ω1Ö°£–ê¸ë:)&’¶ *Rßaéœaû¥I…á&JäD>EòíÑå¥ÏWkÊÅ¥“˚ŸÕ:‡ô"ÖÓQØ⁄ä~“C<	v∂8ævWœ0Rn;‡ö¥õÓÈp"Îà“°≠«ks˙ˆ€2ˆN«-˙ ßˇZÉœ´8J¬1Øe9Sôo-˝®“›
ˇƒÒ„Árı˛cFLÈâÌ∏W¯W5S<ãÑ‹¶ljgJZµÑÁ„€•…d#Lvôt|È¬ÉS¿Ü\Ω01≤å$!_y·+˝…◊á•∫Á†IG˘˛pá$†íñCR  ≥ Oi*I˜ƒãVòÔÌÓü¥éÿŒÀ}Ã◊A†|}ˆ@›0vÓÓ¢H»€µù|∫y®ÃShÔ’€9xu¯rÔ‰`E*ö˝òı©•b÷10∂£U≥Ÿîü6LØ+[˘lâE≤Ô¯Î:s9œ”√ˇ •)V7y»Ü´-:DYíÊˆ¸HŒÓdÔÂﬁãÉ◊{˛ƒ∏‰iN |¨òópªÓwÔUkˇ•ﬂ79ù-P·¨ÊhÚ}πw<Ôá·π√sXíŸ¸9©£ÁR ’æws@ug∑µXR42.UÓÈ7®ﬁ“ü¥vÜºóÖ2ºı⁄*Ì6˘ãZÏÊ4Ã∏ª∫Ò`%Ëvπ0ï€ﬁâ îƒ^Ïõ=.wÔ6ﬂ”(úŸ<F
d@*∫ ´]¢&R¸≤ÂÒ◊â≥¡L∑É‰˜ò«[∑P≈§Hˇ+)àã˚‚›ïihNUÂ'k=ÌÍFÆ;¿K£cù`vØíWofQ∆CgSñ†≤ @mô%¢BQ§6ˇªwœÏ”cÅÓÈKÿrƒÈƒ˚óñ˝ŒÕøddY»[§J«C˛Ç6A}úﬁg>
x¿ŒàÓ#+å±D¶z—w~el¨	Gåkñkñ˙ ÔØ¡¬√ÆRj›ÖJÎS*¥ä>è5,ÎΩBçVb=‡J,zÀÍ¡À†kw!} >ƒHñ1%Ï˘È#‘˝_∫†ﬂ¡|sU‹1∆l0&œi•ÍÒ˛:Ä)Ô«ΩUn¶∆AÛ+€ë—J}ñÊp)lt8@≥ ‡e⁄9ÚO¬√äß%—-zDe÷àrWìP‚ù¸ÊO‘[áé≤î9eã¢e˘ Î≥m¡°AU™˜öﬂt§’n%©zg[j\≈sÀﬁˆƒºh≤	Ãê:Ÿz»å†ƒ≤a˝%á©Âª–÷}˚éy˙ÕÍ˝ zÂ{´äZÕ6Åπ¡»IüÓæ®¥N)Ñ
ïH)˘SπDØxÑº∆î√ŒôëAã◊óÅΩŸ§4Ägˆã5_µlˇÒFÇùD3F®jroYî.§Q≥˛§÷ñ¸û«áz"<Ø"0ª9^òy"ÎÈ^VÊUkÕ“¿∫2≠™&,3çOgÙ6≠g˘ﬁ≈øøí˝ã’ÜNLÁpÇy_gÔdzñhÈmL‡¸πƒæ¸çBâ,¸ü≠Ôaˇ!ÈØ!geEpﬂüió,˚zÒ«v.‘∑ÁQ¯*ØÏ†8dK’<„0:∏`πRâ“Üøß„ Ò9‚Ô≠bS(˙ïµ‚Úπvóæ†ŸÜ†ca˘˝‹v¿REª»ê-ø°yGùüﬂ…xèæ^d§˘˘BcƒE;•rw2÷Z∆Ú‚Ê«<Õfå⁄Ò(ëõ˝l∆ºÏfzŸ9⁄§«yÜî’^L¨À^.∫{vÿ*ûÀ#OÉ≥˘7¶aKn˛òUy‘ï≤ÇƒMﬁU≤≠2xd>~>)y:uû∆p¿Ã0Î0÷û<R´Ö({Ö(«5GÇ˘øÇÛÏ(O˙Ñ2®ÊKñÁO¨éÈïW›ôrõ∆2MÜUoøorÔéËyñıíx`V∂ØP¢ï†Qπ£â◊V	r÷7√8≥ﬂíR5Ò:ÂQ÷?E∆¡)ûÑΩ°|∂~?∂GÀ#+~«t–FœÓê3ÜKk	 %Zè0∞Î”ô¨Ωª:º“€‡YΩÖ»«®∏?é{HDÖ˙°d) •dO•jV‘¢v÷Y˚ÉäMe®Í©4ÅL2øÆ√è_õ)ùÚh√†ÜqÛÅo.sMÄ8%ŸïrÙä∫oyÈÃîNÉ¯˙‰∏õá–ÏÛ¯\
§èH∫?H€©Ãó$2¥èTñêÊï»©‰C?´£äØ9GU∏‡˜k8Äî ‰4£ÑÉXÄ	3‚Y¶}Û#•\NåB4îâ:4;™~ }@≥X!•‹Úù¯˚q“K»iÎ1µIiæ‡4ˇ& €JT<àõ°ñ1©	zÖÒ–<ÛuAIÎÒòEπ√2cÑﬂﬁ¸K:Ë∆L™Rı´BÌ˜1ê'(Co€"∂ˆ@«ıÄı,îÍOdªçÛÈ'xÇV£É˝°k¬·’ ◊°ˆX&oÂèÂ°o@Z[6ÂÖ€Cst¢3¡À_SI⁄∂ÍuÈMVÑ»Êı†uÎ;∆=≥muæ¶9Ãú‹¸Zû{ü5·ÇMΩà´ëÊÚ)'¥º<Z
Éæ*U2Õ2˜©C6|"&D˛õÂáyQ—M’’E–'Ì8kÒl¯9µ`,o•2"K¿c∂™Ehâﬁ™É+¥°¸U˝~â≥1’H ·Ø^≤•¶]g0€π–¸[1•Ñkû≤‰
Yå»⁄f∫–Œv(dñZS=S∑=4•õÕ˘‹›ø-ÅL3_î#1Yk (Ÿa¨•1 ö3U›o÷ÓzRŒ’_%¢Tá&-(”ZÈ∑˘ñ! 6+®*ÿìïdL6«céf≈hÕT±ñÍûËº≈∞‹reèBÚHêÇ	ÚèÚm’y#‰Œn˙bf÷ôÖNˇÛiV∂πê©81/Gå’”ÇÆ
(—øMìÀoRÃŒt≠d˙gÕ»ìÁK\ñ0I≤Ö¡·k~ΩpÙ+2Œo±*h∆æQ’ã)ÜÛ"œGÑTên≠ƒr1ïò x 7tgoó„‚D¶3Æ¥3‘õ†I≠7ÿ∆zù‰îã≤‰nr‹≥%  .*"¥È/Ä¢Ë:wî¥ìt8z~ΩﬂÏº†j{À†ûù‡5=ØÂcÊ”Ùî€4	>
vî8ÓØõÊî≤hqæo0πç√‰tZ!qøìú≈„û0∑ú>\÷Ärõ®d˛}%›ƒ†]Ô$nfÌﬂ˛B6Å ´_÷m∑˘ŸÃ¥df ªéè]#^è˚8†•;∫Òãf;O†«N+ú”oë°2òø‚,§»úÈb3?(–ïmt9∫ò7z°ﬁu%/MØN “`∞Ñ∫Í\∆iGÖS:6Gô¡d˜√⁄a|ûQ¿˜°0…VÂXús]fáˆñH¨eœ≠í,ë¬•ƒù	a∑ëú¥™*öï
≤‘ßÊ¬Œx*≥ß !Õ…`´R†–_(Òé»Â®TM[|~îe£ù¸N‚”®6ÑE^ñ˝ﬁäã«˘∞«√jVj‹ı”Yœ¬ú≥åUﬁç#¡œ¬˘¨1õ;Êû¶6¯En¬ËI∫A¶™˚WvÒπ∫-MTüäYµKò’_<õj65ãEπo≤s˙‰®ur·¯§uÚÊ¯√À÷ÛΩó«Ôx—ÁqA¬Ωº¯+d@¶í¸¡ÅL”â‡Aû“¸ÁfB∆ÄêewƒÖ≤[r!5,`CŸ/éﬂ]ª<HﬁÚêÒ‡?
˜¡)s÷ìI÷Û©XJˆ◊ R≤_K98⁄iΩ⁄{ÌÚî/ˆwæiΩÀLŒí˝5pñ"úÏ*Ï˝_a≈≈?]u7):…^‚ıìñJÙè.w=™2ã˙©ÊhT)’v§¶ù…"™Œ;ºû*åg <óN≤Ÿwµíngôù=UmW[±ú<òù7–éQ≠0¨YÄ°¨ÅS3i√Øôtœ˛4≠ «õÊÍªm}oF„+~——Ñ]·†îcTÊ3¨‡ïo∏™îYV—Ö^≈h¶1¥r·¨lL®†©\Gy£Ù9¶ígÜUp[÷nñŸom§≥+ÉœU˘Wî·±7Ów≤{ì›‡·ØVàÑ,Â7?ñ{ …øâ	…{$pW&hóœ◊–Ωπä‘˛3 ≠4Ê]‡˚æÓ˛¨tù°π∏]‘˛˝˛øÏoo~dgÒXspòx/‚:Åp3ê6˚¢å‹&)Md*(Ã*˜Œ1G‘E∆≥ÍÔd˝§ç_¢kñˇ`YØÀõfL$ïÉ…k;ç–ø:6Ω‘˚`g-YïÕz.]Ó√Î©Ø9‹Cñ≥ø∑L‡4˛›M˙»ΩCÿä Ì5£ñ$ù_íÖ®dûw√Ãò∏ybyŸä∫z†bgÆèá˙Bì›ÍÅU/ÊåΩ^ï?sá6q%ﬁŒ2´r¥.ﬂ`aë-ÏÙ@mÕ‡Szq?_ÿ±πÇå‹FAÚŒ9?Á3JßRM—}¡Q∫‚5w
›2∏U—»_*P_R“ö;ß)
P))ŒORG“≠Ñ¨#ˇﬁ-ÄÌ+€ºåƒÀõ??N;C'Ç”¥3C˙[‰<∫Û'Éπu<©Ñ∏~ÛŒ·≠ÿÉÜvR0i@ù!ÆŒgÕÅ$îEÎü “Â™	_/·◊rƒø∞c¥ ‡Z‚ì]ï·5ßY9^≠lÔ∞H“eﬁÚ~Ôã4Ê≈Z!k°H~,&Lhf*aßÄ©$?Â,‘˙ûMˆŸ⁄[]]e«{Go˜wˆéÒ‚3ò-%t~k'òôm‹CwÈh¬DU,ÆŸ=ÚÌ{[L>¸w-û*ïoˆ]1>=âOT}ç~¢#˛∏†d…ìZV|¿8√Øø=˙Ä˝⁄v§“¸d{búºEqaµ	£y˜~;z˜ﬁ¸Ã»ºŸpR–ôÀtt˙C#«ûNøg}¬ı_!®Ê/]Î*¡t)ÜG—∂æIÏ˘-¶Í€bÎ¸V'ª∆◊à≈ˆÉaûf9Ø*Ã”ı‘>„π‡ ﬁŸY“YπÙåE˜ÏÂ™ı«>√Ôa.ﬂèì¸Znê©∞¶Cö¢,\MBºVó2Ùe7…Å$¥y£˚$OübƒÅ’.‰'D0ü_√GRaçu 5éˇáÖ˙,‚a—ÕF—˜‚¬“7ÎØ^hv≤67ÂPXÅàŒÍêg≥ŸÏ4±Ó%ïzCû`⁄`ÔÏ¡øÁ†Â0‚π˛ﬁ·kZÙ1Ê“âI∞t“@&leÆ‰Â◊jË<É»ò⁄€Õ⁄Qˇo¡∫¡xhÌ©¶U˛Ç)k«£vóa…ÆâZªAëıífíÁY’ˆ‡√ˇF„∏ó˛ÄumxùåIµÖu¨eì
oﬁò„P@ZOª—P#~Oß÷‰x÷=cCÿXi¬âè"-ÑiÉ8‰˜ÓFaOÙ3ΩØÀÛ–øç&€!‰cÍ28'G=6ıa»€¬:9ò#ùQ`Ï∏˜x±g¯à,ZGç« ¿⁄Õ∆* :H(”w\ÃŒ…¢D€®‡Ä≥_'Ü·8Ü±\›ÛWƒ"û[DÂJû∆Ì„øzv[êò0ƒﬂ-øuî]¬ ·Bã∞⁄Fíõb<åOAû‡ïk<‰´Vo¶ ˝»HT√m¶I.íÌ:´¶œÕtbﬂbÔL}ˇ0v—Ì√®ı„`YÕ<h;-kn{#6¨&·ï≠–böo!GD7‘›©ë¯F‰	©l≈\˜≠
Ã⁄¶ö÷Âœç¶·Û'˙…®õ!XÜÈïπù5N?ÉW¯O“óâxæ§£>ö÷õº N?‡µ L2|‹zrÌÎl‘Õ≥KÖè-‘!tﬂ« *â<@ÕÌ±©∂«®ã˛ä¨ù"•ñ¨¿’„‘,w:H¿*xÜïáT0å-üShâën…˙â‰±•(*„j≠4Õ<¶÷X>∂0^˙+Uìb±—Ñf∆∫+qk1<ç{òŸvã[≈˙Ò:ùæ`´Â¯gÏ≈\∑ZÕ`
˝!∑Ø)\RKŒ√´©ÜŸ∆êk<ô∆ëgÇ≤L@éYÜ°!ëÃcúÙTq2@–qP® PıI8fÜ|≥5∆+¬›¨ìå⁄À∞®›LÌæ¨]˚Ä˚c?ìﬁÿèÍÑîØ^øTZd`¶ä%òõ¡¢¸ƒQs_§qÇJ·à¥¸ÿ·ÿ#«˝ç‡4÷c8›àÇ•caFZÖºQ™/“	◊3è›•1ÑÍÁìàÜ≤éÆÏ/≥60ÒcöUTéVü’P\ÍßÉ¥?Óø¿sP£›Ù<≈LgõÙ
>¡h≠èÓƒæ4gÇ©Ÿnrët™™*};@(r6bõË¯°Ó‰1ÅÇ&8˜√¿£ZÂπ¯ÄA∑Ì÷◊ c¶≠ªÎO$”öºQÇä
Zœ„Œy¬‘ºdÇqò©‚πò¡≠ñ5ÂÄ‹R>ñ_∆˘@0S˝5XÓ√Z1ná2K<ó4VÌL®BÜëˆ¿268É¯‚ﬂn´cÇ⁄%}÷ó√µ∞¿á“^ü‚ıÕo˛9+ÉUÎ|ÉD
≤h\áÙì◊ÿQ2JQ∏%»âãÃ@
Z¿0Vò'>â»X¥êYÓÅJé≤]ûMÊLÜy; (
ÀØ¿—¥Œ≥<ˆLj“ÙΩ ˇ	fL≈Ëﬂ<ƒÅ•G£0¥,QæÊ>ÅOÖêlG%3÷ÛÊEEÁ‘ıåWJ¸ñ∫´ø·a’nÊ$ÅÌÒˇÊAª˝’Ÿ∫¨¢£oUœçªÎ^ﬁ~ˇÂ$B6º´O∑	Á~Hâ˙≠ñ'Öπ?'ú*w†kπ„[wQ8·∆‚PÇ_√Hêj›<l”Éûª…ñLÀÊ√`Ö~g!¯‰í¨ Ñ^≈9∫»Ω∫®TC∞¬Uëø
Ñ¥Y8l∞Æp‚±’ºˇ˛ˇ¸ﬂj&òC¶ƒËœùÿòìl[“ _∫˜ûdZÀ…¨ÃQ˙ëEêxª°0°nmuÜ›–.±¥ñ1Aﬂª¡œG¡5øÜB◊‘pW∏¨ ∆>í…$<óÄ™BÒÓ˛∂√C+}∏∆Z8’Kı¥üœ¡AÅÚΩs∑d’+hõõgç˛PòHÉµÂ·∏“Iîc˚B·êÜΩg°_d5l}˚œΩ&·M∂9ˇZŸ”˘…Wlf
_ë˜k5ß$mˇlx›DGÒYÃZ˘®^∫¿vÍπI	™Í≥<wü|ùí<møÑ◊0Ô≥@)ºÇæÜ•¡QòW¨0Ë‚Â ñ&ö“¡ÌW∏ˆp`J1ã√◊˘ÕèËVw⁄gs@5˛cj?FïÁ”â‘(9≥A´”1p€TiåÚ±ÌeÁä√Ù^ØHq ç_\ñÂåW≠±3W-P -®ZQul^∂^ﬂ¸∑÷£Zldêª˘o ó≥W≠◊oZ/gî≥1k≥=ÚÃŒ3|e®F‚¨bh°v‡≥π>ï·vu±9øﬁÈ3Ê™ue‹ (ª÷U†‚ç)lwÆ¨ˆÜyﬁ^ü¥BÌ™˚,˚V6–≤hß0®´
Ï∏|§gí !)‰–,QbŸ¬µœ,à˘ ÍΩi¯ıE[kΩÂ∂Ô«5uW76ùn6‚Õ˚˜ÔáKâ:ûW´î.å@Z$˝‘Mw  \‚=À⁄„"ê∞"‰›WÔñë
àÆú∆ÈUº≤˝ˇy≤∆üÕı°,ÊÚö˛]Ë”∏7Ç.[ﬂÖ>√∫`m,ûÚÁ¶\co¯Ω™v@Ê%ƒö◊ﬁí$ÌÓÔ±Ω˘ØHô$ÈT·”äÌ)#ˇó.¨}í?]Ÿ˚›{ﬁz˝zÔàÌø:<⁄;>>`ø€x≈ˆ_~sÛﬂèWFpKá~+ífMımÎÂ¡;98iΩ±‚s‡∏£Î!"i*˝kÕ˝‚Ÿ‘˙;I0!MÍçD˚ùzŸ4ÛŸ›c{„ª€;ﬁìC›‰\3tçãœ”7g‹’lÉK∫XiF˙‚ˆÂ√íÀåÚãfﬂüæcÖ⁄5TúQàv”ÌóÒ‡Êèqébû§∏WVŒˆ∏—ælfÅ•ôÌèe∂úŸûÏà#
H˚(ˇ˜Ñ≥ïm9ÿ∫6¶⁄πkˇı[åU<˙ÚÓÇõ\b≈Jﬂ0CL*ªñtRÚ-H∏Â~ƒ1∞Ä/> ¶±7Ø˜wÿ∏¿¸≠£ïøÉåÌ£]!»ËNwNíºüx„îK´Å˝a@»yú£e>'ﬂâïÙ‰‡|»˚[¡Øwﬂ¶}ã)l©~9wØ»DÇZ‹qXs<Õ÷zŸ9≤ìéB”vZç‚ÜÂs%∑5.¢7§Tﬁ`¢:Á>.Ò.¢EáºŸ Ñ¸Â-¿@J"é÷CÒ›ñprπ»–PŒÃV∂ÿ˛‡Ω6ÚkºŒo¸[jæ-ﬂ#SóÃr=‰í˛pÑπÁ†—√8•¿≥≠∆∑aR‹ Ω)jîŸµ#¡:á7…ûqZ–nè)⁄k«Ìîu< ⁄ﬂë	VN]P√Ës»›.÷±Òb§Ø“ÇáúoazßØèï˝©ÉdKáLM çfz±X;ŸB¬/_°Ÿ)£>zh≥J@∑>+ÙÀSu	»p>Œ„£¨ó©1_†¡µ‰ΩÈ"^{O¬∞ﬁé‘rXNáÒôPyB?É>ÉüUz‚qD≥}ùLfc†∞™Ôkﬁö≤-qSPŸÕ—ı® Qt¥*≤ò≠»ÂÑSÙ^jèVªYˆ]±ñ\ucΩHV;…∞¯åªΩ…›bt}C¨.w˛R\QÙYŒC}åÿù œ.)¶&™ë]w˘ Î£3	Èzöò¡@@ÑM%L8å˘˘›w
ÉÈ~T7Azû1Ã˚–è1Ráß€c§‰N’¡>≥1$ÉÓ∏{2#Ö=SàÕ	bh‹„_@ò‡B*az…HtıÇ(û·ÉÜ€PŒ÷Ù»πgæˇ≈Ïû€∫Wówò'gÈÜFG∫e±≠©<á	\≤≈Ì÷¥kˆ⁄ªˇ≥µ˙èÒÍ7ˇ¥zÛˇΩ_<≠’åÜ˜ù‘o™	≥ﬁØ9øèüOƒò¶´üOÑ)Yáj◊µ√Ù£Ú<˛ÃöR|MµÉûìu|¡RÄÆÃåS9sl‡Ñ÷xEëø ËÏó9QT/‚•·Ó4ÉÎ{¶#˘ò#+FﬁÀän∫/s˙˚°‡4Wøo–eÁ†–ﬁÎíj;Ø¶≈ﬂ°Ii¬M¶≈±†Ë∆˚ú»S§£Û>íˆ)—v}\‰ûPI|ØâH$Â7ÄdÒÑPá‚£}¡ t·{ìq¯Àkqıëq◊ˇƒ‡3˙† Ôz‡|ËCNåHw°ŸS C1>/Ÿ„~g<
K<ÓC_09ıù¡˙‹o¶è™UpIƒì8U“"Ó`*‹JÀùI≈í£;)wbéƒéØ7ìÔ#n{7˙AGrF1,ÏQ∫0“≈cco^PÍwõ"8,¨πÉ	X5Åªß¯WÜ\,Tm
Q3Ú<‡Ú\»ç3·
^L^Ãá<‡Ú\ªÒ)ˆ˚Ò5*ıœ≤î≥B‘ÉﬂrNº≈>ü¿ßœö}2J[;£Mí∫I=‚¶’Pœê$˜Æ-|Œ∏M_BÌàg-]m∫£H?§“|bKGµΩ›˝ì÷€?Ÿ{≈£Ã[ª≠„ì£TÏø>~Û
ÍáGªoNj aj^M˙ÌuËã®™¬zsúöØ≈†ÍÔÛh.ò•∫‡º◊VE8B*&åÎL†∂∫¬?¸Z£ﬂπ˘Ôª˚_√Ë·,yÙ˙ÄE«˜¶æbÎ–vìÙ*¡ZìßpRlsâÏ<¡≥8âr7?¢,∞Ä4∞ƒ‘π·hj<-Lô˙›[´Ö2‚Œ–ºÔ¥Nˆæ>8⁄oyäw©r™≥7o•Œ.Q`‡-‰(Ê3¡≠2‰X)c»¸¸é6YcW∂èÂOΩÃÒ⁄[‡yΩµ√xòÙÍeöeß5 ®”>¡∞jœ	Ã5/Ê¸ÑÜSù±≤›RøY¥ﬂÎﬁ¸K±ˆ6…ÈÛé§C≈ˇ≤be{W¸
Rã˚ªÓÁ¿◊7Ø˜w[ª{øHlEa~1LÂßÅe±¥ø≤˝*¡2M/aL@∫¢˛ºxêåRb)˜ƒ/÷¯¶•F◊‹2Ä•ê≈éE„AIøÛ°ëEºèˆ–,ÇG-Ìº9>9TÎ¸p¯tÂËÛïá†•HµR<-°YıíŸΩ›{Ω€ZdRÍ∏ƒ§›⁄-&ıso˝ì˝C.[ÅTÚã‹ˇÚD∫–jÀeÈÄºW∂Ö*zŒ=‹6ôßh¶}%~Õ˘°(ºQÂ€∫+õÛc<®¬ﬁ‘≥§®oºÛó∆¬(G¡K8:Ïe˚ÌõΩg>6ó8KjF◊OaKPqﬂ7“	ˇ<A|¯E»
WN#:uGxß$c¬ g$]µŒyVEÆ9463<ÏÃÙd*=Ïß„¥_öXËŒ°√˙SÇÁÈ-¡ÉÁÙ0|v«_¬ñ‚ôQÒ»*Œ€a; 6p}R\Ò’¨IL_˚yê§≠î`…ùB‰”owﬂ“≠Öa±?àÀ°Q∂gå;ì9(ùó@∆ÀàkÀöÇπ0ÿ≠ó≥<SL;¿2R≥eﬁΩ¡π|BØn˛Ø◊˚ØX‘zπwt“öÈu#çKÃK[©?˘ú˛ÀÔ`N≥¶bYñòècˆ˛Dìzy∞”zπˇè-Úrso{W[Ï0¬“K“Nùõ˛$k…S¥,0≥TnnÚ';˜ﬂD€BÒ†Œ·”ﬂ¨YQ˝D™Àûc®†øâ´î¥¨åyzo}˝À¿ A≤<X{’:Ÿ;⁄Gøª~ùºk∏3Õ cÌõ{Ìq/3ıú,1.˙£db˚‡:∞àÕı–⁄i3‘2kg˙X‹rŒ¨#…É<àü\ÊÒ0‰÷63h´<#‡˝u_`y…gZ†in<(∂‹ÿ+ÖÇÔ Œè Ì¨ÿºˇõ˜îYË≤¨HDUûW*qvZ∂¯tç˘y∑µåóeïHÁK›äë>T≈˜:¿Í9¸Á+Í4õ"Ü]Œ'1qk∆B?Ùcv¸bÉa‡Av|û\VÁ∆Îá∞¢4ã™ü«?ÏJ‰∆˚ZZ\PU∑OE
ÿak˜àúõ[Ï˘¡Û˝◊-EÉ∏Á^¡˙®≥,ÿE“G∫24J´öÌ¿¶Äæ<@ ¢NﬁSM≠ºGı
µÓ´-”∏øBK(≠ó¶qŒH<ñÊ,‡/å´Õ‡e‹ÕZ	yGüsÏigh™ª˘cÃ˙7¿ÓlWMr∏Rlœl `åõüómÆ7qcª`¯8,¡Ã,Á¿;bf3ñv!∞ﬂ·úıO±}#∂¡„yÇm≈yÇõ˝≤x:ŸútµÀ®iÅ3‹ü•´eyÇë%z[À€”Ò/¢æ5‹wfxÌ’s/ÒµøïõΩÙk®v©ó]ËbΩ‹uÍup˜˛ıA/˙È∂ÓõcÙt2X‹BéÁ*ú≥V}ªo˛xÛø^kA‹«◊(ç¨;okMå√Ω^¯ª[>‡ Å∑<si˝rÛyÚó>¶7∑Xk8|Éüîd5m«ÉWÒ >OTÁ–ÌΩ{~¸u8Ω"FÛ1÷4H:- ØS¿ò ê7™˘’ÍV⁄Rïy¬R¸ey0[ûÀ~∆SÙfíNÀ/˘oÀkYy◊~Ú©•æ÷é[;]Ö⁄Èë·‘Œ_u€Èfµs;ˇŒtpß;éìª∏7Ø£ªh4‰Ï˛ôJπ∆ÅÖãbA°:U/ÎÀ&|◊jøÇﬂ¥„£Bó@≈EõßTäNÓ†e8µMJ”≠≈ ÈsÌgVG3¯Ë±Å_7|ènöj·|dçu<JEvÆÈIÜŸxDVqá„ﬁ√_Ú.˜Ì¡ª¯K›UDOƒï| ëüò˛øíP2Â¨ªR8√˚ì¿ÍÈ”ÔWæ¶—_Q~æÚ±Åt Â‹´_êò*ûs_^˘√äRJiÑèÂï£NH‰óbç›¯\y˛›|=ÑÁp±=}ˇ^ÎÄäüòNµ¿>Ñ@Ê>¡@*î=Œ@¨ËË!82=ÇÌpk∑È>∂Î®Í;€)Ÿn”~l—“å—‹Ù˘é!Õ‡ÍR>∑ÑZ|√t∂Gd>	ågäˆmã©t»˛f˛L˙oÜc[|ä&ùY´!bê`XÅ$[b:MÒD∞’6I~EMÜ^4≥ïπùÉ˘A>Ebñ\Ñîø¬4îÌn“èë èOAn¡<î(4i
]`r∞¿@U7»h ÷ß W∫™ ‚úí‡ÊI?ªHvƒ¿≈∞ÿÊ9§ﬂı„¥¿X9LOºÚïq√‚óäëëâãd∑Ë#s≤©¡√£éŸOê›ÿgé¬íœêxÇ>‘  tJ[‘VÄ!µß‰ëÁH[é@^Œ;OT“löÖπ)˜uãSÄÄ±∑ªëô%N˚}GMÜ˜6˜jˆ?`j($^GAG°€îoí˝öQkMôuòﬂ÷éﬂSı{ÍÃπ ıøOŸ¡È∑ ¥&fâNAˆìΩÈd/ú%æ√µok˛^0GÊ>¿,Ê˙„D‚(q·îﬁ?m/Æ≤ÿ∏4?“ABFÍWa"9Èœ˝Xm{Îµy“®S§∏p]+î¡úÎÉaou∆0ñ(n∑,•9¿OΩ l©e)´Û5h–:ËMfúEˆ;¥ÀˆÃ;÷6„(d¸ÌH·¨lä‡˙¸ö7eﬁ°6Ïb∏@T… ±ó~à6Ë7÷HÀj€ÅM*„à)¿Ïr¿¨|âcéj9ê1…O?‡*◊*%>GΩÜ¡òqO∆∫ß«e›ÊC¨3·7∑Dãè?ìò-Ï¿wœ≈õ ∆ÏÉ ç.Í≈hÂ–h∞…•ºµK‚º›≈`ek˝‘]Î`S´ôòÑM'ù)ûbìé’·ÂW¿lò ôM·Å…&˜Éè˚pﬂéé|{	'C·ÉØÂq¸Lá~à∆ÒüÊ(Jâ$§:$∞Ê¥•œòº-x7V‹[‡u#în÷'F∏áBLπ‹l6qÙÔÖåqôÚ sÌçH‘rq“u@ÆÛ&]Zß*«ûÍz»"S∞™kòçÀ_”‰õF!—wŒÅ‡ ‹®>Ï9
D˚π]Ò›1Gvl¢Ë≈π©∫ Ò/˜FÛ∂[àE1!Çû#åçgfêOC©+ªœZkb
jßa©C$“§?z ﬂ∂≈Sõfòù3Ê¥£ÂW[[HÁó©~Í%”ÆÔºK“åí¨ÙQ90
¸çÑ‹‘Õ.w≤¡Yö˜£è{W∞O“ú≠|>QÇ≈tÂ€+äòâpT@H’√ÑMuñ§£∏…—+#ñ……ÖRûÉ ê‚K≤å—[]ÿY7ˇãû5?Ç(Ò2Y@Ö¿≈∏»‰≥l©åÓ@|Y¬'ﬁd'îﬂAÕÅú°Í"˘3H»1|ﬁƒÌBØ!3¸“J≠¡‚„~8˜πHÏÎ/_eä_R≤¬ÃË∞∞=zc£Lo(ÔaQA‚¬§ÍS◊Ï\eÊ∂-⁄ÛdpÖ.§^Ñßo_€©9]Z©EùîÕÇõiÂ˘≠‘M€l&ñÁYº+3Ùi“ÕcÑGÃK{ŸÒjjÚ∑£NìµFTÜ$ê°}9›*ê¡,ªa»W@PaOÄ¿	Õè…"ÏbÃ=ø?ttú·©n)÷≈EüIi€_|¡û–&›IÛvOUµç@vÔpjJ—E}u8ÓÒ¿`>Z'˚ª‰=∆Ç ˝¬§êî"¶<i~’éå®Nn_ü~,´G ïe≥2“ã‹/!$∞>”©‚©Ù;«Íö>Bf¬`L≠~≤ˇˆÄ>ÿÕó"3œªoÊÕo	≥â1ÃtîΩ#ﬁh>Ù3¯ÜJKæåx•3X‚›8∑ˆ5Øﬂk8âÿˆ(ïÂ^ﬁ{`fïvP€OìA;ÌYıjKS›Ü3Lk˛Ìù≥öôcWµÓÂ¿U≈ªÊØÚI›Õ !{{Á˝¸iV¸™XsÊÿp”iXÒ¥s%“∏ìÛÊŒX,m∆|3ÊMñ1_éåü13∆2˘'~©Ÿ4¨LV'I≈~«LS-"ÀŒìõö◊ ;7ßƒBΩ9â$t´ÊºJ≥G÷ÀµÈ≥6Ÿ«"Kküäå<b∑ÃvªÃad‘àöë!„ßJÉ·Wﬁ•≈~Ω§È}__Wö—œ“OH|îú¡{Gò∑´	o√ÂìoN^Ω§g{ΩMWJWÈw◊Eö\V|Ô~µ5?5_? .Ö˜Å{wéä´Ù	&EG.k¥"o˘ 7ıÌ 9'€ÈfHóÒ€◊÷-[Ô è¬§c¸I`ÌXqœˆpgr‹%4"˜vYv7ìSÎπh~ùlâu„.L{∏è˝≈Û‘øgºÂ¬Ñ◊≈≥Êªı˜˙»}oz…„‰*Àñ∆ª8üùÅÏ'â6÷åÛ<æ~N4ë·Ø£õº<åÛ"!ü≈Ôz≈Uƒ€±íù·ªVπeì\õ
ûÉMÊùº∏˘±áï√A“£§ò*~9Ï¡…£◊çõåØIå
èòî ‘L‡ãiÍƒ®mh†õvbrTº˘l„õˇ=@«˙v†aŸiûû«§…ö55pfAR”Ë™”-*l°qD¿Döjæc£´çéŒ‚[”\Dì“ÕL fzÂiÄBjöië‚¸˚qzëYÄp¬ä5Ø`ÂÂz)Ûˇò¯hÛ'ƒìƒI1ÆŒBw•´&0©0ômÛ+»14(87xıfÿÔQB≤œÂñß
Cc^*¥Ê∂{¬ãë€‰çõ^8·Çì„:Ûæ”ï@Îf≈ŒÁ„¢3ò∑B0s°Hıäı∆)≥NVös≠ï æb;‚ùúí ≤Ê	Àéiˆ–ßrò•)‹zùıï≠–Æ?õ\•≈à
—/‰ñÑU~ËÿA"HÕ!:–%¥à™˙WÒPŸà˘ø€.ùÇOpêÛ|cv-≈√êôX"û∞¢°c:*à∫ì¸Q~5‡ÉÇœlçÛY»¸#7ÙW◊ A˚ﬁj∞°V≈ W±∑∫ÑΩ…-≈÷´FÂOy~Ã„}YS.HΩCÆ˜Ó˝cÔ%Ö9Ë>©•=VÖ“–¡˙ K÷tæóXvF[ œ6'Äk)*ØÙ[¿¢ÆtgO‚7ˇwpsjòüsò◊π9å:Âœ	ŒÁŒug5åVÎñ◊ÅÀÊp\tEyr„“ÔNÅ3	3Wé7É„≈”¨•z‹çUarg≈Ü¥ ÈàÓ≤^8wY7âuLÈªzŸ(yÃC 'Ô ©>¡j◊ΩtÄÂ≠ƒ/†Eòíuòêgπb8À˙§yFØn(Ò ß}k¯ß»è”p©6◊◊-T√—ß4P¯Áâ.ò‡˝_?’m¯®Hé\‰QﬂrÁà¥Åﬂ∫h¥ƒëZvÊû¥™+ÕóFN»…T·Üøıx_÷KŒ»…õlo—9ÿH'g![™|„˙ÒÛâµW ø€G%jÙπm®(÷⁄7ˇÇ€Ø6≠„aL6(dÍ‰%ˇ
PÊ√i`Ox`¬=(∂ÇÀ⁄•°ô´PÜ5Õ•ﬁ…ùÇ+)Ö¡…‹ÿ&¥¶VUh_.s|ºBﬂ.˚a*¥6SZ¢òÄP‡™C6∆45Oõø¸~˘ƒÍj*I∂ıO∞ñq_Hkÿ»ñÒçÚo⁄XØ7øÕ“AT˚˝†Vü:ç¬¯7®åÓÔ œ±Ñ°Øs_ZÖóxE‹öYoÜ&oå9Ë≤
ËÈ
àÜ6àÏû—ıb*uZ∞Ú‹πÁTò»œÔ$eh@8ßE§1»Üπ”ò}Ó¨,ãÿ]˝ÍQ†»‹∑ò˝ÏZ\j´»8é‰I—›π4ëv±bòlÉŸÏ÷dƒäÆœŸú’øT67h˘,Ó–ø?dY˛]˝Í!ÎåÛòbk±£≤Ñ¶ñ…≥î“o§mröß…ËéÃ¨‚ﬂÛ,Dd»–©6<µ"¢û∏6∫õûeÏäC?±Ñ§i∂÷Vrn◊ÜÏQzﬁ≈·ÊÓôÊX¿!4ÄËËé¬∞=≠CÕÊ¶Ág¿„ﬁÖ9πµÓ¶5Ÿ“@>9_+0#˘¥á@ELﬂ»+¸µ√’¢	éKö8Úån˛îßÒÍ!ŒçE/≤v∆Tù=k‡√≈¢ﬂB6√í0˝I jéå))EûÊ…Ÿ”â©òä‡Qº∑Ç.†…pÙtÖî¸Øe∫Î¶ùN20À.π⁄πPRÇí8}mg(q˝–cëëÿxÌΩ¸¬ãìwrv(‘2µ`≥iªÈBûa•ºˆwQ LΩrÕl¬∆.Wøb@3ßå§/â˜,∞òqΩ“gX´«©Ò)!º%=>¸X@˛á7C2tÍ≤ö∂ªÖπX]›ˆ]◊[
Á
r¢{´1FîùU∂'‰,0è\¥T™úë°j)~ﬁËµ÷∞Ï©©aHµ®©a9uïO∂øt√4ë¶⁄GdZw”¸•aï	pgEw≥ÀÅÉ;NT∞èÛQ3†õÇòÛtrÿSw©'e6πøk\ÿóíMß€ØQßàÖBõ\≈˚ñ»5Û$`∑∏çﬂÓƒy«M˜n·‚√â‚Ùïçá¿õz1%'C\ƒ™¬´ÇﬂT%›ãOA‰É<3 Ü´Î,G)˛Ω\›| [eÛÅπA‰∂° ¸’~éÈRWë˘oÚ¨Ú]P†◊”Í∆CÛÈ'⁄Ÿµh∏±n°·—°dgVÛv≥©ò2RâX%$'/≤.ñwpë<>ò˜ d§ﬂÍ 8$,ı3vÑd“†∫≤=	≈©îzü¡˛¢mG¶àQÉ¢¬‚É 
Kó¿‹ü7]ª„UΩ?ØúíÛÄÊ7√†l¿á"S+>‡[	”†`∫ƒdÏRôòº¿åŸ≥õVïÌ(ÿ¢ˇ}ÿP‹3
§É%‰E·gú¬ç¶”ª]<0¥û™J∞Âœ;Öñıe`ïüÒâZ¶$U©ód¢‰(ñFL5\5Ëÿ…·Ò\¸Ò ôl9T±nLõ0Í&j∫<˜÷ä6›]l¨8+∫∞YøÔ˜&}#nzU÷I0ì+&ÖÚ¡Ëgﬁ÷v\…6‡nsµ!ﬂ≠7◊7ﬂW))K≠;Íœ÷>ΩÖ⁄AõV/a#πNN≠ˆ‘y“ .¸(ßN.∆M°}ï˙‹%‘î,K9'çA–Uaºòëä¥?^WTU⁄dŸ¬&‹jiM‹+≥ÿXJ_c≈∏E¡L„Â"x∏˙2µùôÁ~Yé∂ ˛Õ∫(_=WEkîAãne)iÃ •o∑.uﬂÄIÈÃn€–OüµzgÒÈÕü®àtDˆÁí„Nm•+⁄FIı&¬Ó]ñµ‹©”¿W≠¢ŸŸcé∂)÷´¢e·6/ã´Ü⁄Ùs¨œ£’Q∫Aﬂ˛&Å†«jÆÁÀó¿åq‰T( R‹˜r<√∫tìéá’Â98=yÙ˛#kõ˜ØV1À¶âÊõÆl,⁄Òw—üùáK2sÀ§ºòŸ∑<nÇå=jb“eQf!¿sÜÕ„≥|∂≠ªËkE0¸0	∏ã?Ó3◊ﬁÓn.)Ou ÊéÑÜÒó{d,CZ/	+á≤πbµ\5¥¨≈NÛ$˛nı¶[††¢B¯ Eîbπh˝lê)QEˆQ∫ewv˚∞+øs3Ú◊â≈öO\öG@qÂJ@y»ûãözåA(Ã≠ƒÆn'∞z’1]^ftÔƒ∫TêW˙ˇ  ˇˇ Ñ†FÑxúÏΩ€rGñ ¯ÆØpb‘ÖÃÍÃê,	¿Ö H¬4A¢	P›=.»DÜòëäà@°a÷˚3Ok˚–µ˝PVmVOekk÷èÉ?È/Ÿsé_¬›√„í (Qµï&
ô~˜„ÁÊÁíÛÈ`8OSÁ«y2|w√Æ£ûÕ„(øŸ\…fAº˝Û~DA≥2€‹bz:çbÒ‰üˇô≠vŸo~√6w&<Õw£t8·,ã~‚[◊◊nÿpdŸã` ∑ñr~ï˜ÉÈO˚èWWYG” Á˝Ÿ|íÒ%∂≤}„«ÊJ]xG∏âc/µˇÊ·√Ÿ’[6J‚º6	`ÑÙ¯r√fŸ8ç‚w˝UñM7.˚kÙó^ß—˘8_⁄~ıπútL¯Q˘ Oû'C¯uúC’ÛŒÚ,Ôıjπ[∑tõ_·9gAqæ%Zå≤ùa]pˆå-gÛ·êgŸ2€`À…<üD1_.Ø‘õ/q"j»K€ÂvvNæ{I≠ºﬂaX‘πw\◊√ >‚‡úƒ∞•I˙7Æ„ﬂ˛MXwsL£	øbÁ¡¨ˇ–S‰@Ì≥yû'1K‚›I4|∑u›È≤≠mñÃxºF˘LÖ ©{√Ú(ü@˚¯8HóÃ.°Ø¡cñ&Û8‰arŒŒŒ˚≥†&}è¥ÚpUlÆzˆ†jú\t√)∏C›<‚Ò0ö(–\øà€\√\x„ '|èOxŒ}sπNÊQÛd“$„÷LËÅ5]ÑÊpíŸxmë9Tüün˘º˘
óüuçö÷€ÕïopæªAn&ü]GŸ¡tñ§˘Q /"~˘ Ä†N,‰µniòƒYŒ2>›M¬Ë<a[,2ÎΩJ.≥¡(ö‰<Ì§XÛA:&!Ô&<>œ«OùÜÜ…Ù?‡®47ï*$wö	,(≠h/Â˘<ç≠c≤yòÑ¡ÑEŒfÀ7≈Çÿ;1œ ≈:£ ê_8¢@p˚á€KX»Ÿ>Ë«9`G⁄Ò•iË9˜êNÚ> }Èh∫%¥'Æ<fgIÚT˛ëO ®Æ]Mÿ¨ˇà©∂◊|«~sVÅøD<üÕx:2n†‰ïuÄ¸ﬁrÌ_F!œ Ô§?Œaﬂ6WfÌz ¶≤õdöË>OÁÒH‚NZÿØ£	«z7M;ktûF!√ˇıá…$ÎØ˙[g@÷‘jÂˆ≤ï◊Ωhπ…¯÷Óãvk∑¥}î&·<O2ˇå*; ¸„%ëz©Ã≥"NX≈¢±:Û'~Ãßl˜ˆœà+>|ÓÇ+ƒÛ◊(Ëõ∞ƒL°µüµ¢60i]ﬁyªΩœÂCÁ©ß?∂ÕV˝Ïàui™Ëb/É\V"∞uˇ!ı¨ŸUÊ"jóÏ?ˇœe˚WQÑüÕ‰!D™√∏‹ßXÕèΩd¯{¸ƒ”gU´ZÖ…≤ip’˜◊1d	Fì‰û–Œ°ßi?¶…dr§L2¿´Q<Æf‘¨}»Ä√·ù’{“LÉYßìˆXDƒ´ÇEãˆéøx≥}ùbƒ≠úπÊmÙí.aãÙ*∂∫∂ªæ≈3TOH8)Ômq∞É„∞ÃQÊm¢œû–YXT<©‚üΩÙSTÒ3õ¿:¿òH‹⁄'∏GÀS,x
bà—√ı0ÓP/ 3„æA¿¸M»‚y|÷ñz∑F_lkkã©˛@Ë0OüuËû¨Æöt§í2èQ0∆<Z]ÍﬁlRÏª`í§ä´Áœ€/Ω‡g\/—ù\.CQı‘#ΩhŸE·/±,∫pª	s)Æ›,HˆﬂxZølÎ}G≠Åç»ÈÒìf‰§ö¸=Lá∆FÎ´≠–çL‚¢“πCÒ,Î9¡ÿ0¥hÙæ∆ÛK“J6ªB÷Ó=Ii∆˙õ’Gÿã˙lvî	†[“≥^S”$rœÜÇ@HD®íYŒVÜÇ7Z^∞u:ZOR†ÍûOJB ∑9	Ñ^õÙto Xû¡ì&Tfı‚ˇJ¶¿˙jä#ã‡/	'3Vì:Tˆ“á^n–…∫>z·ÁÑºdBA(è√BÊúÕØT ¶•Ûq"î#÷Hü€ªA<‰ì ›\˘™
q®é¬(Œ&<D©Pœ(Jß ∫â¶oäná‚ïÍR∞G7g"F*¥'1˜ü5O˜®ìt&∞o§ì• ô¬ı≤à™fÔÅƒ“£ÕR	è¥·¶€)–Ë¶\äØìtJt˘Bó@œIá†_:∫Ñk±ü∫†‹«ß¯’h∏"Ä¬N<üL‡˘M—/ﬁo]s≥0,°…¡(ä√NÑEÄë†Yªàa∞eX^¸céÛ8∏@ÿP„ú$A®ïçX;Î¥ÊäXGΩ ∞ò7O?˚leÖı˚}vÙÍÂﬁÎ›ìÉó/'>›Mì8ôÚ<%•…ÓÀ';ﬂÏ≤@a¿±ÿ ≠« ∆gá	¸Áø¸O6œÇ0aq¿æé&’õDx3˝~î>¯LËíˆEµìh
Xaãu`˝Û Hn∏ì3`wçüıƒ∞ÎJª%öx'ó=bLíÀ∑–∆<„«9 ªTÉÌ¡◊Èt	n‡Ì˛hƒáπ•%-Eàõ.Ç	4ÇP u
ŒZ1öÎ±á´´Jù•TYTv8·A™Î´f©‰MèΩyKﬂDüa4s¯f–ÌaêèÅ"_!q¶Ô@˜ì¥”Å∆¸í¶”—ã“úÛÜ√Vƒxå∆· œq’∑Ã∆ÃWÿìU£|¶b˙(Ñe‰KDì(Ÿ¿ƒ‡ÁÄdJµæCw0¬cwg≠«ñWÅaÑ7Lïí={Jeíê	8˝å_>„U`%@
Ì|¬I¢∏õL°Ó˚n{*  ~≥¡‰&Œ›S*π¡vf≥◊XEû∆Ãç ∞	Ë¬M®€Ñ∂ﬁº›ÓXõ≈„`˝ß"ìµÙÔÊ x“aç®‚sÒ›Çs`~∏Y> v¬Pc∞û¿hÊ#´∂Dp∆q‚ó/‡ƒã#%æ[ñóù“'|¬aÁuıªæ÷aÇbà™#~ïkË*∞¡SÒ6}Ü75!Bœ3ÿO§∏» Bˇ√îCMı1´˙“}Ç¯≈n ªvDKSÇô#h< ≤zz6J†:ÂUàë˝Ω– ©n‰’˝∞1fÄ€3≤˜Òêïëœ5É<ÿ )†F	Ö/ÉéÂ|úÅh4•…¥≥å∞'∑‹d–#`≥Âﬂ¬˜(Ó,n»ÁŸ2†ôÂ‡|§!Rl¯πÃßß0Ï8l4c˘mw@å@g˚ ò:ïXJAÒkËK«Áj’$¶ì@ﬂ—Öí ÎŒeú¸¿Ô2˛£1èÂ‚¿´sÑ5béÚÉØ∆ç˙6ôõÃ”±©¸Ø€‰…¡ÒKâv∫•E0ö¥ñ†ÿPΩ˙whûÊ2'’8_7~Ñ¿—±÷p8‚ò-RÀ&âïÎãïÎ„√sû¡“$∞˚3`QœS ^ıß¡ëK ~Ì∑+é˘∂fy6?~û‰»tn0k;êL·ê`Ág hFgº„#t◊≈‡R>AuWQ9Eılƒ˚÷<‚Œo'åÜpÉ‘{J¢Î<ê∏i ª7Eí˝èìK∫Ô,ÔEÁ(„E0 Ú$ ë»a√p®±<}ØÔ«»Ú4M“∂–≈ˆi‹±âæN±Ôfè≥W*ïKI%æî•X‘ör§≤OVñá6”<˙˙m˘†o0„∏XC’∫—‹6n ≠QóÂ„˙°ﬁñàå¯ÚΩ$&ÑÿRa>STF¿@≤é©Û†”’[Wl˛˜˚0¿à‰Z≥€e∏wÏÛkhP>œ≤‡\»Ú8¿Ÿ¿¿ò#X≠õÔU∑˙ƒZ0äîÖä15`ıÉ¡k>qOÆãu∞wèâ_ar
¸–Ü§ã®Ú–ƒç¿£QÖ£∞’6∂_Í˚YMÖCÕı±Ev]≥úQåªµ4¯íG¿˘©’¬(Bv¢‡ÊÌ∑·<ÜAR√ëc˝æáÕz¶óO≥AÀßYQ¨Ê≥\‘¡˘ÂpLN%ﬂΩ°f\{x»8Ê”Ñ†WDuöŒ#—éé‹ÜT\tñUu◊#a<[ÓÖëtÉöi±áÇˇÎîèû9Ù9√∏±æ2ô·êG±ÔB›m rÉÅÊ”ù47‚ £!ÿZ`^Ü”øú6´¿á=ÿ"ú#¥…Ö›ﬁÅÅ∆9îÜbﬁ^>áèT∆ùr…îáÛ!H¸ ìù—æÏoŸÚ{p4´ÓÇ∞jÀAî§í•m7DÉ¡†T‘ix4Õ£§iMÛ$&«Í‘≈sºßˇπíÖ4cñ¬zÖ≠+[5Pr˜â‘ﬂ0“©@πjÄ“ç:®éMé´D˜ø|BZv°j&ˇÄ¸)T¨ÜÍ◊P9zÃ◊=fçBÅº∂∫§tWT∑µ©  £’‚rii˚ªdx˚Ô,F# ∫^í˛§;âv˚{êÚ∆e©°óZ-°œªˆ UØ[ÕrÈ≈Ÿ|≈G¿≈èw/Õ6îYg6É∑ÃÛØÀc™ˆ>cı£R7G_hìQhyÑÙ˜ß$ô¬ﬂ˛óèô:√‘—vhÿP17Ë;˜ZH,Qi,g≠BÃ#•§>+]“ÕŒ˙èLrï≈„µ≤©Üæ¢ΩÇﬂ~5ÇcÉ©ÕVa8≈ΩdyÛ|WŒõªº¡q«`ÿQJã≥Îµµ¢Ò„Qì-Øå◊¨©zÆ]ƒµ™öÌUÊúÉ‚|¶0∂âõ“uàR‹dÉ,0◊·©·ÍúñâeZ‡ËÒØ;ÑiÑÓiΩ•…È∫Ê)ÍN$D∂u}4ôg7ﬁãK‚ EÿÕv!GÎè)ﬂ>Ëã.˚Ê®¡JÌ!5ªFk4j#M€<ıqù)€Ω⁄˜Ì+¿a;ÁI8∆õ„G•æ™èÑÄÑÎÇ)Ãó∆èÃç6LS?ùï8!∞<º˝#r§°Èﬁq5¯÷síÅç\M“;”˝u¨À!≤9
H>h]¥e_yU^™≈≤ÿá⁄bn+Mÿ™HômÇ∂9^Øf|gn∂ÔtCÉy≠õ}9GV…EŸ¨¬∞ß¢UÉUÖ`¢ŒŒı‡|ÊyÊª5À‚fvuÊ3ŒÛQp4ã¢ÈıAhœv)ß
S/Ê∑{¨¶c∂Aé”†R°)Ø°$C˘˛˝ø¿oæWÖL•â*∫#ü1|ˆyπ‘ˆå€oëi]gÍ[:πœeÌDâ–t/ö©§Ï’5TÇ∞ñóÑ∂fÒ{\h]åt∏ÿ÷™.Ôkë“äT:3óˆ-Ò¬GXŸ«x¨ﬂ¡ª„°k]˚DóKê4ç‚ü≈™8s@€ñ5À⁄≈cÛ¥Á“>øaêçyËÚª.wŸ^ÏY∑ƒû<œßZ≈QÃÃ≈˝ˆ&¢$k¨BJª3B”V)+O«◊V≈°ç^‹Üõg	)¡d“‡Ã—ÄËÓÕ˝,HÆ‘ØœºÊCQTµÛ⁄‡qµ˚⁄†µ;6˘qú‘ﬁwîFdÒ§%ä”Ûjæ÷3©Ûtì*»bL6c∏ˆ°ûm ˇIˆSÚt{TÁÈ÷Ñ‚]tQ%WπN]¶ÿÊ˜ÁÚ\%iWÆB¿€-ÓxP–SŒ\Ÿ‘Q¯h‡Gzﬂ<àgÛúMÇ3>ŸZz!oeK, Î≤·<J;ô√pÂ-MÄÆ[aº∏º0Æº¯ ‘9œTsê'Ø5ÔjÓ¿öŸGlÛhLC˘Íïå∫(cùdFsütóåaúh<aÂ¬“Ñ;n•n≠…ãK8´∑–Z>Ù«St√‹`Øx•∞	3é¨Rè%ÈÌ¡˚ÊËDcıÀ$o˝ÏÖ*çÒŒùãs˙@Ø¡éÛûpïsn®2|›:áœÒ5å&=∆~;˚ÇÒ<ò¬¯,öqÙïFÕŒ1O/¢€?†•R0Áîå˙ÜA∞˘4`∞ÎÙeòLÊ1©â ±Ñ™ãPÈ M˚é—RÙÂ´Ω˝WlãΩY`röÚ!?ãÑIJ¡Zú"Ω°G˜îOOÅa„ÒE2π–ûVÈYö\‡}>'€`˘ûùæ)kË
yr
≈R~>ÁÀoaQÃA?ﬂ˘jˇ˘1B¯Êø)NQOû¶mò™ ù˘l∞Â#zÇµ‘ù	BÉ›SÆò1ñÖ7®a€s◊z˜-Ü”<=&π=¶	áâ_’Ûb¡∞∂±zvj˘Ï.^ãÍÆ©Í'OÿæZÊûÇæ]ê¥ Z¢Y¯™(”µzŸwYå>_–¡ÁhGì2pN"`TÒã$Hk∫s∆”<¡>8µ@çeX‰•∆N+ª¿»•†)vê<ùÉ®ƒöiPÿ4&ÿÔ∏ d(ﬁ‚… ˇq·i¿¬$_¡cΩrvà&8ÖrSûME[xGH≤£õ@¯Bó∂XÏiû¿¥&ÛsxÉlj‡‘¿«›óœ_æ*É„5é@·¯ßÑaä_gÁÖ¡l%ƒ ñ5œ\ZQKÀ ZßÁÿfQñXê«h*‰Ä#∫—¥÷9MãÁv”:ÜÖ—t’˘0∫àbt»Ù!_ÿù»áï(Œì—≈lûŒ&æí/Ï.‰C´ã‚ÕæäËiVæ∞õïÌë'ÿhx¯>à=Õ“cªQzTµ≈¡7⁄~œ'ËèTn]æ∞€óÀka°£yCÁ¥oøQò™/Ÿ i“úÁ|7ô$ÈÀﬁø“Ô€H¿<eodÅ∑»‹õ/ŒÈòl_êP@Ox AÜﬂ`Gí*‡"Ör–4–D∆˜èwé"‹1»eó(túGÁA&Óê∫"ªà:y˘jwÁpˇ≈…ÀS4…µ_®Å„ûÔï†gä∆ΩDíNàtòê&ö,¶5Ô•…,L.%≥Ü∫hô	¸Ñ˛ŒC,wíúüO¯1=∂’Ô¯˚gƒÿ=ïÕm∞„`¬±√Ùi©Â÷)ï¥gèV’⁄¢ã$
ü#ÅnŒíd¬É¯©ì˘ÃºqC∞¡íY7yà 0'¡Ÿ˛zï$≈≤V>&°HÂ£YéL‚AH&>Øx0Ã ‚f¥vvf3˘µ˚‡©—Iê√8Œ–*æG$å«<Õ§C·®'¥£$ùˆ≈F$®Ω48?'¨.m•—ÔÊl¢ÃÜpñbQAñ∆<¬˜öÂÔgHïë¶"Ωº ç,#]è6ÃÕ˛LYˇ©ìÙû¨ÎØã¡m∞›„„¡	˛Dí rç≤BP%∫Ê¯•L˘F:Â£≠Îb˙7¢/xÑnÿ5»≈öâﬂz›\øScâû±•ü )êÁ\
Ã;Ó":Õ)Y_Dh⁄ÆÈÇøX48u k–—ÀmZôVäU⁄/2ﬂ]∂ùäÏ…‹ˇ“yöÃg(√Z˙Á∫ºuó €I1Ê∫Rdå©ˇÊ·`ıã∑Ú—O…Iæpt…É◊“¥1Ω≤=ct≈ö·.Áiñ@Ø	π¬–~»GÁipÎoèŒ`›<ÌqÙ§ZB√Y„ü`∫$Y-6¢Ó≠∆mêë≈Ø™ûƒJ=\},⁄*_+Jdc%‹;n[öuˆv88À@¬B˜÷cCQ$-¯Ñóç·ü‹ˆF´•E’Æß?¡–≠∞◊∑ﬁØ˙q·Hmio-»[[]2ö/éúµ&–zèÓé˘ù“F≠ñÌˇm;êô´|2n\Wjüûws&ıI◊ÚL
øjûæêV¥À_ì!94ñºùJ·pßWÂäÑ(‘ñ$K€ˇÂZ}ÈÄ›“µ5AÄŸg9ˆ$ùI;ù¶—9çÙÿ√G›í*∏2<J≈çÅuŸ´fDß/–Uÿ%∆1O¨∑g)ﬁı/ﬂúu∏÷(!VzMàõ·âFÃ›¡	:≥Ä∞NVÓÀí*ƒŸÚM≠ïâlΩ–±'¸Z‹ÛY«Œı_ãbT}¿du≥˝Êw’—	Í„§Áãw®üΩÔØ €⁄d€˜v5ΩPœ‹Î,ÒØ	6:û)¬2Ö· ·!˚ˆ€çÈtπkü€ºÊòhLæ]≥\‰≈Æ1”Ñèrö-°®ï5÷œ7ÄT\“Î±¢ç÷BRÉ>yßdb÷=ã_◊S%^ï‹¬Ê1%]Rw ¬CI[(–åµêR)Ÿ∫a[ˇùƒGb–{¿ƒ⁄ZL>Ä„9;78'SπN◊≠´XãkyT¶◊æäeª£xzG´j1¯)<œjeó0†‰Rlﬂ∏ˇ§tÉ◊Ól≤ŸıÓ)P1/2ÓÿF®iﬂê1	:‰£Ú·a6Qp≥∞:√(G´;ì9GÀº
}Å06ì±∞‚ñ3ºQê‰‹uö+Ç>∞Ü:ÒMæ‰%⁄±«–uO,ÌB•j◊1†q’ª)Î4÷˛’(ﬂ*	 k+ÒÑô+Ùπøw–Îƒëy[	Üô!ÛΩy˚ÒeC=<>Êπ‘ûm∑›b0EQ2SEÅz’ÀìZ¶ã≤óh^,7úÔLHnLt,˜≈ï◊hÔñ{™ ‘7•2‘#f46º'¸6À)‹1§RO˚¶Ô;3q˘Q¨’`dùä)-¨à%{ÂòÖÀ;·zs·íY¿C$ü´À Ó∫ÕÑ¨+o\Ì3ÏL-m¨íÂ2¬¥&b	ú[`y©W=ªÄé+π∫Y≤´‘∞˘ú∫NDrΩ íã≥ıéî’s{)É «`ˆô{kÏ‹)_óá·J_. 0œ’µŸøó}©‰I¥˝Ç√à»≥Ác3|ÊIo~7x\müiZ%ï,ñ¸¬ÉMHîäÚ∆±@î—ëÎBë
B™Ë‚cãY%°≤uæ
ä≤°Ÿ&X]“Uı¥PtËIºY¨ÆøUpo« ƒIxÒ˘å˚o≠
€xä™ı¯aÁ·ÍÍ≈∏ø∂öÚi˜mãÄÖﬁcàpë9J¬Óx§⁄Ë!ÑÍ¿1˙≠S$l*MüT)äM⁄∫ˆ£,T°• HÁ¿≠`≥&¸< rl‡ÍXæ¥sª)°,€Æñ¥«ƒiŸˆF¢gıË¶D⁄∑Æ›'7≈≤XPMí∂ÆÀƒI+“nTéòø±¿6KtVµ$Jf∂È_Ω
g©ΩcZ	>—±dË«6üÔyö)_ë/\Ÿ¶B˜a<˜‹˙?ß+÷!z‡ÅRaòû ò*6≈À»%Ñè`âÓ˙=Éˇ‰"†£ö∫nÕ»‘#‰w£—¨∏ƒ	VDaˇâ-øJ.ˇz—≥^4ÑQÄ‹†O%ÚÃé.§¸Ü=Ej÷7É)±Ütï˝ñ=—ˇ[{‘Ì –U≈8@6 ?8Rm∞i9l˚ÿRy>5=~q´3çUt[ıiq⁄°¬
ñ,¢±†#;f±F®à{÷®;6∫5◊äÃI§•±Xµ™ºAS¸rswgùm^˘cÍ¬Uxç&‹„	[≈€ƒ† ouröc!◊¨W¶ñ∞9Í≈—Qáão•G¥à*‹3∂íV|m≠§o∏≤V)~œ
m{+[®≥}Úçu6ˆΩ⁄oê»±%>ïµ}B4F∑Éó-íÀ°√’yiR¢{U‰ui1˘µû,Á2C7†ìW;«;{/ó≠ÉeÈŒ´Oñ“ú{‡[h–◊>A˝πG}˛A⁄Û;)¿˝w£˙€“~?BA˘ãEuﬂìs‘}?A›˜ZE4˘üC˘möV™Ôè©˘∂Tk%Ωwç0cÖÅ$C”!6^≤M«ròG≠#'6êæ[ÒˆáFmƒ∏4 RVtxl>©èŸòa+Hác™˙≤¯]ÖQ‘Çu¸ÍΩQã~Sqk™ÀR [f˙†/o{Ç®f¶*N0∑◊qû§ÄèêÖß\NÀÈ,MN©ﬂSÅ>íS ﬁ|Ÿ.'€†–5∫◊6À 7Ù#äÕ·ùÂ^î⁄”ÑûyŸêÊàaàÓgÜaîVOPtgMéz6ßÜe‹yŸ˚Ö ±¡|õTƒ5v˜∑s®–öE÷¥O=v°b˙ïáÎ©∆a-¢gjÈ.dioÑ˘ö‡ıâ¨≈ko•A¥8Ì€26r—2ôJ˚ê'x ‰«y¶	Õè¨7È)GÓ^p’ £{∑`Fƒz(∆dBí¨Ï&5_µÉ5ì,ˆ”Z§≈ˆí&YﬁLÍ´∏Av˜ùáûM›ÓîôªZ™•¸Xˇ¨«´÷ÂßÆGøm:P\,nì:tÃHÃo¢Ï´˘‰∆Ê6ÇÚöèÍe«¡4Øj»ÏáıMúA©Ø#>ëS˘Jˇ¥™	¿µXª“ñË∑D˛7 ÃZ5+è!-òxE#“‹æ—,‘2tn¸1›Ï›ËÃ@F4≥ﬁâ∂bTîã(Å∏#X»
cáÔIõå∑|TZEp#≈«òØÙ4√éOûJ|%£”AﬁVVòq5x"Øè©ïÛt>KPÎ'≠?ò⁄(H0uC$:D?¯!J†é)VÔ≈£äı˙Ü¨B∑|W‘˜¥n∆ΩÛ°.¶’]≤`"≠ï’KÖ@¨ﬂÜcYLhÊ¨∆ZÌÉó¥v/zãÅzeŒ≈¡ÂÍﬂiŸ#~Q_§"$[Ïb#ia›kd∞st‹`_–]|œiËÔ¯˚≥$H√¢•a®/ä·x}√Û√ãgÚ÷Aï›’%2hÒ3ª´-ôœ∆¯—’±&AJÉÃùuñ≈B´0 ≈/∂0…˜ëáÀ:Z≤„‘&T¥xßC£3î#Ô;“´‰≤[_<j≤Í†u‰ôñ˙zM>0t≤lGEMñC˙ôÉ'_‡.£¯_@IÎk±ûËvíœ)Íá ‰Ëd7N0PbÛK˚ £)Ôíõ°ôê∑ãÑ∑JsÚ}·.(|ÉÌ;KbY¥rêbªÉYœ%FzHpH≤∆f÷µˆø1Ú™ﬁ˘"“ÆËÂ4+uc∆B5‘˛ü)""c°ÒM_`<¡Q1Ä©ÏˆO âÅ\◊Tπ˙…¯ßI™† HßöÜº∑s˙⁄m´gËÓS6π‡®+Öm9üc>·'ƒF85vÇ40ñQ†@ÏSËaîz  4@›n¨™ﬂ≠™àÚ±åõzg¯R˘cE⁄∫*e˝˛ê∆û(òÕÁïZi(c˘FÑo\˙‹V<Ë¡ºΩYzˆΩ±gäAÿ1^À◊Z$›XâæàJ»≈)V)∞Ä÷‡%®„7 vÔ_V Âb|ÿMØ%Áe‚iõ-¥Âibcöë⁄n”÷™Eï´ıﬁ,ºv¢∫[Ä≤3>ˆá£O/∆±	0∏"ü „”©'∆{U–ﬂÔwfÚ»≈có…nˇp˚ˇà∏ãü_ª•L:¿ödÖ›¸êÍñ6–Â ãµ‘π,Ç˜H&JΩÄÃ»U˜¶Ä”öeÏ™v6ÍÇ*k—ÊõC1◊˛ Kú∫ˆ∆ J&¢Äw∞à˝O®—©*/T≠∆epyBÓæÎ˘®ß¿,"∑ié?¢l5;ÄÊﬁÃnlû'%EoQ∫ á$Rk»xŒôÊ°∫’õnFø7àƒuô»Ç…“à2\N W/—p‡æíà#%ùJ"ûTºâV+d‰£x8ôÉò"ÕDo3s¯Ú"ú9Qs˝ÀAmu¯‚YÕ9 0ìú B€Ã~oÙg°ƒZ(Ô∏ß„¸ƒ!E1f∏¢NÃÀ%Ÿ«ç?X;˝˘5Bﬂ3eKÌ·
J€9Ω(.A¸¬Ä´Ÿ|;ù<¯æUõêÊw∂&ÇŸöèè-
^¢Á0âòdÄı≥}¸≠b•òä6Qr îq»¿iu@∑‘˙~:m√ì¢e[¨-ˆ»>è.U”≤∆†5zN±éç†U6!a›¶mâ)1õÕäÍôòäÚvì(Ô'ìúÇ·b24[ÿÇ˚S0íwïwó%s≥t2Gééÿ9‡6ŒB2y]cË8•ci
æeY)$±w@B(ÄvÂªç∫µêµ∫œZ\˙´eo≠€_G≤≤”cµ`
ç‘gfy7g¿«
‘}üë∫M–Ã^jª-ˆ1ßº}R˘gÓA ≥Â"¿Ü-íµËJ≈çäC|öu-’u‘D“¬ÃHägf©õ…hœÂ<u^√1ánP€õ[l≠ÿJ˝9*°¬Æ\x8≈n‹å…¨9É<yû\*√„lSïÆ€áVâÅ‹qHπ-`¬≥≤$≤Ï4\G—Æ≈µ dmYÜ#∆3,GÍ[µı
≈ë¬®N‰J°Œ…»êPÍâyçdﬁπum¢îÏPúŸ¶zj´O´ÎÈB≠B-ıu)q£ëôˆ%®1V‘ÖŒ™
9 óXY˙rÓôËuÉıÒØ	éUcÚ¡Ω= _	k+[è≈ 1W\Öµ¶pÇt˛≤…≤iu≤ x˜	J>Å¨0Ônù'@ÿSõ!∞Ï99…>rzÄ“+ÒBIC(ÉQ∏dz–Upé—fQtèÅÂ$Y]®	«Qñﬂ˛9çÜîQ`6·πÑ÷ç2ŸŒqlM@”eÃZµÎó‹djÕx\˜4Òπ~„>aLxˆ©´‘ûÆ˛^=¿Ù`8¿o0Ÿ¿M…kK∑"naãFé0åª|&⁄nûŸz]+‚∑hÂπ¸-Gø¬ ”¬[/*íƒ{ÓƒáÏÜ.–5ƒ˜∂ÄQ›)w.$üäíù∑nΩSù¯TπíM›dÙh÷M√F3I€}À1æí`≥Zmvm}.Ùù;`„°ıÆ©Ã'©}åÁŒ!Ü◊FÑb_◊æı,Gfáœ&å
 √0JTTä†0é¬Pbjä•∞¥NVùÜæ*‰l)Ω/àqõ¿¢§`˝å`∑&ónŸ`ÆW€`Zˆ¿KÂ†Ìl3¬‡©ÂIJS9É	ı,ºi„®Åa¿UäâZn¡
Õ˙’<CÌ&:ÊP"L@ƒíµ«∞¨Â ∂Ï√.˚è◊Dà®6KUûß≤]£1º€¥˙Nè•9∏™= „	·ÏÒøÓ⁄Vow∂¶
Y9+ºÿ‚
ı-FÌÂ,.ó÷üb≠ñπ_™6¸¸oÅÄ˛”Ó†‘™8õÂ2ñh‡o∑8ÅûzISôÓò∂iùJˆ[ÁI∑“VK'äÍÍª)œà1LíÇ\$^eÄ•Ióöﬁ„CßäÓ¯´(WdUûı|ûÇ¡F‡´tˆy¥∞UØ€&pú…ÂÎŸ? —}‡wÖ“◊â$m»ò•¢L)î{ãMrwcŸ%M>÷‡,˚ﬁé£i©ﬁ^/Ø”òà\ƒ  ¡‚J&‰çÃã5‘2œÇ¡å\á≈∏(®≥”8=8≥/Åâ€ˇÚ˛_ˇÉ&h§Éaâı+⁄æó√˘Ø¿ã
Z3…Zm¶Èîˆ¨∆ìŒ∆eé»◊$˝ÒÅ}*ﬂA⁄7èUlï
DÆ„‡óú‹h◊àﬂ$⁄˜–K›HÊÒÀiáu–ÕõÙ_ä/w ÒZ¨º˘Íïíœ®˜∂§Êä≈ç™$>@¬"g¥Í(µ‡ˇ}™¬€{V“œ¶o:L^ãïNG≈Z{Pa±Œ"â_©N3y”\“œº¿.∫tÜÓAÚÛ<˛q‚õM≈
≥—“j˚v°[ÂÍ$T≥ƒLmÿmgS€ãCXBZK"¬†/7®‘ôDlèÁúLÁÄ
a é,ﬂ•∏1ØEÄ˘„¶∏ÚSœ·´u®≤.ÆŸY°˛™¯˘EÁì»’ 2èßì
¶‰ãÙUéúU⁄B“i»6 ∞*_‘îêJYΩCﬂˆX˜ù6w9]⁄Uu±XÓ™~£÷∂À3léärÑ-Z„íÆ√∂`n*ø3ô∏U»ËŸ≠Á"('∆öõ…!#∏LÇ˜ÏîîÍœ<QPT‘∑∞/˛I˝vo≤Ì{èı¡-ßWsNæÙ„hïF—9AµYüt‰ú´ä»9p"›Ñ,ıgÚ∫åˇ•È‡<ŒãKç{;6“„i©['∂˘©Qy6‡¸îi†Î‰“©>”¥ -îüÜ˜w5—ÙES‚ª´¥•îπ?Ê∆4ÍCk"2x®˜„’íò€J]Í’ó˙¶¨"TW98πÅõQπ‹P\Fº≠^õU*‹ë◊™‘∆z⁄÷¢`LÙk:Zn/ÛS©∞e]˜‹‹ÿÎUV»˘#˙}qv©[#∞Ú;G”Cj:o¿ıëÔâ∂èDâ°≠∫‘∞ÔúìR÷â∑`s≠¿â¥Œ˘`ŒÆÖrvØ±…π≈LRºù2m˙»\\çÊs÷åÖ¢≠5[s∏∑ÚÌHä?‚Ú÷EkÛ Bï)"™∆B‹ œVGpìΩYq‹≠z÷«{cQÛödoïüÙˇm≈9F
Â-™\jU∏∑_5‡:P[^èH˚†–ÄMÄ’UeêjŒ∆|m;);p„Ê4ã˙sxzÃîuOGÉÁÕ‹Y#ùîrw2Ø≈ãm‚úŒ∂t'°‰r”¸¡_/Uû$8$Ù»H‚ÛRs*Âoçá»Êä®ªÌ(l7»∆•D¸)ÏΩeây4#†JûÉ«È]‚¿¨Ï}ëKµâ\˙pu…ÕÒ°ÜMV m¨wú{"?s≠n⁄)86†n‰0Œí´%Fﬂ‘Ã∆{ùk˘[€Mﬁqø≤ﬁ;û‰d•/ÑÂÄ»… R±´Ï-¡ßÔµˆÃ⁄©P'†`ˇ;':,Æp±#â≥“@—Ìû˜]›B˚ÈÆúàÔ"^‰ç|Ω∑á_f˛€˙˚€^È8Á\˘ﬂ∏¬é˘ÒeMx∏zó–QW*jîÖ—Ó…~B|™`ØmÜsó?f≤„„ëè‰ ºñ ™Vπí≠07ûﬂ;÷-9˝•!]{Çw¿πéÎ™s&≠†~ø"å˚ä3á˙˙^ÆL5h∑¬>M|ƒæÜ“≠≥ONÉH¬ã¢Knü˜á° ÜO?(Vˆh5
Û=k!ò¥J¢ŒÿBy‘}ÏCu£á≥J(N®i·FQ∫qLﬂvn-µÄ∆'«Ë≥áh^â'ÖyÉ3˘˜•M¨XîÚeï´0íΩk‡ƒÔ˜˚Ïxˇ‰‰‡≈7«¯√£xÃsÃêUQÏañ¥M(≈ßTrÉÌÃfØ±JUÄ≈¿äxÆ#h€Aø¡ÙæÀ¶üÀõIrûºN'2∫"}∑Íÿ£{6êÂ•ß÷Sª°ÁË«°õ¢_ãÑç√&ˆÇÙùn,“@F Ö5Eê1˝”;7¡Åâ®z–¡rUszFàÛ_Òë1~n~{r¯úﬁÌO8∆hÒ∂ÄsX∏Åœd´,Kx∆–$3±ø≈C“6pEI9uÜÅy6\Ç!Øf[&ßQÃf	b\¥µú9Ã… ¬Ï8¨ÃÄı»Z5ÿ}õSÔê«sÜàÄ
Ì)„a4Éoùê9ÂjgG{ﬂı(csê√ y>ÏRî12“dåÆ/î∑]‰kgò¡ùÏ	ı8˜_º>=8Ÿ?<>›€ˇzÁıÛÙ‰§ì)]1¬ SÙ'√cO?S.≤0ù≈æû«—ÑÌæ:tã…∞ ôQˆ£∆úc§iß,©7‹Iˆæcﬂ§∑ø«(uék1ÃÕ‚jyJEE@ñÏTƒ0k»7à˜≈Kw@:2ìQ≠‰˜‰÷Jì≥‰ß('ßi02;<ÄﬁŒUÖÚî¶Å©5'|Ê+ùI‘hékf5¸÷8œp&Ê§≥—_ıO2U⁄/ëÌ" "
&%3K∞€2âÿY$â¶òËπ®.„oY±ãÒA2ùáã#¨C{ö«Œ√ähÑ˛H^‰ä$„Ÿ  v†9qUÏ0ΩÁ|<6Ó`”gz*^.ã®MCAN)v«2BH?Hs¨3ﬁüÒcÚ˝jÛ10)D≠k!‡ÿD¯£yd∂Eÿ/˛•"fâ.qí]√ –“7Aä—õ§>2òêNE6å;D·û2Ly=Xáì„†à!,àb
Ö>u1B¿]Á¡ÙjÜ∫˝Cq±¶ÇíN.»π‹!:14ÉÊSßπ(ÃéUã $Rt!L;à)ò± UMÄåú¨v∑<(S›¿?–ùêjJÕµ=E∑Ïw–∑^¥á“ÖÕ[]A0S2¶`èΩ±Ä‘àY»¢}oÄ$œa)	jaÊûÅ˘,√X#Öáæ¸ÓïÜ±„Ã@XÚµÉ˛6
∑eÙp?8~)sºÀ¿á7=ä/Ö’ÅÌÕjUGŒå0UöÚÖ»i	«å"e˝"  ¡§dGjv˚˚Û(¥≥j@1øa,€·Ÿv`+0¨NÙR¬à¢Æ°ŸêövNx
0R†√˚pÇéØ= Äy«∏«‰ï@ﬂÀtH!Û
Z= âMë∆BÒ´·d."ë+2*xí)Ü	EÜ˘å$ÇC]!Ëè&Q†qéÇX<´0æ”ìùØ*yäÉdP;{*.y´â5æ-‹|Sû¡.%≤ ≈*µ‰∫∞‘›√`»¯¡&)VúA©l¢ó‘b(  ß>áV‹atRß√’ûò√«g∑
´˘"C‰· f·EqP0≠Öà@Ô>]òüp∑˝.‹Ñ56É°8*?_úß∞1ÿ
Î˘/¡Y¿¨O?2w·tQ¡a8•
.√yQ¡i¯®ø€Ò/«î‡Û„–ˇ“A˙8lÄ’M='`˝Ÿô 6Xˇ|læ¿^Äüì5 B.I∂ÊÇÏÆ¨¡›∞êÿÊ)ÊgD5FêPtØLh4¸9‰K\NV~Ñä(<ºÔ†€Üp◊ËÑg=$ùBA≤‹Ì±À1Oyg9 ^Òã‰'¸µµˇKoµ8è≥˘∆Räè„`Ków~Ï±N?,T¶Çmã^p¸Pb&CÅB„îÜtJ·§ÖDA∞T7 {Z9ä´∆¶‰÷G≠¢R	c‚°bI6É¬ﬂıU\?dL◊ZhÎôäGåëpaw∆ mACŒP∑Ëƒ¨^™œÄΩzyÙÍ`áz(-¨ÏîÇµ≥d2&¨Öløà0Û≥–˚ÓZ+‘udqiI—Üaƒ0I€PA~S.2k≤åT Î%lÈπ+ÚÁS]“`äR ⁄Ø!<YõS∂M3[¢˘Vx ¶ÌÔ4ñ¶ l68bûFh’cî&AñsÔ‰îy’¨Qlá=⁄ƒçëQæ0Ïót	·Ü•2b$Ÿçü˘ÔõQóÏÚÅßºÓª§3Ïà—®∏qæp›t
:≠	¿^ÑPÄ` ˚(Ä\ı_ZÉ™®µÀT¡ñ–ﬁ!
Œ;<c;lÜG„FhŸÄ SXt òòòé †+'jmûæ◊áXt-¸^2ÏÑ¯œ¬=¶'–E$Øqà˝˝Äcë!ˆñπªT'ıh‹P˚J\˛L°rR‡#róÖ∆|Hâ∆TxÃ"‚ú≥#ä¿CÍ¯&J€Ã¶›≈ ©pîÜ˛õ£cq¥`ã`LÄ
–|”4`#óT4åöí …D#†¶†í*K®VoˇÄ≥ãí–bBÁ<9BaJ¬öiûìÊ√ÎK—6µÂàR∆Ra
Ç\`a‡ﬁ‘‘:Bæ@|≥3õÚÏ
’s¥™Œ`¸dÎFÕKn;ÂÄÄ≤úÓÜ≠ãÓP1ì©ÔÕåºÄ~Ÿäj¢ÏWı^TÍﬁºNdÀ≤/å¬V√ÃË‚{<é∆â@~8ê„5†	Ä*É;°T>)ñ#∏.ô+˛£rQiﬂzÏ·„)ß«œ≈®Î° Ùr≥mSQT…XxÔtJ∑\ßsº€£ﬂx◊Ö?ì∏DØÔÙ§òe˜Ç+lDç’5˛À¨†Ü·îó1qIö2P»ˆãDÍR°è¿TÅLFaØÆ I°[øøú¢á+˜u4·¬ £ æ!o≈
ı[æFÏ)≥äSf]vñÄl_[{‡ÔÏŸ‡ÕÍ[#¢'>¥)>∆ß" ¬6˚bU%kè|ÁvyáES8ÜSåÖ=åÄË¢È&Lø˝˝pbX˝Ôæ–›7⁄"–q>O!Øâ"Ç"πv¨I3ä§uÂ€ëK‡¡t2⁄$¿‰Ît¢–ß>cà¿éRº¡‚‡f≤dÇAìS˛-ÎåL`Äw¨BZ«M{Eä≥√d Hy‰å»∆;Ú-¸æ‘
˜\™/§◊-9úR¸≥ìÌ·Ã^=ß˝)‰náuíC64%◊I9:¥<c°  6yÍ†™¨Ek∆ﬁà!ø›P[Wºj/M∑ïß-q9c˙aæı¨\∑å(a†*ÛíãÈUâ˙Ÿ¡Å8c‘sgyÈ(2∂=n«∆2E‚/ênq‰jÇ‚SU}îº¥œ8H&ñ˛åYIÊÄµ\&læﬂ-G<+ÁÙT∆<‚ΩïN<*'€‘™|	E∞Gˇ»:«Ã†ë(¶ILZ‰ﬂ@¬üâ‡¸E:ñ7≥ËÍÔ∏»“yD_k“zä≤'Ôg‹(è?msí·lD¯uœ~i˛@jû–∑&5ÇSK?Ç	ê›≈‰Ü∆ß«ØxÃG—0
R=J„Q˝hw£\W¬ÔvÈcL'ƒ®‘cø”]¡˜ö>§n9∫25 —UmæºùÁœOèv˛Èpˇ≈…È·˛…∑/˜é›KÑi@ø•\;FÎ2<‘#˜~ ∞FêúS`s≥¬.º¿#R≈nz˚GzÎØÚ≥ ™{∑<Û‘$SÂO9à:÷uè|~˚ÔÙ¬©uñ`–V£¯W‚A…dÊÇ“ñ9$|v˚{|Xæı‡1ŸÈÔëhÚ|ú»dÖ˚æ7°Ñé¨‹sıÀÀÎ,⁄[∏îáqÏyQütQtànú_sô÷w◊z‰^·`˙¨	©™0’|z∆”ßlƒ9»åC‚˛ƒ3qùC´m$?ŸÜî˛Ï·åŒièE]•v≥öéÿﬂ≤á=´ÂU‘ì&›πÂ¯iy‰XeAöƒ^˘πµ´Âı¥·ÿz‰]Cç9—Œh%¬ªU°Ù„W—%√d˘
ÿ≤≥/O’•–¢x
é∑¨∞“ÿí`8¬~—$wNYﬂÅá˚˚W–x»$+Õú˛a‰Y0õâ›≤ü’ Y˚ ó$˙©Y]?lÆˇu0‰gIÚŒ¨Æû5◊ﬁGnV•ÕıéaiÃj¯ªEoz•çÂ≥Ft,Àõ‡ ûTA√/"ì˛ˆnrß∫’3Øﬁ4-ñy—’È;˛ﬁ0Iuä!…∂äû¢°>ïw»∞Y—†∫¢ÚYÒ‡4ñŸ
\ÛXı‹3$»¢!tG•B6E∂::\˘~˘ZıbÛéÁÆSÑ”ô(y:Eã;œäfÿágµ%A>¯ zQÏµg¢Ó)Êo94kå⁄}SqU´@˜Ï˝AÅ∫u“0Azíòy√ƒ«ﬂì æ⁄Ie…¸VoFìT‡i
:a¶^ï˚iS¥ŒΩ${XT‡-{ˆL*c7&py(SÁ≠ëÿ⁄@Ω"ß3Q§ãp∫jÉ©É˙ÂÆäáßóÚ)÷€}yx¥Û‚üNw_æ8ŸŸ=®wﬁÊ4)∞€ã‘c_É˙•∑EEÏGÚ©Ø=ıŒ€Qª-í|—o+H@ÏFà˙z⁄¿Á˛ÅHJ‚åE>ıGæ+¥BÄ≈ÍCyeÏlbOªÜ®‡ò|Äˆœ"8}•Ê˚’)k”ä¯
ñóòø.©∑ü8X9Ètú(Ï~ßg¶°»în/#J’Fπì† &Ó{[JvfÿjX˝UÊµÙä(V(ØqèGWNÀÄ.Èøf¡π‰]«öÌÂA¥”:´dÿçîá?É™´Ç»n0ød˜ãÈ¡Ó¢∂¢› ¨Ì∫ã´ç˙ ŸU”Ê∆`±r¶√Â#{1“>z/ÂÅ·/õ; ò∑»ºÕ#≥;J—<Í÷?ªÎz[)=¿_‹]ÓjÉ9‚æ.Èg:6òOº˛$NÖsïY4Ú‡Júå°P8UüãF£≠ª˘t‡£Ó‡òdú6z—’/pR‹`RÏæ QΩ%∞.·JÅT T⁄£ 1èﬁíZ÷Í:QuØø>@’; Ï2é˛Ò.†™}o¨ÜÓ~“⁄ÅÆ)FI q v•ßıDÎ‹JEµÏ£À∂Ra%ÿË≤ZõV*J¢ã.'Ùf•B(õË2§#+∑#eé¢)•˚≈Œá≈â p Á"I‘®
`Œ∞ˇz˚{åùÄó‹z‡¢¡‰ÌüØ»¶2%ıj∆–±D{M,ÃœaT1¶_öp»S‚?|++å\ŸÉMê≠!e°◊Dì¿ÉﬂëNÛµ˙e©¯•C|ÈndÆh:G•ﬂKüäc˜YüP‘û‡7:´⁄7{WƒÅÓ@Úk˜ÅyΩ¨	Ãõó*≈oﬂÀ^vS<ƒË∫%Ò≥FÎ+Í
Í˝‚wc≠£ À.ì44*™Gçu_ıß}J~›t’yé7aπºˆÃÒd´_√ ∫
ËzFÒ0IÖm
œ¢Ûòã	˙4´7¬ø8HË“T7U›Ipñ£√üU˜Zo=Î^8»'¥±C‚fÚ…màêÖ]£ŸZÈù’nÈÌvÁ˙¶∏˝°4©Ú‹Q¸AÁ»Eô(B/1–HOƒqû÷_“N∆48ø(~◊@ó¨U Ù„As=§_ÿœökk†~Q¸˛%°˙≥Z«[ITÎ%M3∫Å©ÒÆ*<:§FTYñ…k(òâwØíK•N.|ºä-ˇP)ç&Ú?g∆°›ê¡"¶ò%5Q%‚Ñ}•\}®®XegÏ"∫ OovlÍ'›D"':† ‹lÂÑÖ≈‘2÷4Â)YÊiÎPMß»	 Íé<4¨ñÂ:4˚ö-\ˆ¯ë®5h·ObçÂ.Ó$räªö|«ÿkct® =6Á˙A˜âjÉ@¶∞Oùeî¿Hõ`^1ÃJÔÿŒ3{Cqø<‡˚ZtÇÎüa°ü∂f∂∞≤ZÕ¶èn*˜¶§÷k§Ù”÷ ˝ jzËh´-∏Í`é¶±aE¡™Rˇ[ã Zô•4—B97Ÿßk±A≈8rÂ4WGo¿8”ôpÔQ¬ÉOπk»™»næü©≤˘}F¯˙*^æ‡œ]π4√|?HÛâ\ƒŒ5rT¸„ŸôÀ∆,.≤37o[l^ﬁô∑N%~ﬁœ‰WÎÓŸb °P
§Àô∏R∑ô4…à.#\√qÄÏê\
ND&0"6≈ﬂËa>Ï L°‡ãùóåÆ)"√ˆ˝◊˛Û_˛ßj=ª˝≥p'˚$∞€?Jí—IÊ®kFØ5Ä]l;&w·ÈüÛIÄÒì.x	GDz	–>∞gâ√ÉYöÉÖY¬È±Ñø‰"à‘áƒ.»∆ﬁX—âdÙ!3∫êådÜÚƒ˛±C˙XAwäò:oeØΩ◊∑›‘vπX)˘Ä≠éÇ`80¢ò¡Ï`V(+T@	‡≠;…wÉëh0rëÄgã)±÷ã$Á¬.!>Üa"÷
≈J…«ÇﬁUãƒ;! BˆNÎct[G	:V´záÄ2üÛ ¥ aVÓ] Î√S4‘ñeÒÒN{1&Ìø|JÊÉÑ≤wÊaî∞*M∑ƒ˙√ƒßÓ3ú˚9ﬁÍèÇ˘$˜U!vNpÕMÒŸF˚ïòﬁó´—<©aäÇË9Yß>2©|≤ÏD˙Ÿ1YCÑì(û[Ï°.\IDw’cv◊ı`L®yQ›x'µ_¶LnºF™cﬁt≠£™™ß_‚ıHmf∏+™	+∆;)©"$≈ñã»”®;î‚nπ†<)™†íiçÇçƒ”$ü“n¿⁄∂◊M,˚@–LZONÑ?å≥˘îΩ~}∞á6ƒÂEM~Ã∂˘∆v2ÉΩ‘^æË˙≠∆®3ì^Ãè xZ∏)Å⁄'¬’@4¢c±ŸG¬x7öÜâƒ©åûó»G¨	–óê~¢Ü»OtN÷Îxèééî%XÖÚhñ∞%ÑÕ˛√'_ œR…¢X}=Ë=@ÏcVAÎ8ùXz*¢Îe e¨a-T_à€#ÜÜDÆôÄÔı¬AÉñáÑ1TfÜò¨Åˆ3`‚SÖãÅ+≤◊s<∂lÂ≥⁄ˇ2Ëèﬁ^q”◊ﬂµ¯˛pÌÊÛïh kï;Ë@±¨6—‡ÜAzÎµ+eÍ%ÌdÑ¿ô|≈√˘Ñ6∑)ÂÁ¶@´WÃYú%$óÛl…Ï†√Ÿ$†ÂA°ìV@©MÅÅò..,NN˛•–ç—r1ÇûŸCFﬁ≥"0ŸîØdkNIÜIRçàd¢Ì@œ6!áv1œÇ1qra∂:ÅÇ¬?Vß+¿ë|mã—©}ÊÏ÷4ƒ—ã1óv2√5ñ ]Ï7 …Fb¡‹-˚ùtÙ+,ìÆM‡y≠±˜»‡»lÕ~Õ™ÓWå]•˚<4ª&£eØ¬Î¯©¿ﬁ¥QmP7çu
ô‘}µ»mÜ¯‹)nÏUyjî+·\¸ò¬ˆÜYyóSO\{XoˆSﬂñªFﬁwE±∏‡*/y≈j"Úpm˝—„'À=sa	‹∂•V†¸‹±$†ˆS}Ôc?}Í¨ûÏ•ıemAA
?s∞‰,x/m¨,Fîùfæ7qö7Û#ß)'o≈ëúç,â`v—Dq£™pYünT3vënZ+q¨®"≠®á+jyòold((ßœdπÒ*ŸPèI,'Ã@%BjloÌÌßó‹e`t˙Â¿J˜≤“]Óf±Å}fˇ5mâQ·≥»X‰)eƒ+ÃfÅé"≈twºÎΩ¨ÑDT’\≈VW2G}˜»¶ƒ&dX©P™‘åÎÏ‰Åy1„µ∆< X.' ¬Òx—≠ÿ‰:Ã≤ÒDî)vFDf\‘8«Ú©Uë∏@¨¸rF
¢-ˆF·®‚ÍÊ≠]'“0)*∂úÆ5®°«P} W•ò|Ù%îUàCõg∏ ªØ{»›,ÄU/
Au›ËÜ;ﬁ¬◊òp◊ƒ«–ÈîîGI}‰_x•óŸ“jô˚UÃ¥WÕ‹órÜ1Â7CLÒ'!oêFP!µ¶bÀ≥¢›
QyyÇπå£Jh*ªeˆ.†∑N—8F˙q„'Q¸0	™}⁄sΩúEj ‘]by6∞âkWÎke|0íQ±y!bÅú™b˚PêàdÄ*ºñ—t6éÜÿ Æñ@x<5Ù…\!2öáëÜ Wc¥/òK±HJÑ)	0:
ÑÃØ∞eâ,ÇFõ»°	Ú~YÎF∂⁄e©ù´w‚©ùÚñLµè°ˆ0”ã3“ã0—öm^ú€P£˚ºµπ@˙ïd≠MB7 8òÁˆ∏œtón¬ÎMÕW◊≠Æ..Xk”÷†X@ÕYó(úÀZcQä≤Ê
í6«mP≥rëÇ·˛ËÍ¯rÁöÖ∑Ò~Q–«¡◊i´MY¥Ç≤êe(
πlæ]¬ëáöKlê±M^˛â˜˜/0ˆºfD5V&fÔÕÁ◊tﬁº•XÑ81L¨€≈ˇˇ˜xø/@VW!†Ω˘ÔH"ÒÃÎÁ>∏º¡v c‚¶µòˇéLúbß{Ñ[°˘€ﬂΩ¿*DP†Gòü…Ú–¸:Óæ7÷e√]óüw%ˆQeAZá$àßí≈‚~êE1⁄tO‘b‡e/z¬«‰Øgb
%É)Àí9FQùÂeœq;Î}•ÔfΩoÈB∂|ˇ∫∏ÉJ¬¥@ö%ªÍSNYj0p˘=I0{ yÆ„Ω«É;o∫@r]ånˇhƒ
ºñ™$:ëÄ¿T]5)$jek2 eË¡w…ˆﬂYå„ XT˝dA<CûMp]<∆8ßp⁄ W„	ƒ∞îxØ=iâ/Ê˜˚z¢zÔñ>øF7¿Ä‚w¢ë7]OÉãnNû±}∫0óëıÿeƒÃèÚ`}]ÄL%Ôicï{Ω=òõ™¡¿ô˘∏ˆ<FH∞ÿ1t,s[≥“§æ6 &°`HìÖú@$,$%rXˆ‚F£C7@ËHgrÿ"∂&›j%L”x&v«+7êaH&¯^Üıò3ÖÚX∑
‚∫@Å…X@xYDÏ:∞¬4è(tjø˘,Zçn!ÕæbgULIsc™4ÂZÖT}G	4éN%ä°{òdq«®M:‚é%!ºòô%ëu◊g›´|µò°Ä%Ô≠Ù‹
Û~sGlÆ∞…¯ºTÂ1¯·ÀΩ◊œ˜1˝¡ãÉìÉó/J!† ·5sÚP πÀÃÃVòıbÔªIÈı!Ÿ∑•HEÜäEìë›-üW£Ò`íæ_.•˘∞$^ÌÖ±Œ+UÆ€"òc]WDµ“@“ÀÀô≠/j<=R,&1öpì!úÑ|P'È5.GÚƒ‡ÚÔînEXA9C{3lQ>ÄQ◊î±ï"ﬁULƒG.¶ÿ:x›òLz ∂/íÅìKâÌ(O¶&aùn¯kc]‡Â,BMŸπ√IÄÙf}© nß€˝Y±(C}îàH…$7¥=”YÍiëCYL$öÓ!C/¬"∑EÏàÅw<Å•NEΩ@ˆ®R5äÃ•8oéô„•ô˘˝Ü»,ríHP0≠∫•ÑGBtπÄD7 û∑ä£iƒÎëÄ˜ô&á“Çîd_)Æ)$)v8úõFhô|PB„ˆ
 ≥r;ô;ÿÈ2:Â¸Jy∆ëc$+ ìqEª?.í§–XÖÙˆˇûrJSe‰ÜRÆxr\; W√·Çµß	≈HZs·EË?∂‡!»£∏:i„˙VFæ`I°[¶X<í≈EË›?áÛâ˝pûÁUΩkå/p$v:JÒ∏õãÑ*ÿ
√éÓúñ´∞Ωög"gCL∆âp_ÑMÚå¡“Û€À kúÿ»Xı+‰RÃ˚ó·}KòYh'¶ÿÙ—D#„“±7Ø
|ôPIl˘$H˘(c7ë¶™ÒÈ†cBs‚ô–¶≥å£˜-∫}cQúÚ1π√p¯»Âxõ∂Cm8úSûåx®√n¯zNôÑKT˛çånô˘‘†Q3	X≈ÚcrWÃ"l4EE¬Qhû•)dVï{Ã∫≠)H¢"± ù)ê|OãL:/≤S«(¬±»T3™b∏¸WA™ÔÔ`≈%3"3Mûxes#yÕ—◊=ˆÍƒ˚‰€å”5!≤bˆ’ìÖjN‡Ìü¬(»Vv ﬂô˚p(”Ø§?Œ£·ÖÃeƒG ùØ3ùgØ∏]Nx”aäVÙÏˆˇ¿ó>L$€¶òA„ˆ˜πÃ≤wë¸$áËcõ¿äÄ∫+°OÉH˝˜ﬁóﬂZLƒwÇGÒè‡,çRaÅó[s-Ó∂ÜtÇÍÖYzƒ	ƒKì$¥îç_Qiûö,"Â∆aª‰XÑ»úÉb=qT*—!ç¨0e∆íF9âd$Ñó»¶@PGÇ;1ë£‘õ¶*˝üÁpÍ"sôUrZ£ãQñtæBµ¢ïªs‡aRäΩ)±+jbz,¯aNßµ–~)&Ü.5œ’Ñ\,ãò*?&ÿf]òYÔ≥P¸˛˚˛ -GSLlú…(ÈÔOI2Öø˝/≥p%“·˛„’’%ï~ÛX8„}+ÇºkŸ=èÚ	¥Ì˙};?[*
eÛ3Yng'¯>L2ïÅ∂Ã#µÂ•…÷ı¶Hfœ ∞„≠k$∆7hA3âÜÔ∂ÆÉ¸õÌcaHr2ìÕQi[i9VÙåúÂ9O£ê·ˇ˙Ä≥˛C69ﬂ(~>bÁ¡¨ˇ∞Xh‡¨å‘ÿlf÷_eÄ¶”—$πÏè£P˜GQŒŒ»WØ9ÜÌ^yl4Ñ@ÙF&•Ôu”ëiÒ%}.ç‚o¿“ ˝†‡E∑M.[∏¸Z™*∑ñ4¯Í´`¯n>[~Kﬁ~#E‡Ds0´3±»ˆS∆ﬁÒ˜[◊PÁ¶ÙFoÅˆ ©êNÇ3Í‰∆≠P¨÷ı0Ó∏o[∫ÏèÚëa¬G9õıüà_oÆŒÆﬁ≤`Ü˛ŸÊ√Ê3~Ñ '§‘ÔÄ_Ì_Fp∂Ùzü9œ(FuDL&KΩ“Ñ»—HYì`œÿ“Ÿyüí2§ÔÒdàÒdL°ˇ%∂¡ñËëËÊ—*#l@-’±xPZr;vójª42⁄g√VƒéYÖªFSõ+PõÄ@†Ωò"ÓØ3Ñw¶∞|≠`{…$4£r”ÖØ*¨¥TûmUŸ'û≤X|ºnñ¶ÖæöH`I&!+ñæ ñ0¿Ω √0-m;aNv[–≥ÕïÒ∫ ı(eçpào¢¢6Â.4ckÈ;…) ¶<XrI›LÊ–˙óÉGÉ5∂è¢¿%åV&¬!Æ¥Í‚`[ﬂôû◊Â6¸Oá˝Gè÷˙GØ^Ó-‹Ù¥}ÉE€ü"{Î˝⁄;Û¶e”ª/é˛kS{òÇ†™ΩÕÿ%¨yóüu;fVÜzuˇäA≥]õWÓ≥rü≥ê‡“6
« 
s‡â˘ESPäV	UÅ·Ì€q„l§‘÷`&4L!äb;C!∆∏oÏí#T *8ç`ªF"‚Pw ¬ÅëbG8Q*û¡Ê Ï.ß˘!À¶Ó·Æÿïïﬂ2Zÿ]ö˜oWJd±aÁ◊+õˆoE-©,ˆËÒ™K8% àqvhUÂŒt´ñ ?Ú—Ñ_xÒi÷'WnZ°Gu”4rŸ_˚(¯_öÃ1¶H [í¢5ı5ﬂÄú,
ÀÜB∆˘œhÙ^˝úaÁäå√Zd„4äﬂıWFâ:QÈmÄ9p1•âE”sñ•√≠¢‚&˘÷-7á%{Êƒç≈ü‰3ıI∑≈Kï»≤¯`¥⁄6„:¿cp 3ÃaµuΩˆ≈M	ò‘ä∂Í∑
≤e~¸kÒ û7y÷ö7g3"íëÚë±‹DF^Ò—√∞Ü–l4™á|ª@ÿ`Â∑÷˛}	Y\
F<.'&◊óù¨√{:˝Q513∆($ìÊí˘ï †Ÿghâs,ÑêÙzÜÆıBEﬂ∑Æ3ùÒ»LË‘¢	G(-˚@Ri œXÆ” 'Ù©@jLj`ª∆%j‹8‚˛µ¿¥`§ÛÃ8('ò‘”Yö6ØñKz˚ó∏∆±\_5ΩA«è^|#Ñ è§hF≥·)*/P.Æ√‰¨˘ò÷æó/õH·æ ﬂü>-îïƒê8åøXZ(òƒÈ ¶rªƒz&›'Kü∞æ˙´•É∏ﬁ?96ˇÇ® MËnD–\Ûø H+Òk!ÅØ≥Änã»≥ù£ΩØWÑ‰◊Ä¬Ÿ˝¡ˆo™;X`‹ü]iD]≈ìˇí˙ÉTÈz+÷ŸDd˛Îﬁ]ôï	»⁄‰\9MBa¥Çπ€ƒ≈‚∞O1(ä∏JK0S=õiµ›∆œ#ËKz%–§+
U–≤Rù‚Û>tn≠¨⁄§^◊ü%T´+Nb›‰$lπ°à◊ÜöÀí¥?K»ñé◊MOπ{˜±‰F{∞ñÇB[XeIé!Ö!°ñΩŒWQ8ŒıíòtRÉÅ“YveMh·]∆«lıÚ	Ã! ﬂ˜ßTÙÍ¡C†Îï£≠\ª1Åv∆ÛK´µ8?`∑á†YÀÀÜìÇœY+Û9∏¢è⁄q9õxY`™`≤§·€Ÿti˚è0q÷	Î ë‰Äç}JfxI‚¬’o~|FûÛÇãêW9K€;h1ƒ_o◊P≠FZ‡;:t
$4√P;	Æx∏¥-£Ò4Fï,ÊåÜh&Ü÷xd∫ÜÀÑ±í8%¸vF7Ê—dé˜“Ñ+5ôÃº%˙•–ñ“å¸e·-≠ .I.≠{¬≈pòñ7
$ˆ–æzƒ|ÛEhlÛx^áœÃMDˆà—JhÃΩXuÁÄ‘H˝ı1∞öÑ∫O ≠âô#¿óŸdby’√Y|˚'º#c\°JÃw¡Ö≠üêéJÿ∆°cIÕ∂CjÌ'V•öj≈eRl∂¥)g+Ï•%>iâ?∫é‹;Ì|Íá"6a
\ıÏˆèdÿKÎîÃøÒvﬁ&ë=
ÉÇÈN–øP$L∆ÄÁ<%„/ô9M¢22Œefê;≥Ï”∞ƒ≤Wk€6è∆IÃIFˇÍï∫gVÜ“Kjë.ôÌÃ27¶:‰¬ =Ë…ıyQßqÆÂï=ˆ
/C>¿‡È÷“˛’Ü6î‚ôrUH2wÄ∫æ5B^‰gıÂÂÉ<Hœy>†∂⁄VYëﬂq¨™zÛPuR“ªéT¯I{∆)s≈¸oÄã∏∏ÒFœÔ¡YÍV8V7éT¯-ﬂuòtJ:•§‚ûq7éõj.%VΩÛ¢*˚]œ¯v.xåÿ˛0@Áø¯ˆﬂz,˛_ˇ¡÷æ¯˚œ˘L$}æ˝„î~ÌîV[¶=j±‡*ØkiÜ Ñ†Mõ÷™ÿÄïMùö“cÑ®ÿ(© æÆÆQ÷®(mÃ§÷MÒ¬1 4≈kÖëﬂåz»i˙∫™ÿw{ê®˛##KC˝'ç.™d√x'U≠ º[ÀprkÈﬁ¨ã˚$ËÊà?Ñä≥iﬁh*À»ÈIqÚx¡~&¢√®Üu–5E∏@Ì}◊”Nz@æÛaóqEÎ…C9ı€IøÜ=ÂX"R?ÂÆbæÆ»∏ 2ñºˇ&©qÍÎ¿¿ﬂ˛πØÄÚÃÁKÏÜ9ˇ8´Óå6˝ß£
îj.hÆq¬jZò„‚Z¢|eÂÒ|d∏ ë¢Ôpˇ≈Î”Éì˝√ct*ﬁy˝¸d0ä‚P¶-VAhüúàá˛V≥cÈÛ≈t-qö¥/XMñıy≈ó™^ #CcŸw√%BòÁÁàDÎã%Ò$_"C1q®7 ﬂÑµJùä÷^Çú≠Ø¡8eÑl'„Ù4^Î`…L◊ØŸm˘)˜P≥ÚC—.¶Œ,—cΩÙÃÑ+LE›«ZBù€∑y*LF28Ø “d¬Ì8< t’ôQí`zÓh[Ã\wë'-:hq:ä.™8TQVTˆCø’
Rßå5<Üûè2ø¯€™æ¡§4î‰d3 ,\≥«∂õöYó&‘c´=FM∑k@Œ€i.”¢Mﬂ)5¬íV∑›p¸ZkÈS•ïbÜiø‡∫J6JI	,¡Ï™ˇàÕ$à]g“—`√xtÜ—˜\Ö¶!÷ùh‘M*Ö‡#°]lnUæà≤∞´Ÿ¬cŸB}ı¯ØI∑˘MÕæ„)™¿'R´˜IïQ‚∫a¥Ÿ¨›+)˜·Ω∂¿∆/˚èkòk†–ÏoŸ√õ6Z=ü.Qòp(Ì°èQƒNÄ∫?êåÖËEQ√ñ}äz6êW ÒZ1µûI˝À0cÎÕó∫7-lÑıI‘!nÜc>|wñ\µ0ÏÄCåÖQ|2AµÖ9Ö)y3nU±dˇ‚ßÅ:øΩóŒ®Ñˆ≥ìÉﬁ`Zpïì¢h|≥nÎK4º3ÜhÃÄeà{-ñ¥Y3^u|Ñ9Fìu›#:>&å-ì◊Åé°Ÿq0˙˜ÍóÀ/á¿¸$À›∂GaÖŒBm±&x5±π©ÿüö}.åÆ"†Ä(Ø{£Ò∫“◊¿m®F^∑ƒ‰™˘|Uwwÿ§9gS@"~ıπ™^π¸˜*_Ôú	wwn+≈kÍÙElCP∆|pÿÎ8I£ü»fë›ïøπtw÷Œ≈ﬂâP	ÖwOy˚ˆ¥vƒq#ÿ@ØàB e—c¯ˆO!=ñæÙ›Íî:8ΩÉD;/
à˚:Iß"ÿ¬∫úûÏ|ı°bÌØK$=2W/Y*ùï'ä|éÔÒ]e”#?¢àÍ˜_•‘R’ø`)’wpˇ*®z>'¸Ø≤™’ˆˇe’F9’1‡j6˙d≈Pü4YMµ˛*T÷ï-D∆ødâ—ÇØ–hóhê≠¬5¢£!O5Jéæwû{∑Rlì/}ÕË8ø‚;L«·‰Cp›5à◊™2IÂÃk›ÔÓuπÓÒ∫Åeè Â£ôà∫•√+.ÊxŸ“YÓz4èc>…≈é<qëJ˝4ÿKÀâé£fπ—g:}L	hx¯5≠3j!. 2¡ñfÄ·À^•Ü	ı¢¨2∆Ê¯ÈÄé$ìÁÿ∞HvT=z‰ØTbcãêN4=)^zÿLßöñµôàŸ‡ÔÒEsΩ‰ÂÄzçD¯õFg¥zsW=ï∫π‹—_çïèï±¶5˛õı5<Ú>)„1káGJ>œ ûå˚ÜåB–y^ÿtØ¨Ih—O}ùõÃ“ˇ[0S÷‰´ıN¨çÊ”„G~¿0…ÅÚàyÖ°‹Tòl∂£cD&Ä¯-Ü{K
ÀíyˆIBûëﬁ"fù™∏òÅXz˚{¶2@ŸFF™ùä°≈ÅJó»–Õ:ä(zÃR∏FÃŒPg¬ÌŸÒY®Ënû e‡YÿY◊†Cò`áOQ›-5T0ƒŸ|Ç1¥÷
^µâ“©	≥πƒéLıP∏$éÚ$EN´ëY˝¯ûßãø≤B.¿}=ÙEXî˝jÂIRc^F;kàv÷\¥ÛÊø¨ØùÉ-¢ù∆ò
:TïZº˜˜)Ÿ¿K¥Û®Œ∑	Q◊‚£˚ı@–Q?ˇ‰ÄÉ¨ΩWii¡RÒgîOÑ›–K@áñˆ–*m≠s»ÇáÄ›;m«≠£i¡iCÁYtıw¸}ç}Û(õ5[¶÷LÉ‚ı0Yáù‰=ï≠,ôc(Ò4~‰])5ÆÚ|◊BnIá≥˜ˇd’ç_p6IÜÔÄ>E"-≠[≥Xæ)∏Õ:‰m-˚…˚YΩö¶aW∞~igÍ⁄ÛÖ4y¯pa›Ï∫Ìy&NÍ(Œ≥çdûO¢ò€oÒ»a¨Îu6ıJèÑÇÛÀE\ŒFK?h8¡LnÆà
5œ~®kÄ¸.Õr·¯QŸÆπKÀÍ¿’4~"ã‹•y:µ	⁄ÍE°ÛΩ£œwã~Äπ†≥RSƒ8$Ç∏´ô˙Ë∫”zm∏¡£¥ÚûRÑ—9 GØ@@X0¢˚¯1¶ÒbÖm:˘£ÂòwJdªÚ4˘§$Eh`2+œf=1ı5MÿW<Ê£hQúeõ´p‘Í±∫QŒÆ7_Ò–ÁvÛb~ƒÔzåﬁ”p” ã&É¡¿*îi#î∏Û‡v…ÔCÊ4ΩòäÏFy√*aâ÷#hV°V‹ß-ÖæÖ¶¥¢NI]Q¶xqjdÍ‹™ ?õ+O%B7F]Î»„0wã+y+„¿›Õ€vQ°‡É•ÇˆbÅ!Q∂©∞V∞›‹M1= EÎn!4(%$Ñ˚+ ˆëJ∑¢Y˜ZQ°ù¨†∞~ú£eU2+y,À∂ògE˜ﬂ…
!ï-`òÛ©6"TÜioIUä	nâèö‘◊;œüüÌ¸”·˛ãì”√˝ìo_ÓìŒz⁄d⁄¢<|ˆc»{ãqÒÌ(xèÎr»ÛqfÉ(NÊ auÕM⁄Wµ‘ììöºÖyï´%œìÛÛ	∑f Á◊ic5µ®∂|…Ø%á]§OÊ∞èµ'_\g/¨M/6Æ§>_yX“†kj¢¨7Ë–Æ:W2Rânñ©"3≈ßaΩõCoÿáÖ◊—¶aˇ‘≤OCg’ÎÙºΩ∫uÛ,Z9ÄL∫ï≠;ª.z¬∏ªxÈÆB<!Iå´çï∫¯raö„É∞;)'m—õ +9úG‚ÊZ›ú∑πõ¯˜‚0uökÕŸµ™ıÈ∞t÷pk∏;]˛+{WÕﬁùÅÏ±oG5öª`Ç¨A»ˇµ1v'¡ïÇüt,ñd≠v”€?´öTzTÉi√ﬁÌÅîåYØXΩ±ŒﬂtA˛ü¢Áyê†$ôPé0T`|ô¯ˆ?ÄüNØGc¢å¿Fa“¨/˛8¸›∫<ÚëÕÓ=id˜ÜöÛˇöÛv÷	4"ewÄ^& ôw„†©‘é8çv `V≠niœU°v's’∆R´¥;*‹[€»…F©$˛U™∂¢Bk'ÑF≠U<_adœQ÷¬Ç.À˘lk	:lQö≠Î’cêjò—`ƒ˘Ï,iª‡∆∂≈¢H;øk¬h«ﬁß≥8BõàÛVÍ™p\œÇAëµ6˝K;‘Áì’&–ûú£F}çÕRï_ÃBA‚kJ∞@í˜£kü;£Œ≤d2«`˛8.î$íYˇ· ÎìHA≥OLÊØ"TÚ“ˆﬂ‹Gt∫˙˜U˚Yó$‡éÑßÊ«„	,îvLÅ÷~ˇ•™{ê+†l∞A™ÚˇÓ›˛ÒÇ{·N™ÿÄÁîB91¥<¿ —U˜õOÉ´˛%ú∑'x‡⁄É◊G#ƒá´÷ª⁄HÑÔJÇ?^à¸∂'æ-IØ$º!?”≥-˝ı˘Ïï€È|Ç˚ó@nõàÌ'@j0y#û∫Mâ≈œµ÷î4ïˇdt$j†5⁄-‹J:vg’H„C«¶ÆdTWïŒ◊wøP¬gùÂy›Àç\#¿bΩŒ‡@WÑc[¿ôÇ Wdñü6∆À6Ú˚≈0Ö«e´r1≥Pí∂El¶qS¯V´R∆ç‹[
®KÓkÊNö&óœ)†πˆ4\Ÿfﬂ%4††ÀˆÄM"øD.{ Œ	Ö¿„Y ◊FÖ˜Ú“˙í#õn–w~Øﬁ¬¯≤-˙‘5Õ°∫â\û‘·Yó∂wdÇu„4’Û¶m¨´i,S83Û©÷Z°F
Ω–p+‡dd⁄¯R4ÔDƒÇ+Ìï]ó¶ÊÅTDNÓdYµπMF÷Õ∑yÌÚîérΩS>:√DSTîÚ‡ ÏòÀ—ËüçìÀù	OÛŒ˜¢ä=["eîœÀ´˚‡˚⁄6k=∑[‡`Ñû/kSí,\W¥§hQGçã
®P¨ƒA¶¿Í§Fê‰X2ß˝Ö~j˘ô˝˜‹FUb˘SÜ.ö¥ˆ9Tπj∞k∏]∫+g¥êπÔ∫H¸√–?°•Õ/YåaVÍ	œK1Ñ5bó7^¶~_øˇ¿`◊⁄;Ñyúæ=ë¨ÌŒ?0Ü5è«ÅŸπ@
iŒ@é`Ì/‚Í∆¢ 4ÿAÔ`|WΩìQÔÖìÁ?i•≈Û"†—ÏFX!oWüœ,w2√â€∂ÅÒ<OÑ++Ÿ_5⁄“˙πä∑bˆ™øJÍ\‘+MÚˆuÂˆÜœe¡— Ë‘ 1Æ]	«DÉ$Zv	¶Q+2:Ê√≠°{éa.ö+aFn6ºu9Áîïui˚ÒÖ}úG≥∂¬Óxrá¢±ıÒÄ]¥∞lvÌ∞1µ–“ˆK [äüLÇfÍÌ}◊]∏π¥≥¥˝ù¸∆ˆØrLv¥pSpj¢Û≠ˆ‰7ù[`·∂9={¢R?£#∑Ë≤%»P	:∆k	Æ#9ø,t∑ˇ Ä‘q¬é≤0†çk⁄d≤ml!7™±4ÿk7dw±≠µk˝~ÿm.…8Ω0sqÜÜl˜’·ÄÌ$ò?ü¢’ˆ F»÷ŸyÃ∆—0√=sƒ!~ÅÓÉaîÚ\fÛ[Jx6®∆ıÉè{60†≤ Y∆qd$„˜–ô1N.
eûÂ‚‚ÿ®] —Ûp”„U=∫5⁄^ëÉö\ó5Ã˘=‹äh˚‰Iû(,ö;~∑≠}ﬁ≥9	ŸÔ∂¨ŸÛ~R;ïÑ£À˛Ôÿ˛πùñ9‹cGÑW\¥:ßÒ ¶à§Û∞’-Y+-€X∏◊ü˚o[
æA
µŒıã…/“,õﬁ˛9úOöáÂòöØ^lwWÿÃbÆÄòéçHa˝Á{ÖÌ¢Û0¸EvA|¡∞Ñ}J †vÓ¯∏iXY+‘∂bkÖ
äáá	¨7ó€ ò<ÎúsØ¸Æ@◊ ˜ÖΩÍL†7¥UÜhÈ∏¨
ø2êF◊L]˝¬í`Ω}Á∆l#-UòíËáòô‹é…ïvÎv˘ŒB`ÈtW}DÁu*è’‹F∂ç°≤ıq$Upp’oåCßµ≈]]>ÊAÿpÚ¥È$C3wºÔ+«`—0Òpi[#ì|¸À¡6L˝éßü P◊}*É˜ìç¿˙Õ√Åµêç-4úéÕ¸,	ﬂ◊ws}¯rÔıÛ}({‚‡‰‡Â·8—ô&a´xß¬Å÷däæ~§ˇD·[Ùªñë_n∞Q0…xI∏AˇƒÙè_˝é›4≈úTaC—˜∆“E|n†Õ_2bbLªÈ<,∆’2ûk1[$x™ûÃt/„ö˛<SÙ.,”–ÀÖ‚‚…¡ÙÿZ´∑ÏÅ|$¥k{eÖì^	à'“≤•Ô»«@=`˘®⁄s≤ÑçÉÜ˝™£r4@•ò*+\0EË‰
®Ü⁄È≈r≈1
¡óéÑ∫rä|“m’V-À@¨9¨-ÏS˝áW~*vA?o—SõÉ“}Hƒ-È1$z˚ZÏJsà÷∆FZ92·h∞tU¢Å˙-jﬂ¨V◊kc}ÌÖV‰≈Ü;ã#h.≠5AGçr’»ÿÒπÓºê‘cÀÓ>˛˚Ω¸ñô8N]ax,†∞14ö19aÜåıÃµ"øû“dµÀéÌr$ÔKj“)N∫ùO£uÙO˙‹!(}t–êDH¥“*÷&}
s
1˝ˆa«6È§∑o—–„ærb€k	‘M´≠f£SQØ≠œdŸ8…Qõ\Ú∞Ì2∑â& àchu
⁄X7q'‘N=Ç©Ún“‘3/P ◊Ì#ﬂ}}t]R≥∆Ë”–ı¨5«ﬁjTÙ|,-E\%∂kR§c•CiRÙ,¨Â9RÃj!\´…nÅ£· ÓÖCå˙Ÿ√;	%ï"∏!Ó€Ω#l
”49/]„÷≈ ºÜÛˆí‘Ò¬·¶ìÃÚFZπWÔå¶EÑì‡Ã©Üñ~nØj—e¢k≠ˇbön‡YXΩ2ÌXU-ä‡˙ŸA∞GﬁÙvr¢iD'Â™∂à’√8
w¡Õ¨äNﬂ∂È¥â?Ωo/u€N´–SôﬁÎÎFåW€4ƒ¥d ZõiÖŸ8
CªJ¡6ÏÍh¥X¸Ö|‹E$˙6Õ
xmÏÇñ[’ëdyù‡Æñå ?≤W¸u±rM±óËSm«åˆÀÎ“öyù]ˆ—Øe≠éº.≥9êÆ'…@]®\‘0)„j∫ïƒ^Œ≈ÿﬁC›”wµŸ6¶wbh> ¸¬$ò¢≈ñ
†*Õ©w@È√ü¡=æÜÉº#˜wÌ#NÀ≥$[Ó÷Ÿ=3çû?ˆ5·<ùM∏Õ9äGŒ8ÆÚóÑv¥èp1XfÔòÏL$∑å
(â˜™˛?ˆm·˝FÏ°œıõ&$œ¢p~\ìÂû0§Éﬂˆb-≥õ&:+€√¢&∏¶F[≈B≥ﬂ∞ù3ûÊA÷æE.∂∆hOn[aGiŒÛdÅ÷2Lf7ÑEs:ø]˚VíTò`XÌ…Ò⁄∑4TIÙåÜtbΩâÓ<B´ô")ﬂ√ë…˚Ã—®GMçºm/≥‡ßJn9
/]”^ó⁄.Å[Hå¡œ"¢~gsë?ÖQ´Xﬁ˚ìl≥ÄtS;òª9‘õõÅ6ÖMb¡º…œ|ÿÚ˚Ã
ø∂†$‰®:Mˆ¥ëômì6É≤RÀùî‚í¡‹“í~»⁄K,ÍÛÀ»K¯i°ômuœQ»-4Ω-“k∞”ˆﬁUÁÂ∫	Í*’‚˙ôÒGü∞◊¥’C'	¥rèCÕ1£~eÆÙIìúπÏë3‘ËdåYú–h2é1_c‡°˘Êÿ¸7ø‚√9ô|ö›FU.∫”&±•ÕÖGw÷ÊÓECö+Ç∆~nÖÆËÚW´–ïKËÂ||Á#ˆ#Èt›AèË˜”UÎ
Ùá1πÄ˛{“Ô~˙\ä;Ú®t?≤◊÷¥y∑+„û∂'É®∆\EÛä≈ÉÕ™Ωm4’q!ı∆Pm\‡fnŒ÷Éó¨¢«;˛Qòè∑Æ)^R£.∫MP’V
ª:µvÉ†éoáàgmˆ¢˙lÍ´§…∆û[k≤[-€ß¶ÓÆÙuÑ|ÚãÛ…ı°,⁄Rﬂ6·,™˚pÊÃ—8g3°L)¢ù3Ê^…@_–_†6vÉ£w¶ï0–‡pœõS∆¡m1åbÔ¥7&ﬁ‘˚Sï¯Úc¯˚ÑS˘Äëáì≤≈ùˆÆÚtWºË•Y$2MU·Î9π}°î \ÄYFük˛ƒóÜ?Û:˘3?iü	≥I@-GF©PB˜U$\l»öKÉ¯áh):¸E9–π€KÇK—”Î»êG¯úd´	èœÛqù'ˆ⁄N∞—µ’/&ˇ˝úOQÓ≈‹óË∏KÅBÇÛ$– ≈Á	;8Íâì1˙ÖI%◊7ë&%ò•…UD¡	1Åí’$∆,∏¿iOì\xåbpê6ÜQˆAí4”·¢úµ#€Ÿ’ä∞Mµ+TR"Ã(‰¡èÁ”@áLAë}{3v˚ì<ö¬d2¢oÅö21UZc\wK·Ï[¯≥ñ&ÀE‹‰ÃµÌnˆå%ΩX´ÄxèùÑnèîÙËˇ  ˇˇÏ]Õr‘FæÛE’Æ´ÿ]€ÿ;é≥NÄ*l\∏P©†›/
Zië¥6‡Ú#$ó< «ßs/ƒ#§{~¥#i$µ÷≤MQÃ…^˝ÕOœLO˜◊˝È‡Zt<ﬂM–˝ùìNyúv˙÷Ò∑≠†$F]\$˜SqÈ7Ú
ÍT˙·¡√éüû±ˇ˛≈øF¸ÿ÷˚<Ö≥Qƒ‰√"n¸w]Ç…q2¬±¡EW*	KSøü?¸ıáYëZ†√≤·r·è‘á∂·ÙÄN#Üzc≥≠3ID»m¡Ú˘√üˇ∞MßŒ#åΩ
˘—÷ÈÀWq<ç6zΩìììÓ8∆«=ò——ˆõ≠õ˘¿ˆü›≤^«g/ÈàwQd~ì≠øÅÓÂø¶«àb?¶3T¯¥àá!)›∑Yå1¡#D@í-®wïêj⁄,µ∆ê±Á¢zæ÷HnˆúZ:m·ÃwbI˚nÎÏ4ré∏†™à€˘aUAB;1Ü¨åz{{Ï¡Éç…§U#∏°,ACÆ‘öùcÃè
r˝ÉJımbÈ±*ﬁÖ…˘(•å‹?8îπ80ƒ9ƒNuDrÄîaˇ¬z¿`áºÇ>ÿ«Ô∫CÌ‰»t@tâ=†˜Ä]Óª“jïïã≠ÀÍÏÑ£¿Ö∆GëÃJPèq≤˙+Í∫¨çí„˙#7ö*â°$Jo)K⁄‚Vﬁûƒí¯√sƒ6âQT '*Ê:/âA)€â1⁄áaÏ˙ÛU¢˜J≤Tê€B£`í∑í‹®´ÜªíÿGπuÂÚC«ﬂËí1WIª»˛f≥I/ ÌàBªfñy‡[(_áT˝6R—ƒà˝—•Fl{Ωﬁ]O%ø»y+ri4r÷Eêã}[∑—†¨–wÌ:;ÈÊû3=p}}&_)„∞îäq¿¥…p\6≤&£Çê⁄yJ2"Â*KD]ËBñ≠∫ÚmïÓ]èxÄWG ∫Ú›à$ÜAƒSb(~X3e0π•⁄◊¢]&vµ£–&õ-ıFï∫¥“Ó´äÍ¨zK)~á∏Gâ˝ˆ”GcªÖqbò‘x˛ÈÔÄÌÌÙùí–Z‰3K¬y}¬à¿«âÜ∑<‹¢jåª,;«ŒP-èPtúc>ñ…ûªÏ vqu;lÚﬁxˆÈ„Ñ	 ı{÷*í†éÊãhÎƒ¿≥tv˜c§u”π•ùÅ„æ Ï<@ôæúd”≥°ÏÒ… î∞ùÿÒ\â¶≥÷Jë8rËrëîƒ@ªë;p=%*È4O`?”$Ät·‹—ÂˇzıE6ÇΩ`‰xè·¯‹éCëÍïÍi©Ãµ|Â˛óà{G
øÇ,˛3™gb.ë´o•”0Ôå‹!T¶ΩŒΩ¨23èäí0ì<7§âM¡t	¸b±ΩW8l¢G∞IH◊¨∑$·\*Ÿ@F	ìúÃ∫Íƒ>ok”˘ˆ6ª[ÏôV/íË°‹ã™»|◊ r’À\§ƒÒ"Ò"L=ﬁç¶û∑[¨%”n¯ÿ6ˇ≈ÚØK›ﬂA⁄-¯=ö¢„ˆÚ-∂∫‘çÉg(î} vâc]√⁄ídÍ—(ùX]Ëy3‘Û‡Ï‘æûΩ
GqQ<&¡uá¢„éZ%ü-º@Ä∆	È)›œÖ…~&Lˆ•˜’‡‹@‘Û˘≈Íw∏«'¥√â˚Æ ºP@mzøÀÓi)œ¬⁄r%Ü«„Ìé3O4ü‚/[œCv÷Y
UU•Uñ™\°QfU	'ÿÚ÷eﬁönaviùß,À.Ô/ƒHgÏ÷"1RoL8¡*ﬂôp{VBl™Å8Zn-õYXŸ(2Uﬁ8tFæ‘âÉŒ dGa0IÔπAÚÔùe*ôû}è∂ZGs˚’ÿ8CO´ªSΩH7)≥˘7W5…`“Ìz)˛9@ÈÕ"Ωfö9Ñ¸Iuy%¡DÎ‚\∞êkTKh’ƒ≥Íï?9£q*_gÖ-gÕ
jDKéqæìƒeÔäŒ M®~“IzG$ŒÖΩµ5ßí©d≥'EäxôQp,ô◊€∫¨ÿË†:À09\@O1&A¥êªáîÒâ2á) »bù8π'ã'≤ÁÀ"K–Aí·"ó;‘Ù^z≥¥22ŸRÜ*Ã´àGÆs	-{ï®÷‚•P$ã0ïˇ3<ﬂ«‚∆ Ø_dˇ™ˇÅq‡ø–>6ŒE¢èaÈPFá°≈ıgUAŒ™€ã$≠ê!⁄óÎÖ#gM"®ç!(X ÇgÑ’+è<≠‘¶‘˚ŒàâùèÿÉ93~SÔÊ>ã1√yìJ&∫6M£W’¡>‰1z6¢UmY´Ü,ˆˇ»≈∞∏*Û7’Ï})≤Cà ´Õ(Q˛‚Ÿ9©ö@˛˙,y¨© §?3¢o∞õZÛ,'UìÖ!ûŒô∫ñó]"ﬁTÉp≠JX+'TVÜï!Øzc7ˆ†Mö$Mê˙,[CrúN„ê@zé§ÚºpØï∫§¢¶≥"˚ÒŒô¯Ay¸D∆YÚrKíESï∂yÏ2˙ı
`"Çö≥Cõá´%ùÕûÜNÙjµé(÷àÀ?ü€ØÍÜ¬ï´(Z©v4É≈1∂)!6cé°{dÎ‘ÕzL¨VPuØROãHÓmwµ(°ËK¶$Xôˆë8)q¯{¬ß»,Ê≤»äµjiPhX;·5x<˜Y*˙&…ÂÑÃOäVJÒ°Ê«
õëÉ^‘_‡*ÊN‚åãêw|Ó»y≥H¿àòãŒ7G??&Ë’ïlã\Q*B)|]±è¥Ñ(˝¬˝9’ç4œ·œo7ÿûÕbáÆwÏ$Ñä>?y¶⁄V6≈˝˘df«*V…TÕ&X´π Ps¨õ≠[	Ì‰æq«Çµ+`ùú*˙»LeUBMŸÊ–≠+´∑◊÷Ô,e´]NRπüæâ\yíØÏ™i'Qü%0…F((Uß.»Aπ?∫ ıØäÑíµü±„’Áh¸FF˘çå≤12Jcä_•ÿÍÀ-kçpR⁄wx	Ä*Û¡*&ÀêÎà£m$ÜÊy.h™ó÷û≥_.”_^,◊d:dæ^uy–†ÖUkˆÌöÚv3ïq¿À◊æÓ0x98ªÍ˜F—W≈c0w˜6„û9Í,46uÜõ=!ÛŸñªÕyæŸªè√ ]¬Öb<ë¸	«⁄≥ÔØ]˚  ˇˇ 0™Ë