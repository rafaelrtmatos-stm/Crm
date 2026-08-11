// Gera um PDF com os dados do cliente + resumo financeiro + tabela de servicos, pra download

interface FichaClienteInput {
  cliente: {
    full_name?: string;
    phone?: string;
    email?: string;
    cpf_cnpj?: string;
    logradouro?: string;
    numero?: string;
    distrito?: string;
    city?: string;
    state?: string;
  };
  servicos: { id: string; createdAt: string; itemsSummary: string; total: number; isFullyPaid: boolean }[];
  stats: { total: number; pago: number; pendente: number; count: number };
  companyName?: string;
}

export async function exportFichaClientePdf({ cliente, servicos, stats, companyName }: FichaClienteInput) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 14;
  let y = 18;

  // Cabecalho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 30);
  doc.text((companyName || 'Rafa Arts Graphics').toUpperCase(), marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 130);
  doc.text('Ficha do Cliente', marginX, y + 6);
  doc.setTextColor(150, 150, 160);
  doc.text(new Date().toLocaleString('pt-BR'), pageW - marginX, y, { align: 'right' });
  y += 14;

  doc.setDrawColor(220, 220, 225);
  doc.line(marginX, y, pageW - marginX, y);
  y += 10;

  // Dados do cliente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 30);
  doc.text(cliente.full_name || 'Cliente', marginX, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 70);
  const linhasContato: string[] = [];
  if (cliente.phone) linhasContato.push(`Telefone/WhatsApp: ${cliente.phone}`);
  if (cliente.email) linhasContato.push(`E-mail: ${cliente.email}`);
  if (cliente.cpf_cnpj) linhasContato.push(`CPF/CNPJ: ${cliente.cpf_cnpj}`);
  const endereco = [cliente.logradouro, cliente.numero, cliente.distrito, cliente.city, cliente.state].filter(Boolean).join(', ');
  if (endereco) linhasContato.push(`Endereço: ${endereco}`);
  linhasContato.forEach(linha => { doc.text(linha, marginX, y); y += 5.5; });
  y += 4;

  // Cards de resumo financeiro
  const cardW = (pageW - marginX * 2 - 9) / 4;
  const cards = [
    { label: 'SERVIÇOS FEITOS', val: String(stats.count) },
    { label: 'FATURAMENTO TOTAL', val: `R$ ${stats.total.toFixed(2).replace('.', ',')}` },
    { label: 'RECEBIDO', val: `R$ ${stats.pago.toFixed(2).replace('.', ',')}` },
    { label: 'PENDENTE', val: `R$ ${stats.pendente.toFixed(2).replace('.', ',')}` },
  ];
  cards.forEach((c, i) => {
    const x = marginX + i * (cardW + 3);
    doc.setFillColor(245, 246, 248);
    doc.roundedRect(x, y, cardW, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 150);
    doc.text(c.label, x + 3, y + 6);
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 30);
    doc.text(c.val, x + 3, y + 13.5);
  });
  y += 26;

  // Tabela de servicos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 30);
  doc.text('Histórico de Serviços', marginX, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Número', 'Data', 'Itens', 'Valor (R$)', 'Situação']],
    body: servicos.map(s => [
      `#${String(s.id).slice(-8).toUpperCase()}`,
      new Date(s.createdAt).toLocaleString('pt-BR'),
      s.itemsSummary || '-',
      s.total.toFixed(2).replace('.', ','),
      s.isFullyPaid ? 'Pago' : 'Pendente',
    ]),
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [40, 40, 50] },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'center' } },
  });

  const nomeArquivo = (cliente.full_name || 'cliente').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
  doc.save(`FICHA_${nomeArquivo}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
