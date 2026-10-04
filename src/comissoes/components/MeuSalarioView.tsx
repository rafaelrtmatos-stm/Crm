import React,{useEffect,useMemo,useState}from'react';
import{CalendarClock,CircleDollarSign,MinusCircle,Wallet,LockKeyhole}from'lucide-react';
import{supabase}from'../../supabase';
import{formatCurrency}from'../utils/storage';
import{calculateDescontosNoPeriodo,getDescontosFromSupabase,calcularSalarioSemanal}from'../utils/supabaseStorage';
import{getDescontosValesBounds,getWorkWeekBounds}from'../utils/caixaSemanalStorage';

export const MeuSalarioView:React.FC<{colaboradorId:string;nome:string;salarioBase:number}>=({colaboradorId,nome,salarioBase})=>{
 const[caixa,setCaixa]=useState<any>(null),[servicos,setServicos]=useState<any[]>([]),[descontos,setDescontos]=useState<any[]>([]),[pagamentos,setPagamentos]=useState<any[]>([]),[loading,setLoading]=useState(true);
 const hoje=new Date(),ehSabado=hoje.getDay()===6,comissaoOffset=ehSabado?-1:0,comissaoBounds=useMemo(()=>getWorkWeekBounds(comissaoOffset),[comissaoOffset]),bounds=comissaoBounds,descBounds=useMemo(()=>getDescontosValesBounds(bounds.start,bounds.end),[bounds.start,bounds.end]);
 const salarioSemanal=calcularSalarioSemanal(salarioBase);
 useEffect(()=>{let ok=true;(async()=>{
   const[c,s,d,p]=await Promise.all([
     supabase.from('comissoes_caixas_semanais').select('id,semana_inicio,semana_fim,status,salario_base,total_comissao,total_descontos,total_pago,saldo_anterior,saldo_final').eq('colaborador_id',colaboradorId).eq('semana_inicio',bounds.start).maybeSingle(),
     supabase.from('comissoes_servicos').select('data,comissao_valor,valor_producao').eq('colaborador_id',colaboradorId).gte('data',comissaoBounds.start).lte('data',comissaoBounds.end).is('deleted_at',null).neq('status','CANCELADO'),
     getDescontosFromSupabase(colaboradorId),
     supabase.from('comissoes_pagamentos').select('id,caixa_id,valor,data').eq('colaborador_id',colaboradorId).gte('data',descBounds.start).lte('data',descBounds.end)
   ]);
   if(ok){setCaixa(c.data||null);setServicos(s.data||[]);setDescontos(d||[]);setPagamentos(p.data||[]);setLoading(false)}
 })();return()=>{ok=false}},[colaboradorId,bounds.start,bounds.end,descBounds.start,descBounds.end]);

 const calc=useMemo(()=>{
   const fechado=caixa?.status==='fechado';
   const base=fechado&&caixa?.salario_base!==null&&caixa?.salario_base!==undefined?Number(caixa.salario_base)||salarioSemanal:salarioSemanal;
   const comissao=servicos.reduce((s,x)=>s+(Number(x.comissao_valor)||0),0);
   const desc=fechado&&caixa?.total_descontos!==null&&caixa?.total_descontos!==undefined?Number(caixa.total_descontos)||0:calculateDescontosNoPeriodo(descontos,descBounds.start,descBounds.end);
   const saldoAnterior=Number(caixa?.saldo_anterior)||0;
   return{base,comissao,desc,saldoAnterior,total:base+comissao-desc+saldoAnterior};
 },[caixa,servicos,descontos,pagamentos,descBounds.start,descBounds.end,salarioSemanal]);

 const pagamentoLabel=ehSabado?'hoje':'no próximo sábado';
 const cicloLabel=`${bounds.start.split('-').reverse().join('/')} a ${bounds.end.split('-').reverse().join('/')}`;
 if(loading)return <div className="p-8 text-center text-sm text-[var(--text-muted)]">Calculando Meu Salário...</div>;
 return <div className="space-y-5">
   <div><h2 className="text-2xl font-black">Meu Salário</h2><p className="text-sm text-[var(--text-muted)] mt-1">{nome} · salário + comissões − descontos · pagamento {pagamentoLabel}</p></div>
   <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
     <div className="flex items-center gap-3 mb-4"><Wallet className="w-6 h-6 text-[var(--accent-red)]"/><div><p className="text-xs text-[var(--text-muted)] uppercase font-bold">Salário mensal cadastrado</p><b className="text-2xl">{formatCurrency(salarioBase)}</b><p className="text-xs text-[var(--text-muted)] mt-1">Base salarial semanal: {formatCurrency(salarioSemanal)}</p></div></div>
     <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
       <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4"><Wallet className="w-5 h-5 mb-3 text-[var(--accent-red)]"/><b className="text-xl">{formatCurrency(calc.base)}</b><p className="text-xs text-[var(--text-muted)]">Salário</p></div>
       <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4"><CircleDollarSign className="w-5 h-5 mb-3 text-emerald-500"/><b className="text-xl">{formatCurrency(calc.comissao)}</b><p className="text-xs text-[var(--text-muted)]">Comissões</p></div>
       <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4"><MinusCircle className="w-5 h-5 mb-3 text-rose-500"/><b className="text-xl">-{formatCurrency(calc.desc)}</b><p className="text-xs text-[var(--text-muted)]">Descontos</p></div>
       <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl p-4"><CalendarClock className="w-5 h-5 mb-3 text-[var(--accent-red)]"/><b className="text-xl">{formatCurrency(calc.total)}</b><p className="text-xs text-[var(--text-muted)]">A receber {pagamentoLabel}</p></div>
     </div>
   </div>
   <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
     <h3 className="font-black mb-4">Composição do fechamento</h3>
     <div className="space-y-2 text-sm">
       <div className="flex justify-between"><span>Saldo da semana anterior</span><b className={calc.saldoAnterior < 0 ? "text-rose-500" : "text-emerald-500"}>{formatCurrency(calc.saldoAnterior)}</b></div>
       <div className="flex justify-between"><span>Salário</span><b>{formatCurrency(calc.base)}</b></div>
       <div className="flex justify-between"><span>Comissões</span><b className="text-emerald-500">+{formatCurrency(calc.comissao)}</b></div>
       <div className="flex justify-between"><span>Descontos da semana</span><b className="text-rose-500">-{formatCurrency(calc.desc)}</b></div>

       <div className="pt-3 mt-3 border-t border-[var(--border-color)] flex justify-between text-base"><b>Total a receber {pagamentoLabel}</b><b>{formatCurrency(calc.total)}</b></div>
     </div>
   </div>
   {!caixa&&<div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex gap-3 items-center"><LockKeyhole className="w-5 h-5 text-[var(--accent-red)]"/><p className="text-sm text-[var(--text-muted)]">O fechamento deste ciclo ainda não foi criado no sistema. A base semanal continua sendo calculada pelo salário mensal.</p></div>}
 </div>;
};
