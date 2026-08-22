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
  timeStr: string;         // já formatado, ex: "17:42:18"
  signatureId: string;     // ID EXCLUSIVO desta assinatura — nunca repete entre CONTRATANTE/CONTRATADO(A)
  hash: string;
  validationUrl: string;   // URL que o QR Code deste carimbo especificamente valida
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
function drawShieldCheck(doc: any, cx: number, cy: number, r: number, shieldRgb: number[], checkRgb: number[]) {
  doc.setFillColor(shieldRgb[0], shieldRgb[1], shieldRgb[2]);
  doc.circle(cx, cy, r, 'F');
  doc.setDrawColor(checkRgb[0], checkRgb[1], checkRgb[2]);
  doc.setLineWidth(0.45);
  doc.line(cx - r * 0.45, cy, cx - r * 0.1, cy + r * 0.4);
  doc.line(cx - r * 0.1, cy + r * 0.4, cx + r * 0.5, cy - r * 0.35);
}

/** Cadeado simples (retângulo + arco) — usado no bloco "documento protegido". */
function drawLockIcon(doc: any, cx: number, cy: number, size: number, rgb: number[]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(cx - size / 2, cy - size * 0.1, size, size * 0.7, 0.3, 0.3, 'D');
  doc.circle(cx, cy - size * 0.35, size * 0.32, 'D');
}

/** Calendário simples — usado no bloco de data. */
function drawCalendarIcon(doc: any, cx: number, cy: number, size: number, rgb: number[]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(0.35);
  doc.roundedRect(cx - size / 2, cy - size / 2, size, size, 0.3, 0.3, 'D');
  doc.line(cx - size / 2, cy - size * 0.15, cx + size / 2, cy - size * 0.15);
}

/** Relógio simples — usado no bloco de hora. */
function drawClockIcon(doc: any, cx: number, cy: number, size: number, rgb: number[]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(0.35);
  doc.circle(cx, cy, size / 2, 'D');
  doc.line(cx, cy, cx, cy - size * 0.32);
  doc.line(cx, cy, cx + size * 0.25, cy);
}

/** Impressão digital simplificada (arcos concêntricos) — usada no bloco de ID da assinatura. */
function drawFingerprintIcon(doc: any, cx: number, cy: number, size: number, rgb: number[]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineWidth(0.3);
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

// Conversão px -> mm a 96dpi (padrão web), usada só pra fixar as duas medidas pedidas:
// largura do carimbo = 700px e largura do QR Code = 180px. O resto do layout (altura do
// carimbo e espaçamento vertical do conteúdo) é recalculado proporcionalmente a partir
// dessas duas medidas, pra tudo continuar legível e nada ser cortado.
const PX_TO_MM = 25.4 / 96;
const STAMP_WIDTH = 700 * PX_TO_MM;   // ≈ 185.2mm — largura fixa do carimbo
const QR_SIZE = 180 * PX_TO_MM;       // ≈ 47.6mm — largura/altura fixa do QR Code

// Altura do carimbo é derivada do tamanho do QR (padding superior + QR + rótulo "VALIDAR
// DOCUMENTO" / "Escaneie o QR Code" abaixo dele + padding inferior), senão o QR maior
// estouraria uma altura fixa antiga (46mm).
const STAMP_HEIGHT = QR_SIZE + 12; // mm — altura fixa do carimbo (mesma para as duas assinaturas)

// Fator de escala aplicado aos deslocamentos verticais do conteúdo (painel esquerdo + coluna
// de dados), calculado a partir do layout original (desenhado pra uma altura de 46mm) — assim
// o texto se espalha proporcionalmente pela nova altura, em vez de ficar apertado no topo.
const CONTENT_SCALE = STAMP_HEIGHT / 46;

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
  const sy = (n: number) => n * CONTENT_SCALE; // aplica a escala vertical do conteúdo

  const y0 = yStart + 1.5;
  const w = STAMP_WIDTH;
  const x0 = (pageW - w) / 2; // carimbo centralizado na página, largura fixa em 700px
  const h = STAMP_HEIGHT;

  // ---- Moldura externa (borda azul arredondada, fundo branco) ----
  doc.setFillColor(...STAMP_COLORS.branco);
  doc.setDrawColor(...STAMP_COLORS.azulPrincipal);
  doc.setLineWidth(0.55);
  doc.roundedRect(x0, y0, w, h, 2.5, 2.5, 'FD');

  // ---- Painel institucional esquerdo (fundo azul sólido) ----
  const painelW = 34;
  doc.setFillColor(...STAMP_COLORS.azulPrincipal);
  doc.rect(x0 + 0.6, y0 + 0.6, painelW - 0.6, h - 1.2, 'F');

  const painelCx = x0 + 0.6 + (painelW - 0.6) / 2;
  drawShieldCheck(doc, painelCx, y0 + sy(7.5), 4.2, STAMP_COLORS.branco, STAMP_COLORS.verdeValidacao);

  doc.setTextColor(...STAMP_COLORS.branco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ASSINADO', painelCx, y0 + sy(14.5), { align: 'center' });
  doc.setFontSize(6);
  doc.text('ELETRONICAMENTE', painelCx, y0 + sy(17.8), { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.text('COM VALIDADE JURÍDICA', painelCx, y0 + sy(21), { align: 'center' });

  doc.setDrawColor(...STAMP_COLORS.branco);
  doc.setLineWidth(0.15);
  doc.line(x0 + 4, y0 + sy(24), x0 + painelW - 4, y0 + sy(24));

  doc.setFontSize(4.6);
  doc.text('MP 2.200-2/2001', painelCx, y0 + sy(27.5), { align: 'center' });
  doc.text('LEI 14.063/2020', painelCx, y0 + sy(31), { align: 'center' });

  // ---- Área de conteúdo (direita do painel, deixando espaço pro QR Code) ----
  const qrSize = QR_SIZE;
  const contentX = x0 + painelW + 4;
  const contentRight = x0 + w - qrSize - 5;
  const contentW = contentRight - contentX;

  // Identificação do assinante (avatar + nome + CPF/CNPJ)
  drawAvatarIcon(doc, contentX + 3.2, y0 + sy(7), 3.2);
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text('ASSINANTE', contentX + 8, y0 + sy(4.5));
  doc.setFontSize(8.2);
  const nomeWrapped = doc.splitTextToSize(data.signerName, contentW - 8);
  doc.text(nomeWrapped[0], contentX + 8, y0 + sy(8.2));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(data.cpfCnpj, contentX + 8, y0 + sy(11.8));

  doc.setDrawColor(220, 224, 232);
  doc.setLineWidth(0.15);
  doc.line(contentX, y0 + sy(14.5), contentRight, y0 + sy(14.5));

  // Data / Hora / ID da assinatura — três colunas
  const colW = contentW / 3;
  const iconY = y0 + sy(19);
  const labelY = y0 + sy(22.2);
  const valueY = y0 + sy(25.4);

  drawCalendarIcon(doc, contentX + 2.2, iconY, 3, STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('DATA', contentX + 5, labelY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(30, 34, 44);
  doc.text(data.dateStr, contentX + 5, valueY);

  drawClockIcon(doc, contentX + colW + 2.2, iconY, 3, STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('HORA', contentX + colW + 5, labelY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(30, 34, 44);
  doc.text(data.timeStr, contentX + colW + 5, valueY);

  drawFingerprintIcon(doc, contentX + colW * 2 + 2.2, iconY, 3.4, STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('ID DA ASSINATURA', contentX + colW * 2 + 5, labelY);
  doc.setFont('courier', 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(30, 34, 44);
  doc.text(data.signatureId, contentX + colW * 2 + 5, valueY);

  doc.setDrawColor(220, 224, 232);
  doc.line(contentX, y0 + sy(27.5), contentRight, y0 + sy(27.5));

  // Integridade do documento — verificada (escudo verde)
  drawShieldCheck(doc, contentX + 2.2, y0 + sy(31), 2.4, STAMP_COLORS.verdeValidacao, STAMP_COLORS.branco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('INTEGRIDADE DO DOCUMENTO', contentX + 6, y0 + sy(30.2));
  doc.setTextColor(...STAMP_COLORS.verdeValidacao);
  doc.setFontSize(5.8);
  doc.text('VERIFICADA', contentX + 6, y0 + sy(33));

  // Hash SHA-256
  doc.setFillColor(...STAMP_COLORS.azulSecundario);
  doc.circle(contentX + 2.2, y0 + sy(36.3), 2.2, 'F');
  doc.setTextColor(...STAMP_COLORS.branco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('#', contentX + 2.2, y0 + sy(37.1), { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('HASH SHA-256', contentX + 6, y0 + sy(35.4));
  doc.setFont('courier', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(60, 64, 74);
  const hashDisplay = data.hash.length > 52 ? `${data.hash.slice(0, 52)}…` : data.hash;
  doc.text(hashDisplay, contentX + 6, y0 + sy(38.4));

  // Documento protegido
  drawLockIcon(doc, contentX + 2.2, y0 + sy(41.6), 3, STAMP_COLORS.azulSecundario);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(...STAMP_COLORS.cinzaTexto);
  doc.text('DOCUMENTO PROTEGIDO', contentX + 6, y0 + sy(40.6));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.4);
  doc.setTextColor(120, 126, 138);
  doc.text('Contra alterações após a assinatura', contentX + 6, y0 + sy(43.2));

  // QR Code (canto superior direito) — valida especificamente ESTA assinatura
  const qrX = x0 + w - qrSize - 3;
  const qrY = y0 + 3;
  doc.setDrawColor(220, 224, 232);
  doc.setLineWidth(0.2);
  doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 1, 1, 'D');
  const qrDataUrl = await generateQrDataUrl(data.validationUrl);
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.3);
  doc.setTextColor(...STAMP_COLORS.azulPrincipal);
  doc.text('VALIDAR DOCUMENTO', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.8);
  doc.setTextColor(140, 146, 158);
  doc.text('Escaneie o QR Code', qrX + qrSize / 2, qrY + qrSize + 5.8, { align: 'center' });

  return y0 + h + 3;
}

/** Monta o documento jsPDF em si (sem salvar/baixar) -- reaproveitado pelo download direto e pela geracao do Blob pro Storage. */
async function buildContratoPdfDoc(numero: string, textoContrato: string, auditStamp?: AuditStamp) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 20;
  const marginTop = 22;
  const marginBottom = auditStamp ? 30 : 18;
  let y = marginTop;

  const addFooter = () => {
    const pageCount = doc.getNumberOfPages();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const paginacaoY = auditStamp ? pageH - 22 : pageH - 10;
    doc.text(`${numero} — Página ${doc.getCurrentPageInfo().pageNumber} de ${pageCount}`, pageW / 2, paginacaoY, { align: 'center' });

    if (auditStamp) {
      const dataAssinatura = new Date(auditStamp.signedAt).toLocaleString('pt-BR');
      doc.setDrawColor(200, 200, 200);
      doc.line(marginX, pageH - 18, pageW - marginX, pageH - 18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 110);
      doc.text('AUTENTICAÇÃO ELETRÔNICA AVANÇADA — Lei nº 14.063/2020 e MP nº 2.200-2/2001', marginX, pageH - 14);
      doc.setFont('helvetica', 'normal');
      doc.text(`Assinado em: ${dataAssinatura}  |  IP: ${auditStamp.signerIp}`, marginX, pageH - 11);
      doc.text(`Hash SHA-256: ${auditStamp.documentHash}`, marginX, pageH - 8);
    }
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
    wrapped.forEach((l: string) => {
      doc.text(l, marginX, y);
      y += lineHeight;
    });

    if (isAssinaturaContratante) {
      // Nome impresso na própria linha de assinatura ("NOME — CONTRATANTE"), garantindo que o
      // carimbo mostre exatamente quem assinou como CONTRATANTE, sem depender de outro campo.
      const nome = trimmed.replace(/—\s*CONTRATANTE\s*$/i, '').trim();
      const dt = new Date(auditStamp!.signedAt);
      y = await drawDigitalSignatureStamp(doc, y, marginX, pageW, {
        signerName: nome,
        cpfCnpj: auditStamp!.clienteCpfCnpj ? `CPF/CNPJ: ${auditStamp!.clienteCpfCnpj}` : 'CPF/CNPJ não informado',
        dateStr: dt.toLocaleDateString('pt-BR'),
        timeStr: dt.toLocaleTimeString('pt-BR'),
        signatureId: auditStamp!.contratanteSignatureId,
        hash: auditStamp!.documentHash,
        validationUrl: `${auditStamp!.signatureLink || ''}?sig=${encodeURIComponent(auditStamp!.contratanteSignatureId)}`,
      });
    } else if (isAssinaturaContratada) {
      // Nome impresso na própria linha de assinatura ("NOME — CONTRATADA").
      const nome = trimmed.replace(/—\s*CONTRATADA\s*$/i, '').trim();
      const dtEmpresa = new Date(auditStamp!.empresaValidatedAt);
      y = await drawDigitalSignatureStamp(doc, y, marginX, pageW, {
        signerName: auditStamp!.empresaSignedByName || nome,
        cpfCnpj: `CNPJ: ${auditStamp!.empresaCnpj}`,
        dateStr: dtEmpresa.toLocaleDateString('pt-BR'),
        timeStr: dtEmpresa.toLocaleTimeString('pt-BR'),
        signatureId: auditStamp!.contratadoSignatureId,
        hash: auditStamp!.documentHash,
        validationUrl: `${auditStamp!.signatureLink || ''}?sig=${encodeURIComponent(auditStamp!.contratadoSignatureId)}`,
      });
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter();
  }

  return doc;
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
