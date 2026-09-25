import React, { useState, useEffect, useRef } from 'react';
import { 
  Smile, 
  Star, 
  History, 
  Package, 
  Sparkles, 
  Plus, 
  Search, 
  X, 
  Trash2, 
  Upload, 
  Loader2,
  Check
} from 'lucide-react';
import { 
  carregarFigurinhas, 
  carregarHistoricoFigurinhas, 
  salvarFigurinha, 
  excluirFigurinha, 
  toggleFavoritoFigurinha, 
  uploadFigurinha, 
  type StickerItem 
} from '../lib/stickersStorage';
import { showAlert } from '../lib/notify';
import { cn } from './SharedUI';

export type StickerTab = 'favoritos' | 'historico' | 'colecao' | 'todas';

interface ChatStickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (sticker: StickerItem) => void;
  isSending?: boolean;
}

export const ChatStickerPicker: React.FC<ChatStickerPickerProps> = ({
  isOpen,
  onClose,
  onSelectSticker,
  isSending = false,
}) => {
  const [activeTab, setActiveTab] = useState<StickerTab>('favoritos');
  const [allStickers, setAllStickers] = useState<StickerItem[]>([]);
  const [historyStickers, setHistoryStickers] = useState<StickerItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const todos = await carregarFigurinhas();
      setAllStickers(todos);
      const hist = carregarHistoricoFigurinhas();
      setHistoryStickers(hist);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      carregarDados();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      carregarDados();
    };
    window.addEventListener('whatsapp-stickers-updated', handleUpdate);
    return () => window.removeEventListener('whatsapp-stickers-updated', handleUpdate);
  }, []);

  // Fechar ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filtragem por abas
  const favoritos = allStickers.filter(s => s.is_favorite || s.category === 'favoritos');
  const colecao = allStickers.filter(s => s.category === 'colecao' || s.source === 'system');

  let listToDisplay: StickerItem[] = [];
  if (activeTab === 'favoritos') {
    listToDisplay = favoritos;
  } else if (activeTab === 'historico') {
    listToDisplay = historyStickers;
  } else if (activeTab === 'colecao') {
    listToDisplay = colecao;
  } else {
    listToDisplay = allStickers;
  }

  // Filtragem de busca
  if (search.trim()) {
    const term = search.toLowerCase().trim();
    listToDisplay = listToDisplay.filter(s => (s.name || '').toLowerCase().includes(term));
  }

  const handleUploadSticker = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    try {
      const url = await uploadFigurinha(file);
      const nomeLimpo = file.name.replace(/\.[^/.]+$/, '');
      const nova = await salvarFigurinha({
        url,
        name: nomeLimpo,
        category: activeTab === 'favoritos' ? 'favoritos' : 'colecao',
        is_favorite: activeTab === 'favoritos',
        source: 'upload',
      });
      setAllStickers(prev => [nova, ...prev.filter(s => s.id !== nova.id)]);
      showAlert('Figurinha adicionada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao adicionar figurinha:', err);
      showAlert('Erro ao enviar arquivo da figurinha.');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, stk: StickerItem) => {
    e.stopPropagation();
    const novoStatus = await toggleFavoritoFigurinha(stk);
    setAllStickers(prev =>
      prev.map(s => (s.id === stk.id || s.url === stk.url ? { ...s, is_favorite: novoStatus } : s))
    );
  };

  const handleDeleteSticker = async (e: React.MouseEvent, stk: StickerItem) => {
    e.stopPropagation();
    if (!window.confirm(`Deseja remover a figurinha "${stk.name || 'selecionada'}"?`)) return;
    await excluirFigurinha(stk.id);
    setAllStickers(prev => prev.filter(s => s.id !== stk.id));
    setHistoryStickers(prev => prev.filter(s => s.id !== stk.id && s.url !== stk.url));
  };

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-16 left-2 sm:left-4 z-50 w-[330px] sm:w-[380px] bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-white"
      style={{ maxHeight: '430px' }}
    >
      {/* Cabeçalho */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <Smile size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black text-white flex items-center gap-1.5 leading-none">
              Figurinhas do WhatsApp
            </h4>
            <p className="text-[10px] text-white/40 leading-none mt-0.5">
              Clique para enviar instantaneamente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/webp,image/png,image/jpeg,image/gif"
            className="hidden"
            onChange={handleUploadSticker}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isSending}
            title="Adicionar nova figurinha"
            className="h-7 px-2 rounded-xl bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-white/80 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
          >
            {uploading ? <Loader2 size={11} className="animate-spin" /> : <Plus size={12} />}
            <span>Nova</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Abas Superiores (Favoritas, Histórico, Coleção, Todas) */}
      <div className="flex items-center p-1.5 gap-1 bg-slate-950/60 border-b border-white/10 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('favoritos')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 text-[11px] font-bold transition-all cursor-pointer",
            activeTab === 'favoritos'
              ? "bg-amber-500 text-slate-950 shadow-md font-black"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
          title="Figurinhas salvas nas conversas"
        >
          <Star size={12} className={activeTab === 'favoritos' ? "fill-slate-950" : ""} />
          <span>Favoritas</span>
          {favoritos.length > 0 && (
            <span className={cn(
              "text-[9px] px-1 rounded-full",
              activeTab === 'favoritos' ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-white/60"
            )}>
              {favoritos.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('historico')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 text-[11px] font-bold transition-all cursor-pointer",
            activeTab === 'historico'
              ? "bg-amber-500 text-slate-950 shadow-md font-black"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
          title="Figurinhas usadas recentemente"
        >
          <History size={12} />
          <span>Histórico</span>
          {historyStickers.length > 0 && (
            <span className={cn(
              "text-[9px] px-1 rounded-full",
              activeTab === 'historico' ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-white/60"
            )}>
              {historyStickers.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('colecao')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 text-[11px] font-bold transition-all cursor-pointer",
            activeTab === 'colecao'
              ? "bg-amber-500 text-slate-950 shadow-md font-black"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
          title="Coleção oficial gerenciada no sistema"
        >
          <Package size={12} />
          <span>Coleção</span>
          {colecao.length > 0 && (
            <span className={cn(
              "text-[9px] px-1 rounded-full",
              activeTab === 'colecao' ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-white/60"
            )}>
              {colecao.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('todas')}
          className={cn(
            "py-1.5 px-2.5 rounded-xl flex items-center justify-center gap-1 text-[11px] font-bold transition-all cursor-pointer",
            activeTab === 'todas'
              ? "bg-amber-500 text-slate-950 shadow-md font-black"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
          title="Todas as figurinhas salvas"
        >
          <span>Todas</span>
        </button>
      </div>

      {/* Barra de Pesquisa Rápida */}
      <div className="p-2 border-b border-white/5 bg-slate-900/50">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs">
          <Search size={12} className="text-white/40 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar em ${activeTab}...`}
            className="w-full bg-transparent border-none outline-none text-white text-xs placeholder:text-white/30 focus:ring-0 p-0"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-white/40 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Grid de Figurinhas com Rolagem */}
      <div className="p-3 flex-1 overflow-y-auto custom-scrollbar min-h-[200px] max-h-[250px] relative">
        {loading ? (
          <div className="h-40 flex flex-col items-center justify-center text-white/40 gap-2">
            <Loader2 size={24} className="animate-spin text-amber-400" />
            <span className="text-[11px]">Carregando figurinhas...</span>
          </div>
        ) : listToDisplay.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-white/40 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/30">
              {activeTab === 'favoritos' ? <Star size={20} /> : activeTab === 'historico' ? <History size={20} /> : <Package size={20} />}
            </div>
            <p className="text-xs font-bold text-white/80">
              {activeTab === 'favoritos'
                ? 'Nenhuma figurinha favoritada ainda'
                : activeTab === 'historico'
                ? 'Histórico vazio'
                : activeTab === 'colecao'
                ? 'Nenhuma figurinha na coleção do sistema'
                : 'Nenhuma figurinha encontrada'}
            </p>
            <p className="text-[10px] text-white/40 max-w-[240px] leading-relaxed">
              {activeTab === 'favoritos'
                ? 'Passe o mouse sobre qualquer figurinha recebida no chat e clique na estrela ⭐ para salvar aqui!'
                : activeTab === 'historico'
                ? 'As figurinhas que você disparar pelo chat aparecerão aqui automaticamente.'
                : activeTab === 'colecao'
                ? 'Cadastre a biblioteca oficial da empresa na aba Integrações > Figurinhas.'
                : 'Faça upload de uma imagem ou salve figurinhas das conversas.'}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-[10px] font-bold transition-all cursor-pointer"
            >
              + Fazer Upload de Figurinha
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2.5">
            {listToDisplay.map((stk) => {
              const isFav = stk.is_favorite || stk.category === 'favoritos';
              return (
                <div
                  key={stk.id || stk.url}
                  onClick={() => !isSending && onSelectSticker(stk)}
                  title={`${stk.name || 'Figurinha'} - Clique para enviar`}
                  className={cn(
                    "group relative aspect-square rounded-2xl bg-white/[0.04] hover:bg-white/[0.12] border border-white/10 hover:border-amber-400/60 p-1.5 flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95 shadow-sm hover:shadow-lg hover:shadow-amber-500/10",
                    isSending && "opacity-50 pointer-events-none"
                  )}
                >
                  <img
                    src={stk.url}
                    alt={stk.name || 'Figurinha'}
                    className="max-w-full max-h-full object-contain filter drop-shadow-md group-hover:scale-110 transition-transform duration-150"
                    loading="lazy"
                  />

                  {/* Botão de Favoritar no Hover */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, stk)}
                    title={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
                    className={cn(
                      "absolute top-1 left-1 p-1 rounded-lg backdrop-blur-md transition-all z-10 cursor-pointer",
                      isFav
                        ? "text-amber-400 bg-slate-950/80 opacity-100"
                        : "text-white/40 hover:text-amber-400 bg-slate-950/80 opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <Star size={10} className={isFav ? "fill-amber-400" : ""} />
                  </button>

                  {/* Botão de Excluir no Hover */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSticker(e, stk)}
                    title="Excluir figurinha"
                    className="absolute top-1 right-1 p-1 rounded-lg bg-slate-950/80 text-white/40 hover:text-rose-400 opacity-0 group-hover:opacity-100 backdrop-blur-md transition-all z-10 cursor-pointer"
                  >
                    <Trash2 size={10} />
                  </button>

                  {/* Nome da Figurinha sutil ao passar o mouse */}
                  {stk.name && (
                    <div className="absolute inset-x-1 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <p className="text-[8px] font-black text-white/90 bg-slate-950/90 rounded px-1 text-center truncate backdrop-blur-sm">
                        {stk.name}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Overlay de envio em andamento */}
        {isSending && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2 z-20">
            <Loader2 size={24} className="animate-spin text-amber-400" />
            <span className="text-xs font-bold">Enviando figurinha pro cliente...</span>
          </div>
        )}
      </div>

      {/* Rodapé explicativo */}
      <div className="px-3 py-2 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-[10px] text-white/50">
        <span className="flex items-center gap-1 truncate">
          <Sparkles size={11} className="text-amber-400 shrink-0" />
          <span>⭐ Salve figurinhas direto do chat ou gerencie na <strong>Coleção</strong>.</span>
        </span>
      </div>
    </div>
  );
};
