/**
 * Dropdown Reutilizável de Etapas
 * 
 * Componente único usado em:
 * - Histórico de Pedidos
 * - Notas / Abertos
 * - Recibos Agendados
 * - Orçamentos
 * - Contratos
 * 
 * Se alterar aqui, funciona igual em TODOS os lugares!
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { STAGES_BY_GROUP, getStageConfig, StageGroup, StageName } from './StageConfig';
import { cn } from '../../lib/utils';

interface StageDropdownProps {
  /** Grupo de etapas (pedidos | orcamentos | contratos) */
  group: StageGroup;
  
  /** Etapa atual selecionada */
  currentStage: string;
  
  /** Callback quando etapa é alterada */
  onStageChange: (stageId: StageName) => void | Promise<void>;
  
  /** Desabilita o dropdown (readonly) */
  disabled?: boolean;
  
  /** Tamanho do botão */
  size?: 'sm' | 'md' | 'lg';
  
  /** Classe customizada do botão */
  className?: string;
  
  /** Se está salvando (desabilita enquanto salva) */
  isSaving?: boolean;
}

export default function StageDropdown({
  group,
  currentStage,
  onStageChange,
  disabled = false,
  size = 'md',
  className = '',
  isSaving = false,
}: StageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const stages = STAGES_BY_GROUP[group];
  const currentStageConfig = stages.find(s => s.id === currentStage);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleStageSelect = async (stageId: StageName) => {
    if (stageId === currentStage || isLoading || isSaving) return;

    setIsLoading(true);
    setIsOpen(false);

    try {
      const result = onStageChange(stageId);
      if (result instanceof Promise) {
        await result;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Tamanho do botão
  const sizeClasses = {
    sm: 'h-8 px-2.5 text-[10px]',
    md: 'h-10 px-3 text-[11px]',
    lg: 'h-12 px-4 text-[12px]',
  };

  // Cores do botão baseado na etapa atual
  const buttonColorClass = currentStageConfig
    ? `bg-${currentStageConfig.color}-500/20 text-${currentStageConfig.color}-400 border border-${currentStageConfig.color}-500/30`
    : 'bg-slate-500/20 text-slate-400 border border-slate-500/30';

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto">
      {/* Botão Principal */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading || isSaving}
        className={cn(
          'flex items-center justify-between gap-2 font-semibold rounded-lg transition-all',
          'hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed',
          'backdrop-blur-sm',
          sizeClasses[size],
          buttonColorClass,
          className
        )}
      >
        <span className="flex items-center gap-1.5 flex-1">
          {currentStageConfig?.icon && <span>{currentStageConfig.icon}</span>}
          <span className="truncate">{currentStageConfig?.label || 'Selecionar'}</span>
        </span>
        <ChevronDown
          size={16}
          className={cn(
            'transition-transform flex-shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute top-full left-0 right-0 mt-1 z-50',
            'sm:right-auto sm:min-w-[280px]',
            'bg-slate-900 border border-white/10 rounded-xl shadow-2xl',
            'overflow-hidden backdrop-blur-xl'
          )}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-white/10 bg-slate-800/50">
            <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">
              {group === 'pedidos' ? 'Etapas do Pedido' : group === 'orcamentos' ? 'Etapas do Orçamento' : 'Etapas do Contrato'}
            </p>
          </div>

          {/* Lista de Etapas */}
          <div className="max-h-[400px] overflow-y-auto no-scrollbar">
            {stages.map((stage) => {
              const isSelected = stage.id === currentStage;
              const isLoading_ = isLoading && stage.id === currentStage;

              return (
                <button
                  key={stage.id}
                  onClick={() => handleStageSelect(stage.id as StageName)}
                  disabled={isLoading_}
                  className={cn(
                    'w-full text-left px-3 py-2.5 transition-all',
                    'hover:bg-white/10 disabled:opacity-50',
                    isSelected && 'bg-primary-500/30 border-l-2 border-primary-500',
                    !isSelected && 'border-l-2 border-transparent'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{stage.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">
                        {stage.label}
                      </p>
                      {isSelected && (
                        <p className="text-[9px] text-primary-400">✓ Selecionado</p>
                      )}
                    </div>
                    {isLoading_ && (
                      <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
