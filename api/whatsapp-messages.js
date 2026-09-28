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
import { extrairTextoMensagem, extrairInfoMidia, extrairContextoCitacao } from './_lib/wa-parse.js';
import { statusMaisAvancado, normalizarStatusEntrega } from './_lib/wa-status.js';

const supaHeaders = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };

// Telefone de conversa individual vira remoteJid @s.whatsapp.net; telefone de GRUPO (dígitos
// do group_jid) precisa do @g.us -- mesma checagem que api/whatsapp-foto-perfil.js já faz,
// consultando whatsapp_groups em vez de confiar num campo "isGroup" que o front não manda.
export async function resolverRemoteJid(numero) {
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

// O webhook normaliza o telefone (adiciona 55 e o nono digito) antes de gravar o lead, mas a
// Evolution guarda a mensagem sob o JID que o WhatsApp entregou: contatos antigos do Brasil
// continuam com o JID SEM o nono digito (55 + DDD + 8 digitos), e contatos em formato @lid
// (sem numero real no evento) ficam sob <lid>@lid. Com o JID calculado so a partir do telefone
// normalizado, a busca volta vazia e o chat abre sem nenhuma mensagem, mesmo com a notificacao
// (que vem do webhook) ja tendo chegado.
export function jidsAlternativos(numero, ehGrupo) {
  if (ehGrupo) return [];
  const lista = [];
  if (/^55\d{2}9\d{8}$/.test(numero)) {
    lista.push(`${numero.slice(0, 4)}${numero.slice(5)}@s.whatsapp.net`);
  }
  lista.push(`${numero}@lid`);
  return lista;
}

export async function buscarMensagensDoChat(evoHeaders, remoteJid, limit = 50, page = 1) {
  const r = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${INSTANCE_NAME}`, {
    method: 'POST',
    headers: evoHeaders,
    body: JSON.stringify({
      where: { key: { remoteJid } },
      limit: Number(limit) || 50,
      page: Number(page) || 1,
    }),
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

  const citacao = extrairContextoCitacao(msg?.message);

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
    quotedMessageId: citacao?.quotedMessageId || undefined,
    quotedText: citacao?.quotedText || undefined,
    quotedSender: citacao?.quotedSender || undefined,
    quotedMediaType: citacao?.quotedMediaType || undefined,
    // Transcrição não existe nesse formato ainda -- continua vivendo em crm_messages até a
    // Fase 4 (fila de transcrição em tabela própria). Sem isso aqui, áudio antigo re-buscado
    // por essa rota perde o texto já transcrito -- resolvido quando o passo 2 mesclar com
    // crm_messages, não neste endpoint isolado.
    // Tiques (so mensagem enviada por nos): a Evolution guarda o status na propria mensagem e/ou na lista MessageUpdate.
    deliveryStatus: direction === 'outgoing'
      ? (statusMaisAvancado([msg?.status, msg?.update?.status, ...(Array.isArray(msg?.MessageUpdate) ? msg.MessageUpdate.map((u) => u?.status) : [])]) || undefined)
      : undefined,
    deliveredAt: direction === 'outgoing' && Array.isArray(msg?.MessageUpdate)
      ? (timestampParaIso(msg.MessageUpdate.find((u) => normalizarStatusEntrega(u?.status) === 'delivered')?.dateTime || msg.MessageUpdate.find((u) => normalizarStatusEntrega(u?.status) === 'delivered')?.timestamp) || undefined)
      : undefined,
    readAt: direction === 'outgoing' && Array.isArray(msg?.MessageUpdate)
      ? (timestampParaIso(msg.MessageUpdate.find((u) => normalizarStatusEntrega(u?.status) === 'read')?.dateTime || msg.MessageUpdate.find((u) => normalizarStatusEntrega(u?.status) === 'read')?.timestamp) || undefined)
      : undefined,
    createdAt,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    res.status(200).json({ ok: false, notConfigured: true, messages: [], error: 'Evolution API não configurada.' });
    return;
  }
  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const numero = String(req.body?.phone || '').replace(/\D/g, '');
  if (!numero) {
    res.status(400).json({ error: 'Faltou o telefone.' });
    return;
  }

  const limit = Math.min(100, Math.max(1, Number(req.body?.limit) || 50));
  const page = Math.max(1, Number(req.body?.page) || 1);
  const syncToDb = req.body?.syncToDb !== false;

  try {
    const { remoteJid, ehGrupo } = await resolverRemoteJid(numero);
    const evoHeaders = { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' };
    // A conversa pode estar guardada na Evolution sob outro JID que nao o calculado a partir do
    // telefone normalizado do CRM (ver jidsAlternativos). Tenta o principal e so cai nos
    // alternativos quando ele volta vazio -- caso normal continua sendo UMA chamada so.
    let registros = await buscarMensagensDoChat(evoHeaders, remoteJid, limit, page);
    if (registros.length === 0) {
      for (const jidAlt of jidsAlternativos(numero, ehGrupo)) {
        registros = await buscarMensagensDoChat(evoHeaders, jidAlt, limit, page).catch(() => []);
        if (registros.length > 0) break;
      }
    }

    const mensagens = registros
      .map((msg) => paraFormatoDoFront(msg, numero, ehGrupo))
      .filter(Boolean)
      // A Evolution costuma devolver mais recente primeiro -- o chat precisa de ordem
      // cronológica (mais antiga primeiro), igual ao .order('created_at', {ascending:true})
      // que loadMessages já usa hoje.
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Se solicitado ou por padrão, restaura no banco de dados para nunca mais perder o histórico
    if (syncToDb && mensagens.length > 0) {
      try {
        const rows = mensagens.map((m) => ({
          company_id: COMPANY_ID,
          phone: numero,
          text: m.text,
          direction: m.direction,
          sender_name: m.senderName || null,
          channel: 'WhatsApp',
          whatsapp_message_id: m.id || null,
          created_at: m.createdAt,
          media_url: m.mediaUrl || null,
          file_name: m.fileName || null,
          media_content_type: m.mediaContentType || null,
          is_note: false,
          delivery_status: m.deliveryStatus || null,
        }));

        await fetch(`${SUPABASE_URL}/rest/v1/crm_messages`, {
          method: 'POST',
          headers: {
            ...supaHeaders,
            'Content-Type': 'application/json',
            Prefer: 'resolution=ignore-duplicates,return=minimal',
          },
          body: JSON.stringify(rows),
        });
      } catch (errSync) {
        console.warn('[CRM] Aviso ao sincronizar mensagens no crm_messages:', errSync);
      }
    }

    res.status(200).json({ ok: true, messages: mensagens, totalReturned: mensagens.length });
  } catch (err) {
    console.error('Falha ao buscar histórico ao vivo da Evolution API:', err);
    res.status(500).json({ error: 'Erro ao buscar mensagens.' });
  }
}
