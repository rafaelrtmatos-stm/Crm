import React, { useState, useEffect, useRef } from 'react';
import { Plug, Bot, MessageCircle, Facebook, Instagram, QrCode, RefreshCw, CheckCircle2 } from 'lucide-react';
import { GlassCard, Badge, Modal, cn } from './SharedUI';
import { RobozinhoRafaModule } from './RobozinhoRafaModule';
import { Company, AppUser } from '../types';
import { supabase } from '../supabase';
import { showConfirm, showAlert } from '../lib/notify';

// Página "Integrações" — reúne num só lugar as conexões com canais externos
// (WhatsApp já conectado de verdade via Evolution API — Facebook/Instagram ainda não,
// ver card "Em breve" abaixo) e o Robozinho Rafa (aba 2, componente já existente,
// reaproveitado sem nenhuma alteração na lógica dele).

type IntegracoesTab = 'conexoes' | 'robozinho_rafa';

interface CanalConexao {
  id: string;
  nome: string;
  icon: any;
  cor: string;
  descricao: string;
  implementado: boolean;
}

const CANAIS: CanalConexao[] = [
  { id: 'whatsapp', nome: 'WhatsApp', icon: MessageCircle, cor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', descricao: 'Receba e envie mensagens do WhatsApp direto no Funil de Atendimento.', implementado: true },
  { id: 'facebook', nome: 'Facebook', icon: Facebook, cor: 'text-blue-400 bg-blue-500/10 border-blue-500/20', descricao: 'Conecte a página do Facebook para responder mensagens por aqui.', implementado: false },
  { id: 'instagram', nome: 'Instagram', icon: Instagram, cor: 'text-pink-400 bg-pink-500/10 border-pink-500/20', descricao: 'Conecte o Instagram Direct para centralizar o atendimento.', implementado: false },
];

export const IntegracoesModule = ({ currentCompany, user }: { currentCompany: Company | null; user: AppUser | null }) => {
  const [tab, setTab] = useState<IntegracoesTab>('conexoes');
  const [canalSelecionado, setCanalSelecionado] = useState<CanalConexao | null>(null);

  // --- Status da conexao do WhatsApp (lido do Supabase, atualizado pelo webhook) ---
  const [whatsappStatus, setWhatsappStatus] = useState<string>('close');
  useEffect(() => {
    const loadStatus = async () => {
      const { data } = await supabase.from('robozinho_config').select('whatsapp_connection_status').eq('company_id', 'rafa-arts').maybeSingle();
      setWhatsappStatus(data?.whatsapp_connection_status || 'close');
    };
    loadStatus();
    const channel = supabase.channel('integracoes-whatsapp-status').on('postgres_changes', { event: '*', schema: 'public', table: 'robozinho_config', filter: `company_id=eq.rafa-arts` }, loadStatus).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  const whatsappConectado = whatsappStatus === 'open';

  // --- QR Code (busca ao abrir o modal, e fica consultando o status a cada 4s até conectar) ---
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [desconectando, setDesconectando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [progressoImport, setProgressoImport] = useState<{ atual: number; total: number; ultimoChat?: string } | null>(null);
  const cancelarImportRef = useRef(false);

  const handleImportarHistorico = async () => {
    if (!(await showConfirm('Isso vai importar TODAS as conversas e mensagens já existentes no WhatsApp conectado (pode ser bastante coisa e demorar vários minutos). Quer continuar?'))) return;
    setImportando(true);
    cancelarImportRef.current = false;
    let cursor = 0;
    try {
      while (!cancelarImportRef.current) {
        const resp = await fetch('/api/whatsapp-import-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
          body: JSON.stringify({ cursor }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Falha na importação.');
        setProgressoImport({ atual: data.proximoCursor, total: data.total, ultimoChat: data.processado?.chat });
        if (data.concluido) break;
        cursor = data.proximoCursor;
      }
    } catch (err: any) {
      showAlert(`A importação parou no meio do caminho: ${err.message || 'erro desconhecido'}. Pode tentar de novo — o que já foi importado não duplica.`);
    } finally {
      setImportando(false);
    }
  };

  const handleDesconectar = async () => {
    if (!(await showConfirm('Desconectar esse número do WhatsApp? Você vai precisar escanear o QR Code de novo pra reconectar (com o mesmo número ou outro).'))) return;
    setDesconectando(true);
    try {
      const resp = await fetch('/api/whatsapp-connect', { method: 'DELETE', headers: { 'x-user-id': user?.id || '' } });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setQrError(data.error || 'Não foi possível desconectar.');
        return;
      }
      setQrCode(null);
    } catch (err) {
      setQrError('Falha de conexão ao tentar desconectar.');
    } finally {
      setDesconectando(false);
    }
  };

  const [qrError, setQrError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [verificandoStatus, setVerificandoStatus] = useState(false);
  const handleVerificarStatusAgora = async () => {
    setVerificandoStatus(true);
    try {
      const resp = await fetch('/api/whatsapp-connect?status=1', { headers: { 'x-user-id': user?.id || '' } });
      const data = await resp.json();
      setWhatsappStatus(data.status || 'close');
    } catch (err) {
      console.error('Falha ao verificar status:', err);
    } finally {
      setVerificandoStatus(false);
    }
  };

  const buscarQrCode = async () => {
    setLoadingQr(true);
    setQrError(null);
    try {
      const resp = await fetch('/api/whatsapp-connect', { headers: { 'x-user-id': user?.id || '' } });
      const data = await resp.json();
      if (!resp.ok) { setQrError(data.error || 'Não foi possível gerar o QR Code.'); return; }
      setQrCode(data.qrCode || null);
    } catch (err) {
      setQrError('Falha de conexão ao buscar o QR Code.');
    } finally {
      setLoadingQr(false);
    }
  };

  useEffect(() => {
    if (canalSelecionado?.id !== 'whatsapp') return;
    if (whatsappConectado) return; // ja conectado, nao precisa de QR
    buscarQrCode();
    // Fica consultando o status a cada 4s — assim que o celular escanear, whatsappStatus
    // vira 'open' sozinho (via Realtime, atualizado pelo webhook) e fecha o modal
    // Renova o QR a cada 15s — o QR do Baileys costuma expirar perto dos 20s, então
    // com 20s o usuário frequentemente escaneava uma imagem já vencida ("QR code inválido")
    pollRef.current = setInterval(buscarQrCode, 15000);
    // Respaldo: alem de esperar o webhook avisar via Realtime, tambem CONSULTA o status
    // direto na Evolution API a cada 5s. Cobre o caso do webhook nao avisar por algum
    // motivo (evento com nome diferente do esperado, falha ao gravar, etc) - sem isso, o
    // WhatsApp podia ficar conectado de verdade e a tela continuar presa mostrando QR Code
    const statusPollRef = setInterval(handleVerificarStatusAgora, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); clearInterval(statusPollRef); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canalSelecionado, whatsappConectado]);

  const estadoAoAbrirRef = useRef<boolean | null>(null);
  useEffect(() => {
    // Modal acabou de abrir pro WhatsApp — guarda o estado de conexao "de largada"
    if (canalSelecionado?.id === 'whatsapp' && estadoAoAbrirRef.current === null) {
      estadoAoAbrirRef.current = whatsappConectado;
    }
    if (!canalSelecionado) estadoAoAbrirRef.current = null; // modal fechou, reseta pra proxima vez que abrir
  }, [canalSelecionado, whatsappConectado]);

  useEffect(() => {
    if (canalSelecionado?.id !== 'whatsapp') return;
    // So fecha sozinho se estava DESCONECTADO no momento em que o modal abriu, e agora
    // ficou conectado (ou seja, conectou de verdade AGORA, tipicamente por escanear o QR).
    // Se o modal ja abriu conectado (reaberto depois, ou pagina atualizada ja conectado),
    // NAO fecha sozinho — senao os botoes de "Importar conversas antigas" e "Desconectar
    // numero" ficariam quase inacessiveis
    if (whatsappConectado && estadoAoAbrirRef.current === false) {
      if (pollRef.current) clearInterval(pollRef.current);
      setTimeout(() => setCanalSelecionado(null), 1200); // deixa ver o "Conectado!" antes de fechar
    }
  }, [whatsappConectado, canalSelecionado]);

  const TABS: { id: IntegracoesTab; label: string; icon: any }[] = [
    { id: 'conexoes', label: 'Conexões', icon: Plug },
    { id: 'robozinho_rafa', label: 'Robozinho Rafa', icon: Bot },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
          <Plug size={22} className="text-primary-500" /> Integrações
        </h1>
        <p className="text-xs text-white/40 mt-1">Conecte canais de atendimento e configure o Robozinho Rafa.</p>
      </div>

      {/* Abas */}
      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0",
              tab === t.id ? "bg-primary-500 text-slate-950 shadow-lg" : "bg-white/5 text-white/40 hover:text-white"
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'conexoes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CANAIS.map(canal => {
            const conectado = canal.id === 'whatsapp' && whatsappConectado;
            return (
            <GlassCard key={canal.id} className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0", canal.cor)}>
                  <canal.icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{canal.nome}</p>
                  <Badge variant="outline" className={conectado ? "border-emerald-500/30 text-emerald-400" : ""}>{conectado ? 'Conectado' : 'Não conectado'}</Badge>
                </div>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">{canal.descricao}</p>
              <button
                onClick={() => setCanalSelecionado(canal)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-primary-500 hover:text-slate-950 text-white/70 text-[11px] font-black uppercase tracking-widest transition-all"
              >
                {conectado ? 'Ver Conexão' : 'Conectar'}
              </button>
            </GlassCard>
            );
          })}
        </div>
      )}

      {tab === 'robozinho_rafa' && (
        <RobozinhoRafaModule currentCompany={currentCompany} user={user} />
      )}

      <Modal isOpen={!!canalSelecionado} onClose={() => setCanalSelecionado(null)} title={canalSelecionado ? `Conectar ${canalSelecionado.nome}` : ''} size="sm">
        {canalSelecionado && canalSelecionado.implementado && (
          <div className="space-y-4 text-center py-2">
            {whatsappConectado ? (
              <>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center border border-emerald-500/20 bg-emerald-500/10 mx-auto">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <p className="text-sm font-bold text-white">WhatsApp conectado!</p>
                <p className="text-xs text-white/40">As mensagens já estão chegando direto no Funil de Atendimento.</p>

                {importando && progressoImport ? (
                  <div className="space-y-2 pt-2">
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 transition-all"
                        style={{ width: `${progressoImport.total ? Math.round((progressoImport.atual / progressoImport.total) * 100) : 0}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-white/40">
                      Importando conversa {progressoImport.atual} de {progressoImport.total}
                      {progressoImport.ultimoChat ? ` — ${progressoImport.ultimoChat}` : ''}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleImportarHistorico}
                    className="text-[11px] font-black uppercase tracking-widest text-primary-400 hover:text-primary-300 mx-auto block pt-2"
                  >
                    Importar conversas antigas
                  </button>
                )}

                <button
                  onClick={handleDesconectar}
                  disabled={desconectando}
                  className="text-[11px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 disabled:opacity-50 mx-auto block pt-2"
                >
                  {desconectando ? 'Desconectando...' : 'Desconectar número'}
                </button>
              </>
            ) : qrError ? (
              <>
                <p className="text-sm font-bold text-rose-400">Não foi possível gerar o QR Code</p>
                <p className="text-xs text-white/40 leading-relaxed max-w-xs mx-auto">{qrError}</p>
                <button onClick={buscarQrCode} className="text-[11px] font-black uppercase tracking-widest text-primary-400 hover:text-primary-300 flex items-center gap-1.5 mx-auto">
                  <RefreshCw size={12} /> Tentar de novo
                </button>
              </>
            ) : loadingQr && !qrCode ? (
              <div className="py-10">
                <RefreshCw size={24} className="animate-spin text-primary-400 mx-auto" />
                <p className="text-xs text-white/40 mt-3">Gerando QR Code...</p>
              </div>
            ) : (
              <>
                {qrCode && <img src={qrCode} alt="QR Code do WhatsApp" className="w-56 h-56 mx-auto rounded-xl border border-white/10" />}
                <p className="text-sm font-bold text-white">Escaneie com o WhatsApp</p>
                <p className="text-xs text-white/40 leading-relaxed max-w-xs mx-auto">
                  Abra o WhatsApp no celular → Configurações → Aparelhos Conectados → Conectar um Aparelho, e escaneie esse código.
                </p>
                <button onClick={buscarQrCode} disabled={loadingQr} className="text-[11px] font-black uppercase tracking-widest text-primary-400 hover:text-primary-300 flex items-center gap-1.5 mx-auto disabled:opacity-40">
                  <RefreshCw size={12} className={loadingQr ? 'animate-spin' : ''} /> Deu "QR inválido"? Gerar novo
                </button>
                <button onClick={handleVerificarStatusAgora} disabled={verificandoStatus} className="text-[11px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 mx-auto disabled:opacity-40 pt-1">
                  <CheckCircle2 size={12} className={verificandoStatus ? 'animate-pulse' : ''} /> Já escaneei — verificar agora
                </button>
              </>
            )}
          </div>
        )}
        {canalSelecionado && !canalSelecionado.implementado && (
          <div className="space-y-4 text-center py-2">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center border mx-auto", canalSelecionado.cor)}>
              <QrCode size={28} />
            </div>
            <p className="text-sm font-bold text-white">Integração em breve</p>
            <p className="text-xs text-white/40 leading-relaxed max-w-xs mx-auto">
              A conexão direta com {canalSelecionado.nome} ainda está sendo preparada. Assim que estiver disponível, você vai poder conectar por aqui (QR Code ou login da conta).
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
