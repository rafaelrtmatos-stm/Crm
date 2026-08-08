import * as XLSX from 'xlsx';

// ---------- Helpers genéricos ----------
function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

function parseNumberBR(v: any): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (!s) return 0;
  // "1.234,56" -> 1234.56 | "75,00" -> 75.00 | "75.00" -> 75.00
  const cleaned = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function cellStr(v: any): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s === '' || s.toLowerCase() === 'nan' ? undefined : s;
}

// ================= CLIENTES =================
export interface ClienteRow {
  full_name: string;
  phone?: string;
  email?: string;
  cpf_cnpj?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  distrito?: string;
  city?: string;
  state?: string;
  notes?: string;
  nascimento?: string;
  outros_documentos?: string;
  dividas_em_aberto?: number;
}

const CLIENTES_HEADERS = ['NOME', 'TELEFONE', 'EMAIL', 'CPF / CNPJ', 'CEP', 'LOGRADOURO', 'NÚMERO', 'COMPLEMENTO', 'DISTRITO', 'CIDADE', 'ESTADO', 'OBSERVAÇÕES', 'NASCIMENTO', 'OUTROS DOCUMENTOS', 'DÍVIDAS EM ABERTO'];

export function exportClientesXlsx(clientes: any[]) {
  const rows = clientes.map(c => ([
    c.full_name || '', c.phone || '', c.email || '', c.cpf_cnpj || '', c.cep || '',
    c.logradouro || '', c.numero || '', c.complemento || '', c.distrito || '',
    c.city || '', c.state || '', c.notes || '', c.nascimento || '', c.outros_documentos || '',
    c.dividas_em_aberto || 0,
  ]));
  const ws = XLSX.utils.aoa_to_sheet([CLIENTES_HEADERS, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  downloadWorkbook(wb, `CLIENTES_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function parseClientesXlsx(data: ArrayBuffer): ClienteRow[] {
  const wb = XLSX.read(data, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });
  const out: ClienteRow[] = [];
  for (const r of rows) {
    const nome = cellStr(r['NOME']);
    if (!nome) continue;
    out.push({
      full_name: nome,
      phone: cellStr(r['TELEFONE']),
      email: cellStr(r['EMAIL']),
      cpf_cnpj: cellStr(r['CPF / CNPJ']),
      cep: cellStr(r['CEP']),
      logradouro: cellStr(r['LOGRADOURO']),
      numero: cellStr(r['NÚMERO']),
      complemento: cellStr(r['COMPLEMENTO']),
      distrito: cellStr(r['DISTRITO']),
      city: cellStr(r['CIDADE']),
      state: cellStr(r['ESTADO']),
      notes: cellStr(r['OBSERVAÇÕES']),
      nascimento: cellStr(r['NASCIMENTO']),
      outros_documentos: cellStr(r['OUTROS DOCUMENTOS']),
      dividas_em_aberto: parseNumberBR(r['DÍVIDAS EM ABERTO']),
    });
  }
  return out;
}

// ================= PRODUTOS =================
export interface ProdutoRow {
  name: string;
  code?: string;
  category?: string;
  subcategoria?: string;
  unit: string;
  sale_price: number;
  cost_price: number;
  preco_atacado?: number;
  lote?: string;
  min_stock: number;
  current_stock: number;
  validade?: string;
  provider?: string;
}

const ESTOQUE_HEADERS = ['CÓDIGO', 'DESCRIÇÃO', 'FORNECEDOR', 'CATEGORIA', 'SUBCATEGORIA', 'UNIDADE', 'CUSTO', 'VAREJO', 'ATACADO', 'LOTE', 'ESTOQUE MÍNIMO', 'QUANTIDADE', 'VALIDADE'];

export function exportProdutosXlsx(produtos: any[]) {
  const rows = produtos.map(p => ([
    p.code || '', p.name || '', p.provider || '', p.category || '', p.subcategoria || '',
    p.unit || 'unidade', p.cost_price || 0, p.sale_price || 0, p.preco_atacado || 0,
    p.lote || '', p.min_stock || 0, p.current_stock || 0, p.validade || '',
  ]));
  const ws = XLSX.utils.aoa_to_sheet([ESTOQUE_HEADERS, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  downloadWorkbook(wb, `ESTOQUE_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function parseProdutosXlsx(data: ArrayBuffer): ProdutoRow[] {
  const wb = XLSX.read(data, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });
  const out: ProdutoRow[] = [];
  for (const r of rows) {
    const desc = cellStr(r['DESCRIÇÃO']);
    if (!desc) continue;
    let codigo = r['CÓDIGO'];
    let codeStr: string | undefined;
    if (codigo !== null && codigo !== undefined) {
      codeStr = typeof codigo === 'number' ? String(Math.round(codigo)) : cellStr(codigo);
    }
    out.push({
      name: desc,
      code: codeStr,
      category: cellStr(r['CATEGORIA']),
      subcategoria: cellStr(r['SUBCATEGORIA']),
      unit: cellStr(r['UNIDADE']) || 'unidade',
      cost_price: parseNumberBR(r['CUSTO']),
      sale_price: parseNumberBR(r['VAREJO']),
      preco_atacado: parseNumberBR(r['ATACADO']),
      lote: cellStr(r['LOTE']),
      min_stock: parseNumberBR(r['ESTOQUE MÍNIMO']),
      current_stock: parseNumberBR(r['QUANTIDADE']),
      validade: cellStr(r['VALIDADE']),
      provider: cellStr(r['FORNECEDOR']),
    });
  }
  return out;
}

// ================= VENDAS =================
const VENDAS_HEADERS = ['STATUS', 'CÓDIGO', 'DATA E HORA', 'CLIENTE', 'PRODUTOS', 'VALORES', 'PAGAMENTO', 'FATURAMENTO'];

export function exportVendasXlsx(vendas: any[]) {
  const rows = vendas.map(v => {
    const items = v.items || [];
    const produtosStr = items.map((i: any) => `${i.name}: ${i.quantity}`).join('\n');
    const valoresStr = items.map((i: any) => `${i.name}: ${((i.area ? i.price * i.area : i.price)).toFixed(2)}`).join('\n');
    const pagamentoStr = `${v.paymentMethod || v.payment_method || ''}: ${(v.downPayment ?? v.down_payment ?? 0).toFixed(2)}`;
    return [
      v.status === 'completed' ? 'CONCLUÍDO' : 'EM ABERTO',
      String(v.id || '').slice(-14).toUpperCase(),
      new Date(v.createdAt || v.created_at).toLocaleString('pt-BR'),
      v.customerName || v.customer_name || '',
      produtosStr,
      valoresStr,
      pagamentoStr,
      v.total || 0,
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([VENDAS_HEADERS, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vendas');
  downloadWorkbook(wb, `VENDAS_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export interface VendaImportRow {
  status: string;
  customerName?: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  paymentMethod?: string;
  downPayment?: number;
  createdAt?: string;
}

// Converte "DD/MM/AAAA HH:mm:ss" (ou variações) para ISO — evita datas invalidas/erradas
// que o construtor nativo new Date() interpretaria como MM/DD (formato americano).
function parseDateBR(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) {
    const fallback = new Date(value);
    return isNaN(fallback.getTime()) ? undefined : fallback.toISOString();
  }
  const [, day, month, year, hour = '0', min = '0', sec = '0'] = match;
  const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(min), Number(sec));
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

// Faz o parse do modelo com abas por mes (STATUS, CÓDIGO, DATA E HORA, CLIENTE, PRODUTOS, VALORES, PAGAMENTO, FATURAMENTO...)
export function parseVendasXlsx(data: ArrayBuffer): VendaImportRow[] {
  const wb = XLSX.read(data, { type: 'array' });
  const out: VendaImportRow[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });
    for (const r of rows) {
      if (!('PRODUTOS' in r) && !('PAGAMENTO' in r)) continue;
      const produtosRaw = cellStr(r['PRODUTOS']);
      const valoresRaw = cellStr(r['VALORES']);
      if (!produtosRaw) continue;

      // "NOME: 2.0\nOUTRO: 1.0" -> [{name, quantity}]
      const qtyLines = produtosRaw.split('\n').map(l => l.trim()).filter(Boolean);
      const valueLines = (valoresRaw || '').split('\n').map(l => l.trim()).filter(Boolean);
      const items = qtyLines.map((line, idx) => {
        const [name, qty] = line.split(':').map(s => s.trim());
        let price = 0;
        if (valueLines[idx]) {
          const parts = valueLines[idx].split(':');
          price = parseNumberBR(parts[parts.length - 1]);
        }
        return { name: name || 'Item', quantity: parseNumberBR(qty) || 1, price };
      });

      const pagamentoRaw = cellStr(r['PAGAMENTO']);
      let paymentMethod: string | undefined;
      let downPayment = 0;
      if (pagamentoRaw) {
        const firstLine = pagamentoRaw.split('\n')[0];
        const parts = firstLine.split(':');
        paymentMethod = parts[0]?.trim().toLowerCase();
        downPayment = pagamentoRaw.split('\n').reduce((sum, line) => {
          const p = line.split(':');
          return sum + parseNumberBR(p[p.length - 1]);
        }, 0);
      }

      const status = cellStr(r['STATUS']);
      const dataHora = cellStr(r['DATA E HORA']);

      out.push({
        status: status && status.toUpperCase().includes('ABERTO') ? 'pending' : 'completed',
        customerName: cellStr(r['CLIENTE']),
        items,
        total: parseNumberBR(r['FATURAMENTO']) || items.reduce((s, i) => s + i.price * i.quantity, 0),
        paymentMethod,
        downPayment,
        createdAt: parseDateBR(dataHora),
      });
    }
  }
  return out;
}
