// Fase 2 (redução de egress do Supabase): serve mídia de mensagens do WhatsApp buscando
// AO VIVO na Evolution API, em vez de ter sido baixada e guardada antes no Supabase Storage
// (bucket "whatsapp-media"). Isso evita duplicar o arquivo (WhatsApp já guarda a mídia por um
// tempo) e some com o maior item de egress do projeto.
//
// GET /api/whatsapp-media?messageId=<whatsapp_message_id>
// resposta: os bytes da mídia, com o Content-Type correto (a mesma coisa que um <img src>,
// <video src>, <audio src> ou link de download esperam — por isso não tem autenticação por
// header aqui, igual a URL pública do Storage que essa rota substitui).
//
// Usado tanto pelo navegador (ChatPanel em src/components/Modules.tsx, via crm_messages.media_url
// que agora aponta pra cá) quanto pelo servidor (api/_lib/transcricao-fila.js, que busca o áudio
// pra transcrever).
// Suporta Range (206) e HEAD: <audio>/<video> pedem a midia por partes e o Safari so toca assim.
import { buscarMidiaEvolution, ErroMidia } from './_lib/evolution-media.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const messageId = String(req.query?.messageId || '').trim();
  if (!messageId) {
    res.status(400).json({ error: 'Faltou messageId.' });
    return;
  }

  try {
    const { bytes, mimetype } = await buscarMidiaEvolution(messageId);
    const total = bytes.length;
    res.setHeader('Content-Type', mimetype);
    // Cache curto: evita rebuscar na Evolution a cada re-render, sem guardar pra sempre
    // (mídia pode não estar mais disponível depois de um tempo).
    res.setHeader('Cache-Control', 'private, max-age=3600');
    // <audio>/<video> pedem a mídia por partes (Range). O Safari nem toca sem suporte a isso.
    res.setHeader('Accept-Ranges', 'bytes');

    const pedido = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers?.range || '').trim());
    if (pedido && (pedido[1] !== '' || pedido[2] !== '')) {
      let inicio;
      let fim;
      if (pedido[1] === '') { // "bytes=-N": últimos N bytes
        inicio = Math.max(0, total - Number(pedido[2]));
        fim = total - 1;
      } else {
        inicio = Number(pedido[1]);
        fim = pedido[2] === '' ? total - 1 : Math.min(Number(pedido[2]), total - 1);
      }
      if (inicio >= total || inicio > fim) {
        res.setHeader('Content-Range', `bytes */${total}`);
        res.status(416).end();
        return;
      }
      res.setHeader('Content-Range', `bytes ${inicio}-${fim}/${total}`);
      res.setHeader('Content-Length', String(fim - inicio + 1));
      res.status(206).send(req.method === 'HEAD' ? undefined : bytes.subarray(inicio, fim + 1));
      return;
    }

    res.setHeader('Content-Length', String(total));
    res.status(200).send(req.method === 'HEAD' ? undefined : bytes);
  } catch (err) {
    if (err instanceof ErroMidia) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error('whatsapp-media: erro inesperado:', err);
    res.status(500).json({ error: 'Erro ao buscar mídia.' });
  }
}
