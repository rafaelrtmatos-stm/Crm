import React, { useState, useEffect, useRef } from 'react';
import { Plug, Bot, MessageCircle, Facebook, Instagram, QrCode, RefreshCw, CheckCircle2 } from 'lucide-react';
import { GlassCard, Badge, Modal, cn } from './SharedUI';
import { RobozinhoRafaModule } from './RobozinhoRafaModule';
import { Company, AppUser } from '../types';
import { supabase } from '../supabase';

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
  const [qrError, setQrError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const buscarQrCode = async () => {
    setLoadingQr(true);
    setQrError(null);
    try {
      const resp = await fetch('/api/whatsapp-connect');
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
    pollRef.current = setInterval(buscarQrCode, 20000); // renova o QR a cada 20s (ele expira)
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canalSelecionado, whatsappConectado]);

  useEffect(() => {
    if (whatsappConectado && canalSelecionado?.id === 'whatsapp') {
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
