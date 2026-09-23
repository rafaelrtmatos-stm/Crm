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
import { EVOLUTION_API_URL, EVOLUTION_API_KEY, INSTANCE_NAME } from './_lib/whatsapp-config.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const messageId = String(req.query?.messageId || '').trim();
  if (!messageId) {
    res.status(400).json({ error: 'Faltou messageId.' });
    return;
  }
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error('whatsapp-media: EVOLUTION_API_URL/EVOLUTION_API_KEY não configuradas.');
    res.status(500).json({ error: 'Evolution API não configurada.' });
    return;
  }

  // Mesmo payload documentado que o webhook já usava pra baixar mídia — a Evolution busca a
  // mensagem pelo ID no banco interno dela, não pelo conteúdo que a gente manda.
  const buscar = () => fetch(`${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${INSTANCE_NAME}`, {
    method: 'POST',
    headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { key: { id: messageId } }, convertToMp4: false }),
  });

  try {
    let r = await buscar();
    if (!r.ok) {
      // Mesma tolerância a race condition que o download antigo tinha: espera um pouco e tenta
      // de novo antes de desistir (só relevante logo após a mensagem chegar).
      await new Promise((resolve) => setTimeout(resolve, 1200));
      r = await buscar();
    }
    if (!r.ok) {
      console.error('whatsapp-media: falha ao buscar na Evolution API:', r.status, await r.text().catch(() => ''));
      res.status(502).json({ error: 'Falha ao buscar mídia.' });
      return;
    }

    const data = await r.json();
    const base64 = data?.base64 || data?.data;
    if (!base64) {
      res.status(404).json({ error: 'Mídia não encontrada (pode ter expirado no WhatsApp).' });
      return;
    }

    const mimetype = data?.mimetype || 'application/octet-stream';
    const bytes = Buffer.from(base64, 'base64');
    res.setHeader('Content-Type', mimetype);
    // Cache curto: evita rebuscar na Evolution a cada re-render, sem guardar pra sempre
    // (mídia pode não estar mais disponível depois de um tempo).
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.status(200).send(bytes);
  } catch (err) {
    console.error('whatsapp-media: erro inesperado:', err);
    res.status(500).json({ error: 'Erro ao buscar mídia.' });
  }
}
