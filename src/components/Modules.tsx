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

  const openSettlePayment = (order: SalxúÏΩ€rIí ˙>_¬‘4Ä. /R©XeIU…é$rHñ∫w42)âLŸd¢2ºõf«l÷ˆi_Œ”yõ≥mΩfmvl«ÊV≤_≤Óôëô	íRUu7¨JÚø{∞ü¯A“eO∂Ÿı?0¯§AvdŸ4åŒËV'¶æ)nNÉq¯;ã4ãgÚ˛`,~æŸSvÕBìô7z,ÚfÅy˝5\c¸#kÔL√  ÇvèÕ'qTzÓ /“Émv√6Y¥òNãQxW3x{/ í0H;oﬂ∑v„ãH‹Óïyå'Åøò˛ÛXŒ!U.¡,¬4>é_∆co∫ÎeAŒÇ—|ëYÓ¬x⁄me4A‰¸DØØÇl˚ıÅ=?Ãä“óa*õùãK–ø~a0ÛÊù9ÆSÁöÉ9ªÈbøÍTèºi∞¶„xeoºÈ"ç˙Í5Ñ·–˛é:?˝ùßÏıbvíØ∂v”úΩ⁄‚´ÿ:Ìso'∆;I @ÕÁ∞Ïæ∫0/R	∑ÿ˜¶˚Û Íd	ÙÇ‹|ÛÔ 
•lùy„8Hô≥±ó¯Ã.pÊ±ŒxéΩÛ` Ç;
íÛpß+Ø„ÃKÒ &í≈,`ôsö1òÕ<éBxû7ÓCÁIå˛Û"ÃºÑÌ'aw7~{Ã˜2Ø«f^]≥q<É÷®ÔE–cÒÇó„È"LXÃº3¿ßxÎ{¢ç‚¥7˜íûósÈx'^>pË◊ÉçëB¶±≥wíÑ¥?C ÒÜœ/Ç1√-m‹-6|>Ò¬À;ò«Û≈ü¬9∞Œ96@¶M–waÏGX˜»ãy„A‚±(iÍ%aÃ` s∏2[¯98V&1\	ò¬ºòó$Äﬁπ«3X’≥E]ß∞&¨C£(çªKÀ∞ÄaØ§ÒI§„$8ÑÑ=lü·íÃ„0∞—ˆ»‚·H†µ0
aäÚñ;©J…ÿóLﬂ¥8Íä§ﬁÙfñ∆?Ö—$ÓAW‰	oXåﬂö{g≈Úé„(ÕÿÊ3pù%ëyûƒ≥\ÿ'0&@˛MÜ[†ñÙ‚£äÖ∑ö¨“≥Êé}ë ∂ù{NùŸn0ÖÕí(ìÚ“´h\5µîutº/ÃX:â/v‚Ë4LfùØ¯ÇeÄΩÂ”¶˚‚ö\: ∆‚Ä∏—7‹”] ÑIê-íàœàè5ä/^ r<¨∏`êNwê≈/éˆè‡åàŒ:]ı·k±£É$Pﬁ‡î¯Xsÿäi08Ö…!CI€›¡bÓcã◊ =‹§¡˚4Û≤E
`ù'±ø»‚˜rxpûÒá˝˜^∂)Gu”?v⁄°∑i∂°ﬂ§t¥ Å!»h8]¬l4≤’˘˙„èŸi‚¶È«ø ï≥—°MÄ#Ω>ò·û8n>tøë`b7≈™ ¯‚ﬂ¡4àŒ≤	{Ú‰	úZøÌÜ˝≤ˇ˝ˇ?≈rŒÅ˛≥ˆ^äøí`ü„ ëﬁ.{Ù,ˇ"ÉΩ8áÅ∆ﬁÄ= ëíú¿E^üzàQ|⁄•IË{”'l	£¡⁄ìÎs‰\¿] ØW˘*çîE 7»h:E¨NøÉÉ:NÆ:s†Mà‹¯óÊ•∞ä:±¢∞%ïam≤¥´ÅÈ1Ï∂ª7V,—:-%Í∫<hªwsêJu˚MΩg;˛p	q@˚KÌ˜üyáK¬˘˛4N8ﬂ˘∂¥ïÉ¯{⁄⁄Ò/mS+gŸ&÷"8£¿ˇ´ÿ√#Í¥ˇ‚«⁄Ê˛„Ue»ªƒ'¯Œ ŸçôD.Ä£	x´3‡·JÑÎùÃSb„:ƒ[≠ÃÉdÔ¬»zº}|ˆ
44ÜuJ{¿u^"oá¯‘∞CË4â<⁄ ‰ÅòF˛•ç-{$~Pæﬂßx%ÛpúÛ`≥‡…c÷˙íç¸p∆ëó¥`–Ú>L%â≥`èx@¥g^l=ŒãSÆÁaÑ∞≥úCáÒz¿uÚ·‰„Äa."xùd¸=+:ÌÃ€…"ú˙ä8yÖë¯(dﬁÄWÔ±?r‰$ë∑ëxÚ M‚q∞$ÿßlÎ/d*„çl!i‚"ò⁄äUº©bÈ⁄Öê÷Èd ◊)˚m>í.[a´√!“«Á·%\k$< €y*˙€"r¡∑%Õí?áBñî?\‹
a–ﬁtJ"+K@)ﬂ£≈ìßAp¿Ô~G§Ãöi>o‡; sﬁèIäå€]¶¿Äq„Òp1xî∑ÖáﬂÛ H0øsäK{:–}‚j∂˚t†¥àr∂ÏHBL.PÊﬂ≤Œ*H& {|•¥•‚Õ‹∞`
ª≠(>â}mˆõﬂ0˙*¶$€ﬂ¶c¿À”˜;±ëîºÙ`Cr™ıÑ-“ÄÎîƒƒ@«)åKü≤ŒTïréc†Ùù“s]\kÄÿ_Õ6Ãøf3Ç&3aﬁ„@È·TÄC“'‘”±ßÇÁ∆‰√∆úo˘íÓ•1âJ@ÁIÅRŸåÙ∏q‹Ô"-
⁄x˛ÒﬂàVù'I8eÀrY«&èº∑®åÇÔ=>BEıZ£We5–kÎ&Í¨O|o¡âŒ©ª†x¶¸@ªÃÍìh§`˙óíˆËb∏c™t∫üÜ»‰t:ÔaâÈ≠ê=ÄÕmuıCZ(4¨®B=S4	¬Ñé"Á0JxN‚oñƒc‡ÔŒ∞˚ê?Ú√” 	ËºB.^–98æy€pÇy)WR!CÑö‡bë'+ ı”£cÙ2úQ[hï∑az‰ùŒcÔ\#G ‘înº„õE)uTY‚à‘&¸%∂x±ê%hño,p'¥MıÚSdõ`ojì™¬(∏–a0Ü+.i1d~<¬ì«7ù ÂÔåQÌvE„Á|ú1:‰Òü®%yid_ä5Báêtt±CmtSÌó*04©√2:9EÙ»&I|¡á$ÔÚQMcœ)ÄË‰o„6Û“…a0¬Û@—e´¨Îá√/@>)∆¶–ˇAÃßﬁ∂Ê ∆ŸÓµª7’•ò:N>˛ô¿G¥DBs.h;∏|»è¬±óç'4ßÆ∂∞1p⁄4∑N{˛0ÿhºßÑÉMÔn≥M°e66ŸH6€ö¥Û±ù"c:-ŒÖü*%ª…IÏ±Ω”S;:UR-sçB#ªßP˝Æ*Æv˙&,˙”oáÔ¸»™—nŒ{ÿﬂ∂6›û°¥%!Éz‰tFYﬂSÔdÙ£‡2Î√ï ˆ≥7Œ˙ì8˛!]	.'¨;†ZﬂÊ)B¶«ﬁÍ˝‚9„a{Ñ=¯⁄xî—ë∑x`(å@ÓÚÅõG~∑´ÆÈk„ÆΩKÄ'R={ﬁ∂9Ä€Ô4∆Ën‡±v.†-Ô√éôÕIV‰á¿Y ?‡`Çøp‘LBæYÃ©Ùô¢®∆Uz(É°\ÂÑ¥à∑§$ÖÃE!ãvﬁ¶cê6Ö=0$H≤ëx|¡+0$8KÍth˚5…l≥‡U®uáFÅŒ¿˚ˇ‘hç„)õÑ…E∫¯¯o ÷*Ò‚AX20Èßâ¥—†≈"NpLQäC√É4ÇçF˘√«Òê; L.¢ ¿ÃÉc°¿5ç 1æ˛¯ü˜eÀs†}ÔÄ≈bQlP∞◊A
[éÊ\LÜ †öÚ√=˝¯Ô8öD∂.ÃûPƒ|¸“0?üZ1¶^ÙÒOL±HQM3†Éå‰qz%êMﬁ¡DŒÄáÏ‰Û)v*HË–"†®hË|rà=:;·!€Ñ}Öœ_ô*	ê§ıò ˘«?#ªM{¨√UÌ¨Ö|U´∏ëŒt ·`æ™"¬7ŸÉ|EÃv+EÀ›‘ˆÜ√Z©2ÿ|d´èQªÄo–P1π(_#“!“√ÕªœAh:”\:’d7Æx@*ÅÆ…#CØú≥*Üö>õJ@∞ŸvJ≈€ù+‡0 åç`∏DsÇıC}–nWJ¶6%E◊‡¬Êcîv‘ŒË,cqt•¸B‰Pê:aP√o*Ê=ŒåYé3ÁúÓÅ&óIMèYß‘≥Hó:${Ãƒ™Ç∂≈»„£≤ıæ ıù—ÓH%√(nê>M>0NB’j>ﬂ_]⁄§9Å√7A`·ç£61Hπ¸ÁòL“Xh!Oa?&Re9#Ÿüec4≥˜H÷…\◊è]ú?ÂbÉÚÍwÒ.aºa≠SÄP@b≈cÖÏ˛çrc k˛]º ÷uÿc‚?MùvŒ,à´≈€kÎ=ˆk˛ˇ◊_≠k<]ë,∞M Ö1;"ıÄ´e¢1P?ø›ÕüùzŸ+oﬁ9≤√‡<à¡ﬁ9 æœ„õÓmrÈÛZjN‘—É@äC.Ø√›Ì'*®P	Ñ"ìò#»ÛyÎ¿Ö.Ä'Ôx„1`◊9æÉÄ≠
›‚≤1mÅ}™Ù'ı±Öº¯œ]a6ÅàgÓEpè∏ﬁ˘„‡_Ç$H^zDA @√©	,˙˛˜õx¢Õ'=6—y‡	rÕFÏN±fËˇë¬Å5pG6M·QWSD£
m!ú‹ÛvK“µ«¶!*ÿπáˆ<9!‡ñ I©¶ì‡,ƒì&Y˘ë˚ghºº+N⁄ ¿ßzw¥à<c•#ƒi8é≤aUØœ',’‹(π≈? ˘@ fòÛµëÍsAÄJír{≥Å I®®à„
5E∞ÍH‡’ÆûrùëˆLO{‰t™ﬂo–?8û∏nÁËû"≥3'ÏÇØÄÌù9«vÓUêvîQiG™°"rt⁄µFuXÖX3ïXµRœµ|KMΩ+`]¢‡
–l˘Eâ∑Cie·˜N{ÖûOW–Æ’G•öê≥˘z1zk RˇUß; a]íÙõíÄ-Fº7ns—™ßqﬁ”ç{Ø#8sÚôJàèîˆGÚôñ6Êøó≥ØptO∞9vd9ñ≠|…Œ.R8†‰ôà+¢ÉÚÌ«Ã˚√"•s∏ﬁwf WŸ¡ÓãÁ{á{ØwF‹‹-$üå∫ÂdB^£≠Ã<rf¢3⁄˝)?,—6⁄à´ÑNAãê=VåÅíPÌÌæ8FÓ@%åiﬁ∏ÍëÿÌÕ”‡ø\à‚ù#e,ã†Ep – áb¢˙0Ã;ƒ· ·pÕ–/,.Z¥`ƒ<“Œ^pÍhÑû4rY‡R:iÑ^I'¿Öe¯Æéô'ƒ*í’Öï⁄¸í=¢LD&¡ÛÁÑ˜ÈÚ∂∫:T‚—∞;`£4gÍ‡hü¢yR»’·ÍÍ<ö-räSÑ‡)l9\˙s/Dﬂ≥	}x+¶˘àóªèö?Ä÷G<$õíE‹≤fÀπR?–∞≥œ/+iØﬁ ÆﬂârOÿ+/õfﬁ%≤e^˝¢ì| *È·^û|ß˚L—ç„.ÖŒ“œ•ê◊9¬—VKi(iﬁpnt¡˜^d∞æh
(¥Ω·@‹€˝"ó&—œŒ|‡∑pâ¨÷av'W'x∞‚Ù$}1Ó?Ú©£—Ë7qW«âøïía™'TÊ€ËqSºY" ¡,≈Ö~˚Æ;Äc}œCÍ´LÒöJ8 ≈8{·#õ®˛$æuÊE\d”FıVyMùäªÑkÄ5
∞;ayP«ƒ_√J5ú6;Ôqrÿ≥kjÂ{Õ'ñ≈pΩÖ-öYπü˝ì?¿>¸\•: ak⁄o„ ∫Ôîˆπ“¯‚Yò‡:#$/‹¶ ªÌí7ä`«Á°Ø0’Í(˝`
Õò1<.g⁄7óπ∏˜ç“^4ı§d•Q˚„ﬁXõ§$„VßqDË—–8"º©⁄„EÇ"Ë{ÿ~„z$á&Ò‘{/E[±â‡îW'¡‡“4Ëî∆[–$ˇ10%¨râ
?ï‹Iz†ºé‘5m´„ÔÊ &»i„cµ …ÌEZõõ⁄pnx®=‹‰ﬂo∫\¢S'Up(€Ö©‡Õûo9~wGƒ;sg‹÷#OE&n8{è·&.À!9Ï©Ôà˚Ôy4J˘µH8 ñ»™Í°hmQÆîõúÀ‡gõﬁ¢6J4|ì®úzô´Eï2„=ùÓd(‘c@l0@÷Ï˝\ ›˘I¨>í[ül◊˙êNŸt`ä˙¨Ùê.¯4‰¬!ŸñÑﬂF˝õê∏⁄ÍªÒ	˙ÒRºáà⁄/Æÿ&h8mZ‹Etx€“hﬁı6DÇ£]˙Ääów¯•…Œπä∆∏gxõ∞MV»g’˛4üSáÎJOŸŒ≈¶/3%◊TBπJqΩk)	á∂«∞˚“c4í∂T‡⁄êÆíã(˙,çî%∑Ú+m´DU°håHÖHÇº›~"]åÇhiá∫œê◊èP\ÇS„x"|T2è+¬s î™m√#)ºïƒQË	!Ö§8úó`êI¿âx˜π˝ÙMﬁ'í–“™ƒr®+W∆	1r`?§^Wòu—æ»ô•∑ÔÙÂ“:Uåü˙VÊ$Ù˜êÖ@àmÌh2Ët>zÌXR…ò¥È¯h∑ãÑWCôX5‹TUzÌ*ËzcûVbÉ∏èu‰ï&äì+á≠çòø®8RúTŒ“‘Î˚>hÓˇú¡È]£√ÊM≈YS∏cŒA£ÛÊÕØ·∏±ŒQ˜Jøó#«⁄O~8|÷cg‘Ï‘)∂gd/Ω4ìFæ-;ÍUˆ2i∞“ëW™xD!◊ùx®oäR2ZuÚqrªïà ÃµÑ\ìv®≠ÛH≈tÅv≤î+Åé«”¯u6QÃ&d÷«Ò@ù¡íAñÉñDù3y˝“8…:‡}OHÀ·zR,Awpd«Ä;Ú'<Î*Y\*0°·ÄıÊ_§Gã19,—Ç C•0^]K≠BÁ˝wî∞nÒ»P•"†[Œ–åB/øÁ
	∑ma·≤q5–R1¡”Õ}Éî(aõÕó"ÆmMÿ„£u∞Â{[mAuçJë‚¯sx»	gËQ∏åùdz«±ö†%È~í˛'ˇÅ$î¢ñû †%
Ó¬F`åÅÕkﬂ|(¶ ˛Í>RøÆ7kz~Æß◊å6u>*Ús≠∫"lz'‡·q¨(FΩ)@‹ø:Bƒ2}/J—≤D_Ô<áè¢a¶:øì3œ™ä\(πÅÔ%∂]∞—ËÄÖ4≤–Ÿeæßç’<cÔ(ˆÎ⁄›{S£∞Y‡=À»⁄bT……Œ›ÃÀ}±-‚öÙ˚<p!oKz’XÚSHtEnç;J”⁄∂™•o/⁄Í˝¸ï µµ‚”Â(=vÀ›r7&_ﬂÃ≤cﬁÿ6ªÀ^`Õ∂≥°vc¶Ω≥ï`‘ÂxË‚Ò;–#y¶1WÉë¶≈V»Ãå^π	b[Ìù ø¬Õ0R,Ï“RÄﬁ]®Êò·ÅõÚ∂“Æ⁄ﬂÌyv·√C’*8v;ø.mŒ˜≈∑õT‰óÕ¥7Ì'„ÿı%e∂˚ÃôWßeRñ·≤Ô∑·ŒÂ^˘¯ÁK»JSû{ù©û˚˜≈ìÀQg<ÊEY:ªC:ËvT«ç^WÛ >e•õ\±iÑL+OITvdn+|ÖÌŒÊhµ6‰—qßŒy`ü»[tQs∞ºﬂ‰¢ ë≠\y04'FÕ,HF)h)7TıñÕv∏´üv4:k`®>Ï^A˜ëx‚ FÛá0˚N+ V≈ku)" ªí-Àà
èùy—D§o“RUIHŒË¨	ß` ÀÑÇﬂÍWû-)üólY¶h‚@Ç¡ﬁ˝~Œ
©Nâ>O.tEëæOù»J–∏“˙^'L∑#ÜwõòÅÃ0ºù˚®jo«n%2?¿˝˜_\„¿Q|—Èﬁ|êúÚ&∞ØQ,∫‹·W§ˆ∏£ı”,Á›ÎTŒÊsu˙dôJ1Ìô7M»˚r©{5UÔ≠8@ç˚3˜W/ßÔÁzlÆíh„b∫il–¸æÖºo⁄óΩB ÁÖÇPiíí%’ëÎi¡É"?Zpß˘ *€:ÒFgHµ›`ÉzsU5ßÿ
mB⁄;˙H»⁄t]§pÄ≥÷w=ùQËªí'Ä(;àJgÌ≈√ o.⁄Ûó—ﬁ∞”ó≥Fˆ èV‡ãƒ.ào©‚ûë¯=√¢ÎD.ƒ2˙ñµ¸Q˚ãáMy]K¸®ÔÅ˙]‡V,ªÏ⁄ πDL˙•‹’5ñºö%ÈI€~nf$ß‡D@∂77úñ_XZ˘sSË©·4T≠J–6 {b€πT;ô^zZfõ ˜u§0hä§AÙ§ÛuÈ˙√›û91-"ä[=ûE»/pˇG IêÆÛÊBäl»`Ã't0≈®…éb˜U›ü·‡ßÆQuÍKÒO4¿Ö5:rî¿ MkÄ£Ùã-[îπª∑[SªËi	7=˝äÊ©ßz≤·sÜ+ßE?f>ÎﬁVï+ß"†?µ>˝[~Uzk*œoÚ!‰~û˘w„ÙˆTó‹?©#\Êf™;ú_ßg‹=¯≈âP˛êÙ#.»T:√ï˝›ﬁuf˝4?∑2BæUÓñúÓ‡agÄ∏W’≤ø∏yà÷)Óã•√êdÚB§|z7=«ìQåg'=Œ¯…¬9àÇÌ‘éømﬁ‰8Î{>¥ aj>¯≈(÷QW±SªˇêoÇ√	ÑNßÙí∂π≠⁄≥ˇı?â£ZDÌn◊Ï{ÉËÖ√'¢4¸$‡^‚!ÏÆ"3‚?~q-Œ|êN√q–È?F>Ï˚˘<Hv`]TFæá˜2Da”Dªäw@ó/)(£øp£MN’á‹‰áRW=:§õóÛŒÉPDW¬Ò¯ÒO2ÂÅƒ,q˘5û±b'éD^9R≈Ò”Í[≤)«\˘hE˙¨ûhÍÜ∑R,ªKPû*uL„@=CèOÑ#∂⁄äLÍÊ*J◊ºº4oÎ⁄ßÇ±ÙeYp‰9vºπ») ¶¿ûı ÕUı<õN∑«SÔ05‚Ñ«∞£ôÔA‰ómi°y*»≠˛F ı‘T(ô.\ü/£çc•d∞Qâ∂2“~yv›∆YmXEŒπs÷Á˚ó{õl4ΩÆR!íâ$€¡ ˛ÆÄ`Öa«∞âó≤#É∂»“y0O√14Òû≠º†∏ã'<4!ÖÒ‰úé&y)™Û2æêTßH9“>Ò¢(¿¯} ˚Ø©IÅ“{KºF˘q?˛)Œcì2ÉiŒ∆T´G)ìœ˜w„qgOq)√8Í¯'=÷πyizÎP°A—¸¥êñø»%&˝&G…j¡ë±zóÌ∂v≤à1sèFÓâÎ˚·ãÎ"™ÁÊí·O XÙ°;¯CFL{§yIR)pK	çBN)’±„©˝¡<)àv∑JéeµÀ˝ª=⁄L]Ñ√ïh‡Ä	ŒÊ\9Vúfˇã nê`:m‘±ë®q$ëù—y4h˚y©ƒO¬Ö®ÆÆ6'π»™™ú¢I¿YÅœÂ2|(Rë"#∆s˙éb˛å¸M€€"≈„8ÙW|ÚxÖ):"˚\û£Ä‘nÆäÕ%±‹\ó4±◊EòK∑‹2Ü+ìé˙ø–È˙ õÍxT5'M¥Ävú¯f"l.Ë¬íÎo)Å….√‹[≥AÚ)¡ª7Tù"ó¡$É»ìßóÕæsùûMA%mvì]ìy‹(HîªÛ{ƒv∏7zô„∑⁄“uB'tlüWÅVÉj¢°ãVèJ^ØAO”Cˆ◊SÃ‡£ÖÀÃÈÉ"4ñ]˜2oÓqcreªIn@ß*ãõÚ¸0$Q'B¶C¬SfvÚ kÆﬂ∑≥Mxâ´çñıK9Ê√ û%zÕN˚!Êπ∆M;,õ∞´º.Ö≈ı–]K∆myt⁄,]ñF∑Ö±⁄≤òe√j)Ê€0}ÅàÉ˛[ÛT${4ÆVfz‰€Á·îWó8N·ÈCLÖ3Äw‡Á÷w«Ø^“ΩΩiÄ„Ÿñ\¯?‰∏…(	@£Ï[◊b
î¿§#v…ñû√!Ó•)ûŸOZì˛[qÔ¨áÁì˛„$òuﬂ±”ip…Y≤>fÇ≈ê·ÙJ˛Ù¢p≥Ëá ≤Oä„¸Ì˝ê˘ãƒC~§ˇp8l—[ﬂb∑î_ Æ˝ã˛Ãg˝SÃã1ÔØ)IîÏ+ù{„†’‘R%Ãy\Ù◊ÜlÇˇúúı±òKÇΩØ¨â∂Ú+,¡Åﬂªæ6øl0’Ÿeuâlvbå ∆@Ê·ù0É@í¬Ê{rΩ1ºa+⁄8W`†⁄Ö…ö:n›⁄Â∂LîıO‚©œ|1¡ú≤ ç Í_Ñ¿W¢≥&}n≥µΩC˙8Ãˇßﬁ÷ dMÌ‰pÂút‰œ`mûÊÀ/∆†œ.ÃKc¢¨l¯•≥÷ˆ«ˇ*J¡Ñ`2o›òBöU"È‹Uï„3e7Ω¡÷ º‘Â≥Eñ≈ëæÜÑì˛ÍÔuz÷bq¥Ç„OÆyû⁄X*ûsÍu≥=¢·p®P!õ≠ﬁÉ±f⁄Í†"ﬁ MHå†_ò&Ë√9)π®%‹#M÷‘¡Ïñyñû‰…„Ï–2¡‘-¬H∑VÚÕ#üP0ãì$3q–+“°f7O§ßæÑ≥ Æ¢°¨2ß´‘¶ÚQÓ¢K_ΩÂI*Sãä7†›>ƒ@gƒvèi˙ëE∞0.≠t$¬ÌQ$P8°"äxÎ˛›à*∏+Ÿ©1`Õìlˇt◊ª≤≤P≈ÌJJgÄÚ˘	JVwe~º»á∆XÈ⁄-8DPuƒ
G 1œ?í[<x¢%n	±`(Bƒú9"õH◊äÚ≈jÙ∞h€Aà;Ó¥Q∂Ï∏lÀWàôäÑÉÁ1Wœ¶ùé÷ßÇ)ùy°ìQ‘Ω®õkÚ,7ÇŒ-Ó8&›Î ˇö≤*Há(ﬂI};ïŒxOπí]5ÈëB;“¢ë/FıÓÒ’ú∫%U/9ÈÃ÷⁄§Ø]CqUΩd!áôG∑ã∆€Ì\,‘Ωa¶Ãµ‘®~¿ó˚{“™‡tXïgß^rá˙a<çÒqÒÛ}øï¨⁄u´°üÂ∆°∞Â`vŸ>ä◊(vÙ’#√WËÁ{QüLÄz›:ÄõÆ≤'p´˝£Pèbøﬁ&≤`˝…KñÀ}¨º»Uöˆ&H¬”ê2≥,HÚ.·Ω⁄<»Çê€ì´«ÁJﬂ‰¸fq8õÇ„‹Å'œxÚº2€Y  x 	@wÄ~"©
“ßÉ∑√wÖº˚ /Z“ã,rı9t≤8=%aöìlr@πû—çéAèì¯Çí§yIÊ?M/;ºMd≈'ÕÇ>≈>Vêr∫Êˆ ÛÔ^ÍhƒeÛ)0« €/‹$‹—@B≥0•÷ô."Jôó}¸7¯TAIsç=Ω«ç6©πwÖ Yò©]bê9√≈√••ﬁ.Oç/ÕC√ f¶ãÑ”ÎBjÎ  zwî»I™~™fPÔa›“Î¬÷s”5ÄDÌîc¿f—çq7yï_°^É‡åXc$õ?AZpƒ≥0ÆÛõ(Áv»ªá^Å?[rÖ>·µ/üÔ[Ïh1„ŸZÈ=nA{¯¢Ú^ŸƒΩ§µkX£»∫Y
◊©¬FNØ……*GûöV}è`ëÔ<üÚWÌy]ƒË7Ò—ΩÂÊë(Ï_1ŸNW[Ó¡|ëN:æ∏Ü€m_–Aáïy=4tﬁï≠®ï¿¥Æh÷ÑV’GîÃ/∆˛≈Qjc≥ÁP‹éø∏Vz∫·›v“.âhzÙcØ—øF_\[V^¿TŸ∏>ﬁ¨x7›,Ω«1∏—’°‘Øˇk‘ÓﬁXõ«‘Ù®RˇØlV›ˆG˚ËÕJ¨˙>õ8¥‰‘I≠'ÙlLóÍ
èp«.öäÌ‘}é€‹¡ÂÀÀzÄ;NsÛX‘#ì ˙"…`v-∫$yo µ€&ã†Èâ Z"íÃÅ±ÍO˙oáπÍˇÈ√ëÜjótä:°Øá√ïáÖûÂòTQ\êñ„Ñ8}ÒGH÷ÄFÒyêúN·ôIË˚Ad”/r“ó>RÖ~ûM≤æC’tÌ·:«öﬂ¸FqZ ^5T<√YÒ.Òˆ/|¨ˆÉ•|©L«<{vı¬∑<ÙÂe°õÉıΩπQz,@z=ét≈CÎ”e√È;Ôo0>ΩˆSˇ-ú6Ô4ùñPCpX†π‚hÍçê

6ø–ÃØ˙Î˘*¨ÈÀ†¿Wá+Ôæ¨;ÛÊ–◊’
Chå+”Ÿ&øóŒZ∫F	R@2ZÄç Ø˜ÁqHçOp˘7Û9n¿=
 ÿL«ò
ıÎá<‰)§ïÜ›“R“jŸ5%ö∫g+ù{öäâ–uµµ≠†HNÎ∑ViÌ˝ÎÚ°∂v&¡9pÌá∏JBÒ∑˙ËFÌ'ù óÒCÿb+€7⁄àN∏⁄´¿=ëë¯g8ûÊ ‹blôsùHuS“Qi[è√Sø.∑ÈG	ö¿#Îf¨E>Ì≠ﬂ+S[ŸﬁZ91‘iöj3_ÅÎïﬂ≤cÔÑΩˆŒC>ˆ€y”§+	πHº9çìÑá®F¨Ç?ÉáÑ}Ùìæ¿1ôì!±jrOÇÏ" ™RÃM£•AG≈òxﬂoà ^ K-œ6Â%“æhä‚k›'ÓöÙ“Ω
DÎì ÿÌˆqêÃ(h¸ç∏¬q±…é&Ò|¡3Ôå›ÙlÂI•1‘T}¸w≤R˛ÜfJ6)‘XéÊ§ª\—òÙ2£l·\{#õz_:öIEôu•iÑ.^ˇzíM-(nNE˚π”U—
tGsL!êN‡≈ÌÕ…DOjk; µ¢≠cÿ8.‡àÿµë=YN¥hÂ8Ò“…ök “©GGqâ7=Ä/e*·xgj8uÆöò˘π˛*à$wûÂE&á:+”f]éPÊPﬂ ¶p\\v»ªf&ΩôºÅëﬁPiÂY„VN ≠\Z8∏€]·®I˙ÈöÅÒV˛ÿ™ı±Rk}„9qôZÏSˇ?ﬂï™◊àZ	ÓXêé¶ÕŒ¶ÒâHGL6óø¸	y‹o3{â’‰®«ËÑõGvﬂtK„6V“ÙXAyßgV‡páqó!œª¡∞^¸úáixRËh∏NÈ∆ú˙“,8<ÅyéÄêÜ>∫û˘îÿøø.^1∞VòºBe‰.œ˝ÅnªÇÒÒpÓ«Å‡ü√Òí“∏ÒÜqΩp¬ÛÆöê∏ÉJ'cÕQØ"‹∞ÒS– Ê¡’ìkﬁ·çq´løoÉCî¡Ã7≥0õºY"Ê˝
f?≠Z”¶v¥…C/åBt€Aíü¿ó˝µqì¸Á¿íØú˘xQ˛öûqÙÌ◊$åin∑,,ögûfõöç318=F';7G1»âOT¡wd3Åùò'¿Ë&W%æ~
v¯ísì∫•/ÁH%;¢∞Tt©e¬Xºí±ì€V≤Tèunq∂)ïo¨kcCkC60€<ô∆ Ú™ñLÆ∏x7å–i¯„Î,l1+3ÉòDP5WjVÔjv´$h ÇYx5˚ÊÀ˜óiÙ‘WD‘Úü\áRWÆ? v[*®Ÿ¯¯ˇN3¨ÔY(È…zã2æ|å<@QHA´°:lœ≥˛≥√vók<éL[Ô∑r◊Ô·ã˛c6Åˇï-(dlc#Â 5˜O±e$ õ¨µ≤C÷á¥gö=¨$¡œ?üÑ<±À¯´Ú˜⁄–˜ó∂ªL<Nì ùÏ\»m±~c¿¥ò ú-)˙¶¿U∑∫%oç2^_wÙ	£?’iDæ∑ÈS≈˝wÏR∆i¿´{r_Ö6úDö2¬Ö–∂#√py‡Í ˚y—"ó·	aí© ≠◊ ≥ÃoæÓ	Ä£ºËtU˙È8µö∞æåœˆô≤ˆ+(ïÉPâµ≤*™ªf>?.Q’≠áì~Iô•P∞k˝§2†âÜw
‘;!%Xc≥¯çm+lÎ-%î∞Æ≤xbá!ˆèÿóÄ¢~K!€gúhò¢ZÔüﬁÂ`gg03¯Û‰∑πîòı*~„è"Rº˝«”‡ÙÎÒ∫©B∏äåƒõü¿?$œ?ÆŒ` CIÎgJ’†-s—πé!û≥gÄÁÊ‰\+g6Æ°~YáÊ¸‹T7OÆZFÁA˘úì*ç5k#ÿé*˛:X}ñcø¢ÕGï¨D„ñÀæSo!'à\˝Z÷3ÜoWÂ+˘ïu∏“⁄>ÙN=6J≤î["ª≈µå∆b˙››ri÷ùK3ØY≥ÈÚ…˝„p∏⁄Ω<¯n‰ò|Æ):BØµ[Ê˚ÛZœÌì4„i‡%Ëó[⁄KÍßfq¶›ïπÊ¿WC“?ÊdUaµ’≥@>PÙ"G»ÖUÙ0é˚Räw˘™Í⁄NÛx‘>‚8}ŒÊtúrbÍ~≈±hb1ÑJàÔ∑ØÏ[ÿΩ≥lçÑ¿¿¿⁄∂2¿e*d U‡0∞	Zìñ£V˘î¯˛émõÍq˛·dS=£hÆ&¥_»´y÷˘aƒk√0Y©åé"”ñ≠V*ıØŒO±}·€s”{sËRŸ,m:‘X§ u⁄Æ¶òÉÑ∫ˆπõÜÔhÑŒ<i7‡¸‰K
ºÃk¯‚¶~à Â,µdêYpùœ„+mVè˘àMköKÂR•îUìVoÆs"∆5'√¡öƒÆ
ÿÛœnêé7YˇÀlï¢∫É$ò√(ÉN{ÄApΩ∂u{ ®Ÿªo_[„d?)–O`Æ‚Ù›
Ó¸Œ≠aΩì|¸3£Õ·≠MÙÛ√€…∂‡Ω…j	ûË'ìÉs˝í‰˙æëá(ñ·\˜•k· §!l¡påö–hU@Eûa∑Œ÷ dıSrkkvΩë⁄`WÑ˘Ú@"¢á‹gΩMBW„ãåÿ*7™‘ËpïOK9∫÷]ÍX˝Ë“Q¿‡«åùHDΩ?e2Qb;ZÙ≤ «J∏kv'WGI¢˙®∞a´4Y	ñ
›tVîÍìÜKA%Ô«ò¶ﬂ˙⁄‘´˚Èq10ç3ê˙Â¥yœà"πQ/˙¯'  ãΩP@ÔT÷∆q¥\q‹Úí•\’tgˆ”ˆ©™,/tÁ|Ó∞J≠íFÎëË¢≥Èx¸!ç˘bŸ”èî≠ª,m´÷∫D5ß∫ıÃÛœMCr¶œÂƒ∫G‘nlImª I^T’¨ìàÙrÌ—
 ¨äá7∫∞à⁄¶Uå@á
xÅ˘¨⁄N2MhN©ÌWë_¶<÷ƒß⁄Oå˙E≠’¡Ó¥ëÇ`1ŒOÉÄ(£πMµ:ä÷m&¿OLvæsøÇΩ	Äıìxé¸BÇ€QıLkÃÁœs1ñS◊rôj,±ÒCQn©2eà∆⁄(S‰`8©–*5aÕp˘¬`WÏ˛Ø–	èØpG√∆nıv¨≥Gâ›XW0(£bYâç|IE €8π$˜“&cÂ=4,ÖR÷°ßé*U˙v5ÊëLhKe¯´@?˘”π∏Ã™·[k†5‹‡öOi 9Åç1*ı∂é7U%ﬁ¢;ãp˙uµ~QGN'c8≠PñøƒïR®mè´4a  –-º(◊»ã∂µM©ΩC<A‚¥øãd)Ôƒ/Eƒ®'rb$ËØÃã%ÿBkÂ8]Lu9Íµxßö»Ê§Óä€∏K}?'ÒtzÇ|	zÅ ~ /|÷0’ïG@C∑É…›FÒ{∏O∞H›•≈’…¯O$x·hq¬Q?Q2>ï)›0»‚∑ı)µÂM”wF˚ˆÆAñ¸D`Z7¶äJ
∞ˇ µü9„ÈPU<˚‹™R∏óπÚ™m±Q£πq_JkÕT\f?ˆ„Àπm∞œU°pVÕó¶ó)lZ—ã¸Ωë+µd∫Ç¥¸π÷pÌÊ≤j⁄≥∑R,Z⁄Yä˛îÔkÉ¸rEõû_∏ÈzâÊ#cäî™Ò|™®ºµyÛJ¶hÓØ’ô}Y`gË¬*ÛºZ¢kÀËoÆU
˘Åuæ(.TãYlˆø˛gWÑÚ,3˝%@]≠Y≥LK}o®æ¨ûS&ø’üi¢ø4'p´ıSîÀ.Ÿn^ŒïtìÂY‹^9iNÌ˛◊¶JçiyÓú-ÎÖ'√l*D¢i%◊º|wöe—qB√—¡tÀñK‡zìÆÒ1ï<ã$ Ÿˇú]°wt=£óA-]À:ÃkBˇ.˙¯gÇ·K|ÚÃ•.3œeÎŸ]ÁüT2óú4Mﬁh	„ØÒ⁄∑›éŒEÿ¸’eˆ|ø˘±U©Ω≤ºpÜ	X Ö2}@∂¶evÑ}D˛’„±b>¸Ù®<ZPÜÏOÉ _~Tn|Z∞•1¨l–Ÿ?IQ+…#YbÂ)Ç „∞*4™s7INmå{∫≈ßïü"xÜ(ã<é·àOÕuy–eq/ŒµÒ<t˘C#ø°cìtà«'õZ çH∆'™Ÿ∆4òf‘ú2º‚—òG@Zí¿jóhÓ0Sﬂ⁄]|hä∂s4˛∏i·güÚöOîMXöL:§=Ÿ§–Â“ı[bks∞,^7oŸ:˝ñ…mó\èó€˜/™à˚Ëiı
´çT
 lEñbü'¡«?≈≠f}6ﬂU6¿[Ó5£…ügóŸπûÊ
„≤£Ñ‘m<÷µ@èÜπ(YNq!E;©ªº°N≤büÅq™Û<âgî”ıñî•bO ≠k° Åπ%;$é5π˝^|Ç„LwŸºèΩ•∑xﬂ[´¡£D˚F]€Ÿ*LzØ39ñ¿kß!f;i0_JÇ"h±¬JQ¶ø&¯ªÄ§Â…∏4ÇSŸœõ„BIûç˙l¥;‚Ëy<^§.V¥È&#⁄1âß~êòå[Ä	•)€eß«I”Yü»
'¢∑üWÚËb&Ï}ñsπŒ0d“§f01T!¸Úöíöu&h˙p TÜUOôÍ¶AKNîõÒãÎ‹OÉ_“:ﬂhr‰◊n•⁄e©ﬂ•(Ì‚s≥¥À`˘Ö
øÍg1Ïˇâ≤iq‘4∏fû.	ô€Ezâõ;D‘∏£5Ω^iT/'ú∆|”∫kè!≈K€ˆ|1MkL€ÃJ'åxÓç√Ï
∂Ck=kv ”«eÜÆÙÉ™6≠Ê˘Iñ•Í#Ñe¥I˜"
»Ì<HK◊‹;IFÈñ^AÁ&∫ÄU⁄£òn'ëà\’YxÓâ¬L@”®`Ç")›°YØÀÁ -à◊ù„m*?9[eÃj9¬∑?4=1ç,IRïÄF¿|û<]^˚jò«˝j\ßπNlp≠jïøømò[œåÕ˘üïm]‹?=’Æª	rïJ¥¡~kmW¢` ˆ#•‡ÁÈÈ]Ô7^„πyE#|Ûr∂©k&2c¡D˛˜˚ˇŸq 
Qx|£‡V¿làÒ¯„ˇ`Ò‚<\∞òùÑÛÄ¡E¯Ay@ºÛ0ç{"Ÿ)&¸`ßãàúX"?~–∆ÃŒÿ-Üœ√)›)ídYØzƒÄ!%ø™¶-&—L·<√‘´4{œãhÉ=±“&'Ix≈ç|ØcÜk'’sœ∫1ã i[Bâ≤Áhy/ááÀÓ(ú[°‡u˚uúa&b⁄,åÿŸπ@Ó\Ω5òÛ¥0»DP©—≥+¸˘•@gΩ˜:I¥ôg~ÅÂÂå˜Æè»¨£ŒsêjÛI ˜ivêO´S¡ß·áR¯PsÍÙÀy|ÃèöjX Xˆˇ(QP‰ùg‰FÀœ"/}¿†ﬂò'÷∫ç2¨jƒ<LÜ%ì`œ®F!#o2FÈ±—#ﬁ\Pı=Ω$î˝c…¯⁄|
 uD¯:ç%‘ıÄ‰«ß(tﬂ¡,dòy,S'Yføí‚ˆ	hπ[§
e"<¯X˝§‹w›t¶∞°‡Ë’p≠x>T^FJ¨C≈2T`sÇ„*vÚ’phfV¡RüîˆT+GF|¡_õ0{-aÊ$˜\ JÂQúd…‰˘õh¯Ó∆Y í¨<
 ‰3+]§Pzmm?˜2ÿºÓ(œ™±º:ÜS“{Ú ∞÷6*$Oã.®‚óÃq£Á∑¡:Ñ√ãŸÛƒ£$(ª·Yà5‘◊∞JÍ•ı ±UC^^öµ\“Æ°tª7„^¥j
ç›0°Í]jç‹q\f:¨ÕùaF!¯õ®~H‡ïŸ2HÌê€êç<"‚≈\Ç∆Ñ‚ªHø¡MuŸz≠»`Öë2ßÜ=W∆Q‡%„	¶Ç/%⁄ÀúJ®4`•√#}Ω⁄ı—*ÅóB'˝ØπÒ}’)ãﬂ.œ»˜E›k"u†"Ck≥Öˇ˝ÛÆà.öD˛Âß»Â≤°È™TQö‚kÓÆ∞∫Z¯:ÂX&ê%WÕHnchuè≈[)|0??
±∞úßGF›ô9{Î<nuÄlL©n√}x+•∫•° –Ö™Êns81-yª&|Fr∑2˚Çd¿πz¯~Ó±/ òEq·≠_Âãˇvµád|Ω«6zÏ·;rÀˇ±ú—òP˝÷πº©~»¢9µd—ﬂÁ«UÎRVkI¬´S^¶πP]56÷π–'-¶A“¡èµâ
kÃ÷E‹eeœï´÷l√bU˘§◊€é∫K´Æ«Éªœ=Òº8˙îWºì4û.»ı¸4£‹ñ∞∞Ù}ù≤ØØÆ¨1û!õ {EPØ„í)ù…ê»ÂƒraÉJixŒµ)Yöh#‡+›≤<⁄˜»QÚJ‘Ó≈∂U€{,N‹;õ)o˛ÆR®è`K˙2“™j»Å˝dıuØ∞Á ‡ô€í£m ˝à*"]`—åeœæ?⁄≤˝ÔŸ≥£C∑ÌÀ∫Ùn‘uEO8#Á—◊sQM¶'û#zÃeYr
>à#õÅ*›<bÿﬁ¢UyQ§aπ‘˜¡…¡k"üå≤6⁄Õ≥ÿèS+( éÂ.> r∑ˇÍ`¥sÃ˜wøáø/_€¯‘;G©I<∑◊l›”ˆ–Ì∑}èkÉ«Æh≠˙•AWPi:uEKò•x	ˆ÷Û˝„ò<ƒ˚ïgI•ëçÇ·e˙%-5~´·6Ö„E∏ŸsPò1—>å&ì$¢‚à¨ŒïÂF∑ãÅ^5ﬂt;zLÃè"zÁ ¢‹⁄ŒWñ‚üt4¥áí˝æQÏ_EHπïæ≠´ŒU<Â_1Ω\⁄\T0?v∞˙j>Y¨œÿ‹Û|È!AÂ{ÄH˘÷P«Üù◊€˝<q7˚w—éÌNp™7•#_WIêPËlµ€-0Û¢ˇàHt•gÅµ˛ı∆ä˘Ë[Hç~´Ï®r˘M–ÂKÕ˘©±§Ú∂É'tº„8•Õµ…’JvåGöÆ»ÓB +°6⁄`∞Z„Æ‡	Ù@Å∆~Í/ìUU§}‚
§F|,Ò≥kNﬁ)/-ByGˆ¸6Ó‹¨SFÚC

ßÊè„}Ÿ]≈πY>^&πKâä£.ΩŒ£rÇ{≠ˆS¡´ø]{\ÆﬁUW&@uÀ3ÁÀoÜ”@ismîyÚ¶9ë*U8K÷m‹-≥ñåΩ∏SsøMGÉkïπ˚4k=ÀP…Â–ë·Õ˛ÀcêvF˚lˇ„Ω⁄{}ºøTˆ>†:‚Uë„•2cÆ¥ÜlXìwº›‡)4ºÈ9ôAC =ÉéÛ”	ñÈa¶gàì»´3ì‘hÿ&ìÑ>Õê•ânK2…|ÿ)øï.ÒFbëMß¸ÚØåTÑgÀÇ{"FsøH2±≥ˇ˙¯pÙw"Q˙T§’i¢/*îî≤NU”©´÷/E*†wD5‹zØnﬂ•ûçÃñ˜‚3Ç»·P˚/`GFYßMµQa'‘πqXö@‚‹is≠J≥◊_§ZçÁx;íø5~Ob˜¶‚ﬁê_;Kº+"ÔøTZ_[2aJoIöˆÀ°Ûœ_ºΩ|Ò/@ÍﬂÏΩﬁ˝“â˙ãÑgF√ö©‹'&`ßX ß&Áü˙='¨Øº¥•¨"4ù7ã¬ı<KÖaÏzHîπg>àﬁès°˙Q#∏ûÜΩ÷Õ≈^¸∆ÿAUPÒπ“æ€poùüÙÀ2˚ñ]A1Y+„{ë˝zÕí˝öÛπy¢kC°U†ÿ2°![≤ñ™9Ö∂îMn›»J±÷o)õ/àºÓ7˚Àã¶Zt4ì5`ú˙=	 ∫o≤µdá·îÊ‘è∆ò¬5N˙ü¢KKì>#{ÂÁÅ'2Z¬95eﬁŒ≥Ã´§#¥´£ÓßÚÅ∞”&¡ÈìÎr·Ù·v|
◊Zp:çÉyˆ§5∏ú¶ó=¸∑U&l-≈jÀ;^Õ˝Mﬁ∏‹“¢Z∫Œ(o£P2“‹|ñ“ˇÚ2ıëûXVΩ?òzQ8ùòÂÈ¯«‡2›Êü∆¯`«J;æÍc*c¢ 3√]jôñ2Gb•ﬂœß±ÁWî§3G-M«√≈Ã⁄t¢eÁôÂF ·h∂wi,µçª2V:∏,P˜˜ÄÙn—|Ãvü
Í˜W±ÿv7æàå•]jïÆ•¸uDÂ‰”∂SïênÀŒùl=´R.—‡Ä)uÒœÁ^zP≤4«∞∂…ïÎ…€á$í≠˝9çÖsıdh√é„≥≥i¿ΩæF”RÒ[˛qZ‡≠PFˆ ÜøR÷~J	‰E@ g«Ë‘Ä$ÚÉL–+/b∂ƒäfn∫ÏÉ›ZyV¡nﬁmAı\ıÂLR ≈ç≤‰x«ï%«Ùf´˙l1˝·ïó¸0Jºr≠d˛q-Í+æ0¿pƒÏ¿;ãY«∫Ã7›ü˙™¯nçNËSa“Â /*ä˛b¿˝+†^®=Bh£ù`9`ÔÒ\?¡=MΩ_‘u$7í. +∫U·Û¢ˆ. *à$/	ÛÀÒt&,ßÙDÂÔ[°ƒ2-Ã2:·Å~¿gIºâ%6<):˛QJé~ÃvC~Ô	qﬂ†ö¿çBZ
˛ÎÌp0\{ge¬j*G.jIëKxóRÄ¬iXéó∫Óº-ÛF,ÙA$°í6Ì£Ú„ÊáQbﬂäÀX}ìI¡˚¶Ïp-ö·B {?Ù‘∂TË‰ç©9wÉR∞}?F0*çñ@ú7¸;`,É¨‹Ê;Ok”ÖïRGå?ç˛æë˝•ÜıçË¬ã oﬂqWAáì†[4 ∑@r¨ó“ P«ﬁI_¨a˛ù¯R{Bﬂ¬XqœVt ¢ûv÷y…∑5µ§ãCõË._¢ã|ÑŸ\ç≈§2∞{ÙO4Hkâ–®ıÊó*tÙü∂)”owÏ∏^ãj≈™%∑,ãï6¡†ç™•ÿŸÄêœ‚äÎêtL#1{Ê%îàÉõ◊c ›õÏ H\ QÉM∞‰&a¢ø)ä	Ò$ê6ﬁQÊeãîúî)Õ †ãz*GìÜ$/◊Ÿ!oC◊ÀtÊ¸m≤ò«lUôhŸ…ŸË†V@éÀ)˛}\{◊(¢:ÚA‚b´FÏue‡—b”9É
ÕY¿ST4«ˆ¿ìGà'vx≤™˛sÓuMy#	#táˇE
ÇÖ√œø	)ª»MwÜŒBQhP|ƒ<È≈)ñ°lme\¢≠ı˙$V
©¶VÑàXïU#Eñóz∆◊Bd,XqÌË›•®põ)•0)·Gª}kú0K>üqQ“†ŸYQ€∂¢q\Â ]UVTò`ÎÀ¡’ˇæŒÀ‘≠çr±°5ƒ≠Kô’-◊«Â·¶zÉáH˜íèâ}¨aî§q$Í√5†ÇŒÚü‘œEì∏b˜Ÿ`≠S¨]x
”\V”¨"FÎ;˝5ìjπ’ˆ≠]ÎhtŸ´F1™ùº,Óö∆)D˝´•Ë?–:îái;¨ÜiﬁÒö™˘hm{Ÿ«?ªÏµ˜∂Ü«V∫ö<éóXøL„ØiØ;∆¿x{¢Œh˙[Ú|”§\,]mDøÁÇ ‘íÌπYC∑IßB›aF(˝µíÓµÕjv¸÷‰=q*∏çúÚÈQúd8‘D"o~ÅªX`ûÌ6™˚=¸ª).TlÎÎöv^ya 0ÀL
sÖ≥ Lbjönaï¥zÁw~nãŸ£˙˘í4$k ¥5Jí¯çgø©˚µáø4YS¯—3ﬂœO4ó=ÎTZ)3B)üb	^¬ŒÍ˜p]V_—eÆ”¡º8îDG—Ωí◊“\=Ù“ªö˝m˙6µì“^'3M'ˆZ^
,û«¢∫
⁄U⁄x)~ã±¿/{<˘√π;˛¥⁄—ùTLÁ~*’L‰«âo£∆ÃãÏ∂f¸àçzÓRTO√Ã@&øÇ˝ıïö¢∂8∫ë›ƒù	b¢Oèv ˘í £Bµ’@c‰“°;ÄÈRìoùk "wP[ïcù-ÕÍT˜…œ≥ıM©4Ÿ„ÄÁº˛í=«ùE)†ró¬éø ‰£Ìì≤a¿?HÍmÖ™Ø;.WlûgêàÔxN©ä6≈›/ÓpqıÖo(}Q”Àû0ÌëJÍŸ{x!…bU?=c#~Õæ¡u˝ˆ{<«NBﬂ¢·fáÚVeC?.BL=¨ºˇœ‚Jmˇ¡Ÿ"0˙•Kï/éΩhLıwÚk∂Wﬂï}∫EHÓÂn,å}øı¢Ã√Keh´r>~MàK(ﬁŸïój ëd^¸ﬁá5 t`$œ¸Œv?˛ôn6igú`·GC;…«?˚µ-—<í kvòcq˝„ˇ†ïmúƒ”@≈3~°z
8v/	µ—„5 ÚÍB
V$∏ﬂæ¸ªI<¡äo3 ±p/ò∞›üûmZ„t€çÂÅ‹öcªÎ¯xl¡@€k“Ä	Ñ.»∂é∑mœd‰g≥…:‘0wÔãCﬂˆËxx…¶H©Í|ã¡HÅT •€‚Ï±hÅ(≠#S¥ño˚ÎÍEˆâd/ƒSùÛ¸IˆG÷ÈÃÛü4,˘ΩfåQÊÅ§úß8Roú‡Î˛… \[ﬂøzπûÔM‹Ù÷!üdëÛUnÆzn,n€Û<&,†lÖ¶ﬂêø¯u˙ŸD˛d7 $Tz:†zÄÕ!ói≤∂7Œ($æì8_ë6ÏñÅƒ—¬EkhÂ)@ ‚.Y÷ªõé∂V¨ÃSz^l´¡)ÍùGÆµ2Ò“Nå&ŒÓSŒU:€dæ∏.ı£π|p‡aì‹7nòàÛ›5†å;ÏÈS∏æiÃÑ‘‹Us \åÉN']Ãz,Ê<˜b¨OßË·->˚ézËˆ‡˜Ë9˝¿Ω	ÉØ
B√‡≥ÿﬂÔ®5¬_|+Iˇaw4ö§ƒc	$˝≈¡Yê=Cf®W˙ ‹âö9pˇ;ı±i Ïº'êü~„◊ûƒ∫Bﬂ1mπµa;C-:„$¨3O¶‡k;7∂ãïuÊùÊ¬Ç&wæ¬ıªqÚ˙5¡Àyk|‹ënπtW ä˚a!ƒâÌƒ%πMˆ≈µB6nﬁï¯iú˜ØBÖiñM∑ô∞±[Å‘(‹“π@Ã¶D	∂¥Q~jÂGã:∏Œ°≤C^BW;5’7π[v ¯πOà∞ËûñD%ı5X∂5\´+Ÿ7 ÑÖuÉÇ/-˛P—4ì—òêiGqKvM'A}◊;ì‡<â#‘©YÀãQyQ9+“mAzLß«≠$Œ(ØŒ„°#¸@Ù]ìÚÒ∫LÊÅo°ØI `¬¥:ôYﬁÂ¥G0RUÈ»“Ï
)Ju2é`2¬)&/jWgÒ‰ÁÉò?"*üÁôm6EπÑAÌ˝.†ÇÇ˝º8y‡~\›“,D˝)ûEØºl2òyó˘>ùK=∂∂vEU1…"õd√i¶Z+"ÉÒÎOH'áÔ8	Ö!ˆ'Éú≥wµQâ∑K–÷§àa~—	àÇÃ}¶ê nù†åé‰ŒD<&Ü…Dxkwı[õùÙWkìœ∫yÀR‘¢áé ÜûÒ—∞‰à∂ç«œr“rZMAìl&ùÊ¥—pNF"\E©E±œµ¬˛*5ΩUÄUNÑñq^*¿\GÇ[ó!Ï⁄*T„qì Ó˙⁄è&{9A≠´2ìñ•ò]ˆ◊kb’ØUY≠
ßM´≥Ñ©L m H(Ÿú¢dSùß°í}Vf⁄∞ *Y5N+¨≈«∞o‡‡9/Ãá]ﬂ¿“Eò~z‘®¢≥≤¶?¬OÌ‘'˚+±ÅÀót7÷∏6¨::DOË_≈p%NÔZõr¡6ÍN_=X!âK6A¸,˚÷	¸SO˘ÁZ0ò»ö
ÜxxSr>RÚ™Wà+>çå2†ï∆«Â€º%.‹„—∂Ù6n|ﬁ5ÿòçÄÆ(≠Ns•’}-A≥¬»ïGè≥p+ì6N7ê˝xº@U‡$ˆØñ3‚∫ÈX¥∂ÀG≈yÈIæ∂ôI:Æ√]eL¨Sˆ‚8JÁ'±ó¯ËØ‡z47óîm≠ÆW
Sâ¸V≤∆:ﬂï&°·2ﬂsΩ&Ã)Ùßyg“æ¢LçŒ§y˛™–"7(rcˇ⁄Ï5›®¢~ªﬁëvÂÈgt…ıBn:Qﬁx≈Øπ^!ãâÚ¯A\Å‹ Ç5∑º‡⁄Ÿ∑€πøA› ´ÏlÅZÙ◊≠ŸÕQ_≥w7D{Ìù&(ﬂ¨âÓsıÈ¶Øu± 7~QGzmê–^{æ!‚kÔ4A}ÌÖf»–Ë;˙[£]Õ#Á¶kfàq≈á—>LπwöÈk„Ú¥YY¡Y÷*≈e∂6EÂ
¨x…∏üwÒ	#*Ó∞¶¨y1√–r¬Úaótj–«<"+∂5¶ÛΩÃ[ô`EN,"KAmtOnÏÅ—Zƒ,qÑf‡ßÕ&¶º*gI3‘“F⁄çiKŸë∞2√#ï#T•~…BÆ_N!g¯%Ö°LOÊÑ∂Dƒ,Áﬂ◊ı${3Q√J"®–8XraÂµõÚ\ˇπ”úíÍˇuM3AÇàÁˇ≈äÍŒˆñıl[0‹Ì˝¥¿àTÙÅ∫Q'4°:©?.¬ã8ÇÕXp	òÖçXOî∞#ÒfÁ@ñb˝ñb¸Ã¸ÔE%@«ä^[ë5?òlèÖ˛eeﬁRÆ¸ôŸ$ˆ•◊¿ﬁÔ)ˇÏ˚É—¬l’Ô_éûÌΩ<zÌ¯É¢–nø√?≈Eã^´™1Fê"Ë√◊ÿSJân˙_\√º™ïˆ àÉÄÃ◊ËdŒ©à‡øS¥[Y¸ö5ÙW?Î¨§8QΩ(Ì!ÆŒåJÎC5[âŒÜ?Ó:ıÓê	˛π{¢œıÜÖZ û•_S.
›≈^I≠É0jÆT©ï45 g5‘
rl´Ìò‘Zm1â“|ÔRŒÜ«±⁄3. Z6≠m⁄#cëd˜ıΩV™A≈∆,szÎM⁄+¡ÿäqÂßCÊù,¶^“è≥fízßy
g¥A1≠«⁄æøÚÍ’ |ÿwﬂmŒfÌÍZ∑ÍÁZ•q®«Z∫å∞™>]Ï¸JÒÉﬁVõóc™”ë4¡°⁄‰ØKgáµïX4∞_ô÷ü¡êEñ-T\Wé∏v.?†e
RóŸcS√èA-ÈÑ6ﬁQÕ!Ú4Ç.Ó∆òf”ö≠§ BS{∞ñ≥\Ço¯º\eû§ıò ª≥îg0ò§?Ÿàõ•"'ÄÖπbôHúNyå‚ùBEâÕt±ë∑∆Uêå˙˝>{µøªO¸F¯≥ZÚ…£`DåíΩ¯ v·9 OX/Èˇ\„tzè#ÖB‰N<˝π^§o°Rç^ÓΩ«ëæﬂŸ˘˛w{/æ˝Ó¯Ë˝ÓﬁÛ—˜/èÛßV+|ÚÆâ 7–ãFˇˇÈÉÕçœrâèÒ0@Ï¸érY·ÏÆq™ˇWp≈n–7ó/‹ΩªÆ`¨b.á{G/˛eÙ~ÓÓÓ0nÂrˇ¥#ö—Tl´‚±„˚l’YÊ§Ç9é£WÒ"–?)¨Êπ∫`¯tè0K¥Qèπ´e«—qºOËÒª∂eK◊ÄiÜ¨œ≥6P%Bnπ ÊQ∞Æ–p?°éxô∞ÒãUq.∞Yqk&û$^ä˘>0yπáØz	÷’Ùí≥Ê√Òp…ë5EkEÄñ=8JON≤™:Û0SZû∏ ≥ëaÊuGÄπDP∂I˛ËıÑe©EœO.8BóLä•FÅNamî`ü'Ò<N»e{
ÙîØÀ90dè÷ñäNX†0	¬ÃsnÑÓñ{1çª@q«Ò5MÅPœÊ	,~íÿxr˝Íp¯O∏Ë ˙g¡‘sÜ†|}¶fôôb∏;ú*ƒ"∏¡ƒÇ)r¨ÚÁ¡ŒÄÌƒ~xØÏ¢6!&|Êl_y´º¶Ò	®'ﬂ’òzBMD»sG≥Œkh´«^∫*Ïç"]w`≠‹öØ˘I¢¸]‡˘‹πIMJ (JÜ÷r≈ÜìÇfÅtª/z—+/ÚŒ…9ÿrnmW=K]$«Èú-E.È•(N∑N;ÄÇ∞çÄ›“éN‡û¥	Ï≥í9]æc™çÉ=Û≈\aªA:NB
∑Ñﬁ∏ÛHX©ÊÖ9≤1·.mÁ„ø„W˚p¯cüa<®Ï≈—‡f≤ü∏˜Åh÷˘“†Çÿ;’~±ãûπ˚∏*«ëí·í[µÏÉ·ﬁ”hË¸.ÊÈéÖ‡t1¶e˙Ãã]bÓuˆ€#ÿˇ§≠π™^„Gœ%M∫Q§ãıZQÖàª∞⁄†⁄sË{·Gﬁ√cÂÀYú¡y◊ß´_DìZBiü‰ç`ÓrËíZ‚À…Y˘9◊f∂´[ƒÚqéΩ∏à∑~bª∫ÎëK∞qGıPõ”≈8¡VÄ˚Lû¬t‰ö` ï7„ëˆÔkÌ	¶§nÚáÒZ‹D∞SpÕ‡Íà¥
Èü¶N†∞G‚ßë∆ôÎïEKçéE≠†ãÍWÌ«˝–‘⁄
˜øÊo≠«eµõí(∫¡”7ç—cÎ$æl1˙ÜÖ.ÃÃªË„)`—ΩQÛ5ë$¿–¯,wDÇA+OóéÏâvpSQè(”íËUkWª%ëWÉpóxl;ŸeçÀ⁄◊¬C^q±’µk´‘¥‚t)îµÑ™∫ñÏ*"£r∏œ`?_–ÓÍeÎÈ<9j«'®≥ û2HÎë¶ZqK_=Pï⁄OQÍ«òòå13˚øŸnïØµöL•“Å¥äÚH ¬X∏-ˆ%≤ÿÏå∞c8›ÄìÔ»¬†+˚…«?q“hÀB°ç¡ÅknUz-Ê|bÉE¶pyã_RµPQ˜Bõ@›∫Á∑ººìmµ©Î∑ÂQÙŸÍªAÑˆàz˙Ü-]€&ãzî¨ÛÂñªÍM˜få≤&á“¿qW§î”»K⁄˙çV°°kºÕ¥9í5ŒêëÁù¶yz∑≥…9∑ù|4ct¯ì«·,àYG…T~ï2|ˆÿ∆p8¨3òÚè–»º	íºƒ/;#‰\π„‘èçC¨ìJ+<qµ⁄Ωy°∏¥>,Ã¶◊%L™¸SèÍ®µÿÿ»E∂	>uŸ?'BÊΩñ0røO«`-N™/ﬂ)„úŒˇÃhiTO2ÏçÂR'ü3ã£Ô”„f≥\Ë$ÓáÈ[Fr6–<7◊áJîÄ<:9ﬂ‘⁄˛G)ÑRÿDAßˇxyvØI-˘ô (µ7˜>h™ ?À(ÓŸe“K`	Åf–#çÍôgA:ãÖ+/∫’œ0—2O »:"Õô»„3ÛA˚ã⁄≠$SqKπ˙≠áh«Dó.?Êuô∏Ü;ÔñÃynMpı¢ãh≥Ø∏u_5kJÄ©ô¨»ÃuhU"NE Ó*Û§Ÿìy™üR~an∫˙~én#GjÛRlÌ±áç.ƒ«{@UL<áïEWCàkõêU	èFŸ¬≥îƒ”?Z@Ë#Yô #æ1«:Q8–Ç≥)´ff“¸Œ⁄P?nÊS‘Û'˝’z?ﬁßvZ&r…'MàïìÆ—=:}+Ìß® }wﬁLı≥≈ùˆπ⁄5>Âè™Œ2√{ê°ˇ®	oßnú∂,å⁄pV¯>π;]zg^¨ÁS"ı„¬Û—˘Å »÷Kí¿«r^~úˆt∏èE~eèÏ57ﬂ%°«¶óE*tBΩœ‚4C;´¢W‰%GÄbù∆aÉˆY'∏l≤Érì~±:ˆ É@^£‚wó@Å.Üÿ˘©7%õÓÙ,Æ¢√
ªﬁÿc≠Á¯¥«~ﬂb¡Ï+LÏM}9Ï"Ú#¯Ñ0°≈åO∞¶˝Ç(&Ìì$ Î%¥≈çåå‡‚‚€íÍF∫0
T£^#Ææƒ”£KIÆûÓrÂlêey`äP≥`
KÑwÖõÌ.ú·Tﬁ≠eÕÛÍ∫R˛îµπS⁄JÛ∆#zb*Hsé•@ÇqxRV,ÎŸ≤]E£+.f5í6S›V^Wji(≠¨‚ZôùØèÕ°U˚§Ãaƒy⁄°°\[ÍæB¯(Z≥÷E2?<BUÛÍÕ;TØ .Âµu[iÕf›÷êﬁZáÿZÔU„àúbx5Ω.∑;dd⁄¶T°ñHÃÜo]â‰˜¢±BCBŸÏCáËº·Jê°t."±Àp˙jP˜ÛU¡√d°ÁØûûÔ-‹fç‚˜ÛæÒd¿_“7ı9¶Í¨a>*Û”i⁄ ÙÏâÁo¿∫S][‹
'≤i@$t”†XHX÷;î„'?˘ÆÖYÒÛ¿´é	jê•T≤<#ƒÕÆp∫”˘áÛ7áÁIÕD`;0√"…Ùh,ó«}É@Æ`±∞èNC8ıë´ÂØ∏Ãÿ!3jóî§a¥Ñ¸«Ÿ,ÕÁ∂Da¿Ø7>‰˝OmC|,,‰’(Ÿ»Ë≈!ˇ‡…27g "ã¯1>;h“KwΩ◊0©∆|OQ\≈ã>˛	À0S+ò 9!÷™çbÙõâ—Ë3÷cß¿j_|ºŒÇ¡`–]Fy©$jz¨ìm}≠§©†?ùëJPlıﬁo´Øî®Çï«JÇY›eÖ2·›YaI¸<†AT£í0Ωhw@t)åg≈%≈Ç÷≈≥¯ÃˇØ›–zÙôt¢Ë*¡@˙ûfÑ˜íA rÀ"
«íRµ∞ÙóL‡é/l)¨c∆ct|áˇ‚9ôês„hèÌL±`{S,ü$!|	··Ø∞‹c#‹IMA6Óˆê®N0:fûÜ” ‰5+a¯ÿ≠ß"Qmr 3G‹E\úz}•làÏKJCHŒßúf/RÚÊå)ˆõ Hìƒ`fiB[ñ⁄j>L6°Ì~E≥†2∂≥¯pŸMÒÆÈr#Õæ≈√Fñ„^4ﬂ82Ó™-sp sı⁄íiÉÕV_ÌΩ˛˛˝wÔ˜éé_ºÌé†‡xöæå‹ò∑Œ<xì“Û\ëÄfÀ€ñÙëıu "Ñ)Èq¶å“"kÉ| êûû9ıŸ¶1‡GMr…TòF´÷Ãò2!3∂ΩÂ=7ÈáßËÃìd>ÓâÔa‘°f—«⁄pÿ”zßÙöt„q∑2ë&ˇ∏Ú@´"K•∫Í$Zº“ß≤ÕU∑t¬ﬁ¶ﬁTI†Êï’}Âû*i†V’<P¢ñíª≠ZrﬂUñ~'¡õ ¢1P`zªQë˘Vº÷ËΩ÷Å Œ“VlûWtﬁ ¿’åé@^ÉÖ`"–˛ü0—◊]ÀRx…Mpka"˚m∞9eN^N`¨@·âÿ%µ∞?¬Ô tÌˆg(©aÊñï¡E`Z}®ˇPqÆ|\üWœÜkS∫’s¿çK Ú¯'x±Ù^zçô‚QuÊR
ˇéw·ÖL1æ >‰4Lfùˆy,Eü\Ë´Q∂Ñ˘¥›ÌvÛÉ€©°Ωi‚ÓjÄ/Àvy4¶8\JôgælmÛÃÅ;a2ûkzm:*_î»⁄9Õv?ˇ4PU|‚EâÖÊπf%⁄{]âº\im÷Nm]û√}øı59§Y-≥%ü7WPcÌ˙4\ôü’ÔÌ^WŒÊf€B∏TG·YÑu}Ω–ïIw©,¬œJ€æ–≤ÇiÓà)ùÄÓ&\qGZ}Câ–T:‘Âú±§≠Æq˘•≠üË≠÷ËVTÆ·¬∏UV?”1¡£H≤8—¡««àÂ2‡ª5h8ûÌ.Ê∫í¿cø,“ΩœØ(ë^f)≤Ω|xI◊f)ÑÎÚõo7„IÆö0¡b‘4ÓÏn+|»X£O¥º‹jZã˙z"ç¸ &[æ§MhAHçCï∏®„¯ÌªCåk˚>!ƒq5Ãûyë±Ñ"riÄ}¢Ûç´Côì;‰ •Ù
œ°)|¸SùaJÇJò`9…©V>ç•»Æ¶ÀQ^¿÷OJvÛ"Ûï‡8Nºtbà,\πΩ8l©;ÀüF÷◊⁄ÃQ‘[≠cTÉÙ◊U3ú_@~'5gŒ´Ø_åéø?\*oNQp¸é©ôŒ∞9˛Ézä∞3ùm?◊ŸÙL˘π¡.ß œá<ﬂû+Ì∆ﬂhús}∏Ô∑~LËÏ˙•dçÆºWzËoq ÈEÃäA2Üæ“ÊSë}S÷d÷ºí´5f§[qtøÄêaû`ë√ı'œ<ˇ,∞€øï|n\ë;b·…g6•Ùf§í/‹∫tª5”ùÆeqã[+;¿5)Y§ˆ˙·˘ËÂÒ≠‡_4sÛ°p»É—∑˚5FÌ≠Ç€›÷';¥%æ4Î„(ÇêöÖ&è™nT]üÛﬁ¢k-Ûz¸7Z[Ù∫‹ ñj∏U≥¯™ 1’b6èjJŒ3U˘¯gcÚiô0H}‘÷òã)Mı	˜ê á÷!√<ÌR:©QûL2ëü*H·‹Eõ
%S/íO’˘7\õ”¸ÑV"5ªÚQ8”â·†j∑ã©nÓ‡ı´ã´æsd5≥¯ù˛¨!’ñ˙Ω˜b»kh›‘Ó‹@DªU∏ı=‚Í/1‰˙ÇÆÔcÔ+⁄˙S!m„Ï{C€⁄ÉÆZ	Pëπ◊‡‹ñu¸≠>û-lû’M’˙d]¯sÍyÊò l˘nCã.iHﬁ≤•ﬁ6˙µJ◊Hõz7∏›ü-›¨ÜNP9p∏‹b ◊≤<:JÄ≤≈∞tÔì}$¢˙õa3Zb&◊,Ï◊mó˚≥ÿ|m‡S8ê’fåä≤[tÆm».2[Ëv⁄õ‚_#ãô› VW%ûpË4y©eóëy´l˝Zf4ø[ŸªÏÊ¨⁄˘í·@ùnŸíê?¢LV⁄¶ä›®òØñùm7ﬂΩ§¨L´(\aw“∞B|p%‘Ñ 
çÏV•Oµÿ{ó„ÈÇ0[7 -5ó:õ—›3πf¸ócûyΩ¯jÙíu0∫„„'Öâi•qj¸kå-´lÊo™∂d7¨|·“∆î€öRniHπã≈⁄`ç•ôÂë”Ü≤q7J)f±©mÚÄiEQ-,2Wäô∂u~‚4µUÙ§∂‹§&˘ØÀV≥¡&ˇ§©Oj•ib›nT∂™IE¯≠…Fc…U≠8≥î©a≤—` ‹8µî§yÒ˙…È÷,Æ∆≈ÍÔ›¯u?ÆK:˙B#~“¯cMvÄ≈RôyÆq˝∂zì	F√≤ù$DkB}.6Ωb[CF~AŸª†$à\Êù§ù(∏¿<vús+ûÈbú!Í-Å¢ıô˛P>Â°.ìèÜiÍÎhvW€÷6¡dD%MlP…«z∑:vµkPÚÔÛ¨ÛYçV4≈{2\DõhgYEEcl∑≤c—H€Û´≥g·ÁŒ6-¸,Q÷Q=ˆ~9V-¸4u±ll›¬œΩG‹““EcπOl˛eZºsV/¸‹Nˇúv/¸4EÎ%Ï_¯πgƒnƒÅ›’ûV˚¿≠Ã^E“9ê¯ÛäÎ$ˇ=}´ÎsÁÙ≠øöL≠2◊·˙ﬁ˝=]+ßA∫÷‹1û˛b¯¿˝7RÊÃœﬁ,{ÜøZ‡®=<)wZO›¸`
ÁfB™¢ÚÊÍBû¥˙} “R7n„ï˜∫ÆØâ±°µ5àBÎﬁ†Ω]>Œí˙/ﬁ™5‘˚ã—Xm∑È'’–W'Çµmf);ZÃp?WäF•lEB9+hã^¸¯´°jnFˇ¯r÷S]cZ]ƒ™p}Jî†Éﬂ{,Ù/ù≈vçëZpY≤´weB’"¸ßV<#1˚ﬂ`nd ˙W7óå_@ÁXS¬Ô¯¿?wG)*ê:_òWsÔÿfR~IŸ`}, ≥sH@&«L?Ùà˚8`øe≈çMÂFWﬁë3Ïﬁ=Û^ΩÔP≈6hÇÂœ√»ã∆®¢{_.ÖÂÜhΩTŒÌ!ïsS1|ÕÖ‚z]¬ˆÏVÈkŒw•"ÇVxU‘E8F√Q£ı≤ˆ‡^∂V\¯¸‡S}£Ï‹e‹1µÁΩRÈöÉè˙_- s∏ä<›,˜.ªã∞í≠ûfÊ|j$ì‰ORG$ñE∂…º"q}@Õ˝§»ΩÛ 5!â"hv)bH«%'ÄÚ–D)˝#ïfıAæDV§≠gM4<‰—JgK»S∫˘®ÏÊHòIÜºº6g]oëÁódÏ¸∫nP?≥ÉËù§3´∑ÁÜ∆^Õ@ÚlêïA˜#eù∆ª®[≥çû’*u™ŸÎxÓ%!AÄÅ⁄ÄâÆ^ÛfË∫D˛¯2Ê≠#Êôæ’˝˝∑™FÓY[IÎ˛Øam´l‡NˇÌ∆®¿ë¿ûﬂßör(:ÎÄMıå‘>fÏ˛NÄˆ¬4•º√Å»U]5∏.¿ö˙gYj§Á	˙;í-K@Í<‘oΩº“˝éKbuDø>dŸuºÁr«µ\ﬁ$Y∑ÓÀüÃyˇNÃåÓúˇiŸä€TdØUï?X∂tH#§∆œÚàçü¶»çü˚Cpó„ò#ê†ªÒ”,∆°∂°&∂EŒ–¿¿XèÉ¯ijÍ{¯[≈#≈!ø÷gˇHT
π$ía"üãö"¡mP†9‹„9Y·Ê‡CiÇü5ÿ¶f4ı®ƒ{Ø[˚ÜHÙ◊Ü#˜M"ö›}MyX—Ω,jutQΩ…∆u≥&Æ»Udã)≤vcº}”’ù7åw∫J¥—µ'∆∏ëve¸„"(î6≠)Fë˜a—ºˇ∏àGπ¢ÙO\6ûı”qOß'∞·µpóu”ÌfÎEtéJø‰ÍUåg&ä¶Ïƒ≥π]=π÷ﬂ∞Eäfp¸◊(∞ƒlπï?N?˘t7ä∏üG∆ƒQo}§ãYå˙~‚Sy6v$ÜF’<©«bQf√∞*oõ:å©ú„L7÷72Uﬂ.∑%êßa IçV|ÈbëVº4km…«ø¿47›¸c›W< »wVYN4"√!∫»£fﬂÂ%Ø,rã‘^Ï4Ú¬“’ˆ“êZS„az¶ïTUSxÍ>
K¯9Ÿ`b•ˆE-b‘Ú%nm{Ÿ«?¶•:éoµP«Ò_Î2]wDFÔC`˛UâiM4oÁ.≈*TÈÍç•j”ÕØdˆŒ9Ñfk˚edø2πlyC:3û¬î™K:‡Q7k$)≠JCj∂’ô®öã#ó7Ìäx™ˆÜÖ“>ßtÆdz´
ô±Ù	√¥ä~3J6C‚X„'ﬁ‡¥ËÚñ)o*ÿÆ_‹_~¸Øã⁄9¬›ª√_µô‘≠Ç®À˙7ºX!ÛÓ0W≈ÈZò◊Â¨–ı£=`”»Ã#+√:UÎ∫™ÛFÊ*F~TIg;>ù#`Qâﬂecœ˜Do™¬Eñ3≠ºˆÈ6Ë]5«	ÏB-˚ın)ã¬ß†ıkÀ“˙B5kbΩ¶Ÿ50?ó*cË%à5∂A°=.ÌÆòp˜Zr7à^ıL9ﬁ`h∏éÆ„x&:ÇØã(ªaÙ¿«?≈ù¥ö˙5If ˝§»âG ;[∆7∑äﬂ›6ˆ*t∏≠⁄}	ù ∫ªÉaµk’2 Ω‘‰ÒvÄ+˘∫¡'£n˛ x ç Q¸ (Ï:ÕEóü
|À±π˙—§•™ÍÚ≥ëRªœ'R“Ωô]öì^ñé3ﬁÕﬂ©®ès|R∫4õby®Rißá2Œ¸M˙ûƒïi|‡πíˆn√ë‹XÔ˘âÖﬂ∂{KoM÷l¸0tH_◊Í‰¡|ªdQC+ˆ’2Yk∂~ó—xRôÑB∏M≠≠9 …¢øE π]Ÿo∏Ê∂P Fg@˚Ä∑M-Z¯…ö,Œ˝,!£m®¨µ√HìfÇÈ∂å˝/E˝Ô¡Ó (ë¬ô3I≤Yº`<ZÕcüKŸ˚ÀB&¨x{⁄aw,≠åü€˜(N≤gW6°¿¶€;“ﬁ2î{ò™√ãÆ¨Üè˙ò-ØÂkvL‹FÁgÑ†ñUÄ÷!bD94QóÍµ‹¡°ªtáÉ≠EÒ,®hÌ5‹FTŸûñh˛ƒIEÀo˛ÌqœèäyTÁ-ÚÕCj™äfs€Õ®x‹›â;Ä÷ù¢\>[(`Û±˚D*ÄÛ‹–td‹fOY€√øõ‚ÇuOà5ÌºÚ¬8Y°˙Ô»_#±A‰¬$¶ˆ_ëºèu@ÄÚ€5Ò6Ö·Î7Æ≤ïã∫Iˆöm∂mç8†w„ãËw@∆_{¯K/ò∂)û˘~Óx¬f˝u)¿ˇ   ˇˇÏ}€nIzÊ˝>Eà÷´¶…"Eäj5GPµ-C©ñZAJV%Y9SUYùYERÕ!‡X¿^`cÅuÔ\Ï≈‹¨◊∞◊óÊõÃÏ>¬˛ˇôëëëUEµ‘Óúië¨ åås¸«Ô xY||ˇ‚îŒÑ›}äƒ«ó¬ªrü->›xr©s>»œW_mV@Ae´Âé˚ß√14ıuQ∏ıDuOﬁ^íGGÃ∞Nr^úqº4œ<¨‹ã≥èïJ;ùÕ7ÒI∆ˆ—(Ù#Î43÷Oµü:¬À¸∞”≈Ìs≤niì’ØcÓ—1#eœoß†%º-<˘f<H£û5Ù“™ÉÛÛü≥% á_Oyº‘∂O˜DvN†D÷jõ{ÃÈ¯ºú∫ìæ%∞?_f2¡ù√ö˛(∆;plqk2F∑¡@YdDõ&s·ËhIîÑ[Ê∫Ö›î6—ùzGÕ5VªUvˆf%IÜﬁÍÊ±≥…®B©‡Ω≤yGO∑8Á—ö˚€ö·#0“÷AP@4_ƒ£˛t»C∆Q/â∏^bÂ√$wõπ_øå°ñæqéflX¿3!/ñNëó&NêOäz‘£¸∏Àì"Pñ^¥gƒVéú∏ƒÜ∞ÅkÅIwî–æ23‘ûÈo¡'6=vò"
K©ç3Hç;ròX0j¶˚’Ô£A?›Ü:s‹X™a¿æÖ˚Ç%®⁄&«I7∫˙˝’Ô(h
ó J±<Æ˛º,N`˘∏ÛÄgbôÙÅõì—ÍY∏Ï*£]pÓ¿º
†ß2àM‡úXˆ~ü&ÒY´\1uÖm‹©ÅyÒÇr^‰9O+øƒÍ‰µyùå∫rq ?Ì¡Ÿ”oW¸ùwéìQØ’`Ÿ›A¡óÓWû¡-'5‹˜\$´¸ÎP©àé„„w›—¯◊ñc≠“àµ[
b≠¬Î®º≥xe=Ö#∂a˚|Õ2„G+µ3ï¸•FàüÈ¨'À∂∑÷U∞ıï∑Tö√
IÕ:i]!Ïá3Ä\8*ÑÏ2 °◊° ∏
Ó<\”≥ tU"JqÙÇzÕ	È• z…É¥oëh]ãƒÍ∫.§.o¨{ÕƒqÌÍ¯\#2[sâ	ıÙ≈)q¢∑Ö	>ÓßSË©∂Áøîüë∂]"Û◊tS–Ù¸”<à…@	4Ωv∑kN˛}8¨Q‚€¬≠K€ä≤lü[5Ÿﬁ9§êøÍÒŒØâ‰˜'ÒmRê ÚãLIægËOˆÖÉò¶LkÑŒX⁄∆Øõ¯¬úÊÕJ∫Ë4Üt^ÿGPy◊ÂÉ•ÍgKÛ5iû√Õ&. πH{—¯ÍÔ∑YL¯•òOÅäﬂÇæ`‰îÄü∏'˝SúØ∞<GË6N1’;òÌ3©ÜÌH’1:ﬁ7JÓâÆ˜zi{ÍÊáÓ¿/´Í©ﬁìº^Tä`>Yƒ¢SÅóâŒ∆¿(EÒù∑VÿiäËXQ2∫˙C7ÒB@7†˙pIeHÇzN}+¬Ùs]](i‰Ÿ‘tÏX1hÖûù°À{Á˘Í-ÿ:¸T9ˆˆ.ÇKø<ni#–9:YÒ}ç≠Ì¡&ëJvF=ÿ◊˙ëÄz¡–[”^:±õàÀ´ê‡–ˆø'Õ"h◊“‡m’rﬂ‚ô<gÔƒ«Yú˜wœ9]Y∫“n~€O‰S⁄Jgë+L’i@¶∆"èóN3–tÖ.Xa¿)ôéjxmÍ]0ˆU å≠Á¥”BR4c!ç∆Íh:ÃgCvú[[VË£‡Zt˜¿¥]7‚Ï≠=˘?=Nﬂ≥’/a/˘“dxZ~ ⁄ﬂÕpö¬:4ƒ ¢O&÷ae›~AJˆKÉ˚°/ÛA1#kûÑ˙˘GfV˙Àöäi‰ò¨e1+†vê;ÍÍ±⁄Û!∂ºõv7ôˆ@¿ôGÆù%ò÷í_^Õ.∑yèfÃ#W»Gh#™Zs◊÷ÿLeé`sÜ2û∑íäx¯â‚„eÏ!t=»›09∫åáÅn)[íPKK∏Å<Æ·∂!ÖSÑs2Iqé¿ohv»L$å∆À‡ÿˇq' &aÑÑY ü¡ΩøÊïÍeììå*ÇM‚—Ç:k∫ı‚6äpG<U¢¢oßâR∑`óΩı8~Õf˜—n]ê≠†·È7[)ÿÅ‘‘ù‚Ø>åcÅq#j∞¨µÌUQﬁùé˙òõcy±Ò"’QñâıWÂÓçNTêöÛÁ\•˜rêH¢Ê≈ﬂ≈Ù§£‡Ó”YÍâùﬁGE≤Õ–√wcÒ¨£]Æ2ÕPÎÆ|“QÚA‹ùÊ≥tG&t’ò#˜ÃRc˘§´£œ«I6”ÑbπïÇ9æB^¨<(˝ç“¿íﬁ6[û§∞Ä8¿ ˛~%˛¶@¸mkçÑaËr≈V^±∏ " è RÂá˛“‰ö*€+>)Àü’U¨#•∞!€ìü)≈â•Í/ØX>eq;ÂGeiÚ√⁄⁄KF´ﬂ~aÕ1Í(Wßø‹rπî•Ú≈wı£¢≈ö¨`πNî.?RX|XSøbq(ıS>S™'?≠ÈHπ(î^,?R:P|h-Ì≠eA¡3Ø‚l®ÆR.Ω‚ßù	H}-Ù¿=Kœ§Œ∫⁄≈j‚2ûæ÷UØµL€LO2*7eÖhwxB∑Û=Ç/o©æ†Ò36E(Òï∂∑XK4—yöUÚÜË¿ê∫TæV⁄≠6ŒRr‹/=›IpÍÇ“÷*^Ú€ﬂ⁄ ®Ñ ‘ódS¡(“{!O≥I´≠∞#´ﬂ_-äÛáÒwÂ µ"k=i¥ ‚÷ëÌ≥;ùØ˚.R^g- xùµJ¡Ø≤p˘ŒÇ»5≤≤∏™TØG÷;ßÊ)µ\˚õâíÒ≤àœóç±÷∂À\˝àxK˜9°˜◊1l&fò–*K¶Ω
vs>=Óè˜7/‹á¸•¬lÿ €ÔMU+‚L˜/Ñ=utˇb0Õ/KΩm&/‚≥Bπ|"=M"¿”L/Õå¬$∫íkêºñIç£^!Ìb>ç§•tÅÚQ*HuxR’–¡jîî˚aAØX√–‡/çı≈‡ãÀQ™¸Íê¶
˝s‰o^òRE,ªhñ|Êä´;∆†:Î◊’çó∂#°uL\Ú÷"Ç•ìÿnO4zê≤ïp)qƒøª¯;ˇUw’tµP$Aªœ√tåTÈ1]ﬁ˜πå›&’’d)≈®kÅOÙÍcQnm∆3öπ!v„ëuËÏ6ò,$P9 .,.◊ê◊Zﬁ∏≥ˇÕ≠;bÂﬂ4®}Âãæ¸ÊÉò)¥Ä4ˇü_˙&ƒ|#Xƒ∑)Ω≠çïô∏„ó•∫ûÁE;åeNî2ßØJ⁄û,ÈJd5oŒ@ZGcﬂ"Ì©ü˜∏mß(âéÚt0Öµ0àè'∞ﬁ')lklï$íËù
»˝ÊFlIõ±>óÌeı·0t6ÚƒÙ”,ﬁ˚Kè¶yétÕèÆ˛ïƒ›t*£2;ùé}‚h∆möÚÑÖ⁄(t Oå3Ïd+“õZÕm=rÒ pÎom÷≠!zÜ¶›æ‘õ5Ô∂iès«}ƒß;sqø^ÏJ;G•<Ï…•…q_ìúTÆ‘ïº√okRwû2wVˇ≤AQﬂ˘“èˇrußyvlh⁄Qí?K#û™"EÙÄ,#Cú©îy¥Ù@	PwZëÍñèìëÓ⁄⁄R∞nsø°55«bŸhö•fE)yRzºu>î©E*Áz<‚nÉ^⁄ô1u®,kpR¡I¥°∫]ÿ˙et´Y/n‚¶ó√…áAúo„2Çı|/ü¿í•¯¸˘Ä›w§HìÎ6[và[ÎÀv	GÿW˘ì*â5=L‹^w>,-™¸qÖªaÀÄËr M®¸yÕ˜ΩUÒ}ª+!ß≥V£∞ëÚ4OÔV≈”Î(DöEy%º¯ñ±„™Ç4nŒˆ∏4z™3¿HW∞>yÈŒÌ‚3ÚJ¸sÕH≈¯_N∂“àØŒ!’ØL≈™Æ∂aØ€“ÓMë{îFKÏ2=|£2Ä™=[’.≠Ùxi^Ì·µ5&ÚÌ¥†ì#î˛†r;/ŸÎßØ_≤ëà8MFHûïm°å≥È(ÈF™á÷˛r€rj&Ü¯/‘jê)D±« e‚ÀW§WˇJ…≥À–<'B¬7≥ÿFÊ«ß	Âûø.*xü•˙Hf,Q^•ˆ‡IK9â]2e©∏Ω6YI§¬º‹«jﬁ7_çÓy˝#√o8c~AoçóÊùfgõ=0_¿√®¨ ˜ÅYå©ë¬Ë”ë´≤§l”LõvÈ≤˝‰§?¿®ÕBñx*«@®≤U!ó9ú~ÙC›—0Ÿá)uÜ¢¨¯Õ|!8ÑßÃ≠˜Œî›h«Xrîíﬁ˙‚|”*/‘…åÀm±åbJ,≠òë˜µH
ihÚ1åIÉÖè^o´ÁŸe(’Tgy∑¯6–“lEª–{-àgù]X6á˙z/tHäùä˜~!§ÏKVXﬂcòq˘ÊÂ?˛∑øA∆kﬁ—v±æõÉ;∫ûi°ù™`ß…ÎñÛ∞«∞Üaì]ﬁ)¸ÌBfy-C∏'-WIƒ’T,—v!}≠ıi∏˙Ï·…JÆØ”´Á≠˙^Z◊lœtÛÜàs™_‰°†ΩëÆÚ∑0A.TAπ¸¶&·’Çj…èü#®=⁄Çºgûù…§íÎ∑πÆ‚*Xù©ñVIk˙fêÍQﬁy¯˙ /Ω=/8Ö∑Q†¢?è2 ¡πÄ^_}?¿®6d—“£À…‘Ëµp˘·—›π©NO$˘!oŸ§å¿7”Æ4˘≈;}Ï|Ë”≈®ÂBòl•meF¿ö”ÛñÏ˙´äÔQ¶®ÈÄ8e∑È∏∏§Y,`Ô]ZëE¢A Ú 5òQz*ºI†√TmÕEæYÊ5Y~Îán‡aj©$“ÛáãºÖÄ"l)ÔüO{≤âU
¶∂bvªYû<CnÈ¶æñµz{πÙΩíGQSüÈ	tós+]Qzœ™âó?#@3‹øŸ w‚¨®ôÓÆúÅãDÃ,.Ô—lZÖ∆c»ññüa‹Uº0ÌxJ&üô
ó6"_Ò“v4À§±…Á0∑ÃXiµÚ∑†¥fÕÚö¬‘ÂyIiõÂ“DÊõD‚ñô Ìkæ»{fa©ÛçÇ∏%†x7Úiyã˚Ï<ÏGYπ¡˝Y?ö‰;„Ò‚—Y3…»™Ñ´ˆÊÂÒ‰uü©^´B88Oéí·†©≠¿I0Ü√ä–d<yÙ·iœ¥1R~õçVÏZª·5d–>]˛°˘πÕÜLª!=‰?„mYÅJÍ_ëâTP¥	ÎÂnQçñZß¸6å‚Ñc∂• WüC‡®ˆ
Ée∞ê<∏êÒRåo∑*∆7%yPµ—yÛ˝j,<µU∂Ÿ;X√‚@’Àh4‡ÅŸπËôAàä")çE(eN†]<=∑îDmÃÀª›+{ ·Ñ‘›ËG:Ïºœ5ÏûrlÇ*íìÛ˜ì%RW–˜^Å¯⁄/Úó7BÚó?ïÏR≠TéHW¸ifõä@ØÎÁÒ≠“„îÅ⁄‰úµÿhrá±qw:¬”_¯¸û§GYÑ"ö˜¥∑Õ§#Y|Ñ≠í:TÈ2g|W#Bêãb-√W…4W^hø›ë}n‹ZŸ<“%¶£ª”“dwõIÑå{Ÿ±x¢Ær$\UÏ•.ñp|ÂÉÍhW¡˚–f`ÀÒô∞F<ÕÂ}0Ÿ¢VØÖπ@umôïªî$‹)‹á)¶» g¨§<JŸÛùßáÏ`owÔ≈´=Ùµ#G`yç8	ÛÙ[x;¶p~Äú!§´ëi}2ç–O_éRVÃ™u„<á™"ª@q¥à&”h–Ó∞ùìl:ÜÔ„A ^?}±˚Õ≥ózÒp–8l,ìïi…äÓà¥q⁄¢1Æq ˆoË·öúƒ√6œÒ¶WpÉé˛Ünœ)¶œ¿î·û≈∞8£ÃUûâë#qFí´I‰…qú—ñ∆&c8\¡‡VΩn
"2¬·vìh•‡Ÿ^'1Eu)O`‰^~8«2Ö≥z„I1RÂ€)Ó™K©ùjw¥e¬⁄£4ƒ—®mI◊+BYÏe…‚Q*¸ÜZïN? []ı-≈Mx˙†,µ6{PÔ¶]‹˛	0S≤a∆˙´G⁄[gIöØ0t	–áÁ†È√Ï‚xœ∑S¯Á◊ç·(ùC,™ÖËXIæÇWdmypG<gqé»´Ä8z–,8Õaí')§'D£k «ÈÆ4#N‚ÓàX··Œ„¡Ùú¶"Uãàt) ˙(JŒ-ØTsá∑Í’ÍnB-Ô7∫ù<9avós\°M5Eàˆ%πß»nY/ÈfU∆Zü2]ôrCœ«˝ÈFµÅ≠ÆwrÓ≠ôÎ≈÷˜j5*∫´¶BtóXò¨G”j¶¢ÄzTı›Â™©ª≈á⁄I•Ω√ñZlï|]•ıe∂dÛ˘bÀÃ¨i/
{g≥©“¨.ëú<sVe˛ö/≤U≈ò0étTJq¶åRûá≠›ÂH†vNöì∫Ïi#…\ âw;©ı∞Ç«2ÍIp	ìß=‡çÀsæuÖ_»ï\=qÊhwõ‰h{ãÔ"z˘Ï%å˚ËßœKøÛ⁄zºä~§bπ¡ëÑÆœ√∞¨ˆ…µ$¢Sˇ£‰°€ﬁv}iË÷∂˝h≤–ÀøD.¢º cW=ñä£¶go
≥≥uª ‘—úÄ_Ÿ∞T)∆bÖ≠{`d§d4#äLy˙÷ÅïáüW¢|jñhëª¬^“ã,ÔËEûWîV2LqÑ)–0 gf˘Â ÖA•‰6¨[¡Âó('÷ΩOÊ!sMUÉ
=T˙]Ù9w8ˆ Qò≈g˚Ü[˙+∂ﬁJ6ñK°Ññ›Z5–jh
Êdø,ƒÜ††`(X,íÅ8´é¯ùãig;Iæ”&#ücK¿78ÌΩß†€¡ªøî«–ò^î}p[©9DëgÊ6"∂cn5>àO‚®— …\Âí]æﬂ;ˆD‰®å|E!…Ë$‰i£Ñª0è]˝!{/üBÏˇõY—™¢Ñ,=ÅÆ…vz(_<|»÷/◊¸7r≤(∫≥”Èº˜º∑¥%ﬂ!≥‹„'9+w7”¡#è)›·–?ê£á’˜∏ä¸![$Ä?‰üæ;åÙfeLàê
Hà4åªHö[,!∆KKs»
ëG	&<öè	Îgù–SD%â“;HÑÁÿO≥‰;4»–(8LèíäŸØVŒ´{Ñ~Çjo3¡+Åò.l2ÌqÉdîù†ı§«m;P˜Y`Oºè},‰YCÒÉüPΩk¸í5 (xUc‰ÎCqP
{ˇQ„°PO∏Ùm•pá⁄Qä/Ø/Á8z/8
^ R˙ú@R
÷·§‡ÂœÃ„•–h‘ƒå˚|ÀUÏÊˆ)7BP±=Ç¢¬¸hP*¸un<∫D<u’Ÿ·	*∞°sÏV
√U°´\e•<Èw˜ü¨Ìæÿˇ”<:„cÃ@.˝€øÍ!œN∫>k ∫„Ì¶Ü÷õ≥¿	ÃÇów¯õb≥„Ò„≥‡Â‹©Æß≈R¸‚∞ZlÖœÅ◊b)nvÃ*Ã€k ≤í≈I‹®áN⁄väÿ®'B59MÚ´?pÔ?®I0ó9ÀÈÍU—›¢Ãª∏E£‡ã(µŸ-ç˜P™⁄RÄãŒhé4Û$⁄◊ ∫lxôoÕá´Ò”˙Üa$ÛÍ©˘nz][YM˙à≤≠…Ê0¿√#îJåÀB”˜§îY™pTÊ˚QTÊ45Cô2Ú4K3π+–<Hë[≠ÂÒdı—¡Ú
ª@È4NáO2n›zúú$ì|õm`@ù≥zæc¶:B
–ã9>Zı5éNëõ];6/êéÌ®Ã/áGYÛmÑ_Tc∫ÙH~·>˘å¢©,€^ÅUv¶-¸¸∆¿‚A“’Å:¨˘a∞äê4?ñ+äªBÉ+Ú.3ÃÖ•ëE§ï#“¿ä!ßt#òòn0L˚‹‡⁄{y˛J!EÇ~Ù∑øeoﬁ∂©ó|EBLûÌŒØAˆka3Qª.∆C‘¯Gy%ú@{¡8Ì≈<Ûıq"ùÎv~o1øéT¡@g_Té˛Ê‚ù«]‚)®~[§†ŸûÇ¢˝’‚è<ä2Çk®TMEjPYÀé˝∆MiÈCiÃÛò&ÊØtí?èGStA!íÕ%fT‚ö;^!fuƒ)Ÿ1ª^;fæI›Ê`Qõ‘5|àÆ~5ßËÄ®4ˇi¯CeíƒÌBtπç^;úK034≠Op ¿p√§LzäÔ	Iˆπ8HAkÂ¶˙1®`Ié∂z4îÚ®Yîlı*Ê5[cr˘·Ø<tx‘KW†håìG–9ù$‰:‡vtñEcÄˇC9»ÿ©y„K-ã{ËÕ√(Ll
Aµ†ßÒw,≠ˆ˝§◊Éπ=BáC{!∆ì˚¥rJá*MkﬁáÂçâÀW¯/@¡bƒwÜ•Q¥'É[ËT¯˘¶ößG‹ü÷äœ∑y‡u]¶Cv´<Û¥msá®óqJN–íœ∞0‡º/ A‰N≈…?√ÀóŒsIlçê^∫7&n”ÔYzÜøW\õÑQ	ø‘1a;…¥ÎLäﬁ∫[‹–M‡Ø®ÿ*zL	J£‡k(0U.dhŸÂ
«éÙ÷Ÿ{ˆoˇÃNo_æ«M|πƒF÷f‰òuÉ5Ê«ÓÀØv^Ω|w¯jÁ’7á„/ûÌæëÁÅ«ò˜H
Xyèzå÷ ùh◊Ö.˝8πøghY"çBzuåZî†BA‚◊2&:ÅÔl¯Qaè	¸(*‰—:Ë •sÍ†Ë∂MÑ %Mœ[–√⁄‰
…m≤÷ƒCt{]Eå“„8•ïûçPùNF«Æ}vâKˇBçÿƒ≥XZÚ∑Ä†⁄mÆk}EŒÍ!Úæ¶9ò çä”-nñﬂÃ—®\K…àÏ÷.fﬂŸ◊]ÿ˚Àîfûÿ„ˇΩ]KºJW ¢*Ωe›p3%Z]a¯
O˛K‘B!$ZSä‡ø∆ |¡0|tÎg<F¢Õß8˛fk¶Ëñá>Œd9ÏÛ¶⁄Ω Ñ•ìB´`˘Ω–H! 
âµî™g>9à\|<¡“xﬁ8Íî≥àúMÒË∫axtÅÚf ¶‹nFt¥*ö\∑åo 'ßº:dWÄwHgì gíÉ:ãìΩW<uıS—`ﬁSF*Él	]Â†&≠Ø¯zôEm'È‘w—aÀâºx¯™ W—Ñã¯πO¥=Ù¸úPu8“÷—ÍÇä(Bâ_Y∆h.Ö-/ÒÁŸÍ]äÚö	¶•⁄n»∞ë/=∏∑˜!VBHBy‚≈EÛ•L„§‘T⁄ a‰éhùGI`H34#'≠”)Êìbqœã\°^"~CòL2JLÕÖ5#Œ1Tç59Ÿ§-Äÿ∞ì¬ ˙™1ÚcÀÊ@]â•Ω0€¨ÊÕ:;CŸY’SÚ°˙≤›¥ÔJãj æ1^AP-ÂeCÈ¡⁄Í˚óÚ„"tz˜,Õz≠ÂÂÍó{Yñfé–|œ%÷ü_ô6Aá=^Û/∂v”EE“ﬁ≤¨µ∞:
(ˇ’O‚AOI¯
úM÷y=Í3^ÖBˆ±f'Zﬁ%|ŸnüŒI™¿ç¶Î∞+Ï˝À¡’˜çEÍÁó7ÿa|2’∂ãõ•≈	OÚ∞‚Ú¿Õ0Å†Û>¨øíìú‡õ†d ¬˜ v±ß89GÈGúÚ3B…}å)èí•òÎõ?Ë\wÖmÜ	sL¸0ËYÂ¬4™“_’nÚ(´K¥jRT¨rØ!¬õÿG◊ƒ ≥/ò‰"Ë•Ωbî¢ﬂhDÄ, Fì¿¡”3ÁG£ó…ZÓ¡U⁄»#cf≈ı$x%å§‰z€0≈^Ô‡åk=…`∫eÏ9}Ñ©! a »Yì,ÂÓ©Ëà¸U”°Úd£¢3Ö3⁄€Œk‰€Eº_‹%£•v4HªøYb±◊aß|ıo„ﬁhØ<éæã•ì•π=ky∫F'Ùsâ¸h(!o3GB°·„0líˆ¢:?òrqgnw'Õ,`Æ^ÒàS¯Ônã(˘ê‘y ˜USÄkãæ˜‚õw_ø€;|ıÙ˘Œ„x”Ê∆:%¸Ê)páX/Ó&=8r≈I÷≈Å—≥pò5}7ñ¥e—.tüZ
ã6û!,≥b®/ΩÙ¨ìåFqˆuåJvÉ÷BÉ~≈}Z˝W`¨`û—˚f`ë˜s$VbõÕ∂ª— ·6—'π4I«K"3K¯AfÁÛñÉ–S—Àk‰6‹ÙèæhÙ>ÅÄ3ÆW±/"◊n'≈ã	¢	V;å&«N:B2’≠—Îx`F‰+•å¢ºõDà£3·˝Õ›—=ÓJÂπi∞ˆOë$;˙.i∂◊pX)\Ö¯>û√^Ä¿-é
<wˆ”º’Ë‘ÅÅ‹÷ÁÓ√2ámÛ¯NÉùÜ1˛X•¯Í‘g´¸=P|â‘ËÖhπ⁄fœ£Iø3åŒ[wWƒÔ…®EÂg‚eÎïZç?Kzì>~qÎNª›‡ïóMˆ(ÁO†V¡5÷Í(p<∫˙˝’?≈°b¢“2ìx[ïQW‘h5qÈñ;q©πÌe)T%ÜüßY¸:Œê¥mp›
 ≈eΩTF~Àúæ!K%«µ@®Lp≥π—È(Í˛¶ó¡ LF‹.9†Á8Óˆã¯4uiÉ1Œ!-\£xí#„ ï-’WY”¢à‚‘÷“Í:˚nıÕ∆˙˙€%ãÖ–#Jáèõ¨A#1ylÓ_\ù’>v∏—≠€£„˛ıäÿ‘7ë≠>|G¿´“õ‘ã∑ﬁ¬ﬁ⁄(A$ÓÆõëﬂïTûÛÅ‰ß£¯ÔÖgµ¥	U—d_ª‡øKìÔN7ÜZ<éa∆˜„\⁄«j*‚kx¬Ô&'∆í¸<C¨‡ÎÒ®Á⁄^ÖÉ≤Ù¿f4"Eö=KOpQÏù&Ω´@h∆º·Q◊]í@∆4#~Ãn‚=Ú••è™∂r•”ˆ´r†˜◊E%,˜![Êìßèˇ Z/Rê›`õŒØ~ó∂12a°ù*ó9Ègâ$ÒıÌn:˛†˜¨hMîˇ]ïûçi§"ç|Fù%kØwﬂ¸d∂”„Í¬m∑ı]^uä}-¡p?£Ni
zü#Õ~qıèÿöŸ:>‹JÃ«©ÃßX‰ 9Y,8Å≈Á1FàGÛ
˛ÆR ∆ÜßÇπ»u§ ÅóîÛ&UÜBÙ´√CÈ¶ÀPü’˘2>ÚP‚J˝¢Ãó›œíë!ÀpoJI3;Û¯7õ ?à7hˆ,‘É˚ÕáŸE[õ˘„l	-G¢V5[™L¸xë6aªø∞>ñø’ûiZ nu¨§Å‚5$À≤êÆ•øLçNR≤Ó¬àˆ£!¬BÄÓ5Ê—H˚_ÕNS*±À—K
k:àê.ÃÄ	‡(˚§F∆$:îRóƒ*÷ÉT]3Ø4¢æ\ˆH>àI´“/aÍ≈›Ç≠ööK/Ï°@?n`L}xÑÂ¨7¯æµb´\5éRå˚Ê`¨!íÅ§ó^?eçÇz◊$Øq§0ﬂ©Xv¬Ä>QDÃ◊@Né`o°Èèåâ~‹œ'H˚¡3Ëahsùı‹ádL[û1üä˛õÆ`e¯„_˝vÛ¢GDèí†––‘¬jA<,R‰+}∫YÚñÊ^_~|D…Ÿ0`#- ¡úÊHì7‡EnQd≥Ç628Q˛‹§˝˙∂’–®>¶àÁõ;¶É;r≈C!ÕÓ3|¢#>¢ Û^ZˇõV|ÂpÊàÚaÓ`Ñ#Efﬁ/›UÎ+8µW˘∞zAlaqùQzF»÷JÕJ<Î6[c≠[†>∞_∞;≈?∑€mG-j“°i4(ÈôòÙ¥„“âÛ$s≈´® ∑ãÕ≈çbô ¡L$Hïpx“õ´PëùYoñvêôîe(˘ü»˛Í‰ ®ƒ≠’ª≥‰q5I(√¸1zg%ÖL–x°ë˘Q4Ë^˝.mûTpœú˜x´íıXLÈ	,¯Í lÜmÂ\ˆÿxçÅ$zÇÊÀö‰ç∫∆x˜n9·¯dDƒÃË©õyˆæ±%Ωï˝Sàñò¯F≥	_˘Pn‰0¥ÎóTç÷(oád¨ÿka… (‹´jJU!(+cﬁÓL◊ÿ+N8Ô’§}/÷Ú6ÿ◊_oáµŸN0IÇÇù¿º›Dwá’•2x…q2ßYåÁ5°]QMä17Lû\Tãb)¶%6ÕBΩﬁÓ«0>#ÿå∏¯t=--7èucÛ(⁄®Ob%€A’6ÑãŸ7}=_Z‡95	Øtnñ*Ì¢Â˘“˜1•y\HäÙ%éËåÇ}YÊ'/›WöçXeør~˙© ˘Jø†∞ü6ìÙSªòü~é2æ #ª\öK˙◊7oëcÊ≠˝¢ )°¿‰≥ùÒ4Ô∑ñπ∆^ÂRüï!*ñ«•1ŒU@∞Ní˛§êÑ*$–W*»‚è¥™u ∆öH¸I›¯‹‘çÙ÷5“è¢h\˚íhÊ86Î<5~Ì§@	]ªìÊè˚wˇ˜_˛ö=Kà©5⁄Vﬁ»	AŒÅÜ∞°¨ÄÉmˇÍr≈7‘úRSsJ?_µ©8Ó[Èè^q∫Æ∂˛§:˝`™SÈb˝xäSÒŒ ˛¥ ≠È3 v4˝£¿ÍSŸ)50√6Ö©kWò∫ˇé¶Ó
ìÅÅl<_VÊ÷ô∫?ÈL¡:S˜:u&ÿﬂO:Shc>Aù©˚ÎLÅêY?ÈLMÍ†3u?_ùICÃ˙q´L◊‘‘ü4¶π5¶€L£ò1•√LUöùù≈˘ﬁŒ Œ&ªI÷∞lw.+[C…cªΩ◊ﬂ¨<ë+€∑B%Û,é„Ô<‰1Á´ÈoVeÂ¡≤aËvHÏX≠‰aÃ˙Wﬂsé$ƒäàÀ˜⁄Ò’?Ê\Çé≤íaÖ∏˚ÓÑC«wh]›´ÔW°àzêäß†¿ÌJÂ+õü\∂ïöÎ∆ M«/≥1¨e±Uù∫U@ı»v-„€¥å¸Tæêé£-ìr®X  \tO”Õ
"ju˛ﬂˇ˝ˇa8ˆ–—Ø˘@\˝Mv|ı;√æETfÑÒA±~µœ)í[àúÏy⁄ã†"˚Zíbîæå*É≤ÔÒªärìc©ë˝[ñC7‡áóÂ]8å∞ÁiyO´O¥é£AÛÌß9Ê‘ø$û∏‹¸:1áBP∆n#ËÖZ*¸≤NN¸ïÀ<∂ª®î0õtÕ˚Ÿ	•Œ#”I+6ﬂV¶ó ¢4”]úÌìL˘ı€Âj*à≥|_©≠√Ú∞GØúœñcÎ⁄Fy†9†¨}g¥ñ£®åcE7¿]Ÿë$Œ±h›4T.[Zçwÿ}S∆ûÂ\ƒUÎª«y¿Æ£Qñô¨Œ.Ëf«,Õî¸Õ
Õ%?md∑Ã≈úÄÜ˚ƒ–lö≠¬∆~ú;%l1„-√ÎñtÊy±p¯»øàœ‰-(ü∑.XßÉ…aìÍ«’R∑µ∏˜§œ~ï[Õ'3â*€i¯$≤ÀGéieM“#“∏'ßÅú„,Ì∆†◊√v)ø;úƒ„ñ}x¨K2€ÕjO¢f_·zgD%n0¬ªπl∑B2öFÅ∞‰Â·$ÃLı¢äî
DËpà|b—\á^πù+∆uÃŸéM©øÔ=u3j' ˜ﬁø‡ÿ´ÅìÎ::˘≠„’aî‹§÷íæYŒ≤:oï¡yõ®ô%çs•Ñ@oÙ=A
e«Nb™Ã÷ÜÿSΩÃ’fÀ}ƒ’VﬁjÌ¡fº’ö˛zÎVﬁj‘?œKÓpœ∂≠Â÷_mµ√BpΩ§’ã•ï6JõÔ(ó„ÃG0}ı∑t#€•õΩñdöΩ#úaó¿‚~çw5+˛8ãAmÆÈ'≈Mﬁ¬›4Ÿ.ÜÅäü$:_ÌØæŸ∏ì≈√∑ı)Å;©Éõ¥$ãÎ/˜XÅC=øÎÛy~7úû_∫Ïª¿≈{S‰ÜÑﬂQæØ}Ucåh˝~û∂AhÎ≤E†€¿|è”^‹¨˛7¨‡‘„qwÀR‡1º‡s7¥êlƒ†JO∏%J˛\÷∫ 1∆¨¡ì3£›aØËëB<Ï,¶w\˝∆Øãy˛9˘ºﬂ—Ø~Ÿò†lA~B
L"ƒGvåœ—]‰-ßÂ˚¸(√x¯AÕ≥y4Ë•ª⁄6êÑˆ≈≠UàëÄüøÎÚ/⁄ıu‡õPaD∫œZ~Plõp}¡íﬁ61ëÆ∞Ã#¸≠wÔFÑO8Ú¯YI1∂ÏC÷$Áπ*\"l˚h¬≈À¬ßæÏÖﬂÊçCxY8"”˝(£—}”Ì“ú¶”,E`{Ó∆ﬂz	ÜLË˜n2˘∂√'TÎQö¢Ì“áﬂâà≤Z§¢é≥¯{—’
≤#ﬁËM‹Ï©Ï_ÔΩäÛYﬂS∂—ÒøÜì ·#ÎªÆ$òÛ?ızp‰€˙ò(4Œûß/]Qt˘mëa£V>6…¶ﬁßj†◊ùnIÔ§ññ˘OkNK€OS⁄~}íSZ⁄ıœhè-≈˛»Â¸›éH'·%¬¯%õ…⁄T˛ 4z«0√ú@qcƒDB?a⁄®º7x∏4“ 9°0å››6Kè≤‰$"∫Á‰Ÿ
`c8N≤!π¯Ü¨§ëﬁE·†Õ
F'å·a<8ØáüüLìl•ƒëG|˝aJ‚Z}È FßIé~≈<Gæt5"ƒ'}@Ä¡9*”ƒŸZáàé˚f)'ÖPn¿"w?éè&äê"7XÊ+¶∏Ù∆∫Qï£\u$5–øá)!ylè∑ê ?Kπ¡q~˛:πò_ÉÈcÃ-å¢ÁWúC.FﬂPÊ—`ò'kî,∑ïÆ8Ò¡úYT•&ÆíáˆîJJEΩˆ@~“àòö
ByD+?ò°ŒÂ¯.öîÖ=ésÿk¨úèp_ïÙ1¯ï¡Éu¡’…`à∏≈n8(∑=<QÏR¬!_°˙æÕ8õ∑ê‡D[øu†>äAwrØóA|“Z»Õä€Ï‚òy	„£Ÿûc¯LÄ ¿¥Máâ∫,+bn•DrÕ¸\ƒÛNDˇVÉ˙t˚∏˙ÂÊ∫Z3ÔÏÚƒ&WfüÓ!E:◊´øßŒzú‰„ttıá”x∞›péπ¢Ço’“*≥âÜ]ôRŸ‚¶˛ÇÁïbW˙∏3J	π2ÁìMıgSÚUôKHøÖÓ‹1IØuÒZìHó=?…iVíxüfÈËÄxw‹1ñ|ªﬁXÁj’j≈;æ•È_È8"È@˙«ËÄ´EÄå¨è@3±FﬁPn&±™∑Y~zk]xa6N˙…H˚¢⁄u´§6-®Y‹=cºü•®‡aëÈ@R<ÒGH-§[¡MÂ´€√ﬂ∫ ﬂ∫æ$CxÃ]Öb£Wr√ñÚ¿qŒóMÙÅ-∂PmY(ääÍPˆ0ı&mmƒ€∞c\tØ+™ë-®ãfMh@◊˙‡ﬁÛ8œ£ì¯€iî≈≥Ùe›é7”ºyÕQ≥¸6ê;∑\C<›†Ç7‹?rnı3KN¨3£¿#D1?,ãèÀX|ä>>àè/Ÿ :äàIz˙/ñd\ Hè',ß˚•;«Éh¥¬äí∂ô¥¢õ∞À¨π˛l‡:{Èôç9t}SpâÆ€›€w€ë¥®©Ø@∫Y_Öˇ‹˜;˙øè›ãsŒÅ≤Õ±∞NÿÚuè”L_ÎªÒ¯Yö˛f:ærã+hë¢(˙ÕJ%%∑ë(…ÁÇÇ%pﬂê∫åË1Ñ)Ø~ÖìµnÓ%.Vî\6Wˇäé$Á∫ëƒﬁs/∆6J÷5bØº^Û=
ÕÉ-Û√:/Ê8ZAﬂŒ›*%∏ZeüŒ;gKˇﬁ‹-ã
ÆÌ<ª“> ‘‹G≤¡≈Òﬁz%¬)€Œñs„¢⁄ËSôªﬂ¨›¬%xÍjeeXEIÊÈZù{@dA@ıÛæGÏ√>Ç‰'VTàƒÄwãñ˜j˘ÆìË(— ©˚ƒÚ∫Õ÷W§ﬁøª}b;Sü\F!gYy¸ñ˚Ò¯<ôÃ÷R≠¬á{”å§9x§≥±+éf®˛x:z9ù,ªRCt◊Oz=ËŒ2u«˙¨[Ï
…Ω|6»°;¡jKQŸÑ
k õ≤8S™#Êç‰iî‰5»Ûl)J)⁄z}M(ÁÚ2:SLá‹ˇ{Ëµqb≈ÌÛdEQ°kYoŒ.B–ZµªˇÑ≠1>w∂@,,bóîe˘7J•Œ'Zu˛£≥öŸ…"*òùWMÔ«§ı‹≥Ä|OsÀö¥Õ2Ú∫í#¸Å≥™ËŒò_S°RPYå—ƒbπ)+÷Ò*⁄-W7‹}^>:◊óe5oTêB¸IoæOííì,≠€xu…3&úD†´¥n∂Âæ9¢ê“%ò+ÒUên˘î
íAßÛÀ®ZqÙz∆´iÍmÌŸµÿ	∞¡^:º˙ﬂ£$≠;{ô≈÷ızºÑ
8HœÆ›º”KD“'ãiw~po0Õ5≠˘ZpUµä¢±¡aÚûq≥‡	!*»6€çÚà‡˘n≤Õ≠ıŒ˙:H™ª®Ú”ª[¯aÕàyMóﬁ∂aË{kº¬íﬁ9≠¿ö∂avpïCçÇ|¥IÒìxçL≈•YíˆÀ)¡Z±Ë«∂/úI\bwwîI‡/≠§†M«(2j+¢]≤¬ñïÇAW	4)W•¶øäû“Ÿí‘¥‹µÀlçŸiµ\OJXÓtD˘á˙9PtèÑkÖtú6A(qãUıOjgYÉ9D9dãù=T‰ºÛÊlus„G6kÏòOY<ÑS§“èm„pöæ…F€àUUwÓ¥›C;£î‚≤\∞PÒÚ(è≥”ËÍ˜Wˇ◊jÙXZî≈ë∑«≤ÙˆÇ€˛	Ø-ı}Ê5`î4J6À”£,∆g≈ÏN¡óKıO'6"ı≤e'∞FÆº™·ºÕπ ¢∏ÜµKW	›‰ÎÒZ·‹˛Uip¥›aı2Vlûµ÷ÎBîŸ§áŸ˙ﬂëN£,âFì˚K'˝4ü,Ÿèo–pg¡≥ôÈÚÚ¡.gΩŒÓ≠=roRï‰q7ı` É[a≠£Ã∫Åø¥/m±3?dÀœ„Qö≥ócæú	âr”ãOﬁ™Äf∫ö‘KÚËh˜ﬂ
#ÄïNΩ,,<|"\Ù9æyZhñáM<åß»;;µè˛Œö6,–{~Ÿé£™⁄8ÚVÍSU‹¯*’{$	UÌÌéÏÜ2Ω<≠A˚À'z‡{ß≈·—kT™˝),D÷™“1∂Õ—≥ é¶çÓΩ5¬b3+@ﬁr÷ãÏ≤÷Noòå⁄H«›Âﬂ@@éÅb≤ònƒxÏ¸≤ïªw79N∫Ë0Bl?UH? ¢v∆+ §˜¢ìvìQ>"Ç LLÎ>FñÊÙÙ≤(mØ¿,@ÿ@¥˙√ß{P	ÃÚ—
~JE‰Ü¿ˆï¡$≈õ≈π˝KL*ä1[É~∫–q”}ˇl⁄˘YÚ-≤#Ûw¬Rt™0vΩÓOçœ±sZ“D¨ìrqü∞ó®éﬁø1€]}?HrS™èÄ$Xˆî3„B--≤Í≤ËÈŸÃµ'4~yn≈ÑUÖ‡9∆}kèÒ2∆ÁXÍ~ÙMüîÎ≠-+˛bzî 	´ØßÔ™è$˘Ëû˚Q“Æ2ºùö¯‡æÚ∆j—®Bc7&≠∑n®/ÇŒS™˙ ⁄›@EÆ©_l3îwéaFÙ‘“ï_1{´åc˜∂t8¨ı,EP“,ÃI[ì”≥]©"µW>¯(õRÇΩŸÒd¡Føyãaª∞Œ‚V+ÍvW»DbŸ:1ë⁄+À≈Íà∫¥â‹µe2$î§oêJ’æ%¨=∆◊¯‰)ı˝µ‹qÂy4~£ﬂÒ÷¿À˝vÇM∑£_˛˛˛˚∑S$0,w[ˇ[/Æ¨>˚B©Ì/Íùó+÷π™u=Ç"≥Â°mX~°‹∞mπ·óˇAüá¥gQödíÁ(t¨s&
ÓÇ¯S€OŸ0MAF±◊∫ãIâ–†úè≥Ëx"3≠	yÒ§Ûnñê<kÓYz&c¡:ãõˇY2È∑ñEµêÕG*Ù1æ£S>®¥}πmP@Yõ£øç7fi$ÅöÃ‘ FO∫õiﬂ,´„Z|R,u—ÂGLÙVøAõÖ÷∂œqz≈KÍYd%T∫xQÖÔÒ…{ﬂlÕÍªœñ«§l|±øPKØ>>¿cRú⁄1-_⁄ΩWÕÇ´èQIÚs_<ıÄs∑T
]£Ø€∞Ù1T~∑3•8k*yxP)äZú‘ßJô√U\â˛¥µé8z:Ææø–¸⁄{]yvÃlz∫Ifóöq[¢ïÁ§ôÎ‚.˜&π‹{ıN‚j}æ‘â> §]-´_√jCBˆóç‚OÃxﬂÜ™∞u\\Êè∆Ç€î≥ﬁq±Pz&JÀ˚qÀ6Ëwé<úª"©™ÍRêé∞?˛’ˇ π#WŸJÃ?/◊i@¡¶∏‹⁄ï6ú∂Uq∂Z"]a°6¢'äíµv¢/≈Ã¬båŒ— Ì˛fÈÅ–^Æ˛¿’‹¥‹”€|#‚ÃZ@ÊóV™ªÎŒnUÌ¸◊UZæó\Ü%≥\ˇà±÷Ö≤W˜Æ∑/÷∂éïΩ·v|W´M∑‰[)«'y)∏7⁄ö◊ù[Ûñπ3˚åÌÕ1∏≈ªéÃóéè–ØﬁdVå⁄ív„
;s7]˚ˇ≥Ëb™ï/eÇù´øá·Y›Gk1˚y1D≠d´ª˙~ítMõàwÇuB±ïÙJÁ<◊Dˇ$üw"ª%+P:ªÍñB»∆œP"¨’ ÎÈÔ®ÜA9ëÄ˚F!8∫á1Ã2ÿ∏^Ω&Í—f]ÅÍáîxH˝Bÿ5.Ñ?;)^ãÌäÉ¿ PåÃu©ŸÊ¶p[´˛î∫∆ß´W˛R]dàù§KEë|ÛUg+Ñ»Dyee˘¸Ü®ßg´o6ns®ã≠o.œŸE1Úπ”vÏì9N
LEﬂŒó≤Ìu;Ä.mªg(˘è˚d›Ë∞›¬GÎs°*øDkHÃ6;“Ú,T üé‹Î9rA)•Q÷€Ì«˜—´	zp¯Í¯sc∏@â›«mÈÍ˜Uúw>1q¸íúÈ?}√¡¢œﬁ√°r2˘ˆÌZ¥d˚Am¿‘öÆçjóL⁄dóD¯˘¬å∆—ËÍ˜Û∏fÀÍPsGü}dŒˇ<Ãú8MB“⁄Èx‰Ü®D-!Ñ
"©–UOÈTNÁ!=ò6◊m=\Ì”LQ∑◊ç–©*ÌÇXnª–⁄·ÿ‚6º[\	ëè{›6ª˜Vgî&'#OUﬁRW*lŸˆ@™–ªÎ*ú6C§çZàí0√ùB»⁄®U•u¡‹»+≥ÆÇ~§[6=VÖÚ¬ùﬂ4^7ﬁ˛’Ó \¡Ñ<ÏìˇQ	m·°Ö<∑º.Ë∂∂Fßs)ﬂ…'»ºHæè÷F€∞jö>w¸Gê:+ü£àâÒp”¡’˜Y"àÀ‡Ó•%±¿"YVóÉpG9Ê˜∏f‚2Íï"û0Ôïµëû¶¢	p´í≥G¨rÚ⁄àeèz.—Ú®√†@∑ÎŸë{áªOww^.ÈÒïò¶ÑG~<WN…ˆ
ÒYì,˘."Ÿc,ã8Jh75˚1l~ædıæ
jÇk∆˚Bç8[›∞·Çÿ⁄ˇzÁŸÀ3±iú≈«…9¨›õ÷$'Y}
7i'›h“’PòQ bDòÿçŒò≠7¬B¸0NH&‰E‹Ä‡àl,e.~∑[~Â‹‰Ôâõ&i&˜±-O;<Q|Mõ≤	"àÍ‰1‡ò6T∑èrƒ©˘Nb'Ä≥ï_4néÀ$ÿL1?à…“Üô} –„z]Ω˛m‰RoJ©SïÔÜ9)ã0bg∫è”iﬂkø‰{m∞+Öª¥t„Ú¬-∆ç√3XÇØ±á4›üÎ◊ã÷È©Ô?lÔ(öÕqõCnÆÓ©ÉﬁŒf~¥8∆¸ëÌ6¡†qP¯-[P∏5é2 *]æΩå…Vm¸ß…Ë§ ‚˛f„-ì4nä∫[≈îªm]n≠´#¶˙˝ÀÂú]6«zT*ÈÛf;Ëñàú¡ÏÆÆ±åyÂ#E>øl∑2hK®pyv≥hzûD‹« €·8e$!Í©Ò∫∫ Út°Ñ.8 §…I©F{¶(ÔRZÊã~=ÌqŒÄs–ı†œø‡aƒÌíI Ny¿]ä%NGI7ÂÓw4Ø"òpjK0Ø~ã»ù(√yU—Ü«ÌÊCeEÑeÅœË≥e‰„7˘mÊ<∞ë¿¬f£ö Óùè3ä¨Y_6â∆™;Gç∏p€tÒfywÆ?˛Áˇâ?~Üˇ\˝ÛÚ[≤Ÿ2ã]úd>;™ÆcõQZáπ=9	k≠#ãÊiäáJÔáy"L6Gy†[/„.?R¢.ÇÍmÁPAúJ∫@=Ìjµ›v≠ﬁLÑﬁˇ{¸.˛Ûı˝˝ƒ˙˛‚ΩŸ˘eG∫ªå›º8‚˙4˜’YFÃ:N¥+küîf)j˘ÚΩŸÏÖéÎmÕ-¸Á˛≥˙#÷’ü£z«rˇŸƒæ¯ëçÍˇG’>LAÉ«re8BN≠–ûYæÒT ö¥⁄ôù∂nH¶∂Óöß{:üd˜¯˚§sÕ}røiü®Y⁄™¥ÆÈA¢H¡€@≥öΩÓ◊ˆÅE˙¨ÊÎäƒNjìø!v-nöG^›6Àoês,Œa2áVCS%´Õƒ‹!f3N¡6I≥$›Vÿ‘1Ÿ{=d–∂u–“UY€“A_cS√ê¯n“K≤R{B^»d4çL*6–§é(*ﬁÀ¨¶hXírBeD”SÇ+ïñ'löòçjMœ≠¸„ﬂ˛›ˇ˝óø÷ÌÓ´éÊ…€`ñ‰ã"ïıÛ«f±sär~Y∫£»m§£I1F˙ƒÄ1ªXf6{A]› 0\ïUD´·L#!_5íƒ“”:KÙñ≠ßw9G!ˇTY3åRï©K~}ıΩÖåPY‰?qG,¢åz€xı£n±ﬁîß+SÑLú√ÍÄEÈ≈yÎ’7ŒÖº‚Çãp≥?q>ä†ÕíˇŸ:¡ÏﬁYﬂÍs>—îWîªí∑ıâH˚Cßy›Cá?–“H%\èÏ–IÙ*:j-˜ÈÈ§õ⁄„u¨–ºZPD– ÇÜ®ä Á…)gπ#‚œ¿Ï¿ø»B∂∑}±X,Ü.ØˇÁ6ÎÆï2|næèG¨<Sx-ßr0°≤öã»¶‹åJyÂôIî= 3—'œ@Ó#Ñµá2ÕÀ˛QgjS˛Ôü&™ı∫Üâ⁄ê‰ª˘<m∆Ì=˚q‹$Ü„⁄‚?±„‰8Å1!l÷])s≤Áq>LŸ®Ê√Î8üΩThØn‘†°°ƒpï/∏•˚7¥ã*N„ÉBÛÊñXW®ÇKºÆ±V‹àE!RóMrÒD±\.Àõ
çVÄÄ·ÍÌ ≠\üΩÄ!C∞ºìódyz»ﬁˇjä¥vÏÒ’ﬂ!Ü6ŒûÉÕ˛‰¶~∑/ô¸=É≠Ö„æa:tQ∫≈πlº¬|™Ó-KUî|•rHù5ˆ$Óˆ#.é.ï”ékÂÉìr®°îJÒÊ´;ß˝∑l»”(îS:ÿvu∂Ô˛jÍv∆ä¯qøî–MïòzìÄCÜ®Á√mÚdö¡†8^•H-wú≤GQ∂ÕJs;ú—¯Ñ*Í‚ô·VæÃgHvç«ıU’‡æP[`ãp¨∆bL¯põál)êëÍfk5î:êùk"¸´Åò_≤>¸U8[Ωã?˙√æa@Ü#˙®;}B¸©7@-ns=  ˛ﬁ79,5ı‡Œ"bPï…ÍÕà∞%ÇtV-ë≠¬öR∫sxƒ"§±mgÇáKœÀ‡∆4óuÉ√¢6 !74<ÿ∫Ãè()Ω=vGB`-≥≈9πd*it›`M¢Òh˙∫«≠øzáØç/9k≤|YLb◊Sœòüˇú-%£”$OéÒí3K¢å¨∫qC+¿ı@ê≠Ä˜
™Ê)Z#ßÚ«v´⁄Nk˘ò@±;ÀÚ∞¢ZSŸ™TÌëdOÆE√O„™∏Éó'8ÿ	˚\∑°óF©∞-›õíM0¡X˙πïWS÷gÅ{ôæcπWàu/s¥¿ºâ@"<â2Ëã'yÛå^S=ëz:w:DﬂJ%î‰ppì›¨ﬁÔ∑è∑QvZ^æ§Á8¸Œx[YOyè$RQﬂ°›[ÉØ"Ò6ÂÀúc–lCœá≈‡¿q<Ïâ}›h&∆eÇÆBò2"9UÔ¿ê?BŸ.h†fK˝öÌ` ÔXq iAs†.V<éïé‚sºòÒ<°◊òŒÂD%mS<œQûCW®õx*ª†¢öd‹®Ê¡À' ÕR+√IÛ{.2JºÒ[|ì2∫SﬂûÙlUes@p˚±Ï+!ﬂÓÙsVx—˝Êq™q/öΩÔÇ<g‰¨Ä£*ûΩ„ﬂ˛yæ√≥a∏ñê≥6é$hS⁄˜ÕÇJèY∏√ÖûP∂Ü:°ÿJñ-%(÷ùfy
ZBöÃëûÈM£t'«[ì†ï Fá4U[[ïŸﬁ`m%mπ€ºC£¶ÕÅ"ÿ8„äÙ£A⁄•£Ó±<ZG@u7ŒÛ´?ú∆Ùæ>OèíAÃË∆ﬂL“q; ëId-´≤5˘ü3ÓqÕ0-gBΩFó÷;GﬁΩG∑‹«êè—D*∂∑™ôÃä¶M©ÙÊÄ9X*£≠;ï·¢ÏhmÿŒ∞i^)œ±Á\»]G
p\;ÛûòFA≥†ﬁB°≠Âe‚Q05:Z±‚ò’Æ]í∫•‘\Ä†≈ı„n•éﬂ¡ÙT¶›ÀÈÅi˜8zˆ≥⁄§f}«Èâ>Ÿn„’õ´«n.∏ÀHè˝tªåWo∆.„,[d*ˆ˜öKVv›@#%>.l™Ù«(≈?€≈E˝ÇÛ1¸÷+}„‚Õ÷
ªµˇ¡œçı∑ÇåØ;	`‚Û∏èÙã¢ƒ°Ãz
1£ˆÓp√PyYó ∂◊c©)/Óÿ>¬π~_Ñ§DgØLzÇ–∑ì:ﬂ¢‚~¡∞lÒ¢›ûÿÚr“~+ï’tHıñÑ—œ†“¨[ˆ‚–¨Y˝A˝c-Ïò ÓÄÇ¥Ö¸©*Gp¿!ùû 
ΩºUÒÔﬁ™'éÛÛ^2ôzq—“¯YÕR@V©'r≥>Â¿á&íDóùy>∆ƒ≤√È¬q√0›øXwΩÇjè{Î˝%WF1øéFeÊy¨—≤µÍé2ºÜ„ç*J¿Ÿ/˘j;“êào¨ëUñA•7û¿èË{∆ègWÂ\N¶7_ëo7-ß‘A@çiúIZîE8\â™a≠ΩÀØÊT£ı	¢k”_r;ì”ùhÜm÷)_rb*Ãÿ\·Û®óû≠ûÁa˙4s°=bG®ƒ…è¥ıpas©p45≥πÙ\êÕÂY2◊uómi˙lü’O|˛˘ä´}ÿS\Ì∑6$ö˜¥sN%Ú¿ƒàÑßÕpÉZÿH4ì<ãè'Ï4˝mˆîpåÀHÉ«Ò$J!∏.Ú"ck´&(¢“ GpD®ù˙D!óÉÕ‚ÂkõXm<&ã8ÿæ¢TL≥|)øîùÇVMÛY–X	àœÀ∂€aÔ∞:ÄQèAuV?»_dè^|≥≈·ç]rá•¶îkülÍuFãæVÎΩâÜdß&ê·\I≥ºo—¿ìT¶«@gwLﬁ^◊±˝V-]ãêysÎÆÖ:™–ŸÙbôÖ7◊”b#F¡ÊD±Îp€∑6T∏Ì@tÌ‚‚Oıò±ò‚ò{’∞v}Y•GQZ•€Wzö¿óZÍå‹F˚√ßÃﬂ˛ó:—⁄æn†
ØÖΩßÒl*◊ì÷%«Öê0†%m≠
¯=<◊ç%˙Ω	_ªQ~YÉ,:/:´Kãò€˙eè›€\D†Gç°™yêá-ﬁiŒ0
”jó˜0∫eÃúC©N˚—	27äÔ=AcˆX‚ÿTwø§W¢ŸiV*¿ÑÏI—ì4;ƒo1ñ≠•p
eÙ∑ø%E<=fï/1ctÇö·z©Æ*wµ€µ”xÜhàf,Hy¯Aï!ö§|Çü¡#ZÜ·È£*sEKÈ F…—ª(§I?í’˛mÜ∞e,xÄöC‚∏	m‚˘t0I∆0≈Ïi™G|˘Òı{T∑,–x—ıjõUÕ Ñæu-ñÀ(#,/ï‹}íÿ–Ï∆ JV(J¯”∂˜ÁO_ÌΩxµw»ZçÜ¸…îÈ‹¶†˛^ÑyÒ=85O„¡
OÌèœªÉiíYíÈ-∆^€èô@|ô‚C9Wû%yA`Pg¢p≈Ω+Á:elÃH¨‡ÿ/CÜr√5îKy&rﬂÓiÎ!Ó∂©'‚ó†M#q–˛Œ_<á°~˜|Ô’◊/ø{πˇÍÈÀáù„d‘k•XT⁄Aze4√wÜÒ§ü∫≤©ÂUÀP†åñõ≠',Æ´$$`øÒnp"_áb‹7R~ÿÙ˘√N˝è˘¸≈ˇp≥®Rj8Q@—
ª|lïáéÃR∑*˜^}´∆ı+'DK8µÓ)ÄÌ&ûÄÜ≥:HªnCæy	√˛∏Éè£ûßØ“gX¬cQûp˛—m ´qUú AæG~Ò≈7JO£«—◊‘:ΩJüÊ©È‡ùç’Ú2Ú∂€ΩÍNQd»‚O±m‡æA≠Hhù√zÑÓ∫†DY¯
_ª]÷˜:j<qQÚ+¿Q)˙EèMÉıL&ö1®X£Iç”Ä€Aî3÷Ã*˜†·÷ù”rﬁ5†ÜÅÆïñÓ[,¡FQÏ\–¡c>Á’_ïÍÜ´Ù∆‰F]÷¿Âœ/"∂oEgQÇ¶’ÙL Ω¥ﬁÔ	¡%Œ1Z AEh|P≥YÎ¶kol?|Íí7πŸz≠Åâ5À9üPY±_GL»d∏ÜªI¡Rœl€à#Ädé‡éî=}æ˜¯ÈŒ´<‡˜Ω∫5Ç◊Ê)ã±q„!+2◊D.i/ßIﬁ∆D º˛µ@l+våôöÃ_lÁêÚb£.¶∏¶ÑMÂbÂî≈P:˜Gû¶É	SE∏3t„lÒ~ßX®hø»–ËΩ÷≈ÿ_1Ú√
ñ)„`¿ÿ!¥Y	*´Èñ?Ä·âv∞Ïöqﬂ&È6òÂ1Ç“9¢ñ/ZÔ Õ˝ﬂ‹É∑nÊ<Dä◊6)KHù∏„>EZIMxàR¶E'¿œºÉVπx≈ãÆË‘îbz»êsøÏdX˘=Œ|?Æ‡)H˛ˇÈê}¡‡æ~+Ì}{πù·>“	Ù·x>o≠Î6ûK¥™◊q∆WM¢	úÅàË1ı|˜ñŸo1ñÄ˝óy√EÖÓqÍ8ı÷ÌÚ÷∆Øá:g:¯é¯å°”Bì“”√óád{≤#88ÆIˆ°…IP‘‚ÇŸg,»KÈ‚«√taPVÁ8Ká≠ÂSÃ>œó€ùÈe!¥à„„óoó3)(JΩ–˙ˆN¥≠è~„≤p€LN„ﬁ;ö∞ÛññãiTN©∆Eày$€˜éù€ ¸	‚Fô‚I∑·Ç# 
òë¯≥Ò€˘∞ˆﬁE–±rb6+‰≤›âøm-'=ê‰ÊSDA5ò»åo`4€l“œ“3>9õóqÉl4–5¯ScÄî„¬€√¬[À/a¶Å@Î€.qòüä ŸÍÒ.:Òót "J1EYñHÿ"›Âyuº…ØñKÏƒÑ2ijHlS„H∏ÖH˘ùˆ^iõΩﬁpËÖñìØXó®j7I±Ü^€ñêmM»i∂£Ã2¨ç˚⁄fy≥NEº∫¡ ˚,PwUPÔÚpÕÆxˇ
Nßk)\ï¥Ú9«5ºGüË—^J·Ó@?W`œêH>n.Y7öt˚¥)àPÀÊG]:à;1_Í∏‚QPñÊ⁄BØÿ^¶É∞aˇÄ¯|ü∆ŸÂf‹∫ëêëWPzGy5ÇÀLÛ<¡L+©©d•¢{L”◊∆ß†Ç0.∞,'·"	‹Œ(À¢ö⁄Ñﬁÿõò6u≥tîò(õ5óC÷ÑÓ¶ì‘–ùt^Î˝πÒb/ÒÑ49B©2F†è¬=›2œ£éÜ+B7˚$ö._vÿtLbyrÓºo4ÎÆ—∏£˚6lúï’–ú†∑ÑFM4¶µ,¬.n∞Ù‹‰¥Kg†Ö?‹€È‚ä§æj`K∫ûïŸM<nı:-ŒcSsl‚±1k˜ì∑‰'oâ≠ñ∏ù$„N)∏%˝ìÏÂÿﬂ4nΩ<YÛç¨´û–B}V¸;yt#éf$›"+lπ◊[{˛ú}˝ıˆpÿƒ¿˚Ÿ⁄∫Oë`ìx`ya”£ADbì)@2¬Åàÿ∑VeRã[“ µf‘Æ& ®›dÍÖRz!¢»òIŒ˝iñÊ´9+™πâ°ôúˇ*€!ÇqŸè<O‚iN_ô P·‚ïD}\B¥Ó_∞]–◊C˝§U·L›E˘L~º1ªà.§Aèˇ*√f»›~3XLk$®±…fœÄ·.Ç˝R¿¯–B±¢!Mª%˝ﬁükÍè]¯‰ÏÚØkÓ.4?ÂÒÙfÜ–r®’	°÷`∫P4(¨aÓH`ƒòµ>VÍ√¿ÏnËß¿Jﬁ°!ÂméèO3™Ê∞πÉ˙	jekà
míôáI·Õ≤¬±˙ÂWEÚyüiıÂµºÜúË%ÏÏ
@©>1|ê†<ƒÃè6çDFÕÊÃ`±?èå>†É˚¡•`:‹±£+∏Ú§∑åÜkHì9ÓM˘?(Ë¬.›·a¬˙$¿´ïåíá\∏Ö√ˆmOÓ∂'Hø∏!85)p€pläR?Ø<‰ep®6TRüZÓxl¡ì]?‡ ¬∞‰:sƒê÷¡Õ6÷O)u::âá¨ı≥v}ÿΩ5jX}˚üÜ∫Öd√+Wmbºriô„ﬁ^yˇ¸Í˚ÛéàxiNN˙Èﬁ˘6€\â°”BΩÓPÔZ¢¯VH‹ïàÒ+õÊM›W.5ÄØD0–ñ≈'ÚWÕ∂ ö-
ÿ™¥≥MV7ÉVu®‰=≥U$ßFÛ•Ñ&¬¥qŸæaØ6)‹†XaﬁÂ0Q]+6ÆÉõı{O†∞¿aR¡ >°±öülV⁄:^!ÎΩJIYÏúº'ÉY)Õ5O∏
UeóFÓÙ§FpY+‚Ï¶π›*;ÃVoîﬂép"¯CÛ<†‘Fgyå˝7¶yÃqQEÛ pØ∏¥`™ãÂÀ´∏ı¶f~URj©§î<ƒÈ‚ˇpC—œÖÇwÆ¥Shﬂ‹¶ÉYc®”hqîOµ”Á™Y‚◊Üºg]R.îÅ@˙ª(1jˆ#ëcìëõ#c÷˙ËŒ‚IñFP;¬§,∑~1{¿YEç%uVX¥.˜å[◊Õ"‰|õ§Ô¬§”24ÌD°8eùJ@®Òﬂ:÷i`√⁄◊8Í≈®≥^Zf¿Öÿ◊¬4Ä&….Ë”$L≠êõgNãÚr◊‹≤Ç,†6‰´ÍÊg√A%€àñø“’Å/ßºÇÖLµ‘8vÜ∫ƒêíª∂æµ∂à0≥l†‡fÛ/X#¡~a,«T˚6·] äÍàıE$Ö±’˜å&≥|U≈z≤k&NÆ∞¬fÆùO÷”Ê∫ô:d<6Äë–\ü ¨î¬l;¿>$ ÷MóYù.´ﬁo`ç˙3%
,∏«ú˜Uﬁ§jO?∏œ=ä≠	Ö¥ˇBj”Fe⁄mä9cB{@Q˛3l Œvé˝¬∆Ò #®≤aƒ0∂j–«ÃóÁÅ˜Üﬂì ≥í;ïW ˜´F∂d€ßÅS¡ò?Ë¯ÖR¢NBº¢˛Å/î¨/‚Q…Øª˝Ë4f˚Oˇú!ÌuN∏ˇê±ZõqMãÆ•A∞Èbî!r¬KÖÜ<T©Ù∫ ¥$å±`\tOâﬂCs
ºÆ∂˜íQ?N≤4»µ]ÂG££óC)··)£±‘∏æR∫]….H÷ìón¥ÄmIÁJ`ûµr5¥Û´âUò_F∫Ì¢"®12&jß"?©I∑R%†eõ∑üÍ¡µìÇjî˜D§=Õ•%4ˆ†=G˝*∏oUÉ¯“˙Jê\«/ß¡xW©áÕZ\÷xVk1]ãL/÷ªıØ§_hínÀ„%A∑Í¶|ïÈŸl¢‘:¥Ÿ*k’˘%Ö≤´+7∆@e À∆⁄ »≠ä∑5]àµ∞[M@Êön¿*\ïãNdÈ¡+ú!Õ‚¬<uq±?Ú‰ır6..ùÍ∏‰ƒ•‘C∆FõLNî€(ÃØyp^%cíFß0.4ú)(mñòd(£ú£ò3ÛB”°,∏Uˆ@¯ëHWUR©•£fì]±ù¬¬M&h@∑√OTÅó9Ùfx®]ì 8º$)%Êç„ìs—©IÏ<ôFYèõ3”:R/€’,PØ‡Ak∞2BvÂÀvΩ“6ìX›ç≤IîæÎ≈»úM"˝∫ùˇ$é%ØëLv<+˘1ôEgÇË†r¸æfœâV€s%cá˘æ‡L+ŒYYπÚ`ïüæó∞„ÂãE%˛?   ˇˇÏ}[oGñÊ_	±Âe—Õ;%_ ä§=ÏïDö§Âô)Yï$”]UYŒÃ"%≥	ÏbÛ∞˚“,0ò≈éwå†_∂1/Û8¸'˝ˆ'lúôqœ»∫P≤ßË∂Xïy‚ƒâs˝Œõ]¨ë_[â»l˝⁄·˘	]ÈOÚì>uVO3w˚l›fßmÈ§Ùùµ∏¢TììË-@H[hÛQ£,Ìqé·ä¶táIQÓg´z„v¬5Ròˇ]Åû»®√9.gSg@£3µ ¶"ø†Tbx˘¨ ≥1)”k&u¶ eÑâÏ ô©{ÖÃ¬√r—Ö¢„5T©7ôBÆƒXr¿§≤ïql·≠Á÷A[YÚ¯—˙_4këR”%4∏%ßãh]1B_§	Pπ&  ü¸¨!Üóÿ–òßE3<Àl[ZÅ{€ÒŒ≈Ù) CW4±’h¯ÜÓ˛Å˙«$∞ºyıÈ7bË_´ç§´|®fF˝\+öV”ªi„Õ}}voKå5ô“5â¶Õ›∂=˙MC‰çÕF˝FÑkTq.=®@EZ¥lá]√Q»≠U≥nR(ÁrdΩG}öMlˆJ5•_C%⁄3≥;÷§ŸLÌ¸®ùœV-ó¨ˆ¶1O\∂¶Ÿ±4Ê1=dã·f^≤ƒÄOÃ‚¿S∫ê‰=»—ÔÇW∫ŒmQ•%…¢ïhò•oì>@(Mnˇ)≠?N≈ô“≤Ø˙’Œ‚,tí˚ÿØ£JLÁº 5
®ú_ò^åWn√‚Æû3‡Ù.<.´Ñ&àÙz¡WhÈ…C)xMA.=häî^Q\ä@zó[Œ™Ω⁄†3@Ï=†àD
(eˇ{•ˆøÓä‚/ßÚ∫Â≥¯Ï—uﬁπàª£^¸§≈gFhä⁄	ê·ƒ3°Anõz\~/Êåô‰«|‘Ì®I˘≥x0ÇJˆñô∂Ô˙ΩLO„Pù>‰!Ó+°öÄá*î[¶ˆ¯È/SsÏ	(t˛Ãw~T¬ÛáAmåÛ;LÛ÷5UQ(›˚mrE˜|zE’»Aú˝Uå—Ó%ú=á‘Êx∞HzÒY—fﬂ¡?È=›‚ÇÉˇ¶áôg&^B1H ˜Õ5XßN∫*’Ï7π√äk´œœ ?RÕl¿Ü…uü\≤•.›YÜ´l"≥7Òö≠71∂Ú–BR„¥'ñå}%R4ôp»˚9„êòˆjO≈ÌµF	IF˛E«ìÅ∫¡Ìs|ˆKäœ#{°7RuÌî?aU˜4|E5j
¶TAÏ9u”›‡G?@A˚&‘æåz~˛∞Ùr}uı’ú•X§N
˙ÚE·°—®œg±ÜY</µ≠ollº™kº˚∂'˙»Æ”b{≈h@9µàóí9ã∫¯ﬂ“¥OˇÎ›Q·÷YÛkÊ≈ªÂûJîj≤ÃæÚSˇU•˙è\™:•õOıÚµ¥≠?∞ºrSkqÎ¨)°π6Äﬁ™Oœ⁄˝S£¯˛°)ü@6=ZÌj◊væ<UΩßH`àt”≤Õ[W8gûl9P≥ëôûÜ∞˜®HœæÃ“>¯µãæ 1Ωü°Ó›àÏ◊ÕbµÂör¡µT†©/ÛŒE‹˘ÌNíuz±äéHûEYG§01=äß≥‹ﬁ)ç’Û!Ñ]jÜ`ö&√Dﬁ∆lp≠ﬁ¶%◊ä®Ã“ò°Ùµç+RUõ|™1;H1ıò·:”/Ô_Kœ^Ól#‡XDÌ∞Dì˘õ&Ì*$Öw,'	"Ì Ωö˝] ∏7ÖnØ∑◊gi∆√p>5“[&\RË®@x_cºJK»Q^”L¿ºﬁº	3ê$ ÙaÏ%¿Z˘T/±®®Øm«ˇY2àª
Hµ D»Îjí◊ÄmÆ¶F=C€pòÉù+Ä‚ÍöKxŒî¢T©œ$≠¡≈ûˆ”J6õóNd∆_∑Ï¶˜ÍvfMÿîè7ΩÜÎº™ﬂÁ`ÛLΩÓÃ≥`!Xß§€¯úxõ+[≥õvFh™wﬂŸ.i‰∏∫÷∑î”aÍ»\®œiv·˝‘‰gñ~WﬁOUØE∫∏OjÍokänõœÚ¿*'ﬂ⁄çT<∫wã-ç`Oª;ºH÷VÎqõË¶ùå√%ˇHÈ-±‰g∏(g∑d][¡ZüÁ^Gæ(8ôÉ”<Œ.£N€ì=lÎq†›¥JÌø˘ˆ'8”[ÈK¡Ë¡*™øD°h^«Ù ‰ˆß4_∞Î˝,±Ù62lx∆àßb÷X{sŸ-Ç
 0ü†'Ä0≠ù<°&Gk˚È∑€sL^ÏÔ?y∫Gñ»ÛrºstÙÈÇ^éiﬂÒS©XZ§+Tz@—8ÍäÒÜóQñDÉ‚—\Su´KIbR¡å∞¿z‚≤Æ)≠
Uße%Â‡ØÍ¥TMA”>|PáˇÇN R¸_jâ˘*—b+á’X[•—n◊1úIŒJ<çπ-^®C,£6≤Ë4ìn[µ‚J+høÎrÙË]w¡‚∫Ó√xØÎ∆C¯—~ß=>p√º„P»>ûÒù°˛ôB˙ ª˝…™π@{¬±
à#À|ıΩÙr˝ï≤õ‰Ïå¶ÈfPrQ‹¢4$∏¿DO}jùµ|Ü7[t¢	ŸœW≈]ˇâÀ°å	'[◊™K„1ys¥˜’˛Ò…—ˆ9‹˛
ªF PbÖ	∏«(`‚K‡7@æy∫˝¸ˆoÈpt§£Ì›m>XKj¨dMpñ~_®„LqqÒ•=8>˚…'c…Ä‚À¶,(«åJ&‘C\ÕÿBeì2"RÑr¢≈ôÿî!Áø˛fˇÑ≤œÓÌﬂ=Ÿ^<98Ÿ~
Ãy¿¿;ø‹æ˝tˇ?—K^Ï=˛b‡mªÙöÊº°*™ﬁ¢¸ππÇrMË0†Ωè:ù8œ	˛P)'õÏo1Lí√ŸàewÏ˙Úºº)ØÅÖ†±ÂƒeﬁMÌFÛ†EåZXÿ¬&y“5<'√âªphfiwÑÍóv"”è‹€éz∏#Mãmå©ûDß≠˘ayΩ‚é(i~SQÄ!Œ\”ùWÏÚÜ†¨πö®Y‡Õ*)≥Ïa√∫à`·!Y!œ°+‘6ï'Ù?ˇÔˇ˛!«º ìæÏd€Ö_˛˚ﬂU!Gd‘πﬁ9ﬂÂ⁄ªJ|7XúLMìSiËè>úé0<∞dHüD∑>¸”Ç=æ· _[uÍ∂¶ôø*˝?˙˙«:ónÎz≤H≤*Êq√⁄»=rU¥Q›ìS√Ñ
ó&Îñh¥Õæ‹¥öúõÜ´$0Ø"÷é/	=˘íN%b»°o%eçAz¶çoÌ‘§¬Èb√2≥∞4µz…üÄËƒpk¥∑éIü'πÖj≈9ÓÆúoØ\⁄Z‘ b>«àƒÿI˘n±ıÕt-cıL+Qg[2XŸÚû±"ÛW~∆≤áhŸpMªNY˜≥/ÉYÃÈ‘hpj-ﬂŸºxPﬂ°»S]r»KËqOô5ŒG˝î–’Ç•˘¿ÚÃ'Q˜<Æ¨^Ó òS^ûﬁO©§3œm˝  dIó2›EqkÈ3PÔæÅÈÓ–È∂`O‡√ˆµü•ø“ ˛ˆi¡≤∞ﬁ`œ™=ò€OÍÓ»•Ø9W⁄÷<ë}∑gïiG0©ÂÔGt	í‚›Õ[¬æ ’†°/ÁõçÜ–[8 ÂéTŒ(√/®r 9û√°g‘BY”F©@A7†”I„q@Ì:y4T'∑J †–ﬁÒQAO‡/wC£”¿•™⁄∞±ﬁYvIÉùj>BÂä#&EP£e#ál>~Lló(-w·¢’ .ù*˝ ¿U#‚1.‡∞/£’Fk4ãÇïÏ`¥îÅu¨teUºÿì@v¶G˙IhoW=Ùº‰êËîo’*ó∑âDàg&m}–îöYNu+˚·"Ø<œi‰°ƒn‘êÕé≠#7Á´£üH≥\yG?!Ω˚\r‹T€¬’F∫Üˆ”?xu«>¯péàdç∫Të‹+¢!]Qà–◊E"kjôyÀ§“2DóË±ÃzácÇKxùqƒ:Oõ#‚≈¸8ﬂ`j«±<∞ÖèËÚ,íâ¬ìpÔ'u’ÃhÔ3ª3ÆèO∂ø⁄{}p¥ªwÑ˙ di¯_)≈πI∑,»Ö:ãp˘sûn?Ÿ{z¸2Èæ∫©/3uWô{ÀB˜∑UMª÷!™¨˚∑—ﬁu$èXw≤È©¯Ti(Ål'ı¢
¨`‚ÁCÂmÿ¸Ün∫\ÎπÁ»‹∞˚óı^'o>¡˛´•QªwóêÖ‘nX«eıà Wéc¿∆¶V0˝bﬁı(;!lﬂ*Uoøk›ÌV˜˝6¸s√Ì¿r¯Î-±Y„Ë"ˆË˙¯" ‚ı„W››.Ωã•µOòGåû¸Àsú SEµoŒ’∑Üëÿm˙ﬂ§ÑoÒÀÜ⁄C⁄¶ËØ≈≈TSÛL•É≤@ÆaáÏÂÈ"ı_$—∑Qëoáñ≥h— «√˝`˘ö=ØqË4èão#P©`µmá°ë&ÎJ£+G¬ÿÆ;›˜‚ï·z±ï!Îı8≠πYw“˛0 ä§waÈµ‚Î,¿ÔËÅ›KØdÆÌS’c‘∑¥J¶ÀGƒÀXïÀ*Ã2ÌÕ{ò··˛sÿΩö›`!ú Ómæyyc{TŒYtuÁ-Ã®|ƒne&¶ÛZ∞.ÀK5Sì}ió-ˆΩlTt(W˜b∫Â¡Õﬂ&VTÅu’ãùXÉûe7.·ú‹˜ÅµæM`÷ºË3ÖM:!Á◊îøÖaÂ—£W/∞Ù—'W≠ªûÂ˝Û12ë?Ør$ø;W—¢≤˜@Ëií%˘+gLdSŸ,2WÆj—Âµ\s√®6^˚¡-Y˝bnÎ˛u"{&·OÆπ›˙—‡F/9¥F˙¢èœ“Z…2=3" IÂµd_µ≈W¯ùÕçi«pLè˛`£¬õÖÂÔ®Q¡ƒª˘≥X‰Â2w˜*£$oŸÈ|o˜`Á‰o˜»E—∑[êõû_‚»MXùn¡9ê•óP1O~uˇö3@◊„xg˜9≈•rö%ê£LÆôî<ã˙IÔ]õÄ◊mÙ/ÿ˜†X∑…⁄˙ÌÑJΩÛd@ˇza«Î6˘’ÍÍ™ßæaﬁôJ™k"Òa*=ƒÓƒ6ãÒã2≤¬´◊(/u£¸"ÓÚ'q&+/¯¨öô˙ùsJ¿∆“	Ò‚ƒµ’’è «“óÍE√úæ≤¯W9xëÎFfB5'◊•	˜Ø ˆLıR!œ»“+˙Äní”}AéÀ/*[	Za†˝,‹∑fËÅˇhª_€V«}œYöŒuñﬂxﬂXf.¸¬K±`˙P}∆…Úõ+Œ˝∑	[¡µâJ„Á—cfwI^ÀÂcıÜk@n∑Ô ïΩ¡ª«(mQA=äŒ"≤ù9˘*ãÜI'£ŒÂÇ∂ÏŒ¡≥√£É€œOˆ»Ó9‹€›ﬂ= +‰‡8‡ÊC†nÄà°'Ô}Ÿã…nËà¨xó”“W=·˘Õ;Ìº»“¡˘áWØ,˚éô‘Æ˙(f™Ù=âzù€JÁzöπ+∏ÔV8∑ì ÛNLËÑ[‚ åÏÊ{vﬁu;≈™h’˘ÂÛ≥¯2…!âù{™’Îk‡cÆùîw—P¢∫ó≠ú{ÏÇLlU˙É»”^"ƒÄ$Z ‡m,}Ó÷>’ùËyQw°S©ô€:ù,íË∆°|î?zi∞Y† ∫]jp≤˚Ñ“äèÊ≤»bGRç»‚◊“£enãÖ@0%Oƒ=d÷à«±Ó_Î·P7îYΩ@≤LB$†ÌÌÏ=Ÿﬂ›ÆùòSòŒ˝kaâ∞¥Á7˙¸ª0ËWùUPwŸúø‹~z≤çô∏Gµ”ÂOi0c‹£jÔü|≥}˚∑∑ˇı¿˜`ûe©å:÷¶ó&¡Œ~7èú“Õaas/Çj ≥8ª˝g ªáí«+Å∑Ûú⁄∑‘åä⁄‰µÔ3∆;‰ù,∫!Ö!9Ë•Qó⁄cg£Àõ\@ıQ±˛ƒﬂHÖø]%∏îÚÓßnÆ87=U_ÏÜ≈õÈiZ5bbÕùS˚}py$≥pLI…÷Ã1≈i™ƒú\ƒÙ≥'pÃŒCµK%¨ˆœ¡EÖÉ¶
øn‚ú™¡i◊E’âóQ^˘SÕóﬁ≈≥ëw∑ñ’≠Ç/ﬁ∂x∂¨≈7¶L?«íü&
∂}4πÿßmiÛ2tVı“Ût7 ~˚M÷ÛMtá.x‘),óX´à∫ú¡∂Û√¡yãvëúéí^˜À§£#|^Ú–≥£∆/nø@RÍáÉÛyK{à¥àŒ„˛dEâ∂πı$Jﬁ
`ì√Á_›±à äü–	˝Dƒepú!¡¯ãò¯eà	F;CXtœÓHXtœ∆áª_Œ@RpÊ6e≈ÓóSëwΩœg\©6i+∞∫Iπ\lï∞Îk´¢§k±ÄˆÂ+«ØàÄ=ËKØ‹≠¢^-kÃ*G)ãÈuáJ!¶5V`7UÕB Y∆´ﬂQœÈ¶&X‘1’ç5∑ı4Å5˘dkE{*¨≠DœL(πæÁÚ™ôIJ∂t)KT‰ˆB ZPuØ â√QO§Ù∏–ÈwX˜cD‚ÊÓDJâàâj¥'É¥™/Î$Q≤s™\Ÿ4µ&≤DÑJŒCSﬁç/„nöUUä¨¯í#1¨Ü±z∂(bºwOøMb+≠äQ†BI≥›'›¬Õ[ßJˇ)†4®Qáå)âVπ◊Ôñ_Iîrá|bXõÌ¨wÎûä;Wkü∆µA&ˇ‘t
–JJ≤Ü’¬√mÀ˝µò˜]≠Æ[˙zèÁ(∑ox{Òﬁù”åıu(·Ü∆§ù:0K◊7àÓˆ¸†h•dâ“êﬂ‹˛àïì“KF≤…y$X€æHË»pÖRÇ¬ñœ‹Í£,4ë
Kô8‹Ç|˚<Õ€R÷*‰"µ»ô	XÑÈ¨Ç%Ÿ%øMÎ»¯˜Å%»)∏“À¯«v+¬Ï{¥ô≤Û…^PìË∫ÓJxæ~i*t◊]3?Lﬁ¢ÅEFˇ:‹ˇkÚı—<π±v¸Ün2∏àì,ïÓ⁄_˘Ó”˙VwÔ∞Ó!dáwöÖ∑_1ŸΩ˝kÃbÑ^aäRﬂësÔé≈Ï˚˛rbo_€G¡DÏÊ˙
vÙh¡¿$ ±˘ªı!¯˜sC êD	wõ´i´‚”À •z(ó¶åπs0mWX¬@Æ◊kù,°¥ãjÏA'™^0Ê˝'&ÊΩuP€zÿãﬁ˚º-ãÖØ\8éÆbVÛüÃRé™ªñﬁn;&Ñ≥†t$û_§yaCîwË”[;ÏAç°Ê$¿1∆òƒL∏’ÿˇ<_·	ã_áåNzÛú∆ôa°MéûLèOª,4DPˇ.m0¸´D70í h^Iwx-´ΩÍ:óQ≈€ßa8=∞N¨_-ÓÆGsœ©E TÂ∂¿úå£	sÑU±nî≤µ6
YÈ’ƒ=-ƒ2ñGY$Ú0m≠vMµ;†Àû∆AÁ¥—‰H}Y©HÆÊ¯Q3@4+Ò«√GsÙçÏd@kÇ˜«˚KÏ,≠vœÚ ˆÈSÕÃj°ÃèÒí>8¡€H£4x'ãH˛PtF0âP º?EÒ/Z¢¸ô∫ñX«“Cπ1\2WøœBÖTvı–Ëª˜ÖR˙ÃV°îøyœÚL¬·éE≤h	k&⁄*<^ãcƒˆà÷m;è‰dUÀÚå}B©Õ‘≥…æØmX¿7ReY_k&‹Ô÷˘Ò±∫M%ŸMAhÉGŒŒ@í™§üüØ£s9‹hMoU¿Ó+€l¨Í]	¥ûÜ@∂ê¬*Yé‚><±â\ô•Xôï\©ê‘ˇ%Œxõ0‘yƒ»“´¸—ı∫…6Åê˙†‚]∏˝>vî
Ñ¸ﬁ€vÑ»(¢p≈$ÉADÜ–ù.K"j‡–›Á√∏s˚«≥§CøàãŒ≤q¸JCE0êh  ‰U9ì≈`( f,ô”Tmüâ€ƒ4ñC=&™á§i.Ö·!©Ê∆ù!—e,òÓfb_°fdªGÂPπ¡fÎ‡Hå‚ˆ ?áyõ◊Ÿa)°7¿âπ”ÉG‹)v‰Äª\%?_àôh†l&å2ÓÂyD0;ÉD	¸ˇ Ïù"ÓìQøù¥_&êÀd–ı®^º\%òÈ)˛)J?cÚ›ÌèB™ :'e”RÁ!-ræí(u€ 7°©∫¨„ÄÑywÆJ0è@B\˘j¨ûöªPuIˇî{ïtˇx
Í≠vmFe§Ëÿ*<®Q
ùw®Ï.≤wÀù¥[µ €ëˆ≠|kÎ€Ì◊;ﬂ<?9⁄ﬂ„]Õ;p]«DcOwΩ¸ÓwDæÈÂÍ´Zl]∑">[˙îà±tEt-)”Sq›¯0™GÜ≤€x
ô¿Î–Ò‡A)PPåí%î¯”	’Y>ÎEÁ7D\ÍEÑ≤ÇA9q† >√Ka5ÃN≠±°Tc8(ı@bäJÙ˘˘¸Ûıçç•ı’53|05;ÍÅç≠&màSk\YÛ∞û7‘ ˜()9ÉÏŸ6—§ gãh Ú"bÜéBgÙÈ=ieÓS=P;ª„pV7…°r≤ãÍKDU7zênQƒ[äÑ≈iá∏§È t7jÅ™4,/#L7◊
Èyö%‰`¢F‡Ëï0E›ê“´|	ï¥˚t;æ%˜Ë˙7∂‰¶
ÃK„íW®>j˘¬º…◊≈;Ú»ukâ<øV&¿≤"]'-UQ˜,o,öËÆ~5∑'Ñ˙πÁ § ëï√,ÜÃE™6¡≈s\◊Ã˚sÅ:¶æ≥ÇîLxT€ë§A,¬·„ $«r©`®ÅÓ[d«36b+ìñ∏„ÜPM≥u„|Åèe¬ÕYç‹‚å ¸zg&Õ[î0{áii)+ƒ≠y–©^;äzÛ7öK^<òë/!X÷"˝©©Òã§+=R ßñèµ¯—UÈ4.oï“TL∑-ìèú¢P\BDNﬂù=q¢◊>∫?Ò{≥∏ìﬁÌö„«|o–gÇ≈˛Ú•Éôrâòaw]«îÛ•<k}Ñx<+˘¶∫ˆË˛¬}En–ë»üˇÛˇ‡Ä\‘î•ˇ∫îËø¶	Q1œ†$∞õ‘ÛÙ2Âo´˜Çc≤@0Ê}SÚP•ÖöΩ9ø„-th˝ÃVÇﬁ⁄oU\˚∫C|	™°ˆ=W£K°
¥◊Ë4ïwÂª4e∫jú5?O\ërM„^©=AåFëà™Õ◊∆&»«Ü∆˛ò¥§u≤⁄K¿(…9úD)Aﬁëò¬ΩÄ§ÖﬁqùF≤F˝à1AJèW∫VÅO.°Ú	÷ájœ	Îè/ì@Äπ√=D]<õ±EÂŸAJˆ®zòÌ¯§˛®-[ÅºÄïv±6I≈ò˘Ìü» ŒÛò∞No·Ïa”k˛˘„ÈÌ ÚPÚùx˚íßßXDÂêπ÷SGö@tíß§Nc‚Hπ—Ñ]à6a5[l⁄B∞·‚RÎÃñ∑≤ªOöI4ˆﬁ¡”≈Ln∂ú{¥4	ƒ¡Åv{HG¢_	ô÷ÄmŒM4™˚s•˚f°Uôe=ùWyD|fòËBCZáª/®∆¸,=Mz1˝ΩÏ∑E:îæjM’‰ÆjQ/ñéuΩµö’ùlΩGXü’≠∫R?`Ûï ªK•ûSë*\µ7Kê6öî qtÌÖ6®,'¥tPeúf‡#∫çs∞~πg⁄ÚƒSΩòµ2[D”(Z ≥Â(∫
ËJiJS?∫Œ%f`ò§Ä›c	Î≈‚≈ ˆdÎQ39Aï¬òí	y#nw(Ee'à†Î¡z%ù…k%pCàÈôÄ¬∞Í{ˆ<ΩdìÆUa°å_Ëó0ÂJzÂ˛Ü¸3CC˜r/í\õqs{S‰cQ…fò"FFÙ≤“éfù-∏•™ÌE´3´E„FÓœgΩm‰Ÿ,’—˝˜πVËÚ˛9≠õùØKÂFxç⁄Â≤‘“S’ÏÎ]P¿)•IÁ"BÊRF∏¨àŒ©mP)axSΩp1éŒ∞Æß–B”bLSÙÂ√E≤∂JˇGˇªæ rÇ[√N·h‹ÁNW√pΩ—Õ¨Àd≥ÊL
s≤çêÒ+±.–§Ûä§`?[öÎoÄÎJﬂ¬÷!>Ø"à%´#ﬂõ‡H¸ú‘˚P
Ëîøá§˘6≥F∂¯»‰%áªQ˜∫*Pi±üyËåY‘o?ÀQ0;∫ØXbËÿ≥‹“ˆüJÁ√<ìHà‚¿@üwGIŒ‹oˆ€‚Fepo¸¢>B∂ã0·vÌÓ©∏Ú˙	µ#Wı°\>ü9Õu„Âj#=YqHKËd˝∞¨ÁÎh.Æ|∏∏äøÅøÓ_∑d{à|LVó?Ø*≥WLá'˜Q;>ÿOiJª©˚*√éSh›cO∂Yo~ÔßŸ)ä)˙VWyÑ÷RKß<QcVd–‚k
Êa_
œôaV=Fïì\\-yÔîíõr(4[Ú–lFƒ
¥@≠≈ÑsàØÂŸ\êì·±I{G©Æ·ñ4ÕU}óÖö‚^}∑!ßJî)Ô‚u£éôèh>•…$ä.ÀmÿØı˚˜Ãõth,ãR¿ìÛÀSÕ‡8õÛtÅ >‰≠ï-MCœ$º~∞ïA0Ø€§Î^Ôl≠•º©Q‹CØ rLàóß;⁄t a.Z®û¶≠õo∞∑0@`nô;‹0zÄ!h˘ÕY˚B˘S√=#◊… ıŒí^ø?Ñµ^ú˘Dù®◊ÅNIE“O~à≤ù4+‚|_å—*G;å;ÄÇY˛˝î*1£,¢GZLw†Ñ%»Ü›vx¥w|º}˙Ÿ˛Û˝g€Ù÷â-£R˜,$˝ö`m¨j·Ô;tíòéiOt¬èÒ?ÿÈ(.¨›˛ÿÒ÷3©M¨#3M[Íó•>o—x˝E£nHCá®ˆ∫B≥÷0ã/·óóÀÀÀÔ≈≤`¢ˇªîÄÀÉÙ™µ U¿HS:’Eıb˚*πy•?3C1,cÂEñŒk& ˇ]¶_”kÒ(…(È.Ëœaﬂ\Ûã‰,â{0}>€yÚ;2œfKïTj€ÑŸ[L
‹’å·åËcÌ—pëºƒGæj^cDs(MXOm3í€Ó›≥rÜ-≥mﬂv°ñ›ˆ,.24 !l{˜nˇÃB [Á™Çä†¢3åÖ |KK/?}xyÒäÄƒ=ÎQ©¯n	,0ˆ∞îw≤¥◊;çL3´Ò,ÃÁ9æY¡ =J{‘⁄Ì/òÄœjÙÿç•!Â˛¢3≈¢⁄w—À≤2éU#u40y©èæ/Ëí≥€?–£äjøùã§ã5(‘2Á[°
›≥ê˛,êò•+EﬂèíE)»Áa	P◊6…eäUpt?Ω•ß πå`µ(˙|ÉÀ-◊ÍÛé˛S.7ô€:åoÇ\ñÀ§KµÎ∞_∞&ßpTãyËÈl\Ùﬁ8÷–=3YèqÙ•t¯f=m`{#µç2ŸÓ&ù$@ º±˝•\…{Æ¬˘ÑGI }øÙhv8+0WÔ≤÷õªIOj éÅ´S\›@WKÄZ∂4Fr–˜†«ﬂö=ˇ∫zú^ßë–•äérÁ≥h∫ÂƒpQJ/Ñ`Å(‰ÿpôoÁ≥–£:[CÏ_ûÇãdLe-Ô¯ºAuá∑ë|x!á%±ﬁª‰lÎ´‚πs[∑ˇÛΩÆÂ6Í ⁄R2≈$h%KÊªê∫‰Ë≈ÉÛ‚B§¥;
ªà3ë∏RCëÑ¶ ˆ∫X§Ù'Yî_îEXzß`ƒèΩ˛Œ%3M]¿Ç]‚÷Ö%Ñ÷‰Ë5/ß\ﬂWí 
’OÎ´J¶∂ÇÁOr>N5∆}≤'B
∞·ÚQ? °5ß∆˛R÷å+KI∆ß´¢≈ñ§àf¯,÷DK07=§PaßÆY„,Ìát/õ¸-Ea≥FŸÿ/â&nüi˛GäÛ„˝nˇ4ŒÑ·=Èb¶|›[˛€ˇ≠}O˚ˆvmM©HŒ‹úÚèwµ=≈3qÉnCY{L≠Ü⁄ñ£Yù5\åﬂ¸”Úã®=UûÆ‹çäe«´XVEÌ21UÀ@∆rNH	aI'%î∆6T
Kıó˚∏.Êe—À -§S˚¸fΩå`U lœ∫…Î€Ã÷ZËjUBWr¡›1ü¯©¡†çÂÄí‡…•Å2¢üÇMY»Uîø‹ï∫ÊΩ“_∫∑§ÂLOh&€ªÏq	µ” Êl¡.Ü¢ü≠\7G6ë’Â’’5´BÁ\ì⁄Øå%∏ıÁ¯=9ﬁ{Fv˜é˜évoˇ€Œ˛äËàÓ*ÊË8K≥®OJñÜ‚J≥~ú˜S&≥≈	j‡èàÑ–∆{¶Á˘Êˇ˜ˇHdÊ¬πCµ"ﬁıπ^Eg˚ßú¿¨{iF‘˝IÜiûﬂ˛Ò2Óπﬂ¿*¶\áï€	*ﬁz∞™æ£˚¥§+C◊•€≥$eÖ?É∏Oä©Z¡NtJøÂ’AÉ ﬂWªn7°Bßå§Å√,†›
4h)EŒ≤gó(,E9∂Ù`äﬂË%v~ûVG ©?-@2  hö
+eO∑ÑfCîÎ öV
§IœlVF°x∆ËÊ ?◊{XO~V´ÖÛµoÌñbRyJã«—=`—Íjâ]Kjk…#~≈ùìêΩˆ∏˙⁄.d-á˚I-«Ë∆*d´>ò€⁄P°ﬂèKAÛx»‘a‹9:†ÚfDôE∫ˇ;lcf6qbJíâ™¸îxBbıµ~’ì*‡ê{¶:P„Úø√¥ﬂÓvÀB1‡ÕVÂwèR≤eY2∏HùôµhëAÂ}t◊|?äã®Q–],¯ø9oŸÜiË¥`ãsÓYÆ”¬ú‚≤Mu™‰íÖ¥ √#ãÏXÕ–<Ã´CÅ¿âŒVzÚ;˝w˛nêiu˜´ÿ∏“ÂS˙F
‹èÂ:∂Ç’õo(¸€Õ_–ÊoÙ~"aäØg¡¡Ql·ÔõM$€∆cD≥πFå<yﬂcúõ.Fi$‹iÃ€°ıŒ
Ø∑ƒ¶LhOGt9›·Íô˙∞'8¡]€Ìã˝÷<ÉÑåÉ¶0/>≤È8/±˛`∆¿“√«D|˘∫¡jDÊXÙ‡ìœÓ)“a,‘£)êa"Ï#V&µ0„$P0™À4Vè‰ä1±=ÄP„Ù„π,¢±0’c'8°´A¶≠ÑÿåVkáQè±2±≠≤ﬁ…†ü§ﬁ¯I…ûœ™x∆ß•4 ˚$&ﬂ a¥db7…áÈ =qu≠å¸ÑƒgOJ«jêôìq“h˛¨<p„˙„∫CbÃ;¶JAw;–πzksæ,†Fœ#<~òY—°îπ–8ÄÍñΩ8…j¸ÉcRaé*˛Ü˚≠≥¥à–—@’` »-ÈÔÖ2‘˙!ãœ_vzœàe¯B‰¯â”„'ŒL^}¨ÑçfÙπ÷ΩJ⁄áW&dqi[rgì69Ú1Òô∫∂2uxÓ£èƒï§†C∑lcÛ
P„gÓeø˙,G¯§¬®ôêﬂxIôaÕòZ<Îë:ØQTﬁxEπ^àŒ\©2—>¶ÛN˚l˙Õ∑DôgÁèÌ˚Ç(b€∏c¬w◊aÆm‚çö±èTæÃx¥T“qB(fÕàò
±∆…åüXõŒ\R˚Üb>qÀL6*¡»Íõêà‰ƒ·»Òv¡ƒ±»@§’˘o÷«ç”næúåsµÈ¥‚í„Q∏QƒRÍ8;·—Ì	Ijå:6µﬂWËÒê9m#H_¿æ69t@Z$J÷BÈ≤çÈ˜’©Ω¬ÙÉÊ©˝Äcíû’áí,mÔ-"…÷û>’Iä€‹Ì∑≠˜z{SÌ⁄Óp¥‰æ~£TPﬁ∑Oï¡ÔÀ®-FÌ∫LGî‡°tä8n=\aÑÓlBR≠í+‡àü’ƒ|1' ±Ùı[[¥6´-¡¿˚ﬂ&›‚¢IS“]~œêu¯É˛c¸n7Ω®O∫&…∏®~øcCÔÅòù_ ’Ü.<Ó¬ûn!ˆû˛Ä†Ê7Ôùë™B©;‰#ÉY÷ÎòÂØb¿îm»-Ï¶_ªX¸ö∂µi ˜,¢k´EÒ◊v˚Vf%›Zßº ˜∆‰.%£FUÚøÙßâ∏zA 4Wﬂ≥[ n"ÊÚ∏"èåuõé]y°\…üaø4…—≈Fo∞üÈ£ARúP˛ì¬EÛˆë ˜êÛ‘Ôï‚Uº‰ÍªëylÑÚ Î±ò€´uµH.Yn#®›W‰c‚zs»˚›I˚È®+C_Ar9˛›¶RvªÔˇä•S*w_›=à“:¿^ˇy<∏ÄTAi∫∫˜îŸâ/ÿ„ÏÇ«ÍõúÕ_õ˛èUŸ∆›ØãwÓõJå>ÉèKz‡˜◊ïC/U”s¨Ü’IWﬁ/9Èÿ;Æ(ø{<t†ŒÀ∆©Xzy;ó3ƒÖ4∆(ÌrÇ«Ã{[Ù˘H}X6ˆ'…Üﬂ˝éòÓ◊ïrúí,^ ìA'K…LT
aUèhLBãíQ>¢f\*∫ºR√f:2ÔGÉQ‘√%(]ªÒ0Mr}@ËÀ39ªX5=Å∂)Jd:"Ø£»cs\.»W∏oögdˆ%uGIÅâ
¢<ß£u»˝œ·xà1ßs πlÏsÑN≥5ËJüP™∑,ml*Ù_|ô&ÿ¡àyªƒ∑ó1µ
È\@‹kK∫`qÙ”3ıÑÆf:*Z≤¶å’“«Y¥,ÆÆîX∞ëå9ñGµŒ{mÈúPn1ÎÙÜO;2kı<]ãs U4≥îZLZ(kÄãx…M•h‘$ﬁèùbèû§—È?t(Õåíîò6ç∏6\®÷êJ6'Î‘	ƒ»√|•†oamÙ#,yû)^ú1RMﬂh˛∆ÀqZ ™Á@◊õÍ$Èµ¢âWtÜå&3üu@IÁã'/¯¬2ä∞êÕèæÒM_únıı9°ë•ñUß´›* ÅìPﬁ8”µ°ÍzK”jL=Å:¬ä≈ài˘ª—ÌO≈MY+‰S<f»GíF‡¨ÒÉè≥∞ã\ﬂk˙j˛≤∂±√¿uqÀ	CΩìƒz«≤‚±u¡ﬁŸF{«˜æßxo ¡ÆõïPó{˜§#¢á’”®ìk»¢.Æ|}0ﬁ>ÇVibÀ¶#ÿµŒÇºâΩª>ûäÍ∞*#ÀL OΩb∫ú©S∂¯¬ÛÆ€öÈ&Vπ\»~8“Ÿ˛V∫Ÿ^˝~≤dçéÂ§•≠YwÓß‘:èüx0çXÅ,îRúPÙˆ∞ûãL¯á
∑Ï˜ı¸˘¡}&Õí®¥qÄ„ÉŒ–ç‡¯‘OM¨áXƒÄkÓk™ËAòA‚3Ïµ¨ﬁÊá∆ﬂµÏ©¸.-pπ≤ÆZÜÀdú†Ñ-¥S~§EªZZ@*∆C–‘Ü	}ê∏≈¿@PNK-r†úˇ‚x	7û†›ßÂÚŸ|[A¿Éû„±ÆGï¯ÿÆY8ÉCΩy”ºÀ^vM}ëˆ¿µHOÓøÏîßå÷úŸ7˝ê¿ñ—8ÌìUî¡ ª˜)ÿÕh:P}∆itn3ñú®ËI{œ∑‚ú—¶1©Ø<kF‹…nˇêwËI;√}‚LÜ[nƒ{rPÇHâúaïôñ≥Ÿ±
°*ì=gMqÈ ©G¸¶Òs¡öÙ†vß’%Ç’w°i|!…^ÜT`À”≤nÃÑ=˙[—74Ìâdñcﬁ˙“M˙XWôdW—1]ØÉ¨√m3áLJ”.∂aO|´^¢√N.˙~5ˇ∏≠Ä)ﬂ^DEæ=⁄Q'ö`NX∂ªÈYïÔAøS,uÌÕó©Íg©–ãlcKøà˚«å—∑˘yp∏}˘<;Q∑lÕõ›}ÚÊûﬂ˛+<—í`⁄ïJ"NÎÛçÚ9|ñ‡ˇÙkπÊ∆&}xA˘7∏9⁄∑’=∫¬÷cn•v’L‡Ø áàµO°ÌJJú ê•Å©5dπ≠T) ¿É@ÌN´	⁄s/>%ân˘A'b˜njùñ‹0 ıˆ âA'à™bÆ«˘( ∫p*Â∑ßÑÙd∏p@ÖÙ%.KLŸ€fpèò»∂t;›x“R†rj0‘búdÌjÊP©LŸ*Ø`»Ïÿ3Õ”√∑l2‰æâ]Òi#õá◊79]Ÿ€Ìâù˛Ì 2õµ•6%GÔv9IÊs¯ygùı)œˆ≥N28™≥N6ö$=_DY\ŒLHüõ-&œ√:ÖùGóI|ïŒ}R5du2È∑yÛô_h;Sô•É‚æ13qòYÃ˝ÓÑYÃ”î[ ñöxŒ≠±7ˆÅÏR)ÛWÁ∂vÃä'X{cO∂-s1‰≥÷ÂÆ≤[ ÊXLÃ⁄MäâÈ6ÂN∏(k≈&æ∞€…gßõyLïxJGÚÅßx|ä°áO¿ç6b∑â· õ∏3eÚWVÖé ÇF™NúÀè∫1©ä…
ê?®Ω˘‚ˆG:-™å∑ò ˛Ã£≥
ß£¢Â$%h∑ªÚÏŸ ;˙ÒyËÉ6Øb√ÉÕ≈˚ôQÇ4ÓefYU∂óê˛πHíÓ[*ΩGﬂ}[”ÎH_˘·[P“ Ú®¶mãŸè~,~‹Ìkò/ù/ﬁ›º%Ï(2L¡I8ß*4≈Ò!9ñ<Frî…¶’¸ﬂbV§mπP¸8nE™ÉÌ∆‡;≠ÑkCÍL†mÁ1Ua©Q¯né$Ù_èÆ3l:z£+‡‘“Ìˆb¸µRu^•Í¯>∆§ìzu‹=Ö˝~tÔ”:&E)Ω4™Lº°oü¸2¡\ 6‰ÑrSËTªg∂yÓ~9E+`ù}‡8»˙ä /˛$ˇzDÁ }Ç]…Wñ∂è∆≈zg^»B¶/ÓªG◊`H£GóPC⁄ ·øz…êÜèõ+≠g!+¯{È©€›ÓI™5|<%˚óN∂ºÅóD#Õññ$,∫ç™ﬂ¢ÙkóΩHô`Öé§C6â}hÙ	è≈ûX ÉƒﬂÔEÇ†]µ+á_†©˜k¸a»YÒÆM÷»Õ+e
7™„òæœ◊N"ò≠wK™ãÿÀä◊©∏´Ï‹dö∑y√„r≥á3∑9ÀTK˙òºŸcECä’®_WZçx©Í’ÂÛÜ%Ÿ;ofIä>£´!}FÈzã)Ùït;ÛÍõ6Ç´®¨k|πNoö€⁄‘8p‘ï÷£⁄p∆IÔ €_Ë;‹‡ƒˆÈºEkæ‰7{„vÛF”ò«Q÷π‹≥ü+w·¸X†€º√∏IP(ı#¯∑§ ©q≥qä÷€€·˙”F˙ö§®ı≠Ù§˛é6‰…*"/kÿ∑Û…(Á1Á%≤#Í çR ªg–¢÷TB¡é8îÏ~◊Í†mûG'j!õÓE2·ÂTî0¢„ô?47ˆFç'S”≠÷Hﬁo◊VÀûP–Ú„†Z£àÏöq‘ì!ïqâ<Põ®ÅUõ^$Â2¥1N~ñ‚Ærpsgx∂3~ßæ‘·ó+;œ„z'vãÚ:óz´ÓÄ7b√¥…•knË¢«ô=9sŒ†ï*nfù$sÎL8Eƒ3AÖjG1`TÊ∑?H%Üˆ∂©`Ï≤N«,3v’6zqá4éŒAsﬂÉtä¯ˆ':O˘lÌ∑È^X+‚ø÷7à∫]@öhˆ|å–ôá„¿’≥Åÿç
Ãä›Î'ü‰i¨œ˜bimÕ“ÜO†û™o{er†fv[œQŸØ¢´eèó;‘2.‚ÓvjÓ æ"Ùı®$°reˇ¯‡7»’Îb{Uª◊/»¯^ñqØàÜæÊ‹õ¨`ƒJRÎv»„Ïí⁄«ETårå!ë7}ù≈ù¯î˛cﬁû≥b§¯mÂi∆ˆÅNOÉw}ˆ—YÚjÈåZÕXôñØƒZµj˘Yì&øÙúÀÚî~ï¢ß¬ñ›Â`„ìÌØˆ^ÌÓ°?-/¢Ûÿ◊ﬂq3ÇF≈<jxıçXS˛ó#Â©ù‡≥x∫˝dÔÈÒKÊï≥7“
õÄ}4{ˇ√Õ∆ê°{LáRF˜© OÜ>—©.<≠âu1Hà\qÜ],•^k¨!tê€÷Ê,õ≤•Ü—∞‘*ìv&∆⁄Nî≠ó:±ôª„ï€àjn„U8Ã{¥◊\ñªiªS$óÒIt⁄öø§∫Od5Îjå4.áP&…≠$fjä…“ÀoãπΩíIπd£…πq—B´“‡ÄÍafÒÜ+Ïe‚Ê	Bàßçá‡˛Î±¢ÿ∏·*ãÜÀVÉùÙì¡“’“*“SK,’È s∫TÅXJ8&ü`°Â'¨>t¶î;¸£qÆÜ[ºwòﬁÀâÄO¯æx'„p¨-:J@ÛYsBóèœ∑tÛ
œnÂ’ú*8'ò0Fyë<&x¸TyjaŒ7ÁY0ú¥∆«õ˘Æâ©µu*§>%z~ä_kﬁ'ìôû©¥ˆÙsK(≠†Ú}óª+Èàπ_Ï‚J8µ™ÄÙÿt"÷‚^}˝∫≈jÎ$cÊìM¿V∏©Ωº/rûfÔÄßñ≈¨§Üi‰)V÷Y s‡ÀÔ%NÙ≥ëπ◊‘]Mx;ôóü:è2Œ{TÚÆV~N“/œdÄÍ9≥åÎüÜg72‹d ’˘î Âº≈/6xI•Sõ›˙wÒóê≤ﬂ*î= ãdAq%ÀàÃ¥≠√d¡˜·¨ÆÓô«üÎ)2/àú¡g·∞ÀO]E
ª∆W]Ûk‡…Y	6+8 îN⁄„£Rı0r‹T”u˛V´Ö\äõ®j¸f@7mp˘,N~“‰'~ËIı#k¥¨ùHs-ÄEÄÂK<“-ª≤¨»dD4WÖa¿g®$∞∑VH≠~@Ù∫Hjw,}2âä`‘»’Z˛π¯O˛⁄f÷ÕWûÔˆ¢L¶?º¸¥ö3/+´“s¶öiSÕ÷Ÿnﬁ9K‡åhµ^W‹sèq;∏IOj≠bÖ∞˘◊¬ € +ØVî{÷∆]pnG∞zº=ÏD™≠bÏjÔyp@ÿë«Õ÷.G≈√23E÷ú˚9PZúnÉ x’&JÎ˙àY˝bo"øòd∫Õ√>˙ qeDCP5®Å	òˆAt ◊ºVâû• µ	À	‰£_é¢,¨ı‚√Ú∫Í÷+Puqæèù√ÁÂñ´èÈ˙Éõ¯0Ì%Pœ}ùÛ¶kbL~|~vO†]?§ÕÙzóçI©‡Aó‰òÒ%N◊$"‚`?◊·^ﬂ†W2˝<-zÙ|«ô[ª`¿Émuc‹òmZÇŒÙÇyÉkµŒ-6`¯1õ≥~ToÑMHﬁÛ.»1QõZÄ`Òí¢!¬"fVc7"¸l„Õy›‹4´˙ì™ÊòRä¢©®Œ©ñ÷K~†öö˝˙∞3≠‰˜a%üd{“˜ÄE’Z`5µı°ä`Õv–‚LG∞j¬ì¡û7·Ia—«”¬ˆ°ZÖ	ÂñˆËM-¬ïE[∑;}¬vÒmÁ/˛“#≥ˆR,ª…€Ûöº	=È0Wˆx§J¸'A˘~â¥ÏC(√ûm‰‹ñ 9Â»˘a˝ÄâúË	E†ºêÒydtî∞M’hs§ÿáx<6ƒ©≈≈u1üç√õU.6´u(‰=@5ëG{÷%¨%ºOê≠"v∏Ò∏»FùbîQˆá∫>T;8ﬁ®Õó2˚Û"[ÄïY‚v3RÊ›*‘á¡∂'…–óˆH¸Ÿsƒ«A0Ùî8Ü≤e∆Õèä8…Á	’C:)@Y•˘¸áœ?Èqƒ©)oåÚsHÇ9◊)œπ˝{∏ ü¨f-hZ7˙øÆf|gﬁgü)´˘N∑Ã@ÚÄì"ëEBÕäxF;Ë´®Hz”⁄D|¥¶¶‰óπmÒ8ÍD©áπ8õ£˛*8KM7“PX:ØπE„yhiÅπWl≥Áï/˜örh˙ÜÅ´õ>+fZﬁkÅÅÏyW j¨±Ëà¬∏ÜdULa˜sÈé¥xxI˘ñà¥Ä°’ƒe/L]zŸîzbD2†·0ã/ìú#–…vz#ÏÊ‹JáëÈ-d˚2Uãé&õ(ºaåÊ ˇ5ﬁH
E˙&ô≤Ùä*ªÎ1„~!VxŸd }F˜`–{Áù¨?ù¬'6á≈xâ˚ mÙ1Tü$$,©∫≥Ú-•ƒ≥,Üò§,7eQjO jF-Ó[d2˝ÂÍÚÍ˙+›?†Ç*…@ç3¡ê˝A˙µIKãO$ (ïöÆ+ü)ûôFh◊õ€Ω8+ví¨”ãE4xs~K˚wX⁄ø‰œ˜èåG˚R¨î_úÁÙw.íªa˙®pLxO«ò–]á¸dêí√›/ÀR9ƒËîLn.õí«frO’‰Á`qáiÔˆè‡ÃC€_º£5i~å Má≈ﬂ¥ûg®;Àw‹ÓJcƒ…ÍvV«u;ŒRôrúÉ◊ßﬂQÍ£ü8âÛ÷·¡”˝ì˝ùÌ◊á€_m?€{~r¿+gXˆŒKÄj¿√ÓU©ÿI∫eπ¸”yÇ_„ 7Â›¨ÆÜ¯sPõÜyN≥‰<*R™ø¥…=´˜\∫$Ä<â°å;åH›a%é»Rpï∫+Ö¥ˆ≠Ÿ±¡§ÆRÍ!}∑±™w+	><úâ•VbáÖY1Dwµ¥Å∫)∑ñÔ»:äª¬u≤4aê_{cuŒX•= #?íÉv.b∫Ë¸ƒZ5Sü§H·äôÛ√©ÂI6aµî=˜ˆO‡·
II'a Û¸T¥Ó[WEåCÅû≈AÜeµπräëV'ÌüRQ ÍËØ√,Ó$yî-Ñpû∫5s›ŒÒÂ£ôË<øàßŸyBèˇl≠/X%C=ó7ay¡.ZAZœ”‡Yàk´`FfÂÈAû˚v 	¯}<‚√œ∫≥Â~\§]∑gG|*âbõHGÂ@KbÉè·Ëß√ßAÏùz}ƒß6ΩﬂP_év∏÷ÚﬁıÈ„Se™kjíK6cër èÊk¸ëF{s-doŒjw~=äzè√vßæÈ˚Ô HÚ'«r&⁄p’hVg…å7’ú?U<Ä_ºLÈ„
hÙ~$4ÀR©IÊ1ÿ†y∂6√¯åı"óÅ.'ÃpyœÃU_á`œ®À‚~zÈ£ç˙fJWÙµ¶è
˛Ö9¸‹Qí˙´rÚÚíu9irÛ$ãÚãı±Ú˛]?kBπeEîæF@‰Éø≠¶Î8yc6ˆ≥>P⁄˜ÔK2b’§[H≥òŒ¶Á©’éÁãÜ1kñùﬂ†Kå4≈≤l˙	=‚ŸãLq‚ñ“ÜZ!L¥±‹&≤Rﬁ ß9Å
(ª≤ä©œ>§3Édx<ÂV¯ sΩë>ˆô∞j]•ˇÜù˛6HioÛ‹z˛ƒr2Œ]¸Âì˘ÛÁj_<`çñl∞ˆoˇJ^ƒÉN¬}Ïç4_K¸lõ'YZç:ôlé¨	O&åÀ_®$ ò÷6iu*Çﬂ˜òà˘`Âùç’qyG •Ï≤GÃàâ¶{î¯wã±JAº7q6™U√‘∑üüU™-ámúÆ,§F”íÉÍX?[87,n6,√®€uP∑•JGÅ^ø;Ë±√kÆ¿î*∂ÆÅä!Qî@≈4b*Åï"<Z0µB‚¨Ò‡j˚KEé©2öí#˙Ô@ù[ÿ±ì“”ÑnÎàÓ…h!ºã∆EÖèΩ2ü'◊Z [d¬|ñ»¶Æ.≥"<)§5û¬]ÕËTG˝T§—a´yøM "“V™ÑI{¿L§äïôaˆÙç3E
ú¿≥,Ç9(eÀ2T†tnû†°•jI·÷ñ;/ öo7∆∫ñπPû2û**zä¶§ÁtµÉ…LwöhâY*›Tñÿ2‘œ}âMŸ<ÕÿnÉ‘ò $ñ2”Ì0Õ!…ó5œ0ù∞MÓ!BãÔ7™Z ≤UÉ:CZj“ºëTÉ{0qŒàó2fù∑çÖ&À ÒN¿»%Yõ~.I%z i
≠¯m'fIìQ —0Íf Çö(B§.c¥Ã3⁄:æ˝°‰¡G9Ë2Ì‹˛3°áÙÌè‡æÌƒ›x ùñª1;^Ë	8$¸hëå˙BR&gqu|∂»ééSvø¿≠ì-[≥7õ/î'eƒ@®öì57«ıò|@v¢€D¨£><nÏCÀ:⁄áh86 |ø¿¥ô‹£†í˚Ã¶È.[u©<ÊíC…ÌÙ›h”ç(ﬂëml®	ú!ªIeF{˘0Ó$–Æ6T‡Ú>Ía¶∆'bD´∞QêGˆﬁRﬁ?EY7 kÖ¡’b…Ei5˙‹_ÿß1˚Ë≠á¢RÎAûö:+π⁄M¬MG5=åÜzûˆc`™XıIƒ^6}®º„vl∫@gÎÉQt1b’ï+Gqë∞¢—ÒÌÒ
|Ãâr€X?wã| ˘l‘+†ÊÎ7£,Õ…zI>N’êS< ⁄l${˝÷G5™ŸÙì˜º
ZfU#:cA8{\9 ˛⁄M3IÈª[∞ì)·ö‹9S±ΩÙ°1’w0´¶L•›Ù¶zoLU∆ﬁvnÏuFΩ0Ï+ ‡]&xÊØÎ¯@ñWØŸpÎ¨†%NÓEê`õ:JIˇˆüÎ·lÙ·©˘Ou‘ê·Èïw	fsÁ||íˆ‚Ïˆˇ®ç‰πáLÁ¡¥¬6Özœø3¡Ë≤2u¸~I»â‘{mòüπfΩÚ19N˙ÿ£êùHÑäxõt"î˜h¶ˆ£"È§‰„”3Cu∏=!Uƒî≥'SiÏÅ≠⁄ú≤eäôT 3∫eúdãÂÈ¯÷´∆(Of%ñr±˛náÏ±|Ik,©£oãµ≥kDÊKÛ1Å∫ﬁRr7»›EíßßYL∆œ`!‡ˆ¡º?ß4É°&–ƒ…◊Äì]¿é&è¯∆é2fq∑\oBﬂV^sWµC£l‡N–¨±ﬁ7&-ÿŸ¨Õj∂:/‹›∆$ÿ0∑<∆‡<=Ê*@ﬁ*Y
≥¢`aÿ!UóÂ}|}m⁄›íå€•Ïı`Ìù≈ErôÊ7]k
Õ¥(âˆ√/äí¨¯sLbzOãzUœüíx ?œêxæ_≠¢Êf¡Ç|GnÁØ¢>EêÀ ∫‡M‚l>Á„M§Ü*É¸Ãï–©ÉsÀ ];‘Tä{ëß+4eè$…„Mñ∏Á/´©¨Ê¡)¥°Ñ†‡øƒ˘$+ò≤Å:i<v⁄Å4ƒœlïÍ‰¶’<÷U<ËÚée,⁄XÅ'¨®·2 *ï®öwëÊ≈ú/ùRoÈ~≥≈˜A∂πÚƒë œü“MÚË¥w©Â]RF)«º©H◊∂€ãè#©⁄^á+q∑èKÑòíñSJ.∂GçzóÙô)ÂÏêägR˚á”˛¢˙—®˛ΩπÇÑ„”#ë˝„⁄1dëDV%#nøÆ∆Lr∏‰ëyó4G %U§µ€—ØKW›ƒ:◊^«]*ŸÁ‚Jüñˆ’2µ3äQŒLGjàtFÉﬂ|≥G/§Ñ+ÔΩØè∂LÕÿ8KoﬁP2ã´ù!˙d–π^ƒÇÃöó^“_¢î¸ö¨›ºYÄµ{û^¶Â‰u√$–πﬁyô;+Øì√◊˘êÙ£∑K–_ÚÚ‚Å∫ö≥^zE◊
°[∂H˚Ky'K{ΩSÑ3vòAO∫∂zﬁSÈiIã¥∏l,®u&xùÈ—·¢}ÕƒµlöΩú z¡o‰ª€I%#8†≈lq©r∂m¢ÔG	[∂Q?¢&{ë•ÉÛ≠AzëK∂é‘Çf_í÷•oE©!€ãvÄÊ¸faﬂ:ñ€”ç†v„"…∆≠ìÍË¢]µ‹wö÷˙©¶‘†dî{±ı–‹•ˆA
ÎéÄö∂úõÆDxMl€Ω
Å`˜¿»ÏqÜ7@mÔ†hÕ¶òºè˛µCÚ8 :û{ˆsÂ.ú^ëç¨≥≥5»mT{∑∂¸PØæckc/æ´~+kÔ™•¨JÔÃÀ|æJo·ù˛~ñSmÛI*e∫Ølë'£º“ò'lÔ–›ÇàΩFû=Ô‹≤w Cá%ﬁ∞Å˜ªVQÂÕW∑∑ûZÍ–ˇÁœˇ{Ú"t–ÉÖ–¡lÊò9ƒj*ìöâ9ÑØ≠˜êÄ.H˘qôh≠Ñ3-<—Éhæ#›√4UyîE"£k™‘Æˇÿfá≤8˙ 5h‡‡3™Pv]˝ZwÜg;É·wÍ~π≤Û¸7ébw(ÔrŸ&t-(≥ø§M.];º† NÎ…ëòÿI‹ã)gƒ%ñ¥}ÜC∏u≤˘·ûŸ)Ù“S≤ÁS¬3ImSÃ\πãçò"´IV¨õ¯Âé,æ˝I)”M ÂëZßuªP!2¡‘˘°”˛z0äråΩ~íÁ˛ÑVªfmÕ^≥—Ã†ïº“|?u·P´Ê,∆ÑèB◊÷/w®y]ƒ›ÌÄÒ°o«‚˚««∏W@îÃwª+œû≠º£;rÕœÆìÊ^Ω≠°Î¡Ÿï≠ ˛É§3uPÜX¨Òö%ò€˚5{ÀÜ∫M£<k2ƒˆ52∂?C6™sz:ô6ñô;ò˚¯d˚´Ω◊Gª{GàsJÌ•Ûÿç4LT‹Sº∫
ò≤øúi5N∑8ü√[}â√ºr£¯Ûq‡æ$ùÄ‚ø(˛£Z5¨í¢*ˆè0ﬂ˙$%á¨∏(&rsJr)î-Ã'bf‹≤’ÍØïÁ¯› -È S6∂ˆÈÒÕå-æ˝fcmEY—z©mÚe< ^yLß∆6øa˜
⁄[.Àâ›≥›)íÀ¯$:mÕ_RM&≤öe5Fñ‹îV∆ˇüô)%K$ø-÷z »∆íÅNj@'@Ò0≥äxGG…µ…5Ô˛9>Óz`FéRSsÄ(vt	∂ﬁ§›R(œ úW9¢≥?ß@œ≤1?∂2≈OP?S¸‘45≈è@Â¶oæå˝IÒŒGs¸NñGÚ}Ònö∏ù∫cÉX¿ılÑRPXó˛ÑSO–ëLôì<&x¸$»–∆)ﬂê6íkÊdìS2î$¶ıŸ%1˘ôÌs_„+v£nÏª‹èe¨m†Ö¯345è!Éòo1.Äá# á¡◊!}ÃP”¯\Ö[⁄ÀZÁiˆXjY¸¡ÇLÈ∆X∆<¢≈)Ñ Ô%Fl–ò¿”3G˙‘fòp÷≤˙O¡ê˝ˇL®Å3À«’	G˙‡Ÿ¡Ìà7XVËH=~ÒãΩNXœÈSOBæS(w ê`PD=∫ø‡ƒ=dÎ≥"≤:&Ì∂pHëyÒ@‰>á·W~jë∏…$Y7·'iÖﬁ@™TΩS:i/∞i
q&kÍ¸≠ÊMπÙ8ëAıÕÄnZof˘¯zMÄLG MÙ˙©ÍØÍÆîjIw‚ÊMX {√®v‡J^%RcÙUóÊˆ=;ΩÅΩD∞æ@jU¢iT^,}2â÷`@òLæ‰¸¢®·à	X7§%©PéŒˆ)üVsf≈|√V≈ô‰c¢ËØ„ ≥µ∑aèuŒ86Z≠◊Û‹cÃ√ŒrÉ*•@bf®ñkπ˘◊cıYhÙì]√∞ôÇΩxp^\‡nXE‘+´^ßæU"6çuÎy<∏ı	;π]·∑d–ç–‰J·¥|5A$nÉ'+yé≠)qúMRÏ¨2W€¸D°_óﬂ;ApC1I=◊ŸΩÉc®)‘î¬¯œÂ	œ„†s∏˛¸µÒJÃ®Ò¨lá2,ãúaëm◊Ve–îl†N„|;OO -[ÛÚD¡€û˛°”®‰vO§>ëvrMB„^*é–ã9f®D	◊’GJœ¶É]ÁΩuﬂIS b’â’xá s¿qØ´W6ãölãàîPéä≠L—è¨wÔ0Ÿ‹b¯6@î%≠tÅt\≠7[’[kS¢
∂πÇ'5¶≈—˝b4,x˚Ä£≈Ã¿ÏFeÉÿöVmûÉlíS¨˛´9øÿ**øs™»±¢#˚ıAá]…?ŒcL:‚ˆ§Øw¢^ßµ¿[‘F«+jç∑ïgz\8"^ûˆ\∏…ŒãF9û≤Ó¬÷_«<‚”◊wxã¬ˆ¥Zˇ ‡‘¿ÆÉﬁn˜ºVqB«N:Ãñ}"b` g@y	ö3[¨÷@jCy∂1w[‰tcÓr{â»æ¬◊¨x¬≥ás∆JfÑˆõ‘u|ˇVRM‡“öå	Îä@!&çMÃ√ «E6Í£åÓàkRŸéZj˚wéú2ñ≤ﬂûÁé9˘$Ü·J5Ê#y |C⁄RÈÊGEú‰ÛÑÍ(ù4£Ç$ÕÁ?x.
k6ÓvI™pSH⁄ˆLª˝{∏™ JZê¥nÙ~›]ÇY≠¿ËŒÄπ@ˇ*Ñ5ã$CöYÏ£Ø¢"È]L{+ÒQõ&¶í_‰ÊâÜYzu"\€vû'Éà“°:•N⁄l/ï ∆Øπù„yb’õÇ⁄≤±Â6{^˘fØ)ì∆æ◊√9æoD‡Í¶œäô¯∫<≥Zè+ã†Bä´Y1FGTÃ5$´b%ªü+ÅÀ∑D¢´T/πÃ‚Ö©∞∆‡iñ”‘çvP[Sﬁˇ°óÕW÷‘∞<FåTQÓµ)ÿ/˚Â∫ır>è˚b˜Éë»ˇ˘ZryJﬂû%oÒ™JpÄ¿;œ‘´2ıöÔAe\ﬁB{˛wLX¿P¸0Ìy≤NΩô_òéJÔwç›™C˝ª6|Â9Üì≥Ê‡l2ºØ¡Öúú˝’zN9ÏäGô']K›»˙K¢;ã~Îâ¢Î_»·2”ØÈ◊æD9ÈÎ°±∑UÂßÃ‚.˝éÅ+eŸˇ  ˇˇÏΩ]sGñ ˙Ó_ë‚x7~H÷∏)â
à§lNK"õ§5=£÷ïä@ë(@¡U DöFƒlÏ√>›∏ª7büÆÔ<LÙFÙ”ƒ∆DÏÀç˛ì˘%˜úìïôïYU IŸÓnÑ-ıë'Oû<ﬂá>Wá/ˆOˆw:Ô;_v^ÓΩ:9ê° O`Fô*€an˜ê›´äEπ«∆ÚMä6˘:Ô8ˆ®ß6RMw/G[æ7ó5iú¶Òyàu¬-vœ•&÷û®µ3?R·¥2>ÔVãßU¡§`úqúk÷K≥±’—kù2i™Öó´/w>í—/Êjπ;Á˛(Ó∆“õì8´EwÆªg;ÀCq1Àbån¶Œñ™•e˘Ü˝·ˆÊ-?É≥ÂC0nπ<¢sû )c≥NLF	†–¶,l‰¬+lcsùx°rØµ;*ƒp˝G¨<^Øú∂ï‹\ñ-˜&n÷y‚b…l˛ÚRπÕoß*L˝§ÂÚsup˙ Ä@e¡¡—é85ÌÛS ıõYãﬁHåh ô2f%QîWÉπíÇ™ºgÀ‰°¸ô
ﬂ∆º=ô¯∞ƒSXU~û-ÑÍuP˝Æê˝w¿÷?]∞rºÖÎí4∏ÚzÒup?o¨v›ø[Dˇã/=(Cä´õ~z«çÏ>	,®¬ïWQXF¯%ëjvCk˝Oåp’û◊nw°4Çx‰ç91ú—¯ø2¢’LfD^À"˛÷pcŒe3ı»¶Óˆ¯$≥˛ÊRûŒæ€ôÓÜÈ$L§ä°ÁNz¶∑æå!x˘’•§‡ß:
Ö>f±”†íA∏I:˙çyN§∫àl±rP'EE§»∂n1dï>uhíÏº≈©ì ª"C¿ˆsí«Ω8ÿözAwË@ÍTcHÛü¥Ñ)}*iÿœr3–°∏&÷¶ˆé(∏ |·Nÿ≥i¬ˇæ˛üÑÚNœÆÃ:ï)ê¯%&«—¨‹W®r‚5÷¯âˇ˛ø´úÕ«‚-ü}Ü1M√(Nìº’qÕ≈Ê~éı≤¡Ä	)S‹/ıgk8—N«Xì< £ÓØ/âQFK>Êò˜Só»ÊÄÆ@´Ú˚~⁄ñsî˜nÉ£º^¯ˆÂ1◊ºÖªq6πÏnó@¬œñà£Ÿ‘/ñ0.Ö¡Ü…∞◊s∑"”èùwÛ„§¿-≥ŸîÊ¿ı˘RË9ô6≠úL™ ¶ä”„¬ó§…„tQ”A^ËÎoÕ?ûy]‰ó*ÅÜÚT5ä…≤Q,°_K7°"W,ÑÌ6˝a⁄ˆ`»6&„úÅIVë*∂Õ÷—‰•e ,\6ÛÃërS÷BÖª|nˇ∑X∆Á$"*.¿Hß√D˙ù≈£p¿¢ãFbˆr9+gE•ö>>g∆ﬁøÅ≥è£°ø<Øïø$rAY˘∂π˛#Kÿ0 `ù)Uç|n¨Ïö7Y^jÓ6ñ◊—–/|yã‰¯6™eÆK$¶PáIÜnãI⁄ô¢›∑ÿ=JXQˆå?Ô‘G˜ö®ô|õ•Äπﬂâ´˙ΩﬂÜE˚òS’;”∫¢ãnƒ›R√D–ûqÿKëÍ,¬Ú07π,ñ◊ﬁ·˙_Ÿ0Lë÷ÊÃíÓıˇdp _ˇàk÷çzX≥ìcéª1¶ [l:îƒ1>ãRJM€S£Â>!–é ÛO[F$£uyi,¥F%ﬁeFeEÿ\\2\VUÚ3˝R`±∑%è)g[?G…p±¥l?ÌÍsÊeáˆ'Úûµ5e∑óTµºòq>yK/ÅO§5ª]ÉÛGRß-çr5bùÓ˚¥ÿâΩlu„pPü¯‘CÍ¢.À{€s#Õ¬ﬁ`=/Iï2^@ÑﬁD}ëíºıïø‚Œ¬∏cW]	˜Cu€xt‰´ÿ≤<*Uîo1∞ÈU2åsÄªR"òi2˝π"é_ÖyßE˝ë9•¡.<§eÌ(öƒ<ni1º+ËÅhÚr∏´•_∏ ~ªkH≈⁄YƒxÚ1’Œ∆ö˜Œ’ªÛÙ%¸⁄97”ÙÉˇT¡ù›Jñøo_{F≈ÓÛÏpï¶ö≠&ÏÎÂ;Ò¸˚®n)y√G«3æΩ~ŒxˆépY<≥^˛+û˝Tx¶Lq;◊?∫”AΩú!~ÑxY'x£à
/ó€¯)s¯ŸZ+ä8Œ¨4lûÔˆ0a√ÎˇYù∆√næá¿…÷iû¸òI<>:6ü$É(Ω˛G √÷R¢‹˘,£ô8$càC\lüòÔ˛eQÃõÂY*0ﬁ@0∞˘eÀWkü±„xH•Â0¡âágü≠%√¢èv¶£tπ≤ÿπù+j1ˆ5K_y… -zb§X∂aîJ`&†íÏ¯ıÇøK2p≥›[!Jô\{‘∂JÃwÔãc◊£¡rƒt> {Øl<∏ªäOeﬁceËbbÜÊ%éÑ∏≈≤‰4çÿ“Œ/H‰–SéRã%Òe]VÒPƒot√Aó=°?àﬂ\ÇWãÎôÃŸÖæ0ä4öL”ëﬂ≈≥B9pˇ¶1Bè+Ω•ù™ï'!ÓIù’5
oïîˆ 3öÊ^W‹Ω
÷âübUU•›WG√}\ê	óOw’ﬁY4âgI6Ô9}rní$q¸YAíá†vPî&õ˙mA//¨¢Ä7¡‹πwº≤ªNR3o:™~}ˆóaä5u(qú,>v-ˆπhÓ\™—ƒ/õGΩÀ¨`; CEÉ0O∂‹Ç…tAzs7ÒÙ5˜◊Ö‘Ú‡k˛°}ÒEŸ/·ÌtìhIﬂ≠Å_÷UJß#≈∞h‘Ö†∏µ˝«œxƒ,Lc†D¿÷ıìl≤R‚ìi◊–ûo¸OØ=s∫√…>zqû¢»3·0ƒdxo∞®ΩAtÊ¡¸vnMΩgH<0 p»µB:OkTèÎµèz	`JEA‘ÉÌ≠=Ú´_1ÎRxÌ…4„S¿ìwß£>’∂|øìb2¶◊Qö°ıÙ”+˚Ey&Ï◊lc˛À_Rﬂ©J±_åAu◊>}Õﬂè◊h±ƒoï…ÈjG¥¡|ghÔr◊>KY[c/1√.A¸ËE1—c=l#¨Ÿ@n3Ä¥•	ãœÅ±˘£≤a£VxüáËÆ»èíYËoøÇÙãàêT§∞L®ËÜÚ ù˜ÿÔAG£P<+ˇÙﬂµˆA
Ç'–0`§nÑYàáÅ!6z£úçj6YÓXô…∆§4Ü„‹Ôa8˝(˙ ¨ƒ‰q6I¢€¡l€qO+P?à&B;Ω•÷ú˝¿êòúMËAÀæÜTÄÂÉ BÕ<m; £ïj–Ì∞◊/πﬁ—X6˛%‰0∞‡ﬁßZ0'“$Ôï677a8ƒÃ^4*Ù@5yjÿ˝0∞«f≥ùMÇ l±S¬’PÓ¶Uv*æÊ˝≈⁄«¥)Xú!{ruÔû“ú.K≠Q¡◊ûgıT„P°›´˜x≥≥u	Û5˛‘ª˘⁄ÁÔÁ‹˜y%ZdÀõwçç]ŸÍØtS.™ô'≥ZûVm .îP™ß„ªoÜxiDNÖWZl&W	1∆ÒL!€ÊÜ+€Ê}´pr!á¶◊-›SÔªƒ˝∏ñ¸≈Ω∂%Ÿøísû_≥◊Êç±J¢Â*€xõÉ¢¡ÇE≈&Jnî ku›ŒØv^ùuNﬁütNæ>ñ9?g‚H{ãÅ®Ú«ú˝˚ø1<—ÄH¬πyërÃ⁄]  ì®◊ôÄ(ŸÎ≠Ω|πv	ˆ’W[√aôdYÊÂNÒ√9É›‰√hêÑ*TÛ∞wÃUGKÏRd
‘‹hnÖjJ$“@ı–ëxUÀÏs∏˚|ÒÑä÷—^<¬ıC;¢π‹Ï>¡ü|NﬂÚΩÑNG%°Ù-C:?eì≠xC`ˆ6€@V	ëkÊ{àsG†äy◊ú<{*öFáûáF>p–»Öm’≈ñÚ‡ÕÜ¬@Ö(m â¥˜‰Ò…?ºÿ;∂Y
πCù¥ÕªØ›m–.wﬁr®h®˙™n’'ª˚Z
+o)'Öô≈Á#$VŒøÿkZVá¥gÌà∞öÀ$S¥§—”uM:i—à¬L¢!ÜÖ«∑8°=ﬁd›	Y#pœ´|‹œ.i˚≈Ωo=6oæ˜ú|UpÚôªhbﬁLﬁ ≈¢$,Hcßw#@◊~îŸ rÖ5ï)Ëdzo	Rπ≠dJÚs„ Á˘Ò•_ñÏÙ=)d√O∂Ñn#œ'–MIöÇ]G·q?é=#¥èÚ‡°àÃ$Q/À°Z$>ÆS÷>IÀ2
T˚sÀJ|√bµø˙ÊÛœg˝∑°w6H>¿Ç˛„ Í ß:\Õ∫i2úÜÆ˙{c"o√⁄x_¨3˙¬(xá“	s»g a√™—“h%ñ≠@)Q◊òKè?∞∆û!éS≈qFQ’XãúGÕü√ä˜í6Ì•4™§°èy˚›	ÓE¨∫L∆á·(≤sÂÀ^üÿ√¥˜A2:äæõFŸd'øƒÜÂÊ∫‚ÏÛëŒyÿÎë|H1Å Î∞®A£Qºπó¶I πóGln∆÷≠’“£9Vº∂ÕÕTm?è∫}ø˙Lµä∞ÿjõûm?„Ã0éLÔ≠+£Ljj2¥;›n4û†∂üãô≈Èp–l¥økuìÎ]+>3qµ&nΩÂ◊ãœXp/Œ¨=—tÔÅÂÀocÉpû<ãÅHYG´º2¡/h‘_©-Óé/áÛ<ùXÍÜÕ¬ô»ç»˘âòˇ∆äﬁé¥√è_$˘πÙEQúTVi%˚1`ö–]“U ÷ÁR¢B¿Bµ∫A!îçaR®ÚH÷Nûœ>z>W£wK‡*fº–;?˛¢€ü≥oÆîÏbõ	<âX6ÀF}“±íÛxÑö_gO30–Opù
∑ˇ«"vF§ëÂ…]∏˙˘˚∂”«∆a\ZÆZØ*kÁRyŸÏúar--è˘/@»ÁˆÍs/„ﬁbc±≥i%êY!«≥‚-ÂSV$ûµòw÷K_,ˇ±Öéb—◊o£K<ã¥Œê FÌo£KŒƒÔ!W‹häsK‡ú∆Iãx⁄œPäZã[óE™sÆÚãJÆ“Y©∫¶ÛmŸΩ§#^}+Ãå'x±∞ÍERd,2ÅﬂWßún‰~%≈ù§»≠„∫Sn´lqmÆÁnNœjK®|)≤!ß≠|Œ‹âãäª„öŒ››Â-;¨g{^tÈ°
›Å¨«lcUô–'m8ä±·j6éGxÆÇ»ÔÃ›©_ú=68œíu9;	Ü&m8t]∑«ﬂ¬∞∫˝®7D r^ãMtºW ¿Óüó˙O◊9á Q≥7‰·ê©≤<º´Dq?Ô¶(ä‚ﬁúR•ƒCZ•ãU≠µ]1b˘π≠ŒrUë yì◊∫Öî°í⁄´T~§˜\RœÈ¥*‹8ú9∑uà»ZTGî•aAò[œ!ÙÄ8/—°äN˝ïÿ Îπ£∫vøπL“¬õÇ–ÁﬂL©çÍ¬WUèp◊L)πh≠Üs∏¶—0åë@æF˛ÏV‡Ê8ÿ`•ÀÈ*ø⁄á•…ô"ˆU"UN‰‹,ˆ„}Éùßhöƒ√höÖ√UÚ—ÇÍˆû/d?£sœy¯r⁄[6„\h≈√ÃØ-∫8Ü’◊iïú;U¸êáZÜRßãé6<Ù»n>gâÓU≠ùHú]é∫Ã¶Q
áÙ⁄˚›4Ügª@7πDã…‹x.©o0«[úMH˛–C˘-XéÅ∆RÏﬁ<+é,zÓÏÀcáiØ#ƒ‡ï4NŸê\_zQûXÖç@ùõ[,C4ê¥ıˆG!¿<[ ¥4r•˝ÖnF	;ÖuNx?Ω&èõ:ô†ﬁdà¢ª`πpö™„o¶oõùáŒ”pÊP@˚<∆≤˜.ú`ËÍ≤@àÄAn‹]K¿zHça»òÂb:Ä≠≤pœ n='ÒÕ4Ç=P4/P?ÿ ¶÷c3ú?ª·)Ä+cOÅWr(P4Ö≈GÒÌ¸ œÅ¶;äá{<Õb‡Bwπ˚§Vx¯=qî)‘qËFF…á˝,~g@Áx‹“˛Ò¡1˘üÓ‡˛ÆéÏº¢kªÇ ù$p1–*kå'o±àÑ 9∫p}cËd:OÅP∑œ“d4îY£ŸÊã\Â£xwÜŒo÷†Z⁄jo…ŸŒõÌËª†˜à º—LÖ–9K⁄"iL˚…áŒ J'¡˚Wh9Kb@ï,ª˛fC ∏¶Åˇ[ËπâØ∑áàÁ—¸=z‹•Ïs!º«{4»‡_È”ÉåÃ∫9å∆ÅπŸ‰†p(‹o,ëdaú‡~Çmï·/™wÖ_ ACtñÈëîRd˛√`ì∞Õ–Æ 8ç{˝+'òÔ	˝ìY“nTMÑØ≥XX_Ú®6¿ﬂ2VØ∞ñ Â–®∂£≠´s…†ãŒ` ¸Oîq∑∞Kïñ“∫¢#[Fgèt?¥qòE9lT”çxc'∞ÎÓ¶ƒÁ¶˜ê	·ãà! étûÒhä»CZ·”0æHXp6ò^`“k ´Dœç•I∏3DŒqËÌ)1g≈BçDé∫∞´Tˇ)|)F3t§Â¯•—u-+ IÏP;J†Îùän Œa–üX{Ê—HGî<ı∂àﬁ˜C◊ë«¡ŸBá_xf«∞9¶=w≈\ÏÇÕı"≤ÄôÄ[¡oä[pˆ•ö8ã∞Qä÷‰"&Ê˙‘◊+˘÷YH‘N9aËƒ˝úutfBa¿=OkÇ`o9∫·ÎÉì>‰$’Hp¯&»O¢åëÔ¯ ¡oWXñ˜MJ=OÃ<íú˝díH3B;Ä3/‰né} ôL¶”EQµæ∂4¥ÆP7ì =≠_˝^◊≤Bπw˘<‚8õc†Ωé8≤M‚Ë¬nüæ#√~7çÅÁsˆ5A7x~4q|p∞™∞µLmŒ¢xÜ^ΩDŒXs∏œ»ñ“)’ªâÉ @W˘·…åoh‹°‰˙Zª…6Îú'9$˘¶S`ß˘pæØÂÏâb0∑	ß`È∫˛#Óçﬂl”Q7dg ¥îÇ‚Q7MFÑõFLX<á=SÕã˝X!ÉÌ±g˜WŒÁcs>ˆ
,¬¸¯9ù=´’Úqq÷»Å7∑œ-›…r«PaÕlS_QOFÑù8Ì"e|x8wŸÓIÎu[è˙À°≈X÷(p_¸.5,„¯ÇåÁÆ0,éì·0°˘$ŸÈ£æPså≠tË™(£_Ÿb¶ ÔëŸ<
¢'˙˝@Kß”x–;TWçz~]nÂ£C[lÀ∏yr9é¨íˆ–i4Çù–ç√Ùı:˙√÷-Ì%4sÍO‚oÌ6á≈ñı¿º:H_∆‹Íb.åÅZ.£ã˘x—‚¢l.πÃ?ãCv∏ˇ{C1U∞ªXhÏTÂQaın2p©¿äT≠û’ á’7õ_ê≤µØæ°˚£ˇjπHb„YˆÁÚÛÆraÕ√%
ª-û≥,Ì>πzﬂüL∆Ÿ÷⁄∞ÚÌÔR‘ç0<m∏6€X„A&´ﬂ•0◊^¥ˆî`ı‡Ûı¯ˇWx–<Å≥jÑ˜æ>⁄G.3AœAéﬁM™Ç”‚… ÔéÄ≈™3 ~≥r)MXÃ;9˝÷U‰∞B¥E¶0Ùiî&¿∆]>Y%´ÚR—»ô †x	‡≈Õby‚&∑w çlAÀ«(üÖ71Œ"V1s7ﬂ§ ’œ ,ò~˙∆PπÚ“ ≈ †∑éæı9Ç‹LÀÍ %âïñÅÃ— ohVe6µèÅ5Ä˙3¢P7Dv
tÛ[,˙'úx‚Û˛ÑË yeú÷ã “"‰ç†Â…ˇÊ/≈ço¸∂´`íÌÀ„Vêå¬à¿rƒ„”$L{Ì)@3t∆ÙΩ:≈üÆ®5÷iáΩﬁä;πçK†∞gu√¨yAÁÄfÊrä‘n™Jë‚⁄}ó]ÏVjE≤∞;âg—V¢1Qü◊	ÙÄ„uåô`E|Úïà¸©ëA2
50·˙_{Òy¬ÄÔ„s)s'Ñ1íø"+A¨öà·§?√¥b†ãt»mµv3Óe±KEÍ∆Ÿ≥È‡€›Õé¬˜l0Áªn`ŒwºÆ`π?‹ﬁEw0≈∏ı[p{PÓÊŒ¥˘Ä|æ Y…ÉE‡ªü%VOmDã«¥Yπ¿/‰˝Má[øÚîQ"Jëõ/:∆Nºk_8‰ö4z√ ¢ÔCRÚˆ¢,"ª> 8N&IFÁû¬v€W\ØıPÉô/psnï0C2Wû√
Ωt˝)€C„5/‰¬5j§:À»üùEÒ$l€˚k\ä‡À:È.‚<Rä≠5H,èâ9ıSÌfî8ãíO∂Ú°ë.¨n˝¯$≥~ç“ûX˙]Tùë*¿-‹™ö	ÁÄJFÕ±Hç|“ï˘dﬂxBÆê$#¬‘àˇñ"\qÊ0)≤Hù¡2V≈KQ7Ò˙_DBê¸3⁄p*‘√4¶ªŸqmv@Ω—^
⁄%C©0Ÿvìa"
9"5@G…È0,÷_Ù'u©ü}LDÆVª◊˘*öV% 7*vQôzö\¿Iãﬂ–ëÍT`∆sÙ÷Œ⁄c·–M˙IØùå‹˘⁄û/ÒåmfCXˇIkiã9û1;kAOZr71@l≥ºÒJ™a·†sGŒà.w⁄·znäªÆUmPJ@œŒwπ(VA◊Œ^≥Á`ı°KnΩzs≈b xx„Fã—∞‡@6o1q≥è˙hÍ‘ûÿïó¥«`_L¬‰]7ECÅ˛‹¿Ω≥ì^ˇën_Íë¡‹Òé0¬+o…$1Ù‰6R¬Op4§GÜT·8ññBMƒºI:çZ‹3tãa_ı‹RÖï6Ñxä“”“ù_D8Lm›b•®ëß˙rìåÌNi	Eg äÙJ¶7Æø0@ùñœ	áí:éÕ.ë¿|jó‰_2ç’Ìç7"±¶”Eaı'~¶]æ◊∏√wî;|/Mb-‡∫)lihfÖÔ∏Ú/Îò©íπ‰Jñù’M∫Ù¥ip|`T‰˙¢Qëº$…˝•Jíh®dŒ∆¨øL @.——1•æπi–[Ú–˝ëü)qÿõÑ„êg[ø	M∞¿Í&
\í®Ω›ç6o}ø€À˜s›“≤H@¥µijh ØéO:_ÓΩ;8⁄›;"ñ›W|<£®ÿE<#råb˝ÃÏòVŸ.—Å»∏˜ﬁŒKäw9yg-ØøH"¶%Îæ	3í~ªòˆ¿œî|	‘YêMO≥I<ô∆åò©YhﬁÄ¥ô¿v6ô§Ωà…2k{]¢ß˜v€$œZÓ["xVﬂ`-ç`c}˝?°”Eõoó•Ä$Ê›4A¸]Ú@w%Ë“.ßﬂ]>"– A‡Â∏úYË’Õ¢;Ö˝æ#É¸˚Œx@.Ã—ê}Z°d|?∑wÓ≠iÅE2,å”é«‰◊È˜0ÃÆ œ¨Ωb˘b6<áè∑ıpÌßO˘µﬂúE=Ú;ƒ´]÷Û1vy<@‘√Ñ˘tóB‚nÎM´∑”pÄàæ'}8º/Çıñ˛Œ*»~-Œ∫0ÙoM†ó‰?∞¬h∆¸…∆R^É*µÆ0∑Á†H¨Å?ƒ≥òx,J]ÉØ„å{¬¶cü&è¡¡y]èA…‹/*€ÎËlßAâN!ßŒ§-ÓúX~ª1cKπü÷3Óµ3x)
Vø¿∞»ØÒD›Å5hbÍñ‹€¯’ıˇ¶ÃˇyÃÜ4ﬁ£u:¬®◊”i÷•:AZ"w‘ﬂ“„˘ê;M˙µÍ	2_é\~‰ú ßn´~!'ûEtqbòñ\õKÜï/û¬ƒ—ûçw
Ÿ¿r¥‡‘˚â∞üøπ™Xõ9&¯_∫ì¬hÈéúÖÀ“o◊ÃÎp¬2›‡D€÷S·“|ñ»|ÓqL|ˆŒ#[\'á4˙¯^Ê’ˆ(PK#z\·k$√”≤Ÿ›œ’ªVY#A>ÊŒ4≠w‘ÿ{…@Ï9:9†$;ø˚zˇ§≥{‡L¨É≥]∆ßÃ≤`l∞aoÀ6hx(èì:Õkü±]†îâVfxvY-6k0Éüì :+¨˙Û€àN˙<Ÿ¸K*1ôtB+≈ƒÜß»¡âi=^Î?pwÍÙxT:∏õAKHâh%ÏÄd>Œ˘˙üìÜΩÎ}µÆå˚»¸>ıï•,9@„LväG6HìÁi2g0Õ¬g¶©A”7ãÈî5“≠m%≈¯kD≥% ü¿Í&iHdΩóLÄ∏8i5~d' È ºÂ « ºÁ”QL¡Æù	ÓM25zZÒÿjêÕ·_«ﬂM·41≤5˚^q¨ôò%ÙXV¨∫‰yØ ‡>ÊU§,«ÉËqcãÙWWt/∏≈.ÔCÄ(Àï#¯|=œ—¨øLòÓ"!ïŒ^îåÌdÉv!?√Sfﬂ∏D∫l–]–π√4È¡2/°|	ÓÂß§;†Ωã¶W1»¥b9‡‹+8€)£•NyQÏ‚
Uñßa“—Ë
Á–Üù;q9ø`¸¬ö)–ﬂí:∆@Ù*QëàRÊŸZ}]◊*0øDN0‹*4Ë€÷§R'L™G†∏:^bµ?£nàG’¡i∂Uh∞|ïOm≈û3ﬂÎoÙz1î›å–¨Mü“Q“∞Åd˙Àoli7öÚé\’eRûUO…°êˆR#Nb(Í'˙XD∆ç¸òMõtq÷≈»!Æop«∂–∞jÔπ∫ª˘AÈ∂‰ªÚxzJzä =Á∆©a2JÚh:è_≥‚ÃoÇï¯æ0Ää)Ó™AµeËCó0Æ;Îï◊[ØÇŸ*U|/¬ÈŒ¿ÙÿÕ$πYçeQÓs/ qûT‚öfûÑ‰
åÀ¶≠¨›‚∞p&®,åHUYéSU{5çw  Mû.!_w∫9êûáÉIHûä˛êŒzê:◊ª9Æ‹Ã;·®pÉ#Ü≈∏ 3R c5aåÜo∆Ou@ïP6∑∞xä(Á–åWÆqœ/‹V>/ 8[;û∂å£ÕgÕŸ⁄•ò⁄áÂ‹)ÀT*z€fWáùxπ˜Í‰›ÀΩìØvÖŸ¸›·…õq{HåTùL˛Xò{uæïs€‡çNVuñ∫π≠Ú˜ §„•yVÜ›ïî¢û[≥ıöõe÷`Êæ¨§TZm‹&±(ø]◊Ãã» wÑMæ¿ ˚≥5Pë'·{ÌL\yxS»;ìH‰üÿ™'Wz&î:ˆ‘≥í˘fC”ùsÅÀ-®IÌ≤dÇ¶b.ñ$sÿlÀ≥⁄;ÃCy	Õ'SÛ'„hDπ’"aß‰
?∑«mÃ¿„–ÖDûDˇÔ€VûE∞"=óı‡EæJá)Ÿk
Ñ¯6V√Sä∫4’°@ÏQƒ/Êõ≠¨]Ug÷˚√<⁄Ô¢ªœ«õ∑,}%¶Ncñ Ôﬂ…Ùü«≤e˛Ñ≥«∫_ﬁ©ÁÂøÓd˙«˝0öt7»Y+—£≥/‘JÙ¿é, ˜˜˝píu∆c?Ù‰À√Æ,–˘–ƒÎ©‡òöÆ95oyÌwY`µÒ‹ö?˙‰ìµ5∂∫∫Jt;;'«¯„ìËbú§·
Ç5A¬Ó+∆M…√%∏B„8ZÀEyÙ˛√äÃj¿€p#^?∆≤cx†W—ê$@ÛÏrübœ»Œ˛õ£öŸÕ_ÿOßGûnü≥' pÌ˜∂XF˘ù[≤2œ¢≈/JŒí∏˜»9R≠°-\≈ﬂ{ƒFZ+èÿÕ6Ú'¿Zo÷ö*∂ôëìs&å»¯¯®Ë=êd&EÃpGπN¬”-¸uî$˘Jˇ,∏#≤‚âB/˚=˚Œ ;1§¥,pAn?4¸Qé∆£–°=Õ0Ï7JÄ7˘◊ÊΩGjHoƒ»…ùz"ÃöŸ[h ^EœÍË1LÈÕ€Ì‡Õ€¶ˆUZ0xÎˇÆø†W¢˛|ú©T-Ó/ß~ÔÂYÂ≈ãg¿ÉÔR˛IxÎπ¯aºr≈0	¬;æÿê`ƒB„WL7‡_ª„≥w›—¯ÒãíØ·7tí¢ßEJ5—ØH˙∑#Q¥••3T8	ƒ‚høùg∑U Ê6¨Ñ⁄~˛ªgplRá£ËL_W¯˘¯´ìó/Ëﬁﬁ BtPΩ~¬Û”‚‹`ﬂanV^WStR:IY/†<Ú“ı•Öicß)G-<«1ﬂ=<€d∑w1t Û‡Lªi“,`Œ»¿,∫`@Ìç¬Ω«rˇ_1 ˙ì]Zπqª<ﬁàä£<b§°À‚ µ_b∞˘Úâ˛õooW∆jãÒRÌc¿¸JŸà˘ˆ∞î‡ŸÅ3Ìe8Ê˚◊ºV÷(h°’≥Œ!12æ!¥ˆ¶ıb"oE–ñLkG^2ZíWã4Ä⁄QîHk(øf¥§.kMQ±àp¿x8,“ÎÔÆ©Ò¨ΩÇÂÀöî7ô¡±'7z^çBF›iŒ,mvúP@qQEQÏq‘ìf«Û—jç·65ç¿≤!+4Ú_#R£cx}ÔÏÛ÷Í˛ßî;V_Ωßò·ñ&Ï	0Hö◊µ1K–L˘j%ÁÕ«Æ“Í6>kº˜ﬂQ"^}åîÑ7ŒÇFèíD`ÕÇFãÊ€l√	Ôr/1~ÁäÖYóüQ[å»êT¡„¥'˝h<ó∞8ãsdz]ò,èz«ÚÓQÚ°)≠Z≥”j—È·Ω§;≈◊ﬂaj¿T{ç€ù®∂öÆô™€˘TÁ-s”#⁄º5OïÒ˘]çtÌõ◊ œWI©£0ÌˆO¢thêku’hD$c∑ZÄ≥ÏŸ•Ò6]°WÃç5JÜm"}ô°©ïæe¢‡Ic€ÿ@“{{Fã)ËÙ¯IV€Á0„	»¥çàÓ;…œºÀ†wô_W˙:ã˜—Zå·¶]√1Æ…ë’ õ‰⁄=£4¿ºIZ5<68ê5üm±z0– ‡k04 íï §≈¯+Û‚æà`üu0wãæà˘’ò—"‡1p)ôÕµXg21ªÒL∞0≤IqÙÈl–$J£Œ>ÍIFïÈe4LlrE%t‡∂ú˛#ç†°a~+GÚ6åhHg^$§*˛ë"‡¯Zûv]¥è⁄|pAóå›∂‚GI≠€∞l«£Ó`⁄ã2— <Ô”*ü7üCò´Ål…Q…ŸjÜá6U†Œ˛>ûÙ›#·∞¸ OW'{Eb∆ª§¶nãΩC64€b:S¯¶ãîvä§Ë–N∑Ø¶∆q<üâˆ|´l)9ZÏj5Ç6bx ˙û.®BßÌú|„‰◊õH4N‚!Lò≠ÊœÖ%œ©ÿ>æYÎè∆¿¡Tx7PÛ–9tÍ∏aı¶¬RˇÏÍPª°:ÏEg!»t1ã»QDäÄ¡o?†·ûpπÍ8ç¨„≈A¨tºz´”åppûFTÖ™—y∂≥ª˜¸ÀØˆˇÓ∑/^æ:8¸›—Ò…◊Øˇ˛˜ˇèçv6ƒÛT`˚ŸnúçìÁq&jRGâ£ôÜÍ5w◊õu8Ì≈∂|ñ$É(5ıs?¬ìÑfá'√–AÿßAΩûä}Z¸º…Ô"R'”â$≈G¡´å°êóìO‹–º≈’W‘ò"°/’/Äh‘[ûn–Ú^àtSMÎ`j’’4	ÈiõØ¡>∞a®∂"vı√Yå)%Ÿ0I&}8D©#^¿^*; ÛÁÎÚ|Õóï´ë)„ŸI¢ù_≈Í{E.Wß06I/≠ı‚ºÊñÔè£°ÙNØÆ’!ôÂ∏◊b“Ωô`≠˝§ì©¡%ÉôÊíÄ[@–ÅØ00XH˚ö]LC—-Æ	´5d 0©»†.•Kö¡ë9Ñt@©ﬂ»Ω§€z±≥–œ‹	ŒI®® KπC,h*¨˙®ÜÖı °b˙lAV^Üc≈Òø€AÒÖ·˚˝Eù∑s¸B‘8K“Ω∞€ÇnÆ´Ãa-ã—∏J∑^ÅA“ˆs4‡o,çÙ1X˚√Ó◊®ÁÑHÇù6%TêÖ•+ÄÜ(¶ôèB —Â	˚¢iÄÜ^≈'T4ñ’Ü‡*ÒÉl¢Ü8ÄxÚ! ÃÄ◊5d…Y[õ^†Õ⁄∆>ZpZµ!h∞›˚("¯®ÏÜ Èπ iìsú≈ì9œm06≠UPùôïàj÷ 	…ñ6lΩ$–Ã\x¶Ø‘Øü∞ç¸÷‹⁄∆Z5†OØÚ∑Ê®Ön¬ìG*Sπ-I? ¬°ﬁu7¬Ï∫Xáá®f"8'”<0CUÄ¥'i∂ﬂÀÛÆõ•©ÿ:)Ü†MEâÇ∆¸¡6Dœ©¿¿≠’aRp)/|$_≈éû ZGÑQÿ&NÖé˚Q7Ó%çy>L8Ä√¡ ?hGí^ˇu.N<ü˙KTIÿì¢Ç´ÊÏ⁄{Fa©'ªùcçŒXbã®eX>÷CÍyQ@ÒFíû·{⁄J¶5Û~2Zû,îÍp\ƒ5µÇ™*l^//˙ö&XY^Ωˆá·àñú•í£ô
7/x(´—W–-ÆoQ†¯;·\ƒ≠ò∏à¬@‡ù\çUurõê˙ÏÚ)»ßÏI$Ÿ‰˘˙€ß`ó´¬∑ò[ˇç≈©Tm©¿É}ûçµÛL6˚fLBÊYW}‹ŒGBTp˝ëVGß®°D;˘âÅ,√1∑¶jE"6é¿3sÉJ$µü«k©P+Ü KL`ßßà.ÄGgtãx¥∂ªª/ùÒRîMPwŒ.(FˇØ¬‹eeûE;˙È:„¿QÊdÆµ2aER€˝ë≤¥~—ÜÕOÀGHEÈÌ3¯˘H ´=%D_Æ#˙iÃÅùlQ„CÈeÜ∆Ì~&Ö“»ºMüf˛›§≥m6Æ)ØD®{ﬂeó+•˚WØ)uìŸW®‰_◊ô¶ıjIËÆ∑$`◊[¶Î-úÎ-íÎz	@±†ò>≈ÍπÄ©§ÒRÙy∆U`Ç4[œäå,≥∂~¿±{ .“Œ{ö7¢?@N≈3^GJï\]<.CL£∆ºM`-HÏj+o&˙5ìYÕdtì„yÑ3ﬁ–ªŒáà›Oã≈¿7Ù¥1Óå1b
òâW]»©–◊˘ÎQL⁄tq∞äË=8-ªì}Ó»Æ-Õ]aé/o„3Vå§ÔV†TAÅøoR´crìi
‡¨-—Q˛É÷5Â—'ÊN≤IÄ±©JnB≥o4T/y≤=ûf}Ω!π/°‰c∞s-#$O∑•pR±uX{‹ÿÕz√∏ˆ«”!∆ØnêÅáÁXSDm≥˝Mè4â“ûl` zåÅ◊çñc5ÚoT`édÅÄ˜∏µbõ*µ˜ùIïﬁﬁx¢©svÜ;GqD≈'IP	àÄI!'∑)fI≈€¨7sÒ&P¶[˘ú°ïÊ⁄@Ó¸É>±π4Dá xr∏=Ê§Ë„Sê´Œx#*˜˛Œû∂ﬂ¨øÕG|/ö'ÜÈÉTÆb<ùÇPó*∂É]õÜóœËÜÕ|b <¨ﬁ¶ô< ≤ﬂ≤ãÄ∑chÒŸ: øW—®Ø)ˆf◊?–	#éH¡ábp6£x–€åW€¿˙–,¡È¿õS:¡d0Öô®\ :ñw.U⁄¬)VbêJ5êFscF‚beÈ8ÂÈX)∑U¿KSÔ>_€yu¯w∫Æ†….ÿéh •ÍΩN·+∫Ä˝±úR»Ü“˘Õ°Ö‹ü-%U‘“Aj#_@Ÿ•!Å| á]_∂úh˝4,H:Äﬂ>π¬ê%§(·W1
∞Öi∏? ¢4Êjü7Êë?§∞∆veÖ]Bo≤πıÆ¶©ÑgPWâ™®ü0ÖõÀC_^P%˜ˆ$
–∫¿(∏∞Ä†>Á†ŒÖ
KêêrÑ≠z‘5ïè≈·J`‘ﬁhútbŒ"t·±∆õÅwÙ7lÍ q§'ìãf-*õqáìûπ•UÅägìﬁ¢ö8˛Å∂πn™•±°òﬁÅ?èç°r2ä◊˝$o£à$óq≠ﬁÂ≤Z‹¬óµwÌΩ™™Ø¢õû‘≤-∆»⁄Ì–9t`‰ÙÇúLŸ2ëü˜e’…3FæÖèÓ-:s˝Â,dKM±ÙWﬁzÖ;≈Tç†*íl∞s‘∆ ıÍÛFÎ4Uê˝Ê‹ÅÜp ⁄LG∞£àã,™P·#@re}ÅRFKÅ%Ú¬Ñ‡°Ô*jbœ¢Kù3sÒ0Ôú†åjˇ¸$á_-ç÷›\Î+#˝aÙá—ßWFWs…`[ØÆˇÀÅ∞ƒƒaa#[⁄;|∑ÿXó\ˆFçÊ‹j#π±Í˘˚?å⁄Ì6ã©ÌáV·°˘{tAkh@+Ï◊‰µ1;·¿¢R@‹”∫[“¬!‡£\“¥q»◊o…∆ëÛ√∫}C`ñÊâ/]öÃuUñ¶Å©g AöŒãN¬K»â?≤Ï&ìâŒ'∂ÿƒ∫ì¨pU˚“vp≈·hÁ%Qo>V[•m¸+ﬂrwAlàŒãÀ/=“ÇI$¯-∑f]BÀtZMÄ≥Z–e7Ñ§‰N[í÷à∏	,—P[‹…¡∂⁄%©¿'I`◊&NŒ”({'Ô"Ù"î‹`;~÷‡UIÜ!ñööû¬¶á+Ã–å%†‰z†¨HÂYe√òΩõ∆ßJπ+ı≤¬æ°PÖÊ¯(_Ë4&≥hG]L„ÄïDjkΩU°"]¶
dí†$e“/¢òWûπøŒz1zs'ó¶s?˝&≈•)øRôZ)3π{Úq·≤·YzMÑ@±ΩHó´¶ÈÛLu	µX"ıª‹◊Yª$˛–ÀªÊµÍ»ß8FùJákÌR˘‚åzÃ£à§œ∂}ŸŸÃ':M∞Ü^‚K§çŒ'ÁN”Ûêa^ªaà1C[¢¢'∑˝ê=9∞éÌ!+˙ﬁ G]h·L
ï§†…•H∫Öb]?œ≈OTÍ‹œ5±UDå/g–lèíâe…lƒôrPÿ7EØìdˇ¯‡ò0-h⁄õÙﬂ_êññèDPZ„æ3ñ@£f÷"iû~‚V∂ä˙jõ⁄}Ó˙| tTr∏ 88ÆHìú‰»’ …|˘&oñµ®=óS7äée§JF5OrΩ¶Çb÷í<Í»v(É+°ÆÚ…Kdbƒ”8y·,Œ–-Äû!=ì,;,Í‚]dâ\*©éCÿo¿ÆD¨Ø≤p∑®‹'¨Fq˝'F“Ã#ôp‘a*uøŒG©vøR/kíhAg¯Ü´@è»ÈV¬Å~Â¡4Gúq¸?¥è˝%Ç7#*¡ÖI©]¿πW˙QÿSlEY_√≠0øœE°ÂÓﬂ‰Ùëá‡åD∫Òxgo-^@≠†·‡˝kí ’z⁄˜å’’o>R™Æ•ïã'LÏA.Æù±ıπ:ó®˛+Û`66hlﬂM#ﬂ∞˙¡åWÔW>Ω î1*ÁËx]∞üZB(mAÒ^cæÇíHHy˚JL ﬁÎ„¿=ü‰ì0Êrß¿ﬁ˛0¬Ñ≈T∫˝—π†G M)äÑﬂsö–Gõ*1}à
X1 Q≥∆ú·T±$QJ@Åö@b∆úFCç∆êk[Óµ∆¢'òÿ7põ)Í◊≈±—~/&∑•$qVÇƒ∆ıÔ√‡Ω,˝ÈÆ€¸)∆lÜÓ°”∏áçπb1†«‚†Rî5õ„T∞‰Ú’ª˛ë4Ô)ÜáNQëéfQ.¯a&˘4¸>iÉ´≠HÅMá1ƒf¡™‹ÆVö W°(…ñ∆ôºà$B≥í¢óêØ&}‘Ì–çY(≤÷Ω ª è´\K‡Œ·\ºØÏ+¶¢ w∑o°NòÄzMíTR&Ì≥≠
^º<RËí(£íèú6ÃWû‰∂ñ]toWÕ~`H—ÂU(O;LQŸÕ#9Åyß2ÇGrøPU¯ΩÁ˚ØˆOˆ_w0ﬁ^∞l/À`SE‰‹–8¡ÕM>ñŸYOÄ»‹¯JD∏!†5D^Ãì‰¸| ·*7)⁄C‚û;∏«±ë«i4+™~F—≈DM¬árÅ˜€˝Q &˝0A053^{Ω@”‚
&oâmXò¶¡Ñ9∫≈ë3#–V@KÈ°º ¥d˜Bï€√∞Ô©4›6}W%úTﬁ€û(≥Ä¿ut8◊D>ê.9WDz[Û¶vV®Ù%˘!Q‹XXbÀ)ñsìºòz>K·ﬁgb}Ò‰áóB'ò+w5∞€ÕΩ5¸‘#‹>ú´Ÿ9 ’m˙ùﬂŒa©ûêó¥á®˘3ø)†´Ó“oy{n¯ŸFŸıÛî<(∂ΩlÜ‚IÇ| ◊BmÂvÆúFYw†©3íVﬁ6π7
'ÆD<üa”È˘%EŒl»ÙdiwmüÆ	¢≤ı¶cXß¨)Ω…◊;”%ıò|BøGn¸≤ˆD—"ΩÙ–ä»ëª±tXŸï∑EˆõWæÖ«%€qØX¡èJı˘¥=LÄÂKÑ≥€¯¨aZ‘åÈ¬ ’ã“Øµ≠˚µ
;DI<6—·z6T]8Œöø√Ë/≤Í∫æpÅ<yä√”N"◊Ì±( Úû{∫2Ô3Û¶∞∫¥ŸnîEﬂÑjƒ»Ks±B±”C‚XQ7êbÂ©Èê,.OMÀBI¥—\Œ £a¶¡!“ÅWÇz¡|ç†E⁄	[Ë¡∂Hq!QõZ	˙ì—èñE¥pöYRÔ•ù¡∞Ë÷F-ömŸ3·O”∆rÅTøé…Õ¡µ‰ã∫ØÂÚÄî›{g·∑Ô-‘´∞kÀ±[fº≤Ü~ö∂2◊°oÑñ«˛ÌfÔ¬i@∑CVLîõ/CÊÉ.b— TbnHiu0‚Öqœ-50zJÙY±Qû»öùkF∑ƒöôõ‚€rﬁâXΩßºú/~o—qËœŸ3ÿº¢·’'◊’‹2,Ù©IFπgÒ9ËO7°˙É+Ø0«6¨ánM§Ωp#	‡gJ°T[C°Òæµ ç`"ô$ôÕ[Fó<Ã6ÔN¶ƒsvŸRU<]üë.ΩXu+OêÈqFXb3¶	jr±∞U íÒÍÈ¯Çu¶)ùÏƒºık*÷®¿ïÁ¡◊z‘íe˚ÿŸH+¶•g∞,)ô≈`Ar¿Y’Ø–˚ﬁùûg‡ﬁ\_Ÿ˛è˙Ôz÷kkQy4ï∂™◊ˇÉ'¨„öúµcÃåq˝/âæ»Ôhâ¨.∏@i	`(J}Sb=DÅGS®†ùÚy»Ï„˙|ÏÜTZ¬Wˇlê¿ÜP˝”%LfÕ]]sgfk+4Ø≥œÿCıœÊ›9NÓIb∞∑Ì'¯ÿS÷0j%†ûMﬁæüﬂÊu≈˝Üë˚>/Î®[ M^·—®Á≈Ì¥A§vZŸ+màXâ®OÌ-1p1–ÃDm≤Tp4äX6å‰’v uõÆö¯Áiúj¯XâxY©ï-∏.©y⁄¥ÑpÚ$!?5†.€{4P;Em3ü”[¢‚à‰"ó'Ÿvl7¯b*vÚ˜˛Ío:÷V¶ÁÁ?ÛDèè¢≥4 ˙;ÙF¬Q<ƒ‹ËŸ8ôµ∂Ù≤ÛzZ‹OX˘∞dÂä/òlZ>{Ù˜˚$¬ﬂ’ﬂ|¨¶®Ià…Q˙‹√Åáï9È;≤Ev Çœ–˝Åß≤∆:ñ~†%Ã∑k
?Óoãl–`Ë+ör◊€U•¬Df‰I|ﬁ«·‰Iì=U≠Ï˝èøñ1+åA+ä&¯js≥PMÒˆ¬ôb'IfÏ¿˛¶1Qoa[9◊Bïá5nŸ∞X‡˝KaVôé‚3‰Ë{∏1B≠¬¢ïÕπ∫¥¥<¡UÅcèct\>{r•˚íÕ¶#Ñˆ‡⁄
ª›h$£}1».Z¯Øëª˜z—ààπ!…Ù÷yîâµ Æ¬¢zÌxÂgRWŒGË˜ÒÙ‡?¥¬ÚJ E@ÜU*◊J8ÓÚ°{äBn˜€¿™4P´à∑¯˘aı7®ì™≈68«R≤¥ç´"€∆∫Yá U°ZÀ§Œ_’(qyıÍp0PP›“J=k3≤∑ÿòò|W≠h<Uu¿πVds<l•i/≤£©k·w∏wa-⁄JŸöÒÙ„Ftè‹9ø%+YYO@[†• Æo5#≠Ükª≠[8ÚÎß·àWjÔq#∞ ëÅÖÕ√x‘„	+&Z
e3nQ ã:w‰-Ò,∂?w’ã,)‡¯bıæcyı’ÿX∑VŸ^*œ∫û/æô~¥∏+±ÍGH	Z x6K6≠±ƒ56Æ£íß,n≈#¨¶º≤˝Z¶Ü·ÕK-∂˝Ø4œ)$ÍØ—)%À:ÜgÜD◊Ö5æúöõ.ô¡=›uÀá4'„c+i4…œu)™¡ë»⁄Ÿ-´sŒXƒìd$ÅB’•ÎZÕ9≠æºIûj–%U¥Œ JZ◊Êf4†f·	ç”GèPä2çìZ`Ñ´ SÔ¬”,LÅå¨Ç¯Aõx5E˛ë◊Eı8‚ÍÀ/c,’!óïLÉ´ŒòÚ˝˜Öµ˝™E	œúú’≥,Yœ±#ÑT&*¶Ÿ‹Y}…£“º3e¶€Ãà¢›´d¶Ùô≈${jñˆ≤∂∏&ô~âæ¶=£0`.¨(ó»˛fΩΩæ˘÷dß´9a[Xû:
|?Óﬂ/ˇŸ–#€‰¥öK9+€/rœVâ `‹/ÙR£ÃÚ}ß`±≤çLC~7çÈ$ïﬁJ(ﬂåìXzFÁé‘C:á—W…áπöáç]ÕΩXNÊ tA/Vz,JË("Un´•$s!≠#·)ÄD™«ÿãÎ"ÜÎê¸ Ú„À’ê€≠ËpÕUÕÜß£Ã`°9ï{ÛÛYˇme…˜äŒÖœì∆û’´T¢óD±PeÅ´∫œå¬”mÓIn\Ié±52a 6o}vOuv.øñu	Óy7≈€˚W+hnxŸ´XŸoq/Ølìw“ıüzdåÖÊsè,J„ÆÙÜ˙Cs»æ˙jk8l 
5`;7JÜUZDôüBÓ≤[¶g[–mŒ=ìsr¨∞∏õ»h:Zl∂Yı´fy∞M£æªÙ7s§u'Ëˆ6£â*Aî{ëı¢≥xcnc¢†+Ê·Tú†b†6tFÕòöŒﬁÂÛ≤∏®MNÃ¸SÙ,n°Ë©É Í∆uÍÍˆIT%˜´bUZd·?Ä	—AgRb&y@Tƒ¶z~ÌùM$m÷FuOvÆ^∏N…ZZ∏"…Û`jï/ÌB{“TUjbÄ§Ç»¥`≤l πÑ6¸ËZ€á∂X¯”] —p:ò”Ö;¬U”∑æÈ≤úh›wì,ó‘`ÓÂáÎÎU*6¸7´kœ3 QÊI”oJ
u¨E5lË8ó”÷Î?|kb≥[£lølà—Z≈/pS⁄*~ûyﬂ) ¢≥	¨âÅkõ ¢hMú«%]0´}˚%RÆ∂`E”OdFûˇﬂÜiÆ‡"πSwÏóï
âö-†-%-ÈS•OV£yﬁri≈`¡mT“`ÛÅã∑˝U§öïjJùzV√∆)Ç≥¿’Í√”`<∑íÈï?T7X\*™…ÃÎ–/¢‰õ\ﬁZ™`¿Ølx≠˙®£D3¶—à!ú,º	∑R›ù¡g. >,hô%p)°"≈4ÕçúåQ≠$ ∂Çàc0(:_æ≤}@¡6,Hq˝Gî	YÄÓ0péÒf öFgµí¶)›$Jª¬”∞NìTæ§§Õóaõ·5>Eı<—ü≤Nª≤PIy”ìnŸöà»q4˛xçcßvI¢e^Ù¢†√ÚË;ˆª\É3/ #·óÜo7—Pﬂ_Ø°fˆ;FX«Ø≤R√|Ö=˛ΩqîôgN· “∑£€≥ÂçVd∑\rÂÆÕ‰‘mË
:S9Â<Ûà?5∑%5UÊ·∑n{wß G©ÆÏ7ò·¢$äı<r<Âƒ1ß‰òs˝ÇÁ≤EòÎåg”Êc∂ã¶tErÌh‡Æ3œgb:’Ub(O]ï{Œ•»(h˘ôCä¿ 
=!EA≥œu˘≠8¯]¸x⁄„å˛·c±ME¿Q|ÏDŒ{r‚ïF)ŒÍ–Ë&@¡≥: —xm8E»l∫Ë˛·¨.?.—.zxÌÙ#†ãÇäme,ÓZp˘“W†\/q›÷¬⁄≠€Qm›‹øƒ±Z Ç}M¯0%4|Ÿ çﬁªºª¨~/F€(y˝˚ø±±∏·ÍZº4ÉªGüB<ß2¸˚<æÄ≠µôg&l¥1G´—¨hô¬ÆÍÓUW≈å∏©1o√#∆kãr\âE?-=4ŒC•ƒg	œ_«Án<îôæâî6Œ?éR¥.ıQp+ÅT%Â®ˆevOGsˆì≠ív•—ôÔE‰s ™E∆>¨ êy5i¶R€Î´)≥ãÊS}êÓ”-° PLOÕÈ:Ùj_
∫ÿâ/j(|·ròVÍw-.º∂+à¶Ë=åF›xP[—[6q€ıvqMΩGÈuÛiJÁﬂÂ&Ê‘rvØ†£ˇ˘Ë‰Kht≥¿=œãD≥\äÊJá«ª-õeû…∫`≥§Iò#.®rtkÇ&1Ø}∆ûa¶nÜå4ê`÷Y˝G∂∫ fqc§œΩ˛1ëìSL$`äÜ,Û8a@NG¬)V∏Ì≤^b¨¶¬áéBcÚGÍ≈òTõ®HùÜ9>«i‘%%Mîâ|ä0%	iŸgk∫@ZÍ}ç«Õ:‡ô"Ö∂®WnE?È1JÇΩ-éØ˝’3åîõ¿∏$Ì¶-^…:¢$¥xmŒ¢˝÷wºì∏EoÈÆ¡øW®8JÃ1ØeY©Ã7
áz_*u∑¬è? p>¨>ƒ?ö0¢˚ÎHOÏÅ´p∏¬OŸLQqπMô‘NÁ,r’ )⁄ªJì7J&8ò‰C‘+r89l¯Œ’s#√H‚Ú≈ë?äJÚıaqÜÓ9h“Qæ?‹!	®§·ê‰¿,ÛSöK“}UàVòÔÌÓütéÿŒã}Ã◊A†|u˙@]–;{wéQ§
‰ÅÈ⁄N>›<TÊ	¥˜rèÌº<|±wr∞"Õ≈òıπ°bŒc`LG´vª-_mÈ^W¶ÚŸ,ãdﬂÚ◊µÊrû∆=Üˇ •…V7y»Ü≠-:D^íÊˆÏHŒÓdÔ≈ﬁÛÉW{≈âqŒSüî¯X2/·>6+‹ÓﬁÀŒ˛ãbﬂ‰t∂@Ö≥ö•…/Çœ>q+‡yﬂœû£¿òêÃÊPúì=óiÓ{W™;˚ªù]«í¢ëq	®rOø*†ñˆ¯§≥Îÿ0‰-∏ƒ(Ñó·ç◊V)h∞Ò§∏®%¡nV#p˜W7¨8›.¶r€;·òí∞˚féÀ√õÕ∑4
ãgÊ#ô
2 e}‡’>†&R|3˘Ò€â≥¡Ã∑ù‰˜ò«[wê≈§Hˇ+ àãÎ‚ŸïπkNeÂ«kΩ‹‘é\∑
Ä{£c≠`ˆB%Ø¡8Ã¢åBg[ñ†2 @mÈ%¢\Q§Ê˘wÔûﬁg·¥•/aÀ“âˆ/,áΩ
Õø<»>g.oë2e˘s:ÿ8ıqvxü~À·[›GVmâtıb—˘ï9∞Ah∞‹éWï´J}UÏØ≈‹√.Sj›ÜJÎ.ZŸê«˙z/QcπïX∏´Ωeı‡>Ëö]Hàw!í•QH	{>~∏∫ˇE°˙‘√òãÏñ1f”Å1.xŒKUè˜◊LÈ0¨r35ö_XŸ¥VöUö√•∞—:⁄ /y◊MÒ¸$<,πÎân…G‰≥F¯]It:¿Câw“Î?Ro=e)s $D)Jˇ õ’∂
Á–ù†ÚÍΩÍõérµõÁD*ﬂŸÜWùπæßl^PGá¨”•N6Ó;2#(—7¨_rò™ˆÒÔBS˜]tÃÀü,ﬂØ‹†Áﬂ[e‘™⁄f#GCv∏˚º‘:• U"≈ÛQπD/xÑ|é)áΩ3-ÉØ/{≥Mi œÃE’≤˘·ç8;	*F®jroîŒ•Q3>“kKæœ„C,<Ø"P›/Ã|%ÎÓ^VÊUkı“¿yeZUMXfüWÙ6/ßÔ‚Áœdˇ‚ß‹–âÈN0ÔkıN¶Á´Ã@KoKgö Îc˚r(nJ,`‡=¥æ%Ñ˝+B“ß!´≤"ÿœW⁄%}o/¿˛òŒÖ˘Â:
_ÂïÌdáLÆögFÏœ¡W*VZÛ˜¥ ~Cé¯{´ÿ≤~æVl!ükwÈö≠:ÊÜﬂœM,U¥ãŸ™;ÍÙ¸V∆{ÙÂ"#Mœ„(Ã∫1ïk∏ï±v–2ñf◊?¶qR1jÕ«√3";˚Y≈ºÃf…9⁄§ßiÇî’\L¨ÀÓÁÌΩ;lÂD‰©S0´øÅ0[t˝/IôGùê%$ÓÍMÈ±ÂÉ@Ê˝ßWûªsÎŒh
fÇYá±ˆ§„ñ™XŒDô+D9Æ9‘‰ŸI/Ù
ePwÃó,%÷5ûX”+Ø⁄3Â6çe&çÀû~€Êﬁ¡≥$D·HØl_¢DÛ†ëﬂ—§–ñÁ≤÷7¡83èoâWMºÑCyîOQÅqpä≤Ç∞7¯g[Ï«ÙhyhƒÔË⁄ËŸÌr∆∞i-¿£ıpª9Ø<⁄˚´„ã|`<ã`a!í—1*Óè√Q°~,ÖüK.®4\ÕäZ‘√⁄b"køS±©l¿U=ï&ê©BÍÎ:äÒkï‹)è6t˙`hÕe∂…«ì])EØ®˚ÜóN%wÍƒ◊««˝d<ÜfüÖÁí!}HÍ–˝Q‹çeæ$ë°}¢≤Ñ∏0œ√ß:ê˝¨¥*rºÊU·ÇÔØ@ …(»iB	± fDY¶{˝#•\é¥B4îâ⁄5;™~ }@≥X!¶‹ÚΩªi4à»iÎµIiæ@öÇøëÚ∂¬∂´eLjÇ^a<4œ|ùQ“z≥(wX¢çõÎaIG˝êÂÖ™T˝*W˚Cå‰	 ¸›Æà-É=–≥Ω¿`JıŸn√¥G˙	û†U´¿∆`‰5·◊◊°ÒH&oÂè§–7"≠-õÛ¬ÌÆ98:…3¡jÀﬂPÇ$m€ı∏Ù&t+BdÛ˘†Û÷w¥kz€ÍzΩ¶9Ùú‹¸∑î{üj5·úMΩuƒeÅHµ<B¸·-/èñ¬†ØRÇL≥Ã}Í–ÑØà	ëˇ¶_ò›T]]Ìq‘ìœèØSk F+•Y’™†%z+Æ»Â∑ÚÁ=>Ã⁄TÑßºz…ñövyúAµs°˛Y—πÑKû≤‰èëµMw°≠v(t§J≠)Çûú©€>◊πõÕznÑˆgK SÂÉr$˙—ÍJ∂Voår…Äj¶™˚[Ìh∑=)kıWä(Â°IÚ¥Fz∆mæeà≤UU9{2íå…ÊxÃQUåV•ä’´Gtx¢Û›|øÀï=pÒ#N
&»?Ú∑eÚÜÀ!∆ù› ıFe÷ôÖ§ˇ∫"Õ 6g≤'V»cÙ¥†´rÙØ„Ë√W1fg∫T<˝”vP‡Á=.
Kò$Ÿ¬‡(j~·Ë+2ŒØ±*h¬æR’ã)Üsñ&£#BÚ§+±\LG)¶2¿ÇnU∂Ød:„R;C≥ùöD¡zãm¨7âOô˘íª…qWs ƒ ÃJ"¥È„@Qtù;ä∫Q<û<ª‹ÔvŒ®⁄ﬁ2®gD'öÆk˘®1uOπM]ëP<Ñ‹Å^«˝u›ú‚ãÁ˚ì€Xá\ûVH\ÔEg·tê3ò[÷?_÷Ärì®d˛~)›ƒ†›Ç$ÆgÌﬂ˛B6Å ´_4M∑˘Í√‘3=ÂÖY«GèÖÜÆ/éßC–“ù9Éâ5›¯¨›M#Ë±◊qÁÙ´¡2î∆ ÛG¨ÖÃ2+]lÍÉ“Ú ]ŸFó£Y›ËÖzœ+π“ÙÊ	@Zñ0CWùÀ√0Ó©Õc*èÕQEf0Y¿ï˝b„0<O(‡˚PòdÀr,÷\óÍ–^«Ík∏∂J“√ÖiJâ[c¬n¬9Â™™‡ ©T(·•Ó˙∂∆Sö=U©Ê[ñÖ>ÆxƒK94î£R5mÒ˛QíL:$˘ùÑßAcãºÏÒ{£St<M«V´•⁄’b#„û˚‰Ùï∑„HìúÉ|÷òÕsOS|#7aÙ$› S’øˇõ}™.K’]V]œaıã?¶∫wrLUQ6¡ª⁄9xur‘99xw|“9˘˙¯›ãŒ≥Ω«ox—ÁiFÃΩ¸Ògx ÈJÚü≈	§õNƒTPöˇ‘áê6 <Öí[:ÖíûBjXp%?ªc(˚ˆ“>É‰•¬§›¯K9}p ¸ËI‰—sWGJÚÁz§$?è#Â‡hßÛrÔï}¶º{æøÛUÁM¢ü,…ü√…íπì]πΩˇK¨∏¯…Î£ÓFY/˙öóxΩ”R©é˛—Ân@UFCQ?Uç*•⁄MÅ‘tYD’zÜ◊SÖÒå‡Ã%I6˘∂·È∂ \hÌ©rª⁄äô‡‰Auﬁ@3Fµƒ∞f ÜX	´f“F±f“}î˝hZAé7Õ’f€˘µä∆WäEDfÖÔâQöœ∞$ÄW>a´R™¨¢º≤I•1¥t·ålL®†)]Ky£Ù9∫íß¬*∏-k7ÀÏø76“ôï¡kU˛exÃç;«ùl_d˜ (¸52ëÇêÖìÙ˙Gøßú¸\ÈêºG˜∑>F€?_M˜f+RáÃÄ¥“™ª¿˜ã∏˚UÈ:]s±ªh¸«ˇ¯ÿﬂ]ˇ»Œ¬Ô±Ê‡8!Œ¬:s2‡6á¢å‹ìîF2fï
Áò#jñ¨˙;…0Í‚õËÖÂ?X2ËÛ&«II•¿FÚ⁄NSƒ4∆ØN«ÌBÍ˝`´ñ¨Ãf]u{ó{¡zÍ´Ü{»aˆ˜ñ	ú∆œÌ§è\–;Ñ≠®‹^µ$I.–|I"†Ú0(x7T∆ƒ’=˝e+‰’’qf˚x®7r≤[>∞Ú≈¨ÿÎe˘3whó‚muêYô£µÉπY6∑”µU+¿«+äÿØ/Ïÿ\BFn¢ yÚB Â|FÈT )ö£/•KÑ®⁄)t}p+£ë?W†æ†§5∑Nù"†RRúèRã”-Ö¨≈ˇﬁ.ÄÕ+€ºåƒãÎ?}7ç{	C'Ç”∏W¡˝-	r›˘—`nà'•œüºux´„!ávî1i@≠`WÎ¡9?Å$îEÎw iøj¢®ó(÷rƒè€1Zepı¯dóexu¬©*«Î√ïÌΩI∫ÃﬁÔCë∆<[Àd-Èœè≈§ú)`a¬ÕL)ÏT0ıÇ<O˘jº˜Êè>˘dmç≠ÆÆ≤„Ω£◊˚;{«¯„ò-%$øu#ÃÃ6†ªtp≈DU,é.Ÿ=ÚÕk[Lﬁ¸ÅªœïJà7˚&õûûÑß-™æF_—öQ
≤Ëq#…ﬁaÉÊ◊ﬂùºCç~c;P7i~≤=1Nﬁ¢¯a¥	£yÛv;xÛVMÀºŸ≤R–È/Àtt˘ãZéΩ<˝ûÒ
◊qÑ†öøÙ;ØL?≈∞AÌÊÈx~ç©˙∂ÿ:ø‘K>å√KƒbÛ∆8çìîWÊÈzü‹
Ü≤wvu'ÜF.>c¡=sπöB=≈ÒÖœ;òÀw”(Ωî[x*¨È'£†◊êo4%˝°•@∫º—˝íÜ'O0‚¿ËÚ"òœ.·%©∞∆óz é«Å√B}ñåéG·8Î'ì‡ª2Ò√–7jÎØh˜í.7ÂPXÅàŒÍëgª›Óµ±Ó%ïzCû`ﬁboÃ¡øÂ†Â0‚π˛æ√€¥ËSÃ•'ì`<Ë§Ö*L~€»\…<I/’–yë)µ∑õtÉ˛o¿∫≈xhÌ©¶U˛Ç9ÎÜìnüa…Æ+µv£,DÌ(Mì4hÏ¡¬ìi8àø«∫6ºç^¬$â⁄¬:÷≤IEaﬁò„P@:üv9¢°F¸^ûZìG‡◊¥ab•'>ä8¶1‚êÔ€Ö=ŒÔÂ˚Íëî'Ä˛m¥Ÿ!ÀPó¡Or‘C`SÔ∆º-¨ìÉ9“F¡æÄ·Ä{ÜÄ`¡:j<F ÷~2U¡ –ADôæ√Ê#v¶qˆ–%⁄F»~Ω˛Ç8Ü±\˝ÛWÑ"û[DÂJá›„øzvê∏bàø[<~Î(˘ +á-.¿jkIn≤È8<~ÇW~lêØF≥è Ù-Q∑ôF©H∂k≠Z.7ìƒæ≈ﬁË˙˛q
«Ew≤{†1GÄe]–∂Z‘÷‹ÙFlM¬#[Æ≈‘üBNàn®´s-Òç»R⁄äæÓ[%òµM5≠˝˜ç¶·Û;ÔÜ—§ü X∆ÒÖπùsú~
èØ§/Ò|QOΩ4o∂yïù æ¿c ò<qÎ…µo≤I?M>(\xd†°˚>PI‰¢®oèMµ=&},ó%›)µ<∫ \›)NÕ†aaØá¨‰Ã0Úêäc´xR‰ #›í_Ú;Úåı¢®å´5“4ÛòZm	¯ÿ‹xY\©Üdãµ&Ú√8ÔJ\ZO√f∂›‚V±axÅNÁé7ÿ™ˇ¥›£◊-ÜV3ò¬pÃÌk
ó‘íªÛÊ7µT√o£Ò5û∆‚gúºåÉèYÊ@C"ô™#åq“SvíÇNá£LÅÊQüÑcz»Á1[cºÇ!\MqÒÅ¿Z…®sw ]ª/k◊>‡˛ÿO•7ˆ√&!ÂÀW/TÖò©‚E	Êz∞(ó8ˆÉ¥ VP)àHÀèƒ9Óáhü—XèA∫#ºc°FZÖ
£&T—$	◊3è›•1ø	ı”´ÄÜ≤éÆÏ/í.‚«4´†1û¨>;j ª4åGÒp:|érP£›¯<∆Lgõ-Ùrﬁ¡h≠˜ˆƒæ‘gÇ©Ÿn4ãzeUïæ- ˘1böË∏PW“ç@Nú˝åf‡Q≠r¯ÃÓ 0Ë∂›˘Ú@YcÙ¥†M{˝âdÍ@ì<®®†ı,ÏùGLÕK&á˘ë*û≥‹jŸQxZ €íB„Ìa:ái˛60XˆÕF6Ì¬	•óxˆ4V,Ìå´BÜñˆ¿06XÉ¯’Øä6pS„‘.Â≤æÆÅE(ÌŸ!˛æ˛óÎN|∞ÍúOC‡HÅuÉÎêæ≤Ò;ä&12∑9Ò#—êÇ–ç∫ƒ'-dñ{†íìdógì9ìa¸
0ä¬Ú+<p4ùÛ$&÷i˙ﬁ»?AÇiS—˙◊Ö8‡°Ú—(ı% ◊√‹Ø‡U·d€RA…åı<Éy6\…sÍãz∆+ø•˛ÍﬂÚ∞j;sR·ÿ„/˛ÕÉn˜7gÎ≤äN~A´˙xÆ]›X/‰Ì/J¿AJ,dK√ªÊ|õpÓ˚ÿë®_”j·§0˜ßÑSÈ¥-w|Î.
'‹XJmaIR°€Äáiz»ÁÆK∫eÛsgÖao!¯§í¨ Ñ^Ü)∫»Ω∫®TC`π´"ˇ∆“f¿nÉuâè©Ê˝èˇ˚ˇR3¡2] FÍÖ˙¿¨d€y°\˘K◊ﬁOk8ô˘•™Q8âóf∞Í¶”VßYA–Ìñ÷“&XÙn(Ê£‡ö_M°´k∏K‹V c dóÄ≤BÒˆ˛6√CK}∏∆Z8’Kıt1üÉÖ˛ÂÁv…™F–67œj˝i†–ëkÀÉ∏“ãîc˚ï¬°ˆ˝"´aÍ€Í5qo≤Õ˙keNÁ£ØXe
ﬂ<"ÔW¨‘úí¥˝≥ÊuÖg!Î§ì¶wÅÕ‘sWTÕÃ‹}¸e4ä“∏˚√ºÃ •
˙ñG•a^∂¬l†ãáXÂî.øƒµÅ)∆,_¶◊?¢X”jO»ÊÄj¸À‹ºç*œ'WR£d›LFù^O√m]•1Iß¶/îô+”{Ω$≈Å4~qXí2^µ∆Ã\µ@)7ßjE’±y—yu˝_;Gåj±ëAÓ˙ø _zpÃ^v^}›yQQŒFØÕˆ∞`vÆï°âU≈–\Ì¿kπ>ï·vÛbs≈z[§œ®UÎ ,∏%îQf≠+G≈-ì€Ó\ZÌÛºº:È∏
⁄-T˜ÕYˆÕ7P_¥ì‘Âf\>“≥NÂêrhñXˆsÌ3s‹bE 	ıﬁ‹˝¯¢ãùkÀÌlø◊‘_›ÿ`$›lÑõ˜Ôﬂwóµ<=.V(]Å4ãÜ±ùÓ@ ú„=K∫”Ãë∞¬Â›ÁâwK∆x
àÆúÜÒE∏≤˝ˇ<^„˜jΩ(ãπº¢øΩ&–e˛]Ëµ)¨÷¡‚)ö` ¡5ˆ5øV÷ºÑXıwÌI“ÓﬁÒŒ€ÎˇrÄîIí^Gæ\±=g‰ˇ“áµè“'+{øﬂbœ:Ø^Ì±˝óáG{««l„˜/Ÿ˛ãØÆˇ€Ò ¬nË–oD“å©æÓº88b''ù¿V|
'Ó‰rå»Aö ‚åsÕ˝‚Y◊˙[â1!MÍçDÛô¶oöé˘ÏÓ±=åÒ›Ì ÜÔøÇ…°n≤÷mcƒ‚Û,ö3nk∂Œ%]¨4#ΩqÛÚånŒ•¢¸¢ﬁ˜›ó`,Qª∫ä3
÷næ˝"]ˇKò"õÖí˜ JŸ7⁄˚fÊXöj,≠∞·ÃˆxGà(¿Ì#ˇ?ŒV¶1¯`„∑Ü0ÂŒ]˚Ø^c¨‚—?êw\‰+V˙ÜbRŸµ®ìoAƒ-˜àÅ|ÅÒ6ç}˝jÁÄM3Ãﬂ:	Q˘;Jÿ^6I–ÇåÓtÂ$JáÒà7Nπ¥ZÿÑúá)ZÊSÚùXÈ@@˛Œáºø|˚p˜5`⁄7ò¬ñÍós˜äD$®≈á5«„dmêú„q“SChõNk¢Q‹∞|Æ‰∂∆YÙñ‰ [LTÁ‹·Ø"ZÙ»õ@»ﬁ§$‚h=Ôm	'óYÇÜr¶∑≤≈ˆG3Ù⁄H/Òßp~„ÔRÎnÜèt]2o»ˆêãÜ„	ÊûÉF√t√ôm4æì‚÷PÓM—†ÃÆ=˘v–9<Iˆå”åL∏<≈hØùérß¨„I“˝ñL∞∞rÍ5å˛0á‹Ìbœ&˘Ø8„!Á[òﬁ)¬ﬂ« ~é‘Ax≤≈„Ñ¶!ãFâ3ÉP¨ùl!‚?_¢Ÿ)°>h≥äøG∑>+ÙKcıê·|öÜG… Qcû°¡%µxC äôáH,–MÂ-∑ ◊w‰{Ïˇv†V»Cgd-@}
}-w#4áá8Ω˙≤pŸë∏Mwã>çú}äz˙S˚=·È∫e¥Õ•ñÌ†a∏W¶·ÒŒ àU6FΩﬂM.©Õ#Á-£M~¯nzì∞∂›|wÜ‘“é~≈Ÿ¿∫› 0•Ê˚ÚÇ˜ıOJ˝"˘∂w˘CJ!»©¢ÀÄ∂Ûü∂ÕïDÉt†›gòˆ{˛‹ª±zçH¥¨Û˙ªOïu6»ïç◊ù4/€∞+Òo`∂	mºÅ&ÏÎoÓ6g[¢â“ ˘¬ã4Aòƒz≥¬⁄äudˆ¢…bÏ,öt˚Ê.PŒ*ÌIxTj	÷§∏[ËÆ¨1ƒ«ÜmI±öM’˘ïQö‚“•m¡öGIT/¯ı±óU±pp`Òp!˜í4ïé£ËóÅ 8YπWG‰h"!˙v'´˝$˘6[ã.˙!gœ¢’^4Œ>·Œ¶Úå“÷⁄·q⁄Èãqír;<ÁlåvSÉ‹ì&Î'(º-h–B«»kMá°ö0üo;/ßÔçπ∂CÜcËøH–`F=µ=bá=Ézî{8Œ7°∫Í¶BÏÒ∂Óú–˛©;ü˜$7ÀŸıè¯Êùí6'qHæ dÀ}≠äõ]Óaqx_¿Ÿ˛®º˘Ω]Pßç@¡ø≤AÇ—pL^‘‰ı6∑çÛ>π€0zÚ·N◊˙Ti‹≈o¥ñﬁ*.Ç6DªÌz&◊≠ÁÓïûA=©q0ıÀrÉ€ÅÎJ$Ú-ÔgFz9UÂæÊˆO3ƒ4õ`JpÂ^fúÕLG—ŒæËà «ñê3◊oã/^>YŒ¢°”÷˘Pó9;óÒÀù@Y∞H≤zÃ∫ˆ1óD«4µ46s^Õƒ„ñ\é∑≤è¶NÑ>˛IÂrä?äÜ…,“ÄD9∆}d8Ñ]›Ñ»∏`ÍÄ®Oì—Ÿº÷ùS8;îØ·º0Cd∏¶(õS•yÍ"⁄X«iP{V¬zMGw¡yAÿÌ∂àB!‚I∏…~Õ¢§96r_@@Q~]n&~YbLã˘d¡eÕπ©Cı' Å4kgí(m7ã˝ß:–wXŒõ©ìÓ˝!C#ô›ˆUdà»cêº˘∫Zõ∑ﬂ{ Å´?ÆC≠'R¥ßmÜòåÁJ?~…e¯Q2D?q~‘ar2qﬁj;ód%nö+∆{ Oıeîb	ô^|ì9–sêS%ùi6Eµ EJÙ∞œd
§b‘üA‹NH˝@á-fü ÷
uC@∏∆É9æ	1LO“ÆA4]='eÜÜΩ(aÀŸÍŒˆ˜ÙÁı+vOc‡öÜ´;xúFgÒû Aﬁ≤êÿ©Úû\r≥=<⁄m‰Qóko˛èŒÍ?Ü´ﬂ_ˇ”Íıˇ˜v‰M†qyzÚ˚VVg’ƒ#m ˙¸ﬁz%∆4_˝ÙJxâÊYòöπÉÚ¸Ω
*4N qxâeAI´aúåV¨˛Û≈zp-Ü>¿∏"E{D©7ú3Êß¨z–<kQ«ÒŒé-Qä"Êq[xÿ$<⁄√ú⁄æÀ∏N%^”ªXØ„Q·q©ï±ç≥w≈Ä•Ñ!$ ’0‚ÖPhl¥ÁπHD§ﬂzU7Ôbb~rsÄPÁ>)Öéé‹§ÿyIÕé$CÁ„ÍPºÙn(@Í]C1T\^CK§^“Æ_—ÙHπ!@^sÙ¿πÅw))öÚ.rıìC±⁄/…iøß›røK:¨wC°ƒRÔi™≠‚;ñZa´¸¿µô4§xWP¬˛’	õáé·yÓâ*∏Åqeúœ}h∂£ÔÓÑ´µåÇé?òI»~Q∆£=êº™Ì!œdÚ¥£˚,b–∞@—h6ç\t2dŒzåASt@¬X91\=!…B”≈ÜñõÎ‹=k≈•.<“Hÿåƒ>ºÖN1ä@õÕ"ã&Ç’¢˝y¨çò_õè≥‚ØPˇsÂøÍI%Å 8ß4÷Åäp'8ßfîpã¶(QJÚ Ÿ√WË∫uñƒlúd¢Íüxó3e[¿¬´OÂíÅ«ŒàT&£~‘≈∏ß˘{5‘3<òóF‘5Á·Ùà±<‹ tMµ}¶,w)ÒE∫F]ô –∆ﬁÓ˛IÁàÌüÏΩ‰πƒ:ªù„ì£4Ôø:˛˙%∫MÏ~}r–òË¡π◊Ô’úIÑﬂ|±>Îø]$ëÕ=¨qdp{U!HÿgE+7r]µ,€¶@¬y7”Tmqñh∏÷ÜúWä0ÕŸE„®1˛ùÎˇ∂ªˇ%åˇ’…ﬁ—´ˇˆÎÊäÈc±Å»¬ N”p‘Âl˝yÑ∂ZíÆDÅ¿·O‹‰SÁL®e…/XÈ}ÓYÖ’Z®bJÖg÷NÁdÔÀÉ£˝N¡1K∫d9›ù6o‰Ó‰qpr¿[·&Ã+¡≠z‰‹nÇê/ò‡Mo#eÊ\Ÿ>ñ_Y"ÖkØÅg¨Ü„h–ÙyY≠πAüß¸ÉU]O`ÆiVÛe`:OyÙ˛ vG}g¡˛†˝ØŸ⁄Î(≈ﬂ◊Ièä√'Ÿ ˆÆ¯Ê~—Â6U‹u?æ~˝j∑≥ª˜≥ƒV√T.M.ã•”¿cƒÕ¡tT	æÖ√Îw”ò* C|{^˜Õ· ˆÀÎø   ≠Üµﬂ‹îØ˛nˆ®ro0‹¨˚6 <+€(ﬂ‘|aCW+€/jo‘hÉlà{uO|c@ªxPÍ^ˇà:πDÀ100°Ø—z[«8∞èˆ–;tí9Í∞`ÁÎ„ìÉÇª◊™<Y9˙‘u2	≈¡R«ìR.·mÊ8»<≥{Ω˜j∑≥»§îÍdâIi˛&7ò‘OMÓNˆ9'
ºÿœíÊI-Œbt/wÂYñˆ	1ee[∏g’•C¬\‘H|´˘"◊è!?†rPﬂ‡¯Æ˘2*w`oÊ≥§LhxÂóvlS›úÉ hÌe˚›◊{OãÿÏ	 Ãq√!5Ñı†4‚~—qUƒ¨	‚√∏<S˝4“·gf	,îx[xæjÖH'G¿öQ•∫Üñ≥"ÍLOŸ≠Rñ¬~:éáﬁdª∑>–è	û'7j5‹q¯‚˛∂ØÇÇ∫–N¸¬vîÈÙyß∏R4M$—„œÎ IZÒ`…≠B‰Ó∑èâΩo)»›∞ÿÖ~h¯ˆåvÂ™•+$U-Tâ1yMq∏0ÿùU—∫ÌlÆŸpyæ∆Ÿ?°ó◊ˇÁ´˝ó,Ëºÿ;:ÈTF¢HCﬂÛ =∑Ô|Nˇ˘˜0ß™©ª%ÊcπÇ◊ò‘ˇ  ˇˇ ˆº’xúÏΩÀrYñ ∏èØ∏B«$ô ¯íîIE1"ÿ%äLíä™j¶Ür¿ù§G ÓwÄè`¬¨∆f1´±YTØ∆∆l:¶iQfπJ+≥^6ˇ§æ`>aŒ9˜·˜ÂÄí‚ëS¥Ã‹˝æÔπÁû˜	‚Ó8Ã/‚q˜*L‚õ∂¶liÎf¸mÏ•£…ò¬^<ÿlº:ÿŸ~µ˜ü∂Ôˇ◊˚ˇÂ†¡FÉ∞_fÉ(Œ7ª7ÎÏ0«Ò NÚêmØ65ºywûÂ√ó·8Ï≤~8Hæ˚a6eY∫s¶=à◊Yòﬁ∂ÿÊ+‚Ò¢xp«∫›Æ¨‹fZÌufﬁ7ˆ„π5˝D{∫‘ò&i2fõõõ¨9\m≤?˝âyæƒ„‰ªI<´æõ-ˆõﬂ∞¿Ï?JÆX≈Îpo6Ü—z?täQòvV¸”è;∑ù’∆åﬂ>˙ÚÕ—6{y¿é^,ÌoüÏÌmøb¡∞≈˛Ìü˛3õaî±4c˝˚˝… c·dúÔ'˝å≈¯ÂÂ◊6æ¡ “…∞ÁVå„—f›≥â+›eﬂﬁ¡rOÚ(<hÔ ⁄Œﬁ—6Ÿs¸œ:{M#ÊNkâœÒK∆Ò∞ËÙ„tÁÏ"¡b„˚Œuéú≈Ü6pCÙF∆ÒÕ∏s˙˘ËÊ-lu:ÓÙ`}æeì—(Œ˚a3˙~}	›,≠-≥q_ìÙ¢sùDq1nlΩ‚3-X?N“b}c	;p˚Ω;Öu~⁄Ü’^Y∆ˇÆ˝˛mwéÇk\…¿)ÌM∆„,ı|aÏ€¯vÛÓzÍ˝∆7ûWnxK¿ní˛∑∞ôm„5nä∑¡r5Ô˙©o.¯◊›tVªOÿË∂≥¬ÚlíFq‘\ı=]Y∂6 :-íqí•ùp0h¥+Zı¡+Aÿ5 X£w—Â…0Ão;OñóyW≈ pVÁÛÂÂ@ñ‡{˚DﬂË'ÀÏ2ªäÛıÚùx° Ø,˚◊ªD.8‡ﬂ›uwú}ë‹ƒQ∞⁄ÍÊ1ùÃ†Ÿm∂Y≥›lMá>®X‚;Î∂ÿrzﬁXÇÛ‚G7NmÅ~vˆèˆˆw_ü∞√ÌóGÄˆŸÀmˆ‚‡≈ﬁÎmÖÉæõÑÈ8+ÿ0ÁœU<dø~Ö∞±∞˛pF9†©6ãø<Ò¨îÅùúØ%∂r>9ÿÀ◊∫çÀh<…PDF¯Ã©∞0~≥Z|0é≥F‚\i÷˛¬nµwŸ◊€Øéÿ˛˝ˇˆzoˇÄGürËÈg=8€˜Ÿ˛/)úŒ6 R1Ã`Ωôv≠¡√˚4+πÀVóªx∞m ÄÁ,ﬂO†≥á\fZÌvôÕ⁄⁄•ﬂ≤˝p|ˇcûÑEÁqX¡~√ˆ“b2Ñ˜fú e¡œ`@1+í˚?ﬂˇ◊å-±/í˛e»NÓÏßI?l±ﬂ.È@VO§å:èf^Ω0ÖÏNaY◊ﬁ≤^ñ„ÆT¥ÕöﬁÎZ›ÕÊ≈˝Õ§'Á∑ù^<æé„î_‰.|ÕG ¯Æ˝W·mú¨Hæáç_y:uH yQ<F rHè*¬·¶®†t:!◊ÓœÿX›V±wòg–xÓà*Hg§xÛ‚Ωª◊Ø‹ﬂÛ…`‡π{·,1Û÷\Zß|∑7©		zÈµeÔÀ≥8ÑÎß g˙º;à”ãÒ%‚§Â)ªJR8¸pëÃ,èoEûªf—të∫yºóbUoà+>…ql±ekRGïÙ€,
M—gÄ¶¢Aº=n˜çŒw≤bÏ£3≤ve≈&´,P◊ÈcÉMXY.È6Í@Å‰≠≈ßA ì∏c˛cåuäK@r◊ùbËÆì 6vBº<¬qñÀìæÊ·#ÔMÊl∞N∆N≤q8`l∑s·“bw}—hL›ùZ7my —O≥Y◊øÄLÛ›»áqLJuábö<Ñ0Á¯}Mg*f0ù°öﬂàœi∂v'úcë¿Â:Å¿ãYÅ˜I?C4î–ÁêùáΩ.~’ ˚”Æ±Qòá,˘ù„NãﬂÑ¯_XVÄç0π	5>5ÏZY”∆ÎÔ8ƒ}‹Hh&å"ñ∆◊LAF£∑Æ6˜v∏»ìà·:p«¿u√uÌqUpã£qgeÊMU’E˘‘ÀV“p=Ä&h˛=é¯ÙÏEæC\“'± LéΩum2cB∏Ê(ÈX	W◊÷™/tÌ§ åúõ~,õåIw“,çÕ¿÷Ø{ÅèF˜ﬂlÑ8A,Y£±’Èp0H∞˘PO~:Yß≥±ƒkxo_ø–&Ü{8™‚∏À=uìh*˜è?˘9Ïl‘Maôßc¿SÙ‹èu‹ Ù~Cö{⁄¬_Çk;Ä˚Ï;˝‘Ûe:$fº˚ˆ^wû€éÜ_≥.{H7$A÷\wd›âX´F·æ≥íxY–Y\°‰ëƒ_Ò}&iÕWÉW¯√8*qõØ¥ÿı<ºñ;∞C≈„Ë„€˘NÌë∑n‡Á~ñ”Kt¡0ƒˇs<7•l–"Hfö∑˝‡úDöU»Ó¸á˙<I£`àã>Ñ#JÑ°Ÿ∂ûsnHÕÊ$}?ä±ˆ4¯`˛ÉQÉë1´ìå∏É˛,rP¿œ%ˇNJÁ≤s∫ˆÓ¬ááÊ˜“{k^¿CAÆŒ`Z–`£0fQáíY¥0Õ|wÃ·`¢ÿ¿«H≤Ì(¡ŒtÕM¿y √Gƒ!5#”Ëô¸˛áQl›~G(C*Óˇ5R≥?lqJ™óıí(.õæπ∏¿ˆŒ"≤q	Ûpø±˜:&œ¨ˆìsh≠∑S>YÚ#{hrpxwΩ†i±MΩ∂}ˇ¡—D1π=ŸL8ÔCR‰€É1‘‹ÁÿÇõueyπ™v£*
â˝¨öÉx,ÆàÏ†FÄéMÊ)ÜãC√å ÔjvÉÁE66µUÒfŒ ∞'wåMY<(‚r0jú∆U”zu+∞3£–@2I&
ç¡ñ^vœYñ⁄Ê/Ò˜Ä¯*¥iF≠mºØkwîºÅ∆h 6G‡ùÜÛn˙âÛ*è¨RøF∆¬˘#∏\-¸¯§Ì≠hO)%ÙﬁwÛàºl—ôÉ†≠+ó_ƒ›â€{Îˇ˝ø˛˘◊êVÏÏDD{A±‡Æ‹Y†O°Ñ8Œ≠J-ˇª3˜¥RÑ¢ÜT£
„≥ï^¸œU}’Si∆@%ø÷Ú”kÚO€.‹ÔI+Ê\êéÜIÌSı™VˇH¢qW5bd Ë]ı*W™ñ¯_≈îΩ‰ë¯TœêØVJk˝’Âëqπu≠È<ƒ'…8Mí≥î÷ñ2•–eQ»c‘R‡≈º±DÌ÷Ù[≈”»øYºç¸sTO+ç¸O)ŒΩV≈"Ú?óYŸ—XÑGëÔ«´.ò¶^Ñ[©^Øÿˇj ˆÁ:NÃ¸b`ÓÛyaN'¬r≤˛ˇ!ÆÚS≈á:∑óH0),àYt⁄
ZSó3AÊÄeÁl{<˚óqƒ§Ä[ ¿6‰˝î%œùãæÚ»·Ê¯Ñ≥nï
#í9ÙqKè˝
+©˚Zh§2íÄÎ ÷uüË›2{∞ÉË‹2ÒC†Ë‡ªÙôÕA˚‰;HA ç}›πL¢(N“ºë04@J≤ÕíË∆ÀYÚ?¡_NzcRî ÖµJ	ß‡£~+ﬁìuH2æÂØ˝D}ï≠VåÑ∞0≤Èb‰Ô»êvYV;®»^}k’†ÿ+úµ6lqÿuÁ	ªÏ<—Q—*WáäÁ¿>C8R;2 X_ˆ;∂RágÎiyπJı˝8k‡ñ«µ±uG†D"ıŸ˝◊„Û˛U8}∆ ‡⁄Ë–<œ$ªg7≈¸ﬁs†À˚ó¥:ı„Ø#IÊ(‡;’≠èé}ÇK≠Ô“ıhÌf<åÛpë~πûªï∏ö¡Ë¯~`9ìmúüqtXG.ç=äáÄ`t˘YÄ∏¥~≥¬äyÈ\aû±¶£AoÑ>^7°4—Y˝ÑìÒ :ÊœïFò£ö∫™3‡Ió´Ü`µvÛÍyÕYDzıGÔÖ„3\ıãı›ó-∂>ìbAImô8LÊÕ¡  ]Usè{˚^≤‰uú^NÜ°µk•’Y©ïì4≤4Ì˛	b"Y»–cØ‡òô^A¢¡1Ïa˚/wèwéˆ»ÅÏÃÓ∞≠0è—ÓÙ∫ÿº[ù~ùŸc‰	÷fÍªÛ°ùÛé…!L°è∆ô`ç≥√Yá™Úl«kCÌGﬁGTˇ)Î«Êˆmº†3	S–J«@à«@˙E@Ä4Ï6 m]vV7J¨à? ;M∑v¬¥¬|cÈÖ{ƒeQRÑΩAmﬁ!@ÔÖC„uNÅL√.X≠∑‹H⁄a,Ñ¬U˛À"©LÎrù(	[›v^¡úƒ(—‹Ï8\¡óˆ-œÇ8ƒõ^Ï·âìüs|-\Å¿&¸k\êÅöxè≈ö≠©ª6∆æiK˚Yí 0€ÙŸ'ÒÕ(À«Ç&ﬂKØPÿùﬂB!4Ò“¸éı'yoëU	”€6õ0√È:≥ø¨3ÒÉ˝âsãTrùmèFo∞
'9ﬁg?L˜√4ºàUÁ–Ì£GV~ﬁMäÌhò§Ù¸\HŸum˜Òz*†@⁄L æÉ¶€P≥Eÿõ˜sJ‰Iè	ÆZÒ∫Å&è«∞ı™
~:}ªúæ’´22â¢ Ø¯oΩz0Œ'±—UA´|0äSﬁa˘l‘;ÖQ±<≤⁄i6FzÊ„$ò#ﬁ⁄
8´Ö.⁄sp˜Ü>T∏Ä"h–8È°]÷8üêÑ\'µµ( ∑Úxúıø]gÀ¸%,º˘¢1ë¶Íç"V’ÿ1ÿõ+xÅ´"ﬂ«˘ï¢)Û∑„dî·Ëa#ní*+œ·n1Œæõh-Ma≠‘b·¶´P†B´∏M˚L◊kÚ¬w,¢eçÛ<Ë≈í◊aÇ\Ë(Ï¡AÌûÁŸ0ê„(ö≠.◊*Õﬂ¬oB
AW∑ŸÜ∂¬.fÑ>4ÕÛ0ˆ–¬”gÉ∏K/ÇÊ.¸√ }˜CXÈ8ª≤Øı¶VÎô_6k˚L»e$ÙŒè@*gΩ· *Õœ…z'—:^f›$í./F˛ío˚Y$ﬁ‚/ıVA}OÚ+"¸Çø‰[H>ûçπÏJ¡ÔØ[`§2¸ÕYÅØd±<±<ôü5†£(Œ
˛\êê*æáÙ(?£˛±9ˇ,ü‘ÅJ œBµ%t„w|:#2
Øo‹= œ◊Öø<ã˘[ˆhsS?>Ãtß¬*‚≈yÕ<óÓˆ§@ë<9 #*á`y†!®óû6ÌØﬁv≈‡˜√rw¿z‚’Ÿêﬁômöﬂº-~ú4∑ÚÖ,£<XB= ÔÜñ†gCzcéHˇ‚è)¿(ﬁù	ªXÿt˝ı°z{˙ñ73EsZõµZ©∏81!!B∏vœœMÈœEåÅhJ‹∏@ä§1
ﬁ$ˆ3Èä/%ÏÙâ∆|(ãd)|Ö{‘Íô¸ä81∆ïˇûä˛e<ØOz@˝¿õ1íg%¢"f⁄ˆTuÉ˜lY/ñCó>>œoÁƒxÓàÅã	 ⁄ú“*µŸ©I§º’oê”aò_#&è2NÏk/åk˜é•¢M∏Da#ûqóµ$
irÖõjtÉc {KÔ«{kô˜VıÖãÏ†v]ïœ	PDº„H	v â/≈Ã
@ Ù†®#†ÃÛhÉœÆ-f¥ùﬁMe„¬:e7Ï_¡UyÂî¬ﬁ‡™K√pJ'Ñ›
LÂT…Èﬁí}çÁ5óˇnÜtx™~O≠Y„eû¢”Û&;Ë}ã÷» !eo•…=øYOqÔ€⁄ûøw,≥?@gZÂ(Î  ™£GÂ{]≠`áÖ⁄£^	L,∑Ÿö∑òÅúÅ( ∂»Ü+~rfíêΩIiÖ∏~`ah˚‡lEKˆ˚mñ–‡'.Ω¿èIWø™[|⁄¥Â!”8öΩàNŸÆ˛∆8f ´∞(òïMÒ√∫æ∏ÂMÈo®£Ω&nP⁄k"Ù“—˝Â ˜Õ-œ!-é–Ü	Ôò]p—Ω‡ƒW–Ãç…k˘wπia)QÕÿƒ˛ƒ¥wb0∆ªr\∆k>ƒ‹I¸Â∫hÒŸ'≤•πûπxzÆ÷Ÿ\†Õﬁª§¡UKÇò∂Eıj¥Ÿïº•úΩã√ºyÁCcˇ‘[É?j6uH¬¶„Ëãy·8í?ﬁá;¿ºc@≥®áê¨ﬂ~PyÔù·tÙÜ‰zÛ
Ã|pl†ëıX≠4|ç∏!$(H%$Ñ§∏å∆j´dUy[PP€ã$¯<U$z–¡öñF~⁄ÌvqÙoçqùå˚ó¿ºË{_Nó‰iÇJ-•Äuﬁ§çÎ–ªÊ%naØ´(e°œÄStT#ÏWß,V+—7çBÇÔú¡h8J‹Ü=:Ô≠Æ¯Èòø#≈˘ËΩX/U@EÜì¡xﬁ÷C∞Ë ∆Ñ–s\cÌõ∂Îà˚Ö‘√s˙åΩ¶KAù¥lßà§I
%Ù≥Îyj‚£Ûã9âJ˙’îK4-øj“ëRí2’>ùΩ$jFIPLı√s˚(t”evΩì•ÁI>ﬁÌﬁ¿9Ir÷¯T”6û≥›¢ôGKÒ?#<ù(ºÇCué∆†]vò˘üá,IC‡ÅèH˘ní§¸ i}∆.·d›ˇ6=Îæ:^ÚÜ<b~I'„‡x«ﬂ}v5ÿê:‡<∑1 OÛ5Œ‡<K`Eqˇó+ ˘c>Ò.;A≈B9áåã¯·WÒ˜hy)6[\Ú†oG?LÜ)‚ﬁSÍˇUÎx’pÒY¡#Ì‘í0|Ä˜p÷àõ∆kIö$≥p∑OÍG™=æaö∞yaMM õ
WcÎÓ —◊≈v1√∏¯¨∞‹ÿ.wRºBGıxißiu©	j[”∂±∏Òkº√_%°wqi!7^Ñ—E\J‡Öæ¡êø[°i¯Ù≤Qÿ™∫ÛtWÜ∆˚%*aqƒ‘Ê≥®aSmêG]∂=û@Usîú«x‘ZLÿªÜ1d*‹ó@®†m{ H˙ÒúÒJ!E˛ﬂEsºoMfÿùî9‡sWŸˆo~√6ËêÓ$yK-Á™E@ı\SÇ‚ÉŒh2@Ω¬“÷t6–®ªG€¿_˜Œr	6‡-·ÄSs¢ "ﬁ} >Ωª"Úo¢c9¿Z„Œã£fk˙N.Ü%RÊ¶IΩIa•óeÉ8L}@À˙⁄˝~\peàÄÍ¶ª|Ã¡Pe˚dÔÎ™∞˜öˇÆÊê´¥QnÂã6Ã3be?õÆç¬‘¿6–ÔeÑ´÷TÍﬂÒmò7,[ÄnùQ–äedXò™Æ∆÷∆aúˆìÅ·Ô*›+Ümﬂﬂ÷–˘U3sÏ∫±¬,{≤iB‡≤svﬁ:djÏº"ö1P·¶∞fﬁ"ébµ$\⁄Æ‘∏∫»]
›µ∏Bë˛Q…ﬁÀñ ^ä‡çË;Â«RÙÆQ8AÜî¿ÉRz≠ú.Ö◊ãj®ø,≠ÚZIâÀR•X^+¶D˜FπPHÎµb€Üƒû›œ8Q®JIAºWÚ^ ﬁ%k,Å!ñwJOÚo≠¶=ÏO\öQ÷1e‹Z-CVÓ÷3ﬂæ†ànMÓ∑$–ã+Q≤œDP DaÍ$æÓ,BÀNF≤{‚§h$≠Ÿ|)º≥]≈Í-I§Ñeoe´˙º8Â<æ§dŒö∑^-MwòóR</>ölë!Å5π"•∑≠–ŸÍ˙ZGWkËiM≠©üµu≥Æ^÷´ìıÎc7≈1ì œÖpWGã•
˛[N_±)Ô<lJ¡≠8W≤îT}ﬁ¬}^p‚[$ËŒ“À∏üDYs˙NÁ|udRÏ—»Aj˜ ÁZm¸y2à) ŸQ|Âéb@@](è_ùÏø¢oªÉ5`JVÈv◊U_k∆ Œ˚z£ÄD/~î]#˚≠!¯ÑmpÕxC_¿¥ñ’ZëØ\·õ™õ∆c;ó‚e¨˚⁄xe ]9+L2∆ÔÅo»õ[Å|gJûO	E,ë˝⁄ªB÷M]Œ•ºØ„u±o‹Xjœ±ªyé¯˜ú7¢å•πxﬁ=]~[≤‹è•…€õ¿U
3|ƒBor~Á
âac›0œ√€Ù°D2º8§A·Qò±‡U¸√†∏	x;-UcY=Æï·;¨»¸O"∞´˚ËHîxä¢3Oö.√.„{¢¿#$! |’ÃÈ^ªˇZã°ÅÀ$
):ﬂ˝èpåÔˇ[ä—d˚!,Àzyrí|$Î6’¿ô±í%éˆÅ:Õ–¿¬¥òàSı2&∏ö‡hmûv4ıM‘1]íSv∞ƒ¨\=a‰·¡>1ÕÄ§Ha˛›$π åÖáÂÑÎﬁ¿ŒÀ˝Rk8 J√¡†Ñ4Õ˚	!EGqíåk1ﬂ[ü.)?öÌÛ+êC®ópˆ˙√"†ﬂ¡Ñ§üÀÉÜ"∆ºíhÕM[∂¡ùÖMÙ∆U/qÁ∏Ãúzäfjq<ÑKKÏ≈§ËáÊ-âˆMX≈¢˜Ë˙Vís©Pn9ªa;¢LŒ“Ï*csÿ…¢‰"CÎÕQñﬂ·u6T∫B]AºŒ‚åµ],d›îDm‚B⁄DÇ4-§]ÚA@ã(™ﬂGJGÃˇ›≤ÒT¡AŒS!–∆lkäG>5±4‰∞Çë•:"àñ–„<≥j•|P¡»R–X’|ÍyX†øVπ$®ˇ¬Wm6*E±≤(ˆ÷íkA%π¶ÿ(:-AGÚèy∏á$k¬	©SºıNﬂ>s
)»A+L¥íf	“çå∫∞∞§MÁg	˝ÛÖV-Æ!®\dy•YŸ¬ÃõI¢]	\˝··,◊¸ÇØ9@k*æ”:_àunYª°µj∆Æ0÷≤;öó_O≠…w4#o¯
mÁx3(·–j®;ÕÿJ¿«óh1ƒwœ⁄1d¬ ﬁ“=√‰#À:“°é)ê¬ «œx‹[¸…;»Å™áâÑËØø •pSçb≤aWK`⁄IŒ# ¨(Ú ü$Cc¯=ºèìÔq´VÀê'j8˙Ñ
ˇlÎ√	|ˇªÕ≤…Çì<™.7éH⁄XY´kÉ—xDjŸÇõGR´¢Ì4ﬂ9Uêì©É˜ËÒæ,ÔHc‰dE∂ªËL†ì≥ê-µºq }˜ÈùqV ≤ò≤‡SSQQ,ıÔˇä«Ø9m!3&îô‚º‰-ÅZ(#À‘s&úe¬3(é.óqJ]8yÄ¯J”¶Ÿÿ;˛†ÀWÆ≠ì~∞ı’R∏¢Ç.ıs|º•o¥üÏá©–ﬁLiã∏Jû⁄0dmLSmÄµ˚«ÙèÈßwFWSâ"∞≠◊»	¿^ÜCA≠a#ÎZeﬂ¥≤‹Í~ì%i–¸c⁄lM≠Fa¸+Ë‹˝Óè)–s,fh´«ÏB(4!Àïu°oÚ⁄òΩÎ ]÷-Ã†°"{§uΩòHDqb≠´9&≤˙¬≤?À‡Á:∞ïÑ?ü‚¶©xs£1ìÔ4≥mM»eÁÛßxo ;í«≈ÂŒµﬁà‘ã£ƒäUÙDãº≠˝úÊ™ñåô“πAÀÁaDˇ~üeC¯∑Û˘MÚêú$±#•Q®SY≥a¥Nø∑ŸéÊ|
ÿ≈1ñs4Dè•sRœq7ıﬂ+€z„r’˚KÉ°üö›ÈÃµ‰\7^*≤«…≈ÂX˜o™à”i˚ÒmBéµA“π¢fu’Òı¸%"XÜQ–'∑tπjL∂“ePŒ◊vå‘,jº›¿;\,„∏§ä ∂É _d˝å}ôﬂˇpéÒÛçÅèÛ≥ÛF¥ˆÁ¶πÛxUππoU
 á„|ÛNóLÖ[3æk†	h<o6H—∆ˇ™;:BÛO¥•sæL<Æ’•_ü&ƒu}oπ&Q/É˙^˛†9◊…79;bOàKwÈìÖ<Ôˆ±H‡Òû+¥ÑxºÓ|Œ ZjNΩ√ÔYZôU∆£∆ı∆å≥¢a ^ónPVOí7#RtñﬁŸ¶πÖæ v”v¡õä…Î¿Ì‰‡™á•P∂vŸúêµ¡‹“©ÚãEKâ∞ÛF´µ∂°OM4E™°@M4Õ©-|2Ì•€∫ä4)mD¶N8∏_TÈnÌËÀÏ:µ`«Ú?va>l&\Å s6Ô0*Î‘ﬁÍª*ù‹ﬂÜ6ŒoK…¶”≠◊(SƒÜ|N‘¨˘ºÜ+Ë'>‹Æv(>=∞˝∆óXw'Ã#”Œ„©	ãO*(äß–W61LJÄkV™»kÿí{ÙÃ8uñYéT¸{›Y}Geı±~@å|&ùaéq˝;x˘ØÚt¯)(–Í©≥ÚƒÄ|˙âzˆí4\Yv“ø∏¡*≤‰<qÏs™»*A9πg…&›¯¬3,,íº#, çÙá“…òd•N¨ÖçÀ«>ö‘Ká6∂Ó|~*ï÷gp>iÎÏ»!*-Z@,>Æçv††Ùê˚3¬¶bxW´‚Ò;t˛IŒ˝¢ﬂåº¥A√ÁÉ„FƒîbÆ‡Ô•ÔRôL€K'ÉŸt"¡ÕLvÇπÖdr§É-ºHx˛ÓƒÍ›ﬁRlŒ	∏béù\ÀÜ“± ìßZÊÜ,Û3èbkÍb$˘;˘z¸7í‚•á≥(êWF›EIWM‹¨äh\Â)÷8ópXø~ÓÜö‹Ù¶2ï/∫éM&˘í†ïﬂú£m]p«¸±}Ã≠‡oﬂ=O>Q8QOy\?˜Êkoÿ$Ì\√A˛lŸç∑,2Âq‚á{yLÕ8úË7Ö˙EÍseîS≤l"Èú$BW≈ûq|Fjr›9~\VËM¿’oﬂpµOÀ h-Z åÎÀì«+9≥òP·îc¯∏YCEOlúY%	~	∑˙4µù7c4¸˚eë5cÆDHÉº íòUSﬂfBÉwáIïÈL∑†ü!€úáΩ˚1ÕHˇÏOcµçZÈö∂ë“Fπâ–{gsµ)6π¶Ÿ
⁄cé∂…◊´¶ea6ìÂºØM7˝Õ<R%Ù&∏πÛ8=÷ﬂz.}	ó—S3úòKR¨!·9Oî±Íƒ”=∫ffEﬁt0eóÊ´©›ãªŒé¯%/s·À§¨ò<qæú€/vﬂR´†¶u˛˙¬Ûõ˚gπ◊∂⁄ÏbX
Ç·∑Áí¿‰b°H	†‡pÈ©fÌnG≠rËQ‚hòR¥ÃZZ{-WëÑµŸ≤Ÿ\æZ∂⁄v÷bΩ<øÌ\√tãyC{ŒÔÀUÜ°î§äÏ£ŒuÀÏÏ˝›Æ‹Œuœ_Àk>ri≈¶+X‰+@{6hñcÙÆ¬‹BÏ˙v<ªWÔ”≈◊K˜Ó›êAÜ‚‰Â4gƒnùëöb˛±|Pß∞y†¡≥ÆsFEø óJˇrwd][zï¶ßD_ï|˙¸'H`T!0[–ˇÀ9Jz;5NaæqÕ%ä¨?Ù≥A~>'0úœ/ÕlŒy8^a÷\~F∑0{ïÁgŒ8∞z£ZÍ™Ò©‚›ù«ïÄ†ŒŒﬂ%CÅï’¶k1+¬Uê—Ï£úÓ¥ñc∆$çáØ„îiÕn cWÎòv«dÉ’,)p6õæ)r˘=Ïùñ^ß⁄FéPÚ…¨≤í˙Â∆–Œh[%¡qÂ7v…˘y@îÎ¢(°ézˆJÌ>ò–Æ±µÕm˘\⁄∑¢ß
€Fˆ”ä¶Îık<08Fã]ï´5∂◊öÃUïH∆∑vüÕ∑v»€qÂüFï ˛©WªgE»°+ªòëˆË„L¸¯§.zˇπs™Ñ¥w
˝¬&,Õ4$Z{ˇYÀ€&≠°Àow]q[öÏˆWì=ﬁE]ÍV¥±óv]V"∞ä–˛~ëªÖX®˝5\≤˚?˛„Ü÷√“cÎd»ÀTŒèPÒÛ˚8^µ™ï≤x6o:§MQ™ô[.å†‰‚√N—œ≥¡†ÊÜîŒ–äWj∆>(Î∆ß2*kµÄ_[4!Êﬂ∫À9#ª^Aô+⁄¶ÃÌÜuå´Wí’5∞]ù…TOâ9q˜∂<Xöç¶Øâ{JgaQˆ§ä~ÆIÚÊ'6k¸øl„- πTøN~+éœ*p†>w"È	<ßv˙åC˜tY7≈ ^‘°1ºFèóëS›ÁÒáæ∆à•ä´ßœÁ_0Óıì≠órøjX!€-¯S'ä˚¬∑ì3ó„⁄Q¬‹ˇÁıÀV%^Ò*©ú§†NBNOûŒFNµ…„<DGKry.tT´r¨ïq¡ê3"óÊ2cjë(Êˆ4<‰(ó2Æ4∆¨√‘i=◊Y[Ó5‰_¨u:JNR¢Í∂◊˚P †%aä†ÍiM],œ‡Õ,Tfı‚ˇJ¢.ÄµÂä¿'@’U#V˝v®Ï•ΩËf˘æ˚¬O	yØ	[lπVï˚ÕÕSqqôÂ¡à5‹g}û
≥#›™’6µ◊å÷ºµSãäõ/óÖˇ¨y∫˜€ÕäRòpBcÆ}˘´f_ù⁄\°rS?ÕSRK5∏!ñˆ®Ç*_ î\9DKñpWº£“DpZ6•≈*Ÿº3ó¿Úq≥# éN÷£âÃénP¡Wÿ:˝£è#EÂ8ΩHf”„¯Ä^KK¨”È∞√£ÉóovNˆ^„#æ›…3‘è…WÑÌº>Ÿ˛rw_Ñ`&_¡>@Zõåèä&Äﬁ˝ìBD	¯"p}Ó ·Ω§~Öõ>¸ÑÀívy5ÈôÛº"‰È@?)ôàzî˛êN¶ê”4ªÊÅ'≤k#_)å#⁄Ö""bh]nRì_QÓAÑÒîî¥¢5áæJÀRúe"Ô‚0Wıe≥*≤}#JŒœè)N°gáÀYKm@ázXTµ(z<Tûa~YOnxÇ´n‰I◊{\bOóçh¡r z°ˇ
a1≈ô	⁄xÆŸ;!÷chuGatå„V€¨π#&pë•DœûRÖ∏»8úöâi$Xqê˙	≥”úû`Ûl,cvàrß‚c¢ñzû]yÒ43€Qdgö—_’«ï({ùe,˙] Ê˙$ƒ∞Û™Ü|ÆØµü!"Îßö(œ#üŸLˇÛˆo\i*ÕÉÀ'ƒ¨Ú7ñ*ç¢—\è∑4$ò9Ñ∆ì¢‡©É˙®ŒbÇ*ƒ»˛^Ñ56ÔF<»~Ë—ML33Õ:`HÕ’é´{bpVBÙö,d‹ƒ”fx1	Ûolxl∆√3vÒ‘Õ∑*ˆ0u&∞
œPùÕF }† É4<ÛÃÂ2˚&~»<–WÕ£Y¯tÅê!Gå!eâ’lr¸U6…ƒ¶‚-å4∞w| √8ã†5i,Aπ°j‘hû˙2<(9«¨te\π_π2«˚Ê‡–∑C¶·h˝47∏Œo;J˙p√‹{J»Û^‡&4¬
l¸2π@^0„Q'Ä 'ô¢õ˘í‹P23›≈MhÆıöéç˜u∆ÛÅò„l;•∆ERIâ/Ei7\ﬂêê#ïÂx≤≤$?4©T;˙Í´{–◊ôv\åÉQF≤1¢˝UF≈s.7Ïù∏L±[WÖ˛éOQ^µ^”ö˜≥Ùòâµf˜ˇΩı¬˜ç'`tLa^µP„ëY˘Ó√ÄóHpWn®ÖΩ1Ú∑?a\~õ…8ÇfÒ∆2®€∆˘ó˙√¨¶ƒ°˙zzr¡∏Àô§∏À"öÅ/Yp∏ Æ»fºúÛ…âíö7ø¢£Ü¬¨¶»±~Gå√$Ωﬂ{”›”¨›ÄÓiñ7÷Ï≥\÷ëéHgÇÓ^ó3.è}UX˘_…√ıÁ±*‚SVá!ƒ
aD!!åÁM;Fˇ{Ë	 9âJ‰„∆˙“d‚ú\ãª|ﬂπ∏[C‰∑Kd0ªyh¡÷…†—2‘òz≤⁄¨ˆhì'í"iÚå¬vÔ˚@@„ú°Ë⁄ÀÁ¸ë»8pK™îD21FàÅÄêﬁÉ£Y’0˜.kÃròdπ iÁ¢Ön∑Îµ>é˜ì∏idM…cÌXû:-¥˙ªO%/¨°Ω4g÷+¯hUŸ®Åúªè•~ß‚t<Bæ™ã‹ç<®ñMNupe¥\ÁvÃE¨öËW˜ãqÕ◊<fç^õ€ÇùıÔˇÖgÒ ı2Á¸(©Íx2Ÿ˝¿ÂÈ~^zLp:–V®ì‘‰ﬂcö¸jcöÏPÉÛ∞à&1©÷ÚO—D
nµkÉ,0◊Q&é(c˘
NÀ†.t…]@òÜÀN ºÕBí”≤ÕSÊp€w9ÑM∑J>Húà´}PäÆΩŸ—ƒ›2Z3†±¬YIù)€µÔ€ïÄ√∂/≤<¥å=|ﬁ’’GÇC¬]IÅîÊK∫ªÙBﬁ—?›JúXÓﬂˇà‘IhZ\›MU¨â∫“ÉíÑi˝:÷e…	$Ôµ. ≤œ]çñöcYÃCxg∑ï&lUWôiÇ∂qπVM(¯NﬂlﬂÈ“ÜÛZ3|–ÕÅS†JKfõUÃ·Ê‹3‰%Á3œ”ø≠⁄n¶èQ„ÓÁ’ªr˘|øÊ&ªîí&Û€=Vﬂc¶Aé’†°IØ.$Cy˜ﬂˇˆ©˛r˙N“Ö&≤Ë∂xG.–ü∫Â(kë3nøE¶°ŒTZ:±œÆt¬ÒH‹ì®Tò}Kä^mCŒhπaxI(kø«Öí≈áã-ı¢Jy?”Õæ ôAS⁄œqà>¬*`ëk˝^2ﬁÅÁ^kô'⁄-·ı≠ı9÷Æ~(«Zõ∫úüÌYÛπ¿JG93˜õõàú¨∂
U(Ì¡ÌCx∞r‹VÔ∑∫ ¢˚hÓ'Arn4èyÕ˚¢®jÁµ:èÕ˜@k2lÚ„8!ΩWôHÅW‡oÊDqj\Ã7˜LÍ<›Ñ≤ìIÆæØgõÙ˝8ûnèÎ<›f°x]TÒU∂SóŒ∂˘˝π<™$Â U2x;•é=ÈÃUk¬Ø»;Ü≈Ωãh)î€o≥ÒZhEíuYR»Ë"BÀWˇD™ºfD=1„õ^”P^…¡HE≤Õ}–jh√8QxBäôÛ”R∏]9›ìÁJ8£7#lÃÓf–':&FR©Õ≤¸˛œ!ß}µp1JiYøLBÎg.î3∆[t.bÃÈΩvúWYzpMî·Î÷âRf¯ãjFìcøÌÇ}∆‚q8
ÑÒQ2ä—W%;m˛œh©îÜ,£h/h‘áa∞≈ƒ¬§3¯C$˚Å:ÄX(∫JàBa⁄wåñÇgG/wè0ÉAìÉ…Y˜„^¬MRJ“‚Ôzˇû≈√3 ÿ‚Ù*\)ÖßQzîgW®Ø¬˜d,~√ª^Ë´ë∞RnS4ÒäÂÒ≈$nbzG}–Ø∂_Ïæ:FÔ√¸ÌT%"ë£5Ã°Jo∞ñú°5ALZí†€| 3∆≤%l/ÌµÄﬁ}ãa5OØπInõ…E¢TØSæ/kk´gˆ!óœÏ‚®\T{Me?„åÌ enKË€…0u6á(B ]EŸ'0CtcÙı
‰¡Á˘$M.pb™zÇø◊Ÿ8$©Èv/Œ«ˆS‘XÅEvZ¢Õ!†)vê<ú ´D©´hPÿ4&ÿÔ® ¨œø‚… ˇní‡i¿¢lºÑ«z©wà&8Ñr√∏Ú∂PGH≤·9']êÃaÇR”¶5ò\¿Ù`ìÎbÊˆ~‹5¿qÁ‡’¡ëéw8Ç2…•|Í]î≥ï+Zh*ö®¥¢ñö Z£˜ÿfYñHê'Mû#◊t≠i%'≤öÊÔÕ¶U≠È™Û°uë§Ëê·ÈC|0;/+'Pû'≠ã—$|+$>ò]àóFÂ‘ö|	7¢ßYÒ¡lVº4GÆù`≠·˛mòzö•◊f£Ù™j1 ÉØµ}–…m]|0€/›µ0–Ö÷º&É≥⁄7ø»t—óËç0iáÒN6»ÚÃ÷–Ûûi$†ü≤SQ‡-˜˙áÆuz8&€ÂW(†'<Â¶Ì9‰Pâp IîÉ¶ÒC%∑ø{ºø}\^¬Åv]∂ËÜN«…EXprHZ!2±K®ìÉ£ùÌ˝›◊'ghí¥?®Å„∂Ôøœ‰G‹xL·å$—d1≠®∏Ùeûç¢ÏZkh°ãñô˚îåˇé#,wí]\‚cz√m´øçoüa˜L4∑Œé√AåÊœúñ◊Y‡îjc÷çêV’ÿ¢´,âûi#yÆrÅ?Sc“ﬂô£É/∂a6Ëòuì˜sˆ÷ÒÈ(À 7d≠|»MBÒñOFc$˜"2ÒQô@q≥ZÉÌ—H¸l=z¶uéa=¥äo”ßq^ÜÛà∂ôä‹÷˙e^\V∂“Ëw”H≥!ú%_T‡%π17≈Ω£`˝p^N≈˚ö”*"¡π
˜Æoˆ'“˙Oû§[≤Æø+∑Œvéèª'¯àWBô÷KïhÈ„F0ÆFöRî”üÚæ‡˛3ew¿Oîk∆ü’∫πAÊ’=gçÔ1p=zŒ…(ºË4'id•àP4¥¸Âí†¡©Y›@-∑neZ(Fiº»|∑i:ôì”®ˇè|ç˛ï∫|†".ﬂJuòˆ5)8‡¡´OW∫ÀüΩØæ«HN‚ÎeGó<xÕTje€⁄Ë 5√]∞Q‚~àWyÿc"É∑ˆ™ÎÊi/FO™BŒˇ©q &%…≤ÿà∫77AFL5^U=â0ﬂÀOx[ÆZY"k+aÎ∏Mn÷⁄_ÿa#ÙäΩ¬‡‚eóetôV%Rä™\Oøá°`ÆoΩ_ıì“ë⁄êﬁê∑jdã(èú±&1eÒ€ÿπå˚ﬂJi‘≤kˇ£˘oõÅÃl·ì¶m∞]©}rﬁçëL"Œ$˜´éÛ◊¬ä∂˘"Ù…°—blá√—ú^•+2\Dë≤$il˝á;uÙÖvÁiÀîfCúé±'·L≥Fg5“f+è[é(∏2<JÖ∆¿Pˆ ÈëÓ©
«.)éy`|’"1⁄ÎpßP B¨Ã©≤j$<AØHÃzãáVåá<V{sZke"⁄F/tÏâæ‡z>„ÿŸ˛kIJ±t{d∏√óÊ˜’—	Í„§Âã:	îÖèn;À]+:ª©œ∞íe»ÖÚxÊﬁ·y¸¡F‡ô",S-ÌÔ≥ØæZõfFÀºÊò(LæU≥\‰≈Æ0” >”l	E-≠2ûÌÄéÏ-Ω∏¶œóFà6Zqt»;•‡≥nÙ∫ö*œqÃ-ZlYR´ÃÉ#-¨é=w√vÃËC>hLWbJ1„.œ—!∏·ô ŸiÄJ“b¡ZëÈùØ¢K`í¶∑§™ÅÅ•Áyy[U∆πæÊ€wâôºw@e∏≥aƒFîªÁpãyqê¶c{x†k7y—„ÂÍ‡◊w„≈—P‰Ñ!„Bs-g4ïêdÈ:ÕË–w∫8Ò4âﬁN˝Aß[ˆâ≠Ì–ÿ‚]óáuò*ˇj‰o%PÃÀÒÌEÖÕÙŸœ€ËubÒÅø-√B„˘Nﬂ~|ﬁFØè„±êûmÕ…"⁄≈`äº§ñüw?©x∫§8@Ûb¡∏·|Gúsπö≈æÿ¸Ì]≥-@}ù+C9bAcC=7‡7IN±‡ñ!ï|ÿ7øF\˘QÆU˜2,JK=á±˙π2p˘úqÒ˙\6„ùﬂÕ3!„¿z«ŸSùçïºèÔMk¬ó¿“5§ZıúÔ:Æå•Vƒ ñVCÊ√‡‘5∫$◊ Krq≤ﬁ‚≤⁄v/.®|büŸZcKß|Á√Ê>_Ä	e”˚˜í/ï4â≤_∞qˆ|dÜœ<ÈÙ˜›'’ˆô∫Uíc±‰gÃãDä(ßñ¢àé\äî_§eR?ùX%¶“Ö:_Âç2°Ÿº∞‡∑§-ÍôC–adVY{+·ﬁåA(ì^:¯áå|.;ßèóπm<E’:æ¨,/_]vVóÛxÿz;G¿RÓ—G∏(,!aw<RÛ»!∏Ë¿2˙≠$lHIü)ÚM⁄ºÛ£,°Â®åañ¿Ñ_%≈¯òß_<∆‹läÀ]€UGzLë‚mß=ÀWSÁjﬂº≥ﬂLµÀ A’ï¥yÁ^NJê6µP9v†?[lÅiñh≠™√JZi5ÍE8ç˘£x˙yC?∂Ò*ºçÛB˙ä|Vü√Õ∂ª1~ñZˇW§bÌ£~n*”Q≈Ü®ål |Ñ“ıÛ˚˛'’§∫µ Sè(Ê∏çfπ'\‚Ö=Ù'∂|î]ˇª¢·'U4DIà‘†O$Ú‹å.$˝Ü=E5j÷—É)±%Ütô˝ñ=UˇY}‹jâ–UÂ8B@6 ?8RÛ`√pÿˆë•‚¸“‰¯ó[ùi¨º∑ïQübß≠˚œ „bÒ¬ñY¨*‚K‘-›uÉºÊ“RX¨ZT>CRÙRs'ùMZ˘c ¬-Qxç$‹„	[EõóAyΩ’ÒiñÖ‹la∏4µÑÕYP.énà*\¸\bpºÇÖ{∆ÊH≈WW©¯úÅ+kÖ‚X†mnÂ‚lcúã|Øˆ$≤JdâOdmûÖ—Õ†≈ÆE≤:\ûóYBtØàºÓ -& øSSÄÂl2t:9⁄>ﬁ~y–4ñ!;Ø>Y*«´œ ~	˙Í/P~ÓüøóÙ¸AüD˛=S¸mHø#£¸Ÿ¢≤Ô¡ æü¢Ï{µ"ö¸O!¸6Õ\¢Ôè)˘6Dké‹ªÜô1¬@í°iØ9OG7Ã£íëHøçxçö˚}£6b\i)À;<÷ﬂ‘«lÃ8≥ÖYV©ÍA˘\Öë◊¢dßZ-z¶‚∆TõÇÀk2u–õ[û ™Ü©ÖäÃÌu<Œr¿GH¬S.ßf> ≥3Í˜å£èÏÛ+6Õ‡r¢
]£z˝ì˛Z . ˛r]Ω¢ÿﬁYæLrsö¬3œ∞Ë”1—áôaî‰’‰›ì£ûı©a{^Ê~!»_≠3ﬂ&ïqçÌ˝Æ ≥(fÌSõ]…ò~Ó0`=Â8åEÙå@.˝bC¿ÖtFp Õá–Ñ’'ä±Ê/åΩ—¸¥oâÿ»eCHdJÈ√¯kÒ‡ÅêÔ&aîg4?≤ﬁ§_$˘0Ç„®’ª3r ∆K>&íDe0…˘ ¨ôdπü∆"-∂ó4Iw3©ØR;¿ÉÏÓZ/=õ∫∏Dçé]—“¯X=÷„UC˘©Í—≥yîä≈-ß¿ã@èƒ|ö/&Éo16∑îWU?ê§8Ø†yYC4`æ¨o¢•æH‚Åò ıhT„ÄkêvÎ$-Q!nÈ˙_wâ=¥jñú[–)äFÑ9∏©—,≈2tn¸1›Ã›F¿#ÍYÔx[)
 yî@‹,dÑ±√Ô$MF-ïñ‹H∞cÃWzFQ†Ö¿ß?âËtZê∑•%¶©OÑjPÛòZ∫»'£•~B–˙Mà©ç¬åQ◊ÁA¢#Ù#Å^eL©¸Œ_U¨◊ód∫ÈSQ†u”ÙŒ˚b∏ò0í∫dND+´ñ
[øˆ/E1.ô3õk¥∏§µ{!—[
∑W!‡ú?p*W=¬≤á?Q_ºEà∑ÿ¡FÚ0¡ ∫wH`è—pù}F∫¯∂’–ﬂ≈∑Ω,Ã£≤•~®/I·x}è«^ºZYvGï(†≈OdÏÆ2p¥ >g∆èÆé5yÖ˘…;`t4˘BÀ0 ≈/50˜…˜1éö*Z2„4O®h1 †—i¬¯?•L? Æ[eÒ≈£&ÀÊû<R‹BG≠…{ÜNÌ»®…bH?q‰+‹•cdˇK(ô[Ì¡◊›N∆ä˙¡/rt≤ªÃ0PbÛã˚'√∏E˛m<ÑfFﬁz,·ﬁ*aìÔKl√Åƒ7¯Ø©≥$íE	)∂{∑€µÌÀHM /‚ÏÄ∞µå˝üyUÌ|ió˜rV8›Ë±P5±ˇ'Ú±Pµ¯¶Ø1û‡yñ0Ä©‚˛/W â°X◊\∫˙â¯ßY.†äHßÍy√µsJÌ6Å’OtwL)áXpîï¬∂\L0˜ÇÀÜ;5aûáÀÅn∏Åÿ¶–√(ı îyà≤‹XYøUTüå/E‹‘√óÃÀ”∆êF» ˙nü∆ûIòÕßïRi(£9Â·üöÇ5ò∑”∆Ûw⁄û=*a∆xu'Æ§H™1Á~·ïêäì§ﬁ¿V ZçñÏ¢åükîÕﬁ∫¨ ≈Ë∞i{N K«”&1ZJ'‹ibmöë⁄Kj”î™Eë´Ò],|∂¢∫YÄ≤£x ‰Oå>Ω«&ƒ‡nà|BåOÊûÔUAﬂmè‰ëã«Æ‹ˇ˘˛_y‹≈OÔÏçí&ê&Ei∑è R-gm™º\KïÀ"º≈k¬qËdFÆ∫”Nkñ±%€Èö®Z®¨EõØE_˚Ω"≥Íö(ô.‘¡"ˆ?…†FPUûãZ5e∞;!{ﬂ’|‰á3 Ò7©è?°l5€ÄÊn9f◊6œìí¢ΩËΩ ÜƒSkàxŒÖ¢°Z’õÆGø◊.âª◊DÆép·r∏z/Ó+/qºIá‚œµ[|æ+Z2t¨êêO“˛`lä0ï¥Õ»¢ÀÀpÊtõ´'µ’·ãÁ5ÁÄ¿LPm#Ûª÷üÅk°<∞O∆˘I£¯<I1√u¢+óDS…~H∞(w˙”;ÑæÁ“ñ⁄√∂szëT¬Ä´≈§;ù=zWâ™uH≥ò;S¡L…áCcÛÉÇJîÇF„%&`ınüe¨]–∆Kvπ0	8%h9≠Ô¶ë’6º)[6ŸﬁbõÏÛË‡R55!cJ¢'‡ÎòZf‚÷m ñò≥ô§®öâﬁ /o6â¸~6S0\LÜf2˚p·~üÑå¯]i√›bŸD/ùMê¢#r®çãPÖÉD^K:NÈXòÇoÍAV âEÃ
†]˘mΩn-D≠÷Û9î~ÂjÈCE≠ı¸ÍHˆHtz,L¢ë˙L/oÁ¯XÅ∫?d§n4ãea∑…Ns
Ììå»?≤
òMŒÿ"QãT*vT¢”µTÀ	3-)ûû•n$¢=ªyÍºÜc÷ΩAmol≤’r+’7§®∏ªr9‡Â∏¶Ys∫„ÏUv-C¥≥MUZvJ$|«>Â∂Ä	è\N§i5\GﬁÆAµ dimÜ#∆”,GÍ[5Â
ÂÒÜëùàïBôìñ!°§’3]ç§Î‹ZÊ•:v(èz¶©û«Ú≥Íz™–äQ®¢•é*%!Ó¸\O˚÷+™BΩ™B»eÜ"K)ÁûÛ^◊Yˇ’¡±jL>∏7‰+alÂ‹c1rÃï™∞√πo8~u˛º…äau≤ ¯ˆ	úøÄ¨4Ôû;O ∑ß÷C`ôs≤í|‰Ù €$WäK!°F·jêËAW¡	FõE÷=íìxu.&ºLäÒ˝_Û§OFÉxl°µ£LŒÁ8∂ °È:Gs5Î;n2µf<∂{ˇª;µﬂ0∆=˚§*µÕÉ+¬ã?»òﬁ`ù, ¯%&ò:^[™ÆÖ-9ƒ0Ó‚oáªyku≠pnŸ +Ò,FO®∞Ú¥ñX¡´ä$Ò^á;˛GvCWË‚˚Í`î:Â‡J–©»ŸyÎ÷;’Òø*7C≤©˚åå5√∫a4”L“tﬂ≤åØÿ,Wõ]WJÁÿ¯äKΩÎGJÛIjc≈•cÎs√k-B±Økﬂz∫ëŸ·oFê°%*r"(\&Q$05≈Rhl¡ÜÑUß°Ø
9Îd°˜1û'p/…I?-ÿ≠N•6òk’6òÜ=p√⁄Œ6ûÍNRò iD®g·uGy4.'&™€Çöı≈§@È&:ÊP"L@ƒÇ¥«∞¨neì˜a◊ù'´"ƒTÂ2œìk◊®o›4≠~ê≈£3;Bµ`<° ¨›!˙◊^€Í≠°‚÷÷T!+kÖ[\é†>¢≈®πúN‡ra˝…◊™¡Ø˚Fµ·ÁW®-ÑÑ”ü˛pN´Ç·òŸl,bâÜ˛v›¿	Ù÷{5π˜énõTíﬂ¬8Oò∏9[-ú(™´Ô‰qA˜√$)/@E¢*XÄ$œZ‘ÙÀ∏oC÷ü r5@VÂYè¿'‡i!ú	|ïŒ>è∂Íu€ ä3ª~3˙{∏t_á¯[¢Ù5∫í÷E	ÃRQ∆	Â>«&Ÿª—¥Ø&ﬂ6/¿ˆΩÅ%i©ﬁ^/≠33+πà! ∏¡‚Úôƒã1Tóf¡`F∂Cá$\$‘ôi¨¨Ÿ;`b˜ﬂ¸∑ˇÛüŸ~ÜF:ñX}¢Ì;ËO®/+PhÕ¨òk3uß¥ÁnTO:õ8Z _ì«Ú…’Aöö«*≤J"WqÁ[mÒÎÖÚ=‘ÿR;í˘BÙr^¬a]t]ì>ı—•¯5∏C∂èj1w*Ú9‘1*éœ®W[R£b±£*Òø aë3ZuîÊ†ˇ}*√€{V“O¶oXD™≈ú”Q±÷TXÆ3O‚Á‘ô}Ω)*È'^`]ZC˜Ä ˘y7ˆÕº≈J≥Qgµ}ª–™Úµ™l¶2Ï6≥©ΩL#XBXK"¬†SÍíˆ2«d:∑¶Ï(∆;¥S]m»<àái©ÚìÔ·ßq®gd]\5≥.>F˘U˘¯YÁ^ì»ñ 2èßì¶‰ãÙÂFŒr∂êd¢V≈áöB(´¢w(mè°œÊ—Â¥hW•b—Ì øQk€Âôç?6GE9¬ä∆]„íÆ√¥`ûU~{0∞´ê—≥]œFPVå5;ìB&FpÑ∑Ï8BıÁû((2Íâ]ÿˇ§~89ãöls¿ﬁ¬kup›Ùj÷…~s•Q¥NPm÷'9Á¶"rúH;!K˝ôºsÒø0ú§„R©Ò¡éç0≈xÊtke√÷ˇjDû3˛πw†Ì‰TüiZê9Ñüö˜wı•ÈªuéÔ°R–9e†Ãˆ¯—7f¶<¥&"ÉÁˆ~≤Ï∞πsâKΩÚRø¿îUÑÍrÉsë∏ïÀ≈•≈€jœ≥J•;ÚjïÿXM€Xåâ~GGÀé„•ˇU
lYÀ>7SsΩ\Åú?¢ﬂ{g{ëZu1+O∞u4=WMÒ\y—¡Êëp⁄*•Ü©w∞Nä+üÉÃ5'“bX;‰É9∏ ŸΩ 1IÒv‹ªÈ#opEp5öœ∞6É¿X(⁄⁄Ã`kıÊjG\(˛àÀ[≠Õ0 ¶®Ep<[¡MÙfƒq{ºÏYØ∆¬Ûödoïüˇùã‡≥å‹-™\je∏∑_5‡ZPÎÆ«H{Ø–Ä≥ k6Tπ 5;ÛùÈ§l¡çù√S/Íœ·È1SV9<-	û7sgw‚‰Ód^ã”ƒ(ù-·NB…ÂÜ#¯ü‡ˇπÙ$¡!°GFñ^8Õ…îø5"KºÓñ%∞]'ózÒß∞˜ñ%‚QèÄ*hnßN¥CÅœ∞≤˜E.}<O‰“ïÂÜù„Cõ¨ Ê±ﬁ±ÙD~‚Zj⁄)86†n§0zŸMÉ—/D 53úz’πÜøU∑€5›‰-˜+„ªÂi@NVJ!,DNVÜà]fo	˚8}Ø]∞g÷~•BÉVÇ˝Ô≠LË∞∏‹≈é8ŒJD¥{ﬁouÌøw≈D|äxı'4Úıﬁ~~ò˘µın{Ö„ú•Úü⁄Ãé˛ÁÀö∞≤¸ê–Q72jîÅ—>ê˝ˇ´ÇΩy3$Ëª¸1ì%h˛H¿k	 kπïLÅπˆ˛Éc]«ŸËoÈö| Œµ\W≠3iı˚a‹£àŸ4RzËÇw-`™Aªˆi¸èÔk$‹:;‰4XÅ$º(⁄q˚¸pz`¯e‚Á˜≈ ~ ≠Faæws0&s%Qgl°<Í>ÚFu≠á˜≥J(O®naGQö⁄Ü∫oª∑:-†Ò…1˙Ï¶öW¢¡IÈ_>√ô¸ù≥âã‚*´laÄñÏ]á'˛{ß”a«ª''{Øø<∆3å‚q<∆‹ Eu≈6∆a…Á	•¯åJÆ≥Ì—ËV©
∞œUm3h·óòﬁ∑©˚πú≤ãÏM>—È∑Q«›ÛÆ(/<µûôΩB?’=-6õxÊﬂ™aë
)¨…Éå©G3Ï‹ ∆£ÍAÕ™Ê‘åˆÁ≈Ázƒxx‹¯Ídˇ}€ƒ£≈€Œa·>¡Øä"ãÜ&ŸòŸxÔê˝!p€@]e-4‰T&≈p	ÜºQlô0&)eàq—÷pfL»`'@a‹»W∆™¡Ó´ÿú|x˚q:aà( ®–û2Ì'#¯dÄÃ)W;;|˘uõ26ác`<Ó∑( 
ipâÆ/î∑ùÁkgò¡ùÏ	’8˜w_ø9€;Ÿ›?>{π˚≈ˆõW'Ë…I'S∏bDaqI—ü4wåóÍùt¡Ö˚˘P+ˆ≈$MlÁhﬂ.&¬ZŸ}åsÅë¶≠≤§^s'y˘5˚2øˇW¿È◊¢?÷ãÀÂqäÚÄ,≈è3†◊_/ÓÚèˆÄTd&≠ö„˜d◊ ≥^ˆ}í^fgyxÆw∏Ω]»
ÓîÜ	Å©1'|Á+]‘®èkd4¸V;œp&&$≥‰—_˜’£ô2ÌOãvï	ìô%ÿ¡÷";ã¯/ﬁ¿=ó’E¸-#ˆ`9-HÊæırqÑµoNÛÿzYç–…ã|@Ò xﬁMäm<hV\3LEÔπò çç;X∆4√ôûÒèMµ©œoÄ3ä›—DÈÑ˘Î√€^|C†_Ì¯àî@QkÈF86æAkâmv∆ãˇRΩDãÿ/5ÖdK≥r ¥ÙeòcÙ&!è$ìDñ„Q∏ßS^C‚ab1ÑÖIJ¡¢–ß.F®Îq8ÏAm¬P˜.k2(È‡äúÀÌ¢√l–|f5óD≈±lQöDÚ.∏iÖ]=†¨	ê1&´›M îz!¯G™Ì©πyœCŸ≠˚˙÷ÛÅ∂ëªê£y´*pbJƒl≥SH=ÅÿêÑ,€˜HÚ7H–Ãfˆòå
å5RzËK¿_◊·^Zah;æŒ4Ñ%>Û7‡oΩt[F˜Ω„ë„]>ú∂)æV≤wÃQ´<rzÑ)g Ô"gûH8z)˝“/£¨<¬LaNv·p§F˜?\$i®úUCä˘≈/ˆn”œ∂[ÅauíÔÒ&L(ÍZöo”‡$ŒF†C
tÿf_¡Œ–Òµ‡8Éc‹fBe–wê˜)d^FAk†ºbsºc°¯M0·ë»Â5 ií!Ü	EÇÈå$ÇC]"ËOI¢qéÑX<´0æ≥ìÌï¥	≈A“n;s*ˆıx)'¶’¯™tÛLŸÉ]ùk5Ê´†’Î¬ñxPwÅ!‚ÎW±§ú≤ôZRÉ† l(ﬁzËZqã–…}îN,˜D>æªˇKTMy"1äÆ ÉÇi-xz˚Ì¬ÙÑΩÌ°&å±i≈°˚~qö¬hD#+å˜?e≥>˚»‘Ö’EÖaï*©ÎC•·ª˝Ìé>
¿Åœèsˇ;È„êF7ıîÄQÙ'', Xg.˛˘ÿtÅπ ?%i@π∏≤e%ÜÖ¯61?#ä1¬å¢{\¢·œ >‚r∞ÚTDÊ·6@∑ÓÆDΩ6^ù\@“lµŸıeú«A3)é‚´Ï€ò◊Ê&¸ó/Ω—‚$-&=å•îß·ñn|◊fA*ì¡∂y/8~(—ç≤>GëvJ#:•p“¢.¢ X™©ÙûVGé‚™±!πıQ´(T¬òx(X‚¥Ö≈ ÜÔ⁄2Æí∫k-4
ãuÖƒ≈#∆H∏∞;ó¿mACŒP´Ïƒ¨^≤œêÌmSÔ!Ö¢ÖïR∞vñ.	k!_%ò˘ôÀ}_ñR+îu	QiYŸÜaƒ0N€êA~Ûòg÷dâ4Ä◊ÀX„
©+ÚÁÁSm(0E.mÅWûåMH)€¶û-Qˇ ΩâK Sˆw
KS 61O#¥™Ö1*∫É∞«q∫=¶Ã(fMR3Ï—nåàÚÖaø¥†K8;,ï#…lºÁkº£G]2ÀáûÚ™oGf—»∏qæp›t
Çπ/Äó	BÇÅË£º ƒ™Ô˘“TE≠mP[B{á(0º Ïúm≥å7ò†e
Oa<–)cb`:ÄÆ¨®µ„¸Vbﬁ5«Û/≥~·ˇÏ—fj-DÚ
áX—ﬂß úã±∑»›%;©G„öÿW‡ÚÁïì ëª(t˜)—òèYF¸ÉsvG<ê<æôî6≥aH∫X!éRæyxÃèlå	Pöoaöå`Ñ‡íÛÜqAsb b∑iËÄ∏
ƒ≤’˚?„Ï“å8¥îP≈Eú"3%`Õ4/HÚÉ·ık	õÉ“rD)óRb
Ç\ba†ﬁ‰‘Œ_ æŸç∫„‚’¥™.`¸dÎFÕj;èc“3Ù)ZÈP1ì©ÔÀÑ<á~—älb>ÿØÍΩ¨‘˙:-ãæ0
[1£äøå”aú.»˜rTÍ H†≤0∏≥s‰ Âr◊eIT.*Ì[õ≠<)ëryz¸TåTÖëóöù7EèÖzß3“rùMP∑Gœ®Î¬«≈8.—+ùû`≥Ã^pÖµ®±™ÍøÙ
rVyÛódV
—~ôàB*:ÿÃ@xœdÊÍ ú™ıóì¬sÈ· }ëbnÂQIº.4à¸Ö˙u’àmiV@q eßÑ@∞`˚ ⁄üãÁ›”Â∑ZDO|iﬁt¯ﬂÚ [Ï≥eNó¨>ˆù€Ê6KÜpáªü¿•ã¶Sò0˝˛á†ƒ∞˙ﬂΩËíÓmË8_dçÅê÷DA^πf¨I=ä§°Úƒx0ùà6	0˘&HÙ©Œ"∞√5Xq ‘Lë0hrGÀ8£%¢éïsÎ∏iGÙ¢<;LÄGû√àh<_·ËR#‹≥SüsØõb8N¸gªxâ3;zE˚SÚ›È⁄'álhJ¨ìtt hyŒ,B@L4ÚÃBUÔ«Xœd≠;ÂC~ª.∑Æ¸4?7=/?m∞À„KåÅC˙Wœ µ\D	ïôólîHüú€œú¡£ûÉÊ.ﬁ_@£àÿˆ∏ÎMäƒ_"›Ú»’≈ß™Í(yÔ>Ì ÈX˙f$ô“p∑¯Çˇ6(˛ŒÕÈ)çy¯w##Â&€T¢|E∞á{ˇ¿Çcf–HíˆÛ,%©“o¿·èxp˛2ÀÈ(π˘ªògÈ<§ü5i=yŸì€Q¨ï«G”ú§?:'¸⁄OGﬂ4¿5Ë◊&ußñ¬A"πã…µ´«qü'˝$Ã’(µWı£›I∆™˛6Kc:!∏åú√Ù[’¸ÆÈC»ñì]¢ú‹‘ÊÀ€~ıÍÏp˚˜w_üúÌÔû|uÚÿVí¿ t
x≤Ñ˛PÌ≠K7êØl˝ `ç0;ÎÁ@éı
;èp;˘˝èÙ’_7ä{ïU_ﬁˇÿÛ‘$SÂÛ8èÅ’1‘=‚˝˝ø–´V/√†≠ZÒ¸Öc≤sAnKæªˇ_∫Zè8%;Ω√/Õ˝x|ôâdÖªæ/¶Ñé¨ÿ}ı›ÂµÌ≠\‹a{>‘']‰¢Á±HÎªcº≤U8ò>k@¢*ÃA5ˆ‚¸;èc‡˚D˝Òw\ùC´≠%?ﬁÜÑ˛Île/å‡¨ÕíñªM'Ïwl•m¥ºårÚOÑ;∑?-è´(HìxÈæ7bŸ]OcéçWﬁ5TòÌåñ‘≠r°_|ìÙ( À# Àz*O•RÓ¢häµ¨∞“1ê%¿pÇ˝¢IÓÑ≤æ˜á#h<ä5$+Ãú˛˛2·hƒwÀ|WÉdDÌ=\f‡Ëázuırv˝/¬~‹À≤oıÍÚ›Ï⁄ªà√ı™ÙbvΩcXΩ>œ—õZi≠CÒn&:Âup‡o™†·g·I˚0æSjıt’õ∫ãÖ"/π9˚6æ’LR≠bxeEœ–Pü [◊∞^QªuyÂ^˘‚,Ÿ
lÛX˘ﬁ3ºêyCËéJÖÃŸËÓ·r»=xÚµÍ≈ÊÅG◊).Ñ≥/y6‰EKùgE=Ï√Û⁄í¿º«}QÓµgºÓÊo94´ç⁄˛R°™ï†€ª›+Q∑J∆ÔÅ∂∏Ùºa¸œﬂìÃæúaÒ¸FßÁ]˝™¿”xﬁ-Ô	=ı™ÿOÛF>ÿÖdã
ºeœüÛãJƒT.œÕº¶5‚€B®V‰lƒã¥NóM0µPøÿU˛ÚÏZº≈z;˚á€ØˇÒlÁ‡ı…ˆŒIW~Û6ßÆ≥ΩDæˆ5®>z[î∑ÉŸ‡πxÎkO~Û6G7ÜŸqæÜËÉ∑º@ÃFËˆı¥ÅÔ˝7â5Ò÷;Ò≠îpO®ÂπÿY«ûf^¡2xÈüq·t§òÔW'¨ILÀ„+X^`˛∫§ﬁ˛À¡»Ißr‡$Q;Ω”EÜ§ΩL(UÂNÇò∏Ô≠ìÏL≥’0˙´ÃkÈeQåP^9‚À8π±rXÜp1Oˇ5
/Ìz¢Ÿﬁ8å¬˘$Ü÷*iv#Æ‡'uU\≤ÎÃœŸ˝lr∞áà≠h∑
cª"≈öG|eÌ™n3µ òØúq”·Ú∞ëmi=ÎwÚ@û„ìIÃ/DﬁÊsΩ;J—|ﬁ™9~f◊ı∂RjÄ?7∏€‘’:≥ÿ}U“Ot¨3{˝ã8ñ*≥˛hå√~2˙\‡T}.fmΩüÊ”Çè∫É£a~‡qÊ±–Kn~vÄ|‡:‚`˚1àÚ+	ÄU	õ§R∫–∂∞yÙïƒ≤F»–Òä({˝ı™⁄nóq∏˜UÂ{c4Ù·‡!m>–U,≈y6eÚÇ?; €‹”∫|£dnNQ≈˚®≤•ÑÕ),UVI”ú¢ƒ∫®r\nÊBﬁDï!ô€é‡9 ¶§PÏg;%Ç¿îãH$Õ˝AP¢ Åπxƒ˛„˝;ï‹!z‡¢¡‰˝_o»¶2'Òj¡–±DyMh$ÃœaR1¶ü˚‚ßƒ¯ññπ≤Ôá)ö YC" RÆâ&Åø#ôÊ˘dà¯ÖCº£[û+N–C)¬Ô¬ß‚ÿ~7ÜèjOùUÂõΩ√„@–á¯Ÿz§´WÄ4ÅYbS\©R>˚ÜËxôM≈FgP-Ò«©/ØS
®wÀÁôµ√¢∏ŒÚH´(_Õ¨{p®’√GSJ~›§Íº@MÿX®=«x≤ÂS?LnB˙ÖûQqîÂ‹6%.íã4Ê˙4À/‹ø8ÃHi™örGwˆ
mt¯X•◊zÎYóË j@ºY†çm≤◊€ohÉáå(Ìı÷úoFªŒ◊≠‡nZj(M™8w–:rI¡ã–G4“Ê±G¨∑ıJ:¿…ÿÉÁ◊ÂstâZ%@ø÷^ÃÆgÄÙkÛ›Ï⁄
®_óœ?'TRÎ¯`
âj˝ØÑi∆BòÔ™“¿# 1¢Ã≤L^C·à; Æ•8πtÒ
∂¸s@•4öHˇÙåCª.ÇE1KjŒ£J§˚"…cnÙ!£^`ïIZ∞´‰ä<ΩŸ±./ƒhË∆Î–u¢™ú‚fK',,&ó±¶á†aúìeû≤U˜9A›ëáÜ—≤XáŸæ&t6=~$rÊ'1∆Úw±
•ÆÄ&h{≠ç§«˙\ﬂKü(7ÿd
˚4ë#inày≈0+Ωe;œÃ≈˝ÚÄÔﬁ	¬ØÜ•|⁄òŸ¬¬j9õ∫©|0!µZ#)ü6ÈV”KKZm¿UÄ9öﬁ«Ü´J˘o-*õÀ,ù£±Ñ “0$düÆÿ„»Ê#–\mº„G‹ΩG2>Q‰é∆´"πÕÈ~r§*&}Ùy‰#Ë´h˘í>∑˘“Û˝‡ùO◊5@ÏD·!Kƒ_û¡D4fPë¡D◊∂ò¥"|”µN=ﬂG‚ß°{6@(î√?¬Âå´‘M"MD2b•À◊¿p¿;d◊úRò	åàMÒ7⁄ò;år(¯z˚Äëö"—lˇ–Ìﬂ˛È?À÷ã˚ørw≤oÄªˇQ\A6AY3z≠Ïb€)π˚pOˇq<1~“Uú'‹ë>¥wÕY‚`ñ˙`añFx,·ìXû˙ê»±„œŸ©ùHD“£âËAzh OÏ3§ètßå©ÛVÙ∫˛—{}€r†ÜìÀÂJâÑhU#¿Åµ@F`0B	° H oÌ¡∫ªåxAÉã4[Jâµ^g„ò€%§«0LƒZ—>_)Òö”¿;r1√t;@(æUÚ’÷aÜé’≤ﬁ>†ÃWqÂ0+˜Âıâs4‘eÒıˆˆ‚í§ˇ‚-ô ﬁûDI∆¡ ôÆC˙√ƒáˆ;ú˚jıœ√…`Ï´B0lù‡M—ŸZ˚ïò^có´—<âa ÇË9Yß©Ò†iE˙Ÿ÷ICÑì$ù‰°*\yâpÍ™ÕÃÆç€É1.Ê’XuÌõê~È<πˆ©¿dºI≠#Ò™¨ß>¢z∏6Ω	‹YéòÌõÜîd‚b›"‚4™ªÎ'Eî<≠VpÊÂ©_ü¬n¿ÿ∂7≥Hˆ.ø/0i=9~≤òMÜÏÕõΩó(aC\»€‰õPo;æ¡ÿNzc∞ó À]°’ef¬ãô‚—K7≈>‹ˆw5Õ˙ËX¨˜ë±∏ÉM√ƒÀo9<5.ûèH∏_"zD	\?…YØ£)XÖ∆…(cÑÕŒ ”œ≈_£Ö◊"_}5Ë=DÏcVAÎ8ùTx*¢Îe¯=„¬e¨a,Tá≥€#ÜÜDÆôÄÔ’¬AÉñáò1fFò¨Åˆ3`‚]ÑãÅ+ä7<∂lÈ:]Ó|vŒﬂﬁ}6Ì®ﬂèÁ¯Ω≤:˝t)È¬Zç-t IVàhp˝0øÄı⁄<uC9!pÊ _i2†M¿m „ãS†’+Ê,	{ÒÂq—–;b6iyêÈ§êó‘í∫ÅÄƒ-\>Xú1˘óB7ZÀÂ⁄zyœÚ¿d√x©à±¶Êƒêò$UãH∆€ zz@€D1¥ãy¥âì≥—	‰Æ¯c uZ…◊∂ù‹Áò]¿öF!?z)Ê“ŒF∏∆§À˝F>YkÅB,Ëªe~é~•eíƒı°q<Ø"¶·È≠ôüYï~E€U“Ø‡°	ÃöåñΩ
Ø„_ˆ¶çöu”¯0P'ÁIÌOãh3¯ﬂîpHpcÆ 3≠úÉsÒOg∂◊ı ;Ñü⁄\Ìa|ŸÕ}*,{çº+nJRÆ‡róºb5ëYY]{¸‰i≥≠Ø!,Å›∂ê
∏Ô-Kb˛g‘nÆÙ>Ê€g÷Íô¿Ó¨ (c ´Ké¬[ac˝´ 1í‚åH0˝ªŒËxHà≥Òlz‰#ÂåÁ¢HŒ¬ô$	'v—DR£≤∞+O◊™iªHö÷Jú+jB O+Í°äÊ<ÃSÚõ”g≤<Sï¨â«ñ ¶°
Á"’∂∑V˚È≈%ù~10G/+‹Â¶ãÏÛ_›Fêïòc´Ç<•¥xÖ≈£“,–§ËÓé’À
HD1Qç*∂∫í>ÍáGÓ–96Œ√
ÅR£¶©o∞ìG∫b∆kçy p^a¿ π‚(QñéGE∑$ìÎ0]„â§ê‰?àLS‘X«ÚôQë®@¨|0"—&;ï8™T›º5ÎDú&A≈¶’µ5‚h¢§™$ëèæÑ¢
Qhì`Áhøç‘]»BXı≤TWçÆ€„-çqµ	∑åA|ôé#<˙H‚#ˇ¬KπÃ¶À|X¡Ã¸¢ô%ú!GLÒKcS<ÃIœ‡Fê!±¶$Àã≤›
ViyÇπ"Fî»>`Tv\Ú.†∑NŸ8F˙·q„I˙-`&bd˚¥Á4z17ä‘ ®?π)ŸÚ¢k^Æ-%ØÒ¡àG≈Ê9ã|™åÌCA"≤.ä|P-	¨ÈË2ÈcÉ∏Z·≈π&OéE"≠yi|5F˚Çπîã$YáÅQQ D~ÖMÉe·w¥é‹Hêñ¥ûIV€$µ•z'ö⁄RêœIT˚j1Ω8!Ω≠»Ê≈©π0™_N[Î§>	“ZøË∫ C¢‹^ıôÔê&L≥ﬁTtu›Í™‚ú¥÷m Tîµs√Ÿ§5•(k6#iR‹⁄mÊ)	Óè.éw;W$ºâ˜ÀÇ>
æNZ≠ﬂëe+»ôPÜ¨êMÊõ%,~h∂a†Ci€‰•Ú~˜cœ+BTae"ˆN?Ω”†s˙ñbb‡ƒ(3¥ãLˇòÓv8»™*¥”?‚âg^Ω˜¡Â[ÿåâ{ò◊bZ¸?·hNƒIr∫M∏öøˇêËéP"⁄ê=¬¸tíáÊî∏’}ß≠À∫Ω.?ÌJÏ¢»&Çw^Aq.Æ†îÎYí¢M˜@.*{—>%7x5ùëp¶HfEÕ¶Á◊Œz?)›¨˜+)d]˝Î‚\
	ÛíôÕ¡òPvò«î•ó Ê%@ûÕ¡x„xp'≥H∂ã—˝èöA,«kπL¢ìpÃ•™©L!QÀ€„Q.#ÔæŒ˙˜ˇ¬R¡¢Ï?$‚“lúÍäSås
ßp5û@KâzÌ¡Ïë¯baæ€UU{◊¯ÙéLÅ ≈ﬂtGN[ƒûÜ)iNû≥]Ròã»åjÏ"bÊyúå√Óª∫ ôíﬂS∆*T{0—EúÄ”;ÚpÛ”¡b†…X&¶deñ¯Ç€D õÑ<Ä∆Mñ|qê∞êî¸…"ŸKçF@ t§”)l[ì¥ZSw<„ª„Â»∞8¸.¬zå¬çô"q≠Ww¿ (0Y	/ÛàùÄAª∆BËÊ•LÌ7øÅE´ëÌ/$Ÿó‰¨å)©oLï§\âê™uîp«—	£D1§áÅIñ:FeÇprB®òeâ°Î3Ùj%]Õg»a…´ïûaﬁßƒÊõ,Äœù*Ôâ¡˜^æyµã¡Ë˜^ÔùÏºvB@-î√kdÂ°ÄÎÆ–3[a÷ãó_øOJØ˜…æ•	E*2T,öåÏa˘ºíç≥¸∂È§yø$^Û%
c¡ë,◊ö#òe]WFµR@‹À¡»îÕ<mR,&0wì!úÑt‹N¬kú é‰â¡Âﬂ)’8≤∞¸.å⁄õaã‚tà≤¶Ç-ï…˙(b":r0≈–¡KÎ6ƒd2–ë}âúÃIÚÑoá;ôöÑu™·/¥uÅè£%dÁ$“õı•*ªùj˜K$]¯¢Ù’Q¢KJ$π°ÌérO˚ã r"… ¥	z©-™`F|‡	t:ÂıB—£L’»3ó‚ºcÃ/Ã\»Ô7Bä`ëì\BÇÑiŸ-%<‚¨œƒªºˇKö]ØGﬁc§+,t
%‡åî _)Æ	$)v8ú#Ãô|PB·vÂYÄ‘N¡É≈¬¿ˆ∂[åNy|#=„»1òÖ%È…∏§‹IR®≠B~ˇcJS•ÂÜíÆxb\€¿W√·‚åµßq¡HZ≥·eË?d∂‡%£∏:yj„˙JDæ`Y)[¶X<≈yË›øFìÅ˝PûÁΩ+LØp$%v:ÃÒ∏ÎãÑ"ÿ
√éÓúñ+∑Ωö<g√8\f‹}6…3CŒo.G¨if"cŸ/ÁK1Ô_Å˙ñ®0–NJ±ÈìÅB∆Œ±◊U
%æÃ(Ñ$∂|ÊÒyË«n<M9Tãá=@«ÑÊ¯;.M#bGÔ[tScQûÚ1Áπ√p¯HÂxõ∂Cmh8<¶<ÒPÖ›ıÃù2	óX®¸K›2/Û©A£z∞äÂ«‰Æò9Ñ€hÚäÑ£–<K›êEUÓ1C[S^âÚä ‡vÊpÖ‡wZdíyëù:FNy¶öÛ*ÇÀØ
í}ã»ïÃàÃ84y‡URL¥‰4á_¥Ÿ—óà˜…∑ß´Cd≈0L’ìÖlN‡˝_¢$,ñ∂ﬂÈ˚∞/“Ø‰ﬂMí+ÓÖãàè :_*œ^=
∞]Vx”~éVÙÏ˛∆è>L$⁄¶òA„˛á±»≤wï}œáËcõ¡äÖÄ∫+°OO˝wÎÖÀØ"‚kN£xéGÿÀìúõE†rk¢ÿN÷êLP¢à#K;ÅxiêÄñäÀ#*Á:âHπqÿy:É‡ôsê≠'äJ&:§ëï¶ÃxBÚdL,1·Œµ…‘!ßNt‰(‰¶πLˇÁ9ú™»D§FTÉíËbî%ïØPÆhÂÓÏyàîrorEÉÔBõÖﬂLË¥ñ“/IƒêR≥ &ƒbó©Ùc¢ÅmD…ïûıæ¡çﬂπÌ|‹r2ƒƒˆ@ôúá˝˚}ñ·ﬂŒÁOX∏Ô·ŒìÂÂÜÃøqÃùÒæ‚AﬁÔ>N∆h€ˆ	˙j“kîÖäIOî€∆Ÿq∫ ÓgÖÃ@Î“Zm°4Ÿº€‡…Ï v∫yáóÒ-hIˇ€Õª“ ∫uÃIN&Q∂±ƒ+mI)«íöëµ<y1¸O0c—YaÉãıÚÒ1ªGùïrA†Å/±2ﬁ∆z3£Œ24ùü≤ÎŒejaóùÛdÃz‰´◊πæÑÌ^z¢5Ñ@t*í“∑·vSëiÒâçæ‚âFÒ∞4p?»xë∂…&õoÑ®Çp[iIÉü^Ñ˝o'£Ê[ÚˆÄç‰Åıq¿¨z|ëÕ∑å}ﬂnﬁAù©ÛEmÅÚ Â©êN¬u2µ+î´u◊O˚+cçÎŒ9*üvÒ˘òç:O˘”È ÚËÊ-;Ã–È`>l2¬‡G(|¬õ˙[†W;◊	ú-µﬁ=k·≈®N¬√¡†—v&ƒAé&@¬:ò{ŒΩã%e»oÒdÒL°Û9∂ŒÙäwÛxô]"¨C-Ÿ1Qjÿ€KµÂååv¿⁄∞%æcF·ñ÷‘∆í‘Y¿ –ﬁLëv÷¬;ìX~÷∞πdöQ∏i√WVj∏≥≠*˚‘Sã_ÆÈ•i°oX≤Aƒ •/Åeå	
‡^Ä·ò[Vòìê¬VáÙncÈrÕ?Äzî≤J8ƒ7Q^õró;c≥Òµ† Ss,ŸêZ„Ø√¡Zˇº˚∏ª vëï∏Ñ1√ÖUpàKsu±˜[ﬂˆàÍ≤õ?˛«˝Œ„«´ù√£Éó7˝mﬂ`—váHﬁ⁄CøÛ≈ŒúŒŸÙŒÎ√ˇ8´=LAP’ﬁ∆Ïí÷<Ø›w-ÕéôπPØ°Ó_1Ëc∂mÛ™¡}‰ˆY0	6∂ê9Pò ˝Hƒ/öÇR¥J®
o@d/0 Dç∞ëBZÉô–0Ö(≤M¨áLå¶olë#T»+Xç`ªZ<‚P´ÃÅñbá;Q*ûÓ∆“Ë!ßyÖ√u˚pWlÇ “o-ÏÕ˚∑KŒµ8cÁ◊*õˆoEÌUYÓ—ìe˚‚ ¿«–™äùiU-ï‰ÁÉ¯¿+rÂ¶z\7O#◊ù’œÄÄÇˇ‰ŸcätV∞≈U¥*†‰êìqC¡ç•ç C!·äÙgr~+GÿƒÖº∆a-äÀ<IøÌ,œ%nË@¶∑‚¿C≈8KÜ¨»˚õe≈)„Õ-7áÜ9s¢Ç.˘?Y3uH∂ú§çJdY˛a¥⁄y∆µá«`fò√jÛnı≥©LrEÁÍ∑
≤E~¸kÒ û7qVgoŒFBWFükÀM◊»Q|>e÷öMpÎÖ˝~<Ç] l∞Ù[c8˝ﬁ@óÇQ çëÎÀNƒmï˛®˙2”∆»9ìŸ;$Ú+*@≥œPártˇ8ìÙfÑÆıBÚ~ﬂº+T∆#=°”MX|Ä≥Ï]qK√ıåÂÇpBH≠ÇËœ5l7sâfÓqˇZ`Z0í˘fÏvªîL»ÄÈ,gØñbKgÙ ˆœq	¥cπ∂¨]Ù⁄=~¯˙KŒÏ¿ıHÇf4¢˘‚:LŒf”⁄Ô‚„¨´pó_ﬂø¸ªPT\ÜDa¸ÕﬁÖúH\ƒTnπ±û~rÇÓ{r:am˘W{‚zˇ◊ œ±˘7t“Ñv	Ík˛7p“J¸ZÆ¿7EH¬2Úlp¯Úã%Œ˘Õ@·Ï√\ÇÛ©zmaÅÀŒËF!Í*ö¸Áîú†Høî[±`û˘Øıpa¬&¿kìsÂ0ã∏—
Ên„ä≈`π8«†(\ïña¶z6RbªıüÜ—ÙJ†·Hó™>†ÆPù‚Û>Ô∑VVù%^W´KJbMß$Lπ&àWÜö+≤º3 »ñé◊ MOc[˜—∞£=KA!á¨“c»aH(e/ôÛedŒÅrΩ&¢ù‘`†Ùè(ª¥ •6·£7År˘Êêåo;øó"z˘bÓı —V.¯√à@ãÎ≈„ÎVkqz¿lA≥ñ8Ìg%ù≥Í“9∏¢èÁ£r6PY`™$≤5§a—€≈∞±µèGò(ÎåxIr¿∆ﬁ%3Tíÿpıõﬂ ùFqIEUNck-¶·2¬œ[5∑÷Ãª¿«v¨X˜phÜ¡°vﬁƒQcã0 FãÛTäÏ0g“G31¥∆#”5\&åïCQ¬o=“ò'É	Í•	VJ2ôÆ%˙π–ñîå¸m·-% .q]z¬≈pò‚7J$∂b™1ﬂ¸ø#4∂q<©√g!Ê&"{Ü˜ƒh≥’¿´°Ïêâø>VP˜@k|Ê^#õLL†!T=1KÔˇÇ⁄12∆Â¢¿|W1∑uâ$£‚∂qËX%¿áÛ!µ˘'V%ööã ˛EëŸ¬¶ú-±#JK|Ã”øß∫é‹;Õ|! ˚<6aTıË˛G2Ï%éäé˘7jÁ‡{iŸ¶0(òÓ˝y¬dHpÁd¸%2'£ITA∆A˝â»Ú`í}9${µ¥m„2Kc‚—_I=≥4în`®ER2õôe¶∫8‰ »=Ë…ıyU'±‘Ú“ªÅÃK?æ¿àÛÕ∆ÓÕ∫2îäÈ™êˆ U}cÑqôü’ó;4Óé√¸"w©≠˘+≠»8VY}ˆPUR“áéî˚I{∆)r≈¸èÄãbÆÒFœÔn/∑À´géî˚-?tòtJ'©∏g‹3«ãMÕ.%V}¢J˚]œ¯∂Ø‚±˝~àŒÈ˝m≥Ùøˇ7∂˙ŸÔŸø˝”?3ûÙ˘˛«!=n;´-“Õ±‡2Ø´3C BP¶M´Ud@ç»¶NLÈ1BTÏ<´∏|mY£®QQZõI≠ö§ÖS@hí÷ÑF¸“Í!•ÈÎ™bﬂÕA¢¯èå,5Òü0∫,o%Õ∆;©j‡±≈1'∞∆Ò]›ï`Ò!/t}ƒÔsã≥·∏≥¢À»Èâ_‚‰ÒÇ˝x?öQ–5Öª@æ¸∫≠úÙ‡˙˜[dàì…ªû<¥êRÔ≤Ìú”kx£Á1ñH√‹sW_wèD\ KﬁØIö9ı5 `éÔˇÍƒ+ á¸Û˘π°œﬂ?Œ*ù—ÜˇtTÅRçÇÊ¡≠¶π9.Æ%Ú˜7Fnœü¿SÙÌÔæ~s∂w≤ªåN≈€o^ùtœì4iãe–⁄'+‚°ø’‚X¯|1Uãü&ÂV”Üa}^ÒáKUœÄë°±Ë{Ü! √ãD¢ı≈≤Ù%$_"M0±Ø6 øÓEÅ\•ùÚ÷ÄœVj∞ò2B∂qzf™u∞çl§Í◊Ï∂¯s{®ŸÒG—.Ü÷,—c›yß√à¶¢ÓœXBï€wˆTò6åd∞› §âÑ€i¥Ë&Qí`	zˆhÁòπÍbúÕ—¡ß£¸√EUá ¿j¿ää~ËYÆ u∫¿XS¿cË˘(Úãø]†Í)&•°$_ÿH∑¡≈Àa∂Ÿ |S”Î“Ñ⁄lπÕ®È˘Û∆vfóüŒ—¶ÔîjaI´€ûq¸Êñ4“_ïTäi¶˝úÍrl.§êHÇ—MÁ1iH`ªz¬—`]{’√Ë{∂ã¬¨!÷ùhîMJÅ‡c.]ú›‡#™|ï	`WΩÖ'¢Ö˙ÍÒﬂ,	‹∆óy2˙:ŒQ>RΩïßUFâkö—ÊlÈû#‹ìdÑWmÅç_wûh÷0wpC≥ﬂ±ïÈ<R=ü,ëõpHÈ°èPƒN‡vﬁ%—ãºÁÏì◊3ÅºàWÀ©µı€ﬂÖSnﬁ¯ˇÿ;{a éø
íê∏8πÈ‡™â∆’D4¡qPc‚#˘æòwWh\?":®ò∞@˘hΩk˘]Ô_¢õGÓÄ»>ÒÈ:ƒÏBínì˝:ªx$vÄcaƒ'›T=“)tÚR5ˆ:±ëˇ¬èÅÚ˚ˆÏ8S~–>èÉ‚°áÅ◊¢R¥_˘dáT–}L
&ÛÄai∏Á—§Ó»∏…}D:Ü+ªn@Ó£€X8ß ∂-8ÜŸ´ı<®Ôï√i/?Y˘∫Bü|¡ZÃ 767√ˇcπ"'a¨îE±ÚFÌ∞QkPøêÖ◊+òl™œÿ6wËäúËD¯yy∫±˘ﬂ ◊£µêª‹Òön⁄±5P∆Ô¡·]”Ï∏ªRŒ"	›KΩy!wñ‚‚•X*A	∏„RÌÀË:‡∏∂ÿ@¨V!Ä≤®~‹7¥ª–“GÊ	õùæ@¥˘Ê§,ním¿⁄eµç€bÌw!ÈLo¡_¶“ºYQ|œ·vø ¶≥∫5~QôÁÓ(µqÍS*Á∏®2?ááw¨Zπˆ≤j√Üü   ˇˇÏ]›rGvæﬂßh1ﬁ¨ê 	í≤Õ•§–m´"R\K÷&Q©Ï!– «f‡ôIô≈GHnÚ õT.Ræ E.Rµó—Ì#‰ú”?”Û◊›≠ÚTπÅÉûû˛=ÁÙwæØÏßñ \nh–ùuCÎº…Ê]Î7ß“‚Tz∏å≥«X5µNcÒáﬂX∏Ÿ‚:˛î”s¨˚[Õπ[Ö€§Â°Ø…éÛ+f`8Dz0Õ=¬ë‰)∏Ê%©ÖC5Úê4æπ5]q˛¨Àùö¨KA,{K~?ú
÷-MØÿ.Ò“3YÓf8ã">Niâ÷"Uû„¿KÀã\«°€o¨ÉN?'>¯í™÷z∏ÅmM∆úli
+|5´‘ÄP∑5ı–06ÎOt(çºÜEö£Í´›zz•äõS:Â£È~Öxi€ΩOπö’ΩâáM.Zy“K[vØ°†øq&£Ÿ·Æ˙UlÔ2gæ´N+£/L4˛´ùN˘:/cè˘≠#ïúgpO.6ÖFÁ(«toˆ‰h—ﬂ8sù]∞Ù¶
MæeObu¬ß/vÎÜπ®åòoê M—d≥CÕ√¬ø€nÌ≠,+Ï1eF^xzà+ÎDÒbÇ∞ÙÌö  }…T;Uã%óHÍfÕ"Jìı√D◊àÍ6wMèO3XäÊÀ®û;;zË–JcáO0‹-5‚t6F-á¡⁄`´∫v:ı@ZŸ õAıÏpqfqÇññ”X]~Êi{Ú´aÎkªée†≠˘ÂïIbÅÄWóù.;ΩÚ≤ÛÍovzÁ˝`ó'ßÇÍ'÷uÔè	a‡Â≤≥kÉ‡∫jÎz¥ÿÕ˙˘ü‡<˘GÎπä'Çº‚KŒHOÑ›0K@SK<¥"£µ&á¥úl·vtë∑é^⁄Hùß·ı?7|Û›PÖ5†÷D¶å§xÎ(÷≈°'˘∫R+ãgH%~â‡G–ëR`Y·Ágwœ:r+1ú6÷ˇ˝≠2¡˘8Óˇ˚S(d	®›‹n˘Å∞6mãw°Ÿ_ºô⁄√4é^¡ﬂWz∆V^•…ˆvÎÿÏN1ÛLÃ‘a‹ü•˚Ò,áÿoÒU…∞∂«lÏAèò»˘e#ÆÙß√ïí=h$¡¡ò<ÿ?hUh4˝¡V*ÚyäÂ"Ò£±\ë2O…j¬Y
!oôßxöµ1M⁄ÊF°˘}®Á∑«s¿∏†πbπ≈ò$bsWoZ∑ØóJ∑“uÃ†Õœ†Ú$!0GD@éYÅ∞`•`à˛›ﬁ x±õN˘hÍN	µã>O2°'%wáëŸ87Ìõi©iÃæ‡Ü˝êxñÕ’\˝¶ö}U7nú;ıÊã Í◊•›úŒŒÉË«uFßÍ&Aéª›n°™pè£ép«‹ï;¢ºIÃif1Â58
3G+·ﬁ5páP*^-ÖgãHi√o*ÿöî‚≈¨ë“πM?~o©<ç∫Qkk"O…∏k‰m‰Åõ/€∂≠SŒ^Åø[`xî˛éÅ·Z€É£Âà≠€√?p%¬b]<√
(Ü}¶‰V¥Ènu¸|¿˙iÜ»™xZ…Xñ
∂®≥¢üﬂIÛ!%Å0‘|≤2BŸV$UÖº‡RÏ∫¬7áOü~wv¯O'«ß/æ;9~Òı≥«œ)f=qA[TÜœq$àº0.>ùo∞]Nxv“nı«3∞:N∏â∏ 3NNarxU9Jû≈£—òﬁ@æ_«5’6ZæR%á^§	OÊ–è÷ô/é≥[G”Ûé´Ñœ7∑+tΩõ®/v1ÙÌ≠“ëå¢õ˜4m3˘Âho7ıFq≤p1üjˆ…†‘Í∂8Ô∫≠›j≠J /ÌÖug7˘ìêó„› §Üíƒ8⁄ÿ¥Òs»ÜqÛÉ∞πÇìE◊õÓW!ròèdÕyùú˚úM,„\ºÖQWXÊº-;Ø_›ìÆP]ãuW≥/ˇfﬁ5õwÁ‡{¥≥ÌËn√.£Ç58˘ø6√ÓEp≠∆O“KöVG…€_¿TçõâUe|Ãª«‡%£ÍÀ‡i¨Û˚5ˇ'òyƒËI∆§Ü°‰óâﬁ˛ÏÈXÿzT'Rî ˚0ƒÓxÒrÏªù"y‰n—‹ªÔ4˜˙⁄Úˇís?t’H·ê‡e<&Õº€“2’"ÏàØ·fÕÒ`O<WC8∏¸2◊>H≠JÔ(∫7_Êd„Æ8˙C™≈@ÖéNààöüØ F3åÑy Ë“åO¨¿=ÓáÊ¡ÕñGdfÿr~Ω MÍGn\D,
Ÿ˘#såvä˝¥ŒäMD¬º-Ü±*lÑråß%)≤é¶^§˙ºøÂ⁄„F‘{lö(}±¬$>&¥ Êã‰bbÌ‚öÉå.8O„Ò…¸±^ËIƒ”çÌÕ€ óÇﬁ˛}aT…+øv:˚ﬂõ˙”&0ßQÛÀÂŸ äüQ†£ﬂk∏≠RÉ•ˇ˚¯Ì/Á`,ƒx—d¸4#	ÂÿàÚÄYÄõ˛@=~Ÿˇ$∏ﬁ∏Ç˘v'úˇZ⁄FºúmXu∞ÓUÁ&<Ôº¨∏’ˆÎø˘znΩr„sΩc˙Óøu˘è´Âtñ±·~€≠k≥Ω[≠c%wÆSãâîÏ9ÔHâÎ˛;#QµDG¥s+˜±πC#Œ/Kò∫
®ÆIŒ∑Óæï‡≥Vyﬁ©µFnp@c}õ¬Ñn†ckëLA˜7(ÀÀá`ºäë?Œ´)2.=Ü_SäYaI“XÙ=SZ§,·€JÖ1nho©A]I_k5Äì$æzJÑÊ:”pÛ!{è@AáÌá‡~	-{ÿúc¢¿„i√ ∂≤¬◊⁄“˙ê#ùÏ”g®~∂—Ä{Ä/õó≈:µß-‘≤–@Ÿ&-Ÿ¨+•¿∫1õÏ∂©∫öÍ2Å93õË®F§0ªfFö"∆óÿ $ﬂâ‡Ç®⁄+\óﬁ=Ã	©h;ôŸ‘π.êµ˚4œO'†2ïÌI˘òN0P ÿ O≥9úiÒÈE|u8ÊI÷˘^îC‹„–%“G˘§⁄∫˜æ∑ñiÕ‹ˆXk¿∫/≤¨MO2O]—ûbaw‘kQ>Ía(6ÆA¶√ZíFê€)òd•Ú[-TxYÌô„7º∏TâÊO¶hR€#s®⁄‰öáù„ti^À®‹wGˇ0ÃOƒ¸bU©«<Àëb8÷¯ y[k‘Îøø#Ÿ5ÌCZyJœÆa≤.>¸9¨ytòãé¥REŒ†ÌØ`ƒŸÍ¢Óq‡†ëﬂ©wRzzJtÚ¸á iD<∑Ó4¬ªy~¶YI∆n{ÜÁ(©¨Ñør8⁄˝‹d[±b´€R‘!y«˙«˛¿Á™„XPtrxåΩkëòhlâ\ÇÈEX]∆‹¢°∫ñ}ØÃEËò&À∞x[*dƒIïuÂ·W‚%˙˛4ßX·r}2DaáÍ#Æ;0Ï¬¿Ÿ\∆a£¥– √g0lâ?ô!TÍú=~π÷∫∏K¨î≥Ú•¸ƒéØ3;j]Ãöp!:·±¸§µZóÀ◊+æË¢‘Oi µm∂  ∆ƒ2-aÉÎHÀ/çE›€g∞’qZÂ]`Ä:€‘Ÿ6&∂U]xmá∫K≠mŸËèSX›frªﬁ)Œ0¡ê}s“eá1ja¬∆œ'à⁄Ó&¡0 ﬂ:%¡Ù"Ïß(a∞Œ‡Q!dÃ/1}p&<ìj~õ‚Öbûv-’∏πgÿqè∫ÜÙÑP9´Xèî|¸uLfå‚Àò®Ã”LøÄS 1u∏¿hè®”ãYë]ã÷•≈8_¿©à∆G†Mr_≠¢Y)Ô÷;ÁÕ©Ê$|ø+Ë2w6Êb§ù*Œ—’∆ßÏ˛+gt‡p{%^Y—EÍÁëMŒ§≥ÌuJÊ—*ÊãÙ˙Q˝iKn7Hß∂t¸b⁄Ü7À¶0xOﬁ˛œ`6v%À:πè^äÓë¿Ã¢V@D”FHÿÖ?√¸ﬁdGò<ˇGsA|@Z¬ê¶>…»P'w,WÜïyaP}›÷Üúƒ–ﬁ\v¨‰igƒ/^ıo˘rÌæ∑Œ™3Ω≠2p†ïÈ≤%Ú ¿Ìô±˙÷û†ﬂyàúm•$‰˙· ãFn«¥J◊lΩ<∑X]é¥‹ﬂı.Á∂êGÜaÓC6ß∆Pj}∑*ò∏Íﬂ»C≥’„¨.ª‡¡¿1	≤ƒ5ì°ò9œ˚™,zLlØ<‘ãIvÒa™P¶æ‰…]©
≠uw•2b¡Ω3µ´æª:páudc	éŸqêù«É7ˆ«‹ú<{¸Ì”c$î}r˙‰≈ìgß"q¢3â^|ß"Å⁄dÇπıã˛+(¨^c6ÿòå¸jüÉq ◊¡ê‰∞6Ëb˙0|ıﬂÿ≠ãsR—ÜbÓ‘•3˘x∞èòøx»DùéíŸ Øó'ü´e3kCû*™'ïÓ%ØÈ˚iò¸ÈôÜY.ƒã'+≥Œ^Q[Ωﬁg˜‰WÚø≤77Ÿsä+¡Êâ{Ÿ K 1P_∞lª⁄3B¬FA’˛√QPâSeì£ì\a≤Ïv˙".W¨£pÏ∞È»©ª'_±ãﬂ¨˘±⁄™fÈä6á÷°Ü˝É˛´W˝VÙÇ˛ﬁ„I>É2}H¬YgjêÏÎÓÛË7E´≥ØD&º`ñ©JT—zDÌ´≠Ó÷éïÎ√(oP`æQfXwØ‰∞î<m•m\è1Qj£R52á!ÆõŒ+1í÷Ÿ™¯	{ˇ/˙{ı5R1ù÷XåB'5öÒrÜåø3€äÚz*/´Svå—.kÇ„}EΩtÇ/ÌóìC’fˇ§k
P∫4ËΩ{∏E»e≈ãkìÆN!^ˇ^q≤cô4”˝K4‚∏FÆúËE?PÒb>L†eYmı6Zä∫∑ï'Ôç‚É±Ò¯6≥õ(#ã¡k¯ ç]÷	ïc_`ö≤õÙÏ∆‹ÄÌ∂‰≥Ø•«í‹£ªÎÈππ∑úÅûeEyàqïÃ2÷$§Á*Ü‚
Ù¥éÚú	™Zà‘j¬-pN†Ôû"åœÜHÔhJ™@∞É˜madÑ.ö¶Ò®råk„ ºÅ˘ˆå¬Ò"·¶O3ß≠“´≈ä¶]Ñ¡πëS%ΩÔ¨jÒH◊BÁˇb-°x°	´[∆œT’Æ∂_ë{‚Io'£=çˆIŸ™\˝∑å£#1^icU<ÙµœC]ˆÈ¢≥‘ã8≠<NefØÔØEhàâd
≠Õt¿Ï"xT
˙$∞´©·—¯≠r‹ΩO±"^É]π’Ã$ª[õøΩU.9+˛&o9˜]Õ8fƒ/ÔH4Ûª⁄¿ºñûm{mIéÈ&“≠∞QÂbÑIÅ´ÈTˆú8g†ÜzÕ≥õa€(Ôƒ> ˆ¬8ò bK®J!=ñÙ˛{Hè∑XêsZ7uõ”Í4NW◊lÉl¡FcMâÀ>&ú%”1/Zé‚´w7wÓ¸!aQ m	ÉUìqN±3!8^ êà˜%Ü˛ó}Z∏X∆∫n^πyˆ¡·«6Y]@:¯w±±VŸ≠küïÂ\@£∆ÿ¶FYyC≥øeáÁ<…Ç‘øD.∫∆(Ov€dgI<òeqã“R≥Î√/Ú‚¥æù)q" Örq<ˇí˙JDœ(HÎµh$:Ûä…E˘ZTGä˜ôµQ_π
yÌÔ≥‡’‰∑ú.[ª.x˘«R˝X+7Ø6Æ^≠›ºÊpi A≠¢yÁŸ‡’¬ª±Vf'áûÔs2‡sS[V+~VóÅ-?OR¯^KO®Í4ÕSß1Î#õ¡_…≥'•ªd7π∑§ød˛ã∫>åøÑóGd÷Îú#˜<"ΩÚÏ›¢ΩÛ∆º iÇ˙'øEqÎçÒ›;≈5±zò$!I+s¯ÂÇQóÃï9i“2óO‰#:)£Ö,ä©6)GŒ◊l(Fπ9E˚õ_Û˛å@&w#≤ÎÂb:m¢π’‹—‹√æ(H[EPÿ˚ËäG˛j∫≤	k-ü ø»Úëª§ònππ≈#û{w√∫b˘√ÉòLå˛≈wÔD<óxG>@Hw…‹ZSwo7Úû˙oÉ∆‹BxE{≤Y’∑>§©•“ZUgª≠πbºB∞ä)?Ú?ÖÉÏ‚¡Ò%9c—>§™^;[X€ë®˘Ìp·iÕnœ∆Å@œ™D≤Ò…ﬁëlØfªk·Ó∆\˜]¥ì?ko'€©,|w_:ãÊgîﬁå£)XŒ¶†LE±®≥êDÚ|†∑ÃhGAÑÏùI„p‰,∏srbÏ;WﬂòÎ¶Óü&·Àe‰˚/°√î0⁄p“∑ò´Ôgw√÷`ßi√L”ƒ#|3£tAÿ_H†≈XÙŸ´æ4Úôw(ü˘æø¶ÀA≠2£49®Íæ¡Eáj.U‚O·0T˚gU¢sclØóÆ/ )ÎH #¸û|´1èFŸÖ-üÍ†t¶∂÷ª…úÒ	˙Ω®}ââªDå‚$@î7∫œcˆ‰l]Lå/0/∂TJ}2)¡4âØC"'D#‹V„Up¡“ûƒô»Er6˙a˙Nû4”tQ•∂#ÏÏVmìµÖ*AÑ)QúÚËb6	4e
∫ò€õ≤∑g·>†ëFx
‰Rbjò¥FΩÊìpÆkt¯SO»rŒõúñ±›ÓÃXäãy‚Ìï›vZ'◊zA«´ÕÕøqµaœ”.P€ˇu´âi…”¿K©ÿ˙å™Å∫ï~r∂œ∞·ß∑Ïˇ˛?¯eÿo˜0¯ŒF …áE‹¯◊=&«…nCàG©^XöˆÔÒ◊?ˇ€øòiı˛∞lxÇXA¯S˘†G‡=‡°Cªq±ogäàxø^˝Ûø˛7;⁄¸Ñ±ãÑ‹|ëe”tsÛÍÍ™;ä„—ò#G¿&ÃËÙ—O>©6 æˇÌzÌ¢—Ì˜˛àw∫ø…ÉïÔ¿ˆä~Ùœ†+Aú(éß*¢ﬁà'â›∑y}Ç+FÇÄ§∫§ﬁû’¥yµÍC∆^“;0h˘V=y∞¥z–Õ*Œ¸ ô‰∞ÔÆﬁﬁ§¡êìTE÷©v´L:Ã0ee∞yr¬æ˛z2Ymë‹`#h®\≠fÁà«π´ ÷üò‰PﬂE,=uÇäü¬‰|Z0Fæ:{.∏80≈9¡Fà†ÿ_ZD1Ïê†NÒπa_rî }è-†ˆÄ«<
E‘™<.ºØ6¡F∆!º|ö
V¬¯Ìò†lø¢≠À:8r¬h¶”XíF±6z≠*iÛ7ò˝}t$Ò·Kƒ6Q/J„sùÄB≤Á`îfòmä›0
£|ïÿ|ó^*ºﬂ≈OÇI‹Íuå⁄3é+=€®≤Æº√¯Ò«ﬂ®´Æqëo¯O3òMjQÓ§>≤kÊï'æ%¢(pRUi–•Ùä©'ÙG]-r€uˆzwØ@~Q9≠®–hT¢7R
†í˚∂W'Ä#`€◊n≥ìú”≥0R>˘∂M;†ÊrÙ“&üÅªl∞&£ÅPÿy,åHï z¢.‘Â=∂⁄éÔ⁄—˝8DóxÈR∂ﬂâIúÚ¬0§/vÕ1®oqüµ®ÀL<VQå∆òl˘j◊´æK´ﬂ}Æ¨NW)V¸éÁE˚Ì€_åÌ˙â!)òÒ¸Ì≈Ï‰!—:êÑ—¢à¬,ZÛ˙äüÅè•ùèpã¶1Ó~∞Ï\}!¥<à¡–	.˘Hê=wŸÏ‚Úvÿ‰«£Ÿ€_&å ‘?≥ôD(Ç:»;—÷:¿≥∂ªøÃ˚1h›∑tpÑ◊±-Œ≥ (”›!õû[ÂÑOŒ´QƒéÔD4]éVqd?‰DJb ä.√4<«rhH“iÆa?Sù@:7wÙ≤Œøû§GƒFpÇÒ3pü;YBTØæ'-NÆÂ~˛íÚÒP‚7` ”øLÄÍ‹LÃñqu6û•EÊ√Aÿá™¡¥W‹Àíôy–D¬Ïur„5±}0]Ñ_lé˜“ÅM˙#Èö9pKŒ%…é†óê‰d÷ï_ ˆ˘ë
ù?zƒ>m>ôñ	ÙP• â*2À⁄ﬁrF0JÇqJ!ıx7ùé√¨≥ VÌFÑÔΩ⁄zΩ÷˝Ü@gæOgÁiŒ√®≥µŒzk›,˛Â éÂ`]¡⁄4ô:<4-´ìù7C;|ßŒΩÚ_¡≈†?í„1â˚?n`WlÑÉUÀcˇ‡ç£—c›œ)d?£êΩıæV úÉj>øÍ}Ü{ºñ÷«wÄÁπjã˚]yO+ú,Ïn91<f?“púúhæ†_∂WÖÏÏ±™ eUZM.GjîYU÷ûﬁ∫%”[ãoX^Zs ≤ÚÚ˛äz∫ô±[âÛ±!J3yxœÂŸ{:!6n é√ mu¬Vè,tæî∑Tﬁ(	òæ¥ë≈Á	&Ò§∏Á∆˙ü˜∑|≈ÙÍ˜ËAÎtbnø
gÿiŒæªQãÙ¬ euÁõ€5)a“ÎÌR¸xé£∑åÙö)Âè‰Oﬂ#/˝$ZßgpR
¨˘F ¿pœ "ø£_ß#ñ≥[jƒHé·ﬂ	·≤7Ñ¢3@™ﬂÀ”Ö÷!‚\ÿ[W'‰xÖJ6È•º2^f>8ñRÒuM÷têçeÑñ–Rå—Kx∆ºõ«ãÒ…g˚Ä õmb}OOTD$ÕVID†Mà∞Ãeßj˙yq≥¨Ud™£ïòW G©∏ÑÊÜΩ
TkÛRHd¶ÒãNÒÁ‰/Úz'€W:¸gÜ√ø‘66¸"jcX:d–aÅ–‚ˆ≥™!çg’Œ<§‚!ûÒÂvÈ»ÂêZc
&DÃcı™"Où÷î‹bﬂ9±◊ïΩ^√Å«NÂTóŒQ=6)Ü—™ÄbøÄK)WÄøˆ”~0F√PY}Èƒ’Ó‚9œD$Ì©@ ûÍ®è‚hb^ù+~Ó7/Éœ3£™¨Ã6Û°	†ﬂÊ™lémy©¥ƒÅ4R™Ô≥OîÈjWeóGäyëtu∑n{ÅËç¡l(∂5!‰5ƒŒ5#K„ZE›=òÖŸﬁI©¨Iüs√ø,‰∂†q\E^Stâ†"$≤¥ÅB1|ºZ¯ì¸ë/ñ˜A‡;2G»#C¢¨ı^ØΩ∆¢iã◊˘ïÙ8 ıT¢*æÏ˛©ós˜"	“ã^õ°ÿ"±ˇ›Œ]74Æ\MÈN≠”!jN÷Ë$•.¶xæÚ‡&,π‘ÜQq®√≤’;x˝YçGBj	V¶ST^“gQÃæ·”∆,’åï⁄VhôÂ·£„∫1°cág˘°ß‘bP(%u©$íj~D}R¡x˚%¸…ó8„î3èø?√,"ÒÙ.PøÔ«<rç\jJE*,Æ˘ê’¢4âÀGπí’JQ(Ò¯züùZÏy8æ¥"cƒØæUÔZ9∆”¸oiHó,e°f¨’ﬂsR`Ì[ÆõE∑Ú‘∏cŒ⁄5»VN•˛d©≤íQAÈMv84ÎvogwÔ˛Zπ⁄vïÀ”‚Mﬁï˜:l˚–∫ï8ø’8ÀÖhX FùSƒÚ4ˇıbT,˜>*K÷yg¡∏Ω»„ojñø©Y.LÕ“ò‚Àí≥§≠ﬁö[à®e˝/T∂C\)Öôpï≤T—ùƒ‹√™Pf Ø:.uÎ‰ÚôkÕ˙ôÀ´,Ê‹[YÔ[d1X≈Uõ∆Ω”2≈æû¬pJÓ⁄«ùG/˙ g˜\ÌæP¯Vs‰Á≈ãNí/π:sıM[«`ì∆|˘5wõÛ¸`Û+Ï∞Ë¥òäÒ˝‹⁄€?¸Ówˇ  ˇˇ i…ù÷