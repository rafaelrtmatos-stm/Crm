import React, { useState, useEffect, useRef } from 'react';
import { Smile, Plus, Trash2, Upload, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { GlassCard, Badge, Button, cn } from './SharedUI';
import { carregarFigurinhas, salvarFigurinha, excluirFigurinha, uploadFigurinha, type StickerItem } from '../lib/stickersStorage';
import { showAlert, showConfirm } from '../lib/notify';

export const FigurinhasManager = () => {
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await carregarFigurinhas();
      setStickers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reseta o input para permitir selecionar o mesmo arquivo se desejar
    e.target.value = '';

    setUploading(true);
    try {
      const url = await uploadFigurinha(file);
      const nomeLimpo = file.name.replace(/\.[^/.]+$/, '');
      const nova = await salvarFigurinha({ url, name: nomeLimpo });
      setStickers(prev => [nova, ...prev.filter(s => s.id !== nova.id)]);
      showAlert('Figurinha adicionada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao subir figurinha:', err);
      showAlert(`Erro ao salvar figurinha: ${err?.message || 'Falha no processamento'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name?: string) => {
    if (!(await showConfirm(`Deseja remover a figurinha "${name || 'selecionada'}" da sua biblioteca?`))) return;
    try {
      await excluirFigurinha(id);
      setStickers(prev => prev.filter(s => s.id !== id));
      showAlert('Figurinha removida.');
    } catch (err) {
      showAlert('Erro ao remover figurinha.');
    }
  };

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
                  Gerencie as figurinhas da empresa para disparar rapidamente nas conversas com clientes.
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

        {/* Dica de uso */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-amber-300/80 bg-amber-500/5 px-3.5 py-2.5 rounded-2xl border border-amber-500/15">
          <Sparkles size={16} className="text-amber-400 shrink-0" />
          <span>
            <strong>Dica prática:</strong> Você também pode salvar qualquer figurinha que o cliente mandar no chat! Basta passar o mouse sobre a figurinha recebida e clicar em <strong>⭐ Salvar Figurinha</strong>.
          </span>
        </div>
      </GlassCard>

      {/* Grid de Figurinhas */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-white/40 space-y-2">
          <Loader2 size={28} className="animate-spin text-primary-400" />
          <p className="text-xs">Carregando sua coleção de figurinhas...</p>
        </div>
      ) : stickers.length === 0 ? (
        <GlassCard className="py-20 text-center space-y-3 rounded-3xl border border-dashed border-white/15">
          <div className="w-14 h-14 rounded-3xl bg-white/5 mx-auto flex items-center justify-center text-white/30">
            <Smile size={32} />
          </div>
          <h4 className="text-sm font-bold text-white">Nenhuma figurinha cadastrada</h4>
          <p className="text-xs text-white/40 max-w-sm mx-auto">
            Faça upload da primeira figurinha acima ou salve as figurinhas que seus clientes enviarem nas conversas do WhatsApp.
          </p>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            icon={Upload}
            className="mt-2"
          >
            Adicionar Primeira Figurinha
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {stickers.map(stk => (
            <GlassCard
              key={stk.id}
              className="p-3 bg-slate-900/60 border border-white/10 rounded-2xl flex flex-col items-center justify-between group hover:border-amber-400/40 transition-all relative overflow-hidden"
            >
              {/* Botão de Excluir */}
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

              {/* Nome e Data */}
              <div className="w-full text-center min-w-0">
                <p className="text-[11px] font-bold text-white truncate px-1" title={stk.name}>
                  {stk.name || 'Figurinha'}
                </p>
                <p className="text-[9px] text-white/30 truncate mt-0.5">
                  {stk.created_at ? new Date(stk.created_at).toLocaleDateString('pt-BR') : 'Salva'}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
