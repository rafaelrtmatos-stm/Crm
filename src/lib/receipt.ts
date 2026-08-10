import type { SaleOrder } from '../types';

export interface ReceiptRenderInput {
  order: SaleOrder;
  companyName: string;
  customerPhone?: string;
  customerCpf?: string;
  customerAddress?: string;
  responsavel?: string;
  logoDarkUrl?: string | null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ---------- Paleta (tema claro premium) ----------
const BG = '#F5F7FA';
const CARD = '#FFFFFF';
const BORDER = '#E5E9F0';
const TEXT = '#111827';
const TEXT_DIM = '#6B7280';
const TEXT_FAINT = '#9CA3AF';
const ACCENT = '#2563EB';
const GREEN = '#16A34A';
const AMBER = '#D97706';
const RED = '#DC2626';
const FONT = 'Arial';

const PIPELINE_STAGES = [
  'Pedido Recebido', 'Aguardando Arte', 'Arte em Desenvolvimento', 'Aguardando Aprovação',
  'Produção', 'Acabamento', 'Produto Entregue',
];

function getPipelineIndex(order: SaleOrder): number {
  if (order.status === 'completed') return 6;
  const down = order.downPayment ?? order.receivedValue ?? 0;
  if (down > 0) return 3;
  return 0;
}

// Icones simples desenhados a mao (sem depender de emoji/fonte, funciona igual em qualquer navegador e no PDF)
function drawStageIcon(ctx: CanvasRenderingContext2D, stageIndex: number, cx: number, cy: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const s = 3.2; // escala do icone
  switch (stageIndex) {
    case 0: // Pedido Recebido - check
      ctx.beginPath();
      ctx.moveTo(cx - s, cy);
      ctx.lineTo(cx - s / 3, cy + s * 0.8);
      ctx.lineTo(cx + s, cy - s * 0.8);
      ctx.stroke();
      break;
    case 1: // Aguardando Arte - ampulheta
      ctx.beginPath();
      ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy - s);
      ctx.lineTo(cx - s * 0.15, cy); ctx.lineTo(cx + s, cy + s);
      ctx.lineTo(cx - s, cy + s); ctx.lineTo(cx + s * 0.15, cy);
      ctx.closePath();
      ctx.stroke();
      break;
    case 2: // Arte em Desenvolvimento - lapis
      ctx.beginPath();
      ctx.moveTo(cx - s, cy + s);
      ctx.lineTo(cx + s * 0.4, cy - s);
      ctx.lineTo(cx + s, cy - s * 0.4);
      ctx.lineTo(cx - s * 0.4, cy + s);
      ctx.closePath();
      ctx.stroke();
      break;
    case 3: // Aguardando Aprovacao - pessoa
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.6, s * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + s * 1.3, s * 1.1, Math.PI, 0, true);
      ctx.stroke();
      break;
    case 4: // Producao - engrenagem
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * s * 0.75, cy + Math.sin(ang) * s * 0.75);
        ctx.lineTo(cx + Math.cos(ang) * s * 1.15, cy + Math.sin(ang) * s * 1.15);
        ctx.stroke();
      }
      break;
    case 5: // Acabamento - caixa
      ctx.beginPath();
      ctx.rect(cx - s, cy - s * 0.7, s * 2, s * 1.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s, cy - s * 0.7); ctx.lineTo(cx, cy); ctx.lineTo(cx + s, cy - s * 0.7);
      ctx.stroke();
      break;
    case 6: // Produto Entregue - caminhao
      ctx.beginPath();
      ctx.rect(cx - s * 1.2, cy - s * 0.5, s * 1.4, s * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.2, cy - s * 0.1);
      ctx.lineTo(cx + s * 0.9, cy - s * 0.1);
      ctx.lineTo(cx + s * 1.2, cy + s * 0.4);
      ctx.lineTo(cx + s * 0.2, cy + s * 0.4);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - s * 0.6, cy + s * 0.5, s * 0.28, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + s * 0.65, cy + s * 0.5, s * 0.28, 0, Math.PI * 2); ctx.stroke();
      break;
  }
  ctx.restore();
}

// Dados fixos de contato da empresa (usados no rodape do documento)
const COMPANY_CONTACT = {
  whatsapp: '(93) 99211-2108',
  instagram: 'Rafa Artes Gráficos',
  facebook: 'Rafa Artes Gráficos',
  email: 'contato@rafaartesgraficos.com.br',
  site: 'rafaartesgraficos.com.br',
  siteUrl: 'https://rafaartesgraficos.com.br',
  endereco: 'Avenida Maracanã, nº 287 – Eusonio Barbalho, Santarém – PA',
};

// Desenha um pequeno icone com fundo circular colorido, usado ao lado dos titulos das secoes
function drawBadgeIcon(ctx: CanvasRenderingContext2D, kind: string, cx: number, cy: number, bg: string, fg: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = fg;
  ctx.fillStyle = fg;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const s = 3.4;
  switch (kind) {
    case 'user':
      ctx.beginPath(); ctx.arc(cx, cy - s * 0.5, s * 0.45, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy + s * 1.15, s * 0.95, Math.PI, 0, true); ctx.stroke();
      break;
    case 'doc':
      ctx.beginPath(); ctx.rect(cx - s * 0.7, cy - s, s * 1.4, s * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.35, cy - s * 0.3); ctx.lineTo(cx + s * 0.35, cy - s * 0.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.35, cy + s * 0.2); ctx.lineTo(cx + s * 0.35, cy + s * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.35, cy + s * 0.7); ctx.lineTo(cx + s * 0.1, cy + s * 0.7); ctx.stroke();
      break;
    case 'money':
      ctx.font = `900 11px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('$', cx, cy + 4);
      break;
    case 'clip':
      ctx.beginPath(); ctx.rect(cx - s * 0.75, cy - s, s * 1.5, s * 2.1); ctx.stroke();
      ctx.beginPath(); ctx.rect(cx - s * 0.3, cy - s * 1.2, s * 0.6, s * 0.4); ctx.stroke();
      break;
    case 'whatsapp':
      ctx.beginPath(); ctx.arc(cx, cy, s * 1.05, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'insta':
      roundRect(ctx, cx - s, cy - s, s * 2, s * 2, s * 0.6);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.55, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'face':
      ctx.font = `900 11px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('f', cx, cy + 4);
      break;
    case 'mail':
      ctx.beginPath(); ctx.rect(cx - s, cy - s * 0.7, s * 2, s * 1.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s, cy - s * 0.6); ctx.lineTo(cx, cy + s * 0.1); ctx.lineTo(cx + s, cy - s * 0.6); ctx.stroke();
      break;
    case 'globe':
      ctx.beginPath(); ctx.arc(cx, cy, s, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.45, s, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy); ctx.stroke();
      break;
    case 'check':
      ctx.beginPath(); ctx.arc(cx, cy, s * 1.1, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.5, cy);
      ctx.lineTo(cx - s * 0.1, cy + s * 0.4);
      ctx.lineTo(cx + s * 0.5, cy - s * 0.4);
      ctx.stroke();
      break;
    case 'pin':
      ctx.beginPath(); ctx.arc(cx, cy - s * 0.2, s * 0.85, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.6); ctx.lineTo(cx, cy + s * 1.3); ctx.stroke();
      break;
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(17,24,39,0.06)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = CARD;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 14);
  ctx.stroke();
}

// Desenha o recibo/OS em um canvas (usado para exportar PNG, PDF e impressão)
// Estilo SaaS premium claro (Stripe/Linear/Notion), com barra de status e total em destaque.
export async function renderReceiptCanvas({ order, companyName, customerPhone, customerCpf, customerAddress, responsavel, logoDarkUrl }: ReceiptRenderInput): Promise<HTMLCanvasElement> {
  const scale = 2.5;
  const width = 640;
  const rowHeight = 32;
  const total = order.total;
  const down = order.downPayment ?? order.receivedValue ?? (order.status === 'completed' ? total : 0);
  const balance = Math.max(0, total - down);
  const isPending = balance > 0 || order.status === 'pending';
  const items = order.items || [];
  const tableRows = Math.max(items.length, 3);
  const marginX = 28;
  const cardGap = 14;
  const halfW = (width - marginX * 2 - cardGap) / 2;

  // Conteudo dinamico dos cards de Cliente / Dados da Ordem (precisa saber antes de fixar a altura do canvas)
  const clienteRows = [order.customerName || 'Cliente de Balcão'];
  if (customerPhone) clienteRows.push(`Tel/WhatsApp: ${customerPhone}`);
  if (customerCpf) clienteRows.push(`CPF: ${customerCpf}`);
  if (customerAddress) clienteRows.push(`Endereço: ${customerAddress}`);
  const pedidoRows = [
    order.status === 'completed' ? 'Situação: Finalizada' : order.status === 'canceled' ? 'Situação: Cancelada' : 'Situação: Aberta',
    order.scheduledFor ? `Previsão: ${new Date(order.scheduledFor).toLocaleString('pt-BR')}` : 'Sem entrega agendada',
  ];
  if (responsavel) pedidoRows.push(`Atendimento: ${responsavel}`);
  if (order.paymentMethod) pedidoRows.push(`Pagamento: ${order.paymentMethod.toUpperCase()}`);

  const OBSERVACOES = [
    'Produção iniciada somente após aprovação da arte pelo cliente.',
    'Alterações após aprovação poderão gerar novo orçamento e/ou alteração do prazo.',
    'Confira o material no ato da retirada.',
    'Garantia de 90 dias, sem prejuízo da garantia legal prevista no CDC — Lei nº 8.078/1990, art. 26.',
  ];

  const headerH = 76;
  const pipelineH = 64;
  const infoCardsH = Math.max(92, 46 + Math.max(clienteRows.length, pedidoRows.length) * 17);
  const tableHeaderH = 32;
  const tableH = tableHeaderH + tableRows * rowHeight;
  const totalCardH = 150;
  const obsH = 30 + OBSERVACOES.length * 16 + 14;
  const footerH = 195;
  const height = headerH + pipelineH + infoCardsH + 20 + tableH + 22 + totalCardH + 26 + obsH + 22 + footerH + 40;

  let logoImg: HTMLImageElement | null = null;
  if (logoDarkUrl) {
    try { logoImg = await loadImage(logoDarkUrl); } catch (e) { logoImg = null; }
  }

  // QR Code apontando pro site (gerado como imagem, funcional de verdade)
  let qrImg: HTMLImageElement | null = null;
  try {
    const QRCode = (await import('qrcode')).default;
    const qrDataUrl = await QRCode.toDataURL(COMPANY_CONTACT.siteUrl, { margin: 1, width: 200, color: { dark: TEXT, light: '#FFFFFF00' } });
    qrImg = await loadImage(qrDataUrl);
  } catch (e) { qrImg = null; }

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  let y = 30;

  let textStartX = marginX;
  if (logoImg) {
    const logoH = 44;
    const logoW = (logoImg.width / logoImg.height) * logoH;
    ctx.drawImage(logoImg, marginX, y - 10, logoW, logoH);
    textStartX = marginX + logoW + 14;
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT;
  ctx.font = `900 20px ${FONT}`;
  ctx.fillText(companyName.toUpperCase(), textStartX, y + 8);
  ctx.font = `700 9px ${FONT}`;
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText('COMUNICAÇÃO VISUAL · IMPRESSÃO DIGITAL · ADESIVOS · FACHADAS · BANNERS', textStartX, y + 24);

  ctx.textAlign = 'right';
  ctx.fillStyle = ACCENT;
  ctx.font = `900 15px ${FONT}`;
  ctx.fillText('ORDEM DE SERVIÇO', width - marginX, y + 8);
  ctx.fillStyle = TEXT_FAINT;
  ctx.font = `700 9px ${FONT}`;
  ctx.fillText(`#${order.id.slice(-8).toUpperCase()}  ·  ${new Date(order.createdAt).toLocaleString('pt-BR')}`, width - marginX, y + 24);

  y += headerH;

  if (order.status !== 'canceled') {
    const stageIdx = getPipelineIndex(order);
    const stageCount = PIPELINE_STAGES.length;
    const trackY = y + 14;
    const trackX = marginX;
    const trackW = width - marginX * 2;
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(trackX, trackY);
    ctx.lineTo(trackX + trackW, trackY);
    ctx.stroke();

    const fillRatio = stageIdx / (stageCount - 1);
    ctx.strokeStyle = GREEN;
    ctx.beginPath();
    ctx.moveTo(trackX, trackY);
    ctx.lineTo(trackX + trackW * fillRatio, trackY);
    ctx.stroke();

    ctx.font = `700 7px ${FONT}`;
    ctx.textAlign = 'center';
    for (let i = 0; i < stageCount; i++) {
      const cx = trackX + (trackW * i) / (stageCount - 1);
      const done = i <= stageIdx;
      const isCurrent = i === stageIdx;
      const radius = isCurrent ? 7 : 5;
      ctx.beginPath();
      ctx.arc(cx, trackY, radius, 0, Math.PI * 2);
      ctx.fillStyle = done ? GREEN : CARD;
      ctx.fill();
      ctx.strokeStyle = done ? GREEN : BORDER;
      ctx.lineWidth = isCurrent ? 3 : 2;
      ctx.stroke();
      drawStageIcon(ctx, i, cx, trackY, done ? '#FFFFFF' : TEXT_FAINT);
      ctx.fillStyle = done ? TEXT : TEXT_FAINT;
      const label = PIPELINE_STAGES[i];
      ctx.font = isCurrent ? `800 7px ${FONT}` : `700 7px ${FONT}`;
      const labelMaxW = trackW / stageCount - 4;
      if (i === 0) {
        ctx.textAlign = 'left';
        ctx.fillText(label, Math.max(marginX, cx - labelMaxW / 2), trackY + 22, labelMaxW + 20);
      } else if (i === stageCount - 1) {
        ctx.textAlign = 'right';
        ctx.fillText(label, Math.min(width - marginX, cx + labelMaxW / 2), trackY + 22, labelMaxW + 20);
      } else {
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, trackY + 22, labelMaxW);
      }
    }
  } else {
    roundRect(ctx, marginX, y, width - marginX * 2, 32, 8);
    ctx.fillStyle = '#FEE2E2';
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.font = `900 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('PEDIDO CANCELADO', width / 2, y + 21);
  }
  y += pipelineH;

  const infoCard = (x: number, title: string, rows: string[], cardH: number, iconKind: string) => {
    drawCard(ctx, x, y, halfW, cardH);
    drawBadgeIcon(ctx, iconKind, x + 20, y + 17, '#DBEAFE', ACCENT);
    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT_FAINT;
    ctx.font = `800 8px ${FONT}`;
    ctx.fillText(title.toUpperCase(), x + 36, y + 20);
    rows.forEach((line, i) => {
      ctx.font = i === 0 ? `800 12px ${FONT}` : `600 9.5px ${FONT}`;
      ctx.fillStyle = i === 0 ? TEXT : TEXT_DIM;
      const displayLine = line.length > 46 ? line.slice(0, 46) + '…' : line;
      ctx.fillText(displayLine, x + 16, y + 46 + i * 17);
    });
  };
  infoCard(marginX, 'Cliente', clienteRows, infoCardsH, 'user');
  infoCard(marginX + halfW + cardGap, 'Dados da Ordem', pedidoRows, infoCardsH, 'doc');
  y += infoCardsH + 20;

  drawCard(ctx, marginX, y, width - marginX * 2, tableH);
  ctx.save();
  roundRect(ctx, marginX, y, width - marginX * 2, tableHeaderH, 14);
  ctx.clip();
  ctx.fillStyle = '#F9FAFB';
  ctx.fillRect(marginX, y, width - marginX * 2, tableHeaderH);
  ctx.restore();
  ctx.fillStyle = TEXT_FAINT;
  ctx.font = `800 8.5px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('QTD', marginX + 16, y + 20);
  ctx.fillText('DESCRIÇÃO DO SERVIÇO', marginX + 74, y + 20);
  ctx.textAlign = 'right';
  ctx.fillText('VALOR UNIT.', width - marginX - 148, y + 20);
  ctx.fillText('SUBTOTAL', width - marginX - 16, y + 20);

  let rowY = y + tableHeaderH;
  for (let i = 0; i < tableRows; i++) {
    const item = items[i];
    if (item) {
      const unitPrice = item.area ? item.price * item.area : item.price;
      const subtotal = unitPrice * item.quantity;
      ctx.textAlign = 'left';
      ctx.fillStyle = TEXT;
      ctx.font = `700 10.5px ${FONT}`;
      ctx.fillText(String(item.quantity), marginX + 16, rowY + 21);
      const nameLabel = item.name.length > 32 ? item.name.slice(0, 32) + '…' : item.name;
      ctx.font = `600 10.5px ${FONT}`;
      ctx.fillText(nameLabel, marginX + 74, rowY + 21);
      ctx.textAlign = 'right';
      ctx.fillStyle = TEXT_DIM;
      ctx.fillText(`R$ ${unitPrice.toFixed(2).replace('.', ',')}`, width - marginX - 148, rowY + 21);
      ctx.fillStyle = TEXT;
      ctx.font = `800 10.5px ${FONT}`;
      ctx.fillText(`R$ ${subtotal.toFixed(2).replace('.', ',')}`, width - marginX - 16, rowY + 21);
    }
    if (i < tableRows - 1) {
      ctx.strokeStyle = BORDER;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marginX + 16, rowY + rowHeight);
      ctx.lineTo(width - marginX - 16, rowY + rowHeight);
      ctx.stroke();
    }
    rowY += rowHeight;
  }
  y += tableH + 22;

  drawCard(ctx, marginX, y, width - marginX * 2, totalCardH);
  drawBadgeIcon(ctx, 'money', marginX + 22, y + 19, '#DCFCE7', GREEN);
  ctx.fillStyle = TEXT_FAINT;
  ctx.font = `800 8px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('RESUMO FINANCEIRO', marginX + 38, y + 22);

  ctx.fillStyle = ACCENT;
  ctx.font = `900 9px ${FONT}`;
  ctx.fillText('TOTAL GERAL', marginX + 18, y + 46);
  ctx.fillStyle = TEXT;
  ctx.font = `900 34px ${FONT}`;
  ctx.fillText(`R$ ${total.toFixed(2).replace('.', ',')}`, marginX + 18, y + 82);

  ctx.strokeStyle = BORDER;
  ctx.beginPath();
  ctx.moveTo(marginX + halfW + 4, y + 30);
  ctx.lineTo(marginX + halfW + 4, y + totalCardH - 16);
  ctx.stroke();

  const rightX = marginX + halfW + cardGap + 12;
  const payRow = (label: string, value: string, color: string, ry: number) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT_DIM;
    ctx.font = `600 9.5px ${FONT}`;
    ctx.fillText(label, rightX, ry);
    ctx.textAlign = 'right';
    ctx.fillStyle = color;
    ctx.font = `800 11.5px ${FONT}`;
    ctx.fillText(value, width - marginX - 18, ry);
  };
  payRow('Entrada Recebida', `R$ ${down.toFixed(2).replace('.', ',')}`, GREEN, y + 42);
  payRow('Forma de Pagamento', (order.paymentMethod || '-').toUpperCase(), TEXT, y + 66);
  payRow('Saldo Pendente', isPending ? `R$ ${balance.toFixed(2).replace('.', ',')}` : 'R$ 0,00', isPending ? AMBER : TEXT_DIM, y + 90);

  const badgeText = isPending ? 'PENDENTE' : 'PAGO';
  const badgeColor = isPending ? AMBER : GREEN;
  const badgeBg = isPending ? '#FEF3C7' : '#DCFCE7';
  ctx.font = `900 9px ${FONT}`;
  const badgeExtra = isPending ? 0 : 14;
  const badgeW = ctx.measureText(badgeText).width + 24 + badgeExtra;
  roundRect(ctx, width - marginX - 18 - badgeW, y + totalCardH - 34, badgeW, 22, 11);
  ctx.fillStyle = badgeBg;
  ctx.fill();
  ctx.fillStyle = badgeColor;
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, width - marginX - 18 - badgeW / 2 - badgeExtra / 2, y + totalCardH - 19);
  if (!isPending) {
    drawBadgeIcon(ctx, 'check', width - marginX - 18 - 10, y + totalCardH - 23, badgeBg, badgeColor);
  }

  y += totalCardH + 26;

  // Bloco unico de Observacoes Importantes
  drawCard(ctx, marginX, y, width - marginX * 2, obsH);
  drawBadgeIcon(ctx, 'clip', marginX + 22, y + 17, '#DBEAFE', ACCENT);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_FAINT;
  ctx.font = `800 8px ${FONT}`;
  ctx.fillText('OBSERVAÇÕES IMPORTANTES', marginX + 38, y + 20);
  OBSERVACOES.forEach((obs, i) => {
    ctx.fillStyle = GREEN;
    ctx.font = `900 9px ${FONT}`;
    ctx.fillText('✓', marginX + 18, y + 40 + i * 16);
    ctx.fillStyle = TEXT_DIM;
    ctx.font = `600 8.5px ${FONT}`;
    ctx.fillText(obs, marginX + 32, y + 40 + i * 16, width - marginX * 2 - 50);
  });
  y += obsH + 22;

  // Rodape: agradecimento + contatos reais + QR Code
  const footerTop = y;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(marginX, y + 8); ctx.lineTo(marginX + 130, y + 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(width - marginX - 130, y + 8); ctx.lineTo(width - marginX, y + 8); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = ACCENT;
  ctx.font = 'italic 800 14px Georgia';
  ctx.fillText('Obrigado pela preferência!', width / 2, y + 13);

  ctx.textAlign = 'left';
  ctx.font = `800 8px ${FONT}`;
  ctx.fillStyle = TEXT_FAINT;
  ctx.fillText('FALE CONOSCO', marginX, y + 42);

  const colGap = 130;
  const contactItem = (icon: string, bg: string, fg: string, label: string, value: string, col: number, row: number) => {
    const ix = marginX + col * colGap;
    const iy = y + 62 + row * 32;
    drawBadgeIcon(ctx, icon, ix + 8, iy, bg, fg);
    ctx.textAlign = 'left';
    ctx.font = `700 7.5px ${FONT}`;
    ctx.fillStyle = TEXT_FAINT;
    ctx.fillText(label, ix + 20, iy - 4);
    ctx.font = `800 8.5px ${FONT}`;
    ctx.fillStyle = TEXT;
    ctx.fillText(value, ix + 20, iy + 8);
  };
  contactItem('whatsapp', '#DCFCE7', GREEN, 'WhatsApp', COMPANY_CONTACT.whatsapp, 0, 0);
  contactItem('insta', '#FCE7F3', '#DB2777', 'Instagram', COMPANY_CONTACT.instagram, 1, 0);
  contactItem('face', '#DBEAFE', ACCENT, 'Facebook', COMPANY_CONTACT.facebook, 0, 1);
  contactItem('mail', '#FEF3C7', AMBER, 'E-mail', COMPANY_CONTACT.email, 1, 1);
  drawBadgeIcon(ctx, 'globe', marginX + 8, y + 62 + 64, '#E0E7FF', '#4F46E5');
  ctx.textAlign = 'left';
  ctx.font = `700 7.5px ${FONT}`;
  ctx.fillStyle = TEXT_FAINT;
  ctx.fillText('Site', marginX + 20, y + 62 + 60);
  ctx.font = `800 8.5px ${FONT}`;
  ctx.fillStyle = TEXT;
  ctx.fillText(COMPANY_CONTACT.site, marginX + 20, y + 62 + 72);

  drawBadgeIcon(ctx, 'pin', marginX + 8, y + 62 + 96, '#FEE2E2', RED);
  ctx.font = `600 8px ${FONT}`;
  ctx.fillStyle = TEXT;
  ctx.fillText(COMPANY_CONTACT.endereco, marginX + 20, y + 62 + 99, width - 260);

  // QR Code no canto direito do rodape
  if (qrImg) {
    const qrSize = 78;
    const qrX = width - marginX - qrSize;
    const qrY = footerTop + 20;
    ctx.textAlign = 'center';
    ctx.font = `800 7.5px ${FONT}`;
    ctx.fillStyle = TEXT_FAINT;
    ctx.fillText('ACESSE NOSSO SITE', qrX + qrSize / 2, qrY);
    ctx.drawImage(qrImg, qrX, qrY + 6, qrSize, qrSize);
    ctx.font = `600 7px ${FONT}`;
    ctx.fillStyle = TEXT_DIM;
    ctx.fillText('Escaneie o QR Code', qrX + qrSize / 2, qrY + qrSize + 18);
    ctx.fillText('e acesse nosso site', qrX + qrSize / 2, qrY + qrSize + 29);
    ctx.fillStyle = ACCENT;
    ctx.font = `700 7.5px ${FONT}`;
    ctx.fillText(COMPANY_CONTACT.site, qrX + qrSize / 2, qrY + qrSize + 43);
  }

  // Barra final de validade do documento
  const barY = footerTop + 165;
  roundRect(ctx, marginX, barY, width - marginX * 2, 24, 8);
  ctx.fillStyle = ACCENT;
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 8px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('Documento válido como comprovante de serviço. Guarde para sua segurança.', width / 2, barY + 16);

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
  let drawW = pageW - 16;
  let drawH = drawW * imgRatio;
  if (drawH > pageH - 16) {
    drawH = pageH - 16;
    drawW = drawH / imgRatio;
  }
  const offsetX = (pageW - drawW) / 2;
  const offsetY = (pageH - drawH) / 2;
  pdf.setFillColor(245, 247, 250);
  pdf.rect(0, 0, pageW, pageH, 'F');
  pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH);
  pdf.save(filename);
}
