import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers, Plus, Search, Edit2, Trash2, CheckCircle2, XCircle,
  Download, RefreshCw, AlertCircle, FileText, Check, X, Tag, DollarSign,
  ShieldCheck, ArrowUpDown, Filter, Calculator, Sparkles, Box, Ruler, CheckCircle, Copy,
  History, Clock, TrendingDown, PackageCheck, AlertTriangle, Calendar, Sliders
} from 'lucide-react';
import { Company, AppUser, MateriaPrima } from '../types';
import { showAlert, showConfirm } from '../lib/notify';
import { Badge, Button, Modal } from './SharedUI';
import {
  fetchMateriasPrimas,
  saveMateriaPrima,
  deleteMateriaPrima,
  toggleMateriaPrimaStatus,
  subscribeToMateriasPrimas,
  recalcAllProductCosts,
  fetchConsumptionHistory,
  calculateMateriaPrimaForecast,
  quickAdjustStock,
  MateriaPrimaConsumptionRecord,
  MateriaPrimaForecast
} from '../lib/materiasPrimasStorage';
import { MateriaPrimaHistoryModal } from './MateriaPrimaHistoryModal';
import { QuickAdjustStockModal } from './QuickAdjustStockModal';
import * as XLSX from 'xlsx';

interface MateriasPrimasModuleProps {
  currentCompany?: Company | null;
  user?: AppUser | null;
}

const COMMON_UNITS = [
  { value: 'm', label: 'Metro Linear (m)' },
  { value: 'etiqueta', label: 'Etiqueta Adesiva' },
  { value: 'un', label: 'Unidade (un)' },
];

export interface MateriaPrimaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: MateriaPrima | null;
  onSaved: (saved: MateriaPrima) => void;
  companyId?: string;
}

export const MateriaPrimaFormModal: React.FC<MateriaPrimaFormModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  onSaved,
  companyId
}) => {
  const [calcMode, setCalcMode] = useState<'bobina' | 'metro' | 'unidade'>('bobina');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('m');
  const [valorBobina, setValorBobina] = useState<number | ''>(750);
  const [comprimentoBobina, setComprimentoBobina] = useState<number | ''>(50);
  const [larguraMaterial, setLarguraMaterial] = useState<number | ''>(1.52);
  const [bobinaStockInputMode, setBobinaStockInputMode] = useState<'bobinas' | 'metros'>('bobinas');
  const [quantidadeEstoque, setQuantidadeEstoque] = useState<number | ''>(1);
  const [costPriceDirect, setCostPriceDirect] = useState<number | ''>('');
  const [metrosComprados, setMetrosComprados] = useState<number | ''>(10);
  const [valorTotalMetros, setValorTotalMetros] = useState<number | ''>(150);
  const [qtdPacoteUnidades, setQtdPacoteUnidades] = useState<number | ''>(100);
  const [valorPacoteUnidades, setValorPacoteUnidades] = useState<number | ''>(50);
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      setName(editingItem.name || '');
      setUnit(editingItem.unit || 'm');
      const modo = editingItem.tipoCalculoCusto || (editingItem.unit === 'm' ? (editingItem.comprimentoBobina ? 'bobina' : 'metro') : 'unidade');
      setCalcMode(modo);
      setBobinaStockInputMode('bobinas');
      setLarguraMaterial(editingItem.larguraMaterial !== undefined ? editingItem.larguraMaterial : 1.52);
      setComprimentoBobina(editingItem.comprimentoBobina !== undefined ? editingItem.comprimentoBobina : 50);
      setQuantidadeEstoque(editingItem.quantidadeEstoque !== undefined ? editingItem.quantidadeEstoque : 1);
      setNotes(editingItem.notes || '');
      setIsActive(editingItem.isActive !== undefined ? editingItem.isActive : true);

      if (editingItem.valorBobina) {
        setValorBobina(editingItem.valorBobina);
      } else if (editingItem.costPrice && editingItem.comprimentoBobina) {
        setValorBobina(Number((editingItem.costPrice * editingItem.comprimentoBobina).toFixed(2)));
      } else {
        setValorBobina(editingItem.costPrice ? Number((editingItem.costPrice * 50).toFixed(2)) : 750);
      }

      setCostPriceDirect(editingItem.costPrice || '');
      setMetrosComprados(editingItem.comprimentoBobina || 10);
      setValorTotalMetros(editingItem.costPrice ? Number((editingItem.costPrice * (editingItem.comprimentoBobina || 10)).toFixed(2)) : 150);
      setQtdPacoteUnidades(100);
      setValorPacoteUnidades(editingItem.costPrice ? Number((editingItem.costPrice * 100).toFixed(2)) : 50);
    } else {
      setName('');
      setUnit('m');
      setCalcMode('bobina');
      setBobinaStockInputMode('bobinas');
      setValorBobina(750);
      setComprimentoBobina(50);
      setLarguraMaterial(1.52);
      setQuantidadeEstoque(1);
      setCostPriceDirect('');
      setMetrosComprados(10);
      setValorTotalMetros(150);
      setQtdPacoteUnidades(100);
      setValorPacoteUnidades(50);
      setNotes('');
      setIsActive(true);
    }
  }, [isOpen, editingItem]);

  // Cálculos automáticos
  const calculations = useMemo(() => {
    const larg = typeof larguraMaterial === 'number' && larguraMaterial > 0 ? larguraMaterial : 1;
    let costPerUnit = 0;
    let costPerM2 = 0;
    let areaTotalBobina = 0;
    let valorTotalEstoque = 0;
    let totalMetrosEstoque = 0;
    let totalBobinasEstoque = 0;

    if (calcMode === 'bobina') {
      const valBobina = typeof valorBobina === 'number' ? valorBobina : 0;
      const compBobina = typeof comprimentoBobina === 'number' && comprimentoBobina > 0 ? comprimentoBobina : 50;
      const rawEstoque = typeof quantidadeEstoque === 'number' ? quantidadeEstoque : 0;

      costPerUnit = compBobina > 0 ? valBobina / compBobina : 0; // Custo por metro linear
      areaTotalBobina = larg * compBobina; // m² por bobina
      costPerM2 = areaTotalBobina > 0 ? valBobina / areaTotalBobina : 0;

      if (bobinaStockInputMode === 'metros') {
        totalMetrosEstoque = rawEstoque;
        totalBobinasEstoque = compBobina > 0 ? rawEstoque / compBobina : 0;
        valorTotalEstoque = costPerUnit * rawEstoque;
      } else {
        totalBobinasEstoque = rawEstoque;
        totalMetrosEstoque = compBobina * rawEstoque;
        valorTotalEstoque = valBobina * rawEstoque;
      }
    } else if (calcMode === 'metro') {
      const metros = typeof metrosComprados === 'number' && metrosComprados > 0 ? metrosComprados : 1;
      const valMetros = typeof valorTotalMetros === 'number' ? valorTotalMetros : 0;
      const qtdMetrosEstoque = typeof quantidadeEstoque === 'number' ? quantidadeEstoque : metros;

      costPerUnit = valMetros > 0 ? valMetros / metros : (typeof costPriceDirect === 'number' ? costPriceDirect : 0);
      costPerM2 = larg > 0 ? costPerUnit / larg : costPerUnit;
      valorTotalEstoque = costPerUnit * qtdMetrosEstoque;
      totalMetrosEstoque = qtdMetrosEstoque;
    } else {
      // Unidade
      const qtdPacote = typeof qtdPacoteUnidades === 'number' && qtdPacoteUnidades > 0 ? qtdPacoteUnidades : 1;
      const valPacote = typeof valorPacoteUnidades === 'number' ? valorPacoteUnidades : 0;
      const qtdEstoqueUn = typeof quantidadeEstoque === 'number' ? quantidadeEstoque : 1;

      costPerUnit = valPacote > 0 ? valPacote / qtdPacote : (typeof costPriceDirect === 'number' ? costPriceDirect : 0);
      costPerM2 = costPerUnit;
      valorTotalEstoque = costPerUnit * qtdEstoqueUn;
      totalMetrosEstoque = qtdEstoqueUn;
    }

    return {
      costPerUnit: Number(costPerUnit.toFixed(4)),
      costPerM2: Number(costPerM2.toFixed(4)),
      areaTotalBobina: Number(areaTotalBobina.toFixed(2)),
      valorTotalEstoque: Number(valorTotalEstoque.toFixed(2)),
      totalMetrosEstoque: Number(totalMetrosEstoque.toFixed(2)),
      totalBobinasEstoque: Number(totalBobinasEstoque.toFixed(2))
    };
  }, [calcMode, valorBobina, comprimentoBobina, larguraMaterial, quantidadeEstoque, bobinaStockInputMode, costPriceDirect, metrosComprados, valorTotalMetros, qtdPacoteUnidades, valorPacoteUnidades]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showAlert('Informe o nome da matéria-prima.');
      return;
    }

    const finalUnit = calcMode === 'unidade' ? (unit === 'm' ? 'un' : unit) : 'm';
    const finalCostPrice = calculations.costPerUnit;
    const finalValorBobina = calcMode === 'bobina' ? Number(valorBobina) || (finalCostPrice * (Number(comprimentoBobina) || 50)) : undefined;

    try {
      setSaving(true);
      const saved = await saveMateriaPrima({
        id: editingItem ? editingItem.id : undefined,
        name: name.trim(),
        unit: finalUnit,
        costPrice: finalCostPrice,
        valorBobina: finalValorBobina,
        tipoCalculoCusto: calcMode,
        larguraMaterial: (finalUnit === 'm' || (typeof larguraMaterial === 'number' && larguraMaterial > 0)) ? Number(larguraMaterial) : undefined,
        comprimentoBobina: calcMode === 'bobina' ? Number(comprimentoBobina) : undefined,
        quantidadeEstoque: Number(quantidadeEstoque) || 0,
        custoPorM2: calculations.costPerM2,
        notes: notes.trim(),
        isActive: isActive,
      }, companyId);

      onSaved(saved);
      onClose();

      // Se o custo desta matéria-prima mudou (edição), propaga automaticamente
      // o novo custo para todos os produtos do Estoque que a utilizam — evita
      // que produtos fiquem com "Custo Interno" desatualizado (preço congelado).
      if (editingItem) {
        showAlert(`Matéria-prima "${saved.name}" salva com custo de R$ ${saved.costPrice.toFixed(2)}/${saved.unit}! Recalculando custos dos produtos vinculados...`);
        try {
          const affected = await recalcAllProductCosts(companyId);
          if (affected.length > 0) {
            const belowCost = affected.filter(p => p.salePrice > 0 && p.salePrice < p.newCost);
            let msg = `Custo interno atualizado em ${affected.length} produto${affected.length > 1 ? 's' : ''} vinculado${affected.length > 1 ? 's' : ''} a "${saved.name}":\n\n` +
              affected.map(p => `• ${p.name}: R$ ${p.oldCost.toFixed(2)} → R$ ${p.newCost.toFixed(2)}`).join('\n');
            if (belowCost.length > 0) {
              msg += `\n\n⚠️ Atenção: ${belowCost.length} produto${belowCost.length > 1 ? 's estão' : ' está'} sendo vendido${belowCost.length > 1 ? 's' : ''} abaixo do novo custo — revise o preço de venda:\n` +
                belowCost.map(p => `• ${p.name}: venda R$ ${p.salePrice.toFixed(2)} < custo R$ ${p.newCost.toFixed(2)}`).join('\n');
            }
            showAlert(msg);
          }
        } catch (syncErr) {
          console.warn('Erro ao recalcular custos automaticamente:', syncErr);
        }
      } else {
        showAlert(`Matéria-prima "${saved.name}" salva com custo de R$ ${saved.costPrice.toFixed(2)}/${saved.unit}!`);
      }
    } catch (err: any) {
      console.error('Erro ao salvar matéria-prima:', err);
      showAlert(`Erro ao salvar: ${err.message || 'Falha na operação'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Editar Matéria-Prima & Custo' : 'Cadastrar Matéria-Prima & Calcular Custo'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Seletor de Modo de Entrada / Cálculo */}
        <div className="bg-slate-950/80 p-3 rounded-2xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-primary-400 flex items-center gap-1.5">
              <Calculator size={14} />
              <span>Como você comprou / quer lançar este insumo?</span>
            </span>
            <span className="text-[10px] text-white/50">Cálculo de custo em tempo real</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => { setCalcMode('bobina'); setUnit('m'); }}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                calcMode === 'bobina'
                  ? 'bg-primary-500/20 border-primary-500 text-white shadow-lg shadow-primary-500/10'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black">Por Bobina / Rolo</span>
                <Ruler size={14} className={calcMode === 'bobina' ? 'text-primary-400' : 'text-white/40'} />
              </div>
              <span className="text-[10px] text-white/50 leading-tight">
                Informa o valor da bobina (ex: 50m) e calcula o metro e m²
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setCalcMode('metro'); setUnit('m'); }}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                calcMode === 'metro'
                  ? 'bg-primary-500/20 border-primary-500 text-white shadow-lg shadow-primary-500/10'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black">Por Metros</span>
                <Sparkles size={14} className={calcMode === 'metro' ? 'text-primary-400' : 'text-white/40'} />
              </div>
              <span className="text-[10px] text-white/50 leading-tight">
                Informa metros comprados e o valor total pago
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setCalcMode('unidade'); setUnit('un'); }}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                calcMode === 'unidade'
                  ? 'bg-primary-500/20 border-primary-500 text-white shadow-lg shadow-primary-500/10'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black">Por Unidade / Caixa</span>
                <Box size={14} className={calcMode === 'unidade' ? 'text-primary-400' : 'text-white/40'} />
              </div>
              <span className="text-[10px] text-white/50 leading-tight">
                Chapas, ilhoses, fitas, tintas e pacotes
              </span>
            </button>
          </div>
        </div>

        {/* Nome do Material */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-white/70 flex items-center justify-between">
            <span>Nome da Matéria-Prima *</span>
            <span className="text-[10px] text-primary-400 font-normal">Ex: Adesivo Vinil Branco Brilho, Lona 440g, Chapa ACM</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Adesivo Vinil Branco Brilho 1.52m"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary-500/50 transition-colors font-medium"
          />
        </div>

        {/* Formulário Específico por Modo de Entrada */}
        {calcMode === 'bobina' && (
          <div className="p-4 bg-gradient-to-br from-primary-950/20 to-slate-900/60 border border-primary-500/20 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-primary-300 flex items-center gap-1.5">
                <Ruler size={15} />
                <span>Dados da Bobina & Valor Pago</span>
              </span>
              <span className="text-[10px] font-mono text-primary-400/80 bg-primary-500/10 px-2 py-0.5 rounded-full border border-primary-500/20">
                Adesivos • Lonas • Películas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Valor Total da Bobina */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                  <span>Valor da Bobina (R$) *</span>
                  <span className="text-[9px] text-white/40">Pago na nota</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-emerald-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={valorBobina}
                    onChange={e => setValorBobina(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="750,00"
                    className="w-full bg-black/50 border border-emerald-500/30 rounded-xl pl-9 pr-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Comprimento da Bobina em Metros */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/70 flex items-center justify-between">
                  <span>Comprimento (Metros) *</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    value={comprimentoBobina}
                    onChange={e => setComprimentoBobina(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="50"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-primary-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 font-mono">m</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {[10, 25, 50, 100].map(comp => (
                    <button
                      key={comp}
                      type="button"
                      onClick={() => setComprimentoBobina(comp)}
                      className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                        comprimentoBobina === comp ? 'bg-primary-500 text-slate-950 font-bold border-primary-500' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      {comp}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Largura da Bobina em Metros */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/70 flex items-center justify-between">
                  <span>Largura (m) *</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    value={larguraMaterial}
                    onChange={e => setLarguraMaterial(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="1.52"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-primary-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 font-mono">m</span>
                </div>
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {[1.06, 1.22, 1.52, 1.60, 2.00, 3.20].map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setLarguraMaterial(w)}
                      className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                        larguraMaterial === w ? 'bg-primary-500 text-slate-950 font-bold border-primary-500' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      {w}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quantidade em Estoque (Opção de Bobinas ou Metros Lineares) */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/80">
                  Como deseja informar a Quantidade em Estoque?
                </label>
                <div className="flex items-center bg-black/60 p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      if (bobinaStockInputMode === 'metros' && typeof quantidadeEstoque === 'number' && Number(comprimentoBobina) > 0) {
                        setQuantidadeEstoque(Number((quantidadeEstoque / Number(comprimentoBobina)).toFixed(2)));
                      }
                      setBobinaStockInputMode('bobinas');
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      bobinaStockInputMode === 'bobinas'
                        ? 'bg-primary-500 text-slate-950 shadow'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Em Bobinas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (bobinaStockInputMode === 'bobinas' && typeof quantidadeEstoque === 'number' && Number(comprimentoBobina) > 0) {
                        setQuantidadeEstoque(Number((quantidadeEstoque * Number(comprimentoBobina)).toFixed(2)));
                      }
                      setBobinaStockInputMode('metros');
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      bobinaStockInputMode === 'metros'
                        ? 'bg-primary-500 text-slate-950 shadow'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Em Metros Lineares
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/70 flex items-center justify-between">
                    <span>
                      {bobinaStockInputMode === 'bobinas'
                        ? 'Quantidade de Bobinas em Estoque'
                        : 'Quantidade de Metros Lineares em Estoque'}
                    </span>
                    <span className="text-primary-400 font-mono text-[10px] lowercase">
                      ({bobinaStockInputMode === 'bobinas' ? 'bobinas inteiras/fracionadas' : 'metros corridos'})
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={quantidadeEstoque}
                      onChange={e => setQuantidadeEstoque(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder={bobinaStockInputMode === 'bobinas' ? 'Ex: 1 bobina' : `Ex: ${comprimentoBobina || 50} metros`}
                      className="w-full bg-black/50 border border-primary-500/30 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-primary-400"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary-400/70 font-mono font-bold">
                      {bobinaStockInputMode === 'bobinas' ? 'bobina(s)' : 'metros'}
                    </span>
                  </div>
                </div>

                <div className="bg-black/30 border border-white/5 rounded-xl p-2.5">
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Total em Metros: <strong className="text-emerald-400 font-mono font-bold">{calculations.totalMetrosEstoque} m</strong>
                    {bobinaStockInputMode === 'metros' && (
                      <span className="text-white/40 font-mono text-[10px] ml-1">
                        (~{calculations.totalBobinasEstoque} bobina{calculations.totalBobinasEstoque !== 1 ? 's' : ''})
                      </span>
                    )}
                    <br />
                    Valor Total do Estoque: <strong className="text-amber-300 font-mono font-bold">R$ {calculations.valorTotalEstoque.toFixed(2)}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {calcMode === 'metro' && (
          <div className="p-4 bg-gradient-to-br from-primary-950/20 to-slate-900/60 border border-primary-500/20 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-primary-300 flex items-center gap-1.5">
                <Sparkles size={15} />
                <span>Entrada por Metros Lineares Comprados</span>
              </span>
              <span className="text-[10px] font-mono text-primary-400/80 bg-primary-500/10 px-2 py-0.5 rounded-full border border-primary-500/20">
                Fracionado ou Varejo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Valor Total Pago nos Metros */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                  <span>Valor Total Pago (R$) *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-emerald-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={valorTotalMetros}
                    onChange={e => setValorTotalMetros(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="150,00"
                    className="w-full bg-black/50 border border-emerald-500/30 rounded-xl pl-9 pr-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Quantidade de Metros */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/70">
                  Quantidade de Metros Comprados *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    value={metrosComprados}
                    onChange={e => setMetrosComprados(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="10"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-primary-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 font-mono">m</span>
                </div>
              </div>

              {/* Largura do Material */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/70">
                  Largura do Material (m) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    value={larguraMaterial}
                    onChange={e => setLarguraMaterial(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="1.52"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-primary-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 font-mono">m</span>
                </div>
              </div>
            </div>

            <div className="space-y-1 pt-1 border-t border-white/5">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/70">
                Quantidade Total em Estoque (Metros)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={quantidadeEstoque}
                onChange={e => setQuantidadeEstoque(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="Ex: 10 metros"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-primary-400"
              />
            </div>
          </div>
        )}

        {calcMode === 'unidade' && (
          <div className="p-4 bg-gradient-to-br from-primary-950/20 to-slate-900/60 border border-primary-500/20 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-primary-300 flex items-center gap-1.5">
                <Box size={15} />
                <span>Entrada por Pacote / Caixa / Unidade</span>
              </span>
              <span className="text-[10px] font-mono text-primary-400/80 bg-primary-500/10 px-2 py-0.5 rounded-full border border-primary-500/20">
                Ilhós • Bastão • Chapa • Tinta
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Valor Total do Pacote */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Valor Total Pago no Pacote/Caixa (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-emerald-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={valorPacoteUnidades}
                    onChange={e => setValorPacoteUnidades(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="50,00"
                    className="w-full bg-black/50 border border-emerald-500/30 rounded-xl pl-9 pr-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Quantidade no Pacote */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/70">
                  Qtd. de Peças/Unidades no Pacote *
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={qtdPacoteUnidades}
                  onChange={e => setQtdPacoteUnidades(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="100"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-primary-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/70">
                  Unidade de Medida
                </label>
                <select
                  value={unit || 'un'}
                  onChange={e => setUnit(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary-500"
                >
                  <option value="un">Unidade (un)</option>
                  <option value="etiqueta">Etiqueta</option>
                  <option value="l">Litro (l)</option>
                  <option value="kg">Quilo (kg)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/70">
                  Qtd. Total de Peças em Estoque
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={quantidadeEstoque}
                  onChange={e => setQuantidadeEstoque(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="Ex: 500"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-primary-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Card de Resumo e Resultado dos Cálculos em Tempo Real */}
        <div className="p-4 bg-emerald-950/30 border-2 border-emerald-500/40 rounded-2xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles size={16} />
              <span>Custo Calculado Automaticamente</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 bg-emerald-500/20 px-2 py-0.5 rounded-md">
              Pronto para os produtos
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
              <span className="text-[9px] uppercase font-black text-white/40 block">Custo por {calcMode === 'unidade' ? unit : 'Metro Linear'}</span>
              <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                R$ {calculations.costPerUnit.toFixed(2)}
              </span>
              <span className="text-[9px] text-white/40 block">/{calcMode === 'unidade' ? unit : 'metro'}</span>
            </div>

            {calcMode !== 'unidade' && (
              <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-black text-white/40 block">Custo por m²</span>
                <span className="text-base sm:text-lg font-black font-mono text-sky-400">
                  R$ {calculations.costPerM2.toFixed(2)}
                </span>
                <span className="text-[9px] text-white/40 block">/m² de área</span>
              </div>
            )}

            {calcMode === 'bobina' && (
              <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-black text-white/40 block">Área da Bobina</span>
                <span className="text-base sm:text-lg font-black font-mono text-primary-300">
                  {calculations.areaTotalBobina} m²
                </span>
                <span className="text-[9px] text-white/40 block">{larguraMaterial}m × {comprimentoBobina}m</span>
              </div>
            )}

            <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
              <span className="text-[9px] uppercase font-black text-white/40 block">Estoque Total</span>
              <span className="text-base sm:text-lg font-black font-mono text-amber-400">
                R$ {calculations.valorTotalEstoque.toFixed(2)}
              </span>
              <span className="text-[9px] text-white/60 block font-mono">
                {calcMode === 'bobina' 
                  ? (bobinaStockInputMode === 'metros'
                      ? `${calculations.totalMetrosEstoque} m (${calculations.totalBobinasEstoque} bob.)`
                      : `${calculations.totalBobinasEstoque} bob. (${calculations.totalMetrosEstoque} m)`)
                  : (calcMode === 'metro' ? `${calculations.totalMetrosEstoque} m` : `${quantidadeEstoque} ${unit}`)}
              </span>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-white/70">
            Observações Técnicas / Fornecedor (Opcional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Fornecedor, código de referência, acabamentos recomendados, etc."
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary-500/50 transition-colors resize-none"
          />
        </div>

        {/* Status Ativo */}
        <div>
          <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/[0.08] transition-colors">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded accent-primary-500 cursor-pointer"
            />
            <div>
              <p className="text-xs font-bold text-white">Matéria-Prima Ativa para Uso</p>
              <p className="text-[10px] text-white/50">
                Fica disponível para compor os produtos e calcular o custo de produção no Estoque e PDV.
              </p>
            </div>
          </label>
        </div>

        {/* Botões do Rodapé */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-primary-500 text-slate-950 font-black hover:bg-primary-400 shadow-lg shadow-primary-500/20"
          >
            {saving ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Cadastrar Matéria-Prima'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export const MateriasPrimasModule: React.FC<MateriasPrimasModuleProps> = ({ currentCompany, user }) => {
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [historyList, setHistoryList] = useState<MateriaPrimaConsumptionRecord[]>([]);

  // Modal State (Cadastro / Edição)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MateriaPrima | null>(null);

  // Modal de Histórico de Consumo
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTargetMp, setHistoryTargetMp] = useState<MateriaPrima | null>(null);

  // Modal de Ajuste Rápido de Estoque
  const [isQuickAdjustModalOpen, setIsQuickAdjustModalOpen] = useState(false);
  const [adjustTargetMp, setAdjustTargetMp] = useState<MateriaPrima | null>(null);

  useEffect(() => {
    loadData();

    // Sincroniza em tempo real caso outro usuário/computador crie, altere ou exclua matérias-primas
    const unsubscribe = subscribeToMateriasPrimas(() => {
      loadData();
    });

    const onMateriasPrimasUpdated = () => {
      loadData();
    };
    const onHistoryUpdated = () => {
      loadData();
    };

    window.addEventListener('materias_primas_updated', onMateriasPrimasUpdated);
    window.addEventListener('materias_primas_history_updated', onHistoryUpdated);

    return () => {
      unsubscribe();
      window.removeEventListener('materias_primas_updated', onMateriasPrimasUpdated);
      window.removeEventListener('materias_primas_history_updated', onHistoryUpdated);
    };
  }, [currentCompany?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [data, hist] = await Promise.all([
        fetchMateriasPrimas(currentCompany?.id),
        fetchConsumptionHistory(undefined, currentCompany?.id)
      ]);
      setMateriasPrimas(data);
      setHistoryList(hist);
    } catch (err) {
      console.error('Erro ao carregar matérias-primas e histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MateriaPrima) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDuplicate = (item: MateriaPrima) => {
    const duplicated: MateriaPrima = {
      ...item,
      id: '',
      name: `${item.name} (Cópia)`
    };
    setEditingItem(duplicated);
    setIsModalOpen(true);
  };

  const handleSavedItem = (saved: MateriaPrima) => {
    if (editingItem) {
      setMateriasPrimas(prev => {
        const hasSavedId = prev.some(m => m.id === saved.id);
        if (hasSavedId) {
          return prev.map(m => m.id === saved.id ? saved : m);
        } else {
          return prev.map(m => (m.id === editingItem.id ? saved : m));
        }
      });
    } else {
      setMateriasPrimas(prev => [saved, ...prev.filter(m => m.id !== saved.id)]);
    }
  };

  const handleDelete = async (item: MateriaPrima) => {
    const confirmed = await showConfirm(`Tem certeza que deseja excluir a matéria-prima "${item.name}"?`);
    if (!confirmed) return;

    try {
      await deleteMateriaPrima(item.id);
      setMateriasPrimas(prev => prev.filter(m => m.id !== item.id));
      showAlert('Matéria-prima excluída com sucesso.');
    } catch (err) {
      console.error('Erro ao excluir matéria-prima:', err);
      showAlert('Erro ao excluir matéria-prima.');
    }
  };

  const handleToggleStatus = async (item: MateriaPrima) => {
    try {
      const newStatus = await toggleMateriaPrimaStatus(item.id, item.isActive);
      setMateriasPrimas(prev => prev.map(m => m.id === item.id ? { ...m, isActive: newStatus } : m));
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const handleExportExcel = () => {
    if (materiasPrimas.length === 0) {
      showAlert('Nenhuma matéria-prima para exportar.');
      return;
    }

    const dataToExport = materiasPrimas.map(item => ({
      'Nome da Matéria-Prima': item.name,
      'Unidade': item.unit,
      'Tipo de Lançamento': item.tipoCalculoCusto || 'bobina',
      'Valor da Bobina (R$)': item.valorBobina ? item.valorBobina.toFixed(2) : '',
      'Largura (m)': item.larguraMaterial || '',
      'Comprimento Bobina (m)': item.comprimentoBobina || '',
      'Custo por Metro/Unidade (R$)': item.costPrice.toFixed(4),
      'Custo por m² (R$)': item.custoPorM2 ? item.custoPorM2.toFixed(4) : '',
      'Qtd. Estoque': item.quantidadeEstoque || 0,
      'Status': item.isActive ? 'Ativa' : 'Inativa',
      'Observação': item.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Materias_Primas');
    XLSX.writeFile(wb, `Materias_Primas_${currentCompany?.shortName || 'RafaArts'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Filtered list
  const filteredList = useMemo(() => {
    return materiasPrimas.filter(item => {
      const term = search.toLowerCase().trim();
      const matchesSearch = !term || (
        item.name.toLowerCase().includes(term) ||
        item.unit.toLowerCase().includes(term) ||
        (item.notes && item.notes.toLowerCase().includes(term))
      );

      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.isActive) ||
        (statusFilter === 'inactive' && !item.isActive);

      const matchesUnit = unitFilter === 'all' || item.unit === unitFilter;

      return matchesSearch && matchesStatus && matchesUnit;
    });
  }, [materiasPrimas, search, statusFilter, unitFilter]);

  const stats = useMemo(() => {
    const total = materiasPrimas.length;
    const active = materiasPrimas.filter(m => m.isActive).length;
    const inactive = total - active;
    
    let totalMetrosEstoque = 0;
    let itensCriticosCount = 0;

    const totalEstoqueValor = materiasPrimas.reduce((acc, m) => {
      const compBobina = m.comprimentoBobina && m.comprimentoBobina > 0 ? m.comprimentoBobina : 50;
      const isBobina = m.tipoCalculoCusto === 'bobina' || (m.unit === 'm' && m.comprimentoBobina);
      const metros = isBobina ? (m.quantidadeEstoque ?? 0) * compBobina : (m.quantidadeEstoque ?? 0);
      totalMetrosEstoque += metros;

      const forecast = calculateMateriaPrimaForecast(m, historyList);
      if (forecast.statusPrevisao === 'critico' || forecast.statusPrevisao === 'esgotado' || metros <= 10) {
        itensCriticosCount++;
      }

      if (m.valorBobina && m.quantidadeEstoque) {
        return acc + (m.valorBobina * m.quantidadeEstoque);
      }
      return acc + (m.costPrice * (m.quantidadeEstoque || 0));
    }, 0);

    return { total, active, inactive, totalEstoqueValor, totalMetrosEstoque, itensCriticosCount };
  }, [materiasPrimas, historyList]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
              <Layers size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white italic tracking-tight uppercase">
                Matérias-Primas & Estoque
              </h2>
              <p className="text-xs text-white/50">
                Acompanhe o saldo em metros, previsão de término de bobinas e consumo por fora sem precisar abrir o modal de edição.
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
            onClick={() => {
              setHistoryTargetMp(null);
              setIsHistoryModalOpen(true);
            }}
            className="text-xs py-2 px-3 sm:px-4 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 flex items-center gap-1.5"
          >
            <History size={14} className="text-primary-400" />
            <span>Histórico de Consumo</span>
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
            onClick={handleOpenAdd}
            className="text-xs py-2.5 px-4 bg-primary-500 hover:bg-primary-400 text-slate-950 font-black shadow-lg shadow-primary-500/20"
          >
            <Plus size={16} />
            <span>Cadastrar Matéria-Prima</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-white/50">Insumos Cadastrados</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white">{stats.total}</span>
            <span className="text-[11px] text-white/40 font-semibold">{stats.active} ativos</span>
          </div>
        </div>

        <div className="bg-primary-500/10 border border-primary-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-primary-400">Metros em Estoque</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-primary-400 font-mono">
              {stats.totalMetrosEstoque.toFixed(1)}
            </span>
            <span className="text-[11px] text-primary-300/60 font-semibold">metros lin.</span>
          </div>
        </div>

        <div className={`border rounded-2xl p-4 flex flex-col justify-between ${
          stats.itensCriticosCount > 0 
            ? 'bg-rose-500/10 border-rose-500/30' 
            : 'bg-emerald-500/10 border-emerald-500/20'
        }`}>
          <span className={`text-[11px] font-black uppercase tracking-wider ${
            stats.itensCriticosCount > 0 ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            Status de Reposição
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-black ${
              stats.itensCriticosCount > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {stats.itensCriticosCount > 0 ? `${stats.itensCriticosCount} crítico(s)` : 'Normal'}
            </span>
            <span className="text-[11px] text-white/40 font-semibold">
              {stats.itensCriticosCount > 0 ? 'precisam compra' : 'estoque seguro'}
            </span>
          </div>
        </div>

        <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-sky-400">Valor Total em Estoque</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl sm:text-2xl font-black text-sky-400 font-mono">
              R$ {stats.totalEstoqueValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filters & View Switcher */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar bobina, lona, vinil..."
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto justify-between md:justify-end">
          {/* Status Pills */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === 'all' ? 'bg-primary-500 text-slate-950' : 'text-white/60 hover:text-white'
              }`}
            >
              Todas ({materiasPrimas.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === 'active' ? 'bg-emerald-500 text-slate-950' : 'text-white/60 hover:text-white'
              }`}
            >
              Ativas ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === 'inactive' ? 'bg-amber-500 text-slate-950' : 'text-white/60 hover:text-white'
              }`}
            >
              Inativas ({stats.inactive})
            </button>
          </div>

          {/* View Mode Toggle: Cards de Estoque vs Tabela */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'cards' ? 'bg-primary-500 text-slate-950 shadow' : 'text-white/60 hover:text-white'
              }`}
              title="Visualização em Cards com Previsão e Ajuste Rápido de Estoque"
            >
              <Box size={13} />
              <span>Cards & Previsão</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'table' ? 'bg-primary-500 text-slate-950 shadow' : 'text-white/60 hover:text-white'
              }`}
              title="Visualização em Tabela Detalhada"
            >
              <FileText size={13} />
              <span>Tabela</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-white/40 gap-3">
            <RefreshCw className="animate-spin text-primary-400" size={28} />
            <p className="text-sm font-semibold">Carregando matérias-primas...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-white/30">
              <Layers size={32} />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Nenhuma matéria-prima encontrada</h3>
            <p className="text-xs text-white/50 max-w-md mx-auto mb-5">
              Cadastre suas matérias-primas por bobina ou metros para calcular o custo de produção dos produtos automaticamente.
            </p>
            <Button
              onClick={handleOpenAdd}
              className="bg-primary-500 hover:bg-primary-400 text-slate-950 text-xs font-black mx-auto"
            >
              <Plus size={16} />
              <span>Cadastrar Primeira Matéria-Prima</span>
            </Button>
          </div>
        ) : (
          <div>
            {/* MODO CARDS COM FOCO EM ESTOQUE, PREVISÃO E AJUSTE RÁPIDO */}
            {viewMode === 'cards' ? (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredList.map((item) => {
                  const custoM2 = item.custoPorM2 || (item.larguraMaterial && item.larguraMaterial > 0 ? item.costPrice / item.larguraMaterial : item.costPrice);
                  const valorBob = item.valorBobina || (item.comprimentoBobina ? item.comprimentoBobina * item.costPrice : undefined);
                  const compBobina = item.comprimentoBobina || 50;
                  const isBobina = item.tipoCalculoCusto === 'bobina' || (item.unit === 'm' && item.comprimentoBobina);
                  
                  // Previsão calculada com base no consumo real ou estimativa padrão
                  const forecast = calculateMateriaPrimaForecast(item, historyList);
                  const percentEstoque = Math.min(100, Math.max(0, forecast.percentualBobinaRestante));

                  const getStatusBadge = () => {
                    switch (forecast.statusPrevisao) {
                      case 'esgotado':
                        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">Esgotado (0m)</span>;
                      case 'critico':
                        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">Crítico (&lt; 1 sem)</span>;
                      case 'atencao':
                        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">Atenção (~{forecast.semanasRestantes} sem)</span>;
                      case 'seguro':
                        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Seguro (~{forecast.semanasRestantes} sem)</span>;
                      case 'sem_movimento':
                      default:
                        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/10 text-white/70 border border-white/10">Estável</span>;
                    }
                  };

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900/80 hover:bg-slate-900 border border-white/10 hover:border-primary-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 shadow-xl group"
                    >
                      <div className="space-y-3.5">
                        {/* Header do Card */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 shrink-0 mt-0.5">
                              <Layers size={20} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-black text-white text-base leading-tight break-words group-hover:text-primary-300 transition-colors">
                                {item.name}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-white/90">
                                  {item.unit === 'm' ? 'Metro (m)' : item.unit.toUpperCase()}
                                </span>
                                {item.larguraMaterial && (
                                  <span className="text-[10px] font-mono text-primary-300 font-bold bg-primary-500/10 px-2 py-0.5 rounded border border-primary-500/20">
                                    {item.larguraMaterial}m larg.
                                  </span>
                                )}
                                {item.comprimentoBobina ? (
                                  <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                    Bobina {item.comprimentoBobina}m
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* Status Ativa/Inativa */}
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 transition-transform active:scale-95 ${
                              item.isActive
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
                            }`}
                          >
                            {item.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            <span>{item.isActive ? 'Ativa' : 'Inativa'}</span>
                          </button>
                        </div>

                        {/* BLOCO HERO: ESTOQUE ATUAL EM METROS & BOBINAS */}
                        <div className="bg-black/50 border border-white/10 rounded-xl p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase font-black tracking-wider text-white/50 flex items-center gap-1.5">
                              <Box size={13} className="text-primary-400" />
                              <span>Saldo em Estoque</span>
                            </span>
                            <button
                              onClick={() => {
                                setAdjustTargetMp(item);
                                setIsQuickAdjustModalOpen(true);
                              }}
                              className="text-[11px] text-primary-400 hover:text-primary-300 font-bold flex items-center gap-1 bg-primary-500/10 hover:bg-primary-500/20 px-2 py-0.5 rounded border border-primary-500/30 transition-colors"
                              title="Ajustar estoque sem abrir modal de edição"
                            >
                              <Sliders size={11} />
                              <span>Ajustar Rápido</span>
                            </button>
                          </div>

                          <div className="flex items-baseline justify-between">
                            <div>
                              <strong className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                                {forecast.totalMetrosEstoque.toFixed(1)}
                              </strong>
                              <span className="text-xs text-white/50 ml-1 font-mono">metros restantes</span>
                            </div>
                            {isBobina && (
                              <div className="text-right">
                                <span className="text-xs font-mono font-bold text-primary-300 block">
                                  ~{forecast.totalBobinasEstoque.toFixed(2)} bobina(s)
                                </span>
                                <span className="text-[10px] text-white/40">
                                  de {compBobina}m
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Barra de Progresso Visual do Estoque */}
                          <div className="space-y-1">
                            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  percentEstoque > 50
                                    ? 'bg-emerald-400'
                                    : percentEstoque > 20
                                    ? 'bg-amber-400'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${percentEstoque}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                              <span>Nível do rolo/lote: {percentEstoque.toFixed(0)}%</span>
                              <span>Padrão {compBobina}m</span>
                            </div>
                          </div>
                        </div>

                        {/* BLOCO DE PREVISÃO DE ESGOTAMENTO (SOLICITAÇÃO PRINCIPAL) */}
                        <div className={`p-3 rounded-xl border space-y-2 ${
                          forecast.statusPrevisao === 'critico' || forecast.statusPrevisao === 'esgotado'
                            ? 'bg-rose-950/30 border-rose-500/30'
                            : forecast.statusPrevisao === 'atencao'
                            ? 'bg-amber-950/30 border-amber-500/30'
                            : 'bg-slate-950/60 border-white/5'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                              <Clock size={13} className="text-amber-400" />
                              <span>Previsão de Término</span>
                            </span>
                            {getStatusBadge()}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between text-xs">
                              <span className="text-white/60">Tempo estimado:</span>
                              <strong className="text-white font-mono font-bold">
                                {forecast.totalMetrosEstoque <= 0 
                                  ? 'Esgotado' 
                                  : forecast.semanasRestantes > 0
                                  ? `~${forecast.semanasRestantes} semana(s) (${forecast.diasRestantes} dias)`
                                  : `~${forecast.diasRestantes} dia(s)`}
                              </strong>
                            </div>

                            <div className="flex items-baseline justify-between text-xs">
                              <span className="text-white/60">Consumo recente:</span>
                              <span className="font-mono text-primary-300 font-bold">
                                {forecast.consumoMedioSemanal.toFixed(1)} m / semana
                              </span>
                            </div>

                            {forecast.dataPrevisaoTermino && (
                              <div className="flex items-baseline justify-between text-[11px] pt-1 border-t border-white/5">
                                <span className="text-white/40">Data prevista término:</span>
                                <span className="text-white/80 font-mono">
                                  {new Date(forecast.dataPrevisaoTermino).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            )}

                            <p className="text-[10px] text-white/50 italic pt-1">
                              {forecast.mensagemPrevisao}
                            </p>
                          </div>
                        </div>

                        {/* Bloco de Custos */}
                        <div className="grid grid-cols-2 gap-2 bg-black/30 border border-white/5 rounded-xl p-2.5 text-xs">
                          <div>
                            <span className="text-white/40 block text-[10px] uppercase font-bold">Custo / Metro</span>
                            <span className="font-mono font-black text-emerald-400 text-sm">
                              R$ {Number(item.costPrice).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-white/40 block text-[10px] uppercase font-bold">Custo / m²</span>
                            <span className="font-mono font-black text-sky-400 text-sm">
                              {item.unit === 'm' ? `R$ ${custoM2.toFixed(2)}` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* BARRA DE AÇÕES EXTERNAS */}
                      <div className="pt-3 mt-3 border-t border-white/10 flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => {
                            setAdjustTargetMp(item);
                            setIsQuickAdjustModalOpen(true);
                          }}
                          className="flex-1 py-2 px-2.5 bg-primary-500 hover:bg-primary-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-primary-500/20 active:scale-95 transition-all"
                          title="Ajustar metros ou bobinas diretamente"
                        >
                          <Sliders size={14} />
                          <span>Ajustar</span>
                        </button>

                        <button
                          onClick={() => {
                            setHistoryTargetMp(item);
                            setIsHistoryModalOpen(true);
                          }}
                          className="py-2 px-2.5 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
                          title="Ver histórico de saídas e entradas deste insumo"
                        >
                          <History size={14} className="text-primary-400" />
                          <span className="hidden sm:inline">Histórico</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Editar configurações completas"
                          className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/10 active:scale-95 transition-all"
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          onClick={() => handleDuplicate(item)}
                          title="Duplicar matéria-prima"
                          className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/10 active:scale-95 transition-all"
                        >
                          <Copy size={14} />
                        </button>

                        <button
                          onClick={() => handleDelete(item)}
                          title="Excluir matéria-prima"
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 active:scale-95 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* MODO TABELA DETALHADA COM PREVISÃO E AJUSTE */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-wider text-white/50">
                      <th className="py-3.5 px-4">Nome da Matéria-Prima</th>
                      <th className="py-3.5 px-4 text-center">Tipo / Bobina</th>
                      <th className="py-3.5 px-4 text-right">Custo Metro</th>
                      <th className="py-3.5 px-4 text-right">Custo m²</th>
                      <th className="py-3.5 px-4 text-center">Estoque Atual</th>
                      <th className="py-3.5 px-4 text-center">Consumo Semanal</th>
                      <th className="py-3.5 px-4 text-center">Previsão Término</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {filteredList.map((item) => {
                      const custoM2 = item.custoPorM2 || (item.larguraMaterial && item.larguraMaterial > 0 ? item.costPrice / item.larguraMaterial : item.costPrice);
                      const compBobina = item.comprimentoBobina || 50;
                      const isBobina = item.tipoCalculoCusto === 'bobina' || (item.unit === 'm' && item.comprimentoBobina);
                      const forecast = calculateMateriaPrimaForecast(item, historyList);

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-white/[0.03] transition-colors group"
                        >
                          {/* Name */}
                          <td className="py-3.5 px-4 font-bold text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-primary-400 shrink-0">
                                <Layers size={16} />
                              </div>
                              <div>
                                <p className="leading-tight text-sm font-black">{item.name}</p>
                                {item.notes ? (
                                  <p className="text-[11px] text-white/40 line-clamp-1">{item.notes}</p>
                                ) : (
                                  <span className="text-[10px] text-white/30 font-mono">
                                    ID: {item.id.slice(0, 8)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Unit / Largura / Bobina */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="text-xs font-mono font-bold text-white">
                                {item.unit === 'm' ? 'Metro Linear' : item.unit}
                              </span>
                              {item.larguraMaterial && (
                                <span className="text-[10px] text-primary-400 font-mono">
                                  {item.larguraMaterial}m larg. {item.comprimentoBobina ? `× ${item.comprimentoBobina}m` : ''}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Custo por Metro */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                            R$ {Number(item.costPrice).toFixed(2)}
                            <span className="text-[10px] text-white/40 font-normal ml-1">/{item.unit}</span>
                          </td>

                          {/* Custo por m² */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sky-400">
                            {item.unit === 'm' ? (
                              <>
                                R$ {custoM2.toFixed(2)}
                                <span className="text-[10px] text-white/40 font-normal ml-1">/m²</span>
                              </>
                            ) : (
                              <span className="text-white/30 text-xs">—</span>
                            )}
                          </td>

                          {/* Quantidade em Estoque (Clicável para ajuste rápido!) */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => {
                                setAdjustTargetMp(item);
                                setIsQuickAdjustModalOpen(true);
                              }}
                              className="inline-flex flex-col items-center p-1.5 rounded-xl hover:bg-white/10 transition-colors group/stk cursor-pointer"
                              title="Clique para ajustar estoque rapidamente"
                            >
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold ${
                                forecast.totalMetrosEstoque <= 10 
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' 
                                  : 'bg-white/10 text-white border border-white/10'
                              }`}>
                                <span>{forecast.totalMetrosEstoque.toFixed(1)} m</span>
                                <Sliders size={11} className="text-primary-400 opacity-60 group-hover/stk:opacity-100" />
                              </span>
                              {isBobina && (
                                <span className="text-[10px] text-primary-400 font-mono mt-0.5">
                                  ~{forecast.totalBobinasEstoque.toFixed(1)} bob.
                                </span>
                              )}
                            </button>
                          </td>

                          {/* Consumo Médio Semanal */}
                          <td className="py-3.5 px-4 text-center font-mono text-xs text-white/80">
                            <span className="font-bold text-amber-300">
                              {forecast.consumoMedioSemanal.toFixed(1)} m
                            </span>
                            <span className="text-[10px] text-white/40 block">/ semana</span>
                          </td>

                          {/* Previsão de Término */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                forecast.statusPrevisao === 'critico' || forecast.statusPrevisao === 'esgotado'
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                  : forecast.statusPrevisao === 'atencao'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                <Clock size={11} />
                                <span>
                                  {forecast.totalMetrosEstoque <= 0 
                                    ? 'Esgotado' 
                                    : `~${forecast.semanasRestantes} sem.`}
                                </span>
                              </span>
                              {forecast.dataPrevisaoTermino && (
                                <span className="text-[10px] text-white/40 font-mono mt-0.5">
                                  {new Date(forecast.dataPrevisaoTermino).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status Ativa/Inativa */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(item)}
                              title="Clique para alternar o status"
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-transform active:scale-95 ${
                                item.isActive
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30'
                              }`}
                            >
                              {item.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              <span>{item.isActive ? 'Ativa' : 'Inativa'}</span>
                            </button>
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setAdjustTargetMp(item);
                                  setIsQuickAdjustModalOpen(true);
                                }}
                                title="Ajuste Rápido de Estoque"
                                className="p-2 text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/20 rounded-xl transition-all"
                              >
                                <Sliders size={14} />
                              </button>

                              <button
                                onClick={() => {
                                  setHistoryTargetMp(item);
                                  setIsHistoryModalOpen(true);
                                }}
                                title="Histórico de Consumo"
                                className="p-2 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                              >
                                <History size={14} />
                              </button>

                              <button
                                onClick={() => handleOpenEdit(item)}
                                title="Editar configurações completas"
                                className="p-2 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                              >
                                <Edit2 size={14} />
                              </button>

                              <button
                                onClick={() => handleDelete(item)}
                                title="Excluir matéria-prima"
                                className="p-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Histórico de Consumo */}
      <MateriaPrimaHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        selectedMateriaPrima={historyTargetMp}
        materiasPrimas={materiasPrimas}
        onStockUpdated={loadData}
        companyId={currentCompany?.id}
      />

      {/* Modal de Ajuste Rápido de Estoque */}
      <QuickAdjustStockModal
        isOpen={isQuickAdjustModalOpen}
        onClose={() => setIsQuickAdjustModalOpen(false)}
        materiaPrima={adjustTargetMp}
        onStockSaved={loadData}
        companyId={currentCompany?.id}
      />

      {/* Modal Add / Edit (Configurações Gerais) */}
      <MateriaPrimaFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingItem={editingItem}
        onSaved={handleSavedItem}
        companyId={currentCompany?.id}
      />
    </div>
  );
};
