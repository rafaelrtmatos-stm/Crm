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
  ShoppingCart,
  Droplet,
  Cpu,
  Gauge,
  PackagePlus,
  Maximize2
} from 'lucide-react';
import { Company, AppUser, Product, Maquina, MaquinaCalculos, MateriaPrima, calcularCustosMaquina, calcularTempoProducaoMinutos, VELOCIDADE_CABECA_MIN_MMS, VELOCIDADE_CABECA_MAX_MMS } from '../types';
import { supabase } from '../supabase';
import { showAlert, showConfirm } from '../lib/notify';
import { Badge, Button, Modal } from './SharedUI';
import { useApp } from '../AppContext';
import { fetchMaquinas } from '../lib/maquinasStorage';
import { fetchMateriasPrimas } from '../lib/materiasPrimasStorage';
import { MaquinasModule } from './MaquinasModule';

interface PrecificacaoModuleProps {
  currentCompany?: Company | null;
  user?: AppUser | null;
  initialMaquinaId?: string;
}

export interface CustosFixosEmpresa {
  aluguelMensal: number;
  energiaMensal: number;
  outrosCustosFixos: number; // Internet, software, contador, etc.
  horasProdutivasMes: number; // Ex: 176h (22 dias x 8h)
  tarifaKwh: number; // Ex: R$ 0,98 por kWh
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

const DEFAULT_CUSTOS_EMPRESA: CustosFixosEmpresa = {
  aluguelMensal: 3500.00,
  energiaMensal: 1200.00,
  outrosCustosFixos: 1800.00, // Internet, software RIP, contador, limpeza, água
  horasProdutivasMes: 176, // 22 dias úteis x 8 horas diárias
  tarifaKwh: 0.98,
  impostosPadraoPct: 6.0, // Simples Nacional Comércio/Serviço
  taxaCartaoPct: 3.5, // Média débito/crédito
  comissaoPadraoPct: 10.0, // 10% de comissão para a equipe/vendas
  margemLucroAlvoPct: 50.0, // 50% de margem líquida desejada
};

const STORAGE_KEY_CUSTOS = 'rpro_precificacao_custos_empresa';
const STORAGE_KEY_HISTORICO = 'rpro_precificacao_historico';

export const PrecificacaoModule: React.FC<PrecificacaoModuleProps> = ({ currentCompany, user, initialMaquinaId }) => {
  const { setActiveTab } = useApp();

  // Dados carregados do sistema
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loadingDados, setLoadingDados] = useState(true);

  // Lista de máquinas dinâmicas cadastradas
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [materiasPrimasList, setMateriasPrimasList] = useState<MateriaPrima[]>([]);

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
  const [maquinaId, setMaquinaId] = useState<string>(initialMaquinaId || '');
  const [modoImpressaoSelecionado, setModoImpressaoSelecionado] = useState<NonNullable<Maquina['modoImpressao']>>('standard');
  const [velocidadeCabecaSelecionada, setVelocidadeCabecaSelecionada] = useState<number>(400);
  const [colaboradorId, setColaboradorId] = useState('media'); // 'media' ou id de um colaborador

  // Prazo de entrega
  const [prazoEntrega, setPrazoEntrega] = useState('2 dias úteis');

  // Ajustes dinâmicos de margem e taxas para a simulação atual
  const [margemAlvoDesejada, setMargemAlvoDesejada] = useState<number>(custosEmpresa.margemLucroAlvoPct);
  const [comissaoDesejada, setComissaoDesejada] = useState<number>(custosEmpresa.comissaoPadraoPct);
  const [impostosDesejado, setImpostosDesejado] = useState<number>(custosEmpresa.impostosPadraoPct);
  const [taxaCartaoDesejada, setTaxaCartaoDesejada] = useState<number>(custosEmpresa.taxaCartaoPct);

  // Insumos e acabamentos adicionais (ex: ilhós, fita dupla face, bastão)
  const [insumosExtras, setInsumosExtras] = useState<Array<{ id: string; nome: string; quantidade: number; valorUnitario: number; valor: number }>>([]);
  const [novoInsumoNome, setNovoInsumoNome] = useState('');
  const [novoInsumoQtd, setNovoInsumoQtd] = useState<number | ''>(1);
  const [novoInsumoValor, setNovoInsumoValor] = useState<number | ''>('');
  const [modoCustomizadoId, setModoCustomizadoId] = useState<string>('');

  // Modais de Gestão
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isMaquinasModalOpen, setIsMaquinasModalOpen] = useState(false);
  const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Carrega máquinas do storage / Supabase
  const loadMaquinasData = async () => {
    try {
      const data = await fetchMaquinas(currentCompany?.id);
      setMaquinas(data);
      if (!maquinaId && data.length > 0) {
        setMaquinaId(data[0].id);
      }
    } catch (e) {
      console.error('Erro ao carregar máquinas:', e);
    }
  };

  useEffect(() => {
    loadMaquinasData();
  }, [currentCompany?.id]);

  useEffect(() => {
    if (initialMaquinaId) {
      setMaquinaId(initialMaquinaId);
    }
  }, [initialMaquinaId]);

  // Carrega produtos do estoque e colaboradores do sistema
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingDados(true);

        // 1. Carrega produtos, materiais e matérias-primas cadastradas
        let queryProd = supabase.from('produtos').select('*').order('name', { ascending: true });
        if (currentCompany?.id) {
          queryProd = queryProd.or(`company_id.eq.${currentCompany.id},company_id.is.null`);
        }
        let { data: prodData, error: prodErr } = await queryProd;
        if (prodErr) {
          const fallback = await supabase.from('produtos').select('*');
          prodData = fallback.data;
        }

        const rawMateriasPrimas = await fetchMateriasPrimas(currentCompany?.id);
        const activeMPs = (rawMateriasPrimas || []).filter(m => m.isActive);
        setMateriasPrimasList(activeMPs);

        const mappedFromMPs: Product[] = activeMPs.map(mp => {
          const custoM2 = mp.custoPorM2 || (mp.larguraMaterial && mp.larguraMaterial > 0 ? mp.costPrice / mp.larguraMaterial : mp.costPrice);
          return {
            id: `mp_${mp.id}`,
            name: `[Matéria-Prima] ${mp.name}`,
            code: mp.id.slice(0, 8),
            price: Number(mp.costPrice),
            costPrice: mp.unit === 'm' ? custoM2 : Number(mp.costPrice),
            stock: Number(mp.quantidadeEstoque || 0),
            unitType: mp.unit === 'm' ? 'm2' : mp.unit,
            tipoItem: 'material',
            larguraRolo: mp.larguraMaterial,
          } as any;
        });

        const mappedProd: Product[] = (prodData || []).map((p: any) => ({
          id: p.id,
          name: p.name || p.nome || 'Produto',
          code: p.code || p.codigo || '',
          price: Number(p.sale_price ?? p.preco ?? p.price ?? 0),
          costPrice: Number(p.cost_price ?? p.preco_custo ?? 0),
          stock: Number(p.current_stock ?? p.estoque ?? p.stock ?? 0),
          unitType: p.unit || p.unidade || p.unit_type || 'unit',
          tipoItem: p.tipo_item || 'produto',
          larguraRolo: p.largura_rolo ? Number(p.largura_rolo) : undefined,
        } as any));

        const allAvailableMaterials = [...mappedFromMPs, ...mappedProd];
        setProdutos(allAvailableMaterials);

        // Se não houver material selecionado, seleciona o primeiro material/produto
        if (!materialId && allAvailableMaterials.length > 0) {
          const defaultMat = allAvailableMaterials.find(p => p.tipoItem === 'material' || p.name.toLowerCase().includes('lona') || p.name.toLowerCase().includes('adesivo')) || allAvailableMaterials[0];
          setMaterialId(defaultMat.id);
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

  // Sempre que trocar de máquina, parte do modo/velocidade de cabeça configurados como padrão dela
  useEffect(() => {
    if (maquinaSelecionada) {
      setModoImpressaoSelecionado(maquinaSelecionada.modoImpressao || 'standard');
      setVelocidadeCabecaSelecionada(maquinaSelecionada.velocidadeCabecaMmS || 400);
    }
  }, [maquinaSelecionada?.id]);

  // Cálculos dinâmicos e automáticos da máquina selecionada
  const maquinaCalculos = useMemo<MaquinaCalculos>(() => {
    if (!maquinaSelecionada) {
      return {
        depreciacaoHora: 0,
        manutencaoHora: 0,
        cabecaHora: 0,
        energiaHora: 0,
        custoTintaM2: 0,
        custoTotalMaquinaHora: 0,
        custoTotalMaquinaM2: 0,
        tempoProduzir1M2Minutos: 0,
        tempoProduzir1M2Horas: 0
      };
    }
    return calcularCustosMaquina(maquinaSelecionada, custosEmpresa.tarifaKwh);
  }, [maquinaSelecionada, custosEmpresa.tarifaKwh]);

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

  // Modo de impressão personalizado selecionado da máquina (se houver)
  const modoCustomizadoSelecionado = useMemo(() => {
    if (!maquinaSelecionada?.modosImpressaoList || !modoCustomizadoId) return null;
    return maquinaSelecionada.modosImpressaoList.find(m => m.id === modoCustomizadoId) || null;
  }, [maquinaSelecionada, modoCustomizadoId]);

  // Tempo sugerido de produção calculado automaticamente pela velocidade/calibração da máquina,
  // considerando o modo de impressão (Standard/High Speed/Modos Customizados) e a velocidade de cabeça selecionados
  const tempoSugeridoMinutos = useMemo(() => {
    if (!maquinaSelecionada || areaTotalM2 <= 0) return 0;

    if (modoCustomizadoSelecionado) {
      const vel = Math.max(0.1, modoCustomizadoSelecionado.velocidadeM2H);
      const tempoBaseMin = (areaTotalM2 / vel) * 60;
      const setupMin = Number(maquinaSelecionada.tempoSetupMin ?? maquinaSelecionada.calibSetupMin ?? 10);
      return Math.max(5, Math.ceil(tempoBaseMin + setupMin));
    }

    const minutos = calcularTempoProducaoMinutos(maquinaSelecionada, areaTotalM2, modoImpressaoSelecionado, velocidadeCabecaSelecionada);
    return minutos > 0 ? Math.max(5, Math.ceil(minutos)) : 0;
  }, [areaTotalM2, maquinaSelecionada, modoImpressaoSelecionado, velocidadeCabecaSelecionada, modoCustomizadoSelecionado]);

  // ==========================================
  // CÁLCULOS AUTOMÁTICOS DE CUSTOS (PUXADOS DO SISTEMA E DAS MÁQUINAS)
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
  const custoTintaPorM2 = maquinaCalculos.custoTintaM2;
  const custoTotalTinta = useMemo(() => {
    if (maquinaSelecionada?.tintaConsumoMlM2 && maquinaSelecionada.tintaConsumoMlM2 > 0) {
      return areaTotalM2 * custoTintaPorM2;
    }
    return 0;
  }, [maquinaSelecionada, areaTotalM2, custoTintaPorM2]);

  // 3. Custo Operacional da Máquina (Depreciação + Manutenção + Cabeça + Energia)
  const custoHoraMaquina = maquinaCalculos.custoTotalMaquinaHora;
  const custoTotalMaquina = useMemo(() => {
    return tempoHorasNum * custoHoraMaquina;
  }, [tempoHorasNum, custoHoraMaquina]);

  // 4. Manutenção e Depreciação da Máquina (para detalhamento de Raio-X)
  const manutencaoHora = maquinaCalculos.manutencaoHora;
  const depreciacaoHora = maquinaCalculos.depreciacaoHora;
  const cabecaHora = maquinaCalculos.cabecaHora;
  const energiaHora = maquinaCalculos.energiaHora;

  // 5. Energia Elétrica (Rateio Estrutural da Fábrica)
  const horasProdutivasTotal = Math.max(1, custosEmpresa.horasProdutivasMes);
  const custoEnergiaEstruturaHora = custosEmpresa.energiaMensal / horasProdutivasTotal;

  const custoTotalEnergia = useMemo(() => {
    return tempoHorasNum * (custoEnergiaEstruturaHora + energiaHora);
  }, [tempoHorasNum, custoEnergiaEstruturaHora, energiaHora]);

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
      custoTotalEstrutura +
      custoTotalMaoDeObra
    );
  }, [
    custoTotalMaterial,
    custoTotalInsumosExtras,
    custoTotalTinta,
    custoTotalMaquina,
    custoTotalEstrutura,
    custoTotalMaoDeObra
  ]);

  // =========================================================================
  // FÓRMULA DE MARGEM POR DENTRO E FORMAÇÃO AUTOMÁTICA DE PREÇOS
  // =========================================================================
  const totalTaxasPercentuais = useMemo(() => {
    return (comissaoDesejada + impostosDesejado + taxaCartaoDesejada + margemAlvoDesejada) / 100;
  }, [comissaoDesejada, impostosDesejado, taxaCartaoDesejada, margemAlvoDesejada]);

  const precoRecomendado = useMemo(() => {
    const divisor = Math.max(0.05, 1 - totalTaxasPercentuais);
    const preco = subtotalCustosProducao / divisor;
    return Math.max(0, preco);
  }, [subtotalCustosProducao, totalTaxasPercentuais]);

  const valorComissaoRecomendada = useMemo(() => {
    return precoRecomendado * (comissaoDesejada / 100);
  }, [precoRecomendado, comissaoDesejada]);

  const valorImpostos = useMemo(() => {
    return precoRecomendado * (impostosDesejado / 100);
  }, [precoRecomendado, impostosDesejado]);

  const valorTaxaCartao = useMemo(() => {
    return precoRecomendado * (taxaCartaoDesejada / 100);
  }, [precoRecomendado, taxaCartaoDesejada]);

  const custoReal = useMemo(() => {
    return subtotalCustosProducao + valorComissaoRecomendada;
  }, [subtotalCustosProducao, valorComissaoRecomendada]);

  const precoMinimo = useMemo(() => {
    const taxasSemMargem = (comissaoDesejada + impostosDesejado + taxaCartaoDesejada) / 100;
    const divisor = Math.max(0.05, 1 - taxasSemMargem);
    return subtotalCustosProducao / divisor;
  }, [subtotalCustosProducao, comissaoDesejada, impostosDesejado, taxaCartaoDesejada]);

  const lucroLiquido = useMemo(() => {
    return Math.max(0, precoRecomendado - subtotalCustosProducao - valorComissaoRecomendada - valorImpostos - valorTaxaCartao);
  }, [precoRecomendado, subtotalCustosProducao, valorComissaoRecomendada, valorImpostos, valorTaxaCartao]);

  const margemEfetivaPct = useMemo(() => {
    if (precoRecomendado <= 0) return 0;
    return (lucroLiquido / precoRecomendado) * 100;
  }, [lucroLiquido, precoRecomendado]);

  const markupPct = useMemo(() => {
    if (custoReal <= 0) return 0;
    return ((precoRecomendado - custoReal) / custoReal) * 100;
  }, [precoRecomendado, custoReal]);

  const lucroPorHora = useMemo(() => {
    if (tempoHorasNum <= 0) return lucroLiquido;
    return lucroLiquido / tempoHorasNum;
  }, [lucroLiquido, tempoHorasNum]);

  const precoUnitario = useMemo(() => {
    return qtdNum > 0 ? precoRecomendado / qtdNum : precoRecomendado;
  }, [precoRecomendado, qtdNum]);

  const precoPorM2 = useMemo(() => {
    return areaTotalM2 > 0 ? precoRecomendado / areaTotalM2 : precoRecomendado;
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
  const handleAddInsumoExtra = (customNome?: string, customValor?: number, customQtd?: number) => {
    const nomeFinal = (customNome !== undefined ? customNome : novoInsumoNome).trim();
    const valorUnit = Number(customValor !== undefined ? customValor : novoInsumoValor);
    const qtd = Number(customQtd !== undefined ? customQtd : novoInsumoQtd) || 1;

    if (!nomeFinal || valorUnit <= 0) return;

    setInsumosExtras(prev => [
      ...prev,
      {
        id: 'insumo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        nome: nomeFinal,
        quantidade: qtd,
        valorUnitario: valorUnit,
        valor: qtd * valorUnit
      }
    ]);
    if (customNome === undefined) {
      setNovoInsumoNome('');
      setNovoInsumoValor('');
      setNovoInsumoQtd(1);
    }
  };

  const handleSelectMateriaPrimaAsInsumo = (mpId: string) => {
    if (!mpId) return;
    const mp = materiasPrimasList.find(m => m.id === mpId);
    if (!mp) return;
    const preco = Number(mp.costPrice) || 1;
    setNovoInsumoNome(`${mp.name} (${mp.unit || 'un'})`);
    setNovoInsumoValor(preco);
    setNovoInsumoQtd(1);
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
- Máquina (Deprec/Manut/Cabeça/Energia): R$ ${custoTotalMaquina.toFixed(2)}
- Mão de Obra: R$ ${custoTotalMaoDeObra.toFixed(2)}
- Estrutura + Energia Fixa: R$ ${(custoTotalEstrutura + custoTotalEnergia).toFixed(2)}
- Comissão (${comissaoDesejada}%): R$ ${valorComissaoRecomendada.toFixed(2)}
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
    try {
      const itemParaPDV = {
        name: nomeFinal,
        price: precoRecomendado,
        costPrice: custoReal,
        quantity: qtdNum,
        width: larguraEmMetros,
        height: alturaEmMetros,
        area: areaTotalM2,
        observations: `Precificado via Financeiro: Material ${materialSelecionado?.name || ''} • Máquina: ${maquinaSelecionada?.nome || ''} • Prazo: ${prazoEntrega}`
      };
      sessionStorage.setItem('rpro_pos_item_precificado', JSON.stringify(itemParaPDV));
      showAlert(`Serviço "${nomeFinal}" enviado para o PDV! Redirecionando...`);
      setActiveTab('pos');
    } catch (e) {
      showAlert('Não foi possível transferir o item para o PDV.');
    }
  };

  return (
    <div className="space-y-6 pb-36 sm:pb-36 lg:pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 shrink-0">
              <Calculator size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black text-white italic tracking-tight uppercase">
                  Motor de Precificação Inteligente
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Formação Automática
                </span>
              </div>
              <p className="text-xs text-white/50">
                Calcula custos de matéria-prima, máquinas, depreciação, cabeças, tinta, energia, estrutura e equipe, sugerindo o preço de venda ideal.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Header - Fully Responsive on Mobile */}
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors shadow-sm text-center"
            title="Parâmetros de Custos Fixos da Empresa"
          >
            <Settings size={14} className="text-primary-400 shrink-0" />
            <span className="truncate">Custos Fixos</span>
          </button>

          <button
            onClick={() => setIsMaquinasModalOpen(true)}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors shadow-sm text-center"
            title="Gerenciar Máquinas e Custos Operacionais"
          >
            <Wrench size={14} className="text-cyan-400 shrink-0" />
            <span className="truncate">Máquinas ({maquinas.filter(m => m.ativa).length})</span>
          </button>

          <button
            onClick={() => setIsHistoricoModalOpen(true)}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors shadow-sm text-center"
            title="Ver Histórico de Precificações Salvas"
          >
            <FileText size={14} className="text-indigo-400 shrink-0" />
            <span className="truncate">Histórico ({historico.length})</span>
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
                  value={servicoSelecionadoId || ''}
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

            {/* Material Principal / Insumo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-white/70 uppercase">
                  Matéria-Prima Principal (Estoque)
                </label>
                {materialSelecionado && (
                  <span className="text-[11px] text-emerald-400 font-bold">
                    Custo Estoque: R$ {((materialSelecionado as any).costPrice || 0).toFixed(2)} / {materialSelecionado.unitType || 'un'}
                  </span>
                )}
              </div>

              <select
                value={materialId || ''}
                onChange={(e) => handleSelectMaterial(e.target.value)}
                className="w-full bg-slate-800/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
              >
                <option value="">-- Selecionar Matéria-Prima --</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} • Custo: R$ {Number((p as any).costPrice || 0).toFixed(2)} ({p.unitType || 'un'})
                  </option>
                ))}
              </select>
            </div>

            {/* Modo de Cálculo & Dimensões */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-xs font-bold text-white/70 uppercase">
                  Dimensões & Formato de Cálculo
                </label>
                <div className="grid grid-cols-3 sm:flex bg-slate-800 p-1 rounded-xl border border-white/10 text-xs w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setModoCalculo('m2')}
                    className={`px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg font-bold text-center transition-all ${
                      modoCalculo === 'm2' ? 'bg-primary-500 text-white shadow-md' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Por m² (Área)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoCalculo('metro')}
                    className={`px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg font-bold text-center transition-all ${
                      modoCalculo === 'metro' ? 'bg-primary-500 text-white shadow-md' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Metro Linear
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoCalculo('unit')}
                    className={`px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg font-bold text-center transition-all ${
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
                      value={unidadeMedida || 'metros'}
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

              {/* Resumo visual da área total e compatibilidade com a máquina */}
              {modoCalculo === 'm2' && (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-slate-800/60 p-2.5 rounded-xl border border-white/5 gap-1.5">
                    <span className="text-white/60">
                      Dimensões: <strong className="text-white">{larguraEmMetros.toFixed(2)}m × {alturaEmMetros.toFixed(2)}m</strong> • Unitário: <strong className="text-white">{areaUnitariaM2.toFixed(3)} m²</strong>
                    </span>
                    <span className="text-white/60">
                      Área total ({qtdNum} un): <strong className="text-emerald-400 font-bold">{areaTotalM2.toFixed(3)} m²</strong>
                    </span>
                  </div>

                  {/* Verificador de boca/dimensões da máquina */}
                  {maquinaSelecionada && (
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/50 border border-white/10 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Maximize2 size={14} className="text-cyan-400 shrink-0" />
                        <span className="text-white/70">
                          Boca da Máquina: <strong className="text-cyan-300">{maquinaSelecionada.larguraMaximaM || 1.60}m</strong>
                        </span>
                      </div>
                      <div>
                        {larguraEmMetros <= (Number(maquinaSelecionada.larguraMaximaM) || 1.60) ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ✅ Cabe na boca ({larguraEmMetros.toFixed(2)}m ≤ {maquinaSelecionada.larguraMaximaM || 1.60}m)
                          </span>
                        ) : alturaEmMetros <= (Number(maquinaSelecionada.larguraMaximaM) || 1.60) ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            🔄 Cabe rotacionado ({alturaEmMetros.toFixed(2)}m na boca de {maquinaSelecionada.larguraMaximaM || 1.60}m)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            ⚠️ Excede boca ({larguraEmMetros.toFixed(2)}m × {alturaEmMetros.toFixed(2)}m &gt; {maquinaSelecionada.larguraMaximaM || 1.60}m — necessitará emenda)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Insumos & Acabamentos Extras Opcionais */}
            <div className="pt-3 border-t border-white/10 space-y-3 bg-slate-950/40 p-3 sm:p-4 rounded-2xl border border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <PackagePlus size={16} className="text-primary-400 shrink-0" />
                  <label className="text-xs font-black text-white uppercase tracking-wider">
                    Insumos Adicionais & Acabamentos
                  </label>
                </div>
                {custoTotalInsumosExtras > 0 ? (
                  <span className="text-xs text-primary-300 font-bold bg-primary-500/20 px-2.5 py-0.5 rounded-full border border-primary-500/30 w-fit">
                    Total Insumos: R$ {custoTotalInsumosExtras.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-[10px] text-white/40 italic">
                    Opcional (ilhós, bastão, dupla face, corte...)
                  </span>
                )}
              </div>

              {/* Botões rápidos de acabamentos comuns */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-white/40 block">
                  Sugestões Rápidas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { nome: 'Ilhós Metálico (4 un)', valor: 5.00 },
                    { nome: 'Fita Dupla Face', valor: 8.00 },
                    { nome: 'Bastão e Ponteira', valor: 12.00 },
                    { nome: 'Bainha e Solda Térmica', valor: 6.00 },
                    { nome: 'Refile / Corte Especial', valor: 5.00 },
                    { nome: 'Verniz / Laminação', valor: 15.00 },
                  ].map(sug => (
                    <button
                      key={sug.nome}
                      type="button"
                      onClick={() => handleAddInsumoExtra(sug.nome, sug.valor, 1)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 transition-colors active:scale-95"
                    >
                      <Plus size={11} className="text-primary-400" />
                      <span>{sug.nome} (+R$ {sug.valor.toFixed(0)})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Seletor rápido de Matéria-Prima cadastrada (se houver) */}
              {materiasPrimasList.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-white/40 block">
                    Puxar de Matéria-Prima Cadastrada no Estoque:
                  </span>
                  <select
                    onChange={(e) => {
                      handleSelectMateriaPrimaAsInsumo(e.target.value);
                      e.target.value = '';
                    }}
                    defaultValue=""
                    className="w-full bg-slate-800/90 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  >
                    <option value="" disabled>-- Selecione uma Matéria-Prima cadastrada --</option>
                    {materiasPrimasList.map(mp => (
                      <option key={mp.id} value={mp.id}>
                        {mp.name} — Custo R$ {Number(mp.costPrice || 0).toFixed(2)} / {mp.unit || 'un'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Formulário de Inclusão Manual com Botão de Destaque */}
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/10 space-y-2">
                <span className="text-[10px] uppercase font-bold text-white/60 block">
                  Adicionar Insumo Manual:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <label className="block text-[9px] font-bold text-white/50 uppercase mb-0.5">Descrição do Insumo</label>
                    <input
                      type="text"
                      placeholder="Ex: Tubo de Alumínio, Madeira, Ventosa..."
                      value={novoInsumoNome}
                      onChange={(e) => setNovoInsumoNome(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddInsumoExtra();
                        }
                      }}
                      className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-bold text-white/50 uppercase mb-0.5">Qtd</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="1"
                      value={novoInsumoQtd}
                      onChange={(e) => setNovoInsumoQtd(e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-800 border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-bold text-white/50 uppercase mb-0.5">Valor Unit (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={novoInsumoValor}
                      onChange={(e) => setNovoInsumoValor(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddInsumoExtra();
                        }
                      }}
                      className="w-full bg-slate-800 border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleAddInsumoExtra()}
                      className="w-full h-[36px] flex items-center justify-center gap-1.5 px-3 bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-primary-600/30 transition-all active:scale-95"
                    >
                      <Plus size={14} />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de Insumos Adicionados */}
              {insumosExtras.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-bold text-white/50 uppercase block">
                    Insumos Inclusos nesta Precificação ({insumosExtras.length}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {insumosExtras.map(item => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-2 bg-primary-950/60 border border-primary-500/30 px-3 py-1.5 rounded-xl text-xs text-white shadow-sm"
                      >
                        <span className="font-medium text-white/90">
                          {item.nome} {item.quantidade && item.quantidade > 1 ? `(${item.quantidade}x R$ ${Number(item.valorUnitario || item.valor).toFixed(2)})` : ''}
                        </span>
                        <span className="font-black text-emerald-400">+ R$ {Number(item.valor).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInsumoExtra(item.id)}
                          className="text-white/40 hover:text-rose-400 p-0.5 rounded transition-colors ml-0.5"
                          title="Remover insumo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
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
              <button
                type="button"
                onClick={() => setIsMaquinasModalOpen(true)}
                className="text-[11px] text-cyan-400 hover:underline font-bold flex items-center gap-1"
              >
                <span>Gerenciar Máquinas</span>
              </button>
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
                      {maquinaCalculos.custoTintaM2 > 0 ? `Tinta: R$ ${maquinaCalculos.custoTintaM2.toFixed(2)}/m²` : 'Sem consumo tinta'}
                    </span>
                  )}
                </div>

                <select
                  value={maquinaId || ''}
                  onChange={(e) => setMaquinaId(e.target.value)}
                  className="w-full bg-slate-800/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {maquinas.filter(m => m.ativa).map(m => {
                    const c = calcularCustosMaquina(m, custosEmpresa.tarifaKwh);
                    return (
                      <option key={m.id} value={m.id}>
                        {m.nome} (Boca: {m.larguraMaximaM || 1.60}m • R$ {c.custoTotalMaquinaHora.toFixed(2)}/h • R$ {c.custoTotalMaquinaM2.toFixed(2)}/m²)
                      </option>
                    );
                  })}
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
                    className="flex-1 bg-slate-800/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-bold"
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

            {/* Painel com Detalhes, Dimensões e Modos de Impressão da Máquina */}
            {maquinaSelecionada && (
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-cyan-500/20 space-y-3.5">
                {/* Header da Máquina com Boca e Velocidade */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Gauge size={15} className="text-cyan-400 shrink-0" />
                    <span className="text-white/80 font-bold">
                      Custo Máquina: <strong className="text-cyan-300">R$ {maquinaCalculos.custoTotalMaquinaHora.toFixed(2)}/h</strong> • <strong className="text-emerald-400">R$ {maquinaCalculos.custoTotalMaquinaM2.toFixed(2)}/m²</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-white/60">
                    <span className="flex items-center gap-1">
                      <Maximize2 size={12} className="text-cyan-400" /> Boca: <strong>{maquinaSelecionada.larguraMaximaM || 1.60}m</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-emerald-400" /> Setup: <strong>{maquinaSelecionada.tempoSetupMin || 10} min</strong>
                    </span>
                  </div>
                </div>

                {/* Modos de Impressão Configurados da Máquina */}
                {maquinaSelecionada.modosImpressaoList && maquinaSelecionada.modosImpressaoList.length > 0 ? (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-white/60 uppercase block">
                      Selecione o Modo de Impressão desta Máquina:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {maquinaSelecionada.modosImpressaoList.map((m) => {
                        const isSelected = modoCustomizadoId === m.id;
                        const tempoModoMin = areaTotalM2 > 0
                          ? Math.ceil(((areaTotalM2 / Math.max(0.1, m.velocidadeM2H)) * 60) + (maquinaSelecionada.tempoSetupMin || 10))
                          : 0;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setModoCustomizadoId(m.id);
                              if (tempoModoMin > 0) {
                                setTempoProducaoMinutos(tempoModoMin);
                              }
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md'
                                : 'bg-slate-900/70 border-white/10 hover:border-cyan-500/30 text-white/70'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{m.nome}</span>
                              <span className="text-[10px] font-mono text-cyan-300 font-bold">{m.velocidadeM2H} m²/h</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-white/50 mt-1">
                              <span>{m.resolucaoDpi || '720 DPI'} {m.passes ? `• ${m.passes}p` : ''}</span>
                              {tempoModoMin > 0 && (
                                <strong className="text-emerald-400 font-bold">⏱️ ~{tempoModoMin} min</strong>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Seleção genérica Standard / High Speed */
                  modoCalculo === 'm2' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                          Modo de Impressão
                        </label>
                        <select
                          value={modoImpressaoSelecionado || 'standard'}
                          onChange={(e) => {
                            setModoImpressaoSelecionado(e.target.value as NonNullable<Maquina['modoImpressao']>);
                            setModoCustomizadoId('');
                          }}
                          className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="standard">Standard (Velocidade Normal)</option>
                          <option value="highspeed">High Speed (Modo Rápido)</option>
                          <option value="rascunho">Rascunho / Draft</option>
                          <option value="qualidade">Alta Qualidade / Foto</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">
                          Velocidade de Cabeça (mm/s)
                        </label>
                        <input
                          type="number"
                          step="1"
                          min={VELOCIDADE_CABECA_MIN_MMS}
                          max={VELOCIDADE_CABECA_MAX_MMS}
                          disabled={modoImpressaoSelecionado === 'highspeed'}
                          value={velocidadeCabecaSelecionada}
                          onChange={(e) => {
                            const raw = parseInt(e.target.value, 10);
                            const clamped = Number.isFinite(raw)
                              ? Math.min(Math.max(raw, VELOCIDADE_CABECA_MIN_MMS), VELOCIDADE_CABECA_MAX_MMS)
                              : velocidadeCabecaSelecionada;
                            setVelocidadeCabecaSelecionada(clamped);
                          }}
                          className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 disabled:opacity-40"
                        />
                      </div>
                    </div>
                  )
                )}

                {/* Sub-custos da máquina calculados automaticamente */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] text-white/60">
                  <div className="bg-slate-900/60 p-1.5 rounded-lg border border-white/5">
                    Deprec: <strong className="text-white">R$ {maquinaCalculos.depreciacaoHora.toFixed(2)}/h</strong>
                  </div>
                  <div className="bg-slate-900/60 p-1.5 rounded-lg border border-white/5">
                    Manut: <strong className="text-white">R$ {maquinaCalculos.manutencaoHora.toFixed(2)}/h</strong>
                  </div>
                  <div className="bg-slate-900/60 p-1.5 rounded-lg border border-white/5">
                    Cabeça: <strong className="text-white">R$ {maquinaCalculos.cabecaHora.toFixed(2)}/h</strong>
                  </div>
                  <div className="bg-slate-900/60 p-1.5 rounded-lg border border-white/5">
                    Energia: <strong className="text-white">R$ {maquinaCalculos.energiaHora.toFixed(2)}/h</strong>
                  </div>
                </div>

                {/* Botão de aplicação de tempo automático estimado pelo modo/velocidade selecionados */}
                {tempoSugeridoMinutos > 0 && (
                  <button
                    type="button"
                    onClick={() => setTempoProducaoMinutos(tempoSugeridoMinutos)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-500/30 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Zap size={13} className="text-cyan-400" />
                    <span>
                      ⚡ Aplicar tempo calculado para {areaTotalM2.toFixed(2)}m² (+{maquinaSelecionada.tempoSetupMin || 10}m setup): <strong>{tempoSugeridoMinutos} min</strong>
                    </span>
                  </button>
                )}
              </div>
            )}

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
                  value={colaboradorId || 'media'}
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
                    value={prazoEntrega || ''}
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
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70">Margem Líquida Desejada (%):</span>
                <span className="font-black text-emerald-400 text-sm">{margemAlvoDesejada}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="1"
                value={margemAlvoDesejada}
                onChange={(e) => setMargemAlvoDesejada(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-white/30 font-bold">
                <span>10% (Baixa / Volume)</span>
                <span>35% (Padrão)</span>
                <span>50% (Recomendado)</span>
                <span>70%+ (Alta Exclusividade)</span>
              </div>
            </div>

            {/* Deduções: Comissão, Impostos e Cartão */}
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

            {/* Lista dos pilares do custo puxados automaticamente */}
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
                  <span className="text-white/80 font-medium">Tinta da Máquina ({custoTintaPorM2 > 0 ? `R$ ${custoTintaPorM2.toFixed(2)}/m²` : 'Sem tinta'}):</span>
                </div>
                <strong className="text-white">R$ {custoTotalTinta.toFixed(2)}</strong>
              </div>

              {/* 3. Máquina (Depreciação + Manutenção + Cabeça + Energia) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  <span className="text-white/80 font-medium">Máquina (Deprec.+Manut.+Cabeça+Energia):</span>
                </div>
                <strong className="text-white">R$ {custoTotalMaquina.toFixed(2)}</strong>
              </div>

              {/* 4. Energia Estrutural Fábrica */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-white/80 font-medium">Energia Fábrica:</span>
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
      {/* BARRA FLUTUANTE INFERIOR NO MOBILE (PREÇO + AÇÕES RÁPIDAS SEMPRE VISÍVEIS) */}
      {/* ========================================================================= */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-primary-500/40 p-3 shadow-2xl shadow-black">
        <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
          {/* Valor sugerido */}
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-white/50 block leading-tight">
              Preço ({margemAlvoDesejada}%)
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-400 truncate block">
              R$ {precoRecomendado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Botões de Ação Direta com toques acessíveis */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopiarPropostaComercial}
              className="flex items-center gap-1 py-2.5 px-3 bg-primary-600 active:bg-primary-500 text-white rounded-xl font-black text-xs shadow-md transition-colors min-h-[40px]"
              title="Copiar Proposta WhatsApp"
            >
              {copiedNotification ? <Check size={15} /> : <Share2 size={15} />}
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={handleSalvarPrecificacao}
              className="p-2.5 bg-slate-800 active:bg-slate-700 text-white border border-white/15 rounded-xl font-bold text-xs transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Salvar Orçamento"
            >
              <Save size={16} />
            </button>
            <button
              onClick={handleEnviarParaPDV}
              className="flex items-center gap-1.5 py-2.5 px-3.5 bg-emerald-600 active:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-colors min-h-[40px]"
            >
              <ShoppingCart size={15} />
              <span>PDV</span>
            </button>
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
                Energia Elétrica Média Mensal (R$)
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
                Outros Custos Fixos Mensais (R$)
              </label>
              <input
                type="number"
                step="50"
                placeholder="Software, internet, contador..."
                value={custosEmpresa.outrosCustosFixos}
                onChange={(e) => setCustosEmpresa({ ...custosEmpresa, outrosCustosFixos: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase mb-1">
                Horas Produtivas / Mês
              </label>
              <input
                type="number"
                step="1"
                value={custosEmpresa.horasProdutivasMes}
                onChange={(e) => setCustosEmpresa({ ...custosEmpresa, horasProdutivasMes: parseInt(e.target.value) || 1 })}
                className="w-full bg-slate-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase mb-1">
                Tarifa de Energia (R$/kWh)
              </label>
              <input
                type="number"
                step="0.01"
                value={custosEmpresa.tarifaKwh}
                onChange={(e) => setCustosEmpresa({ ...custosEmpresa, tarifaKwh: parseFloat(e.target.value) || 0.98 })}
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
      {/* MODAL 2: GESTÃO E CADASTRO DE MÁQUINAS (COMPONENTE COMPLETO) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isMaquinasModalOpen}
        onClose={() => {
          setIsMaquinasModalOpen(false);
          loadMaquinasData();
        }}
        title="Cadastro & Custos Operacionais das Máquinas"
        size="xl"
      >
        <div className="p-1 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <MaquinasModule
            currentCompany={currentCompany}
            user={user}
            onSelectMaquinaForPrecificacao={(mId) => {
              setMaquinaId(mId);
              setIsMaquinasModalOpen(false);
            }}
          />
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: HISTÓRICO DE PRECIFICAÇÕES SALVAS */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isHistoricoModalOpen}
        onClose={() => setIsHistoricoModalOpen(false)}
        title="Histórico de Precificações Realizadas"
        size="lg"
      >
        <div className="space-y-3 p-2">
          {historico.length === 0 ? (
            <p className="text-xs text-white/50 text-center py-8">
              Nenhuma precificação salva no histórico ainda.
            </p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {historico.map(h => (
                <div key={h.id} className="bg-slate-800/80 p-4 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{h.servico}</h4>
                      <p className="text-[11px] text-white/50">
                        {h.material} • {h.unidade} • Máquina: {h.maquinaNome || 'Nenhuma'}
                      </p>
                    </div>
                    <span className="text-sm font-black text-emerald-400">
                      R$ {h.precoRecomendado.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] bg-slate-900/60 p-2 rounded-xl border border-white/5">
                    <div>
                      <span className="text-white/40 block">Custo Real:</span>
                      <strong className="text-rose-300">R$ {h.custoReal.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-white/40 block">Lucro Líquido:</span>
                      <strong className="text-emerald-400">R$ {h.lucro.toFixed(2)} ({h.margemPct.toFixed(1)}%)</strong>
                    </div>
                    <div>
                      <span className="text-white/40 block">Lucro/Hora:</span>
                      <strong className="text-cyan-400">R$ {h.lucroPorHora.toFixed(2)}/h</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-white/40 pt-1">
                    <span>Salvo em {new Date(h.data).toLocaleDateString('pt-BR')} às {new Date(h.data).toLocaleTimeString('pt-BR').slice(0, 5)}</span>
                    <button
                      onClick={() => setHistorico(prev => prev.filter(i => i.id !== h.id))}
                      className="text-rose-400 hover:text-rose-300 font-bold"
                    >
                      Excluir
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
