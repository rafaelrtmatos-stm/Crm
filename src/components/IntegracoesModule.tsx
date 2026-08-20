import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Plug, Bot, MessageCircle, Facebook, Instagram, QrCode, RefreshCw, CheckCircle2, Users, History } from 'lucide-react';
import { GlassCard, Badge, Modal, cn } from './SharedUI';
import { RobozinhoRafaModule } from './RobozinhoRafaModule';
import { WhatsAppGroupsModule } from './WhatsAppGroupsModule';
import { Company, AppUser } from '../types';
import { supabase } from '../supabase';
import { showConfirm } from '../lib/notify';

// Página "Integrações" — reúne num só lugar as conexões com canais externos
// (WhatsApp já conectado de verdade via Evolution API — Facebook/Instagram ainda não,
// ver card "Em breve" abaixo) e o Robozinho Rafa (aba 2, componente já existente,
// reaproveitado sem nenhuma alteração na lógica dele).

type IntegracoesTab = 'conexoes' | 'robozinho_rafa' | 'grupos_whatsapp';

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
  // qrCode = imagem final (data:image/png;base64,...) já desenhada com fundo branco puro
  // (#FFFFFF) e módulos pretos puros (#000000), pra garantir contraste máximo na leitura
  // pela câmera do celular — não usamos a imagem que a Evolution API devolve pronta, porque
  // a cor dela pode variar de versão pra versão.
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [desconectando, setDesconectando] = useState(false);

  // Desenha o QR Code localmente a partir do texto bruto (qrCodeText), forçando as cores.
  // Se por algum motivo a Evolution API não mandar o texto bruto (versão antiga da API,
  // por exemplo), cai pro base64 pronto que ela devolveu, só pra não deixar o usuário sem
  // QR nenhum — mas o caminho normal é sempre desenhar com as cores certas aqui.
  const renderizarQrPretoEBranco = async (qrCodeText: string | null, qrCodeBase64Fallback: string | null) => {
    if (qrCodeText) {
      try {
        const dataUrl = await QRCode.toDataURL(qrCodeText, {
          color: { dark: '#000000', light: '#FFFFFF' },
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 512,
        });
        return dataUrl;
      } catch (err) {
        console.error('Falha ao desenhar o QR Code localmente, usando o da Evolution API:', err);
      }
    }
    return qrCodeBase64Fallback;
  };

  const handleDesconectar = async () => {
    if (!(await showConfirm('Desconectar esse número do WhatsApp? Você vai precisar escanear o QR Code de novo pra reconectar (com o mesmo número ou outro).'))) return;
    setDesconectando(true);
    try {
      const resp = await fetch('/api/whatsapp-connect', { method: 'DELETE' });
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

  // --- Importação de histórico (mensagens antigas, de antes de conectar o webhook) ---
  // Rodar supabase/add_historico_mensagens_whatsapp.sql no Supabase antes de usar isso.
  type ImportStatus = {
    totalConversas: number;
    conversasConcluidas: number;
    conversasEmAndamento: number;
    conversasPendentes: number;
    conversasComErro: number;
    mensagensImportadas: number;
    concluido: boolean;
  };
  const [importando, setImportando] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pararLoopImportacao = () => {
    if (importLoopRef.current) clearTimeout(importLoopRef.current);
    importLoopRef.current = null;
  };

  const loopContinuarImportacao = async () => {
    try {
      const resp = await fetch('/api/whatsapp-import-messages?action=continue');
      const data = await resp.json();
      if (!resp.ok) { setImportError(data.error || 'Falha ao continuar a importação.'); setImportando(false); return; }
      setImportStatus(data);
      if (data.concluido) { setImportando(false); return; }
      // Continua puxando mais um pedaço a cada poucos segundos, enquanto essa tela ficar aberta
      importLoopRef.current = setTimeout(loopContinuarImportacao, 2500);
    } catch (err) {
      setImportError('Falha de conexão durante a importação.');
      setImportando(false);
    }
  };

  const handleImportarHistorico = async () => {
    setImportError(null);
    setImportando(true);
    try {
      const resp = await fetch('/api/whatsapp-import-messages?action=start');
      const data = await resp.json();
      if (!resp.ok) { setImportError(data.error || 'Não foi possível iniciar a importação.'); setImportando(false); return; }
      loopContinuarImportacao();
    } catch (err) {
      setImportError('Falha de conexão ao iniciar a importação.');
      setImportando(false);
    }
  };

  useEffect(() => () => pararLoopImportacao(), []);

  const [qrError, setQrError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [verificandoStatus, setVerificandoStatus] = useState(false);
  const handleVerificarStatusAgora = async () => {
    setVerificandoStatus(true);
    try {
      const resp = await fetch('/api/whatsapp-connect?status=1');
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
      const resp = await fetch('/api/whatsapp-connect');
      const data = await resp.json();
      if (!resp.ok) { setQrError(data.error || 'Não foi possível gerar o QR Code.'); return; }
      const qrFinal = await renderizarQrPretoEBranco(data.qrCodeText || null, data.qrCode || null);
      setQrCode(qrFinal || null);
      if (!qrFinal) setQrError('A Evolution API não devolveu um QR Code válido.');
    } catch (err) {
      setQrError('Falha de conexão ao buscar o QR Code.');
    } finally {
      setLoadingQr(false);
    }
  };

  // Intervalo de renovação automática do QR Code. Pedido: a cada 20s. Na prática o QR do
  // Baileys costuma expirar perto dos 20s, então renovar exatamente em 20s às vezes pega o
  // usuário com uma imagem já vencida na tela ("QR code inválido") bem no momento de
  // escanear — por isso usamos uma margem de segurança (15s) por padrão. Ajuste aqui se
  // quiser forçar exatamente 20.000ms.
  const QR_AUTO_REFRESH_MS = 15000;

  useEffect(() => {
    if (canalSelecionado?.id !== 'whatsapp') return;
    if (whatsappConectado) return; // ja conectado, nao precisa de QR
    buscarQrCode();
    // Auto-refresh do QR Code: renova a imagem sozinho, sem precisar de F5
    pollRef.current = setInterval(buscarQrCode, QR_AUTO_REFRESH_MS);
    // Auto-refresh do STATUS: alem de esperar o webhook avisar via Realtime (assim que o
    // celular escanear, whatsappStatus vira 'open' sozinho e fecha o modal), tambem
    // CONSULTA o status direto na Evolution API a cada 5s como respaldo. Cobre o caso do
    // webhook nao avisar por algum motivo (evento com nome diferente do esperado, falha ao
    // gravar, etc) - sem isso, o WhatsApp podia ficar conectado de verdade e a tela
    // continuar presa mostrando QR Code
    const statusPollRef = setInterval(handleVerificarStatusAgora, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); clearInterval(statusPollRef); };
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
    // So o admin libera grupo e escolhe quem ve (regra de negocio: grupo novo entra
    // represado e ninguem, nem admin fora dessa tela, ve mensagem de grupo nao liberado)
    ...(user?.isAdmin ? [{ id: 'grupos_whatsapp' as IntegracoesTab, label: 'Grupos WhatsApp', icon: Users }] : []),
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

      {tab === 'grupos_whatsapp' && user?.isAdmin && (
        <WhatsAppGroupsModule />
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

                {/* Importar histórico — mensagens de antes de conectar o webhook */}
                <div className="pt-2 border-t border-white/10 text-left space-y-2">
                  {!importando && !importStatus && (
                    <button
                      onClick={handleImportarHistorico}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-primary-500 hover:text-slate-950 text-white/70 text-[11px] font-black uppercase tracking-widest transition-all"
                    >
                      <History size={13} /> Importar histórico de mensagens
                    </button>
                  )}
                  {importError && (
                    <p className="text-[11px] text-rose-400 text-center">{importError}</p>
                  )}
                  {importStatus && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-white/50">
                        <span>{importStatus.concluido ? 'Importação concluída' : 'Importando conversas antigas...'}</span>
                        <span>{importStatus.conversasConcluidas}/{importStatus.totalConversas} conversas</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-primary-500 transition-all"
                          style={{ width: `${importStatus.totalConversas ? Math.round((importStatus.conversasConcluidas / importStatus.totalConversas) * 100) : 0}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-white/40 text-center">{importStatus.mensagensImportadas} mensagens importadas até agora</p>
                      {!importStatus.concluido && !importando && (
                        <button
                          onClick={handleImportarHistorico}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 hover:bg-primary-500 hover:text-slate-950 text-white/70 text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          <RefreshCw size={11} /> Continuar importação
                        </button>
                      )}
                    </div>
                  )}
                </div>

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
                {qrCode && <img src={qrCode} alt="QR Code do WhatsApp" className="w-56 h-56 mx-auto rounded-xl border border-white/10 bg-white p-2" />}
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
