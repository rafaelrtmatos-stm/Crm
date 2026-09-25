import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, MessageSquare, User, X } from 'lucide-react';
import { fotoUsavel, marcarFotoQuebrada } from './foto';

type ToastItem = { id: number; message: string };
type MessageToastItem = { id: number; key: string; title: string; body: string; photoUrl?: string; time?: string; waitLabel?: string; onClick?: () => void };
type ConfirmItem = { id: number; message: string; resolve: (v: boolean) => void };
type PromptItem = { id: number; message: string; defaultValue: string; resolve: (v: string | null) => void };

let toastListeners: ((toasts: ToastItem[]) => void)[] = [];
let messageToastListeners: ((toasts: MessageToastItem[]) => void)[] = [];
let confirmListeners: ((c: ConfirmItem | null) => void)[] = [];
let promptListeners: ((p: PromptItem | null) => void)[] = [];
let toasts: ToastItem[] = [];
let messageToasts: MessageToastItem[] = [];
const messageToastTimers = new Map<number, ReturnType<typeof setTimeout>>();
let confirmQueue: ConfirmItem[] = [];
let promptQueue: PromptItem[] = [];
let idCounter = 0;

function notifyToastListeners() { toastListeners.forEach(l => l(toasts)); }
function notifyMessageToastListeners() { messageToastListeners.forEach(l => l(messageToasts)); }
function notifyConfirmListeners() { confirmListeners.forEach(l => l(confirmQueue[0] || null)); }
function notifyPromptListeners() { promptListeners.forEach(l => l(promptQueue[0] || null)); }

/**
 * Aceita SO uma URL de imagem de verdade (http/https, data:image ou blob:). Descarta vazio, "null",
 * "undefined", JID (5591...@s.whatsapp.net) e telefone -- valores que, jogados num <img>, dariam
 * imagem quebrada. Devolve null quando nao serve (quem chamou usa o placeholder).
 */
export function urlDeFotoValida(url?: string | null): string | null {
  if (typeof url !== 'string') return null;
  const u = url.trim();
  if (!u || u === 'null' || u === 'undefined') return null;
  return /^(https?:\/\/|data:image\/|blob:)/i.test(u) ? u : null;
}

/**
 * Foto do contato/grupo numa notificacao (sino, aviso na tela). Sem foto, com URL invalida ou se a
 * imagem falhar ao carregar (URL do WhatsApp expira), mostra `fallback` -- nunca imagem quebrada.
 */
export function FotoNotificacao({ url, className, fallback }: { url?: string | null; className: string; fallback: React.ReactNode }) {
  // fotoUsavel: URL vencida (oe= do WhatsApp) ou que ja falhou nesta sessao nem e requisitada.
  const src = fotoUsavel(url);
  const [falhou, setFalhou] = useState(false);
  useEffect(() => { setFalhou(false); }, [src]);
  if (!src || falhou) return <>{fallback}</>;
  return <img src={src} alt="" className={className} decoding="async" onError={() => { marcarFotoQuebrada(src); setFalhou(true); }} />;
}

/**
 * Texto do tempo de espera de uma conversa sem resposta: "Aguardando há 5 min", "Aguardando há 1 h 10 min".
 * `desde` = leads.waiting_since (ISO).
 */
export function textoTempoDeEspera(desde?: string | null, agora: number = Date.now()): string {
  const t = desde ? Date.parse(desde) : NaN;
  if (!Number.isFinite(t)) return 'Aguardando resposta';
  const min = Math.max(1, Math.floor((agora - t) / 60000));
  if (min < 60) return `Aguardando há ${min} min`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  return resto === 0 ? `Aguardando há ${h} h` : `Aguardando há ${h} h ${resto} min`;
}

const FOTO_CACHE_MS = 10 * 60 * 1000;
const fotoCache = new Map<string, { url: string | null; em: number }>();

/**
 * Foto ATUAL do contato/grupo, buscada direto na Evolution API (api/whatsapp-foto-perfil.js). O link de
 * foto guardado no lead expira em algumas semanas; sem isso o aviso caia no icone padrao. Cache de 10 min por
 * telefone e limite de 3 s: se a Evolution nao responder (ou o contato nao tiver foto), devolve `fallback`
 * (a foto que ja estava salva) -- nunca trava nem derruba o aviso.
 */
export async function buscarFotoAtual(phone?: string | null, userId?: string | null, fallback?: string | null): Promise<string | undefined> {
  const padrao = urlDeFotoValida(fallback) || undefined;
  const numero = String(phone || '').replace(/\D/g, '');
  if (!numero || !userId) return padrao;
  const guardada = fotoCache.get(numero);
  if (guardada && Date.now() - guardada.em < FOTO_CACHE_MS) return guardada.url || padrao;
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), 3000);
  try {
    const resp = await fetch('/api/whatsapp-foto-perfil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ phone: numero }),
      signal: controle.signal,
    });
    const dados = await resp.json().catch(() => ({}));
    const url = urlDeFotoValida(dados?.photoUrl);
    fotoCache.set(numero, { url, em: Date.now() });
    return url || padrao;
  } catch {
    return padrao;
  } finally {
    clearTimeout(timer);
  }
}

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

const MESSAGE_TOAST_MAX = 3;
const MESSAGE_TOAST_DURATION_MS = 10000;

function dismissMessageToast(id: number) {
  const timer = messageToastTimers.get(id);
  if (timer) { clearTimeout(timer); messageToastTimers.delete(id); }
  messageToasts = messageToasts.filter(t => t.id !== id);
  notifyMessageToastListeners();
}

/**
 * Aviso de mensagem nova no canto inferior direito, DENTRO do proprio CRM. Usado quando a
 * aba esta em foco (nesse caso a notificacao nativa do navegador nao aparece, so o som).
 * Clicar no aviso chama onClick (ex: abrir a conversa). Mensagens seguidas do mesmo contato
 * (mesma `key`) substituem o aviso anterior em vez de empilhar; no maximo 3 avisos na tela.
 */
export function showMessageToast(opts: { key: string; title: string; body: string; photoUrl?: string; time?: string; waitLabel?: string; onClick?: () => void }) {
  const repetidos = messageToasts.filter(t => t.key === opts.key);
  repetidos.forEach(t => {
    const timer = messageToastTimers.get(t.id);
    if (timer) { clearTimeout(timer); messageToastTimers.delete(t.id); }
  });
  messageToasts = messageToasts.filter(t => t.key !== opts.key);

  const id = ++idCounter;
  messageToasts = [...messageToasts, { id, ...opts }];
  while (messageToasts.length > MESSAGE_TOAST_MAX) {
    const antigo = messageToasts[0];
    const timer = messageToastTimers.get(antigo.id);
    if (timer) { clearTimeout(timer); messageToastTimers.delete(antigo.id); }
    messageToasts = messageToasts.slice(1);
  }
  notifyMessageToastListeners();
  messageToastTimers.set(id, setTimeout(() => dismissMessageToast(id), MESSAGE_TOAST_DURATION_MS));
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
  const [messageToastList, setMessageToastList] = useState<MessageToastItem[]>(messageToasts);
  const [confirmItem, setConfirmItem] = useState<ConfirmItem | null>(confirmQueue[0] || null);
  const [promptItem, setPromptItem] = useState<PromptItem | null>(promptQueue[0] || null);
  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    const handlePromptChange = (p: PromptItem | null) => { setPromptItem(p); setPromptValue(p?.defaultValue || ''); };
    toastListeners.push(setToastList);
    messageToastListeners.push(setMessageToastList);
    confirmListeners.push(setConfirmItem);
    promptListeners.push(handlePromptChange);
    return () => {
      toastListeners = toastListeners.filter(l => l !== setToastList);
      messageToastListeners = messageToastListeners.filter(l => l !== setMessageToastList);
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

      {messageToastList.length > 0 && (
        <div className="fixed bottom-4 right-4 sm:right-24 z-[350] flex flex-col gap-2 w-[calc(100vw-2rem)] sm:w-80">
          {messageToastList.map(t => (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => { dismissMessageToast(t.id); t.onClick?.(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { dismissMessageToast(t.id); t.onClick?.(); } }}
              className="flex items-start gap-3 bg-[#1a2333]/95 border border-white/10 shadow-2xl rounded-2xl px-4 py-3 cursor-pointer hover:border-primary-500/40 animate-in slide-in-from-bottom-4 fade-in duration-300"
            >
              <FotoNotificacao
                url={t.photoUrl}
                className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/10 shadow-sm"
                fallback={
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 text-primary-300 flex items-center justify-center shrink-0 text-sm font-black border border-primary-500/30">
                    {t.title && !/^[\d+\s()-]+$/.test(t.title.trim()) ? t.title.trim().charAt(0).toUpperCase() : <User size={18} />}
                  </div>
                }
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-white truncate">{t.title}</p>
                  {t.time && <span className="text-[10px] text-white/40 shrink-0">{t.time}</span>}
                </div>
                <p className="text-xs text-white/70 leading-snug line-clamp-2 break-words">{t.body}</p>
                {t.waitLabel && <p className="text-[10px] font-black uppercase tracking-wider text-rose-400 mt-1">{t.waitLabel}</p>}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismissMessageToast(t.id); }}
                className="text-white/30 hover:text-white shrink-0 border-0 bg-transparent cursor-pointer"
              >
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
