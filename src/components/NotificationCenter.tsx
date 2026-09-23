import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Check, Clock, Users } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, AvatarPhoto } from './SharedUI';
import { CrmNotification, CrmNotificationThread, groupNotifications } from '../lib/crmNotifications';

// Sino + painel de notificações pendentes (1 por conversa, tabela crm_notifications).
// Abrir/clicar NÃO resolve: só o botão "Marcar como resolvido" chama onResolve.
// O alerta (som + notificação nativa) roda fora daqui, repetindo a cada 5 min — este
// painel só mostra o estado atual.

const formatTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toDateString() === new Date().toDateString() ? format(d, 'HH:mm') : format(d, 'dd/MM HH:mm');
};

const formatWaiting = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return formatDistanceToNowStrict(d, { locale: ptBR });
};

const previewOf = (n: CrmNotification) => (n.isGroup && n.senderName ? `${n.senderName}: ${n.preview}` : n.preview);

export const NotificationCenter = ({
  notifications,
  onOpen,
  onResolve,
}: {
  notifications: CrmNotification[];
  onOpen: (n: CrmNotification) => void;
  onResolve: (thread: CrmNotificationThread) => Promise<void> | void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [resolving, setResolving] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);

  const threads = useMemo(() => groupNotifications(notifications), [notifications]);
  const count = threads.length;

  // Re-renderiza a cada 30s só pra atualizar o texto "esperando há X min" sem precisar de dado novo.
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const handleResolve = async (thread: CrmNotificationThread) => {
    setResolving(prev => new Set(prev).add(thread.key));
    try { await onResolve(thread); }
    finally {
      setResolving(prev => { const next = new Set(prev); next.delete(thread.key); return next; });
    }
  };

  const handleOpen = (n: CrmNotification) => {
    setIsOpen(false); // só fecha o painel — a notificação continua pendente
    onOpen(n);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(o => !o)}
        title={count > 0 ? `${count} conversa(s) com notificação pendente` : 'Sem notificações pendentes'}
        className="relative p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
      >
        <Bell size={18} className={cn(count > 0 && 'text-amber-400')} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-[min(92vw,26rem)] bg-[#1a2333]/95 backdrop-blur-3xl rounded-[28px] shadow-2xl border border-white/10 p-2 z-50"
            >
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <p className="text-xs font-black uppercase tracking-wider text-white/70">Notificações pendentes</p>
                <span className="text-[10px] font-bold text-white/40">{count}</span>
              </div>

              <div className="max-h-[70vh] overflow-y-auto custom-scrollbar space-y-1.5 p-1">
                {threads.length === 0 && (
                  <p className="text-center text-xs text-white/40 font-medium py-8">Nenhuma notificação pendente</p>
                )}

                {threads.map(thread => {
                  const isResolving = resolving.has(thread.key);
                  return (
                    <div key={thread.key} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleOpen(thread.first)}
                        onKeyDown={e => { if (e.key === 'Enter') handleOpen(thread.first); }}
                        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <AvatarPhoto photoUrl={thread.photoUrl} name={thread.title} className="w-10 h-10 shrink-0" textClassName="text-sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                              {thread.isGroup && <Users size={12} className="text-primary-300 shrink-0" />}
                              {thread.title}
                            </p>
                            <span className="text-[10px] font-bold text-white/40 shrink-0">{formatTime(thread.last.messageAt)}</span>
                          </div>
                          <p className="text-xs text-white/60 truncate">{previewOf(thread.last)}</p>
                          <div className="flex items-center justify-between gap-2 mt-2">
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-black uppercase tracking-wider">
                              <Clock size={12} />
                              Esperando há {formatWaiting(thread.waitingSince)}
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); handleResolve(thread); }}
                              disabled={isResolving}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                            >
                              <Check size={12} />
                              {isResolving ? 'Resolvendo…' : 'Marcar como resolvido'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
