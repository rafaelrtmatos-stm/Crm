// Gera um PDF limpo com o texto do contrato (paginacao automatica), mais apropriado
// pra um documento juridico do que o estilo colorido do recibo/orcamento.
//
// IMPORTANTE: essa geracao so deve ser usada em dois momentos:
//  1) preview de contrato ainda em rascunho/nao assinado (o PDF pode variar, ainda nao existe
//     nada "definitivo" pra guardar);
//  2) UMA UNICA VEZ, no exato instante em que o contrato e' assinado (ver signContract em
//     otpUtils.ts), pra gerar o arquivo que sera enviado ao Supabase Storage e passa a ser
//     A FONTE DA VERDADE pros downloads seguintes.
// Depois de assinado, o download (painel Admin e tela publica /assinar/:id) deve sempre puxar
// o arquivo ja salvo (contrato.pdfUrl) em vez de chamar essas funcoes de novo -- se chamasse de
// novo toda vez, uma mudanca futura no layout/fonte faria o PDF de um contrato antigo sair
// diferente do que o cliente efetivamente assinou, mesmo com o hash SHA-256 batendo.

// Dados da assinatura eletrônica avançada (OTP validado). O resumo (data + IP + hash) continua
// impresso no rodapé de TODAS as páginas quando o contrato já foi assinado; além disso, o bloco
// completo de auditoria (cliente + empresa) é inserido automaticamente logo abaixo do nome de
// cada parte na página de assinaturas, ao final do contrato (ver injetarCarimbosDeAssinatura).
// Opcional: PDFs de contratos ainda não assinados continuam sendo gerados normalmente, sem isso.
export interface AuditStamp {
  signedAt: string;     // ISO string — instante em que o cliente validou o token e assinou
  signerIp: string;
  signerLocation?: string; // cidade/regiao/pais aproximados via IP (ver getIpLocation)
  documentHash: string;
  signatureLink?: string;        // link exclusivo de assinatura deste contrato (/assinar/:id)
  signatureMethodLabel?: string; // ex: "Token OTP"
  clienteCpfCnpj?: string;
  clientePhone?: string;
  contratanteSignatureId: string; // ID EXCLUSIVO da assinatura do CONTRATANTE — nunca reaproveitado
  empresaRazaoSocial: string;
  empresaNomeFantasia?: string;
  empresaCnpj: string;
  empresaValidatedAt: string; // ISO string — instante em que o operador confirmou a assinatura da empresa
  empresaOrigin: string;      // ex: "pro.rafaartsgraphics.com.br"
  empresaSignedByName?: string; // nome de quem confirmou a assinatura da empresa (login + senha)
  contratadoSignatureId: string; // ID EXCLUSIVO da assinatura do CONTRATADO(A) — nunca reaproveitado
}

// Mascara CPF/CNPJ pra exibicao no carimbo visual (privacidade) -- mantem so os primeiros e os
// ultimos digitos visiveis (ex: CPF "123.***.***-00", CNPJ "12.***.***-0001-40"). Espera o valor
// ja formatado (com pontuacao) ou so digitos; funciona nos dois casos.
export function maskCpfCnpj(value: string): string {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length === 11) {
    // CPF: 123.***.***-00
    return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`;
  }
  if (digits.length === 14) {
    // CNPJ: 12.***.***/****-40
    return `${digits.slice(0, 2)}.***.***/****-${digits.slice(12, 14)}`;
  }
  return value; // formato desconhecido -- devolve como veio em vez de quebrar o layout
}

import { PUBLIC_SIGN_ORIGIN } from './companyIdentity';

/** Nome do sistema exibido na declaração de autenticidade impressa no carimbo ("Assinado eletronicamente via ..."). */
export const SIGNATURE_SYSTEM_NAME = PUBLIC_SIGN_ORIGIN;

/** Monta o nome de arquivo padrao usado tanto no download direto quanto no path do Storage. */
export function contratoPdfFileName(numero: string, customerName: string): string {
  const nomeArquivo = customerName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'cliente';
  return `${numero}_${nomeArquivo}.pdf`;
}

// =====================================================================================
// CARIMBO DIGITAL DE ASSINATURA ELETRÔNICA — "DigitalSignatureStamp"
// =====================================================================================
// Componente visual único e reutilizável. Recebe os dados de UMA assinatura e desenha UM
// carimbo. É chamado exatamente 2 vezes por documento (nunca mais, nunca menos): uma para a
// assinatura do CONTRATANTE, outra para a assinatura do CONTRATADO(A) — ver
// injetarCarimbosDeAssinatura (loop abaixo, em buildContratoPdfDoc). Os dois usam o MESMO
// layout/estilo; só os dados internos mudam entre eles (regra de design: um único modelo
// visual, dados sempre isolados por assinatura — nunca reaproveitados entre as duas partes).

interface DigitalSignatureStampData {
  signerName: string;
  cpfCnpj: string;
  dateStr: string;         // já formatado, ex: "22/08/2026"
  timeStr: string;         // já formatado, com fuso, ex: "17:42:18 (UTC-3)"
  signatureId: string;     // ID EXCLUSIVO desta assinatura — nunca repete entre CONTRATANTE/CONTRATADO(A)
  hash: string;
  validationUrl: string;   // URL que o QR Code deste carimbo especificamente valida
  location?: string;       // localizacao aproximada (cidade/regiao/pais) no momento da assinatura
}

/** Formata data/hora em pt-BR já com o sufixo de fuso horário local, ex: "24/08/2026 19:17:40 (UTC-3)". */
function formatDateTimeWithTz(iso: string): { dateStr: string; timeStr: string } {
  const dt = new Date(iso);
  const offsetMin = -dt.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const offsetH = Math.floor(Math.abs(offsetMin) / 60);
  const tzLabel = `UTC${sign}${offsetH}`;
  return {
    dateStr: dt.toLocaleDateString('pt-BR'),
    timeStr: `${dt.toLocaleTimeString('pt-BR')} (${tzLabel})`,
  };
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const STAMP_COLORS = {
  azulPrincipal: hexToRgb('#0D376B'),
  azulSecundario: hexToRgb('#164A82'),
  verdeValidacao: hexToRgb('#18A544'),
  cinzaTexto: hexToRgb('#3F4D63'),
  branco: hexToRgb('#FFFFFF'),
};

/** Desenha um pequeno "escudo" com marca de verificação (check) dentro — usado no painel esquerdo (branco sobre azul) e no bloco de integridade (verde). */
function drawShieldCheck(doc: any, cx: number, cy: number, r: number, shieldRgb: number[], checkRgb: number[], lw = 0.45) {
  doc.setFillColor(shieldRgb[0], shieldRgb[1], shieldRgb[2]);
  doc.circle(cx, cy, r, 'F');
  doc.setDrawColor(checkRgb[0], checkRgb[1], checkRgb[2]);
  doc.setLineWidth(lw);
  doc.line(cx - r * 0.45, cy, cx - r * 0.1, cy + r * 0.4);
  doc.line(cx - r * 0.1, cy + r * 0.4, cx + r * 0.5, cy - r * 0.35);
}

/** Cadeado simples (retângulo + arco) — usado no bloco "documento protegido". */
function drawLockIcon(doc: any, cx: number, cy: number, size: number, rgb: number[], lw = 0.4) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(lw);
  doc.roundedRect(cx - size / 2, cy - size * 0.1, size, size * 0.7, size * 0.06, size * 0.06, 'D');
  doc.circle(cx, cy - size * 0.35, size * 0.32, 'D');
}

/** Calendário simples — usado no bloco de data. */
function drawCalendarIcon(doc: any, cx: number, cy: number, size: number, rgb: number[], lw = 0.35) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(lw);
  doc.roundedRect(cx - size / 2, cy - size / 2, size, size, size * 0.06, size * 0.06, 'D');
  doc.line(cx - size / 2, cy - size * 0.15, cx + size / 2, cy - size * 0.15);
}

/** Relógio simples — usado no bloco de hora. */
function drawClockIcon(doc: any, cx: number, cy: number, size: number, rgb: number[], lw = 0.35) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(lw);
  doc.circle(cx, cy, size / 2, 'D');
  doc.line(cx, cy, cx, cy - size * 0.32);
  doc.line(cx, cy, cx + size * 0.25, cy);
}

/** Impressão digital simplificada (arcos concêntricos) — usada no bloco de ID da assinatura. */
function drawFingerprintIcon(doc: any, cx: number, cy: number, size: number, rgb: number[], lw = 0.3) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(lw);
  doc.ellipse(cx, cy, size * 0.5, size * 0.42, 'D');
  doc.ellipse(cx, cy, size * 0.32, size * 0.27, 'D');
  doc.ellipse(cx, cy, size * 0.14, size * 0.12, 'D');
}

/** Avatar circular simplificado (silhueta de pessoa) — identificação do assinante. */
function drawAvatarIcon(doc: any, cx: number, cy: number, r: number) {
  doc.setFillColor(...STAMP_COLORS.azulSecundario);
  doc.circle(cx, cy, r, 'F');
  doc.setFillColor(...STAMP_COLORS.branco);
  doc.circle(cx, cy - r * 0.32, r * 0.32, 'F');
  doc.ellipse(cx, cy + r * 0.55, r * 0.5, r * 0.32, 'F');
}


/**
 * Gera a imagem do QR Code (dataURL PNG) para a URL de validação específica desta assinatura.
 * Cada carimbo chama isso com sua PRÓPRIA validationUrl — nunca um QR único compartilhado.
 */
async function generateQrDataUrl(text: string): Promise<string | null> {
  try {
    const QRCode = (await import('qrcode')).default;
    // width maior (QR agora é impresso em ~180px/47.6mm — sobe a resolução da fonte pra não ficar borrado)
    return await QRCode.toDataURL(text, { margin: 0, width: 480, color: { dark: '#0D376B', light: '#FFFFFF' } });
  } catch (e) {
    console.warn('Falha ao gerar QR Code do carimbo:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------------------
// Dimensões do carimbo. O layout inteiro (moldura, painel, ícones, textos e QR Code) foi
// desenhado originalmente pra uma largura de referência (REFERENCE_WIDTH); pra mudar o
// tamanho final SEM distorcer as proporções, escalamos TODOS os valores do desenho pelo
// mesmo fator (STAMP_SCALE) — largura, altura, ícones, espessura de linha e fonte.
// ---------------------------------------------------------------------------------------
const PX_TO_MM = 25.4 / 96; // conversão px -> mm a 96dpi (padrão web)
const REFERENCE_WIDTH = 700 * PX_TO_MM; // ≈ 185.2mm — largura em que o desenho foi projetado

const STAMP_WIDTH = 70; // mm — largura final fixa do carimbo (exatamente 7cm, pedido do usuário)
const STAMP_SCALE = STAMP_WIDTH / REFERENCE_WIDTH; // fator aplicado a todo o desenho (proporcional)

// QR Code e altura do carimbo escalados pelo MESMO fator, preservando a proporção original
// (QR ≈47.6mm e altura ≈59.6mm na referência de 185.2mm de largura).
// QR reduzido (156 em vez de 180) pra caber, junto com a legenda "Escaneie o QR Code" logo
// abaixo dele, dentro da moldura azul do selo — antes o texto ultrapassava a borda inferior.
const QR_SIZE = 156 * PX_TO_MM * STAMP_SCALE;      // ≈ 15.6mm
const STAMP_HEIGHT = (180 * PX_TO_MM + 5) * STAMP_SCALE; // ≈ 19.7mm (reduzida p/ caber em 2 páginas)

/**
 * Desenha UM carimbo digital completo (estrutura fixa do modelo — só os dados mudam):
 * painel institucional à esquerda ("ASSINADO ELETRONICAMENTE, COM VALIDADE JURÍDICA" + base
 * legal), identificação do assinante, data/hora/ID, bloco de integridade verificada, hash
 * SHA-256, bloco de proteção do documento e QR Code de validação exclusivo desta assinatura.
 */
async function drawDigitalSignatureStamp(
  doc: any,
  yStart: number,
  marginX: number,
  pageW: number,
  data: DigitalSignatureStampData
): Promise<number> {
  const u = (n: number) => n * STAMP_SCALE; // aplica a escala proporcional (tamanhos e posições)

  const y0 = yStart + u(1.5);
  const w = STAMP_WIDTH;
  const x0 = (pageW - w) / 2; // carimbo centralizado na página, largura fixa em 7cm
  const h = STAMP_HEIGHT;

  // ---- Moldura externa (borda azul arredondada, fundo branco) ----
  doc.setFillColor(...STAMP_COLORS.branco);
  doc.setDrawColor(...STAMP_COLORS.azulPrincipal);
  doc.setLineWidth(u(0.55));
  doc.roundedRect(x0, y0, w, h, u(2.5), u(2.5), 'FD');

  // ---- Painel institucional esquerdo (fundo azul sólido) ----
  const painelW = u(34);
  doc.setFillColor(...STAMP_COLORS.azulPrincipal);
  doc.rect(x0 + u(0.6), y0 + u(0.6), painelW - u(0.6), h - u(1.2), 'F');

  const painelCx = x0 + u(0.6) + (painelW - u(0.6)) / 2;
  drawShieldCheck(doc, painelCx, y0 + u(7.5), u(4.2), STAMP_COLORS.branco, STAMP_COLORS.verdeValidacao);

  doc.setTextColor(...STAMP_COLORS.branco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(8));
  doc.text('ASSINADO', painelCx, y0 + u(14.5), { align: 'center' });
  doc.setFontSize(u(6));
  doc.text('ELETRONICAMENTE', painelCx, y0 + u(17.8), { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(u(5.2));
  doc.text('COM VALIDADE JURÍDICA', painelCx, y0 + u(21), { align: 'center' });

  doc.setDrawColor(...STAMP_COLORS.branco);
  doc.setLineWidth(u(0.15));
  doc.line(x0 + u(4), y0 + u(24), x0 + painelW - u(4), y0 + u(24));

  doc.setFontSize(u(6));
  doc.text('MP 2.200-2/2001', painelCx, y0 + u(27.6), { align: 'center' });
  doc.text('LEI 14.063/2020', painelCx, y0 + u(32), { align: 'center' });

  // Declaração de autenticidade — sistema que processou a assinatura eletrônica.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(u(4.4));
  const declaracao = doc.splitTextToSize(`Assinado eletronicamente via ${SIGNATURE_SYSTEM_NAME}`, painelW - u(4));
  doc.text(declaracao, painelCx, y0 + u(36.5), { align: 'center' });

  // ---- Área de conteúdo (direita do painel, deixando espaço pro QR Code) ----
  const qrSize = QR_SIZE;
  const contentX = x0 + painelW + u(4);
  const contentRight = x0 + w - qrSize - u(5);
  const contentW = contentRight - contentX;

  // Identificação do assinante (avatar + nome + CPF/CNPJ)
  drawAvatarIcon(doc, contentX + u(3.2), y0 + u(7), u(3.2));
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(5.5));
  doc.text('ASSINANTE', contentX + u(8), y0 + u(4.5));
  doc.setFontSize(u(8.2));
  const nomeWrapped = doc.splitTextToSize(data.signerName, contentW - u(8));
  doc.text(nomeWrapped[0], contentX + u(8), y0 + u(8.2));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(u(6.5));
  doc.text(data.cpfCnpj, contentX + u(8), y0 + u(11.8));
  if (data.location) {
    doc.setFontSize(u(5));
    doc.setTextColor(120, 126, 138);
    doc.text(`Local aprox.: ${data.location}`, contentX + u(8), y0 + u(14));
  }

  doc.setDrawColor(220, 224, 232);
  doc.setLineWidth(u(0.15));
  doc.line(contentX, y0 + u(14.5), contentRight, y0 + u(14.5));

  // Data / Hora / ID da assinatura — três colunas
  const colW = contentW / 3;
  const iconY = y0 + u(19);
  const labelY = y0 + u(22.2);
  const valueY = y0 + u(25.4);

  drawCalendarIcon(doc, contentX + u(2.2), iconY, u(3), STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(4.8));
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('DATA', contentX + u(5), labelY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(u(6.3));
  doc.setTextColor(30, 34, 44);
  doc.text(data.dateStr, contentX + u(5), valueY);

  drawClockIcon(doc, contentX + colW + u(2.2), iconY, u(3), STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(4.8));
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('HORA', contentX + colW + u(5), labelY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(u(6.3));
  doc.setTextColor(30, 34, 44);
  doc.text(data.timeStr, contentX + colW + u(5), valueY);

  drawFingerprintIcon(doc, contentX + colW * 2 + u(2.2), iconY, u(3.4), STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(4.8));
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('ID DA ASSINATURA', contentX + colW * 2 + u(5), labelY);
  doc.setFont('courier', 'normal');
  doc.setFontSize(u(5.6));
  doc.setTextColor(30, 34, 44);
  doc.text(data.signatureId, contentX + colW * 2 + u(5), valueY);

  doc.setDrawColor(220, 224, 232);
  doc.line(contentX, y0 + u(27.5), contentRight, y0 + u(27.5));

  // Integridade do documento — verificada (escudo verde)
  drawShieldCheck(doc, contentX + u(2.2), y0 + u(31), u(2.4), STAMP_COLORS.verdeValidacao, STAMP_COLORS.branco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(6.6));
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('INTEGRIDADE DO DOCUMENTO', contentX + u(6), y0 + u(30.2));
  doc.setTextColor(...STAMP_COLORS.verdeValidacao);
  doc.setFontSize(u(6.6));
  doc.text('VERIFICADA', contentX + u(6), y0 + u(33.6));

  // Hash SHA-256
  doc.setFillColor(...STAMP_COLORS.azulSecundario);
  doc.circle(contentX + u(2.2), y0 + u(37.2), u(2.2), 'F');
  doc.setTextColor(...STAMP_COLORS.branco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(5));
  doc.text('#', contentX + u(2.2), y0 + u(38), { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(5.6));
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('HASH SHA-256', contentX + u(6), y0 + u(36.3));
  doc.setFont('courier', 'normal');
  doc.setTextColor(60, 64, 74);
  // Hash completo (sem truncar) — reduz a fonte até caber em no máx. 2 linhas na largura
  // disponível do painel de conteúdo.
  const hashMaxWidth = contentRight - (contentX + u(6));
  let hashFontSize = u(5.8);
  doc.setFontSize(hashFontSize);
  let hashLines: string[] = doc.splitTextToSize(data.hash, hashMaxWidth);
  while (hashLines.length > 2 && hashFontSize > u(4)) {
    hashFontSize -= u(0.2);
    doc.setFontSize(hashFontSize);
    hashLines = doc.splitTextToSize(data.hash, hashMaxWidth);
  }
  if (hashLines.length <= 1) {
    doc.text(hashLines[0] || data.hash, contentX + u(6), y0 + u(39.7));
  } else {
    doc.text(hashLines[0], contentX + u(6), y0 + u(38.8));
    doc.text(hashLines[1], contentX + u(6), y0 + u(41.2));
  }

  // Documento protegido
  drawLockIcon(doc, contentX + u(2.2), y0 + u(43), u(3), STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(5.6));
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('DOCUMENTO PROTEGIDO', contentX + u(6), y0 + u(42));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(u(5.1));
  doc.setTextColor(120, 126, 138);
  doc.text('Contra alterações após a assinatura', contentX + u(6), y0 + u(44.9));

  // QR Code (canto superior direito) — valida especificamente ESTA assinatura
  const qrX = x0 + w - qrSize - u(3);
  const qrY = y0 + u(3);
  doc.setDrawColor(220, 224, 232);
  doc.setLineWidth(u(0.2));
  doc.roundedRect(qrX - u(1), qrY - u(1), qrSize + u(2), qrSize + u(2), u(1), u(1), 'D');
  const qrDataUrl = await generateQrDataUrl(data.validationUrl);
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(u(4.3));
  doc.setTextColor(...STAMP_COLORS.azulPrincipal);
  doc.text('VALIDAR DOCUMENTO', qrX + qrSize / 2, qrY + qrSize + u(3), { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(u(3.8));
  doc.setTextColor(140, 146, 158);
  doc.text('Escaneie o QR Code', qrX + qrSize / 2, qrY + qrSize + u(5.8), { align: 'center' });

  return y0 + h + u(3);
}

/** Monta o documento jsPDF em si (sem salvar/baixar) -- reaproveitado pelo download direto e pela geracao do Blob pro Storage. */
async function buildContratoPdfDoc(numero: string, textoContrato: string, auditStamp?: AuditStamp) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 20;
  const marginTop = 22;
  const marginBottom = auditStamp ? 16 : 18;
  let y = marginTop;

  const addFooter = () => {
    const pageCount = doc.getNumberOfPages();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const paginacaoY = auditStamp ? pageH - 10 : pageH - 10;
    doc.text(`${numero} — Página ${doc.getCurrentPageInfo().pageNumber} de ${pageCount}`, pageW / 2, paginacaoY, { align: 'center' });

    // Nota: o bloco de "AUTENTICAÇÃO ELETRÔNICA AVANÇADA" (base legal, data/hora, IP e hash
    // SHA-256) foi removido daqui de propósito -- essa informação já está impressa dentro do
    // próprio carimbo de assinatura (drawDigitalSignatureStamp), então mantê-la aqui duplicava
    // o conteúdo e empurrava o contrato pra 3+ páginas.
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageH - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 30);
  doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageW / 2, y, { align: 'center' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 130);
  doc.text(numero, pageW / 2, y, { align: 'center' });
  y += 10;

  // Detecta as linhas finais "___" + NOME — CONTRATANTE / — CONTRATADA (ver buildTextoContrato
  // em Modules.tsx) pra injetar automaticamente, logo abaixo de cada uma, o carimbo digital com
  // os dados de auditoria daquela parte -- sem precisar duplicar/editar o texto do contrato.
  // Exatamente 2 assinaturas existem neste fluxo (CONTRATANTE e CONTRATADO(A)) -- portanto
  // exatamente 2 carimbos são desenhados, nunca mais, nunca menos, cada um com dados isolados.
  const linhas = textoContrato.split('\n');
  for (const linha of linhas) {
    if (linha.trim() === '') { y += 3; continue; }

    const trimmed = linha.trim();
    const isTitulo = /^\d+\.\s/.test(trimmed);
    const isAssinaturaContratante = !!auditStamp && /—\s*CONTRATANTE\s*$/i.test(trimmed);
    const isAssinaturaContratada = !!auditStamp && /—\s*CONTRATADA\s*$/i.test(trimmed);

    doc.setFont('helvetica', isTitulo || isAssinaturaContratante || isAssinaturaContratada ? 'bold' : 'normal');
    doc.setFontSize(isTitulo ? 10 : 9.5);
    doc.setTextColor(isTitulo ? 20 : 50, isTitulo ? 20 : 50, isTitulo ? 30 : 60);

    const wrapped = doc.splitTextToSize(linha, pageW - marginX * 2);
    const lineHeight = isTitulo ? 5.5 : 5;
    const alturaCarimbo = (isAssinaturaContratante || isAssinaturaContratada) ? STAMP_HEIGHT + 6 : 0;
    checkPageBreak(wrapped.length * lineHeight + (isTitulo ? 3 : 0) + alturaCarimbo);
    if (isTitulo) y += 2;
    const isLinhaAssinatura = isAssinaturaContratante || isAssinaturaContratada;
    wrapped.forEach((l: string) => {
      if (isLinhaAssinatura) {
        // Linha de assinatura ("___" + NOME — CONTRATANTE/CONTRATADA) centralizada na página,
        // alinhada com o carimbo (que também é centralizado), em vez de colada na margem esquerda.
        doc.text(l, pageW / 2, y, { align: 'center' });
      } else {
        doc.text(l, marginX, y);
      }
      y += lineHeight;
    });

    if (isAssinaturaContratante) {
      // Nome impresso na própria linha de assinatura ("NOME — CONTRATANTE"), garantindo que o
      // carimbo mostre exatamente quem assinou como CONTRATANTE, sem depender de outro campo.
      const nome = trimmed.replace(/—\s*CONTRATANTE\s*$/i, '').trim();
      const { dateStr, timeStr } = formatDateTimeWithTz(auditStamp!.signedAt);
      y = await drawDigitalSignatureStamp(doc, y, marginX, pageW, {
        signerName: nome,
        cpfCnpj: auditStamp!.clienteCpfCnpj ? `CPF/CNPJ: ${maskCpfCnpj(auditStamp!.clienteCpfCnpj)}` : 'CPF/CNPJ não informado',
        dateStr,
        timeStr,
        signatureId: auditStamp!.contratanteSignatureId,
        hash: auditStamp!.documentHash,
        validationUrl: `${auditStamp!.signatureLink || ''}?sig=${encodeURIComponent(auditStamp!.contratanteSignatureId)}`,
        location: auditStamp!.signerLocation,
      });
    } else if (isAssinaturaContratada) {
      // Nome impresso na própria linha de assinatura ("NOME — CONTRATADA").
      const nome = trimmed.replace(/—\s*CONTRATADA\s*$/i, '').trim();
      const { dateStr: dateStrEmpresa, timeStr: timeStrEmpresa } = formatDateTimeWithTz(auditStamp!.empresaValidatedAt);
      y = await drawDigitalSignatureStamp(doc, y, marginX, pageW, {
        signerName: auditStamp!.empresaSignedByName || nome,
        cpfCnpj: `CNPJ: ${maskCpfCnpj(auditStamp!.empresaCnpj)}`,
        dateStr: dateStrEmpresa,
        timeStr: timeStrEmpresa,
        signatureId: auditStamp!.contratadoSignatureId,
        hash: auditStamp!.documentHash,
        validationUrl: `${auditStamp!.signatureLink || ''}?sig=${encodeURIComponent(auditStamp!.contratadoSignatureId)}`,
      });
    }
  }

  if (auditStamp) {
    await addManifestoPage(doc, numero, auditStamp);
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter();
  }

  return doc;
}

/**
 * Página final de "Manifesto de Assinatura" / Trilha de Auditoria (Audit Trail), reunindo num só
 * lugar o resumo de todas as evidências auditáveis das duas assinaturas (CONTRATANTE e
 * CONTRATADA): IP, localização aproximada, dispositivo/navegador (User-Agent), meio de
 * autenticação, hash SHA-256 do documento e timestamps — além do QR Code público de validação.
 * Só é gerada quando o contrato já tem auditStamp (ou seja, no momento em que é efetivamente
 * assinado), como última página do PDF final.
 */
async function addManifestoPage(doc: any, numero: string, auditStamp: AuditStamp) {
  doc.addPage();
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 20;
  let y = 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 30);
  doc.text('MANIFESTO DE ASSINATURA ELETRÔNICA', pageW / 2, y, { align: 'center' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 130);
  doc.text(`Contrato ${numero} — Trilha de Auditoria (Audit Trail)`, pageW / 2, y, { align: 'center' });
  y += 10;

  const drawParteBlock = (titulo: string, campos: [string, string][]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...STAMP_COLORS.azulPrincipal);
    doc.text(titulo, marginX, y);
    y += 2;
    doc.setDrawColor(...STAMP_COLORS.azulPrincipal);
    doc.setLineWidth(0.3);
    doc.line(marginX, y, pageW - marginX, y);
    y += 5.5;

    campos.forEach(([label, valor]) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...STAMP_COLORS.cinzaTexto);
      doc.text(label, marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(40, 44, 54);
      const wrapped = doc.splitTextToSize(valor || 'Não informado', pageW - marginX * 2 - 45);
      doc.text(wrapped, marginX + 45, y);
      y += Math.max(5, wrapped.length * 4.2) + 1.5;
    });
    y += 4;
  };

  const { dateStr: clienteData, timeStr: clienteHora } = formatDateTimeWithTz(auditStamp.signedAt);
  drawParteBlock('CONTRATANTE (Cliente)', [
    ['Documento (CPF/CNPJ):', auditStamp.clienteCpfCnpj ? maskCpfCnpj(auditStamp.clienteCpfCnpj) : ''],
    ['Data e hora da assinatura:', `${clienteData} ${clienteHora}`],
    ['Endereço IP:', auditStamp.signerIp],
    ['Localização aproximada (via IP):', auditStamp.signerLocation || 'Não capturada'],
    ['Meio de autenticação:', auditStamp.signatureMethodLabel || 'Token OTP (código enviado via WhatsApp/E-mail)'],
    ['ID exclusivo da assinatura:', auditStamp.contratanteSignatureId],
  ]);

  const { dateStr: empresaData, timeStr: empresaHora } = formatDateTimeWithTz(auditStamp.empresaValidatedAt);
  drawParteBlock('CONTRATADA (Empresa)', [
    ['Razão social:', auditStamp.empresaRazaoSocial],
    ['CNPJ:', maskCpfCnpj(auditStamp.empresaCnpj)],
    ['Confirmado por:', auditStamp.empresaSignedByName || ''],
    ['Data e hora da confirmação:', `${empresaData} ${empresaHora}`],
    ['Meio de autenticação:', 'Login e senha pré-cadastrados (operador autenticado no sistema)'],
    ['Origem do sistema:', auditStamp.empresaOrigin],
    ['ID exclusivo da assinatura:', auditStamp.contratadoSignatureId],
  ]);

  drawParteBlock('INTEGRIDADE DO DOCUMENTO', [
    ['Hash SHA-256:', auditStamp.documentHash],
    ['Sistema responsável:', SIGNATURE_SYSTEM_NAME],
    ['Base legal:', 'MP 2.200-2/2001, art. 10, §2º — Lei 14.063/2020'],
  ]);

  // QR Code de validação pública, ao final da página.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...STAMP_COLORS.azulPrincipal);
  doc.text('Valide este documento publicamente:', marginX, y);
  y += 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(90, 96, 108);
  doc.text(auditStamp.signatureLink || '', marginX, y + 4);

  const qrSize = 28;
  const qrDataUrl = await generateQrDataUrl(auditStamp.signatureLink || '');
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', marginX, y + 8, qrSize, qrSize);
  }
}

/** Gera o PDF e dispara o download direto no navegador (usado pra preview de rascunho/nao assinado). */
export async function downloadContratoPdf(numero: string, customerName: string, textoContrato: string, auditStamp?: AuditStamp) {
  const doc = await buildContratoPdfDoc(numero, textoContrato, auditStamp);
  doc.save(contratoPdfFileName(numero, customerName));
}

/** Gera o PDF como Blob, sem baixar -- usado pra subir pro Supabase Storage no momento da assinatura. */
export async function generateContratoPdfBlob(numero: string, textoContrato: string, auditStamp?: AuditStamp): Promise<Blob> {
  const doc = await buildContratoPdfDoc(numero, textoContrato, auditStamp);
  return doc.output('blob');
}
