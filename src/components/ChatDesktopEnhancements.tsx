import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Play, 
  Pause, 
  Copy, 
  Check, 
  Quote, 
  Reply,
  Star,
  Pencil, 
  Trash2, 
  Search, 
  ChevronUp, 
  ChevronDown, 
  ChevronRight,
  MoreVertical,
  MoreHorizontal,
  MessageCircle,
  Package,
  X, 
  UploadCloud, 
  FileAudio, 
  Sparkles, 
  Loader2, 
  ExternalLink,
  Users,
  StickyNote,
  ListTodo,
  ShoppingBag,
  Phone,
  MapPin,
  AtSign,
  Target,
  Tag,
  Save,
  Plus,
  RefreshCw,
  Columns3,
  PanelRightClose,
  Forward,
  ArrowLeft,
  User,
  Image as ImageIcon,
  Film,
  FileText,
  Mic,
  Download
} from 'lucide-react';
import { Badge, Button, cn, AvatarPhoto } from './SharedUI';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

function safeFormatDate(d: any, fmt: string) {
  try {
    const val = typeof d === 'string' ? new Date(d) : d instanceof Timestamp ? d.toDate() : d;
    return val ? format(val, fmt) : '';
  } catch {
    return '';
  }
}

// ==========================================
// 1. REPRODUTOR DE ÁUDIO COM VELOCIDADE (1x, 1.5x, 2x) & WAVEFORM ESTILO WHATSAPP
// ==========================================
const WAVEFORM_HEIGHTS = [8, 14, 20, 12, 16, 22, 18, 10, 14, 24, 18, 12, 8, 14, 22, 16, 12, 20, 14, 10, 16, 22, 18, 12, 8, 14, 10, 6];

export const AudioMessagePlayer = ({
  src,
  transcription,
  transcriptionStatus,
  onTranscribe,
  isTranscribing = false,
  isOutgoing = false,
  senderPhotoUrl,
  senderName,
  onError,
  hasError = false,
  initialDuration,
}: {
  src: string;
  transcription?: { text: string };
  transcriptionStatus?: string;
  onTranscribe?: () => void;
  isTranscribing?: boolean;
  isOutgoing?: boolean;
  senderPhotoUrl?: string;
  senderName?: string;
  onError?: () => void;
  hasError?: boolean;
  initialDuration?: number;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [copiedTranscription, setCopiedTranscription] = useState(false);

  useEffect(() => {
    if (initialDuration && initialDuration > 0 && (!duration || duration === 0)) {
      setDuration(initialDuration);
    }
  }, [initialDuration]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const updateTime = () => setCurrentTime(el.currentTime);
    const updateDuration = () => {
      if (el.duration && !isNaN(el.duration) && isFinite(el.duration)) {
        setDuration(el.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    el.addEventListener('timeupdate', updateTime);
    el.addEventListener('loadedmetadata', updateDuration);
    el.addEventListener('durationchange', updateDuration);
    el.addEventListener('canplay', updateDuration);
    el.addEventListener('ended', onEnded);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);

    if (el.duration && !isNaN(el.duration) && isFinite(el.duration)) {
      setDuration(el.duration);
    }

    return () => {
      el.removeEventListener('timeupdate', updateTime);
      el.removeEventListener('loadedmetadata', updateDuration);
      el.removeEventListener('durationchange', updateDuration);
      el.removeEventListener('canplay', updateDuration);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [src]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.play().catch(err => {
        console.error('Falha ao reproduzir áudio:', err);
        onError?.();
      });
    }
  };

  const handleSpeedChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSpeed: 1 | 1.5 | 2 = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSeekIndex = (index: number) => {
    if (!duration || !audioRef.current) return;
    const targetTime = (index / WAVEFORM_HEIGHTS.length) * duration;
    setCurrentTime(targetTime);
    audioRef.current.currentTime = targetTime;
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec) || sec <= 0) return duration > 0 ? formatSeconds(duration) : '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCopyTranscription = async () => {
    if (!transcription?.text) return;
    try {
      await navigator.clipboard.writeText(transcription.text);
      setCopiedTranscription(true);
      setTimeout(() => setCopiedTranscription(false), 2000);
    } catch {
      // Ignora erro
    }
  };

  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const activeBarIndex = Math.floor((currentPercent / 100) * WAVEFORM_HEIGHTS.length);

  return (
    <div
      className="space-y-1.5 w-full max-w-[290px] sm:max-w-[330px] min-w-0 select-none touch-manipulation text-slate-800"
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onError={onError}
        className="hidden"
      />

      <div className="flex items-center gap-2.5">
        {/* Avatar com microfonezinho no canto inferior direito estilo WhatsApp iOS */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/10 flex items-center justify-center overflow-hidden">
            {senderPhotoUrl ? (
              <img src={senderPhotoUrl} alt={senderName || ''} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-slate-600 dark:text-white/70">{(senderName || 'A').slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#00a884] border-2 border-white dark:border-[#111b21] flex items-center justify-center text-white shadow-sm">
            <Mic size={9} strokeWidth={2.5} />
          </div>
        </div>

        {/* Play/Pause Button - destaque garantido no WhatsApp */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm cursor-pointer"
          title={isPlaying ? "Pausar" : "Tocar áudio"}
        >
          {isPlaying ? (
            <Pause size={17} fill="currentColor" />
          ) : (
            <Play size={17} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        {/* Waveform interativa estilo WhatsApp */}
        <div className="flex-1 flex flex-col justify-center gap-1 min-w-[100px]">
          <div className="flex items-center gap-[2px] h-6 cursor-pointer py-1" title="Clique para avançar/retroceder">
            {WAVEFORM_HEIGHTS.map((h, idx) => {
              const isPlayed = idx <= activeBarIndex;
              return (
                <div
                  key={idx}
                  onClick={() => handleSeekIndex(idx)}
                  className="flex-1 flex items-center justify-center h-full hover:opacity-80 transition-opacity"
                >
                  <div
                    style={{ height: `${h}px` }}
                    className={cn(
                      "w-[2px] sm:w-[2.5px] rounded-full transition-colors",
                      isPlayed ? "bg-[#00a884]" : "bg-slate-300 dark:bg-white/30"
                    )}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-white/60 px-0.5">
            <span>{isPlaying || currentTime > 0 ? formatSeconds(currentTime) : (duration > 0 ? formatSeconds(duration) : '0:00')}</span>
            {speed > 1 && (
              <span className="text-[8.5px] px-1 rounded bg-[#00a884]/20 text-[#00a884] font-bold">
                {speed}x
              </span>
            )}
          </div>
        </div>

        {/* Speed button (1x / 1.5x / 2x) */}
        <button
          type="button"
          onClick={handleSpeedChange}
          className={cn(
            "h-6 px-1.5 rounded text-[9.5px] font-black tracking-tight shrink-0 transition-all border active:scale-95 cursor-pointer",
            speed > 1 
              ? "bg-[#00a884]/20 text-[#00a884] border-[#00a884]/40 shadow-sm" 
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 dark:bg-white/10 dark:text-white/80 dark:border-white/10"
          )}
          title="Alterar velocidade (1x, 1.5x, 2x)"
        >
          {speed}x
        </button>
      </div>

      {hasError && (
        <p className="text-[10px] font-bold text-rose-400">
          Não foi possível carregar o áudio.{' '}
          <a href={src} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">
            Abrir link <ExternalLink size={9} />
          </a>
        </p>
      )}

      {/* Transcrição de áudio */}
      {transcription?.text ? (
        <div className="border-t border-slate-100 pt-1.5 mt-1">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">📝 Transcrição</span>
            <button
              type="button"
              onClick={handleCopyTranscription}
              className="text-[9px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-0.5 transition-colors p-1"
              title="Copiar texto da transcrição"
            >
              {copiedTranscription ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
              <span>{copiedTranscription ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
          <p className="text-[11px] italic text-slate-700 leading-snug whitespace-pre-wrap select-text">
            "{transcription.text}"
          </p>
        </div>
      ) : (transcriptionStatus === 'pending' || transcriptionStatus === 'processing' || isTranscribing) ? (
        <div className="border-t border-slate-100 pt-1.5 text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
          <Loader2 size={11} className="animate-spin text-primary-500" /> Transcrevendo áudio...
        </div>
      ) : onTranscribe ? (
        <div className="border-t border-slate-100 pt-1 flex items-center justify-between">
          {transcriptionStatus === 'failed' && (
            <span className="text-[9px] font-bold text-rose-500">Falha ao transcrever</span>
          )}
          <button
            type="button"
            onClick={onTranscribe}
            disabled={isTranscribing}
            className="text-[9px] font-black uppercase text-primary-600 hover:text-primary-700 flex items-center gap-1 disabled:opacity-50 ml-auto py-1"
          >
            {isTranscribing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} Transcrever áudio
          </button>
        </div>
      ) : null}
    </div>
  );
};

// ==========================================
// 2. AÇÕES FLUTUANTES NO HOVER DA MENSAGEM
// ==========================================
export const MessageHoverActions = ({
  text,
  transcriptionText,
  mediaContentType,
  fileName,
  isOutgoing,
  canEditOrDelete,
  onEdit,
  onDelete,
  onQuote,
  onForward,
  onSaveSticker,
  isSticker = false,
  isStickerSaved = false,
  isDeleting = false,
}: {
  text?: string;
  transcriptionText?: string;
  mediaContentType?: string;
  fileName?: string;
  isOutgoing: boolean;
  canEditOrDelete: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onQuote?: (quoteText: string) => void;
  onForward?: () => void;
  onSaveSticker?: () => void;
  isSticker?: boolean;
  isStickerSaved?: boolean;
  isDeleting?: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  const effectiveText = text || transcriptionText || fileName || (mediaContentType ? `[${mediaContentType}]` : '') || '';

  const handleCopy = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!effectiveText) return;
    try {
      await navigator.clipboard.writeText(effectiveText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setIsActionSheetOpen(false);
    } catch {
      // Ignora erro
    }
  };

  const handleQuoteClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onQuote) {
      onQuote(effectiveText || 'Mensagem');
      setIsActionSheetOpen(false);
    }
  };

  if (!effectiveText && !canEditOrDelete && !onQuote && !onForward && !onSaveSticker) return null;

  return (
    <>
      {/* Botões rápidos no desktop (hover) */}
      <div className={cn(
        "absolute -top-3.5 z-20 hidden sm:flex opacity-0 group-hover:opacity-100 transition-all duration-150 items-center gap-0.5 p-0.5 rounded-full bg-[#202c33] border border-white/10 backdrop-blur-md shadow-lg",
        isOutgoing ? "right-2" : "left-2"
      )}>
        {/* Botão de Salvar Figurinha nos Favoritos */}
        {isSticker && onSaveSticker && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSaveSticker(); }}
            title={isStickerSaved ? "Figurinha salva nas Favoritas" : "Salvar figurinha nas Favoritas"}
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer",
              isStickerSaved
                ? "text-amber-400 bg-amber-400/20"
                : "text-white/70 hover:text-amber-400 hover:bg-white/10 active:bg-white/20"
            )}
          >
            <Star size={11} className={isStickerSaved ? "fill-amber-400" : ""} />
          </button>
        )}

        {effectiveText && (
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "Copiado!" : "Copiar texto"}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          </button>
        )}

        {onQuote && (
          <button
            type="button"
            onClick={handleQuoteClick}
            title="Responder / Citar esta mensagem"
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-emerald-400 hover:bg-white/10 active:bg-white/20 transition-colors"
          >
            <Reply size={12} className="rotate-180" />
          </button>
        )}

        {onForward && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onForward(); }}
            title="Encaminhar mensagem"
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-sky-400 hover:bg-white/10 active:bg-white/20 transition-colors"
          >
            <Forward size={12} />
          </button>
        )}

        {canEditOrDelete && onEdit && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            title="Editar mensagem"
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-primary-300 hover:bg-primary-500/20 active:bg-primary-500/30 transition-colors"
          >
            <Pencil size={11} />
          </button>
        )}

        {canEditOrDelete && onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={isDeleting}
            title="Apagar para todos"
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-rose-400 hover:bg-rose-500/20 active:bg-rose-500/30 transition-colors disabled:opacity-50"
          >
            {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          </button>
        )}

        {/* Mais opções (Action Sheet) */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIsActionSheetOpen(true); }}
          title="Mais opções da mensagem"
          className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
        >
          <MoreHorizontal size={11} />
        </button>
      </div>

      {/* Gatilho visível no Mobile: botão no canto superior da mensagem (z-[35] garantindo ficar sempre na frente do card de mensagem) */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsActionSheetOpen(true); }}
        className={cn(
          "sm:hidden absolute -top-2 w-6 h-6 rounded-full bg-slate-900/95 border border-white/20 text-white/80 hover:text-white flex items-center justify-center shadow-md transition-all active:scale-90 z-[35] cursor-pointer",
          isOutgoing ? "right-1" : "left-1"
        )}
        title="Opções da mensagem"
      >
        <MoreHorizontal size={13} />
      </button>

      {/* PORTAL DO ACTION SHEET ESTILO WHATSAPP IOS (Z-INDEX TOTAL NO BODY, NUNCA CORTA) */}
      {isActionSheetOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-3 animate-in fade-in duration-200 select-none"
          onClick={(e) => { e.stopPropagation(); setIsActionSheetOpen(false); }}
        >
          <div 
            className="w-full max-w-sm space-y-2.5 pb-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Emojis de Reação Rápida no Topo (WhatsApp iOS) */}
            <div className="flex items-center justify-around bg-[#1f2c34] border border-white/10 rounded-full px-3 py-2 shadow-2xl">
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji, i) => (
                <span key={i} className="text-2xl hover:scale-125 transition-transform cursor-pointer active:scale-95">
                  {emoji}
                </span>
              ))}
            </div>

            {/* Menu de Ações Estilo iOS */}
            <div className="bg-[#1f2c34] border border-white/10 rounded-2xl overflow-hidden shadow-2xl divide-y divide-white/5 text-sm font-semibold text-white">
              {onQuote && (
                <button
                  type="button"
                  onClick={() => handleQuoteClick()}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                >
                  <span className="text-white/90">Responder</span>
                  <Reply size={16} className="text-white/50 rotate-180" />
                </button>
              )}

              {effectiveText && (
                <button
                  type="button"
                  onClick={() => handleCopy()}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                >
                  <span className="text-white/90">{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                  <Copy size={16} className={copied ? "text-emerald-400" : "text-white/50"} />
                </button>
              )}

              {onForward && (
                <button
                  type="button"
                  onClick={() => { onForward(); setIsActionSheetOpen(false); }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                >
                  <span className="text-white/90">Encaminhar</span>
                  <Forward size={16} className="text-white/50" />
                </button>
              )}

              {isSticker && onSaveSticker && (
                <button
                  type="button"
                  onClick={() => { onSaveSticker(); setIsActionSheetOpen(false); }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                >
                  <span className="text-white/90">{isStickerSaved ? 'Salva nas Favoritas' : 'Favoritar Figurinha'}</span>
                  <Star size={16} className={isStickerSaved ? "text-amber-400 fill-amber-400" : "text-white/50"} />
                </button>
              )}

              {canEditOrDelete && onEdit && (
                <button
                  type="button"
                  onClick={() => { onEdit(); setIsActionSheetOpen(false); }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                >
                  <span className="text-white/90">Editar Mensagem</span>
                  <Pencil size={16} className="text-white/50" />
                </button>
              )}

              {canEditOrDelete && onDelete && (
                <button
                  type="button"
                  onClick={() => { onDelete(); setIsActionSheetOpen(false); }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-rose-500/10 active:bg-rose-500/20 text-rose-400 transition-colors text-left"
                >
                  <span>Apagar para Todos</span>
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Botão Cancelar */}
            <button
              type="button"
              onClick={() => setIsActionSheetOpen(false)}
              className="w-full py-3 bg-[#1f2c34] hover:bg-[#2a3942] active:bg-[#182229] border border-white/10 rounded-2xl text-center text-sm font-bold text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// ==========================================
// 3. BARRA DE BUSCA INTERNA NA CONVERSA
// ==========================================
export const ChatSearchBar = ({
  isOpen,
  onClose,
  searchTerm,
  setSearchTerm,
  totalMatches,
  currentMatchIndex,
  onNext,
  onPrev,
}: {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  totalMatches: number;
  currentMatchIndex: number;
  onNext: () => void;
  onPrev: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/95 border-b border-white/10 text-white z-20 backdrop-blur-md">
      <Search size={14} className="text-white/40 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (e.shiftKey) onPrev();
            else onNext();
          } else if (e.key === 'Escape') {
            onClose();
          }
        }}
        placeholder="Pesquisar mensagens nesta conversa..."
        className="flex-1 bg-transparent text-xs text-white placeholder:text-white/40 outline-none"
      />
      {searchTerm && (
        <span className="text-[10px] font-bold text-white/50 shrink-0">
          {totalMatches > 0 ? `${currentMatchIndex + 1} de ${totalMatches}` : '0 encontradas'}
        </span>
      )}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onPrev}
          disabled={totalMatches === 0}
          title="Anterior (Shift + Enter)"
          className="p-1 rounded-md hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-30 transition-colors"
        >
          <ChevronUp size={15} />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={totalMatches === 0}
          title="Próxima (Enter)"
          className="p-1 rounded-md hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-30 transition-colors"
        >
          <ChevronDown size={15} />
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Fechar busca (Esc)"
          className="p-1 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors ml-1"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 4. OVERLAY VISUAL DE DRAG & DROP
// ==========================================
export const ChatDropZoneOverlay = ({ isDragging }: { isDragging: boolean }) => {
  if (!isDragging) return null;
  return (
    <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary-500 animate-in fade-in duration-150 pointer-events-none">
      <div className="w-16 h-16 rounded-3xl bg-primary-500/20 border border-primary-500/40 flex items-center justify-center text-primary-400 mb-3 animate-bounce">
        <UploadCloud size={32} />
      </div>
      <h3 className="text-base font-bold text-white mb-1">Solte o arquivo para enviar</h3>
      <p className="text-xs text-white/60 text-center max-w-sm">
        Fotos (até 16 MB) e Documentos (até 100 MB) serão enviados diretamente para o WhatsApp do cliente.
      </p>
    </div>
  );
};

// ==========================================
// 5. PAINEL LATERAL DE CONTEXTO DO CLIENTE (LAYOUT 3 COLUNAS)
// ==========================================
export const CustomerContextSidebar = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  conversation,
  clienteVinculado,
  isLoadingCliente,
  nameFieldsDraft,
  setNameFieldsDraft,
  nomesMudaram,
  handleSaveNames,
  isSavingNames,
  phoneDraft,
  setPhoneDraft,
  phoneMudou,
  handleSavePhone,
  isSavingPhone,
  handleCopyPhone,
  notes,
  newNoteText,
  setNewNoteText,
  handleAddNote,
  isSavingNote,
  handleDeleteNote,
  noteInputRef,
  tasks,
  newTaskTitle,
  setNewTaskTitle,
  handleAddTask,
  isSavingTask,
  handleToggleTask,
  handleDeleteTask,
  taskInputRef,
  clienteVendas,
  isLoadingVendas,
  onOpenVenda,
  onOpenContrato,
  onOpenOrcamento,
  tags = [],
  onSaveTags,
  isMobileDrawer = false,
  isGroup = false,
  groupParticipants = [],
  groupMedia = [],
  groupDescription = null,
  onOpenMediaViewer,
  onStartSale,
  onOpenChatWithPhone,
  orderSummaryDraft,
  setOrderSummaryDraft,
  estimatedValueDraft,
  setEstimatedValueDraft,
  onSaveOrderInfo,
  isSavingOrderInfo = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'data' | 'notes' | 'tasks' | 'sales' | 'participants' | 'media';
  setActiveTab: (t: 'data' | 'notes' | 'tasks' | 'sales' | 'participants' | 'media') => void;
  conversation: any;
  clienteVinculado: any;
  isLoadingCliente: boolean;
  nameFieldsDraft: any;
  setNameFieldsDraft: (v: any) => void;
  nomesMudaram: boolean;
  handleSaveNames: () => void;
  isSavingNames: boolean;
  phoneDraft: string;
  setPhoneDraft: (v: string) => void;
  phoneMudou: boolean;
  handleSavePhone: () => void;
  isSavingPhone: boolean;
  handleCopyPhone: () => void;
  notes: any[];
  newNoteText: string;
  setNewNoteText: (v: string) => void;
  handleAddNote: () => void;
  isSavingNote: boolean;
  handleDeleteNote: (n: any) => void;
  noteInputRef: React.RefObject<HTMLTextAreaElement | null>;
  tasks: any[];
  newTaskTitle: string;
  setNewTaskTitle: (v: string) => void;
  handleAddTask: () => void;
  isSavingTask: boolean;
  handleToggleTask: (t: any) => void;
  handleDeleteTask: (t: any) => void;
  taskInputRef: React.RefObject<HTMLInputElement | null>;
  clienteVendas: any[];
  isLoadingVendas: boolean;
  onOpenVenda?: (id: string) => void;
  onOpenContrato?: (id: string) => void;
  onOpenOrcamento?: (id: string) => void;
  tags?: string[];
  onSaveTags?: (tags: string[]) => void;
  isMobileDrawer?: boolean;
  isGroup?: boolean;
  groupParticipants?: any[];
  groupMedia?: any[];
  groupDescription?: string | null;
  onOpenMediaViewer?: (media: any) => void;
  onStartSale?: () => void;
  onOpenChatWithPhone?: (phone: string) => void;
  orderSummaryDraft?: string;
  setOrderSummaryDraft?: (v: string) => void;
  estimatedValueDraft?: string | number;
  setEstimatedValueDraft?: (v: string | number) => void;
  onSaveOrderInfo?: () => void;
  isSavingOrderInfo?: boolean;
}) => {
  const [newTagInput, setNewTagInput] = useState('');
  const [participantSearch, setParticipantSearch] = useState('');
  const [mediaSubFilter, setMediaSubFilter] = useState<'all' | 'images' | 'audio' | 'documents'>('all');

  const handleAddTag = () => {
    const val = newTagInput.trim();
    if (!val) return;
    const current = tags || [];
    if (!current.includes(val)) {
      onSaveTags?.([...current, val]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const current = tags || [];
    onSaveTags?.(current.filter(t => t !== tagToRemove));
  };

  const handleAddQuickTag = (tag: string) => {
    const current = tags || [];
    if (!current.includes(tag)) {
      onSaveTags?.([...current, tag]);
    }
  };

  if (!isOpen) return null;

  const isMediaImage = (m: any) => m.content_type === 'image' || m.mediaContentType === 'image' || /\.(jpe?g|png|webp|gif|bmp)($|\?)/i.test(m.media_url || m.mediaUrl || '');
  const isMediaVideo = (m: any) => m.content_type === 'video' || m.mediaContentType === 'video' || /\.(mp4|webm|mov|m4v)($|\?)/i.test(m.media_url || m.mediaUrl || '');
  const isMediaAudio = (m: any) => m.content_type === 'audio' || m.mediaContentType === 'audio' || /\.(ogg|opus|mp3|wav|m4a)($|\?)/i.test(m.media_url || m.mediaUrl || '');
  const isMediaDoc = (m: any) => !isMediaImage(m) && !isMediaVideo(m) && !isMediaAudio(m);

  const imagesAndVideos = (groupMedia || []).filter(m => isMediaImage(m) || isMediaVideo(m));
  const audios = (groupMedia || []).filter(m => isMediaAudio(m));
  const docs = (groupMedia || []).filter(m => isMediaDoc(m));

  const filteredParticipants = (groupParticipants || []).filter((p: any) => {
    if (!participantSearch.trim()) return true;
    const term = participantSearch.toLowerCase();
    return (p.name || '').toLowerCase().includes(term) || (p.phoneNumber || '').includes(term);
  });

  const resolvedTab = isGroup
    ? (activeTab === 'media' ? 'media' : 'participants')
    : activeTab;

  const tabsList = isGroup
    ? [
        { id: 'participants', label: 'PARTICIPANTES', icon: Users, count: (groupParticipants || []).length },
        { id: 'media', label: 'MÍDIAS', icon: ImageIcon, count: (groupMedia || []).length },
      ]
    : [
        { id: 'sales', label: 'VENDAS', icon: ShoppingBag, count: clienteVendas.length },
        { id: 'data', label: 'DADOS', icon: Users },
        { id: 'notes', label: 'NOTAS', icon: StickyNote, count: notes.length },
        { id: 'tasks', label: 'TAREFAS', icon: ListTodo, count: tasks.filter(t => !t.completedAt).length },
      ];

  return (
    <aside className={cn(
      "border border-white/10 bg-slate-950/95 backdrop-blur-2xl flex flex-col h-full shrink-0 select-text overflow-hidden shadow-2xl",
      isMobileDrawer ? "w-full rounded-none sm:rounded-l-2xl border-r-0" : "w-[310px] xl:w-[330px] rounded-2xl"
    )}>
      {/* Header do painel */}
      <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-2">
          {isMobileDrawer && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 -ml-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Voltar para a conversa"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          {isGroup ? <Users size={14} className="text-emerald-400" /> : <User size={14} className="text-red-400" />}
          <h4 className="text-[11px] font-black text-white uppercase tracking-wider">
            {isGroup ? 'Perfil do Grupo' : 'Perfil do Contato'}
          </h4>
          {isGroup && (
            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
              Grupo
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          title={isMobileDrawer ? "Fechar perfil" : "Recolher painel (Alt + D)"}
          className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          {isMobileDrawer ? <X size={16} /> : <PanelRightClose size={15} />}
        </button>
      </div>

      {/* Sub-abas do painel lateral */}
      <div className="flex border-b border-white/10 bg-white/[0.02] px-1 shrink-0">
        {tabsList.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 py-2 text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 border-b-2",
              resolvedTab === tab.id 
                ? (isGroup ? "border-emerald-500 text-white bg-emerald-950/30" : "border-red-500 text-white bg-red-950/30")
                : "border-transparent text-white/40 hover:text-white/80"
            )}
          >
            <tab.icon size={11} className={resolvedTab === tab.id ? (isGroup ? "text-emerald-400" : "text-red-400") : "text-white/30"} />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn("ml-0.5 text-[8px] px-1 py-0.2 rounded-full font-bold", resolvedTab === tab.id ? (isGroup ? "bg-emerald-500 text-slate-950" : "bg-red-500 text-white") : "bg-white/10 text-white/60")}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo da sub-aba */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 text-xs">
        {/* ABA EXCLUSIVA DO GRUPO: PARTICIPANTES */}
        {isGroup && resolvedTab === 'participants' && (
          <div className="space-y-4">
            {/* Perfil do Grupo Estilo WhatsApp iOS (IMG_7568) */}
            <div className="text-center py-2 space-y-2">
              <div className="relative w-24 h-24 mx-auto rounded-full bg-slate-900 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                {conversation.photoUrl ? (
                  <img src={conversation.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users size={38} className="text-emerald-400" />
                )}
              </div>
              <div className="px-2">
                <h3 className="text-base font-bold text-white leading-snug">
                  {conversation.name || 'Grupo de WhatsApp'}
                </h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Grupo WhatsApp • {(groupParticipants || []).length} membros
                  </span>
                </div>
                {groupDescription && (
                  <div className="mt-2.5 p-2.5 bg-white/5 border border-white/10 rounded-xl text-left">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block mb-0.5">Descrição do Grupo</span>
                    <p className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed">{groupDescription}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 3 Botões de Ação do Grupo Estilo WhatsApp iOS */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('media')}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-white/5 transition-colors text-white active:scale-95 cursor-pointer"
                title="Ver Mídias Enviadas"
              >
                <ImageIcon size={18} className="text-purple-400" />
                <span className="text-[10px] font-medium text-white/80">Mídias</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('participants')}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-white/5 transition-colors text-white active:scale-95 cursor-pointer"
                title="Ver Participantes"
              >
                <Users size={18} className="text-sky-400" />
                <span className="text-[10px] font-medium text-white/80">Membros</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-chat-search'));
                }}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-white/5 transition-colors text-white active:scale-95 cursor-pointer"
                title="Pesquisar mensagens"
              >
                <Search size={18} className="text-white/60" />
                <span className="text-[10px] font-medium text-white/80">Buscar</span>
              </button>
            </div>

            {/* Seção Agrupada: Mídia, links e docs */}
            <div className="bg-[#1c1c1e] rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('media')}
                className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <ImageIcon size={15} />
                  </div>
                  <span className="text-xs font-semibold text-white">Mídia, links e docs</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/40 text-xs">
                  <span>{(groupMedia || []).length}</span>
                  <ChevronRight size={14} />
                </div>
              </button>
            </div>

            {/* Seção: Participantes com busca */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                  Participantes ({(groupParticipants || []).length})
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">Clique para conversar</span>
              </div>

              {(groupParticipants || []).length > 3 && (
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    placeholder="Buscar participante..."
                    className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl pl-7 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}

              {/* Lista de participantes clicáveis para abrir chat individual */}
              <div className="bg-[#1c1c1e] rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5 max-h-[360px] overflow-y-auto custom-scrollbar">
                {filteredParticipants.length === 0 ? (
                  <p className="text-center py-6 text-white/30 text-[11px]">Nenhum participante listado ainda.</p>
                ) : (
                  filteredParticipants.map((p: any, idx: number) => {
                    const phoneOrId = p.phoneNumber || p.phone || (typeof p.id === 'string' && p.id.includes('@') ? p.id.split('@')[0] : p.id);
                    return (
                      <div
                        key={p.id || idx}
                        onClick={() => onOpenChatWithPhone && phoneOrId && onOpenChatWithPhone(phoneOrId)}
                        className="flex items-center justify-between gap-2 p-2.5 hover:bg-white/5 transition-colors group cursor-pointer"
                        title="Clique para abrir conversa individual com este participante"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-white/80 font-bold text-[10px] shrink-0">
                            {(p.name || phoneOrId || '?').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate max-w-[140px]">
                                {p.name || phoneOrId || 'Participante'}
                              </span>
                              {p.admin && (
                                <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                  Admin
                                </span>
                              )}
                            </div>
                            {phoneOrId && (
                              <span className="text-[10px] text-white/40 block truncate">
                                {phoneOrId}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {onOpenChatWithPhone && phoneOrId && (
                            <button
                              type="button"
                              onClick={() => onOpenChatWithPhone(phoneOrId)}
                              title="Abrir conversa no privado com este participante"
                              className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-[10px] flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <MessageCircle size={13} />
                              <span>Conversar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA EXCLUSIVA DO GRUPO: MÍDIAS ENVIADAS */}
        {isGroup && resolvedTab === 'media' && (
          <div className="space-y-3">
            {/* Filtros de mídia */}
            <div className="flex gap-1 p-0.5 bg-white/5 rounded-xl border border-white/5 text-[9.5px] font-bold">
              {[
                { id: 'all', label: 'Todas', count: (groupMedia || []).length },
                { id: 'images', label: 'Fotos/Vídeos', count: imagesAndVideos.length },
                { id: 'audio', label: 'Áudios', count: audios.length },
                { id: 'documents', label: 'Docs', count: docs.length },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setMediaSubFilter(f.id as any)}
                  className={cn(
                    "flex-1 py-1 rounded-lg text-center transition-all",
                    mediaSubFilter === f.id
                      ? "bg-purple-500 text-white shadow-sm font-black"
                      : "text-white/50 hover:text-white"
                  )}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            {/* Conteúdo de mídias */}
            {(groupMedia || []).length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <ImageIcon size={24} className="mx-auto text-white/20" />
                <p className="text-white/40 text-xs">Nenhuma mídia enviada encontrada neste grupo.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[calc(100vh-240px)] overflow-y-auto custom-scrollbar pr-0.5">
                {/* Seção Imagens e Vídeos em Grid */}
                {(mediaSubFilter === 'all' || mediaSubFilter === 'images') && imagesAndVideos.length > 0 && (
                  <div>
                    {mediaSubFilter === 'all' && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-white/40 block mb-1.5">
                        Fotos e Vídeos ({imagesAndVideos.length})
                      </span>
                    )}
                    <div className="grid grid-cols-3 gap-1.5">
                      {imagesAndVideos.map((m: any) => {
                        const url = m.media_url || m.mediaUrl;
                        const isVid = isMediaVideo(m);
                        return (
                          <div
                            key={m.id}
                            onClick={() => onOpenMediaViewer?.({ url, caption: m.text, fileName: m.file_name || m.fileName })}
                            className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group cursor-pointer bg-slate-900"
                          >
                            {isVid ? (
                              <video src={url} className="w-full h-full object-cover" />
                            ) : (
                              <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-150" loading="lazy" />
                            )}
                            {isVid && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <Film size={14} className="text-white" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ExternalLink size={14} className="text-white" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Seção Áudios */}
                {(mediaSubFilter === 'all' || mediaSubFilter === 'audio') && audios.length > 0 && (
                  <div className="space-y-1.5">
                    {mediaSubFilter === 'all' && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-white/40 block mt-2 mb-1.5">
                        Áudios ({audios.length})
                      </span>
                    )}
                    {audios.map((m: any) => {
                      const url = m.media_url || m.mediaUrl;
                      return (
                        <div key={m.id} className="p-2 bg-white/[0.03] border border-white/5 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-[9px] text-white/40">
                            <span className="font-bold text-white/70 truncate">{m.sender_name || 'Áudio'}</span>
                            <span>{safeFormatDate(m.created_at || m.createdAt, 'dd/MM HH:mm')}</span>
                          </div>
                          <audio src={url} controls className="w-full h-7 rounded" preload="metadata" />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Seção Documentos */}
                {(mediaSubFilter === 'all' || mediaSubFilter === 'documents') && docs.length > 0 && (
                  <div className="space-y-1.5">
                    {mediaSubFilter === 'all' && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-white/40 block mt-2 mb-1.5">
                        Documentos ({docs.length})
                      </span>
                    )}
                    {docs.map((m: any) => {
                      const url = m.media_url || m.mediaUrl;
                      return (
                        <a
                          key={m.id}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-2 p-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl transition-colors group text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={16} className="text-purple-400 shrink-0" />
                            <span className="text-xs font-bold text-white truncate max-w-[180px]">
                              {m.file_name || m.fileName || 'Documento'}
                            </span>
                          </div>
                          <Download size={12} className="text-white/40 group-hover:text-white shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!isGroup && resolvedTab === 'data' && (
          <div className="space-y-2.5">
            {/* Bloco Resumo do Cliente: Nome, WhatsApp e Status */}
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-red-400">Identificação</span>
                {nomesMudaram && (
                  <button
                    type="button"
                    onClick={handleSaveNames}
                    disabled={isSavingNames}
                    className="px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {isSavingNames ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Salvar
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                <div>
                  <label className="text-[8.5px] font-bold text-white/40 uppercase tracking-wide">Nome Principal</label>
                  <input
                    value={nameFieldsDraft.fullName}
                    onChange={(e) => setNameFieldsDraft({ ...nameFieldsDraft, fullName: e.target.value })}
                    placeholder="Nome completo cadastral"
                    className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-red-500/50"
                  />
                </div>
                <div>
                  <label className="text-[8.5px] font-bold text-white/40 uppercase tracking-wide">WhatsApp / Apelido</label>
                  <input
                    value={nameFieldsDraft.whatsappName}
                    onChange={(e) => setNameFieldsDraft({ ...nameFieldsDraft, whatsappName: e.target.value })}
                    placeholder="Perfil WhatsApp"
                    className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-red-500/50"
                  />
                </div>
                <div>
                  <label className="text-[8.5px] font-bold text-white/40 uppercase tracking-wide">Agenda / Contato</label>
                  <input
                    value={nameFieldsDraft.contactName}
                    onChange={(e) => setNameFieldsDraft({ ...nameFieldsDraft, contactName: e.target.value })}
                    placeholder="Nome na agenda comercial"
                    className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-red-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Contato, Telefone e E-mail */}
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-2">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-red-400">Canais de Contato</span>
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-emerald-400 shrink-0" />
                <input
                  value={phoneDraft}
                  onChange={(e) => setPhoneDraft(e.target.value)}
                  className="flex-1 bg-transparent text-xs font-bold text-white outline-none border-b border-white/10 focus:border-red-500"
                  placeholder="Telefone WhatsApp"
                />
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  title="Copiar telefone"
                  className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
                >
                  <Copy size={11} />
                </button>
                {phoneMudou && (
                  <button
                    type="button"
                    onClick={handleSavePhone}
                    disabled={isSavingPhone}
                    title="Salvar novo telefone"
                    className="p-1 rounded-lg bg-red-600 text-white hover:bg-red-500"
                  >
                    {isSavingPhone ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  </button>
                )}
              </div>

              {conversation.email && (
                <div className="flex items-center gap-2 text-white/80 pt-1 border-t border-white/5">
                  <AtSign size={13} className="text-white/40 shrink-0" />
                  <span className="truncate text-[11px]">{conversation.email}</span>
                </div>
              )}
            </div>

            {/* Endereço de Entrega */}
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-red-400">
                <MapPin size={13} className="shrink-0" />
                <span className="text-[9.5px] font-black uppercase tracking-wider">Endereço de Entrega</span>
              </div>
              {isLoadingCliente ? (
                <p className="text-[10.5px] text-white/40">Buscando endereço...</p>
              ) : clienteVinculado ? (
                <p className="text-[11px] text-white/80 leading-relaxed font-normal">
                  {[clienteVinculado.logradouro, clienteVinculado.numero, clienteVinculado.distrito, clienteVinculado.city, clienteVinculado.state, clienteVinculado.cep]
                    .filter(Boolean).join(', ') || 'Sem endereço preenchido no cadastro.'}
                </p>
              ) : (
                <p className="text-[10.5px] text-white/40">Sem cadastro vinculado no módulo de Clientes.</p>
              )}
            </div>

          </div>
        )}

        {!isGroup && activeTab === 'notes' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <textarea
                ref={noteInputRef as any}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Escreva uma nota interna sobre este atendimento..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 resize-none"
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={isSavingNote || !newNoteText.trim()}
                className="w-full py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
              >
                {isSavingNote ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Adicionar Nota Interna
              </button>
            </div>

            <div className="space-y-2 pt-2">
              {notes.length === 0 ? (
                <p className="text-center py-6 text-white/30 text-[11px]">Nenhuma nota cadastrada.</p>
              ) : (
                [...notes].reverse().map(note => (
                  <div key={note.id} className="p-3 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                    <div className="flex justify-between items-start gap-1">
                      <p className="text-white/80 whitespace-pre-wrap leading-relaxed flex-1 text-[11px]">{note.text}</p>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-rose-400 hover:text-rose-300 transition-opacity"
                        title="Excluir nota"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <p className="text-[9px] text-white/30 mt-1 font-bold">
                      {note.senderName || 'Sistema'} • {safeFormatDate(note.createdAt, 'dd/MM HH:mm')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {!isGroup && activeTab === 'tasks' && (
          <div className="space-y-3">
            <div className="flex gap-1.5">
              <input
                ref={taskInputRef as any}
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); }}
                placeholder="Nova tarefa..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500"
              />
              <button
                type="button"
                onClick={handleAddTask}
                disabled={isSavingTask || !newTaskTitle.trim()}
                className="px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold text-[10px] uppercase flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {isSavingTask ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {tasks.length === 0 ? (
                <p className="text-center py-6 text-white/30 text-[11px]">Nenhuma tarefa pendente.</p>
              ) : (
                tasks.map(task => {
                  const concluida = !!task.completedAt;
                  return (
                    <div key={task.id} className={cn("flex items-center gap-2 p-2 rounded-xl border transition-all text-[11px]", concluida ? "bg-white/[0.02] border-white/5 opacity-50" : "bg-white/5 border-white/10")}>
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task)}
                        className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", concluida ? "bg-emerald-500 border-emerald-500 text-slate-900" : "border-white/30 hover:border-primary-500")}
                      >
                        {concluida && <Check size={10} />}
                      </button>
                      <span className={cn("flex-1 truncate", concluida && "line-through text-white/40")}>{task.title}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task)}
                        className="text-white/30 hover:text-rose-400 p-0.5"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {!isGroup && activeTab === 'sales' && (
          <div className="space-y-2.5">
            {/* Bloco Serviço / Pedido Solicitado pelo Lead - Em cima de vendas no card */}
            <div className="p-3 bg-amber-500/5 border border-amber-500/25 rounded-xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Tag size={13} className="shrink-0" />
                  <span className="text-[9.5px] font-black uppercase tracking-wider">Serviço do Lead</span>
                </div>
                {onSaveOrderInfo && (
                  <button
                    type="button"
                    onClick={onSaveOrderInfo}
                    disabled={isSavingOrderInfo}
                    className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
                  >
                    {isSavingOrderInfo ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Salvar
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                <div>
                  <label className="text-[8.5px] font-bold text-white/50 uppercase tracking-wide">Qual é o serviço / produto?</label>
                  <input
                    value={orderSummaryDraft || ''}
                    onChange={(e) => setOrderSummaryDraft?.(e.target.value)}
                    placeholder="Ex: Fachada em ACM, Banner Ilhós, Adesivo..."
                    className="w-full bg-slate-900/90 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500/60"
                  />
                </div>
                <div>
                  <label className="text-[8.5px] font-bold text-white/50 uppercase tracking-wide">Valor Estimado (R$ opcional)</label>
                  <input
                    type="number"
                    value={estimatedValueDraft || ''}
                    onChange={(e) => setEstimatedValueDraft?.(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-900/90 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Cabeçalho da Lista de Vendas com botão de Iniciar Venda */}
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-blue-400">
                Histórico de Vendas ({clienteVendas.length})
              </span>
              {onStartSale && (
                <button
                  type="button"
                  onClick={onStartSale}
                  className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                  title="Iniciar venda deste lead no PDV"
                >
                  <ShoppingBag size={10} strokeWidth={2.5} /> Iniciar Venda
                </button>
              )}
            </div>

            {isLoadingVendas ? (
              <div className="flex justify-center py-6"><RefreshCw size={16} className="animate-spin text-primary-500" /></div>
            ) : clienteVendas.length === 0 ? (
              <p className="text-center py-6 text-white/30 text-[11px]">
                {isGroup ? 'Nenhuma venda registrada para este grupo.' : 'Nenhuma venda registrada para este cliente.'}
              </p>
            ) : (
              clienteVendas.map(venda => {
                const saldo = (venda.total || 0) - (venda.down_payment || 0);
                const pendente = saldo > 0 || venda.status === 'pending';
                return (
                  <div key={venda.id} className="p-2.5 bg-white/5 hover:bg-white/[0.08] border border-white/10 rounded-xl space-y-1.5 transition-colors">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => onOpenVenda?.(venda.id)}
                        className="text-left font-black text-white hover:text-primary-300 text-[11px] truncate flex-1 cursor-pointer"
                      >
                        #{venda.id.slice(-8).toUpperCase()}
                      </button>
                      <span className="font-bold text-white text-[11px] shrink-0">
                        R$ {(venda.total || 0).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    {venda.itemsSummary && (
                      <p className="text-[10px] font-bold text-white/90 truncate">{venda.itemsSummary}</p>
                    )}
                    <div className="flex items-center justify-between text-[9px] text-white/40">
                      <span>{safeFormatDate(venda.created_at, 'dd/MM/yyyy HH:mm')}</span>
                      <Badge className={cn("text-[8px] font-black uppercase px-1 py-0.2 border-none", pendente ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300")}>
                        {pendente ? `Falta R$ ${saldo.toFixed(2).replace('.', ',')}` : 'Pago'}
                      </Badge>
                    </div>
                    {(venda.contrato_id || venda.orcamento_id) && (
                      <div className="flex gap-1 pt-0.5">
                        {venda.contrato_id && (
                          <button
                            type="button"
                            onClick={() => onOpenContrato?.(venda.contrato_id)}
                            className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                          >
                            Contrato
                          </button>
                        )}
                        {venda.orcamento_id && (
                          <button
                            type="button"
                            onClick={() => onOpenOrcamento?.(venda.orcamento_id)}
                            className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary-500/20 text-primary-300 hover:bg-primary-500/30"
                          >
                            Orçamento
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
