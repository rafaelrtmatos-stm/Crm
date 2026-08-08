import type { SaleOrder } from '../types';

export interface ReceiptRenderInput {
  order: SaleOrder;
  companyName: string;
  customerPhone?: string;
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
  'Produção', 'Acabamento', 'Pronto', 'Entregue',
];

function getPipelineIndex(order: SaleOrder): number {
  if (order.status === 'completed') return 7;
  const down = order.downPayment ?? order.receivedValue ?? 0;
  if (down > 0) return 4;
  return 0;
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
export function renderReceiptCanvas({ order, companyName, customerPhone }: ReceiptRenderInput): HTMLCanvasElement {
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

  const headerH = 76;
  const pipelineH = 64;
  const infoCardsH = 92;
  const tableHeaderH = 32;
  const tableH = tableHeaderH + tableRows * rowHeight;
  const totalCardH = 150;
  const footerH = 90;
  const height = headerH + pipelineH + infoCardsH + tableH + totalCardH + footerH + 130;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  let y = 30;

  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT;
  ctx.font = `900 20px ${FONT}`;
  ctx.fillText(companyName.toUpperCase(), marginX, y + 8);
  ctx.font = `700 9px ${FONT}`;
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText('COMUNICAÇÃO VISUAL · IMPRESSÃO DIGITAL · ADESIVOS · FACHADAS · BANNERS', marginX, y + 24);

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
      ctx.beginPath();
      ctx.arc(cx, trackY, 5, 0, Math.PI * 2);
      ctx.fillStyle = done ? GREEN : CARD;
      ctx.fill();
      ctx.strokeStyle = done ? GREEN : BORDER;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = done ? TEXT : TEXT_FAINT;
      const label = PIPELINE_STAGES[i];
      ctx.fillText(label, cx, trackY + 20, trackW / stageCount - 4);
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

  const infoCard = (x: number, title: string, rows: string[]) => {
    drawCard(ctx, x, y, halfW, infoCardsH);
    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT_FAINT;
    ctx.font = `800 8px ${FONT}`;
    ctx.fillText(title.toUpperCase(), x + 16, y + 20);
    rows.forEach((line, i) => {
      ctx.font = i === 0 ? `800 12px ${FONT}` : `600 10px ${FONT}`;
      ctx.fillStyle = i === 0 ? TEXT : TEXT_DIM;
      ctx.fillText(line, x + 16, y + 42 + i * 17);
    });
  };
  const clienteRows = [order.customerName || 'Cliente de Balcão'];
  if (customerPhone) clienteRows.push(customerPhone);
  const pedidoRows = [
    order.status === 'completed' ? 'Situação: Finalizada' : order.status === 'canceled' ? 'Situação: Cancelada' : 'Situação: Aberta',
    order.scheduledFor ? `Previsão: ${new Date(order.scheduledFor).toLocaleString('pt-BR')}` : 'Sem entrega agendada',
  ];
  infoCard(marginX, 'Cliente', clienteRows);
  infoCard(marginX + halfW + cardGap, 'Dados da Ordem', pedidoRows);
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
  ctx.fillStyle = TEXT_FAINT;
  ctx.font = `800 8px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('RESUMO FINANCEIRO', marginX + 18, y + 22);

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
  const badgeW = ctx.measureText(badgeText).width + 24;
  roundRect(ctx, width - marginX - 18 - badgeW, y + totalCardH - 34, badgeW, 22, 11);
  ctx.fillStyle = badgeBg;
  ctx.fill();
  ctx.fillStyle = badgeColor;
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, width - marginX - 18 - badgeW / 2, y + totalCardH - 19);

  y += totalCardH + 26;

  ctx.textAlign = 'center';
  ctx.fillStyle = TEXT;
  ctx.font = 'italic 800 14px Georgia';
  ctx.fillText('Obrigado pela preferência!', width / 2, y);
  y += 20;
  ctx.font = `700 8.5px ${FONT}`;
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText('WhatsApp  ·  Instagram  ·  Facebook  ·  Site  ·  E-mail  ·  Endereço', width / 2, y);
  y += 18;
  ctx.font = `600 8px ${FONT}`;
  ctx.fillStyle = TEXT_FAINT;
  ctx.fillText('Produção inicia apenas após aprovação da arte  ·  Garantia de 90 dias  ·  Confira o material na retirada', width / 2, y);

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
