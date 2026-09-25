import React, { useState, useEffect, useRef } from 'react';
import { 
  Smile, 
  Plus, 
  Trash2, 
  Upload, 
  Loader2, 
  Folder, 
  FolderPlus, 
  Pencil, 
  Search, 
  Layers, 
  Check, 
  X, 
  ArrowUpDown, 
  ChevronRight, 
  Image as ImageIcon,
  Sparkles,
  ShieldAlert,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { GlassCard, Badge, Button, Modal, cn } from './SharedUI';
import { 
  carregarColecoes, 
  carregarFigurinhas, 
  criarColecao, 
  atualizarColecao, 
  excluirColecao, 
  reordenarColecoes,
  salvarFigurinha, 
  atualizarFigurinha, 
  excluirFigurinha, 
  reordenarFigurinhas, 
  uploadFigurinhaArquivo, 
  subscribeToStickersData,
  verificarAdmin,
  type StickerItem, 
  type StickerCollection 
} from '../lib/stickersStorage';
import type { AppUser, Company } from '../types';
import { showAlert, showConfirm } from '../lib/notify';

interface FigurinhasManagerProps {
  user?: AppUser | null;
  currentCompany?: Company | null;
}

export const FigurinhasManager: React.FC<FigurinhasManagerProps> = ({ user, currentCompany }) => {
  const isAdmin = verificarAdmin(user);

  const [collections, setCollections] = useState<StickerCollection[]>([]);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string>('todas');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Estados de Modais
  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<StickerCollection | null>(null);
  const [colNameInput, setColNameInput] = useState('');
  const [savingCol, setSavingCol] = useState(false);

  const [isStkModalOpen, setIsStkModalOpen] = useState(false);
  const [editingStk, setEditingStk] = useState<StickerItem | null>(null);
  const [stkNameInput, setStkNameInput] = useState('');
  const [stkCollectionIdInput, setStkCollectionIdInput] = useState('');
  const [stkFile, setStkFile] = useState<File | null>(null);
  const [stkPreview, setStkPreview] = useState<string | null>(null);
  const [savingStk, setSavingStk] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [cols, stks] = await Promise.all([
        carregarColecoes(),
        carregarFigurinhas(user),
      ]);
      setCollections(cols);
      setStickers(stks);
    } catch (err) {
      console.error('Erro ao carregar dados de figurinhas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [user?.id]);

  // Sincronização em tempo real entre todos os computadores
  useEffect(() => {
    const unsub = subscribeToStickersData(({ collections: cols, stickers: stks }) => {
      if (cols.length > 0) setCollections(cols);
      if (stks.length > 0) setStickers(stks);
    });
    return () => unsub();
  }, []);

  // -------------------------------------------------------------
  // AÇÕES DE COLEÇÕES (ADMIN)
  // -------------------------------------------------------------

  const handleOpenCreateCollection = () => {
    if (!isAdmin) {
      showAlert('Apenas administradores podem criar coleções.');
      return;
    }
    setEditingCol(null);
    setColNameInput('');
    setIsColModalOpen(true);
  };

  const handleOpenEditCollection = (col: StickerCollection) => {
    if (!isAdmin) {
      showAlert('Apenas administradores podem editar coleções.');
      return;
    }
    setEditingCol(col);
    setColNameInput(col.name);
    setIsColModalOpen(true);
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showAlert('Apenas administradores podem gerenciar coleções.');
      return;
    }

    const trimmed = colNameInput.trim();
    if (!trimmed) {
      showAlert('Informe o nome da coleção.');
      return;
    }

    setSavingCol(true);
    try {
      if (editingCol) {
        await atualizarColecao(editingCol.id, trimmed, user);
        showAlert(`Coleção "${trimmed}" atualizada com sucesso!`);
      } else {
        const nova = await criarColecao(trimmed, user);
        showAlert(`Coleção "${nova.name}" criada com sucesso!`);
        setActiveCollectionId(nova.id);
      }
      setIsColModalOpen(false);
      await carregarDados();
    } catch (err: any) {
      showAlert(err?.message || 'Erro ao salvar coleção.');
    } finally {
      setSavingCol(false);
    }
  };

  const handleDeleteCollection = async (col: StickerCollection) => {
    if (!isAdmin) {
      showAlert('Apenas administradores podem excluir coleções.');
      return;
    }

    const stksInCol = stickers.filter(s => s.collection_id === col.id);
    const aviso = stksInCol.length > 0
      ? `A coleção "${col.name}" possui ${stksInCol.length} figurinha(s). Deseja realmente excluí-la? As figurinhas permanecerão na biblioteca.`
      : `Deseja excluir a coleção "${col.name}"?`;

    if (!(await showConfirm(aviso))) return;

    try {
      await excluirColecao(col.id, user);
      if (activeCollectionId === col.id) {
        setActiveCollectionId('todas');
      }
      showAlert(`Coleção "${col.name}" excluída.`);
      await carregarDados();
    } catch (err: any) {
      showAlert(err?.message || 'Erro ao excluir coleção.');
    }
  };

  const handleMoveCollection = async (index: number, direction: 'up' | 'down') => {
    if (!isAdmin) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= collections.length) return;

    const reordered = [...collections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setCollections(reordered);
    await reordenarColecoes(reordered, user);
  };

  // -------------------------------------------------------------
  // AÇÕES DE FIGURINHAS (ADMIN)
  // -------------------------------------------------------------

  const handleOpenCreateSticker = () => {
    if (!isAdmin) {
      showAlert('Apenas administradores podem adicionar figurinhas.');
      return;
    }
    setEditingStk(null);
    setStkNameInput('');
    setStkCollectionIdInput(
      activeCollectionId !== 'todas' ? activeCollectionId : (collections[0]?.id || '')
    );
    setStkFile(null);
    setStkPreview(null);
    setIsStkModalOpen(true);
  };

  const handleOpenEditSticker = (stk: StickerItem) => {
    if (!isAdmin) {
      showAlert('Apenas administradores podem editar figurinhas.');
      return;
    }
    setEditingStk(stk);
    setStkNameInput(stk.name || '');
    setStkCollectionIdInput(stk.collection_id || collections[0]?.id || '');
    setStkFile(null);
    setStkPreview(stk.url);
    setIsStkModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStkFile(file);
    // Sugere nome baseado no arquivo se vazio
    if (!stkNameInput.trim()) {
      const nomeBase = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setStkNameInput(nomeBase);
    }

    const reader = new FileReader();
    reader.onload = () => {
      setStkPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSticker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showAlert('Apenas administradores podem salvar figurinhas.');
      return;
    }

    const nome = stkNameInput.trim();
    if (!nome) {
      showAlert('Informe um nome para a figurinha.');
      return;
    }

    if (!editingStk && !stkFile) {
      showAlert('Selecione uma imagem para a figurinha.');
      return;
    }

    if (!stkCollectionIdInput) {
      showAlert('Selecione a coleção da figurinha.');
      return;
    }

    setSavingStk(true);
    try {
      if (editingStk) {
        // Atualização de nome e coleção
        await atualizarFigurinha(
          editingStk.id,
          { name: nome, collection_id: stkCollectionIdInput },
          user
        );
        showAlert('Figurinha atualizada com sucesso!');
      } else if (stkFile) {
        // Upload para Storage persistente compartilhado
        const url = await uploadFigurinhaArquivo(stkFile);
        const colEscolhida = collections.find(c => c.id === stkCollectionIdInput);

        await salvarFigurinha({
          url,
          name: nome,
          collection_id: stkCollectionIdInput,
          collection_name: colEscolhida?.name,
          user,
        });

        showAlert('Figurinha adicionada à biblioteca com sucesso!');
      }
      setIsStkModalOpen(false);
      await carregarDados();
    } catch (err: any) {
      console.error('Erro ao salvar figurinha:', err);
      showAlert(err?.message || 'Erro ao processar figurinha.');
    } finally {
      setSavingStk(false);
    }
  };

  const handleDeleteSticker = async (stk: StickerItem) => {
    if (!isAdmin) {
      showAlert('Apenas administradores podem excluir figurinhas.');
      return;
    }

    if (!(await showConfirm(`Deseja remover a figurinha "${stk.name}" da biblioteca oficial?`))) return;

    try {
      setStickers(prev => prev.filter(s => s.id !== stk.id && (!stk.url || s.url !== stk.url)));
      await excluirFigurinha(stk.id, user, stk.url);
      showAlert('Figurinha excluída com sucesso.');
      await carregarDados();
    } catch (err: any) {
      showAlert(err?.message || 'Erro ao excluir figurinha.');
    }
  };

  // Filtragem de figurinhas
  let figurinhasFiltradas = stickers;
  if (activeCollectionId !== 'todas') {
    figurinhasFiltradas = figurinhasFiltradas.filter(
      s => s.collection_id === activeCollectionId || (s.collection_name && s.collection_name.toLowerCase() === activeCollectionId.toLowerCase())
    );
  }

  if (search.trim()) {
    const termo = search.toLowerCase().trim();
    figurinhasFiltradas = figurinhasFiltradas.filter(
      s => (s.name || '').toLowerCase().includes(termo) || (s.collection_name || '').toLowerCase().includes(termo)
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Aviso para usuário sem permissão de admin */}
      {!isAdmin && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-xs">
          <ShieldAlert size={20} className="shrink-0 text-amber-400" />
          <span>
            <strong>Modo de Visualização:</strong> Apenas administradores têm permissão para criar coleções, subir imagens e organizar figurinhas. Como usuário comercial, você pode pesquisar e visualizar a biblioteca aqui, e enviar/favoritar diretamente pelo chat da conversa.
          </span>
        </div>
      )}

      {/* Cabeçalho do Gerenciador */}
      <GlassCard className="p-6 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/80 border border-white/10 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Smile size={26} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  Gerenciamento de Figurinhas & Coleções
                  <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10">
                    {stickers.length} {stickers.length === 1 ? 'figurinha' : 'figurinhas'}
                  </Badge>
                </h2>
                <p className="text-xs text-white/50">
                  Biblioteca centralizada compartilhada em tempo real com todos os computadores da empresa.
                </p>
              </div>
            </div>
          </div>

          {/* Botões de Ação do Admin */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleOpenCreateCollection}
                icon={FolderPlus}
                variant="outline"
                className="border-white/15 hover:border-amber-400/50 text-white text-xs font-bold"
              >
                + Nova Coleção
              </Button>

              <Button
                onClick={handleOpenCreateSticker}
                icon={Plus}
                className="bg-primary-500 hover:bg-primary-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-primary-500/20"
              >
                + Adicionar Figurinha
              </Button>
            </div>
          )}
        </div>

        {/* Linha de Busca */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Sparkles size={14} className="text-amber-400" />
            <span>As coleções e figurinhas criadas aqui aparecem imediatamente no composer de mensagens de todos os atendentes.</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs w-full sm:w-72">
            <Search size={14} className="text-white/40 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou coleção..."
              className="bg-transparent border-none outline-none text-white text-xs placeholder:text-white/30 focus:ring-0 p-0 w-full"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-white/40 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* SEÇÃO 1: COLEÇÕES (PASTAS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-white/70 flex items-center gap-2">
            <Folder size={15} className="text-amber-400" />
            <span>Coleções ({collections.length})</span>
          </h3>
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenCreateCollection}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <Plus size={13} />
              <span>Adicionar pasta</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card: Todas */}
          <div
            onClick={() => setActiveCollectionId('todas')}
            className={cn(
              "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
              activeCollectionId === 'todas'
                ? "bg-amber-500/15 border-amber-400 text-white shadow-lg shadow-amber-500/10"
                : "bg-slate-900/60 border-white/10 hover:border-white/20 text-white/70 hover:text-white"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                activeCollectionId === 'todas' ? "bg-amber-500 text-slate-950 border-amber-400 font-black" : "bg-white/5 text-white/40 border-white/10"
              )}>
                <Layers size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">Todas as Figurinhas</p>
                <p className="text-[10px] text-white/40">{stickers.length} figurinhas</p>
              </div>
            </div>
            <Badge variant="outline" className={activeCollectionId === 'todas' ? "border-amber-400 text-amber-300" : ""}>
              Ver todas
            </Badge>
          </div>

          {/* Cards das Coleções */}
          {collections.map((col, index) => {
            const count = stickers.filter(s => s.collection_id === col.id || s.collection_name === col.name).length;
            const isSelected = activeCollectionId === col.id;

            return (
              <div
                key={col.id}
                onClick={() => setActiveCollectionId(col.id)}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden",
                  isSelected
                    ? "bg-amber-500/15 border-amber-400 text-white shadow-lg shadow-amber-500/10"
                    : "bg-slate-900/60 border-white/10 hover:border-white/20 text-white/70 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                    isSelected ? "bg-amber-500 text-slate-950 border-amber-400 font-black" : "bg-white/5 text-amber-400 border-white/10"
                  )}>
                    <Folder size={17} className={isSelected ? "fill-slate-950" : "fill-amber-400/20"} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate" title={col.name}>{col.name}</p>
                    <p className="text-[10px] text-white/40">{count} {count === 1 ? 'figurinha' : 'figurinhas'}</p>
                  </div>
                </div>

                {/* Ações de Reordenação e Edição para Admin */}
                {isAdmin ? (
                  <div
                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveCollection(index, 'up')}
                      title="Mover para a esquerda"
                      className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      type="button"
                      disabled={index === collections.length - 1}
                      onClick={() => handleMoveCollection(index, 'down')}
                      title="Mover para a direita"
                      className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowDown size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditCollection(col)}
                      title="Renomear coleção"
                      className="p-1.5 rounded-lg text-white/40 hover:text-amber-300 hover:bg-white/10 cursor-pointer"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCollection(col)}
                      title="Excluir coleção"
                      className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <Badge variant="outline" className={isSelected ? "border-amber-400 text-amber-300" : ""}>
                    {count}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 2: GRADE DE FIGURINHAS DA COLEÇÃO SELECIONADA */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-white/70 flex items-center gap-2">
              <Smile size={15} className="text-amber-400" />
              <span>
                Figurinhas {activeCollectionId !== 'todas' ? `em "${collections.find(c => c.id === activeCollectionId)?.name || 'Coleção'}"` : 'em todas as coleções'} ({figurinhasFiltradas.length})
              </span>
            </h3>
          </div>

          {isAdmin && (
            <Button
              size="sm"
              onClick={handleOpenCreateSticker}
              icon={Plus}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
            >
              Adicionar Figurinha nesta pasta
            </Button>
          )}
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-white/40 space-y-2">
            <Loader2 size={28} className="animate-spin text-amber-400" />
            <p className="text-xs">Carregando figurinhas...</p>
          </div>
        ) : figurinhasFiltradas.length === 0 ? (
          <GlassCard className="py-16 text-center space-y-3 rounded-3xl border border-dashed border-white/15">
            <div className="w-14 h-14 rounded-3xl bg-white/5 mx-auto flex items-center justify-center text-white/30">
              <Smile size={32} />
            </div>
            <h4 className="text-sm font-bold text-white">Nenhuma figurinha encontrada</h4>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              {search
                ? `Nenhum resultado corresponde à busca "${search}".`
                : activeCollectionId !== 'todas'
                ? `A pasta "${collections.find(c => c.id === activeCollectionId)?.name}" ainda não tem figurinhas cadastradas.`
                : 'Nenhuma figurinha cadastrada no momento.'}
            </p>
            {isAdmin && (
              <Button
                size="sm"
                onClick={handleOpenCreateSticker}
                icon={Upload}
                className="mt-2"
              >
                Cadastrar Figurinha
              </Button>
            )}
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {figurinhasFiltradas.map((stk) => {
              const colFound = collections.find(c => c.id === stk.collection_id);
              const colLabel = colFound?.name || stk.collection_name || 'Coleção';

              return (
                <GlassCard
                  key={stk.id || stk.url}
                  className="p-3 bg-slate-900/60 border border-white/10 rounded-2xl flex flex-col items-center justify-between group hover:border-amber-400/40 transition-all relative overflow-hidden"
                >
                  {/* Ações do Admin no Hover */}
                  {isAdmin && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        type="button"
                        onClick={() => handleOpenEditSticker(stk)}
                        title="Editar nome / mover de coleção"
                        className="p-1.5 rounded-lg bg-slate-950/80 text-white/60 hover:text-amber-300 hover:bg-slate-900 backdrop-blur-sm cursor-pointer"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSticker(stk)}
                        title="Excluir figurinha"
                        className="p-1.5 rounded-lg bg-slate-950/80 text-white/60 hover:text-rose-400 hover:bg-rose-500/20 backdrop-blur-sm cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}

                  {/* Imagem da Figurinha */}
                  <div className="w-full aspect-square rounded-xl bg-white/[0.03] flex items-center justify-center p-2 mb-2 relative group-hover:scale-105 transition-transform">
                    <img
                      src={stk.url}
                      alt={stk.name || 'Figurinha'}
                      className="max-w-full max-h-full object-contain filter drop-shadow-md"
                      loading="lazy"
                    />
                  </div>

                  {/* Nome e Pasta */}
                  <div className="w-full text-center min-w-0">
                    <p className="text-[11px] font-bold text-white truncate px-1" title={stk.name}>
                      {stk.name || 'Figurinha'}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold truncate max-w-[120px]">
                        📁 {colLabel}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CRIAR / EDITAR COLEÇÃO                                  */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isColModalOpen}
        onClose={() => setIsColModalOpen(false)}
        title={editingCol ? 'Editar Coleção de Figurinhas' : 'Nova Coleção de Figurinhas'}
        size="sm"
      >
        <form onSubmit={handleSaveCollection} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
              Nome da Coleção
            </label>
            <input
              type="text"
              autoFocus
              value={colNameInput}
              onChange={(e) => setColNameInput(e.target.value)}
              placeholder="Ex: Memes, Clientes, Promoções, Boas-vindas..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm placeholder:text-white/30 focus:border-amber-400 focus:outline-none"
              required
            />
            <p className="text-[11px] text-white/40 mt-1">
              Essa pasta aparecerá automaticamente no topo do painel de figurinhas do WhatsApp.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsColModalOpen(false)}
              disabled={savingCol}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={savingCol}
              icon={savingCol ? Loader2 : Check}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black"
            >
              {savingCol ? 'Salvando...' : 'Salvar Coleção'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADICIONAR / EDITAR FIGURINHA                            */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isStkModalOpen}
        onClose={() => setIsStkModalOpen(false)}
        title={editingStk ? 'Editar Figurinha' : 'Adicionar Nova Figurinha'}
        size="md"
      >
        <form onSubmit={handleSaveSticker} className="space-y-4">
          {/* Upload / Pré-visualização da Imagem */}
          <div>
            <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
              Imagem da Figurinha (WebP, PNG, JPG, GIF)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/webp,image/png,image/jpeg,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/15 hover:border-amber-400/50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-white/[0.02] hover:bg-white/[0.05] transition-all min-h-[140px]"
            >
              {stkPreview ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 rounded-xl bg-slate-950/60 p-2 flex items-center justify-center border border-white/10">
                    <img
                      src={stkPreview}
                      alt="Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <span className="text-[11px] text-amber-300 font-bold hover:underline">
                    Clique para trocar de arquivo
                  </span>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-white/40 mb-1">
                    <Upload size={18} />
                  </div>
                  <p className="text-xs font-bold text-white">Clique para selecionar o arquivo</p>
                  <p className="text-[10px] text-white/40">Recomendado: imagem quadrada transparente (WebP ou PNG)</p>
                </div>
              )}
            </div>
          </div>

          {/* Nome da Figurinha */}
          <div>
            <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
              Nome / Descrição da Figurinha
            </label>
            <input
              type="text"
              value={stkNameInput}
              onChange={(e) => setStkNameInput(e.target.value)}
              placeholder="Ex: Joinha OK, Pedido Pronto, Logo Rafa Arts..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm placeholder:text-white/30 focus:border-amber-400 focus:outline-none"
              required
            />
          </div>

          {/* Coleção de Destino */}
          <div>
            <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5">
              Coleção (Pasta)
            </label>
            <select
              value={stkCollectionIdInput}
              onChange={(e) => setStkCollectionIdInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:border-amber-400 focus:outline-none"
              required
            >
              {collections.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  📁 {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStkModalOpen(false)}
              disabled={savingStk}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={savingStk}
              icon={savingStk ? Loader2 : Check}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black"
            >
              {savingStk ? 'Enviando...' : editingStk ? 'Salvar Alterações' : 'Adicionar à Biblioteca'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
