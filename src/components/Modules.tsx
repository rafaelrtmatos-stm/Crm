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
               <div className="flex-1xúÏΩ[s‹∆ñ.¯~~E™éœf±]UºÀ2MQAëíÕIdì¥ˆ>≠QH`d¡Fe ≈ãÀåò∑y<3èÛ0=˝∞cüà11qõˇ§…¨ï »L$ä§d{oÑ-V°ÄºÆ\πr]æE∆a‹ıó…¯∫øB≤Ò&¸]%ßÁ˝ÀQòK_-ìSo¯£ü&ì˛i4M˚WIìiÏ~ˇ*¬Á≈∑U¯zö§~êÚ?˝,ÚÚ†ˇıÚÚ“ 2ôÙW¯¸§øFŒ¢‡ä˛”&I.ÇÙ,J.˚£–˜Éòd#œáoaig˚?ë⁄µÂádyYˆ∆O;¥8hÌ8ÎÉ8á¸0ÕÚÏ∫‰ó99eùÉø´¢yß⁄vé˘ìwU[9÷üMºXn@\Â˝w_MÆﬁ„´Ï€◊¯Ì,âs7A2ùLÇtËe…S¯∆0ƒ!é}úµ·´ÂÂŒˆ~ƒÈŒÜ^ö¢ >œG7ã[KXßk{ƒ@é7√8
„Ä’ÒÓIŸ§$ÚÂä◊óóÀv∂_ÖYÓ? Øº¯ˆœPdú'Êl-¡|lˇ'Õ/r»”ßO…2yF∫ÜNh&¶B%Ì$ÛØ¥;¸3•µ«Z=˙◊Ç¸ƒW„‰bSéG…d3Ù‹;'Y¯st∂∫|#7
‚c¨‚“∆2Ò‚på_OaaÉYjW—ì˝LûF	P—›™õ‘âˆkÖhWñ+T´ßëà;€ª^öÜÒ(!Ø¬ã4ÿZö¥k∆”⁄©Í4bÏ]ı/˚ÔVó±±ùÌ„ 
ÜaTûddí&˛4á±G"J≈ﬁ©^%d‚•ŸÒI/%‹	¸–OÊ¶r∫Æˇ∞H6[R±`≤´ªÓ{–L2N∆˝lò&Qt
ÌÇ◊a<˚◊‚Î5tuÈ1–¥øb![∂⁄∆ﬁ§€≈u“#°µHûnìôÒ∏ÜIúÂtaOOÛ$˜"Úî~xi‡¡z•ü'i8»?H?œ?MΩ8Ûkí˙É‚«olHÉ|ö∆¶UGˆ«‡˙È∫•¨ë	Ó\ì´bÉ)÷:‹[%#ÛMÿ–J6øQla—9rúÖ9êEﬂã"r?M,ÉlûfÎ‘X¢S°Á^±ç‚«UJWó@WåÃ\*!∆ÌÀ∏´å Üê(„â€;R9å¸r1ÚÿN1Ãcü∑-ØE|_«Ô2ÎŒF¿G~Ï/;vÆôBk7WnÉ`€P´œV&fÆQ'm˘oÖÛ}]aø¿Ì·6â`j¿ÜÛ|îó\ô~uo£C”nú˚c„Ú⁄‚˝dâ÷ZF˛á∆%Ø‘•;U‡2K7∏iT˜´UkZ3ì9‰G“˝¢º1»ìó·U‡wWi0Å’t=≤–[Xº!„ˇ?∑\Xpg“n®ùÊ›
2ÿÚ‰≠%)ybÆ⁄3ê}ú%Õ3€ »}í˘∆AÍE~ˇÒr~¿Æ=ﬁ‚M“?˙B◊S˚<}ﬁπ1ä˙Á`oY+1G¸HY•Êˆ’-ó’≠√[{–|∂l¡ÄOßyûƒ-Ê6âw£p¯„”YóJR”âıÇ¨õˇc~›A§G˙+≠àEîÀ˛ÙkDˇÖa∏ÏØ„ü¸·ù/é·23{Ã¨∫/k˜n£H¬øÇQödåG≤;¥^≠*ßiñ§˝IbùΩÜç9ÇÔÖ∞uNC˜W€¨˘æ˚∂≈»¿ùlÊò@íÑ° NﬁŸÆ-mƒÚ0Ñ¸õßc±Y|Rﬁô¢Vƒ{R˛ÚaHŸy∑ ≠)¨B^Yêúf˚0k˚@ W›D˙BA@q 8≈SòäMzNu¶Ωíf√∏€)v‹C§I&∞≈g’yÓ1iö§ﬁ–K†l5{„SÿVPŒÄu*™1âö‡|;ˆ“k˙§{£9—∞zoˇ|˚/	Ò⁄7rÁØÉ,ÛŒÉc`-i¿ïJ++zÌïU[‰T™M[Â\|I∆üÄ65ÚÏ3ícòc§—Ω~ô∆yójO6I2	‚⁄˝9©’ù¥•k˜íµ›ÔT•mô‰©|–ne‹ˇQÖ≠ ›ÅZDg/%‚⁄Rq  K$C`’dí∑N:nu∫/åC8ì√^pük≠R‰ÁYez©«]a¸µ|Ïf˙	ÆıY¢jÅ/Z†¥ù‚BÌÑÓÚuB˚¨àqùói2FIl^ŒbYìbÈj8à¬`Êá¯∂&ñﬂ˛lg'©óçVÔsm©%ﬁ˜“rx‘·hÔÙ–L/V˝ÚKU»YtS÷lÖÒdö;Ù˜¬ã¶ÇK¢TÏ¶‘ÇU0Ú‚s(¢HßÏ AQ;î`‹ÁA>†u:≠é$~ôßôIu]dîwåí»“™‡dp†¿ﬁìnpµIÜI⁄#–‰Sf(ÌqÀ
x√(ƒC ‚`0pY °ÍÖ„q´s‘åG(&¢n,WT!Ïˆ*,rYgÇ¶„ô™b’ì∫∫Y·%g8îõ…4G3r?F+ª•TæÓ≤Â7.•∆ii^ãfK”ç©x≥ôØˆÇ· 5[˙Ú<Åı?&;S¯◊C>KûÉƒÒKı2*™±I^∫$‰ZózÆz4('‚™ra.ü	™ı3∫<8Ωn5™WJ∏D€¸/àñí{Â/l€ìiî5ò∂-¬äãF2ÒÜa~À°≥}∏˜ñÏ•sœ∑∏=;A6H˘ıZ…û1Æù˙©˙Gk'
“<{{ßH:è≤⁄=ÛJ‚bt˝£ËèdIú§»Ê@íHoˇ9}ÉA˛„˝?êß˝4@òFëå˛í.†A√¸∫xÆ^›ÿ^◊ÛìI°Õ!µK6_æ ñ+rOEId;Ui∞‰+NA@æK´ÀD9}≈œPU„© sç‘`öUãGÄ∂ô[œXj•¸≥¥ç¢7ŒŒî˚fÜlSâ:¨∑Œ∂ï3rK$_œŒÏ:“	ÏV„˜Õk⁄¬ÁA0È.~Éî~?Iº,ÔŒ»ò©L†#ˇÒﬂ˛rBÂX[(∏`d.í·Ì'…Ù"úíÑúÜìÄ¿M¯/√≥a"ºz˚œ$ü¬
:õ∆‘â%ˆìG∞≠—jO¬q ªt∑`R;PÀ∂ÿ#pXÜáoxCõ	[W4>Üñ$¨	ƒ;ORØEèÒ=3x&»`z·Ôt\Æı4"„ ˚ûva
ø√RÍnó÷5˙\„nGámWúπHp∂&Å-<RÒ`ÅÑ1πa/Q:ó@[«aÜÜfjç]8∂î˛ÇUåo<â:—∏DÂ^vI∑ŸÉàªa´…S‚]zaÆˆ'Ä›g˘a—≠ÆEN√+<#]Vú‹˝≈Üf W%óîª≈XÉ»˛oAÜ≤xÏ]Á∞•|7Û≤Gdâ˝∆<Œh`u¬Óë¬Éƒõx@Á@Ó∞ä«  √j†ﬁd®ƒ«·œP¨Z ®d}∫!1svN1˛ÉNc)≠z@ãÌZ‰üı‡`B73úê≥|öÍzøî·Ú	Ët·ßX(‹î)„¡«ö;e˛’ÃgJ
∂^n ”äMÌ¯<X¶¡BÕG´ ˝ö›˘™P•(≠-?,Ô±+GvÿÑø©éŸ1fFˆ`gNZŸ¬(ﬁŒ¶p~6≥f¡Ãñ™2øãÜÔní!! „Aô˙Ã
)<Ωv∂_z9,zR'ﬂ%?ñWCsjzœ0˜Ämv∂Q!yVVÅ5Ú‰à(8ŒShGwé|œèz APûé_BêSÓÖÁaûmí’:πj¡s¨≠…ÌO≥ö[ =<›æ3/⁄8!„‰4å≤Dˆ¬4Ä^„=˜Ûd≤I
«ÒC·á[=78»é˝M‘o–·Ö/Ùg™v(l»™G∏x±8A√K‚3+èã‘≥5ÍKx†F.§AÑº4®”%vˇ8“·à¸ÅÏ[ÌÅ·PÎzÈ›TiH_≥ª>jO‡5á–Qˇkf|_1û≈g]uı˛Úa7‡»ì\>Îcƒ√h
S€]zÒéÔ”9Êãv}"DàÖã’œµ˚Ÿ?N·Ø‚`ƒ›<mP¯Ò]d∑Ú≈PNt6Uî¢Ä¯öπ+¨¨îæNïqb)T3‚áJ±™πKﬁP§à ´bˇ(èÖUONÑlkC§¿ÕYEˇÎçFœáπ6ê≠√hö©6‹çπîÍöÇ¨°∂‚ÊŸúàÅóº[Â>#Ö[ô~BK6`ú=|øÿøb˚qRzÎ€|Òﬂ≠ÙêçØı»zèlºßn˘?!±€ÙKá0¯ünÏi4G&b4˙˚¸‘†jmeµ,\“>K√àˆ∏\Æ≤B§.ùu.Ù  n–”¡OuΩKUj7[≥õçFkÎàŸ5€0Y6üÙf€—bk’µ˘á í1Ô{¸yæıIØxßYM©Î˘Yﬁ_eª˝ºF@ËØ,≠í>ùU:≤◊ÙÜ4‘k8%úc¨ﬂπ≥F©ú€†2⁄<„‹‘,Mt!‡+]’≤2⁄˜(QÓÇDŸ5é∑ŒB3Í?·;ÓôMƒ
Çø+4‘áE∞• <pësE6‰¿z“˙∫[Ï90ƒl…Qê∫EïëÅ¶aQåeœø?ﬁ›9"ﬂìÁ˚á;Gf€óvÍÕ§käû0F4N,—≥	5≤¡Y¡f⁄ù yLh ÑJ•ƒà≠B*ã"F≈ﬁ≤Tqì§u≥E™ÔÉùN¥<4œ⁄h7œ?…¥CQw,7˘°ò∫{˙pg˜ÑÏ}_ÌüË‰‘;G©	:◊nµt}L€ÜŸo˚Á∑]^ö}Û•ç∂pi∫ÎÚí°o›~+õØÁ˚'	u‡Ô[˜´ë(zçªØ)–ç}jê6π„çp´™.Ù1—>¥&,¬≤EZw@π]:z5,¸™€— ¿*·Qîﬂit<N™òYˇ‰–·h•ˆ{ßÿ?KHπñø≠…ŒUÔË÷PvØ8mÆp.Xl;ŸXÍÏ0ÒwœÛ÷M¨ïø B*ñˆ 8 G« õÌ˛O‹Õ˛]ñ£!FΩúÏM©“T&´ãƒê––Yª€îyŸLHT•gIç˛ıï•Ï£Øa5ÍOu?@Y w!7<_*÷»á¶Îœô–éaóÆŒM°vê–1+∫"ΩcU^qµ—:ÅŸ˛xO†
ˆsﬂeT!≠
“:°r,ïgW◊ç≤SKö™7—≠*{·á˘k`%flÎT±gÇºÓG¡
ß≈ü$¢:ÀæYﬂ^FÖKâL£&ΩŒ„⁄πë»»&í¨˛nıIó‚LQu„*ü´B˘Sq®-Æı∫L^QÕßjÿ¥p∑^ÜQp<Ia◊ÕFAP80?û◊o”P‡Í˙›‹6ı{ô§£ .i76pFﬁŸ~{ÍN;;‰‡Ëˆ€y˝‚Õ…A+Ù÷†&Êe¡xëêAÍ[ë∞Ü¨k¡;ﬁ≠3/∫†f–êbœ†„|Â√ç ·í4ˆöÃ$<Çní1‘˚©x∆.Øm^ñ1M'Q†ÁÏßÇa∞ˇ'dE”T^¡nˇ∆XEx£±,∏'FQ)ÓW…&vﬁúÌ¸ùI‘.¨éãj‹3ÍFˆ¥é:eaUßÆFø°Äﬁ•Jë mˆJaˆ≠CÔe`z^T⁄∑Ó≈g+Õ°ÂÔ√äåÛÓ¬Y√1„Á†…çCS2ÁÓ”™∏Ωæü)8˜q>íø5yOP˜¶‰ﬁP‹;OΩk ﬁ≠ºæésvNØM˚ı˘ó˚ov^Ìˇ∞˙∑/ﬁÏÌ¸⁄ô˙~ ê—&ﬁ9˜â	»Y05a˛Ò¶ﬂóOëŸEæQ~É¢ãœ3FÛ'ﬁ)sÖ:…ìöø§AâgÓ±GÔ'≈°˙±ìºt‚^Ø∏µk®tZ·é-iriÏ@/SÍÀR[wÎ5]-síE£—iø~fﬂ“+(F´uzß£ëVıYLŒeä´∫B´$±6°![ﬂ—…∫ÆµE‚Ñiëk2ñq˚Ø8„‰[Tπ°!Êm˚^F˛@éÉÙ"º˝≥∆æ≤µ4Z’åQø'∆ÿÇÍõ\*?ÕNiF=Œ0√„N¯ü¢KKèd^Ñ‚ï\~í(hqÁ‘åxÁÿCxL”ØöéPØérÁÛîX/SOå«Ì¥ipˆtvAG%Ò}ºyú›p∑„3∏◊Å›iLÚßù¡Uî]ıﬂNù±u$´-;ÿÌè'Iöø-
◊“Å˘¥X
Üa∆äÇâa•È8îà4Ø>ã·	Ï∫ﬁ°¿Ô§‰0Ú‚0y⁄XñäîYß¡pö¶0ËœC|∞´ÂùNÄÉ¸Î%p34MÎùÎ’¬ÇÅHtΩ°çÌ/}'ÍVcÍ>€(¥‘%-_¯~%û/dÖ5y{Góî˙‰ ´Ô®·bãz21ÓYf‚éf/Æ*S≠ìÆ*3\ï§˚' ˙.≥h>ú¶Çåsøﬂ≈d;NÏ^rW¶∂’,Õƒ˘pﬂœXéênÀ‡'˚‹¶\¢ç°‘$?_xiË≈¿…≤`ò¿‹¶◊¶'ÁI§∂^ÙÁ¨Lú©¶ä6Ï$9?èÊıµE˙£î—ØeØtÙ+Œ⁄¿ ˜ÇH‡‰ùêE~ Ω‚&¢%ZäπY¸®oÏ÷“sã∏y∑	ï¶Iã$%›\ØüÔ8≥‘1›mVüO£_{Èè;Ÿ°˙Ì&ı5õ8rËù'§´ùÊõ≈œ<˙ÚÒ]4˛ú£ø%ô"’4/Ò@ï˛zÜ˚7¿ΩP{Ñ£çvÇvÉ˝Ça˝c†˜,Û~=£ÆytQ‹YW≠
üñ¥˜`†ÚÄ≤‰ñc~5å¶aJ
NOπ¸}¸ñF@®âL-ÇYvNY†»ﬂyölí∑ •ä£„/‚‰Ë'd/Ù‡˚~√7vΩ s
i)ÂØwÀÉÂ’˜Z!lCQ9≤£ñ8rqÔR†p÷„•f›wuŸàÑ>IŒ±'=yßAﬂ°%ˆ-øÁ‰xìàÉ˜M›·ö√)¸–ìÀíGß(L÷»ô€CF©–⁄ˇÀ Øó˘û¿”Jwa¶‰„◊J}ﬂà˙2ÜıØ¬ãaﬁΩgÆÇ'AÛ—Ä∫Rá¿Ê≥@‰|‘ﬂÜ¡Ââw⁄≈Ñ£æ–^Ö–Oa¢8Pp„aAP2¸s-Åp ¥âÊÙ%ÍëèR6S£≈	UË=˙G HP—G£—õ_®–—ZßL/Ω˝Õ±„ÀÂÀP«"5”¢ÂM–h #˚iV@>†ƒßq≈5út™˛F&fˆ‹K)3Ø'¿∫7…aê˝4¶ã‡ ÿMÃ√DˇÄúnä!~„ŒÈ¬;ŒΩ|öQ'e
3 Ëtåû Ò»ëÂZ"ù#‰<¸pu∞QÁ{–Áo”È$!+RGÎNŒ¶@Ö±q\E¯˜â-ˆŒ)¬˘ h±”pÏ5!pÒhæhéçA•Ê,`%œ—Ü=0˛ƒ.´⁄˜_2Økäa åP˛ß,~˛.¨Ï≤0›UtíBÉ∆GL“˛Wåc…1““ñ⁄≈ÀZk±í8àù[UFà2´∫jdÉ£º4æ&£°äô°vì¬√‚6SÉ0©—«¬¬‹4Q( ^Ö„	à‡gîπH0hzQT∑¨hå8Œ≤uU’U%%ËÍ2HıjÚ25k£Lbh3ÇMÎJ†∫˙∏Ça#Ã\o∞Å|/Ω˝k‚c£4K®ç±ïöπ†	%…∆˝L<â)ˆ∏O7÷*«⁄ÉßÊ“Œ≥ ≠Ô‘◊™\À¨∂ÔÏi[£ûΩ£2”ayldé≥¨rÃê◊Çø¿ˆE†CAΩô∫AkòfØ öèŒ∂óﬂ˛≈dØΩ∑9<—˙”5Ã‡I“b˛v†øßúu+K „Ìï5F”œ…»ãESaÂ|*Ë]'˛=·\¶ëmOîdOé0N•∫£°Ù{e›´õvq|nˆçû8n$#„˘Ù8Islj*à∑∏¡\,g{’˝˛›‰7,Àz÷PŒk/Ã¢¸@ßÉ(aö–¢ÈOò%≠ﬁ≈/ü€bˆ∏9≈D1%N…Ü⁄⁄I”‰çgÑS˜ø)g	Ñ£œ|?1<·~ˆlRimPdÑûbmº∏#ú÷ÔaVW_—€LßÉ∏8DG“Ω˜≤B=Ù ªû˝m˙:µìT^ú§cE'ˆF‹‡
,Üca/ÑÌJeº‚ﬂy[‡õæ ˛paé?µ;∫S”ÖA≈ÑóUÕD˝8Òm‘òy±ﬁ÷å_®&Eªë!ÄM~ÎÎ+¢≤<—MÃH#µ{t•\¥Tï™-çëIánLìö|ÎBQôÉ⁄léu∫@4≠S›ÉÔgkõBigèCÜy˝%yâ+ãB@.Ö]
ƒGóOFB†áI ˇ ´_‘lz≥Æ…õ·R&√*>òP®¢MæB _ÿquﬂØ(}Q”KûÔJÍÒx!ÕY?=&;Ïû~Å´˙Ì∏èùÜæF√MéƒO÷Ç~öÜ=,Ωˇè¸Nc˝¡˘4®‘KoY_zÒ0à‘wã{∫Wﬂ◊}∫9$ÛrØL˜}ü{R&·ï‘¥C¯fÌè∆#*%îÔÏâ[ëÊ^Ú¡á9 ’¡HsÜ¸NˆnˇBt)gòb‚CAªÈÌ_¸∆í(”<“ *vò~ˇˆø”¨eú&Q†¥‚9ªaÔ∂›KC•ıxè¢ºöà¬@)Æ˜îMˇ^öLÄ«0„['X,¸ñqJÿÓœŒ7µÒ™ÌFÛ@aÕ—˝ò®Ùx¢°@›k¬Ä	å.»∑N∂uœ‰‘œfìti¡ÃΩ/	}›£√(“M©j|ìAKÅU ß€bÏëxäî⁄ÑZÀ7A¸Çyıb}GÚ}˛T˜¢xí¸B∫›IÒï6K|nhcú{pRNèÇ3l©7ÃÒ‡ÙÆ≠ÔN^ø⁄/^D.zmìOÛÿ¯*3€ﬁÜ¶Û÷<I(P¥B6¶ﬂP%~˘Ì2ÙÛë¯Jn`êPÈi’C,«∞Mëñ±Ω1F!±ïƒ‰ÇWHº∞Ä`µçñ.ZÀZôNYÃ%K˚Î¶°¨É(Ûå>œó’‡6ınÇ-WJyY7AÁ‚3&U
€$øò’ÍøQ‹	>Ë∞ì]\7Ê1·-f´k@w»≥gp≥“™Ê∂ıe \p:∫›l:ÓëÑ…‹”1à>›≤Üw¯Ï{Z√b˛7∑ûÒ\õ–x[ü=¬ÿzG≠~cKI¯õ£—'äAR_ú˘s÷Å€0•?0†‹‘ÃÈøÀIãÜÅùÙ8Ò”Ô¯±'Ëüﬁ°ü∂\[∞^†Êï1÷ù§=L=¬⁄rnt7≠yÊçÊ¬R¶ÓlÜKÓwcîıÇóã“ÿ4ò#›ä”]I(Êá˘!é/'ví€$_Ã$∂qcÆƒÀ˜œ¢âBòÂ™[Å tv+Ö9ùxojú`€¿≈’x~‘®Éõ¸¨≤d™⁄…Uﬂd.Ÿx∆∑`üP∆¢z2hÄJös∞l+¥÷˛V≥o¿hP¬(≠4¯≤‘‚/Köfj4¶ƒ4N‚§#™¶;As’ª£‡"Mb‘©i”ã—Ù¢2QN∑%OËïw“$ß∏:Oñ·ºÓ»«YùÕÉ‹B?¶TpàqëÃÃBwÔ·Çîé,ÀØë£ÿCê°qtå‡åpÜ‡EvO∂?^±-¬˙<C∂Ÿ‰Èaº˜ªÄ&Ï≈¿Œ[{I„ıß∏ΩˆÚ—`Ï]u≈˚t_Íë’Uÿ∞-eÿbí+Ñ\eF3’jåF>π¸û±PhbÑ1»i0~ﬂï8@õK√b¢; dÓBñ;ÄòuÇ":í9±ò\†"ÄVÔÍ∑6>ÌØ4ÇœöeÀZ‘b%@*z∆«À5G¥<Ø;`“2^M.lU>Õxc≈9ô∞çSÛdü´•˝Uhzm+Ìù ~)Ê2‹&Ñ∞ôˆ`ßcó ÓÊ‹èUÒrÑZW©'cLK1æÍØ5ƒ™œ‰≥
ZŒ\≥≥Ñô ÄÆûëdsÜ';NÉU|ñzÍòïZ5Œ,VçÚ™ÿ7∞ÒLfÕn.†uÊœœèú2:Ks˙ô8^ç–ˆW€ß4Êúxf¢GÙ_…p≈wÔFõr):UßŒL?â1Å≠˚6*ÿ’ÃŸ5ì⁄&ä≈@¶\ ^æ©9I∏Í∂qÂÂ0JÄXçèÌÀúìÓqkkΩåù˜;áÖÈ4Ëí“Í¨PZ›◊∏%F∂n=∆ƒ≠Dÿ8ÕÉÏ'√)™Çßâ›ŒàkN§£—⁄j,ñ˝“í<”ôI∫¶Õ]e™&X„ŸãH`+ùú&^Í£øÇÈ—¬\R∑µö^)M%‚SÕk|WòP∏Ü´˙ûÈ5nN°‹+ˆ©kTa`|AòW‡Ø<Alä¬ÿ¬>∫Ω¶U§Ê¡w”;¬é"=˝úﬁ2ΩPòN§7^≥{¶W®≈Dz¸0±3à`ŒmáL+{æÖP¯4≠ jï›Ö%–H˛™5€ùÙ{∑#Ÿ+Ô∏êº[%Ç‹'Ú”ÆØT—Ü‰ù_Tâ^i§Ÿ+œ;æÚéÈ+/∏ˇ°”+zÚ◊FªV∑úõ≈*Bå)>åÆ√åyßU}mLû6KK#K:µ∏ÃŒ&œ\Å/	Ûsa.>aLì;LΩàtc/!ö@Ç0Ω@ò&5ù‘ÒÉGŸJåeMÇ»#æó{K#Ã»âIdiP˝M,ÏA•¥ài‚´Åü:õòÙ™Ë%Ì°©7¶µ≤#afÜ«≤D(ü˙ÖπvUTÑ–úQ‡◊ÜûÃ|⁄‚≥L~_SAˆ∆<áïD`—8h∞∞ä‹M÷·4'A˝ø	‚—t¨H3¸_Ã®nƒ∞◊T®¢mAs∑≤í"2^Írxû–îÊI˝iˆHÃlLÇ+†,åhƒ|¢î:Ro<06§ïË◊J´‚øóô 3:”)j~∫–Ÿ	˝++n)S˛åÉ|î¯¬k‡≈ü(˛Ïá√ùˇäh’^Ì<ÒÍ¯î7`bà¬¬¬{¸Sﬁ4âËçz°cU}¸bÜ5e(‡¶ˇ≈˙e3TÍ jæF'ªpBìÓ˚›≤\kÚk‚Ë?.+~÷HMq"{QÍC\çàJkÀr∂ùÃyÍÕ!Ï∫;–Áöc¢ñ∫gÈ◊ãBu±ó†upå‹ï*ç'MÖÛUí*	9÷óÌvLZZc2âZÔíŒÜ≈±ÍE.õŒ6]#C≤˚Ê^3’†bcúΩı+EÍ3¡ËíqªCÓùN#/Ì«”q=…º≥Äz
ÁtÅbZè,¯˛“Î◊K◊pëÔæ€èÏπnÂk&Û8‘cµN#,´O◊Ä:øí¸†∑Â‚Eõöt$.4‘˛⁄Vób±B˝Rø0ˇNÄHÇ◊6QqS:‚∆>ò¸Ä⁄$§Æã«Uu€–1ÿu≤£å!Ú¨xÇﬁ‹KfSÅVS °Ä©<ÿ(Y∂ê>≠TYÄ¥ﬁÉPywëÚì:…ìN“‰N∆—8I "«ä%8ù‚%Sötû*jb¶IåúõV·d‘Ô˜…ÎÉΩö¡oø⁄O>EèQ“ë[ .ºƒ‡)ÈÇ‡%¸üúN/·q°πõD§ÆŸ;(Ä*ãèw^Ω¯Ä-˝∞{Í√_Ï˚›…ÒáΩ/wæuR<µbÒ…õQ9Ä∫Å^ﬁ˙œÚ˘®s„”‹bm<
ê:ø£XVÿªvıÆ…˙Ê≤œ•ª˜¢)´ÏÀ—ã„˝⁄y_éˆ^0nÂÍ‡¨ÀãÂ—TdÀÚ
_Ò}≤bLsbéì¯u2ÕÙO*´VÃÎÓ1¢DÛıà9[vü$”·à>~◊≤tp”∞L˙µÅf"dfëKπË
˜SZK∂ƒø`≤*&∫%∑a‚iÍeà˜Å‡ÂæÍ•òW”Kœßàá„·îOc-D´%@K•Çì¨(âŒx?™Öö'.©Ÿ®bÊ5GÄôé†dì˙£73ñV;ääOŒ%B”ôSçÇ í¬(°ºQ˚$M&IJ]∂#‡ßl^.@ Îztæ`™ËÓ¶Aò{f√◊˝¿tO£dX Æ86ß0ÍÒ$Ö…O·$6¡π~ey˘ø‡§KÛüëg6A	¯˙0Ã<Dôâ0‹vx"1¸C«Ç%VÒıpw@v?<OñˆPõêÅ>6ñ/ΩèY^≥‰‘Sﬂ’Ñ÷ÑöàêaGìÓ(´GˆY^Ú÷É#›‚@õπµò;Í√'òÚwÅÁ3wdóúî%êßmîä+N
ä“ÏæË≈ØΩÿ;Ñ‰†»ôµ]ˆ,5±£s∂8r	/EæªubP8<l„¿n)[cpO;¯÷iN€WLs„`Õl2ó»^ê”ê¯ÎBﬂ∏sKH-ÁEµeCJªÿ¥›€≈è˙Ê∞«>A{PŸã≠¡≈§o
>qÔQ¨ÛµF9àwÿ™¯Aﬂ,˙Ã›€emGFgÿê¬™•o{ûZC˜Ôzc.êa[(cö.€‘¶Œ"Ÿ%b/»ΩﬂﬁÅÂÒoAf)Õîı/KöÍFë/6kEy"><¿œ‹jÉjœecÿã8Ú"è/ÁI˚]ühMj)Öi|ZÇÿÂP%-âM'Â'Lõπ`/”G$Y8Ùí2ﬁ˙©ÓÓûGO±tlÃQ=¥Ãh:L±ê>”gÉ0€ÒÅL0Ä ãÜ∏•Ω¬ﬂïÚ∏P“‘˘£‰-n<ÿ)Å?8gpwáj≤}üvùÖ>Ú/'ç3”+Ûíú∂E%°ãÏg˜„ﬁ®jmπ˚ü{¬[ÌviwS‚I7|”=∂Nì´°ü0—Ey}<˘X,ﬁ»xMÙ$¿–¯,sDÇFKO◊∂Ïë≤q”§qÆÄËŸµ´ãµ#Ø2 ]‚∂m§9Æk_KyëLƒ$ÿ«WØ=¥©i˘ÓR*kŸ ÍZjW·àz(·>áır¡¬¢ö∂ﬁIÁ…H;9Eù»îA÷L4v≈-˝ËaÄ™–~ÚT?ïéâ≥j˝7€ù˙ΩéKW¨§6ŒœGF#më/Iêá fÁÃÄù¿Óí|W$]:HoˇÃX£ÖBiÉÅ÷Ã™ÙF*,‰DáI¶5‡ÙñﬂÑj¡í˜BÈ@”º∑"Ωìn∂i’ÔÍ≠Ëìï˜ÉÌzz«íf∫Œ¢Â#È~˘ÖÊWxıfÒ#"Fi¡°î·∏+Qän)m}ßYptç◊ô6wDé3‰Y•YÔv>äPr€-Z”≠¥Ó{Ú$…4ÔJ8AıW)¬gè¨///7LŸ≈52oÉ¥HÒK.¬%vú|È$ƒ¶S©≈W…›[DÚ[kÀıÑπ‹Ù⁄¬§ ÆfRÉ⁄HçN.≤.ÙXÊeˇîY‘Z£»É≤=›jiR~˘.Dô|˛3ìe%{R≈ﬁXOuÚpîYn}Oõn8◊I‹è–◊F2èX›7◊ñ•(±u2π©≥˝ü≈!dê¡"
∫˝'Ì≈=∑1§j…O4ÄB{sO√W4Ÿ?ÄÌe4ÓŸﬂ…Öó@∑—£‘3èÉlúpW^t´#–2$]s∆qºÇm>L⁄∏î∞±å©—zàvLtÈÚñóâi∏ãj©9œ¨	∂Oj9â:˚äY˜’0ßt`:ÀëÉôN≠™√Ä«)‡àπÜ
ú4=òß|’ÖôÈÍ˚	∫çÀ≈ãckè8 W™‡[´U1…f]ÈÅ∏±ë%ê“—N>ı4)Ò‘K	},2`ƒ7bØ—`"4eb Jô¥¯euY›n&Í˘”˛J≥ÇßÂ‡‘πÊì∆è÷N7ÜËüÏ|+Ïß® }3n¶|m1ß}¶ˆAç'¡äÚGVÁ õaµq»–‹Ñï”‘N
£“ú%∂NÓŒóû'πó®xä¿§~öz>:?0CıÑı“41ùóüd=~Ç«bøâ3â'ÚÜôÔ“–#Q@ìÀ":•µèì,G;´§Wd)GÄcù%°C˘§\6…axµIéæXY^Ó¡y=åÀÔã$ ﬁ|1ƒ œºà⁄t£Û§)à3ÏzCèt^‚;P˘Sá„S`¨–±c4ıcS?ü:4≥6îﬂ¡°éIôˆiPÎ%î≈ååÑésà-HÊe’N∫4
ÿIœI™Ø…ÙËRR®ßôr6»Û"0Ö+éI¡·Ø‹Õvˆç0ø6äÊEv]°FéòS⁄Jã¬"zöêÊSÅ√¥yØhÎŸ—2]I£À.¢	õ©j+oJµ¥,¨¨¸^]úoé-F´ÒIÅaƒy ¶!›[[Æ®˚ √G˘–™6/Rıb™äWoQ°|WT)Ó≠ÈRk∫U€¿zbΩW+[dxhàaŸÙ4\2mw©ëiõBY–µTP6|ZD~/+4$‘Õ>tù8Ó°tdË:·ëÿıq˙j∞°˙˘ √CD¢ÁØ%ôû≠-\fNÒ˚E›∏3‡7·õ˙°Ö∫´¿G”¸tpËÈÅÁÁ¿¶]]ô\ãëÿîA§‰¶åbô amπŸ°ØbÁõq≥‚ßØ&!»≈I™YûQbfWÿ›È˛õÛ7	%)˜ìÜé¿q`åˇƒBËQD.è˘¡πÇ$‹>Ö∞Î£÷(_±3cóöQ©í4åß?ˇ11K˚3ØQõçÖAˇ°m`Hè•Ö‹NíNF/6Úèû>•ÊÊá—q\ “ø°Çœ.öÙ≤=Ôt YÓ)ì´xÒÌü13-êSj†¬\µqÇﬁ`céç>c=r¢&»≈ «{·8ãmîóP”ïm´s%ü±›°OÉùß˚mÒJä*Xz"ÃàÏ.K	ÔŒ
KÍq¿ˆ⁄;)q”+⁄]8∫î∆≥ÚñdA[ƒΩ‰Ãˇ{¡—zÙât¢Ë*A‡ÙÂî<Ê%ÉúŒ-”8
N’¡‘{Ïdø¯`Xaì0û†„;¸óL®	π0éˆ»nÑ	€{±|öÜÅ¬√'ñaπGvpa§U˘p±áL5ö¬√ËòyFA»rVBÛ±Z~úäy∂…ÙUp<‚b◊õ¯+EC$_RBÍ| xˆ4£ﬁú	ç˝¶#H;â¡Ã¬Ñ÷ñ€*>L∫C€˝Õklgy±≥õ‰]≥»å4ë¬èy—|c@‹ï/98Ä¡'LΩ÷6∏ZÍÎoæˇ›á«'˚Øwˆv†êx\_FäiÃ€«ºI·ÖV$Cµ‰m|dsE0àÍ ‚S–c°å¬"+ç|Fêüû;ı…f•¡è]∞Çf•T-2¶ d∆≤°∂¢fózDgí˘§«?áqóõÚ:Vóó{JÌ^ì˛d—
§….¥|ôY∏(5ï‡®ìË∞LSåÀ∫´nÈ;Oæ©ö"@∆ïU}ÂûI0P+2î!j£Ó∂¢¡æÎY˙uío8ÅÛ–€uÚ-Õiù©É¿˜⁄Rtá≈Âï;∏V£#P÷ aîºˇg˙Z~ﬂ—$^23‹∆1ı:,NÅ…ÀåvPª‡˙GÿØÆ]ˇ5tnI}∏Ë0≠º“ﬂêú+ü4√·™h∏:•[≥Ï§hhyñ«ãÔ‡Â‘{Ÿu<$ícÑmœ•˛]Ô“sËbr	r»Yòéª;(cI˙‰R_çg€Ä!ü-,..∑QC{„‚ÓZI _?€—òr‡p.≤@æÏl3‰¿›0F¡™öõé¶/JEÓ∑’œ.U≈OJ¬5œ3a–ÜﬂÎLÈJQ;ïyy	˜	|WÁ‰àˆ™Õ\‘|ﬁLAççÛ„83ü’ÔÌ^gNÁ¶[B8U«·yåyuæ–ïI4∑’
·≥Ú∂o¥Ï¿¡¥DH'‡ª)S‹Q≠á∫†xh*›‘Eü1•≠™q˘µÕÎË\s4ósú≥ Í3m,ä$ORu¯XQCÄ≠l3|s£≥ΩÈﬁBWxÏ◊≈∫wì…ueî®^¶€n^Rå´Ñpæ9»vcrÂ"ÛV?R§≥ªÕQ bçhzô’¥ëÙU çb#¶∂bJ]x!9bU‚<èc‡/‹}ƒò∂ÔGLR€«ÏπWV WD∂∞⁄ﬂò:î•C6†^·%Öè?‘&X«Ù”IFÍ∞≤n¥bª∫1m«yÅZîÌIÊ≠√qízŸ®rda Ìv√°ÉÓ¨_N÷◊F‰(Z[£cî¸µC£öÛ+¿wí1s^ÔøŸﬂ9˘˛®nNôp¸é–LÁòåˇA=E‘ôç7ÀØk$:óæÆì´H˙∫¡ˆL∞£qŒÕ·æﬂ‚#†≥9ËóÇ5öpØ‘–ﬂrCRì.T3âz´Õ«Çæáê5πWr•¡å4óD˜+f Éwànˆ8yÓ˘ÁÅﬁ˛˝∏Êscä‹·O]q∆Ö7£*˘“≠Ku±[≠∫”u4nq´u8óîEr≠_Óº:ŸA+¯nn>4ÚpÁ€É£ˆ÷∑ª6ÉÍÄ/´˘q§ÉêåBSDU;U7ccﬁ[t≠¶_O˛fCkΩi;å•nÂ_emS#e≥Ë ◊PrÜTÂO·üIÇ‡”0X}4ÊòK(Lı)Ûê†§Kòtë¬I≈HBdös|™ É}m*LΩüjÚoòU5¶≈-Ej.:‡Q·ƒ∞—Nõ⁄|1’Ó^øπ∏Í;GVçﬂÈg©÷‰ÔΩCûc†µ´›Ÿ·à6W∏ı=“ÍØ1‰˙ÇÆÔìbÔ+⁄˙°à÷9˚ﬁ»∂q£≥+,»Ω…≠≠„Ø}{vÿZ»$o>4Ÿı…™.sÍrå-ﬂlhQOB∂Ï®ÜwÉç~ıÜ¬«9iSÔ6n˜gK◊ñ£T18ÃÆ1ê´“n<∫RÄ≤∆∞tÔù‡u§<˚[≈f‘¢'≥GÒkﬁÈ˛$6_›I»äõ†"≠’Ä´k≤… ‹f	ÕßΩq8˛9YÃÙ±∆qï‚	óç&/Y#"≠2jﬁ™[ø⁄åÌﬂ\ˆ.Ω9´±ø‘p w∑nI(ë:+lSÂjîÃWm;<Ô‚ª7ÉîvÅ)Ö-v'U +Fà5ÆfÉj¡®¥C£∞›äUÈ°&˚≈’0öR VH≠˙“d3∫õa¶–åˇzÃ3oé^Ôº"]åÓ∏˝™0©ZiåˇcÀ
˚õ≤ÌÖ√u≠\ÿ⁄ò2Ø)eNC ]Ã(⁄¨(n6î«F ˙›l(µòEQÎŒU+älaX)Uÿ÷…©—‘f©I.Ÿ%'˘oÀV≥NFˇNSj•q±n;•≠r…ø5Zw>π gZôFÎa∆©VZ˜‰ı‡t´ós≤˙{7~›è´DKGˇ4¢·Â`Hcèπ¨ ç)ƒä<Áúø≠ŸdÇ—∞d7—ö–å≈¶fls‰ßΩJAÜHÉÀº”¨óàc«$∑ÚôEå3DΩ%p¥>Q*ö#=¥€‰„e∏\}ı¡Óí`€Ÿ¶c≤CSöËF•hÎ›Úÿ5éüC øOk∞¬Îì≠hÔ…pEG‘E√8Œ-q*mõÀéE[‚l¿Î7gœ¬ÎŒ6-ºZ§uî∑Ω_èU/WKgÎ^˜u0ß•ã∂Â>©˘◊iÒ¬Î¨^x›MNª^Æd›¬˛Ö◊=∂ìvW{Z„sôΩJ–98ÒÛ$ˇæ’t›æı7É‘*∞◊—˜ÓÔp≠¥9p≠Öb8
¸i¯ ˝;)sÚ≥∑”û£∆Øqp‰û÷+mÊn~¡æôRUQ}3u!≠˛pXjá√m£Ú^’µ„ùcﬁ6¥÷°ëk› €cÌ¨©ÔÒÊ\•°ﬁü∑Fkò´•™°∑AÒ‹6„åO«∏û≠G£ZWŒrﬁ¢&?˛jY67£|ıT’ò⁄ìXïn£œ('Ë‚Á	˝+c≤›JÀ9/∏™á È’ªPµˇi<û—c˛ˆﬂ 620˝Îõ+¬n†slU¬~ÒA~È(â3T uø®ﬁ-ºc›N˘5eÉ6XÙ	OœŒFr grD˙°üÅπÚ§¸aS˙aQ¸"z∏xw‰Ωfﬂ!À2p°ÚóaÏ≈CT—=OÆZQy≈¥VKÁ∂A”π…æj"q5/aÉx6|b√˛.eDPØÚº'h8rö/mÌ¿Ó≈aÀ1„¬ß>Ÿ7J?Ç/xwÑˆº◊Åî™f√â[˝ov ∏~‹,Û.õgÀ∞e$;=≈Ã˘¨&…û§é»,K¥…"#qs@Õ˝@‰ﬁyÊ\X"öm≈Èv…†ÿ4Òîà˛ë•J”æë∑@E⁄zÓ¢·°nùl‹‚<•öèÍnéî2©!Ø»ÕŸÑ‚]!‰…5v~›‘®œÏ zß”ô÷€s]Ø∆pÚt@eP˝HI◊y-6,£ÁçJªxÌ@Ä^Ç†ΩÑh˚úªëk¸¯:Â≠!ÂU})Ïı}á[KÉÏ√<k≠‹±y‚sk≥Å˝∑ùIÅÅﬂ«Œ9$ùu@"ë⁄Gƒ~êaË°a/Ã2ä;p¨j[„§ -ÙO[n§‚˝ù»⁄2ê&ıπßW∏¢ﬂqJ¥éË˜!á¥ù«π$ó;Œe{ìd”º∑ﬂ:ÃyˇN¬åÍúˇ∞b≈<ŸUÂè⁄¶q"jº⁄6^Æƒç◊˝∏…qÃH–L›xπ≈84‰b[‰·∆fƒÀ1‘‘ˆ∑JGíC~£œ˛à®8r/D$¬D>π¡<$‡N ˜∏OZ‹åa(.tIÉmZ”LJ¨ˆ¶πw$¢ﬂç‹7ãp6∫˚ú≤∞¢{ôT{tQ≥…∆ÙcC\ë6™HS§≠¶ÚˆÕ¢ÍºQygQä6öy¬aåπaU&?MÉ⁄F©”öbyˇ1FM˙O xîk
ˇƒŒ∆„~6Lì(:ÖØÑª¨U›n∂ˆ„T˙•◊Ø48û4e7Oº¯˙ÈL˝~C¶ö¡ÒﬂJ¢ÄΩeV˛${ÓÆóq?è+GΩıQêM«	–Rü¶g#«ºi4õÁ4ÛH¬”lcVJ”¡¢öNç0°ÛUUﬂ&∑&ê«1Ä§A+ﬁ:Y§≈äóÂùÌ√ Ω˝+ts”lA`¡?⁄u≈Ç|cñeÓD√—Ea˙U^Û ¢në ã]'/,Um/©9¢s%•™·©˙(¥s“çâñˇÈ'µåQ+¶∏≥ÌÂ∑˘DSuíÃ5Q'…Ôuöf›
!£˜°2`0mïÃ
óbyTÈ›MT◊≈/!{íéfg˚Ulﬂ
.[üDÉ≈êÓœaF≥K∆£1n∂RjÉ!≠ñÂNL4õã!ómäxjÏuß}I·\©ÈÕ2£©ö©‰~c
6C=&¯∂∆vº¡YYÂúê7±Î∑2ÓØnˇ Ú¢vè∏É‚›«_∂ô4ÕœÀ˙7<ò!ÛÓc.ß«º9)ß≠A≥GïÚ@L£fë»…ÆÎ≤„F*F∂U	g;÷ùcQ©ºKÜûÔÒ⁄bêUπã,ZYÓ”ß$‚‰mÎéa6ëñ˛˛bE·!x˝j[^_™f´TØhv+î_ú¨1tN ±ïePjèkÎ WÑª{µ\ºVÉ©†W…uòåyEqÁ7Ñ>p˚Á§õŸπüòÅì¢N<|∞Û6æπ6yw}ŸŸ´–‡∂™˜%4–›ÌÆUmÜÙN£&∂∑{∏öÔ†y¯D‘ÕÔa‡pøáv”Mxï5|ÌƒáB˝XÂ•≤ÍÚì±RΩœ'r“c≤l∂µ$›ñècVÕﬂπ®ñéã·yP⁄ZL—<dU⁄©°åcì~NìK+å<W”ﬁ≠¿}@Ùûúj‰mΩ∑Ù÷hU'CÖÙ„j”y∞X.9FC” u’µfÎèiGV
Ó6µ∫jH'ã˛	ƒr%`öWXBŸ9ﬁ≤m¶—¬èV5√b\œbd‘Ä¢uY¥6i≤ú›ö∂ø≈Êe®ˇ=‹{K%2ÿ"X6I¶ÑE´yƒc}©{iÿÑñnÔC;lé•Ò≥|˘'i˛¸Zw(–Èˆéï∑* =ÑÍ‚kÌ	CâG}B⁄k˘‹∂âyt~ï‘∫
Pª xå(M‘•zspËûáIÕ·†ï“‚dXJ{?#)r¥ß√ü$µî¸oQÛ¸∞»¢:[î»USYä-l7;Â„ÊJÃ¥fàz˙lÆÄE «ÍS° .n0Cë·yF<¸ª…oh◊œ±—PŒk/L“%öˇÂkd6HºAò&¥¸◊A,~«à:`@≈œqûƒÕWZáèÎI›+ {nã≠aà∂vRÿ†˜íÀ¯è¿∆ﬂx¯MMò∂…ü˘~bxBg˝5)¿9 ^ú=ù]–}aw˜ÒÊQpv√≠+gpØCÒÈ&˘”Œ‡* Æz¯ØB’PPbµÃpø?û@WﬂÖkwT3Ò˙aÊùFaf¨(ÿ„Xi:¨=ã‘«nA£í¡`@ÈçﬂI…a‰≈a4Ú¥dVY?ıqp+Û≥¡‘c |Jb›PàU„Ø£wÓQ1#≈»o&p
s|Ãq?˘~%ûØu=«Ä¥˙‰¸·§ÄÓ˝…4 ÇŒ¢ûLÃÑl$†D∂2’:ÛXe¶É´ítˇDﬂÂÿü©pg∞¶øã˘vú[dMïŸm1QQwíôZ$JBñπ¨Iã^ï6—ú˙Xé5ñáUˆZ-H¶j5Á±”…®¸P¡FeÌ±nq≈º=Û∑6˛¬ñ¸°∂« 	DÛMè¶cÊ2éÁèùK4¢ºõ‰ÆÀfn?_Úå°ö±1Œf|X¿s!ﬂo:EVﬂ@n</⁄—åÚc.O@à@Yj—Zú]9Vp‚BJ¨8&=ñ\˚ »P}§øü∏j±√QX™ò∫∞≤…~GzBÌπﬂ˛ŸãF…&¥ô·∆R°&Ï'∞/IàG€,z∑æ˝Í4ÖK•W,è€ˇ6º4a˘ò„ÄÁ 2i?Æ8„˛e∏9£ùpÓ¿ºR2@Kc·õÇsbŸáipó›Æs√*x®=≤˙∏Ê≈
 9„»s¶<≠Ï‚´ìµÊm≈‚-ﬁ˜aoÚ€Âﬂ≥¡Y˚›aÑe£Ç/=≠ΩÉ,âû|SíUvÒu(5D«…Ÿáa<˘A≥≠’F¡±vuCB¨ïÚ:JuU6ßpƒæ!lü≠[Uˇ—Z´›TAe˛“äã_’XO5€÷V◊U¿⁄*W‰4áµ$5ÀÙ‘Âí˝pêCÉ0ª@®mhnÅÇ{ó\”Û t’<JqÙZÇz›“KÙi3$ﬁ}¢u›'V◊C!uY}›«X¥®É„s≈TmÕ$&ÿ‘ìSß¯éﬁE&∏=J¶0Rãñ]|∆7({F⁄≈ÈòU3L‡§g'sßLíÉg’j∑ﬁ∞Û¬fçg+7∫•aü´—ﬁ9§êøöÒŒ(…ÔgO‚€¶ 9À/fJ≤π?√xí/9Ä)…tc4∆R6˛–…ÄgU2o?Q¬Dßd(@„Ö~•∫n∂;ı{ùªuÈ.õõ∆å_4Ê"ÒΩ…Ì_6I@ÒK1û^å}I®Q˛"O˙∑ Îë,òx‘—mí`®∑«1€Á:bTtGÚC2†°·}µÃ=—¬Ùﬁå#≠›ºF&xY˘újù1ë◊ùJÃ'ıàw¡Ò2<>ÿËË%(æ”¿≠πHnÖÒÌ_á°∫E™ìTÜIPØËÿr7}I]◊‰JZyÆût+ÿ±|“äsvä&Ô8»≤˛
∞{™ÄG{¡•Œ∫ Nœ{∂ü±ñ¢-3ÿ∆ÉÇí]“)„HÅz¡–⁄R?…ı*‚Ú*$8‘˝øj‘k)∂rπÔqœw¶Ÿ≠£‡,≤—Ó•$ßKKWËÕ◊Ìâ|J]È<rEıËQU„="è—\:Ì@”•t¡Rú2”QC^ézÁå}Âê∆>è⁄}⁄®!)∫ë{ßòF£O«Ÿ|»éw>-KÈ£(¿5Ó®™ªnï≥∑qÁˇıÂÙΩÏº‰+çP≈“Ú“˛Æπß)lBCtJÙ`âƒ:ºt8*íí}S…˝0Ò†ëuóÄ˙ªœÃºÈ/¶$«$]Ô4HµÉ©qp†nˇ«`ÒnàÌïºõz3ôÚÇÖ‹EÆù«ôV_^è.◊YèÊå#óíèPFT◊Ê.-ëó ÏsÜR∑íp¯ã‚cé2ˆÜ‰n é!:„°£[B:j©É‰qµhŸ¶á)ú<§…0AÅO®v»
L$Ù∆K·‡ˇ»…‡  DËa¬,êœ‡ŸX„∆jŸ„<•¡M¸’"u∂⁄˜¸†Gb9‚Öú! ˚iJ≈1v9Z{¡[ˆ2yäzÎ"Ÿ
*Æ1˝f7° v 5ß¯√…ı$‡7º TÎ™:Ú≤·4alé¶‚JE≤°,Â/™UÂæà/B< µ-6`ÔôJø»@"Ò⁄;˛–7Ô¿t_Ã”^èøhl!$áﬁ#1˛0·Ô
ﬂeG¶9Z=oJ>
Ü”lû·H˘ã¶3‰ûyZ,ﬁ4Ù’$LÁ"8˛"ñ[+ò·+d≈ É“ﬂ©.$Ù7…Bû  10B ﬂO¯wÍàø©mW›ÙtÂã´,Ú®ºUñ*n⁄Kk™,ÏEqß,ãﬂk(™XGRacÚB‹ìä„K’^^±| ‚v [ei‚fcÎä%£¥Ô∞–ÊT⁄(VßΩ‹rπî•≤≈w˚◊JCã5Ÿ0¡bùH\ﬁí&òﬂlh_±8§ˆI˜§Êâª)Ö4äÂ-i ˘MmiÔ5
ﬁ9	“±ºJôÙäw9H}]¥¿ΩJ.ÖNª⁄˘jb2Óæ⁄UØÙLaUK2n QÓí>Œx[ﬁ‚¯Ç œ†*BÒüﬁ¢-±äŒ”Æëè¯ ∫¥•~‡Î&8’iB˜ïëÑH∫phÎï¸ÚãÆåö@sIïbjEÍ(dIöwª^èújÌ˛ÍlQ?æˇ\NR◊”∂3JÜp⁄°¿Ai–=’=SNcu?{Ru⁄¢*’iõ‰\óÖÀ:ãDÆû6ã´úÍıT˚ÑÅpﬁíÀ’◊¸J∆‹<[®Ãµ¬4¥˙	Òñ∂éYBÔÔ`UÃ0~™,3Ì’∞õ≥È)7|¸bfﬁ‰o§ÃÜ›lÒcı®Â±LOgBé¿95~:;å¶ŸMyÓGù…õ‡≤êEn∂ﬂ$âî∞¿4SÀ_™za“t1TÆ¡‰µHj‚˘©ái≥©—c—ií£…Â©	O™Ó:X˜í2ø√5Ë5m*a‚Ö≤æò|Ó~'“ƒ˜«îTË?ß˚Ê¨*’Qè≈3Sö%õzÜ˙’ù°SùˆÁzà∆ÅnKËû—\Ú⁄"ú•ëXØO¨å çV¬•ƒˇû‡g˛´>û»·jÆHÇzõG’0ROèi≤~ò˜e6ûP]ñíî∫¯$û^]…XT∏[W˝´±!zÂëvÍÙ: *P .4&”î7jﬁò±ˇ› c>â‚;ù‘ëÙ√H‹z‡îBêbøa$ïç Ó6ÉÖõ4⁄ \UwLsa“î¡–≥∏hÉ≤ÃàRf‘‡’ìvπKöY´ß ≠£2ç±H}ËÁ°ı)Jº”,â¶∞¢‡,áıû'¿ñVIü.H∫I^”j* Ùõ±çmjƒzw\∂É˙ÀnËl‘3J"XºO;œßŸ∂4Õ«∑ˇÉäª…Txe=·( mJÚµUhoLRd-“õ‹ÃM’Ú˛‡⁄ﬂ∆®€äËÈv{†æ6o‹m€gÜ˚àOèÔî˚µ∞b◊˙·8*‰aK‘(çë<‚œµâIeGÉ¶íwÿcm
˛ŸRÊNˇüZı≥-¸¯ü˙;Ì£c]√é¬ÏU‚±P!¢;D)0|O•ëGùm…E@Ê¥<‘-õÑ±j⁄⁄ê∞÷ô›Pö£—l¥ççí£¢§8)’ﬂ:ã–"9Áz3≥ÅüÊjÀäŒk8â:T∑ônPF◊™Ebä!¶z9ŒØ£ €ƒeÎy+Àa…Rˇ¸ªMû¬Ñ uì,DéçÂΩÑ√ı´ÏM9â5}ôﬁX_6æ,4™Ïu)w√F¢ÀPÄP°≤˜€˜FÕˆmnÑPúŒ€åBG 
P,Ω5KØ°°eeî‚*ƒé©	Bπ9ﬂÎBÈ)S@%\A˚Êç9∂ãQ‰+î¯ÔDëíÚø$∂Râ/”ê¨çóHC“™´ì]—é7Œm©˜¶û{4åñfóÒ±Fie}∂41≤^ZÒRΩÏ:¬KKÑ«€)N'ß(˝A„v»€˝∑$Ê^ aå…≥†±]î2ç√°'[hıuP≥-KÕDˇÖˆd
^ÏHôXyOXuÒ[B-ª’∞#Ñåô∫d~åLhÏ˘€¢ÅOI2†∑Dƒç´‰Œ,h)£bóY*oV‚!á@óáÿÃß’™—<Øﬁ™ÿ«å/PyY}≤∆πH∂´07*-¿ΩccR	a¥ùëÎ≤§	l≠6m:Àé¬ÛQÑ^õÖ,±/ÊÄeÎB$.sÿ˝Ëô/¢br$uâ¢,ˇTq|°'`ó<eÊsÔ\—çzå%Câ.·çŒÆo ŒªeZeÖ3„2]ÖÉ/#'âNØÍIÒTÒ§ä&[Ü1°∞∞•W¡«öÛÏîÇö≥∞[|ZÍÅµhÍ®9ÂY'3shn˜ΩNI¡©ÿË7$Ñ„o…íÂ6ˆËf\÷ºˇÁˇéØŸ@ÿ≈ÊavËÊºH˜:®äv‚ºÆÒ0w{[ËFÏäÛ∂K·ÔÔÖ 3Ñ[¬r•@\Âà≈ ⁄f¬÷⁄Ü´÷†wOñb}çX5n’ViS∑-‰fug©lûˇ≈Ìù0ïøô…Çr˘KC¿´›1“’ím?ß–z‘Y˜<}&ìZ¨ﬂ⁄≤å_(au&J@X-¨mÕ 14£º3˜ı{ º¥é4TpµQGE{•CÄ;Êz{˚œzµaˆ%<∫¨HÑF/]√eáG7«¶-ë‘YXÀÚ“øv•»/VÚ—Á”@õ.z-¬d7Y‘§ÃpXsj‹í˛¸*„{î!Ãk⁄¡OŸ¨:..°CÊÿ ¢K-24@ƒ	&N.∏5	Œ0u]s1ûÔXKﬁ€°ò€Ö\*ÈŸÀE‹ÇC∫âèØßæáŸƒ˘Q
H[Rª}QÓ,BÆÛÖ ÀVΩøÈ<˚(≈Q4¥g:¡:ìs7ÈI£ß=âó="@Q‹ø[•ÊƒyQ3Õ.ÌÅ˜âòY\÷≠π™¡Ájã"[hjläqSÒ\µc)ù´|Ê*\Ëàl≈›—<eìÕ`¿ô≥˝BkeÔA©ÕößöB’e©§TÅÕSÉPëŸàà?2WÑ~Õ÷ÒÃ\¡5u∂Y‡è8oF>-1Ôù«#/-‹G^ûÌL&˜∑âŒI∂-ö‚≤≠Íªó˘€0∏î≠VüC8∏
OC·†≠Æ¿ò`ß-†·$~ΩÔWuå4æMóVÏAá·-ldÓ0∂≥¸°˘ôŒÜ™v]F»æ«Î¢•–ø"©H—∆µóªE3∫rõ±«–ã∂ŸÆÑ,\Å£{ñ¡≤C‡ΩÃó§|[©)ﬂ§‡AYGgç˜k–L∞–V—gÎd9Ü∆Ä™ñ—j¬£s—2ÉEPÒP Ã°_,<∑îDuôów©wØÑíπ—Ôt⁄Ÿò›◊¥[F»¿e$';Û∑'K§CY@lùÄ¯:*‚óW]‚ó-—•J©ëÆ¯Zç6Âé^ü«∑û∂IZì±¨≈ï.7‰0Æ<ùƒ∏˚sõﬂÀ$e(ã@!º{˚˛&Üd~{%né“eÃ¯Æ(Üª ≈j¶Øi.U®‹}^y¥∆<íò¶£πS”esüé©¯Ÿ±x£©qT∏pjÿÅ*ñ0w|ÈF˝‘´`àΩk7∞Á¯é['ˆ3ÒõaÛ∫‘‘óy≥cóíÑ9Ñ˚8!„3 ¬+)ÛÚzgˇòΩÿ}ÒÊ‰⁄⁄1G`π≈úÑq˙]|√X~Äå §k%“˙|Í°ù~åRPUèx√ À†©ò]†ÿ⁄äx˘‘ãdÁ<ùN‡˜ J»€˝7ªﬂø:Pãáç.b∞±D4¶+∫√√∆AhÛ&∏∆i¥7Ø¡«=4<∆ã,∆õV¡:j]dœ	Üœ 
«LL}
Hê“»Uâëa‚å0ìÉ»√≥ •,ç‰∆p‹CÁVµa"2¬·CØW‰Á—^ÁıÍíﬁ‡¿»~v<ù"Ñ£zéÉºã©¢vÍw5§©É˙p,äÄµÁI^º®	◊+;B£ÿÀí˘´¥GrS#/ÎQ‘◊ó≥AQjcÙ†:Lª»˛)`0Üd√,L"˙Õß⁄©$…zMÙÊúÙÅ∫ò>Û”˛˘¡£s'” Ûf!∫ 6í≠‡ûh-sÓ∆ì4»Y†œAhéTN3 Ú0!QrN”hï5ÄÛÙD®Û`”¨‰Y4Ω¢§HõEÈRËS/º“Lº‘Ã÷hWw∏Y=ty?z4d·yå—]∆yÖ>5¡˚{\îd&ë›≤]¬Ã*ÕµJ2C·ôÚHçG˛Ù®ﬁ¡Ó–JúªEoÓT±∂^•E≈p54à>≈Ê=∂£m3
UëC;ÍÅ˙ÊrÂ–›‚¶≤S)uËB@Pã◊ïz_FK∂ß]dfs•æÁVg;Ri◊Oœõr˜ñÈöR!C8*q¶•,[y @m$öGySÙt%»ú#ââ‰ı¨Ü«˚\Ç˚‰)/X˝ÚåéoCn2WÁ∆Ìaõmk1ì≥]D/üøÑ…Ì4¸}aw^˙_ˆñ‡‡Ç∑îB4Ç–ÂÈyÊ’û?H zA˙ü$]W€√Ö°k˚ˆªâB/øq/\Dy€Æº-[1êß?ÍÏz√!uî&‡#˘ñ*ı±ËëeååêåÊDë)wﬂ&∞íbÛS‡J§ª’5ró[%æß©√˜,UîV2L±ÖI–0“Ωj˘Â$πA•d:¨]¡Âè('Z^éäßÍ&Û@uÖ
}©¥Pt	8oZ‹aÿ∏EaüÓ¶ÈØÈzk—X6,Ö
Xk]A´†)Tâ˝¶òÇÇÑ°†—H:‚¨¸wf”,Hü¬l«á±Õ∞≈·å˙ﬁ8€¡{⁄…ËåÔ•◊f-5ÉÄ(‚ÃÃJ‰BwÃ¥∆G¡y√1$π(bG.1‰á˛ô≈#GŒ»W∆Á.o[2Jò≥Ë’üëè‚-ƒ˛ˇbñΩ*JHìsöÏŸ¿G˘‚Ÿ3≤|≥dê%ã¢OÉèñ˙ë’†ﬁ(¸3ÀÌΩÃH…yÃôû[TÈ+Ä
¯Å9Jp ¯‘ë?Dè8á¯j´ÿ†§Ø6¶
R	äÆI2ç&ƒA˘°ia©È—§≈¡Ñ9Û&ƒmƒ:ƒYßhå	¢íx…Ä%≈s%i¯3*‰"T
éì”∞¶v«´õ±Êû¢]áBµ/ûW0CÿH>ıôB“KœQ{‚3D€Å‘}ÿÎkü
˘ÑŒlE±Éü–v7ÿ%@P™˚6àÍ]qPr{ˇ]„°–ë0ù∑eHî¬™CD)~|@ºåÛhŸ,¨‡(xµ H¡Î∑íÇóÀ¥ﬁN
^ˆ»;^
ùçüqõmπéùBÃ6ÂV*∫\PTÿãüJÖUg∆S°˜ßÆ;,N:té›Zn∏*Ùj WÈï;˝Ó·À•›7áˇS∑Œ‡3ê‚ˇ™À≥ÉÖ^øi zÊ€ÊLau≠ØRÅò/ÎÙ∑≈f©Ã«oü/#ßz8úMÒ˜á’¢+¸x-ö‚Ê«l°Öô}{ı@Y⁄dq4I\Ï£ë6ÅÉ9ÉÉX<B~4π≥€ø2Î?ìÄñYñ!zVØãÓö√º)∑®§|„%:Ω†¶”ÓJ˘¥‰`¢”Å8™#´ØYÌ ]V≠ôo´/◊˝ßUÜQ	ÊUCÛÕÈuuQd·#≤À∂"õ√èOQ(1.ãìæ%§L”Ñ”2ﬁè∂@Œú&G(”à<E”LÕ®û?¶û[›ÖIﬁ~¥–#3îN√Òt¸2e⁄≠Ω<Ã≥M≤äu∆ÊŸ∂ô˙I@/’˘Q¢®pväÿÏ∆πyÉÈÿ`Ç Ërz§5ˇ…f»C›ßKıÄdÚ…W‘õJ√ˆ
¨r0uÓÁüã9I◊}ö@∞ÓÉU∏§ŸA∞L^‹µ4∏\!øjR√Ã4ù,<≠!ê¨jîn3tÜâ!ü¡Æ‘À‚ˇÍRƒ”è˛Úy˜~ëéRàUÑ4ìÁ‚‡ê˝∫∆LSª.c<Ò«YÕù@©`í¯ã|›aC§˚∫>øâµò<Y0P3É(Té˙∆‚]Cöß†˛kÇ¶{dÍ-ho{ÂπóR∏ÜZ”$Q‰ôïµ`‡ß0oROüUë∆,Ø)`bˆFáŸÎ û¢	
êtñ(NQ°âv¨BDkàì.™«Zıò-ÚM™:Õ±IﬁQ¡áË5™«‚„"ïÍ?®íXo/D/≥í¿™GÇ}	(1E’zé$”D˙äÔ!ïÏ—s1J‡‘ Tı8ÇÖÍÍQQ ºfQZ–‰´†k≤DƒÚ√èÃu8ˆìç~≤/bù”<§¶¶G'©7A‡¯ ¡,ÄÉÜÙ,—öá^òÿ
˝’Ö^\?SÁ`°µÖæ¥£¡!^à>ƒ‘¸ ßrMö6‘áÂMh._nøÄ°˘Œ∞4ÍÌI‡Z-<«|SıÕíSfOÎWõÃÒ∫i<ì1Y)˜∆,Y‘ôC‰´≤äú†e>√B9Ät_@ÇN≈í∫ó/åÁ"±5Bz©÷òlºI?ß…%~Æô÷(F%|h ÑmL¶›§R¥∂]cÜnEã≠£«î†4æÜSµ=Æe73
®;¶∑~F>íˇˇ»≈≈Ìõè»ƒöAlDkÓÇ≥\…Ù±{Ê‰hÁ‰‡√Ò…Œ…˜«Áøæzq¸NÏg<¶˙åH+ûë∑—†Âö©“è1˜˜=kJÜHg	!ΩïVî†BN9ƒdN‘æÛ·GπΩ∆Ò£Tt(óWõ†É§¡iFÄ¢èµ¿h¢PBıº#å†M&óLw–&mK0DÎÀ2bîÍ«)¥Ù$∆„tü!∏åŸ.˝ôÏ±â{±–‰;≤ ß÷≠-+cEç’3.Ú;V”LêŒä—,^-øù°Q∫:aLı÷¶ÃæÛØ;∑˙Àêfûÿbˇ]oLºJ/GD=<ÙñmCfJ”Írù¿◊∏ÛﬂßÍB2S∫R8ˇµ·sÜ·£è˛Ü'æhÛkúˇj» Œöó>1∏lzãEı°F^UÖ•B+`Ÿ≥–I. râµî™Á>à\pñci,nœîÛàúmÒËÜnxtéÚ¶#¶‹nJ”— hr√“kºúúTµÀ‰v ﬁ°g6q¯38Œ"Q£ıäÖÆ~IÄƒùËûFÙ·aêt–T«dßı\¿(ΩÕÉ0•gÍ'h∞eâºò˚ˇ®\Ì$\¯œ5úxﬂ]˜_GÇj¬¿∫éÓéà‹ï¯-MVÜ>ö∑Â≈ø^ˆüP/Øπ∞`jP≤ÓÜ*6≤Œˆ÷ãÎ@r!qÕœ/J/e'M•fÓî≠3/…¶4ÖIc0r<£u2≈xR ˆ≠»Ú≈˝7∏ $•Å©◊f∫*£≤&£z°†Ÿ∞√BÀ‚Z’ÛcãÓ@[iñˆBm≥T®7õÙÂ`’L©’Ì¶¸VjTÒçÒrÇj)/J∂V%ÏoƒÌ¬uF˜2I˝Ó¬B˝«iö§◊|À≈◊£ØTôßÕØª/∂ÜÏ¶ãå§Ω°YknmvP–ˇkë/ã$l;“Eõuﬁå˙åWq ˚T‘âöw_∂;¢˚$m¿£Qœ∞=ÚÒ ∫˝gÇ "˘˛Õ#rúOvÒE©q¬ùÜZXqÉy‡7Å`—mºDN·õ†TïÖıä~ë}$Œ8π3…ˇˇ   ˇˇÏΩ]oIñ|Ô_‚®áU›dÒKRw≥)
IMs!âí›≥˚
Çî¨Jí9]UYìYEQ√!∞Ä/∆Îã5v{.≥∆‹xΩ∞__öˇd˛Ä˝|ŒâàÃ¯Ãå,’ÍŸÆ¡¥äYôë'"NúœÁÑ/˘)°‰>ƒíG…R¨ıµt≠˚¬6√Ñà[,¸0ËYÂÉiT•ø™›‰QVóh’§©0 XÂºáo‚ ]}Ãæ`≤AÁ$ÌΩ«£˝FCd1öûû°8?ΩLÜ◊rœXQÖ°-Ä<2fV\OÇ«P¬H⁄@ﬁ°∑R§zW\ÎYÀ-c/Ë¶ÜÄ,ÑÅ gç≥îªß¢ÚWM ìç^àŒ⁄Ãhoc∏Æ±ﬁ.‚˝"óåîÿI?Ì~7«b!Æ•|˜Øü"o¥àWûFøç•ì•π=ky∫D'Ùsâ¸(L!3GB°È„0lúˆ¢:?òÚ·Œ‹,Óé	öY¿\ÛàS¯ˇSdã(˘ê‘y˜Ÿ)¿µÕøÿ}˘ÕõØﬂÏÔΩÿ⁄ŸÇ7≠≠.S¬oûR wàı‚n“É3 Wúd]úX=áY”wcKQmcCèi§∞)ÄÒ`[ò€d†æÙ“wùd8å≥ØcT≤åÙKÓË”˙ø sì(åÊ¯€Á0ãºüC±€l∫ùÿç˙∑â>…πq:öôY¬è2;_'∞Ñûä^Fÿ#‡¶/yÙE£˜	ú°pΩ
æàµÆêù/&à&ÿÌ0õ;È»‘∑FØ„ÄëØîF0åÚn!éŒò”õª£{‹ï s”`Ô_`ëÏË∑I3^√a•p‚˚x[xJ ∑8*‹9HÛV£S&r]_ªO `∂n¨„G8c¸1´y{È≥E˛ËæDçjÙB¥\≠≥—¯º3à.[_,àÔ…∞EÌg‚e´Àì⁄ç_%ΩÒ9˛∞Ú®›n Î&< {¿®UpCçµ:
èn˛pÛOq®òhÜ¥L%ﬁ⁄2ÍÇÕ£&.≠¯óö€^ÊBUÇpa¯Eö≈ﬂ∆mÎﬂµHqôï »ocõ”/d©‰‚X†ù	67:ùD›ÔzÏÃd»Ìí}:pN„ÓyüÇ∆¢.1Hc‡“¬u0ä'9a0?†\π‚P´:kZQ‹Åû¿^Z\fø]|µ∫º¸zŒa!¨•√ÁMˆ†ëèul_]qŒÍû;dt{Ù‹√^LÕsŸÍ√9~,jW^√~∏ZÇH|±lF~[©<ó}Yüé‚øﬂû’"–&TEì¥ˆ¡ó&ﬂ≠nΩÿâa≈ü«π¥è’ Tƒ◊Ñﬂ5^K÷ü‡bEΩû
ı\„U8)sõ.£)“ÏyzÜõb˜"È›¸B3ÊDπd”å¯!…ƒ)ÚπÉF∂≠\!⁄bUˆuz]YaπOÿ<ˇõ<}¸+kΩLAv6ùﬂ¸>mcd¬Lâ*óy—œI‚GD€ÌtÙ^ß¨Mîˇ§Jﬂ˚i§"ç¸àà%{ØåÉÄÏ<õébz\]∏Ì∂û‰∂SÏk	Ü˚#"∫HS–iéeáõƒ—LG¯p+1üß2übñì‰≠b¡X¸8ÊÒhé·o{íkaÃ`z¨ÃYÓ#	º,9oñ P
˝Í∞É≈T˙Àe®œÍı2>
P‚J´Eô].ª˜ü'CCñ·ﬁî≤ÃÏ‘Ûﬂl¸ ˛›†’3SÓ¥¶m]‰√ZûD-;[™L¸xë6·∫p>ñø’ûjY Ó˘‚HI≈k@*Vt»LH	Jôù•d›Ö=è∫◊àG#P|5ªuòRâ]éÜ_RX”~\ÄtaLp GIìì °¸ê≤∏,¨‚<H’=s¨Z·€eÅ‰É*iYt	P/Óﬁ∂jj.Ω∞á˝∏Å1ı·ñ”ﬁPı´€k◊™Ò¥b‹wãä5Td È•w_≤F¡
˝¬,^„Ia~dYv¬Ä>QDÃó@NNÄ∑–Ú«äâ’∏üœ∞Ïœ†CÑ°µe÷Kê…ò∂<`>˝7]Qï·œ˚Ôÿ˝´1à%A†°CËÖ0‘ÅxX§»Ô(}ºYÚé·ﬁ]~|DÑ‰’0`#- ¡únë&o¿ã¨Pd≥Ç6“?S˛\#~˝¿ih‘'Sƒs¯ÊèÈ‡é\ÒBH≥«üËàKd^¿KÎø‡–äü<Œ—>¨›Cåp§»Ã«•ªjyóˆ"ø ªƒ¿6◊¶ÔŸZÈYâg›fK¨µÍ˚î=*˛≥˙†›ˆÙ¢&öfÉíûiÄIO;.Ω8O2W‹FyP0?>àc(3A≤¬·´êﬁ|çäÏÃz≥¥7Ä‹»§,C…&È’…APâ[ã_Lì«’$°Û«ËùV
ô(„ÖFÊßQø{Û˚¥yRY¿1<uﬁ„äïıX,È	,Í’ïŸW⁄ŒπÓ±—IÙÕó5…uÉ©‰›r¡Ò≈àà1ò—S∑Ú‹¥q%ΩïÙ)DKL|£’ÑØ|"9LÌÚ5u£5Ã€!+Ó^8≤2
˜™öíA]  ∏-˘”5vãìŒ{5iCÁ≈Zﬁ˚˙Îı¡†6{√&IP∞cX∑Ç—çuwX]*Ce1G\Ãi„˘DCh[™Ië!Êá…ìõjuVUäiãM≤PØ@Âbòü!0#.>›ÕHKÊ±l0èbå Ò$ñQí±-TmCj1W-ﬂäù-5âJÈ‹4ÃYÌ¨Â˘“˜!•y\HäÙ%éËîÇ}ŸÊG/›[√øC¨íÆÖúü~¨ræBˆ”fí~ÍÛ”£å/@¡».óÊ≤¸Î´◊XcÊµ˚*RBÅ…g;£I~ﬁöÁª]H}VÜ®8ó∆8_¡:I˙ìB™ê ≠
TêŸ+©≠u ∆öH¸I›¯±©È¨k§D—∏*¯íÊ&õuûöjÌ§@	]˙Õüˇ˛?˝ÔˇÒoŸÛÑ*µFÎ 9"!»90÷"îP`0„¢]Ω;*k≈7‘úRSsJºjSq‹∑“øx≈ÈÆ∆˙ìÍÙÉ©N•ãı√)N≈;ÉÍßhM?‡`œ–?l«Æ1ïD©Åv)L]∑¬‘˝g§0uo°0»∆Û•aÂ÷:S˜'ù)XgÍﬁ•Œ‰ ˚˚Ig
ÃG®3u`ù)2Î'ù©Iﬂt¶ÓèWg“≥˛≤U¶;ÍO”≠5¶L+1cJ!fliv˙*Œ[˝8o'Y∑_¿≤=∫∂XCY∆vªqæf=ë,ˆ≠îíyûFÒo	<dá◊´9_≥Â¨ÉÂ¬–5JÿaaGªìG1;ø˘û◊¡ÇX’2C^;∫˘«úK–QVVX°⁄}w¬°„©vh]›õÔ°àzêäß†¡u´ÛÛì€÷ÍY±èa¢·d¥üç`/ãà-{È⁄E ’#€∑ç–6VS˘FVj=4K[YYã˛e∫f!¢⁄s˛„˛ÜsÑ˛ñOƒÕﬂeß7ø711‹,¬Z∆Öbˇj◊)í[àúÏE⁄ã˙†aıµ$≈(}'Teoªävìc©±˙∑lán¿ã◊Â]8ç¿Û¥<à=˚â÷i‘œc¢ΩócN˝>’âÀÕ1°s(DeÏ6Ç^®≠¬@÷…©~Â<èÌ.:%Ã&]Û~QÏÑRÁ±“I+6ﬂV¶óJ
QöÈ6Æˆq¶\E˝vﬁ¶ßÇ8À˘JmÊ=zEˇ¨x∂ú[5‰ÅÊÄ≤nŒËlGQGänÄ\Ÿì$Œ±h˝e*Pπ\i5ï”^µd‹…Ò!PŒE\µŒ=.∏éV≤Ã¨ÍÏÉnˆ¨1LYøY)s…O∆-sÒ˚g†°√æUhv	ÕNa„ Œ3!l±‚”Îótn?Ûb„ôøì∑†|ﬁ∫bù&áçﬂ´ó™•éµ¯y“è~ï¨Ê£YD;_Dn˘»≥¨úIzTÅ4Ó…e ¡(Kª1Ëuß¿.ÂoG„x‘rØÅ
ÎRE1€5õí®Ÿ[µﬁï7*¬˚kŸ*nÖd8â2a…À√IòôÍE)à–·˘ƒ°/¯Ωíù;∆wÃπéMKoÏ˘+j' ˜>æ‚5∞=Vo≠Ît‡≠o/¢§Ô/j-À7ÀUVWƒ[≠‡ºN•ôeg´Ö¿*ﬁË)zÜ%î=úƒTôùqß"VVÆ6G^U∏⁄Y∑Z{∞Y›jM]YiP∑ıœÀ≤vx€÷rÎÔ™lµ«Bp∑E´g[V⁄hm“G¸Ω7†\é≤™”7O7≤m∫±Ÿ;`K¶Ÿ¬Æ&	lÓoÒÆfÕüf1®Õ5V‹TŸ∏øL∂Ø¬ÄÂ'â.œ_≠> ‚¡Î˙î¿¢:©ß6iY,VÏøº¬
Í˘]æùÁw’Î˘•èõ\›sE2$¸ç≤´∆gcƒ®Ë˚enÿa¨è»ÅnÛ=^{q≥˛ﬂsÄóè{»-KÅ«Çﬂz†Öd#&Uz¬Ö(Q÷œe≠+cÃn¸793⁄vLè‚ag6‘Ò—!¨æ.Ê˘Á‰Û~C_´´»∆eÚ"P`!>Ú§c\GwQe;ÁQ~¿Å6åá7kûÕ£~/›Œ–∂ÅEh_N–ZÖ	x˝Móˇ–ÆÔgBÖÈ1kUÉbªÑÎ+ñÙ÷©È¬:¬ÔhΩ{3$ºx¬ë«keâ±˘*dMrû´¬%¬∂«\º,|ÍÛï€|p/Gdze4ªØ∫ù~zÜÀtí•lœù¡¯≠ó`H¿òæwìÒ˚◊æ†ZO”móU¯ùàH ªE*Í(ã/êä’P≠ ;‚çïâ˚bÉÌI˙Vﬁ´8üı)®z 5;’Ø·EÂ¯˙¶+ÃU?ızp‰Î˙ú(eú+ûæˆEu–ß⁄6kÂc„lR˘TÙ∫◊-Yπ®•e˛„Z”“¡ˆ”ív> %-'ÌÓWtÖ-≈˝»ı-Íw{"ùÑó„ó\&kS˘3 –TË√sÕçXP%äêÚ¶ç™ÚfóFD 'Üë(w∑Œ“ì,9ã®‹srâ’
Ä1ú&ŸÄ\|VRéHÔ¢q–fEE'å·a<8Øá◊œ&I∂P‚»#æ˛ %q≠æuê£ã$GøbûcΩt5"ƒ'] ¿‡ïi™ŸZáàé|≥îìBJn¿&wÔƒ'cEHëÃ∂˘Ç)nÖ }áU›®É —Æ∫"5–øá)!U<ÿ,o&A~évÉ„¸™˚‰´¸\>∆å—r¡(q~≈9‰´ËZy4Ê…IÄ≤ ≠EäKÃ+ã™•âÌ¢¡°îRãR’6ÂïFÖ©©!îG¥v¬ÕZéo¢qŸÿNúØq÷|Ñ˚Ï¢è¡Øû¨+ÆNCƒÕvr√Aπ›·âj`óyåÍ˚:#‡ﬁLÇ]tÎ@∆ÉÓ≠Ω^ÒIk!7+Æ≥´S>Â%åè÷d˚”ﬂ`¶]i:|H‘eŸìïRëkV]ãòcﬁâË_;®O∑è´?Æ-+°5∑]]±…÷Í”=§XŒıÊèD¨ù$•√õ?]ƒ˝ıÜkÃºbtKÎÃvdJ1e≥[˙3^Wä]È√Æ(%‰ \Oj4’\Me»óµñ∞¸J∏[p«8Ω”eƒ{Q,"]ˆ¸(óQXSXƒ˚"KááTw«c…ŸıÍ2W´-Ô¯CMˇJGI“?F\-(j dd}r†òâ=Z≠Âfbã˙òÂ’ïe·9Ñ’8>OÜ⁄6)Ívâ6-J≤∏z∆Ë KQ¡√&1“Å§x™!µêÆÖõ wwE˝÷Â–˙≠Às2tÅ«‹YE V‘Jn8R8é¿˘r®Å>pƒéE%ääÍPˆ0ı&cmT∂!a|Â^T#[â¶MhPÆus„EúÁ—Y|ÙõIî≈”–≤é„MµÆDB≥M‘,øÄ˙‰Œ-˜O7∞ÜÉâÒC!Á⁄◊9±ﬁåWå≈¸∞,>-cM)∫|ü^≥~t˜ìÙÙOÁd\ Pè',ó˚µ?«Éh4¥¿äñ÷ô¥¢õêdŒ\ÉÍl‡U:{<ÈôçkËVEL¡Gên{˜¿oG“¢¶æÈfy˛ÔøﬂCˇn<ÚoŒ[Œ¥mŒÖs¡ñØ{⁄üd˙À¯^ﬂéGœ”Ùª…(0¯ /ÆP†Eä¢Ë7#hïî‹2D¢,>,Å|CV–eT˛Cò“—‚ó(09˚Êﬂ‚bG…msÛ?—ë‰›7≤∞˜-ßà7„ö%Áqw^Ô˘.ÖÊÀ|?‚≈¸œ(Ë◊[ÇZ	É÷ŸÁÖÛŒ€«“øwÎéñM˜ˆ6\È e
Ó”C9‡‚xoãp ∂w‰‹∏®˙BÊÓ7∑p	^¯FiMÀ”(…*¶D∫Vo=!≤°Ü¿ææ≈yƒ,~‚DÖHÃ xøhπQ[Ô:Çéı±‚9Uy]gÀRÔÅÔ~ﬂÖ`gÍìÛ(‰Ã+èØ¯è/ìÒo-’*|∏7…HöÉG:´a√—›¿ˆÜ˚ìÒºø!e3AwÁIØ‰,Swúœ˙≈Æê‹À¿gÉÄj∞ú∂µöPaMyµJgJuƒºë<çíºŸ‡6,EiE€Ø;—òr._bEgäÈê¸øá^Ô!V‹~˚É¨h*t/Î√ŸÊA⁄®∂û±%Ü¡Áﬁ»ÄÖYpIŸV5£T˙|x¶u˜ﬁnfg≥Ë`v‹5ùéI/Í˘W˘ûn-köfÊu·%G¯oW—ùq{MÖZôAg1FªãÌ¶Ïhÿ«ãh∑\\ı”º|Ùˆ§/€j>® Ö¯£fæœí!íì,≠cº∫‰ô^D†´¥Ô∑%ﬂRHÈ¨ïxÑ*»{ø|J…†”€À®Zs'ÙnÊ´iÍmÌŸ5€p/‹¸∑aí÷ùΩÃaÎäz=ﬁB
¶ÔÓ‹º’KD“/wﬁ‹8ËOr≠Ä÷ÌZ±µäb∞¡aÚÛÊ¿BTêu∂Â¡Ûﬁgkó;ÀÀ ©nG†V»´_<ƒã53Vi∫¨Üæ∑F,È]“¨[f˜€5‘(»G[Ù?I•ë©¯hñ§ÉrI∞V,ËÿÆ
g¡ùFeQ¯K≠¥…EFmG¥Ä$l^itï@CêÚ±QjŒ—S:]íöñõ°“∞Ã÷hêùVK‡˙¢Ñ÷tßC ?‘œÅÇl<ÆB8mÅP‚?™Íü‘Œ≤kàr»fªz®…€Æõwãk´a´∆ç˘î≈8E,:∂ç√È∂MÆ≤çÅXUuÁN€?µSJ)’Añ3*ˆOÚ8ªàn˛pÛOq≠Fè≠EYUR,Kﬂ/xPΩ‡µ≠æÖ°œºåífA…fyzí≈˛Ã£ò˝)ÿ‚„S˝”±ÉH˝∏≤ìçÿx#◊~ÏpﬁÊõ\ Q‹¡^á-âªÑn™¢x≠pÓ˛©48∫Ópz-õg≠ı∫e÷(|√c∂~ 9“Eî%—p¸xÓÏ<Õ«sÓ„4‹il¶√G∫æﬁ‹ÊUØ≥ç•ß~&eç èªÈ∞<
ge–=¸“æˆL¥√Œ¸ÑÕøàáiŒˆG|;Â¶W<ﬁ™Äa˙Ü‘KÚË§˜ﬂ
#Ä¢^ó>
.hNÅo#4€√!E˝¨;Å∆GgMË=øn«a´6ûºï˙T?æä}oÉ$!€ﬁÓ…n(”ÀC–‘∞ø|¨æ[8-&èﬁ#k™&∞YÀ.«ÿ6gœ!P(Mõ›ç%ö¬Çô o9ÎEÏ≤÷Voê€XéªÀÅÄÕd1›àÒ2H¸V+ßÍﬁ›‰4È¬£É±˝T!˝$ãÿ)</ÄêﬁãL⁄MÜ˘dÄÇ∞0≠˚´Ñ˜0ßßóEi{V¬¢’ÆÓB'0ÀGkxèö»;ÅÌ*˝qä7ãs˚+L*ä1[É~∫@∏Iü~>ÈÇä¸<˘VGÊÔÑ≠ÿÔÿ0vΩÓOçœë8-xm"÷IÜ\‹¡Ïu™£”7f[√õÔ˚INsJ˝êsÉûrf\ÈØ•MfoÅÄûæbÇπˆÑV_û[1aW!xéq≈⁄cºåq[=àﬁ£ÈìrΩµm≈_Lè$°˝z˙Õ~$…üyﬁDI/∏Àv‚ÊcÂçv”®Bc7&≠∑Ó©/‚)]›Ñ± ®…%ıáuÜÚŒ)¨àû⁄∫Ú≥Á∞À8w/Ä•√ÿg≠ÁÈ0Çñ∂`k`N⁄í\ûm´ã4^˘‡”lB	ˆ&·…ÇÉ~ı√vaü≈≠V‘Ì.êâƒ¡:1ë∆+€≈Óàæ¥â‹µe2$¥§3H•kﬂì1ˆà„{|ºGÙ£?†ó€ ÆºàFØÙ;^ª‡ xªø„D”Ì(≈·ÀÔüÚÔøôÄ ÅaπÎ˙ﬂzse˜ŸgJo?≈7®w^/8◊™FzE(VÀ◊¥|™‹∞Ó∏·´°/ã#‚Yî&ô‰9
KƒúÜÖÇ\ˇ’¯)D√	»(Ó~ô±ôî
îÀc'ãN«2”öê'O:Ôf	…C∞ÁûßÔd,XábqÛ_%„Û÷ºËVÛ≈ô
}åstA√ï±œ∑”j(ÀÇ9VèÒﬁ4É$Pì©FŸËIˇ0›Ã“û◊‚J±’Dó-∞–[¸F4 ulÃ7Z€Ω∆È˚DY¨J®êxVçÔÚ≈˚ÿÕgÍª=œñ«§|±?S[∑Ô„1)NÌ√ò∂/qÔE≥a˚—*…~Óãß6yÌ´—%˙π[CÂ◊ëù)Õ9S…√ÉJQ‘‚E}
Q†î9|ÕïËOóÁ/@O¡µ*≈/4øv√£+OèôMO7…l·Rs!nKÙ£ÚúT#s}µÀ+ì\6ûFΩ≥ÿÓœÁz°è2iWÀÍ◊∞⁄ƒîê˝¬g£¯ô9ÄäÇÔCuÿ9/>ÛGH≈Çî≥‹ÒU	†ÙLîñ‚lñu–Ô<y8_à4§R®™KA:Ÿd˛€ˇL(r'æ∂ïòﬁ<Ó”ÄÜØL!pæu *+0ú∂SqvZ"}a°ÆBO%Î$bUäô£Bà1;'˝¥˚›‹¶–^n˛ƒ’dZ˛Âmæqf Ûs6w›‰’≠l‚∏Æ“Ú=Á3‘‡,ôÌVœk])º∫∏wπ}˝I€9WÓÅªÒ]ù6qd…+)«'y)∏7bÕÀ^÷¸–‰ÃU∆ˆÊ‹‚]'ÊKG'ËWo≤-#á∂•˝∏¬ﬁ‹MˇΩGLµ“#RY2AÃŒÕaz–ZÃ~^LQk´’›|?N∫¶M§rÅ°ÿÇJz•wùk¢Lı"øÌBˆKN†tvU©[
!Ø°DX´A÷óø£’»)™	∏?aÇ£{√*>¿ıÍ%—è6Î
T?,âá•_ª∆áÁ.äáüŸRÑ‚ B
·Éëπ+5€|√Ãng◊˜à4U˙∑˙©√_™ãqÈRQ$_}ŸyR»Dy•µ˝˛
C‘”wãØVp®ã+ç6◊óÏ™ò˘Ä‹i7ˆãY9N
Lmoó≤]È8ˆ‡]ª∏ghÒˇ…∫⁄a€Ö-é÷BUﬁGkHÃ÷:“Ú,T üé‹ª9rA)ù§Q÷€>è·5˛£WÙ‡’'Á∆tÅ{ÄlÈÊ6Œ;_≥8~IŒ¨>}√¡¨œﬁ√°r2˘¡ÉZ¥d˜Am¿f‘öÆ’jóL⁄dóD¯˘¬å∆˙—Ê∑=pÕë’°Êéæ˙»úˇ„0sŒ‡4aIk,«#¢µÑ*à§BKT=Ö®ºúá‹Ùh`Z[v!Ù¨rµO3E=X6†WT∆±‹v•ç√√‚V+Y\	ëèºnùmÏ¿Óå≤£‰lX—Ä]∑‘ó
[é=∞TËÀ*ú∂ C§çZàí0√ùRêµ—®JÎÇ…»≠Ug°ÈVÖµ
´B˘AŒoØ≥ï|WE0!˚‰X°-<¥ê«# Àk·Ün˚`kÙr.%‚;Ÿ‚§˘ê7…˘hm`¥ª°fË∑éÉˇ RßuELåáõÙoæœQh∞˛Á^Zí•Ω*wîcæëqèk&>£^)‚	Û^Ÿ˚óÈE*Ü Á±*9WàUﬁ∫6bõ«√ûOFt<Í1(–Ìzv‰Ó—ˆ·ﬁˆ÷˛ú_âi
œx‰«Âî\`«àœöd…o#í1∆≤à£Ñq”∞wÄ˘U%˚®˜Y®	æ_"hP‡›‚™ƒ5˛o∑ûÔöâM£,>M.aÔﬁw&9…ÓS∏y»8ÈF≥\ÖIP	@å‹– ∆t‘Ò√@8!aòê;qÇ#Vc)sÅ∑ÌÚ'/ìﬂ7ç”LÚ±á„®à‚k:î5AT'è«¥™∫}î#NÕw{∏8º£¸¨Òp|&¡fä˘aLñ6ÃÏÎSÜ◊ÎÍıo#ózMJù™d¯Eòì≤#ˆ¶˚xên^˚9Áµ¡ÆÓ““çÀ3∑74Oa	æC
i∫?◊Øg≠”7RﬂXÍ(ö≠qóCÓV‰±ÅAog3?⁄c’ëÌ.¡†qP¯ä+(‹Gï.ﬂ^∆d´6˛ãdxfWqµ˙ö…2nä∫kc =0
]>\VgLı˚ó# )8ªéÛ∞:ÈÛf[Ëñàº¡Ï>“8Ê‹∫§»Á◊ÌñR⁄*\û›,ö\&˝˜1¿v0J	BàzjDº..≤<D(°ã “‰§Ù£=Sîw)-sïEøûÙxÕÄK–ıÄÊüÒ0‚vYI Ny¿]ä-NÜI7ÂÓ4Ø"ò:‘é`^˝ë;QÜÛ™¢è€Õ éÀü&–Á°ëèCµ…0o‡Å√8à,‹a6™È°·ÓÂ(£»öÂy≥–òÕ9jƒÖŒ»†´WÛ€»π˛¸o˛˛Û	˛ÁÊøœø&+·â+≥ÿWÉÃg'ˆﬁ0ÿå2:ÃÌ…IXkù84OS<T®Êâ0´9 •`1ºç/¯ëuTo=á‚2P“ÍÀÆ⁄„vkıf⁄ Pˇs§¯¯ü/âˆˇﬂGF˚´∑&ÒKB˙I∆Ó_ùp˝Ñ|uösŒqeÌZ@ké¶ÊØﬂö√ûÈº>¿Ÿ|àˇyÑˇY¸õ÷≈û≥∫ÇsπäˇY√ˇ|ˆ6´ü˝3úU˜4MÀ÷tÑúZ°î®:≤™ÊSÅh“zgmŸêL]‰∫y:%y™i“πcö<nJ5K[’Éñ5=HPÄ‰–!º4´Èi∏ñÈ”Œ◊âù4¶ÍÅ∏µ∏Iedxı€,ø¡öcqãÅ8¥ö*Ym&ÊU6„%ÿ∆iñ§ÎJ5µ~Lv≈Fe€:ËÈ™U€“˛πVMC‚ªI/…JÌ	ÎB&√IdñbMÍÑ¢‚++´)ñ,9°VD”SÇ≠åJ«.MÃUjMœ≠¸Ûﬂˇßˇ˝?˛≠V–Œ®Ω·‘—*Ú6ò#y¡°HÂ˝¸qôD‹µø≈k~9»Q‰6ñ£E1D˙¬Ä9ªög.{A]ﬂ 0\µ™à÷√)*ç˘ÏH•ı*—]îﬁÊ5
˘¸ß ûaî™L$˘ıÕ˜ébÑ & ˇ·ê;™`eDM„Õ?ªIƒzûÆL2qª6•Á	ÏˇAT?8Úä.¬_˝1®Ê£⁄,Î?;ò€;[µ˚ºO4≠+
èàí€≤nÎ3ëˆáNÛ∫áé~†•ï=≤E'—qt“ö?ßßìnÍé◊qBÛ: Ç"BÄ~PeàJq@)‰=9Â*˜D¸U√07/÷
!€€Å‡ã°œÎˇc[uwZ2¸÷ı¬?\aÂi*Ö◊÷T.®¨Ê‚VSnVJyä: SQÆ®†<U˘‰) ÅWÑuá2›∂
¯]©MÎˇ¥Pùü;X®ã|7_ßÕj{O7â·∏≥É¯Ø@ÏÑ√89M@`Lõu[ úÏEúR∂™˘‡.ŒÁJ*î™´5®Fh(1\Â3&°tˇÜí»rp
ÕõˇYb]°
.Òn∏∆jπãF§.õ‰‚âbª\ó7≠ √?‘€ï[π>{SÜ`yg˚dyz¬ﬁ˛rÇeÌÿŒÕOC◊œ¡f?ªØﬂ]ïL˛ñk·∏oò]¥Óp.Ø0ü™{ÀE%øÖV9§Œ{wœ#.éŒïÀékÂ˝≥r®B)ï‚’óè.Œ_≥O£PnLÈ`€÷´}ü/Ä°~g¨à?˜+@	›¥o≈‘õ8dàz>X'O¶äÎÁ8≈“rß){eÎ¨4á∞£… çO®¢û æênUïY‚…ÆÒ∏ÆPWç⁄Í\éV`,∆Ñ÷y»ñ©2[ß°‘ÉÏ\·ob~ŒŒ·ˇ–Öwã_‡?Áè2|’ÄGÙQ˙Ñ¯SÄ⁄‹⁄r@@¸∆79l5ı‡—,bPï≈Zô·J" Vm![?Ñ§8<>8tÁ‡Ñ#DHc€÷ó^e] ?¶πÏµ	π°·Î2/QR&z{‹ ûÑ¿zFÊäsÚ…T“˛Ëª¡ôD!‚—Ù)Ùœ€˘‚#æ7>ÁUìÕ‡Àb#∏ûz∆¸¸Ál.^$yr“èÁºYed’Ω{ZæÇlú>(®ößhçú €∂µù÷¸)?Äb6ñ„aDµ¶≥∂T])"{ä=˘6?çmq?¡¡^ÿÁ:Ü^•¬XzeJ6¡cÎóŒ∫ö≤?3‰e:«ÚÔ'/ÛO¥¿ºâ@"<ã2ËãwíºãyFﬂR=ëz:w:@ﬂJ%î‰pxü›∑ÔØ∂è∑Qvöüø¶Áx	¯≠—XYOyè,§¢æCª∑_E‚m óyÁ†Cœ≈‰¿q<Ë	æÓ4Û2FW!,ëú™ŒOÂƒê?Ba4Q”•~Mw0êw¨8 Ñ¥†Öπî.V<é°¯/V<OË5ñsπ–AI[∆œKîÁ–Í&û >®®&Ÿ˜¨√¬<x˘§UÍ¨p“<≈ûãåo|Ö3)Éú:{“≥U6ÊÅ‡Æ∆≤∑Bæ˝ÈÁ¨<¢˚≠¬©∆Ωhn⁄yŒ»Y%Äß+º„˝˜€qå
Ü·€Bﬁﬁxí†=ï–æo6ÑêPzÃ¬#.ÙÑVk®äù≈≤•≈∫ì,OAKHûπ"“3+”(˝…ÒéäI0 ˜Â†CÜ™Ìéá÷Í∞∂ì˙«ºE£fÃÅ"ÿ8„äÙ”~⁄•£nG≠√†∫Á˘Õü.‚>z__§'I?ft„w„t‘HdYK¡™lM˛Áî<ÆF¢„L®◊Ë2√zÁ…ªØ–-0‰c8ñäÌäù…¨h⁄îJoNòÁÄ≠@etëSô. é÷vÄ;·áV)ÂyxŒï‰:RÄ„⁄¡àSbıEôı mÕœSS££+éi—Ì⁄-©[JÕZú—?ÓÊQ˙(¸AOe⁄Ω\òvè≥◊aü‘&Ö7£/OÙ—íçwÔV;º?cíë˚ÒíåwoJíÒ*[d*Æ¶öOVv˝@#%>.0U˙cò‚üvqUø·™*¸ˆ+}„Í’√∂≤ˇáWó_ãb|›q@%æ
˜ë˛°(qh≥æÑòÜáQ{w∏a®¸8∑ é∑¬RS~∏c˚◊˙cízΩ;6ÀÑæù‘˘5˜)√^∞%ƒãˆ{bÀè∑Ï∑“YmCátoN˝åRöu€^ö5ª?à>Ê‘–÷@¬X‹iGÒ'[é‡ÄCzy*'ÙÚCÀøªR_8Æ∫Ó%´(¶^|hk|R≥’êUÍπ9üÚ‡CSëDüù˘vCäñHû…Ò’≤Ô‘{‰≠èÁ0\y9<ƒ¸#p4¨ïWaç∂ä≠Ÿe*xœU(îÄ≥^Ú	j;“êào¨ëUÊA•7û¿KÙ;„«≥Øs>'”´/…7ÉEÀ¡©uPcZÕ$- "º\â™·ÏΩœØÊU£ı¢k”üs;ì◊ùhÜm÷)_Vqb*Ã`Æp=Í•Ô/Û0}öyå–bG®ƒ…è¥ÂpasÆp45≥πP.»ÊÚ<åÍ»Â⁄öU∂O˚Jïﬁrµzä´}eU¢©qO;Ø…†Dòë¥nPâfíÁÒÈòÅ¶øŒˆ«∏å4ÿâ«Q“¡uÅó[kÇ"¨xÇ#BÌ$@˝Ö\6õóØmbµ©0±8,¿¡ˆÕ†böÂK˘]†Ïe’4üÕïÄ¯ºn˚›nÇ’å2x∫≥¯^~ë·T|ıê√˚‰GO(◊U≤©‘-˙RX≠˜&íùö@Ük%ÕÚ:8ºYORõ:∑cÚ¡≤êà„wjÈZÑÃ´ï/ú(‘!PÖﬁ°€,|∏#6b\N'†±∑Ω≤™¬m¢k˛T/Åã)éy•6ÆœÌÚ( ®t˚™Rû&•é>cÌã£˝IçSfø˛´:—9æp2î
ØÖΩßÒj*˜ì÷%«Öê0Ë£%m-¸ûÎ∆˝æ
	_ªQ˛XÉ,z[tVüqkÎó;vomÅ5Ü™ÊAÆxß[ÜyPËòP;øã—Ìp(c`∂®9ëÍtùaÂFÒ{E–ò{ é86’›/À+—Í4;ıaAˆ®H—≥4;¬_1ñ≠•‡ ËÔ~Gäxz ¨1cxÜö·r©Æ*wµ€µÀxähàfUê>ÙÉ*CeíÚ1f|œhÜßœ™òDÃ-§√x%CDÔ⁄Tä&ıëúˆo3Ñ•hc∆‘ÁMh/&˝q2Çu(VOS=‚ÛØG∏£∫eÉ∆ãÓV3X≥5˙ñµXn,£å∞ºTê˚$±°∏çî¨P¥W[l˜Ø˜ééw_Ô±A£a˝d tnSP/¬º¯úöqÅßˆ«ó›˛$…ú…ÙÉW˚13®^¶∏(◊ Û$/
‘ô(|qÔ πNŸ ´SV®òÿœC¶r’7ïsõxÜ<Ú*ÓÑtQàªmÍÒè(õ:¬¬A[Û¶˙Õã›„Ø˜wﬁÏÔÌø<Íú&√^+≈¶“ñWF3|gèœS_6µ¸‘V(PfÀ_≠',Æ´,H¿,øÒÆ"_áb‹7R~ÿ–¸I'˙„BﬁÄø¯˛*™î^(†Ö[>v √FçÃR∑*˘Ô>ÅU„˛ï¢âé%ÅZ˜ ªâ«†·,ˆ”Æﬂêo~Ña‘¡«Qxœ”„Ù9∂∞#⁄Œ?∫°]»j|,'@êÔë¯Ê¶—NDÂk˚jüé”Ω<5]úÿÿÕ /#ˇ ª›µ9Eë!ãˇ
∂Å|ÉFë–>á˝‰∫¢DY¯	_ª^ˆ˜5Ö∏(˘'¿Q)Ë¢«¶¡~&ÕT¨·∏∆i¿Ì  kfÜ˚–ä∞≤JÁ¥\˜A®)ç@üïñÓõmÅç¢Ÿ[Aè¯bº≠˛™t'0|ÄJoL˛~ÿe\˛¸CÖÌ[—ª(A”j˙N Ω¥ﬁÓ
¡%Œ1Z AEh|–∞YÎæè7∂üºu©2πŸ˘Y{ñÛzBe«~1!ì·Ó&y[=c¿∂=F …ú¿)€{±ª≥∑uºÖ¸n£W∑Ü⁄<ea‡ 6n<`EBÊí»%Ì≈£4…€òÑ˜√ˇ†àm≈N1Sì˘‚ã›ÔP^l‘≈◊î0£`®\¨ú∞ZÁ˛»ã¥?F`™9C7ŒñÔwÇ›Å.ÄˆãïΩó√˙†õ·K#Fû°SòaQÇe¬80ÑòıÄ†≤ö≤¸>LO¥Öm'0å«.I∑¡˙(è|êŒµ}	†–zS2˜{úπ≥nÊ=Dä◊6iKHù»q˜∞¨§¶<A)”°‡ıÔ†].^1≈¶+àöRLróDÜùﬂ„ïÔ'É<…ˇ?∞œú¢¬◊Ô,{¸^ngxåÂŒ·xæl-Î6ûK¥®˜q Wç£1úÅàË1 ı|˜ÊŸÔ0ñÄ˝Á˘¿Eá6xÈ8ı÷ıÚ÷∆Øá>g:¯é¯C·ßÖ&•Ω£˝#≤=π<üqˆæ…IPÙ‚äŸgl»kÈ‚«√daPVÁ4K≠˘Ã>œÁ€ù…e°
hœGÃ_æ^Æ§†h(ıÉ÷∑7¢°u}ˆ∑Öl3πà{oh¡ﬁ∂µ\,£rI5nB¨#9æ7¸Ë\W÷üH¯7 O∫7Q¿äƒøùOkÔMÑï≥Y#◊ÌN¸õ÷|“y@2ü"
™¡BfúÅ—zl≥Òyñæ„ã≥y˜»F§¡µ
ê≤a‹xªÿxk~fÄ`¥±Ì‚!á˘Èq†≤ê≠Ô¢Sø§Qä) "∞Ö@¬ŒÈ.œ”®Sô¸Í¯ŒÄAL(cê¶ÜÖçaia	∑)ﬂâ˜J€Ñ†z√©ZNæ‡‹¢™]‹‹$≈˙÷µÖ\{B.≥-eïy`m¸üuñ7#*‚’ı˚H≥\@›Ÿ
†NÚpÕÆx5ß”ù4ÆJ	Z˚º∆5ºG_Ë—^J!w†w`◊êH>lÆY7wœâ)àPÀÊG]⁄è;1ﬂÍ∏„QPñÊ⁄BØXüßÉ∞!}@|>å/‚lår3ÚÖn$d‰îﬁQûFÕÄ‡2”<O0”Jj*Y©® èi˙⁄¯T∆vÇÂ$\$Å€eYÙ^Sõ–˚º	Åiìa7Káââ≤YÛÒH¬ö–›tqÅ∫’‚µﬁæîå©ƒ“‰• Å>
sÙtÀ<èŒ8~N¨›<G —t˛∫√^¢c€ì¸πÛ∂—™ªC„éÓ€p’¨¥CsÇﬁ5—∏¨eÒ`@vqkÄ•'‡¶™IªˆZTá{{ù@\ë‘wlbYáÆÁ¨Ï&wzùfÁ±±√õxlÃﬁ˝‰-˘…[‚≈º%~'…’®ì¿Bä˙}ÓG…Aø≤…V(«˛æqÎı•»öod]≠-‘Y∞‚ﬂ…£”q4#ÈY`ÛΩﬁ“ãÏÎØ◊É&ﬁ≠≠;	6â∂∂<D$6YDê!N|_ƒæµ¨5H#nI+◊í—ªöÄ†vì•BHl–Ëï‹à"c&π¨N≥4_’»YaÁ&Ñfr˘Àlã
åK:Ú<âΩú~2A†¬≈+â˙8áh›ø<d€†Øá˙Im·LÂ¢ä|&/ØN/¢Öi@Ò_f8…Ì◊Ç≈¥FÇ_lÓÓ"8(å˜-+ñiwD£o¸µ&°˛•üº {Ñı◊5wöüÚx z3Ch9‘åÍÑPg0]®÷0w$0bÃŸgÈ√¿Ïn âW`%Ô–ÄÚ6áÑ«ßUs`Ó†~ÇZŸ`Ö6…ÃÉÄ§fY·ÿx˝ˆ≥ë|^∆Ô¥˛Ú^ﬁANÙ€Å)’F$® 1Û£ÕäF"£fÌf0ÑÿüáË`C:8†å@áGnt_ûÙC#Ö·“§CÜçÅ)ˇ]∏•†G<LÿÉc!BüxµíQBÚÄ˜Å¢pﬂÆ»›Æ“/nNM
d¶(ıÛ:¿CﬁWÅjC%ı•Âè«u≤Î'¸JŸé\gé“:ºﬂÊ¡˙)•NGgÒÄµ>i◊áÄm,—¿Í«øËíØ|j„ïèñ9^Iï∑/næøÏààóÊ·‰§üÓ^Æ≥µÂê:-‘ÎãÍ]Kw%b¸ °U¶Ó+5ÄØD0–ñŸ'Úü∂ öÕ
ÿ™¥≥ç◊Çvu®Tyf´HNç÷K	MÑi„r|É^mR∏Q.`ÅUná)êàÍF¿∏Ô◊Ûû@%`Ü”§Çï}Dsuk|≤LXhKË|ÖÏwª$e¡99%É´Rö{ûp+îRï]π’ì¡u≠às–ü‰n´Ï [\!(ø-·D®Õ´ •6àUaÏø7…céã*∞√¿+≈˝†coñoØ‚÷õöıeWH©-- e∏†‰!^.Œ∞‡ã´*êà~.uÁJ;ÖˆÀ:òµ
uZYÂ™v˙‡Z5 K™µ° ≥ø.)x⁄@ ˝mî5˚ë»±…»Måë1KÁËŒ‚qñF–7¬§l∑~3WÄ≥ä6KÍ¨∞8h$Øò∑ÆõY»˘.IﬂáIßeh∫Ö‚íı*°∆Á
X¶ÄIK_„¨≥Œziôb_” ö$ª†Oì0µBnû:-F»À]ìeY@]»W6Û3Ñ·†ñ]Öñø‘’ÅœóºÇÖLµ‘jÏ*uâ!eÌ⁄˙a‘⁄"¬Ã≤ÅÇõÀø‡<åDı˜d	8¶⁄∑	Ôï®éÿπà§°0∂z h2Àó6÷ì[3Ò÷
+lÊ⁄˘T`=≠-õ©CÊ¡„	Õı	¿J)ÃˆÏSAb›¬Òô’È„‘˚¨QC¶DÅ˘ ˜ò˛ﬁÆõdSzÛ1˜(∂∆“˛©‘¶çŒ¥€s Ñˆ 
Q˛30Ä>Øvâta£∏èTŸ b[’?«ÃüÁÅS£⁄ì ´í;µÆ Ú´F∂d€ßÅS¡X?Ë=¯B)Qg!^—Íâ/î¨ÕóÒã_wœ£ãòÏ˝5√≤◊9·bt™ßå’⁄åkFt'¶ãQÜX^*4‰°J•◊U¶%aåe„¢{J¸‚òS¿‡]çΩóœ„$KÉ\€v}4:z9îû2k6@MÄÎ≠÷=ËJnA≤ﬁò<'p£lKz´Ê€Å°ZüÜˆ`˛ibÊ#›ˆ¢"®12&jß"?©I∑R%†ÖÕªOı‡ﬁIA5 œE§=≠π94ˆ†=G˝)ò∂™A|ny!HÆ„Ø¡x[ÈáÀZ\ˆxZk1}fô^¨ìıÔdµ–$›ñ«KÇn’M˘.”≥Ÿ‘>¥Ÿ"k’˘%Öí‘÷Å1–ÅAôÚ„cm ‰f„m›¢\àµ∞[M@Êö2`Æ WNdnÛWH≥∏∞äæ¯™?Ú‰ır5Œ.ù˙∏ÂƒGÈáåç6+9Q"l£0øÊ¡i¯)À0&˘QtÛBÛ¡+•Õìeî◊(ÊÅy£È@6‹*)~$“«ñTjÀQ≥IR¨ß∞qì1–›62áﬁµk áYåÛFÒYäπËDB;œ&Q÷„ÊÃ¥Æ®óÎ”,P?¡ì÷`gÑpÂÎvΩ“6ïX›ç≤qîæÈ≈X9õD˙∫ƒ«≤ÆëLv<+˘1ôEÔD°Î¯-|Õ'Z-Â äÊ˚qÄ3≠8geÁ ÉU^	|/a«Àóù¯îµVÿgN"r]ø∂yqBóMV˘)ü:≠ßôπ˝n›fßma§¨:kiFÅ≥„Ë!§¥ø˛§Qîˆ4«pπftáqô^Ω¨ÍYL5{ËÚÆë¿¸œÇ	ƒ¯FN±‚rû1uä4:’≥∞+Í ïÉ'ù”íQ Ã∆L∏vØ◊ôóë*B∞‰NÕ+Ï.,,L¥◊P§ﬁ‡q∏„àS“V¬€qπ∑^:m›JìßèQˇ¢Yâîö˙(°Œ-5\ƒ®ä:ê&@Â¿xÚ”Ü^rCSúftñπ∂¥ (˜∂Á-b√[¥ó.l´QÛÕ‚É˘èI:‰qÛ˙€ØÂ&0/ÎÖ§Àx®fJ|Æ4I´È”à¥ÒˆæŸªÀcM•tM†iÛWØª^˝∂!Ú∆∆ß~#¬5 ∏Á¿PâEÜ&≠ÎaWx
-Fó¨õ$ ˘Y?†<Õ;v˜B5–Ø°]—≥,IÛû4P⁄÷k†t~∑bπ¢µ7ıàU¯ekä+m¡!;ùS‰%xd'û¿Drê˜ CøZ\´f8∑	BKíEK—(K/ìB("Mn~ü÷∫gbLiπÁÖÏjßqªIDu‹˜Å„ƒyo â3Á€≥ÛÒ™eX¸Ÿs‹ÉŸ√ˆì"KËûﬁ I®J¥¨àCIxA->häî^R\Ò`xóüœÍµ÷Qf@ﬂY@	âQ ˛˝ﬂUP∫a˝À‡™(’ÈTïf˘,>}|ïwœ„ﬁ§?„SœB(äZ	ë·‰;±@mõz\˛JÃ)l3…èD´[]ìÚÒpÇôÏmô∂Á˚ΩOPùU»C¬VíÇájîÎÄ˛Çv˙'P«û¢ ˝Á∂Û√:>Ï?6⁄&¥1—,ˆÔ Õ[W ¢ ›ÎÏÏ˘Ùàë√8˚:&o˜"uŒﬂËX?>ØÛk¯uûÈçœ≈˙áYEO*	≈!¸◊`ùzÈ™Ω‘D p?‰KÆ-C<ø¿¯L	¥£√◊|ÚÒñ∫(toÆ∂âÏ⁄ƒ+Æ⁄ƒT √pIMSûXQˆµHYd¬√#‹Áåác∫#®+2nØä(H2Í/&ûÊnù—õ®^R|π+=UW^˛CV}O„%ê@>HA@Ï{ÍÜø¿èyÄ¢ÙÕ@øå«p~˛vÒ’ÍÚÚÎ9G≤H¨ä≈óV∞F≥7‘ãä‚yı≥ïhummÌu]·›Àæ¨#ª
_©ºb4Ñï:éì!;çzÙÔo”t ˇb∆zoíE¥uV*ì5ÛÒ˚>¨ûíï“·◊%ˇ4’X©˘£‡™^ÓV%zUï¥≠?∞*˘¶Q‚÷õ·S@s≠!Ωuõû≥˙·ÁVÚ˝Cõ+–W$õÈ≠ˆ8µk+_†®ﬁ◊∏ C0Dÿ¥|Û÷%NÑ¯ôo7$Ÿ®ÇL[Ñ!Ïƒ}`ÈŸ≥,†Ì—∏È+√Ûu◊™F‰n¿∫Ô.f[ç†)&‹ö˘4oü«›Ô∂ì¨€èutDˆ" ∫2ÃÄ≥ÈI<õÈÆÏ“T5BñKM\“‰ò»[n†’ª§‰∫F	ïYi3ûæ∂pE ¢r¢M5Ê)Ös\g∏xˇJywß+¢çp≈ähóöÃ_7)W°Ãx∏S:IiáÈª€°øK ˜¶–Ì•‡ˆÊ4Õ`∏Ü .∫¶Bz´ÑKÍ 5Ô´`åWe
 köIò◊Î∑a
íBâ>Lµx)ürö¯∫Œ¯?MÜqO©ñÑÆ¡y-ÿÊ≤;a‘≥X±áπA£!0ÿπ(ÆœπÇÁ1§>í¥{÷o+ñŸºr"ÛıuÛß^zØng÷$ÅÕ¯x3s∏Œ ¸≠i∂äÆ◊ùy,`&Îådõ*#ﬁ∆“¶G«Ï•›	æ§„ﬁ{◊-çWWÊñÚL=ëı1Õ>ºüö¯Ã¬ÓÍ¡˚)Ûu1IóˆIM˛mM“m≥‰Y·X‰€&Ωÿ£∑∏¬vçß√ìd]ô±fSµSa8˛Øb)¨%éÇ‡»Â‹ö¨o+8ÛÛ¸Û(&Ö:≥í«ŸE‘Mcw∞ák>ˆçÉÊCÀﬂ¸œÙV:¢T08XeˆóLÙB…ÎÓLn˛êÊm'±~ò)VF£¬¿ÜGåTdÃZsoOªÉQaÊS≤0.µ≥ß†r¥∂ûˇjÎoéÿ∑{G{OüÔ≤EˆrümÓ?ﬁ6”1ùÓ;q*çW$È∆:+@—Íä5¬ã(K¢·¯Ò\É∏’íÿT∞=,8ü4≠+Z©B›hYrG’˘´-uU–÷‘·øêëñî¯¶gëÿC	.p[8¨F€rçnΩéÎ‡úsÓaË4∫¯Xo¢C“»ÇWALzÎ∫WhA{=ü°w/Ù=ÖìÎ{é¸ΩæG˜ìnˇ¿5∑RLC!w{÷5K¸≥ôÙ~vÛß0‰Ìi«*!é˝5˜“´’◊⁄nR£KL0ö¶õAãEÒ≥“Ág=ı°uŒÙQl—ã&‰>_5s˝#üAôN6Øtì∆ˆˆp˜{G«á[áÏ`ÎT5rÅKL¿]^@Å_j øÌÛ≠ó7ˇ
öÉñ∑v∂Dc-•∞í3¿Y˘Ω],˛÷‚‚[ónÁ¯Ìñüz2P^l∫UüQ±MW≥eàÆ≤€.D·§]âcb”9ˇÀoˆéa˘Ï‹¸Îß{∏è˜è∑û„‚‹Á‡ùœˆ^n=ﬂ˚‡ñow_‚˙‚7–c;pOÛµ°∫‹¢˝π±D|M 0(ΩM∫›8œ˝P
'¸oŸLí„ŸHiw¸˛‚ºº.Ó¡â Öÿq‚rÎ¶Ò†}–íFO,lQë<Â·¯éì—â{xhdioB‚óq"Cãá˛õ]G=>ë¶„-Ú©G'≠˘Qqøfé(h~]RÄ#Œ\¡ŒÀÿAyq5ô≥ äU¬bŸ•Çu£ƒC∂ƒ^bU®-‡'œˇ˘è˜h≈|ã*}Q…∂áø¸øˇ∫t9“BùÎüâ›QÃΩ/≈wç˚…Ù@15î~¨¬È√{¿F&ÿ˙¯’Å=æÊ_Yˆ ∂∂öøÇ*¸^¨
Ó∂jÊ KÜ§J†≤Ë7¨ı‹&Wzç÷+bj8S‹d’·çvÈóNïs„|Õ2U Ï‚¨¯í¿…ótK;∆Hï5Ü·ôÆu;6NM`NÁkéûÖÖ©’s˛|åè^∑F{kˇàeÒY¬ë[@*ŒiwÂb{Â ÷Öà€#S%Â3|ƒ·‘∑√µ¨Ÿ≥µDsŸê¡⁄éP˜åôø¥3È8ÃàÜkZu πü´"òeüN¨≤'ŒÙùçÛıä*R†ãÚ
k‹√bçÛ… e0[8°∞"8ﬁ˘4Íù≈•÷+s⁄@ÒÌÉtò*2Û‹Êœúã,È¡BÉ]∑ø@ÒÓÏÓ6t∑Ö{Ç^∞Ø´	_ÿ+ùÀﬂ›-ú^øñÂ¡¸vRE.sŒÖ–∂R·Ÿ˜[VπtÑùÍ¸fSêåﬂ__2~5TãÜU1ﬂº5Çﬁ¢`ut1sFkæ≠Û)o{ÉûïÂ4L[©cÿÄ^#MÖ:h◊©3`†:˘ER’@˙NÃ ˛b74:|¢™˚ õjÃ™âHa¸T´"ÑÆbRtj¥\‰PU¬'OòÎ≠‰.ﬁ¥¥JgJø¬q’àx|!pÿ≥®“(bçfSQ∞‰úñ*∞éìÆ<ãój“#»ŒÏH⁄ªE3.9ƒ;U5k•…€F"§â≥É6GU–îÜZ≤ï˚pQg^ƒ4
Wb/Z‡Õû≠£Á´£ü≥\züê⁄}>>nãm·b#Ã°˚Ùû›©—ú«#Y#.’y$w«—f=Ùuû»ö\f·«≤©‘AÔÀºv8ËÅ7ô@¨´(≥ayº∏Á
Ì8Rv¨#òûv+˜§‹˚®.õŸÌ˝@…Ã˛»Ä´£„≠_ÏæŸ?‹Ÿ=$y£4™_i…πIØH»≈Øﬁ$\ÒûÁ[OwüΩJzØØÎ”L˝YÊïi°Å˚€)¶]ôUŒ˝€hÔzÇGú;Ÿ∂T|Æî†eß‘¢
Ã`ÁCimÿ¯6]n‘‹ÛDn∏m
ÙãO{Ø„7è®˛™AiíÓ˝)d!yÄkŒvy>"Úï£±±AÜÛæWπ	·∫™≠®z˝›®n˜∞Ñø¨„◊5øÀcØw¯f≠{∞äÿ„´£Û(ãWØ≠_Ms?öÙŒWqãú¸ÀûbúSGµoÍŒ5∑Üÿm€ﬂîÄo˘Àö^CÀ¶ò√
‚R®©}&TÖÉrGÆ	aGÀ´⁄•K‘ˇ6â~uçÛ≠—»q-X‡x¥ó˘˚ªNÛx¸´E*úm◊ahÖ…˙¬Ëäñ»∑ÎÑ%ÛΩ2ﬁ_ùleÒz”Oko÷Ìt0ä≤q“?w‘Z©™,¡Ô‡¿ÓßÔ‘U; —c2pîJÜÈcr0N·≤t≥ÃzÛdt∏ˇvØ°78@g≤{õo^QÿûÑ≥«Y›˚W*ÛGπäÈΩµÀ‚VC’‰-Â≤≈Ø´JEVu?Ü-è÷h˛˙uÊDuëXW˝hÿçËY˛‡"ı…ˇÏó÷ØÏµH˙LqìŒ£À˘¨Å·w¯ç2è?x∏ºpNŸ†è=\vÓz˜/⁄ÙDÒ∫À¸ÓùEá<»«A"–Û$‰/-ú	."'ò ∆8Û≈™é{"óknıP«[0∫dÀ_ÕmﬁøJTÀ$˛)$óqØæ5∏—OŒÜÎ#˝3€Áa≠§gF+ )≠ñ¸“∫º‘¶k.3¶√”=¯¡EÖ∑ÌŒØA©‡Ï›˛YNrßà›}ó…[n:ﬂ€Ÿﬂ>˛õÉ]v>∏5»çä_‚»OXtùn‚9ê•ò1œ~vˇJ,Ä^Ö·ù?Áiî¶ ´ñ`å2ª‚\Ú4$˝˜Î≠§£≈Ø£`ΩŒVVGó_1‡zg…˛zàQ≈Îuˆ≥ÂÂÂä¸Üé8’S÷„"Ωx≈;⁄âÎ5∆Ø
œä»:\Åµ‘ãÚÛ∏'ﬁ$Yq√eœÙkﬁ.ç6:$íWñó?)^ÉÍG£Ü,øçè”Q]Àú©ÊÏ™P°kjÉ®œîÉ
yGñæÉÙíˆLó_ï∫ñ¬b>&ŸYÑmÕ"–ÉÍWêÓ~Âöˇ3ßi:ˆŒ≥:‚U±∫∏ËB%≈ÇÈÚåw…o,y˜ﬂnﬂ&*îü«s|1˚SÚË^¡ÀÆ πë›
ºˆÜÔü∑%ı0:çÿV6ŒŸ/≤htûtsTÍ™†\Hó›ﬁqp∏ˇÌ÷À„]∂≥ÀvwˆvˆŸ€?
x¯ ©¿b‡‰ΩØZ1˘]Ô3ZVeOT¸VŸÌ|ú•√≥MØåVY~èô‘-˙K(f˙ûF˝ÓÕÔ”yãáûd˛Ó˚ñ.Ù$åºì:ö∏÷#∑∫√ﬂFïw˝∆@9+Fv~ÒæÉ,æHrbñj˝≈Ê\ÿòk;U9iƒQ˝”6Æ8˜¯ô‹4:˜G>êß˝D≤Öµ` ¿W’π±ﬁÕ=êù‡å<Øª—+‘ÃmMN∆‹ìXŸåG¯(~¨§¡∆ò–˝´B˙√ìΩä)-U—\eY¸H™aY‚^8ZÊ6πÑBÚ§ﬂC’@qéÑÎ˛ïÈıCô’3$G'd Í·ÓˆÓ”Ωù≠⁄˛†ä0ÉÓ‹øíö{~kˆO..˝¨ªå‚.ÔÛ≥≠Á«[â{X€]Òñ=¶=Í°÷—ﬁÒ7[7ˇÍÊ_ÓWΩXDYj≠NµÈïN≥ﬂø∆ˆO`3Eîÿ‹è0õÚ4Œn˛ÅƒÓÁ©‰¿[y˙-®Q—:{Sıôby7KF~HF©H˚i‘}Ït2‰qìm5ÌO˛›≈P¸€óÇî˜øuc…ªÈA|q+o]™ß≠’»é57NÌ–‰ë‹ÖaJ	∂ÊÜ)qHÉs|√Ê‡∏;’púÌÉâä‡m˚]nbú™¡iò÷D’çÜQ^$˘É‰Oâh‰m˙≠Â4´–¿◊ñ-gÚMó”/)ÂßâÄÌnMMˆYwîyy≥Ä˙ÈY∫eﬂ}ìı´:∫u«é[úYD=±9¡∂ÚÉ·YãvÅùLí~ÔY“è…>Øÿ‡Ï®±ãªoPÑ˙—lﬁë¡¬-¢≥xpº¢@€‹|%óÿ‰‡Â/>0ã@äCá~,‚"A8Nì?¸ƒ&˛2ÿßù≈,zßàYÙNßc;œÓÄSà≈mÛäùg3·züﬂq¶⁄m}XÅŸM⁄Ìr´Ñ›_õ•‹K	¥Ø^{~µ@‹N_∏sßÙzµú>´0•,Ü˚¥DLßØ¡n ú+Ç@r¥Wø£^¬¶fî‘1”ç5∑˘<A5˚9€¶\ëƒ
ÎJ—≥JÆÓ˘¨jvêí+\Fâï±Ω≤î]#rÅ$H‚h“ó!=>t˙m^˝òê∏Ö9(qV-úˆlòNıéI-:ßåµQUSGb"O@$®‰åq4Âù¯"Ó•Yô•»ì/í°Ö√sÀwÀ$∆{˜Ã«îeed1JT(Âfæ˚îGD°ygW·´Ñ“ •é¶¬bxÊﬁ†W\R(ÂKydX€Âúw´wæ“>çsÉÏıSS)¿H)y»VK∑+ˆ◊›`>ï∏jôÛ=ù°‹Ω·›…{úfºÆC74%ÌÙÜy∏æEºp≥ÁGE+-
H¶Ü¸’Õ˜îŸp[ziçS¬àE65éÑr~(z"\1ï`Ïäg.ıQ$ö(â•únIFæuñfâÌHkï/ÚëZ∆ÃL¬lf¡ÉÏ„ﬂ6ãıD¸WÅ%®!∏“è¯'U+¢Ë{¥ôÚÛ…ùPË∫ÍxæzetW]3?J.I¡Çó¡_{Õ~y8œÆäùx†óœ„$Kïßv‰•™ÁåzÜÂ”€ºz€ïfCZÂWÏFvn˛»≥X.É◊¢4ƒ‹W «RÙ˝†ì∏¬◊÷Q∞ªÖºB=Zÿ0ãr*˛Ó|A˛˝‹à@$Q¡›¢ÑÉ€Í¯Ù™pÈÅ ï.SÏv€Áñ∞êÎÕ\'áB®Ï¢}–ã™åyˇ»∆ºw6Íöw“˚@îeq¨+é£/ô’æR≈≥¥£dW∆√€]«Ñ4Üƒ≥Û4ªÂ=ÚÙÊ6:˚òcËÑ9	∞FLÅ1¶,Œ‹jÙNCx ˝ó÷!cíﬁ>ÁÇqf∏kS†'√ÒÈÊÂÅä®µÙøå˛*–%å$√™W ïö’nyüO©àÌ≥Pú8'^Øñv◊„πó† UÖ.0ß‚hbÒD’4ák-mmùò¨24˘Lã∞å’Vò⁄Ã∫ëª¶ÎXeœXAÁ¥U‰H¨í$éWÌ9q‘	Õ
]¸ÒËÒå»Mí∞n1~zæ¿Œ2r˜Cvw$wT´•0?≈8y£QZi0&K˛XdFTâàÀ¸pÇ‚OR¢˙ôπîX∑§Gja∏u»|ı>?
R€’#´ÓﬁO•Úπ[ÅRΩÚÛ3á;ñ¡¢¨Ak+ÒxÜÿs Z∑Î<RÉU”3ı	•O–œ&˜ævas‹H}…Vïf¢˝ÓLëü´€í˝ÙÄ6TŸ;‡§:ÈÁÁÎŸËúáOZ3KÁärkÀfU£fÅ≈ê§prñ√xÄol¬WÓí≠‹_)ë‘ˇ)Œ=xÿÊyYƒ»“w˘„´U{∏BZÔ√ÌØZéJÉAå@ÉêﬂΩ\/ùÄËe#bÆd0åÿ´”eI
Ïæ8≈›õ?ù&]∏èªùJƒÒw*B0É¡@	!ØÛô,FEQe0SÒú¶b˚ùòMle9‘b¢[Hö∆RXí≤o¬]ƒr—]ﬂ⁄÷A@®€Í*6ÿ›8+π=»Œa?ViÏp§–[‡ƒ¬Ë!<Ó@Üm’·Æf…ﬂÅ-ƒ4–6ywÛ<bù¡¢ˇ;D}gÿdP0Ün:(ÇÿE2ÏN˙ w @;| •?eÍgÃ~}ÛΩ‰*ÑŒ	À4«–y√XÉgìa“G°nkå»M§™vLê0ÎŒªL°¬ † .TŸjúñö!Í≤¡	ˆ*Ë˛Èƒ[„ﬁxÜË∏2*P£4:oÔgÔ;›¥;• ◊ëˆ+ı—÷Ø∂ﬁlÔÛÚ¯poWT5Ô‚}]jìî=”ÙÚªﬂ1ı°WÀØk%∞)d›>≤¯lÒs&]ƒ A¡\¬¢v›¯0™GÜrÎxô–Í–≠¿É“††8%8(˘ß™€9ÌGg◊LﬁZâÂÉÚ‚@y@|<äó∂‘(:µFá“W«A©”D¢/◊ÿó_ÆÆ≠-Æ.ØÿÓÉôÈQ\ÀÍ∂qjï+gºA ÷Ûá≈q N1zvù\@,k`Í$RÑéFgÙÈí ¸ßz†tˆÅ›YΩ$«Ã…â/ànpêX+‹!‡…Q Ä≈Yª∏îÓ t7IÅC:ÇÈR!ú˜'Yía&IûZ	3îÅ^]\óòIª€Òí›ÉÂo*…Ã+Îñ◊$>Ò¬%º…/«ÔŸcﬂ£
Æ˘ï" ñ'ò2i!ä˙{yÌêDwÃªÖ>!≈œù8G Ù¨d1F.ÇÿÑ7œ	Y3Ã òÊŒ
2ÒUÎû` b!ñK	Cçtﬂd+89m∂2k…'ÆHöΩ®Ám—ñ7Ád4jâ3‡˘ı∆
öwaÓ
” 4¬Rà[Û(+Ç\;â˙ÛÌk√$/ä»W,kë˛Ù–¯÷S^)ÅSã◊:ÏË:wöCì∑Ni`ì∏⁄:ÏØÅ(î Ë¸†cÁoº’∞Ôﬂz‹£,Ó¶vŒÈçSé[8Ù9cqﬁ!tpUŒ WÏÆÍÂ|¡œZüPûäô|[ﬁ{xø}_„–˚Ûﬂ˛;»™,¸˝Y¡—?Éø$´òÁPTMÍezëä—öÕΩ•óPõº∂yﬂÊ< ¥Ä⁄õSÚ;=Mõg∂ÊÙ6~+]‡∆X‚äÜ∆u!FLioæ–´*Ô®O¬tY8k~û˘<ÂÜƒΩT{ÇXÖ"	?‘ËØkô–:∂$ˆ'¨•ÃìS_¬Öíú·Iî2Z; ¢O këµD>›Ëb‘¬dÒEê¬Ò
sÖ¯‰3üp~@zNx}º∏√ˆ= ‰Æ∞ıËl¶E∞fá)€Ò1€ÈMÉI/Í8Åºp)ÌP˝lñ 6Ûõd√8œc∆+I‡wiÏ·›k˛Ú˘∂ıˆı ÚÓyƒNº˘#À” ?	¢rH_Î©£t :ç«ëß†Nc‚(π6ò]à4·T[\“B∞‚‚Î‘ñ≥≤?OÈI4ıﬂ„€eOÆ7Ω{¥P	‰¡Avk-¡%…≥Qpıπâ‰≤ø∫Ø€≠R(Úë†_≈ÒT√d÷:ÿ˘$ÊÈI“è·‹ˆ›8©_ç¢jjUµ®+«∫YZÕiNv>#µœÚQS®Ú˛*È›ÖP/Æî§
ÌÌ§µ&)H]ñ˘ˇ  ˇˇÏ}€n$«ï‡ØDˆ∞®·ù›íL˜õí9VãTìñg—h¥íUI2Â™ RfU±[4Å›«}ÿßY`Å¡<åÊ≈∞ø¨1X¿èÊü¯KˆúôëqÀ»¨*6€„l5´2„r‚ƒπ_B?l•≤ú••É2„4@>Çkú£ˆ3Ã-u¶-3ûÈ…¨•⁄"õn`“™-/£´ÄÆî&Ö0Â£Î\A^ìk˜X‹ﬂ˙Aq1{≤ı®ô†ïƒò	E#K›ÓPà™F	◊5F˘J:(Ç◊
‡Ü%¬ÁßJ5¿*ÔŸ„Ùîe
∫ÆMa¸π˛ﬁ0•WÌo(>ãP4t+˜*Àµ7◊7e<P6C1"™∞óï∆öu¥ö™v≠Ã¢M(πŒyÍ»ã9™ó?yügE&ÔÈ¨¯ÇÔ¸¨x(7ï◊®=.K.=àf_O‡4P H≥Óe2¬»•å	Z]ÄnP
aÙR=q1XgX◊Sl°I1¶*˙Í—*€⁄Ñˇ¡∑7yLpg‘;˜π√’»]/⁄ºôuëlñƒIqM∂±"~‘Eò4@^Ï«aÎ§πæ:WÿÖ≠C6~\«ä ¨^˘ﬁ,é$>¡AΩèáNÒ{Hòo`3kBãüö∏‰07ÍVC*t!˛s#ù±ä˙ÎgŸËÄ«©º—Éä&FÜ=À+ª~Æ‰0>,säDUƒ0ﬂÀ8Jrn~≥ø∏+_$RÜÔ∆ﬂQ’GåvëJ"æÆΩ=Sﬁ =rS e‡#˜9Ç„…R/ÓV·…™ã;ÄZb'Î∑XÀzπÊÚ…G´õÙ∑¯◊OÆ;™>ƒ>bõÎ?+3≥7WLÉß∞Q7>ÿNiRªπ€*√ÿåI¥ôm⁄õﬂ˙iv ƒdäÅ’Tƒûê∂‘—!/6j¨jeÖm`µ¯öÑyºó“rf®U#èRÂóKﬁ;§‘¶ò≠y`∂ `j†÷Üb“∏BÃ◊Úl)»»ÃÑΩ#U◊0KöåA3Eï√dQq/ø€QC%äêw…|›U«Ã)öOitÑÄb/óÂ÷Ïœ˙Ì{ÊKzi,ãP ÇÛÆf`úÕx∫¥èpk„©&!ÑGﬁ>ÿ“ ∏’m÷sØ7∂÷B^⁄‘É ÓÅW8f¨óß⁄t»Q,Z]Q=MZ7wp∑»A`^ô;º0∫É!Ë¯…Y˚¢ÚßV˜å]'√|“?O˙˙˛›G†Ω8„â∫Qøãùí∆… ˘! ˆ”lÁáråN1⁄q‹≈*ò≈ﬂ_Ç3…"`i1‹@•ñ ˆ≈ÒÀÉììΩ£7/ø:|±SX∂NB›ãdòRlÇµ≥©DøÔ√")ú¬û`¡œË?‘Èe<N(w˚#«ºg“.≥éÃ%m•_VuæUc#˙F£^ACîwΩ≥Œ(ãß¯À´ııu¸˜jë∞åﬁˇÁ ¿ıaz’Y¡,`Ç),uïE}^±}ì›º÷ÁÃàÀiq¨|ú%√ãö‡◊·k8±Œàæ¿î\Äíﬁä>«Ñ˙Êös¨≤Û$Ó„Ú≈jóŸoŸ2_-%$‘Ó2Æ{0j∞(4_î+zB+Ç3¶‹£—*{ESæﬁe"«s§,Xm3Ç€<∞bÜ-≤Ì–ˆ†›ˆ"g§@¢€ˆ8Óﬂ˛ëÖØ.ï	AIg‰cÄ|kókØ>y4Ω|Õê‚û˜Å*æ[CL{XÀªY⁄ÔüEf3´Ú,’Á%qYQ!}ôˆA€¨ò¿ß5zÙ∆Bërë“YE£:t—i•Yl’D^PÑÔ7p‰£Ïˆ˜¿™@˙Ì^&= AÕ\\Ö“uœ]˙#‘@bÆ}?IVÜ 1ûáp`^Í$”î≤‡`?Ω.»¶Ò<E_op⁄¢Â·Zyﬁ—bŒÈ&KOè„€ﬂa,À4ÈÅtΩÇ˙Â‰å	’rz8õ Ω7é3tØLïc})∂YOò„˛§⁄FôÌıíní1‰ wlﬂî+xœï∏†rx¢§¬ˆ¨Ÿa¸ï®¿MΩÎZoÓ&=©i({\‚’tµÜBãñ∆ÿ∞ø-{¸u9ùûßë…U%≈ÕÁ9 ÿtÀY√•íz!	#DI«FÎ‚:ﬂòâ%WÏå®g|¡WYKeMÔ¯YÉÏo#˘DK`Ω˜»˘:∂7ÂºKOoˇœ{=À=íA¥£‰ÇI–I2ÃﬂÏAÍî£/∆ó2§›ëÿ≈úÅƒ•J \1	±◊ƒ¢Ù†?Õ¢¸≤HÚx»õ–;	#}Ï˘w.öi ñ⁄u!°]X\hMXØ˘8`AÑx#MIUT(⁄ﬁ¨D:Q+x1ìõ˘8≈7‰3¢
k√ÂìA*ÖCkLç}S÷à+KJ∆'õ≤≈ñ"àf4o¢•^7=¶é¢¬NY≥∆X:È^6˚.%DÒ≤FYÎMíä; e#Õø§ë‚¸~ÏÔˆ`Û·L*ﬁ≥¶° ◊ÌÚ/ˇ∑vüˆÎÌ∫öJíúy9’ÔÍz 9ÈÇÓaZ{ZØ⁄àöáYóå5Çåﬂ0˙”ÚãÃ=êYû^yõÀÆW∞,J“ebäñÅàÂú±¢Ñ%,J
çªò)<*ƒ_a;≤ò}d/kL∑PnLÌ¸Õ0zùäà™aw÷^ﬂe∂ÊBóßzÓˆ·¯¿OmL*ûÇTFÙCßs&™«ßJ	ä_ÓäHYâ‚^·óﬁÌA£\(áÊ¥Ω«ßK@O√2g≥v9,|±t›òé=~¬6◊77∑¨ùÛLj}ºj-¡ß˝∑a'/ÿÛÉì„Éóœoˇ◊˛·ëËn7túßY4`JcÚ	¿lÁÉî”l…Aç˙#ÚÉ.¥v;‡rûo˝ˇ˙ÔLE.Z;fÀP≈ªÅê´`ı∑ Æ∫ôf¨z?Ÿ(ÕÛ€?N„æ{V2ÂbVnm$(yÎ·fuènn	'c◊•€≥$Ââ?√x¿∆)RyÇ›ËæŸA√“ﬁW{n7°Dß§°¡,†›
6h)HŒ∫ÓgW ¨x9ûÍŒø“LJÏ¯6:+Y ô?,@üôh 6M≈ì¡¥ß€?b≥!¿:Ù¶iVûÕ”(tOãnÍº^f=;ØÆ&Œ◊Ó⁄M≈îÙîOéÉ;`ëÍWjÅ]jk ~âù≥ÄΩñ]}m'≤Ç#Ï§6∫≥â—™óûÅË‚ÇPƒ¬üá4u˜ëéÅﬁL ©âƒê˘øÀ/ff#'&%ô)ÀØQÅèK¨>◊Øú©,Ú w™ójú˛◊Â5Ì˜zΩbÖòxÛ¥¥ªG)€è≤,^¶ŒHâ⁄jëAÈ}pkæüƒ„®ë”]¯Åx9ÔÿÜi‰Ë¥`ÛsXû”‹úÚ∂2U2Â.≠ÇydëΩñG≥jÊ”°Ö¿ôVú≠∞‰w!‹≈ﬁ®@¶’‹_≠ç´<.*b*ﬂ(é˚V¶ck±zsá“æ›|É6#x£˝…`Ñ9nœJÇÉΩÿ“ﬁ∑O∂;Zx≥±Fé<xﬂ£ü£PÓ‘ÁÌêzUØ∑®MôkO'púnwıB˙ú≈]$⁄ ˝Œ2/	Ö5öñyÒÅMØÛÎsV&oYÒÂÎbøW®L∏a˝=¿CL‹/ËÌ9¬°U’£9Äa¶⁄G<Msa⁄P ™K5Æ≤‰1©=Ä„tˆ\$—XL9Ì∫dﬁBàMiuAP¢vÙ8*3È€*Úù¯)‚çî|~û≈”ñ (Ôò‚ÇÑ¡í_àÁI>Jádâ´ke‰$Õ=+ÀA∆YΩ˘ã≤¿µµ«?rªƒ∏u¨Jy$‹ÌÖŒ´Ø6∑‡´j2ÙL·±√,
Õ≈∆ [ˆ„$´±∂Ñ¬U4¸ç∞[gÈ8"Cà¡Ä»ÂÔï¬’züÄ%÷ØΩÑ2‚ Ú{ ¡q˙Ç„,dÎ≠6ö¡ÁZ∑*iëôê≈Ön)åM⁄‚ÿGÃßÍ⁄“d™√}$á/)›±ç-2@çüÖyîˇÍüXı)âò3°Óx≠≤¬ö15÷ìÍP"G±≤„ç #∏!Xy%ÀD˚ò∆;ÌÛÿÁ–h~%ä8;øoﬂÁDë◊∆Ìxª÷	smÛÔ‘xà}†Úπ`⁄¡≤é1kDƒ\Ä’&2¢=∞;cIÌä€ƒ-?p⁄XqFñﬂÑx$gvG∂ª3˚"√ëV„øô◊¶›|±Ái;¬i¯%€A∏ë«RÈ8;#Îˆ∏$5DmÌ˜Âz<ÊF€√®ØMéêVY%j°0Ÿ∆}…µ7∏|∞¡-µ˜ÿ'Èq_›ódah{oI~ˆ0´·íîØπ€o[ﬂıˆ¶zn{√—í˚˙€JÂOÏKÂÂ˜’™-FÓ∫
áó‡ëÈtÚ8Ó=\nK	›≈∏ î\%ó„¡·?´qà˘<bŒ@Ã“◊ok’⁄¨∂(>¯u“_6iJ˙\º3á :b¢_∆ÔûßW√ÍL◊,9G’o‚w|Ë$≥À+¨º–Ç«=º”™ΩßO‘¸ÊΩ#Rô(uáxd Àv≤¸"∆ö≤±ÖøÙ7É.ª¶Ìl9»=áË:¿ÚP¸π›æìY@J∑÷)/‹…ΩsØú‹eTäQ¯Ø|'`"ü^ëöÀÔ˘+≈37y\±'∆à∫N«üº¨<)Ê∞?ö‰dbÉÏ<}2L∆ßÄäªhŸ>∆ÚaæÙ[•DDïHπz¬_‰)ºä|,nˆÍ\≠≤ÀU€àb˜˚àπvéqø˚È =¿ı –W\NÔïùƒÓ˜ø‡·îï∑/ÉﬁFÈ>p0¯*^b®†2úÓÉ Í‰|:˚Äh±˙UŒWC€ÜˇÒ,€∏˜ı¯ù˚•¢∆äX¡Gº€Îä°◊ Â9N√j§+ﬁWåt|èïﬂ=:G°ÅÀWx¶lﬁéÂº‚L4∆(ª≈	è·Y˜ûÏÛë˙jŸÿgR-ø˝-3ÕØÏ$eYºñ'√nñì8©îƒ.*'èá§LbãíI>5.ï]^AÒAÇôNÃ¡—pı©A	Q◊^<Jìúaÿ<ß≥´e”lõEÜÅWEEõ„
Bæ!lÀÿ<#„e?âRwpp¢‰™®H s≠ó`ÏéÏ!&«üé0r—ÿ◊àùf«†–6°ToYÇ“ÍTdø¯<M®É∑v…oè¶1hÖ∞$˜⁄ëÆX˝¿SO·4”…∏£Í`ï±:˙8´ñ√’ÖKm$cç´÷qoW·ïWåiù÷y{f≠ñßk…ß\âAÛ@USÉYáhbëHπ)çö¿˚ﬁ)>ı,ÈàN˚°;Aiaê$ßƒºa$§Å‡DµÜP≤YÁ n+Eyãrõ∞aÅÛ\8Hûjÿ—Úç„<∞T!àTCkkMuÇÙ∫"…-:›FìèÕ: •≥≈·)Ö|nô
±P’èÌ¯f π[}~N®g©cïÈjÔBµ ÅP^?”µ!ÍzS”jT=YuÑ'7 ”„w£€ﬂ°%e-ëØ¢‡qE>R$gé~úâ]Ï˙A”≠˘”⁄ZªÅÎ¸ñ3∫zgÒı∂"≤r⁄:gÔbΩΩÌ›ΩÔ…ﬂ ∞Îf)‘≈¿ﬁ;ÈËQˆ4…‰Z≤Ãã+∂è €O±Uöº≤Èo≠RgAΩƒﬁ€äOFuÿÜ
œ2ß2'sœò.VÍ§->˜ºÎµf≤âï.◊3Ÿ˚CùÌª“’ñƒË˜Ö†Jt<˛ -tÕ:æ~Pkx÷>`q•d°Ç‡,EowÎπ¿‰)ˇP÷-˚Fÿzá˛xÑ‡æ?≥FIî“8ñ„√Œ–ç ÒU?5æÒ·`[ÓgJÔAòA¡3Íµ\}ÕMç◊™U§¥ªt–‰ ªj&ì6N	õkß¯(ávµ∂˝êïˆåGæBS;fY@ÏÉ$H(9ÇbZj+™Ò/éM∏Î	⁄mZ.êÕ∂Tx–√ÎzT…è≠·ö3D©˜ kö˜ÿãÆ©ﬂ§}4-˜ˆÀn¡e¥ÊÃæÂá8∂å∆io2ƒ†Oﬁ=∏O¯†~hF”ÅÚ”ÆH£õ∏’¸EbZ††ß‹=wπÁäÎQ˙ Ûfƒ›Ïˆ˜y8ÌÚç∞âsQ_π˝ëﬁ…QbEÂ+Õ¥f«)ÑäLˆòµäIW=/µèk“É⁄vTVﬂÖ:§ÒÖB{y•[4òpc\®’£?∂%=	E”HfaÛ÷M7Èc]Fí]E'p^GYWË.fô:¶=l´=ÒÎÍ#zŸâ·4Å˝e†˛	]	¶¸˙2Á{£ëΩÍDìöñÎnZVïÈ=’Ô*ö∫∂Ûuù‚,ïr1/€ÿ—‚Ö˝„GFÔ€Ú2‹~ÖÒ<˚QwlÕõ›}Úñæ∫˝3Nääh0Ì…J NÁg;+Ïg¯Y√ˇ”üí_ÙÒ%‡ops¥_óÔËSXèπç⁄S3Ì`qqÙËÅ~ämWR6 ¡(
≈ Ø!èm°(CËù¢¨&Jœ˝¯Ö$∏Ú√n2¢Ó›†ùÿ0Dıˆ˜X'Ù™R¨«≈$ z»ïÚ€?°QBôëû“±ƒÄﬁñÇaˆ»ÖÏ)Ø√≈SéÇÑS°FÙ«$kW3áHe“VıCV«Á4πáÔÿ‘í˚ñJ¸€kë6≤…º~ï√…ﬁ˛π?NÏﬂ≥ô[jrÙnó≥D>áÛ;;È¨y∂Û:E·(yù™<4	z>πå≤∏Xô§>7O9=Ît∆è¶I|ï/|©≤‰L˙kﬁxÊo¥áù°Ã
£¯â±2…Ã(ÊAo∆(Êy; -%ñöXŒ≠±ØnÏC’§RƒØ.=›ÁeV<Æ¿ZvL=Ÿûöá°ÚZóπ ÆÅòcq2kW)fÜ[;»ù
R÷»ã<⁄∞€»gáõ…ÊXïxN˘–ì	‹bd·ìÂF°€ÃÂ õò3UÚgVÖé BJ™*8Ÿ éz1Aƒ‰	»˜Ín~s˚#,ÑëÒÌÔÁr?ÛË<∆ƒÈh‹qÇ  ⁄Îmºx±Ò>>}–Âµïÿ‘Ê˝Ã  ç{ôYNïﬂ%*Hèˇ\eIÔ≠´*ΩRéæ˜∂¶◊ë~Ú£∑(§a…£ö∂-f?˙V¯Çu∑ØqE"u~¸ÓÊ-„_`˙ì°
ŒÇ9e¢)çè¡±ÏÅ£6-ˇñ´bªñÂèm3Rh◊Ô¥Æ•3qÄ¥ù« ¬ÇR¯nâ%Ø'◊«5Ω—p–t{˝ò~-CWA?$ütR/éªóp8à.‚C¯ßcòî“O£R†ˆ’‡/3¨ÀÜú6Ö.Â∏wn[«ÒÛœÁ®<&c≤AE‰óí=Åµ
õ ~W‡ï•Ì£Ò∞ﬁô£êaChæ{rç Ä2⁄I4≈“Néˇ’S.4b‹º“z£ÇøWf›ÎıN”äR#∆´Dˇ¬bãg®íl§Ÿ—ÇÑe∑—Í∑D˝vã^§ú∞bG“_ƒ!6˙ƒi©'“ ˘7˛{ïÿ-€ï„/ÿ‘˚˝∞B‰≤Ÿ¯›.€b7Ø+K∏Y©éa?_;Å`∂ﬁ-†.}/í4\ßÚ≠¢soêbhæÊUèå«ÕŒB7(SÈ3ˆÌO™hç˙sÖ÷à^ÅØ0TΩ||Ÿ–$˚Õ4IŸgt3§œ(ú∑a∞òC_I∑1Øæi#öääº∆W€““”ÁX5uÖˆh∫6úæƒÄF“Ã{Úˆä/∆æP8ÈÖCX◊p‹Y.Õﬁ∏›|ëóiÃ„(Î^zﬁ9Ã+o—˙∏£€|√Ê∏	P(‰#¸∑" U˝&f„≠∑∑√Ùßç"Ù5I©Ê∑j•'ı=⁄Dê´ÙºlQﬂŒœ&9è.±}ôh§Ÿ-É±¶$2TÏHîí=ÏY¥Õ„ËdN#F”}ì•{9ï)ådxìÊ∆›®±dj≤’ÀªµŸÚL+O(a˘QQ†ZÉàjöq;™úèJV∆YeÍ@ª¨Íx®J”´¨8Ü]Úìü'√∏Á(9¯xtæ?}W›‘ÒÁ˚_ˇìkO¸ï v¶z´ÓÄÒavŸ‘µ62—” >{)◊&çA•ﬂÃ∫Hn÷ôqâ4àgÅ®Ωå±Fe~˚#©$◊ﬁ∆è·t¨2„ÔÄ¥—ü	;îqt‰Z˚ÜSƒ∑øÉu™ºu∞waµÙˇZwızXAh¶’ã1BW^g ü^L©ÅÁ—ò¢b	ïOÚ4x÷◊{π∂µei√L(ºßÍ€~®©›V>™⁄Ut±ÏŸz4„q‹€£ò;åØl(	–ï√ì£∫4HW™V€VÌVø [‡{9∆Éq4Ú5Á~ÃF¨ µ^á<Œ¶†/úå£Ò$'œ·y”7Y‹çœ‡Àˆò#ƒ/Ë‚Tf3Ævzæ≥î—Á%Ø÷ŒA˚kÜÇÑ¥‚$∂ ì®¶ü5iÚ|.ÀS¯*%KÖ-∫ÀÅ‡'ß{_º9z˘¸‡%Ÿ”Úqt˚˙;>NG(Qqã=}#œT¸ÂpByr'ƒ*æ‹˚Ï‡ÀìW4Ãkgo§æ ˚hˆ˛áè78BÜﬁ1Ωî2ôOeÒdÏÌ†Í““:YóÉÑ–ıcÿÂ⁄HÈ5∞≈Bômm∆≤9kj‰mAM≠Ti¢¨ÌGŸ∏ÛJ67wºv+QÕuº“ áC£zO˙öKÛ‚/Ìu«…4>çŒ:ÀSê}"´ZW£§	:D4Im%±PUL•^~]ÃmPT Ì Mçç{DZáPSÀò◊]aO∑ O†BŒ÷“!Ï◊≠º‘∏·*ãF”VÖõí·⁄’⁄&“ìÀ,ŸÈêb∫™±†pú>;äÖü∞¸¿J;¸£	^u∑xﬂ03
ºè3Y>·˚Ò;µ«÷™#u %ü-gi‚‚„±˘f^iŸ-≠∫SeÁÑ∆ Ÿ3FÔ·O••◊|C~û√Hk|ºëÔô⁄⁄"ı	”„S¸R‚>ôÃÃJkO?ˆÄ“≤TæÔqw&3ÔKÉ{¡\ßVÿ∆∞Ò˜“	ËÎ◊-g®Õì†èO6Z—•ˆ‚n‰"Õﬁ!N≠À?xJó»S ¨qG≈¿ﬂ+òËG5¶b6Æ©{öâv2Ø>q≤2Å{@y7K;'åÈœdH‚9◊åVÎg#^!îå7Pt>öP·∑Ù≈éhÇ£àt’f∑˛[¿¸)§¸#Æ
†÷"Eò\…#"3&m'∏X¥}¯´À{˛Ázà,À		3ƒ*zaÒ©ÀH·œ¯R†k~‰úeí`≤BÉMÈ¶}1*àáA%«M1]«Ôj∂êKpìYçø¬•+\æŒœö0Ê/=Y˝®R 9-k“\
`R‡ÒOtÕÆH+ƒzdjE4WÜa¿Ñ¯.ÇÖV+0=/Ùéµègå\ 5[Àø?ÁØm&`Ω|∑'er˘·’'ÂöEZYû3◊HõrµŒŒpmpÁ<A—Èº)±Á«Œ∏AO’\≈≤¿„ñZﬁjyµ§‹s6ÓÑs{E õ¢'˙—„}†ÍBµyCº˚Nµ˜</p¿8ÀjkOT≈£43D÷\{ã(ÕO∑#<L•jì©âu}ƒ¨v1Yo&ªòdæÕ√Óá=}HuexCH4®)0oFƒÄÎØCbÅ)ñ⁄ƒ„D¡óì®èk}¯∏xN›˙â.Œ˝ÿq1|]n∫˙ŒÕƒ«i?¡|Ó„ËB0]3cÒÌÒŸΩÄ›˙lÊ◊c∏¯hH
ÑáLí-˝#?]èà˝\ÃΩæAØ¢˙yZÙ»˘û[{`àÉª’ãqc∂i≈“∞“KnÆm‘∫¥⁄ ·[6g˝iΩ6#LDkÃª «Lmj±ã+!‹c1◊{ºM4Áu3∏y2´zNU√¶*I—@™sê“˙… ©Ÿü„iÓ∏ôï …îÔ±UgÖÁ‘÷ª¬KÄ5ªA´eg’åú¡7#ß∞»âÌ§ä
˚®öÖâÈñvÔMmÖ+ã¥n7˙Ñ›‚á⁄-Œ«"˘K˜Ã⁄S±Ï*oﬂ´Ú&0z“ÂÆjÒH+˛SZ‡˝Îÿ5
^°ºÖºXœπ- rŒûÛ„,˙Å9…JÖÚ6êbƒë—Q¬∂T£ÕQE?|(¸±!∫Hm]\ã˘¥nñ±d‘¨÷…Pÿ{RÄj<èˆ®K<K‹OêÆ¢v|ÒdúM∫„IËèyb®›`c†4_–Ïü5 Ÿ≤Xô≈o∑ aﬁ-B›¥=MFæ∞GÊèûc>¬°ÁÑA8î-2ny2éì|ôÅ“M±îUö/ﬂ¸	ècOïy„ê_",π∏<'LÏˆ_Ò)∞ö9¥Ñi›Ë˚‚πöÒùqo¨Õ=aJTÛù^ô},…ÉFRÙDéP+‚›†/¢q“øú◊%£5ç0eõ◊Ü*G›(ı 7ŒU+uñö^§ë‘tﬁç∆3i°°∫KSl≥˘äÕΩçCw1|∫È\1óÚﬁ»»ûŸÑ@X)DM9]ô◊¨Uÿ=/‹X¨èõT_âX1[ML≥xeÓ‘À&‘3√ìÅ9«Y<Mrûå ãÌˆ'‘Õπìé»#”_	àˆÂ¢å&õ…ΩaåÊäˇ5vá ≈$}LYz¬Ó∂ÖÃ∏7ƒo#Ñ9zG√˛;È‰˝È*xb3X¥‹Ø,–s¢˙` IaI’ço©ûe1˙$U∫©íR{ P3h	€"ßÈØ6◊7∑_ÎˆÅjq¬J0–#É'¥?Hæ6ai±âJ’u„”äe¶QµÎ«{˝8Ô'Y∑Ko6≈¸˙Ô®–Ÿ_ˇÁøs°Ô≤é•¸‚<è∞øÛ8Úg©L«DÙtå‹:*¡œÜ);~˛yë*G5˙d%ßõÎ&Â±©‹sU˘E±∏„¥˚G4ÊëÓ/˜höoëπÈ–¯õÊÛåtÉc`˙é€\iå8[ﬁŒf[≥„"Ö)º>:˚†Ov‚$Œ;«G_ûÓÔΩ9ﬁ˚bÔ≈¡WßG"sfÖGÔº¬RƒÏ^P+;IØH◊¡:9¯5pS∞Ëfy5ÃÉ⁄‘Õstñ%—8˘eó=∞ZœïGP¿ ±√Ù¡˝KapxñÇ≥‘]!§µªÊlÉS›J™áÚ›Œ¶ﬁ≠$òy8K≠¿s≥íãÓjmá<t;Jl≠∏ëuwπÎ<`1`¬!†n{õ|uN_•›À£Nâ¡A˚ó1∫‡XõfËì‚)‹0c~¥<¡f“≠ñÚyoˇÑè6X2L∫	/0/∏¢ıﬁ∫2bÙ"•’Ê.∆:›tp§îÁ!¿Ø£,Ó&yî≠Ñ08OﬁöynÁ4}15'ùÁÌìxöÒ`'˛’Z7Xc>è†7aq¡.XaXÉà”Qà[;õ‰`∆eÈ!ú€vä¯m<Ú#x›˘˙ ß=∑eG~"IE7QX`VK‚É∑0Ù»è”‡”  ˆN≠>ÚSﬁoà/G/˜Ö‘ÚﬁÂÂ„e gjÇ4„ûr,(-◊4¯cçÓÊV»›\‘Ì¸zıüÖ›NÈ|”ÔﬂÇ‰KZèeòÈ¬ï£Yç%æTK˛PÒ |Ò"•+∞u–˚°–<J•&ò«@ÉÊ>ÿ⁄„sﬁã¨-Mgåpyœ»Uüá`è®À‚A:ı¡¶∫3‹“¸ØVı©ˇ¢~°ÉTÇ˙ÀtÚ‚ëm5hÚÒiÂó€≠‚˛]?kDπe„(}3ä2,ëèˆ∂ö¨m‚&Z6ˆ≥N®‹˚˜E¯è9∞j¬-îUÃÁ“ãPäÚ∆ãC£
1[ñõﬂ Ké4«¥l¯ë9˜*'B∏µ-Ñì6€ƒ6ä‘0'$BiWV2ıÈ}‚Å˜·âÀmàì	∆z#|ÏS{¡™Ì*¸wÏ∑ïîˆ6œ≠«OJ'ÿ%6«ëÃ?WªÒÄ3˛ —`Î/fﬂƒ√n"lÏç$_ãˇ|ùö'YZé:õlé,	œFåÀøQJÄeZ3º0¨”KÄøoò»ıP‡ŒŒf[‹©Âv˘B¢˘≤ˇÔn2V
àÊ! .FÙ1¸a}˚˘EÖ⁄ä≤çÛ•Ög4/:XÎÉ•Å≠P∏ar≥°FΩû∫5U™Ù*–€wW∫µ{ÕÂòRãämkE≈(G≈<|*Åô"¬[0∑DÊÃÒ‘’ˆßäúÄ0ö≤óÔã:w®'b7n◊:Ç;≠Ñw"ü†Ã±gÊ—|r∫Œ
{ 6—ÕgÒlÍ‚2O¬S\A⁄P≠Í)‹•”ñ:§2åéZÕ≥¯mÇ%R1l•ò¥;Ãd®Xfﬂ8ØPÅSúÀBòÉB∂,CRÁÊZ®ñ‚˛Gmπ„¢¨Òv-ŒµàÖÚ§ÒîNPŸS4eÉ8á”¶Lf∏”LGÃCÈÊrƒñ°>Ù#6iÛ<}ªBcÇ*±ën«iéAæºxF·ÑªÏUhÒ=„Æ™PŸ™Aû°^Zj÷∏ëá ¡=ú9fƒ3œ€ÜB≥Eêx`ƒílÕ?ñ§$=≈
ò≤ÑN¸∂Û†…(Ñhı2$AM!V1Zƒ==π˝"·ö¶›€?0`“∑?¢˘∂˜‚!vZÓ≈úΩ a%¸hïMíR&ÁqÜéybµºêåStø†´ì≠[£7õî'dƒÁ@(õì5W€ZLÓëûËVÎ†è”µfZ÷—Ó£‚ÿ¨ ·˚E .ÕÏ”Eë4ÿf6OsŸ¶K‰1èSnÁá@dFõØG˘éÏk≠q, 'pÅË¶§‰£∏õ`ª⁄PÇà#4Ê√ÃO‰àVbS©<rpˇbeΩ(cºÜHTã•ÂËKGü∆Ë£∑ä
©ápjÓ®Ù“’∂hlzY”√®ÇP_•Éë´ã¯f”…}≈∑a”U$q±6ò
¡¡.F<ªr„e<Nx“h{}º+àÇs&Ö‹6÷áÆëœ˘ _L˙cÃ˘˙ßIñÊlÑ
<í∑…£öCÂè∞∂ «∑ﬂ˘içh6ˇ‡=ØÄ6¿UïÖùæ Z=ù†øˆ“BB˙Ó∂ÿ…úÍö‹9RÒªtﬂêÍ;\US§“^˙;RΩ7§*|o˚∑?ˆªì~XÌ*`¡ªH¬ü◊qOéWœŸpÀ¨ZA NÓ≠ ¡/uî≤¡ÌÍÀŸË√É˙2j»‰]≥πs<>M˚qv˚C–QÉ¨"wa¡e–∫"\Vÿ•®æÛ_å0∫¥å@P r&Ò^ÊóÏØ7>b'…ÄzTce'ë æÀ∫—{RS—8È¶Ï£SÒ3]ut=1TƒÂî≥SIÏÅ≠⁄ú¥eéë@Â9‹22*ãÂÈ¯÷´∆SPû-ä,ÂÚ¸›ŸıëN+™£_ã≠áãkDÊÛ!Aıºï‡n§ª´,Oœ≤òµè`ahˆ°∏?¶4+CÕ∞âìØßH∫¿Õûàãe\„Ó∏vªUœ‹ïÌê≈„I6th÷hÔ;≥&Ï<Æçj∂/‹›∆ÿ1Ø<1„ÄpûseAﬁ2Xä¢¢`8ì™ãÉÚN_üõv∑ z)ﬂﬁ£ÉÛxúL”¸¶g°ô$I¯õÇ$O˛‹CïòúﬁÛÇ^ŸÛß ﬁ+?/xæ_≠§Êf≈R¯éÃŒ_D6|ä0ñAv¡õ≈ÿ|!∆õI≠ÚÅ°s/Œ≠È⁄U)ÓGÓ:]°!{¢@í:ﬁlÅ{Æˇ~öï”<:√6îË¸œ8üÂS>P7ç[á(C|`ßTG7≠Íâ‘Æ‚aOt,„q–∆	|∆ì¶Qñ U1Ô2Õ«KæpJΩ•˚ÕSq≤«ü9B˘≈,Ω$èŒ˙q4óh
àRåySNg€Î«'ëímØó+q∑èëGD5%-\Jüó⁄£F˝)ÃôŒPáT˙;S⁄7òu8Ì’YcıÔ«8Ò7∞D˛èkl«êE
X+qèÈÎrÃ$«Gûòo)kDPÇ`†ú›æ˛¥<∫Ú%ﬁπˆ:Óe^» >Ì´u–3∆ìú´é†àt'√K*æ˘Ì<Ä+ﬁ˝â>⁄:®±qñﬁ|`ñO;¢Íì]¨ŒıMúQëYÛ—)¸•ÏŸ÷Õ∑+xv_•”¥XÄzn∫‘ø(bg’srÿ:±AÙvÌ˚KN/_3Ã´9ÔßWöV\Ÿq:XÀªY⁄ÔüQÈ0„ÜÑ≥u¿ÛAûñ∞Hã…∆RµŒ,^gZtiﬂ2kéZ.ÕA¥^‚˚ÓˆGñG…¥\-UŒØMÙ˝$·«6D†≤è≥txÒtòN#6ÂÁ4ˇíu¶æEvÄÌê*òãóYD}ÎxlO/¬‹çÀ$ß2n›TØ.jëUã{ÁÄi≠ùjNJ&Ÿ®[ôÊs–rX˜e©iﬂt¬kd€nUª≠ _ dè3zs{á„Œ≤DäÂ¿˜‡ˇ@…„(Î^zﬁ9Ã+o—Ú∆Ÿƒ∫:[É‹Fπw[ÎèÙÏ;~6ˆ‰ªÚ∑"˜Æ< 2ıŒ|Ãg´Ù&ﬁÈ˚≥pµ«'R%“}„)˚líwëãÄÌ}∏-T±◊»¡≥«ù[ÓN¡tx‡¯∞g%Uﬁxu{Î©µ¡˚ˇ¸ıﬂ˛Ö}ìªd¡¢“¡|Â9$&5ÖIM≈lS¬◊÷{®R ]ÇÚ£"–∫
Å¥8£ß¢˘æÚóT’QVô:å.©Ç^ˇ+Dõ}@4Ùg∞ÀÉœA†Ïπ˙µÓèŒ˜á£Ô™;:˛|cˇ´„rlàøQŸÀtó¡Y ≤oá≤À¶ÆÖ_Ç∞FÀ˙Ï•\ÿi‹è3‚¢ñ¥}Ö#|u∂ı—û’U‡•>¶l˘S""ImKÃ\±ãçê"´	V¨[¯`Gﬂ˛ÆÍRÜK†ƒëZóızò!2√“≈°Àæ=e:∆¡ …s@´YªfkÀ^ºfßôB)3yïı~‚™c ZÕyLc]Z∂ﬁız˜ˆ∆X(`_1ÿ˜wûù–]AR≤‹Îmºx±Ò>ˆ 5\'ÕÉq4Ú∂ÜÆ/Œ^π
h?H∫Ò	◊±Í¬àí5ﬁ s{øfoŸPwi*sÕV±}ãµ∂g®jB…ßÁicYππON˜æ8xsÙÚ˘¡K™s
˙“EÏÆ4Ã™uOÈÈ“a ˇrÜ’8Õ‚bºﬁÍ+Êµ´0ä?«Q\¬§ê¸∑É… 5Åbï¸ïæ≤`†˙6`);Ê…E1SõS≤©∂(ûà´qÎV≠£]+œˆ› -· sV∂Å}seK\ø≈h[Q6Óº“.˘:1à◊’©±é&^8ƒÅ—ºB˙ñKs‚ÔÏu«…4>çŒ:ÀSêd"´ZV£d©Mi’˙ˇS•Tä‰◊•¬ZÈXj°ìGZ°ÑxòZ≈<Ã—@rmbØ˜åˇl_w=0"G)RS√@*ztQlΩaëvK¢</·º)*:˚c
Ù(Û3c+S˙ı3•OMSS˙»™‹∞Ûu*ﬂüåﬂ˘ﬂh^øì«ë|?~7œ∫ù∫c+±@ÁπÀ®îBu·'ZzBÜd@Nˆå—{¯ì√.-˘ÜÌ¬8¸X≥&ùRÅP	b⁄^\ìy»–æÙ5m±ıbﬂ„˛Z∆⁄jpQò?¬@ÛÄÖªò`˛îcÈ-1ûr «t5µ«*∫“^‘¬}\§Ÿ;D©u˘wfp°õ|ÀT-fúíC®¯^Aƒç	<=sîOmÑâ@Ωœˇî9”ü…ê$pÆ˘∏:·(‚BèXqÉÅGÖN™Ïóæÿ—[‡ÑıºQ>ı 7∞É
˘`ä®˜9Ó1?ü’1k∑ÖÎ@à,À		3ƒ*ä_Ò©≠ƒÕfâ∫	Á§eΩT•Ïù“M˚ÅMSò3XS«Ôj‹îKéìTø¬•ıF`”◊Kl>¬ k"¿ßÃø™{R@ìÓ∆Õõ∞4(ÏçÄt‡
ﬁdJcÙMó‰TÏ{qrﬂD∞º¿jE¶I@/◊>ûEj0JòàHæ‰‚r\É366∞^HKP°ÍùÌS>)◊ÃJÒÜù3ŸG¨"ø∂+®Æ÷ﬁÜ°Íú'»6:ù7%Ú<‡»√yπïÇ q5Tãµ|¸œ≠˙,4˙….aÿT¡~<º_“mÿ§™WVπÆ∫-"v*Î”Ø‚·Âd¿8z-∫ﬂía/"cê+Ñ”Ú’û∏¨‰a3ZS‚8Gò§‘Ye©∂˘I~=ÒÓŒ9ƒ,˘\˜‘	r z˚>HR®IÖÒÛÂ˘qÆÁø6\â94^ÌPFEí3≤ÌŸ2¿ˆ …4ŒÕÿq2xQn⁄˙L§'J‹ˆÙùG&∑{!ª·˘f∆ÆCÆEhÿ‰à¨ò-]%w]Ωs§∞l:0—≈Ô≠˜NYÚH’ÀN¨∆‘>7û^π,’`[™HâÈ®‘ îÏ»z˜Éê-≠Ü_Yà≤Äu•∫é¨t\(≠+7OZØ≠Õ	*‘N‰N "fjãó?©F√Ñ∑{Ï-Ê
f/*ƒ÷¥jÛ0≤Y∏X=´·_ï≤U@øs‰x“ë˝˘ fW‡èìç),Ó@˘z?Íw;+¢EA≠wºÑVª´¥∫Pv·xÕ»+Ï±p≥ÒãDŸNXw’÷ﬂ¶8‚áÛ+ÆÔ∞Ö›i[i˝SLÉ´:vÌ5ËÌZqﬂ´'0v“ÂJ∞jë7Ä∞¥¿˝5lŒl—:x©äÚb}Ó∂(»˘˙‹À ÌEEˆQqÕZOxÒeƒúæíU˚MÍ:æ-©∆qi∆ƒs•B!*ççÃ„ '„l“O2∏◊¨r7ÿk(ÌﬂyÂîV¬~„Ú<wå…ß…(¨ÆTc<¬ëÁåG8§-îny2éì|ôÅå“M3 $iæ|Ô±(¨Ÿ∏€$Y-7ETõ¢ûi∑ˇäO’ñ≤“Üñ ≠}_<wó≈¨∂ Ë.¨ ÛòÏ´Ë÷'ï†Yƒ=˙"'˝Ày_%1j”¿Tˆ7yy¢QñN£n‰+◊∂óÁ…0R)Çn!ì6ªKE„7BœÒÃXˆ¶ ]6ñ∂‹fÛ;{H˚∂Gä˙æ√ßõŒs	Õ ¬ÚÃﬁ“zBXDR>Õì1∫2cÆ!X+Z≤{^•à±˙J$ªJıìiØÃùÄ5.ûf·¶Ójµ˘1≈˚˜=mæî∞ÊV€¿£ƒ®Ö*äª6˝e«£ø\w^-ÁÒ@ﬁ~T≈?ﬂ(&OÂ€Û‰-=U$xYı©Lîéz#Ó`e\—B{˘5w
X!W¸(Ì{¢NΩë_é
ÔªòDc≥ÍHˇnøÚ∞°¿‡¨%‰MÜı58ëS†5üSuª+ÛÑkU/≤æI2g¡∑/∫n≈.3¸˙°~ÌDPÉæwª*¸Q‹Ö¬1∞„§\¸˙¯ËÀ√”√˝Ω7«{_ÏΩ8¯ÍÙH¶f @â>S∂≈›Ó ª◊5áÚÄåïó}Ú!ÔXÓ®£7R`∏óC¢ıﬂÕ∂.ç£≥,πà∞/B¥ÀÿÃƒ A7Ûéß˘‰ºπ6O´Éâ·ú±µÜ˝“tlµÃ“&≠hE·îÍ˝¡G“£"Ê≈ZÁ<&›DFsíd’ÙÊ⁄g÷´<òáÈÀ1B∏Um∂‘--//ÏoÀ^ΩÊ|∞sﬁ>cŒÌ≠˚,Ç2∂Cr2<ÄBü≤ëã®∞≠ÌMíÖ¸Qkjƒp˚{Ï<÷N[+n.€ñ;7´2±Ÿ2õø‹™∂˘|∫¬Ñ-óüÎ£≥Ô  D í8ÔΩ‹\SÁü©_MWYˇ5Å§íM9-îå©'ãÚ∫ShAu—≥>}®|¶&∂±ÏDO.>lÒ’µügçP}+’ÖÏ_ÉXˇ¨aÁx◊è$_“‚¸˝‚Cpø,∏Ôﬂ—ÊfÒ˛‘R\≠m?|?Ùé;Ÿkb,®√ïô;àXF¯ñH5ù—[ˇûÆ>Ú⁄.î≈Pè‹†©nwtˇ´Õh≠3¢®eë[	c.u≥‚ëm5$ÏÒiÂó€≠"ù]?kd∫e„(ï&ÜûΩËô:zGp˚’^RæX¡±∞«4„µ¬,ÂË∑nJ2 ÕE‰ãµêÉê|î"#Eé5«îU˙Ñ–$9˘*ßNÏ±üì<≈¡6ä‘Ä§NK∫yØ-LÈSK√ÓÂe ¶∏!Œ&¯F°2ü⁄ˆlW·øcáˇ#√@(!oçÏ
÷©MÅƒ/±9éf˛X°⁄çúÒâ[˘s≥ŒŸ|-ŒˆŸÁò”4àì,-GùIj6áªè˝≤?`¿Çîﬁó∆Ÿ
‹wL‰2)‚0jg≥%FUFr	«|Ü˜›"õ∫≠¸øªi[)Q>òáDπY‰ˆá˛úk>¬bÇE-ª˘H¯3öq¨ı¡∆V‹0˝”P$£^œ‹öJ?z‹Ìª)ÅÎÛŸxk‡∫b)‘öL€ZM¶¢fkƒÖ´Hì#Ë"0@^ÿÎÁœú!Ú≠Z†aÑ<uçb≤mÎ1Æ•õRì+¡uåV‹i⁄˙b»7&Û¨âIZì*ˆîm¢ÀK©>˛Px∏t·ô'"ïÆ¨Fçª\aˇsÏ?„
`•ìA*cÑŒìa‘gÒ€Fbırπ+kG•¿üÛ ›ü!ÿ«2–Ω®ü¢æ's°Úks˚{ñ≤Aú√9S©˘‹®kŒrº4‹<é◊2–~º&9ûßC’*—¢0E·qúÊ∂òf{Ù¬cÿ·.{@+|œ∏ÎN›y‘DXfÚ<#&ºÄY@Ïƒu¯ÏÛà°âè%µ)fg Ùù¯m7Êa©Q*hœ(ÍeHuöà<ÃN.Õˆö ;‹˛â¢i`Œ4Ìﬁ˛ÅCæ˝œ¨˜∞g«‡ÿ›KÄG´l2êƒ19è3*M€+VÀcB`ú¢Œ?]Qå÷•—Ëå<—>ßB·EÿnÆ∂5ï‹#U–≠÷ gk…¶¨c›GÕ∞YY∂˜{˙\xŸß˚â≤g∞•l~EU˝ÕåÎ…Ÿ‚∏>ë’læÁ;2ßµFπÄ\ßbüí;qêè‚nı√âOÇ–›®≠lÏœJx*eﬁ÷ÛñT„› DÍMÃ0)-G_˙;Ó4∆ΩÎJTH?ÑPÛ∆£óÆé-ÌQÈeM˚ñ
6}ïbƒêÆT»vöNÓ+‚∏Mòm˙ÎŒÃQ(∂p·)-/„q¬S‡Z´·]Aƒê3Ë·∂ë>pE|ægHÕ⁄YÃxÚıŒ∆û˜÷”[xyèº∂†‡f⁄~Áß5“Ÿ\™D∏c˚|‚5ª/´√’∫~hGtöp¥ó˘wßÊTº·ŒÒå_Ø˚ågﬂ·
€‚ôˆÚﬂÒÏ}·Y·ä€ø˝±ﬂùÙ√jÜ∏‚EHÚÜâ
/⁄¶mºœ⁄n±VÀbâ3˜¶ÕÛ€•lp˚á˙2˙Ω$I6dxxÚ.ãx‹96ü¶˝8ª˝è!Ë∞AFîEêOÕƒ%—#\b≥{R}˜ø≈ú≠Œ¬† „äÅ6»á≠\o|ƒNíµñ√7,"û}¥ajÜ¶èn¶•uy·±≥W	ˆÅ≠Øúdeéë∂ÌCe<X	»S?,˘€SÅõXtÁBîryˆhmïòoø'∂G;Ìà0tæ ˝Æl=\\«'_Ùò]™ò°Dâ#!^eyzñ≈¨uCÙ¯Q™Y_ÜÈ—æéá"£ıªÏ	˝Òõk≈·:6{∂·Ç+ç"ã«ìlËÒ¨1ÏÃö#Ù∏6Z⁄jqwyRb«$ƒ´oyZ{ïMÀ®+^ÁƒπX]Dïw˙˙l∏ªô–q˘ˆVú«„döÊ7=kLŒº I«ﬂ$y
Í™“‰SüÙ ∆*∆X;wÅ¿Û˝j%57+ñÇ™wcœ˛" ∞ßéìÕ«f∞b_à·fêR+C|ÿ2Í"´ÇÌÉ˜£≤0XªìÂÇ‘·fât˜˜ÉTÚË{˛°Ò?„|Ü√K˘8›4nª†aP°¥Í1Rãá=—ä«Pk–¸œÉòFYîƒ∫À4/yb2ı⁄7O˛gè7>≥Ü√…9zIùı„Ë3—0§¢»Ÿ‡P{˝¯$*ì˘ı⁄(äyOOêxXi√!œ
¡k<µ5P?JÏ◊>Ï•Ä9®u‚\oÂë¯¶}µ≤ˆxíÛå)ê…ªì·%ı∂¸v?√bLﬂƒYéﬁ”ü\Î/¬ Û(eˇ»∂næ≈ˆó4wVîÿ7sPÌ¿’πoıÔ«tX‚Ô¢í”ı4âØî≈¸"…—3ﬁÂ°}ö:≤±¡^`Ö]Å˙—ã¢«∏z∏Fÿ≥(Äºf¨⁄bú•,π ¡Ùè^ƒQÇV·qra∏"ˇ{òN#˜¯›¥_DÑîó"ÖcBC7‹†®_6 ÿÚxÄ√L4åƒ≥b˝Ôˇ[¥ ∏a0p
#Å FÊFÿÖx"ca6™ŸXÏ&/+s9ò‘∆pùá=Lß∆W JåÁ„ ˙¥Û €ı§ß4®Ô«caùﬁ-Œú˝ñ!19ö–Éë]c ñ˜c Ûl›U©,Ωız‚%€;ä»∆Ç•D˝æ\v ¬˚‘@ˆDñ˛‡Ôp7Ué1Ûo3PèA>G±ÏÀ(Ô‡å++Î0Ÿ∏”âVŸ·j$o”;ˇ,Á5’⁄«t)Xí#{r˝‡Å“ú.ÅH≠P¡oœÍ˜˚h∆°Fª◊ﬂ‚Xù≠K»XûÒOúóoù£„Õ∑7<ˆy)hdÀYwççl’ÍØUS-™©£≤ZYVm
 6Z(ÖŸ¯v4f¯ê∑F‰TxiïMÂ)!∆8Å û1™mnŸ™mÓhçìçöŒ∞tGøoO¯qê˛≈£ûJ≤-˜|s]ŸΩz0Ø*ß$:PÆ±≠◊%(ñY'BUqÖ%/{ıµ–∞ÛÎ˝£ØN_ÓùΩ99›;˝’â¨˘9,Ì5&¢ ?nÿ_˛CéD¯ÊyL^»qg∫ﬁ¢<é{{cP%{Ωç/6ﬁ¡á˝‚ªÉÅO≥ÙEAŸK¸p…‡yz5ÏßQë™y‹;ÔL-]G=~)rÖ jn≠?“R5%)†˙ÿRxU©Ïs¸¸ÛÊ5÷n≤pïióJ4◊õÌºìœÈ[9†ì–)Î®%tÇæïoHBÁ¶lí†ô?Ã~ ∂PTB‰ö∫‚“—2P≈rjNΩ"õFÖûÉF>¥–»∆æå˙fKeÚ¶«áQ``Å®m â‘Ô‰…È˚Ú‡D)‰µ“6ÁΩ∂èA∑‹˙ì≈D”†Î\®–ÆO˙ÙA+g+ß
,åù%C$V÷∑⁄[ı,¨∆Ëœ⁄i5∂#H'Ë®êF«‘ÅtR£∆N‚¶E's‹–2tC⁄
Ï˚ÚØ˚≥wt˝;Ê›◊ªY˘÷¡˘Í‡$Ù3rw—∆úï,ú	ä¶&,H„^7>è]/„\ê-Ω–¥0‘ñ†ìÂú-HÂµí%…/*ﬂ<*Ÿó˙µ¨`ßﬁIÅ [n≤%le=Ån⁄O≥‹Hj¥±¬ìÀ$Ó˜*©}TUd&aàvYUì¯ÿ∏¨ŒI}Í„πe'æAÙvÌrÌ’£G”À◊°wﬁOØÄÖ`¸8®: ©÷Únñˆ˚gë≠ˇﬁïH„‚miÔ”MFˇ‡
ﬁ°r¬Ú9@Tƒ®áf¥,ÓG@	Ad3(%⁄KÌÒ∑l˘†¢éS«qFY’ÿãúgÕ_¿â˜“u∫KY\KCÛÒªcºãÿu%>èé£a¨◊ ó≥>—ó©ﬂÉt¯2˛~Á„˝t T¸,/◊5˜`_U…CøX?óB ¿˙
µ≥ºl˛xêei∆•óü≥õÍbt€ZêÕr‚¡64ªPıÙÛ∏{È6ü„œ√÷@¨÷ÈŸ”œ¢‰-VG°wÓ∆®*5≠
¥˜∫›x4Fk#>óÙsM“5p∞:hàº´ı™‘ªa,>Ø‚j†ÆΩÂ^◊5KŒYÁAíkwb≈~Sñ∑øï¬%¸%xÚ< c{JÁ•à	yA°˛ÖŸbqr9Ûl¨ô∂û»ù»%G,ˇ∆éﬁñ≤√èøLKæÙ©©N^ÈB˜c 4a∏§≠A¨+ƒcB¿Fµ™°@(√§RÂ–¨≠2üŒz´∑k‡GEŒ∏1;gqÜ„ﬂ∞Ônî‚‚:x≥|ñ/…∆⁄O/í!Z~≠3MA¿D?!u∏%‰?≥s"ç¨,Ó¬Õœ?¨[cl,Œ•v›zã∂v6 ˘€fóìÌhyŒø!Wÿ´+ºåGãçƒÕ∂îï@aÖœÃüäò2ìDXdV≥Ó¨ìæhÒcçX±òÎóÒ;‰E dH „ıﬂƒÔ∏ÄRÒÚä‡[ÁIÇDîéc¸“eP‘ i]6©.• Ok•JkßÍ¿‡€,≤˚éXº\˙n
òôåÒK„‘MRT9dø´éünîq%ÊàVRd∑q-T⁄ÚÆ.ı,Ü{÷{BÂ‚Ω»ÜrúrÚ•p'æ,§;Æ†©“›¨(Ø˘a◊Àx—fá2¶]ÿlk-*°?¨p⁄hò`¬µ|îëØÇ oSﬁÿKøXg\Ê2KÈ‘].≈ôX4Ÿ≤≈÷5?˘ñ’Ωå{ì~\xŒÉƒDÀ{^ˆ–|^zËônÔ.Ä@dÕŒ(√°P•Ex◊©‚nŸ≠ †®ä;kJyâáÙJ	´ﬁjªT5àï|ª‡Âò™* &ﬂ ËC%µ/J˘ë›≥•ù”ÍUX8¨5∑Uà»^T/©JCCòò£óêÈÙ@8éﬁa@q˝•%∏ õe†∫Ú˚Jõ¢Ö≥Ç–ﬂL•çB·[tè∞∑ZR≤hµÅK∏fÒ Jê@~ÉÚŸ\‡faÏDiø ]W˚±∑8SÃ~ë
Eï9ªà˝¯–&`ó%ö∆… ^Éa£æ¡\•-®nÔsêÖÙgTÈπLˇ@)ByKúçQ¬¸F”£hn”Úù:y»!µëÖ
Ó¢¢O=“á/E¢ug'JÁÔÜ]ÊL”¬¿Ω±¡æû$p‚Ï9–MÆ—b17^KÍ;¨Òñ‰c“ø;Ëá°˙,ãF@c)˜ãò7Øä#õû[g¡ˆÿQ÷[ÖbÚJñdl@°/Ω∏,¨¬Ü†àN+ª,«4–¥’Òá¿<ãVhYl+˚”SvÁúÚyz1l/#L2Fª… Uw!r·6ãâøõ¿ˇØ≥S˛–EM-FüÁXˆﬁDcúCΩ"÷0(åªãi	XA©1,´\L˙pu#çì)¿≠Í$æô≈pL˜ÕÉ`i=6≈˝≥®ù¯±3ˆd%ã¡US8|Tﬂ.éê¨ÿ≥xxƒ”4)Ù9üTœÇº'XYÅ:÷>»0Ω:ÃSwtéÁ-ûùP¸Y«û‹√ﬂUëùBtÌπ†rß)|ŸQÚ∆ãçØ≤òî ·∫äòd2äŒÄPØügÈ†≥L†ÃóW÷˘!vÆÀUº9«‡7mQ´ iÔ ›ﬁ¨¨«ﬂwñìﬁ2"Äoå+RË¨ã%Î.ë,¶óÈ’^?Œ∆ùoøBß»yö ™‰˘Ì±RŒ#0+¯øãëõ¯˙˙ 1„"æ˘=RˆsfQB¯å6Ëê¡ˇ òd6´ÀX>™^6π(\
èK%Y•xü‡ZÂ¯ıª¬ ÇF,—#ï»¸á≈¶—:Cø‡4ﬁ}åØcΩ'å{LßÈ˙r›F¯9ã„ÄÛ•àÍ
¯W+ßgú%†h,vO9WÎë¡{˝>»?qŒ√¬ﬁ`©¨+≤Âƒ{d¯°é , e√¢VÏòÅ<Á8Ö[∑ò¨óﬁA&D,,h Ü 8≤y&√I$2ÈÑœ¢‰m :Á˝…[,zdïËyÖ£¨ÓPr8gJ´ªbQëçDÅ∫p´ä˘3¯ó(1öc -«/ÖÆ+UŸê§â≈Ï(ÅÆN⁄P¥ÛπÅuPeçƒ¢$◊€%zŸXÁ*¸¬3˝d0ÇÀ1ÈŸ;Ê‚DÆì¨
∏%dxºÇKp◊®‘ƒyåÃvH%Z”∑… ≠ûO p∏]…˝∞*B¢u 
C+ÓóhO&
x‡MÛ'À4¸|p”«úÑ°	òoär8Œ≈é/˝râÂÂ‹$Å†÷/{bUñdù'óÚCV#t∏B·Ê8êI!‰`9]4ÂÒ™¿◊U≠AÍ‘.$¿LK"Vè/œkY¢⁄ª|üàIíÕ	–ﬁ>G9&ItQ˜í˛çGÙ˝$ôœ:◊√‡93X¡ıc-“÷Ú‚rN≈så Ë•r«J¿}NæîUQRΩõZLU2áXV|CÁ◊W∆EHÆ≥Ωã¥Ñ$øtÿi?\Ó[µŒDπX€ÑS0Öt›˛Ô∆*ølìa7bÁ ¥åíía7KáÑõAL$X|w¶^˚D°äÿ£ÔÓÔíœ]K>˙	4~‹íŒÅ6™ü!6ç,x3È®ı$Ìÿêqf∫´œ¥ìëa?…∫˝∏p>||cÛ›ì’ÎËóÛó≈ä—÷)púº˝:´xF…[rN\ÿ“∞8NFÉîÊ”tˇÌEÄö#eèæm`‘ovY’‰˜ÛÍh(®û˜#ùMí~Ô∏¯¶£PœﬂƒÔvÀ’°/vµÚ„ÈªQ¨=Ä_)ù≈C∏	›$ ﬁ°]G}X˚Iy	›úÍì¯∑Ú3á≈Æì‚Åõ˙ ıKØKı`*®es∫T7=.Öœ•‘˘ßIƒéˇπbò2¸.[My‘XΩõˆ-M*∞#ï≈™ßçrµˆj˚S2∂^ˇ¬G-ˇUëƒ¡ÛK∏üWÁ]¬Z¶K∑-\∞<Î>π˛ˆr<Âª  Øüa¢nåÈiÉçÈ÷O2Y˚>ÉΩˆ‚çg´áè6ﬂ¬ˇ˛Õ‡UC¸ÌW/Q Lá0sßDÔL™nÒdÈÎó Üb◊ µs)mXÏ;=˚ÎJX˙"≥˙,ŒéS„ﬁ=Y¶kÚ+3 »Z ¿ºps∑XY∏…ù2ì/®ùsåÍY8„4ÒäUoÛ,©ÓX∞¸ÙÃPπv“ f P«âÜøqÇÃ¶vÄ˙uOa•6∞Ç=∫ ‰LÕ™≠¶vX®?%
5#Í∞3†õø¡¶"à'π∏≥A Ø+‹∫	"5!o-G˝7wC(Ó|„?€&È±<v…0öÇ
<∆$Á~2:K£¨∑~ïÑ∞BGß≤}ßç•êOóä3—iîDΩË¡íΩ∏çM°–gm´⁄'Ú-Ò≈Õei©¸XtäﬂÌÿ¸bsÈ…¢Ó8ô∆ª9®∆¿¢Ö$z {aÂòâOÆëÔ§†Ä	∑Í%)πèÔ¥Ã˝¥	ƒHˇéÃÉXÅàa•?«t!@õt»Óµ∂Óæ\åVô∫I˛Ÿ§ˇõÁ1∫EÏYÉ0Îª5a`÷wú°`e<‹¡€nÇyÎs{Ë≥W⁄|H1_Ä¨¡"›-Om™≈c∫¨\·˙˛∂%¨øàî)TSö7c+AºüZÙöStz√‚"2Úˆ‚<&ø> 8…Iáé∆vOØπ]/Ó°+_‡n∏W∫Éí˘Îx⁄vË•Ôü±t^ÛF.‹¢F¶≥ú|Ò˘yúå£u˝~çºﬁ6H∑Ià[H¥àâ%ı+⁄.(q•\ûplïK#[òôn˝¯4ãÚÀã“Å8˙Áh::%SÄ]9ò´ô	˜ÄFFÕ—Hç|“V˘‰∞ÚÑ<!IFÑ´ˇE¥d≠a‚K“H≠…2Z≈—7ÒˆO"h˛9]8¯_&Ã√¥¶≈‹∏uvD≥—]
⁄%G©pŸv”A*9"5¿@…… 2˚/∫ã∫ÑWô´ı·uÆé¶uÖÚ+ùªhL=Kﬂß≈a ’ô¿åœ1Z;_âÄñx|ôˆ÷”°Ω^€gïóx≈∂Í@ÿˇIióYû©N∂
3)≈›ƒ1±M/∆;©F]ÑÉ*Y3∫Ïeá√¬?ŸT∫6F@«Õ∑Ö(÷A◊ûŒÿã≥øˆ±MoΩ~uÕ ¯2»∆À´åñÅ¥ÃnVô¯±ó/—’©<Ò\~•<˜b•o∫:
‘á˜·º;˚ŸÌÔÈ'Û•9Ã-Ôw!ºÚö\Gm£Bπ‡éT‡®¢UXÿR+‘DÃgìxïGÜÓ2úã£û]´– ÜêÏOπBjY~ÛMÑ√“÷´Ããe©Ôw…Ë·îöaS÷îW™F„∫{ ‘È¯¨p–±Ùh∂©’ßÑ$»4Vı7ŒDb´nLÖUü∏ßCæ7x¿w\|∑&±pÌ÷õöY;^Dè˚&¶GBR2[û¥A∞Ù¢®v“•ñMˆÅYëõM≥"yKíùV-IT“ßc÷}°ˇ  ˇˇÏΩ[oYí.˙^øbY„›$ª%Ífª´d[-©™4€∫¥$◊Ùå€GNë)1ªH&+ìîÏbÿ˚a?úá}ÄÃ”Ê°—Ëß¡∆ ˚Â £2ø‰Dƒ∫d¨K&IYÆ™Ó=Bwôy[óX±b≈äÒ≈è+»%:>%Ëõèº§Ÿ¿_˘ô
áΩQ4å$⁄˙«»á¨a° wsOw´Ã{üÔÓ˝\'º>Y$ ⁄ô4sX 'ßg≠ØˆŒèNv˜NHeD˜ï2ùQeÏ"ù5F5~6:¶ì∂KU†◊íŒ€iEÚÆ†nÃÂıø•c`›%¬,–Ôê c/¸L≈ó†.Í˘¯"%£q"HŸ—ñÖ∆Gà6õÿa¡¶A⁄}N÷®ÌÛ
=^€}ã<g∏ÔI‡›¨º¡\ııµµˇÑNY‹oºΩ´§mﬁ«ƒJËE	Ü¨áw≥Ôﬁ="–Aâ x›Æ 
ΩyËªS∏ﬂ‰ﬂµÜ=raé˚‚·#„ª©;sÔÕ
¨¿∞0N;í_gπáaéO>3˚ƒÒƒlx_oÚpÌ/‰Ωøºé;‰wàwÎtõ„1∂e<@‹A¿|zJ!Ò@∑µÜS€E‘CFÅ
¢QÔ˜ıµe˛Õ
5»˝,…èÅ∫–ÙoTE†ó‰˛ º÷Âõµ;yh]F∞∞Á†÷¿ı.è≈Y»cõ$óû∞∆ÿ'i¿c∞w5Ø«†÷
6}c˚<tÆ”ãíD^¸E¥%åâU~ÓÔ#∂Tü·”x&ùf≈ıïœ1,Ú5Æ®;∞¢÷›Rxﬁ˛/B˛/b6Ù·=ûN«ız1Œ€î'àπ£˝ñ^œ…á<x§?W>AQÜë+WÇBê“Õ;’˜ 8q-¢õ√√¥Ùò∏Z2åºø^0Üä„y¢‹0(`‡+PB–Óß¬~˛f2cl¶7¸ÖapG¡ƒÄU€s‚ﬂú∞l˜X—∂9.ıÁ»Á%éâ/£ŒUÏÉÁ¡êFﬂE∂=B ZfBO|-0<Üf∑YòwY†_#MÛäj{∂='gG≤Ûõ◊˚g≠›£ ∞ˆˆ.>eŒ	∆∫Ëw∂‹ç…É¡cè’_ä]êÑD´ûIV˝b-e±*Ã∞Zéo£*È>*AÛØ»ƒdÀ	ñäIÙ/PÉS›z∂⁄}Æ4ËÒPíÈ`¢&É$ ZM;ô/Asæ˝Á¥ÊŒ˙≤‹ ´ƒ„.*ø/ “RV, ¯;≈%v£/≥¥Ø÷`ÍEŸ1Õ2}√áSf¢õM%£¯3°Éh	®Á±⁄iëXÔ§#.AYç∆â0@◊!¨|¬˚r<H(ÿµ5¬πIGç%•îú’†ö##æNø√jb°5ó}≥bV»kPY1ÎR…w≥¸6WëPé{Ò%Únå1,≤<ªbx¿uyØEA_ûŸÇ«kF3ˇò8=$BJùΩ®€»ŸÖ˙åÑÃﬁ|r∏lj–ßês«Y⁄Å&‰•ÇNÈ%8ó_ê=∞éøaÌºoîKñ/NK7Œ.dîe‘©NäÌè–ÃÙ4B;M∞Mòπê¶ÔÖº1Äb<˘[ë«Xà>%)íÉP KfÀ/√7·,ÛjÇ—ñW`ŸÃpZ†ç:Q:ªF´ì)&–˙3hG∏T]‰[^Å’-òë˘‘5ÏÒ^ø‡˘b›åÿ¨I	_–R“≤¡ŒÙó¢x∞≈4Ù=™wÅ<õ›•ÄA∫TICQ?Òè%d¬Ãèh⁄dÉHÚ6FI{C8∂Öö5˜úõw6?™úñrVûé/»N1sŒÖy™üR≈<ÃÊÒ+·˜¸cXc&ø/L ‚n6©v„}ËR!mgùÍ|Î≥h∂Bﬂ}:}22=+IaU„Æ,˜∏îÂ$œfÚZ9ÕJ …Ô
[9ãtã”"PYMUYÕS≥Ê Z?ÿ~∫B|}“9(âÙe‘E‰©X“9•îÕı”,WaÂùxTπ¡ë¬b›–à2Ûÿú4∆ÉèRƒO≥@UH∂	†øäÁ–\‘'°vOﬂáO˘J	 ’⁄!Ë¥Um—k©÷ﬁI©}R≠ùäBA•§∑M19n˝˝¡ﬁ·Ÿ˘¡ﬁŸ◊GªÍÿ¸¸¯ÏÕ∞Ÿ'F N¶/÷^CÑüG ÂŸ‡G≠b÷Z÷∂™ø´⁄ﬂYwU‹=SRÃÁ÷Ï|VôY ¨≈√“óïåJ+µ˚ï€Ô–=˚&*¿-u&Ô)¿Âhî‰I˘^¡Çg.•ÚAâ‚/µÍ˘Ñ#°Ãs~ÅvV⁄|æYg∂sπ·*çdªvù2Åôò˝îdÅ3€jT˚¿ÒPë¬áù¡ih˛t[-VÁî“‡>√	f‡rb¢†ˇÄwè{Vû«0"ÿ.Û‡E9J«ù◊xÇ¯>F£$UiõCÑÿÔ„ﬂ«õùôªjû^Ô˜£´xøçÓ>?^øuÍ+’ujCøä ¯¸ìtˇÀ§Ggô?aÔ1ÔWi◊ãÙ_ü§˚ß›(ôÙiP0WbâÕﬁÀïXB;j∞"‹ﬂu£QﬁÀ©ßﬂ∏;Ì™ù?õîz*:'É¶ÁÏZ)ä<ªÆ
¨∂æÄG”ßü}∂∫*VVV(ÅnkÁÏ/>ãﬂ”l§\A0'H‘a∆∏1y∏‘'x8éßÂ*Ω	zˇa≤Ë6ÚÔüb⁄1\P¨ªxê§HÛÚ√>≈ûë/¨9Ú%1E'4ªö-°~à?\ùûñT˚î=ïÜkø≥%r¬w^÷ôπ$äñºI,yù&ùß¡ñ≤Ç∂Tpï¸Ó©∞Rûä!€ËK†5/÷È*ñôìS∞6¨h||U’ÅHIÓ[‡,∫ÿ¬´ì4-Ó¸≥“éËO%zŸÔ∏OéÄŸI!•aÅz˙·¡a4ûƒ¿Õqéa«8QÍ¯P˛l<xjöÙFµú‹©GÍX3¿ßËY?É.Ωyª]Û∂¡>C°J_Ωíø˘GuÙJ‰Ô'πÅ"Xñ˛rÊ⁄˙Æ@ïW^ÇæK¯ì’óÍ¬˙d"·\vv0j†Ò'¬√ı‰œˆÚº=˛^]¯˛B')z[A™©zËﬂéf—eghnZtRå%Ÿ~ª@∑5 Â&¨¶⁄~q]IÅKX6)â√I|…«.ü}}väûÌıbdSÎgü˚Û±Ye^9ÑË$8IùØN8Ú⁄ıeac«ôd-º¬ˇ"ﬁ=º€±<ÔË@0T«O¢øDo‹Œ“Ü«Uÿ#ã≥ËÜEµ<Ó<”Û"@ËèviHÙƒmK º%Gy*»BW\b#Ÿïjlqáö|∆ø”ÌÌ˙ƒm’^ }c5Xﬁ©j±únÅö<;∞¶DC9Ì{UÖ Üz•^&∞©ñ…	¡n∏ì∂îe)J∂‰¨}À*Iﬂıe ïc$+®∏gïdn≥¢(YD‘2V‘è≤€?™oWM{Va¯Ú·&Xˆ`ÂFœ´A$®:ÊÃ“ß)ea WYycO„vî∂;*ZÀnZÕ≠•¶5†eMghîWlRÕß1|æwyâ∏µ‹ˇî∞c˘ËΩ@Ñ[π ÿ¥'¬(iﬂgm÷{@Ú’Á-⁄n`ukø¨I ^≈˚ÁƒÀ€H ºI^Øu$s‘ñ©øç&)ú≠ÙìO&" €rç⁄$∆@§*ß9Í∆Éz]b	´Ö—Ô{]√ÎBge‘s4‘OO“õÜZuz«j—Ó·ù¥=∆œœ1x-`¶º⁄˝vîçf®ßÊq—’È≤=Èëmﬁ⁄´ ´dÄ˙.]˚ˆΩÍıUKÍ8 ⁄›≥8Î[‚⁄‹µ
Q`ÏN	∞ñΩ¸`}MwË{b“~Lìâ@?ÆÒ®ï~Â*·Im€ö@⁄{˚öã)ËÙÙIÿ¨6Ø†«#ÿ”÷2∫ÁZü9œ°vçØ´}ù’˜Ë≠⁄¡Ó©ÊX˜tÀ¨õ¶ërÌæ&`Y$ç#èKTÕØ∑ƒ|4`íµ~≠:h$Ø »≤êüL˝|√<k!vƒ‚Ó é*¯¥î‹’Zúµïò›‰Z©0∫HµÙq5hgq{w¥¢*õt˜Sã[@\Q
x¨ªˇî±‘/LﬁÑı)„Ã´ÙFõ‚üéü∞Î™|¸ß)Wo”!DªiÙQ2Î÷úõ…†›w‚\Ô¿7§¥Í˜Ì7T¶¶!ﬁÄ›±U∫∑Ï‡°I®ÛøKF›@5VK$-o‡M“Ít≠(Ãdï¡‘^Á®ÜÊ[Ç+Öo⁄(…`¶hâÂ¥ª¶kí«ãn—÷^Nï-≥èV≥⁄¥†â^Ø˚^/òBÕB|cÁ◊(4Œí>tX¨ÔEÔôÿŸ9YÁo¥Aí·ÖÚn†‚°r®4¿©ÕÑ;UH˙s®Bˆ¿Tÿâ/#ÿ,PQ‰sâ£òíﬂ}ÅÒÆp≈4∞9ÀK@XqæzÀeF‘ªå.b BUkΩ‹Ÿ›˚Ú´Ø˜ˇˆ?ø:8<:˛Õ…ÈŸÎo˛Ó∑ˇµf>Ï%#{UÎa˘˘ní”lŒì\Â§:çGöGs∆ÍsŒÆ7k∞⁄´i˘2M{q4hK?¬≥îzá+5√≤A∏´AAûO≈]-ÍrΩ)û"Sß„ë$%[!≥å·&Øü*∏°qè£o§1E,B]¶^ —†swπED+j!—Mu4úÖ©©LWoT–$H§M9˚†Ü°Ÿ
ÑÿE‹çÆÑî®Â˝4ua•Låxk≠0v`Ê«kz}-ÜUöQ)ìŸY ÷/?˚ûØ¬Ê!FŸgº§Æπ•∂˜ßq_{ßœŒ’°ïÂ§≥,¥{3—ö]“ Tì;Kôñ;ÅÅˇÅ◊0H˜ûõL√»◊ÑŸr ò6dP
óú‡íÆa…˜"zé@mﬂ(º§õ<ŸÇùËg$Á(V4UJK=CjÆUˆ®ö√ı∞CE¯l%V¢°—á‰ø€uˇÉ3Â˚˝˘<_’Ìˆ´≠∆eöÌEÌnΩﬁ.lï≠u>jWÂ‘Û$6ü„û¸⁄Ri¥è¡ÍÔvW°πV>'d¨¥°©Ç*,›6ƒmö˝*T`]ûãœiËS|√Dc9e(≠ˇPMdååß_2Ad^Cë^z‹⁄(%⁄u”öGw +an
Zj˜>nëà|îvCëÙJë¥!5NáàÍÕÇåW.Œ(ò ÏLDsÊ*…k6O	tmº‡#ı´ÁbΩx4u¶1ÀÙpR|5E(‹û"Rô“mi˘åıy’Ì¥ΩkcQG3—9Å&îí=i£˘NØpè‘‹8À‘¸„¢Ç&%%™◊ˆ‡,C’ú)‹™Q&CóÍƒG˙cïÏËÖŒuDÖ!p*T‹ç€I'≠Mãf¬ız≈BXíx˛◊©ZÒ Ã_JßJ£éﬁ*ÑrŒÆÆäóñzv¥€:eræé)∆0âZéÈcKDΩL
®æH≥K¸éç$pZ£®'ß·…#m«A\5#h≤¬yÒä§ØYäôÂM3–køh»IQ™Xö)qÛÇã≤i˝åzY⁄≈ó)P¸\9…”.¢0¯¶0cÕZπÌh{vuÙ[n'“|tNæ˛Ó*ÿñ¶-∂cr*ì[™nµ¡]œÜl=”≈æ“&ÛπŒ´>l-!)∏ˆîÂ—Ò-ÙuUN±b`Àh(OSdµ±∆=–ôÂÅJ"µì\%#kiX´ﬁè`/1Çôû!ª ]R–-Ú—ÍÓÓ.|t)SQ6,B}ru¡(˙ˇ°!LRf1HÊÎxáØÆ◊í8Ê8YZ≠lZQÇ‘&ì?z/Õo∫¥˘iım(ΩÂø# Md3ß‘÷W⁄à~ö„@KŒ(µè§Ò±ˆ2àΩ¶…s?[B11Ô ßÎÚŸƒ’6ó◊åÖW3‘¶wπÈJÈy.ÕkÊà∫!‹;îÚØ†Î5≥z-kÍÆ-k¬Æ-+öÆ-3rÆ-[î\„) ’Ä"|äS≥«©dÒ2Ú˘Zö¿îhvﬁUà,◊Mæ¿â∞]§ô˜¢(Ñø@N≈◊Â∏,HÆÇ.é#ÑQ•E`.HlÃ*´(&Wˆ5[YÕutS‡}§3>‡UMƒj¨∑’`‡6&åÉT %¿„LºbN√û8ŒØ	Y”’¬™¢˜`µlèˆ•#;0Íª·l_Q∆/ÖHøù @"hÇôæÔ.⁄~À9π!ò8ojvAT\–∏ü<˝ÃûIÆ∞&U≈C(ˆcıä7õ√qﬁÂ©…}	w>ñ:∑Ã9BÎt[Ü'çZáπ«≠ŸÃ∆±?˜1~uÀc\pABµçÊÔ”dP«#Qöì5@O0∫∂ç‚◊%òìÅy›%@¡{Ú¥b[Ã¥ﬁ∑F≥Ïˆ÷ÆŸYÓ~ã¸7i£R'¶79≈IêQñLºÕZ£ÿﬁ‘Õ—≠~œ≤JKk†t˛Aüÿb7DãîIp∏=hÊ»˜ÒÒˆUó≤É˝Ü◊˘ãÊõµ∑Eã‡M{≈∞}ê™Måcÿ‘eFÌ«¬`÷f—áóÙ¿U>2≥wFYÆó≤¸∑Ω¸}]ñcYÒ›yåáÒ†À{◊∑?Ù–	#»¿á€6–lIØ5ÖÃ∂Å˘°Eä9“A7'8¡¥7Dπ \ :¶wÆ4∫õSÃƒ†çj∞-å9m;∏óN2	«JÿVuôözÁ¯À’ù√„øÂ∂ÇÜx/vTeÔnæ‚˜0?ÓfÜT{CÌ¸∞BÓ/Ô¥´òÀ…ZæÄ≤MMÇ˝Ånˆ¸&∞ªm-†ûÜ¢Ì‡∫l_aÌ%ÙV¢‹ƒ®»e—˛ è≥Dö}ﬁÿkDÒí·◊ïf	})¶Œ∑ÃR	Ô†≠'îoüT4Öáwß*~º†I2ÈÏi†qÅV»Õí˙Jí∫ÿT8	ΩèpMè¨P€¯hëP-ÆDFˆ≈2—âÎS£è[ê0Y|√øp•Éƒàû\ö3Phl∆NvÊeñZûmyãf¬”‰{$⁄∆ömñ∆Ç˙˛yf5UäQºˇ´ÁE>3–æL
hÛ≠‹´%À¯1˚÷–…¨<L%XÙ®N%ª€ùªù]RZNËŒTìœ¸≤.'Oû’Ú-|uo—>ÿ„Ø{°Kj®°óºÚÓ·gämAS$ù¡N—´?‰ŸÁ≠“©´Ü Î¸·4¿Ü9êÌß#Y¨â·Û√"É™L¯Hê¬XÔI ¯NdâKiBÙ‡sÜS≈LC¨YU…5≥ê>≠!ÚNâ hˆ/Vr∏ZÜ÷∞Í¶¨nÃåÙª¡Ô'VUS≠`Yá∑ˇÌHù$§aa![Ï9€@¨Øi-˚wÉZcÍäë‹òı¸›ÔÕfSƒÇÃáÓK+“Ù∫†’—º˘Í<ksê"Æ$ƒV›O8}åK˙Çg˙Û{:„(Ùa~æ°8ãy‚k◊ÅÜ›’©i`@Ê; Aô.ìN¬G®â?uŒMJéL∏û∏º¿$ÊN≤ √’ÃK◊¡õ√÷Kíﬁ≤≠ÆäM¸IŸp∑a€_˘√=e¡$ö¸é[3ﬂ°Â‹áñm‡ú¯ﬁ)©µS•¡Nk@⁄ç&ñ*®©ûd[i”Æ»ß_Ia÷'éÆ≤8?◊Oëz1Ó‹`:˛≤&≥íÙ#L55æÄIwFà–å)†Ùx‡^ë“≥ÍÇΩù%∆∏´Ì≤Í|√∞
ıÒi1–Y‹OØ„’t’å6;R+XÎ≠	¡Ë2ì ì6JzèõÙ˜q"3œlÆâNÇ^∆ÚåSÓ¶?˝≈•øRmåô“=˘‘ªmyñû∆#µ°ÿﬁÆkó´ÜÌÛLy	Y,ëπÆˆuVá]öË„]˚ﬁÏ»ß$WFïjákv´∫IN5QD⁄g€Ω,Ê3.ú¶W¯±÷ïÌÛÅé«ŸU$◊ÆaÃ–ñ ËâÀm7íKO¡"áeª/√äæ∑ƒQJ∏‘õJ2–ªHzÑ€&∫Ø.Ø‘%u6KÏ,!&á≥ﬁh“ësíYKr„†‘s™ZGÈ˛È—)qZΩ·Óÿ¥ˇ˛Ç≤¥∫%J“ZœÉ±Lö9ÉÏÀ<æ‚Œ\lçÙeì:ºÓñ˘ pV
∏ ∏Ø÷Q&≈Q® ⁄ÛìºQU"{Øên+»îåf	rΩjÇbV”"Í»u(É;7˘)21‚iòE≤ÜË:…—-Äﬁ!;ìN;¨Ú‚í\≠ÎπîR3F0ﬂ@]âE◊†p/S∫O;h0¥‚ˆœÿå¥QD2a´£LuS¥“Ã~c^f;Qœf¯Fö@O»ÈV”ÅÆä`ö)Ñ$ˇ€'¿˛¿ı7ö#f:0É´#•Z¸÷-∏”ç£éQ+ö®˙ZnÖE˚À\ñ√ıáÇú~‰&#ë>∫≤≤∑é.`F–r˛Ì Õx∫œ¨—Âüï[©UÊboÖIJòKZg\{.◊Ÿ¡ü‚a√b%úçZ:€w„√7úzÒÍ›“√I·»`úà—8GÔ¿'ËÇ˝¬ŸÑ“Tﬂ’¶K∏ìÇRQæŸ&ÂÔx;pŒßE'¨>¡æSqmﬁ~7@¿bJ]ç˛ÍT…#ÿMâÑøôTó°èÆTºâÜ51¬(áÛ⁄î·î±v¢@Åö bÜ1¨F}&c»µ≠ZÒ@
L¨¥ÕÌÎjŸhæSù€2;⁄‘’Z	;6iÔ◊ﬂÈ‘–'8n”≥ÖõNÌÓ◊¶F≈Ä_©Ö H÷|‹O2•vêÀWÁˆ≤ºg:FC:ã ç"…g—˜i6±l¥`ÿÜ∏*ÿ,∑ÎÖç&†UI≤≈‘#[—‚@YVrkÎ•ˆW£.⁄vËÇ)æjÌh–™zπ*¨ÂõÛZ`sÆæ7Á+%JÖG˜∞o!L ΩFi¶%[¸‹SÖRæ<1ÏíöC%Ölò.Ω¯‰æÜ]∏∑+;?∞v—’Ù5,O	;Ï≠rXG
Û8Me ØX‚˛.D5y‡˜æ‹?‹?€ˇ¶Öx{>a≈^û√§&â(µ°aäìõ|,ÛÀ8Åê˘x‚õ-¬Gö1Ú]»<JØÆzöÆzí‚yH“	˜&Ú0ãØ}”œ ~?b°I¯í%.y≥·"
ƒ§+E$É23„›®”©3+ÆR2ëöÜ^ßv1
vÒ%ÄôQg#¿ =åÛ‹∂áuæg`>⁄M˙°Ój:‹˜<Q£Ä¿}t8Q˜Hõú+b^÷¥¡÷
_R,˛ƒ¬[¡mπ<íW]/z©‹˚lÆ˜WûaÙAŸ„.#õ_n·≠°Ëg^ëÁ√Öô]“<¶Î‚qAKÛÜæ≈^"¢/¿eÒPQ◊<•k˝xj˘Ÿ∆yı´å åZÇ^∂Cq%A=@Z°∂äviúÍ«yª«ÃÈrQ6π7*'ÆTΩüc—Ÿ’wäRŸ®£“ìgÌ’^r±™Ñ n‹aúÚÜvÙ¶„∏ŒqîETcÊ˘ÑZ~èÚÀô˛â‘"·°çê#wcÌ∞≤´+Ùõ√≤Å«!€	èòÁGeÍ|—Ïß†Ú• ŸmxY≥O‘¨ÓBÕá⁄Øµ…˝Z’9DE261‡z÷7U÷öø≈Ë/:’|· ß∏Ú¯Õc+QËÒP%ey'=]EÈ;”Ü:uiä›8èô£.-∑FùÓì∆ä∂Å3Oç˚t‚Ú¬>˘C*©2ã“Ÿƒ0Œ¥4DZ*XØ~ΩF…"∂¬z5∏'Rrì»∫V¡˛thâKÀ"V8v,…kiÊ–¨zÜ5—äÊûl´û»∑i‚ıÂÜîﬂGDªqÀ˙CÓkywBÍÍK{Q~æ∑P≠Í\[∑›9∆õcØ¡ó@˚¨,¥Ë[°%÷≤øË]¯GAPm_¯ A≈Òe§√|–E,ÓEfõ¨FºÈπ•®∆√!Y–g≈eyk.÷?âµëõÍ§∑∫©z/d:_¸ΩL?‘¢?[¬RÛ¸É◊≤}›¸∑}≤ùQ±ÉsÙÙßÎ–¸!çÇƒÿÜÒ‡ßâî¢Óa$\fJµE1L˜ù+›f “ …b∫lU)√lãÍ4$^∞ e„Q%·˙,∏t?ÎVêÛ8#L±ôè≥-πòÿ™Æ¿x9_˝ö*cF'òw˛úäsd‡*pY•	µtC≈>V6`…¥8ÇeE ,RŒ…~Öﬁ˜atxâ¿Ω±∂¥˝ÔˇÂˇÊ®◊Œ† h*6™∑ˇ(Î§%gıë1nˇòÚA>ß!rFÿsÅb 0•Äæ)	Qê—&hß∫}ú˜«]`»§•|ı/{)L»:ööÉÙ∆ˆgfÓÍÃùY¨
Ã–º&~)ûòˇl<‚ŒqzNí≤Äµm?«◊^àöï+Ìl˙ÒfÒXÊMTœkˆ}ë66ê7÷#Më·— W €Kxëπ∞≤÷DÃãD“JB{k‹@¥ë®≠DñÜéVÀö^ÌBÆªr’ÊGP8/íåÒ„L∆cbe.¥‡yEÕãfù¬ÈïÑ¸‘@∫lÔQC]à⁄F—ß∑$≈ë…ñ'Ÿul∑¯™+.¯{wÂã'Å±’¸Ú≤ Çv_fqﬁ›π·ÖDÉ§èÿË˘0ÿπ∂x⁄yã˚ô®nñŒ\Òπ–eC…óQá˛˝>M˚Ô èA’T9	±"› rÄ{X03'˝Fµ»ÕB i@∏ ¯û«ÓèJ2ØØaj·G0ﬂÕ)¸¨ª·'Ÿ†∆–OL4Œ∑kRÖ)d‰Qr’≈Ê†…%YÙ˛gØAeÃΩ6∞§häè'^6≈óXl~Ë(vîÊ÷ÏnX-Ml´˚Íeyò#«≠Ë˚	ﬁøR«*„ArâΩunµêeXt–úgßñ÷+∏Iê`µ‚YÇŒc¿Àóœ'‹ól*é É{K"j∑„!àåÊ˚^˛~ˇk·cwìN'ê 7$o]Dô8J, s«?8[∫J=Ç?«’C^∞ƒ˙N&éU@Üì*◊˘–Ω¿Mn˚€∫ìi`Æ$ﬁÍÚfÂ“…‰bÎ]a™ù⁄&îëm}ÕŒC PÕê‘ÂßLRë&PdØéz=C’-ñÍôı»ùbCRÚCπ¢qUÂÑqmƒÊp∞•Ü;»Åd§°ÅW⁄·ﬁ{g–ñ™∆L¬è[—=zÊ¸ÖY≈Ë|lÄÓDq>’,Xç–t[Rg·®Ø_Dô©Ω#ÅF&6èíAGVåÑâ93^&»ã&:‡ñîv9v’É¨%‡˝ f`x˘h¨Ø9£ÏU…∏^->_Z¬ôX˘R¡HûçäIkÒ7êIHJxë˜∑ífS^⁄˛FC√»b˝‘AãMˇ	ÛúB°˛∫ et≤é·ô…uu_-ÕmóÃ˙Ó∫U∆4H'ÎëKY‹ã»œıNRC2ë3≥óù:Ï>cO⁄#)Rhn=Zc9ÁX~y[<Õ!óL“:K(±™Ì…hQÕ·jˇFô<¬]î}8…#B	ò<æã.Ú¥71≤€öƒ+Íè2/≤ «ÒgPWˇb™=hÙåÆ\1ïÛÔsg˙ÕﬁJîÙ)ò=ÀŸÎfÑ⁄ï©ÃDΩq>f_*1i~2cf¯ò∑váÈµ±g˙9H,ı‘NÌÂLq∂3˝
|' :Vb¿b≥b8\3˚õµÊ⁄∆[[ùû≠	ªõ•˛E ¡˜≥Ó¶ßˇÁ˝íΩM!´Â.gi˚U·Ÿ™˘6õ^-s§Yﬁn,ñ∂—É©/¢Ô∆	≠§⁄[	˜7√4—û—Ö#uü÷aÙU*„\Êa„fs˜”…Llt?”£øC«-“Ãiußùπ⁄≠°‡Òõä¿D¶Ö@€˝qQÕÏ¸ÄÚ√+Î∞ow¢√ô´öKœ@öA/9•{Û‰Òu˜ÌÃîÔ3r8{#^Ä∆zÔÚ,ïË%·'™Ù¥™Ma%û~‚jOz‚jqåŸ®Q	≤ïÊg/…Œ.˜Øïâ@C˜uGº€â‚›˘Àö[CÓ(Œ¨◊üÀK€‰ùt˚Á∆BÒÖG¡∏ª!bY≈◊_oı˚5d°LÁZE≥*ì(ÀU(úvÀˆl´∑”íŒ5V‹T¥â5€Œ˙5gz∞+øªˆ7-§Ûv0ÏmF5QÈE÷â/ìAÇÿ∆$AóÏ≈…Ô†Q†÷π¢fuç´wEø-jC
≥Ú.ñÆóÙ4 ˘aâYu˘yâ&ì˚ƒè£jbC}nÒÿàN:[ÇpäŸR‰IWÍï[Ô\!†’h;7j∏≥SxZ%Á≤¬˘"ØÑSg˘“.4'mS%€h)àJÇeó±\h”Ü‹ä‡˙–˙â?√	-ˇz1]§≥Ä?°úæÛ]V≠Õ∞»
ÌÏπ¸dmmñâˇ¸…öÛ"@H‹KÅƒÏõZBù≤h†öKù‡p∫÷c~iË;'7á- Ó«÷6ö%Q¸'•k‚ó»˚¡`/æ¡8—6puˆÉ∏µ&Õ„›∞≥}óÔH•¡€°L?◊¡˛øK”¬¿]èıL›q?™($*÷c[-ÈÇRgœóé„yﬁ
Y≈`¿]Vb¥πë€€Ó
JÕôfJ.={+_àaÜ‰Ù¥Zﬁ<æ≈s+è–¯CyÉ’-ﬂLf7òSﬂKD)'9ﬂ `—ØjdÆõ˙h£ƒcL´ks≤0Òﬁk∫U⁄Ó,=sÚaBÀ<Ö[)%)f‘¥'r:D≥í"ÿ2é•†pΩ|i˚àÇmZòê‚ˆO∏'utáÅuLSU4:´UMpì∏€UûÜÛIÈK* <àòﬂ‡[îœ˝)Á)W'*©.:⁄m#_U9Å¬ü≠JÓd∑4[I/<V˘Çæ„~+-8Sèâøø}åÖzsm3sπcÑ≥l…º K>¶K‚Ÿo≠•Ã^sºÖàO«∞gÀñd∑⁄2	Áf
⁄6∏ÅŒ6N◊<“O≠≈Ìéñ*{Ò[sóΩOg (#é1L‹/ÑÂ¢§íı<ºƒ±ªT≤a.Ï%/–Yt±Œ$ö∂l≥õ4•≠¿µ„^8œºÏâÌ4Ø√ËxÊÆûs!CÜgÂÅ]¡PË	˙=Àæ¥Â[<¥–wÒØ‘Q"{Ç—?≤-ÓQhèAù(‘‡~Gw|Ê!àﬁŒrj¥Sê‡˘<a∫∂Cü2°Étˇf◊°≠]—Ù⁄È∆ ï[˜˜X“‘s˘‚#Pmó¯€÷¬÷≠˚1m}ºI` X í}Kx?§‘|] µæt8du˘¸µXe„ŒÎﬂ˛U‘dà≈DÖ´≥xiOOBS˛˚eÚ¶÷FÅLXk"«r≠1≥°UªYO'm3ñ∆≤åím<˚s$áÁJ¨ÍYÊ°q%RJ˝›¡Û7˜i<îüD∆WﬁéJ∂ÆÙQVt´†‘L…1€ó9‹Ê\.∂* ’áŒr∂!_¯P.2q≥¢@«≥hI≥ç⁄•Œ∞ÃòÌüÚFÜW∑îÇ@ûZ u®’ΩUoc%Nº®eÖ€Q6”æÎh·sªÇ0CÔq<h'ΩπΩUw]o∑‘óΩ>æõ⁄˘˜nZ•∫ÁŸË>6˘
›¥Á©/4´w1Í∏2‡1!ÓÎÃ≤@≤ˆŒ,©vã=S?M`;Ê’_äóà‘-Pë,Z+ˇ VVƒuí'È3BØE˝ÙÅƒÎ—∞√<Là”ÅräUnª¢ì⁄k«Ω1Ö°£–ê¸ë:	ÇjS ô”„sò≈m2≤¡¶â@ë»ß!IËêV¸rïoH+ΩØqπY>3¢–›ÍUüÄ¢üÙwÇù-…Ø›ïKåî¡¯@÷Mww8—yDi”÷ìπ9˝Û€≤Âù∂[Ùï/ˇ˛/„()«2óÂLcæï8¥Ù£Jw+¸S€èGHúõï'¯€åpÌâÌ	∏W¯W’S‹ãÑ‹¶li«5ã¬¥Ñ˚ˆÌ∫±‰“6&Ωâ;æv·—)pÜΩ∞0≤IBæ8˙¬7˙ìØèHrtœ¡#„˚#í@JZIÅ Ã*?•©›/Zhæ∑ª÷:;ØˆØÉHyxÙÕëπ¡6vÓÏ£h»#€µù|∫e®Ãs(Ô`OÏø⁄;;Z“Üf?f}jôòã€—™ŸlÍOóπ◊ïm|∂ìƒ¢ÿw¸uùæ\eIG‡P“‰+2d√µ£.I}{y¢{w∂˜jÔÀ£√=øcRÛ‰ù≤+˙•‹«Æ˝Üªƒ›;hÌøÚÎ&ß≥;T9´9ñ|ü|Óä;ÉûõazÓHå´CÕ¡ÔìŸzﬁâ§ÖÔ›T›ŸﬂmÌÜÔ@UÈÈ7ã®ﬁ–ûûµvÜºÔ–
Âe¯—ck¥èƒp‰jE∞õS,∆›ïıGKA∑ÀÖ•‹ˆN4 •$ÚbﬂÏvπmx≥ÒñZ·(‡¬^c¥RAHytµ¥D™_∂>æ‰:—#Ãt;(~Oeºu5PE˙üqN2X›WÔ.MC}™:Q~∂J‘+<@›»u'xit¨ÃÓeÚÍçAAe‹t6u
*+‘Oä"µ◊øxùﬁËÓæ‘Yé⁄ù∏aˇ:¿≤ﬂôa˘◊ŸcÚ©2∆…êø†ÉM–ÁÜ˜ÒGÿ—}t
√Üàõ}ÁW‡e¡
ÔpTªf∞fôØ¸˙ñE∏ŸUF≠˚0i}JÉVﬁó±ÜeµWò±¬F¨G“àÂSÔÆv2Í⁄UhàÛ≈“ "¿ûè?B’ˇE±˙Ã«1ÔÛ{Êòç «ÑË9≠4=nÆô≤~‘[ë«‘ÿhyciªŒJiÃ≤ﬁâù†ôÒ“ÛvÜÎ'Òa≈”íËñ¢EeßÂÆ$\»P‚ùÏˆOT[á∂≤Ñú≤E*ey≥œ*ÇMí™‘Ó5ˇ—Qav+Yë™g∂e∆5knŸ€ûöWü«ÜÃâ2'[œ»FA,k÷_rò*˚+üÖ∂Ì€wÃ+ﬁ¨ûØÚ@Ø|nUI´ŸG`n0r‹«ª_VûNÜ
•H)˘3X¢ÔeÑ|¡)«ùKÜ†%ÛÀ¿‹l‡•˝bÕ7-€≤ê`%ı-49π∑,I≤®Y⁄kK/„C=^fò]úLÃ<—˘ÄïvØ≥À¨µ<5pëô÷d÷H„”µM´…Y>wÒÔØd˛‚_ıA'¬9ú!ÓÎÏôLÔœ:∫Û¥¬8Æ∞Øf ¢∞Ä≈ˇÛ±ı=1Ï0$˝U3‰,T˜˝ôÁíe_/†˛ÿŒÖ≈Ìyæ∆+;®ŸZµDF¨/†WUö˘{:_ê#˛ﬁ
Ö™_Y)Ó&_ZwÈÍmà:ˆñﬂœ«6Xõhi≤Â74o´≥´{iÔ…Wã¥4ªZ®çÉ(o'îÆ·^⁄⁄¬ì±,ø˝!K“≠f>%-r—œfÙÀ.¶ó^·ôÙ8KQ≤⁄ÉâyŸÀuAwÆ¡[¡}by‰ipc6ˇB∂¯ˆèiïG]9!+D‹‰MÂ≤UF/†ÃªáìíßSÁ…`ÃQá1˜d‡ë…X≠DŸ#D◊í	Êˇ
ˆ≥£,YËBPÙóNJú{X·ïW‹û 3çªt4VΩ˝∂)Ω;Í/”¥GûŸæ¬àV¬FÂé&^Y%Àê3æ)∆ôï¯ñîöâÔ`√0e˝4`]‡^Aù7î˜÷Ø«ˆhyb≈ÔpmÙÏ9c∏≤ñPbıª1ùπ¥wWÜÔãÜ≠KAo “¡)ÓO£
Qe~(är-Ÿ3iÑäUπ®ÖuY(‘˛†a”úLıîö@CÖÃoÎ„◊fjß2⁄0ËÉ¡n>ÚèÀ‹#`út•Ω¢6-/ùô⁄iê_üùv”·ä}]iÖÙ	ôC˜I;—xI
°}dPBBúW¢ßò˝¨éX9ôsé≤p¡ÔCÿÄ‰ rë‡ &`BƒA‹À¥o »Âò%¢!$ÍPÔ(˚‘≈ÆcrÑÑ∞Â;—w„∏ì”÷S*ì`æ`7ˇ∆∆€Je<àö°í‘Ω¬$ ¥DæŒ	¥∑YÑñ≤˛˛ˆ“A7E¢*ìø*T~„ %@R@~€V±e0:Æò"¨wBi˛⁄mîu»>!ZY6Û£»	áWá⁄Sﬁ*=ûÍMﬂÄ¨∂b*∑á˙®§@Çe√_3Iö∂GÊuÌM6ÑË‚ãF•Ô∞{ºlsæ¢%8&∑º÷˚ﬁ,'\∞®∑ÅqU “\!Â
·ÑÜWFKa–W•	A√,Kü:<¬ÜOTá»≥|3Ø2∫ôº∫H⁄”∏•-âèüSi@∆ÚR*#≤=fõZTÄñ™≠:∏¢p ‘ø™ﬂ/Òaf]≠+"ºêŸK∂L∑´„f;Úø%Æ%|êê%ÔqâQ®m‹Öv∂Caà ≥Ãö*Ë)›ˆòk7Ûπ∫[äôfæ®[¬ó÷@P≤≥∞ñ∆(W4hN®∫_≥•›ı§ú´æJF©MZPßµ‡∑Âî!…6+®*Xì2¶ãì1G≥b¥föXKÌàOtYbXÔπ≤◊C˙HPÇ)Òè˙m’~#‰F∑
}1uf°›ˇº[ö•m©d’Múòác’¥†´jÙﬂ$ÒÕ◊	¢3}0:˝ãf›”ÁK\Óp$)&áo˘ı¬—KNÅÔ‚|fM≈◊&{1≈p^gÈ‡ÉêJ“≠ë∏[LG%ß
¿›Y¡€Âº8—p∆ïÁçfl◊◊ñ≈˙ZÉÙîÎ2p7›ÓŸ ) ◊⁄Ù`Qtù;â€q2Ω¸∞ﬂÓº¶l{wa=+:¡+zﬁìèô[LÓ)∑¡	˛"Ï(=‡ÿ\„«)e—‚rﬁ ∏ç≥»∞BÍ~'æå∆ΩB¡‹rZ¯¯Æ(ï,øØîõ¥ÎÌƒ9jˇˆﬂ≥)V^˘ºaªÕœ^LKö¿!/Ï<><™Fæ8˜±AwÆ,LÃl„◊ÕvCçùV”oï°2Xæ‚dê9”≈f~R:†K€Ërt=oÙBµô\<òﬁ dY¿ÊË™Û·8J:&ÑáyL±9&…ÇL‹k«—UJﬂ«ÍH∂
cqŒqô⁄[¢±ñ<∑I≤DcFâ{S¬>Fs*LUıI–®P°K}ÍUÿiO%z™n“úl
˝Ö‚ê/aÀÅ´°nï…iãœO“t‘¢ùﬂYtQØaêÔ∫¸~‘*:g√û´eK)ªÎ√Yœ¬+gŸRy?é?…:({çhÓà=°é⁄‡π	£'È:U˝€øäÎáÊ∂>¢˙TãUªd±˙ã_¶⁄üdôöµDπo≤stxv“:;:?=kùΩ>=’zπ˜ÍÙçL˙<ŒIπ◊Ö7íˇ,V ~t¢÷ œh˛S/B¨A∏
•˜¥
•π
ôf¡2î˛Ïñ°¸€Ó§oy{øÀÍÉ]ñKO™óûOµ§§≠KJ˙ÛXRéNvZ{áÓör˛Â˛Œ◊≠7)_Y“øÜï%É]ÖΩˇ+NqÒØ»è∫Áù¯µLÒ˙IS•ÍGóªeçT˛TﬁìJµùÅ®iß:â™ÛéÃß
Ì¿öK;ŸÙ€ZIµ≥éù9U}Æ∂dú<öçh«®V¨YÑ°¨&Åì3i›œô¥â{ˇä6îìEKsÅ]vqoF·K~“UÑù·†t≈®ƒ3¨‡’o∏¶îYß¢xÂ£ôá°ïg°1°Å¶r,„ç±Áp#œåS¡mùªY£ˇ~Ù!ùù|ÆÃø*è=qß8ì›õ‚– 7µ\Aähî›˛PÓ)ßˇ&úíH·˛∂L—.Ô/≥ΩπÜ‘˛êññÁ‡Mﬂ∑9Æ3‘∑ä⁄øˇ„?âøΩ˝A\FﬂcŒ¡aJ‰ΩézËt i$@€Ï´4r◊Rk((DïäzWàuùJT˝ù¥∑ÒKtç¬Ù"Ìueë√¥É@R®ë2∑”˘ „W∆√¶ΩÔv÷êUùYœZÑKá{¡z™k˜ê;ÑŸ?∏K‡4˛›|‰Çﬁ!b…`{Õ»%I˚ÊK≤ê ’ãÅÁ›03&nﬁ±<m≈£"{†YŒ\ÛE!v´V=ò3Êz~ÊM‚JæùdVÂh]>¡¬*[ÿÈÅ ö+¿ßt+‚~æ∞csÖ˘…ó∞_»‰>_úJµD‘[ÈäM‘‹∫et´íë?W¢æ"–ö{#'WÖà®äÛ£ë‘—t+)ÎËø˜K`ci[¶ëxu˚ÁÔ∆I'ËDpëtfhw$πåÓ¸—hnmO*)^ºyÔÙ6ÀCAÌ8˙ uÜ∫:ùãHSYï˛	(]nöÌ~.G¸;F◊üÏ*Ñ◊ ùfaº>Y⁄ﬁÀaê¥ÀºÂ˝ﬁW0Ê˘jÆs°h~L&ÑÄÖ,3ï¥3 `ÊΩû %‘˙ûMü~ˆŸÍ™XYYß{'ﬂÏÔÏù‚≈g20[Jhˇ÷éôm‹CwÈ˙D®¨ò,&|SÙ»∑Ôm	˝“µxjLB≤ÿ7˘¯‚,∫X¶ÏkÙÒ«9Aê≈œji~éqÃØø=:Gã~mªnRˇty™ù≤Duaï	≠yÛvª˛Ê-ˇå!o.;t¸cGW|»0ˆ
¯=ÎiˇíA9È∫»Ló™Ÿ∞m7iy˛°˙∂ƒöº’Io«—‰b˚¡0K“Lfñp=µœ$∂¸MŸªºå€#À"ó\ä˙{∏ <%˘Eˆ;ËÀw„8˚†ßËTò”!Iı\MSº÷–:ÙM7Œ@$¥e°˚œücƒÅU\ËOH`æ¸ iÉ5~‘r‘$ˇ+VÊ≥tp:àÜy7’ø[ı\]XˆF6˛ÊÖf'mÀ£
+P—Yr·l6õù&Ê]"–Pm7îh ”eÒ∆n¸[IZI#âı˜z_”†èKOì`2ËdMòÚ±Ö\)< >ò¶Kë1ï∑õ∂Î¸øEÎeÅƒ√É!Uû)⁄‡LE;µªSvMÃÿÚ¥7„,K≥zm˛¸o4éz…˜ò◊Fñ—IÖQ[ò«Zâ§˙çáä“E∑´-‚
hMÅg›c¬ÊJN'Ÿä$WGcƒ°øw'äxV<+Ê’SΩü ˘∑ﬁ;ƒ|"G[Ü\…—ÅEùeYò'1“F¡ºÄQO&{ÜˇÄ: ÍkhÒ YªÈÿ@1!}Gçß‚íiˆPm£Åˆ~ù˛ÖÌ∆ru#ƒØàT<7ñà∆ï,â⁄∆	ÙÏ∂(1»ø[2~Î$ΩÅë√ÅV7`¥»M>F†O»Ãè5ÚUk4ìê~ƒÄj‰ôiú)∞]g‘ä}3Ìÿ∑ƒnÔf∞\¥G˚0j˝h \V„mßD6Ê∂7‚≤U$º≤L˛RpD‚p›‹ù2‡ÖRY
˜≠
Œ⁄¶ú÷Âœçå¶ÊÀ'Á˝x‘Më,√‰=£âûŒOøÄW‰O≤ó©xæ∏c>ö6ö2ÀN~¿k= ò^qÍÈ±oàQ7Ko/<µXáÿ}®4ÛÄP‰”c√LèQ¸Âi;AI≠ó. W{å]≥dX‘È† ´X3,Rµ`l˘+EA"’“-˝£x¢◊ÿR’qµL≥å©eC €ÊK§jZ-fEãqQï∫µ^D=D∂›íßb˝Ë=:ùæ+Â¸«fèY\∑ûöA˙Cyæfx…yá∑x»†Üôn√ÙOßqÙô†.–cÓ≤†°êÃÃ&§Ë©Z…ÄA«˝AnÇ@ã®O‚1Úy*VÖÃ`w3|∞µá∞X∏pÎæŒ]˚H˙cø–ﬁÿOƒîáØLÜòi‚EâÊ<XTÓ8jÓã4 NP)lëÓﬁvÿˆËv?¡CkjÎ)ÏnT¬à“6+Ü`ç—ßB^´âUÿã¥√u⁄,cw©ÕÔ`á˙pRß¶¨°+˚´¥ã¯)ı™^éV^û‘P]Í'É§?Óâ˚êFª…UÇHgÀË3|Ç—ZÔ‹Ê©y…{ÇPèb7æé;U5ôæ"Â2b—…M9‹…"<
¡πÔ∞S™§œı' ∫m∑æ:2ß1¥·é?âLN4}£Ñµ^Fù´Xò~iÄqËô‚•ö!O-k* WK˝XKh||eµò_ÉÇÂ>¨Â„6¨P<≈sÈÅ∆ícù	e»`∞÷aÉ”à_¸¬?∑Õ1AÎR±◊◊Õµ∏¿ß“^_„ıÌoˇ9-£UÎjÅF
∫hò\«ÙSW≈I<JPπ% ©ãî1`ò+¯éO3.,[hî{êí£tW¢…\Í0yEuÚ´<∞5≠´4ã<ìpôæw‚ü(!XWX˝|:T—√°e@˘<Ã}ü*7 óÿé	J#÷KÛºøT`Í´|∆K%~K›ï_À∞j9…ÁCXˆ‰áÛ®›˛‚rMg—)n∞¨èWÏÓ˙öá€ÔÔÄÎ©êÀåÔ”m‚πÔì P?≥j˘t2ú˚S“©r∫'wrÍ.J'úXíJkaiRM°˚†á}ÙPÙù/K¸dÛq0ãBø≥}2-VÄBQÜÓzÆ.F*SêG¨pV‰/!m÷>∞Æp‚±Õºˇ˛ˇ¸_¶'à!”aÙÁNƒÊÄm	Ñ
„/›{K:≠ÂdVÊ(˝ƒ¥"(ºÿÅ›P°nœÍÿ)∫°›`j-÷Aﬂª¡«£êñ_f–ÂÓ
7Ç%‡ÿ'L¬s	®JÔŒo;<¥“7@Z¨ïSΩ6O˚x˚+ñÔ]π)´YA€Úxñ’«H¡ôsÀ√v•«*Ò√CÌΩ˙EF√∂∑ˇ‘cûdÛèï›ù}ƒfB¯yø-êÊ“ˆœÃÎ¶~]F¢ïç•lCœMJXµ0Às˜ŸWÒ Œíˆ+xqÑEJÂÙ∂äq^æ$\¢´ó\ín‡ÿ√Ü)AáØ≤€–¨·îßˆÊ¿jÚ«‘~å&œÁmQr¶ÉVß√xõõ4FŸÿˆÖ≤±‚ﬁÎÄ˙K¿“L»¨56r’©‹Ç¶ì«ÊUÎˆø∑NÂb£π€ˇ~zÈ—©8hænΩöëŒÜÁf{‚;œï°â≥í°Ö Åœf`}2√Ì…Ê¸|[dœò+◊ïùpK£Ï\WÅå[‘¶πse∂7ƒy;:<kÖ⁄-î˜-òˆ≠¨°e—NaRW;ÿq˘(œ*4ïc2»·±D……˛3i}ÅG¬'ê2ÔM√Ø/:ÿÖµ–Ó`˘~\Swe}]–Óf=⁄ÿ‹‹ßu<=ﬁØ<2∂0"i˜Ó@m@§∆{ô∂«y ∞"‰›WÔñq-T]∫àí˜—“ˆK¸ÁŸ™|6◊á:ôÀ!˝ª–ßQoU∂‡ø}6Üq¡‹ ò<Âœ#Ñ\ØÂΩ™r@Á%∆ö÷~§H⁄›;›9a{˚ﬂéP2i—»¬W∂ßÇ¸_∫0ˆqˆ|iÔ∑[‚eÎpÔDÏüÏùûâıﬂÆà˝W_ﬂ˛è”•Ö‹≤°îH≥∫˙MÎ’—â8;:kΩµ‚!¨∏£Cd≤T˙=.,˜ãdnıwíbBñ$¥©:ˆ;ç≤n˙≥ª'ˆ0∆w∑v∫ùC€‰\=t#Ôßúq_ΩÈb©ÈãèOœ÷\f§_‰u˙åf◊PrF•⁄M∑_EÉ€?F™Y∏ìí^Yôÿìáˆe=Õl,ñÿrf{∂£∂(†Ì£˛ﬂSŒVˆa(Ë¡÷5còjÁÆ˝√o0VÒ‰Ô…ªnJç3}CTv5Ó$‰[Àì˚ëƒ¿æ†¯Äö&^ÓÔâqé¯≠£çøÉTÏÂ£]!Ë–ùÓú≈Y?»¬	KkÎ√Äê´(√ì˘å|'ñZPà†Û±¨o	ø>ﬁ˝8Ì˜aK˘À•{E™ jq∆aŒÒ$]Ì•W∏útLö∂”ö*'¨Ï+π≠I}YkÂÀBeÁ‹áÕ%ﬁE∂Ëê7êPæºH ‚xz®æ€RN.◊)î^ ñÿ\£◊Fˆ/ïÛõ¸ñJáos¸˜Ñ€íeAÆá\‹é{
=é≤Qk∂U¯6tJûÜJoä!ªvÙ/òAW&ùg\‰¥¡Ñ€„AÇÁµ„A·îu:J€ﬂ“,åúπ†Ç—ÊX∫]¨a·˘®∏JrræÖN1^üöÛsî ì-¶í05≈X‘JtòÈEjÏt	±º<¿cßîÍË·ôUÚ=∫Ω»^°_XñòK`Ü´qù§Ω‘¥˘PKﬂõ.‚µ˜,LÎÌ∫ÀÈ0∫¶£4û–œ†œ‡gïûxí—l_'æÿ0ˆÇ%ÑÚ˚Ú[S±•nÍösst= A≠(≥ïπ¸ÇräﬁKÌ—J7MøÕW„˜›√DØ„ïN<Ã?ìnoz∂∞ æo»’ÂŒ_fïE}—Ñ˝P#v' ¡”ä©©◊Ë\g˘ Ì£3	Ÿzöà`†("¶ö&í∆rˇÓ;ÖAwø©Åì πJ‚>Ù#å‘ëp€„|å≤É‹©:Xg:Éx–˜aN¶$£∞f
Q£^£@ÏÉÃÇ{“„\h#L/©™æ$â«|–pÍﬁrèú¸˝_¸B<`¥mxyyáY|ôº«–ËzQ≤ö÷îûÉóŒ‚èOvkÖkˆÍõˇ£µÚ— ˜∑ˇeÂˆˇ{ª
|Z´1√M˙Õ¡Û˝Ú˛Ω{8QmöÆ<ú®£‰"TªQx1Lﬂœ„œ¨.E(w–s÷Y«/È |¡§î„m˚É¥Ï#˛Ç§≥_ñB—ºàóÃ›d‡πÎ{f#˘ñÂ#Ôe#7›ó•¸=œ•Ã-ﬁgrŸ˘$¥˜∫ñ⁄Œ´I~Ó;4!M¸SàiıA§$:{_
yättﬁG—~ûêl/∂J‹+Åœ˘öˇy¨%?#íµ&Ñ*Tù˜’Q$æÁá?º÷*b>bw˝Oÿ:SlÙΩ@r:œh!*™(ñß á"æLŸ„~«Öø•5ÓºØ9Û[˙‹o¶Oô‘ •&ÍNï≤H:ò*∑“rgR5‰ËN*ùòÎj∆7öÒwuyˆŒÍAGrF’,¨Qª0“≈S67Ø	˙€féàÅkÓ° ÷t‡æ€©˛Uä°TMôJ’¨{pY¶Ù∆épπL&Ø˙CpYV∏ÒôÂ˜›!ı/”D”\ÂÉPﬂ ïxK<ú¿ß/ö}2JS+£Ií∫q=‚¶ÔLS/Q$˜>X˛¯r·ÊæÑÖ#û}hÈZ”C∫˙°çÊ[;™ÌÌÓüµNƒ˛ŸﬁÅå2oÌ∂NœNé–D∞x˙˙ Í«'GªØœéj∆aj^K˙«€–1UÖÌÊÿ5ﬂäAŸﬂÁ±\Àt!◊^€·(hò`.ê@msÖø˘µZøs˚?v˜øÇ÷√^Ú‰H‘OˇÛÎ∆ímC€çì˜1ÊöºÄùb[jdW1Ó≈Iïª˝uπ¿yhwË∫T"KçgÖ)3ø{cµ"ÓÀ˚NÎlÔ´£ì˝ñgx◊&˜†9{„£ÃŸ%Ï Ωïe”|&πçBÊê3≈`ôèO·XìÕ6vi˚TˇıWÈ Z˝÷ºﬁÍq4å{ç2À≤S¥iü·?òµÁ˙öÂs~J√ÖåŒX⁄nôﬂ¢æﬂÎﬁ˛Kæ˙MúíÔÁmIáíˇ•˘“ˆÆ˙˛0d˜g›O¡ØØ˜w[ª{?KnEe~1NïªÅªrÈx Ù–±ô®èÛ2¡∑WK€ø'î1∞â˙∑WÛ~Ÿ_⁄>à1/‘+ » zÓ/7ÙßøG ÃTÔoÃ˚5Í¨K€®üŒ˘A/Å™ñ∂_·?¢>˜DçG	Ëˆ8W˜‘/—∂KÆÅJÌ€zÌ1h»q>5$*+tæ©c-X«'{x˙jAOZ¢æÛ˙ÙÏ»;Nê‚ÁK'C+ì⁄¯›iy2∆∂;ú&≤íﬁ}≥w∏€Z§SfÎ{áN1{‚GtÍßwg˚«RüMÏg)ÛÙ.|1πWòjÔ*˚‘fci[ôﬂÁïC†d	M®_s~(Ì®å±èXæÁ¸7Á07ã^R§;ﬁ˘K[∂	˘Ëlóˆ@≤˝ÊıﬁüõKDFwW∆∞%,çºÔL*üD%|‰EË‰±\FŒú´©ìM4k9q≠,dsX©fxrH6IÛÈ4ÈóÇ)›;udCLÚ<ˇHÚ†m"Lü¿YÎœaJI4X‹¶+√_ÿå≤ı>)Ø¯¶e≈$<æ`&iA)%\rØ˘Ù”«êƒù7àπ0-ˆQ95 Êª3ôC“y†9
∞≠k™≈E¿ÃhΩöÂç√œ>Ó¢5[G⁄˜¢8ówË‡ˆˇ<‹?8ı÷´Ωì≥÷LO#}Psá~'ÛüºOˇı∑–ßY]±N\Ó–Á®ˇuÍ’—NÎ’˛?¥»≥œ16ÓΩﬂ«ñ^úd∞•‹;…NàÓ–EÎ‘iñô—º≤Ò'≈˘/'$}˙5Î∏x¢wÃeœ1<“üƒUÜiQ∂xzoù|ı6À∞ Çfy¥z–:€;ŸG_√~É<ä§— fÎŒlª"VN@.˚Â£xj˚‡C`◊õk°±+éﬁÓ2v‹Ø‰˛òsfÓLÿBÎ…MCÆ|3’ Q7◊|ÖÂïÏié«ë„AæÂ∆õ|t~≤‘^«ÏáÕÕ_ø%4•õ≤ƒUÿ∂î
„&Ï®m≠”¡7Ê_ª≠aº)Àæ:\-F7QÊ‚Å•>ê∑`æD∆¡£b‰∞õ˘4f´«˙±ß‰'X7H¢∞≥˜‰¶∞‚äR‰X?wAÿ˘ïƒç˜µ>eBS›>%f«≠›rËnâóG/˜[FIo≈\Ù—ˆôãÎ∏èáNË
)–®iÚ‘√2ÚÂqÄRñtÚû“ {‰IØPÈæ—rGË∆E´ƒ;À8ß%ﬁíÊ‡œlUõ±ñI◊r£‰ù<î‹”NÒxÚˆèëËﬂ˛y ≥sYπßíìôY÷pœ∆π˘◊≤çµ&Nlóò_«3À!Úû≥CªŸÔq.˙X>ãÁCóûaYQ„dø…üO6¶[Ì]Ã¥∞2lŒ≤’ä,∆ –ª≠ÂaÑ)1ﬂ2ó•ôá⁄ˆËπóãƒ|ThÅˆÂ®#–U	ä•◊Ì‘´‡˛c
Çë”m’ú7ßË+3Ë§08Öo]˘8≠˙≥ﬂ˛Òˆ∆2øÑ∫èØtÆ€okLÿ)P>˛ñﬂªqZ.Gk]F_‰lÃ÷ßÙÊñháØÒì$◊v48à—Ul*áj<®„«/–¶—Å›+r¥ºaá∏”"L°^@‘`ﬁzÕ/®÷∞†ZQUñ ≠¯ÀÚ⁄∂ºµ}îWÙ‡“é⁄Ø‰oÀS€xrTÿRˇr«ïüÆ¬N¸Ùà9ÚÀWg~∫YÌ–/ø„N˝t«qÏW˜ÊuÓWÖÜ¸?30síX8(Ú†#˘]˝˜îø^Ìóõf|ΩÜ‘%–´(oKhEcËîNiÃëoR
1•Ø
ﬂ∫\9◊¡GOiﬁΩÿ©´ı:ˆGÁï«≠T›∆“ﬁsà@§êP‘…#xÈª“ü	Ô‚/s◊p=QW˙©d"|¬}ûìÄäqÄ.™2<#Î”NœÊãÈÓÎ¨_+ÿ_1æÕ˙1c:"Äqh.^–ú™ûKˇe˝C©Çq¬«˙ ¥±ÄD§ ÀÛ»ê°‡n|nºùÉÆÕ√K∫ÿﬁŒæO≥µA≈O∏#1,J!sü`Íó†Vtä&8:ΩlÇÌdlóÈ>ñÎòÍ;€€.”~,—≤åQﬂä˙¶Õ‡ÊR?∑îZ|ÉªD€-‚OÌô‚˘∂%Ü¥?ô?”>´·x_¢i^µTÇ1à1îBã-’ù¶zR∞ï6i~yMáõ4”•ˆ]ÅyÆü¢0ãØ%Á/z≥›ç˚
‰ÒË-àΩâJS!°sD4‘TÉ–˙¬¯k˜\ùêT‹,Óß◊Òéj∏Í &ù7˚M?JråDP|Z+ÿkΩúP\êSx™ ~—øJ„+ä)[√S,8ºû‡rc/8s‡&ÎuÜ‘ÙU¶T/Hôx’*ú 3ØP∂úÄæúuû†pÍÖˆó}k• c/jwÎØuØ_7©ﬁ€“ì€ˇ@ò¶êzE+
íø∫Mõ‚WÇJkj§eyªpvüöﬂSß◊∏
–˛˚\]¸à÷DdÏt?][p#óƒ78ˆÀlÃﬂ™≈Q∏πΩ¯8ï∏^u·Çﬁøh≤WDƒ.˘GE`ÉªÂS◊=–>ÏOÕ¥∑^õ:û¢„ïß`nÃ•=ÊVgm©GÌˆ≤H®IØ[bùî5‰,”8ìåÌEˆ;4Àˆ¯köIT:˛v›¨.J6Ë˙ÚÉ,äﬂ°2Ï8@îΩπó~®2Ë7ÊÖKk€ÅI™c%hQÄﬁe¿òÌ€\Øe ∆Ùzzé£\s§î˙Ì™ÏûjåuØhóu[6±ãâºπ•J|˙ôÊl’`á8{Æ∑ƒ\`Ωí¥~›–,∆®ëóScY\ÎU ª8 ⁄]–∂∆œ‹µ66µÁ$,:Ó|ô‡.6ÓhU^>Ä5¿^c≥	|¢8ôØ~qÓ{Õ)¢˝^¡ŒP≈˙8~VÑª®¬ÒüÊ%5®ûêHHä0»öSV±«îe¡;8Å0À‡Ø≥¡Yü∞õÑ3›l6±ıoïéqì»¿>ˆ,∫≠\íÉä‹ßä◊eëÆ¨3Ÿr/ä–
Ÿ‰ÃÂIu£Ú◊
ÒM≠–Ï;gC∞n$#÷\D8∫U…Ÿ1Ev<¶™≈πi™ ı/˜FÛñYåE1&Åû!çŸ3ÿ¥lÃÅŸgç5-
f¶azG“d?z.‘∫m´ß∂Ã‡].ÃIß–_mk!Ì_¶≈S≠Ppyå˜.i3™I:ªIe√(ÿπÆÙ¶nz≥ì.ì¨_∑˜ÊIíâ•á£XLó^àΩ<èÑ¬Ω£§I&(L™À8EMqå^…•MN.Û
@Ç/Qò6F¨uaf›˛z⁄|z| ≠ÕdÇT„Í,x—&∞e.`!ÌÅò∫Xvº)Œ”¬ÙAŸ·‘u¸=¢fË1 ~^∞ze◊–®∆4R´08˘∏∆{W`∆˛U¬ìë⁄¿#‚¬Á—ÎÎeˆ{fºáAçÅ‰ßÓ±s’1∑}¢=j-T°Ì"≤~ußÊTi¡©:0’Js(}y+q°™9òæD.ØD%Çá ˆ’†á-ñ`⁄^F &MY#3Í4EkD©W®Ùwcﬂ]°ÇxR„u˚Ä|	Òú≤¸%¬N@˝ÿÛ˚CG7‡	ÔKÒ=.˚LJÀ˛≈/ƒ3ö§;I÷ÓôÃßˆ!ê];ÏötQ_é{2Ï1à¡Î ﬁÎµá»/¬$XúÚDU3
8¢–ø1}WñÉAÀf°+ºõY_¯îÓ^ruÕ'13q0¬…üÌsDÏ ﬂ•Ã,s\-ul¬öyN[Ÿ{‚‡ıÊcµ8îvYØÀ»Wj'ﬁç2k^Àú≈ÃIƒ>è2»˛˙ﬁ#é§Ì@m?;éÌ§gÂË-Ö˜£jÎ∑”tπ‘Ãlªv?57Y*Ï<«¶…gYîw7*õÏÕù∑ÛCÀ¯ô¿Êƒq!D¨‚π¿CÓ4d^ºê≈†BÊC	ô d>\êü‰.ò?Wù√¬épÄ9ˆ;ö£æà.;_Ô\çÖjs¿3äRyøJ3dÈÂ÷ÙŸI™ÏmëeÅµwE;Ì#”>-m§¥@^¨® ?Ùá≥]yì‰˚}ÙN–GÔ˚≈uÂ1˙e“ì Ã'Ò%ºwÇXeMx.ü}}väûÌıb<∫2∂JøZP∏Æì¯Üù‚{˜´OÛ˛˙Iz£º‹ªsdô•OWYVäæÂﬂÃ∑É¯äxlßõ¢\∆o≠[∂›UnÖ…∆¯=Çg`æ\uœˆpP{rú%‘E"˜v¢_©ãæÎuº•∆M∫0Ì·<ˆœ3ˇ^ Bå^Á/öo÷ﬁ[Óx”ÃcÃUÜ'´∏_^ÇÓßÖ÷å≤,˙íBFæénbÚ0 ÚXÖ|ÊøÌÂÔÎ≤‡ﬂµRLsqÕwNcm^ﬂ˛–√lÈ†Èhá~{∞ÛËu£¶êc°¡#"# <Â†≈ÕˇFmC›§ë£‚Ìü`ﬂ˛Ø:÷∑# çH/≤‰*"˚H⁄¨ôÜãíÖå±:ı–í¬◊âò(S˘;6ª⁄ÏËõö|π§õ	}$ı °èBföYë¢ÏªqrùZÑr¬à5ﬂ√»ÎÒ24bq~¥◊'‰.‚¥◊°ª⁄U©∞òmÀ´	(94®8'xıdQ‹ÔIB:üÀ,OÅ&∆¨TiÕl'ÒL&`∑≈õ<zëÇvék¬˚Æ»~⁄‡YJ_éÛv$†ﬂZ	A¥Foã9÷	M®ÉVíI´•=~/v‘;?ä:ÙÜ°—ßrò&)‹:L˚Ê¨–ŒπøOÚn'ÛÖ‹í0≥m;H©9B™îçÄ—TÕ±¸w€ïS	6rûÍ¨ÕÓIÒ0tL¨wXı°st¢LR5êçÇœÏÁ≥–Òèû,P_£ 	û·≠e1,L±˙U¨≠°iAo ìbÎUñÌTÔ≥hU÷D*Rop’{Ûˆ©˜í·tü,í√=5…·–¡˙KßÈr.âÙí¶îè∞ßàk*!Øˆ[ò¿*óvgOÛÑ<˛Ô‡‰,h~%iﬁê«aT©|NtæRtn8£¡JmX^-õ√qﬁU)ŸŸdﬂaNÅ=â‡#'ãA˚¬¨i÷PÇ<ÓF&ª3b∏	CYÄrTwù#]:å¨q°CdY/≈Oe ˛îd†’«ò·ªó0•7pÇ˙≤ahá1yñõG`*£$KÈ’u£d„§o5ˇ√”‰{™çµ5ã’∞ı	5˛yf—G*&xˇWœã2|V$G©Úòo•sD≤å≥o]6∫√ëJv¯ÊÅ>Ua#-áZNËŒTÒÜ?ıd]÷KNÀ…õlo—>ÿLß{°Kj(~ì˙Ó·ƒö´9a˜—àZhT‰´Ì€¡ÈWõ6p3¶‘2≥Û“DC®u˛pòôp™iá‰≤fitaÛäù¶π“;æWr≈•¥":ÒâÕ©5µ2a˚zi@ôìÌUäˇvô⁄]°±ô“’a(∏ZÜ&≥6MY·iÛwÉﬂN¨™¶ZD`Yá∏Ä±å˙J[√B∂ÿ7∆øi}≠—¸}öÍµﬂjç©S(¥ùRˇn ˙úà˙Í	˜•xIfÆ1 zì0‘y÷Ê † *B†ß+0ûA§X’ãôDÃnA— sÁû”`¢?øò‘ÄrÜLE¶S1∏Kß1{ﬂYô
≤ªÚ≈ì@bΩﬂ#
¸ÂuYúä<ÉÌHÁ›ù^à>Àá…¿>–†3ªU±R‰§¯lŒïüõ37(˘2Í–øﬂßi˛]˘‚±Ëå≥àbk±¢2WÎ»ëYÈ7 6›Õãxt[fEÉFqÑÔy'Dèt»–Ö6º∞"¢ûπ›ÔdÏ=5Ü~b⁄L~l]úíÀ≥Ò‚ {î\u±9Ï∏{Êq,5‡
@vt[¡Œûñ‘AÕ∆ÜÁ«í˛IoÇúwnµªau∂4êO˜◊
å√Hæ¬C†"¶o‰%;€ëf—€•èbÿÚånˇî%— 1ˆM‘øL€©0π≠Üã~ùñÑÈO·Ps ¶$yö≈óœ'‹0U¡£xo	]@„·Ë˘!ñÒø÷—]7Èt‚O5ÂZÁB†%q˙E¥3‚˙°«
ÖôΩÉÁΩÚÇÖ≈È;ô8VfôZ0åôü]Ül!/0;`˚€z LΩrÃl¡&nVæ ùcNI_ÔY`8∆ı“Ωa~"'Ø©¶ñˆ¯c¡¯Øát–Y§µ›-¯@`Fy€w!úc*å‰D˜Vså9PvFŸÓê3¿2r—2© ÖMKâÚÛFØµeÎ<5a©÷j¬NN]„ìÌ/ΩÃèHì¬Gd⁄pa˛“∏ä‹—›Ùf‡éÏ3¬|“LË&†Ê<ü˜∆˘‘ÍIŸô‹_«i\ÿóRLß€áhSƒÇB°Õå◊BÒæ%zÕ<†Ûh˝W¯ÌNîu\à{ãóhO†Æt<Ñµ©8Ú"fR^QÎMË^t*˜ÙôQ:\Yj1ÔÕ ∆#ò*è¯—”ÜW˙¬•Æ‡‚ø![∞"gAé^O+Îè-ŒßüxŒ^®ÜÎkL	∑5;û¡‹ES·:RâZ•4'.–√\«q÷@⁄π¿&Yq©è@ÿ}“IÉzË“ˆ$ßRÍ}ÛÑ6ﬂéLë£yî≈GïÜKÔ¿π?!o∫,vœ£∫9Øûñ…ÄÊ◊√†n õ¢°…©ÅÇiê]:v©LMÜµÄ«ÏYõM+≥x	l’&î<ç“¡ ƒã3J‡F”©›NòOìŸÚÁµùBÀ˙:∞ G|¢í	§*Ò@&J6èjhTW√9gÉéùíø∆¡p—É)á&÷ıiZ›DKóÁﬁZQ¶;ãŸàãºìı[`Ò~˘g“gap”˜eïaò\5)ÑS<Û¶∂≥¿ïLÛGÓ47ÚÕZsm„mEbñ2h5òQO$ZKx˜*Wÿd∞r˘Û5rjµª.AÉ§Ú#£<ú‹¿7ÖÁãh‘óáQ L)“±÷sí]É„≈åT¿˛xq\ı™t.wMÊ"O-≠é;m•`õ+B5Vå[=à4^ÆÇwaUüCß∂ëy6À0⁄Çb¯◊k*e˜\YºQÕS∏ï&d1+◊æ›\‹}; :U ªmA=}—Í]F∑¢ƒŸu:.AwÚâÄ*]Q6j⁄h7QÁﬁe®ÂN9j≈ñËsîM±^%+∑yùP6T¶è±>èU«ÿ}/p¯õÇ´W=_øÑ≈Ëâd.%Ö*≈¶áÒ„“ç;Wócpz˙ËÊkö˜ﬂØ  &gÛW7VÂ¯wﬁüç√•sÀdºòË[ﬁjÇ{à‘¥HóEôÖ/lüÂ/€f∞Û~aÜﬂÅEÓ‚èM¡˘pı	Ûvw±§<}‘@¿à	„/wÀÜ™eh≠L%¨s≈jπfh7XK\dqÙÌ t7GE≈Ñï´(ƒrQ˙È 5™äÆ£*tÀÆÏ„√Æ¸ y‰Øã5ü∫4èÇ‚Íï¿,˙à=ó5ã6©0∑ª∫ú¿ËU«tIzÒËﬁg*àıNA^^qS!Ô£æÏ?ˇ„“∂‹kPÿ<‹†Îì—ËÔ¿∞K•e8n]ó∂O™N”WÈ>}˛§$™F¶_,˛ÀõJºúä†∞PªÊ2EVœ b˙Ÿ,?_ˆÁÁ6g?º®0ß/?aXò€Å“˘8
Ω–7 ≠Ælü™ÓM°ƒuı†Éd˜ç◊¶Ô1´‡*»iˆAFkZ√sc“ŒÄ˝√¯är9Ã,*‡WÎπv[”ƒK±ÍuëÂ[5 €Âû0Üq‘!üå‚/éf’˘ÚRø„nùK,8æ˝∆}s˛= ⁄u—îP•=≠vwÜToI_>_˜-©©D¡∂Bñì˝¥§ËÍsÇM!5X64µFé‚Z"}„ı⁄}>ÌL
≠<‹£“
@˛îô´˝π¢Ï–•UîÀòOÿÒSÿ'ÌH+–«˜]j%tJ11"Ëg÷aÌ¶°≈⁄«˜ZØ6–i&.Ô<‹a∏y/C˛ÍCßø∞:]fUt•[.Kÿfâ 4π;ÇÖ ﬂDí˝˚?˛ìêé÷˝"bÎ4VÂ@˜O	ºæåæè3?A\I'ç-^Ù£˜+töbéf>HcD67i%ogiØweñïŒ:/U‘¨q0ﬁçO4újπÅüMô˘∑'ô‹»nïhÊF∑1$ET{È’juo˚iÇù1LıÑ6'˛ÿã˘hÜäXOh.,∫=)”üÉÎß¸$¨lVƒïe“"3/≥°Ã¥ﬂ™È≥;–P8ëâtíiÒI˜ƒOÆÂÈAßôwÎ@‚}ÉP£LƒUÎÁÛL∆C˝hÙ2·Wn« ˛dfRíôÑ€Ia3ó!Ì–◊\¸CúUì≠Ãº<§ö∫Ç€ÀK@¬ÈÒìŸ¬…¥˚îéKrm.qTy‰Xi'íÜ!mfƒ]Z¿»l'™ô€ÿ≥PG•ïq}…HÃj3L’©Á¶ekÀÇé¸ãïN≥¬ÿI
QΩå>‘6(£I89ıãzR^¿ùY®2…îˇ•J+, õk%+@»Ä èÜƒ¨|u(≠ej·n˘°ı"¨	ó	◊lI{é‡ƒÒ≤G\uSÿB$b≈Ó≥:{Ñ]˜ju]Ìô”Z0¢vÍhqÛeòœµ@ıaøYı¶ä`õÎÄÛ¨(Î}Äâ MV	˘«"%ÎÖ}¶HÅ{ÙÅyø∞%'∏¢âé-aRﬁQÍ"8-äbX%œ'p	êO∫]&ÉéÙMöâÑru T¯äÿ¢x;q®S¥3@2ªôÅ¿å⁄X]+++21ÏŒŸ˛—!^‚›ù,≈Û‡≈äÃ ‹˙jÔ@A0S¨`õ“èÛ∏c%“ãƒóIOûÁˆ–K«Ø∞“GüI[“û¸!=3ôÑ"ì≤ÄòKÈ•¯x3Ho$Dzc·AHJ!éh^Qà°U‹tL~:pÅ∫™öî¬ä√X•5mŒ≤Ä»€Ω8 Ã˜∫XºÃ—7:…ÂÂ)••¡ ŒÉh‘Ö˘=.ŒÙ÷˝4´◊°Bãjà¬ÒP≈™l+&©˛ú∆k\O÷,¥`›˛“Çó’≈∞[ùå±„ñÌâ2Î´64ö√®säÌÆo,ã⁄Ê`KBø•jºï´ÖLÚ©ùQF≥ïd©1≠ÃõK`lôF~ÃÜX°p*0¶æ2◊≥?^<?L´”qSƒ[’∏2¿eái_cπ–ÔJ òõ≥∏√»õ/ÙuıW)nCÙ7Ú™Ây(ÒôÌº=/`<q≈’Æ“,X_°d’ø%X™väFw=YRüxÊ
OÚ\Ê¸i+¶:èâ´P"ákQﬁÿ≤u°Î—˘òùå23s»lÅÑî‹\∏äºßÁdí¡®…\„&æ©EW„(Î‡äçi„˛94{–ë95joM‚¨xÍ\Iô†<çb˙∫i®ixËK7˝}|ó~`ÆÈG≠ò<Ë
9C∑!u-Õ,rÙu:Œrî¶ÍDÿ?=“Xë	ä540S∏N˝‰d∏SréYÈ8ä<HπIπ"««Ê‡‡√°”p4~úåÚÃØ’I⁄0£,8K(Ú^…&· Ô&W∏L%Í( j&Z±ùË»áíô.ns´
≠ggl≤ÆsôƒnÁ≤˜÷HâHzSÀKı∂◊◊'·HÔJ9Y˙¶ú4àT ¶æyÍOÙ-¡¶ã51
$ÌØœ[d|ÿ;µòê`wñ
~OvQ/ïQ”,˙YGLGÜâ≠≈Ì?a¥^Ù±xqäGGÛ †∆;≤Ú‰~ÿKLäu§7"HèÒÛ!‚B»’L„(ù%àeP5åÛì˙~®©e(ßg åOŒdÄ£¨–Ñà}…É√gp¶ €x9ó	™Ö6o?≈@Ñ¬,◊»Ò˚’[ı˛ËA˜g3[˝Ÿ¨W¨Ÿsπ¯F"ù+Ω{K˜∏òˆe∞Ú?/:°Ug÷|,C¸ØÈœ°	±ùà∆ãöã—?«@˘;^‚ÇB8CªÒ{Ì2qI°≈M9Ó“‹Õ9S†„~´≥qÑ+ÜT¶ÀPaÊ )≥å}ƒÉÁ2ëYìgºÏ÷~ 
4ˆ¡k
?Ω|!'ôåÎ˛õ&%ëNå!Í{05À
FÁﬁ5∂Yéí4S*Ì|≠A±–l6ΩWùÇ/˚£Éd ªi‹öRƒ⁄©ûuZ˝›CΩfbÜø-7Î%˚hÛ±ıÓ‹C[Íwß„Ó´ö∏ª—’Ò…)Á0NÀUa«“ƒ Lø<.∆wk‹∏5}¬ÔÏ˛M⁄æ˝e:^ñ;?JÍÅg<JD‚ˆÿÂÒ8/é	N⁄Å:πWPìˇ¿4˘ã≈4ŸÈ·	Œ›MfRVÚèâh¢∑lŸ íuî	F
 XﬂÇŸ“´Ç.ô‘I“H€IëpYYrÆ{ a˚˛éÉa”Ìb	™?vƒ?}0]F≥£ãª„¥fqcI∞‡„*W∂{ıÔ€”å#ZWi9Œ°ËÍÚ)!9aRh Ö˚ó^(:˙«£ƒ±Â¡ÌüPª M„é‘‡a™ä&fIØ*L„/É.®Êh&˘(∫œ>ü*LóöÉ,ˆ$úX m©[ŸRfª†=Înñ+
!¬Ò¡Õ.÷4Ë◊¶Én7úÄb(-ôÎV1GDò∑ŒP¿ón\»=è?€p√L·âªÔúW ä˝ö[Ì2ÒIÃ.ˆ{,_«láß@mB”Q7“HÜ<ÚÓﬂ˛U<‰7ßÔÙK‹h¢_m©{˝–è≤yÌ{dZ«ôÊîNç≥où ©ufØí™V◊QAn¥@›∞¢$å7K8‚¬ÿbT¿≈∂πQvx?3Ãæ,òÅ⁄œ1âû¬∞»˜~/6ﬁı¿∫÷∞g¥ˇF0∂6Xªq_ÅµÆv9ˇ∂g3´MEœ\Ÿo"Ód D⁄ù⁄}D∞JŸV∑∫††ª1˜£9M'‡^Û±"™<x≠*bÛ#ƒ⁄ùõ¬2NYÔM&Rÿ+»;sä8”iÊõª'Uën Y¥…V7>6≤M«?©zºH∑GUën≥Dº+. ˆUnPﬂ∂Ö„πGI&î´ÿ‡Ìg<∏—”¡\yø~EØ1 7ú›ªBK°‹~œó’)¢™cID‰]÷Á]DùÚU‡üË#Ø®'6æ…q8òöÚÚD7Fîâz:§æ˜K¨gFN∞¶ÿ9?ù∑kØZ´ÛÚŒ™ÕÇçŸ{ètF	A«ƒ®*-ã4ª˝c$u_c-´…§N˝lBymº≥GÁ"Œú!÷õ·«yO≤ 9g¶åPµJô/ ú&Œ~≠\|.‚Q4år‰Òa2å1V-;Ñ6x˚GÙTD"%¥tÍClAòXòt®d?BWâ–Ë†\˚N—S¸ËdwÔ3‘$õúgq;æH§KJ°Zú„zC∑‡ﬂÛ∏
[<∏N{◊Ê¿”z{ò•◊x^Ö˜…7X˝Ü{QËãåòïrõj–ƒsx-ãØ∆q”;ÚFøjΩ‹{uäﬁÜ˛ª©JT"Gß?òCïÓ‡W∫áN1ah°Ç∂dóKzåÔ¬¥∞Ì∫¥Ä⁄Cƒpäß€“%wYh"Q™W¯©Ô√ØıÏ:4˘Ï*N
¢∫4’ıåR±ß…º¨πo'≈‘Ÿí£à	EÙ* >Å˘:W1¢ØÁB÷!˛ºíûœúò™û¯Ô0Ed5m]ƒŸ(≈:b*Å
ÀÒï##ùV	°91%éÅì˚cÿ*QÍ*j26µ	∆;≠2mÀß8≥Å¡ø'8∞ÜN:Z≈iΩzqÇ:ÿá˜˙qﬁóe·!9»"¬sFgA:á	ZMSËVo|O0ÇM”!¬ÃÌÌ∏i±„Œ—´£ü'ÿÇ"…6•∏∫∏*fK9VïP3:7hËD%’ò»⁄§˚XfÒ.© èk2GÆ«Ë¨hc'räñ˜Ì¢Ü+∫l~∞*ídÍPÏJ‘Õ“ÛâU1g√^àBÍÅ]Ö∫iUQLAV,»KX≈™v±Í¶›r6ÉY¡Ì— P,›∂•[eƒ(&>+˚C‹√x$øtı¿._›ÙiaâV<≥¡9Â€Ot‹Ù•j A£\öG—Uºìˆ“Ï≥5÷Èzﬂv‡≥Ïçz·-*˜¸A”ô=RíÌ…%ƒŒÚ¶Ì9VÍP!p@iëÉÆÒ}Ñí;ÿ;=hùãpù-óZ°£‰* ÂrDßB‰bóP%G';≠ÉΩ√≥£st…?i¡*‡t9ÙHÆgzç# 7â)úí%ö<¶ç7ÿÕ“a'ΩQ zË¢gÊ•ìø„æwñ^]ı‚S∫#}´øç?º ≈Ó©*nKúFΩ+Ãûz%oâ∫˜÷2f›àà™÷]ßIÁ)k…ì¸©iøg∑û∏é!X†Á÷M—Ê,∫ÿ¬´ì4-Óê∑Ú±t	≈U>éPI‹Ôêãè…äÉ‹ZoáÍg„¡SVI4Çv\†W¸2-aÒ Œr¬–¡<¢À¬`/3√bAÔf—’IuÂ+çq7=Ì6ÑΩîDÖΩ§tÊëÆ∏Îá˘Çk*Æ◊RWQ	Œ‹;Ïœ¥˜üûI»ª~R4nKÏúû6œóÑ"≠óy£¡€Øú`¸iJ-Pt*ÎÇ[¯œTL`?Q–L^∫˘ ÛÜD/ƒ“˜\èësÖÉÊ¥él"åÌ!É„At8u8´Y7‰Ê^¶eåbΩÌ≤πÔ÷Ï†"ªsL˚_í»◊_…Ì%∏|ÎÂ0Ìõ⁄p ¡´ﬂ¨7◊>´n}èHNÍi7Ç©Kºv™ CŸe÷∫Çf8
%éá∫uïEBef∑.ÄnÅÚbå§ZB√^„?¿tH≤ÊQıV·6À®é‚âWYM
Ê{Ì±,À?VfFdF	˜å€ﬁÕ:„#lÅ@Ø+ËuØËË‡3ΩJ¥’Ñû~M∑`”∑:Æ˙qHmYo-Œ€∞≤ESŒ¢ILY¸ûÌt„ˆ∑⁄µÊ˚ˇ∞¯m»Ã5>±”7î:dÁ}6‘	B‘úîq’qv®ºhk/£^õ}cáΩÍPdXà:∆ìdi˚o&fÍ´ Ïï'€íef4¬öT0iΩ>´uN!Àb˝Q√3ó¬£îúXáΩ∫GÈû>ë“eÄmÓYO£KáâÅ»±:√ß…™ë»Ω*l÷Z1ÓK¨ˆ⁄¥“ÀDïçQÿ”˘RûÛY”Œç_KÑ•{Aé;í4ø.G'®∆IÕœ$–>¸∞≤÷t–ŸÌÛ'YÜ&T 2wíGóÒóƒı@ÅLùŒÍ¡Å¯˙Î≠~øfgDq‚¿+¶âë‰€‰¢(v#ôzÒÂàzK"juC»l4e?–çz‹µ ⁄àj5X°Ëî\ˆzŸ“◊MWe˛ãSÈ—äÏ‡⁄íMÿ<x÷¬r\Ëπv1£èe£1]âm≈åõ0=á«†‡FW‰*Á¶*Tãø
òL'°}ªÆuz«™j)¯WDû´U)Œıçæ.f:Æ•pg˝éˆ–Óû¡*îAÏåÌÓ@◊~Ú¢GkÂ‡◊∂Òíb®¬–∏–Úî≥3’ú‰úu⁄Ë–nN|ìtﬁN√†”w∆VF{4Æy7∞ÀÉ…⁄ò¯j‹ﬂÍ@>Ôéoøìªõ>˜∫ÖQ'Œ>–ŸoÎçaŒˆ|oﬁﬁﬂﬁˇ  ˇˇ º(xúÏΩ€rGñ ¯ÆØpbj
ô’»ƒï,	»Å H‚4A¢	í›Ω.ô·@Üòëäà@°”¨˜v_z◊l∂∂⁄jÃ ˆ°lmÃ˙±Ò'˝Û	{ŒÒK∏{x\$J[ië·w?~n~.GI»ül≥Aíåy…2>Ê√úáO√ü|'À”(>¸%K‚W…˘˘òüPx€â¬m&^wŸÓcvëD°[lo<%3UÙÌ;]òÕÈÎıgåì8ÀŸ5Ùü?á!Ω‰g+, ^\îÕŸ.õe¸ M¶”`0Êùk&:Œ˘”pÖÖAlC’¸√îo≥Âa2ûM‚ÂU Íœª_Í.Ú$L2[îƒ|á÷≈§è†_ˆ€ﬂ≤)#xﬁÛ¯<±«lÕ| aH:S∑πV˝Qêu¶˝(ÏB_–Y ÛY≥|el'å.ÿpdŸÛ`¬wó&Q‹ªÏ≠±≥1ø¢z0hvL{Î˝áKè©Nπïér>…zCÁ∞2TÉMØzkF5¯\∑ôPß(}fyûƒÊ#;π?éÜÔwØ;¥MÂçÌwT”ì`*÷D,¡‹n(èÚ1L@Øz*vÅÖˆà·Ü≈¡í]•ò˜ı0ÓÿÔ[∫Ïmˆ≤˝õ&≥8‰!+Øœ˜≥,èŒ>®üÉ$·O60|À?ú•Yíˆ¶IÑØóV‹^ †ÚÑ-Œ{”4öÈáﬁ√µ5Ÿ¶˘hâmS©l‰º˜≈⁄⁄Í#]Ïr„[›Xs&kØ◊c˚Âuy∞{;˚#>|œ≤ËGX°/Ê&ú‰¸*/z_b´è≠ÊwV≈^›ò˝Ôd” vññ{ùñ{ΩXÓﬁŸl<÷kπ$è€~2N“gyˆ∫˝0…ªsÇ—¡h≥4⁄∑øÔ?ú^ΩcgIú˜„ f6õNy:2ŒÚ~‚Ë]F œT^¨„√5x7ãá0Sÿ+ƒ2yt> ó_üº⁄˚ÊÙŸﬁWáœNﬁ —ºõÔ¨é6Õ°|ÑÁ‹Ïõl[mYúƒú%”`Â∏Ωx⁄p¶ ÄFΩ-‘i¯S˚&≤!åÑ˙÷g}ªyı S~∂{]`≈bß*OH1â∑k˝µÕw
Ó’∆m\ça?˛aàùFΩ∑[kk∏%ì‡
ÉÒ∞≥æ∂v1Ím¨•|“}«¿Ñg„‰≤˜°ÃÚéSñ'ì^6LìÒxÄá<‚, j±˝$Õ¨#&±;©“¬≠µ⁄ÍCqÆÃsÙ∞8FÇã››9I“È≈> ÏÑÿ§›k? ö#u@:ˇ∞{√ #ò≥(À±Ä´˘rnNª)˙éÌŸÿjÁåxr¬”ãhòÏi»ﬁÛj–Û\¢gıhxI]ò\∆˚£ >á˝uüÃäµk ˚π&IÍ©IúTè›πÉ ±Û∑}^ôâŒwVùU-
:ŒvwwÀÑ∆K”4÷!o8pÎèÙA\_[r–‰Œ≥‡O3â7>w&a0^åÁ˙+P9Ò’Uˆ,äGH†&–-P™YÑã6îÃñ>Ç%ˆÔˇ¯_%=Éˇ‰"∞x6	ÿ∞,Ya∂wOìî¡åR~¨ä¬ü	∆ƒÑl˘er	¨	0;¢‘J	.V(X—;ø‚l.õ#o0lX¯R6º]0Êÿg˙e©e`ÿJ•V`ﬁ¡aL”Wåƒ«LöœZqë~∆poòG¸U0ÿ∆_/ì§xÇÛœèyå4‡%ÚhöøòÚò∏ø]ˆí√ˆıÅáî@€ŸõNÂ◊ÓÉÇ5£ πAyP≤·àá≥1øNK˘®Ë.I;ùò_≤¿O—nˇúÁØ¢	¶©G•˙qrŸÈvŸ*C∫∆~«È6∂‡≈6@Àx\å# dêñTåéT€Ï≥•Ú8¨pÿg¨Sljû8◊7 ó≤›/Ÿºj¨“ÓÓuñßI∂/ÊÍXV∑
xìt{Ñti[?X_sÈíø+®e»ùÕöD+èä•Ä)koÉ—üzn–C…÷◊<§Lª‹¿¶Ê%““XÃaÛ<Î†YóÖ~ππ€≥Œ6ØlÆÃ]≥«]ã‚2M÷J<˙F{&ÿ&y´ì”zÎ≈ŸôJ©FQr¡˝k≤¯∂
◊Ñˆ0O7ˇú,[#ºn2ñV|Ω 4_ªÙ¯?¨B?É3 ;ΩG›~ûºF˛x¯„–s$A◊gI:	rl¸8ÂøÏtõ”Ê
€ÿËó:u&]‚‹ø@&—` 7◊÷›‡Áã]k\Ä á„y˚ÆK<TÑ∏'Í«–|∑ˇ=»àÒÀ]Ú	ü Ñ∆Ÿ≤5*{+Ø+•y4<Úçu6ˆ˝ãJπê»±%∂H$`Ÿ>!£ãí&ó®@ÙB∂äÛ¢lËÛbcQM=€Ù£û˙ÉúÒØ	b|Dñ=Wèéÿ∑ﬂnO&À›˘µû,Á2˚∑ˇ¡ˆ^Ω‹;Ÿ;x±l,\›'+Âp4˘Âq˝-É,œH“;Àa·Û§ï’÷#ÑM˝=®îU%ÜÔÒÄ˝å;WlU+A\?…É|F ∫,^ú¶@“eŸ+ÿ
‹dÆÚE0û(¢πYKP/h2'÷ç(3Ô√QûªúH•:]∑íÃZ◊æzeæØ£XMﬁœÉÿà>M¿$ÃÙ	£EÄ–í=Ã∆N_\√n|Œ¸8ﬂF˝ ÿjÀ∆Ál:Ó=b”7õé‚˙öçkXÅBœ¿q€…,G12ªxT>.¡WìŸV≤≈ñylÏC#¥
/^æ+,|l'ô‚9<	¯’V5Ù…QXD§´ÌX#∞Tkp⁄h˘}»–f¯πd0¬ŸáùÉ/‰XóN∆>J;Ò!7ÿœ∂ôz˘ƒ≤ñÿÙ∑R¸ëÏ8}'‘∑ı|Gãoﬂ=Ó ⁄/òﬁ∑„Ñ48Tıô¯nVÌ ·f˘lî\í 5„¢√ÛâU˜,gVÂD[A:Q’≈o´‚Úrπ¨„WåZÙõä[S]ñRﬁ2”}˘qß£WLµö¿ŒÏ≤q2∆'yí>B˛)P«Œr:MìSÍ˜T†è‰Ä7√“¸ºl$n£◊0À ∑ı#lhÓùÂAî⁄”ÑûyŸêÊr¯r'3£¥zÇ¢;kr‘≥95,„ŒÀﬁ/˘ãmÊ€$â1=˚€π ThÕ"k⁄ßÜuÊ˛a¿z™qXãËÅZ˙≈ÜÄY¡€Ä‰Æ®ç◊'Z∞¨Ωbπ<Ìè;¯Ø	)»d*ÌC˛F˛@»≥ LöG}#Â»›¿é£`tÔÃ®ÅX≈òLHíï=¿§Ê´v∞fí≈~Zã¥ÿ^“$ÀõI}∑Ì≈°Û–≥©è;e¶∆ƒÆñj)?—?ÎÒ™°u4Í—oõãèIù:]≥•(˚j6~F§@†∆ûZèÍe'¡4Øj»ÏáıM†‘◊À©|•Z’‡Z¨›6iK∂µ∏"»ˇvôŸcA&ı^l.§ìØhdYîµo4µùW£¶ÜhÓFg
2bÒRµ£¢|ó©¡BÚ\1R	·{“&„-ïÓá–(¨)v8åU<¬ê…∫ÚT‚+ÒHL`NJ©’Uf\æíWÉ5®‚npı<ùM‘˙IEÎ˜√´√ÑS7à· ƒI?D	‘1≈ÍΩxT±^ﬂ √9ãÊ^Qﬂ—∫˜ŒGr∏P∫ìw…Çâ¥VV/9±˛0éd1°ô≥kµr¡˜B°∑®W&·\¸\Æ˛›9¸≥¯µ#≤B≤≈>6í°8Dz?ßª¯ß°øÊIêÜEK√P_√Ò˙ÜÁ–ÏãºuPe˜uâZlÆ=ríí˘ÑŸáx» TÊöH?\Lz6 ÿ˜œ“P0HâaêÅ§'pZg˘w= :Àb°√” ©;ëƒ~ÃË,gt¯Qc1ƒÈ¬1Ü
$~tñá)tX™l(t§€®·zs
Æπ”°— ¯ˇÈerŸ-äKNŸ¿^bayœŒp‹ÊÃçïÈ»6ƒbA˛ã˘m!‘*»G@&¥¥–”kÚ#ÍlÛÛîgßC3ö	◊Äß~áÄŒ&bæŸ $YxB{d;ÄÀÃ!¡RœŸ0çºcSs•ï÷ÉK˘$π‡˚ràr®ä2B´om¡Âù	P8ÛΩwÈ≈ˇJZ_{àıÃµóœÇqÙc 9ã6Zò∞œ¶æ'0ç`úGﬁq6`8ÙûÒ60äÒt¿§B8P.(|ÉÌ;KbY¥ròñk÷Ô˜ß+.1“@ÇCí06”Æµˇ∞qiö§-N√lŸSΩúf•nÊ›>ûá(Ñ7‘˛ü)"B]u
p{cûÊùÔûﬂ¸s{ƒ ¶≤õ?] $r]S∏^,ˇoÆ©f¬≥vm˛ùMC^ã€9}Ì6É’è≥ (¯	ÂÇ£Æ∂Â|ãÀÅàÕdBWù M®úÖ
ƒ Æs®À« îiÄ∫‹XUø[TÂ#@ÑgQ:π5|…√)Z7Brw`Ìd„ùÔéhÏâ\kúÕo*µ“C°˘]û≥i †∏Ù[Ò†ÛnæÙ‰;cœÉË™€zYû∏÷"È∆JÙETB.N±bHÅçâ◊ODu˚®„7 vÔ_V Âb|ÿ|•%Áe‚iõ-¥Âiœ…çiñÈ≠o¡m⁄zB@µ®rµﬁÉÖ◊x9Wú•e`~ í2Âc`x4¿xL¶	!@D »iŸºµ+Ü—Ò¿◊ﬁ∞7@ªL6pÛ/7ˇ/ú>Xs7Jô4tÄ5…
ª%¯	 ’-m†Àïk©÷q|@2±Õ^Ú!T)9¨ 2{+z=/‡¥fª™ùæç∫†Ö Z¥˘ÊPÃµö%N]{c %Q¿;Xƒ˛Ø®—©*/T≠∆epyBÓæÎ˘®ß¿,"∑ié8J(∞hÓÉ¿Ï∆Ê9êïEÈÇpJ±§ –£Ê°∫’õ^00ë∏n Y0æ@QÜÀI ‡Í%‹Wq§§IƒSÉä∑#—J@†cÖå|«3S§ô®‚m¶_ÆÍ1AÕı/µ’·ã'5ÁÄ¿LrmS˚Ω—üÖk°º„û
†4®≈?ãb NÃÀ%Ÿ«\â
,äù˛Õ5BﬂeKÌ·
J€9Ω(.A¸&Äœ!ÏtÚ‡ªJTmBö#‹Ÿöfk>J<∂8(xâú√Í•Dƒ$¨ü‚ÔÆ0∂m¢d_(„êÅ”ÍÄn©ı√8t⁄Ü'EÀ∂X#Z\!˚<:∏TMO»É÷ËI8≈:6ÇñXZ∑i[bÿ⁄–aEıLÃEyªIî˜ì1p_p∫Ü—$∞Ö} ∏?F#yWŸpwY23K'3‰Ëàùn„<P<¢bÚ∫∆–qJ'“|óô78˙@b{$ÑhWæ€Æ[Y´˚§≈•_±ZÊPÒ÷∫˝u${ ;=Q¶–HfñóGQ√6Gﬁ»tÎçŸGΩ/5ê◊ª;/˘ç£˝K≥ë ÜùÕy/õF±}∑˝PXoî.µ>≥A3{°-ÏvŸ[ƒúÚˆ	v	ÉâìE=0ª.lÿ"YãÆTP.ŒìS.ØúñâO≥Æ•∫éöHZòu
´,÷3åπ˙RM∞óF\ïÜc›†∂wvŸF±ï˙rTBÖ]πpÇ‹∏ÎºO:hÚ,πTÜ!∆Ÿ¶*]∑≠π„(»á#ú¥,â,;«Q¥kq- YF[ñ·H≠öñ#ı≠⁄zÖbåHaT'r•PÁ‘È 0pxıƒºF2Ô‹∫6—Jv(∂©û«⁄ó’ıt°u´PEK=]JA‹ŸôTLå5∆ä∫–†™êrâuë•/Áûà^∑Yˇö‡X5&‹€Úï∞∂≤ıXÊ&Ú(Æ¬é[S8A:[∏˘d”`àV)ü3Öﬁ πù!˝˝1I&∑˜≈CŒRRõÆ´ı˛—ñ“Ÿdõæß…•∆¥û_r„ªíÖ‰ñ≤≥î.¶Éﬁñe}cJ”ì—F…ÓÎjÃ&·6}E”–´∞œàr`ŒÜÖ9g¿à1Ø=ÁÜk‹]òwª„Pdb…Ñ¥˝ﬁ@ªaOçÃŸTﬂ¸Kbœiu¥·Ã“c‹&,N‘D—.Ø0t€Z3ÏO*ºU ¬&9ZÓë^âJB»T¶'[Ag8éPtèÅÂ$Y]®	GQñﬂ¸9çÜ	Y¢èyûÿvyém{K«±Mói0uñªπ~…M¶÷å«uOüÎ∑Ó∆Ñgü∫J]a„`¿«‡o‘XÑxõ, ¯MäÜ‚%Ø-›ä∏Ö-9|(üâvˆ…U0€¨kE‹‡≠<ìøÂH‡^XyZxG¢‡Ö«@à÷ÿÁp'>d7tÅÆ!æ∑é•∂qß‹πê|*Jvﬁ∫ıNu‚SÂfH6uüì—£aX7	Õ$m˜-«¯JÇÕZµŸµıπ–wÓÄç/Ñ÷€59v-Ö˘$µ?N¿9ƒ¬∫x∂‰Î⁄∑û%à∆œå
 √0JT‰4.ç¢0îò:Fãµ•«∞·as«Ñ“hπÏ∑'«ÊŒE¨⁄¸“ÉgÎß∆øeô¨Ÿ6òõ’6òñ=íÌâ#∫â‚È,/ORö L®g·MGuÆécΩËia
0 GÄ∏y∫ªÙ’,CÌ&:Ê ?ààX≤ˆ Fx†¡ñ}ÿeÔ·∆Çq’¶).†ﬂÆ—ﬁ∂mZ}+ã«“ú˝LŸñ’›‚›µ≠ﬁ*ÓlM≤rVx±≈Í-FÌÂtA[YäµZ‰~©⁄Û[º-"¯OØ—gπU)p46ÀôEª%RÒ‘Kö t«¥MÎT≤ﬂ“8Oö∏ï∂Z:QTWﬂOyFtàu&AÑ\$^eÄ•Ióö>‡CßäÓ¯´(WdUûı|ûÇ¡F‡´tˆŸZÿ™◊m8Œ‰ÚıÙoÅË>ªBÈõDí∂eâÉ‰2Æ(„.XõMrwcŸ%M>÷‡,˚ﬁé£i©ﬁ^/Ø≥‘¬ªcì ¿ÿWÕ≠¥ıSk®eûeu£Ï–°u”‚btgˆ%0q˚_˛˜ˇÛüÿQÇF:1‡˝ä∂Ô≈p6∆+¢¬ùπ¨’föNiOJúÔNô±)1Gç•`JûYû;H˚Ê±ä≠⁄˘äÊ  )õ,ïú‹h◊àﬂ$⁄˜–KÜt1~9-‡–àG∞TéÚM˙‹«ó‚º¡ù∞#º+/√ÍW~Ê≤FP)˘åzoKjÆXØ˘Y 9£UG©ˇÔ[–}2Ò
RœJ˙ŸÙáÈ¬k±“È®Xk*,÷ônÀÀŸLﬁ4óÙ/∞ã.ù°{@ê¸<O~òÅ¯fS±¬l¥¥⁄æ]ËV˘Ä Ú◊µ%fj√nÀèpÁ U`	i-âÉæÃQ©3é2ÿœ9ôŒ'œÚ}⁄Åπym(<»Û‚ O=áØ÷°v•πsTÑ‡?®Ãz(W?∑PU¸¸ºàÛèI‰j ô«”ISÚh3Ï§R)m!È4deXï/jJH•¨éﬁ°o{¨˚åNõªú.Ì™∫X,wUøQk€Âôç?6GE9¬ä≠Ò…◊a[07ïﬂè›*dÙÏ÷sîµ6%q!#∏åÉÏîîÍO<QPT‘∑∞/˛I˝vo≤Ì{èı¡UOa¢˛ì/˝8ÏÉ_°‰wNêWá™NûéúsU9N‰zI7Sw&ØÀ¯_öŒ‚º∏‘∏≥c#M1æ,uk]àÿüïg~¿Oô∫N.ùÍ3M“B˘ixWMQ4%æ€jA[Í@ôÎÒcnL£>¥&"Éáz?\+âπ≠‘•^}©_a *BuïÉsë∏ïÀ≈eƒ€Zi≥JÖ;ÚFï⁄XO€Zî•Ó¸Ò5-7éó˘©Tÿ≤Æ{nÊˆzïr˛à~}ú›EÍ÷≈¨<¡Œ—ÙêöŒ˝∏>Ú‡Ò¡ˆë(1¥UóˆΩÉsR :ÒlÆ8ë√Ÿ!Ã9¿Uœ=Æ€‹„ü[Ã$≈€)”¶{ﬁ‡ä‡j4ü;∞÷¿`,m≠1ÿö√ΩïoG P|èÀ[≠Õ0 =T¶à®Ep<[¡Mˆf≈q€ZÛ¨è˜∆¢ÊvÎg%√'˝[1|éëByãj◊ÇZÓÌ∏‘ñ◊£“>*4``5CU§¨∞á~Ë±ùî∏Å•∆Ê^Ì:EÁD4ìå¸¨◊LyÆÇÁ:º•BcYß–“	ÛX’x,^l‡tKw :‰Cí1¸ˇß ìáÑI|^jNpà>Ì¨6·ﬁYu;
€m≤q©5ª2=ÚÜ@[2#†JûÉ«È]‚¿¨Ï}ëK∑⁄D.]'“ã˛»
†çıésO‰gÆ’M;«‘ç∆ πZbÙ@ÕÁﬁÎ\Àﬂ™ﬂÔ€nÚé˚ïıﬁÒ4 '+}!,DNVñä˝Äπ˚`à”˜⁄{fÌøT®–
∞ˇ˝ö£ÑáS@.v$qVh ö†›Ûæ´[h?›ïÒ]ƒÎèºëØ˜ˆÀ√Ã[w€+Áú+ˇπ+Ïòk€âΩı÷◊n:ÍJEç≤0⁄ŸOàOÏµeÌÚ=Üå2?˘H¿k	†jï+Ÿ
s„˘ùc›í≥—ØÈ⁄ºŒu\Wù3iı˚a‹óòŸ8‘˜–wÇw`™Aªˆi‚#ˆ5înù=r¨@^]r˚º;Ω 0|ö¯˘c±≤@´QòÔY¡Dâ  ¢2Ò4˜ËÏµ}¡EêFAúÔ.ùèí,_Ú®≥˝Ïˇcu—\yCØz¯8´Ñ‚Ñön•πkx`˙∂˚pk©4>9Aü›8DÛJ48)¸Àú…ø+mb≈¢î/´\e …fÜ@g*‚ø˜z=vr¯Í’”Áﬂú‡;å‚	œ17@VDq„∞§mB)~I%∑Ÿﬁt˙´TX¨àÁ:Ç∂¥êÀ∆À¶üÀ€qrûºN«2∫"}∑Íÿ£{“óÂ•ß÷óvCœ–èC7Eø	áMÈ{›˛X§Åå@
kä c˙ßvnåQı†ÉÂ™ÊÙåû"Œ…œÃàÒsÁ€WGœË›·òcåo8áÖ¯Lø ≤ÑgM≤Éåuû≥ø¬C“6pEI9uÜÅY6\Ç!Ø¶[&'QÃ¶	b\¥µú9Ã… ¬Ï8¨ÃÄı»Z5ÿ}õSÔà«3ÜàÄ
Ì)„a4Öoùê9;ÉìÀéﬁ¨0ºTr œá]ä≤"FÜCè–ı5Í¬áú¡7·≤•«yt¯¸ıÈ”WáG'ßá_ÔΩ~ˆ
=9ÈdJWå0»F˝…p«8–œîÜ,<L'F±Øgq4f˚/è‹b2,@fî=¬®1Ái⁄)ãAÍwíÉ7ÏõÙÊ∏•Œq-ÜπY\-O©®»íùä8f˘Ò‚°xÈHGf2™ï¸û‹Zi2H~å‚QrögfáO°∑sB°<•ID`jÕ	ü˘Jg5ö„öZø3Œ3úâÈ,EÙ◊#˝”ÇLïˆQ√óÏ" "
&%3K∞9ÇmàDÏ,íøDì~Æ’e¸-+ˆ`1#HÊëÛpqÑudOÛƒyXç–…ã|@ëd<ÈGŸ4'Æä¶É¢˜úœÄ«∆,bö·LO≈Àeµi((¿)≈ÓXFÈiéu&¡á?Å!è—Ø6ì“QA‘∫¶éMÑo0öGf[ÑÅÒ‚_*bñËb˜°q!Ÿ5¨ -}§ΩIÍ#É1È$Qd√∏CÓ)ã2¯∞!&«ACX≈,
}ÍbÑÄªŒÉ… jÜ∫˘ó‚bM%_êsπ;BtbhÕ/ùÊ¢0;Q-*ìH—Ö0Ì ¶∞o∆T52r≤⁄›ı†Lu/D ˇ@wB™˝	5◊ˆ<›Z∞ﬂAﬂz1–î.‘hﬁÈ
Çôí1Wÿ[H=ÅÿêÖ,⁄˜HÚñrê†∆fÓòM3å5RxË+¿ﬂ6·^Ya;æÕÑ%_ã7‡oªp[F˜ß'/N.:2·|Ö‚Kau`{sÅZ’ë3#Lï¶¸Q!r⁄D¬1£HôDøà≤Ú C0)ŸÖ√ëöﬁ¸·<äÌ¨PÃ/Aÿ˚Àvx∂=ÿ
´˝àî0¢®kEh6§¶ùW<Å)–·
˚pÇéØ+@ ÛéÒ
ìWf }/“!ÖÃK(hÙÄ$6E≈ØÜ„ôàDÆ»®‡I&&6‰[0íuï†?GaÄ∆9
N`Ò4¨¬¯N_Ì}U…õP$É⁄ŸSq…„HMÃ®Òm·Êòr ªî»*´`‘íÎ¬VEPwÉ!„õ§Xq•≤â^Rã° l(üz¯Zqá—I}úW{bü›¸)¨Êã<ëáÉòÜ≈A¡¥"Ω˚ta~¬›ˆ€p÷ÿÜ‚∏¸|qû¬jƒ`+¨Á?g≥>ΩgÓ¬È¢Ç√pJ\ÜÛ¢Ç”Q∑„üè(¡Á˝–ˇ“A∫6¿Í¶û∞ä˛‰ÃÄ €¨åÓõ/∞‡ßdàêKí≠9É ª-kp;,$∂yÇ˘Qç$›+Œ ˘ó”Çï†"
:Ë∂!‹5:·`IßPê,wWÿÂàßº≥e/˘EÚû˛⁄›Ö≈“[-Œ‚l6¿XJÒILaÈÚŒ+¨ì¡ï©`€¢?îËá…P†Ä–8•!ùR8iaQ,’\yOÎ#Gq’ÿÑ‹˙®UT*aL<T,	ﬁÜ¬ÅbC¯ªπÜÎá,ÉÈZç¬b] ÛCÒà1.ÏŒ§-hà¡Í›AÉò’Kı∞„ó/é_>›£ﬁ
E+;°`Ì,èk!∆/"Ã¸,ÙæÖ÷
uYD\ZRtÉaqá å@“√6TêﬂîãÃö,#ï»z	[∫@Óä¸˘≈Tó4ò¢à∂¿O÷&ƒîm”ÃñhæﬁƒÄi˚;ç•) õéòßZ5¬e˝qêÂ'ú«{9eû@5k€aèvpcdî/˚e]¬A∏a©åIv„_„=3Íí]>î◊}ótÜ17ŒÆõNAß58à
dê´˛‘ó÷†*jÌ≤U∞%¥wàÉs¿Oÿõ‚¡xÉZ6†ÚV ¡ù2&Ê ¶# Ë âZõßÙ!]<ê;!˛oaè¶'–E$Øqà˝}¿â±»{À‹]™ìz4n®}%.¢P9)πÀB#>§Dc*<fÒŒŸ1E‡!u|•mfìÄÓbeÑT8JCxˇÕÒâ8Z∞E0&@hæÖi0ÇÇK*∆MIÄd"àP”–Ià%T´7ˇÇ≥ãí–bBÁ<9FaJ¬öiûìÊ√ÎK—6µÂàRFRa
Ç\`a‡ﬁ‘‘:Bæ@|≥7ùˆÛÏ
’3¥™Œ`¸dÎFÕKn;ÂÄÄ≤úÓÜ≠ãÓP1ì©ÔÕåºÄ~Ÿäj¢ÏWı^TÍﬁºéeÀ≤/å¬V√ÃË‚<é∆â@~<ê„5†	Ä*É;;C©|\,G&p]2S¸GÂ¢“æ≠∞ıáR.NèüãQ◊CAËÂf€¶¢®í±ﬁÈînπNgx∑GøÒÆ.&qà^ﬂÈI1ÀÓWÿà´k‡˝óYA√)/c˛‚í4e†êÌâ(‘•B;Ä®ôå¬^]ïìB∑~w9)<DWÓÎhÃÖïG$|[ﬁ äÍ∑|ç∏¢Ã
(NôuŸYB`X∞}mÌÅø≥'˝∑kÔåàû¯–¶t¯üä èŸÁkÇ/ŸÿÚù€Â=M‡N0ˆ0¢ã¶Sò0˝ÊW¿âaıø˛™Owﬂhã@«˘<ahÑº&ää‰⁄±&Õ(í÷ïoG.Å”…hì ìØ”±Bü˙å!;NÒãwÄõ…í1MN˘˜p¥¨3Z0Åﬁ±
i7Ì%=(ŒìE  Âë0"Ô»∑¯R+‹s©æê^wÂpJœ^vÄ3{˘åˆßêª÷uHŸ–î\'ÂË@–ÚÑ98ÑÄÿh‰KU}ú`›(Z3ˆV˘›∂⁄∫‚U{i∫≠<mâÀ˘c‡–Û≠gÂ∫eD	Uôó\îHØJ‘œú¿£û;ÀáHøÄGë±Ìq;∂ó)Åtã#Wü™Í£‰•}∆A2±ÙgÃJ2¨‡2a;µ¯nq8‚Y9ßß2ÊÔ≠åp‚Q9Ÿ¶VÂK(Çu8~˙w¨s"¡â‚aöƒ§u@˛$¸©Œ_§cy;çÆ˛öã,ù«Ùµ&≠ß(˚Í√îÂÒßmN2úû~∆”ÔEö?êö«Ù-áIù¡©•¡ò»ÓbrC„á”„W<Êg—0
R=J„Q˝h˜£\W¬ÔvÈL'ƒ®‘cø◊]¡˜ö>§n9∫25 —UmæºΩgœNè˜˛˛Ë˘´”£√Wﬂæ88q/I`¶¸rî˛!pÌ≠À4Pè‹˚¿Ar:LÅ-ÃÕ
˚èH˚ÈÕÈ≠øn»ïUn˛8‘$SÂ3ûru¨Î˘¸Êø”ß÷ ¡†≠FÒØƒÉí…
Ã•-sH¯ÏÊ¯∞|Î¡c≤”;> —<‚˘(ë…
}o<B	Yπ/ÊÍóó◊Y¥wp)„ƒÛ¢>È¢Ë›8øÊ2≠Ôæı»Ω¬¡ÙYcRUa™Ÿd¿”/ŸÁ 3â˚œƒu≠∂ë¸dR˙o≥ı$ù”uï⁄Õj:b≈÷W¨ñ◊PO˛ôtÁñ„ßÂëcïiÂÁ÷B¨ï◊”ZÑÎëw5ÊD;£’ÔVÖ“è_EJÜ»Ú%∞eÉ/O’•–¢x
é∑¨∞“ÿí`8¬~—$wFYﬂÅá˚õó–x»$+Õú˛v‰Y0ùä›≤ü’ Y˚).3HÙ≥∫~ÿ\ˇÎ`»IÚﬁ¨Æû5◊>DnV•ÕıN`iÃj¯ªEoz•çÂ≥Ft,Àõ‡ ûTA√œ"ì˛Óvrß∫’3Øﬁ4-ñy—’È{˛¡0Iuä!…∂äû¢°>ïw»∞Y—†∫¢Ú†xpÀlÆy¨zÓd—∫£R!õ"[ù.Ü<Ä_æVΩÿº„πÎî·t*JûND—‚Œ≥¢Äˆ·ImIê>Ç^{Ìº®{ä˘[NÕ£vﬂT\’*–|xZ†nù4L–ÅIÃºa‚„ÔIe_ÌúIe…¸Voœ˙&©¿”x÷/ËÑôzUÓßM—:wFêÏaQÅwÏ…A®åAÃM‡ÚP¶ŒsZ#±-¥ÅzENß¢H·tÕSıÀ]O/ÂS¨∑ˇ‚ËxÔ˘ﬂüÓøx˛joˇU_ΩÛ6ßIÅ›^§˚‘/Ω-*Í`7x&ü˙⁄SÔºÕ≈∞€"…¿◊Ω∂ÇƒnÑ®Øß|Óà§$ŒX‰SÔp‰ªB{ X<°>îW∆Œ&ˆ¥kà
é9¿Ghˇ,Ç”Sjæ_ú∞&1≠àØ`ayâ˘Îíz˚âÉïìNÁ¿â¬.‡wzfäLËˆ2¢Tmî;	
`‚æw•dgÜ≠Ü’_e^KØàbÖÇÍxtÂ‰∞‡bë˛kúKﬁu†Ÿ^ÑA;ç°≥JÜ›HYq¯®∫*àÏ6ÛKv?õÏ6j+⁄≠Ã⁄Æ€h±⁄®Øú]5çaÊ ãï≥0.èπ‚#Ì£Á–ÒR»3¸esÛ÷ô∑˘ÃÏéR4üukéü›uΩ≠î‡œÓ.wµÕq_óÙ3€Ã'^ß¬π ¨?yp%N∆P(ú™œE£—÷«›|:QwpÃ2NΩËÍg8)n3©v_êÄ®ﬁíXóp•@*e*mãQÄòGoI-kuÅù®à∫◊_†Ív«OˇÓ6†™}o¨ÜÓ~“⁄ÅÆ)Œíî)
˛Ï ÏJO€Íâ÷πïäjŸGó-4l•¬J∞—eµ6≠TîD]NËÕJÖP6—eHGVnG ESJ)ˆ≥ùãA‡ ŒE&í˛ ®Q¿ú=`ˇ˘Ê;/πÙ¿EÉ…õ?_ëMeJÍ’å°câˆö0Xò[û√®bL?7·êßƒ¯VWπ≤1ö [C* BØâ&Åø#ùÊkıÀRÒKá¯“›"»\—dÜJ!æó>'Ó≥>°®}ÖﬂË¨jﬂÏ}∫}»Ø›Êı
∞&0KlJ\™ø}C,xŸMÒ£3Ëñƒœ≠Ø®S(®ãﬂçµéÉ,ªL“–®®5÷}	ph‘√üˆE(˘u”UÁ9ﬁÑÂÚ⁄3«ì≠~ÉË*†oË≈√$∂)<ãŒc.~$Ë”¨ﬁˇ‚ °KS›TytØÇAfåV›kΩÛ¨Kx·4 ü,–∆Yàõm»'¥!BFvçfk•wVª•∑è;◊Û‚ˆá“§ sGÒù#e¢Ωƒ@#+"ˆàÛ¥˛íp2ˆ†¡˘yÒª∫d≠†üöÎY ˝‹~÷\[ıÛ‚˜œ	’ü’:>ÿJ¢Zˇ+iö±–LçwUa‡—!5¢ ≤L^C¡Tº{ô\*ur·‡„Ul˘ÁÄJi4ëˇDáv[ãò`ñ‘TDïàˆuîraÙ°¢^`ïYú±ãËÇ<ΩŸâ©/s4tuàúËÄ*oq≥ïSÀXSL@–Ñßdôß≠C5ù"'(´;Ú–∞ZñÎ–ÏkB¥pŸ„G¢÷†Ö?â5ñ€∏ì»U(Ó
hÚcØç—°ÇÙƒúÎG›'™v ô¬>uñQ#mnÄy≈0+Ωc;œÏ≈˝ÚÄÔk—	¬ØÜÖ~⁄öŸ¬ j5õ∫©‹ôíZØë“O[ÉÙ+´È°£≠∂‡™É9ö>∆Ü´J˝o-*keñ.–XDÂ‹0DdüÆ≈„»ï#–\mº„L¶¬ΩG	>U‰æ!´"ª-¯~r§ fCÙy‡cË´x˘Ç?wÂ“Û˝ Õ'r;”x»QÒågg&≥∏»ŒÃºm±yExgﬁ:ï¯Ax?ï_≠ªgãÑB)¸ë.g‚J›f“d$#V∏å`p«≤Cr)851@ò¿àÿcÛaa
üÔΩ`tM∂ËøˆÔˇ¯_UÎŸÕüÖ;Ÿ˜ Å›¸QíåN2C]3z≠Ïb€1π˚Oˇúèåüt¡”H8"“KÄˆæ=KÃ“,ÃûHè%¸%A§>$vAÓ¯ˆ÷äN$£ô—ÖdÙ 34ê'ˆè“«
∫Sƒ‘y'{›æ˜^ﬂuKP#ÿÂb•‰B¥:
Ç‡¿àZ`#∞ÉX°¨PE$ÄwÓ`$ﬂ]F>†¡»Eû-¶ƒZœìúªÑ¯ÜâX+<+%x_-fÔÖ Ÿ{≠è—m'ËX≠Í |∆É–*áYπ˜)ØO—P[ñ≈«{9Ï≈à¥ˇÚ)ô ﬁõÖQ"¿™4›Îü∏œpÓÁx´Ã∆πØ
¡∞sÇknàœ6⁄ØƒÙÜ∏\çÊISDœ…‚8ıêIÂ„e'“œû…"úDÒÃbu·J""∏´fwmQ∆Ñö◊’çwR˚e ‰∆[`§:∂‡M◊:
Ø™z˙%^ÔÄ‘f6Åª¢ ë∞bº3êí*BRlπà<ç∫C)Óñ ì¢
*ô÷(ÿH<MÚ)Ì¨m{›ƒ≤˜Ω¿§ı‰D¯}¿8õMÿÎ◊OP√Ü∏º£®…˜ÅŸ6ø¬ÿNfc∞ó⁄À]°’uf“ãô‚—O
7≈!P˚D∏à&Ct,6˚HÔ·F”0ëò!ïQ√”„˘àÅ5˙“O‘–˘âŒ…zÔ——ë≤´–CM∂Ñ∞Ÿ[ÙÖ¸,uë,ä’◊3ÅﬁÙ¡é0f¥é”â•ß"∫^?2°\∆÷BıÑ∏ç1bhH‰ö	¯^/4àayHCefà…h/0„ &n0U∏∏"{=√cÀVˇ◊∑kΩ/ÇﬁŸªÎœÁ=˝}´≈˜ıç˘oV£>¨UÓ†≈≤⁄@DÉÈ9¨◊æî©ó¥ìg
gc⁄‹¶îüGòZ ≠^1gI0HH.ÁŸíŸAá≥q@ÀÉB'≠Ä"R´ö1Ê]\>Xúú¸K°£Âb+fyœä¿dæöq¨i81$&I5"íâ∂; =‡mBÌbûc‚‰¬luÖ+~¨NWÄ#˘⁄£S˚ÃŸ9¨ià£c.Ìdäk,A∫ÿoîìç(ƒÇπ[ˆ;ÈËWX&)\/ö¿ÛZ!bÓë¡ëŸö˝öU›ØªJ˜+xh:vMFÀ^Ö◊ÒSÅΩi£⁄†nÍ2©˚jë€Òô)nÏU˘“(W¬π¯1ÖÌm≥Ú>·ßqÌaΩ9L}WXÓyW‹-≈‚Ç´º‰´âl»˙∆Ê÷√GÀ+Ê¬∏mK≠@˘πcI,>@¶˙ﬁ«~˙•≥z6∞ó÷îµ)¸Ã¡í”‡É¥±˛E∞QvJ,ò˘ﬁt<,ƒiﬁÃèúb§úºGr4≤$ÇŸEk≈ç™¬e}∫QÕÿE∫i≠ƒI∞¢6à¥¢Æ®Âaû€»PPNü…r„U≤°ìXNòÅ*JÑ‘ÿﬁ⁄€O/.πÕ¿ËÙÀÅïÓe•ª‹|±Å}fˇ5mâQ·≥»X‰)eƒ+ÃfÅé"≈twºÌΩ¨ÑDT’\≈VW2G}˚»¶ƒ&dX©P™‘åÎÏ‰Åy1„µ∆< 8.0‡∞\<Nî%Ñ„Ò¢[±…uòe„â(SÏå8àÃ∏®qéÂóVE‚±Úã))àvŸ[Ö£ä´õwvùPH√§®ÿu∫÷†ÜJCıÅ\ïbÚ—óPV!mñ·Ïø<ZAÓ.`¨zQ™ÎF∑›Ò∆∏∆Ñª÷ ÓCßSR›ì˙»øJ/≥´’2w´òiØöπ+Â9b oÜò‚NBﬁ ç†BjM≈ñgEª¢ÚÚsGî–>TˆÀÏ?\@où¢qåÙ#‚∆è£¯=`&T˚¥Á4z97ä‘ ®?∫*ƒÚ¨o◊Æ÷◊ ¯`$£bÛBƒ9U≈ˆ° IU>x-	¢Èt±A\-ÅxjËìπBd4#AÆ∆h_0óbëîS`tô_a◊Yç6ëC9‰›≤÷çlµÀR;WÔƒS;‰-ôjCÌa¶g§a¢5€º8∑°F˜+xksÅÙ+…ZõÑÆp0!ŒÌpüÈ>›Ñ÷õöØÆ[]]\∞÷¶≠A±Äö≥.Q8óµ∆¢eÕ$mé€†fÂ"√}ÔÍ¯rÁöÖ∑Ò~Q–«¡◊i´MY¥Ç≤êe(
πlæ]¬ëáöKlê±M^˛â˜wœ1ˆºfD5V&fÔÌoÆËúø£XÑ81L¨€≈ˇˇó¯∞'@VW!†ùˇ$ëxÊıs\Œ±Ö=¿ò∏ái-¶≈ˇ	G&N±”+Ñ[°˘õ? Ω¿*DP†Gòü…Ú–¸:Óˆø3÷e€]óüv%QeAZá$àßí≈‚~êE1⁄tè’b‡e/z¬«‰Øgb
%É)Àí9FQùÂeœq;Î}•ÔfΩoÈB∂|ˇ∫∏ÉJ¬¥@ö%ªÍSNYj0p˘I0 yÆ„Ω«É;k∫@r]ån˛hƒ
ºñ™$:ëÄ¿T]5)$jek2 eË¡õdxÛﬂYå„ XT˝dA<EûMp]<∆8ßp⁄ W„	ƒ∞îxØ=nâ/Êwáz¢zÔñ~s-åÊ¿Ä‚w¢ëÛ.âßAåÄE7'Oÿ!]òÀ»åzÏ2bÊèÚ†ˇ]]ÄL%Ôicï;Ω=òô™¡¿ô˘∏ˆ<FH∞ÿ1t,3[≥“§æ6 &°`HìÖú@$,$%rXˆ‚F£C7@ËHgrÿ"∂&›j%L”x&v«+7êaH&¯^Üıò3ÖÚX∑
‚∫@Å…X@xYDÏ⁄∑¬4è(tjø˝-,Zçn!ÕæbgULIsc™4ÂZÖT}G	4éN%ä°{òdq«®M:‚é%!ºòô&ëu◊g›´|µò°Ä%Ô≠ÙÃ
Û>ø%6Wÿd|^™Úë¸Ë≈¡Îgáå˛ÈÛßØûæx^
µPØ©ìá»]ff∂¬¨o>&•◊«dﬂ2î"*MFvª|^Qå∆ÉI˙aπî‰„íxµK∆:/Uπnã4`éu]’JH//¶∂æ®¨êb`1â—Ñõ·$‰˚Ä:IØqqÄ08í'óßt„(¬
Z»⁄õaãÚtà∫¶å≠…Ü®b">r0≈–¡ÀË6¿d2–±}ëú,XÚHlGy25	Ît√_Î/ßj2»Œ&H§7ÎKUv;›Ó7»∫àEÍ£DDJ&π°ÌôLSO˚ã b"—8pzπ-™`GºÂ	,u*Í≤Gï™Qd.≈ysÃ/Õ\»Ô7Dé`ëì\@ÇÇi’-%<¢ã»$∫º˘SM  ^èº«»º∞09îé§$˚Jq≠H!I±√·‹î0BÀ‰Éz∑∞óPûuê€…D∞Xÿ”Ω.£SŒØîg9FÇ∞∞™<Wµ˚„"I
çUHo˛Ô	ß4UFn(Âä'«µr5.!X{pöPåT†5G^Ñ˛CaÇ<ä´ì∆Å1Æoe‰ñ∫eJÄ≈#Y\Ñﬁ˝s8´—_ «·9q^’ª¡¯GR`ß„èªπH®≤Å-°0ÏËŒ…`) ø
€´Y&r6‰¡xî˜Eÿ$œ,=øΩ±∆âçåUøB.≈ºﬁ∑ÑôÖvbäMç52.{ÛJ°¿ó	Öêƒñ_)?¸ÿM§)áj|2 tLhN<⁄4bñqÙæE∑o,ä≥@>Ê"wπœb”∂c®ás Åuÿ_œ¬)ìpâÉ øë—-”"ü4j&´X~LÓäôCÑç¶®H8
Õ≥4ÖÃ™rèY∑5IT$VÇ@πÛ ÇÔiëIÁEvÍE8ôjŒ™.ˇUêÍ˚,¢∏dFd&†…s /¢lf$/@†9˛zÖΩ¸Ò>˘6„tMà¨Ü}ı§G°öáxÛß0
≤’=¿wÊ>…Ù+È≥ËBx!sÒ@ÁÎLÁŸ´GÓEóﬁtò¢=ª˘ﬂ•…∂)«f–∏˘C.≥Ï]$?
≈!˙ÿ&∞b†ÓJ®ƒ” Rˇ}¬Â∑ÒF(û„“(fxπ5”‚é`kH'®Q(ê•Gú@º4N2@KŸË%ïÊ©…"Rn∂OûÅ•AàÃ9(÷G•“»
Sf<!iîìHFBxâl
u,∏9JΩi™“ˇyß.2ì©Q%◊†5∫eIÁ+T+Zπ;O=LJ±7%vECÏ¬
æü—i-¥_äâ°KÕA†öêãeSÂ«D€	£3Î}6äﬂ˚–˚§ÂhÇâÌÅ39B˙˚cíL‡oÔãá,\ât∏˜pmmIÂÄﬂ9Œxﬂä ÔZvœ£|mª>AﬂŒKE°l6êÂˆpvÇ/‡√$ShÀ<ÇQ[^öÏ^Ôàdˆ ;ﬁΩFb<Göq4|ø{]‰œüCíW≥0ŸYï+-«™ûë≥<Ái2¸ßò1Î≠≥Ò˘vÒsãù”ﬁz± –¿7X©±ŸÃ¥∑∆ Mßg„‰≤7äB@-l‘;ãr6 _ΩﬁÂ∂{ı°——[ôî~®õéLãø(—Ë3ëhñÈ/∫mrŸ¬Â◊RUA∏≠∞§¡W_√˜≥ÈÚ;ÚˆÎÄ)'ö„ÄYƒ"€O{œ?Ï^CùyÈçﬁÌ*R!Ω
‘…‹≠P¨÷ı0Ó∏o[∫Ïù·Â3"√ﬁòüÂl⁄{$~Ω]_õ^ΩcgÄzÉ1ÃáÕ¶¸ïOH©ﬂø⁄ªå‡lÈı8œ(FuDå«K+•		ê£	ê≤&¡û∞•¡yèí2§dàÒdL°˜∂ÕñËëËfkçç∂°ñÍX<(
-πªKı∏42⁄g√V≈éYÖªFS;´PõÄ@†Ωò"Óm2Ñw¶∞|≠`{…$4£r”ÖØ*¨¥TûmUŸGû≤X|¥iñ¶ÖæK`I∆!+ñæ ñ0¿Ω √0-=v¬úÏ∂:†g;´£Mˇ ÍQ ·ﬂDEm ]"h∆Ó“…) ¶<XrI›ø	∆3h˝ã˛VÉ¢(p	cÇïâpà´≠∫xzÄ≠ÔMƒuπÕü¸˝Qokk£w¸Ú≈¡¬M?G€7X¥√	≤∑Ó–Ø}±3Á-õﬁ~¸üõ⁄√UÌÌ¨¬.y`ÕÛ∏¸¨kÿ1≥2‘®˚˙òÌ¬ÿºjpüñ˚ÃòÖó£p†0˛ëò_4•hïPﬁ±Ω Ä7û¡FJmfB√¢(6±
1∆}có°Q¡i€5⁄á∫}å;¬qàRÒÙwVß∑9ÕÎ,õlªáªb{TV«ha˜iﬁø[-ë≈Üùﬂ¨l⁄øµ§≤ÿ£ák.·î  ∆Ÿ°Uï;”≠Z*ˇ»œ∆¸
¿ãO≤πr”
m’M√”»eo„s`†‡ü4ôaLëﬁ ∂$EÍjæ9Y
(ñ1Öå+Úü—ŸısäMú+2këç“(~ﬂ[k%nËX•∑Ê¿√≈î&MŒYñwãäsåÛ›%Zn:KˆÃââ?… 3ıH∑≈Kï»≤¯`¥⁄6„zä«‡)4Ã0á’Óı∆ÁÛ0©m’odÀ˛¸¯◊*‚$<oÚ$l4oŒND$#Âg∆ry…œÊ√B≥—®^0Ú)ÏaÉ’ﬂY[ ¯˜%dq)∏úò\_v≤_—Èè™âô1F!ô4ÔêÃØ® Õ>C`@Kúc˘#Ñ§◊St5®ﬂ˙(˙æ{ùÈåGfBßM8r@iŸ˚íJy∆rù8°OR´`˙S€5.Q„˛¿˜Ø¶#ù/`∆~øO9¡§òŒ“§yµ¥X⁄X–Éÿø¿%0éÂÊöAË:~¸¸!Ï y$E3öOPyÅrq&gÕ«¥ˆΩ|ŸD
˘˛Ùi°®$Üƒa¸ji°`§Éò Ì6dÎôTP0tü,|¬Ê⁄/ñ‚zˇdP‰ÿ¸QAö–Ìà†πÊøH+ÒK!ÅØ≥Änã»≥ù„ÉØWÖ‰◊Ä¬Ÿ›¡ˆo™;X`‘õ^iD]≈ìˇú˙ÉW®“/ÙV¨≥à»¸◊ΩΩ2·!*2êµ…πríÑ¬hs∑âã≈)`9ûbPqïñ`¶z6’jªÌüF–ó
ÙJ†HW™>†e•:≈Á}“Ô(‹ZYµIΩÆ?K®VWúƒ¶…Iÿ*rCØ05ó%ioöê-Ø1öûr˜Óc…çˆ`-Ö∂∞ íC
CB-{!úØ°púÎ%1=Ë§•?≤ÏÍÜ–¬ªåèŸÍÂòCîË˝^©Ë’Éu†Îï£≠\€1Å6‡˘%á’Zú∞€C–¨eéeCGI¡Álî˘\—≠v\Œ^XÉ*òli8¸v6Yz|ÑGò8ÎÑuêHr¿∆>%3º$q·Í∑ø>#œy¡E»´ú•«{h1ƒ_?Æ°Zç¥¿'v¨;t
$4√P;Æx∏ÙX0 F„iå*Yrò3¢ôZ„ëÈ.∆J‚Pî€ÄnÃ£ÒÔ•	Vj2ôyKÙs°-•˘u·-≠ .I.≠{¬≈pòñ7
$∂n_=bæ˘ø 4∂s2´√gÊ&"{Üèƒh%4Ê^¨Ü∫s@j§˛∫¨&°Ó@kbÊ%ºF6ôò@C^ıpﬂ¸	o«»W®R Û]paÎ¬«§£∂qËXF3¿áÌêZ˚âU©¶ZqŸüõ-m Ÿ*{IiâODZ‚èºÆ#˜N;üFÄ˙√°àMòW=Ω˘#ˆíD≈:%ÛoºùÉ˜ÖI‰
ÖA¡t'Ë_(&c@ÇsûíÒóÃúå&Qg23»≠YˆIXbŸ´µm;«£$Ê$£ıR›3+CÈ%µHóÃvfôπ©π∞rzr}^‘)CúkyeèΩÑ¬Àêè 0x∫ªtxµ≠•x¶\íÃ†Æoçê˘Y}πCy?“sû˜©≠ˆÉUV‰∑´™ﬁ<TùîÙ∂#~“ûq \1ˇ	p7ﬁË˘›§Ó`Öcu„HÖﬂÚmáIß§SJ*Ów„x±©Ê·Rb’[/™≤ﬂıåoÔÇ«àÌèt˛ão˛yÖ≈ˇˆØl„Ûﬂ≥ˇ«b"ÈÛÕ'ÙÎxØ¥⁄2ÌQãWy]K≥00 m⁄¥Q≈‘®lÍ‘î#D}¿Œí
‚ÎÍeçä“∆LjÌ–/BSº&P˘Õ®áú¶Ø´ä}∑âÍ?2≤4‘“Ë≤†JÜ1åwR’
¿;±≈±'∞∆ÒëÓùJ∞∏KÇné¯c®8õ‰ΩuSYFNOÇàì«ˆ3˝F5¨ÉÆ)¬˙¯‡Õäv“Úùªdàì(ZOZ»©˜Ÿ^*¯5§Ë)«qê˙)wÛu˝@∆ê±‰˝7IçSﬂÊ‰Êœ•x‰ê`>_b7Ã˘˚«Yug¥„?U†TsAsçÉV”¬◊Â˚++7àÁ#√à}Gáœ_ü>}uxtÇN≈{ØüΩÍüEq(”´†¥ONƒC´ŸâÙ˘b∫ñ8M⁄¨¶À˙º‚ÉKU/Äë°±Ïª·!LÉÛsD¢ı≈í¯ 
í/ë°ò8“ÄoüÜµJùä÷^Äú≠Ø¡8eÑl'„Ù4^Î`…T◊ØŸm˘)˜P≥ÚC—.&Œ,—cΩÙÃÑ+LE›«ZBù€∑y*LF2x^§…Ñ€q¯–UgJIÇËπ£m1s›Eû¥Ë†≈È(>∏®z‡PDXQŸ˝V+Hù.0÷z> ¸‚Ô®˙ì“Pí/l§üMÅ∞p5Ã∂ﬁnjf]ö–
[[a‘tª‰º±ùÊÚÛm˙N©ñ¥∫ÌÜ„◊Z”Hü*≠3L˚◊U≤πPJJ`	¶WΩ-654ê v§£¡∂ÒhÄ—˜\Ö¶!÷ùh‘M*Ö‡ñ–.67¯Ä*_DYÿ’l·°l°æÅz¸◊§Å€˘&ç¶oxä*±‘Í≠?™2J‹4å6õµ{%Âûb#º◊ÿ¯eÔ°asö˝[ü∑—Í˘tâ¬ÑCi}å"v‘˝Iüd,D/ä∂ÏS‘≥Åºà7ä©≠ò‘ø3∂ﬁ|©;oa; ¨O⁄†qª0Ò·˚Ar’¬∞1FÒ…’Ê¶‰UÃ∏U≈í˝ãüÍ¸ˆ^:£⁄OWòÙ6”Ç´úE„õv€XáX¢·%‡ò¸è∆< XÜ∏◊bIõ5„U«Gòc4Y◊m—Ò1al˘Ñ∏pÂ»éÉy–øWø\~1Ê'YÓ∂=
´tjã5)¿´âÕºbjZÙπ0∫äÄ¢ºÓç∆ÎJ_∑°y›ì´ÊÛU››aìÊúM â¯’Á™zÂÚﬂ©|Ω7ÓÓ ‹Vä◊‘ÈGäÿÜ†å˘‡∞◊QíF?íÕ"9∫+sÈÓ¨ùãﬂàP	Ö˜äÚˆ]—⁄u«ç`+E(ã√7
È±Ù•ÔV_†‘¡È-$⁄ixQ@‹◊I:˘¡÷ÂÙ’ﬁW+÷˛≤D“csÕRÈ¥<Q‰s|èo+õª–xè"™g‹ëRKU≈R™Ô‡˛EPı|N¯_dU´Ìˇ ™çr™c¿’lÙ…ä°>i≤öj˝E®¨*[àåøfâ—ÇØ–hóhê≠¬5¢£!O5Jéæwû{∑Rlì/}ÕË8ø‡{L«·‰Cp›6à◊™2IÂÃk›oÔuπÈÒ∫ÅeèÂ£©à∫•√+.ÊxŸ“YÓ˙l«|úä=ÛƒE*ı”`/-?$:û5Àç>”ÈJ@√√Øihù≥b‡¢,cli
æÏUjòP/ Í!cléüËôdÚ…é™G[˛J%6∂ÈT@”£R‡•ıf:’¥¨ÕDÃè/ö{Ë%/‘ÎLÑøitF´7w’S©õÀ-˝’X˘X{aZ„ø›‹¿#Ôì2≤vx§‰Û‚…®g»(ùÁÖM˜ÍÜÑ˝§—◊π…,˝	¶ ö|≠ﬁâµ—|z¥Âì(èòó MÖ…f{:Fdàk1‹[RXñÃ≥_%‰y‡Ì!b÷âäãàÄ•7a*îmd§⁄âZ®tiÅ›¨£à“°«¸·!ÖkƒÏu&‹ûüÊÄänÁ	PûMÄùM:ÑÈ v¯’›¬QCCúŒ∆C´Åa≠‡Uõ(ùÍê0õKÏ»TüÖK‚(OR‰¥ô’˚˜<]<¯ïäpÓk›e`Qˆ´ï'Iç	xÌl ⁄Ÿp—Œ€ˇ∞π1·;D;ç1t®*µxÔoR≤Åóhg´Œ∑	Q◊‚£ªı@–Q?ˇ‰ÄßW{Ø““Ç§‚Œ(ü9∫°óÄ,Ì°U0⁄ZÁêªs>⁄é[G”Ç5“ÜŒ”ËÍØ˘á˚Êc*P6k∂L≠)ò2≈[¡d]víØ®le…Câ_†Ò#ËJ)®¡pïÁ≥ˇ∞rK:úE∏ˇGkn¸Ç¡8æ˙â¥¥nÕb˘é‡6Îê∑µÏØ>LÎ’4ªÇıK;S◊û/§…˙˙¬∫ŸM€ÛLú‘≥d8À∂ìY>éb.lø≈#á±Æ◊Ÿ‘+=
Œ/qi8=[r¯A√	`rgUTX®—x˙}]´ ‰∑iñ«è vÖg»mZVÆ¶ÒW≤»mößSõ–°≠^:ﬂ{˙|∑Ëò:+5EåC"àªö©èÆ;≠◊ÜÎ<:∞A´ü√‡)Ö@ùS rÙ
Ñï#˙Wb/Vÿ¶ì?ZéyßD∂ã!OsëOJRÑ&≥Úl÷SOP”Ñ}≈c~#ä≥lbsıéZ=V7
ﬁ⁄ıÊ´ ˙‹nûœA¸~Ö—{nd—∏ﬂÔ[CÖ2cÑ∑‹>˘}»¿ú¶S1Ç˝(oX%,—zÕ*‘äÅ˚¥•–∑–îV‘))`£+ /NçLù[U˘'sÂ©DË∆®kyÊnq%oe∏€y€.*|¥T–^,0$ ˆÇÅ!÷
∂;˚)¶†h›-‰É•DÉÑp∑"ﬁa§√>VÈV4Î^+*¥ìî÷3¥¨J¶%èeô¡Û¨Ë˛;Y·#§R†s>’FÑ™√0Ì-©J1¡-ëb´IÕqΩ˜ÏŸÈÒﬁﬂ>uzt¯Í€'§≥û4ô∂(ü√XÚﬁe\|;>‡∫Ò|îÑY?äá„HXùFsì6∆U-ı‰§&oa^Âj…Û‰¸|Ã≠»˘u⁄XM-™-_Úk…aÈ¿”Ö9ÏcÌ…◊Ÿk”ãç+©œW◊KtMM‘ÉÕ˙˙ös%#ïËfô*2S|÷ª9ÙÜ}X»pmFøZˆIË¨zùûw•n›<ãV ìneÎŒÆãû0.«>^∫+ÉOH„jcµ.>á\òÊ¯ ÏV I[Ù¶ÚJEÁë∏πV7ÁmÓ&Ó„^|¶ŒBs≠9ªVµ>ñŒnwÁ°ÀaÔ™Ÿª»ãÒvT£ô±∆ò¡Ñ¸_c˜*∏RìÅ≈í¨’~zÛG`UìÍ@èj0mÿªêí1ÎÀ°7÷˘è]êˇ'Ëy$(I&î#U_&æ˘W‡ß¡Î—ò(£áQò4ÎãÔáø€¥ÉGnŸÏﬁ£Fvo®9ˇØ9ogù@#Rv‡e<¶úysM-†vƒi¥S≥j}pK{Æ
u∞;ô´6ñZ•›Q·ﬁ⁄FN6J%Ò◊®RµZ;!4j≠‚˘
#√xÜö∞tYŒßªK–aã≤ –Ï^ØµÉT√úıœ8?Ü]Ä%m‹ÿ∂XiÁ˜MÌÿ˚¥¬lé–&b¿º5Ü∫*\W«≥`Pd≠Mˇ¬ı˘h≠	¥«Á®Qﬂ`”TÂ≥Pê¯ö,ê‰›Ë⁄≈Á¡ËÇAñågÃ«ÖíD2Ì≠Øn∞â4˚Ù¿d˛*B%/=˛èwùÆ˛}’~÷%	∏%·©y<ÅeÄ“é)–⁄Ô_´∫π §*ˇÔ¡Õ¿‹	?™ä¯aF)îCÀl˝PuﬂÑ\ı.·º=¬◊ºÓçﬂV¨wµëﬂñﬂ^à¸∂'æ-IØ$º!häŸñ˛˙¸ ÌtÓÉ‡˛»m±˝Hm&oƒSw£)±¯π÷öí¶ÚüåéD¥F;¢Ö[I«n≠i|Ëÿ‘ïåÍ™“˘˙Æ·J¯¨≥<ozπëkX¨◊Ëäpl8SP˘äÃ¬Ú”&¿xŸF˛∞¶∏l~U.fJ“∂ËÕ‘"n
ﬂjU*¿∏ë{Ku…}m! ﬁŸK”‰Ú4◊ûÜ´èŸõdåtŸ∞q‚ó»eƒ9°x<´ ‡⁄®^^Z_rdìm˙C¬Ôua¿[_V£EÉ∫°9T7—ÄÀì:<Î“„=ô`›8MıºiÎjÀŒÃl¢µV®ëB/4‹
8YÜ6æB∆;± ¸J{e◊•©áy ï√ ëì[ô@VmnìëuÛm^ª<•£\ÔîèŒ0—•<ƒxvÃÂhtãœF…ÂﬁòßyÁ;—≈á-ë2 o ´˚‡ª⁄6k=∑[‡`Ñ	/kSí,\W¥§hQGçã
®P¨ƒA¶¿Í§Fê‰X2ß˝Ö~j˘ô√‹FUb˘SÜ.ö¥ˆ9Tπj∞k∏]∫-g¥êπÔ¶H¸√–?°•Õ/YåaVÍ1œK1Ñ5bós/S®ﬂd∞kÌ=¬<NﬂûH÷vÁ√ö«£¿Ï\ Ñ4g «∞ˆó qucQeÏ†˜0æ+Üﬁ…®˜å¬…ÛÔÉ¥“‚y–hv#¨ê∑´œgñ;ôaåƒmèÅÒ<OÑ++Ÿ_5⁄“˙πä∑bˆ™øLÍ\‘+MÚuÂˆÜœe¡— Ë‘ 1n\	«DÉ$Zv	¶Q+2:Ê√≠°{éa.ö+aFn6ºu9ÁîïuÈÒ7‚9˙˛0ã¶-lÖ›Ò‰<Ec{Í+‚ ª(haŸÏ⁄acj°•«/ l)~2	Bòm®s|¶ªps8"hgÈÒ˘ç^ÂòÏh·¶‡‘DÁ1Z'»o:∑¿¬m%rzˆDüRH˝åé‹¢Àñ C$ËC¨%∏é‰¸≤Dx–›¸_H'Ï(K⁄∏¶M&€∆¡r£KÉΩvCv€ZªÜ–fÄ›fíåﬂ3«gË`»ˆ_ıŸ^Çπ0ÅÛ	Zm˜”‡, Ÿ:;OÉÈ(fò¬`Ö¡1C»ò_†˚`•<óŸ¸V≈ÑûıkÜq˝¿‡„ûÙË)YÂ,„82íÒW–ô1N.
eûÂ‚‚ÿ®] —Ûp”„U=∫5⁄^ë˝ö\ó5Ã˘‹äh˚‰I),ö;~∑≠}ﬁ≥9	ŸÔ∂¨ŸÛnR;ïÑ£ÀﬁÔŸ˛w=:-s∏áéØ∏h;tN„ïMIgΩ’-Y+-€X∏◊ü˚o[
æA
µŒıã…/“,õ›¸9úçõáÂòöØ^lw_ÿÃbÆÄòéçHa˝Á{ïÌ£Û0¸EvA|¡∞Ñ}J †vÓ∏ﬂ4¨¨ïj[±µB≈√£÷õÀm LûuŒπäãW~W†ÎÂ˚¬^u&–⁄*√¥t\÷Ñ_H£¶Æ~aI∞ﬁæsc∂ëñ*LIÙCÃãLn«‰Jªuª|k!∞åét∫ø´¢Û:ïGéjn#[Ñ∆PŸ˙8í*8∏Í7∆!É”⁄‚Æ.Ò l8y⁄tí°ô[ﬁ˜ïc∞hòX_z¨ëI>˙yÜ`¶æ·Èß2¬uü `¬˝dF#∞~Ûp†D-dcßc'$·á˙nÆè^º~vàeü>˙ÍÈãÁ¬q¢3I¬VÒNÖ¨…}'¸Hˇ-4÷è¬wËv,#ø‹fg¡8„+¿Hr¿˙'6†Ñ¿¯ÍwlﬁsRÖEﬂKÁ,‚„pm˛í3&∆¥üŒ¬b\-„π÷≥EÇßä·…L˜2ÆÈO≥0EÔ¬2Ω\(.ûÃ
{Kkınõ=êè‰ÉvmØÆ≤“+ÒDZ∂ÙÜ|‘ñœÄ™}?#Kÿ8H`ÿ?¢:*GTä©≤ SÑNÆ@Åj®ù˛P,W£ÏpÈH®{ ßÿ«'›vQm’≤Ù≈ö√Í–¬~©ü„ O≈.ËÁ-zjcP∫â∏Ö "+L…∂ﬁæª“¢µ±ëVéL¯,]ïh†~ã⁄∑k˝µÕ⁄XF{°˘F±a˝áé¿‚HöKÎ]ç—QF£\5Ú6B|Æ;o$≠∞e¯wˇä˝^~«ÇLßÆ0<PÿÕòú0C∆zÊZë_Oi≤⁄e«Äv9Ñ˜%5È'›Œ'áÜ—:˙'}nî>:ËÉH"$Zikì>Ö9Öò˛˚∞cõt“€∑hËq_9±ãÌÇÄäâµâÍ¶’V≥—©®7÷äg≤lú‰®åM.yÿvô€Deƒ1¥:m,çõ∏jß¡Ty7ÈÍô(ÄÎvœw_˜ÆKj÷}∫ûçÊÿ[çäû˚“ÚPƒUbÀ0±&A:Q:î&Eœ¬Zû£ ≈¨¬µöÏ8N†Ï^0ƒ®üç0º£ëPR)Ç‚æ›Y0¬¶0M„Û“5n]¬k8o/H/n:…4o‰†ï{ıû¿hZDxüjhÈßˆ™]6!∫÷˙/∂†È~êÖ’+”éU’¢Æü˚,¬õﬁNN4çË§\’±˙Áå£ q˚º’Ã™ËÙ]õNõ¯”ªˆR∑Ì¥
=ïÈΩæiƒxµMCLÀ@¶¨µôVòç¢0‰±´l„¿ÆéFã≈_»«]D¢o”¨pÄ◊∆.hπUIvÀÎøæV2ºgØ¯ÎbÂöb/—ß⁄éÌó7•5Û&ªÏ°_ÀFy]08fs ]OíÅ∫Pπ®aR∆’t+	àΩúã'∞Ωá∫ßÔj≥mLÔƒ–| ¯Öq0Aã-@UöRÔÄ“á?Å{|yKÓÔ⁄GúñßI∂‹≠≤;f=-ﬁ˜5·,ùéπÕ9äGœ8n~ÚóÑv¥{∏,≥å∑Lv&é[Fîƒ˚Uˇ˜}[x∑{Ës˝∂	…≥(‹Å◊dyE“¡o{±ñŸºâŒ vF∞®	Æ©—V±–Ï∑lo¿”<»⁄∑»≈÷Ì…Õb´Ï8M¬Yû,–ZÜ…ÏÜP£hNÁ∑kﬂJí
´#9^˚ñÜ*âû—êN¨∑¿"—ùGh5S$Â[`82yü9ı®©ëwÌe¸T…-«·≈¬¢~⁄ÎR€%P`â1¯YDî¡œ¬‚~n!“‡ß0jÀ{wí~ênjs!á˙os3–¶–¢I,ò7˘ôœ[~üA·7îÑUß…û62≥m“f0CVjπìR\2òõBZ“Y{âE}~y	?-4≥≠Ó9
°Ö¶∑Ezˆq⁄ﬁ€Íº\7A]Â/Z\?3æı	kqM[=tíêA+8‘°1Í=(s•Oö‰Ãeèú°F'cÑ»‚ÑFìqå˘≈»7«Êø˘Œ»»‰”–Ï6™r—ù6â-m.<∫µ6wo(“\4ˆS+tEóøXÖÆ\B/Á‡ÉÄ8π∞˜§”uQp<¢ﬂOW≠+–^ƒ‰˙ÔHø˚IËs)Ó»œ†“ΩgÆ'¨iÛnW∆=mOQçπÜÊãõU{€&h™„BÍç°⁄∏¿Õ‹ú≠/XEé˜¸o£0Ì^Sº§F]tõ†™≠vujÌ/@ﬂœ"⁄ÏEıŸ‘WIìç=∑÷d∑Z∂OM›]ÈÎæÖ|ÚÁãÛ…ı°,⁄Rﬂ6·,™˚pÊÃ—8g3°L)¢ù3ÊN…@_–_†6ˆÉ£w¶ï0–‡p«õS∆¡m1åboµ7&ﬁ‘˚Sï¯Ú>¸˝Ôa√T>`‰·§lq´Ω´<›/∫@iâLSG¯zFÓÇ@_(%¿`ñ—ÁÜ?Ò•·œºI˛Ãè⁄g¬lPÀëQ™‘Ü–}	≤Ê“ ˛6:ã˛ºË‹ÄÌ%ä ¡•ËãiÉåud»#|N≤’ò«Á˘®Œ{m'ÿË⁄Íìˇf∆'(˜bÓKt‹•@!¡yíhÂç‚Ûò==^	&∆#ÙíJÆo"MJ0Mì´àÇb#$´IåYpÅ”û$π≈‡ m£Ï£$i¶√E9kG∂≥kaõjW®§DòR»ÉÁ<Õ&ÅôÇ"˙ˆfÏÊ_«y4Å/»dD1ﬁ5eb™8¥∆∏nó¬Ÿ∑(g-Mñã∏…ôk€›ÏKz±VÒ:	›∂î¥vÆme:^^&X˛ﬁeØﬁO€n¿ªˇ>ÏLb÷G$˘<hï©∏∂è2É∫É~zºÕp·ßsˆoˇøÖ¸".÷‘¬”H>˘Äƒç_Ñ19F"ºJmeK≥¯<˛Á˚ßˇ›»Bhoñ=¬ü…éûÄÙÄóF˘∆ªùùôD§ı\Û?ˇ€ˇÒˇ∞ù`ë*åçR~∂{˝›(œßŸˆÍÍÂÂeˇ<IŒ«c¨¬âŒû¸∞˚õÚ‡¸Á+ﬁÒ˘¸ªˆÔÙÒMvóNÅ˜äﬂ∑˜†OäQp‚$ôråP'0#û¶≠¬}õcOc§hê‰sÍ›hj⁄¸,¥áåΩ°90X˘Övrg5X®£Îe<˘A.<…ÅÓ.œØ≥‡åS™äºSﬁVÈ$¥ó£ÀJ∏ztƒæ˝v{2Y^¿π°.@CÈ≥–È<ÁI!*¸s,9å˜.Pè/°‚Ô·p>≥òëoéOD,tqNqQ
`)ˆÔm‚(‰œ∞œ±ﬂh®.9ú»~¬P4‡Ä«ë–Zπp±˚S≠	.¬Y¡‰≥LD%L»«.ˇäº.Î ‰Dqe”D1åÕÙ÷fIª˝Ç’œGkøA€&⁄E…|"„`‚	h$?¶l/GoS‹ÜÛ(.∞ƒÍ¯hT—z.ÌR0â¢≠ÆQ7åÎ ñkT¬+?ÌÌo‘«QW	Ω»K˛√NìB ù¨M⁄5ÛS8æ•¢)RUk∞•4≈¨•Èè˙,‡€ÆΩ◊˚≠‡•€äRçíˆF¶(˘æ=Ù•@XoOµ°§;G¡Ù8äïLæ^ó;¿Ûiÿõ|‚≤5ãÚ‘DD*∂•’Ö˙¥Ü≠E·€›ä(¿KërQ¯æHLìå[`H∂L‘EöÔZ‘ß=L(-F•N÷˝,∂´mQkªrM^ùM≠‘⁄Ô¥§QDoo˛hê[ÿ'ÜA—ÄçÁ7ˇí∞£Ω}4â÷ä$‘≈§f—9Ø/˘Ä¯9öDCkÉ1‹"kå‘–ŒE0âñ√ù‡Çüã`œ}vT\"?>ü›¸q¬»Ä˙G÷!ñì†Ü≈∆¢µµVtWÄ˙Kø#¨õä-ÇË*©”Û‹Å)”ßl˙÷ŸPé¯dê
≥ÿÒ£Mª⁄J
9å8%1,ä.¢,Dc	2Ë4◊f?SÌ@zÎÿ—˜uˇı4€ßhGIå_Ä¯‹…S
ı⁄ˆ¶•1÷Úœ~ˇíÒÒô¥ﬂ @¶_¶ÅÍ≠#1◊¿’ÒxñŸaò˜¬hCÉcØb/À»ÃaUÊV77≠võ.≤_¨÷˜“ÖMˆêë0Èö5ÿ-	s.l`v	ÉúÃ˙Ú⁄>?Q™Û'OÿÔ´o¶eC¬z®‘ê¥*2€Z_kj,äJÇqFaËÒ~6Gygô-ã∞1Œ-~ªˆÆ€ˇ@†≥œ≥Ÿ ÀAx8Ô¨≠∞çn?O^#PÓPvj.÷ïYõ¶ùfv`u‚Ûf»ÁÅÏ‘y‡æÉ^í‡1IÜÔ{∏Ω(\ÆÈ∂ÚE”8ÇûZzN*˚©ÏkÀ-dÄ≥Ñ0®ŒÛ€çœë∆Î¥√˙˙Æ¬‡˘Vµ6Ωsiöu≥∞µ÷h√cÓÒméSö∑Úó=,õÏ<dñUUWYÀr5∏FôCm!¡÷ª∑ÆI˜V{Ü.j-BñπË˝-ÌtuƒnÉ±ëîf|ﬁBÇ?ëwgtÌŸhb”là”¿Â.t√Ê∑,lúTÎTyÁi¢˚R/OzÉîù•…ƒ¶πâ˛˘h≠m2=?çˆ$¥Œ&&˘U∂qü÷∏w◊
IﬂôIôÔ~sΩ≈Hõt?_ä_ΩÆ•◊Lei·¸Ÿˆ KwÇÅ÷©NŸZ)÷⁄j ÄhN<+õ¸*œ≠xù∫ú-ØQ#jr˘N$.˚@VtÜ—Ña’ﬂJ“Ö’°¿π@[ó'$¥RïÏ¨“§ZyºÃ⁄ÿ±8Õ˚ñ¨ZÈ ÀP9‹√J1Fìh©?hΩ<≠">µ9√må ´yb]∆µ'Ú"RŒVrDF: ¬}¢ø©È6±ÙfdÚÖï6Ø‰è˛F≈∫µŸ´∞j≠FÖ,¬d˛Á(AbÒùôº~íÎ+˛cC‡ø◊56‰"Zc@RÈpá¶≈ãü™
76<Uõ∑	Z!:i©_^ÃŸUâ 7ÜF¡d<kÅΩ ñßç‹î$±üÿ¬yƒÔÃÈò˜õ‡¯˚≤√gµÕpY•‚x◊⁄iÙö÷Ø`üo6≤•Ÿj6Y‹O‚≥›‚ö‘ﬂm’ﬁ?	Ï¥tàr´Õ⁄x˘S›"©Y˛∆d,y°Rà˚dåàæÕ~£8œ˙§j‚”¬C‹éô∫UÜ›ñ6†	◊öÄµÒ@π0,yÕ;òG˘Ê§í§IëÒ†ﬁÕ√vGp\6ú&ÂYzPé§Êy·„eÎï¨‘6úUÎ{ºè¸ o¸(‚lkt€
MV⁄wcÁ◊?# jT9;îz∏πj+ŸÏUd£çE@qø¸èªˆk*Pâπ™ºïˆf\åÌ–EàOôex=≤{π7&^-(Ç:ÄWÌM˜ˆ_µH†ÿôí 3=«ƒI˙Í NÿK>M f1æêVº´∞†ìFõ4¨Ω	›º(Ó,e˙&ëÀ	3?…¥R“F>‚!%±	ºE˝ﬁbÏ$Œ8πºcΩ≥‡G8EdFƒ"º|T˝a2¡[]ëmëÀ‘É2°6W}GZì(ÔÖ˜ãDTKvû√√´mv¿¥ÿI4ætB≈ò_æV⁄ﬁläœã≠3;6eï¥F6¡Q˝'N	‘4÷u«VìvÚπQ‚ñ£´»:9ïÈ#ù¡ Ä*]dá√≤Æoln=|‘uá]ü§Úπ]®ı‡[›ï˝‹i'_k3…;IA)ıñ9(üµÔ&	Â√_UJ÷yï‰¡xÒçIF˘ódîwñå“8‚˜ïçíH}ΩfÌNrR˙)º0Ä™ªÉïô,SÆ<éJi#—u∞úÁ2Ä©éùaù"˚e∑:˝Â˝Êö¥]ÊkÃ´~:”†ÜU|º^ÿõz»˚’TÜÄÁàkøn7x±x∫oµÓwj}UΩ≈uÔ]˚∏;¢Œ≠ˆfQ¡pgï`ﬁ}·)mûÛù’opÄ£”πPå˙+àµÛ/?˚Ïˇ  ˇˇ ìu6Ù