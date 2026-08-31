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
  consumoEstoque?: number;
  dimensions?: string;
}

export interface LucroExtraCost {
  amount: number;
  date?: string;
  description?: string;
}

const REGEX_MATERIAL_LONA_ADESIVO = /lona|adesivo/i;

// Um item so entra no custo de material se o nome do produto contiver "Lona" ou "Adesivo"
// (convencao ja usada em todo o cadastro real de produtos -- ver import_produtos.sql).
export function isMaterialLonaAdesivo(nomeProduto: string | undefined | null): boolean {
  return !!nomeProduto && REGEX_MATERIAL_LONA_ADESIVO.test(nomeProduto);
}

/**
 * Calcula a metragem/quantidade real consumida de um item (metro linear, m² ou unidades).
 * Ex: Adesivo de 0,50m consumirá 0,50 metros lineares. Se o custo do metro for R$ 14,42,
 * o custo de matéria-prima será 0,50 * 14,42 = R$ 7,21.
 */
export function obterConsumoItem(item: LucroSaleItem): number {
  const qtd = item.quantity || 1;

  // 1. Se consumoEstoque está gravado diretamente
  if (typeof item.consumoEstoque === 'number' && item.consumoEstoque > 0) {
    return item.consumoEstoque;
  }

  // 2. Se area está gravada diretamente (m² ou comprimento do metro linear)
  if (typeof item.area === 'number' && item.area > 0) {
    return item.area * qtd;
  }

  // 3. Extrair da string de dimensões se existir (ex: "0,50m", "(0,50m linear)", "0,50x1,00", "0.50m x 2.00m (1.00m²)")
  if (item.dimensions) {
    const dimStr = item.dimensions;

    // Ex: "0,50x1,00 (0,50m linear)" ou "(0.50m linear)"
    const linearMatch = dimStr.match(/\(?([0-9.,]+)\s*m\s*linear\)?/i);
    if (linearMatch) {
      const val = parseFloat(linearMatch[1].replace(',', '.'));
      if (val > 0) return val * qtd;
    }

    // Ex: "1.00m x 2.00m (2.00m²)"
    const m2Match = dimStr.match(/\(?([0-9.,]+)\s*m²\)?/i);
    if (m2Match) {
      const val = parseFloat(m2Match[1].replace(',', '.'));
      if (val > 0) return val * qtd;
    }

    // Ex: "0,50m" ou "0.50m"
    const singleMeterMatch = dimStr.match(/^([0-9.,]+)\s*m$/i);
    if (singleMeterMatch) {
      const val = parseFloat(singleMeterMatch[1].replace(',', '.'));
      if (val > 0) return val * qtd;
    }

    // Ex: "0,50x1,00" ou "0.50x1.00"
    const whMatch = dimStr.match(/^([0-9.,]+)\s*x\s*([0-9.,]+)/i);
    if (whMatch) {
      const w = parseFloat(whMatch[1].replace(',', '.'));
      const h = parseFloat(whMatch[2].replace(',', '.'));
      if (w > 0 && h > 0) {
        return (w * h) * qtd;
      } else if (w > 0) {
        return w * qtd;
      }
    }
  }

  // Fallback: quantidade padrão de unidades
  return qtd;
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
    const consumo = obterConsumoItem(item);
    return total + custoUnit * consumo;
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
