import React,{useEffect,useMemo,useState}from'react';
import{supabase}from'../../supabase';
import{formatCurrency}from'../utils/storage';
import{getWorkWeekBounds,getDescontosValesBounds}from'../utils/caixaSemanalStorage';
import{diaEspecial,diasEspeciaisDoAno,diasEntre}from'../../lib/feriados';
import{PontoJornada,PontoRegistro,limitarInicioPonto,PONTO_DATA_INICIO,fmtHM,hhmm,hojeStr,jornadaDoDia,minutosPrevistos,somarDias}from'../../lib/pontoCalc';
import{analisarSemanaPonto,calcularSalarioPonto,minutosDiferencaSemanaBanco,getDestinacaoExtras,setDestinacaoExtras}from'../utils/salarioPonto';
import{Clock3,CalendarDays,WalletCards,Coffee,ChevronLeft,ChevronRight,Pencil}from'lucide-react';
import{BancoHorasLancamentos}from'../../components/ponto/BancoHorasLancamentos';
import{RegistroModal}from'../../components/ponto/PontoModals';
import{salvarRegistroPonto}from'../../lib/pontoRegistroSalvar';
import{showAlert}from'../../lib/notify';

export const MeuPontoView:React.FC<{colaboradorId:string;nome:string;salarioBase:number;canEdit?:boolean}>=({colaboradorId,nome,salarioBase,canEdit=false})=>{
 const[func,setFunc]=useState<any>(null);
 const[registros,setRegistros]=useState<PontoRegistro[]>([]);
 const[jornadas,setJornadas]=useState<PontoJornada[]>([]);
 const[banco,setBanco]=useState<any[]>([]);
 const[loading,setLoading]=useState(true);
 const[editReg,setEditReg]=useState<{funcionario_id:string;data:string;reg:PontoRegistro|null}|null>(null);
 const[reloadKey,setReloadKey]=useState(0);

 // Semana de pagamento do ponto: aos sábados é a semana de 2 ciclos atrás (ex.: sáb 17/10 -> 03/10 a 09/10); de domingo a sexta, a semana passada.
 const pagamentoOffset=new Date().getDay()===6?-2:-1;
 const[weekOffset,setWeekOffset]=useState<number>(pagamentoOffset);
 const [destinacaoExtra, setDestinacaoExtra] = useState<'pagar' | 'folga'>(() => getDestinacaoExtras(colaboradorId));
 const handleSetDestinacao = (val: 'pagar' | 'folga') => {
   setDestinacaoExtra(val);
   setDestinacaoExtras(colaboradorId, val);
 };

 const bounds=useMemo(()=>getWorkWeekBounds(weekOffset),[weekOffset]);

 // Recarrega só o banco de horas depois de lançar/editar/apagar horas (o saldo do card é recalculado).
 const recarregarBanco=async()=>{
   if(!func)return;
   const{data}=await supabase.from('ponto_banco_horas').select('*').eq('funcionario_id',func.id);
   setBanco(data||[]);
 };

 useEffect(()=>{
   let ok=true;
   (async()=>{
     const{data:f}=await supabase.from('ponto_funcionarios').select('id,numero_relogio,tolerancia_minutos').eq('colaborador_id',colaboradorId).eq('ativo',true).maybeSingle();
     if(!ok)return;
     setFunc(f||null);
     if(f){
       const [rRes,jRes,bRes]=await Promise.all([
         supabase.from('ponto_registros').select('*').eq('funcionario_id',f.id).gte('data',limitarInicioPonto(bounds.start)).lte('data',bounds.end),
         supabase.from('ponto_jornadas').select('*').eq('funcionario_id',f.id),
         supabase.from('ponto_banco_horas').select('*').eq('funcionario_id',f.id)
       ]);
       if(ok){
         setRegistros(rRes.data||[]);
         setJornadas(jRes.data||[]);
         setBanco(bRes.data||[]);
       }
     }
     setLoading(false);
   })();
   return()=>{ok=false};
 },[colaboradorId,bounds.start,bounds.end,reloadKey]);

 // Admin corrige as batidas do dia (mesma gravação do Registro de Ponto no Controle de Ponto) e recarrega a semana.
 const salvarRegistro=async(fid:string,data:string,h:Partial<PontoRegistro>)=>{
   const{error}=await salvarRegistroPonto(fid,data,h);
   if(error){showAlert(`Erro ao salvar registro de ponto: ${error.message}`);return;}
   setEditReg(null);
   setReloadKey(k=>k+1);
   showAlert('Registro de ponto salvo com sucesso.');
 };

 const semana=useMemo(()=>analisarSemanaPonto(bounds.start,registros,jornadas,func?.tolerancia_minutos??10,hojeStr()),[bounds.start,registros,jornadas,func]);

  const hoje = hojeStr();
  const horas=semana.reduce((s,d)=>s+d.a.trabalhados,0);
 const prev=semana.reduce((s,d)=>s+minutosPrevistos(d.j),0);

 // Saldo do banco (em tela): com destinação 'pagar' as extras já saem no salário e NÃO entram no banco.
 const diferencaSemana=minutosDiferencaSemanaBanco(semana.map(d=>d.dia),destinacaoExtra,func?.tolerancia_minutos??10,hoje);
 const saldoBancoRegistrado=banco.filter(m=>m.minutos<0||!m.validade||m.validade>=hoje).reduce((s,m)=>s+m.minutos,0);
 const saldoTotal=saldoBancoRegistrado+diferencaSemana;
 
 const esp=diaEspecial(hojeStr());
 const anoSelecao=Number(bounds.start.slice(0,4));
 const mesSelecao=Number(bounds.start.slice(5,7));
 const feriadosMes=useMemo(()=>{
   return diasEspeciaisDoAno(anoSelecao).filter(d=>{
     const p=d.data.split('-');
     return Number(p[0])===anoSelecao && Number(p[1])===mesSelecao;
   });
 },[anoSelecao,mesSelecao]);

 // Resumo salarial: mesma fonte de cálculo do Meu Salário, Dashboard e Caixa (salarioPonto.ts).
 const sal=calcularSalarioPonto({salarioMensal:salarioBase,tolerancia:func?.tolerancia_minutos??10,dias:semana.map(d=>d.dia),destinacao:destinacaoExtra});
 const faltasCount=sal.faltas;
 const extras=sal.extras;
 const pagaExtras=sal.pagaExtras;
 const salarioHorasTrabalhadas=sal.salarioHorasTrabalhadas;
 const descontoDSR=sal.descontoDSR;
 const valorFeriadosPago=sal.valorFeriadosPago;
 const valorExtrasPago=sal.valorExtrasPago;
 const totalSemana=sal.base;

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
        disabled={bounds.start<=PONTO_DATA_INICIO}
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
        <span className={`text-[10px] font-black uppercase tracking-wider block ${weekOffset === pagamentoOffset ? 'text-amber-400' : weekOffset === 0 ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
          {weekOffset === pagamentoOffset ? '◀ Semana Passada (Pagamento)' : weekOffset === 0 ? '● Semana Atual' : `${Math.abs(weekOffset)} semanas atrás`}
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

  {esp&&<div className={'rounded-2xl border p-4 text-sm '+(esp.tipo==='feriado'?'bg-amber-500/10 border-amber-500/30 text-amber-200':'bg-sky-500/10 border-sky-500/30 text-sky-200')}><b>{esp.tipo==='feriado'?'Hoje é feriado':'Hoje é ponto facultativo'}: {esp.nome}.</b> {esp.tipo==='feriado'?'Se trabalhar hoje, as horas trabalhadas valem o dobro (em dinheiro ou no banco de horas). Se não vier, o dia é abonado e não desconta.':'Ponto facultativo não é feriado oficial; ausência sem acordo pode gerar falta.'}</div>}
  
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <div className={card}><Clock3 className="w-5 h-5 mb-3 text-[var(--accent-red)]"/><b className="text-2xl">{fmtHM(horas)}</b><p className="text-xs text-[var(--text-muted)]">Horas na semana</p></div>
    <div className={card}><CalendarDays className="w-5 h-5 mb-3 text-[var(--accent-red)]"/><b className="text-2xl">{fmtHM(prev)}</b><p className="text-xs text-[var(--text-muted)]">Meta prevista</p></div>
    <div className={card}><WalletCards className="w-5 h-5 mb-3 text-[var(--accent-red)]"/><b className={`text-2xl ${saldoTotal < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{saldoTotal > 0 ? '+' : ''}{fmtHM(saldoTotal)}</b><p className="text-xs text-[var(--text-muted)]">Banco de horas</p></div>
    <div className={card}><Coffee className="w-5 h-5 mb-3 text-[var(--accent-red)]"/><b className="text-xl">{weekOffset === 0 ? 'Semana Atual' : 'Histórico'}</b><p className="text-xs text-[var(--text-muted)]">Período selecionado</p></div>
  </div>

  {canEdit&&(
    <div className={card}>
      <BancoHorasLancamentos funcionarioId={func.id} onChanged={recarregarBanco}/>
    </div>
  )}

  {salarioBase>0&&(
    <div className={card}>
      <h3 className="font-black mb-3 text-emerald-400">Resumo Salarial da Semana</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Proporcional às horas trabalhadas ({fmtHM(horas)}):</span>
          <b className="text-[var(--text-main)]">{formatCurrency(salarioHorasTrabalhadas)}</b>
        </div>
        {faltasCount > 0 && (
          <div className="flex justify-between">
            <span className="text-rose-400">Desconto DSR (Folga perdida por falta):</span>
            <b className="text-rose-400">-{formatCurrency(descontoDSR)}</b>
          </div>
        )}
        {extras.feriadosAbonados>0&&(
          <div className="flex justify-between">
            <span className="text-amber-400">Feriado abonado ({extras.feriadosAbonados}×, sem desconto):</span>
            <b className="text-amber-400">{formatCurrency(extras.valorAbonos)}</b>
          </div>
        )}
        {extras.feriadosTrabalhados>0&&(
          <div className="flex justify-between">
            <span className="text-amber-400">Feriado trabalhado ({extras.feriadosTrabalhados}×, adicional do dobro{pagaExtras?'':' → banco de horas'}) ({fmtHM(extras.minutosFeriadoAdicional)}):</span>
            <b className="text-amber-400">{formatCurrency(valorFeriadosPago)}</b>
          </div>
        )}
        {extras.minutosExtra>0&&(
          <div className="flex justify-between">
            <span className="text-sky-400">Horas extras ({fmtHM(extras.minutosExtra)}){pagaExtras?'':' → banco de horas'}:</span>
            <b className="text-sky-400">{formatCurrency(valorExtrasPago)}</b>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-[var(--text-muted)]">Adicional de feriado e horas extras:</span>
          <div className="flex gap-1">
            {(['pagar','folga'] as const).map(v=>(
              <button key={v} type="button" onClick={()=>handleSetDestinacao(v)} className={'px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer '+(destinacaoExtra===v?'bg-[var(--accent-red)] border-[var(--accent-red)] text-white':'bg-[var(--bg-card-sec)] border-[var(--border-color)] text-[var(--text-muted)]')}>{v==='pagar'?'Pagar':'Banco de horas'}</button>
            ))}
          </div>
        </div>
        <div className="pt-2 border-t border-[var(--border-color)] flex justify-between text-base font-black">
          <span className="text-[var(--text-main)]">Total a Receber na Semana:</span>
          <span className="text-emerald-400">{formatCurrency(totalSemana)}</span>
        </div>
      </div>
    </div>
  )}

  <div className={card}><h3 className="font-black mb-4">Jornada da semana ({formatLabelData(bounds.start)} a {formatLabelData(bounds.end)})</h3><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-color)]"><th className="pb-2">Dia</th><th>Entrada</th><th>Intervalo</th><th>Saída</th><th>Horas</th><th>Status</th>{canEdit&&<th className="text-right">Editar</th>}</tr></thead><tbody>{semana.map(d=><tr key={d.data} className="border-b border-[var(--border-color)] last:border-0"><td className="py-2 font-bold">{new Date(d.data+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit'})}{d.r?.editado_manual&&<span title="Editado manualmente" className="ml-1 text-emerald-400">✎</span>}</td><td>{hhmm(d.r?.entrada)}</td><td>{hhmm(d.r?.inicio_intervalo)} — {hhmm(d.r?.fim_intervalo)}</td><td>{hhmm(d.r?.saida)}</td><td className="font-bold">{fmtHM(d.a.trabalhados)}</td><td>{(()=>{const dow=new Date(d.data+'T12:00:00').getDay();if(dow===0&&faltasCount>0)return'Folga perdida por falta';const e=diaEspecial(d.data);if(!e)return d.a.status;return d.a.trabalhados===0?(e.tipo==='feriado'?'Feriado':'Facultativo')+' · '+e.nome+(e.tipo==='feriado'&&d.a.previstos>0?' (abonado)':''):d.a.status+' · '+(e.tipo==='feriado'?'feriado em dobro':'facultativo')})()}</td>{canEdit&&<td className="text-right"><button type="button" title="Editar registro" onClick={()=>setEditReg({funcionario_id:func.id,data:d.data,reg:d.r||null})} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[var(--bg-card-sec)] cursor-pointer"><Pencil className="w-3.5 h-3.5"/></button></td>}</tr>)}</tbody></table></div></div>
  
  <div className={card}>
    <h3 className="font-black mb-2">Feriados e Pontos Facultativos do Mês ({mesSelecao}/{anoSelecao})</h3>
    <p className="text-[11px] text-[var(--text-muted)] mb-3">
      <b>Feriado:</b> Feriado oficial. Se trabalhar, as horas trabalhadas valem o dobro (manhã só = dobro da manhã; dia todo = dobro do dia); se folgar, dia abonado. · <b>Ponto Facultativo:</b> Não é feriado oficial. Ausência sem acordo pode gerar falta; expediente normal.
    </p>
    {feriadosMes.length===0?(
      <p className="text-xs text-[var(--text-muted)] italic">Nenhum feriado ou ponto facultativo registrado para este mês.</p>
    ):(
      <ul className="space-y-2 text-sm">
        {feriadosMes.map(f=>{
          const n=diasEntre(hojeStr(),f.data);
          return <li key={f.data} className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] last:border-0 pb-2 last:pb-0"><span><b>{new Date(f.data+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})}</b> · {f.nome}</span><span className="flex items-center gap-2 shrink-0"><small className={'text-[10px] font-black uppercase px-2 py-0.5 rounded-full border '+(f.tipo==='feriado'?'border-amber-500/30 text-amber-300':'border-sky-500/30 text-sky-300')}>{f.tipo==='feriado'?'Feriado (Dobro/Folga)':'Facultativo (Aviso)'}</small><small className="text-[var(--text-muted)]">{n===0?'hoje':n>0?`em ${n} dias`:`há ${Math.abs(n)} dias`}</small></span></li>;
        })}
      </ul>
    )}
  </div>
  {canEdit&&editReg&&<RegistroModal ctx={editReg} onClose={()=>setEditReg(null)} onSave={salvarRegistro}/>}
 </div>
};