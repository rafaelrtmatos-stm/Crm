// Salário do Caixa para quem usa ponto eletrônico: o MESMO valor do Meu Ponto da SEMANA ANTERIOR
// (o salário é pago em atraso: Caixa 10/10 a 16/10 = ponto de 03/10 a 09/10).
// Devolve null quando não se aplica (sem ponto, modalidade meta ou semana anterior ao início do ponto): aí o Caixa
// segue com o salário fixo. O cálculo e a regra do período ficam em `pontoSalario.ts` / `salarioPonto.ts`.
import { calcularPontoSalarioDoCiclo } from './pontoSalario';

export async function getBasePontoDaSemana(
  colaboradorId: string,
  semanaInicio: string,
  semanaFim: string
): Promise<number | null> {
  const r = await calcularPontoSalarioDoCiclo(colaboradorId, semanaInicio, semanaFim);
  return r ? Number(r.base.toFixed(2)) : null;
}
