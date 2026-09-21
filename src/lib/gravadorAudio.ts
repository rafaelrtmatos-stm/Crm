// Gravacao de audio pelo microfone (botao do microfone no chat).
// Prefere ogg/opus (formato de voz do WhatsApp; Firefox grava direto), depois webm/opus (Chrome/Edge) e mp4
// (Safari). A Evolution API converte pro formato de voz do WhatsApp no envio (`encoding`).

export interface Gravacao {
  /** Para a gravacao e devolve o arquivo. */
  parar: () => Promise<{ blob: Blob; mimeType: string; segundos: number }>;
  /** Descarta a gravacao e solta o microfone. */
  cancelar: () => void;
}

export async function iniciarGravacao(): Promise<Gravacao> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('Este navegador não permite gravar áudio.');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const preferidos = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
  const mimeType = preferidos.find(t => MediaRecorder.isTypeSupported(t)) || '';
  const gravador = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const partes: Blob[] = [];
  const inicio = Date.now();
  gravador.ondataavailable = (e) => { if (e.data && e.data.size > 0) partes.push(e.data); };
  gravador.start(250);

  const soltarMicrofone = () => stream.getTracks().forEach(t => t.stop());

  return {
    parar: () => new Promise((resolve, reject) => {
      gravador.onerror = () => { soltarMicrofone(); reject(new Error('Falha ao gravar o áudio.')); };
      gravador.onstop = () => {
        soltarMicrofone();
        const tipo = (gravador.mimeType || mimeType || 'audio/webm').split(';')[0];
        resolve({ blob: new Blob(partes, { type: tipo }), mimeType: tipo, segundos: Math.max(1, Math.round((Date.now() - inicio) / 1000)) });
      };
      if (gravador.state !== 'inactive') gravador.stop();
      else gravador.onstop?.(new Event('stop'));
    }),
    cancelar: () => {
      gravador.onstop = null;
      gravador.onerror = null;
      try { if (gravador.state !== 'inactive') gravador.stop(); } catch { /* ja parado */ }
      soltarMicrofone();
    },
  };
}

/** Extensao do arquivo a partir do mime do audio gravado. */
export function extensaoDoAudio(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  return 'webm';
}
