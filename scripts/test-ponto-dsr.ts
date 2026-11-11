// Testes das regras de DSR semanal / falta parcial / feriado do ponto. Rodar: npm test
// (funções puras: não acessam Supabase; a gravação em ponto_dsr_semanal é só upsert por funcionário+semana).
import assert from 'node:assert/strict';
import { detectarAusenciaParcial, jornadaPadrao, minutosPrevistos, minutosTrabalhados, PontoJornada, PontoRegistro } from '../src/lib/pontoCalc';
import { analisarSemanaPonto, calcularSalarioPonto, minutosDiferencaSemanaBanco } from '../src/comissoes/utils/salarioPonto';
import { diaEspecial, diasEspeciaisDoAno, ehFeriado, pascoa, cadastrarDiasEspeciais } from '../src/lib/feriados';
import { distribuirBatidas } from '../src/lib/pontoImport';

let ok = 0;
const t = (nome: string, fn: () => void) => { fn(); ok++; console.log('  ok -', nome); };

const SAL = 3000; // diária = 100, hora = 3000/220
const TOL = 10;
const HOJE = '2026-10-30';
const SEMANA = '2026-10-10'; // sáb 10/10 a sex 16/10 (seg 12/10 = Nossa Senhora Aparecida, feriado)
const SEMANA2 = '2026-10-17'; // sáb 17/10 a sex 23/10 (sem feriado)

const jornadas: PontoJornada[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  dia_semana: d, trabalha: d !== 0,
  entrada: d !== 0 ? '08:00' : null, inicio_intervalo: d !== 0 ? '12:00' : null,
  fim_intervalo: d !== 0 ? '13:00' : null, saida: d !== 0 ? '17:00' : null, vigente_desde: '2026-01-01',
}));
const reg = (data: string, entrada: string | null, ini: string | null, fim: string | null, saida: string | null): PontoRegistro =>
  ({ funcionario_id: 'f1', data, entrada, inicio_intervalo: ini, fim_intervalo: fim, saida });
const diaCheio = (data: string) => reg(data, '08:00', '12:00', '13:00', '17:00');
const semanaCheiaExceto = (inicio: string, exceto: string[], extras: PontoRegistro[] = []) => {
  const regs: PontoRegistro[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(new Date(inicio + 'T12:00:00').getTime() + i * 86400000).toISOString().split('T')[0];
    const dow = new Date(d + 'T12:00:00').getDay();
    if (dow !== 0 && !exceto.includes(d)) regs.push(diaCheio(d));
  }
  return [...regs, ...extras];
};
const calc = (inicio: string, regs: PontoRegistro[], descontarDSR?: boolean | null) => {
  const dias = analisarSemanaPonto(inicio, regs, jornadas, TOL, HOJE);
  return { dias, r: calcularSalarioPonto({ salarioMensal: SAL, tolerancia: TOL, dias: dias.map((d) => d.dia), destinacao: 'pagar', descontarDSR }) };
};

console.log('Falta de dia inteiro');
t('falta injustificada desconta 1 diária de DSR (automático)', () => {
  const { r } = calc(SEMANA2, semanaCheiaExceto(SEMANA2, ['2026-10-20']));
  assert.equal(r.faltas, 1); assert.equal(r.dsrAplicavel, true); assert.equal(r.dsrDesconta, true); assert.equal(r.descontoDSR, 100);
});
t('várias faltas na mesma semana: DSR descontado uma única vez', () => {
  const { r } = calc(SEMANA2, semanaCheiaExceto(SEMANA2, ['2026-10-19', '2026-10-20', '2026-10-21']));
  assert.equal(r.faltas, 3); assert.equal(r.descontoDSR, 100);
});
t('sem falta: nenhum DSR descontado, mesmo com decisão "descontar" salva', () => {
  const { r } = calc(SEMANA2, semanaCheiaExceto(SEMANA2, []), true);
  assert.equal(r.faltas + r.faltasParciais, 0); assert.equal(r.dsrAplicavel, false); assert.equal(r.descontoDSR, 0);
});

console.log('Ativar/desativar');
t('desativado: falta continua registrada, DSR não é descontado e o total sobe 1 diária', () => {
  const regs = semanaCheiaExceto(SEMANA2, ['2026-10-20']);
  const on = calc(SEMANA2, regs, true).r, off = calc(SEMANA2, regs, false).r;
  assert.equal(off.faltas, 1); assert.equal(off.dsrAplicavel, true); assert.equal(off.dsrDesconta, false); assert.equal(off.descontoDSR, 0);
  assert.ok(Math.abs(off.base - on.base - 100) < 1e-9);
});
t('ativado explicitamente = mesmo resultado do automático', () => {
  const regs = semanaCheiaExceto(SEMANA2, ['2026-10-20']);
  assert.equal(calc(SEMANA2, regs, true).r.base, calc(SEMANA2, regs, null).r.base);
});
t('decisão de uma semana não altera outra (cada semana usa só a sua decisão)', () => {
  const regs = semanaCheiaExceto(SEMANA2, ['2026-10-20']);
  const semana1 = calc(SEMANA2, regs, false).r; // desativada nesta semana
  const outra = calc('2026-10-24', semanaCheiaExceto('2026-10-24', ['2026-10-27']), null).r; // outra semana, sem decisão
  assert.equal(semana1.descontoDSR, 0); assert.equal(outra.descontoDSR, 100);
});

console.log('Feriado');
t('feriado oficial sem batida: abonado, sem falta e sem DSR', () => {
  const { dias, r } = calc(SEMANA, semanaCheiaExceto(SEMANA, ['2026-10-12']));
  const fer = dias.find((d) => d.data === '2026-10-12')!;
  assert.equal(fer.dia.falta, false); assert.equal(fer.dia.faltaParcial, null);
  assert.equal(r.faltas, 0); assert.equal(r.dsrAplicavel, false); assert.equal(r.descontoDSR, 0); assert.equal(r.extras.feriadosAbonados, 1);
});
t('feriado trabalhado mantém a regra atual (adicional) e não gera DSR', () => {
  const { r } = calc(SEMANA, semanaCheiaExceto(SEMANA, []));
  assert.equal(r.extras.feriadosTrabalhados, 1); assert.ok(r.valorFeriadosPago > 0); assert.equal(r.descontoDSR, 0);
});
t('feriado com só a manhã trabalhada não vira falta parcial', () => {
  const { dias, r } = calc(SEMANA, semanaCheiaExceto(SEMANA, ['2026-10-12'], [reg('2026-10-12', null, null, '13:00', '17:00')]));
  assert.equal(dias.find((d) => d.data === '2026-10-12')!.dia.faltaParcial, null); assert.equal(r.descontoDSR, 0);
});
t('feriado não mascara falta real de outro dia da semana', () => {
  const { r } = calc(SEMANA, semanaCheiaExceto(SEMANA, ['2026-10-12', '2026-10-14']));
  assert.equal(r.faltas, 1); assert.equal(r.descontoDSR, 100);
});

console.log('Falta parcial');
const parcial = (e: string | null, i: string | null, f: string | null, s: string | null, data = '2026-10-20') =>
  detectarAusenciaParcial(reg(data, e, i, f, s), jornadas[2], data, HOJE, TOL);
t('só tarde batida (sem entrada nem ida ao intervalo) = falta da manhã', () => assert.equal(parcial(null, null, '13:00', '17:00'), 'manha'));
t('chegou só depois do fim da manhã (12:50) = falta da manhã', () => assert.equal(parcial('12:50', null, null, '17:00'), 'manha'));
t('atraso comum NÃO é falta de manhã (09:30 e 11:40)', () => {
  assert.equal(parcial('09:30', '12:00', '13:00', '17:00'), null);
  assert.equal(parcial('11:40', '12:00', '13:00', '17:00'), null);
});
t('atraso na volta do almoço NÃO é falta', () => assert.equal(parcial('08:00', '12:00', '14:30', '17:00'), null));
t('só manhã (saiu no horário do almoço e não voltou) = falta da tarde', () => assert.equal(parcial('08:00', null, null, '12:00'), 'tarde'));
t('batida esquecida (entrada + ida ao intervalo, nada depois) fica como pendência, não falta', () => assert.equal(parcial('08:00', '12:00', null, null), null));
t('saída antecipada à tarde (15:00) não é falta de período', () => assert.equal(parcial('08:00', '12:00', '13:00', '15:00'), null));
t('dia sem nenhuma batida não é parcial (é falta do dia inteiro)', () => assert.equal(detectarAusenciaParcial(undefined, jornadas[2], '2026-10-20', HOJE, TOL), null));
t('jornada sem almoço não tem dois períodos', () => {
  const j = { ...jornadas[6], entrada: '08:30', inicio_intervalo: null, fim_intervalo: null, saida: '12:30' };
  assert.equal(detectarAusenciaParcial(reg('2026-10-24', '09:00', null, null, '12:30'), j, '2026-10-24', HOJE, TOL), null);
});
t('dia futuro e dia anterior ao início do ponto não geram falta parcial', () => {
  assert.equal(detectarAusenciaParcial(reg('2026-11-10', null, null, '13:00', '17:00'), jornadas[2], '2026-11-10', HOJE, TOL), null);
  assert.equal(detectarAusenciaParcial(reg('2026-09-29', null, null, '13:00', '17:00'), jornadas[2], '2026-09-29', HOJE, TOL), null);
});
t('falta da manhã permite descontar o DSR da semana, uma vez só', () => {
  const regs = semanaCheiaExceto(SEMANA2, ['2026-10-20'], [reg('2026-10-20', null, null, '13:00', '17:00')]);
  const { dias, r } = calc(SEMANA2, regs);
  assert.equal(dias.find((d) => d.data === '2026-10-20')!.dia.faltaParcial, 'manha');
  assert.equal(r.faltas, 0); assert.equal(r.faltasParciais, 1); assert.equal(r.descontoDSR, 100);
  assert.equal(calc(SEMANA2, regs, false).r.descontoDSR, 0);
});
t('falta parcial + falta de dia inteiro na mesma semana = um único DSR', () => {
  const regs = semanaCheiaExceto(SEMANA2, ['2026-10-20', '2026-10-21'], [reg('2026-10-20', null, null, '13:00', '17:00')]);
  const { r } = calc(SEMANA2, regs);
  assert.equal(r.faltas, 1); assert.equal(r.faltasParciais, 1); assert.equal(r.descontoDSR, 100);
});
t('atraso sozinho não ativa DSR', () => {
  const { r } = calc(SEMANA2, semanaCheiaExceto(SEMANA2, ['2026-10-20'], [reg('2026-10-20', '10:30', '12:00', '13:00', '17:00')]));
  assert.equal(r.dsrAplicavel, false); assert.equal(r.descontoDSR, 0);
});

console.log('Calendário de feriados (Santarém/PA)');
t('datas móveis de 2026 a partir da Páscoa (05/04)', () => {
  assert.equal(pascoa(2026), '2026-04-05');
  assert.equal(diaEspecial('2026-04-03')?.tipo, 'feriado'); // Sexta-feira Santa
  assert.equal(diaEspecial('2026-02-16')?.tipo, 'facultativo'); // Carnaval
  assert.equal(diaEspecial('2026-06-04')?.tipo, 'facultativo'); // Corpus Christi
});
t('feriados estadual e municipal de Santarém/PA', () => {
  assert.equal(diaEspecial('2026-06-22')?.tipo, 'feriado');
  assert.equal(diaEspecial('2026-08-15')?.tipo, 'feriado');
});
t('24/12 e 31/12 são facultativos após as 14h, sem dobra', () => {
  for (const d of ['2026-12-24', '2026-12-31']) {
    const e = diaEspecial(d);
    assert.equal(e?.tipo, 'facultativo'); assert.equal(e?.apartirDe, '14:00'); assert.equal(ehFeriado(d), false);
  }
  assert.equal(diaEspecial('2026-12-25')?.tipo, 'feriado');
});
t('02/10 e 08/12 não são presumidos como feriado oficial', () => {
  assert.equal(diaEspecial('2026-10-02'), null); assert.equal(diaEspecial('2026-12-08'), null);
});
t('cadastro futuro: feriado/facultativo/folga abonada entram e prevalecem na data', () => {
  cadastrarDiasEspeciais([
    { data: '2026-12-08', nome: 'Nossa Senhora da Conceição', tipo: 'feriado' },
    { data: '2027-03-10', nome: 'Folga da equipe', tipo: 'folga_abonada' },
    { data: '2026-12-24', nome: 'Véspera de Natal', tipo: 'facultativo', apartirDe: '12:00' },
    { data: 'inválida', nome: 'x', tipo: 'feriado' },
  ]);
  assert.equal(ehFeriado('2026-12-08'), true);
  assert.equal(diaEspecial('2027-03-10')?.tipo, 'folga_abonada'); assert.equal(ehFeriado('2027-03-10'), false);
  assert.equal(diaEspecial('2026-12-24')?.apartirDe, '12:00');
  assert.equal(diasEspeciaisDoAno(2026).filter((d) => d.data === '2026-12-24').length, 1);
  cadastrarDiasEspeciais([]);
  assert.equal(diaEspecial('2026-12-08'), null);
});
t('facultativo sem dobra: semana 19-25/12 só dobra o Natal (24/12 trabalhado não conta)', () => {
  const { r } = calc('2026-12-19', semanaCheiaExceto('2026-12-19', []));
  assert.equal(r.extras.feriadosTrabalhados, 1);
});

console.log('Importação de batidas da tarde');
const jornadaArlisson: PontoJornada = {
  dia_semana: 2, trabalha: true, entrada: '08:30', inicio_intervalo: '12:00',
  fim_intervalo: '14:00', saida: '18:30', vigente_desde: '2026-10-13',
};
t('primeira batida às 14h é retorno da tarde, não entrada', () => {
  const r = distribuirBatidas(['14:00:24'], jornadaArlisson);
  assert.equal(r.entrada, null); assert.equal(r.fim_intervalo, '14:00:24');
});
t('duas batidas após início da tarde ficam em retorno e saída', () => {
  const r = distribuirBatidas(['14:17:42', '18:59:39'], jornadaArlisson);
  assert.equal(r.entrada, null); assert.equal(r.fim_intervalo, '14:17:42'); assert.equal(r.saida, '18:59:39');
});

console.log('Jornada de 44h e banco sem débito automático');
t('jornada padrão de novo funcionário totaliza 44 horas semanais', () => {
  const padrao = jornadaPadrao().map((j) => ({ ...j, vigente_desde: '2000-01-01' }));
  assert.equal(padrao.reduce((s, j) => s + minutosPrevistos(j), 0), 44 * 60);
});
const jornada44: PontoJornada = {
  dia_semana: 2, trabalha: true, entrada: '08:00', inicio_intervalo: '12:00',
  fim_intervalo: '14:00', saida: '18:00', vigente_desde: '2026-01-01',
};
t('entrada às 13h é reconhecida como falta da manhã', () => {
  const r = reg('2026-10-20', '13:00', null, null, '18:00');
  assert.equal(detectarAusenciaParcial(r, jornada44, r.data, HOJE, TOL), 'manha');
  assert.equal(minutosTrabalhados(r), 300);
});
t('entrada às 13h30 é reconhecida como falta da manhã', () => {
  const r = reg('2026-10-20', '13:30', null, null, '18:00');
  assert.equal(detectarAusenciaParcial(r, jornada44, r.data, HOJE, TOL), 'manha');
  assert.equal(minutosTrabalhados(r), 270);
});
t('déficit por falta parcial não vira débito automático no banco', () => {
  const dia = {
    data: '2026-10-20', trabalhados: 300, previstos: 480, extra: 0,
    falta: false, faltaParcial: 'manha' as const, jornadaTrabalha: true,
  };
  assert.equal(minutosDiferencaSemanaBanco([dia], 'folga', TOL, HOJE), 0);
});
console.log(`\n${ok} testes passaram`);
