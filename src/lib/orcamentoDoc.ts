import type { Orcamento } from '../types';
import { drawBadgeIcon, COMPANY_CONTACT, CompanyContactInfo } from './receipt';

export interface OrcamentoRenderInput {
  orcamento: Orcamento;
  companyName: string;
  logoDarkUrl?: string | null;
  companyContact?: Partial<CompanyContactInfo>;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const BG = '#F5F7FA';
const CARD = '#FFFFFF';
const BORDER = '#E5E9F0';
const TEXT = '#111827';
const TEXT_DIM = '#6B7280';
const TEXT_FAINT = '#9CA3AF';
const ACCENT = '#2563EB';
const GREEN = '#16A34A';
const AMBER = '#D97706';
const FONT = 'Arial';

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
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = CARD;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
}

// Quebra texto em linhas que cabem em maxWidth, retorna array de linhas
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', em_producao: 'Em Produção',
  concluido: 'Concluído — Venda Gerada', recusado: 'Recusado', cancelado: 'Cancelado', expirado: 'Expirado',
};

export async function renderOrcamentoCanvas({ orcamento: o, companyName, logoDarkUrl, companyContact }: OrcamentoRenderInput): Promise<HTMLCanvasElement> {
  const CONTACT: CompanyContactInfo = { ...COMPANY_CONTACT, ...(companyContact || {}) };
  const scale = 2.5;
  const width = 640;
  const marginX = 28;

  let logoImg: HTMLImageElement | null = null;
  if (logoDarkUrl) {
    try { logoImg = await loadImage(logoDarkUrl); } catch { logoImg = null; }
  }

  let qrImg: HTMLImageElement | null = null;
  try {
    const QRCode = (await import('qrcode')).default;
    const qrDataUrl = await QRCode.toDataURL(CONTACT.siteUrl, { margin: 1, width: 200, color: { dark: TEXT, light: '#FFFFFF00' } });
    qrImg = await loadImage(qrDataUrl);
  } catch { qrImg = null; }

  // Primeiro passamos com um canvas de medição para calcular a altura total
  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d')!;

  const rowHeight = 30;
  const obsRowExtra = 14;
  const dimRowExtra = 12;
  const items = o.items || [];
  const tableRows = Math.max(items.length, 1);
  const rowHeights = Array.from({ length: tableRows }, (_, i) =>
    rowHeight + (items[i]?.observacao ? obsRowExtra : 0) + (items[i]?.dimensions ? dimRowExtra : 0)
  );
  const totalRowsHeight = rowHeights.reduce((a, b) => a + b, 0);
  const tableHeaderH = 30;
  const tableH = tableHeaderH + totalRowsHeight;

  const pagamentoPosteriorTexto = o.pagamentoPosteriorAutorizado
    ? `Pagamento autorizado para ${o.pagamentoPosteriorData ? new Date(o.pagamentoPosteriorData).toLocaleDateString('pt-BR') : '-'}` +
      (o.pagamentoPosteriorDias ? ` (${o.pagamentoPosteriorDias} dias de prazo concedido)` : '') +
      (o.pagamentoPosteriorCondicao ? `. Condição: ${o.pagamentoPosteriorCondicao}` : '') +
      (o.pagamentoPosteriorResponsavel ? `. Autorizado por: ${o.pagamentoPosteriorResponsavel}.` : '.') +
      ' Esta condição é uma exceção expressamente registrada e não representa uma regra geral de pagamento.'
    : '';

  const clauses: { title: string; text: string }[] = [
    { title: 'Prazo de Produção/Entrega', text: (o.prazoProducao || '') + (o.prazoDataPrevista ? ` Data prevista de conclusão: ${new Date(o.prazoDataPrevista).toLocaleDateString('pt-BR')}.` : '') },
    { title: 'Prazo de Pagamento (não é o mesmo que prazo de produção)', text: o.prazoPagamentoTexto || '' },
    { title: 'Pagamento Posterior Autorizado (exceção)', text: pagamentoPosteriorTexto },
    { title: 'Condição de Entrega/Retirada', text: o.condicaoEntregaTexto || '' },
    { title: 'Multa e Juros por Atraso', text: o.multaJurosTexto || '' },
    { title: 'Garantia do Serviço', text: o.garantiaTexto || '' },
    { title: 'Política de Cancelamento', text: o.politicaCancelamentoTexto || '' },
    ...(o.documentType === 'contrato' ? [{ title: 'Cláusulas Contratuais', text: o.clausulasContratoTexto || '' }] : []),
    { title: 'Observações', text: o.observacoes || '' },
  ].filter(c => c.text.trim().length > 0);

  mctx.font = `600 9.5px ${FONT}`;
  let clausesH = 0;
  const clauseTextWidth = width - marginX * 2 - 32;
  const clauseBlocks = clauses.map(c => {
    const lines = wrapText(mctx, c.text, clauseTextWidth);
    const h = 22 + lines.length * 13 + 14;
    clausesH += h;
    return { ...c, lines };
  });

  const headerH = 82;
  const infoCardsH = 104;
  const totalCardH = 96;
  const paymentCardH = 78;
  const acceptH = o.status === 'aprovado' || o.status === 'em_producao' || o.status === 'concluido' ? 46 : 0;
  const footerH = 220;
  const height = headerH + infoCardsH + 20 + tableH + 20 + totalCardH + 16 + paymentCardH + 20 + clausesH + acceptH + footerH + 60;

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
    const logoH = 40;
    const logoW = (logoImg.width / logoImg.height) * logoH;
    ctx.drawImage(logoImg, marginX, y - 8, logoW, logoH);
    textStartX = marginX + logoW + 14;
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT;
  ctx.font = `900 19px ${FONT}`;
  ctx.fillText(companyName.toUpperCase(), textStartX, y + 6);
  ctx.font = `700 8.5px ${FONT}`;
  ctx.fillStyle = TEXT_DIM;
  ctx.fillText('COMUNICAÇÃO VISUAL · IMPRESSÃO DIGITAL · ADESIVOS · FACHADAS · BANNERS', textStartX, y + 21);

  ctx.textAlign = 'right';
  ctx.fillStyle = ACCENT;
  ctx.font = `900 14px ${FONT}`;
  ctx.fillText(o.documentType === 'contrato' ? 'CONTRATO' : 'ORÇAMENTO', width - marginX, y + 6);
  ctx.fillStyle = TEXT_FAINT;
  ctx.font = `700 8.5px ${FONT}`;
  ctx.fillText(`Nº ${o.numero}  ·  ${new Date(o.createdAt).toLocaleDateString('pt-BR')}`, width - marginX, y + 21);
  const statusLabel = STATUS_LABELS[o.status] || o.status;
  const statusW = ctx.measureText(statusLabel).width + 20;
  ctx.font = `900 8px ${FONT}`;
  roundRect(ctx, width - marginX - statusW, y + 30, statusW, 18, 9);
  ctx.fillStyle = o.status === 'aprovado' || o.status === 'concluido' ? '#DCFCE7' : o.status === 'cancelado' || o.status === 'recusado' ? '#FEE2E2' : '#EFF6FF';
  ctx.fill();
  ctx.fillStyle = o.status === 'aprovado' || o.status === 'concluido' ? GREEN : o.status === 'cancelado' || o.status === 'recusado' ? '#DC2626' : ACCENT;
  ctx.textAlign = 'center';
  ctx.fillText(statusLabel.toUpperCase(), width - marginX - statusW / 2, y + 42);

  y += headerH;

  const halfW = (width - marginX * 2 - 14) / 2;
  const infoCard = (x: number, w: number, title: string, rows: string[], iconKind: string) => {
    drawCard(ctx, x, y, w, infoCardsH);
    drawBadgeIcon(ctx, iconKind, x + 20, y + 17, '#DBEAFE', ACCENT);
    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT_FAINT;
    ctx.font = `800 8px ${FONT}`;
    ctx.fillText(title.toUpperCase(), x + 36, y + 20);
    rows.forEach((line, i) => {
      ctx.font = i === 0 ? `800 12px ${FONT}` : `600 9.5px ${FONT}`;
      ctx.fillStyle = i === 0 ? TEXT : TEXT_DIM;
      ctx.fillText(line, x + 16, y + 44 + i * 16);
    });
  };
  const clienteRows = [o.customerName || '-'];
  if (o.cpfCnpj) clienteRows.push(`CPF/CNPJ: ${o.cpfCnpj}`);
  if (o.phone) clienteRows.push(o.phone);
  if (o.address) clienteRows.push(o.address);
  const orcamentoRows = [
    `Responsável: ${o.responsavel || '-'}`,
    o.validade ? `Válido até: ${new Date(o.validade + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Sem validade definida',
  ];
  infoCard(marginX, halfW, 'Cliente', clienteRows, 'user');
  infoCard(marginX + halfW + 14, halfW, 'Dados do Orçamento', orcamentoRows, 'doc');
  y += infoCardsH + 20;

  drawCard(ctx, marginX, y, width - marginX * 2, tableH);
  ctx.save();
  roundRect(ctx, marginX, y, width - marginX * 2, tableHeaderH, 12);
  ctx.clip();
  ctx.fillStyle = '#F9FAFB';
  ctx.fillRect(marginX, y, width - marginX * 2, tableHeaderH);
  ctx.restore();
  ctx.fillStyle = TEXT_FAINT;
  ctx.font = `800 8.5px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('QTD', marginX + 16, y + 19);
  ctx.fillText('DESCRIÇÃO', marginX + 60, y + 19);
  ctx.textAlign = 'right';
  ctx.fillText('VALOR UNIT.', width - marginX - 148, y + 19);
  ctx.fillText('SUBTOTAL', width - marginX - 16, y + 19);
  let rowY = y + tableHeaderH;
  for (let i = 0; i < tableRows; i++) {
    const item = items[i];
    const thisRowHeight = rowHeights[i];
    if (item) {
      const unitPrice = item.area ? item.price * item.area : item.price;
      const subtotal = unitPrice * item.quantity;
      ctx.textAlign = 'left';
      ctx.fillStyle = TEXT;
      ctx.font = `700 10px ${FONT}`;
      ctx.fillText(String(item.quantity), marginX + 16, rowY + 20);
      const nameLabel = item.name.length > 36 ? item.name.slice(0, 36) + '…' : item.name;
      ctx.font = `600 10px ${FONT}`;
      ctx.fillText(nameLabel, marginX + 60, rowY + 20);
      ctx.textAlign = 'right';
      ctx.fillStyle = TEXT_DIM;
      ctx.fillText(`R$ ${unitPrice.toFixed(2).replace('.', ',')}`, width - marginX - 148, rowY + 20);
      ctx.fillStyle = TEXT;
      ctx.font = `800 10px ${FONT}`;
      ctx.fillText(`R$ ${subtotal.toFixed(2).replace('.', ',')}`, width - marginX - 16, rowY + 20);
      let extraLineY = rowY + 32;
      if (item.dimensions) {
        ctx.textAlign = 'left';
        ctx.fillStyle = ACCENT;
        ctx.font = `700 8px ${FONT}`;
        ctx.fillText(`Medida: ${item.dimensions}`, marginX + 60, extraLineY);
        extraLineY += 12;
      }
      if (item.observacao) {
        ctx.textAlign = 'left';
        ctx.fillStyle = TEXT_FAINT;
        ctx.font = `italic 500 8px ${FONT}`;
        const obsLabel = item.observacao.length > 60 ? item.observacao.slice(0, 60) + '…' : item.observacao;
        ctx.fillText(`Obs: ${obsLabel}`, marginX + 60, extraLineY);
      }
    }
    if (i < tableRows - 1) {
      ctx.strokeStyle = BORDER;
      ctx.beginPath();
      ctx.moveTo(marginX + 16, rowY + thisRowHeight);
      ctx.lineTo(width - marginX - 16, rowY + thisRowHeight);
      ctx.stroke();
    }
    rowY += thisRowHeight;
  }
  y += tableH + 20;

  drawCard(ctx, marginX, y, width - marginX * 2, totalCardH);
  const itemsTotal = items.reduce((s, i) => s + (i.area ? i.price * i.area * i.quantity : i.price * i.quantity), 0);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_DIM;
  ctx.font = `600 9.5px ${FONT}`;
  ctx.fillText('Subtotal', marginX + 18, y + 26);
  ctx.textAlign = 'right';
  ctx.fillStyle = TEXT;
  ctx.font = `700 10.5px ${FONT}`;
  ctx.fillText(`R$ ${itemsTotal.toFixed(2).replace('.', ',')}`, width - marginX - 18, y + 26);
  if (o.desconto > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT_DIM;
    ctx.font = `600 9.5px ${FONT}`;
    ctx.fillText('Desconto', marginX + 18, y + 46);
    ctx.textAlign = 'right';
    ctx.fillStyle = AMBER;
    ctx.font = `700 10.5px ${FONT}`;
    ctx.fillText(`- R$ ${o.desconto.toFixed(2).replace('.', ',')}`, width - marginX - 18, y + 46);
  }
  ctx.strokeStyle = BORDER;
  ctx.beginPath();
  ctx.moveTo(marginX + 18, y + totalCardH - 34);
  ctx.lineTo(width - marginX - 18, y + totalCardH - 34);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = ACCENT;
  ctx.font = `900 10px ${FONT}`;
  ctx.fillText(o.documentType === 'contrato' ? 'VALOR DO CONTRATO' : 'TOTAL DO ORÇAMENTO', marginX + 18, y + totalCardH - 14);
  ctx.textAlign = 'right';
  ctx.fillStyle = TEXT;
  ctx.font = `900 20px ${FONT}`;
  ctx.fillText(`R$ ${o.total.toFixed(2).replace('.', ',')}`, width - marginX - 18, y + totalCardH - 10);
  y += totalCardH + 16;

  drawCard(ctx, marginX, y, width - marginX * 2, paymentCardH);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_FAINT;
  ctx.font = `800 8px ${FONT}`;
  ctx.fillText('FORMA DE PAGAMENTO', marginX + 16, y + 18);
  ctx.font = `600 9.5px ${FONT}`;
  ctx.fillStyle = TEXT;
  const payLines = wrapText(ctx, o.formaPagamentoTexto || '-', width - marginX * 2 - 32);
  payLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, marginX + 16, y + 34 + i * 13));
  if (o.entradaPercentual) {
    ctx.textAlign = 'right';
    ctx.fillStyle = GREEN;
    ctx.font = `800 10px ${FONT}`;
    const entradaVal = o.total * (o.entradaPercentual / 100);
    ctx.fillText(`Entrada sugerida: ${o.entradaPercentual}% (R$ ${entradaVal.toFixed(2).replace('.', ',')})`, width - marginX - 16, y + paymentCardH - 14);
  }
  y += paymentCardH + 20;

  clauseBlocks.forEach(block => {
    ctx.textAlign = 'left';
    ctx.fillStyle = ACCENT;
    ctx.font = `800 9px ${FONT}`;
    ctx.fillText(block.title.toUpperCase(), marginX, y);
    ctx.fillStyle = TEXT_DIM;
    ctx.font = `600 9.5px ${FONT}`;
    block.lines.forEach((line, i) => ctx.fillText(line, marginX, y + 15 + i * 13));
    y += 22 + block.lines.length * 13 + 14;
  });

  if (acceptH > 0) {
    roundRect(ctx, marginX, y, width - marginX * 2, 32, 8);
    ctx.fillStyle = '#DCFCE7';
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = GREEN;
    ctx.font = `900 10px ${FONT}`;
    const aprovadoData = o.aprovadoEm ? new Date(o.aprovadoEm).toLocaleString('pt-BR') : '';
    ctx.fillText(`ORÇAMENTO APROVADO POR ${(o.aprovadoPor || o.customerName || 'CLIENTE').toUpperCase()}${aprovadoData ? ' EM ' + aprovadoData : ''}`, width / 2, y + 20);
    y += acceptH;
  }

  const footerTop = y;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(marginX, y + 8); ctx.lineTo(marginX + 130, y + 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(width - marginX - 130, y + 8); ctx.lineTo(width - marginX, y + 8); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = ACCENT;
  ctx.font = 'italic 800 14px Georgia';
  ctx.fillText('Obrigado pela preferência!', width / 2, y + 13);
  ctx.font = `600 8px ${FONT}`;
  ctx.fillStyle = TEXT_FAINT;
  ctx.fillText('Este orçamento não constitui pedido em produção até a aprovação formal do cliente.', width / 2, y + 30);

  y += 38;
  ctx.textAlign = 'left';
  ctx.font = `800 8px ${FONT}`;
  ctx.fillStyle = TEXT_FAINT;
  ctx.fillText('FALE CONOSCO', marginX, y + 4);

  const colGap = 130;
  const contactItem = (icon: string, bg: string, fg: string, label: string, value: string, col: number, row: number) => {
    const ix = marginX + col * colGap;
    const iy = y + 24 + row * 32;
    drawBadgeIcon(ctx, icon, ix + 8, iy, bg, fg);
    ctx.textAlign = 'left';
    ctx.font = `700 7.5px ${FONT}`;
    ctx.fillStyle = TEXT_FAINT;
    ctx.fillText(label, ix + 20, iy - 4);
    ctx.font = `800 8.5px ${FONT}`;
    ctx.fillStyle = TEXT;
    ctx.fillText(value, ix + 20, iy + 8);
  };
  contactItem('whatsapp', '#DCFCE7', GREEN, 'WhatsApp', CONTACT.whatsapp, 0, 0);
  contactItem('insta', '#FCE7F3', '#DB2777', 'Instagram', CONTACT.instagram, 1, 0);
  contactItem('face', '#DBEAFE', ACCENT, 'Facebook', CONTACT.facebook, 0, 1);
  contactItem('mail', '#FEF3C7', AMBER, 'E-mail', CONTACT.email, 1, 1);
  drawBadgeIcon(ctx, 'globe', marginX + 8, y + 24 + 64, '#E0E7FF', '#4F46E5');
  ctx.textAlign = 'left';
  ctx.font = `700 7.5px ${FONT}`;
  ctx.fillStyle = TEXT_FAINT;
  ctx.fillText('Site', marginX + 20, y + 24 + 60);
  ctx.font = `800 8.5px ${FONT}`;
  ctx.fillStyle = TEXT;
  ctx.fillText(CONTACT.site, marginX + 20, y + 24 + 72);

  drawBadgeIcon(ctx, 'pin', marginX + 8, y + 24 + 96, '#FEE2E2', '#DC2626');
  ctx.font = `600 8px ${FONT}`;
  ctx.fillStyle = TEXT;
  ctx.fillText(CONTACT.endereco, marginX + 20, y + 24 + 99, width - 260);

  if (qrImg) {
    const qrSize = 78;
    const qrX = width - marginX - qrSize;
    const qrY = footerTop + 58;
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
    ctx.fillText(CONTACT.site, qrX + qrSize / 2, qrY + qrSize + 43);
  }

  const barY = footerTop + 185;
  roundRect(ctx, marginX, barY, width - marginX * 2, 24, 8);
  ctx.fillStyle = ACCENT;
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 8px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('Este documento é um orçamento e não substitui a Ordem de Serviço após aprovação.', width / 2, barY + 16);

  return canvas;
}
