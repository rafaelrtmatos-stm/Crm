import React,{useEffect,useMemo,useState}from'react';
import{supabase}from'../../supabase';
import{formatCurrency}from'../utils/storage';
import{getWorkWeekBounds,getDescontosValesBounds}from'../utils/caixaSemanalStorage';
import{diaEspecial,diasEspeciaisDoAno,diasEntre,ehFeriado}from'../../lib/feriados';
import{PontoJornada,PontoRegistro,limitarInicioPonto,PONTO_DATA_INICIO,fmtHM,hhmm,hojeStr,jornadaDoDia,minutosPrevistos,somarDias}from'../../lib/pontoCalc';
import{analisarSemanaPonto,calcularSalarioPonto,minutosDiferencaSemanaBanco,getDestinacaoExtras,setDestinacaoExtras}from'../utils/salarioPonto';
import{Clock3,CalendarDays,WalletCards,Coffee,ChevronLeft,ChevronRight,Pencil}from'lucide-react';
import{BancoHorasLancamentos}from'../../components/ponto/BancoHorasLancamentos';
import{RegistroModal}from'../../components/ponto/PontoModals';
import{salvarRegistroPonto}from'../../lib/pontoRegistroSalvar';
import{buscarDecisaoDsr,buscarUltimaAlteracaoDsr,salvarDecisaoDsr}from'../../lib/pontoDsr';
import{showAlert}from'../../lib/notify';
import{useRealtimeReload}from'../../lib/useRealtimeReload';

const DsrControle:React.FC<{faltas:string[];desconta:boolean;automatico:boolean;valor:number;info:{alterado_por:string|null;alterado_em:string}|null;salvando:boolean;onChange:(v:boolean)=>void}>=({faltas,desconta,automatico,valor,info,salvando,onChange})=>(
  <div className={'rounded-xl border px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 '+(desconta?'border-rose-500/30 bg-rose-500/10':'border-[var(--border-color)] bg-[var(--bg-card-sec)]')}>
    <div className="text-xs">
      <b className={desconta?'text-rose-400':'text-[var(--text-main)]'}>DSR da semana: {desconta?`descontar ${formatCurrency(valor)}`:'não descontar'}</b>
      <span className="block text-[10px] text-[var(--text-muted)]">
        Referente a: {faltas.join(' · ')} — desconto aplicado uma única vez na semana{automatico?' · automático':''}
        {info?` · alterado${info.alterado_por?` por ${info.alterado_por}`:''} em ${new Date(info.alterado_em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}`:''}
      </span>
    </div>
    <div className="flex gap-1 shrink-0">
        {([true,false] as const).map(v=>(
          <button key={String(v)} type="button" disabled={salvando} onClick={()=>desconta!==v&&onChange(v)} className={'px-3 py-1 rounded-lg text-xs font-bold border transition-all '+(salvando?'opacity-60 cursor-wait ':'cursor-pointer ')+(desconta===v?'bg-[var(--accent-red)] border-[var(--accent-red)] text-white':'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)]')}>{v?'Descontar DSR':'Não descontar'}</button>
        ))}
    </div>
  </div>
);

export const MeuPontoView:React.FC<{colaboradorId:string;nome:string;salarioBase:number;canEdit?:boolean;alteradoPor?:string}>=({colaboradorId,nome,salarioBase,canEdit=false,alteradoPor})=>{
 const[func,setFunc]=useState<any>(null);
 const[registros,setRegistros]=useState<PontoRegistro[]>([]);
 const[jornadas,setJornadas]=useState<PontoJornada[]>([]);
 const[banco,setBanco]=useState<any[]>([]);
 const[loading,setLoading]=useState(true);
 const[editReg,setEditReg]=useState<{funcionario_id:string;data:string;reg:PontoRegistro|null}|null>(null);
 const[reloadKey,setReloadKey]=useState(0);
 // Tempo real: batidas, banco de horas e decisão do DSR (de outro admin/aba) atualizam a semana na hora.
 const rtTick=useRealtimeReload(['ponto_registros','ponto_banco_horas','ponto_dsr_semanal','ponto_jornadas']);
 // Decisão do DSR da semana exibida: true/false salvo no Supabase; null = automático (sem decisão salva).
 const[dsrDecisao,setDsrDecisao]=useState<boolean|null>(null);
 const[dsrInfo,setDsrInfo]=useState<{alterado_por:string|null;alterado_em:string}|null>(null);
 const[dsrSalvando,setDsrSalvando]=useState(false);

 // Semana de pagamento do ponto: sempre o ciclo anterior ao exibido (ex.: ciclo 17/10 a 23/10, inclusive no sábado 24/10 -> ponto de 10/10 a 16/10).
 const pagamentoOffset=-1;
 const[weekOffset,setWeekOffset]=useState<number>(pagamentoOffset);
 const [destinacaoExtra, setDestinacaoExtra] = useState<'pagar' | 'folga'>(() => canEdit ? getDestinacaoExtras(colaboradorId) : 'pagar');
 const handleSetDestinacao = (val: 'pagar' | 'folga') => {
   if (!canEdit) return;
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
       const [rRes,jRes,bRes,dsrDec,dsrAlt]=await Promise.all([
         supabase.from('ponto_registros').select('*').eq('funcionario_id',f.id).gte('data',limitarInicioPonto(bounds.start)).lte('data',bounds.end),
         supabase.from('ponto_jornadas').select('*').eq('funcionario_id',f.id),
         supabase.from('ponto_banco_horas').select('*').eq('funcionario_id',f.id),
         buscarDecisaoDsr(f.id,bounds.start),
         buscarUltimaAlteracaoDsr(f.id,bounds.start)
       ]);
       if(ok){
         setDsrDecisao(dsrDec);
         setDsrInfo(dsrDec===null?null:dsrAlt);
         setRegistros(rRes.data||[]);
         setJornadas(jRes.data||[]);
         setBanco(bRes.data||[]);
       }
     }
     setLoading(false);
   })();
   return()=>{ok=false};
 },[colaboradorId,bounds.start,bounds.end,reloadKey,rtTick]);

 // Admin corrige as batidas do dia (mesma gravação do Registro de Ponto no Controle de Ponto) e recarrega a semana.
 const salvarRegistro=async(fid:string,data:string,h:Partial<PontoRegistro>)=>{
   const{error}=await salvarRegistroPonto(fid,data,h);
   if(error){showAlert(`Erro ao salvar registro de ponto: ${error.message}`);return;}
   setEditReg(null);
   setReloadKey(k=>k+1);
   showAlert('Registro de ponto salvo com sucesso.');
 };

 // Ativa/desativa o desconto do DSR SÓ desta semana (funcionário + sábado do ciclo) e persiste no Supabase.
 const alterarDsr=async(desconta:boolean)=>{
   if(!func||dsrSalvando)return;
   const anterior=dsrDecisao,infoAnterior=dsrInfo;
   setDsrSalvando(true);
   setDsrDecisao(desconta);
   const{error}=await salvarDecisaoDsr(func.id,bounds.start,desconta,alteradoPor||null);
   setDsrSalvando(false);
   if(error){setDsrDecisao(anterior);setDsrInfo(infoAnterior);showAlert(`Erro ao salvar o DSR da semana: ${error.message}`);return;}
   setDsrInfo({alterado_por:alteradoPor||null,alterado_em:new Date().toISOString()});
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
 const anoFim=Number(bounds.end.slice(0,4));
 const mesFim=Number(bounds.end.slice(5,7));
 const feriadosMes=useMemo(()=>{
   const meses=new Set([anoSelecao+'-'+mesSelecao,anoFim+'-'+mesFim]);
   return [...new Set([anoSelecao,anoFim])].flatMap(a=>diasEspeciaisDoAno(a)).filter(d=>meses.has(Number(d.data.slice(0,4))+'-'+Number(d.data.slice(5,7))));
 },[anoSelecao,mesSelecao,anoFim,mesFim]);

 // Resumo salarial: mesma fonte de cálculo do Meu Salário, Dashboard e Caixa (salarioPonto.ts).
 const sal=calcularSalarioPonto({salarioMensal:salarioBase,tolerancia:func?.tolerancia_minutos??10,dias:semana.map(d=>d.dia),destinacao:destinacaoExtra,descontarDSR:dsrDecisao});
 const extras=sal.extras;
 const pagaExtras=sal.pagaExtras;
 const salarioHorasTrabalhadas=sal.salarioHorasTrabalhadas;
 const descontoDSR=sal.descontoDSR;
 const valorFeriadosPago=sal.valorFeriadosPago;
 const valorExtrasPago=sal.valorExtrasPago;
 const totalSemana=sal.base;

 // O controle do DSR fica logo acima do primeiro dia com falta injustificada (inteira ou só um período) da semana.
 const primeiroDiaFalta=semana.find(d=>d.dia.falta||!!d.dia.faltaParcial)?.data;

 const faltasDescricao=semana.filter(d=>d.dia.falta||!!d.dia.faltaParcial).map(d=>new Date(d.data+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})+(d.dia.faltaParcial?` (${d.dia.faltaParcial==='manha'?'manhã':'tarde'})`:' (dia inteiro)'));

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

  {esp&&<div className={'rounded-2xl border p-4 text-sm '+(esp.tipo==='feriado'?'bg-amber-500/10 border-amber-500/30 text-amber-200':'bg-sky-500/10 border-sky-500/30 text-sky-200')}><b>{esp.tipo==='feriado'?'Hoje é feriado':'Hoje é ponto facultativo'}: {esp.nome}.</b> {esp.tipo==='feriado'?'Se trabalhar hoje, as horas trabalhadas valem o dobro (em dinheiro ou no banco de horas). Se não vier, o dia é abonado e não desconta.':(esp.apartirDe?'Ponto facultativo a partir das '+esp.apartirDe.replace(':00','h')+'; antes disso o expediente é normal. Não é feriado: sem dobra.':'Ponto facultativo não é feriado oficial; ausência sem acordo pode gerar falta.')}</div>}
  
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
        {sal.dsrDesconta && (
          <div className="flex justify-between">
            <span className="text-rose-400">Desconto DSR (Folga perdida por falta):</span>
            <b className="text-rose-400">-{formatCurrency(descontoDSR)}</b>
          </div>
        )}
        {sal.dsrAplicavel && !sal.dsrDesconta && (
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">DSR da semana mantido (falta registrada, sem desconto):</span>
            <b className="text-[var(--text-muted)]">{formatCurrency(0)}</b>
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
          {canEdit ? (
            <div className="flex gap-1">
              {(['pagar','folga'] as const).map(v=>(
                <button key={v} type="button" onClick={()=>handleSetDestinacao(v)} className={'px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer '+(destinacaoExtra===v?'bg-[var(--accent-red)] border-[var(--accent-red)] text-white':'bg-[var(--bg-card-sec)] border-[var(--border-color)] text-[var(--text-muted)]')}>{v==='pagar'?'Pagar':'Banco de horas'}</button>
              ))}
            </div>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">{destinacaoExtra==='pagar'?'Pagamento':'Banco de horas (definido pelo administrador)'}</span>
          )}
        </div>
        <div className="pt-2 border-t border-[var(--border-color)] flex justify-between text-base font-black">
          <span className="text-[var(--text-main)]">Total a Receber na Semana:</span>
          <span className="text-emerald-400">{formatCurrency(totalSemana)}</span>
        </div>
      </div>
    </div>
  )}

  <div className={card}>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
      <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-[var(--text-main)] truncate">
        Jornada ({formatLabelData(bounds.start)} a {formatLabelData(bounds.end)})
      </h3>
      <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-800/30 self-start sm:self-auto">
        Total: {fmtHM(horas)} / Meta: {fmtHM(prev)}
      </span>
    </div>

    {/* Tabela compacta com fonte menor para mobile e sem quebra de horários/números */}
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <table className="w-full text-[11px] sm:text-xs whitespace-nowrap">
        <thead>
          <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border-color)]">
            <th className="pb-2.5 font-bold uppercase tracking-wider pr-3">Dia</th>
            <th className="pb-2.5 font-bold uppercase tracking-wider px-2">Entrada</th>
            <th className="pb-2.5 font-bold uppercase tracking-wider px-2">Intervalo</th>
            <th className="pb-2.5 font-bold uppercase tracking-wider px-2">Saída</th>
            <th className="pb-2.5 font-bold uppercase tracking-wider px-2">Trabalhado</th>
            <th className="pb-2.5 font-bold uppercase tracking-wider px-2">Saldo</th>
            <th className="pb-2.5 font-bold uppercase tracking-wider px-2">Status</th>
            {canEdit && <th className="pb-2.5 text-right font-bold uppercase tracking-wider pl-2">Editar</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-color)]">
          {semana.map(d => {
            const prevDia = minutosPrevistos(d.j);
            const isFer = ehFeriado(d.data);
            const saldoDia = isFer && d.a.trabalhados === 0 ? 0 : d.a.trabalhados - prevDia;
            const isTrabalha = d.j?.trabalha;
            const dow = new Date(d.data + 'T12:00:00').getDay();
            
            return (
              <React.Fragment key={d.data}>
                {canEdit && d.data === primeiroDiaFalta && (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} className="py-2.5">
                      <DsrControle faltas={faltasDescricao} desconta={sal.dsrDesconta} automatico={dsrDecisao===null} valor={descontoDSR} info={dsrInfo} podeEditar={canEdit} salvando={dsrSalvando} onChange={alterarDsr}/>
                    </td>
                  </tr>
                )}
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 font-bold pr-3">
                    {new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    {d.r?.editado_manual && <span title="Editado manualmente" className="ml-1 text-emerald-400">✎</span>}
                  </td>
                  <td className="py-3 font-mono text-[var(--text-main)] px-2">{hhmm(d.r?.entrada)}</td>
                  <td className="py-3 font-mono text-[var(--text-muted)] px-2">{hhmm(d.r?.inicio_intervalo)} — {hhmm(d.r?.fim_intervalo)}</td>
                  <td className="py-3 font-mono text-[var(--text-main)] px-2">{hhmm(d.r?.saida)}</td>
                  <td className="py-3 font-mono font-bold text-[var(--text-main)] px-2">{fmtHM(d.a.trabalhados)}</td>
                  <td className="py-3 font-mono font-bold px-2">
                    {isTrabalha ? (
                      <span className={saldoDia < 0 ? 'text-rose-400' : saldoDia > 0 ? 'text-emerald-400' : 'text-[var(--text-muted)]'}>
                        {saldoDia > 0 ? `+${fmtHM(saldoDia)}` : saldoDia < 0 ? fmtHM(saldoDia) : '0h 00min'}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">Folga</span>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    {(() => {
                      if (dow === 0 && sal.dsrDesconta) return <span className="text-rose-400 font-semibold">Folga perdida por falta (DSR)</span>;
                      if (dow === 0 && sal.dsrAplicavel) return <span className="text-emerald-400 font-semibold">Folga mantida (sem desconto)</span>;
                      if (d.dia.faltaParcial) return <span className="text-rose-400 font-semibold">Falta parcial ({d.dia.faltaParcial === 'manha' ? 'manhã' : 'tarde'})</span>;
                      if (d.dia.falta) return <span className="text-rose-400 font-bold">Falta injustificada</span>;
                      const x = diaEspecial(d.data);
                      if (!x) return <span className="text-[var(--text-muted)] capitalize">{d.a.status}</span>;
                      return d.a.trabalhados === 0 ? (
                        <span className="text-amber-400 font-semibold">{x.tipo === 'feriado' ? 'Feriado' : 'Facultativo'} · {x.nome}</span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">{d.a.status} · {x.tipo === 'feriado' ? 'dobro' : 'facultativo'}</span>
                      );
                    })()}
                  </td>
                  {canEdit && (
                    <td className="py-3 text-right pl-2">
                      <button
                        type="button"
                        title="Editar registro"
                        onClick={() => setEditReg({ funcionario_id: func.id, data: d.data, reg: d.r || null })}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[var(--bg-card-sec)] cursor-pointer transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[var(--border-color)] bg-[var(--bg-card-sec)]/50 font-bold">
            <td colSpan={4} className="py-3 px-3 uppercase text-[var(--text-main)] font-black text-xs">
              Total da Semana:
            </td>
            <td className="py-3 font-mono text-emerald-400 font-black text-xs px-2">
              {fmtHM(horas)}
            </td>
            <td className="py-3 font-mono font-black text-xs px-2">
              {(() => {
                const saldoSemana = horas - prev;
                return (
                  <span className={saldoSemana < 0 ? 'text-rose-400' : saldoSemana > 0 ? 'text-emerald-400' : 'text-[var(--text-muted)]'}>
                    {saldoSemana > 0 ? `+${fmtHM(saldoSemana)}` : saldoSemana < 0 ? fmtHM(saldoSemana) : '0h 00min'}
                  </span>
                );
              })()}
            </td>
            <td colSpan={canEdit ? 2 : 1} className="py-3 text-right text-[var(--text-muted)] font-normal text-[10px] px-2">
              Meta: {fmtHM(prev)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
  
  <div className={card}>
    <div className="flex items-center justify-between mb-3">
      <div>
        <h3 className="font-black text-sm uppercase tracking-wider text-[var(--text-main)]">
          Calendário de Feriados e Facultativos ({mesSelecao}/{anoSelecao})
        </h3>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          Feriados oficiais (dobro se trabalhado / abonado se folga) e pontos facultativos.
        </p>
      </div>
    </div>
    
    {feriadosMes.length === 0 ? (
      <p className="text-xs text-[var(--text-muted)] italic py-3 text-center">Nenhum feriado ou ponto facultativo registrado para este mês.</p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {feriadosMes.map(f => {
          const n = diasEntre(hojeStr(), f.data);
          const dtFmt = new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
          const isFeriado = f.tipo === 'feriado';
          return (
            <div key={f.data} className={'p-3 rounded-xl border flex flex-col justify-between gap-2 ' + (isFeriado ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-sky-500/10 border-sky-500/30 text-sky-200')}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-black text-xs leading-tight text-white">{f.nome}</span>
                <span className={'text-[9px] font-black uppercase px-2 py-0.5 rounded-full border whitespace-nowrap ' + (isFeriado ? 'border-amber-500/40 text-amber-300 bg-amber-950/40' : 'border-sky-500/40 text-sky-300 bg-sky-950/40')}>
                  {isFeriado ? 'Feriado' : f.tipo === 'folga_abonada' ? 'Folga Abonada' : 'Facultativo'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/10 font-mono">
                <span className="font-bold text-white/90">{dtFmt}{f.apartirDe ? ` (a partir ${f.apartirDe.replace(':00', 'h')})` : ''}</span>
                <span className="text-[10px] font-semibold text-[var(--text-muted)]">{n === 0 ? 'É HOJE' : n > 0 ? `em ${n} dias` : `há ${Math.abs(n)} dias`}</span>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
  {canEdit&&editReg&&<RegistroModal ctx={editReg} onClose={()=>setEditReg(null)} onSave={salvarRegistro}/>}
 </div>
};