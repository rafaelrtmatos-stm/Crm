import React,{useEffect,useMemo,useState}from'react';
import{CalendarClock,CircleDollarSign,MinusCircle,Wallet,LockKeyhole,Clock,ChevronLeft,ChevronRight}from'lucide-react';
import{supabase}from'../../supabase';
import{formatCurrency}from'../utils/storage';
import{calculateDescontosNoPeriodo,getDescontosFromSupabase,calcularSalarioSemanal}from'../utils/supabaseStorage';
import{getDescontosValesBounds,getWorkWeekBounds}from'../utils/caixaSemanalStorage';
import{calcularRemuneracaoSemanal}from'../utils/remuneracaoHelper';
import{analisarDia,hojeStr,limitarInicioPonto}from'../../lib/pontoCalc';
import{resumoExtras,ehFeriado}from'../../lib/feriados';

export const MeuSalarioView:React.FC<{colaboradorId:string;nome:string;salarioBase:number;modalidade?:any;comissaoPadraoPercentual?:number;metaPercentual?:number;metasValores?:any[];metaValorMinimo?:number;metaValorMaximo?:number;utilizaPontoEletronico?:boolean}>=({colaboradorId,nome,salarioBase,modalidade='fixo_comissao' as any,comissaoPadraoPercentual=0,metaPercentual=0,metasValores,metaValorMinimo,metaValorMaximo,utilizaPontoEletronico=false})=>{
 const[caixa,setCaixa]=useState<any>(null),[servicos,setServicos]=useState<any[]>([]),[descontos,setDescontos]=useState<any[]>([]),[pagamentos,setPagamentos]=useState<any[]>([]),[loading,setLoading]=useState(true);
 const[pontoDebitoMinutos,setPontoDebitoMinutos]=useState(0);
 const[pontoExtraMinutos,setPontoExtraMinutos]=useState(0);
 const[pontoTrabalhadoMinutos,setPontoTrabalhadoMinutos]=useState(0);
 const[pontoFeriadosValor,setPontoFeriadosValor]=useState(0);
 const[pontoExtrasValor,setPontoExtrasValor]=useState(0);
 const[pontoFaltasCount,setPontoFaltasCount]=useState(0);

 const[weekOffset,setWeekOffset]=useState<number>(-1);
 const bounds=useMemo(()=>getWorkWeekBounds(weekOffset),[weekOffset]);
 const descBounds=useMemo(()=>getDescontosValesBounds(bounds.start,bounds.end),[bounds.start,bounds.end]);
 const salarioSemanal=calcularSalarioSemanal(salarioBase);

 useEffect(()=>{let ok=true;(async()=>{
   const queries:any[]=[
     supabase.from('comissoes_caixas_semanais').select('id,semana_inicio,semana_fim,status,salario_base,total_comissao,total_descontos,total_pago,saldo_anterior,saldo_final').eq('colaborador_id',colaboradorId).eq('semana_inicio',bounds.start).maybeSingle(),
     supabase.from('comissoes_servicos').select('data,comissao_valor,valor_producao').eq('colaborador_id',colaboradorId).gte('data',bounds.start).lte('data',bounds.end).is('deleted_at',null).neq('status','CANCELADO'),
     getDescontosFromSupabase(colaboradorId),
     supabase.from('comissoes_pagamentos').select('id,caixa_id,valor,data').eq('colaborador_id',colaboradorId).gte('data',descBounds.start).lte('data',descBounds.end)
   ];

   if (utilizaPontoEletronico) {
     queries.push(
       supabase.from('ponto_funcionarios').select('id, tolerancia_minutos').eq('colaborador_id', colaboradorId).maybeSingle()
     );
   }

   const res = await Promise.all(queries);
   const c = res[0], s = res[1], d = res[2], p = res[3];
   let debMin = 0;
   let extMin = 0;
   let totalTrab = 0;
   let valFer = 0;
   let valExt = 0;
   let faltasCountVal = 0;

   if (utilizaPontoEletronico && res[4]?.data?.id) {
     const pFuncId = res[4].data.id;
     const tol = res[4].data.tolerancia_minutos ?? 10;
     const [bRes, rRes, jRes] = await Promise.all([
       supabase.from('ponto_banco_horas').select('minutos, tipo').eq('funcionario_id', pFuncId).gte('data', bounds.start).lte('data', bounds.end),
       supabase.from('ponto_registros').select('*').eq('funcionario_id', pFuncId).gte('data', limitarInicioPonto(bounds.start)).lte('data', bounds.end),
       supabase.from('ponto_jornadas').select('*').eq('funcionario_id', pFuncId)
     ]);
     
     (bRes.data || []).forEach((bh: any) => {
       const m = Number(bh.minutos) || 0;
       if (m < 0) debMin += Math.abs(m);
       else if (m > 0) extMin += m;
     });

     const rMap = new Map((rRes.data || []).map((rx: any) => [rx.data, rx]));
     const startD = new Date(bounds.start + 'T12:00:00');
     const diasParaExtras = [];
     for (let i = 0; i < 7; i++) {
       const dStr = new Date(startD.getTime() + i * 86400000).toISOString().split('T')[0];
       const rx = rMap.get(dStr);
       const jx = (jRes.data || []).find((jj: any) => jj.dia_semana === new Date(dStr + 'T12:00:00').getDay()) || (jRes.data || [])[0];
       const ax = analisarDia(rx, jx, dStr, hojeStr(), tol);
       totalTrab += ax.trabalhados;
       const dow = new Date(dStr + 'T12:00:00').getDay();
       const isWorkingDay = jx ? jx.trabalha : dow !== 0;
       if (ax.status === 'ausente' && isWorkingDay && !ehFeriado(dStr)) {
         faltasCountVal++;
       }
       diasParaExtras.push({
         data: dStr,
         trabalhados: ax.trabalhados,
         previstos: ax.previstos,
         extra: ax.extra
       });
     }
     const extRes = resumoExtras(diasParaExtras, salarioBase, tol);
     const destinacaoSal = localStorage.getItem(`rpro_ponto_dest_${colaboradorId}`) || 'pagar';
     // Feriado sem batida é abonado (sempre pago); o adicional do dobro vai para o salário ou para o banco de horas.
     valFer = extRes.valorAbonos + (destinacaoSal === 'pagar' ? extRes.valorFeriados : 0);
     valExt = destinacaoSal === 'pagar' ? extRes.valorExtras : 0;
   }

   if(ok){
     setCaixa(c.data||null);
     setServicos(s.data||[]);
     setDescontos(d||[]);
     setPagamentos(p.data||[]);
     setPontoDebitoMinutos(debMin);
     setPontoExtraMinutos(extMin);
     setPontoTrabalhadoMinutos(totalTrab);
     setPontoFeriadosValor(valFer);
     setPontoExtrasValor(valExt);
     setPontoFaltasCount(faltasCountVal);
     setLoading(false);
   }
 })();return()=>{ok=false}},[colaboradorId,bounds.start,bounds.end,descBounds.start,descBounds.end,utilizaPontoEletronico,salarioBase]);

 const[receitaLoja,setReceitaLoja]=useState(0);
 useEffect(()=>{if(modalidade!=='meta')return;let ok=true;supabase.from('vendas').select('total,status,down_payment').gte('created_at',bounds.start).lte('created_at',bounds.end + 'T23:59:59.999Z').is('deleted_at',null).then(({data})=>{if(!ok)return;setReceitaLoja((data||[]).filter((v:any)=>{if(v.status==='canceled')return false;const t=Number(v.total)||0,d=Number(v.down_payment)||0;return t>0&&(v.status==='completed'||d>=t)}).reduce((a:number,v:any)=>a+(Number(v.total)||0),0))});return()=>{ok=false}},[modalidade,bounds.start,bounds.end]);

 const calc=useMemo(()=>{
   const fechado=caixa?.status==='fechado';
   const comissaoServicos=servicos.reduce((s,x)=>s+(Number(x.comissao_valor)||0),0),producao=servicos.reduce((s,x)=>s+(Number(x.valor_producao)||0),0);
   const rem=calcularRemuneracaoSemanal({modalidade,salarioBase:salarioSemanal,comissaoPadraoPercentual,metaPercentual,metasValores,metaValorMinimo,metaValorMaximo,faturamentoGeral:receitaLoja},producao,comissaoServicos);
   
   const valorHora = salarioBase > 0 ? salarioBase / 220 : 0;
   const salarioHorasTrabalhadas = valorHora * (pontoTrabalhadoMinutos / 60);
   const valorDiariaVal = salarioBase > 0 ? salarioBase / 30 : 0;
   const descontoDSR = pontoFaltasCount > 0 ? valorDiariaVal : 0;
   const baseCalculada = modalidade==='meta'?0: (utilizaPontoEletronico ? Math.max(0, salarioHorasTrabalhadas + pontoFeriadosValor + pontoExtrasValor - descontoDSR) : salarioSemanal);

   const base=fechado&&caixa?.salario_base!==null&&caixa?.salario_base!==undefined?Number(caixa.salario_base)||baseCalculada:baseCalculada;
   const comissao=rem.comissaoEfetiva;
   
   // Valor por minuto = Salário Mensal / (220 horas * 60 minutos) = Salário Mensal / 13200
   const valorMinuto = salarioBase > 0 ? salarioBase / (220 * 60) : 0;
   const descontoPontoValor = pontoDebitoMinutos > 0 ? pontoDebitoMinutos * valorMinuto : 0;

   const descBase=fechado&&caixa?.total_descontos!==null&&caixa?.total_descontos!==undefined?Number(caixa.total_descontos)||0:calculateDescontosNoPeriodo(descontos,descBounds.start,descBounds.end);
   const desc = descBase + descontoPontoValor;

   const saldoAnterior=Number(caixa?.saldo_anterior)||0;
   const pago=pagamentos.filter(x=>!caixa?.id||x.caixa_id===caixa.id).reduce((s,x)=>s+(Number(x.valor)||0),0);
   const previsao=Math.max(0,base+comissao-desc+saldoAnterior);
   return{base,comissao,desc,descontoPontoValor,pontoDebitoMinutos,pontoExtraMinutos,pontoFeriadosValor,pontoExtrasValor,saldoAnterior,pago,total:Math.max(0,Number((previsao-pago).toFixed(2)))};
 },[caixa,servicos,descontos,pagamentos,descBounds.start,descBounds.end,salarioSemanal,modalidade,comissaoPadraoPercentual,metaPercentual,metasValores,metaValorMinimo,metaValorMaximo,receitaLoja,pontoDebitoMinutos,utilizaPontoEletronico,pontoTrabalhadoMinutos,pontoFeriadosValor,pontoExtrasValor,salarioBase]);

  const ehSabado = new Date().getDay() === 6;
  const pagamentoLabel=ehSabado?'hoje':'no próximo sábado';
 const formatLabelData=(d:string)=>{const p=d.split('-');return `${p[2]}/${p[1]}`;};

 if(loading)return <div className="p-8 text-center text-sm text-[var(--text-muted)]">Calculando Meu Salário...</div>;
 return <div className="space-y-5">
   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
     <div>
       <h2 className="text-2xl font-black">Meu Salário</h2>
       <p className="text-sm text-[var(--text-muted)] mt-1">{nome} · salário + comissões − descontos · pagamento {pagamentoLabel}</p>
     </div>

     {/* Navegação entre Semanas */}
     <div className="flex items-center gap-1 bg-[var(--bg-card)] p-1 rounded-2xl border border-[var(--border-color)] shadow-sm">
       <button
         type="button"
         onClick={()=>setWeekOffset(v=>v-1)}
         className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--bg-card-sec)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-xs font-bold transition-all cursor-pointer"
         title="Semana anterior"
       >
         <ChevronLeft className="w-4 h-4 text-[var(--accent-red)]"/>
         <span>Anterior</span>
       </button>

       <div className="px-3 py-1 text-center min-w-[150px]">
         <span className="text-xs font-black font-mono text-[var(--text-main)] block">
           {formatLabelData(bounds.start)} a {formatLabelData(bounds.end)}
         </span>
         <span className={`text-[10px] font-black uppercase tracking-wider block ${weekOffset === -1 ? 'text-amber-400' : weekOffset === 0 ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
           {weekOffset === -1 ? '◀ Semana Passada (Pagamento)' : weekOffset === 0 ? '● Semana Atual' : `${Math.abs(weekOffset)} semanas atrás`}
         </span>
       </div>

       <button
         type="button"
         onClick={()=>setWeekOffset(v=>v+1)}
         className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--bg-card-sec)] hover:bg-[var(--border-color)] text-[var(--text-main)] text-xs font-bold transition-all cursor-pointer"
         title="Próxima semana"
       >
         <span>Próxima</span>
         <ChevronRight className="w-4 h-4 text-[var(--accent-red)]"/>
       </button>
     </div>
   </div>

   <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
     <div className="flex items-center gap-3 mb-4"><Wallet className="w-6 h-6 text-[var(--accent-red)]"/><div><p className="text-xs text-[var(--text-muted)] uppercase font-bold">Salário mensal cadastrado</p><b className="text-2xl">{formatCurrency(salarioBase)}</b><p className="text-xs text-[var(--text-muted)] mt-1">Salário base proporcional às horas trabalhadas no ponto</p></div></div>
     <div className={`grid grid-cols-2 ${modalidade === 'fixo' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-3`}>
       <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4">
         <Wallet className="w-5 h-5 mb-3 text-[var(--accent-red)]"/>
         <b className="text-xs lg:text-sm font-mono block">
           {utilizaPontoEletronico 
             ? `Salário: ${formatCurrency(salarioBase)}: ${formatCurrency(calc.base)}`
             : `Salário: ${formatCurrency(calc.base)}`}
         </b>
         <p className="text-xs text-[var(--text-muted)]">Base mensal e proporcional</p>
       </div>
       {modalidade !== 'fixo' && (
         <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4"><CircleDollarSign className="w-5 h-5 mb-3 text-emerald-500"/><b className="text-xl">{formatCurrency(calc.comissao)}</b><p className="text-xs text-[var(--text-muted)]">Comissões</p></div>
       )}
       <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4"><MinusCircle className="w-5 h-5 mb-3 text-rose-500"/><b className="text-xl">-{formatCurrency(calc.desc)}</b><p className="text-xs text-[var(--text-muted)]">Descontos</p></div>
       <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4"><CalendarClock className="w-5 h-5 mb-3 text-[var(--accent-red)]"/><b className="text-xl">{formatCurrency(calc.total)}</b><p className="text-xs text-[var(--text-muted)]">A receber {pagamentoLabel}</p></div>
     </div>
   </div>

   {utilizaPontoEletronico && (calc.pontoDebitoMinutos > 0 || calc.pontoExtraMinutos > 0) && (
     <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex items-center justify-between">
       <div className="flex items-center gap-3">
         <div className="w-10 h-10 rounded-2xl bg-primary-500/10 text-primary-400 flex items-center justify-center">
           <Clock className="w-5 h-5" />
         </div>
         <div>
           <h4 className="text-sm font-bold">Apuração do Ponto Eletrônico (Semana)</h4>
           <p className="text-xs text-[var(--text-muted)]">
             {calc.pontoDebitoMinutos > 0 ? `⚠️ Horas devidas / faltas: ${Math.floor(calc.pontoDebitoMinutos / 60)}h ${calc.pontoDebitoMinutos % 60}min` : ''}
             {calc.pontoDebitoMinutos > 0 && calc.pontoExtraMinutos > 0 ? ' · ' : ''}
             {calc.pontoExtraMinutos > 0 ? `✨ Horas extras: ${Math.floor(calc.pontoExtraMinutos / 60)}h ${calc.pontoExtraMinutos % 60}min` : ''}
           </p>
         </div>
       </div>
       {calc.pontoDebitoMinutos > 0 && (
         <div className="text-right">
           <span className="text-xs font-black text-rose-400 block">-{formatCurrency(calc.descontoPontoValor)}</span>
           <span className="text-[10px] text-[var(--text-muted)]">Descontado no salário</span>
         </div>
       )}
     </div>
   )}

   <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
     <h3 className="font-black mb-4">Composição do fechamento</h3>
     <div className="space-y-2 text-sm">
       <div className="flex justify-between"><span>Saldo da semana anterior</span><b className={calc.saldoAnterior < 0 ? "text-rose-500" : "text-emerald-500"}>{formatCurrency(calc.saldoAnterior)}</b></div>
       <div className="flex justify-between">
         <span>Salário {utilizaPontoEletronico ? `(Proporcional às horas do ponto)` : ''}</span>
         <b>{formatCurrency(calc.base)}</b>
       </div>
       <div className="flex justify-between"><span>Comissões</span><b className="text-emerald-500">+{formatCurrency(calc.comissao)}</b></div>
       <div className="flex justify-between"><span>Descontos da semana</span><b className="text-rose-500">-{formatCurrency(calc.desc)}</b></div>
       {calc.pontoDebitoMinutos > 0 && <div className="flex justify-between text-xs text-rose-400 pl-3"><span>↳ Desconto de horas de ponto ({calc.pontoDebitoMinutos} min)</span><b>-{formatCurrency(calc.descontoPontoValor)}</b></div>}
       {calc.pago>0&&<div className="flex justify-between"><span>Já recebido</span><b className="text-rose-500">-{formatCurrency(calc.pago)}</b></div>}
       <div className="pt-3 mt-3 border-t border-[var(--border-color)] flex justify-between text-base"><b>Total a receber {pagamentoLabel}</b><b>{formatCurrency(calc.total)}</b></div>
     </div>
   </div>
   {!caixa&&<div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex gap-3 items-center"><LockKeyhole className="w-5 h-5 text-[var(--accent-red)]"/><p className="text-sm text-[var(--text-muted)]">O fechamento deste ciclo ainda não foi criado no sistema. A base semanal continua sendo calculada pelo salário proporcional às horas trabalhadas no ponto.</p></div>}
 </div>;
};
