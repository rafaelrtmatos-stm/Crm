/**
 * Regra oficial de cálculo de tempo de impressão e perfis de velocidade da cabeça
 * 
 * Regra:
 * PERFIL + VELOCIDADE DA CABEÇA -> TEMPO PARA 10 M² -> ÁREA DO SERVIÇO -> TEMPO FINAL
 * 
 * Fórmula:
 * TEMPO FINAL = TEMPO PARA 10 M² × (ÁREA DO SERVIÇO ÷ 10)
 * 
 * Limites da velocidade da cabeça:
 * Mínimo: 250 mm/s
 * Máximo: 761 mm/s
 */

export type PerfilImpressao = 'high_quality' | 'standard' | 'high_speed';

/**
 * Tipo de mídia (substrato) selecionado no RIP.
 * Reflete os presets genéricos exibidos no software (ex: Generic Vinyl, Generic Banner).
 * Por ora é apenas informativo/organizacional na UI — não altera a fórmula de cálculo
 * de tempo, que depende somente de PERFIL + VELOCIDADE DA CABEÇA.
 */
export type TipoMidiaImpressao = 'generic_vinyl' | 'generic_banner';

export const TIPO_MIDIA_PADRAO: TipoMidiaImpressao = 'generic_vinyl';

export const TIPOS_MIDIA_CONFIG: Array<{ key: TipoMidiaImpressao; label: string }> = [
  { key: 'generic_vinyl', label: 'Generic Vinyl' },
  { key: 'generic_banner', label: 'Generic Banner' },
];

/**
 * Normaliza o tipo de mídia aceitando aliases (ex: vindos de integrações ou digitação livre)
 */
export function normalizarTipoMidia(tipoMidia?: string | null): TipoMidiaImpressao {
  if (!tipoMidia) return TIPO_MIDIA_PADRAO;
  const t = tipoMidia.toLowerCase().replace(/[-_]/g, '');
  if (t.includes('banner')) return 'generic_banner';
  if (t.includes('vinyl') || t.includes('vinil')) return 'generic_vinyl';
  return TIPO_MIDIA_PADRAO;
}

export interface PontoCalibracao {
  velocidade: number; // mm/s
  tempo10m2: number;  // minutos para 10 m²
}

export type TabelaCalibracaoPerfis = {
  [key in PerfilImpressao]: PontoCalibracao[];
};

export const VELOCIDADE_CABECA_MIN_MMS = 250;
export const VELOCIDADE_CABECA_MAX_MMS = 761;
export const VELOCIDADE_CABECA_PADRAO_MMS = 400;
export const AREA_REFERENCIA_M2 = 10;

/**
 * Tabela oficial de calibração para 10 m².
 * Em 400 mm/s:
 * - High Quality: 527 min
 * - Standard: 265 min
 * - High Speed: 132 min
 * 
 * Demais velocidades com calibração física linear interpolada.
 */
export const TABELA_CALIBRACAO_PADRAO: TabelaCalibracaoPerfis = {
  high_quality: [
    { velocidade: 250, tempo10m2: 865 },
    { velocidade: 300, tempo10m2: 716 },
    { velocidade: 350, tempo10m2: 612 },
    { velocidade: 400, tempo10m2: 527 },
    { velocidade: 500, tempo10m2: 398 },
    { velocidade: 600, tempo10m2: 338 },
    { velocidade: 700, tempo10m2: 294 },
    { velocidade: 761, tempo10m2: 274 },
  ],
  standard: [
    { velocidade: 250, tempo10m2: 435 },
    { velocidade: 300, tempo10m2: 360 },
    { velocidade: 350, tempo10m2: 308 },
    { velocidade: 400, tempo10m2: 265 },
    { velocidade: 500, tempo10m2: 200 },
    { velocidade: 600, tempo10m2: 170 },
    { velocidade: 700, tempo10m2: 148 },
    { velocidade: 761, tempo10m2: 138 },
  ],
  high_speed: [
    { velocidade: 250, tempo10m2: 217 },
    { velocidade: 300, tempo10m2: 179 },
    { velocidade: 350, tempo10m2: 153 },
    { velocidade: 400, tempo10m2: 132 },
    { velocidade: 500, tempo10m2: 100 },
    { velocidade: 600, tempo10m2: 85 },
    { velocidade: 700, tempo10m2: 74 },
    { velocidade: 761, tempo10m2: 69 },
  ],
};

/**
 * Normaliza e limita a velocidade da cabeça dentro dos limites (250 a 761 mm/s)
 */
export function normalizarVelocidadeCabeca(velocidade?: number | null): number {
  const v = Number(velocidade) || VELOCIDADE_CABECA_PADRAO_MMS;
  return Math.max(VELOCIDADE_CABECA_MIN_MMS, Math.min(VELOCIDADE_CABECA_MAX_MMS, Math.round(v)));
}

/**
 * Normaliza o perfil de impressão aceitando aliases
 */
export function normalizarPerfilImpressao(perfil?: string | null): PerfilImpressao {
  if (!perfil) return 'standard';
  const p = perfil.toLowerCase().replace(/[-_]/g, '');
  if (p.includes('highquality') || p.includes('qualidade') || p === 'hq') return 'high_quality';
  if (p.includes('highspeed') || p.includes('rapido') || p === 'hs') return 'high_speed';
  return 'standard';
}

/**
 * Obtém o tempo para 10 m² com base no perfil e velocidade da cabeça.
 * Realiza interpolação linear entre dois pontos cadastrados na tabela.
 */
export function obterTempo10M2PorVelocidade(
  perfil: PerfilImpressao,
  velocidade: number,
  tabelaPersonalizada?: Partial<TabelaCalibracaoPerfis> | null
): number {
  const vel = normalizarVelocidadeCabeca(velocidade);
  const perfilKey = normalizarPerfilImpressao(perfil);

  const tabela = tabelaPersonalizada?.[perfilKey]?.length
    ? tabelaPersonalizada[perfilKey]!
    : TABELA_CALIBRACAO_PADRAO[perfilKey];

  if (!tabela || tabela.length === 0) {
    return TABELA_CALIBRACAO_PADRAO.standard.find(p => p.velocidade === 400)?.tempo10m2 || 265;
  }

  // Ordena por velocidade crescente
  const pontos = [...tabela].sort((a, b) => a.velocidade - b.velocidade);

  // Se for menor ou igual ao menor ponto
  if (vel <= pontos[0].velocidade) {
    return pontos[0].tempo10m2;
  }

  // Se for maior ou igual ao maior ponto
  if (vel >= pontos[pontos.length - 1].velocidade) {
    return pontos[pontos.length - 1].tempo10m2;
  }

  // Interpolação linear entre os pontos adjacentes
  for (let i = 0; i < pontos.length - 1; i++) {
    const p0 = pontos[i];
    const p1 = pontos[i + 1];

    if (vel >= p0.velocidade && vel <= p1.velocidade) {
      if (p1.velocidade === p0.velocidade) return p0.tempo10m2;
      const proporcao = (vel - p0.velocidade) / (p1.velocidade - p0.velocidade);
      const tempo = p0.tempo10m2 + proporcao * (p1.tempo10m2 - p0.tempo10m2);
      return Math.round(tempo * 10) / 10;
    }
  }

  return 265;
}

export interface ResultadoCalculoTempo {
  perfil: PerfilImpressao;
  perfilNome: string;
  velocidadeCabecaMmS: number;
  tempo10M2Minutos: number;
  areaM2: number;
  tempoFinalMinutos: number;
  tempoFormatadoHoras: string; // Ex: "00h53min", "04h25min"
  velocidadeEfetivaM2H: number; // m²/h
  detalhesCalculo: string;
}

/**
 * Formata minutos em formato "00h00min" ou "Xh Ymin"
 */
export function formatarMinutosEmHoras(minutosTotais: number): string {
  if (minutosTotais <= 0) return '00h00min';
  const mins = Math.round(minutosTotais);
  const horas = Math.floor(mins / 60);
  const restoMin = mins % 60;
  return `${String(horas).padStart(2, '0')}h${String(restoMin).padStart(2, '0')}min`;
}

/**
 * FÓRMULA OFICIAL DE CÁLCULO DE TEMPO:
 * 1. tempo10m2 = obterTempo10M2PorVelocidade(perfil, velocidade)
 * 2. area = largura × altura (ou areaM2 informada)
 * 3. tempoFinal = tempo10m2 × (area ÷ 10)
 */
export function calcularTempoImpressao(
  areaM2: number,
  velocidadeCabecaMmS: number = VELOCIDADE_CABECA_PADRAO_MMS,
  perfil: PerfilImpressao | string = 'standard',
  tabelaPersonalizada?: Partial<TabelaCalibracaoPerfis> | null
): ResultadoCalculoTempo {
  const perfilKey = normalizarPerfilImpressao(perfil);
  const vel = normalizarVelocidadeCabeca(velocidadeCabecaMmS);
  const area = Math.max(0, Number(areaM2) || 0);

  const tempo10M2 = obterTempo10M2PorVelocidade(perfilKey, vel, tabelaPersonalizada);
  const tempoFinalMinutos = area > 0 ? tempo10M2 * (area / 10) : 0;
  const tempoArredondado = Math.round(tempoFinalMinutos * 10) / 10;

  const perfilNomes: Record<PerfilImpressao, string> = {
    high_quality: 'High Quality',
    standard: 'Standard',
    high_speed: 'High Speed',
  };

  const horas = tempoArredondado / 60;
  const velocidadeEfetivaM2H = horas > 0 && area > 0 ? Math.round((area / horas) * 100) / 100 : (10 / (tempo10M2 / 60));

  const detalhes = area > 0
    ? `${tempo10M2} min × (${area.toFixed(2)} m² ÷ 10) = ${Math.round(tempoArredondado)} min (${formatarMinutosEmHoras(tempoArredondado)})`
    : `10 m² = ${tempo10M2} min a ${vel} mm/s`;

  return {
    perfil: perfilKey,
    perfilNome: perfilNomes[perfilKey],
    velocidadeCabecaMmS: vel,
    tempo10M2Minutos: tempo10M2,
    areaM2: area,
    tempoFinalMinutos: tempoArredondado,
    tempoFormatadoHoras: formatarMinutosEmHoras(tempoArredondado),
    velocidadeEfetivaM2H: Math.round(velocidadeEfetivaM2H * 100) / 100,
    detalhesCalculo: detalhes,
  };
}

/**
 * Gera os dados calculados de velocidade de cabeça para armazenar em um ModoImpressaoConfig
 */
export function calcularDadosModoImpressao(
  perfil: PerfilImpressao | string = 'standard',
  velocidadeCabecaMmS: number = VELOCIDADE_CABECA_PADRAO_MMS,
  tabelaPersonalizada?: Partial<TabelaCalibracaoPerfis> | null
): {
  perfilTipo: PerfilImpressao;
  velocidadeCabecaMmS: number;
  tempo10m2Minutos: number;
  tempo10m2Formatado: string;
  velocidadeM2H: number;
} {
  const perfilKey = normalizarPerfilImpressao(perfil);
  const vel = normalizarVelocidadeCabeca(velocidadeCabecaMmS);
  const tempo10m2 = obterTempo10M2PorVelocidade(perfilKey, vel, tabelaPersonalizada);
  const horas10m2 = tempo10m2 / 60;
  const velM2H = horas10m2 > 0 ? Math.round((10 / horas10m2) * 10) / 10 : 12;

  return {
    perfilTipo: perfilKey,
    velocidadeCabecaMmS: vel,
    tempo10m2Minutos: tempo10m2,
    tempo10m2Formatado: formatarMinutosEmHoras(tempo10m2),
    velocidadeM2H: velM2H
  };
}

