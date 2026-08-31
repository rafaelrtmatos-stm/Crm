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
  DollarSign,
  Receipt
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
  ExtraCost,
  MateriaPrima,
  MateriaPrimaConsumo
} from '../types';
import { fetchMateriasPrimas } from '../lib/materiasPrimasStorage';
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
import { renderOrcamentoCanvas, renderOrcamentoSimplesCanvas } from '../lib/orcamentoDoc';
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

  // Analise Detalhada (modal "Analise de Performance") com filtros de Hoje, Semana, M√™s, Ano e Personalizado
  const [analisePeriodo, setAnalisePeriodo] = useState<'hoje' | 'semana' | 'mes' | 'ano' | 'personalizado'>('mes');
  const [analiseCustomRange, setAnaliseCustomRange] = useState<{ start: string; end: string }>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: format(firstDay, 'yyyy-MM-dd'),
      end: format(now, 'yyyy-MM-dd')
    };
  });
  const [analiseActiveTab, setAnaliseActiveTab] = useState<'desempenho' | 'produtos' | 'clientes' | 'extrato'>('desempenho');
  const [classificacaoProdutos, setClassificacaoProdutos] = useState<'faturamento' | 'quantidade' | 'lucro'>('faturamento');
  const [classificacaoClientes, setClassificacaoClientes] = useState<'faturamento' | 'pedidos' | 'ticket'>('faturamento');
  const [classificacaoVendas, setClassificacaoVendas] = useState<'recente' | 'maior_valor' | 'maior_lucro'>('recente');
  const [buscaProdutoAnalise, setBuscaProdutoAnalise] = useState('');
  const [buscaClienteAnalise, setBuscaClienteAnalise] = useState('');

  const analiseDetalhada = useMemo(() => {
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

    const custoComissoesNoPeriodo = (desde: Date, ate: Date) => {
      return comissoesLancadas
        .filter(c => !c.origemNotaId)
        .filter(c => { const d = new Date(`${c.data}T00:00:00`); return d >= desde && d <= ate; })
        .reduce((acc, c) => acc + c.valor, 0);
    };

    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

    const diaSemanaAtual = now.getDay();
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - diaSemanaAtual); startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); startOfMonth.setHours(0, 0, 0, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1); startOfYear.setHours(0, 0, 0, 0);

    let inicioPeriodo: Date;
    let fimPeriodo: Date = endOfDay;

    if (analisePeriodo === 'hoje') {
      inicioPeriodo = startOfDay;
      fimPeriodo = endOfDay;
    } else if (analisePeriodo === 'semana') {
      inicioPeriodo = startOfWeek;
      fimPeriodo = endOfDay;
    } else if (analisePeriodo === 'mes') {
      inicioPeriodo = startOfMonth;
      fimPeriodo = endOfDay;
    } else if (analisePeriodo === 'ano') {
      inicioPeriodo = startOfYear;
      fimPeriodo = endOfDay;
    } else { // 'personalizado'
      const startParsed = analiseCustomRange.start ? new Date(`${analiseCustomRange.start}T00:00:00`) : startOfMonth;
      const endParsed = analiseCustomRange.end ? new Date(`${analiseCustomRange.end}T23:59:59`) : endOfDay;
      inicioPeriodo = isNaN(startParsed.getTime()) ? startOfMonth : startParsed;
      fimPeriodo = isNaN(endParsed.getTime()) ? endOfDay : endParsed;
    }

    const diasNoPeriodo = Math.max(1, Math.round((fimPeriodo.getTime() - inicioPeriodo.getTime()) / 86400000) + 1);
    const vendasNaoCanceladas = realSales.filter(o => o.status !== 'canceled');

    // Faturamento conta pela data de CADA pagamento
    const faturamento = vendasNaoCanceladas
      .flatMap(getRevenueEventsForSale)
      .filter(ev => {
        const d = new Date(ev.date);
        return !isNaN(d.getTime()) && d >= inicioPeriodo && d <= fimPeriodo;
      })
      .reduce((acc, ev) => acc + ev.value, 0);

    // Custo de produ√ß√£o das notas do per√≠odo + comiss√µes lan√ßadas
    const custo = vendasNaoCanceladas
      .filter(o => {
        const d = new Date(o.createdAt);
        return !isNaN(d.getTime()) && d >= inicioPeriodo && d <= fimPeriodo;
      })
      .reduce((acc, o) => acc + custoDoPedido(o), 0)
      + custoComissoesNoPeriodo(inicioPeriodo, fimPeriodo);

    const count = vendasNaoCanceladas.filter(o => {
      const d = new Date(o.createdAt);
      return !isNaN(d.getTime()) && d >= inicioPeriodo && d <= fimPeriodo;
    }).length;

    const lucro = Math.max(0, faturamento - custo);
    const margemLucro = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
    const ticketMedio = count > 0 ? faturamento / count : 0;
    const mediaDiariaPeriodo = faturamento / diasNoPeriodo;
    const mediaLucroDiario = lucro / diasNoPeriodo;

    const periodo = { faturamento, lucro, custo, margemLucro, count, ticketMedio, diasNoPeriodo };

    // --- PRODUTOS NO PER√çODO ---
    const produtosMap: Record<string, { name: string; qty: number; total: number; cost: number }> = {};
    vendasNaoCanceladas
      .filter(o => {
        const d = new Date(o.createdAt);
        return !isNaN(d.getTime()) && d >= inicioPeriodo && d <= fimPeriodo;
      })
      .forEach(o => {
        o.items?.forEach(item => {
          if (!produtosMap[item.name]) {
            produtosMap[item.name] = { name: item.name, qty: 0, total: 0, cost: 0 };
          }
          const itemQty = item.quantity || 1;
          produtosMap[item.name].qty += itemQty;
          const itemVal = item.area ? (item.price || 0) * item.area * itemQty : (item.price || 0) * itemQty;
          produtosMap[item.name].total += itemVal;

          if (isMaterialLonaAdesivo(item.name)) {
            const invItem = inventory.find(i => i.id === item.productId || i.name?.toLowerCase() === item.name?.toLowerCase());
            const unitCost = invItem && typeof invItem.costPrice === 'number' ? invItem.costPrice : 0;
            const itemCost = item.area ? unitCost * item.area * itemQty : unitCost * itemQty;
            produtosMap[item.name].cost += itemCost;
          }
        });
      });

    const produtosCalculados = Object.values(produtosMap).map(p => {
      const itemLucro = Math.max(0, p.total - p.cost);
      const margem = p.total > 0 ? (itemLucro / p.total) * 100 : 0;
      const pctTotal = faturamento > 0 ? (p.total / faturamento) * 100 : 0;
      return {
        ...p,
        lucro: itemLucro,
        margem,
        pctTotal,
        precoMedio: p.qty > 0 ? p.total / p.qty : 0
      };
    });

    const produtosMaisVendidos = [...produtosCalculados].sort((a, b) => b.qty - a.qty).slice(0, 6);

    // --- CLIENTES NO PER√çODO ---
    const clientesMap: Record<string, { name: string; total: number; ordersCount: number; lastDate: string }> = {};
    vendasNaoCanceladas
      .filter(o => {
        const d = new Date(o.createdAt);
        return !isNaN(d.getTime()) && d >= inicioPeriodo && d <= fimPeriodo;
      })
      .forEach(o => {
        const cName = (o.customerName || 'Cliente de Balc√£o').toUpperCase();
        if (!clientesMap[cName]) {
          clientesMap[cName] = { name: cName, total: 0, ordersCount: 0, lastDate: o.createdAt };
        }
        clientesMap[cName].total += o.total || 0;
        clientesMap[cName].ordersCount += 1;
        if (new Date(o.createdAt) > new Date(clientesMap[cName].lastDate)) {
          clientesMap[cName].lastDate = o.createdAt;
        }
      });

    const clientesCalculados = Object.values(clientesMap).map(c => ({
      ...c,
      ticketMedio: c.ordersCount > 0 ? c.total / c.ordersCount : 0,
      pctTotal: faturamento > 0 ? (c.total / faturamento) * 100 : 0
    }));

    // --- FORMAS DE PAGAMENTO NO PER√çODO ---
    const pagamentosMap: Record<string, { method: string; total: number; count: number }> = {};
    vendasNaoCanceladas
      .flatMap(getRevenueEventsForSale)
      .filter(ev => {
        const d = new Date(ev.date);
        return !isNaN(d.getTime()) && d >= inicioPeriodo && d <= fimPeriodo;
      })
      .forEach(ev => {
        const m = ev.method || 'outros';
        if (!pagamentosMap[m]) pagamentosMap[m] = { method: m, total: 0, count: 0 };
        pagamentosMap[m].total += ev.value;
        pagamentosMap[m].count += 1;
      });

    const formasPagamento = Object.values(pagamentosMap)
      .map(p => ({
        ...p,
        label: EXTRATO_PAYMENT_LABELS[p.method] || p.method,
        pct: faturamento > 0 ? (p.total / faturamento) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);

    // --- VENDAS DO PER√çODO ---
    const vendasDoPeriodo = vendasNaoCanceladas
      .filter(o => {
        const d = new Date(o.createdAt);
        return !isNaN(d.getTime()) && d >= inicioPeriodo && d <= fimPeriodo;
      })
      .map(o => {
        const custoVenda = custoDoPedido(o);
        const lucroVenda = Math.max(0, o.total - custoVenda);
        return {
          ...o,
          custoVenda,
          lucroVenda
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // --- EXTRATO DE RECEBIMENTOS ---
    const extratoRecebimentos = vendasNaoCanceladas
      .flatMap(o => getRevenueEventsForSale(o).map(ev => ({ ...ev, saleId: o.id, customerName: o.customerName || 'Cliente de Balc√£o' })))
      .filter(ev => {
        const d = new Date(ev.date);
        return !isNaN(d.getTime()) && d >= inicioPeriodo && d <= fimPeriodo;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // --- LINHA DO GR√ÅFICO ---
    const porBucket: Record<string, { faturamento: number; custo: number }> = {};
    vendasNaoCanceladas.forEach(o => {
      const eventos = getRevenueEventsForSale(o);
      const custoPedido = custoDoPedido(o);
      const totalRecebidoPedido = eventos.reduce((acc, ev) => acc + ev.value, 0);
      eventos.forEach(ev => {
        const d = new Date(ev.date);
        if (isNaN(d.getTime()) || d < inicioPeriodo || d > fimPeriodo) return;
        const key = (analisePeriodo === 'ano' || diasNoPeriodo > 60) ? format(d, 'MM/yyyy') : format(d, 'dd/MM');
        if (!porBucket[key]) porBucket[key] = { faturamento: 0, custo: 0 };
        porBucket[key].faturamento += ev.value;
        const fatiaCusto = totalRecebidoPedido > 0 ? custoPedido * (ev.value / totalRecebidoPedido) : 0;
        porBucket[key].custo += fatiaCusto;
      });
    });

    comissoesLancadas.filter(c => !c.origemNotaId).forEach(c => {
      const d = new Date(`${c.data}T00:00:00`);
      if (isNaN(d.getTime()) || d < inicioPeriodo || d > fimPeriodo) return;
      const key = (analisePeriodo === 'ano' || diasNoPeriodo > 60) ? format(d, 'MM/yyyy') : format(d, 'dd/MM');
      if (!porBucket[key]) porBucket[key] = { faturamento: 0, custo: 0 };
      porBucket[key].custo += c.valor;
    });

    const linhaGrafico: { day: string; faturamento: number; lucro: number }[] = [];
    if (analisePeriodo === 'ano' || diasNoPeriodo > 60) {
      const curr = new Date(inicioPeriodo.getFullYear(), inicioPeriodo.getMonth(), 1);
      const endMonth = new Date(fimPeriodo.getFullYear(), fimPeriodo.getMonth(), 1);
      while (curr <= endMonth) {
        const key = format(curr, 'MM/yyyy');
        const label = format(curr, 'MM/yy');
        const v = porBucket[key] || { faturamento: 0, custo: 0 };
        linhaGrafico.push({ day: label, faturamento: v.faturamento, lucro: Math.max(0, v.faturamento - v.custo) });
        curr.setMonth(curr.getMonth() + 1);
      }
    } else {
      for (let i = 0; i < diasNoPeriodo; i++) {
        const d = new Date(inicioPeriodo);
        d.setDate(inicioPeriodo.getDate() + i);
        if (d > fimPeriodo) break;
        const key = format(d, 'dd/MM');
        const v = porBucket[key] || { faturamento: 0, custo: 0 };
        linhaGrafico.push({ day: key, faturamento: v.faturamento, lucro: Math.max(0, v.faturamento - v.custo) });
      }
    }

    return {
      periodo,
      mediaDiariaPeriodo,
      mediaLucroDiario,
      produtosCalculados,
      produtosMaisVendidos,
      clientesCalculados,
      formasPagamento,
      vendasDoPeriodo,
      extratoRecebimentos,
      linhaGrafico,
      inicioPeriodo,
      fimPeriodo,
      diasNoPeriodo
    };
  }, [realSales, inventory, analisePeriodo, analiseCustomRange, comissoesLancadas]);

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

      <Modal isOpen={isRevenueModalOpen && !!user?.isAdmin} onClose={() => setIsRevenueModalOpen(false)} title="An√°lise Detalhada & Performance" size="xl">
          <div className="space-y-4 p-1 sm:p-2">
             {/* Header com Seletor de Per√≠odo e Personalizado */}
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/[0.03] border border-white/10 rounded-2xl p-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                   {[
                     { id: 'hoje', label: 'Hoje' },
                     { id: 'semana', label: 'Semana' },
                     { id: 'mes', label: 'M√™s' },
                     { id: 'ano', label: 'Ano' },
                     { id: 'personalizado', label: 'Personalizado' },
                   ].map(p => (
                     <button
                       key={p.id}
                       onClick={() => setAnalisePeriodo(p.id as any)}
                       className={cn(
                         "px-3.5 h-8 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer border transition-all flex items-center gap-1.5",
                         analisePeriodo === p.id 
                           ? "bg-primary-500 text-slate-900 border-primary-400 shadow-md shadow-primary-500/20" 
                           : "bg-white/5 text-white/50 border-white/5 hover:text-white hover:bg-white/10"
                       )}
                     >
                       {p.id === 'personalizado' && <Calendar className="w-3 h-3" />}
                       {p.label}
                     </button>
                   ))}
                </div>

                <div className="text-[10px] font-bold text-white/50 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 shrink-0">
                   Per√≠odo: <span className="text-white font-black">{safeFormat(analiseDetalhada.inicioPeriodo, 'dd/MM/yyyy')}</span> at√© <span className="text-white font-black">{safeFormat(analiseDetalhada.fimPeriodo, 'dd/MM/yyyy')}</span> ({analiseDetalhada.diasNoPeriodo} {analiseDetalhada.diasNoPeriodo === 1 ? 'dia' : 'dias'})
                </div>
             </div>

             {/* Barra de Filtro de Data Personalizada quando 'personalizado' est√° ativo */}
             {analisePeriodo === 'personalizado' && (
                <div className="bg-gradient-to-r from-primary-500/10 via-white/[0.03] to-purple-500/10 border border-primary-500/20 rounded-2xl p-3.5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                   <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                         <span className="text-[10px] font-black uppercase tracking-widest text-primary-300 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Intervalo Customizado:
                         </span>
                         <div className="flex items-center gap-2 bg-slate-900/80 border border-white/10 rounded-xl px-2.5 py-1">
                            <span className="text-[9px] text-white/40 font-bold uppercase">De:</span>
                            <input
                               type="date"
                               value={analiseCustomRange.start}
                               onChange={(e) => setAnaliseCustomRange(prev => ({ ...prev, start: e.target.value }))}
                               className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
                            />
                         </div>
                         <div className="flex items-center gap-2 bg-slate-900/80 border border-white/10 rounded-xl px-2.5 py-1">
                            <span className="text-[9px] text-white/40 font-bold uppercase">At√©:</span>
                            <input
                               type="date"
                               value={analiseCustomRange.end}
                               onChange={(e) => setAnaliseCustomRange(prev => ({ ...prev, end: e.target.value }))}
                               className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
                            />
                         </div>
                      </div>

                      {/* Atalhos R√°pidos para o Personalizado */}
                      <div className="flex items-center gap-1 flex-wrap">
                         {[
                           { label: 'Hoje', getDates: () => ({ start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
                           { label: 'Ontem', getDates: () => {
                              const d = new Date(); d.setDate(d.getDate() - 1);
                              return { start: format(d, 'yyyy-MM-dd'), end: format(d, 'yyyy-MM-dd') };
                           }},
                           { label: '√öltimos 7 dias', getDates: () => {
                              const d = new Date(); d.setDate(d.getDate() - 6);
                              return { start: format(d, 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') };
                           }},
                           { label: '√öltimos 15 dias', getDates: () => {
                              const d = new Date(); d.setDate(d.getDate() - 14);
                              return { start: format(d, 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') };
                           }},
                           { label: '√öltimos 30 dias', getDates: () => {
                              const d = new Date(); d.setDate(d.getDate() - 29);
                              return { start: format(d, 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') };
                           }},
                           { label: 'M√™s Passado', getDates: () => {
                              const now = new Date();
                              const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                              const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
                              return { start: format(firstDay, 'yyyy-MM-dd'), end: format(lastDay, 'yyyy-MM-dd') };
                           }},
                           { label: 'Este Ano', getDates: () => {
                              const now = new Date();
                              const firstDay = new Date(now.getFullYear(), 0, 1);
                              return { start: format(firstDay, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
                           }},
                         ].map(quick => (
                           <button
                             key={quick.label}
                             onClick={() => setAnaliseCustomRange(quick.getDates())}
                             className="px-2 py-1 text-[9px] font-bold rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/5 transition-all cursor-pointer"
                           >
                             {quick.label}
                           </button>
                         ))}
                      </div>
                   </div>
                </div>
             )}

             {/* Abas Internas da An√°lise Detalhada */}
             <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 overflow-x-auto custom-scrollbar">
                {[
                  { id: 'desempenho', label: 'Desempenho Geral', icon: BarChart3 },
                  { id: 'produtos', label: 'Classifica√ß√£o de Produtos', icon: ShoppingBag, count: analiseDetalhada.produtosCalculados.length },
                  { id: 'clientes', label: 'Classifica√ß√£o de Clientes', icon: Users, count: analiseDetalhada.clientesCalculados.length },
                  { id: 'extrato', label: 'Extrato & Hist√≥rico', icon: FileText, count: analiseDetalhada.extratoRecebimentos.length },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = analiseActiveTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setAnaliseActiveTab(tab.id as any)}
                      className={cn(
                        "flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 border",
                        isActive
                          ? "bg-white/10 text-white border-white/20 shadow-sm"
                          : "bg-transparent text-white/40 hover:text-white hover:bg-white/5 border-transparent"
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary-400" : "text-white/40")} />
                      {tab.label}
                      {typeof tab.count === 'number' && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-full text-[8px] font-black",
                          isActive ? "bg-primary-500/20 text-primary-300" : "bg-white/5 text-white/40"
                        )}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
             </div>

             {/* CONTE√öDO DA ABA 1: DESEMPENHO GERAL */}
             {analiseActiveTab === 'desempenho' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                   {/* KPI Cards */}
                   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      <div className="p-3 bg-primary-500/10 rounded-xl border border-primary-500/20">
                         <p className="text-[8px] font-black uppercase text-primary-300 tracking-widest mb-1">Faturamento Total</p>
                         <p className="text-base font-black text-white">R$ {analiseDetalhada.periodo.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                         <p className="text-[8px] text-white/40 mt-0.5 font-bold">{analiseDetalhada.periodo.count} pedidos</p>
                      </div>
                      <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                         <p className="text-[8px] font-black uppercase text-emerald-400 tracking-widest mb-1">Lucro L√≠quido</p>
                         <p className="text-base font-black text-emerald-400">R$ {analiseDetalhada.periodo.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                         <p className="text-[8px] text-emerald-400/70 mt-0.5 font-bold">Margem: {analiseDetalhada.periodo.margemLucro.toFixed(1)}%</p>
                      </div>
                      <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                         <p className="text-[8px] font-black uppercase text-rose-400 tracking-widest mb-1">Custos & Insumos</p>
                         <p className="text-base font-black text-rose-300">R$ {analiseDetalhada.periodo.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                         <p className="text-[8px] text-rose-400/60 mt-0.5 font-bold">Materiais + Comiss√µes</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                         <p className="text-[8px] font-black uppercase text-white/40 tracking-widest mb-1">M√©dia Di√°ria</p>
                         <p className="text-base font-black text-white">R$ {analiseDetalhada.mediaDiariaPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                         <p className="text-[8px] text-emerald-400 mt-0.5 font-bold">Lucro/dia: R$ {analiseDetalhada.mediaLucroDiario.toFixed(2)}</p>
                      </div>
                      <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                         <p className="text-[8px] font-black uppercase text-purple-300 tracking-widest mb-1">Ticket M√©dio</p>
                         <p className="text-base font-black text-purple-200">R$ {analiseDetalhada.periodo.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                         <p className="text-[8px] text-purple-300/60 mt-0.5 font-bold">Por pedido fechado</p>
                      </div>
                      <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                         <p className="text-[8px] font-black uppercase text-amber-300 tracking-widest mb-1">Total de Vendas</p>
                         <p className="text-base font-black text-amber-200">{analiseDetalhada.periodo.count} <span className="text-xs font-bold text-amber-300/70">un</span></p>
                         <p className="text-[8px] text-amber-300/60 mt-0.5 font-bold">Recebimentos: {analiseDetalhada.extratoRecebimentos.length}</p>
                      </div>
                   </div>

                   {/* Gr√°fico de Faturamento & Lucro + Formas de Pagamento */}
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5">
                         <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                               <BarChart2 className="w-4 h-4 text-primary-400" />
                               <h4 className="text-[10px] font-black uppercase text-white tracking-widest">Evolu√ß√£o do Faturamento & Lucro</h4>
                            </div>
                            <div className="flex items-center gap-1.5">
                               <button
                                 onClick={() => setShowLinhaFaturamento(!showLinhaFaturamento)}
                                 className={cn(
                                   "flex items-center gap-1 px-2.5 h-6 rounded-md text-[8px] font-black uppercase border cursor-pointer transition-all",
                                   showLinhaFaturamento ? "bg-[#4cc9f0]/15 text-[#4cc9f0] border-[#4cc9f0]/30" : "bg-white/5 text-white/30 border-white/10"
                                 )}
                               >
                                 <div className="w-1.5 h-1.5 rounded-full bg-[#4cc9f0]" /> Faturamento
                               </button>
                               <button
                                 onClick={() => setShowLinhaLucro(!showLinhaLucro)}
                                 className={cn(
                                   "flex items-center gap-1 px-2.5 h-6 rounded-md text-[8px] font-black uppercase border cursor-pointer transition-all",
                                   showLinhaLucro ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-white/5 text-white/30 border-white/10"
                                 )}
                               >
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Lucro
                               </button>
                            </div>
                         </div>
                         <div className="h-[210px] w-full">
                            <ChartErrorBoundary>
                            <ResponsiveContainer width="100%" height="100%">
                               <LineChart data={analiseDetalhada.linhaGrafico}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: chartTextColor, fontWeight: 800 }} interval="preserveStartEnd" />
                                  <YAxis hide />
                                  <Tooltip
                                     cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                                     contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                                     formatter={(value: any, name: string) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, name === 'faturamento' ? 'Faturamento' : 'Lucro']}
                                  />
                                  {showLinhaFaturamento && <Line type="monotone" dataKey="faturamento" stroke="#4cc9f0" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />}
                                  {showLinhaLucro && <Line type="monotone" dataKey="lucro" stroke="#34d399" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />}
                               </LineChart>
                            </ResponsiveContainer>
                            </ChartErrorBoundary>
                         </div>
                      </div>

                      {/* Distribui√ß√£o por Formas de Pagamento */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between">
                         <div>
                            <div className="flex items-center justify-between mb-2.5">
                               <h4 className="text-[10px] font-black uppercase text-white/70 tracking-widest flex items-center gap-1.5">
                                  <CreditCard className="w-3.5 h-3.5 text-primary-400" /> Formas de Pagamento
                               </h4>
                               <span className="text-[9px] font-bold text-white/40">R$ {analiseDetalhada.periodo.faturamento.toFixed(2)}</span>
                            </div>
                            <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                               {analiseDetalhada.formasPagamento.length === 0 && (
                                 <p className="text-[10px] text-white/30 text-center py-6">Nenhum recebimento registrado.</p>
                               )}
                               {analiseDetalhada.formasPagamento.map(fp => (
                                 <div key={fp.method} className="bg-white/5 border border-white/5 rounded-xl p-2 space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                       <span className="font-bold text-white">{fp.label}</span>
                                       <span className="font-black text-emerald-400">R$ {fp.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden flex">
                                       <div className="bg-primary-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(2, fp.pct))}%` }} />
                                    </div>
                                    <div className="flex items-center justify-between text-[8px] text-white/40 font-bold">
                                       <span>{fp.count} transa√ß√£o(√µes)</span>
                                       <span>{fp.pct.toFixed(1)}% do faturamento</span>
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>

                         <div className="pt-2 border-t border-white/5 flex gap-2">
                            <Button size="sm" variant="outline" className="w-full text-[10px] h-8" onClick={() => setAnaliseActiveTab('produtos')}>
                               Ver Produtos
                            </Button>
                            <Button size="sm" variant="outline" className="w-full text-[10px] h-8" onClick={() => setAnaliseActiveTab('extrato')}>
                               Ver Extrato
                            </Button>
                         </div>
                      </div>
                   </div>

                   {/* Resumo R√°pido de Produtos & Clientes */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Top 4 Produtos */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5">
                         <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-black uppercase text-white/70 tracking-widest flex items-center gap-1.5">
                               <ShoppingBag className="w-3.5 h-3.5 text-primary-400" /> Produtos em Destaque
                            </h4>
                            <button onClick={() => setAnaliseActiveTab('produtos')} className="text-[9px] font-bold text-primary-400 hover:underline cursor-pointer">
                               Ver todos ({analiseDetalhada.produtosCalculados.length})
                            </button>
                         </div>
                         <div className="space-y-1.5">
                            {analiseDetalhada.produtosMaisVendidos.slice(0, 4).map((prod, idx) => (
                              <div key={prod.name} className="flex items-center justify-between gap-2 bg-white/5 border border-white/5 rounded-xl px-2.5 py-1.5">
                                 <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[9px] font-black text-primary-400 shrink-0">#{idx + 1}</span>
                                    <span className="text-[10px] font-bold text-white truncate">{prod.name}</span>
                                 </div>
                                 <div className="text-right shrink-0 flex items-center gap-2">
                                    <span className="text-[9px] text-white/50 font-bold">{prod.qty} un</span>
                                    <span className="text-[10px] font-black text-emerald-400">R$ {prod.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                 </div>
                              </div>
                            ))}
                            {analiseDetalhada.produtosMaisVendidos.length === 0 && (
                              <p className="text-[10px] text-white/30 text-center py-4">Sem vendas no per√≠odo.</p>
                            )}
                         </div>
                      </div>

                      {/* Top 4 Clientes */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5">
                         <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-black uppercase text-white/70 tracking-widest flex items-center gap-1.5">
                               <Users className="w-3.5 h-3.5 text-purple-400" /> Principais Clientes
                            </h4>
                            <button onClick={() => setAnaliseActiveTab('clientes')} className="text-[9px] font-bold text-purple-400 hover:underline cursor-pointer">
                               Ver todos ({analiseDetalhada.clientesCalculados.length})
                            </button>
                         </div>
                         <div className="space-y-1.5">
                            {analiseDetalhada.clientesCalculados.slice(0, 4).map((cli, idx) => (
                              <div key={cli.name} className="flex items-center justify-between gap-2 bg-white/5 border border-white/5 rounded-xl px-2.5 py-1.5">
                                 <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[9px] font-black text-purple-400 shrink-0">#{idx + 1}</span>
                                    <span className="text-[10px] font-bold text-white truncate">{cli.name}</span>
                                 </div>
                                 <div className="text-right shrink-0 flex items-center gap-2">
                                    <span className="text-[9px] text-white/50 font-bold">{cli.ordersCount} ped</span>
                                    <span className="text-[10px] font-black text-emerald-400">R$ {cli.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                 </div>
                              </div>
                            ))}
                            {analiseDetalhada.clientesCalculados.length === 0 && (
                              <p className="text-[10px] text-white/30 text-center py-4">Sem clientes no per√≠odo.</p>
                            )}
                         </div>
                      </div>
                   </div>
                </div>
             )}

             {/* CONTE√öDO DA ABA 2: CLASSIFICA√á√ÉO DE PRODUTOS */}
             {analiseActiveTab === 'produtos' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                      {/* Alternador de Classifica√ß√£o */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                         <span className="text-[9px] font-black uppercase text-white/40 tracking-wider mr-1 flex items-center gap-1">
                            Classificar por:
                         </span>
                         {[
                           { id: 'faturamento', label: 'Maior Faturamento (R$)' },
                           { id: 'quantidade', label: 'Mais Vendidos (Qtd)' },
                           { id: 'lucro', label: 'Maior Lucro (R$)' },
                         ].map(c => (
                           <button
                             key={c.id}
                             onClick={() => setClassificacaoProdutos(c.id as any)}
                             className={cn(
                               "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border transition-all cursor-pointer",
                               classificacaoProdutos === c.id
                                 ? "bg-primary-500 text-slate-900 border-primary-400 font-black shadow-sm"
                                 : "bg-white/5 text-white/50 border-white/5 hover:text-white"
                             )}
                           >
                             {c.label}
                           </button>
                         ))}
                      </div>

                      {/* Busca de Produtos */}
                      <div className="w-full sm:w-60">
                         <Input
                           placeholder="Filtrar produto..."
                           value={buscaProdutoAnalise}
                           onChange={(e) => setBuscaProdutoAnalise(e.target.value)}
                           icon={Search}
                           className="h-8 text-xs bg-black/40"
                         />
                      </div>
                   </div>

                   {/* Tabela de Classifica√ß√£o de Produtos */}
                   <div className="space-y-1.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                      {(() => {
                        let filtrados = analiseDetalhada.produtosCalculados.filter(p => 
                          p.name.toLowerCase().includes(buscaProdutoAnalise.toLowerCase())
                        );

                        if (classificacaoProdutos === 'quantidade') {
                          filtrados.sort((a, b) => b.qty - a.qty);
                        } else if (classificacaoProdutos === 'lucro') {
                          filtrados.sort((a, b) => b.lucro - a.lucro);
                        } else {
                          filtrados.sort((a, b) => b.total - a.total);
                        }

                        if (filtrados.length === 0) {
                          return (
                            <div className="text-center py-10 bg-white/[0.02] border border-white/5 rounded-2xl">
                               <ShoppingBag className="w-8 h-8 text-white/20 mx-auto mb-2" />
                               <p className="text-xs text-white/40 font-bold">Nenhum produto encontrado para este per√≠odo ou filtro.</p>
                            </div>
                          );
                        }

                        return filtrados.map((prod, idx) => (
                          <div key={prod.name} className="bg-white/5 hover:bg-white/[0.08] border border-white/5 rounded-xl p-3 transition-colors space-y-2">
                             <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                   <span className="w-6 h-6 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 font-black text-xs flex items-center justify-center shrink-0">
                                      #{idx + 1}
                                   </span>
                                   <div>
                                      <h5 className="text-xs font-bold text-white truncate">{prod.name}</h5>
                                      <p className="text-[9px] text-white/40 font-semibold">
                                         Pre√ßo m√©dio unit√°rio: <span className="text-white/70">R$ {prod.precoMedio.toFixed(2)}</span>
                                      </p>
                                   </div>
                                </div>
                                <div className="text-right shrink-0 flex items-center gap-4">
                                   <div className="text-right">
                                      <span className="text-[8px] font-bold text-white/40 uppercase block">Qtd Vendida</span>
                                      <span className="text-xs font-black text-white">{prod.qty} un</span>
                                   </div>
                                   <div className="text-right">
                                      <span className="text-[8px] font-bold text-white/40 uppercase block">Faturamento</span>
                                      <span className="text-xs font-black text-emerald-400">R$ {prod.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                   </div>
                                   <div className="text-right hidden sm:block">
                                      <span className="text-[8px] font-bold text-emerald-400/60 uppercase block">Lucro Estimado</span>
                                      <span className="text-xs font-black text-emerald-300">R$ {prod.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                   </div>
                                </div>
                             </div>

                             {/* Barra de Participa√ß√£o no Faturamento */}
                             <div className="space-y-1 pt-1 border-t border-white/5">
                                <div className="flex items-center justify-between text-[8px] font-bold text-white/40">
                                   <span>Participa√ß√£o nas vendas do per√≠odo</span>
                                   <span className="text-primary-300 font-black">{prod.pctTotal.toFixed(1)}% do faturamento total</span>
                                </div>
                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                   <div className="bg-gradient-to-r from-primary-500 to-emerald-400 h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(1, prod.pctTotal))}%` }} />
                                </div>
                             </div>
                          </div>
                        ));
                      })()}
                   </div>
                </div>
             )}

             {/* CONTE√öDO DA ABA 3: CLASSIFICA√á√ÉO DE CLIENTES */}
             {analiseActiveTab === 'clientes' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                      {/* Alternador de Classifica√ß√£o de Clientes */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                         <span className="text-[9px] font-black uppercase text-white/40 tracking-wider mr-1 flex items-center gap-1">
                            Classificar por:
                         </span>
                         {[
                           { id: 'faturamento', label: 'Maior Volume (R$)' },
                           { id: 'pedidos', label: 'Mais Pedidos (Qtd)' },
                           { id: 'ticket', label: 'Maior Ticket M√©dio (R$)' },
                         ].map(c => (
                           <button
                             key={c.id}
                             onClick={() => setClassificacaoClientes(c.id as any)}
                             className={cn(
                               "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border transition-all cursor-pointer",
                               classificacaoClientes === c.id
                                 ? "bg-purple-500 text-white border-purple-400 font-black shadow-sm"
                                 : "bg-white/5 text-white/50 border-white/5 hover:text-white"
                             )}
                           >
                             {c.label}
                           </button>
                         ))}
                      </div>

                      {/* Busca de Clientes */}
                      <div className="w-full sm:w-60">
                         <Input
                           placeholder="Filtrar cliente..."
                           value={buscaClienteAnalise}
                           onChange={(e) => setBuscaClienteAnalise(e.target.value)}
                           icon={Search}
                           className="h-8 text-xs bg-black/40"
                         />
                      </div>
                   </div>

                   {/* Tabela de Classifica√ß√£o de Clientes */}
                   <div className="space-y-1.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                      {(() => {
                        let filtrados = analiseDetalhada.clientesCalculados.filter(c => 
                          c.name.toLowerCase().includes(buscaClienteAnalise.toLowerCase())
                        );

                        if (classificacaoClientes === 'pedidos') {
                          filtrados.sort((a, b) => b.ordersCount - a.ordersCount);
                        } else if (classificacaoClientes === 'ticket') {
                          filtrados.sort((a, b) => b.ticketMedio - a.ticketMedio);
                        } else {
                          filtrados.sort((a, b) => b.total - a.total);
                        }

                        if (filtrados.length === 0) {
                          return (
                            <div className="text-center py-10 bg-white/[0.02] border border-white/5 rounded-2xl">
                               <Users className="w-8 h-8 text-white/20 mx-auto mb-2" />
                               <p className="text-xs text-white/40 font-bold">Nenhum cliente registrado para este per√≠odo ou filtro.</p>
                            </div>
                          );
                        }

                        return filtrados.map((cli, idx) => (
                          <div key={cli.name} className="bg-white/5 hover:bg-white/[0.08] border border-white/5 rounded-xl p-3 transition-colors space-y-2">
                             <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                   <span className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 font-black text-xs flex items-center justify-center shrink-0">
                                      #{idx + 1}
                                   </span>
                                   <div>
                                      <h5 className="text-xs font-bold text-white truncate">{cli.name}</h5>
                                      <p className="text-[9px] text-white/40 font-semibold">
                                         √öltima compra: <span className="text-white/70">{safeFormat(cli.lastDate, 'dd/MM/yyyy HH:mm')}</span>
                                      </p>
                                   </div>
                                </div>
                                <div className="text-right shrink-0 flex items-center gap-4">
                                   <div className="text-right">
                                      <span className="text-[8px] font-bold text-white/40 uppercase block">Pedidos</span>
                                      <span className="text-xs font-black text-white">{cli.ordersCount} un</span>
                                   </div>
                                   <div className="text-right">
                                      <span className="text-[8px] font-bold text-purple-300/60 uppercase block">Ticket M√©dio</span>
                                      <span className="text-xs font-black text-purple-300">R$ {cli.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                   </div>
                                   <div className="text-right">
                                      <span className="text-[8px] font-bold text-white/40 uppercase block">Total Gasto</span>
                                      <span className="text-xs font-black text-emerald-400">R$ {cli.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                   </div>
                                </div>
                             </div>

                             {/* Barra de Participa√ß√£o no Faturamento */}
                             <div className="space-y-1 pt-1 border-t border-white/5">
                                <div className="flex items-center justify-between text-[8px] font-bold text-white/40">
                                   <span>Representatividade no faturamento</span>
                                   <span className="text-purple-300 font-black">{cli.pctTotal.toFixed(1)}% do total do per√≠odo</span>
                                </div>
                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                   <div className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(1, cli.pctTotal))}%` }} />
                                </div>
                             </div>
                          </div>
                        ));
                      })()}
                   </div>
                </div>
             )}

             {/* CONTE√öDO DA ABA 4: EXTRATO & HIST√ìRICO DE VENDAS */}
             {analiseActiveTab === 'extrato' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Extrato de Recebimentos Fracionados */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex flex-col h-[400px]">
                         <div className="flex items-center justify-between mb-2">
                            <h4 className="text-[10px] font-black uppercase text-white/70 tracking-widest flex items-center gap-1.5">
                               <Banknote className="w-3.5 h-3.5 text-emerald-400" /> Extrato de Caixa (Recebimentos)
                            </h4>
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                               {analiseDetalhada.extratoRecebimentos.length} lan√ßamentos
                            </span>
                         </div>
                         <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
                            {analiseDetalhada.extratoRecebimentos.length === 0 && (
                              <p className="text-[10px] text-white/30 text-center py-10">Nenhum recebimento registrado no per√≠odo.</p>
                            )}
                            {analiseDetalhada.extratoRecebimentos.map((rec, idx) => {
                               const methodLabel = EXTRATO_PAYMENT_LABELS[rec.method || ''] || rec.method;
                               return (
                                 <div key={`${rec.saleId}-${idx}`} className="flex items-center justify-between gap-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl px-3 py-2 transition-colors">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                       <span className="text-[9px] font-black text-white/70 shrink-0 tabular-nums">
                                          {safeFormat(rec.date, 'dd/MM HH:mm')}
                                       </span>
                                       <span className="text-[10px] font-bold text-white truncate">{rec.customerName}</span>
                                       {methodLabel && (
                                          <span className="text-[8px] font-black uppercase bg-primary-500/15 text-primary-300 px-1.5 py-0.5 rounded border border-primary-500/20 shrink-0">
                                             {methodLabel}
                                          </span>
                                       )}
                                    </div>
                                    <span className="text-xs font-black text-emerald-400 shrink-0">
                                       R$ {rec.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                 </div>
                               );
                            })}
                         </div>
                      </div>

                      {/* Lista de Vendas do Per√≠odo */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex flex-col h-[400px]">
                         <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <h4 className="text-[10px] font-black uppercase text-white/70 tracking-widest flex items-center gap-1.5">
                               <FileText className="w-3.5 h-3.5 text-primary-400" /> Pedidos Fechados ({analiseDetalhada.vendasDoPeriodo.length})
                            </h4>
                            <div className="flex items-center gap-1">
                               {[
                                 { id: 'recente', label: 'Recentes' },
                                 { id: 'maior_valor', label: 'Maior Valor' },
                                 { id: 'maior_lucro', label: 'Maior Lucro' },
                               ].map(ord => (
                                 <button
                                   key={ord.id}
                                   onClick={() => setClassificacaoVendas(ord.id as any)}
                                   className={cn(
                                     "px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all cursor-pointer",
                                     classificacaoVendas === ord.id ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
                                   )}
                                 >
                                   {ord.label}
                                 </button>
                               ))}
                            </div>
                         </div>
                         <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
                            {(() => {
                              let listaVendas = [...analiseDetalhada.vendasDoPeriodo];
                              if (classificacaoVendas === 'maior_valor') {
                                listaVendas.sort((a, b) => (b.total || 0) - (a.total || 0));
                              } else if (classificacaoVendas === 'maior_lucro') {
                                listaVendas.sort((a, b) => (b.lucroVenda || 0) - (a.lucroVenda || 0));
                              } else {
                                listaVendas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                              }

                              if (listaVendas.length === 0) {
                                return <p className="text-[10px] text-white/30 text-center py-10">Sem vendas registradas no per√≠odo.</p>;
                              }

                              return listaVendas.map(venda => (
                                <div
                                   key={venda.id}
                                   onClick={() => { setPendingReceiptOpenId(venda.id); setActiveTab?.('pos'); setIsRevenueModalOpen(false); }}
                                   className="flex items-center justify-between gap-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary-500/30 rounded-xl px-3 py-2 cursor-pointer transition-colors"
                                >
                                   <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[9px] text-white/40 font-bold shrink-0">{safeFormat(venda.createdAt, 'dd/MM')}</span>
                                      <span className="text-[10px] font-bold text-white truncate">{(venda.customerName || 'Cliente de Balc√£o').toUpperCase()}</span>
                                      <span className="text-[8px] text-white/30 font-bold hidden sm:inline">({venda.items?.length || 1} itens)</span>
                                   </div>
                                   <div className="text-right shrink-0 flex items-center gap-3">
                                      <div className="text-right">
                                         <span className="text-[8px] text-emerald-400/70 font-bold block">Lucro: R$ {venda.lucroVenda.toFixed(2)}</span>
                                         <p className="text-xs font-black text-white">R$ {venda.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                      </div>
                                      <ArrowRight className="w-3 h-3 text-white/20" />
                                   </div>
                                </div>
                              ));
                            })()}
                         </div>
                         <div className="pt-2 border-t border-white/5">
                            <Button className="w-full h-9 text-xs" onClick={() => { setPendingGoToHistorico(true); setActiveTab?.('pos'); setIsRevenueModalOpen(false); }}>
                               Ir para Hist√≥rico Completo no PDV
                            </Button>
                         </div>
                      </div>
                   </div>
                </div>
             )}
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
  const [orcamentoViewMode, setOrcamentoViewMode] = useState<'detalhado' | 'simples'>('detalhado');

  const handleDownloadOrcamentoPdf = async (o: Orcamento, mode: 'detalhado' | 'simples' = orcamentoViewMode) => {
    try {
      const canvas = mode === 'simples'
        ? await renderOrcamentoSimplesCanvas({ orcamento: o, companyName: currentCompany?.name || 'Rafa Arts Graphics', logoDarkUrl, companyContact })
        : await renderOrcamentoCanvas({ orcamento: o, companyName: currentCompany?.name || 'Rafa Arts Graphics', logoDarkUrl, companyContact });
      await downloadCanvasAsPdf(canvas, buildFileName(mode === 'simples' ? 'Orcamento_Simples' : 'Orcamento_Detalhado', o.customerName, o.createdAt, 'pdf'));
    } catch (err) {
      console.error('Erro ao gerar PDF do or√ßamento:', err);
      showAlert('N√£o foi poss√≠vel gerar o PDF do or√ßamento.');
    }
  };

  const handleDownloadOrcamentoImagem = async (o: Orcamento, mode: 'detalhado' | 'simples' = orcamentoViewMode) => {
    try {
      const canvas = mode === 'simples'
        ? await renderOrcamentoSimplesCanvas({ orcamento: o, companyName: currentCompany?.name || 'Rafa Arts Graphics', logoDarkUrl, companyContact })
        : await renderOrcamentoCanvas({ orcamento: o, companyName: currentCompany?.name || 'Rafa Arts Graphics', logoDarkUrl, companyContact });
      downloadCanvasAsPng(canvas, buildFileName(mode === 'simples' ? 'Orcamento_Simples' : 'Orcamento_Detalhado', o.customerName, o.createdAt, 'png'));
    } catch (err) {
      console.error('Erro ao gerar imagem do or√ßamento:', err);
      showAlert('N√£o foi poss√≠vel gerar a imagem do or√ßamento.');
    }
  };

  const handlePrintOrcamento = async (o: Orcamento, mode: 'detalhado' | 'simples' = orcamentoViewMode) => {
    try {
      const canvas = mode === 'simples'
        ? await renderOrcamentoSimplesCanvas({ orcamento: o, companyName: currentCompany?.name || 'Rafa Arts Graphics', logoDarkUrl, companyContact })
        : await renderOrcamentoCanvas({ orcamento: o, companyName: currentCompany?.name || 'Rafa Arts Graphics', logoDarkUrl, companyContact });
      const dataUrl = canvas.toDataURL('image/png');
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`<html><head><title>Or√ßamento ${o.numero} (${mode === 'simples' ? 'Simples' : 'Detalhado'})</title></head><body style="margin:0"><img src="${dataUrl}" style="width:100%" onload="window.print()" /></body></html>`);
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
      // valor final desejado: desconto = total original - valor final que o cliente quer xúÏΩÀrIñ ∫ÔØp°≥@% Ç)ïLä2à§2eWŸ$SU”jôDâ®"ê>íE≥k6ã±YÕÊÆÓÆÔ, jÃ Ï⁄¥ıå˛dædŒ9Ó·Ó· )efU¡2E ˛<~ﬁèπwÊ%ˇ¿Ë≈ÁÒnêé„(ãŸˆ À&ÉôwŸˆÿâó«qÊMYüù{”Ó7Ù ˝õŸë7vCxseoºÈ"Ë®/ÛÔa‘…[Èi}uª‘ﬁÕ7ˇ ˇÆ¨∞^Ñôó∞›‡$Ã‚MÊù$Ûÿ,HgÀÇ©«¸ÄÕa‹≥ Í«Ï8H†ylvÊ•lûxlèûëÔ±?x,∏”ûÿ8û±‘õ¬+s∏âó†GCöAÉWÿﬁ´ÿ˜¶|¶OpfŸ4åŒˆ?HMˆ©∂,ÚÅCÔBÆNj.Ö∏∂ì~òçÊÛi¯]jkìe¯“7÷1º»ÇYZ√S˝˜ §ß6ŸÿK2π|G1LﬁcSò¥«ˆv_èﬁÏΩ‘÷,eù»ãYØÕÊ∏Ç—ÔöeâwÓ˘qó˝Ôˇ˚ˇa^öÜ3ú%47“4ˆx¡Âx∫XeuDó=h@$NX÷Ó«-Ë'dë«&q∑ì‡tdaª {„ác/ŒW¿õ&ÅÁ_x°ˇ<NépÆ,BG_Ö?˛ﬂÉ&Œû/¶S∫÷Ö•◊ƒT“ó0ö¨˙bt:È&2Ô≤'€æ≤/Ÿ|péª”c√.¨ﬂ–æ	á¡Ã#h≥Ÿ,R´æ}í}˘Ë^î%aê“√N9Ç(⁄h>ÿ‡ò7 7„`6J±60ÎÎ¸¨™”‡œä„L7ß¡8¸ùEö≈3y0?_¯0Ωk˙õÃºG ¡º˛Æ·Rµw Ï·∏µaE&qTzÓ /“Émvé`MãQh+”y˚Æ∏µ[¿ng®Ãc<Åçü∏¿b©r	f¶Òq¸2{”]/pú/¢˘"≥<å—n+£‘QÄŸ´ õƒ~G}`Øá¢Y±≈)ÙØ_ pôwÊ∏Oùk6ÊÏ¶ã˝™S-#YﬁÜØaX√°˝u~˙;OŸÎ≈Ï$ﬂmÌ¶9{µEÄÍ†”¶√n<°a;uc^§ âÿÌd	Ù¢ÄQ ÷ô7éÉ±;‡6—npÊ±Œx
8„<ò≤`∆éÇ‰<«È k8/)^¡D ,Û`N3≥ô«QœÛ∆Ì'16®—ôÓ&ùg¯Ù≈C46ÛËi¥F}#∫à9˙¸uÜ4ÜﬂÄ∑æ'⁄(n ÓÏœÀπtº/8ÙÎ¡¡H ”XéH^ËA˚3\$ﬁY‚≈¬a∑¥q∑ÿ‡˘ƒ/âŒ„˘béO·XÁõ1qDQÙè∞Ôa^DË@2£`(ﬁK¬ò¡@êàŒ~æ+àªaQ¢˜í@ (íÄëy
{»GQwó∂a√^Ic†ÁÈ8	ŒÉ$'”¯∑dáÈÄçŒ∞/ G≠ÍÉ=(»[6ÚóL?¥8e=‘z|3K„ü¬h#Å„KûÜ≈¯5í9»QÓÊ3pü%íyûƒ≥‹X$ ¸Q/>Í¿Xx´)¬*=kûÿ©l€yÊ‘ôÌS8,â2)/Ωä∆USOYÁA«ª¬å•ì¯b'éN√d÷˘ä!d∑¸–ßC˜≈5∏D ∆Ç@‹ËÓÈ‡Å˛eã$‚3‚cç‚ã)r©Qp¡pA:›Aø8⁄?ùu∫Í√◊‚DIKyÉS‚c]Ã=‰Iß0Y@d!iª;XÃ}lÒViÿölë¬≤Œìÿ_dÒ{9<†g¸aˇΩóm Q›t¡èùvË√mömËw)ëV90\2NFák6ö⁄Í|x˝Òø«Ï4p”Ù„_ÀŸ–&¨#Ω>ò·ô8n>tøëÀ$¯r⁄B∞æ¯w0¢≥l¬û<yÇ\è⁄oªaøƒÊ€9¸9ú$¸LJ|é_ EzS∏Ï—#∞˝‡*9`œÄFƒ$'	≤©í°GÅ`–.MB∞ÖŸ¬õÜ?aÉOH\÷û‹ü#Áˆ ÏzΩ wi§lR~@F”)Bu˙Í8πÍÃ7!p„_"Ã)±ç∞ã¥tbG·H*√⁄diW'Å¿¡˘ﬁ›+∂ËÄ/:míu_¥›ß9»¶∫˝°ﬁ≥ë?‹¬@h©Û˛3üpâ8ﬂü∆	Á;?√ë∂rü„L[;˛•jÖñm2`-Ç”0
¸øä3<RVùˆ‚„_¸X;º¿ºä£yó¯‰?YÖî≠2ì»¬(‰˚·pÑp%¬˝Nfã)±q‚≠VÊA2Üwad=ﬁ>>‚°h
◊ß^⁄ÆÛy;ÑßÓÄBß	HÎxPˆGU¡ƒå¸K[ˆH¸†‡}øOÒJÊ·8Á¡4f'¿ì«¨ı%Åî∆ëó¥`–Ú>L%â≥ ƒÊ“ûy∞ı8/éπû£F'¸)Ã^p¬kƒÎ◊…áìèÜπà‡uí˜¨Ë¥[0o'ãpÍ+‚‰bD‚£êy^\Ω«˛»◊ Gâºçƒªêo j/à+  ¡>eCÿ!SœhhQ¡‘∂P¨‚M[◊.Ñ¥Ná‘FÏ∑˘H∫lÖ≠áàüáó p≠ë(oË©Ëoã–?ñ4K˛v.î?\‹
a–ﬁtJ"+"K¨R~Fã'OÉ‡Äﬁ˝éHô5	“|ﬁ®ŒÚ‚˜cí"„vW¨?”`¨q„Òp1xî∑ÖƒÔy§Üﬂ9≈≠=Ëç>q5€}:PZD9[v$WLnP±ÃøeùUêLî˜¯Ni[%î©,ò¬i´]üƒæ6˚Õo}SíÌo∞≠ÄÂÈ˚ùÄÿàJ^zp 9÷z¬i¿uJbbH–q
„“≈ß¨3U•ú„0}ßÙ\w¿≈ ÙW≥ÚØŸåVxìôkﬁcB?à4g”òPOƒû∫<7&6Ê|”»˜]◊D*!ú'Je3–„πﬂE\∏Ò¸„øÆ<Oíp. ñ	rY«&Iﬁ[TF¡˜°¢éz≠·´≤ËµıuVã'æ∑¿DÁ‘ÉSP<S~†]fuâI	4‘k˙ó˜Ëb∏c™D›OCdr:ù˜∞≈ÙV»¿·É∂#ÖPhíÇ{¡HœMÇ0!R‰!qS¿ÑÁ$˛fI<˛Ólß˘#?<íÄËrÒœ˘ÊmÛRÆ§BÜ5¿≈"OV ı°°»Ëe8£∂‡—|UﬁÜÈëw0åΩsç);P#P∫ÒéR•‘MPeâ#Rõó`ÿ‚≈Bñ†YæA0∞¨;Åmj®óü"€Á∏xS#L™
£4‡Bá¡Ó∏ƒy|ƒdÂ!ÂƒÒMß≤GÅ˘;cTª]—¯∆9gåy¸ßjIí"ÌK—£FËíé.v®çn™£˝R]MÍ∞åNéD=≤I_!…ª|T”ÿÛG BtÚ∑ÒòyÈ‰0·y†Ë≤U÷ı√· ücSˇ 	ÊSoGs „l˜⁄›ÍRL'ˇLÀG∏DBs.h;∏|»I·ÿÀ∆öSW€ÿ8mö[ßΩ4ﬁS¬óMÔn≥M°e66ŸH6€ö¥Û±ù"c:- Œü*&ª…Qú±Ω”S;:VR-6SPÅ˝ıª™∏⁄Uõ∞LËOøæpí'T#¢›ú˜∞7æmm∫=CiKÆÍë”ie}?LΩìi–èÇÀ¨W8œﬁ8ÎO‚¯át%∏úx∞Ô j}?òß∏2=ˆVÔÈås±⁄#Ï¡◊∆£åvàº≈˚Caróàﬂ$˘›Æ∫ßØçªˆ.a=q!U⁄Û∂Õ∏˝NcåÓ∂<÷Œ≈*AÀ˚“î‚ü@‡&¯§fÚ√»baOPtDBñﬁò+¿U>AHãxKJR∫≈∑ìÄ6É¥)Ï	 Ò Aíçƒ„ß^Å!ë¿YRßC€ØIfõó®*@≠;4
xﬁˇß.CÔÄ)õÑ…E∫¯¯o ÷*·‚AX20È‘D⁄h–bß8¶(≈°!!ç‡†—D˛ÒﬂÑ◊ @p≈Ã< Î∏
\”„Îèˇy_∂<l—Î‰ˆu€™ÿÎ Ö#Gs.&CÄ•ör‚û~¸wM"[fO(b>˛	qòüO≠S/˙¯'x¶ÿ§(à&h˚∆·Ä<NØ≤)Ä;ò»y Î!;˘|äù
8:¥(j:üB¸ ÑŒŒCxHÅ6a_·ÛW&ÅJÓ"ñ¸„üë]Ç¶=÷·™v÷"«Å.y}ËÑ3Ä˘™JàﬂdÚ1€Y¨mw@kÿ[h• ‡ë≠J<FÌºAC≈‰¢|èHá PO…ı óN5Ÿç´êJ†krƒ»–+tVÖ–B”gS	6€é©xªvDäπ¡˙à°>h∑+%Sõí¢kpaÛ1J;e>«@W /tA©S:j∏Ê=ŒåYé3ÁúÓ'óQMœÓ=“≥Hó˙JˆJŒ$n'TπíﬁV}g¥;R—0ä§Oìåì–CµöœœwÊ…æ	oµâA Â†cB0¡Kc°Ö<ÖÛòHïÂåd|ñç—Ãﬁ#Y'[p]?˜∫˙)îWøãˇp	„kù≤ (V<V»Óﬂ(7∞Áﬂ≈`]á=&˛”‘iß·Ã“Ä∏ZºΩ∂ﬁcøÊˇ˝ı◊∫F¿”…⁄§\„∞„Å@R∏Z&ˆÛ€›¸Ÿ©óΩÚÊù≥ ;ŒÉhÏù£ÏãŒ>hÛ5⁄‰“Áµ‘ú®£ÅÜ\^áª€O‘•B%äLbé œÁ≠Kœ'o<Ë:ßáÔ `@´πÔ”7ñçiËS•?©è-‰=ÄÓ
≥	H8s/Ç{ƒıˆê‰èÉ	íX yÈ  §&†Ë˚ﬂo"E!úOzl¬Û¿‰öç(.ÿù‚†Ô_ê¡∏#õ&çpÇ†´)¢QÖÉ∂éÓyª%ÈZz—qÏxrB¿#ï£RM'¡Yàî&Y˘ë˚gËﬁq‘áé2©^ƒ-‚i¨tÑ8«ÒB6¨Íı˘Ñ•ö%°X‚êt†Ü9ﬂ©17∞$)∑7®úÑää8ÆPS¥ ´é^ÌÍ)◊iœÙ¥GﬁAß˙˝›HüL«m∑£_Gx˙qœ®eê∞£åJ#©Üä»—i◊Jå,Í∞&
±f*±j•“µ¸HMΩ+`]¢‡
¿l˘Eâ∑Cie·˜N{ÖûOW–Æ’G•öê≥˘z1zk RˇUß; a]¢Ùõí[åjè¸=ôh’”8oÕU∑#8sÚôJàèîˆGÚôñ6È,€“=¡Êÿ	†ÂX∂Ú%g8ªàÄ@Iô(~¬Q|éˆcÊ˝aë›Æ7∆ìôr‚*;ÿ}Ò|ÔpÔıŒàõªÖ‰ìQ∑M»ktîôGŒLD£} —ürbâ∂—F\%tz®Z‹¯ÉÏ±b‘‹}Å;0º}-û±›^—<ŒÍ,Y'ÄãÄ – áb¢˙0Ã;ƒ· ‚ÉÂö°_X\¥.p+¨ ÛDHC8{¡©£Ez“–eàÈ§z%]ú ñ-‡ª:z·EÃeµáCaÂÜ6ødèÜ(ëI<ƒ9·}∫¸Ñ≠ÆÄx4Ïÿ=û’¡+´}äÊI!Wág®´Ûh∂»)Nq˝ N·»·÷ü{!˙¶êòÖ@Ë√[1ÕGÏ∏<}‘¸¥>ÀC≤)YƒóÚfv!πR?–∞≥œ/+qØﬁ Óﬂârz†@&|úÛNÚÅ®®á{yÚìfú3E7éß:[H?óB^Á GG-•°§y√π—ﬂC'z2⁄ﬁp ÓÌâ~ëâÀìËgg>[∏DVÎ0ª ’	Ï8=I_å˚≈è|Í∆®F4˙M<’q‚o•dòÍ	ï˘6:C‹oñÉ˘áç~˚Æ; ≤æÁ!ˆU¶xM%êébúΩëMTﬂ:Û".≤i£z´<á&ÅN≈]Ç5Äe±;ayP«ƒ_√N5ú6;Ôqrÿ≥kjÂ{Õ'ñ≈@é^¯¬ÕéÇ¨É‹œ˛…‡~ÆR}·h⁄o„ ∫Ôîˆπ“¯‚Yò‡:#D/‹¶ ªÌí7ä`«Á°Ø0’Í(˝`
Õò1<.g⁄7∑π∏˜ç“.ºhÍI…J£ˆ«Ω±6II∆≠N„à–£°qDxSµ«ãE–˜p¸∆?ÙHM‚©˜^ ä∂b¡)√\ùG K”†So1 ì¸«¿lî†F»%Í˙©ËN‚·u§Æ°h[7_bZ9m|¨vIr{ë÷Ê¶6úc=‘nÚÔ7].—©ì*8îÌ¬TfOàÅ∑êÇ]âxgûå€z‰©¿ƒgÔ1‹ƒe9$á=ıqˇ=èF)ø	ƒZU=≠-ä¿ïrìsº‚lì¬[‘F	áÛ∞-ı2Wã*d(∆{¢ÓõñË2À kˆ~.ÂÓú´è$¬÷'€µ>$ÉS6ê¢>+=§æ π@$€RÄ€®W[}7>A?^ä˜qA˚≈€ßMãªàÓo€ÕªﬁH@⁄•®xyá_ëÏú´hå{Ü∑	€¥@Ö|VÌOÛ9u∏ÆÙî„\˙2ÉPrM%ê´¥◊ªñÚóph{‹ ª/=F#iKÆÒ*πà¢œÇê—HYr+ø“∂ä¥Pä∆àTà$»€Ì'“≈(XÅñv®˚y˝≈%†í«·£íy\ûÉ∞@©⁄6<í¬[IÖûRHä√y	ôúàwo†ª–Oﬂ‰}"
-ÌJ,áä±reò#ˆCÍüqÖYÌãúYz˚Nﬂ.≠S≈¯©”∞2'°øá,z@lk§…¿”˘Ë5≤§¢1i”ÒETØY5ÿ˝Æ“kW◊ìZâ≤o7"ﬂ®4QPÆ|mm»¸EIqbqÿ8KSØÔõ–‹?ùAÇéõÙÆ±ySAk
wlÉ‡4¢7o~‰∆:G›+˝^Héµüú8|V≤3jFuä„ôŸK/Õ§QÄÀézFï≥L,\È»+U<¢êÎN<‘7E)≠:˘8π›JDeÊZBÆI;‘÷y§b∫@;Y åÄ«„i|Ü:õ(f2kÑ„x†Œ`…†°Ö-QÁL^ˇÉ4N≤Nxﬂí«Úu=)∂†;8≤cÄùä˘ûı	-.ò–p¿zÛ/“£≈çñhAÂ°RØÆ•V°Û˛;JX∑xd∞R–-ghF°óﬂsÖÑã€∂∞pŸ∏h©ò‡ÈÊæÅJîÉ∞ÕÊK◊∂&ÏÒ—˙≤Âg[mAuçJëÇ¸9<‰Ñ≥Ù(\F¯I2Ω„XM–ít?Iˇìˇ@JQKOe–w· #0	∆¿Êµo>Suü©_7ìz~K>õ:˘πV]6Ωêx+äQk^Ü˚Pä⁄í@hùÁk√£hò©ŒÔ‰Ã≥™"Jn‡{âml4:`!é,tˆBôÔic5iÏ≈~]ª{o* b6Àxœ2≤∂Ur≤ÛA7Ûr_lã∏&˝>\»€í^5ñ¸r	∫"∑∆•i=	Mù(}{—÷HvÛ◊)◊÷ä7Lóo¥EÈ±[ûñª1˘˙9`ñÛ∆v`ÿ]Œkv‹ò¥3Ì’ê≠£.«CèﬂÅáIZò∆\¬)"Mã;¨êôΩr
ƒ∂⁄;A~;Ñõ!Ê^vix)@Ô.TsÃê‡¶º≠¥´ˆw{û]x¿Pµ
é›ŒØKõÛ}ÒÌ&˘e3ÌMF˚…8v=CIôÌ˛sÊ’iôîm¯ÑÏ˚m∏syV>˛˘ƒ≤R«îÁ^g™Á˛}Ò‰r‘èyQ∂ŒÓPÜ∫’1DƒCcÑ◊’<àOYÈ&Wl!” S‘Öôõ¡‘¥l6Ás¥Zít’9Ïyã.jñ˜õ\T9¢ï+ÜÊƒ»£Ç…(.ÂÜj¬ﬁ≤Ÿwı”H”Ä°≥ÜÍ√Èxëw!`4≥Ô¥bUºVó"∞+Ÿ≤å®ÿôMD˙&-UïtÄ‰åŒöp
¶ºL(¯≠~5·ŸíÚy…¶ëeJ 'b~EˆÓ˜sVHuJÙyr°+äÙ}“à"+A„JCË{ùd0a<éﬁmB2√vÓ£™Ωmf»Sî»hl¸ ˜ﬂqçDÒEß{ÛArB»õ¿πF˝±Ërá_ë⁄„6å÷[L≥úwØS9õœ’Èìe*=Ñ¥gﬁt8!ÔÀ•Ó’TΩ∑‚ 5Óœ<_Ω{hºüÎ±πä¢çãÈ¶q@Û˚Ùæiﬂˆ
(ü
B•IJñTÆßä¸h¡ùÊ;W®lÎƒù!’NÉm’õ´™9∆Vp‚68—GB÷¶Î"Ö–ÿ#<ıD£–w%O QvïŒ⁄ãáA
0ﬁ\¥Á/+¢Ωaß/gçÏï≠6¿/àSﬁR≈=!"Ò{ÜD◊	à\àe-k¯£ÙõÚ∫ñ¯Q?ıß¿≠Xˆ$ÿµÚà,òÙKπ´k
,y5K“ˇí∂˝‹ÃHN¿â˛Älon8-ø∞¥ÚÁ¶–!R√i®Zï† ˆƒv r©N‡3/ºÙ¥Ã6AÓÎHa–IÉ‡IÙuÈ˙√›û81-"ä[=ûE»/pˇG@IêÆÛÊBäl»`Ã't0≈®…éb˜U›üÅS◊®:ıà•¯â'‡¬9J`Ä&Ç5@ÅQ˙≈ñ- ‹]è€≠©]Ù¥ÑøÜõû~EÛ‘S=Ÿ9√ïç„¢3ü/ÎﬁVï+ß"†?µ>˝[~Uzk*œoÚ!‰~û˘w„ÙˆTó‹?©#\Êf™;úææNœ∏{ã°¸!ÈG\$ê©tÜ+˚∫ΩÎÃ˙9h~neÄ|´‹-93‹¡√ŒX‚^U7»˛‚·!\ß∏/ñà!ˇ»‰Öà˘Ùnzé'£i'=Œ¯…¬9àÇÌ‘éømﬁ‰0Î{>¥ ◊‘|‡ã?PÏ'ÇÓbßˆ¸!ﬂƒ	ÑNßÙí∂y¨⁄≥ˇı?â£ZDÌn◊Ï{ÉËÖ√'¢4¸$‡^‚!úÆ"3‚?~q-hæ?Hß·8ËÙ#ˆ˝|$;∞/*#_^á˜2Da”ªäw@ó/) £øp£MN’á‹‰D©´íÈÊƒÂºÛ —ï@?˛If ¢<êò%.ø∆3VÏƒë»+G™8N≠æ%ÀêBÊ §Ò≥J—‘o≈Xvó†<UÍò∆ÅzÜülµô‘√UîÆyyiﬁ÷µO7˙
∆“îe¡yêÁÿÒÊ"C\§,1é¨∞–\Uœ≥Èt{<ıS#Nx;zêâ~Ÿñöß.π’ﬂVΩT¿t·˙|m;› ÉçV°©≠ˆA„¨6¨"gç<9
ÎÛ˝ÀΩM6ö^xW©…DíÌ`eˇw@∞¬pbÿƒKŸâáëA€?dÈ<áß·òãö¯OäVdE‚uROŒÈhí°b¿:/„âuäî#Ì/äåﬂáe_‚5@5)†Czoâ◊(?Ó«?≈ylrÅf"Õπ¡òjı(e¥‡˘˛n<Óå„)neGˇ§«⁄"7/ Mœ`*4(öü‚Úπƒ§ﬂ‰ Y-82VÔ≤›÷(ã3˜h‰éë∏øæ∏.¢zn.˛§åE∫É?ƒa‘¡¥GíóX–!ïµe˘°Q»1•:v§*–<¿ìÇhw´‰X&Aª‹ø€£Õ‘E8¸°Q…Åò‡lŒïc53¯_TvÉ”i£éçDç#èÏåË—†múÁ•?	¬∫∫⁄\PrëUU9Eì ≥ûÀe0¯P§"EFåÁ¯≈¸˘õ∂∑Eä‰8ÙW|ÚÜı
StDˆπ<G©›\õKbππ.ibØã0ó∑‹2Ü;ìé˙øu}ÂÕu<™öì&Z@;(æŸºáÅ∫∞Â˙[J`≤À0˜÷lê|Jn¡UßÅ»e… Ú‰)¸e≥o≈\ßgSPQõ›d◊d7
ÂÓ<Ö∆!ÑÓç^Ê0!ãÒ¿u'tlüWÅVÉj¢°ãVI%Ø◊†ßÈ!˚Î)f—¬ÅeÊtÅÜAÀçÆ{ô7˜∏1πã≤›$∑†Sè≈My˛í®!”!aÇ© 3ªyê5◊Ô€çŸÊzâ´çñıK9Ê√ û%|ÕN˚!Êπ∆M;,õ–*`Wy]
ãÎ°ªñå€ÚË¥Y∫,çncµe1	 Ü’RÃ∑a˙˝∑hÕSëÏ—∏ZôÈëklüáS^]‚08Öß1Œ ﬁÅü[ﬂøzI˜ˆ¶ég[r·ˇêg‡:$£$,eﬂ∫S†&qJ∂¸à∏ó¶H≥ü¥&˝∑‚ﬁYœ'˝«I0Îæcß”‡í≥d}Ã0ä!√·Èï¸ÈE·f—# dü˛˛«3¯€ˇ˙!Ûâá¸Hˇ·pÿ*¢∂æ≈n)æ2 ‡]˚˝ôœ.˙ßòcﬁ_Rí(ŸW:˜∆Aˇ™ˇ®•JòÛ∏ËØŸˇ99Îc1ó{_YmÂWXÇ9øˇv}m~Ÿ`™≥À>ÍŸÏƒåÅÃ√;a2Å$Ö√˜‰zcx√V¥qÆ¿@µì5u‹4∫µÀ)ô(ÎüƒSü¯bÇ9eAˇ  ‘øÅØDg%L˙‹fk{áÙqòˇ®ﬁ÷ dMÌ‰`Âút‰œ`oûÊ€/∆†œ.ÃKc¢¨làıKg≠ÌèˇUîÇ·	¡dﬁ∫1Ñ4´Ñ“π´*ág nzÉ≠ïy©Àgã,ã#}	&˝’ﬁÎÙ¨≈‚h«û\Û<t∞T8ÁÿÎf{D√·´BÖl∂Vx∆ûiªÉäxciö¨ƒ˙Ö…aÇ>¨ëìíãZ¬=“¥e¡ö:ò›2 œ“ì<yú}µÃeÍa§[+˘·ëO(ê≈Qíô8ËixèP≥õß“S_-Ä´h(´ÃÈ*µ©|îªË“Woyí ‘ﬂ¢‚p∑O1–±›cö˛@V†„,ÜK+âp{	N®»á"ﬁ∫7¢
ÓJvjÃ XÛ$€?›ıÆ¨,TqªíÖ“†|~B«üí’]ô/Ú°1VEG∫và™éX·H9Ê˘GrãO¥ƒ-!¢"å Eàò3GdÈZÅCæXm;q«ù6 v ◊ ≠cô·
!Sëpêsıl⁄Èh}*ê“ô:E›ãz∞π&œr#Ë‹–‚éc“ΩØ)´ÇtàÚù‘∑SÈå˜të+ŸUì)¥Û'-˘‚aTÔ_Õ©[RıíìŒl≠M˙⁄5W’Aòytª¯aº›ŒU¡B›f LPKçÍ|	øø'≠
NW,´ÚÏ‘KŒÄ®∆”?ﬂ'[…˙ß]∑˙YnL
[æÃ.€GÒ≈éæ¢zdõºÑdúºı…î®◊≠∏È*gè‡?
ı(ŒÎmr!À ÷üºdπ‹« ã\•9`oÇ$<)3ÀÇ$œ‡ﬁ´ÕÉ,π=˘±J8W˙&Á7‚l
ésû<„…Û lg)É‡)o$ ﬁ¸â®*HüﬁﬂÚÓºhI/n∞»’tËdqzJ¬4G-ÿ‰Ärˇ<£'Ò%IÛí4‡Õˇ~ö^vx+ö»äOö}äs¨l ÂtÕÌîÁﬂ+º‘—àÀÊS`éA∂0^∏I∏£ÅÑfaJ≠3]Dî2/˚¯o∞ÇíÊ?zzèmRsÔ
ï≥0/4bªƒ@sÜãáKK'º5\û5^öáÜÅÃL	ß◊Ö‘÷ï=@ÙÓ(ëìT˝TÕ†ﬁ√∫•◊Ö≠Á¶k¿â⁄)áÄÕ<¢„nÚ(*øBº¡°∆H6Ç∏‡àga\Ê7QŒÌêwΩ∂‰	x¬k_>)ﬁ∑ÿ–b∆≥µ“{‹ÇˆEÂΩ≤â{I j◊∞F?êu≥ÆS]9Ω&'S®yjZı=Zã¸‰±¯îøjœÎ"FøâèÓ-7èDaˇäô»v∫⁄vÊãt“˘≈5‹hÁÇzTÊı––yW∂¢V”∫¢Y+¥™>¢d~1Œ/éRõ=oÄ‚v¸≈µ“”Ô∂ìvYHH”£Éç˛5˙‚⁄“∞Ú¶ ∆˝Òf≈ªÈfÈ=y¿çÆ•~˝_£v˜∆⁄<¶¶Gï˙áç‡∞≤ÄgË∂?⁄áGo>P`’˜ŸÑ°%ßNj=°g{`∫TWxÑ;h∏hZ(∂S7∑πÉÀóóı wPsì,ÍIe}ëd0ª]íº7êá⁄mìE–ÙDe-IÊ¿Xı'˝∑á√\uÇˇÙÅ§°⁄%ù¢NËÎ·pÂa°gπ&U§Â8!N_¸í5ÄQ|$ßSxf˙~ŸÙK úÙ•èX°üÑgì¨ÔP5]{∏O«±àÊ7øQ|úñrV’œpVºKº˝´˝`)_*”1œû]Ω-}√EyYËÊ`onîã%ΩG∫‚°uäÈ≤Å˙Œ˚åOoÉ˝‘‘Êù¶”jæ÷∞–\q4ı∆?Hõ_¬“ÃØ˙Î˘.¨È€†¨ØæÆº˚≤RÏÃõCk\WW(°1Æ0Lgõ¸^:kÈ>•ïî—hyΩ?èCj|Ç€øôœqÊËQ ¿f:∆T®_?‰!O!Ì4úñ†íVÀÆ)—‘=[È‹”TLÆ´≠mDr\øµÇOkÔ_óá µµ3	ŒÅk?ƒ]äø’G7j?È∏å˙√[Ÿæ—Ft¬’^ÏâåÃ¿?yöÉpã±dŒu’MIG•=æû˙uy‰H?J´	|1≤n∆^‰ﬂﬁ˙Ω2µïÌ≠ïCù¶©6Û∏^˘-;ˆNÿkÔ<‰Û`ø]ë7MºR†êãƒõ„–8Jxàj`Ñ*¯3xH–G?È\ì9)!´&˜$».¿*≈‹4åPtTåâ˜Õ·Ü‡¨a©ÂŸ¶ºD⁄MQ|≠˚ƒ]ìB∫WÅh} ª›>íçø7B õÏhœÁ@ûygÏ¶gk(7H*ç°¶Í„øìïÚ7º0;pP≤I°∆r4'›Âä∆§óeÁ⁄Ÿ‘≥¯“—L* ¨+ÌH#tÒ˙Ô–ìl‚hAqs*⁄ÿœùÆäVê–Õ1Ö@:	Ä∑7'=©≠Ì(◊ä∂é·‡∏Gƒ˛´çÏ…r¢E+«âóN÷\ëN= 8äKºÅÔa˘R¶"éw¶ÜSÁ™âôü˚ÁØÇhArÁY^dr®s∞2m÷ÂeıÚgz‰‚≤Cﬁ53ÈÕ‰åÙÜJ+œ∑rRnÖÁ“¬ë¿}8^Ë
GM“O◊å∑Ú«V≠èïZÎœâÀ‘bü˙◊¯˘ÆTΩfÄ‘JÎéÈh⁄ÏlüàtƒdsÈÎ¿üê«˝6√%b/±ö‚ùpÛ»¡Óõni‹∆Nö´"(ÔÙÃ∫¯∆∫√∏À+œª¡∞^¸úáixRËh∏NÈ∆ú˙‚, û¿<GÄHC]œ|JÏ_Ñﬂ	ØX+ZòºBe‰.œ˝ÅnªÇÒÒ@˜„ã¿?œÅº§4nºa\/ú∞ƒº´&$Ó†“…ÿs‘´à7ÏCú
ã˘Cpı‰öwxc‹*€ØFƒ€¿`≈eA0ÛÕ,Ã¶oñÖyøÇôƒO´÷¥©ë6IÙ¬(D∑‰!9æÏØàõ‰?Øà KærÊ„E˘kz∆Y–∑_ì|P0¶π›≤∞hfúyömj6Œƒ‡ÙQvnéb$»âO.®Ô»f;1OÄ—MÆJ|3¸Ï%Á&uK_ŒëJvDa©ËRÀÑ±y%c'
é≠d©Î‹‚lS>*ﬂX◊∆Ü÷Ül`∂y2ça…´Z2π‚‚›0Bßq‡è®≥∞≈¨ÃbA’\©YΩ´Ÿ≠í†Å f·’Ïá/?_¶—SﬂQg»rJ]π˛Ä8m©0†f„„ˇ;Õ∞æg°§'Î- ¯Ú1Ú E!≠Ü"Ë∞=œ˙œ€]ÆÒ825¸mΩﬂ S\Ü/˙èŸ˛Wé†ê±çÉî/®y~ÚıGFÇº…Z+'d}Hg¶Ÿ√∫@Ãê˛˘$‰âS∆_ï7∏◊Ü~æ¥”e@‚apöÈdÁBãıcMã	ÕhI—7Æ∫’-ykî·˙∫£$å˛T	“à|o”ßä˚Ôÿ†å”ÄW˜‰æ
m†Dö2¬–6ía∏<puêù^¥»%DxBòh™ÚË5Ä,s√õÔ{ÀQﬁt∫*˝tZçX_∆g˚ãLŸ˚ïò Å®ƒèZY’]3üìKTu+¬·§_Rf)ÏZßTB4¡¬ŒAÅz'§klü†±mÖÌaΩ•Ñ∂ √ıCœAÏê"‰¡˛˚ @‘o)‰o˚ÃÄSTÎ˝”ª|ŸŸÃ˛¿<˘mÓ%fΩäﬂ¯£oˇÒ48˝zºnÍÆ"#±∆Ê'…ÛèÄÎÀP“˙ôRµX–ñπÈ\«œŸ3ÄssrÆù3◊@ø¨CÅs~n™ä'W-£sç†LÁ§JcÕ⁄∂£äˇ∆á÷AüÉÖÏW¥˘®íïh‹rŸwÍÌ#‰ëÀ£_´√z∆Ì™|%ø≤WZ€áﬁ©«FIñ|K`∑∏ñ—XLøª[nÕ∫skÊµK÷l∫|rˇ8ÆˆG/æ9&ükäé–kÌñ˘˛|ÄV⁄¢}rB3û^Ç~π•≥§~j6Wa˙—çQôkN æí˛1G˚´
´≠“U¯@—cà!>T—√ ˆ≠ÔÚ]’µù&y‘>Çúægs"ßô∫_qlöÿ°‚ÁÌ+˚vü,[#"0 ∞∂-ápô
@ï¯ÿ≠I©U>%~Öøc;¶:!Œ?Ìc™°gÕ’˜yïœ:'F∞6ìï Ë(2mŸj•bˇ
ˇ·úäÂ‡ﬂ÷òﬂõCó fi≥p‡°∆"UÆ”v5≈(|–uŒ›8ºxGCt&•› ˙…∑xô◊≈ç˝  Y&j— ≥¿:ü«W⁄¨Ûõ÷4)ñÃ•J)´&¨ﬁ\ÁHåkNÜÉ5	]kœ?ªA:ﬁd˝√/,≥UäÍí`£:Ì¡ı⁄÷„U,AÕŸ≠x˚⁄'˚I˝Ê*Wúæ[ó;øsÎµﬁI>˛ôá—ÊÎ≠MÙÛØ∑ìm¡{ì’“z¢üLæúÎó$ó–˜ç<§@±Á∫/]K¬«®	ç∆P≈ ·Bëgÿmgke≤˙)πµ5ªﬁHm∞Ü+¬|y —CnZoì–’¯"#∂ *5:\Â”RH◊∫K´ì.~Ã8âÑ‘ÒS&%é£E/´|¨àªÊtruîD™è
∂äìï`°–MgO©>i∏TÚ~åi˙≠ØMç∞zû”8©_Nõ˜\(íı¢è¢ØºÿÙNemGÀ‰˛Ä◊êó,Â™¶;≥S€ß™≤º–ùÛπ√.µJ:≠G¬ãŒ¶? ˘CÛ≈≤‘èî≠ªbY⁄V≠u1àjNuÎôÁüöÜ‰LEû»â}è0®›8í⁄qï'íº®™Y'ÈÂ:£òYotaµM´ÄˇÛYµùhöV†9¶∂_E~˝MòÚXüj?1ÍµVªo–F
Ç≈8c<
†åj‰6’Í(Z∑ôX~b≤Ûì˚úMXX?âÁ»/$xUœ¥∆|˛<#`;u-ó©∆?DÂñ⁄!SÜh¨ç¬0Eæ'Z•&¨Y._Ïä”ˇ:·ÒÓh–ÿ≠>éuˆ(qÎ
•cT,+±ë/©à@Gó‰/‚ÅC⁄d¨|ÜÜ•P :‘A•JﬂÆ∆º"ê	m©‡':7óY5|k¥Ü\Û)$'p0∆A•¡÷—„¶™ƒ[tgNøÆ÷/Í¿Èbß Úóò‚ØR
µ„qï&L⁄°ÖÂy—∂∂)µwà$NãªHñ"ÒNºRDåz"'FÇ˛ ºXÇ-¥Vé”≈Tó£^ãw™ëléÍÆ∏=Äª‘˜”qOß'»ó†¿ß¸¬gS]y84q´1ò<møáÁã‘]Z\ùåèDÇé'<ı%s‡Sô“É,~[üRP{Pﬁ4}g¥è`Ô˙– íüLÎ∆TQI∂‡§ˆ3g<™*Ég?É[U
˜6WR†⁄5ö˜•¥÷L≈eˆc'_Œ#hÄµı\
gE—|izπë¬°Ω»ﬂπRK¶+®@Àük÷n.õ-BçÇA{ˆVäEK;K·_Û}m†_Æh`”¿Ûw ]/—|dLÆ"eáj<ü*,omﬁ«ºí)ö˚kı_f_ñµ3taïD√§WKtm˝Õµä!?∞Œ≈Öj1ãÕ˛◊ˇÏäPûe¶øƒRWk÷,”Bﬂ™/´Á¬î…oıgöË/Õ	‹jˇÂ≈≤[∂õós%›dy∑WNöSªˇΩ©RcZû˚¥eΩdòMÖH4≠‰öóÔN≥,:(4ê˛†[∂\◊õtçè°®‰Y$QŒ˛ÁÏ
Ω£{ËΩ∞hÈZ÷a^˙ñ·¢øÅ&æƒ'œ\Í2ì.[iwùR…p\r“4y£%åø∆GhﬂvC ùã∞˘´Àú˘~s≤U©Ω≤ºpÜ	X Ö2}@∂¶evÑ}@˛’√±b>¸Ù†<ZPÜÏO _~PnL-ÿ“V6ËÏü§®ï‰ë,±ÚÉA qX’πõ$ß6Ü=›‚” ©“eì«1ê¯‘‹gë]w‚\œC'ëœ04Ú:4Iáx|≤˘†–àd|¢ömLÉi@Õ1√+çy®%	¨vâÊ3ıØ›≈á¶h;„œ õ~ˆ)Ø˘DŸÑ•…§C⁄ìM
].]ø%¥6GÀ¬uÛñ≠”oô‹v…ıxπìqˇ¢ä/∞è˛êvØ∞Í—H• ¿Vd)ˆy|¸S‹j÷gÛÉQeºÂY3ö¸yNôùÎiÆ0.;JH-–∆c]ÙhòkÅíÂR¥ì∫À{Í$+ˆP«:œìxF9]oâY*Œ§<∫¢!ò[≤CÇ¨…„˜‚ê3›eÛ>Œñﬁ‚}≠è6Ì=tmg´0ÈΩŒ‰Xg¨ùÜòÌ§¡|)	ä¿≈
+Eô˛ö¿/úJêñ'o‡“Ne?oé%yR4Í≥—Èà£ÁÒxë∫X—¶áåp«$û˙Ab2n&î¶lîùz'=Lg}"+úà2‹~^…£ãô∞ÙYŒÂ:√êIˇëö¡ƒPÖÀkJj^‘ô†È√)SV=e™õ.9≈•‹åX\7‡~¸í÷˘Fí_{îj∑•˛Tî¢¥ãœÕ“.ÉÂ*¸™ü≈p˛gl$ ¶≈Q”‡öyV∏$dnÈ%¬oÓQ„é÷hÙz•QΩúpÛMÎÆ=Ü/m€Û≈4≠1mW0+Mú0‚π7≥+8≠mÙ¨ŸHgî∫“™¬€¥ö3h‰'Yñ™èpµ(£M∫Q@nÁAZ∫Ê>I2J∑Ù
:7—¨“≈îp8âD‰™Œ¬sOfúF• ÙIÈ’»™x]>WnAºÓoS˘…Èÿ*#`VÀæ˝°ÈâidI™ê™¨hÃÁ…”ÂµØÜy‹Øv¿uúÎÑ◊ÆV˘˚€Üπı,¿¯–úˇYŸÜA—≈˝”SÌ∫!W©Dú∑÷v%¶l?R@
~ûûﬁ—%Ò˛O„5“Õ+·≥ òó≥M]3ë&Úøˇ€ˇœéQà¬„èfCå«ˇãÁ·Ç≈Ï$ú.¬ ‚ùái‹…N1·;]D‰ƒ˘ÒÉ6fv∆n1|®tßHíadΩÍ1Üî¸™7¥pòTD3zÜ©Wi<ˆû—9zb•LNíä˘Y«◊Œ%TÈûı`“∂Ñeœ—Ú^ó=Q|qnÇ◊Ì◊qÜô\à=h≥0bXdÁπsı÷`Œ”¬ A•Fœ¨ÁóùıﬁÎ$—fû˘îó3ﬁª>"≥.å:œA™Õ'	 ›ßŸA>≠NüÜJ·CÕ©”/ÁÒ1?j™a1 `Ÿˇ#†DAëwúë-ßE^˙Ä:@ø1O ¨ueX’àyò‡K&¡)ûQçBFﬁdå“c£G.ºπ†Í{zI(˚«íÒµ˘@ÍàtK®Î;»…ß(tﬂ¡,dòy,S'Yføí‚Ò	hª[§/eB<¯X˝§‹w›x¶∞°‡Ë’p≠x>T^FJÏC≈6T@sÑ„*vÚ’phfV¡Rü˜T+GF|√_õkˆZÆô=‹[p)+ïGq¢%ìÁo¢·ªgxH≤Ú((ìœ¨tëBÈµµ˝‹À‡`∫£X<´∆ÚÍNIÔ…¿Z€®ê<-∫†ä_2«çûﬂÎ4/fœèí†ÏÜg!÷P_√*©ó÷;(«Vyyi÷rIªÜ“Ìﬁå{—™)4v√Ñ™w©4r«qôÈ∞6wÜÖ‡o¢~¯!-ØÃñAjá‹Ül‰/Ê4&‹ﬂE˙˛k™À÷kE+å\ê95Ïπ2é/O0‰x)—^ÊÏPB•*ÈÎ’ÆèV	º‰:ÈÕçÔ´NY¸v˘xFæ/ÍÜXÒ®Z+∞ò-¸ÔüpEt—$Ú/ß";H 3dC–U©¢4ƒ◊‹]auµu °L KÆöë2‹∆–Í)ä∑R¯`N?
±∞úßGF›ô9{Î<nE@∂¶ãT∑·>ºïR›“PeËBUs∑!NÃÅKﬁÆ	üë‹≠Ãæ°pÓæü{Ïã2fQ\xÎW˘‚ø]Ì!_Ô±ç{¯é‹Ú,ßC4&TtDÆƒo™≤héD-YÙ˜˘±F’∫î’Z¢ÍîÜóiÆÉPWÜçu.ÙIãiêtcm¢¬≥uwYŸsÂäUk∂a≥™|“ÎmG›•U◊ç„¡›tO</HüÚäwí∆”πûüfî€6ñæØSˆı’ï5∆3d” ^—e©◊qKäåŒdHdçrBπ∞A•4<Áﬁî,MtïénYÌ{‰(y%j˜f€™Ì=˜é»f Çø´Í√#ÿí˛ÜLÜ¥™r‡<Y}›+Ï9∞Ãm…—êN¢ä»@◊≤h∆≤gﬂÌåŸ˛˜ÏŸãÉ—°€ˆe›z7Ë∫¢'úçÛäËåÎπ®Ç&”œ<Ê≤,πƒÅÕ ïn1lo—™º(“∞‹Í˚ÄrZÜ»'£¨çvÛ,ˆ„‘∫e«róeπ€u0⁄9fá˚ªﬂ√ﬂó/éém|Íù£‘$ú€◊l›”ˆ–Ì∑}è{ÉdW¥VM|i–Xö®Æh	≥/¡ﬁzæìÉáxøíñTŸ(^¶_“R3·∑nS8~PÑõ=ÖÔ√h2â"*HduÆ,7∏]4Ù™9¯¶€—cB`Fx·;WÂ÷væ≥ˇ‘ †£°=îÏ˜çbˇ*B ≠¯m]uÆ‚)ˇäÈÂ“Ê™¿Ç9Ÿ¡Í´˘d±>csœÛ•áhïÔ ÂG{@Uv^o˜oƒ›ÏﬂE;`¥;¡©ﬁîé|A\]$óÑBg´ÿnô˝G‰@¢+=®ıØ7vî–GﬂÇjÙ[e?@ïÀon(_j÷»O%ï∑<°„ï6˜&W;(Ÿ1i∫"ªc)ØÑ⁄hÉ¡nç∏Ç'–˚©øLVUëˆâ+ê6Ò±ƒœÆm8yßº¥ÂŸÛCLÿ∏s;4∞Ni»)(úö?é˜ewt≥L^&πKâ
£.ΩŒ£rÇ{≠ˆS¡´ø]{\ÆﬁUW&@uÀ3ÁÀoÜ”@ÈpmîyÚ¶9ë*U8K÷‹-≥ñåΩ∏SsøMGÉkïπ˚4k•eäé∞dÉÚË»fˇÂ1H;£}∂¯Òøå^ÌΩ>ﬁ_*{PÚ™»ÒRô1WZC6¨…;ﬁnﬁÙúÃ†!ÂûA«˘ÈÀÙ∞ ”3ƒI‰’ôIj4xlì…Büg»“D∑Eãd>ÏÉﬂ ó¯?#≤»á¶„
~˘WÜ*¬≥çe¡=!
£π_$öÿŸ}|8˙;í(}*“Í4QçJJYß*êÄÈ‘UÎó"–;¢nΩW
∑oâRœFfÀ{Ò¡‰p®˝p"£¨”¶⁄®pÍ‹8,M rÓ¥πV•ŸÎ/R≠Å∆sºù…ﬂø'°{Sqo»Øù%ﬁ°˜_*ÆØ-ô∞¶∑$M˚Â‡˘Á/^è^æ¯@ıoˆ^Ôé~ÈH˝E¬3£aÕTÓ∞S,ÄSìÛO˝û÷W^⁄RvöŒøõEaäzû•¬0v=$ ‹3DÔ«πP˝®ë\O√^ÎÊb/~cÏ†*®¯\È‹m∏ã∑ŒO˙eô}ÀÆ†ò¨ï·Ω»~Ωf…~Õ˘‹<—µ°–*@lô–ê-YK’ãÇ	[ !∑d•XÎ∑îÕƒ
^˜õ˝ÜÂES-:ö…öeaú˙=π6Ätﬂdk…√)Õ©ç1Ök$úÙ?Eóñ&}Fˆ Œ?Nd¥Ñsj º3ú!<fôWIGhWG›OÂaßMÇ”'◊Â¬È7¬Ì¯ÆµÄ:çÉyˆ§5∏ú¶ó=¸∑UFl-≈jÀ;^Õ˝Mﬁ∏‹“¢Z∫Œ(o√P2“‹|ñ“ˇÚ2ıëûXVΩ?òzQ8ùòÂÈ¯«‡2›Êü∆¯`«ä;æÍc*c¢ 3√]jôñ2Gb≈ﬂœß±ÁWî§37G-M«√≈Ã⁄t¢e'Õrêp4€ª4∂⁄∆];\†˚{ ˙∑h>fªOˆ˚´ÿÏÜª_D∆÷.µK◊R˛:¢rÚÈ €©JH∑eÁN∂ûU)óhp¿î∫¯Ás/	Ω0Yåcÿ€‰ ı‰ÌC…÷ã˛ú∆∆πz2¥a«ÒŸŸ4‡^_£i©¯-ˇ8-÷UFˆ øR÷~J	‰D@ g«Ë‘Ä(ÚÉL–+/b∂ƒäfn∫ÏÉ›ZyV¡nﬁmCı\ıÂLR ≈ç≤‰x«ù%«Ùfª˙l1˝·ïó¸0Jºr≠d˛qmÍ+æ1¿pƒÏ¿;ãY«∫Õ7›üyıUÒ›.ˇú´OÖIó[xQQÙ≥‹øÏÖ⁄#\m¥,∑ÿ{<◊O0xOSÔó≥Í:êIÂï›™yA{*%/πÊó„È"LXéÈ	Àﬂ◊¬oYÑÀ¥D0ÀËÑ˙ˇù%Ò&ñÿ§Ë¯G)9˙1€=¯Ω'ƒ1|Éj7
i)¯Ø∑√¡pÌùï	{®©π®%E.·]J
ßa9^Í∫Û∂Ã±–ëÑJ⁄¥{å è√oòFâ}+.c	ÙM&Ôõ≤√µhÜ)Ô˝–S€RW'oL’»πîÇÌ˚1.£“hiâÛÜåeêï€|«‡im∫∞SÍàÒß—ﬂ7≤øî¬∞æ]x,¬€w‹U–·$Ë»-êÎeÅ4»ƒ™ø	ÉãcÔ§É/÷0ˇN|©Ω°oa¨∏g+:eQOã;Îº‰€öZ“≈°Mtó/—E>ÇlÆFãbRÿ=˙'⁄Jkâ´QÎÕ/UËË?mS¶ﬁ˛ÓÿqΩ’äUKnŸ+nÇAUK3p≤ü≈◊!Èò˛F.dˆÃK(7Ø«Ä∫7ŸAê˛∏ §á`–M$¬DS‚˛(P º£ÃÀ)9)Sö †ãz*GìÜ(/◊Ÿ!oÉ◊ÀxÊ¸m≤ò«lUôhŸ…ŸË†!V éÀ)˛}\{◊(¢:ÚA¬b´FÏue‡—‚–9É
ÕY¿ST8«ˆ¿ìGà'vx≤™˛sÓuMy#	#táˇE
ÇÖ√œø	*ª»MwÜŒBQhP|ƒ<È≈1ñ°me\¢≠ı˙$V
©∆V∆
≤*´Fä,/ıåØ…X†‚⁄—ªK·Q·6SJaRÇèv˚÷0añ|>%‰¢§A≥≥¢∂cE1‚∏Àïß™¨®* ¡÷óÉ´ˇ}ùó©[ÂbCkê≠Kô’-◊«Â·∆zÉáà˜íèâ}¨aî§q$Í√5¿ÇŒÚüÿœÖì∏b˜Ÿ÷Z«Xª¶π¨∆YEå÷w˙k&÷r´Ì[ª÷—Ë≤WçbTE:yY‹5ç1Rê˙WK· ?–:îái#V√4ÔxM’|¥∂ΩÏ„ü]ˆ⁄{€√c´?]Õ«KÏﬂ¶Ò◊¥É◊„`ºΩ∂¢Œh˙["Ú¸–®\l]mÑøÁÀ‘¢ÌπYC∑IßB›aF(˝µ¢ÓµÕjv¸÷Ë=q*∏åúÚÈQúd8‘Do~ÅªX`ûÌ6™˚=¸ª).TÎÎöv^ya 0ÀL
sÖ≥ Lbjönaï¥zÁw~nãŸ£˙˘ñ4$kVhkî$Òœ~R˜ki≤¶£gæü;ûh.{÷©¥RfÑR>≈“z	G8´ﬂ√uY}EóπNÛ‚PEKÙJ^Ksı–KÔ
pˆ∑IË€‘NJ{QúÃ4ùÿkyA(∞xãÍF(hWi„•¯-∆øÏ‰ÁÓ¯”jGwR1ù;TL¯©T3ë'æç3/≤€öÒ#ÍπKQ¡?3C ö¸
Œ◊WjRà⁄‚ËFvw&àâ>=:)ÁK*è
’VçëKáÓXLóö|Î\SπÉ⁄™ÎlÅhVß∫ONœ÷7•“dèûÛ˙KˆO•Ä ]
;˛ÄèéO BÄáy ˇ ™∑™æÓ∏\±yûAB2º„˝9•*⁄'tø∏√≈’æ°ÙEM/{¬l∏G*©gÔ·Ö$ãU˝Ùåç¯5˚◊ı€ÔëéùÑæE√ÕÂ≠ Ü~\ÑòzXyˇü≈ï⁄˛É≥E`ÙKó*_{—8òÍ=Ó‰◊lØæ+˚tã$ê‹À›ÿ·˚~ÎMôáó –‡WÂ|¸0öóPº≥+/’,DíyÒ{ˆ(”#…xÊw∂˚Òœt≥I;„è8⁄I>˛ŸØmâêÊiê—X≥√ãÎˇ›®l„$û⁄(ûÒ’S¿±{I®çØQñWP8†"¡ÛûÌﬂM‚9‡‡v|ÎòäÖ{©ÄÑÌŒ¯Ùl”Ô†€n,‰÷€ÕXá«c⁄^ìL@tA∂uºm{&#?õM÷°Üπ{_˙∂G«”¿K6EJUÁCXdF
®0›`èEÃ@iAò¢µ|ÿ/ÿW/≤O${!ûÍúÁO≤?≤Ngûˇ§a…Ô5cå2$Â‰08≈ëz„l _˜O˛ Àµı›Ò´óª·˘ﬁ4¿CoÚI9_ÂÜ‡™∑·∆‚∂=œcÇ V»◊ÙR‚ø.B?õ»üÏ	ïûéU=¿Êpói≤bmoúQH¸$qæ‡%/ 8-	£Öã÷– SÄî≈]≤¨w7m≠:XôßÙº8VÉS ÍùGÆµ2Ò“Nå&ŒÓSŒU:€dæ∏.ı£π|p¿aæ&;xn‹k"FÃO◊Ä2Ó∞ßO·˙¶1RsWÕe Xp1:ùt1Î±òÛ‹ã∞>ù¢á∑¯Ï;Í°€Éˇ›£Á¯œ&æ*Éœ`¸º£÷Ò£$˝á›—hèÂ"È/ŒÇÏ2ÎÄm∏“PÊN‘Ã·ø#@õÜÖù˜”o¸⁄ìOWË;¶-∑6lg®EgÖuÊI@¬‘¸bmÁ∆v±≤Œº”\X∞¬‰·Œw∏¿~7N^ø&x9oçoÉ;“-óÓ
@q?,Ñ8qú∏$∑…æ∏V–∆ç√ª?çÛ˛Uh¢0Õ≤ÈV ì 6v+êÖ[:àŸî0¡∂7 O≠¸hQ◊˘#Tv»ãAËjß¶˙&wÀNø"˜	!›ì¡í®§æÀ∂ku·o%˚¨Fa›†‡ÀBã?T4Õd4&`ö≈Q‹í]%®Ôzgú'qÑ:5ky1*/™  g≈A∫-pBèÈ¯∏ïƒÂ’y<tÑàækR>^ó—<-Ù5	†ÉåCòV'3´Äª˜F™*Yö]!F©AÜ¡—Ååpä…ã⁄’Y<9}≥‚$¢ÚyûŸfSîKÑ‡ﬁÔ*(ÿœõ $¯quK≥ıßHã^yŸd0Û.;Ú}¢K=∂∂ª¢ç™òdêM¥·4S≠ë¡¯ı'ƒì√wÖ¬˚åANÇŸª⁄®ƒ€%hkRƒ0'CDQêπœ≤¬ƒ≠î—ë‹ôà«‰‹0ôoÌÆ~k≥ì˛jmÚY7oYäZ4‚–—ƒ–3>ñ—ñ¿Ò¯πCNZé´I híÉÕƒ”7Œ…àÑ´0µ(ˆπVÿ_•¶∑jaä–2Ë•≤òÎàpÎ2Ñ][%Äj8n¿]_˚—d/'®uUf2√≤≥À˛zM¨˙µ*´†U·¥iuñ0ï	†M	%õSîl™Û4T≤œ LD%´∆iÖU£¯ˆ<ÁÖ˘∞ÎX∫ÛœèèUtVˆÙg¬@¯©›Ä˙d%6p˘ÚÇÓ∆ﬁÜ]GáË	˝´ÆıÆµ)la£ÓÙ›É-í∏dƒœ≤/aùP¡?ıËêÆïq Éâl1Ä©`àá7%Á#%ØzUÅ∏‚”8¡(|Pi|\æÕ[¬¬=í∂•èqcz◊‡`6ZtEiuö+≠ÓköFÆ$=Œ¬≠L⁄8›ãÏ«„™Ç'±µú◊]H«¢µµX>*Ë•#$˘⁄f&È∏àª4 ò&XßÏ≈$@JÁ'±ó¯ËØ‡z47óîm≠ÆW
Sâ¸V≤∆:ﬂï&°·2ﬂsΩ&Ã)Ùßyg“æ¢LçŒ§y˛™´DÓ•»ç-¸k≥◊t£ä2<¯ÌzG⁄Qîßü—%◊πÈDy„øÊzÖ,& „qpÉ÷‹nÇÎdﬂÓ ‰˛u'Ä¨≤;pj¡_∑f7}Õﬁ›ÏµwöÄ|≥N$∏œ’ßõº÷≈2 ﬂ¯EËµA6 {Ì˘ÜÄØΩ”ÙµöˇA£WÏ‡oçv5IŒM◊Ã„ä£sòrÔ4”◊∆Âi≥≤Ç1≤¨UäÀlmä XÒíq?Ó‚FT‹a·MY'ÚbÜ°	‰ÑÂ¬$.È‘†è?xÑV"lkL=Ê{ô∑2¡äúXDñÇ⁄Ëû<ÿ£¥àY‚Õ¿OõMLyUŒíf®•ç¥”ñ≤#aeÜG*G®J˝íÖ\øú*BŒ$K
CôûÃ-mâàYŒøØÎIˆf¢ÜïDP°q∞‰¬ k7Âπ˛sß9%’ˇÎ ö,fÄœˇã’ù9Ï-ÍŸ∂`∏€˚i©Ëu9¢NhBuR\Ñ=q õ±‡ #±û(AG‚ÕŒÅ,≈˙-≈¯ô˘ﬂãJÄéΩ∂)j~:0Ÿ˝À º•\˘3≤IÏKØÅΩﬂS˛Ÿ˜£ˇÑŸ™ﬂø=€{yÙ⁄1D°›~áäã.ΩV/Tcå E–á/Æ±ßî‹Ùø∏ÜyU*ÌôØ—….úS¡~ßh∑≤¯5kË?Æ*~÷YIq¢zQ⁄C\ùï÷áj∂ù‹uÍ›!¸s˜DüÎµî=Kø¶\∫ãΩíZ◊®πR•V“‘0üQ‘P+»±1¨∂cRkµ≈$JÛΩK9«jœ∏(kŸ¥∂ÈååEí›◊˜Z©≥ÃÈ≠o4iØc+∆ïSáÃ;YLΩ§-f)Ã$ıNÚŒËÄbZèµ}Â’´ï+¯∞Ôæ€úÕ⁄’µn’œµä„PèµtaU}∫–˘ï‚Ω≠6/«Tß#iCµ…_óŒk+±h@ø2/¨?É ã‡-[®∏ÆqÌ\~@À§.≥«¶:ÜìA-ÈBÔ®Êyö?AwcÃ≥iMÅVR !É©=XÀY.¡7|^Æ2O“zLÂ›Y 3L“àülƒMéRëçì¿Bà\±L$Nß<FÒÇäŒ°¢ƒf∫ÿ»[√*HF˝~üΩ⁄ﬂ›ß
~#¸Y-˘‰Q0"F…^¸ ª	¿÷∆K˙?◊8ù^¿„»B°πOGÆÈ[hÄî≈G£ó{Ôq§Ôwˆ_æˇ›ﬁãoø;>zøª˜|Ù˝À„¸©’
üºk‚»Ù‚Ü—?√˙`s„≥\‚c<:ø£\V8ªkúÍˇ\±ÙÕÂﬂwÔÆ+´òÀ·ﬁ—ã=Éü˚áª{áå[π‹?ÌàfE4€™xEú¯>[uñ9©`é„ËUºHÙO ´yÆ.ÿ>›#Ã-F‘cÓjŸqt/∆z¸ÆmŸ“5`öÜ!ÎÛ¨TâêõE.Äy¨+4‹O®#^&lE¸¿bUúlV‹ZÜâ'âóbæL^Ó·´^Çu5Ω‰lÅ˘p<‹ÚEdM—Z†eé“ìì¨jÖŒƒ<ÃÖñ'.»ldòy›`.îmí?z=bYä¢Ë˘…GËíI±‘(0B¿)Lb¬çrŸÁI<èrŸû>Â˚rY«£˝Ç≠"Í&Aòyn√ç–˝¿v/¶qP û8æß) ÍŸ<ÅÕO@O@Æ_ˇ	7]Ÿˇ,òzn√¥ÄØè√‘√,3Sw™ÇO,Ç{L,ò"«*ÏÿNÏágÒ .jR`¬gŒˆï˜± kü`ÅzÚ]ç©'‘DÑ<w4ÎºÜ∂zÏØ´¬ﬁx “u÷ ≠˘ﬁëüD ﬂûœ›ëõ‘§§,Å¢dh-Wl8)hH∑˚¢ΩÚ"Ô,êúÉç!Á÷v’≥‘ÖrúŒŸR‰í^äÇ∫u⁄,(€∏∞[i‡ÓIü¿>+ô”Â;¶⁄8ÿ3ﬂÃ∂§„$§ ˚@Ëç;èÑïj^ò#Ï‚–v>˛;~µá?ˆ∆É ^&˚Pâ{àfù/*»ÄΩ√QÌ·˚∞Ëôªè´r)Œp πUÀ>˛‡=çÜËwy0Áàèp,Ñò ¶ã1-”g^Ïs/®≥ﬂ¡Ò¯è ≠hÕUı?z.i“ç"^¨◊ää(D|xÄﬂÖ’’ûCgÿè8Ú¶+_Œ‚Ë]ü¨~Mj	•i|í7ÇπÀ°Kjâo'gÂÁ\õŸÆnÀGƒi8ˆ‚"ﬁ˙âÌÍÆGR,≠ç;™á⁄ú.∆	∂‹gÚt¶#¿®ºÈI⁄KºØµ'òí∫…∆hq¡N1¸¡=É´#“*§/|ö:-Ö=Ú?ç4Œ\Ø,ZjDµÇ.™k\µ˜CSk+‹ˇöºµíÀj7%QtÉßo£«÷I|ŸbÙ]òôw—«S¨E˜FÕ◊Dí 7@„≥‹	≠<]"ŸçpSQè(”íËUkWª%ëW[‡.ël;ŸeèÀ⁄◊¬C^q±’Îk◊V©iu)îµ|	Uu-ŸUDF=‰pü¡yæ†›’À÷7“yr–éOPg<eê÷Mµ‚ñæz†*µü¢‘è11cfˆ≥›*_k5ôJ•iÊ+ c·∂ÿó,»B`≥3n¿éÅ∫'ﬂëÖAWˆìè‚®—ñÖBÉ÷‹™ÙZ(Ã˘ƒõL=‡ˆø§j°¢ÓÖ6Å∫}œ5nyy'€nS◊oÀ£Ë≥’wÉÌÙÙ[∫∂Mı(XÁÀ/,w·’õÓÃeM•-«]ÅRN#/iÎ7⁄ÖÜÆÒ6”ÊH÷8CFûwöÊÈ›Œ&S‰‹vÚ—tå—=‡Oá≥ ^d%OP˘U Ÿc√·∞Œ` ?B#Û&HÚøÏ<åêSpÂéS?6±N*≠ƒ’j˜ÊQÑ‚“˙∞\0Wò^ó0©ÚO=®ÀE≠Ö∆F.≤M‡±®À˛92Ôµë˚≈x:Ê kaR}˘.@Áx˛gK£zíao,ó:˘têYêæOõÕ∏–I‹”∑å2‰6l†I7◊áJîÄ$ùúojmˇ£B)¢†”º<ª◊lI-˘ôPjoÓi˘ÃES˝8-£∏gîI/Å%ö≠i|Pœ<“Y,\y—≠~ÜâñyA÷iŒDØò·òíÿ_‘%ôä–X ’øh=D;&∫t˘1ØÀƒ5‹y∑dŒskÇ´7µÿDõ}≈≠˚™ŸSZòö…äÃ¡\ßÅV’q ‚P‚Æ°2Oö=ôß˙)ÂÊ¶´ÔÁË6r§6/≈÷kêqÿËBê8ﬁ™b‚9Ï,∫í@\€Ñ¨Hp4 û•$û˛—B… Òç9Ü◊)òà¬ÅúMY53ìÊw÷Ü:πôOQœüÙWÎ¸xü⁄A¥L‰íOö*']¢{t<˙V⁄OQï˙ÓºôÍgã;Ìsµj| UùhÜ˜& Cˇ`ﬁN›8mYµ·¨srwºÙ,ŒºXœßHÍ«ÖÁ£Û7îë'¨ó$ÅèÂº¸8Ì1@Ëpã¸:Ã ÿknæKBèM*.ãXËÑzü≈iÜvVEØ»Ké ∆:ç√Ì≥Np9ÿd·Â&;¸bu8ÏÅºF≈Ô. 7^±ÛSoJ6›ÈY\DávΩ±«ZœÒhè˝æ≈ÇŸ	 Vòÿö˙Úµã»è÷'Ñ	-f|Ç5Ì∑pÈc“>I≤^B[‹»»hùCA|[T›AFÅj–kƒ’óxzt)…’”]Æú≤,LäcLaãÆp≥›∫NÂ›Z÷<ØÆ+·OY˚ê;ı†≠4è·a<¢'¶Ç4ÁX
$á'ı¥b…XœñÈ*]Åp1´ë¥ôÍ∂Ú∫RKCie◊ Ï|}åhæZµO F\ëßÂ⁄˙–P˜¬GÒ–öµ.í˘·™öWoﬁ°zUv)Ø≠€Jk6Î∂ı÷:ƒ÷zØ$rxhà·’Ùh∏TÿÓêëiõRYPÑZ"!æu%êﬂã∆
	e≥—yCJ+Ct."±ÀÎÙ’‡°ÓÁ´.ìÖûøVxz~∂ò5äﬂœ˚F Äø§oÍsL-‘Y√|TÊß”¥AËŸœﬂfÎ®∫∂π,N`”ë¿M[≈¢@¬˙∞ﬁ°?9Âªf≈œ≥^uLPÉÃ(çò†íÂy nvÍNÙàÛ7áÙ§f"pÅò·?ëdz4ñÀ„æA W∞XÿGß!P}‰¿j˘+.3v»å⁄%%i-<!ˇq6KÛπ-QÎçπAˇS€¿y5H62zÒï‰	ôõ?çé3ëE¸Üü4È•ªﬁkòTcæß(Æ‚EˇÑeò©LÄúêÅ
k’F1zÉÕDÜhÙÎ±S`5Å/>ﬁg¡`0Ë.£ºT5=÷—∂æWR¯T¿àSgdÑî[=˜€j∆+%™`Â±í`FVwY°LxwVXí«ß4àjP¶WZ⁄]
„YqI±†uë6ü˘ˇµZè>ìN]%Hﬂ”å¿¡„^2à˘@nYD·Xb™ñﬁ„í	‹ÒeÇm@ÖuÃxåéÔ_<'rnÌ±ù)lÔaäÂì$Ñ/"!<|„ñ{lÑ#©È"»∆›"’ÈF«Ã”pÑºf%ª‚T$™M`Ê®Çõ£àãSØ√Øîë}Ii…˘î„ÏEJﬁú1≈~”
“$1òYö–ñ≈∂öìMhª_—,®åÌ,>\vSºk∫‹H≥oÒ∞ë%¸∏Õ7éåªÍGÀ»Ñ¡«\Ω∂d⁄`≥’W{Øøˇ›˚Ω£„ØFª#Ë 8û¶/#ƒ7ÊÌÑ3ﬁ§Ù¬<W$ ÉŸÚ∂%}d}G∞à˙‚
S“„L•E÷˘î!>=tÍ≥Mc¿èö‰
í©0çV≠ô1eBflzÀ{n“O—ô'…|‹ﬂ√®CÕ&¢èµ·∞ßıNÈ5È∆„ne"M˛qÂÅV?.@ñ.Ju-4‘I¥x•)éeõ´nâ¬ﬁ¶ﬁTI†Êï’}Âû*i†V’<P¢ñíª≠ZrﬂUñ~'¡õ ¢1``zªQë˘Vº÷àÑ^Îã hxÈ(6Oã+:o‡jFG Ø¡¬ pˇOòËk¯Æe)º‰F∏µk"˚mp8eN^é`¨ã¬±KlaÑﬂïÈ⁄ÌœPR√Ã-+/-”Í; ˝áäsÂ„˙t∏z6\õ“≠ûn§hXRñ«è†‡≈÷{ÈU4fäcDÕ•˛Ô¬3òb||»iòÃ:ÌÚXä>π–W£lÚiª€ÌÊÑ€©°Ωi‚ÓjÄ/Àvy4¶8\JôgælmÛÃÅ;a2ûkzm:*_î»⁄9ÕN?ˇ4PU|‚MâÖÊπf'⁄{›âº\im÷Nm_û√}øı=9§Y-≥%ü7WPcÌ˛4‹ôü’ÔÌ^wŒÊf;B∏UG·YÑu}ø–ïIw©,¬œä€æ–≤ÇiÓà)ù Ô&\qGZ˝@â–T"ÍrŒX“V◊∏¸“vàOÙV{t+,◊pc‹*´üâL(í,NÙÂ„cDérôÂªı“p8€]Ã·-t%Å«~Y®{'û_´Dzô•–ˆÚ·%˘∫6K!\óﬂxªOr’Ñ	£~†qgw€·√@∆}¢ÌÂV”Z–◊i‰Ñò4l˘ñ6¡¥Bjƒ™ƒE«¿oﬂ}≈∏∂ÔÆò¢ Æ^≥g^dú °à\z¡>}„ÍPÊ‰˘ÇRzÖÁ–>˛©hòíÄ†rM∞ú‰T_V>ç•–ÆmMó√º ≠üÌÊEÊ+ó„8Ò“â!≤pÂˆrÀaK›Y˛4≤æ÷fé¢ﬁj£§øn0®ö·¸Ú;©9s^Ωx˝bt¸˝·RysäÇ„wLÕtÜ≈»Ò‘S§ ùÈl≥¯πŒ¶g œv9U~>‰˘ˆ\i7˛F„úÎ√}ø≈Â«ÑŒÓ†_J÷Ë {•á˛I/∫`Ví1Ùï6üäÏ{ò≤&≥Êï\≠1#›ä£˚ÑÛÉwàÆ˜8yÊ˘gÅ›˛˝®‰s„ä‹OÆ8≥)•7#ï|·÷•ªÿ≠ôÓt-ã[‹ZŸÆI…"µ◊œG/èGhˇ¢ôõÖCåæ›Ø1jo≠–∫›-a}≤C[‚K≥>é"©YhÚ®Í∆A’ıπ1Ô-∫÷2Ø«≥°µ5ã^wÄ¨•n’,æ™rLµêÕ£ÉöÜíÛLU˛˛ô«ò|Z&TAµ5ÊbJS}¬=$»!Çu»ÅOªîN*BÇ'ìL‰ß
R†ªhS°dÍEÚ©:ˇÜkScöSh%R≥€ Ö3ù∫Qª]LusØ_]\ıù#´ô≈ÔÙg©∂‘ÔΩC^√@Î¶vÁ"⁄≠¬≠ÔVâ!◊˜t}ü{_—÷ü
h«`ﬂÿ÷∫j%@EÊ^És[÷Ò∑ö<7 -lû’M’˙d]¯sÍyÊò l˘nCã.iHﬁ≤•ﬁ6˙µJ◊Hõz∑uª?[∫m±:AÂã√-‡πæ À≠GG	P∂ñÓ}¢èDT3lFKÃ‰˙ÅÖ˝∫ÌvõØm˘dµ£¢ú›Äk≤À ºÃ∫ùˆ¶Å¯◊»bf7à’Æ´O8töºTçàr »ºU∂~-≥f4ø[ŸªÏÊ¨⁄˘í·@ùnŸíê?¢LV⁄¶ä”®òØñùmﬂΩ§¨L´(\aw“∞|Ö¯‡J6®%ïui4¥kXï>’fÔ]éßÇl›Ä¥‘\ÍlFw3Ã‰öÒ_éyÊı˛·´—K÷¡Ëéèˇù&¶ï∆©ÒØ1∂¨≤ôø©⁄^ê9‹∞ÚÖKSnkJπ•!Â.fkÉ5Vîf6îGN ∆›l(•ò≈
†∂…¶Eµ∞»\)f⁄÷˘â”‘V—ì⁄rìö‰ø.[Õõ¿ˇ3ê¶>©ï¶âuªQŸ™&·∑&ç%Wµ‚ÃR¶Ü…FÉÅp„‘RZêÊ≈Î$ß[≥∏´øw„◊˝∏J,ÈËˇ	çh¯i`H„è59SHeÊπ∆ı€ÍM&Àví≠	ıπÿÙäm˘eÔÇV!Rpôwív¢‡ÛÿqŒ≠x¶ãqÜ®∑å÷g˙C˘pîá∫@&·”‘◊—ÏÆ0∂≠mZìï4±≠J>÷ª’±´]ø%ˇ>Ø¡
?ü’hESº'√≠h„,´®àcåÌVv,Ic˚ ~~uˆ,¸‹Ÿ¶Öü% :™dÔóc’¬OSÀ∆÷-¸‹{‘¡--]4ñ˚ÑÊ_¶≈?˜`ı¬œ}¡Ùœi˜¬OS∞^¬˛Öü{ÏFÿ]Ìiµ‹ ÏU$ùâ?Ø8–∞NÚﬂ”∑∫>wNﬂ˙´…‘*sn†Ô›ﬂ”µ“p§kÕ-„I‡/¶Å‹#eœ¸ÏÌ¿∂g®Ò´]µá'ÂNÎ±õLÅn&§**üaÆ.‰I´ﬂ"-u·6éPyØÎ⁄Ò ëZÎPÉ(¥Ó⁄€Â„,©ÔÒ‚≠ZCΩøç’&p´ë~R}u"(Q€fñ≤£≈œs•hT V$î≥∑Ë≈èø™ÊfÙè/g=’5¶’E¨
∑—ßÑ	:¯Ω«Bˇ“Yl◊π¿óÂ ªzW&T-¬j≈3Û∑ØÒ˝ÊF§us…¯té5ı ¸é¸#pGqî¢©ÛÖy5˜ém&Âóî÷`—«¢<;_…»‰òÈáærÏ∑¨∏±©‹Ë ;rÜ›ªgﬁ´˜™8M†¸yy—Utœ‚À•†‹0≠ó π=§rn*ÑØπ@\ØKX√û›*}b}W*"hÖWE]Ñc45⁄/kÔÄÓ≈a´a≈Öœø|™oî}˜DwLÌyØ©tÕóI˝Øv!s∏}y∫YÓ]võU,¬r¥ïlı43ÁS#ô$ír8"≤,≤MÊâÎjÓ'EÓùwÆ	JA≥K!C"óJ¢âR"˙G*ÕjBæDV§≠gM4<‰—JgK»S∫˘®ÏÊHêIÜºº6g]oêÁódÏ¸∫nP?≥ÉËù§3´∑ÁÜ∆^Õ@ÚlêïA˜#eù∆ß®[såû’*u™ŸÎ xÓ%!A Å⁄ÄâÆﬁÛf‡∫D˛¯2‰≠#‰ôæ’˝˝∑™ÓY[âÎ7˛Øao´l‡NˇÌ∆†¿Å¿ûﬂßs(:ÎÄMıå‘>fÏ˛(@{aöRﬁ·@‰™Æ\`M˝≥,6“Û˝»ñE uÍ∑ﬁ^Èä~«-±:¢ﬂ≤Ï>ﬁäsπ„^.oí¨€˜ÂI«'sﬁø3£;ÁZ∂‚6ŸkUÂñ-“®Ò≥<`„ß)p„Á˛ ‹Â8Ê$®án¸4ãq®m®âmQÑ3400÷√ ~Üö:√˛V·Hq»ØıŸøïGÓàdò»ÁÉ¢¶@ph ˜H'+‹úa(M‡‡≥€‘å¶îxÔu{ﬂà˛⁄`‰æQD≥`£ªÔ)+∫óM≠é.™7Ÿ∏n÷ƒY£äl1E÷nå∑o∫∫ÛÜÒNWâ6∫ˆ§√7r√©å\%Bi”öbyˇFÕ˚èãxî+Jˇƒe„Y?'Òtz^wY7›n∂^DÁ®ÙKÆ^≈hpf¢h N<õ{—’ìk˝˜[§h«çBKÃñ[˘„ÙìOw£à˚ydLı÷áA∫ò≈(†Ô'>ïgcGbhTÕsëz,e∂1+°ÚFp®√ò ©1Œtc}#SıÌ≤p[yê‘h≈ó.Ya≈K≥÷ˆAê|¸Ls”mA‡¡?÷s≈Ç|gïe·D#2¢ã<
aˆS^Ú "∑HÌ≈N#/,]m/©55¶gZIU5ÖßÓ£∞ÑüìmM¨¯œæ©EåZæ≈≠m/˚¯Áœ¥U«Ò≠6Í8˛k›¶Îé»Ë}®-XÖÉUbZÃ€πK±∫™tı∆RµÈ·W2{ÁúÆfk˚ehø2πlyC¢OaJ’%ÎQ7k$)≠JCj∂’ò®öã#ó7Ìäx™[Ï¶}NÈ\…ÙV2cÈÜi¸fîlÜ<&Y„opZtyÀî7l◊Øe›_~¸Øã⁄9¬›ªØøj3©€Qóıox∞BÊ›◊\ßk◊ºæ(g’ÄÆÌõFfY¿©Z◊Uù72W1rR%ùÌ¯téÄE%~óç=ﬂΩE¿´
YŒ¥Ú⁄ßOÿTÄw’tÿZˆÎ›RÖOÅÎ◊ñ≈ıÖj÷ÑzM≥k@~./T∆–5JkÉB{\: \1·Óµ‰iΩÍ9òr∏¡–p\«ÒLt_Qv√ËÅèä;i5ˆkíÃ@˙IëèXÏlﬂ‹*~wcÿÿ´–·∂j˜%t.–›´]´ñY“;≠ö$o˜∞p%ﬂA˜Ú…®õøÜ< GÄ(~+(Ï∫Âõã.?’Ú-«>‰ÍGó™™ÀœÜJÌ>üàI˜flhviNzY<Ãx7«¢V8ŒóÁì‚–•ŸÀCïJ;=îqÊo“˜$æ®L„œï¥wé‰>¿zœO,¸∂›[zk≤f„á°C˙∫V'Ê«%√àbZqÆñ…Z≥ıª$à∆ì $¬mjmÕQN˝-R»„ ~√5ØpÑR6:‹ºmj—¬O÷,À‚<œreÙÄ¢ïµvi“L0›ñ±ø¡·•®ˇ=ÿ}C%R†â1ì(õ≈∆£’<ÊÒπîΩø,h¬
∑˜°v«“ ¯Yq|è‚${ve
l∫Ω#Ì-Cπá©:ºË *ahÒ®èŸÚZæfd‚6:?#µ¨¥# Wu©^+ü‰ˇ  ˇˇÏ}€nIzÊ˝>Eà÷´¶…"Eäj5GPµ-C©ñZAJV%Y9SUYùYERÕ!‡X¿^`cÅuÔ\Ï≈‹¨◊∞◊óÊõÃÏ>¬˛ˇôëëëUEµ‘Óúië¨ åås¸«Ô´$á>éê4–ùjî6Já±ß¥5NEÅˆ‘†`¯ëfûí_„˜ „ëûyVgÉ˘‚!3ïßÿ¬w≥SﬁÓ~â;Å÷çQ•œXú˘¯˙LÄã∏£ˆëÓ2{»ñ#¸π->∞Æ	¡±QSŒÛ(I≥5‚G˘7úºqí•T˛Ûx$ø«å:ÿÄäØk‚,ƒıWYáw™§Ó»^ÿb´È¢{;–è”≥—ü¡6˛"¬øt¬¥mqœ7c«6ÔØÀ . ≤¯¯˛≈)ùª˚?<àè/ÖwÂ>["|∫Ò‰˛RÁ|êüØ‡ø⁄¨ÄÇ VÀ˜OáchÍÎ¢pÎâÍûºΩ$èéòaù‰º(8„xiûyXπgˇ*ïv:öo‚ìåÌ¢Q2ËG÷if¨üj?uÑó˘aßã7⁄1>Êd›“&´%^«‹£cF ûﬂNAJ&x[‡yÚÕxêF=kË9&§UÁÁ?gK0 ø:ûÚx©mü&ÓâÏú@à¨1‘6˜ò1“Òy9uˇ&}K`æÃdÇ;á5˝Qåw‡ÿ‚÷dånÉÅ≤»à6MÊ¬——í(	∑Ãu-∫)m¢;ıéök¨v´ÏÏÕJí27º’ÕcgìQÖR¡{eÛéûnqŒ£=4˜∑5ˇ¬G˛`§≠É†ÄhæàG˝Èêáå£^qΩƒ" áIÓ66sø~)C-}„Õ:4‡Ÿ∞ÄgB^,ù"/Mú
 7ûı®G˘qó'!D†,Ωh+Œà≠/8qâa%÷ìÓ(°}ef®=”ﬂÇOlzÏ0Eñ*Rgêw‰0±`$‘.L˜´ﬂGÉ~∫uÊ∏±$T√Ä}ˆKPµMéìntı˚´ﬂQ–.ïïby\˝xYú¿ÚqÁœƒ2È?6&£’≥p)ÿ#TFª ‡‹Äy2@Oe·õ¿9±Ï˝,>M‚≥V+∏bÍ
€∏SÛ‚Âº»s.ûV~â’…kÛ:uÂ‚î5~⁄É≥¶ﬂÆ¯;Ô'£^´;¿≤ªÉÇ/›Ø<É[&Nj∏7ÓπHV˘%÷°R««Ô∫£ÒØ-«Z•k7∂ƒZÖ◊QygÒ z
Gl¬ˆ˘öe∆èVjf
*˘Kç?”YOñmo≠´&`Î+o©4áíöu“∫Bÿg πpTŸe BØC=@p‹y∏¶gAË™Dî‚Ë5ıö“KÙíi=$ﬁ"—∫â’u]H]ﬁX˜öâ„,⁄‘!πFd∂ÊÍÈäS‚Do!
|‹Oß–Smœ)~!(?#mªD:ÊØÈ¶†È˘ßyìÅ‡izÌn◊ú¸˚pX£ƒ'∂Ö[ó∂eŸ>7∂j≤ΩrH!’„ù_…ÔN‚€§ ïÂôí|·œ–üÏ0Mô÷ù±¥ç_7Ö9Õõît—iËº∞è†ÚÆÀK’œñÊk“<áõ%L\îsëˆ¢Ò’ﬂo≥òK1ü/æ}¡»)?qO˙ß8_ay<é(–múb™w$0€gR1€ë™c(4tºoî‹\Ôı8“ˆ‘Õ›Å^V’SΩ#&yΩ0®¡|≤àEß/#ùç·ÅQä‚;%n≠∞”—±‡£dtıán‚ÖÄn@ı·í êıú˙VÑÈ+Ê∫∫P“
»≥©Èÿ±b–
=;Có˜(ŒÛ’[∞u¯©rÏÌ]ó~y‹“F†st≤‚˚[·)⁄3ÇM"1îÏåz∞Øı#ıÇ°∑¶Ωtb7óW!¡°ÌOöE–Æ•¡€™Âæ≈3?xŒﬁ;àè≥8ÔÔû)r∫≤t•›¸∂ü»ß¥ïŒ"Wò™”ÄLçD#.ùf†È
]∞¬ÄS2’⁄‘ª`Ï´ 2ˇ8ZœißÖ§h∆$:Bç’—tòœÜÏ8∑∂¨–G¿µËÓÅiªnƒŸ[{Úzúæg´_¬^Ú•%»¥¸ ¥øõ·4ÖuhàADûL¨√8 ∫˝ÇîÏó˜C_ÊÉbF÷<	ıÛèÃ¨Ùó5”»1Y+: bV@Ì 5v‘’?b¥ÁCl7x7Ìn2ÌÅÄ2è\;K0≠%øºö]nÛÕòGÆêè–FTµÊÆ≠±'ò ¡Êˇd<o%Ò"≈«	 ÿCËzêªart1›R∂$°ññpy\/:¬m3B
ßÁdí‚Åﬂ–ÏêòHçó¡=∞ˇ„N
 L¬	≥@>É{Õ+7‘À&'U9öƒ£u÷&t/Í≈+l·éx™2DEﬂN•8n¡.{Îq¸ö?ÃÓ£›∫ [A√5“o∂R∞©©;≈/^}«„F‘`Yj€´¢º;ı17«Úb„E™£,ÍØ( ›ù&® 5-6ÊœπJÓÂ ëDÕãæãÈIG¡;0‹ß≥‘7:+ºèäd7ö°'ÜÔ∆‚YG·ª\eö°÷]˘§£‰É∏;ÕgÈéL<Ë™1GÓô•∆ÚIWGüèìl¶	'ƒr+s|ÖºXyP˙=§Å%Ωm∂<Ia 1pÄ ¸˝J¸MÅ¯€÷	√–Âä≠ºbqïEîï• ˝•…5U∂W|Rñ%>´)™XGJaC∂'?SäK’_^±| ‚v è “‰áµµ+ñåVø˝¬öc‘QÆNπÂr)KÂãÔÍFEã5Y3¿rù(\~§∞¯∞¶~≈‚PÍß|¶TO~Z”ërQ(ΩX~§t†¯–Z⁄[ÀÇÇg^≈ŸP]•\z≈O;ê˙ZËÅ{ñûIúuµã’ƒe<}≠´^kô∂òûdTn 
—ÓÑnÁ{_ﬁR}A„gläP‚+mo±ñh¢Û4´‰—Å!u©*|≠¥Zmú•‰∏_6z∫ì‡‘•≠Uº‰∑øµïQ	®/…(¶ÇQ§˜BûfìV+ZaGVøø>ZÁ/„Ô AjE÷z“.h;î≈≠#€=fw:_˜]§ºŒZîÒ:kïÇ_'d·ÚùëkdeqU©^è¨w8&NÕSjπˆ7ˇ%„eû/c≠mñπ˙ÒñÓrBÔØcÿ.LÃ0°UñL{ÏÊ|z$‹Ôo^∏˘KÖŸ∞ï∑ﬂõ™Vƒô
Ó_9zÍË˛≈˛`ö_ñz?⁄L^ƒgÖ,r˘‡Ezö*DÄ¶ô^˛öÖIt1$◊ y-íGΩ,B⁄≈|H-:J'Ë2Â£TêÍ§™°É’()˜3¬Ç^±Ü°¡^Îã¡·ó£T¯’!M˙Á»·ﬂº0•:äX<v—,˘Ã3WwåAu÷Ø´)/mGBÎò∏‰≠E98J'±›ûhÙ e+·R‚àwÒw˛´8>Ó™Èj°HÇvüáÈ©“c∫ºÓsªM™´…RäQ◊ü$Ë’5∆¢"‹⁄åg4sCÏ∆#Î–Ÿm20YH†r@\X\*Æ!Øµºqgˇõ[wƒ  øiP˚ }˘!Ã1Shi˛>æÙMà˘F∞àoSz[+3q«5.Kt=œãvÀú(eN^ï¥+<Y“ï»jﬁúÅ¥é∆4æE⁄S?Ôq⁄NQÂÈ`
kaO`ΩORÿ÷6ÿ*-H:$?–:ê˙Õçÿ&í6-b}8.€ÀÍ√aËl‰âÈßXº˜óMÛ.Ëö]˝+âªÈTFev:˚ƒ—å€4Â	µQË ûgÿ…V§7µö€z‰‚‡÷ﬂ⁄¨[CÙMª}©?6kﬁm”Áé˚àOwÊ‚~-ºÿïv$éJyÿì5J9í‚æ&9©\5®+yáﬂ÷§‡Ô<eÓ¨˛eÉ¢æÛ•ˇÂÍNÛÏÿ–¥£$ñF<UEäËYFÜ8S)ÛhÈÅ"†Ó¥"’-'#›µµ•`‹Ê~Ckjé≈≤—47JÕäRÚ§ÙxÎ|(SãTŒıxƒ›Ω¥3cÍPX÷‡§ÇìhCuª∞ı ËV≥^‹0ƒM/áìÉ8ﬂ∆eÎ˘^>Å%KÒ1¯ÛªÔH#ê&◊m∂Ï9∂÷óÌé∞ØÚ'Ukzò>∏ΩÓ|XZT˘„
w√ñ—Â(@öP˘ÛöÔ{´‚˚vWBNg≠Fa#Âhûﬁ≠äß◊Qà4ãÚ2JxÒ-b«Ui‹úÌqiÙTgÄëÆ`}Ú“ù€≈g‰3î¯ÁöëäÒøúl•_ùC™5^ôäU]l√:^;∂•›õ"˜(çñÿez¯Fe U{∂20™]ZÈÒ“º⁄√kkL‰€iA'G(˝AÂv^≤◊O_ød#pöåê<*€B!f”Q“çT≠˝‰∂Â‘LÒ_®’ SàbèA ƒóØHØ.˛ïígó°yNÑÑof±çÃèO =]T>K;ÙëÃX¢ºJÏ¡ìñrªd Rq{m≤íH9Ñyπè’ºoæ›Û˙GÜﬂp8∆¸Çﬁ2/Õ;Õ4Œ6{`æÄáQYÓ≥S#Ö—ß#WeIÿ¶ô6Ì“e˚…IÄQõÖ,ÒTéÅPe´B$.s8˝Ëá∫/¢a≤SÍEYÒõ¯BpOô[Ôù)ª—é±‰(1$Ω18Ùƒ˘0¶U^®ìó€*b≈îXZ1#)Ókë“–‰cìΩ
ﬁVœ≥ÀP
™©ŒÚnÒl†•ÿäv°˜Zœ:ª∞lıı^Ëê;Ô˝BHŸˇñ¨∞æ«0„ÚÕÀ¸oÉå◊º£%Ïb}7wt=/“B;U¿Ní◊-Êaèa√&ªºR¯€ÖÃÚZÜpOZÆíà´©X¢ÌB˙ZÎ”pı7ÿ√ìï\_ßVœ[ıΩ¥ÆŸûÈÊÁTæ»ˇBA{#]ÂoaÇ\®Çr˘MM¬´?02’í?GP{¥yœ<;ìI%◊os]≈/T∞:S-!¨í÷ÙÕ 1‘£ºÛı ^z{^p
o£@Ee@Ç;rΩæ˙~ÄQm»¢•Gó/í©—k‡Ú√£ªsSùûHÚCﬁ≤IÅo¶]iÚãw˙ÿ˘4–ßãQÀÖ0ŸJ€ åÄ5ßÁ-ŸıWﬂ£L!‡Q”q n”qqI≤X¿ﬁ-∫¥"ãDÉ8 ‰Aj0£ÙTxì@á©⁄öã˛|≥Ãk≤¸÷›¿√.‘RI§ÁyEÿR$ﬁ?üˆ"d™Lm≈Ïv≥<)xÜ‹“M};,kıˆrÈ·{%è¢¶>”1Ë.ÁV∫¢ÙûU+.FÄf∏≥AÓƒYQ3›3\9âòY\ﬁ£Ÿ¥‡3å«ê--5>√∏´xa⁄Òî.L>3.mDæ‚•ÌhñHcìœa nô±˛“jÂoAiÕöÂ5Ö©ÀÛí“6À§âÃ7âƒ-35@⁄◊|ê˜Ã4¬RÁqK@Òn‰”Ú˜Ÿyÿè≤rÉ˚≥~4…w∆„≈¢≥fí=êU	9VÌÕÀ„…Î$>SΩV?Ñppû%!¬AS[Åì`á=†…xÚË√”ûic§¸6≠ÿµv√k8»<†#|∫¸BÛsõôvCz»∆€≤ï‘ø"©†h÷À›¢-µN7¯m≈	«lKAÆ>á¿QÌÀ`= yp!„•ﬂnUåoJÚ†j£ÛÊ˚’X&xj´l≥w∞&Ü≈Å™ó—h¿≥s—3ÉERãP ú@ªxzn)â⁄òów)∫Wˆ ¬	©ª—ètÿyü-jÿ==‰ÿU$'ˇÊÔ'K§Æ,†ÓΩÒµ_‰/oÑ‰/*Ÿ•Z©ëÆ¯”Ã6Å^◊œ„[•-∆)µ…9k±—‰c„ÓtÑßø˘=I3é≤3D4ÔioõIG≤¯[%?t®“eŒ¯Æ,FÑ ≈ZÜØíiÆº–~ª#˚‹∏µ≤y§#JLGwß•…Ó6í˜$≤cÒD]ÂH∏™ÿK],··¯ ’'–ÆÇ)ˆ°Õ¿ñ„3açxöÀ˚`≤E¨^sÅÍ⁄2+;v)I∏S∏S6LëŒXIyî≤Á;OŸ¡ﬁÓﬁãW{ËkGé¿Ú(!pÊÈ∑vL7‡¸ 9CHW#”˙d°üæ•¨òU+,Í∆yUEvÅ‚h+*M¶—†›a;'Ÿtﬂ«ÉîΩ~˙b˜õg/ı‚·†pÿX&+”í›i„ ¥Ec\„îÌ-ﬁ–√349âámû„MØ‡˝-‹ûSLüÅ-(¬=#ä)`qFô´<#G‚å$Wì»ì„8£-çM∆p∏Ç¡≠z·›DdÑ√Ì&—J¡.≤ΩNbäÍRû¿»Ω¸p:ée
fı∆ìb§ ∑S‹UóR;’ÓhÀÑµGi:à£Q€íÆW6Ñ≤ÿÀí≈£T¯µ*ù~î∑∫(Í[äõÙAYjmˆ†ﬁMª∏˝`0¶d√(åÙWè‡µ∑Œí4_aË†œA”áŸ≈#8ûoßœØ#√Q:5ÜXT—∞í|Ø»⁄Ú‡éx8Œ‚ëV( qÙ†Ypö√$OR6HOàF36÷ é”]iFúƒ›±¬√ù«ÉÈ9ME™ÈR ÙQîú[^©Êo‘´’›.ÑZﬁ7nt;yr2¬Ï.Á∏BõjäÌ=,JrOë›≤^“Õ™åµ>e∫22ÂÜûé˚”çj[]Ô‰‹-Z3◊ã≠Ô’jTtWMÖË.±0Xè¶’(LEı®&ÍªÀUSwãµìJ{á-¥ÿ*˘∫JÎÀl…ÊÛ≈ñôYˇ“^ˆŒfS•Y]"9yÊ¨ ¸5)^d´ä1aÈ®î‚L•<[ªÀë@Ìú47&uŸ”Fíπ@ÔvR%‡Îaèe‘ì‡"&O{¿óÁ|Î
øê+πz‚Ã—Ó6…—ˆ3>ﬁEÙÚŸK˜—O#ûó~ÁµˇÙx¸H+ƒrÉ#	]ûáaYÌìkID/¶˛G…C∑ΩÌ˙“–≠m˚—d°óâ(\Dyï«Æz,G1Lœﬁfg+ÍvA®£9ø≤/`©Rå≈
[˜¿»H…hFôÚÙ≠+)?ÆD˘‘,—"wÖΩ§Yﬁ—ã<Ø(¨dò‚S†aîœÃÚÀA
ÉJ…mX)∂ÇÀ/PN¨{9ûÃCÊö‡™z®Ù∫Ër.ÓpÏ<¢0ãœˆ∑ÙWlΩïl,ñB	,ªµj†’–Ã…~YàAA¡P∞X$qVÒ;”<Œví|ß7LF>«ñÄop⁄{OA∑É%v)è°1Ω(˚‡∂Rsà"œÃmD.l«‹j|üƒ#P£Aí∏ %ª|øwÏâ»Q˘äBí—I»”F	waª˙Cˆ^>Öÿˇ7/≤¢UE	Yz]ì?ÏÙPæx¯ê≠_Æ˘o‰dQtgß”yÔy?n5h7JæCfπ«OrVÓ<n¶ÉGS∫√†~ G	™Ôq˘C∂H »?}/vÈÕ ò!êivë4∑XBåññÊê"-é>Lx4! ÷!Œ:°1¶àJ•vêœ±üf…whê†Qpò%≥;^≠úW˜˝:’ﬁfÇW0]8ÿd⁄„…(;AÎIè#⁄v,†Ó≥¿ûx˚X»'4≤Ü0‚?°z◊¯%k@P™∆6»◊á‚†‡ˆ˛£∆C°ûpÈ€*$J·µ!¢_^ 
^ŒqÙ^pº §‡ı9Å§‡2¨¬I¡Àüô·«K°—®â˜˘ñ´ÿ)ÃÌSnÑ†b{ EÖ?¯—†T¯Î‹x*tâxÍ™≥√T`CÁÿ≠Ü´BW∏ Jy“ÔÓ?Y€}±ˇß+xt∆«(òÅ\0˙∑’Cûù,t}÷@,t9∆€L·≠7gÅò/Ô7≈f1∆„3∆g¡ÀπS]Nã•¯≈aµÿ
üØ≈R‹Ïò-Tò;∂◊îe%ã#í∏Qù¥)(
Ï±Q7NÑjrö‰W‡ﬁPì`.sñ!“’´¢ªEôwqã*F¡Qj≥ZÓ°Tµ• ù< –i>ÊI¥ØtŸ2ﬂöW„ßı√HÊ’SÛ›Ù∫∂,≤öÙ5d[ìÕaÄáG(îóÖ¶ÔI)≥T·®Ã˜£®ÃijÜ2e‰iñfrW†y˛ê"∑ZÀ„…Í£ÉÂvÅ“i2úüd‹∫ı89I&˘6€¿Ä:gı|«LuÑ†s|¥,Íkù"7ªvl^ €5Pô^è≤Ê?⁄9æ®∆tÈê¸¬}ÚESY∂Ω´ÏL[¯˘åÅ≈É§´1u XÛ√`!i~,WwÖW‰7\fòK#ãH+G
§ÅCNÈF01›`òˆ∏¡µ˜Ú¸ˇîBä˝ËoÀﬁºmS/%¯äÑò<€ù_ÉÏ◊¬4f¢v]>åá®ÒèÚJ8ÅˆÇq⁄ãyÊÎ„D:◊Ì¸&ﬁb~©ÇÅŒ"æ ®˝+Ã≈;èªƒSP˝∂HA≥=	2E˙´≈ye◊P©ö"ä<‘†≤ñ˚)åõ““á&“òÁ1LÃ_È$è¶ËÇB$õ'JÃ®ƒ5wºBÃÍàS.≤cvΩvÃ|ì∫Õ¡¢6©'j ¯]˝j.N—/* Qi˛”á $â€‡ÖËr	ºv$8ó`&fhZü‡îÅ·ÜIôÙ"ﬂíÏ1rqêÇ÷ MıcP¡ímıh(ÂQ≥(-ÿÍUÃk∂∆‰Ú√_yË®óÆ@—';é<†s:I»u¿ÌË,ã∆< ˇárê∞SÛ∆óZ˜–õáQòÿÇ˛jA+N„Ô(8XZÌ˚IØs{ÑáˆBå!&˜hÂîUö÷ºÀóØ_ÄÇ≈àÔK£hO∑–®	ÚM(4Oè∏?≠üoÛ¿Î∫˛LáÏVy6Êi€ÊQ/„ îú†%üaa¿y_@Ç»ùäìÜó/ùÁíÿ!ΩtoL>‹¶ﬂ≥ÙØ∏6	£~©c¬víi◊ôΩu∑∏°õ¿_Q±UÙòîF¡◊P`™\»–≤À
(éÈ≠≤˜Ïﬂ˛ôùﬁ,>æ|èõ¯r=àç¨Õ<»1Îk,Ãè›ó/^Ïºz˘Ó’Œ´o·«_<€;|#œ3è1Ôë∞Úı≠:—Æ]˙qrœ–≤:2D%ÑÙÍµ(AÖÇ8ƒØeLtﬂŸ£¬¯Q::T»£u–AJÁ‘#@—m0öJöû∑†á¥…í⁄d≠âÜËˆ∫ä•«qJ+=°:ùåé\˙Ïó˛Ö±âg±¥‰nAµ€\◊˙äú’B‰|Ms0Aß[‹,øô£QπñíŸ≠]Ãæ≥Øª∞˜ó)Ã<"∞«ˇ{ªñxïÆ@D=TzÀ∫·fJ¥∫¬&û¸ó2®ÖBH.¥¶¡çA¯Ça¯Ë÷œx‡çDõOq¸Õ*÷L–,}ú…r0ÿ=ÊMµ{ï	K'ÖV!¿Ú{°ëB@k)Uœ |rπ¯xÇ•Òºq‘)g9õ‚—u√ËÂÕ@Lπ›åËhU4πn5ﬁ NNyu»‡3Æ ÔêŒ&ïœ$u'5zØxÍÍ¶8¢3¿ºßå>TŸ∫ AMZ_Ò)Ù2ã0⁄<N2“©Ô¢√ñyÒ7Tˇ( Æ¢	Òs5ûh{Ë˘8°Í0p§≠£’QÑø&≤2å—\
[^‚œ≥’ªÂ5L%Jµ›êa#_zpoÔC¨ÑêÑÚƒããÊKô∆I©©¥¬»–:èí¿êf0hFN0ZßSÃ'≈‚ûπBΩD¸Ü0ôdîòökFúc®2kr≤+H[ ±a'Öï%ÙUc‰«ñÕÅ∫K{a∂Y+ÃõuvÜ≤≥™	¶‰Cıeªiﬂï’@|cºÇ†Z ÀÜ“Éµ’'ˆ/Â«EË2ÙÓYöıZÀÀ’/˜≤,Õ°˘ûK¨>ø2m<Ç{ºÊ_l5Ï
¶ãä§ΩeYkauP0˛´üƒÉû*í8/ö¨Ûz‘gº
ÖÏcÕN¥ºK¯≤›>ùìTÅ+L◊aWÿ˚óÉ´Ôã‘œ/o∞√¯d™m7Kãû4‰a≈
‰ÅõaAÁ}X·%'9¡7A»îÖÔïÌbOqré“è8ÂgÑí˚S%K1◊7–πÓ
€"Êò¯a–≥ ÖiT•ø™›‰QVóh’§®0 XÂ
^CÑ7±èÆâf_0…E–9J{0ƒ(Eø—à Y@å&ÅÉßg(ŒèF/ì·µ‹3Ç2™0¥êG∆ÃäÎIJI»;Ù∂aäΩﬁ¡◊zí¡tÀÿs˙SC@¬@ê≥&Y ›S—˘´¶CÂ…F/Dg
-f¥∑1ú◊»∑ãxø∏KF	JÏhêv≥ƒb!Æ√:N˘Íﬂ>∆Ω1– ^y}K'Jsz÷Útç<NËÁ˘5–PBﬁféÑB√«3`ÿ$ÌEu~0Â‚Œ‹,ÓNöY¿\Ω‚ßﬂ#‹QÚ!©Û Ó´¶ ◊ˇ|Ô≈7Ôæ~∑w¯ÍÈÛù«;¶ÕçuJ¯ÕS
‡±^‹Mzp‰äì¨ã¢g·0k˙n,i? ¢],Ë>µl<CXf≈0P_zÈY'ç‚ÏÎïÏ≠Ö˝ä;˙¥˙Ø¿X¡ 
<£%˛ˆ%Ã¿"ÔÁH¨ƒ6õm%v£¬m¢OriíéóDfñ#ÇÃŒÁ	,°ß¢ó÷»m∏È+}—Ë}g$\Øb_DÆ+‹NäD¨vMéùtÑd™[£◊Ò¿å»WJ-Ey7âGg¬˚õª£{‹ï s”`Ìü"IvÙ]“lØ·∞R∏
Ò}<á-º %Ä[xÓÏßy´—©π≠œ›áe0€6ÊÒù;c¸±JÒ’©œV˘{†2¯5®——rµÕûGì~gù∑ÓÆàﬂìQã œƒÀ6÷·+µñÙ&}¸‚÷ùvª¡+/õÏQŒû@≠Çj¨’Q‡xtı˚´äC≈D3§e&Ò∂*£Æ®—<j‚“-w‚Rs€ÀR®J.?O≥¯uú!i€‡∫@äÀ,z©å¸6ñ9}CñJ.éjÅPô‡fs£”Q‘˝M/Éïôå∏]r@Œq‹ÌÒ)h,Í“	búCZ∏FÒ$G∆î+[™Ø≤¶E≈®	¨•’uˆ›Íõçıı∑K°Gî7YÉFb<Úÿ‹ø∏‡;´}Ïp£[)∂G«=¸Î±©9n"[}¯éÄW•7©oΩÖ%ºµQÇH‹]7#ø+©<Á…OGÒﬂ
œjh™¢…æv¡ó&ﬂùnµx√åÔ«π¥è’ Tƒ◊ÑﬂMNå%˘'xÜX¡◊„QœµΩ
eÈÅÕhDä4{ñû‡¢ÿ;MzWˇÄ–åy√¢Æª$ÅåiF¸ò›ƒ{‰KKUmÂJßÌ#VÂ@ÔØãJXÓC∂Ãˇ&Oˇïµ^§ ª¡6ù_˝.mcd¬B;U‡/s“œI‚3Í€›t¸AÔY—ö(ˇ∫*=“HE˘å:K÷^Ô0æˇ¯…l=¶«’Ö€nÎªºÍ˚ZÇ·~Fù.“Ù>Gö¸‚Í±5≥u|∏ïòèSôO±»Ar≤XpãœcåèÊ¸]§@.åO%sëÎHA/)ÁM™ÖËWá,Ü“Mó°>´Ûe|‰†ƒï˙Eô=.ªû%#Cñ·ﬁîífvÊÒo6~ˇn–ÏY®˜ö≥ã∂6Ú«ŸZéD≠j∂Tô¯Ò."m¬v~a}8,´=”¥2î›˛ÍXI≈kH*ñ:d!]	Jôù§d›ÖÌGCÑÖ ›kÃ£ëˆ)æöù
¶Tbó£·ó÷t ]ò¿QˆIçåIt(?§,.âU¨©∫f^iD+|πÏ!ê|ìV•_¬‘ãª[55ó^ÿCÅ~‹¿ò˙ÀYo}k7ƒVπj•˜Õ¡XC$I/Ω~ +ÙÆI^„HaæS±ÏÑ}¢àòØÅú¡ﬁB”˝∏üOêˆÉg–!¬–Ê:Î%∏…ò∂<b>4˝7]¡ «ø˙/ÏÊEè6à%A†°#®Ö0‘ÇxX§»?V
˙t≥‰-ÕΩæ¸¯à:í≥a¿(F<ZîÉ9Õë&o¿ã‹¢»fmdp¢¸πI˚ım´°Q|Lœ·7wLw‰äáBö›g¯DG|DAÊº¥˛6≠¯ ·ÃÂ√‹=¿GäÃº_∫´÷WpjØÚ`ıÇÿ¬‚:£Ùåê≠ïöïx÷m∂∆Z∑@}`ø`wä6n∑€éZ‘§C”hP“350Èi«•ÁIÊäWQAnõãƒ2îÉôHê*·>§7W°";≥ﬁ,Ì 72)ÀPÚ?ë˝’…APâ[´wg…„jíPÜ˘cÙŒJ
ô†ÒB#Û£h–Ω˙]⁄<©,‡û9ÔÒV%Î±ò>“X’ïŸ⁄ πÏ±ÒIÙÕó5…uçÒÓ›r¬Ò…àà1ò—S7ÛÏ}cKz+˚ß-1ÒçfæÚ°‹»ah◊/©≠Qﬁ…X±◊¬íïQ∏W’î™BPV∆º›òÆ±Wú4pﬁ´I˙^¨Âm∞Øøﬁk≥7ú`í;Åy+6∫âÓ´Keí9‚dN≥œ'jBª¢öbnò<π®6≈RLKlöÖzº-‹èa|F∞qÒÈzZZnÎ∆ÊQ¥Q9ûƒ4J2∂É™m≥o˙zæ¥¿sj^È‹4,U$⁄EÀÛ•·ÔcJÛ
∏êÈK—˚≤ÃO^∫Ø4ˇ!∞ ~-‰¸ÙSïÛï~Aa?m&Èßv1?˝e|
Fvπ4óÙØoﬁ"«Ã[˚#DRBÅ…g;„iﬁo-sçΩ §>+CT,èKcú´Ä`ù$˝I!	UH†Ø
Tê≈+iUÎ@å5ë4¯ì∫Òπ©È¨k§E—∏(ˆ%—Ãpl÷yj¸⁄IÅ∫v&ÕˇˆÔ˛Ôø¸5{ñSk¥≠ºë#Çúa-BY3.⁄˛’·Âäo®9•¶Êî~æjSq‹∑“Ω‚t]m˝Iu˙¡Tß“≈˙Òß‚ùA¸iZ”g Ïh˙GÅ˛‘5¶≤Sj`Üm
S◊Æ0uˇ)L›9&Ÿxæ4¨Ã≠3u“ôÇu¶ÓuÍL∞øüt¶–∆|Ç:S˜÷ô!≥~“ôö‘-@gÍ~æ:ìÜòı„VôÆ©©?iLskL∑ôF1cJ!Üô™4;;ãÛΩùAúMvì¨;(`ŸÓ\V∂Üí∆v{ØøYy"V∂oÖJÊY2«ﬂx»cŒW”ﬂ¨4  Ée√–5(Ïêÿ±Z…√òıØæÁ!HàóÓµ„´Ãπe%√
q˜‹	áé'Ó,–∫∫WﬂØBı OAÅ€ï W6?πl+5+÷1åA4öé_fcXÀ"b´:u´$ÄÍëÌZ∆∑i+¯©|!+G[&ÂP±îïπËû¶õD‘Í¸øˇ˛˚ˇ√pÏ°£_ÛÅ∏˙õÏ¯Íw&&Ü}ã®Ã„Éb˝jüS$∑9ŸÛ¥@/:Dˆµ$≈(}'Teﬂ„wÂ&9∆R#˚∑,án¿/Àªpaœ”Ú ûVühGÉ<Ê!⁄OsÃ©I<qπ˘%&tbÖ(†å›F–µT¯dùú¯+óylwQ)a6Èö˜≤JùG¶ìVlæ≠L/ï=Di¶ª8€'ôÚ)Í∑À’˛Tg˘æR[áÂaè^18)û-«÷µçÚ@s@Y˚Œh-GQ«änÄª≤#Iúc—∫i<®\∂¥Ô∞˚¶å=9> πà´÷wèÛÄ]G£,3Yù]–ÕéY"ö)˘õöK~⁄»0nôã?8! ˆ=à°Ÿ&4[Öç˝8ˇvJÿb∆[Ü◊-ÈÃ?Úb·ëü…[P>o]∞Nì√&‘è™•nkqÔIü˝$*∑öOfU∂”Idóè” ö§G§qON9	∆Y⁄çAØ;ÜÌR~w8â«-˚Xó<d∂õ’ûDÕæ¬ıŒàJ‹`ÑwsŸ*nÖd4ç2a…À√IòôÍE)à–·˘ƒ¢/∏Ωr;3VåÎò≥õRﬂ{Íf‘N@ÓΩ¡9∞V'◊u:tÚ[«´√(∏I≠%}≥úeu$ﬁ*ÉÛ6Q3KÁJ	Å,ﬁË)zÇ éùƒTô≠±ß"zô´Õñ˚à´≠º’⁄ÉÕx´5˝ı÷≠º’®ûó‹·ûm[À≠ø.⁄jáÖ‡zI´K+mî6 ˛ﬁ;P.«ôè`˙ÍoÈF∂K76{,…4{G8√˛.Å≈˝ÔjV¸qÉ⁄\”·OäõºÖªi≤]?Itæ⁄_}≥q'ãáoÎSvR7iI+÷_Ó±áz~◊ÁÛ¸n8=øtŸwÅãˆ¶»	ø£,|_˚™∆—*˙˝<7lÉ–÷;dã@∑Å˘ßΩ∏Y˝oX¿©«„Óñ•¿cx¡Ánh!ŸàAïûp!Jî¸π¨ubåYÇˇ&gFª√^—#ÖxÿYLÔ∏˙!å_Û¸sÚyø£_˝,≤1AŸÇ¸ÑòDàè<Ïü£ª»[N? ˜˘#PÜÒÉögÛh–Kw3¥m 	Ìã)Z´#?◊Â_¥ÎÎ¿7°¬àtüµ¸†ÿ6·˙Ç%Ωmb"]a#òG¯;ZÔﬁç/ûp‰Ò≥íblŸá¨IŒsU∏Dÿˆ—ÑãóÖO}ŸøÕá≤pD¶˚QF£˚¶€§'8MßYä¿ˆ‹åøı	ò–Ô›dÚ·máO®÷£4E€•ø	dµHEgÒ)ˆ¢™dGº—õ∏/ÿSŸøﬁ{Á≥>æßl£„'ï√G‡◊w]I0Á*Íı‡»∑ı1Qhú=O_∫¢:ËÚ€"√F≠|líMΩO’@Ø;›íﬁI--Ûü÷úñ∂ü¶¥˝˙$ß¥¥Îü—[ä˝ëÀ9¯ªëN¬KÑÒK6ìµ©¸ h*ÙéaÜ9Å‚∆,àâ"Ñ~¬¥Qyo&pi§ArBa∫ªmñe…IDtœ…9≤¿∆púdCrÒYH9"Ωã¬AõåN√√xp^??ô&ŸJâ#è¯˙√îƒµ˙“A.åNì˝äyé|ËjDàO˙Ä ÉsT¶â≥µ˜ÕRN
°‹ÄE Ó~M!En&∞ÃWLq+Ë;åu£*G∏ÍHj†SB$Ú<ÿ,o!A~ñrÉ„¸¸ur1ø”«ò1Z6E#ŒØ8á\åæ°Ã£¡0O÷(Yn+]q.‚É9≥®JM\%Ì)ïîäzÌÅ¸§15ÑÚàV~0C1úÀÒ]4){Á∞◊X9·æ*Èc+ÉÎÇ´ì¡qã‹pPn{x¢ÿ•ÑCæBı}õp6o!¡â∂~Î@}&ÉÓ‰^/É¯§µêõ∑Ÿ≈1Ú∆G+≤=«7ò AÄiöuYVƒ‹Jâ‰ö˘πà9Êùà˛≠ıÈˆqıÀÕu%¥fﬁŸÂâMÆÃ>›CätÆWOùı8…«ÈËÍßÒ`ª·sEﬂ2™•Ufª2•≤≈M˝œ+≈ÆÙqgîreŒ'5öÍ#Œ¶2‰´2óê~%‹∏cí^Î4‚µ(&ë.{~í”(¨($Ò>Õ“—ÒÓ∏c,˘vΩ±Œ’™’äw|K”ø“qD“ÅÙè—Wä YÅ(fbç6º°‹L4bUo≥¸Ù÷∫¬lúÙìëˆEµ+ÍVI5lZP≤∏z∆x?KQ¡√"1“Å§x‚èêZH∑Çõ W∑áøu=îøu}IÜ.òª
	ƒFÆ‰Ü-ÂÅ„ú/õ*Ë[l°(⁄≤P-‘°Ï-`ÍM⁄⁄à∂a«∏Ë^WT#[PÕö–ÄÆı¡ΩÁqûG'Ò·∑”(ãgÈÀ∫o¶y%Úö-¢f˘l8 wnπÜx∫Ao8∏3~(‰‹ÍgñúXgFÅ-Fàb~Xó±&¯}|_≤AtìÙÙ_,…∏îëOXN˜Kwé5—(hÖ%m3=hE7`óYs¸Ÿ¿tˆ8“3sË˙"¶‡]∑ª∑Ô∂#iQS_Åt≥æ
ˇπÔwÙ7ªÁú#eõcaù∞ÂÎ¶ô˛2æ÷w„Ò≥4˝Õt|ÂW(–"EQÙõ1îJJn"QíœK‡æ!t—bS:^˝
&k›‹K\¨(πlÆ˛IŒu#âΩÁ"^åmî¨kƒ^yΩÊ{ö[Êá1t^Ãˇp¥ÇæùªTJp¥ >+úwŒ:ñ˛Ωπ+Z\€yv•}î)®πèdÉã„ΩıJÑS∂ù-Á∆Eµ—ß2wøYªÖK‘’  ∞<äíÃ3$“µ:˜Ä»Ç.ÄÍÁ;|èÿá}…O¨®â Ô-Ô’Ú]'#–Q¢R!ˆâÂuõ≠ØHΩ~w˚.ƒv¶>πåBŒ≤Ú¯-˜„Òy2ô·≠•ZÖ˜¶IsHgcV0ÕP¸ÒtÙr:Yv§,Ü"ËÆüÙz–ùeÍéıY∑ÿí{¯lêCvÇ’ñ¢≤	÷î7dq¶TGÃ…”(…kêÊŸRîR¥ı˙8öPŒÂdt¶òπˇ˜–k„<ƒä€Á?»ä¢B◊≤ﬁú]Ñ†µjwˇ	[c|ÓlÅXXƒ.)ÀÚoîJùN¥Í¸Gg5≥ìET0;	ÆöﬁèI/Íπg˘ûÊñ5iöe‰u·%G¯gU—ù1ø¶B•,†≤£=à≈rSV4¨„U¥[Æn∏˚º|t˛Æ/Àjﬁ® Ö¯ìﬁ|ü$#4$'YZ∑ÒÍíg2L8â@·Wi‹lÀ}sD!•K0W‚1™ ‹Ú)$ÉNÁóQµ‚ËıåW”‘€⁄≥k±`?ÇΩtxıøGIZwˆ2ã≠+Íıx	)pêû]ª!xßóà§5N”Ó¸‡ﬁ˛`ökZÛ¥‡™jEcÉ√‰=„f¡BTêm∂Â¡Û‹dõ[ÎùıuêTw#P+‰ßw∑√öÛö.Ωm√–˜÷xÖ%ΩsZÅ5m+¬Ï‡˛*á˘hì> ‚'ÒôäK≥$ÌóSÇµb—èm_8ì∏ƒÓ4Ó(ì*¿_ZIAõéQd‘VD∫dÖ-+ÉÆhRÆ*JM=•≥%©iπjñŸ≤”j;∏ûî∞2‹ÈàÚıs†Ë6	◊
È8mÇP‚?™Íü‘Œ≤sàr»;{®»yÁÕŸÍÊ∆èl÷ÿ1ü≤xßH•€∆·4/|ìç∂1´™Ó‹iªávF)≈dπ`°‚ÂQgß—’ÔØ˛)Æ’Ë±¥(ã#oèeÈÏ∑˝^[Í;˙Ãk¿(iîlñßGYå·œ<äŸùÇ-.óÍüNlDÍeÀN4`·ç\xU√yõ/rDqkñ$Æ∫…◊„µ¬π˝´“‡hª√Íe¨ÿ<k≠◊Ö(≥I·≥ı#æ#ùFYç&˜óN˙i>Y≤ﬂ†·ŒÇg3>“ÂÂÉ]Œzù›[{‰ﬁ§*-»„n:Í¡@∑¬ZGôti_:⁄bg~»ñü«£4g/«|9Â¶ü8ºUÕt5©ó‰—— ÓæF +ùzY6Xx¯(D∏Ës
|Û¥–,õxNëwvj˝ù5mX†˜¸≤GUµq‰≠‘ß™∏ÒU™˜6H™⁄€ŸezyZÉˆóOÙ¿˜
Nã	¬£◊®2T˚SXà¨U•clõ£g(îM›{k4Ñ≈fVÄºÂ¨1$ÿe≠ùﬁ0µëéªÀøÅÄ≈d1›àÒ2ÿ˘=d+'vÔnrút·—aÑÿ~™ê~îE+ÏåW@HÔE	&Ì&£|:DAòò÷}å,·=ÃÈÈeQ⁄^ÅYÄ∞ÅhıáO˜†òÂ£¸îä»;ÅÌ*ÉIä7ãs˚óòTc∂˝t°„¶˙˛Ÿ¥*Ú≥‰[dGÊÔÑ•8ËTaÏ$z›ûücÁ ¥‡•âX'7‰‚>a/PΩc∂3∫˙~ê‰4¶TI∞4Ï)g∆Ö˛ZZd’e#–”≥&òkOh¸Ú‹ä	´
¡så˚(÷„eåœ±‘˝Ëö>)◊[[V¸≈Ù(AV_OﬂUIÚ'–=ˆ£§\ex;5Ò¡}Âç’¢QÖ∆nLZo›P_ùßTı¥∫Åä\Søÿf(Ô√åË©•+øbˆV«Ó9lÈpXÎY:ä†§Xòì∂&ßgªREjØ|Q6•{≥„…Çç~Û√vaù≈≠V‘ÌÆêâƒ≤ub"¥Wñã’ui·
∏kÀdH(Iﬂ ï™}3J&X#zåØÒ…SÍ?˙jπ‚ Ûh¸Fø„≠Äó˚ÌönG):æ¸˝¸˜oß H`XÓ∂˛∑^\Y}ˆÖR€_‡‘;/W¨sUÎzE(fÀC€∞¸Bπa€r√/ˇÉ>-iœ¢4…$œQËX"Ê4L‹Òß∂ü≤a4öÇåbØ't3ì°A9=g—ÒDfZÚ‚IÁ›,!y÷‹≥ÙL∆Çu(7ˇ≥d“o-ãj!õ/éTËc|Gß4|Pi˚r€2†Ä≤,6GoÃ“H5ô©ïçût7”æYV«µ¯§XÍ¢ÀèòË≠~#Ç:6·≠mü„Ùäó‘≥»J®tÒ¢
ﬂ„ì˜æŸö/‘w;û-èIŸ¯b9~°ñ^}|Ä«§8µbZæ¥{ØöW¢í<‰ÁæxÍÁn©∫F_∑aÈc®¸6ngJq÷TÚ†Rµ8©O!
î2á´∏˝ikq˛Ùt\})~°˘µ˜∫ÚÏòŸÙtìÃ.5‚∂D?*œI52◊≈]ÓMrπ˜(Íùƒ’˙|©}îIªZVøÜ’&ÜÑÏ.≈üòæ;TaÎ∏∏Ã!å∑)fΩ„b	†ÙLîñ˜„,ñm–Ôy8wER)T’• =`¸´ˇA(rGÆ≤ïò^<Æ”ÄÇ/L!pπµ*+l8m´‚lµD∫¬BmDO%kÌD_äôÖ!ƒù£A⁄˝Õ“°Ω\˝Å´/∏iπß∑˘FƒôµÄÃ/≠Tw◊ú›™⁄˘Æ´¥|/π58Jfπ˛c≠eØ.Ó]o_˛¨m+{√Ì¯ÆVõ8n…∑:RéOÚRpo¥5Ø;∑Ê-sgˆ€õcpãwô/°_Ω…4¨9¥%Ì∆vÊn∫ˆˇg—ƒT+="^ 1:W√≥∫è÷bˆÛbàZ;»Vwı˝$Èö6Ô	ÍÑb	*ÈïŒyÆâ2˛I>ÔDvKV†tv·’-Öêçü°DX´A÷”ﬂQÉ8r
6"˜'åBptcòe∞pΩzM‘£Õ∫’)Òê˙Ö∞k\vR<º€#Åî°.ôÎR≥Õ7,L·∂V˝)uçOˇVØ:¸•∫»;Ióä"˘Ê´ŒVëâÚ  Ú¯+QOœVﬂl‹ÊPZﬂ\û≥ãb‰rßÌÿ/&súòäæù/e€Î8v‡]⁄vœPÚ˜…∫—aªÖ-é÷ÁBU~â÷êòmv§ÂY®î?π◊s‰ÇR4>J£¨∑€è·5Ó£WÙ‡’Á∆pÅªè€“’Ô´8Ô|b,‚¯%9”˙*ÜÉEüΩ·á/BÂdÚÌ€µh…ˆÉ⁄4Ä-˛®5=\%‘.ô¥….âÛÖç¢—’ÔÁ=pÕñ’°Êé>˚»úˇyò9p
ö0Ñ§µ“Ò»QâZBDR°)
™û“©úŒC.z40mÆ€z6∏⁄ßô¢nØ†ST⁄±‹v°µ√±≈mx∑∏"˜∫mvÔ1¨Œ(;LNFû™º•ÆTÿ≤ÌÅT°w◊U 8mÜHµ%aÜ;ÖêµQ´JÎÇπëWf]˝H∑*lz¨
ÂÖ;øiºnº˝´›@∏*Ç	yÿ'ˇ£⁄¬Cy<ny-\–mlçNÁR"æì-N:êxë|≠å∂a7‘4}Ó8¯è uV>G„·¶É´Ô≥Dñ¡ˇ‹KKbÅE≤¨./‡érÃ72ÓqÕƒe‘+E<aﬁ+kˇ"=ME‡<V%gèXÂ‰µÀ<ı\2¢ÂQáAÅn◊≥#˜wûÓÓº\“„+1M·	è¸xÆúí+Ï‚≥&YÚ]D≤#∆Xqî–njˆcÿ¸|…>Í}‘◊å˜Ö=p∂∫a√±µˇıŒ≥ófb”8ãèìsXª7≠IN≤˙n“N∫—§´°0	¢ ƒà0±ù1[oÑÖ¯a úê0L»ä∏¡ŸX \ ¸n∑¸ π…ﬂ7M“LÓc[ûvx¢¯ö6eD’…c¿1m®nÂàSÛùƒ.N g+øh‹óI∞ôb~ì•3˚î°«ı∫z˝€»•ﬁîRß*ﬁsRaƒŒtß“æ◊~…˜⁄`W
wiÈ∆ÂÖ[åág∞_ci∫?◊Ø≠”7RﬂÿﬁQ4ö„6á‹\›S-ºùÕ¸hpå˘#€mÇA„†[∂†pke@T∫|{ì≠⁄¯Oì—Iï≈˝Õ∆[&i‹u∑ä)w€ ∫‹ZWGLı˚ó- )8ªléı®T“ÊÕv–-9ÉŸ]]cÛ Gä|~Ÿn)d–ñP·ÚÏf—Ù<$à∏è∂√q HB‘S#‚uuïÂÈ0B	]p HììRåˆLQﬁ•¥Ã˝z⁄„úÁ†ÎAü¡√à€%ì "úÚÄªKúéín ›Óh^E0·<‘ñ`^˝ë;QÜÛ™¢è€Õá äÀü%–gÀ»«!nÚ€Ãx`1"ÅÖ=ÃF5=î-‹;gY≥ælçUwéq·∂52Ë‚ÕÚ.Ó\¸œˇ¸ˇπ˙ÁÂ∑d%<≤eª81»|vT]∆6£¥s{r÷ZGÕ”ïﬁÛDòléÚ@)∂^∆]~§D]’€Œ°Ç8îtÅz⁄’jªÌZΩô6Ωˇ%ˆ¯]¸Á+Í˚ˇ˙âı˝≈{≥ÛÀétwªyqƒı#hÓ´≥åòuúhW÷>(ÕR‘ÚÂ{≥Ÿ◊€8ö[¯œ¸gıG6¨´ˇ>GıéÂ˛≥âˇ|Ò#’/˛é™}òÇéÂ pÑúZ°=·;≤|„©@4iµ3;m›êLm›5O˜t>…ÓÒ˜IÁö˚‰~”>Q≥¥U=h]”ÉDê:Ç∑Åf5{‹ØÌãÙYÕ◊âù‘&CÏZ‹4è22º∫mñﬂ ÁXú√d ≠Ü¶JVõâπCÃfúÇmífI∫≠∞©b≤+ˆ0z»†mÎ†#§´≤∂•Éæ∆¶Ü!Ò›§ód•ˆÑºê…hôTl†IQTºóYM—∞$ÂÑ à¶ßW2*-Oÿ41’öû[˘«ø˝ªˇ˚/≠⁄‹VÕì∑¡,…E*ÍÁèÕ$bÁ˛2/‰¸≤tGë€HFìb:åÙâcv±ÃlˆÇ∫∫ïa∏*´àV√òFBæj$â•ßuñË-[OÔréB>˛©≤f•*Só¸˙Í{°≤»8‚é*XDı&∂ÒÍF›$bΩ)OW¶ô8á’ä“ãÛ÷ˇ0™oúy≈·f‚|Aõ%ˇ≥uÇŸΩ≥æ’Á|¢)Ø(<"(3v%oÎëˆáNÛ∫á	~†•ëJ∏Ÿ°ìËUt‘ZÓ””I7µ«ÎX°y-¥†à†îQ)(AŒìSŒrGƒü6ÄŸÅë+Ñlo˚b'∞X]^ˇœm÷]+e¯‹|·èXy¶ZNÂ`Be5/êMπïÚ< 3ì({îg¢OûÅ‹Gkeöó¸£Œ‘¶¸ﬂ?MTÎuµ!…wÛy⁄å€{ˆ„∏I«µƒ
b'∆…qcBÿ¨ªRÊdœ„|ò≤PÕá◊q>{5®–^›®A5BCâ·*_pJ˜ohUú∆ÖÊÕˇ,±ÆPóx7\c≠∏ãB§.õ‰‚âbπ\ñ7≠ √?‘€ï[π>{CÜ`y'/…ÚÙêΩˇ’iÌÿ„´ø?Bmú?<õ˝…M˝n_2˘{[«}√tË¢tãsŸxÖ˘T›[ñ(™(˘JÂê:kÏI‹ÌG\]*ß◊ 'ÂP	B)ï‚ÕWwN˚oŸêßQ(7¶t∞ÌÍlﬂ˝’0‘ÌåÒ‚~(°õ*1ı&áQœá€‰…4ÉAq˛ºJëZÓ8eè¢lõïÊv8¢Ò	U‘#ƒ2√≠|ô%ŒêÏèÎ-™™¡}°∂¿·X	å≈ò·6ŸR #’Õ÷j(u ;◊D¯W1ød}¯™p∂zÙ·á2|√ÄGÙQw˙Ñ¯SoÄZ‹Êz@@¸ΩorXjÍ¡ùEƒ†*ì’õaK"Ë¨Z"[7Ñ4§8<>8tÁà#DHc€Œóûó¿çi.ÎáEm@Bnhx∞uôQR&z{Ï éÑ¿:Zfãsr…T“˛Ë∫¡öD!‚—Ù!tè[ı__r÷d3¯≤òƒÆßû1?ˇ9[JFßIû‚%gñDYu„ÜVÄÎÅ [ÔTÕS¥FNÂèÌVµù÷Ú1?Äbw6ñÂaDµ¶≤U©⁄+";»û\ãÜü∆Uq/Op∞ˆπnC/çRa[∫7%õ`Ç±Ùs+Ø¶¨œ˜2}«rØÎ^ÊhÅyÅDxe–?NÚ.ÊΩ¶‡{"ıtÓtàæîJ(…·‡&ªYΩﬂoo£Ï¥º|Iœq
¯ùÒ∂≤ûÚI§¢æCª∑_E‚m ó9«†ŸÜûã¡Å„xÿ˚∫;–LåÀ]Ö0eDr™:>ﬁÅ!Ñ≤]–@Õñ˙5€¡@ﬁ±‚ “ÇÊ@]¨x+≈Áx1„yBØ1ùÀâJ⁄:¶xû£<áÆP7ÒTvAE5…∏Q9,ÃÉóO@ö•VÜìÊ)ˆ\dîx„∑¯&etßæ=ÈŸ™ 6ÊÄ‡ˆcŸWBæ›ÈÁ¨<¢˚Õ„T„^4{ﬂyŒ»Y%6 GU<{«ø˝Û|;Üg√p-!gmI–¶¥Ôõ!$î≥pá=°luB±ï,[JP¨;ÕÚ¥Ñ4·ô+"=”õFÈNé∑0&A+?îçi™∂:∂*≥7º¡⁄J⁄r∑yá&FMõD∞q∆ÈGÉ¥KG›cy¥é
ÄÍnúÁW8çË}}û%Éò—çøô§„v@"ì»Z
VekÚ?g‹„öa$ZŒÑzç.3¨wéº{ènπè!£âTloU3ôMõRÈÕs∞TF[w*√EŸ—⁄
∞'úa”ºRûcœπêªé‡∏v0Ê=1çÇfAΩÖ2B[ÀÀƒ£`jt¥b≈1-™]ª$uK©π Aã3Í«›<JæÉ;Ë©Lªó””ÓqÙ:ÏgµI·Õ˙é”}≤›∆´7Wè‹\póë˚ÈvØﬁå]∆Y∂»TÏÔ5ó¨Ï∫ÅFJ|\ÿTÈèQä:∂ãã˙Ác¯¨W˙∆≈õ≠vk˛ÉüÎo_w¿ƒÁqÈEâCôıbFÌ›·Ü°Ú≤.lØ«RS^‹±}Ñs˝æI=àŒ^ôÙ°o'uæE≈˝Ça-ÿ‚Eª=±ÂÂ§˝V*´-ËêÍ-	£üA•Y∑Ï≈°Y≥˙É˙«Zÿ1ï›i˘SUé‡ÄC:=ïzy´‚ﬂΩUOÁÁΩd2ı‚¢•Ò≥ö•Ä¨RO‰f} ÅM$â.;Û|åâ!dá%“Ö„Üa2∫±Óz’˜÷˚KÆ<å,b~	ç ÃÛX£+dk’e&x«U(îÄ≥^Ú3‘v§!ﬂX#´,ÉJo<Å—˜åœÆ πúLoæ"ﬂn(ZN=®ÉÄ”8ì¥(ãp&∏U√Z{ó_Õ©FÎD◊¶ø‰v&ß;—€¨Sæ*‰ƒ*Tò±π¬ÁQ/=[=œ√ÙiÊ0B{ƒéPâìiÎ·¬ÊR·hjfs	Ëπ õÀ≥d8ÆÎ.€“ÙŸ>´ü¯¸ÛW˚∞ß∏⁄omH45ÓiÁúJ‰Åâ	Oõ·µ∞ëh&yOÿ!h˙€Ï)·óëè„IîBp]‡ÂE∆÷VMPD•é‡àP;	Ùâ˛B.õ≈À◊6±⁄xL,p∞}E3®òf˘R~(;≠öÊ≥†±üóm∑¬ﬁau £ÉÍ¨~êø»·Ω¯fã√ª‰KM-(◊>Ÿ‘Íå})¨÷{…NM √πífyﬁ¢Å'©LèÅŒÓòºΩÆ$b˚≠Z∫!ÛÊ÷]+
uT°≥È≈2oÆß≈FåÇÕâb4÷·∂om®p€ÅË⁄≈≈üÍ%0c1≈1˜™·aÌ˙≤Jè¢¥J∑Ø*Ù4Å/µ‘π/
åˆá5Nô·ø˝/t¢µ}·›@^1zO„ŸTÆ'5¨K8é!a8@K6:⁄Z{xÆKÙ{æv£¸≤Yt^tVó1∑ıÀª∑πà@èCUÛ [º”úa:¶‘.Ôat; ò-8á"Rùˆ£dnﬂ{Ç∆Ï∞ƒ±©Ó~IØD≥”¨T4Ä	Ÿ#í¢'ivàﬂb,[K%‡ ËoKäxzÃ*_b2∆Ë5√ıR]UÓj∑kßÒ—ÕXê>ÚÉ*C4I˘3>ÉG¥√”GU"Êäñ“A<åí¢w=PHì
~$´˝€a) X 5Üƒq⁄ƒÛÈ`íåaäŸ”Tè¯Ú„Îˆ®nY†Ò¢Î’6´ö}ÎZ,7ñQFX^*∏˚$±°ÿçî¨Pîß;lÔœüæ⁄{ÒjÔêµ˘ì)”πMA˝ΩÛ‚{pjû∆Éû⁄üw”$≥"$”[åΩ
∂3#Ä¯2≈árÆ<KÚÇ¿†ŒD·ä{WŒu ÿòëX¡3∞_ÜÂÜk(ó‡ÚL0$‰æ›:“÷C‹mSOƒ/Aõ:F‚†˝ùøxC˝Ó˘ﬁ´Ø_>~˜rˇ’”ó/;«…®◊J±®¥ÉÙ hÜÔ„I?ueSÀ´ñ°@-7[OX\WIH¿*6~‚›‡$Dæ≈∏o§¸∞ËÛáù˙'Ú=¯ãˇ·f	P•‘p¢Ä¢v˘ÿ*ô•nUÓ3º˙VçÎWNà&:ñp,j‹S €M<guêv›Ü|ÛÜ˝qG·=O_•œ∞Ñ«¢<·¸£⁄˛@V„™8Ç|è¸‚ãoîûFè#¢Ø®uzï>ÕS”5¿;´‰e‰l∑{’ù¢»ê≈üb€¿}ÉZë–:áı›uAâ≤ævª¨Ô%t‘x‚¢‰WÄ£RÙãõÎôL4cP±Fìß∑É(g¨ôUÓ3@+¬≠:ßÂºj@5]!*-›∑XÇç¢ÿπ†É«|2Œ´ø*’	‡WÈç…?å∫¨ÅÀü_DlﬂäŒ¢M´Èô@ziΩﬂÇKúc¥îÉä–¯†f≥÷M◊ﬁÿ~¯‘%or≥ıZkñs>°≤bøéòê…pwì<Ç•û1ÿ∂=F …¡){˙|ÔÒ”ùW;x¿Ô5zukØÕSb„∆CV$dÆâ\“^<Nìºçâ@x?¸jÅÿVÏ35ô+æÿ˛Œ!Â≈F]LqM	3
ö ≈ )ã°tÓè<M¶äpgË∆Ÿ‚˝N±:P–~ë†—{9¨ä±æ4b‰:Ü,S∆¡Ä±Ch≥TV”- √Ì`Ÿ	4„æM“m0? c§sD-_(¥ﬁïõ˚æπo›ÃyàØmRñê:q«}ä¥íö>•LãNÄü7x≠rÒä]—©)≈Ùê!Á~Ÿ…∞Ú{ú˘~:\¡Sê¸ˇ”!˚Ç¡)*|˝V⁄˚‡˜r;√}§Ë√Ò|ﬁZ◊m<óhUØ„åØöD8—cÍ˘$Ó-≥ﬂb,%˙/ÛÜã
›„‘qÍ≠€Â≠ç_uŒ"tÒC·ßÖ&•ßá/…ˆdGpp\ìÏCìì†®≈)≤+,Œ2Xêó“≈èáÈ8¬†¨Œqñ[Àßò}û/∑;”1 Bh«%∆/ﬂ.gRP4îz°ıÌù(h[˝∆e·∂ôú∆Ωw4aÁ--”®úRçãÛH∂Ô?:∑ï˘'>ƒç2≈ìn√G@0#Òg„∑ÛaÌΩã†cÂƒlV»eª€ZNz »ÕßàÇj0ëﬂ¿h>∂Ÿ§ü•g|r6/„Ÿh†kß∆ )∆Ö∑áÖ∑ñ_¬LÅ÷!∂]<‚0?=A≤’„]t*‚/ÈîEîbä≤,!ê∞3D∫ÀÛ4Íxì_-óÿ0à	e“‘êÿ¶∆ëpëÚ;ÌΩ“6!zΩ·–-'_±.Q’.n.íbΩ∂-!€öê”lGôeX˜µÕÚfùäxuÉˆY.†Ó™
†ﬁÂ·ö]Ò*˛úN◊R∏*%hÂsékxè>–¢Ωî¬›Å~6Æ¿û!ë|‹:\≤n4ÈˆiS°ñÕè∫twbæ‘q≈£†,ÕµÖ^±ΩLa√˛Ò˘ >ç≥	 Õ∏/t#!#Ø†ÙéÚ4jóôÊyÇôVRS…JEˆò¶ØçOAa\`'XN¬E∏ùQñE4µ	Ω/∞7!0m2ÍfÈ(1Q6k.á$¨	›M'®°;Ëº÷˚r„≈^‚	irÑReå@Ö1z∫eûG'?VÑnˆH4]æÏ∞ËòƒÚ‰˛‹yﬂh÷]£qG˜mÿ8+´°9Ao	çöhLkY<Ñ]‹`È	∏…7hóŒ@∏∑”	ƒI}’¿"ñ<t=+≥õx‹ÍuZú«¶Êÿƒcc÷Ó'o…Oﬁ[+‡-q;I.∆ù&R4p'8J˙'ÿ- ±øi‹zy.≤ÊYW=°Ö˙¨¯wÚË8FÕH∫EVÿrØ∑ˆ¸9˚˙ÎÌ·∞âÅ˜≥µuû"¡&Ò¿Ú¬¶GÉàƒ&SÄ:dÑ?±o≠ §∑§ïkÕ®]M@Pª…‘
!§6(ÙB.Dë1ìú˚”,ÕW5rVTs	B39ˇU∂C„≤yûƒ”úæ2A†¬≈+â˙∏Ñh›ø:`ª†Øá˙I´¬ô∫ã*Úô¸xcv-\HÉˇUÜÕêª˝f∞ò÷HPc·ìÕû√]˚•ÄÒ°ÖbECövK4˙Ω?◊$‘ª…	ÿ#‰_◊‹]h~ „!ËÕ°ÂP3™B≠¡t°2hPX√‹ë¿à1k}¨‘áÅŸ›–%NÅïºCC €üfTÕası‘ ÷	⁄$3í¬õeÖc·ıÀØä‰Û">”ÍÀky9—KÿŸÄR}b¯ Axàôm2âåöÕ;ò¡b}@ˆÉJ¡t∏cGWpÂIo)◊ê&r0‹öÚP–Ö]
∫√√Ñ8"ÙIÄW+5 $πp(
áÌ€û‹mOê~qCpjR‡∂·ÿ•~^x»À‡*Pm®§>µ‹ÒÿÇ'ª~¿/îÖa…uÊà!≠Éõm¨üRÍttYÎgÌ˙∞{k‘∞˙ˆ?t…ÜWÆ⁄ƒxÂ“2«ΩΩÚ˛˘’˜ÁÒ“<úúÙ”ΩÛm∂πCßÖz›-†ﬁµDÒ≠ê∏+„W6Õõ∫Ø\j _â`†,ãO‰/Æöm+@4[∞Uigõ¨n≠ÍP=»{f´HNçÊK	MÑi„≤}√^mR∏A∞¬ºÀa$¢∫Vl\7Î˜û@%`Å√§Çï}Bc57>Ÿ¨¥%tºB÷{ïí≤ÿ9yO≥Rökûp+™ .å‹ÈIç‡≤VƒŸLsªUvò≠ﬁ"(ø·DáÊy@©çŒÚ˚oLÛò„¢ä<Ê‡^q?h¡TÀ7ñWqÎMÕ¸™2§‘RH.(yà”≈˛·Ü
$¢üÔ\iß–æπM≥∆Pß—‚(üjßŒU≤ƒØyœ˛∫§‡](ÅÙwQb‘ÏG"«&#71F∆¨ı—+ú≈ì,ç†vÑIYn˝bˆÄ≥ä2KÍ¨∞8h]Ó∑ÆõE»˘6IﬂÖIßeh⁄âBq :ïÄP„øu¨”¿$ÜµØq‘äQgΩ¥ÃÄ±ØÖi Mí]–ßIòZ!7œú#‰ÂÆπeY@m»W’ÕœÜÉJ∂-•´_Ny;
4
ôj©qÏ*uâ!%wm}3jmafŸ@¡ÕÊ_∞FÇ˝¬>Xé©ˆm¬ª@’ÎãH
c´ÔMf˘™äıd◊Lú\aÖÕ\;ü
¨ßÕu3u»<xl #°π>X)ÖŸ˛vÄ}*H@¨õ8.≥:]VΩﬂ¿5ÙgJXpè9·Ô´ºI’û~pü{[
iˇÖ‘¶ç ¥€s∆ÑˆÄ¢¸gÿ úÏ˚Öç„FPe√àal’†èô5.œÔø'f%v*Ø ÓWçl…*∂OßÇ1,~–•DùÑxE˝_(Y^ƒ£>í_w˚—iÃˆü˛9C⁄Îúp1:˛!cµ6„ö]KÉ`”≈(C‰Ñó
y®RÈuïiIc9¿∏Ëûøá8Ê0x]mÔ%£~údiêkª èFG/áR¬√SFc-&®	p}•t∫í]ê¨7&/	‹h€íŒï¿<jÂjhÊW´0øåt€3DEPcdL‘NE~Rìn•>J@- 6o?’Ék'’(ÔàH{ö·KKhÏA{é˙Upﬂ™Ò•ıï πé_NÉÒÆRõµ∏¨Ò¨÷b∫ô^¨wÎ^Iø–$›ñ«KÇn’M˘*”≥ŸD7®uh≥U÷™7ÚJ
eWWnåÅ îó3åµê[ok∫"+ja∑öÄÃ5›ÄU∏*ù»“ÉW8Cö≈ÖyÍ‚b‰…ÎÂl\\˛:’%p…âK©áåç6ôú(∂Qò_Û‡4ºJ∆$?åNa\h<8SP⁄,1…PF9G1gÊÖ¶CYp´ÏÁŒ˜ˇ  ˇˇÏ}[oGñÊ_	±Âe—Õ;%_ ä§=ÏïDö§Âô)Yï$”]UYŒÃ"%≥	ÏbÛ∞˚“,0ò≈éw›@ølc^˙q¯O˙ÏOÿ8'"2„ûëu°dO–m±*32ÚƒâÁ˙˚«‘Tj€Q&≥	R¥S∫qìËv¯	xôAoÜß⁄5IÄÉèh
ÜÖy√¯<ÖZt$!™ùÁ£(Î2wfZ◊‘Àˆiñ(ü‡Ek∞3B§ÚÕBΩ
í“6ñZ›â≤"J_wcËúç"˛sáˇÀ8}çD±C‡Y…é…,∫‚çå„∑å5{N¥Z U+Ã˜£Ä`ZyŒä…U´¯&πà/\M‚c“Z#ø¥ëŸ˙µ√Û∫“ü‰'}Í¨ûfÓˆŸ∫ÕN€“IÈ;kqE©&'—[Äê∂–˛Ê£FY⁄„√?LÈì2¢4‹œVı"∆/:ÏÑk§0ˇª1<ëQás\Œ*¶ŒÄFgjïLE~A©ƒ‡ÒÚY%( fc*R¶◊LÍLA !ÿ2S˜
ôÖáÂ0¢E«k®Ro2Ö8\â±‰ÄIe+·„ÿ¬[œ≠É∂&≤‰Ò£ıøh÷"•¶?JhpKN—∫bÑæH†rM @>˘YC/±°1OãfxñŸ∂¥,(˜∂„)úãÈSîáÆhb´—›¸ıèI:`yÛÍ”oƒ&–øVIW˘PÕå˙πV4≠¶w“∆õ˚˙Ïﬁñk2•kMõ?∫m{ÙõÜ»õ+å˙ç◊®‚>\zPÅä"2¥h=ÿªÜ£ê[1™f›§PŒÂ»zè˙4õÿÏïjJøÜJ¥gfw¨I≥ô40⁄¯5P;ü≠Z.YÌM#bû∏lM≥ciÃcz»√Ãºdâüò≈Åßt!»{ê£ﬂ-Æt3ú€¢JKíE+—0Kﬂ&}ÄPö‹˛KZ~úä3•e_Ù´ù≈Y<Ë$ˆ!∞_GïòŒyjP18ø0ΩØ‹Ü≈]=g¿=Ë3\x\V	MÈı.ÇØ–“ìáRöÇ0\z–)Ω¢∏%ÄÙ.∑úU{/¥AgÄÿz@âP ˛È∑J7Ï‹≈_NÂuÀgÒŸ£ÎºswGΩ¯I18äœå–7¥. √âgBÉ‹6ı∏¸^Ã)3…è˘®€PìÚgÒ`ïÏ,3mﬂı{ôû∆°:}»C‹WB5 U(∑LÌ”?^¶ÊÿP Ë¸ôÔ¸®ÑÊÉ. ⁄ÊwòÊ≠k™¢P∫˜€‰äÓ˘Ùä™ëÉ8˚õ£›K8z˛©ÕÒ`ëÙ‚≥¢ÕæÉ.“{∫≈ˇˇM3œLºÑbê Óõk∞NùtU™#ÿor%Ü◊V)ûüA~&§öŸÄì·Î>πdK]∫≥WŸDfo‚5[oblÂ°Ö§∆iO,˚J
§h2·êˆs∆!1Ì‘ûä€kç"íå¸ãé'uÉ€Á¯$ÏóüGˆBo§Í⁄)0¬™Ói¯äj‘>L©Çÿs0Í¶ª¡è~ÄÇˆM®}Ù¸¸aÈÂ˙ÍÍ´9K±HùÙÂã¬C=¢QüŒb≥x^˛b-ZﬂÿÿxU◊x˜mOÙë]ßˇƒˆä—Ärj/%ruÒø?§iü˛*÷ª£,¬≠≥Ê-÷Ããw= =ï(’dô}/‰ß˛´"JıπTuJ7üÍÂki[`yÂ¶÷‚÷Y·SBsm ΩUüûµ˚·ßFÒ˝CS*‡?Ålz¥⁄‘ÆÌ|y™zOë¿È¶eõ∑Æp"$Œ<Ÿr†f#+2<a7ÓQëû}ô•}=j}Abz?C›5∫Ÿ0Æõ≈jÀ4ÂÇk©@S_Êùã∏ÛÎù$ÎÙbë<ã≤éH3`bzOgπΩS´ÁCª‘¡4MÜâºçŸ‡ZΩMKÆQô•1C·ÈkW§$™6!¯TcvêbÍ1√u¶_ﬁøñûΩ‹·ŸF¿±à"⁄aâ&Û7M⁄UH
3ÓXND⁄Az5˙ª po
›^)nØœ“åÜ+‡|j2§∑L∏§–QÅæ∆xïñê£º¶ôÄyΩyf IîË√ÿKÄµÚ©^bQQ_€éˇ≥dwêjAàê◊’$Ø€\M'åzÜ(∂·074;W ≈’5óú)E©RüIZÉã=Ìßïl6/ù»åønˇÿMÔ’ÌÃö"∞)oz◊yUø5Œ¡Êôz›ôg¡&B∞NI∑Ò9Ò6W∂6f7Ìå‡—T;Óæ≥]“»qu≠o)ß√‘ëπPü”Ï¬˚©…œ,˝Æºü™^ätqü‘‘ﬂ÷›6+ûÂÅUNæ¥©xtÔ[¡ûvwxë¨≠2÷„6—M;Ü·ˇJ˛ë“[b…!ŒpQŒn…∫∂Çµ>œΩé|Qp2ßyú]Fù4∂'{ÿ÷„@ª1h=î⁄~ÛÌÔ‡Lo•C,£´®˛Ö^†y”+ì€ﬂ•˘ÇïXÔgâ•∑ëa`√3F<≥∆⁄õÀnTPÜ˘=ÑiÌ‰	59Z€Oø›˛ªcÚbˇxˇ…”=≤Dûê„ù£ÉßOÙrLk¯éüJ≈“ö ]°“–ä∆QWå7ºå≤$èÊÚò™[]Jì
fÑ÷óuMiU®:-+È(Uß•j
öˆ·É:¸tÚPñ‚ˇR´HÃW	à.0[	8¨∆⁄≤(çvªéŸ‡LrP¬‡iÃmÒBbµëEßÅòt€™WZA˚]ó£w@Ë∫◊u∆{]7¬èˆ;ÌÒÅÊ•áBˆÒåÔıœ“ŸÌÔ¨ ê¥ß!´Ä8≤ÃWﬂK/◊_)ªIŒ.—¡hön%≈-JCÇLÙ‘ß÷YÀgx≥E'öê˝|U‹ıü∏ òp≤u≠∫4ì7G{_Ìümë√ÌØ∞k‰ %VòÄ{¨Å&æ‘ ~$‡õß€œoˇûGG:⁄ﬁ›ÊÉµ§∆J÷gÈ˜Ö:`Ò7Œ_⁄É„ì±ü|2ñ(æl ÇrÃ®dB=ƒ’å!T6)#Ú E('ZúâMr˛ÎoˆO(˚Ïﬁ˛√ì}‡≈ìÉìÌß¿úºÛÀ˝Á€O˜ˇΩ‰≈ﬁs‡/vﬁ∂KØiŒ™B°Í- üõ+(◊Ñ⁄ÀÒ®”âÛú‡ïr≤…˛√$9úçXv«Æ/œÀõÚXj[N\Ê›‘n4ZÙ¿®ÖÖ-lí']√ﬂq2,`ê∏á∆añvG®~i'2Ò»}±Ì®á;“¥ÿ∆òÍIt⁄öñ◊+ÓàíÊ7‚Ã5›yÖ`¿.o ö´âöﬁ¨í2À6¨ãíÚ∫BmSyBˇÛˇ˛˜oˇrÃ0ÈÀN∂]¯ÂøˇCrDFùÎùÛ›QÆΩ´ƒwÉ≈…‘D19ïÜ˛Ë√È√{@ÜÙItÎ√?-ÿ„ÒµUßnkö˘k†°“ˇ£è°¨sÈ∂Æ◊ Å$k†b7¨ç‹s!WEµ—=95L®pi≤nâF€ÏÀM´…πy±a∏*@sÒ
/bÌ¯í–ì/ÈT"∂ÄL˙VR÷§g⁄¯∂–NM*ú.6,3KS´ó¸yèN∑F{Î‡òdÒy¬ê[®Vú„Ó ˘ˆ •≠E"ÊsåHåùîœ·KPﬂL◊2Vœ¥u∂’ Éï!Ô+2Âg,Àqàñ◊¥Îîu?˚2ò≈úNç∂ß÷ÚùÕãıä<%–%áºÑ˜îY„|‘O	]-XP ë,œ|uœ„ ÍÂÇ9ÂE·È˝têJ:Û‹÷/¨Lñt)£—]∑ñ>ıÓòÓùnˆ>,`_˚	_˙+≠Ïoü,Îˇ¨⁄Éπ˝§Óé\˙ös•mÕŸw{VôvìZ˛~Dó )ﬁ›º%Ï∞P˙ræŸhΩÖPÓË@Âå2¸Ç*ßú„9zF-î’1mî
t:ù4t–ÆìW@Cur´§™ÌÙ˛r74:\™™˝ Îùeë$0ÿ©Ê#ÑPÆ8bR45Z6r»&·„«ƒvâ“r.Z‚“©“Ø\5"„" ˚2ÍQm∞F≥±(X…FKX«JWV≈ã=Èdgz§üÑˆv’CœKâN˘V≠ryõHÑ∏pf“Ê–M©ôÂT∑≤.Ú ÛúFJÏFÌ ŸÏÿ:rsæ:˙â4ÀïwÙ“ªœ%«Mµ-\m§kh?˝ÉWwÏÅÁàH÷®Ku…Ω"“Ö}]$≤¶ñô«±L*-CtâÀ¨w8&Ë∞Å◊G¨Û¥Ÿ0"^ÃèÛ¶vÀ[¯à.œ"ô(<©˜~RWÕlÄˆﬁQ1≥;3‡˙¯d˚´Ω◊Gª{G®BñÜøÒïRúõtÀÇ\¯ß≥ó?ÁÈˆìΩß«/ìÓ´õ˙2Swïπ∑,4p[’¥k¢ ∫Ì]GÚàu'õûäOïÜ»vR/™¿
&~>TﬁÜÕoË¶Àµû{éÃªOqYÔuÚÊÏø™Qµ{w	YH‡Üu\VèrÂ8llj”/Ê]è≤¬ˆ≠¬Qıˆª÷›Óaﬂo√?7‹,áøﬁõ5ÆÅ.bèÆè/¢,^ø1~’›˝‡“ªXZ˚ÑyƒË…œ∞Ï1«	 0UT˚¶·\}kâ›¶ˇMJ¯øl®=$°mä˛ZQ\L55œ_:(‰Ív»^˛ê.RˇE}{˘ˆph9ãp<‹ñØŸÛáNÛ∏¯6ï
V€vi≤Æ4∫r$åÌ∫a—}/^Æ˜[≤^è”öõu'Ì£¨Hzñ^+æé¿¸éÿΩÙJÊ⁄>U=F}K´d∫|DºåUπ¨¬,”ﬁºáÓ?Ö›´Ÿ¬©ÏﬁÊõó7∂GÂÏëEWwﬁ¬å GÏVfb:ØÎ≤ºT35ŸóÜqŸbﬂÀFEáru/¶[º—ÏÒmbEuXWΩh–â5ËYv„Œ…}ÔXÎ€fÕã>Sÿ§Ûr~My`k¯V=zpuÒ´A}Úp’∫ÎYﬁ?”!˘s*GÚªs-˙ {TÅû&yQíøÚp&¿DV0ïÕ"sÂ™]^À57å∫`„µﬂí’/Ê∂Ó_'≤g˛‰öK—≠çnÙíÛAa§ø ˙¯,m†ï,”3#¢êT^KˆU[|µÄﬂŸ‹òVp«ÙË6*ºYX˛éLºõ?ãE^.swØ2JÚñùŒ˜vvN˛Ópè\}ªπÈ˘%é‹ÑÖ–ÈúYz	Û‰˜Ø9t=éwvücP\*ßY9 ‰öI…≥®üÙﬁµ	x-–FˇÇ}äuõ¨≠ﬂ~A®‘;OÙØávºnì_¨ÆÆzÍñ·ù©§∫&ø¶“ÛG\·Nl∞ø(#+ºÍpçÚR7 /‚.g≤ÚÇœ™ô©ﬂ9ßT l,ù/N\[]˝®|,}©^4ÃÈ+ãïÉÈ∞nd&Tsr]öPpèÒ
ÚÄ`œT/Úå,Ω¢Ë&9›t¡‡∏¸¢≤ï†∆ Í1—œ¬}kÅ¯Å∂˚µmu‹˜ú•i·\g˘ç◊ÒçeÊ¬/º¶’gú,øπ‚‹õ∞\õ®4~Õ1fvó‰·µ\>Vo∏‰qÀÒPŸº{å“‘£Ë,"€YëìØ≤hxëtr0Í|P.hÀÓ<;<:x±˝¸dèÏÓë√Ω›˝›≤Bén>ÍàzÚﬁóΩòÏÜé»äw9-}’ûﬂº”Œã,úoqxe ≤/‡òIÌ™øÄb¶Jﬂì®◊π˝ótﬁê°ßôªÇ˚æaÖs;	2ÔƒÑN∏%ÆÃ»nÓ∞ßaÁ]∑3P¨äVù_>Ô0ã/ìíÿπßZ}∞æV>Ê⁄Iy%™{Ÿ
œπ«.»ƒ¶Q•?»Å<Ì%BH¢ æ◊∆“ÁnÌS›âûëu:ïöπ≠„—i¡"âﬁa G˘£óõ
†˚◊•ˆ'ªO(≠¯h.ã,v$’à,~-=ZÊ∂XSÚD‹C∂@açxÎ˛µuCô’$À$DÍ—ﬁŒﬁì˝›Ì⁄˘Äâ0ÖÈ‹øñK{~£œO∞”Å~—YuóÕ˘ÀÌß'€òâ{T;]˛î3∆=Í†÷Ò˛…7€∑˚_|ÊYñ ®cmziÏÏwÛÿ¡)›L6˜"®¶<ã≥€? êÿ=î<^	ºùÁ‘æ•fT‘&Ø}ü1ﬁ!Ôd…–…(…A/ç∫‘;Xﬁ‰™èäı'˛Ó@
(¸Ì*¡•îw?us≈πÈ©˙b7,ﬁÿLO”™kÓú⁄ÔÉÀ#ôÖcJJ∂fé)~HS%Ê‰"¶gò=Åcv™]*A`µ
.*Ñ4˝S¯uÁTN√∏.™N4∏åÚ≤»üjæÙ.ûçºÉøµ¨n|Ò∂≈≥e-æÈ0e˙9ñ¸4Q∞Ì£…≈>mKõó°≥
®óûßªQˆÎo≤ûo¢;t¡£NaπƒZE‘Â¸»∂ùŒ[å∞ã‰tîÙ∫_&Ω·ÛíÔÄû5~q˚íR?úœ[*ÿC§Et˜g +J¥Õ≠'QÚV õ>ˇÍéEP¸ÑNËß ".Ä„¥	˛√_≈ƒœCL0⁄¬¢{vG¬¢{6û∞8‹˝ríÇ3∑)+vøúä¨∏Î}>„JµIcXÅ’M Âb´Ñ]_[%]ã¥/_9~5@ÏA_zÂnıjYcVa8JYLØ;T
1≠±" ª©jÆ…2^˝ézN75¡¢é©n¨π≠ß	Ñ®… ;X+íÿSam%zfB…ı=óWÕLR≤•ÀHY¢"∑R÷Ç™kx-ê Iéz"•«ÖNø√∫#7w'RJDLTÛ†=§eP}Y'âíùSÂ⁄»¶©•0ë "TrFöÚn|w”¨™Rd≈ó…–@àa5å’≥E„Ω{˙m[iUåJ∫òÌ>Èﬁhﬁ:U˙O•Aç:dLIƒ∞ Ω~∑¸J¢î´8‰¿⁄l_`≠∏[˜T‹πZ˚4Æ2˘ß¶SÄVRÚê5¨n[ÓØ}¿ºÔj=p›“◊{<Gπ}√€ã˜Óúf¨ØC	74&Ì‘ÅY∫æAºp∑ÁE+%HîÜ¸ÍˆG¨lòî^ ‡X0bêMŒ#¡⁄Ü˜EBGÜ+î∂|÷‡Ve°âTX ƒ·∂‰€Ái÷êÿñ≤VÒ ©EŒL¿"Lg,9».˘mäXG∆ø,AN¡5êvX∆?∆¿∞[fﬂs†ÕîùOˆÄöD◊uW¬ÛıKS°ªFËö˘aÚ,˙0˙◊·˛ﬂíØèÊ…ç≈∞„7tì¡Eúd©t◊Æ¯ wü÷œ∞∫{áu!;º”l»(º˝ä9»ÓÌÔYc#d
Sî˙éú{p,fﬂ˜ó{C¯⁄>
&b7◊W∞£G&QéÕﬂ≠¡øü"h Ä$J∏€\ï∞H[ü^V.–Cπ4eÃùÉiª¬rΩ^Îd1•]Tc:QıÇ1Ô?11Ô≠É⁄÷√^ÙﬁÁmY,|Â¬qt≥öﬂ¯dñrîP›ï∞Ùv€1!ú•#Ò¸"Õ¢ºCüﬁ⁄Å``j≠0'ﬁà10∆$∆`¬≠∆˛Áy‡¯
OX¸“8dt“õÁ\0ŒmrÙdz|⁄ey†!jÄ˙wiÉ·_%∫°Äë`ÿ@ÛJ∫√kYÌU◊πå*éÿ>√ÈÅ≈pb˝jqw=ö{N-†*∑ÊdMò#ú®äÂp£î≠µQ»JØ&Ói!ñ±< "ëáikµk™›]ˆ4Œ:ßç&GÍÀJE‚Äpµ0«èö¢YAà?>ö£od'jXº?ﬁ_bgiµ{ñW∂OüjÓ`Ve~å˜êÙ¡	ﬁF•¡;YDÚá¢3ÇIÑRÊ˝)ä’Âœ‘µƒ:ñ ç·⁄®êπ˙}~*§≤´áFﬂΩø*î“g∂
•¸Õ{ñgw,íEKXÉ0—V·ÒZ#∞Á@¥n€y$'´ZñgÏJmû†ûMˆ}m√f∏ë*À˙Z3·~∑ñ»èè’m*…n
:@<rvíT%˝¸|Ωùs»…‡Fkz´v_ŸÆ`cUÔJ†ı,0≤ÖV…r˜·âM‰ ,≈ ¨‰JÖ§˛ØqÓ¿”ÿÑÅ†ŒÀ Fñ^ÂèÆ◊M&∞	Ñ‘Ô¬Ì˜±£4`ê P ‰˜ﬁ∂´  DF…Ö+&"2ÑÓtYQáÓæ8∆ù€?û%˙E\tñΩà„W*B∞ÄÅD!Ø ô,CQ0c…ú¶j˚L‹&¶±Í1Q=$Ms)I57Óâ.c¡t7˚:5#€=*á 6[Gb∑˘9Ã€ºŒK	ΩNÃù<‚N…∞#‹Â*˘¯BÃDe3aîq/œ#ÇŸ$J‡ˇ`Ôqüå˙•`Ë§˝2Ä\&ÉŒ®Gı‚Â*ë¿LHÒOQ˙ìÔnR—9)õÊê:iaêkÂhêÙ@©€. π	M’e$ÃªsUÇ)x ‚ÇœWcı‘‹Ö™K˙ßÿ´§˚«SPoµk3*k E«VÈ‡AçRËºCewëΩ[Ó§›ÿ™Ÿé¥oÂ[[ﬂnøﬁ9¯Ê˘…—˛ÔjﬁÅÎ:8&{∫ÎÂ7ø!ÚM/W_’j`cË∫=ÒŸ“ßDÑà•É(¢kIôûäÎ∆áQ=2î›∆S»^áéJÅÇbî,·†ƒünH®ŒÚY/:ø!‚R/"î âÂ Òq^
´avjç•r√A©ST¢œ7»ÁüØol,≠ØÆô·É©ŸQll5iCúZ„ öoÄıº¡†πG±H…dœ∂â&8€XDë3t:õ†OÔI+süÍÅ⁄Ÿá≥∫Iïì]T_"™∫—Éƒ‡pãÇ'ﬁR$,N;ƒ%M†ªQP•aya∫πVHœ˚”,… 5GØÑ)ÍÜî^‡K®§›ß€Ò-πG–ø±%7U`^óºBıQÀÆ‡Mæ.ﬁëGÆ[K‡˘µ2ñË:i©ä∫gyc—Dwı´π=!‘œ›8 à¨f1d.Rµ	.û„∫fﬁü‘1ıù§d¬£⁄éd b!9ñKCtﬂ"k∞8û±[ô¥ƒ7Ñjö›®Á|,nŒ*h‰gTÊ◊;s0iﬁ¢ÑŸ;LKÀHY!nÕÉÆHı⁄Q‘õ_∏—\Ú‚‡¡å|	¡≤ÈOMç_$]Èë8µ|¨≈èÆJß9py´î¶b∏mô|‰tÖ‡"Çw˙ÓÏâΩˆ—˝âﬂ{ò≈ùÙn◊ü8Ê{ÛÄ>,ˆó∑(Ãî”HƒªÎ:¶ú/ÂYÎ#Ï¿„Y…7’µG˜Ó+rÉéD˛Úüˇ‰¢¶,˝˚ó•Dˇ%˝Kàäy%Å›§ûßó)[}∏7¯ìµ Ç1Ôõíá*-‘ÏÕ±¯o°CÎg∂Ù÷~´B‡⁄–‚KPµÔπ]
U†Ω˛@ß©º+ﬂ•)”U„¨˘y‚äîk˜JÌ	b4äD¸Pmæ66A>64ˆ«§%≠ì’^FIŒ·$J	ÚéƒÓ$-Ùñà[Ë4:êµ0ÍGå	Rzº“µÇ|r	ïO∞>T{NXºxô z »Ó!Í‚Ÿå-ä(œR≤G’3¿l«'ıG›hŸ
‰¨¥ã˝≥I*∆ÃoˇDqû«ÑuíÄgõ^Ûáœ/Ooë˜ÄíáÔƒ€ﬂì<=≈˙ì *áÃµû:“¢≥∏àê<%uG¢»ç&ÏB¥	´Ÿb”ÇóXg∂Ñ∏ï›’x“L¢·∞˜û.fr≥Â‹£•I î∞€C:˝J»l∞lsn¢˘S›ü+›7≠ (ÎëËº #‚+0√D“:‹}A5ÊgÈi“ãÈ?Ëeø.“°‹Uk™&wUãz±t¨Î≠’¨ÓdÎ=¬˙¨n’ï˙õØTﬁ]*ı¸õäT·™ΩYÇ¥—§â£k7(¸∞Ae9°•É*„4@ —múÉı3»-8”ñ'ûÍ≈¨ïŸ"ön@—ò-G—U@WJSBò˙—u.1√$ÏK¯[_(/∞'[èö…	™∆îL»XpªC)*;A]ó÷+È§hH^+ÅBÑOœfÄUﬂ≥Á)Ë%Àòt≠
Õ`¸BøÑ)oP“+˜7‰üY∫ó{ë‰⁄åõ€õ"ãJ6√12™†óïv4Îl¡-Um/Z-òY-7r:Îh#œf©éÓøœµBó˜Oi≠ÿÑÔ|≠X*7¬k‘.ó•ñû™f_èËjÄN)M:…2ó2¬eEtNmÉJ	√õÍÖãqtÜu=Ö6öcö¢/.íµU˙?˙ﬂıUñ‹v
G„>w∫ÜÎËç∂hf]&õ•0«`RòìmÏÄå_âuÅ&òW$˚yÿ˙–\\W˙∂Ÿ1xA,1X˘ﬁG‚ü‡§ﬁáR@ß¸=$Õ7∞ô5≤≈G&/9‹ç∫◊≈PÅJ[à˝‹»CgÃ¢~˚Yﬁà⁄Äá©ÿ—}≈C«ûÂñ∂ˇTr8ÊôDB˛ ˙º£8JrÊ~≥ﬂÿ7¢(É{„Ôı≤]Ñë∑kwO≈ï◊O®π™Âra¯»ÒhÆw(WÈ…rà;@ZB'Î∑Äe=_GsqÂ√≈Uº¯¸uˇ∫%€C‰c≤∫¸yUôΩ∫`:<πè“ÿÒ¡~JS⁄M›WvÃòBÎ{≤ÕzÛ{?ÕNôPL—∑∫ä»#¥ñZ:Â˘ã≥ZX +Ä_S0˚RxŒ≥jË1™ú‰‚j…{ßî‹îC°Ÿíáf3"V†jm(&ú+ò @|-œÊÇúèM⁄;Ju∑§y0hÆ®Íc∏,‘˜Íª9U¢LyáØuÃ|d@Û)Mé QÏpYn+¿~≠ﬂøgﬁ§CcYîûú_ûj«ŸúßTˆ!o≠liBx&·]É≠Çy›&]˜zgk-ÂÖO=à‚zëcBº<›—¶Ss—Í@ı4m›|ìÄΩÖsÀ‹·Ü—AÀghŒ⁄ üÓπN˘®wñÙ˙¯˝!Ñè®ı‚Ã'ÍDΩtJ*í~ÚCîÌ§YÁ˚båV9⁄a‹ÃÚÔßTâe=“b∫%,A6Ï˛≥√£Ω„„ÌÉ◊œˆüÔ?€¶è∞Nlï∫g… Èß–kcUﬂ°ìƒpL{¢~åˇ¡&HGqë`Ìˆ«é'∞ûImbôi⁄Rø,ıyã∆ãË/uª@:Dµ◊öµÜY|	øº\^^Ü/ñÀ˝ﬂ•\§W≠®Fö“©.í®«€W…Õ+˝ôäaÒX+/≤dp^3¯Ô2˝öÆXkà_@I.(@IwA∆˚ÊöœX$gI‹ÉÈÛŸŒìﬂêy6[™î†R€&Ãˆ ÿ:0`R‡æ®fÙgD◊kèÜã‰%>ÚUõ#∫òCi¬zjõë‹vÔûï3lôm˚∂µÏ∂gqë°	a€√∏w˚G`Rﬁ:WTùa,åPÊ[∫Xz˘È√ÀãW$ÓYèJ≈wK`Åq∞á•ºì•ΩﬁidbòYçga>œÒÕ
ÈQ⁄£÷n¡< |V£«n,)óhù)’æcà÷Xñïq¨©£Åâ»K}Ã}Aó|ò›˛ûUT˚Ì\$]¨A°ñ9ﬂ
UËûÖÙá`Åƒ,])˙~î,HA@>K‡Ä∫6∞I.S¨Ç£ÉˇÈ-=…e¸´E—Á\∂hπ∏VüwÙüòrπ…‹÷a|˚;»eπL∫Tª^ ˚kr
GAµòáûŒ∆EÔçc›3ìıG_Jáo÷”Ê∞7R€(ìÌn“I“§¿€_ ïºÁ*\êOxî§‹˜KèfáÛW∞sı.kΩπõÙ§∆°Ï∏:≈’tµ°eKc$}z¸≠ŸÛØ´«ÈuÈ ›Q™Ë(w>´Å¶[N•ÙBFàBéó˘væ1=™S±5ƒûÒÂ)∏H∆îQ÷ÚéœTwx…árXÎΩKŒÊ±æ*û;∑u˚?ﬂÎZn£¢-%SLÇV≤‘a~∂©Ké^<8/.DJª£∞ã8â+5I∏`
bØãEÍAíE˘EY‰ÒÄ5°w
F¸ÿÎÔ\2”‘,ÿu@!n]XBhMé^Ûr çp%©¨P˝¥æ™d:a+x˛$˜·„Tc‹G {"ƒ° .ıS°ZsjÏ/eÕ∏≤îd|∫*ZlIähÜœbM¥t√p””AÍ vÍö5Œ“~H˜≤…ﬂRP6kîç˝íh‚ˆ©±ëÊOq§8ˇ0ﬁÔˆø@Û·Lﬁì.¶a ◊ΩÂø˝ﬂ⁄˜¥oo◊÷îä‰ÃÕ)ˇxW€S<7Ë6îµ«‘ä`®ç`Y0öu–Y√≈¯¡?-øà⁄QU‡Ÿ· ›®XvºäeEP‘.Sµd,Á‡ÑîñtRBilC•∞TπÔÄÎb^ˆΩ¨°‹B⁄1µœo∆—ÀF¿Q¬ˆ¨õºæÕl≠ÖÆV%t5 ‹√Ò)Äü⁄X(	û\(#˙)¯—îÖÅÒQ%A˘À]â°+aﬁ+˝•{˚GjQŒÙÑf≤ΩÀóP;`Œ&Ïb(:ÒŸ u„qdÛY]^]]≥*tŒ5©çÒ XÇ[˘ßﬂí„ΩgdwÔ¯pÔh˜ˆøÌÏ†àéËÆbéé≥4ã˙§di(>°4Î«y?e2[ú†˛à¯@mº7`zûo˛ˇ¯œDf.ú;TÀ ‚]üÎUtˆ∑ 	Ã∫wëfD›üdòÊ˘Ì/„û˚¨b uXπ≠ë†‚≠´Í;∫OK∫1t]∫˝1KRV¯3à˚§Haë™ÏDßÙ[^4®¸}µÎv*t H8Ã⁄≠@ÉñR‰,Îqvâ¬RîcK¶¯çæ`QbÁ∑·iu§ú˙”Ù'£Ä¶©∞2Pˆt˚Gh6Dπ¢i•@öÙÃfezÄgånÚsΩáı‰gµZ8_˚÷n)&ïß¥Xq›≠~°ñÿµ§∂ñ\0‚W‹9	Ÿkèã†ØÌB÷"p∏ü‘rån¨B∂ÍÉπ≠˝˙˝∏1èÁÅL∆=ê£*oFî©Qƒ†˚ø√6ff'¶$ô® Ø@â'$V_ÎW=©πo™√5.ˇÎ0L˚Ìn∑ú!ﬁlU~˜(%;Qñ%Éã‘ô)QãTﬁGwÕ˜£∏à›≈ÇÔÒõÛñmòFÅN€ ∂8ÁûÂ:-Ã).!€TßJ.YH´<<≤»éÂ—Õ√º:úh‡l•'ø”ApÁÔÜ ôVwøäç+]Œ1•o§¿˝XÆc+XΩ˘Ü¬ø›¸mNFÔ'í¶¯zV≈˛æŸD≤m‹1F4;êkƒ»ê˜=∆πÈbîF¬ù∆ºZÔ¨zKl èˆtDó”Æû)†{Ç‹E∞›æH—oÕ3H(¿8h
Û‚#õéÛÎf,=|LƒóØÀ¸Q°F4aéı˜@˛‡1iÒÔû"∆B=ö&¬>be2P3NE £∫LcıHÆ€5N?ûÀ"ÎS=vÇ∫d⁄JàÕhuQP∞vı+€*Îù˙IÍçüîÏ˘¨äg|ZJ£ºObÚFK∂!vì|ò–W◊ »OH|ˆ§t¨ô9'çÊœ 7Æ?˛°;$∆ºc™‰t∑ù´∑6˜‡Àj4<¬„áôJôç®nŸãì¨∆?8&Ü‡®¬·o∏ﬂ:KãT¶å‹í˛^(C≠±¯¸eß˜åXÜ/D˛ÅÄü8=~‚Ã‰’«JÿhFük›´§}xeBó∂%w6iì#ü©k+ìQáÁ>˙H_I
:tÀ66Ø 5~ÊÓQˆ´ˇ¡rÑO*‹Äö	˘çóî÷å©≈≥©CÒEÂçWîK‡ÖËÃï*Ìc:Ô¥œ¶/†—|Kîyv˛ÿæ/à"∂ç;&pwmÊ⁄!ﬁ®â˚HÂ¡åGK%'Ñb÷åà©kúÃàÒâµÈÃ%µo(Ê∑¸¿d£å¨æ	âHNéoLãDZùˇf}‹8ÌÊÀ…8W€ëN€ .9ÖE,•é≥›ûê§∆®cS˚}Öô”6ÇÙÏkìC§E¢d-î.€ò~_ù⁄+L?Xaû⁄8&È	_}!…“—ˆﬁ"ílÌÈSçê§∏Õ›~€zØ∑7’ÆÌGKÓÎ7JÂ}˚T¸æå⁄b‘ÆÀ$qD	öA«†à„Ü—–√Ü∞@ËŒ&!’*πé¯YM@Ãs K_øµEk≥⁄ºˇm“-.ö4%›Â˜LYá?Ë?∆Ôv”´Å˙§kíúÅãÍ◊Ò;6ÙàŸ˘RmËí¡„.ÏÈbÔÈj~Ûﬁ©*î∫C>2òeΩéY˛&LŸÜ‹¬n˙Ÿ∞ã≈Øi[õFrœ"∫∞Zm∑oefP“≠u ro|PAÓR2J`T%ˇKﬂqöà´@sı=ª•¸¡·&b.è+Ú»Q∑Èÿï ï¸ˆKì]lÙ˚ô>$≈	Â?)\4o	rŸ0O˝^)ûQ≈KÆ±ô«F(ØºãπΩZWã‰bëÂ6Ç⁄}E>&Æ7áºﬂù¥üÓAÅ∫2Ù$ó„ﬂm*eG±˚˛ØX:•r˜E–›É(›°Ïıü«ÉHî∆†´{Oôù¯Ç=Œ> x¨æ…ŸlµÈˇXïm‹˝∫xÁæ©ƒX·3¯∏§w¿ ~]9ÙR5=«jXùtÂ˝íìéΩ„äÚª«CÁ ö·ºlú
è•ó∑s9CúQHcå“.W xœº∑Eüè‘áecíÏa¯ÕoàÈ~]Y!«)…‚•<t≤tê¸¿D•vQıxÄ∆$¥(Â#j∆•¢À+5|@`¶#s~4E=lPÇ“µ”$'–Ñæ<ì≥ãU”hõ°D¶/Ú:ä<6«ÂÇ|Ö˚ñ°yF∆`?QR∑`pî‰ò®  s:Z7Å‹ˇéá:–ëÀ∆0GË4[PÉÆÙ	•zÀ–¿¶Bˇ≈óiÇåò∑K|{pS´êŒƒΩ∂§G?=SOËj¶£¢%€` X-}úEÀ‚ÍJâ…òcyTÎº◊ñŒ	Â„±No¯¥#≥Vœ”µ8ß\ÖA3ã@©•¡§Ö≤∏àó‹TäFM‚˝—)ˆËI ù˛CwÅ“Ã(âAâi”àk¡Öj©ds≤Nù@å<ÃW
˙÷6A?¬íÁô‚≈y#’ÙçÊoºÁ°•LA†z¥qΩ©Ní^+ëxEg¡h2„ÒYîté±xÇ/,£Ÿ¸h·ﬂÙ≈ÈV_üYjYu∫⁄Ω†¢8	Âç3]™Æ∑4≠∆‘®#¨∏Qåòfêø›˛¢8†)kÖ|äÅ«˘H“ú5~qvëÎ{M_Õ_÷6v∏.n9a®wíXÔXBV<∂.ÿ;€hÔ¯·ﬁ˜Ô ÿu≥Ír`ÔûtDÙ∞zur≠Y‘≈ïØ∆€G–*MlŸtªV¬Yê7±w∑¬«SQˆBedôIô„©WLó3u _xﬁu[3›ƒ*óÎŸG:€ﬂJ7[¬£ﬂOÇ¨—±¸É¥¥5ÎŒ›‡ÙÉZÁ¿„Òf†+êÖR
Çäﬁ÷së…ˇP·ñΩ‡æﬁÅ?!∏Ôœ§Yï6p|–∫ü˙©âıã–#bÕ}M=s#H|ÜΩñ’€‹‚–¿¯ªñΩ"ïﬂ•.W÷UÀpôåî∞Öv è¥hWKÎHÂœxËö⁄0a°° i©EîÛ_/·∆¥˚¥\> õo+x–s<÷ı®[√5gp®˜ oöwŸÀÆ©/“∏ÈÈœ˝óùÚî—ö3˚¶ÿ2ß}≤JÄÉ2Xy˜‡>Â˚°M™œx çÓ„¿mÊœí”=iÔπ·Vú3⁄4Ê#ıïgÕà;ŸÌÔÛ=iÁo∏Oú©¬pÀÌèxOJ)ë3¨2”r6;V!Te≤Á¨).]9ıàﬂ4~.Xì‘Ó¥£∫D∞˙.‘!ç/$ŸÀê
lŸ`Z6¿çôp!£Gb+z‚Ü¶=ëÃrÃ[_∫IÎ*ìÏ*:¶Îuêu∏ÌbÊêI©c⁄≈6Ïâo’Ktÿâ¡eBﬂÔ £Ê∑ï 0Â€ã®»∑áC;ÍDÃ	Àv7=´“„=Ëwä•ÆΩ˘2Uù‚,z1ÉmlÈ1`ˇ8Éë!˙6?∑o üg' „ñ≠y≥ªOﬁ‹Û€?√C¡-	¶]©$‚¥>ﬂX ü√g	˛Oøñknl“áîÉõ£}[›£+La=ÊVjWÕ˛⁄ pqàËQ˚⁄Æ§d¿	YòäÅQCñ€Jï¢<‘Ó‰∞ö†=˜‚3PíËñtí!vÔ¶÷i…0PoêTqÇ®*Êzúè¢¨ßR~˚'pJHOÜTH_‚≤ƒîΩ-Äa˜àâlK∑”ç'-*ßCÒ'∆I÷Æfï î≠Ú
ÜÃé=”<=|À&CÓ[ê¯◊oë6≤yx}ì”ïΩ˝sØHÏÙoëŸ¨-µ)9z∑ÀI2ü√œ;ªË¨Oy∂üuí¡Qùu≤Ò–$È˘¯" ‚rfB˙‹l1y÷È(Ï<∫L‚´dpÓ;ê™!´ìIøÕõœ¸Bªÿô ,œˇÌœ‰æ1;qòôÃ˝nìLf8 tﬁÅ÷≈«îÉ»ãà	‘é˜(óÔR•Ω]µ»eNéì˛∞Cﬂ—∏ìú¶Z#„öà˚gNó€Ô∫√Óe˚6áªπ˚Õ‹%]aÖÇEWºÆU”Ua-lö∞uAMÌÔ‚m.å’∂¬Ó∂*ös«⁄p8’_áπ™W≤~‘åáeáÌ~◊ﬁ^Õa™PüXZ·iáZ2¡VÅµ»'t\Ùﬂr*OC∑∂êù8∫pB:≠“ôraŒˆŸœá≈˘8P>AÍ8P≈QˇHÂaú√∞¢{î¨‘·≤¥⁄0*@Ä?â∫ÁT/|ã}¶&¶§è¢ºNV[∏iôGAÌ°"õ+^k†xqÒ-Ò$ø‹|’9§πÄ2;¢ØŸ:¢ÉÀJWˆÃµlÎl&¶˘K◊ß1ÿÇatπ &ë[™˜ã•U´o˛∫ñ6îÜ†cΩ°⁄ˇ·˜\s‚ñ¬¬úZ3És#÷ÉÚÇW~ÿ<k!/1œ4rò•√≤çw¿fÌ`> ˆv¡/·ú•ó$sÆêù—0Ìó™«ºÕµƒ¶m{?Ë¸XÔb:Ù˝æä1Küø]á0,ÀÇëT≈Î]Äü=ÎGΩERÄ±Õ¢Ω,¸∏ˆ‰)¸7Ì›˛\∫9BΩFÁl>Ùû8Îß9‘[ÊyBËS`üNõOß#Qíä<¥GíÓÌË
å»®O2$ÏJ…\‹˛>Î√OÙ…ßQØñjFâ:o"üTÖÃŸÌèC(z‡&)È&ú©ÀˆE≤à9o⁄D‹î:-P†M2<¨|„cµrËØ¨≥ö€⁄apÄûîµZ∑ˆﬁ2Ÿ'‰
´⁄=ÂÊXÃ`w}OL∑Ò(w¬MÓFŸÜ¡ƒ√v£Ìt3Ü)vœò√ÌÒ¿ÉX3>≈P∞¯çÿmbÿÚ&awôÉ¸ °£2Ç`0Eß	£èïÔ∫1/£ ˘†ˆÊã€È¥Ë·Bœí©Ïœ<:ã‡'*ZNPÇvª+œû≠º£_&I–Ê9É$‹6ﬁww„ìÊ=w-´ ˆ6NÇ.“Û˙≠´{í‘6©˚∂¶'ßæÚïí_”^°≈éÉ_@·∫Üqàß‚›Õ[¬æÄ2}#d1	ÁTÄ(8>qQˇ-ä¢™¯ø≈¨®Úd^(~9≈¡vcù5∞¡l.L[

Áq'Ö‡≈ª9Bµº¡£Î√,Ó∏——†€ãÒ◊ Å©ÛÍ¢i⁄ô6˝ÏcÇeí9µk·' =ö)˙,ú˝¿‘$k˝”Ów›ÔGÁÒ>˝ß„m°JªóFïooËè˝⁄áœøzœo,«–>Ïûçˇ∂ª_ŒÓm«ÚÚob0ÉY_qÈá~í=¢D·1¯Æúé•≠ªq1Oı)ÔÅ*CJ9œ?∫gø4⁄qt	1≠˛´óT√qÛñúUﬂKO›ÓvOR%h¡«S™˚dÁ"´RÉÌO≠pyy~“¸5xj¥…K˛+;ê…5∑0â˝nõ={ﬁÇÏ√ø¡é•Ç≥Ãtcø‰Q/~ç?,`Å®@.ﬁµ…πy•L·fAM°ÔÛµì"ﬂ™∫°§∫»≠Z"µbOdX√†¿èyõ7s`\ÆsJ˚·,S-ÈcÚfèÅHQ°˚∆ueD∂—s(E≠.ü7¢DΩÛfx7Lüy˘ÈÍÂ≈´ZùÜÆ∑ÆôBﬂxw∞ææ);ÑÇK‹íóÎÙ¶π≠]@Ö∑hiuõ©KNÁæû˙gUK|+oGt§wÏpCoÿßÛ≠˘íﬂÊo‰·É8 :û{ˆsÂ.úKd5Ô∞%&Ü$ óz•Ò£ä£ÀüksÎÆØ∫B˚⁄(‚B_DøFÉñqÚ#YÖèu}ØOF9$áp^";Á√(ı˜˙ÒÂØ*!É`¶ºUƒ~◊öÄ—ºNF`ñ@µÃãd “GSQÇ?˛–‹ÿ5ô
öN∫FÚ~ªãh„Çñóh4ä».-w“êzÚ!§∏2Œ"ëj5±HµBIπmÃÉ=Kq◊)æπ3<€øS_ÍÀïùÁáørΩªEyùKzöTÔ>oFlò6πtÕSppfOéƒ‹Ñm• ã≥Níπ√&ú"‚ô†Bµ£0ËÛ€ÑS˜∂©`Ï≤-«,3v’6zqá4éŒAsﬂÉtÈ¯ˆwtûÚŸ⁄o”Ω∞÷!‰wZﬂ Ív¡±>—Ï˘°3«É´g%∂ŸÎ'Upwƒ1Ê{±¥∂f	\„	T„‘X[5bõy?®£¥Ïè“’≤«Àù,éä∏ª]Äö;àØ}=*I®\Ÿ?>8∆MrEıVŸ^’Ó-Ú°æóe‹+¢a‰[;Vn%©u;‰qvIÌÖ„"*F9f!RñæŒ‚N|Jˇaâ2¡«(·	⁄8 ”åÌù\Ô,m≤ÿGg…´•3j˝5cAdZ9∆nÉó®-≈ë”y:£,OÈW)zxl…?>Ÿ˛jÔı¡—Óﬁ˙!Û":è}˝€7”!hTÃâWﬂà5Â9Çwû⁄h>ãß€Oˆûøƒa^9{üÆ∞	ÿG≥˜7ﬂ\a∫«ÙV)ËvÕQ∫Ù}R]x®'Îbêπ‚DºXæïÊ*Ÿqá/v:eK£T`©U&ÌLåµù(+Z/ub3w«+∑’‹∆´¸â04ò˜hØπ,/v”vßH.„ìË¥5Iuü»j÷’i\°Líì/gjä…“Àoã•ú≠ŸhrÌÀC¥–™2†zòYFºaûö|ëäyÉ7‚ic∆o∏ﬂ¨(f
^e—∞!,çaØì~2X∫Zb©ª>òRØNX≥°
ƒR¬1˘ÏhP~¬jå·CgJπ√?·jò {áY1ÏΩúx¥Ôãw2Œﬁ⁄¢£44ü5gÎëÚ„Ò˘ñn^·Ÿ≠º∫ÇSÈO8˜›ıî…cÇ˜¡OïßÊ|ÉÒ±√Ik|ºï≠öòZ[ßBÍS¢Áı¯µ&‡}p2ôÂWD∫˜Û/´Za˘.w#esø4ÿƒUPfUÈ±1ËD5VOÕ
/Û	µu–¯Ò‰)7g+‹‘^ﬁÇ9O≥w¿SÀ‚3BçúÂY ÉFÂ˜'˙YçÑdO´Æ∆|Í< 8ÔQ…ªZ˘9yû'I®û3À»ö/≠~¨‡F∆Çõ†:üRô†ú∑¯≈or)Áú*©˛]@¸1Ï√∑
e¿ƒT@^ïh[9Ü…ÇÔ√?X´∑Øß»ºx rüÖ√.,?uÁÏƒQÕØÅ'g“@¨‡`(S:ièèJ’√†ñB¶öÆÛ∑ä‡R‹j…7∫i√Õ‚‰'M‚áñW?≤ÄAÀ⁄â4◊àPXû…#›≤+aC oXF<v!à<pÜJ{ã`ÂÄ‘ÍD«=°v«“'ì®F≠Øå∆‡üãˇ‰Ømf›|Â˘n]a˙√ÀO´9sÿà*≠i™J’lùùü«·ù≥ŒàVÎu≈=˜˜∞É€ë,¶bëTx_õ+¨º∞ÚjEπgm‹ÄRvƒ/õ°«2^q? zh-. k±¥°(®[¿å∞#èõ≠]ézçeﬁñ$ô±ÚÊ˝q∫^`Ï9TT/òÄ©Îlıã	¸Îâ¸bbêÈ6˛0¸ÈÏ— Rœ∫a¿¶}¿ıØïCbFÅg)@È√r˘Ëó£®kΩ¯∞ºÑÆ∫ı
T]úÔcÁ≈yπÂÍc∫˛‡&>L{	‘·ä∫ ÿ∆‰«Ág˜⁄ı@⁄L∞ó\◊òî
tIéQ‚tM""ˆsÓ÷˝%Õy(õ~û¢ˆ =ﬂqÊ÷.`[›7 ô
÷.îsÆ”ô^0o∞ûÃm™π≈_SFŒÌR’]∏Ÿ˙®ﬁõê&nu7‰‡èè ±Ë%EC§≥8DÃ¨∆nD¯ŸÜzÉÔÄõÊaUR’S
Ë’9’“z…TS≥_v¶ïº„>¨‰ìlO˙∞f[3ß>^¨ŸZúÈ·‡VMx2ÿ3‡&<),z‚™W™’´P¶jèﬁ‘"ÿZ¥uª”'l?–vq^¢9=2k/a≥õº=Ø…õ–—ì≥peèG™ƒOqîÔóHÀnQ∞Dcÿ¡≥çú€ ß9?Ñ
r»•BO(aØÄƒàœ#£cúm™FS≈>|¿„±!∂Hmﬂ◊ÛŸ8ºYÂí%QÓ9P»{2Äj"èˆ¨KXKxü [EÏp„qëç:≈(£ÏM °⁄¡Ò∆@mæîŸü7Ÿåÿ∑õë2ÔV°>∂=IÜæ¥G‚œû#>Ç°ßƒA0î-3n~TƒI>O®“I™6ÕÁ?|˛	Hè#ûHïHycîüCÃπNy&ò»Ì?¬U˛d5shA”∫—w¯u5„;Ûﬁ»8˚ÑHYÕw∫ev rú§â,¿Æõ—˙**íﬁ≈¥6≠iÜ)˘ynÏhu¢‘√‹ÿáwıPpTõn§IÁ5∑h<-≠"0Wc·ämˆºÚÂ^SçCﬂ0"pu”g≈LÀ{-zúxû∆B•—÷XtDa\C≤*¶∞˚πt«B7(xI˘ñà¥Ä°ï‹e/L]zŸîzbD2†·0ã/ìú#–…vz#9j•Cå»Ù≤}ô™EGÉMﬁ0FsÂˇo$pìLYzEï›uãòqø+ºçl2ê>£{0ËΩÛâN÷Z·õ√bºƒ}eÇ6˙ò
ÄR¸L§ÍŒ»∑îœ≤bí≤‹îEi`bµ∏oë…Ùó´À´ÎØtˇÄ
>Æ$=4ŒCˆÈ◊&-->ëÄFVÚÃ4Íf≥π›ã≥b'…:ΩXEƒ+Ìﬂaiˇíø¸√?3Q¿‘™;Œs∫ŸÈæJÏZÑ·¶¬1·=€cBw∂ÿ"É  R9<îLn.õí«frO’‰Á`–á1mÒé÷§˘1*7”zû°Óp,ﬂqª+ç'´€Y◊Ì8Ke q^ú~G©è~‚$Œ[áO˜Oˆw∂_nµ˝lÔ˘…ØúY`Ÿ;/™ªWHT•b'ÈñÂ:OÁ	~ç‹îGt≥∫‚œAmÊ98ÕíÛ®H©˛“&˜¨ﬁsÈí $Ü2Ó0"}tÑï08"K¡UÍÆ“⁄∑f«ì∫*iıùÄ=≠∫ŒƒR+±√¬¨¢ªZ⁄¿›Üî[kbŒZ)Ó
◊y»b–ÑQ@~Ìuå’9cïˆ(è¸HH⁄πàÈ¢Ûk’L}í"Ö&å´†ñ'ŸLÑ’Rˆ‹€?¡Éá+$$ùÑ5ê‚ß¢uﬂ∫*b
Ù,2,´ÕïS·GO©(euÙ◊! ñÊQ∂r¿yÍ÷ÃuCp÷º|4ùg„Ò4;OËq‚ü≠ı´Ñ`®Á·Ú&,/ÿE+Hk‡y<qmcû¡»¨<=»~ﬂN9øèG|¯Yw∂‹èã¥ÎˆÏàèC%QlÈà¢\ hIl1=‚„t¯4HÄΩSØè¯‘¶˜ÍÀ¡—◊Zﬁª˛"}|™LuMMÚo…f,RÉ¢˘öﬁ§—ﬁ\Ÿõ≥⁄ù_è¢ﬁ„∞›)Ço˙˛; í<≈…±\Üâ6\5ö’Y2„M5ÁO‡/S˙∏ZÉæ	Õ≤Tjíy6hÉ≠Õ0>cΩÜ«e†À	3\ﬁ3s’◊!ÿ3Í≤∏ü^˙h£æº“˝_≠È£Ça?∑Aî§˛™úººd]Nö‹<…¢¸b}¨º◊œöPÓDY•ØáQ-∞¿ﬂÊóœcÂMåŸ∏€˙@iﬂø/¡»àUìn!Õb:õûßRT;û/"ƒ¨Yv~ÉB,1“À≤È'HÙàg/2!ƒâ[JjÖ0—∆rõ»JyÉúÊB(†Ï *¶>˚êŒ¿í·Òî[·+ÃıF˙ÿgv¿™uï˛v˙€†∏=)èı§"ÿXp9∆d˛¸π⁄X„ü$¨˝€ü…ãx–I∏èΩëÊkâûA_?N≤¥u2=ÿ/XûL
ñ?SI 0≠l“Í&TøÔ#0Û¡<  ;´„Úé2îKŸeèòM˜(ÒˇÓcïÇxo
‚lT?™Ü?£∞fìjÀaß+Èü—¥‰†:÷OVé≈¬ãõÀ0Ív‘≠A©“Q†◊…ùa@è^s¶dP±uTâ¢*¶S	¨·—Ç©äg≠àW€_*rLïQËqôÿ|ÆÖ=œ;)=MË∂éËûå\ù/-ì¡ò†®±WÊ·Ûƒ„Zdã¨BòœŸ‘’eVÑ'ÖÇ¥°∆¬S∏À†ùÍ®üä4∫≥dıH¸6àTH[©&Ì3ë*VfÜŸ”7Œ)pœ≤Ê†î-ÀPÅ“πyÇÜñ™%Ö?¸Y[Óº(kæ›ÎZÊBy x™ (Óü€ﬂìîÙ„úÆ6b0ôÈN-1K•õ [Ü˙©/±)õß€mêÑƒRf∫¶9$˘¶Ÿˆ2 ù∞MÓ!BãÔ7™Z ≤UÉ:CZj“ºëTÉ{0qŒàó2fù∑çÖ&À ÒN¿»%Yõ~.I%z i
≠¯m'fIìQ —0Íf Çö(B§.c¥Ã3⁄:æ˝°‰¡G9Ë2Ì‹˛Å–C˙ˆGpﬂv‚n<Ë¶Ä√éhÜH¯—"Ù∏Âí29ã3Xp®#‡≥e@vtú≤˚nùlŸöΩŸ|°<)#æ B’‘≠πŸ8Æ«‰≤›&bı·qcZ÷—>D√± ·˚e ¶ÕÏ‡ï4ÿg6MwŸ™KÂ1óJnß«@ËFõnD˘é¸kcÛX@M‡ŸM*3⁄Àá14ò8Å<ÇœÄzò©Òâ—*l‰ëΩ∑î˜œGQ÷ç2¬ZaBµò@rQZç>˜WˆiÃ>zÎ°®‘zêß¶ŒJGÆ∂Eìp”QM#Ö°ûß˝òá*V}±óMG*Ô∏õ.êƒŸ˙`Å]åXuÂ Q\$¨ht|{º√Ös"É‹6÷O›"üÚB>ı
®˘˙’(Ks2Éá^íèSG5‰è≤6…«^øıQçj6˝‰=ØÇ÷áYU¿àŒXŒWé≤øv”LR˙ÓÏdJ∏&wŒTl/}hLıÃ™)Si7˝ï©ﬁSï±∑ù€{ùQ/;«√
 x◊Ä	û˘Î:>êÂ’k6‹:´Ë@âì{$ÿ¶éR“ø˝C=úç><5ˇ©é2<ΩÚ.¡lÓúèO“^ú›˛üµQÉº"w·Åi‡º"òVÿ¶PÔ˘w&]VF†éﬂ/	9ëzØÛ◊ÏØW>&«I{T≤âPoìNÑÚÕ‘~T$ùî|ºb~f®∑'§ä∏Çrˆdä ç=∞UõS∂L1ÛÇJyF∑åìa±<¬z’x Â…¨ƒR.÷ﬂÌê=ñ/iç%uÙm±ˆ`vç»|â`>&P◊[JÓπªHÚÙ4ã…¯,‹>òó„Áîf0‘ö8˘pÚ¢ÿ—‰ﬂÿQ∆,ÓñÎMË€ kÓ™v»‚bî‹	ö5÷˚∆§;õµYÕVÁÖª€òƒÊñ«√8†úß«\»[%KaV,;§ÍÚ†ºèØØMª[íqªîΩÏ£Ω≥∏H.”¸¶kM°ô%—~¯YQínÉIåAÔiQØÍ˘SØ ‰Áœ˜´U‘‹,XêÅÔ»Ì¸UîA√ßrDºIúÕÁ|ºâ‘Peêü∏:upn§káöJq/r„tÖ¶ÏqÄ$yº…˜\˛u5ï’<8Ö6î¸◊8üdS6P'ç«N;êÜ¯â≠Rù‹¥ö'¬∫ä]ﬁ±åÂA+Ñ5\FYB•UÛ.“ºòÛ•SÍ-›o∂¯>»6Wû8R˘˘S∫Iùˆ‚.µ\¢K (Âò7’È⁄v{Òq$U€Îp%Óˆ1bâS“rJÈœ≈ˆ®QÔí>3•<ÉRÒÔLjﬂ`‚p⁄_T?’ø7Wêp¸oz$≤\C;Ü,í»™dƒm‚◊’òIó<2ÔíÊ§§äÅ¥v;˙’bÈ™õXÁ⁄Î∏K%€‡\‹@È”“æZ¶vF1 ôÈHëŒhpÅ‡õoˆËÖîpÂΩ˜ı—ñ©gÈÕJfqµÛ"DüÏ :◊ã8CêYÛ“K˙Kîí_íµõ7∞vœ”À¥úÄºnò:◊;/sgÂur¯:í~ÙvÈ˙K^^º"PWs÷KØË/‡Z!tÀi)ÔdiØwä–a∆3ËI◊÷Aœ{*=-iëóçµŒØ3=:\¥Øôò£ñM≥óSY/¯ç|w˚#…£d¥ò-.UŒ∂MÙ˝(aÀ6ÍG‘d/≤tpæ5H/#r…÷ëZ–ÏK“∫Ù≠(5d˚`—¡úﬂL"Ï[«r{∫‘n\$9¬∏uR]‘¢´ñ˚ŒA”Z?’îîå≤a/∂öª‘>»Aa›P”ñs”ïØâmªW¡#Ïæ∏ô=Œ®Ì≠y¡ÛÅ˜—ˇ£vHGYÁ¬sœ~Æ‹Ö”+≤ëuv∂πçjÔ÷ñÍ’wlmÏ≈w’oeÌ]µîUÈùyôœWÈ-º”ﬂœr™m#I•L˜ï-Údîw@ÛÑÌ∫[±◊®¡≥Áù[ˆNyË∞ƒ6~◊*™º˘Íˆ÷SK˝˙ˇ¸Âü~K^$Éz∞:òÕ3á¯CMeR31«ÅµıR –)?.≠UÇp¶Ö'zÕw§{ò¶*è≤H‰atMï⁄ıﬂ €ÏP∂G_πm|F Æ´_ÎŒlg0¸N}£√/Wvû˛ ÒBÏÂ].€ÑÆe÷‡◊aÉ¥…•kbáTY√i=9;â{1Âå∏ƒí∂œp∑N6?¬3;Ö^z‚cJ∂·|Jx&©mäô+w±Sd5…äuﬂ£‹ë≈∑øSC tHy§÷ÈG›.TàL0u>BË¥?Ñå¢cØü‰π?°’ƒÆY[≥É◊l43(E%Ø4ﬂO]8‘™9ã1·£–µı«Àj^qwª †ÄA|EË€±x«˛Ò¡1Ó%Û›Ó ≥g+ÔË«é\ÛìÎ§πWDCokËzpve+Äˇ Èƒ«L]‘Ö!kºf	Êˆ~ƒﬁ≤°n”(œö±}çåÌœêÕÑÍúûN¶çeÊÊ>>Ÿ˛jÔı¡—Óﬁ‚úR{È<v#˜ØÆ¶Ï/gZç”-Œg¡V_‚0Ø\¿(˛|∏Ñ/I'†¯oäˇ®÷D´‰á®ä˝£Ã∑>I…!+.äâ‹úí\
eÛâò∑lµ:∆kÂ9~7HK:¿îç≠}z|3cãoøŸX[QV¥^jõ|àW”©±ç∆oÿáÅ¡ΩÇˆñÀrb˜lwä‰2>âN[ÛóTìâ¨fYçë%7•ïÒˇgfJ……oKÖµ≤±d†ìá–	P<Ã¨"û√—ë@rmr√{Üéèªòë#Å‘‘ ä]Ç≠7i∑ 3ÁUéËÏœ)–≥lÃœÑ≠LÒ‘œ?5MMÒ#PπÈõ/#|RºÛﬂ—øìÂë|_ºõ&nßÆ«ÿ p=€°÷•?·‘t$SÊ$è	ﬁ?	2¥q 7§M«Å‰«ö9Ÿ‰îL%âi}vIL~ÊAG˚‹◊¯ä›®˚.˜ck®¡F!˛MÕ£G»†Ê[åK‡·»a¿uH3‘4>W·ñˆ≤º«yöΩñZ∞`S∫1ñ1èh1Eä°Ú{â4&ÙÃë>µ&úıÜ¨˛S0dø¿?ìj‡ÃÚqu¬ë>xvp;b¡Mñ:Rè_¸bCoÅ÷ÛF˙‘ìêÔ ‰QèÓ/8qŸ˙¨à¨éIª-\Rd^<9Éœ¬a¯ïüZ$n2I÷M¯IZ·Ö7ê*UÔîN⁄löBú…ö:´yS.=NdP}3†õ÷õÅY>æ^ ”QH}Ä~™˙´∫+e≈ÄZ“ù∏yñ¿ﬁ ™∏ÑWâ‘}’•9Å}œNo`/¨/êZïÅhZïÅKüL¢5&<ì/9ø(j8b¬∆÷iI*î£3º} ß’úŸD1ﬂ∞Uq&˘ò(˙ÎxÄÄÚlÌm∆cù≥éçVÎu≈<˜Û∞≥‹†J)êò™ÂZn˛ÌX}˝d◊0l¶`/ú∏Vı ™◊©ØEïàEc›z.F}¬An◊B¯-t#tπR8-_Mâ€‡…JûcFkJÁ@ì;´Ã’6?QË◊Â˜N‹CLRœıÅAˆDCÔ‡ÿj
5•0˛sy¬Û8ËÆ?mº3j<+€°À"gXd€µU4e €®”8_∆Œì¡ìrÀ÷«º<Q∂ßË4*π›iáO‰≈Ñ]á\ì–∏óä#Ùbé*Q¬uı¡ë“≥È‡D◊yo›w“îá≤ÖXub5ﬁ!¿p√¡Î∆™¿ïÕ¢&€""%î£b+SÙ#Î›;A6∑æeIk]G óFÎ¬Õ÷Gı÷⁄î®ÇÌDÓÑ ¸IçiqtøÜﬁ>‡h130ªQŸ ∂¶UõÁ õ‰´?¬jŒ/∂ä Ôú*r¨Ë»~}–aWÚèÛìé∏=ÈÎù®◊i-µ—ÒäZ„m•≈ôéà◊ÑgÖ=n≤≥√¢Qéß¨ª∞ı◊1è¯¡Ù¿ıﬁ¢∞=mÉ÷?Å285∞k«†∑[≈=ØUú–±ì3ÇeüàÿÄ≈Pﬁ_ÇÊÃ´É5ê√PûmÃ›ñ9›ò{Ö‹^"≤Øpƒ5+û¥aƒ˛?   ˇˇÏΩ]sGñ ˙Ó_ë‚xÄ?$k‹îDDR6ß%ëM“öûaÎRE†Hî†‡* "#b"ˆa˜a7‚FÃ”ıùáâﬁà~öÿòà}π√2ø‰ûsÚ£2≥2´
 )€›ç∞E†>Ú„‰…ìÁ˚T=hÿ}•4¡®Ïìòüè!%ï.ùŒò∏Æîà†äH„"Ûÿ¿Ò8ôt∆ìvƒå©&∑*[-+r˚=s RÃ˛¬Èy>2&üD£jy•∆#l˘éÒõtπ“’&„0JkxîNú !â”⁄œã™˜´$ÕtSÅÇlST3ÌÊüÒ©“TVV”§e≠ÔàÁ>f2´ç
itÔ-ÛòÙ´h÷G	•†πè}Ùe0é˙ΩªﬁJ¢’ESŸüÂÊ	FI<:AQ∫∂vöF√ `H©:ä']l/©$∆gBŒ)Ë1´M≤l(uπãıßfvHMè˘}ÜO/⁄W»9¿≥AÄÈôSÎ	fYH˘4∆Ë»àπ¡jH…˛~µ$∆˙+Å¨*’è¶Iÿ∏s∂pÚ4«iÍœvP£ﬁˇπáÕg÷ùÂ6(bÙDjØ›Å¸Ú∞@~ô’Oki8êªÖDÒıLSyjW/¢+z*#H.Û©D§é:{–hWî–ÆΩC‚NÆ2≈è‚~Å◊i°Áπ£¬˚æCbaµÍ»æ∂Öó
é°äŒY+x6Â¥Øï9˙õÒú∫Ÿïé≤w-s#€ì$u\-∞¢€
_Ù· ª_? π_9"ËN_üÁˆ∂…¸(/n•á4ÏY)üº⁄?Ÿﬂiü∂øløﬁ{sr C3  û¿å"U∂√‹Ó!ª≥íEy¿∆≤Mä6˘*Ô8ˆ®ß6REw/G[º7ó5iú'—eÄuÇ-ˆ¿•&÷û®¥3?R·¥">ÔNãßï¡$gúqúk÷K≥±’—kï2i™Öó´/v>í—/Êj∏;Á˛0ÍD“õì8´EwÆªg;ÀC~1ãbån¶Œñ™••ŸÜ˝·v˙éüÉıãÂC0Ó∏<¢sû )c≥JLF†–¶,l‰¬+lcsùx°bØµ{*ƒpÛG¨<^≠ú∂ï‹\ñ-˜&n÷y‚|…l˛ÚRπÕÔ¶*Lı§ÂÚ3;8ˇ @ 
”˙¡—é85ÌÛS ıÈ¥…˙Ô$F4ÂT	”Ç( YÆ§†2ÔŸ"y({¶ƒ∑1´DO&>,Òîïüg°˙FTø/dˇ∞ıœ¨o·˙Ç‰Æ∏^|‹œ´\˜Ô—ˇ÷≈‚ãCäê‚√ÍÊ£üÜﬁq#{âOB pÂ÷Dñë~I§öﬁ“Zˇ#\πÁµ€](	 ˘AcNgÙ˛/çh5ìë◊≤àø5‹ò3ŸL=≤©ªÑ==IÇ¥∑πîß≥Ô∂E¶;A2b©bË∫ìûÈ≠/c^>Au!)¯©éÇC°èYÏ4(enìé~cûë©."[¨ÉTâGQ)≤≠;Y•Oö$;orÍ$¿Æ»∞˝ú‰q/∂¶^–:ê:U“¸'-aJüRˆ≥‹t(Æâµ©º#rÆ2_∏ˆlöËÜˇÁ9°Ñº”≥´≥Ne
$~â…q4+ˆ*ùxÖ5˛E¢¡∆¸ü≈*gÛ±xÀg_`L” åí8kıV\sæπücΩÏ_0`B ˜Kı¬Ÿ|¥”1í√$è¿®áÎKbî—íè9Ê=¸‘%≤9†K–™¯æü∂eÂÉª‡(ÔáWæ˝QqÃ5o·~úE.ªª%ê3∏#‚h6ıã%åKaÇ·ü9A2Ëv›¿-…Ùc'¡›¸8)pãl6Ö9p}æzN¶M+'ì*Ä©Ä‚Ù∏%iÚ8]Ttê˙˙;Ûèg^˘•J†°á<Uçb≤l´—Ø•Së+¿v˛0m{0dìqŒ¿$´H€fÎhÚ“≤è?.õyÊÅHô)k°¬]>∑ˇ;¨?„s`§ìA,}Ñ.¢a–g·UÑ	#1{πúï≥¢REücÔﬂ¬Ÿ«—–_û◊è Ö_π†,Å|€‹¸ë≈l¶∞Œî™F>7RvÕ€,/5wÀÎhËæºyr|ó’"Wâ%S(è√8E∑≈8iO–
èná[Ï%¨(z∆üwÍ£{MTãLæKèâB¿‹ÉÔƒ¨zÔw·CQƒ>f‘FıŒ¥ÓÎ·U'‰n©A,hœ(Ë&Huayòõ\ÊÀkÔpÛol$HÎ s¶qÁÊ18êo~ƒ5ÎÑ]¨ŸÅ…1¯Å«›SÄM6H‚]Ñ	•¶Ì™—rühGÂ˘ß-#í—∫º4Z£Ôå"£Ç≤"l...´*˘âÇ~)∞¯ÿ€í«î≥≠ü£d∏XZ∂üvı9Û≤C˚yœ ö≤ªK™Z\Ã∏üº%éó¿'“ö›≠¡˘#©”ñFπ
±N˜à}ZÏƒ^:
;Q–ØN|™!u—	ñÂçΩÌ9	èëfaÔ
∞ûó§JØ BoBÜæHq÷˙ _qga‹±´Æä˚!Ñ∫k<:ÚUlYïéJ ∑ÿÙ&Ñà9¿](ë?Ã4û¸\«Ø¬º◊¢ø˛»ç“`	“≤vé#∑¥ﬁÙ@4y9‹’“/\ø€5§bÌ,dº˘àjgcÕ{ÁÍ›{zà~Ìûúõi˙ıˇR¬ù›Iñøo_{F≈Ó≥Ïp•¶ö≠&ÏÎÂ{Ò¸˚®Ó(y√G«3æΩ~ŒxˆépY<≥^˛+û˝Tx¶Lq;7?ˆ;ì~µú!~Ñx]%x#è
Øó€¯)s¯ŸZ+ä8Œ¥0lûÔˆ fÉõˇUû∆√næ¿…Viû¸òI<>:6üƒ˝0π˘á √VR¢‹˘,¢ô8$cÄC\lüòÔ˛eQÃ€ÂY(0ﬁB0∞˘eÀ≥µœÿq4†“rò‡Üƒ√≥œ÷ÚíaﬁéG;”Q∫\YÏ‹Œï˚ä•ØºdÂ=1,€á0J$x0PAv¸j¡ﬂ∏YçÓù•TÆ=j[%Êª˜≈±Î—˙rƒt> {Øl<∫øäOEﬁcEËbbÜÊ%éÑ∏…“¯<	Ÿ“Œ/H‰–SåRã%Òe]TÒPƒotÇ~á=£?àﬂ\ÇWãÎôÃŸÖæ0ä$Oí°ﬂ≈≥D9∂1BOKΩ•ù™ï'!ÊIù’
oîˆ 2öf^W‹Ω
÷âübeUÖ›óG√}\ê	óOw’ﬁE8é¶q:Ô:}rÓ
í$q¸YAíá†∂Qî&õ˙]A/+¨¢Ä7∆‹π˜º¢ªNR3o8™~}ˆóAÇ5u(qú,>v-ˆ•hÓ\™—ƒ/õGΩœ¨`; CÖ˝ K∂‹Ç…tAzs∑ÒÙ5˜◊Ö‘Ú‡k˛°}ÒáÈ-/ÊÌt‚pIﬂ≠Å_÷ïJß#≈∞pÿÖ†∏µ˝ß/xƒ4H"†D¿÷ı‚tºR‡ìi◊–ûo¸OûÆΩp∫√…>∫Qú˜√.»3¡0ƒdxo∞®›~xd¡¸vnMΩgH<2 p»µB:OkTèÎµª1`JEı∞€[{‰Wøb÷•⁄„I #¶Ä'ÔLÜ=™m˘~'¡dLo√$EÎÈß3˚EyƒÏ◊lc˛À_RﬂâJ±üèAu◊>}ÕﬂO◊h±ƒoï…i6ç¬⁄`æäR¥åw∏kü%é¨≠±◊òaó ~t√àË1é∂÷Ï
 ∑´É¥&1ã.Å±˘£∞A°Vx]ËÆ»„i‡oøÄÙãàÛT§∞L®ËÜÙ≥ Ì!˜ÿÔBG√@<+üˇÙ?µˆA
Ç«–0`§nÑYàáÅ!6z£úçj6iÊXô ∆§4Ü„‹Ôb8˝0¸ ¨ƒ¯i:N ¢€ıSl[QW+Pﬂ«B;Ω•÷ú˝¿êò\ MËBÀæÜTÄÂ˝ BÕ<o9 £ïj–≠†€/πﬁ—X6˛%Ë˜Â0∞‡ﬁßZ0'“$677a8ƒLﬂ
4 ı@5yjÿΩ ≠cèçF:◊ÎAìùÆr7≠≤sÒ5Î7/÷>•M¡¢âÿ≥ŸÉ>Hs∫,µFﬂzû‘Ô˜QçCÖvgÔÒfgÎ2fk¸©wÛµ8:ŒﬂœπÔÛJ:∞»ñ7Ôπ≤’œtS.™©'≥ZñVm
 ŒïP™¶„{hÜèxiDNÖWöl*W	1∆ÒL.€ÊÜ+€ÊC´pr.á¶◊-›SÔª¿˝∏í¸≈Ω∂%Ÿü…9œg∆ÏıÖ95VIT†\eÔ2P‘X=@Q±AÖíkÖÚZU∑ÛŸŒ¡õì£ˆ…¡ŸÒI˚‰ÎcôÛs*é¥wà*ÃŸ¸;√à$úõ!Y!«ıi´Dyv€c%ª›µ◊Ø◊Æ·√æ˙jk0(í,ãº†‹)~8g∞ˆ„@Öjv/ÍSG’—ªôB 57Zü[°öâ4P=v$^’2˚Óæ\<°¢u¥Áèp˝–ŒÑh.7ªOp√'ü”∑¨A/°”∆QJË}ÀﬁêÑŒOŸ$AÀﬂòΩÕ6êUB‰ö˙‚‹Q®b÷5'èÉÆä¶—°Á°ëè4ra[Fy±•,x≥¿Ü°0P·J@"Ì=y|ÚØˆémñBÓP'mÛÓkw¥Àù∑*ö™>¡Ü™Zı…Óæí¬ [ …ÄEnf—Ââï3Ñ≈/ˆöñÖ’¡ÌY;"¨&¿rÒÌiÙt]ëNZ4"7ìpÄa@¡ÒNhè7YuB÷‹Û*˜ãk⁄˛ı¸ﬁ∑õ7ﬁ{Næ28	˘åÃ]41o&oÄb^§±›	Çª!†k/Lm π¬ÛÜ“t2ΩÄ∑©‹V2%˘•qÂÛÏ¯“/Àv˙û≤·'[B∑ëÂËƒ˝8IsAçÆ£∏Ö˝Æ⁄GyPDfÜ®óÂPÕ◊)kü§E ˝πe%æApµ⁄[=˝¸ÛiÔCË]Ù„pÑ†ˇ8à:¿©V”N˜˚ÁÅ´˛ﬁÖ»‹∆€∞6ﬁÎåæ
ﬁ°t¬Ú)@Dƒ†ãj¥$Ï@	ÅeÀQJ‘5f“„¨∂gà„TqúQT5÷"ÁQÛó∞‚›∏E{)	KiËSﬁ~gå{´ÆÑ„—a0Ì\˘≤◊gˆ0Ì}è¬Ô&a:ﬁâ@≈Ø±aππf‹Ç}9‘9{c=ë)&`˝µ^´ÂoÓ%IúpÓÂ	õõÉ±ukïÙhéØ¨Cs3U€/√NœØ>SÌﬂÖ"l∂⁄¶g€/ÇË
3å#”{Á (ìöö≠ƒ¡vßé∆®mƒÁ¢~jq∫94≠¬ÔZD›‰z◊rÉOM\≠»á[o˘«5c—´?àRkO4‹;E`˘Ú€√ÿ ú√_Å'/"`÷÷*/LıWjã˚„À·<O∆ñ∫a3w&r#rv"fø±¢∑#Ì”Wqv.}ë'ïUZ…~ò&tótàıπÄ®∞P≠ÆAPecò™<íµìÁ≥èûœ’Ë›¯ÅäœıŒèø0¡ˆÁÏõõ%ªÿbOBñN¿≤aèt¨˝¯2¢Ê◊Ÿ”ƒ Ù\ß¬-¡ˇ±ê]idYrÆ~˛æÂÙ±qóñ´÷´ ⁄πÄT\6;cò\KÀc˛sÚπΩ˙‹À∏∑ÿHÏlGZ	dV»Ò,K˘îÂIÑÉgÕÁùı“Àl°£XÙı€œ"≠3$ÄaÎ€ö3Ò{»◊‚‹8ßqƒ¢‘=Ìg®E≠ƒ≠À"’W˘E)WÈ¨T]—˘6âÄÏ^”/áæfFcºò[ı<)2ô¿Ô´ÉSL72øí|ãNR‰÷q›+∑U¥∏6◊s?ßgπ%TæŸêè”V>cÓƒE≈›qMÁÓnãÚñ÷≥Ωr/∫ÙPπÓ@÷ác6Ä±™LËèåì6FXÉp5EC<WA‰wâçèÊÓ‘/Œkúg…å∫µåù	Cì‘∫Æª„oaXù^ÿùÙCe9Øƒ&:ﬁ+d`˜ÛœK}éßk_¬à®Ÿ[Úp»TYﬁe¢∏üwSEqoN©B‚!≠RÇ≈*◊⁄Æò
±Ï‹Vg9Ü™ÄHÄº…[›B PIÌU*?“{.©ÁtZÓŒú€:Dd-™# “∞ LÚ≠gê©wÅ8Æ—°äN˝ïÿ Îô£∫vø±L“¬€Ç–ÁﬂL©ç™¬WUèp◊L)πh≠Ü3∏&· àê@æE˛ÏN‡Ê8ÿ`•ãÈ2ø⁄«Ö…ôBˆU,UN‰‹,ˆ”}Éù•hGÉpö˙π√UÚ—ÇÍv_/d?£sœY¯r⁄[6„úk≈√ÃØ-∫8ÜU◊iú;e¸êáZÜRßãé6<Ù»n>câî≠ùHú^;Ã¶QáÙ⁄˚›$Çgª@7πDã…‹x.©o0«[îéI˛Æ£ÜÚ[∞$ç•ÿ/:ºyVYÙ‹Ÿñ«ínFà¡+Iî∞πæt√,±
Ç :4∂Xä.h iÎÌÄy4hIËJ˚›cvÎÛ~∫!L7#t2FΩ… Ew¡r·4U«ﬂL‡ﬂ;·]&¡‘°$Äˆyåe˜,cËÍ∞>@àÄAn‹K¿zHça»òÂb“á≠∞`Mn]'ÒÕ$Ñ=ê7/P?ÿ ¶÷cSú?:¡9Ä+cOÄWr(P4Ö≈GÒÌÚ œÅÜ;äá{<M#‡Bwπ˚§Vx¯=qî)‘qËFÜÒá˝4~g@Áx‹“˛Ò¡1˘ü’›¡=¸]Ÿy#D◊vï;â·b]®®1ûlº…B*ÁË¬ı!à†ì…(8B›∫H‚AΩF†Lkç_ƒ˙,≈Ÿ:øYÉjj´Ω%g;o¥¬ÔÍµ®[C–‡çﬁ`*ÑŒ9X“‡Ic⁄ã?¥˚a2ÆøÉFëã8TI”õ?a6§î{`¯øÖûõ¯zkÄòqŒﬂÉ†«] û0á¬{|Ä∞AÉ˛ï>=»»¨õ√®òõM
á¬˝∆bIF1Ó'ÿV)˛¢zW¯4@gπÄI(E‡?6ZÌ
Ä”∏˜—ørå˘û–Ô1û∆≠ZŸD¯:ãÂÄı%èj¸Mcırkâ Pçja€⁄∫:ó∫h˜˚¿ˇÑ)wªV`)≠+:≤•tˆH˜C'ÄYî√ÜA5‹òÅg0ˆqªÓ~z@Lpnzôæ∞H†Å‡HÁ'Åà<§>¢´ò’/˙ì+LzdïËπq¢4w»9º=≈Ê¨X†¢ë»QvïÍ?Åo"≈häé¥ø4∫Æee√ éjG	tΩ”∫Ä¢ÄsÙÁ÷ûy4“%OΩ-¢˜Ω¿u‰qp6—·ûÈGÉléI◊]1;BÄ`s›ê,`&‡V¿õ‡\ÅΩF©&.B<láî¢5æä±π>Å√ıJ˛áuµSN:q?£@mùôP¿”ö ˘[én¯˙‡§9	C5æ1Ú¡„0e‰;ær€ñf}ÇRº@«3è$g?©‰≈å–‡Ãπõc@&ìÉÈtQAîÜMÅØM≠ÅÎ‘Õ$@O+¬WøMÑó«µ¨PÓ]>OƒÄ(ŒÊhoü#élì8∫†”£Ô»pﬂM"‡˘ú}ç—û¨*l-Uõsä(û¢WF7ñ3÷ÓS≤•4EJıNÏ –Uv8Ñ2„w(πæ÷.B≤≈⁄óqIæÈÿi>úÔk:{¢ÿ Ãm¬)òF∫n˛à{£…7€dÿ	ÿ -° ÉhÿI‚!·¶á/aœîÛbøV»`{ÏŸ˝ïÛ˘ÿúèΩã0?~Ngœjµ¯@\ú5r‡Õ›sGKw≤‹1î[3€‘ó◊ìëa'J:˝Pœ]∂{“z¸÷£˛rh1ñ5
FWøKã¿(∫"„ƒ•+ã„d0àAh>âwz®/‘a+m∫* ¿ËW∂ò©Ú{b∂èÇËâ~?–“˘$Íw’ï∫F=øØ∑≤—°-∂i‹<πÖ÷xI{Ë<¬NËDArçz˝aÎñˆö9ı'Ò∑võ√bÀÇâz`^§/cfu1∆@-ó—≈|<oqQ6óLÊüF;‹ˇΩ°ò Ÿ],4v™Ú®∞z'Ó;äT`E*áVœjÂ√ÍÈÊ§lÌ©oË˛h≈øZ.íÿx⁄É˝˘Å¸ºÀ\X≥pâ‹nãó,M:œfÔ{„Ò(›Z[Væı]ÇÅ∫!Üß÷¶k<»dıªÊ⁄◊û¨}æ~ˇˇ
ögpVÒﬁ◊G˚»e∆CËπû°wÉ™‡¥x∂Úª#`C±ÍÄﬂ¨\JÛéœøÅÉu9¨ mëI}&á1∞q◊œVÜÒ™ºîw r¶2»^xq≥Xñ∏…Ìùr+[–r∆1 g·Må≥àUÃ‹Õ∑)Hı3 ¶üæ5Tf^Zπ ÙvÇ·∑>Gê[Çi9@Ω@Ÿ° ±“2∞Ç9˙ ‰Õ*Õ¶ˆ1∞PJÍñ®√ŒÅn~ãEˇÑOtŸ≥A g∆iΩ"-BﬁZû¸o˛ÇP‹¯∆oª
&Ÿæ<n…0òÇ<∆ Á~4:èÉ§€˙ê Ñ0CG›òæW«¢¯”µ&¿:ç¢†<Xq'∑q	˛¨nòu"ØË–Ã\éBë⁄MU)R\{Ë≤ã›I≠Ht∆—4‹JA4Ü#ÍÛ*Åpºé0Û,èOæë?52HF°&‹¸[7∫å}|Æ eÓƒ˝@ F¸Wƒ`à!ÄU1úÙ«còVtûπ≠÷n∆Ω(c©H›(}1Èª¢ŸQ¯û-‡Ê|∑ƒÃ˘é◊,Ûá€ªÍÙ'∑~Ó`èä›¡‹ô6ëœ +y∞|˜≥ƒÍ©ÕúhÒî6+¯ÖºøÈpÎWû2JD…sÛy«X√âwÌá\sÇFo@¯}@JﬁnòÜd◊ G	√d!Ò“Sÿn{∆ıza50ò˘'0ÁVÈ:fHÊØ„j√sX°óÆ?g{hºÊÖ\∏FçTg)Ÿ‚”ã0-{ç
|Y'›EúG
±µ¢âÂ1"#£~j°›ågQ≤·	√V64“ÖÂ√≠üû$A⁄´¢Q⁄Køã
A†£SR∏ÖÉ;U3·P…Ë°9©ëO∫2üÏO»ídDòz Ò_√R+Œ&EA@∂©3X∆ä£x-Í&ﬁ¸CÉH íJ˛OÑzò∆t?;Æ≈®7⁄k@A;d(&€N<àE!G§Ë(9˘˙ã˛§.’≥èâ»’r˜:_E”≤D˘FÂ¬*Sœ„+8iÒ:RùÃxâﬁ⁄ik$Z¬q/Ó∂‚°;_€„%û±ÕlÎ?i-m1«3fgMËIKÓ&àÅmvÇ7^I5Ë tÓ»—ÂN;\ÕMÒo◊µ™J	ËŸ˘.≈2Ë∫√Ÿ+÷‚ÏØ>v…≠≥”ã ‡5‡çkMF√Ç_  ’ÿº…ƒÕn4Ï°©S{bW^“É}1‚≥NÇÜ˝·∏Å{g'π˘#› ø‘%Éπ„a.ÑWﬁëIb‡…m§Ñû‡h@	é©¬q,-Ööày„d6πgË√æ8Íπ•
+mÒ˛+§ß•·;?èpò⁄∫…
Q#Kı=‡&€ù“"ÚŒî%ÈïLo\`Ä:-ü	t5ö]"Å˘‘.…ød´€oEbM3¶ã¬ÍO¸L	,∫|ØqáÔ0s¯^öƒZ¿uSÿ¬–ÃﬂqÂ=^‘1=R%$s…ïŒ,;)™õtÈi”‡¯¿®»ıE£"yIíáKï$—P…úçYôîÅ\¢√cJ}s;“†∑‰°˙#?S‚∞7Fœ∂~ö`Å’M∏$Qyªmﬁ˘~∑óÔÁ∫·•dëÄhk”T–@ŒéO⁄_ÓùÌÓÀàÓ+>ûQTÏ"û9F±~fvL´lóË@d\ã∫ÔÊ≈ªúºç≥ñ◊_$”íuﬂäÑIø]L{‡gJæåÍ¨ûNŒ”q4ûDåò©Yh‹Ç¥ô¿v6ô§=è…2k{U¢ß˜v◊$œZÓ;"xVO±ñF}c}˝ø†”EÔñ•Ä$Ê›6A¸}Ú@˜%Ë“.ßﬂ]>"– A‡Â∏úYË’Õº;Ö˝æ#É¸˚ˆ®O.Ã·Ä}Z¢d|?∑wÓùiÅE2,å”éF‰◊È˜0LÒÆ œ¨Ωb˘b6<áè∑ÙpÌÁœ˘µﬂúÜ]Ú;ƒ´u∫¨ÁcÏxÄ∞ã	ÛÈ.Öƒ‹÷VoÁA:|å{px_’◊õ˙;´4 ˚µ(=Ë¬<–øQ4Å^í?¸¿r£Ò'kKy™‘∫¿‹ûÉ"±˛œb‚±0qyæçRÓ	õ`å}t;<˚óU=%W0ØlØb†≥ù^%:œÖ¿ü;ì∂∏sb˘Ì˛˘å-≈6|Zœ®€J·•∞æ˙ÜE~ç'Íú®ı¶n…ºçﬂ‹¸ ¸ü≈lH„=ZßCåz=ü§™§%rG˝-=ûíπ”§_©û ÛÂ»Â'A∆	pÍñ≥ÍÁRp‚YDGÜi…5±πdX˘¸y°!@Ì–àpg¿†Ä°,GNΩü˚˘õY…⁄Ã1¡ﬂË⁄ùFKw‰,Xî~ªb˛[áñÈ˛ '⁄∂û
óÊ≥DÊsèc‚ã†{⁄ ‡*9§—«˜:´∂GÄö—„
_#ûñÕÓa¶ﬁµr»	:1w¶iΩ£⁄ﬁkbœ—…%Ÿ˘›◊˚'Ì›gbúÌ2>eñcÉ∫[∂A√Cyúd–iˆX˚åÌ†L¥2√≥£»jæYÉ¸<üT÷Ya’üﬂFt“{‰…Ê_Pâ…§Z)&68GNLÎÈZÔëªSß«Éß“¡Ll-- %¢ï∞í˘8ÁõâkˆÆ˜’ò-ˆê˘}Ó+KYpÄ‡«ôÏèlê.∆/ìx Œ`öÖœLSÅ¶oÊ”)k§[€JäÒ◊àfK@>Ä’âìÄ»z7qq“j¸»4Nî”x ïèAx/'√àÇ]€c‹õdjÙ¥‚±’ õ√#æéøõ¿ibdkˆΩ‚X30Ë5∞¨Xu…Û^ô?¿CÃ´HYé˚·‚
∆ÈØÆË^pã]ﬁ Q‡óKG˘zñ£Yô0›EB*ùΩ(€H?ÌB~ÜßÃ~¯xâtŸ4†˚†sáI‹Ö!§^B'¯‹ÀœIX«ÔpÄvØ^≈ ”äÂ¿ÉsØ‡lßå2î:≈E±Û+TZûÜIG£Œ°;w4‚z~≈¯Ö!4ì£øuå9ÄËU¢")•‘≥¥˙2∫ÆU`~çú`∞ïk–∑3¨H•Nóè@quºƒjÜù è™ÉÛt+◊`ÒJ*ü⁄ä=gæ◊ﬂËıb(ª°Yã
>ß£§`…Ù3ñ›ÿ“n4‰π™À§<+üíC!Ì•FúƒP‘O¯±àå˘1õ6È ¢¥ÉëC\ﬂ‡ém°aUﬁsUwÛ£¬m…wÂÒ‰úÙ•{ŒçSÉx‰—tøf˘ôﬂ5JÒ}a ÂS‹ïÉj7L—á.f\w÷-Æ∑^≥U™¯ûá”ΩÅÈ©õIr≥À¢‹Á^î„0<)≈5?Ã<	…óM[Y∫≈a·LPYë™≤ß ˆ jÔ ö<]@æÓur Ω˙„Ä<˝!ù’ %tÆ˜s\πôw¬Q·GãqAf§‡ï«*¬ﬁåüÍÄ*†ln`˛QŒ°)´œ\„û_π≠|^ p∂v<mGõÕö≥µK1µèãπSñ1®TÙ∂≈fáÌxΩ˜Ê‰Ïıﬁ…Wª¬l~vxr:j»Åë™ì…sØ.¿W°r#nº’	¡ ŒR7∑U¸^ëtº4Ô¬ä∞ªîRTsk∂^s≥ÃZ ¨Å√‹óïîJ´µª$Ö‚∑Îöy‡∂∞…Á`∂*Ú$|Øù…ÇKèo
ygâÏ[ıl¶gB©bø@=+	üßöÓú\ﬁhAMjó%4sæ$ô√f[ú’ﬁa J¯h68ôö?ÖC ≠
;%W¯πm8ncá.$Ú$˙wx˜ÿ∂Ú4ÑÈÇ∏¨/ÚU:L»^ì#ƒw±ûP‘•©u bÄ"~>ﬂliÌ™*≥ﬁó·~›}>ﬁºeÈ+1u√† xˇ^¶ˇ2Íì-Û'ú=÷˝ÚN=+ˇu/”?Ó	–§˚!@ŒZâù}ÆV¢v4`∏øÔ„¥=˘°'üXvEÅŒ˜Ä&^O«‰x–t≈©y≥»køã´ç7‡÷¸…'ü¨≠±’’U*†€ﬁ99∆üÑW£8W¨	t∆X1nB.ı«—Z. õ†˜ŒPdVﬁÜ±˙1ñ√≈∏äÜ$ö◊˚{FæhpÊáÿù–Ãn∂ò¯¬~`x:=Òt˚ò=QÜkøª≈R Ô‹îïπx-~ëPrG›'Œëjmâ‡*˛ﬁ6‘Zy¬Fh∂ë?÷z≥÷T±Õî‹òúÉ0°`@¶¿«GEËÅ$3)bÜ; -púo·Ø£8ŒÆP˙g¡ëOzŸÔ⁄w Ÿâ!•eÅr˚°·èr4ÖÄ≠Iäa«∏QÍxìm<x¢Üt*FNÓ‘ca÷LﬂA*zVáOaJßÔ∂ÎßÔ⁄kHTi¡‡≠W¸ª˛RΩıÁ£T•"hr9ı€x/À*/^º |óÚO¬[/≈„ï√$g|±k ¡àÖ∆ØòÆœøvFgù·ËÒãíØ·7tí¢ßEJ5—ØH˙∑#Q¥©•3T8	ƒ‚høùe∑U Ê6¨Ñ⁄~ˆªplRá£B_W¯˘Ù´ì◊ØËﬁ^?DtPΩ~¬Û”‚‹`ﬂanV^WStR:IYØNy‰•ÎK”∆NéZxâˇbæ{x∂¡BnÔbË@0Ê'Váo¨?È$q#áU8#≥ËÇµ#4
wü ˝?c@Ù«ª¥$r„vx"º!Gy¬HCó˝ƒAjøƒ`≥+4‰˝6ﬂﬁÆœå’„•⁄7∆Ä˘ï¢ÛÌa7(¡≥g⁄Î`ƒ˜Øy≠®Q>–\´úCbd|ChÏMÎ≈Dﬁä†-©÷éºd¥$ØÊi µ£(ë÷PvÕhI]÷ö¢bAüÒpXV?Hn˛Uºª¶∆≥ˆñ/mPﬁd«ú‹Ëy5uß9≥¥ÿqLU ≈EE}∞«a'à€ò;»F´]4Ü[ã’4j Àö¨–»qHµ<å·ıΩãÃ[´˚üRÓX}ıûcÜ[~ ò∞'¿8 i^◊∆,e@3Â´ïú7ªJ´[˚¨∆
‹?£Dº˙)	oî÷k]JÅ5jMöo£E'ºÀΩƒ¯ù“?£∂ë1 ©Ç«iç{·∞^ÁπÑ≈¡òü{]¶◊Ö…Ú®Á`$Ô≈2—™5;m°ù>—ç;|˝É7P¶⁄´›ÌDµ’tÕT›Œ¶:oöõ—Êùy™ºäÜ»Ôj§kﬂºV|æJJIßw&É\´´F#"ª’úe/Æç∑È
Ωbn¨a<i!ËÀM≠Ù-Oj€∆íﬁ€S XLAß«¿OÇ∞⁄∫ÑèA¶≠%@tœ$?sñBÔ2øÆÙuÔ£?¥√Lª&Üc\ì#3.™A6»µ{JiÄyì¥jxlp k>›b’`†¿	÷˙TL– HZ ê&„ØÃÛ¯*Ñ}÷∆‹-˙"fW`vDãÄ«¿•§6◊bùu»ƒÏFS¡¬»&≈—ß≥A„0	ª8˚∞+U>§◊· 6∞»ï–Å€r˙O44ÇÜŸ≠…[0¢Uúyê™¯'äÄ„kY⁄u—>˛iÒ¡’;dÑË¥?Jj›ö’`+v˙ìnòä·xáòV˘º˘Ñ¬\$∑`KéJŒV3<¥®u˙˜—∏ÁË∆	áÂxí∏:Ÿ+3ﬁ%E0uöÏŸ–tãÈL·i)ÏI—°ùNOMç„x6-Ì˘VŸRr¥ÿ’j-ƒz–˜úpA’:oe‰'øﬁ@¢q`¬l5{.(xN≈^°ÕZ},0ÜÁ¬ªÅöáŒ°S«´7EñÍê¯gWá⁄’a7º@&X†£ èYDéBR$~˚èÑÀdP«id/b•„’;ùf˝ã‡<§*Tµˆãù›Ωó_~µˇwø}ı˙Õ¡·ÔééOæ~˚˜øˇá¨µ“Q?õßZ€Ow£tA8èRQìÍ8KM5TØ∏ªN◊·¥€ÚE˜√`ÿ–Ã˝Oböû4Caü Ùz*ˆiQÁÁMvë:ûå≠ )>
^eÖºå|ä‡Ü∆Ææ¢∆±}©~D√ÓÚtãÄñıB§õ˙hXSK®ÆNE–$P§Á-æ˚¿Ü°⁄
àÿyÿ¶¶î®•É8˜‡•Jåx{≠©dÏÄÃüØÀÛ5[VÆjD¶åsd'±v~Â´ÔÂY∏Lù¬ÿ8π∂÷ãÛö[Bº?“;ΩºVádñ£nìI˜fÇµˆìN¶óföKnA˛É‹¿`!Ìkv1E¥∏&¨÷ê¿§"ÉJ∏§î.i
GÊ§–} •~#ÛínÈ≈ÃB?s'8«1†¢Z(/,Â±†©∞VË£j÷ÉÑäÈ≥Yyå?ƒˇn◊Û/úﬂÔ/™ºU7«/Dçã8Ÿ:ΩzΩìÈ*3XÀ"|4Æ¬≠ócê¥˝ˆ˘€K#}÷˛∞ª√5Í9!í`ß	daÈ
†!äiÊ£–Årty∆æh†°WÒ	çeµ!∏J¸ õ®! û|¿3‡uY|ë√÷Üh”ñ±èñ ú÷Bel˜>äH>*ª!@z)@⁄‡ßDÒd∆KåkTgf%¢äµÅ2B≤•[/	45ûÈ+ıÎgl#ª5∑∂±VË”Yˆ÷U†p¡Mx≤He*∑%È B0–ªÓƒò]Î∞:™ôŒÒ$ÃP†Ìâ≠˜Ú|ÄkƒÊÜI"ˆüN Å!hQQ¢zm˛`¢ÁD`‡VçÍ0)∏>í/ãbGœe≠#¬(ÏßB«Ω∞u„⁄<&¿Aøü4é#IØˇ:'ûO˝%x™8ËJQ¡UsvmçΩ†∞‘ìÉ›ˆ±FÁÎXbã®•X>÷CÍyQ@ÒFú\‡{⁄J¶5≤~RZû4êÍp\ƒ5µÇ™*lV/+˙öƒXY^Ωˆ¡êñú•Ç£ô
7/x(´—ó–MÆoR†¯ôp.‚÷L\Da N¶∆*;πÕ	H}vÒ‰Sˆ$‚t|Fæ˛ˆ)ÿ·™-Ê÷cq*U[™nå¡>œF⁄y&õ=ëê˘L÷Uµ≤ë\¢’—…kËÎ¢ùÏƒ¿
ñ¡à[Sxµ"!Ö}‡ôπA%í⁄ç.£1èµT®U Kåaß'à.ÄGtãx¥∂ªª/]RîP˜Œ.(FˇØ¬‹eeûÜ;˙È:Â¿QÊdÆµ2aER[˝ë≤¥~—ÜÕOÀGHEÈ›3¯˘H ´=%D_Æ#˙iÃÅùlQ„CÈeÊÜ∆Ì~&Ö“»ºMü¶˛›§≥m6Æ)ØD®ﬂeó+•˚)WØ)uÉŸW®‰_◊©¶ıjJËÆ7%`◊õ¶ÎMúÎMíÎz	@±†ò>≈Í9á©§ÒRÙy U`Ç4[œäå,”ñ~¿± .“Œ{û5¢?@N≈S^GJï\]<ÆL£∆ºM`-HÏj+k&˙5ìYMetì„yÑ3ﬁ–ªŒÜà›Oã≈¿7Ù¥1Óå1bròâW]»©–◊˘ÎaD⁄tq∞äË=8-;„}Ó»Æ-Õ]aé/k„3ñè§ÔV†TAÅøoR´crÉi
‡¥%—QˆÉ÷5{Â…'ÊN≤IÄ±©
nB≥ß™<ŸM“û^äê‹óPÚ1ÿπ¶éíß€R8©ÿ:¨=nÏfΩa\˚„… „W∑r»¿√É3,à(¢∂—˙&éÜu4â“û¨a zÑÅ◊µ¶c5≤oT`é§u Óqk≈67îjÔ€„2ΩΩÒDCÁÏwé¸àÚOí†R'&ÖúÃ§ò%o≥ﬁ»ƒõ∫2› Á≠4◊rÁÙâÕ§!:d–P∆ì√Ì¡0«yüú\u¡Qπﬂw˙ºu∫˛.Òºhû¶R±äÒ|B]¢ÿ~lvm\ø†6Ûâ)Û∞zgê§Ú(KﬂOØÍºC;àœVQ˛Ω	á=M±7Ω˘±èN XqH
>€Ä≥F˝^–bº⁄÷áf1÷Hﬁú“	∆˝…0HEÂ8–±ºs°j–N±ÉT™Å4ö)Sª(KG	O«Jπ≠Íº4ıŒ·Àµù7áßÎ
ÏäÌà™ﬁÎæ¬+ÿÀ©!Öl(ùﬂZ»ù—≈RRE%§6Úê»rÿ’U`Àâ–OC¿Ç§¯Ìì+YBä~£ [ê˚√4L"Æˆ95œàÏ!Ö5∂++ÏzìÕ≠w5M%<É∫J‹Py˝§Ä)‹\™¯ÚÇ*…®ª'QÄ÷F¡Öı%u&TXÇÑî#l’£÷®©|4@(W£ˆFì‡§Ûs¢è›êX0ﬁº£øaSAà =©\4k°PŸå;úÙÃM≠
¥P<õÙ’Ñ«—˜¥ÕuS-çEÙ¸yjïìQº˛ÎgYyd πåhı.ó’¢&æ¨Ωk/Ë¨¨ºFà"lz\ßñm1F÷n◊ÄŒ°#ß‰däñ)è¸º/´Nû1Ú-|to—9òÎ/g![jà•Á∏Ú˛”ÓS5Ç™H≤¡ŒQ+_‘´œ≠”T@6ÙõsÊ¿Åh/0¡blå<>,≤®BÖè …îı9J.ñ–Çáægt®®mà=ã.uŒÃ≈O¿hºsÇ2™˝≥ì~5a4Zws≠o¨åÙá·ÜüŒåÆÊí-¿∂ﬁ‹¸◊a;àà√¬F∂¥w¯n:∞±.πÏ?kçπ’(Frc’Û˜∂Z-2R⁄≠¬CÛ˜ËÇV”Äñ€/Æ…kcv¬ÅÖÖÄx†u∑§ÖC¿Gπ§/h„êØﬂëç#„áu˚Ü¿,Õ_∫4òÎ™,MRÕ@Ç4ùùÑóêbŸM<&ùOl.∞âu'Y··™ˆ•Ì‡ä√—ŒK¢ﬁ|¨∂J€¯3ﬂrw@l/ÛÀ/=—ÇI$¯-∑f]BKuZMÄ≥Z–e7Ñ§‰N[í÷ê∏	,—PK‹…¿∂⁄!©¿'âa◊&é/ì0=ìwz!Jn∞?´Ò™$É KMMŒa”√ï1fh∆Pr=PV§Ú¨≤aÃÅﬁI¢s•‹ïzYaﬂP®Bs|í-t‚i∏#Ü.¶Äq¿J"5Çµﬁ©På.S2IPí2ÈWaƒ+œ<\g›ΩåπçìK”ôü~É‚“î_©L≠îô‹=˘8wŸ,=«B†ÿﬁÆKó´ÜÈÛLu	µX"ıªÿ◊Yª$˛–ÀªÊµÚ»ß(FùJákÌRÒ¢îzÃ¢à§œ∂}ŸŸÃ':M∞Ü^‡K§çŒ'ÁNíÀÄa^ªAÄ1C[¢¢'∑ΩÄ=∞éÌ+˙ﬁ Gh·B
ï§†…§H∫Öb]?/≈OTÍ<Ã4±eDå/gΩ—∆cÀíYãRÂ†‘∑oä^«Ò˛Ò¡1aZΩaKl“AZZ<Aiç˚ŒXçöYãúßy˙â[zÿ*Í´mj˜πÎÛ–Q…·‡8‡\∏ZGö‰$GÆHÊÀ6y£®EÌπå∫Qt,#U2™ixíÎ5≥gQG∂C\	tïOV"#ûFI¿{¶QänÙÈôdŸaQóËj]ñ»•íö¡(Ä˝ÏJ»z*wì }¬⁄¡Äa7¬aƒç,í	G$"Q˜€lîj˜+ı≤&âÊtÜß\zDN∑Ù+¶9‚Dà„ˇ!†}Ë(Q?ïQÍ¿@.LJµ
Œ-∏“ÉÆb+Z»˙nÖŸ¯}.
MwˇÆ ßè<g$“≠«¿;{gÒjÔ_ì®÷”æg¨Æ~Ûâ‚Pu-µ®\ú;a"rqÌå≠œ’πDÕ'pX°ò≥±AÉg˚nb¯Ü’fºzøÚÈ,sdPNƒ®ú£g‡t¡~n	°¥≈{µ˘
JR !eÌ+1)}Øè˜|úM¬ò»ùCHx˚√SÈjTÙGÁÇÅ4•(~œhRùá>⁄TâÈCT ®¡äQér¯õ÷Ê§ßäΩ âRä 
‘3
·4h4Ü\€2Ø59¡ƒæÅ€LPø.éç÷{1π-%·êXPg%Hl\ˇ>®øó•°?ù·∫ÕücÃf‡:ç{Põ+z|%*EY”… J€A._›õIÛû`xËÈhÂÇfíOÇÔ„±⁄jÅÿpCl¨ÃÌza•	päíliÏë…ãHr 4+©!z	˘j‹C›˝–òÖ<kmq–≤Ú∏ ¥~·ºÊŒ≈˚ æ‚a*rpw˚ÍÑ	®◊8N$e“?€™‡≈À#Ö.±2*!˘»h√|ÂyOÓjÈ—eA˜v’ÏÜ]_ÖÚT∞√ï›<íòá!p*Cxƒ ˜À U’Åﬂ{πˇfˇdˇmS‡ÌÂÀˆ“65QDŒçb‹‹‰cô^Ñ—àÃÌÅØDÑ[ZC‰e¿<é//˚Ærì¢=$Í∫É{yîÑ”ºÍg^çµ–$|» xø’`“/ÉP3„’†€≠kZ\¡d‡-±sì¬¥#ò#Có<¢8rf‘µ–Rz(/-ôGŒΩPÂˆ0Ï{*ÕGßE_ƒU	'ï˜√∂' , pNƒ5ë§CŒ°ﬁ÷º°ù*}IvH‰7ñÿräÂ‹$/¶ûÕR∏˜ôXü?yF¡µ–	f ]l˘v3o?ı∑gjvHuõ~g∑3X™'‰%Ì!jˆ ¸Ãn
Ë™ªÙ[ﬁû~∂a:¿C˝2°ä-A/[Ü°Åxí ¿µP[ôÅù+ßa⁄ÈkÍå∏ôµMÓç¬â+œßÿtr9AIë3udz“§≥÷èŒ◊QŸªì¨S⁄êéﬁdéÎIözLr>°Üﬂ#7~Y{"oëÅ^xzhE‰»›X:¨Ï €"˚Õﬂ¬„íÌ∏W,ÁG•˙|ﬁƒ¿Ú≈¬ŸmtQ3-j∆taÄÍEÈ◊⁄“˝ZÖ¢†õËp=®.gÕﬂaÙYu›_∏¿1û<˘·i'ëÎˆHeyœ=]ô˜ôyCX]Zl7L√o5b‰•πX°ÿÈq¨®H∞Ú‘d@óÁ¶Â°$⁄h,
geà—0”‡È¿+@Ω˙|ç†E⁄	õÎ¡∂Hq!QõZ˙ì—èñE¥pöYRÔ•ï¬∞˙Ë÷B-ömŸ3·O”∆pÅTøé…Õ¡5Âã∫ØÂÚÄî›{g·∑Ô-‘´∞kÀ±[fº
≤Ü~ö∂2◊°oÑñ«˛›fÔ¬i@∑ñOîô/ÊÉ.ba?Pbn@iu0‚Öqœ-50zJÙY±Qû»öùkF∑ƒöôõÍƒ∑eº±zœy9_¸ﬁ§/‚–ü≥-f∞yy√´OÆ´.∏•XËSìå2	Œ‚s–ün0DıW
Œ0«6¨ánM§Ωp#	‡gB°T[C°Òæï ç`"ô$ôÕõFó<Ã6ÎN¶ƒsvŸTU<]üë.=_u+KêÍqFXb3&1jr±∞U]$„’”Ò’ß‘ô¶t≤ÛVØ©X°Wñ_Î¡[PKîÌcgC≠òñû¡≤†dÉ… gUøBÔ{wvxûÅ{s}e˚?ˇÈÍYØ≠EÂ—T⁄™ﬁ¸3OX«59k«ò„Ê_c}ëœhâ¨Œπ@i	`(J}S"=DÅGS®†ù‚y»Ï„˙|ÏÜTZ¬Wˇ¢√Ü¨£˙ß5å?ò˛Ãöª∫ÊŒÃ÷Vh^gü±«ÍüÕG∫sú‹ìƒ,`o€œ±Á¨f‘J@=õº˝0ªÕÎ&ä˚5#˜}V6÷Q76ö¨¬£Q	Œã€+hÉHÏ¥≤3màXâ®OÌ-1p1–ÃDm≤Tp4äX÷å‰’v uõÆö¯Áyîh¯XäxY©î-∏*©yﬁ™k	·‰IB~j@]∂˜h†vä⁄F6ßwD≈…E.O≤Ìÿn(≈TÏ‰ÔΩ’ﬂ<v¨≠Lœœfâ‡üÖIòˆv>Ëç√hÄπ—”Q44kmÈeÁı¥∏ü∞‚a… _0Ÿ6¥|tÈÔ˜q<Äø´ø˘XMQì;í£Ù'∏á+s“wdãÏ*îüÀ°˚#Oe·çu,-¸HKòo◊~⁄€ÃŸ†¡–W,4ÂÆ∑´JÖâÃ»„Ë≤á√…í&{™>ZŸ˚ü~,cöÉVM‡Òls3WMÒˆ¬ôb«qjÏ¿ﬁ¶1Qoa[9◊\ïá
5nŸ _‡˝KaVô£‰Ë{∏1B≠¬¢ïÕπº¥¥<¡UÅcO#t\æx6”}…Ê”B{pmÖùN8í—∫ÍßWM¸◊»è›ã∫›pHƒÉ‹êdzÎ, ƒZWaQΩvºÚÉ3©+Á#Ù˚xzZaxy%aá" √*ïk%w˘–=G!∑Ûm›™4P©à∑¯˘aı7®ì™≈÷øƒR≤¥ç´"€∆∫Yá U°ZÀ§Œ_’(qYıÍ†ﬂWP›“J=k3≤∑ÿàò|W≠h<Uu¿πVds4l•a/≤£©k·w∏we-⁄J—öÒÙ„Ftè‹9ø%+XYO@[†• Æo5#≠Ükª≠[8ÚÎÁ¡êWjÔr#∞ ëÅÖÕÉhÿÂ	+∆Z
e3nR ã!:w‰-Ò,∂?w’ã,)‡Ëjı°cyı’ÿX∑VŸ^*œ∫^.æô~¥∏+±ÍGHZ x66≠±ƒ6Æ£íß,lEC¨¶º≤˝V¶Ü·ÕÊK-∂˝göÁı∑ËÇîêe√3¢Î¬_LÕMóÃ˙›uÀá4'„c+Iÿ»œu)™¡ë»⁄ŸM´sŒXƒìd$ÅB’•GÎZÕ9≠æºIû*–%U¥Œ JZ◊Êf4†f·	ç”GèPä2çìZ`Ñ´ SÔÇÛ4ÓOÄå¨Ç¯Aõx5A˛ë◊Eı8„Í…/#,’!óïLÉ´ŒòÚ˝˜Öµ˝ E	œúú’≥,Yœ±#ÑT&*ı'È‹Y}…£“º7e¶€Ãà¢›õx™Ùô˘${jñˆ≤∂∏&ô~âæ$]£0`&¨(ó»~∫ﬁZﬂ|g≤”Âú∞-,ŒæüˆÊ¯ˇt‡ëm2ZÕ•úïÌWôg´ƒ0Êz©Pf˘°S∞XŸF¶æõDtíJo%îoFq$=£3GÍù√Ë´‰√\Õ√∆ÆÊû/'33]–ÛïÛ:äH•€j)…\|ÎHxÚCE†á ëj¡1ˆ¸∫à·:$?Ä¸Ëzu‰v+:\sU≥·È(3ò+GNÂﬁO>ÌΩ+-˘^R√9∑‚Y“ÿ‹≥zïJÙí»™ÃqUôQx˙±Õ=…ç+…1V£F&¿Ê≠œÓ©ŒŒÂ◊¬B†.¡}√"Ôf°x{ˇjÕè!{K˚ÕÔÂïmÚN∫˘Sóå±–|ÊëEi‹ïﬁPøchŸW_m5D°lÁZ¡∞
ã(ÛS»]vÀÙl´wsœ‰ú+,Ó&2⁄ÑéõmV˝™Xl”®Ô.˝Õ\i’	∫ΩÕh¢JÂ^d›"Fò€ò(Ëäy8Â'®®ùQ3¶¶≥wŸº,.jì3ˇ=ãõ+zÍ à∫±Dù∫∫ΩDíU…}ñè£j·@Û,‹‚∞"!:ËL
¢CÃ§"èàäÿTœØΩ≥âÄd£Õ⁄®Ó…Œı¿◊)YIó'yL-Û•]hOö™JMêTôLñÌC9ó–Ü]ã`˚–Ê∫$˛ı6Êt·Œ˘Öp’Ù≠n∫,&Z›$À%5ò{˘Ò˙zôä?˘ÕÍ⁄ÛÃHîÖ9A“ÙõíBk—@5:ŒÂ¥µ«˙OﬂäÿÏ÷(€/b¥VDÒ‹î∂äügﬁw
Ä˝bÎDb‡⁄&»É(ZÁqMÃjﬂ~âî+º-XQ¿Ù3ºëÂˇ∑aö)∏Î°‹©;ˆKuï
âöÕ°-%-ÈS&œV√yﬁri≈`¡mT“`ÛÅã∑ΩU§ö•jJùzˆW√F	Ç3«’Í√”`<∑‚…ï?T7X\ ´…ÃÎ–œ¢‰õ\ﬁZ™`¿Øhx≠˙®£D3¶—à!ú,º+	∑B›ù¡g. >,hô∆p)¶"≈4ÕçèP≠$ ∂Çàc0(:_æ≤}@¡6m,HqÛGî	Y›a‡„Õ5çŒjMS∫IîvÖßaï&©|IAõØÉ6√[|äÍy¢?eïve°í‚¶S&›6“5ë„h¸È«NÌíDÀ¨ËENáÂ?–wÏwπgûCF¬/ﬂn£°~∏^AÕÏwå∞é-^d%Ü˘
{˙{„(3œú‹A§oG∑gÀ©Vd∑X2s◊frÍ6tù©úrûyƒüá€íö*Û[∑èΩ˚S ¯Ä£‘ 3˚f∏(âb=OO9<qÃ)yÊLø‡yÄl—uÃu∆≥iÛ1€ES:"πvÿw◊ôÁ31ùÇ™*1èßÆ =ÁRd‰¥¸Ã!E`Öûê¢?ßŸÁ∫|áV¸.~ºäÌqFˇ±ÿ¶"‡(>v"cÉ]9ÒR#àguhtb†‡iÄhº∂ú<d6]ÜtˇpVóóhóç=ºvz!–EA≈6Ú2wÕπ|È+P¨ó∏ÖnkaÌ÷›®∂nÔ_‚X-
¡æÄ&|cælÄFÔ]ﬁ]ZΩ£mîº˛„ﬂYçáXÃD∏∫/Õ‡Ó—ß–œ©ˇæåÆ`kmfô	k-Ã¡—¨5JZ§∞+ª;Î®ò75ÊmxƒxÌcQéú+±Ëß©á∆y®î¯,·˘Î¯‹èá2”7ë“∆˘«Qà÷Ö> nê*•ÂæÃÓÈh¡~≤U–Æ4:Û›¢à|Ê@µ»ÿáU9 2œ¢&ÕTj{ùa5evﬁ|™“}∫≈äÈ©9]á^ÌKıvb≈ã
_∏$•˙]ãØÏ
¢)z√a'ÍWVÙM‹vΩ]\SÔQz›~ö“˘wπâ95Éú›ÀÈË>:˘›»qœÛ<—,ñbÑπ“·1¡Ó fôe≤ŒŸ,iÊàs™›ö†IÃkü±ò©õ!#$òµWˇë≠Æ≤iîFÈ3FØEdÉ¯â◊1ECñy3 ßC·+‹vY76÷	˚
·CG°˘#u#L™MT§N√ü£$ÏêíÑ&JäD>EòíÑå¥Ï≥5] -Ùæ∆„fLëB[‘+∂Ä¢üÙ%¡Ó«◊ﬁÍF ça\ìv”ñg≤é(	m}^õ3oøıÔ$n—[y˙üi‰*ésÃkYñ*Ûç¬°ﬁó
›≠#ƒèGú´èÒè&åË˛:“;G‡JÆS4SîE\nS&µ”9ãLµÑräˆÓÜ“‰„1&˛vÛ‹ENæsı‹ƒ»0í∏|q‰èº“ü|}Xî¢{ötîÔwH*i8$90ã¸îÊítœr—ä ÛΩ›˝ìˆ€yµè˘:îoﬁ®ö`gÔŒ äTÅ<2]€…ßõá <Éˆ^Ô±ùÉ◊áØˆNV§¢9≥>7TÃYåÈh’jµ‰´M›Î T>õEbëÏ[˛∫÷\.ì®À§4ÈÍ&Ÿ∞µEá»K“‹^…ŸùÏΩ⁄{yf/?1ŒyÍì2Ê%‹«¶˘Å€¿›{›ﬁïÔõúŒñ ®pV≥4˘yŸ'n	<∫·π√síŸÚsR¢ÁR Õ|Ô*@ug∑ΩÎXR42.UÓÈW‘‹“ü¥wÜºóÖ2ºı⁄*Ì#6Áµ ÿÕj„ﬁÍ∆£ß€Â¬Tn{'S‰bﬂÃqŸc8›|G£∞pfû1í© R⁄^Ìj"≈7ì_±ùË1Ã|€I~èyºu9PLäÙø√îh∞∏.û]ôªÊTdQ~∫F–À<@Ì»u´ ∏7:÷
fœUÚÍOÄ¡, (t∂d	*£‘ñ^" EjûË}Êé@[˙∂!ùÿaˇ2¿r–-—¸ÀÉÏsÊÚ)R∆Òê?ßÉçSgá˜È∑∞%—}dÖ—ñHW/Êù_ôÑÀ-·àqï)∞ ‘W˘˛öÃ=Ï"•÷]®¥ÓS°ïx¨°Ø˜5ñ[âıà+±Ú–[VÓÉÆŸÖÙÅ8ê,JÿÛÒ√’˝/
]–Ô†∆\•wå1õåq¡s^®z|∏`JAïõ©q–¸¬ v]k•Q¶9\
≠†ï‚≥NÇÁ'·a¡]OtK6"ü5¬ÔJ¢”Jºì‹¸ëzÎí(KôS∂» !JQ˙ÿ(∑U8áÓïWÔU›tî©›<'RÒŒ6‘∏ÍÃı=ùcÛÍUt»:0]Íd„æ#3Çb}√˙%á©jˇ.4uﬂy«ºÏ…‚˝ z˛ΩUD≠ M`v0r8`áª/≠S
°\%R<ïKÙäG»gòrÿΩ–2hÒ˙2∞7[î¬|∞ñW-õﬁà≥ìz…UMÓ-É“π4j∆G˙`m…˜y|héÖÁU õ„Öôg≤∞‡ÓeU`^µV/úU¶U’Ñe¶ÒyIoÛbp˙˜.~˛Lˆ/~äùòŒ·ÛæñÔdzæÃ¥Ù∂t¶	∞>6±/FÄ¸F°ƒ˛WCÎ;Bÿø"$}ä≤,+Ç˝|©]“˜ˆÏèÈ\ò]Æ¢U^ŸNv»‰™y∆atp¡˛|•b•5OÀ‚7‰àø∑äM!ÎÁk≈Úπvóﬁ†Ÿ∫†cæa¯˝‹v¿REª»êø°™£N.ÔdºG_.2“‰r°1É¥QπÜ;k-cIzÛc≈%£÷|<<#≤≥üïÃÀl¶_¢MzíƒHYÕ≈ƒ∫Ï~^–ﬁk∞√VQNÙGû:≥Í”∞Ö7ˇy‘˘Y@‚fßÖ«ñ^ ô˜üŒ<wÁ÷ù·Ã≥cÌI«-U·±òâ2Wàr\s$®˛»≥„$ZË †Óò/YJ¨k<±:¶W^µg mÀL4=˝Æ≈Ω;Í/‚∏CΩ≤}ÅÕÉF~Gì\[ûc»Zﬂ„Ã<æ%^5Ò:ÂQ68G∆¡9 
¬ﬁ‡ümæ”£Â±ø£;h£g∑À√¶µ è÷√Ï∆ºÙhÔ≠éÆ≤Åm,ÇπÖàá«®∏?˙HDÖ˙¡≥~.9ß“p5+jQ[kìâ¨˝N≈¶≤;TıTö@¶
©ÆÎ»«Øïrß<⁄–ÈÉ°]|î7óŸ&@Ov•Ω¢^:•‹©_ü˜‚—ö}\JÜÙ1©C˜áQ'í˘íDÜˆ± ‚¬<üÍ@>Ù≥:–™»ÒösTÖæø$• Á1%ƒLòqeôŒÕèîr9‘
—P&j◊Ï®˙ÙÕn`qÑàrÀwÉÔ&a?$ß≠'‘&•˘i
˛Ü €JT<ZÆñ1©	zÖÒ–<ÛuJIÎQÃ¢‹a±6¬on~Ñ%ˆñ™Rı´\Ì0ê'(Cw;"∂ˆ@◊ˆÄÕY(’Gdªí.È'xÇV≠É˝ë’Ñ√_C\á⁄ôºï{<ëBﬂê¥∂lŒ∑ªÊ‡Ë$À´-M	í¥m‘„“õ–≠ëÕgÉŒZﬂ—ÆÈm´Î’öÊ–srÛﬂRÓ}Æ’Ñs6ıŒ!"UÚÒ3Ñ3Z^-ÖA_Ö*ôfô˚‘°	^"ˇMø0/*∫©∫∫⁄„∞ƒmû_ß÷ å˛V
#≤< U-"@KÙV\ë9 o≈œ{|òµ©÷ûÛÍ%[j⁄≈qÂŒÖ˙gEÁÆy í+<bD÷6›Ö∂‹°–ê2µ¶zr¶n˚\Án6´π⁄ü-ÅL• ëËG´#(Ÿ:XΩ1 ™ò™Óoµ£›ˆ§¨‘_!¢á&-»”È∑˘ñ! VTÂÏ…H2&õ„1Ge1Z•*VØ—·âŒ[tÛ˝.Wˆ∫ãqR0A˛ëø-í7\1ÓÏVÆ7J≥Œ,$˝WiV∂9ìUWqbπ1FO∫* Gˇ6
?|av¶k≈”?o’s¸º«Ea	ì$[yÕo.›c^∆˘‡-VçŸW™z1≈pNìxxÑAHﬁÄtc%ñãÈ(ƒT∆∏A–-ﬁˆ„‚L¶3.¥34Z)†IX_o≤çıÒ)S_r79ÓrÄÄiAÑ6}(äÆsGa'åF„◊˚]¿Œ)U€[ıåËÑ\”U-•"¶Ó)∑©+Úáê;∞√k‡x∏ÆõS|—‚|ﬂ`rÎêÀ“
âÎ›"òÙ3sÀ·ÁÀPnïÃﬂ/§õ¥õìƒı¨˝€C»&PyıãÜÈ6_~òzÜ†ßº0Î¯Ë±––5‚≈ÒdÄZ∫3g0±¶ü∂:I=v€Óú~XÜ¬`˛àµêY@f©ãMuPZ†+€Ër4≠ΩPÔY%ó\öﬁ,Hì¡¶Ë™s}D]¬£yLe±9™»&òŸ/÷ÉÀòæÖI∂(«b≈u)Ìıp¨æÜ+´$=\ò¶î∏3&Ï6úS¶™™œúJÖ^ÍæOak<ÖŸSÂê*∞E)PË„äG@ºëOC9*U”Ô≈Ò∏MíﬂIp^Øç`ëó=~ouäé&…®œ√jµ£TªöOcd‹süúæ£Ún	~ísêœ≥πcÓ	ajÉo‰&åû§d™˙èg”O’ei¢∫Ø√™„9¨~Ò«TÁ^é©≤# &x≥ùÉ7'GÌìÉ≥„ìˆ…◊«gØ⁄/ˆ^üÚ¢œìîò{˘„œ “ï‰?ãH7ùà3(ß4ˇ©!m@x
≈wt
≈∑<Ö‘∞‡äv«P˙Ìµ}…KπHªÒór˙‡î˘—À£Áæéî¯œıHâG ¡—N˚ıﬁ˚L9{πøÛU˚4÷Oñ¯œ·dI›…Æ‹ﬁˇV\¸dıQw√¥~ÕKºﬁk©TGˇËr◊ß*£Å®ü™èFïRÌ$@j:±,¢j=√Î©¬xÜpÊí$[Ût[f.¥ˆT±]m≈LpÚ®<o†£Z`X3 C¨ÅU3i#_3È! ˛4≠ «õÊÍ≥ÌÏZI„+˘¢¢	≥¬Å˜ƒ(ÃgX¿+ü∞U)eV—Ö^È∏‘Z∏pF6&T–ÆÖ•ºQ˙]…Sb‹ñµõeˆﬂ[ÈÃ ‡ï*ˇä2<Ê∆ù„N∂/≤ ˛j©HA»ÇqrÛ£ﬂSN~f:$√˝≠è—ˆœW”ΩŸä‘¡3 ≠4´.√ºÓaY∫N◊\Ï.jˇ˘œˇ˚ªõŸE=÷≈ﬁi–Gß#`N‹Ê@îëõbí“P¶Ç¬¨RAˇsDMcûU'Ñ|]£∞¸ã˚=ﬁ‰(Ób"©ÿH^€iÇxÄ∆¯’…®ïKΩülŸíŸ¨ÀaÔr/^O}UpY"Ã˛¡2Å”¯πõÙëzá∞ï€´§ñ$…ö/…BT9ÔÜ“ò∏™¢øl≈£¨z†:ŒlıFFvãVºò%{Ω(Êm‚Bº-2+r¥ˆo07ÀÊvz†∂*¯xE˚ıÖõ»»m$/A^H∏úœ(ùJ1EsÙ¢tÅU9ÖÆnE4ÚÁ
‘Wî¥ÊŒ¿©≥BTJäÛ—@jq∫Öêµ¯ﬂª∞ôceõóëxuÛßÔ&Q7fËDpuK∏ø%AŒ£;?ÃÒ§‚Ÿìwou<d–S&®%Ïj58g'êÑ≤h˝ ÌWM‰ı˘Zé¯q;F´ÆüÏ¢ØN8ïÂx}º≤Ωó¬"Ióy√˚} “òßk©¨Ö"˝˘±òî3,Lÿ°ô)ÑùJ ¶^êÁ)?Bçó‡ﬁ¸…'ü¨≠±’’UvºwÙvgÔ|¬≥Ö¢Ñ‰∑NàôŸ&}tóÆœò®
Å≈bÇ·5õ£Gæymã…õ?p◊‚πR	ÒfO”…˘Ipﬁ§ÍkÙÒ')• ü÷‚Ù„4ø˛Œ¯5˙µÌ∫∫IÛìÌâqÚ≈£MÕÈªÌ˙È;˝5-Ûf”JAßø,”—e/j9ˆ≤Ù{∆+\ˇ≈Çj˛“Ô¨J0˝√Q¥ì]§„˘-¶Í€bÎ¸R7˛0<ÆãÕ£$ä^UòßÎ©}¬s+¿ ﬁ≈EÿπËÇ’òÀ’Í)é/|Üﬂ¡\æõÑ…µ‹"¿SaMá(÷ª∞p5	ÒZCÚ–za$°√›Ô"ixˆ#åﬁ–p!_!Ç˘‚^í
k|©‡®q¸8,‘gÒxå“^<Æ◊dıT¸0Ùç⁄˙´Z›∏√M9V ¢≥∫‰¬Ÿjµ∫-¨ªDIC•ﬁêgò7Ÿ©9¯w¥F<◊ﬂ◊#xõ}ÇπÙDbÏÄù4QÖ…oô+˘Ä«…µ:œ 2°ˆv„NΩãˇ∞n2ÜD{™iïø`Œ:¡∏”cX≤k¶÷nò∆˝∞&Iú‘k{áﬂxÙ£Ô±Æo£3I¢∂∞éµlAëõ7Ê8êŒ¶]åh®ê•÷‰x∆5mCòX©√âè"JÖiÉ8‰˚ˆFaO≥{Ÿæz"Â	†-∂C»«R‘eìıÿ‘Ÿà∑Öur0G:£¿(ÿp!ËÛbœ∞¨æéè!ÄµOT0 tR¶Ô†ÒÑ]hú=4Dâ∂Q¡≤_7Äø éa,W/¿¸ÅàÁ∆QπíDA'¿¯/Üû›$fÒwã«o≈`Âp°≈Xm-…M:Á¿O è5ÚUk¥¢!Ä~¨%™·6”0…v≠UÀ‰fíÿ∑ÿ©ÆÔ%p\t∆˚∞jÉ`XV”m´EmÕMoƒ¶—$<≤ÂZL˝)Ñ‡ò»·Ü∫:◊ﬂà<!Ö≠ËÎæUÄY€T”⁄_—h>øs6«Ω¡2äÆ4ò»Ìú·ÙsxÑ%}ôàÁªÍ•y£≈´Ï‘·<÷Ä…∑û\˚˜í¯É¬Ö'Í∫Ôc ïD ä˙ˆÿT€c‹√i‹âêRÀ£¿’ô‡‘tªH¿
Œ#©80∂Ú'E"1“-˘%ª#œX/ä ∏Z#M3è©’ñÄèÕçó˘ï™I∂Xk";å≥Æƒ•≈P<Ëcf€-nWËtÓxÉ≠˙ÒO€=Íp›bh5É)F‹æ¶pI-π;ovSK5¨Ò6_ì„i,~∆…À8¯òe4$íâ:¬'=E' Ëd0LUhıI8¶á|≥5∆+¬’¨ïå:óa1s–µ˚≤vÌ#Óè˝\zc?nRæ~ÛJUhëÅô*^î`Æãrâ£f?HbïÇà¥¸ÿAÏë„~åF)çı§Q0¬;fÅ⁄`§U(7jBÌAíp≠1Ûÿ]Û{êP?ù’i(ÎË ˛*Ó¿!~L≥™◊F„’G5dó—0L/Qé j¥]FòÈl≥â>CŒ;≠ıﬁûÿó˙L0’#€ßa∑h†™“∑dÄ"?FL ·J†»iÇ≥ü—<™UüÈ= ›∂€_(kåû¥aØ?ëLhÚÇ¥^›Àê©y…„0?R≈s6É[-k" OKy[Rhº˝!HÜ‚0ÕﬁÀæYK'8°Ùœ^É∆ä•ùqU»–“∆kø˙Uﬁn™cú⁄•L÷ó√5∞ •Ω;ƒﬂ7ˇzÛ/±VÌÀI )¢np“W6ZcG·8BÊñ '~ƒR–∫±Bó¯$b‡¡b°ÖÃrTrÔÚl22ÃÉ_FQX~eÄé¶}'Aé¿D:Mﬂõ˘'H0m*Zˇ∫<T6Ö°æD˘zò˚^n@6∞-îÃXœ3òßÉï,ßæ®gº‚Ò[Í≠˛-´∂3'ÂÒé=˛‚ﬂ<Ít~s±.´Ëd¥™èó⁄’çı\ﬁ˛º\OàÖljx◊òoŒ}9ıkZ≠<úÊ˛îp*‹Å∂Âéo›E·ÑãC	æ-#I@ä!t0MŸ‹ıcI∑l~Ó¨¢0Ë.üDíÄ–Î AwπWïj(,wU‰ﬂ8B⁄åÿm∞.p‚1’ºˇ˘ˇw5Ã!”bÙßn†ÃJ∂ù îøtÌÒ¥ÜìôœQ˙±Öìxiªë0°n:muö›–>`i-mÇyÔÜ|>
Æ˘’∫∫Üª¿ç`0ˆ±L&ës	(*oÔo3<¥–7Äk¨ÖSΩTOÁÛ9XË/Pæió¨zdmsÛ¨÷ü
i∞∂<à+›P9V±_) `ü≥–/≤¶æ˝ß^˜&€¨æVÊt>˙äï¶Õ"Ú~≈⁄@Õ)I€øh^7ı£‡"`Ìd‹.∞ôznÊA’l¡œ›ß_Ü√0â:Ø‡1Ã{¿P
Ø†/aipTÊ•+Ã∫xÿÅ•aFÈ‡Úk\{ò"Ã‚erÛ#zÅ5¨ˆÑl®∆øÃÕ€®Ú|6ì%Îf<lwªnÎ*çq21}°Ã\qòﬁÎ5)§Òã+¿‚ÑÒ™5fÊ™Jπ9U+™éÕ´ˆõõˇ÷>bTãçr7ˇÌ ¯“Écˆ∫˝ÊÎˆ´ír6zm∂«9≥sâØ’H,+ÜÊj^+…ıÈ®∑õõÀ◊€"}F•ZWf¡-°å2k]9*n—ò‹vÁ¬joòÁÌ‡ÕI€U–n°∫oŒ≤oæÅ˙¢ù‹†.v(0„Úëûp*á§êC≥Ñ«≤ˇîküô„ÀH®˜ÊÓ«]ÏL[ò[ng˚˘∏¶ﬁÍ∆#Èf#ÿ|¯°ªî®ÂÈqµ˙HÈ¬§i8àÏtB ·ÔE‹ô§éÑ.Ô>Oº[<¬≥P@tÂ<àÆÇïÌ¯ÁÈøWÈEYÃÂ˝]Ë’†?Ü.€ÔBØM`]∞6O˘”SÆ±Ø˘µ¢vÄÁ%ƒ™ækoIív˜éwéÄÿﬁ¸◊§LíÙ:™eäÌ9#ˇó¨}ò<[Ÿ˚˝{—~ÛfÔàÌø><⁄;>>`øﬂxÕˆ_}uÛ?éWFpCá~+ífLım˚’¡;98iø∂‚S8q«◊#D“TÊgúiÓ'»∫÷ﬂ*@Hå	iíPo$*Ëòœ4|”tÃgwèÌaåÔn0ÏxˇLuìïfh#ügﬁúqW≥u.Èb•Èç€ógts.%ÂıæÔøcÅ⁄’UúQ∞vÛÌW¡Ê_ÉŸ,î§∏WV¬ˆ∏—ﬁ73«“î˚ciÖÄg∂ß;BDn˘ˇæp∂2ç°¿ø5Ñ)vÓ⁄Ûcè˛Åºª‡"ÁX±“7Ãì ÆÖ›à|BnπÛ@,‡å∞iÏÎ7˚;líb˛÷qÄ ﬂaÃˆ“qåÆdtß+'a2àÜºq •’ƒ˛0 ‰2H–2üêÔƒJ˙Úp>‰˝≠‡€áªo”æ¡∂TøúªWƒ"A-Ó8¨9≈k˝¯èìÆBÀtZç‚ÜÂs%∑5Œ¢7%Wﬁd¢:Á>óx—¢Kﬁl B˛` %GÎ°xoK8πLc4î3Ωï-∂?ú¢◊Frç?ÖÛóZáwS¸{§ÎíyC∂á\8ç1˜4z$„Œl£Òmò∑ÜroäevÌ o∞É.·I≤gúß$`¬Â…0B{Ìdò9eè„Œ∑dÇÖïS?®aÙá9‰nÎÿx:Œ~E)9ﬂ¬ÙN!˛>Vˆs§¬ì-≈05ÅX4JtòÈbÌd!ˇ˘ÕN1ı—GõUÙ=∫ΩY°_X©üÄóì$8ä˚±ÛÜØ—®≈€  PÃ<DbÅn*Ô∏∏∫#ﬂS7¯∑ÎjÖ?ƒ`J÷‘ß–◊b7Bsx(Å”´Øsóçâ€t7Ô”»Ÿß∞´?µﬂéëÆ[F€\jŸÆ◊˜ $¯ ﬁÈ±J'É∞˚ªÒ5µy‰ºe¥…ﬂÌ˙Üﬁ$¨mÁ_¡ùµ¥£_q6∞n7 L©˘æº‡}˝ìBøHæÌ]˛êÄRàr™Ë2†Ì¸Á-s%— ]◊Ó3Ãà˚={Ól§<âñuC˜9£≤Œπ≤Ò∫ù$¡uv%˛≠€Ém@ß–Ñ}˝√¡ÊlKt!QZ9_xëF"Û„ÄXoñ[[±éÃ^4π@å]Ñ„Nœ‹ Y•5ÓÇJ-¡ö‰w›ïu ¯ÿ†%)V£°"øízò$¯Ñt)A[∞ÊQ ïÑ√~ÛGÏeU,X<\»Ω$I§„(:¸•  éWEÓ¿’!9⁄ÉHà>ÉùÒj/éøM◊¬´^Ä¡Ÿ”pµé“O∏≥©<£¥µvxú∂ª∆búƒá‹ﬂœ9£›‘ Û§I{Ò
o´◊h°#‰µ&É@Mòœ∑ïïø”˜∆\€!ÉÙü'h∞√ÆZÑ.±√ûA=…Ü=eõP]uS!ˆÙ[wNhà‘ùOá{íõÂÙÊ«>|ÛNIõì8$_≤eæV˘Õ.˜∞8ºØ‡Ötÿﬁ¸ôﬁÉÆ◊Qßç@¡ø≤AÇ—`D^¯h˙°ÙÓb3‰¶^‡∞ày.˚wıQl0“ö¬w`ÁkcTiﬂµßNµ∂ﬁ)ŒÉ6Q´Â{.”…gnôûÉD=©q  ıÀrü€âBîÚ°≈gFzVÂˆ&ÃB8ñ-Ô‚a¯Ås.H 0ónãØ[6^Œù°øñ¯Pó9'óÒÀΩ JpG≤zÃ∫vØP-¡≤¶Ñ;«∂É['rDxêgµí(]XØùNìˆ<¯≈~ÕÍ¥©≤—q∑02ø.ÅÀ/7öL7Üt/OM»ˇƒXjuËj„j*‰QÀ" ©œ%≠π6Çè|Œ∫\˙è¬A<ı‡ë·n6‹Ÿf∑'ë&rò$íéÌ˙¨/ıQ§=ç¢Ò‰ß¡íüI,∑UXÃ	jIË%ìˇ–®Á™_yÖÑAﬂI9Ò‰2Ä€^¬7èåÌ—®]qnc ÄSw≠'3çIπªV'„íœÒ˛ê “ëv(TåM7f£ 	yd∫Zõ∑ﬁ{ Å™ÑçZO<`û∑@|`Z§ôŒëÛ&™RÜÒ =ˆ9”Åi‚Á#9%µr#i>Ú∏€/√ã˘t£KòHÙÄFòûjM“	*h(f•ã}∆ÿ•√ﬁd¿ÍiLä b{01π®u Z¿5VÛMÄìÚ(A∂áwıí‘Jˆ¢ÆCŒV{x†?ˇ´_±+›0Ç¿£$ºàÆ@Øg-›	’@‘ÅKœáGªµ,˛uÌÙˇjØ˛c∞˙˝Õ?≠ﬁ¸Ô÷@Úzù%ähÂ◊VM<—¢œÔ˝ß31¶˘Íß3·ØõÂ√jdÆ‚Û˜*º”`\F¡5h%˝í¡®XQ7¯S¿œu√ıI˙ ‡*-Ì•hr¬œ|ò3=ÍAìıAm”ôÂ£TPD4LÓ'˜∞Ix¥á˘·rñrÌVˆº¶≥^D√‹„R?f=•g˘–•#$ b‚Ö@ËŒ¥ÁπpJ'ùı<*—Œ"‚E3√åP¨>)’öé‹§b;•éMí°}su(^:Uúz◊P—Âó◊–◊©ó¥´˘W4ç^fíë◊=pŒÊ,!ï_÷E¶t`(÷„≈QÌ˜¥[ÓwIõx6ÍDıû¶dÃøc)x∂ä\õgFäórU1Ï_ù∞yËæÄ9 <Ò}70¬è3"uA≠ª:wá÷ZFë”V&§0Âq7H^’è÷ÄÁîyﬁä–ë±^≥@Qk4å¨Ä2x—zåBrt√®E1\=5ÃB”≈ÜñõÎ‹=kOß.<—Hÿîjë·-tOR⁄0Y4ñ©Ìœcmƒ¨¯⁄|ú%Ö!ÜõaTO¬¥#ªŒ"ŒíDÿiJœ‡úöRÍ3ö¢T	™∞πå=|ÉNtqƒFq*Í/äw9S∂‹!º˙\.xÏåHe<ÏÖå@õøWCΩ¿ÉπmƒøsNè›ÀﬂL'a€{Õr\_§ì⁄ÃTK◊ˆv˜O⁄GlˇdÔ5œÍ÷ﬁmü†I~ˇÕÒ◊Ø—ÅÌË`˜ÎìÉ⁄\8£˜/Ω»ÜõHÁ|˙≈˙¥˜nëîŒ∑˜u[ƒ•ƒÌﬂÜ aüÂ˝êÎ™‰c`
$úw3ù,Œ]¥!g5;L«Çºô⁄ˇŒÕˇÿ›ˇ∆ˇÊdÔËÕ´ˇˆÎ∆äÈÌ≤Ç»¬ Œì`ÿ·l˝eàVsín~DÅ¿·Ÿ‹‰SÁL®ÂSëÛó9 ÂVk°⁄5%>r;ÌìΩ/éˆ€99ÈÁt<€ºï„ô«’Ão¡áõ0/∑bË-êsB>Áa˙})ÉÛ ˆ±¸ ÍØ‚a∞ˆx¶˛⁄a0
˚üò’êÙ>;¡?X_˜Êö§_¶ÛúÁQXŸn´Ô¨æﬂÔ›¸[∫ˆ6LÜ—˜|$ˇ?   ˇˇ Îòj_xúÏΩŸn#Yñ ¯_q]ì4Fâ‘‚KF»%9‰í<BUÆ%%yTU+}‰&öI≤p“åaFj	&ÅnÙC?˙°˚©1¿TÃ<$≤ÄHf0è≠?©ò˘Ñ9Á‹≈ÓfFRí«í(!3úfv˜{Ó9Áû5…“ıœòÒ∑öıIñ≤´∞;å◊Ê¢‰*Œã¨ò[ﬂøVx	≥‚ÍBw„Œ@ª∫ µçÃ:›∞(ˆ¬4^Ù√N‹∫m-œYçııRÉ¯f–:YZÏﬂºgÁY:hùe›à—€ÎÀd/<[d√~?Œ;a≥Av>&ÈEÎ:â‚b0∑˛nogkck{u°ou¬¨˜t›:vªÏ≤µ¥ÃŒ.Z'ˇn)\~˙ÙÈ{vñÂQúãDØKã,œÜiG≠õ.Îﬂ¥ûÒ1›⁄ÿX6tì4n•YœâEùgyo+ÑÌaö∆,K7/√Ù>qì≠≠≥"ºEÇk∑€≤¬<√+,n¬¸"¥©A,LoŸ∏9û∞õ√÷#M¢0äY0Lõ˛Ωt™}ºò[ˇ›0ÈfyÿYÒb⁄öΩπı›xêgÏ-,Bò≥†7uÕeYıw√0 √(É À”÷Œ≥n6∑~ˇù≤B7ÅÆÊ÷ﬂ‚?,ËN€O<Hæ∆Épn}[¸b v…¨RÁÓ«ngÿÕX\Ù„NV5:›—ŸI˚√ÎÜgqwmÓ‡p˚Ó?Ô≥≠m∂πø{p∏¡ÇÕwG«˚Õ96∏Ì√∞“aÔ,ŒÁX?èœìõµπ√œ]ÿÎd≈‡ O:±	Ä+Jì†P’u@qmmç5Ï˛gÖÌ—8≥Lï-L3ªo∑˜∂6fôTv„˚NJ’}–§~ntwºs@K∑sºΩ˚ãƒyÉ§üÌ‚ﬁlxO÷∫?ÓÎÁY4¿?‡?¶≈C· Œ·6ø¶¨Xƒ˘U“Å˛é«›ßÌ0ÏÑg∞3)uC˝û≤r'Îı·lñ≥dõ‚ÕØçloÓÔÓø›8d€ÄŸ~˜n˚ïÕ÷∏ŒªÒç	√˝÷í∞ ç∞?g/,[=∞≤˘á9ÑŸn“˘ ;G¶@K∫·6,>PÜò"Ä+bâr»£N–∞µqv/‘ô‚À÷Öï1W*-‹ VÿÌŒÕ3£=≤'Ä∂Œ√.‘y≈Ê`]˙y“Û€÷Û≈EﬁE—ên}µ∏8hmŒÿö98OGIouÅO¸”ØËOπ<k\ûΩªˇ#ÛØè{Ç~GÍËx„¯›€⁄gá˚[Ôé˜e'*)6:∏Ö¸GIvÂú°∏Áa7öH6†ï
(y‘˘Ù«G-â}nÚ¨àÀı†…˚◊b'´W£ÍÃhoFS`∫ﬂ¸Üfª≈4xMA\úåç∑6ßÈ∞Ã√<b|4»:Ô√5k’âqÆû–Ó›ˇ≤∑≥ªœÇç∑€á«Œ’¿û[/IÔ;/Yı'ò”¸ò”§©ƒ*v√õ§ó›c>F˝O6©∑˚õow˛˝∆›æ˚O0•>ƒ¯yú√ÑoVÿAà•'9\)ó›Iv≥NÿM~ nÒ>S‘j;Ùå}’xnéçS‚æ>ΩÂ˚√òÁãº1W}Ô5öûCl—•^¥“…∫-†öikôUOg≈7ø~óe Ä¿YÓ/ÏnoÓlºE©˚◊ˇﬂÿ∞@1Cö1uuÅÖÓ›˝8 Fû≈¯Â`Î[¸äA‹∂=Ωıl‚R{—∑w∞‹√<DÒƒ}ˆÆ¨˝ò¿È#˝Äª{E´Hà¸Eÿá≈&zrùá}óæ√ı6ƒeXæ*˘õ⁄î$‚È¢À∞ºÂ3-Ä[Ï”bn+–Å€ÔË÷˘≈<¨ˆ“"˛˜Èoﬂ∑{a?∏∆ïú‚äÓzæ0ˆ1æ]]èΩﬂ:Ì-1=Ì6∂Ò7≈€†IŒΩEõÉ´¯r˚9ÎﬂzHΩ¡0“ÿDæ¢UºÑ]O«1C	æ∑œıç~ÏavÁ+öƒÄøPÂó˝ãÎ]"ot›doíõ8
ñõÌ<¶ì4⁄çy÷òo4«=TT±i¨ÈÙÏ∞+Ùí–çS[†’ÌÏnÔæ±uhümm∞◊˚Øwˆ6˙~¬uø`=î}Ï*Ó1¯_'åBÜBM<
}îÜô¸Ú‹≥Rvræñÿ ˘‰`/_ÎÆ±á`Ä2
¬gNÖ{çÔç„¨ë8$Õ⁄¿_Uõ@Àæ›xªX2yáüsËÈdgp∂Ô˛≤ﬁ›üS8ù¿ù≈E/ÉıfY√;,pVÃBÀñ€x∞m ÄÁ,ﬂM“˚ÒZZÌG#fì∂v·∂Ó˛î'a—:@V∞ﬂ∞ù¥ˆ‡ƒΩ$»E3‡¬≥‰Óèp’gÏM“πŸÒ›ü:i“	õÏã»Íôî~Îô¬ÃÀxsñ»ÓñµZ‹*yõß∂`¿GÆm6	˜w√bêúﬂ∂Œ‚¡ußúêª5‡#˚o√€8/Xë¸ øÙbÏ∞ íP<C rXè*∆°ÊéZÚ	π~ÌÙ—Çö≠fOàI›U∞ŒHëÚ"›]Ú+˜ó$Í~açI5ñ·îÔû%5!A/˝t—;CÌ«E‘üÈ´v7N/óàì«Ï*I·!ôXﬁí<wç¢·"uˇÚxâbUoà+>…q¨≥EkRGï¸€$MÒgÄ¶¢nº—ÔwowçŒ7≥b‡„3\9‹íÕVY†ÆÛ9∆õ0∞¥XÚ?l‘Å™_û«ßA ìπc˛cåuäK@r◊≠¢ÁÆì V7C$· ÀÂIÍπG‡ﬂª"ÃŸ&`ùågÉ∞À"ÿnÁ—b£éh4¶ÇÓNMçè7=ÄËÁŸ,ÚÔ
ìº≤UCèÖúj7#ƒ4y‹aŒÒ˚ñŒi°zj~}>?‰Ÿ
ÿú<‹ãàk/d(Ø*êût2DC	}ŸyxñQ·§Ø?1ÌÎáy»¬>∞ﬂ9RpZ‘¯&ƒˇ¬≤lÑ…M®›S√∂5Òæ5m$G§ÙÅçÑf¬(bi|Õƒd4zã¥π‘·"O"Üˇiç+‡÷QÙV¥«eq[ÏZK)TUÑÚÖ˜ZI√ı ö‡E¯˜8‡C–≥˘q…üƒÇ19Ú÷µŸå	A(Qg◊ü“∆õ€5*†ÿ˙"ÒËﬁ„k*
Á÷[-	6™„…O'kµ™4é¯72Òı[ m∫p˜˙U7Ór tøÓı€I4ñ˚«ü¸9Ï¨ﬂNaô«c¿ì2?–qg¯çLjö¯K‹Z•⁄ËŸvÚπÁÀ∏GóÒˆ˚HÓ<‘éÜ_≥Óı–ØYÂÔ}«öÒ¥Ö˚ŒJ‚ΩÇN∫ {!≤¯KæœΩ$≠˘j‹~7àJ‹Ê+-v=ØÂlRÒ8˙›‡v∫S{Ë≠¯Ô?ÀÈ%æ†ó‚øˇ9ûöS6xK'Tå~õDöU»Ó¸á˙<I£†áãﬁÉ#Jå°Ÿ6_Ò€.∞öça˙0é±ˆ4¯`˛—∏¡»ò’qF∑ÉŒ$vPô––?pRZó≠ìß_‚é |xx~/ø˜‘spêÀÆ/h\£0&qáÚ≤haöÈhÃAw®ÆÅœê9dQÇ~ÈööÅÛ@ÜèâCnF0¶3˘›è˝Æu}¯°©∏˚óXÕNØ…9©≥Ï,IÅ„≤˘õQ¿∂#kà»%Ã}c:&/≠ˆìsh≠„mß|4Hx¥¥Ok6ù°À¡c…◊4m∂V”∂øﬁ°l&Ïv°Å 9ˆçÓ jnˆËfŸ ªT]ªQÖDﬂÆÈbæ∂ﬂÁº“
)=vë Ïiå“≠@X`ÒfßΩ„€Ï^¯ê:·Y‹€Ä1Ò±·5Û2@óÌÛnñÂÅ∂bºL8É rbóaÉ¢eﬁ"≠ÿÇ|∑¬ΩÀV◊Ù-≈†y6Ù°Po≥Á¥/®]†è∑ÖÎLeæ#o¬/X‰Úµ‘≥©[ıÂˆ5¨x
gIÆWãˇ„ˇdAH[ˇÄu”†)◊/;ôf’_ÀUy-‰ãº _Æ–ê›UÁ≈¶XvßÉ∫eãM#üm’∑ pó»Ü˜‚Ó%‡Æ,O ˇä€`Ä¢⁄\Nòuπ)5¢8⁄wµªÒ@4¥ﬂ'oc–kº∆ˇ¶H§÷ËwÊXSÙ#,∂◊|;Ä≈˙q∞*L+ãà¨.ê√•ü»µBûB© 0§:µ>ú«ãkÁ*î€ÁØ!ÍHÄZU'∫™8”óF+ÎNêˇŸ´){©*Ø/+wU…ru%§Vï4óçß¸%«,Fö)Áº1Îú7¶ûseIgŒï%Ω†Âù¥Á≠Xí™Äa eômQ¶]íid Â∞'^{h¶<≥ùÄi·ZËüˆk!Ù—∫^ò “Eû§t®õ{gY¡‡»ÇS-Ω^xChm^Í…Î±4i)<h÷‡c«
öä‚≈w¿tÜyíÈú´…9*˘qqï„\ˇL¢‹y±_TwÁ!y|GÍ∑Ê∞Óã˝÷S∏ìªRˆioM û®ºŸ{/Ã”ËÃ,›[E;”jﬂñ‰àÙ;¢uÎØ,u„®ØJÉëI∫)∏xŒ≠ˇˇ€˝/U∫1£ìıÕRŸÃ6≥|„YÏR0*yßq%wt"h :[≈y®qßáç6≥YﬂΩW¢ ˇF&VÍóTc5vB¸o≤EˇsÌÇÍEX∆@˘¨Èf…?K/)-Ç,SG˙Ã≤ﬂyæ®´µ\{"6Yí•M™WVØN5$IX⁄Ë√‚¡Üç¸ÀÚ¥â"\z76+m|¯_≈Ú˙DÍ[ΩjdπRoÓØ.±è´7—ÍêHïkÄ&¸{°;î{Z”4coÀÎ'{(=©YPKÕX´$“ÚoídZ˛yÃìX6DQWKõ·CïúüˇπÁMΩÅYÕÚÔag8|⁄â~ësı™yï∫¯Wã\qÄº°D]p¨KﬂÓ∆≤˛øAq’'Ô∑ëWQ«@∏åÈ2gLïùÏ¬ó∆‚¯ñÔπ‚G’Çq
\w¨|‹§mfêhÌ®}È∑2Rmäúú;Ÿi¢ê≥lï6⁄V∆Ë<j´⁄!¿^î◊¢u∂T[î°‚˜Û≤¬òKÕ¯uçÖ¸ü‡Ûë~Q|≈(˝å∏–ì¨†î`öÂΩ∞€7?LËwEøº°I’‰q.	©*
˜§Xıç≠ÒØˇ˝ü˛ﬂˇ˚ø‹ﬂt‚(fa.“∏¿Í·m7N£∞Yãs&s`54‰ß ›M!G}[ QiÓ∫Ñ¨, ÷-'Är%OÀzpQí“f˚Óló«¨é∫=x[F’¢Åâ∑®Oª©j[…4
-ßBeã≈∑°ïO±≈ìÒìtùºµåëâõ)©˜K®Ÿd ≠ﬂ≈öˆGRäÙ©∑ÛŸ¢n;’÷·–ÿ;åœì.
∏%äö~[◊Â4Ò∏|∫Â¨©Á≠SQﬁ	⁄uÖPÃ’ÂåõÅ’* QWÕ≤s∂1 rrGL⁄[JìLG+˛0€›WUﬁê%ÙŸ
∫U*|ö¶0G7dﬂ¶HsoÖÅtFô∫Ìˇä;*ˇéŸÉÖGDÎñâí•”ôf‰'õ°ÃÊºõ]∑.ì(™$VmŸÊx ÁY›x¯ü–|œd∑ª∆®ñ%E›&OŒJ…‡ñøÆ¿Wn’äëM ål<ì0ïı„+Àâ˝*ñm1’¨<ÛT˛Z6È∏n=gó≠Áè?Ÿ¿"8ÿ'ÿÍL‚3`}Ÿﬂ∞•án|ïF>˘-O◊πıÅYxNÖ«kÅiˆ¶ò≥âdzd@ÛX<ÛËl7DƒΩÁ@7?]–ÍL ‚ñpÉ\sEı≠èé}vtZSÛπ34Ö˙ˇp5%Ç—a`9QP?Ω®ﬁ÷s„¿√∏FÁ|ƒ•ıõmiZL6H3Ó£œtŸºå™aâO,tV?·d–Öé˘¿sã)Æ´:· Áaqπlÿ˘’n^Ωƒ}íT±ÜïÚj;Ω∂ÿ>+S˜%ZËL‚X‡Ëmá…§‹¨j“™È∏«œƒÀñÏ≈ÈÂ∞Á\eî\’K'ë0Åky{ä	˛ä"ô…!ıC±ﬁ∂øµ}¥y∏CÒ0ú»Dl€
Û›†Øãµ—Ú¯Å≤H¿Æ+w¥∆˝"è⁄+"⁄¡:Ëªì	ÅÏLÅÌTÂ…q8¨µ}xQ˝3‰¨üô€∑˙ö∫Ç€<=åV¨_»ú›†≠À÷“3-,˛ Ï4^ﬂ”N‹E•€k˜àÀ.¢§œ∫q¥6*BÄﬁá«kù õÜ]ÿzJ3§Ä‹H⁄°mºQzGã•2ÉË◊ÅíÒ∞≠øè¬+òì%äŸé¬ÓZ@¬~°ò-à#@ºÈÜ!Tüs‘2 	Ñk¬øƒI„ƒ{,zwmå}”Vv≥($`∂ÒÀœ‚õ~ñOæì^°§5øÖBËq¨˘HF¬´JòﬁŒ≥a3Ø0˚À
?Ñ˝ﬂK*π¬6˙˝wXEXé’Õ@⁄k¶ªa^ƒ™sËˆ…ì +ø¬ÄPQ/IË˘ HŸuaò(®“Nw4‹ÜM¬ﬁºübOÊÒò‡™Ô°hÚh [ø™™‡ßì˜Î¡…{Ωj7#=™¸ñˇ÷´hÒctU–*Ô˜„îwX>ı»DJØ®
-O≥1“É0`|HcƒÎÎøj!ÉãÓE<⁄F*\@ÙØû°õ‡ üxà_Ù¢Eç∞Qã¸esIº–¢óä7ZêVÒ∆†&ﬂQ| éå!∆ﬂñ·6"n¶å/™!~7…hGÿ|√F´P†—oqõvònf? Äí˜P^qƒ"Ç)œ3Äd¨u&x#Ìágph€Áy÷‰òäF≥ÕÕíÇ∆õD–¿ïnÃC[aD!BEåì∏Q∫m!Î∆ÌÎ0OÉ∆6|f°p”ÏPR,zEoŒ#1 8s<^ ZJwP™¬c+≠4ƒ$⁄Ω∏( ÚÒò_x≠≠—±"Ïj≈€¸,çDÆ„)ùíS*ﬁ–Z·∆zÿÜi®G´´ŒT∑G˚{Ì~ò±,›|	+Äÿπd¡)‘-ôÉÚWy™¥¡ˇ¯≈^>èç}ÏÖÄfqNÓ'ŒN-C ˘.#CÂÄìhI{;â x4¸Ã‡[¸5Ø-\$ﬁ„/ÌΩ:UÙM<ïﬂ˘—¬o¯´|Ø¸àèß}|÷ªTßâ˜[ú"∆A•R¸ÕiÅØ ÇÂ·≈Bd–%-Iq £…∆zyñEâêÀ®†Cä«»'m¥¿K [ãèß°∂,%¿¯D0HléâƒŒõ®ÅØy€°˙ äF$$¨$^úR¿epoAnYπs‡“"}V¯>ı“”™˝µ¢e+.÷ØN{ÙŒl’¸V—¶àçfXæ(KiL"ñQèe	#é
ñ°ß=zcéKˇR1*S|(¿Tº;ÓÌ ˙Îıˆ‰Ωlhå~Òh*¸°GÍ=«Z*,ÍQ·<#‘4∞Tr~+[¨Bo(Mï,›4»RIﬁÑ›ÀmsRñ"∆á~°—Å˜’t≈˚¸Ω—˚§u@bN¥õÌÛs§Æ:—vi{ jäπ7ù∆(;ñD[Ù◊_JÚ›Í–5	»∏,í¡"c∏Í∏pù ØH cÏ∏ë/‡©ÄÈıBdMÜg¿¿√õﬁ0J^¯Òºg†™dπ‡ù≈rËRHÕÁY≤9…N6≈¿≈pa±ÙqbÚŸÔu&Ë§&≈∑»ÄDgnwµÁ8ñ)á·ó<•iXa‹†àç5÷◊ø1%Î•˜„eºLv´öœ∫BuøŒe|¬sL}Ô8≈Ä¿˚ÉÙÄ˙ÃÅz¬Â2èV˘ÏÊ≈å÷°”—XV1¯`µ∑ÜÉ‡™‰J¿Æ⁄4ßtB§ ≠¿‘PNî®˘=y$z^s«ﬂLPpîú‰ÿö5Ú†¬Ÿ`ˇÏ;X¥6ÄGû¿-HˆVjÈ9CtÇ{?ØÌ˘{¡1˚t¶U.‡r¿,üQ˘≥∂V∞≈BÌQØ&ÁŸSÎ »H|R{£Xsä#@B^ëp§Pq∑π4ŒV4Ñ±aß3œö¸ƒ•ƒ*1Ó6˘Ã”>îáLªîÔDt ∂ı7∆1„ (nªÎÅÇYŸ‡¨ÎÎ[ﬁî˛Ü⁄0⁄k‡ëgB/˝m–Ô~pﬂX˜“"º™!9†1…/ù‚.7,,%™£_∞¡òˆN∆xWéÀxÕáÿÅø\-æ¸LB∂tÄ6◊Oœ’
õj¥Ÿ{ó4∏jJÛ}w5ÊØ1ˆÏ]ÊùÀ„8Ô˚ßﬁW¸FCá$l:éﬁ$(Œâ#yiÖ¬ª@L
öEU∫Ädù˙AetƒqÜ”–ÎQ0£∑Ÿuúoéï¥…;V+âªhºÀ]Àq@AB(!!$≈≈åV[•¥Ö∑e ¡ıhñ‚‚∆4Mç]0óF~“n∑qÙÔyô‚:·úïæ˜èÖ"aA•¢]¿:o“∆uØh∑¨≠Æ1B%ßËXyÿØVY,¨.V¢oÖﬂ)Ç–pî†-Ñû˜VW¸tLﬂë∫§ÍΩX/U¿“á√Ó`⁄÷C∞Ë ∆Ñ–s\cÌõŒ$Œ+¡ùÁÙ{MDAù¥¨ßà§Iê*LV¨{Çâ3tåŒ	s"oéhùn®„Ú´&‡+ÖÅcÌ‡sÈÔq3bHÇc™û€'Å‡õ.≥ÎÕ,=OÚ^a˚ŒIí≥πœ5’ˆ‹+∂]!>›)˛ßèßÂØp®Œ—ò∂Õ0πQ≤ÑbÂ√≈ Â˚aRê˛éNªÑìu˜ÿÙ¨˝°ŸlÇ…◊M/@„lÔ¯{‡Ô"¿ÆÊÎ¢2öÁF7‡i`˙vû%0ã¢∏˚Û∞¸1üxõ£n¨úC∆µTø´¯º>…Çd•≠ÌËd›a/E‹{B˝è–:IóÍëï><“N-€xgçÑHñ$£I¢&w˚§äØ:Ü&åA”óÃsG”t¡¶«5∑>∫råÍ¢eõÅ±}ûn¥Ïëîá—Q=ZÿlX]j∫ÜÊxﬁX\â¯µﬁ‰Øí–ª∏¥ê´Ø√Ë".ïHBef®ê¨`ﬂ|zY?Ï W›z±à+C„˝Ìpƒ‘Ê:≥®aSmêøDm∂1BUsî¸éq?®5˙±wçíl¯BŒ£Çq'!Â”Iƒ+ë#ƒaíÉô2Ûe Ã∞ëV:‡3™l˚7øa´tH7ìº”ç•¢~ŸçÀ™zá[SÇíúVÿE’ÿ¬˙x2–(⁄£m‡Øª?fo	6‡-·ÄSs¢ ">~Œ>]˚ÅîËà@∞÷†ı˙∞—êãaCâäjBVoXXC9À≤n¶> Üe}Ö:ô⁄ºì>O@u√]>fÇ`®≤qºÛÌ>UÿŸ„ø+Å9‰2mîB®ÛîÆ≤è¡f∞8ôv∆≤s—È2¬Us,MHmòœYÊ,Ì:ª∂•E«æ*ÃÈ‹˙ÍAúvíÆW‘µ©∂Mø≠°sR3qÏ∫ΩÕ$ì≤i„≤svﬁ;l*ùß‘çı√[ºÑ£ÿƒRê(KüñDã‘ÓWïî*Ù%F<sSi¬U ZÖLÕâSN©Sı	◊ÖËE5‘oËPúíÍZ©9—ä)ÌäQ.îôîÏÑG¶>‰î3ÖN:√	JyÉ5ñ†"âë£!•ÑVSœ«.Õp¥BÌ†’2‘n=C·K3„V—‘~cΩ∏ı·ıôJC´≥¯∫ò;òÖóˆ#ºÓâì¢±¥fÛ•Œ˚1SoIZ ',{+[’Á≈9Á¡% %s÷ºıji∫sy1ıØŒµ»ê¿ö∑"ezPav†õ8ÊÜ©Åif`öÿÊÆiÅ◊¨†2Q¢´ñ¬][7CÀËZóÚöÚ¡sM)∏Åøï¨ ßU_Èz˙∂H–ù•óq'â≤∆¯É£Q%;=¥”ëF(;Âs≠A	∫≤PJá√¯ ∆ÄÄ⁄PWø9ﬁ}Kﬂ∂ªËr7P≤J∑[`∏Æí¯Z≥gqﬁ◊€µ$zÒ√ÏZÿ·ÿo¡'lÉkâ√z”B*´µ"_π¬7U7ç/∆6/3ƒÀXwœxe ]˘Uòdå?¿Ω!o¨ÚùiÎ#Ó‰xJh(bâÏ◊ﬁ≤(u9óí^«+bﬂ∏Ωﬂ6ûcwÛÒÔ9oDŸ˚·sÒ™}≤¯æºr?¡óÊ›ﬁÆRò·cŒÜÁÁqÆê6÷Û<º}MJ$√ã£M%&˝°HâP¸C∑∏	x;Ü*ÀÍôå¯P∫ÄÄ,X•fî]›˝ÿ≈–ú¿È·ÅßL[!:√ßI˜2l3æ'!
<B¿WÕ"È⁄›èò¸∏L¢êÚù‹˝	éÒ›ˇìb~ÆNK√≤≥<πI>íµu3øπä‘iÜ6¿8†≈Dú™ó1¡’GkÛ¥£©obΩö#9eïKÃ ’≥µŒıbö.Ië¬¸˚arïÀ	;÷æÅùó˚•÷p@îÜ›n	i<öÙ	!EGqíçk2ﬂ[ôÒàîÕv¯âï(±|å≥˜Ä◊˝&$˝\nŸ)µ€ÌºíiÕMì∂ ù)MÙ∆U/q¡Õqë9ıœ‘l™PXÏı∞ËÑiLY¢}ñiË=Z' ¡Jr.Œ-g7lSî…Yö]e,@áÿÕ,J.24@ÓgIA>≤{YOÈ
uÒ
ão0{@t1ìQ^Õ”-dûXêÜÖt†K>G_≥›∞Øtƒ¸ﬂuOA‰4mÃ∂¶∏ÔSK@#≥µæ•:"à¶–„ÿ6|)T–∑4V5ü˙GËØY.	Íø’<Îó¢XY{k µ†í\Sló†#Ôèy∏É,k¬©§z'Ô_:Ö‰†!1öÂI≥i∫á∆F]XX?ìŒ∫ò
≠Z\CP9ÀÚJK¿ôò7ìD€&∏˙?¬√YÆ˘_Û&WáQß¸;≠ÛÖXÁ¶µZ´¶¶±ñÌ˛∞∏¯zj5Hæ£xCj;«õA	áVC—4c+œ—X©êªgÌ^¬ ﬁ÷=√‰#ã:“°é)x[7ƒ/y&1¸…;»Å´«PµÎRÆ‡ørú±~Lnä‡∞¶ù‰<F˜íbÚa“3ÜÜƒ(˘∑jπ/M†Ü£Oh†œ™±>ú1¡˜≥V∂·Ç"BpñG’Â∆…<V÷Í⁄`tè;"µl¡Õ« ôâ-ÅëS9ô:ÿpèÔÀr5FN}€≥Œ¡:9ŸRS¿–üèå≥Z ¯ê≠¿òá3—Œ±–π˚ø∆∏âó1Ÿ†ºê©õó¸£%Peƒƒt-ò«.Ü¬3(é.óqJ]8πá¯J”¶Ÿÿ;~‘Âä+◊ä÷I?ÿ˙j)\Q¡ózò9>ﬁ“Ωﬂœˆ√Tho∆¥EÅíAÅßy≤6¶±6@¯⁄˛}˙˚ÙÛë—’X¢lko∞óaOpkÿ»äVGŸ7--6€ﬂeI4~ü6öc´QåÑÒ	>¸>~é≈⁄µ`v°ã§0Â :á–7ymÃﬁuÄ.Î≠ò–Pë=—∫ûM$¢nb≠™ÕTÎ&≤˙Ã≤ˇï¡aŒ˝Êßt¬ª…073ÔùFl[rŸ˙Í≈NÛ´p…„‚rÛZoDÍ≈ä~íö
çÁZ.C%ËÁ<WÌ∞d»ã/ïŒZ>#˙˜á,Î¡ø≠Øû≥hòá‰Á˚\ã3S´≤fΩhÖ~#nÛác)`XŒ—=ì˛ugé«dˇÃp¥C ¨^.ªâ‘h0Ùì]⁄IÚ∏ñúÎ∆KEˆ π∏Ë.z°DmW‘’h ¡±6Ì$W‘,/;Ó _£dÅíÆ…H ˙‰.óç…VzΩ ˘⁄æΩöÖ@ç¨˚dìãEcóTƒvöÆ‡M÷…ÿ◊˘›èÁòë‘x6WQo∞a∂Ôë«1–ÕnÎ8\S E8Ák#]0û˘¯nM@„˛`méÑÛ¯_Cu'¢üh.∂∂tŒó€º":@Èö™	q]˜qÆI‘À†æó?h˛°ÚMŒÑX∆'Õ“]˙d!Ø⁄,b¡ø©¢£à«Î÷WP†•ÊTh¸Œ—ïy∫=j\7åˆÚ¢XÆä¥¯p”\yÇËºÎì¢≥0`ö[Ë`7g⁄.xì€{c¨ÂLﬂxƒ(Ö≤µÀÊÑ¨Ê>ºÜHï2-%¬Œ≠÷Ê}j¢)Rj¢iNm·ìi/=Ø´Hì“FdÏƒê˛µAïæ‡÷éne◊©;ñΩ”a3·Õû õ≥6¬<Wc{´GU:πømúﬂñíç«Î{(SƒÜ|q 4XÛ9æW5NzQ†ÆvHm=UËÍ◊Xw3Ã#”Œ„ÖK’OÍ^@_Ÿ∞œ0Õ+ÆYm¥-{¨·∞‹C‡gYøµ»r‰b‡ﬂÎ÷Ú38*ÀœÙbdànırÃî⁄B‚øÃG–‚ß†@´ß÷“sÚÈ'ÍŸK÷pi—I®Ì∆+©»;˛‹±œ©b´Á‰û%õt3∂MàbGn3¨=ABÄG˙]È‰ód•N∏ê’Àg>û‘ÀáŒ≠è|~*ï÷gp>iÎ◊ë1BTZ4ÅY|V∞CAÈ= ˜gÑMƒyW´2ú:|˛qŒ›˘ﬂıΩº¡úû3Ó‡÷0t]b“w©äM¶ò•ãìqŸtÇNLçŸ⁄er§É-ºHxFh±«Í›ç?T/—âdéù\Àz“± ìBΩåªÁF›õÀ≥"Ãóﬂ∞ìØ«oqÛá)=˙F±Ë⁄0Í6J∫jBøUî+O±É¨∏Ñ√˙@º◊E¯ı47∏ÒMU'ﬁ Q6õ‰2Hõs¥-WqÃüŸ«‹ä_h›ªß∞U∆ıÇá6Úﬂﬁ|Ì ÖM“÷5‰/=aYWÈé"òÓÂ16„ÿ£ﬂT.¢)seîSbh˚é4%FWÖOr|FÃ∏I•ÜŒÁ«e≈¨\˝ÒW˚4Ä÷˛L _û4„÷X…ô≈Ñ
_¨'√«Õ*∫ƒ„Ã*YÀ¶*ö»S€ôàgA√ø]·Ùßä∞è<hë¡´,!âY5˜m¶G00ÓÓz‡˚πı}Ëß«6∫Á·Ÿ›ü0q=HˇÏO¥mµçZÈö∂ë”¶ºC\‰öM’¶ÿ‰öf+xè)⁄&_ØöñÖŸ<4LñÛæ6›Ñ‚”Huîl–õ2|‰qz¨ßz.	ƒËÖœe)û"„9M†<ïzÀÿ‰Güæ0éyÔ¶¢QÛeõ7Ì∏Ñ≥M
Z'âπeRVLûPu5A¬Ó[jó∑Œ¬__xN∞πñK∂’fΩRø=DﬁRP3≈Õ⁄›ºÊ£˛TË–0%Ωûw∑ñ-V±Ñ4≠lu≤Øñ-Ü∂ùµÿYá[◊0›b⁄Ë¥”˚rïëT%´"˚®s›2;{∏€ï€πÓ˘k˘bM«.M√†ÿ|% ã|hœÕråﬁUòZà]ﬂég˜Í}∫¯zÈﬁΩ´2Nˆ}úºúÊå√ı°o› ïcyTß∞i†¡≥ÆSF≈ø¿-ï˛ÂÓ8xuù[«Ë¡4=%˙™ºßOÇF≥˝øú£§∑S„Ê◊T¢»˙@@?‰ßs√˘¸“º¿¶úá„fÕÂgt≥'Py~¶eÏ·7™•Æ⁄=Uºy\	ÍØÅd˜î’¶k1+¬Uê—ÏìúhZ”1cí∆ÄΩΩ¯eZìõÚÿ’:¶›∆1Y%A5K
úÕöoä\~{ßÂ‰¨∂ÑQÄ#î|‹ãøTÕ
˝Ú\/≤ØŒW~cóú˛àr]%‘qœ^©›W˜⁄Õ≠op[>ó˜≠Ë©Ç¡6BÜë˝∏¢Èz=¡S€/À’XåkM*ﬂJ$„[ª/ß[;º€qÂüFï ˛©WªgE»°+ª®Ky˜…&~˜§M.z¯‹9WBZäëBAø∞	K3â÷>kIm`“∫º˜v◊¬∑•…n’©°<®KQE{i‰≤ÅUdßã‹-ƒBÌ?≈%˚◊ˇ˛OåZ˜Jè	4¨ì±HS9?∂OY›œ√‚¸U’™V ‚Y/ºië6E©fnπ0ÇRıZE'œ∫›≥07§tÜVºíQ3ˆAY7æê¡t´¸⁄¢	1ˇ˙(ÁŸï
Œ\Ò6jI1™àIz%[]€’D˝@ıÇ.'ÓﬁñK≥—Ù5—b/Ë,Ãz=©‚ükí5˚ôÕˇ/€xEã©ÔÊÖ®ìﬂä„≥7Pü;ëtâÑ;ßv˙åC˜bQ7≈†ª®√cxç6û-‚Muó«˙√«j(Æû?ü~¡∏?‘O∂^ ˝jŒ :`	¿_8âf^∏Õ.s9Æ⁄ö≥ÁıÀV%^Ò*©∆6‚víxrz˛b2r™MÿÏa: XíãS°£Zïc≠úàÜ§òq©˝‹'d.Û”◊&¨QQ*vîKóÊ∆¨√‘i=ü≤∂‹k»?[Ît*îú§D’Û^ÔC)ÉRúÑ)ÇB“”ªXû¡õI®*ÃÍ≈ˇïL+Äßã¿'@’U}Vù:Tˆ“Ç^t≥|ΩsBµŸ.•ÿÚiU˙B7’ ≈eW(F¨π}÷ßZ1;“≠ZmS{ÕhÕÎQ;∂∏∏È“±¯œöß{ø›¨(Ö9S¥Àµ/…p’Ï=êË™wÀÙ*¸OÛîJ4∫*ñˆ®Ç*_ î\9DKñ0™ﬁQi"8.õ“bï¨çå¿%∞|‹ÏË<I#n=ö¥ ’
†"ÇØ∞˙G'Fä qzêL¶«ÒΩ6X´’bá˚[Ô6èwˆ˜ﬂnÊÍÉ‰+¬6˜˜é7æﬁﬁ!ò…W∞ê6œ ∆˚:GÔ˛a!¢ºI∫\ü€M∏C/©_Å“áüqY“6ØÜ!=sûá<(‡'Â√Qè““Ivsíf◊<DvmƒÉ‡+ÖqD€PDD≠¡MjÚ+JüâP ûÇíÛÅV¥Ê–WiQä≥å@‰ùnÊ™ælV^÷£oD…˘˘ÂpBŒ›pp	˘â3˝∫üÂA ÍaQ’¢ËÒPŸè÷8‡!Æ˙öﬁòﬁ„{±hDñ—˝OPÀà)NÃ1HÍñıëÎã14€˝0:¬qÀÛ¨±#Ê í•DœûRÖ dNÕ‹J¨8H˝Ñ	ñNŒ∞yB!¯19ƒ
πSqá1QK=OÆ<{¶§ç(≤ì%ÈØÍ„  îÌe=ÀÖ~◊Äπ>éª1Ïº™!üÎkÌfxëu¯SMîÁ>èœlf∞z˚âWöJÛ`¡Ú	1´¸ÕÉ•J£h4◊„-ıf†Ò§(xˆ´é ™”ò†
1≤øaçÕª≤zts+y_Xzö´Wˆƒ‡¨<JË5Y»∏â'çbÊRlÃR˜NaÿiƒÛ•4ﬁ´¥Kÿ¿‘©¿*</@u&ÙÅ(““3óÀÏª¯>Û@\5èFyx‡”BÜ1Ü\îy$nT?∞…¡7Ÿ0/õäˇ51“¿Œ—æ?‡,Ç÷§±ÂÜ™5PG8†yÍÀ‡M—1)9«§te\π_π2«CspË€!”p4öå\Á∑%8ÇaÓ=%‰y/pìa6ﬁJ..òÒ®ò÷ãüdäV,¢	O\_≥	Ó‚&¥
◊zM«∆˚:Â˘@ÃqŒ;•ERIâ/Ei7\_èê#ïÂx≤≤$?4©T;˙Í´{–Wòv\åÉQF≤1¢˝UF≈sàåˆNBÏ©–ﬂÒ)JÇQÎ5≠y?KèÈPëXkv˜OË≠>4^úÄ—Öy’BçGFdÂ—„ÄóH0*7‘¬ﬁ˘É[åüˆ1.ßf2Å‡Yº±Í∂q˙•~ú’î8T_OO.w9ìwYD"%¿5Ÿåósû ;QrÛÊWt‘¡Pò’9÷oâqò¨˜É7›=ÕtO≥§XìœrYG:"ù
æ{EŒ∏<ˆUaÂY$sd◊ü«™àˇYÜ+ÑÖÑ0^5Ï˝SÏ°'(‰$.(ë3åÎKìâsr-nÛ}Á‚nëkt‹€(ë¡‰F,‰°5[,É∆ÀPcÍ…j≥
|ÿì5ûHä§…
€ΩÔçspÜ¢k/_Ò√G"„¿-©R…ƒ!B~éfU√h‹ª®]ñ√$ÀK;›h-¥€mß®’yo∞õ§põ∆´)y¨…SßÖVˇπºkhF/Õ/Î˜hUŸ®Å7wﬂï˙Éä”ÒÔUmº›»ÉjŸ‰TÁPFÀun«\ƒ™â~uø◊¨Ò©«¨—k~o[o≥Œ›?Û,§^Ê7?JÍÅ:ÅBv˜#‹Út?/=&8h+‘…£5˘∑ò&ø⁄ò&õ]‘‡‹/¢âGL™µ¸SF4ëÇ[çlê·: √e,_¡iÈ÷Ö.Ñi∏Ï§L=.$9M€<e
∑}˜∆AÇ∞Òzyè÷'‚jî¢kFov4q∑å÷h¨p|^g ˆ®ˆ}€pÿ∆Eñáñ±áœª∫˙HpHïHiæ§ªKœ‰˝”≠ƒ1ÅÂÓ›üêª 	MÛû´°ª©ä5Q$=(YòÊØc]vëÕë@Ú†uQñ}Ó™hº‘Àb¬ë¡‹Vö∞Uë2”mıÚi5£‡[8}≥}ßKÃÎ©·Énú≈PZ2€¨b
è0áŒê√óúœ<Oˇ∂lªô>CçªkúWÔ ÂÛ˝ööÌR˛Iö\Ão˜XM«LÉ´A)Bì^7\HÜ0Ú·¸_Ïs˝Â¯É,§Md—Òé\†?wÀQ÷"g‹~ãLCù©¥tbü]ÈÑ'‚ë†ì®TòL%EØ∂°øhªaxI(kø«Öí≈áãuı¢Jy?—Õæ ôAS⁄Oqàg>¬*`ëk˝^^º]kö'⁄-·ı≠ı9÷.?ñc≠Õ]NÌyÍsÅï"érf6Ó77o≤⁄*T°¥{#¥«`Â∏≠ﬁouFD˜¯hÓ'Arn4èyÕCQTµÛZù«Ê–⁄Ωõ¸8NHÔU&R∏+7S¢85.Êõz&uûnBYé…dóÍŸ&˝üD?éß€≥:O∑I(ﬁFU˜*€©Kø∂˘˝π<™$Â U^6K^Ù§3W—´	ø"i‡Îˆ.¢•Pnøµπ=°E}Ã±ê¨À:√BFZæö¯'RÂ5!Íâﬂ‰‡ òÜÚ˙PF* XêıiÓ›Êú6åcÖ'¥°ò9?-Ö€ï”≠1yÆÑ3z3¬∆lﬂ`ùAB°cbdïÊYñﬂ˝1‰ºØ.F)-ÎóIh˝ÃÖr∆xoãŒYå9}†7¡éÛëpï•◊Dænù(eÜø®f4È1ˆ€(ÿó,Ñ˝∞@Ô'˝}•Q≤C—Ô˛àñJi»2äˆÇF}õQL,L:É?D≤®àÖ¢´Ñ(t¶}Gh)x∫∏µ}àLNÛ∏ü%‹$•d-Nëﬁ–+¯˜4Óù√ßWY˜J)<ç“˝<ªB}æ'€`ÒﬁùÖæ9+Â6ïAO°X_„¶w‘˝v„ıˆ€#ÑÃﬂNU"9ZÛ¡™Ùk…ZƒÑ°%∫¡ß\1c,_P¬∂eØÙÓ[´yzÕMrÁô\$Jı
?Â˚r¡∞∂∂zfr˘Ã.ÀEµ◊Tˆ3»ÿ∂\Êy	}õ¶ŒÊE@»‡´(˚Êoà.båæ^@Å<"¯<¶I◊NLUO∑óBíönú≈˘ √>bjÅ+∞»æ¬N°94≈ í{C∏*QÍ*6ç	ˆ;Æ2ÎØx≤¿ø&x∞á(,‡±^8ª ƒÏAπ^\Ùx[®#$Yåúì.HÊ0A©i”Í/‡z∞…u1s{'n‡∏πˇvˇ–«é†LÚÇC)üŒ.JÉŸJà-4œ\ZQKe=•˜ÿfYñXêÁû#◊t≠i%'≤öÊÔÕ¶U≠È™Û°uë§Ëê·ÈC|0;/+'Pû'≠ã˛0Ôw}+$>ò]àóFÂ‘ö|	—”¨¯`6+^ö#◊N∞÷pÁ6L=Õ“k≥QzUµÂ¡◊⁄æçªËè‰∂.>òÌãóÓZËBk^ì¡YÌõ_d∫ËKÙ àFò4¬ãx3Îf˘>fkËy«4–OŸâ(ô{˝C€:=ìms
Ë	OyÑi{;T"¿EÂ†i|C…ÌnÌnïD8–»eì(t:H.¬ÇÎêC“
ëâ]BùÏnnÏnÔÔü¢I˛·¸†éÊ}ü8=ì4é∏Òò¬I¢…bZqqÈVûı£ÏZ0kh°ãñôªîåˇé#,wú]\t„#z√m´?∆∑Øà±{)ö[aGa7∆ÛóNÀ+,pJÕc÷çêV’ÿ¢´,â^j#y•rÅøTc“ﬂô£É/∂a6Ëòuì˜sû≠‡”añïo»Z˘ÄõÑ"ïO˙dw"2ÒQô@q≥ZÉç~_¸l>y©u`gh?O$,N„º.Êùg*fº&ÿ¿X–[yxqAX]ÿJ£ﬂÕYWö·,˘¢¬]íÛpS‹ÎáÛÇ4È5ÁUDÇsÓ]ﬂÏœ§ıü<I∑d]?*∑¬6èé⁄«¯à$°LÎ•J4ıÒ#W#M© Èèy_
ˇ≥‹' 5„œj›‹ Ûjâ^±π0p=zŒ…(ºË4'yd•àP<¥¸Âí†¡©YÌ@-∑neZ(Fiº»|∑a:ôì”∏ˇ9˘˝+u˘@E\æ•Í0ÌO•‡ÄØ>Yj/~˘^º˙#9âØó!]Ú‡5S®ïù◊FWÆÓÇà˜Cº∫»√3&2xkØŒ`›<Ì≈ËI5áÜ≥∆jÄII≤Ë6¢Óç∆MêEçWUO"Ã˜‚sﬁñ´V÷Ñ»⁄Jÿ:nÛ6kÌ/Ï∞zIÅ^b@xŸe|¢Uâî¢*◊”`Ë∆òÎ[ÔW˝ºt§6§∑‰-Ÿ" #g¨ILY¸V7/„ŒG)çZtÌ4ˇm3êô-|“¥∂+µOŒª⁄ó	Bƒô‰~’qæ'¨hØ√ná› ∆v8ÕÈU∫"!äî%…‹˙ø©£/∞[/ö¶$0‚ÃpÄ=	g“ ò4:´ëy∂Ù¨ÈàÇ+√£TheØúëÈû™pÏí‚òª∆W-£Ω#ÖbeÜOïU#·	zE
0∏¨7yh≈∏«cµ7∆µV&¢mÙr@«ûË◊Û«Œˆ_KRä•{FÜ;|i~[ù†>Npæ®ì@Yxˇ∂µÿ∂¢≥õ˙+YÜ\(ègÓ®œ„7Ågä∞LQ¥∞ªÀæ˘f•◊kòQ,?öc¢0˘zÕrëª¬L›¯|@≥%µ∞Ãx∂:≤∑Ù‚ö>_!⁄h-5hëwJ¡g=oÎj™<ˇ≈∑hEp∞eIÕ6\iau\Ë©∂cFAc∫Sä∑·xˆÄ¡/»TŒNT≤3÷ÚàLGæä.ÉHûﬁí™˛ïûÁ%µ™ås}Õ∑Ô3xi@e∏≥^ƒ˙]îªÁ@≈º8H”±›?–µõºËŸbuÎëvÒ‚h(Ú¬êq°πñ3KH≤tùftËë.N<I¢˜c–È¶}bÎF;4∂x◊sÀÉ√⁄Kï5ﬁoÂ†òˆ∆∑ˆ•œ~ﬁ@ØÎh›∑Â≈∞–Ó|'Ô?˝›FØè‚Åêû≠OyE¥ã¡yI-?ÔÑ˚§∫”%≈>öããŒ∑œon"W≥ÿ˚æF{◊òó†æ~+C9bAcC=7‡7YN±‡ñ!ï|ÿ7ø˙\˘QÆU˚2,JK=Ö±˙π2p˘îqë|.öÒŒG”L»8∞ﬁƒqv¿TgcÂ]é«˜¶5·K`iÅÖR≠zŒwWR+beK´aÛ·pÍS"íOK"9;[o›≤ÊÌ^\P˘Ã>≥µ∆ñNy‰√æ|5√%¿óLÔﬂÀæTÚ$ ~¡bDƒŸÛ±>Û§ìﬂ∂üW€gÍVIé≈íˇÚ`)¢[à":r](RNHÀ§~:≥JóJÍ|ïdB;8≤I∞‡∑§-ÍôB–adVy˙^¬ΩÉP&Ωt˘\∂Nû-r€xä™u¯N∞¥∏xuŸZ^Ã„^Û˝1 KπG·¢∞ÑÑ›ÒHM#á‡¢ÀË∑Nê∞*%}B§»7im‰GY(BÀ14<p+√,Å	øMä¡Oøx$>s≥).tmWÈ1qDÍn;ËYæ;§}mdøkÀ`AIZπƒI	“∆*«ÙgÎZ`ö%Z´Í\%≠¥ı"úπÈ£x˙yC?∂˙6ºçÛB˙ä|Yü√Õ∂ª1~ñZˇ∑§bÌ†~(ÜÈ	Å©b=TFŒ!|Ñs§ÎÁÙ˛'’§∫µ Sè(Ê∏çfπ'\‡Ö=¸'∂|ò]ˇõ¢·'U4DIà‹†O$Ú å.$˝Ü=E5j÷“É)±Ütë}¡^®ˇ,?k6EË™r! 
Â©i∞j8l˚ÿRq~ir¸
‚Vg+È∂2ÍS◊iã˛Yy\¨ª∞e´Öäxdâ∫e£[£nêdN -Ö≈™EÂ$Â¿œ!7w÷Ÿ‰ï?•,‹Ö◊H¬=û∞UL∞IJÚVwO≥,‰&√•©%lŒårqtCT·‚ßÉ#	öEÓõ#_^v§‚SÆ¨ä?≤@€‹ )ƒŸæ˚çq6,ˆΩ⁄oê»2±%>ëµyBF7Éª…nËpy^&	—Ω"Ú∫É4õÄ|§¶ ÀŸ`Ët|∏q¥±µﬂ0ñ!;Ø>Y*«´œ ~
	˙Ú/P~Óü?Hz~/¯O"ˇû(˛6§ﬂœ¢¸Â¨≤ÔÓ æ_†Ï{π"ö¸O!¸6ÕT¢ÔO)˘6Dké‹ªÊ2cÑÅ$C”6^rö‡ènòG%#'6ê~Ò5ˆC£6b\i)À;<“ﬂ‘«lÃ¯e≥¨R’˝Úπ&
#ØE…NµZÙL≈ç©6ƒ-Ø¡‘Ao¨{Ç®¶*v1∑◊— À!Oπúy?œN©ﬂSé>≤SÃØÿ0ÉÀâ6(tçÍı˙k1  @¸ÂäzE±9º≥‹Jrsö¬3œ∞Ë–1—„Ã0JÚÍ	ÚÓå…Qœ˙‘∞å=/sø‰ØVòoì ∏∆ˆ˛WÄ
çYìˆiû]…ò~Ó0`=Â8åEÙå@.˝lC¿ÖtFp¬Õá–Ñ’'ÍbÕ_{+¢˘i_±ëÀÜê…î“á¡∑‚¡!ﬂ√(œh~dΩIøH8Ú8Ç„®’ª3r ∆K>&íDe0…˘ ¨ôdπü∆"Õ∂ó4Iw3©ØR;¿ÉÏn[/=õ∫∏Lçé]—“‡H=÷„UC˘©Í—≥IJ≈‚:âS‡E†Gb>Iä◊√ÓGåÕ≠Â’_’$)é¬+h^÷ò/Îõ8ÉRoí∏+¶ÚZ=’8‡¨›
IKTà["ˇ+.≥áVÕ“„Äﬂtº¢anj4K±ùL7s7Ç>‹ı¨wº≠Â<J Ó2¬ÿ·wí&£ñèJÀn$ÿâ1Ê+Ω£(–B‡âSâüDt:-»€¬”TÉ«B5®yL-\‰√~ÜR?!h˝.ƒ‘Fa∆Ä©Î —˙ë¿/Å2¶T~ÁØ*÷Îk≤
]Û©®i›4ΩÛÆ.¶å§.ô3ë∆ ™%áBp≠ﬂ;ó¢óÃçMµZ\“⁄ΩêË-ÍU8ÁúÀUœÅ∞Ï·O¸©›-6±ë<L0àÓÏ:Æ∞/I?o5ÙwÒÌYÊQŸR'‘ó§pºæé/^≠É,ª©J–‚g2vW8Z0ü„GW«öº¬¸‰Ö0∫|°eeä‚óöò;‰˚G-ôáqö&T¥x–Ë4·¸üR¶f◊Õ≤¯ÏQìeSOÓ´€BK≠…C'ãvd‘d1§ü8xÚÓ“^ˇK(ôZÌ¡◊›NCä˙¡	9:Ÿ]f(±èà˘≈É}í^‹$ˇ6B3#o=ñpoï0ç…˜%∂·@‚¸◊‘YÀ¢ÑÉ€Ω›n˜Ámb§&Äánv¿ÿÙõ∆˛Oåº™væå¥À{9-únÙX®öÿˇ3IDD,T-æÈ∆<œ0U‹˝˘
 1ÎöKW?ˇ4Àe TÈT—êw\;ß‘nCX˝¥@w«î≤qàGY)lÀ≈Ûqp?! 6‹©1Û<ƒXDaÄ±L°áQÍ(Ûe#∏±≤~≥®˛>\ä∏©˜Ü/ô?ñßç!çêîı√.ç=ì.*0õœ+•“"PFcÃ√7Œ}n
‘`ﬁèÁ^}–ˆÏI93∆´;q%ERç9ÙÖWB.N≤bHÅ≠ ¥/ŸF?◊(õΩ|Y	î≥Òa„˘)9/OõÃh)ùpßâyh¥iVDj/πMSN®EÆ∆wm∞ŸäÍl:»ˆ„.∞?1˙ÙbõÉª!Ú	1>mò{bºW˝˝∞—ÔíG.ªB4p˜«ª·q?Ÿ%M`Mä“n	§öŒ⁄\yπñ*óExãd¬qËdFÆ∫„Nkñ±)€iõ®Z®¨EõØE_˚ù"≥Íö(ôàÍ`˚gP#®*œE≠ö2ÿùêΩÔj>Ú√)0ãH√ÕAÍ„O([Õ†π[éŸµÕÛ§§òüï.à!Ò‘"ûs°x®fı¶Î—Ô5"1ö@&ä∞{Ö4¬ÖÀ^‡Í%‹Wq§§=AƒsçäOG¢ÂÅé2ÚI⁄È·ö"ÃD%o”∑¯Ú2ú9Qsıd°∂:|Ò™Êò	N °≠o~◊˙3Pb-îˆ©¿8?iü')f∏¢NtÂíËc,Ø, ù˛|Ñ–˜J⁄A{∏Ç¬vNC/íK‡Opµv`ß≥'*Qµi÷ÂŒîD0SÚ·ÿ¸††%º†Ä—Hƒ¨ﬁm„≥åï¢⁄x…6∆!ßƒMßıÌ4≤⁄Ü7eÀÊµÜ∑8Oˆytp©ööê1%—päuL-≥	qÎ6eKLâŸLVTÕDoêó7õƒ˚~÷P0\LÜf^ˆÅ‡˛êÑåÓª“Üª…≤°^:"GGÏp°
!òº¶6tú“ë0_”É¨îãò;  @ªÚ€J›ZàZÕWS(˝ ’“áäZÎÈ’ëÏâËÙH.òD#5¸ô^ﬁŒ©u?f§n4ã}ea∑∆Ns
Ììå»ﬂ∑
ò5Nÿ"QãT*vT‚”µT”	3-)ûû•Æ/¢=ªyÍºÜc›†∂W◊ÿrπïÍrT\Ñ]π≤á\”åâ¨9ÌAˆ6ªñÜ!⁄Ÿ¶*Mª%É{«.Â∂Ä	˜›õH√j∏<éº]Ék»“⁄2G
å¶Yé‘∑j  1"ÖëùàïBôìñ!°‰’3]ç§Î‹ö&—;î'g¶©û«‚ÀÍz™–íQ®¢•ñ*%!Ó¸\O˚÷+™BgUÖ,êÀEñRŒΩ‚ΩÆ∞˛´Éc’ò|po»W¬ÿ ©«b‰ò+UaSS8N:ﬁdEØ:Y |{@Ç 'C¿/ G +ÕªßŒ¿Ì©ıXÊú¨‰ ü8=¿…ï‚RHC(ÉQ∏dz–Upà—fÒÍûÀIwu.&ºLä¡›_Ú§C˙›x`°µ£LNÁ8∂Ã°È:˚S5Î;n2µf<∂{ˇùÿo„û}Rï:œÉ+¬ãﬂ…òﬁ`Ö, ¯5&;^[™ÆÖ-9¿0Ó‚oáªyOÎZ·‹≤ï∑‚YåûPaÂi·=]Ø*íƒ{Ó¯Ÿ]°kàÔ´ÄQÍîÉ+¡ß‚ÕŒ[∑ﬁ©éˇUπíM›ódÙ®÷ı¢âfí¶˚ñe|%¿f±⁄Ï⁄¯ªR:w¿∆W\Í]8RöOR˚+.Xáò^kä}]˚÷”çÃ´0*ÄÕ(PëA·2â"Å©)ñ¬‹:l8AXu˙™ê≥Nz_„iíúı”Ç›Í\∫aÉ˘¥⁄”∞ûsÉ∂≥’Éß∫ì¶rÍYx›∆QÕÄÀââÍ∂`Ñf}=,P∫âé9î±`Ì1,´[Ÿº˚∞Î÷ÛÂb™ısôÁ…µk‘Ü∑böVﬂÀ‚—ôÉ°⁄0ûP÷ÓˇkØmı÷Pqkk™êïµ¬≥-.GPü–b‘\N'pπ∞˛‰k5«…˝\µ·Á7®-¬˘O∏ßUq·òÿl,bâÜ˛v›¿	Ù÷Kö\∫£€¶ïÏ∑0Œ&nŒV'äÍÍõy\bò$·∏HTe¿ …≥&5Ωw¨bxu«ß≤\êUy÷#	xö	'_•≥œ≥ŸÄ≠z›VÅ„ÃÆﬂıˇàÓ^àø%JJ$iEî¿¿,eúPÓSlíΩõ4˘hÿ¥ gÿ˜ñ§•z{ΩºŒƒ¨@‰"Ü ‡ãsL»'2/∆P]ûÉŸíqëPg¶=∞z∞fÔÄâ›„_ˇ◊ˇ v34“¡∞ƒÍmﬂ~gÿExYÅBkf≈Tõ©;•Ωr£¬x“ŸÿÃ—˘öÑ?>∞OÆ“‘<V±U2πäÉÔ87ÿ
h€à_' ˜Pªñ⁄ëÃg‚óÛÎ"†ÎöÙ±è/≈®¡Ì±]TãπÀPëœ°Ó¢‚¯åzµ%5*;™ˇõf9£UGi
˛ﬂ∑†2ºΩg%˝l˙™≈t°ZÃ9kÌAÖÂ:Û$~Nù…‰MqI?Ò€Ë“∫…œÛË˚!\ﬂL*Vöç:´Ì€Öfï®ïPÕ∏f*√n3õ⁄V…¿¬Z˝£Pßõ0∞≠xìÈP!LŸQ6i∆∫⁄êx„RÂ'ﬂ√O„PO»∫∏lf]|ÜÚ´ÚÒÀ2Œº&9ê-dO'L…ÈÀçúÂl!…4D.¨ä5%ÑPVEÔP⁄CüL£Ài“ÆJ≈¢€ï~£÷∂À3léärÑZ„íÆ√¥`ûT~£€µ´ê—≥]œFPVå5;ìB&FpÈÜ∑Ï8BıWû((2Íâ]ÿˇ§~8;ãöls¿ﬁ¬kup›Ùj÷…~S•Q¥NPm÷'9Á¶"rúH;!K˝ôπ¯_ò”A©‘x¥c#L1^:›ZŸ∞ıøëÁ¸Ä.¥ù\ÇÍ3M2ÖSÛ˛Æ&ö>¢®ﬂ¯Ó+ùR lè}c& Ck"2x®˜ÛEÁö;ï∏‘+/ıLYE®.78πÅÎQπÏP\Zº≠˘iV©tG^Æ´iãÇ1—Gt¥Ï8^˙_•¿ñ5Ìs36◊À»˘#˙=¯8€ã‘¨ãXyÇ≠£È!5¡ßp}‰¡G‚ÉÕ#·0¥UJSÔ`ùW&>õkN§≈∞v»spÕî≥{ôu/fí‚Ì∏¥ÈopEp5öœ#Xõ¿`Ãmmb∞5ã{sµ#.¬Â≠ã÷Ê Ñ
SxTçô"∏û≠é‡&z3‚∏=[Ù¨èWc·ÄyM≤∑JÜO¯ˇN≈YF
Ó’Æµ2‹€Øp-®u◊c§=(4‡$¿öU.HMŒ∆<2ùî-∏±sxÍE˝9<=f *áß%¡ÛfÓ¨πù8π;ô◊‚≈4qNg]∏ìPrπ^˛¡'¯.=IpHËëë•Ns2Âoçá»ÍØªn	lW»∆•D¸)ÏΩeây‘#†
ûÉ«©Ìp‡¨Ï}ëKüMπtiqŒŒÒ!áMV ”XÔXz"?s-5ÌP7rgŸÕ£_à jf8ˆ™s´vªm∫…[ÓW∆wÀ”Äú¨îBXàú¨ªÃﬁvp˙^ª`œ¨˝JÖ∫Z	ˆøµ2°√‚r;∫qVh ö†›Û~´[h?›Ò)‚’ü–»◊{{¯Ô√ÃØ≠ºÌésñ l_vÙ?_÷Ñ•≈˚Ñé∫ëQ£åˆHˆ¸Ø
ˆ¶Õê†ÔÚßLñ†˝yÓGb ^K YÀ≠d
Ãµ˜èéug£ø6§kN8◊r]µŒ§‘ÔWÑqc`f”HÈ°ÔZ¿TÉv+Ï”¯ﬂ◊H∏u∂»i∞IxQ¥„ˆ˘xz`¯e‚Áábe?ÄV£0ﬂª).&S%Qgl¶<Í>ˆBu≠ááY%î'T∑Ä∞£(çm√›∑›á[ù–¯‰}v”Õ+—‡§Ù/ü‡L˛¡ŸƒäEqïU∂0@KˆÆÄ√ˇΩ’j±£Ì„„ùΩØè¡£x07@QDq„∞‰”ÑR|I%WÿFøˇ´TXçàÁ*Ç∂¥kLÔ€–˝\N∫ŸEˆ.ÔäËäÙ€®céÓU[îûZ/ÕÜﬁ¢ájäûf	áMlÖ˘G’>Ã“@A Ö5yê1ıhÜùÎ‚¿xT=Ë†Q’úö—‚¸√¯\èè´ﬂÔæ•o€›c¥x[¿9Ã‹¿g"¯UQdq¡–$3Ô∞ø¡C∑m‡äÆ≤&r™√b∏C^ı)∂Lıíîı3ƒ∏hk	8≥3 Éd∞‡∞
n‰+c’`˜UlN>º›82D ThOôví>¸
2@Êî´ùl};Oõ√0töeÖèá‘ΩD◊ €ŒÛµ3Ã‡NˆÑjúª€{ÔNwé∑wèN∑∂ﬂlº{{åûút2Ö+Fó˝Is«ÿRÔ§Ü(‹…{Z±7√4È≤Õ√]ªòPhew1jÃFö∂ bêzÕùdÎ[ˆu~˜#ÆÄ”9ÆEg†óÀ„ÂYäSg@Ø!æ ^‹ÊÌ©»LZ5«Ô…ÆïggŸIzôùÊ·πﬁ·Ùv!C(∏SÍ%¶∆úùØt!P£>Ææ—{Ì<√ôíÃíG›Uèd ¥_<-⁄UR$LJdñ`c[àxÏ,∫ÒzòËπ¨.‚o±ÀÒhA2w≠ó≥#¨]söG÷ÀähÑ˛H^‰ä$„U;)6†YqUÃ0ΩÁb<6Ó`”gz ?6x‘¶ß ßª£Å“
Û÷ÈÖ∑gÒπã~µÉK`RD≠©!‡ÿx¯≠yd∂yÿ/˛KEÙM,bø‘íMÕ –“◊aé—õÑ<2ÏíLØlwà¬=òÚ∫≤Ä„†à!,LR
Ö>u)\ÑÄªÑΩ3®MÍÓè•bM%Ì^ësπ=Btbòö/≠Êí®8í-JìHﬁ7Ì ¶∞≠«î52dµªÊAôR/D ˇDuB¢˝57Ìy(ª5`?@ﬂz>–yº]»—ºW83%b
Œ≥H=ÅÿêÖ,€˜HÚ7H–ƒfˆˆå5RzËK¿_—·^Zah;æ¬4Ñ%>Û7‡o•t[F˜ù£}ë„]>œS|)¨lÔÄ£Vy‰ÙSŒî"göH8z)ùËóQVû`¶0'ªp8R˝ª/í4TŒ™!≈¸‚ÑΩ›0√≥m¿V`Xù‰§Ñ	E]+C≥!5é„`:§@áÛÏ8¿:æŒdpåÁôPôÙÌÁ
ôóQ–ËIlé4äﬂt∫Câ\íQŒìÙ0L(2l»∑`$ÍA“M¢çs$ú¿‚)XÖÒùoºÆ‰M(íFÌÃ©ÿ‰ÒRNL´ÒMÈÊòÚv!t»jÃWA´%÷Ö-†ÓCƒ÷I±‰ú≤ôZRÉ° l(ﬁz¯Zqã—…}úN,˜D>æª˚sTÕy"—èÆ ÉÇi-xz˚ÌÃ¸ÑΩÌ˜·&å±i≈Å˚~vû¬hDc+å˜?g≥>˝ƒ‹Ö’Eáaï*πÎCß·£˛v«?‡¿Áß°ˇŒA˙4lÄ—M='`˝…ô Vòã>5_`.¿O…!$[qaq_÷‡~XàosÛ3¢#Ã(∫W¡%˛ú‚#.ß+ﬂCEº<‹Ë∂¡›5ÇËlI'ê4öÛÏ˙2Œ„†ëáÒUˆ1&¸µ∂ˇÂKo¥8Lã·∆RJè“∞K7æügA*ì¡∂y/8~(—é≤GëvJ#:•p“¢6¢ X™±ÙûVGé‚™±πıQ´(T¬òx(X‚ºÖ≈ ÜÔ”E\?dt◊ZhÎ
ôäGåëpaw.·∂18CÕ≤;h≥z…>Cvp∏p∏≥AΩáäV∂G¡⁄Y÷Ω$¨ÖlX|ï`Êg.˜›*•V(Î(‚“≤≤√à;`7=lC˘ÕcûYì$“Äª^∆ÊÆêª"~>’9¶xD[‡eÑ'cR ∂©gK‘øro‚¿î˝ù¬“ÄÕGÃ”≠jaåäv7,Gqún(ÛäYì‘{¥ä#¢|aÿ/-Ë¬K•≈H2?Û5ﬁ“£.ôÂCOy’∑#3¯hd‹8_∏n:¡‘`+A(@0}î@¨˙é/≠AU‘⁄ÜU∞%¥wà√¿ØÿÎ„¡xÉ	Z6†V ¡ù2z!Ê ¶# Ë äZ;»o’!Ê]s<øïuÇˇo`èy¶&–D$Øpà˝}¿â±»{ã‹]≤ìz4Æâ}.%Q9	πãBóqáç…òeƒ?8gqƒ…„õIi3ÎÖ§ãR·(u‡˚◊G¸h¡¡ò †˘¶i¿F.9o4ß$„AåÄö&ÄËVÅXB∂z˜Gú]ö—-%Tqgxô0Åfö$˘¡˙‚j	õÉ“rD)óRb
Ç\ba‡ﬁ‰‘~ø@|≥—Ô∑≈
™áhU]¿¯…÷çö‹v*§gËP¥.“°b&Sﬂóy˝¢Ÿƒt∞_’{Y©˘⁄-ãæ0
[3£äo≈iÇ0NÚ·@éj@ 	Tfwvé∑Únπ«uŸPÚïãJ˚6œñûóHπ<=~.F™á¬»ÀÕNõä¢ÍéÖzßS“rùQ∑Gœ®Î¬«Ÿn\¢W:=qÕ2{¡÷¢∆™®ˇ“+»aXÂEÃ_\íI(D˚e"
©Tha0Y‡Å…(Ã’ï9)TÎèóì¬CÙpÂﬁ$›ò[yî@Ø"ˇ@°~]5‚º4+†8eÜ≤”B`X∞}eÌÅœ≈´ˆ…‚{-¢'æ4)æ∆∑< ¬:˚rëÛ%Àœ|Á∂±¡í√∆¬Ó$@t—t
¶ﬂ˝xúVˇª◊m“}£-Áãå°1ÚöxEê$◊å5©Gë4TæÅX¶—&&ﬂÂ]â>’Cvê£+Äõ)≤.MŒ„Ô‡hg¥dC‘±Ú€:n⁄!Ω(œE  ≈ëÁ0"ƒWxæ‘˜Ï‘Á∑◊51ß ˛≥Ql·Ãﬂ“˛î˜nãuÌêC64%÷I::¥ºb°  &yi°™á]¨'^≠;·C~ø"∑Æ¸4˝mz⁄˚¥q]\bz–øzVÆÈ"J®Ãºd£D˙‰P?38pgåz€HøÄG±Ìq;VâøD∫Âë´	äOU’QÚ“>Ì ÈX˙3f$ô÷p∑x√ÁÊÙî∆<¸ªëéørìm*QæÄ"XáÉù`¡ë 3h$I;yñí‘˘7∏·˜yp˛2ÀI?π˘ªògÈ<†ü5i=yŸ„€~¨ï«G”ú§”?'¸⁄I˚ﬂÒ4pkÓ“ØLÍN-=Ñ›8DvìjVèØ„4>O:Iò´QjØÍGªôT%¸mñ>¬tB@åú√Ù£Í
~◊Ù!dÀ…ç.QNnjÛÂmº}{z∞Òèª€{«ßª€«ﬂÏoŸJÑn@Oñ–?Æ£uÈÚï≠ ¨fßùÿ¬Å^a>‡ëÄ[≈f~˜'˙ÍØ≈gïU∑Ó˛tÊ©I¶ Áq√U«P˜à˜wˇL¨Zgm’äøÊ/ìòﬁ∂Ù!·ªªÒ•´ıàS≤”;oëhÓ∆ÉÀL$+‹ˆ}Ò\JË»ä}—Wﬂ]^k—ﬁ{¿≈∆ëÁC}“Eﬁ!∫qæâEZﬂM„ï≠¬¡ÙY]Ua™aÔ,Œ_≤Û8Ü;cá∏?˛é´shµµ‰'p∑!°ˇ
[ZFÇúŒ≥§)≈nF”	˚∂4o¥ºàrÚœÑ;∑?-è´(Hìÿrﬂ±ËÆß±G∆+Ô*ÃâvF	ÍVπ–/æIŒ( ÀC`ÀŒ2TûJ•–¢xäµ¨∞“1∞%¿pÇ˝¢IÓê≤æ˜ªCh<ä5$+Ãú˛˛2aøœwÀ|WÉdDÌ\f∏—˜ÙÍÍÂ‰˙o¬N|ñeıÍÚ›‰⁄€à√ı™ÙbrΩ#XΩ>O—õZi≠CÒn":Âup‡o™†·gπì~qø{ß‘ÍÈ™7EãÖ"/π9˝ﬂj&©V1$ŸF—S4‘ßÚ÷+jTóW>+_ú¶"[Åm+ﬂ{Çô7ÑÓ®T»§»FÁ@áÀ!ü¡ìØU/6<∫NAN˚º‰iè-uûÙ∞ØjK¬˝‡Ù¢‹kœ‡y›SÃﬂr
hVµ˝•BU+A˜ÏvßD›*ißÛÇËy√¯üø'ô}58¬*∫Û=úú∑uRÅßÒº]“	=ı™ÿOì¢èFêÃaQÅ˜Ï’+N®¥Aåu‡ÚP¶`è÷àom†Zë”>/“D8]4¡‘B˝bW˘À”kÒÎmÓÔlÏ˝„ÈÊ˛ﬁÒ∆Êq[~Û6ßHÅŸ^"_˚TΩ-JÍ`6x.ﬁ˙⁄ìﬂºÕ≈0€¢õÅØ!˙‡m	àŸQ_O¯ﬁ?AI¨±à∑ﬁ·ào•ÙÄ_`ÒÑ˙PûãùuÏi÷‡,sÄHˇÇ”íbæ_ù∞&1-èØ``yÅ˘Îíz˚âÉëìNÂ¿I¢&‡wzßäÙH{ôP™6 ù0qﬂ{'Ÿôf´aÙWô◊“{E1BAxÂà[qrcÂ∞‡bû˛´^ﬁı2D≥ΩAÖ”I≠U“ÏF\¡·O Í™ ≤+Ã≥˚Ÿ‰`˜[—n∆v›Gä5ç¯ ⁄U›fl0_9É ”·Ú\#Á=◊HÛËYt‹…yéO&w@0oºyõœıÓ(EÛy≥Ê¯ô]◊€J©˛‹‡nsW+Ã∫Ó´í~¶cÖ˘Æ◊øàSa©2Îè∆ º·'£√N’Áb¢—÷√4ü|‘Û√gΩ‰Êg8q\aBl†¢¸J`U¬æR)]h[éÆyÙïƒ≤Fx°„Qˆ˙ÎTµ‹.„`ÁÓ™ ˜∆hËÒ‡!m:–UWäÛl ‰v ∂oO+Úçíπ9E’›Gï-%lNay±Qeï4Õ)JWUéÀÕúBx7QeHFÊ∂#ÓeSR(ˆ≥ùÉA‡ ŒE$íÊ˛ (QÂ¿\<a{˜#∆N@%wà∏h0y˜ó≤©ÃIºZ0t,Q^sœsòTåÈÁ&‚î¯ﬂ¬#Wˆ›0Eì dkHDY 5—$∞¿‡w$”|'üøpàwtãpÁJzCÙPäª©8≤ﬂ‡¬«µ«¯ãŒ™ÚÕﬁ‰q†ËC¸l>—’+¿ö¿,±)ÆT)ü}CtºÃ¶‚£3®ñ¯cç‘ó◊)‘€ÂÛƒZaQ\gy§UîØ&÷=8‘Í·£©%ønRu^†&l ‘û<ŸÚ©&7!˝Bœ®8 rnõ…EÛá}öÂÓ_f§4UMπ£;œ
mt¯X•◊zÔYóË j@ºô°ç≤◊€ofhÉáå(Ìı÷úoFªŒ◊ı`4.µ?î&Uú;ä?hπ§‡EË#ôÁ±G¨∑ıJ:¿…ÿÉÁΩÚπ∫D≠†˜¥ìÎ Ωgæõ\[ı^˘¸sBıgµé¶ê®÷ˇJòfÃ§Å©ÒÆ*<# ,À‰5ˆ˘∑√ÏZäìKØ`À?G TJ£â¸œYÇqhWD∞àfIÕyTâ4coí<ÊF2ÍV¶ªJÆ»”õÈÚ¬nåÜnºëPÂ7[:aa1πå5≈8ı‚ú,Ûîu®¢S‰etGFÀb&˚ö-lx¸H‰L·ObåÂ>Ó$bJ]M>–ˆZ
HèÙπ>Hü(7ÿd
˚4F“‹ÛäaVzÀvûôä˚ÂﬂwºÑ_ˇK˘¥1≥ôÖ’r6-tSy4!µZ#)ü6ÈV”KKZm¿UÄ9öb√ä´J˘o-*õ ,ù£±Ñ “0$düÆÆ2∆ë}è@su¥Òå”Îs˜yyâ"7µª*≤€úÔ'G™bÿAüë'>Üæäó/˘s˚^Z`æ§˘DÆbá
Y"˛íÒÜ¢1ÉãÜ∫∂≈‰·õÆur¯A¯ﬁ?›≥¡ B°˛.g\•n2i"í+]F0∏Ü„ÄªCvÕ95∏b¿e#bS¸çyÃáF9‹€ÿg§¶H4€?Ù_˚◊ˇﬂdÎ≈›_∏;Ÿwpª˚ì A6DY3z≠Ïb€)π˚pOˇA‹1~“Uú'‹ë>¥∑ÕY‚`ñ˙`añFx,·ìXû˙êÿ±„ØÿâùHD“£âËAzh OÏ3§ètßå©Û^Ù∫Ú…{}ﬂt†Ü≥ÀÂJâÑhU#¿Åµ@F`0B	° H ÔÌ¡æªåxAÉã<[Jâµˆ≤AÃÌ“#&b≠hóØîxÕy‡Mπòa∫ ï<Fµuê°cµ¨∑(ÛmFF9Ã ΩIy}‚µEY|Ω1ÄΩ∏$ÈøxKÊÉÑ≤7ÜQíq∞r¶Î∞˛0Òû˝Á~ÅZ˝Ûpÿ¯™['∏F”@|∂÷~%¶◊ÆÀ’hûƒ0eAÙú,èSô‘∏€∞"˝lË¨!¬IíˆPÆ$"úªögf◊ı`åãyµ´∫ˆMHøÙ;πˆ©¿ºxìZG‚UYO}Dı‹⁄Ù&pWd9∫¨hﬂ4§$ã–-÷-"N£ÍP\w›Ç‚§»ÇÚN´úH<uÚ)Ïåm{7âeoszÅIÎ…âªê≈lÿcÔﬁÌl°Ñqy ©…w°ﬁv|É±ùÙ∆`/ïó/∫˛B´) ÃÑ3≈£Óïnä†ˆw5Õ:ËX¨˜ë±∏ÖM√DbÜTFOçãÁ#÷ËKDè(°Úì\êı:Í——ë“ÅUËaêÙ36á∞ŸZzÒï¯õk"Y‰´ØfΩáËÉù`Ã*hßì
OEtΩ`\∏å5åÖjÒÎ6∆à°!ëk&‡{µp– ÜÂ°À
3#L÷@{Å0qÉ.¬≈¿≈ª![∂?ü,∂æ
[ÁÔG_é[Í˜≥)~/-è?_H⁄∞VHñ’"\'Ã/`Ω6≈ùzN9!pÊ _igÿ•M¿m „ãS†’+Ê,	œ2∫ó«≈úﬁA≥nHÀÉóNZI§!¢7	p˘`q‰_
›h-ó#ò◊{(»{ñ&Î≈Eå55'Ü¨¿$©ZD2ﬁv –sºMCªògAõ8π0ù@AÓä? Vß…¡ë|mÀ—…}éŸ¨iÚ£ób.Ì¨èk,@∫‹oº'k-Pà}∑Ão¬—Ø¥Lí∏û#4éÁï@ƒ4‹#É#Ω5Û3´“ØhªJ˙<4ÅYì—≤W·u¸´¿ﬁ¥Q”†nÍ‰wR˚”,⁄˛7Ê‹ò´ÚR+Á‡\¸”/€+zÂM¬OÛ\Ìa|ŸŒ}*,{çº+nJRÆ‡róºb5ëYZ~˙Ï˘ã∆ºæÜ∞v€B*‡æ∑,â˘üP€π“˚òo_Z´gª≥~Ä†å-(I·gñÏá∑¬∆˙W¡b$≈)±`˙w˝¢„a!Nì˘ëSåî3òä#9'≤$úŸEk…ç ¬Æ<]´¶Ì"iZ+q¨®	<≠®á+öÚ0èMd»)ßœdy¢*Yè	,' LC!’∂∑V˚È≈%˜ù~10G/+‹Â∆≥Ï3Û_›Fêïòc´Ç<•¥xÖ≈ì“,–§ËÓé˜’À
HD1Qç*∂∫í>Í˚GÓ–ol¸+J5M}Éù<—3^kÃ ÄÛ
^ Àß¿â≤åp<*∫%õ\gÄÈO$Ödg¯Adö¢∆:ñ/çäƒbÂ˝>	à÷ÿâƒQ•ÍÊΩY'‚∑aT¨Y]+PC!é&˙@ÆJ2˘ËK(™á6,p6wÁëªY´^ÇÍ™—{º•1Æ6·¶1àO!”qÑGüH|‰_x)óYSbô«ÃL/öy,·9bä_⁄5≈s9â‚	∑ºÇêXS≤ÂEŸn≈UyyÇπ"Fî»>∏®l∫Ï?\@où≤qåÙ√„∆wìÙ#`&∫»ˆiœiÙbn©PrS^Àã∂I\õJ^+‚É—õÁW,∏ß ÿ>$"k£»’íp5Ì_&lWã#º8◊‰…±B§5#ç‡^ç—æ`.Â"…+åsÅQQ D~Ö5„ ¬i¥é‹HêèÀZOd´mñ⁄RΩOm)»ßd™}µáôûùëûÖâVlÛÏ‹Ü\’/Á≠ıRük≠∫6¿Aè8∑∑¿}Êõ§	”¨7_]∑∫™8g≠u[ÉrgÌP8õµ∆¢eÕæHö∑FÕ‹"%√˝…≈ÒnÁäÖ7Ò~Y–«¡◊I´uY∂Çw! *d≥˘f	Î>4Ÿ0–aÉ¥mÚÚHº?ÏaÏy≈à*¨LÃﬁ…Á#:«Ô)!Nå2Cª¯˚Ù˜ÈvãÉ¨™B@;˛=íH<ÛÍΩ.«ÿ¬`L‹√º”‚ˇ	Gs&N≤”ÛÑ[°˘ªâ^·%¢)–#ÃOgyh~AâÄõÌ⁄∫¨ÿÎÚ”Æƒ6äÏ`"HÎê≈π A)◊≤$EõÓÆ\Tˆ¢'|Jnj&˙E¬1ò2l ôe4û/\;Î˝§t≥ﬁØ§êuıØ≥ﬂbPHòóê…7≥ Ûò≤‘`‡ÚG∫¡l‰Ÿ7ØbÓpí…v1∫˚ìfÀÒZ.ìË$s©j*SH‘ﬁmåqà(óëwﬂfùªf)éÉ`Qˆíqy6Œu≈)∆9Ö”∏O Ü•DΩvwÚH|±0?l´â™Ωõ˚|ƒç∆¿Ä‚o¢ë„&]O√ã4'Øÿ6)ÃEdF5v1Û<Na˚C]ÄLyﬂS∆*è™=Í¢Œ¿È˘∏Èyåà`1–d,CS≤2I|¡m"‡öÑw Ì6YﬁË	I…ü,ñΩ‘h§BG:ù√Ê±5I´ï1E„ﬂÔΩÅÎ‡fÇﬂEXè~ò†1S$Å°U‡Í  &K`!·e±0h€X›<¢î©˝Ê7∞h5≤˝ô$˚íùï1%ıç©íî+Rµéhù0JCzòd©cT&x◊±‡M3˝,1t}Ü^≠‰´˘9,yµ“C#Ã˚¯ûÿ\bìπSÂÅ|wÎ›€mFø≥∑sº≥øÁÑÄö)áWﬂ C‰Æ–3[a÷ã≠oí“Î!Ÿ∑4°HEÜäYìë›/üWí¢Ò`ñﬂ6ú¥ K‚5]¢0 rÕ)“ÄY÷ueT+Dp{ŸÔõÚ¢©ÄgûÄã	å∆›d'!ﬂ‘IxçÛÑ¡ë<1∏¸;•«+,ßÖ1C{3lQºÄQ÷T∞Ö2^ELƒGŒ¶ÿ:xi›ÜòLz ∂/Åì9KûÌp'Sì∞N5¸F[¯ÿOPíAvÓ0A∫@z≥æTe∑SÌ~ç¨_îé:JD§Dí⁄û^?˜¥?À°,'ítC{Åê°Á·ë€¢
fƒ¿{û@ßS^/= Tç<s)Œ;∆ÃÒ¬ÃÖ¸~#‰f9…%$Hòñ›R¬#~u·πÄx7 ûwNìû‚ıH¿{åtÖÖŒ°¸"%ÿWäkEIäÁ∆¡S&TÉP∏ÖBy ∑S`±0∞ùç&£SﬂHœ8råÑÀ¬ÇÙd\PÓè≥$)‘V!ø˚ﬂ{1•©“rCIW<1Æ∏W√·‚kN„Çë
¥f	¬À–xŸÇóp≈’…”P◊7"ÚÀJŸ2%x¿‚â(ŒCÔ˛%vÂËØÄ„ú8ØË]Å`zÖ#)±”Aé«]_$Ÿ¿ñPvtÁd∞Ä_πÌ’∞‡9a˜2„Óã∞Iû1r~s8bM3À~˘ΩÛ˛®oâ
Ì§õ>È*dÏ{]•P‚ÀåBHbÀ«aüá~Ï∆”îCµ∏wËò–«•iƒ,„Ë}ãnj, ≥@>Ê<wπœb”∂c®á«î'#™∞æûπS&·ï-¢[Êe>5hTOV±¸ò‹3ápM^ëpög)
YTÂ3¥5%Iî$VÄÄ€yò	¡Ô¥»$Û";uå"úÚL5ÁUó_$˚˛ë+ôôqhÚ¿´§j…hﬁÃ≥√ØÔìo3NWá»äaò™'5
Ÿ<ú¿ª?GIX,l æ”˜aW§_…ø&W‹9tﬁ*œ^=
∞]Vx”NéVÙÏÓ?‚G&mSéÃ†q˜„@dŸª ~‡ÇCÙ±Õ`≈B@›ïPâßÅß˛ªı¬Â7Ò-ÁQ<«#<ÀìúõE†rk®Æ;ú≠!ô†<DGñûÎ‚•nV Z*.©túÎ,"Â∆aõ‰ËÇgŒ¡k=qT2—!ç¨4e∆í'∫í—%‹!õApÓDGéBnöÀÙû√©äEjT¡5(â.FYR˘
ÂäVÓŒéáI)˜∆aW‰0¯.Ã≥ª!ù÷R˙%ôRjûÖ≤	±X1ï~L4∞’(π“≥ﬁ}†¯≠€÷óp[Nzòÿ8ìÛ0¢»≤¸€˙Í9ã W"n=_\úì9‡Wè∏3ﬁ7<»ª∫ªíA⁄∂}ÇæûÕïÖä·ô(∑Å≥„|A‹…
ôÅ÷Â¥⁄Bi≤6ZÂ…Ï v∫6Bb<Fön“˘∏6*Ú«ÎG‹ê‰xe´º“∫îr,®YÀsë'√ˇ¥ 3≠%÷ΩX)ü±ã∞ﬂZ*¯+#5÷õÈ∑†È¸ºõ]∑.ìPªlù'vFæz≠ÎKÿÓÖÁZCD'")˝<P7ôü(—Ë[ûhüK√Ì/^§m≤Ÿ¬∆;!™ ‹VZ“‡ß◊aÁ„∞ﬂxOﬁ~\#y‡D}0´3æ»Ê[∆>∆∑k#®3væ®-P†<“qxFùåÌ
Âjç:i`elÓ∫ué gDÜ≠n|>`˝÷˛t≤¥ÿøyœŒ3¥Œ∫06Ïc#>!•˛¸jÎ:Å≥•÷˚ÃZxF1™Ç∞€ùõw&ƒAé&@¬:ò{≈ÊŒ.Zîî!ø≈ì¡«S`0Ö÷WpPÿ
õ£WºõgãÏ¡`j…é˘ã≤–ú›±ΩTÎŒ»h¨[‡;fnjM≠.(@ùº Ú Ì-¿iÎ)Cxgk¿œZ 6óL@3
7m¯™¬JsÓl´ æî≈‚óOı“¥–7],Y7bÂ“ó¿2¿p/¿p	LsÎVòìê¿VáÙnu·Ú© ı(eôpào¢º6Â.·4cmÓ[¡) ¶<‚XrNjçøªCh˝´ˆ≥ˆ2€∆´¿%åV¡√!.L’≈Œ∂æ—;#ÆÀn˛Ëw[œû-∑˜∑fnzmﬂ`—∂{»ﬁ⁄C˘bgéßlzsÔ‡o'µá)™⁄[]Ä]Ú¿öÁµ˚Æ©Ÿ13Í5‘˝+}Ãv°m^5∏˜›>f ¡πuº(Å$ÊMA)Z%TÜ7 ∂. ƒç∞ëBZÉô–0Ö(^õÿ^b4}cì°B^¡j€’⁄‡áöm∏h)v∏„•‚iØ.ÙÔsöóX—[±w≈ˆ ®,|¡ha7iﬁ_,8dq¬Œ?≠l⁄øµ§≤‹£Áã6· ¿«–™äùiV-ï‰Á›¯¿+Ó-rÂ¶zV7O#◊≠Â/ÅÅÇˇ‰Ÿcä¥ñ∞)Zñ?PÚ»…†P@±¥`(D`\ëˇLŒoÂcõ∏êd÷¢∏ÃìÙckq¬(qCª2Ω0.∆ôX“ª`EﬁY++éYÿ¨Õ—r”qò3gN\–%ˇ';√LG-í-'È\%≤,ˇ0ZÌ4„⁄¡c∞3Ãaµ6Z˛rÏ ì\—©˙≠Çl—üˇE<ÄÑÁMúÑÂ…õ≥ö…»„smπâå∆ÁcÜa°Ÿ§T/Ït‚>ÏaÉÖ/å-‡¸˚≤∏åx‹òò\_v≤ ûWÈè™âô6F~3ôºC"ø†4˚åÄu8G˜è_íﬁı—’†~CËO“˜µQ°2È	ù¶h¬∫8ÀﬁT»3ñ&¿	˝U µ
¶?◊∞›ƒ%ö∏?pƒ˝kÅi¡HÊò±›nSN0!¶≥‘õºZÍZ:±†±ÖK†Àßã°◊Ë¯¡ﬁ◊¸≤‰ëÕh6‹C·ﬁãÎ09õ|LkøãèìH·6'ﬂø|Z(*à!qµ¥ê3â3“ALÂv2àıt*»∫_,‰|¬”≈_-ƒı˛)» œ±˘WDiB˜#Ç˙öˇ–@Zâ_	|WÑ§!,#œ[o¯Õo
gèCßˇRı⁄¬ó≠˛çB‘U<˘œ)?8Fë~)∑b¡0 <Û_Û˛¬ÑÁ(L(‡ÆMŒïΩ,‚F+òªç+˚ÄÂ‚ˇü∑k[AÜ°ø2˙ {Ò."?`·• `ZŸıÔÕIª≠≠÷+Ëã†µƒ–ûúúƒX`(ä.•)¸S}t®eª…}#†ç]Ω(|AÔEuûœ;Îƒ∂?˙J^Ø≤z≈$Ü6ìp%rKàØ	FÕï™h˜R–ı —z*˝⁄áß=8Æ‡ë√™cCA&AeoíÛísbÆg&=¯ë Ofmw†Uxü¯ÿ[@óWÙ≤„µ=Æ$˙ÍÖ>≈ı†µAáG=
∂î«≥$o}Œ‹˝p4üíc≥Q™û3∏Á9ËË=ñ3E±¿1™!Ÿhx|ª‹â$≈ff≠¢Aí¿õ˝…ä$˛πjµàg,÷[Ÿ∞S …”åvÚ$jΩåè“éæß(√@Ü>µ˘‚"◊"—@4YÏ—†R™!g∂Bõ∫Ò∏un¬¨$IKﬂñ\1œÚÍ“åÄA%3≤´D‹   ˇˇÏ]Õr…qæ˚)ä∞dB¿‡üªÇ@RXªbò !Ç§l3ªçô¬†wg∫gª{ pàÿ=ÄÏ–¡±Ö:8BG·M¸zgf˝tı_Uı`Üƒ“Ï3›’ıõïôıÂóÔAl)œ»«%∑¥G†Fp…Ì≤pNÿNÜi{#bÎ≈£GÃ7ˇI†±›„âMûòõà∑îh1V>R}Á ‘»˝5©&g›k¢Â8·+rç0ôò@Cıp›¸	O«å+\) ˘Œπ¿∫!˘®6K˙·‰°üPÛoXìk KÀæSj∂ƒî≥UˆÇ“ã¥ƒ∑<Æ£Œb>ç ˝á=¡MòÄV=æ˘ëÄΩdQ±N˛çßs{â\&LwÇÒÖ"a2xB‡/ô9!Q)ÅÉzôdjï}‘Ø®ÏÕﬁ∂›£≥8‚d£ÒBù3+†ÙR-“!s1≥ÃµÈ9/‰¨…ıynsÜîéÂ{çó?Éâ¡ìó;(≈S™ßÂ
ÍÁ5‰y~÷∫‹°ºõ…Äg]*Àø≤
E>e]’„Ó™Í§§”÷TƒI◊‘SÊä˘5»".Nº1Úª{íî++´ù5qÀ”VìVIßíTº¶ﬁŒ˙bQÓÍRb’©;U·wkÍ∑wŒ#îˆáˇE7\f—_ˇ¬6>ˇå˝Ôø˛ûâ§œ7?éËØ£ΩJoÀ¥GÆÚ∫VZaH⁄¥—§X\667eQ/∞”∏aÛ-˚Âw-±‚–î.Å@S∫&Ï0ÚìÒjöuØj˜b%—˝G K√˝'Aó˘ÆdÄaj’Ï ú	ß úlÅ∆©€∫wß≈,7t≥∆∑Ÿ≈Ÿ([Y7ùeÙ$6qäx¡˜≈{PÎ`häÅ>z¸zYÈ¡ˆùıñà´Ωû"¥PSÔ≤ΩDËk∏£'ÔàÇ§~ÁnRæÆÓI^ …%_í‰l˙&(0«7ÆP@~Ä˘|I›0€__œ¶3£›˙’—4ï,4WX	Åöp\ÏK¥Ô/πAj.I RÙ<{ııìóá«Tº˜ÍÈÀÓiıe⁄bE∫@„Tb<¨/5=ñ1_L?%Vìé≥îQ@ü7\ÿUvåÄ∆Ú›éCÑ~(DÌ∑≈—c∏ëbâ«ƒ° ¸ıIø£z…ÒRQ⁄s∞≥ı1ßå– Ì$OèÛXÀà«˙yÀhÀ´˙À8»ãÿ.F•VbƒzÂ;séh*lW°un_wSòöl»d§	3M&‹é˙O@ ]v∆î$XMΩrm=ZÆ_ë≈/X˘Öù™+É©=*ﬂC´§ó∂®kr#e~Ò∑-}ÉIi(…“M«∞±pUÕe∂Ó◊4ÛYj–2[[fT¥_≤›Xé˚˛kè2ÎV©AK⁄\∂c˘y{ÈjÚJ1⁄/¥Æ
ÊB9)A%_Æl±±·Å≥ÎDÏ_ù ˚^9D¡UE€äFﬂ§rn	Ô¢ª¿{ÙyòÜ ]Õ∂e	ˆÏÚœÂÅ€˝*	«ØyÇ.°ÙÍ≠ﬂo%n†M∑wØ‚‹SjDÌ±~±≤m†aÆ`áfø`Î◊>^Ω:_¢Äp(Ôaù¢à/Å›˝Qól,/j7Ù|ßxÆ8…&ÒFﬁ¥es˜ØŒô¢ﬂ|aÈ⁄; –'>¢Cú.ÙŒxÔªì¯“ÿãoFÛ…ú™p
”Ú [Ïı`ˇRøÍ¸ˆµ˚åJh?^f≤“;LÆ≤Qƒ∆7^ÚAáL√ê1g¡<0±sœ£K›ûÒ¶Â#‡.t›-sé-ì˚Å«–éÏî$∆˜Íü˜@˘âó|ó¬*≠Îm.xÛfs›0>ñÎBÀéÄ|F’Ü7?7∆î≤ÿÎ3π©=_ÿŒ]ûs6!RÔ>Wè7vˇLÌÎΩÓ∆m£yM/Ω•âm òﬂz'·ÑY§@wo.√ùupÒkAïêp/´hﬂeÌ]s‹ XŒY‡^åæ˘Süæñ±ÙKÕ(∂y:ÖE;ÓüÁ3ÓÀ8›∆∞Ö~˘˙Âﬁ∑5kZ&ÈëŸÉ≥U:Æ6ıú∫ØßµMè ≥qé&jMΩ?Y©ïG?b+µn·~2Tk.«
ˇd´ ˛h´:Ì‘ÄÀ∫≥fhù5Ÿºk}2*-F•á…¯1[åÖYSk4ÔpÿçÖõ-¶£aO9-«∫ﬂjŒ›*‹&-}Mvúü0√“ÉiÓé$H¡5-ÒH-™ëá§±Â÷p≈È£.7k¢.±Ïà¸^8¨[ö^±]‡•g∞‹’È$ä¯0%{Z√ãTyè/-/2O›vct˙ò–˛óTµŒ©áÿVeÃ…ñ∆ ·´Q•Ñ∫≠™áä±YZ†ßR…+aX§:™æ⁄™ßW™®±9•S>õÓWàó÷›˚î´[›õXq˙◊ƒ¢ïΩ‘Â`˜:Ù7Œ`4;‹U7≈÷ñ)„’XuYca¢Òﬂln‡íØ≥2∂ôü©ƒ<Éyr∂bÿ(4;9¶{uCŒ˝ç3÷ŸKˇó`¨–‰kˆ V'|˙l´~bò€ÅäàyÅTnä&õÌié»ˇV;Ÿ[qXV‡Ÿ/cäå<Ù%ÎHÒbÇ∞ÙÊ?MeÄ∂çd™â™EÅJóHÍfÕ"JãÛá˜âÆ≥3ÿ ‹5#>Œ@M	Pù<õ0w6ı‘!Isáè–›-5‚x2D-á¬⁄†´∫v:ıBílÂÕé†˙v∏8
≥8AMÀ©¨Œ?Ú¥=˘UÅä∞Öˆµ^«2–V˝Úä$±@¿´bg≈ŒFYÏº˘˚Õçì^–ãb«…© fázƒ*˜~õ^äù-◊%®≠Úh∂öıÛè`<˘'Îπä'Ç¨‚sŒ(ü∫aîÄ¶ñxhEFkiπÿÃıË"o5˙Hù«·Â?Úw|Û›PÖ5†÷D¶å§xÀò¨ã√HÚeï≠,û ï¯9Çy@GJÅE¬5ÆœÓ∂uÊV|8m¥ˇ˚ke˛Çìa‹˚ˆßP§%†~sõÂªB€¥	ÔB∑ø|7∂ªi£ÇœWF∆V^•…˙zkﬂÏf1ÚL¨‘”∏7Iw‚I6#.∞ﬂ‚´íbm˜Ÿÿù1ëÛÀN\ËçOJ˙†srwU<–™–h¸≠≠Tò‰”ÀE‡Gcπ"2döí’Ç≥˛Rﬁ2MÒ¥jcZ¥ÕùBÎ{OØoè˜ÄrAk≈rã±HƒÊÆZZ∑ØóJ∑“u‘†’œ°ÚîB†àÄ£A`•†à˛b{”x±õNÒhÊùŸ.z<…D>)π#8îÃ∆µiﬂLkHMcˆè¯iÿâgŸîÊÍXjv©n‹8uËÕA‘´ªy69	¢Ôñ˝N’MÇ4vª›BU·G·é©+∑Oqíò”åb k∞fé^¬;ºk‡v°6TºŒ[
Ôû“Üg*ÿí2≈ãU#SÁ6=¸ﬁBy∫Qkk OIπkÔ‰m‰Åõ.⁄∂≠Qpk´¿ﬂ,0,J√¿∞
≠ÜÌÓ~ÇÈà≠€√>p8%¬lM<√
»á}§“≠h’›j*¯Ÿ

Äı˝ëUÒ∏±,3ÿbû˝˛Nö«©h√úOVF(õÑÒGRU8¡&≈ñÀÕqµ˜ÙÈ◊G{ˇ|xÏÂ◊á/Û¸Ò1˘¨G.hãä9àë˜∆≈ß£‡ˆÀ!œŒ‚~⁄£ﬁpV«	7ÒWy˙……MÓØ*{…≥x0ÚBd˚:>®©∂ﬁÚÖz/9å"-x:0áq¥Æ|qú›⁄õû\≈}æ∫^Ò†Î›D}±È°ØØïéd§›ºßiõ…/Gª©7äãÖÄÎài8É™€G˝RØ€¸ºÀ∂~´È¥*Å4⁄ÎŒÆÚ7!/«>∫+@H%âq¥±j„Áê„ÊaS9'ã¶7›Ø\‰∞IõÛ:9˜9õò«πx•Æ Êº5;ØßÓéJW®ÆEª´Ÿó?©wÕÍ›	ÿÌt;z¬≠ÿCÃ`F˛OM±{\™˘ìÙ@≈í™’~rÛ#®™q3—£™åèz˜¨dÃz≈2xÎ¸|	ÏˇFû1Zí1ÂC◊ ÚÀD7}:∫’â2JÄ~ˆc∑øx>˙›fë<r´®Ó›w™{=≠˘…π:Åj§pH2RŒºÎíòj·vƒf¯9ÉY≥?ÿœ’‡.7Ê“©UE˜ÊÀúl‹G_¢KµË®–ﬁ	·QÛ‚Û √hÇû0]öÒÒÉx°«Ω`–<∏ZÛ®Ét√úvO9?ÇQÄ.ı#7."E⁄˘}sévä„¥Ãä·MD¬º5Üæ*ÏÑ≤èß%)≤ˆ¶ˇ≤HıyÕ5µáÙ®o∞q¢ÚãDê¯òê ÃÖ‰l|Ì‚öÇå.8I„·…¸±^hIƒ„ïı’∂B&µ˛}a*T…>v:˚ÔM„iK0•QÛ‰¸tÇ ≈O)–ﬁÔè’›ÉZeÉïˇ˜ÒÕè'†ÃDxŸ§|?° ±·Âµ 7˝æz˝º7˛QpπrÎÌ>.8ˇÈ5∑çx>€∞`=™ŒMx⁄-x^p´Ì◊Ûı‹zÂ∆€Á'z«Ù›Î‚WÀÈÃc√˝∂[◊f{∂Zá$w ©ŸxJ
˙ú∑ßƒuˇùÒë®äZº#⁄∏ï˚ÿ‘ÆÁó%L]T◊îŒ∑ÓæU¬gùÂy≥Vπ¬) ùı*Ö›@«÷"òÇÓo»,,/ÇÒ*F˛ Ø¶à∏Ùò~M!fë§±Ë€fjër
ﬂfW*Ãq#˜ñö‘ïµVxw/I‚ãßDhÆ#W≤◊Òtÿ∞aÊó»eõsLx<mò¿VV¯Z]Zr§£˙U¬œ6pe≥X¨SP7¥ÜZN4P÷IK:Î¬√=ô`›XMv›‘]Mu¡öôå¥◊
=RÖÜC+#M„KlíÔDpA‘;ÌÆKÔÊÇT¥ùLÅl\»⁄}öÁó'†≤îÌA˘é–Q ˚ÿO˙≥;úaÒÈY|±7‰I÷˘FîC‹„0$“F˘YµwÔ}c-”πÌ!k@∫/¢¨MK2]—ñbaw‘≤(üı0eêi∞ñR#»ÌT≤R˘≠^V}Ê‡/ä*—˝	√MÍ{dUõ\Û¥sú.M´µÇ˚näƒ?„<1øÑ√¨‘CûÂH1úkºèØºÆUÍÙÔ∑$ª∆©ΩGíßÙÓ&Î‚Ào…aÕ£≥¿|π
8”J9ÇæøÄg´ã∫«ÅÉﬁC~W§ﬁIÈÌ)—…ÛoÉ§Ò‹fj∏√ÏÌÊıôf•Ã0F‚∂á†xb J¯+á°-—œM∫+ˆ˙ãÿ¢ﬁ…;–˚ü´Üc!£ì√b‹∏Åâ∆ñX¿%òVÑ’d,¡-™kŸ˜J¿\ÑÅ*a≤ªÅ∑•Bú≤≤.<¸J|†@ﬂÔ'·ÿ+\ÆO∆£æ(lO}Dπ”.<êÕe6¶Zx¯¶-Ò'ì!ÑŸÜ:Gè_/µ.ÓkÂ,<|-?±ÉÀìµ.
VM8àùX~“πZóÀÊ˙Ñ(ıSZrmª-FÖ2à10ÜTKÿ‡:RÛKcAwÛ∂:N“Qﬁ
®≥O]êmcaªQ’≈Å◊vdw)¢µ-˝A
“m"∑q–{°ÂHqÜÜlˇ≈aóÌ≈ò6~>B‘v7	N∞≠”Aåœ¬^ä)ñ¥3Ñ˘9Üˆ√Ñg2õﬂ™hPÃ”Æ•W˜=ÓQ◊0Äû*gÎëíçøå¡åQ|ïyöâÉc„	êxâ°êòáîˆèÍ1¨±Ÿµ‰∫¥(Á38—¯‘IÓ+)öï‚nΩcﬁúŸúÑÌwCÊé∆úMjßäqt±Ú;ÉÂàŒnªd¬+-∫Hù„<≤…ôt÷ΩN…º Z≈x`^?®?m…ıi‘ñé_L}¡∞fŸ&Ô·Õü˚ì°+pX÷…}ÙR4p˜fsD¥lD
ªXﬂ´lÉá·Tƒ§%iÈS⁄ ) up«|”∞2/™ØŸ⁄‡Ç‚˝√˙õÀa Iûv\Ò‚UÀ≈µ√˘ﬁ:™ŒúÙÜ∑ ¿ÅVñÀöà+kt√Ù’∑∂Ì¯Œ=‰l#/U?!”%/*πS+]≤çÚ‘F`UÈtó+(Œm.è›‹5älNç°≤ıq‹™`·™øëáV´«Y]v∆Éæcdâk%C1Sû˜U9XÙúX_x®ÖIvˆa™P¶æÊ…]©
…∫ªR!pÔLmÑ‘wWÓ∞Œl,¡±:v≥ì∏ˇŒ˛ö´√Áè_==@BŸ'œûº|Ú¸ôúËå‚æﬂ©†Ä>aÏDΩ–Öu√˛[åªïë_Ï∞”`òÚeP$9»˝'†ˇËÉ‚´c◊.ŒIEä±PóŒi»á˝ƒ¸≈ßL‘i?ôÙÛzyÚπZ6≥6‰©¢z2”Ω‰5}?ìø] ”0 ÖxÒdeñŸÍ´∑;Ïû¸J~·WˆÍ*;&ølû∏ó-º¶ıÀ&∞´};!$lƒPÌ–ï! ï8UVπPä0»v Ànß/‚r≈:
√ªéå∫{≤â]¸f…è’VuKWÙ9ÙuÏØÙ˜XΩÍ∑bÙ˜oÚ·î·CÇ∑¶»2SìdGü«®∏)ZùÖx2·{∞U¢ä÷#jﬂ¨u◊6≠\Fy˝ÛçR√∫€%É•dh-mÂràÅP™ë9‘q]uﬁàô¥Ã≈\¿O8˙¯øÔ≈∑,H≈rZ¿c1ù‘hF„ü3˚ä‚z*ç’!;∆ló5¡˘æ†ù`£˝br®ﬁÏütMAJóÊΩw∑)Vº∏6È ·¢˘˜äãÀ§ïÓ_¢·«5bÂƒ(˙ëÄäÜ˘0Åñ”j´÷ËT‘k˘wÚﬁ(Œ–_æo7˚∞â2“ºVÅ“ÿ•ùP9v”›§_`W^‡Ï∑9ü}Õ›ó‰ˆ›_œÜõ{ÀÈËôóóáWI-√ƒöDÇt¨|(.GOk/œaê`VZM∏é¿	¥›s CÑ˛ŸÈçÑí Ï‡}õ°ã¶i8®„⁄8Ø`Ω='wº∏Èƒ„Ã©A´Í=!—¥â281b™°§˜U-^Ètﬁ˛/÷∫Å™∞∫g¸TUmä`ˇI∞OC<ÈÌd¥ß—>){’É´ˇöq4$¶Ø¡≠¨äóæıy©K?ùuîzßï˚©ÃËıMÉ„µ1ëÅL°µôvòùÖ˝>è NAü vµ4<:øUåª`¢˜)V¿k∞"∑öôd∑jÉ‡◊◊* ¿9G≈_Â=Á‚^¢´«å¯ÂMâfﬁd+◊≤a€^[íc∫âtkíÿ®r—√§¿’t*	Ç='Œ≈Ë°^ÛÓfÿ6¶wb }aå±•T%åêﬁ"Ω˜¬„-‰î⁄ﬂU›Ê¥8é”≈%€$õ±“XS‚ºè	'…x»ãö£¯Íˆä„Êù?$,&@õ√¡`Ueú2ŸôH8^ PÔst˝œ˚¥p∂å=t]Ωq	yˆw¿‡«>Y\@:¯ªÿYãÏ⁄µœ rŒ†ScÏS£¨º£Ÿ?∞ΩûdAÍ_"Ccî'ã≠≤£$ÓO≤∏Ei)&≥Î¡yq:øù)q" Örå‰x˛%ıT=£ ùXØE'—ôGøPLûîØEudÚ>≥6Í+W!o˝mºöÏñ£˛yk”/_™_÷ å¡´ç)ÉWksØ)LºrP´ËﬁŸY6xµ∞n¨ïô∆»°˜˚ú¯‹‘6â´M~VÅ-?èR¯çññP…’i™ßNe÷'m3l%œëîÊí°‹‰÷í˛í˘[,Í˙0ˆ^ûYØsé‹FÙz§◊`∑ÛˆNÎÛ*á	ÍG>yqÎïÒ≠;Ï≈5±z$!I+sxÚ¡®spÊ ò4©ôÀ7rÜùîë ãb™M ëÛ5äQlNQˇÊóº7!ê…›Ï:]πNGo.|5µ7wØ'
“Zˆæ∫‚ï?YáÆÏ¬ZÕ'¿/“|d«Œ…ß[ÆDÆÒà˜ﬁ]∑ÆxìâŸ?#ˇÓùÁÔ»pÈŒŸÉ[CkÍÌFﬁSˇm›òkØhO6´∆÷á4µBZÀ°ÍÏ`∑6WÙÉWV1Ñ„;˛ª∞üù=∏"æ$ß/⁄áT’Àagsk;¢ 5ø
û6ﬁÏ∂˛lúÙÆä'ﬂÏÌ…ˆÍ∂ªÊÓnåuﬂB=˘Ûˆz≤ù ¬w˜ı°≥h~G©=†çAs6 T!s∆Ã$ê<üË-„öÁ∆~!{g“8q 3úúá≈ ≈N56¶‹‘„”î¯rÒ˛s0ïu8i[L5vç´ª·á%ÿi⁄0”4Ò_M(\ˆJ	–‚ ¨ ˙‹®O|iƒ3oR<Û}ˇLò.µ å“d†:®˚.:≤ÊR%~ûÜj˛ºJtnÃÌbÄ‡“Ù≈¥áA :íÚø'€j»£Avfã¬∑:Ëù°≠ıfÚo'|Ñv/Êæƒ¿]"
	q  ÕÁ!{r¥,Lœ0.∂T
}iRÇq_ÜDNà	åp[ç#ÃÇöˆ(ŒDƒ(íÄµ—”[Y“L”Eï˙é∞≥k¥M÷™8∆DyåGgìQ†)S–d¿ÿﬁî›¸eòÖ#¯ÄJF·)ê+S√¢5Í5]
Á∫˛@É?ıÑ,Áº…i€Ìéå%øò!ﬁv)°€ñAÎ‡Z/Ëxµõ†˚W.VÏq⁄≈j«øNzÄíòvQH>º2[ﬂQUP∑†“Oévv¸¯ö˝ıSüüáΩv/Éßp5RL>q„Ø{LéãÃÜèRΩ∞4Ì€Ò∑?¸˛ﬂÃä¥jÄ?,ﬁ $*_Ù¨<4b®7Œ∂ufÔ∂‡ı∑?¸˚≥›†Õ#åù%¸Ù¡’7gY6NwVW/..∫É89r¨¬äN}ˇ‡g’¿ˆ_/◊˛ÆøÒGº”%¯M,|∫WÙù ]	≤‡Dq<Ê»P≈–"û$^tﬂÊeå	JåIuAΩT”Ê’j{Mm`–Û≠Frw5hı¢´E\˘A&"…aﬂ]ºæJÉSN©*≤NuXeê–^Ü!+˝’√CˆõﬂÏåFã-Çlï´’Í87Ñ¸ÄJıùÖË©K®¯,Œße‰´£c¡≈Å!Œ	vj@‰ «˛‹z äaá¸ }ﬂˆ‘!G©“˜ÿjxÃ£Px≠ Û‚¡˚ÍÏÑ”8Ñ∆ß©`%åOPè	 ˙+Í∫¨É3'å˙a:é%âak•◊ö%m˙≥∑G{æFlç¢T>Qq0ÂíÉR∂óa¥)√ år)±˙.-*º€‚óÇI‹Íuå∫aWzˆQEÆ‹b˛¯„o‘UrW	ø»˛˝Vì ù‘'ÌöyÂÅoâ(
åTU)51ıÑ˛®´Elªé^Ôn»/*ßçä˜F¶®ƒæm◊•¿∞Óøk∑ŸIwÉÒQ)õ|›ñ;†Êrå“&Åπl∞&£ÇPÿy,åHï z¢.‘Â=∑⁄ŒÔ⁄Ÿ˝8DìxiR∂ùﬂ3ôâIúÚ¬4§/∂Ã9®oqüµ®ÀN<V^åFül˘j7™æ¢’Ô>WTß´+~«sè¢˝ˆÊGcªÖqbHäj<ø˘ØòÓÌ#$Z;í–[ëõEÁºæ‡'D‡ÑDCi'C‹¢jåªàùÛ†'-˜cPtÇs>dœ]vª∏º6˘·`rÛ„àÄ˙÷!ïì†ˆÛÅE¥µv,-√Ó/„~Z7≈-ú·elÛÛÃ  tw»¶ßŒÜr»G'âÄ’(b«[MóΩïDŸ9ëíà¢Û0O¬°úítökÿœXêNÕ=ØÛØ'È>±∆˝`¯ÃÁNñ’´ÔIãìk˘Éüø§|x*Ò0ëÈ/†:5≥e^'iëÜyØˆ†j∞Ï˜≤dfÓ7ë0{ù‹x-lL·õ˝Ωt`ì>a$ ]nI¿π$Ÿ¿>åíúL∫Úƒ>?RÆÛGèÿgÕ'”≤ Å™$QEfYÎkÆ¬¬fI0L© §Ô¶„aòuŸ¢†›à∞m—õµ∑K›oa
t·˚tríf`<:kÀlc©õ≈ØpRÓ√§ÏX÷¨Mì©√K”"±:Èy‘Û¿vÍ‹+ˇ
&˝HÜ«(Ó}∑ÇC±ˆ-Øm¸¡G≥«∫üìÀ~B.{Î}≠ 88’z~≥Ò9ÓÒ:Ì∞>æk <OP[‹Ô {Z·dakÕâ·1«¯ëÜ„‰DÛÖ¸e€U»Œ6+†™\Z•UÂrÑFôUı∞`Ì·≠k2ºµÿ¬≤hÕ)À ‚˝çt3c∑ö'C#)Õp‡a¡À≥3:ˆtBl‹@áñ€ÍÑ≠YËlîw™ºAÙ1|i%ãWNvöƒ£‚ûÎ?ÔØ˘&”´ﬂ£kZß#s˚Uÿ8COsé›ï“3Éî’ùoÆ{‘§ÑIØ◊KÒ„	Œﬁ2“k¢2áx˙yÈó —:ΩÉSv/«öØß¥w‚YY‰AP‡Ît¯r∂jAçË…1Ï;ë∏Ï°Ë–ÑÅÍ˜≤t°wà8ˆ÷≈Y^Æí›UjîWƒÀƒ«R*æÆÀöù≤≥ó√zä1jÑßˇ¿ª{ºü|÷∞≤Y'÷˜îÒDı@D 9¬*Å»t†	Ê)vÍ°¶ø,nñµôÍ(C%Êï‚—_+.°©aØ’⁄,
â,¬T˛Ø—(˛%ô≈3Éºﬁ…˛ïˇëaœµèªà˙Dát:ÃZ‹~U5Ñ±·™⁄úÜ¥Bºƒ”ø‹.πÏAmA¡ÑûxHØ*Ú‘©M…-ˆù{Y	—€h8ÿ,£úÍ¬9™«&E7ZPÏÁp)Ö‚
◊N⁄Ü®*≠/π˙›cAÛOD“ÂHŸvC5˛~ùÜWÁÚü˚˙ÕﬂÀ‰Ûå®*gfõ¯––≥yV6ÇGÑ∂<WπƒÅ4R™Ô∞ü)’’ûïM\!ÊE“’≠∫…Ô¢7&≥ë±≠	!Ø!vÆYö◊ Ë¡,ÃÜ–&ïeM⁄ú3ò˛ÂDn3ö«U‰5yó*BIñV0Q.~í˘Úayﬁí9Be≠∑ºˆöã¶.^w‰WR–?‡‘SP%˝P˛e˜£^∆›À$Hœ6⁄L≈Å˝∑;7t›–(πö¬ùZáC‘ú¨Ì“IJù7(LÒ|Â¡UX>r©u£‚TáÈe=™!v˙≥9)ˆE™%êLœ0Ûí>{àbˆÇècò≥HPT3Wj{°eîáO◊ï;<œ=e˛'ë
SG…ºT…5?	¢e¡Èx˚%¸ä‰Kúqäô«ÁNÉ`âÖxz®Á{ÒèÖE∫F.s åTX\Û!´%”$,ÔÁô¨äâ.wÿa Õb«·<–#~ÒJAºk”1>ÀoNÈJKY®ŸkıkNÿD˚ñÎf…[˘Ã∏c ⁄5§≠À¸ì• JFïo≤√°[◊76∑∂Ô/ï´mœr˘¨xìwÂΩ€>tﬁJúäØ4Œr&9,eßNôƒÚY˛Ùl≤XnTY,YÁeú√ˆI?e≥¸îÕrfŸ,ç%>Øtñ¥’€]s3IjYø√ïÌW¶¬L∏
Y™‰ùƒÿ√j¢Ã ö:,Î‰È3óöÛgŒ7Ye1ÊﬁÇœzÿ"ã¬*Æ⁄0ÓÕñ!ˆı$ÜÅW2◊>Ó8z1∏∫ßÍ˜ô¬∑ö« ?/ûuê|…‘ôjl⁄Üª´4ÁÀ?‘‹mÆÛ›’Øp@£”…Tå'ÙG0kØıw˜   ˇˇ dõâÙ