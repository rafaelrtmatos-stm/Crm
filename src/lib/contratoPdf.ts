// Gera um PDF limpo com o texto do contrato (paginacao automatica), mais apropriado
// pra um documento juridico do que o estilo colorido do recibo/orcamento

// Dados da assinatura eletrônica avançada (OTP validado), impressos no rodapé de TODAS as
// páginas quando o contrato já foi assinado digitalmente. Opcional: PDFs de contratos ainda
// não assinados continuam sendo gerados normalmente, sem esse bloco.
export interface AuditStamp {
  signedAt: string;     // ISO string
  signerIp: string;
  documentHash: string;
}

export async function downloadContratoPdf(numero: string, customerName: string, textoContrato: string, auditStamp?: AuditStamp) {
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

  const linhas = textoContrato.split('\n');
  for (const linha of linhas) {
    if (linha.trim() === '') { y += 3; continue; }

    const isTitulo = /^\d+\.\s/.test(linha.trim());
    doc.setFont('helvetica', isTitulo ? 'bold' : 'normal');
    doc.setFontSize(isTitulo ? 10 : 9.5);
    doc.setTextColor(isTitulo ? 20 : 50, isTitulo ? 20 : 50, isTitulo ? 30 : 60);

    const wrapped = doc.splitTextToSize(linha, pageW - marginX * 2);
    const lineHeight = isTitulo ? 5.5 : 5;
    checkPageBreak(wrapped.length * lineHeight + (isTitulo ? 3 : 0));
    if (isTitulo) y += 2;
    wrapped.forEach((l: string) => {
      doc.text(l, marginX, y);
      y += lineHeight;
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter();
  }

  const nomeArquivo = customerName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'cliente';
  doc.save(`${numero}_${nomeArquivo}.pdf`);
}
