// Busca AO VIVO a mídia de uma mensagem na Evolution API (POST /chat/getBase64FromMediaMessage).
// Usado por api/whatsapp-media.js (o que o navegador toca/mostra) e por api/_lib/gemini-transcricao.js
// (o que o servidor manda pro Gemini) -- assim a transcrição não depende de baixar uma URL do próprio
// site (que muda a cada deploy e pode estar protegida pela Vercel).
import { EVOLUTION_API_URL, EVOLUTION_API_KEY, INSTANCE_NAME } from './whatsapp-config.js';

export class ErroMidia extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Aceita a URL gravada em crm_messages.media_url em qualquer formato: relativa
// ("/api/whatsapp-media?messageId=X") ou absoluta com o host de qualquer deploy antigo.
// Devolve o messageId, ou null se não for uma URL desse endpoint.
export function messageIdDaMediaUrl(url) {
  if (typeof url !== 'string') return null;
  const m = /^(?:https?:\/\/[^/?#]+)?\/api\/whatsapp-media\?(?:[^#]*&)?messageId=([^&#]+)/i.exec(url.trim());
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return null; }
}

export async function buscarMidiaEvolution(messageId) {
  if (!messageId) throw new ErroMidia(400, 'Faltou messageId.');
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error('evolution-media: EVOLUTION_API_URL/EVOLUTION_API_KEY não configuradas.');
    throw new ErroMidia(500, 'Evolution API não configurada.');
  }

  // Mesmo payload documentado que o webhook já usava pra baixar mídia — a Evolution busca a
  // mensagem pelo ID no banco interno dela, não pelo conteúdo que a gente manda.
  const buscar = () => fetch(`${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${INSTANCE_NAME}`, {
    method: 'POST',
    headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { key: { id: messageId } }, convertToMp4: false }),
  });

  let r = await buscar();
  if (!r.ok) {
    // Tolerância a race condition (logo após a mensagem chegar a Evolution pode ainda não ter gravado).
    await new Promise((resolve) => setTimeout(resolve, 1200));
    r = await buscar();
  }
  if (!r.ok) {
    console.error('evolution-media: falha ao buscar na Evolution API:', r.status, await r.text().catch(() => ''));
    throw new ErroMidia(502, 'Falha ao buscar mídia.');
  }

  const data = await r.json();
  let base64 = data?.base64 || data?.data;
  if (typeof base64 !== 'string' || !base64) {
    throw new ErroMidia(404, 'Mídia não encontrada (pode ter expirado no WhatsApp).');
  }
  // Algumas versões devolvem "data:audio/ogg;base64,AAAA..." em vez do base64 puro.
  const prefixo = /^data:([^;,]+)[^,]*;base64,/i.exec(base64);
  let mimetype = data?.mimetype || null;
  if (prefixo) {
    base64 = base64.slice(prefixo[0].length);
    mimetype = mimetype || prefixo[1];
  }
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0) throw new ErroMidia(404, 'Mídia vazia.');
  return { bytes, mimetype: mimetype || 'application/octet-stream' };
}
