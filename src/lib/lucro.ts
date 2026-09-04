// Calculo de Lucro Liquido de uma venda -- usado em Historico de Vendas (POSModule) e no
// Dashboard/Analise Detalhada (DashboardModule), pra garantir que os dois lugares mostrem
// exatamente o mesmo numero.
//
// Regra: o custo real considera primeiro o consumo de materias-primas gravado no item da
// venda. Para vendas antigas sem esse snapshot, mantem o fallback pelo custo interno do
// produto. Servicos de categoria "substrato" tambem recebem automaticamente o custo de
// maquina por metro linear.
//
// Lucro = Valor Recebido - (Custo de Material + Custo de Maquina + Custos Extras Manuais)

export interface LucroMaterialConsumption { quantity: number; costPrice: number; totalCost?: number; }
export interface LucroSaleItem {
  productId?: string; name?: string; quantity: number; area?: number; consumoEstoque?: number;
  dimensions?: string; category?: string; categoria?: string; tipoItem?: string; unitType?: string;
  materiasPrimasConsumidas?: LucroMaterialConsumption[]; custoMaquinaPorMetro?: number;
}
export interface LucroExtraCost { amount: number; date?: string; description?: string; }

const REGEX_MATERIAL_LONA_ADESIVO = /lona|adesivo/i;
const REGEX_SUBSTRATO = /substrato/i;
const CUSTO_MAQUINA_SUBSTRATO_POR_METRO = 5.98;

export function isMaterialLonaAdesivo(nomeProduto: string | undefined | null): boolean {
  return !!nomeProduto && REGEX_MATERIAL_LONA_ADESIVO.test(nomeProduto);
}

export function obterConsumoItem(item: LucroSaleItem): number {
  const qtd = item.quantity || 1;
  if (typeof item.consumoEstoque === 'number' && item.consumoEstoque > 0) return item.consumoEstoque;
  if (typeof item.area === 'number' && item.area > 0) return item.area * qtd;
  if (item.dimensions) {
    const linearMatch = item.dimensions.match(/\(?([0-9.,]+)\s*m\s*linear\)?/i);
    if (linearMatch) { const val = parseFloat(linearMatch[1].replace(',', '.')); if (val > 0) return val * qtd; }
    const m2Match = item.dimensions.match(/\(?([0-9.,]+)\s*m²\)?/i);
    if (m2Match) { const val = parseFloat(m2Match[1].replace(',', '.')); if (val > 0) return val * qtd; }
    const singleMeterMatch = item.dimensions.match(/^([0-9.,]+)\s*m$/i);
    if (singleMeterMatch) { const val = parseFloat(singleMeterMatch[1].replace(',', '.')); if (val > 0) return val * qtd; }
    const whMatch = item.dimensions.match(/^([0-9.,]+)\s*x\s*([0-9.,]+)/i);
    if (whMatch) {
      const w = parseFloat(whMatch[1].replace(',', '.')); const h = parseFloat(whMatch[2].replace(',', '.'));
      if (w > 0 && h > 0) return (w * h) * qtd; if (w > 0) return w * qtd;
    }
  }
  return qtd;
}

export function custoMaterialRealItem(item: LucroSaleItem, custoPorId: Record<string, number>, nomePorId?: Record<string, string>): number {
  const consumos = Array.isArray(item.materiasPrimasConsumidas) ? item.materiasPrimasConsumidas : [];
  if (consumos.length > 0) {
    return consumos.reduce((sum, mp) => {
      const total = Number(mp.totalCost);
      return sum + (Number.isFinite(total) && total >= 0 ? total : (Number(mp.quantity) || 0) * (Number(mp.costPrice) || 0));
    }, 0);
  }
  const nome = item.name || (item.productId && nomePorId ? nomePorId[item.productId] : '') || '';
  if (!isMaterialLonaAdesivo(nome)) return 0;
  const custoUnit = (item.productId && custoPorId[item.productId]) || 0;
  return custoUnit * obterConsumoItem(item);
}

export function custoMaterialLonaAdesivo(items: LucroSaleItem[] | undefined | null, custoPorId: Record<string, number>, nomePorId?: Record<string, string>): number {
  return (items || []).reduce((total, item) => total + custoMaterialRealItem(item, custoPorId, nomePorId), 0);
}

export function custoMaquinaItem(item: LucroSaleItem): number {
  const categoria = item.category || item.categoria || '';
  if (!REGEX_SUBSTRATO.test(categoria)) return 0;
  const metros = obterConsumoItem(item);
  const custoPorMetro = Number(item.custoMaquinaPorMetro);
  const rate = Number.isFinite(custoPorMetro) && custoPorMetro >= 0 ? custoPorMetro : CUSTO_MAQUINA_SUBSTRATO_POR_METRO;
  return metros * rate;
}

export function custoMaquinaTotal(items: LucroSaleItem[] | undefined | null): number {
  return (items || []).reduce((total, item) => total + custoMaquinaItem(item), 0);
}

export function somaCustosExtras(extraCosts?: LucroExtraCost[] | null): number {
  return (extraCosts || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
}

export function custoTotalDaNota(params: { items: LucroSaleItem[] | undefined | null; custoPorId: Record<string, number>; nomePorId?: Record<string, string>; extraCosts?: LucroExtraCost[] | null; proporcao?: number; }): number {
  const custoMaterial = custoMaterialLonaAdesivo(params.items, params.custoPorId, params.nomePorId);
  const custoMaquina = custoMaquinaTotal(params.items);
  const custoExtras = somaCustosExtras(params.extraCosts);
  let total = custoMaterial + custoMaquina + custoExtras;
  if (typeof params.proporcao === 'number' && Number.isFinite(params.proporcao)) total *= params.proporcao;
  return total;
}

export function calcularLucroLiquido(params: { valorRecebido: number; items: LucroSaleItem[] | undefined | null; custoPorId: Record<string, number>; nomePorId?: Record<string, string>; extraCosts?: LucroExtraCost[] | null; proporcao?: number; }): number {
  const custo = custoTotalDaNota(params);
  return params.valorRecebido - custo;
}
