import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  DollarSign,
  Package,
  Wrench,
  Zap,
  Home,
  Users,
  Percent,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  Settings,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Save,
  FileText,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Sliders,
  Share2,
  ShoppingCart
} from 'lucide-react';
import { Company, AppUser, Product } from '../types';
import { supabase } from '../supabase';
import { showAlert } from '../lib/notify';
import { Badge, Button, Modal } from './SharedUI';
import { useApp } from '../AppContext';

interface PrecificacaoModuleProps {
  currentCompany?: Company | null;
  user?: AppUser | null;
}

export interface MaquinaConfig {
  id: string;
  nome: string;
  custoHora: number; // R$/hora
  custoTintaM2: number; // R$/m2
  manutencaoHora: number; // R$/hora
  depreciacaoHora: number; // R$/hora
  potenciaKw: number; // kW
  tipo: 'impressao' | 'corte' | 'laser' | 'router' | 'prensa' | 'acabamento' | 'manual';
  ativa: boolean;
}

export interface CustosFixosEmpresa {
  aluguelMensal: number;
  energiaMensal: number;
  outrosCustosFixos: number; // Internet, software, contador, etc.
  horasProdutivasMes: number; // Ex: 176h (22 dias x 8h)
  tarifaKwh: number; // Ex: R$ 0,95 por kWh
  impostosPadraoPct: number; // Ex: 6% (Simples Nacional)
  taxaCartaoPct: number; // Ex: 3.5%
  comissaoPadraoPct: number; // Ex: 10%
  margemLucroAlvoPct: number; // Ex: 50%
}

export interface PrecificacaoSalva {
  id: string;
  data: string;
  servico: string;
  material: string;
  quantidade: number;
  unidade: string;
  tempoProducaoMinutos: number;
  maquinaNome?: string;
  prazoEntrega: string;
  custoReal: number;
  precoMinimo: number;
  precoRecomendado: number;
  lucro: number;
  margemPct: number;
  markupPct: number;
  lucroPorHora: number;
  detalhes: any;
}

// Máquinas padrão pré-configuradas para comunicação visual & gráfica
const DEFAULT_MAQUINAS: MaquinaConfig[] = [
  {
    id: 'plotter-solvente',
    nome: 'Plotter de Impressão Solvente / Eco (1.60m - 3.20m)',
    custoHora: 18.00,
    custoTintaM2: 5.50,
    manutencaoHora: 4.50,
    depreciacaoHora: 6.00,
    potenciaKw: 2.2,
    tipo: 'impressao',
    ativa: true,
  },
  {
    id: 'plotter-uv',
    nome: 'Impressora Digital UV Flatbed / Híbrida',
    custoHora: 35.00,
    custoTintaM2: 9.80,
    manutencaoHora: 8.00,
    depreciacaoHora: 12.00,
    potenciaKw: 3.5,
    tipo: 'impressao',
    ativa: true,
  },
  {
    id: 'router-cnc',
    nome: 'Router CNC 3D (Corte e Usinagem ACM, MDF, PVC, Acrílico)',
    custoHora: 30.00,
    custoTintaM2: 0.00,
    manutencaoHora: 7.50,
    depreciacaoHora: 10.00,
    potenciaKw: 4.0,
    tipo: 'router',
    ativa: true,
  },
  {
    id: 'laser-co2',
    nome: 'Máquina de Corte & Gravação Laser CO2 (100W)',
    custoHora: 22.00,
    custoTintaM2: 0.00,
    manutencaoHora: 5.00,
    depreciacaoHora: 8.00,
    potenciaKw: 2.5,
    tipo: 'laser',
    ativa: true,
  },
  {
    id: 'plotter-recorte',
    nome: 'Plotter de Recorte Eletrônico de Vinil',
    custoHora: 12.00,
    custoTintaM2: 0.00,
    manutencaoHora: 2.00,
    depreciacaoHora: 3.50,
    potenciaKw: 0.3,
    tipo: 'corte',
    ativa: true,
  },
  {
    id: 'prensa-termica',
    nome: 'Prensa Térmica / Transfer Sublimático',
    custoHora: 15.00,
    custoTintaM2: 0.00,
    manutencaoHora: 2.50,
    depreciacaoHora: 3.00,
    potenciaKw: 2.0,
    tipo: 'prensa',
    ativa: true,
  },
  {
    id: 'laminadora',
    nome: 'Laminadora a Quente / Frio',
    custoHora: 14.00,
    custoTintaM2: 0.00,
    manutencaoHora: 2.00,
    depreciacaoHora: 3.00,
    potenciaKw: 1.5,
    tipo: 'acabamento',
    ativa: true,
  },
  {
    id: 'nenhuma-manual',
    nome: 'Nenhuma / Acabamento & Mão de Obra Manual',
    custoHora: 0.00,
    custoTintaM2: 0.00,
    manutencaoHora: 0.00,
    depreciacaoHora: 0.00,
    potenciaKw: 0.0,
    tipo: 'manual',
    ativa: true,
  }
];

const DEFAULT_CUSTOS_EMPRESA: CustosFixosEmpresa = {
  aluguelMensal: 3500.00,
  energiaMensal: 1200.00,
  outrosCustosFixos: 1800.00,
  horasProdutivasMes: 176, // 22 dias úteis x 8 horas
  tarifaKwh: 0.98,
  impostosPadraoPct: 6.0,
  taxaCartaoPct: 3.5,
  comissaoPadraoPct: 10.0,
  margemLucroAlvoPct: 50.0,
};

const STORAGE_KEY_MAQUINAS = 'rpro_precificacao_maquinas';
const STORAGE_KEY_CUSTOS = 'rpro_precificacao_custos_empresa';
const STORAGE_KEY_HISTORICO = 'rpro_precificacao_historico';

export const PrecificacaoModule: React.FC<PrecificacaoModuleProps> = ({ currentCompany, user }) => {
  const { setActiveTab } = useApp();

  // Dados carregados do sistema
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loadingDados, setLoadingDados] = useState(true);

  // Parâmetros de custos persistidos
  const [maquinas, setMaquinas] = useState<MaquinaConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MAQUINAS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Erro ao carregar máquinas do cache:', e);
    }
    return DEFAULT_MAQUINAS;
  });

  const [custosEmpresa, setCustosEmpresa] = useState<CustosFixosEmpresa>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Erro ao carregar custos do cache:', e);
    }
    return DEFAULT_CUSTOS_EMPRESA;
  });

  const [historico, setHistorico] = useState<PrecificacaoSalva[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORICO);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Erro ao carregar histórico de precificações:', e);
    }
    return [];
  });

  // Estado do formulário de Precificação
  const [servicoNome, setServicoNome] = useState('');
  const [servicoSelecionadoId, setServicoSelecionadoId] = useState('');
  
  // Material principal
  const [materialId, setMaterialId] = useState('');
  const [modoCalculo, setModoCalculo] = useState<'m2' | 'unit' | 'metro'>('m2');
  
  // Dimensões / Quantidades
  const [largura, setLargura] = useState<number | ''>(1.0);
  const [altura, setAltura] = useState<number | ''>(1.0);
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [unidadeMedida, setUnidadeMedida] = useState<'metros' | 'centimetros' | 'milimetros'>('metros');

  // Tempo de produção e máquina
  const [tempoProducaoMinutos, setTempoProducaoMinutos] = useState<number | ''>(30);
  const [maquinaId, setMaquinaId] = useState('plotter-solvente');
  const [colaboradorId, setColaboradorId] = useState('media'); // 'media' ou id de um colaborador

  // Prazo de entrega
  const [prazoEntrega, setPrazoEntrega] = useState('2 dias úteis');

  // Ajustes dinâmicos de margem e taxas para a simulação atual
  const [margemAlvoDesejada, setMargemAlvoDesejada] = useState<number>(custosEmpresa.margemLucroAlvoPct);
  const [comissaoDesejada, setComissaoDesejada] = useState<number>(custosEmpresa.comissaoPadraoPct);
  const [impostosDesejado, setImpostosDesejado] = useState<number>(custosEmpresa.impostosPadraoPct);
  const [taxaCartaoDesejada, setTaxaCartaoDesejada] = useState<number>(custosEmpresa.taxaCartaoPct);

  // Insumos e acabamentos adicionais (ex: ilhós, fita dupla face, bastão)
  const [insumosExtras, setInsumosExtras] = useState<Array<{ id: string; nome: string; valor: number }>>([]);
  const [novoInsumoNome, setNovoInsumoNome] = useState('');
  const [novoInsumoValor, setNovoInsumoValor] = useState<number | ''>('');

  // Modais de Gestão
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isMaquinasModalOpen, setIsMaquinasModalOpen] = useState(false);
  const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Carrega produtos do estoque e colaboradores do sistema
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingDados(true);

        // 1. Carrega produtos e materiais
        let queryProd = supabase.from('produtos').select('*').order('nome', { ascending: true });
        if (currentCompany?.id) {
          queryProd = queryProd.or(`company_id.eq.${currentCompany.id},company_id.is.null`);
        }
        const { data: prodData } = await queryProd;
        if (prodData) {
          const mappedProd: Product[] = prodData.map((p: any) => ({
            id: p.id,
            name: p.nome || p.name || 'Produto',
            code: p.codigo || p.code || '',
            price: Number(p.preco || p.price || 0),
            costPrice: Number(p.preco_custo || p.cost_price || 0),
            stock: Number(p.estoque ?? p.stock ?? 0),
            unitType: p.unidade || p.unit_type || 'unit',
            tipoItem: p.tipo_item || 'produto',
            larguraRolo: p.largura_rolo ? Number(p.largura_rolo) : undefined,
          } as any));
          setProdutos(mappedProd);

          // Se não houver material selecionado, seleciona o primeiro material/produto
          if (!materialId && mappedProd.length > 0) {
            const defaultMat = mappedProd.find(p => p.tipoItem === 'material' || p.name.toLowerCase().includes('lona') || p.name.toLowerCase().includes('adesivo')) || mappedProd[0];
            setMaterialId(defaultMat.id);
          }
        }

        // 2. Carrega colaboradores para custo de mão de obra e comissão
        const { data: colabData } = await supabase
          .from('colaboradores')
          .select('*')
          .order('nome', { ascending: true });
        if (colabData) {
          setColaboradores(colabData);
        }
      } catch (err) {
        console.warn('Erro ao carregar dados do banco:', err);
      } finally {
        setLoadingDados(false);
      }
    };

    fetchData();
  }, [currentCompany]);

  // Salva no localStorage quando mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MAQUINAS, JSON.stringify(maquinas));
    } catch (e) {}
  }, [maquinas]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOS, JSON.stringify(custosEmpresa));
    } catch (e) {}
  }, [custosEmpresa]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(historico));
    } catch (e) {}
  }, [historico]);

  // Material selecionado no estoque
  const materialSelecionado = useMemo(() => {
    return produtos.find(p => p.id === materialId) || null;
  }, [produtos, materialId]);

  // Máquina selecionada
  const maquinaSelecionada = useMemo(() => {
    return maquinas.find(m => m.id === maquinaId) || maquinas[0] || null;
  }, [maquinas, maquinaId]);

  // Cálculo da quantidade em formato numérico e da Área Total (m²)
  const qtdNum = Number(quantidade) > 0 ? Number(quantidade) : 1;
  const tempoMinutosNum = Number(tempoProducaoMinutos) > 0 ? Number(tempoProducaoMinutos) : 0;
  const tempoHorasNum = tempoMinutosNum / 60;

  // Conversão de dimensões para metros
  const larguraEmMetros = useMemo(() => {
    const l = Number(largura) || 0;
    if (unidadeMedida === 'centimetros') return l / 100;
    if (unidadeMedida === 'milimetros') return l / 1000;
    return l;
  }, [largura, unidadeMedida]);

  const alturaEmMetros = useMemo(() => {
    const a = Number(altura) || 0;
    if (unidadeMedida === 'centimetros') return a / 100;
    if (unidadeMedida === 'milimetros') return a / 1000;
    return a;
  }, [altura, unidadeMedida]);

  // Área unitária e Área total (m²)
  const areaUnitariaM2 = useMemo(() => {
    if (modoCalculo === 'm2') {
      return Math.max(0.01, larguraEmMetros * alturaEmMetros);
    }
    return 1;
  }, [modoCalculo, larguraEmMetros, alturaEmMetros]);

  const areaTotalM2 = useMemo(() => {
    if (modoCalculo === 'm2') {
      return areaUnitariaM2 * qtdNum;
    } else if (modoCalculo === 'metro') {
      return larguraEmMetros * qtdNum;
    }
    return qtdNum;
  }, [modoCalculo, areaUnitariaM2, qtdNum, larguraEmMetros]);

  // ==========================================
  // CÁLCULOS AUTOMÁTICOS DE CUSTOS (PUXADOS DO SISTEMA)
  // ==========================================

  // 1. Custo de Material (Estoque)
  const custoUnitarioMaterialEstoque = (materialSelecionado as any)?.costPrice || 0;
  const custoTotalMaterial = useMemo(() => {
    if (modoCalculo === 'm2') {
      return areaTotalM2 * custoUnitarioMaterialEstoque;
    } else if (modoCalculo === 'metro') {
      return larguraEmMetros * qtdNum * custoUnitarioMaterialEstoque;
    }
    return qtdNum * custoUnitarioMaterialEstoque;
  }, [modoCalculo, areaTotalM2, larguraEmMetros, qtdNum, custoUnitarioMaterialEstoque]);

  // Total de insumos extras adicionados manualmente
  const custoTotalInsumosExtras = useMemo(() => {
    return insumosExtras.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
  }, [insumosExtras]);

  // 2. Custo da Tinta (da Máquina / Material)
  const custoTintaPorM2 = maquinaSelecionada?.custoTintaM2 || 0;
  const custoTotalTinta = useMemo(() => {
    if (maquinaSelecionada?.tipo === 'impressao') {
      return areaTotalM2 * custoTintaPorM2;
    }
    return 0;
  }, [maquinaSelecionada, areaTotalM2, custoTintaPorM2]);

  // 3. Custo Operacional da Máquina (Tempo x Custo/hora)
  const custoHoraMaquina = maquinaSelecionada?.custoHora || 0;
  const custoTotalMaquina = useMemo(() => {
    return tempoHorasNum * custoHoraMaquina;
  }, [tempoHorasNum, custoHoraMaquina]);

  // 4. Manutenção e Depreciação da Máquina
  const manutencaoHora = maquinaSelecionada?.manutencaoHora || 0;
  const depreciacaoHora = maquinaSelecionada?.depreciacaoHora || 0;
  const custoTotalManutencaoDepreciacao = useMemo(() => {
    return tempoHorasNum * (manutencaoHora + depreciacaoHora);
  }, [tempoHorasNum, manutencaoHora, depreciacaoHora]);

  // 5. Energia Elétrica (Rateio Estrutural + Consumo Específico da Máquina)
  const horasProdutivasTotal = Math.max(1, custosEmpresa.horasProdutivasMes);
  const custoEnergiaEstruturaHora = custosEmpresa.energiaMensal / horasProdutivasTotal;
  const consumoMaquinaKw = maquinaSelecionada?.potenciaKw || 0;
  const custoEnergiaMaquinaHora = consumoMaquinaKw * custosEmpresa.tarifaKwh;

  const custoTotalEnergia = useMemo(() => {
    const custoPorHoraTotal = custoEnergiaEstruturaHora + custoEnergiaMaquinaHora;
    return tempoHorasNum * custoPorHoraTotal;
  }, [tempoHorasNum, custoEnergiaEstruturaHora, custoEnergiaMaquinaHora]);

  // 6. Aluguel & Estrutura Fixa (Financeiro)
  const custoAluguelHora = custosEmpresa.aluguelMensal / horasProdutivasTotal;
  const custoOutrosFixosHora = custosEmpresa.outrosCustosFixos / horasProdutivasTotal;

  const custoTotalEstrutura = useMemo(() => {
    return tempoHorasNum * (custoAluguelHora + custoOutrosFixosHora);
  }, [tempoHorasNum, custoAluguelHora, custoOutrosFixosHora]);

  // 7. Custo/Hora dos Funcionários (Mão de Obra)
  const custoHoraFuncionario = useMemo(() => {
    const ativos = colaboradores.filter(c => c.ativo !== false);
    if (colaboradorId !== 'media') {
      const colab = colaboradores.find(c => c.id === colaboradorId);
      if (colab) {
        const sal = Number(colab.salario_base) || 0;
        // Se salário semanal ou mensal (se < 1000 assume semanal x 4.33, ou divide pelas horas)
        const salMensal = sal < 1500 ? sal * 4.33 : sal;
        return Math.max(12, salMensal / horasProdutivasTotal);
      }
    }
    // Média de todos os colaboradores ativos
    if (ativos.length > 0) {
      const somaSalarios = ativos.reduce((acc, c) => {
        const sal = Number(c.salario_base) || 0;
        const salMensal = sal < 1500 ? sal * 4.33 : sal;
        return acc + salMensal;
      }, 0);
      return Math.max(12, (somaSalarios / ativos.length) / horasProdutivasTotal);
    }
    return 18.00; // Padrão caso não haja colaboradores cadastrados
  }, [colaboradores, colaboradorId, horasProdutivasTotal]);

  const custoTotalMaoDeObra = useMemo(() => {
    return tempoHorasNum * custoHoraFuncionario;
  }, [tempoHorasNum, custoHoraFuncionario]);

  // Custo Direto + Indireto (sem comissão)
  const subtotalCustosProducao = useMemo(() => {
    return (
      custoTotalMaterial +
      custoTotalInsumosExtras +
      custoTotalTinta +
      custoTotalMaquina +
      custoTotalManutencaoDepreciacao +
      custoTotalEnergia +
      custoTotalEstrutura +
      custoTotalMaoDeObra
    );
  }, [
    custoTotalMaterial,
    custoTotalInsumosExtras,
    custoTotalTinta,
    custoTotalMaquina,
    custoTotalManutencaoDepreciacao,
    custoTotalEnergia,
    custoTotalEstrutura,
    custoTotalMaoDeObra
  ]);

  // ==========================================
  // FORMAÇÃO DE PREÇO AUTOMÁTICA (O PREÇO NÃO É DIGITADO)
  // ==========================================
  //
  // No comércio e indústria gráfica, o cálculo de preço de venda com comissões,
  // impostos e margem utiliza a fórmula do Divisor de Markup:
  // Preço de Venda = Custo Produção / (1 - (% Comissao + % Impostos + % Taxa Cartao + % Margem Lucro))
  //
  // Assim:
  // - Comissão é paga sobre o preço de venda (% configurada)
  // - O Preço Mínimo é o ponto de equilíbrio com Margem = 0 (cobre custos + comissão + impostos + cartão)
  // - O Preço Recomendado entrega a margem de lucro alvo limpa e líquida para a empresa.

  const totalDeducoesMinimoPct = useMemo(() => {
    return (comissaoDesejada + impostosDesejado + taxaCartaoDesejada) / 100;
  }, [comissaoDesejada, impostosDesejado, taxaCartaoDesejada]);

  const divisorMinimo = useMemo(() => {
    return Math.max(0.05, 1 - totalDeducoesMinimoPct);
  }, [totalDeducoesMinimoPct]);

  // Preço Mínimo de Equilíbrio
  const precoMinimo = useMemo(() => {
    if (subtotalCustosProducao <= 0) return 0;
    return subtotalCustosProducao / divisorMinimo;
  }, [subtotalCustosProducao, divisorMinimo]);

  // Preço Recomendado com Margem de Lucro Alvo
  const totalDeducoesRecomendadoPct = useMemo(() => {
    return (comissaoDesejada + impostosDesejado + taxaCartaoDesejada + margemAlvoDesejada) / 100;
  }, [comissaoDesejada, impostosDesejado, taxaCartaoDesejada, margemAlvoDesejada]);

  const divisorRecomendado = useMemo(() => {
    return Math.max(0.05, 1 - totalDeducoesRecomendadoPct);
  }, [totalDeducoesRecomendadoPct]);

  const precoRecomendado = useMemo(() => {
    if (subtotalCustosProducao <= 0) return 0;
    // Se a soma das porcentagens ultrapassar ou igualar 100%, usa markup multiplicador seguro
    if (totalDeducoesRecomendadoPct >= 0.95) {
      const markupMultiplicador = 1 + (margemAlvoDesejada / 100) + (comissaoDesejada / 100);
      return subtotalCustosProducao * markupMultiplicador;
    }
    return subtotalCustosProducao / divisorRecomendado;
  }, [subtotalCustosProducao, totalDeducoesRecomendadoPct, divisorRecomendado, margemAlvoDesejada, comissaoDesejada]);

  // Comissão em R$ sobre o preço recomendado
  const valorComissaoRecomendada = useMemo(() => {
    return precoRecomendado * (comissaoDesejada / 100);
  }, [precoRecomendado, comissaoDesejada]);

  // CUSTO REAL TOTAL (Material + Tinta + Máquina + Energia + Estrutura + Funcionários + Comissão)
  const custoReal = useMemo(() => {
    return subtotalCustosProducao + valorComissaoRecomendada;
  }, [subtotalCustosProducao, valorComissaoRecomendada]);

  // Impostos e Taxa de Cartão em R$
  const valorImpostos = useMemo(() => precoRecomendado * (impostosDesejado / 100), [precoRecomendado, impostosDesejado]);
  const valorTaxaCartao = useMemo(() => precoRecomendado * (taxaCartaoDesejada / 100), [precoRecomendado, taxaCartaoDesejada]);

  // LUCRO LÍQUIDO (Preço Recomendado - Custo Real - Impostos - Cartão)
  const lucroLiquido = useMemo(() => {
    return Math.max(0, precoRecomendado - subtotalCustosProducao - valorComissaoRecomendada - valorImpostos - valorTaxaCartao);
  }, [precoRecomendado, subtotalCustosProducao, valorComissaoRecomendada, valorImpostos, valorTaxaCartao]);

  // Margem de Lucro % Real Efetiva
  const margemEfetivaPct = useMemo(() => {
    if (precoRecomendado <= 0) return 0;
    return (lucroLiquido / precoRecomendado) * 100;
  }, [lucroLiquido, precoRecomendado]);

  // Markup % sobre o custo de produção
  const markupPct = useMemo(() => {
    if (custoReal <= 0) return 0;
    return ((precoRecomendado - custoReal) / custoReal) * 100;
  }, [precoRecomendado, custoReal]);

  // Lucro por Hora
  const lucroPorHora = useMemo(() => {
    if (tempoHorasNum <= 0) return lucroLiquido;
    return lucroLiquido / tempoHorasNum;
  }, [lucroLiquido, tempoHorasNum]);

  // Preço Unitário e Preço por m²
  const precoUnitario = useMemo(() => {
    if (qtdNum <= 0) return 0;
    return precoRecomendado / qtdNum;
  }, [precoRecomendado, qtdNum]);

  const precoPorM2 = useMemo(() => {
    if (areaTotalM2 <= 0) return 0;
    return precoRecomendado / areaTotalM2;
  }, [precoRecomendado, areaTotalM2]);

  // Sincronização ao selecionar um serviço cadastrado
  const handleSelectServico = (id: string) => {
    setServicoSelecionadoId(id);
    const s = produtos.find(p => p.id === id);
    if (s) {
      setServicoNome(s.name);
      if (s.unitType === 'm2') {
        setModoCalculo('m2');
      } else if (s.unitType === 'metro') {
        setModoCalculo('metro');
      } else {
        setModoCalculo('unit');
      }
    }
  };

  // Sincronização ao selecionar um material
  const handleSelectMaterial = (id: string) => {
    setMaterialId(id);
    const m = produtos.find(p => p.id === id);
    if (m) {
      if (m.unitType === 'm2') {
        setModoCalculo('m2');
      } else if (m.unitType === 'metro') {
        setModoCalculo('metro');
      }
    }
  };

  // Adicionar Insumo Extra
  const handleAddInsumoExtra = () => {
    if (!novoInsumoNome.trim() || Number(novoInsumoValor) <= 0) return;
    setInsumosExtras(prev => [
      ...prev,
      {
        id: 'insumo-' + Date.now(),
        nome: novoInsumoNome.trim(),
        valor: Number(novoInsumoValor)
      }
    ]);
    setNovoInsumoNome('');
    setNovoInsumoValor('');
  };

  const handleRemoveInsumoExtra = (id: string) => {
    setInsumosExtras(prev => prev.filter(i => i.id !== id));
  };

  // Salvar Precificação no Histórico
  const handleSalvarPrecificacao = () => {
    const nomeFinal = servicoNome.trim() || materialSelecionado?.name || 'Serviço Personalizado';
    const nova: PrecificacaoSalva = {
      id: 'prec-' + Date.now(),
      data: new Date().toISOString(),
      servico: nomeFinal,
      material: materialSelecionado?.name || 'Insumo Geral',
      quantidade: qtdNum,
      unidade: modoCalculo === 'm2' ? `${areaTotalM2.toFixed(2)} m²` : `${qtdNum} un`,
      tempoProducaoMinutos: tempoMinutosNum,
      maquinaNome: maquinaSelecionada?.nome,
      prazoEntrega: prazoEntrega,
      custoReal,
      precoMinimo,
      precoRecomendado,
      lucro: lucroLiquido,
      margemPct: margemEfetivaPct,
      markupPct,
      lucroPorHora,
      detalhes: {
        custoMaterial: custoTotalMaterial,
        custoTinta: custoTotalTinta,
        custoMaquina: custoTotalMaquina,
        custoEnergia: custoTotalEnergia,
        custoEstrutura: custoTotalEstrutura,
        custoMaoDeObra: custoTotalMaoDeObra,
        comissao: valorComissaoRecomendada,
      }
    };

    setHistorico(prev => [nova, ...prev]);
    showAlert('Precificação salva com sucesso no histórico!');
  };

  // Copiar Orçamento Comercial para WhatsApp
  const handleCopiarPropostaComercial = () => {
    const nomeFinal = servicoNome.trim() || materialSelecionado?.name || 'Serviço de Comunicação Visual';
    const texto = `*ORÇAMENTO & PROPOSTA COMERCIAL* 📋
*${currentCompany?.name || 'Rafa Arts Graphics'}*
---------------------------------------
🎯 *Serviço:* ${nomeFinal}
📦 *Material:* ${materialSelecionado?.name || 'Material Padrão Alta Qualidade'}
📐 *Dimensão / Qtd:* ${modoCalculo === 'm2' ? `${larguraEmMetros}m x ${alturaEmMetros}m (${areaTotalM2.toFixed(2)} m²) x ${qtdNum} unid.` : `${qtdNum} unidade(s)`}
⏱️ *Prazo de Entrega:* ${prazoEntrega}

💰 *VALOR TOTAL:* R$ ${precoRecomendado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
${qtdNum > 1 ? `🏷️ *Valor Unitário:* R$ ${precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cada\n` : ''}${modoCalculo === 'm2' ? `📏 *Valor m²:* R$ ${precoPorM2.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/m²\n` : ''}
✅ *Formas de Pagamento:* PIX, Cartão de Crédito/Débito ou Entrada 50% + Saldo na Entrega.
📅 *Validade da Proposta:* 7 dias.`;

    navigator.clipboard.writeText(texto);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
    showAlert('Proposta comercial copiada para a área de transferência!');
  };

  // Copiar Ficha Técnica de Produção
  const handleCopiarFichaTecnica = () => {
    const nomeFinal = servicoNome.trim() || materialSelecionado?.name || 'Serviço';
    const texto = `*FICHA TÉCNICA DE PRODUÇÃO* 🛠️
*Serviço:* ${nomeFinal}
*Material:* ${materialSelecionado?.name || 'Geral'}
*Medidas:* ${larguraEmMetros}m x ${alturaEmMetros}m (Área Total: ${areaTotalM2.toFixed(2)} m²)
*Quantidade:* ${qtdNum}
*Máquina:* ${maquinaSelecionada?.nome || 'Manual'}
*Tempo Estimado:* ${tempoMinutosNum} minutos (${tempoHorasNum.toFixed(2)}h)
*Prazo:* ${prazoEntrega}
---------------------------------------
*Composição de Custos:*
- Material: R$ ${custoTotalMaterial.toFixed(2)}
- Tinta: R$ ${custoTotalTinta.toFixed(2)}
- Máquina: R$ ${custoTotalMaquina.toFixed(2)}
- Mão de Obra: R$ ${custoTotalMaoDeObra.toFixed(2)}
- Estrutura + Energia: R$ ${(custoTotalEstrutura + custoTotalEnergia).toFixed(2)}
- Comissão (10%): R$ ${valorComissaoRecomendada.toFixed(2)}
*Custo Real Total:* R$ ${custoReal.toFixed(2)}
*Preço Recomendado:* R$ ${precoRecomendado.toFixed(2)}`;

    navigator.clipboard.writeText(texto);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
    showAlert('Ficha técnica copiada com sucesso!');
  };

  // Enviar para o PDV (Balcão de Vendas)
  const handleEnviarParaPDV = () => {
    const nomeFinal = servicoNome.trim() || materialSelecionado?.name || 'Serviço Personalizado';
    // Armazena no sessionStorage para o POS carregar
    try {
      const itemParaPDV = {
        name: nomeFinal,
        price: precoRecomendado,
        costPrice: custoReal,
        quantity: qtdNum,
        width: larguraEmMetros,
        height: alturaEmMetros,
        area: areaTotalM2,
        observations: `Precificado via Financeiro: Material ${materialSelecionado?.name || ''} • Prazo: ${prazoEntrega}`
      };
      sessionStorage.setItem('rpro_pos_item_precificado', JSON.stringify(itemParaPDV));
      showAlert(`Serviço "${nomeFinal}" enviado para o PDV! Redirecionando...`);
      setActiveTab('pos');
    } catch (e) {
      setActiveTab('pos');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner de Apresentação e Botões de Gestão */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-br from-slate-900 via-slate-900/90 to-primary-950/40 p-5 sm:p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-2 rounded-xl bg-primary-500/20 text-primary-400 border border-primary-500/30">
              <Calculator size={22} />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight uppercase">
              Motor de Precificação Inteligente
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Automático
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/60 max-w-2xl">
            O preço de venda é calculado e sugerido automaticamente com base no custo de estoque, máquinas, energia, aluguel, funcionários e comissão.
          </p>
        </div>

        {/* Botões de Ação Superior */}
        <div className="flex flex-wrap items-center gap-2 relative z-10">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors shadow-sm"
            title="Configurar Aluguel, Energia e Horas da Empresa"
          >
            <Settings size={14} className="text-amber-400" />
            <span>Custos da Empresa</span>
          </button>
          
          <button
            onClick={() => setIsMaquinasModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors shadow-sm"
            title="Gerenciar Máquinas e Custos Operacionais"
          >
            <Wrench size={14} className="text-cyan-400" />
            <span>Máquinas ({maquinas.filter(m => m.ativa).length})</span>
          </button>

          <button
            onClick={() => setIsHistoricoModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors shadow-sm"
            title="Ver Histórico de Precificações Salvas"
          >
            <FileText size={14} className="text-indigo-400" />
            <span>Histórico ({historico.length})</span>
          </button>
        </div>
      </div>

      {/* Grid Principal: 2 Colunas (Formulário à Esquerda / Resultados e Breakdown à Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* COLUNA ESQUERDA: FORMULÁRIO DE ENTRADA & PARÂMETROS (lg:col-span-7) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Identificação do Serviço e Material do Estoque */}
          <div className="bg-slate-900/70 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Package className="text-primary-400" size={18} />
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wide">
                  1. Serviço & Material do Estoque
                </h3>
              </div>
              <span className="text-[11px] text-white/40">Dados integrados em tempo real</span>
            </div>

            {/* Serviço */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-white/70 uppercase">
                Serviço / Produto
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Selecionar existente */}
                <select
                  value={servicoSelecionadoId}
                  onChange={(e) => handleSelectServico(e.target.value)}
                  className="w-full bg-slate-800/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">-- Selecionar do catálogo --</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.tipoItem ? `(${p.tipoItem})` : ''}
                    </option>
                  ))}
                </select>

                {/* Ou digitar nome customizado */}
                <input
                  type="text"
                  placeholder="Ou digite o nome do serviço..."
                  value={servicoNome}
                  onChange={(e) => {
                    setServicoNome(e.target.value);
                    if (servicoSelecionadoId) setServicoSelecionadoId('');
                  }}
                  className="w-full bg-slate-800/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* Material do Estoque */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-white/70 uppercase">
                  Material Principal (Estoque)
                </label>
                {materialSelecionado && (
                  <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    Custo no Estoque: R$ {custoUnitarioMaterialEstoque.toFixed(2)}/{materialSelecionado.unitType === 'm2' ? 'm²' : materialSelecionado.unitType === 'metro' ? 'm' : 'un'}
                  </span>
                )}
              </div>

              <select
                value={materialId}
                onChange={(e) => handleSelectMaterial(e.target.value)}
                className="w-full bg-slate-800/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
              >
                <option value="">-- Selecione o material no estoque --</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} • Custo: R$ {Number((p as any).costPrice || 0).toFixed(2)} ({p.unitType || 'unit'})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantidade e Modo de Cálculo */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white/70 uppercase">
                  Dimensões & Quantidade Utilizada
                </label>
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-white/10 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setModoCalculo('m2')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      modoCalculo === 'm2' ? 'bg-primary-500 text-white shadow-md' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Por m² (Área)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoCalculo('metro')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      modoCalculo === 'metro' ? 'bg-primary-500 text-white shadow-md' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Metro Linear
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoCalculo('unit')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      modoCalculo === 'unit' ? 'bg-primary-500 text-white shadow-md' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Unidades
                  </button>
                </div>
              </div>

              {modoCalculo === 'm2' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                      Largura ({unidadeMedida === 'metros' ? 'm' : unidadeMedida === 'centimetros' ? 'cm' : 'mm'})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={largura}
                      onChange={(e) => setLargura(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                      Altura ({unidadeMedida === 'metros' ? 'm' : unidadeMedida === 'centimetros' ? 'cm' : 'mm'})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={altura}
                      onChange={(e) => setAltura(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                      Qtd Peças
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                      Unidade de Medida
                    </label>
                    <select
                      value={unidadeMedida}
                      onChange={(e) => setUnidadeMedida(e.target.value as any)}
                      className="w-full bg-slate-800 border border-white/15 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
                    >
                      <option value="metros">Metros (m)</option>
                      <option value="centimetros">Centímetros (cm)</option>
                      <option value="milimetros">Milímetros (mm)</option>
                    </select>
                  </div>
                </div>
              ) : modoCalculo === 'metro' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                      Comprimento Linear (metros)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={largura}
                      onChange={(e) => setLargura(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                      Quantidade de Rolos/Peças
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                    Quantidade de Unidades
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              )}

              {/* Resumo visual da área total */}
              {modoCalculo === 'm2' && (
                <div className="flex items-center justify-between text-xs bg-slate-800/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-white/60">Área unitária: <strong className="text-white">{areaUnitariaM2.toFixed(3)} m²</strong></span>
                  <span className="text-white/60">Área total calculada: <strong className="text-emerald-400">{areaTotalM2.toFixed(3)} m²</strong></span>
                </div>
              )}
            </div>

            {/* Insumos & Acabamentos Extras Opcionais */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-white/60 uppercase">
                  + Insumos Adicionais & Acabamentos (Ilhós, Bastão, Dupla Face, etc.)
                </label>
                {custoTotalInsumosExtras > 0 && (
                  <span className="text-[11px] text-primary-400 font-bold">
                    Total Insumos: R$ {custoTotalInsumosExtras.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Ilhós a cada 20cm, Bastão e Ponteira..."
                  value={novoInsumoNome}
                  onChange={(e) => setNovoInsumoNome(e.target.value)}
                  className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="R$ Custo"
                  value={novoInsumoValor}
                  onChange={(e) => setNovoInsumoValor(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-24 bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddInsumoExtra}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              {insumosExtras.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {insumosExtras.map(item => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-xs text-white/80"
                    >
                      {item.nome}: <strong>R$ {Number(item.valor).toFixed(2)}</strong>
                      <button
                        type="button"
                        onClick={() => handleRemoveInsumoExtra(item.id)}
                        className="text-rose-400 hover:text-rose-300 ml-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Máquina, Tempo de Produção, Equipe & Prazo */}
          <div className="bg-slate-900/70 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="text-cyan-400" size={18} />
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wide">
                  2. Máquina, Tempo & Produção
                </h3>
              </div>
              <span className="text-[11px] text-white/40">Custos operacionais e depreciação</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Máquina Utilizada */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-white/70 uppercase">
                    Máquina Utilizada
                  </label>
                  {maquinaSelecionada && (
                    <span className="text-[10px] text-cyan-400 font-semibold">
                      {maquinaSelecionada.custoTintaM2 > 0 ? `Tinta: R$ ${maquinaSelecionada.custoTintaM2.toFixed(2)}/m²` : 'Sem consumo de tinta'}
                    </span>
                  )}
                </div>

                <select
                  value={maquinaId}
                  onChange={(e) => setMaquinaId(e.target.value)}
                  className="w-full bg-slate-800/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {maquinas.filter(m => m.ativa).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nome} (R$ {m.custoHora.toFixed(2)}/h)
                    </option>
                  ))}
                </select>
              </div>

              {/* Tempo de Produção */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-white/70 uppercase">
                    Tempo de Produção
                  </label>
                  <span className="text-[10px] text-white/40">
                    = {tempoHorasNum.toFixed(2)} horas
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    step="5"
                    min="1"
                    placeholder="Minutos"
                    value={tempoProducaoMinutos}
                    onChange={(e) => setTempoProducaoMinutos(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="flex-1 bg-slate-800/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  {/* Botões de tempo rápido */}
                  <div className="flex gap-1">
                    {[15, 30, 60, 120].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setTempoProducaoMinutos(mins)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                          tempoProducaoMinutos === mins
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Funcionário Responsável / Custo/Hora */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-white/70 uppercase">
                    Funcionários / Mão de Obra
                  </label>
                  <span className="text-[10px] text-amber-400 font-semibold">
                    Custo: R$ {custoHoraFuncionario.toFixed(2)}/h
                  </span>
                </div>

                <select
                  value={colaboradorId}
                  onChange={(e) => setColaboradorId(e.target.value)}
                  className="w-full bg-slate-800/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="media">
                    Média da Equipe ({colaboradores.filter(c => c.ativo !== false).length} colaboradores)
                  </option>
                  {colaboradores.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.cargo || 'Produção'}) • Salário: R$ {Number(c.salario_base || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prazo de Entrega */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-white/70 uppercase">
                  Prazo de Entrega
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: 2 dias úteis, Mesmo dia..."
                    value={prazoEntrega}
                    onChange={(e) => setPrazoEntrega(e.target.value)}
                    className="flex-1 bg-slate-800/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
                  />
                  <select
                    onChange={(e) => setPrazoEntrega(e.target.value)}
                    value={prazoEntrega}
                    className="bg-slate-800 border border-white/15 rounded-xl px-2 py-2 text-xs text-white/70 focus:outline-none"
                  >
                    <option value="Mesmo dia (Urgente)">Mesmo dia</option>
                    <option value="24 horas">24 horas</option>
                    <option value="2 dias úteis">2 dias úteis</option>
                    <option value="3 dias úteis">3 dias úteis</option>
                    <option value="5 dias úteis">5 dias úteis</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Simulador de Margem Alvo, Comissão & Impostos */}
          <div className="bg-slate-900/70 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="text-amber-400" size={18} />
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wide">
                  3. Ajuste de Margem Alvo & Deduções
                </h3>
              </div>
              <span className="text-[11px] text-amber-400 font-bold">
                Margem Alvo: {margemAlvoDesejada}%
              </span>
            </div>

            {/* Slider de Margem */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-white/70">
                <span>Margem de Lucro Alvo Desejada:</span>
                <span className="text-sm font-black text-emerald-400">{margemAlvoDesejada}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={margemAlvoDesejada}
                onChange={(e) => setMargemAlvoDesejada(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <div className="flex justify-between gap-1 pt-1">
                {[20, 30, 40, 50, 60, 70].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMargemAlvoDesejada(m)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                      margemAlvoDesejada === m
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {m}%
                  </button>
                ))}
              </div>
            </div>

            {/* Configurações de Taxas Rápidas */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-white/5">
                <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                  Comissão (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={comissaoDesejada}
                  onChange={(e) => setComissaoDesejada(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-2 py-1 text-xs text-white font-bold text-center focus:outline-none"
                />
              </div>

              <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-white/5">
                <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                  Impostos / DAS (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={impostosDesejado}
                  onChange={(e) => setImpostosDesejado(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-2 py-1 text-xs text-white font-bold text-center focus:outline-none"
                />
              </div>

              <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-white/5">
                <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                  Taxa Cartão (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={taxaCartaoDesejada}
                  onChange={(e) => setTaxaCartaoDesejada(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-2 py-1 text-xs text-white font-bold text-center focus:outline-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* COLUNA DIREITA: RESULTADOS, CARDS DE PREÇO & COMPOSIÇÃO DE CUSTO (lg:col-span-5) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-6">

          {/* CARD PRINCIPAL DE RESULTADO (DESTAQUE MÁXIMO) */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-6 sm:p-7 rounded-3xl border-2 border-primary-500/40 shadow-2xl shadow-primary-950/40 relative overflow-hidden space-y-6">
            
            {/* Tag Superior */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-primary-500/20 text-primary-300 border border-primary-500/30 flex items-center gap-1.5">
                <Sparkles size={13} /> Sugestão Automática
              </span>
              <span className="text-xs text-white/40">
                Margem Alvo: <strong className="text-emerald-400">{margemAlvoDesejada}%</strong>
              </span>
            </div>

            {/* PREÇO RECOMENDADO (NÃO DIGITADO) */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-white/60 uppercase tracking-wider block">
                Preço Recomendado de Venda
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                  R$ {precoRecomendado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/50 pt-1">
                {qtdNum > 1 && (
                  <span>Unitário: <strong className="text-white">R$ {precoUnitario.toFixed(2)}</strong></span>
                )}
                {modoCalculo === 'm2' && (
                  <span>Por m²: <strong className="text-white">R$ {precoPorM2.toFixed(2)}/m²</strong></span>
                )}
              </div>
            </div>

            {/* GRID DE KPIs E MÉTRICAS */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              {/* Custo Real */}
              <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-white/10">
                <span className="block text-[10px] font-black uppercase tracking-wider text-rose-400 mb-0.5">
                  Custo Real
                </span>
                <span className="text-base sm:text-lg font-black text-white">
                  R$ {custoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="block text-[10px] text-white/40 mt-0.5">
                  Insumos + Mão de obra + Estrutura
                </span>
              </div>

              {/* Preço Mínimo */}
              <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-white/10">
                <span className="block text-[10px] font-black uppercase tracking-wider text-amber-400 mb-0.5">
                  Preço Mínimo
                </span>
                <span className="text-base sm:text-lg font-black text-white">
                  R$ {precoMinimo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="block text-[10px] text-white/40 mt-0.5">
                  Ponto de equilíbrio (Lucro 0)
                </span>
              </div>

              {/* Lucro Líquido Real */}
              <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-500/30">
                <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-0.5">
                  Lucro Líquido
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-300">
                  R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="block text-[10px] text-emerald-400/60 mt-0.5">
                  Líquido livre no caixa
                </span>
              </div>

              {/* Lucro por Hora */}
              <div className="bg-cyan-950/40 p-3.5 rounded-2xl border border-cyan-500/30">
                <span className="block text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-0.5">
                  Lucro / Hora
                </span>
                <span className="text-base sm:text-lg font-black text-cyan-300">
                  R$ {lucroPorHora.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/h
                </span>
                <span className="block text-[10px] text-cyan-400/60 mt-0.5">
                  Rendimento por hora trabalhada
                </span>
              </div>
            </div>

            {/* MARGEM % E MARKUP % */}
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/10 text-xs">
              <div>
                <span className="text-white/50 text-[10px] uppercase font-bold block">Margem Líquida</span>
                <strong className="text-emerald-400 text-sm font-black">{margemEfetivaPct.toFixed(1)}%</strong>
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <div>
                <span className="text-white/50 text-[10px] uppercase font-bold block">Markup Real</span>
                <strong className="text-cyan-400 text-sm font-black">{markupPct.toFixed(1)}%</strong>
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <div>
                <span className="text-white/50 text-[10px] uppercase font-bold block">Comissão ({comissaoDesejada}%)</span>
                <strong className="text-amber-400 text-sm font-black">R$ {valorComissaoRecomendada.toFixed(2)}</strong>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO RÁPIDA */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleCopiarPropostaComercial}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary-600/30 transition-all active:scale-[0.99]"
              >
                {copiedNotification ? <Check size={16} /> : <Share2 size={16} />}
                <span>Copiar Proposta Comercial (WhatsApp)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleEnviarParaPDV}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-colors"
                >
                  <ShoppingCart size={14} />
                  <span>Lançar no PDV</span>
                </button>

                <button
                  onClick={handleSalvarPrecificacao}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-white/10 rounded-xl font-bold text-xs transition-colors"
                >
                  <Save size={14} />
                  <span>Salvar Orçamento</span>
                </button>
              </div>

              <button
                onClick={handleCopiarFichaTecnica}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl font-bold text-[11px] border border-white/10 transition-colors"
              >
                <FileText size={13} />
                <span>Copiar Ficha Técnica de Produção</span>
              </button>
            </div>

          </div>

          {/* RAIO-X: DETALHAMENTO DA COMPOSIÇÃO DOS CUSTOS */}
          <div className="bg-slate-900/70 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="text-indigo-400" size={18} />
                <h3 className="text-sm font-black text-white uppercase tracking-wide">
                  Raio-X: Composição dos Custos
                </h3>
              </div>
              <span className="text-[11px] text-white/40">Fórmula de Formação</span>
            </div>

            {/* Lista dos 7 pilares do custo puxados automaticamente */}
            <div className="space-y-2 text-xs">
              {/* 1. Material */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-white/80 font-medium">Material (Estoque):</span>
                </div>
                <strong className="text-white">R$ {custoTotalMaterial.toFixed(2)}</strong>
              </div>

              {/* Insumos extras se houver */}
              {custoTotalInsumosExtras > 0 && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span className="text-white/80 font-medium">Insumos Extras:</span>
                  </div>
                  <strong className="text-white">R$ {custoTotalInsumosExtras.toFixed(2)}</strong>
                </div>
              )}

              {/* 2. Tinta */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-white/80 font-medium">Tinta (Máquina):</span>
                </div>
                <strong className="text-white">R$ {custoTotalTinta.toFixed(2)}</strong>
              </div>

              {/* 3. Máquina + Depreciação */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  <span className="text-white/80 font-medium">Máquina + Manutenção/Depreciação:</span>
                </div>
                <strong className="text-white">R$ {(custoTotalMaquina + custoTotalManutencaoDepreciacao).toFixed(2)}</strong>
              </div>

              {/* 4. Energia */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-white/80 font-medium">Energia Elétrica:</span>
                </div>
                <strong className="text-white">R$ {custoTotalEnergia.toFixed(2)}</strong>
              </div>

              {/* 5. Estrutura / Aluguel */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-white/80 font-medium">Estrutura & Aluguel:</span>
                </div>
                <strong className="text-white">R$ {custoTotalEstrutura.toFixed(2)}</strong>
              </div>

              {/* 6. Funcionários */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-white/80 font-medium">Funcionários (Mão de Obra):</span>
                </div>
                <strong className="text-white">R$ {custoTotalMaoDeObra.toFixed(2)}</strong>
              </div>

              {/* 7. Comissão */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-400" />
                  <span className="text-white/80 font-medium">Comissão ({comissaoDesejada}%):</span>
                </div>
                <strong className="text-amber-400">R$ {valorComissaoRecomendada.toFixed(2)}</strong>
              </div>
            </div>

            {/* Totalizador */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs font-black">
              <span className="text-rose-400 uppercase tracking-wide">Custo Real Consolidado:</span>
              <span className="text-rose-300 text-sm">R$ {custoReal.toFixed(2)}</span>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CONFIGURAÇÃO DE CUSTOS FIXOS DA EMPRESA (ALUGUEL, ENERGIA, ETC) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Parâmetros Financeiros & Custos Fixos da Empresa"
        size="lg"
      >
        <div className="space-y-4 p-2">
          <p className="text-xs text-white/60">
            Defina os custos operacionais fixos da empresa. O sistema rateia estes valores pelas horas produtivas do mês para aplicar automaticamente na precificação.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase mb-1">
                Aluguel + IPTU Mensal (R$)
              </label>
              <input
                type="number"
                step="50"
                value={custosEmpresa.aluguelMensal}
                onChange={(e) => setCustosEmpresa({ ...custosEmpresa, aluguelMensal: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase mb-1">
                Conta de Energia Mensal (R$)
              </label>
              <input
                type="number"
                step="50"
                value={custosEmpresa.energiaMensal}
                onChange={(e) => setCustosEmpresa({ ...custosEmpresa, energiaMensal: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase mb-1">
                Outros Custos Fixos (Internet, Software, Contador) (R$)
              </label>
              <input
                type="number"
                step="50"
                value={custosEmpresa.outrosCustosFixos}
                onChange={(e) => setCustosEmpresa({ ...custosEmpresa, outrosCustosFixos: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase mb-1">
                Horas Produtivas / Mês da Empresa
              </label>
              <input
                type="number"
                step="4"
                value={custosEmpresa.horasProdutivasMes}
                onChange={(e) => setCustosEmpresa({ ...custosEmpresa, horasProdutivasMes: parseInt(e.target.value) || 1 })}
                className="w-full bg-slate-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
              />
              <span className="text-[10px] text-white/40">Padrão: 176h (22 dias x 8h/dia)</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase mb-1">
                Tarifa de Energia (R$/kWh)
              </label>
              <input
                type="number"
                step="0.05"
                value={custosEmpresa.tarifaKwh}
                onChange={(e) => setCustosEmpresa({ ...custosEmpresa, tarifaKwh: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase mb-1">
                Margem de Lucro Alvo Padrão (%)
              </label>
              <input
                type="number"
                step="1"
                value={custosEmpresa.margemLucroAlvoPct}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setCustosEmpresa({ ...custosEmpresa, margemLucroAlvoPct: val });
                  setMargemAlvoDesejada(val);
                }}
                className="w-full bg-slate-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
            <button
              onClick={() => setIsConfigModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white"
            >
              Salvar Parâmetros
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: GESTÃO E CADASTRO DE MÁQUINAS */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isMaquinasModalOpen}
        onClose={() => setIsMaquinasModalOpen(false)}
        title="Cadastro & Custos Operacionais das Máquinas"
        size="xl"
      >
        <div className="space-y-4 p-2">
          <p className="text-xs text-white/60">
            Configure o custo/hora, consumo de tinta por m², manutenção, depreciação e potência de cada máquina.
          </p>

          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3 pr-1">
            {maquinas.map((maq, index) => (
              <div key={maq.id} className="bg-slate-800/80 p-3.5 rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-cyan-400" />
                    <input
                      type="text"
                      value={maq.nome}
                      onChange={(e) => {
                        const newMaq = [...maquinas];
                        newMaq[index].nome = e.target.value;
                        setMaquinas(newMaq);
                      }}
                      className="bg-transparent border-b border-white/15 text-xs font-bold text-white focus:outline-none focus:border-cyan-400 px-1 py-0.5"
                    />
                  </div>
                  
                  <label className="flex items-center gap-1.5 text-xs text-white/70 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maq.ativa}
                      onChange={(e) => {
                        const newMaq = [...maquinas];
                        newMaq[index].ativa = e.target.checked;
                        setMaquinas(newMaq);
                      }}
                      className="rounded bg-slate-700 text-cyan-500"
                    />
                    <span>Ativa</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div>
                    <label className="block text-[9px] font-bold text-white/50 uppercase">Custo Máq/Hora</label>
                    <input
                      type="number"
                      step="1"
                      value={maq.custoHora}
                      onChange={(e) => {
                        const newMaq = [...maquinas];
                        newMaq[index].custoHora = parseFloat(e.target.value) || 0;
                        setMaquinas(newMaq);
                      }}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-white text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-white/50 uppercase">Tinta (R$/m²)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={maq.custoTintaM2}
                      onChange={(e) => {
                        const newMaq = [...maquinas];
                        newMaq[index].custoTintaM2 = parseFloat(e.target.value) || 0;
                        setMaquinas(newMaq);
                      }}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-white text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-white/50 uppercase">Manutenção/h</label>
                    <input
                      type="number"
                      step="0.5"
                      value={maq.manutencaoHora}
                      onChange={(e) => {
                        const newMaq = [...maquinas];
                        newMaq[index].manutencaoHora = parseFloat(e.target.value) || 0;
                        setMaquinas(newMaq);
                      }}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-white text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-white/50 uppercase">Depreciação/h</label>
                    <input
                      type="number"
                      step="0.5"
                      value={maq.depreciacaoHora}
                      onChange={(e) => {
                        const newMaq = [...maquinas];
                        newMaq[index].depreciacaoHora = parseFloat(e.target.value) || 0;
                        setMaquinas(newMaq);
                      }}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-white text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-white/50 uppercase">Potência (kW)</label>
                    <input
                      type="number"
                      step="0.2"
                      value={maq.potenciaKw}
                      onChange={(e) => {
                        const newMaq = [...maquinas];
                        newMaq[index].potenciaKw = parseFloat(e.target.value) || 0;
                        setMaquinas(newMaq);
                      }}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-white text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-white/10">
            <button
              onClick={() => {
                const novaMaq: MaquinaConfig = {
                  id: 'maq-' + Date.now(),
                  nome: 'Nova Máquina',
                  custoHora: 20.00,
                  custoTintaM2: 0.00,
                  manutencaoHora: 4.00,
                  depreciacaoHora: 5.00,
                  potenciaKw: 2.0,
                  tipo: 'impressao',
                  ativa: true,
                };
                setMaquinas([...maquinas, novaMaq]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white"
            >
              <Plus size={14} /> Adicionar Máquina
            </button>

            <button
              onClick={() => setIsMaquinasModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Concluir & Salvar
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: HISTÓRICO DE PRECIFICAÇÕES SALVAS */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isHistoricoModalOpen}
        onClose={() => setIsHistoricoModalOpen(false)}
        title="Histórico de Precificações & Orçamentos Salvos"
        size="xl"
      >
        <div className="space-y-4 p-2">
          {historico.length === 0 ? (
            <div className="py-12 text-center text-white/40 text-xs">
              Nenhuma precificação salva no histórico ainda. Clique em "Salvar Orçamento" para armazenar suas simulações.
            </div>
          ) : (
            <div className="max-h-[65vh] overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {historico.map(h => (
                <div key={h.id} className="bg-slate-800/70 p-4 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white">{h.servico}</h4>
                      <span className="text-[11px] text-white/50">
                        {h.material} • {h.unidade} • {new Date(h.data).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="block text-xs font-bold text-white/60">Preço Sugerido</span>
                      <strong className="text-base font-black text-emerald-400">
                        R$ {h.precoRecomendado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px] text-white/60">
                    <span>Custo Real: <strong className="text-rose-400">R$ {h.custoReal.toFixed(2)}</strong></span>
                    <span>Lucro: <strong className="text-emerald-400">R$ {h.lucro.toFixed(2)}</strong></span>
                    <span>Margem: <strong className="text-cyan-400">{h.margemPct.toFixed(1)}%</strong></span>
                    <span>Lucro/Hora: <strong className="text-amber-400">R$ {h.lucroPorHora.toFixed(2)}/h</strong></span>

                    <button
                      onClick={() => {
                        setHistorico(prev => prev.filter(item => item.id !== h.id));
                      }}
                      className="text-rose-400 hover:text-rose-300 ml-auto"
                      title="Excluir do histórico"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
};
