import React from 'react';
import { Menu, Calendar, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PontoHeaderProps {
  onToggleSidebar?: () => void;
  pendingCount?: number;
  userName?: string;
  userPhoto?: string | null;
}

export function PontoHeader({
  onToggleSidebar,
  pendingCount = 0,
  userName = 'Rafael Matos',
  userPhoto,
}: PontoHeaderProps) {
  const dataHoje = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const dataCapitalizada = dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1);
  const inicial = (userName || 'R').charAt(0).toUpperCase();

  return (
    <header className="bg-white border-b border-slate-200/80 px-4 md:px-6 py-3.5 flex items-center justify-between shadow-xs shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Alternar menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">Ponto Eletrônico</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Pílula de data */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-700 text-xs font-semibold select-none">
          <Calendar size={14} className="text-slate-500" />
          <span>Hoje, {dataCapitalizada}</span>
        </div>

        {/* Notificações / Alertas */}
        <div className="relative">
          <button
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative"
            title="Avisos do ponto"
          >
            <Bell size={18} />
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Avatar Usuário */}
        <div className="w-8 h-8 rounded-full bg-emerald-800 text-white font-bold text-xs flex items-center justify-center ring-2 ring-emerald-600/30 overflow-hidden">
          {userPhoto ? (
            <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
          ) : (
            inicial
          )}
        </div>
      </div>
    </header>
  );
}
