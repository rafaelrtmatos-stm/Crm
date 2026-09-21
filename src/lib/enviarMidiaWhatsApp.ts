import { supabase } from '../supabase';

// Envio de FOTO, VIDEO, DOCUMENTO e AUDIO pelo chat do WhatsApp (ChatPanel).
// Fluxo: o navegador sobe o arquivo direto no bucket publico `whatsapp-media` do Supabase Storage (sem passar
// pelo limite de tamanho das funcoes da Vercel) e depois pede pro /api/whatsapp-send mandar a Evolution API
// buscar esse link e enviar pro cliente. O servidor registra a mensagem em crm_messages so depois que o
// WhatsApp confirma o envio.

export type TipoMidia = 'image' | 'video' | 'document' | 'audio';

// Limites em MB (WhatsApp aceita ate ~16 MB em foto/video/audio; documento vai ate mais, mas o Storage padrao
// do Supabase limita 50 MB por arquivo).
export const LIMITE_MIDIA_MB: Record<TipoMidia, number> = { image: 16, video: 16, audio: 16, document: 50 };

const COMPANY_ID = 'rafa-arts';
const BUCKET = 'whatsapp-media';

/** Foto (jpeg/png/webp) e video (mp4/3gp/mov) seguem como midia; qualquer outra coisa vai como documento. */
export function tipoDaMidia(file: { type?: string }): TipoMidia {
  const t = (file.type || '').toLowerCase();
  if (t === 'image/jpeg' || t === 'image/png' || t === 'image/webp') return 'image';
  if (t === 'video/mp4' || t === 'video/3gpp' || t === 'video/quicktime') return 'video';
  return 'document';
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Nome seguro pro caminho no Storage: sem acento, espaco ou simbolo (o nome ORIGINAL segue em `fileName`).
function nomeSeguro(nome: string): string {
  const limpo = nome
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return (limpo || 'arquivo').slice(-80);
}

/** Sobe o arquivo no bucket whatsapp-media e devolve o link publico. */
export async function subirMidiaParaStorage(arquivo: Blob, nome: string, contentType: string): Promise<string> {
  const caminho = `${COMPANY_ID}/enviadas/${Date.now()}-${nomeSeguro(nome)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, { contentType, upsert: false });
  if (error) throw new Error(`falha ao subir o arquivo (${error.message})`);
  return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

export interface EnvioMidia {
  phone: string;
  senderName: string;
  leadId?: string | null;
  userId?: string;
  media: { url: string; type: TipoMidia; mimeType?: string; fileName?: string; caption?: string; seconds?: number };
}

const ROTULO: Record<TipoMidia, string> = { image: '📷 Imagem', video: '🎥 Vídeo', audio: '🎤 Áudio', document: '📄 Documento' };

/** Manda o arquivo (ja no Storage) pelo WhatsApp. Lanca erro com a mensagem do servidor se nao enviar. */
export async function enviarMidiaPeloWhatsApp(envio: EnvioMidia): Promise<{ whatsappMessageId: string | null; createdAt: string }> {
  let resp: Response;
  try {
    resp = await fetch('/api/whatsapp-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': envio.userId || '' },
      body: JSON.stringify({ phone: envio.phone, senderName: envio.senderName, leadId: envio.leadId || null, media: envio.media }),
    });
  } catch {
    throw new Error('falha de conexão');
  }
  const dados: any = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(dados.error || 'erro desconhecido');

  const quando: string = dados.createdAt || new Date().toISOString();
  if (dados.saved !== true) {
    // Envio confirmado, mas o servidor nao conseguiu registrar: registra daqui (a duplicata do "eco" que a
    // Evolution manda no webhook e ignorada pelo indice unico do banco).
    const texto = envio.media.caption?.trim() || (envio.media.type === 'document' && envio.media.fileName ? `📄 ${envio.media.fileName}` : ROTULO[envio.media.type]);
    await supabase.from('crm_messages').insert({
      company_id: COMPANY_ID,
      lead_id: envio.leadId || null,
      phone: envio.phone,
      text: texto,
      direction: 'outgoing',
      sender_name: envio.senderName,
      channel: 'WhatsApp',
      whatsapp_message_id: dados.whatsappMessageId || null,
      media_url: envio.media.url,
      file_name: envio.media.fileName || null,
      content_type: envio.media.type,
      created_at: quando,
    });
    if (envio.leadId) {
      await supabase.from('leads').update({
        last_message_at: quando, last_message_text: texto, last_message_direction: 'outgoing', waiting_since: null, updated_at: new Date().toISOString(),
      }).eq('id', envio.leadId);
    }
  }
  return { whatsappMessageId: dados.whatsappMessageId || null, createdAt: quando };
}
