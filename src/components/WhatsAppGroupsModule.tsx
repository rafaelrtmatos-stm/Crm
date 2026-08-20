import React, { useState, useEffect } from 'react';
import { Users, CheckCircle2, Circle, RefreshCw } from 'lucide-react';
import { GlassCard, Badge, cn } from './SharedUI';
import { supabase } from '../supabase';

// Tela de admin: grupos novos do WhatsApp chegam represados (visivel=false) via
// api/whatsapp-webhook.js (garantirGrupoExiste). Aqui o admin libera o grupo e escolhe
// quais usuarios podem ver aquele grupo no Funil de Atendimento.
// Enquanto um grupo estiver com visivel=false, as mensagens dele sao descartadas pelo
// webhook (nao aparecem pra ninguem, nem pro admin, ate ele liberar aqui).

interface WhatsAppGroup {
  id: string;
  group_jid: string;
  nome: string | null;
  visivel: boolean;
  created_at: string;
}

interface UsuarioSimples {
  id: string;
  name: string;
}

export const WhatsAppGroupsModule = () => {
  const [grupos, setGrupos] = useState<WhatsAppGroup[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioSimples[]>([]);
  const [acessosPorGrupo, setAcessosPorGrupo] = useState<Record<string, string[]>>({}); // group_id -> user_id[]
  const [loading, setLoading] = useState(true);
  const [grupoExpandido, setGrupoExpandido] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null); // group_id sendo salvo, pra desabilitar botoes

  const carregarTudo = async () => {
    setLoading(true);
    const [{ data: gruposData }, { data: usuariosData }, { data: acessosData }] = await Promise.all([
      supabase.from('whatsapp_groups').select('*').eq('company_id', 'rafa-arts').order('created_at', { ascending: false }),
      supabase.from('usuarios').select('id, name').order('name', { ascending: true }),
      supabase.from('user_whatsapp_groups').select('user_id, group_id'),
    ]);
    setGrupos(gruposData || []);
    setUsuarios(usuariosData || []);
    const mapa: Record<string, string[]> = {};
    (acessosData || []).forEach((a: any) => {
      if (!mapa[a.group_id]) mapa[a.group_id] = [];
      mapa[a.group_id].push(a.user_id);
    });
    setAcessosPorGrupo(mapa);
    setLoading(false);
  };

  useEffect(() => {
    carregarTudo();
    const channel = supabase
      .channel('whatsapp-groups-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_groups' }, carregarTudo)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const liberarGrupo = async (grupoId: string) => {
    setSalvando(grupoId);
    await supabase.from('whatsapp_groups').update({ visivel: true, updated_at: new Date().toISOString() }).eq('id', grupoId);
    await carregarTudo();
    setSalvando(null);
    setGrupoExpandido(grupoId); // abre a lista de usuarios direto pra escolher quem ve
  };

  const bloquearGrupo = async (grupoId: string) => {
    setSalvando(grupoId);
    await supabase.from('whatsapp_groups').update({ visivel: false, updated_at: new Date().toISOString() }).eq('id', grupoId);
    await carregarTudo();
    setSalvando(null);
  };

  const alternarAcessoUsuario = async (grupoId: string, userId: string) => {
    const temAcesso = (acessosPorGrupo[grupoId] || []).includes(userId);
    if (temAcesso) {
      await supabase.from('user_whatsapp_groups').delete().eq('group_id', grupoId).eq('user_id', userId);
    } else {
      await supabase.from('user_whatsapp_groups').insert({ group_id: grupoId, user_id: userId });
    }
    await carregarTudo();
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <RefreshCw size={22} className="animate-spin text-primary-400 mx-auto" />
        <p className="text-xs text-white/40 mt-3">Carregando grupos...</p>
      </div>
    );
  }

  const pendentes = grupos.filter(g => !g.visivel);
  const liberados = grupos.filter(g => g.visivel);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-black text-white flex items-center gap-2">
          <Users size={16} className="text-primary-500" /> Grupos do WhatsApp
        </h2>
        <p className="text-xs text-white/40 mt-1">
          Grupo novo chega aqui represado — ninguém vê as mensagens dele até você liberar e escolher quem tem acesso.
        </p>
      </div>

      {grupos.length === 0 && (
        <GlassCard className="p-6 text-center">
          <p className="text-xs text-white/40">Nenhum grupo detectado ainda. Assim que uma mensagem de grupo chegar no WhatsApp conectado, ele aparece aqui.</p>
        </GlassCard>
      )}

      {pendentes.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">Pendentes de liberação ({pendentes.length})</p>
          {pendentes.map(g => (
            <GlassCard key={g.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{g.nome || g.group_jid}</p>
                <Badge variant="outline" className="border-amber-500/30 text-amber-400 mt-1">Não liberado</Badge>
              </div>
              <button
                onClick={() => liberarGrupo(g.id)}
                disabled={salvando === g.id}
                className="shrink-0 py-2 px-4 rounded-xl bg-primary-500 text-slate-950 text-[11px] font-black uppercase tracking-widest hover:bg-primary-400 disabled:opacity-40"
              >
                Liberar
              </button>
            </GlassCard>
          ))}
        </div>
      )}

      {liberados.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Liberados ({liberados.length})</p>
          {liberados.map(g => {
            const expandido = grupoExpandido === g.id;
            const acessosDoGrupo = acessosPorGrupo[g.id] || [];
            return (
              <GlassCard key={g.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{g.nome || g.group_jid}</p>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 mt-1">
                      {acessosDoGrupo.length === 0 ? 'Ninguém tem acesso ainda' : `${acessosDoGrupo.length} usuário(s) com acesso`}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setGrupoExpandido(expandido ? null : g.id)}
                      className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-[11px] font-black uppercase tracking-widest"
                    >
                      {expandido ? 'Fechar' : 'Escolher usuários'}
                    </button>
                    <button
                      onClick={() => bloquearGrupo(g.id)}
                      disabled={salvando === g.id}
                      className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-black uppercase tracking-widest disabled:opacity-40"
                    >
                      Bloquear
                    </button>
                  </div>
                </div>

                {expandido && (
                  <div className="pt-3 border-t border-white/5 space-y-1.5">
                    {usuarios.length === 0 && <p className="text-xs text-white/40">Nenhum usuário cadastrado.</p>}
                    {usuarios.map(u => {
                      const temAcesso = acessosDoGrupo.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          onClick={() => alternarAcessoUsuario(g.id, u.id)}
                          className={cn(
                            "w-full flex items-center gap-2.5 py-2 px-3 rounded-lg text-left text-xs transition-all",
                            temAcesso ? "bg-primary-500/10 text-white" : "bg-white/[0.02] text-white/50 hover:bg-white/5"
                          )}
                        >
                          {temAcesso ? <CheckCircle2 size={15} className="text-primary-400 shrink-0" /> : <Circle size={15} className="text-white/20 shrink-0" />}
                          {u.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
