import type { Orcamento } from '../types';
import {
  drawCard,
  drawBadgeIcon,
  wrapCanvasText,
  roundRect,
  loadImage,
  COMPANY_CONTACT,
  CompanyContactInfo,
  RED,
  RED_DARK,
  BG,
  CARD_BG,
  CARD_BORDER,
  TEXT_WHITE,
  TEXT_GRAY,
  TEXT_MUTED,
  FONT,
} from './receipt';

export interface OrcamentoRenderInput {
  orcamento: Orcamento;
  companyName: string;
  logoDarkUrl?: string | null;
  logoLightUrl?: string | null;
  companyContact?: Partial<CompanyContactInfo>;
}

const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  em_espera: 'Em Espera',
  aprovado: 'Aprovado',
  em_producao: 'Em Produção',
  concluido: 'Concluído — Venda Gerada',
  recusado: 'Recusado',
  cancelado: 'Cancelado',
  expirado: 'Expirado',
  encerrado: 'Encerrado',
};

function formatDocDateTime(dateIso: string | Date | undefined): { date: string; time: string; full: string } {
  if (!dateIso) return { date: '—', time: '—', full: '—' };
  const d = typeof dateIso === 'string' ? new Date(dateIso) : dateIso;
  if (isNaN(d.getTime())) return { date: '—', time: '—', full: '—' };
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return { date, time, full: `${date} • ${time}` };
}

export async function renderOrcamentoCanvas({
  orcamento: o,
  companyName,
  logoDarkUrl,
  logoLightUrl,
  companyContact,
}: OrcamentoRenderInput): Promise<HTMLCanvasElement> {
  const CONTACT: CompanyContactInfo = { ...COMPANY_CONTACT, ...(companyContact || {}) };

  // QR Code do site
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
  const targetLogoUrl = logoLightUrl || logoDarkUrl || null;
  if (targetLogoUrl) {
    try {
      logoImg = await loadImage(targetLogoUrl);
    } catch {
      logoImg = null;
    }
  }

  const scale = 2.5;
  const width = 680;
  const marginX = 26;
  const contentW = width - marginX * 2;
  const cardGap = 12;
  const halfW = (contentW - cardGap) / 2;

  const headerH = 104;
  const infoCardsH = 98;

  const items = o.items || [];
  const subtotalBrutoOrcamento = items.reduce((acc, i) => acc + (i.area ? i.price * i.area : i.price) * i.quantity, 0);
  const descontoOrcamento = o.desconto || 0;

  // Medição prévia dinâmica com canvas virtual
  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d')!;

  const descMaxW = 230;

  interface MeasuredOrcItem {
    titleLines: string[];
    subLines: string[];
    dimStr: string;
    linearSuffix: string;
    rowH: number;
  }

  const measuredItems: MeasuredOrcItem[] = items.map(item => {
    mctx.font = `900 11px ${FONT}`;
    const rawTitle = item.name.toUpperCase();
    const titleLines = wrapCanvasText(mctx, rawTitle, descMaxW, 3);

    let subDesc = '';
    if (item.observacao && item.observacao.trim()) {
      subDesc = item.observacao.trim();
    }

    mctx.font = `600 8.5px ${FONT}`;
    const subLines = subDesc ? wrapCanvasText(mctx, subDesc, descMaxW, 3) : [];

    const dimStr = item.dimensions || '';
    const linearSuffix = (!dimStr.toLowerCase().includes('linear') && !item.area && item.consumoEstoque)
      ? `(${Number(item.consumoEstoque).toFixed(2).replace('.', ',')}m linear)`
      : '';

    const contentH = (titleLines.length * 14) + (subLines.length > 0 ? 4 + subLines.length * 12 : 0);
    const rowH = Math.max(46, 12 + contentH + 12);

    return {
      titleLines: titleLines.length > 0 ? titleLines : [rawTitle],
      subLines,
      dimStr,
      linearSuffix,
      rowH,
    };
  });

  const itemRowHeights = measuredItems.length > 0 ? measuredItems.map(m => m.rowH) : [46];
  const tableContentH = itemRowHeights.reduce((a, b) => a + b, 0);
  const tableTotalH = 36 + tableContentH;

  const totalCardH = 120;
  const paymentCardH = 76;

  const pagamentoPosteriorTexto = o.pagamentoPosteriorAutorizado
    ? `Pagamento autorizado para ${o.pagamentoPosteriorData ? new Date(o.pagamentoPosteriorData).toLocaleDateString('pt-BR') : '-'}` +
      (o.pagamentoPosteriorDias ? ` (${o.pagamentoPosteriorDias} dias de prazo concedido)` : '') +
      (o.pagamentoPosteriorCondicao ? `. Condição: ${o.pagamentoPosteriorCondicao}` : '') +
      (o.pagamentoPosteriorResponsavel ? `. Autorizado por: ${o.pagamentoPosteriorResponsavel}.` : '.') +
      ' Esta condição é uma exceção expressamente registrada e não representa uma regra geral de pagamento.'
    : '';

  const clauses: { title: string; text: string }[] = [
    { title: 'Prazo de Produção/Entrega', text: (o.prazoProducao || '') + (o.prazoDataPrevista ? ` Data prevista de conclusão: ${new Date(o.prazoDataPrevista).toLocaleDateString('pt-BR')}.` : '') },
    { title: 'Prazo de Pagamento', text: o.prazoPagamentoTexto || '' },
    { title: 'Pagamento Posterior Autorizado (Exceção)', text: pagamentoPosteriorTexto },
    { title: 'Condição de Entrega/Retirada', text: o.condicaoEntregaTexto || '' },
    { title: 'Multa e Juros por Atraso', text: o.multaJurosTexto || '' },
    { title: 'Garantia do Serviço', text: o.garantiaTexto || '' },
    { title: 'Política de Cancelamento', text: o.politicaCancelamentoTexto || '' },
    ...(o.documentType === 'contrato' ? [{ title: 'Cláusulas Contratuais', text: o.clausulasContratoTexto || '' }] : []),
    { title: 'Observações', text: o.observacoes || '' },
  ].filter(c => c.text.trim().length > 0);

  mctx.font = `600 9.5px ${FONT}`;
  const clauseTextWidth = contentW - 48;
  const clauseBlocks = clauses.map(c => {
    const lines = wrapCanvasText(mctx, c.text, clauseTextWidth, 10);
    const h = 26 + lines.length * 15 + 14;
    return { ...c, lines, h };
  });
  const clausesTotalH = clauseBlocks.reduce((acc, b) => acc + b.h, 0);

  const acceptH = o.status === 'aprovado' || o.status === 'em_producao' || o.status === 'concluido' ? 52 : 0;
  const assinaturaH = o.documentType === 'contrato' ? 96 : 0;
  const footerCardH = 92;
  const bottomBannerH = 28;

  const height =
    24 +
    headerH + 12 +
    infoCardsH + 14 +
    tableTotalH + 14 +
    totalCardH + 14 +
    paymentCardH + 14 +
    (clausesTotalH > 0 ? clausesTotalH + 14 : 0) +
    (acceptH > 0 ? acceptH + 14 : 0) +
    (assinaturaH > 0 ? assinaturaH + 14 : 0) +
    footerCardH + 10 +
    bottomBannerH +
    26;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Fundo geral preto absoluto
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  let currentY = 24;

  // 1. CABEÇALHO COM FAIXA DIAGONAL VERMELHA E IDENTIDADE VISUAL DO RECIBO
  ctx.save();
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

  if (logoImg) {
    const maxLogoH = 68;
    const maxLogoW = 270;
    let logoW = (logoImg.width / logoImg.height) * maxLogoH;
    let logoH = maxLogoH;
    if (logoW > maxLogoW) {
      logoW = maxLogoW;
      logoH = (logoImg.height / logoImg.width) * maxLogoW;
    }
    const logoY = currentY + Math.max(0, (headerH - logoH) / 2);
    ctx.drawImage(logoImg, marginX, logoY, logoW, logoH);
  } else {
    const textStartX = marginX;
    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT_WHITE;
    ctx.font = `900 22px ${FONT}`;
    ctx.fillText('RAFA ARTS', textStartX, currentY + 22);
    ctx.fillStyle = TEXT_WHITE;
    ctx.font = `400 22px ${FONT}`;
    const brandW = ctx.measureText('RAFA ARTS ').width;
    ctx.fillText('GRAPHICS', textStartX + brandW - 2, currentY + 22);

    const lineY = currentY + 28;
    const lineW = 160;
    const rainbowGrad = ctx.createLinearGradient(textStartX, lineY, textStartX + lineW, lineY);
    rainbowGrad.addColorStop(0, '#FF2B2B');
    rainbowGrad.addColorStop(0.3, '#F59E0B');
    rainbowGrad.addColorStop(0.6, '#3B82F6');
    rainbowGrad.addColorStop(1, '#8B5CF6');
    ctx.fillStyle = rainbowGrad;
    ctx.fillRect(textStartX, lineY, lineW, 2);

    ctx.fillStyle = TEXT_WHITE;
    ctx.font = `800 10px ${FONT}`;
    ctx.fillText('COMUNICAÇÃO VISUAL', textStartX, currentY + 44);

    ctx.fillStyle = TEXT_GRAY;
    ctx.font = `700 6.8px ${FONT}`;
    ctx.fillText('IMPRESSÃO DIGITAL • ADESIVOS • FACHADAS • BANNERS • LONAS • ACM • PVC • ENVELOPAMENTO', textStartX, currentY + 58);
  }

  const docTitle = o.documentType === 'contrato' ? 'CONTRATO' : 'ORÇAMENTO';
  const docSubtitle = 'COMERCIAL';
  const docNum = o.numero || o.id.slice(-8).toUpperCase();
  const dateTimeObj = formatDocDateTime(o.createdAt);

  ctx.textAlign = 'right';
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `800 13px ${FONT}`;
  ctx.fillText(docTitle, width - marginX, currentY + 16);

  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 32px ${FONT}`;
  ctx.fillText(docSubtitle, width - marginX, currentY + 46);

  ctx.fillStyle = RED;
  ctx.font = `900 12px ${FONT}`;
  ctx.fillText('📄', width - marginX - ctx.measureText(`#${docNum}`).width - 18, currentY + 68);
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `800 12px ${FONT}`;
  ctx.fillText(`#${docNum}`, width - marginX, currentY + 68);

  ctx.fillStyle = RED;
  ctx.font = `900 10px ${FONT}`;
  const dtText = `${dateTimeObj.date}  •  ${dateTimeObj.time}`;
  ctx.fillText('📅', width - marginX - ctx.measureText(dtText).width - 16, currentY + 84);
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `700 9.5px ${FONT}`;
  ctx.fillText(dtText, width - marginX, currentY + 84);

  currentY += headerH + 12;

  // 3. CLIENTE + DADOS DO ORÇAMENTO (2 CARDS LADO A LADO)
  const clientCardX = marginX;
  const orderCardX = marginX + halfW + cardGap;

  // BLOCO CLIENTE
  drawCard(ctx, clientCardX, currentY, halfW, infoCardsH, 16);
  drawBadgeIcon(ctx, 'user', clientCardX + halfW - 28, currentY + 54, 'transparent', 'rgba(255, 255, 255, 0.03)', 30);
  drawBadgeIcon(ctx, 'user', clientCardX + 26, currentY + 26, RED, '#FFFFFF', 14);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `800 8.5px ${FONT}`;
  ctx.fillText('CLIENTE', clientCardX + 48, currentY + 29);

  const clienteNome = (o.customerName || 'Cliente').toUpperCase();
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 15px ${FONT}`;
  ctx.fillText(clienteNome.length > 25 ? clienteNome.slice(0, 25) + '…' : clienteNome, clientCardX + 22, currentY + 57);

  const phoneText = o.phone || '';
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

  // BLOCO DADOS DO ORÇAMENTO
  drawCard(ctx, orderCardX, currentY, halfW, infoCardsH, 16);
  drawBadgeIcon(ctx, 'doc', orderCardX + halfW - 28, currentY + 54, 'transparent', 'rgba(255, 255, 255, 0.03)', 30);
  drawBadgeIcon(ctx, 'doc', orderCardX + 26, currentY + 26, RED, '#FFFFFF', 14);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `800 8.5px ${FONT}`;
  ctx.fillText('DADOS DO DOCUMENTO', orderCardX + 48, currentY + 29);

  ctx.font = `700 10px ${FONT}`;
  ctx.fillStyle = TEXT_GRAY;
  ctx.fillText('Status:', orderCardX + 22, currentY + 54);

  const situacaoTexto = (STATUS_LABELS[o.status] || o.status).toUpperCase();
  const badgeW = ctx.measureText(situacaoTexto).width + 18;
  roundRect(ctx, orderCardX + 64, currentY + 43, badgeW, 16, 8);
  ctx.fillStyle = o.status === 'aprovado' || o.status === 'concluido' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 43, 43, 0.2)';
  ctx.fill();
  ctx.fillStyle = o.status === 'aprovado' || o.status === 'concluido' ? '#34D399' : RED;
  ctx.font = `900 8px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(situacaoTexto, orderCardX + 64 + badgeW / 2, currentY + 54.5);

  ctx.textAlign = 'left';
  ctx.font = `700 10px ${FONT}`;
  ctx.fillStyle = TEXT_GRAY;
  ctx.fillText('Responsável:', orderCardX + 22, currentY + 72);
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `800 10px ${FONT}`;
  ctx.fillText((o.responsavel || 'Geral').toUpperCase(), orderCardX + 94, currentY + 72);

  ctx.font = `700 10px ${FONT}`;
  ctx.fillStyle = TEXT_GRAY;
  ctx.fillText('Validade:', orderCardX + 22, currentY + 88);
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `700 10px ${FONT}`;
  const validadeTexto = o.validade ? new Date(o.validade + 'T00:00:00').toLocaleDateString('pt-BR') : 'Indeterminada';
  ctx.fillText(validadeTexto, orderCardX + 74, currentY + 88);

  currentY += infoCardsH + 14;

  // 4. TABELA DE ITENS
  drawBadgeIcon(ctx, 'list', marginX + 16, currentY + 12, RED, '#FFFFFF', 13);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 13px ${FONT}`;
  ctx.fillText('ITENS DA PROPOSTA', marginX + 36, currentY + 16.5);

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

  drawCard(ctx, marginX, currentY, contentW, tableContentH, 18, '#FFFFFF', 'transparent');

  let rowY = currentY;
  const renderItemCount = items.length > 0 ? items.length : 1;

  for (let i = 0; i < renderItemCount; i++) {
    const item = items[i];
    const mItem = measuredItems[i];
    const thisRowH = itemRowHeights[i] || 46;

    if (item && mItem) {
      const unitPriceBruto = item.area ? item.price * item.area : item.price;
      const subtotalBruto = unitPriceBruto * item.quantity;
      const fatiaDesconto = descontoOrcamento > 0 && subtotalBrutoOrcamento > 0 ? (subtotalBruto / subtotalBrutoOrcamento) * descontoOrcamento : 0;
      const subtotal = Math.max(0, subtotalBruto - fatiaDesconto);
      const unitPrice = item.quantity > 0 ? subtotal / item.quantity : subtotal;

      const numBadgeSize = 24;
      const badgeY = rowY + Math.min(11, Math.max(8, (thisRowH - numBadgeSize) / 2));
      roundRect(ctx, marginX + 16, badgeY, numBadgeSize, numBadgeSize, 8);
      ctx.fillStyle = '#151515';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1).padStart(2, '0'), marginX + 16 + numBadgeSize / 2, badgeY + 15);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#090909';
      ctx.font = `900 11px ${FONT}`;
      const titleStartY = rowY + 18;
      mItem.titleLines.forEach((tLine, tIdx) => {
        ctx.fillText(tLine, marginX + 56, titleStartY + tIdx * 14);
      });

      if (mItem.subLines.length > 0) {
        ctx.fillStyle = '#666666';
        ctx.font = `600 8.5px ${FONT}`;
        const subStartY = titleStartY + (mItem.titleLines.length - 1) * 14 + 15;
        mItem.subLines.forEach((sLine, sIdx) => {
          ctx.fillText(sLine, marginX + 56, subStartY + sIdx * 12);
        });
      }

      ctx.textAlign = 'left';
      const medidaX = marginX + 310;
      const medidaMaxW = 100;

      if (mItem.dimStr && mItem.linearSuffix) {
        ctx.fillStyle = '#111111';
        ctx.font = `700 9px ${FONT}`;
        ctx.fillText(mItem.dimStr, medidaX, rowY + 21, medidaMaxW);
        ctx.fillStyle = '#777777';
        ctx.font = `600 8px ${FONT}`;
        ctx.fillText(mItem.linearSuffix, medidaX, rowY + 33, medidaMaxW);
      } else if (mItem.dimStr || mItem.linearSuffix) {
        ctx.fillStyle = '#111111';
        ctx.font = `700 9.5px ${FONT}`;
        ctx.fillText(mItem.dimStr || mItem.linearSuffix, medidaX, rowY + 26, medidaMaxW);
      } else {
        ctx.fillStyle = '#999999';
        ctx.font = `600 9px ${FONT}`;
        ctx.fillText('—', medidaX, rowY + 26);
      }

      ctx.textAlign = 'right';
      ctx.fillStyle = '#444444';
      ctx.font = `700 10.5px ${FONT}`;
      ctx.fillText(`R$ ${unitPrice.toFixed(2).replace('.', ',')}`, width - marginX - 105, rowY + 26);

      ctx.fillStyle = '#090909';
      ctx.font = `900 11.5px ${FONT}`;
      ctx.fillText(`R$ ${subtotal.toFixed(2).replace('.', ',')}`, width - marginX - 18, rowY + 26);
    }

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

  // 5. TOTAL FINANCEIRO
  drawCard(ctx, marginX, currentY, contentW, totalCardH, 18);

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

  drawBadgeIcon(ctx, 'coins', marginX + 28, currentY + 36, RED, '#FFFFFF', 16);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 11px ${FONT}`;
  ctx.fillText('VALOR TOTAL DA PROPOSTA', marginX + 54, currentY + 40);

  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 38px ${FONT}`;
  ctx.fillText(`R$ ${(o.total || 0).toFixed(2).replace('.', ',')}`, marginX + 22, currentY + 82);

  roundRect(ctx, marginX + 22, currentY + 92, 60, 4, 2);
  ctx.fillStyle = RED;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marginX + halfW, currentY + 20);
  ctx.lineTo(marginX + halfW, currentY + totalCardH - 20);
  ctx.stroke();

  const finRightX = marginX + halfW + 24;
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText('Subtotal bruto', finRightX, currentY + 38);

  ctx.textAlign = 'right';
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 14px ${FONT}`;
  ctx.fillText(`R$ ${subtotalBrutoOrcamento.toFixed(2).replace('.', ',')}`, width - marginX - 22, currentY + 38);

  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText('Desconto aplicado', finRightX, currentY + 62);

  ctx.textAlign = 'right';
  ctx.fillStyle = descontoOrcamento > 0 ? '#F59E0B' : TEXT_WHITE;
  ctx.font = `900 14px ${FONT}`;
  ctx.fillText(descontoOrcamento > 0 ? `- R$ ${descontoOrcamento.toFixed(2).replace('.', ',')}` : 'R$ 0,00', width - marginX - 22, currentY + 62);

  currentY += totalCardH + 14;

  // 6. FORMA DE PAGAMENTO
  drawCard(ctx, marginX, currentY, contentW, paymentCardH, 16);
  drawBadgeIcon(ctx, 'money', marginX + 24, currentY + 24, RED, '#FFFFFF', 11);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `800 8.5px ${FONT}`;
  ctx.fillText('CONDIÇÃO DE PAGAMENTO', marginX + 44, currentY + 27);

  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `800 11px ${FONT}`;
  const pagamentoTexto = o.formaPagamentoTexto || 'A Combinar';
  ctx.fillText(pagamentoTexto, marginX + 24, currentY + 52);

  currentY += paymentCardH + 14;

  // 7. CLÁUSULAS E OBSERVAÇÕES
  if (clauseBlocks.length > 0) {
    for (const block of clauseBlocks) {
      drawCard(ctx, marginX, currentY, contentW, block.h, 16);
      drawBadgeIcon(ctx, 'info', marginX + 24, currentY + 22, RED, '#FFFFFF', 10);
      ctx.textAlign = 'left';
      ctx.fillStyle = TEXT_WHITE;
      ctx.font = `900 10.5px ${FONT}`;
      ctx.fillText(block.title.toUpperCase(), marginX + 44, currentY + 25.5);

      block.lines.forEach((line, idx) => {
        const itemY = currentY + 44 + idx * 15;
        ctx.fillStyle = '#DDDDDD';
        ctx.font = `600 9px ${FONT}`;
        ctx.fillText(line, marginX + 24, itemY, contentW - 48);
      });

      currentY += block.h + 14;
    }
  }

  // 8. APROVAÇÃO
  if (acceptH > 0) {
    drawCard(ctx, marginX, currentY, contentW, acceptH, 16, 'rgba(16, 185, 129, 0.15)', '#34D399');
    drawBadgeIcon(ctx, 'check', marginX + 26, currentY + 26, '#34D399', '#090909', 12);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#34D399';
    ctx.font = `900 11px ${FONT}`;
    const aprovadoData = o.aprovadoEm ? new Date(o.aprovadoEm).toLocaleString('pt-BR') : '';
    ctx.fillText(`ORÇAMENTO APROVADO POR ${(o.aprovadoPor || o.customerName || 'CLIENTE').toUpperCase()}${aprovadoData ? ' EM ' + aprovadoData : ''}`, marginX + 46, currentY + 30);
    currentY += acceptH + 14;
  }

  // 9. RODAPÉ COMPACTO
  drawCard(ctx, marginX, currentY, contentW, footerCardH, 16);

  const colY = currentY + 24;

  drawBadgeIcon(ctx, 'whatsapp', marginX + 26, colY + 18, RED, '#FFFFFF', 13);
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `700 8px ${FONT}`;
  ctx.fillText('WhatsApp', marginX + 46, colY + 12);
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 11.5px ${FONT}`;
  ctx.fillText(CONTACT.whatsapp, marginX + 46, colY + 28);

  drawBadgeIcon(ctx, 'insta', marginX + 170, colY + 18, RED, '#FFFFFF', 13);
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `700 8px ${FONT}`;
  ctx.fillText('Instagram', marginX + 190, colY + 12);
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `900 11.5px ${FONT}`;
  ctx.fillText(CONTACT.instagram, marginX + 190, colY + 28);

  drawBadgeIcon(ctx, 'pin', marginX + 338, colY + 18, RED, '#FFFFFF', 13);
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `700 8.5px ${FONT}`;
  ctx.fillText('Avenida Maracanã, nº 287', marginX + 358, colY + 12);
  ctx.fillStyle = TEXT_GRAY;
  ctx.font = `600 8px ${FONT}`;
  ctx.fillText('Elcione Barbalho, Santarém – PA', marginX + 358, colY + 24);

  if (qrImg) {
    const qrSize = 58;
    const qrX = width - marginX - 70;
    const qrY = currentY + 17;
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  currentY += footerCardH + 10;

  // Banner Final
  roundRect(ctx, marginX, currentY, contentW, bottomBannerH, 10);
  ctx.fillStyle = 'rgba(255, 43, 43, 0.12)';
  ctx.fill();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = TEXT_WHITE;
  ctx.font = `800 9px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('Este documento é uma proposta comercial e não constitui ordem de produção até aprovação formal.', width / 2, currentY + 17.5);

  return canvas;
}

export async function renderOrcamentoSimplesCanvas({ orcamento: o, companyName, logoDarkUrl, logoLightUrl, companyContact }: OrcamentoRenderInput): Promise<HTMLCanvasElement> {
  const pseudoOrder: any = {
    id: o.id || 'ORC-' + (o.numero || '0001'),
    companyId: '',
    customerId: o.clienteId,
    customerName: o.customerName || 'Cliente',
    customerPhone: o.phone,
    items: o.items || [],
    total: o.total || 0,
    subtotal: (o.items || []).reduce((acc, i) => acc + (i.area ? i.price * i.area : i.price) * i.quantity, 0),
    discountValue: o.desconto || 0,
    downPayment: o.entradaValor || 0,
    paymentMethod: o.formaPagamentoTexto || 'A Combinar',
    paymentStatus: 'pending',
    status: 'pending',
    serviceStatus: 'pedido_recebido',
    statusHistory: [],
    createdAt: o.createdAt || new Date().toISOString(),
    observacoes: o.observacoes,
    isOrcamento: true,
    documentTitle: 'ORÇAMENTO',
    validade: o.validade,
  };

  const { renderReceiptCanvas } = await import('./receipt');
  return renderReceiptCanvas({
    order: pseudoOrder,
    companyName: companyName || 'Rafa Arts Graphics',
    customerPhone: o.phone,
    customerCpf: o.cpfCnpj,
    customerAddress: o.address,
    responsavel: o.responsavel,
    logoLightUrl,
    logoDarkUrl,
    companyContact,
    isOrcamento: true,
    documentTitle: 'ORÇAMENTO',
    numeroDocumento: o.numero,
  });
}
