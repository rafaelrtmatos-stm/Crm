import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Image as ImageIcon, 
  Sparkles, 
  Check, 
  X, 
  Upload, 
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { GlassCard, Modal, Badge, cn } from './SharedUI';
import { 
  QuickReply, 
  carregarMensagensRapidas, 
  adicionarMensagemRapida, 
  atualizarMensagemRapida, 
  excluirMensagemRapida,
  uploadImagemMensagemRapida
} from '../lib/quickRepliesStorage';
import { showAlert, showConfirm } from '../lib/notify';

import { Company, AppUser } from '../types';

export const QuickRepliesManager: React.FC<{
  onSelectReply?: (reply: QuickReply) => void;
  isModal?: boolean;
  isAdmin?: boolean;
}> = ({ onSelectReply, isModal = false, isAdmin = false }) => {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal de criação / edição
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formShortcut, setFormShortcut] = useState('');
  const [formText, setFormText] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await carregarMensagensRapidas();
      setReplies(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    const handleUpdate = () => carregar();
    window.addEventListener('quick-replies-updated', handleUpdate);
    return () => window.removeEventListener('quick-replies-updated', handleUpdate);
  }, []);

  const abrirFormCriacao = () => {
    setEditingReply(null);
    setFormTitle('');
    setFormShortcut('');
    setFormText('');
    setFormImageUrl('');
    setIsFormOpen(true);
  };

  const abrirFormEdicao = (reply: QuickReply) => {
    setEditingReply(reply);
    setFormTitle(reply.title);
    setFormShortcut(reply.shortcut || '');
    setFormText(reply.text);
    setFormImageUrl(reply.imageUrl || '');
    setIsFormOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || (!formText.trim() && !formImageUrl.trim())) {
      showAlert('Preencha o título e pelo menos um texto ou uma imagem.');
      return;
    }

    let shortcutFormatted = formShortcut.trim();
    if (shortcutFormatted && !shortcutFormatted.startsWith('/')) {
      shortcutFormatted = '/' + shortcutFormatted;
    }

    setSaving(true);
    try {
      if (editingReply) {
        const ok = await atualizarMensagemRapida(editingReply.id, {
          title: formTitle.trim(),
          shortcut: shortcutFormatted || undefined,
          text: formText.trim(),
          imageUrl: formImageUrl.trim() || undefined
        });
        if (!ok) throw new Error('Falha ao salvar no Supabase');
      } else {
        await adicionarMensagemRapida({
          title: formTitle.trim(),
          shortcut: shortcutFormatted || undefined,
          text: formText.trim(),
          imageUrl: formImageUrl.trim() || undefined
        });
      }
      setIsFormOpen(false);
      await carregar();
    } catch (err) {
      console.error(err);
      showAlert('Erro ao salvar mensagem rápida.');
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async (reply: QuickReply) => {
    const ok = await showConfirm(`Tem certeza que deseja excluir a mensagem rápida "${reply.title}"?`);
    if (!ok) return;

    try {
      await excluirMensagemRapida(reply.id);
      await carregar();
    } catch {
      showAlert('Não foi possível excluir.');
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showAlert('Selecione uma imagem de até 2MB.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    uploadImagemMensagemRapida(file)
      .then((url) => {
        if (url) {
          setFormImageUrl(url);
        } else {
          // Se o upload para o Storage falhar temporariamente, usa Data URL local como fallback seguro
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setFormImageUrl(reader.result);
            }
          };
          reader.readAsDataURL(file);
        }
      })
      .catch(() => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setFormImageUrl(reader.result);
          }
        };
        reader.readAsDataURL(file);
      })
      .finally(() => {
        setIsUploading(false);
        e.target.value = '';
      });
  };

  const filtered = replies.filter(r => {
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.text.toLowerCase().includes(q) ||
      (r.shortcut && r.shortcut.toLowerCase().includes(q))
    );
  });

  return (
    <div className={cn("space-y-4", isModal ? "p-1" : "")}>
      {/* Header com pesquisa e botão de adicionar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111b21] p-3 rounded-2xl border border-white/5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, texto ou atalho (/pix)..."
            className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 focus:border-emerald-500/50 focus:outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={carregar}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors border border-white/10"
            title="Recarregar"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-emerald-400" : ""} />
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={abrirFormCriacao}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-transform active:scale-95"
            >
              <Plus size={14} />
              <span>Nova Mensagem</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista de Mensagens Rápidas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-8 text-white/40 space-y-2">
          <RefreshCw size={24} className="animate-spin text-emerald-400" />
          <p className="text-xs">Carregando mensagens prontas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center bg-[#111b21]/50 border border-white/5 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-white/20">
            <Zap size={24} />
          </div>
          <p className="text-sm font-semibold text-white/70">Nenhuma mensagem rápida encontrada</p>
          <p className="text-xs text-white/40 max-w-sm mx-auto">
            Crie respostas automáticas e orçamentos padronizados para enviar aos clientes com 1 clique no WhatsApp.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={abrirFormCriacao}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors"
            >
              <Plus size={13} />
              <span>Criar primeira resposta</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto custom-scrollbar pr-1">
          {filtered.map(r => (
            <div
              key={r.id}
              onClick={() => onSelectReply && onSelectReply(r)}
              className={cn(
                "group relative p-3.5 rounded-2xl bg-[#111b21] border border-white/5 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-3 text-left",
                onSelectReply ? "cursor-pointer hover:bg-[#182229]" : ""
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-white truncate">{r.title}</span>
                    {r.shortcut && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        {r.shortcut}
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => abrirFormEdicao(r)}
                        className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExcluir(r)}
                        className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-white/70 line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans">
                  {r.text}
                </p>
              </div>

              {r.imageUrl && (
                <div className="flex items-center gap-2 p-1.5 rounded-xl bg-black/40 border border-white/5">
                  <img
                    src={r.imageUrl}
                    alt={r.title}
                    className="w-10 h-10 object-cover rounded-lg border border-white/10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                      <ImageIcon size={11} />
                      <span>Imagem anexada</span>
                    </p>
                    <p className="text-[9px] text-white/40 truncate">Envia junto no chat</p>
                  </div>
                </div>
              )}

              {onSelectReply && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-emerald-400 font-semibold">
                  <span>Clique para inserir no chat</span>
                  <span className="text-white/30">Enviar ↵</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro / Edição */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingReply ? "Editar Mensagem Rápida" : "Nova Mensagem Rápida"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSalvar} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1">
              Título / Descrição *
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Ex: 💰 Orçamento PIX, 📦 Pedido Pronto"
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1">
              Atalho no Chat (opcional)
            </label>
            <input
              type="text"
              value={formShortcut}
              onChange={(e) => setFormShortcut(e.target.value)}
              placeholder="Ex: /pix, /ola, /pronto"
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 focus:border-emerald-500 focus:outline-none font-mono"
            />
            <p className="text-[10px] text-white/40 mt-1">
              Digite este atalho no chat para puxar a mensagem rapidamente.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60">
                Texto da Mensagem {formImageUrl ? '(opcional com foto)' : '*'}
              </label>
            </div>
            <textarea
              rows={4}
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              placeholder="Digite o texto que será enviado ao cliente..."
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-white/30 focus:border-emerald-500 focus:outline-none custom-scrollbar leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1">
              Foto / Imagem Anexada (opcional)
            </label>
            <div className="space-y-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                {formImageUrl ? (
                  <div className="relative w-16 h-16 rounded-xl border border-white/10 overflow-hidden shrink-0 group">
                    <img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormImageUrl('')}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 transition-opacity"
                      title="Remover imagem"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-white/20 shrink-0">
                    <ImageIcon size={20} />
                  </div>
                )}

                <div className="flex-1 space-y-1.5">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer transition-colors border border-white/10">
                    <Upload size={13} />
                    <span>{isUploading ? 'Carregando...' : formImageUrl ? 'Trocar Imagem' : 'Escolher Foto do Computador'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFile}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                  <p className="text-[10px] text-white/40">PNG, JPG ou WEBP até 2MB</p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="Ou cole a URL da imagem (https://...)"
                  className="flex-1 px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-[11px] text-white placeholder:text-white/30 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-colors disabled:opacity-50"
            >
              <Check size={14} />
              <span>{saving ? 'Salvando...' : 'Salvar Resposta'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
