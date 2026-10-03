import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Filter,
  Target,
} from 'lucide-react';
import { ServiceItem, UserSettings, SummaryStats } from '../types';
import { formatCurrency, formatDateBR, calculateSummaryStats } from '../utils/storage';
import { Desconto } from '../utils/supabaseStorage';
import {
  WeeklyCaixa,
  Pagamento,
  getOrCreateCaixaAberto,
  getPagamentosDoColaborador,
  avancarCaixaSeNecessario,
  getDataInicioColaborador,
  calcularResumoNoIntervalo,
  getWorkWeekBounds,
  addDaysISO,
} from '../utils/caixaSemanalStorage';
import { supabase } from '../../supabase';
import { calcularRemuneracaoSemanal } from '../utils/remuneracaoHelper';
import { ReceiptForecastCard } from './ReceiptForecastCard';
import { AddServiceButton } from './AddServiceButton';
import { ChartsSection } from './ChartsSection';

export type PeriodFilter = 'mes' | 'semana' | 'hoje' | 'ontem' | 'personalizado';

interface DashboardProps {
  userSettings: UserSettings;
  stats: SummaryStats;
  todayStats: { production: number; commission: number; count: number };
  recentServices: ServiceItem[];
  onOpenAddModal: () => void;
  onGoToTable: () => void;
  onGoToDescontos?: () => void;
  // Vai pra aba Planilha já com a linha desse serviço destacada -- usado quando o
  // usuário clica num item da lista "Serviços no Período" (em vez de abrir editar direto).
  onGoToServiceInTable?: (serviceId: string) => void;
  onEditService: (service: ServiceItem) => void;
  weeklyGoal: number;
  descontos?: Desconto[];
  // ID do colaborador -- usado pra buscar o caixa/pagamentos e calcular o total estimado
  // já descontando o que ele recebeu a mais (mesmo cálculo usado na aba Descontos).
  colaboradorId?: string;
}

const getTodayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Frase motivacional — troca aleatoriamente toda vez que o Dashboard carrega
// (ver TypedQuote acima, que digita a frase com efeito de "escrevendo").
const MOTIVATIONAL_QUOTES = [
  'Foco no processo — o resultado é consequência.',
  'Cada serviço bem feito hoje constrói a sua reputação de amanhã.',
  'Produtividade não é fazer mais, é fazer o que importa.',
  'Disciplina é escolher entre o que você quer agora e o que você quer mais.',
  'Pequenos avanços diários viram grandes resultados no fim do mês.',
  'Quem cuida dos detalhes, entrega qualidade sem esforço extra.',
  'Sua comissão de hoje é reflexo do seu compromisso de hoje.',
  'Comece pelo mais difícil — o resto fica mais leve depois.',
  'Consistência vence intensidade: apareça todos os dias.',
  'Cliente satisfeito é a melhor propaganda que existe.',
  'Organização economiza tempo — e tempo é produção.',
  'Você não precisa ser perfeito, precisa ser constante.',
  'Trabalho bem feito não pede desconto.',
  'O que você entrega hoje define o que confiam a você amanhã.',
  'Menos desculpa, mais solução.',
  'Toda meta grande começa com uma tarefa pequena, feita agora.',
  'Sua atenção ao detalhe é o que separa o bom do excelente.',
  'Não é sobre ter tempo, é sobre fazer o tempo valer.',
  'Ritmo constante entrega mais do que corrida de última hora.',
  'Cada "sim" pro cliente começa com organização sua.',
  'Progresso, não perfeição.',
  'A qualidade do seu trabalho fala antes de você.',
  'Hoje é um bom dia pra bater sua própria meta.',
  'Resolva um problema de cada vez — e resolva bem.',
  'Seu esforço de hoje é o seu resultado de amanhã.',
  'Faça o simples direito — o complicado se resolve sozinho.',
  'Compromisso com o cliente é compromisso com você mesmo.',
  'Um passo de cada vez também é andar rápido.',
];

const getRandomQuote = () => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];

// Efeito de "máquina de escrever" — digita a frase escolhida em ~1 segundo,
// caractere por caractere, toda vez que o componente monta (ou seja, toda
// vez que a tela do Dashboard é carregada/recarregada).
const TypedQuote = ({ text }: { text: string }) => {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    setTyped('');
    if (!text) return;
    const totalMs = 5000;
    const stepMs = Math.max(totalMs / text.length, 12);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, stepMs);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <p className="text-lg sm:text-xl text-white leading-snug" style={{ fontFamily: 'var(--font-cursive)' }}>
      "{typed}"
      <span className="inline-block w-[2px] h-5 sm:h-6 bg-white/70 ml-0.5 align-middle animate-pulse" />
    </p>
  );
};

const getThisWeekBounds = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sáb

  // Semana começa no domingo
  const sun = new Date(now);
  sun.setDate(now.getDate() - dayOfWeek);

  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);

  const format = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return { start: format(sun), end: format(sat) };
};

const getThisMonthBounds = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);

  const format = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return { start: format(firstDay), end: format(lastDay) };
};

export const Dashboard: React.FC<DashboardProps> = ({
  userSettings,
  stats,
  todayStats,
  recentServices,
  onOpenAddModal,
  onGoToTable,
  onGoToDescontos,
  onGoToServiceInTable,
  onEditService,
  weeklyGoal,
  descontos = [],
  colaboradorId,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('semana');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [customStartDate, setCustomStartDate] = useState(getTodayISO());
  const [customEndDate, setCustomEndDate] = useState(getTodayISO());

  // Frase motivacional sorteada uma vez a cada carregamento da tela (ver
  // TypedQuote, que digita ela com efeito de "sendo escrita").
  const [motivationalQuote] = useState(getRandomQuote);

  // ✅ Caixa e pagamentos do colaborador -- pra abater da previsão de recebimento o que ele
  // já recebeu (inclusive a mais, que é o que gera o déficit/dívida). Mesmos dados usados
  // e já corrigidos na aba Descontos (caixaSemanalStorage).
  const [caixa, setCaixa] = useState<WeeklyCaixa | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  // ✅ Data em que o colaborador começou (para os filtros Mês/Ano do card de Previsão) --
  // diferente de caixa.semanaInicio, que agora é sempre a semana atual (o caixa fecha
  // automaticamente todo sábado, ver avancarCaixaSeNecessario abaixo).
  const [dataInicioColaborador, setDataInicioColaborador] = useState<string | null>(null);
  useEffect(() => {
    if (!colaboradorId) return;
    let cancelled = false;
    getOrCreateCaixaAberto(colaboradorId).then(async (c) => {
      if (cancelled || !c) return;
      // ✅ Fecha automaticamente qualquer semana que já tenha virado (o caixa fecha todo
      // sábado) antes de calcular qualquer coisa -- sem isso o saldo ficava acumulando o
      // histórico inteiro do colaborador em vez de só a sobra/dívida da semana anterior.
      const atualizado = await avancarCaixaSeNecessario(c, userSettings.baseSalary, recentServices, descontos, {
        modalidadeRemuneracao: userSettings.modalidadeRemuneracao,
        metaPercentual: userSettings.metaPercentual,
        comissaoPadraoPercentual: userSettings.defaultCommissionRate,
      });
      if (cancelled) return;
      setCaixa(atualizado);
      getPagamentosDoColaborador(colaboradorId).then((list) => { if (!cancelled) setPagamentos(list); });
      getDataInicioColaborador(colaboradorId).then((d) => { if (!cancelled) setDataInicioColaborador(d); });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colaboradorId]);

  useEffect(() => {
    if (!colaboradorId) return;
    const channel = supabase
      .channel(`dashboard-pagamentos-${colaboradorId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comissoes_pagamentos', filter: `colaborador_id=eq.${colaboradorId}` },
        () => {
          getPagamentosDoColaborador(colaboradorId).then(setPagamentos);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [colaboradorId]);


  // No sábado, o ciclo exibido para fechamento é o ciclo encerrado na sexta-feira.
  // Portanto, 03/10 deve mostrar 26/09 a 02/10; a produção do próprio sábado inicia o próximo ciclo.
  const dashboardWeekOffset = (offset: number) => new Date().getDay() === 6 ? offset - 1 : offset;

  // Receita da loja no ciclo semanal de Sábado a Sexta (apenas notas 100% quitadas/recebidas)
  const [receitaLojaSemana, setReceitaLojaSemana] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const bounds = getWorkWeekBounds(dashboardWeekOffset(weekOffset));
    supabase
      .from('vendas')
      .select('total, status, down_payment, created_at')
      .gte('created_at', bounds.start)
      .lte('created_at', bounds.end)
      .is('deleted_at', null)
      .then(({ data }) => {
        if (cancelled) return;
        const total = (data || [])
          .filter((v: any) => {
            if (v.status === 'canceled') return false;
            const tot = Number(v.total) || 0;
            const down = Number(v.down_payment) || 0;
            return tot > 0 && (v.status === 'completed' || down >= tot);
          })
          .reduce((acc: number, v: any) => acc + (Number(v.total) || 0), 0);
        setReceitaLojaSemana(total);
      });
    return () => { cancelled = true; };
  }, [weekOffset]);

  const metaCalculada = useMemo(() => {
    if (userSettings.modalidadeRemuneracao !== 'meta') return null;
    return calcularRemuneracaoSemanal(
      {
        modalidade: 'meta',
        salarioBase: 0,
        comissaoPadraoPercentual: 0,
        metaPercentual: userSettings.metaPercentual || 0,
        metasValores: userSettings.metasValores,
        metaValorMinimo: userSettings.metaValorMinimo,
        faturamentoGeral: receitaLojaSemana,
      },
      receitaLojaSemana,
      0
    );
  }, [userSettings, receitaLojaSemana]);

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const capitalizedToday = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  // Determine active date range bounds & descriptive label
  const { start, end, periodLabel } = useMemo(() => {
    const today = getTodayISO();

    if (period === 'hoje') {
      return { start: today, end: today, periodLabel: `Hoje (${formatDateBR(today)})` };
    }

    if (period === 'ontem') {
      const yesterday = getYesterdayISO();
      return { start: yesterday, end: yesterday, periodLabel: `Ontem (${formatDateBR(yesterday)})` };
    }

    if (period === 'semana') {
      const effectiveOffset = dashboardWeekOffset(weekOffset);
      const bounds = getWorkWeekBounds(effectiveOffset);
      const isSaturday = new Date().getDay() === 6;
      const label =
        isSaturday && weekOffset === 0
          ? `Fechamento Atual (${formatDateBR(bounds.start)} a ${formatDateBR(bounds.end)})`
          : weekOffset === 0
          ? `Esta Semana (${formatDateBR(bounds.start)} a ${formatDateBR(bounds.end)})`
          : effectiveOffset === -1
          ? `Semana Passada (${formatDateBR(bounds.start)} a ${formatDateBR(bounds.end)})`
          : `Semana de ${formatDateBR(bounds.start)} a ${formatDateBR(bounds.end)} (${Math.abs(effectiveOffset)} sem. atrás)`;
      return {
        start: bounds.start,
        end: bounds.end,
        periodLabel: label,
      };
    }

    if (period === 'mes') {
      const bounds = getThisMonthBounds();
      const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      return {
        start: bounds.start,
        end: bounds.end,
        periodLabel: `Mês Atual (${monthCap})`,
      };
    }

    // personalizado
    return {
      start: customStartDate,
      end: customEndDate,
      periodLabel: `Personalizado (${formatDateBR(customStartDate)} até ${formatDateBR(customEndDate)})`,
    };
  }, [period, weekOffset, customStartDate, customEndDate]);

  // Filter services for chosen period
  const filteredServices = useMemo(() => {
    return recentServices.filter((s) => s.date >= start && s.date <= end);
  }, [recentServices, start, end]);

  // Calculate statistics for filtered services
  const displayStats = useMemo(() => {
    return calculateSummaryStats(filteredServices, userSettings.baseSalary, userSettings);
  }, [filteredServices, userSettings]);

  // ✅ Resumo real do período selecionado (Salário + Comissão - Descontos - Já Pago),
  // usando exatamente a mesma função já corrigida na aba Descontos. Isso é o que garante
  // que o "Total Estimado" do card de Previsão já desconta o que o colaborador recebeu --
  // ✅ Resumo real do período selecionado (Salário + Comissão - Descontos - Já Pago),
  // usando exatamente a mesma função já corrigida na aba Descontos. Isso é o que garante
  // que o "Total Estimado" do card de Previsão já desconta o que o colaborador recebeu --
  // inclusive se recebeu A MAIS (o que vira déficit/dívida e tem que abater daqui).
  const resumoPeriodoAtivo = useMemo(() => {
    if (!caixa) return null;
    return calcularResumoNoIntervalo(
      dataInicioColaborador || caixa.semanaInicio,
      userSettings.baseSalary, recentServices, descontos, pagamentosDoPeriodo, start, end,
      {
        modalidadeRemuneracao: userSettings.modalidadeRemuneracao,
        metaPercentual: userSettings.metaPercentual,
        comissaoPadraoPercentual: userSettings.defaultCommissionRate,
        metasValores: userSettings.metasValores,
        metaValorMinimo: userSettings.metaValorMinimo,
        metaValorMaximo: userSettings.metaValorMaximo,
      }
    );
  }, [caixa, dataInicioColaborador, userSettings.baseSalary, recentServices, descontos, pagamentosDoPeriodo, start, end, userSettings.modalidadeRemuneracao, userSettings.metaPercentual, userSettings.defaultCommissionRate, userSettings.metasValores, userSettings.metaValorMinimo, userSettings.metaValorMaximo]);

  // Saldo anterior ao início da semana atual do caixa (dívidas ou créditos
  // vindos de semanas anteriores já fechadas).
  // Nota: Dívidas acumuladas anteriores (< 0) abatem do recebimento. Mas dentro
  // da semana de trabalho atual não se soma "crédito acumulado" artificial.
  const saldoAnteriorAoPeriodo = useMemo(() => {
    if (!caixa) return 0;
    // No sábado o card representa o fechamento do ciclo que terminou na sexta.
    // O saldo anterior do caixa aberto pertence ao novo ciclo e não pode ser somado
    // novamente ao fechamento de 26/09 a 02/10.
    if (new Date().getDay() === 6 && period === 'semana' && weekOffset === 0) {
      return 0;
    }
    // Se houver dívida real de semana passada (saldo negativo), abatemos:
    if (caixa.saldoAnterior < 0) {
      return caixa.saldoAnterior;
    }
    // Para períodos normais (Hoje, Ontem, Semana, Mês) a previsão da semana
    // é Salário + Comissões - Descontos - Já Pago. Não soma créditos passados que inflariam a previsão.
    return 0;
  }, [caixa, period, weekOffset]);

  // Calculate specific current week statistics for the bottom section
  const weeklyBounds = useMemo(
    () => getWorkWeekBounds(period === 'semana' ? dashboardWeekOffset(weekOffset) : dashboardWeekOffset(0)),
    [period, weekOffset]
  );

  // O pagamento precisa pertencer ao mesmo caixa do ciclo exibido.
  // No sábado, isso impede que um pagamento do caixa 19/09–25/09,
  // registrado em 26/09, seja abatido novamente do fechamento 26/09–02/10.
  const [caixaPeriodoId, setCaixaPeriodoId] = useState<string | null>(null);
  useEffect(() => {
    if (!colaboradorId) {
      setCaixaPeriodoId(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('comissoes_caixas_semanais')
      .select('id')
      .eq('colaborador_id', colaboradorId)
      .eq('semana_inicio', weeklyBounds.start)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setCaixaPeriodoId(data?.id ?? null);
      });
    return () => { cancelled = true; };
  }, [colaboradorId, weeklyBounds.start]);

  const pagamentosDoPeriodo = useMemo(() => {
    if (period !== 'semana' || !caixaPeriodoId) return pagamentos;
    return pagamentos.filter((p) => p.caixaId === caixaPeriodoId);
  }, [period, caixaPeriodoId, pagamentos]);

  const weeklyServices = useMemo(() => {
    return recentServices.filter(
      (s) => s.date >= weeklyBounds.start && s.date <= weeklyBounds.end && s.status !== 'CANCELADO'
    );
  }, [recentServices, weeklyBounds]);

  // ✅ Resumo consolidado da semana atual para a Previsão de Recebimento
  const resumoSemanaAtual = useMemo(() => {
    if (!caixa) return null;
    return calcularResumoNoIntervalo(
      dataInicioColaborador || caixa.semanaInicio,
      userSettings.baseSalary, recentServices, descontos, pagamentosDoPeriodo, weeklyBounds.start, weeklyBounds.end,
      {
        modalidadeRemuneracao: userSettings.modalidadeRemuneracao,
        metaPercentual: userSettings.metaPercentual,
        comissaoPadraoPercentual: userSettings.defaultCommissionRate,
        metasValores: userSettings.metasValores,
        metaValorMinimo: userSettings.metaValorMinimo,
        metaValorMaximo: userSettings.metaValorMaximo,
      }
    );
  }, [caixa, dataInicioColaborador, userSettings.baseSalary, recentServices, descontos, pagamentosDoPeriodo, weeklyBounds, userSettings.modalidadeRemuneracao, userSettings.metaPercentual, userSettings.defaultCommissionRate, userSettings.metasValores, userSettings.metaValorMinimo, userSettings.metaValorMaximo]);

  const weeklyStats = useMemo(() => {
    const prod = weeklyServices.reduce((acc, s) => acc + s.productionValue, 0);
    const normalComm = weeklyServices.reduce((acc, s) => acc + s.commissionValue, 0);
    let comm = normalComm;
    if (userSettings.modalidadeRemuneracao === 'fixo') {
      comm = 0;
    } else if (userSettings.modalidadeRemuneracao === 'meta') {
      comm = (prod * (Number(userSettings.metaPercentual) || 0)) / 100;
    }
    const count = weeklyServices.length;

    // Active days count
    const activeDaysSet = new Set(weeklyServices.map((s) => s.date));
    const activeDaysCount = activeDaysSet.size || 1;
    const avgPerActiveDay = prod > 0 ? prod / activeDaysCount : 0;

    // Peak day calculation
    const dayTotals: { [key: string]: number } = {};
    weeklyServices.forEach((s) => {
      if (!dayTotals[s.date]) dayTotals[s.date] = 0;
      dayTotals[s.date] += s.productionValue;
    });

    let peakDate = '';
    let maxDayValue = 0;
    Object.entries(dayTotals).forEach(([dateStr, val]) => {
      if (val > maxDayValue) {
        maxDayValue = val;
        peakDate = dateStr;
      }
    });

    let peakDayName = 'Sem registros';
    if (peakDate) {
      const d = new Date(peakDate + 'T12:00:00');
      const name = d.toLocaleDateString('pt-BR', { weekday: 'long' });
      peakDayName = name.charAt(0).toUpperCase() + name.slice(1);
    }

    const commissionRate =
      userSettings.modalidadeRemuneracao === 'meta'
        ? (Number(userSettings.metaPercentual) || 0)
        : userSettings.modalidadeRemuneracao === 'fixo'
        ? 0
        : (prod > 0 ? (comm / prod) * 100 : userSettings.defaultCommissionRate);

    return {
      weeklyProduction: prod,
      weeklyCommission: comm,
      weeklyCount: count,
      avgPerActiveDay,
      peakDayName,
      maxDayValue,
      commissionRate,
    };
  }, [weeklyServices, userSettings.defaultCommissionRate]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Greeting & Date Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] relative overflow-hidden shadow-sm">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--accent-red)] mb-1">
            <Sparkles className="w-4 h-4" /> Painel de Controle de Produção
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[var(--text-main)]">
            OLÁ, {userSettings.userName.toUpperCase()}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium mt-0.5">
            {capitalizedToday} • {userSettings.userRole}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <AddServiceButton onClick={onOpenAddModal} size="large" />
        </div>
      </div>

      {/* Frase motivacional — sem card/fundo, só o texto branco em cima do
          fundo, em fonte cursiva com efeito de "sendo escrita" (ver
          TypedQuote acima). Sorteada de novo a cada carregamento da tela. */}
      <div className="px-1 py-2">
        <TypedQuote text={motivationalQuote} />
      </div>

      {/* Period Filter Bar */}
      <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-500/10 text-[var(--accent-red)]">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[var(--text-main)] block">
              Filtro de Período
            </span>
            <span className="text-[11px] text-[var(--accent-red)] font-semibold">
              {periodLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          {/* Botão de Semana Oficial (Sábado a Sexta) com controles de retroagir (< / >) */}
          <div className="flex items-center gap-0.5 bg-[var(--bg-card-sec)] rounded-xl border border-[var(--border-color)] p-0.5">
            <button
              type="button"
              onClick={() => {
                setPeriod('semana');
                setWeekOffset((v) => v - 1);
              }}
              title="Retroagir 1 semana (Semana Anterior)"
              className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-all cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setPeriod('semana')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-extrabold uppercase transition-all cursor-pointer ${
                period === 'semana'
                  ? 'bg-gradient-red text-white shadow-red-glow'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              {period === 'semana' && weekOffset !== 0
                ? `Semana (${weekOffset < 0 ? `${Math.abs(weekOffset)} sem. atrás` : `+${weekOffset} sem.`})`
                : 'Esta Semana'}
            </button>

            <button
              type="button"
              onClick={() => {
                setPeriod('semana');
                setWeekOffset((v) => v + 1);
              }}
              title="Avançar 1 semana"
              className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-all cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {period === 'semana' && weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                title="Voltar para a semana atual"
                className="px-2 py-0.5 rounded-md bg-[var(--accent-red)] text-white text-[10px] font-bold uppercase transition-all cursor-pointer"
              >
                Atual
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setPeriod('hoje')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold uppercase transition-all cursor-pointer ${
              period === 'hoje'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'bg-[var(--bg-card-sec)] text-[var(--text-muted)] hover:text-white border border-[var(--border-color)]'
            }`}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setPeriod('ontem')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold uppercase transition-all cursor-pointer ${
              period === 'ontem'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'bg-[var(--bg-card-sec)] text-[var(--text-muted)] hover:text-white border border-[var(--border-color)]'
            }`}
          >
            Ontem
          </button>
          <button
            type="button"
            onClick={() => setPeriod('mes')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold uppercase transition-all cursor-pointer ${
              period === 'mes'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'bg-[var(--bg-card-sec)] text-[var(--text-muted)] hover:text-white border border-[var(--border-color)]'
            }`}
          >
            Mês Atual
          </button>
          <button
            type="button"
            onClick={() => setPeriod('personalizado')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold uppercase transition-all cursor-pointer ${
              period === 'personalizado'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'bg-[var(--bg-card-sec)] text-[var(--text-muted)] hover:text-white border border-[var(--border-color)]'
            }`}
          >
            Personalizado
          </button>
        </div>

        {/* Custom date range inputs */}
        {period === 'personalizado' && (
          <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-[var(--border-color)]">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase">De</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-xs text-[var(--text-main)] font-mono focus:outline-none focus:border-[var(--accent-red)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase">Até</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-xs text-[var(--text-main)] font-mono focus:outline-none focus:border-[var(--accent-red)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Banner Informativo de Semana Retroagida no Dashboard */}
      {period === 'semana' && weekOffset !== 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-300 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-200">
                Visualizando Semana Passada ({formatDateBR(start)} a {formatDateBR(end)} — {Math.abs(weekOffset)} {Math.abs(weekOffset) === 1 ? 'semana' : 'semanas'} atrás)
              </p>
              <p className="text-[11px] text-amber-300/80 font-medium mt-0.5">
                Os valores de produção, comissões, descontos e projeção de recebimento abaixo refletem exatamente os registros desta semana histórica.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider shrink-0 transition-all shadow-md cursor-pointer active:scale-95 self-start sm:self-center"
          >
            Retornar à Semana Atual
          </button>
        </div>
      )}

      {/* Grid of Main Stat Cards + Featured Receipt Forecast Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Featured Card de Previsão de Recebimento */}
        <div className="lg:col-span-1">
          <ReceiptForecastCard
            baseSalary={userSettings.modalidadeRemuneracao === 'meta' ? 0 : userSettings.baseSalary}
            totalCommission={userSettings.modalidadeRemuneracao === 'meta' ? (metaCalculada?.comissaoEfetiva ?? 0) : (period === 'semana' && resumoPeriodoAtivo ? resumoPeriodoAtivo.totalComissao : weeklyStats.weeklyCommission)}
            weeklyGoal={userSettings.weeklyGoal}
            totalProduction={userSettings.modalidadeRemuneracao === 'meta' ? receitaLojaSemana : (period === 'semana' ? displayStats.totalProduction : weeklyStats.weeklyProduction)}
            totalDiscounts={period === 'semana' && resumoPeriodoAtivo ? resumoPeriodoAtivo.totalDescontos : (resumoSemanaAtual?.totalDescontos ?? 0)}
            totalPaid={period === 'semana' && resumoPeriodoAtivo ? resumoPeriodoAtivo.totalPago : (resumoSemanaAtual?.totalPago ?? 0)}
            previousBalance={saldoAnteriorAoPeriodo}
            cycleDates={`${formatDateBR(weeklyBounds.start)} a ${formatDateBR(weeklyBounds.end)}`}
            modalidadeRemuneracao={userSettings.modalidadeRemuneracao}
            metaPercentual={userSettings.metaPercentual}
            metasValores={userSettings.metasValores}
            metaValorMinimo={userSettings.metaValorMinimo}
            onOpenDescontos={onGoToDescontos}
          />
        </div>

        {/* Quick Stat Cards for Selected Period */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Card 1: Produção do Período */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] relative overflow-hidden transition-all hover:border-[var(--accent-red)]/50 group flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-red" />
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {userSettings.modalidadeRemuneracao === 'meta' ? 'RECEITA QUITADA DA LOJA' : `PRODUÇÃO (${period.toUpperCase()})`}
                </span>
                <div className="text-3xl sm:text-4xl font-black text-[var(--text-main)] font-mono mt-1">
                  {formatCurrency(userSettings.modalidadeRemuneracao === 'meta' ? receitaLojaSemana : displayStats.totalProduction)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-red-500/10 text-[var(--accent-red)]">
                <DollarSign className="w-6 h-6 stroke-[2.5]" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--border-color)]">
              <span>{userSettings.modalidadeRemuneracao === 'meta' ? 'Ciclo Semanal:' : 'Serviços no Período:'} <strong className="text-[var(--text-main)]">{userSettings.modalidadeRemuneracao === 'meta' ? 'Sábado a Sexta' : displayStats.totalCount}</strong></span>
              <span className="text-[var(--accent-red)] font-semibold">{userSettings.modalidadeRemuneracao === 'meta' ? '100% Quitadas' : 'Produção Ativa'}</span>
            </div>
          </div>

          {/* Card 2: Comissão no Período */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] relative overflow-hidden transition-all hover:border-[var(--accent-red)]/50 group flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-red" />
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {userSettings.modalidadeRemuneracao === 'meta'
                    ? `DEGRAU ATINGIDO (SEMANA)`
                    : `COMISSÃO (${period.toUpperCase()})`}
                </span>
                <div className="text-3xl sm:text-4xl font-black text-[var(--accent-red)] font-mono mt-1">
                  {formatCurrency(userSettings.modalidadeRemuneracao === 'meta' ? (metaCalculada?.comissaoEfetiva ?? 0) : displayStats.totalCommission)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-gradient-red text-white shadow-red-glow">
                <Target className="w-6 h-6 stroke-[2.5]" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--border-color)]">
              <span>
                {userSettings.modalidadeRemuneracao === 'meta' ? 'Meta Loja da Semana: ' : 'Acumulado Semana: '}
                <strong className="text-emerald-400 font-bold">
                  {userSettings.modalidadeRemuneracao === 'meta' ? formatCurrency(metaCalculada?.comissaoEfetiva ?? 0) : formatCurrency(weeklyStats.weeklyCommission)}
                </strong>
              </span>
              <span className="text-[var(--text-muted)]">
                {userSettings.modalidadeRemuneracao === 'meta' ? (
                  <span className="text-emerald-400 font-bold">{metaCalculada?.metaAtingidaNome || 'Faixa Semanal'}</span>
                ) : userSettings.modalidadeRemuneracao === 'fixo' ? (
                  <span className="text-blue-400 font-bold">Fixo</span>
                ) : (
                  <>Taxa Média: <strong className="text-[var(--text-main)]">{displayStats.averageCommissionRate.toFixed(1)}%</strong></>
                )}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Visual Charts Section for Selected Period */}
      <ChartsSection services={filteredServices} weeklyGoal={userSettings.weeklyGoal} />

      {/* Services List for Selected Period */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--accent-red)]" />
            <h3 className="font-black text-base uppercase tracking-wider text-[var(--text-main)]">
              Serviços no Período ({filteredServices.length})
            </h3>
          </div>

          <button
            onClick={onGoToTable}
            className="flex items-center gap-1 text-xs font-bold text-[var(--accent-red)] hover:underline cursor-pointer"
          >
            <span>VER PLANILHA COMPLETA</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {filteredServices.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-xl">
              <p className="font-bold text-sm">Nenhum serviço registrado neste período ({periodLabel}).</p>
              <p className="text-xs mt-1">Selecione outro período no filtro ou adicione um novo serviço.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[11px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                    <th className="py-3 px-3 whitespace-nowrap min-w-[100px]">Data</th>
                    <th className="py-3 px-3 whitespace-nowrap min-w-[180px]">Serviço</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap min-w-[110px]">Produção</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap min-w-[110px]">Comissão</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap min-w-[80px]">Ação</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-[var(--border-color)] text-xs font-medium">
                {filteredServices.slice(0, 10).map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onGoToServiceInTable?.(item.id)}
                    className={`hover:bg-[var(--bg-card-hover)] transition-colors ${onGoToServiceInTable ? 'cursor-pointer' : ''}`}
                  >
                    <td className="py-3 px-3 font-mono text-[var(--text-muted)]">
                      {formatDateBR(item.date)}
                    </td>
                    <td className="py-3 px-3 text-[var(--text-main)] font-bold">
                      {item.serviceType}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {formatCurrency(item.productionValue)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-[var(--accent-red)]">
                      {formatCurrency(item.commissionValue)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditService(item); }}
                        className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card-sec)] text-[10px] font-bold text-[var(--text-muted)] hover:text-white cursor-pointer"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Weekly Summary Section */}
      <div className="pt-6 border-t border-[var(--border-color)] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--accent-red)]" />
            <h3 className="font-black text-sm uppercase tracking-wider text-[var(--text-main)]">
              Resumo e Indicadores da Semana
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-[var(--accent-red)] bg-red-950/30 px-2.5 py-1 rounded-lg border border-red-800/30">
            {formatDateBR(weeklyBounds.start)} a {formatDateBR(weeklyBounds.end)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Produção da Semana & Comissão da Semana */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-red" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                PRODUÇÃO DA SEMANA
              </span>
              <div className="text-2xl font-black text-[var(--text-main)] font-mono">
                {formatCurrency(weeklyStats.weeklyProduction)}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border-color)] space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)] font-bold">COMISSÃO DA SEMANA</span>
                <span className="font-mono font-black text-[var(--accent-red)]">
                  {formatCurrency(weeklyStats.weeklyCommission)}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] font-semibold flex items-center justify-between">
                <span>Taxa da Semana:</span>
                <span className="text-white font-mono font-bold">{weeklyStats.commissionRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Card 2: Rendimento Direto */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                RENDIMENTO DIRETO
              </span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                100% Acumulado
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border-color)] text-[11px] text-[var(--text-muted)] font-semibold">
              Rendimento acumulado em tempo real
            </div>
          </div>

          {/* Card 3: Total de Atendimentos */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                TOTAL DE ATENDIMENTOS
              </span>
              <div className="text-2xl font-black text-[var(--text-main)] font-mono">
                {weeklyStats.weeklyCount} {weeklyStats.weeklyCount === 1 ? 'serviço' : 'serviços'}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border-color)] text-[11px] text-[var(--text-muted)] font-semibold">
              Média por dia ativo: <strong className="text-[var(--text-main)] font-mono">{formatCurrency(weeklyStats.avgPerActiveDay)}/serv</strong>
            </div>
          </div>

          {/* Card 4: Pico de Produção */}
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col justify-between relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                PICO DE PRODUÇÃO
              </span>
              <div className="text-lg font-black text-[var(--text-main)] truncate">
                {weeklyStats.peakDayName}
              </div>
              {weeklyStats.maxDayValue > 0 && (
                <div className="text-xs font-mono font-extrabold text-amber-400 mt-0.5">
                  ({formatCurrency(weeklyStats.maxDayValue)})
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--border-color)] text-[11px] text-[var(--text-muted)] font-semibold">
              Dia mais rentável da semana
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

