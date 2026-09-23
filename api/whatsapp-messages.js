// FASE 3 passo 1 (chat ao vivo): busca o histórico de UMA conversa direto na Evolution API
// (chat/findMessages), formatado no MESMO formato que mapCrmMessageRow já devolve hoje em
// src/components/Modules.tsx -- pra trocar o mínimo possível de UI quando o passo 2 substituir
// a leitura de crm_messages por essa chamada.
//
// Por enquanto este endpoint SÓ é criado -- ainda não está ligado ao front (isso é o passo 2).
// crm_messages continua sendo gravado e lido normalmente até lá.
//
// POST /api/whatsapp-messages
// headers: x-user-id: <id do usuário logado>
// body: { phone: "5592999999999" }
// resposta: { ok: true, messages: [ {..no formato de mapCrmMessageRow..} ] }
import { EVOLUTION_API_URL, EVOLUTION_API_KEY, INSTANCE_NAME, SUPABASE_URL, SUPABASE_ANON_KEY, COMPANY_ID, APP_BASE_URL } from './_lib/whatsapp-config.js';
import { exigirUsuarioAutorizado } from './_lib/auth.js';
import { timestampParaIso } from './_lib/timestamp.js';
import { extrairTextoMensagem, extrairInfoMidia } from './_lib/wa-parse.js';

const supaHeaders = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };

// Telefone de conversa individual vira remoteJid @s.whatsapp.net; telefone de GRUPO (dígitos
// do group_jid) precisa do @g.us -- mesma checagem que api/whatsapp-foto-perfil.js já faz,
// consultando whatsapp_groups em vez de confiar num campo "isGroup" que o front não manda.
async function resolverRemoteJid(numero) {
  const g = await fetch(
    `${SUPABASE_URL}/rest/v1/whatsapp_groups?company_id=eq.${COMPANY_ID}&group_jid=eq.${numero}@g.us&select=id&limit=1`,
    { headers: supaHeaders }
  );
  if (g.ok) {
    const grupos = await g.json();
    if (Array.isArray(grupos) && grupos.length > 0) return { remoteJid: `${numero}@g.us`, ehGrupo: true };
  }
  return { remoteJid: `${numero}@s.whatsapp.net`, ehGrupo: false };
}

async function buscarMensagensDoChat(evoHeaders, remoteJid) {
  const r = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${INSTANCE_NAME}`, {
    method: 'POST',
    headers: evoHeaders,
    body: JSON.stringify({ where: { key: { remoteJid } }, limit: 200 }),
  });
  if (!r.ok) throw new Error(`Falha ao buscar mensagens na Evolution API (${r.status}).`);
  const data = await r.json();
  // A Evolution API costuma devolver { messages: { records: [...] } } ou uma lista direta,
  // dependendo da versao -- mesma tolerancia que api/whatsapp-import-history.js já usa.
  return data?.messages?.records || (Array.isArray(data) ? data : []);
}

// Traduz UM registro cru da Evolution/Baileys pro mesmo formato que mapCrmMessageRow devolve
// hoje (ver src/components/Modules.tsx) -- assim o front não muda a forma como renderiza a
// mensagem, só de onde ela veio.
function paraFormatoDoFront(msg, numero, ehGrupo) {
  const texto = extrairTextoMensagem(msg?.message);
  if (!texto) return null;

  const whatsappMessageId = msg?.key?.id || null;
  const direction = msg?.key?.fromMe ? 'outgoing' : 'incoming';
  const createdAt = timestampParaIso(msg?.messageTimestamp) || new Date().toISOString();
  const midia = extrairInfoMidia(msg, APP_BASE_URL);
  const senderName = direction === 'outgoing'
    ? 'Celular'
    : (ehGrupo ? (msg?.pushName || '').trim() || undefined : undefined);

  return {
    // Sem uuid de banco -- o whatsapp_message_id é o único identificador estável que a
    // Evolution devolve, então vira o "id" que o front usa (key de lista, etc).
    id: whatsappMessageId || `${numero}-${createdAt}`,
    companyId: COMPANY_ID,
    phone: numero,
    text: texto,
    direction,
    isNote: false,
    senderName,
    channel: 'WhatsApp',
    mediaUrl: midia?.mediaUrl,
    fileName: midia?.fileName,
    mediaContentType: midia?.contentType,
    // Transcrição não existe nesse formato ainda -- continua vivendo em crm_messages até a
    // Fase 4 (fila de transcrição em tabela própria). Sem isso aqui, áudio antigo re-buscado
    // por essa rota perde o texto já transcrito -- resolvido quando o passo 2 mesclar com
    // crm_messages, não neste endpoint isolado.
    createdAt,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    res.status(500).json({ error: 'Evolution API não configurada.' });
    return;
  }
  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const numero = String(req.body?.phone || '').replace(/\D/g, '');
  if (!numero) {
    res.status(400).json({ error: 'Faltou o telefone.' });
    return;
  }

  try {
    const { remoteJid, ehGrupo } = await resolverRemoteJid(numero);
    const evoHeaders = { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' };
    const registros = await buscarMensagensDoChat(evoHeaders, remoteJid);

    const mensagens = registros
      .map((msg) => paraFormatoDoFront(msg, numero, ehGrupo))
      .filter(Boolean)
      // A Evolution costuma devolver mais recente primeiro -- o chat precisa de ordem
      // cronológica (mais antiga primeiro), igual ao .order('created_at', {ascending:true})
      // que loadMessages já usa hoje.
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    res.status(200).json({ ok: true, messages: mensagens });
  } catch (err) {
    console.error('Falha ao buscar histórico ao vivo da Evolution API:', err);
    res.status(500).json({ error: 'Erro ao buscar mensagens.' });
  }
}
