import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { ServiceItem, UserSettings, SummaryStats } from '../types';
import { formatCurrency, formatDateBR, calculateSummaryStats } from '../utils/storage';
import { Desconto } from '../utils/supabaseStorage';
import {
  WeeklyCaixa,
  Pagamento,
  getOrCreateCaixaAberto,
  getPagamentosDoCaixa,
  calcularResumoNoIntervalo,
  addDaysISO,
} from '../utils/caixaSemanalStorage';
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
  const [period, setPeriod] = useState<PeriodFilter>('hoje');
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
  useEffect(() => {
    if (!colaboradorId) return;
    let cancelled = false;
    getOrCreateCaixaAberto(colaboradorId).then((c) => {
      if (cancelled || !c) return;
      setCaixa(c);
      getPagamentosDoCaixa(c.id).then((list) => { if (!cancelled) setPagamentos(list); });
    });
    return () => { cancelled = true; };
  }, [colaboradorId]);


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
      const bounds = getThisWeekBounds();
      return {
        start: bounds.start,
        end: bounds.end,
        periodLabel: `Esta Semana (${formatDateBR(bounds.start)} a ${formatDateBR(bounds.end)})`,
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
  }, [period, customStartDate, customEndDate]);

  // Filter services for chosen period
  const filteredServices = useMemo(() => {
    return recentServices.filter((s) => s.date >= start && s.date <= end);
  }, [recentServices, start, end]);

  // Calculate statistics for filtered services
  const displayStats = useMemo(() => {
    return calculateSummaryStats(filteredServices, userSettings.baseSalary);
  }, [filteredServices, userSettings.baseSalary]);

  // ✅ Resumo real do período selecionado (Salário + Comissão - Descontos - Já Pago),
  // usando exatamente a mesma função já corrigida na aba Descontos. Isso é o que garante
  // que o "Total Estimado" do card de Previsão já desconta o que o colaborador recebeu --
  // inclusive se recebeu A MAIS (o que vira déficit/dívida e tem que abater daqui).
  const resumoPeriodoAtivo = useMemo(() => {
    if (!caixa) return null;
    return calcularResumoNoIntervalo(caixa, userSettings.baseSalary, recentServices, descontos, pagamentos, start, end);
  }, [caixa, userSettings.baseSalary, recentServices, descontos, pagamentos, start, end]);

  // ✅ Saldo acumulado do caixa (dívida/crédito carregado de fora do período selecionado),
  // igual ao que a aba Descontos mostra no card "Caixa". Sem isso, o "Total Estimado" do
  // card de Previsão ficava inflado quando o colaborador já tinha dívida acumulada.
  // ✅ CORREÇÃO: calculado direto no intervalo ANTES do período selecionado (do início do
  // caixa até o dia anterior), em vez de tentar isolar por subtração a partir do resumo
  // completo -- a subtração duplicava o salário base (a semana atual acabava contada tanto
  // no "resumo completo" quanto de novo no card "Salário Base"), inflando o Total Estimado
  // mesmo sem nenhuma dívida/crédito real.
  const saldoAnteriorAoPeriodo = useMemo(() => {
    if (!caixa) return 0;
    const diaAnterior = addDaysISO(start, -1);
    if (diaAnterior < caixa.semanaInicio) return caixa.saldoAnterior;
    const resumoAntes = calcularResumoNoIntervalo(
      caixa, userSettings.baseSalary, recentServices, descontos, pagamentos, caixa.semanaInicio, diaAnterior
    );
    return caixa.saldoAnterior + resumoAntes.saldoSemana;
  }, [caixa, userSettings.baseSalary, recentServices, descontos, pagamentos, start]);

  // Calculate specific current week statistics for the bottom section
  const weeklyBounds = useMemo(() => getThisWeekBounds(), []);
  const weeklyServices = useMemo(() => {
    return recentServices.filter(
      (s) => s.date >= weeklyBounds.start && s.date <= weeklyBounds.end && s.status !== 'CANCELADO'
    );
  }, [recentServices, weeklyBounds]);

  const weeklyStats = useMemo(() => {
    const prod = weeklyServices.reduce((acc, s) => acc + s.productionValue, 0);
    const comm = weeklyServices.reduce((acc, s) => acc + s.commissionValue, 0);
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

    const commissionRate = prod > 0 ? (comm / prod) * 100 : userSettings.defaultCommissionRate;

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
            onClick={() => setPeriod('semana')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold uppercase transition-all cursor-pointer ${
              period === 'semana'
                ? 'bg-gradient-red text-white shadow-red-glow'
                : 'bg-[var(--bg-card-sec)] text-[var(--text-muted)] hover:text-white border border-[var(--border-color)]'
            }`}
          >
            Esta Semana
          </button>
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

      {/* Grid of Main Stat Cards + Featured Receipt Forecast Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Featured Card de Previsão de Recebimento */}
        <div className="lg:col-span-1">
          <ReceiptForecastCard
            baseSalary={userSettings.baseSalary}
            totalCommission={displayStats.totalCommission}
            weeklyGoal={userSettings.weeklyGoal}
            totalProduction={displayStats.totalProduction}
            totalDiscounts={resumoPeriodoAtivo?.totalDescontos ?? 0}
            totalPaid={resumoPeriodoAtivo?.totalPago ?? 0}
            previousBalance={saldoAnteriorAoPeriodo}
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
                  PRODUÇÃO ({period.toUpperCase()})
                </span>
                <div className="text-3xl sm:text-4xl font-black text-[var(--text-main)] font-mono mt-1">
                  {formatCurrency(displayStats.totalProduction)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-red-500/10 text-[var(--accent-red)]">
                <DollarSign className="w-6 h-6 stroke-[2.5]" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--border-color)]">
              <span>Serviços no Período: <strong className="text-[var(--text-main)]">{displayStats.totalCount}</strong></span>
              <span className="text-[var(--accent-red)] font-semibold">Produção Ativa</span>
            </div>
          </div>

          {/* Card 2: Comissão no Período */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] relative overflow-hidden transition-all hover:border-[var(--accent-red)]/50 group flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-red" />
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  COMISSÃO ({period.toUpperCase()})
                </span>
                <div className="text-3xl sm:text-4xl font-black text-[var(--accent-red)] font-mono mt-1">
                  {formatCurrency(displayStats.totalCommission)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-gradient-red text-white shadow-red-glow">
                <Percent className="w-6 h-6 stroke-[2.5]" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--border-color)]">
              <span>Taxa Média: <strong className="text-[var(--text-main)]">{displayStats.averageCommissionRate.toFixed(1)}%</strong></span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Acumulado
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
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[11px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                  <th className="py-3 px-3">Data</th>
                  <th className="py-3 px-3">Serviço</th>
                  <th className="py-3 px-3 text-right">Produção</th>
                  <th className="py-3 px-3 text-right">Comissão</th>
                  <th className="py-3 px-3 text-center">Ação</th>
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
          )}
        </div>
      </div>

      {/* Bottom Weekly Summary Section */}
      <div className="pt-6 border-t border-[var(--border-color)] space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--accent-red)]" />
          <h3 className="font-black text-sm uppercase tracking-wider text-[var(--text-main)]">
            Resumo e Indicadores da Semana
          </h3>
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

