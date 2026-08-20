// Importa o HISTÓRICO de mensagens (as que já existiam antes de conectar o webhook)
// direto da Evolution API pra dentro de crm_messages — pra aparecer no chat igual
// aparece dentro do próprio Evolution Manager.
//
// Rodar o script supabase/add_historico_mensagens_whatsapp.sql ANTES de usar esse endpoint
// (cria as colunas wa_message_id/is_historical_import e a tabela whatsapp_import_progress).
//
// Por que não importa tudo de uma vez só: com dezenas de milhares de mensagens, uma
// função serverless da Vercel estoura o tempo máximo de execução bem antes de terminar.
// Por isso o import é dividido em 3 ações, chamadas em sequência pelo front:
//
//   GET /api/whatsapp-import-messages?action=start
//     -> Busca a lista de conversas na Evolution API, cadastra todas numa fila
//        (whatsapp_import_progress) e já importa a 1a página (mensagens mais recentes)
//        das conversas mais recentes na hora — pra aparecer rápido, sem esperar o resto.
//
//   GET /api/whatsapp-import-messages?action=continue
//     -> Processa mais um pedaço da fila (mensagens mais antigas), respeitando um
//        orçamento de tempo pra não estourar o limite da função. Chamar repetidas vezes
//        (o front faz isso sozinho, em loop, enquanto a aba de Integrações estiver aberta)
//        até a resposta vir com done:true. Também dá pra configurar um Cron Job na Vercel
//        pra chamar essa ação sozinha em segundo plano (ver vercel.json) — assim o import
//        continua mesmo com ninguém com o CRM aberto no navegador.
//
//   GET /api/whatsapp-import-messages?action=status
//     -> Só devolve o progresso atual (quantas conversas faltam, quantas mensagens já
//        entraram), pra mostrar a barrinha de progresso sem gastar orçamento de import.
//
// Mensagens importadas por aqui SEMPRE entram com is_historical_import=true — o front
// (src/App.tsx) ignora essa flag na automação de criar/mover lead pra ENTRADA, senão
// 45 mil mensagens antigas resetariam a etapa de todos os leads do funil.

const SUPABASE_URL = 'https://areqouezrbdubfutjzki.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YbzFXDHWQy-k0F9uNtVJ2g_urcsgmVt';
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = 'rafa-arts';
const COMPANY_ID = 'rafa-arts';

// Quantas conversas mais recentes já ficam prontas na hora do "start" (síncrono, o
// usuário vê o resultado na mesma resposta). O resto entra na fila pro "continue".
const CHATS_PRONTOS_NO_START = 8;
// Quantas mensagens buscar por página na Evolution API.
const MENSAGENS_POR_PAGINA = 50;
// Orçamento de tempo por chamada de "continue" (a função da Vercel tem um limite máximo
// de execução — isso aqui fica bem abaixo pra sempre sobrar tempo de responder a tempo).
const ORCAMENTO_MS = 8000;

function evoHeaders() {
  return { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' };
}
function supaHeaders(extra) {
  return { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', ...extra };
}

async function supaFetch(path, options = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: supaHeaders(options.headers) });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`Supabase ${path} -> ${r.status}: ${body}`);
  }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

// Busca a lista de conversas na Evolution API. O formato de resposta varia bastante
// entre versões da Evolution API — tenta os formatos mais comuns antes de desistir.
async function buscarChats() {
  const r = await fetch(`${EVOLUTION_API_URL}/chat/findChats/${INSTANCE_NAME}`, { method: 'POST', headers: evoHeaders(), body: JSON.stringify({}) });
  if (!r.ok) throw new Error(`Evolution findChats -> ${r.status}: ${await r.text().catch(() => '')}`);
  const data = await r.json();
  const lista = Array.isArray(data) ? data : (data?.chats || data?.records || data?.data || []);
  return lista
    .map((c) => ({
      remoteJid: c.remoteJid || c.id || c.jid || '',
      contactName: c.pushName || c.name || c.contact?.pushName || null,
      // usado só pra ordenar quais conversas ficam prontas na hora — se a Evolution não
      // mandar nenhum campo de data reconhecido, todas ficam com prioridade igual (0)
      recencia: c.updatedAt || c.lastMessageTimestamp || c?.lastMessage?.messageTimestamp || 0,
    }))
    .filter((c) => c.remoteJid && !c.remoteJid.endsWith('@g.us')); // grupos ficam de fora do import de histórico (mesma regra do webhook: só entra grupo liberado pelo admin)
}

// Busca UMA página de mensagens de uma conversa. `pagina` é 1-indexado (padrão Evolution API).
async function buscarPaginaMensagens(remoteJid, pagina) {
  const r = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${INSTANCE_NAME}`, {
    method: 'POST',
    headers: evoHeaders(),
    body: JSON.stringify({ where: { key: { remoteJid } }, page: pagina, offset: MENSAGENS_POR_PAGINA, limit: MENSAGENS_POR_PAGINA }),
  });
  if (!r.ok) throw new Error(`Evolution findMessages -> ${r.status}: ${await r.text().catch(() => '')}`);
  const data = await r.json();
  // Formatos conhecidos: array direto, {messages:{records:[...]}} (paginação estilo Prisma),
  // {messages:[...]}, {data:[...]}
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.messages?.records)) return data.messages.records;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function extrairTexto(msg) {
  return (
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    ''
  );
}

// Converte um lote de mensagens da Evolution API em linhas de crm_messages e insere,
// ignorando qualquer uma que já exista (mesmo wa_message_id) — assim dá pra rodar o
// import de novo por cima de um período já importado sem duplicar nada.
async function importarLote(mensagens, phone) {
  const linhas = mensagens
    .map((msg) => {
      const texto = extrairTexto(msg);
      const waId = msg?.key?.id;
      const timestampBruto = msg?.messageTimestamp;
      if (!texto || !waId) return null; // sem texto (mídia sem legenda, reação, etc) ou sem id -> pula por enquanto
      const timestampMs = timestampBruto ? Number(timestampBruto) * 1000 : Date.now();
      return {
        company_id: COMPANY_ID,
        phone,
        text: texto,
        direction: msg?.key?.fromMe ? 'outgoing' : 'incoming',
        sender_name: msg?.pushName || null,
        channel: 'WhatsApp',
        wa_message_id: waId,
        is_historical_import: true,
        created_at: new Date(timestampMs).toISOString(),
      };
    })
    .filter(Boolean);

  if (linhas.length === 0) return 0;

  await supaFetch('crm_messages?on_conflict=company_id,wa_message_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, // ignora conflito com idx_crm_messages_wa_message_id
    body: JSON.stringify(linhas),
  });
  return linhas.length;
}

// Processa 1 conversa inteira (todas as páginas) OU até o orçamento de tempo acabar.
// Devolve true se terminou essa conversa (não tem mais página), false se ainda falta.
async function processarConversa(item, prazoFinal) {
  let pagina = item.cursor_page + 1; // cursor_page guarda "quantas páginas já processei"
  let totalImportado = item.messages_imported;

  while (Date.now() < prazoFinal) {
    const mensagens = await buscarPaginaMensagens(item.remote_jid, pagina);
    if (mensagens.length === 0) {
      await supaFetch(`whatsapp_import_progress?id=eq.${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'done', cursor_page: pagina, messages_imported: totalImportado, updated_at: new Date().toISOString() }),
      });
      return true;
    }

    const importadas = await importarLote(mensagens, item.phone);
    totalImportado += importadas;
    pagina += 1;

    // Página veio menor que o tamanho pedido -> era a última
    if (mensagens.length < MENSAGENS_POR_PAGINA) {
      await supaFetch(`whatsapp_import_progress?id=eq.${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'done', cursor_page: pagina, messages_imported: totalImportado, updated_at: new Date().toISOString() }),
      });
      return true;
    }

    // Salva o progresso a cada página (se a função for interrompida, não perde o que já fez)
    await supaFetch(`whatsapp_import_progress?id=eq.${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'importing', cursor_page: pagina, messages_imported: totalImportado, updated_at: new Date().toISOString() }),
    });
  }
  return false; // acabou o orçamento de tempo antes de terminar essa conversa
}

async function acaoStart() {
  const chats = await buscarChats();
  if (chats.length === 0) return { ok: true, totalConversas: 0, mensagem: 'Nenhuma conversa encontrada na Evolution API.' };

  // Cadastra todas na fila (se já existir da rodada anterior, mantém o progresso — não reseta)
  const linhasFila = chats.map((c) => ({
    company_id: COMPANY_ID,
    remote_jid: c.remoteJid,
    phone: c.remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, ''),
    contact_name: c.contactName,
    status: 'pending',
  }));
  await supaFetch('whatsapp_import_progress?on_conflict=company_id,remote_jid', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, // não sobrescreve conversa já em andamento/concluída
    body: JSON.stringify(linhasFila),
  });

  // Processa as N mais recentes agora mesmo, pra já aparecer mensagem no chat sem esperar o resto
  const maisRecentes = [...chats].sort((a, b) => (b.recencia || 0) - (a.recencia || 0)).slice(0, CHATS_PRONTOS_NO_START);
  const prazoFinal = Date.now() + ORCAMENTO_MS;
  let importadasAgora = 0;
  for (const chat of maisRecentes) {
    if (Date.now() >= prazoFinal) break;
    const phone = chat.remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    const [item] = await supaFetch(`whatsapp_import_progress?company_id=eq.${COMPANY_ID}&remote_jid=eq.${encodeURIComponent(chat.remoteJid)}&select=*`);
    if (!item || item.status === 'done') continue;
    // Só a página mais recente aqui (page 1) — o resto dessa conversa fica pro "continue" também,
    // junto com as outras que nem começaram
    const mensagens = await buscarPaginaMensagens(chat.remoteJid, 1);
    const importadas = await importarLote(mensagens, phone);
    importadasAgora += importadas;
    const terminouAquiMesmo = mensagens.length < MENSAGENS_POR_PAGINA;
    await supaFetch(`whatsapp_import_progress?id=eq.${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: terminouAquiMesmo ? 'done' : 'importing',
        cursor_page: 1,
        messages_imported: importadas,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  return { ok: true, totalConversas: chats.length, conversasAdiantadas: maisRecentes.length, mensagensImportadasAgora: importadasAgora };
}

async function acaoContinue() {
  const prazoFinal = Date.now() + ORCAMENTO_MS;
  let totalProcessadoNessaChamada = 0;

  while (Date.now() < prazoFinal) {
    // Prioriza quem já estava sendo importado (continua de onde parou) antes de começar uma nova.
    // status.asc dentro do filtro (importing,pending) dá "importing" antes de "pending" (ordem alfabética).
    const pendentes = await supaFetch(
      `whatsapp_import_progress?company_id=eq.${COMPANY_ID}&status=in.(importing,pending)&order=status.asc,updated_at.asc&limit=1`
    );
    if (!pendentes || pendentes.length === 0) break; // fila vazia, import completo

    const item = pendentes[0];
    await processarConversa(item, prazoFinal);
    totalProcessadoNessaChamada += 1;
  }

  const status = await acaoStatus();
  return { ...status, processadoNessaChamada: totalProcessadoNessaChamada };
}

async function acaoStatus() {
  const [resumo] = await supaFetch(
    `whatsapp_import_progress?company_id=eq.${COMPANY_ID}&select=status,messages_imported`
  ).then((rows) => {
    const contagem = { pending: 0, importing: 0, done: 0, error: 0, totalMensagens: 0 };
    for (const r of rows || []) {
      contagem[r.status] = (contagem[r.status] || 0) + 1;
      contagem.totalMensagens += r.messages_imported || 0;
    }
    return [contagem];
  });

  const totalConversas = (resumo.pending || 0) + (resumo.importing || 0) + (resumo.done || 0) + (resumo.error || 0);
  return {
    ok: true,
    totalConversas,
    conversasConcluidas: resumo.done || 0,
    conversasEmAndamento: resumo.importing || 0,
    conversasPendentes: resumo.pending || 0,
    conversasComErro: resumo.error || 0,
    mensagensImportadas: resumo.totalMensagens || 0,
    concluido: totalConversas > 0 && resumo.pending === 0 && resumo.importing === 0,
  };
}

export default async function handler(req, res) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    res.status(500).json({ error: 'Evolution API não configurada — falta EVOLUTION_API_URL/EVOLUTION_API_KEY nas variáveis de ambiente da Vercel.' });
    return;
  }

  const action = req.query.action || 'status';
  try {
    if (action === 'start') return res.status(200).json(await acaoStart());
    if (action === 'continue') return res.status(200).json(await acaoContinue());
    if (action === 'status') return res.status(200).json(await acaoStatus());
    res.status(400).json({ error: `Ação desconhecida: ${action}. Use start, continue ou status.` });
  } catch (err) {
    console.error('Erro na importação de histórico do WhatsApp:', err);
    res.status(500).json({ error: err?.message || 'Erro interno ao importar histórico.' });
  }
}

// Aumenta o tempo máximo de execução dessa função (padrão da Vercel costuma ser 10s no
// plano Hobby). Em planos com suporte a mais tempo, isso deixa cada chamada de "continue"
// processar mais mensagens por vez. Se o projeto estiver no Hobby, a Vercel ignora esse
// valor acima do teto do plano — sem problema, o import só fica um pouco mais lento
// (mais chamadas de "continue" em vez de menos).
export const config = { maxDuration: 60 };
