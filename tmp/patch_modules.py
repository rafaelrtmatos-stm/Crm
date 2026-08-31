import sys

def run():
    with open('src/components/Modules.tsx', 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. Add ChevronLeft
    lucide_target = '  BellOff,\n  ChevronRight,'
    lucide_replacement = '  BellOff,\n  ChevronLeft,\n  ChevronRight,'
    if lucide_target in text:
        text = text.replace(lucide_target, lucide_replacement, 1)

    # 2. Update states
    hook_target = """  // Analise Detalhada (modal \"Analise de Performance\") — independente do filtro de periodo do Dashboard,
  // sempre olha pro dia/mes/ano corrente e os ultimos 30 dias, a partir de todas as vendas reais.
  const [analisePeriodo, setAnalisePeriodo] = useState<'hoje' | 'semana' | 'mes' | 'ano'>('mes');"""

    new_hook_states = """  // Analise Detalhada (modal \"Analise de Performance\")
  // Permite selecionar Hoje, Semana, Mês, Ano e Personalizado com navegação dia a dia, semana a semana, mês a mês, ano a ano ou intervalo livre.
  const [analisePeriodo, setAnalisePeriodo] = useState<'hoje' | 'semana' | 'mes' | 'ano' | 'custom'>('mes');
  const [analiseSelectedDate, setAnaliseSelectedDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [analiseSelectedYear, setAnaliseSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [analiseCustomRange, setAnaliseCustomRange] = useState<{ start: string; end: string }>({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });"""

    if hook_target in text:
        text = text.replace(hook_target, new_hook_states, 1)

    # 3. Update useMemo
    usememo_start = text.find('  const analiseDetalhada = useMemo(() => {')
    usememo_end = text.find('  const addWidget = (type: WidgetType) => {', usememo_start)
    if usememo_start == -1 or usememo_end == -1:
        print('Error: usememo bounds not found')
        sys.exit(1)

    old_usememo = text[usememo_start:usememo_end]

    new_usememo = """  const analiseDetalhada = useMemo(() => {
    // Custo de uma nota = so material Lona/Adesivo (por m2/metro, batendo com o item do
    // Estoque de Insumos) + custos extras manuais lancados na nota (frete, mao de obra,
    // ferro, tinta, etc — ver painel "Custos da Nota" no PDV / ExtraCost). Nenhum outro
    // produto do carrinho entra automaticamente no custo -- ver src/lib/lucro.ts.
    const custoDoPedido = (o: SaleOrder) => {
      const custoMaterial = (o.items || []).reduce((total, item) => {
        if (!isMaterialLonaAdesivo(item.name)) return total;
        const invItem = inventory.find(i => i.id === item.productId || i.name?.toLowerCase() === item.name?.toLowerCase());
        const unitCost = invItem && typeof invItem.costPrice === 'number' ? invItem.costPrice : 0;
        return total + (item.area ? unitCost * item.area * item.quantity : unitCost * item.quantity);
      }, 0);
      let c = custoMaterial + somaCustosExtras(o.extraCosts);
      if (o.status === 'pending' && o.total > 0) c *= (o.downPayment || 0) / o.total;
      return c;
    };

    // Soma o valor de comissoes JA LANCADAS (com % ja aplicado) dentro de um periodo — conta
    // como custo, ja que e dinheiro que sai pro funcionario sobre aquele servico.
    const custoComissoesNoPeriodo = (desde: Date, ate: Date) => {
      return comissoesLancadas
        .filter(c => !c.origemNotaId)
        .filter(c => { const d = new Date(`${c.data}T00:00:00`); return d >= desde && d <= ate; })
        .reduce((acc, c) => acc + c.valor, 0);
    };

    // Determina o intervalo exato de datas (inicio e fim) de acordo com o modo selecionado
    let inicioPeriodo: Date;
    let fimPeriodo: Date;
    let baseRefDate: Date;

    try {
      baseRefDate = analiseSelectedDate ? new Date(`${analiseSelectedDate}T12:00:00`) : new Date();
      if (isNaN(baseRefDate.getTime())) baseRefDate = new Date();
    } catch {
      baseRefDate = new Date();
    }

    if (analisePeriodo === 'hoje') {
      inicioPeriodo = new Date(baseRefDate);
      inicioPeriodo.setHours(0, 0, 0, 0);
      fimPeriodo = new Date(baseRefDate);
      fimPeriodo.setHours(23, 59, 59, 999);
    } else if (analisePeriodo === 'semana') {
      const dayOfWeek = baseRefDate.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
      inicioPeriodo = new Date(baseRefDate);
      inicioPeriodo.setDate(baseRefDate.getDate() - dayOfWeek);
      inicioPeriodo.setHours(0, 0, 0, 0);
      fimPeriodo = new Date(inicioPeriodo);
      fimPeriodo.setDate(inicioPeriodo.getDate() + 6);
      fimPeriodo.setHours(23, 59, 59, 999);
    } else if (analisePeriodo === 'mes') {
      inicioPeriodo = new Date(baseRefDate.getFullYear(), baseRefDate.getMonth(), 1, 0, 0, 0, 0);
      const ultimoDiaMes = new Date(baseRefDate.getFullYear(), baseRefDate.getMonth() + 1, 0).getDate();
      fimPeriodo = new Date(baseRefDate.getFullYear(), baseRefDate.getMonth(), ultimoDiaMes, 23, 59, 59, 999);
    } else if (analisePeriodo === 'ano') {
      const targetYear = analiseSelectedYear || baseRefDate.getFullYear();
      inicioPeriodo = new Date(targetYear, 0, 1, 0, 0, 0, 0);
      fimPeriodo = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    } else {
      // custom
      const startStr = analiseCustomRange.start || format(new Date(), 'yyyy-MM-dd');
      const endStr = analiseCustomRange.end || startStr;
      inicioPeriodo = new Date(`${startStr}T00:00:00`);
      fimPeriodo = new Date(`${endStr}T23:59:59.999`);
      if (isNaN(inicioPeriodo.getTime())) {
        inicioPeriodo = new Date();
        inicioPeriodo.setHours(0, 0, 0, 0);
      }
      if (isNaN(fimPeriodo.getTime())) {
        fimPeriodo = new Date(inicioPeriodo);
        fimPeriodo.setHours(23, 59, 59, 999);
      }
      if (inicioPeriodo > fimPeriodo) {
        const temp = inicioPeriodo;
        inicioPeriodo = fimPeriodo;
        fimPeriodo = temp;
      }
    }

    const diasNoPeriodo = Math.max(1, Math.round((fimPeriodo.getTime() - inicioPeriodo.getTime()) / 86400000) + 1);

    const calcPeriodo = (desde: Date, ate: Date) => {
      const vendasNaoCanceladas = realSales.filter(o => o.status !== 'canceled');
      // Faturamento conta pela data de CADA pagamento (nao a data de criacao da nota)
      const faturamento = vendasNaoCanceladas
        .flatMap(getRevenueEventsForSale)
        .filter(ev => {
          const d = new Date(ev.date);
          return d >= desde && d <= ate;
        })
        .reduce((acc, ev) => acc + ev.value, 0);

      // Custo: notas criadas dentro do período ou comissão lançada no período
      const custo = vendasNaoCanceladas
        .filter(o => {
          const d = new Date(o.createdAt);
          return d >= desde && d <= ate;
        })
        .reduce((acc, o) => acc + custoDoPedido(o), 0)
        + custoComissoesNoPeriodo(desde, ate);

      const count = vendasNaoCanceladas.filter(o => {
        const d = new Date(o.createdAt);
        return d >= desde && d <= ate;
      }).length;

      return { faturamento, lucro: Math.max(0, faturamento - custo), count };
    };

    const periodo = calcPeriodo(inicioPeriodo, fimPeriodo);
    const mediaDiariaPeriodo = periodo.faturamento / diasNoPeriodo;

    // Produtos mais vendidos no periodo selecionado
    const produtosMap: Record<string, { name: string; qty: number; total: number }> = {};
    realSales
      .filter(o => {
        const d = new Date(o.createdAt);
        return o.status !== 'canceled' && d >= inicioPeriodo && d <= fimPeriodo;
      })
      .forEach(o => {
        o.items?.forEach(item => {
          if (!produtosMap[item.name]) produtosMap[item.name] = { name: item.name, qty: 0, total: 0 };
          produtosMap[item.name].qty += item.quantity || 1;
          produtosMap[item.name].total += item.area ? (item.price || 0) * item.area * item.quantity : (item.price || 0) * item.quantity;
        });
      });
    const produtosMaisVendidos = Object.values(produtosMap).sort((a, b) => b.qty - a.qty).slice(0, 6);

    // Vendas mais recentes do periodo selecionado (pra lista "Historico de Vendas" no modal)
    const vendasDoPeriodo = realSales
      .filter(o => {
        const d = new Date(o.createdAt);
        return o.status !== 'canceled' && d >= inicioPeriodo && d <= fimPeriodo;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    // Extrato de caixa: cada RECEBIMENTO individual no período selecionado
    const extratoRecebimentos = realSales
      .filter(o => o.status !== 'canceled')
      .flatMap(o => getRevenueEventsForSale(o).map(ev => ({ ...ev, saleId: o.id, customerName: o.customerName || 'Cliente de Balcão' })))
      .filter(ev => {
        const d = new Date(ev.date);
        return d >= inicioPeriodo && d <= fimPeriodo;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Linha do grafico
    const porBucket: Record<string, { faturamento: number; custo: number }> = {};
    realSales.filter(o => o.status !== 'canceled').forEach(o => {
      const eventos = getRevenueEventsForSale(o);
      const custoPedido = custoDoPedido(o);
      const totalRecebidoPedido = eventos.reduce((acc, ev) => acc + ev.value, 0);
      eventos.forEach(ev => {
        const d = new Date(ev.date);
        if (isNaN(d.getTime())) return;
        if (d < inicioPeriodo || d > fimPeriodo) return;
        const key = analisePeriodo === 'ano' ? format(d, 'MM/yyyy') : format(d, 'dd/MM');
        if (!porBucket[key]) porBucket[key] = { faturamento: 0, custo: 0 };
        porBucket[key].faturamento += ev.value;
        const fatiaCusto = totalRecebidoPedido > 0 ? custoPedido * (ev.value / totalRecebidoPedido) : 0;
        porBucket[key].custo += fatiaCusto;
      });
    });

    comissoesLancadas.filter(c => !c.origemNotaId).forEach(c => {
      const d = new Date(`${c.data}T00:00:00`);
      if (isNaN(d.getTime()) || d < inicioPeriodo || d > fimPeriodo) return;
      const key = analisePeriodo === 'ano' ? format(d, 'MM/yyyy') : format(d, 'dd/MM');
      if (!porBucket[key]) porBucket[key] = { faturamento: 0, custo: 0 };
      porBucket[key].custo += c.valor;
    });

    const linhaGrafico: { day: string; faturamento: number; lucro: number }[] = [];
    if (analisePeriodo === 'ano') {
      const targetYear = analiseSelectedYear || baseRefDate.getFullYear();
      for (let m = 0; m < 12; m++) {
        const d = new Date(targetYear, m, 1);
        const key = format(d, 'MM/yyyy');
        const v = porBucket[key] || { faturamento: 0, custo: 0 };
        linhaGrafico.push({ day: format(d, 'MM/yy'), faturamento: v.faturamento, lucro: Math.max(0, v.faturamento - v.custo) });
      }
    } else if (analisePeriodo === 'hoje') {
      const key = format(inicioPeriodo, 'dd/MM');
      const v = porBucket[key] || { faturamento: 0, custo: 0 };
      linhaGrafico.push({ day: key, faturamento: v.faturamento, lucro: Math.max(0, v.faturamento - v.custo) });
    } else {
      const stepDays = Math.min(diasNoPeriodo, 365);
      for (let i = 0; i < stepDays; i++) {
        const d = new Date(inicioPeriodo);
        d.setDate(inicioPeriodo.getDate() + i);
        if (d > fimPeriodo) break;
        const key = format(d, 'dd/MM');
        const v = porBucket[key] || { faturamento: 0, custo: 0 };
        linhaGrafico.push({ day: key, faturamento: v.faturamento, lucro: Math.max(0, v.faturamento - v.custo) });
      }
    }

    return {
      inicioPeriodo,
      fimPeriodo,
      diasNoPeriodo,
      periodo,
      mediaDiariaPeriodo,
      produtosMaisVendidos,
      vendasDoPeriodo,
      extratoRecebimentos,
      linhaGrafico
    };
  }, [realSales, inventory, comissoesLancadas, analisePeriodo, analiseSelectedDate, analiseSelectedYear, analiseCustomRange]);\n\n"""

    text = text.replace(old_usememo, new_usememo, 1)

    # 4. Update the Modal UI
    modal_selector_start = text.find('{/* Seletor de periodo */}')
    modal_selector_end = text.find('{/* Cards do periodo selecionado */}', modal_selector_start)
    if modal_selector_start == -1 or modal_selector_end == -1:
        print('Error: modal selector bounds not found')
        sys.exit(1)

    old_modal_selector = text[modal_selector_start:modal_selector_end]

    new_modal_selector = """{/* Seletor de periodo e navegação temporal */}
            <div className="flex flex-col gap-2.5 bg-white/[0.02] border border-white/5 rounded-2xl p-3">
               <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
                     {[
                       { id: 'hoje', label: 'Hoje / Dia' },
                       { id: 'semana', label: 'Semana' },
                       { id: 'mes', label: 'Mês' },
                       { id: 'ano', label: 'Ano' },
                       { id: 'custom', label: 'Personalizado' },
                     ].map(p => (
                       <button
                         key={p.id}
                         onClick={() => setAnalisePeriodo(p.id as any)}
                         className={cn(
                           "px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-wide cursor-pointer border-0 transition-all",
                           analisePeriodo === p.id ? "bg-primary-500 text-slate-900 shadow-md" : "bg-transparent text-white/40 hover:text-white"
                         )}
                       >
                         {p.label}
                       </button>
                     ))}
                  </div>

                  {/* Informação do intervalo ativo */}
                  <div className="text-[10px] font-bold text-primary-300 flex items-center gap-1.5 bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20">
                     <Calendar size={13} className="text-primary-400" />
                     <span>
                        {safeFormat(analiseDetalhada.inicioPeriodo, 'dd/MM/yyyy')} {analisePeriodo !== 'hoje' && ` até ${safeFormat(analiseDetalhada.fimPeriodo, 'dd/MM/yyyy')}`}
                     </span>
                     <span className="text-[9px] text-white/40 ml-1">({analiseDetalhada.diasNoPeriodo} {analiseDetalhada.diasNoPeriodo === 1 ? 'dia' : 'dias'})</span>
                  </div>
               </div>

               {/* Controles para alterar dia/semana/mês/ano ou digitar intervalo */}
               <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/5">
                  {analisePeriodo === 'hoje' && (
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Escolher Dia:</span>
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                           <button
                             type="button"
                             onClick={() => {
                               const cur = new Date(`${analiseSelectedDate}T12:00:00`);
                               cur.setDate(cur.getDate() - 1);
                               setAnaliseSelectedDate(format(cur, 'yyyy-MM-dd'));
                             }}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Dia anterior"
                           >
                              <ChevronLeft size={14} />
                           </button>
                           <input
                             type="date"
                             value={analiseSelectedDate}
                             onChange={(e) => e.target.value && setAnaliseSelectedDate(e.target.value)}
                             className="bg-transparent text-[11px] font-black text-white outline-none cursor-pointer uppercase px-1.5"
                           />
                           <button
                             type="button"
                             onClick={() => {
                               const cur = new Date(`${analiseSelectedDate}T12:00:00`);
                               cur.setDate(cur.getDate() + 1);
                               setAnaliseSelectedDate(format(cur, 'yyyy-MM-dd'));
                             }}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Próximo dia"
                           >
                              <ChevronRight size={14} />
                           </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAnaliseSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                          className="px-2.5 py-1 text-[9px] font-black uppercase bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                        >
                           Hoje
                        </button>
                     </div>
                  )}

                  {analisePeriodo === 'semana' && (
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Mudar Semana:</span>
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                           <button
                             type="button"
                             onClick={() => {
                               const cur = new Date(`${analiseSelectedDate}T12:00:00`);
                               cur.setDate(cur.getDate() - 7);
                               setAnaliseSelectedDate(format(cur, 'yyyy-MM-dd'));
                             }}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Semana anterior"
                           >
                              <ChevronLeft size={14} />
                           </button>
                           <span className="text-[10px] font-black text-white px-2">
                              {safeFormat(analiseDetalhada.inicioPeriodo, 'dd/MM')} - {safeFormat(analiseDetalhada.fimPeriodo, 'dd/MM/yyyy')}
                           </span>
                           <button
                             type="button"
                             onClick={() => {
                               const cur = new Date(`${analiseSelectedDate}T12:00:00`);
                               cur.setDate(cur.getDate() + 7);
                               setAnaliseSelectedDate(format(cur, 'yyyy-MM-dd'));
                             }}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Próxima semana"
                           >
                              <ChevronRight size={14} />
                           </button>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                           <span className="text-[9px] text-white/30 font-bold uppercase">Data Ref:</span>
                           <input
                             type="date"
                             value={analiseSelectedDate}
                             onChange={(e) => e.target.value && setAnaliseSelectedDate(e.target.value)}
                             className="bg-transparent text-[11px] font-black text-white outline-none cursor-pointer uppercase"
                           />
                        </div>
                        <button
                          type="button"
                          onClick={() => setAnaliseSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                          className="px-2.5 py-1 text-[9px] font-black uppercase bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                        >
                           Esta Semana
                        </button>
                     </div>
                  )}

                  {analisePeriodo === 'mes' && (
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Mudar Mês:</span>
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                           <button
                             type="button"
                             onClick={() => {
                               const cur = new Date(`${analiseSelectedDate}T12:00:00`);
                               cur.setMonth(cur.getMonth() - 1);
                               setAnaliseSelectedDate(format(cur, 'yyyy-MM-dd'));
                             }}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Mês anterior"
                           >
                              <ChevronLeft size={14} />
                           </button>
                           <input
                             type="month"
                             value={analiseSelectedDate.slice(0, 7)}
                             onChange={(e) => e.target.value && setAnaliseSelectedDate(`${e.target.value}-01`)}
                             className="bg-transparent text-[11px] font-black text-white outline-none cursor-pointer uppercase px-2"
                           />
                           <button
                             type="button"
                             onClick={() => {
                               const cur = new Date(`${analiseSelectedDate}T12:00:00`);
                               cur.setMonth(cur.getMonth() + 1);
                               setAnaliseSelectedDate(format(cur, 'yyyy-MM-dd'));
                             }}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Próximo mês"
                           >
                              <ChevronRight size={14} />
                           </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAnaliseSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                          className="px-2.5 py-1 text-[9px] font-black uppercase bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                        >
                           Este Mês
                        </button>
                     </div>
                  )}

                  {analisePeriodo === 'ano' && (
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Mudar Ano:</span>
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                           <button
                             type="button"
                             onClick={() => setAnaliseSelectedYear(prev => prev - 1)}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Ano anterior"
                           >
                              <ChevronLeft size={14} />
                           </button>
                           <span className="text-[12px] font-black text-white px-3 tracking-wider">{analiseSelectedYear}</span>
                           <button
                             type="button"
                             onClick={() => setAnaliseSelectedYear(prev => prev + 1)}
                             className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all cursor-pointer"
                             title="Próximo ano"
                           >
                              <ChevronRight size={14} />
                           </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAnaliseSelectedYear(new Date().getFullYear())}
                          className="px-2.5 py-1 text-[9px] font-black uppercase bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                        >
                           Ano Atual
                        </button>
                     </div>
                  )}

                  {analisePeriodo === 'custom' && (
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">De:</span>
                        <input
                          type="date"
                          value={analiseCustomRange.start}
                          onChange={(e) => setAnaliseCustomRange(prev => ({ ...prev, start: e.target.value }))}
                          className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-[11px] font-black text-white outline-none cursor-pointer uppercase"
                        />
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Até:</span>
                        <input
                          type="date"
                          value={analiseCustomRange.end}
                          onChange={(e) => setAnaliseCustomRange(prev => ({ ...prev, end: e.target.value }))}
                          className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-[11px] font-black text-white outline-none cursor-pointer uppercase"
                        />
                        <div className="flex items-center gap-1">
                           <button
                             type="button"
                             onClick={() => {
                               const end = new Date();
                               const start = new Date();
                               start.setDate(end.getDate() - 7);
                               setAnaliseCustomRange({
                                 start: format(start, 'yyyy-MM-dd'),
                                 end: format(end, 'yyyy-MM-dd')
                               });
                             }}
                             className="px-2 py-1 text-[8px] font-black uppercase bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                           >
                              Últimos 7d
                           </button>
                           <button
                             type="button"
                             onClick={() => {
                               const end = new Date();
                               const start = new Date();
                               start.setDate(end.getDate() - 30);
                               setAnaliseCustomRange({
                                 start: format(start, 'yyyy-MM-dd'),
                                 end: format(end, 'yyyy-MM-dd')
                               });
                             }}
                             className="px-2 py-1 text-[8px] font-black uppercase bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                           >
                              Últimos 30d
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            </div>\n\n            """

    text = text.replace(old_modal_selector, new_modal_selector, 1)

    with open('src/components/Modules.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

    print('Successfully patched Modules.tsx')

if __name__ == '__main__':
    run()
