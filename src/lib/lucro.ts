// Calculo de Lucro Liquido de uma venda.
//
// O calculo aceita tanto vendas novas (com snapshot de materias-primas) quanto
// vendas antigas. Para vendas antigas, quando o snapshot nao existe, o sistema
// pode usar os dados atuais do produto e das materias-primas vinculadas.
//
// Lucro = Valor Recebido - (Custo de Material + Custo de Maquina + Custos Extras Manuais)

export interface LucroMaterialConsumption {
  quantity: number;
  costPrice: number;
  totalCost?: number;
  name?: string;
  unit?: string;
}

export interface LucroCurrentMaterial {
  id?: string;
  name?: string;
  unit?: string;
  costPrice?: number;
}

export interface LucroCurrentProduct {
  id?: string;
  name?: string;
  category?: string;
  categoria?: string;
  tipoItem?: string;
  unitType?: string;
  custoMaquinaPorMetro?: number;
  larguraRolo?: number; // Largura do rolo/bobina do produto (m) — usada para converter o custo
                         // de maquina, calculado por m2 no cadastro de Maquinas, para metro linear.
  materiasPrimas?: Array<{
    materiaPrimaId?: string;
    name?: string;
    unit?: string;
    quantity?: number;
    costPrice?: number;
  }>;
}

export interface LucroSaleItem {
  productId?: string;
  name?: string;
  quantity: number;
  area?: number;
  consumoEstoque?: number;
  dimensions?: string;
  category?: string;
  categoria?: string;
  tipoItem?: string;
  unitType?: string;
  materiasPrimasConsumidas?: LucroMaterialConsumption[];
  custoMaquinaPorMetro?: number;
  larguraRolo?: number;
  // Compatibilidade com itens antigos que tenham recebido um snapshot do produto.
  materiasPrimas?: Array<{
    materiaPrimaId?: string;
    name?: string;
    unit?: string;
    quantity?: number;
    costPrice?: number;
  }>;
}

export interface LucroExtraCost { amount: number; date?: string; description?: string; }
export interface LucroNotaBreakdown {
  material: number;
  maquina: number;
  extras: number;
  custoTotal: number;
  valorRecebido: number;
  lucro: number;
}

const REGEX_MATERIAL_LONA_ADESIVO = /lona|adesivo/i;
const REGEX_SUBSTRATO = /substrato/i;
const REGEX_ETIQUETA = /etiqueta/i;
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
    if (linearMatch) {
      const val = parseFloat(linearMatch[1].replace(',', '.'));
      if (val > 0) return val * qtd;
    }

    const m2Match = item.dimensions.match(/\(?([0-9.,]+)\s*m²\)?/i);
    if (m2Match) {
      const val = parseFloat(m2Match[1].replace(',', '.'));
      if (val > 0) return val * qtd;
    }

    const singleMeterMatch = item.dimensions.match(/^([0-9.,]+)\s*m$/i);
    if (singleMeterMatch) {
      const val = parseFloat(singleMeterMatch[1].replace(',', '.'));
      if (val > 0) return val * qtd;
    }

    const whMatch = item.dimensions.match(/^([0-9.,]+)\s*x\s*([0-9.,]+)/i);
    if (whMatch) {
      const w = parseFloat(whMatch[1].replace(',', '.'));
      const h = parseFloat(whMatch[2].replace(',', '.'));
      if (w > 0 && h > 0) return (w * h) * qtd;
      if (w > 0) return w * qtd;
    }
  }

  return qtd;
}

function calcularMateriaisDoProdutoAtual(
  item: LucroSaleItem,
  produtoAtual: LucroCurrentProduct | undefined,
  materiasPrimasAtuais?: Record<string, LucroCurrentMaterial>
): number {
  const materiais = produtoAtual?.materiasPrimas || item.materiasPrimas || [];
  if (!Array.isArray(materiais) || materiais.length === 0) return 0;

  const consumo = obterConsumoItem(item);
  return materiais.reduce((sum, mp) => {
    const materialAtual = mp.materiaPrimaId && materiasPrimasAtuais
      ? materiasPrimasAtuais[mp.materiaPrimaId]
      : undefined;
    const custo = Number(materialAtual?.costPrice ?? mp.costPrice ?? 0);
    const quantidadePorUnidade = Number(mp.quantity ?? 0);
    return sum + (quantidadePorUnidade * consumo * custo);
  }, 0);
}

export function custoMaterialRealItem(
  item: LucroSaleItem,
  custoPorId: Record<string, number>,
  nomePorId?: Record<string, string>,
  produtoPorId?: Record<string, LucroCurrentProduct>,
  materiasPrimasAtuais?: Record<string, LucroCurrentMaterial>
): number {
  const produtoAtual = item.productId && produtoPorId ? produtoPorId[item.productId] : undefined;
  const categoria = item.category || item.categoria || produtoAtual?.category || produtoAtual?.categoria || '';
  const isSubstrato = REGEX_SUBSTRATO.test(categoria);

  // Custo de materia-prima agregada (ex: Adesivo Vinil): vendas novas usam o snapshot gravado
  // no momento da venda; vendas antigas (sem snapshot) recalculam com os dados atuais do produto.
  const consumos = Array.isArray(item.materiasPrimasConsumidas) ? item.materiasPrimasConsumidas : [];
  const custoMateriaPrima = consumos.length > 0
    ? consumos.reduce((sum, mp) => {
        const total = Number(mp.totalCost);
        return sum + (Number.isFinite(total) && total >= 0
          ? total
          : (Number(mp.quantity) || 0) * (Number(mp.costPrice) || 0));
      }, 0)
    : calcularMateriaisDoProdutoAtual(item, produtoAtual, materiasPrimasAtuais);

  // Regra de SUBSTRATO (lona/vinil/papel): o custo de compra do proprio produto (preco de custo
  // cadastrado, por metro linear) sempre entra na conta, somado ao custo de materia-prima agregada
  // — nao e mais "um ou outro". Ver detalhamento acordado com o usuario em conversa de suporte.
  if (isSubstrato) {
    const custoUnitProprio = (item.productId && custoPorId[item.productId]) || 0;
    const custoCompraSubstrato = custoUnitProprio * obterConsumoItem(item);
    return custoCompraSubstrato + custoMateriaPrima;
  }

  // Demais categorias: mantem o comportamento anterior (matéria-prima vinculada tem prioridade;
  // sem matéria-prima vinculada, cai no fallback legado por nome "lona/adesivo").
  if (custoMateriaPrima > 0) return custoMateriaPrima;

  const nome = item.name || produtoAtual?.name || (item.productId && nomePorId ? nomePorId[item.productId] : '') || '';
  if (!isMaterialLonaAdesivo(nome)) return 0;
  const custoUnit = (item.productId && custoPorId[item.productId]) || 0;
  return custoUnit * obterConsumoItem(item);
}

export function custoMaterialLonaAdesivo(
  items: LucroSaleItem[] | undefined | null,
  custoPorId: Record<string, number>,
  nomePorId?: Record<string, string>,
  produtoPorId?: Record<string, LucroCurrentProduct>,
  materiasPrimasAtuais?: Record<string, LucroCurrentMaterial>
): number {
  return (items || []).reduce(
    (total, item) => total + custoMaterialRealItem(item, custoPorId, nomePorId, produtoPorId, materiasPrimasAtuais),
    0
  );
}

export function custoMaquinaItem(
  item: LucroSaleItem,
  produtoAtual?: LucroCurrentProduct,
  custoMaquinaM2PorCategoria?: Record<string, number>
): number {
  const categoria = item.category || item.categoria || produtoAtual?.category || produtoAtual?.categoria || '';
  const tipo = item.tipoItem || produtoAtual?.tipoItem || '';
  const unidade = item.unitType || produtoAtual?.unitType || '';
  const nome = item.name || produtoAtual?.name || '';

  // Em notas antigas a categoria pode nao ter sido salva no item. Etiqueta de
  // servico/metro continua sendo reconhecida como substrato para o custo da maquina.
  const isSubstrato = REGEX_SUBSTRATO.test(categoria)
    || (REGEX_ETIQUETA.test(nome) && (/metro|etiqueta/i.test(unidade) || /servi/i.test(tipo)));

  if (!isSubstrato) return 0;

  const metros = obterConsumoItem(item);

  // 1) Preferencial: custo real da maquina cadastrada para essa categoria (Modulo Maquinas),
  //    calculado por m2 e convertido para metro linear pela largura do rolo do produto.
  const categoriaChave = categoria.trim().toUpperCase();
  const custoM2Maquina = categoriaChave && custoMaquinaM2PorCategoria
    ? custoMaquinaM2PorCategoria[categoriaChave]
    : undefined;

  if (Number.isFinite(custoM2Maquina) && (custoM2Maquina as number) >= 0) {
    const larguraRolo = Number(produtoAtual?.larguraRolo ?? item.larguraRolo) || 1;
    return metros * (custoM2Maquina as number) * larguraRolo;
  }

  // 2) Compatibilidade: custo manual informado no item/produto (quando nao ha maquina
  //    cadastrada para a categoria ainda).
  const custoPorMetro = Number(item.custoMaquinaPorMetro ?? produtoAtual?.custoMaquinaPorMetro);
  const rate = Number.isFinite(custoPorMetro) && custoPorMetro >= 0
    ? custoPorMetro
    : CUSTO_MAQUINA_SUBSTRATO_POR_METRO; // 3) Ultimo fallback: valor fixo legado.
  return metros * rate;
}

export function custoMaquinaTotal(
  items: LucroSaleItem[] | undefined | null,
  produtoPorId?: Record<string, LucroCurrentProduct>,
  custoMaquinaM2PorCategoria?: Record<string, number>
): number {
  return (items || []).reduce((total, item) => {
    const produtoAtual = item.productId && produtoPorId ? produtoPorId[item.productId] : undefined;
    return total + custoMaquinaItem(item, produtoAtual, custoMaquinaM2PorCategoria);
  }, 0);
}

export function somaCustosExtras(extraCosts?: LucroExtraCost[] | null): number {
  return (extraCosts || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
}

export function detalharCustoDaNota(params: {
  items: LucroSaleItem[] | undefined | null;
  custoPorId: Record<string, number>;
  nomePorId?: Record<string, string>;
  produtoPorId?: Record<string, LucroCurrentProduct>;
  materiasPrimasAtuais?: Record<string, LucroCurrentMaterial>;
  custoMaquinaM2PorCategoria?: Record<string, number>;
  extraCosts?: LucroExtraCost[] | null;
  proporcao?: number;
  valorRecebido?: number;
}): LucroNotaBreakdown {
  const custoMaterial = custoMaterialLonaAdesivo(
    params.items,
    params.custoPorId,
    params.nomePorId,
    params.produtoPorId,
    params.materiasPrimasAtuais
  );
  const custoMaquina = custoMaquinaTotal(params.items, params.produtoPorId, params.custoMaquinaM2PorCategoria);
  const custoExtras = somaCustosExtras(params.extraCosts);
  const proporcao = typeof params.proporcao === 'number' && Number.isFinite(params.proporcao)
    ? params.proporcao
    : 1;
  const custoTotal = (custoMaterial + custoMaquina + custoExtras) * proporcao;
  const valorRecebido = Number(params.valorRecebido) || 0;

  return {
    material: custoMaterial * proporcao,
    maquina: custoMaquina * proporcao,
    extras: custoExtras * proporcao,
    custoTotal,
    valorRecebido,
    lucro: valorRecebido - custoTotal,
  };
}

export function custoTotalDaNota(params: {
  items: LucroSaleItem[] | undefined | null;
  custoPorId: Record<string, number>;
  nomePorId?: Record<string, string>;
  produtoPorId?: Record<string, LucroCurrentProduct>;
  materiasPrimasAtuais?: Record<string, LucroCurrentMaterial>;
  custoMaquinaM2PorCategoria?: Record<string, number>;
  extraCosts?: LucroExtraCost[] | null;
  proporcao?: number;
}): number {
  return detalharCustoDaNota(params).custoTotal;
}

export function calcularLucroLiquido(params: {
  valorRecebido: number;
  items: LucroSaleItem[] | undefined | null;
  custoPorId: Record<string, number>;
  nomePorId?: Record<string, string>;
  produtoPorId?: Record<string, LucroCurrentProduct>;
  materiasPrimasAtuais?: Record<string, LucroCurrentMaterial>;
  custoMaquinaM2PorCategoria?: Record<string, number>;
  extraCosts?: LucroExtraCost[] | null;
  proporcao?: number;
}): number {
  return detalharCustoDaNota(params).lucro;
}
