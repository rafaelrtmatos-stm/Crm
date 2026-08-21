// Calculo de Lucro Liquido de uma venda -- usado em Historico de Vendas (POSModule) e no
// Dashboard/Analise Detalhada (DashboardModule), pra garantir que os dois lugares mostrem
// exatamente o mesmo numero.
//
// Regra (simplificada a pedido): o custo de MATERIA-PRIMA de uma nota so considera Lona e
// Adesivo (calculados por m2/metro, como ja acontece pro resto do carrinho). Qualquer outro
// custo da nota -- frete, mao de obra, ferro, tinta, aluguel de andaime, etc -- NUNCA e
// inferido automaticamente do produto: tem que ser lancado manualmente na lista de Custos
// Extras da nota (ExtraCost / coluna custos_extras, ver painel "Custos da Nota" no PDV).
//
//   Lucro = Valor Recebido - (Custo Lona + Custo Adesivo + Soma dos Custos Extras Manuais)

export interface LucroSaleItem {
  productId?: string;
  name?: string;
  quantity: number;
  area?: number;
}

export interface LucroExtraCost {
  amount: number;
}

const REGEX_MATERIAL_LONA_ADESIVO = /lona|adesivo/i;

// Um item so entra no custo de material se o nome do produto contiver "Lona" ou "Adesivo"
// (convencao ja usada em todo o cadastro real de produtos -- ver import_produtos.sql).
export function isMaterialLonaAdesivo(nomeProduto: string | undefined | null): boolean {
  return !!nomeProduto && REGEX_MATERIAL_LONA_ADESIVO.test(nomeProduto);
}

// Custo de material (Lona + Adesivo) de uma lista de itens de venda. custoPorId e o mapa
// produtoId -> cost_price (cadastro de Estoque de Insumos). nomePorId e opcional, usado so
// quando o item nao tem o nome salvo junto (ex.: linha antiga do banco) -- itens de
// SaleOrderItem normalmente ja trazem o nome.
export function custoMaterialLonaAdesivo(
  items: LucroSaleItem[] | undefined | null,
  custoPorId: Record<string, number>,
  nomePorId?: Record<string, string>
): number {
  return (items || []).reduce((total, item) => {
    const nome = item.name || (item.productId && nomePorId ? nomePorId[item.productId] : '') || '';
    if (!isMaterialLonaAdesivo(nome)) return total;
    const custoUnit = (item.productId && custoPorId[item.productId]) || 0;
    const qtd = item.area ? item.area * item.quantity : item.quantity;
    return total + custoUnit * qtd;
  }, 0);
}

// Soma dos custos extras manuais lancados na nota (frete, mao de obra, ferro, tinta, etc).
export function somaCustosExtras(extraCosts?: LucroExtraCost[] | null): number {
  return (extraCosts || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
}

// Custo total de uma nota = custo de material (Lona/Adesivo) + custos extras manuais, com
// opcao de amortizar proporcionalmente ao quanto ja foi de fato recebido (nota parcialmente
// paga nao deve abater o custo cheio, so a fatia correspondente ao que entrou).
export function custoTotalDaNota(params: {
  items: LucroSaleItem[] | undefined | null;
  custoPorId: Record<string, number>;
  nomePorId?: Record<string, string>;
  extraCosts?: LucroExtraCost[] | null;
  proporcao?: number; // 0 a 1 -- ex: downPayment / total, pra nota "pending"
}): number {
  const custoMaterial = custoMaterialLonaAdesivo(params.items, params.custoPorId, params.nomePorId);
  const custoExtras = somaCustosExtras(params.extraCosts);
  let total = custoMaterial + custoExtras;
  if (typeof params.proporcao === 'number' && Number.isFinite(params.proporcao)) {
    total *= params.proporcao;
  }
  return total;
}

// Lucro liquido = valor recebido - custo total da nota (ja com a amortizacao aplicada, se houver).
export function calcularLucroLiquido(params: {
  valorRecebido: number;
  items: LucroSaleItem[] | undefined | null;
  custoPorId: Record<string, number>;
  nomePorId?: Record<string, string>;
  extraCosts?: LucroExtraCost[] | null;
  proporcao?: number;
}): number {
  const custo = custoTotalDaNota(params);
  return params.valorRecebido - custo;
}
