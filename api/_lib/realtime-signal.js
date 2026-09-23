// FASE 3 passo 3 (chat ao vivo): sinal leve de "chegou mensagem nova nesse telefone",
// via Supabase Realtime Broadcast -- SEM gravar nem mandar conteudo (nem texto nem
// media), so avisa quem esta com aquela conversa aberta pra rebuscar na Evolution API
// (api/whatsapp-messages.js).
//
// Por enquanto isso e ADITIVO: o front continua tambem escutando postgres_changes em
// crm_messages (INSERT ainda acontece hoje), entao nada quebra se o broadcast falhar ou
// atrasar. Quando uma fase futura parar de gravar conteudo em crm_messages pro webhook,
// esse sinal vira a UNICA forma de avisar o chat aberto.
//
// Falha aqui NUNCA derruba quem chamou (webhook / envio de mensagem) -- o pior caso e o
// chat aberto so atualizar quando o atendente trocar de conversa e voltar.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './whatsapp-config.js';

let clientPromise = null;
function getClient() {
  if (!clientPromise) {
    clientPromise = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return clientPromise;
}

// `identificador` = o mesmo valor que o front usa como conversation.phone (numero
// normalizado pra conversa individual, digitos do group_jid pra grupo) -- e o que
// forma o nome do canal dos dois lados.
export async function sinalizarMensagemNova(identificador) {
  if (!identificador) return;
  const supa = getClient();
  const channel = supa.channel(`chat-signal-${identificador}`);
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timeout ao inscrever no canal de broadcast')), 3000);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') { clearTimeout(timeout); resolve(); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timeout);
          reject(new Error(`falha ao inscrever no canal de broadcast (status=${status})`));
        }
      });
    });
    await channel.send({ type: 'broadcast', event: 'new-message', payload: {} });
  } catch (err) {
    console.error('[CRM] falha ao emitir sinal de mensagem nova (nao critico, nao interrompe o fluxo):', err?.message || err);
  } finally {
    try { await supa.removeChannel(channel); } catch { /* nao critico */ }
  }
}
