import React, { useState, useEffect, useRef } from 'react';
import { 
  Smile, 
  Star, 
  Clock, 
  Folder, 
  Plus, 
  Search, 
  X, 
  Loader2,
  Sparkles,
  Settings,
  Layers,
  Trash2
} from 'lucide-react';
import { 
  carregarColecoes, 
  carregarFigurinhas, 
  carregarHistorico, 
  toggleFavorito, 
  registrarUso, 
  subscribeToStickersData,
  verificarAdmin,
  excluirFigurinha,
  type StickerItem, 
  type StickerCollection 
} from '../lib/stickersStorage';
import type { AppUser } from '../types';
import { cn } from './SharedUI';
import { showAlert, showConfirm } from '../lib/notify';

interface ChatStickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (sticker: StickerItem) => void;
  isSending?: boolean;
  user?: AppUser | null;
  onGoToAdmin?: () => void;
}

export const ChatStickerPicker: React.FC<ChatStickerPickerProps> = ({
  isOpen,
  onClose,
  onSelectSticker,
  isSending = false,
  user,
  onGoToAdmin,
}) => {
  // Começa por padrão em 'todas' para que as figurinhas salvas apareçam imediatamente
  const [activeTab, setActiveTab] = useState<string>('todas');
  const [collections, setCollections] = useState<StickerCollection[]>(() => {
    try {
      const saved = localStorage.getItem('rpro_whatsapp_sticker_collections_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [allStickers, setAllStickers] = useState<StickerItem[]>(() => {
    try {
      const saved = localStorage.getItem('rpro_whatsapp_stickers_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [historyStickers, setHistoryStickers] = useState<StickerItem[]>(() => {
    try {
      const saved = localStorage.getItem('rpro_whatsapp_stickers_hist_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const isAdmin = verificarAdmin(user);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [cols, stks, hist] = await Promise.all([
        carregarColecoes(),
        carregarFigurinhas(user),
        carregarHistorico(user),
      ]);
      setCollections(cols);
      setAllStickers(stks);
      setHistoryStickers(hist);
    } catch (err) {
      console.error('Erro ao carregar figurinhas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      carregarDados();
    }
  }, [isOpen, user?.id]);

  // Escuta atualizações locais de figurinhas salvas no painel de Integrações
  useEffect(() => {
    const handleUpdated = () => {
      carregarDados();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('whatsapp-stickers-updated', handleUpdated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('whatsapp-stickers-updated', handleUpdated);
      }
    };
  }, [user?.id]);

  // Inscrição em tempo real com Firestore onSnapshot para sincronização imediata entre PCs
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToStickersData(({ collections: cols, stickers: stks }) => {
      if (cols.length > 0) setCollections(cols);
      if (stks.length > 0) setAllStickers(stks);
      carregarHistorico(user).then(setHistoryStickers);
    });
    return () => unsubscribe();
  }, [isOpen, user?.id]);

  // Fechar ao clicar fora ou apertar Escape
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

  // Filtragem de figurinhas de acordo com a aba selecionada
  const favoritos = allStickers.filter(s => s.is_favorite);

  let bannerMensagem: string | null = null;
  let listToDisplay: StickerItem[] = [];

  if (activeTab === 'historico') {
    if (historyStickers.length > 0) {
      listToDisplay = historyStickers;
    } else {
      // Se histórico estiver vazio, avisa mas exibe as figurinhas salvas para permitir envio imediato
      bannerMensagem = 'Nenhuma figurinha usada recentemente. Escolha abaixo para enviar:';
      listToDisplay = allStickers;
    }
  } else if (activeTab === 'favoritos') {
    if (favoritos.length > 0) {
      listToDisplay = favoritos;
    } else {
      bannerMensagem = 'Nenhuma favorita ainda. Escolha abaixo ou clique na estrela ☆ para favoritar:';
      listToDisplay = allStickers;
    }
  } else if (activeTab === 'todas') {
    listToDisplay = allStickers;
  } else {
    // Filtrar por ID de coleção específica
    const naColecao = allStickers.filter(
      s => s.collection_id === activeTab || (s.collection_name && s.collection_name.toLowerCase() === activeTab.toLowerCase())
    );
    if (naColecao.length > 0) {
      listToDisplay = naColecao;
    } else {
      const colecaoObj = collections.find(c => c.id === activeTab);
      bannerMensagem = `A pasta "${colecaoObj?.name || 'Coleção'}" ainda não tem figurinhas. Escolha da biblioteca:`;
      listToDisplay = allStickers;
    }
  }

  // Filtragem de busca por nome ou descrição
  if (search.trim()) {
    const term = search.toLowerCase().trim();
    listToDisplay = listToDisplay.filter(s => (s.name || '').toLowerCase().includes(term));
    bannerMensagem = null;
  }

  const handleToggleFavorite = async (e: React.MouseEvent, stk: StickerItem) => {
    e.stopPropagation();
    const novoStatus = await toggleFavorito(stk, user);
    setAllStickers(prev =>
      prev.map(s => (s.id === stk.id || s.url === stk.url ? { ...s, is_favorite: novoStatus } : s))
    );
    setHistoryStickers(prev =>
      prev.map(s => (s.id === stk.id || s.url === stk.url ? { ...s, is_favorite: novoStatus } : s))
    );
  };

  const handleSelectStickerClick = (stk: StickerItem) => {
    if (isSending) return;
    registrarUso(stk, user);
    onSelectSticker(stk);
  };

  const handleDeleteStickerClick = async (e: React.MouseEvent, stk: StickerItem) => {
    e.stopPropagation();
    if (!isAdmin) {
      showAlert('Apenas administradores podem excluir figurinhas.');
      return;
    }
    if (!(await showConfirm(`Deseja remover a figurinha "${stk.name || 'Figurinha'}" da biblioteca oficial?`))) {
      return;
    }

    try {
      setAllStickers(prev => prev.filter(s => s.id !== stk.id && (!stk.url || s.url !== stk.url)));
      setHistoryStickers(prev => prev.filter(s => s.id !== stk.id && (!stk.url || s.url !== stk.url)));
      await excluirFigurinha(stk.id, user, stk.url);
      showAlert('Figurinha excluída com sucesso.');
    } catch (err: any) {
      showAlert(err?.message || 'Erro ao excluir figurinha.');
    }
  };

  const colecaoAtivaObj = collections.find(c => c.id === activeTab);

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full mb-2 left-0 sm:left-2 z-50 w-[350px] sm:w-[410px] max-w-[calc(100vw-1.5rem)] bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-white"
      style={{ maxHeight: '460px' }}
    >
      {/* 1. TOPO DO PAINEL — Cabeçalho estilo WhatsApp */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Smile size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black text-white flex items-center gap-1.5 leading-none">
              Figurinhas
            </h4>
            <p className="text-[10px] text-white/40 leading-none mt-0.5">
              Compartilhado em todos os computadores
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* BOTÃO "+ CRIAR" / GERENCIAR: Conforme regra oficial, direciona o Admin para INTEGRAÇÕES -> Figurinhas */}
          {isAdmin && (
            <button
              type="button"
              onClick={onGoToAdmin}
              title="Gerenciar coleções e figurinhas em Integrações"
              className="h-7 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer border border-amber-500/30 active:scale-95"
            >
              <Plus size={12} className="stroke-[3]" />
              <span>+ Criar</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. ABAS SUPERIORES: 📁 TODAS | 🕘 HISTÓRICO | ☆ FAVORITOS | 📁 [COLEÇÕES DO ADMIN] */}
      <div className="flex items-center p-1.5 gap-1 bg-slate-950/80 border-b border-white/10 overflow-x-auto custom-scrollbar text-xs shrink-0">
        {/* 📁 Todas as Figurinhas */}
        <button
          type="button"
          onClick={() => setActiveTab('todas')}
          className={cn(
            "py-1.5 px-2.5 rounded-xl flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0",
            activeTab === 'todas'
              ? "bg-amber-500 text-slate-950 shadow-md font-black"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
          title="Ver todas as figurinhas disponíveis"
        >
          <Layers size={12} />
          <span>📁 Todas</span>
          <span className={cn(
            "text-[9px] px-1 rounded-full font-bold",
            activeTab === 'todas' ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-white/60"
          )}>
            {allStickers.length}
          </span>
        </button>

        {/* 🕘 HISTÓRICO */}
        <button
          type="button"
          onClick={() => setActiveTab('historico')}
          className={cn(
            "py-1.5 px-2.5 rounded-xl flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0",
            activeTab === 'historico'
              ? "bg-amber-500 text-slate-950 shadow-md font-black"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
          title="Figurinhas usadas recentemente"
        >
          <Clock size={12} />
          <span>🕘 Histórico</span>
          {historyStickers.length > 0 && (
            <span className={cn(
              "text-[9px] px-1 rounded-full font-bold",
              activeTab === 'historico' ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-white/60"
            )}>
              {historyStickers.length}
            </span>
          )}
        </button>

        {/* ☆ FAVORITOS */}
        <button
          type="button"
          onClick={() => setActiveTab('favoritos')}
          className={cn(
            "py-1.5 px-2.5 rounded-xl flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0",
            activeTab === 'favoritos'
              ? "bg-amber-500 text-slate-950 shadow-md font-black"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
          title="Figurinhas favoritadas pelo usuário"
        >
          <Star size={12} className={activeTab === 'favoritos' ? "fill-slate-950" : ""} />
          <span>☆ Favoritos</span>
          {favoritos.length > 0 && (
            <span className={cn(
              "text-[9px] px-1 rounded-full font-bold",
              activeTab === 'favoritos' ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-white/60"
            )}>
              {favoritos.length}
            </span>
          )}
        </button>

        {/* 📁 COLEÇÕES CRIADAS PELO ADMINISTRADOR */}
        {collections.map(col => {
          const count = allStickers.filter(s => s.collection_id === col.id || s.collection_name === col.name).length;
          const isActive = activeTab === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setActiveTab(col.id)}
              className={cn(
                "py-1.5 px-2.5 rounded-xl flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0",
                isActive
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
              title={`Coleção: ${col.name}`}
            >
              <Folder size={12} className={isActive ? "fill-slate-950" : ""} />
              <span>📁 {col.name}</span>
              {count > 0 && (
                <span className={cn(
                  "text-[9px] px-1 rounded-full font-bold",
                  isActive ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-white/60"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. CAMPO DE BUSCA abaixo do topo do painel */}
      <div className="p-2 border-b border-white/5 bg-slate-900/40 shrink-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
          <Search size={13} className="text-white/40 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar figurinhas...`}
            className="w-full bg-transparent border-none outline-none text-white text-xs placeholder:text-white/30 focus:ring-0 p-0"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-white/40 hover:text-white p-0.5"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 5. GRADE DE FIGURINHAS COM ROLAGEM INTERNA */}
      <div className="p-3 flex-1 overflow-y-auto custom-scrollbar min-h-[220px] max-h-[280px] relative">
        {loading && listToDisplay.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-white/40 gap-2">
            <Loader2 size={24} className="animate-spin text-amber-400" />
            <span className="text-[11px]">Carregando figurinhas...</span>
          </div>
        ) : listToDisplay.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-white/40 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/30">
              {activeTab === 'historico' ? (
                <Clock size={20} />
              ) : activeTab === 'favoritos' ? (
                <Star size={20} />
              ) : (
                <Folder size={20} />
              )}
            </div>
            <p className="text-xs font-bold text-white/80">
              {search.trim()
                ? `Nenhuma figurinha encontrada para "${search}"`
                : activeTab === 'historico'
                ? 'Histórico vazio'
                : activeTab === 'favoritos'
                ? 'Nenhuma figurinha favoritada ainda'
                : colecaoAtivaObj
                ? `Nenhuma figurinha na pasta "${colecaoAtivaObj.name}"`
                : 'Nenhuma figurinha encontrada'}
            </p>
            <p className="text-[10px] text-white/40 max-w-[240px] leading-relaxed">
              {search.trim()
                ? 'Tente buscar por outro termo ou nome de figurinha.'
                : isAdmin
                ? 'Você pode adicionar figurinhas a esta coleção pelo painel de Integrações.'
                : 'Esta coleção ainda não possui figurinhas cadastradas pelo administrador.'}
            </p>
            {isAdmin && onGoToAdmin && (
              <button
                type="button"
                onClick={onGoToAdmin}
                className="mt-1 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-[10px] font-bold transition-all cursor-pointer border border-amber-500/30"
              >
                Gerenciar em Integrações
              </button>
            )}
          </div>
        ) : (
          <div>
            {bannerMensagem && (
              <div className="mb-2.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] leading-tight flex items-center justify-between gap-1">
                <span>{bannerMensagem}</span>
                {isAdmin && onGoToAdmin && (
                  <button
                    type="button"
                    onClick={onGoToAdmin}
                    className="text-[9px] underline font-bold hover:text-amber-200 shrink-0 cursor-pointer"
                  >
                    Gerenciar
                  </button>
                )}
              </div>
            )}
            <div className="grid grid-cols-4 gap-2.5">
            {listToDisplay.map((stk) => {
              const isFav = stk.is_favorite;
              return (
                <div
                  key={stk.id || stk.url}
                  onClick={() => handleSelectStickerClick(stk)}
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

                  {/* Botão de Favoritar no Hover (☆ / ★) */}
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
                    <Star size={11} className={isFav ? "fill-amber-400 text-amber-400" : ""} />
                  </button>

                  {/* Botão de Excluir no Hover (Apenas Admin) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteStickerClick(e, stk)}
                      title="Excluir figurinha"
                      className="absolute top-1 right-1 p-1 rounded-lg bg-slate-950/80 text-white/50 hover:text-rose-400 hover:bg-rose-500/20 backdrop-blur-md transition-all z-10 opacity-0 group-hover:opacity-100 cursor-pointer shadow-sm active:scale-95"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}

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
          </div>
        )}

        {/* Overlay de envio em andamento */}
        {isSending && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2 z-20">
            <Loader2 size={24} className="animate-spin text-amber-400" />
            <span className="text-xs font-bold">Enviando figurinha...</span>
          </div>
        )}
      </div>

      {/* Rodapé informativo */}
      <div className="px-3 py-2 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-[10px] text-white/50 shrink-0">
        <span className="flex items-center gap-1 truncate">
          <Sparkles size={11} className="text-amber-400 shrink-0" />
          <span>Clique para enviar na conversa atual</span>
        </span>
        {isAdmin && onGoToAdmin && (
          <button
            type="button"
            onClick={onGoToAdmin}
            className="text-[10px] text-amber-400/80 hover:text-amber-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <Settings size={10} />
            <span>Gerenciar</span>
          </button>
        )}
      </div>
    </div>
  );
};
