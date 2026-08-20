// Ponte entre o front-end (IntegracoesModule.tsx) e a Evolution API — o front nunca fala
// direto com a Evolution API (evita expor a API Key dela no navegador). Esse endpoint:
//
//  GET    /api/whatsapp-connect          -> fluxo unificado: verifica estado, cria a instancia
//                                            se precisar e devolve o QR Code (ou avisa que ja
//                                            esta conectado, sem gerar QR a toa)
//  GET    /api/whatsapp-connect?status=1 -> so consulta o status atual da conexao (usado no poll)
//  GET    /api/whatsapp-connect?webhookInfo=1 -> diagnostico: mostra o webhook configurado
//  DELETE /api/whatsapp-connect          -> desconecta o numero (logout), mantendo a instancia pra reconectar depois
//
// Fluxo do GET normal (blindado contra os erros mais comuns da Evolution API V2):
//   1. GET /instance/connectionState/{instance} -> se 'open', responde sucesso na hora (sem QR)
//   2. GET /instance/connect/{instance}          -> tenta pegar o QR Code
//   3. Se a instancia nao existir (404 / "not found"), faz POST /instance/create automaticamente
//      e tenta o QR de novo -- o front nunca precisa saber se a instancia existia ou nao
//   4. O QR volta sempre no formato "data:image/png;base64,..." (nunca so o base64 cru)
//
// Variaveis de ambiente necessarias (configurar em Vercel > Settings > Environment Variables):
//   EVOLUTION_API_URL  -> ex: https://sua-instancia.up.railway.app
//   EVOLUTION_API_KEY  -> chave de admin da sua Evolution API
//   EVOLUTION_WEBHOOK_SECRET -> mesmo segredo usado em api/whatsapp-webhook.js

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;
const INSTANCE_NAME = 'rafa-arts'; // nome fixo da instancia dentro da Evolution API
const SUPABASE_URL = 'https://areqouezrbdubfutjzki.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YbzFXDHWQy-k0F9uNtVJ2g_urcsgmVt';

// Nenhuma chamada pra Evolution API pode travar a rota pra sempre -- se ela nao responder
// dentro desse tempo, cai no catch e devolve erro 504 pro front (que ja sabe tentar de novo
// no proximo auto-refresh), em vez de deixar a requisicao pendurada.
const FETCH_TIMEOUT_MS = 15000;

async function fetchComTimeout(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

// Le o corpo da resposta com seguranca -- a Evolution API (ou um proxy na frente dela) as
// vezes devolve corpo vazio, texto puro ou HTML (ex: instancia fora do ar) em vez de JSON,
// e um JSON.parse direto quebraria a rota inteira sem essa protecao.
async function parseRespostaSegura(r) {
  const texto = await r.text().catch(() => '');
  if (!texto) return {};
  try {
    return JSON.parse(texto);
  } catch {
    return { _raw: texto };
  }
}

// Detecta se a Evolution API respondeu dizendo que a instancia nao existe. Varia de versao
// pra versao da Evolution API: normalmente 404, mas algumas builds devolvem 400/401 com uma
// mensagem no corpo -- por isso checa os dois.
function instanciaNaoExiste(status, body) {
  if (status === 404) return true;
  const msg = JSON.stringify(body || {}).toLowerCase();
  return msg.includes('does not exist') || msg.includes('not found') || msg.includes('não existe') || msg.includes('nao existe');
}

// Garante que o QR sempre volta pronto pra virar <img src="...">, com o prefixo certo --
// independente de a Evolution API devolver o base64 cru ou ja com o prefixo (varia por versao).
function normalizarQrBase64(qrRaw) {
  if (!qrRaw) return null;
  return qrRaw.startsWith('data:') ? qrRaw : `data:image/png;base64,${qrRaw}`;
}

async function consultarEstadoConexao(headers) {
  const r = await fetchComTimeout(`${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`, { headers });
  const body = await parseRespostaSegura(r);
  if (!r.ok) {
    return { state: null, notFound: instanciaNaoExiste(r.status, body), body };
  }
  const state = body?.instance?.state || body?.state || null;
  return { state, notFound: false, body };
}

async function buscarQrCodeNaEvolution(headers) {
  const r = await fetchComTimeout(`${EVOLUTION_API_URL}/instance/connect/${INSTANCE_NAME}`, { headers });
  const body = await parseRespostaSegura(r);
  return { ok: r.ok, status: r.status, body, notFound: !r.ok && instanciaNaoExiste(r.status, body) };
}

async function criarInstancia(headers, webhookConfig) {
  const r = await fetchComTimeout(`${EVOLUTION_API_URL}/instance/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      instanceName: INSTANCE_NAME,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: webhookConfig,
    }),
  });
  const body = await parseRespostaSegura(r);
  return { ok: r.ok, status: r.status, body };
}

// Roda sempre que o front pede QR, mesmo se a instancia ja existia de antes -- o
// /instance/create so configura o webhook na CRIACAO, entao sem isso uma instancia criada
// antes dessa configuracao existir (ou criada manualmente) ficaria "muda" pro CRM. Nao
// bloqueia o fluxo de conexao se falhar: o usuario ainda consegue escanear o QR normalmente.
async function configurarWebhook(headers, webhookConfig) {
  try {
    const r = await fetchComTimeout(`${EVOLUTION_API_URL}/webhook/set/${INSTANCE_NAME}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        webhook: {
          ...webhookConfig,
          enabled: true,
          // CRITICO: forca desligado. Se essa opcao estiver ligada (por padrao em algumas
          // instalacoes da Evolution API), ela passa a chamar
          // "{url}/{nome-do-evento}" (ex: /api/whatsapp-webhook/messages-upsert) em vez da
          // URL exata configurada -- e como so existe uma Vercel Function na URL base, esse
          // subcaminho cai no rewrite catch-all do vercel.json e nunca chega no handler.
          webhookByEvents: false,
          webhookBase64: false,
        },
      }),
    });
    const body = await parseRespostaSegura(r);
    if (!r.ok) {
      console.error('Evolution API recusou configurar o webhook:', body);
    }
  } catch (err) {
    console.error('Falha ao configurar webhook (nao bloqueia a conexao):', err);
  }
}

async function sincronizarStatusSupabase(estado) {
  if (!estado || estado === 'unknown') return;
  await fetch(`${SUPABASE_URL}/rest/v1/robozinho_config?on_conflict=company_id`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ company_id: 'rafa-arts', whatsapp_connection_status: estado, updated_at: new Date().toISOString() }),
  }).catch((err) => console.error('Falha ao sincronizar status no Supabase:', err));
}

export default async function handler(req, res) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    res.status(500).json({ error: 'Evolution API não configurada — falta EVOLUTION_API_URL/EVOLUTION_API_KEY nas variáveis de ambiente da Vercel.' });
    return;
  }

  const headers = { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' };
  const siteUrl = `https://${req.headers.host}`;
  // O segredo vai NA PROPRIA URL do webhook (?secret=...), nao so num header customizado --
  // isso funciona em QUALQUER versao da Evolution API, porque ela sempre respeita a URL
  // exata configurada. Um header customizado (usado como reforco em api/whatsapp-webhook.js)
  // depende de uma feature que nem toda versao/fork da Evolution API suporta.
  const webhookUrl = EVOLUTION_WEBHOOK_SECRET
    ? `${siteUrl}/api/whatsapp-webhook?secret=${encodeURIComponent(EVOLUTION_WEBHOOK_SECRET)}`
    : `${siteUrl}/api/whatsapp-webhook`;
  const webhookConfig = {
    url: webhookUrl,
    headers: { 'x-webhook-secret': EVOLUTION_WEBHOOK_SECRET || '' },
    events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
  };

  try {
    // --- Desconectar o numero (logout) — a instancia continua existindo na Evolution API,
    // so "desloga" o WhatsApp dela, entao da pra conectar outro numero depois escaneando
    // um QR Code novo, sem precisar recriar nada ---
    if (req.method === 'DELETE') {
      const r = await fetchComTimeout(`${EVOLUTION_API_URL}/instance/logout/${INSTANCE_NAME}`, { method: 'DELETE', headers });
      if (!r.ok) {
        const body = await parseRespostaSegura(r);
        console.error('Evolution API recusou o logout:', body);
        res.status(502).json({ error: 'A Evolution API recusou desconectar o número.' });
        return;
      }
      await sincronizarStatusSupabase('close');
      res.status(200).json({ ok: true });
      return;
    }

    // --- Consultar status (usado pelo poll do modal) — TAMBEM salva no Supabase, servindo
    // como sincronizacao manual: se por algum motivo o webhook de CONNECTION_UPDATE nunca
    // chegou a salvar certo, consultar o status aqui corrige sozinho ---
    if (req.query.status) {
      const { state, notFound } = await consultarEstadoConexao(headers);
      const estadoAtual = notFound ? 'close' : (state || 'unknown');
      await sincronizarStatusSupabase(estadoAtual);
      res.status(200).json({ status: estadoAtual });
      return;
    }

    // --- Diagnostico: mostra a configuracao ATUAL do webhook salva na Evolution API ---
    if (req.query.webhookInfo) {
      const r = await fetchComTimeout(`${EVOLUTION_API_URL}/webhook/find/${INSTANCE_NAME}`, { headers });
      const body = await parseRespostaSegura(r);
      res.status(200).json({ webhookConfig: body });
      return;
    }

    // === Fluxo unificado GET ===

    // 1) Verificacao de estado PRIMEIRO — se ja esta 'open', responde sucesso na hora, sem
    // perder tempo (nem gerar QR a toa) pedindo QR Code de uma instancia ja conectada.
    const estadoInicial = await consultarEstadoConexao(headers);
    if (estadoInicial.state === 'open') {
      // Auto-cura: mesmo ja conectada, reconfigura o webhook aqui tambem. Sem isso, se o
      // webhook fosse desconfigurado na Evolution API depois de uma conexao ja estabelecida
      // (reset da instancia, atualizacao de versao, etc.), esse branch retornava direto e a
      // instancia ficava "muda" pro CRM pra sempre, sem nenhum caminho de codigo que
      // tentasse consertar isso de novo.
      await configurarWebhook(headers, webhookConfig);
      await sincronizarStatusSupabase('open');
      res.status(200).json({ status: 'open', connected: true, qrCode: null, qrCodeText: null, message: 'WhatsApp já está conectado.' });
      return;
    }

    // 2) Instancia nao existe ou esta 'close' -> tenta pegar o QR Code direto
    let qrResp = await buscarQrCodeNaEvolution(headers);

    // 3) Se a instancia nao existe (404/"not found" em qualquer uma das duas chamadas
    // acima), cria ela do zero automaticamente e tenta o QR de novo — o front nunca
    // precisa saber ou se preocupar se a instancia ja existia ou nao.
    if (qrResp.notFound || estadoInicial.notFound) {
      const criacao = await criarInstancia(headers, webhookConfig);
      if (!criacao.ok) {
        console.error('Falha ao criar instancia na Evolution API:', criacao.body);
        res.status(502).json({ error: 'Não foi possível criar a instância do WhatsApp na Evolution API.' });
        return;
      }
      // /instance/create ja pode devolver o QR Code direto no corpo da resposta — usa ele se
      // vier, pra economizar uma chamada; senao, busca separadamente.
      if (criacao.body?.qrcode?.base64 || criacao.body?.base64) {
        qrResp = { ok: true, status: 201, body: criacao.body, notFound: false };
      } else {
        qrResp = await buscarQrCodeNaEvolution(headers);
      }
    }

    // 4) Garante o webhook configurado (nao bloqueia o fluxo se a Evolution API recusar)
    await configurarWebhook(headers, webhookConfig);

    if (!qrResp.ok) {
      console.error('Evolution API nao devolveu QR Code:', qrResp.body);
      res.status(502).json({ error: 'A Evolution API não devolveu um QR Code válido. Tente novamente em alguns segundos.' });
      return;
    }

    // A Evolution API costuma devolver o QR em base64 (as vezes ja com o prefixo data:image,
    // as vezes so o base64 puro, dependendo da versao) — normaliza aqui pro front so precisar
    // jogar direto num <img>. Isso fica como FALLBACK: o front prefere desenhar o QR ele
    // mesmo a partir do "qrCodeText" abaixo, pra garantir sempre fundo branco puro (#FFFFFF)
    // + modulos pretos puros (#000000), sem depender de como a Evolution API coloriu a imagem.
    const qrRaw = qrResp.body?.base64 || qrResp.body?.qrcode?.base64 || null;
    const qrCodeText = qrResp.body?.code || qrResp.body?.qrcode?.code || null;
    const qrBase64 = normalizarQrBase64(qrRaw);

    if (!qrBase64 && !qrCodeText) {
      // Nem QR nem texto vieram — pode ser que a instancia conectou bem nesse meio tempo
      // (ex: usuario escaneou um QR antigo de outra aba). Reconsulta o estado antes de
      // devolver erro, pra nao mostrar "falha" pra um usuario que ja conectou com sucesso.
      const estadoFinal = await consultarEstadoConexao(headers);
      if (estadoFinal.state === 'open') {
        await sincronizarStatusSupabase('open');
        res.status(200).json({ status: 'open', connected: true, qrCode: null, qrCodeText: null, message: 'WhatsApp já está conectado.' });
        return;
      }
      res.status(502).json({ error: 'A Evolution API não devolveu um QR Code válido. Tente novamente em alguns segundos.' });
      return;
    }

    const estadoRetorno = qrResp.body?.instance?.state || 'connecting';
    await sincronizarStatusSupabase(estadoRetorno);
    res.status(200).json({ qrCode: qrBase64, qrCodeText, status: estadoRetorno, connected: false });
  } catch (err) {
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    console.error('Erro ao conectar com a Evolution API:', err);
    res.status(isTimeout ? 504 : 500).json({
      error: isTimeout
        ? 'A Evolution API demorou demais para responder. Tente novamente.'
        : 'Não foi possível conectar com a Evolution API. Confira se ela está no ar.',
    });
  }
}
