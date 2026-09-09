import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Gauge, Clock, ChevronUp, ChevronDown, Info, Zap, Settings2 } from 'lucide-react';
import {
  PerfilImpressao,
  TipoMidiaImpressao,
  VELOCIDADE_CABECA_MIN_MMS,
  VELOCIDADE_CABECA_MAX_MMS,
  VELOCIDADE_CABECA_PADRAO_MMS,
  TIPOS_MIDIA_CONFIG,
  TabelaCalibracaoPerfis,
  obterTempo10M2PorVelocidade,
  calcularTempoImpressao,
  ResultadoCalculoTempo,
  normalizarPerfilImpressao,
  normalizarTipoMidia,
  normalizarVelocidadeCabeca,
  formatarMinutosEmHoras
} from '../lib/calculoTempoImpressao';

interface CardVelocidadeCabecaProps {
  perfil: PerfilImpressao | string;
  onPerfilChange: (perfil: PerfilImpressao) => void;
  tipoMidia?: TipoMidiaImpressao | string;
  onTipoMidiaChange?: (tipoMidia: TipoMidiaImpressao) => void;
  velocidadeCabeca: number;
  onVelocidadeChange: (velocidade: number) => void;
  ignorarPredefinicoes?: boolean;
  onIgnorarPredefinicoesChange?: (ignorar: boolean) => void;
  areaM2?: number;
  larguraM?: number;
  alturaM?: number;
  tabelaPersonalizada?: Partial<TabelaCalibracaoPerfis> | null;
  onTempoCalculado?: (resultado: ResultadoCalculoTempo) => void;
  mostrarCalculoArea?: boolean;
  className?: string;
  modoCompacto?: boolean;
  onSalvarModoNaMaquina?: (dadosModo: {
    perfil: PerfilImpressao;
    velocidadeCabeca: number;
    tempo10m2Minutos: number;
    tempo10m2Formatado: string;
    velocidadeM2H: number;
    ignorarPredefinicoes: boolean;
  }) => void;
  salvarModoBotaoTexto?: string;
}

export const CardVelocidadeCabeca: React.FC<CardVelocidadeCabecaProps> = ({
  perfil,
  onPerfilChange,
  tipoMidia: propTipoMidia,
  onTipoMidiaChange,
  velocidadeCabeca,
  onVelocidadeChange,
  ignorarPredefinicoes: propIgnorarPredefinicoes,
  onIgnorarPredefinicoesChange,
  areaM2 = 0,
  larguraM,
  alturaM,
  tabelaPersonalizada,
  onTempoCalculado,
  mostrarCalculoArea = true,
  className = '',
  modoCompacto = false,
  onSalvarModoNaMaquina,
  salvarModoBotaoTexto
}) => {
  // Controle interno de "Ignorar predefinições" se não fornecido via prop
  const [internalIgnorar, setInternalIgnorar] = useState(false);
  const ignorarPredefinicoes = propIgnorarPredefinicoes !== undefined ? propIgnorarPredefinicoes : internalIgnorar;

  // Controle interno do tipo de mídia (Generic Vinyl / Generic Banner) se não fornecido via prop
  const [internalTipoMidia, setInternalTipoMidia] = useState<TipoMidiaImpressao>(normalizarTipoMidia(propTipoMidia));
  const tipoMidiaAtual = normalizarTipoMidia(propTipoMidia !== undefined ? propTipoMidia : internalTipoMidia);

  const handleTipoMidiaChange = (tipo: TipoMidiaImpressao) => {
    if (onTipoMidiaChange) {
      onTipoMidiaChange(tipo);
    } else {
      setInternalTipoMidia(tipo);
    }
  };

  // Ref do input para foco automático ao ativar checkbox
  const inputRef = useRef<HTMLInputElement>(null);

  // Estado de texto local para permitir digitação livre (ex: "", "3", "30", "301", "330") sem interferência imediata do clamp
  const [inputVelText, setInputVelText] = useState<string>(String(velocidadeCabeca || VELOCIDADE_CABECA_PADRAO_MMS));

  // Sincroniza o texto caso a prop externa mude (ex: presets, troca de máquina ou reset)
  useEffect(() => {
    if (typeof velocidadeCabeca === 'number' && !isNaN(velocidadeCabeca)) {
      setInputVelText(String(velocidadeCabeca));
    }
  }, [velocidadeCabeca]);

  const setIgnorar = (val: boolean) => {
    if (onIgnorarPredefinicoesChange) {
      onIgnorarPredefinicoesChange(val);
    } else {
      setInternalIgnorar(val);
    }
    // Se desmarcou "Ignorar predefinições", volta para a velocidade padrão (400 mm/s)
    if (!val) {
      setInputVelText(String(VELOCIDADE_CABECA_PADRAO_MMS));
      onVelocidadeChange(VELOCIDADE_CABECA_PADRAO_MMS);
    } else {
      // Se marcou, foca e seleciona todo o texto para o usuário digitar diretamente qualquer valor (ex: 301, 330)
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 60);
    }
  };

  const perfilAtual = normalizarPerfilImpressao(perfil);
  const velAtual = normalizarVelocidadeCabeca(velocidadeCabeca);

  // Calcula os tempos para 10 m² de cada um dos 3 perfis na velocidade atual
  const tempos10M2PorPerfil = useMemo(() => {
    return {
      high_quality: Math.round(obterTempo10M2PorVelocidade('high_quality', velAtual, tabelaPersonalizada)),
      standard: Math.round(obterTempo10M2PorVelocidade('standard', velAtual, tabelaPersonalizada)),
      high_speed: Math.round(obterTempo10M2PorVelocidade('high_speed', velAtual, tabelaPersonalizada)),
    };
  }, [velAtual, tabelaPersonalizada]);

  // Resultado completo do cálculo para a área do serviço
  const resultado = useMemo(() => {
    return calcularTempoImpressao(areaM2, velAtual, perfilAtual, tabelaPersonalizada);
  }, [areaM2, velAtual, perfilAtual, tabelaPersonalizada]);

  // Notifica o componente pai sobre o resultado do cálculo
  useEffect(() => {
    if (onTempoCalculado) {
      onTempoCalculado(resultado);
    }
  }, [resultado, onTempoCalculado]);

  const handleStepVelocidade = (delta: number) => {
    if (!ignorarPredefinicoes) return;
    const currentVal = parseInt(inputVelText, 10) || velAtual;
    const novaVel = Math.min(Math.max(currentVal + delta, VELOCIDADE_CABECA_MIN_MMS), VELOCIDADE_CABECA_MAX_MMS);
    setInputVelText(String(novaVel));
    onVelocidadeChange(novaVel);
  };

  const perfisConfig: Array<{ key: PerfilImpressao; label: string }> = [
    { key: 'high_quality', label: 'High Quality' },
    { key: 'standard', label: 'Standard' },
    { key: 'high_speed', label: 'High Speed' },
  ];

  const atalhosVelocidade = [250, 300, 400, 500, 600, 700, 761];

  return (
    <div
      id="card-velocidade-cabeca-impressao"
      className={`rounded-2xl border transition-all ${
        modoCompacto ? 'p-3 text-xs' : 'p-4'
      } bg-slate-900/95 border-cyan-500/30 shadow-lg text-slate-100 ${className}`}
    >
      {/* Cabeçalho de identificação visual técnico / RIP */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Gauge size={16} />
          </div>
          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-cyan-300 block">
              Configuração de Cabeça & Perfil (RIP)
            </span>
            <span className="text-[10px] text-white/50">
              {areaM2 > 0 ? (
                <>
                  Cálculo baseado nas dimensões do card acima:{' '}
                  <strong className="text-cyan-300 font-mono">
                    {larguraM && alturaM ? `${larguraM.toFixed(2)}m × ${alturaM.toFixed(2)}m = ` : ''}
                    {areaM2.toFixed(2)} m²
                  </strong>
                </>
              ) : (
                'Cálculo baseado na área padrão de 10 m² (informe largura e altura acima)'
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
            areaM2 > 0
              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 shadow-sm'
              : 'bg-slate-800 text-white/50 border-white/10'
          }`}>
            Base: {areaM2 > 0 ? `${areaM2.toFixed(2)} m²` : '10 m² (Ref.)'}
          </span>
        </div>
      </div>

      {/* BLOCO ESTILO DO SOFTWARE (como na imagem enviada) */}
      <div className="bg-slate-950/80 border border-white/15 rounded-xl p-3.5 space-y-3 shadow-inner">
        {/* 0. SELEÇÃO DE TIPO DE MÍDIA (SUBSTRATO) */}
        <div className="space-y-1.5 pb-2 border-b border-white/10">
          <span className="text-xs font-semibold text-white/80 select-none">
            Tipo de mídia :
          </span>
          <div className="flex flex-wrap items-center gap-1.5 pl-2 sm:pl-4">
            {TIPOS_MIDIA_CONFIG.map(({ key, label }) => {
              const isSelected = tipoMidiaAtual === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTipoMidiaChange(key)}
                  title={`Perfil de mídia RIP: ${label}`}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all select-none ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-400/50 text-white font-bold shadow-sm'
                      : 'border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. SELEÇÃO DE QUALIDADE DE IMPRESSÃO */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/80 select-none">
              Qualid. impr. :
            </span>
            <span className="text-[10px] text-cyan-300/90 font-mono font-bold">
              {areaM2 > 0 ? `(Tempo para ${areaM2.toFixed(2)} m²)` : '(Tempo para 10 m² ref.)'}
            </span>
          </div>

          <div className="space-y-1.5 pl-2 sm:pl-4">
            {perfisConfig.map(({ key, label }) => {
              const isSelected = perfilAtual === key;
              const tempo10m2 = tempos10M2PorPerfil[key];
              const tempoCalculadoMin = areaM2 > 0 ? (tempo10m2 * areaM2) / 10 : tempo10m2;

              let tempoExibido = '';
              if (tempoCalculadoMin <= 0) {
                tempoExibido = '0 min';
              } else if (tempoCalculadoMin < 1) {
                tempoExibido = `${tempoCalculadoMin.toFixed(1)} min`;
              } else {
                const totalMin = Math.round(tempoCalculadoMin);
                if (totalMin >= 60) {
                  tempoExibido = `${totalMin} min (${formatarMinutosEmHoras(totalMin)})`;
                } else {
                  tempoExibido = `${totalMin} min`;
                }
              }

              return (
                <label
                  key={key}
                  className={`flex items-center justify-between p-1.5 sm:px-3 rounded-lg cursor-pointer transition-all border select-none ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-400/50 text-white font-bold shadow-sm'
                      : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                  title={areaM2 > 0 ? `Tempo para ${areaM2.toFixed(2)} m²: ${tempoExibido} • Referência 10 m²: ${tempo10m2} min` : `Referência de 10 m²: ${tempo10m2} min`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="perfil_impressao_radio"
                      checked={isSelected}
                      onChange={() => onPerfilChange(key)}
                      className="w-3.5 h-3.5 text-cyan-500 bg-slate-900 border-white/30 focus:ring-cyan-400 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm font-medium tracking-wide">
                      {label}
                    </span>
                  </div>

                  {/* Tempo calculado baseado na área real do card superior */}
                  <div className="text-right">
                    <span className={`font-mono text-xs sm:text-sm font-bold ${isSelected ? 'text-cyan-300' : 'text-white/60'}`}>
                      ({tempoExibido})
                    </span>
                    {areaM2 > 0 && (
                      <span className="text-[9px] text-white/30 block font-mono">
                        ref. 10m²: {tempo10m2}m
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* 2. QUADRO INFERIOR COM CHECKBOX E VELOCIDADE DA CABEÇA */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          {/* Checkbox "Ignorar predefinições" */}
          <label className="flex items-center gap-2 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              id="checkbox-ignorar-predefinicoes"
              checked={ignorarPredefinicoes}
              onChange={(e) => setIgnorar(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-900 border-white/30 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-xs font-semibold text-white/90">
              Ignorar predefinições
            </span>
          </label>

          {/* Campo "Vel. cabeça : [ 400 ] mm/seg." */}
          <div className="pl-4 sm:pl-6 space-y-2">
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-medium whitespace-nowrap select-none transition-colors ${
                  ignorarPredefinicoes ? 'text-white' : 'text-white/40'
                }`}
              >
                Vel. cabeça :
              </span>

              {/* Input com spinner como na imagem */}
              <div className="relative inline-flex items-center">
                <input
                  ref={inputRef}
                  type="number"
                  id="input-velocidade-cabeca-mms"
                  disabled={!ignorarPredefinicoes}
                  min={VELOCIDADE_CABECA_MIN_MMS}
                  max={VELOCIDADE_CABECA_MAX_MMS}
                  step={1}
                  value={ignorarPredefinicoes ? inputVelText : velAtual}
                  onChange={(e) => {
                    const text = e.target.value;
                    setInputVelText(text);

                    if (text.trim() === '') return;
                    const parsed = parseInt(text, 10);
                    // Se o usuário digitou um número válido dentro dos limites (ex: 301, 330), calcula na mesma hora!
                    if (!isNaN(parsed) && parsed >= VELOCIDADE_CABECA_MIN_MMS && parsed <= VELOCIDADE_CABECA_MAX_MMS) {
                      onVelocidadeChange(parsed);
                    }
                  }}
                  onBlur={() => {
                    let parsed = parseInt(inputVelText, 10);
                    if (isNaN(parsed) || parsed < VELOCIDADE_CABECA_MIN_MMS) {
                      parsed = VELOCIDADE_CABECA_MIN_MMS;
                    } else if (parsed > VELOCIDADE_CABECA_MAX_MMS) {
                      parsed = VELOCIDADE_CABECA_MAX_MMS;
                    }
                    setInputVelText(String(parsed));
                    onVelocidadeChange(parsed);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className={`w-24 sm:w-28 rounded-lg px-2.5 py-1.5 font-mono text-sm font-black border text-center transition-all shadow-inner focus:outline-none ${
                    ignorarPredefinicoes
                      ? 'bg-slate-900 text-cyan-200 border-cyan-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/40'
                      : 'bg-slate-950 text-white/40 border-white/10 cursor-not-allowed select-none opacity-60'
                  }`}
                />

                {/* Botõezinhos Up/Down integrados ao spinner */}
                {ignorarPredefinicoes && (
                  <div className="flex flex-col ml-1 border border-white/15 rounded bg-slate-800 overflow-hidden shadow">
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleStepVelocidade(10)}
                      disabled={(parseInt(inputVelText, 10) || velAtual) >= VELOCIDADE_CABECA_MAX_MMS}
                      className="px-1.5 py-0.5 hover:bg-cyan-500/30 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Aumentar velocidade (+10 mm/s)"
                    >
                      <ChevronUp size={10} />
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleStepVelocidade(-10)}
                      disabled={(parseInt(inputVelText, 10) || velAtual) <= VELOCIDADE_CABECA_MIN_MMS}
                      className="px-1.5 py-0.5 border-t border-white/10 hover:bg-cyan-500/30 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Diminuir velocidade (-10 mm/s)"
                    >
                      <ChevronDown size={10} />
                    </button>
                  </div>
                )}

                <span
                  className={`ml-2 text-xs font-mono select-none transition-colors ${
                    ignorarPredefinicoes ? 'text-white/80' : 'text-white/30'
                  }`}
                >
                  mm/seg.
                </span>
              </div>
            </div>

            {/* Atalhos rápidos de velocidade liberados quando "Ignorar predefinições" estiver ativo */}
            {ignorarPredefinicoes ? (
              <div className="pt-1.5 flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-cyan-300 font-bold uppercase mr-1">
                  Atalhos:
                </span>
                {atalhosVelocidade.map((vel) => (
                  <button
                    key={vel}
                    type="button"
                    onClick={() => {
                      setInputVelText(String(vel));
                      onVelocidadeChange(vel);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                      velAtual === vel
                        ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-sm'
                        : 'bg-black/30 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {vel === 400 ? '400 (Padrão)' : `${vel}`}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-white/40 italic">
                A velocidade padrão ({VELOCIDADE_CABECA_PADRAO_MMS} mm/seg.) está ativa. Marque a caixa acima para personalizar livremente ({VELOCIDADE_CABECA_MIN_MMS} a {VELOCIDADE_CABECA_MAX_MMS} mm/s).
              </p>
            )}

            {/* Ação de salvar este cálculo como modo na máquina */}
            {onSalvarModoNaMaquina && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                <div className="text-[10px] font-mono text-white/60">
                  <span>Ref: </span>
                  <strong className="text-amber-300">{resultado.tempo10M2Minutos} min p/ 10m²</strong>
                  <span className="text-white/40"> ({resultado.tempoFormatadoHoras})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSalvarModoNaMaquina({
                      perfil: perfilAtual,
                      velocidadeCabeca: velAtual,
                      tempo10m2Minutos: resultado.tempo10M2Minutos,
                      tempo10m2Formatado: resultado.tempoFormatadoHoras,
                      velocidadeM2H: Number(resultado.velocidadeEfetivaM2H.toFixed(2)),
                      ignorarPredefinicoes: !!ignorarPredefinicoes
                    });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Salva este cálculo como predefinição na tabela de modos da máquina"
                >
                  <Zap size={11} className="text-cyan-400" />
                  <span>{salvarModoBotaoTexto || `Salvar Modo (${velAtual} mm/s) na Máquina`}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. RESUMO DO CÁLCULO PROPORCIONAL À ÁREA DO SERVIÇO */}
      {mostrarCalculoArea && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-black/40 border border-cyan-500/20 rounded-xl p-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-white/80">
                <Clock size={14} className="text-cyan-400 shrink-0" />
                <span>
                  Tempo estimado para {areaM2 > 0 ? `${areaM2.toFixed(2)} m²` : 'o serviço'}:
                </span>
                {larguraM && alturaM && (
                  <span className="text-[11px] text-white/50 font-mono">
                    ({larguraM}m × {alturaM}m)
                  </span>
                )}
              </div>
              <div className="text-[10px] text-white/50 font-mono">
                {resultado.tempo10M2Minutos} min para 10 m² × ({areaM2.toFixed(2)} m² ÷ 10)
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-lg sm:text-xl font-black font-mono text-cyan-300">
                {resultado.tempoFinalMinutos > 0 ? (
                  <>
                    {Math.round(resultado.tempoFinalMinutos)} min
                    <span className="text-xs text-white/60 font-normal ml-1">
                      ({resultado.tempoFormatadoHoras})
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-white/40">Informe as dimensões</span>
                )}
              </div>
              <div className="text-[10px] font-mono text-emerald-400 font-semibold">
                ~{resultado.velocidadeEfetivaM2H.toFixed(2)} m²/h calculada
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
