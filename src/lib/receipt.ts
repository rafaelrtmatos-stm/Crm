import type { SaleOrder } from '../types';

export interface ReceiptRenderInput {
  order: SaleOrder;
  companyName: string;
  customerPhone?: string;
}

const GOLD = '#D4AF37';
const WHITE = '#FFFFFF';
const WHITE_DIM = 'rgba(255,255,255,0.55)';
const WHITE_FAINT = 'rgba(255,255,255,0.12)';
const GREEN = '#16A34A';
const RED = '#E11D48';
const BG = '#0D0D0F';
const CARD_BG = 'rgba(255,255,255,0.03)';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Desenha o comprovante de venda em um canvas (usado tanto para exportar PNG quanto PDF)
// Estilo "Nota de Serviço" premium: fundo preto, bordas douradas, cards de informação.
export function renderReceiptCanvas({ order, companyName, customerPhone }: ReceiptRenderInput): HTMLCanvasElement {
  const scale = 2.5;
  const width = 620;
  const rowHeight = 30;
  const total = order.total;
  const down = order.downPayment ?? order.receivedValue ?? (order.status === 'completed' ? total : 0);
  const balance = Math.max(0, total - down);
  const isPending = balance > 0 || order.status === 'pending';
  const items = order.items || [];
  const tableRows = Math.max(items.length, 3);

  const headerH = 130;
  const infoCardsH = 96;
  const tableHeaderH = 34;
  const tableH = tableHeaderH + tableRows * rowHeight;
  const totalsH = 140;
  const footerH = 130;
  const height = headerH + infoCardsH + tableH + totalsH + footerH + 60;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // ---------- Fundo preto com leve textura ----------
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = 0.035;
  for (let i = 0; i < height; i += 3) {
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i + 40);
    ctx.stroke();
  }
  ctx.restore();

  // Borda externa dourada arredondada
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  roundRect(ctx, 6, 6, width - 12, height - 12, 18);
  ctx.stroke();

  const marginX = 26;
  let y = 34;

  // ---------- Cabeçalho ----------
  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD;
  ctx.font = '900 22px Arial';
  ctx.fillText(companyName.toUpperCase(), marginX, y + 10);
  ctx.font = '700 9px Arial';
  ctx.fillStyle = WHITE_DIM;
  ctx.fillText('GRÁFICAS', marginX, y + 26);

  ctx.textAlign = 'right';
  ctx.fillStyle = WHITE;
  ctx.font = '900 16px Arial';
  ctx.fillText('NOTA DE SERVIÇO', width - marginX, y + 12);

  y += 48;

  // Cards de numero do pedido / data
  const halfW = (width - marginX * 2 - 12) / 2;
  const miniCard = (x: number, label: string, value: string) => {
    roundRect(ctx, x, y, halfW, 40, 10);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = WHITE_DIM;
    ctx.font = '700 8px Arial';
    ctx.fillText(label, x + 12, y + 16);
    ctx.fillStyle = WHITE;
    ctx.font = '900 12px Arial';
    ctx.fillText(value, x + 12, y + 31);
  };
  miniCard(marginX, 'Nº DO PEDIDO', `#${order.id.slice(-8).toUpperCase()}`);
  miniCard(marginX + halfW + 12, 'DATA E HORA', new Date(order.createdAt).toLocaleString('pt-BR'));

  y += 40 + 22;

  // ---------- Cards Cliente / Pedido ----------
  const infoCard = (x: number, title: string, lines: string[]) => {
    const h = 20 + lines.length * 15 + 10;
    roundRect(ctx, x, y, halfW, h, 10);
    ctx.fillStyle = CARD_BG;
    ctx.fill();
    ctx.strokeStyle = WHITE_FAINT;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.font = '900 9px Arial';
    ctx.fillText(title.toUpperCase(), x + 14, y + 18);
    ctx.fillStyle = WHITE;
    ctx.font = '600 10.5px Arial';
    lines.forEach((line, i) => {
      ctx.fillText(line, x + 14, y + 34 + i * 15);
    });
    return h;
  };
  const clienteLines = [order.customerName || 'Cliente de Balcão'];
  if (customerPhone) clienteLines.push(customerPhone);
  const pedidoLines = [order.status === 'completed' ? 'Status: Concluído' : 'Status: Em Aberto'];
  if (order.scheduledFor) pedidoLines.push(`Entrega: ${new Date(order.scheduledFor).toLocaleString('pt-BR')}`);
  const cardH = Math.max(
    infoCard(marginX, 'Cliente', clienteLines),
    infoCard(marginX + halfW + 12, 'Pedido', pedidoLines)
  );
  y += cardH + 24;

  // ---------- Tabela de itens ----------
  const tableTop = y;
  roundRect(ctx, marginX, y, width - marginX * 2, tableHeaderH, 8);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.fillStyle = '#0D0D0F';
  ctx.font = '900 9.5px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('QTD', marginX + 14, y + 22);
  ctx.fillText('DESCRIÇÃO DO SERVIÇO', marginX + 70, y + 22);
  ctx.textAlign = 'right';
  ctx.fillText('VALOR UNIT.', width - marginX - 140, y + 22);
  ctx.fillText('VALOR TOTAL', width - marginX - 14, y + 22);
  y += tableHeaderH;

  // Watermark "RAFA" atrás da tabela
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = GOLD;
  ctx.font = '900 90px Arial';
  ctx.textAlign = 'center';
  ctx.translate(width / 2, y + (tableRows * rowHeight) / 2);
  ctx.rotate(-0.35);
  ctx.fillText('RAFA', 0, 0);
  ctx.restore();

  for (let i = 0; i < tableRows; i++) {
    const rowY = y + i * rowHeight;
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(marginX, rowY, width - marginX * 2, rowHeight);
    }
    const item = items[i];
    if (item) {
      const unitPrice = item.area ? item.price * item.area : item.price;
      const subtotal = unitPrice * item.quantity;
      ctx.textAlign = 'left';
      ctx.fillStyle = WHITE;
      ctx.font = '700 10px Arial';
      ctx.fillText(String(item.quantity), marginX + 14, rowY + 20);
      const nameLabel = item.name.length > 30 ? item.name.slice(0, 30) + '…' : item.name;
      ctx.font = '600 10px Arial';
      ctx.fillText(nameLabel, marginX + 70, rowY + 20);
      ctx.textAlign = 'right';
      ctx.fillStyle = WHITE_DIM;
      ctx.fillText(`R$ ${unitPrice.toFixed(2).replace('.', ',')}`, width - marginX - 140, rowY + 20);
      ctx.fillStyle = WHITE;
      ctx.font = '700 10px Arial';
      ctx.fillText(`R$ ${subtotal.toFixed(2).replace('.', ',')}`, width - marginX - 14, rowY + 20);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginX, rowY + rowHeight);
    ctx.lineTo(width - marginX, rowY + rowHeight);
    ctx.stroke();
  }
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1;
  roundRect(ctx, marginX, tableTop, width - marginX * 2, tableHeaderH + tableRows * rowHeight, 8);
  ctx.stroke();
  y += tableRows * rowHeight + 26;

  // ---------- Totais (esquerda dourado / direita verde) ----------
  const totalsCard = (x: number, title: string, rows: [string, string, string?][]) => {
    const h = 24 + rows.length * 20 + 10;
    roundRect(ctx, x, y, halfW, h, 10);
    ctx.fillStyle = CARD_BG;
    ctx.fill();
    ctx.strokeStyle = WHITE_FAINT;
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.font = '900 9px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(title.toUpperCase(), x + 14, y + 20);
    rows.forEach(([label, value, color], i) => {
      const rowY = y + 40 + i * 20;
      ctx.textAlign = 'left';
      ctx.fillStyle = WHITE_DIM;
      ctx.font = '600 9.5px Arial';
      ctx.fillText(label, x + 14, rowY);
      ctx.textAlign = 'right';
      ctx.fillStyle = color || WHITE;
      ctx.font = '900 11px Arial';
      ctx.fillText(value, x + halfW - 14, rowY);
    });
    return h;
  };

  const leftRows: [string, string, string?][] = [
    ['Total dos Serviços', `R$ ${total.toFixed(2).replace('.', ',')}`, GOLD],
    ['Desconto', 'R$ 0,00'],
    ['Total Geral', `R$ ${total.toFixed(2).replace('.', ',')}`, GOLD],
  ];
  const rightRows: [string, string, string?][] = [
    ['Entrada Recebida', `R$ ${down.toFixed(2).replace('.', ',')}`, GREEN],
    ['Forma de Pagamento', (order.paymentMethod || '-').toUpperCase()],
    ['Situação', isPending ? `FALTA R$ ${balance.toFixed(2).replace('.', ',')}` : 'QUITADO', isPending ? RED : GREEN],
  ];
  const totalsCardH = Math.max(
    totalsCard(marginX, 'Resumo Financeiro', leftRows),
    totalsCard(marginX + halfW + 12, 'Pagamento', rightRows)
  );
  y += totalsCardH + 30;

  // ---------- Rodapé ----------
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = 'italic 900 15px Georgia';
  ctx.fillText('Obrigado pela preferência!', width / 2, y);
  y += 22;

  ctx.font = '700 8.5px Arial';
  ctx.fillStyle = WHITE_DIM;
  ctx.fillText('WhatsApp • Instagram • Website • E-mail', width / 2, y);
  y += 18;

  ctx.font = '600 8px Arial';
  ctx.fillStyle = WHITE_DIM;
  const services = 'Comunicação Visual · Impressão Digital · Personalizados · Fachadas · Adesivos · Banners · Lonas · Envelopamento';
  ctx.fillText(services, width / 2, y);

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
  // Layout vertical tipo A4: centraliza a imagem mantendo proporção
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgRatio = canvas.height / canvas.width;
  let drawW = pageW - 20;
  let drawH = drawW * imgRatio;
  if (drawH > pageH - 20) {
    drawH = pageH - 20;
    drawW = drawH / imgRatio;
  }
  const offsetX = (pageW - drawW) / 2;
  const offsetY = (pageH - drawH) / 2;
  pdf.setFillColor(13, 13, 15);
  pdf.rect(0, 0, pageW, pageH, 'F');
  pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH);
  pdf.save(filename);
}
