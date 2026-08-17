/**
 * ⚠️  CORRECÃO: Cálculo de Comissão Semanal
 * 
 * PROBLEMA IDENTIFICADO:
 * ❌ Estava: 85,45 (positivo) + 400 = 485,45
 * ✅ Correto: -85,45 (negativo) + 400 = 314,55
 * 
 * O SALDO DO CAIXA DEVE VIR COM SINAL CORRETO:
 * - Positivo (+): Colaborador tem a receber
 * - Negativo (-): Colaborador está devendo
 */

/**
 * IMPORTANTE: Ao buscar o saldo do caixa do banco/API:
 * 
 * Se o caixa show "Deve: 85,45" → passar como -85,45
 * Se o caixa show "A receber: 200,00" → passar como +200,00
 * 
 * NÃO adicione o sinal em JavaScript — venha correto do banco!
 */

export function corrigirSaldoParaCalculo(saldoDisplay: string | number, isDeve: boolean): number {
  const valor = typeof saldoDisplay === 'string' 
    ? parseFloat(saldoDisplay.replace(/[^\d.-]/g, ''))
    : saldoDisplay;
  
  return isDeve ? -Math.abs(valor) : Math.abs(valor);
}

/**
 * EXEMPLO DE USO CORRETO:
 * 
 * const caixa = await fetchCaixaSemanal(colaboradorId, semana);
 * // caixa retorna: { valor: 85.45, tipo: 'deve' }
 * 
 * // Corrigir o saldo
 * const saldoCorreto = caixa.tipo === 'deve' ? -caixa.valor : caixa.valor;
 * 
 * // Calcular comissão
 * const total = salarioBase + saldoCorreto;
 * // 400 + (-85.45) = 314.55 ✅
 */

/**
 * FILTRO DE PERÍODO - DEVE VIR "ESTA SEMANA" POR PADRÃO
 * 
 * Em DescontosView.tsx, encontre:
 * const [dateRange, setDateRange] = useState('month');  // ❌ ERRADO
 * 
 * E mude para:
 * const [dateRange, setDateRange] = useState('week');   // ✅ CORRETO
 * 
 * Ou se usar semana numerada:
 * const semanas = getSemanasProximas(4);
 * const [selectedWeek, setSelectedWeek] = useState(semanas[0]); // ✅ semana[0] = esta semana
 */

export const CORRECOES_APLICAR = {
  filtro_periodo: {
    antes: "const [dateRange, setDateRange] = useState('month');",
    depois: "const [dateRange, setDateRange] = useState('week');",
    onde: "src/comissoes/components/DescontosView.tsx",
    linha: "procure por dateRange"
  },
  
  calculo_saldo: {
    antes: "const saldoCaixa = caixa.valor; // 85,45",
    depois: "const saldoCaixa = caixa.tipo === 'deve' ? -caixa.valor : caixa.valor; // -85,45",
    onde: "Onde busca o saldo do caixa",
    resultado: "400 + (-85,45) = 314,55 ✅"
  }
};

