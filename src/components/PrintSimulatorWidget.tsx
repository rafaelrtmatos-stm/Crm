import React, { useState, useMemo } from 'react';
import {
  Clock, Gauge, Droplet, Zap, DollarSign, Cpu, Maximize2,
  ChevronDown, ChevronUp, Sparkles, Check, Play, Layers
} from 'lucide-react';
import {
  Maquina, ModoImpressaoConfig,
  calcularTempoProducaoMinutos, calcularCustosMaquina,
  calcularVelocidadeMarginalM2H,
  VELOCIDADE_CABECA_MIN_MMS, VELOCIDADE_CABECA_MAX_MMS
} from '../types';

interface PrintSimulatorWidgetProps {
  maquinas: Maquina[];
  initialMaquinaId?: string;
  className?: string;
  isCompact?: boolean;
}

export const PrintSimulatorWidget: React.FC<PrintSimulatorWidgetProps> = ({
  maquinas,
  initialMaquinaId,
  className = '',
  isCompact = false
}) => {
  const activeMaquinas = useMemo(() => maquinas.filter(m => m.ativa), [maquinas]);
  const [selectedMaquinaId, setSelectedMaquinaId] = useState<string>(() => {
    if (initialMaquinaId && maquinas.some(m => m.id === initialMaquinaId)) {
      return initialMaquinaId;
    }
    return activeMaquinas[0]?.id || maquinas[0]?.id || '';
  });

  const selectedMaquina = useMemo(() => {
    return maquinas.find(m => m.id === selectedMaquinaId) || activeMaquinas[0] || maquinas[0] || null;
  }, [maquinas, selectedMaquinaId, activeMaquinas]);

  // Input Mode: m2 direto ou largura x altura
  const [inputMode, setInputMode] = useState<'m2' | 'dimensoes'>('m2');
  const [areaM2Direct, setAreaM2Direct] = useState<number | ''>(5);
  const [larguraM, setLarguraM] = useState<number | ''>(1.20);
  const [alturaM, setAlturaM] = useState<number | ''>(2.50);

  // Modo / Perfil de impressão selecionado (Standard ou High Speed)
  const [selectedModoId, setSelectedModoId] = useState<'standard' | 'highspeed'>('standard');
  const [usarVelocidadeCabecaPadrao, setUsarVelocidadeCabecaPadrao] = useState<boolean>(true);
  const [velocidadeCabeca, setVelocidadeCabeca] = useState<number>(400);

  // Área calculada em m²
  const areaFinalM2 = useMemo(() => {
    if (inputMode === 'm2') {
      return typeof areaM2Direct === 'number' && areaM2Direct > 0 ? areaM2Direct : 0;
    } else {
      const l = typeof larguraM === 'number' && larguraM > 0 ? larguraM : 0;
      const a = typeof alturaM === 'number' && alturaM > 0 ? alturaM : 0;
      return Number((l * a).toFixed(3));
    }
  }, [inputMode, areaM2Direct, larguraM, alturaM]);

  // Velocidade de produção calculada em tempo real (m²/h)
  const velocidadeCalculadaM2H = useMemo(() => {
    if (!selectedMaquina) return 0;
    return calcularVelocidadeMarginalM2H(
      selectedModoId,
      velocidadeCabeca,
      selectedMaquina.calibKMms,
      selectedMaquina.velocidadeHispeedM2H
    );
  }, [selectedMaquina, selectedModoId, velocidadeCabeca]);

  // Simulação de tempo e custos
  const simulationResults = useMemo(() => {
    if (!selectedMaquina || areaFinalM2 <= 0) {
      return {
        tempoMinutosTotal: 0,
        tempoFormatado: '0 min',
        velocidadeAplicadaM2H: 0,
        custoOperacionalMaquina: 0,
        consumoTintaMl: 0,
        custoTintaTotal: 0,
        custoTotalJob: 0,
        tempoSetupMin: 0
      };
    }

    const velocidade = selectedModoId === 'highspeed'
      ? (Number(selectedMaquina.velocidadeHispeedM2H) > 0 ? Number(selectedMaquina.velocidadeHispeedM2H) : 4.55)
      : (velocidadeCalculadaM2H > 0 ? velocidadeCalculadaM2H : (selectedMaquina.velocidadeProducaoM2H || 10));

    const consumoTintaMlM2 = selectedMaquina.tintaConsumoMlM2 ?? 15;

    // Tempo fixo de setup / aquecimento
    const tempoSetup = Number(selectedMaquina.tempoSetupMin) || 0;

    // Tempo de impressão por m²
    let tempoMinutos = 0;
    if (selectedModoId === 'highspeed') {
      tempoMinutos = calcularTempoProducaoMinutos(selectedMaquina, areaFinalM2, 'highspeed');
    } else {
      tempoMinutos = calcularTempoProducaoMinutos(
        selectedMaquina,
        areaFinalM2,
        'standard',
        velocidadeCabeca
      );
    }

    const tempoMinutosTotal = tempoMinutos + tempoSetup;

    // Formatação amigável de tempo (horas e minutos)
    let tempoFormatado = '';
    const horas = Math.floor(tempoMinutosTotal / 60);
    const mins = Math.round(tempoMinutosTotal % 60);
    if (horas > 0) {
      tempoFormatado = `${horas}h ${mins > 0 ? `${mins}min` : ''}`.trim();
    } else {
      tempoFormatado = `${Math.max(1, Math.round(tempoMinutosTotal))} min`;
    }

    // Custos operacionais da máquina
    const c = calcularCustosMaquina(selectedMaquina);
    const horasOperacao = tempoMinutos / 60;
    const custoOperacionalMaquina = c.custoTotalMaquinaHora * horasOperacao;

    // Consumo e custo de tinta
    const consumoTintaMl = areaFinalM2 * consumoTintaMlM2;
    const custoPorMl = selectedMaquina.tintaQuantidadeMl > 0 
      ? selectedMaquina.tintaValor / selectedMaquina.tintaQuantidadeMl 
      : 0;
    const custoTintaTotal = consumoTintaMl * custoPorMl;

    const custoTotalJob = custoOperacionalMaquina + custoTintaTotal;

    return {
      tempoMinutosTotal,
      tempoFormatado,
      velocidadeAplicadaM2H: velocidade,
      custoOperacionalMaquina,
      consumoTintaMl,
      custoTintaTotal,
      custoTotalJob,
      tempoSetupMin: tempoSetup
    };
  }, [selectedMaquina, areaFinalM2, selectedModoId, velocidadeCabeca, velocidadeCalculadaM2H]);

  // Quick preset area buttons
  const presetAreas = [1, 2.5, 5, 10, 25, 50];

  if (!selectedMaquina) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 rounded-3xl border border-cyan-500/30 p-4 sm:p-6 shadow-2xl space-y-5 ${className}`}>
      {/* Header do Simulador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
            <Clock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                <span>Simulador de Tempo & Custos de Impressão</span>
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Ao Vivo
              </span>
            </div>
            <p className="text-xs text-white/50">
              Simule o tempo real e o custo de produção sem precisar editar a máquina.
            </p>
          </div>
        </div>

        {/* Seletor de Máquina */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-white/60 uppercase shrink-0">Máquina:</label>
          <select
            value={selectedMaquinaId}
            onChange={(e) => setSelectedMaquinaId(e.target.value)}
            className="bg-slate-950 border border-cyan-500/30 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-cyan-400 cursor-pointer shadow"
          >
            {maquinas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome} {!m.ativa ? '(Inativa)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Controles de Entrada: Tamanho / Área e Perfil de Impressão */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Lado Esquerdo: Área e Modo (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Seletor do Modo de Entrada de Dimensão */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-white/70 uppercase tracking-wider flex items-center gap-1">
                <Maximize2 size={13} className="text-cyan-400" />
                <span>1. Medida do Trabalho / Peça</span>
              </span>
              <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10 text-[10px]">
                <button
                  type="button"
                  onClick={() => setInputMode('m2')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                    inputMode === 'm2' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Metro Quadrado (m²)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('dimensoes')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                    inputMode === 'dimensoes' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Largura × Altura
                </button>
              </div>
            </div>

            {inputMode === 'm2' ? (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={areaM2Direct}
                    onChange={(e) => setAreaM2Direct(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="Ex: 5"
                    className="w-full bg-slate-950/80 border border-white/15 rounded-2xl px-4 py-3 text-lg font-black text-white font-mono outline-none focus:border-cyan-400 pr-16"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-400 uppercase">
                    m² total
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-white/40 font-bold uppercase mr-1">Rápido:</span>
                  {presetAreas.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAreaM2Direct(val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                        areaM2Direct === val
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow'
                          : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {val} m²
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                      Largura (metros)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={larguraM}
                        onChange={(e) => setLarguraM(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="1.20"
                        className="w-full bg-slate-950/80 border border-white/15 rounded-xl px-3 py-2 text-sm font-black text-white font-mono outline-none focus:border-cyan-400"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">m</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                      Altura / Comp. (metros)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={alturaM}
                        onChange={(e) => setAlturaM(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="2.50"
                        className="w-full bg-slate-950/80 border border-white/15 rounded-xl px-3 py-2 text-sm font-black text-white font-mono outline-none focus:border-cyan-400"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">m</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs bg-black/30 px-3 py-1.5 rounded-xl border border-white/5 text-white/70">
                  <span>Área Total Calculada:</span>
                  <strong className="text-cyan-400 font-mono text-sm">{areaFinalM2} m²</strong>
                </div>
              </div>
            )}
          </div>

          {/* Seletor de Perfil / Modo de Impressão: Standard e High Speed */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-black text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge size={13} className="text-cyan-400" />
                  <span>2. Modo de Impressão</span>
                </label>
                <span className="text-[10px] text-white/40">
                  {selectedModoId === 'highspeed' ? 'Velocidade fixa contínua' : 'Velocidade calibrada por mm/s'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Standard */}
                <button
                  type="button"
                  onClick={() => setSelectedModoId('standard')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedModoId === 'standard'
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400'
                      : 'bg-black/30 border-white/10 text-white/70 hover:bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs leading-tight">Standard</span>
                    {selectedModoId === 'standard' && <Check size={14} className="text-cyan-400" />}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/60 font-mono">
                    <span className="text-cyan-300 font-bold">~{velocidadeCalculadaM2H.toFixed(2)} m²/h</span>
                    <span>• Varia c/ cabeça</span>
                  </div>
                </button>

                {/* High Speed */}
                <button
                  type="button"
                  onClick={() => setSelectedModoId('highspeed')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedModoId === 'highspeed'
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-400'
                      : 'bg-black/30 border-white/10 text-white/70 hover:bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs leading-tight">High Speed</span>
                    {selectedModoId === 'highspeed' && <Check size={14} className="text-amber-400" />}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/60 font-mono">
                    <span className="text-amber-300 font-bold">
                      {Number(selectedMaquina.velocidadeHispeedM2H) > 0 ? Number(selectedMaquina.velocidadeHispeedM2H).toFixed(2) : '4.55'} m²/h
                    </span>
                    <span>• Velocidade rápida</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Abaixo do modo de produção: Controle da Velocidade da Cabeça */}
            {selectedModoId === 'standard' ? (
              <div className="bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={usarVelocidadeCabecaPadrao}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUsarVelocidadeCabecaPadrao(checked);
                        if (checked) {
                          setVelocidadeCabeca(400);
                        }
                      }}
                      className="w-4 h-4 rounded border-white/20 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0 bg-slate-900 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-white">
                      Velocidade da cabeça padrão (400 mm/s)
                    </span>
                  </label>

                  <div className="text-[11px] font-mono text-cyan-300 font-bold">
                    ~{velocidadeCalculadaM2H.toFixed(2)} m²/h calculada
                  </div>
                </div>

                {/* Se a caixinha estiver desmarcada: permite alterar livremente */}
                {!usarVelocidadeCabecaPadrao ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] text-white/60">
                      <span className="font-bold text-cyan-300 uppercase">
                        Alterar velocidade da cabeça (mm/s):
                      </span>
                      <span className="text-white/40 font-mono">
                        Limites: {VELOCIDADE_CABECA_MIN_MMS} a {VELOCIDADE_CABECA_MAX_MMS} mm/s
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      <div className="sm:col-span-4 relative">
                        <input
                          type="number"
                          step="1"
                          min={VELOCIDADE_CABECA_MIN_MMS}
                          max={VELOCIDADE_CABECA_MAX_MMS}
                          value={velocidadeCabeca}
                          onChange={(e) => {
                            const raw = parseInt(e.target.value, 10);
                            if (Number.isFinite(raw)) {
                              const clamped = Math.min(Math.max(raw, VELOCIDADE_CABECA_MIN_MMS), VELOCIDADE_CABECA_MAX_MMS);
                              setVelocidadeCabeca(clamped);
                            } else {
                              setVelocidadeCabeca(VELOCIDADE_CABECA_MIN_MMS);
                            }
                          }}
                          className="w-full bg-slate-900 border border-cyan-500/50 rounded-xl px-3 py-2 text-sm font-black font-mono text-white focus:outline-none focus:border-cyan-400 shadow-inner"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 font-mono">
                          mm/s
                        </span>
                      </div>

                      {/* Botões rápidos das velocidades registradas no RIP */}
                      <div className="sm:col-span-8 flex flex-wrap gap-1">
                        {[
                          { label: '250 (Mín)', val: 250 },
                          { label: '350', val: 350 },
                          { label: '400 (Padrão)', val: 400 },
                          { label: '500', val: 500 },
                          { label: '600', val: 600 },
                          { label: '761 (Máx)', val: 761 },
                        ].map(({ label, val }) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setVelocidadeCabeca(val)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                              velocidadeCabeca === val
                                ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow'
                                : 'bg-black/40 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                      <span className="text-white/60">Cabeça: <strong className="text-white">{velocidadeCabeca} mm/s</strong></span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Zap size={12} /> Tempo recalculado ao vivo
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-white/60 bg-black/20 px-3 py-1.5 rounded-xl border border-white/5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Velocidade padrão ativa (400 mm/s).
                    </span>
                    <span className="text-[10px] text-cyan-300">
                      Desmarque para alterar
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-200/90 flex items-center gap-2.5">
                <Sparkles size={16} className="text-amber-400 shrink-0" />
                <div>
                  <strong>Modo High Speed:</strong> Impressão rápida contínua (~4.55 m²/h), sem alteração pela velocidade da cabeça (mm/s).
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Grande Painel de Resultados (Col 5) */}
        <div className="lg:col-span-5 bg-black/50 border-2 border-cyan-500/40 rounded-3xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Sparkles size={15} /> Resultado da Simulação
            </span>
            <span className="text-[11px] font-mono text-white/60">
              {areaFinalM2} m² • {selectedMaquina.nome}
            </span>
          </div>

          {/* Destaque Principal: Tempo de Produção */}
          <div className="bg-gradient-to-br from-cyan-950/60 to-slate-900 p-4 rounded-2xl border border-cyan-500/30 text-center space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 block">
              Tempo Estimado de Produção
            </span>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <Clock className="text-cyan-400 animate-pulse" size={28} />
              <span>{simulationResults.tempoFormatado}</span>
            </div>
            <div className="text-[11px] text-white/60 pt-1 flex items-center justify-center gap-2">
              <span>Velocidade: <strong className="text-cyan-300">{simulationResults.velocidadeAplicadaM2H} m²/h</strong></span>
              {simulationResults.tempoSetupMin > 0 && (
                <span>• Setup: <strong className="text-white/80">{simulationResults.tempoSetupMin} min</strong></span>
              )}
            </div>
          </div>

          {/* Métricas Granulares de Custo & Insumos */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Custo da Máquina */}
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 space-y-0.5">
              <span className="text-[10px] text-white/50 uppercase font-bold block">Máquina / Horas</span>
              <strong className="text-white font-mono text-sm block">
                R$ {simulationResults.custoOperacionalMaquina.toFixed(2)}
              </strong>
              <span className="text-[9px] text-white/40">Desgaste, energia e setup</span>
            </div>

            {/* Custo da Tinta */}
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 space-y-0.5">
              <span className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1">
                <Droplet size={11} /> Tinta Estimada
              </span>
              <strong className="text-amber-300 font-mono text-sm block">
                R$ {simulationResults.custoTintaTotal.toFixed(2)}
              </strong>
              <span className="text-[9px] text-amber-200/60">
                ~{simulationResults.consumoTintaMl.toFixed(1)} ml de tinta
              </span>
            </div>
          </div>

          {/* Custo Total de Produção */}
          <div className="bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-500/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                Custo de Produção do Job
              </span>
              <span className="text-[10px] text-emerald-300/60">
                Máquina + Tinta para {areaFinalM2} m²
              </span>
            </div>
            <div className="text-right">
              <strong className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                R$ {simulationResults.custoTotalJob.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
