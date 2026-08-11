import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

type ToastItem = { id: number; message: string };
type ConfirmItem = { id: number; message: string; resolve: (v: boolean) => void };
type PromptItem = { id: number; message: string; defaultValue: string; resolve: (v: string | null) => void };

let toastListeners: ((toasts: ToastItem[]) => void)[] = [];
let confirmListeners: ((c: ConfirmItem | null) => void)[] = [];
let promptListeners: ((p: PromptItem | null) => void)[] = [];
let toasts: ToastItem[] = [];
let confirmQueue: ConfirmItem[] = [];
let promptQueue: PromptItem[] = [];
let idCounter = 0;

function notifyToastListeners() { toastListeners.forEach(l => l(toasts)); }
function notifyConfirmListeners() { confirmListeners.forEach(l => l(confirmQueue[0] || null)); }
function notifyPromptListeners() { promptListeners.forEach(l => l(promptQueue[0] || null)); }

/** Substitui window.alert() — mostra uma notificação do proprio sistema (toast), nao um popup do navegador */
export function showAlert(message: string) {
  const id = ++idCounter;
  toasts = [...toasts, { id, message }];
  notifyToastListeners();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notifyToastListeners();
  }, 6000);
}

function dismissToast(id: number) {
  toasts = toasts.filter(t => t.id !== id);
  notifyToastListeners();
}

/** Substitui window.confirm() — mostra um modal do proprio sistema e retorna uma Promise<boolean> */
export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const id = ++idCounter;
    confirmQueue = [...confirmQueue, { id, message, resolve }];
    notifyConfirmListeners();
  });
}

function resolveCurrentConfirm(result: boolean) {
  const current = confirmQueue[0];
  if (!current) return;
  current.resolve(result);
  confirmQueue = confirmQueue.slice(1);
  notifyConfirmListeners();
}

/** Substitui window.prompt() — mostra um modal do proprio sistema com campo de texto, retorna Promise<string | null> */
export function showPrompt(message: string, defaultValue: string = ''): Promise<string | null> {
  return new Promise((resolve) => {
    const id = ++idCounter;
    promptQueue = [...promptQueue, { id, message, defaultValue, resolve }];
    notifyPromptListeners();
  });
}

function resolveCurrentPrompt(result: string | null) {
  const current = promptQueue[0];
  if (!current) return;
  current.resolve(result);
  promptQueue = promptQueue.slice(1);
  notifyPromptListeners();
}

/** Renderizado uma unica vez, perto da raiz do app — mostra os toasts e o modal de confirmacao ativos */
export function NotifyHost() {
  const [toastList, setToastList] = useState<ToastItem[]>(toasts);
  const [confirmItem, setConfirmItem] = useState<ConfirmItem | null>(confirmQueue[0] || null);
  const [promptItem, setPromptItem] = useState<PromptItem | null>(promptQueue[0] || null);
  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    const handlePromptChange = (p: PromptItem | null) => { setPromptItem(p); setPromptValue(p?.defaultValue || ''); };
    toastListeners.push(setToastList);
    confirmListeners.push(setConfirmItem);
    promptListeners.push(handlePromptChange);
    return () => {
      toastListeners = toastListeners.filter(l => l !== setToastList);
      confirmListeners = confirmListeners.filter(l => l !== setConfirmItem);
      promptListeners = promptListeners.filter(l => l !== handlePromptChange);
    };
  }, []);

  return (
    <>
      {toastList.length > 0 && (
        <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm">
          {toastList.map(t => (
            <div
              key={t.id}
              className="flex items-start gap-2.5 bg-[#1a2333] border border-white/10 shadow-2xl rounded-2xl px-4 py-3 animate-in slide-in-from-right-4 fade-in duration-300"
            >
              <CheckCircle2 size={16} className="text-primary-400 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-white flex-1 leading-snug whitespace-pre-line">{t.message}</p>
              <button onClick={() => dismissToast(t.id)} className="text-white/30 hover:text-white shrink-0 border-0 bg-transparent cursor-pointer">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmItem && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => resolveCurrentConfirm(false)} />
          <div className="relative w-full max-w-sm bg-[#1a2333] border border-white/10 rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Confirmar Ação</h3>
            </div>
            <p className="text-xs text-white/60 leading-relaxed whitespace-pre-line">{confirmItem.message}</p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => resolveCurrentConfirm(false)}
                className="flex-1 h-11 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer bg-transparent"
              >
                Cancelar
              </button>
              <button
                onClick={() => resolveCurrentConfirm(true)}
                className="flex-1 h-11 rounded-xl bg-primary-500 hover:bg-primary-400 text-slate-900 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-0"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      {promptItem && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => resolveCurrentPrompt(null)} />
          <div className="relative w-full max-w-sm bg-[#1a2333] border border-white/10 rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-500/15 text-primary-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">{promptItem.message}</h3>
            </div>
            <input
              autoFocus
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') resolveCurrentPrompt(promptValue); if (e.key === 'Escape') resolveCurrentPrompt(null); }}
              className="w-full h-11 bg-slate-900/80 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-primary-500"
            />
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => resolveCurrentPrompt(null)}
                className="flex-1 h-11 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer bg-transparent"
              >
                Cancelar
              </button>
              <button
                onClick={() => resolveCurrentPrompt(promptValue)}
                className="flex-1 h-11 rounded-xl bg-primary-500 hover:bg-primary-400 text-slate-900 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-0"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
