import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag, Plus, Ruler, Sparkles, DollarSign, Calendar, Clock,
  FileText, Truck, ArrowRight, Check, AlertCircle, Layers, Box, Info
} from 'lucide-react';
import { MateriaPrima } from '../types';
import { reabastecerMateriaPrima, ReabastecimentoInput } from '../lib/materiasPrimasStorage';
import { Button, Modal } from './SharedUI';
import { showAlert } from '../lib/notify';

interface ReabastecerMateriaPrimaModalProps {
  isOpen: boolean;
  onClose: () => void;
  materiaPrima: MateriaPrima | null;
  materiasPrimas?: MateriaPrima[];
  onSuccess: (updatedMp: MateriaPrima) => void;
  companyId?: string;
}

export const ReabastecerMateriaPrimaModal: React.FC<ReabastecerMateriaPrimaModalProps> = ({
  isOpen,
  onClose,
  materiaPrima,
  materiasPrimas = [],
  onSuccess,
  companyId
}) => {
  const [selectedMpId, setSelectedMpId] = useState<string>('');
  const [modo, setModo] = useState<'bobinas' | 'metros'>('bobinas');
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  
  // Data e hora da compra (formato YYYY-MM-DDTHH:mm para input datetime-local)
  const [dataHoraCompra, setDataHoraCompra] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });

  // Preço e custo
  const [precoUnitario, setPrecoUnitario] = useState<number | ''>('');
  const [atualizarPrecoCusto, setAtualizarPrecoCusto] = useState<boolean>(true);

  // Fornecedor e documento
  const [fornecedor, setFornecedor] = useState<string>('');
  const [notaFiscal, setNotaFiscal] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Seleciona o item atual (passado por prop ou selecionado no dropdown)
  const currentMp = useMemo(() => {
    if (materiaPrima) return materiaPrima;
    if (selectedMpId) return materiasPrimas.find(m => m.id === selectedMpId) || null;
    return materiasPrimas[0] || null;
  }, [materiaPrima, selectedMpId, materiasPrimas]);

  const compBobina = currentMp?.comprimentoBobina && currentMp.comprimentoBobina > 0 
    ? currentMp.comprimentoBobina 
    : 50;
  const isBobina = currentMp?.tipoCalculoCusto === 'bobina' || (currentMp?.unit === 'm' && currentMp?.comprimentoBobina);
  const largura = currentMp?.larguraMaterial || 1.52;

  // Atualiza valores iniciais quando o modal abre ou a matéria-prima muda
  useEffect(() => {
    if (isOpen && currentMp) {
      setSelectedMpId(currentMp.id);
      
      const isBob = currentMp.tipoCalculoCusto === 'bobina' || (currentMp.unit === 'm' && currentMp.comprimentoBobina);
      setModo(isBob ? 'bobinas' : 'metros');
      setQuantidade(1);

      // Preenche com a data/hora atual
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setDataHoraCompra(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);

      // Pré-carrega o preço de compra cadastrado
      if (isBob) {
        const valBob = currentMp.valorBobina || (currentMp.costPrice ? currentMp.costPrice * compBobina : 750);
        setPrecoUnitario(Number(valBob.toFixed(2)));
      } else {
        setPrecoUnitario(Number((currentMp.costPrice || 15).toFixed(2)));
      }

      setAtualizarPrecoCusto(true);
      setFornecedor('');
      setNotaFiscal('');
      setObservacao('');
    }
  }, [isOpen, currentMp?.id]);

  // Se alterar o modo (bobinas vs metros), ajusta o preço sugerido correspondente
  const handleToggleModo = (newModo: 'bobinas' | 'metros') => {
    setModo(newModo);
    if (!currentMp) return;
    if (newModo === 'bobinas') {
      const valBob = currentMp.valorBobina || (currentMp.costPrice ? currentMp.costPrice * compBobina : 750);
      setPrecoUnitario(Number(valBob.toFixed(2)));
      if (typeof quantidade === 'number' && quantidade > 5) {
        setQuantidade(1);
      }
    } else {
      const valMetro = currentMp.costPrice || (currentMp.valorBobina ? currentMp.valorBobina / compBobina : 15);
      setPrecoUnitario(Number(valMetro.toFixed(2)));
      if (typeof quantidade === 'number' && quantidade <= 2) {
        setQuantidade(compBobina);
      }
    }
  };

  const handleSetAgora = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setDataHoraCompra(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
  };

  // Cálculos em tempo real
  const qtyNumber = typeof quantidade === 'number' && quantidade > 0 ? quantidade : 0;
  const precoNumber = typeof precoUnitario === 'number' && precoUnitario > 0 ? precoUnitario : 0;

  // Metros e bobinas que estão entrando
  const metrosAdicionados = modo === 'bobinas' ? qtyNumber * compBobina : qtyNumber;
  const bobinasAdicionadas = compBobina > 0 ? metrosAdicionados / compBobina : 0;

  // Valor total a pagar nesta compra
  const valorTotalCompra = modo === 'bobinas' 
    ? qtyNumber * precoNumber 
    : qtyNumber * precoNumber;

  // Novo custo unitário calculado
  const novoCustoPorMetro = modo === 'bobinas'
    ? (compBobina > 0 ? precoNumber / compBobina : 0)
    : precoNumber;
  const novoCustoPorM2 = largura > 0 ? novoCustoPorMetro / largura : 0;

  // Saldo atual
  const rawCurrent = Number(currentMp?.quantidadeEstoque ?? 0);
  const currentMetros = isBobina
    ? (rawCurrent <= 15 ? Number((rawCurrent * compBobina).toFixed(2)) : rawCurrent)
    : rawCurrent;
  const currentBobinas = isBobina
    ? (rawCurrent <= 15 ? rawCurrent : (compBobina > 0 ? Number((rawCurrent / compBobina).toFixed(2)) : 0))
    : (compBobina > 0 ? Number((rawCurrent / compBobina).toFixed(2)) : 0);

  // Novo saldo final projetado
  const novoSaldoMetros = Number((currentMetros + metrosAdicionados).toFixed(2));
  const novoSaldoBobinas = compBobina > 0 ? Number((novoSaldoMetros / compBobina).toFixed(2)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMp) {
      showAlert('Selecione uma matéria-prima.');
      return;
    }
    if (qtyNumber <= 0) {
      showAlert('Informe uma quantidade válida para reabastecer.');
      return;
    }

    try {
      setSaving(true);

      const input: ReabastecimentoInput = {
        materiaPrimaId: currentMp.id,
        modo: modo,
        quantidadeAdicionada: qtyNumber,
        valorTotalPago: valorTotalCompra > 0 ? valorTotalCompra : undefined,
        valorUnitarioPago: precoNumber > 0 ? precoNumber : undefined,
        atualizarPrecoCusto,
        dataHoraCompra,
        fornecedor: fornecedor.trim() || undefined,
        notaFiscal: notaFiscal.trim() || undefined,
        observacao: observacao.trim() || undefined,
        companyId
      };

      const res = await reabastecerMateriaPrima(input);
      if (res.success) {
        showAlert(res.message);
        onSuccess(res.materiaPrima);
        onClose();
      } else {
        showAlert('Não foi possível registrar o reabastecimento.');
      }
    } catch (err: any) {
      console.error('Erro ao reabastecer matéria-prima:', err);
      showAlert('Erro ao registrar compra: ' + (err?.message || 'Tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reabastecer Estoque / Comprar Bobina"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Seletor de Matéria-Prima se não foi fixada */}
        {!materiaPrima && materiasPrimas.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-white/70">
              Selecione o Insumo a Reabastecer *
            </label>
            <select
              value={selectedMpId}
              onChange={e => setSelectedMpId(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-medium outline-none focus:border-primary-500"
            >
              {materiasPrimas.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.comprimentoBobina ? `Bobina de ${m.comprimentoBobina}m` : m.unit})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Card Resumo do Insumo Selecionado */}
        {currentMp && (
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-primary-950/20 to-slate-900 border border-primary-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 shrink-0">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">{currentMp.name}</h3>
                <p className="text-xs text-white/50">
                  Largura: <strong className="text-white/80">{largura}m</strong> • Padrão Bobina: <strong className="text-white/80">{compBobina}m</strong>
                </p>
              </div>
            </div>

            <div className="bg-black/50 px-3 py-1.5 rounded-xl border border-white/10 text-right self-stretch sm:self-auto">
              <span className="text-[10px] uppercase font-bold text-white/40 block">Saldo Atual em Estoque</span>
              <strong className="text-sm font-mono font-black text-cyan-400">
                {currentMetros.toFixed(1)}m
                {isBobina && <span className="text-xs font-normal text-white/50 ml-1">(~{currentBobinas.toFixed(2)} bob.)</span>}
              </strong>
            </div>
          </div>
        )}

        {/* 1. MODO DE ENTRADA: POR BOBINA OU POR METROS */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-wider text-primary-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShoppingBag size={14} />
              <span>Como você comprou este reabastecimento? *</span>
            </span>
            <span className="text-[10px] text-white/40">Selecione para calcular metros automaticamente</span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleToggleModo('bobinas')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                modo === 'bobinas'
                  ? 'bg-primary-500/20 border-primary-500 text-white shadow-lg shadow-primary-500/10'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <Ruler size={15} className={modo === 'bobinas' ? 'text-primary-400' : 'text-white/40'} />
                  <span>Por Bobina(s) Inteira(s)</span>
                </span>
                {modo === 'bobinas' && <Check size={14} className="text-primary-400" />}
              </div>
              <span className="text-[10px] text-white/50 leading-tight">
                Cada bobina soma <strong>{compBobina} metros</strong> ao estoque
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleModo('metros')}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                modo === 'metros'
                  ? 'bg-primary-500/20 border-primary-500 text-white shadow-lg shadow-primary-500/10'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <Sparkles size={15} className={modo === 'metros' ? 'text-primary-400' : 'text-white/40'} />
                  <span>Por Metros Lineares</span>
                </span>
                {modo === 'metros' && <Check size={14} className="text-primary-400" />}
              </div>
              <span className="text-[10px] text-white/50 leading-tight">
                Compra fracionada ou quantidade avulsa em metros
              </span>
            </button>
          </div>
        </div>

        {/* 2. QUANTIDADE & DATA/HORA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-black/40 border border-white/10 rounded-2xl">
          {/* Quantidade Comprada */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-white/70 flex items-center justify-between">
              <span>{modo === 'bobinas' ? 'Qtd. de Bobinas Compradas *' : 'Metros Lineares Comprados *'}</span>
              <span className="text-[10px] font-mono text-primary-400 font-bold">
                {modo === 'bobinas' ? `= ${metrosAdicionados.toFixed(1)}m` : `~${bobinasAdicionadas.toFixed(2)} bob.`}
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={quantidade}
                onChange={e => setQuantidade(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder={modo === 'bobinas' ? 'Ex: 1 bobina' : `Ex: ${compBobina} metros`}
                className="w-full bg-slate-900 border border-primary-500/30 rounded-xl px-3.5 py-2.5 text-base text-white font-mono font-black outline-none focus:border-primary-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary-400/80 font-mono font-bold">
                {modo === 'bobinas' ? 'bobina(s)' : 'metros'}
              </span>
            </div>

            {/* Atalhos rápidos de quantidade */}
            <div className="flex items-center gap-1.5 pt-1">
              {modo === 'bobinas' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setQuantidade(1)}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-mono font-bold"
                  >
                    1 bobina
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantidade(2)}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-mono font-bold"
                  >
                    2 bobinas
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantidade(0.5)}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-mono font-bold"
                  >
                    0.5 (meia)
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setQuantidade(10)}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-mono font-bold"
                  >
                    +10m
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantidade(25)}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-mono font-bold"
                  >
                    +25m
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantidade(50)}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-mono font-bold"
                  >
                    +50m
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Data e Hora da Compra */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-white/70 flex items-center gap-1">
                <Calendar size={13} className="text-primary-400" />
                <span>Data & Hora da Compra *</span>
              </label>
              <button
                type="button"
                onClick={handleSetAgora}
                className="text-[10px] text-primary-400 hover:text-primary-300 font-bold flex items-center gap-1"
              >
                <Clock size={11} />
                <span>Agora</span>
              </button>
            </div>
            <input
              type="datetime-local"
              required
              value={dataHoraCompra}
              onChange={e => setDataHoraCompra(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-semibold outline-none focus:border-primary-400"
            />
            <span className="text-[10px] text-white/40 block">
              Ficará registrado no extrato histórico para auditoria.
            </span>
          </div>
        </div>

        {/* 3. PREÇO PAGO & ATUALIZAÇÃO DE CUSTO */}
        <div className="p-3.5 bg-gradient-to-br from-emerald-950/20 to-slate-900/80 border border-emerald-500/20 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <DollarSign size={15} />
              <span>Preço Pago nesta Nova Compra</span>
            </span>
            <span className="text-[10px] text-white/50">Permite lançar preço diferente do cadastro</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-white/70">
                {modo === 'bobinas' ? 'Valor por Bobina (R$)' : 'Valor por Metro Linear (R$)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-emerald-400 font-bold">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precoUnitario}
                  onChange={e => setPrecoUnitario(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder={modo === 'bobinas' ? '750.00' : '15.00'}
                  className="w-full bg-black/50 border border-emerald-500/30 rounded-xl pl-9 pr-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="bg-black/30 border border-white/5 rounded-xl p-2.5 flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold text-white/40">Total Pago neste Lote</span>
              <strong className="text-base font-mono font-black text-emerald-400">
                R$ {valorTotalCompra.toFixed(2)}
              </strong>
              <span className="text-[10px] text-white/50 font-mono">
                Custo: R$ {novoCustoPorMetro.toFixed(2)}/metro • R$ {novoCustoPorM2.toFixed(2)}/m²
              </span>
            </div>
          </div>

          {/* Checkbox para atualizar o cadastro da matéria-prima */}
          <label className="flex items-start gap-2.5 p-2.5 bg-black/40 rounded-xl border border-white/5 cursor-pointer hover:bg-black/60 transition-colors">
            <input
              type="checkbox"
              checked={atualizarPrecoCusto}
              onChange={e => setAtualizarPrecoCusto(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-500 cursor-pointer mt-0.5"
            />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white">
                Atualizar preço de custo do cadastro para este novo valor
              </p>
              <p className="text-[10px] text-white/50 leading-relaxed">
                Se marcado, os futuros orçamentos, produtos e cálculo de lucro passarão a adotar{' '}
                <strong className="text-emerald-400 font-mono">R$ {novoCustoPorMetro.toFixed(2)}/metro</strong>{' '}
                (<strong className="text-cyan-400 font-mono">R$ {novoCustoPorM2.toFixed(2)}/m²</strong>).
              </p>
            </div>
          </label>
        </div>

        {/* 4. FORNECEDOR & NOTA FISCAL (OPCIONAL) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/60 flex items-center gap-1">
              <Truck size={12} />
              <span>Fornecedor (Opcional)</span>
            </label>
            <input
              type="text"
              value={fornecedor}
              onChange={e => setFornecedor(e.target.value)}
              placeholder="Ex: Tecgraphic, VinilSul, Alltak"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary-500 font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/60 flex items-center gap-1">
              <FileText size={12} />
              <span>Nº da NF / Pedido (Opcional)</span>
            </label>
            <input
              type="text"
              value={notaFiscal}
              onChange={e => setNotaFiscal(e.target.value)}
              placeholder="Ex: NF-e 14205"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary-500 font-medium"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-white/60">
            Observações Adicionais (Opcional)
          </label>
          <input
            type="text"
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            placeholder="Ex: Lote 2026-B, acabamento extra brilho"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-primary-500 font-medium"
          />
        </div>

        {/* 5. RESUMO DA OPERAÇÃO DE ESTOQUE */}
        <div className="p-3 bg-slate-950 border border-white/10 rounded-2xl space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/50 block">
            Impacto no Estoque
          </span>
          <div className="flex items-center justify-between text-center gap-2">
            <div className="flex-1 bg-black/40 p-2 rounded-xl border border-white/5">
              <span className="text-[9px] uppercase font-bold text-white/40 block">Saldo Atual</span>
              <strong className="text-xs font-mono font-bold text-white">
                {currentMetros.toFixed(1)}m
              </strong>
            </div>

            <div className="text-primary-400 font-black text-sm">+</div>

            <div className="flex-1 bg-primary-500/10 p-2 rounded-xl border border-primary-500/20">
              <span className="text-[9px] uppercase font-bold text-primary-300 block">Entrando</span>
              <strong className="text-xs font-mono font-black text-primary-300">
                +{metrosAdicionados.toFixed(1)}m
              </strong>
            </div>

            <ArrowRight size={14} className="text-white/40 shrink-0" />

            <div className="flex-1 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/30">
              <span className="text-[9px] uppercase font-bold text-emerald-400 block">Novo Saldo Final</span>
              <strong className="text-sm font-mono font-black text-emerald-400">
                {novoSaldoMetros.toFixed(1)}m
              </strong>
              {isBobina && (
                <span className="text-[9px] text-white/40 block font-mono">
                  (~{novoSaldoBobinas.toFixed(2)} bob.)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Botões do Rodapé */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving || qtyNumber <= 0}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
          >
            <Check size={16} />
            <span>{saving ? 'Gravando Entrada...' : `Confirmar Compra (+${metrosAdicionados.toFixed(1)}m)`}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
