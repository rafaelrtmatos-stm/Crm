import React, { useState } from 'react';
import { Plug, Bot, MessageCircle, Facebook, Instagram, QrCode } from 'lucide-react';
import { GlassCard, Badge, Modal, cn } from './SharedUI';
import { RobozinhoRafaModule } from './RobozinhoRafaModule';
import { Company, AppUser } from '../types';

// Página "Integrações" — reúne num só lugar as conexões com canais externos
// (WhatsApp/Facebook/Instagram, ainda não implementadas de verdade — ver
// card "Em breve" abaixo, mesmo padrão já usado em RobozinhoRafaModule) e o
// Robozinho Rafa (aba 2, componente já existente, reaproveitado sem nenhuma
// alteração na lógica dele).

type IntegracoesTab = 'conexoes' | 'robozinho_rafa';

interface CanalConexao {
  id: string;
  nome: string;
  icon: any;
  cor: string;
  descricao: string;
}

const CANAIS: CanalConexao[] = [
  { id: 'whatsapp', nome: 'WhatsApp', icon: MessageCircle, cor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', descricao: 'Receba e envie mensagens do WhatsApp direto no Funil de Atendimento.' },
  { id: 'facebook', nome: 'Facebook', icon: Facebook, cor: 'text-blue-400 bg-blue-500/10 border-blue-500/20', descricao: 'Conecte a página do Facebook para responder mensagens por aqui.' },
  { id: 'instagram', nome: 'Instagram', icon: Instagram, cor: 'text-pink-400 bg-pink-500/10 border-pink-500/20', descricao: 'Conecte o Instagram Direct para centralizar o atendimento.' },
];

export const IntegracoesModule = ({ currentCompany, user }: { currentCompany: Company | null; user: AppUser | null }) => {
  const [tab, setTab] = useState<IntegracoesTab>('conexoes');
  const [canalSelecionado, setCanalSelecionado] = useState<CanalConexao | null>(null);

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
          {CANAIS.map(canal => (
            <GlassCard key={canal.id} className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0", canal.cor)}>
                  <canal.icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{canal.nome}</p>
                  <Badge variant="outline">Não conectado</Badge>
                </div>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">{canal.descricao}</p>
              <button
                onClick={() => setCanalSelecionado(canal)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-primary-500 hover:text-slate-950 text-white/70 text-[11px] font-black uppercase tracking-widest transition-all"
              >
                Conectar
              </button>
            </GlassCard>
          ))}
        </div>
      )}

      {tab === 'robozinho_rafa' && (
        <RobozinhoRafaModule currentCompany={currentCompany} user={user} />
      )}

      {/* Modal de conexão — estrutura preparada para a integração real de cada
          canal; ainda não implementada nesta versão (mesmo padrão "Em breve"
          já usado na aba Configurações do Robozinho Rafa). */}
      <Modal isOpen={!!canalSelecionado} onClose={() => setCanalSelecionado(null)} title={canalSelecionado ? `Conectar ${canalSelecionado.nome}` : ''} size="sm">
        {canalSelecionado && (
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
