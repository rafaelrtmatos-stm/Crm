// Funções de parsing do payload de mensagem da Evolution API/Baileys, compartilhadas entre
// api/whatsapp-webhook.js (mensagem chegando em tempo real) e api/whatsapp-messages.js
// (histórico buscado ao vivo, Fase 3). Extraído do webhook pra não duplicar essa lógica —
// o comportamento é exatamente o mesmo de antes, só mudou de arquivo.

// Percorre o objeto `message` da Evolution/Baileys e devolve o "node" de midia bruto
// (imageMessage/videoMessage/documentMessage/audioMessage/stickerMessage), sem desembrulhar
// texto -- usado pra extrairInfoMidia conseguir o mimetype/fileName/caption reais.
export function encontrarNodeMidia(message, profundidade = 0) {
  if (!message || profundidade > 4) return null;
  if (message.imageMessage) return { tipo: 'image', node: message.imageMessage };
  if (message.videoMessage) return { tipo: 'video', node: message.videoMessage };
  if (message.documentMessage) return { tipo: 'document', node: message.documentMessage };
  if (message.documentWithCaptionMessage?.message?.documentMessage) {
    return { tipo: 'document', node: message.documentWithCaptionMessage.message.documentMessage };
  }
  if (message.audioMessage) return { tipo: 'audio', node: message.audioMessage };
  if (message.stickerMessage) return { tipo: 'sticker', node: message.stickerMessage };

  const embrulho =
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message;
  if (embrulho) return encontrarNodeMidia(embrulho, profundidade + 1);

  return null;
}

// Extensao a partir do mimetype -- usada quando a midia nao tem fileName proprio
// (imagem/video/audio/figurinha, que so o documentMessage costuma trazer).
export function extensaoPorMimetype(mimetype) {
  if (!mimetype) return '';
  const base = mimetype.split(';')[0].trim();
  const mapa = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/3gpp': '3gp', 'video/quicktime': 'mov',
    'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav',
    'application/pdf': 'pdf',
  };
  return mapa[base] || (base.includes('/') ? base.split('/')[1] : '');
}

// Percorre o objeto `message` da Evolution/Baileys e devolve um texto exibivel pro chat.
// Mensagens efemeras ("apagar apos ler") e "ver uma vez" vem embrulhadas em mais um nivel
// (ephemeralMessage.message / viewOnceMessage(V2).message) — sem desembrulhar isso, o
// texto real nunca e encontrado e a mensagem eh descartada em silencio.
export function extrairTextoMensagem(message, profundidade = 0) {
  if (!message || profundidade > 4) return '';

  if (typeof message.conversation === 'string') return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;

  // Midia com legenda — se nao tiver legenda, mostra um rotulo pra mensagem nao sumir do chat
  if (message.imageMessage) return message.imageMessage.caption || '📷 Imagem';
  if (message.videoMessage) return message.videoMessage.caption || '🎥 Vídeo';
  if (message.documentMessage || message.documentWithCaptionMessage) {
    const doc = message.documentMessage || message.documentWithCaptionMessage?.message?.documentMessage;
    return doc?.caption || (doc?.fileName ? `📄 ${doc.fileName}` : '📄 Documento');
  }
  if (message.audioMessage) return message.audioMessage.ptt ? '🎤 Áudio' : '🎵 Áudio';
  if (message.stickerMessage) return '🌟 Figurinha';
  if (message.locationMessage || message.liveLocationMessage) return '📍 Localização';
  if (message.contactMessage) return `📇 Contato: ${message.contactMessage.displayName || ''}`.trim();
  if (message.contactsArrayMessage) return '📇 Contatos';
  if (message.buttonsResponseMessage) return message.buttonsResponseMessage.selectedDisplayText || '';
  if (message.listResponseMessage) return message.listResponseMessage.title || message.listResponseMessage.singleSelectReply?.selectedRowId || '';
  if (message.templateButtonReplyMessage) return message.templateButtonReplyMessage.selectedDisplayText || '';

  // Mensagem efemera / "ver uma vez" — o conteudo real esta um nivel mais fundo
  const embrulho =
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message.documentWithCaptionMessage?.message;
  if (embrulho) return extrairTextoMensagem(embrulho, profundidade + 1);

  return '';
}

// Monta { mediaUrl, fileName, contentType } a partir de um registro de mensagem (msg.message +
// msg.key.id), sem baixar nada -- mediaUrl aponta pra api/whatsapp-media.js, que busca ao vivo
// na Evolution API só quando alguém realmente abrir a mídia. Usado tanto pelo webhook (mensagem
// chegando agora) quanto pelo endpoint de histórico (Fase 3).
export function extrairInfoMidia(msg, appBaseUrl) {
  const midia = encontrarNodeMidia(msg?.message);
  if (!midia) return null;

  const messageId = msg?.key?.id;
  if (!messageId) return null;
  if (!appBaseUrl) return null;

  const mimetype = midia.node?.mimetype || 'application/octet-stream';
  const extensao = extensaoPorMimetype(mimetype) || 'bin';
  const fileName = midia.node?.fileName || `${midia.tipo}-${messageId}.${extensao}`;
  const mediaUrl = `${appBaseUrl}/api/whatsapp-media?messageId=${encodeURIComponent(messageId)}`;
  return { mediaUrl, fileName, contentType: midia.tipo };
}
