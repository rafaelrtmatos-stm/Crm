import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Copy, 
  Check, 
  Quote, 
  Pencil, 
  Trash2, 
  Search, 
  ChevronUp, 
  ChevronDown, 
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
  Save,
  Plus,
  RefreshCw,
  Columns3,
  PanelRightClose
} from 'lucide-react';
import { Badge, Button, cn } from './SharedUI';
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
// 1. REPRODUTOR DE ÁUDIO COM VELOCIDADE (1x, 1.5x, 2x)
// ==========================================
export const AudioMessagePlayer = ({
  src,
  transcription,
  transcriptionStatus,
  onTranscribe,
  isTranscribing = false,
  isOutgoing = false,
  onError,
  hasError = false,
}: {
  src: string;
  transcription?: { text: string };
  transcriptionStatus?: string;
  onTranscribe?: () => void;
  isTranscribing?: boolean;
  isOutgoing?: boolean;
  onError?: () => void;
  hasError?: boolean;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [copiedTranscription, setCopiedTranscription] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const updateTime = () => setCurrentTime(el.currentTime);
    const updateDuration = () => setDuration(el.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    el.addEventListener('timeupdate', updateTime);
    el.addEventListener('loadedmetadata', updateDuration);
    el.addEventListener('ended', onEnded);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);

    return () => {
      el.removeEventListener('timeupdate', updateTime);
      el.removeEventListener('loadedmetadata', updateDuration);
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '0:00';
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

  return (
    <div className="space-y-2 min-w-[200px] xs:min-w-[220px] max-w-[320px] select-none touch-manipulation">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onError={onError}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={cn(
            "w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm",
            isOutgoing 
              ? "bg-primary-500 hover:bg-primary-600 text-white" 
              : "bg-emerald-500 hover:bg-emerald-600 text-white"
          )}
          title={isPlaying ? "Pausar" : "Tocar áudio"}
        >
          {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
        </button>

        {/* Progress bar + time */}
        <div className="flex-1 flex flex-col justify-center gap-1 min-w-[100px]">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-500 focus:outline-none"
          />
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 px-0.5">
            <span>{formatSeconds(currentTime)}</span>
            <span>{formatSeconds(duration)}</span>
          </div>
        </div>

        {/* Speed button (1x / 1.5x / 2x) */}
        <button
          type="button"
          onClick={handleSpeedChange}
          className={cn(
            "h-7 sm:h-6 px-2 sm:px-1.5 rounded-md text-[10px] font-black tracking-tight shrink-0 transition-all border active:scale-95",
            speed > 1 
              ? "bg-primary-50 text-primary-600 border-primary-300 shadow-sm" 
              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
          )}
          title="Alterar velocidade de reprodução (1x, 1.5x, 2x)"
        >
          {speed}x
        </button>
      </div>

      {hasError && (
        <p className="text-[10px] font-bold text-rose-500">
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
  isOutgoing,
  canEditOrDelete,
  onEdit,
  onDelete,
  onQuote,
  isDeleting = false,
}: {
  text?: string;
  transcriptionText?: string;
  isOutgoing: boolean;
  canEditOrDelete: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onQuote?: (quoteText: string) => void;
  isDeleting?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const effectiveText = text || transcriptionText || '';

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!effectiveText) return;
    try {
      await navigator.clipboard.writeText(effectiveText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignora erro
    }
  };

  const handleQuoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuote && effectiveText) {
      onQuote(effectiveText);
    }
  };

  if (!effectiveText && !canEditOrDelete) return null;

  return (
    <div className={cn(
      "absolute -top-3.5 z-20 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 group-hover:opacity-100 transition-all duration-150 flex items-center gap-0.5 p-0.5 rounded-full bg-slate-900/90 border border-white/15 backdrop-blur-md shadow-lg",
      isOutgoing ? "right-2" : "left-2"
    )}>
      {effectiveText && (
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? "Copiado!" : "Copiar texto"}
          className="w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
        >
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
        </button>
      )}

      {onQuote && (
        <button
          type="button"
          onClick={handleQuoteClick}
          title="Responder / Citar"
          className="w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
        >
          <Quote size={11} />
        </button>
      )}

      {canEditOrDelete && onEdit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Editar mensagem"
          className="w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white/70 hover:text-primary-300 hover:bg-primary-500/20 active:bg-primary-500/30 transition-colors"
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
          className="w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white/70 hover:text-rose-400 hover:bg-rose-500/20 active:bg-rose-500/30 transition-colors disabled:opacity-50"
        >
          {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
        </button>
      )}
    </div>
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
  handleToggleAutoTranscribe,
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
}: {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'data' | 'notes' | 'tasks' | 'sales';
  setActiveTab: (t: 'data' | 'notes' | 'tasks' | 'sales') => void;
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
  handleToggleAutoTranscribe: () => void;
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
}) => {
  if (!isOpen) return null;

  return (
    <aside className="w-80 xl:w-96 border-l border-white/10 bg-slate-900/60 backdrop-blur-xl flex flex-col h-full shrink-0 select-text overflow-hidden rounded-r-2xl">
      {/* Header do painel */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Columns3 size={15} className="text-primary-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Contexto do Cliente</h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Recolher painel (Alt + D)"
          className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <PanelRightClose size={16} />
        </button>
      </div>

      {/* Sub-abas do painel lateral */}
      <div className="flex border-b border-white/5 bg-white/[0.01] px-2">
        {[
          { id: 'data', label: 'Dados', icon: Users },
          { id: 'notes', label: 'Notas', icon: StickyNote, count: notes.length },
          { id: 'tasks', label: 'Tarefas', icon: ListTodo, count: tasks.filter(t => !t.completedAt).length },
          { id: 'sales', label: 'Vendas', icon: ShoppingBag, count: clienteVendas.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 py-2 text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 border-b-2",
              activeTab === tab.id 
                ? "border-primary-500 text-primary-300 bg-primary-500/10" 
                : "border-transparent text-white/40 hover:text-white/70"
            )}
          >
            <tab.icon size={11} />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-0.5 text-[8px] px-1 py-0.2 rounded-full bg-white/10 font-bold">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo da sub-aba */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 text-xs">
        {activeTab === 'data' && (
          <div className="space-y-4">
            {/* Identidade */}
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary-300">Identidade</span>
                {nomesMudaram && (
                  <button
                    type="button"
                    onClick={handleSaveNames}
                    disabled={isSavingNames}
                    className="px-2.5 py-1 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {isSavingNames ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Salvar
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[9px] font-bold text-white/40 uppercase">Nome WhatsApp</label>
                  <input
                    value={nameFieldsDraft.whatsappName}
                    onChange={(e) => setNameFieldsDraft({ ...nameFieldsDraft, whatsappName: e.target.value })}
                    placeholder="Perfil WhatsApp"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-white/40 uppercase">Nome Agenda / Contato</label>
                  <input
                    value={nameFieldsDraft.contactName}
                    onChange={(e) => setNameFieldsDraft({ ...nameFieldsDraft, contactName: e.target.value })}
                    placeholder="Nome na agenda"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-white/40 uppercase">Nome Completo Documental</label>
                  <input
                    value={nameFieldsDraft.fullName}
                    onChange={(e) => setNameFieldsDraft({ ...nameFieldsDraft, fullName: e.target.value })}
                    placeholder="Nome pra contratos/recibos"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Contato & Telefone */}
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl space-y-2.5 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary-300">Contato</span>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-white/40 shrink-0" />
                <input
                  value={phoneDraft}
                  onChange={(e) => setPhoneDraft(e.target.value)}
                  className="flex-1 bg-transparent text-xs font-bold text-white outline-none border-b border-transparent focus:border-primary-500"
                  placeholder="Telefone"
                />
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  title="Copiar telefone"
                  className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
                >
                  <Copy size={12} />
                </button>
                {phoneMudou && (
                  <button
                    type="button"
                    onClick={handleSavePhone}
                    disabled={isSavingPhone}
                    title="Salvar novo telefone"
                    className="p-1.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600"
                  >
                    {isSavingPhone ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  </button>
                )}
              </div>

              {conversation.email && (
                <div className="flex items-center gap-2 text-white/70 pt-1">
                  <AtSign size={14} className="text-white/40 shrink-0" />
                  <span className="truncate">{conversation.email}</span>
                </div>
              )}
            </div>

            {/* Endereço */}
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-primary-300">
                <MapPin size={14} className="shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest">Endereço de Entrega</span>
              </div>
              {isLoadingCliente ? (
                <p className="text-[11px] text-white/40">Buscando cadastro...</p>
              ) : clienteVinculado ? (
                <p className="text-[11px] text-white/80 leading-relaxed">
                  {[clienteVinculado.logradouro, clienteVinculado.numero, clienteVinculado.distrito, clienteVinculado.city, clienteVinculado.state, clienteVinculado.cep]
                    .filter(Boolean).join(', ') || 'Sem endereço preenchido no cadastro.'}
                </p>
              ) : (
                <p className="text-[11px] text-white/40">Sem cadastro vinculado no módulo de Clientes.</p>
              )}
            </div>

            {/* Transcrição de áudio automática */}
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[11px] font-bold text-white">Transcrição Automática</p>
                <p className="text-[9px] text-white/40">Transcrever áudios desta conversa</p>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoTranscribe}
                className={cn("w-9 h-5 rounded-full transition-colors relative shrink-0", conversation.autoTranscribe ? "bg-emerald-500" : "bg-white/10")}
              >
                <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", conversation.autoTranscribe ? "left-[18px]" : "left-0.5")} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
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

        {activeTab === 'tasks' && (
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

        {activeTab === 'sales' && (
          <div className="space-y-2">
            {isLoadingVendas ? (
              <div className="flex justify-center py-6"><RefreshCw size={16} className="animate-spin text-primary-500" /></div>
            ) : clienteVendas.length === 0 ? (
              <p className="text-center py-6 text-white/30 text-[11px]">Nenhuma venda registrada com este telefone.</p>
            ) : (
              clienteVendas.map(venda => {
                const saldo = (venda.total || 0) - (venda.down_payment || 0);
                const pendente = saldo > 0 || venda.status === 'pending';
                return (
                  <div key={venda.id} className="p-2.5 bg-white/5 border border-white/10 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => onOpenVenda?.(venda.id)}
                        className="text-left font-black text-white hover:text-primary-300 text-[11px] truncate flex-1"
                      >
                        #{venda.id.slice(-8).toUpperCase()}
                      </button>
                      <span className="font-bold text-white text-[11px] shrink-0">
                        R$ {(venda.total || 0).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
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
