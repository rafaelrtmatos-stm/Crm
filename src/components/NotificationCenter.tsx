import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Check, ChevronDown, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn, AvatarPhoto } from './SharedUI';
import { CrmNotification, CrmNotificationThread, groupNotifications } from '../lib/crmNotifications';

// Sino + painel de notificações pendentes de mensagens (Navbar).
// Abrir/clicar NÃO resolve: só o botão "Marcar como resolvido" chama onResolve.

const formatTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toDateString() === new Date().toDateString() ? format(d, 'HH:mm') : format(d, 'dd/MM HH:mm');
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [resolving, setResolving] = useState<Set<string>>(new Set());

  const threads = useMemo(() => groupNotifications(notifications), [notifications]);
  const count = threads.length;

  const toggleExpanded = (key: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

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
                  const isExpanded = expanded.has(thread.key);
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
                            <button
                              onClick={e => { e.stopPropagation(); handleResolve(thread); }}
                              disabled={isResolving}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <Check size={12} />
                              {isResolving ? 'Resolvendo…' : 'Marcar como resolvido'}
                            </button>
                            {thread.items.length > 1 && (
                              <button
                                onClick={e => { e.stopPropagation(); toggleExpanded(thread.key); }}
                                className="flex items-center gap-1 text-[10px] font-bold text-white/50 hover:text-white cursor-pointer"
                              >
                                {thread.items.length} mensagens
                                <ChevronDown size={12} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && thread.items.length > 1 && (
                        <div className="border-t border-white/10 bg-black/10">
                          {thread.items.map(item => (
                            <button
                              key={item.id}
                              onClick={() => handleOpen(item)}
                              className="w-full flex items-center justify-between gap-3 px-4 py-2 text-left hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <span className="text-xs text-white/70 truncate">{previewOf(item)}</span>
                              <span className="text-[10px] font-bold text-white/40 shrink-0">{formatTime(item.messageAt)}</span>
                            </button>
                          ))}
                        </div>
                      )}
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
