import type { SaleOrder } from '../types';

export interface ReceiptRenderInput {
  order: SaleOrder;
  companyName: string;
  customerPhone?: string;
}

// Desenha o comprovante de venda em um canvas (usado tanto para exportar PNG quanto PDF)
export function renderReceiptCanvas({ order, companyName, customerPhone }: ReceiptRenderInput): HTMLCanvasElement {
  const scale = 2; // maior resolução para ficar nítido ao imprimir/ampliar
  const width = 480;
  const lineHeight = 26;
  const total = order.total;
  const down = order.downPayment ?? order.receivedValue ?? (order.status === 'completed' ? total : 0);
  const balance = Math.max(0, total - down);
  const isPending = balance > 0 || order.status === 'pending';

  const items = order.items || [];
  // Altura dinâmica conforme quantidade de itens
  const height = 330 + items.length * lineHeight + (order.scheduledFor ? 30 : 0);

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Fundo
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#0f172a';

  let y = 36;
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(companyName.toUpperCase(), width / 2, y);
  y += 22;
  ctx.font = 'bold 11px monospace';
  ctx.fillText('COMPROVANTE DE PEDIDO / OS', width / 2, y);
  y += 16;
  ctx.font = '10px monospace';
  ctx.fillStyle = '#64748b';
  const dateStr = new Date(order.createdAt).toLocaleString('pt-BR');
  ctx.fillText(`Pedido #${order.id.slice(-8).toUpperCase()} - ${dateStr}`, width / 2, y);
  y += 14;

  // Linha tracejada
  const dashedLine = (yy: number) => {
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(24, yy);
    ctx.lineTo(width - 24, yy);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  dashedLine(y);
  y += 20;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`Cliente: ${order.customerName || 'Cliente de Balcão'}`, 24, y);
  y += 16;
  if (customerPhone) {
    ctx.font = '10px monospace';
    ctx.fillText(`Telefone: ${customerPhone}`, 24, y);
    y += 16;
  }
  if (order.scheduledFor) {
    ctx.font = '10px monospace';
    ctx.fillStyle = '#b45309';
    ctx.fillText(`Entrega agendada: ${new Date(order.scheduledFor).toLocaleString('pt-BR')}`, 24, y);
    ctx.fillStyle = '#0f172a';
    y += 16;
  }
  y += 6;
  dashedLine(y);
  y += 20;

  // Itens
  ctx.font = '11px monospace';
  items.forEach(item => {
    const subtotal = (item.area ? item.price * item.area : item.price) * item.quantity;
    const label = `${item.quantity}x ${item.name}`;
    const priceLabel = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    ctx.textAlign = 'left';
    ctx.fillText(label.length > 34 ? label.slice(0, 34) + '…' : label, 24, y);
    ctx.textAlign = 'right';
    ctx.fillText(priceLabel, width - 24, y);
    y += lineHeight;
  });

  dashedLine(y);
  y += 22;

  const totalsRow = (label: string, value: string, color = '#0f172a', bold = false) => {
    ctx.textAlign = 'left';
    ctx.font = bold ? 'bold 12px monospace' : '11px monospace';
    ctx.fillStyle = color;
    ctx.fillText(label, 24, y);
    ctx.textAlign = 'right';
    ctx.fillText(value, width - 24, y);
    y += 20;
  };

  totalsRow('TOTAL:', `R$ ${total.toFixed(2).replace('.', ',')}`, '#0f172a', true);
  totalsRow('ENTRADA RECEBIDA:', `R$ ${down.toFixed(2).replace('.', ',')}`, '#059669');
  if (isPending) {
    totalsRow('FALTA PAGAR:', `R$ ${balance.toFixed(2).replace('.', ',')}`, '#dc2626', true);
  } else {
    totalsRow('SITUAÇÃO:', 'QUITADO', '#059669', true);
  }

  y += 8;
  dashedLine(y);
  y += 24;
  ctx.textAlign = 'center';
  ctx.font = '10px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Obrigado pela preferência!', width / 2, y);

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
  // Converte px (a 2x escala) para mm mantendo proporção, largura fixa tipo cupom (80mm)
  const pdfWidthMm = 80;
  const pdfHeightMm = (canvas.height / canvas.width) * pdfWidthMm;
  const pdf = new jsPDF({ unit: 'mm', format: [pdfWidthMm, pdfHeightMm] });
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm);
  pdf.save(filename);
}
