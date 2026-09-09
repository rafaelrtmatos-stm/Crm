import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench, Plus, Search, Edit2, Trash2, CheckCircle2, XCircle,
  Download, RefreshCw, AlertCircle, FileText, Check, X, Tag, DollarSign,
  Zap, Clock, Gauge, Droplet, Cpu, Settings, Copy, Info, ArrowUpDown, Filter, ChevronRight,
  Maximize2, Layers, Sparkles
} from 'lucide-react';
import {
  Company, AppUser, Maquina, ModoImpressaoConfig,
  calcularCustosMaquina, calcularVelocidadeMarginalM2H, calcularTempoProducaoMinutos,
  VELOCIDADE_CABECA_MIN_MMS, VELOCIDADE_CABECA_MAX_MMS
} from '../types';
import {
  calcularDadosModoImpressao,
  normalizarPerfilImpressao,
  PerfilImpressao
} from '../lib/calculoTempoImpressao';
import { showAlert, showConfirm } from '../lib/notify';
import { Badge, Button, Modal } from './SharedUI';
import {
  fetchMaquinas,
  saveMaquina,
  deleteMaquina,
  toggleMaquinaStatus,
  subscribeToMaquinas
} from '../lib/maquinasStorage';
import * as XLSX from 'xlsx';
import { PrintSimulatorWidget } from './PrintSimulatorWidget';

// Componente rápido de simulação embutido em cada card individual de máquina
const MachineCardQuickSimulator: React.FC<{
  maquina: Maquina;
  onOpenFullSim: () => void;
}> = ({ maquina, onOpenFullSim }) => {
  const [area, setArea] = useState<number>(5);
  const perfilPadrao: PerfilImpressao = maquina.modoImpressao === 'highspeed' ? 'high_speed' : maquina.modoImpressao === 'qualidade' ? 'high_quality' : 'standard';
  const [perfil, setPerfil] = useState<PerfilImpressao>(perfilPadrao);

  const tempoMinutos = calcularTempoProducaoMinutos(maquina, area, perfil, maquina.velocidadeCabecaMmS);
  const horas = Math.floor(tempoMinutos / 60);
  const mins = Math.round(tempoMinutos % 60);
  const tempoFmt = horas > 0 ? `${horas}h ${mins > 0 ? `${mins}min` : ''}`.trim() : `${Math.max(1, mins)} min`;

  const custos = calcularCustosMaquina(maquina);
  const vel = calcularVelocidadeMarginalM2H(perfil, maquina.velocidadeCabecaMmS, maquina.calibKMms, maquina.velocidadeHispeedM2H, maquina);
  const custoOperacionalM2 = vel > 0 ? custos.custoTotalMaquinaHora / vel : custos.custoOperacionalM2;
  const custoJob = (area * custoOperacionalM2) + (area * custos.custoTintaM2);

  return (
    <div className="mx-4 mb-3 p-3 bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 rounded-2xl border border-cyan-500/30 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={12} className="text-cyan-400" />
          <span>Simulação Rápida RIP</span>
        </span>
        <button
          type="button"
          onClick={onOpenFullSim}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline font-bold"
        >
          Abrir Completo ↗
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-black/50 rounded-xl border border-white/10 px-2 py-1 flex-1">
          <input
            type="number"
            min="0.1"
            step="0.5"
            value={area}
            onChange={e => setArea(Math.max(0.1, parseFloat(e.target.value) || 1))}
            className="w-14 bg-transparent text-xs font-bold text-white font-mono outline-none"
          />
          <span className="text-[10px] text-white/40 uppercase font-mono">m²</span>
        </div>

        <select
          value={perfil}
          onChange={e => setPerfil(e.target.value as PerfilImpressao)}
          className="bg-black/50 border border-white/10 rounded-xl px-2 py-1 text-[11px] text-white font-bold outline-none flex-1 truncate"
        >
          <option value="high_speed">High Speed (~4.55 m²/h)</option>
          <option value="standard">Standard (~2.26 m²/h)</option>
          <option value="high_quality">High Quality (~1.14 m²/h)</option>
        </select>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px]">
        <div className="flex items-center gap-1 text-cyan-300 font-bold">
          <Clock size={12} />
          <span>Tempo: <strong className="text-white">{tempoFmt}</strong></span>
        </div>
        <div className="text-emerald-400 font-bold font-mono">
          Custo: R$ {custoJob.toFixed(2)}
        </div>
      </div>
    </div>
  );
};

interface MaquinasModuleProps {
  currentCompany?: Company | null;
  user?: AppUser | null;
  onSelectMaquinaForPrecificacao?: (maquinaId: string) => void;
}

const TIPO_MAQUINA_LABELS: Record<string, string> = {
  impressao: 'Impressão Digital / Plotter',
  corte: 'Recorte Eletrônico / Vinil',
  laser: 'Corte e Gravação Laser',
  router: 'Router CNC / Usinagem',
  prensa: 'Prensa Térmica / Transfer',
  acabamento: 'Laminação / Acabamento',
  outra: 'Outra Máquina / Equipamento'
};

const DEFAULT_MODOS_IMPRESSAO: ModoImpressaoConfig[] = [
  { id: 'draft', nome: 'Rascunho / Draft (360x720 dpi)', resolucaoDpi: '360x720', passes: 4, velocidadeM2H: 18, consumoTintaMlM2: 10, descricao: 'Alta velocidade para materiais promocionais e faixas' },
  { id: 'standard', nome: 'Padrão / Standard (720x720 dpi)', resolucaoDpi: '720x720', passes: 6, velocidadeM2H: 12, consumoTintaMlM2: 15, descricao: 'Equilíbrio ideal entre velocidade e qualidade para lonas e adesivos' },
  { id: 'photo', nome: 'Alta Qualidade / Foto (1440x720 dpi)', resolucaoDpi: '1440x720', passes: 8, velocidadeM2H: 6, consumoTintaMlM2: 20, descricao: 'Para quadros, vitrines e alta definição' },
  { id: 'fineart', nome: 'Máxima / Fine Art (1440x1440 dpi)', resolucaoDpi: '1440x1440', passes: 12, velocidadeM2H: 3.5, consumoTintaMlM2: 25, descricao: 'Definição fotográfica máxima e gradientes suaves' },
];

export const MaquinasModule: React.FC<MaquinasModuleProps> = ({ currentCompany, user, onSelectMaquinaForPrecificacao }) => {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Maquina | null>(null);
  const [saving, setSaving] = useState(false);

  // Standalone Simulator State (fora do modal de edição)
  const [showSimulator, setShowSimulator] = useState(true);
  const [selectedSimMaquinaId, setSelectedSimMaquinaId] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    ativa: true,
    tipo: 'impressao' as Maquina['tipo'],
    categoriaProduto: '' as string,
    // Dimensões & Mesa
    larguraMaximaM: 1.60 as number | '',
    alturaMaximaM: '' as number | '',
    areaMesaM2: '' as number | '',
    // Dados Econômicos
    valorMaquina: 65000,
    vidaUtilAnos: 5,
    horasUsoMes: 120,
    manutencaoAnual: 6000,
    potenciaKw: 2.2,
    velocidadeProducaoM2H: 12,
    tempoSetupMin: 10 as number | '',
    modoImpressao: 'standard' as NonNullable<Maquina['modoImpressao']>,
    velocidadeCabecaMmS: 400,
    tempo10m2HighSpeed: 132 as number | '',
    tempo10m2Standard: 265 as number | '',
    tempo10m2HighQuality: 527 as number | '',
    modosImpressaoList: [] as ModoImpressaoConfig[],
    calibSetupMin: '' as number | '',
    calibKMms: '' as number | '',
    velocidadeHispeedM2H: '' as number | '',
    tintaQuantidadeMl: 1000,
    tintaValor: 180,
    tintaConsumoMlM2: 15,
    cabecaValor: 8500,
    cabecaVidaUtilHoras: 2500,
    tarifaKwh: 0.98,
    observacoes: '',
  });

  // Recalcula a velocidade de produção (m²/h) sob demanda
  const aplicarVelocidadeCalculada = () => {
    const velocidadeCalculada = calcularVelocidadeMarginalM2H(
      formData.modoImpressao,
      formData.velocidadeCabecaMmS,
      formData.calibKMms,
      formData.velocidadeHispeedM2H,
      formData
    );
    setFormData(prev => ({ ...prev, velocidadeProducaoM2H: velocidadeCalculada }));
  };

  useEffect(() => {
    loadData();

    // Atualiza automaticamente quando outra máquina (ou outro PC) muda os dados no Supabase
    const unsubscribe = subscribeToMaquinas(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [currentCompany?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchMaquinas(currentCompany?.id);
      setMaquinas(data);
    } catch (err) {
      console.error('Erro ao carregar máquinas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      nome: '',
      ativa: true,
      tipo: 'impressao',
      categoriaProduto: '',
      vidaUtilAnos: 5,
      horasUsoMes: 100,
      manutencaoAnual: 4800,
      potenciaKw: 2.0,
      velocidadeProducaoM2H: 10,
      tempoSetupMin: 10,
      modoImpressao: 'standard',
      velocidadeCabecaMmS: 400,
      tempo10m2HighSpeed: 132,
      tempo10m2Standard: 265,
      tempo10m2HighQuality: 527,
      modosImpressaoList: [],
      calibSetupMin: '',
      calibKMms: '',
      velocidadeHispeedM2H: '',
      tintaQuantidadeMl: 1000,
      tintaValor: 180,
      tintaConsumoMlM2: 15,
      cabecaValor: 6000,
      cabecaVidaUtilHoras: 2000,
      tarifaKwh: 0.98,
      observacoes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Maquina) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      ativa: item.ativa,
      tipo: item.tipo || 'impressao',
      categoriaProduto: item.categoriaProduto || '',
      larguraMaximaM: item.larguraMaximaM ?? 1.60,
      alturaMaximaM: item.alturaMaximaM ?? '',
      areaMesaM2: item.areaMesaM2 ?? '',
      valorMaquina: item.valorMaquina,
      vidaUtilAnos: item.vidaUtilAnos,
      horasUsoMes: item.horasUsoMes,
      manutencaoAnual: item.manutencaoAnual,
      potenciaKw: item.potenciaKw,
      velocidadeProducaoM2H: item.velocidadeProducaoM2H,
      tempoSetupMin: item.tempoSetupMin ?? 10,
      modoImpressao: item.modoImpressao || 'standard',
      velocidadeCabecaMmS: item.velocidadeCabecaMmS || 400,
      tempo10m2HighSpeed: item.tempo10m2HighSpeed ?? 132,
      tempo10m2Standard: item.tempo10m2Standard ?? 265,
      tempo10m2HighQuality: item.tempo10m2HighQuality ?? 527,
      modosImpressaoList: item.modosImpressaoList || [],
      calibSetupMin: item.calibSetupMin ?? '',
      calibKMms: item.calibKMms ?? '',
      velocidadeHispeedM2H: item.velocidadeHispeedM2H ?? '',
      tintaQuantidadeMl: item.tintaQuantidadeMl,
      tintaValor: item.tintaValor,
      tintaConsumoMlM2: item.tintaConsumoMlM2,
      cabecaValor: item.cabecaValor,
      cabecaVidaUtilHoras: item.cabecaVidaUtilHoras,
      tarifaKwh: item.tarifaKwh || 0.98,
      observacoes: item.observacoes || '',
    });
    setIsModalOpen(true);
  };

  const handleDuplicate = (item: Maquina) => {
    setEditingItem(null);
    setFormData({
      nome: `${item.nome} (Cópia)`,
      ativa: true,
      tipo: item.tipo || 'impressao',
      categoriaProduto: item.categoriaProduto || '',
      larguraMaximaM: item.larguraMaximaM ?? 1.60,
      alturaMaximaM: item.alturaMaximaM ?? '',
      areaMesaM2: item.areaMesaM2 ?? '',
      valorMaquina: item.valorMaquina,
      vidaUtilAnos: item.vidaUtilAnos,
      horasUsoMes: item.horasUsoMes,
      manutencaoAnual: item.manutencaoAnual,
      potenciaKw: item.potenciaKw,
      velocidadeProducaoM2H: item.velocidadeProducaoM2H,
      tempoSetupMin: item.tempoSetupMin ?? 10,
      modoImpressao: item.modoImpressao || 'standard',
      velocidadeCabecaMmS: item.velocidadeCabecaMmS || 400,
      tempo10m2HighSpeed: item.tempo10m2HighSpeed ?? 132,
      tempo10m2Standard: item.tempo10m2Standard ?? 265,
      tempo10m2HighQuality: item.tempo10m2HighQuality ?? 527,
      modosImpressaoList: item.modosImpressaoList || [],
      calibSetupMin: item.calibSetupMin ?? '',
      calibKMms: item.calibKMms ?? '',
      velocidadeHispeedM2H: item.velocidadeHispeedM2H ?? '',
      tintaQuantidadeMl: item.tintaQuantidadeMl,
      tintaValor: item.tintaValor,
      tintaConsumoMlM2: item.tintaConsumoMlM2,
      cabecaValor: item.cabecaValor,
      cabecaVidaUtilHoras: item.cabecaVidaUtilHoras,
      tarifaKwh: item.tarifaKwh || 0.98,
      observacoes: item.observacoes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      showAlert('Informe o nome da máquina.');
      return;
    }
    if (formData.valorMaquina < 0) {
      showAlert('O valor da máquina não pode ser negativo.');
      return;
    }

    try {
      setSaving(true);
      const saved = await saveMaquina({
        id: editingItem ? editingItem.id : undefined,
        nome: formData.nome.trim(),
        ativa: formData.ativa,
        tipo: formData.tipo,
        categoriaProduto: formData.categoriaProduto?.trim() || undefined,
        larguraMaximaM: formData.larguraMaximaM === '' ? undefined : Number(formData.larguraMaximaM),
        alturaMaximaM: formData.alturaMaximaM === '' ? undefined : Number(formData.alturaMaximaM),
        areaMesaM2: formData.areaMesaM2 === '' ? undefined : Number(formData.areaMesaM2),
        valorMaquina: Number(formData.valorMaquina) || 0,
        vidaUtilAnos: Number(formData.vidaUtilAnos) || 0,
        horasUsoMes: Number(formData.horasUsoMes) || 0,
        manutencaoAnual: Number(formData.manutencaoAnual) || 0,
        potenciaKw: Number(formData.potenciaKw) || 0,
        velocidadeProducaoM2H: Number(formData.velocidadeProducaoM2H) || 0,
        tempoSetupMin: formData.tempoSetupMin === '' ? undefined : Number(formData.tempoSetupMin),
        modoImpressao: formData.modoImpressao,
        velocidadeCabecaMmS: Number(formData.velocidadeCabecaMmS) || 400,
        tempo10m2HighSpeed: formData.tempo10m2HighSpeed === '' ? undefined : Number(formData.tempo10m2HighSpeed),
        tempo10m2Standard: formData.tempo10m2Standard === '' ? undefined : Number(formData.tempo10m2Standard),
        tempo10m2HighQuality: formData.tempo10m2HighQuality === '' ? undefined : Number(formData.tempo10m2HighQuality),
        modosImpressaoList: formData.modosImpressaoList,
        calibSetupMin: formData.calibSetupMin === '' ? undefined : Number(formData.calibSetupMin),
        calibKMms: formData.calibKMms === '' ? undefined : Number(formData.calibKMms),
        velocidadeHispeedM2H: formData.velocidadeHispeedM2H === '' ? undefined : Number(formData.velocidadeHispeedM2H),
        tintaQuantidadeMl: Number(formData.tintaQuantidadeMl) || 0,
        tintaValor: Number(formData.tintaValor) || 0,
        tintaConsumoMlM2: Number(formData.tintaConsumoMlM2) || 0,
        cabecaValor: Number(formData.cabecaValor) || 0,
        cabecaVidaUtilHoras: Number(formData.cabecaVidaUtilHoras) || 0,
        tarifaKwh: Number(formData.tarifaKwh) || 0.98,
        observacoes: formData.observacoes?.trim() || '',
      }, currentCompany?.id);

      if (editingItem) {
        setMaquinas(prev => prev.map(m => m.id === saved.id ? saved : m));
        showAlert(`Máquina "${saved.nome}" atualizada com sucesso!`);
      } else {
        setMaquinas(prev => [saved, ...prev]);
        showAlert(`Máquina "${saved.nome}" cadastrada com sucesso!`);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao salvar máquina:', err);
      showAlert(`Erro ao salvar máquina: ${err.message || 'Falha na operação'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Maquina) => {
    if (maquinas.length <= 1) {
      showAlert('Você deve manter pelo menos uma máquina cadastrada.');
      return;
    }
    const confirmed = await showConfirm(`Tem certeza que deseja excluir a máquina "${item.nome}"?`);
    if (!confirmed) return;

    try {
      await deleteMaquina(item.id);
      setMaquinas(prev => prev.filter(m => m.id !== item.id));
      showAlert(`Máquina "${item.nome}" excluída com sucesso.`);
    } catch (err) {
      console.error('Erro ao excluir máquina:', err);
      showAlert('Erro ao excluir máquina.');
    }
  };

  const handleToggleStatus = async (item: Maquina) => {
    try {
      const newStatus = await toggleMaquinaStatus(item.id, item.ativa);
      setMaquinas(prev => prev.map(m => m.id === item.id ? { ...m, ativa: newStatus } : m));
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  // Live calculations for the Form Modal
  const formCalculos = useMemo(() => {
    return calcularCustosMaquina(formData, formData.tarifaKwh);
  }, [formData]);

  // Filtered List
  const filteredList = useMemo(() => {
    return maquinas.filter(item => {
      const term = search.toLowerCase().trim();
      const matchesSearch = !term || (
        item.nome.toLowerCase().includes(term) ||
        (item.observacoes && item.observacoes.toLowerCase().includes(term))
      );

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.ativa) ||
        (statusFilter === 'inactive' && !item.ativa);

      const matchesTipo = tipoFilter === 'all' || (item.tipo || 'impressao') === tipoFilter;

      return matchesSearch && matchesStatus && matchesTipo;
    });
  }, [maquinas, search, statusFilter, tipoFilter]);

  const stats = useMemo(() => {
    const total = maquinas.length;
    const active = maquinas.filter(m => m.ativa).length;
    const inactive = total - active;
    const listWithCalculos = maquinas.filter(m => m.ativa).map(m => calcularCustosMaquina(m));
    const avgCustoHora = listWithCalculos.length > 0
      ? listWithCalculos.reduce((acc, c) => acc + c.custoTotalMaquinaHora, 0) / listWithCalculos.length
      : 0;
    const avgCustoM2 = listWithCalculos.length > 0
      ? listWithCalculos.reduce((acc, c) => acc + c.custoTotalMaquinaM2, 0) / listWithCalculos.length
      : 0;
    return { total, active, inactive, avgCustoHora, avgCustoM2 };
  }, [maquinas]);

  const handleExportExcel = () => {
    if (maquinas.length === 0) {
      showAlert('Nenhuma máquina para exportar.');
      return;
    }

    const dataToExport = maquinas.map(item => {
      const c = calcularCustosMaquina(item);
      return {
        'Nome da Máquina': item.nome,
        'Status': item.ativa ? 'Ativa' : 'Inativa',
        'Tipo': TIPO_MAQUINA_LABELS[item.tipo || 'impressao'] || item.tipo,
        'Valor da Máquina (R$)': item.valorMaquina.toFixed(2),
        'Vida Útil (anos)': item.vidaUtilAnos,
        'Horas de Uso/Mês': item.horasUsoMes,
        'Manutenção Anual (R$)': item.manutencaoAnual.toFixed(2),
        'Potência (kW)': item.potenciaKw.toFixed(2),
        'Velocidade (m²/h)': item.velocidadeProducaoM2H.toFixed(2),
        'Qtd Tinta (ml)': item.tintaQuantidadeMl,
        'Valor Tinta (R$)': item.tintaValor.toFixed(2),
        'Consumo Tinta (ml/m²)': item.tintaConsumoMlM2.toFixed(2),
        'Valor Cabeça (R$)': item.cabecaValor.toFixed(2),
        'Vida Cabeça (horas)': item.cabecaVidaUtilHoras,
        'Depreciação/h (R$)': c.depreciacaoHora.toFixed(2),
        'Manutenção/h (R$)': c.manutencaoHora.toFixed(2),
        'Cabeça/h (R$)': c.cabecaHora.toFixed(2),
        'Energia/h (R$)': c.energiaHora.toFixed(2),
        'Custo Tinta/m² (R$)': c.custoTintaM2.toFixed(2),
        'Custo Total Máquina/h (R$)': c.custoTotalMaquinaHora.toFixed(2),
        'Custo Total Máquina/m² (R$)': c.custoTotalMaquinaM2.toFixed(2),
        'Tempo para Produzir 1 m² (min)': c.tempoProduzir1M2Minutos.toFixed(1),
        'Observações': item.observacoes || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Maquinas');
    XLSX.writeFile(wb, `Maquinas_Custos_Operacionais_${currentCompany?.shortName || 'RPro'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Wrench size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight uppercase">
                  Cadastro & Custos das Máquinas
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Cálculo Automático
                </span>
              </div>
              <p className="text-xs text-white/50">
                O sistema calcula automaticamente depreciação, manutenção, cabeça, energia e tinta por hora e por m², aplicando direto na Precificação.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={loadData}
            title="Recarregar dados"
            className="text-xs py-2 px-3 bg-white/5 hover:bg-white/10 text-white/70"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>

          <Button
            variant="secondary"
            onClick={handleExportExcel}
            className="text-xs py-2 px-3 sm:px-4 bg-white/5 hover:bg-white/10 text-white/80"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>

          <Button
            variant="secondary"
            onClick={() => setShowSimulator(!showSimulator)}
            className={`text-xs py-2 px-3 sm:px-4 font-black uppercase tracking-wider transition-all border ${
              showSimulator
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'
            }`}
          >
            <Clock size={14} className="text-cyan-400" />
            <span className="hidden sm:inline">{showSimulator ? 'Ocultar Simulador' : '⚡ Simulador de Tempo'}</span>
            <span className="sm:hidden">⚡ Simulador</span>
          </Button>

          <Button
            variant="primary"
            onClick={handleOpenAdd}
            className="text-xs py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-wider shadow-lg shadow-cyan-600/20"
          >
            <Plus size={16} />
            <span>+ Adicionar Máquina</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Wrench size={20} />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-white/50 uppercase">Total Máquinas</span>
            <strong className="text-lg sm:text-xl font-black text-white">{stats.total}</strong>
          </div>
        </div>

        <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-white/50 uppercase">Ativas / Prontas</span>
            <strong className="text-lg sm:text-xl font-black text-emerald-400">{stats.active}</strong>
          </div>
        </div>

        <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Clock size={20} />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-white/50 uppercase">Custo Médio / Hora</span>
            <strong className="text-lg sm:text-xl font-black text-amber-400">
              R$ {stats.avgCustoHora.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/h
            </strong>
          </div>
        </div>

        <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary-500/10 text-primary-400">
            <Droplet size={20} />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-white/50 uppercase">Custo Médio / m²</span>
            <strong className="text-lg sm:text-xl font-black text-primary-400">
              R$ {stats.avgCustoM2.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/m²
            </strong>
          </div>
        </div>
      </div>

      {/* Standalone Simulator Widget (Fora do Modal de Edição) */}
      {showSimulator && maquinas.length > 0 && (
        <PrintSimulatorWidget
          maquinas={maquinas}
          initialMaquinaId={selectedSimMaquinaId}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Buscar por nome ou observação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/80 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {/* Status Filter */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-white/10 text-xs shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'all' ? 'bg-cyan-500 text-white shadow' : 'text-white/50 hover:text-white'
              }`}
            >
              Todas ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'active' ? 'bg-emerald-500 text-white shadow' : 'text-white/50 hover:text-white'
              }`}
            >
              Ativas ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'inactive' ? 'bg-rose-500 text-white shadow' : 'text-white/50 hover:text-white'
              }`}
            >
              Inativas ({stats.inactive})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-white/10 text-xs shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1.5 rounded-lg font-bold ${viewMode === 'cards' ? 'bg-white/20 text-white' : 'text-white/40'}`}
              title="Visualização em Cards"
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg font-bold ${viewMode === 'table' ? 'bg-white/20 text-white' : 'text-white/40'}`}
              title="Visualização em Tabela"
            >
              Tabela
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Cards or Table */}
      {filteredList.length === 0 ? (
        <div className="bg-slate-900/40 p-12 text-center rounded-3xl border border-white/10 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mx-auto">
            <Wrench size={24} />
          </div>
          <h3 className="text-base font-bold text-white">Nenhuma máquina encontrada</h3>
          <p className="text-xs text-white/50 max-w-md mx-auto">
            {search ? 'Nenhum equipamento corresponde aos filtros aplicados.' : 'Cadastre suas máquinas e equipamentos para calcular os custos operacionais automaticamente.'}
          </p>
          {!search && (
            <Button variant="primary" onClick={handleOpenAdd} className="text-xs py-2 px-4 mt-2 bg-cyan-600 hover:bg-cyan-500">
              <Plus size={14} /> Cadastrar Primeira Máquina
            </Button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredList.map(maquina => {
            const c = calcularCustosMaquina(maquina);
            return (
              <div
                key={maquina.id}
                className={`bg-slate-900/70 backdrop-blur-md rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl ${
                  maquina.ativa ? 'border-white/10 hover:border-cyan-500/40' : 'border-rose-500/20 opacity-70'
                }`}
              >
                {/* Card Header */}
                <div className="p-5 border-b border-white/10 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                        <Wrench size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white leading-tight">
                          {maquina.nome}
                        </h3>
                        <span className="text-[11px] text-white/50">
                          {TIPO_MAQUINA_LABELS[maquina.tipo || 'impressao'] || 'Impressão'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(maquina)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all ${
                        maquina.ativa
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                      }`}
                      title={maquina.ativa ? 'Clique para desativar' : 'Clique para ativar'}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${maquina.ativa ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                      {maquina.ativa ? 'Ativa' : 'Inativa'}
                    </button>
                  </div>

                  {maquina.observacoes && (
                    <p className="text-[11px] text-white/60 bg-white/5 p-2 rounded-xl border border-white/5 line-clamp-2">
                      {maquina.observacoes}
                    </p>
                  )}
                </div>

                {/* Highlighted Automatic Costs Banner */}
                <div className="p-4 bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border-b border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                      <Cpu size={12} /> Custos Automáticos
                    </span>
                    <span className="text-[10px] text-white/40">Tarifa: R$ {(maquina.tarifaKwh || 0.98).toFixed(2)}/kWh</span>
                  </div>

                  {/* 2 Main Big Highlights */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800/90 p-2.5 rounded-2xl border border-cyan-500/30">
                      <span className="block text-[9px] font-bold text-white/50 uppercase">Custo Total / Hora</span>
                      <strong className="text-base sm:text-lg font-black text-cyan-300">
                        R$ {c.custoTotalMaquinaHora.toFixed(2)}
                        <span className="text-[10px] font-normal text-white/50">/h</span>
                      </strong>
                    </div>

                    <div className="bg-slate-800/90 p-2.5 rounded-2xl border border-emerald-500/30">
                      <span className="block text-[9px] font-bold text-white/50 uppercase">Custo Total / m²</span>
                      <strong className="text-base sm:text-lg font-black text-emerald-400">
                        R$ {c.custoTotalMaquinaM2.toFixed(2)}
                        <span className="text-[10px] font-normal text-white/50">/m²</span>
                      </strong>
                    </div>
                  </div>

                  {/* Granular 6-stat grid */}
                  <div className="grid grid-cols-3 gap-1.5 text-[11px] pt-1">
                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                      <span className="block text-[9px] text-white/40 font-bold uppercase">Depreciação/h</span>
                      <span className="font-bold text-white">R$ {c.depreciacaoHora.toFixed(2)}</span>
                    </div>

                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                      <span className="block text-[9px] text-white/40 font-bold uppercase">Manutenção/h</span>
                      <span className="font-bold text-white">R$ {c.manutencaoHora.toFixed(2)}</span>
                    </div>

                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                      <span className="block text-[9px] text-white/40 font-bold uppercase">Cabeça/h</span>
                      <span className="font-bold text-white">R$ {c.cabecaHora.toFixed(2)}</span>
                    </div>

                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                      <span className="block text-[9px] text-white/40 font-bold uppercase">Energia/h</span>
                      <span className="font-bold text-white">R$ {c.energiaHora.toFixed(2)}</span>
                    </div>

                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                      <span className="block text-[9px] text-white/40 font-bold uppercase">Tinta/m²</span>
                      <span className="font-bold text-amber-300">R$ {c.custoTintaM2.toFixed(2)}</span>
                    </div>

                    <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                      <span className="block text-[9px] text-white/40 font-bold uppercase">Tempo 1 m²</span>
                      <span className="font-bold text-purple-300">{c.tempoProduzir1M2Minutos.toFixed(1)} min</span>
                    </div>
                  </div>
                </div>

                {/* Machine Specs Breakdown */}
                <div className="p-4 text-xs space-y-2 text-white/70">
                  {/* Dimensões da Máquina */}
                  <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-white/60 font-semibold flex items-center gap-1.5">
                      <Maximize2 size={13} className="text-cyan-400" /> Boca / Área Útil:
                    </span>
                    <strong className="text-white">
                      {maquina.larguraMaximaM ? `${maquina.larguraMaximaM}m` : '1.60m'}
                      {maquina.alturaMaximaM ? ` × ${maquina.alturaMaximaM}m` : ' (Rolo)'}
                      {maquina.areaMesaM2 ? ` • ${maquina.areaMesaM2}m²` : ''}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Valor Máquina / Vida Útil:</span>
                    <strong className="text-white">R$ {maquina.valorMaquina.toLocaleString('pt-BR')} ({maquina.vidaUtilAnos} anos)</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Uso Mensal / Potência:</span>
                    <strong className="text-white">{maquina.horasUsoMes}h/mês • {maquina.potenciaKw} kW</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Velocidade & Setup:</span>
                    <strong className="text-cyan-400">
                      {maquina.velocidadeProducaoM2H} m²/h • {maquina.tempoSetupMin ? `${maquina.tempoSetupMin} min setup` : '10 min setup'}
                    </strong>
                  </div>
                  {/* Perfis RIP de Velocidade Pré-definidos */}
                  <div className="pt-1">
                    <span className="text-[10px] text-white/40 uppercase font-bold block mb-1">Perfis de Velocidade RIP (Ref. 10 m²):</span>
                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                      <div className={`p-1.5 rounded-lg border text-center ${maquina.modoImpressao === 'highspeed' ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-black/30 border-white/5 text-white/70'}`}>
                        <div className="font-bold flex items-center justify-center gap-1 text-[9px]">
                          <Zap size={10} className="text-amber-400" />
                          <span>High Speed</span>
                        </div>
                        <div className="font-mono text-[9px] text-white font-bold mt-0.5">
                          ~{(10 / ((maquina.tempo10m2HighSpeed || 132) / 60)).toFixed(1)} m²/h
                        </div>
                        <div className="text-[8px] text-white/40 font-mono">
                          {maquina.tempo10m2HighSpeed || 132} min / 10m²
                        </div>
                      </div>

                      <div className={`p-1.5 rounded-lg border text-center ${(!maquina.modoImpressao || maquina.modoImpressao === 'standard') ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' : 'bg-black/30 border-white/5 text-white/70'}`}>
                        <div className="font-bold flex items-center justify-center gap-1 text-[9px]">
                          <Clock size={10} className="text-cyan-400" />
                          <span>Standard</span>
                        </div>
                        <div className="font-mono text-[9px] text-white font-bold mt-0.5">
                          ~{(10 / ((maquina.tempo10m2Standard || 265) / 60)).toFixed(1)} m²/h
                        </div>
                        <div className="text-[8px] text-white/40 font-mono">
                          {maquina.tempo10m2Standard || 265} min / 10m²
                        </div>
                      </div>

                      <div className={`p-1.5 rounded-lg border text-center ${maquina.modoImpressao === 'qualidade' ? 'bg-purple-500/15 border-purple-500/40 text-purple-300' : 'bg-black/30 border-white/5 text-white/70'}`}>
                        <div className="font-bold flex items-center justify-center gap-1 text-[9px]">
                          <Sparkles size={10} className="text-purple-400" />
                          <span>High Quality</span>
                        </div>
                        <div className="font-mono text-[9px] text-white font-bold mt-0.5">
                          ~{(10 / ((maquina.tempo10m2HighQuality || 527) / 60)).toFixed(1)} m²/h
                        </div>
                        <div className="text-[8px] text-white/40 font-mono">
                          {maquina.tempo10m2HighQuality || 527} min / 10m²
                        </div>
                      </div>
                    </div>
                  </div>
                  {maquina.tintaConsumoMlM2 > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Consumo Tinta:</span>
                      <strong className="text-amber-300">{maquina.tintaConsumoMlM2} ml/m² (R$ {maquina.tintaValor}/{maquina.tintaQuantidadeMl}ml)</strong>
                    </div>
                  )}
                  {maquina.cabecaValor > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Cabeça Impressão:</span>
                      <strong className="text-purple-300">R$ {maquina.cabecaValor.toLocaleString('pt-BR')} ({maquina.cabecaVidaUtilHoras}h)</strong>
                    </div>
                  )}
                </div>

                {/* Simulação Rápida Direto no Card (Sem precisar entrar em Editar) */}
                <MachineCardQuickSimulator
                  maquina={maquina}
                  onOpenFullSim={() => {
                    setSelectedSimMaquinaId(maquina.id);
                    setShowSimulator(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />

                {/* Card Action Buttons */}
                <div className="p-4 bg-slate-950/60 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(maquina)}
                      className="p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                      title="Duplicar configuração"
                    >
                      <Copy size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(maquina)}
                      className="p-2.5 rounded-xl text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all active:scale-95 flex items-center justify-center"
                      title="Excluir máquina"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(maquina)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all"
                  >
                    <Edit2 size={13} /> Editar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-slate-900/70 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-white/50 uppercase text-[10px] font-bold border-b border-white/10">
                <tr>
                  <th className="p-4">Máquina</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Velocidade</th>
                  <th className="p-4">Deprec./h</th>
                  <th className="p-4">Manut./h</th>
                  <th className="p-4">Cabeça/h</th>
                  <th className="p-4">Energia/h</th>
                  <th className="p-4">Tinta/m²</th>
                  <th className="p-4">Total / Hora</th>
                  <th className="p-4">Total / m²</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {filteredList.map(maquina => {
                  const c = calcularCustosMaquina(maquina);
                  return (
                    <tr key={maquina.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-white">
                        <div>{maquina.nome}</div>
                        <div className="text-[10px] text-white/40 font-normal">{TIPO_MAQUINA_LABELS[maquina.tipo || 'impressao']}</div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleStatus(maquina)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            maquina.ativa ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {maquina.ativa ? 'Ativa' : 'Inativa'}
                        </button>
                      </td>
                      <td className="p-4 font-semibold text-cyan-400">{maquina.velocidadeProducaoM2H} m²/h</td>
                      <td className="p-4">R$ {c.depreciacaoHora.toFixed(2)}</td>
                      <td className="p-4">R$ {c.manutencaoHora.toFixed(2)}</td>
                      <td className="p-4">R$ {c.cabecaHora.toFixed(2)}</td>
                      <td className="p-4">R$ {c.energiaHora.toFixed(2)}</td>
                      <td className="p-4 text-amber-300 font-semibold">R$ {c.custoTintaM2.toFixed(2)}</td>
                      <td className="p-4 font-black text-cyan-300 bg-cyan-500/5">R$ {c.custoTotalMaquinaHora.toFixed(2)}/h</td>
                      <td className="p-4 font-black text-emerald-400 bg-emerald-500/5">R$ {c.custoTotalMaquinaM2.toFixed(2)}/m²</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(maquina)}
                            className="p-2 rounded-xl text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20 transition-all active:scale-95"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(maquina)}
                            className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 bg-rose-500/10 border border-rose-500/20 transition-all active:scale-95"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADICIONAR / EDITAR MÁQUINA COM CÁLCULOS EM TEMPO REAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Editar Máquina: ${editingItem.nome}` : 'Adicionar Nova Máquina'}
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-5 p-2">
          {/* Top Info Header */}
          <div className="bg-cyan-500/10 border border-cyan-500/20 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs text-cyan-200">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-cyan-400 shrink-0" />
              <span>
                Preencha os dados da máquina abaixo. O sistema calcula automaticamente todos os custos/hora, custos/m² e tempo de produção em tempo real.
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer bg-slate-900/80 px-3 py-1.5 rounded-xl border border-cyan-500/30 text-white font-bold shrink-0">
              <input
                type="checkbox"
                checked={formData.ativa}
                onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
                className="rounded bg-slate-800 text-cyan-500"
              />
              <span>Máquina Ativa</span>
            </label>
          </div>

          {/* DADOS DA MÁQUINA */}
          <div className="bg-slate-800/70 p-4 rounded-2xl border border-white/10 space-y-4">
            <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wide flex items-center gap-1.5">
              <Wrench size={14} /> 1. Dados da Máquina
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">
                  Nome da Máquina *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Plotter Solvente Mimaki 1.60m, Router CNC 2030..."
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">
                  Tipo de Equipamento
                </label>
                <select
                  value={formData.tipo || 'impressao'}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="impressao">Impressão Digital / Plotter Solvente/UV</option>
                  <option value="corte">Plotter de Recorte Vinil</option>
                  <option value="laser">Corte e Gravação a Laser CO2/Fibra</option>
                  <option value="router">Router CNC (Corte/Usinagem)</option>
                  <option value="prensa">Prensa Térmica / Transfer</option>
                  <option value="acabamento">Laminadora / Acabamento</option>
                  <option value="outra">Outro Equipamento</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">
                  Categoria de Produto Atendida
                </label>
                <select
                  value={formData.categoriaProduto}
                  onChange={(e) => setFormData({ ...formData, categoriaProduto: e.target.value })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Nenhuma (não usar custo de máquina por categoria)</option>
                  <option value="substrato">Substrato (Lona/Vinil/Papel)</option>
                  <option value="tinta">Tintas / Toners</option>
                  <option value="acabamento">Acabamento (Ilhós/Verniz)</option>
                  <option value="diversos">Diversos</option>
                </select>
                <p className="text-[10px] text-white/40 mt-1">
                  Mesmas categorias do cadastro de produto (aba Estoque). O custo de máquina por metro
                  linear dos produtos dessa categoria passa a ser calculado automaticamente a partir desta máquina.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">
                  Valor da Máquina (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Ex: 65000"
                  value={formData.valorMaquina}
                  onChange={(e) => setFormData({ ...formData, valorMaquina: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">
                  Vida Útil (Anos) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="Ex: 5"
                  value={formData.vidaUtilAnos}
                  onChange={(e) => setFormData({ ...formData, vidaUtilAnos: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">
                  Horas de Uso por Mês *
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="Ex: 120"
                  value={formData.horasUsoMes}
                  onChange={(e) => setFormData({ ...formData, horasUsoMes: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">
                  Manutenção Anual Estimada (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 6000"
                  value={formData.manutencaoAnual}
                  onChange={(e) => setFormData({ ...formData, manutencaoAnual: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">
                  Potência Elétrica (kW)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 2.2"
                  value={formData.potenciaKw}
                  onChange={(e) => setFormData({ ...formData, potenciaKw: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">
                  Tarifa de Energia (R$/kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  placeholder="Ex: 0.98"
                  value={formData.tarifaKwh}
                  onChange={(e) => setFormData({ ...formData, tarifaKwh: parseFloat(e.target.value) || 0.98 })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* 2. DIMENSÕES FÍSICAS & ÁREA ÚTIL DA MÁQUINA */}
          <div className="bg-slate-800/70 p-4 rounded-2xl border border-cyan-500/20 space-y-4">
            <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wide flex items-center gap-1.5">
              <Maximize2 size={14} /> 2. Dimensões Físicas & Área Útil da Máquina
            </h4>
            <p className="text-[11px] text-white/50 -mt-2">
              Informe as dimensões máximas suportadas para cálculo por metro quadrado e validação de peças na precificação.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">
                  Boca / Largura Máxima (metros) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  placeholder="Ex: 1.60 ou 3.20"
                  value={formData.larguraMaximaM}
                  onChange={(e) => setFormData({ ...formData, larguraMaximaM: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-white/40 mt-1 block">Ex: 1.60m, 1.80m, 3.20m, 0.60m...</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">
                  Altura / Mesa Máxima (metros)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 2.50 (ou deixe em branco p/ rolo)"
                  value={formData.alturaMaximaM}
                  onChange={(e) => setFormData({ ...formData, alturaMaximaM: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-white/40 mt-1 block">Deixe em branco para impressoras de rolo contínuo.</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">
                  Área Útil da Mesa (m²)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={
                    formData.larguraMaximaM && formData.alturaMaximaM
                      ? `Auto: ${(Number(formData.larguraMaximaM) * Number(formData.alturaMaximaM)).toFixed(2)} m²`
                      : 'Ex: 4.00'
                  }
                  value={formData.areaMesaM2}
                  onChange={(e) => setFormData({ ...formData, areaMesaM2: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-white/40 mt-1 block">Para Router CNC, Laser e mesas planas.</span>
              </div>
            </div>
          </div>

          {/* 3. CONFIGURAÇÃO DE VELOCIDADES & PERFIS DE IMPRESSÃO (RIP) */}
          <div className="bg-slate-800/70 p-4 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                <Clock size={14} /> 3. Configurações de Velocidade & Perfis de Impressão (RIP)
              </h4>
              <span className="text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md font-mono">
                Regra Oficial: Tempo = (Tempo 10 m²) × (Área ÷ 10)
              </span>
            </div>

            {/* Configuração dos 3 Perfis Oficiais (High Speed, Standard, High Quality) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white/80 uppercase flex items-center gap-1.5">
                  <Layers size={13} className="text-cyan-400" />
                  <span>Tempos de Referência Pré-definidos para 10 m² (Ajuste por Máquina)</span>
                </span>
                <span className="text-[10px] text-white/40">Base oficial: RIP a 400 mm/seg.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. High Speed */}
                <div className={`p-3.5 rounded-2xl border transition-all ${
                  formData.modoImpressao === 'highspeed'
                    ? 'bg-amber-950/30 border-amber-400 shadow-md ring-1 ring-amber-400/20'
                    : 'bg-slate-900/90 border-white/10 hover:border-white/20'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-400" />
                      <strong className="text-xs text-white uppercase font-bold">High Speed</strong>
                    </div>
                    {formData.modoImpressao === 'highspeed' ? (
                      <span className="text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                        Padrão Ativo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            modoImpressao: 'highspeed',
                            velocidadeProducaoM2H: Math.round((10 / ((Number(prev.tempo10m2HighSpeed) || 132) / 60)) * 100) / 100
                          }));
                        }}
                        className="text-[10px] text-white/50 hover:text-amber-300 font-bold underline"
                      >
                        Ativar Padrão
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-white/60 uppercase mb-1">
                        Tempo p/ 10 m² (minutos)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={formData.tempo10m2HighSpeed}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                          setFormData(prev => ({ ...prev, tempo10m2HighSpeed: val }));
                        }}
                        className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                      />
                      <span className="text-[9px] text-white/40 block mt-0.5">Padrão RIP: 132 min (02h12)</span>
                    </div>

                    <div className="p-2 bg-black/40 rounded-xl border border-white/5 text-[10px] space-y-1">
                      <div className="flex items-center justify-between text-white/70">
                        <span>Velocidade gerada:</span>
                        <strong className="text-emerald-400 font-mono">
                          ~{(10 / ((Number(formData.tempo10m2HighSpeed) || 132) / 60)).toFixed(2)} m²/h
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-white/50">
                        <span>Tempo médio:</span>
                        <span className="font-mono">~{((Number(formData.tempo10m2HighSpeed) || 132) / 10).toFixed(1)} min/m²</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Standard */}
                <div className={`p-3.5 rounded-2xl border transition-all ${
                  (!formData.modoImpressao || formData.modoImpressao === 'standard')
                    ? 'bg-cyan-950/30 border-cyan-400 shadow-md ring-1 ring-cyan-400/20'
                    : 'bg-slate-900/90 border-white/10 hover:border-white/20'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-cyan-400" />
                      <strong className="text-xs text-white uppercase font-bold">Standard</strong>
                    </div>
                    {(!formData.modoImpressao || formData.modoImpressao === 'standard') ? (
                      <span className="text-[9px] font-bold uppercase bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                        Padrão Ativo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            modoImpressao: 'standard',
                            velocidadeProducaoM2H: Math.round((10 / ((Number(prev.tempo10m2Standard) || 265) / 60)) * 100) / 100
                          }));
                        }}
                        className="text-[10px] text-white/50 hover:text-cyan-300 font-bold underline"
                      >
                        Ativar Padrão
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-white/60 uppercase mb-1">
                        Tempo p/ 10 m² (minutos)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={formData.tempo10m2Standard}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                          setFormData(prev => ({ ...prev, tempo10m2Standard: val }));
                        }}
                        className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-400"
                      />
                      <span className="text-[9px] text-white/40 block mt-0.5">Padrão RIP: 265 min (04h25)</span>
                    </div>

                    <div className="p-2 bg-black/40 rounded-xl border border-white/5 text-[10px] space-y-1">
                      <div className="flex items-center justify-between text-white/70">
                        <span>Velocidade gerada:</span>
                        <strong className="text-emerald-400 font-mono">
                          ~{(10 / ((Number(formData.tempo10m2Standard) || 265) / 60)).toFixed(2)} m²/h
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-white/50">
                        <span>Tempo médio:</span>
                        <span className="font-mono">~{((Number(formData.tempo10m2Standard) || 265) / 10).toFixed(1)} min/m²</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. High Quality */}
                <div className={`p-3.5 rounded-2xl border transition-all ${
                  formData.modoImpressao === 'qualidade'
                    ? 'bg-purple-950/30 border-purple-400 shadow-md ring-1 ring-purple-400/20'
                    : 'bg-slate-900/90 border-white/10 hover:border-white/20'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-purple-400" />
                      <strong className="text-xs text-white uppercase font-bold">High Quality</strong>
                    </div>
                    {formData.modoImpressao === 'qualidade' ? (
                      <span className="text-[9px] font-bold uppercase bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                        Padrão Ativo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            modoImpressao: 'qualidade',
                            velocidadeProducaoM2H: Math.round((10 / ((Number(prev.tempo10m2HighQuality) || 527) / 60)) * 100) / 100
                          }));
                        }}
                        className="text-[10px] text-white/50 hover:text-purple-300 font-bold underline"
                      >
                        Ativar Padrão
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-white/60 uppercase mb-1">
                        Tempo p/ 10 m² (minutos)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={formData.tempo10m2HighQuality}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                          setFormData(prev => ({ ...prev, tempo10m2HighQuality: val }));
                        }}
                        className="w-full bg-slate-950 border border-purple-500/40 rounded-xl px-3 py-1.5 text-xs text-purple-300 font-mono font-bold focus:outline-none focus:border-purple-400"
                      />
                      <span className="text-[9px] text-white/40 block mt-0.5">Padrão RIP: 527 min (08h47)</span>
                    </div>

                    <div className="p-2 bg-black/40 rounded-xl border border-white/5 text-[10px] space-y-1">
                      <div className="flex items-center justify-between text-white/70">
                        <span>Velocidade gerada:</span>
                        <strong className="text-emerald-400 font-mono">
                          ~{(10 / ((Number(formData.tempo10m2HighQuality) || 527) / 60)).toFixed(2)} m²/h
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-white/50">
                        <span>Tempo médio:</span>
                        <span className="font-mono">~{((Number(formData.tempo10m2HighQuality) || 527) / 10).toFixed(1)} min/m²</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Velocidade da Cabeça, Setup & Velocidade de Produção */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10">
              <div>
                <label className="block text-[11px] font-bold text-cyan-300 uppercase mb-1">
                  Velocidade Padrão da Cabeça (mm/s)
                </label>
                <input
                  type="number"
                  min="250"
                  max="761"
                  step="1"
                  value={formData.velocidadeCabecaMmS}
                  onChange={(e) => setFormData({ ...formData, velocidadeCabecaMmS: parseInt(e.target.value, 10) || 400 })}
                  className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl px-3.5 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[300, 350, 400, 500, 600, 700, 761].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFormData({ ...formData, velocidadeCabecaMmS: v })}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                        formData.velocidadeCabecaMmS === v
                          ? 'bg-cyan-500 text-black font-bold'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase mb-1">
                  Tempo de Setup / Preparação (min)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Ex: 10"
                  value={formData.tempoSetupMin}
                  onChange={(e) => setFormData({ ...formData, tempoSetupMin: e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-white/40 mt-1 block">Aquecimento, passagem de mídia e alinhamento.</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-white/70 uppercase">
                    Velocidade de Produção (m²/h) *
                  </label>
                  <button
                    type="button"
                    onClick={aplicarVelocidadeCalculada}
                    className="text-[10px] text-cyan-400 hover:underline font-bold flex items-center gap-1"
                    title="Recalcula a partir do perfil e velocidade de cabeça"
                  >
                    <Zap size={11} /> Recalcular
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  value={formData.velocidadeProducaoM2H}
                  onChange={(e) => setFormData({ ...formData, velocidadeProducaoM2H: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
                <span className="text-[10px] text-white/40 mt-1 block">Usada para calcular o custo hora e custo/m² da máquina.</span>
              </div>
            </div>

            {/* Painel Didático: Onde esses valores são aplicados no cálculo */}
            <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1.5 text-[11px]">
              <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Info size={13} className="text-cyan-400 shrink-0" />
                <span>Como esses valores chegam ao cálculo de tempo e custo:</span>
              </div>
              <ul className="text-white/60 space-y-1 pl-4 list-disc text-[10px]">
                <li>
                  <strong className="text-white">Tempo de Impressão:</strong> Calculado pela regra <code className="text-amber-300 bg-black/50 px-1 rounded">Tempo = (Tempo do Perfil para 10 m²) × (Área da Peça ÷ 10) + Setup</code>.
                </li>
                <li>
                  <strong className="text-white">Velocidade Efetiva:</strong> Calculada por <code className="text-cyan-300 bg-black/50 px-1 rounded">Velocidade m²/h = 10 ÷ (Tempo 10 m² ÷ 60)</code>.
                </li>
                <li>
                  <strong className="text-white">Custo Operacional por m²:</strong> Calculado por <code className="text-emerald-300 bg-black/50 px-1 rounded">Custo Hora da Máquina ÷ Velocidade m²/h</code>. No modo High Speed, a máquina imprime mais rápido e o custo/m² diminui proporcionalmente.
                </li>
              </ul>
            </div>

            {/* CALIBRAÇÃO REAL (opcional) */}
            <div className="mt-4 bg-slate-900/80 p-3.5 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center gap-2">
                <Gauge size={14} className="text-emerald-400" />
                <span className="text-[11px] font-bold text-white/70 uppercase">Calibração Real RIP (Avançado)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-white/60 uppercase mb-1">
                    Setup / Overhead (min)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Ex: 20.2"
                    value={formData.calibSetupMin}
                    onChange={(e) => setFormData({ ...formData, calibSetupMin: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/60 uppercase mb-1">
                    Constante k (Standard)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Ex: 98335"
                    value={formData.calibKMms}
                    onChange={(e) => setFormData({ ...formData, calibKMms: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/60 uppercase mb-1">
                    Velocidade High Speed (m²/h)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 4.55"
                    value={formData.velocidadeHispeedM2H}
                    onChange={(e) => setFormData({ ...formData, velocidadeHispeedM2H: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* TINTA E CABEÇA DE IMPRESSÃO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tinta */}
            <div className="bg-slate-800/70 p-4 rounded-2xl border border-white/10 space-y-3">
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                <Droplet size={14} /> 2. Tinta (Consumo & Custo)
              </h4>

              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase mb-1">
                  Quantidade do Frasco/Galão (ml)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Ex: 1000"
                  value={formData.tintaQuantidadeMl}
                  onChange={(e) => setFormData({ ...formData, tintaQuantidadeMl: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase mb-1">
                  Valor do Frasco/Galão (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 180"
                  value={formData.tintaValor}
                  onChange={(e) => setFormData({ ...formData, tintaValor: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase mb-1">
                  Consumo Médio de Tinta (ml/m²)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 15"
                  value={formData.tintaConsumoMlM2}
                  onChange={(e) => setFormData({ ...formData, tintaConsumoMlM2: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {formData.tintaQuantidadeMl > 0 && formData.tintaValor > 0 && (
                <div className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                  Custo por ml: <strong>R$ {(formData.tintaValor / formData.tintaQuantidadeMl).toFixed(4)}/ml</strong>
                </div>
              )}
            </div>

            {/* Cabeça de Impressão */}
            <div className="bg-slate-800/70 p-4 rounded-2xl border border-white/10 space-y-3">
              <h4 className="text-xs font-black text-purple-400 uppercase tracking-wide flex items-center gap-1.5">
                <Cpu size={14} /> 3. Cabeça de Impressão / Desgaste
              </h4>

              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase mb-1">
                  Valor da Cabeça de Impressão (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 8500"
                  value={formData.cabecaValor}
                  onChange={(e) => setFormData({ ...formData, cabecaValor: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase mb-1">
                  Vida Útil da Cabeça (Horas de Produção)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Ex: 2500"
                  value={formData.cabecaVidaUtilHoras}
                  onChange={(e) => setFormData({ ...formData, cabecaVidaUtilHoras: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/60 uppercase mb-1">
                  Observações / Notas Internas
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Utilizar preferencialmente no perfil 720x720 4 passadas..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* PAINEL DE CUSTOS CALCULADOS AUTOMATICAMENTE (LIVE PREVIEW) */}
          <div className="bg-gradient-to-br from-cyan-950/60 via-slate-900 to-slate-950 p-4 sm:p-5 rounded-3xl border border-cyan-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-black text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                <Gauge size={16} className="text-cyan-400" /> Custos Calculados Automaticamente pelo Sistema
              </h4>
              <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                Sem digitação manual
              </span>
            </div>

            {/* 2 Totais Destacados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-cyan-500/40 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-white/60 uppercase">Custo Total da Máquina / Hora</span>
                  <span className="text-xs text-white/40">Depreciação + Manut. + Cabeça + Energia</span>
                </div>
                <strong className="text-xl font-black text-cyan-300">
                  R$ {formCalculos.custoTotalMaquinaHora.toFixed(2)}/h
                </strong>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-white/60 uppercase">Custo Total da Máquina / m²</span>
                  <span className="text-xs text-white/40">Operacional/m² + Custo da Tinta/m²</span>
                </div>
                <strong className="text-xl font-black text-emerald-400">
                  R$ {formCalculos.custoTotalMaquinaM2.toFixed(2)}/m²
                </strong>
              </div>
            </div>

            {/* Granular Table of Sub-Costs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-white/5">
                <span className="block text-[10px] text-white/50 font-bold uppercase">1. Depreciação / h</span>
                <strong className="text-sm font-black text-white">R$ {formCalculos.depreciacaoHora.toFixed(2)}</strong>
                <span className="block text-[9px] text-white/40 mt-0.5">Valor / (Anos x 12 x Horas/mês)</span>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-white/5">
                <span className="block text-[10px] text-white/50 font-bold uppercase">2. Manutenção / h</span>
                <strong className="text-sm font-black text-white">R$ {formCalculos.manutencaoHora.toFixed(2)}</strong>
                <span className="block text-[9px] text-white/40 mt-0.5">Manutenção Anual / (12 x Horas)</span>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-white/5">
                <span className="block text-[10px] text-white/50 font-bold uppercase">3. Cabeça de Impressão / h</span>
                <strong className="text-sm font-black text-white">R$ {formCalculos.cabecaHora.toFixed(2)}</strong>
                <span className="block text-[9px] text-white/40 mt-0.5">Valor Cabeça / Vida Útil (h)</span>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-white/5">
                <span className="block text-[10px] text-white/50 font-bold uppercase">4. Energia Elétrica / h</span>
                <strong className="text-sm font-black text-white">R$ {formCalculos.energiaHora.toFixed(2)}</strong>
                <span className="block text-[9px] text-white/40 mt-0.5">{formData.potenciaKw} kW x R$ {formData.tarifaKwh}/kWh</span>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-white/5">
                <span className="block text-[10px] text-white/50 font-bold uppercase">5. Custo da Tinta / m²</span>
                <strong className="text-sm font-black text-amber-300">R$ {formCalculos.custoTintaM2.toFixed(2)}</strong>
                <span className="block text-[9px] text-white/40 mt-0.5">Consumo ml/m² x Preço/ml</span>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-white/5">
                <span className="block text-[10px] text-white/50 font-bold uppercase">6. Tempo p/ Produzir 1 m²</span>
                <strong className="text-sm font-black text-purple-300">{formCalculos.tempoProduzir1M2Minutos.toFixed(1)} min</strong>
                <span className="block text-[9px] text-white/40 mt-0.5">({formCalculos.tempoProduzir1M2Horas.toFixed(3)} horas por m²)</span>
              </div>
            </div>
          </div>

          {/* Modal Action Buttons: Salvar / Cancelar */}
          <div className="flex justify-end items-center gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-2"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Salvar Máquina</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
