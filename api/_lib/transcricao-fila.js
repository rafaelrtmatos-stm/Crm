// Fila de transcrição automática de áudios do WhatsApp.
// FASE 4 (chat ao vivo): a fila agora é a tabela PRÓPRIA wa_transcricao_fila (não mais
// crm_messages -- ver supabase/create_wa_transcricao_fila.sql) -- pré-requisito pro passo 4
// da Fase 3 (parar de gravar texto/mídia em crm_messages) não quebrar a transcrição no meio
// do caminho, já que crm_messages deixará de ser onde o status/texto da transcrição mora.
//  - api/whatsapp-webhook.js cria a linha na fila (status pending) e dispara
//    processarTranscricao() em segundo plano (waitUntil) — o webhook responde sem esperar.
//  - api/transcrever-pendentes.js reprocessa o que ficou pendente (CRM fechado, erro temporário).
// Falha na transcrição NUNCA apaga/altera a mensagem original: só muda a linha da fila.
import { SUPABASE_URL, SUPABASE_ANON_KEY, COMPANY_ID } from './whatsapp-config.js';
import { transcreverAudioDaUrl, ErroTranscricao } from './gemini-transcricao.js';

const MAX_TENTATIVAS = 3;
// "processing" há mais que isso = a função anterior morreu no meio; libera pra outra tentar.
const PROCESSING_TRAVADO_MS = 3 * 60 * 1000;
const ESPERA_RETRY_MS = 4000;

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};
const CAMPOS = 'id,media_url,content_type,transcription,transcription_status,transcription_attempts';

// Garante que a mensagem de áudio recebida tem uma linha na fila (cria se ainda não existir --
// ignore-duplicates protege contra o mesmo evento de webhook chegando mais de uma vez).
// Chamado pelo webhook assim que grava uma mensagem de áudio recebida com transcrição automática ligada.
export async function enfileirarTranscricao({ phone, whatsappMessageId, mediaUrl, contentType }) {
  if (!phone || !whatsappMessageId || !mediaUrl) return false;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/wa_transcricao_fila`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({
      company_id: COMPANY_ID,
      phone,
      whatsapp_message_id: whatsappMessageId,
      media_url: mediaUrl,
      content_type: contentType || 'audio',
      transcription_status: 'pending',
    }),
  });
  if (!r.ok) console.error('[transcricao] falha ao enfileirar:', r.status, await r.text().catch(() => ''));
  return r.ok;
}

async function buscarLinha({ id, whatsappMessageId }) {
  const filtro = id
    ? `id=eq.${encodeURIComponent(id)}`
    : `company_id=eq.${COMPANY_ID}&whatsapp_message_id=eq.${encodeURIComponent(whatsappMessageId)}`;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/wa_transcricao_fila?${filtro}&select=${CAMPOS}&limit=1`, { headers });
  if (!r.ok) return null;
  const linhas = await r.json();
  return Array.isArray(linhas) ? linhas[0] || null : null;
}

async function atualizar(id, corpo) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/wa_transcricao_fila?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(corpo),
  });
  if (!r.ok) console.error('[transcricao] falha ao atualizar wa_transcricao_fila:', r.status, await r.text().catch(() => ''));
  return r.ok;
}

// Reserva a mensagem (pending -> processing) de forma atômica: o filtro inclui o número de
// tentativas lido antes, então dois processos ao mesmo tempo não transcrevem o mesmo áudio.
async function reivindicar(linha) {
  const tentativas = linha.transcription_attempts || 0;
  const limite = encodeURIComponent(new Date(Date.now() - PROCESSING_TRAVADO_MS).toISOString());
  const filtro = `id=eq.${encodeURIComponent(linha.id)}&transcription_attempts=eq.${tentativas}`
    + `&or=(transcription_status.eq.pending,and(transcription_status.eq.processing,transcription_started_at.lt.${limite}))`;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/wa_transcricao_fila?${filtro}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      transcription_status: 'processing',
      transcription_attempts: tentativas + 1,
      transcription_started_at: new Date().toISOString(),
    }),
  });
  if (!r.ok) return false;
  const linhas = await r.json().catch(() => []);
  return Array.isArray(linhas) && linhas.length > 0;
}

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Transcreve UMA mensagem (por id da fila ou por whatsapp_message_id). Nunca lança erro pra fora.
export async function processarTranscricao(ref) {
  try {
    const linha = await buscarLinha(ref);
    if (!linha) return 'inexistente';
    if (linha.transcription_status === 'completed' || linha.transcription?.text) return 'ja-concluida';
    if (linha.content_type !== 'audio' || !linha.media_url) return 'ignorada';
    if ((linha.transcription_attempts || 0) >= MAX_TENTATIVAS) return 'sem-tentativas';
    if (!(await reivindicar(linha))) return 'ocupada';

    const tentativas = (linha.transcription_attempts || 0) + 1;
    try {
      let texto;
      for (let t = 0; ; t++) {
        try {
          texto = await transcreverAudioDaUrl(linha.media_url);
          break;
        } catch (err) {
          // Erro temporário (cota/instabilidade): mais uma tentativa curta antes de desistir por agora.
          if (err instanceof ErroTranscricao && err.temporario && t < 1) { await dormir(ESPERA_RETRY_MS); continue; }
          throw err;
        }
      }
      await atualizar(linha.id, {
        transcription: { text: texto, isAutomatic: true, isVisible: true },
        transcription_status: 'completed',
        transcription_error: null,
        transcription_created_at: new Date().toISOString(),
      });
      return 'concluida';
    } catch (err) {
      const temporario = err instanceof ErroTranscricao && err.temporario;
      const resumo = (err instanceof ErroTranscricao ? err.message : 'Falha inesperada ao transcrever o áudio.').slice(0, 300);
      console.error('[transcricao] falhou:', resumo);
      // Temporário e ainda com tentativas: volta pra "pending" (reprocessado quando o CRM abrir a conversa).
      await atualizar(linha.id, {
        transcription_status: temporario && tentativas < MAX_TENTATIVAS ? 'pending' : 'failed',
        transcription_error: resumo,
      });
      return 'falhou';
    }
  } catch (err) {
    console.error('[transcricao] erro inesperado (mensagem preservada):', err);
    return 'erro';
  }
}

// Reprocessa pendentes de uma conversa (chamado ao abrir o chat, ver api/transcrever-pendentes.js).
export async function processarPendentesDoTelefone(phone, limite = 3) {
  const limiteTravado = encodeURIComponent(new Date(Date.now() - PROCESSING_TRAVADO_MS).toISOString());
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/wa_transcricao_fila?company_id=eq.${COMPANY_ID}&phone=eq.${encodeURIComponent(phone)}`
    + `&transcription_attempts=lt.${MAX_TENTATIVAS}`
    + `&or=(transcription_status.eq.pending,and(transcription_status.eq.processing,transcription_started_at.lt.${limiteTravado}))`
    + `&select=id&order=created_at.desc&limit=${limite}`,
    { headers },
  );
  if (!r.ok) return [];
  const linhas = await r.json().catch(() => []);
  if (!Array.isArray(linhas)) return [];
  return Promise.all(linhas.map((l) => processarTranscricao({ id: l.id })));
}
