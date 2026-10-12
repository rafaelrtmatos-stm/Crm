import React,{useEffect,useMemo,useState}from'react';
import{CalendarDays,Clock3,WalletCards,Coffee,ChevronLeft,ChevronRight}from'lucide-react';
import{supabase}from'../../supabase';
import{formatCurrency}from'../utils/storage';
import{diaEspecial,proximosDiasEspeciais,diasEntre,resumoExtras,valorFeriadoTrabalhado,valorHoraExtra}from'../../lib/feriados';
import{PontoJornada,PontoRegistro,analisarDia,fmtHM,hhmm,hojeStr,jornadaDoDia,minutosPrevistos,somarDias}from'../../lib/pontoCalc';
import{getWorkWeekBounds}from'../utils/caixaSemanalStorage';

export const MeuPontoView:React.FC<{colaboradorId:string;nome:string;salarioBase?:number}>=({colaboradorId,nome,salarioBase=0})=>{
 const[func,setFunc]=useState<any>(null);
 const[jornadas,setJornadas]=useState<PontoJornada[]>([]);
 const[registros,setRegistros]=useState<PontoRegistro[]>([]);
 const[banco,setBanco]=useState<any[]>([]);
 const[loading,setLoading]=useState(true);
 // Semana padrão exibida para o funcionário: -1 (Semana passada, a qual ele vai receber por ela)
 const[weekOffset,setWeekOffset]=useState<number>(-1);

 const hoje=hojeStr();
 const bounds=useMemo(()=>getWorkWeekBounds(weekOffset),[weekOffset]);

 useEffect(()=>{
   let ok=true;
   (async()=>{
     const{data:f}=await supabase.from('ponto_funcionarios').select('id,numero_relogio,tolerancia_minutos').eq('colaborador_id',colaboradorId).eq('ativo',true).maybeSingle();
     if(!f){if(ok){setLoading(false);setFunc(null)}return}
     const ini=somarDias(bounds.start,-15);
     const fim=somarDias(bounds.end,7);
     const[j,r,b]=await Promise.all([
       supabase.from('ponto_jornadas').select('*').eq('funcionario_id',f.id),
       supabase.from('ponto_registros').select('*').eq('funcionario_id',f.id).gte('data',ini).lte('data',fim).order('data',{ascending:false}),
       supabase.from('ponto_banco_horas').select('minutos,tipo,validade').eq('funcionario_id',f.id)
     ]);
     if(ok){
       setFunc(f);
       setJornadas(j.data||[]);
       setRegistros(r.data||[]);
       setBanco(b.data||[]);
       setLoading(false);
     }
   })();
   return()=>{ok=false};
 },[colaboradorId,bounds.start,bounds.end]);

 const map=useMemo(()=>new Map(registros.map(r=>[r.data,r])),[registros]);
 const dias=useMemo(()=>Array.from({length:7},(_,i)=>somarDias(bounds.start,i)),[bounds.start]);
 const semana=dias.map(data=>{
   const r=map.get(data)||null;
   const j=jornadaDoDia(jornadas,data);
   const a=analisarDia(r,j,data,hoje,func?.tolerancia_minutos??10);
   return{data,r,j,a};
 });

 const horas=semana.reduce((s,d)=>s+d.a.trabalhados,0);
 const prev=semana.reduce((s,d)=>s+minutosPrevistos(d.j),0);
 const saldo=banco.filter(m=>m.minutos<0||!m.validade||m.validade>=hoje).reduce((s,m)=>s+m.minutos,0);
 
 const esp=diaEspecial(hoje);
 const proximos=proximosDiasEspeciais(hoje,5);
 const extras=resumoExtras(semana.map(d=>({data:d.data,trabalhados:d.a.trabalhados,previstos:d.a.previstos,extra:d.a.extra})),salarioBase,func?.tolerancia_minutos??10);

 const card='bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm';
 if(loading)return <div className="p-8 text-center text-sm text-[var(--text-muted)]">Carregando Meu Ponto...</div>;
 if(!func)return <div className={card}><h2 className="text-lg font-black">Meu Ponto</h2><p className="text-sm text-[var(--text-muted)] mt-2">Seu cadastro ainda não está vinculado ao ponto eletrônico.</p></div>;

 const formatLabelData=(d:string)=>{
   const p=d.split('-');
   return `${p[2]}/${p[1]}`;
 };

 return <div className="space-y-5">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <h2 className="text-2xl font-black">Meu Ponto</h2>
      <p className="text-sm text-[var(--text-muted)] mt-1">{nome} · acompanhamento individual da jornada</p>
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

  {esp&&<div className={'rounded-2xl border p-4 text-sm '+(esp.tipo==='feriado'?'bg-amber-500/10 border-amber-500/30 text-amber-200':'bg-sky-500/10 border-sky-500/30 text-sky-200')}><b>{esp.tipo==='feriado'?'Hoje é feriado':'Hoje é ponto facultativo'}: {esp.nome}.</b> {esp.tipo==='feriado'?('Se trabalhar hoje, o dia é pago em dobro (2× a diária'+(salarioBase>0?' = '+formatCurrency(valorFeriadoTrabalhado(salarioBase)):'')+').'):'Ponto facultativo não dobra o dia; combine com a empresa se haverá expediente.'}</div>}
  
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <div className={card}><Clock3 className="w-5 h-5 mb-3 text-[var(--accent-red)]"/><b className="text-2xl">{fmtHM(horas)}</b><p className="text-xs text-[var(--text-muted)]">Horas na semana</p></div>
    <div className={card}><CalendarDays className="w-5 h-5 mb-3 text-[var(--accent-red)]"/><b className="text-2xl">{fmtHM(prev)}</b><p className="text-xs text-[var(--text-muted)]">Meta prevista</p></div>
    <div className={card}><WalletCards className="w-5 h-5 mb-3 text-[var(--accent-red)]"/><b className="text-2xl">{saldo>=0?'+':'-'}{fmtHM(Math.abs(saldo))}</b><p className="text-xs text-[var(--text-muted)]">Banco de horas</p></div>
    <div className={card}><Coffee className="w-5 h-5 mb-3 text-[var(--accent-red)]"/><b className="text-xl">{weekOffset === 0 ? 'Semana Atual' : 'Histórico'}</b><p className="text-xs text-[var(--text-muted)]">Período selecionado</p></div>
  </div>

  <div className={card}><h3 className="font-black mb-4">Jornada da semana ({formatLabelData(bounds.start)} a {formatLabelData(bounds.end)})</h3><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-color)]"><th className="pb-2">Dia</th><th>Entrada</th><th>Intervalo</th><th>Saída</th><th>Horas</th><th>Status</th></tr></thead><tbody>{semana.map(d=><tr key={d.data} className="border-b border-[var(--border-color)] last:border-0"><td className="py-2 font-bold">{new Date(d.data+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit'})}</td><td>{hhmm(d.r?.entrada)}</td><td>{hhmm(d.r?.inicio_intervalo)} — {hhmm(d.r?.fim_intervalo)}</td><td>{hhmm(d.r?.saida)}</td><td className="font-bold">{fmtHM(d.a.trabalhados)}</td><td>{(()=>{const e=diaEspecial(d.data);if(!e)return d.a.status;return d.a.trabalhados===0?(e.tipo==='feriado'?'Feriado':'Facultativo')+' · '+e.nome:d.a.status+' · '+(e.tipo==='feriado'?'feriado em dobro':'facultativo')})()}</td></tr>)}</tbody></table></div></div>
  <div className={card}><h3 className="font-black mb-4">Próximos feriados e pontos facultativos</h3><ul className="space-y-2 text-sm">{proximos.map(f=>{const n=diasEntre(hoje,f.data);return <li key={f.data} className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] last:border-0 pb-2 last:pb-0"><span><b>{new Date(f.data+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})}</b> · {f.nome}</span><span className="flex items-center gap-2 shrink-0"><small className={'text-[10px] font-black uppercase px-2 py-0.5 rounded-full border '+(f.tipo==='feriado'?'border-amber-500/30 text-amber-300':'border-sky-500/30 text-sky-300')}>{f.tipo==='feriado'?'Feriado':'Facultativo'}</small><small className="text-[var(--text-muted)]">{n===1?'amanhã':'em '+n+' dias'}</small></span></li>})}</ul><p className="text-xs text-[var(--text-muted)] mt-4">Feriado trabalhado = 2× a diária{salarioBase>0?' ('+formatCurrency(valorFeriadoTrabalhado(salarioBase))+')':''} · Hora extra = valor da hora × 1,5{salarioBase>0?' ('+formatCurrency(valorHoraExtra(salarioBase))+'/h)':''}</p></div>
  {salarioBase>0&&(extras.feriadosTrabalhados>0||extras.minutosExtra>0)&&<div className={card}><h3 className="font-black mb-4">Adicionais da semana</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Feriado trabalhado ({extras.feriadosTrabalhados}×)</span><b>{formatCurrency(extras.valorFeriados)}</b></div><div className="flex justify-between"><span>Hora extra ({fmtHM(extras.minutosExtra)})</span><b>{formatCurrency(extras.valorExtras)}</b></div></div></div>}
 </div>
};