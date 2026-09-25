import React, { useState, useEffect, useRef } from 'react';
import { 
  Smile, 
  Plus, 
  Trash2, 
  Upload, 
  Loader2, 
  Sparkles, 
  Star, 
  History, 
  Package, 
  Search,
  Check
} from 'lucide-react';
import { GlassCard, Badge, Button, cn } from './SharedUI';
import { 
  carregarFigurinhas, 
  carregarHistoricoFigurinhas, 
  salvarFigurinha, 
  excluirFigurinha, 
  uploadFigurinha, 
  toggleFavoritoFigurinha, 
  type StickerItem 
} from '../lib/stickersStorage';
import { showAlert, showConfirm } from '../lib/notify';

export const FigurinhasManager = () => {
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [historyStickers, setHistoryStickers] = useState<StickerItem[]>([]);
  const [activeTab, setActiveTab] = useState<'colecao' | 'favoritos' | 'historico' | 'todas'>('colecao');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await carregarFigurinhas();
      setStickers(data);
      const hist = carregarHistoricoFigurinhas();
      setHistoryStickers(hist);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    const handleUpdate = () => carregar();
    window.addEventListener('whatsapp-stickers-updated', handleUpdate);
    return () => window.removeEventListener('whatsapp-stickers-updated', handleUpdate);
  }, []);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        category: 'colecao',
        source: 'system',
      });
      setStickers(prev => [nova, ...prev.filter(s => s.id !== nova.id)]);
      showAlert('Figurinha adicionada à Coleção Oficial com sucesso!');
    } catch (err: any) {
      console.error('Erro ao subir figurinha:', err);
      showAlert(`Erro ao salvar figurinha: ${err?.message || 'Falha no processamento'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name?: string) => {
    if (!(await showConfirm(`Deseja remover a figurinha "${name || 'selecionada'}" da biblioteca?`))) return;
    try {
      await excluirFigurinha(id);
      setStickers(prev => prev.filter(s => s.id !== id));
      setHistoryStickers(prev => prev.filter(s => s.id !== id));
      showAlert('Figurinha removida.');
    } catch (err) {
      showAlert('Erro ao remover figurinha.');
    }
  };

  const handleToggleFavorite = async (stk: StickerItem) => {
    const novoStatus = await toggleFavoritoFigurinha(stk);
    setStickers(prev =>
      prev.map(s => (s.id === stk.id || s.url === stk.url ? { ...s, is_favorite: novoStatus } : s))
    );
  };

  const favoritos = stickers.filter(s => s.is_favorite || s.category === 'favoritos');
  const colecao = stickers.filter(s => s.category === 'colecao' || s.source === 'system');

  let listToDisplay: StickerItem[] = [];
  if (activeTab === 'colecao') {
    listToDisplay = colecao;
  } else if (activeTab === 'favoritos') {
    listToDisplay = favoritos;
  } else if (activeTab === 'historico') {
    listToDisplay = historyStickers;
  } else {
    listToDisplay = stickers;
  }

  if (search.trim()) {
    const term = search.toLowerCase().trim();
    listToDisplay = listToDisplay.filter(s => (s.name || '').toLowerCase().includes(term));
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <GlassCard className="p-6 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/80 border border-white/10 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Smile size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  Biblioteca de Figurinhas do WhatsApp
                  <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10">
                    {stickers.length} {stickers.length === 1 ? 'figurinha' : 'figurinhas'}
                  </Badge>
                </h3>
                <p className="text-xs text-white/50">
                  Gerencie a <strong>Coleção Oficial</strong> da empresa e veja as <strong>Favoritas</strong> e o <strong>Histórico</strong> das conversas.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/webp,image/png,image/jpeg,image/gif"
              className="hidden"
              onChange={handleUploadFile}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              icon={uploading ? Loader2 : Plus}
              className="bg-primary-500 hover:bg-primary-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-primary-500/20"
            >
              {uploading ? 'Enviando Figurinha...' : 'Nova Figurinha (Upload)'}
            </Button>
          </div>
        </div>

        {/* Abas de Navegação (Coleção Oficial, Favoritas das Conversas, Histórico de Uso, Todas) */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('colecao')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                activeTab === 'colecao'
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Package size={13} />
              <span>Coleção do Sistema</span>
              <span className={cn(
                "text-[10px] px-1.5 rounded-full font-bold",
                activeTab === 'colecao' ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-white/60"
              )}>
                {colecao.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('favoritos')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                activeTab === 'favoritos'
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Star size={13} className={activeTab === 'favoritos' ? "fill-slate-950" : ""} />
              <span>Favoritas (Conversas)</span>
              <span className={cn(
                "text-[10px] px-1.5 rounded-full font-bold",
                activeTab === 'favoritos' ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-white/60"
              )}>
                {favoritos.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('historico')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                activeTab === 'historico'
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <History size={13} />
              <span>Histórico de Uso</span>
              <span className={cn(
                "text-[10px] px-1.5 rounded-full font-bold",
                activeTab === 'historico' ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-white/60"
              )}>
                {historyStickers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('todas')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                activeTab === 'todas'
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <span>Todas</span>
              <span className={cn(
                "text-[10px] px-1.5 rounded-full font-bold",
                activeTab === 'todas' ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-white/60"
              )}>
                {stickers.length}
              </span>
            </button>
          </div>

          {/* Campo de Busca */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs w-full sm:w-60">
            <Search size={13} className="text-white/40 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por nome..."
              className="bg-transparent border-none outline-none text-white text-xs placeholder:text-white/30 focus:ring-0 p-0 w-full"
            />
          </div>
        </div>

        {/* Dica de uso */}
        <div className="mt-4 flex items-center gap-2 text-xs text-amber-300/80 bg-amber-500/5 px-3.5 py-2.5 rounded-2xl border border-amber-500/15">
          <Sparkles size={16} className="text-amber-400 shrink-0" />
          <span>
            <strong>Dica WhatsApp:</strong> No chat com o cliente, abra o botão de <strong>Figurinhas</strong> no rodapé para disparar instantaneamente ou clique na <strong>⭐ estrela</strong> de qualquer figurinha recebida para salvar nas suas <strong>Favoritas</strong>!
          </span>
        </div>
      </GlassCard>

      {/* Grid de Figurinhas */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-white/40 space-y-2">
          <Loader2 size={28} className="animate-spin text-primary-400" />
          <p className="text-xs">Carregando sua biblioteca de figurinhas...</p>
        </div>
      ) : listToDisplay.length === 0 ? (
        <GlassCard className="py-20 text-center space-y-3 rounded-3xl border border-dashed border-white/15">
          <div className="w-14 h-14 rounded-3xl bg-white/5 mx-auto flex items-center justify-center text-white/30">
            <Smile size={32} />
          </div>
          <h4 className="text-sm font-bold text-white">
            {activeTab === 'favoritos'
              ? 'Nenhuma figurinha favoritada ainda'
              : activeTab === 'historico'
              ? 'Nenhuma figurinha usada recentemente'
              : 'Nenhuma figurinha cadastrada nesta categoria'}
          </h4>
          <p className="text-xs text-white/40 max-w-sm mx-auto">
            {activeTab === 'favoritos'
              ? 'Passe o mouse sobre as figurinhas enviadas pelo cliente no chat e clique no ícone de estrela ⭐ para salvar diretamente aqui.'
              : activeTab === 'historico'
              ? 'Ao enviar figurinhas nas conversas do WhatsApp, elas ficarão guardadas aqui para acesso rápido.'
              : 'Adicione figurinhas à Coleção Oficial fazendo upload acima.'}
          </p>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            icon={Upload}
            className="mt-2"
          >
            Fazer Upload de Figurinha
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {listToDisplay.map(stk => {
            const isFav = stk.is_favorite || stk.category === 'favoritos';
            return (
              <GlassCard
                key={stk.id || stk.url}
                className="p-3 bg-slate-900/60 border border-white/10 rounded-2xl flex flex-col items-center justify-between group hover:border-amber-400/40 transition-all relative overflow-hidden"
              >
                {/* Botão de Favorito no topo esquerdo */}
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(stk)}
                  title={isFav ? "Remover dos favoritos" : "Marcar como favorita"}
                  className={cn(
                    "absolute top-2 left-2 p-1.5 rounded-lg bg-slate-950/80 backdrop-blur-sm transition-all z-10",
                    isFav
                      ? "text-amber-400 opacity-100"
                      : "text-white/40 hover:text-amber-400 opacity-0 group-hover:opacity-100"
                  )}
                >
                  <Star size={13} className={isFav ? "fill-amber-400" : ""} />
                </button>

                {/* Botão de Excluir no topo direito */}
                <button
                  type="button"
                  onClick={() => handleDelete(stk.id, stk.name)}
                  title="Excluir figurinha"
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 text-white/40 hover:text-rose-400 hover:bg-rose-500/20 opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  <Trash2 size={13} />
                </button>

                {/* Área da imagem da figurinha */}
                <div className="w-full aspect-square rounded-xl bg-white/[0.03] flex items-center justify-center p-2 mb-2 relative group-hover:scale-105 transition-transform">
                  <img
                    src={stk.url}
                    alt={stk.name || 'Figurinha'}
                    className="max-w-full max-h-full object-contain filter drop-shadow-md"
                    loading="lazy"
                  />
                </div>

                {/* Nome, Origem e Categoria */}
                <div className="w-full text-center min-w-0">
                  <p className="text-[11px] font-bold text-white truncate px-1" title={stk.name}>
                    {stk.name || 'Figurinha'}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/50 uppercase font-black tracking-wider">
                      {stk.source === 'conversation' ? 'Conversa' : stk.category === 'colecao' ? 'Coleção' : 'Upload'}
                    </span>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
