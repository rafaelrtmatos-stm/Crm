import { Maquina, calcularCustosMaquina } from '../types';

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
  costPrice?: number;
  maquinaId?: string;
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
  maquinaId?: string;
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
  substrato: number;
  materiaPrima: number;
  tinta: number;
  maquina: number;
  material: number; // mantido para compatibilidade: substrato + materiaPrima
  extras: number;
  custoTotal: number;
  valorRecebido: number;
  lucro: number;
  tintaMlTotal?: number;
  areaM2Total?: number;
}

export interface LucroItemBreakdown {
  custoSubstrato: number;
  custoMateriaPrima: number;
  custoTinta: number;
  custoMaquina: number;
  custoTotal: number;
  tintaMl?: number;
  areaM2?: number;
  maquinaNome?: string;
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

export function isItemImpressoOuSubstrato(
  item: LucroSaleItem,
  produtoAtual?: LucroCurrentProduct
): boolean {
  const categoria = (item.category || item.categoria || produtoAtual?.category || produtoAtual?.categoria || '').trim().toLowerCase();
  const nome = (item.name || produtoAtual?.name || '').trim().toLowerCase();
  const tipo = (item.tipoItem || produtoAtual?.tipoItem || '').trim().toLowerCase();
  const unidade = (item.unitType || produtoAtual?.unitType || '').trim().toLowerCase();

  // 1. Categoria ou nome indicam substrato / produto impresso
  if (/substrato|lona|adesivo|vinil|banner|faixa|placa|impress|etiqueta|canvas|papel|perfurado|blackout|frontlight|backlight/i.test(categoria)) {
    return true;
  }
  if (/lona|adesivo|vinil|banner|faixa|placa|impress|etiqueta|canvas|perfurado|blackout|frontlight|backlight/i.test(nome)) {
    return true;
  }
  // 2. Se tem dimensões informadas (ex: 60x90, 1.2x0.8, 100un 8x8cm)
  if (item.dimensions && item.dimensions.trim().length > 0) {
    return true;
  }
  // 3. Se tem área calculada maior que zero
  if (typeof item.area === 'number' && item.area > 0) {
    return true;
  }
  // 4. Se tem máquina vinculada
  if (item.maquinaId || produtoAtual?.maquinaId) {
    return true;
  }
  // 5. Unidade m2 ou metro
  if (unidade === 'm2' || unidade === 'm' || unidade === 'rolo') {
    return true;
  }
  return false;
}

export function obterAreaImpressaoM2(
  item: LucroSaleItem,
  produtoAtual?: LucroCurrentProduct
): number {
  const qtd = item.quantity || 1;
  const larguraRolo = Number(produtoAtual?.larguraRolo ?? item.larguraRolo) || 1.06;

  // 1. Se tem area explícita no item
  if (typeof item.area === 'number' && item.area > 0) {
    return Number((item.area * qtd).toFixed(4));
  }

  // 2. Extrair das dimensions
  if (item.dimensions) {
    const dim = item.dimensions.trim();

    // Formato: "100un 8x8cm" ou "50 un 10x15 cm"
    const etiquetaMatch = dim.match(/(\d+)\s*un.*?(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s*cm/i);
    if (etiquetaMatch) {
      const qEtiquetas = parseFloat(etiquetaMatch[1]);
      const wCm = parseFloat(etiquetaMatch[2].replace(',', '.'));
      const hCm = parseFloat(etiquetaMatch[3].replace(',', '.'));
      if (qEtiquetas > 0 && wCm > 0 && hCm > 0) {
        return Number(((qEtiquetas * (wCm / 100) * (hCm / 100)) * qtd).toFixed(4));
      }
    }

    // Formato m² explícito: "(1,50 m²)" ou "1.5m²"
    const m2Match = dim.match(/\(?([0-9.,]+)\s*m²\)?/i);
    if (m2Match) {
      const val = parseFloat(m2Match[1].replace(',', '.'));
      if (val > 0) return Number((val * qtd).toFixed(4));
    }

    // Formato AxB ou AxBcm ou AxBm, suportando formatos compostos ou texto adjacente (ex: "9,1x1 (9,10m linear)" ou "1.2x0.8 + 0.5x0.5")
    // Deve ser verificado antes do fallback puramente linear, pois o corte físico (largura x altura) determina a área real de impressão
    const partes = dim.split('+');
    let somaAreaMultiplas = 0;
    let encontrouValido = false;
    for (const p of partes) {
      const m = p.match(/([0-9]+(?:[.,][0-9]+)?)\s*(cm|m)?\s*x\s*([0-9]+(?:[.,][0-9]+)?)\s*(cm|m)?/i);
      if (m) {
        const rawW = parseFloat(m[1].replace(',', '.'));
        const unitW = (m[2] || '').toLowerCase();
        const rawH = parseFloat(m[3].replace(',', '.'));
        const unitH = (m[4] || '').toLowerCase();
        if (rawW > 0 && rawH > 0) {
          const isCm = unitW === 'cm' || unitH === 'cm' || dim.toLowerCase().includes('cm') || (rawW > 10 && rawH > 10 && !dim.toLowerCase().includes('m'));
          const w = isCm ? rawW / 100 : rawW;
          const h = isCm ? rawH / 100 : rawH;
          somaAreaMultiplas += (w * h);
          encontrouValido = true;
        }
      }
    }
    if (encontrouValido && somaAreaMultiplas > 0) {
      return Number((somaAreaMultiplas * qtd).toFixed(4));
    }

    // Formato: "0,80m linear" ou "(1,20m linear)" caso não haja medidas AxB explícitas
    const linearMatch = dim.match(/\(?([0-9.,]+)\s*m\s*linear\)?/i);
    if (linearMatch) {
      const metros = parseFloat(linearMatch[1].replace(',', '.'));
      if (metros > 0) {
        return Number((metros * larguraRolo * qtd).toFixed(4));
      }
    }
  }

  // 3. Se tem consumoEstoque
  if (typeof item.consumoEstoque === 'number' && item.consumoEstoque > 0) {
    const unidade = item.unitType || produtoAtual?.unitType || '';
    if (unidade === 'm2') {
      return Number(item.consumoEstoque.toFixed(4));
    }
    return Number((item.consumoEstoque * larguraRolo).toFixed(4));
  }

  // 4. Se a unidade do produto for m2
  const unidadeProd = item.unitType || produtoAtual?.unitType || '';
  if (unidadeProd === 'm2') {
    return Number(qtd.toFixed(4));
  }

  return Number(qtd.toFixed(4));
}

export function obterMaquinaDoItem(
  item: LucroSaleItem,
  produtoAtual?: LucroCurrentProduct,
  maquinas?: Maquina[],
  maquinaPadrao?: Maquina,
  maquinasPorId?: Record<string, Maquina>,
  maquinasPorCategoria?: Record<string, Maquina>,
  produtoPorId?: Record<string, LucroCurrentProduct>
): Maquina | undefined {
  const mId = item.maquinaId || produtoAtual?.maquinaId;
  if (mId && maquinasPorId && maquinasPorId[mId]) {
    return maquinasPorId[mId];
  }
  if (mId && maquinas) {
    const found = maquinas.find(m => m.id === mId);
    if (found) return found;
  }

  // Se não achou na máquina do produto direto, verifica se tem máquina cadastrada nas matérias-primas vinculadas (substrato)
  if (!mId && (produtoAtual?.materiasPrimas || item.materiasPrimasConsumidas)) {
    const list = produtoAtual?.materiasPrimas || [];
    for (const mp of list) {
      if (mp.materiaPrimaId && produtoPorId && produtoPorId[mp.materiaPrimaId]) {
        const matProd = produtoPorId[mp.materiaPrimaId];
        if (matProd?.maquinaId) {
          const found = (maquinasPorId && maquinasPorId[matProd.maquinaId]) || (maquinas && maquinas.find(m => m.id === matProd.maquinaId));
          if (found) return found;
        }
      }
    }
  }

  const categoria = (item.category || item.categoria || produtoAtual?.category || produtoAtual?.categoria || '').trim().toUpperCase();
  if (categoria && maquinasPorCategoria && maquinasPorCategoria[categoria]) {
    return maquinasPorCategoria[categoria];
  }

  if (maquinaPadrao) return maquinaPadrao;

  if (maquinas && maquinas.length > 0) {
    const porCatSubstrato = maquinas.find(m => m.ativa && m.categoriaProduto && /substrato/i.test(m.categoriaProduto));
    if (porCatSubstrato) return porCatSubstrato;

    const impressaoAtiva = maquinas.find(m => m.ativa && m.tipo === 'impressao');
    if (impressaoAtiva) return impressaoAtiva;

    const qualquerAtiva = maquinas.find(m => m.ativa);
    if (qualquerAtiva) return qualquerAtiva;

    return maquinas[0];
  }

  return undefined;
}

export function custoSubstratoItem(
  item: LucroSaleItem,
  custoPorId: Record<string, number>,
  nomePorId?: Record<string, string>,
  produtoPorId?: Record<string, LucroCurrentProduct>,
  materiasPrimasAtuais?: Record<string, LucroCurrentMaterial>
): number {
  const produtoAtual = item.productId && produtoPorId ? produtoPorId[item.productId] : undefined;
  const isImpresso = isItemImpressoOuSubstrato(item, produtoAtual);
  const consumo = obterConsumoItem(item);

  // 1. Matérias-primas cadastradas têm PRIORIDADE MÁXIMA de cálculo!
  // Se o produto ou item tem matérias-primas vinculadas (substrato/bobina),
  // o cálculo DEVE ser: (custo da matéria prima) x consumo (ex: 2,10m linear)
  const consumos = Array.isArray(item.materiasPrimasConsumidas) ? item.materiasPrimasConsumidas : [];
  if (consumos.length > 0) {
    const mpSubstrato = consumos.find(c => /m|rolo/i.test(c.unit || '') || /lona|adesivo|vinil|papel|banner|frontlight|backlight/i.test(c.name || ''));
    if (mpSubstrato) {
      const materialAtual = (mpSubstrato as any).materiaPrimaId && materiasPrimasAtuais
        ? materiasPrimasAtuais[(mpSubstrato as any).materiaPrimaId]
        : undefined;
      const custo = Number(materialAtual?.costPrice ?? mpSubstrato.costPrice ?? 0);
      const total = Number(mpSubstrato.totalCost);
      return Number.isFinite(total) && total > 0 ? total : (Number(mpSubstrato.quantity) || 1) * consumo * custo;
    }
  }

  const materiaisProd = produtoAtual?.materiasPrimas || item.materiasPrimas || [];
  if (materiaisProd.length > 0) {
    const mpSubstrato = materiaisProd.find(m => /m|rolo/i.test(m.unit || '') || /lona|adesivo|vinil|papel|banner|frontlight|backlight/i.test(m.name || ''));
    if (mpSubstrato) {
      const materialAtual = (mpSubstrato as any).materiaPrimaId && materiasPrimasAtuais
        ? materiasPrimasAtuais[(mpSubstrato as any).materiaPrimaId]
        : undefined;
      const custo = Number(materialAtual?.costPrice ?? mpSubstrato.costPrice ?? 0);
      const qtdUnitaria = Number(mpSubstrato.quantity ?? 1);
      return qtdUnitaria * consumo * custo;
    }
  }

  // 2. Fallback: Se for item impresso/substrato sem matérias-primas cadastradas,
  // mas o próprio produto tem custo de compra/custo unitário
  const custoUnitProprio = (item.productId && custoPorId[item.productId]) || Number(produtoAtual?.costPrice) || 0;
  if (custoUnitProprio > 0 && isImpresso) {
    return custoUnitProprio * consumo;
  }

  // 3. Se for reconhecido como produto impresso sem custo preenchido, mas tem nome reconhecido
  const nome = item.name || produtoAtual?.name || (item.productId && nomePorId ? nomePorId[item.productId] : '') || '';
  if (isMaterialLonaAdesivo(nome)) {
    const custoUnit = (item.productId && custoPorId[item.productId]) || 0;
    return custoUnit * consumo;
  }

  return 0;
}

export function custoMateriaPrimaItem(
  item: LucroSaleItem,
  produtoPorId?: Record<string, LucroCurrentProduct>,
  materiasPrimasAtuais?: Record<string, LucroCurrentMaterial>,
  custoSubstratoJaCalculado = 0
): number {
  const produtoAtual = item.productId && produtoPorId ? produtoPorId[item.productId] : undefined;
  const consumos = Array.isArray(item.materiasPrimasConsumidas) ? item.materiasPrimasConsumidas : [];
  const consumo = obterConsumoItem(item);

  if (consumos.length > 0) {
    const deduzirSubstrato = custoSubstratoJaCalculado > 0;

    return consumos.reduce((sum, mp) => {
      if (deduzirSubstrato && (/m|rolo/i.test(mp.unit || '') || /lona|adesivo|vinil|papel|banner/i.test(mp.name || ''))) {
        return sum;
      }
      const materialAtual = (mp as any).materiaPrimaId && materiasPrimasAtuais
        ? materiasPrimasAtuais[(mp as any).materiaPrimaId]
        : undefined;
      const custo = Number(materialAtual?.costPrice ?? mp.costPrice ?? 0);
      const total = Number(mp.totalCost);
      return sum + (Number.isFinite(total) && total > 0
        ? total
        : (Number(mp.quantity) || 1) * consumo * custo);
    }, 0);
  }

  const materiais = produtoAtual?.materiasPrimas || item.materiasPrimas || [];

  if (Array.isArray(materiais) && materiais.length > 0) {
    const deduzirSubstrato = custoSubstratoJaCalculado > 0;

    return materiais.reduce((sum, mp) => {
      if (deduzirSubstrato && (/m|rolo/i.test(mp.unit || '') || /lona|adesivo|vinil|papel|banner/i.test(mp.name || ''))) {
        return sum;
      }
      const materialAtual = mp.materiaPrimaId && materiasPrimasAtuais
        ? materiasPrimasAtuais[mp.materiaPrimaId]
        : undefined;
      const custo = Number(materialAtual?.costPrice ?? mp.costPrice ?? 0);
      const quantidadePorUnidade = Number(mp.quantity ?? 1);
      return sum + (quantidadePorUnidade * consumo * custo);
    }, 0);
  }

  // Se o item não tem matérias-primas vinculadas e não teve custo de substrato alocado,
  // mas possui custo unitário cadastrado (ex: produto acabado, insumo direto), conta aqui como matéria-prima
  const custoUnitProprio = Number(produtoAtual?.costPrice ?? (item as any)?.costPrice ?? 0);
  if (custoSubstratoJaCalculado === 0 && custoUnitProprio > 0) {
    return custoUnitProprio * consumo;
  }

  return 0;
}

export function custoTintaItem(
  item: LucroSaleItem,
  produtoAtual?: LucroCurrentProduct,
  custoTintaM2PorCategoria?: Record<string, number>,
  maquinaObj?: Maquina,
  consumoTintaMlM2PorCategoria?: Record<string, number>
): number {
  return custoTintaItemDetalhado(item, produtoAtual, custoTintaM2PorCategoria, maquinaObj, consumoTintaMlM2PorCategoria).custo;
}

export function custoTintaItemDetalhado(
  item: LucroSaleItem,
  produtoAtual?: LucroCurrentProduct,
  custoTintaM2PorCategoria?: Record<string, number>,
  maquinaObj?: Maquina,
  consumoTintaMlM2PorCategoria?: Record<string, number>
): { custo: number; ml: number; custoPorM2: number } {
  const isImpresso = isItemImpressoOuSubstrato(item, produtoAtual);
  if (!isImpresso) return { custo: 0, ml: 0, custoPorM2: 0 };

  const areaM2 = obterAreaImpressaoM2(item, produtoAtual);
  if (areaM2 <= 0) return { custo: 0, ml: 0, custoPorM2: 0 };

  if (maquinaObj) {
    const calculos = calcularCustosMaquina(maquinaObj, maquinaObj.tarifaKwh);
    const consumoMlM2 = Number(maquinaObj.tintaConsumoMlM2) > 0 ? Number(maquinaObj.tintaConsumoMlM2) : 15;
    const custoPorMl = (Number(maquinaObj.tintaQuantidadeMl) > 0 && Number(maquinaObj.tintaValor) > 0)
      ? Number(maquinaObj.tintaValor) / Number(maquinaObj.tintaQuantidadeMl)
      : 0.18;
    const custoTintaM2 = calculos.custoTintaM2 > 0 ? calculos.custoTintaM2 : (consumoMlM2 * custoPorMl);
    const ml = Number((areaM2 * consumoMlM2).toFixed(1));
    const custo = Number((areaM2 * custoTintaM2).toFixed(2));
    return { custo, ml, custoPorM2: custoTintaM2 };
  }

  const categoria = (item.category || item.categoria || produtoAtual?.category || produtoAtual?.categoria || '').trim().toUpperCase();
  const custoM2Tinta = (categoria && custoTintaM2PorCategoria && custoTintaM2PorCategoria[categoria] !== undefined && custoTintaM2PorCategoria[categoria] > 0)
    ? custoTintaM2PorCategoria[categoria]
    : (custoTintaM2PorCategoria?.['SUBSTRATO'] ?? 2.70);

  const consumoMlM2 = (categoria && consumoTintaMlM2PorCategoria && consumoTintaMlM2PorCategoria[categoria] !== undefined && consumoTintaMlM2PorCategoria[categoria] > 0)
    ? consumoTintaMlM2PorCategoria[categoria]
    : (consumoTintaMlM2PorCategoria?.['SUBSTRATO'] ?? consumoTintaMlM2PorCategoria?.['PADRAO'] ?? 15);

  const ml = Number((areaM2 * consumoMlM2).toFixed(1));
  const custo = Number((areaM2 * custoM2Tinta).toFixed(2));
  return { custo, ml, custoPorM2: custoM2Tinta };
}

export function custoMaquinaOperacionalItem(
  item: LucroSaleItem,
  produtoAtual?: LucroCurrentProduct,
  custoMaquinaOperacionalM2PorCategoria?: Record<string, number>,
  custoMaquinaM2PorCategoria?: Record<string, number>,
  maquinaObj?: Maquina
): number {
  const isImpresso = isItemImpressoOuSubstrato(item, produtoAtual);
  if (!isImpresso) return 0;

  const areaM2 = obterAreaImpressaoM2(item, produtoAtual);
  if (areaM2 <= 0) return 0;

  if (maquinaObj) {
    const calculos = calcularCustosMaquina(maquinaObj, maquinaObj.tarifaKwh);
    const custoM2 = calculos.custoOperacionalM2 > 0
      ? calculos.custoOperacionalM2
      : (calculos.custoTotalMaquinaM2 > calculos.custoTintaM2
          ? calculos.custoTotalMaquinaM2 - calculos.custoTintaM2
          : 4.50);
    return Number((areaM2 * custoM2).toFixed(2));
  }

  const categoria = (item.category || item.categoria || produtoAtual?.category || produtoAtual?.categoria || '').trim().toUpperCase();
  const custoM2Op = (categoria && custoMaquinaOperacionalM2PorCategoria && custoMaquinaOperacionalM2PorCategoria[categoria] !== undefined && custoMaquinaOperacionalM2PorCategoria[categoria] > 0)
    ? custoMaquinaOperacionalM2PorCategoria[categoria]
    : (custoMaquinaOperacionalM2PorCategoria?.['SUBSTRATO']);

  if (Number.isFinite(custoM2Op) && (custoM2Op as number) > 0) {
    return Number((areaM2 * (custoM2Op as number)).toFixed(2));
  }

  const custoM2Tot = (categoria && custoMaquinaM2PorCategoria && custoMaquinaM2PorCategoria[categoria] !== undefined && custoMaquinaM2PorCategoria[categoria] > 0)
    ? custoMaquinaM2PorCategoria[categoria]
    : (custoMaquinaM2PorCategoria?.['SUBSTRATO']);
  if (Number.isFinite(custoM2Tot) && (custoM2Tot as number) > 0) {
    const custoM2Estimado = Math.max(1, (custoM2Tot as number) - 2.70);
    return Number((areaM2 * custoM2Estimado).toFixed(2));
  }

  const larguraRolo = Number(produtoAtual?.larguraRolo ?? item.larguraRolo) || 1.06;
  const custoPorMetro = Number(item.custoMaquinaPorMetro ?? produtoAtual?.custoMaquinaPorMetro);
  const rateM2 = Number.isFinite(custoPorMetro) && custoPorMetro > 0
    ? custoPorMetro / larguraRolo
    : (CUSTO_MAQUINA_SUBSTRATO_POR_METRO / larguraRolo);
  return Number((areaM2 * rateM2).toFixed(2));
}

export function detalharCustosItem(params: {
  item: LucroSaleItem;
  custoPorId: Record<string, number>;
  nomePorId?: Record<string, string>;
  produtoPorId?: Record<string, LucroCurrentProduct>;
  materiasPrimasAtuais?: Record<string, LucroCurrentMaterial>;
  custoMaquinaOperacionalM2PorCategoria?: Record<string, number>;
  custoTintaM2PorCategoria?: Record<string, number>;
  custoMaquinaM2PorCategoria?: Record<string, number>;
  consumoTintaMlM2PorCategoria?: Record<string, number>;
  maquinas?: Maquina[];
  maquinaPadrao?: Maquina;
  maquinasPorId?: Record<string, Maquina>;
  maquinasPorCategoria?: Record<string, Maquina>;
}): LucroItemBreakdown {
  const produtoAtual = params.item.productId && params.produtoPorId ? params.produtoPorId[params.item.productId] : undefined;
  const maquina = obterMaquinaDoItem(
    params.item,
    produtoAtual,
    params.maquinas,
    params.maquinaPadrao,
    params.maquinasPorId,
    params.maquinasPorCategoria,
    params.produtoPorId
  );

  const custoSubstrato = custoSubstratoItem(params.item, params.custoPorId, params.nomePorId, params.produtoPorId, params.materiasPrimasAtuais);
  const custoOutrasMateriasPrimas = custoMateriaPrimaItem(params.item, params.produtoPorId, params.materiasPrimasAtuais, custoSubstrato);
  // Matéria-Prima unificada: substratos (lonas, vinis, papéis, etc.) são uma categoria de matéria-prima
  const custoMateriaPrima = Number((custoSubstrato + custoOutrasMateriasPrimas).toFixed(2));
  const tintaDetalhe = custoTintaItemDetalhado(
    params.item,
    produtoAtual,
    params.custoTintaM2PorCategoria,
    maquina,
    params.consumoTintaMlM2PorCategoria
  );
  const custoMaquina = custoMaquinaOperacionalItem(
    params.item,
    produtoAtual,
    params.custoMaquinaOperacionalM2PorCategoria,
    params.custoMaquinaM2PorCategoria,
    maquina
  );
  const areaM2 = obterAreaImpressaoM2(params.item, produtoAtual);

  return {
    custoSubstrato: Number(custoSubstrato.toFixed(2)),
    custoMateriaPrima,
    custoTinta: Number(tintaDetalhe.custo.toFixed(2)),
    custoMaquina: Number(custoMaquina.toFixed(2)),
    custoTotal: Number((custoMateriaPrima + tintaDetalhe.custo + custoMaquina).toFixed(2)),
    tintaMl: tintaDetalhe.ml,
    areaM2,
    maquinaNome: maquina?.nome
  };
}

export function custoMaterialRealItem(
  item: LucroSaleItem,
  custoPorId: Record<string, number>,
  nomePorId?: Record<string, string>,
  produtoPorId?: Record<string, LucroCurrentProduct>,
  materiasPrimasAtuais?: Record<string, LucroCurrentMaterial>
): number {
  return custoSubstratoItem(item, custoPorId, nomePorId, produtoPorId, materiasPrimasAtuais) +
    custoMateriaPrimaItem(item, produtoPorId, materiasPrimasAtuais);
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
  return (extraCosts || []).reduce((sum, c: any) => sum + (Number(c?.amount ?? c?.valor ?? c?.value) || 0), 0);
}

export function detalharCustoDaNota(params: {
  items: LucroSaleItem[] | undefined | null;
  custoPorId: Record<string, number>;
  nomePorId?: Record<string, string>;
  produtoPorId?: Record<string, LucroCurrentProduct>;
  materiasPrimasAtuais?: Record<string, LucroCurrentMaterial>;
  custoMaquinaM2PorCategoria?: Record<string, number>;
  custoMaquinaOperacionalM2PorCategoria?: Record<string, number>;
  custoTintaM2PorCategoria?: Record<string, number>;
  consumoTintaMlM2PorCategoria?: Record<string, number>;
  maquinas?: Maquina[];
  maquinaPadrao?: Maquina;
  maquinasPorId?: Record<string, Maquina>;
  maquinasPorCategoria?: Record<string, Maquina>;
  extraCosts?: LucroExtraCost[] | null;
  proporcao?: number;
  valorRecebido?: number;
}): LucroNotaBreakdown {
  const items = params.items || [];
  let totalSubstrato = 0;
  let totalMateriaPrima = 0;
  let totalTinta = 0;
  let totalMaquina = 0;
  let totalTintaMl = 0;
  let totalAreaM2 = 0;

  for (const item of items) {
    const itemBreakdown = detalharCustosItem({
      item,
      custoPorId: params.custoPorId,
      nomePorId: params.nomePorId,
      produtoPorId: params.produtoPorId,
      materiasPrimasAtuais: params.materiasPrimasAtuais,
      custoMaquinaOperacionalM2PorCategoria: params.custoMaquinaOperacionalM2PorCategoria,
      custoTintaM2PorCategoria: params.custoTintaM2PorCategoria,
      custoMaquinaM2PorCategoria: params.custoMaquinaM2PorCategoria,
      consumoTintaMlM2PorCategoria: params.consumoTintaMlM2PorCategoria,
      maquinas: params.maquinas,
      maquinaPadrao: params.maquinaPadrao,
      maquinasPorId: params.maquinasPorId,
      maquinasPorCategoria: params.maquinasPorCategoria
    });

    totalSubstrato += itemBreakdown.custoSubstrato;
    totalMateriaPrima += itemBreakdown.custoMateriaPrima;
    totalTinta += itemBreakdown.custoTinta;
    totalMaquina += itemBreakdown.custoMaquina;
    totalTintaMl += itemBreakdown.tintaMl || 0;
    totalAreaM2 += itemBreakdown.areaM2 || 0;
  }

  const custoExtras = somaCustosExtras(params.extraCosts);
  const proporcao = typeof params.proporcao === 'number' && Number.isFinite(params.proporcao)
    ? params.proporcao
    : 1;

  const substrato = Number((totalSubstrato * proporcao).toFixed(2));
  const materiaPrima = Number((totalMateriaPrima * proporcao).toFixed(2));
  const tinta = Number((totalTinta * proporcao).toFixed(2));
  const maquina = Number((totalMaquina * proporcao).toFixed(2));
  const material = materiaPrima;
  const extras = Number((custoExtras * proporcao).toFixed(2));
  const custoTotal = Number((materiaPrima + tinta + maquina + extras).toFixed(2));
  const valorRecebido = Number(params.valorRecebido) || 0;

  return {
    substrato,
    materiaPrima,
    tinta,
    maquina,
    material,
    extras,
    custoTotal,
    valorRecebido,
    lucro: Number((valorRecebido - custoTotal).toFixed(2)),
    tintaMlTotal: Number((totalTintaMl * proporcao).toFixed(1)),
    areaM2Total: Number((totalAreaM2 * proporcao).toFixed(2))
  };
}

export function custoTotalDaNota(params: {
  items: LucroSaleItem[] | undefined | null;
  custoPorId: Record<string, number>;
  nomePorId?: Record<string, string>;
  produtoPorId?: Record<string, LucroCurrentProduct>;
  materiasPrimasAtuais?: Record<string, LucroCurrentMaterial>;
  custoMaquinaM2PorCategoria?: Record<string, number>;
  custoMaquinaOperacionalM2PorCategoria?: Record<string, number>;
  custoTintaM2PorCategoria?: Record<string, number>;
  consumoTintaMlM2PorCategoria?: Record<string, number>;
  maquinas?: Maquina[];
  maquinaPadrao?: Maquina;
  maquinasPorId?: Record<string, Maquina>;
  maquinasPorCategoria?: Record<string, Maquina>;
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
  custoMaquinaOperacionalM2PorCategoria?: Record<string, number>;
  custoTintaM2PorCategoria?: Record<string, number>;
  consumoTintaMlM2PorCategoria?: Record<string, number>;
  maquinas?: Maquina[];
  maquinaPadrao?: Maquina;
  maquinasPorId?: Record<string, Maquina>;
  maquinasPorCategoria?: Record<string, Maquina>;
  extraCosts?: LucroExtraCost[] | null;
  proporcao?: number;
}): number {
  return detalharCustoDaNota(params).lucro;
}
