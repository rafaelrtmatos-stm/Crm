import React from 'react';
import { Company, AppUser } from '../types';
import { X } from 'lucide-react';
import { MessagesModule } from './Modules';

interface MessagesSidebarPopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentCompany: Company | null;
  user: AppUser | null;
  preselectedLeadId?: string;
}

// Painel de Mensagens acionado pelo menu lateral (desktop).
//
// Regras de posicionamento (não mexer sem revalidar as 5 regras abaixo):
// 1) Cobre TODO o conteúdo à direita do menu lateral (left-80 = mesma largura
//    fixa da sidebar em desktop, w-80).
// 2) NUNCA sobrepõe o menu lateral esquerdo — por isso começa exatamente onde
//    a sidebar termina (left-80) e fica em z-40, abaixo do z-50 da sidebar.
// 3) Sem backdrop: não há blur, escurecimento nem transparência aplicados
//    sobre o conteúdo abaixo — o painel simplesmente ocupa 100% da área à
//    direita da sidebar com fundo próprio e opaco.
// 4) Fundo sólido e nítido (bg opaco, sem backdrop-blur).
export const MessagesSidebarPopup: React.FC<MessagesSidebarPopupProps> = ({
  isOpen,
  onClose,
  currentCompany,
  user,
  preselectedLeadId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-0 bottom-0 left-80 right-0 z-40 bg-[#0b1220] flex flex-col shadow-2xl">
      {/* Header do painel */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0b1220] shrink-0">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          Mensagens
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
          title="Fechar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Conteúdo: reaproveita o mesmo Modo Conversa em Foco (lista + conversa) do módulo de Mensagens */}
      <div className="flex-1 min-h-0 p-4 md:p-6 overflow-hidden bg-[#0b1220]">
        <MessagesModule currentCompany={currentCompany} user={user} preselectedLeadId={preselectedLeadId} />
      </div>
    </div>
  );
};
