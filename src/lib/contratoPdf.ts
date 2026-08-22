import { getContractValidationLink } from './companyIdentity';

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
  empresaRazaoSocial: string;
  empresaNomeFantasia?: string;
  empresaCnpj: string;
  empresaValidatedAt: string; // ISO string — instante em que o operador confirmou a assinatura da empresa
  empresaOrigin: string;      // ex: "pro.rafaartsgraphics.com.br"
  empresaSignedByName?: string; // nome de quem confirmou a assinatura da empresa (login + senha)
  // Usados so pelo carimbo visual + QR Code (drawSeloAutenticidade) -- nao alteram a assinatura
  // eletronica em si, so a representacao visual dela no PDF final.
  contratoId: string;    // id do contrato -- usado pra montar o link de validacao (/validar/:id)
  clienteNome: string;   // nome da PARTE 1 (contratante), exibido lado a lado com a empresa
}

/** Monta o nome de arquivo padrao usado tanto no download direto quanto no path do Storage. */
export function contratoPdfFileName(numero: string, customerName: string): string {
  const nomeArquivo = customerName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'cliente';
  return `${numero}_${nomeArquivo}.pdf`;
}

/**
 * Imprime, logo abaixo da linha "___" + NOME — CONTRATANTE (linha final do texto do contrato,
 * ver buildTextoContrato em Modules.tsx), o "carimbo digital" com nome/CPF, contato, o link
 * exclusivo de assinatura, data/hora, IP e o hash SHA-256 -- o "lado do cliente" da caixa de provas.
 */
function drawCarimboCliente(doc: any, yStart: number, marginX: number, pageW: number, stamp: AuditStamp): number {
  let y = yStart + 1.5;
  const maxW = pageW - marginX * 2;
  doc.setTextColor(80, 80, 92);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const cpfLinha = `CPF/CNPJ: ${stamp.clienteCpfCnpj || 'não informado'}${stamp.clientePhone ? `   |   Contato: ${stamp.clientePhone}` : ''}`;
  doc.text(cpfLinha, marginX, y);
  y += 3.8;

  if (stamp.signatureLink) {
    const linkWrapped = doc.splitTextToSize(`Link exclusivo de assinatura: ${stamp.signatureLink}`, maxW);
    linkWrapped.forEach((l: string) => { doc.text(l, marginX, y); y += 3.8; });
  }

  const dataAssinatura = new Date(stamp.signedAt).toLocaleString('pt-BR');
  doc.text(`[Assinado via ${stamp.signatureMethodLabel || 'Token OTP'}]   IP: ${stamp.signerIp}   |   ${dataAssinatura}`, marginX, y);
  y += 3.8;

  doc.setFont('courier', 'normal');
  doc.text(`Hash SHA-256: ${stamp.documentHash}`, marginX, y);
  y += 6;

  return y;
}

/**
 * Idem, para o "lado da empresa": logo abaixo da linha "___" + CONTRATADA -- Razão Social,
 * Nome Fantasia, CNPJ, a validação interna automática do ERP e o MESMO hash SHA-256 usado no
 * lado do cliente (prova de que o documento é o mesmo).
 */
function drawCarimboEmpresa(doc: any, yStart: number, marginX: number, stamp: AuditStamp): number {
  let y = yStart + 1.5;
  doc.setTextColor(80, 80, 92);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const fantasiaLinha = stamp.empresaNomeFantasia
    ? `${stamp.empresaNomeFantasia}   |   CNPJ: ${stamp.empresaCnpj}`
    : `CNPJ: ${stamp.empresaCnpj}`;
  doc.text(fantasiaLinha, marginX, y);
  y += 3.8;

  doc.text(
    stamp.empresaSignedByName
      ? `[Assinado internamente por ${stamp.empresaSignedByName}]`
      : '[Validado e Assinado Internamente pelo ERP]',
    marginX, y
  );
  y += 3.8;

  const dataValidacao = new Date(stamp.empresaValidatedAt).toLocaleString('pt-BR');
  doc.text(`Origem: ${stamp.empresaOrigin}   |   ${dataValidacao}`, marginX, y);
  y += 3.8;

  doc.setFont('courier', 'normal');
  doc.text(`Hash SHA-256: ${stamp.documentHash}`, marginX, y);
  y += 6;

  return y;
}

/**
 * Desenha um pequeno circulo com um "check" dentro (aproximacao de icone escudo+check sem
 * depender de fontes/emoji, que nao renderizam de forma confiavel nas fontes base do jsPDF).
 */
function drawCheckBadge(doc: any, cx: number, cy: number, r: number) {
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, r, 'F');
  doc.setDrawColor(16, 122, 87);
  doc.setLineWidth(0.9);
  doc.line(cx - r * 0.5, cy, cx - r * 0.1, cy + r * 0.4);
  doc.line(cx - r * 0.1, cy + r * 0.4, cx + r * 0.55, cy - r * 0.4);
}

/**
 * CARIMBO VISUAL PROFISSIONAL DA ASSINATURA (selo + QR Code + as duas partes lado a lado).
 * So e' chamado quando o contrato ja foi assinado pelas DUAS partes (auditStamp so existe nesse
 * caso -- ver signContract/signContractByCompany em otpUtils.ts), entao o status impresso e'
 * sempre "ASSINADO POR TODAS AS PARTES". Isso e' so a REPRESENTACAO VISUAL: a prova real
 * continua sendo a assinatura eletronica (hash + IP + timestamps) ja existente, reutilizada
 * aqui sem alteracao. Retorna a nova posicao Y depois do carimbo.
 */
function drawSeloAutenticidade(doc: any, yStart: number, marginX: number, pageW: number, stamp: AuditStamp, qrDataUrl: string | null): number {
  const boxX = marginX;
  const boxW = pageW - marginX * 2;
  const qrSize = 32;
  const boxH = 74;
  let y = yStart;

  // Moldura geral do selo
  doc.setDrawColor(210, 210, 218);
  doc.setLineWidth(0.4);
  doc.roundedRect(boxX, y, boxW, boxH, 2, 2, 'S');

  // Faixa azul do topo com o badge de check e o titulo do selo
  const bannerH = 11;
  doc.setFillColor(37, 60, 133);
  doc.roundedRect(boxX, y, boxW, bannerH, 2, 2, 'F');
  doc.rect(boxX, y + bannerH / 2, boxW, bannerH / 2, 'F'); // corrige cantos arredondados soh embaixo
  drawCheckBadge(doc, boxX + 8, y + bannerH / 2, 3.2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('ASSINADO ELETRONICAMENTE — TODAS AS PARTES', boxX + 14, y + bannerH / 2 + 1.3);

  let innerY = y + bannerH + 6;
  const qrX = boxX + boxW - qrSize - 6;
  const colGap = 6;
  const partesW = qrX - boxX - colGap - 6;
  const col1X = boxX + 6;
  const col2X = col1X + partesW / 2 + 3;

  const empresaLabel = stamp.empresaNomeFantasia || stamp.empresaRazaoSocial;
  const shortId = stamp.contratoId ? stamp.contratoId.replace(/-/g, '').slice(0, 8).toUpperCase() : '—';
  const dataCliente = new Date(stamp.signedAt).toLocaleString('pt-BR');
  const dataEmpresa = new Date(stamp.empresaValidatedAt).toLocaleString('pt-BR');

  const drawParte = (x: number, label: string, nome: string, doc_: string, data: string, idSufixo: string) => {
    let py = innerY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(37, 60, 133);
    doc.text(label, x, py);
    py += 4.3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 40);
    doc.splitTextToSize(nome, partesW / 2 - 2).slice(0, 2).forEach((l: string) => { doc.text(l, x, py); py += 3.8; });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 100);
    doc.text(`CPF/CNPJ: ${doc_}`, x, py); py += 3.6;
    doc.text(data, x, py); py += 3.6;
    doc.setFont('courier', 'normal');
    doc.text(`ID: ${shortId}-${idSufixo}`, x, py);
  };

  drawParte(col1X, 'PARTE 1 — CONTRATANTE', stamp.clienteNome || 'Contratante', maskCpfCnpjLocal(stamp.clienteCpfCnpj), dataCliente, 'C1');
  drawParte(col2X, 'PARTE 2 — CONTRATADA', empresaLabel, maskCpfCnpjLocal(stamp.empresaCnpj), dataEmpresa, 'E2');

  // QR Code (aponta pra pagina publica de validacao /validar/:id) -- so desenha se a geracao
  // deu certo; se falhar (ex: offline), o selo continua valido sem o QR, so com o link em texto.
  const qrY = y + bannerH + 6;
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.rect(qrX, qrY, qrSize, qrSize, 'S');
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(90, 90, 100);
  doc.text('ESCANEIE PARA VALIDAR', qrX + qrSize / 2, qrY + qrSize + 4, { align: 'center' });

  // Rodape do selo: integridade verificada + hash
  const footerY = y + boxH - 8;
  doc.setDrawColor(225, 225, 230);
  doc.setLineWidth(0.2);
  doc.line(boxX + 4, footerY - 4, boxX + boxW - 4, footerY - 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(16, 122, 87);
  doc.text('INTEGRIDADE DO DOCUMENTO: VERIFICADA', boxX + 6, footerY);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 100);
  doc.text(`HASH SHA-256: ${stamp.documentHash}`, boxX + 6, footerY + 4);

  return y + boxH + 4;
}

// Mascara local de CPF/CNPJ (mesma regra de src/lib/contractUtils.ts) -- duplicada aqui, sem
// import cruzado, so pra manter contratoPdf.ts sem dependencia de outro modulo utilitario.
function maskCpfCnpjLocal(value?: string | null): string {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length === 11) return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`;
  if (digits.length === 14) return `${digits.slice(0, 2)}.***.***/**${digits.slice(10, 12)}-${digits.slice(12, 14)}`;
  return '***.***.***-**';
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

  // Gera o QR Code do carimbo visual ANTES de desenhar qualquer pagina (precisa ser async) --
  // aponta pra rota publica de validacao (/validar/:id). So gera quando ha auditStamp (documento
  // ja assinado pelas duas partes) e contratoId disponivel.
  let qrDataUrl: string | null = null;
  if (auditStamp?.contratoId) {
    try {
      const QRCode = (await import('qrcode')).default;
      qrDataUrl = await QRCode.toDataURL(getContractValidationLink(auditStamp.contratoId), {
        margin: 0,
        width: 300,
        color: { dark: '#1e293b', light: '#FFFFFFFF' },
      });
    } catch (e) {
      console.warn('Falha ao gerar QR Code do selo de autenticidade:', e);
    }
  }

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
    const alturaCarimbo = (isAssinaturaContratante || isAssinaturaContratada) ? 24 : 0;
    checkPageBreak(wrapped.length * lineHeight + (isTitulo ? 3 : 0) + alturaCarimbo);
    if (isTitulo) y += 2;
    wrapped.forEach((l: string) => {
      doc.text(l, marginX, y);
      y += lineHeight;
    });

    if (isAssinaturaContratante) {
      y = drawCarimboCliente(doc, y, marginX, pageW, auditStamp!);
    } else if (isAssinaturaContratada) {
      y = drawCarimboEmpresa(doc, y, marginX, auditStamp!);
    }
  }

  // Carimbo visual do selo de autenticidade (selo + QR Code + duas partes), inserido na ULTIMA
  // pagina do documento. Se nao houver espaço suficiente ali (regra: nunca cobrir o texto do
  // contrato nem o rodape de autenticacao), cria uma pagina adicional so pra ele.
  if (auditStamp) {
    const seloH = 74;
    const seloGap = 6;
    if (y + seloGap + seloH > pageH - marginBottom) {
      doc.addPage();
      y = marginTop;
    } else {
      y += seloGap;
    }
    drawSeloAutenticidade(doc, y, marginX, pageW, auditStamp, qrDataUrl);
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
