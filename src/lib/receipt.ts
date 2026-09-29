import type { SaleOrder } from '../types';

export interface CompanyContactInfo {
  whatsapp: string;
  instagram: string;
  facebook: string;
  email: string;
  site: string;
  siteUrl: string;
  endereco: string;
}

export interface ReceiptRenderInput {
  order: SaleOrder;
  companyName: string;
  customerPhone?: string;
  customerCpf?: string;
  customerAddress?: string;
  responsavel?: string;
  logoDarkUrl?: string | null;
  companyContact?: Partial<CompanyContactInfo>;
  isOrcamento?: boolean;
  documentTitle?: string;
  numeroDocumento?: string;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ---------- Paleta Rafa Arts Graphics (Preto, Grafite, Vermelho, Branco, Cinza) ----------
const RED = '#FF2B2B';
const RED_DARK = '#B51218';
const BG = '#090909';
const CARD_BG = '#151515';
const CARD_BORDER = '#202020';
const TEXT_WHITE = '#FFFFFF';
const TEXT_GRAY = '#A0A0A0';
const TEXT_MUTED = '#666666';
const FONT = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

export const PIPELINE_STAGES = [
  'Pedido Recebido',
  'Aguardando Arte',
  'Arte em Desenvolvimento',
  'Aguardando Aprovação',
  'Produção',
  'Acabamento',
  'Aguardando Retirada',
  'Produto Entregue',
];

const STAGE_ID_TO_INDEX: Record<string, number> = {
  pedido_recebido: 0,
  aguardando_arte: 1,
  arte_em_desenvolvimento: 2,
  aguardando_aprovacao: 3,
  producao: 4,
  acabamento: 5,
  aguardando_retirada: 6,
  produto_entregue: 7,
};

function getPipelineIndex(order: SaleOrder): number {
  if (order.serviceStatus && order.serviceStatus in STAGE_ID_TO_INDEX) {
    return STAGE_ID_TO_INDEX[order.serviceStatus];
  }
  if (order.status === 'completed') return PIPELINE_STAGES.length - 1;
  const down = order.downPayment ?? order.receivedValue ?? 0;
  if (down > 0) return 3;
  return 0;
}

function forceTwoLines(label: string): string[] {
  const words = label.split(' ');
  if (words.length <= 1) return [label];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

export const COMPANY_CONTACT: CompanyContactInfo = {
  whatsapp: '(93) 99211-2108',
  instagram: '@RafaArtsGraphics',
  facebook: 'Rafa Arts Graphics',
  email: 'contato@rafaartesgraficos.com.br',
  site: 'rafaartesgraficos.com.br',
  siteUrl: 'https://rafaartesgraficos.com.br',
  endereco: 'Avenida Maracanã, nº 287 – Elcione Barbalho, Santarém – PA',
};

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 16, bg = CARD_BG, border = CARD_BORDER) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = bg;
  ctx.fill();
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// Desenha ícones vetorizados precisos para as etapas e seções
export function drawBadgeIcon(ctx: CanvasRenderingContext2D, kind: string, cx: number, cy: number, bg: string, fg: string, radius = 10) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = fg;
  ctx.fillStyle = fg;
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const s = radius * 0.42;

  switch (kind) {
    case 'user':
      ctx.beginPath(); ctx.arc(cx, cy - s * 0.55, s * 0.45, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy + s * 1.25, s * 1.0, Math.PI * 1.15, Math.PI * 1.85, false); ctx.stroke();
      break;
    case 'doc':
      ctx.beginPath(); ctx.rect(cx - s * 0.7, cy - s, s * 1.4, s * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.35, cy - s * 0.3); ctx.lineTo(cx + s * 0.35, cy - s * 0.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.35, cy + s * 0.15); ctx.lineTo(cx + s * 0.35, cy + s * 0.15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.35, cy + s * 0.6); ctx.lineTo(cx + s * 0.1, cy + s * 0.6); ctx.stroke();
      break;
    case 'list':
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.arc(cx - s * 0.7, cy + i * s * 0.75, s * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx - s * 0.25, cy + i * s * 0.75); ctx.lineTo(cx + s * 0.8, cy + i * s * 0.75); ctx.stroke();
      }
      break;
    case 'money':
    case 'coins':
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.85, 0, Math.PI * 2); ctx.stroke();
      ctx.font = `900 ${Math.round(s * 1.25)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', cx, cy);
      break;
    case 'info':
      ctx.font = `900 ${Math.round(s * 1.4)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('i', cx, cy - 0.5);
      break;
    case 'check':
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.6, cy);
      ctx.lineTo(cx - s * 0.15, cy + s * 0.5);
      ctx.lineTo(cx + s * 0.65, cy - s * 0.55);
      ctx.stroke();
      break;
    case 'whatsapp':
    case 'phone':
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.3, cy - s * 0.3);
      ctx.lineTo(cx - s * 0.1, cy - s * 0.4);
      ctx.lineTo(cx + s * 0.3, cy);
      ctx.lineTo(cx + s * 0.2, cy + s * 0.3);
      ctx.stroke();
      break;
    case 'insta':
      roundRect(ctx, cx - s * 0.85, cy - s * 0.85, s * 1.7, s * 1.7, s * 0.45);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + s * 0.45, cy - s * 0.45, s * 0.12, 0, Math.PI * 2); ctx.fill();
      break;
    case 'pin':
      ctx.beginPath(); ctx.arc(cx, cy - s * 0.25, s * 0.65, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.4); ctx.lineTo(cx, cy + s * 1.1); ctx.stroke();
      break;
    case 'clock':
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - s * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + s * 0.4, cy); ctx.stroke();
      break;
    case 'shield':
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.8, cy - s * 0.7);
      ctx.lineTo(cx + s * 0.8, cy - s * 0.7);
      ctx.lineTo(cx + s * 0.8, cy + s * 0.1);
      ctx.quadraticCurveTo(cx, cy + s * 1.2, cx, cy + s * 1.2);
      ctx.quadraticCurveTo(cx - s * 0.8, cy + s * 0.1, cx - s * 0.8, cy - s * 0.7);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'pencil':
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.7, cy + s * 0.7);
      ctx.lineTo(cx + s * 0.5, cy - s * 0.5);
      ctx.lineTo(cx + s * 0.8, cy - s * 0.2);
      ctx.lineTo(cx - s * 0.4, cy + s * 1.0);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'gear':
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.45, 0, Math.PI * 2); ctx.stroke();
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * s * 0.6, cy + Math.sin(ang) * s * 0.6);
        ctx.lineTo(cx + Math.cos(ang) * s * 1.0, cy + Math.sin(ang) * s * 1.0);
        ctx.stroke();
      }
      break;
    case 'mail':
    case 'box':
      ctx.beginPath(); ctx.rect(cx - s * 0.85, cy - s * 0.6, s * 1.7, s * 1.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.85, cy - s * 0.6); ctx.lineTo(cx, cy); ctx.lineTo(cx + s * 0.85, cy - s * 0.6); ctx.stroke();
      break;
    case 'package':
      ctx.beginPath(); ctx.rect(cx - s * 0.8, cy - s * 0.7, s * 1.6, s * 1.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.7); ctx.lineTo(cx, cy + s * 0.7); ctx.stroke();
      break;
    case 'truck':
      ctx.beginPath(); ctx.rect(cx - s * 0.9, cy - s * 0.5, s * 1.1, s * 0.8); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.2, cy - s * 0.2);
      ctx.lineTo(cx + s * 0.75, cy - s * 0.2);
      ctx.lineTo(cx + s * 0.95, cy + s * 0.3);
      ctx.lineTo(cx + s * 0.2, cy + s * 0.3);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - s * 0.45, cy + s * 0.4, s * 0.22, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + s * 0.55, cy + s * 0.4, s * 0.22, 0, Math.PI * 2); ctx.stroke();
      break;
  }
  ctx.restore();
}

function formatDocDateTime(dateIso: string | Date | undefined): { date: string; time: string; full: string } {
  if (!dateIso) return { date: '—', time: '—', full: '—' };
  const d = typeof dateIso === 'string' ? new Date(dateIso) : dateIso;
  if (isNaN(d.getTime())) return { date: '—', time: '—', full: '—' };
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return { date, time, full: `${date} • ${time}` };
}

// =========================================================================
// RENDERIZADOR PRINCIPAL DA ORDEM DE SERVIÇO / RECIBO (CANVAS DE ALTA DEFINIÇÃO)
// =========================================================================
export async function renderReceiptCanvas({
  order,
  companyName,
  customerPhone,
  customerCpf,
  customerAddress,
  responsavel,
  logoDarkUrl,
  companyContact,
  isOrcamento,
  documentTitle,
  numeroDocumento,
}: ReceiptRenderInput): Promise<HTMLCanvasElement> {
  const CONTACT: CompanyContactInfo = { ...COMPANY_CONTACT, ...(companyContact || {}) };

  // QR Code do site para o rodapé
  let qrImg: HTMLImageElement | null = null;
  if (CONTACT.siteUrl) {
    try {
      const QRCode = (await import('qrcode')).default;
      const qrDataUrl = await QRCode.toDataURL(CONTACT.siteUrl, {
        margin: 1,
        width: 240,
        color: { dark: '#090909', light: '#FFFFFF' },
      });
      qrImg = await loadImage(qrDataUrl);
    } catch {
      qrImg = null;
    }
  }

  // Logo da empresa
  let logoImg: HTMLImageElement | null = null;
  if (logoDarkUrl) {
    try {
      logoImg = await loadImage(logoDarkUrl);
    } catch {
      logoImg = null;
    }
  }

  // Cálculos financeiros
  const total = order.total;
  const down = order.downPayment ?? order.receivedValue ?? (order.status === 'completed' ? total : 0);
  const balance = Math.max(0, total - down);
  const isPending = balance > 0 || order.status === 'pending';
  const items = order.items || [];

  const subtotalBrutoPedido = items.reduce((acc, i) => acc + (i.area ? i.price * i.area : i.price) * i.quantity, 0);
  const descontoPedido = order.discountValue || 0;

  // Layout & Dimensões Dinâmicas
  const scale = 2.5;
  const width = 680;
  const marginX = 26;
  const contentW = width - marginX * 2;
  const cardGap = 12;
  const halfW = (contentW - cardGap) / 2;

  // Cabeçalho
  const headerH = 104;

  // Pipeline (Evolução do Serviço)
  const pipelineH = order.status !== 'canceled' ? 88 : 46;

  // Cards de Cliente e Dados do Pedido
  const infoCardsH = 98;

  // Tabela de Produtos (Dinâmica - expande proporcionalmente conforme quantidade e observações)
  const tableItemRows = items.length > 0 ? items.length : 1;
  const itemRowHeights = items.length > 0
    ? items.map(item => {
        let h = 46;
        if (item.observacao) h += 14;
        if (item.dimensions || (!item.area && item.consumoEstoque)) h += 12;
        return h;
      })
    : [46];
  const tableContentH = itemRowHeights.reduce((a, b) => a + b, 0);
  const tableTotalH = 36 + tableContentH; // 36px cabeçalho da tabela + linhas

  // Total Financeiro
  const paymentBreakdown = order.payments && order.payments.length > 1 ? order.payments : null;
  const paymentBreakdownExtra = paymentBreakdown ? (paymentBreakdown.length - 1) * 16 : 0;
  const totalCardH = 132 + paymentBreakdownExtra;

  // Informações Importantes
  const OBSERVACOES = [
    'Produção iniciada somente após aprovação da arte pelo cliente.',
    'Alterações após aprovação poderão gerar novo orçamento e/ou alteração do prazo.',
    'Confira o material no ato da retirada.',
    'Garantia de 90 dias, sem prejuízo da garantia legal prevista no CDC – Lei nº 8.078/1990, art. 26.',
  ];
  const obsCardH = 38 + OBSERVACOES.length * 19;

  // Rodapé
  const footerCardH = 92;
  const bottomBannerH = 28;

  // Altura total dinâmica perfeita
  const height =
    24 + // margem superior
    headerH + 12 +
    pipelineH + 12 +
    infoCardsH + 14 +
    tableTotalH + 14 +
    totalCardH + 14 +
    obsCardH + 14 +
    footerCardH + 10 +
    bottomBannerH +
    26; // margem inferior

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Fundo geral preto absoluto
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  let currentY = 24;

  // =========================================================================
  // 1. CABEÇALHO COM FAIXA DIAGONAL VERMELHA E IDENTIDADE VISUAL
  // =========================================================================
  ctx.save();
  // Faixa dinâmica diagonal vermelha na área do cabeçalho
  const redBandX = width * 0.54;
  ctx.beginPath();
  ctx.moveTo(redBandX + 30, 0);
  ctx.lineTo(redBandX + 100, 0);
  ctx.lineTo(redBandX + 45, headerH + 30);
  ctx.lineTo(redBandX - 25, headerH + 30);
  ctx.closePath();
  const bandGrad = ctx.createLinearGradient(redBandX, 0, redBandX + 80, headerH);
  bandGrad.addColorStop(0, RED);
  bandGrad.addColorStop(1, RED_DARK);
  ctx.fillStyle = bandGrad;
  ctx.fill();
  ctx.restore();

  // Lado Esquerdo: Logo / Tipografia
  let textStartX = marginX;
  if (logoImg) {
    const maxLogoH = 46;
    const logoW = (logoImg.width / logoImg.height) * maxLogoH;
    ctx.drawImage(logoImg, marginX, currentY + 6, logoW, maxLogoH);
    textStartX = marginX + logoW + 14;
  }

  // Título da Empresa
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 22px ${FONT}`;
  ctx.fillText('RAFA ARTS', textStartX, currentY + 22);
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `400 22px ${FONT}`;
  const brandW = ctx.measureText('RAFA ARTS ').width;
  ctx.fillText('GRAPHICS', textStartX + brandW - 2, currentY + 22);

  // Linha colorida discreta abaixo do logo (identidade gráfica)
  const lineY = currentY + 28;
  const lineW = 160;
  const rainbowGrad = ctx.createLinearGradient(textStartX, lineY, textStartX + lineW, lineY);
  rainbowGrad.addColorStop(0, '#FF2B2B');
  rainbowGrad.addColorStop(0.3, '#F59E0B');
  rainbowGrad.addColorStop(0.6, '#3B82F6');
  rainbowGrad.addColorStop(1, '#8B5CF6');
  ctx.fillStyle = rainbowGrad;
  ctx.fillRect(textStartX, lineY, lineW, 2);

  // Taglines
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `800 10px ${FONT}`;
  ctx.fillText('COMUNICAÇÃO VISUAL', textStartX, currentY + 44);

  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `700 6.8px ${FONT}`;
  ctx.fillText('IMPRESSÃO DIGITAL • ADESIVOS • FACHADAS • BANNERS • LONAS • ACM • PVC • ENVELOPAMENTO', textStartX, currentY + 58);

  // Lado Direito: ORDEM DE SERVIÇO, Número e Data
  const docTitle = documentTitle || (isOrcamento ? 'ORÇAMENTO' : 'ORDEM DE');
  const docSubtitle = isOrcamento ? 'DETALHADO' : 'SERVIÇO';
  const docNum = numeroDocumento ? numeroDocumento : order.id.slice(-8).toUpperCase();
  const dateTimeObj = formatDocDateTime(order.createdAt);

  ctx.textAlign = 'right';
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `800 13px ${FONT}`;
  ctx.fillText(docTitle, width - marginX, currentY + 16);

  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 32px ${FONT}`;
  ctx.fillText(docSubtitle, width - marginX, currentY + 46);

  // Ícone de documento + Número do Pedido
  ctx.fillStyle = RED;
  ctx.font = `900 12px ${FONT}`;
  ctx.fillText('📄', width - marginX - ctx.measureText(`#${docNum}`).width - 18, currentY + 68);
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `800 12px ${FONT}`;
  ctx.fillText(`#${docNum}`, width - marginX, currentY + 68);

  // Ícone de calendário + Data e Hora
  ctx.fillStyle = RED;
  ctx.font = `900 10px ${FONT}`;
  const dtText = `${dateTimeObj.date}  •  ${dateTimeObj.time}`;
  ctx.fillText('📅', width - marginX - ctx.measureText(dtText).width - 16, currentY + 84);
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `700 9.5px ${FONT}`;
  ctx.fillText(dtText, width - marginX, currentY + 84);

  currentY += headerH + 12;

  // =========================================================================
  // 2. EVOLUÇÃO DO SERVIÇO (STEPPER HORIZONTAL EM DESTAQUE)
  // =========================================================================
  if (order.status !== 'canceled') {
    drawCard(ctx, marginX, currentY, contentW, pipelineH, 16);

    const stageIdx = getPipelineIndex(order);
    const stageCount = PIPELINE_STAGES.length;
    const trackPaddingX = 28;
    const trackStartX = marginX + trackPaddingX;
    const trackW = contentW - trackPaddingX * 2;
    const trackY = currentY + 28;

    // Linha de fundo cinza escuro
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(trackStartX, trackY);
    ctx.lineTo(trackStartX + trackW, trackY);
    ctx.stroke();

    // Linha de progresso vermelha vibrante até o estágio atual
    if (stageIdx > 0) {
      const fillRatio = Math.min(1, stageIdx / (stageCount - 1));
      ctx.strokeStyle = RED;
      ctx.beginPath();
      ctx.moveTo(trackStartX, trackY);
      ctx.lineTo(trackStartX + trackW * fillRatio, trackY);
      ctx.stroke();
    }

    // Ícones específicos por etapa
    const stageIcons = ['check', 'check', 'pencil', 'ring', 'gear', 'mail', 'package', 'truck'];

    for (let i = 0; i < stageCount; i++) {
      const cx = trackStartX + (trackW * i) / (stageCount - 1);
      const isDone = i < stageIdx;
      const isCurrent = i === stageIdx;
      const isFuture = i > stageIdx;

      if (isCurrent) {
        // Círculo concêntrico maior em destaque visual
        ctx.beginPath();
        ctx.arc(cx, trackY, 13.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 43, 43, 0.25)';
        ctx.fill();
        ctx.strokeStyle = RED;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, trackY, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = RED;
        ctx.fill();
      } else if (isDone) {
        // Estágios concluídos: círculo vermelho sólido com ícone em branco
        ctx.beginPath();
        ctx.arc(cx, trackY, 10.5, 0, Math.PI * 2);
        ctx.fillStyle = RED;
        ctx.fill();
        drawBadgeIcon(ctx, stageIcons[i] || 'check', cx, trackY, 'transparent', '#FFFFFF', 8);
      } else {
        // Estágios futuros: cinza escuro com ícone sutil
        ctx.beginPath();
        ctx.arc(cx, trackY, 9.5, 0, Math.PI * 2);
        ctx.fillStyle = '#222222';
        ctx.fill();
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        drawBadgeIcon(ctx, stageIcons[i] || 'doc', cx, trackY, 'transparent', '#777777', 7);
      }

      // Rótulos abaixo do nó em 2 linhas
      const label = PIPELINE_STAGES[i];
      const lines = forceTwoLines(label);
      ctx.textAlign = 'center';
      ctx.font = isCurrent ? `900 7px ${FONT}` : isDone ? `800 6.8px ${FONT}` : `600 6.5px ${FONT}`;
      ctx.fillStyle = isCurrent ? TEXT_WHITE : isDone ? '#E0E0E0' : '#777777';

      lines.forEach((line, li) => {
        ctx.fillText(line, cx, trackY + 22 + li * 9.5);
      });
    }
  } else {
    // Pedido cancelado
    drawCard(ctx, marginX, currentY, contentW, pipelineH, 12, 'rgba(181, 18, 24, 0.15)', RED);
    ctx.fillStyle = RED;
    ctx.font = `900 12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('PEDIDO CANCELADO', width / 2, currentY + 28);
  }

  currentY += pipelineH + 12;

  // =========================================================================
  // 3. CLIENTE + DADOS DO PEDIDO (2 BLOCOS GRANDES LADO A LADO)
  // =========================================================================
  const clientCardX = marginX;
  const orderCardX = marginX + halfW + cardGap;

  // BLOCO CLIENTE
  drawCard(ctx, clientCardX, currentY, halfW, infoCardsH, 16);
  // Marca d'água sutil no canto do card
  drawBadgeIcon(ctx, 'user', clientCardX + halfW - 28, currentY + 54, 'transparent', 'rgba(255, 255, 255, 0.03)', 30);

  drawBadgeIcon(ctx, 'user', clientCardX + 26, currentY + 26, RED, '#FFFFFF', 14);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `800 8.5px ${FONT}`;
  ctx.fillText('CLIENTE', clientCardX + 48, currentY + 29);

  // Nome do cliente em fonte grande e forte
  const clienteNome = (order.customerName || 'Cliente de Balcão').toUpperCase();
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 15px ${FONT}`;
  const displayClientName = clienteNome.length > 25 ? clienteNome.slice(0, 25) + '…' : clienteNome;
  ctx.fillText(displayClientName, clientCardX + 22, currentY + 57);

  // Telefone / WhatsApp com ícone
  const phoneText = customerPhone || order.customerPhone || '';
  if (phoneText) {
    drawBadgeIcon(ctx, 'whatsapp', clientCardX + 28, currentY + 77, 'rgba(255, 43, 43, 0.15)', RED, 8);
    ctx.fillStyle = TEXT_WHITE;
    ctx.font = `800 12px ${FONT}`;
    ctx.fillText(phoneText, clientCardX + 42, currentY + 81);
  } else {
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = `600 10px ${FONT}`;
    ctx.fillText('Sem telefone informado', clientCardX + 22, currentY + 80);
  }

  // BLOCO DADOS DO PEDIDO
  drawCard(ctx, orderCardX, currentY, halfW, infoCardsH, 16);
  // Marca d'água sutil
  drawBadgeIcon(ctx, 'doc', orderCardX + halfW - 28, currentY + 54, 'transparent', 'rgba(255, 255, 255, 0.03)', 30);

  drawBadgeIcon(ctx, 'doc', orderCardX + 26, currentY + 26, RED, '#FFFFFF', 14);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `800 8.5px ${FONT}`;
  ctx.fillText('DADOS DO PEDIDO', orderCardX + 48, currentY + 29);

  // Situação: [ABERTA / FINALIZADA / CANCELADA]
  ctx.font = `700 10.5px ${FONT}`;
  ctx.fillStyle = TEXT_GRAY;
  ctx.fillText('Situação:', orderCardX + 22, currentY + 54);

  const situacaoTexto = order.status === 'completed' ? 'FINALIZADA' : order.status === 'canceled' ? 'CANCELADA' : 'ABERTA';
  const badgeW = ctx.measureText(situacaoTexto).width + 18;
  roundRect(ctx, orderCardX + 76, currentY + 43, badgeW, 16, 8);
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 8.5px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(situacaoTexto, orderCardX + 76 + badgeW / 2, currentY + 54.5);

  // Pagamento: PIX / etc.
  ctx.textAlign = 'left';
  ctx.font = `700 10px ${FONT}`;
  ctx.fillStyle = TEXT_GRAY;
  ctx.fillText('Pagamento:', orderCardX + 22, currentY + 72);
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `800 10px ${FONT}`;
  ctx.fillText((order.paymentMethod || 'PIX').toUpperCase(), orderCardX + 88, currentY + 72);

  // Entrega: Data ou 'Sem entrega agendada'
  ctx.font = `700 10px ${FONT}`;
  ctx.fillStyle = TEXT_GRAY;
  ctx.fillText('Entrega:', orderCardX + 22, currentY + 88);
  ctx.fillStyle = order.scheduledFor ? TEXT_WHITE : TEXT_GRAY;
  ctx.font = `700 10px ${FONT}`;
  const entregaTexto = order.scheduledFor
    ? new Date(order.scheduledFor).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Sem entrega agendada';
  ctx.fillText(entregaTexto, orderCardX + 70, currentY + 88);

  currentY += infoCardsH + 14;

  // =========================================================================
  // 4. SERVIÇOS / PRODUTOS (TABELA LIMPA, GRANDE E ALTO CONTRASTE)
  // =========================================================================
  // Barra de Título da Seção
  drawBadgeIcon(ctx, 'list', marginX + 16, currentY + 12, RED, '#FFFFFF', 13);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 13px ${FONT}`;
  ctx.fillText('SERVIÇOS / PRODUTOS', marginX + 36, currentY + 16.5);

  // Títulos das Colunas
  ctx.font = `800 8.5px ${FONT}`;
  ctx.fillStyle = TEXT_GRAY;
  ctx.textAlign = 'center';
  ctx.fillText('QTD', marginX + 28, currentY + 31);
  ctx.textAlign = 'left';
  ctx.fillText('DESCRIÇÃO DO SERVIÇO', marginX + 56, currentY + 31);
  ctx.fillText('MEDIDA', marginX + 310, currentY + 31);
  ctx.textAlign = 'right';
  ctx.fillText('VALOR UNIT.', width - marginX - 105, currentY + 31);
  ctx.fillText('SUBTOTAL', width - marginX - 18, currentY + 31);

  currentY += 36;

  // Card Branco de Fundo para os Itens (Garante altíssima legibilidade e visual idêntico à referência)
  drawCard(ctx, marginX, currentY, contentW, tableContentH, 18, '#FFFFFF', 'transparent');

  let rowY = currentY;
  const renderItemCount = items.length > 0 ? items.length : 1;

  for (let i = 0; i < renderItemCount; i++) {
    const item = items[i];
    const thisRowH = itemRowHeights[i] || 46;

    if (item) {
      const unitPriceBruto = item.area ? item.price * item.area : item.price;
      const subtotalBruto = unitPriceBruto * item.quantity;
      const fatiaDesconto = descontoPedido > 0 && subtotalBrutoPedido > 0 ? (subtotalBruto / subtotalBrutoPedido) * descontoPedido : 0;
      const subtotal = Math.max(0, subtotalBruto - fatiaDesconto);
      const unitPrice = item.quantity > 0 ? subtotal / item.quantity : subtotal;

      // Círculo com o número da linha (ex: 01, 02)
      const numBadgeSize = 24;
      roundRect(ctx, marginX + 16, rowY + 11, numBadgeSize, numBadgeSize, 8);
      ctx.fillStyle = '#151515';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1).padStart(2, '0'), marginX + 16 + numBadgeSize / 2, rowY + 26);

      // Descrição Principal
      ctx.textAlign = 'left';
      ctx.fillStyle = '#090909';
      ctx.font = `900 11px ${FONT}`;
      const itemTitle = item.name.toUpperCase();
      const displayTitle = itemTitle.length > 28 ? itemTitle.slice(0, 28) + '…' : itemTitle;
      ctx.fillText(displayTitle, marginX + 56, rowY + 21, 240);

      // Sub-descrição / Material / Observação
      let subDesc = '';
      if (item.observacao) subDesc = item.observacao;
      else if (item.name.toLowerCase().includes('adesivo')) subDesc = 'Material: Vinil adesivo impresso';
      else if (item.name.toLowerCase().includes('banner') || item.name.toLowerCase().includes('lona')) subDesc = 'Material: Lona impressa com acabamento';
      else subDesc = 'Serviço personalizado conforme especificações';

      ctx.fillStyle = '#666666';
      ctx.font = `600 8.5px ${FONT}`;
      ctx.fillText(subDesc.length > 40 ? subDesc.slice(0, 40) + '…' : subDesc, marginX + 56, rowY + 34, 240);

      // Coluna MEDIDA (Alinhada à esquerda com largura máxima controlada para NUNCA passar por cima do valor)
      ctx.textAlign = 'left';
      const dimStr = item.dimensions || '';
      const linearSuffix = (!dimStr.toLowerCase().includes('linear') && !item.area && item.consumoEstoque)
        ? `(${Number(item.consumoEstoque).toFixed(2).replace('.', ',')}m linear)`
        : '';
      
      const medidaX = marginX + 310;
      const medidaMaxW = 110;

      if (dimStr && linearSuffix) {
        ctx.fillStyle = '#111111';
        ctx.font = `700 9px ${FONT}`;
        ctx.fillText(dimStr, medidaX, rowY + 21, medidaMaxW);
        ctx.fillStyle = '#777777';
        ctx.font = `600 8px ${FONT}`;
        ctx.fillText(linearSuffix, medidaX, rowY + 33, medidaMaxW);
      } else if (dimStr || linearSuffix) {
        ctx.fillStyle = '#111111';
        ctx.font = `700 9.5px ${FONT}`;
        ctx.fillText(dimStr || linearSuffix, medidaX, rowY + 26, medidaMaxW);
      } else {
        ctx.fillStyle = '#999999';
        ctx.font = `600 9px ${FONT}`;
        ctx.fillText('—', medidaX, rowY + 26);
      }

      // Coluna VALOR UNIT. (Alinhado à direita com espaçamento seguro)
      ctx.textAlign = 'right';
      ctx.fillStyle = '#444444';
      ctx.font = `700 10.5px ${FONT}`;
      ctx.fillText(`R$ ${unitPrice.toFixed(2).replace('.', ',')}`, width - marginX - 105, rowY + 26);

      // Coluna SUBTOTAL (Alinhado à direita na borda direita)
      ctx.fillStyle = '#090909';
      ctx.font = `900 11.5px ${FONT}`;
      ctx.fillText(`R$ ${subtotal.toFixed(2).replace('.', ',')}`, width - marginX - 18, rowY + 26);
    }

    // Linha divisória entre os itens
    if (i < renderItemCount - 1) {
      ctx.strokeStyle = '#EEEEEE';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginX + 16, rowY + thisRowH);
      ctx.lineTo(width - marginX - 16, rowY + thisRowH);
      ctx.stroke();
    }

    rowY += thisRowH;
  }

  currentY += tableContentH + 14;

  // =========================================================================
  // 5. TOTAL FINANCEIRO (ÁREA DE GRANDE DESTAQUE)
  // =========================================================================
  drawCard(ctx, marginX, currentY, contentW, totalCardH, 18);

  // Efeito sutil de gradiente vermelho escuro no lado esquerdo
  ctx.save();
  roundRect(ctx, marginX, currentY, contentW, totalCardH, 18);
  ctx.clip();
  const finGlow = ctx.createLinearGradient(marginX, currentY, marginX + halfW, currentY + totalCardH);
  finGlow.addColorStop(0, 'rgba(181, 18, 24, 0.35)');
  finGlow.addColorStop(0.5, 'rgba(181, 18, 24, 0.08)');
  finGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = finGlow;
  ctx.fillRect(marginX, currentY, halfW + 40, totalCardH);
  ctx.restore();

  // Lado Esquerdo: TOTAL DO PEDIDO
  drawBadgeIcon(ctx, 'coins', marginX + 28, currentY + 36, RED, '#FFFFFF', 16);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 11px ${FONT}`;
  ctx.fillText('TOTAL DO PEDIDO', marginX + 54, currentY + 40);

  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 38px ${FONT}`;
  ctx.fillText(`R$ ${total.toFixed(2).replace('.', ',')}`, marginX + 22, currentY + 82);

  // Barra de sublinhado vermelha
  roundRect(ctx, marginX + 22, currentY + 92, 60, 4, 2);
  ctx.fillStyle = RED;
  ctx.fill();

  // Linha divisória vertical
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marginX + halfW, currentY + 20);
  ctx.lineTo(marginX + halfW, currentY + totalCardH - 20);
  ctx.stroke();

  // Lado Direito: Entrada recebida, Saldo pendente e Status
  const finRightX = marginX + halfW + 24;

  // Entrada recebida
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText('Entrada recebida', finRightX, currentY + 38);

  ctx.textAlign = 'right';
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 14px ${FONT}`;
  ctx.fillText(`R$ ${down.toFixed(2).replace('.', ',')}`, width - marginX - 22, currentY + 38);

  // Saldo pendente
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText('Saldo pendente', finRightX, currentY + 62);

  ctx.textAlign = 'right';
  ctx.fillStyle = isPending ? RED : TEXT_WHITE;
  ctx.font = `900 15px ${FONT}`;
  ctx.fillText(isPending ? `R$ ${balance.toFixed(2).replace('.', ',')}` : 'R$ 0,00', width - marginX - 22, currentY + 62);

  // Linha de múltiplos pagamentos se houver
  if (paymentBreakdown) {
    let py = currentY + 80;
    paymentBreakdown.forEach((p, idx) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = TEXT_MUTED;
      ctx.font = `600 8.5px ${FONT}`;
      ctx.fillText(`${idx + 1}. ${(p.method || 'PIX').toUpperCase()}`, finRightX + 4, py);
      ctx.textAlign = 'right';
      ctx.fillStyle = TEXT_WHITE;
      ctx.font = `700 9px ${FONT}`;
      ctx.fillText(`R$ ${p.value.toFixed(2).replace('.', ',')}`, width - marginX - 22, py);
      py += 16;
    });
  }

  // Status do Pagamento
  const badgeRowY = currentY + totalCardH - 28;
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText('Status do pagamento:', finRightX, badgeRowY + 4);

  // Badge Status: PENDENTE (Vermelho escuro) ou PAGO (Grafite com check)
  const statusLabel = isPending ? 'PENDENTE' : 'PAGO';
  const statusBadgeW = isPending ? 96 : 78;
  const statusBadgeX = width - marginX - 22 - statusBadgeW;

  roundRect(ctx, statusBadgeX, badgeRowY - 11, statusBadgeW, 22, 11);
  ctx.fillStyle = isPending ? 'rgba(181, 18, 24, 0.25)' : 'rgba(255, 255, 255, 0.08)';
  ctx.fill();
  ctx.strokeStyle = isPending ? RED_DARK : '#444444';
  ctx.lineWidth = 1;
  ctx.stroke();

  drawBadgeIcon(ctx, isPending ? 'clock' : 'check', statusBadgeX + 13, badgeRowY, 'transparent', isPending ? RED : '#FFFFFF', 6);
  ctx.textAlign = 'center';
  ctx.fillStyle = isPending ? RED : TEXT_WHITE;
  ctx.font = `900 9.5px ${FONT}`;
  ctx.fillText(statusLabel, statusBadgeX + (statusBadgeW / 2) + 6, badgeRowY + 3.5);

  currentY += totalCardH + 14;

  // =========================================================================
  // 6. INFORMAÇÕES IMPORTANTES (CARD ÚNICO)
  // =========================================================================
  drawCard(ctx, marginX, currentY, contentW, obsCardH, 16);
  // Marca d'água sutil
  drawBadgeIcon(ctx, 'doc', marginX + contentW - 32, currentY + 50, 'transparent', 'rgba(255, 255, 255, 0.03)', 34);

  drawBadgeIcon(ctx, 'info', marginX + 24, currentY + 22, RED, '#FFFFFF', 12);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 11px ${FONT}`;
  ctx.fillText('INFORMAÇÕES IMPORTANTES', marginX + 44, currentY + 25.5);

  OBSERVACOES.forEach((obs, idx) => {
    const itemY = currentY + 44 + idx * 19;
    // Ícone de check vermelho
    drawBadgeIcon(ctx, 'check', marginX + 24, itemY - 1, RED, '#FFFFFF', 7);
    ctx.fillStyle = '#DDDDDD';
    ctx.font = `600 8.8px ${FONT}`;
    ctx.fillText(obs, marginX + 38, itemY + 2, contentW - 54);
  });

  currentY += obsCardH + 14;

  // =========================================================================
  // 7. RODAPÉ COMPACTO COM CONTATOS, QR CODE E SEM REPETIÇÃO DE LOGO
  // =========================================================================
  drawCard(ctx, marginX, currentY, contentW, footerCardH, 16);

  const colY = currentY + 24;

  // 1. WhatsApp
  drawBadgeIcon(ctx, 'whatsapp', marginX + 26, colY + 18, RED, '#FFFFFF', 13);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `700 8px ${FONT}`;
  ctx.fillText('WhatsApp', marginX + 46, colY + 12);
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 11.5px ${FONT}`;
  ctx.fillText(CONTACT.whatsapp, marginX + 46, colY + 28);

  // 2. Instagram
  drawBadgeIcon(ctx, 'insta', marginX + 170, colY + 18, RED, '#FFFFFF', 13);
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `700 8px ${FONT}`;
  ctx.fillText('Instagram', marginX + 190, colY + 12);
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 11.5px ${FONT}`;
  ctx.fillText(CONTACT.instagram, marginX + 190, colY + 28);

  // 3. Endereço
  drawBadgeIcon(ctx, 'pin', marginX + 338, colY + 18, RED, '#FFFFFF', 13);
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `700 8.5px ${FONT}`;
  ctx.fillText('Avenida Maracanã, nº 287', marginX + 358, colY + 12);
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `600 8px ${FONT}`;
  ctx.fillText('Elcione Barbalho', marginX + 358, colY + 24);
  ctx.fillText('Santarém – PA', marginX + 358, colY + 36);

  // 4. QR Code para o site da empresa no canto direito
  if (qrImg) {
    const qrSize = 56;
    const qrX = width - marginX - qrSize - 16;
    const qrY = currentY + 12;

    roundRect(ctx, qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    ctx.textAlign = 'center';
    ctx.fillStyle = TEXT_GRAY;
    ctx.font = `800 6.5px ${FONT}`;
    ctx.fillText('ACESSE NOSSO SITE', qrX + qrSize / 2, qrY + qrSize + 11);
  }

  currentY += footerCardH + 10;

  // =========================================================================
  // 8. BANNER FINAL VERMELHO DE VALIDADE DO COMPROVANTE
  // =========================================================================
  roundRect(ctx, marginX, currentY, contentW, bottomBannerH, 10);
  const bannerGrad = ctx.createLinearGradient(marginX, currentY, marginX + contentW, currentY);
  bannerGrad.addColorStop(0, RED_DARK);
  bannerGrad.addColorStop(0.5, RED);
  bannerGrad.addColorStop(1, RED_DARK);
  ctx.fillStyle = bannerGrad;
  ctx.fill();

  drawBadgeIcon(ctx, 'shield', marginX + 22, currentY + bottomBannerH / 2, 'transparent', '#FFFFFF', 7);
  ctx.textAlign = 'center';
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `800 8.5px ${FONT}`;
  const validadeTexto = isOrcamento
    ? 'Documento válido como orçamento comercial. Guarde para sua segurança.'
    : 'Documento válido como comprovante de serviço. Guarde este documento para sua segurança.';
  ctx.fillText(validadeTexto, width / 2 + 6, currentY + 17.5);

  return canvas;
}

export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export async function downloadCanvasAsPdf(canvas: HTMLCanvasElement, filename: string) {
  const { jsPDF } = await import('jspdf');
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgRatio = canvas.height / canvas.width;
  let drawW = pageW - 12;
  let drawH = drawW * imgRatio;
  if (drawH > pageH - 12) {
    drawH = pageH - 12;
    drawW = drawH / imgRatio;
  }
  const offsetX = (pageW - drawW) / 2;
  const offsetY = (pageH - drawH) / 2;
  // Fundo preto consistente no PDF A4
  pdf.setFillColor(9, 9, 9);
  pdf.rect(0, 0, pageW, pageH, 'F');
  pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH);
  pdf.save(filename);
}
