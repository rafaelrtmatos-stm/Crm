import React, { useState, useEffect } from 'react';
import {
  PackageCheck, Plus, Minus, ArrowRight, Sparkles, Check, X,
  Layers, AlertTriangle, Clock
} from 'lucide-react';
import { MateriaPrima } from '../types';
import { quickAdjustStock, calculateMateriaPrimaForecast, fetchConsumptionHistory } from '../lib/materiasPrimasStorage';
import { Button, Modal } from './SharedUI';
import { showAlert } from '../lib/notify';

interface QuickAdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  materiaPrima: MateriaPrima | null;
  onStockSaved: () => void;
  companyId?: string;
}

export const QuickAdjustStockModal: React.FC<QuickAdjustStockModalProps> = ({
  isOpen,
  onClose,
  materiaPrima,
  onStockSaved,
  companyId
}) => {
  const [inputMode, setInputMode] = useState<'metros' | 'bobinas'>('metros');
  const [newStockValue, setNewStockValue] = useState<number>(0);
  const [motivo, setMotivo] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const compBobina = materiaPrima?.comprimentoBobina && materiaPrima.comprimentoBobina > 0 
    ? materiaPrima.comprimentoBobina 
    : 50;
  const isBobina = materiaPrima?.tipoCalculoCusto === 'bobina' || (materiaPrima?.unit === 'm' && materiaPrima?.comprimentoBobina);

  useEffect(() => {
    if (materiaPrima && isOpen) {
      const rawEstoque = materiaPrima.quantidadeEstoque ?? 0;
      if (isBobina) {
        // Se for bobina, o saldo em metros é rawEstoque * compBobina
        const metros = Number((rawEstoque * compBobina).toFixed(2));
        setNewStockValue(metros);
        setInputMode('metros');
      } else {
        setNewStockValue(rawEstoque);
        setInputMode(materiaPrima.unit === 'm' ? 'metros' : 'bobinas');
      }
      setMotivo('');
    }
  }, [materiaPrima, isOpen, isBobina, compBobina]);

  if (!materiaPrima) return null;

  const currentRaw = materiaPrima.quantidadeEstoque ?? 0;
  const currentMetros = isBobina ? Number((currentRaw * compBobina).toFixed(2)) : currentRaw;
  const currentBobinas = isBobina ? currentRaw : (compBobina > 0 ? Number((currentRaw / compBobina).toFixed(2)) : 0);

  // Calcula valores projetados
  const projectedMetros = inputMode === 'metros' ? newStockValue : Number((newStockValue * compBobina).toFixed(2));
  const projectedBobinas = isBobina 
    ? (inputMode === 'bobinas' ? newStockValue : (compBobina > 0 ? Number((newStockValue / compBobina).toFixed(2)) : 0))
    : projectedMetros;

  const diffMetros = Number((projectedMetros - currentMetros).toFixed(2));

  const handleApplyDelta = (deltaMetros: number) => {
    if (inputMode === 'metros') {
      setNewStockValue(prev => Math.max(0, Number((prev + deltaMetros).toFixed(2))));
    } else {
      const deltaBobinas = deltaMetros / compBobina;
      setNewStockValue(prev => Math.max(0, Number((prev + deltaBobinas).toFixed(2))));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Converte para a unidade armazenada no banco
      // Se a matéria-prima armazena em bobinas (tipoCalculoCusto === 'bobina'), grava em bobinas
      const finalStoredQty = isBobina 
        ? (inputMode === 'bobinas' ? newStockValue : Number((newStockValue / compBobina).toFixed(4)))
        : newStockValue;

      const reason = motivo || `Ajuste rápido externo de estoque (${diffMetros >= 0 ? `+${diffMetros}m` : `${diffMetros}m`})`;

      await quickAdjustStock(materiaPrima.id, finalStoredQty, reason, companyId);
      onStockSaved();
      onClose();
      showAlert('Estoque atualizado com sucesso!');
    } catch (err) {
      console.error('Erro ao atualizar estoque:', err);
      showAlert('Erro ao atualizar estoque.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajuste Rápido de Estoque (Sem Editar Configurações)"
      size="md"
    >
      <div className="space-y-4">
        {/* Info do Insumo */}
        <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
              <Layers size={18} />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">{materiaPrima.name}</h4>
              <p className="text-[11px] text-white/50">
                {isBobina ? `Bobina padrão de ${compBobina} metros (${materiaPrima.larguraMaterial || 1.52}m larg.)` : `Unidade: ${materiaPrima.unit}`}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-white/40 block">Saldo Atual</span>
            <strong className="text-sm font-black text-white font-mono">
              {currentMetros.toFixed(1)} m
            </strong>
            {isBobina && (
              <span className="text-[10px] text-primary-400 block font-mono">
                (~{currentBobinas.toFixed(1)} bob.)
              </span>
            )}
          </div>
        </div>

        {/* Input Mode Selector */}
        {isBobina && (
          <div className="flex items-center justify-between bg-black/40 p-1.5 rounded-xl border border-white/10">
            <span className="text-xs font-bold text-white/70 pl-2">Ajustar valor em:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (inputMode === 'bobinas') {
                    setNewStockValue(Number((newStockValue * compBobina).toFixed(1)));
                  }
                  setInputMode('metros');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  inputMode === 'metros' ? 'bg-primary-500 text-slate-950 shadow' : 'text-white/60 hover:text-white'
                }`}
              >
                Metros Lineares (m)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (inputMode === 'metros') {
                    setNewStockValue(Number((newStockValue / compBobina).toFixed(2)));
                  }
                  setInputMode('bobinas');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  inputMode === 'bobinas' ? 'bg-primary-500 text-slate-950 shadow' : 'text-white/60 hover:text-white'
                }`}
              >
                Bobinas
              </button>
            </div>
          </div>
        )}

        {/* Campo do Novo Saldo */}
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase text-white/80 flex items-center justify-between">
            <span>Novo Saldo em Estoque</span>
            <span className="text-primary-400 font-normal lowercase">
              (digite o total atual ou use os botões rápidos)
            </span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0"
              value={newStockValue}
              onChange={e => setNewStockValue(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full bg-black/60 border-2 border-primary-500/40 rounded-2xl px-4 py-3 text-lg font-black text-white font-mono outline-none focus:border-primary-400"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-primary-400 font-mono font-bold">
              {inputMode === 'metros' ? 'metros' : 'bobina(s)'}
            </span>
          </div>
        </div>

        {/* Botões Rápidos de Incremento / Decremento */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-white/40 uppercase">Atalhos rápidos de ajuste:</span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            <button
              type="button"
              onClick={() => handleApplyDelta(-compBobina)}
              className="py-1.5 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-colors"
            >
              -1 Bob ({compBobina}m)
            </button>
            <button
              type="button"
              onClick={() => handleApplyDelta(-10)}
              className="py-1.5 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-colors"
            >
              -10m
            </button>
            <button
              type="button"
              onClick={() => handleApplyDelta(-1)}
              className="py-1.5 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-colors"
            >
              -1m
            </button>
            <button
              type="button"
              onClick={() => handleApplyDelta(1)}
              className="py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-colors"
            >
              +1m
            </button>
            <button
              type="button"
              onClick={() => handleApplyDelta(10)}
              className="py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-colors"
            >
              +10m
            </button>
            <button
              type="button"
              onClick={() => handleApplyDelta(compBobina)}
              className="py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-colors"
            >
              +1 Bob ({compBobina}m)
            </button>
          </div>
        </div>

        {/* Card Comparativo (Antes vs Depois) */}
        <div className="bg-gradient-to-br from-slate-900 to-black p-3 rounded-2xl border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">Diferença de Estoque:</span>
            <strong className={`font-mono font-black ${
              diffMetros > 0 ? 'text-emerald-400' : diffMetros < 0 ? 'text-rose-400' : 'text-white/60'
            }`}>
              {diffMetros > 0 ? `+${diffMetros}m` : `${diffMetros}m`}
            </strong>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">Novo Total em Metros:</span>
            <strong className="text-white font-mono font-bold">
              {projectedMetros.toFixed(1)} metros
              {isBobina && (
                <span className="text-primary-400 text-[11px] ml-1.5 font-normal">
                  (~{projectedBobinas.toFixed(1)} bobina{projectedBobinas !== 1 ? 's' : ''})
                </span>
              )}
            </strong>
          </div>

          {materiaPrima.costPrice > 0 && (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
              <span className="text-white/50">Valor Total do Estoque:</span>
              <strong className="text-amber-300 font-mono font-bold">
                R$ {(projectedMetros * materiaPrima.costPrice).toFixed(2)}
              </strong>
            </div>
          )}
        </div>

        {/* Motivo do Ajuste (Opcional) */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-white/70">
            Motivo do Ajuste (Auditoria / Histórico)
          </label>
          <input
            type="text"
            placeholder="Ex: Contagem de inventário físico, sobra de rolo, refugo..."
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 outline-none focus:border-primary-400"
          />
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <Button variant="secondary" onClick={onClose} disabled={saving} className="text-xs">
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="text-xs py-2 px-4 bg-primary-500 hover:bg-primary-400 text-slate-950 font-black shadow-lg shadow-primary-500/20"
          >
            {saving ? 'Salvando...' : 'Salvar Novo Saldo'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
