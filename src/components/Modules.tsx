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
        xúÏΩ[s‹∆ñ.¯~~E™éœf±]UºÀ2MQAëíÕIdì¥ˆ>≠QH`d¡Fe ≈ãÀåò∑y<3èÛ0=˝∞cüà11qõˇ§…¨ï »L$ä§d{oÑ-V°ÄºÆ\πr]æEΩfKˇ@ﬁÜŸ‘ã¬ü=?Iâê˝<à3'‰pÔ-ÈÓ&„â7ÃÒÓ8#ª^öìWañ/íX∫˘ODΩ∂¸Ç#/Àﬁx„‡iÁ,
Æ˙+d∆˝QôåØ·K6ﬁÑø´‰Ùº9
Û`È´erÍÙ”d“?ç¶iˇ*#i2ç˝¿Ô_E¯º¯∂
_Oì‘R˛ßüE^Ùø^^^ZY&ì˛ `üüÙ◊VMˇÈìà$Az%ó˝QË˚AL≤tˆ≤∆qêv∂´›0ÙÑÑ8˝aÁ–Ç¶Yû]˜OÉ¸2Ä"'ß¨swU4ÔT€Œ1˛Æj+«˙≥âÀ»É´ºˇÓ´…’{|ï}˚øù%q„#H¶ìIêΩ, y
ﬂ√Ü8ƒ—¢è≥6|µº‹Ÿf3‹ùa6QüÁ£õ≈≠%¨”µ=b «õaÖq¿Íx˜§lR˘r≈ÎÀÀe;€HCR€+/æ˝3Áâπ[K0€ˇIÛã‹ÚÙÈS≤LûëÆ°zÚTIE;…¸+ÌˇåDFiÌ1ÅVÉ˛µ ?Ò’8πÿî„Q2ô¿=˜ŒI˛<ù≠.ﬂ»çÉÇ¯´É∏¥±Lº8„◊SX√†Cñ⁄UÙ‰F?ìßQTt∑Í&u¢˝Z!⁄ïÂ
’™ƒi$‚Œ6û4åG	üã4ÿZö¥k∆”⁄©Í4bÏ]ı/˚ÔVó±±ùÌ„ 
ÜaTûddí&˛4á±G"J≈ﬁ©^%d‚•ŸÒI/%‹	¸–OÊ¶r∫Æˇ∞H6[R±`≤´ªÓ{–L2N∆˝lò&Qt
ÌÇ◊a<˚◊‚Î5tuÈ1–¥øb![∂⁄∆ﬁ§€≈u“#°µHûnìôÒ∏ÜIúÂtaOOÛ$˜"Úî~xi‡¡z•ü'i8»?H?œ?MΩ8Ûkí˙É‚«olHÉ|ö∆¶UGˆ«‡˙È∫•¨ë	Ó\ì´bÉ)÷:‹[%#ÛMÿ–J6øQla—9rúÖ9êEﬂã"r?M,ÉlûfÎ‘X¢S°Á^±ç‚«UJWó@WåÃ\*!∆ÌÀ∏´å Üê(„â€;R9å¸r1ÚÿN1Ãcü∑-ØE|_«Ô2ÎŒF¿G~Ï/;vÆôBk7WnÉ`€P´œV&fÆQ'm˘oÖÛ}]aø¿Ì·6â`j¿ÜÛ|îó\ô~uo£C”jí£±?6.Ø-ﬁAñ»`≠e‰h\ÚJ]ö±S.≥tÉõFuøjQµ¶ı73ôC~$›/ É<y^~wuqêX=Awa∞–#ΩÖ≈2˛˜ˇwÒ#pÀÖÁq&ÌÜz—π`ﬁ≠ ÉM Oﬁzú1ÅòÜ´ˆ‰FgIÛÃ6rüd˛Çqêzëﬂº‹Ç∞kè∑xìÙèæ–ı‘>Oüwnå¢á˛πÿ[÷
FL∆?EV©π}uÀeu+ƒ∞C√÷¡4ü-[0‡”iû'qãπM‚›(˛¯t÷•í‘t‚CΩxŒ˛«¸∫ÇHèÙWZã4(ó˝5Ë◊à˛√pŸ_«?#¯√;_√efˆòYu_÷Ó›FëÑ-£4…èdwhºZU6N”,I˚ì$ƒ:-zs=ﬁaÎúÜÓØ∂YÛ}˜mãëÅ;ŸÃ#0Å$	Cïùº≥]Z⁄à#‰a˘7O«b≥¯$§º3E≠à˜0§¸Â√ê≤ÛnAZSXÖº≤ ?8ÕP+πp’M§/TÇS<Ö©ÿ§ÁTg⁄+	o6åªùb¡=Dö‰a[|VùÁìf†9Az·Ω¡V≥7>ÖmÂhPß¢ì®	Œ∑c/Ω¶O∫7öÕ´˜ˆœ∑ˇí?°çq# wŒ:»2Ô<8÷í\©¥≤¢◊^YµENØ⁄¥UŒ≈ód¸	hS#œ>#i0Ü9F›·óiúw©ˆdì$ì Æ›üìZ›Y@[∫v/Y€˝NU⁄ñIû ÌV∆˝Uÿ
“X†ıGtˆ–>¬~†- ≤D?VM&ip˚Á§„Vß˚¬8Ñ39Ï˜π÷*E~ûU¶óz‹∆_À«n¶ü‡Züı'™ËÒr°J€).ƒ—NË.Ô·P'D±O¿ä◊yô&cîƒÊÂ,ñ5)ñÆÜÉ(fNqàokb˘Ì?¿vvízŸhı>◊ñZ‚}/-áGéˆNÕÙb’/øTÖúE7eÕVO¶πC/ºh*x±$JA≈nJ-X#/>á"∫Åt¡Æ≈±CI0 ∆}‰Zß”ÍH‚ó…pöôDQ◊EFy«(â¸ ≠
nA
Ï=ÈWõdò§=M>eÜ“∑,°Ä7åB<§,óÖ°™ŒP8Á∞:G˝«xÑb"Í∆rE¬nØ¬"óu&h˙0û©*V=©´õ^rÜCπôLs4#˜c¥≤±[JÂÎ.[~„RjúñÊU±h∂4›òä7õ˘Í.˙˙i<O`˝è…Œ˛ıêœíÁ q8∏aLÚ“%!◊∫$–p’£A9Wïs˘LP≠ü—Â¡Èu´QΩR¬%⁄Ê‡A¥î‹+ßxa€ûL£¨¡¥mV\ú0íâ7ÛkXùmÙ¨ŸJÊûoq{ vÇlêÚÎ	¥í=c\;ıSı1é÷N§yˆ"ˆN#êteµ{Êïƒ≈Ë˙+ F/–…í8IëÕÅ$ëﬁ˛s&(˙É¸«ˇ˙ O˚iÄ0ç"˝%]@ÉÜ˘uÒ\Ω˛∫±ΩÆÁ'ìBõ1Bj!ñlæ|ï-W‰ûäí»v™“`»WúÇÄ|óVóâr2˙äü°™∆SïÁ©¡4´è m3∑û∞‘J˘giEoúù)˜ÕŸ¶uXoùm+	f‰ ñH
æûù-ÿu§ÿ¨∆Óõ◊¥ÖœÉ`“]¸(˝~íxYﬁùë1Sô@G˛„ø˝?‰Ñ ∞.<∂Pp)¿»\$√€ˇNíÈE8%	9'Åõ^Üg/¬D
xıˆüI>Öt6ç©KÏ'è`[£’ûÑ„ vÈn¡(§v†ñm±G‡∞ﬂ4Ü6∂Æh|-IXàwû§^ä„9zfLê¡Ù¬ﬂÈ∏\Îi‡E∆!î˜=Ì¬~á§‘›.≠kÙπ∆%‹é€Æ(68së‡l·M[x8§‚¡	cr¬$^¢t.ˇ4Ä∂é√Õ‘ªpl)¸´ﬂxu¢qâ ΩÏ:ín≥w!¬VìßƒªÙ¬\ÌO ªœÚ√¢[]ãúÜWxF∫¨8π˚ãÕ Æ<J.)·wã±ë˝ﬂÇeÒÿªŒ©-€ãºÏŸA¢Fø1è3Xù∞{§ Ò&–9ê;¨‚1àÚ∞®7*1¬1z‰¬õS ®d}∫!1svN1˛ÉNc)≠z@ãÌZ‰üı‡`B73úê≥|öÍzøî·Ú	Ët·ßX(‹î)„¡«ö;e˛’ÃgJ
∂^n ”äMÌ¯<X¶¡BÕG´ ˝ö›˘™P•(≠-?,Ô±+GvÿÑø©éŸ1fFˆ`gNZŸ¬(ﬁŒ¶p~6≥f¡Ãñ™2øãÜÔní!! „Aô˙Ã
)<Ωv∂_z9,zR'ﬂ%?ñWCsjzœ0˜Ämv∂Q!yVVÅ5Ú‰à(8ŒShGwé|œèz APûé_BêSÓÖÁaûmí’:πj¡s¨≠…ÌO≥ö[ =<›æ3/⁄8!„‰4å≤Dˆ¬4Ä^„=˜Ûd≤I
«ÒC·á[=7E!¯õ®ﬁ†√_ËœTÌPÿêUèpÒbqÇÜóƒgVˇ©gk‘ó@å\HÉyiPßKÏ˛q‡•√˘Ÿ∂:⁄√°
÷ı“ª®“‡ëæfw}‘û¿k°£˛◊Ã¯æb<ãœ∫ÍÍ˝Â¬n¿ë'π|÷«àá—¶∂ª0Ù‚ﬂßs:ÃÌ˙D.à´ük˜≥ú¬^≈¡$àªy⁄†„ª».nÂ9ä°úËl™(EÒ5sWXY)}ù
*„ƒR®fƒïbUsóº°H1@V≈˛Q´ûú3ÿ÷ÜHÅõ≤ä˛◊çûsm [á—4Sm∏s)’5YCl≈Õ≥9/y∑ }F
∑2˝Ññl¿8{¯~·±≈<ˆ„§Ù÷∑˘‚ø[È!_ÎëıŸxO›ÚBb∑È·ña>?›ÿ“hé0LƒhÙ˜˘©A’⁄ j-X∏§}ñÜ=Ïqπ\eÖH]6:Î\Ëïï›†ßÉüÍzó™:‘n∂f7ç÷÷≥k∂a≤l>ÈÕ∂£≈÷™kÛï%cﬁ˜¯Û|Îì^ÒN≥$öR◊Û≥ºø v˙yçÄ–_YZ%}:´tdØÈi®◊pJ8«Xø1rfç2R9∑Ae¥y∆π©YöËB¿W∫™e	d¥ÔQ¢‹â≤koùÖf‘¬w‹;2õàWh®ã`KAx‡"Áäl»Åı§ıu∑ÿs`‡âŸí£, uã*#M√¢ÀûºªsDæ'œ˜wéÃ∂/Ì‘õI◊=aåhúX¢3f&jdÉ≥0ÇÕ¥;AÚò– ïJ9à[ÖTEå&äΩe©‚&HÎfãTﬂ;úhyhûµ—nû'~íiá¢ÓXnÚ·C1u˜‡ı·ŒÓ	9<:ÿ˚˛æ⁄?>—…©wéRtÆ‹jÈ˙ò∂≥ﬂˆ=Œnªº4˚ÊKm·“t◊Â%Bﬂ∫˝V6_œ˜OÍ‡¡ﬂ∑Ó%V#PÙw)^'R†˚‘ mr«·VU]Ëc¢·}hM.XÑeã¥ÓÄrªtÙjX¯U∑£'îÅU¬£(ø”ËxúT1≥4˛…!†√—JÌ˜N±ñêr-[ìù´ﬁ—≠°Ï^q⁄\·\∞ÿv≤±‘Ÿa‚ÓûÁ≠õX	*ÑT,Ìpî·èéï7€˝û∏õ˝ª,GCåz'8ŸõR•7®LVâ!°°≥v∂9(Û≤ˇò:ê®Jœí<˝Î+3JŸG_√j‘üÍ~Ä≤îÔBnxæT¨ëM%÷ü2°·√.]ùõBÌ °c<VtEz«™º‚j£u≥5¸Òû@(ÏÁæ!& ®BZ
§uBÂX*œÆÆeßñ4UoR‹ë~òøVb∆vp∞N{&»Î~—†pZ¸Ir ™≥ÏõıÌeT∏î»4j“Î<Æùâål"…ÍÔVüq)N¿µP7ÆÚπ*î?ßÅ⁄‚ZØÀ‰e—|∫†÷AÅMwÎe«ìv›lÖÛ„y˝6ÆÆﬂÕmSøóI:
‡ívcg‰ùÌ∑ØN‡¥≥s@énˇ∑ù◊/ﬁú¥Boajb^å	§æ	k»∫º„›:É–¢j)ˆ:ŒGP>‹û!IcØ…L“†¡#Ë&CΩüägÏÚ⁄Êe”tzé¡~*;ÒBfQ4MÂÏˆoåUÑÁ1ÀÇ{bï‚~ïlb˜‡Õ…—ŒﬂôDÌ≤¿Í∏®∆˝0£ndOÎ®S&PuÍjÙK
Ë]™	“fØfﬂ:ÙÆQÜ¶ÁE•}Î^|F∞—Z˛>¨»8Ô.úÖ1b«Mnö"ê9wòV≈Ìı˝L)¿πèÛπê¸≠…{Ç∫7%˜Ü‚ﬁyÍ]Sˆ˛kÂıuú≥;pzh⁄Øáœø‹≥ÛjˇüÄ’ø}ÒfoÁ◊Œ‘˜SÜå6ÒŒπOL@ŒÇ·®	Ûè7˝æ|äÃÆ(ÚçÚ]|û1ö?ÒNôª‡(Ã–Inò‘¸%zH<sè}8z?)’èùt‡•˜zı¿≠]C•”
wlIìKC`zôR_ñ⁄∫[ØÈjôì,çN˚ı3˚ñ^A1Z≠”;m˝à,∞™œbr.S\’Z%âµ	Ÿ˙éN÷u≠-'ÏHã\ªê±å€≈'ﬂ¢ 1oÉÿ˜2Úr§·Ìü5ˆï≠•—™f`å˙=16¿Tﬂ‰R˘ivJ3ÍÅwÜ·Û'¸O—••G2/BÒ .?I¥∏sjFºsÏ!<¶ÈWMG®WGπÛyJ¨ó©ß∆„v⁄48{:ª†£éí¯>ﬁ<
Œn∏€Ò‹Î¿Ó4&˘”Œ‡* Æz¯oßŒÿ:í’ñÏˆ«ì$ÕﬂÖkÈ¿|Z,√0cE¡ƒ∞“tJDöWü≈v]ÔÉçP‡wRryqç<m,KE ¨è”`8MSÙgÉ!>ÿ’ÚN'¿A˛ı∏ö¶ıŒıja¡@$∫ﬁ–∆ˆóæu´1uümZÍâñ/|?âœ≤¬öºΩ£KJ}rÄ’w‘p±E=ô˜,3qG≥Wï©÷IWïôÆJ“˝}óY4NSA∆πﬂÔb≤'v/πå+S€jñf‚¸Ö∏Ôg,«H∑eì}nS.—∆ÅPjíü/º4Ùb‡dY0L`n”k”ìÛá$R[/˙sV&ŒTSEvíúüGÛ˙⁄â"˝Q hÅ◊é2äW:˙gm`ê{A$prÇN»"?
Ä^q—-≈‹,~‘7vkÈπE‹º€ÑJ”§EíínÆ◊OéwúYÍòÓ6´œß—èØΩÙ«ùÏ–˝vì˙öM	9ÙŒ“’NÛÕ‚g}˘¯Æ?Œ—ﬂçíÃ ëj¯óx†J=√˝‡^®=¬—F;Aª¡~¡∞~Ç1–{ñyøûQWâº∫(Ó¨´VÖOK⁄{0Py@YrÀ1øF”0%ßß\˛æ~K# ‘D¶¡,;ß,–‰Ô<M61≈Ü'ééøàì£üêΩ–ÉÔ/¯qﬂÿı¬+œ)§•îøﬁ-ñWﬂkÖ∞EÂ»éZ‚»≈ΩKiÄ¬YXèóöuﬂ’e#˙p$9«û,ÙH‰ù|á˛aîÿ∑¸6úì„M"ﬁ7uák^;§|CO.Kù¢0Y#g.Pl?q•BkC\¸G,Éº^Ê{O+›Öôí[å_+ı}#ÍÀh÷7º
/ÜAx˜ûπ
úÕGÍHõœYêÛQó'ﬁi_l˛ç¯B{B?Ö1à‚@¡çáAa»,œµ¬dh–&ö”ó®G>JŸLç'Te†˜Ë)#AEKçFo~°BGˇiù2ΩÙˆ7«é,ó/Cã‘Lãñ7A£ÅåÏßX˘Äü∆◊p“©˙ôòŸs/•@Ãºû Îﬁ$áAˆ”ò,Ç`71˝CôLà›¯Ö≥@∫és/üf‘Iô¬¿:£ßr<rdyÖñHÁ9?\l‘˘Ù˘€t:I»ä‘—∫ì≥)–Aa¨@W˛}bãΩsäÅ∞G>ZÏ4{M\<⁄Å/öcc–C©9DE…s¥a<Ç?±À¿™ˆ˝óÃÎö‚F #TáˇiÉüø+ª,LwùÖ§–†Òì¥ˇ„XrLÑ¥¥•vÒ≤÷öA¨$bÁVï¢Ã™ÆŸ‡(/ÕÇØÜ…h®bf®›§∞∏Õ‘ LjÙ±∞07Mä≤W·x"¯e.ö^’-+#é≥l]UuEUI	∫∫R˝üöºLÕ⁄(ì⁄¿å`”∫®nÖ>Æ‡@ÿ3◊l ﬂKoˇö¯ò√(ÕíòÁás‡Ç&î$˜3Ò$¶ÿG‡>›X´kûBòK;œ*c¥æS_´r-≥⁄æ≥ßmçzˆjPå LáÂ±ë9Œ≤ q0C^˛€ÅıfÍ6≠aöUº*k>:€^~˚ìΩˆﬁÊDÎO◊0É'Iã˘€Ån¸ûfp÷≠,å∑WF‘M?'#/MÖïÛ©†wù¯˜ÑsôF∂=Qí=9¬8ïÍéjÑ“ÔïuØn⁄≈ÒπŸ7z‚X∏ëååÁ”„$Õ±©© ﬁ‚s±@úÌT˜{¯wìﬂ∞,ÎYC9ØΩ0#àÚùB¢pÑiBã¶?añ¥zø|nãŸ„Ê≈î8$Fhk'MìK4û˝N›o<¸¶ú%¬è>Û˝ƒÑ˚Ÿ≥I•µAëjxäµÒ‚épZøáY]}Eo3ù‚‚PIKÙZ‹À
ı–+Ôxˆ∑iËÎ‘NRyqíéùÿqÉ+∞éÖΩ¥+ïÒäÁmÅo˙¯√Ö9˛‘ÓËNUL^V5ı„ƒ∑QcÊ≈z[3^|°^òÏrDÜ 6˘¨ØØdPà ÚhD71#Aå‘Ó—ïr—RyT™∂4F&∫a0MjÚ≠EYdj≥9÷È—¥Nuæü≠m
•ú=Êıó‰%Æ,
U∏v˝)]>	Å&¸É¨^ó®z÷5πb3úA dX≈
U¥…WËA˘;ÆÓ˚•/jz…S¢„=BI=˛ /§y"Îß«dá›”/pUø˝˜±”–◊h∏…ë¯…Z–O”°á•˜ˇëﬂi¨?8üïzÈ-ÎãC/ëZ„nqO˜Í˚∫O7Åd^Óïâ·æÔsO $ºíövﬂ¨˝Ò√xD•ÑÚù=q´a “‹K>¯0Gπ:iŒêﬂ…ﬁÌ_Ëè.ÂSL<b(h7Ω˝ãﬂXeögAƒC≈s¬Ôﬂ˛w˙Éµå”$
îV<g7Ï]¿∂{i®¥ÔQîWQ®"≈ıû≤ÈﬂKì	‡f|ÎÑ ãÖﬂ2N	€›·Ÿ˘¶6ﬁAµ›h(¨9∫ïO4®{M0Å—˘÷…∂Óôú˙Ÿlí.-òπ˜%°Ø{t^∫…!Uçaí!h)∞
‡t[¨Å=OÅR€Ç0Ck˘&à_0Ø^¨ÔHæœüÍ^Oí_H∑;)æ“fâœmåsN ÈQpÜ-ıÜ˘ >ú˛ √µı›…ÎW{·≈ã(¿EØmÚi_eÜ`€€√tﬁö'	•äV»∆Ù™ƒ/ø]Ü~>_…*=£zà≈·∂)“2∂7∆($∂íò\
â¨ñÅ†—“EkY+S¿)ãπdi›4îµbeû—Á˘≤ú¡¶ﬁM∞ÂJ)#/Î&h‚\|∆§JCaõ‰„≥Z˝7ä;¡Gc≤ãÎ∆<&º≈lu(‚yˆÓoVzB’‹∂æÄNáA∑õM«=í0ô{:—ß[÷ü}OkXÏ¡ˇÊ÷3˛ÅkoB√‡≥GX[Ô®5¬ol)	ˇas4ö‡ƒC1HÍãÉÛ é¬:p¶ÙîõÅöŸ‡ ˝w9Èc—0∞ì'~˙?ˆ˝”;Ù3¬ñk÷‘º2∆¬∫ì4†á©G¯A[ŒçÓ¶5œº—\Xä¬‘√ùÕp…˝nå≤~CrQõs§[q∫+	≈¸0?ƒÒÂƒNrõ‰ãôƒ6nﬁïx9„˛Y4Q≥\u+ ÄŒnB£0ßsÔMçlx£∏œèupì?ÇµBñBU;πÍõÃ%œ¯Ï XTOPIsñmÖ÷ö¬ﬂjˆJ•uÉ_ñZ¸eI”Lç∆îò∆IútD’t'hÆzw\§Iå:5mz1ö^T"@&ä√È∂‰	=¢Ú„Nö‰WÁ…≤!¸Ä◊› ˘8´≥yê[Ë«4Ä
1!≤ÉôYËÆ‡=\ê≤¡ëe˘5r{24ééúŒºh¡é‚…ˆﬁ+∂EXüg»6õ<]¬ åÅ˜~–ÑÇ˝¢ÿy`~b/i¢˛˜¢◊^>åΩ´ÆxüÓK=≤∫
∂•[LrÖê´l√h¶Z-#ÉÒ„œ»'óﬂ3
MÏè09∆Ô£ÁhsIbXlCtƒÉÃ}B»r≥NPDG2g"ìtCﬁÍ]˝÷∆ß˝ïFY≥lYãZ¨ƒ°£HEœ¯xπÊà÷Ç«„uLZ∆´ÈÅ¿É≠ ßo¨8'#∂qjûÏsµ¥ø
MØm`•°SŸ/•¡\CÜ€Ñ6”û ÏtÏ¿›ú˚±*^éPÎ*ıdåi)∆W˝µÜXıô|VA´¬ôkvñ0 –’3ûlŒdc«i∞äœRO¢R´∆ô≈™Q^˚6û…¬¨ŸÕ¥N¬¸˘˘ëSFgiN?¬´qö¡˛jb`˚ÙÇÊ¬úo√¨£CÙà˛+Æ¯Ó›hS.≈BßÍ‘ŸÉ)‡'q!&Øu_¬¶CªöŸ!ªfR;@¿D±»îƒÀ75Á#	W›ñ ÆºúF	´Ò±}ôs“¬=nm≠ó±Û~Á∞0ù]RZùJ´˚ö∑ƒ»÷≠«ò∏ïßyê˝d8EU‡4ÒØ€qÕât4Z[çÂ√≤_Bíg:3I◊¥π£L’k<{1	l•ì”ƒK}ÙW0=ZòKÍ∂V”+•©D|™YcçÔ

◊pUﬂ3Ω∆Õ)Ùè{e¬æ"uç*å/Û
¸ïG#àÕCQ[ÿG∑◊T£ä‘<¯nzGÿQ§ßü”[¶
”âÙ∆kvœÙ
µòHè&"`ÃπÌÇieœ∑
É¶@≠≤ª∞…_µfªìæbÔv${Âíw´Dê˚D~⁄ï‡ï*⁄êºÛã*—+çt {ÂyG¬Wﬁq!}Â7‚?tzEO˛⁄h◊Íñs≥XEà1≈á—uò1Ô¥™Øç…”fi	cdIßóŸŸ‰ô+0„%a~.Ã≈'åirá©ënÏ%C®C¶”§¶SÉ:~([â±¨Iyƒ˜roiÑ91â,j£øâÖ=®îÅ1Ma5Sgì^Ω§=T`#ı∆¥Vv$ÃÃXñÂSø!◊Æ¢ääö3
¸ö¬P¿ìôB[<bñ…Ôk*»ﬁòÁ∞RÇ,Vëª©¿˙/úÊ$®ˇ7A<öé	bÜˇã’çˆö
U¥-hÓˆAVRD∆Î@]œö“<©?M√âÅçIpîÖçòOîRGÍç∆Ü¥˝Z	~U¸˜2†aFgZ"EÕO:€#°e≈-e üqêè_xº¯≈ü˝p∏Û_≠˙√´ùÁ/^øÉÚÏAQXXxè õ&ΩQ/‘`å†ä†è_Ã∞¶å‹ÙøòAølÜJ} ƒa@Õ◊ËdNh¡}ø[ñkM~M˝«e≈œ©)Nd/J}à´QimY√ñ¢≥·è9OΩ9dÇ]w˙\sL‘R˜,˝öbQ®.ˆ¥éëªR•Ò§©pæJRC%!«˙≤›éIKkL&QÎÔ]“Ÿ∞8V=‚¢»e”Ÿ¶kd»Avﬂ‹k¶Tlås£∑~•H}&]2Æbw»Ω”i‰•˝x:Œ†'ôwPO·ú.På@Îëﬂ_z˝zÈ.Ú›wõ„ÒÇ=◊≠|Õdáz¨÷iÑeıÈPÁWíÙ∂\ºhSìéƒÖÜ¡_[£√ÍR,V®_ÍÊü¡	I⁄&*nJG‹ÿìPõÑ‘uÒ∏™éa€†:°Nvî1DûO–õ{	"¬lj!–j
 0ï%Àr√ßï*ê÷{*Ô.RûCcR'y“Iö‹…8'	@Ñ‡X±ÑßS£dJìŒÛCEMÃ4âës”*úå˙˝>y}∞w@3¯Ì‡W˚…ßàÇ·1J:ÚbK ƒÖó∏<%]ºÑˇsÉ”È%<é""wìËè‘ı"{PeÒÒŒ´∞•v^}¯„ã˝oø;9˛∞˜‚ÂŒ˜ØNäßV,>y3*P7–ÀBˇY˛/un|ö[¨çGRÁwÀ
{7√Æ˛œ¡5πAﬂ\ˆπt˜^4cï}9zqºˇO;œ·Î¡—ﬁã£∆≠\úuy±<öälY^·+æOVåiN,¬qøN¶YÄ˛IE`5√ÍÇ9`›=Fîhﬁ¢1gÀN‚ìd:—«ÔZñÆañIü°6–LÑÃ,r	¬#]°‡~J+bi¬ñ¯LV≈§@∑‰÷"L<MΩÒ>º‹√WΩÛjzÈ˘Òp<úÚi¨ÖhµhÈÉ£Tpí%—ÔG¢PÛƒ%5UÃºÊ0”îlRÙf∆“jGQÒ…πDh:ìb™QÑ@R%î7äaü§…$I©Àv¸îÕÀd]èŒL›}`Ç¬4sœl∏·∫òÓiî,ƒ«Ê4F=û§0˘)úƒÜ#8◊Ø,/ˇúti˛Û ÚÃÜ!(_Üôá(3Üª√ÆÇO$ÜﬂbËX°ƒ*æÓ»n‚áÁ…“j2¬«∆Ú•˜1ÀkñúbÇzÍªö–öP2Ïh“}eı»>À´Bﬁzp§[h3∑sG}¯S˛.|ÊéÏíìí¢Úî°çRq≈IA±@ö›Ω¯µ{ÁÅêt9≥∂Àû•&ñctŒG.·•»w∑ÓB
áámÿ-ek`Óiü¿:≠¬i˚äin¨ôMÊŸ≤a“ }CËwn	©Âº®∂lHiõ∂{˚Ø¯Qﬂˆÿ'h*{±5∏òÙM¡'ÓΩ!äuæ÷® Ò[ı?ËõEüπ{ª¨Ì»®·RXµÙçaﬁSkË˛]oÃÚ#leL@”eõ⁄‘Y$ªDÏπ˜€;∞<˛-»,•ô≤^„•bIS›(Ú≈f≠(èBƒá¯ô[mPÌπl{aG^Ñ·±‚Â<…aøÎ”Ì/¢I-•0çOãBª™§%±Èd¢¸Ñi3Ï%b˙à$á^R∆[?’››ÛË)ñéç9™áñMá)ñ“g˙lf;>ê	Py—∑¥W¯ªRJö:î\¢≈ç;%ÁÓÓP≠B∂Ô”Æ”°–G‚Â§qfze^í”∂®$të]„Ï~‹U≠-wˇsOx´›.ÌnJ<ÈÉo¢«÷ir’!Ù&∫®"Ô¢è'ã≈ØâûòüeéH–hÈÈ⁄ñ=R6nö‘#Œ=ªvu±v‰UF§K‹∂ç‚è4«uÌkÈ!/íâòD˚¯Íµá65-ﬂ]Je-BY]KÌ*Q%‹Á∞û@.XXT”÷;È<i'ß®≥ ô2»öâ∆Æ∏•=P⁄OûÍß“1cV≠ˇfªSø◊qÈä’Å‘∆˘˘H ¡h§-Ú%	ÚƒÏú∞ÿ›@íÔäƒ†KÈÌük‘°P(m0–öYïﬁHÖÖúË0…¥úﬁÚõP-XÚ^(hö˜B„V§w“Õ6≠˙]Ω}≤Ú~£=¬AOÔX“L◊Y‘£|$›/ø–¸
Øﬁ,~Dƒ(-8î2w%J—ç"•≠Ô4éÆÒ:”Êé»qÜÇ<´4+‡›ŒGJnªEk∫ï÷=bOûÑ„ ôÊ]	'®˛*E¯ÏëıÂÂÂ&É)ª∏FÊmê)~…E£§`¬éì/ùÑÿt*µx‚*π{ã(B~kmπû0óõ^[òTŸ’LÍbP©—…E÷ÖÀºÏüí ãZkyP∂ß[m`#M /ﬂÖ(ìÇœf≤¨dO™ÿÎ©Né2À≠Ô·i”mÁ:â˚˙⁄(CÊ´˚Ê⁄≤% ∂N&7u∂ˇ≥8Ñ2XDA∑ˇ§Ω∏Á6ÜT-˘âPhoÓi¯™É&˚∞Ωå∆=˚;πh· ‡6zT„ÉzÊqêçÓ ãnıcZf Ç§ÀaŒ8éWB∞Õái‚OóíÄ‚6ñ1ı/Z—éâ.]~¬Ú21wQ-5Áô5¡ˆI-'Qg_1ÎæÊîLCg9r0”i†Uu8<1◊PÅì¶ÛîØæ03]}?A∑ëcπxqlÌƒ·J|ãc5†*&ô¿Ã¢´!=7!≤R:⁄…ßû&%ûz)°èEfå¯Få·5LD√Å¶LLY©"ìø¨.´€Õ$B=⁄_iV„Ô¥‹É⁄‡ ◊|“¯ë¡⁄È∆›„ìùoÖ˝Uy°o∆ÕîØ-Ê¥œ‘>®Ò·$XQ˛»Í`3¨6Ó ˙ÔÅõ∞rö⁄©CaTö≥ƒ÷…›˘“Û$˜Oò‘OSœGÁf(£û∞^ö>¶ÛÚì¨GÄ°√OXÏ7q& Òd@ﬁ0Û]z$
hrY‰Bß¥ˆqíÂhgïÙä,Âp¨≥$t(ütÉ´¡&9Ø6…—+ÀÀ=† 8Øáq˘}ë¿Å/ÜX˘ôQõntû4—aÜ]oËëŒK| #Íê`|
å:vå¶æbÏbÍG„Bá¶c÷¡ÜÚ;8Ù¿1)”>MjΩÑ≤òëë–q±…º¨⁄âAóF;È9Iı5ô]J
ıÙ"SŒy^¶p≈1	"ò"¸ïªŸÓ¡æF‚◊F—º»Æ+·œ»¬sÍA[i√CXDOB“\`*ê`û6Ô-c=;Z¶+it9√ET#a3UmÂM©ññÖïïﬂ´ãÛÕ1¢≈h5>)0åò"OŸ4§{kÀu_y¯(Z’ÊE™^,BUÒÍ-*îÔä*≈Ω5]jM∑jXo£Cl£˜jeãå1,õûÉÜK¶Ì.52mS(°ñ
 ÜOãÇ»ÔEcÖÜÑ∫Ÿán¢«=îé›A'<ª>N_6T?_yxàHÙ¸µ$”≥µÖÀÃ)~ø®w¸&|S_"¥Pw¯höüÓ¬`é==¸<ÿ¥´+ìÎ†`1õ2àî‹îQ,$¨-7;î„UÏ|3nV¸4„’$9 £8	A5À3 @ÃÏ
ª;›ˇas˛¶"°$Â~“–XÉ åÒüX=ä»Â1ﬂ 8WêÑ€G£v}î¿Â+vfÏR3Í"UíÜÒ‘„Á?&¶`ciÊï J~≥Ò°0Ë?¥È±¥ê€I“…Ë≈F˛—”ß‘‹¸0:ŒÄDö#‡7TŸEì^∂ÁΩÅN9À=er/æ˝3¶a¶•  rJTò´6N–lÃ¢—g¨GŒ@‘π‰x/É¡`±çÚRjz¢≤muÆƒ·S"#∂;£ î‚i∞”„tø-#^IQKO$Äë›eâ"·›YaI=ÿ~@a'%nz•CªGó“xVﬁí,hã∏7Éú˘/8Zè>ëN]%úæ£úíÉ«ºdêÛ¡πeáC¡©:òzèùL‡_ l+l∆t|áˇí	5!∆—Ÿç0a{!ñO”>p@x¯ƒ2,˜».å¥°ä .ˆê©FSx3œ¬(YŒJh>VÀèS1œ69Äû£
nÇG\Ïz•hà‰K
CHùOœûf‘õ3°±ﬂti'1òYò–⁄r[≈áIwhªﬂ£Y`çÌ,/vvìºkôëÊ@„a#R¯1/öoàªÚ• 0¯Ñ©◊Z¬WK}˝‚Õ˜æ˚‚¯dˇıŒﬁT èÎÀHÒ çyª·ÿÉ7)º0√äb®ñº≠ÅèlÆQ@a
zÏ îQXd•ëœÚ”3`ß>Ÿ¨4¯±VêÄ¬¨î™E∆ÄÃX6‘V‘ÏRÉË,@2üÙ¯Á0Ó“bS^«ÍÚrO©ù¬k“û,ZÅ4Ÿe¬Åñ/!•¶uñiäqYw’-›aÁ…7US»∏≤™Ø‹3	jE∆Å≤ Dm‘¿›V4¬w=KøN“‡m ¢!p`zªnAæÂØ9m°3u¯^[äÓ∞∏ºrá ◊jt $åÅÅ˜ˇå@_ÀÔ;öƒKfÜ€8&¢^á≈)0yÉ—
b‹Bˇ˚U¿µÎü°†Ü¬-©¶ï˜@˙ísÂìf8\WßtkñÄù-œÚxÒºúz/ªéáDrå∞Ìπ¬øÎ]za]L.A9”qwae,Iü\Í´Òl#‰≥Ö≈≈≈b„6jho\‹]+	‡Îgª"SÆ¡E»óùmÜ∏¶√(XUs”—ÙE©»ù„∂˙ŸÂ†™x‡II∏Êπa&⁄{ùâ"]i#jß2//A‡>ÅÔÍú—^µôãöœõ)®±q~gÊ≥˙Ω›ÎÃÈ¸œtKßÍ8<è1œa†Œ∫2âÊ∂ZA "|VﬁˆmÄñ8òﬁÅÈ|7eä;™ıPM•õ∫Ë3¶¥U5.ø∂bùkéÊ‚récVY}¶mÇEë‰I™k#j∞ïmÜoÓ°at∂7ù¿[ËJè˝∫X˜n2πÆå’À¥b€Ì√KäquÉn¬7ŸnÃ@Æ\Ñ`ﬁÍGätv∑>
D¨—M/≥ö6íæ
§QlƒT√VL©/†#$Gå°JúÁq¸Öªè”ˆ=‡àI
b˚ò=˜‚ 
‡ä»÷ˆ@˚Sá£t»î¬+ºÑ¢Òá⁄√$ Îòb:…HV÷çVlW7¶Ì8/PÎÉ≤›"…ºu8NR/Ué,Lπ›n8t–ùıÀ…˙⁄àEkktårÄøvhTCs~¯N2fŒÎ˝7˚;'ﬂµ¬Õ)éﬂöÈìë„?®ß»Ä:≥Òf˘uçDÁ“◊urI_7ﬁû	v„o4Œπ9‹˜[~t6˝R∞FÓï˙[nHj“Öj∆ Coµ˘X–˜≤&◊‚JÆ4òëÊíË~!√`ë√Õ'œ=ˇ<–€ø◊|nLë;|‚©+Œ8¢fT%_∫u©.v´Uw∫é∆-nµÓ Áí≤HÆı„ÀùW';hˇ¬ÕÕáÜCÓ|{–`‘ﬁZ¢„v7 ¬f∞Ce5?étíQhä®jÁ†ÍflÃ{ãÆ’ÙÎ…ﬂlhm√†7-`á±î√≠‹‚´¨mj§l‰JŒê™¸)¸3I|Z ´è°Ä∆s	Ö©>e‘!Çt©·û.R8©IûLséOd∞Ô¢MÖÇ©ó‡SM˛≥™∆¥ÿ°•HÕE<
#ú6⁄iSõ/¶⁄›¡Î7W}Á»j¢Ò;˝¨!’ö¸Ω˜b»s¥vµ;;—Ê
∑æGZ˝5Ü\ﬂC–ı}RÏ}E[?—:«`ﬂŸ6ntv%Äπ∑"πµu¸µoœ[ô‰Õá&ª>Y’~C=Cé±¢Âõ-ÍIC»ñ’n∞—ØﬁP¯8'mÍ›∆Ì˛lÈ∫¡rtÇ*áY¿5ru@⁄çGW
P÷ñÓΩºéîg´ÿåZÙdˆH#~Õ;›üƒÊ´>IYqT§’¢puM6Ä€,°˘¥7«?'ãôﬁ ÷8ÆR<·≤—‰%kD§UFÕ[uÎWõ1£˝õÀﬁ•7g5ˆó‰Ó÷-	≈#RgÖm™\çí˘™máÁ]|˜fê“.0%£∞≈Ó§
`≈±∆’lP-ïvh∂[±*=‘dø∏FSJŸ™©U_ölFw3ÃöÒ_èyÊÕ¡—ÎùW§ã—∑ˇB&U+çQ„ﬂ`lY!cS∂Ω†p∏Æï[SÊ5•ÃiHπãE[`É≈ÕÜÚÿhCYøõ•≥h!j›y†jEë-,+•
€:95ö⁄,5…%ª‰$ˇmŸj÷…˛√iÍA≠4.÷mß¥U.·∑FÎŒ'W9„L+S√h›°!Ã8’J‚ûºﬁúnUc‡rNVÔ∆Ø˚qïhÈËˇÄF4ºiÏ1ó†1ÖXëÁúÛ∑5õL0ñÏ¶!Zö±ÿ‘åméÇ¸î¢wA)»ipôwöu„‡qÏò‰V>≥àqÜ®∑é÷'ÍCEs§áaõ|ºó´Ø£>ÿ]l;€tLvhJ›®mΩ[ª∆ÒsH˘˜iVx}R£Ì‚=ÆËà∫h«π%#N•msŸ±hKúÌx˝ÊÏYx›Ÿ¶ÖWã¥éÚ∂˜Î±j·ÂÍbÈl›¬Îﬁ£Ê¥t—∂‹'5ˇ:-^x›É’Ø˚¢Èœi˜¬Àï¨[ÿø∫g¬ví¿ÓjOk|`.≥W	:'˛"„Äcû‰ø√∑öÆ;√∑˛fêZ÷·:˙ﬁ˝Æï6«Æµ∞@GÅ?ç§'eC~ˆva⁄s‘¯5é\√”z•Õ‹Õ"ÿ7S™*™Øa¶.d†’KÌp∏MbTﬁ´∫vºsÃ€Ü÷:‘ r≠ªCy{¨ù5ı=ﬁú´4‘˚Û÷hmsµÙA5Ùv (û€fúë„È◊≥ıhTC+‚ YŒ[‘‰«_-ÀÊfÙèØ£û™S{´“mÙÂ]¸‹#°eL∂[i9ÁWı ΩzW ™ñ·?ç«3zÃﬂû·˚ƒF¶}sEÿté≠ÍAÿ/>»è %qÜ
§Ó’ªÖw¨€)ø¶l–ã>·ÈŸŸH‡LéH?Ù30˜a@˛Åî?lJ?,ä_DÔéº◊Ï;dY.T˛2åΩxà*∫Á…U+*ØÅ÷jÈ‹6h:7ô¬WM$ÆÊ%lœÊÇOlÿﬂ•åJ‚Uû·GNÛ•≠8¿Ω8l9f\¯Ù√'˚FÈGO„é–û˜:êR’l8q´ˇÕda◊è"ÉõeﬁeÛåbñ£ådßßò9üU¿$Ÿì√ôeâ6Yd$n®πà‹;œúK‰A≥≠ò!›.õ&û—?≤Ti⁄7Ú®H[œ]4<‘-¢ìç[úßTÛQ›ÕëR&5‰π9õPº+Ñ<π¢∆ŒØõıôDÔt:”z{Æ+‚’Nû®™)È:Ø¢≈ÜeÙºQ©cØ¬KCêÉÄ¥7Ämüs7rmÅ_ßº5§º™/ÖΩæœ·pkiêù`òg≠ï;6O¸Ôanm6p£ˇ∂3)0"–„˚ÿ9á§≥H§"R˚àÿÚ/Ï =4ÏÖYFqáéUmk\É†Ö˛iÀçTú†øY[“‰°>˜Ù
WÙ;Nâ÷˝>‰ê∂Û8ó‰r«πloílö˜ˆ[«É9ÔﬂIòQùÛV¨ò'#{£™¸Q€‘!NDçW{¬∆Àï∏Ò∫?79é	ö©/∑á∆Ç\lã<ú¡¡¿ÿLÉx9Üö√˛VÈHr»oÙŸø’GÓÖàDò»ß£"W"òá‹	‡˜IãõÉ1≈Ö>i∞MCköIâ’ﬁ4˜éDÙ{£ë˚fn¡FwüSVt/ìjè.j6Ÿò~là+“FÈbä¥’TﬁæYTù7*Ô,J—F3O8å1#7¨ ‰ßiP€(uZSå"Ô?∆¢IˇIèrM·üÿŸx‹œÜiEß∞‡ïpóµ™€Õ÷~|ÅJøÙ˙uÇg¬ì¶Ï&„â_?ù©ﬂo»4C38˛[I–¢∑Ã üdﬁ›ı2ÓÁq•„®∑>
≤È8¡˙AÍ”Ùl‰ò7çfÛúfIxöm√Jiz#X‘aB”©&tc~£™Í€d·÷Ú8ê4h≈['ã¥XÒ≤º≥}§∑Önnö-,¯GªÆX@êoÃ≤Ãùh8¬!∫»„!Lø k^Y‘-Ry±Î‰Ö•™ÌÖ!µ!«CtÆ§Tï!<UÖ~N∫1—Ú?˝§ñ1j≈w∂Ω¸ˆ/üh™Níπ&Í$˘ΩN”¨[!dÙ>TÃ‚‡o¶≠í˘B·R,è*Ω{£…ÄÍ∫¯%dÔBÚ¿—Ïlø
ÅÌ[¡eÎìh∞“=„Ÿ ÃhvI√x4∆ÕV@Jm0§’≤‹ââfs1ƒ„≤¢MOMÉΩÆ·¥/)ú+5ΩŸBf4uB3ı¡Å¡oL¡f®«ﬂ÷ÿé78+´úÚ∆"v˝V∆˝’Ì_Y^‘Ów^º˚¯À6ì¶Y‡yYˇÜg 3dﬁ}ÃÂ„t„ò7'Â¥5hˆ®Rài‘Ã#2√9Ÿu]v‹»B≈»∂*·l«∫s"*ïw…–Û=^[≤*wëeB+À}˙îDúºm›1Ï¿&““ﬂ_¨°(<Ø_mÀÎK’lïÍÕnÖÚãÛÇ5ÜŒ	 ∂≤JÌqm¿·äpwØñ´Å◊™b0tÉ°·*πì1Ø>N„¸Ü–nˇút3;˜s3~R‘âávﬁ∆7◊&ÔÆ/;{‹VıæÑ∆∫ªÉ°›µ™Õêﬁi‘ƒˆvWÛ4üà∫˘=å‡a <é‚˜0ÇB¿næ	ØÚ°ÜØù¯P®´ºTV]~2V™˜˘DN˙bLvÄÕ∂ñ§€Ú—`Ã™˘;’“q1< C[ã)öá¨J;5îqÏo“œiriÖÒÅÁj⁄ªu∏àﬁìSçº≠˜ñﬁ≠Í‰a®ê~\m:À%«àbhZπÆ⁄†÷l˝1‚·»
B¡›¶VWÈd—ﬂ"#ÅXÆ‰LÛ
K(#;Á¿˚@∂Õ4Z¯—™fXåÎYååP¥.ã÷#Mñs°[”ˆ∑ÿºıøá{o)¢D{bBÀ&…î∞h5èx¨/uÔ/õ–“Ì}háÕ±¥"~ñ/ﬂ„$Õü_Î:›ﬁ±ÚVEπáP^|≠=a(Ò®OH{-ü€61èŒØÇZWjèe£â∫TØc›Û0i†9¥RZúåKio‡g$Eéˆ‘¢`¯ì§ñíﬂ‚Ô- cûñYTgãŸ‚°j*K±ÖÌfß|‹\â9Ä÷åQOüÕ∞H˘X}*¿≈fË>2\ œ»Çá7˘Ìö‡96 yÌÖI∫DÛø£|çÃâ7”Ññˇ:à≈ÔQ®¯πa!Œìæy·JÎq=©{dœm±5—÷N
Ù^rˇÿ¯ø©	”6˘3ﬂOOË¨ø&8¿KÉ≥ß≥∫/ ÏÓ>ﬁ<
Œn∏uÂÓu(>›$⁄\EŸUˇU®ö
J¨ñÓ˜«ËÍ€¢pÌéj&^?Ãº”#¨√å{+ÕBáµgë˙ÿ-hT2(ΩÒ;)9åº8åFûñÃ*Îß>Nne~6‚ÉzÑOI¨
±j¸uÙŒ=*f§˘ÕBaéè9Ó'ﬂO¢ƒÛµÆÁêVüú?¸Åt`–æ?ôFY–Y‘ìâôêçTÄ»V¶Zg´ÃtpUíÓüÄËª˚Û Ó÷Ùw1ﬂésã¨©2ª-&J##ÍN23√@ãDI»2ó5i—´“&öSÀ±∆Ú∞ä¡^´)√tC≠Ê<v:ï*ÿ®¨=V√-Æò∑áb˛÷∆_ÿí?T¬÷· Åhæ	‚—tÃ\∆Ò\‚±sâFîwì‹uŸÃÌÁKû1T36∆ŸlBûx.$‡˚Mß»J„ª»çÁE;öQ~ÃÂ	(K-Zã3¢+«
N\bCË@â«§«ík_™èÙ◊‡W-v"
KSVˆ ŸÔ»†bAO®] ˜€?{—(ŸÑ63‹X*T√Ñ˝ˆ%	ÒhûÖCÔˆœ∑ˇBù¶p©ÙäÂq˚¡Üó!,s\Y&m‡«’«a‹øl ó!g¥sŒùòWJhi"|SpN,˚0.¬‡≤€unXµGV7¿ºXA9gyŒîßï]|u≤÷º„°Xú¢≈˚>Ï-@~ª¸{68cø;å∞Ïa4@•ßµwêe"Q√≥ÅoJ≤ .æ•&ÄË89˚0å'?h∂µ⁄(8 ÷ÆnHàµR^G©Œ¢ Êéÿ7ÑÌ≥u´Í?Zkµõ*®Ã_ZqÒ´Î©f€⁄Í∫
X[ÂäúÊ∞ñ§fôû∫\≤ŒrahfóA µÕ ¡-PpÔíkzÑÆöG©#é^KPØ;BzIÄ^b#mÜƒªO¥Æ˚ƒÍz(§.´Ø{·ã∂up|Æò™≠ôƒõzrä‚ﬂ—ªà¬∑G…Fj—≤ãœ¯eœHªX"≥jÜ	úÙÏdÓî…@r¨ZÌ÷v˛Cÿ¨Q‚„laÂF∑¢4Ïsu£!⁄€ áÚW3ﬁ˘%˘˝ÏI|€$g˘≈LI6˜gOÚ•!0%ônå∆X ∆:¨JÊÌ'JòËîhº–œ†T◊Õvß~Øs∑.›es”¯ÉÒã∆\$æ7π˝À&	(~)∆S‡¡ã±†/	5J¿_‰Iˇd=íè:∫Mıˆ8f˚\GåäÓH>cH44ºØñπ'Zòﬁõq§ı°õ◊√»/+üS≠3&Úz°S)Ç˘§Ò.8^Ü«›Ω≈w∏’#	¢c¡≠0æ˝Î0¥B@∑Hıaí 0	Í[Ó¶/©Îö\Ik œ’ìn;ñOZqŒN—‰Y÷_÷aOê·hÔ"∏Ù¡YWôÅ¡Èyœˆ3ˆ¬R¥e€xbPP≤K:Ç#e)Po!Z[Í'π^E\^Öá∫ˇB-Çz-ﬁV.˜=Ó˘Œ4ªuú•A6⁄Ωî‰tiÈ
Ω˘∫=ëO©+ùGÆ®ù"™jºG‰1öKßh∫î.X ÄSf:j»k√QÔú±Øí¡ÿÁQªO5$E7rÔ”hÙ„È8õŸÒŒße)}∏Ê√Uu◊≠rˆ6Ó¸øæúæó˝ØÄó|•Ò™XZ>C⁄ﬂ5˜4ÖMhàNâ,ëX«ÅóGER≤o*πF"#≤ÓP˜ôô7˝eC√î‰ò§Îù¶)†v05‘Ìø‚,ﬁ±ΩíwSo&S^p†êª»µÛ8”j‚ÀÎ—Â:Î—úq‰RÚ àÍ⁄‹•%ÚCô=`ŒO ‚VÓ/Q|ÃQ∆√–É‹ƒ1Dg<ttKHG@-uêÅ<ÆÌ!€Ù0Öìá4&H#	’YÅâÑﬁx)<¸9 Ä=LòÚ<˚k‹X-{ûß¥!ò£âøZ§¬÷ A˚ûÙHÏ!Gºê3Dy?MC©8¶¡.Gk/xÀ^&OQo]$[A≈5¶ﬂÏ&¿§¶·8πû„Ü∑`Aôj]UG^6ú∆#åÕ—T\©H6î•¸Eµä¢‹ÒEà§∂≈Ï=S©„H$^˚b«˙¶°‡òÓãy⁄ÎÒç>ƒÉ‰–õc$∆&¸]C·ªÏ»4G´á‚MC…G¡pöÕ3)—‘bÜ‹3Oã≈õ¶ÅæöÑÈ\«_ƒrk3|Ö¨XyP˙;’•ÅÑ˛&Y»` F» ‡˚	ˇNÒ7µ-‚ä°õûÆºbqïEï∑ R≈M{ibMïÖΩ(ÓîeÒ{EÎH*lL^à{Rq|©⁄À+ñOY‹Ny´,M‹ll]±dîˆ⁄úJ≈Í¥ó[.ó≤T∂¯nˇZih±&&X¨iÇÀ[“ÛõÌ+á‘>Èû‘<q∑a ≈¢êF±º% ø©-ÌΩfA¡;'A:ñW)ì^ÒÓ ©Øã∏W…•∞¿iW;_MLf¿›WªÍïû),†jI∆√MŸ  ^“«è`À[_P˘TE(˛ì¬[¥%V—y⁄5Ú@ó∂‘|›d ß⁄ M®·~°2“ÉIm›¢í_~—ïQsh.©RL£HÖ,IÛn◊ÎëS≠›_ù-ÍÁœ7„üÀIÍz⁄vF…N;8(∫ß∫g™√i¨ÓgO™N[T•:mìú´„≤pYgë»’”fqïSΩûjü0N√[rπ˙öøA…xÅ˚ÇgïπVÿÇÜV?!ﬁ“÷1KË˝] Ï¢ä∆Oïe¶Ωvs6=ÂÊèè_ÃÃõ¸çîŸ∞õ-~¨µ<ñ©‡ÈåC»8ß∆Ogá—4ª)œ˝®3y\≤»Õˆõ‰"ëòfj˘KU/Lö.Ü 5òºñIM<?ı0Ìb6ı"z,:Mr4¡·£< 5·I’]Î^RÊw∏Ω¶CÖ#LºP÷ìœ›/„Dö¯˛òí
˝Á‘`ﬂúU•:Í±xfJ≥dSœPø∫3t™”˛\—8–m	›3öK^[ÑìÅ£4Îıâï§—J∏î‚ﬂ¸å¿5√«9\ÕIPoÛ®FÍÈ1M÷Ûæå√∆™À¡RíRWüƒ”´+ã
wÎ™?c56DØ<“Nù^'ƒB*ƒÖ∆§böÚFÕ3ˆø[yÃ'Q|ßì:í~âõ@úRËRÏ7åæ≤ƒ›f∞oìF[ô´j‡éi.Lö2zmPñQ åºz“.˜`IS kı·§uT¶1©˝‹b"¥>Eâwö%—÷BúÂ∞ﬁÛò¿“*È”I7…kzCMdÄ~3#∂Ò†MçXÔéÀvPŸùçZbFIã˜iÁ˘4¬VÄ¶˘¯ˆPq7ô
ØÃ¡`†'EπMIûb°∂äç‡çIäÉ¨Ezìõπ©∫Aﬁ? úA˚€u[=]√n‘◊Êçªm;‚ÃpﬂÒÈÒùrøVÏZ?GÖ<lâ•1íG¸π61©Ïh–TÚ{¨M¡?[ ‹ÈˇSã¢~∂ÖˇSß}t¨kÿQòΩJ<™"Dtá(#ÉÔ©4Ú®≥-π»úñá∫eì0VM[ˆ¿:≥jCs4öç∂±QrTî'•˙[gcZ$Á\bf6ì¡ú°CM`Y—y'QáÍ6”ç ËZµ^L1ƒT/«˘udõ∏å`=oe9,YÍÉ∑…SCÅPπníÉ»±±º†óp∏~ïΩ)'±¶/”ÎÀ∆óÖFïΩ.Ânÿ®@t
*Tˆæb˚ﬁ®ŸæÕçä”yõQËHYä•w£fÈ5"‘¢¨å^|CÖÿ15A(7Á{](=e
®Ñ+hﬂº1«v1ä|Öˇù(RR˛óƒV*ÒeíµÒiHZuu≤+⁄Ò∆π-ıﬁ‘sèÜ—“Ï2>÷(M†¨œñ&F÷KK#^™ó]Gxiâx;≈È‰•?h‹ŒyªˇˆÄƒ‹‡"å1y4∂ã2B@¶q8Ùd≠æj∂e©ô‚ø–^ÉL¡ã=)+Ô	´.~K®eó†zvÑê1≥@óÃèë	ç=[4)IÙñàX¢qï‹ŸÉ-eTÏ!K≈„ç¡J<‰ËÚõ˘¥Z5öÁ’[ª·xÇÒ˛*/´OV√8…vµÊF•∏wåbL*!å∂3r]ñ4°Å≠U√¶MgŸQx>ä–k≥ê%ˆ≈£l]àƒeª˝#ÛETLéÄ§.QîÂü*é/ÙÏíßÃ|Óù+∫Qè±d(—%º—Ÿıƒy∑L´¨Pcf\¶´pe‰$—ÈU=)û*ûB—dÀ0&∂Ù*¯Xsû]ÇRPCsvã/¿@K=∞ÌB5ß<Îd¶aÕÌæ◊))8˝ÜÑêb¸-Y≤‹∆›åÀö˛„ˇ¸ﬂ1„5hªÿ<ÃŒ›úÈ^Uq¿NÇ◊5ÊnØa›à]qﬁv)¸˝ΩPycÜpKXÆà´±D€LÿZõ√p’ÙÓ…R¨Ø—´∆≠⁄*mÍ∂Ö‹¨.‚,’ÅÕÛø8†Ω¶Ú˜@ 3YP.ixµ;F∫†Z≤ÌÁZè∫ ÎûßœdRãı[[ñÒ%¨ŒD	´Éµ≠$ÜfîwÊæ~Äó÷ëÜ
.†6Í®hè£tp«\@ooˇ9BØ6Ã¢ÑGóâ–Ë•k∏ÏËÊÿT£%í⁄!kY^z‡W√Æ˘≈J>˙|h”EØÂBòÏ&ãöîkNç[“ü_e|è2ÑÄyM;¯)õU«≈%t»|[Yt©EÊÅÅ»É8¡ƒ…∑&¡¶Æk.∆Û›k…¬{;tsªêK•"={πà[p(B"ÒÒı‘˜0õ8?JiKj∑/ ùÇE»uæPŸaŸ™˜7ùg•8äÜˆL'ò@ßbrÓ&=iÙ¥'±‚≤G(ä˚w´‘ú8/j¶ô¬•=>3ãÀ∫5W5¯\cQdMçM1n*û´v,•sïœ\Öë≠x°;öß°l≤¯#s∂_h≠Ï=(µYÛTS®∫,ïî*∞yj*2ÒGÊÍÄ–ØŸ: ûôk"∏¶Œ6¸á‚Õ»ßÂ#ÊΩÛx‰•%É˚„»À≥ù…‰˛6—y#…∂ES\∂U}˜≤ ó≤’ÍsW·iË"¥’å·¥¢4ú‰œØ˜˝™éë∆∑È“ä=Ë0ºÖç¡¡¬vñü!4?”ŸP’ÆÀŸ˜x]T†˙WD")⁄∏ˆr∑hFWn”#ˆzq¬6€ïêÖÎÔ!p‘bè¿2Xvºó˘íîo+5Âõ<(ÎË¨Ò~ö	⁄*˙lù,¬–P’2ZM∏ct.Zf¢¢J#Jô9ÙãÖÁñí®.ÛÚ.ıÓ#ÄpB27˙ùN;≥˚övÀò†å‰dg˛ˆdât(ËÄ≠_GE¸Ú™K¸ÚØ%∫T)ï!“_´—¶‹—Î·Û¯÷”#…@k2ñµ∏“ÂÜ∆ïßìwnÛ{ô§e(Ñwoﬂﬂ$¬êÃoaØƒM√Q∫åﬂ≈p‰¢XÕÙ’"Õ•
ıè¢œ+è÷òG”¿t4wj∫lÓ”1!_ ;o45é
N;P≈Êé/›®øÅz±wÌˆﬂqÎƒ~&ûbÛ"l^cÅö˙2ovÏRí0áp'dú`@ÿc`%e^B^ÔÏì£ª/ﬁúº@[;Ê,∑¢Åì0Nøãèc∏ÀêÑt≠DZüO=¥”√èqB
™Íod4≥[[— /üz—‚ÄÏúß”	¸D	yªˇf˜˚WjÒ∞—E6ñà∆tECwxÿ8mﬁ◊8çˆÊ5¯∏áÜÁ¡xë≈x”*òBG≠°ãÏ9¡`A·ûâ©O	Rπ "12Lúfryx§î•ëú¬é{Ë‹™>L@DF8‹aËıä¸‡<⁄Î<†^]“Ÿœéßì@Ñ–aTœqêw#U‘N˝ÆÜ!uPéE∞ˆ<I¢¿ã5·zeGh{Y2ï˛Hn `‰e›!ä˙ö‚r>(JmåTáiŸ?∆êlòÖIDø˘^{É ï$Yè†IÄﬁºÇì>PÛ‡¿g~ö¬??xt„dZôbﬁ,D¿F≤‹≠eŒ¡xí"Ù9( Õ—Éj¡iD&$JŒiÕ†≤pûû5bcöû<ã¶Wîi≥h"]Í }ÍÖWöâóöπ√˙ÌÍ7°á.ÔGèÜÉ,<è1∫À8Ø–ßÜ"xèãíÃ$≤[∂KòY•πVIf(<S©Ò·»ü’;ÿZâs∑ËÕù*÷÷´¥®ÆÜ—ß¯¬º«v¥mF°*rhG=Pﬂ\Æ∫[‹Tv*•]h¡jÒ∫RÔÀh…ˆÙ¢ãÃlÆ‘˜‹ÍlG*Ì⁄‚	‚πcSÓﬁí¢"]S*cG•!Œ4¢î≈a+O®çDÛ(oäûÆôs$Ò· ëæû’Xb_ÄKpü<Â´_û—Òm»ÌB¶‡Í‹£=l£m-fr∂ãËÂÛó0°ùÜø/ÏŒKˇÀﬁ\ñRàÊC∫<=œ‹¢⁄Û	D/Hˇìƒ°Îj{∏0tmﬂ~7QËÂ7ÓÖã(Øb€ï∑•b+ÚÙß@ù]o8°é“|$_¬R•>=≤lÅëí—ú(2ÂÓ€VRl~
\ât∑Z¢FÓr´ƒ˜4u¯û•äR¿j@Ü)∂0	F∫W-øú$7®îLáï¢+∏¸—ÂDÀÀQÒT›dﬁ†ÆP°/ïˆä.ÁAã;{ ∑(å‚”˝¬4˝5]o-ÀÜ•PBãa≠+h4Ö*±ﬂ¢CPê04IGúUÉˇŒlöÈ≥AòÌ¯„0∂∂8|ÉQﬂ{g;XbO;Y ùÒΩÙ⁄¨•fEúôYâ\Ëéô÷¯(8b8FÉ$EÏ»%Ü¸–?≥x‰»˘äB¬¯‹ÂmKF	saΩ˙3ÚQºÖÿˇ_Ã“¢WE	irCì=¯(_<{FñoñÏ≤dQÙ…¡`—R?≤‘Ö?cfπΩó)9è9”¡sã*›`P?0G	NﬂÉ:ÚáË˛_mîÙ’∆T!Bj !B1¬ı"I¶—Ñ8(?4-,’!=ö¥ÿ#ò!gﬁÑ∏MÄXá8Îç1AT/ê£$¢xé£$FÖ\ÑJ¡qr÷‘Óxu3÷‹S¥ÎP®ˆE¬ÛJ†f€ …ß>SHzÈ9jO|Üh;–Ä∫œ{b}ÌS!ü–ô≠#v⁄Óªd
^uﬂQΩ+
^Œ`Ôøk<:¶Û∂âRòCuà(≈èàÇóq-õÖØ )x˝ñ@Rrô÷{¬I¡Àôa«K°≥—‡3n≥-◊±SàŸ¶‹
AE˜Çä
{ÒìA©∞ÍÃx*Ù‚˛‘ucá≈©@áŒ±[+¿WÖ^‡*Ωrßﬂ=|π¥˚ÊÍ·÷ú°`rA¸ÔˇCuy6b∞–Î7ƒB/√|€ú)¨ÆıU*0≥‡eù˛∂ÿ,ï˘¯„≥‡e‰Tá”¢)˛˛∞ZtÖﬂØES‹¸ò-¥0≥oØ(Kõ,é&âã}4“&pP gpãáA»è&av˚Wf˝ác–2À2DœÍu—]sò7ÂïîÇoºDß‘t⁄›B)üñLt: Gudı5K†}†À™5ÛmıÂ∫ˇ¥ 0*¡ºjhæ9ΩÆ.ä¨!|DvŸVdsò‡Ò) %∆eq“∑ÑîiöpZ∆˚—»ô”‰eëßhö©π’Û«‘s´ª0…˚œèzdÜ“i8ûé_¶Lªµûáy∂IV—°Œÿ<€6Sü!	Ë•:?JıŒNõ›87o0€LP^Nè¥Ê?Ÿ~®˚t©êÏB>˘äzSiÿ^ÅU¶Œ˝¸3c`1'È∫è@÷›a∞
ó4;ñ…ãªñó+‰WMjòô¶ìÖßï!≤ÇCç“≠`bÜŒ01‰3ò¡ïzY¸B]äx˙—_~!Ôﬁ/“Q
±äêfÚ\¸ ≤_√òij◊Ö„`å'˛8´π(L?`ëØ{!làt_◊Á7±ÛÉ'jf˛Ö Q¬Xº´`HÛ‘-B–toÇAΩÌÕbØ<˜R
◊Pkö$ä<S†≤¸ÊMÍÈ≥*“òÂ5LÃﬁË0{ƒS4A!íŒ≈)*4—éBàhq“EıòC´≥EæIUÁ†96…;™#¯ΩFıXúb\d ¢R˝ß‡ïAÎ-‡ÖËeVXıH∞/%¶®Zœëd`∫Å(CﬂCÒ=§í=z.F	úZô™~G∞0C]=*Jô◊,J:Ç|tMñàX~¯ëπ«~“É¢—Ov‚EÃ°söá‘t¿ÙË$ı&< ˇA9òp–P„Åû>ZÛ–ªB°ø∫–ãã‡gÍ,¥ˆ£–˜Å∂c48§¿—áòö‡TN√√°I”Ü˙∞º	ÕÂÀÌp¿"4ﬂñFΩ=	<Bk†ÖÁòo*¢˛†Yr Ïi›‡jì9^7çg2&+Âﬁò%ã:sà|U6Bë¥ÃgX(êÓH¡©XÚO˜ÚÖÒ\$∂FH/’ìç7ÈÁ4πƒœ5S¿≈®ÑMô∞ç…¥õTä÷∂kÃ–m‡Øh±uÙòîF¬◊ê`™∂g¬µÏfÜBıc«Ù÷œ»GÚÔˇπ¯¢∏}Ûô¯B3àçhÕ]êcñ+YcÅ>vﬁúÌú|8>Ÿ9˘˛˛¸◊W/éﬂâ˝åÇ«Tü)`≈3Ú6⁄ t¢\3U˙1Ê˛û£gM…È,!§◊†“äT»)á¯ÉÃâö¿w>¸(∑◊8~îäÂÚjtê48ÕPÙ±MJ®û7`Ñ¥…‰íÈ⁄§mâÜh}YFåR˝8Öñûƒxú„3◊Å1ª¡•?ì=6q/ö|G‡‘∫µee¨®±z∆E~«j⁄É	“Y1ö≈´Â∑34JW'å©ﬁ⁄îŸw˛uÁV≤°¡Ã” [ÏøÎçâWÈÂà®ááﬁ≤m»LiZ]Æ¯w˛·‘B]HfJW
Áø÷ |Œ0|Ù—ﬂƒWm~çÛ_mb¿AÛ“ß!óçAo±®>‘»´™∞tBhÂ,{:…D.±ñRı¬'ëŒr,ç≈ç„ôrë≥-›–èŒQﬁtƒî€Mi:ZMnXzç∑Äìì™vô|¬¿;ÙÃ&üa«Y$j¥^±–’/	ê8¢3 ›”à><íö ·òÏ¥æÇe‚°∑y¶ÙL˝∂,ës√„uÄ´ùÑˇπÜÔªÎ˛ÎHPM8B◊—¬ëªø•… –G≥„∂º¯◊À˛ÍÂ5LÕJ÷›P≈F÷ŸﬁzqH.$Æy‚˘EÈ•„§°©î¬ÃùR†uÊ%¡î¶0iFég¥N¶OäƒæπBæ∏ˇWô§405„⁄å CWeT÷dTØ t4vXhY\´ö`~l—h+Õ“^®mñ
ıfìû°¨zÄ)µ°⁄¢›îﬂJç™#æ1^NP-Â•CÈ¡÷™Ñ˝ç∏]∏.√Ë^&©ﬂ]X®ˇ¯"Mì‘‡öoπ¯⁄aÙï*Û·¥Ÿ„u˜≈÷êB¬tëë¥74kÕ≠Õé
˙ç¬ ÚeëÑ≠`G∫h≥ŒõQüÒ*düä:QÛ.‡ÀvGtü§x‘#Í∂G>D∑ˇLPY$ﬂøyDéÉÛ©¬.æ(5N∏”P+nP |·&>∫ç\ˇ?   ˇˇÏΩ]oIñ|Ô_‚®áU›dÒKRw≥)
IMs!âí›≥˚
Çî¨Jí9]UYìYEQ√!∞Ä/∆Îã5v{.≥∆‹xΩ∞__öˇd˛Ä˝|ŒâàÃ¯Ãå,’ÍŸÆ¡¥äYôë'"NúœÁãú‡õ†d ¬˜ q±=\ú√Ù.˘)°‰>ƒíG…R¨ıµt≠˚¬6√Ñà[,¸0ËYÂÉiT•ø™›‰QVóh’§©0 XÂºáo‚ ]}Ãæ`≤AÁ$ÌΩ«£˝FCd1öûû°8?ΩLÜ◊rœXQÖ°-Ä<2fV\OÇ«P¬H⁄@ﬁ°∑R§zW\ÎYÀ-c/Ë¶ÜÄ,ÑÅ gç≥îªß¢ÚWM ìç^àŒ⁄Ãhoc∏Æ±ﬁ.‚˝"óåîÿI?Ì~7«b!Æ•|˜Øü"o¥àWûFøç•ì•π=ky∫D'Ùsâ¸(L!3GB°È„0lúˆ¢:?òÚ·Œ‹,Óé	öY¿\ÛàS¯ˇSdã(˘ê‘y˜Ÿ)¿µÕøÿ}˘ÕõØﬂÏÔΩÿ⁄ŸÇ7≠≠.S¬oûR wàı‚n“É3 Wúd]úX=áY”wcKQmcCèi§∞)ÄÒ`[ò€d†æÙ“wùd8å≥ØcT≤åÙKÓË”˙ø sì(åÊ¯€Á0ãºüC±€l∫ùÿç˙∑â>…πq:öôY¬è2;_'∞Ñûä^Fÿ#‡¶/yÙE£˜	ú°pΩ
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
sÖ¯‰3üp~@zNx}º∏√ˆ= ‰Æ∞ıËl¶E∞fá)€Ò1€ÈMÉI/Í8Åºp)ÌP˝lñ 6Ûõd√8œc∆+I‡wiÏ·›k˛Ú˘∂ıˆı ÚÓyƒNº˘#À” ?	¢rH_Î©£t :ç«ëß†Nc‚(π6ò]à4·T[\“B∞‚‚Î‘ñ≥≤?OÈI4ıﬂ„€eOÆ7Ω{¥P	‰¡Avk-¡%…≥Qpıπâ‰≤ø∫Ø€≠R(Úë†_≈ÒT√d÷:ÿ˘$ÊÈI“è·‹ˆ›8©_ç¢jjUµ®+«∫YZÕiNv>#µœÚQS®Ú˛*È›ÖP/Æî§íkÒˇ  ˇˇÏ}€n$«ï‡ØDÚ∞®·ù›íL˜õí9VãTìíg—h¥íUI2Â™ RfU±[4Å›«}ÿßY`Å¡<åÊ≈êø¨1X¿èÊü¯KˆúôëqÀ»¨*v∑GÿjVe∆Âƒâsø‘ãˆf
“Nì$Q]ªA‚á≠Tñ≥¥tPfú¶»¬Gpçs‘~Üπ•Œ¥e∆3=ôµT[d”LZ@µÂyt–ï“§¶|tù+»¿kíbÌã˚[?(Ó/∆bO∂5≥¥íS °hD`©€
Q’"·∫∆(_IECZ‹∞D¯¸T@©XÂ={úÇû≤LA◊Ub°)åø“·¬¶Ù™˝≈gäÜnÂ^eπ∂‚Ê˙¶å« f®"FDˆ≤“X≥éBS’Ó¢UÉY‘°	%˜˝9Ø@y1Gı¸É∑yVdÚ~üŒä/¯ŒœäárSyç⁄„≤‰“Éhˆ’NpÄ4Î^&#å\ ò†—Ë•F/’ÉuÜu=≈6öc™¢/¨≤≠M¯¸w{ì«wF›±£qü;\ç‹u¢ÕõY…fIÃ1ê◊d; ‚WA]ÑI‰ïA¡~∂NöÎ;†sÖ]ÿ:d„«¿u¨bÒ¡ÍïÔÕ‚H‚‘˚@qËøáÑ˘6≥&¥¯ÖâKs£nu1D†B‚?7≤–´®ø~ñÅxú =®hbdÿ≥º≤ÎÁJ„√2ßHT≈AL Û=è£$ÁÊ7˚ãªÚE"e¯n¸U}ƒh©$‚Î⁄€s1Â–#7ı°\>rü#8-ı‚.`µû¨∫∏®%v≤~çµ¨óÎ`.ü|∞∫Iã}p›Qı!ˆ!€\ˇeôôΩπb<Öç“∏Ò¡vJì⁄Õ›V∆fL¢uèœl”ﬁ¸÷O≥S&&S¨¶"ˆà¥•éy±QcU++l´≈◊$Ã„Ωîñ3C≠yî*'∏ÑXÚ÷!•6Â®¿lÕ≥+Pµ6ì∆
`æñgKAFÜ'&Ï©∫ÜY“dö)™¸&ãjà{˘›é*QÑºKÊÎÆ:fN–|J£#{π,∑`÷oﬂ3_“KcYÑú_p5„l∆”†}Ñ[è5	!<í.¡ñ¡≠n≥û{Ω±µÚ“¶qºÇ¿1cΩ<›–¶Céb—ÍäÍi“∫πìÄªEÛ ‹·Ö—A«gHŒ⁄ï?µ∫gÏ:Êì˛y“–˜«Ë>Ì≈O‘ç˙]Ïî4N…Q∂üf„8?îctä—é„.V¡,˛˛ÑòIKã·*µ˘∞áœéüúúÏΩzv¯Â·≥=ò¬∫∞uÍû%√dêb¨ùMm ˙}I!‡ˆ~Bˇ°&Hœ„qBπ€:f‡=ìvôud.i+˝≤™Û≠—7ız¢ºÎòuFY<≈_^¨ØØ„øWãÑeÙ˛? Æ”´Œ
fLa©´,ÍÛäÌõÏÊ•>gFdXNãcÂ„,^‘, ˇª_√âuFÙ¶‰¢ îÙVÙ9&‘7◊úcïù'qó/VªÃ~œñ˘jA(!°vóq›ÉQÎ¿ÄE°˘¢\—#Zú1ÂçVŸöÚÂ.9Fpò#e¡zhõ‹vÔû3lëmá∂µË∂gÒ8#›∂«qˇˆOà,¨xu©L®J:#_‰[ª\{ÒÒÉÈÂKÜ˜ºTÒÕj`¢ÿ√ZﬁÕ“~ˇ,2kòYïg©>/âÀä
ÈÛ¥⁄Ó`≈d >≠—£7äîã4¯ìŒ*’°càN+Õ `´FËh` Ú⁄Ä"|øÅ#e∑?´È∑{ôÙ(4sqJ◊=wÈèPây∏RÙ˝$YeÇ0ƒx¿Åym®ìLS ÇÉ¡ˇ¸∏ õ∆?\}Ω¡iãñákÂyGˇâ9ßõ,=>éoˇÄ±,”§“ı
Í/îì3v$TÀuË·lÇÙﬁ8Œ–Ω2UéqÙ•tÿf=m`é˚ìje∂◊K∫I:ƒê‹±}SÆ‡=W‚Ç ·âí
€/∞fáÒW¢7ıÆkΩπõÙ§¶°Ï5puàW/–’V-Z8`¿˛∂ÏÒ◊ÂtzûF:$sTït7üÁÄ`”-góJÍÖ$åH%≠ãÎ|c&zî\±3¢ûÒ\e-iî5Ω„ó≤;ºç‰√9,Åıﬁ#ÁÎÿﬁîÛ.=æ˝?oı,˜H—éí&A'Y»0∑©Sé~<º_ êvGbsób(Åp≈$ƒ^ã“É˛4ãÚÀ"…„>oBÔ$åÙ±Áﬂπh¶)Xj◊!ÑÑvaq°5aΩÊ„Ä‚ç4%UQ°¸i{≥ÈD≠‡≈LnÊ„c‹,êœà~(¨óO©≠15ˆMY#Æ,)o [ä ö—\ºâñN`x›Ùtò:ä
;eÕcÈ §{ŸÏªî≈Àe≠7I*Ó îç4ˇÇFäÛwc∑ˇõgRÒûı0Uænó˝øµ˚¥_o◊’Tí‰ÃÀ©˛xW◊SŒIt”⁄c–"x’F‘,8Ã∫d¨d¸Ü—üñ_dÓÅÃ*‹ €$XvΩÇe	Pí.S¥D,Á‡å%,aQRh‹≈L·Q!˛
€Åê≈ºË#{Yc∫ÖrcjÁoÜ—ÎTå@Tª≥n˙.≥5∫<ï–”¿Xp∑«' ~l hc:P	‘†2¢Çøò31P=>UJP¸rWd@ J˜
øÙnˇÂB94ßÌ=>]zñ9õÖ∞À°`·ã•Î∆tÏ·#∂πæππeËúgRÎ„Uk	>˛€ø˝;9x∆ûú<z˚øˆèàDGp´∏°„<Õ¢+PìO fÉ8§úfKj‘ët°µ€óÛ|Îˇ◊g*r—⁄1[Ü*ﬁÑ\´ø˝sŒp’˝À4c’˚…Fiûﬂ˛i˜›;∞í)≥rk#A…[˜7´{tsK8âª.›˛ò%)O¸∆6NÒê ÏFg≠»ñˆæ⁄sª	%:Ö'fÌV∞AKAr÷u?ªa≈ÀÒXw¶¯ïæ`Rb«∑—Y…RŒ¸a˙ÃD∞i*û¶=›˛	õ÷°7≠ H≥ÚlûF°;xZtsPÁı2ÎŸyu5qæv◊n*¶§ßtxr‹ãTøRÏZP[S.8KÏúÏµÏ"Ëk;ëµa'µ∞—ùMåVΩøÙ¯pDÑ"˛<§©£∏èttÙfHM$ÜÃˇ]~1391)…LY~ç
îx\bıπ~ÂLe·ê{∏SΩP„Ùø.Øiø◊Î+ƒd¿õ«•›=JŸ~îe…2uFJ‘VãJÔÉ[Û˝$GçúÓÚ¿ƒÀy«6L#Gßm õüÛ¿ÚúÊÊîè∞=ê©í)wiÃ#ãÏµ<öUÛ0ü-Œ¥‚lÖ%ø;©‡.ˆF2≠Ê˛jm\ÂqQS˘Fq‹∑2[ã’õ;îˆÌÊ¥¡ÌO#Ãq{VÏ≈ñˆæ≈x≤mÿ—¬õà5r‰¿˚˝‹pÖípß>oá‘ª®zΩEm ÑX{:Å„tª´Z–áœ‡,Ó"—ÓPÜËwñyI(¨q–¥ÃãlzùóXüò#∞2yÀä/_#¯ΩBç`¬Îob‚ñ∞xFoœ≠™Õ3’>‚i2ò”&Ä" Q]™qï%óàIÌ§ß≥Á"â∆ ` ig‡–Â ÛBlJ´Çµ√†«QôIﬂVëÔd¿Oo¸†‰ÛÛ,ûˆ∞TFyõ¿$ñ¸B<MÚQ:$K\]+#? iÓY·X≤p0ŒÍÕ_îÆ≠=˛Å€%∆≠cU #·n/t^}µπ_%Pì°g
èfQp(h.6 Ÿ≤'Yç}∞%Fh®¢·oÑ›:K«@DÓ(ØÆ÷w	Xb˝™—{A(#"«  8N_púÖlΩU¿F3¯\ÎV%Ì#2≤∏–-Ö±I[˚ê˘T][öLuxa£è‰%•Ä°;∂±E®Ò≥0èÚ_˝´>%qs&‘ØUVX3¶ÊœzTJ‰(VvºQy7+Ødôh”xß}˙ÕØDgÁ˜Ì˚ú(Ú⁄∏}¬o◊:aÆm‚ù±T>L;XV¬qB fçàò∞⁄DF¥÷Cg,©˝Bqõ∏ÂN+Œ»Úõè‰ÃÓ»v∑`f_d∏#“j¸7Û„⁄¥õ/„<mG8mød;7ÚX*ggd›ó§Ü®≠°˝∂\è«‹ha¯ıµ…±“*´D-&€æ/πˆó6∏•ˆˆIz‹WÔÜK≤0¥Ω5è$?{ò’pI ◊‹Ì∑≠Ôz{S=µΩ·h…}˝m%ÉÚ˚Ry˘}µjãëªÆÇƒ·%x`:É<é;FCó¬RBw1.%W…Âxp¯œjb>èò≥ ≥Ùı€Zµ6´-äÅ~õÙ∆óMöí>ÔÃ°≤éòË7ÒõßÈ’∞:”5KŒ—Dıª¯˙ …ÏÚ
+/tÅ‡qÔtájÔÈ5øyÎàT&J›!»≤]á,øé±¶lCl·/˝›†ã≈Æi;õFrœ!∫∞<n∑Ôdê“≠u wrÔºSNÓÇ2*≈®
¸Wæ0ëOØ»ÕÂ˜¸ï‚áôàõ<Æÿ#cD]ß„O^VûsÿMr2±¡vû>&„S¿?≈]¥l	c˘0_¯≠R"¢J§\=‚/rãç^E>7{uÆVŸÂ*èmD±˚ä}»\;«∏ﬂ˝tê`ÇzeË+.ßøwÅ Nb˜˚üÛp  €óAo£t8|/1TPN˜^euÚ>ù}@¥X}ùÛ’–∂·<À6Ó}5~„~©®±"VaÔÄ¸ˆ∫bËµryé”∞Èä˜#ﬂ„FÂwèÖŒQhF‡≤¡û(õ∑c9Ø8Sç1 nq¡cx÷Ω'˚|§æZ6ˆôT√ÔœLÛÎ∆;IYØÂ…∞õ•√‰N*%±ã …„!)ìÿ¢díO@çKeóWP|ê`¶sA4úD}jPB‘µè“$gÿ6œÈÏjŸÙ€¶DDëa‡UëGë«Ê∏Çêo€26œ»xŸO¢‘ú(yÑ**íÚFÎ%˚ü#{à…Òßc å\4ˆ¿5bßŸ1(tÖM(’[ñ†¥Ä:Ÿ/>KÍ`ƒ≠]Ú€£iZ!¨…Ωv§+C?‘S8Õt2Ó®:Xe¨é>Œ™Âpu°ƒR…Xc¡™u‹€U¯DÂcZß5|ﬁûY´ÂÈZÚ)Wb–¬<P’‘`÷!ZÉX$RnJA£&æÖwäO=K:¢”~ËNPZ$…)1o	i 8Q≠!îlF÷πàÉá€JQﬁ¢‹&ÏGX‡<ºíßv¥|„≈8,U¢’√–⁄ZSù ΩÆHDrãN7Ç—d∆c≥HÈlqxJ·ü[¶B,Tı£C;æHÓVüüÍYÍXe∫⁄ªP≠r‡î◊œtmà∫ﬁ‘¥UOV·…çrƒ4√¯›ËˆË≈AIYK‰´(x\ëèâ¿ô„ágbªæ◊tk˛¥∂÷n‡:øÂåÆﬁY|Ω≠à¨ú∂ŒŸªXoo{wÔ[Ú˜ Ï∫Y
u1∞˜N:<zî=M2πñÅ,Û‚äÌ£Úˆlï&Øl:¡[´‘YP/±˜∂‚«ìQ∂°¬≥Ã©Ã…‹3¶ãï:iãœ=Ôz≠ôlb•ÀıLˆ›°Œˆ]ÈjKxbÙ€âBP%:ê∫fﬂ?®5<ix∞ â∏R≤P	Apñ¢∑ªı\`Úî(Îñ}#lΩC<BpﬂüY£$JiÀÒagËFÂ¯™ü_è¯pè∞à-˜3•˜ Ãå†‡ıZÆæÊ&áFçøk’*R⁄]:hrÂ]µìIßÑÕµS|îCªZ€æœJ{∆_°©≥, ˆA$îA1-µï’¯«&‹ıÌ6-ó»f€
*<Ëaèu=™‰«÷pÕÇ¢‘{ê5Õ{ÏE◊‘o“>öÅ˚˚e∑‡2ZsfﬂÚC[F„¥è6bPÜ'Ô‹'|P?4£È@˘iW§—Õ‹j˛"1-P–SÓûª‹äsEçı(}Ây3‚nv˚SﬁNª|#l‚\∆Wn§wrÇXQ9√J3-ºŸq
°"ì=f≠b“UCèƒKÌc¡öÙ†vá’Ç’w°i|°–^^©¿¶E‹òjıËèlIOB—¥íYÿºu”M˙XóëdW—	ú◊Q÷∫ãC¶Ñéi€jO¸∂˙à^vb8M`G®BW¬Ç)øΩå∆˘ﬁhdØ:—§ÊÑÂ∫õñUezOıªä¶ÆÌ|Dß8K•\ÃÀ6vÙáxaˇ8√ë—˚∂ºå∑Ø1ûg? „é≠y≥ªOﬁ“ó∑¡IQ- ¶=Y	ƒÈ¸rgÖ˝?k¯˙≥Br„ã>æ¸néˆ€Ú]`
Î1∑Q{jf·Ø,.é=–O±ÌJ Ü •A°‰5‰±≠ ehA ΩSî’DÈπü£êW~ÿMF‘Ω¥”Ü®†ﬁ˛Ñ%1@pBØ*≈z\L¢¨á\)ø˝3%îôÒ¡!È)KËm)f`è\»ûÚ:\<Â(H85jD?qL≤v5sàT&mUO0du|Nì{¯éM-πo©ƒø]±i#õÃÎÎNˆˆ/˝qbáˇnòÕ‹Rõê£wªú%Ú9úﬂŸIg}»≥ù◊)
G…ÎTÂ°I–Û…eî≈≈ $ıπyÃÈyXß£0~4M‚´dx·cHÂê%g“_Û∆3£=ÏeV≈∆ $0£òΩ£òÁÌ(∑îXjb9∑Jƒæ∫±˜UìJø∫ÙxüóYÒ∏kŸ1ıd{lÜ k]Ê*ªbé≈…¨]•ònÌ w*HY#/n0h√n#ün&7òcU‚9!‰CO&p{àëÖOñmÑn3óÉlbŒT1»üY:*)©:L®‡d+;rË≈ì' øSwÛõ€aY ååoöÀ˝Ã£Ûß£q«	 hØ∑ÒÏŸ∆¯¯,ÙAó◊Vb√SõKÙ3Ä4Óef9U~ó® =˛sï%Ω◊Æ™ÙJ9˙ﬁÎö^G˙…è^£êÜ%èj⁄∂ò˝Ë[·÷›æ∆â‘˘Òõõ◊åÅÈOÜ*8Êîâ¶4>«≤'é"ÿ¥¸A¸[ÆäÌZî?∂ÕHu†]º”R∏vîŒƒ“vÉJ·õ%ñ¿ø]g‘tÙF¿A”Ìıc˙µu\q¸ê|“IΩ8Ó^¬· ∫à·üéE`RJ?çJUÄ^ÿWÉøÃ∞,r
ÿ∫î„ﬁπm«O?õ£êå}h8»ë_
¸I˛’÷*lÇ¯]ÅWñ∂è∆√zg^åBÜ°˘Ó—5* h'—sH;9˛WOπ@–àqÛJÎYå
˛^ôuØ◊;M+JçØ˝ã-û°¬K≤ëfGñ›F´ﬂı€-zër¬äIG|áÿËß•ûXHÉ‰ﬂ¯ÔUF`∑lWéø`SÔWÙ√
êÀjd„7ªlã›º¨,·f•j8Ü˝|ÂÇŸz∑Ä∫ÙΩlH“pù ∑äŒΩAä°˘öW1<27{8›P†Ly§Oÿ∑<i®¢5ÍœZ#zæƒPıÚÒeCìÏ_4”$eü—Õê>£pﬁÜ¡b}%›∆º˙¶çh**Ú_l√KKèüb’84‘⁄£È⁄p˙I3Ô…€+æ¿˚B·§a]√qgπ¿7{„vÛE^¶1è£¨{ÈyÁ0ØºEÎ„énÛõ„2$@°êèﬂä TıõòçS¥ﬁﬁ”ü6ä|–◊$•öﬂ™ïû‘˜hAN¨“Û≤E};?ù‰h<∏ƒˆe†ë
d∑Zƒöí»P±#QJˆ∞g5–6è£ì9çM˜M2îÓÂT¶0í·YLöw£∆í©…V[,Ï÷fÀ3≠<°ÑÂáEÅj"™i∆ÌT®r>*9Xgï©Ì≤™„°*MØ≤‚v…O~û„û£‰‡√˝—˘˛pÙ]uS«ümÏy¸OÆ=ÒW*€ôÍ≠∫vƒáŸeS◊⁄»DO+˚Ùπ\õ4mî~3Î"πYg∆%“ ûV†ˆ<∆ï˘ÌèX§í\{{@{<Ü”± åø“F&ÏP∆—ë#hÌNﬂ˛÷©Ú÷¡.‹Ö5‘r–ˇk›A‘Îa°ôV/∆]yxù|z1•ûFcää=$T>…”‡Y_ÔÂ⁄÷ñ•3q†û™Ø˚Ep†¶v[˘®jW—≈≤'Î]–å«qooåbÓ0æb∞=†$@WOéNË“ ]©Z]l[µ[˝ÇlÅoÂ∆—»◊ú˚!O±Ç‘zÚ8õÇæp2é∆ìú<á#‰M_eq7>É,€cVåø†ãSôÕ∏>ÿÈi¯∆RFütîºZ;ÌØ
“äìÿ*O¢ö~÷§…/π,O·´î,∂Ë.ÇüúÓ}~ÍË˘”ÉÁdOÀ«—EÏÎÔ¯0°D≈-jÙÙç<SÒó√	Â…ù´¯bÔ”É/N^–0/ùΩë6¯Ï£Ÿ˚>‹‡z«ÙR d>ï≈ì±O¥É™KKÎLd]B◊Cåaók#•◊¿od∂µÀÊ¨©ë∑5µR•]à≤∂e„Œÿ‹‹Ò“≠D5◊ÒJçÍ=Èk.Õãø¥◊'”¯4:Î,OAˆâ¨j]çí&Ë—$µïƒBU1ïz˘u1∑U@Q)∑Ét456ÓiheB=L-c^wÖ=M‹Ç<ÅN9[K?Ñ∞_∑ÚFP„Ü´,5L[5˛m6HÜkWkõ|HO,≥d§CäÈ™ƒÇ¬q˙Ï(Z|¬r+Ïè&Hx’›‚}√Ã(>Œd˘ÑÔ«o‘:[´é‘î|∂ú•âãè«Ê[òy•e∑¥ÍJLïú
\dOΩá?ïñZ\Û˘yV#≠ÒÒFækdjkà‘«LèOÒKMà˚hd2√3+≠=˝ÿ√JÀR˘æ«›ôtÃº/ÓsúZE@`√nƒ[‹K'†Ø_∑ú°6OÇ>f<ŸhEó⁄ã[∏ëã4{É8µ.ˇ‡)5\"O)≥fƒ9_|Ø`¢’òämÿ∏¶Ói&⁄…º¯ÿ… ÓÂ›,Ìúl0¶?ì!âÁ\3Z≠üçxÖP2V‹`@—˘hBÖﬂ“;¢	é"“Uõ›˙oÛßêÚè∏*ÄXãdar%èàÃòp¥mú‡b—ˆ·¨.ÔY¯üÎ!≤,'$Ã´pËÖ≈ß.#Ö?„KÅÆ˘5êsñIÇ»
F4•õˆ≈® ï7≈tø´ŸB.¡Mf5~=ÑKV∏|úü5a˛Ã_z≤˙Q• rZ÷.§π¿§ ¿„%Èö]ëVàı»‘ähÆ√Ä	($]¨V>`z^$ËkÕ""π j∂ñ-~Œ_€L¿z˘
˛nO ‰Ú√ãèÀ5ã¥≤2<gÆë6Âjùù·⁄‡ŒyÇ<¢”yUbœ=é=úq;Çû™πäe=Äáˇ,µº‘ÚjIπÁl‹	Áˆä 6EOÙ£«˚@’ÖjÛÜx	ˆùjÔy^‡Äqñ'‘÷û®äGi fà¨πˆ1PöünG$ xòJ’
&SÎ˙àYÌb≤>ﬁLv19»|õáΩˆÙ!’ïm‡!—†¶L¿ºqÆgºVâ9û•Xjè¡_N¢>¨ı·„‚8uÎ$∫8˜c«≈uπÈÍ84ß˝Ûπè£¿tÕå≈∑«g˜vÎ@∞ô_è·‚£!)2I∂ÙèT¸tM<"Ùs1˜˙ΩäÍÁi— Á;xnÌÅ!ÓV/∆çŸ¶KC¿J/π5∏∂QÎ“jÑoŸúııJÿå0≠1Ô3µ©≈,^P4¨Ñªàπ÷ÿãò‡m¢9Øõ¡ÕìY’s™6UIäRùÉî÷O~ IÕ˛|O+p«Õ¨TNv†|èµ®:+<ß∂ﬁ^¨ŸZ](sp8´f‰ˆ∏9ÖENl'ÖWTÿ’,LL∑¥{oj+\Y§uª—'Ïﬂ◊nq>…_∫g÷ûäeWy˚^ï7Å—ì.◊pUãGZÒü“" Ô◊X«ÆQ
Â-Ù‡≈zŒmêsˆúg—»IñP*î∑Å#æàåé∂•mé*˙·}·è—EjÎ‚∫XÃ'mp≥å%£fµNÜ¬ﬁíT„y¥G]‚Y‚~Çtï∞„ã'„l“O2@Ã€CÌ˚•˘Çfˇ≤…ñ≈ ,~ª	ÛnÍ›@€”d‰{d˛Ë9Ê√ zNÑCŸ"„ñ'„8…ó»!›KY•˘Úªè?·qÃ„©í!oÚKÇ%óÁÑâ›˛+>ÂV3áñ0≠}_<W3æ3Óçµπ'Lâjæ”+≥è%y–Häû»qjEº†Ùy4N˙óÛ∫Db¥¶¶ÏÔÛ⁄P≈„®•‰¶¬Ÿ¢Ío•ŒR”ã4íöŒ+°—x&-¥"TWciäm6_±πWÄ°qË#ÜO7ù+ÊRﬁ+YŸ3õ+Ö®)«¢+„Çµ¢
ªÁÖã’‚qìÍ+Î &b´âiØÃùzŸÑzfx20·8ãßIŒì`±›˛Ñ∫9w“yd˙+—æ\‘Ç—‰`3π7å—\Òø∆Ó§ò§oÇ)KØ@ÿ›∂ê˜Üx‚md£Å0GÔhÿ„#ùº?]OlãvÅ˚ï⁄‡cNT$)¨ ©∫±„-ï¿≥,Fü§J7URj j-a[‰4˝≈Ê˙ÊˆK›>P-NX	z`Éˆ…◊&,-6ëÄB©†∫n|R±Ã4™v˝pØg„˝$ÎˆcÈﬁ¶òﬂBˇ˙/˚€ˇ¸wé#Ù}A÷±î_úÁˆw'C˛,ïÈ‚òàûé1É[G%¯Ÿ0e«O?+RÂ®FüÃ†‰ts›§<6ï{Æ*ø(wúˆoˇÑ∆<“˝Â≠AÛ-27”|ûënpLﬂqõ+çgÀ€Ÿlkv\§0Â‡É◊GgﬂÙ…NúƒyÁ¯Ëã√”√˝ΩW«{üÔ=;¯ÚÙHdŒ¨ËùX™Åò›Kj%c'ÈÈ:¯O'ø¶n
›,ØÜ˘cPõ∫yéŒ≤‰"ß øÏ≤{VÎπÚH 
xC9vû>∏a)œRpñ∫+Ñ¥v◊úmp™[IıPæ€Ÿ‘ªï3g`©ÿanVr—]≠ÌêánGâ≠7≤‚.wù,L8‘moìØŒÈ´¥{y‘)18hˇ2ÜCk”}R<ÖfÃèÄñ'ÿL∫’R>ÔÌüq‚—KÜI7·ÊW¥ﬁ[WFåCÄ^#£¥⁄º¬≈XßõŒÄîÚ<¯uî≈›$è≤ïÁ…[3œÌú¶/¶Ê§Ûº}O3~ÏƒøZÎÀÄ`ÃÁÙ&,.ÿ+kq"
qkgìû¡ÿ¢,=Ñ~€N± øçG~Ø;_ƒ„¥Á∂Ï»èC$©Ë&
ã,¿jI|Ü˘q|¿ﬁ©’G~j√˚ÒÂË˘æêZﬁ∫¸¢||¢L˘LMoÅf‹Sé≈£Âö¨—›‹
πõã∫ù_M¢˛ì∞€)ùo˙˝;Bê|Aã„±3]∏r4´±d¡ój…*Ä/^§Ùa∂z;öG©‘Ûh–‹[a|Œ{ëµE†Èå.oπÍÛÏuY<Hß>ÿTwÜ[∫Çˇ’™>’‚_√/têJPôN^<≤≠M><Õ¢¸rªU‹øÎgç(w£l•ØFQÜ%Ú—ﬁV”ÄµM‹DÀ∆~÷	ï{ˇ∂ˇ1VM∏Ö≤ä˘\zJQﬁxqhT!fÀrÛ$b…ëÊòñü “#Á^ÂDH ∑†6†Öp“∆cõÿFÒÇÊÑD( Ì J¶>yóx‡;âƒÂ6ƒ…cΩ>ˆâΩ`’v˛;v¯€JJ{õÁ÷„'•ì	Ïõ„HÊèü´›x¿øóh∞ı◊ø∞o‚a76ˆFíØ≈xæNÕâì,-GùM6«ñÑg£FÇÂﬂ)%¿2≠^÷È%@Çﬂ6L‰z(pgg≥-ÓTÜr	ª|ä!—|Yâˇw7+ƒ{Û#˙Å~øæ˝¸¢BmEŸ∆˘“B¯3ö¨éıﬁ“¿V(‹0πŸ–£^œ›ö*UzËÌª´›⁄ΩÊrL©E≈∂µ¢bîä£b>ï¿L·-ò[¢sÊäxÍj˚SEN@MŸs¯wÑEù;‘±õ7Åk¡ùåV¬ªëOPf¯ÿ3Ûh>9]gÖ=fõËÊ≥x6uqô'·)Æ m®VıÓ“iKùRFG≠ÊY¸:¡©∂RL⁄f2T¨à≥áoúW®¿)Œe!ÃA![ñ°©sÛ -TKq¯£∂‹qQ÷xªÁZƒBy“xJ'®Ï)ö≤Aú√iS&3‹i¶#Ê°ts9bÀPÔ˚õ¥yûæ›°1AïXäH∑„4« _ﬁ<£p¬]vè*¥¯ûqWU®l’ œP/-5k‹»}ê‡Óœ3‚ÖåôÁmC°Ÿ"Hº0bI∂ÊKRíûbLYB'~›çy–dî
B4äzí†&Ç´ã-‚åü‹˛ôxëM”ÓÌ0È€—|€ç{Ò;-˜bŒ^Äé∞~¥ &I)ìÛ8√«<±Z^»∆)∫_–’…÷≠—õÕ 2‚s îÕ…ö´çm-&ÔêûËVÎ†è”µfZ÷—ﬁE≈±Y¬∑ã \öŸß;ä"i∞ÕlûÊ≤Mó»c9¶‹ŒÅ»å6_èÚŸ◊Z„X@N‡—MI3:»Gq7¡vµ°'GhÃáôû»≠ƒ¶Ry‰‡5‡˛≈$ zQ∆x+ë®3.JÀ—ó~Fü∆Ë£∑ä
©ápjÓ®Ù‹’∂hlz^”√®ÇP_¶Éë´ã¯f”…ªä;n√¶´H‚bm0ÇÉ]åxvÂ∆Ûxú§—ˆ˙xW1ÊL
πm¨˜]#üÛA>õÙ«òÛıOì,ÕŸx$oìG5á )am1îèoøÛã—l˛¡{^mÄ´*#:}A¥z:9@Ì•ÖÑÙ›m±ì9’5πs§‚wÈ]C™ÔpUMëJ{Èg§zkHU¯ﬁˆoÏw'˝∞⁄9T¿Çwê‡ô?Ø„9^=g√-≥j 8π∑Çø‘Q ∑¨/g£Í?»®!√√ìwYÃÊŒÒ¯4Ì«ŸÌAG≤ä‹ÖAóAÎäpYaó¢˙Œ1¬Ë“2e¸A»ôƒ{mò˜\≤øﬁ¯êù$ÍQçïùXDÇ¯.ÎFDÔIMD„§õ≤7L≈œt’—ıƒPóSŒL$±∂js“ñ9F^ ïÁpÀ»®,ñß„CXØOAy∂(≤îÀÛwdO‘G:≠®é~-∂Ó/Æô/Ãá’ÛVÇªëÓÆ≤<=Àb÷>ÇÖ°Ÿá‚r¸ò“¨5√&Næú"Èo4{$.vîqçª„⁄	ÏV=sW∂Cè'Ÿ–†Y£ΩÔÃö∞Û∞6™ŸjºpwSP`«ºÚƒå:¿yzÃïyÀ`)ää¬É·L™. ;}}n⁄›ÇLË•|{xèŒ„q2MÛõû5Ñf^ê$˝·Ô
í<˘sUbrzœzeœüxc¨¸º@‡˘~µíöõKe‡;2;eÿ)¬XŸocÛÖo&1¥2»{.ÑŒΩ8∑Z§kT•∏πÎtÖÜÏâIÍx≥Óπ¸˘4+ßytÜm(—)¯üq>À	¶|†n∑;PÜxœN©énZ’©]≈√ûËX∆„†ç¯î'5L£,™bﬁeöèó|·îzK˜õ«‚d7>uÑÚãYzIùı„h.—•Û¶úŒ∂◊èO"%€^/W‚n#èàjJZ∏î>/µGç˙Sò3ú°©Ùw¶¥o0Îp⁄7™≥∆Íﬂ7p‚o`â¸◊ÿé!ã∞V"‚“◊ÂòIéè<2ﬂR÷à†¡@9ª}˝iytÂKºsÌu‹ 6ºê/ |:⁄WÎ†gå'9WAÈNÜóT|Û€x Wº˚Å>⁄:®±qñﬁ|`ñO;¢Íì]¨ŒıMúQëYÛ—)¸•ÏŸ÷Õ∑+xv_¶”¥XÄzn∫‘ø(bg’srÿ:∞AÙzÌ˚KN/_2Ã´9ÔßWöV\Ÿq:XÀªY⁄ÔüQÈ0„ÜÑ≥u¿Û^ûñ∞Hã…∆RµŒ,^gZtiﬂ2kéZ.ÕA¥^‚˚ÓˆGñG…¥\-UŒØMÙ˝$·«6D†≤è≥txÒxòN#6ÂÁ4ˇíu¶æEvÄÌê*òãóYD}ÎxlO/¬‹çÀ$ß2n›TØ.jëUã{ÁÄi≠ùjNJ&Ÿ®[ôÊS–rX˜e©iﬂt¬kd€nUª≠ _ dè3zs{á„Œ≤DäÂ¿˜‡ˇ@…„(Î^zﬁ9Ã+o—Ú∆Ÿƒ∫:[É‹Fπw[ÎÙÏ;~6ˆ‰ªÚ∑"˜Æ< 2ıŒ|Ãg´Ù&ﬁÈ˚≥pµá'R%“}„1˚tíwëãÄÌ}∏-T±◊»¡≥«ù[ÓN¡tx‡¯∞g%Uﬁxu{Î©µ¡˚ˇ¸Ìﬂ˛Ö}ìªd¡¢“¡|Â9$&5ÖIM≈lS¬◊÷{®R ]ÇÚ√"–∫
Å¥8£ß¢˘æÚóT’QVô:å.©Ç^ˇ5¢Õ>†˙ä3ÿeà¡Á Pˆ\˝Z˜GÁ˚√—w’∂±ˇÂÒ?96ƒﬂ®Ïe∫À‡, YÉ∑√ŸeS◊¬é/AX£e}˙\.Ï4Ó«ÄqQK⁄æ¬æ:€˙hœÍ*“S∂á¸)ë§∂%fÆÿ≈FHë’+÷-¸ ∞#ãoˇPu)√%P‚H≠Àèz=ÃôaÈbÑ–eø=e:∆¡ …s@´YªfkÀ^ºfßôB)3yïı~Ï™c ZÕyLc]Z≤ﬁız˜ˆ∆X(`_1ÿ˜wûù–]AR≤‹Îm<{∂Ò>ˆ 5Ô]'ÕÉq4Ú∂ÜÆ/Œ^π
h?H∫Ò	◊±Í¬àí5^Ò s{øfoŸPwi*sÕV±}ãµ∂g®jB…ßÁicYππON˜>?xuÙ¸È¡s™s
˙“EÏÆ4Ã™uOÈÈ“a ˇrÜ’8Õ‚bºﬁÍÊ•´0ä?«Q\¬§ê¸∑É… 5Åbï¸ïæ≤`†˙6`);Ê…E1SõS≤©∂(ûà´qÎV≠£]+œˆ› -· sV∂Å}seK\ø≈h[Q6Óº–.˘:1àó’©±é&^8ƒÅ—ºB˙ñKs‚ÔÏu«…4>çŒ:ÀSêd"´ZV£d©Mi’˙ˇS•Tä‰◊•¬ZÈXj°ìZ°ÑxòZ≈<Ã—@rmbØ˜åˇl_w=0"G)RS√@*ztQlΩaëvK¢</·º)*:˚c
Ù(Û3c+S˙ı3•OMSS˙»™‹∞Ûu*ﬂüåﬂ¯ﬂh^øì«ë|?~3œ∫ù∫c+±@ÁπÀ®îBu·'ZzBÜd@NˆÑ—{¯ì√.-˘ÜÌ¬8¸X≥&ùRÅP	b⁄^\ìy»–æÙm±ıbﬂ„˛Z∆⁄jpQò?¬@ÛÄÖªò`˛òcÈ-1ûr «t5µ«*∫“^‘¬}\§ŸD©u˘wfp°õ|ÀT-fúíC®¯^Aƒç	<=sîOmÑâ@Ωœˇî9”ü…ê$pÆ˘∏:·(‚BèXqÉÅGÖN™Ïóæÿ—[‡ÑıºQ>ı 7∞É
˘`ä®˜9Ó1?ü’1k∑ÖÎ@à,À		3ƒ*ä_Ò©≠ƒÕfâ∫	Á§eΩT•Ïù“M˚ÅMSò3XS«Ôj‹îKéìT_·“z#0ãÈÎ%6aÄ5ë‡SÊ_’=©
†Iw„ÊMXˆ∆	@:po2•1˙¶Kr*ˆΩ8πÅo"X^`µ"”§†ÅókÕ"5%LD$_rq9Æ¡àX/§%®PıŒàˆ)ókÊ•x√NâôÏCVë_€TWko√–uŒdùŒ´yÓq‰·º‹ÄJAê∏™≈Z>¸ÁV}˝dó0l™`?^å/È6lR’+´\W›;âıÒóÒr2`ú	
Ω›o…∞ë1»¬i˘jO‹éVÚ∞≠)qú#LRÍ¨≤T€¸§øûxwÁÜbñ|Æw‘	r z˚>HR®IÖÒÛÂ˘qÆÁø6\â94ûÌPFEí3≤ÌŸ2¿ˆ …4ŒÕÿq2xQn⁄˙D§'J‹ˆÙùG&∑{!ª·˘f∆ÆCÆEhÿ‰à¨ò-]%w]Ωs§∞l:0—≈Ô≠˜NYÚH’ÀN¨∆‘>7û^π,’`[™HâÈ®‘ îÏ»z˜Éê-≠Ü_Yà≤Äu•∫é¨t\(≠+7èQØ≠Õ	*‘N‰N "fjãÁ‘ £a¬€;Ï-Ê
f/*ƒ÷¥jÛ0≤Y∏X=´·_ï≤U@øs‰x“ë˝˘ fW‡èìç),Ó@˘z?Íw;+¢EA≠wºÑVª´¥∫Pv·xÕ»+Ï±p≥ÒãDŸNXw’÷ﬂ¶8‚˚Û+ÆÔ∞Ö›i[i˝SLÉ´:vÌ5ËÌZqﬂ´'0v“ÂJ∞jë7Ä∞¥¿˝5lŒl—:x©äÚb}Ó∂(»˘˙‹À ÌEEˆQqÕZOxÒeƒúæíU˚MÍ:æ}-©∆qi∆ƒs•B!*ççÃ„ '„l“O2∏◊¨r7ÿk(ÌﬂyÂîV¬~„Ú<wå…ß…(¨ÆTc<¬ëÁåG8§-îny2éì|ôÅå“M3 $iæ¸ŒcQX≥q∑I≤Znä ‡©6E=”nˇü™-e•-AZ7˙æxÓ.ãYmî—]XÊ1ŸW—≠9N2*A≥à{Ùy4N˙óÛæJb‘¶Å©ÏÔÚÚD£,ùF›»WÆm/œìa0§R›B&mvóä"∆ØÑû„ô±ÏM∫l,mπÕÊ+vˆ
ê4ˆmèı}#ÜO7ù+Ê‡´AÑÂôΩ•ıÑ∞à"§|ö'cte∆\C∞V¥d˜ºJcıïHvïÍ'”,^ô;k\<Õ¬M›’jÛcä˜ﬂı¥˘R¬ö[mè£™(Ó⁄Ùóè˛r›y±ú«y˚QIˇ|•ò<ïoœì◊ÙTI8ê‡]d’ß2Q:Íï∏ÉïqEÌÂóH‹)T`Ö\Ò£¥Ôâ:ıF~Q8*ºÔbçÕ™#˝ª]¸ √ÜÉ≥ñê7÷◊‡DNÅ˛’|N’ÌJ¨ÃÆUΩ»˙&…úﬂzºË∫¡c∏ÃÎ˚F¯µ/A˙z`‹Ì™SDqv«¿éìrQÎ„£/O˜˜^Ô}æ˜Ï‡À”#ôö q$f¯LŸwªÉÏ^◊ =0V^RÙ…áºcπ£éﬁHÅ·^â÷7€∫4éŒ≤‰"¬æ—.ªg3+O›Ã;júÊìÛÊ⁄<≠&Üs∆¬◊ˆK”±’2kHõ¥¢ÖS™˜Ièäòk5D<úÛpòtÕIíU”õküYØÚ`¶/«·VµŸR∑¥ºº∞øˇ={ÒíÛ¡Œy˚å9∑G¥Ó≥ ÿ…… 
} ¬G.¢¬∂∂7IÚG≠-®√ÌOÿy<¨ù∂V‹\∂-wnVeb≥e6πUmÛ˘tÖ	/Z.?◊Ggﬂ à $qﬁ9zæ/∏¶Œ?RøòÆ≤˛KI%õrZ(SOÂuˇ¶–ÇÍ¢g}˙P˘LMlcŸâû\|ÿ‚)™k?œ°˙V™/
Ÿø±˛I√ŒÒÆ!Hæ†≈˘˚≈á‡~9Xpﬂø9¢ˇÃÕ‚˝©>§∏Z€æˇvËw≤◊ƒ$XPá+3w)∞å-ëj:£∑˛-#\}‰µ=\(ã†πAS›ÓË
˛Wõ—Z-fDQÀ"ˇ∂∆\Íf≈#€jHÿ√”, /∑[E:ª~÷»t7 ∆Q*M={—3uÙ6é‡ˆ™Ω§‡m±Çcaèi∆jÑY —o›îd@öã»k!!˘(EFäké)´Ù	°IrÚUNùÿ2b?'y<äÉm/®HùñtÛV[ò“ßñÜΩìóÅò‚Ü8õ‡aÑ |b/ÿ≥]Öˇé˛°Ñº5≤+@Xß6øƒÊ8ö˘cÖj7p∆Ô%l˝ı/Õ:gÛµ8€gücN” N≤¥u&©ŸÓ]Ïó˝c §ÃæÑ7ŒVp‡Œ∏c"óIÄQ;õ-1™2íK8Ê3ºÌŸ–5hÂˇ›M€JâÚﬁ<$ ≈»ä ∑ﬂ˜Á\Ûl(jŸÕó@¬ü—úàcu®˜ñ0∂¬‡ÜÈüÜ"ızv‡÷T˙—ã‡nﬂM	\üœ∆[◊K°÷d⁄÷j20†X#.\EöAÅÚ¬^?∑¯xÊëo’#‰©kìm£Xgàq-›îö\±Æc¥‚N”÷Cæ1ô◊`ML“öT±«l]^JıÒ˚¬√•œ<©te5j‹Â
˚ücˇWêàË∏ +ùR#tû£>ã_'X0´óÀ]Y;*∆¯úWÓ˛¡>ñÅ˛ÎE˝µ=ôÖ'ê_õ€üX qÁL•j‰s£¬Ø9ÀÒ“pÛ8^À@Ô˘Òö‰xûU_®Dã¬EÑ«qöcÿböÌM–èaáªÏ¨=„Æ;uÁQaô…Ûåòf±◊·≥œ#Ü¬'>ñ‘¶òù)”w‚◊›òá•F©†=£®ó!’i"Ú0;π4€kÇÏp˚g6à2§uÄ9”¥{˚G˘ˆG<≥n‹√ûXÉ3`w#,≠≤…@«‰<Œ®4mØX-è	Åqä:ˇteD1Z[îF£3ÚDg¯ú
Öaªπfÿ÷TÚ©Çn-∞¯8[K6eÎ]‘õïe{ªßœÖó}∫ü({[ ÊWT’ﬂÃ∏üú-é[‡YÕÊÎpæ#sZkî»uZ ˆ)π˘(Ó&Q?ú¯Ñ!M—ç⁄ ∆ŒÒ¨ÑßRf·‡5`=oIï1ﬁ@§ﬁƒcë“rÙ•üqß1ÓË]W¢B˙!Ñö7=wulièJœk⁄∑T∞ÈÀt#ÊÄt5†B˛∞”tÚÆ"é€Ñπ–¶øÓÃÖ“`û“≤Ò<'<ÆµﬁÙ@9ÉnÈ=WƒÁ{Ü‘¨ù≈åw QÔlÏyo=ΩÖóá»k
n¶Ìw~Q#ùÕ•JÑ;∂œ'ûQ≥˚≤:\≠ÎávDß	˜A{y!ëwZ—aN≈Óœ¯ızóÒÏ;\a[<”^˛œﬁûÆ∏˝€˚›I?¨fà!ûÖ$oò®¨m⁄∆€¨M‡kµ,vê8so⁄<øÌQ ∑¨/„°ﬂK"êdCÜá'Ô≤à«ùcÛi⁄è≥€ˇÇdDY˘Ù—L\≠1¬%6ª'’wˇkQÃŸÍ,
0Œ†hÉºﬂ:¡ı∆áÏ$Pk9,p√"í·Ÿá¶fh˙ÒËfZZó;{pEê`ÿ˙ IVÊâëa€>ÑQ&¡ÉïÄ<’Ò√íø=∏YÄEw.D)ógè÷Vâ˘ˆ{qb{¥”é¯ CÁ“Ô ÷˝≈u|ÚEè˘–•äJî8‚UñßgYÃZø04 Q@è•öÒeòÌÎx(Ú7∫QøÀ—øπ_ÆcC∞g.∏“(≤x<…ÜÓœ„¿Œ¨9Bk£•≠¶wó'!vLRAº:†ÒñßµWY—¥å∫‚·UpNúã’ETyßØœÜª[ê	óoo’¡y<N¶i~”≥∆‰Ãí§q¸]Aíß†Ó°*M>ıyAØl¨R oåµs<ﬂØVRs≥b)®z7ˆÏœ£{ÍP·8Ÿ|l+ˆÖn)µ2ƒ˚-£.≤*ÿ>ËPq?*Éµ;0Y.Hnñ@◊p?§rêGgÿÛ˝ãˇÁ3^ «È¶qÀÿeÄ˜ÎÄÍ•UèëjX<ÏâFP<ÜZÉ˛√Oyƒ4 †D ÷]¶˘x…ì©˜–æy,?{∏Ò©5NŒ—KÚË¨˜@üâ¶Ä!EÜœá⁄Î«'QôÃØ◊FQÃ{zÇƒ˝JyV^ã‡©≠Å˙Qbøˆa/ÃA≠®˜‡z+è¸√?0Ì´uêµ«ìúgLÅLﬁù/©∑Â∑˚c˙&ŒrÙû~p≠ø+œ£î˝#€∫˘€_“‹YQbﬂÃAµWÁæ’øn–aâøãJN◊”$æRÛÎ$GœxóáˆiÍ»∆{ÜvYÍG/Nà„Í·aœ.† Úö±hãqñ≤‰–?zD	ZÖ«…EÑ·ä¸Ôa:ç‹„w#–~R^äé	›pÉ¢~Ÿ `o»„{0—0œä¸Ìøˇoe|–Ç‡Ü¡¿)åôa‚aà@åÖŸ®fc±õº¨ÃÂ`R√uˆ0ù~_Å(1~òè3ÄË„Œl◊ìû“†æèÖuz∑8sˆ{Üƒ‰hBFvTåXﬁè 4Ãìu`T•≤XÙz‘ÎâólÔ("ñı˚rÿpÔS-ÿY¯É˜º√›Ta8ƒÃøhdÃ@=˘≈≤/£ºÉ3Æ¨¨√d„N'ZegÑ´ëºMkÏL¸≥ú◊Tk“•`IéDÏ—ıΩ{.Hs∫"µBøq<®ﬂÔ£áÌ^ã?`u∂.!cy∆8/ﬂ:G«õooxÏÛR>–»ñ≥ÓŸ™’_´0¶ZTSGeµ≤¨⁄ l¥P
≥ÒÌhÃ>oç»©“*õ SBåqA<cT€‹≤U€‹—'54ùaÈé~ﬂû„ ˝ãGˇ<ñdˇZÓ˘Ê∫≤{ı`^TNIt†\c[/KP,≥NÑ™‚
5J^ˆÍk°aÁ◊˚G_û>ﬂ;=zur∫w˙ıâ¨˘9,Ì%&¢ ?nÿ_ˇCéD¯ÊyL^»qg∫ﬁ¢<é{{cP%{Ωçgœ6ﬁ¿á˝˙◊ªÉÅO≥ÙEAŸK¸p…‡iz5ÏßQë™y‹;ÔL-]G=~)rÖ jn≠?–R5%)†˙»RxU©Ïs¸Ù≥Ê5÷n≤pïióJ4◊õÌºìœÈ[9†ì–)Î®%tÇæïoHBÁ¶lí†ô?Ã~Ã∂PTB‰ö∫‚“—2P≈rjNΩ"õFÖûÉFﬁ∑–»∆æå˙fKeÚ¶«áQ``Å®m â‘Ô‰…È˚‚‡D)‰µ“6ÁΩ∂èA∑‹˙ì≈D”†Î\®–ÆO˙ÙA+g+ß
,åù%C$V÷∑⁄[ı,¨∆Ëœ⁄i5∂#H'Ë®êF«‘ÅtR£∆N‚¶E's‹–2tC⁄
Ï˚ÚØ˚”7t˝;Ê›◊ªY˘÷¡˘Í‡$Ù3rw—∆úï,ú	ä¶&,H„^7>ç]/„\ê-Ω–¥0‘ñ†ìÂú-HÂµí%…/*ﬂ<(Ÿó˙µ¨`ßﬁIÅ [n≤%le=Ån⁄O≥‹Hj¥±¬ìÀ$Ó˜*©}TUd&aàvYUì¯ÿ∏¨ŒI}Í„πe'æAÙzÌrÌ≈É”Àó°wﬁOØÄÖ`¸8®: ©÷Únñˆ˚gë≠ˇﬁïH„‚miÔìMFˇ‡
ﬁ°r¬Ú9@Tƒ®áf¥,ÓG@	Ad3(%⁄KÌÒ˜l˘†¢éS«qFY’ÿãúgÕ_¿â˜“u∫KY\KCÚÒªcºãÿu%>èé£a¨◊ ó≥>“ó©ﬂÉt¯<˛~Á„˝t T¸,/◊5˜`_U…CøXøíB ¿˙
µ≥ºl˛xêei∆•ó_±õÍbt€ZêÕr‚¡64ªPı¯≥∏{È6ü„œ√÷@¨÷ÈŸ„O£‰5VG°wÓ∆®*5≠
¥˜∫›x4Fk#>óÙsM“5p∞:hàº´ı™‘ªa,>Ø‚j†ÆΩÂ^◊5KŒYÁ^íkwb≈~Sñ∑øï¬%¸%xÚ< c{JÁ•à	yA°˛ÖŸbqr9Ûl¨ô∂û»ù»%G,ˇ∆éﬁñ≤√øHKæÙâ©N^ÈB˜c 4a∏§≠A¨+ƒcB¿Fµ™°@(√§RÂ–¨≠2üŒz´∑k‡GEŒ∏1;gqÜ„ﬂ∞Ônî‚‚:x≥|ñ/…∆⁄O/í!Z~≠3MA¿D?!u∏%‰?≥s"ç¨,Ó¬Õœ?¨[cl,Œ•v›zã∂v6 ˘€fóìÌhyŒø!Wÿ´+ºåGãçƒÕ∂îï@aÖœÃüäò2ìDXdV≥Ó¨ìæhÒcçX±òÎ7Ò‰E dH „ıﬂ≈o∏ÄRÒÚä‡[ÁIÇDîéc¸“eP‘ i]6©.• Oj•JkßÍ¿‡€,≤˚ÜXº\˙n
òôåÒK„‘MRT9dø´éünîq%ÊàVRd∑q-T⁄ÚÆ.ı,Ü{÷{BÂ‚Ω»ÜrúrÚ•p'æ,§;Æ†©“›¨(Ø˘a◊Àx—fá2¶]ÿlk-*°ﬂØp⁄hò`¬µ|îëØÇ oSÔﬂÿKøXg\Ê2KÈ‘].≈ôX4Ÿ≤≈÷5?˘ñ’Ωå{ì~\xŒÉƒDÀ{^ˆ–|^zËônÔ.Ä@dÕŒ(√°P•Ex◊©‚nŸ≠ †®ä;kJyâáÙJ	´ﬁjªT5àï|ª‡Âò™* &ﬂ ËC%µ/J˘ë›≥•ù”ÍUX8¨5∑Uà»^Tœ©JCCòò£óêÈÙ@8éﬁ`@q˝•%∏ õe†∫Ú˚Jõ¢Ö≥Ç–ﬂL•çB·[tè∞∑ZR≤hµÅK∏fÒ Jê@~ÉÚŸ\‡faÏDiø ]W˚ë∑8SÃ~ù
Eï9ªà˝–&`ó%ö∆… ^Éa£æ¡\•-®nÔ3êÖÙgTÈπLˇ@)ByKúçQ¬¸F”£hn”Úù:y»!µëÖ
Ó¢¢O=“á/E¢{ug'JÁoÜ]ÊL”¬¿Ω±¡æö$p‚Ï)–MÆ—b17^KÍ;¨Òñ‰c“ø;Ëá°˙,ãF@c)˜ãò7Øä#õû[g¡ˆÿQ÷[ÖbÚJñdl@°/Ω∏,¨¬Ü†àN+ª,«4–¥’Òá¿<ãVhYl+˚”SvÁúÚyz1l/#L2Fª… Uw!r·6ãâøõ¿ˇØ≥S˛–EM-FüÁXˆ^EcúCΩ"÷0(åªãi	XA©1,´\L˙pu#çì)¿≠Í$æô≈pL˜ÕÉ`i=6≈˝≥®ù¯±3ˆd%ã¡US8|Tﬂ.éê¨ÿ≥xxƒ”4)Ù)üTœÇº'XYÅ:÷>»0Ω:ÃSwtéÁ-ûùP¸Y«û‹√ﬂUëùBtÌ©†rß)|ŸQÚ∆ãçØ≤òî ·∫äòd2äŒÄPØügÈ†≥L†ÃóW÷˘!vÆÀUº:«‡7mQ´ iÔ ›ﬁ¨¨«ﬂwñìﬁ2"Äoå+RË¨ã%Î.ë,¶óÈ’^?Œ∆ùoøDß»yö ™‰˘Ìü∞RŒ#0+¯øãëõ¯˙˙ 1„"æ˘=Rˆ+fQB¯å˜6Ëê¡ˇ òd6´ÀX>™^6π(\
èK%Y•xü‡ZÂ¯ıª¬ ÇF,—#ï»¸á≈¶—:Cø‡4ﬁ}åØcΩ'å{LßÈ˙r›F¯9ã„ÄÛ•àÍ
¯W+ßgú%†h,vO9WÎë¡{˝>»?qŒ√¬ﬁ`©¨+≤Âƒ{d¯°é , e√¢VÏòÅ<Á8Ö[∑ò¨óﬁA&D,,h Ü 8≤y&√I$2ÈÑœ¢‰u :Á˝…k,zdïËyÖ£¨ÓPr8gJ´ªbQëçDÅ∫p´ä˘3¯ó(1öc -«/ÖÆ+UŸê§â≈Ï(ÅÆN⁄P¥ÛπÅuPeçƒ¢$◊€%zŸXÁ*¸¬3˝d0ÇÀ1ÈŸ;Ê‚DÆì¨
∏%dxºÇKp◊®‘ƒyåÃvH%Z”◊… ≠ûO p∏]…˝∞*B¢u 
C+ÓóhO&
∏ÁMÛ'À4¸|p”«úÑ°	òoär8Œ≈é/˝fâÂÂ‹$Å†÷/{bUñdù'óÚCV#t∏B·Ê8êI!‰`9]4ÂÒ™¿◊U≠AÍ‘.$¿LK"Vè/œkY¢⁄ª|üàIíÕ	–ﬁ>G9&ItQ˜í˛çGÙ˝$ôœ:◊√‡93X¡ıc-“÷Ú‚rN≈så Ë•r«J¿}NæîUQRΩõZLU2áXV|CÁ◊W∆EHÆ≥Ωã¥Ñ$øtÿi?\Ó[µŒDπX€ÑS0Öt›˛Ñwcï_∂…∞±s ZFI…∞õ•C¬Má &,>É;S/ãΩ¢PEÏ—w˜≥‰s◊íè~MÑ∑§s†çÍgàÕE#ﬁÃ_:j=I;6dúôÓÍ3Ìd‰@ÿO≤n?.ú›ÿ|˜dı:˙ç√¸e±b¥u
'Øø *ÅQÚöú∂4,éì— •˘4›øD{†ÊGŸ£oEıõ]V5˘˝™:<
™'∆˝¿Hgì§ﬂ;.æÈ(‘ÛwÒõ›ruËã]≠¸x˙fk‡W CgÒnB7â≤7h◊Q÷~R^B7ß˙$˛≠¸Ãa±´¡§x‡¶>H=∆“ÎR=ò
jŸú.’«MèK·s)u˛i±„√Æ¶øãÜ∆VS5VÔ¶}Kì
ÏHe±Íi£\≠Ωÿ˛Ñå≠ó≈ø0¸QÀ’B$q¸ÓÁ≈y◊Ö∞ñÈ∆mK,œ∫èÆøΩèG˘Ó∆àÚÎﬂgò®cz⁄`c∫µ¡ìL÷æœ`ØΩx„	¡Í˛ÉÕ◊ø@FÛx’˚˙˘!JôÈfÓîËΩÇIU¿--}ıƒPÏ:‡Øv.•ã}ßgﬂc]C	+B_dÉ@ü≈Ÿq
b‹õGK√tM~e YKòÄó nÓ+7Ÿ£SfÚµséQ=gaú&^±Ímû•!’; ,?=3TÆù¥≤ ‘q¢·Ô\Å 3Ç©†>E›¡SX©¨`è. 9S≥j´©›÷ ÍOâBÕà:ÏËÊÔ∞Èü‚I..«l–« »Î
∑nÇHM»AÀQˇÕ›ä;ﬂ¯œ∂ÜIz,è›@2å¶†è1…πüåŒ“(Î≠_e !¨–—©lﬂic)‰”•‚L@t%Q/∫∑d/ncS(4¸Y€™ˆâ|M|@qsYE*?ù"≈w;6øÿ\zE≤®;N¶Òn™1∞®!â¿^GX˘Ä f‚ì´E‰€F)(`¬Ìü{…E @Ó„{-s?ÌG1“üÉyC +1¨Ù«·ò.hìŸΩ÷v¡›óã—*S7…?ùÙ˜4F∑£à=kf}∑&Ã˙é3¨åá;x›ÌO0o}·`˜˝·`ˆJõ˜)Êêï"XæªE‚‚©mCµxHóï+¸Bﬂﬂ∂Ñıë2ÖäbJÛf`l%àw„ã^säNoX@¸CDFﬁ^ú«‰◊ '√b!È¬—ÿÓÒ5∑Î≈=¥¿`Â‹¿˜Jw∞B2Oû√ΩÙ˝vÄŒkﬁ»Ö[‘»tñì/>?èìq¥ÆﬂØë¡€È6	Òbk` â1"£§~≈A€%.¢îÀé≠rid3”≠ûfQ~bQ:GˇÇ@Gßd
∞+s53·–»Ë†9©ëO⁄*üVûê'$…àpı ‚?É£àñ¨5L|I@z ©5YFÀ£x&˙&ﬁ˛ô°C$Õ?ßˇÀÑyò÷¥ò∑Œéh6∫k@Aª‰(.€n:HE#G§(9DfˇEwQóÍc"sµ>ºŒ’—¥ÆP~•saç©gÈk‡¥¯/§:òÒFkÁÎ#–è/”ﬁz:¥◊k˚¥ÚØÿV˚?)#Ì2À3’…Va&•∏õX &∂Èﬁx'’®ãpP•#kFóΩÏpXò‚«õJ◊Ü¬Ë∏˘∂≈:Ë⁄”Ÿ{qˆ◊>≤È≠◊/ÆY _Ÿxyï—≤‡/PÄñŸÕ*?ˆí·%∫:ï'û Øî«‡^å£ÙU7CGÅ˙>¸Äwg?ª˝â~2_Íë√‹Úép¬+/…%1p‘6*î^‡h@é*ZÖÖ-µBMƒºq6âWydË.√π8ÍŸµ
≠l…˛î+§ñ•·7ﬂD8,mΩ º®Qñ˙póåN©)f0eMy•j4Æª0@ùéœ
OKèfõJP}™AHÚ˚LcU„L$∂Í∆¥QXıâwî¿b»˜¯éÀÄÔ÷$VÆù¬zS3kb«ãËqﬂƒÙHHJfÀì6ñ^’N∫‘≤i¿>0+r≥iV$oI≤”™%âÇJ˙‚tÃÚRÜˇ  ˇˇÏΩÀrYí ∫œØ8bÁÄ,|I™LJ¢å"ôôÏëHI©´õ•+Å ï êR¢`6c≥ò’µYÙ5ªfΩπì÷ã≤Z‘™≠mÃfsÕÜ“_p?·∫˚yÑüGîîôU=∞Là«y¯Ò„«ﬂNó˛)πD«ßî˙Ê√Ho©Ñ6G~¶ƒaç"ôm˝ChÇ÷0QêíDÌÌnµ˘—˜ªª|?◊Øç ãD;õ¶Ürzz∂ÛÕ˛õ£ìΩ˝b—}•ågTªàgDéQ≠üù”)€•:P◊íÓÎYEÒÆ o¨ÂıÔíà±d›D¬¨§ﬂ!∆¯ôí/+Å∫hÊìã|úå'â fGkZ@⁄l`á	õN“Óc≤Œ⁄^óËÒﬁ>6…sñ˚#ºõïs¨•—\_[˚Ëtë≈É÷ÎªR@Û>4A¸ß‰Å>Qî`H{x7˝Ó›#ù,î^è+òÖﬁ‹Ù›)‹˜‰ﬂÓå˙‰¬ƒÁsîåogÓŒ˝hZ`ï„¥ì˘uñ{Êx◊‰gfØ8æÉÇœ·„mÆ˝Ù©ºñ·õ◊qó¸Òjì.Û|åw1a>›•êxÄ€ZÀÈÌ"Í#¢@á/¢qÔwÕµe˛Œ
»}-…è∫0ÙoTM†ó‰˛ º—å‰ìç;yö‘∫`aœAïX®g1ÒXúÖ<_%πÙÑÕ0∆>πHÉ˝´∫Éö+ÿÙïÌutÆ”ã¢D^¸E0iK8'Vπ›ﬂœÿRm√ßıL∫Ì^äõ+_bX‰K<Qw·Dm∂0uK·m|x˚?)Û≥°ç˜hùé1Íıbíw®NK‰é˙[z<'Ú†IøV=AQñ#Wû' ©õg’˜Rp‚YDGÜiÈ5qπdXyˇº`G{4¢‹0(`Ë+–BPÔß¬~˛f:gmfò‡oÙ>úÜ•;
¨Jø]3ˇm¿	ÀvÄmõß¬•˘‹!Ûyâc‚≥®{ª ‡:9§—«˜}Qmè2 -3¢'æV2<ñÕn≥PÔ:9d≠¯X8”4Ô®±ˇBÄÿsrvDIv~˝Ú‡lgÔ(òXg{ü2«Ç±.›-◊†QByÇd0hˆX˝BÏ†L¥:√s†»™ﬂ¨≈>ì +¨ñÁ∑QùÙÓódÛØ®ƒd”	VäI.êÉS”zº⁄ªÓ4ËÒPRÈ`™6KHâh5ÏÄd>Œ˘ˆü”ÜªÎÀjL≠è{»¸>-+KYqÄ‡'òÏèlê.∆_gÈ@ù¡4ã23Möæ·ßSf§õm%√¯3¢ÉŸêœ`u“,"≤ﬁM«@\Ç¥?:çÂt ^árÂcﬁ◊ìaB¡Æ;c‹õdj,i•ƒVÉléå¯:˝˝N+[sŸ+Å5+fΩñ´.ïº7œ`Û*Rñ„~|â8ÉÇ1ÜEñWW/∏√.Ô"Ä(ÀsG`≠»—Ã_&LëêÖJg/J∆ ÚÉv!?#Sfo>ºC∫l–ß†s«Y⁄Ö!‰•ÑNÒ%∏óüí>∞âﬂ· Ìækï*+ñŒJg7eî•‘©.äÌØ–‹Ú4B;MqmÿπC†ÔgÔÑº0Ñf<˙[Q«Xà^%*íQ Kv´/√ÖpVÅ˘rÇ—ñ◊`ŸŒpF†ï:Q:Ü´ì%&P˚3ÏDxT]‰[^É’#òS˘‘UÏÛΩ~≈Î≈Pv3B≥6<|JGI¿íÈ¢∏±≈n¥ÙΩ™wIy6JÖt)5í$Ü¢~‚ã»Ñë≥iì"…;9$ı·ÿVÌ=Ww7ﬂØ‹ñrWûN.HO1wœÖqjêSÖ<LÁÒK·œ¸CPc.æ/ ?≈›|PÌ≈9˙–•BÍŒ∫’ı÷Á¡lÖ*æ˚p˙d`zfí¬¨∆]QÓA) IûÕ≈µròï$$7`ºk⁄ y†[¡ï’ÄQ©*´qjﬁDM„'  ìß+»◊'›ÉH_G˝qDûäÂ!ùı •tÆüÊ∏
3ÔÑ£ éÎÇŒH!+è’Ñ1>J3~ö™Ç≤Ö-Ä˛)búCs—úÜ∆={∂Úï@≤µ#‡i´8⁄b÷í≠ΩS˚∞ö;ÉJEo€bzºÛ˜/ˆœﬁºÿ?˚ˆhOôÕﬂüùè⁄r`§Íd˙«¬‹ku®‹H⁄?ËÑÛŒ“0∑U˝^ït|gﬁETa˜\JQœ≠Ÿy-Ã2≥ Xá•/+)ïVìXTäﬂ°kˆEdÄwîMﬁcÄÀ≥5Pë'Â{L<˜(M!L"Q|`´ûLy&î:ˆ‘≥íyæŒtÁR‡*çdRª.ô¿TÃ~I≤ÄÕ∂:´}¿<Tîa68ùö?≈C ≠+;•T¯Öm8acá!$*IÙÓqmÂy+“qô/ U:Œ»^„‚è±%%†®K[ ƒ¡ E|?ﬂÏ‹⁄Uuf}0àÆ‚É∫˚¸xÛ÷•Ø‘‘iÉ* ‡˝O2˝Øì>Ÿ2¬Ÿc›Ø“©Âø>…ÙO{Q4È”†`≠ƒùΩW+±v4`∏øÎE„|g4*áû~‚Ó∞´
t˛hRÍ©òúöÆ9µ“,ÚÏwU`µı‹ö=˙Ï≥’U±≤≤BtwvœNÒ«gÒªQöçï+÷â:c¨7!óÊç„h-WÂM–˚g®2´o#çXx˝Àé·Åb]ECíÕ≥˜{FæhpÊ»áƒù–Ïn∂Ñ˙"˛ tzT“ÌS`ˆTÆÉÓñ»)øÛ≤ÆÃ%≥h…ãÑí◊i“})khKW…˜â!kÂë°ŸFˇXÛfù©bõ9π1aC¡ÄNÅèè™>–IgRƒwî[‡,∫ÿ¬_'iZ\°Ùœä;"+û*Ùr–uÔ≤CJÀÙˆC√Âh<â⁄ì√éq£4Ò¶¸⁄∫˜»È\çú‹©« ¨ôøÜ‡UÙ¨é√îŒ_o7œ_∑ÿkHTi¡‡≠ÁÚ;©â^â¸˘$7©ñ•øú˘mΩWdïW/^æG˘'·≠Ø’Îï©¿$o‰b7@ÇQç_1=\_~Ìå.ﬂtÜ£ﬂ©_î|ø°ì=≠R™©~U“ø]ç¢À,ù°πh¡I!ñD˚Ì"ª≠Å 0∞a5‘äﬂï∏Ñcìä8úƒó|]·Á„oœ^<ß{˚˝—¡Ù˙ôÃOãsÉ}áπYe]9L—IÈ$uº&Âë◊Æ/Àò6víI‘¬¿+¸Û›√≥-K{ó@Çë2?â&|˝I'K[V·å,Ã¢‘N–(‹}¨˜ˇT —Ô—íËç€ëâÜTÂë ]Ò…~©¡Wh»g¸1€ﬁnN≠’V„•⁄7÷ÄÂï™ÀÌ·6®¡≥g⁄ãh$˜Ø}≠™Q9PØ’ÀŒ!52π!ÿw”ñb¢lE—ñúµ£/Y-È´>†v%b◊¨ñÃe÷ãà˙BÜ√äÊQv˚GıÓ™œÍ!,_ﬁ¢º…é=8π—Ûj	Íé9≥¥≈iJU ≈UE>ÿ”∏•;ò;*FÀ.Z√m§fÄeCWhîøÜ8§Ücx}ˇÚÛ÷rˇS ÀWÔ)f∏ïÇ{L íˆu6f-⁄)_ù‰º≈ÿMZ›∆ôÄW·˛JƒÀ«HIxìºŸËRí¨Y–X¶˘∂⁄ƒp¬ª“KLﬁôä(Ô»3jKí™xúˆ∏õMôKXå˛‹õ:Ω.LVF=G#}˜$ΩiÈD´ŒÏÿB-:=|¢õv&¯˙ﬁ@òiØÒq' V34SsªòÍlŸﬁÙà6ØÌSÂy2D~óëÆ˚Zı˘™)ueùﬁYú,rmÆZç®dÏNpñ={oΩMWË{c”ALõÅ@_Æ—‘JﬂrU§±mm ÌΩ}Mã)ËÙ¯IV€W0„1»¥çàÓÕœº…°wù_W˚:´˜—Zç·Ç]S√±ÆÈëYÕ [‰⁄}MiÄeì¥j<.8ê5øﬁı`¿ kÛZM–H^êe!_ô˘¯<Ü}∂Éπ[¯"W`vTãÄ«¿•‰.◊‚úu»ƒÏ%◊äÖ—M™£è≥A„8ãª8˚∏´U9§Ò µ∞»ï–Å€z˙èACÉ‚VÅ‰m—Ä*Œ<Oo¥*˛ë!‡¯Zëv]µè⁄rpÕ!:m√èíZ∑·4ÿNÜù˛§Á™Axﬁ!¶U?o?°Ü03ÒÏé£“≥eÜá6U†Œˇ.˜›X#ë∞ºÅ'â´”Ω"1ì]RSgYºA64ﬂú)<Ô %Éù¢):¥”Èô©I/¶E¢Ω‹*[FéVª⁄å†çﬁl˙^.òBÌÇ|„‰◊ZH4ŒíLX¨œEœôÿ9πYÎè∆ ¡Ty7PÛ–9t∏·Ùf¬ù:$˛9‘!ªa:Ï∆ó»t˘òE‰(&E@Ü‡w`xÑ'\!ÉN#Áx	+éWØ9Õà˙ó—ELU®;œv˜ˆø˛Ê€Éø˝èœ_ˇ˙‰ÙÏÂ´ø˚ÕﬂˇC£ùè˙…ÿ>’˙ÿ~æó‰£t¬yí´öTßÒX„hŒPΩÊÓ:_É”^mÀgi⁄è£aãX˙û•4;<)hñ¬=
@z*Ói—îÁMqë:ùåù )9
YeÖºÇ|™‡Ü÷G\}Cç)b˙2˝àÜ›ª”-Z—ënÍ£ÂLm•∫:WAì@ëû∂Â Üj+ bq/∫N0•D#§È∏á(Ubƒÿk√$cd~∞¶œ◊bY•™ô2…ëù•Ï¸Ú´Ô˘,\°NbúΩw÷KÚö[Jº?ç⁄;}~≠Õ,'›e°›õ	÷Ï'ùL)	XÃ¥î¬˛=o`∞êÓ5∑òÜ°?,Æ	´5‰ 0≠»†.9•K∫Ü#s“èË>
ÄZøQxI∑y±ª–œ,Œq
®h™ñzá8–4X´ÙQÎAB≈ÙŸä¨ºàFÜí∑õ˛g ˜˚À:o5ÌÒ+Q„2Õˆ£NØŸÏ∫ ÷∫ç´rÎy€œq_æm±4⁄«`ı∑{´0\´û"	v⁄“PAñÆ ¢òf?
Gó'‚Àñzü0—XNä´ƒ≤âq ÒÙC &òÅ¨k(“K[[•@ªn[˚ËÄc-‘Ü†≈v†àD‡£≤
§W
§-…q:@TO`ºr¡ÿrV¡tfW"™Y® $[lÿº$–µΩÇØ‘/üàı‚÷ÃŸ∆¨–Á”‚≠™@·Bòë TnK”@Ñh¿ªÓ§ò]Îà&™ôŒÈ§Ã0†ÌI[Ì∑˙|ÄkƒÊ∆Y¶ˆ'Â¿¥©(Q≥±∞’s¶0p´Auò\™ÈóU±£ß∫÷avÑâS°„^‹I∫icV‡®ﬂ/ö¿ëƒÎøŒ‘âW¶˛R<Uuµ®™9ª∫*ûQXÍŸ—ﬁŒ)£ÛM,1ÜE‘r,[BÍeQ@ıFö]‚{l%”ZE?9-Oiu8.‚™YAS∂®ãW}ÕR¨,oÜÅ^˚ÉhHKNåR≈—LÖõ<îÕËÁ–ÀR/æLÅ‚oîsë¥n`‚"
Åw
5÷ºì€ûÄ÷gWOA?ÂN"Õ«o»◊ﬂ=;Ræ%¬˙o,NejK5≠1∏ÁŸàùg∫ŸÛ	ôOt]ıQª	Q¡µG¨ééØ°o™vä+XF#iMë!‘Üƒb˜ÅgñïHj7πJ∆2÷“†VsÅ,1Üùû!∫ ]R–-‚—Íﬁﬁºt)KQ∂,@}rv¡0˙ˇõCò9†Ãb†Ã◊Ò.?]Ø%på9Yj≠lXQÅ‘6£?ZñÊ]ÿ¸¥|ÑVî~|Êﬂ# d≥ßîË+uD?ç9–¢3äÌ#j|¨Ωboh“ÓgS(FÊ]˙t]æõ8€Ê‚ö—jÑ∫«¯.∑\)›œ•zÕò®[¬ΩB%ˇ
∏^3≠◊≤ÜÓ⁄≤Ï⁄≤ÇÈ⁄2Á⁄≤…5^P-(¶Oqzˆ0ï4^Ü>_Kò"ÕŒ≥*#Àuõp‚àã¥Ûûç»©¯∫</K %ãIÆÇ.Ôè#L£&Jõ¿Zê82ÿ‘V—LÆÙk6≥öÎË¶¿Ûgº¡ª.Üà›XO´≈¿7x⁄òp∆Ñ1f‚’rÙƒu~9LHõÆVΩßeg| ŸŸÇ—‹v‡¯ä6æ~| }wÇ uà†	
d¸æ{0h˝-«‰ñ`
‡º≠—QÒÉ÷µxÂ—gˆNrIÄµ©*nB≥Á’+ûlè&yèó"$˜%î|,vnôcÑÊÈ∂N∂kè[ªô7åk:`¸Íñá2<∏¿ÇÑ"j[Ìﬂ•…∞â&Q⁄ì@O0∫±Xç‚€òìÅy”@Å{“Z±-sµ˜;„yz{ÎâÁÏ,wD˛ì$®4âÄi!ß∞f…ƒ€¨µ
Ò¶iL∑˙9K+-µÅ“˘}bià4î…‰p˚0Ã±Ô„„…Uó≤ì˚ÁO€ÁkØãﬂ√ãˆâa˚ U´/& ‘eÜÌ«∆`◊f—˚gt√e>1eVÔå≤\e˘o˙˘ª¶l«“‚≥uîáÒ∞«{◊∑?Ù—	#I¡ábp6√§ﬂã⁄BV€¿˙–"≈È¿õS:¡¥?Fπ™\ :ñwÆT∫¬)Vb–J5êFcN‚beÈ$ìÈX)∑USñ¶ﬁ=˛zu˜¯oπÆ†%ﬁâ]’@F’{É¬W¸ˆ«›‘êJ6‘Œo-‰ÓËÚNRE-$˘
»	‰=Ï˙*∞ªâ–OK¡Ç§¯]&WX≤Ñ% Uå
lQÛ8K§⁄Á‹>#äá÷∏Æ¨∞KËM1sﬁeöJxuï∏°|˝§Ç)‹º;TÒÂUíIw_£ ≠åB
Í+	ÍB®p	-G∏™G÷®≠|¥@®W#{cô‡ƒyàôà—Ö«mH-òlﬁ·o∏‘A‚HOÆÕY(T6„'=Û2´≠œ6ΩE5·iÚ=mcÕVKcC	Ω[CïdØˇÚI—Üè$óImﬁï≤Z≤å/≥w›ùŒ´œQÇMèõ‘≤+∆Ë⁄ÌË:0rzAO¶jô|‰ó}9uÚ¨ëo·£˚ãŒ¡^=›RK-Ωƒï∑üOqßÿ™TEívÜ⁄X˝"Ø>oµNS5 YÁ7g4Ù¿ÅhØ0¡bmYT•¬GÄ zèR∆wK\
Çﬂ3*fbœ™KŒôÖ¯	ÅwFPFµqí√ØeÎn∆˙∆ Hø˛v¯˘‘Íj¶ŸlÎˆø)€AB6≤≈ﬁëªË¿˙öÊ≤;l¥fN£…çUœﬂ˛vÿn∑E,H}Ë>¥Õﬁ¢ZÉÕ€/°…≥1· ‚J@‹c››—¬°‡c\“¥qË◊?íç£‡áπ}CaÛƒ◊Æ-∫™K”¿Ç‘3ê MóE'·%‰ƒ9vìì	Áóÿƒ‹IVy∏ö}È:∏‚pÿyI‘[é’’@±ç?-[ÓàÒïø‹“#L¢¡Ô∏5s	-Á>¥LÄsZ‡≤BRsßä-IkH‹çñj®≠Ó`[ÈêT‡”è§∞k«WYúø—wz1Jn∞øh»™$ÉKMM.`”√ï1fh∆Pz=PV§Ú¨∫aÃÅﬁ…í£‹’zYeﬂ0®Bs|T,t“ÎxW]M„ÄçDjkΩ6°"]f
dí†§e“ﬂ≈â¨<≥π&∫	zKßî¶?˝≈•øRù⁄(3•{Ú©wŸÚ,=ç«J†ÿﬁnjó´ñÌÛLu	Y,ë˘]ÌÎ¨å]ËÂ=˚⁄¸»ß$WFùjákv©zIN=QD⁄g€ΩlÊ3Nú°W¯±—ï…˘Ä«ìÏ*ò◊naÃ–ñ™Ëâ«m/íGOÅ"ác{ √äæ∑»QZ∏‘B%)h
)ín°ÿD◊’œ+ıï:õÖ&vìÀŸlµáÈÿ±d6í‹8(ı›õ™◊qzpztJò÷lπõˆﬂ_êñVèDQZÎ~0ñÄQ3gë}ö«O‹πá≠°ælSáœ›2 éJÄ¿¬’&“§ 9
5@2_±…[U-≤Á
ÍF—±ÇT…®¶ëIÆWMPÃjZDπep%‚*ü¢D&F<ç≤Hˆ]'9∫–3§g“eáU]\¢´M]"óJjF£ˆ∞+±Ëô,‹ÀTÓ÷£∏˝3#mëL8Í(Sâ∫_£4ªﬂ®óô$ÍÈœ•
ÙÑún5ËWLs"âêƒˇc@˚–P¢yÆ1bÆ!∏2)5‚wpn¡ï^u[—F÷◊r+,∆_Ê¢∞Ó?‰Ù#!âÙ¡cêùΩvx≥ÇñÉ˜/I4ÎÈﬁ≥Vóﬂ|d8TÆ•VïãΩ&)A.©ùqıπúKdÜ?Ö√≈J0¥x∂ﬂObﬂp˙¡åWoó>üé∆âïsÙºÇ.ÿO!î∂†zØ1[BI
$§¢}#&Âo˘8pœß≈$¨9Å‹©0ÑÑ∑ﬂ1a1ïÆFAÖ?:SÙ§)Cë{Aìö2Ù—•JÇ—Ä†+F9 ·oﬁòë"ú*ˆÇ$J)(PHÃ(Ü”h¿hπ∂^k"JÇâ}∑ô°~]Ì∑jr[F¬!±†©ŒJêÿ§˛}–|´KC>≈uõ=≈òÕ(<t˜†13,Ù¯\TÜ≤ÊìAí)∂É\æ∫∑?êÊ=√–	*“—,*?Ã$üEﬂßmbŸjÅÿ
C\lû€ı¬J‡*%ŸbÏëÕãhr†4+π%z)˘j‹C›˝`ÃÇœZ;ÙÇÏÇ>Æ
-AπpﬁÁÍ}c_)a*<∏á}9aÍ5N3Môÿ·ÁZJÒÚƒ†KjåJH>
⁄0[zÍ·…«ZztY‡ﬁÆÃ~`I—’5(O;lQ9Ã#Åyß2ÑG,r†ö:˚_úº⁄¡x˚>`≈~û√¶&ä(π°Qäõõ|,ÛÀ8ë˘p‡·Õ˘.`ßWW}WΩI—ít√¡=Åç< ‚k_ı3åﬂçYh>dëºﬂÓExà0ÈóÇ	ÇA©ôÒj‘Ì6ôW1xKmCoRòvbË‚#J gFì≠ KÈaº X2œΩ–‰ˆ∞Ï{&ÕGßM_‘U'ì˜√µ'Í, pN‘5ï§CŒ1ok÷bgÖI_R˛∆¬[A±\ö‰’‘ãY*˜>Î˝ìgΩW:¡BπÀ¿Ê∑[xk(¯ôG§}∏P≥K@ö€Ùª∏]¿“<°/±á®≈≥∏©†kÓ“o}{f˘Ÿ∆˘ ı´å<∂ΩlÜ‚IÇ|Ä‘Bmv©úƒyßœ‘Èr—6π7*'ÆT=üc”Ÿ’%E…l4ëÈ…≥Œj?πXUDe/ÓNF∞NyK;zì9Æ{e—Í1Û|B-øGi¸rˆÑoëÅ^dzhC‰»›X;¨ÏÈ€*˚ÕaŸ¬„íÌÜWÃÛ£2}>mR`˘RÂÏ6∫lÿ5k∫0@Û¢ˆkmsøVeá®ËA∆&\œ¶ã¿YÛ∑˝EV›p¿.pä'è?<vÖnèTQñ∑“”Uî>3k)´K[Ï≈y¸ª»åyi)Vvz@+Í2¨<5ê≈Â©m˘C(©6Zã¬ŸbfZ"x®◊º_£h;aΩ\ãîŸ‘*–üåñx¥,¢ÖcfIﬁK;áaı—3¨çZ4◊≤≠f"ü¶ç7ê)øé…Ì¡-ÎπØÂ›©ª/ùEπ}o°^ï][è›1„’ê5¯h€ BáæZb˚7{~(H∫?APaæåtò∫à≈˝»àπ•’¡à!=∑‘`xJÙYqQû»öõkÜ[bÌÃMM‚€
ﬁâXΩß≤ú/~_¶/Í–üâ-a±yæ·µLÆ´/∏ÂXËìIFÖÁ9ËO7¢˙C*ßòc÷É[©D/\√H¯ôQ(’≈P0ﬁ∑Vπ¨@§ì$ãŸ≤’•≥-∫”)ÒÇ].è*ôÆœJóÓW›*d∆<ŒKl¶£„,EM.∂j™dº<_Ûö:cJ'71o˝öä5*pyY•µÙ@≈v6d≈¥xÀäíY§ úS˝
ΩÔ√Ÿ·eÓçµ•Ì˚OˇœzÌ,™å¶b´z˚O2aù‘‰¨ûbfå€?¶|ëﬂ–9+Ïπ@±0•Äæ)	Qê—&hßz:˚8üè{¿êJK˘Í_ˆSÿêMTˇ¥áÈçÌœÃ‹’ô;≥XX°yM|!ö6ÓsÁ8Ω'âY¿ﬁ∂ü‡cOE√™ïÄz6}{≥∏-Î&™˚+˜}Q66P7÷MQ·—™Wä€KhÉ»‹¥≤S6D¨ãD‘J¶ˆ÷∏Åhg¢∂
Y8ZE,VÚj7Â∫KWm|ÜÛ"…>ŒE<FVjeÆKjû∂õ,!ú>I»O®Àˆ>‘MQ€*ÊÙö®8"π Ââ@v€-æöäõ¸Ω∑Ú’√¿⁄ÍÙ¸Úgë˛ÒI|ô≈yo˜Ü7ìÊFœG…–Æµ≈ÀŒÛ¥∏üâÍaÈ _
›6¥|uÈÔ˜i:Äø+_= VS’$ƒéÙ(À‹√Åáï9È;≤En	 ÇœyË~ø§≤˙ñæœÊª5Ö˜6¸"4˙äÖ¶¬ıvM©0ïyú\ıp8E“‰í™èNˆ˛«/ÅeÃΩ1∞¢h
èß^5≈gÿ?däßπµ{÷DK€ÍπzUj‘∏ø¿˚7 ¨2&ó»—[ˆpkÑ¨¬¢ìÕy~ii}Çõ	÷('Ë<∏|˘d }…f”B{pmIDùN<í—~◊œﬂ-„øV~Ï^“Ì∆C"‰Ü§”[Q&ŒÇÑ
ãÚ⁄Ò∆Œ¶Æíè‡˜ÒÙê?Xax}%«* √)ïÎ$˘–=E!∑Û]”©4P´à∑˙y≥Úï Ídj±ıØ∞TÉ.m™»∂æf◊°
U®fô‘Â´åR'PTØé˙}’-VÍôÕ»›b#bÚCµ¢ÒTÂÄrm»ÊhÿRÀ]‰@1“–¬+Ópˇù≥hKUk&”è[—=zÁ¸Ö/Y≈ÚËzlÅÓqæ’¨¥°Ì∂§l·»Ø_DCY©Ω+ç¿&G6èíaW&¨≥&∆fºL)/ÜXË<ê∑§d±ÀsW-∞»öéﬁ≠lñóØ∆˙ö≥ ÓRï¨Î’‚€P£%\âï!hÅ‡Ÿ®ÿ¥÷◊ÿ∏ÅJBí¬ã|∞ï±öÚ“ˆ+ùF6ÎóZl˚OôÁıWËÇîëe√3#¢Î _MÕmóÃÊ=Ó∫UÜ4'ÎñKY‹è»œıNTC"ë≥≥óù>Ï9cOíë
)4óÓØ±ös¨æºMûj–%S¥Œ"J¨k{3ZPsÑ∆øQFèPä≤çì,0"TÄ…√ªË"O˚ #+ ~–&^…êîuëU=éá∏Éz˙ÀKuË•@•á`pÂå©‹_:€oæ(Q2ß`ı,G÷Ï%ï© D˝I>V_*Qi~2efÿÃà¢›azmÙô~ã=µK{9[úI¶ﬂ‡ÇÔFY◊*X+√5≤üØµ◊6^€ÏÙ|NÿñÅﬂè{õˇüJdõÇVK)gi˚y·Ÿ™ÒåMØóeñ7ÉÇ≈“6z0DÙ˚IB'©ˆVB˘fî&⁄3∫p§–9åæJeòÀ<l‹jÓ~9ô©ÌÇÓWzÙ%tëÊn´;IÊJ‡[C¬„Ä%àTÅ±˚Î¢Üê¸ Ú£˜+Î ∑;—·ÃUÕÖg†Ã†Wéú Ωü?|p›{=∑‰˚úŒﬁäIcΩgyïJÙíUz\’¶∞
O?tπ'Ωq59∆j‘»ÑÿJÎ≥óTgóÚke!–ê‡æÓêwªPºªYAsÀc»]≈π˝˙{yiõºìnˇ‹%c,4_xdQw£7‰w,Õ°¯ˆ€≠¡†Å(‘ÄÌ‹®Veey
ÖÀnŸûmÕNkV2π «
ãªÅå6°£√f€Uøjñ€∞Íªk≥–AZwÇao3ö®D•Y7æLÜ	Ê6&
∫dN˛µŒ5kjúΩ+ÊÂpQíòïO±dqΩ¢ßÇ»ç%Ê‘ÂˆML%˜©G’∆Å˙,‹‚∞!!t6·≥©»}¢".’+◊ﬁπD@≥—vm‘dg<"tJ÷“¬˘$ØSÁ˘“.¥'mU%4D¶ìeó°\Hh√◊"∏>¥~·œpÅDÀ¡øπÉ9]§≥Äø°öæıMó’Dk3L≤BRÉΩóÆ≠ÕS±·«ﬂ¨°=/ÄDYX$¶ﬂ‘ÍîE5\Ëó”’Ûüæ5±9¨Qv_∂ƒhVDÒK‹îÆä_fﬁ
Ä˝¯rÎDb‡Í»É(ZÁÒû.ÿ’æÀ%R©v`E”OtFëˇﬂÖi°‡n∆zßÓ∫/5M*$j÷C[JZ“¶>Œû,«90Úº“ä¡Çª®ƒ`s#≈€ﬁ
RÕπjJN=˚+_âQÜ‡Ù∏Z><.à „πïN∆®¸°∫¡ÍíØ&≥Ã°Ô¢îõú?Ô,U∞‡Wµ≤÷Ä}‘Q¢”jƒNﬁ;∑J›ù≈g. >,hôßp)•"≈öˆFNG®VR [Bƒ±Œó/mQ∞Õ§∏˝ Ñ¢âÓ0pé…f™öFgµä¶)›$Jª ”∞NìTæ§¢ÕQõ·>Eı<—ü≤Nª∫PIu”π–n˘™ä»	4˛xUb'ª§—≤(z·È∞ Ù]˜]©¡ôy»H¯≈ÌC4‘õk5‘ÃÂéŒ±%ÎÇ,˘`ò-â«ø±é2˚ÃÒ"æ√û-Á¨»nµ:dÆÕ‘mpù≠ú
ûyƒüZá€5Uˆ·∑Ê{üNP£ò∫oÀEIÎyx*‡âcO©D`.Ù%ê-∫âπŒd6m9f∑hJG%◊é˚·:Ûr&∂SP]%Ü·ÒÃUΩÁBäOÀ/R¡PË	)˙=Õæ‘Â[8¥‡wÒS™à(°=¡Ë9◊T≈`'
6x–’ük—‚,áF'
û◊„µ‡¯êŸ.–˝#X\B¢]1Ù⁄Ì≈@[˜e,ÈÍπ|Ò®÷K|ÄnkaÌ÷«Qm}∏I`!X Ç}M¯ ¶4|› çæt9dwy˝^¨∂QÚ˙_ˇC4dà≈TÖ´≥xiwO>ádNe¯˜Î‰l≠ç"3a£ç98ñ≠π≠RÿÕª;Ìòòë05ñmîàÒÏ„PœïXı≥ÃC„J®î˙‹¡Û7˘4 Ço"£ç+G%ZW˙(+∏U@j.ÂòÔÀûs.'[Ìj£≥‹-Ü»˛ TãL‹¨Ëêy5i∂Rª‘ñ)≥}Û)d¯tK)”SK∫Ω∫óöÏƒâµæp9 ÊÍw.º∂+SÙ«√N“Ø≠Ë≠ö∏Îzª∏¶æDÈı·”‘ŒøwõXP3(Ÿ=OGˇÛ—…W–Ëñ«=œ|¢Y-≈(se¿cB|,õeë…⁄≥Y“$Ï{™nM`ÛÍ‚fÍ»H	;+ˇ VVƒuí'È3FØEÉÙâ71E√2,Û(@Ná )VπÌänj¨˜'¬áéB#ÚGÍ&òTõ®HùÜ9>GY‹!%Mîâ|ä0%	i≈´\ ≠Ùæ∆„fÃêBW‘´∂Ä¢üÙ%¡Óñƒ◊ﬁ %F çaº'Ì¶+NuQ⁄˙≤6ßoø-;ﬁI‹¢∑|˙_hÔyGâ9ñµ,Á*Û≠¬°•/U∫[·Gâ˜87+ÒF∏øéˆƒˆ‹á+¸TÕeëê€îMÌ8gQ®ñPNaÔÆMﬁ0„`“õ∏Îsú6¸‡ÍÖâëe$	˘‚Ëæ“ü|}Dí£{ötåÔètH*i9$0´¸îfötOΩhEÄ˘˛ﬁ¡ŸŒâÿ}~Ä˘:îáGØéÃ&ÿπªsà¢U ˜m◊vÚÈñ°2O†Ω˚b˜Ë≈ÒÛ˝≥£%≠hˆc÷gñäπàÅ±≠⁄Ì∂~uô{]Ÿ gªH,í}«_◊ôÀUñt˛Éî&_Ÿê!Æ∂ËyIö€≥=ª≥˝Á˚_Ó˚ìú'üî¯X1/Â>vÌ‹Ó˛ãùÉÁ~ﬂ‰tvÄ*g5GìÔÉœ=qÁ¿s3œ]ô£¿öêŒÊ‡œ…àûwi·{W™ª{;{Å%E#„†*=˝Ê’[⁄”≥ùΩ¿Ü!o¡;åBy~⁄Ì}1˚ãZÏÊ4áqoe˝˛R–Ìra*∑ΩÅ)âºÿ7{\ÓŒ7^”(\ÿgåf*»Äî˜ÄWªAM§˙fÛ„KÆ=fÉôm…Ô©å∑ﬁAì"˝kúV◊’≥K≥–ú™, èW	zÖ®πÓ /çéuÇŸΩJ^˝	p òEÖŒ∂.AeïÅ⁄‚%¢BQ§ˆ˘wÔÔ”;]ÈKŸrît‚Ü˝Î ÀAwéÊ_dD»[§J'C˛Ç6A}úﬁ«o<`ÁD˜ëÜ-W/˙ŒØ"ÄJÉñp‘∏Ê)∞Ê©Ø¸˛ñExÿUJ≠è°“˙î
≠| cÀzØPcÖïX˜•Àáﬁ]ı‡e–µª–>o"$K√àˆ¸x¯Í˛/
]–Ô†∆ºÀ?2∆l0&œY•Íqs¿î¢˛ä4S„†ÂÖ•Ì&k•5Osx'ltNÄv¿Kﬂt2<?	+ÓñD∑#*≥Fîªíp: Câw≥€?Qo]e)s $T) Ú∂Ê€*ÇCÇ™TÔUﬂtT®›JN§Íùm©qÕô[ˆ¥«Ê5ÎËê90CÍdÎ~ 3ÇaÀÜıó¶ >Âª–÷}˚éy≈ì’˚UÙ ˜VµöosÉë„Å8ﬁ˚∫“:e*T"•‰crâæìÚ¶w/Y-Y_ˆfõ“ ^⁄6|’≤˝ëç;iŒ°©…ΩeQ∫êFÕ˙h¨-˝æåıXxYE`~s≤0ÛT◊V‹ΩÆ
,´÷Ú“¿EeZSMXgüÕÈmVŒÚΩãüøí˝ãüjC'¶s8√ºØÛw2=?œtÁmL‡|\b_ç ˛F°ƒ˛◊CÎèÑ∞ˇ!ÈSçêÛ≤"∏œœµKñΩΩ ˚c;óÎ(|çWvê≤πjôq\∞ø _iXiÊÔÈ8@|Eé¯˚+ÿ≤~e≠∏Bæ‘Ó“4€tÏ7,øü∞V—.2dÀo®Ó®≥´è2ﬁìoivµ–áQﬁI®\√GÎZ∆≤¸ˆá,IÁåö˘xîå»Õ~6g^v3˝Ù
m“ì,E j/&÷e/Á›Ω;lÂƒÚ»”†`Va∂¯ˆèiïG]9 +H‹ÙºÚÿ*É@ÊÌÁ”íª3ÁŒpfäYá±ˆd‡ñ©XÕDŸ+D9Æ%‘‰Ÿqñ,Ù
ePÃó,%Œ5ôX”+Ø∏3ï6çªL4U=˝∫-Ω;öœ“¥GC^ŸæBâVÇFÂé&^[%«ê≥æ)∆ôï¯ñî™âÔ†√0eÉT`]†¨†ÏÂ≥ı˚±=ZZÒ;‹A=ªCŒ.≠% îh=¬¿nÕÊÌΩï—ªb`Î2ã†∑È˜ßQâ®R?î,E9óÏ©4BÕ™Z‘√∫,T÷˛†b”ÿÄ™z*M†SÖ‘◊u¯ÒksπSmÙ¡`Ô˚Ê2◊dàSí])CØ®MÀKg.wƒ◊«ßΩt4ÇfüEWö!}HÍ–Éa“Itæ$ï°}l≤ÑÑ0ØÑO ˙Y±*r≤ÊU·ÇÔá Ä‰î ‰"•ÑÉXÄ	3¢,”π˝ÅR.«¨e¢Õé™@–Ï:GH(∑|7˙˝$Ó«‰¥ıà⁄§4_ M¡ﬂÿx[©äQ;‘2&5AØ0ô ZfæŒ)i=äYî;,e#¸›Ì∞§√^$äBU¶~U®˝∆ e˘nG≈ñ¡Ë∫^`
∞ûÖ“|T∂€(Îí~B&heÿÏè¢&˛‚:4È‰≠“c‡ë˙Ü§µ3Y∏=4á@'E&X∂¸#H“∂=2èko¬∞"D7_∫h}ó]„mõÎıöñ‡9πÂo-˜>e5·ÇMΩƒUÅHµ<B ¬)-Øåñ¬†ØJÇN≥,}Í–ÑØ®	ëˇfπ0Ø*∫ô∫∫⁄”∏•;2<æN≠À[©å»RòØjQZ™∑Í‡ä¬ÅP´~æƒáôMµ©ÄTV/Ÿ2”Æé3òÔ\»?KúKx/Sñº√#Fem„.¥Û
C ôß÷TAO¡‘m8w≥Qœç–˝l)dö˚†	?ZA…Œ¡Z£\1†ö©Í~≈év◊ì≤VïàRö¥ Ok•g‹ñ[Ü(€º†™`OVí1›úå9ö£5W≈Z™Gx¢À√|»ïΩ‚GÇLë‰o´‰çêCL8ªUËçπYgí˛Îä4K€í…jö81/Gå’”ÇÆ
»—øJ‚õoÃŒÙﬁÙO€Mèü/qQ∏ÉIR,_ÛÎÖ£óXÅÔ‚|
´Ç¶‚[SΩòb8Ø≥txÇAH•È÷J‹-¶£SÖ‡Aw^v9.Nu:„J;C´ùöƒÕµe±æ÷">Â∫,πõ˜|ÄÄÎäm˙P]ÁN‚Núå∆œﬁt;Ø©⁄ﬁ]PœäNöÆk˘ò+brOπÆH°p`G©ÅcsçõS ¢≈Âæ¡‰6Œ!W§R◊ªÒe4ÈÊñ3¬w5†|HT≤|øínb–Æ'âÛ¨˝€C»¶PyÂÀñÌ6?ˇ0-Oya◊Ò·±––5‚≈ÈdÄ∫sg¡`b¶ønw≤zÏÓÑs˙’`*cÄÂ#ŒBôs]lÍÉ“Ò ]⁄Fó£Î∫1–ı^TrÒ“Ù	@ñ,aéÆ:Ôè£§kBxò«TõcäÃ`≤Ä©˚b„8∫J)‡˚Xôd´r,÷\ó˘°Ω%kY√µUí%\SJ|4&ÏC8ßBU’úï
º‘ß>ÖùÒTfO’C™y¿V•@°O(ÒD<ı®LM[ºí¶„í¸Œ¢ãfcã|◊„˜ÉN——$ıeX-;JŸU?çëu/|rñï«ë‡'9Â¨1õ;ÊûP¶6¯Fn¬ËI∫N¶™ˇı?ƒıÁÊ≤6Q}™√™SrX˝≈SùOrLÕ;¢\Ç7›=:<;Ÿ9;zsz∂sˆÚÙÕÛùg˚œOœe—ÁINÃΩ˛ÒWx q%˘œ‚‚¶uyJÛü˙b¬S(˝HßP˙ÅßêCÈœÓ ø{ÔûA˙íw ±ˇ^Nú≤<zR}Ù|™#%˝k=R“ü«ërt≤ªÛbˇ–=Sﬁ|}∞˚ÌŒy OñÙØ·d…√…Æ¬ﬁˇV\¸ıQ˜‚ºøî%^?i©‘@ˇËr◊ß*£ë™ü GcJ©v2 5ùTQuûëıTa<C8sIíMøkît;œ\ËÏ©jª⁄íù‡‰˛¸ºÅvåjÖaÕ	∞NÕ§uøf“& ˛4m 'õñÍªÌ‚⁄ú∆ó¸¢™	ª¬AÈâQôœ∞"ÄW?·™RÊYE2xÂ„π∆– Ö≥≤1°Ç¶r-Âç—Áp%œ´‡∂Æ›¨≥ˇ~∞ëŒÆ^´ÚØ*√co‹Ód˜¢∏0@·Øë´Ñ"g∑?î{ ÈœîCÚ1‹ﬂï1⁄ÂÛe∫7Wë:c§•Â∫ºÈk‡6Á•ÎÕ≈Ì¢ÒoˇÙﬂ≈ﬂﬁ˛ .£Ô±Ê‡(%^G}t:Ê4¿mTπkLRÎTPòU*Í_aé®ÎTf’ﬂMqﬂD◊(,ˇ!“~O69JªòH*6R÷vö †1~e2j{©˜=¿Œ[≤*õıºC∏tπØßæj∏á‹!Ã˛ﬁ]ßÒÛq“G.Ë"ñLnØ9µ$I.`æ$P}xﬁsc‚ÍàÂe+Ó’ÕqÊ˙xò7
≤[=∞Í≈ú≥◊´ÚgÓ“&Æƒ€˘AfUé÷Â,Ã≤Öù®≠Z>•¢à˚˙¬éÕd‰C$_ÉºêI9_P:ïjäËDÈ
!™v
›2∏U—»ü+PüS“öèNŒ
P))ŒèRá”≠Ñ¨√ˇ~\ €)0ñ∂eâÁ∑˛˝$È¶ù.íÓÓÔé ó—ù?Ã-Ò§‚≈ìﬁÊx(†ÁBPÁ∞´ı‡\ú@ ™ıO Èr’ÑØók9‚'Ïm2∏ñ¯dWex¬i^é◊áK€˚9,ívô∑ºﬂ*çyæöÎZ(⁄üãIS¿¬ÑöôJÿô`Ê}û #‘z	ÓÕ}ˆŸÍ™XYYß˚'Øv˜OÒ«g20[)JH~Îƒòôm“GwÈÊT®™X,&æ3Ù»∑Øm	}Û“µxfTB≤ŸÛ|rq],Sı5˙äé¯ìúRê≈èi˛„ò_g¸5˙çÌ¶πIÛ”Ì©q ’´MÕ˘ÎÌÊ˘k˛ÀºπÏ§†„/Îtt≈ã,«^ë~œzEÍø$BPÕ_˙]T	¶üjÿ äväãt<ø¬T}[bM^Í¶7√„Ë=b±}cî%i&´
Àt=çœdn¯CŸøºå;cK#ó\äÊ={πZJ=%ÒEŒ˜0óﬂO‚ÏΩﬁ"¿SaMá$6ª∞pÒFKÛ–7Ω8í–ëçtë4<yÇVoh∏–Ø¡|ˆ^“
k|©‡hH¸W8¨‘gÈtçÚ^:n˛~Y4sı√“7≤ı7¥ªiGör(¨@Egu…Ö≥›nw€XwâíÜjΩ°Ã0[Áˆ‡_K–J…\/G6-˙sÈ©ƒ$ÿÅ:YF¶ºmeÆîgÔÕ–eë	µ∑óvö]¸ﬂÇı≤@‡°aHµgö6˘f¢ç;=Å%ª¶fÌÜy⁄è€qñ•Y≥±Dˇç'Q?˘Î⁄»6∫©–$jÎXÎ&ﬁº1«°Çt1ÌjDCç¯Ω"µ¶å¿≥Æ±ac%áìEí+”qË˜›ç"˜ä}ıHÀ@ˇ÷€bóêO‰®Àê'9Í!∞©7#Ÿ÷…¡ÈÇ£`_¿Ö®/ã=√?¿àÊj<Ü ÷^:1¡ –ALôæ£÷#q…8{hàm£ÇdønA√XÆ^Ñ˘+"œç-¢r%K¢NÑÒ_=ª-HL‚Ôñåﬂ:Io`Âp°’Xmñ‰&üå¢‡'dÂ«Ü˘j¥⁄…@?fâj§Õ4ŒT≤]g’
πô$ˆ-qŒı˝£éãŒ¯ ˆ@cÀ\–vZdkn{#.[M¬#[°≈‰O!«D◊Õ’K|£ÚÑT∂¬◊}´≥∂©¶u˘}C£i¯ÚŒõA<Ó•ñQÚé¡DoÁßü¬#Ú+ÈÀT<_‹5/ÕZmYeß	_‡±> L¯∏ıÙ⁄∑ƒ∏ó•7Y®CË~ÄTyÄ(ÚÌ±a∂«∏á˛Ú¥ì •÷GÄ´3¡©Y4,ÍvëÄUúVRu`l˘'E"5“-˝•∏£œÿR’qµVöfSÀñ@é-åó˛J54[Ãö(„¢+ui1ºà˙òŸvKZ≈—;t:º!V ÒèÌs∏n	¥ö¡#i_3∏dñ<úá∑∏…R3ﬁÜÒ5O„3A^&¿«‹Â@C"ôô#LH“SuíÇN√‹ÅQüÑc<‰ÛT¨
Y¡Æf∏¯@`ùd‘^Ü≈¬Äk˜uÌ⁄˚“˚©ˆ∆~ÿ"§|q¯‹Th—Åô&^î`ŒÉE•ƒ—p§qÇJAD∫˚ÿAÏ—„~àFkÎ)H7™`DÈòB∞¡h´ê7jBˆ I∏ŒòeÏ.ç˘-H®üOõ4î5teûv‡?•Y5£Ò ≥ì≤KÉdò&ÉØQé j¥ó\%òÈlc}ÜÇw0ZÎ≠;<µ/˘L0’£ÿãØ„n’@M•o» Eyåÿ&:)î√ï,B#P–Á>√<¶U	üÎO t€ﬁ˘Ê»XcxZ–ñª˛D29–ÙÖT4–zuØbaÊ•å√¸H/Ÿiµl®(<-ımM°ÒˆMî’aZºñ{≥ëO:pBÒœ•ç%G;™ê¡“X∆gø¯Öo∑’1AÌR!ÎÎ·ZX‡Ci éÒ˜Ìoˇ9-É’Œ’$éx—0∏éÈ´≠äìxú sKêS?RÜ¥Äa¨‡üF<X¥–YÓÅJé”=ôMÊRáy»+¿(*ÀØ¿—Ï\•Y‰òÑ”Ù˝k ˇ	¡¶¬˙ÁBP≈hÜñ% ÁaÓSxUππ¿vTP:cΩÃ`ûñäú˙™ûÒRâﬂRoÂW2¨⁄Õú‰„!{Ú≈øπﬂÈ|uπ¶´ËX’«+vu}ÕÀ€ÔK¿ÕåX»eÜw≠Ÿ6·‹˜I Q?”j˘p2ò˚S¬©r∫ñ;πuÖn,	%¯∂0å4©Ü–«Äámz(ÊŒè%nŸ|¨¢0Ë.üLìÄ–ã(CwΩWïi»V∏*ÚWÅê6Î ¨+úxl5Ôø˝ﬂˇÕÃs»tÄ˝πÒÅ9…∂ãBÖÚóÆΩ&û÷r2+sî~hF$^Ã`7R&‘ç†≠éYA–ÌKk±	˙ﬁ~>
©˘e
]Æ·Æp#Xå}®ìIx.UÖ‚›˝mááV˙Hçµr™◊Íi?üÉÉ˛
Â˚Wn…™˚V–∂4œ≤˛(8“`myW∫±q¨ø08T¿ﬁ≥–/≤∂æ˝ß^ì&€®øVˆt~Ùõõ¬∑à»˚ÖÿjNI⁄˛ôy›4O¢ÀHÏd„VÈ€©Á¶%®Z,òÂπ˚¯õxgIÁ9<ÜyÑJÂÙ,éäa^æ$\†´áXî.ø¿µÅ)¡,ﬂd∑?†XÀiO…ÊÄjÚÀÃæç*œ'S≠Qrn¶√ùnó·6Wiå≥âÌeÁä√Ù^/Hq†ç_RñfBV≠±3W-P -®Z1ulûÔﬁ˛◊ùAµÿ» w˚_èÄ/=:/v_Ó<üSŒÜ◊f{ËôùÁ¯ Pçƒy≈–BÌ¿ksr}*√Ì≈Ê¸z[§œ®UÎ .∏•îQv≠´@≈-SÿÓ\YÌÛºûÌÑ
⁄-T˜-Xˆ≠l†e—NaPW;ÿq˘Hœ*8ïcR»°Y¢ƒ≤ˇXjüE‡ñ§‘{≥„ã.v°-Ùñ;ÿæ◊‘[Y_$›¨Gõõõ·R¢éß«ªï˚FF Õ„A‚¶;Pà‰x/”Œ$$¨y˜ïƒª•#<Dó.¢‰]¥¥˝ˇ<^ï˜jΩ®ãπ“ﬂÖ^ç˙cËr˛]Ëµ	¨÷¡‚)c ¡UÒR^´jx^B¨˙ªˆI“ﬁ˛ÈÓ	€€ˇrÑîIìﬁ@æB±=‰ˇ“Éµè≥'K˚øŸœv˜Oƒ¡ã„ì˝””#±˛õı‚‡˘∑∑ˇx∫¥0Ç[:Ù"i÷T_Ì<?:gGg;œÅ≠¯N‹Ò˚"i*˝ö˚≈	2◊˙;â1!MÍçT˚ôVŸ4ÛŸ€˚„ª∑vzpìC›d≠∫∆à≈ÁÈõ3>÷lÉK∫XiFz„√À3Ü9ó9ÂyﬂüæcÖ⁄5TúQ±v≥ÌÁ—ˆèQÜlJR“++˚“h_6≥¿“Ã˜«bÖÄ-g∂«ªJDn˘ˇær∂≤ç°¿[ø¬T;wæ¬X≈ìø'Ô.∏(9V¨Ù3ƒ§≤´q7!ﬂÇXZÓ«2¯„löxyx∞{$&9ÊoG®¸¶b?ßË
AFw∫rgÉd(ß\ZÀÿÑ\EZÊ3ÚùX⁄Å˛Ä¸úèeK¯ˆÒﬁ+¿¥ﬂa
[™_.›+Rï†w÷O“’~zÖ«I◊°m;≠©Fq√ πí€öd—ó5Wæ,TuŒ.Ò*¢EóºŸ ÑÚ·-¿@J"é÷CıﬁñrrπN—P.x+[‚`xç^Ÿ{¸©úﬂ‰ª‘:ºõ„ﬂÆKñπrÒ`4∆‹s–Ëqîç8≥≠∆∑aR“*Ω)îŸµ´ø¡∫Ç'…ûqëìÄ	ó'√Ìµìa·îu:N;ﬂë	VŒ¸†Ü—ÊX∫]¨a„˘∏¯ï‰2‰|”;≈¯˚‘ÿœë:(O∂dîJ¿4b—(—a¶©µ”-ƒÚÁ4;•‘GmV…˜Ëˆ"gÖ~aYb~2\M≤Ë$ÌßfÃ◊h0|ÅF-Ÿ∆  ÅbÊ1tSy--¿ı˘á¡ø›4+d˘!F◊d-@}
}≠v#¥áá8Ω˙¬ªlçH›¶ªæO£dü‚.Í†´#C∑¨∂•‘≤›lXÓïYt£ﬁÈ± 'É∏˚ÎÒ{jÛ$xÀjSæ€Õuﬁ$¨mÁπ\¡›µ¥ÀØXs ¶‘~__(}˝≥JøHπÌC˛êÄRàz™Ë2¿v˛”∂Ωíhên≤˚3b√~/û{32û´DÀú«‡Ô>T÷Ÿ"W.^ÔdYÙæªˇ6›¡∂†çsh¬Ω˛Z‡é3±•∫–(mú/JëF#à(«µﬁ¬[[µé¬]4Ω@B\∆„Nœﬁ∆Y•=ÓÇJ-≈ö¯ªÖÓÍ:|l–÷´’2ë_I3Œ2|Bªî†-òyîD@%·BÄﬂ˛	{YQ÷ r/…2Ì8ä9Ä„ï;peHéˆ ¢œ`gº“K”ÔÚ’¯]/¬‡ÏÎx•èÚœ§≥©>£ÿZ<Nw∫÷bú•«“ﬂœ9£√‘†§…{ÈÖ∑5¥–	ÚZìAd&,Á€. ﬂÒΩ1c;d0Ç˛}ÇÀ0ÏöEË;\2®G≈∞£bö´a*$?k¡	ë∫ÀÈHœ@r≥ºæ˝°ﬂJßƒÊ§…ÁÑlÖØïøŸıVá˜;x!?vÅ7¬!`–ı&Í¥(¯W7® A0å(√ãô<os€ö±ÏS∫£'Ót÷ßI„Æû8g-Ω6\màv;ÙL°[/‹+KÛ$„`"Êó„∑◊çHT∂º_X-r™∆}-Ïüfâi.¡‘‡*ºÃb8õò„…æpDïcK-»ŸÎ∑%Øò¨d—–ÈÎ|òÀíÉÀ¯Âì@Y±H∫zÃπˆc.	«4≥4.^Õ∆„eΩØu-NÑ~¸ì*‰“Îò ârÇ˚»rõ~ë	¡4 Qû6¢≥±˘XwPB·Ï4PπÜ3oÜ»pMP6ß0J˚‘E¥qé˘Røˆ¨îıöéÓ,ÜÛ,n6£Ngô(§‚°ûÑõ‚ó¢Iî¥¿FÈ(*ØÎÕ$/kåYe2xˇ}ÕπôCı'™Å”l÷Œ&Ql7´˝g:‡;¨‡ÕÃI˜ˆòä°ëLèn˚&≤D‰HﬁÇ¸ C≠Õ⁄oK Åky\áYO§hO€ 40œîø‰2à¸0†ü∏<Í09ô:oŸŒ%YIöÊ¸x‡©æâ3,!”MÆ`r Gar™§3…'®†Hâ.ˆôNÄT{ìà€)©Ë∞≈ÏƒZ°Æc h◊d0«Ô"””¥´èUW_ì2Éa/Jÿz∂‹Ÿ˛˛ø˜◊≤\›¿£,æLﬁ·	“,ZV;Uﬁ„¿%7€„ìΩFuπz˛Ï¨¸C¥Ú˝ÌZπ˝_ØÇº	4ÆHOæÈdu6M<b·Û{˚˘Tçi∂Ú˘TyâYòZÖÉÚÏ≠	*¥N QÙÀÇíV√:ùX¸©‡WÎ!µ|ÄêäˆàQo·g?,OYÛ†}÷¢é„ç[bD4Ï„÷{ÿ&<ÏaImﬂ‰RßR<œÙ.Œ+ÉdË=Æµ2Œ£I˛∆X0JB¢B£^àî∆Ü=/E""˝ŒÛ®∫yìÛSòî:á…(t8rìbÁM¨5;HñŒ'‘°zÈÕ@)ÄÃªñb»_^KKd^bW˝Wò©0ËkÅ$7&#ES—E°~
`(Vªí%9›˜ÿ≠ª§√z3PJ,ÛSm˘Ô8jÖ≠Í◊e“ê‚ÂRA	˚ó∂:Ü/`‰yITô¬å+ì|vS—áV;˛}S:·≤ñQ–)fR≤_úÀh$ØÊG{ 3ô<m'Ë>ãÿl8†h¥ZV.:2Á<FÅ†: a¨ú.OH≤–t±°ªÕuûµé‚21vMbﬁBßC†mâfëES¡Äf—˛:÷FÕJÆÕè≥ÍØRˇKÂøÈIöF’qNY¶¨s¬ù‡ú∫¶Ñ[4E≠à2íW¡¢Î÷eöàQö´™Í]…îmwØ>’KF;#Rô{q„ûfoÕP/Ò`Óø∑¢Æ%«#∆äp+€5’ıôr‹•‘Ì5µï°ç˝ΩÉ≥ùqp∂ˇBÊ€Ÿ€9=;9BC¡·ÈÀË6u|r¥˜ÚÏ®1S.–˝´RøWÀsJ%>ˇrÌ∫˜zëD¬Óaµà#Cÿ´
A"æ≠‹»u’≤l€â‰›lSµ√Y¢·öπ®aõ≥}„®5˛›€‹;¯∆x∂rx$ößˇÒek…ˆ±ÿãAdÄY4ÏH∂˛*F[-…∑?†@'nÚSóL®c…˜¨ÙeÓYﬁj-T1eég÷ÓŒŸ˛7G';ûcñv…
∫;m|êªSâÉS ﬁä∑a>‹Ü°w@.Ì&yœo{3Á“ˆ©˛*öœ”a¥˙
x¶˛Íq4ä˚≠2œ#ß5 7ËÛtÜ∞™ÎÃ5ÀkæLÁÖåﬁ_⁄ﬁ1ﬂEÛ†ﬂª˝ó|ıUúìÔÎé§K≈·”|i{O}ørõÚw›OÅØ/ˆvˆˆñÿä¬‡bò*•…ªbÈdJ3Ds2¨ãﬂ¡·ıÎIBÂëh~wU˜Õ¡“ˆãÎ?  ≠ljøπ°_˝ı$ÍRÂﬁÊ`£Ó€(Û,m£|SÛÖ~]-m?«?¢Y{£∆„dC‹´˚Íõÿ¥KÆJù€P'óÇh9&*k¥ﬁ÷±¨„ì}ÙŒÜùdNvDs˜ÂÈŸëÁn&µ*OñN>ùLJqpß„…®
Ô‡m8»Jf˜jˇpogëI’…&≈¸M>`R?5π;;8ñú(b?Kößµ8ã—Ω¬ïÁÆ¥Oâ)K€ =´.RÊ†FÍ[Õ•~˘ìÉ˙éÔö/£rˆf1K ÑÜW˛“ém™õsÙ≠}†lø~πˇ‘«Êí ¬á1í!l	J#Ó˚é´*fM˘#‰ôZN#~fé¿Bâ∑ïÁ++Db9˘÷¨*’5¥ús¢Œx nì≤ˆ”i2(M∂˚—°#˙cÇÁ…Çµa¯|q[JVAA]i'˛¬vîÌÙ˘Iq≈7M($·ÒÁuêdZ)¡íè
ëOø}H‹}HAÜ≈¡0*áFŸûaW¶5(ùóT’´cÛöÍp∞3vûœã÷‡∂≥ªpÕñÀÛGaúÀ'Ù‚ˆˇ<<xq$ö;œ˜OŒvÊF¢hCﬂÊUxnÚ9˝Áﬂ¿úÊM≈≤ÿ›a>é+¯'ö‘Û£›ùÁˇ∞Cë_é≤qˇ›ñ8ŒÄ∞Ù„$ër√ü$≥0ﬁaäñ’rûö—MàlÁ√üN®úêl4,OÇ‚éñòÀÓc˙W©¶EŸ·ÈA|Á‰õó ,√úÂ—Íãù≥˝ìåE¥(‚DòSaDw¶€±
q—/«#`€áÔã∏ﬁ^≠]a∫ΩÀ⁄Ò∏Éèáú°£?ê¯ÄŒìõ,ÖBΩÊ&2)œíøπÊ3, .Gsˆdòoπ˘H
ûú.¥◊◊ﬂÕ_Ω¶lª7eÖ´jüP©ƒõp ØuNü®v[Àx#Ê«Wî3¡Ïò¯bÙ>p‘Í⁄9á|I´AWƒ∞õz3ÀÂ¬˙Åü«B8ÂÌ◊K èAûﬁTÁãÑ∞¢¥≤à_€.I‰∆{[[ôPUw@Ö˚ƒÒŒﬁ	¸ÓàgGœwí—lπ†Ó3◊Ò çN*'P©)=;ÄL¡1ÙÂA RuÚÓ‘ ªÂQØPÎæ—r'ÒWË E´≈;”8g$ﬁëÊ,‡œÏTõsñ…–c√‰ù|.±ßì¢yÚˆèë‹˛yªsYÖ/íß¢9÷Pf cï˙gŸ∆Z7∂ã Ã/Ëáô0˜ë≥yKKVt8çÚK˙Ö8 ∑˙\º'“u5M©<Kté>™h+Œnˇ‘b¬7K%ìÇ“<aï!vÁ ÷ru´Êm‹:B¡„⁄úÕ5JÊŒM—R¬ Ñé˝Á—˚8ÀuÜ°á3è–’¢
Ö’á
ï≈W[ÜTΩb©ÅŸSjRD%¨Ü7R ^ÁÓÀ;Eı∞≤∆>51p‹–Êö[™ò?ΩÆÁ¬Ñ8ÀŸÓ©Æ7Çæõ3qù—EºÕ}˛â.G(3íjﬁÖ¡<Àz£˙(·[z€eUR ˘∑yöã_‚n‚3|=‹z®\0CuŒÁXl„¿:ÀdË‡F*ò≤tÎN∆≥:	Ãï« ¯p
f-ŸU!ifïl<˙2è2±Kë é ∫∞‹ﬁ>lb}ü˘q<Z¿+JS ≥Ö´’Ã”≠⁄µuÄSÌ«Ê¿_…‚~c∂ﬂ+⁄SdÖÚ"4Uz¸%«<Å√ï"cë„y“° †ÑnG‚2∫@ˇ_y‘†¯À®äüàFìåºÂdxE¸ΩKb +‡¶‚arj‘v&>r¶ç«üåTÇÖƒXçnóä´-(hÙŒ—V√Ω,0˜≤uùπq4‰äÚîﬂÉ‚†ÙSá´e —/éÁm‚Ç?âu⁄¡p–ñõ •ö (#Í‚ˆ”Mù≤péµ4ì”jàGn_€P∏¥çuóLƒmd∂ß‹ùbe•*I“4gã7∆‡Ü%Ób $_SÄ‚LØü¸‰∞≥ëÚ $ä¡Cˇ8m ˛l™bg≠©hà˘»≈˘ÁÅ;≥	„Ì◊oeÒ›+¿*}^ñG™VVæ#6ÀIxhØ$AtûT®ÂBdÒ◊C∑…∞‚Æ%+¸z‹-h[ËiµÍ·‡Œzª∂$é2,#¸$ª∑(_p˜}\õS∂x«&ß}ëíƒ0-—›Ö7u˝‡˘ßR⁄EœÌ…√8∆ ›¬˘è∆ñ$6®á?=˘v
:poR~k™ÏÛuA~o3 8»ç9"Çó˝÷àQÑÛ∏C-,:î¶ﬁs‹ü‰V¢YQ§ZíBWmÆ<≈ï«Õ(∆¥¸Lv˚√+é‡{uH˘Ìø∆¿jv-…I]§…8.óøôZ…Xÿ2SHà¡˘èîc¢¯`àk§ù‚ó£?ráfBúÅ÷=£iâ'¸m˜¸É≠âjrø ±l&Íè_`H(œk£ÇôW≈˙⁄ZŸ{ÿçy—DÆWø)C\	!îcËxÅC√RÇ†Ïjõ'üpóè<~¬†~Xx¿û¸1ò@&3ò;5N„™hΩºXLÀ'cÂ»˝Dñe∫Ïßi÷dãø™ 5%C	ÖeöQã¬o◊C]˚£4ıûx–∞=Ç‡4ºkÅ¢ŸVé˝ÒÉb6]∫˘†ÇÏmXdœ5,)É;_ÂÂ™Œ<ÌπÚ .Ø˘Mg‡ˇ˜ˇ¸„cDãRRw“l,√K‰b6ß≈ 
O®Ì‹*µÇ…œ‘^”RäRÖ)L~ÊΩ‰«7}Usi÷@'øŸ
Ûk˙√£}∞L
e6ÚHœ¬d÷©|e≈i4¶e#FÇÆïCyN—˙í)WâÆU}>ú6ÙzufgıŸ “lñ3Tœ√t±ä‰qåV
<òØRª˝ñ…4˙3O∂—œ§Ò∞ƒ–(?JNÒŒµ2Q~|a≈NÈ≤Äå¢?&´ÙØ3/"≠î'®ˆ√œBeÕ§ìÃÃœÁæ™ãsú	ª ôdAˇn1ÆÙV…è;wA§ùVï=H%Œ=…Ñr*•óbg<é:Ω∏´y∏'Ü|ò±‰©w–ón9\úêr÷e±*ôÌè‹Ÿ⁄˛ˆJY§R“ÄscÎV@N¨ï}~¬ VﬁıE;†pÙ]˝“ï†C˙{›K∫›x∏êÂçî°î 
+føJñÚ£‰À…eG¢d]ı”IÖô˙
.€@åî∞0≤ŸbÏÔ»“v9^;h»ﬁxÌ:Uêÿ;úYÆ:ÏfÂÅË≠<‡§®Ü…’„‚%≤œQéTéê‡+~)÷´Ël5/Ø°T›O∏r™[¢çﬂû*ëJ}~ˇ’Ù¿>MüÑ«Êô˙-√aﬂa∫∞ipp}ˇ*{ßz¸U,IçBjß*¯ÑÒ8§∏dmîWø≠® W-›ÍBS¿CÀπbc}¡—Àr6ëñV/∂•BXwbcòThJ›"¶√F∆!g’ñ•î‰¿3'Öm’´s6‡YÂΩç≤
^ﬁ„sdÕyLz˘Õ‡År\´ı˝ãv!ıX@DK¶6ì}rw2¿WUú„√~ê-9§î}n‚·¬kFD¢∞ G…∞ÎX⁄√¥ƒ<B≤ê‡GåÉlüïûÒ´,=∆∂¢,Fø”õ¸…tcˆQlf˜Q&ÿúkÔŒbƒˆíb+YàFE≥ÏksÛ´ÿÍ˛\§ UA—	â™+ûË.T‚ÔÓì©¨‡Òx?j˘∆xÑ
°Ã∂’(—›ÏìBª)¨zû9YËÂÌLÏ`ÍXtî˘◊8'5uk¥f>l¨uc?XÖY≤ƒ™‚aÍ-®r(Tƒ√ÆÅ≤åπ¸3™Ÿ·‹ŸÍã.¬AOnâù—Ë%æ"Ø
∑ÍF'æàÜ—Ul:ánÔ›k‚ÀO1Ø;HÜàÙÚHÈM‹›°
È9OtÊ7‘hÒ‚ƒûP’ÑZnï+∞
M¯ı0˘ôÆ1Ò\~∑äLò$™∫´¢rœ≤S…ß∫8≈›Kc8ÖIËW∏$	›beI‰£Ni∫X]ûDæ«Kî–ßLâ∫V∑Tâj4TÆ‰3ô Ÿ ≈ÇBÃù´‹ueúÂÃõ’H]ß≤’5æÄÔDöÑnc⁄är8òLX.K/◊MÀ2»ôÚ∫/ïD^zƒK„Üü∏ó¶⁄l‚|dj…ñΩÌjÈZÙ∆zÍ™Æ≥∫"qØÒ‘Ë2˚^≈oÊ™¡ ∫£~Èªâœ êÑ AõtØEWgd:≈´y¿BFzÜgv5…∂z‚#&ì´æÕêé `“∑hLU˜e∂V}Ì	•«€˙ó#(:§ †~æâ
Ï∆˚&∑k0ë´á.vnW?É´NÖØ¥©pz(%®{9PdO.ÅÛËCp"P‰Ïî™võÓ›`ªN`)ægßùµ€¥Ô[¥‚8in≈˝cx	ÛSﬂ∑B0	û ÷øèõÛùê—/9√/Ûƒ∞≤ô∫”Z‘¨’*“ó;4·3ù‚1\V«'å:ﬂ•:qÅ∆®x”‘OÕ§≠Ótp•C<&–C˝H:Ñª∞cØÄ[}£Ô"MåØ©,–K8º:Ωx!]ü\ ˜W∆»ûÑòòŸr`†¶<Ø`….L™N≠·ìÛ,ËvFÇÁÆ∏ö êMJ¥ãı]l&≈*Ìr>àíã¶%›4WU†ä÷±;•åÍ∫¬Ï#V€D◊3∆7Ñ¶8∑x?¡SÀ>∑ ¨k,˘∆è+‚r0Û*pD]∏&â¨ 2_FòUà ¯% Q'¿ôg]UâjYÕàÍùôÑ≈÷Å| ~‘È5±ËÆ>r
eoÛ∫M√ûñâO˝Ñ π—”Ω&ˇö¿e©˛ÂÌÃ|ü9≥∆√|àAœOƒ—≈Ô hm@è,R˜V∏‹Àìı◊~ô≠˘ku∆
˜t∆^ŒÅ≥n6ÅÎ∏†Á/⁄Ï¡±ü¸•"•<+Ë¡¶©g†Sæ>2€ﬁz¨UcêÜL•«ÀMñ© sJB–TE+=DKÆÅ,ÙPl2&—®öh˚¸J†ö∂õguSrÄß ◊g≤⁄>øBmXÌ5pÅ–^±óæ®6Ë˚(ºol6©N/LgÃ.ºh_IÊ´Ÿ»ÄåÈc˘Ær√°RÍutcS#¯É`◊‘`¨k≈∏¨ÀràXML^‹R->˙Lc∂v◊≥aÅªÁzK‘ õ}§ÕÎñF1çºÀ‚ZüRﬁ⁄≈Q÷Èa’Jk˝ÃUK>¢22≈—_®˚5ïQâªö„áá_¿`üÄ±©ÇBòÃO?xyÄï‰‹éã	œA¿T…v∂_+ﬂT„ºÊYB$!)
H4ú∂
QU∂ÖıÍ‚∂yú’\ò˜äU´áÉP¨Íï™ÚõDÊ¡Êkœía£>MbPa•T∏.õtiF◊`5ãÊE€p  ûªË∏FXØï‚±®¸±Ç|”(4˙÷¿-ˇÄ=7e!‹Æ‰Ó®ﬂë]ƒBı‚\4] M˙„∫≠Gb—Fåâ†gcvèÁ_6Zè¿Ó≥÷ö≥”“Q<D"MZ(eüu*≠:4ÉSty0õJjû^íƒ VÌê◊96öø:Œq3jHäc™ïâi*æ©óﬁÏ¶√À$4ﬂÓøÉ}ídbÈsf\z*ˆÛ<*màˇåpw¢Ú
6’%:É∂≈1¶‚ƒ˙6îŸ	‰¯ÀÒ&9?H[üäÏ¨€ÅEO€oÅè‘∂ú.†âêl\ì7∞liX1†@
˙XNº-Œ®–ØôÉÃIèæò◊Ò˜Ëy©ƒ“A3g9:i2"Ì=ß˛ßhZ«£F™G»À~“J≠*«∏{ç§i<ñ4£I:˘¥}§<‚∆¿¡/!¬Ã∞®¿q-mOØ=ÀpUn;çK»ÀœÌ2’Í⁄™ß´ªßK¶®mÕñ-‡j¬œ º+/%Q∏»«œ¢ÓU\h‡ïΩ¡“ø;©i‰Ù“Q‘ÆzÂ·BÜ∆ãı†˙8bjs[∏d‘îÚ◊„n[Ï`m,gîR∆∏
TzL∏´F)·¬·ÀK¿®†o{S)ê¯ÒTesãpò®Úwºav7¿1’˙/}¶•mˇ‚‚1m“›$ÎÙcmÂ‹≥òﬁAjJP}∞2öÙeÆˇŸ|§1g[U∑åjÖóD"N≈éåxK’ÕÆâ˝¿ìH’Øjå∆+œN≠Ÿ[K¥ŒçYΩIÓE!1Äı)*¥;ù8ó∆Ö’|ÑÃÑ¡ ŒŸ¡´#z·‡P~/EÊHöÿ(wîÒÖÛâ≤	ÉÌ–Fù$—q‡Á2‚UK◊ÎX¬´Q∂‰¯¥´úÇ÷ß À3¿6u-m?>éáù§oE¡˚F˜íaªÁ∑3ty‘Ã;wVòÁœ@C∂]ÇCˆˆŒÎ˙E˘xπ<´"€ºbln›5´pF≠äk•“Z›"kã’W´WZ≠nUµz≈‘~¬jw)Tˆs-ªf’&≥ -9e…x1kÅj∞˙ºlù⁄d–|°ºsC≈ÍÕ)™U¥ Á≈MY≥ñ≠ók”=·Ö◊a
àEñ÷ñäå›∂ƒfÀÌµû≠÷≤”⁄6Z€>Î⁄f}ªl–&[ö÷{¡"Z?V•,G\9OÚÉ:9h˛AÒª“ôÙcJ@v_¬s'XJæO√œ«ﬂûΩxN˜ˆ˚1Z¿åÆ“ÔÆÎ$æaŒ ﬁıjßÄÑ?~íﬁ('˜™•¯Ñe›dC_√¥îe≠ËKæÚÕº;åØ«v{)“e|˜–∫dÎ]•(L:∆Ô±bTcª©ØŸéJ&«]BCQ r/!‰ú‘≈\äÛ:ﬁRÎ&ù•ˆq˚ãÁ©/e#∆Y
ÁO€ÁkØë˚^¥e{π jÎ ..&óóqfà6÷é≤,zˇånDF>éiTâ/Àcï¿+ˇM?◊îÌX•qÒYû◊ äÊ
Y±Wmtq}˚C…Å”√Oya#Ê&˝^‘rM"TxD§ÄªÃùœµ€∞T	4–K∫eÁª˝l„€ˇ9ƒl≤ù@#“ã,πäH?í∂f‡¬ÇdA£C®N3¥®∞Ö∆M&“T˛åçÆ6::ã«∂&_DNÈÊV
ãzÂïCjö>ië¢Ï˜ì‰:µ ‡ÑkøÉï◊Îe`,»Ò—>üS8â”l\KÑÆÍ¸ÑpHÖ…lGÓX@â°A∆9∏¡´7ã¬~èí}.≥^®.{V ¥f∂/âx,ÉÖmÚ&M/ípÅ‰∏&º˜œ‘ít?´´‚Ÿ$ÔDÊ≠ô¨smíb—u}Ü+…§V8∑LºªÍôåJfã&&sÿ•zÃËΩ9JìúÚ;¶c+‰‚-ø√\[Ä—˘BﬁMIWﬁìï—Å.Â †ET’øàF∆F,ˇnªt
^¡A÷y°…∆ÏZäG!3±F4î∞ö#«t¢T-ßT∏~k(’9Áµê˘GoËØUÄÌ_xiYå
U¨~{kiX–ì“Rl=:+PGÀèYtÄ,k"©s<ıŒ_?Ú2òÉ^òË·•›¥:#XÔ`…ö.˜∆Á	-Æ•®\º⁄≠la ÀfíÓæ∆	i˛Ô‚Ê,`~%a.<L’}ÇÛïÇsÀY÷™ùª¬Çe{4…{M	OˆÈwòA0}[9Ÿj8ÿÊL≥ñËq=Ü‰Í9+ÜB“§{¿∫Gjò“adçÍò)Ù”q¸HÊΩ≈Ø≤É∏zòHÑÒ˙Ωà»à˙¥h'’(&vs‡à¶ùd2£Ã∫a≤I2∞ÜÅá·iÚ=.’FëÚÑPGü–@·œc>í1¡Îø|R¥·£"9BHñ«º+ù#íe|ôΩÎ¢—dDjŸ¡õ{⁄™¬VZ.	åú^–ì©¬Î…æúËHk‰‰E∂øËl§”≥–-µæI}˚˘‘⁄´9†˘
ÃDÛs€PëØvnˇ∑_c÷BaL7®2#yÈÅ¿   √2Ï	L∏’∂CpYª‘«ì;®PÃöÊRÔ¯£Ç+.Ö¡âol-C+J¯“ 3'«[ƒFáŸ~ò
≠Õåñ®	á@¡†¿Øe2”åÓ∂;¸ÌÛ©’’LìlÎ%XÀh†∏5ldãΩc¸õ÷◊ZÌﬂ•…∞Ÿ¯Ì∞—ö9ç¬¯◊1∏˚Ìoá¿œâX†ØûpZÅáf*ÖaYoÜ&œ∆ÑtYtòDCDzèuΩòJƒH
VûWxMÖâ~˝£T0Á·
„î|J∫¶‚1,ù∆lπ”.BÓXBz+_=\ ‚¯1à#Yú˜vox#⁄.ñè'W—ñy€(˙[Å⁄Ë%˘æ467h˘2Í“ﬂÔ”t Wæz ∫ì,¢ IÏ»X™L÷Xêúæ#msÕ%rX≈1>ÁYàÓÎ‡§/‹lta≈^πÒ”è{~⁄_}≈‘ÏnJgi%ó∂Ò¬ê=NÆzcﬂTíß”+Èv :V&IóÜöç/÷Û‘,Pä`ùFÅOnµ∑aM∂4dPœ◊åd—É~‚à]©çq\⁄DªIeõ_ßùT|ì›˛pâ˘Û≠Åèã≥f¥◊¶ô¢™jî	£0∞9.üLπ`¶¬öÒ⁄∫Ä∆£Òì%RB,„øñÈN•é`ÒâÆv.Tâß$¥∫àÎcJ\?ˆVZ˘3hÔï?Xpùæíâc•ñ	§òqló!]»”vi¢Äk•ñP?oVæ@3ß…ﬁé,-≠*0„s∆9Ÿ05Ñ∑¥«áüî5êÅ‰ÂàùEt∂Ìn¡–n…ˆ]ñb*)êÁî¥®∆cPvVŸûê≥¿2 “R© ÉUKâÚÛFØµeÀûö0C™e@MòÂ‘U>Ÿ˛“À‹Dö>"3/‹_VqÄ;+∫óﬁ‹q‚è}D®GÕT(plŒì)feùπK=-≥…˝uX„¬æîb6€>Dù"6
¢f∏ä.·kºd¯p∫∫©¯xb˚«ﬂ‡ªªQ÷µ˝<⁄∏¯†Ñ£x}•ìë¿¢Të≥*Uë;÷ËXÓ	3„t¥≤&2‰b‡ÔÕ ∆}ÿ*˜˘±Íô¨2ÃÎøÇáˇÜ¡ä‹9z=≠¨?∞0üæ¢ùΩ`◊◊ºÚ/~≤áí*9<ˇú2∂JqN˛^
î‡uöòì`aë‚uòax§_A. $+,ıÀÓˆÓáx“ ∫¥=≈©îzü¡˛¢Õ≈ëb‘0o≥xø2€Å¡“;`ÓOàõ.ä}‰U-À«ÔÒ˘gôåã~9
ÚKn:7¶!÷J˘^«.ï±…î±Ωq≤ÑM/‹‹b'X[Hß@°@:X¬´D÷/QÈNúﬁ˝‰-…ÊºÑ+ˆÿ)¥l†´ä§e~ ≤∞®ñ¶*GRÿ±S¬„W∏¯ì!zò1ãyµa‘m‘tU‰Õ*…∆UÏbû¿)Ô¡f˝P|–G¸ôX‹Ï]i™PvóM
A+Óy[€9‡J∂˘}wõ;…ﬂπªN=QÿQe^ò∞ÙjOÿd∏r˘À5?ﬂ≤™î'ôÂ1≥Ûpb‹⁄Q©/çQJM)“âÊsí]ì{∆ã©®uÁ≈q9©7ÅVøDz#Õ>V…Ó%ñ-eŒÒ(ä„åïÇYl¨% ±b‹ú°b$6Œ¨îÔ¡©^ÉßvÎf,BÜµ¶™f‘*§Å<hû¬•4!çY9˜mƒA4∞dwòTQŒt˚˙àù˛etq˚',≥$ödóÖq⁄F´tE€»i£ﬁDŸΩ”Zm™EÆh∂Ñ˜®—6≈zU¥¨‹Ê°aÚúµÈóø©£’1∫¡`Åõi Ë±˙‘Û˘K8å⁄Èƒ|ñbœ:Y∆ O{¸Ë¶]qnKvq4ﬂ()çË‹˘`~∆/}ò´X&„≈»ÛÂù&x∞á@míöVy¯s¿À[∆g˘«∂YÏ|P(Ç·{‡ê¿‚bë*	`pı!Ûvw≥Vy¸h∏p4L%ZÊ&-≠<Ü÷ X¬ jŸ¢V¨ñ´ÜvÉµƒEGﬂ≠‹¿tÛ∫©=Î«ri(5´¢˚®
›≤;˚∞+øs˘Îƒb’cóÍ0(._	»¢/ŸsQ≥c
µïÿ’ÌVØ:¶K¬ãG˜>÷IÜÔ‰Â5gÂnùSö¢˛X>jPXl¿µ∆f4¸;`H©ÙWÜ„†Ë∫¥ç©WizFıU*ß◊ﬂAä¢*ÖŸÇÒ_ﬁV‚ÌTÖÖ∆UKYΩÈÁ£|Ω 0úœœ-
¨Ê<º®0g.?aXò;Å“˝S3lÄﬂ(◊∫29U]õB	Î‹˙]:»¿xm˙≥*]9ÕﬁÀËLkynL⁄pp_°Nk~SøZœµ€⁄&èIQ-ígÛ$4E©øáµcÂu =a‚(#üÆ*´• e_^∏mÀ48æ˛∆}≤æàz]T%TqœA≠›WwS⁄-mÔH_>ü˜-È©Ñ¡∂Bñì˝¨§Èj;¡¶LéŸb74¥∆„ZQπ™î»Ñ`˜e=ÿ°l'ç·ïv ÙßL]ÌÔ•á.ÌbNŸ£O3ÒSêìv•Ë√Á.π≤RL	˙ôMXªih≤ˆ·≥÷ßLöëÀ;/wUqWõÏ˜WQ=ﬁ']ÊTt©;.K	XIjˇ∞ ›!,‘˛&ÇÏﬂ˛ÈøÈh=("&–±NßºÍ˘â#*"~}gOÀ†Z™ãÉË›
YSåiÊΩTFPqÒ¡Jﬁ…“~ˇ" ,-ùe/e‘¨u0ﬁçuV÷r?öRÛoO3)»nïpÊÜ∑)jª·;÷—´ŸÍ
‹./ÑF™á$ú¯k[l,Ê£jbE<§Ω∞®xR∆?Wy3õÒ_ÆÛ
KHÓ'’Ø“ﬂ™Ì≥h(úHáDÇÃ…vüµÈÆqWíE=#Ë¥q%’2ˇ–+ÃX H\5^`2ÍGÉó	øZrR∂;
á^˜Ö∑õÇ0ó!Ï®`Ó?ƒY5ÿ ‘+A#ïW‘´Ä@ƒÈ¡√˘ƒ©≤x\ÄÈ(rIÆ’"Gï&«J=ëTi5#Ji%3ñ)ê¢∂≤g)¿éJ-„˙í°ò’jò*´Á¶•kÀÇé¸ãµNª¬ËI
RΩå>‘:(√Iÿ*(<zZ3ü ∏2OUFYÉÙøîiÖ`s≠‰)Pπ©aD» Oá“^V†Óñ:/¬úPòp’ñõeµﬂ¸:WΩD® E¨ê>´ÎTÿqØV◊’û9≠#jgWØñExØ∫˚Õ™ß∞‡ÆCıÀf_^⁄ú_0µ)‰áEJ≤RÉè(–aè^0œ∫„W——%LKíwî∫Œä¶XÆí'S+q	ÄO∫QutÚMtut'ÅäJæ"∂Ë'fÍ„& ô?Ã@‡Fm¨Æäïïq|r¥˜r˜Ï‡Ë‚’›,E{òbEƒÓ—·ŸŒ7˚/T
fäÏ ¶-¿ÒQ√0∫í´,_'}iœÌ'2†óÃØp“GüI]“æ|Szf≤ÆE:P¬O*&b~ÍxHØR»˘0Ωëâ'“+ÑÑÊm√#*chU
n2ì_SÌAƒı´Yp>–
kcï÷¥:ÀJDﬁÈ«Qfﬁ◊ÕöƒÀ<˚F7πº<•89Ø:á3+mﬁÑyZTûUVò_„≈M`OÍVùtﬁ„™x∏fe÷·˝xüQSú[†M÷öù*µæC´=ä∫ß8ÓÊ∆≤h¨√à\ÙS™Á¿Sπ:»$û⁄Öi4ZIî˙´”ú_bÀj,e~ä
ßícÍ-Û{˛ÀãóôŸÈv›J3¸Ru^¿≤√t†sπ–˜ 07gq?Üï7oËﬂ’oΩHQ—Ô»_YûG2?≥]˛Á)¨'û∏⁄UZ&÷øê≤ÍÔ2Y™väFw=Ÿ“ÄpÊOÚ\ñÍ(§zV!E˜¢º±e7ÍáÓá~˙ÖiÊñ¢Ÿ
)±π<pqOŒ)HÉQìπŒõxﬁàÆ&Q÷≈~6‚¡ˆ∞+Ks4^õ˙5ÿ‡‘EUd]ÄÚj6
Èõf†2I√£¿\zÈÔ‚ªÃcpÕ<≈ÊÅ[WàzƒòrQ◊1–¥—|¡&«ﬂ¶ì,Gj™˛ka¶ÅÉ”#ù~¿k“A±†f7iûw*Œ1ØGQá!∑"!Wî‚¯–|9té÷èSqC⁄¸v∫I∂`îw	Eﬁ+⁄§íF8âç˜í+îSôuµì)[±]/…O%37\‹∆VZœll≤Øˇ  ˇˇ ‰îl(xúÏΩ€rGñ ¯ÆØpb‘ÖÃjd‚F™$ @â”â&Hu˜r∏PdÜ#3ƒÃàTD$.B√¨˜v_z◊l¶∂ ‘fe˚P∂6f˝ÿ¯ì˛Ç˘Ñ=Á¯%‹=<.	U[ië·w?~n~.'q2Â[,ÊÁ/‡K?O£ißªÚ	ìü·$‚qŒOr>·ßI,Jæñ?diˆèˇ»‚˘dR‘ö&ytñPŸC˙ZY2ÀÉ|ûm±Â`4“0à√dπx{DyèN†TöÛ$»©M∂‰º”ÌÁ…≥„ó«–t<*∆|›˝R~ãNYáßiívY>NìsF?‘€åÁœ≤›0<L¬`Úr∆„Œi0…x◊xˇB,Jgyπ˚•¸≠¶n>S§'T˜öÉ|8¶Œ∑X_vŸïjtúúÔNxöwæ;Ä¡∞ ˛£aîƒA™÷ö›¸wvMÇ-ˆÈ¥§?ÂYå8.ﬁ2NÅÖ<&Òò#X≠ÎÔT∑Ôıóü¿ø2ÀŸs¬wsá<e;,».„!ÎD·¨:ÆYóÌ<ñ#À”K=FQ˚J¨Lj‚>∞l>A∆˚ßi2Ì,„Ox6„i∞‹Ìœg!Ó…U±°|
€}GSòl*ø¬‰dñ¿≤Ã3SãÉ)W@;◊Á?tñ£
Ga´mlø‘w≥öO£8òD?ÊzÊ|*ªÆYŒ(∆]ÜZ|±^ø‡›˛àÁØa—:zDß—™c’~úúªo√yÏ‡0»«˝ip—Y[ﬂO'Iív:Xø'«—e´l}mm≠Î¥rÀM/üÊSπNﬁ”å ŸÓ,up~9ììå√PCËCŒ∏8ˆ‡“~§ÙäOì≥∆Ûà#~–ë[ √ÿK‚”(ÖP’a\#å0 ÑÒdπ€Ì≤îÁÛ4Ch±á! 4⁄ ˜ËôC/ê3åÎ˜·üúßùSÚi_Ï;€ŸŸ±9µ#Z‡”›47‚ £!ÿ⁄Yí=’ïQc˙ó”f¯∞;Ñs∫pRfMÖ›ﬁyHGπ4î˛Ñ«£|Ã≥5ˆDæ4ô«aß\2Â·|»;ù`Öhﬂˆ◊l∞¬÷hV5‹e[l≠Ã4àíÙÄ6≤Âh-Ù˚˝RQß·”i~≈«|ÕvÚ$&«Í‘≈ÛÈÄß4‚Ô>ΩíÁ’@3fiò…gÄb˙≥ <F¸÷ŸXaÀkÀ›Îi3]Ÿ™ÒWX£\!˚éÄëNLw⁄?ã¯π:®‡YGû⁄Ì0:ÉìdŸ .;K„ﬁü±”	ø†z√dB¯!ÎÒÏ§Ï˚yñGßóÍÁ(òı6a1/r˘dÈ±FF€Ñˆ¢t8·,ã~‰;Wõ◊fgTÔ|¨n¨-±U£Ó¨T.õ2`%Úﬁ ôÑÃ®˘pçÕg0Õ!úŸ•«ﬂ&√õeÒÕø$∏≈ße˛ú∞ÒÏÊ˜)˙€´3’Áˆ*¨Ñ¯!¥Z¬I<¢kÂ™◊≠fπÙ‚lø‚ß)œ∆{ÁfAM·˜≤Ï8Õp|`ê^ˆ≠À£⁄•]ÆU6ÜºwŸ˚ú©∂°Â” §ø?&…˛ˆæxƒ‘¶éWÄÜ”pãæ#ÅP≥¸úÛX.Qi,g≠BÃC6HR`≥zıElÂ˙õzM“õ"è7JÄqAÉ°Ø] …$æ7†Üßw¨<á›ÏÂ—hå√—†„Ÿ<Í∆íŸ=`oí@ÀÓ‘F=ƒç∞æ∞æjWﬁ(¸Œ&2ß∂:ﬁ∞¶Z>o◊◊fÔÙl/2ÁÁ£òñûÒyÑˆ#Ô≠/=~
13»`≥©@ã¯BP<®xßebúÎº‡Á™CòfÂr¢ıÇcç@f ¸’eø˘çF9T˚´yû' )Ä»vÆé&ÛÏö%1¨œ˝ŒUáfY‚»”9Ô^?ﬁ’" ∞˛8ëÌU—Z1öÓµ}™+ zîF!√¢≥ﬁ:À¶[≈œM´&4~çu˜Ä`õ≠Ãzèl0~¥‘¥è_‡6ÄjlW±°õkÓÊ-=>PÄ√vGIX;Çß„a©ØÍ#! ·™‡@$	ºH|hn¥ûı«¥Ø	,o~BÓ¢3NæÁ›[Æü¬zNB<ªjM4IÔ,L˜◊±.á»Ê( ˘†u	êwÒØä¡KµX˚^YÃ≠…vY8¢äîm⁄K7ﬁ¨f|gn∂ÔtCÉymö}9GV…‚™éM#pËÔ˘ÂŒï≠ÆKd¥Dg6Ÿ`§TxUAåÛ›∆#NôáH¸f@PgÓ ¯÷êˆ:Ñ‹;Ô≠ïä/¬v8–‰î∆ıb◊†UC∑†cÒrT*¥k&û%¬»wˇ˛?Ä6^ß
ôJUtW>c¯Ï”r9®Ì∑Cﬁ‰√ÉI0Àxà
áîI-ƒn.˜π¨ù(1 öNB…õ©§ÏU“ ≥ çÇ8á£@Ï?∞K÷ÉÄ∂’%§é.ÜÄ»®~P&ü‚£âh≈ätç÷ÀÓu¡ı‚Öè∞D°ûÛª[ﬁ]Î⁄'∫\Ç§iˇ,V≈ôú¥ıS‰¡ì+«§èÂ&úK˚¸ÜA6Ê°ÀÔ∫‹e{±g”{^x<üjG13˜€õàí¨±
U(Ì÷-õ†ÃÒ†¨œ÷ÿU1[ÊSgâ‹E4qnvúE$§ìâªnã!∫ªGs?í+ıÎARå¢ºRnËzˇ”8Ê—ö—¿Ü!Òä•sÅ•√zU‡8©ΩÔ(ç&»
‚IKßÁ!‘|≠g23ÒéI™ ã1Ÿå·FøÄ˜…œLödú®¸∫\zÄ¸ä>@∫jMÚ(ü@S≤ü•«€ØS@5R
]à;ºΩ:∏äw—Eï\E2ã2” ‘,±Mv0‚j¡N\%]´©ﬁ^q«ÉÇû≠ó≤©£"—¿éÙæ˝,ûÕs6	|≤≥ÑwU(ÖÏcâÛ<yöÁP⁄…Ü+o˘h∞ô#ú/./å+/ﬁá5‚yüjˆÛ‰¢Ê=@ÕX3˚àmçÇi(_ΩRÉQe¨ìÃhÓìÓí1å◊OC9≥4·ŒÖ€Y©[kÚ‚ŒÍm¥ñè˝ÒtgÈ‡bãΩ‚yî¬&Ã8≤J+,Io˛ﬁ∑ﬂ7G'´_&yÎg/Tiå>‹£îKpê%aôë8bCÆÀ#ç∆	pÕ:	zè˜Çx»'UÃ–·*â•x™_∑Œ·≥~nØ“ AºáX]eª˚úÒ<ò¬¯,öÒI‡rvÃ”≥ËÊI∂¬‚Ä·8ßÏ?˛Èø≤al>ÿÏ:}&ìyLj"@,aÄÍ"T:|"‘ﬁ«Øwø>8y˘jˇ‡€aoóòú§|»x≥≥b^nú Ω°G˜ÑOOÄa„ÒY29”ûVÈYöú·}>áÔ·\~ágÉ¿W#%`]!ON†X Gsæ¸≈ÙÛ›Øû#Ña˛€‚≠»”ÙfÉ™rg>[l˘àû`-5CgÇP∆`Aw≈î+fåe·jÿˆ›µÄﬁ}ã·4Oèo˛pÛ/8µH8L¸™ûÜµç’≥˚PÀgwÒ™XTwMU?y¬‘2Ø(Ë€I†Ö äÄêuÄØä‚1]€·àwYúdP 	>OÁq4)Á$FøHÚÄ¥¶ªûÊ	ˆ¡©j,√"/5vZ›F. M±#Ä‰ÈD%Ü–LÉB¿¶1¡~'¿U&CÒO6 ¯ÛOˆ&˘*Î’¡Lp
Â¶<õä∂éñ/±	Ñ/.ë+‘ö&0≠…|o~òCªr‡®æé{/üø|U«+Å¬Ò_Ü)~FÍ;ªÆÑXŸ¬≤ÊπÅãÄΩ--(kìûcõEYbA-≥k	–ç¶µû»iZ<∑õœÏ¶´Œá—E“˙(ÒÙ!_ÿù»áï(Œì—≈lûŒ&æí/Ï.‰C´ã‚ÕæäËiVæ∞õïÌë'ÿhxxƒûfÈ±›(=™Zå‚‡m_Ú…$9˜¥._ÿÌÀáÂµ∞–Ö—º°És⁄∑ﬂ®L’óÏç8AÄ F|/ô$ÈÀSº•ﬂœl#ÛîΩïﬁ!soæË;ßG`≤AB=·)~ãIv®@8Äã y! 4ë±√É„√›„ÇwrŸ%
Á—^–4∫JëÖè®ìóØˆv^º~	£{Ò˙’.|°éW|Ø=S4Ó%ítB§√Ñ4—∞,WÔß…,LŒ%≥hx∆a¸Ñ˛ŒC,˜:ç&¸òû∞k‹¡˜¸Ú	1v_ Ê∂ÿq0·ÿa˙e©Â-÷)ï¥gèV’⁄¢≥$
ø4F›íd¬É¯K=&Ûô=:x„Ü`ÉÏZ€à(É` wá¿âÚ◊¡`ΩJí‚	Œ??B’`<B*ÕrdüÖd‚Ûä√º!n6@kgw6ì_ªæ4:	r\®ÿÑhO3j˚LÌ?]⁄å”$ùÆäçê†ˆ”`4"¨=B_«IöÉâ2¬YäEYRÛÑANß7øú!UFöäÙZ*◊≤Lîa#∏D≈f¢¨ˇ‘I∫úp§$≈‡∂ÿﬁÒqˇ5˛Dí rç≤BP%∫Ê¯•L˘F:Âß;W≈ÙØE_ˇ\≥+ê'ä5øı∫ôÚÚ’0ÓKÙÑ-˝Haâm±•òw‹≈%‡Âè¨/"4ÌàWt¡_,Iû8ê’ÔËÂÓ~©¨Ö`s* ≈*ÌÇWgyñdhy]à›ˆ‰Óiî&Û ∞ñ~¿π.W¬Ó∫Rà˜ÜdÇäBÒ.¬)ÏΩ]ÔØ}˛N>˙±∑°ﬂé8∫®s≥5mLØÏä1∫bÕpÜÛ4K†◊$"+‹˘hî†`XÀx4ÄuÛ¥«Cl!gçLÀ3∑GkÃñ√P•ä›[ç€ #'ä7^U=âïZ_{$⁄*_+Jdc%‹;n[öuˆv8d aøò'3ÿ¡M‡/^6ÜˇÂ∂7Zï(-™RŒ±aË÷ÿÎ;hZVöµ´Ωµ ocm…hæ8r÷ö@o∞"€{c>|Ø¥Qke˚›Z∏ò˙(W˘d‹68zØûw{&ıIWÚLa’`%^H+⁄ÂØÇ…•$[õÌ—3„N6OÁÒmÄÖ⁄ídÈÒ∫“Gøüí·ùﬁg][òqfêcOG)G≥¨NßitN#+l˝a∑§
ˆÈü?w‘œÊçÅuŸ´fDß'–Uÿ%∆1O¨∑ÉîÔ{Á	äoŒ:\iàã3y˚NÿFàr#2bÓˆø\—Aaù¨‹óèAdÇ
q∂|]ke"€ŒÜcŒÅ†=˜|÷±ÉQ[öö(F’L6Q7€oWyª^B'∂!pæx'Å∫ŸeoÕPﬁû¢M∂}üa6xV-)Ö‹úÚßœaô¬pıê}ÛÕ÷t∫‹µO	Œ∑’1—ò¸qÕr!ö*0”ÑüÊ4[BQ´¨ó+n ©<8ß◊c˙◊ZIz¸∞T&fΩbÒÎz™ƒ´Úca—ä‡‡Íí∫}J⁄BÅf¨ÖîJ…÷€˙Ô$>Éﬁ&÷÷bÚ>œŸ0∏¡àLÂ:]∑Æb-¨ÂQô^˘*ñÏé‚È≠™≈`‡G±;µ≤KPr.∂o‹˚¨tÉÁªÆ[/l¶!õMPÔûÛ‚ „éÌ5Ì[…<ß√â–!ï≥˘ãÇõÖ’F9Z›ô‰»9ZÜ‡%–PX∂ÿ `Jfƒ¬ä[ŒZAís◊iÆ‡:Sù¯6
ﬂÚÌÿcË∫'ñv°RµÎ–∏Í]èîáu9O ∑J»⁄J|œ¬Ã˙‹ﬂªËu‚»Åéº≠√Ãê˘ﬁæªŸFèèy.µgè[äàn1ò¢(ô©¢@ΩÍÂI-”EŸK4/ñÇŒw&$7&:ñ˚‚ k¥wÀ+™ ‘7•2‘#f46º'¸6À)‹1§RO˚¶óùô∏¸(÷™?≤Œ≈îVƒíΩrÃ¬ÂùpΩπp…,`…ÁZﬂ2Äªj3!Î¿ W˚;¬]ycï,ó†5K‡‹ÀkHΩÍ©ÿt\…’≠»í]•ÜÕá‡‘M"íõë\ú≠w§¨∑ó2®‹≥œ‹[cÁN˘™<W
¯b!ÄyÆÆÕ˛ΩÏK%O¢ÌFDû=õ·3Oz˚ª˛£j˚L”*©d±‰lB¢Tî◊é‚ˆWx€·ê#e4c‹82EYÃ*	ïe®”UPlê}a$‘∑«YB|=HW’”B—°'Òv≠ø∂˘N¡Ω⁄8‘Öıâˇêëœ∏˜ˆ·ö∞ç.√Œ˙⁄⁄Ÿ∏∑±ñÚi˜C¡Â’ó=ºÈgB‡Íe√4ôLx»Ω«·"sîÑ›ÒHµ—C’ÅcÙ[ßHÿVö>©Rõ¥sÂGY®BKêF¿≠¿∞Ú&¸< rl‡ÍXæ¥sª)°,€Æñ¥«ƒiŸˆZ¢gıË∫D⁄wÆ‹'◊≈≤XPMívÆ ƒI+“ÆTéòø±¿6KtVµ$Jf∂È_Ω
g©ΩcZ	~¶b…–èm?.yö)_ëœ]Ÿ¶B˜a<˜‹˙?ß+÷a2ÖnÅRÕ3ºÄç6≈À»%Ñè`âÓ˙=Éˇ‰"†£ö∫nÕ»‘#‰w£—¨∏ƒ	VEaˇâ-øJŒˇr—≥^4ÑQÄ‹†O%ÚƒÚe÷~√û¢Ü5Î˛“ËXâtç˝ñ}¶ˇŸxÿEìQÙ-∆ ≤HK*∆G™Ì ∂-ám[*è¡«¶«Ø nu¶±änk£>-N;ÙOX¡n"FAcAGvÃbçPw¨QwltkÆôìHKc±jUyÉ¶¯9‰Ênœ:€ºÚ}Í¬Uxç&‹„	[≈€ƒ† ouröc!◊¨W¶ñ∞9Í≈—QÚµ-’‡HÇQÖ{∆V“äolî¥‚ï~U(≈ÔX°moeu∂Oæ±ŒÜ√æW˚çŸ ∂ƒß≤∂Oà∆Ë‚ÑT[$ÀÉ`Ÿ#oπß ´D˜™»Î“b
Ú+=XŒeÜn@Ø_ÌÔÓø\∂ñ•;Ø>YJsÓ5Äo°Aﬂ¯ıÁı˘iœo• ˇYÙﬂçÍoK˚˝Âœ’}OF®˚˛uﬂ“9®‰ˇÒs(øÌC”Jı}üöoKµV“{◊3¸è\2òdh:ƒ∆aÁÊd§r¨K
'c•ù¯R»ˆ≥-¶^ÍêI6õ˛VÎ»â§ÔÔ§›@=ﬂ6tÿè;Äˆ¶˜≠AUüãÔfU·¨nî«∏4 RVtxl>±Í°µdÂD[A:S’ó≈o´‚Úrπ¨„WóF-˙M≈≠©.K)oôÈÉæ¸∏”1¢ÏH3°‡å£IŸ$ì„<I!ˇ®cg9ù•…	ı{"–Gr¿õ´X_íüómPË›Î?öèÂ Ä âá[˙≈ÊŒr?JÌi¬œ<ÉlHsƒ0Dw3√0J´'(∫≥&G=õS√2ÓºÏ˝Bê?€bæMí”≥øù3@Ö÷,≤¶}ZaXÁ⁄?XO5k=#PKøÿp!K#x+Ãá–ÑØO¥`-X{+¢≈i‹°êEFC»d*ÌC˛≠¸·ÅêÊAò&4?≤ﬁ§o§πx¡qTåÓ›Ç5Î°ì	I≤≤ò‘|’÷L≤ÿOkë€Ködy3©Ø‚v †Ω8pz6ıqßÃ‘òÿ’R-Â«˙g=^µ.?u=˙m”Å‚bÒ1©S‡Aßk∂e_Õ'Ô¬à+¬”»|T?ê(;Œ†yUC6`?¨ob •ûF|"ßÚï˛iUÄk±v[§-Ÿb‘‚ä ˇ[ef≠öï«ÅêLº¢inﬂhj:7˛ònˆntf #/U[1* Eî@‹,dÖ±√˜§M∆[>*≠"∏ëbá√X≈” ;F<y*ÒïåNgy[]e∆’‡ky5hxL≠é“˘,A≠üT¥~0º:L0u√Äé˝H‡á(Å:¶XΩè*÷Îk≤
›Ò]Qﬂ—∫˜Œár∏P∫ìw…Çâ¥VV/9±˛ ée1°ô≥kµF\“⁄ΩPË-ÍïI8?ó´w§eè¯ÖŒ5DVH∂ÿ√F“ ﬁìõ‚¿x–˚9›≈Ø8˝ø$A-@}Q«ÎkûC∞/Ú÷Aï›”%2hÒªKå9I…|qKTÊä™cMÇîHzßuñﬂ£¨≥,}Ωã(~1F/Qc1$ﬂGB?:À"åì¨KïÖétı"\oN¡5w:4:C9ˇãCzïúwã‚íS6∞óÿGXﬁÉ”S∑9sceTO±Cêˇb>A[µ
ÚQG∫íFTØ	»è®≥ÕG)œNÜ$<f43ÆO˝0 ùM—n6Ä$ãÆ)∏á@∂∏Ã,ı|ê”h†£è*}µ¢†jp‰Ÿ¡˜‰ÂPeÑVﬂ⁄ÇÀªn90mxÜªtå‚%≠Ø=ƒz¢€I>ß®Çê£ì›8¡@Aà}dÃ/Ï+è¶ºK˛m"ÑfBﬁz,ﬁ*AÃ…˜Öªp†˛µÔ,âe— A`ZÆXøﬂü≠∏ƒHO 	Iv¿ÿÃ∫÷˛7F^’;_D⁄Ωúd•nÃX®Ü⁄ˇEDd,T#æÈå'xöD`*ª˘„@b ◊5UÆ~2˛ií™ ®2“©¶!oƒÌúævõ√Í«∫;èü†W$-8ÍJa[FsXt&¸ÑÄÿß∆Nê¶∆r 
à\Áøm@ô®¡çUıª5@ıwQ>ñqSo_ÚpäVƒçP9(Îwá4ˆDπ®¿l>≠‘JÀ@À◊"|„“ß∂‚AÊ›ı“ìÔå={P¬éÒZû∏÷"È∆JÙETB.N±bHÅù ¥/ŸGø∏Q∂{∑¯≤(„√ÆWZr^&û∂ô—B;Qû&ú‹òfô—˙‹¶≠'Tã*WÎΩ1Xxçós≈YZ∂ dg|ÏGü^åc`p7D>∆ß“˛≤ykW√Ù˜ª›ŸÑ<rÒÿe≤Åõ?‹¸ø"Ó‚ßWÓF)ìÜ∞&Ya∑?§∫•tπÚb-’:ŒÇK$%á^@f‰™{]¿iÕ2vU;}uAïµhÛÕ°òkˇ,Kú∫ˆ∆ J&¢Äw∞à˝_'P£SU^®ZçÀ‡ÚÑ‹}◊ÛQ/NÄYDn“?pîP`–‹•¿Ï∆Ê9êïEÈÇpJ±éÁúi™[ΩÈfÙ{ÉH\5êâ,òú!ç(√Â4 pıÓ+â8R“©$‚©A≈€ëh% –±BF>äáì9à)“LTÒ63á//¬ô5◊ø‘Vá/û‘ú3…	 ¥ÕÏ˜FJ¨ÖÚé{*0ŒOÚ”(Ê°Ïƒº\í}\+ÒCÅE±”ü^!Ù=Q∂D–Æ†¥ù3–ã‚ƒ/∏öÕá∞”…ÉÔ*Qµ	iépgk"ò≠˘(Òÿ‚†‡%J0¢Ä—Hƒ$¨ü‡o+≈T¥âí}°åCN´∫•÷‚–iû-€bçhqÖÏÛË‡R5=!kZ£'·ÎÿZb`i›¶mâakCá’31ÂÌ&QﬁO&9√F”¿ˆÅ‡˛å‰]e√›e…‹,ùÃë£#v∏çQ†√AH&Økßt,M¡wÃ +≈Åƒ"ˆH–Æ|∑U∑≤V˜IãKøbµÃ°‚≠u˚ÎHˆ@vz¨L°ë˛Ã,ÔÊ∏Ø@›w©€ÕÏ•∂∞€aos €'ëÊ0;.lÿ"YãÆT‹®8ƒßY◊R]GM$-Ã:ÖUÎ∆\2⁄s∏k¶·®4sËµΩΩ√6ä≠‘Ôê£*Ï ÂÄáS<‡∆ÕòÃö”œìÁ…π21Œ6UÈ∫}hï»áî€&<+K"ÀN√≈qÌZ\@ñ—ñe8íaº0√r§æU[ØPå)åÍDÆÍúå	Øûò◊HÊù[◊&˙A…Â¡¿6’S„X˚≤∫û.¥n™h©ßK)à;=5”æ5∆ä∫–†™êrâuë•/Áûà^∑Xˇö‡X5&‹€Úï∞∂≤ıXÆM‰Q\Öµ¶pÇt˛≤…≤iu≤ x˜	J>Ç¨0Ônù'@ÿSõ!∞Ï99…Ó9=¿.Èïx°§!î¡(\2=Ë*8«h≥(∫«¿rí¨.‘Ñ„(Ào˛îFC (0õ‹	BÎFôlÁ8∂!†È<f-Çø⁄ıKn2µf<Æ{ö¯\Ωuü0&<˚‘UÍäÆ˛V=¿Ù[`8¿Ø1Ÿ¿u…kK∑"naãFé0åª|&⁄nûŸf]+‚∑hÂπ¸-Gø¬ ”¬;œ|æ±¨¬·N|»nË]C|oÀ’ùrÁLÚ©(ŸyÎ÷;’âOïõ!Ÿ‘}NFèÜa›4l4ì¥›∑„+	6k’f◊÷ÁLﬂπ6>ZÔ˙¿ë |í⁄«XqqÓbaxmD(ˆuÌ[œrdv¯l√® 2£d@E•
„(%¶¶X
Kèa√	¬Æ›EÀ!gôÎnÈb‹&pÅ()X?#ÿ≠…•[6òõ’6òñ=R9h;€é0xjyí“TŒ`B=o⁄8™C`pïb¢ñ[∞B≥~5œPªâé9»""ñ¨=Üe-W∂evﬁ{¥± Bú@µY™Ú<ïÌç·mŸ¶’∑≤x,Õ¡çPÌO(gwàˇu◊∂zk®∏≥5U» Y·≈W ®{¥µó≥∏\ZäµZ‰~©⁄Ûº-"¯O∏ÉR´R‡hlñÀX¢Åø›r‡zÍ%Me∫c⁄¶u*Ÿoiú'M‹J[-ù(™´Ô•<#:ƒ0I
¬pëxï"@î&]jzüùb(∫„Ø¢\êUy÷#IxZÅØ“ŸÁ·b¿VΩn€¿q&ÁofD˜EÄﬂJﬂ$í¥%K``ñä2•PÓ-6…›çeó4˘hX[Ä≥Ï{;é¶•z{ΩºNcV rC (ã+ôê72/÷PÀ<3r:„¢†ŒN{‡Ù‡Ãæ&nˇÀˇÒ˝3;L–H√ÎW¥}/áÛ	^Å(¥fíµ⁄L”)ÌI9*å'ùçÀ-êØI˙„˚TæÉ¥o´ÿ*à\«¡/97∏–ÆøI(¥Ô°!ñ∫ëÃ‚ó”Î"†õ7È◊>æ_‡Óî‚µXy*Ú9‘	*%üQÔmIÕãUI|ÄÑEŒh’Qj¡ˇ˚TÖ∑˜¨§üMﬂvò.º+ùéäµˆ†¬bùEøRùfÚ¶π§üyÅ]tÈ›Ç‰Áy¸√ƒ7õäf£•’ˆÌB∑ ‘I®fâô⁄∞€Œ¶∂á*∞Ñ¥ñDÑA_ÆQ©3â2ÿ>œ9ôŒ¬îYæG;pm^ä Ú«uqÂßû√WÎP7d]‹∞≥.>D˝UÒÛÛ"Œ<&=ê´dO'L…È´9´¥Ö§”êmîaUæ®)!ï≤:záæÌ±Ó3:mÓr∫¥´Íb±‹U9¸F≠móg6˛ÿÂ+Z¥∆7$;\ám¡‹T~w2q´ê—≥[œEPNå57ìB&FpôóÏîîÍO<QPT‘∑∞/˛I˝vo≤Ì{èı¡-ßWsNæÙ„hïF—9AµYüt‰úãä»9p"›Ñ,ıgÚ™åˇ•È‡<ŒãKç;;6“„ÀR∑N6lÛS£Úl¿¯)”@◊…•S}¶iAZ(?ÔÔj¢È#ä¶ƒw[-hK(s=~Ãçi‘á÷DdPÔGk%1∑ï∫‘´/ı+LYE®Ærp.r7£rπ°∏åx[+mV©pGﬁ®RÎi[ãÇ1—ØËhπqºÃO•¬ñu›ssmØWY!ÁèË˜¡«Ÿ]§n]å¿ ÏM©È‹ﬂÄÎ#ﬁlâC[u©aﬂ;8'•¨o¡ÊZÅi1úÚ¡ú\ÂÏﬁ`ìë≈LRºù2m∫ÁÆÆFÛπÉ k∆B—÷É≠9‹[˘v§≈˜∏ºu—⁄¸ Ä–Ceäà™±P7¿≥’‹doV∑ákûıÒﬁXî¿º&Ÿ[%√'˝[1|éëByãj◊ÇZÓÌW∏‘ñ◊£“>(4``5CU§ö≥1_ŸN ‹∏9<Õ¢˛û3eù√”—‡y3w÷H'•‹ùÃkÒbõ∏ ßÛX∫ìPrπÈ˛‡/¯?Uû$8$Ù»H‚Q©9ïÚ∑∆Cd{U‘}Ï(l∑»∆•D¸)ÏΩeây4#†JûÉ«È]‚¿¨Ï}ëK∂â\∫æ∂‰Ê¯P√&+Ä6÷;Œ=ëüπV7ÌP7rÉ‰bâ—7D 53ºˆ^ÁZ˛V˝~ﬂvìw‹Ø¨˜éß9YÈa9 r≤≤TÏ*{K0ƒÈ{ÌÇ=≥ˆ_*‘	hÿˇŒ…Ñã+\ÏH‚¨4–@4AªÁ}W∑–~∫+'‚ªà◊y#_ÔÌ·óáôˇ∂˛Ó∂W:Œ9W˛◊Æ∞c~|Y÷◊n:ÍBEç≤0⁄ŸOàOÏµÕê`ÓÚ}&K0>˘H¿k	†jï+Ÿ
s„˘ùc›í≥—ü“µ'xúÎ∏Æ:g“
Í˜+¬∏Ø80≥q®Ô°ÔÔ:¿TÉv+Ï”ƒGÏk(›:{‰4XÅ$º(∫‰ˆywz`¯8ÒÛábe?ÄV£0ﬂ≥ÇI´$Íå-îG›«˛7‰Q7z¯0´Ñ‚Ñön•k◊¿Ùm˜·÷Rh|rå>ªqàÊïhpR¯ó78ìW⁄ƒäE)_Vπ  #ŸªO¸˜^Ø«é^ø~ˆ‚Îc¸aáQ<Ê9Ê»™É(Æ`ñ¥M(≈/©‰€ùÕﬁ`ï™ ãÅÒ\G–∂É~çÈ}óM?ó∑ìdîºI'2∫"}∑Íÿ£{“óÂ•ß÷óvCœ—èC7Eø	áMÏÈ{›˛X§Åå@
kä c˙ßvnÇQı†ÉÂ™ÊÙåû!Œ≈OÕàÒs˚õ◊áœÈ›¡Ñcåo8áÖ¯Dø ≤ÑgM≤1≥Ò≥#ˆ◊xA⁄ÆË,È¢!ßŒ00œÊÄK0‰’åbÀ·4äŸ,Aåã∂ñÄ3á9DX Éù áïp£Y´ªØcsä·ÚxŒQ P°=e<åf≠ì 2ß\ÌÏhˇ€ ÿ‰0@ûªeEåá4£ÎÂm˘⁄fp'{B=Œ√ÉoNûΩ>8<>Ÿ?x∫˚Ê˘kÙ‰§ì)]1¬ SÙ'√c_?S.≤0ù≈ûŒ„h¬ˆ^∫≈dXÄÃ({àQcFi⁄)ãAÍwí˝oŸ◊ÈÕÔqJù„Zs≥∏ZûRQê%;qÃÚ‚≈Ò“êéÃdT+˘=πµ“dê¸≈„‰$NÕüAo#B°<•iD`jÕ	ü˘Jg5ö„öYø3Œ3úâ9È,EÙ◊C˝”ÇLïˆK§E;ã≤àÇI…ÃÏ¡∂D"v…_¢Å)&z.™À¯[VÏ¡b<FêÃCÁ·‚Î–ûÊ±Û∞"°?í˘Ä"…x“è≤]<hN\;LEÔÕÅ«∆,bö·LOƒÀeµi((¿	≈ÓXFÈiéu¶¡ÂÄ√ê'ËWõèÅIÈ® j]”«&¬7Õ#≥-¬é¿xÒ/1Kt±à˚–∏êÏVÄñæRåﬁ$ıë¡Ñtí(≤a‹!
˜îa Îi¿:ÑxòEaAS∞(Ù©ãAÓ:¶®MÍÊ≈≈ö
J:9#ÁrwÑËƒ–ö_:ÕEav¨ZT&ë¢a⁄ALaﬂå®jd‰dµª„AôÍ^à ˛ÅÓÑT˚SjÆÌy(∫µ`øÉæıb†+(]®—º”3%c
Æ∞∑êz±!Y¥Ôê‰9,Â Aç!Ã‹30üek§–WÄøe¬Ω≤¬0v|ãKæ·o0¿ﬂV·∂åÓœé_ Ô2·ı
≈ó¬Í¿ˆÊµ™#gFò*M˘ÉB‰¥âÑcFë2â~eÂÜ`
R≤á#5ª˘˝(äÌ¨PÃ/Aÿ˚Àvx∂]ÿ
´˝àî0¢®kEh6§¶ù◊<Å)–·
˚pÇéØ+@ ÛéÒ
ìWf }/”!ÖÃK(hÙÄ$6E≈/ÜìπàDÆ»®‡I¶&6‰[0íuï†?öDaÄ∆9
N`Ò4¨¬¯N^Ô~U…õP$É⁄ŸSq…„XMÃ®ÒM·Êòr ªî»*´`‘íÎ¬VEPwÉ!„õ§Xq•≤â^Rã° l(üz¯Zqá—I}úW{bü›¸1¨Êã<ëáÉòÖg≈A¡¥"Ω˚ta~¬›ˆ€p÷ÿÜ‚®¸|qû¬jƒ`+¨Áøg≥>πgÓ¬È¢Ç√pJ\ÜÛ¢Ç”Q∑„_é(¡Á˝–ˇ“A∫6¿Í¶û∞ä˛ÏÃÄ [¨åÓõ/∞‡ÁdàêKí≠9É ª-kp;,$∂yä˘Qç$›+Œ ˘ó”Çï†"
ót€Óùp∞Ç§S(Hñª+Ï|ÃSﬁYé≤W¸,yœ	ÌÏ¿øbÈ≠Áq6`,•¯8f∞tyÁá÷…‡áÖ T∞m—éJÙ√d(P@hú“êN)ú¥∞è(ñÍZyOÎ#Gq’ÿî‹˙®UT*aL<T,	ﬁÜ¬ÅbC¯ªπÜÎá,ÉÈZç¬bù!ÛCÒà1.ÏŒ§-hà¡Í›AÉò’Kı∞£W/è^=€•ﬁ
E+;•`Ì,ôå	k!∆œ"Ã¸,Ùæ˚Ö÷
uYD\ZRtÉaqá å@“√6TêﬂîãÃö,#ï»z	[:CÓä¸˘≈Tó4ò¢à∂¿O÷&ƒîm”ÃñhæﬁƒÄi˚;ç•) õéòßZ5¬e˝IêÂ«ú«ª9eû@5k€aè∂qcdî/˚e]¬A∏a©åIv„_„=3Íí]>î◊}ótÜ17ŒÆõNAß5ÿè
dê´˛Ãó÷†*jÌ≤U∞%¥wàÉ`á'lóÕà`º¡-Py
+Ä‡ÅN” s ” tÂD≠Õ”K}àE◊œÔ'√Nàˇ[ÿcÖÈ	t…k‚Dø‡ƒXdàΩeÓ.’I=7‘æó?Q®ú¯à‹e°1R¢1≥à¯ÁÏàá"ê:æâ“6≥i@w±2B*•!ºˇ˙ËX-ÿ"†4ﬂ¬4¡¡%„Ç¶$@2ƒ®iËÄ§
ƒ™’õ?‡Ï‚Ñ$¥òP≈à'G(LIò@3Õi~0ºæ-asP[é(eå· 6† »ÓMM≠#‰ƒ7ª≥Y?œ.PQ=G´Í∆O∂n‘º‰∂S(ÀÈûaH—∫Ë3ô˙ﬁ,¿»Ëó≠®&⁄¡~UÔE•Ó]¿ÎD∂,˚¬(l5Ãå.æœ„aú‰á9^ö H†≤0∏≥Sî '≈rd◊%s≈T.*Ì€
[T Â‚Ù¯πu=Ñ^n∂m*ä*ÔùNËñÎdéw{ÙÔ∫ÁbóÅËıùû≥Ï^pÖç®±∫ﬁô‘0úÚ2Ê/.IS
Ÿ~ëàB]*Ù∞òÅ*Å…(Ï’U9)tÎwóì¬CÙpÂûF.¨<
 ·[ÚQº†PøÂkƒeV@q ¨ÀŒ√ÇÌkk¸ù=Èø]{gDÙƒá6•√«¯T@xÃ>_|…∆Cﬂπ]ﬁe—é·ca# ∫h:Ö	”o~úVˇõØ˙t˜ç∂túG	Cc ‰5QDP$◊é5iFë¥Æ|;r	<òNFõò|ìN˙‘gÿQä7Xº‹LñL0hr øá£eù—Ç	éUHÎ∏iØËAqvò, )èºÄŸxGæÖü¿óZ·ûKıÖÙ∫#áS*Äv≥}úŸ´Á¥?Ö‹Ì∞ÆCr»Ü¶‰:)GÇñ'Ã¡! ƒF#_:®Í√ÎF—ö±∑b»Ô∂‘÷Ø⁄K”mÂiK\Œ«á~òo=+◊-#J® º‰¢DzU¢~vp‡Œı‹Y>@˙<äåmè€±µLë¯§[πö†¯TU%/Ì3íâ•?aVí9`Ì ó	€Åß‚ª≈·àgÂúû òGº∑2¬âGÂdõZï/°÷·ËŸﬂ≥Œ±3h$äáiì÷˘7êg"8ëéÂÌ,∫¯.≤t—◊ö¥û¢ÏÎÀ7 „O€úd8;%¸:ågﬂã4 5OË[ì:ÖSK?Ç	ê›≈‰Ü∆ß«ØxÃO£a§zî∆£˙—ÓEπÆÑﬂÌ“«òNàQ©« ~ØªÇÔ5}H›rtajî£ã⁄|yªœüüÌ˛√·¡ã◊'áØøyπÏ^í¿ L
¯Â(˝C‡⁄1Zói‡°π˜Ä5Ç‰dò[òõˆ‡	ê*ˆ“õüË≠øn»ïU˜o~xjí©Ú)O9à:÷uè|~ÛØÙ¬©5H0h´Q¸+Ò†d≤sAiÀ>ª˘=>,ﬂzòÏÙéÇK$öá<'2Y·ÅÔçG(°#+˜≈\˝ÚÚ:ãˆŒ.Âa{^‘']¢ÁS.”˙ÓYè‹+Lü5!UÊ†öO<˝íùr2„ê∏?ÒL\Á–j…O@∂!•ˇ[ﬂ@Ç—9YaQW©›¨¶#ˆ◊l}≈jyı‰üHwn9~Z9VYê&±_~n-ƒZy=≠E8∂y◊PcN¥3ZçnU(˝¯E4†dxÄ,_[6HÚT]Í-äÅß‡xÀ
+ÕÅ-I Ü#ÏMrÁîıx∏ø}çá‹@≤“ÃÈÔ∆Aû≥ôÿ-˚Yíëµü·2ÉD?5´ÎáÕıüC>Hí˜fuı¨πˆ‚p≥*=hÆwKcV√ﬂ-z”+mt(ü5¢cYﬁÒ§
~ôÙ∑∑ì;’≠ûyı¶i±º»ã.NﬁÛK√$’)Ü$€*zÇÜ˙Tﬁ!√fEÉÍä É‚¡I,≥∏Ê±Íπg HêECËéJÖlälut∏Ú ~˘ZıbÛéÁÆSÑìô(y2Eã;œäfÿá'µ%A>¯ zQÏµg¢Ó	Êo94kå⁄}SqU´@wp˘¨@›:iò†+íòy√ƒ«ﬂì æ⁄9ï *í˘≠ﬁûˆMRÅßÒ¥_–	3ı™‹Oõ¢uÓå Ÿ√¢Ôÿì'ÇPÉ∏6ÅÀCô:/hçƒ∂–Í9ôâ"]Ñ”5L‘/wU<<9óO±ﬁﬁÀ√£›ˇp≤˜Ú≈Î›Ω◊}ıŒ€ú&v{ëzÏkPøÙ∂®®É›‡©|ÍkOΩÛ6G√nã$_CÙ¬€
ª¢æû6π íí8cëOΩ√ëÔ
ÌÅ`ÒÑ˙P^;õÿ”Æ!*8Ê †˝≥NO©˘~uJ¿öƒ¥"æÇÖÂ%ÊØKÍÌ'VN:ù'
ªÄﬂÈôi(2•€ÀàRµQÓ$(Äâ˚ﬁïíù∂Vïy-Ω"ä
¬´G‹Á—Öì√2`ÄãE˙ØY0íºÎ8@≥Ω<ÉvCgïªë≤‚gPuUŸ-ÊóÏ~1=ÿm‘V¥[ôµ]∑—bµQ_9ªj√\; ,VŒ"¿t∏<b‰äGå¥èûC«Ky OÒóÕÃ[dﬁÊS≥;J—|⁄≠9~v◊ı∂RzÄø4∏ª‹’sƒ}]“œtl1üx˝Qú
Á*≥˛h‰¡Ö8C°p™>çF[vÛÈ¿G›¡10?»8m,Ù¢ã_‡§∏≈§:ÿ}A¢zK
`]¬ï©î©¥-FbΩ%µ¨’
t¢"Í^}Ä™w@ÿe=˚˚€Ä™ˆΩ±∫;¯EHk∫Z§8MP¶(¯ã∞+=m©'ZÁV*™e]∂–∞ï
+¡Fó’⁄¥RQ]t9°7+BŸDó!Yπ)sM)•ÿ/v>,NÅ8ôHZ¯É†FU sˆÄ˝ÁõﬂcÏº‰–&o˛tA6ï)©W3Üé%⁄k¬`any£ä1˝“ÑCûˇ·[]e‰ ~ƒhÄl©(Ω&öf¸étöo‘/K≈/‚Kwã sE”9z(Ö¯^˙Tªœr¯Ñ¢ˆ5~£≥™}≥˜DËÙ!øvò◊+¿ö¿,±)q©R¸ˆ±l‡e7≈CåŒ†[?k¥æ¢N°†>(~7÷:
≤Ï<IC£¢z‘X˜¿°Q⁄°‰◊MWù#º	ÀÂµgé'[˝—E@ﬂ–3äáI*lSxçb.~$Ë”¨ﬁˇ‚ °KS›TytØÉAfåV›kΩÛ¨KxÊ4 ü,–∆.Yàõm»'¥!BFvçfk•wVª•∑è;W◊≈Ì•IïÁé‚:G. DzâÅFVDÏÁi˝%‡dÏAÉÛã‚wt…Z@ø04◊≥@˙Ö˝¨π∂Í≈Ô_™?©u|∞ïDµ˛W“4c°òÔ™¬¿£CjDïeôºÜÇôx˜*9WÍ‰¬¡«´ÿÚœ ï“h"ˇ3à0Ìñ1≈,©©à*'ÏiîraÙ°¢^`ïyú±≥Ëå<ΩŸ±©/úp4tuàúËÄ*oq≥ïSÀXSL@–îßdôß≠C5ù"'(´;Ú–∞ZñÎ–ÏkB¥pŸ„G¢÷†Ö?â5ñ€∏ì»U(Ó
hÚcØç—°ÇÙÿúÎ›'™v ô¬>uñQ#mnÄy≈0+Ωc;œÏ≈˝ÚÄÔ—	¬ØÜÖ~⁄öŸ¬ j5õ∫©‹ôíZØë“O[ÉÙ+´È°£≠∂‡™É9ö>ƒÜ´J˝o-*keñ.–XDÂ‹0DdüÆ≈„»ï#–\mº„Lg¬ΩG	>U‰û!´"ª-¯~r§ ÊCÙy‡cË´x˘Ç?wÂ“Û˝ Õ'r;◊x»QÒågg.≥∏»Œ‹ºm±yExgﬁ:ï¯Ax?ì_≠ªgãÑB)¸ë.g‚J›f“d$#V∏å`p«≤Cr.851@ò¿àÿcÛaa
_ÏædtM∂ËøˆˇÙ_UÎŸÕüÑ;Ÿ˜ Å›¸$IF'ô£ÆΩ÷ v±Ìò‹}ÑßŒ'∆O:„i$È%@{ﬂû%fif	O§«˛íã Rª w¸	{kE'í—áÃËB2zê»˚«Èc›)bÍºìΩn›{ØÔ∫%®Ïr±RÚ!Z¡
p`D-0Éÿ¡¨PV®Ä"¿;w0íÔ.#–`‰"œSb≠IŒÖ]B|√D¨äïíèºß3àwC ÑÏΩ÷«Ë∂ét¨Vıe>ÁAhï√¨‹{î◊áßh®-À‚„›ˆbL⁄˘îÃ	eÔŒ√(`UönâıáâO›g8˜ﬁÍüÛIÓ´B0Ïú‡öõ‚≥çˆ+1Ω!.W£yR√—s≤8N=dR˘dŸâÙ≥k≤Ü'Q<∑ÿC]∏íàÓjÖŸ][‘É1°Ê5Du„ù‘~ô2πÒ©é-x”µé¬´™û~â◊; µôM‡Æ®r$¨Ô§§äê[."O£ÓPäªÂÇÚ§®ÇJ¶5
6Oì|Jªk€ﬁ4±Ï}A/0i=9~0ŒÊSˆÊÕ≥}‘∞!.Ô(jÚ}`∂Õ/0∂ìŸÏ•ˆÚE◊_h5FùôÙb¶xt ¡”¬Mq‘>Æ∆ ¢…ãÕ>∆{∏—4L$fHe‘Ù∏D>b`MÄæÑÙ5t@~¢YØ„=::Rñ`z»£Y¬ñ6{Îü}!?K]$ãbııL†˜ }∞#åY≠„tbÈ©àÆó¡èL(ó±ÜµP=!ncåπfæ◊bX∆Pôb≤⁄Ã8ÄâL.Æ»ﬁÃÒÿ≤’ˇÌÌZÔã†w˙ÓÍÛÎû˛˛∞≈˜ıçÎOW£>¨UÓ†≈≤⁄@DÉÈ÷kO ‘K⁄…Å3¯äáÛ	mnS G¶@´WÃYíÀy∂dv–·l–Ú†–I+†à‘™&Ñ¿@Lxó ó''ˇRË∆hπ¡äŸCFﬁ≥"0ŸîØfkNIÜIRçàd¢Ì@œ xõêCªòg¡ò8π0[ù@A·äü´”‡Hæ∂≈Ë‘>s6Ç5qÙbÃ•ùÃpç%H˚çr≤—ÖX0wÀ~'˝
À$ÖÎBx^+Dl√=282[≥_≥™˚cWÈ~M«Æ…hŸ´:~*∞7mT‘M„√@ùB&u_-rõ!>◊BÅCä{Uæ4 ïp.~La{À¨ºG¯iE\{XoRﬂñªFﬁwE±∏‡*/y≈j"≤æ±˘—gÀ+Ê¬∏mK≠@˘πcI,>@§˙ﬁ«~˙•≥z6∞ó÷îµ)¸ƒ¡í≥‡R⁄Xˇ*Xå(;!Ã|o
:‚$oÊGN0RNﬁä#9	Y¡Ï¢5à‚FU·≤>›®fÏ"›¥V‚$XQDZQW‘Ú0_€»PPNü…r„U≤°ìXNòÅ*JÑ‘ÿﬁ⁄€O/.πÕ¿ËÙÀÅïÓe•ª‹ıb˚ƒ˛k⁄£¬fë±*»S àWò=(ÃEäÈÓx€{Y	â®&™πä≠Ædé˙ˆë;LâM»∞R°T!®◊7ÿ…Ûb∆kçy púa¿`πxú(K«„E∑bìÎ0À∆Q¶ÿqôqQ„À/≠äƒbÂó3RÌ∞∑
GW7ÔÏ:°êÜIQ±„t≠Aï8ÜÍπ*≈‰£/°¨B⁄<√ÿ{u∏Ç‹]¿Xı¢T◊çnπ„-åqç	w≠A‹áNß§<∫'ıë·ï^fG´eÓV1”^5sW rƒîﬂ1≈#úÑºAAÑ‘öä-œäv+D‰Â	Ê2é6(°| ®ÏïŸ∏Äﬁ:E„ÈGƒçüDÒ{¿L$®ˆiœiÙrn©PtQàÂYﬂ&Æ]≠ØïÒ¡HF≈ÊÖàr™äÌCA"í>™|ZD”Ÿ8bÉ∏Z·Ò‘–'sÑ»hFÇ\ç—æ`.≈")¶$¿Ë(2ø¬é%≤m"ár$»ªe≠Ÿjó•vÆﬁâßv.»[2’>Ü⁄√L/ŒH/¬Dk∂yqnC-åÓW÷ÊÈWíµ6	]‡`Jú€s‡>”=∫	3¨75_]∑∫∫∏`≠M[Éb5g]¢p.kçE) ö+H⁄∑AÕ E
Ü˚ﬁ’ÒÂŒ5o„˝¢†èÉØ”Võ4≤he! PrŸ|ªÑ#5ñÿ cõº¸ÔÔ^`ÏyÕàj¨LÃﬁ€OØËº~G±1pbòX∑ãˇ%˛/ÒAOÄ¨ÆB@{˝_êD‚ô◊œ}pyç-Ï∆ƒ=Lk1-˛O8Z0qäù^!‹
Õﬂ¸êËéP!⁄Ä=¬¸LñáÊ◊)p∑ˇù±.[Ó∫¸º+qÄ*;ò“:$A<ï$(˜É,ä—¶{¢/{—>&7x=Sê(LY6êÃ1äÍ,/{ﬁà€YÔ+}7Î}K≤Â˚◊≈•T¶Ö “,¡ÿPwòr RÉÅÀÔHÇŸ»s%Ô≈8‹y”íÎbtÛìa+Z™íËDSu’T§ê®ïm¨q»(ó°wﬂ&√õe1éÉ`QıêÒy6¡uÒ„ú¬i\ç'√R‚Ωˆ§y$æXòﬂËâÍΩ[˙ÙJ\äﬂâF^wI<b,∫9y¬Ë¬\Ff‘có3Oyî˝ÔÍd*yO´‹ÈÌ¡‹TuŒÏ»«¿µÁ1BÇ≈é°cô€öï&ıÖ∞â 1	e Cö,‰í a!)˘ì√≤7∫BG:ì√±5ÈV+aö∆3±;^πÅÎ@2¡˜2¨«,à–ò)îá¿∫U◊0@ 
Lñ¿¬À"b'`–æµ¶yD°S˚Õo`—jt˚iˆ;´bJöS•)◊*§Í;J†qt¬(Q›√¿$ã;FmÇ◊w,(	·≈Ã,â¨ª>Î^≠‡´≈,yo•ÁVò˜Î[bsÖM¿Á•*à¡_Óøy~Ä¡ËüΩxˆ˙ŸÀ•PÂö9y(Ä‹eff+Ãz±ˇÌá§Ù˙êÏ[ÜR§"C≈¢…»nóœ+ä—x0I/óKiA>,âWªDa¨ÛJïÎ∂HÊX◊Q≠4ÅÙÚrfÎãZœ
)ìM∏…NBæ®ìÙÉ#ybp˘wJ7é"¨†Öú°Ω∂(@á®k ÿjëoà*&‚#SlºånL&=€…¿…Ç%èƒvî'Sì∞N7¸‘Xx9ãPìAvÓ0A ΩY_™≤€ÈvøF÷E, P%"R2…mœtñz⁄_‰Pâ&Åª@»–ãÄ»mQ;b‡-O`©SQ/ê=™Tç"s)ŒõcÊxiÊB~ø!rãú‰L´n)·ë]D. —ÄÁÕ„hZÒz$‡=FÊÖÖ…°tÑ %ŸWäkE
IäÁ¶ÑZ&‘É–∏ÖΩÇÚ¨É‹N&Ç≈¬¿ûÌvùr~°<„»1ÑÖUÂ…∏™›IRh¨BzÛO9•©2rC)W<9Æ]ê´·p	¡⁄É”Ñb§≠9ä"Ù
[‰Q\ù4åq}##_∞§–-SÇ,…‚"ÙÓü¬˘Dç˛8œâÛ™ﬁ5∆g8í;•x‹ÕEBïl	ÖaGwNK¯Uÿ^Õ3ë≥!&„D∏/¬&y∆`È˘Ìeà5Nld¨˙r)Ê˝Àæ%Ã,¥Sl˙h¢ëqÈÿõW
æL(Ñ$∂¸:H˘i‡«n"M9T„”†cBs‚ô–¶≥å£˜-∫}cQúÚ1π√p¯»Âxõ∂Cm8úSûåx®√n¯zNôÑKT˛µånô˘‘†Q3	X≈ÚcrWÃ"l4EE¬Qhû•)dVï{Ã∫≠)H¢"± ù)ê|OãL:/≤S«(¬±»TsZ≈p˘ØÇTﬂﬂ¬"äKfDfö<, ÊFÚö£ß+Ï’◊à˜…∑ßkBd≈0Ï´'=
’<ú¿õ?ÜQê≠Óæ3˜·P¶_IòGg¬ôÀàè :O3ùgØ∏]Nx”aäVÙÏÊ«ó>L$€¶òA„Ê˜πÃ≤wñ¸(áËcõ¿äÄ∫+°OÉH˝wÈÖÀo,&‚[¡£xéG0H£TòE‡Â÷\ã;Ç≠!ù†:D°@ñqÒ“$… -e„WTöß&ãHπqÿyñ!2Á†XOïJtH#+LôÒÑ§QN"	·%≤)‘ë‡NL‰(ı¶©JˇÁ9ú∫»\¶Fï\É÷Ëbî%ùØP≠hÂÓ<Û0)≈ﬁîÿ5±+,¯~Nßµ–~)&Ü.5ÅjB.ñELïl;åŒÃ¨˜Ÿ(~Ô≤˜9HÀ—€grÑÙ˜«$ô¬ﬂﬁèX∏ÈpÔ—⁄⁄í ø},úÒæAﬁµÏûG˘⁄v}ÇæôñäBŸ| ÀÌ‚Ï_¿áI¶2–ñy£∂º4Ÿπ⁄…Ï vºsÖƒ¯-h&—˝ŒUaê˝¯Xíºûá…ˆ™®ÙXi9VıåúÂ•Q»ü`∆¨∑Œ&£≠‚ÁC6
fΩıbA†ÅØ±2Rc≥ôYoçöNO'…yoÖÄZÿ∏wÂl@æzΩÛ1l˜Í#£!¢∑2)˝
P7ôQ¢—Á"—(˛,“
^t€‰≤ÖÀo§™Çp[aIÉØæ
ÜÔÁ≥Âw‰Ì◊1RN4«≥àE∂ü2ˆû_Ó\AùÎ“Ω⁄T§Bz®ìk∑B±ZW√∏„æelÈºwäóœà{~ö≥YÔ3ÒÎÌ˙⁄Ï‚;Ã–L`>l>√‡G®|BJ˝¯’ﬁygKØ˜¿YxF1™#Ç`2YZ)MHÄMÄîu0	ˆÑ-F=J ê^‚…„…0òBÔ8(lã-—#—Õ√56F0ÿÇZ™cÒ†(¥‰vÏ.’„“»hú[;fÓMmØj@m^ yÄˆ`ä∏∑…ﬁô¬µÄÌ%ì–å Mæ™∞“Ry∂Ue?Ûî≈‚„M≥4-Ù≈DK2	Y±Ù∞‰ò†ÄÓ.ÄiÈ±Ê$`G∞’=€^o˙PèR6á¯&*jSÓA3vñæïú` cÅ%ó‘≠Ò∑¡d≠—ÿﬂ`(  \¬òÅ`e"‚j´.ûÌcÎª”q]nÛ«ˇpÿ{¯p£wÙÍÂ˛¬Mø@€7X¥É)≤∑Ó–Ø|±3Ø[6Ω˜‚Ë?7µá)™⁄€^Ö]Ú¿öÁq˘Y◊∞cfe®7P˜ØÙ1€Ö±y’‡>+˜ô1	.=F·@a¸#1øh
J—*°*0ºb{A !n<Éçî⁄ÃÑÜ)DQlbbå˚∆.9B¢Ç”∂k¥!"u˚ )vÑ„•‚ÈoØŒnsö◊Y6›rw≈ˆ ®¨˛ñ—¬Ó—ºªZ"ã;øYŸ¥+jIe±Gè÷\¬)@å≥C´*w¶[µT˛ëüN¯Äüf=rÂ¶zX7O#ÁΩçœÅÅÇ“dé1Ez ÿím®/®˘‰dQ(†X∆0"0Æ»FßóÍÁõ)2këç”(~ﬂ[k%nËD•∑Ê¿√≈î&MG,Ká;E≈kLÚù%Zn:KˆÃâã?… 3ıH∑≈Kï»≤¯`¥⁄6„zÜ«‡4Ã0á’Œ’∆Á◊%`R+⁄™ﬂ*»ñ˝˘ÒØUƒHxﬁ‰IÿhﬁúÌàHF OçÂ&2Úäü^3kÕF†z¡p»g∞ÑVkmÅ‡ﬂóê≈•`¿„rbr}Ÿ…:|Eß?™&f∆Öd“ºC2ø†4˚Å-qéÂèíﬁÃ–’†~CË£Ë˚ŒU¶3ô	ùZ4·»•eÔK*‰Àu‡Ñ>H≠ÇÈOl◊∏Dç˚G‹øòåtæÄ˚˝>Âì:`:K”Ê’“bicAbˇó¿8ñõk°7Ë¯—ãØÖ∞‰ëÕh6<EÂ ≈uòú5”⁄˜Úe)<‰˚„ßÖr†íáÒgKì∏ ƒTn∑!ÉXœ§ÇÇ°˚h…†‡6◊~µt◊˚Á É"«Êü§	›éök˛g@i%~-$M–ay∂s¥ˇtUH~(ú›lˇ¶Í±É∆ΩŸÖF‘U<˘/©?xç*˝Bo≈:ª¿ÄàÃ›€+°2!Yõú+ßI(åV0wõ∏Xúñ„)EWi	f™g3≠∂€˙y}©@ØÅtE°ÍZV™S|ﬁ'˝é¬≠ïUõ‘Î˙≥Ñju≈IlöúÑ≠"7Òö√PsYíˆf	ŸR¿Òö†È)wÔ>ñ‹h÷RP»a´,…1§0$‘≤¬˘
Á¿πû”ÉNj0P˙#ÀÆn-ºÀ¯òM†^>Å9D˘eÔwJEØ¨]ØmÂÇﬂé	tX∞œœ9¨÷‚¸Ä›Çf-s,:L
>g£ÃÁ‡ä>l«Âl„eÅ5®Ç…6êÜ√og”•«áxÑâ≥NXâ$ lÏ√P2√KÆ~Û‡3Çpƒ.B^Â,=ﬁEãi F¯˙q’j§>±c›°S a†ÜÄ⁄Ip¡√•«¬Ä1Oc4P…íS¿ú—Õƒ–èL◊pô0Vá¢ÑﬂtcMÊx/M∞Rì…Ã[¢_
m)Õ»üﬁ“‚í‰“∫'\áiy£@bÎˆ’#ÊõˇBc€«Û:|`n"≤g¯@åVBcÓ5∞¿j®;§FÍØ˚¿jÍ>¥&fé _¬kdìâ	4‰UgÒÕÒvååqÖ*0ﬂ∂.|B:*aáé%a4|ÿ©µüXïj™ó˝Q±Ÿ“¶ú≠≤Wîñ¯X§%˛¿Î:rÔ¥Ûi®?äÿÑ)p’≥õü»∞ó$*÷)ô„Ìº/L"W(
¶;AˇBë0åxJ∆_2s2öDed4úÀÃ ∑fŸßaâeØ÷∂mçìòìå˛’+uœ¨•ó0‘"]2€ôeÆMu»ôï{–ìÎÛ¨N‚\À+{Ï%^Ü|Ä¡”ù•Éã-m(≈3Â™êdÓ u}kÑº»œÍÀ ˚yêéxﬁß∂⁄VYëﬂr¨™zÛPuR“€éT¯I{∆)s≈¸/Äã∏∏ÒFœÔ˛ u+´G*¸ño;L:%ùRRqœ∏«ãM5ó´ﬁzQï˝Æg|ªg<Fl†Û_|Û/+,˛˜cüˇé˝«?˝3Iüo~ö“Ø£›“jÀ¥G-\Âu-Õ¬¿Ä¥i”FP£≤©SSzåı;M*àØ´kî5*J3©µCSºpMÒö@a‰7£röæÆ*ˆ›$™ˇ»»“PˇI£ÀÇ*∆0ﬁIU+ Ôƒ«2ú\¿«G∫∑+¡‚.	∫9‚°‚lö˜÷Me9=	"N/ÿœDÙc’∞∫¶Ë£˝oW¥ìêÔ|ÿ%CúD—zÚ–BNΩœvS¡Ø!EO9ñàÉ‘Oπ´òØ´2.Äå%ÔøIjú˙&00«7*≈+ á¸ Û˘ªaŒﬂ?Œ™;£mˇÈ®•öö+Ñ∞öÊ∏∏ñ(ﬂ_XπA<.@§Ë;<xÒÊ‰ŸÎÉ√ct*ﬁ}Û¸uˇ4äCô∂X]†}r"˙[Õé•œ”µƒi“æ`5mX÷Á\™zåçeﬂóaåFàDÎã%Ò>$_"C1q®7 ﬂ>;jï:≠Ω9[_Éq ÿN∆Èiº÷¡6íôÆ_≥€ÚSÓ°f‰á¢]LùY¢«zÈô	#Vòä∫èµÑ:∑oÛTò6åd,º Hì	∑„ †ãŒåí+–sG€bÊ∫ã<i—Aã”Q|pQı¿°2à∞¢≤˙≠Vê:]`¨1‡1Ù|î˘≈ﬂ-Pı-&•°$_ÿH?õa·jò+lΩ›‘Ã∫4°∂∂¬®Èv»yc;ÕÂØ[¥È;•FX“Í∂é_kM#}™¥RÃ0Ì\W…ÊB))Å%ò]Ù≤ô°Å±k ∂åGåæÁ∫(4±ÓD£nR)
ÌbsÉ®ÚYîEÄ]Õ…Í®«M∏ÌØ”hˆ-OQ>ëZΩıœ™å7£ÕfÌ^IπßÿÔµ6~ﬁ{dX√\ÖfÕ÷Ø€hı|∫Da¬°¥á>F;Í˛§O2¢E[ˆ)ÍŸ@^ƒ≈‘VLÍ_Ü[oæ‘Ωna; ¨O⁄†qª0Û·˚Ar—¬∞1FÒ…’Ê¶‰UÃ∏U≈í˝ãüÍ¸ˆ^:£⁄œVòÙ”Ç´úE„õu€XáX¢·9‡ò1¸è∆< XÜ∏◊bIõ5„U«Gòc4Y◊=§„c¬ÿÚ1)0p(‡ ëÛ†Ø~π¸rÃO≤‹m{VÈ,‘kRÄWõÎä˝©i—Á¬Ë*
àÚ∫7Ø+}‹Üj‰uKLÆöœWuwáMös6$‚Wü´ÍïÀßÚıÓ@∏ªÉp[)^Sß(bÇ2ÊÉ√^«I˝H6ã‰ËÆ¸Õ•ª≥v.˛VÑJ(∏Wî∑Ôä÷ÆÉ8nX)¢@YÙæ˘cHè•/}∑˙•No!—Œ¬≥‚û&ÈÙC[Xóì◊ª_}®X˚ÎIèÃ¸sñJgÂâ"ü„{|[ŸÙ»Ö∆{Q=„˛ãîZ™˙g,•˙Ó_Uœß·ÑˇEVµ⁄˛ˇ°¨⁄(ß:\Õ¶A≠Íì&´©÷_Ñ °≤Ö»¯Á,1ZP„Ìr£U∏Ft4‰©F…—˜ŒsÔVäm≤‡•ØÁWÅa√ÉÈÿ#É|`Æ€ÒöCU∆!©úy≠ª‚ÌΩ.7=^ó"∞Ï†¸a4Q∑tx≈≈/[:À]ùŒ„òO2B±ßû∏H•~Ï•ÂáD«”fπ—g:}L	hx¯îÜ÷9m!. 2¡ñfÄ·À^•Ü	ı¢¨2∆Ê¯ÈÄûJ&œ±aëÏ®zÙ–^©ƒ∆!ù
h˙¨xiΩôN5-k3≥¡ﬂ„ãÊz…Àı:·où—ÍÕ]ıTÍÊrK5V>V∆^ò÷¯o77»˚§åG¨)˘<Éx2Ó2
AÁ®∞È^›ê–¢ü4˙:7ô•ˇØ¡LYìØ’;±6öOè˙√$ #ÊÜrSa≤ŸÆéô ‚∏Ó-),KÊŸØÚå<ˆ1ÎT≈≈D¿“õﬂã0ï 62RÌT-T∫¥@Ün÷QDÈ–c˛ê¬5bvÜ:nœéœr@E∑Û(œ&¿Œ¶¬t ;|äÍn·®°Ç!ŒÊå°’¿∞V™MîNuHòÕ%vd™œÄ¬%qî')rZçÃÍ˝{û.¸ 
E∏ ˜µÓã2∞(˚’ ì§∆ºåv6Ìl∏hÁÌ⁄‹É¢ù∆ò
:TïZº˜∑)Ÿ¿K¥Û∞Œ∑	Q◊‚£ªı@–Q?ˇ‰Äg_{Ø““Ç§‚3Œ(ü9∫°óÄ,Ì°U0⁄ZÁêªs>⁄é[G”Ç5“ÜŒ≥Ë‚o¯eç}Û(õ5[¶÷LÉ‚≠`≤.;…WT∂≤dé°ƒœ–¯ët•‘`∏ ÛŸTπ%Œ"‹ˇgkn¸Ç¡$æ˙â¥¥nÕb˘∂‡6Îê∑µÏØ/gıjöÜ]¡˙•ù©kœ“d}}a›Ï¶Ìy&NÍi2úg[…<üD1∂ﬂ‚ë√X◊ÎlÍï	Áóã∏4úù.9¸†·0πΩ**,‘h<˚æÆU Ú€4ÀÖ„Geª¬3‰6-´W”¯kY‰6Õ”©MË–V/
ùÔ]}æ[ÙÃùïö"∆!ƒ]Õ‘G◊ù÷k√uÿ†’œaîB åFÄΩae¿à˛ı£Gò∆ã∂È‰èñcﬁ)ëÌb»”\‰ìí°Å…¨<õıƒ‘‘4a_ÒòüF√à‚,õÿ\ΩÄ£Vè’çÇ∑vΩ˘*àá>∑õÛAø_aÙûÜõY4È˜˚÷P°L√°ƒ≠∑G~20ßÈ≈Tå`/ V	K¥A≥
µb‡>m)Ù-4•uJ
ÿËÇ2≈ãS#SÁVU˛Ÿ\y*∫1ÍZGáπ[\…[Óvﬁ∂ã
,¥â≤Ω``HÖµÇÌˆ^äÈ(Zw˘†A)— !‹≠àÄwXÈ∞èT∫Õ∫◊ä
ÌdeÄı√-´íY…cYf∞≈<+∫ˇNV¯©h√úOµ°Í0L{K™RLpK§xÿ§Ê∏⁄}˛¸‰h˜^º>9<x˝ÕÀ˝c“YOõL[îáœA,yÔ0.æó∏.á<'a÷è‚·dVß—‹§çqUK=9©…[òWπZÚ<ç&‹öÅú_ßç’‘¢⁄Ú%øñvë<]ò√>÷û|qùΩ∞6Ωÿ∏í˙|uΩ§A◊‘D=ÿl–°ØØ9W2Rânñ©"3≈ßaΩõCoÿáÖ◊—¶aˇ´eüÜŒ™◊ÈyWÍ÷Õ≥hÂ R0ÈV∂ÓÏ™Ë	„rÏ·•ª2ÒÑ$1Æ6VÎ‚s»Öié¬n•ú¥Eo*ØT‰pâõkusﬁÊn‚>Ó≈`Í,4◊ö≥kUÎ„aÈ¨·÷pw∫¸ˆÆöΩÄÏ±oG5öª`Ç¨A»ˇµ1vØÉ?ÈX,…ZÌ•7?´öTzTÉi√ﬁÌÉîåYØXΩ±Œ_uA˛ü¢Áyê†$ôPé0T`|ô¯ÊﬂÄüNØGc¢å¿Fa“¨/æ˛n”˘–f˜>kd˜ÜöÛ y;Îë≤;¿ /ì	ÂÃªv–‘jGúF;e0´÷∑¥Á™Pªìπhc©U⁄Ó≠m‰d£T?Eï™≠®–⁄	°QkœW∆s‘Ñµ∞†Àr>€YÇ[îÅfÁj≠≈§Ê¥ ˘Ï,iª‡∆∂≈¢H;øg¬h«ﬁßf+pÑ6Ê≠1‘U·"∏:ûÉ"km˙v®œœ÷ö@{2Bç˙õ•*øòÖÇƒ◊î`Å$ÔF◊.>∑F≤d2«`˛8.î$íYo}uÉıH§†Ÿ_“ì˘´ïºÙ¯ØÓ":]˝˚™˝¨KpK¬SÛ˛xÀ •S†µﬂÆÍ‰
(lê™¸ø˚7?Ä!∏~‡u√úR('Üñÿ$˙°Í˛æ	ˇ4∏Ëù√y˚\{∫7B|?dXm∞ﬁ’F"|[|_x!Ú€û¯∂$ΩíÜ|†)f[˙ÎÛÿ/∑”πÇ˚Á@nõàÌG@j0y#û∫Mâ≈œµ÷î4ïˇht$j†5⁄-‹J:vk’H„C«¶ÆdTWïŒ◊wøP¬gùÂy”Àç\!¿bΩ…‡@WÑc[¿ôÇ Wdñü6∆À6Ú≈0Ö«e´r1≥Pí∂Ed¶qS¯V´R∆ç‹[
®KÓkˆnö&Áœ)†πˆ4\}ÃæM&h@AóÌõD ~â\ˆ@ú
Å«≥
 Æç
ÔÂ•ı%G6›¢Ô0$¸^ºÖÒe5ZÙ1®öCu∏<©√≥.=ﬁï	÷ç”Tœõ∂±Æ¶±L·ÃÃßZkÖ)ÙB√≠Äìëeh„K— dº¬Ø¥Wv]özòR99πï	d’Ê6Y7ﬂÊµÀP: ıN˘ËMQQ C\Äga«\éF∑¯lúúÔNxöwæÌPÏqÿ)£|Z^›ﬂ’∂YÎπ›◊ #Ùô≤6%…¬uEKäu‘∏®Äz ≈Jd
¨NjINÅ%s⁄_Q·ßñü9∏‰6™Àü2t—§µ«»°ä»UÉ]√Ì“m9£ÖÃ}7E‚Ü˛	-m~…b≥ROx^Xä!¨Òªºˆ2ı˙˝ªF–ﬁ%Ã„ÙÌâdmw˛Å1¨y<ÃŒR@HsrkW7U¶¡z„ªbËùåzœ(ú<ˇ>H+-ûçf7¬
yª˙|fπì∆H‹ˆœQ"\Y…˛™A–ñ÷œUº≥W˝URÁ¢^iíw†+∑7|.éVFßâq„B8&$—≤K0•àZë—1∑®n›ss—tX	3 p≥·≠”»àSV÷•«_ã/‰Ë˚√<öµ∞v«ìÛ8çÌ™Øàw Ï¢†Öe≥káç©Öñø∞•¯…$a∂°Œ—˛∑›Öõ;√A;Kèøïﬂÿ¡Eé…én
NM4ä—:a_~”πn+ë”≥'˙åBÍgt‰]∂  A«b-Å¿u$Áó%¬ÉÓÊø3 uú∞£,h„ö6ôl[»çj,ˆ⁄Ÿ]lkÌBêvõK2|/ÃCú°É!€{uÿgª	Ê¬¬œßhµ›OÉ” dÎlî≥q4Ã0Ö¡
É9bÜê	?C˜¡0Jy.≥˘≠ä	%<Î◊„ÍÅ¡«=È–3≤ Y∆qd$„Ø†3cúú% <À≈≈±Q0∫@¢+$Ê·¶=∆´ztk¥Ω"˚5π.kòÛ;∏—ˆ»ì|¶∞hÓ¯›∂ˆykÃÊ$døsÿ≤foÃªIÌTéŒ{øcc¯ﬂıË¥Ã·9"º‚¢Ì–9çW6E$ùıV∑d≠L¥l`·^?Úﬂ∂|ÉjùÎì_0§Y6‡=º˘S8ü49À15_ΩÿÓû∞ô≈\1ë¬.˙Œ˜*€CÁa¯ãÏÇ¯Ça	#:˙î6@"@Ì‹qøiXY+‘∂bkÖ
äáá	¨7ó€ ò<Îå∏äãW~W†ÎÂ˚¬^u&–⁄*√¥t\÷Ñ_H£¶Æ~aI∞ﬁæsc∂ëñ*LIÙCÃãLn«‰Jªuª|k!∞åét∫øã¢Û:ïGéjn#[Ñ∆PŸ˙8í*8∏Í7∆!É”⁄‚Æ.Û l8y⁄tí°ô[ﬁ˜ïc∞hòX_z¨ëI>˛eÜ`¶~À”èe(ÑÎ>ñ¡Ñ˚—åF`˝Ê·@âZ»∆N«v>H¬À˙nÆ_Óøy~ÄeüΩxˆ˙ŸÀ¬q¢3M¬VÒNÖ¨…}'¸Hˇ-4÷è¬wËv,#?ﬂbß¡$„+¿Hr¿˙'6†Ñ¿¯ÍwÏ∫)Ê§
äæ0ñŒiƒ'·⁄¸%ßLåi/ùá≈∏Z∆s≠!fãO√ìôÓe\”ügaäﬁÖezπP\<9òˆñ÷Í›{ …Ì⁄^]e«§W‚â¥lÈ[Ú1PX>™ˆ˝ú,a„ ÅaˇàÍ®P)¶ *L:π™°v˙C±\qåB∞√•#°ÓÅúbüt€EµUÀ“k´C˚•~é√+?ª†ü∑Ë©MåAÈ>$‚à¨0$[z˚ZÏJsà÷∆FZ92·h∞tU¢Å˙-jﬂÆı◊6kc}ÌÖV‰≈Üı9ã#h.≠w1AGçr’»ÿÒπÍºê¥¬ñ,‡7‹}¸+ˆ{˘2qú∫¬X@ach4cr¬ÎôkE~=•…jó⁄ÂHﬁó‘§Sút;üFÎËüÙπEP˙Ë8† âêh•U¨M˙Êb˙Ï√ém“Ioﬂ¢°«5|Âƒ.∂*&÷&®õV[ÕFß¢ﬁX+û…≤qí£269Áa€enMî«–Í¥±4n‚N®ùzSÂ›§;®g^† Æ€=ﬂ}›ª.©YcÙqËz6öco5*zÓKÀCWâ-√ƒöÈXÈPö=kyÉ≥Z◊j≤[‡h8Å≤{a¿£~6¬éFBI•nà˚vg¡õ¬4MF•k‹∫ÑWpﬁ^í:^8‹tíYﬁ»A+˜Í]Å—¥à:>’–“œÌU-∫lBt≠ı_lA”¸ ´W¶´™E\?;ˆiÑ7Ωùúh—Iπ™-bı_3éÇƒÌGV3´¢”wm:m‚OÔ⁄K›∂”*ÙT¶˜˙¶„’61-ô≤÷fZa6é¬ê«ÆR∞çª:-!wâæM≥¬^ª†ÂVu$Ÿá^'¯ıµí‡={≈_+◊{â>’vÃhøº)≠ô7Ÿy˝Z6Í»ÎÇ¡1õÈzí‘Ö Eì2Æ¶[I@ÏE‡\<ÅÌ=‘=}Wõmcz'ÜÊ¿/LÇ)Zl© ™“åêzî>¸‹„k8»[rW>‚¥<K≤Ânê›1”ËiÒæØ	ÁÈl¬mŒQ<˙p∆qÛ£ø$¥†›√≈`ôeºe≤3ëp‹2*†$ﬁg®˙øÔ€¬ªçÿCü´∑MHûE·¸∏&À+¬ê~€ãµÃÆõË¨lgãö‡ömÕ~√v<ÕÉ¨}ã\lç—û‹,∂ é“$úÁ…≠eòÃn5äÊt~ªˆ≠$©0¡∞⁄1í„µoi®íËÈƒz,›yÑV3ERæÜ#ì˜ô£Qèöy◊^f¡Oï‹rû-,∫‡ßΩ.µ]∂êÉüED¸,,Œ‡Á"~
£V±ºw'Ÿ‡gÈ¶v0∑r®ˇ67m
-öƒÇyìü˘<∞Â˜ô~cAI»QuöÏi#3€&m3d•ñ;)≈%Éπ)§%˝êµóX‘Áóëó”B3€Íû£êZhz[§◊`¶ÌΩ≠ŒÀu‘U˛¢≈ı3„?b-Æi´áN2hÂ>áöc4FΩeÆÙIìúπÏë3‘ËdåYú–h2é1_c‡°˘Êÿ¸7ø‡√9ô|ö›FU.∫”&±•ÕÖG∑÷ÊÓECö+Ç∆~nÖÆËÚW´–ïKËÂ||Á#ˆût∫Ó 
éGÙ˚Ò™u˙√ãò\@ˇÈw?
}.≈˘T∫˜¨¡ıÑ5mﬁÌ ∏ßÌ… ™1◊–ºbÒ`≥jo€Mu\HΩ1T∏ôõ≥ı‡• ´Ë¬Òûˇ]Ê„ù+äó‘®ãnTµï¬ÆN≠›‡®„€!‚YDõΩ®>Å˙*i≤±Á÷öÏVÀˆ±©ª+}›"ü¸˘‚|r}(ã∂‘∑M8ãÍ>ú˘ s4ŒŸL(SJÑhÁåπGÚ–Ù®ÜçΩ ∆Ëùi%4¯‹ÒÊÅqp[£ÿ[Ìçâ7ı˛T%æºˇ{ÿ0ïy8)[‹jÔ*Ow≈ã.PöE"”T≈æöìª –J	∞¿òeÙπ·O|i¯3oí?ÛgÌ3a6	®Â»(UjCËæäÑãYsiùFä^tn¿ˆEÄ‡RÙ≈¥áA∆:2‰>'Ÿj¬„Q>ÆÛ¬^¬	6∫∂˙≈‰øùÛ) Ωò˚w)PH0J“ ≠ºQ|û∞gG+"¡ƒdå~°@R…ıM§I	firQpBL`Ñd5â1.p⁄”$£ú §çaî}ê$Õt∏(gÌ»vv≠"lSÌ
ïî3
yÇ«„˘4–!SPd@ﬂﬁå›¸€$è¶ôå(∆[†¶LLá÷◊ÌR8˚÷˛¨•…r79smªõ=cI/÷* ﬁ#'°€Ce≠ùk[ôéóó	ñøwﬁ´˜”∂Óø{ ìòıIæZe*ÆÌ£Ã†>ÑA?;⁄b∏≥kˆÔˇøÖ¸,.÷‘¬”H>˘Äƒç_Ñ19F"ºJmeK≥¯<˛Á˚Áˇ√»Bhoñ=¬üÀéûÄÙÄóF˘∆ªùùôD§ı\Û?ˇ€ˇ˘ˇ∞Ì`ë*åçS~∫sı›8œgŸ÷ÍÍ˘˘yî$£	«´p¢≥'?Ï|Z^ úˇıä˜E<∫˛ÆΩ≈;}D|ìù•‡Ω‚˜Ì˝ Ëìbú8If#Tƒ	Ãàßi´pﬂÊ«ÿƒ)$˘úz7ZÑö6?Ì!cﬂ“¨¸B;πΩ,‘—’2û¸ û‰@wóØØ≤‡îS™äºSﬁVÈ$¥õ£ÀJ∏zx»æ˘fk:]^¿π°.@CÈ≥–ÈÒ§˛K„Ω‘„K®¯;8úœ-f‰Î£cã]úS\‘ÄÇXä˝{[Å8
˘¨¡Ï7™Kg≤üqÿÁq$¥V.\Ï¸\kÇãpöD0˘,Q	ìÚ1ÅÀø"ØÀ:9QFŸ,ëA„D3ΩµY“nø`ıÛ—öƒ«ﬂ¢mÌ¢d>ëq0Ò4íS∂õ£∑)n√(ä,±z	ç*Zœ•]
&Q¥’5ÍÜq]ŸrçJxÂ‡ßΩ˝ç˙8Í*°y≈ò√iRHπìµIªf~
«∑T4B™j∂î¶òµ4˝Qü|€µ˜zˇë¸¢t[Q
£Q“ﬁ»T %ﬂ∑GæÙ ÎÌ©ˆ"ît˚0òE±í…◊Îrx>˚Äaìè@\6¢&#É`QûöàH•¡∂¥∫Pü÷∞µ(|{°{?Bëx)R.
ﬂwâiíqÈ¡CuëÊªıi˚JãQ©ìu?ãÌj[‘⁄Æ\ìWgS+µˆ;-i—€õür˚ƒ0(∞Ò¸Ê	;‹›Cìh≠HBmQLjùÛ˙ú»Åè–$ZL–‡Yc§~ÄvŒÇ°H¥&¿Ëg|$Ç=˜ŸPqYà¸d4ø˘i »Ä˙G÷!ñì†Ü≈∆¢µµVtWÄ˙Kø#¨õä-ÇË"©”Û‹Å)”«l˙÷ŸP˘tê
≥ÿÒÉMª⁄J
9å8%1,äŒ¢,D	2Ë4◊f?3Ì@zÎÿ—˜uˇı,€£háIL^Ç¯‹…S
ı⁄ˆ¶•1÷Ú/~ˇíÒ…©¥ﬂ @¶_¶ÅÍ≠#1◊¿’—dûŸaòw√hCÉcØb/À»ÃaUÊV77≠võ.≤_¨÷˜“ÖMˆêë0Èö7ÿ-	s.l`v	ÉúÃ˚Ú⁄>?Q™Û'OÿÔ™o¶eC¬z®‘ê¥*2€Z_kj,äJÇIFaËÒ~6õDygô-ã∞1Œ-~ªˆÆ€ˇ@†≥œ≥˘ ÀAxu÷VÿF∑ü'o(˜ (;5Î ¨MSáN3;∞:Òys‰Û@vÍ<pﬂÇàA/Iò&√˜=‹ä^.◊t[˘¢ÖiAO-='ï˝úTˆµÂ2¿YBTÁ˘Ì∆ÁH„u⁄a}}Wa|+áZõﬁπ4Õ∫Yx∏÷h√cÓÒméSö∑Úó=*õÏ<bñUUWYÀr5∏FôCm!¡÷ª∑ÆI˜V{Ü.j-BñπË˝-ÌtuƒnÉâëîf2j!¡Àª3∫ˆl4±i6ƒi‡r∫aÛ[6N™u™ºQÑËæ‘Àìﬁ eßi2µin¢~∂÷6ôûüF{ZgSì¸*€8ÉOk‹ª+Ö§ÔÃ§Ãwøπﬁb$éM∫ü/≈ØÑ^◊“kÆ2á¥p˛l{Â•;¡@Î‘ßÏ≠km5e¿4'ûïM~Ñ#+^gÉ.Á°◊®59Ü|'ó]íùa4aXı∑ítau(p.–÷Â)I≠T%€´4©V/Û6v,NÛæ%´V:»≈2T˜∞Rå—$ZÍZ/O´àOmŒp#»jûXóqÌâ\Cƒˇ  ˇˇÏùﬂo”0«ﬂ˜WXâÓaöhW§ï"!U¿±Ô¶x"RöLK7hˇ;æÛè8éÌ8ôª°i}™‘xsú≥cﬂ}Ô>ÚeÃ“ID¢]aóÀé[jz‹~Y:âLÆí°RÛä˘ËÁ™ñ–hŸ´Pµ˙óB,an˛Ô‡P|å«‚dí◊ˇr|ÂÅˇ´q‡ﬂÈÁ"cætHßCBiÒYÂIcÉY5S¥B¸ìHˇÚ∞td€%ª1£"¯:bıÍ*O{wSÚ˚€»âΩÌ§ËM=èô≠rr•st√&m7ZWPÁp±RqÖ¯kQØiCµÎ´7}„1!Nÿ""ıT9RÊ˝RG]Uï9‰’ı˘œc˝Êb|ëU6ôÌ:¶L ∂m®l(.Qmy£X" %’‰•⁄∫Ü©l‚ëbﬁ.∫z‰2˛(ΩaÃ±Õßê◊ªæiŸµÚˆ?¡mæ-¯=) ö<s&0‰ñ»éª kÙ.°T!K äa≈´÷O≤Ql=¨Ë@‡=+G»ê!ñ¨ç^Ø£l—‹ãªB~÷˝Põ†Ç~(ˇr”®√›È≠Náò‚Äƒ˛˚≈˚.Æ\ætß¡Èé»⁄#).oP^C|Â›ﬂ‹π8›®`Í‹ºÇ°¨Óé’H£X	‘_ô2 /ÈÿCYëoÏ≤‚6ä∂‚ÖÅY1◊ÉÜæ4AO…0(@GI.ïTÚÛûßÂ)8?(Ña?Ú_°¯#sÊ°›˝√gÍêH—;™⁄Ø´ÑÖÆëIv°$R¡üÛY§I,Øí’ã6(Ò√ÌÇ|¶¸∂»I^‹PMd,ŸØ3%Òv‚≥ÊÇh4dñ≤’≥ÙÍ=CµØ›∑ ∑23ÆŸ;∂ÚRÚ'≠Œ ä
ä79a|X_OgGÛ7˚v∑√îÀ¨}QtÁ£ÇmèÕ≠S<”:À$K9®#!ñY”:≈r˛§(ñdrZmi1Ú¯L≥|¶Y&£YS|W8K|’á]sI†ñÓ7ºPPÖÇ∏Öy≈T Rá;	πá]P&Â∑ZXÑL|Êæüüπ[Xe;Á>†œz8mQ`√*>Œ4ÓŸ¿{w„Äg◊ûvΩx0ªGç{R˘ñˇ4Ò‚‘IÚ÷Qg‘≥z0\¢Õ€?8Æ6Á˘Ú<æ£”0£Ö˛ èµwo˜ˆ˛  ˇˇ E™