import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Users, UserPlus, LogIn, LogOut, Coffee, Pencil, Search, RefreshCw, Zap, AlertTriangle, UserX, UserCheck, ChevronLeft, Camera, X, Save } from 'lucide-react';
import { supabase } from '../../supabase';
import { useApp } from '../../AppContext';
import { cn, AvatarPhoto } from '../SharedUI';
import { showAlert } from '../../lib/notify';
import {
  PontoJornada, PontoRegistro, StatusDia, analisarDia, fmtHM, hhmm, hojeStr, inicioDaSemana, jornadaDoDia,
  jornadaPadrao, somarDias, toMin,
} from '../../lib/pontoCalc';

// Mesma empresa padrão usada nas tabelas (create_comissoes.sql / create_ponto.sql).
const COMPANY_ID = 'rafa-arts';

interface Colab { id: string; nome: string; foto_url: string | null; telefone_whatsapp: string | null }
interface Func {
  id: string; company_id: string; numero_relogio: string; nome_relogio: string | null;
  colaborador_id: string | null; tolerancia_minutos: number; ativo: boolean; colaboradores?: Colab | null;
}
interface BancoMov { funcionario_id: string; minutos: number; tipo: string; validade: string | null }

const DIAS = [
  { dow: 1, nome: 'Segunda' }, { dow: 2, nome: 'Terça' }, { dow: 3, nome: 'Quarta' }, { dow: 4, nome: 'Quinta' },
  { dow: 5, nome: 'Sexta' }, { dow: 6, nome: 'Sábado' }, { dow: 0, nome: 'Domingo' },
];
const DIA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_UI: Record<StatusDia, { label: string; cls: string }> = {
  presente: { label: 'Presente', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  atrasado: { label: 'Atrasado', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  ausente: { label: 'Ausente', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  incompleto: { label: 'Batida faltando', cls: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  folga: { label: 'Folga', cls: 'bg-white/10 text-white/60 border-white/10' },
  aguardando: { label: 'Aguardando', cls: 'bg-sky-500/10 text-sky-300 border-sky-500/20' },
};

const StatusPill = ({ s }: { s: StatusDia }) => (
  <span className={cn('px-2.5 py-1 rounded-lg border text-[11px] font-bold whitespace-nowrap', STATUS_UI[s].cls)}>{STATUS_UI[s].label}</span>
);

const card = 'bg-slate-900/60 border border-white/10 rounded-2xl';
const inputCls = 'w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500';
const nomeDe = (f: Func) => f.colaboradores?.nome || f.nome_relogio || `Funcionário ${f.numero_relogio}`;

export function PontoApp() {
  const { user } = useApp();
  const [view, setView] = useState<'dashboard' | 'funcionarios' | 'registros'>('dashboard');
  const [funcs, setFuncs] = useState<Func[]>([]);
  const [colabs, setColabs] = useState<Colab[]>([]);
  const [jornadas, setJornadas] = useState<(PontoJornada & { funcionario_id: string })[]>([]);
  const [registros, setRegistros] = useState<PontoRegistro[]>([]);
  const [banco, setBanco] = useState<BancoMov[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [perfilTab, setPerfilTab] = useState<'geral' | 'registros' | 'jornada'>('geral');
  const [busca, setBusca] = useState('');
  const [novoOpen, setNovoOpen] = useState(false);
  const [editFunc, setEditFunc] = useState<Func | null>(null);
  const [editReg, setEditReg] = useState<{ funcionario_id: string; data: string; reg: PontoRegistro | null } | null>(null);

  const hoje = hojeStr();
  const agora = new Date();
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const desde = somarDias(hojeStr(), -62);
      const [f, c, j, r, b] = await Promise.all([
        supabase.from('ponto_funcionarios').select('*, colaboradores(id, nome, foto_url, telefone_whatsapp)').eq('company_id', COMPANY_ID).eq('ativo', true),
        supabase.from('colaboradores').select('id, nome, foto_url, telefone_whatsapp').eq('ativo', true).order('nome'),
        supabase.from('ponto_jornadas').select('*'),
        supabase.from('ponto_registros').select('*').gte('data', desde),
        supabase.from('ponto_banco_horas').select('funcionario_id, minutos, tipo, validade'),
      ]);
      const falha = [f, c, j, r, b].find((x) => x.error);
      if (falha?.error) throw new Error(falha.error.message);
      setFuncs(((f.data || []) as Func[]).sort((a, b2) => Number(a.numero_relogio) - Number(b2.numero_relogio)));
      setColabs((c.data || []) as Colab[]);
      setJornadas((j.data || []) as any);
      setRegistros((r.data || []) as PontoRegistro[]);
      setBanco((b.data || []) as BancoMov[]);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao carregar o ponto.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const regMap = useMemo(() => {
    const m = new Map<string, PontoRegistro>();
    registros.forEach((r) => m.set(`${r.funcionario_id}|${r.data}`, r));
    return m;
  }, [registros]);

  const jornadasDe = useCallback((fid: string) => jornadas.filter((j) => j.funcionario_id === fid), [jornadas]);
  const analise = useCallback((f: Func, data: string) =>
    analisarDia(regMap.get(`${f.id}|${data}`), jornadaDoDia(jornadasDe(f.id), data), data, hoje, f.tolerancia_minutos, agoraMin),
  [regMap, jornadasDe, hoje, agoraMin]);

  const saldoBanco = (fid: string) =>
    banco.filter((m) => m.funcionario_id === fid && (m.minutos < 0 || !m.validade || m.validade >= hoje)).reduce((s, m) => s + m.minutos, 0);

  // ---------- ações ----------
  const salvarRegistro = async (fid: string, data: string, h: Partial<PontoRegistro>) => {
    const n = (v?: string | null) => (v ? v : null);
    const { error } = await supabase.from('ponto_registros').upsert({
      funcionario_id: fid, data, entrada: n(h.entrada), inicio_intervalo: n(h.inicio_intervalo), fim_intervalo: n(h.fim_intervalo),
      saida: n(h.saida), observacao: n(h.observacao), origem: 'manual', editado_manual: true, updated_at: new Date().toISOString(),
    }, { onConflict: 'funcionario_id,data' });
    if (error) { showAlert(`Erro ao salvar: ${error.message}`); return; }
    setEditReg(null);
    await carregar();
    showAlert('Registro de ponto salvo.');
  };

  const buscarFoto = async (colab: Colab, telefone: string) => {
    const digits = telefone.replace(/\D/g, '');
    if (!digits) { showAlert('Cadastre o WhatsApp do funcionário primeiro.'); return; }
    try {
      const r = await fetch('/api/whatsapp-foto-perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ phone: digits }),
      });
      const d = await r.json();
      if (d?.photoUrl) {
        await supabase.from('colaboradores').update({ foto_url: d.photoUrl }).eq('id', colab.id);
        await carregar();
        showAlert('Foto do WhatsApp atualizada.');
      } else {
        showAlert('Não consegui buscar a foto (número sem WhatsApp ou foto privada). A foto atual foi mantida.');
      }
    } catch {
      showAlert('Não consegui buscar a foto agora. A foto atual foi mantida.');
    }
  };

  // ---------- derivados ----------
  const ativos = funcs;
  const hojeCont = useMemo(() => {
    const c = { presente: 0, atrasado: 0, ausente: 0, outros: 0 };
    ativos.forEach((f) => {
      const s = analise(f, hoje).status;
      if (s === 'presente') c.presente++; else if (s === 'atrasado') c.atrasado++; else if (s === 'ausente') c.ausente++; else c.outros++;
    });
    return c;
  }, [ativos, analise, hoje]);

  const semana = useMemo(() => {
    const ini = inicioDaSemana(hoje);
    return Array.from({ length: 7 }, (_, i) => {
      const data = somarDias(ini, i);
      let min = 0, extra = 0;
      ativos.forEach((f) => { const a = analise(f, data); min += a.trabalhados; extra += a.extra; });
      return { data, dow: new Date(`${data}T12:00:00`).getDay(), min, extra };
    });
  }, [ativos, analise, hoje]);
  const extraSemana = semana.reduce((s, d) => s + d.extra, 0);
  const maxMin = Math.max(1, ...semana.map((d) => d.min));

  const ultimos = useMemo(() =>
    [...registros].sort((a, b) => (b.data + (b.entrada || '')).localeCompare(a.data + (a.entrada || ''))).slice(0, 6),
  [registros]);

  const selecionado = funcs.find((f) => f.id === selId) || null;

  // ---------- render ----------
  if (loading && funcs.length === 0 && !erro) return <div className="p-8 text-center text-white/50 text-sm">Carregando ponto...</div>;

  if (erro) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className={cn(card, 'p-6 space-y-3')}>
          <p className="flex items-center gap-2 text-amber-300 font-bold text-sm"><AlertTriangle size={16} /> Não foi possível carregar o ponto</p>
          <p className="text-xs text-white/60">{erro}</p>
          <p className="text-xs text-white/50">Se as tabelas ainda não existem, rode o arquivo <code className="text-primary-300">supabase/create_ponto.sql</code> no SQL Editor do Supabase.</p>
          <button onClick={carregar} className="px-4 py-2 rounded-xl bg-primary-500 text-slate-950 font-black text-xs uppercase">Tentar de novo</button>
        </div>
      </div>
    );
  }

  const tabBtn = (id: typeof view, label: string, Icon: any) => (
    <button key={id} onClick={() => { setView(id); if (id !== 'funcionarios') setSelId(null); }}
      className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
        view === id ? 'bg-primary-500 text-slate-950' : 'text-white/60 hover:bg-white/5 hover:text-white')}>
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2"><Clock size={20} className="text-primary-400" /> Ponto Eletrônico</h2>
          <p className="text-xs text-white/50">Visão geral do ponto da empresa</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tabBtn('dashboard', 'Dashboard', Zap)}
          {tabBtn('funcionarios', 'Funcionários', Users)}
          {tabBtn('registros', 'Registros de Ponto', Clock)}
          <button onClick={carregar} title="Atualizar" className="p-2 rounded-xl text-white/60 hover:bg-white/5"><RefreshCw size={14} className={cn(loading && 'animate-spin')} /></button>
        </div>
      </div>

      {/* ===== DASHBOARD ===== */}
      {view === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: hojeCont.presente, l: 'Presentes', Icon: UserCheck, c: 'text-emerald-400 bg-emerald-500/15' },
              { n: hojeCont.atrasado, l: 'Atrasados', Icon: Clock, c: 'text-amber-400 bg-amber-500/15' },
              { n: hojeCont.ausente, l: 'Ausentes', Icon: UserX, c: 'text-red-400 bg-red-500/15' },
              { n: fmtHM(extraSemana), l: 'Horas extras (semana)', Icon: Zap, c: 'text-sky-400 bg-sky-500/15' },
            ].map((k) => (
              <div key={k.l} className={cn(card, 'p-4 flex items-center gap-3')}>
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', k.c)}><k.Icon size={20} /></div>
                <div><p className="text-2xl font-black text-white leading-none">{k.n}</p><p className="text-[11px] text-white/50 mt-1">{k.l}</p></div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className={cn(card, 'p-5 lg:col-span-3')}>
              <h3 className="text-sm font-black text-white mb-4">Horas trabalhadas na semana</h3>
              <div className="flex items-end gap-3 h-40">
                {semana.map((d) => (
                  <div key={d.data} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] text-white/40">{d.min ? `${Math.round(d.min / 60)}h` : ''}</span>
                    <div className="w-full rounded-t-lg bg-primary-500/80" style={{ height: `${Math.max(2, (d.min / maxMin) * 100)}%`, opacity: d.min ? 1 : 0.2 }} />
                    <span className={cn('text-[10px]', d.data === hoje ? 'text-primary-300 font-bold' : 'text-white/40')}>{DIA_CURTO[d.dow]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={cn(card, 'p-5 lg:col-span-2')}>
              <h3 className="text-sm font-black text-white mb-4">Status da equipe hoje</h3>
              {ativos.length === 0 ? <p className="text-xs text-white/40">Nenhum funcionário cadastrado.</p> : (
                <div className="flex items-center gap-5">
                  <div className="relative w-28 h-28 shrink-0 rounded-full" style={{
                    background: (() => {
                      const t = ativos.length; const p = hojeCont.presente / t * 100; const a = hojeCont.atrasado / t * 100; const u = hojeCont.ausente / t * 100;
                      return `conic-gradient(#10b981 0 ${p}%, #f59e0b ${p}% ${p + a}%, #ef4444 ${p + a}% ${p + a + u}%, #334155 ${p + a + u}% 100%)`;
                    })(),
                  }}>
                    <div className="absolute inset-3 rounded-full bg-slate-900 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-white">{ativos.length}</span><span className="text-[9px] text-white/40">Funcionários</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    {[['Presentes', hojeCont.presente, 'bg-emerald-500'], ['Atrasados', hojeCont.atrasado, 'bg-amber-500'], ['Ausentes', hojeCont.ausente, 'bg-red-500'], ['Folga/aguardando', hojeCont.outros, 'bg-slate-600']].map(([l, n, c]) => (
                      <div key={l as string} className="flex items-center gap-2 text-white/70"><span className={cn('w-2.5 h-2.5 rounded-full', c as string)} />{l}<b className="text-white ml-auto pl-4">{n}</b></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={cn(card, 'p-5')}>
            <h3 className="text-sm font-black text-white mb-3">Últimos registros de ponto</h3>
            {ultimos.length === 0 ? <p className="text-xs text-white/40">Nenhum registro ainda. Importe o arquivo do relógio ou lance um registro no perfil do funcionário.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-white/40 text-left"><th className="py-2 pr-3">Funcionário</th><th className="pr-3">Data</th><th className="pr-3">Entrada</th><th className="pr-3">Saída</th><th className="pr-3">Horas</th><th>Status</th></tr></thead>
                  <tbody>
                    {ultimos.map((r) => {
                      const f = funcs.find((x) => x.id === r.funcionario_id); if (!f) return null;
                      const a = analise(f, r.data);
                      return (
                        <tr key={r.funcionario_id + r.data} className="border-t border-white/5 text-white/80">
                          <td className="py-2 pr-3"><div className="flex items-center gap-2"><AvatarPhoto photoUrl={f.colaboradores?.foto_url} name={nomeDe(f)} className="w-7 h-7" textClassName="text-[10px]" />{nomeDe(f)}</div></td>
                          <td className="pr-3">{r.data.split('-').reverse().join('/')}</td><td className="pr-3">{hhmm(r.entrada)}</td><td className="pr-3">{hhmm(r.saida)}</td>
                          <td className="pr-3">{fmtHM(a.trabalhados)}</td><td><StatusPill s={a.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== FUNCIONÁRIOS: lista ===== */}
      {view === 'funcionarios' && !selecionado && (
        <div className={cn(card, 'p-5 space-y-4')}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar funcionário..." className={cn(inputCls, 'pl-9')} />
            </div>
            <button onClick={() => setNovoOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-slate-950 font-black text-xs uppercase"><UserPlus size={14} /> Novo funcionário</button>
          </div>
          {funcs.length === 0 && <p className="text-xs text-white/40">Nenhum funcionário do relógio cadastrado ainda.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {funcs.filter((f) => nomeDe(f).toLowerCase().includes(busca.toLowerCase())).map((f) => {
              const a = analise(f, hoje);
              return (
                <button key={f.id} onClick={() => { setSelId(f.id); setPerfilTab('geral'); }} className="text-left p-4 rounded-2xl bg-slate-950/40 border border-white/5 hover:border-primary-500/40 transition-all flex items-center gap-3">
                  <AvatarPhoto photoUrl={f.colaboradores?.foto_url} name={nomeDe(f)} className="w-12 h-12" textClassName="text-base" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-white truncate">{nomeDe(f)}</p>
                    <p className="text-[11px] text-white/40">Nº relógio: {f.numero_relogio}{f.colaborador_id ? '' : ' • sem vínculo'}</p>
                  </div>
                  <StatusPill s={a.status} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== FUNCIONÁRIOS: perfil ===== */}
      {view === 'funcionarios' && selecionado && (() => {
        const f = selecionado; const colab = f.colaboradores || null;
        const jf = jornadasDe(f.id);
        const mesIni = `${hoje.slice(0, 7)}-01`;
        const diasMes: string[] = []; for (let d = mesIni; d <= hoje; d = somarDias(d, 1)) diasMes.push(d);
        let dTrab = 0, atrasos = 0, faltas = 0, minMes = 0, uteis = 0;
        diasMes.forEach((d) => { const a = analise(f, d); minMes += a.trabalhados; if (a.status === 'presente' || a.status === 'atrasado') dTrab++; if (a.status === 'atrasado') atrasos++; if (a.status === 'ausente') faltas++; if (['presente', 'atrasado', 'ausente', 'incompleto'].includes(a.status)) uteis++; });
        const hojeReg = regMap.get(`${f.id}|${hoje}`) || null;
        const aHoje = analise(f, hoje);
        const jHoje = jornadaDoDia(jf, hoje);
        const banc = saldoBanco(f.id);
        return (
          <div className="space-y-5">
            <button onClick={() => setSelId(null)} className="flex items-center gap-1 text-xs text-white/50 hover:text-white"><ChevronLeft size={14} /> Voltar para a lista</button>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className={cn(card, 'p-5 lg:col-span-2 flex items-center gap-4')}>
                <button title={colab?.telefone_whatsapp ? 'Clique para buscar a foto atual do WhatsApp' : 'Cadastre o WhatsApp para buscar a foto'}
                  onClick={() => colab ? buscarFoto(colab, colab.telefone_whatsapp || '') : showAlert('Vincule o funcionário a um colaborador para ter foto.')}
                  className="relative group shrink-0">
                  <AvatarPhoto photoUrl={colab?.foto_url} name={nomeDe(f)} className="w-20 h-20" textClassName="text-2xl" />
                  <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera size={18} className="text-white" /></span>
                </button>
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-white truncate">{nomeDe(f)}</h3>
                  <p className="text-[11px] text-white/50">Nº do relógio: {f.numero_relogio}</p>
                  <p className="text-[11px] text-white/50">WhatsApp: {colab?.telefone_whatsapp || '—'}</p>
                  <p className="text-[11px] text-white/50">{colab ? 'Vinculado ao financeiro' : 'Sem vínculo com colaborador'}</p>
                  <button onClick={() => setEditFunc(f)} className="mt-2 flex items-center gap-1 text-[11px] font-bold text-primary-300 hover:text-primary-200"><Pencil size={11} /> Editar dados</button>
                </div>
              </div>
              {[
                { l: 'Horas hoje', v: fmtHM(aHoje.trabalhados) },
                { l: 'Horas no mês', v: fmtHM(minMes) },
                { l: 'Banco de horas', v: `${banc >= 0 ? '+ ' : '- '}${fmtHM(Math.abs(banc))}`, c: banc >= 0 ? 'text-emerald-400' : 'text-red-400' },
                { l: 'Frequência (mês)', v: uteis ? `${Math.round(dTrab / uteis * 100)}%` : '—' },
              ].slice(0, 4).map((k, i) => (
                <div key={k.l} className={cn(card, 'p-4 flex flex-col justify-center', i === 3 && 'lg:col-start-auto')}>
                  <p className={cn('text-xl font-black text-white', (k as any).c)}>{k.v}</p><p className="text-[11px] text-white/50 mt-1">{k.l}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-1 flex-wrap">
              {([['geral', 'Visão Geral'], ['registros', 'Registros de Ponto'], ['jornada', 'Jornada']] as const).map(([id, l]) => (
                <button key={id} onClick={() => setPerfilTab(id)} className={cn('px-4 py-2 rounded-xl text-xs font-bold', perfilTab === id ? 'bg-primary-500 text-slate-950' : 'text-white/60 hover:bg-white/5')}>{l}</button>
              ))}
            </div>

            {perfilTab === 'geral' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className={cn(card, 'p-5')}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-black text-white">Registro de hoje</h4>
                    <button onClick={() => setEditReg({ funcionario_id: f.id, data: hoje, reg: hojeReg })} className="text-[11px] font-bold text-primary-300 flex items-center gap-1"><Pencil size={11} /> Lançar/editar</button>
                  </div>
                  {[['Entrada', hojeReg?.entrada, LogIn], ['Início do intervalo', hojeReg?.inicio_intervalo, Coffee], ['Fim do intervalo', hojeReg?.fim_intervalo, Coffee], ['Saída', hojeReg?.saida, LogOut]].map(([l, v, Ic]: any) => (
                    <div key={l} className="flex items-center justify-between py-2 border-t border-white/5 text-xs text-white/80"><span className="flex items-center gap-2"><Ic size={14} className="text-primary-400" />{l}</span><b>{hhmm(v)}</b></div>
                  ))}
                  <div className="mt-3 flex items-center justify-between"><StatusPill s={aHoje.status} /><span className="text-xs text-white/50">Trabalhadas: <b className="text-white">{fmtHM(aHoje.trabalhados)}</b></span></div>
                </div>
                <div className={cn(card, 'p-5')}>
                  <h4 className="text-sm font-black text-white mb-3">Resumo do mês</h4>
                  {[['Dias trabalhados', dTrab], ['Atrasos', atrasos], ['Faltas', faltas], ['Horas trabalhadas', fmtHM(minMes)], ['Tolerância', `${f.tolerancia_minutos} min`]].map(([l, v]) => (
                    <div key={l as string} className="flex items-center justify-between py-2 border-t border-white/5 text-xs text-white/70"><span>{l}</span><b className="text-white">{v}</b></div>
                  ))}
                  <p className="text-[11px] text-white/40 mt-3">Jornada de hoje: {jHoje?.trabalha ? `${hhmm(jHoje.entrada)} às ${hhmm(jHoje.saida)} (intervalo ${hhmm(jHoje.inicio_intervalo)}–${hhmm(jHoje.fim_intervalo)})` : 'folga'}</p>
                </div>
              </div>
            )}

            {perfilTab === 'registros' && (
              <div className={cn(card, 'p-5 overflow-x-auto')}>
                <table className="w-full text-xs">
                  <thead><tr className="text-white/40 text-left"><th className="py-2 pr-3">Data</th><th className="pr-3">Entrada</th><th className="pr-3">Início int.</th><th className="pr-3">Fim int.</th><th className="pr-3">Saída</th><th className="pr-3">Horas</th><th className="pr-3">Extra</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {[...diasMes].reverse().map((d) => {
                      const r = regMap.get(`${f.id}|${d}`) || null; const a = analise(f, d);
                      return (
                        <tr key={d} className="border-t border-white/5 text-white/80">
                          <td className="py-2 pr-3 whitespace-nowrap">{d.split('-').reverse().slice(0, 2).join('/')} ({DIA_CURTO[new Date(`${d}T12:00:00`).getDay()]}){r?.editado_manual && <span title="Editado manualmente: a importação não substitui" className="ml-1 text-primary-300">✎</span>}</td>
                          <td className="pr-3">{hhmm(r?.entrada)}</td><td className="pr-3">{hhmm(r?.inicio_intervalo)}</td><td className="pr-3">{hhmm(r?.fim_intervalo)}</td><td className="pr-3">{hhmm(r?.saida)}</td>
                          <td className="pr-3">{fmtHM(a.trabalhados)}</td><td className="pr-3">{a.extra ? fmtHM(a.extra) : '—'}</td><td><StatusPill s={a.status} /></td>
                          <td className="pl-2"><button onClick={() => setEditReg({ funcionario_id: f.id, data: d, reg: r })} className="text-white/40 hover:text-white"><Pencil size={13} /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {perfilTab === 'jornada' && <JornadaEditor func={f} jornadas={jf} onSaved={carregar} />}
          </div>
        );
      })()}

      {/* ===== REGISTROS: todos ===== */}
      {view === 'registros' && (
        <div className={cn(card, 'p-5 overflow-x-auto')}>
          <h3 className="text-sm font-black text-white mb-3">Registros de hoje ({hoje.split('-').reverse().join('/')})</h3>
          <table className="w-full text-xs">
            <thead><tr className="text-white/40 text-left"><th className="py-2 pr-3">Funcionário</th><th className="pr-3">Entrada</th><th className="pr-3">Início int.</th><th className="pr-3">Fim int.</th><th className="pr-3">Saída</th><th className="pr-3">Horas</th><th>Status</th><th /></tr></thead>
            <tbody>
              {funcs.map((f) => { const r = regMap.get(`${f.id}|${hoje}`) || null; const a = analise(f, hoje); return (
                <tr key={f.id} className="border-t border-white/5 text-white/80">
                  <td className="py-2 pr-3"><div className="flex items-center gap-2"><AvatarPhoto photoUrl={f.colaboradores?.foto_url} name={nomeDe(f)} className="w-7 h-7" textClassName="text-[10px]" />{nomeDe(f)}</div></td>
                  <td className="pr-3">{hhmm(r?.entrada)}</td><td className="pr-3">{hhmm(r?.inicio_intervalo)}</td><td className="pr-3">{hhmm(r?.fim_intervalo)}</td><td className="pr-3">{hhmm(r?.saida)}</td>
                  <td className="pr-3">{fmtHM(a.trabalhados)}</td><td><StatusPill s={a.status} /></td>
                  <td className="pl-2"><button onClick={() => setEditReg({ funcionario_id: f.id, data: hoje, reg: r })} className="text-white/40 hover:text-white"><Pencil size={13} /></button></td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      )}

      {novoOpen && <NovoFuncModal colabs={colabs} onClose={() => setNovoOpen(false)} onSaved={async () => { setNovoOpen(false); await carregar(); }} />}
      {editFunc && <EditFuncModal func={editFunc} colabs={colabs} onClose={() => setEditFunc(null)} onSaved={async () => { setEditFunc(null); await carregar(); }} buscarFoto={buscarFoto} />}
      {editReg && <RegistroModal ctx={editReg} onClose={() => setEditReg(null)} onSave={salvarRegistro} />}
    </div>
  );
}

// ---------------- modais ----------------
const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
    <div className={cn(card, 'w-full max-w-md p-5 space-y-4 bg-slate-900')} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between"><h4 className="text-sm font-black text-white">{title}</h4><button onClick={onClose} className="text-white/50 hover:text-white"><X size={16} /></button></div>
      {children}
    </div>
  </div>
);
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block space-y-1"><span className="text-[11px] font-bold text-white/50">{label}</span>{children}</label>
);
const btnSave = 'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-slate-950 font-black text-xs uppercase';

function NovoFuncModal({ colabs, onClose, onSaved }: { colabs: Colab[]; onClose: () => void; onSaved: () => void }) {
  const [numero, setNumero] = useState(''); const [nome, setNome] = useState(''); const [colabId, setColabId] = useState('');
  const salvar = async () => {
    if (!numero.trim() || !nome.trim()) { showAlert('Informe o número do relógio e o nome.'); return; }
    const { data, error } = await supabase.from('ponto_funcionarios').insert({ company_id: COMPANY_ID, numero_relogio: numero.trim(), nome_relogio: nome.trim(), colaborador_id: colabId || null }).select('id').single();
    if (error || !data) { showAlert(error?.code === '23505' ? 'Já existe um funcionário com esse número do relógio.' : `Erro: ${error?.message}`); return; }
    await supabase.from('ponto_jornadas').insert(jornadaPadrao().map((j) => ({ ...j, funcionario_id: data.id, vigente_desde: '2000-01-01' })));
    onSaved();
  };
  return (
    <Modal title="Novo funcionário do relógio" onClose={onClose}>
      <Field label="Nº do funcionário no relógio (ID)"><input className={inputCls} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="ex.: 3" /></Field>
      <Field label="Nome (como vem no relógio)"><input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
      <Field label="Vincular ao colaborador (financeiro)">
        <select className={inputCls} value={colabId} onChange={(e) => setColabId(e.target.value)}>
          <option value="">Sem vínculo por enquanto</option>{colabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Field>
      <p className="text-[11px] text-white/40">A jornada começa como segunda a sábado, 08:00–17:00, intervalo 12:00–13:00. Você ajusta na aba Jornada.</p>
      <button onClick={salvar} className={btnSave}><Save size={14} /> Cadastrar</button>
    </Modal>
  );
}

function EditFuncModal({ func, colabs, onClose, onSaved, buscarFoto }: { func: Func; colabs: Colab[]; onClose: () => void; onSaved: () => void; buscarFoto: (c: Colab, tel: string) => Promise<void> }) {
  const [numero, setNumero] = useState(func.numero_relogio); const [nome, setNome] = useState(func.nome_relogio || '');
  const [colabId, setColabId] = useState(func.colaborador_id || ''); const [tol, setTol] = useState(String(func.tolerancia_minutos));
  const [tel, setTel] = useState(func.colaboradores?.telefone_whatsapp || '');
  const salvar = async () => {
    const { error } = await supabase.from('ponto_funcionarios').update({ numero_relogio: numero.trim(), nome_relogio: nome.trim() || null, colaborador_id: colabId || null, tolerancia_minutos: Math.max(0, parseInt(tol, 10) || 0), updated_at: new Date().toISOString() }).eq('id', func.id);
    if (error) { showAlert(error.code === '23505' ? 'Já existe outro funcionário com esse número do relógio.' : `Erro: ${error.message}`); return; }
    if (colabId) {
      const atual = colabs.find((c) => c.id === colabId);
      const telNovo = tel.replace(/\D/g, '');
      if (telNovo !== (atual?.telefone_whatsapp || '')) await supabase.from('colaboradores').update({ telefone_whatsapp: telNovo || null }).eq('id', colabId);
      // Foto do WhatsApp: só busca automaticamente na PRIMEIRA vez (colaborador ainda sem foto). Depois, só ao clicar na foto do perfil.
      if (atual && telNovo && !atual.foto_url) await buscarFoto(atual, telNovo);
    }
    onSaved();
  };
  return (
    <Modal title="Editar funcionário" onClose={onClose}>
      <Field label="Nº do funcionário no relógio (ID)"><input className={inputCls} value={numero} onChange={(e) => setNumero(e.target.value)} /></Field>
      <Field label="Nome no relógio"><input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
      <Field label="Vincular ao colaborador (financeiro)">
        <select className={inputCls} value={colabId} onChange={(e) => setColabId(e.target.value)}>
          <option value="">Sem vínculo</option>{colabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Field>
      <Field label="WhatsApp do funcionário (com DDD) — usado para a foto"><input className={inputCls} value={tel} onChange={(e) => setTel(e.target.value)} placeholder="93 99999-9999" disabled={!colabId} /></Field>
      {!colabId && <p className="text-[11px] text-amber-300/80">Vincule a um colaborador para cadastrar WhatsApp e foto.</p>}
      <Field label="Tolerância de atraso (minutos)"><input className={inputCls} type="number" min={0} value={tol} onChange={(e) => setTol(e.target.value)} /></Field>
      <button onClick={salvar} className={btnSave}><Save size={14} /> Salvar</button>
    </Modal>
  );
}

function RegistroModal({ ctx, onClose, onSave }: { ctx: { funcionario_id: string; data: string; reg: PontoRegistro | null }; onClose: () => void; onSave: (fid: string, data: string, h: Partial<PontoRegistro>) => Promise<void> }) {
  const r = ctx.reg;
  const [h, setH] = useState({ entrada: r?.entrada?.slice(0, 5) || '', inicio_intervalo: r?.inicio_intervalo?.slice(0, 5) || '', fim_intervalo: r?.fim_intervalo?.slice(0, 5) || '', saida: r?.saida?.slice(0, 5) || '', observacao: r?.observacao || '' });
  const set = (k: keyof typeof h) => (e: React.ChangeEvent<HTMLInputElement>) => setH({ ...h, [k]: e.target.value });
  return (
    <Modal title={`Ponto de ${ctx.data.split('-').reverse().join('/')}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Entrada"><input type="time" className={inputCls} value={h.entrada} onChange={set('entrada')} /></Field>
        <Field label="Saída"><input type="time" className={inputCls} value={h.saida} onChange={set('saida')} /></Field>
        <Field label="Início do intervalo"><input type="time" className={inputCls} value={h.inicio_intervalo} onChange={set('inicio_intervalo')} /></Field>
        <Field label="Fim do intervalo"><input type="time" className={inputCls} value={h.fim_intervalo} onChange={set('fim_intervalo')} /></Field>
      </div>
      <Field label="Observação"><input className={inputCls} value={h.observacao} onChange={set('observacao')} placeholder="ex.: esqueceu de bater a saída" /></Field>
      <p className="text-[11px] text-white/40">Registro salvo aqui fica protegido: a importação do relógio não substitui.</p>
      <button onClick={() => onSave(ctx.funcionario_id, ctx.data, h)} className={btnSave}><Save size={14} /> Salvar registro</button>
    </Modal>
  );
}

function JornadaEditor({ func, jornadas, onSaved }: { func: Func; jornadas: PontoJornada[]; onSaved: () => void }) {
  const hoje = hojeStr();
  const inicial = () => DIAS.map(({ dow, nome }) => {
    const j = jornadaDoDia(jornadas, hoje) && jornadas.filter((x) => x.dia_semana === dow && x.vigente_desde <= hoje).sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0];
    return { dow, nome, trabalha: j ? j.trabalha : dow !== 0, entrada: j?.entrada?.slice(0, 5) || '', inicio_intervalo: j?.inicio_intervalo?.slice(0, 5) || '', fim_intervalo: j?.fim_intervalo?.slice(0, 5) || '', saida: j?.saida?.slice(0, 5) || '' };
  });
  const [rows, setRows] = useState(inicial);
  const up = (i: number, k: string, v: any) => setRows(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const salvar = async () => {
    for (const r of rows) if (r.trabalha && (toMin(r.entrada) === null || toMin(r.saida) === null)) { showAlert(`${r.nome}: informe entrada e saída.`); return; }
    const n = (v: string) => (v ? v : null);
    const { error } = await supabase.from('ponto_jornadas').upsert(rows.map((r) => ({
      funcionario_id: func.id, dia_semana: r.dow, trabalha: r.trabalha, entrada: r.trabalha ? n(r.entrada) : null, inicio_intervalo: r.trabalha ? n(r.inicio_intervalo) : null,
      fim_intervalo: r.trabalha ? n(r.fim_intervalo) : null, saida: r.trabalha ? n(r.saida) : null, vigente_desde: hoje,
    })), { onConflict: 'funcionario_id,dia_semana,vigente_desde' });
    if (error) { showAlert(`Erro ao salvar a jornada: ${error.message}`); return; }
    showAlert('Jornada salva. Vale a partir de hoje; os dias passados continuam com a jornada antiga.');
    onSaved();
  };
  return (
    <div className={cn(card, 'p-5 space-y-3 overflow-x-auto')}>
      <div className="flex items-center justify-between"><h4 className="text-sm font-black text-white">Jornada de trabalho</h4><span className="text-[11px] text-white/40">Vale a partir de hoje</span></div>
      <table className="w-full text-xs">
        <thead><tr className="text-white/40 text-left"><th className="py-2 pr-3">Dia</th><th className="pr-3">Trabalha</th><th className="pr-3">Entrada</th><th className="pr-3">Início int.</th><th className="pr-3">Fim int.</th><th>Saída</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.dow} className="border-t border-white/5 text-white/80">
              <td className="py-2 pr-3 font-bold">{r.nome}</td>
              <td className="pr-3"><input type="checkbox" checked={r.trabalha} onChange={(e) => up(i, 'trabalha', e.target.checked)} /></td>
              {(['entrada', 'inicio_intervalo', 'fim_intervalo', 'saida'] as const).map((k) => (
                <td key={k} className="pr-3"><input type="time" disabled={!r.trabalha} value={r[k]} onChange={(e) => up(i, k, e.target.value)} className={cn(inputCls, 'w-28 disabled:opacity-30')} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={salvar} className={cn(btnSave, 'max-w-xs')}><Save size={14} /> Salvar jornada</button>
    </div>
  );
}
