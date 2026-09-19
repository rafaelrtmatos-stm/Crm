import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { GitMerge, X, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabase';
import { cn } from './SharedUI';
import { chaveDoContato } from '../lib/phone';

// MESCLAR CONTATOS DUPLICADOS (aba Mensagens > menu ⋮). Agrupa os leads pelo MESMO telefone (mesmo com
// formato diferente: com/sem 55, com/sem o 9) e deixa escolher qual fica como principal. Quem faz a
// mesclagem e a funcao do banco crm_mesclar_leads (supabase/create_merge_leads_function.sql), numa unica
// transacao: reaponta mensagens/notificacoes, completa os dados do principal e apaga os duplicados.
// Grupos do WhatsApp nunca entram (nao sao contatos).

interface LeadDup {
  id: string;
  nome: string;
  phone: string;
  criadoEm: string | null;
  ultimaEm: string | null;
  ultimaTexto: string;
}
interface GrupoDup { chave: string; leads: LeadDup[]; principalId: string }

const PAGINA = 1000;
const fmt = (iso: string | null, p: string) => { const d = iso ? new Date(iso) : null; return d && !isNaN(d.getTime()) ? format(d, p) : '—'; };

export const MergeLeadsModal = ({ isOpen, onClose, onMerged, gruposTodos }: {
  isOpen: boolean; onClose: () => void; onMerged: () => void; gruposTodos: Set<string>;
}) => {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [grupos, setGrupos] = useState<GrupoDup[]>([]);
  const [confirmando, setConfirmando] = useState<string | null>(null); // chave do grupo, ou 'todos'
  const [processando, setProcessando] = useState<string | null>(null);
  const [resumo, setResumo] = useState<string | null>(null);

  const carregar = async () => {
    setCarregando(true); setErro(null); setConfirmando(null);
    try {
      const todos: any[] = [];
      for (let de = 0; ; de += PAGINA) {
        const { data, error } = await supabase.from('leads')
          .select('id,full_name,phone,created_at,last_message_at,last_message_text')
          .eq('company_id', 'rafa-arts').order('created_at', { ascending: true }).order('id', { ascending: true }).range(de, de + PAGINA - 1);
        if (error) throw error;
        todos.push(...(data || []));
        if (!data || data.length < PAGINA) break;
      }
      const porChave = new Map<string, LeadDup[]>();
      for (const r of todos) {
        const crus = (r.phone || '').replace(/\D/g, '');
        if (!crus || crus.length < 8 || gruposTodos.has(crus)) continue; // sem telefone ou conversa de grupo
        const chave = chaveDoContato(r.phone);
        const lista = porChave.get(chave) || [];
        lista.push({ id: r.id, nome: r.full_name || `+${crus}`, phone: r.phone, criadoEm: r.created_at, ultimaEm: r.last_message_at, ultimaTexto: r.last_message_text || '' });
        porChave.set(chave, lista);
      }
      const lista: GrupoDup[] = [];
      porChave.forEach((leads, chave) => { if (leads.length > 1) lista.push({ chave, leads, principalId: leads[0].id }); });
      lista.sort((a, b) => (b.leads[0].ultimaEm || '').localeCompare(a.leads[0].ultimaEm || ''));
      setGrupos(lista);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar os leads.');
    } finally { setCarregando(false); }
  };

  useEffect(() => { if (isOpen) { setResumo(null); carregar(); } }, [isOpen]);

  const mesclarGrupo = async (g: GrupoDup): Promise<boolean> => {
    const { error } = await supabase.rpc('crm_mesclar_leads', {
      p_principal: g.principalId,
      p_duplicados: g.leads.filter(l => l.id !== g.principalId).map(l => l.id),
      p_phone_final: g.chave,
    });
    if (error) { setErro(`Não foi possível mesclar ${g.leads[0].nome}: ${error.message}`); return false; }
    setGrupos(prev => prev.filter(x => x.chave !== g.chave));
    return true;
  };

  const mesclarUm = async (g: GrupoDup) => {
    if (processando) return;
    setProcessando(g.chave); setErro(null); setResumo(null); setConfirmando(null);
    const ok = await mesclarGrupo(g);
    setProcessando(null);
    if (ok) { setResumo(`Contato mesclado: ${g.leads.length} leads viraram 1.`); onMerged(); }
  };

  const mesclarTodos = async () => {
    if (processando) return;
    setProcessando('todos'); setErro(null); setResumo(null); setConfirmando(null);
    let feitos = 0;
    for (const g of grupos) { if (await mesclarGrupo(g)) feitos++; else break; }
    setProcessando(null);
    if (feitos) { setResumo(`${feitos} contato${feitos > 1 ? 's' : ''} mesclado${feitos > 1 ? 's' : ''}.`); onMerged(); }
  };

  const escolherPrincipal = (chave: string, id: string) =>
    setGrupos(prev => prev.map(g => (g.chave === chave ? { ...g, principalId: id } : g)));

  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => !processando && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 text-slate-800 font-black"><GitMerge size={18} className="text-primary-600" /> Mesclar contatos duplicados</div>
          <button type="button" disabled={!!processando} onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40"><X size={18} /></button>
        </div>

        <div className="px-5 py-3 text-xs text-slate-500 border-b border-slate-100 shrink-0">
          Leads com o mesmo telefone (mesmo em formato diferente). O lead <b>principal</b> fica com todas as mensagens e notificações
          dos outros, completa os dados que faltavam e os duplicados são apagados. Não dá para desfazer.
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3 space-y-3">
          {carregando && <p className="text-sm text-slate-400 flex items-center gap-2"><RefreshCw size={14} className="animate-spin" /> Procurando duplicados…</p>}
          {erro && <p className="text-sm text-rose-600 flex items-start gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" /> {erro}</p>}
          {resumo && <p className="text-sm text-emerald-600 flex items-center gap-2"><CheckCircle2 size={16} /> {resumo}</p>}
          {!carregando && !erro && !grupos.length && <p className="text-sm text-slate-500">Nenhum contato duplicado encontrado.</p>}

          {grupos.map(g => (
            <div key={g.chave} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="divide-y divide-slate-100">
                {g.leads.map(l => (
                  <label key={l.id} className={cn('flex items-start gap-3 px-3.5 py-2.5 cursor-pointer', g.principalId === l.id ? 'bg-primary-50/60' : 'hover:bg-slate-50')}>
                    <input type="radio" name={`principal-${g.chave}`} checked={g.principalId === l.id} onChange={() => escolherPrincipal(g.chave, l.id)} className="mt-1 accent-primary-600" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 truncate">{l.nome}</span>
                        {g.principalId === l.id && <span className="text-[10px] font-black uppercase tracking-wider text-primary-600">Principal</span>}
                      </div>
                      <div className="text-xs text-slate-500">
                        {l.phone}{(l.phone || '').replace(/\D/g, '') !== g.chave && <span className="ml-1.5 text-amber-600">(formato diferente)</span>}
                        {' · '}criado em {fmt(l.criadoEm, 'dd/MM/yyyy')}{' · '}última mensagem {fmt(l.ultimaEm, 'dd/MM HH:mm')}
                      </div>
                      {l.ultimaTexto && <div className="text-xs text-slate-400 truncate">{l.ultimaTexto}</div>}
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 px-3.5 py-2 bg-slate-50 border-t border-slate-100">
                {confirmando === g.chave ? (
                  <>
                    <button type="button" onClick={() => setConfirmando(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                    <button type="button" onClick={() => mesclarUm(g)} className="px-3 py-1.5 text-xs font-black rounded-lg bg-rose-500 text-white hover:bg-rose-600">Confirmar: apagar {g.leads.length - 1} duplicado{g.leads.length > 2 ? 's' : ''}</button>
                  </>
                ) : (
                  <button type="button" disabled={!!processando} onClick={() => setConfirmando(g.chave)} className="px-3 py-1.5 text-xs font-black rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50">
                    {processando === g.chave ? 'Mesclando…' : 'Mesclar este contato'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {grupos.length > 1 && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 shrink-0">
            <span className="text-xs text-slate-500">{grupos.length} contatos com duplicados (usa o principal marcado em cada um)</span>
            {confirmando === 'todos' ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setConfirmando(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                <button type="button" onClick={mesclarTodos} className="px-3 py-1.5 text-xs font-black rounded-lg bg-rose-500 text-white hover:bg-rose-600">Confirmar: mesclar {grupos.length} contatos</button>
              </div>
            ) : (
              <button type="button" disabled={!!processando} onClick={() => setConfirmando('todos')} className="px-3 py-1.5 text-xs font-black rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50">
                {processando === 'todos' ? 'Mesclando…' : `Mesclar todos (${grupos.length})`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
