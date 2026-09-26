import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';
import { Company, AppUser, Lead } from '../types';
import { cn, AvatarPhoto } from './SharedUI';
import {
  X, Search, Send, Forward, Check, Loader2, MessageCircle, FileText, Image as ImageIcon, Music
} from 'lucide-react';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageToForward: any;
  currentCompany: Company | null;
  user: AppUser | null;
  onForwardSuccess?: (targetLead: Lead) => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  messageToForward,
  currentCompany,
  user,
  onForwardSuccess,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [sendingToPhone, setSendingToPhone] = useState<string | null>(null);
  const [sentSuccessPhone, setSentSuccessPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    setSendingToPhone(null);
    setSentSuccessPhone(null);

    const carregarContatos = async () => {
      setLoadingLeads(true);
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('id, company_id, full_name, contact_name, whatsapp_name, phone, source_type, photo_url, last_message_at')
          .eq('company_id', 'rafa-arts')
          .not('phone', 'is', null)
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(100);

        if (!error && data) {
          // Deduplica por telefone
          const vistos = new Set<string>();
          const unicos: any[] = [];
          for (const item of data) {
            const num = (item.phone || '').replace(/\D/g, '');
            if (!num || vistos.has(num)) continue;
            vistos.add(num);
            unicos.push(item);
          }
          setLeads(unicos);
        }
      } catch (err) {
        console.error('Erro ao carregar contatos para encaminhar:', err);
      } finally {
        setLoadingLeads(false);
      }
    };

    carregarContatos();
  }, [isOpen]);

  if (!isOpen || !messageToForward) return null;

  const getNomeContato = (l: any) =>
    (l.contact_name || l.full_name || l.whatsapp_name || l.phone || 'Cliente').trim();

  const contatosFiltrados = leads.filter(l => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    const nome = getNomeContato(l).toLowerCase();
    const tel = (l.phone || '').replace(/\D/g, '');
    return nome.includes(s) || tel.includes(s);
  });

  const handleSendForward = async (leadAlvo: any) => {
    if (sendingToPhone) return;
    const phone = leadAlvo.phone;
    if (!phone) return;

    setSendingToPhone(phone);
    try {
      const senderRole = user?.isAdmin ? 'Adm' : 'Atendente';
      const senderDisplay = user?.name ? `${user.name} (${senderRole})` : senderRole;

      const mediaUrl = messageToForward.mediaUrl;
      const mediaContentType = messageToForward.mediaContentType || messageToForward.contentType;
      const ehSticker = mediaContentType === 'sticker' || messageToForward.isSticker;
      const ehAudio = mediaContentType === 'audio' || messageToForward.isAudio;
      const ehImage = mediaContentType === 'image' || messageToForward.isImage;
      const ehVideo = mediaContentType === 'video' || messageToForward.isVideo;
      const ehDoc = mediaContentType === 'document' || messageToForward.isDocument;

      let mediaType: string | undefined = undefined;
      if (ehSticker) mediaType = 'sticker';
      else if (ehImage) mediaType = 'image';
      else if (ehAudio) mediaType = 'audio';
      else if (ehVideo) mediaType = 'video';
      else if (ehDoc) mediaType = 'document';

      const texto = messageToForward.text || messageToForward.transcription?.text || '';

      const resp = await fetch('/api/whatsapp-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({
          phone,
          text: texto || undefined,
          mediaUrl: mediaUrl || undefined,
          mediaType,
          fileName: messageToForward.fileName || undefined,
          senderName: senderDisplay,
          leadId: leadAlvo.id || null,
        }),
      });

      const respJson = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(respJson.error || 'Falha ao enviar mensagem');
      }

      setSentSuccessPhone(phone);
      if (onForwardSuccess) {
        onForwardSuccess(leadAlvo);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Erro ao encaminhar mensagem:', err);
      alert(`Não foi possível encaminhar: ${err.message || 'Erro de conexão'}`);
    } finally {
      setSendingToPhone(null);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[350] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-white/15 rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Forward size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Encaminhar mensagem</h3>
              <p className="text-[11px] text-white/50">Selecione o contato para onde deseja enviar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Prévia da Mensagem */}
        <div className="px-4 py-2.5 bg-black/40 border-b border-white/10 flex items-center gap-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-sky-400 shrink-0">
            Mensagem:
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {messageToForward.mediaUrl && (
              messageToForward.mediaContentType === 'image' || messageToForward.isImage ? (
                <img src={messageToForward.mediaUrl} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0 border border-white/10" />
              ) : messageToForward.mediaContentType === 'sticker' || messageToForward.isSticker ? (
                <img src={messageToForward.mediaUrl} alt="" className="w-7 h-7 object-contain shrink-0" />
              ) : messageToForward.mediaContentType === 'audio' || messageToForward.isAudio ? (
                <Music size={14} className="text-emerald-400 shrink-0" />
              ) : (
                <FileText size={14} className="text-primary-400 shrink-0" />
              )
            )}
            <p className="text-xs text-white/80 truncate">
              {messageToForward.text || messageToForward.transcription?.text || messageToForward.fileName || (messageToForward.mediaUrl ? 'Arquivo de mídia' : 'Mensagem')}
            </p>
          </div>
        </div>

        {/* Busca */}
        <div className="p-3 border-b border-white/10 bg-slate-950/40">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-white/40 outline-none focus:border-sky-400 transition-colors"
            />
          </div>
        </div>

        {/* Lista de Contatos */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2 custom-scrollbar">
          {loadingLeads ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-white/40">
              <Loader2 size={24} className="animate-spin text-sky-400" />
              <span className="text-xs font-medium">Carregando contatos...</span>
            </div>
          ) : contatosFiltrados.length === 0 ? (
            <div className="text-center py-10 text-white/40 text-xs">
              Nenhum contato encontrado com essa busca.
            </div>
          ) : (
            contatosFiltrados.map((lead) => {
              const nome = getNomeContato(lead);
              const isSendingThis = sendingToPhone === lead.phone;
              const isSentSuccess = sentSuccessPhone === lead.phone;

              return (
                <div
                  key={lead.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-2xl hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <AvatarPhoto photoUrl={lead.photo_url} name={nome} className="w-9 h-9 text-xs shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate group-hover:text-sky-300 transition-colors">
                        {nome}
                      </p>
                      <p className="text-[11px] text-white/50 truncate flex items-center gap-1 font-mono">
                        <MessageCircle size={10} className="text-emerald-400 shrink-0" />
                        {lead.phone}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSendingThis || isSentSuccess}
                    onClick={() => handleSendForward(lead)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm active:scale-95",
                      isSentSuccess
                        ? "bg-emerald-500 text-slate-950 font-black"
                        : "bg-sky-500 hover:bg-sky-400 text-slate-950 font-black"
                    )}
                  >
                    {isSendingThis ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : isSentSuccess ? (
                      <>
                        <Check size={13} strokeWidth={3} />
                        <span>Enviado!</span>
                      </>
                    ) : (
                      <>
                        <Send size={12} />
                        <span>Enviar</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
