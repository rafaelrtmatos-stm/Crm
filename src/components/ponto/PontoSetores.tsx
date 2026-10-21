// Configurações do Ponto: horário padrão da empresa + setores com horário.
// O horário do setor é um MODELO: "Aplicar" copia a grade para a jornada de cada funcionário (ponto_jornadas),
// do mesmo jeito que a aba Jornada do funcionário grava. Dá para ajustar por funcionário depois.
import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Save, Trash2, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../supabase';
import { showAlert, showConfirm } from '../../lib/notify';
import { hojeStr, jornadaPadrao, toMin } from '../../lib/pontoCalc';
import type { FuncionarioItem } from './PontoFuncionarios';

const COMPANY_ID = 'rafa-arts';
const DIAS = [
  { dow: 1, nome: 'Segunda-feira' },
  { dow: 2, nome: 'Terça-feira' },
  { dow: 3, nome: 'Quarta-feira' },
  { dow: 4, nome: 'Quinta-feira' },
  { dow: 5, nome: 'Sexta-feira' },
  { dow: 6, nome: 'Sábado' },
  { dow: 0, nome: 'Domingo' },
];

interface Linha { dow: number; trabalha: boolean; entrada: string; inicio_intervalo: string; fim_intervalo: string; saida: string }
interface Setor { id: string; nome: string; padrao: boolean }

const hm = (v?: string | null) => (v ? String(v).slice(0, 5) : '');
const n = (v: string) => (v ? `${v}:00`.slice(0, 8) : null);
const linhasPadrao = (): Linha[] =>
  DIAS.map(({ dow }) => {
    const j = jornadaPadrao().find((x) => x.dia_semana === dow)!;
    return { dow, trabalha: j.trabalha, entrada: hm(j.entrada), inicio_intervalo: hm(j.inicio_intervalo), fim_intervalo: hm(j.fim_intervalo), saida: hm(j.saida) };
  });

const inputCls = 'bg-slate-950/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white disabled:opacity-30 w-24';

export function PontoSetores({ funcionarios, onAplicado }: { funcionarios: FuncionarioItem[]; onAplicado: () => void }) {
  const [semTabela, setSemTabela] = useState(false);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [jornadas, setJornadas] = useState<Record<string, Linha[]>>({});
  const [funcSetor, setFuncSetor] = useState<Record<string, string | null>>({});
  const [selId, setSelId] = useState<string | 'novo' | null>(null);
  const [nome, setNome] = useState('');
  const [padrao, setPadrao] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>(linhasPadrao());
  const [ocupado, setOcupado] = useState(false);

  const ativos = useMemo(() => funcionarios.filter((f) => f.ativo), [funcionarios]);

  const carregar = async () => {
    const { data: s, error } = await supabase.from('ponto_setores').select('*').order('nome');
    if (error) { setSemTabela(true); return; }
    setSemTabela(false);
    setSetores((s || []) as Setor[]);
    const { data: j } = await supabase.from('ponto_setor_jornadas').select('*');
    const mapa: Record<string, Linha[]> = {};
    (s || []).forEach((st: any) => {
      mapa[st.id] = DIAS.map(({ dow }) => {
        const r: any = (j || []).find((x: any) => x.setor_id === st.id && x.dia_semana === dow);
        return { dow, trabalha: r ? !!r.trabalha : false, entrada: hm(r?.entrada), inicio_intervalo: hm(r?.inicio_intervalo), fim_intervalo: hm(r?.fim_intervalo), saida: hm(r?.saida) };
      });
    });
    setJornadas(mapa);
    const { data: f } = await supabase.from('ponto_funcionarios').select('id, setor_id');
    const fm: Record<string, string | null> = {};
    (f || []).forEach((x: any) => { fm[x.id] = x.setor_id ?? null; });
    setFuncSetor(fm);
  };
  useEffect(() => { carregar(); }, []);

  const abrir = (st: Setor | 'novo', comoPadrao = false) => {
    if (st === 'novo') {
      setSelId('novo'); setNome(comoPadrao ? 'Padrão da empresa' : ''); setPadrao(comoPadrao); setLinhas(linhasPadrao());
    } else {
      setSelId(st.id); setNome(st.nome); setPadrao(st.padrao); setLinhas(jornadas[st.id] || linhasPadrao());
    }
  };

  const setLinha = (dow: number, patch: Partial<Linha>) => setLinhas((ls) => ls.map((l) => (l.dow === dow ? { ...l, ...patch } : l)));

  const semIntervalo = (dow: number) => setLinha(dow, { inicio_intervalo: '', fim_intervalo: '' });

  const copiarDia = (dow: number, alvo: string) => {
    if (!alvo) return;
    const o = linhas.find((l) => l.dow === dow)!;
    const dias = alvo === 'seg-sex' ? [1, 2, 3, 4, 5] : alvo === 'seg-sab' ? [1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6];
    setLinhas((ls) => ls.map((l) => (dias.includes(l.dow) && l.dow !== dow ? { ...l, trabalha: o.trabalha, entrada: o.entrada, inicio_intervalo: o.inicio_intervalo, fim_intervalo: o.fim_intervalo, saida: o.saida } : l)));
  };

  // Sábado só de manhã: sem tarde e sem almoço. A batida das 12:30 conta como saída (dia completo).
  const sabadoSoManha = () => setLinha(6, { trabalha: true, entrada: linhas.find((l) => l.dow === 6)?.entrada || '08:00', inicio_intervalo: '', fim_intervalo: '', saida: '12:30' });

  const salvar = async () => {
    if (!nome.trim()) { showAlert('Informe o nome do setor.'); return; }
    for (const l of linhas) {
      if (l.trabalha && (toMin(l.entrada) === null || toMin(l.saida) === null)) {
        showAlert(`${DIAS.find((d) => d.dow === l.dow)!.nome}: informe entrada e saída válidas.`);
        return;
      }
    }
    setOcupado(true);
    try {
      let id = selId !== 'novo' ? selId : null;
      if (padrao) {
        await supabase.from('ponto_setores').update({ padrao: false }).eq('company_id', COMPANY_ID).neq('id', id ?? '00000000-0000-0000-0000-000000000000');
      }
      if (!id) {
        const { data, error } = await supabase.from('ponto_setores').insert({ company_id: COMPANY_ID, nome: nome.trim(), padrao }).select('id').single();
        if (error || !data) { showAlert(error?.code === '23505' ? 'Já existe um setor com esse nome.' : `Erro: ${error?.message}`); return; }
        id = data.id;
      } else {
        const { error } = await supabase.from('ponto_setores').update({ nome: nome.trim(), padrao }).eq('id', id);
        if (error) { showAlert(error.code === '23505' ? 'Já existe um setor com esse nome.' : `Erro: ${error.message}`); return; }
      }
      const { error: eJ } = await supabase.from('ponto_setor_jornadas').upsert(
        linhas.map((l) => ({ setor_id: id, dia_semana: l.dow, trabalha: l.trabalha, entrada: l.trabalha ? n(l.entrada) : null, inicio_intervalo: l.trabalha ? n(l.inicio_intervalo) : null, fim_intervalo: l.trabalha ? n(l.fim_intervalo) : null, saida: l.trabalha ? n(l.saida) : null })),
        { onConflict: 'setor_id,dia_semana' }
      );
      if (eJ) { showAlert(`Erro ao salvar o horário: ${eJ.message}`); return; }
      showAlert('Horário salvo. Use "Aplicar" para copiar para os funcionários.');
      setSelId(id);
      await carregar();
    } finally {
      setOcupado(false);
    }
  };

  const excluir = async (st: Setor) => {
    if (!(await showConfirm(`Excluir o setor "${st.nome}"? Os funcionários ficam sem setor e a jornada de cada um não muda.`))) return;
    const { error } = await supabase.from('ponto_setores').delete().eq('id', st.id);
    if (error) { showAlert(`Erro: ${error.message}`); return; }
    if (selId === st.id) setSelId(null);
    await carregar();
  };

  const trocarSetor = async (funcId: string, setorId: string) => {
    const { error } = await supabase.from('ponto_funcionarios').update({ setor_id: setorId || null }).eq('id', funcId);
    if (error) { showAlert(`Erro: ${error.message}`); return; }
    setFuncSetor((m) => ({ ...m, [funcId]: setorId || null }));
  };

  // Alvos: o setor padrão da empresa vale para todos os ativos; os demais, só para quem está no setor.
  const alvosDe = (st: Setor) => (st.padrao ? ativos : ativos.filter((f) => funcSetor[f.id] === st.id));

  const aplicar = async (st: Setor) => {
    const alvos = alvosDe(st);
    if (alvos.length === 0) { showAlert('Nenhum funcionário ativo neste setor.'); return; }
    const grade = jornadas[st.id] || [];
    if (!(await showConfirm(`Aplicar o horário de "${st.nome}" para ${alvos.length} funcionário(s)? Isso substitui a jornada atual deles (pode ajustar depois na aba Jornada).`))) return;
    setOcupado(true);
    try {
      const hoje = hojeStr();
      const base = alvos.flatMap((f) => grade.map((l) => ({ funcionario_id: f.id, dia_semana: l.dow, trabalha: l.trabalha, entrada: l.trabalha ? n(l.entrada) : null, inicio_intervalo: l.trabalha ? n(l.inicio_intervalo) : null, fim_intervalo: l.trabalha ? n(l.fim_intervalo) : null, saida: l.trabalha ? n(l.saida) : null })));
      // Mesma gravação da aba Jornada: vigência base (vale já e retroativo) + vigência de hoje (histórico).
      const { error } = await supabase.from('ponto_jornadas').upsert(base.map((b) => ({ ...b, vigente_desde: '2000-01-01' })), { onConflict: 'funcionario_id,dia_semana,vigente_desde' });
      if (error) { showAlert(`Erro ao aplicar: ${error.message}`); return; }
      await supabase.from('ponto_jornadas').upsert(base.map((b) => ({ ...b, vigente_desde: hoje })), { onConflict: 'funcionario_id,dia_semana,vigente_desde' });
      try {
        alvos.forEach((f) => localStorage.setItem(`rpro_ponto_jornada_${f.id}`, JSON.stringify(grade.map((l) => ({ funcionario_id: f.id, dia_semana: l.dow, trabalha: l.trabalha, entrada: l.trabalha ? n(l.entrada) : null, inicio_intervalo: l.trabalha ? n(l.inicio_intervalo) : null, fim_intervalo: l.trabalha ? n(l.fim_intervalo) : null, saida: l.trabalha ? n(l.saida) : null })))));
      } catch {}
      showAlert(`Horário aplicado para ${alvos.length} funcionário(s).`);
      onAplicado();
    } finally {
      setOcupado(false);
    }
  };

  const card = 'bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl space-y-5 text-white';

  if (semTabela) {
    return (
      <div className={card}>
        <h3 className="text-lg font-black flex items-center gap-2"><Building2 size={18} /> Horários e setores</h3>
        <div className="flex items-start gap-2 text-amber-300 text-xs font-medium">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Falta criar as tabelas no Supabase. Rode o arquivo <b>supabase/create_ponto_setores.sql</b> no SQL Editor e recarregue a página.</span>
        </div>
      </div>
    );
  }

  const atual = selId && selId !== 'novo' ? setores.find((s) => s.id === selId) || null : null;
  const temPadrao = setores.some((s) => s.padrao);

  return (
    <div className={card}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black tracking-tight flex items-center gap-2"><Building2 size={18} /> Horários e setores</h3>
          <p className="text-xs text-white/50 font-medium">Horário padrão da empresa e horário por setor. Servem de modelo para a jornada dos funcionários.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!temPadrao && (
            <button onClick={() => abrir('novo', true)} className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase cursor-pointer">Definir horário padrão da empresa</button>
          )}
          <button onClick={() => abrir('novo')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 hover:bg-white/5 font-black text-xs uppercase cursor-pointer"><Plus size={14} /> Novo setor</button>
        </div>
      </div>

      {setores.length === 0 && selId !== 'novo' && (
        <p className="text-xs text-white/50">Nenhum setor ainda. Enquanto não houver horário padrão, funcionário novo recebe segunda a sábado, 08:00–17:00 (intervalo 12:00–13:00).</p>
      )}

      <div className="flex flex-wrap gap-2">
        {setores.map((s) => (
          <div key={s.id} className={`flex items-center gap-2 pl-3 pr-1 py-1 rounded-xl border text-xs font-bold ${selId === s.id ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200' : 'border-white/10 text-white/70'}`}>
            <button onClick={() => abrir(s)} className="cursor-pointer">{s.nome}{s.padrao && <span className="ml-2 text-[9px] uppercase text-emerald-300">padrão da empresa</span>}</button>
            <button onClick={() => excluir(s)} title="Excluir setor" className="p-1.5 rounded-lg hover:bg-rose-500/20 text-white/40 hover:text-rose-300 cursor-pointer"><Trash2 size={12} /></button>
          </div>
        ))}
      </div>

      {selId && (
        <div className="space-y-4 border-t border-white/10 pt-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <label className="flex-1 text-[11px] font-bold text-white/60 uppercase">Nome do setor
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Produção, Atendimento" className="mt-1 w-full bg-slate-950/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white normal-case" />
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-white/70 cursor-pointer">
              <input type="checkbox" checked={padrao} onChange={(e) => setPadrao(e.target.checked)} /> Horário padrão da empresa
            </label>
          </div>

          <div>
            <button type="button" onClick={sabadoSoManha} className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-white/80 hover:text-emerald-300 border border-white/10 text-[11px] font-bold cursor-pointer" title="Sábado 08:00 às 12:30, sem intervalo: a batida das 12:30 conta como saída">Sábado só manhã (até 12:30)</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-white/50 text-[10px] uppercase"><th className="text-left py-1">Dia</th><th>Trabalha</th><th>Entrada</th><th>Início intervalo</th><th>Fim intervalo</th><th>Saída</th><th>Atalhos</th></tr></thead>
              <tbody>
                {DIAS.map(({ dow, nome: dn }) => {
                  const l = linhas.find((x) => x.dow === dow)!;
                  return (
                    <tr key={dow} className="border-t border-white/5 text-center">
                      <td className="text-left py-1.5 font-bold">{dn}</td>
                      <td><input type="checkbox" checked={l.trabalha} onChange={(e) => setLinha(dow, { trabalha: e.target.checked })} /></td>
                      {(['entrada', 'inicio_intervalo', 'fim_intervalo', 'saida'] as const).map((k) => (
                        <td key={k}><input type="time" disabled={!l.trabalha} value={l[k]} onChange={(e) => setLinha(dow, { [k]: e.target.value } as Partial<Linha>)} className={inputCls} /></td>
                      ))}
                      <td className="whitespace-nowrap">
                        <button type="button" disabled={!l.trabalha} onClick={() => semIntervalo(dow)} className="mr-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 text-[10px] font-bold text-white/70 border border-white/10 cursor-pointer" title="Dia sem almoço">Sem intervalo</button>
                        <select defaultValue="" disabled={!l.trabalha} onChange={(e) => { copiarDia(dow, e.target.value); e.target.value = ''; }} className="bg-slate-950/60 border border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-white/80 disabled:opacity-20" title="Copia o horário deste dia para outros dias">
                          <option value="">Copiar para…</option>
                          <option value="seg-sex">Seg a Sex</option>
                          <option value="seg-sab">Seg a Sáb</option>
                          <option value="todos">Todos os dias</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button disabled={ocupado} onClick={salvar} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase cursor-pointer"><Save size={14} /> Salvar horário</button>
            {atual && (
              <button disabled={ocupado} onClick={() => aplicar(atual)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 font-black text-xs uppercase cursor-pointer">
                <CheckCircle2 size={14} /> {atual.padrao ? `Aplicar a todos os ativos (${alvosDe(atual).length})` : `Aplicar aos funcionários do setor (${alvosDe(atual).length})`}
              </button>
            )}
          </div>
        </div>
      )}

      {setores.length > 0 && (
        <div className="border-t border-white/10 pt-4 space-y-2">
          <h4 className="text-sm font-black flex items-center gap-2"><Users size={14} /> Setor de cada funcionário</h4>
          {ativos.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="font-bold truncate">{f.colaboradores?.nome || f.nome_relogio}</span>
              <select value={funcSetor[f.id] || ''} onChange={(e) => trocarSetor(f.id, e.target.value)} className="bg-slate-950/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white">
                <option value="">Sem setor</option>
                {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
