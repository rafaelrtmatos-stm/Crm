import sys

with open('src/components/Modules.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update discount states and functions around line 9166
target1 = '''  const [saleDiscountValue, setSaleDiscountValue] = useState<number>(0);
  const [saleDiscountMode, setSaleDiscountMode] = useState<'percentual' | 'valor' | 'final'>('valor');
  const [saleDiscountInput, setSaleDiscountInput] = useState<number | ''>('');
  // Credito acumulado do cliente (ex: troco de dinheiro que ele nao levou), abatido automaticamente
  // do total da venda quando aplicado aqui. Fonte da verdade e' clientes.saldo_credito.
  const [saleCreditApplied, setSaleCreditApplied] = useState<number>(0);
  const selectedCustomerCredit = selectedCustomer ? (allCustomers.find((c: any) => c.id === selectedCustomer.id)?.saldo_credito || 0) : 0;
  const cartRawTotal = cart.reduce((acc, item) => {
    const itemTotal = item.area ? item.price * item.area * item.quantity : item.price * item.quantity;
    return acc + itemTotal;
  }, 0);
  const total = Math.max(0, cartRawTotal - saleDiscountValue - saleCreditApplied);
  const applySaleCredit = () => {
    const disponivel = Math.max(0, selectedCustomerCredit);
    const maxAplicavel = Math.max(0, cartRawTotal - saleDiscountValue);
    setSaleCreditApplied(Math.min(disponivel, maxAplicavel));
  };
  const remainingValue = Math.max(0, total - (downPayment === '' || typeof downPayment === 'string' ? 0 : Number(downPayment)));

  // Aplica o desconto da venda a partir do modo escolhido (%, R$ de desconto, ou valor final desejado)
  const applySaleDiscountInput = () => {
    const val = saleDiscountInput === '' ? 0 : Number(saleDiscountInput);
    let novoDesconto = 0;
    if (saleDiscountMode === 'percentual') {
      novoDesconto = cartRawTotal * (val / 100);
    } else if (saleDiscountMode === 'valor') {
      novoDesconto = val;
    } else {
      // valor final desejado: desconto = total original - valor final que o cliente quer pagar
      novoDesconto = Math.max(0, cartRawTotal - val);
    }
    setSaleDiscountValue(Math.max(0, Math.min(cartRawTotal, novoDesconto)));
  };

  // Quitar Debito: abre a mesma tela de pagamento do Terminal, mas pra uma venda ja existente com saldo pendente
  const paymentModalTotal = settlingOrder ? settlingOrder.total : total;
  const paymentModalItems = settlingOrder ? settlingOrder.items : cart;
  // Soma a lista EDITAVEL de pagamentos (nao o campo downPayment travado) — assim, se a pessoa
  // excluir um pagamento da lista, o valor "ja pago" cai na hora, refletindo a edicao
  const alreadyPaidForSettle = (settlingOrder || editingFullOrder) ? editingPaymentsList.reduce((sum, p) => sum + p.value, 0) : 0;
  const paymentModalRemaining = (settlingOrder || editingFullOrder)
    ? Math.max(0, paymentModalTotal - alreadyPaidForSettle - paymentEntriesTotal)
    : remainingValue;

  const openSettlePayment = (order: SaleOrder) => {
    setSettlingOrder(order);
    setSelectedCustomer(order.customerId ? { id: order.customerId, name: order.customerName || 'Cliente', phone: order.customerPhone || '' } : null);
    setPaymentEntries([]);
    setDownPayment(0);
    setScheduledFor(order.scheduledFor ? isoToLocalDatetimeInput(order.scheduledFor) : '');
    setPendingPaymentMethod('');
    setEditingPaymentsList(order.payments ? order.payments.map(p => ({ ...p })) : []);
    setIsPaymentModalOpen(true);
  };'''

replacement1 = '''  const [saleDiscountValue, setSaleDiscountValue] = useState<number>(0);
  const [saleDiscountMode, setSaleDiscountMode] = useState<'percentual' | 'valor' | 'final'>('valor');
  const [saleDiscountInput, setSaleDiscountInput] = useState<number | ''>('');
  const [isSaleDiscountModalOpen, setIsSaleDiscountModalOpen] = useState<boolean>(false);
  // Credito acumulado do cliente (ex: troco de dinheiro que ele nao levou), abatido automaticamente
  // do total da venda quando aplicado aqui. Fonte da verdade e' clientes.saldo_credito.
  const [saleCreditApplied, setSaleCreditApplied] = useState<number>(0);
  const selectedCustomerCredit = selectedCustomer ? (allCustomers.find((c: any) => c.id === selectedCustomer.id)?.saldo_credito || 0) : 0;

  const cartRawTotal = cart.reduce((acc, item) => {
    const itemTotal = item.area ? item.price * item.area * item.quantity : item.price * item.quantity;
    return acc + itemTotal;
  }, 0);

  const settlingRawTotal = settlingOrder
    ? ((settlingOrder.items && settlingOrder.items.length > 0)
        ? settlingOrder.items.reduce((acc, item) => acc + (item.area ? item.price * item.area * item.quantity : item.price * item.quantity), 0)
        : (settlingOrder.total + (settlingOrder.discountValue || 0)))
    : 0;

  const activeRawTotal = settlingOrder ? settlingRawTotal : cartRawTotal;
  const total = Math.max(0, cartRawTotal - saleDiscountValue - saleCreditApplied);

  const applySaleCredit = () => {
    const disponivel = Math.max(0, selectedCustomerCredit);
    const maxAplicavel = Math.max(0, activeRawTotal - saleDiscountValue);
    setSaleCreditApplied(Math.min(disponivel, maxAplicavel));
  };

  const remainingValue = Math.max(0, total - (downPayment === '' || typeof downPayment === 'string' ? 0 : Number(downPayment)));

  // Aplica o desconto da venda a partir do modo escolhido (%, R$ de desconto, ou valor final desejado)
  const applySaleDiscountInput = () => {
    const val = saleDiscountInput === '' ? 0 : Number(saleDiscountInput);
    let novoDesconto = 0;
    const baseTotal = activeRawTotal;
    if (saleDiscountMode === 'percentual') {
      novoDesconto = baseTotal * (val / 100);
    } else if (saleDiscountMode === 'valor') {
      novoDesconto = val;
    } else {
      // valor final desejado: desconto = total original - valor final que o cliente quer pagar
      novoDesconto = Math.max(0, baseTotal - val);
    }
    setSaleDiscountValue(Math.max(0, Math.min(baseTotal, novoDesconto)));
  };

  // Quitar Debito: abre a mesma tela de pagamento do Terminal, mas pra uma venda ja existente com saldo pendente
  const paymentModalTotal = settlingOrder 
    ? Math.max(0, settlingRawTotal - saleDiscountValue - saleCreditApplied)
    : total;
  const paymentModalItems = settlingOrder ? settlingOrder.items : cart;

  // Soma a lista EDITAVEL de pagamentos (nao o campo downPayment travado) — assim, se a pessoa
  // excluir um pagamento da lista, o valor "ja pago" cai na hora, refletindo a edicao
  const alreadyPaidForSettle = (settlingOrder || editingFullOrder) ? editingPaymentsList.reduce((sum, p) => sum + p.value, 0) : 0;
  const paymentModalRemaining = (settlingOrder || editingFullOrder)
    ? Math.max(0, paymentModalTotal - alreadyPaidForSettle - paymentEntriesTotal)
    : remainingValue;

  const openSettlePayment = (order: SaleOrder) => {
    setSettlingOrder(order);
    setSelectedCustomer(order.customerId ? { id: order.customerId, name: order.customerName || 'Cliente', phone: order.customerPhone || '' } : null);
    setPaymentEntries([]);
    setDownPayment(0);
    setScheduledFor(order.scheduledFor ? isoToLocalDatetimeInput(order.scheduledFor) : '');
    setPendingPaymentMethod('');
    setEditingPaymentsList(order.payments ? order.payments.map(p => ({ ...p })) : []);
    setSaleDiscountValue(order.discountValue || 0);
    setSaleDiscountInput(order.discountValue ? Number(order.discountValue) : '');
    setSaleDiscountMode('valor');
    setSaleCreditApplied(0);
    setIsPaymentModalOpen(true);
  };'''

assert target1 in content, 'target1 not found in Modules.tsx'
content = content.replace(target1, replacement1, 1)

# 2. Update settlingOrder in handleFinalize
start_settle = content.find('// Quitar Debito: atualiza a venda ja existente')
end_settle = content.find('const finalDownPayment = forceZeroPayment', start_settle)
assert start_settle != -1 and end_settle != -1, 'settlingOrder section in handleFinalize not found'

new_settle = '''// Quitar Debito: atualiza a venda ja existente em vez de criar uma nova
    if (settlingOrder) {
      const novoTotalPago = alreadyPaidForSettle + effectivePaymentEntriesTotal;
      const novoSaldo = Math.max(0, paymentModalTotal - novoTotalPago);
      // Usa a lista EDITADA (pode ter pagamento excluido ou data alterada), nao a original travada
      const pagamentosFinais = [...editingPaymentsList, ...effectivePaymentEntries];
      try {
        const { data, error } = await supabase.from('vendas').update({
          total: paymentModalTotal,
          discount_value: saleDiscountValue || null,
          down_payment: novoTotalPago,
          received_value: novoTotalPago,
          payments: pagamentosFinais,
          status: novoSaldo <= 0 ? 'completed' : 'pending',
          pending_payment_method: novoSaldo > 0 ? (pendingPaymentMethod || null) : null,
          scheduled_for: localDatetimeToIso(scheduledFor) || settlingOrder.scheduledFor || null,
          updated_at: new Date().toISOString(),
        }).eq('id', settlingOrder.id).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('O pedido não foi encontrado pra atualizar — pode ter sido removido ou alterado por outra pessoa.');

        const updatedOrder: SaleOrder = { 
          ...settlingOrder, 
          total: paymentModalTotal,
          discountValue: saleDiscountValue || undefined,
          downPayment: novoTotalPago, 
          receivedValue: novoTotalPago, 
          status: novoSaldo <= 0 ? 'completed' : 'pending', 
          payments: pagamentosFinais, 
          scheduledFor: localDatetimeToIso(scheduledFor) || settlingOrder.scheduledFor || undefined, 
          updatedAt: new Date().toISOString() 
        };
        setLastFinalizedOrder(updatedOrder);
        // Atualiza so essa venda localmente (nao recarrega a tabela inteira, que fica lenta com muitas vendas)
        // Reordena pela data/hora real da transacao (createdAt) — quitar debito nao deve
        // mudar a posicao cronologica da nota no historico.
        setAllSalesHistory(prev => prev.map(s => s.id === settlingOrder.id ? updatedOrder : s).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setSalesToday(prev => prev.map(s => s.id === settlingOrder.id ? updatedOrder : s));
        setIsSuccessModalOpen(true);
        setIsPaymentModalOpen(false);
        setSettlingOrder(null);
        setSelectedCustomer(null);
        setPaymentEntries([]);
        setDownPayment(0);
        setScheduledFor('');
        setOrderObservacoes('');
        setPendingPaymentMethod('');
        setSaleDiscountValue(0);
        setSaleDiscountInput('');
        setSaleCreditApplied(0);
      } catch (err: any) {
        console.error('Erro ao quitar débito:', err);
        showAlert(`Não foi possível registrar o pagamento: ${err?.message || 'erro desconhecido'}`);
      }
      return;
    }
    '''

content = content[:start_settle] + new_settle + content[end_settle:]

# 3. Update Total Banner
start_banner = content.find('{/* Total Banner */}')
end_banner = content.find('{/* Visualizador de Itens no PDV', start_banner)
assert start_banner != -1 and end_banner != -1, 'Total Banner not found'

new_banner = '''{/* Total Banner */}
               <div className="py-1.5 sm:py-3 px-2 sm:px-4 bg-slate-900/5 rounded-lg sm:rounded-2xl border border-slate-900/10 flex items-center justify-between my-0.5 sm:my-2 gap-2">
                  <div className="min-w-0 flex-1">
                     <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[6.5px] sm:text-[9px] font-black uppercase tracking-[1.5px] sm:tracking-[3px] text-slate-900/40">Total da Nota</p>
                        {saleDiscountValue > 0 && (
                           <span className="text-[7px] sm:text-[8.5px] font-black text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                              Desc: -R$ {saleDiscountValue.toFixed(2).replace('.', ',')}
                           </span>
                        )}
                        {saleCreditApplied > 0 && (
                           <span className="text-[7px] sm:text-[8.5px] font-black text-blue-700 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.2 rounded">
                              Crédito: -R$ {saleCreditApplied.toFixed(2).replace('.', ',')}
                           </span>
                        )}
                     </div>
                     <h1 className="text-base sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tighter italic truncate">
                        R$ {total.toFixed(2).replace('.', ',')}
                     </h1>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                     <button
                        type="button"
                        onClick={() => setIsSaleDiscountModalOpen(true)}
                        className={cn(
                           "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-black uppercase text-[7px] sm:text-[9px] transition-all flex items-center gap-1 cursor-pointer border",
                           saleDiscountValue > 0
                              ? "bg-emerald-600 border-emerald-700 text-white shadow-sm hover:bg-emerald-700 active:scale-95"
                              : "bg-white/90 hover:bg-white text-slate-800 border-slate-900/10 shadow-xs active:scale-95"
                        )}
                        title="Lançar desconto geral na nota"
                     >
                        <Percent size={11} className={saleDiscountValue > 0 ? "text-white" : "text-slate-600"} />
                        <span>{saleDiscountValue > 0 ? `Desc R$ ${saleDiscountValue.toFixed(2).replace('.', ',')}` : 'Desconto'}</span>
                     </button>
                     <Badge className="bg-slate-900 text-white border-none py-1 sm:py-1.5 px-2 sm:px-3 rounded-full font-black uppercase tracking-widest text-[7px] sm:text-[9px]">
                        {cart.length} {cart.length === 1 ? 'Item' : 'Itens'}
                     </Badge>
                  </div>
               </div>
               '''

content = content[:start_banner] + new_banner + content[end_banner:]

# 4. Update Payment Modal top info & discount bar
start_pay = content.find('{/* Payment Modal */}')
end_pay = content.find('{/* Left Side: Items & Summary Details */}', start_pay)
assert start_pay != -1 and end_pay != -1, 'Payment Modal top not found'

new_pay = '''{/* Payment Modal */}
      <Modal 
        isOpen={isPaymentModalOpen} 
        onClose={handleClosePaymentModal} 
        title={settlingOrder ? `Quitar Débito — Pedido #${settlingOrder.id.slice(-8).toUpperCase()}` : editingFullOrder ? `Salvar Alterações — Pedido #${editingFullOrder.id.slice(-8).toUpperCase()}` : "Finalizar Venda / Fechar Nota"}
        size="lg"
        className="max-h-[96vh] my-auto"
        contentClassName="min-h-0"
      >
        <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden gap-1.5 sm:gap-2.5">
           {/* Top Info Bar: Customer & Summary combined */}
           <div className="space-y-1.5 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                 <div className="p-2 sm:p-2.5 bg-white/5 rounded-xl border border-white/5 flex gap-2 items-center min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary-500/20 text-primary-300 flex items-center justify-center border border-primary-500/30 shrink-0">
                       <UserCheck size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-white/30 leading-none mb-0.5">Cliente Atendido</p>
                       <p className="text-[10px] sm:text-xs font-black text-white truncate">{selectedCustomer ? selectedCustomer.name : 'Cliente de Balcão'}</p>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className={cn("text-[7.5px] sm:text-[8px] uppercase tracking-widest h-6 sm:h-7 px-2 border-white/10 shrink-0", settlingOrder && "invisible")}
                      disabled={!!settlingOrder}
                      onClick={() => {
                         setIsPaymentModalOpen(false);
                         setCustomerModalIntent('finalize');
                         setCustomerModalMode('search');
                         setIsCustomerModalOpen(true);
                      }}
                    >
                      Alterar
                    </Button>
                 </div>

                 <div className="p-2 sm:p-2.5 bg-slate-900 rounded-xl border border-white/5 flex justify-between items-center px-3 sm:px-4">
                    <div>
                       <p className="text-[7px] sm:text-[8px] font-black text-white/30 uppercase tracking-widest leading-none mb-0.5">
                          Total a Pagar{saleDiscountValue > 0 ? ` (com desconto de R$ ${saleDiscountValue.toFixed(2).replace('.', ',')})` : ''}{saleCreditApplied > 0 ? ` (crédito de R$ ${saleCreditApplied.toFixed(2).replace('.', ',')} aplicado)` : ''}
                       </p>
                       <p className="text-sm sm:text-lg md:text-xl font-black text-white tracking-tighter italic leading-none">
                          R$ {paymentModalTotal.toFixed(2).replace('.', ',')}
                       </p>
                    </div>
                    <Badge variant="primary" className="bg-emerald-500/10 text-emerald-400 border-none font-black text-[8px] sm:text-[9px] tracking-widest uppercase py-0.5 px-2">Conferido</Badge>
                 </div>
              </div>

              {!settlingOrder && selectedCustomerCredit > 0 && (
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                   <p className="text-[9px] font-bold text-emerald-300">
                      Cliente tem <span className="font-black">R$ {selectedCustomerCredit.toFixed(2).replace('.', ',')}</span> de crédito
                      {saleCreditApplied > 0 ? ` · R$ ${saleCreditApplied.toFixed(2).replace('.', ',')} aplicado` : ''}
                   </p>
                   {saleCreditApplied > 0 ? (
                     <button onClick={() => setSaleCreditApplied(0)} className="h-6 px-2 rounded-lg bg-rose-500/10 text-rose-400 text-[8px] font-black uppercase hover:bg-rose-500/20 shrink-0 cursor-pointer">Remover</button>
                   ) : (
                     <button onClick={applySaleCredit} className="h-6 px-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-[8px] font-black uppercase hover:bg-emerald-500/25 shrink-0 cursor-pointer">Aplicar</button>
                   )}
                </div>
              )}

              {/* Bloco de Desconto na Nota (Acessível no Mobile e Desktop) */}
              <div className="p-2 bg-white/5 rounded-xl border border-white/5 space-y-1.5">
                 <div className="flex items-center justify-between gap-2">
                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-white/40 flex items-center gap-1">
                       <Percent size={11} className="text-primary-300" /> Desconto na Nota
                    </span>
                    <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 gap-0.5">
                       <button onClick={() => { setSaleDiscountMode('percentual'); setSaleDiscountInput(''); }} className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all cursor-pointer", saleDiscountMode === 'percentual' ? "bg-primary-500 text-slate-900" : "text-white/40")}>Desc. %</button>
                       <button onClick={() => { setSaleDiscountMode('valor'); setSaleDiscountInput(''); }} className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all cursor-pointer", saleDiscountMode === 'valor' ? "bg-primary-500 text-slate-900" : "text-white/40")}>Desc. R$</button>
                       <button onClick={() => { setSaleDiscountMode('final'); setSaleDiscountInput(''); }} className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all cursor-pointer", saleDiscountMode === 'final' ? "bg-primary-500 text-slate-900" : "text-white/40")}>Valor Final</button>
                    </div>
                 </div>

                 <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                    {saleDiscountMode === 'percentual' && (
                       <div className="flex items-center gap-1 shrink-0">
                          {[5, 10, 15, 20].map((pct) => (
                             <button
                                key={pct}
                                type="button"
                                onClick={() => {
                                   setSaleDiscountInput(pct);
                                   const base = activeRawTotal;
                                   setSaleDiscountValue(base * (pct / 100));
                                }}
                                className={cn(
                                   "h-7 px-1.5 rounded-lg text-[8px] font-black uppercase border transition-all cursor-pointer",
                                   saleDiscountInput === pct ? "bg-primary-500/20 border-primary-500 text-primary-300" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                                )}
                             >
                                {pct}%
                             </button>
                          ))}
                       </div>
                    )}
                    <input 
                      onFocus={(e: any) => e.target.select()}
                      type="number"
                      step="any"
                      min={0}
                      inputMode="decimal"
                      value={saleDiscountInput}
                      onChange={(e) => setSaleDiscountInput(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder={saleDiscountMode === 'percentual' ? '% de desconto' : saleDiscountMode === 'valor' ? 'R$ de desconto' : 'R$ valor final'}
                      className="flex-1 min-w-[90px] h-7 bg-slate-900/80 border border-white/10 rounded-lg px-2 text-[10px] text-white focus:outline-none focus:border-primary-500 font-bold"
                    />
                    <button onClick={applySaleDiscountInput} className="h-7 px-3 rounded-lg bg-primary-500 text-slate-900 text-[9px] font-black uppercase hover:bg-primary-400 shrink-0 cursor-pointer shadow-xs">Aplicar</button>
                    {saleDiscountValue > 0 && (
                      <button onClick={() => { setSaleDiscountValue(0); setSaleDiscountInput(''); }} className="h-7 px-2 rounded-lg bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase hover:bg-rose-500/20 shrink-0 cursor-pointer">Limpar</button>
                    )}
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 flex-1 min-h-0 overflow-y-auto md:overflow-hidden custom-scrollbar">
              '''

content = content[:start_pay] + new_pay + content[end_pay:]

# 5. Add SaleDiscountModal before insulfilmModalProduct
insul_idx = content.find('{insulfilmModalProduct && (() => {')
assert insul_idx != -1, 'insulfilmModalProduct not found'

discount_modal_code = '''{/* Modal de Desconto Geral da Nota (PDV / Mobile / Desktop) */}
      <Modal 
        isOpen={isSaleDiscountModalOpen} 
        onClose={() => setIsSaleDiscountModalOpen(false)} 
        title="Desconto na Nota" 
        size="sm"
      >
        <div className="space-y-4 p-2">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-white/40">Subtotal dos Itens</p>
              <p className="text-base font-black text-white italic">R$ {cartRawTotal.toFixed(2).replace('.', ',')}</p>
            </div>
            {saleDiscountValue > 0 && (
              <div className="text-right">
                <p className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Desconto Atual</p>
                <p className="text-base font-black text-emerald-400 italic">- R$ {saleDiscountValue.toFixed(2).replace('.', ',')}</p>
              </div>
            )}
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1">
            <button 
              type="button"
              onClick={() => { setSaleDiscountMode('percentual'); setSaleDiscountInput(''); }} 
              className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer", saleDiscountMode === 'percentual' ? "bg-primary-500 text-slate-900 shadow-sm" : "text-white/40 hover:text-white/70")}
            >
              Desc. %
            </button>
            <button 
              type="button"
              onClick={() => { setSaleDiscountMode('valor'); setSaleDiscountInput(''); }} 
              className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer", saleDiscountMode === 'valor' ? "bg-primary-500 text-slate-900 shadow-sm" : "text-white/40 hover:text-white/70")}
            >
              Desc. R$
            </button>
            <button 
              type="button"
              onClick={() => { setSaleDiscountMode('final'); setSaleDiscountInput(''); }} 
              className={cn("flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer", saleDiscountMode === 'final' ? "bg-primary-500 text-slate-900 shadow-sm" : "text-white/40 hover:text-white/70")}
            >
              Valor Final
            </button>
          </div>

          {/* Quick preset chips for percentages */}
          {saleDiscountMode === 'percentual' && (
            <div className="flex items-center gap-1.5 justify-between">
              {[5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setSaleDiscountInput(pct)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all cursor-pointer",
                    saleDiscountInput === pct 
                      ? "bg-primary-500/20 border-primary-500 text-primary-300" 
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}

          <div>
            <Input
              label={
                saleDiscountMode === 'percentual' 
                  ? 'Porcentagem de Desconto (%)' 
                  : saleDiscountMode === 'valor' 
                    ? 'Valor do Desconto em Reais (R$)' 
                    : 'Valor Final Desejado para a Nota (R$)'
              }
              type="number"
              step="any"
              min={0}
              autoFocus
              inputMode="decimal"
              placeholder={saleDiscountMode === 'percentual' ? 'Ex: 10' : saleDiscountMode === 'valor' ? 'Ex: 15,00' : `Ex: ${(cartRawTotal * 0.9).toFixed(0)}`}
              value={saleDiscountInput}
              onChange={(e: any) => setSaleDiscountInput(e.target.value === '' ? '' : Number(e.target.value))}
            />
            {saleDiscountMode === 'percentual' && saleDiscountInput !== '' && (
              <p className="text-[10px] text-emerald-400 font-bold mt-1">
                = R$ {((cartRawTotal * Number(saleDiscountInput)) / 100).toFixed(2).replace('.', ',')} de desconto
              </p>
            )}
            {saleDiscountMode === 'final' && saleDiscountInput !== '' && (
              <p className="text-[10px] text-emerald-400 font-bold mt-1">
                = R$ {Math.max(0, cartRawTotal - Number(saleDiscountInput)).toFixed(2).replace('.', ',')} de desconto
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
            {saleDiscountValue > 0 ? (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-[9px] uppercase font-black"
                onClick={() => {
                  setSaleDiscountValue(0);
                  setSaleDiscountInput('');
                  setIsSaleDiscountModalOpen(false);
                }}
              >
                Remover Desconto
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white/50 hover:text-white text-[9px] uppercase font-black"
                onClick={() => setIsSaleDiscountModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                size="sm"
                className="bg-primary-500 hover:bg-primary-400 text-slate-900 border-none font-black text-[9px] uppercase px-4 shadow-lg shadow-primary-500/20 cursor-pointer" 
                onClick={() => {
                  applySaleDiscountInput();
                  setIsSaleDiscountModalOpen(false);
                }}
              >
                Aplicar Desconto
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      '''

content = content[:insul_idx] + discount_modal_code + content[insul_idx:]

with open('src/components/Modules.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Modules.tsx successfully updated!')
